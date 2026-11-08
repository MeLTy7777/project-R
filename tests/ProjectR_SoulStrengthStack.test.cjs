"use strict";
// L4-B 後: SOUL 専用ストレングスの再設計(準備ループ)。連続発動(重ね掛け)・マナの精算・物理ダメージのカードへの適用・魔法/非ダメージの除外・多段ヒットの重複なし・ATTACK 終了での全クリア。実エンジン(全plugin)をNode VMで動かす。
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
const APPROVED = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];       // テスト用の仮の承認(本番の一覧 SOUL_PHYSICAL_ATTACKS は未承認のため空)
function approve(w, list = APPROVED) { return S(w).setSoulCards({ physical: list }); }
const strengthW = (opts = {}) => { const w = startA16(world(), { extra: { weapon: "sword", ...opts } }); equip(w, ["hermes_strength", "hermes_sweep", "hermes_issen", "apollo_golden_volley", "hermes_reed_flute"]); if (!opts.unapproved) approve(w); return w; };
const dropped = w => plain(w.ctx.ProjectRSoulSkills.getState().stats).strengthDropped || 0;

// ---- tests ----
const fixedHit = (w, source, base, extra = {}) => {          // カードの固定ダメージ(projectRFixed)を、敵ハートへ1ヒットだけ入れる(カードの実装と同じ窓口)
    const before = w.ctx.ProjectRCardModifiers.eventHp(w.heart);
    w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 1 }), "Hendrix_Action_Engine", "UpdateEventHp",
        { eventId: String(w.heart), value: `-${base}`, exceedMaxHealth: "false", projectRFixed: Object.assign({ base, flat: 0, source, element: 0, weaknessMultiplier: 1, critical: false }, extra) });
    return before - w.ctx.ProjectRCardModifiers.eventHp(w.heart);
};
const stacksOf = w => (plain(S(w).getPending()) || {}).stacks || 0;
const lastSerial = w => (plain(S(w).getLastAttack()) || {}).serial || 0;
const level = (w, l) => D(w).setCardLevel("hermes_strength", l);
const cardDamage = (cardId, stacks, { near = false, frames: n = 150, lv = 2, list = APPROVED } = {}) => {
    const w = startA16(world(), { extra: { weapon: "sword", attackSeconds: 120 } });
    equip(w, ["hermes_strength", cardId, "hermes_zetsu", "hermes_veil", "hermes_reed_flute"]);
    if (list) approve(w, list);
    level(w, lv);
    for (let i = 0; i < stacks; i++) assert.equal(castStrength(w).ok, true);
    if (near) { const h = heartPos(w); w.ctx.$gamePlayer.locate(Math.round(h.x), Math.round(h.y) + 2); w.ctx.$gamePlayer.setDirection(8); frames(w, 2); }
    aimHeart(w);
    set(w, 10);
    const hp0 = heartHp(w), r = use(w, cardId);
    frames(w, n);
    return { ok: r.ok, dmg: hp0 - heartHp(w), left: stacksOf(w), last: plain(S(w).getLastAttack()), w };
};

test("連続発動: 蓄えがある間も、続けて何度でも発動できる。発動のたびに承認済みのコストを1回ずつ引き、蓄えは回数分たまる(元の加算の計算: Lv2 = 1 + 0.15 x 回数)", () => {
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    const s0 = ms(w).stats.spends;
    for (let n = 1; n <= 3; n++) {
        set(w, 10);
        const r = use(w, "hermes_strength");
        assert.equal(r.ok, true, `${n}回目: ` + JSON.stringify(r));
        const p = pending(w);
        assert.equal(p.stacks, n);
        assert.ok(Math.abs(p.multiplier - (1 + 0.15 * n)) < 1e-9, `${n}回分の倍率 = ${p.multiplier}`);
    }
    assert.equal(ms(w).stats.spends - s0, 3, "発動ごとに1回ずつ消費");
    // 各回の値は発動時のカードレベルで記録される(途中でレベルが変わっても過去の分は変わらない)
    level(w, 1); set(w, 10);
    assert.equal(use(w, "hermes_strength").ok, true);
    assert.deepEqual(plain(pending(w).values), [0.15, 0.15, 0.15, 0.1]);
    assert.ok(Math.abs(pending(w).multiplier - 1.55) < 1e-9);
    w.soul.end("t");
});

test("マナの精算: 発動のたびに承認済みのコストを引く。足りなければ重ね掛けは拒否され(insufficientMana)、蓄えは増えず、マナも引かない。buffActive は返さない", () => {
    const w = strengthW({ attackSeconds: 120 });
    const cost = M(w).costOf("hermes_strength");
    set(w, cost + 1);
    const s0 = ms(w).spent;
    assert.equal(use(w, "hermes_strength").ok, true);
    assert.equal(ms(w).spent - s0, cost, "1回目はコストぶん");
    const spent = ms(w).spent, spends = ms(w).stats.spends;
    const r = use(w, "hermes_strength");
    assert.deepEqual([r.ok, r.reason], [false, "insufficientMana"]);
    assert.equal(ms(w).spent, spent, "拒否ではマナを引かない");
    assert.equal(ms(w).stats.spends, spends);
    assert.equal(stacksOf(w), 1, "蓄えは増えない");
    assert.notEqual(plain(M(w).quote("hermes_strength")).reason, "buffActive");
    set(w, 10);
    const s1 = ms(w).spent;
    assert.equal(use(w, "hermes_strength").ok, true, "蓄えがあっても、マナが足りれば発動できる");
    assert.equal(ms(w).spent - s1, cost, "2回目もコストぶん");
    assert.equal(stacksOf(w), 2);
    w.soul.end("t");
});

test("通常の武器攻撃: 重ね掛けた蓄えは、次に当たった攻撃で一度にすべて消費され、倍率は加算のまま1回だけ掛かる", () => {
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    assert.equal(castStrength(w).ok, true); set(w, 10); assert.equal(use(w, "hermes_strength").ok, true);
    assert.equal(stacksOf(w), 2);
    aimHeart(w);
    const hp0 = heartHp(w);
    w.attackClick(); frames(w, 40);
    assert.ok(heartHp(w) < hp0);
    assert.equal(S(w).getPending(), null, "2回分を一度にすべて消費");
    const last = plain(S(w).getLastAttack());
    assert.equal(last.stacks, 2);
    assert.equal(last.card, undefined, "通常武器の攻撃");
    assert.ok(Math.abs(last.multiplier - 1.3) < 1e-9, "1 + 0.15 x 2");
    w.soul.end("t");
});

test("物理ダメージのカード(薙ぎ払い・一閃・黄金の矢・エロスの矢・ギガース殺し): 蓄えを使い、倍率が掛かる。1回の使用で蓄えを一度にすべて消費し、次の使用には残らない", () => {
    for (const [id, near] of [["hermes_sweep", true], ["hermes_issen", true], ["apollo_golden_volley", false], ["apollo_eros_arrow", false]]) {
        const base = cardDamage(id, 0, { near }), one = cardDamage(id, 1, { near }), two = cardDamage(id, 2, { near });
        assert.ok(base.dmg > 0, id + ": 元のダメージ " + base.dmg);
        assert.ok(one.dmg > base.dmg && two.dmg > one.dmg, `${id}: ${base.dmg} < ${one.dmg} < ${two.dmg}`);
        assert.ok(two.dmg / base.dmg <= 1.32 && two.dmg / base.dmg >= 1.15, `${id}: 倍率の範囲(固定の加算は掛からない): ${two.dmg / base.dmg}`);
        assert.equal(one.left, 0, id + ": 蓄えは使用で消費された");
        assert.equal(two.left, 0);
        assert.deepEqual([two.last.card, two.last.source, two.last.stacks], [true, id, 2], id);
        assert.ok(Math.abs(two.last.multiplier - 1.3) < 1e-9);
        for (const x of [base, one, two]) x.w.soul.end("t");
    }
    // ギガース殺し(高ダメージ): ダメージの大きさではなく、蓄えが消費されたことを確認する
    const g = cardDamage("apollo_gigas_slayer", 2, { frames: 120 });
    assert.equal(g.left, 0);
    assert.deepEqual([g.last.card, g.last.source], [true, "apollo_gigas_slayer"]);
    // 同じカードをもう一度使う: 蓄えが無いので元のダメージのまま
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    const h = heartPos(w); w.ctx.$gamePlayer.locate(Math.round(h.x), Math.round(h.y) + 2); w.ctx.$gamePlayer.setDirection(8); frames(w, 2); aimHeart(w);
    set(w, 10); const a0 = heartHp(w); use(w, "hermes_sweep"); frames(w, 60); const plainDmg = a0 - heartHp(w);
    castStrength(w); set(w, 10); const b0 = heartHp(w); use(w, "hermes_sweep"); frames(w, 60); const boosted = b0 - heartHp(w);
    set(w, 10); const c0 = heartHp(w); use(w, "hermes_sweep"); frames(w, 60); const after = c0 - heartHp(w);
    assert.ok(boosted > plainDmg, `${plainDmg} < ${boosted}`);
    assert.equal(after, plainDmg, "蓄えを使い切った後の使用は元のダメージ");
    w.soul.end("t");
});

test("物理かどうかの判断: ダメージ種別(damageType)があればそれ → 属性(物理だけが物理)→ 無属性のカードは物理カードの一覧。魔法・属性・継続ダメージ・一覧に無い出どころには掛からず、蓄えも消費しない", () => {
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    assert.equal(castStrength(w).ok, true);
    S(w).beginAction("probe");
    assert.equal(fixedHit(w, "probe", 100), 100, "一覧に無い出どころ(無属性)");
    assert.equal(fixedHit(w, "probe", 100, { damageType: "magical" }), 100, "damageType が魔法");
    assert.equal(fixedHit(w, "hermes_sweep", 100, { element: 3 }), 100, "炎などの属性は魔法扱い(一覧より属性を優先)");
    assert.equal(fixedHit(w, "plague_dot", 100, { element: 0 }), 100, "継続ダメージ(出血・疫病など)");
    assert.equal(stacksOf(w), 1, "掛からなかったので消費されない");
    const physicalId = w.ctx.$dataSystem.elements.findIndex(n => n === "物理");
    assert.ok(physicalId > 0, "Database に「物理」属性がある");
    S(w).beginAction("probe2");
    assert.equal(fixedHit(w, "probe2", 100, { element: physicalId }), 115, "物理属性は一覧に無くても物理");
    assert.equal(S(w).getPending(), null, "最初に掛かったヒットで消費");
    castStrength(w); S(w).beginAction("probe3");
    assert.equal(fixedHit(w, "probe3", 100, { damageType: "physical" }), 115, "damageType が物理なら一覧に無くても掛かる");
    castStrength(w); S(w).beginAction("hermes_issen");
    assert.equal(fixedHit(w, "hermes_issen", 200), 230, "一覧の物理カード(無属性)");
    w.soul.end("t");
});

test("魔法・状態異常・非ダメージのカードには使わない: 疫病の矢(+継続ダメージ)・ヴェイル・絶・葦笛を使っても蓄えは消費されず、疫病のダメージは変わらない", () => {
    const run = withStrength => {
        const w = startA16(world(), { extra: { weapon: "sword", attackSeconds: 120 } });
        equip(w, ["hermes_strength", "apollo_plague_rain", "hermes_reed_flute", "hermes_veil", "hermes_zetsu"]);
        approve(w);                                                       // 仮の承認一覧(疫病の矢は入れない)
        level(w, 2);
        if (withStrength) assert.equal(castStrength(w).ok, true);
        aimHeart(w);
        const hp0 = heartHp(w);
        set(w, 10); use(w, "apollo_plague_rain"); frames(w, 400);
        const plague = hp0 - heartHp(w);
        const left = stacksOf(w);
        return { plague, left, w };
    };
    const base = run(false), boosted = run(true);
    assert.ok(base.plague > 0, "疫病の矢はダメージを与える: " + base.plague);
    assert.equal(boosted.plague, base.plague, "ストレングスは疫病のダメージに掛からない");
    assert.equal(boosted.left, 1, "疫病の矢・継続ダメージでは消費されない");
    for (const id of ["hermes_reed_flute", "hermes_veil", "hermes_zetsu"]) { set(boosted.w, 10); use(boosted.w, id); frames(boosted.w, 5); }
    assert.equal(stacksOf(boosted.w), 1, "非ダメージの効果でも消費されない");
    aimHeart(boosted.w); boosted.w.attackClick(); frames(boosted.w, 40);
    assert.equal(stacksOf(boosted.w), 0, "物理の通常攻撃では消費される");
    base.w.soul.end("t"); boosted.w.soul.end("t");
});

test("多段ヒット: 1回の使用が何回当たっても(複数の敵・複数の矢・ビームのティック)、蓄えの消費は1度だけで、同じ倍率が1回ずつ掛かる(重ねて掛からない)。次の使用は新しい蓄えが要る", () => {
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    assert.equal(castStrength(w).ok, true); set(w, 10); assert.equal(use(w, "hermes_strength").ok, true);
    const serial0 = lastSerial(w);
    S(w).beginAction("hermes_sweep");
    const hits = [fixedHit(w, "hermes_sweep", 100), fixedHit(w, "hermes_sweep", 100), fixedHit(w, "hermes_sweep", 100)];
    assert.deepEqual(hits, [130, 130, 130], "3ヒットとも同じ倍率(1 + 0.15 x 2)が1回ずつ");
    assert.equal(lastSerial(w), serial0 + 1, "消費は1度だけ");
    assert.equal(S(w).getPending(), null);
    S(w).beginAction("hermes_sweep");                                   // 次の使用: 蓄えが無いので掛からない
    assert.equal(fixedHit(w, "hermes_sweep", 100), 100);
    castStrength(w); S(w).beginAction("hermes_sweep");                 // 新しい蓄え + 新しい使用 → また1度だけ
    assert.deepEqual([fixedHit(w, "hermes_sweep", 100), fixedHit(w, "hermes_sweep", 100)], [115, 115]);
    assert.equal(lastSerial(w), serial0 + 2);
    // 別のカードの使用は、別の使用として数える(取り違えない): 蓄えは1度の消費で空になる
    castStrength(w); S(w).beginAction("hermes_issen"); S(w).beginAction("hermes_sweep");
    assert.equal(fixedHit(w, "hermes_issen", 100), 115);
    assert.equal(S(w).getPending(), null);
    assert.equal(fixedHit(w, "hermes_sweep", 100), 100, "蓄えは既に消費済み");
    w.soul.end("t");
});

test("実カードの多段ヒット: 黄金の矢の複数の矢が何度当たっても、蓄えの消費は1度だけで、各ヒットの基礎値には同じ倍率が1回だけ掛かる(重ねて掛からない)", () => {
    const volley = withStrength => {
        const w = strengthW({ attackSeconds: 120 });
        level(w, 2);
        if (withStrength) { assert.equal(castStrength(w).ok, true); set(w, 10); assert.equal(use(w, "hermes_strength").ok, true); }
        aimHeart(w);
        const serial0 = lastSerial(w), hp0 = heartHp(w);
        set(w, 10); const vr = use(w, "apollo_golden_volley"); assert.ok(vr.ok || vr.pending === true, JSON.stringify(vr));
        frames(w, 200);
        const hits = plain(w.ctx.ProjectRCardModifiers.getWeaponHitLog()).filter(e => e.type === "hit" && e.source === "apollo_golden_volley" && e.landed);
        const out = { bases: hits.map(h => h.base), serials: lastSerial(w) - serial0, left: stacksOf(w), dmg: hp0 - heartHp(w) };
        w.soul.end("t");
        return out;
    };
    const plainRun = volley(false), boosted = volley(true);
    assert.ok(plainRun.bases.length >= 2 && boosted.bases.length >= 2, "複数の矢が当たった: " + plainRun.bases.length + " / " + boosted.bases.length);
    assert.equal(boosted.serials, 1, "消費は1度だけ");
    assert.equal(boosted.left, 0);
    const expected = new Set(plainRun.bases.map(b => Math.round(b * 1.3)));
    for (const b of boosted.bases) assert.ok(expected.has(b), `基礎値 ${b} は元の基礎値 ${[...new Set(plainRun.bases)]} の 1.3 倍(1回だけ)のどれか`);
    assert.ok(boosted.dmg > plainRun.dmg);
});

test("ATTACK の終了で蓄え・使用の確定・カード攻撃への適用をすべて消す(時間切れ・skip・中断・マップ移動・SOUL の終了)。DEFENSE・PREPARE・次の ATTACK に持ち越さない", () => {
    const paths = {
        "時間切れ(通常の遷移)": w => { frames(w, 130); },
        "skipPhase": w => { w.soul.skipPhase(); },
        "SOUL の終了(abort)": w => { w.soul.end("abort"); },
        "マップ移動による中断": w => { quietly(() => w.ctx.$gameMap.setup(w.ctx.$gameMap.mapId())); }
    };
    for (const [name, exit] of Object.entries(paths)) {
        const w = strengthW({ attackSeconds: 2 });
        level(w, 2);
        assert.equal(castStrength(w).ok, true); set(w, 10); assert.equal(use(w, "hermes_strength").ok, true);
        S(w).beginAction("hermes_sweep");
        assert.equal(fixedHit(w, "hermes_sweep", 100), 130, name + ": 適用中");
        castStrength(w);                                                // 使用の確定を残したまま、新しい蓄えも残す
        assert.ok(stacksOf(w) >= 1);
        exit(w);
        frames(w, 3);
        assert.equal(S(w).getPending(), null, name + ": 蓄えは残らない");
        assert.equal(S(w).getSoulCards(), null, name + ": カード攻撃への適用は止まる");
        if (w.soul.getPhase() === "defense") {
            S(w).beginAction("hermes_sweep");
            assert.equal(fixedHit(w, "hermes_sweep", 100), 100, name + ": DEFENSE では掛からない");
            w.soul.skipPhase(); frames(w, 5);
            assert.equal(w.soul.getPhase(), "prepare");
            assert.equal(S(w).getPending(), null, name + ": PREPARE にも無い");
            w.soul.beginAttack(); frames(w, 2);
            assert.deepEqual(plain(S(w).getSoulCards()).physical, [], "次の ATTACK でカード攻撃の仕組みはまた有効(本番の承認一覧は空)");
            approve(w);
            S(w).beginAction("hermes_sweep");
            assert.equal(fixedHit(w, "hermes_sweep", 100), 100, name + ": 次の ATTACK に持ち越さない");
        }
        if (w.soul.getState().active) w.soul.end("t");
    }
});

test("連続するラウンド: 毎ラウンド、重ね掛け → 物理カード → ATTACK の終了で全クリア。前のラウンドの蓄え・使用の確定が次のラウンドに影響しない", () => {
    const w = strengthW({ attackSeconds: 120 });
    level(w, 2);
    for (let round = 1; round <= 3; round++) {
        assert.equal(stacksOf(w), 0, `ラウンド${round}の開始: 蓄えなし`);
        set(w, 10); assert.equal(use(w, "hermes_strength").ok, true); set(w, 10); assert.equal(use(w, "hermes_strength").ok, true);
        assert.equal(stacksOf(w), 2);
        S(w).beginAction("hermes_sweep");
        assert.equal(fixedHit(w, "hermes_sweep", 100), 130, `ラウンド${round}: 2回分の倍率`);
        castStrength(w);                                                // 使われなかった蓄えを残して終了
        assert.equal(stacksOf(w), 1);
        w.soul.skipPhase(); frames(w, 3);
        assert.equal(S(w).getPending(), null);
        S(w).beginAction("hermes_sweep");
        assert.equal(fixedHit(w, "hermes_sweep", 100), 100, "DEFENSE");
        w.soul.skipPhase(); frames(w, 3);
        assert.equal(w.soul.getPhase(), "prepare");
        assert.equal(S(w).getPending(), null);
        w.soul.beginAttack(); frames(w, 3);
        approve(w);
        S(w).beginAction("hermes_sweep");
        assert.equal(fixedHit(w, "hermes_sweep", 100), 100, `ラウンド${round + 1}の ATTACK: 持ち越さない`);
        assert.equal(w.soul.getPhase(), "attack");
    }
    w.soul.end("t");
});

test("通常のマップ戦闘・従来の攻撃⇄防御(prepare なし)では何も変えない: カード攻撃への適用は無効で、蓄えは従来どおり通常武器の攻撃だけに使われる", () => {
    const normal = world();
    assert.equal(S(normal).getSoulCards(), null, "SOUL でなければ無効");
    assert.equal(S(normal).beginAction("hermes_sweep"), 0);
    assert.equal(S(normal).setSoulCards(null), false);
    const w = startA16(world(), { prepare: false, hand: ["hermes_strength", "hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow"], extra: { weapon: "sword" } });
    assert.equal(w.soul.getState().prepare, false);
    assert.equal(S(w).getSoulCards(), null, "従来の SOUL では有効にならない");
    assert.equal(use(w, "hermes_strength").ok, true);
    assert.equal(stacksOf(w), 1);
    assert.equal(fixedHit(w, "hermes_sweep", 100), 100, "固定ダメージのカードには掛からない");
    assert.equal(stacksOf(w), 1, "消費もされない");
    aimHeart(w); const hp0 = heartHp(w); w.attackClick(); frames(w, 40);
    assert.ok(heartHp(w) < hp0);
    assert.equal(S(w).getPending(), null, "通常の武器攻撃では従来どおり消費される");
    w.soul.end("t");
});

test("ダメージ処理の共通部分の追加は不活性・ストレングスの倍率の計算は元のまま", () => {
    assert.match(read("js/plugins/ProjectR_CardModifiers.js"), /damageMultiplier/);
    const w = world();
    const s = w.ctx.ProjectRHermesStrength;
    assert.deepEqual([0.1, 0.15].map(p => s.combine([p])), [1.1, 1.15]);
    assert.equal(s.stackingMode(), "additive");
    assert.ok(Math.abs(s.combine([0.15, 0.15, 0.15]) - 1.45) < 1e-9);
    assert.ok(Math.abs(s.combine([0.1, 0.15]) - 1.25) < 1e-9);
});

test("分類の方針: 仕様にカード攻撃の物理/魔法の分類は無い。承認された一覧が空(本番の既定)の間は、カード攻撃にストレングスは掛からず、蓄えも消費されない(通常の剣・銃だけ)", () => {
    const w = strengthW({ attackSeconds: 120, unapproved: true });
    level(w, 2);
    assert.equal(plain(S(w).getSoulCards()).physical.length, 0, "本番の承認一覧は空");
    assert.equal(castStrength(w).ok, true);
    for (const id of ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_plague_rain", "apollo_golden_arrow"]) {
        S(w).beginAction(id);
        assert.equal(fixedHit(w, id, 100), 100, id + ": 未承認の攻撃には掛からない");
    }
    assert.equal(stacksOf(w), 1, "蓄えは消費されない");
    aimHeart(w); const hp0 = w.ctx.ProjectRCardModifiers.eventHp(w.heart); w.attackClick(); frames(w, 40);
    assert.ok(w.ctx.ProjectRCardModifiers.eventHp(w.heart) < hp0, `通常の攻撃がダメージを与えた ${hp0} -> ${w.ctx.ProjectRCardModifiers.eventHp(w.heart)}`);
    assert.equal(stacksOf(w), 0, "通常の剣の攻撃では消費される");
    w.soul.end("t");
});

test("攻撃ごとの分類: カードID#攻撃種別で承認すると、その種別だけに掛かる(エロスの矢の矢 = eros と Lv3 のビーム = erosb を分けられる)", () => {
    const w = strengthW({ attackSeconds: 120, unapproved: true });
    level(w, 2);
    approve(w, ["apollo_eros_arrow#eros"]);
    assert.equal(castStrength(w).ok, true);
    S(w).beginAction("apollo_eros_arrow");
    const beam = (extra = {}) => { const before = w.ctx.ProjectRCardModifiers.eventHp(w.heart); w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 1 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(w.heart), value: "-100", exceedMaxHealth: "false", projectRAttackId: extra.id, projectRFixed: { base: 100, flat: 0, source: "apollo_eros_arrow", element: 0, weaknessMultiplier: 1, critical: false } }); return before - w.ctx.ProjectRCardModifiers.eventHp(w.heart); };
    assert.equal(beam({ id: "erosb:1:3" }), 100, "ビームは未承認");
    assert.equal(stacksOf(w), 1);
    assert.equal(beam({ id: "eros:1:0" }), 115, "矢は承認");
    assert.equal(beam({ id: "eros:1:1" }), 115, "同じ使用の次の矢にも同じ倍率(消費は1度)");
    assert.equal(stacksOf(w), 0);
    w.soul.end("t");
});

console.log(`\n${passed} tests passed`);
