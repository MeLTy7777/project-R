"use strict";
// I4-A: SOUL専用ステージ(ProjectR_SoulBattleStage + data/Map006.json)。実エンジン(全plugin)で、
//   移動(入る→戦う→戻る)・厳密な16:9・マウス座標の変換・プレイヤー非表示・防御ターンのハート・後片づけ(1回だけ)・I2/I3の戦闘の流れを確かめる。
// ハーネスは描画・実際のマップ移動をしない。移動は「予約が正しいか」+ performTransfer を手で呼んで到着を模擬する(arrive)。見た目と本物の移動は実機(tools/mz_cdp/soul_stage_verify.cjs)。
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

test("重複プレイヤーの出どころ: ProjectR_CutIn の CutInLayer.overlay(カード発動のカットイン中にプレイヤーSpriteを複製して重ねる)。専用ステージの間だけ描かず、カットイン本体(神の目・パネル)は描く。戻れば元の表示", () => {
    const src = read("js/plugins/ProjectR_CutIn.js");
    assert.match(src, /this\.overlay = new Sprite\(\); \/\/ 操作キャラクター本体の複製/, "複製の発生源");
    assert.match(src, /syncOverlay\(spriteset, visible\)[\s\S]*source\.visible !== false/, "元のSpriteの visible だけを見て複製する(renderable は見ない)");
    const w = a16(world());
    const sp = w.parts.sp;
    const overlay = { renderable: true, visible: true }, panel = { renderable: true, visible: true };
    sp._projectRCutInLayer = { overlay, views: new Map([["card:1", { container: panel }]]) };
    frames(w, 2);
    assert.equal(overlay.renderable, false, "プレイヤーの複製は戦闘エリアの中に出さない");
    assert.equal(panel.renderable, true, "カットインの本体(神の目・パネル)は描く");
    assert.equal(overlay.visible, true, "visible はカットイン側の管理のまま(触らない)");
    assert.ok(plain(w.stage.getState()).hiddenPlayerSprites >= 2);
    overlay.visible = false; frames(w, 1); overlay.visible = true; frames(w, 1);
    assert.equal(overlay.renderable, false);
    quietly(() => w.sb.stop()); arrive(w); frames(w, 3);
    assert.equal(overlay.renderable, true, "戻れば元の値");
    assert.equal(plain(w.stage.getState()).hiddenPlayerSprites, 0);
    const w2 = world();
    const ov2 = { renderable: true, visible: true }; w2.parts.sp._projectRCutInLayer = { overlay: ov2, views: new Map() };
    frames(w2, 5);
    assert.equal(ov2.renderable, true, "通常のマップ戦闘では複製をそのまま使う");
});

test("近接(通常の剣): 起点 = カーソル。判定はカーソルからハートの方向へ向き(ホーミング)、プレイヤーは動かない。ハートの真上なら当たり、遠ければ外れる(必中でない)。ダメージ・命中回数・幅・奥行・寿命は従来どおり", () => {
    const w = ready({ weapon: "sword" });
    const sword = w.ctx.ProjectRSwordSystem, cfg = sword.config;
    const swing = () => { frames(w, 30); const r = plain(sword.swing("test")); assert.equal(r.ok, true, JSON.stringify(r)); return r; };
    const player0 = [w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY];
    const hp0 = () => 1000 - barHp(w, w.heart);
    const heart = heartTile(w);
    const hitbox = () => { const h = plain(sword.getActiveHitboxes())[0]; return h && { ...h, ev: w.ctx.$gameMap.event(h.eventId) }; };
    // 1) カーソルがハートの真上: その位置に判定が置かれ、当たる
    cursorAtTile(w, heart.x, heart.y);
    swing(); frames(w, 1);
    let hb = hitbox();
    assert.ok(hb, "判定がある");
    let c = eventCenter(hb.ev);
    assert.ok(distance(c, heart) < 0.05, "カーソルの位置(= ハート)に置かれる " + JSON.stringify([c, heart]));
    frames(w, 6);
    const once = hp0();
    assert.ok(once > 0, "当たる");
    assert.equal(plain(sword.status()).hits, 1, "命中回数: 1回の斬撃で1回だけ");
    // 2) ホーミング: ハートの1マス左にカーソル。判定はハート(右)へ向き直り、当たる(上向きのままなら外れる)
    cursorAtTile(w, heart.x - 1, heart.y);
    const before2 = hp0();
    swing(); frames(w, 1);
    hb = hitbox(); c = eventCenter(hb.ev);
    assert.ok(Math.abs(hb.rotation - 90) < 0.6, "ハートの方向(右 = 90度)へ向く: " + hb.rotation);
    assert.ok(Math.abs(c.x - heart.x) < 0.05 && Math.abs(c.y - heart.y) < 0.05, "前方オフセットはハートまでの距離(1マス)を超えない: " + JSON.stringify(c));
    frames(w, 6);
    assert.ok(hp0() > before2, "ホーミングで当たる");
    assert.equal(hp0() - before2, once, "ダメージは従来どおり(同じ武器の1回分)");
    // 3) 遠いカーソル: 外れる(必中ではない)。判定はカーソルからハートの方向へ前方オフセット(1マス)だけ
    cursorAtTile(w, heart.x - 6, heart.y);
    const before3 = hp0();
    swing(); frames(w, 1);
    hb = hitbox(); c = eventCenter(hb.ev);
    assert.ok(Math.abs(hb.rotation - 90) < 0.6);
    assert.ok(Math.abs(c.x - (heart.x - 6 + cfg.forward)) < 0.05 && Math.abs(c.y - heart.y) < 0.05, "カーソルの1マス先: " + JSON.stringify(c));
    frames(w, 6);
    assert.equal(hp0(), before3, "届かなければ外れる");
    // 4) 範囲の外のカーソルは、遊べる範囲の縁へ収める
    const area = plain(w.stage.getPlayArea());
    w.mouse(-500, -500);
    const cur = plain(w.stage.getAttackCursor());
    assert.deepEqual([cur.x, cur.y, cur.clamped], [area.x0, area.y0, true]);
    swing(); frames(w, 1);
    hb = hitbox(); c = eventCenter(hb.ev);
    assert.ok(c.x >= area.x0 - 1e-6 && c.y >= area.y0 - 1e-6, "判定は遊べる範囲から出ない(起点が縁)");
    // 5) プレイヤーは動かない・判定の追尾は寿命の間だけ
    assert.deepEqual([w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], player0, "プレイヤーを動かさない");
    frames(w, 10);
    const stats = plain(w.ctx.ProjectRSoulBattleMelee.getStageStats());
    assert.ok(stats.cursorOrigin >= 4 && stats.homed >= 4 && stats.homing === 0, "追尾は寿命が終われば止まる " + JSON.stringify(stats));
    assert.equal(cfg.lifetime, 3);
    quietly(() => w.sb.stop());
});

test("近接のダメージはステージの有無で同じ: 同じ剣・同じ命中で、アリーナ(従来)と専用ステージの1回分のダメージが一致する", () => {
    const stageWorld = ready({ weapon: "sword" });
    const heart = heartTile(stageWorld);
    cursorAtTile(stageWorld, heart.x, heart.y);
    frames(stageWorld, 30);
    assert.equal(plain(stageWorld.ctx.ProjectRSwordSystem.swing("t")).ok, true);
    frames(stageWorld, 8);
    const stageDrop = 1000 - barHp(stageWorld, stageWorld.heart);
    const w = world({ origin: { map: 4, x: 25, y: 26 } });
    assert.equal(quietly(() => plain(w.sb.start("a16", { stage: false, weapon: "sword", openingHand: HAND, distance: 6 }))).ok, true);
    frames(w, 6); w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], 1000); w.ctx.ProjectRSoulBattleDodge.disarm(); frames(w, 2);
    const c = w.ctx.$gamePlayer.centerPositionPoint(), h = heartTile(w);
    aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y));
    assert.equal(plain(w.ctx.ProjectRSwordSystem.swing("t")).ok, true);
    frames(w, 8);
    const arenaDrop = 1000 - barHp(w, w.heart);
    assert.ok(stageDrop > 0 && arenaDrop > 0);
    assert.equal(stageDrop, arenaDrop, "ダメージは同じ");
    assert.equal(plain(w.ctx.ProjectRSoulBattleMelee.getStageStats()).cursorOrigin, 0, "アリーナでは従来どおり(カーソル起点にならない)");
    quietly(() => w.sb.stop());
});

test("近接カード(薙ぎ払い・一閃): 専用ステージではカーソル起点。ハートの近くなら当たり、遠ければ外れる。同期呼び出しの間だけ起点を差し替え、プレイヤーの座標・画面位置は必ず元へ戻る", () => {
    const hand = ["hermes_sweep", "hermes_issen", "hermes_issen", "apollo_oracle"];
    const useAt = (w, id, tx, ty) => {
        const index = plain(w.deck.getBattleState()).hand.findIndex(x => x.cardId === id);
        assert.ok(index >= 0, id + " が手札にある " + JSON.stringify(handIds(w)));
        cursorAtTile(w, tx, ty);
        const r = plain(w.deck.requestUseCard(index)); assert.ok(r.ok || r.pending, JSON.stringify(r));
        frames(w, 16);                                                                                  // 専用ステージの薙ぎ払いは判定まで SWEEP_FRAMES(12) かかる
    };
    // 薙ぎ払い: ハートの近くで当たる / 一閃: 11マスを超える遠さでは外れ、ハートの真上なら当たる
    const w = ready({ openingHand: hand });
    const heart = heartTile(w), anchor = plain(w.stage.layout()).playerCenter, area = plain(w.stage.getPlayArea());
    const hp = () => 1000 - barHp(w, w.heart);
    const screen0 = [w.ctx.$gamePlayer.screenX(), w.ctx.$gamePlayer.screenY()];
    let h0 = hp();
    useAt(w, "hermes_sweep", heart.x - 1, heart.y);
    assert.ok(hp() > h0, "薙ぎ払い: ハートの近くのカーソルで当たる");
    h0 = hp();
    useAt(w, "hermes_issen", heart.x, area.y1);                                                          // 下端(ハートから約14マス)
    assert.equal(hp(), h0, "一閃: 11マスを超える遠さでは外れる");
    h0 = hp();
    useAt(w, "hermes_issen", heart.x, heart.y);
    assert.ok(hp() > h0, "一閃: ハートの真上なら当たる");
    assert.deepEqual([w.ctx.$gamePlayer.screenX(), w.ctx.$gamePlayer.screenY()], screen0, "画面位置は元へ戻る");
    const pc = playerCenter(w);
    assert.ok(Math.abs(pc.x - anchor.x) < 1e-3 && Math.abs(pc.y - anchor.y) < 1e-3, "攻撃の起点(プレイヤー中心)は元のキャラの置き場 " + JSON.stringify([pc, anchor]));
    const stats = plain(w.ctx.ProjectRSoulBattleMelee.getStageStats());
    assert.ok(stats.sweepCursor >= 3 && stats.scoped === false, JSON.stringify(stats));
    quietly(() => w.sb.stop());
    // 薙ぎ払い: 遠ければ外れる
    const w2 = ready({ openingHand: hand });
    const heart2 = heartTile(w2), before = 1000 - barHp(w2, w2.heart);
    useAt(w2, "hermes_sweep", heart2.x - 7, heart2.y);
    assert.equal(1000 - barHp(w2, w2.heart), before, "薙ぎ払い: 遠ければ外れる(必中でない)");
    quietly(() => w2.sb.stop());
});

test("遠距離(銃): プレイヤー起点 = キャラの置き場から出る(神の置き場ではない)。弾の向きはキャラからカーソルへ。見える弾の軌道とダメージが一致する(カーソルがハートなら当たる・ずれれば外れる)", () => {
    const w = ready({ weapon: "gun" });
    const heart = heartTile(w), pc = playerCenter(w), god = plain(w.stage.layout()).godCenter;
    cursorAtTile(w, heart.x, heart.y);
    const before = new Set(w.ctx.$gameMap.events());
    const r = plain(w.ctx.ProjectRGunSystem.fire("test"));
    assert.equal(r.ok, true, JSON.stringify(r));
    const bullet = newEvents(w, before).find(e => String(e.event?.()?.note || "").includes("<projectRGunBullet>"));
    assert.ok(bullet, "弾が出た");
    const b = eventCenter(bullet);
    assert.ok(distance(b, pc) < 2.2, "弾は(見えない)プレイヤー = キャラの置き場から出る: " + JSON.stringify([b, pc]));
    assert.ok(distance(b, pc) < distance(b, god) - 2, "神の置き場からではない");
    assert.equal(w.ctx.$gamePlayer.centerPositionPoint().x, pc.x, "プレイヤーは動かない");
    const expectedDegree = (Math.atan2(heart.x - b.x, b.y - heart.y) * 180 / Math.PI + 360) % 360;
    const shown = ((bullet._rotation % 360) + 360) % 360;
    assert.ok(Math.abs(shown - expectedDegree) < 1.5 || Math.abs(Math.abs(shown - expectedDegree) - 360) < 1.5, `向きはカーソル(ハート)の方向: ${shown} vs ${expectedDegree}`);
    frames(w, 120);
    assert.ok(1000 - barHp(w, w.heart) > 0, "見える弾の軌道どおりハートに当たる");
    frames(w, 60);
    const hp1 = barHp(w, w.heart);
    cursorAtTile(w, heart.x + 8, heart.y);
    assert.equal(plain(w.ctx.ProjectRGunSystem.fire("test")).ok, true);
    frames(w, 120);
    assert.equal(barHp(w, w.heart), hp1, "ずれた狙いは外れる(必中ではない)");
    quietly(() => w.sb.stop());
});

// 神の遠距離カード: 発動の瞬間に、(選ばれている神のカードだけ)神の置き場から出す
const godCard = (card, godId = "apollo") => {
    const w = quiet(a16(world(), { openingHand: [card] }));
    const manager = w.ctx.ProjectRGodSummonManager;
    if (godId) { manager.hasPersistentUltimateBattleState = () => true; manager.getPersistentUltimateGodId = () => godId; }
    frames(w, 2);
    return w;
};
test("遠距離(神のカード): 選ばれている神のカードは、神の置き場から出る。起点は発動の同期処理の間だけ置き換わり、必ず元へ戻る", () => {
    const results = {};
    for (const card of ["apollo_eros_arrow", "apollo_golden_volley", "apollo_gigas_slayer", "apollo_plague_rain"]) {
        const w = godCard(card);
        const heart = heartTile(w), pc = playerCenter(w), god = plain(w.stage.layout()).godCenter;
        assert.equal(w.stage.godOriginFor(w.deck.definitions.card(card)).godId, "apollo", card + " は神の起点の対象");
        cursorAtTile(w, heart.x, heart.y);
        const before = new Set(w.ctx.$gameMap.events());
        const r = plain(w.deck.requestUseCard(0));
        assert.ok(r.ok || r.pending, card + " " + JSON.stringify(r));
        const spawned = [];
        for (let i = 0; i < 260; i++) { frames(w, 1); for (const e of newEvents(w, before)) { if (!spawned.includes(e)) { spawned.push(e); e._firstSeen = eventCenter(e); } } }
        const log = plain(w.stage.getOriginLog());
        const firsts = spawned.filter(e => /<projectR(GoldenVolley|ErosArrow|GigasArrow|PlagueArrow)>/.test(String(e.event?.()?.note || ""))).map(e => e._firstSeen);
        results[card] = { log: log.length, spawned: firsts.length, nearGod: firsts.filter(p => distance(p, god) < 2.2).length, nearChar: firsts.filter(p => distance(p, pc) < 2.2).length };
        const p = w.ctx.$gamePlayer;
        assert.ok(Math.abs(p._realX - (pc.x - 0.5)) < 1e-6 && Math.abs(p._realY - (pc.y - 0.5)) < 1e-6, card + ": プレイヤーの座標は元へ戻る");
        assert.ok(log.length >= 1 && log[log.length - 1].cardId === card, card + ": 神の起点を使った記録");
        quietly(() => w.sb.stop());
    }
    console.log("  神の起点の確認:", JSON.stringify(results));
    for (const card of Object.keys(results)) assert.equal(results[card].nearChar, 0, card + " はキャラの置き場からは出ない " + JSON.stringify(results[card]));
    for (const card of ["apollo_golden_volley", "apollo_eros_arrow", "apollo_plague_rain"]) assert.ok(results[card].nearGod >= 1, card + " は神の置き場から出る " + JSON.stringify(results[card]));   // ギガース殺しは長押しで溜めるカード(この発動の入力では矢は出ない。溜めの表示は神の置き場から出る)
});

test("神の起点の規則は既存データだけ: 選ばれていない神のカード・神のカード以外・SOULでないときは起点を変えない。例外が出ても座標は元へ戻る", () => {
    const w = godCard("apollo_golden_volley", null);
    const def = w.deck.definitions.card("apollo_golden_volley");
    const manager = w.ctx.ProjectRGodSummonManager;
    assert.equal(manager.hasPersistentUltimateBattleState() ? manager.getPersistentUltimateGodId() : w.deck.getUltimateRingId(), "hermes", "選ばれている神は hermes(既定)");
    assert.equal(w.stage.godOriginFor(def), null, "選ばれていない神のカードは対象外");
    const heart = heartTile(w), pc = playerCenter(w);
    cursorAtTile(w, heart.x, heart.y);
    const before = new Set(w.ctx.$gameMap.events());
    plain(w.deck.requestUseCard(0));
    frames(w, 6);
    const firsts = newEvents(w, before).filter(e => e.event?.()?.note?.includes("<attacker: player>")).map(eventCenter);
    assert.ok(firsts.length > 0 && firsts.every(p => distance(p, pc) < 3), "キャラの置き場から出る " + JSON.stringify(firsts.slice(0, 2)));
    assert.deepEqual(plain(w.stage.getOriginLog()), [], "起点の置き換えは起きない");
    for (const id of ["hermes_issen", "hermes_sweep", "apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus"]) assert.equal(w.stage.godOriginFor(w.deck.definitions.card(id)), null, id);
    manager.hasPersistentUltimateBattleState = () => true; manager.getPersistentUltimateGodId = () => "apollo";
    const p = w.ctx.$gamePlayer, saved = [p._realX, p._realY];
    let during = null;
    const result = manager.perform({ definition: def }, () => { during = [p._realX, p._realY]; throw new Error("boom"); });
    assert.equal(result.ok, false);
    assert.notDeepEqual(during, saved, "発動の間は神の置き場");
    assert.deepEqual([p._realX, p._realY], saved, "例外でも元へ戻る");
    quietly(() => w.sb.stop()); arrive(w); frames(w, 3);
    assert.equal(w.stage.godOriginFor(def), null, "SOULでなければ対象外");
});

test("神の起点の置き換えは、カードの召喚が生きている間の毎フレームの更新の間だけ。フレームの終わりには必ず元の座標。その間の銃の入力はキャラの置き場から出る(銃はキャラ起点のまま)", () => {
    const w = quiet(a16(world(), { weapon: "gun", openingHand: ["apollo_eros_arrow"] }));
    const manager = w.ctx.ProjectRGodSummonManager;
    manager.hasPersistentUltimateBattleState = () => true; manager.getPersistentUltimateGodId = () => "apollo";
    frames(w, 2);
    const heart = heartTile(w), pc = playerCenter(w), god = plain(w.stage.layout()).godCenter, p = w.ctx.$gamePlayer;
    const anchor = [p._realX, p._realY];
    cursorAtTile(w, heart.x, heart.y);
    // 更新の途中(置き換え中)に、銃の入力(CE1の予約 = 通常攻撃)を1回出す
    const Map_ = w.ctx.Game_Map.prototype, original = Map_.update;
    let fired = null, seenSwapped = 0;
    Map_.update = function() {
        if (w.stage.isOriginSwapped()) seenSwapped++;
        if (seenSwapped >= 3 && !fired) {
            const before = new Set(w.ctx.$gameMap.events());
            w.attackClick();
            const bullet = newEvents(w, before).find(e => String(e.event?.()?.note || "").includes("<projectRGunBullet>"));
            fired = bullet ? eventCenter(bullet) : false;                              // 出た瞬間の位置を記録する
        }
        return original.apply(this, arguments);
    };
    try {
        assert.ok(plain(w.deck.requestUseCard(0)).pending);
        for (let i = 0; i < 40; i++) {
            frames(w, 1);
            assert.deepEqual([p._realX, p._realY], anchor, "フレームの終わりには必ず元の座標(" + i + ")");
            assert.equal(w.stage.isOriginSwapped(), false);
        }
    } finally { Map_.update = original; }
    assert.ok(w.stage.getOriginStats().swappedFrames > 3, "召喚が生きている間は置き換わった: " + JSON.stringify(w.stage.getOriginStats()));
    assert.ok(fired, "置き換え中に銃弾が出た");
    const b = fired;
    assert.ok(distance(b, pc) < 2.2 && distance(b, god) > 3, "銃弾はキャラの置き場から出る(神の置き場ではない): " + JSON.stringify([b, pc, god]));
    // 召喚が終われば置き換えは起きない
    frames(w, 400);
    const swappedBefore = w.stage.getOriginStats().swappedFrames;
    frames(w, 20);
    assert.equal(w.stage.getOriginStats().swappedFrames, swappedBefore, "召喚が無い間は置き換えない");
    quietly(() => w.sb.stop());
    assert.equal(w.stage.isOriginSwapped(), false);
});

test("フェーズの切り替え: 攻撃⇔防御を繰り返しても、遊べる範囲・マウスの範囲・攻撃の起点(キャラ/神の位置)・見えないプレイヤーの座標は変わらない。防御中の発動は遮断される", () => {
    const w = ready();
    const snapshot = () => JSON.stringify({ vp: plain(w.stage.getViewport()), area: plain(w.stage.getPlayArea()), zones: plain(w.stage.getRepZones()), layout: plain(w.stage.layout()), player: [w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY] });
    const first = snapshot();
    for (let i = 0; i < 4; i++) {
        w.soul.skipPhase(); frames(w, 3);
        assert.equal(snapshot(), first, "周回" + i + " " + w.soul.getPhase());
    }
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(plain(w.deck.requestUseCard(0)).reason, "soulDefense");
    assert.equal(plain(w.ctx.ProjectRSoulBattleMelee.getStageStats()).cursorOrigin, 0);
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.soul.getPhase(), "attack");
    quietly(() => w.sb.stop());
});

console.log(`\n${passed} tests passed`);
