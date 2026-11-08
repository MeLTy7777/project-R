"use strict";
// L4-A: SOUL戦闘のマナ(ProjectR_SoulMana)。準備ループのATTACK中だけ毎秒+1(上限10)・開始で10・終了で破棄。コスト・消費は未実装。実エンジン(全plugin)をNode VMで動かす。
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

// ================================================================ マナ(L4-A: 資源の土台だけ) ================================================================
const CASTS = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];
function startA16(w, { prepare, hand = CASTS } = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, attackSeconds: 20, defenseSeconds: 4, bossAttacks: false })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    assert.equal(w.soul.getPhase(), prepare ? "prepare" : "attack");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}
const M = w => w.ctx.ProjectRSoulMana;
const ms = w => plain(M(w).getState());
const set = (w, v) => { const r = plain(M(w).devSet(v)); assert.equal(r.ok, true, JSON.stringify(r)); return r; };
const seeded = (w, seed) => w.run(`globalThis.__seed = ${seed}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };`);
const loopWorld = () => startA16(world(), { prepare: true });
const attackNow = w => { assert.equal(w.soul.beginAttack(), true); frames(w, 1); return w; };

test("登録と範囲: マナは SoulBattle / SoulLoopHand の後・準備画面の前に1回だけ。読み取り専用の窓口(消費・コスト・カード・保存に触れない)。API は凍結", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name), i = names.indexOf("ProjectR_SoulMana");
    assert.equal(names.filter(n => n === "ProjectR_SoulMana").length, 1);
    assert.equal(plugins[i].status, true);
    for (const before of ["ProjectR_SoulBattle", "ProjectR_SoulLoopHand"]) assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < i, before);
    assert.ok(names.indexOf("ProjectR_SoulBattlePrepare") > i);
    const code = read("js/plugins/ProjectR_SoulMana.js").split("*/").slice(1).join("*/");
    // L4-A の土台(回復・破棄)は、実時間・乱数・保存・カードの発動の呼び出しに依存しない。L4-B で、コスト表と消費の窓口(settle / reserve)が加わった
    assert.doesNotMatch(code, /requestUseCard|useBattleCard|startCardBattle|setDeck|slotCooldown|\$gameSystem\.\w+\s*=[^=]|\$gameParty\.|StorageManager|saveGame|UpdateEventHp|Math\.random|setTimeout|Date\.now|performance\.now/, "カードの発動・クールダウン・保存・乱数・実時間に触れない");
    const w = world();
    assert.equal(Object.isFrozen(M(w)), true);
    assert.deepEqual([M(w).MAX, M(w).UNITS_PER_MANA, M(w).REGEN_PER_SECOND], [10, 60, 1]);
    assert.deepEqual(Object.keys(M(w)).filter(k => typeof M(w)[k] === "function").sort(), ["costOf", "devSet", "effectiveCost", "getState", "grantDiscount", "isActive", "quote", "release", "reserve", "settle"], "L4-A の読み取り + L4-B のコスト判定・消費(ProjectR_SoulLoopHand / SoulSkills が呼ぶ窓口)");
});

test("従来の攻撃⇄防御(prepare なし)・SOULでないときは何もしない: マナは動かず、HUDのモデルにも出ない", () => {
    const w = world();
    assert.deepEqual([ms(w).active, ms(w).current, ms(w).reason], [false, 0, "inactive"]);
    frames(w, 30);
    assert.equal(ms(w).current, 0);
    assert.equal(plain(M(w).devSet(5)).reason, "inactive", "動いていないときは書き換えられない");
    const w2 = startA16(world(), { prepare: false });
    frames(w2, 120);
    assert.deepEqual([ms(w2).active, ms(w2).current, ms(w2).stats.starts], [false, 0, 0], "従来の ATTACK でもマナは動かない");
    assert.equal(w2.soul.getPhase(), "attack");
    assert.equal(plain(w2.hud.getViewModel()).mana, null, "HUD に出さない");
    w2.soul.skipPhase(); frames(w2, 5); w2.soul.skipPhase(); frames(w2, 5);
    assert.deepEqual([ms(w2).active, ms(w2).current], [false, 0]);
    w2.soul.end("t");
});

test("遷移: PREPARE では 0(回復しない)。ATTACK の開始で 10 に初期化。ATTACK の終了で残りを破棄(0)。次の ATTACK の開始でまた 10(持ち越さない)", () => {
    const w = loopWorld();
    let s = ms(w);
    assert.deepEqual([s.active, s.phase, s.current, s.reason, s.max], [true, "prepare", 0, "notAttack", 10], "準備中は 0");
    frames(w, 120);
    assert.equal(ms(w).current, 0, "準備では回復しない");
    attackNow(w);
    s = ms(w);
    assert.deepEqual([s.phase, s.current, s.whole, s.ratio, s.stats.starts], ["attack", 10, 10, 1, 1], "ATTACK の開始で 10");
    set(w, 3.5);
    assert.equal(ms(w).current, 3.5);
    w.soul.skipPhase();                                                          // → DEFENSE: 残りを破棄
    s = ms(w);
    assert.deepEqual([s.phase, s.current, s.lastDiscarded, s.stats.discards, s.reason], ["defense", 0, 3.5, 1, "notAttack"]);
    w.soul.skipPhase();                                                          // → PREPARE
    assert.deepEqual([ms(w).phase, ms(w).current], ["prepare", 0]);
    attackNow(w);
    assert.deepEqual([ms(w).current, ms(w).stats.starts], [10, 2], "次の ATTACK は 3.5 を引き継がず 10 から");
    w.soul.end("t");
});

test("回復: ATTACK の間だけ毎秒+1。60フレームちょうどで +1(整数の単位で数えるのでずれない)。端数も貯まる(30フレーム = 0.5)。上限10で止まる", () => {
    const w = loopWorld();
    attackNow(w);
    set(w, 4);
    frames(w, 60);
    assert.equal(ms(w).current, 5, "60フレームでちょうど +1(浮動小数点の誤差なし)");
    assert.equal(ms(w).units, 300);
    set(w, 0);
    frames(w, 30);
    assert.deepEqual([ms(w).current, ms(w).whole, ms(w).units], [0.5, 0, 30], "端数が貯まる");
    frames(w, 29);
    assert.deepEqual([ms(w).whole, ms(w).units], [0, 59], "59フレームではまだ 1 に届かない");
    frames(w, 1);
    assert.deepEqual([ms(w).whole, ms(w).current], [1, 1]);
    assert.equal(ms(w).reason, "regen");
    set(w, 0);
    frames(w, 599);
    assert.deepEqual([ms(w).whole, ms(w).units], [9, 599], "599フレームで 9.98…");
    frames(w, 1);
    assert.deepEqual([ms(w).current, ms(w).reason, ms(w).regenerating], [10, "full", false], "600フレームちょうどで 10");
    frames(w, 300);
    assert.equal(ms(w).current, 10, "上限を超えない");
    set(w, 9.5);
    frames(w, 120);
    assert.deepEqual([ms(w).current, ms(w).units], [10, 600], "上限で止まる(超えた分は捨てる)");
    assert.equal(plain(M(w).devSet(11)).reason, "invalidValue");
    assert.equal(plain(M(w).devSet(-1)).reason, "invalidValue");
    w.soul.end("t");
});

test("回復の長さに依存しない(フレームの積み上げでずれない): 数百フレームの回復を細かく刻んでも、まとめても、ATTACK の経過フレームと完全に一致する", () => {
    const w = loopWorld();
    attackNow(w);
    set(w, 0);
    const e0 = plain(w.soul.getState()).elapsedFrames, u0 = ms(w).units;
    for (const n of [1, 7, 13, 60, 1, 1, 233, 90]) frames(w, n);               // 合計 406 フレーム(不規則な刻み)
    const e1 = plain(w.soul.getState()).elapsedFrames;
    assert.equal(e1 - e0, 406);
    assert.equal(ms(w).units - u0, 406, "増えた単位 = ATTACK の経過フレーム(1フレーム = 1/60 マナ)");
    assert.equal(ms(w).current, 406 / 60);
    assert.equal(ms(w).stats.regenFrames, 406);
    w.soul.end("t");
});

test("DEFENSE・PREPARE では回復しない。ATTACK の外で書き換えても増えず、次の ATTACK の開始で 10 に戻る(持ち越しなし)", () => {
    const w = loopWorld();
    attackNow(w);
    w.soul.skipPhase();                                                          // DEFENSE
    set(w, 2);
    frames(w, 180);
    assert.deepEqual([ms(w).phase, ms(w).current, ms(w).reason], ["defense", 2, "notAttack"], "防御では回復しない");
    w.soul.skipPhase();                                                          // PREPARE
    set(w, 6);
    frames(w, 300);
    assert.deepEqual([ms(w).phase, ms(w).current, ms(w).regenerating], ["prepare", 6, false], "準備では回復しない");
    attackNow(w);
    assert.equal(ms(w).current, 10, "ATTACK の開始で 10(外で書き換えた値は持ち込まない)");
    w.soul.end("t");
});

test("一時停止では回復しない: 会話・メッセージ・イベント中(ATTACK の時計が止まる間)と eventsPaused。再開すると続きから回復する", () => {
    const w = loopWorld();
    attackNow(w);
    set(w, 3);
    const e0 = plain(w.soul.getState()).elapsedFrames;
    w.ctx.$gameMessage.add("テスト");                                            // メッセージ表示中 = ATTACK の時計は進まない
    frames(w, 90);
    assert.equal(plain(w.soul.getState()).elapsedFrames, e0, "ATTACK の時計が止まっている");
    assert.deepEqual([ms(w).current, ms(w).reason, ms(w).regenerating], [3, "paused", false], "回復しない");
    w.ctx.$gameMessage.clear();
    frames(w, 60);
    assert.equal(ms(w).current, 4, "再開すると回復する(止まっていた分は貯まらない)");
    w.ctx.$gameMap.eventsPaused = true;                                          // 神託などが使う共通の停止の印
    frames(w, 90);
    assert.deepEqual([ms(w).current, ms(w).reason], [4, "paused"], "eventsPaused の間も回復しない");
    w.ctx.$gameMap.eventsPaused = false;
    frames(w, 30);
    assert.equal(ms(w).current, 4.5);
    assert.ok(ms(w).stats.pausedFrames >= 180);
    w.soul.end("t");
});

test("神託の時間停止(実際のスキル)では回復しない: 停止中は一定・解除後に続きから回復。ATTACK の終了で停止も解除される", () => {
    const w = loopWorld();
    seeded(w, 303);
    // 神託(ATTACK の時間を3秒止める)が先頭の5枠
    let drawn = null;
    for (let i = 0; i < 30000 && !drawn; i++) { const r = plain(w.ctx.ProjectRSoulHand.draw("player", { force: true })); if (r.drawn.some(c => c.cardId === "apollo_oracle")) drawn = r.drawn; }
    assert.ok(drawn, "神託を含む引き");
    const oracle = drawn.find(c => c.cardId === "apollo_oracle").instanceId;
    const rest = drawn.filter(c => c.instanceId !== oracle).slice(0, 4).map(c => c.instanceId);
    for (const id of [oracle, ...rest]) assert.equal(plain(w.ctx.ProjectRSoulHand.toggle(id)).ok, true);
    assert.equal(plain(w.ctx.ProjectRSoulHand.assignDefault()).ok, true);
    assert.equal(plain(w.ctx.ProjectRSoulHand.commit()).ok, true);
    attackNow(w);
    set(w, 10);                                                                   // 神託のコスト(9)を払える量から始める
    const used = plain(w.deck.requestUseCard(0));
    assert.equal(used.ok, true, JSON.stringify(used));
    frames(w, 2);
    assert.equal(w.ctx.$gameMap.eventsPaused, true, "神託の時間停止中");
    set(w, 3);                                                                    // 以降の「停止中は回復しない」の確認のため、3 に書き換える
    let stoppedFrames = 0;
    while (w.ctx.$gameMap.eventsPaused && stoppedFrames < 600) {                 // 停止が解除されるまで1フレームずつ: 一度も増えない
        assert.equal(ms(w).current, 3, "停止中(" + stoppedFrames + "フレーム目)は 3 のまま");
        assert.equal(ms(w).regenerating, false);
        frames(w, 1); stoppedFrames++;
    }
    assert.ok(stoppedFrames >= 120 && stoppedFrames < 600, "神託の停止が数秒続いた: " + stoppedFrames);
    assert.equal(w.ctx.$gameMap.eventsPaused, false, "停止が解除された");
    const after = ms(w).units;
    assert.ok(after >= 180 && after <= 181, "解除の直後まで増えていない(3マス = 180単位): " + after);
    frames(w, 60);
    assert.equal(ms(w).units - after, 60, "解除後は毎秒+1(60フレームで60単位)で回復する");
    // 停止中に ATTACK が終わっても、マナは破棄される
    set(w, 5);
    w.soul.skipPhase();
    assert.deepEqual([ms(w).current, ms(w).lastDiscarded], [0, 5]);
    w.soul.end("t");
});

test("繰り返しのラウンド: 3ラウンドとも ATTACK 開始で 10・終了で破棄・準備/防御で 0。開始回数・破棄回数・ラウンド番号が合う", () => {
    const w = loopWorld();
    for (let round = 1; round <= 3; round++) {
        assert.equal(ms(w).phase, "prepare");
        assert.equal(ms(w).current, 0);
        attackNow(w);
        assert.deepEqual([ms(w).current, ms(w).round, ms(w).stats.starts], [10, round, round], `ラウンド${round}の開始`);
        set(w, round);                                                           // ラウンドごとに違う残り
        frames(w, 30);
        assert.equal(ms(w).current, round + 0.5);
        w.soul.skipPhase();
        assert.deepEqual([ms(w).current, ms(w).lastDiscarded, ms(w).stats.discards], [0, round + 0.5, round], "ATTACK の終了で破棄");
        frames(w, 60);
        assert.equal(ms(w).current, 0, "防御では 0 のまま");
        w.soul.skipPhase();
    }
    w.soul.end("t");
});

test("後始末: SOULの終了(ATTACK中・準備中)・中断で、マナは初期状態(非アクティブ・0)へ戻り、回復しない。次のSOULは新しい状態から始まる", () => {
    const w = loopWorld();
    attackNow(w); set(w, 6);
    assert.equal(w.soul.end("test"), true);
    let s = ms(w);
    assert.deepEqual([s.active, s.current, s.reason, s.phase, s.round], [false, 0, "inactive", "idle", 0]);
    assert.equal(s.stats.ends, 1);
    frames(w, 120);
    assert.equal(ms(w).current, 0, "終了後は回復しない");
    assert.equal(plain(M(w).devSet(5)).reason, "inactive");
    if (stageState(w).state !== "idle") { arrive(w); frames(w, 8); }
    w.sb.stop?.();
    // 準備中に終えても同じ
    const w2 = loopWorld();
    frames(w2, 30);
    assert.equal(w2.soul.end("t"), true);
    s = ms(w2);
    assert.deepEqual([s.active, s.current, s.lastDiscarded], [false, 0, null]);
    // 新しいSOUL(従来の攻撃⇄防御)はマナを持たない
    const w3 = world();
    assert.equal(w3.soul.start({ heart: false, attackSeconds: 5 }).ok, true);
    frames(w3, 30);
    assert.deepEqual([ms(w3).active, ms(w3).current], [false, 0]);
    w3.soul.end("t");
});

test("L4-B の消費は ProjectR_SoulManaCost の承認済みコストだけ: カードを使うとコスト分だけ減る(詳細は ProjectR_SoulManaCost.test.cjs)。回復は ATTACK の時計のまま・枠ごとのクールダウン(slotCooldown)は廃止", () => {
    const w = loopWorld();
    seeded(w, 11);
    let drawn = null;
    for (let i = 0; i < 30000 && !drawn; i++) { const r = plain(w.ctx.ProjectRSoulHand.draw("player", { force: true })); if (["hermes_sweep", "hermes_issen"].every(id => r.drawn.some(c => c.cardId === id))) drawn = r.drawn; }
    const a = drawn.find(c => c.cardId === "hermes_sweep").instanceId, b = drawn.find(c => c.cardId === "hermes_issen").instanceId;
    const rest = drawn.filter(c => c.instanceId !== a && c.instanceId !== b).slice(0, 3).map(c => c.instanceId);
    for (const id of [a, b, ...rest]) w.ctx.ProjectRSoulHand.toggle(id);
    w.ctx.ProjectRSoulHand.assignDefault();
    assert.equal(plain(w.ctx.ProjectRSoulHand.commit()).ok, true);
    attackNow(w);
    set(w, 10);
    const sweep = M(w).costOf("hermes_sweep"), issen = M(w).costOf("hermes_issen");
    assert.equal(plain(w.deck.requestUseCard(0)).ok, true);
    assert.equal(plain(w.deck.requestUseCard(1)).ok, true);
    assert.equal(ms(w).spent, sweep + issen, "承認済みのコストだけ引く");
    assert.ok(Math.abs(ms(w).current - (10 - sweep - issen)) < 0.2);
    assert.equal(plain(w.deck.requestUseCard(0)).reason, "insufficientMana", "マナが尽きたら使えない");
    set(w, 10);
    assert.equal(plain(w.deck.requestUseCard(0)).ok, true, "同じ枠はクールダウンではなくマナで制限される(クールダウンの待ちは無い)");
    assert.equal(plain(w.deck.getBattleState()).hand.length, 5);
    assert.equal(plain(w.deck.getBattleState()).soulFixed.slotCooldowns, undefined);
    w.soul.end("t");
});

test("HUD: マナを「現在値 / 上限」と端数のバーで表示する(準備ループのときだけ)。ATTACK = 10 / 10(強調)、準備・防御 = 0 / 10(薄く)。他のパネル・カットインの置き場と重ならない", () => {
    const w = loopWorld();
    frames(w, 6);
    let m = plain(w.hud.getViewModel()).mana;
    assert.deepEqual([m.whole, m.max, m.attack, m.ratio], [0, 10, false, 0], "準備中: 0 / 10(薄い)");
    attackNow(w); frames(w, 6);
    m = plain(w.hud.getViewModel()).mana;
    assert.deepEqual([m.whole, m.max, m.current, m.attack, m.ratio], [10, 10, 10, true, 1], "ATTACK: 10 / 10");
    set(w, 6.5); frames(w, 6);
    m = plain(w.hud.getViewModel()).mana;
    assert.equal(m.whole, 6); assert.ok(m.current > 6.5 && m.current < 7, "端数つき: " + m.current);
    assert.ok(m.ratio > 0.65 && m.ratio < 0.7);
    w.soul.skipPhase(); frames(w, 6);
    m = plain(w.hud.getViewModel()).mana;
    assert.deepEqual([m.whole, m.attack], [0, false], "防御: 0 / 10");
    // 表示の置き場: 他のパネルと重ならず、画面内。ステージの敵/味方カットインの置き場(戦闘エリアの外・上の角)とも重ならない
    const P = plain(w.hud.PANELS), rects = Object.entries(P).filter(([k]) => k !== "mana").map(([, r]) => r);
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    for (const r of rects) assert.equal(overlap(P.mana, r), false, "他のパネルと重ならない: " + JSON.stringify(r));
    assert.ok(P.mana.x >= 0 && P.mana.y >= 0 && P.mana.x + P.mana.w <= 1920 && P.mana.y + P.mana.h <= 1080);
    const cut = plain(w.stage.computeCutInRects({ x: 565, y: 205, w: 790, h: 445, scale: 790 / 1280, gw: 1920, gh: 1080 }));
    const toBase = r => ({ x: r.x, y: r.y, w: r.w, h: r.h });
    assert.equal(overlap(P.mana, toBase(cut.ally)), false, "味方のカットイン(左上)と重ならない");
    assert.equal(overlap(P.mana, toBase(cut.enemy)), false, "敵のカットイン(右上)と重ならない");
    const src = read("js/plugins/ProjectR_SoulBattleHUD.js");
    assert.match(src, /api\("ProjectRSoulMana"\)/, "HUD は読み取り専用の状態だけを使う");
    w.soul.end("t");
});

console.log(`\n${passed} tests passed`);
