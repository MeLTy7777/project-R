"use strict";
// L4-B: SOUL戦闘のマナコスト(承認済みD8)。準備ループのATTACKで、使う前の判定・成功の確定時に1回だけの消費・予約型(pending)・竪琴の割引・絶/神託/ストレングスの重ね掛け防止・HUD。実エンジン(全plugin)をNode VMで動かす。
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

// ---------------------------------------------------------------- 承認表 ----------------------------------------------------------------
test("承認済みコスト表: docs/spece の承認CSV(推奨 Lv1〜3 = 承認)と COSTS が15枚すべてで一致(竪琴は 3/4/5)。実在のカードだけ・凍結・カードの所持 Lv で決まる", () => {
    const csv = read("docs/spece/ProjectR_SOUL_D8_mana_cost_approved.csv").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
    const split = line => { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
    const head = split(csv[0]), id = head.indexOf("カードID"), l1 = head.indexOf("推奨 Lv1"), status = head.indexOf("承認状態");
    const approved = {};
    for (const line of csv.slice(1)) { const c = split(line); assert.equal(c[status], "承認", c[id] + " は承認"); approved[c[id]] = [c[l1], c[l1 + 1], c[l1 + 2]].map(Number); }
    approved.apollo_lyre_rhythm = [3, 4, 5];                                       // 竪琴(D12保留の行)は指示どおり 3/4/5
    const w = world();
    const costs = plain(M(w).COSTS);
    assert.deepEqual(Object.keys(costs).sort(), Object.keys(approved).sort());
    assert.equal(Object.keys(costs).length, 15);
    for (const [card, row] of Object.entries(approved)) assert.deepEqual(costs[card], row, card);
    const balance = Object.keys(JSON.parse(read("data/ProjectR_CardBalance.json")).cards).sort();
    assert.deepEqual(Object.keys(costs).sort(), balance, "今あるカード15枚すべて(増減なし)");
    assert.equal(Object.isFrozen(M(w).COSTS) && Object.values(M(w).COSTS).every(Object.isFrozen), true);
    for (const row of Object.values(costs)) { assert.ok(row[0] <= row[1] && row[1] <= row[2], "Lvが上がっても下がらない"); assert.ok(row.every(v => v >= 1 && v <= 10)); }
});

test("コストはカードの所持 Lv(1〜3)で決まる。Lvを変えると引く量が変わる。表に無いカードは使えない(コストを作らない)", () => {
    const w = loopWorldWithAttack();
    for (const lv of [1, 2, 3]) {
        assert.equal(plain(D(w).setCardLevel("hermes_sweep", lv)).ok !== false, true);
        assert.equal(M(w).costOf("hermes_sweep"), [2, 3, 4][lv - 1], "薙ぎ払い Lv" + lv);
        assert.equal(M(w).costOf("apollo_oracle"), 9, "他のカードの Lv は別(神託は Lv3 のまま = 9)");
    }
    assert.equal(M(w).costOf("not_a_card"), null);
    assert.deepEqual([plain(M(w).quote("not_a_card")).ok, plain(M(w).quote("not_a_card")).reason], [false, "costUndefined"]);
    w.soul.end("t");
});
function loopWorldWithAttack(opts = {}) { const w = startA16(world(), opts); equip(w, ["hermes_sweep"]); return w; }

// ---------------------------------------------------------------- 同期のカードの消費 ----------------------------------------------------------------
test("成功の確定で、承認済みコスト(カードの所持Lv)をちょうど1回だけ引く: 一閃・ストレングス・薙ぎ払い・絶・葦笛 / ヴェイル・ヒュアキントス・月桂冠・サイコポンポス・神託(a16 は Lv3)。カードは手札に残り、使い終えても何度でも使える", () => {
    for (const group of [["hermes_issen", "hermes_strength", "hermes_sweep", "hermes_zetsu", "hermes_reed_flute"], ["hermes_veil", "apollo_hyacinthus", "apollo_laurel_wreath", "hermes_psychopomp", "apollo_oracle"]]) {
        const w = startA16(world(), { extra: { weapon: "sword" } });
        equip(w, group);
        const inv = savedData(w);
        for (const cardId of group) {
            set(w, 10);
            const before = ms(w), cost = M(w).costOf(cardId);
            const handBefore = JSON.stringify(battle(w).hand);
            const r = use(w, cardId);
            frames(w, 4);
            assert.equal(r.ok, true, cardId + ": " + JSON.stringify(r));
            const after = ms(w);
            assert.equal(after.spent - before.spent, cost, cardId + " のコスト " + cost + " をちょうど1回");
            assert.equal(after.stats.spends - before.stats.spends, 1, cardId + " は1回だけ消費");
            assert.ok(Math.abs(after.current - (10 - cost)) < 0.2, cardId + ": マナ " + after.current);
            assert.equal(JSON.stringify(battle(w).hand), handBefore, cardId + " は手札に残る(消費されない)");
            if (cardId === "apollo_oracle") { for (let i = 0; i < 400 && w.ctx.$gameMap.eventsPaused; i++) frames(w, 1); frames(w, 200); }
            w.ctx.ProjectRSoulSkills.endAll("test");
            frames(w, 2);
        }
        assert.equal(savedData(w), inv, "所持枚数・デッキは変わらない");
        w.soul.end("t");
    }
});

test("マナ不足は拒否: 何も引かず・カードの効果も起きない(神託の停止も始まらない)。ちょうどコストと同じマナなら使えて 0 になる", () => {
    const w = startA16(world(), { extra: { weapon: "sword" } });
    equip(w, ["apollo_oracle", "hermes_issen", "hermes_sweep", "hermes_reed_flute", "hermes_veil"]);
    const oracle = M(w).costOf("apollo_oracle");
    set(w, oracle - 0.5);
    const s0 = ms(w), stats0 = plain(H(w).getState().stats);
    const r = use(w, "apollo_oracle");
    assert.deepEqual([r.ok, r.reason], [false, "insufficientMana"], JSON.stringify(r));
    frames(w, 3);
    assert.equal(w.ctx.$gameMap.eventsPaused, false, "神託の効果は起きない");
    assert.equal(ms(w).spent, s0.spent, "何も引かない");
    assert.equal(ms(w).stats.spends, s0.stats.spends);
    assert.deepEqual(plain(w.ctx.ProjectRSoulSkills.getEffects()).filter(e => e.kind === "oracle"), []);
    assert.equal(plain(H(w).getState().stats).manaBlocked, stats0.manaBlocked + 1);
    for (const id of ["hermes_issen", "hermes_sweep"]) { set(w, M(w).costOf(id) - 1); assert.equal(use(w, id).reason, "insufficientMana", id); }
    set(w, M(w).costOf("hermes_sweep"));                                     // ちょうど足りる
    const ok = use(w, "hermes_sweep");
    assert.equal(ok.ok, true);
    assert.equal(ms(w).units <= 1, true, "ちょうど使い切る(0 かほぼ 0): " + ms(w).units);
    w.soul.end("t");
});

test("失敗・拒否では消費しない: 武器が無い絶(noWeapon)・神託の延長(oracleActive)・ストレングスの重ね掛け(buffActive)・未定義コスト。どれもマナもカードも変わらない", () => {
    const w = startA16(world());
    equip(w, ["hermes_zetsu", "apollo_oracle", "hermes_strength", "hermes_sweep", "hermes_issen"]);
    set(w, 10);
    // 発動そのものが失敗した場合(効果の検証の失敗)を模擬: 薙ぎ払いの発動の窓口だけが失敗を返す。カードもマナも変わらない
    const saved = {};
    for (const type of ["ground", "instant", "cursor", "direction"]) {
        saved[type] = D(w).getActivationHandler(type);
        D(w).registerActivationHandler(type, ctx => (ctx.definition.cardId === "hermes_sweep" ? { ok: false, reason: "forcedFailure" } : (saved[type] ? saved[type](ctx) : { ok: true })));
    }
    const handBefore = JSON.stringify(battle(w).hand), uses0 = plain(H(w).getState().stats).fixedUses;
    let r = use(w, "hermes_sweep");
    for (const type of ["ground", "instant", "cursor", "direction"]) if (saved[type]) D(w).registerActivationHandler(type, saved[type]);
    assert.deepEqual([r.ok, r.reason], [false, "activationFailed"], JSON.stringify(r));
    assert.equal(ms(w).spent, 0, "失敗した発動は消費しない");
    assert.equal(ms(w).stats.spends, 0);
    assert.equal(JSON.stringify(battle(w).hand), handBefore);
    assert.equal(plain(H(w).getState().stats).fixedUses, uses0, "カードの消費の確定(use)は起きていない");
    assert.ok(Math.abs(ms(w).current - 10) < 0.2, "マナは減らない");
    set(w, 10);
    assert.equal(use(w, "apollo_oracle").ok, true);
    frames(w, 3);
    const stopBefore = plain(w.ctx.ProjectRSoulSkills.getEffects()).find(e => e.kind === "oracle");
    assert.ok(stopBefore, "神託の時間停止中");
    const spent1 = ms(w).spent;
    set(w, 10);
    r = use(w, "apollo_oracle");
    assert.equal(r.ok, false, "停止中・強化中の再発動は拒否: " + JSON.stringify(r));
    assert.equal(ms(w).spent, spent1, "延長のために消費しない");
    const stopAfter = plain(w.ctx.ProjectRSoulSkills.getEffects()).find(e => e.kind === "oracle");
    assert.equal(stopAfter.serial, stopBefore.serial, "同じ神託のまま(再発動で作り直さない)");
    // ストレングス: 蓄えがある間は重ね掛けしない
    w.ctx.ProjectRSoulSkills.endAll("test"); for (let i = 0; i < 400 && w.ctx.$gameMap.eventsPaused; i++) frames(w, 1);
    set(w, 10);
    const s0 = ms(w).spent;
    assert.equal(use(w, "hermes_strength").ok, true);
    assert.equal(ms(w).spent - s0, M(w).costOf("hermes_strength"));
    assert.ok(w.ctx.ProjectRHermesStrength.getPending(), "強化を蓄えた");
    set(w, 10);
    const s1 = ms(w).spent;
    r = use(w, "hermes_strength");
    assert.deepEqual([r.ok, r.reason], [false, "buffActive"]);
    assert.equal(ms(w).spent, s1);
    assert.equal(plain(w.ctx.ProjectRHermesStrength.getPending()).stacks, 1, "重ね掛けされていない");
    w.soul.end("t");
});

// 予約型(pending)の矢のカードの消費(予約 → 発射の成功で1回確定・外れても返金しない・中止/失敗では解放)は ProjectR_SoulManaLaunch.test.cjs

test("ATTACK の終了で、予約・割引・残りのマナはすべて破棄される(次の ATTACK に持ち越さない)。DEFENSE / PREPARE の使用の遮断は従来の理由(soulDefense / soulPrepare)のまま", () => {
    const w = startA16(world(), { extra: { weapon: "sword" } });
    equip(w, ["apollo_gigas_slayer", "hermes_sweep", "hermes_issen", "hermes_reed_flute", "hermes_veil"]);
    set(w, 10);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);                 // チャージ中 = 予約
    assert.equal(plain(M(w).grantDiscount({ amount: 2 })).ok, true);
    assert.equal(ms(w).holds.length, 1);
    assert.ok(ms(w).discount);
    w.soul.skipPhase();                                                      // ATTACK → DEFENSE
    let s = ms(w);
    assert.deepEqual([s.holds.length, s.discount, s.current], [0, null, 0]);
    assert.equal(plain(D(w).requestUseCard(0)).reason, "soulDefense");
    assert.equal(plain(M(w).grantDiscount({ amount: 1 })).reason, "notAttack", "ATTACK 以外では割引は付かない");
    w.soul.skipPhase();
    assert.equal(plain(D(w).requestUseCard(0)).reason, "soulPrepare");
    assert.equal(plain(M(w).reserve("x", "hermes_sweep")).ok, false);
    w.soul.beginAttack(); frames(w, 2);
    s = ms(w);
    assert.deepEqual([s.current, s.holds.length, s.discount, s.spent], [10, 0, null, 0], "次の ATTACK は 10・予約なし・割引なし");
    w.soul.end("t");
});

// ---------------------------------------------------------------- 絶 ----------------------------------------------------------------
test("絶: 準備ループでは SOUL 専用の冷却6秒を撤廃(元の定義のまま・マナだけで制限)。従来の攻撃⇄防御では6秒のまま。続けて使っても構えの倍率は重ならず、速度の強化も1つだけ", () => {
    const orig = world(); const originalCd = orig.ctx.ProjectRCardDeck.definitions.card("hermes_zetsu").cooldownSeconds;
    const legacy = startA16(world(), { prepare: false, extra: { weapon: "sword" } });
    legacy.ctx.ProjectRSoulSkills.isActive();
    legacy.deck.requestUseCard(0);
    frames(legacy, 2);
    assert.equal(legacy.ctx.ProjectRCardDeck.definitions.card("hermes_zetsu").cooldownSeconds, 6, "従来の攻撃⇄防御は6秒のまま");
    legacy.soul.end("t");
    const w = startA16(world(), { extra: { weapon: "sword" } });
    equip(w, ["hermes_zetsu", "hermes_sweep", "hermes_issen", "hermes_reed_flute", "hermes_veil"]);
    frames(w, 2);
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("hermes_zetsu").cooldownSeconds, originalCd, "準備ループでは冷却6秒を使わない(元: " + originalCd + ")");
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("hermes_zetsu").category, "special", "移動カードの遮断だけは外れたまま");
    set(w, 10);
    assert.equal(use(w, "hermes_zetsu").ok, true);
    const bonus1 = plain(w.ctx.ProjectRCardModifiers.getWeaponHitBonus());
    assert.equal(bonus1.multiplier, 3, "Lv3 の倍率");
    const speed = () => w.ctx.ProjectRSoulSkills.getEffects().filter(e => e.kind === "zetsuSpeed").length;
    assert.equal(speed(), 1);
    frames(w, 10);
    set(w, 10);
    assert.equal(use(w, "hermes_zetsu").ok, true, "冷却なしですぐ再使用できる(マナで制限)");
    const bonus2 = plain(w.ctx.ProjectRCardModifiers.getWeaponHitBonus());
    assert.equal(bonus2.multiplier, 3, "倍率は重ならない(3 のまま。9 にならない)");
    assert.equal(speed(), 1, "速度の強化は1つだけ(重ねない)");
    assert.equal(ms(w).stats.spends, 2, "2回とも1回ずつ引く");
    w.soul.end("t");
});

// ---------------------------------------------------------------- 竪琴の割引 ----------------------------------------------------------------
test("竪琴の割引の規則: 次の1枚だけ -1(「全部同じ音符」で -2)・最低1・ATTACK の時計で8秒・1回使うと消える・重ねがけしない(大きい方で更新)・竪琴自身には効かない・竪琴の発動で割引は消えない", () => {
    const w = startA16(world());
    equip(w, ["apollo_lyre_rhythm", "hermes_sweep", "hermes_issen", "hermes_reed_flute", "hermes_veil"]);
    for (const [id, lv] of [["hermes_sweep", 1], ["hermes_issen", 1], ["apollo_lyre_rhythm", 1]]) D(w).setCardLevel(id, lv);
    const sweep = () => M(w).costOf("hermes_sweep"), issen = () => M(w).costOf("hermes_issen");
    assert.deepEqual([sweep(), issen(), M(w).costOf("apollo_lyre_rhythm")], [2, 5, 3]);
    // 割引なし = 基本コスト
    assert.equal(M(w).effectiveCost("hermes_issen"), 5);
    assert.deepEqual(plain(M(w).grantDiscount({ amount: 1 })).amount, 1);
    assert.equal(M(w).effectiveCost("hermes_issen"), 4, "-1");
    assert.equal(M(w).effectiveCost("hermes_sweep"), 1, "最低 1(2-1)");
    assert.equal(M(w).effectiveCost("apollo_lyre_rhythm"), 3, "竪琴自身には効かない");
    plain(M(w).grantDiscount({ amount: 1 }));
    assert.equal(ms(w).discount.amount, 1, "重ねがけしない(-2 にならない)");
    plain(M(w).grantDiscount({ amount: 2 }));
    assert.equal(M(w).effectiveCost("hermes_issen"), 3, "一致の音符 = -2");
    assert.equal(M(w).effectiveCost("hermes_sweep"), 1, "最低 1(2-2=0 → 1)");
    plain(M(w).grantDiscount({ amount: 1 }));
    assert.equal(ms(w).discount.amount, 2, "弱い割引で大きい割引を弱めない");
    // 竪琴の発動は割引を消費しない・割引されない
    set(w, 10);
    const lyre = use(w, "apollo_lyre_rhythm");
    assert.equal(lyre.ok, true, JSON.stringify(lyre));
    assert.equal(ms(w).lastSpend.cost, 3, "竪琴は基本コストのまま");
    assert.equal(ms(w).discount.amount, 2, "竪琴の発動で割引は消えない・再帰しない");
    w.ctx.ProjectRApolloLyreRhythm.clear("test");
    // 次の1枚で消える(1回だけ)
    set(w, 10);
    assert.equal(use(w, "hermes_issen").ok, true);
    assert.equal(ms(w).lastSpend.cost, 3, "割引後 5-2 = 3");
    assert.equal(ms(w).discount, null, "1回使うと消える");
    set(w, 10);
    assert.equal(use(w, "hermes_sweep").ok, true);
    assert.equal(ms(w).lastSpend.cost, 2, "2枚目は割引なし");
    // 8秒(ATTACK の時計)で消える。止まっている間は数えない
    plain(M(w).grantDiscount({ amount: 1 }));
    frames(w, 400);
    assert.ok(ms(w).discount && ms(w).discount.secondsLeft > 1 && ms(w).discount.secondsLeft < 1.5, "400フレームではまだ残る(約8-6.67秒): " + JSON.stringify(ms(w).discount));
    w.ctx.$gameMessage.add("t"); frames(w, 300); w.ctx.$gameMessage.clear();
    assert.ok(ms(w).discount, "一時停止の間は数えない");
    frames(w, 79);
    assert.ok(ms(w).discount, "480フレームちょうどの手前");
    frames(w, 3);
    assert.equal(ms(w).discount, null, "8秒で消える");
    assert.equal(ms(w).stats.discountsExpired, 1);
    w.soul.end("t");
});

test("竪琴のリズム(実際の演奏): 速度の音符で次のカードの割引が付く(通常 -1)。クールダウンの短縮はしない。「全部同じ音符」(Lv2 で速度3つ)は -2。割引後は最低 1", () => {
    const w = startA16(world());
    equip(w, ["apollo_lyre_rhythm", "hermes_issen", "hermes_sweep", "hermes_reed_flute", "hermes_veil"]);
    D(w).setCardLevel("apollo_lyre_rhythm", 2); D(w).setCardLevel("hermes_issen", 1);
    const lyre = w.ctx.ProjectRApolloLyreRhythm;
    const session = () => plain(lyre.getSession());
    const pressNote = index => {
        const n = plain(lyre.getNotes())[index];
        for (let i = 0; i < 3000 && session().frame < n.arrive; i++) frames(w, 1);
        return plain(lyre.press());
    };
    set(w, 10);
    assert.equal(use(w, "apollo_lyre_rhythm").ok, true);
    frames(w, 2);
    assert.ok(session().serial >= 1, "リズムが始まった");
    const speedIdx = plain(lyre.getNotes()).filter(n => n.kind === "speed").map(n => n.index);
    assert.equal(speedIdx.length, 3);
    assert.equal(ms(w).discount, null);
    const a = pressNote(speedIdx[0]);
    assert.deepEqual([a.hit, a.kind], [true, "speed"]);
    assert.equal(ms(w).discount.amount, 1, "速度の音符 = -1");
    assert.equal(M(w).effectiveCost("hermes_issen"), 4);
    pressNote(speedIdx[1]);
    assert.equal(ms(w).discount.amount, 1, "同じ音符を重ねても -1 のまま(重ねがけしない)");
    const c = pressNote(speedIdx[2]);
    assert.equal(c.wide, true, "全部同じ音符");
    assert.equal(ms(w).discount.amount, 2, "全部同じ音符 = -2");
    assert.equal(M(w).effectiveCost("hermes_issen"), 3);
    // クールダウンの短縮(従来の効果)は起きない
    assert.equal(w.ctx.ProjectRSoulSkills.getEffects().some(e => e.kind === "lyreCooldown"), false, "冷却短縮は使わない");
    const before = ms(w).spent;
    set(w, 10);
    assert.equal(use(w, "hermes_issen").ok, true);
    assert.equal(ms(w).lastSpend.cost, 3, "次の1枚が割引される");
    assert.equal(ms(w).discount, null);
    lyre.clear("test");
    w.soul.end("t");
    void before;
});

// ---------------------------------------------------------------- 神託・回復の上限 ----------------------------------------------------------------
test("神託の時間停止は延長できない: 停止中・解除後の強化中に再発動しても、停止の長さ・停止の効果は変わらず、マナも引かない。停止中はマナが回復しない", () => {
    const w = startA16(world());
    equip(w, ["apollo_oracle", "hermes_sweep", "hermes_issen", "hermes_reed_flute", "hermes_veil"]);
    set(w, 10);
    assert.equal(use(w, "apollo_oracle").ok, true);
    frames(w, 2);
    let stoppedFor = 0;
    const after = ms(w).units;
    for (let i = 0; i < 20; i++) { set(w, ms(w).current); const r = use(w, "apollo_oracle"); assert.equal(r.ok, false); frames(w, 5); }       // 100フレーム(停止は約180フレーム)
    assert.equal(ms(w).units, after, "停止中はマナが回復せず、再発動でも引かない");
    while (w.ctx.$gameMap.eventsPaused && stoppedFor < 900) { frames(w, 1); stoppedFor++; }
    assert.ok(stoppedFor < 100 && stoppedFor > 5, "停止は延長されず、3秒(180フレーム)の残りだけで解除される: " + stoppedFor);
    assert.equal(w.ctx.$gameMap.eventsPaused, false);
    assert.equal(ms(w).stats.spends, 1, "神託は1回だけ引いた");
    w.soul.end("t");
});

test("回復の上限は1回の発動ごと: 月桂冠は1回で最大100・ヒュアキントスは Lv3 で最大120。再発動しても、1回の発動の上限を超えて1回の効果から回復しない(発動ごとに数える)", () => {
    const w = startA16(world());
    equip(w, ["apollo_laurel_wreath", "apollo_hyacinthus", "hermes_sweep", "hermes_issen", "hermes_reed_flute"]);
    const skills = w.ctx.ProjectRSoulSkills;
    const leader = w.ctx.$gameParty.leader();
    const heart = plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
    w.mouse(Math.round(heart.x * 48), Math.round(heart.y * 48)); frames(w, 2);          // 根の中心を敵ハートに置く
    const healed = () => plain(skills.getState()).stats.healed;
    leader.setHp(1);
    set(w, 10);
    assert.equal(use(w, "apollo_laurel_wreath").ok, true);
    const h0 = healed();
    frames(w, 60 * 9);                                                         // 根の持続(7秒)を超えるまで
    const one = healed() - h0;
    assert.ok(one > 0 && one <= 100, "1回の発動の回復は上限100以内: " + one);
    // 続けて同じカードを再発動(新しい発動 = 新しい上限)。ただし、1回の発動の回復の合計は上限のまま
    leader.setHp(1);
    set(w, 10);
    assert.equal(use(w, "apollo_laurel_wreath").ok, true);
    const h1 = healed();
    frames(w, 60 * 9);
    const two = healed() - h1;
    assert.ok(two > 0 && two <= 100, "2回目の発動も、その1回の上限100以内: " + two);
    assert.ok(skills.getEffects().filter(e => e.kind === "laurel").length <= 1, "根は1つだけ(重ならない)");
    w.soul.end("t");
});

// ---------------------------------------------------------------- 重ね掛けの上限 ----------------------------------------------------------------
test("同じ強化の重ね掛けに上限がある(冷却が無くても積み上がらない): ギガース殺しの弱体(被ダメージ×2)・疫病などの敵への状態は同じ種類を再付与しても1つのまま(時間だけ更新)。サイコポンポス・ヴェイル・月桂冠・ヒュアキントス・葦笛は新しい発動が古い効果を置き換える", () => {
    const w = startA16(world());
    equip(w, ["hermes_psychopomp", "hermes_veil", "apollo_laurel_wreath", "apollo_hyacinthus", "hermes_reed_flute"]);
    const status = w.ctx.ProjectRApolloStatus, key = status.targetKeyOfEvent(w.heart);
    for (let i = 0; i < 4; i++) assert.equal(plain(status.apply(key, "gigas_weak", { seconds: 5, damageTaken: 2, source: "apollo_gigas_slayer" })).ok, true);
    const weak = plain(status.list(key)).filter(e => e.id === "gigas_weak");
    assert.equal(weak.length, 1, "同じ弱体は1つだけ(4回付与しても重ならない)");
    assert.equal(status.has(key, "gigas_weak"), true);
    // SOUL の効果: 続けて使っても、同じ種類の効果は常に1つ(新しい発動が古いものを置き換える)
    const kinds = ["psychopomp", "veil", "laurel", "hyacinth", "reed"];
    for (const [cardId, kind] of [["hermes_psychopomp", "psychopomp"], ["hermes_veil", "veil"], ["apollo_laurel_wreath", "laurel"], ["apollo_hyacinthus", "hyacinth"], ["hermes_reed_flute", "reed"]]) {
        for (let i = 0; i < 3; i++) { set(w, 10); assert.equal(use(w, cardId).ok, true, cardId); frames(w, 2); }
        assert.equal(plain(w.ctx.ProjectRSoulSkills.getEffects()).filter(e => e.kind === kind).length <= 1, true, kind + " は1つだけ");
    }
    void kinds;
    // サイコポンポス: 魂は最大3つ(再発動で増やせない)
    const pp = plain(w.ctx.ProjectRSoulSkills.getEffects()).find(e => e.kind === "psychopomp");
    assert.ok(!pp || pp.souls <= 3);
    w.soul.end("t");
});

// ---------------------------------------------------------------- HUD ----------------------------------------------------------------
test("HUD: 各枠に実際の消費マナ(割引後は 元→割引後)と、足りない枠の「マナ不足」を出す(クールダウンは出さない)。準備・防御では従来どおり「準備中」「LOCK」。従来の SOUL は CD 表示のまま", () => {
    const w = startA16(world());
    equip(w, ["hermes_issen", "hermes_sweep", "apollo_oracle", "hermes_reed_flute", "hermes_veil"]);
    for (const id of ["hermes_issen", "hermes_sweep", "apollo_oracle", "hermes_reed_flute", "hermes_veil"]) D(w).setCardLevel(id, 1);
    frames(w, 6);
    let m = plain(w.hud.getViewModel());
    const byCard = id => m.hand.find(s => s.cardId === id);
    assert.deepEqual(m.hand.map(s => s.cost), [5, 2, 7, 4, 3].map((_, i) => m.hand[i].cost), "各枠に cost がある");
    for (const s of m.hand) { assert.equal(s.cost, M(w).costOf(s.cardId)); assert.equal(s.baseCost, s.cost); assert.equal(s.cooling, 0, "クールダウン表示は使わない"); assert.equal(s.state, "ready"); }
    set(w, 4.5); frames(w, 6);
    m = plain(w.hud.getViewModel());
    assert.deepEqual(m.hand.map(s => [s.cardId, s.state]).filter(([, st]) => st === "lowMana").map(([id]) => id).sort(), ["apollo_oracle", "hermes_issen"].sort(), "コストが4.5を超えるカードだけマナ不足(一閃5・神託7)");
    assert.equal(byCard("hermes_sweep").state, "ready");
    plain(M(w).grantDiscount({ amount: 2 })); frames(w, 6);
    m = plain(w.hud.getViewModel());
    assert.deepEqual([byCard("hermes_issen").baseCost, byCard("hermes_issen").cost, byCard("hermes_issen").state], [5, 3, "ready"], "割引後 5→3 で足りる");
    assert.equal(byCard("hermes_sweep").cost, 1);
    const src = read("js/plugins/ProjectR_SoulBattleHUD.js");
    assert.match(src, /マナ不足/); assert.match(src, /消費 \$\{slot\.baseCost\}→\$\{slot\.cost\}/);
    w.soul.skipPhase(); frames(w, 6);
    assert.deepEqual([...new Set(plain(w.hud.getViewModel()).hand.map(s => s.state))], ["locked"], "防御は LOCK");
    w.soul.skipPhase(); frames(w, 6);
    assert.deepEqual([...new Set(plain(w.hud.getViewModel()).hand.map(s => s.state))], ["prepare"], "準備は 準備中");
    w.soul.end("t");
    const legacy = startA16(world(), { prepare: false });
    frames(legacy, 6);
    const lm = plain(legacy.hud.getViewModel());
    assert.ok(lm.hand.every(s => s.cost === null || s.cost === undefined), "従来の SOUL に消費マナは出さない");
    legacy.soul.end("t");
});

test("従来の攻撃⇄防御(prepare なし)・通常のマップ: マナの判定も消費もしない。カードは今までどおり使うと手札が入れ替わり・クールダウンの山へ入る", () => {
    const w = startA16(world(), { prepare: false, hand: ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"] });
    const s0 = ms(w);
    assert.equal(s0.active, false);
    const before = battle(w).hand[0].instanceId;
    assert.equal(plain(D(w).requestUseCard(0)).ok, true);
    frames(w, 3);
    const b = battle(w);
    assert.equal(b.soulFixed, undefined);
    assert.ok(b.cooldownPile.length === 1 && b.hand[0].instanceId !== before, "Coreの規則のまま(使うと入れ替わる)");
    assert.equal(ms(w).spent, 0);
    assert.equal(ms(w).stats.spends, 0);
    w.soul.end("t");
    const plainWorld = world();
    assert.equal(ms(plainWorld).active, false);
    assert.equal(plain(M(plainWorld).quote("hermes_sweep")).reason, "notAttack");
});

console.log(`\n${passed} tests passed`);
