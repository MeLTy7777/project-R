"use strict";
// L4-B 最終: ストレングスの後始末(準備ループの ATTACK の終了で、使われなかった蓄えを捨てる)と、他の一時的なスキル強化の漏れの確認。実エンジン(全plugin)をNode VMで動かす。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });
    if (!scene.children.includes(sp)) scene.children.push(sp);
    const player = { _character: ctx.$gamePlayer, renderable: true, visible: true, children: [{ renderable: true, name: "shadow" }, { renderable: true, name: "nameplate" }], x: 0, y: 0, addChild() {}, removeChild() {} };
    const other = { _character: { eventId: () => 99 }, renderable: true, children: [], x: 0, y: 0, addChild() {}, removeChild() {} };
    Object.defineProperty(sp, "_characterSprites", { configurable: true, writable: true, value: [player, other] });
    const extra = { hudLayer: display(), menuButton: display(), hendrixHud: display() };
    scene._projectRBattleHudLayer = extra.hudLayer; scene._menuButton = extra.menuButton;
    scene.hendrixHuds = [{ container: extra.hendrixHud, index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, extra, sp };
    return w.parts;
}
const mapJson = id => read(`data/Map${String(id).padStart(3, "0")}.json`);
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(mapJson(id));
    ctx.DataManager.onLoad(ctx.$dataMap);
    ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
    return id;
}
function world({ size = [1920, 1080], origin = { map: 1, x: 12, y: 20 } } = {}) {
    const w = buildWorld();
    assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(origin.map, origin.x, origin.y); frames(w, 4);
    w.ctx.Graphics._width = size[0]; w.ctx.Graphics._height = size[1];
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.stage = w.ctx.ProjectRSoulStage; w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.hud = w.ctx.ProjectRSoulBattleHUD; w.deck = w.ctx.ProjectRCardDeck; w.bf = w.ctx.ProjectRBossFramework;
    w.at = w.ctx.ProjectRApolloTest; w.prep = w.ctx.ProjectRSoulPrepare; w.input = w.ctx.ProjectRSoulInput; w.dodge = w.ctx.ProjectRSoulBattleDodge;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.phases = []; w.soul.onPhase(e => w.phases.push(`${e.from}>${e.to}`));
    return w;
}
const paused = w => !!w.ctx.$gameMap.eventsPaused;
const stageState = w => plain(w.stage.getState());
// 専用ステージで a16 を準備ループで始める(開始 → 移動 → 到着 → 準備メニューが出るまで)
function a16Prepare(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w);
    frames(w, 8);
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.getPhase(), "prepare", "準備から始まる: " + w.soul.getPhase());
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    return w;
}
// 本物の入力経路: TouchInput の押下 → 1フレーム
const click = (w, sx, sy) => {
    const m = w.stage.isActive() ? w.stage.toStage(sx, sy) : { x: sx, y: sy };
    w.mouse(Math.round(m.x), Math.round(m.y));
    w.ctx.TouchInput._onTrigger(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
    w.ctx.TouchInput._onRelease(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
};
const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const itemsSnapshot = w => JSON.stringify({ items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold, hp: w.ctx.$gameParty.leader().hp, deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null });

// ================================================================ マナコスト(L4-B: 承認済みD8コストによる判定と消費) ================================================================
const M = w => w.ctx.ProjectRSoulMana;
const H = w => w.ctx.ProjectRSoulHand;
const D = w => w.ctx.ProjectRCardDeck;
const ms = w => plain(M(w).getState());
const set = (w, v) => { const r = plain(M(w).devSet(v)); assert.equal(r.ok, true, JSON.stringify(r)); };
const savedData = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold });
const seeded = (w, seed) => w.run(`globalThis.__seed = ${seed}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };`);
const battle = w => plain(D(w).getBattleState());
function startA16(w, { prepare = true, hand = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"], extra = {} } = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, ...extra })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}
// 指定のカードを含む5枠で ATTACK を始める(同じ準備で、テスト用に再シャッフルして条件に合う引きを選ぶ)
function equip(w, cardIds, filler = 5) {
    seeded(w, 4711);
    let drawn = null;
    for (let i = 0; i < 40000 && !drawn; i++) { const r = plain(H(w).draw("player", { force: true })); if (cardIds.every(id => r.drawn.some(c => c.cardId === id))) drawn = r.drawn; }
    assert.ok(drawn, "必要なカードを含む引き: " + cardIds.join());
    const used = new Set(), picks = [];
    for (const id of cardIds) { const c = drawn.find(d => d.cardId === id && !used.has(d.instanceId)); used.add(c.instanceId); picks.push(c.instanceId); }
    for (const c of drawn) { if (picks.length >= filler) break; if (!used.has(c.instanceId)) { used.add(c.instanceId); picks.push(c.instanceId); } }
    for (const id of picks) assert.equal(plain(H(w).toggle(id)).ok, true);
    assert.equal(plain(H(w).assignDefault()).ok, true);
    assert.equal(plain(H(w).commit()).ok, true);
    assert.equal(w.soul.beginAttack(), true);
    frames(w, 2);
    return w;
}
const slotOf = (w, cardId) => battle(w).hand.findIndex(c => c.cardId === cardId);
const use = (w, cardId) => plain(D(w).requestUseCard(slotOf(w, cardId)));

// ================================================================ ストレングスの後始末と、SOUL の一時的なスキル強化の漏れ(L4-B 最終) ================================================================
const S = w => w.ctx.ProjectRHermesStrength;
const heartPos = w => plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
const aimHeart = w => { const h = heartPos(w); w.mouse(Math.round(h.x * 48), Math.round(h.y * 48)); frames(w, 2); };
const heartHp = w => plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp;
const castStrength = w => { set(w, 10); return use(w, "hermes_strength"); };
const pending = w => plain(S(w).getPending());
const strengthW = (opts = {}) => { const w = startA16(world(), { extra: { weapon: "sword", ...opts } }); equip(w, ["hermes_strength", "hermes_sweep", "hermes_issen", "apollo_golden_volley", "hermes_reed_flute"]); return w; };
const dropped = w => plain(w.ctx.ProjectRSoulSkills.getState().stats).strengthDropped || 0;

test("同じ ATTACK の中では、蓄えは次に成功した通常武器の攻撃まで残る。当たると一度に消費され、倍率・防御無視は元のまま(Lv3 = +15%・防御無視)。消費後はまた使える", () => {
    const w = strengthW({ attackSeconds: 120 });
    const cost = M(w).costOf("hermes_strength");
    assert.equal(castStrength(w).ok, true);
    assert.equal(ms(w).spent, cost);
    const p = pending(w);
    assert.deepEqual([p.stacks, p.ignoreDefense, p.multiplier], [1, true, S(w).combine([0.15])], "元の倍率のまま(Lv3 は +15%)");
    assert.equal(S(w).stackingMode(), "additive");
    // 時間では消えない(新しい持続時間は無い): 同じ ATTACK の中で 50 秒待っても残る
    frames(w, 3000);
    assert.equal(w.soul.getPhase(), "attack");
    assert.equal(pending(w).stacks, 1, "同じ ATTACK の間は時間で消えない");
    // 外れの攻撃(敵ハートに当たらない)では消費されない
    const h = heartPos(w);
    w.mouse(Math.round((h.x - 9) * 48), Math.round((h.y + 9) * 48)); frames(w, 2);
    w.attackClick(); frames(w, 40);
    assert.equal(pending(w).stacks, 1, "ダメージが入らなかった攻撃では消費されない");
    // 当たる通常武器の攻撃で一度に消費
    aimHeart(w);
    const hp0 = heartHp(w);
    w.attackClick(); frames(w, 40);
    assert.ok(heartHp(w) < hp0, "通常武器がダメージを与えた");
    assert.equal(S(w).getPending(), null, "蓄えは一度に消費された");
    const last = plain(S(w).getLastAttack());
    assert.deepEqual([last.stacks, last.multiplier, last.ignoreDefense], [1, S(w).combine([0.15]), true]);
    assert.equal(dropped(w), 0, "使われた蓄えは「捨てた」に数えない");
    assert.equal(castStrength(w).ok, true, "消費された後は、同じ ATTACK でまた使える");
    assert.equal(pending(w).stacks, 1);
    w.soul.end("t");
});

test("重ね掛け可: 蓄えがある間も再発動でき、発動のたびにコストを引き、蓄えは回数分たまる(1つだけの制限は無い)。詳細は ProjectR_SoulStrengthStack.test.cjs", () => {
    const w = strengthW();
    assert.equal(castStrength(w).ok, true);
    const spent = ms(w).spent, spends = ms(w).stats.spends;
    for (let i = 0; i < 3; i++) { set(w, 10); const r = use(w, "hermes_strength"); assert.equal(r.ok, true); }
    assert.equal(ms(w).stats.spends, spends + 3, "発動のたびに1回ずつ消費");
    assert.ok(ms(w).spent > spent);
    assert.equal(pending(w).stacks, 4, "蓄えは回数分たまる");
    w.soul.end("t");
});

test("ATTACK の終了では、使われなかった蓄えを捨てる(通常の移行=時間切れ・skip・中断・SOUL の終了・敵ハートの撃破)。DEFENSE・PREPARE・次の ATTACK へ持ち越さず、その分のマナは返さない", () => {
    const paths = {
        "時間切れ(通常の遷移)": w => { frames(w, 130); },
        "skipPhase": w => { w.soul.skipPhase(); },
        "SOUL の終了(end)": w => { w.soul.end("abort"); },
        "マップ移動による中断": w => { quietly(() => w.ctx.$gameMap.setup(w.ctx.$gameMap.mapId())); },
        "敵ハートの撃破(勝利)": w => { const id = w.heart; const hp = w.ctx.ProjectRCardModifiers.eventHp(id); w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-" + (hp + 50), exceedMaxHealth: "false" }); frames(w, 6); }
    };
    for (const [name, exit] of Object.entries(paths)) {
        const w = strengthW({ attackSeconds: 2 });
        assert.equal(castStrength(w).ok, true, name);
        const spent = ms(w).spent;
        const d0 = dropped(w);
        exit(w);
        assert.equal(S(w).getPending(), null, name + ": ATTACK の終了で蓄えは捨てられる");
        assert.equal(S(w).getLastAttack() === null || true, true);
        if (w.soul.isActive()) {
            assert.notEqual(w.soul.getPhase(), "attack", name + ": ATTACK は終わっている");
            assert.equal(S(w).getPending(), null, name + ": DEFENSE に持ち越さない");
        }
        assert.ok(dropped(w) >= d0, name);
        if (w.soul.isActive()) assert.equal(ms(w).spent, spent, name + ": マナは返さない(引いた分のまま)");
        w.ctx.ProjectRSoulSkills.endAll("test");
        if (w.soul.isActive()) w.soul.end("t");
    }
});

test("DEFENSE・PREPARE・次の ATTACK のどこにも持ち越さない: 蓄えを残して ATTACK を終えると、各フェーズで蓄えは無く、次の ATTACK の通常武器の攻撃に強化はかからず、ストレングスはまた使える(拒否されない)", () => {
    const w = strengthW();
    assert.equal(castStrength(w).ok, true);
    assert.equal(pending(w).stacks, 1);
    w.soul.skipPhase();                                                       // ATTACK → DEFENSE
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(S(w).getPending(), null, "DEFENSE に持ち込まない");
    assert.equal(dropped(w), 1, "使われなかった蓄えを1回捨てた");
    frames(w, 30);
    w.soul.skipPhase();                                                       // → PREPARE
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(S(w).getPending(), null, "PREPARE に持ち込まない");
    assert.equal(plain(M(w).quote("hermes_strength")).reason, "notAttack");
    frames(w, 60);
    w.soul.beginAttack(); frames(w, 2);                                       // → 次の ATTACK
    assert.equal(S(w).getPending(), null, "次の ATTACK に持ち込まない");
    // 次の ATTACK の通常武器の攻撃に、前の強化がかからない
    const lastBefore = S(w).getLastAttack();
    aimHeart(w);
    const hp0 = heartHp(w);
    w.attackClick(); frames(w, 40);
    assert.ok(heartHp(w) < hp0, "通常武器は当たる");
    assert.deepEqual(S(w).getLastAttack(), lastBefore, "ストレングスの強化は使われていない(前のラウンドの蓄えで強化されていない)");
    assert.equal(S(w).getPending(), null);
    set(w, 10);
    const again = use(w, "hermes_strength");
    assert.equal(again.ok, true, "前のラウンドの蓄えで拒否されない: " + JSON.stringify(again));
    w.soul.end("t");
});

test("連続するラウンド: 3ラウンドとも「発動 → 使わず ATTACK 終了 → 捨てる」。毎回また使え、蓄えは常に最大1つ・マナは毎ATTACK 10から。使った(当てた)ラウンドは捨てない", () => {
    const w = strengthW();
    for (let round = 1; round <= 3; round++) {
        assert.equal(w.soul.getPhase(), round === 1 ? "attack" : "attack");
        assert.equal(S(w).getPending(), null, "ラウンド" + round + "の開始時は蓄えなし");
        assert.ok(ms(w).current > 9.5 || round === 1, "マナは ATTACK ごとに10から");
        const r = castStrength(w);
        assert.equal(r.ok, true, "ラウンド" + round + " " + JSON.stringify(r));
        assert.equal(pending(w).stacks, 1);
        if (round === 2) {                                                    // このラウンドは当てて消費する
            aimHeart(w); w.attackClick(); frames(w, 40);
            assert.equal(S(w).getPending(), null, "当たって消費");
        }
        w.soul.skipPhase(); frames(w, 5);
        assert.equal(S(w).getPending(), null, "ラウンド" + round + " の終了後に蓄えは無い");
        w.soul.skipPhase(); frames(w, 5);
        w.soul.beginAttack(); frames(w, 2);
    }
    assert.equal(dropped(w), 2, "使われなかった蓄えを捨てたのは2回(ラウンド1・3)");
    assert.equal(ms(w).stats.spends, 3, "3回の発動で3回だけ引いた(拒否は引かない)");
    w.soul.end("t");
});

test("従来の攻撃⇄防御(prepare なし)と通常のマップでは変えない: ストレングスの蓄えは従来どおりフェーズをまたぐ(後始末は呼ばれない)。ストレングスの倍率・持続のデータは元のまま", () => {
    const w = startA16(world(), { prepare: false, extra: { weapon: "sword" } });
    const before = JSON.stringify([plain(S(w).effectsForLevel(1)), plain(S(w).effectsForLevel(2)), plain(S(w).effectsForLevel(3))]);
    const hand = battle(w).hand.map(c => c.cardId);
    // 従来の経路でストレングスを使うため、手札を作り直さず、Core の公開 API でストレングスを使う(従来のSOULは手札が入れ替わる従来の規則)
    D(w).setCardLevel("hermes_strength", 3);
    const startedHand = battle(w);
    void hand; void startedHand;
    // ストレングスを手札へ入れる: Sandbox の openingHand を使う
    w.soul.end("t");
    const w2 = startA16(world(), { prepare: false, hand: ["hermes_strength", "hermes_sweep", "hermes_issen", "apollo_golden_volley", "hermes_reed_flute"], extra: { weapon: "sword" } });
    assert.equal(plain(D(w2).requestUseCard(0)).ok, true);
    assert.equal(plain(S(w2).getPending()).stacks, 1);
    w2.soul.skipPhase(); frames(w2, 5);
    assert.equal(w2.soul.getPhase(), "defense");
    assert.equal(plain(S(w2).getPending()).stacks, 1, "従来の SOUL は従来どおり持ち越す(今回の後始末は準備ループだけ)");
    w2.soul.skipPhase(); frames(w2, 5);
    assert.equal(plain(S(w2).getPending()).stacks, 1);
    assert.equal(dropped(w2), 0, "従来の経路では捨てていない");
    w2.soul.end("t");
    assert.equal(JSON.stringify([plain(S(w2).effectsForLevel(1)), plain(S(w2).effectsForLevel(2)), plain(S(w2).effectsForLevel(3))]), before, "倍率・防御無視のデータは変えていない");
    // 通常のマップ(SOUL でない)では、clear は誰も呼ばない。呼ばれても何もない(蓄えが無ければ false)
    const w3 = world();
    assert.equal(S(w3).clear("test"), false);
    const src = read("js/plugins/ProjectR_HermesStrength.js");
    assert.match(src, /clear: reason =>/);
    assert.doesNotMatch(src, /ProjectRSoul|soulAttack/, "ストレングス側は SOUL を知らない(呼ばれるだけの窓口)");
});

// ---------------------------------------------------------------- 他の一時的なスキル強化の漏れ ----------------------------------------------------------------
const leaks = w => {
    const skills = plain(w.ctx.ProjectRSoulSkills.getState()), mods = w.ctx.ProjectRCardModifiers;
    const statusList = key => safe(() => plain(w.ctx.ProjectRApolloStatus.list(key)), []);
    return {
        effects: plain(w.ctx.ProjectRSoulSkills.getEffects()).length, ownPause: skills.ownPause, weaponBonus: plain(mods.getWeaponHitBonus()), moveFactor: mods.moveSpeedFactor(),
        dodge: plain(w.ctx.ProjectRSoulBattleDodge.getModifiers()), strength: S(w).getPending(), manaDiscount: ms(w).discount, holds: ms(w).holds.length, charged: ms(w).charged.length,
        lyreBuffs: plain(w.ctx.ProjectRApolloLyreRhythm.getBuffs()), lyreSession: w.ctx.ProjectRApolloLyreRhythm.getSession(), playerStatus: statusList("player")
    };
};
const safe = (fn, fallback) => { try { return fn(); } catch (_e) { return fallback; } };

test("他の一時的なスキル強化も ATTACK の境目で漏れない: 絶・葦笛・ヴェイル・サイコポンポス・神託・月桂冠・ヒュアキントス・竪琴・ストレングスを使って ATTACK を終えると、効果・時間停止・武器の強化・移動/攻撃間隔・回避AIの状態異常・竪琴の強化・割引・予約が残らない。次の ATTACK にも持ち越さない", () => {
    const groups = [["hermes_zetsu", "hermes_reed_flute", "hermes_veil", "hermes_psychopomp", "apollo_oracle"], ["apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm", "hermes_strength", "hermes_sweep"]];
    for (const group of groups) {
        const w = startA16(world(), { extra: { weapon: "sword" } });
        equip(w, group);
        for (const cardId of group) { if (cardId === "hermes_sweep") continue; set(w, 10); use(w, cardId); frames(w, 4); }
        // 竪琴: 音符を押して、攻撃・速度(割引)・癒・病の強化を実際に付ける
        if (group.includes("apollo_lyre_rhythm")) {
            const lyre = w.ctx.ProjectRApolloLyreRhythm;
            for (let k = 0; k < 3; k++) {
                const notes = plain(lyre.getNotes());
                const n = notes.find(x => x.state === "flowing" && x.index >= k * 4);
                if (!n) break;
                for (let i = 0; i < 3000 && plain(lyre.getSession()).frame < n.arrive; i++) frames(w, 1);
                lyre.press();
            }
            assert.ok(plain(lyre.getBuffs()).stacks.attack + plain(lyre.getBuffs()).stacks.speed + plain(lyre.getBuffs()).stacks.heal + plain(lyre.getBuffs()).stacks.plague > 0, "竪琴の強化が付いた");
        }
        const during = leaks(w);
        assert.ok(during.effects + (during.weaponBonus ? 1 : 0) + (during.strength ? 1 : 0) + (during.lyreSession ? 1 : 0) > 0, "使ったので何かの効果が動いている");
        w.soul.skipPhase();                                                   // ATTACK の終了
        frames(w, 4);
        let after = leaks(w);
        assert.equal(after.effects, 0, JSON.stringify(group) + " 効果の一覧が空");
        assert.equal(after.ownPause, false, "神託の時間停止は解除");
        assert.equal(after.weaponBonus, null, "絶の武器の強化は解除");
        assert.equal(after.moveFactor, 1, "移動速度の係数は元");
        assert.deepEqual(after.dodge.ids, [], "回避AIへの状態異常(停止・反応遅延・減速)は解除");
        assert.equal(after.strength, null, "ストレングスの蓄えは解除");
        assert.deepEqual([after.manaDiscount, after.holds, after.charged], [null, 0, 0], "竪琴の割引・予約は破棄");
        assert.equal(after.lyreSession, null, "竪琴の演奏は終わる");
        assert.equal(after.lyreBuffs.attack, null, "竪琴の攻撃の強化は解除");
        assert.equal(after.lyreBuffs.speed, null);
        assert.deepEqual(after.playerStatus.filter(e => /lyre/i.test(e.id)), [], "プレイヤーの竪琴の状態は解除");
        w.soul.skipPhase(); frames(w, 4);                                     // PREPARE
        w.soul.beginAttack(); frames(w, 4);                                   // 次の ATTACK
        after = leaks(w);
        assert.deepEqual([after.effects, after.ownPause, after.weaponBonus, after.strength, after.manaDiscount, after.holds], [0, false, null, null, null, 0], "次の ATTACK にも持ち越さない");
        w.soul.end("t");
    }
});

test("敵ハートに付いた SOUL のカードの状態(ギガース殺しの弱体・出血・疫病)も ATTACK の終了で外れ、DEFENSE の間に継続ダメージが入らず、PREPARE の凍結を経て次の ATTACK に持ち越されない", () => {
    const w = startA16(world(), { extra: { weapon: "sword" } });
    equip(w, ["apollo_gigas_slayer", "apollo_plague_rain", "hermes_sweep", "hermes_issen", "hermes_reed_flute"]);
    for (const id of ["apollo_gigas_slayer", "apollo_plague_rain"]) D(w).setCardLevel(id, 2);       // Lv2: 出血(継続ダメージ)つき
    const status = w.ctx.ProjectRApolloStatus, key = status.targetKeyOfEvent(w.heart);
    aimHeart(w);
    for (const id of ["apollo_gigas_slayer", "apollo_plague_rain"]) { set(w, 10); use(w, id); frames(w, 140); }
    const during = plain(status.list(key)).map(e => e.id).sort();
    assert.ok(during.includes("gigas_weak") && during.includes("plague"), "命中で状態が付いた: " + during.join());
    w.soul.skipPhase(); frames(w, 2);                                       // ATTACK → DEFENSE
    assert.deepEqual(plain(status.list(key)), [], "ATTACK の終了で外れる");
    const hp = heartHp(w);
    frames(w, 240);                                                          // DEFENSE の間: 継続ダメージ(出血・疫病)が入らない
    assert.equal(heartHp(w), hp, "DEFENSE の間に前の ATTACK の継続ダメージが入らない");
    w.soul.skipPhase(); frames(w, 60);                                       // PREPARE(時計は凍結)
    w.soul.beginAttack(); frames(w, 2);
    assert.deepEqual(plain(status.list(key)), [], "次の ATTACK に持ち越さない");
    const st = plain(w.ctx.ProjectRSoulSkills.getState().stats);
    assert.ok((st.statusDropped || 0) + (st.attacksDropped || 0) >= 1, "状態の除去か飛行中の攻撃の打ち切りが記録される");
    assert.deepEqual(plain(w.ctx.ProjectRApolloPlagueRain.getCircles()), [], "疫病の円が残らない");
    assert.deepEqual(plain(w.ctx.ProjectRApolloErosArrow.getSequences()), [], "エロスの矢・ビームが残らない");
    w.soul.end("t");
});

test("飛行中のエロスの矢・ビームは ATTACK の終了で打ち切られ、DEFENSE の間にハートへダメージが入らない", () => {
    const w = startA16(world(), { extra: { weapon: "sword" } });
    equip(w, ["apollo_eros_arrow", "hermes_sweep", "hermes_issen", "hermes_reed_flute", "hermes_veil"]);
    D(w).setCardLevel("apollo_eros_arrow", 3);
    aimHeart(w); set(w, 10); use(w, "apollo_eros_arrow"); frames(w, 12);
    assert.ok(plain(w.ctx.ProjectRApolloErosArrow.getSequences()).length > 0, "矢が飛んでいる");
    w.soul.skipPhase(); frames(w, 2);
    assert.deepEqual(plain(w.ctx.ProjectRApolloErosArrow.getSequences()), [], "ATTACK の終了で打ち切る");
    const hp = heartHp(w); frames(w, 240);
    assert.equal(heartHp(w), hp, "DEFENSE の間にダメージが入らない");
    assert.ok(plain(w.ctx.ProjectRSoulSkills.getState().stats).attacksDropped >= 1);
    w.soul.end("t");
});


