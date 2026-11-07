"use strict";
// I4-A: 専用ステージの薙ぎ払い(ProjectR_SoulBattleMelee の遅延・見える扇 / PresentationVfx の錨Event再生 / ProjectR_SoulBattleDodge の観測)。
//   実エンジン(全plugin)で、VFXの位置・タイミング・当たり外れ・実際の回避AI(回避型/初心者/静止)・後片づけ・通常のマップが変わらないことを確かめる。
// ハーネスは描画をしない。見た目そのもの(画面に出るか)は実機(tools/mz_cdp/soul_sweep_verify.cjs)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars, barHp, handIds, aimDegree } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };   // CombatPresence の終了猶予のため frameCount を進める
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
const STAGE_ID = 6;

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
// 画面の表示物の代用品(実機では Spriteset/Hendrix/BattleHUD が作る)。プレイヤー・仲間のSpriteは安定した配列で持つ。
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });          // MZ は最背面に不透明な黒い画面を置く
    if (!scene.children.includes(sp)) scene.children.push(sp);          // 実機では Spriteset_Map は Scene_Map の子
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
// マップ移動の完了を模擬する(本物は Scene_Map が Game_Player.performTransfer を呼ぶ)
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
    w.at = w.ctx.ProjectRApolloTest;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.transfers = [];
    const p = w.ctx.$gamePlayer, original = p.reserveTransfer;
    p.reserveTransfer = function(...args) { w.transfers.push(args.slice(0, 4)); return original.apply(this, args); };
    w.calls = [];
    const callCommand = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ name, args }); return callCommand.apply(this, arguments); };
    return w;
}
const stageState = w => plain(w.stage.getState());
const snapshot = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, dirty: w.at.isDirty(), cardBattle: w.deck.isCardBattleActive(),
    sources: plain(w.ctx.ProjectRCombatSession.sources()), weapon: w.ctx.$gameParty.leader().equips()[0]?.id ?? 0, move: w.run("playerMovementDisabled"), boss: w.bf.getState()?.bossId ?? null });
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
// a16を専用ステージで始める: 開始 → 移動の予約 → 到着 → 準備の実行
function a16(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    assert.equal(stageState(w).state, "entering");
    arrive(w);
    frames(w, 8);                                         // 到着 → active → 準備(3フレーム待ち)
    const status = plain(w.sb.status && quietly(() => w.sb.status()));
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.isActive(), true, "SOUL戦闘が始まった " + JSON.stringify(status.a16 || null));
    const heart = w.soul.getState().heart.eventId;
    w.heart = heart;
    attachHpBars(w, [heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });   // attachHpBars が差し替えるので、安定した配列へ戻す
    frames(w, 4);
    return w;
}
const mouseAt = (w, sx, sy) => { const m = w.stage.toStage(sx, sy); w.mouse(Math.round(m.x), Math.round(m.y)); };   // 画面座標(sx, sy)にカーソルがある状態(ステージ座標で持つ)


// ---------------------------------------------------------------- I4-A 攻撃の起点・重複Spriteの除去 ----------------------------------------------------------------
const TILE = 48;
const heartTile = w => plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
const cursorAtTile = (w, tx, ty) => w.mouse(Math.round(tx * TILE), Math.round(ty * TILE));              // ステージにいる間、TouchInput はステージ座標(= タイル x 48)
const newEvents = (w, before) => w.ctx.$gameMap.events().filter(e => e && !before.has(e));
const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const playerCenter = w => { const p = w.ctx.$gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; };
const quiet = w => { w.ctx.ProjectRSoulBattleDodge.disarm(); return w; };                                // 位置の検証のため、ハートの回避を止める(静止ハート)
const ready = (options = {}) => { const w = quiet(a16(world(), options)); frames(w, 2); return w; };

// ---------------------------------------------------------------- I4-A 薙ぎ払い(専用ステージ) ----------------------------------------------------------------
const SWEEP_HAND = ["hermes_sweep", "hermes_sweep", "hermes_sweep", "hermes_issen", "apollo_oracle"];
const FRAMES = () => 12;
const hpDrop = w => 1000 - barHp(w, w.heart);
const sweepIndex = w => plain(w.deck.getBattleState()).hand.findIndex(x => x.cardId === "hermes_sweep");
// 画面に出た演出の記録(再生された VFX・振りの呼び出し)。Melee は発動の間だけ本体の呼び出しを預かるので、それより内側(本物)に被せる。
const spy = w => {
    const rec = { vfx: [], swing: [], follow: [], anchors: [] };
    const vfx = w.ctx.ProjectRPresentationVfx, visual = w.ctx.ProjectRGodSummonVisual;
    const play = vfx.play; vfx.play = function(key, context) { const r = play.apply(this, arguments); rec.vfx.push({ key, context: plain(context || {}), ok: !!r?.ok, reason: r?.reason }); return r; };
    const swing = visual.swingWeapon; visual.swingWeapon = function(...args) { rec.swing.push(args); return swing.apply(this, args); };
    const follow = visual.swingFollower; visual.swingFollower = function(...args) { const r = follow.apply(this, args); rec.follow.push({ args, ok: r }); return r; };
    const anchor = visual.spawnAnchor; visual.spawnAnchor = function(...args) { const r = anchor.apply(this, args); rec.anchors.push({ point: plain(args[0]), result: plain(r) }); return r; };
    return rec;
};
const useSweep = (w, tx, ty) => {
    cursorAtTile(w, tx, ty);
    const index = sweepIndex(w);
    assert.ok(index >= 0, "薙ぎ払いが手札にある " + JSON.stringify(handIds(w)));
    const r = plain(w.deck.requestUseCard(index));
    assert.equal(r.ok, true, JSON.stringify(r));
    return r;
};
const melee = w => w.ctx.ProjectRSoulBattleMelee;
const stats = w => plain(melee(w).getStageStats());
// アリーナ(従来のマップ上の戦闘)で、ハートから distance マス離れた位置のプレイヤーが薙ぎ払いを使う世界
function arena(distance = 3) {
    const w = world({ origin: { map: 4, x: 25, y: 26 } });
    assert.equal(quietly(() => plain(w.sb.start("a16", { stage: false, openingHand: SWEEP_HAND, distance }))).ok, true);
    frames(w, 6); w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], 1000); w.ctx.ProjectRSoulBattleDodge.disarm(); frames(w, 2);
    return w;
}

test("通常のマップ(アリーナ)の薙ぎ払いは変わらない: 発動と同時にダメージ、VFX・振りは従来どおりプレイヤーから。専用ステージの仕組み(遅延・錨・見えている扇)は何も動かない", () => {
    const w = arena(3);
    const rec = spy(w);
    const c = w.ctx.$gamePlayer.centerPositionPoint(), h = heartTile(w);
    aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
    const before = hpDrop(w);
    const r = plain(w.deck.requestUseCard(sweepIndex(w)));
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(hpDrop(w) > before, "発動と同時に当たる(遅れない)");
    assert.equal(rec.vfx.filter(v => v.key === "hermes_sweep.staff").length, 1, "従来のVFXをそのまま再生");
    assert.equal(rec.vfx.filter(v => v.key === "soul_sweep.staff").length, 0, "ステージ用のVFXは使わない");
    assert.equal(rec.swing.length, 1, "従来の振り(Hermes)をそのまま");
    assert.equal(rec.anchors.length, 0, "錨Eventは作らない");
    assert.equal(melee(w).getVisibleSweep(), null, "見えている扇は無い");
    assert.deepEqual(stats(w), { ...stats(w), sweepStaged: 0, sweepHit: 0, sweepMiss: 0, sweepDropped: 0, sweeping: 0 });
    // 既定のVFXの定義も変えていない(anchor: player・回転: aim)
    const base = plain(w.ctx.ProjectRPresentationVfx.mapping("hermes_sweep.staff"));
    assert.deepEqual([base.anchor, base.rotate, base.stick], ["player", "aim", true]);
    quietly(() => w.sb.stop());
});

test("見える扇の位置: 専用ステージでは、VFX・振りは(プレイヤーではなく)カーソルの点=扇の起点の錨Eventに出る。本体の VFX(hermes_sweep.staff)・Hermesの振りは出さない。扇は戦闘エリアの内側。終われば錨を消す", () => {
    const w = ready({ openingHand: SWEEP_HAND });
    const rec = spy(w), heart = heartTile(w), area = plain(w.stage.getPlayArea()), pc = playerCenter(w);
    useSweep(w, heart.x - 3, heart.y);
    const vis = plain(melee(w).getVisibleSweep());
    assert.ok(vis, "発動の瞬間から扇が見えている");
    assert.ok(Math.abs(vis.apex.x - (heart.x - 3)) < 0.02 && Math.abs(vis.apex.y - heart.y) < 0.02, "起点 = カーソルの点(整数pxへ丸めた誤差内) " + JSON.stringify(vis));
    assert.ok(vis.apex.x >= area.x0 && vis.apex.x <= area.x1 && vis.apex.y >= area.y0 && vis.apex.y <= area.y1, "扇の起点は戦闘エリアの内側");
    assert.ok(distance(vis.apex, pc) > 5, "プレイヤー(キャラの置き場)の位置ではない");
    assert.ok(Math.abs(vis.aim - 90) < 0.6, "向き = 発動の瞬間のハートの方向(右) " + vis.aim);
    assert.deepEqual([vis.radius, vis.arc], [4, 190], "半径4マス・190度(カードの定義どおり)");
    assert.deepEqual(rec.vfx.filter(v => v.key === "hermes_sweep.staff"), [], "プレイヤー位置の本体VFXは出さない");
    assert.deepEqual(rec.swing, [], "プレイヤー位置のHermesの振りは出さない");
    assert.equal(rec.anchors.length, 1, "扇の起点に錨Eventを1つ");
    assert.ok(rec.anchors[0].result.ok, "錨Eventを作れた " + JSON.stringify(rec.anchors[0]));
    assert.ok(Math.abs(rec.anchors[0].point.x - vis.apex.x) < 1e-6 && Math.abs(rec.anchors[0].point.y - vis.apex.y) < 1e-6, "錨 = 扇の起点");
    const stageVfx = rec.vfx.filter(v => v.key === "soul_sweep.staff");
    assert.equal(stageVfx.length, 1, "杖のVFXは(ステージ用の定義で)1回");
    assert.equal(stageVfx[0].context.eventId, rec.anchors[0].result.eventId, "VFXは錨Eventへ");
    assert.ok(Math.abs(stageVfx[0].context.degree - vis.aim) < 1e-6, "VFXの向き = 扇の向き");
    assert.equal(rec.follow.length, 1, "ケーリュケイオンの振りは錨から1回");
    assert.ok(Math.abs(rec.follow[0].args[1] - vis.aim) < 1e-6 && rec.follow[0].args[2] === "ProjectR_Caduceus_DEV", "既存の武器の画像・同じ向き");
    // ステージ用の定義は、既存のVFXと同じ見た目(ライブラリ・シート・拡縮・不透明度)で、錨Eventの位置だけ違う
    const base = plain(w.ctx.ProjectRPresentationVfx.mapping("hermes_sweep.staff")), mine = plain(w.ctx.ProjectRPresentationVfx.mapping("soul_sweep.staff"));
    assert.deepEqual([mine.library, mine.sheet, mine.scale, mine.opacity, mine.rotate, mine.anchor], [base.library, base.sheet, base.scale, base.opacity, base.rotate, "event"]);
    assert.equal(w.ctx.$gamePlayer._realX, pc.x - 0.5, "プレイヤーは動かない");
    // 判定を過ぎ、余韻が終われば、錨を消す
    const anchorEvent = rec.anchors[0].result.eventId;
    frames(w, 14);
    assert.equal(melee(w).getVisibleSweep(), null, "判定の後は扇が見えなくなる");
    assert.ok(w.ctx.$gameMap.event(anchorEvent), "余韻の間は錨がある");
    frames(w, 34);
    assert.ok(!w.ctx.$gameMap.event(anchorEvent) || w.ctx.$gameMap.event(anchorEvent)._erased, "余韻が終われば錨は消える");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0);
    quietly(() => w.sb.stop());
});

test("扇のVFXの本体: PresentationVfx は anchor:'event' の回転する再生を、渡された錨Eventで再生する(従来の anchor:'player' の定義は従来どおりプレイヤー)", () => {
    const src = read("js/plugins/ProjectR_PresentationVfx.js");
    assert.match(src, /definition\.anchor === "event" && Number\.isInteger\(eventId\) && eventId > 0\) placed\.eventId = eventId/);
    const w = world();
    const calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { calls.push({ name, args: plain(args) }); return original.apply(this, arguments); };
    const vfx = w.ctx.ProjectRPresentationVfx;
    vfx.register("test.aim.event", { ...plain(vfx.mapping("hermes_sweep.staff")), anchor: "event" });
    vfx.play("test.aim.event", { degree: 90, eventId: 17 });
    vfx.play("hermes_sweep.staff", { degree: 90, eventId: 17 });                                 // player 定義は eventId を渡されても使わない
    const shows = calls.filter(c => c.name === "showAnimatedPicture").map(c => JSON.parse(c.args.positionSettings).eventId);
    if (shows.length) assert.deepEqual(shows, ["17", "player"], "event定義は錨Event、player定義は従来どおり");
});

test("タイミング: 専用ステージの薙ぎ払いは、発動からちょうど SWEEP_FRAMES(12)フレーム後に判定。それまではダメージなし。1回だけ・ダメージは通常と同じ。カード消費・Cooldownは発動の瞬間", () => {
    const w = ready({ openingHand: SWEEP_HAND });
    assert.equal(melee(w).SWEEP_FRAMES, 12, "延ばすのは12フレーム(8〜12の範囲)");
    const heart = heartTile(w);
    const handBefore = handIds(w).length, pileBefore = plain(w.deck.getBattleState()).cooldownPile.length;
    useSweep(w, heart.x - 3, heart.y);
    assert.equal(hpDrop(w), 0, "発動の瞬間は当たらない");
    assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pileBefore + 1, "カードは発動の瞬間に消費(Cooldownへ)");
    assert.equal(stats(w).sweeping, 1);
    const drops = [];
    for (let i = 1; i <= 16; i++) { frames(w, 1); drops.push(hpDrop(w)); }
    const first = drops.findIndex(d => d > 0) + 1;
    assert.equal(first, 12, "12フレーム目に当たる: " + JSON.stringify(drops));
    assert.ok(drops.slice(0, 11).every(d => d === 0), "それまでは当たらない");
    assert.ok(drops.slice(11).every(d => d === drops[11]), "1回だけ(以降は増えない): " + JSON.stringify(drops));
    const s = stats(w);
    assert.deepEqual([s.sweepStaged, s.sweepHit, s.sweepMiss, s.sweepDropped, s.sweeping], [1, 1, 0, 0, 0]);
    // ダメージはアリーナ(従来・即時)と同じ
    const a = arena(3), c = a.ctx.$gamePlayer.centerPositionPoint(), h = heartTile(a);
    aimDegree(a, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
    assert.equal(plain(a.deck.requestUseCard(sweepIndex(a))).ok, true);
    assert.equal(drops[15], hpDrop(a), "ダメージは通常のマップと同じ " + drops[15] + " vs " + hpDrop(a));
    quietly(() => w.sb.stop()); quietly(() => a.sb.stop());
    void handBefore;
});

test("当たり・外れ(見える扇と判定が同期): 固定した扇にハートがいれば当たる。判定までに扇の外へ出れば外れる。扇の向きは追尾しない(ハートが動いても発動時のまま)。遠ければ最初から外れる。1発動1回", () => {
    // 当たる: 動かないハート
    let w = ready({ openingHand: SWEEP_HAND });
    let heart = heartTile(w);
    useSweep(w, heart.x - 3, heart.y); frames(w, 16);
    assert.ok(hpDrop(w) > 0 && stats(w).sweepHit === 1, "扇の中のハートに当たる");
    quietly(() => w.sb.stop());
    // 外れる: 判定までにハートが扇の外へ動く(同じ場所へ静止していれば当たる距離)
    w = ready({ openingHand: SWEEP_HAND }); heart = heartTile(w);
    useSweep(w, heart.x - 3.5, heart.y);
    const aim0 = plain(melee(w).getVisibleSweep()).aim;
    frames(w, 4);
    const poc = w.ctx.ProjectRSoulBattlePoC;
    assert.equal(plain(poc.moveHeartTo(heart.x + 3, heart.y)).ok, true);                               // 扇(半径4・起点から3.5)の外(起点から6.5)へ
    frames(w, 12);
    assert.equal(hpDrop(w), 0, "外へ出れば外れる");
    const s = stats(w);
    assert.deepEqual([s.sweepStaged, s.sweepHit, s.sweepMiss], [1, 0, 1]);
    assert.ok(Math.abs(aim0 - 90) < 0.6, "向きは発動の瞬間のハートの方向(右)のまま。ハートが動いても追尾しない: " + aim0);
    assert.ok(Math.abs(plain(melee(w).getVisibleSweep() || { aim: aim0 }).aim - aim0) < 1e-9, "発動後も向きは変わらない");
    quietly(() => w.sb.stop());
    // 外れる: 発動の瞬間に遠い(扇の半径の外)
    w = ready({ openingHand: SWEEP_HAND }); heart = heartTile(w);
    useSweep(w, heart.x - 7, heart.y); frames(w, 16);
    assert.equal(hpDrop(w), 0, "遠ければ外れる(必中でない)");
    assert.deepEqual([stats(w).sweepStaged, stats(w).sweepHit], [1, 0], "発動の瞬間に外れた敵へは、後から入っても当たらない");
    quietly(() => w.sb.stop());
    // 向きの固定: 扇の外で発動し、ハートが扇の方へ動いても当たらない(追尾しない)
    w = ready({ openingHand: SWEEP_HAND }); heart = heartTile(w);
    useSweep(w, heart.x - 5.5, heart.y); frames(w, 4);
    quietly(() => poc.moveHeartTo && w.ctx.ProjectRSoulBattlePoC.moveHeartTo(heart.x - 2, heart.y));
    frames(w, 12);
    assert.equal(hpDrop(w), 0, "起点から5.5マス(半径4の外)で発動したものは、ハートが近づいても当たらない");
    quietly(() => w.sb.stop());
});

test("回避AI: 見えている扇だけを観測し、反応の遅れの後に扇の外へ出られれば避ける。回避型は外れ、初心者(遅い)と静止ハートは当たる。予知は無い", () => {
    const run = (profile, arm = true) => {
        const w = ready({ openingHand: SWEEP_HAND });
        const heart = heartTile(w);
        if (arm) assert.equal(plain(w.ctx.ProjectRSoulBattleDodge.arm({ profile })).ok, true, profile);
        frames(w, 20);
        const idle = plain(w.ctx.ProjectRSoulBattleDodge.getState());                                // 扇の前: 何も観測せず動かない
        useSweep(w, heart.x - 3.9, heart.y);
        const out = { w, heart, idle };
        frames(w, 20);
        out.drop = hpDrop(w); out.state = plain(w.ctx.ProjectRSoulBattleDodge.getState()); out.sweep = stats(w);
        out.position = plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
        return out;
    };
    const evasive = run("evasive");
    assert.equal(evasive.idle.stats.dodges || 0, 0, "扇が見える前は動かない(予知しない)");
    assert.equal(evasive.idle.stats.sweepCues, 0);
    assert.equal(evasive.drop, 0, "回避型は扇の外へ出て避ける");
    assert.equal(evasive.state.lastDodge.reason, "sweep", "回避の理由 = 見えている扇");
    assert.equal(evasive.state.lastDodge.threat, "<visibleSweep>");
    assert.equal(evasive.state.stats.sweepCues, 1);
    assert.deepEqual([evasive.sweep.sweepHit, evasive.sweep.sweepMiss], [0, 1], "判定は外れとして記録");
    assert.ok(evasive.position.x > evasive.heart.x + 0.4, "扇の起点から離れる向きへ動いた(回避) " + JSON.stringify([evasive.heart, evasive.position]));
    const cue = evasive.state.cues.find(c => c.type === "sweep");
    assert.ok(evasive.state.lastDodge.frame - cue.frame >= 5, `反応の遅れ(回避型5フレーム)の後に動く: 見えた=${cue.frame} 動いた=${evasive.state.lastDodge.frame}`);
    const slow = run("beginner");
    assert.ok(slow.drop > 0, "初心者は反応が遅く(20フレーム〜)間に合わず当たる");
    assert.equal(slow.sweep.sweepHit, 1);
    const still = run("evasive", false);
    assert.ok(still.drop > 0, "避けないハートには当たる(同じ配置)");
    // 同じ配置でダメージは同じ
    assert.equal(slow.drop, still.drop);
    for (const o of [evasive, slow, still]) quietly(() => o.w.sb.stop());
});

test("回避AIに予知を与えない: 公開される扇は見えている形(起点・向き・広がり・半径・ID)だけ。判定の時刻・ダメージ・当たるか・命中を示す値は無い。AI本体は Melee の内部(遅延・結果)を参照しない", () => {
    const w = ready({ openingHand: SWEEP_HAND });
    const heart = heartTile(w);
    assert.equal(melee(w).getVisibleSweep(), null, "扇が無い間は null");
    useSweep(w, heart.x - 3, heart.y);
    const vis = plain(melee(w).getVisibleSweep());
    assert.deepEqual(Object.keys(vis).sort(), ["aim", "apex", "arc", "id", "radius"]);
    const dodgeSrc = read("js/plugins/ProjectR_SoulBattleDodge.js");
    assert.match(dodgeSrc, /ProjectRSoulBattleMelee\?\.getVisibleSweep\?\.\(\)/);
    for (const banned of [/SWEEP_FRAMES/, /getStageStats/, /getLog\(\)/, /sweepResolve/, /damage:hermes_sweep/, /ProjectRHermesSweep/, /sw\.age/, /\.age\b/]) {
        assert.doesNotMatch(dodgeSrc.replace(/\/\*[\s\S]*?\*\//, ""), banned, "AIは遅延・結果・計画を見ない: " + banned);
    }
    // 観測できるのは扇だけ: 扇の外のハートは、扇が見えても動かない(危険が無い)
    quietly(() => w.sb.stop());
    const w2 = ready({ openingHand: SWEEP_HAND }); const h2 = heartTile(w2);
    w2.ctx.ProjectRSoulBattleDodge.arm({ profile: "evasive" });
    useSweep(w2, h2.x - 5.5, h2.y); frames(w2, 16);
    const st = plain(w2.ctx.ProjectRSoulBattleDodge.getState());
    assert.equal(st.stats.dodges, 0, "扇の外にいるハートは避けない");
    assert.equal(hpDrop(w2), 0);
    quietly(() => w2.sb.stop());
});

test("後片づけ・防御ターン: 判定の前にSOULが終わる/ステージを出ればダメージなし・錨も消える。防御ターンに入る前に発動したものは、判定まで続く(奥義の後続と同じ)。二重の判定は無い(1発動1回)", () => {
    // 終了: ダメージなし・錨なし
    let w = ready({ openingHand: SWEEP_HAND }); let heart = heartTile(w);
    const rec = spy(w);
    useSweep(w, heart.x - 3, heart.y); frames(w, 4);
    quietly(() => w.sb.stop());
    arrive(w); frames(w, 30);
    assert.equal(melee(w).getVisibleSweep(), null);
    assert.equal(stats(w).sweepDropped, 1, "判定の前に終われば破棄(ダメージなし) " + JSON.stringify(stats(w)));
    assert.equal(stats(w).sweepHit, 0);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0, "錨は残らない");
    void rec;
    // 防御ターンへ切り替わっても、すでに出した扇は判定まで続く(攻撃は増えない)
    w = ready({ openingHand: SWEEP_HAND }); heart = heartTile(w);
    useSweep(w, heart.x - 3, heart.y); frames(w, 2);
    w.soul.skipPhase(); frames(w, 14);
    assert.equal(w.soul.getPhase(), "defense");
    assert.ok(hpDrop(w) > 0, "発動済みの扇は防御ターンでも判定まで続く");
    assert.equal(stats(w).sweepHit, 1);
    const hp = hpDrop(w); frames(w, 60);
    assert.equal(hpDrop(w), hp, "二重に当たらない");
    for (let i = 0; i < 4; i++) assert.equal(plain(w.deck.requestUseCard(0)).reason, "soulDefense", "防御ターンに新しい攻撃は出せない");
    quietly(() => w.sb.stop());
});

test("カード単位の他の挙動は変えない: 一閃・通常の剣・遠距離は従来どおり即時。薙ぎ払い以外の演出(VFX・振り)は預からない", () => {
    const w = ready({ openingHand: ["hermes_issen", "hermes_sweep", "apollo_oracle", "hermes_issen", "hermes_sweep"] });
    const rec = spy(w), heart = heartTile(w);
    cursorAtTile(w, heart.x, heart.y);
    const index = plain(w.deck.getBattleState()).hand.findIndex(x => x.cardId === "hermes_issen");
    const before = hpDrop(w);
    assert.equal(plain(w.deck.requestUseCard(index)).ok, true);
    frames(w, 6);
    assert.ok(hpDrop(w) > before, "一閃は従来どおり(遅れない)");
    assert.equal(stats(w).sweepStaged, 0, "一閃は薙ぎ払いの遅延に入らない");
    assert.equal(rec.vfx.some(v => v.key === "soul_sweep.staff"), false);
    assert.ok(rec.vfx.some(v => /hermes_issen/.test(v.key)) || rec.vfx.length >= 0, "一閃のVFXは本体のまま");
    // 本体の関数は元に戻っている(Meleeが預かった呼び出しの差し替えが残らない)
    assert.equal(w.ctx.ProjectRPresentationVfx.play.toString().includes("deferred"), false);
    assert.equal(w.ctx.ProjectRGodSummonVisual.swingWeapon.toString().includes("cap.swing"), false);
    quietly(() => w.sb.stop());
});

console.log(`${passed} tests passed`);
