"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "hermes_swift_movement", PLUGIN = "ProjectR_HermesSwiftMovement";
const engine = read("js/plugins/Hendrix_Action_Engine.js");
const objects = read("js/rmmz_objects.js"), dot = read("js/plugins/DotMoveSystem.js");
const source = read("tests/ProjectR_HermesReedFluteSleep.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(source.slice(0, source.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", fixture);
function method(source, marker, ending = "\n};") {
    const start = source.indexOf(marker), end = source.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, marker);
    return source.slice(start, end + ending.length);
}
function loadGame() {
    const g = fixture.createGame();
    const run = code => vm.runInContext(code, g);
    g.Game_CharacterBase = function() {};
    g.Game_Character = function() {};
    g.Game_Player = function() {};
    Object.setPrototypeOf(g.Game_Character.prototype, g.Game_CharacterBase.prototype);
    Object.setPrototypeOf(g.Game_Player.prototype, g.Game_Character.prototype);
    Object.setPrototypeOf(g.$gamePlayer, g.Game_Player.prototype);
    delete g.$gamePlayer.x; delete g.$gamePlayer.y;
    run(objects.slice(objects.indexOf("Object.defineProperties(Game_CharacterBase.prototype"),
        objects.indexOf("Game_CharacterBase.prototype.initialize =")));
    run(method(objects, "Game_CharacterBase.prototype.setPosition ="));
    // 実DotMove setPosition aliasと実Action Combat通行判定/補正/Teleportを使用。
    run(dot.slice(dot.indexOf("const _Game_CharacterBase_setPosition ="),
        dot.indexOf("const _Game_CharacterBase_copyPosition =")));
    for (const name of ["isValidPosition", "findNearestValidPosition", "teleportTo"]) {
        run(method(engine, `Game_Character.prototype.${name} =`));
    }
    g.$dataMap = {};
    g.blocked = new Set(); g.passageChecks = [];
    Object.assign(g.$gameMap, {
        width: () => 40, height: () => 30,
        roundX: x => x, roundY: y => y,
        canvasToMapX: x => Math.floor(x / 48), canvasToMapY: y => Math.floor(y / 48),
        isPassable(x, y, direction) {
            assert.ok(Number.isInteger(x) && Number.isInteger(y), "通行判定には整数tileを渡す");
            g.passageChecks.push([x, y, direction]);
            return !g.blocked.has(`${x},${y}`);
        }
    });
    g.cacheUpdates = 0; g.cancelled = 0; g.destinationCleared = 0;
    Object.assign(g.$gamePlayer, {
        updateMapCharactersCache() { g.cacheUpdates++; },
        canMove: () => true, isInVehicle: () => false,
        cancelMove() { g.cancelled++; }
    });
    g.$gameTemp.clearDestination = () => g.destinationCleared++;
    g.$gamePlayer.setPosition(10, 10);
    g.calls = [];
    const teleport = g.$gamePlayer.teleportTo;
    g.$gamePlayer.teleportTo = function(...args) { g.calls.push(args); return teleport.apply(this, args); };
    g.aim = (x, y) => Object.assign(g.TouchInput, { x: x * 48 + 24, y: y * 48 + 24 });
    g.aim(20, 10);
    run(read(`js/plugins/${PLUGIN}.js`));
    g.prepareSwift = () => { g.start(); g.arrange(0, CARD); g.ProjectRCardDeck.updateCooldown(12); };
    g.fireSwift = () => g.ProjectRCardDeck.requestUseCard(0);
    g.position = () => [g.$gamePlayer._realX, g.$gamePlayer._realY];
    return g;
}
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
function unchangedFailure(g, reason = "activationFailed") {
    const before = plain(g.ProjectRCardDeck.getBattleState()), position = g.position();
    assert.equal(g.fireSwift().reason, reason);
    assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
    assert.deepEqual(g.position(), position);
}

test("登録名/ファイル一致・有効登録1回・認識阻害より後", () => {
    const config = {}; vm.runInNewContext(read("js/plugins.js"), config);
    const entries = config.$plugins.filter(p => p.name === PLUGIN);
    assert.equal(entries.length, 1); assert.equal(entries[0].status, true);
    assert.ok(config.$plugins.indexOf(entries[0]) > config.$plugins.findIndex(p => p.name === "ProjectR_HermesRecognitionObscure"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", PLUGIN + ".js")));
});
test("導入版は座標overloadを実装・mouse teleport分岐なし・Movement Routeはthis.teleportToへ委譲", () => {
    const teleport = method(engine, "Game_Character.prototype.teleportTo =");
    assert.ok(teleport.includes("typeof notetag === 'number' && typeof minDistance === 'number'"));
    assert.ok(!teleport.includes("mouse or gamepad"));
    const g = loadGame();
    g.Game_Character.ROUTE_SCRIPT = 45;
    g.Game_Character.prototype.processMoveCommand = () => { throw Error("unexpected fallback"); };
    vm.runInContext(engine.slice(engine.indexOf("const _Game_Character_processMoveCommand ="),
        engine.indexOf("// COMMANDS CHECK")), g);
    g.$gamePlayer.processMoveCommand({ code: 45, parameters: ["teleportTo(11, 10)"] });
    assert.deepEqual(g.position(), [11, 10]); assert.deepEqual(plain(g.calls), [[11, 10]]);
});

test("swift instantへdispatch・成功だけ消費/6秒Cooldown/即時ドロー・API引数", () => {
    const g = loadGame(); g.prepareSwift();
    const before = g.ProjectRCardDeck.getBattleState(), used = before.hand[0];
    const persistent = plain(g.ProjectRCardDeck.getPersistentData());
    const result = g.fireSwift(), state = g.ProjectRCardDeck.getBattleState();
    assert.equal(result.ok, true); assert.equal(result.cardId, CARD); assert.equal(result.targetType, "instant");
    assert.deepEqual(g.position(), [13, 10]); assert.deepEqual(plain(g.calls), [[13, 10]]);
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length + state.discardPile.length,
        before.drawPile.length + before.discardPile.length - 1);
    assert.ok(!state.hand.some(c => c.instanceId === used.instanceId));
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === used.instanceId).remainingSeconds, 6);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), persistent);
    g.ProjectRCardDeck.updateCooldown(5.9);
    assert.ok(g.ProjectRCardDeck.getBattleState().cooldownPile.some(c => c.instance.instanceId === used.instanceId));
    g.ProjectRCardDeck.updateCooldown(0.1);
    assert.ok(!g.ProjectRCardDeck.getBattleState().cooldownPile.some(c => c.instance.instanceId === used.instanceId));
});
test("Hermes指輪未所持では使用不可・API未呼出・非消費", () => {
    const g = loadGame(); g.prepareSwift();
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "unowned";
    unchangedFailure(g, "cardUnavailable"); assert.equal(g.calls.length, 0);
});
test("card battle inactiveでは発動不可", () => {
    const g = loadGame(); unchangedFailure(g, "battleInactive"); assert.equal(g.calls.length, 0);
});
for (const [name, cursor, expected] of [
    ["右", [20, 10], [13, 10]], ["左", [0, 10], [7, 10]],
    ["上", [10, 0], [10, 7]], ["下", [10, 20], [10, 13]],
    ["右下", [20, 20], [12, 12]], ["左上", [0, 0], [8, 8]],
    ["右上", [20, 0], [12, 8]], ["左下", [0, 20], [8, 12]],
    ["近距離", [11, 10], [11, 10]], ["3tile境界", [10, 13], [10, 13]]
]) test(`マウス${name}・遠距離は3tile以内/近距離はカーソル位置`, () => {
    const g = loadGame(); g.prepareSwift(); g.aim(...cursor);
    assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), expected);
    assert.ok(Math.hypot(expected[0] - 10, expected[1] - 10) <= 3);
});
test("発動時点の最新カーソル位置を使用・スクロールしたmap座標変換", () => {
    const g = loadGame(); g.prepareSwift(); g.emitKey("keydown", 1);
    g.$gameMap.canvasToMapX = x => Math.floor(x / 48) + 5;
    g.$gameMap.canvasToMapY = y => Math.floor(y / 48) + 3;
    g.aim(6, 7); g.tick();
    assert.deepEqual(g.position(), [11, 10]); assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, true);
});
test("DotMove小数実座標でも8方向すべて3tile以内・整数座標API・cache更新", () => {
    for (const cursor of [[20,10],[0,10],[10,0],[10,20],[20,20],[0,0],[20,0],[0,20]]) {
        const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(10.7, 10.3); g.aim(...cursor);
        const before = g.cacheUpdates;
        assert.equal(g.fireSwift().ok, true);
        assert.ok(Math.hypot(g.position()[0] - 10.7, g.position()[1] - 10.3) <= 3 + 1e-8);
        assert.ok(g.calls[0].every(Number.isInteger)); assert.ok(g.cacheUpdates > before);
    }
});
test("通行不能地点は公式補正先へ移動・4方向通行判定を使用", () => {
    const g = loadGame(); g.prepareSwift(); g.blocked.add("13,10");
    assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), [12, 9]);
    assert.deepEqual(plain(g.calls), [[12, 9]]);
    assert.ok([2,4,6,8].every(d => g.passageChecks.some(c => c[0] === 12 && c[1] === 9 && c[2] === d)));
});
test("公式補正先が3tile超なら移動開始前に失敗・非消費", () => {
    const g = loadGame(); g.prepareSwift();
    for (let x = 0; x < 40; x++) for (let y = 0; y < 30; y++) {
        if (Math.hypot(x - 10, y - 10) <= 3) g.blocked.add(`${x},${y}`);
    }
    unchangedFailure(g); assert.equal(g.calls.length, 0);
});
test("全通行不可で公式補正先なし・非消費/Cooldownなし", () => {
    const g = loadGame(); g.prepareSwift(); g.$gameMap.isPassable = () => false;
    unchangedFailure(g); assert.equal(g.calls.length, 0);
});
test("マップ外方向は公式範囲判定/補正・有効なmap内3tile以内へ", () => {
    const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(1, 10); g.aim(-100, 10);
    assert.equal(g.fireSwift().ok, true);
    const [x, y] = g.position(); assert.ok(x >= 0 && x < 40 && y >= 0 && y < 30);
    assert.ok(Math.hypot(x - 1, y - 10) <= 3);
});
test("同一位置ではactivationFailed・手札/山札/Cooldown維持", () => {
    const g = loadGame(); g.prepareSwift(); g.aim(10, 10); unchangedFailure(g);
    assert.equal(g.cancelled, 0); assert.equal(g.destinationCleared, 0);
});
test("APIがundefinedを返しても座標不変なら失敗", () => {
    const g = loadGame(); g.prepareSwift(); g.$gamePlayer.teleportTo = () => undefined; unchangedFailure(g);
});
test("API例外/移動後例外でも元位置へ復元・非消費", () => {
    for (const moved of [false, true]) {
        const g = loadGame(); g.prepareSwift();
        g.$gamePlayer.teleportTo = function() { if (moved) this.setPosition(12, 10); throw Error("API failed"); };
        unchangedFailure(g);
    }
});
test("API不正座標/距離超過も復元して失敗", () => {
    for (const x of [NaN, 20]) {
        const g = loadGame(); g.prepareSwift();
        g.$gamePlayer.teleportTo = function() { this._realX = x; };
        unchangedFailure(g);
    }
});
test("API欠落/不正マウス/死亡等の移動禁止/乗物は非消費", () => {
    for (const configure of [
        g => { g.$gamePlayer.teleportTo = undefined; },
        g => { g.TouchInput.x = NaN; }, g => { g.$gamePlayer.canMove = () => false; },
        g => { g.$gamePlayer.isInVehicle = () => true; }
    ]) { const g = loadGame(); g.prepareSwift(); configure(g); unchangedFailure(g); }
});
test("同一入力repeat/押しっぱなしで二重発火せず・Hotbar/Keyboard CEへ漏れない", () => {
    const g = loadGame(); g.prepareSwift();
    g.emitKey("keydown", 1); g.emitKey("keydown", 1, { repeat: true }); g.tick();
    g.tick(); g.emitKey("keydown", 1, { repeat: true }); g.tick();
    assert.equal(g.calls.length, 1); assert.deepEqual(plain(g.legacyUses), []);
    assert.deepEqual(plain(g.$gameTemp.reserved), []);
});
test("会話/フォーカス喪失/別Sceneでは入力を発動しない", () => {
    for (const configure of [g => { g.$gameMessage.isBusy = () => true; },
        g => g.emitWindow("blur"), g => { g.SceneManager._scene = {}; }]) {
        const g = loadGame(); g.prepareSwift(); configure(g); g.tap(1); assert.equal(g.calls.length, 0);
    }
});
test("Damage/State/敵移動/無敵/Hitbox/Projectile消去なし・成功時だけ連続移動先解除", () => {
    const g = loadGame(); const enemy = g.addEnemy(12, 10); g.prepareSwift();
    const before = [enemy.x, enemy.y, enemy.battler.hp, plain(enemy.battler._states), g.actor.hp, plain(g.actor._states)];
    g.$gamePlayer._through = false; g.$gamePlayer._transparent = false;
    assert.equal(g.fireSwift().ok, true);
    assert.deepEqual([enemy.x, enemy.y, enemy.battler.hp, plain(enemy.battler._states), g.actor.hp, plain(g.actor._states)], before);
    assert.deepEqual(plain(g.commands), []); assert.equal(g.$gamePlayer._through, false);
    assert.equal(g.$gamePlayer._transparent, false); assert.equal(g.cancelled, 1); assert.equal(g.destinationCleared, 1);
});
test("認識阻害instantは既存へ委譲・State31/5秒/10秒CD・更新維持", () => {
    const g = loadGame(); g.start(); g.arrange(0, "hermes_perception_obscure");
    const result = g.fireSwift(); assert.equal(result.ok, true); assert.equal(g.obscured(), true);
    assert.equal(g.ProjectRCardDeck.getBattleState().cooldownPile.find(c => c.instance.instanceId === result.instanceId).remainingSeconds, 10);
    g.ProjectRCardDeck.updateCooldown(4); assert.equal(g.obscured(), true);
    g.arrange(0, "hermes_perception_obscure"); assert.equal(g.fireSwift().ok, true);
    g.ProjectRCardDeck.updateCooldown(4); assert.equal(g.obscured(), true);
    g.ProjectRCardDeck.updateCooldown(1); assert.equal(g.obscured(), false); assert.equal(g.calls.length, 0);
});
test("葦笛groundの複数敵/State32/半径4/4秒/12秒CDを維持", () => {
    const g = loadGame(); const a = g.addEnemy(12, 10), b = g.addEnemy(10, 13), outside = g.addEnemy(15, 10);
    g.start(); g.arrange(0, "hermes_reed_flute_sleep"); const result = g.fireSwift();
    assert.equal(result.ok, true); assert.equal(g.sleeping(a), true); assert.equal(g.sleeping(b), true);
    assert.equal(g.sleeping(outside), false);
    assert.equal(g.ProjectRCardDeck.getBattleState().cooldownPile.find(c => c.instance.instanceId === result.instanceId).remainingSeconds, 12);
    g.ProjectRCardDeck.updateCooldown(4); assert.equal(g.sleeping(a), false); assert.equal(g.sleeping(b), false);
    assert.equal(g.calls.length, 0);
});
test("direction handlerへ干渉しない（Golden Arrowは従来handlerへdispatch）", () => {
    const g = loadGame(); let seen;
    g.ProjectRCardDeck.registerActivationHandler("direction", context => { seen = context.definition.cardId; return { ok: true }; });
    g.start(); g.arrange(0, "apollo_golden_arrow"); assert.equal(g.fireSwift().ok, true);
    assert.equal(seen, "apollo_golden_arrow"); assert.equal(g.calls.length, 0);
});
test("Save形式/恒久データ維持・ロード後は戦闘/Activationを再開しない", () => {
    const g = loadGame(); const persistent = plain(g.ProjectRCardDeck.getPersistentData());
    const keys = Object.keys(g.DataManager.makeSaveContents()).sort();
    g.prepareSwift(); assert.equal(g.fireSwift().ok, true);
    const saved = g.DataManager.makeSaveContents();
    assert.deepEqual(Object.keys(saved).sort(), keys);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), persistent);
    assert.ok(!JSON.stringify(saved).includes("hermesSwift"));
    g.DataManager.extractSaveContents(saved); assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(g.ProjectRCardDeck.getBattleState(), null);
});
console.log(`${passed}/${passed} Hermes Swift Movement tests passed`);
