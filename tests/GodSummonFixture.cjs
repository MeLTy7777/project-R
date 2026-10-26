"use strict";
// Phase 3B: Phase 2C各fixtureへ、ProjectR_GodSummonManagerを実ソースのまま読み込む共通補助。
// 単体fixtureに無い最小のGame_Map/Scene_Map/$gamePlayerだけを補う（本番では常に存在する）。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_GodSummonManager.js"), "utf8");

module.exports = function loadGodSummonManager(game) {
    if (!game.Game_Map) {
        game.Game_Map = function() {};
        game.Game_Map.prototype.update = function() {};
        game.Game_Map.prototype.setup = function() {};
    }
    for (const name of ["update", "setup"]) {
        if (!game.Game_Map.prototype[name]) game.Game_Map.prototype[name] = function() {};
    }
    if (!game.Scene_Map) {
        game.Scene_Map = function() {};
        game.Scene_Map.prototype.onMapLoaded = function() {};
    }
    if (!game.Scene_Map.prototype.onMapLoaded) game.Scene_Map.prototype.onMapLoaded = function() {};
    if (!game.$gamePlayer) {
        game.$gamePlayer = { _realX: 10, _realY: 10, screenX: () => 504, screenY: () => 528 };
    }
    // 位置を持たない簡易Playerには召喚位置の座標だけを補う（既存値は変えない）。
    if (game.$gamePlayer._realX === undefined) game.$gamePlayer._realX = 10;
    if (game.$gamePlayer._realY === undefined) game.$gamePlayer._realY = 10;
    if (!game.TouchInput) game.TouchInput = { x: 620, y: 420 };
    // fixtureがGame_Mapを差し替えている場合があるので、現在のGame_Mapへ毎回hookし直す。
    vm.runInContext(source, game);
};
