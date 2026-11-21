"use strict";
// Stage 1D-2C: カード戦闘の時計(deck.updateCooldown)は、フィールド戦闘(ProjectR_FieldCombat)中も「1フレームにちょうど1回(1/60秒)」だけ進む。
// 原因: ProjectR_CardBattleInput と FieldCombat の両方が、毎フレーム deck.updateCooldown(1/60) を呼んでいた(2倍速)。FieldCombat 側の呼び出しを外した。
// 実エンジン(実Map004 + 全plugin)。時計の呼び出しは、deck.updateCooldown の外側に計測の包みを足して数える(他のpluginの包みより外側 = 全呼び出しを見る)。
// 「実際に進んだ」回数は BattleDeckSession.prototype.updateCooldown(SOUL の準備中に止める門より内側)で数える。MZ本体・実機の見た目は Node では扱わない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, ENEMIES, HP } = fx;
const a7 = require("./ProjectR_ApolloA7Fixture.cjs");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const ALL = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength", "apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const CARDS = ALL.filter(id => id !== "hermes_sweep");
const SLEEP = 32;
const DT = 1 / 60;
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const asleep = (w, id) => w.ctx.hasState(id, SLEEP) === true;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);

// 計測: deck.updateCooldown(外側 = 全呼び出し)と BattleDeckSession.prototype.updateCooldown(実際に進んだ分)。呼び出し元の分類つき。
function meter(w) {
    const d = D(w), m = { calls: 0, seconds: 0, effective: 0, effectiveSeconds: 0, callers: {} };
    const origDeck = d.updateCooldown;
    d.updateCooldown = function(s) {
        m.calls++; m.seconds += Number(s);
        const st = new Error().stack.split("\n").slice(2, 6).join("|");
        const who = /ProjectR_FieldCombat/.test(st) ? "FieldCombat" : /ProjectR_CardBattleInput/.test(st) ? "CardBattleInput" : "other";
        m.callers[who] = (m.callers[who] || 0) + 1;
        return origDeck.apply(this, arguments);
    };
    const proto = d.BattleDeckSession.prototype, origSession = proto.updateCooldown;
    proto.updateCooldown = function(s) { m.effective++; m.effectiveSeconds += Number(s); return origSession.apply(this, arguments); };
    m.reset = () => { m.calls = 0; m.seconds = 0; m.effective = 0; m.effectiveSeconds = 0; m.callers = {}; };
    return m;
}

// ---------------------------------------------------------------- フィールド戦闘の世界(葦笛 C・一閃 E・薙ぎ払い LMB) ----------------------------------------------------------------
function fieldWorld({ enemies = {} } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    const d = D(w);
    for (const ring of ["hermes", "apollo"]) assert.equal(d.assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(d.setCardOwned(id, true).ok, true, id); assert.equal(d.setCardLevel(id, 1).ok, true, id); }
    for (const ring of ["hermes", "apollo"]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
    assert.equal(RL(w).setSkill("c", "hermes_reed_flute").ok, true); assert.equal(RL(w).setSkill("e", "hermes_issen").ok, true); assert.equal(RL(w).setSkill("lmb", "hermes_sweep").ok, true);
    attachHpBars(w, ENEMIES, HP);
    w.run("Math.random = () => 0.999;");
    w.meter = meter(w);                                                                   // 開始前から数える(開始のフレームの重複・欠落も見る)
    return w;
}
function beginField(w, enemies = {}) {
    const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2);
    FC(w).setPerception({ enabled: false });
    parkOthers(w, Object.keys(enemies).map(Number));
    for (const [id, [r, deg]] of Object.entries(enemies)) placePolar(w, Number(id), r, deg);
    aimDegree(w, 90, 4);
    w.meter.reset();
    return w;
}

test("【1】フィールド戦闘中は、時計がちょうど1フレームに1回(1/60秒)。呼び出し元は CardBattleInput だけで、FieldCombat は呼ばない", () => {
    const w = fieldWorld(); beginField(w);
    const m = w.meter;
    for (let i = 1; i <= 120; i++) { w.frames(1); assert.equal(m.calls, i, `${i}フレーム後の呼び出し回数`); }
    assert.equal(m.calls, 120); near(m.seconds, 2, 1e-9, "120フレーム = 2秒");
    assert.deepEqual(m.callers, { CardBattleInput: 120 }, "呼び出し元は CardBattleInput だけ(FieldCombat が二重に進めない)");
    assert.equal(m.effective, 120, "セッション側の時計も1フレーム1回"); near(m.effectiveSeconds, 2, 1e-9);
    // ソースの確認: FieldCombat のコード(コメント以外)に deck.updateCooldown の呼び出しが無い
    const src = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", "ProjectR_FieldCombat.js"), "utf8");
    const code = src.split("\n").filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line)).map(line => line.replace(/\/\/.*$/, "")).join("\n");
    assert.equal(/updateCooldown\s*\(/.test(code), false, "FieldCombat は時計を進めない(進めるのは CardBattleInput だけ)");
});

test("【2】葦笛の睡眠は、60FPSで約4秒(240フレーム)続く(以前は約2秒だった)。睡眠の時間の設定(4秒)は変えていない", () => {
    const w = fieldWorld(); beginField(w, { 4: [5, 90] });
    assert.equal(w.ctx.ProjectRHermesReedFlute.sleepSeconds(), 4, "設計の睡眠時間は 4秒のまま");
    const r = plain(FC(w).useAbility("card2")); assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(asleep(w, 4), true, "眠った");
    let n = 0; while (asleep(w, 4) && n < 600) { w.frames(1); n++; }
    assert.ok(n >= 238 && n <= 242, `睡眠は約240フレーム(4秒)。実際: ${n}`);
    near(n / 60, 4, 0.04, "実時間の4秒");
    assert.deepEqual(plain(w.meter.callers), { CardBattleInput: w.meter.calls }, "睡眠中も時計は CardBattleInput 1経路");
    near(w.meter.seconds, n / 60, 0.02, "時計の秒数 = 経過フレーム/60");
});

test("【3】一閃の分割ダメージは、設計どおり3秒かけて3回(60・120・180フレーム目 = 1秒・2秒・3秒)。直接ダメージ200 + 分割合計50", () => {
    const w = fieldWorld(); beginField(w, { 4: [5, 90] });
    const r = plain(FC(w).useAbility("special")); assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(lost(w, 4), 200, "直接ダメージ(防御無視200)はその場で入る");
    const hits = []; let prev = lost(w, 4);
    for (let f = 1; f <= 240; f++) { w.frames(1); const l = lost(w, 4); if (l !== prev) { hits.push({ frame: f, delta: l - prev }); prev = l; } }
    assert.equal(hits.length, 3, JSON.stringify(hits));
    hits.forEach((h, i) => near(h.frame, 60 * (i + 1), 1, `${i + 1}回目の分割ダメージ`));
    assert.equal(hits.reduce((s, h) => s + h.delta, 0), 50, "分割の合計は 50 のまま(値は変えていない)");
    assert.deepEqual(plain(w.ctx.ProjectRHermesIssen.getActiveSplits()), [], "3秒で終わる");
});

test("【4】戦闘の開始・終了・再開始・メッセージ中の停止で、時計の欠落も重複も無い", () => {
    const w = fieldWorld(); const m = w.meter;
    // 開始前(戦闘なし): 時計は進まない
    frames(w, 10); assert.equal(m.calls, 0, "戦闘していないときは進まない");
    // 開始: 開始直後のフレームから1回ずつ
    assert.equal(FC(w).begin().ok, true); m.reset();
    const per = []; for (let i = 0; i < 30; i++) { const before = m.calls; w.frames(1); per.push(m.calls - before); }
    assert.deepEqual(per, Array(30).fill(1), "開始の最初のフレームから、毎フレームちょうど1回");
    // メッセージ中は止まる(1回も進まない)。FieldCombat 側の分も増えない
    m.reset(); w.ctx.$gameMessage.add("テスト"); frames(w, 20);
    assert.equal(m.calls, 0, "メッセージ中は進まない(欠落ではなく、仕様どおりの停止)");
    w.ctx.$gameMessage.clear(); m.reset(); frames(w, 20);
    assert.equal(m.calls, 20, "メッセージが終われば、毎フレーム1回に戻る(重複なし)");
    // 終了: 終了のフレーム以降は進まない
    assert.equal(FC(w).end("test"), true); m.reset(); frames(w, 20);
    assert.equal(m.calls, 0, "終了後は進まない");
    // 再開始: 1回ずつ(前の戦闘の分が重ならない)
    assert.equal(FC(w).begin().ok, true); m.reset(); frames(w, 60);
    assert.equal(m.calls, 60, "再開始後も毎フレーム1回"); near(m.seconds, 1, 1e-9);
    assert.deepEqual(m.callers, { CardBattleInput: 60 });
});

test("【5】通常のカード戦闘(Arena)は、従来どおり1フレーム1回(FieldCombat が動いていないので変わらない)", () => {
    const w = buildWorld(); assert.deepEqual(w.failures, []);
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    const r = w.ctx.ProjectRCombatTestArena.startScenario("hermes"); assert.equal(r.ok, true, JSON.stringify(r)); frames(w, 2);
    assert.equal(FC(w).isActive(), false, "FieldCombat は動いていない");
    const m = meter(w); frames(w, 60);
    assert.equal(m.calls, 60); near(m.seconds, 1, 1e-9); assert.equal(m.effective, 60);
    assert.deepEqual(m.callers, { CardBattleInput: 60 });
});

// ---------------------------------------------------------------- SOUL(準備ループ → ATTACK) ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = () => ({ renderable: true, visible: true, parent: null });
const sframes = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
function decorate(w) {
    const scene = w.sc(), sp = scene._spriteset, ctx = w.ctx;
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
    scene._projectRBattleHudLayer = display(); scene._menuButton = display();
    scene.hendrixHuds = [{ container: display(), index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, sp };
}
function soulWorld() {
    const w = a7.buildWorld(); assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(1, 12, 20); sframes(w, 4);
    w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080;
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.stage = w.ctx.ProjectRSoulStage;
    decorate(w);
    return w;
}
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(fs.readFileSync(path.join(__dirname, "..", "data", `Map${String(id).padStart(3, "0")}.json`), "utf8"));
    ctx.DataManager.onLoad(ctx.$dataMap); ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
}

test("【6】SOUL の時計は変わらない: 準備(PREPARE)の間は止まり、ATTACK の間は1フレーム1回。FieldCombat は動かない", () => {
    const w = soulWorld();
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true }))); assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); sframes(w, 8);
    assert.equal(w.soul.getPhase(), "prepare", "準備から始まる: " + w.soul.getPhase());
    assert.equal(FC(w).isActive(), false, "SOUL 中は FieldCombat は動かない");
    const heart = w.soul.getState().heart.eventId; attachHpBars(w, [heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    sframes(w, 4); w.ctx.ProjectRSoulBattleDodge.disarm();
    const m = meter(w);
    sframes(w, 30);
    assert.equal(m.effective, 0, "準備の間は、時計が実際には進まない(従来どおり)");
    // ATTACK へ
    const S = w.ctx.ProjectRSoulHand, seededRandom = w.run("globalThis.__seed = 4711; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };");
    void seededRandom;
    const drawn = plain(S.draw("player", { force: true })).drawn;
    for (const c of drawn.slice(0, 5)) assert.equal(plain(S.toggle(c.instanceId)).ok, true);
    assert.equal(plain(S.assignDefault()).ok, true); assert.equal(plain(S.commit()).ok, true);
    assert.equal(w.soul.beginAttack(), true); sframes(w, 2);
    assert.equal(w.soul.getPhase(), "attack", w.soul.getPhase());
    m.reset(); sframes(w, 60);
    assert.equal(m.effective, 60, "ATTACK の間は、1フレーム1回(60フレーム = 60回)"); near(m.effectiveSeconds, 1, 1e-9);
    assert.equal(FC(w).isActive(), false);
});

console.log(`${passed} tests passed`);
