"use strict";
// I5: SOUL戦闘の入力(ProjectR_SoulBattleInput): ATTACKのカード枠=Q/W/E/R/T・通常攻撃=左クリック(戦闘エリアの中だけ)・銃の自動リロード・DEFENSEの遮断・竪琴のクリック・HUDのキー表示。
//   実エンジン(全plugin・Hendrixの攻撃ボタン設定を含む)で、キー・クリックを実際の入力経路(Input._onKeyDown / TouchInput._onTrigger)から入れて確かめる。
// ハーネスは描画をしない。実機の入力は tools/mz_cdp/soul_input_verify.cjs。
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

// ---------------------------------------------------------------- I5 SOUL戦闘の入力 ----------------------------------------------------------------
const IN = w => w.ctx.ProjectRSoulInput;
const CBI = w => w.ctx.ProjectRCardBattleInput;
const HAND5 = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];
const KEYS5 = [["KeyQ", 81], ["KeyW", 87], ["KeyE", 69], ["KeyR", 82], ["KeyT", 84]];
const swings = w => w.ctx.ProjectRSwordSystem.status().swings;
const handNow = w => handIds(w);
// 画面座標(戦闘エリアの中央など)をクリックする。実際の流れ: TouchInput の押下 → 次のフレームで Hendrix の攻撃ボタン(leftclick)→ 共通イベント1の予約 → 全pluginの連鎖
const clickAt = (w, sx, sy) => { const p = w.stage.toStage(sx, sy); w.ctx.TouchInput._onTrigger(Math.round(p.x), Math.round(p.y)); frames(w, 1); };
const areaCenter = w => { const vp = plain(w.stage.getViewport()); return { x: vp.x + vp.w / 2, y: vp.y + vp.h / 2, vp }; };

test("登録と範囲: 新しい入力pluginは CardBattleInput・GunSystem・竪琴・剣・SOULの後、ステージの後・HUDの前に1回だけ。保護されたファイルは変更しない。通常の入力は変えない(SOULが動いていない間は何もしない)", () => {
    const names = (() => { const c = {}; vm.runInNewContext(read("js/plugins.js"), c); return c.$plugins.map(p => p.name); })();
    assert.equal(names.filter(n => n === "ProjectR_SoulBattleInput").length, 1);
    const i = names.indexOf("ProjectR_SoulBattleInput");
    for (const dep of ["ProjectR_CardBattleInput", "ProjectR_GunSystem", "ProjectR_ApolloLyreRhythm", "ProjectR_SwordSystem", "ProjectR_SoulBattle", "ProjectR_SoulBattleStage", "ProjectR_CombatPresence"]) assert.ok(names.indexOf(dep) >= 0 && names.indexOf(dep) < i, dep + " より後");
    assert.ok(i < names.indexOf("ProjectR_SoulBattleHUD"), "HUDより前");
    const code = read("js/plugins/ProjectR_SoulBattleInput.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|\$gameSystem|StorageManager|saveGame|requestUseCard|startCardBattle|\.setHp|gainHp|keyMapper\s*\[|keyMapper\s*=/, "ダメージ・セーブ・カード消費・keyMapperを触らない");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Keyboard_Gamepad.js", "js/plugins/Hendrix_Action_Engine.js", "data/Skills.json", "data/Weapons.json"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
    // SOULが動いていない間は、キーを何も読み替えず・捨てない
    const w = world();
    assert.equal(IN(w).isActive(), false);
    const before = JSON.stringify(plain(IN(w).getStats()));
    for (const [code, key] of [["KeyQ", 81], ["KeyW", 87], ["KeyX", 88], ["KeyC", 67], ["KeyJ", 74]]) { w.keyDown(code, key); w.keyUp(code, key); }
    assert.equal(JSON.stringify(plain(IN(w).getStats())), before, "SOULの外では何も数えない・捨てない");
    assert.deepEqual(plain(CBI(w).getKeyLabels()), ["Q", "E", "X", "C", "V"], "通常のカード戦闘のキー表示は変わらない");
    assert.deepEqual(plain(IN(w).getKeyLabels()), ["Q", "W", "E", "R", "T"]);
});

test("ATTACKのカード枠1〜5 = Q/W/E/R/T(左から順)。押すとその枠のカードの要求が受け付けられる。旧キー X/C/V は何もしない", () => {
    const w = ready({ openingHand: HAND5 });
    assert.deepEqual(plain(w.hud.getViewModel().hand.map(s => s.key)), ["Q", "W", "E", "R", "T"], "HUDのキー表示");
    KEYS5.forEach(([code, keyCode], slot) => {
        const keyDowns = plain(CBI(w).getDiagnostics()).keyDowns;
        w.keyDown(code, keyCode); frames(w, 2); w.keyUp(code, keyCode); frames(w, 2);
        const d = plain(CBI(w).getDiagnostics());
        assert.deepEqual([d.keyDowns, d.lastIndex, d.lastDecision], [keyDowns + 1, slot, "accepted"], `${code} → スロット${slot + 1}`);
    });
    assert.equal(IN(w).getStats().translated >= 5, true);
    // 旧キー: X/C/V は枠を呼ばない(CardBattleInputに届かない)
    const base = plain(CBI(w).getDiagnostics()).keyDowns, handBefore = handNow(w);
    for (const [code, keyCode] of [["KeyX", 88], ["KeyC", 67], ["KeyV", 86]]) { w.keyDown(code, keyCode); frames(w, 2); w.keyUp(code, keyCode); frames(w, 2); }
    assert.equal(plain(CBI(w).getDiagnostics()).keyDowns, base, "旧キーはカード入力へ届かない");
    assert.deepEqual(handNow(w), handBefore, "手札は動かない");
    assert.equal(IN(w).getStats().swallowedOld >= 3, true);
    quietly(() => w.sb.stop());
});

test("カードを実際に使う: 各キーで、その枠のカードが使われる(消費・Cooldownは従来どおり1回だけ)。押しっぱなしのリピートでは増えない", () => {
    const w = ready({ openingHand: ["hermes_strength", "hermes_issen", "hermes_sweep", "hermes_psychopomp", "hermes_veil"] });      // すぐ発動するカード(長押しのカードは別)
    const heart = heartTile(w);
    cursorAtTile(w, heart.x, heart.y);
    const used = [];
    for (const [code, keyCode] of [KEYS5[4], KEYS5[3], KEYS5[2], KEYS5[1], KEYS5[0]]) {          // 使うと左へ詰まるので、右の枠から
        const hand = handNow(w), idx = KEYS5.findIndex(k => k[0] === code), pile = plain(w.deck.getBattleState()).cooldownPile.length;
        w.keyDown(code, keyCode); w.keyDown(code, keyCode, { repeat: true }); w.keyDown(code, keyCode, { repeat: true }); frames(w, 3); w.keyUp(code, keyCode); frames(w, 3);
        const r = plain(CBI(w).getLastResult());
        assert.equal(r.cardId, hand[idx], `${code} は ${hand[idx]}: ${JSON.stringify(r).slice(0, 120)}`);
        if (r.ok) { used.push(r.cardId); assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pile + 1, "Cooldownへ1枚だけ"); }
        frames(w, 50);
    }
    assert.ok(used.length >= 4, "ほとんどが発動: " + used.join());
    quietly(() => w.sb.stop());
});

test("DEFENSE: カード枠のキー・旧キー・通常攻撃(クリック・J)はすべて何も起こさない。自ハートはマウスで動く(W/Rで動いたりリロードしない)", () => {
    const w = ready({ openingHand: HAND5, weapon: "gun" });
    w.soul.skipPhase(); frames(w, 4);
    assert.equal(w.soul.getPhase(), "defense");
    const hand = handNow(w), pile = plain(w.deck.getBattleState()).cooldownPile.length, d0 = plain(CBI(w).getDiagnostics()), gun0 = plain(w.ctx.ProjectRGunSystem.status());
    const p0 = [w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY];
    for (const [code, keyCode] of [...KEYS5, ["KeyX", 88], ["KeyC", 67], ["KeyV", 86], ["KeyJ", 74]]) { w.keyDown(code, keyCode); frames(w, 2); w.keyUp(code, keyCode); frames(w, 2); }
    const c = areaCenter(w);
    clickAt(w, c.x, c.y); frames(w, 3);
    assert.deepEqual(handNow(w), hand, "手札は動かない");
    assert.equal(plain(w.deck.getBattleState()).cooldownPile.length, pile, "Cooldownに入らない");
    assert.equal(plain(CBI(w).getDiagnostics()).keyDowns, d0.keyDowns, "カード入力に届かない");
    const gun1 = plain(w.ctx.ProjectRGunSystem.status());
    assert.deepEqual([gun1.shots, gun1.ammo, gun1.reloading, gun1.reloads], [gun0.shots, gun0.ammo, gun0.reloading, gun0.reloads], "撃たない・リロードもしない(Rは何も起こさない)");
    assert.deepEqual([w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY], p0, "W/Aで動かない");
    assert.ok(IN(w).getStats().swallowedDefense >= 5, "DEFENSE中のカードキーは捨てた");
    // 自ハートは、いつもどおりマウスに追従する(防御操作は変えない)
    const vp = plain(w.stage.getViewport());
    const at = (fx, fy) => { const p = w.stage.toStage(vp.x + vp.w * fx, vp.y + vp.h * fy); w.mouse(Math.round(p.x), Math.round(p.y)); frames(w, 3); return plain(w.stage.getPlayerHeart()); };
    const a = at(0.3, 0.7), b = at(0.7, 0.4);
    assert.ok(a.active && b.active && b.x > a.x + 100 && b.y < a.y - 50, "ハートはマウスへ: " + JSON.stringify([a, b].map(h => [Math.round(h.x), Math.round(h.y)])));
    // ATTACKへ戻れば、また使える
    while (w.soul.getPhase() !== "attack") { w.soul.skipPhase(); frames(w, 3); }
    const k = plain(CBI(w).getDiagnostics()).keyDowns;
    w.keyDown("KeyQ", 81); frames(w, 2); w.keyUp("KeyQ", 81); frames(w, 2);
    assert.equal(plain(CBI(w).getDiagnostics()).keyDowns, k + 1, "ATTACKへ戻れば Q が通る");
    quietly(() => w.sb.stop());
});

test("押しっぱなし: ATTACKで押したキーをDEFENSEで離しても取り残さない(次のATTACKでまた押せる)。DEFENSEで押して離しても何も起きない", () => {
    const w = ready({ openingHand: HAND5 });
    w.keyDown("KeyW", 87); frames(w, 2);
    assert.equal(IN(w).getStats().held, 1);
    w.soul.skipPhase(); frames(w, 3);
    w.keyUp("KeyW", 87); frames(w, 2);
    assert.equal(IN(w).getStats().held, 0, "離した記録は消える");
    w.keyDown("KeyT", 84); frames(w, 2); w.keyUp("KeyT", 84); frames(w, 2);                       // DEFENSE: 捨てる
    assert.equal(IN(w).getStats().held, 0);
    while (w.soul.getPhase() !== "attack") { w.soul.skipPhase(); frames(w, 3); }
    const k = plain(CBI(w).getDiagnostics());
    w.keyDown("KeyW", 87); frames(w, 2); w.keyUp("KeyW", 87); frames(w, 2);
    const d = plain(CBI(w).getDiagnostics());
    assert.deepEqual([d.keyDowns, d.lastIndex, d.lastDecision], [k.keyDowns + 1, 1, "accepted"], "取り残しなく W が通る");
    // 押したままSOULが終わっても、通常の操作へ持ち越さない
    w.keyDown("KeyQ", 81); frames(w, 2);
    quietly(() => w.sb.stop()); arrive(w); frames(w, 4);
    assert.equal(IN(w).getStats().held, 0);
    w.keyUp("KeyQ", 81); frames(w, 2);
});

test("通常攻撃 = 左クリック(戦闘エリアの中だけ): 中のクリックで剣が1回振れる。エリアの外・HUDの上・J・UI領域・会話中は攻撃にならない。カーソルの位置は照準のまま", () => {
    const w = ready({ weapon: "sword", openingHand: HAND5 });
    const c = areaCenter(w), vp = c.vp;
    const s0 = swings(w);
    clickAt(w, c.x, c.y); frames(w, 4);
    assert.equal(swings(w), s0 + 1, "戦闘エリアの中の左クリックで通常攻撃");
    assert.equal(IN(w).getStats().attacksAllowed, 1);
    frames(w, 60);
    const outside = [["上(敵の置き場)", c.x, vp.y - 40], ["下(キャラの置き場)", c.x, vp.y + vp.h + 60], ["左の外", vp.x - 60, c.y], ["右の外", vp.x + vp.w + 60, c.y], ["手札パネル", c.x, 960], ["戦闘エリアの角のすぐ外", vp.x - 2, vp.y - 2]];
    for (const [label, x, y] of outside) { clickAt(w, x, y); frames(w, 4); frames(w, 20); }
    assert.equal(swings(w), s0 + 1, "外のクリックは無視: " + outside.map(o => o[0]).join(","));
    assert.ok((IN(w).getStats().attacksDenied.outsideArea || 0) >= outside.length, JSON.stringify(plain(IN(w).getStats())));
    // 縁の内側は通る
    clickAt(w, vp.x + 3, vp.y + 3); frames(w, 4);
    assert.equal(swings(w), s0 + 2, "戦闘エリアの縁の内側は攻撃");
    frames(w, 60);
    // J・ゲームパッドの攻撃ボタン(=クリックでない予約)は通常攻撃にならない
    w.keyDown("KeyJ", 74); frames(w, 2); w.keyUp("KeyJ", 74); frames(w, 20);
    assert.equal(swings(w), s0 + 2, "Jは通常攻撃にならない");
    assert.ok((IN(w).getStats().attacksDenied.notClick || 0) >= 1);
    // UIの領域の上のクリックは攻撃にしない(登録した領域・開いているウィンドウ・メニューボタン)
    let region = null;
    IN(w).registerUiRegion(screen => region && screen.x >= region.x && screen.x <= region.x + region.w && screen.y >= region.y && screen.y <= region.y + region.h);
    region = { x: c.x - 30, y: c.y - 30, w: 60, h: 60 };
    clickAt(w, c.x, c.y); frames(w, 4);
    assert.equal(swings(w), s0 + 2, "UI領域の上は攻撃にならない");
    region = null;
    w.sc()._menuButton = { get visible() { return true; }, set visible(v) {}, get renderable() { return true; }, set renderable(v) { /* 専用HUDが隠そうとしても、この検証では見えている扱い */ }, getBounds: () => ({ x: c.x - 20, y: c.y - 20, width: 40, height: 40 }) };
    clickAt(w, c.x, c.y); frames(w, 4);
    assert.equal(swings(w), s0 + 2, "メニューボタンの上は攻撃にならない " + JSON.stringify(plain(IN(w).getStats())));
    w.sc()._menuButton = display();
    w.sc()._windowLayer.children.push({ visible: true, openness: 255, getBounds: () => ({ x: c.x - 20, y: c.y - 20, width: 40, height: 40 }) });
    clickAt(w, c.x + 5, c.y + 5); frames(w, 4);
    assert.equal(swings(w), s0 + 2, "開いているウィンドウの上は攻撃にならない");
    w.sc()._windowLayer.children.length = 0;
    // 会話中は攻撃にならない
    w.ctx.$gameMessage.add("テスト");
    clickAt(w, c.x, c.y); frames(w, 4);
    assert.equal(swings(w), s0 + 2, "会話中は攻撃にならない");
    w.ctx.$gameMessage.clear();
    frames(w, 4);
    clickAt(w, c.x, c.y); frames(w, 4);
    assert.equal(swings(w), s0 + 3, "UIが無ければまた攻撃");
    // クリックは照準を変えない: カーソル位置はクリックした点(ステージ座標)のまま
    const p = w.stage.toStage(c.x, c.y);
    assert.ok(Math.abs(w.ctx.TouchInput.x - Math.round(p.x)) < 1 && Math.abs(w.ctx.TouchInput.y - Math.round(p.y)) < 1);
    quietly(() => w.sb.stop());
});

test("銃: SOULでは弾が尽きたら自動でリロード(空撃ちを待たない)。Rはリロードにならず、枠4のカードになる。弾薬・リロード時間は従来どおり", () => {
    const w = ready({ weapon: "gun", openingHand: HAND5 });
    const g0 = plain(w.ctx.ProjectRGunSystem.status());
    assert.equal(g0.equipped, true);
    assert.ok(g0.capacity > 0 && g0.reserve > 0, JSON.stringify(g0));
    // Rは手動リロードにならない(枠4へ)
    w.keyDown("KeyR", 82); frames(w, 2); w.keyUp("KeyR", 82); frames(w, 2);
    assert.equal(plain(w.ctx.ProjectRGunSystem.status()).reloading, false, "Rでリロードしない");
    assert.equal(plain(CBI(w).getDiagnostics()).lastIndex, 3, "Rは枠4");
    // 弾を空にする → 自動でリロードが始まり、従来のリロード時間で終わる
    const interpreter = Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 });
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "GunAmmoControl", { slot: "0", target: "ammo", value: String(-g0.ammo) });
    assert.equal(plain(w.ctx.ProjectRGunSystem.status()).ammo, 0, "空にした");
    frames(w, 2);
    const g1 = plain(w.ctx.ProjectRGunSystem.status());
    assert.equal(g1.reloading, true, "空撃ちを待たずに自動リロード");
    assert.equal(g1.dryFires, g0.dryFires, "空撃ちは起きていない");
    assert.equal(IN(w).getStats().autoReloads, 1);
    frames(w, w.ctx.ProjectRGunSystem.config.reloadFrames + 5);
    const g2 = plain(w.ctx.ProjectRGunSystem.status());
    assert.deepEqual([g2.reloading, g2.ammo, g2.reloads], [false, g0.capacity, g0.reloads + 1], "従来のリロード(弾薬を満たす)");
    assert.ok(g2.reserve < g0.reserve, "ストックから補充(消費は従来どおり)");
    // 銃は左クリックで撃つ
    const c = areaCenter(w), heart = heartTile(w);
    cursorAtTile(w, heart.x, heart.y);
    clickAt(w, c.x, c.y); frames(w, 3);
    assert.equal(plain(w.ctx.ProjectRGunSystem.status()).shots, g0.shots + 1, "左クリックで発射");
    quietly(() => w.sb.stop());
});

test("竪琴: 音符の入力中は、左クリックが音符の選択になり、剣は同時に振れない(Jは使えない)。回数を使い切ったら、また通常攻撃へ", () => {
    const w = ready({ weapon: "sword", openingHand: ["apollo_lyre_rhythm", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"] });
    const lyre = w.ctx.ProjectRApolloLyreRhythm;
    w.keyDown("KeyQ", 81); frames(w, 3); w.keyUp("KeyQ", 81);
    let session = plain(lyre.getSession());
    assert.ok(session, "竪琴が始まった " + JSON.stringify(plain(CBI(w).getLastResult())).slice(0, 160));
    for (let i = 0; i < 80 && !(plain(lyre.getSession())?.frame >= 0); i++) frames(w, 1);
    assert.ok(plain(lyre.getSession()).frame >= 0, "音符の入力が始まった");
    const s0 = swings(w), c = areaCenter(w), presses = plain(lyre.getSession()).presses;
    clickAt(w, c.x, c.y); frames(w, 2);
    assert.equal(plain(lyre.getSession()).presses, presses + 1, "左クリックが音符の選択");
    assert.equal(swings(w), s0, "剣は同時に振れない");
    const outsideBefore = plain(lyre.getSession()).presses;
    clickAt(w, areaCenter(w).vp.x - 80, c.y); frames(w, 2);
    assert.equal(plain(lyre.getSession()).presses, outsideBefore, "エリアの外のクリックは音符にならない");
    w.keyDown("KeyJ", 74); frames(w, 2); w.keyUp("KeyJ", 74); frames(w, 2);
    assert.equal(plain(lyre.getSession()).presses, outsideBefore, "Jは音符にならない");
    assert.equal(swings(w), s0);
    quietly(() => w.sb.stop());
});

test("SOUL以外・保存・後片づけ: 終了後は旧キー(X/C/V)が通常どおりに戻り、攻撃のJも通る。ステージの復元・セーブ許可・手札/デッキは従来どおり", () => {
    const w = ready({ weapon: "sword", openingHand: HAND5 });
    quietly(() => w.sb.stop()); arrive(w); frames(w, 4);
    assert.equal(IN(w).isActive(), false);
    assert.equal(stageState(w).state, "idle");
    const swallowed = IN(w).getStats().swallowedOld;
    w.keyDown("KeyX", 88); w.keyUp("KeyX", 88);
    assert.equal(IN(w).getStats().swallowedOld, swallowed, "SOULの外では X を捨てない");
    assert.equal(w.ctx.Game_System.prototype.isSaveEnabled.call(w.ctx.$gameSystem), true, "セーブは元どおり許可");
    w.ctx.TouchInput._currentState.triggered = false;
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 4);                                         // SOULの外では、攻撃ボタンの予約はクリックでなくても、SOULの入力に止められない(通常の経路のまま。戦闘外の拒否は既存の規則)
    const word = JSON.stringify(plain(IN(w).getStats().attacksDenied));
    assert.doesNotMatch(word, /notClick/, "SOULの外の予約は数えない: " + word);
});

console.log(`${passed} tests passed`);
