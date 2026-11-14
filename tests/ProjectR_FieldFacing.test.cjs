"use strict";
// 8方向の向きデータ(ProjectR_FieldFacing)の Node テスト。実ソースを読み込み、マウス・主人公・戦闘中の判定は最小の stub にする。
// 実機の確認は tools/mz_cdp/field_facing_verify.cjs(8方向の照準・WASDとの独立・斜め移動・4方向の向きの互換・神の背後)。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8").replace(/\r\n/g, "\n");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);

function loadGame({ params = {} } = {}) {
    const game = {
        console, window: null, directionCalls: [],
        $gamePlayer: { _realX: 10, _realY: 10, _dir: 2, direction() { return this._dir; }, centerPositionPoint() { return { x: this._realX + 0.5, y: this._realY + 0.5 }; }, setDirection(d) { game.directionCalls.push(d); } },
        $gameMap: { displayX: () => 0, displayY: () => 0, tileWidth: () => 48, tileHeight: () => 48, canvasToMapX: x => Math.floor(x / 48), canvasToMapY: y => Math.floor(y / 48) },
        TouchInput: { x: 0, y: 0 }, Input: { dir4: 0, dir8: 0 },
        ProjectRCombatPresence: { isCombatEventActive: () => game.combat !== false },
        PluginManager: { parameters: () => ({ Enabled: "true", ...params }) }
    };
    game.window = game; game.combat = true;
    vm.runInContext(read("js/plugins/ProjectR_FieldFacing.js"), vm.createContext(game));
    game.api = game.ProjectRFieldFacing;
    game.mouseAt = (dx, dy) => { game.TouchInput.x = (10.5 + dx) * 48; game.TouchInput.y = (10.5 + dy) * 48; };       // プレイヤーの中心からのマップ座標のずれ
    return game;
}

test("8方向: マウスの角度から N/NE/E/SE/S/SW/W/NW(テンキーの 8/9/6/3/2/1/4/7)。45度ごとの境(22.5度)で切り替わる。正確な角度も返す", () => {
    const game = loadGame();
    const cases = [[0, -3, 8, "N", 0], [3, -3, 9, "NE", 45], [3, 0, 6, "E", 90], [3, 3, 3, "SE", 135], [0, 3, 2, "S", 180], [-3, 3, 1, "SW", 225], [-3, 0, 4, "W", 270], [-3, -3, 7, "NW", 315]];
    for (const [dx, dy, dir8, name, deg] of cases) {
        game.mouseAt(dx, dy); const a = plain(game.api.getAim());
        assert.deepEqual([a.active, a.dir8, a.name, a.degree8], [true, dir8, name, deg], name);
        assert.ok(Math.abs(a.degree - deg) < 1e-6, "正確な角度: " + a.degree);
        assert.ok(Math.abs(a.vx - Math.sin(deg * Math.PI / 180)) < 1e-5 && Math.abs(a.vy + Math.cos(deg * Math.PI / 180)) < 1e-5, "単位ベクトル");
    }
    // 境: N と NE の間は 22.5°
    const at = deg => { const r = deg * Math.PI / 180; game.mouseAt(Math.sin(r) * 5, -Math.cos(r) * 5); return game.api.getAim(); };
    assert.equal(at(22.0).dir8, 8); assert.equal(at(23.0).dir8, 9); assert.equal(at(67.0).dir8, 9); assert.equal(at(68.0).dir8, 6); assert.equal(at(359).dir8, 8); assert.equal(at(338).dir8, 8); assert.equal(at(337).dir8, 7);
    assert.ok(Math.abs(at(30).degree - 30) < 1e-6, "角度は丸めない(degree)・丸めた角度は degree8");
    assert.equal(at(30).degree8, 45);
    assert.equal(game.api.toDir8(-45), 7); assert.equal(game.api.toDir8(405), 9); assert.equal(game.api.toName(3), "SE");
});

test("正確な角度: マスへ丸めない(MZ の canvasToMapX は整数に切り捨てる)。スクロール位置(displayX/Y)を加える", () => {
    const game = loadGame();
    game.mouseAt(0.3, -3); let a = game.api.getAim(); assert.ok(Math.abs(a.degree - Math.atan2(0.3, 3) * 180 / Math.PI) < 1e-6, "小数のずれも角度に出る: " + a.degree);
    game.mouseAt(2.9, -3); a = game.api.getAim(); assert.ok(Math.abs(a.degree - Math.atan2(2.9, 3) * 180 / Math.PI) < 1e-6);
    game.$gameMap.displayX = () => 4; game.$gameMap.displayY = () => 2;                         // スクロールしているマップ: 画面の座標 + 表示の原点
    game.TouchInput.x = (10.5 + 3 - 4) * 48; game.TouchInput.y = (10.5 - 3 - 2) * 48; a = game.api.getAim(); assert.equal(a.dir8, 9, "表示の原点を足したマップ座標で計算"); assert.ok(Math.abs(a.degree - 45) < 1e-6);
});

test("独立性・互換: 移動入力(WASD)と無関係。MZ本体の向き(4方向)は変えない・斜めの向きを setDirection へ渡さない。戦闘外は4方向の向き。マウスが中心に重なったら直前の角度", () => {
    const game = loadGame();
    game.mouseAt(3, -3); game.$gamePlayer._dir = 8;
    for (const dir4 of [0, 2, 4, 6, 8]) { game.Input.dir4 = dir4; game.Input.dir8 = dir4; assert.equal(game.api.getAim().dir8, 9, "WASD(" + dir4 + ")を押しても、向きは変わらない"); }
    assert.equal(game.$gamePlayer._dir, 8, "MZ本体の向きは触らない"); assert.deepEqual(game.directionCalls, [], "setDirection を呼ばない(斜めの向きを4方向のAPIへ渡さない)");
    assert.equal(game.api.getAim().dir4, 8);
    // 中心に重なる → 直前の角度
    game.mouseAt(0, 0); assert.equal(game.api.getAim().dir8, 9, "決められないときは、直前の向き");
    // 戦闘外: 4方向の向き(斜めにならない)
    game.combat = false; game.$gamePlayer._dir = 6; let a = plain(game.api.getAim());
    assert.deepEqual([a.active, a.dir8, a.name, a.degree8], [false, 6, "E", 90]); assert.equal(game.api.getDir8(), 6);
    game.$gamePlayer._dir = 3; assert.equal(game.api.getAim().dir8, 2, "(万一)斜めの4方向外の値は、南にする");
    // 無効
    game.combat = true; game.api.setConfig({ enabled: false }); game.mouseAt(3, -3); game.$gamePlayer._dir = 8;
    assert.equal(game.api.getAim().active, false); assert.equal(game.api.getAim().dir8, 8, "無効なら、戦闘中も4方向"); game.api.setConfig({ enabled: true });
    assert.equal(game.api.getAim().dir8, 9);
});

test("保護: 読み取り専用(向き・移動・攻撃を変えない)。登録は ProjectR_PlayerFacing の後・神の同行の前。Chromium 85 の構文・保存を持たない", () => {
    const src = read("js/plugins/ProjectR_FieldFacing.js").replace(/\/\*[\s\S]*?\*\//, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/setDirection\s*\(|turnToward|dotMove|\.prototype\.\w+\s*=|\$gameSystem|\$gameVariables|StorageManager|localStorage|require\(/.test(src), "向き・移動を変えない・保存を持たない(読み取りだけ)");
    assert.ok(!/\?\?=|\|\|=|&&=|#\w+\s*[;=(]|\.at\(|replaceAll\(/.test(src), "Chromium 85 で使えない構文を使わない");
    new vm.Script(read("js/plugins/ProjectR_FieldFacing.js"));
    const names = configuration.$plugins.map(p => p.name), i = names.indexOf("ProjectR_FieldFacing");
    assert.ok(i > names.indexOf("ProjectR_PlayerFacing") && i < names.indexOf("ProjectR_FieldGodCompanion"));
    assert.deepEqual(plain(configuration.$plugins[i].parameters), { Enabled: "true" }); assert.equal(configuration.$plugins[i].status, true);
    assert.equal(loadGame({ params: { Enabled: "false" } }).api.getConfig().enabled, false);
});
