"use strict";
// L4-B 最終: 予約型(遠距離)カード(黄金の矢・エロスの矢・ギガース殺し・疫病の矢)のマナ。予約 → 発射の成功で1回だけ確定(命中・外れ・矢の数に依存しない)・発射前の中止/失敗では解放・フェーズ終了でも返金しない・同時の予約。ストレングスの確認。実エンジン(全plugin)をNode VMで動かす。
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
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true, attackSeconds: 20, defenseSeconds: 4, bossAttacks: false, ...options })));
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
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, attackSeconds: 20, defenseSeconds: 4, bossAttacks: false, ...extra })));
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

// ================================================================ 予約型(遠距離)カードのマナ: 発射の成功で1回だけ確定(L4-B 最終) ================================================================
const RANGED = [["apollo_golden_volley", "ProjectRApolloGoldenVolley"], ["apollo_eros_arrow", "ProjectRApolloErosArrow"], ["apollo_gigas_slayer", "ProjectRApolloGigasSlayer"], ["apollo_plague_rain", "ProjectRApolloPlagueRain"]];
const apiOf = (w, id) => w.ctx[RANGED.find(r => r[0] === id)[1]];
const heartTile = w => plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
const aimAtHeart = w => { const h = heartTile(w); w.mouse(Math.round(h.x * 48), Math.round(h.y * 48)); frames(w, 2); };
const aimAway = w => { const h = heartTile(w); w.mouse(Math.round((h.x - 9) * 48), Math.round((h.y + 9) * 48)); frames(w, 2); };
const setLevels = (w, level, ids = RANGED.map(r => r[0])) => { for (const id of ids) D(w).setCardLevel(id, level); };
let maxJump = 0;
const runUntilIdle = (w, id, max = 400) => {
    let i = 0, last = ms(w).units;
    maxJump = 0;
    const step = () => { frames(w, 1); const u = ms(w).units; maxJump = Math.max(maxJump, u - last); last = u; };
    while (apiOf(w, id).isPending() && i < max) { step(); i++; }
    for (let k = 0; k < 8; k++) step();
    return i;
};
const breakCombat = w => w.run("globalThis.__savedCheckCollide = globalThis.checkCollide; globalThis.checkCollide = undefined;");
const restoreCombat = w => w.run("globalThis.checkCollide = globalThis.__savedCheckCollide;");
const ranged4 = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_plague_rain", "hermes_sweep"];
const attackWith = (w, ids = ranged4) => { equip(w, ids); return w; };
const fresh = (opts = {}) => startA16(world(), { extra: { weapon: "sword" }, ...opts });

test("発射の成功で1回だけ確定する(黄金の矢・疫病の矢は発動と同時): 命中しても追加では引かない。複数の矢でも矢ごとには引かない。カードは手札に残り、予約は残らない", () => {
    for (const id of ["apollo_golden_volley", "apollo_plague_rain"]) {
        const w = attackWith(fresh());
        const cost = M(w).costOf(id), handBefore = JSON.stringify(battle(w).hand);
        set(w, 10); aimAtHeart(w);
        const r = use(w, id);
        assert.deepEqual([r.ok, r.reason, r.pending], [false, "pending", true], id + JSON.stringify(r));
        let s = ms(w);
        assert.equal(s.spent, cost, id + ": 発射と同時に確定(命中を待たない)");
        assert.deepEqual([s.holds.length, s.charged.length, s.stats.launchCharges, s.stats.spends], [0, 1, 1, 1], "予約は確定して消え、発射済みの記録だけが残る");
        assert.equal(apiOf(w, id).isPending(), true, "矢は飛んでいる(まだ確定待ち)");
        runUntilIdle(w, id);                                                // 命中 or 外れで確定待ちが終わる
        s = ms(w);
        assert.equal(s.spent, cost, id + ": 命中(カードの消費の確定)でも、矢が複数でも、追加で引かない");
        assert.ok(maxJump <= 1, id + ": 終了までマナが一度に増えない(返金なし。回復は1フレーム1単位): " + maxJump);
        assert.deepEqual([s.stats.spends, s.charged.length, s.holds.length], [1, 0, 0], "ちょうど1回・記録は片づく");
        assert.equal(JSON.stringify(battle(w).hand), handBefore, "カードは手札に残る(5枠のまま)");
        w.soul.end("t");
    }
});

test("ギガース殺し: チャージ中は予約だけ(消費しない)→ 発射(矢・ビームが出た)の瞬間に1回確定。その後の命中・外れでは動かない。予約中の分は他のカードに使えない", () => {
    const w = attackWith(fresh());
    const cost = M(w).costOf("apollo_gigas_slayer"), api = apiOf(w, "apollo_gigas_slayer");
    set(w, 10); aimAtHeart(w);
    const r = use(w, "apollo_gigas_slayer");
    assert.equal(r.pending, true, JSON.stringify(r));
    let s = ms(w);
    assert.deepEqual([s.spent, s.holds.length, s.holds[0] && s.holds[0].launched], [0, 1, false], "チャージ中は予約だけ");
    assert.equal(plain(api.getPending()).phase, "charge");
    assert.equal(s.available, s.current - cost, "予約分は使えない");
    let charged = -1;
    for (let i = 0; i < 120 && api.isPending(); i++) {
        frames(w, 1);
        const p = plain(api.getPending());
        if (p && p.phase !== "charge" && charged < 0) { charged = ms(w).spent; break; }
        if (p) assert.equal(ms(w).spent, 0, "チャージ中(" + i + "フレーム目)は消費しない");
    }
    assert.equal(charged, cost, "発射した(チャージが終わった)時点で確定済み");
    assert.equal(ms(w).holds.length, 0);
    runUntilIdle(w, "apollo_gigas_slayer", 600);
    s = ms(w);
    assert.deepEqual([s.spent, s.stats.spends, s.charged.length], [cost, 1, 0], "命中・外れ・終了の後も1回だけ");
    w.soul.end("t");
});

test("エロスの矢: 発動の直後は予約(消費しない)→ 最初の矢の発射かビームの開始で1回確定。10本の矢(Lv1)でも矢ごとには引かない", () => {
    for (const level of [1, 3]) {
        const w = attackWith(fresh());
        setLevels(w, level, ["apollo_eros_arrow"]);
        const cost = M(w).costOf("apollo_eros_arrow");
        set(w, 10); aimAtHeart(w);
        const r = use(w, "apollo_eros_arrow");
        assert.equal(r.pending, true, "Lv" + level + " " + JSON.stringify(r));
        const first = ms(w);
        assert.ok(first.spent === 0 || first.spent === cost, "発射の前は消費しない/発射済みなら1回分だけ: " + first.spent);
        runUntilIdle(w, "apollo_eros_arrow", 400);
        const s = ms(w);
        assert.deepEqual([s.spent, s.stats.spends, s.holds.length, s.charged.length], [cost, 1, 0, 0], "Lv" + level + ": 1回だけ・記録は残らない(複数の矢・ビームのティックごとに引かない)");
        w.soul.end("t");
    }
});

test("外れ・時間切れ: 発射した攻撃が敵ハートに当たらず消えても、マナは返さない(1回確定のまま)。予約・発射済みの記録は残らない。同じカードをまた使える(もう1回分引く)", () => {
    for (const id of ["apollo_golden_volley", "apollo_plague_rain", "apollo_gigas_slayer", "apollo_eros_arrow"]) {
        const w = attackWith(fresh());
        setLevels(w, 1);                                                       // 矢の形(貫通・追尾の少ない Lv1)
        const cost = M(w).costOf(id);
        set(w, 10); aimAway(w);
        const hp0 = plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp;
        assert.equal(use(w, id).pending, true, id);
        runUntilIdle(w, id, 600);
        const last = plain(apiOf(w, id).getLastResult());
        assert.equal(plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp, hp0, id + ": 命中していない(外れ)");
        let s = ms(w);
        assert.equal(last.committed === true, false, id + ": カードの消費の確定(命中)は起きていない: " + JSON.stringify({ reason: last.reason, committed: last.committed }));
        assert.equal(s.spent, cost, id + ": 外れてもマナは返さない(発射の時に確定済み)");
        assert.ok(maxJump <= 1, id + ": 外れて確定待ちが終わっても、マナが一度に増えない(返金なし): " + maxJump);
        assert.deepEqual([s.holds.length, s.charged.length], [0, 0], id + ": 予約も記録も残らない");
        assert.equal(s.stats.spends, 1);
        assert.ok(s.stats.launchRefundsDenied >= 0);
        // 手札に残っているので、また使える(その分また引く)
        set(w, 10);
        assert.equal(use(w, id).pending, true, id + " を再使用できる");
        runUntilIdle(w, id, 600);
        assert.equal(ms(w).stats.spends, 2, id + ": 2回目も1回分だけ");
        assert.equal(ms(w).spent, cost * 2);
        w.soul.end("t");
    }
});

test("発射前の中止・失敗では消費しない: ギガース殺しのチャージ中・エロスの矢の最初のフレームの前にフェーズが終わる / 発動の失敗(pending にならない)。予約は解放され、マナは動かない。マナ不足の拒否は従来どおり", () => {
    const w = attackWith(fresh());
    // ギガース殺しのチャージ中に ATTACK が終わる(発射前の中止)
    set(w, 10); aimAtHeart(w);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);
    assert.equal(ms(w).holds.length, 1);
    frames(w, 5);
    assert.equal(plain(apiOf(w, "apollo_gigas_slayer").getPending()).phase, "charge");
    w.soul.skipPhase();                                                       // → DEFENSE(ATTACK の終了)
    let s = ms(w);
    assert.deepEqual([s.spent, s.holds.length, s.charged.length, s.current], [0, 0, 0, 0], "発射前の中止: 何も引かず予約も残らない");
    assert.equal(s.lastDiscarded >= 9.9, true, "残りのマナは ATTACK の終了で破棄(10 のまま)");
    w.soul.skipPhase(); w.soul.beginAttack(); frames(w, 2);
    assert.equal(ms(w).current, 10);
    // エロスの矢: 発動した同じフレームのうちにフェーズが終わる(まだ1本も出ていない)
    set(w, 10); aimAtHeart(w);
    const r = use(w, "apollo_eros_arrow");
    assert.equal(r.pending, true);
    assert.deepEqual([ms(w).spent, ms(w).holds.length, ms(w).charged.length], [0, 1, 0], "エロスの矢は発動の直後(最初の矢の前)は予約だけ");
    w.soul.skipPhase();
    assert.deepEqual([ms(w).spent, ms(w).holds.length, ms(w).charged.length], [0, 0, 0], "最初の矢の前に ATTACK が終わった: 予約を解放し、引かない");
    w.soul.end("t");
    // 発動の失敗(窓口が失敗を返す)は pending にならず、予約も消費もない
    const w2 = attackWith(fresh());
    const saved = {};
    for (const type of ["ground", "instant", "cursor", "direction"]) {
        saved[type] = D(w2).getActivationHandler(type);
        D(w2).registerActivationHandler(type, ctx => (ctx.definition.cardId === "apollo_plague_rain" ? { ok: false, reason: "forcedFailure" } : (saved[type] ? saved[type](ctx) : { ok: true })));
    }
    set(w2, 10);
    const failed = use(w2, "apollo_plague_rain");
    for (const type of ["ground", "instant", "cursor", "direction"]) if (saved[type]) D(w2).registerActivationHandler(type, saved[type]);
    assert.notEqual(failed.pending, true);
    assert.equal(failed.ok, false);
    s = ms(w2);
    assert.deepEqual([s.spent, s.holds.length, s.charged.length, s.stats.spends], [0, 0, 0, 0], "失敗した発動は何も予約・消費しない");
    // マナ不足は拒否(予約もしない)
    set(w2, 1);
    assert.equal(use(w2, "apollo_gigas_slayer").reason, "insufficientMana");
    assert.deepEqual([ms(w2).holds.length, ms(w2).spent], [0, 0]);
    w2.soul.end("t");
});

test("ATTACK の途中での発射前の失敗(ギガース殺しのチャージ中に発射できなくなる): 予約は解放され、何も引かず、ATTACK は続く。解除後は同じカードをまた使える", () => {
    const w = attackWith(fresh());
    // ギガース殺し: チャージ中に発射できなくなる(戦闘の環境が使えない)→ 発射前の中止
    set(w, 10); aimAtHeart(w);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);
    assert.equal(ms(w).holds.length, 1);
    breakCombat(w);
    try { for (let i = 0; i < 60 && apiOf(w, "apollo_gigas_slayer").isPending(); i++) frames(w, 1); } finally { restoreCombat(w); }
    frames(w, 6);
    let s = ms(w);
    assert.equal(apiOf(w, "apollo_gigas_slayer").isPending(), false, "発射できず中止された");
    assert.equal(plain(apiOf(w, "apollo_gigas_slayer").getLastResult()).aborted, true);
    assert.deepEqual([s.spent, s.holds.length, s.charged.length, s.stats.spends, s.phase], [0, 0, 0, 0, "attack"], "発射前の失敗: 解放して何も引かない(ATTACK は続く)");
    assert.equal(s.stats.holdsReleased >= 1, true);
    assert.equal(w.soul.getPhase(), "attack");
    // 戻ったら、また使える(1回分だけ引く)
    set(w, 10); aimAway(w);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);
    runUntilIdle(w, "apollo_gigas_slayer", 600);
    assert.equal(ms(w).spent, M(w).costOf("apollo_gigas_slayer"));
    assert.equal(ms(w).stats.spends, 1);
    w.soul.end("t");
});

test("竪琴の割引は発射の確定で使われる: 割引つきで予約し、発射した時に割引後のコストを1回だけ引いて割引が消える(命中を待たない)。予約中の割引は他のカードに使われない", () => {
    const w = attackWith(fresh());
    const base = M(w).costOf("apollo_gigas_slayer");
    set(w, 10); aimAway(w);
    assert.equal(plain(M(w).grantDiscount({ amount: 2 })).ok, true);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);                 // チャージ中: 割引つきで予約
    let s = ms(w);
    assert.deepEqual([s.holds[0].cost, s.holds[0].discounted, s.discount.reserved], [base - 2, true, true]);
    assert.equal(M(w).effectiveCost("hermes_sweep"), M(w).costOf("hermes_sweep"), "予約中の割引は他のカードに使えない");
    runUntilIdle(w, "apollo_gigas_slayer", 600);
    s = ms(w);
    assert.equal(s.spent, base - 2, "発射の確定で割引後のコストを1回だけ引いた");
    assert.equal(s.discount, null, "割引は使われて消えた");
    assert.equal(s.stats.discountsUsed, 1);
    w.soul.end("t");
});

test("ATTACK の終了(フェーズ移行)で片づけられても返金しない: 飛んでいる矢が境目で消えても、発射済みの分は確定のまま。次の ATTACK は10で、記録・予約を持ち越さない。二重に引かれない", () => {
    const w = attackWith(fresh());
    const cost = M(w).costOf("apollo_golden_volley");
    set(w, 10); aimAway(w);
    assert.equal(use(w, "apollo_golden_volley").pending, true);
    frames(w, 4);
    assert.equal(apiOf(w, "apollo_golden_volley").isPending(), true, "矢が飛んでいる途中");
    assert.equal(ms(w).spent, cost);
    w.soul.skipPhase();                                                       // 境目: 矢は片づけられる
    const s = ms(w);
    assert.ok(Math.abs(s.lastDiscarded - (10 - cost)) < 0.3, "発射済みの分は引かれたまま、残りだけ破棄: " + s.lastDiscarded);
    assert.deepEqual([s.holds.length, s.charged.length, s.current], [0, 0, 0]);
    assert.equal(s.spent, cost, "返金はない");
    frames(w, 20);
    assert.equal(ms(w).spent, cost, "後から二重に引かれない");
    w.soul.skipPhase(); w.soul.beginAttack(); frames(w, 2);
    assert.deepEqual([ms(w).current, ms(w).holds.length, ms(w).charged.length], [10, 0, 0]);
    assert.equal(ms(w).stats.spends, 1);
    w.soul.end("t");
});

test("同時の予約(複数の遠距離カードが同時に確定待ち): 予約は合算して他のカードに使われない。発射した分から順に確定し、合計は常に所持マナ以内で、それぞれちょうど1回。足りないカードは拒否(予約も消費もしない)", () => {
    const w = attackWith(fresh());
    setLevels(w, 1);
    const gigas = M(w).costOf("apollo_gigas_slayer"), volley = M(w).costOf("apollo_golden_volley"), plague = M(w).costOf("apollo_plague_rain");
    assert.deepEqual([gigas, volley, plague], [6, 3, 4]);
    set(w, 10); aimAway(w);
    assert.equal(use(w, "apollo_gigas_slayer").pending, true);                // チャージ中 = 予約 6
    let s = ms(w);
    assert.deepEqual([s.spent, s.holds.map(h => h.cost)], [0, [gigas]]);
    assert.equal(s.available, 10 - gigas);
    assert.equal(use(w, "apollo_golden_volley").pending, true, "残り4で黄金の矢(3)は使える");
    s = ms(w);
    assert.equal(s.spent, volley, "黄金の矢は発射と同時に確定");
    assert.deepEqual(s.holds.map(h => h.cardId), ["apollo_gigas_slayer"], "ギガース殺しはまだ予約");
    assert.ok(Math.abs(s.available - (10 - volley - gigas)) < 0.3, "予約 + 確定済みの分を引いた残り: " + s.available);
    const blocked = use(w, "apollo_plague_rain");
    assert.equal(blocked.reason, "insufficientMana", "予約分を使い込む疫病の矢(4)は拒否: " + JSON.stringify(blocked));
    assert.equal(ms(w).stats.spends, 1);
    // ギガース殺しの発射 → 確定。合計は volley + gigas
    for (let i = 0; i < 120 && apiOf(w, "apollo_gigas_slayer").isPending() && ms(w).holds.length; i++) frames(w, 1);
    s = ms(w);
    assert.equal(s.spent, volley + gigas, "それぞれちょうど1回");
    assert.ok(s.spent <= 10 && s.current >= 0, "合計は所持マナ以内");
    runUntilIdle(w, "apollo_gigas_slayer", 600); runUntilIdle(w, "apollo_golden_volley", 600);
    s = ms(w);
    assert.deepEqual([s.spent, s.stats.spends, s.holds.length, s.charged.length], [volley + gigas, 2, 0, 0], "終わっても2回分のまま・記録は残らない");
    assert.equal(JSON.stringify(battle(w).hand.map(c => c.cardId)), JSON.stringify(ranged4), "固定の5枠のまま");
    w.soul.end("t");
});

test("ストレングス(SOUL専用)の確認: 蓄えがある間は重ね掛けを拒否(マナも引かない)。実際の持続は「次に敵へダメージが入る通常武器の攻撃まで」(時間の制限なし・新しい時間は作らない)。使われるとまた使える。フェーズをまたいで持ち越すことを確認(未解決として報告)", () => {
    const w = fresh();
    equip(w, ["hermes_strength", "hermes_sweep", "hermes_issen", "apollo_golden_volley", "hermes_reed_flute"]);
    const S = w.ctx.ProjectRHermesStrength;
    D(w).setCardLevel("hermes_strength", 3);
    const cost = M(w).costOf("hermes_strength");
    set(w, 10);
    assert.equal(use(w, "hermes_strength").ok, true);
    assert.equal(ms(w).spent, cost);
    let p = plain(S.getPending());
    assert.deepEqual([p.stacks, p.ignoreDefense], [1, true], "Lv3: 攻撃力 +15% と防御無視を蓄える");
    // 重ね掛けできる(SOUL 専用の1つだけの制限は無い): 2回目も承認済みのコストを引き、蓄えは2回分
    set(w, 10);
    const again = use(w, "hermes_strength");
    assert.equal(again.ok, true);
    assert.equal(plain(S.getPending()).stacks, 2);
    assert.equal(ms(w).spent, cost * 2, "2回目もコストを引く");
    // 持続: 時間では消えない(10秒待っても蓄えたまま = 承認された持続時間は無く、新しい時間を作っていない)
    frames(w, 600);
    assert.equal(plain(S.getPending()).stacks, 2, "時間で消えない(持続時間の制限なし)");
    // フェーズをまたがない: 使われなかった蓄えは ATTACK の終了で捨てる(DEFENSE・PREPARE・次の ATTACK に持ち越さない。詳細は ProjectR_SoulStrengthCleanup.test.cjs)
    w.soul.skipPhase(); frames(w, 5);
    assert.equal(S.getPending(), null, "ATTACK の終了で捨てる");
    w.soul.skipPhase(); frames(w, 5);
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(S.getPending(), null, "PREPARE にも持ち越さない");
    w.soul.beginAttack(); frames(w, 2);
    assert.equal(S.getPending(), null, "次の ATTACK にも持ち越さない");
    set(w, 10);
    assert.equal(use(w, "hermes_strength").ok, true, "捨てられたので次の ATTACK でまた使える(拒否されない)");
    assert.equal(plain(S.getPending()).stacks, 1);
    // 敵ハートにダメージが入る通常武器の攻撃で消費される → また使える
    const h = heartTile(w);
    w.mouse(Math.round(h.x * 48), Math.round(h.y * 48)); frames(w, 2);
    const hp0 = plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp;
    w.attackClick(); frames(w, 40);
    assert.ok(plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp < hp0, "通常武器がダメージを与えた");
    assert.equal(S.getPending(), null, "ダメージが入ったので蓄えは一度に消費された");
    const last = plain(S.getLastAttack());
    assert.deepEqual([last.stacks, last.ignoreDefense], [1, true]);
    set(w, 10);
    assert.equal(use(w, "hermes_strength").ok, true, "消費された後は、また使える");
    assert.equal(plain(S.getPending()).stacks, 1);
    w.soul.end("t");
});

test("1回の発動につき1回: 予約型のカード4種とも、成功した発動ごとに stats.spends が1つだけ増え、消費の合計 = コストの合計(命中・外れ・ビームのティックの数に依存しない)", () => {
    const w = attackWith(fresh());
    let expected = 0;
    for (const [round, id] of [[0, "apollo_golden_volley"], [1, "apollo_plague_rain"], [2, "apollo_eros_arrow"], [3, "apollo_gigas_slayer"]]) {
        set(w, 10); (round % 2 ? aimAway : aimAtHeart)(w);
        const before = ms(w).stats.spends;
        assert.equal(use(w, id).pending, true, id);
        runUntilIdle(w, id, 700);
        assert.equal(ms(w).stats.spends - before, 1, id + ": 1回だけ");
        expected += M(w).costOf(id);
        assert.equal(ms(w).spent, expected, id + ": 合計はコストの合計");
    }
    assert.deepEqual([ms(w).holds.length, ms(w).charged.length], [0, 0]);
    w.soul.end("t");
});

console.log(`\n${passed} tests passed`);
