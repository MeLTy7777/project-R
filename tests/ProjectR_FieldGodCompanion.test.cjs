"use strict";
// 神の同行(ProjectR_FieldGodCompanion)の Node テスト。実ソースを読み込み、Game_Map・主人公・GodSummonVisual の公開APIは最小の stub にする。
// 実機の確認は tools/mz_cdp/field_god_verify.cjs(4方向・移動・スキルの演出・繰り返し・中断・孤児・移動・ロード・性能)。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const cp = require("node:child_process");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8").replace(/\r\n/g, "\n");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const TAG = "<projectRGodVisual>";

function loadGame({ params = {} } = {}) {
    const events = new Map(); let nextId = 10;
    const mkEvent = (id, x, y, name = "!Crystal", note = TAG) => {
        const e = { _eventId: id, _realX: x, _realY: y, childOffsetX: -0.75, childOffsetY: -0.75, _characterName: name, _transparent: false, _erased: false, isPlayerChild: true, theParent: {}, eventId: () => id, event: () => ({ note }),
            setTransparent(v) { this._transparent = v; }, setPosition(px, py) { this._realX = px; this._realY = py; }, erase() { this._erased = true; } };
        events.set(id, e); return e;
    };
    const visuals = [], followers = [], anchors = [], sprites = new Set();
    const destroyed = [];
    const game = {
        console, window: null,
        $gamePlayer: { _realX: 10, _realY: 10, _dir: 2, direction() { return this._dir; }, isTransferring: () => false },
        $gameMap: null, Game_Map: function() {}, DataManager: { extractSaveContents() { game.extracted = (game.extracted || 0) + 1; } },
        PluginManager: { parameters: () => ({ ...{ Enabled: "true", FieldCombatOnly: "false", BehindTiles: "1.2", LiftTiles: "-0.1", SouthExtraTiles: "0.9", NorthExtraTiles: "0.75", Smoothing: "0.25" }, ...params }), callCommand(interpreter, plugin, command, args) { destroyed.push({ plugin, command, args }); const e = events.get(Number(args.target)); if (e) e._erased = true; } },
        Game_Interpreter: function() {}, SceneManager: { _scene: { _spriteset: { _tilemap: { children: [] } } } },
        ProjectRFieldCombat: { isActive: () => game.fieldActive !== false },
        ProjectRCardDeck: { endBattle() { game.ended = (game.ended || 0) + 1; } },
        ProjectRGodSummonVisual: {
            getVisuals: () => visuals.map(v => ({ ...v })), getFollowers: () => followers.map(f => ({ ...f })), getAnchors: () => anchors.map(a => ({ ...a })), getDiagnostics: () => ({ templateEventId: 6 })
        }
    };
    game.window = game;
    game.$gameMap = { event: id => events.get(id) || null, events: () => [...events.values()] };
    game.Game_Map.prototype.update = function() { game.updates = (game.updates || 0) + 1; };
    game.Game_Map.prototype.setup = function() { game.setups = (game.setups || 0) + 1; };
    const mapUpdate = game.Game_Map.prototype.update, mapSetup = game.Game_Map.prototype.setup; void mapUpdate; void mapSetup;
    game.mkEvent = mkEvent; game.events = events; game.visuals = visuals; game.followers = followers; game.anchors = anchors; game.destroyed = destroyed;
    game.sprites = sprites;
    // スプライト: 作った Event のスプライトが、tilemap の children にある(新しい表示は次のフレームから)
    game.drawSprite = e => { game.SceneManager._scene._spriteset._tilemap.children.push({ _character: e }); };
    const ctx = vm.createContext(game);
    vm.runInContext(read("js/plugins/ProjectR_FieldGodCompanion.js"), ctx);
    game.api = game.ProjectRFieldGodCompanion;
    game.frame = (n = 1) => { const m = new game.Game_Map(); for (let i = 0; i < n; i++) game.Game_Map.prototype.update.call(m, true); };
    return game;
}

test("背後: プレイヤーの向きの反対側(上を向く=南が背後)。浮かせる高さ・距離は設定。毎フレーム追従し、向きが変わると滑らかに回り込む", () => {
    const game = loadGame();
    const god = game.mkEvent(6, 10, 10); game.drawSprite(god);
    game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    game.api.setConfig({ smoothing: 1 });                                  // すぐ(位置の確認)
    const behind = { 8: [0, 1.2 - 0.1 + 0.9], 2: [0, -1.2 - 0.1 - 0.75], 4: [1.2, -0.1], 6: [-1.2, -0.1] };
    for (const d of [8, 2, 4, 6]) {
        game.$gamePlayer._dir = d; game.frame(2);
        assert.deepEqual([+(god._realX - 10).toFixed(3), +(god._realY - 10).toFixed(3)], behind[d].map(v => +v.toFixed(3)), "向き " + d);
    }
    assert.equal(god.isPlayerChild, false, "Hendrix の「プレイヤーの子」の追従は止める(位置はここで決める)"); assert.equal(god.theParent, null);
    // プレイヤーが動くと、神も動く
    game.$gamePlayer._realX = 14; game.$gamePlayer._realY = 7; game.frame(1);
    assert.deepEqual([god._realX - 14, god._realY - 7].map(v => +v.toFixed(3)), [-1.2, -0.1]);
    // 滑らか: 向きを変えても、1フレームで目標へ飛ばない(Smoothing 0.25)
    game.api.resetConfig(); game.$gamePlayer._dir = 8; game.frame(1);
    const o1 = [god._realX - 14, god._realY - 7]; assert.ok(Math.hypot(o1[0] - (-1.2), o1[1] - (-0.1)) < 1.5 + 1e-9 && Math.abs(o1[0]) > 0.3, "少しずつ近づく");
    let prev = Math.hypot(o1[0] - 0, o1[1] - 2.0);
    for (let i = 0; i < 40; i++) { game.frame(1); const d = Math.hypot(god._realX - 14, god._realY - 7 - 2.0); assert.ok(d <= prev + 1e-9, "目標へ単調に近づく"); prev = d; }
    assert.ok(prev < 0.01, "収束する");
    // 無効にすると、元の位置・追従(GodSummonVisual のプレイヤーの子・左上)へ戻り、以後は触らない
    game.api.setConfig({ enabled: false }); game.$gamePlayer._dir = 2; game.frame(5);
    assert.deepEqual([god._realX - 14, god._realY - 7].map(v => +v.toFixed(3)), [-0.75, -0.75]); assert.equal(god.isPlayerChild, true);
    const x0 = god._realX, y0 = god._realY; game.$gamePlayer._dir = 4; game.frame(5); assert.deepEqual([god._realX, god._realY], [x0, y0]);
});

test("1体だけ: 同じ神の表示が複数あるとき、優先(追従する神 > 最新の一時召喚 > 常駐)の1体だけ見せる。新しい表示のスプライトが出るまでは隠さない。終わると戻る。別の神は別々", () => {
    const game = loadGame();
    const per = game.mkEvent(6, 10, 10); game.drawSprite(per);
    game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    const apollo = game.mkEvent(9, 10, 10, "!Flame"); game.drawSprite(apollo);
    game.visuals.push({ kind: "persistent", godId: "apollo", eventId: 9, summonId: 2 });
    game.frame(2);
    assert.deepEqual(plain(game.api.getVisibleGods()), { hermes: 1, apollo: 1 }, "別の神は、それぞれ1体");
    // 一時召喚(ヘルメース)。スプライトは次のフレーム → それまで常駐の神は隠さない(1フレームも消えない)
    const t1 = game.mkEvent(11, 10.8, 9.5); game.visuals.push({ kind: "transient", godId: "hermes", eventId: 11, summonId: 5 });
    game.frame(1);
    assert.equal(per._transparent, false, "新しい表示のスプライトが出るまでは、隠さない");
    game.drawSprite(t1); game.frame(1);
    assert.equal(per._transparent, true, "スプライトが出たら、常駐の神を隠す"); assert.equal(t1._transparent, false);
    assert.equal(plain(game.api.getState()).gods.hermes.primary.kind, "transient");
    assert.equal(apollo._transparent, false, "別の神は隠さない");
    // 古い一時召喚と新しい一時召喚: 新しい方だけ
    const t2 = game.mkEvent(12, 10.8, 9.5); game.drawSprite(t2); game.visuals.push({ kind: "transient", godId: "hermes", eventId: 12, summonId: 6 });
    game.frame(2);
    assert.equal(t1._transparent, true, "古い一時召喚は隠す"); assert.equal(t2._transparent, false);
    // 追従する神(ヴェイル)は最優先
    const fo = game.mkEvent(13, 3, 3); game.drawSprite(fo); game.followers.push({ id: 1, godId: "hermes", eventId: 13, point: { x: 3, y: 3 }, vanishing: false });
    game.frame(2);
    assert.equal(fo._transparent, false); assert.equal(t2._transparent, true); assert.equal(per._transparent, true);
    // 錨(画像なし・anchors)は数えず、隠さない。孤児にもしない
    const anchor = game.mkEvent(14, 5, 5, ""); game.anchors.push({ id: 2, eventId: 14, point: { x: 5, y: 5 } }); game.frame(5);
    assert.equal(anchor._erased, false); assert.equal(anchor._transparent, false);
    // 演出が終わる(一時召喚・追従が消える)と、常駐の神が戻る
    game.visuals.splice(game.visuals.findIndex(v => v.eventId === 12), 1); game.visuals.splice(game.visuals.findIndex(v => v.eventId === 11), 1); game.followers.length = 0; game.events.delete(11); game.events.delete(12); game.events.delete(13);
    game.frame(2);
    assert.equal(per._transparent, false, "戻る"); assert.equal(per._projectRCompanionHidden, false);
    assert.deepEqual(plain(game.api.getVisibleGods()), { hermes: 1, apollo: 1 });
    assert.ok(game.api.getDiagnostics().hides >= 1 && game.api.getDiagnostics().shows >= 1);
});

test("8方向: 8つの向き(斜めも)すべてで、神は向きの反対側。8方向の向きが無ければ4方向の向き。台本の神(一時召喚)は動かさない", () => {
    const game = loadGame();
    const god = game.mkEvent(6, 10, 10); game.drawSprite(god); game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    game.api.setConfig({ smoothing: 1 });
    const R = Math.SQRT1_2, B = 1.2, L = -0.1;
    // 向き(テンキー) → 神の相対位置: 向きの反対側へ B、y は浮かせる分 L
    const E = 0.9, Nn = 0.75, table = { 8: [0, B + E], 9: [-B * R, B * R + E * R], 6: [-B, 0], 3: [-B * R, -B * R - Nn * R], 2: [0, -B - Nn], 1: [B * R, -B * R - Nn * R], 4: [B, 0], 7: [B * R, B * R + E * R] };
    const degreeOf = { 8: 0, 9: 45, 6: 90, 3: 135, 2: 180, 1: 225, 4: 270, 7: 315 };
    for (const dir of [8, 9, 6, 3, 2, 1, 4, 7]) {
        const r = degreeOf[dir] * Math.PI / 180;
        game.ProjectRFieldFacing = { getAim: () => ({ active: true, dir8: dir, vx: Math.sin(r), vy: -Math.cos(r) }) };
        game.frame(2);
        assert.deepEqual([+(god._realX - 10).toFixed(3), +(god._realY - 10).toFixed(3)], [table[dir][0], table[dir][1] + L].map(v => +v.toFixed(3)), "向き " + dir);
    }
    // 滑らか: 北 → 南東(斜め)へ向きを変えても、1フレームでは飛ばない
    game.api.setConfig({ smoothing: 0.25 });
    game.ProjectRFieldFacing = { getAim: () => ({ active: true, dir8: 8, vx: 0, vy: -1 }) }; game.frame(60);
    game.ProjectRFieldFacing = { getAim: () => ({ active: true, dir8: 3, vx: Math.SQRT1_2, vy: Math.SQRT1_2 }) };
    let prev = [god._realX, god._realY], maxStep = 0;
    for (let i = 0; i < 40; i++) { game.frame(1); maxStep = Math.max(maxStep, Math.hypot(god._realX - prev[0], god._realY - prev[1])); prev = [god._realX, god._realY]; }
    assert.ok(maxStep < 1.0, "1フレームの動きは小さい"); assert.ok(Math.abs(god._realX - (10 - B * R)) < 0.01 && Math.abs(god._realY - (10 - B * R - 0.75 * R + L)) < 0.01, "南東向きの背後(北西)に収束");
    // 8方向が使えなければ、プレイヤーの4方向の向き
    delete game.ProjectRFieldFacing; game.api.setConfig({ smoothing: 1 }); game.$gamePlayer._dir = 4; game.frame(2);
    assert.deepEqual([+(god._realX - 10).toFixed(3), +(god._realY - 10).toFixed(3)], [1.2, -0.1]);
    // 台本の神(一時召喚・追従)の位置は動かさない
    const t = game.mkEvent(11, 12.3, 9.7); game.drawSprite(t); game.visuals.push({ kind: "transient", godId: "hermes", eventId: 11, summonId: 5 }); game.frame(3);
    assert.deepEqual([t._realX, t._realY], [12.3, 9.7], "一時召喚の位置は、そのまま"); assert.equal(t.isPlayerChild, true);
});

test("フィールド戦闘中だけ動く(FieldCombatOnly=true): それ以外では既存の神の表示のまま(位置を触らない・隠さない)。終わると隠した神を戻す。既定(false)は常に動くが、孤児の片づけはフィールド戦闘中だけ", () => {
    const game = loadGame({ params: { FieldCombatOnly: "true" } });
    assert.equal(game.api.getConfig().fieldOnly, true);
    const per = game.mkEvent(6, 9.25, 9.25); game.drawSprite(per); game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    const t = game.mkEvent(11, 10.8, 9.5); game.drawSprite(t); game.visuals.push({ kind: "transient", godId: "hermes", eventId: 11, summonId: 5 });
    const orphan = game.mkEvent(20, 5, 5);
    game.fieldActive = false; game.frame(6);
    assert.deepEqual([per._realX, per._realY], [9.25, 9.25], "位置は触らない(既存の左上のまま)"); assert.equal(per.isPlayerChild, true, "親子の追従も止めない");
    assert.equal(per._transparent, false, "隠さない"); assert.equal(orphan._erased, false, "孤児の片づけもしない");
    game.fieldActive = true; game.frame(3);
    assert.equal(per._transparent, true, "フィールド戦闘中は、同じ神を1体にする"); assert.equal(orphan._erased, true);
    game.fieldActive = false; game.frame(1);
    assert.equal(per._transparent, false, "戦闘が終わったら、隠した神を戻す"); assert.equal(game.api.getDiagnostics().tracked, 0);
    assert.equal(per.isPlayerChild, true, "背後へ動かしていた常駐の神は、プレイヤーの子(元の追従)へ戻る"); assert.deepEqual([per._realX, per._realY], [10 - 0.75, 10 - 0.75], "元の相対位置(左上)へ");
    game.api.setConfig({ fieldOnly: false }); game.fieldActive = false; game.frame(2); assert.equal(per._transparent, true, "FieldCombatOnly=false なら、フィールド戦闘でなくても動く(神が付いてくる所ならどこでも)");
    const o2 = game.mkEvent(21, 7, 7); game.frame(6); assert.equal(o2._erased, false, "孤児の片づけは、フィールド戦闘中だけ(台本の神の表示を壊さない)");
});

test("描く順番: 神は、プレイヤー・ほかのキャラクターの下(優先度 0)に描く(南側でもプレイヤーの足元に重ならない)。元の優先度は、動かないとき・無効のとき戻す", () => {
    const game = loadGame();
    const god = game.mkEvent(6, 10, 10); god._priorityType = 1; god.setPriorityType = function(v) { this._priorityType = v; }; game.drawSprite(god);
    game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    game.frame(2); assert.equal(god._priorityType, 0, "キャラクターの下");
    game.api.setConfig({ enabled: false }); game.frame(2); assert.equal(god._priorityType, 1, "動かないとき(無効)は、元の優先度へ"); assert.equal(god._projectRCompanionPrio, undefined);
    game.api.setConfig({ enabled: true }); game.frame(2); assert.equal(god._priorityType, 0);
    // 神の絵(高さ約2マス・足元が基準)が、北向きでもプレイヤーの足の下に収まる距離
    { const c = game.api.getConfig(); assert.ok(c.behindTiles + c.liftTiles + c.southExtraTiles >= 1.9, "北向き(神が南側)で、神の足元が、プレイヤーの足より 1.9 マス以上下(絵の高さ 1.7 マス + 余白。絵の上端が足・靴に届かない)"); assert.ok(c.behindTiles - c.liftTiles + c.northExtraTiles >= 1.9, "南向き(神が北側)で、神の足元が、プレイヤーの足より 1.9 マス以上上(絵の下端が頭に届かない)"); }
});

test("印のないイベント(同じ番号の別のイベント)は、神の表示として動かさない・隠さない", () => {
    const game = loadGame();
    const impostor = game.mkEvent(6, 10.5, 10.5, "!Crystal", "<CombatWall>");                    // 神の表示と同じ番号を持つ、印のないイベント(テストの壁など)
    game.drawSprite(impostor); game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    const t = game.mkEvent(11, 12, 12); game.drawSprite(t); game.visuals.push({ kind: "transient", godId: "hermes", eventId: 11, summonId: 2 });
    game.frame(4);
    assert.deepEqual([impostor._realX, impostor._realY], [10.5, 10.5], "動かさない"); assert.equal(impostor._transparent, false, "隠さない"); assert.equal(impostor.isPlayerChild, true);
});

test("孤児: 管理外の神の表示Event(印あり)は、3フレーム後に片づける。管理下・印なしは触らない。マップ移動・ロード・戦闘終了で状態を捨てる", () => {
    const game = loadGame();
    const per = game.mkEvent(6, 10, 10); game.drawSprite(per); game.visuals.push({ kind: "persistent", godId: "hermes", eventId: 6, summonId: 1 });
    const orphan = game.mkEvent(20, 5, 5); const plainEvent = game.mkEvent(21, 6, 6, "Actor1", "<hp: x>");
    game.frame(1); assert.equal(orphan._erased, false, "生成の直後の1〜2フレームは待つ"); game.frame(1); assert.equal(orphan._erased, false);
    game.frame(1);
    assert.equal(orphan._erased, true, "3フレーム目に片づける"); assert.equal(game.destroyed.length >= 1 && game.destroyed[0].command, "DestroyEvent");
    assert.equal(game.api.getDiagnostics().orphansRemoved, 1);
    assert.equal(per._erased, false); assert.equal(plainEvent._erased, false, "神の印がないイベントは触らない");
    // 状態の破棄
    assert.ok(game.api.getDiagnostics().tracked >= 1);
    new game.Game_Map().setup(); assert.equal(game.api.getDiagnostics().tracked, 0, "マップ移動で、追従の状態を捨てる");
    game.frame(1); assert.ok(game.api.getDiagnostics().tracked >= 1);
    game.DataManager.extractSaveContents(); assert.equal(game.api.getDiagnostics().tracked, 0, "ロードで捨てる");
    game.frame(1); game.ProjectRCardDeck.endBattle(); assert.equal(game.api.getDiagnostics().tracked, 0, "戦闘の終了で捨てる");
    // 孤児のスプライト(Event が無いのに描画だけ残る)は診断に出る
    game.SceneManager._scene._spriteset._tilemap.children.push({ _character: { eventId: () => 99, event: () => ({ note: TAG }) } }); game.frame(1);
    assert.equal(game.api.getDiagnostics().staleSprites, 1);
});

test("保護: GodSummonVisual / GodSummonManager は変更しない。登録は FogOfWar の後(末尾)・既定値・Chromium 85 の構文。表示だけ(状態・保存を持たない)", () => {
    for (const file of ["js/plugins/ProjectR_GodSummonVisual.js", "js/plugins/ProjectR_GodSummonManager.js"]) {
        assert.equal(cp.execFileSync("git", ["diff", "--stat", "HEAD", "--", file], { cwd: project }).toString().trim(), "", file + " は変更していない");
    }
    const names = configuration.$plugins.map(p => p.name);
    assert.equal(names[names.length - 1], "ProjectR_FieldGodCompanion", "末尾に登録");
    assert.ok(names.indexOf("ProjectR_FieldGodCompanion") > names.indexOf("ProjectR_GodSummonVisual") && names.indexOf("ProjectR_FieldGodCompanion") > names.indexOf("ProjectR_FogOfWar"));
    const entry = configuration.$plugins.find(p => p.name === "ProjectR_FieldGodCompanion");
    assert.equal(entry.status, true); assert.deepEqual(plain(entry.parameters), { Enabled: "true", FieldCombatOnly: "false", BehindTiles: "1.2", LiftTiles: "-0.1", SouthExtraTiles: "0.9", NorthExtraTiles: "0.75", Smoothing: "0.25" });
    assert.ok(names.indexOf("ProjectR_FieldFacing") > -1 && names.indexOf("ProjectR_FieldFacing") < names.indexOf("ProjectR_FieldGodCompanion"), "8方向の向きは、神の同行より前");
    const src = read("js/plugins/ProjectR_FieldGodCompanion.js").replace(/\/\*[\s\S]*?\*\//, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/\?\?=|\|\|=|&&=|#\w+\s*[;=(]|\.at\(|replaceAll\(/.test(src), "Chromium 85 で使えない構文を使わない");
    new vm.Script(read("js/plugins/ProjectR_FieldGodCompanion.js"));
    assert.ok(!/ConfigManager|StorageManager|localStorage|require\(|\$gameSystem|\$gameVariables/.test(src), "状態・保存を持たない(表示だけ)");
    const game = loadGame({ params: { BehindTiles: "abc", Smoothing: "9", LiftTiles: "" } });
    assert.deepEqual(plain(game.api.getConfig()), { enabled: true, fieldOnly: false, behindTiles: 1.2, liftTiles: -0.1, southExtraTiles: 0.9, northExtraTiles: 0.75, smoothing: 1 }, "不正な値は既定値・範囲に収める");
});
