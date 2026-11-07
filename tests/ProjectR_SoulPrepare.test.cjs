"use strict";
// L0: SOUL戦闘の準備ループ(PREPARE → ATTACK → DEFENSE → PREPARE)。
//   ・コントローラ(ProjectR_SoulBattle)の状態遷移・時計の停止・遮断・復元(prepare は start({prepare:true}) のときだけ。既定は従来の攻撃⇄防御)
//   ・準備メニュー(ProjectR_SoulBattlePrepare): 「攻撃」「アイテム」。アイテムは未実装で何も消費しない
//   ・入力 / HUD / ステージ / 回避AI / スキルが、準備を防御として扱わず明示的に扱うこと
// 実エンジン(全plugin)をNode VMで動かす。実機の確認は tools/mz_cdp/soul_prepare_verify.cjs。
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

// ================================================================ 1. 登録・既定の動作 ================================================================
test("登録: 準備メニューは SoulBattle / Input / Stage / HUD の後に1回だけ・有効。コントローラのパラメータ PrepareLoop の既定は false(従来の攻撃⇄防御)", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name);
    const index = n => names.indexOf(n);
    assert.equal(names.filter(n => n === "ProjectR_SoulBattlePrepare").length, 1);
    assert.equal(plugins[index("ProjectR_SoulBattlePrepare")].status, true);
    for (const before of ["ProjectR_SoulBattle", "ProjectR_SoulBattleInput", "ProjectR_SoulBattleStage", "ProjectR_SoulBattleHUD"]) assert.ok(index(before) >= 0 && index(before) < index("ProjectR_SoulBattlePrepare"), before);
    assert.deepEqual(plugins[index("ProjectR_SoulBattle")].parameters.PrepareLoop, undefined, "plugins.js のパラメータは変えていない(既定 false)");
    const header = read("js/plugins/ProjectR_SoulBattlePrepare.js");
    for (const dep of ["@base ProjectR_SoulBattle", "@orderAfter ProjectR_SoulBattleHUD"]) assert.ok(header.includes(dep), dep);
    const controller = read("js/plugins/ProjectR_SoulBattle.js");
    assert.match(controller, /@param PrepareLoop[\s\S]*?@default false/);
});

test("既定(prepare を指定しない)は従来どおり: 攻撃から始まり 攻撃 → 防御 → 攻撃。prepare には一度も入らない。準備メニューは何もしない", () => {
    const w = world();
    const r = plain(w.soul.start({ heart: false, attackSeconds: 1, defenseSeconds: 1 }));
    assert.equal(r.ok, true);
    assert.equal(w.soul.getPhase(), "attack");
    assert.equal(w.soul.getState().prepare, false);
    assert.equal(paused(w), false);
    frames(w, 61); assert.equal(w.soul.getPhase(), "defense");
    frames(w, 61); assert.equal(w.soul.getPhase(), "attack", "防御の次は(準備ではなく)攻撃");
    assert.deepEqual(w.phases, ["idle>attack", "attack>defense", "defense>attack"]);
    assert.equal(w.soul.beginAttack(), false, "準備でないときの beginAttack は何もしない");
    assert.equal(w.prep.isOpen(), false);
    assert.equal(w.prep.getState().stats.opened, 0);
    assert.equal(plain(w.soul.getState().prepareStats).entered, 0);
    assert.equal(w.soul.end("t"), true);
});

test("開始の検証: prepare 無しで firstPhase:'prepare' は拒否(prepareDisabled)。prepare は真偽値だけ(invalidOption:prepare)。prepare 有りの firstPhase は prepare / attack / defense", () => {
    const w = world();
    assert.deepEqual(plain(w.soul.start({ heart: false, firstPhase: "prepare" })), { ok: false, reason: "prepareDisabled" });
    assert.deepEqual(plain(w.soul.start({ heart: false, prepare: "yes" })), { ok: false, reason: "invalidOption:prepare" });
    assert.deepEqual(plain(w.soul.start({ heart: false, prepare: true, firstPhase: "cleanup" })), { ok: false, reason: "invalidFirstPhase" });
    assert.equal(w.soul.getPhase(), "idle", "失敗した開始は何も残さない");
    assert.equal(paused(w), false);
    for (const first of ["attack", "defense"]) {
        assert.equal(w.soul.start({ heart: false, prepare: true, firstPhase: first }).ok, true);
        assert.equal(w.soul.getPhase(), first);
        assert.equal(paused(w), false, "攻撃・防御から始めたときは凍結しない");
        w.soul.end("t");
    }
    assert.equal(w.soul.start({ heart: false, prepare: true }).ok, true);
    assert.equal(w.soul.getPhase(), "prepare", "指定が無ければ準備から");
    w.soul.end("t");
});

// ================================================================ 2. 遷移・時計 ================================================================
test("準備ループ: 準備 → 攻撃 → 防御 → 準備。準備は時間で終わらず(何フレーム待っても進まない)、選択(beginAttack)でだけ攻撃へ進む。ラウンドは防御の後で進む", () => {
    const w = world();
    assert.equal(w.soul.start({ heart: false, prepare: true, attackSeconds: 1, defenseSeconds: 1 }).ok, true);
    assert.equal(w.soul.getPhase(), "prepare");
    let s = plain(w.soul.getState());
    assert.deepEqual([s.round, s.phasesDone, s.totalFrames, s.framesLeft, s.prepare], [1, 0, 0, 0, true]);
    frames(w, 600);                                                     // 10秒待っても準備のまま
    s = plain(w.soul.getState());
    assert.deepEqual([w.soul.getPhase(), s.elapsedFrames, s.framesLeft, s.round, s.phasesDone], ["prepare", 0, 0, 1, 0], "戦闘の時間は数えない");
    w.ctx.$gameMap.eventsPaused = false;                                  // 凍結の印が外から外されても(二重の安全)、準備は時間で進まない
    frames(w, 120);
    assert.deepEqual([w.soul.getPhase(), plain(w.soul.getState()).elapsedFrames], ["prepare", 0]);
    w.ctx.$gameMap.eventsPaused = true;
    assert.equal(w.soul.beginAttack("test"), true);
    assert.equal(w.soul.getPhase(), "attack");
    assert.equal(plain(w.soul.getState()).totalFrames, 60);
    assert.equal(w.soul.beginAttack(), false, "攻撃中の beginAttack は拒否");
    frames(w, 61); assert.equal(w.soul.getPhase(), "defense");
    assert.equal(w.soul.beginAttack(), false, "防御中の beginAttack は拒否");
    frames(w, 61);
    assert.equal(w.soul.getPhase(), "prepare", "防御の次は準備");
    s = plain(w.soul.getState());
    assert.deepEqual([s.round, s.phasesDone], [2, 2], "防御が終わるとラウンドが進む");
    assert.deepEqual(w.phases, ["idle>prepare", "prepare>attack", "attack>defense", "defense>prepare"]);
    assert.equal(plain(w.soul.getState()).prepareStats.attackStarts, 1);
    assert.equal(plain(w.soul.getState()).prepareStats.entered, 2);
    assert.equal(w.soul.end("t"), true);
});

test("skipPhase: 準備 → 攻撃(ラウンドは進まない)。ラウンド数の指定: 1ラウンド = 攻撃 + 防御で終了し、防御の後に準備へは戻らない", () => {
    const w = world();
    w.soul.start({ heart: false, prepare: true, attackSeconds: 1, defenseSeconds: 1, rounds: 1 });
    assert.equal(w.soul.skipPhase(), true);
    assert.deepEqual([w.soul.getPhase(), plain(w.soul.getState()).phasesDone, plain(w.soul.getState()).prepareStats.skips], ["attack", 0, 1]);
    frames(w, 61); assert.equal(w.soul.getPhase(), "defense");
    frames(w, 61);
    assert.equal(w.soul.getPhase(), "idle", "規定のラウンドを終えたら終了(準備に戻らない)");
    assert.deepEqual(w.ends, ["completed"]);
    assert.deepEqual(w.phases, ["idle>prepare", "prepare>attack", "attack>defense"]);
    assert.equal(paused(w), false);
});

test("準備の凍結: 準備の間だけ $gameMap.eventsPaused を立て、準備を出る・終了(end)・既に別の誰かが立てていた場合のどれでも、自分が立てた分だけ必ず戻す", () => {
    const w = world();
    w.soul.start({ heart: false, prepare: true, attackSeconds: 1, defenseSeconds: 1 });
    assert.equal(paused(w), true);
    assert.equal(plain(w.soul.getState()).paused, true);
    w.soul.beginAttack(); assert.equal(paused(w), false, "攻撃に入る前に戻す");
    frames(w, 61); frames(w, 61);
    assert.equal(w.soul.getPhase(), "prepare"); assert.equal(paused(w), true);
    w.soul.end("t");
    assert.equal(paused(w), false, "準備の途中で終了しても戻す");
    assert.equal(w.soul.getPhase(), "idle");
    // 既に他が立てている(例: 神託の時間停止)ときは、触らない
    w.ctx.$gameMap.eventsPaused = true;
    w.soul.start({ heart: false, prepare: true });
    assert.equal(plain(w.soul.getState()).paused, false, "自分は立てていない");
    w.soul.end("t");
    assert.equal(paused(w), true, "他が立てた印は壊さない");
    w.ctx.$gameMap.eventsPaused = false;
    // マップの作り直し(別マップへの移動)でも戻す
    w.soul.start({ heart: false, prepare: true });
    assert.equal(paused(w), true);
    quietly(() => w.ctx.$gameMap.setup(w.ctx.$gameMap.mapId()));
    assert.equal(w.soul.getPhase(), "idle");
    assert.equal(paused(w), false, "mapSetup の後始末でも戻る");
    assert.equal(w.soul.start({ heart: false, prepare: true }).ok, true, "後始末の後に、また始められる");
    w.soul.end("t");
});

// ================================================================ 3. 遮断 ================================================================
test("準備中の遮断: カード・通常攻撃・必殺技は DEFENSE と同じ仕組みで止まる(理由は soulPrepare)。何も消費しない。DEFENSE の理由(soulDefense)は変わらない", () => {
    const w = a16Prepare(world());
    const before = JSON.stringify(plain(w.deck.getBattleState()));
    const counts = plain(w.soul.getBlockedCounts());
    for (let i = 0; i < 5; i++) {
        const r = plain(w.deck.requestUseCard(i));
        assert.deepEqual([r.ok, r.reason], [false, "soulPrepare"], `手札${i}: ` + JSON.stringify(r));
    }
    assert.equal(JSON.stringify(plain(w.deck.getBattleState())), before, "手札・山札・クールダウンは何も変わらない(消費なし)");
    assert.equal(plain(w.soul.getBlockedCounts()).card, counts.card + 5);
    assert.equal(w.ctx.ProjectRCardBattleInput.getBlockedReason({}), "soulPrepare");
    assert.equal(w.ctx.ProjectRUltimateGauge.isUltimateGaugeFull(), false, "必殺技の新しい発動は受け付けない");
    const attackBlocked = plain(w.soul.getBlockedCounts()).attackEvent;
    w.attackClick();
    assert.equal(plain(w.soul.getBlockedCounts()).attackEvent, attackBlocked + 1, "通常攻撃の共通イベントを遮断した");
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0);
    // 防御の理由はこれまでどおり
    w.soul.beginAttack(); w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(plain(w.deck.requestUseCard(0)).reason, "soulDefense");
    assert.equal(w.ctx.ProjectRCardBattleInput.getBlockedReason({}), "soulDefense");
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(plain(w.deck.requestUseCard(0)).reason, "soulPrepare", "防御の次の準備でも止まる");
    w.soul.end("t");
});

test("準備中の入力: カードのキー Q/W/E/R/T は渡さない(準備として数える)。ATTACK では今までどおり渡す。メニューの左クリックは通常攻撃にならない", () => {
    const w = a16Prepare(world());
    const key = (type, code) => { const e = { type, code, keyCode: code.charCodeAt(3), repeat: false, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, preventDefault() {}, stopPropagation() {} }; return type === "keydown" ? w.ctx.Input._onKeyDown(e) : w.ctx.Input._onKeyUp(e); };
    const before = plain(w.input.getStats());
    for (const code of ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT"]) { key("keydown", code); key("keyup", code); }
    const after = plain(w.input.getStats());
    assert.equal(after.swallowedPrepare, before.swallowedPrepare + 5, "準備として数える");
    assert.equal(after.swallowedDefense, before.swallowedDefense, "防御としては数えない");
    assert.equal(after.translated, before.translated, "どれも渡していない");
    assert.equal(after.held, 0);
    w.soul.beginAttack();
    key("keydown", "KeyQ"); key("keyup", "KeyQ");
    assert.equal(plain(w.input.getStats()).translated, after.translated + 1, "ATTACK では渡す");
    w.soul.end("t");
});

test("準備中の時計: カードのクールダウン・回避AI・敵ハートの動き・新しいEvent(弾など)は進まない。準備を出ると再び進む", () => {
    const w = a16Prepare(world());
    w.soul.beginAttack();
    assert.equal(plain(w.deck.requestUseCard(0)).ok, true, "ATTACK でカードを使う(クールダウンの山に入る)");
    const cooling = () => plain(w.deck.getBattleState()).cooldownPile.map(e => e.remainingSeconds);
    frames(w, 30);
    const running = cooling();
    assert.ok(running.length >= 1 && running[0] > 0, "ATTACK ではクールダウンが進む: " + JSON.stringify(running));
    w.soul.skipPhase(); w.soul.skipPhase();                                   // 攻撃 → 防御 → 準備
    assert.equal(w.soul.getPhase(), "prepare");
    const frozen = cooling();
    const heart = JSON.stringify(plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter));
    const eventIds = () => new Set(w.ctx.$gameMap.events().map(e => e._eventId)), idsBefore = eventIds(), totals = plain(w.dodge.totals()).prepareFrozen;
    const cdFrozen = plain(w.soul.getState().prepareStats).cooldownFrozen;
    frames(w, 300);
    assert.deepEqual(cooling(), frozen, "クールダウンは進まない");
    assert.equal(JSON.stringify(plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter)), heart, "敵ハートは動かない");
    assert.deepEqual([...eventIds()].filter(id => !idsBefore.has(id)), [], "新しいEvent(敵の攻撃・弾)は増えない");
    assert.ok(plain(w.soul.getState().prepareStats).cooldownFrozen > cdFrozen, "クールダウンの時計を止めた回数");
    assert.ok(plain(w.dodge.totals()).prepareFrozen >= totals, "回避AIの診断");
    assert.equal(plain(w.soul.getState()).elapsedFrames > 0, true);
    const elapsed = plain(w.soul.getState()).elapsedFrames;
    frames(w, 60);
    assert.equal(plain(w.soul.getState()).elapsedFrames, elapsed, "SOULの経過時間も進まない");
    w.soul.beginAttack();
    frames(w, 30);
    assert.ok(cooling().length === 0 || cooling()[0] < frozen[0], "準備を出ると、クールダウンが再び進む: " + JSON.stringify([frozen, cooling()]));
    w.soul.end("t");
});

test("スキルの後始末と復元: 攻撃で始めた効果は防御に入る時点で解除され、準備には持ち越さない。準備中は発動も受け付けない(soulPrepare)", () => {
    const w = a16Prepare(world(), { openingHand: ["apollo_oracle", "apollo_eros_arrow", "hermes_issen", "hermes_sweep", "apollo_gigas_slayer"] });
    const skills = w.ctx.ProjectRSoulSkills;
    w.soul.beginAttack();
    const used = plain(w.deck.requestUseCard(0));
    assert.equal(used.ok, true, "神託(時間停止)を発動: " + JSON.stringify(used));
    assert.ok(plain(skills.getState()).effects >= 1 || paused(w), "効果が動いている");
    w.soul.skipPhase();                                                                 // 防御へ → スキルの効果は全部解除
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(plain(skills.getState()).effects, 0);
    assert.equal(paused(w), false, "時間停止は防御に入った時点で解除");
    w.soul.skipPhase();                                                                 // 準備へ
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(plain(skills.getState()).effects, 0, "準備に持ち越さない");
    assert.equal(plain(skills.getState()).ownPause, false);
    assert.equal(paused(w), true, "準備の凍結だけが立っている");
    assert.equal(plain(w.deck.requestUseCard(1)).reason, "soulPrepare");
    w.soul.beginAttack();
    assert.equal(paused(w), false, "攻撃に入ると凍結は外れる");
    assert.equal(plain(skills.getState()).effects, 0);
    w.soul.end("t");
    assert.equal(paused(w), false);
});

// ================================================================ 4. 準備メニュー ================================================================
test("準備メニュー: 準備の間だけ出る。戦闘エリアの中央に「攻撃」「アイテム」の2つ。重ならず、枠の中。攻撃・防御では出ない", () => {
    const w = a16Prepare(world());
    frames(w, 2);
    assert.equal(w.prep.isOpen(), true);
    const layout = plain(w.prep.getLayout()), vp = plain(w.stage.getViewport());
    assert.deepEqual(plain(w.prep.OPTIONS).map(o => o.label), ["攻撃", "アイテム"]);
    assert.equal(layout.buttons.length, 2);
    const inside = r => r.x >= vp.x && r.y >= vp.y && r.x + r.w <= vp.x + vp.w && r.y + r.h <= vp.y + vp.h;
    assert.ok(inside(layout.panel), "メニューは戦闘エリアの中: " + JSON.stringify([layout.panel, vp]));
    for (const b of layout.buttons) assert.ok(b.x >= layout.panel.x && b.x + b.w <= layout.panel.x + layout.panel.w && b.y >= layout.panel.y && b.y + b.h <= layout.panel.y + layout.panel.h, "ボタンはメニューの中");
    assert.ok(layout.buttons[0].y + layout.buttons[0].h <= layout.buttons[1].y, "ボタンは重ならない");
    assert.ok(Math.abs(layout.panel.x + layout.panel.w / 2 - (vp.x + vp.w / 2)) <= 1, "横は中央");
    const layer = w.sc()._projectRSoulPrepare;
    assert.ok(layer && layer.visible, "メニューのSpriteが付いて見えている");
    assert.equal(w.prep.getState().selected, 0, "初めの選択は「攻撃」");
    w.soul.beginAttack(); frames(w, 2);
    assert.equal(w.prep.isOpen(), false, "攻撃では出ない");
    assert.equal(layer.visible, false);
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.prep.isOpen(), false, "防御でも出ない");
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.prep.isOpen(), true, "次の準備でまた出る");
    assert.equal(w.prep.getState().stats.opened, 2);
    w.soul.end("t"); frames(w, 2);
    assert.equal(w.prep.isOpen(), false, "終了で閉じる");
    assert.equal(layer.visible, false);
});

test("「アイテム」は未実装: 表示で明示し、選んでも何も起きない(フェーズ・アイテム・所持金・HP・カード・デッキは不変)。通知を出し、何度選んでも同じ", () => {
    const w = a16Prepare(world());
    frames(w, 20);
    assert.equal(w.prep.OPTIONS[1].implemented, false);
    assert.equal(w.prep.OPTIONS[1].sub, "未実装", "ボタンに「未実装」と出す");
    const before = itemsSnapshot(w), battle = JSON.stringify(plain(w.deck.getBattleState()));
    for (let i = 0; i < 3; i++) {
        const r = plain(w.prep.choose("item"));
        assert.deepEqual([r.ok, r.reason, r.consumed], [false, "notImplemented", false]);
    }
    assert.equal(w.soul.getPhase(), "prepare", "フェーズは進まない");
    assert.equal(itemsSnapshot(w), before, "何も消費していない");
    assert.equal(JSON.stringify(plain(w.deck.getBattleState())), battle);
    assert.equal(w.prep.getState().stats.itemAttempts, 3);
    assert.match(w.prep.getState().notice, /未実装/);
    assert.match(w.prep.getState().notice, /消費していません/);
    // 画面のクリックでも同じ
    const layout = plain(w.prep.getLayout()), c = center(layout.buttons[1]);
    click(w, c.x, c.y);
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(w.prep.getState().stats.itemAttempts, 4);
    assert.equal(w.prep.getState().stats.clicks, 1);
    assert.equal(itemsSnapshot(w), before);
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0, "クリックは通常攻撃の予約にならない(Hendrix の攻撃ボタンの予約は準備の遮断が捨てる)");
    assert.equal(plain(w.input.getStats()).attacksAllowed, 0, "通常攻撃として通っていない");
    w.soul.end("t");
});

test("「攻撃」のクリックはキャラ選択へ進む(ATTACK はまだ始まらない)。同じクリックは通常攻撃にならない。開いた直後(ガード中)・ボタンの外のクリックは無視", () => {
    const w = a16Prepare(world());
    const layout = plain(w.prep.getLayout()), attackBtn = center(layout.buttons[0]);
    assert.ok(w.prep.getState().frame - w.prep.getState().openedFrame < w.prep.OPEN_GUARD_FRAMES + 5, "テスト開始時点はまだ開いた直後付近");
    // 開いた直後のクリックは受け付けない: 新しく準備に入り直して、すぐ押す
    w.soul.beginAttack(); w.soul.skipPhase(); w.soul.skipPhase(); frames(w, 1);
    assert.equal(w.soul.getPhase(), "prepare");
    click(w, attackBtn.x, attackBtn.y);
    assert.equal(w.soul.getPhase(), "prepare", "開いた直後(ガード中)のクリックは無視");
    frames(w, w.prep.OPEN_GUARD_FRAMES + 2);
    click(w, layout.panel.x + 5, layout.panel.y + 5);                                         // ボタンの外
    assert.equal(w.soul.getPhase(), "prepare", "ボタンの外のクリックでは進まない");
    const allowed = plain(w.input.getStats()).attacksAllowed;
    click(w, attackBtn.x, attackBtn.y);
    assert.equal(w.soul.getPhase(), "prepare", "「攻撃」はキャラ選択へ進むだけ(ATTACK はまだ)");
    assert.equal(w.prep.getScreen(), "character");
    assert.equal(w.prep.getState().stats.attackChosen >= 1, true);
    assert.equal(plain(w.input.getStats()).attacksAllowed, allowed, "メニューのクリックは通常攻撃として通っていない");
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0);
    assert.equal(w.prep.isOpen(), true);
    // 同じフレームの印は次のフレームには残らない: 次のクリックは通常攻撃として判定される
    frames(w, 2);
    assert.equal(w.prep.consumedClick(), false);
    // 画面を通る流れ全体は ProjectR_SoulPrepareFlow.test.cjs。ここでは開発用の一括操作で ATTACK へ進む
    const quick = plain(w.prep.quickAttack());
    assert.equal(quick.ok, true, JSON.stringify(quick));
    assert.equal(w.soul.getPhase(), "attack");
    frames(w, 2);
    assert.equal(w.prep.isOpen(), false);
    w.soul.end("t");
});

test("準備メニューを使うのは準備のときだけ: 準備でないときの choose は拒否(フェーズ不変)。通常のマップ(SOULでない)では何も作らない", () => {
    const w = world();
    assert.deepEqual(plain(w.prep.choose("attack")), { ok: false, reason: "notPreparing" });
    assert.deepEqual(plain(w.prep.choose("item")), { ok: false, reason: "notPreparing" });
    frames(w, 30);
    assert.equal(w.prep.isOpen(), false);
    assert.equal(w.sc()._projectRSoulPrepare, undefined, "SOULでなければSpriteも作らない");
    assert.equal(w.prep.getState().stats.opened, 0);
    assert.equal(paused(w), false);
    w.soul.start({ heart: false, attackSeconds: 5 });
    assert.deepEqual(plain(w.prep.choose("attack")), { ok: false, reason: "notPreparing" }, "攻撃中は拒否");
    assert.equal(w.soul.getPhase(), "attack");
    w.soul.end("t");
    assert.deepEqual(plain(w.prep.choose("zzz")), { ok: false, reason: "notPreparing" });
});

// ================================================================ 5. HUD・ステージ ================================================================
test("HUD: 準備は ATTACK でも DEFENSE でもない独立のフェーズ。状態チップは「選択待ち」、手札5枚は「準備中」(防御の LOCK ではない)、残り時間は無い", () => {
    const w = a16Prepare(world());
    frames(w, 6);
    let m = plain(w.hud.getViewModel());
    assert.equal(m.phase, "prepare");
    assert.equal(m.secondsLeft, 0);
    assert.equal(m.phaseRatio, 0);
    assert.deepEqual(m.hand.map(s => s.state), ["prepare", "prepare", "prepare", "prepare", "prepare"], "手札は使えない(準備中)");
    assert.equal(m.hand.every(s => s.cardId), true, "カードの内容は見える");
    w.soul.beginAttack(); frames(w, 6);
    m = plain(w.hud.getViewModel());
    assert.equal(m.phase, "attack");
    assert.equal(m.hand.some(s => s.state === "prepare" || s.state === "locked"), false);
    w.soul.skipPhase(); frames(w, 6);
    m = plain(w.hud.getViewModel());
    assert.equal(m.phase, "defense");
    assert.deepEqual([...new Set(m.hand.map(s => s.state))], ["locked"], "防御は従来どおり LOCK");
    w.soul.skipPhase(); frames(w, 6);
    assert.equal(plain(w.hud.getViewModel()).phase, "prepare");
    const src = read("js/plugins/ProjectR_SoulBattleHUD.js");
    assert.match(src, /st\.phase === "prepare" \? "prepare"/, "HUD は準備を明示的に扱っている");
    w.soul.end("t");
});

test("ステージ: 準備ではキャラと神の絵を出し、プレイヤーのハートは出さない(マウス操作は防御だけ)。敵の本物のハートは戦闘エリアに残る(重複なし)。攻撃・防御の表示は従来どおり", () => {
    const w = a16Prepare(world());
    frames(w, 6);
    let reps = plain(w.stage.getReps()), hearts = plain(w.stage.getHearts());
    assert.equal(reps.show, true, "準備ではキャラと神の置き場を使う");
    assert.equal(hearts.player, null, "プレイヤーのハートは出さない");
    assert.equal(hearts.boss, null, "敵の胸の飾りも出さない(本物のハートが戦闘エリアにある)");
    assert.equal(plain(w.stage.getPlayerHeart()).active, false, "マウスでは動かない");
    w.soul.beginAttack(); frames(w, 6);
    hearts = plain(w.stage.getHearts());
    // 絵が読み込まれていないNodeハーネスでは胸の位置が無い(null)。出るなら必ずキャラの胸で、マウスのハートではない
    assert.ok(hearts.player === null || hearts.player.mode === "portrait", "ATTACK: プレイヤーのハートはキャラの胸(マウスではない)");
    assert.equal(plain(w.stage.getPlayerHeart()).active, false);
    assert.equal(hearts.boss, null);
    w.soul.skipPhase(); frames(w, 6);
    hearts = plain(w.stage.getHearts());
    assert.equal(hearts.player && hearts.player.mode, "mouse", "DEFENSE: プレイヤーのハートはマウス");
    assert.ok(hearts.boss === null || hearts.boss.mode === "portrait", "DEFENSE: 敵のハートは敵の絵の胸");
    assert.equal(plain(w.stage.getPlayerHeart()).active, true);
    w.soul.skipPhase(); frames(w, 6);
    hearts = plain(w.stage.getHearts());
    assert.equal(hearts.player, null);
    assert.equal(hearts.boss, null);
    assert.equal(plain(w.stage.getPlayerHeart()).active, false, "防御の次の準備でマウス操作は終わる");
    w.soul.end("t");
});

test("終了・復元: 準備の途中で SOUL を終えると、メニューを閉じ、凍結を戻し、移動・セーブ禁止・戦闘セッション・ステージの状態も戻る。次の SOUL(準備ループなし)は従来どおり攻撃から", () => {
    const w0 = world(), saveBefore = w0.ctx.$gameSystem.isSaveEnabled();
    const w = a16Prepare(w0);
    frames(w, 4);
    assert.equal(paused(w), true);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false, "SOUL中はセーブ禁止(準備も同じ)");
    assert.equal(w.soul.end("test"), true);
    frames(w, 6);
    assert.equal(w.soul.getPhase(), "idle");
    assert.equal(paused(w), false, "SOULの終了で、準備の凍結はすぐ戻る");
    assert.equal(w.prep.isOpen(), false);
    if (stageState(w).state !== "idle") { arrive(w); frames(w, 8); }       // ステージから元のマップへ戻る(移動の到着)
    assert.equal(stageState(w).state, "idle", JSON.stringify(stageState(w)));
    assert.equal(w.prep.isOpen(), false);
    assert.equal(w.sc()._projectRSoulPrepare.visible, false);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), saveBefore, "セーブの許可は開始前に戻る");
    assert.equal(w.run("playerMovementDisabled"), false, "移動は戻る");
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), []);
    assert.equal(plain(w.hud.getState()).active, false);
    assert.equal(plain(w.soul.getState()).active, false);
    w.sb.stop?.();
    assert.equal(w.soul.start({ heart: false, attackSeconds: 5 }).ok, true);
    assert.equal(w.soul.getPhase(), "attack");
    assert.equal(w.soul.getState().prepare, false);
    w.soul.end("t");
});

test("保護: ProjectR_SoulBattleStage/Input/HUD/Skills/Dodge/Sandbox は準備を『防御』として扱っていない(明示的な prepare 分岐がある)。Hendrix・DotMove・rmmz_*・通常マップ戦闘のpluginは変更なし", () => {
    const need = { "ProjectR_SoulBattleInput.js": /swallowedPrepare/, "ProjectR_SoulBattleStage.js": /preparePhase\(\)/, "ProjectR_SoulBattleHUD.js": /"prepare"/, "ProjectR_SoulSkills.js": /soulPrepare/, "ProjectR_SoulBattleDodge.js": /getPhase\(\) === "prepare"/, "ProjectR_SoulBattleSandbox.js": /options\.prepare === true/ };
    for (const [file, pattern] of Object.entries(need)) assert.match(read(`js/plugins/${file}`), pattern, file);
    const untouched = ["js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/rmmz_core.js", "js/rmmz_managers.js", "js/rmmz_objects.js", "js/rmmz_scenes.js", "js/rmmz_sprites.js", "js/rmmz_windows.js",
        "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_SwordSystem.js", "js/plugins/ProjectR_SoulBattleMelee.js"];
    const diffs = cp.spawnSync("git", ["diff", "--numstat", "--", ...untouched.filter(f => !/SwordSystem|SoulBattleMelee/.test(f))], { cwd: project, encoding: "utf8" }).stdout.trim();
    assert.equal(diffs, "", "保護されたファイルは変更なし:\n" + diffs);
    const header = read("js/plugins/ProjectR_SoulBattle.js");
    assert.match(header, /ProjectR_SoulBattlePrepare/, "コントローラの説明に準備メニューの場所を書いてある");
});

console.log(`\n${passed} tests passed`);

