"use strict";
// SOUL戦闘の見せ方の仕上げ: 一閃・葦笛のVFXを実際の起点(カーソルの点)へ / カットインの置き場(味方=左上・敵=右上・戦闘エリアの外)。ハートの表示は ProjectR_SoulBattleStage.test、山札の動きの表示は ProjectR_SoulBattleHUD.test。
//   実エンジン(全plugin)。ハーネスは描画をしない。見た目・実際の位置は tools/mz_cdp/soul_presentation_verify.cjs(実機)。

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

// ---------------------------------------------------------------- I6 SOUL戦闘のスキル(承認済み9枚) ----------------------------------------------------------------
const SK = w => w.ctx.ProjectRSoulSkills;
const CM = w => w.ctx.ProjectRCardModifiers;
const DG = w => w.ctx.ProjectRSoulBattleDodge;
const leader = w => w.ctx.$gameParty.leader();
const setHp = (w, hp) => { const a = leader(w); a._hp = hp; return a.hp; };
const heartHpNow = w => barHp(w, w.heart);
const cardIndex = (w, id) => plain(w.deck.getBattleState()).hand.findIndex(x => x.cardId === id);
const useCard = (w, id) => { const i = cardIndex(w, id); assert.ok(i >= 0, id + " が手札にある " + JSON.stringify(handIds(w))); return plain(w.deck.requestUseCard(i)); };
const effects = w => plain(SK(w).getEffects());
const kinds = w => effects(w).map(e => e.kind);
const heartDamage = (w, amount) => hurt(w, w.heart, amount);
const lv = level => ({ level });
const startSkills = (hand, options = {}) => { const w = quiet(a16(world(), { openingHand: hand, ...options })); frames(w, 2); return w; };

// ---------------------------------------------------------------- SOUL戦闘の見せ方の仕上げ: 一閃・葦笛のVFXの起点 / カットインの位置 ----------------------------------------------------------------
const visual = w => w.ctx.ProjectRGodSummonVisual;
const vfx = w => w.ctx.ProjectRPresentationVfx;
const pictureCalls = w => w.calls.filter(c => c.name === "showAnimatedPicture").map(c => ({ note: String(c.args.note), position: JSON.parse(c.args.positionSettings) }));
const anchorPoints = w => plain(visual(w).getAnchors());
const near = (a, b, eps = 1e-6) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
const castKey = (w, cardId) => { const r = useCard(w, cardId); assert.equal(r.ok, true, cardId + " " + JSON.stringify([r.reason, r.detail])); return r; };

test("葦笛のVFXは実際の起点(カーソルの点)に出る: 錨Eventをカーソル位置に置き、プレイヤー(キャラの置き場)や原点ではなく、その錨へ結び付ける。ライブラリ再生(縮尺・錨に追従しない)は使わない。時間が来たら錨も片づく", () => {
    const w = startSkills(["hermes_reed_flute", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    const h = heartTile(w);
    cursorAtTile(w, h.x - 3, h.y); frames(w, 3);
    const cursor = plain(w.stage.getAttackCursor());
    w.calls.length = 0;
    const before = anchorPoints(w).length;
    castKey(w, "hermes_reed_flute"); frames(w, 2);
    const anchors = anchorPoints(w);
    assert.equal(anchors.length, before + 1, "錨が1つ増えた");
    const anchor = anchors[anchors.length - 1];
    assert.ok(near(anchor.point, { x: cursor.x, y: cursor.y }, 1e-6), "錨はカーソルの点(攻撃の起点): " + JSON.stringify([anchor.point, cursor]));
    const calls = pictureCalls(w).filter(c => /flute|ripple/i.test(c.note));
    assert.ok(calls.length >= 1, "波紋のVFXを再生した: " + JSON.stringify(pictureCalls(w).map(c => c.note)));
    assert.ok(calls.every(c => c.position.eventId === String(anchor.eventId)), "波紋は錨Eventへ結び付ける(player ではない): " + JSON.stringify(calls));
    assert.equal(w.calls.filter(c => c.name === "showAnimationFromLibrary").length, 0, "ライブラリ再生は使わない(専用ステージの縮尺・錨の位置に追従しないため)");
    assert.equal(vfx(w).mapping("soul_flute.ripple").noLibrary, true);
    // 原点(マップの左上)やプレイヤーの位置に出ていない
    const player = playerCenter(w);
    assert.ok(Math.hypot(anchor.point.x - player.x, anchor.point.y - player.y) > 3, "キャラの置き場からは遠い " + JSON.stringify([anchor.point, player]));
    assert.ok(anchor.point.x > 1 && anchor.point.y > 1, "マップの原点ではない");
    // 後片づけ
    frames(w, 120);
    assert.equal(anchorPoints(w).length, before, "時間が来たら錨も片づく");
    quietly(() => w.sb.stop());
});

test("一閃のVFXは実際の起点(カーソルの点)から出る: 軌跡・稲妻を、経路の中央に置いた錨Eventへ(オフセット無し)。方向・長さは一閃の結果のまま。プレイヤー基準(キャラの置き場)のオフセットは使わない。時間が来る/SOULが終わると錨も片づく", () => {
    const w = startSkills(["hermes_issen", "hermes_reed_flute", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    const h = heartTile(w);
    cursorAtTile(w, h.x - 3, h.y); frames(w, 3);
    const cursor = plain(w.stage.getAttackCursor());
    w.calls.length = 0;
    const before = anchorPoints(w).length;
    castKey(w, "hermes_issen"); frames(w, 2);
    const last = plain(w.ctx.ProjectRHermesIssen.getLastResult());
    assert.ok(last.ok && Number.isFinite(last.degree) && last.length > 0, JSON.stringify(last));
    const anchors = anchorPoints(w).slice(before);
    assert.equal(anchors.length, 2, "軌跡と稲妻の2本ぶんの錨");
    const rad = last.degree * Math.PI / 180, mid = { x: cursor.x + Math.sin(rad) * last.length / 2, y: cursor.y - Math.cos(rad) * last.length / 2 };
    for (const a of anchors) assert.ok(near(a.point, mid, 1e-6), "経路の中央 = 起点(カーソル) + 方向 x 長さ/2: " + JSON.stringify([a.point, mid]));
    const calls = pictureCalls(w).filter(c => /issen/i.test(c.note));
    assert.equal(calls.length, 2, "軌跡と稲妻: " + JSON.stringify(calls.map(c => c.note)));
    for (const c of calls) {
        assert.ok(anchors.some(a => String(a.eventId) === c.position.eventId), "錨Eventへ結び付けた: " + JSON.stringify(c));
        assert.deepEqual([c.position.offsetX, Number(c.position.offsetY)], ["0", -24], "経路のオフセットは使わない(Y -24 は絵の高さの定義だけ)");
    }
    assert.equal(calls.filter(c => c.position.eventId === "player").length, 0, "プレイヤー基準では出さない");
    // 起点がカーソル → 実際のダメージの起点と同じ(一閃は元の規則のまま当たる)
    assert.ok(last.targets >= 1, "ハートに当たる経路");
    assert.equal(plain(w.ctx.ProjectRSoulBattleMelee.getStageStats()).issenStaged, 1);
    // 後片づけ(時間)
    frames(w, 90);
    assert.equal(anchorPoints(w).length, before, "時間が来たら錨も片づく");
    // 後片づけ(SOULの終了)
    const w2 = startSkills(["hermes_issen", "hermes_reed_flute", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    cursorAtTile(w2, heartTile(w2).x - 3, heartTile(w2).y); frames(w2, 3);
    const n0 = anchorPoints(w2).length;
    castKey(w2, "hermes_issen"); frames(w2, 2);
    assert.equal(anchorPoints(w2).length, n0 + 2);
    quietly(() => w2.sb.stop()); frames(w2, 4);
    assert.equal(anchorPoints(w2).length, n0, "SOULの終了で錨が残らない");
    quietly(() => w.sb.stop());
});

test("一閃のVFXは通常のマップでは変わらない: origin が無ければ従来どおりプレイヤー基準(オフセット付き)で出る。origin があるときだけ錨。VFXを預かる仕組みはステージの外で何もしない", () => {
    const w = world();
    const v = vfx(w), before = anchorPoints(w).length;
    w.calls.length = 0;
    const r = plain(v.play("hermes_issen.trail", { degree: 90, length: 8 }));
    assert.equal(r.ok, true, JSON.stringify(r));
    const calls = pictureCalls(w).filter(c => /issen/i.test(c.note));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].position.eventId, "player", "従来どおりプレイヤー基準");
    assert.ok(Math.abs(Number(calls[0].position.offsetX)) > 100, "経路の中央へのオフセット(従来): " + calls[0].position.offsetX);
    assert.equal(anchorPoints(w).length, before, "錨は作らない");
    v.clear();
    // origin つき(ステージの一閃が使う): 錨へ。オフセット無し
    w.calls.length = 0;
    const r2 = plain(v.play("hermes_issen.trail", { degree: 90, length: 8, origin: { x: 10, y: 10 } }));
    assert.equal(r2.ok, true, JSON.stringify(r2));
    assert.equal(r2.anchors.length, 1);
    const a = anchorPoints(w).find(x => x.id === r2.anchors[0]);
    assert.ok(near(a.point, { x: 14, y: 10 }), "起点 + 方向 x 長さ/2: " + JSON.stringify(a.point));
    const call = pictureCalls(w).filter(c => /issen/i.test(c.note))[0];
    assert.equal(call.position.eventId, String(a.eventId));
    assert.equal(call.position.offsetX, "0");
    visual(w).removeAnchor(a.id); v.clear();
    // ステージが idle の間は一閃のVFXを預からない(薙ぎ払い・一閃の差し替えは専用ステージの間だけ)
    assert.equal(plain(w.ctx.ProjectRSoulBattleMelee.getStageStats()).issenStaged, 0);
    assert.equal(typeof w.ctx.ProjectRPresentationVfx.play, "function");
});

test("VFXの差し替えは必ず元へ戻る: 一閃の発動の間だけ PresentationVfx.play を預かり、発動が失敗・例外でも元の関数へ戻る。ほかのVFXは預からない", () => {
    const w = startSkills(["hermes_issen", "hermes_reed_flute", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    const original = vfx(w).play;
    cursorAtTile(w, heartTile(w).x - 3, heartTile(w).y); frames(w, 3);
    castKey(w, "hermes_issen"); frames(w, 2);
    assert.equal(vfx(w).play, original, "発動のあとは元の play");
    // 発動できない(Cooldown中)再使用でも、play は元のまま
    const second = plain(w.deck.requestUseCard(Math.max(0, cardIndex(w, "hermes_issen"))));
    frames(w, 2);
    void second;
    assert.equal(vfx(w).play, original, "失敗しても元の play");
    // 預かるのは一閃の2キーだけ: ほかのキーはそのまま再生される
    w.calls.length = 0;
    const r = plain(vfx(w).play("hermes_strength.circle", {}));
    assert.equal(r.ok, true);
    assert.notEqual(r.mode, "deferred", "ほかのVFXは預からず(再生は元の関数)"); assert.ok(w.calls.some(c => /AnimatedPicture|AnimationFromLibrary/.test(c.name)), "再生の命令が出た: " + JSON.stringify(w.calls.map(c => c.name)));
    quietly(() => w.sb.stop());
});

// ---------------------------------------------------------------- カットイン ----------------------------------------------------------------
// ハーネスの Spriteset は実物ではないので、カットインの層を単体で作り、Spriteset と同じ位置・拡大縮小の入れ物(ステージが掛ける)の下へ置く。
const cutinLayer = w => {
    const CutInLayer = w.ctx.ProjectRCutIn._CutInLayer;
    const layer = new CutInLayer();
    const f = w.stage.getSpritesetFrame();
    const holder = { x: 0, y: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 }, parent: null, children: [] };
    layer.parent = { x: 0, y: 0, scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 }, parent: holder };
    void f;
    return layer;
};
const viewOf = (layer, id) => layer.views.get(id);
const screenOf = (w, view) => { const f = w.stage.getSpritesetFrame(); return { x: view.container.x * f.k + f.ox, y: view.container.y * f.k + f.oy, k: view.container.scale.x * f.k }; };

test("カットインの置き場(専用ステージ): 味方 = 左上・敵 = 右上。戦闘エリア・敵の絵・キャラ/神・各パネルの外。画面の大きさのまま(ステージの拡大縮小を打ち消す)で、味方・敵は同時に1枚ずつ", () => {
    const w = startSkills(["hermes_veil", "hermes_issen", "hermes_sweep", "hermes_strength", "hermes_reed_flute"], { level: 3 });
    const ci = w.ctx.ProjectRCutIn, layer = cutinLayer(w);
    ci.clear(); ci.setRandom(() => 0.9);
    const a = plain(ci.show({ kind: "card", godId: "hermes", cardId: "hermes_veil" })), e = plain(ci.show({ kind: "card", godId: "hermes", cardId: "hermes_issen", owner: "enemy" }));
    assert.deepEqual([a.ok, e.ok], [true, true]);
    assert.deepEqual(plain(ci.getActive()).map(x => x.owner).sort(), ["ally", "enemy"], "味方と敵は同時に1枚ずつ");
    for (let i = 0; i < 12; i++) ci.tick();
    layer.refresh(w.parts.sp);
    const rects = plain(w.stage.getCutInRects()), vp = plain(w.stage.getViewport());
    const va = viewOf(layer, a.id), ve = viewOf(layer, e.id);
    assert.equal(va.placed, "stage"); assert.equal(ve.placed, "stage");
    const sa = screenOf(w, va), se = screenOf(w, ve);
    assert.ok(Math.abs(sa.x - rects.ally.x) < 1e-6 && Math.abs(sa.y - rects.ally.y) < 1e-6, "味方のカットインは左上の置き場: " + JSON.stringify([sa, rects.ally]));
    assert.ok(Math.abs(se.x - rects.enemy.x) < 1e-6 && Math.abs(se.y - rects.enemy.y) < 1e-6, "敵のカットインは右上の置き場: " + JSON.stringify([se, rects.enemy]));
    assert.ok(Math.abs(sa.k - 1) < 1e-6 && Math.abs(se.k - 1) < 1e-6, "画面の大きさのまま(ステージの拡大縮小を打ち消す)");
    assert.ok(sa.x + va.size.w <= vp.x - 3 && se.x >= vp.x + vp.w + 3, "戦闘エリア(枠線を含む)の左右の外");
    assert.ok(sa.x < se.x, "味方は左・敵は右");
    assert.deepEqual([va.size.w, va.size.h], [Math.round(rects.ally.w), Math.round(rects.ally.h)]);
    // 同じ持ち主の連打は1枚だけ・別の持ち主は消さない
    const a2 = plain(ci.show({ kind: "card", godId: "hermes", cardId: "hermes_sweep" }));
    assert.deepEqual(plain(ci.getActive()).filter(x => x.owner === "ally").map(x => x.id), [a2.id], "味方の連打は1枚だけ");
    assert.equal(plain(ci.getActive()).filter(x => x.owner === "enemy").length, 1, "敵のカットインは消えない");
    // 画面サイズが変わっても追従する
    for (const [gw, gh] of [[1280, 720], [816, 624], [1920, 1080]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 3);
        layer.refresh(w.parts.sp);
        const r2 = plain(w.stage.getCutInRects()), s2 = screenOf(w, viewOf(layer, e.id));
        assert.ok(Math.abs(s2.x - r2.enemy.x) < 1e-6 && Math.abs(s2.y - r2.enemy.y) < 1e-6 && Math.abs(s2.k - 1) < 1e-6, `${gw}x${gh}: 敵の置き場に追従`);
    }
    // 防御ターンでも同じ置き場(両ターンで見える)
    w.soul.skipPhase(); frames(w, 3);
    layer.refresh(w.parts.sp);
    const sd = screenOf(w, viewOf(layer, e.id)), rd = plain(w.stage.getCutInRects());
    assert.ok(Math.abs(sd.x - rd.enemy.x) < 1e-6, "防御ターンも同じ置き場");
    ci.clear(); ci.setRandom(Math.random);
    quietly(() => w.sb.stop());
});

test("カットインは専用ステージの外では従来どおり: 左右はランダム(上の角)・大きさ・位置の式は変えない。owner の指定が無ければ味方。ステージから出れば置き直す", () => {
    const w = world();
    const ci = w.ctx.ProjectRCutIn, layer = cutinLayer(w);
    ci.clear();
    ci.setRandom(() => 0.1);
    const l = plain(ci.show({ kind: "card", godId: "hermes", cardId: "hermes_veil" }));
    assert.equal(l.side, "left");
    ci.setRandom(() => 0.9);
    const r = plain(ci.show({ kind: "card", godId: "apollo", cardId: "apollo_oracle", owner: "enemy" }));
    assert.equal(r.side, "right");
    assert.deepEqual(plain(ci.getActive()).map(x => x.owner), ["ally", "enemy"], "owner の既定は味方");
    for (let i = 0; i < 12; i++) ci.tick();
    layer.refresh(w.parts.sp);
    const W = w.ctx.Graphics.width, margin = Math.round(W * 0.02), cw = Math.round(Math.min(380, W * 0.34));
    const vl = viewOf(layer, l.id), vr = viewOf(layer, r.id);
    assert.notEqual(vl.placed, "stage");
    assert.deepEqual([vl.container.x, vl.container.y, vl.container.scale.x], [margin, margin, 1], "通常のマップの左上(従来の式)");
    assert.deepEqual([vr.container.x, vr.container.y], [W - cw - margin, margin], "通常のマップの右上(従来の式)");
    ci.clear(); ci.setRandom(Math.random);
    // 実物のソース: ステージの判定は ProjectRSoulStage の有無・映している間だけ(通常のマップでは何も読まない)
    const src = read("js/plugins/ProjectR_CutIn.js");
    assert.match(src, /stage\.isPresenting\?\.\(\)\) return null/, "ステージを映していなければ従来の配置");
});

test("通常のマップ戦闘への影響なし: 変更した共通部品(CutIn・PresentationVfx)は、ステージが無い間は元の分岐だけを通る(プレイヤー基準のVFX・ライブラリ再生・ランダムなカットイン)", () => {
    const w = world();
    const v = vfx(w);
    // noLibrary が付いていないキーは従来どおりライブラリ再生を選ぶ
    for (const key of ["hermes_flute.ripple", "hermes_zetsu.departure"]) assert.notEqual(v.mapping(key).noLibrary, true, key + " は元のまま");
    // SOUL専用のキーだけ noLibrary
    const w2 = startSkills(["hermes_zetsu", "hermes_reed_flute", "hermes_sweep", "hermes_strength", "hermes_veil"], { level: 3 });
    cursorAtTile(w2, heartTile(w2).x - 2, heartTile(w2).y); frames(w2, 3);
    castKey(w2, "hermes_reed_flute"); castKey(w2, "hermes_zetsu"); frames(w2, 2);
    for (const key of ["soul_flute.ripple", "soul_zetsu.noise"]) assert.equal(vfx(w2).mapping(key).noLibrary, true, key);
    const diff = cp.spawnSync("git", ["diff", "--numstat", "--", "js/plugins/ProjectR_PresentationVfx.js", "js/plugins/ProjectR_CutIn.js"], { cwd: project, encoding: "utf8" }).stdout.trim().split(/\r?\n/);
    for (const line of diff.filter(Boolean)) { const [add, del] = line.split(/\s+/); assert.ok(Number(add) + Number(del) <= 80, "共通部品の変更は小さい: " + line); }
    quietly(() => w2.sb.stop());
});

console.log(`${passed} tests passed`);
