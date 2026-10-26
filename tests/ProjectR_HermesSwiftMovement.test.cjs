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
    g.Game_Event = function() {};
    Object.setPrototypeOf(g.Game_Character.prototype, g.Game_CharacterBase.prototype);
    Object.setPrototypeOf(g.Game_Player.prototype, g.Game_Character.prototype);
    Object.setPrototypeOf(g.Game_Event.prototype, g.Game_Character.prototype);
    Object.setPrototypeOf(g.$gamePlayer, g.Game_Player.prototype);
    delete g.$gamePlayer.x; delete g.$gamePlayer.y;
    run(objects.slice(objects.indexOf("Object.defineProperties(Game_CharacterBase.prototype"),
        objects.indexOf("Game_CharacterBase.prototype.initialize =")));
    run(method(objects, "Game_CharacterBase.prototype.setPosition ="));
    // 導入版DotMoveの幾何/CollisionChecker/cacheを無改変で実行。地形はfixture。
    const classesEnd = "    DotMoveSystem.CharacterMover = CharacterMover;";
    run(dot.slice(dot.indexOf("var DotMoveSystem;"), dot.indexOf(classesEnd) + classesEnd.length) +
        "})(DotMoveSystem || (DotMoveSystem = {}));");
    run(method(objects, "Game_CharacterBase.prototype.isMapPassable ="));
    run(method(objects, "Game_CharacterBase.prototype.reverseDir ="));
    run("const DotMovePoint = DotMoveSystem.DotMovePoint;");
    run(method(dot, "Game_CharacterBase.prototype.positionPoint =", "\n    };"));
    run(method(engine, "Game_Player.prototype.checkCollisionTargetEvent =", "\n\t};"));
    run(method(engine, "Game_Player.prototype.checkCollisionTargetCharacter =", "\n\t};"));
    run(dot.slice(dot.indexOf("const _Game_CharacterBase_setPosition ="),
        dot.indexOf("const _Game_CharacterBase_copyPosition =")));
    for (const name of ["isValidPosition", "findNearestValidPosition", "teleportTo"]) {
        run(method(engine, `Game_Character.prototype.${name} =`));
    }
    g.$dataMap = {};
    g.blocked = new Set(); g.passageChecks = [];
    Object.assign(g.$gameMap, {
        width: () => 40, height: () => 30,
        tileWidth: () => 48, tileHeight: () => 48,
        _allowRegions: new Set(), regionId: () => 0, hasPassEventAt: () => false,
        isLoopHorizontal: () => false, isLoopVertical: () => false,
        isValid: (x, y) => x >= 0 && y >= 0 && x < 40 && y < 30,
        roundX: x => x, roundY: y => y,
        roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
        roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
        isPassable(x, y, direction) {
            assert.ok(Number.isInteger(x) && Number.isInteger(y), "通行判定には整数tileを渡す");
            g.passageChecks.push([x, y, direction]);
            return !g.blocked.has(`${x},${y}`);
        }
    });
    run("const blockRegionID = 0, buildingWallBlock = false, blockTarget = 'both';");
    run(method(engine, "function SshouldBlockPassageH(", "\n}"));
    // Action Combatの導入済みRegion/通行Event aliasも通す。
    const passageAlias = engine.indexOf("const H_Game_CharacterBase_isMapPassable =");
    run(engine.slice(passageAlias, engine.indexOf("\n}", passageAlias)));
    g.cacheUpdates = 0; g.cancelled = 0; g.destinationCleared = 0;
    g.calls = [];
    g.scroll = { x: 0, y: 0 };
    const cache = new g.DotMoveSystem.MapCharactersCache(40, 30);
    g.$gameTemp.mapCharactersCache = () => cache;
    const playerCache = new g.DotMoveSystem.MapCharacterCacheUpdater(g.$gamePlayer);
    Object.assign(g.$gamePlayer, {
        updateMapCharactersCache() { g.cacheUpdates++; playerCache.updateMapCharactersCache(); },
        canMove: () => true, isInVehicle: () => false,
        width: () => 1, height: () => 1,
        collisionRect() { return new g.DotMoveSystem.DotMoveRectangle(this._realX, this._realY, this.width(), this.height()); },
        screenX() { return (this._realX - g.scroll.x) * 48 + 24; },
        screenY() { return (this._realY - g.scroll.y) * 48 + 48; },
        isThrough() { return !!this._through; }, isDebugThrough: () => false,
        moverData: () => ({}),
        mover() { g.calls.push([]); return new g.DotMoveSystem.CharacterMover(this); },
        cancelMove() { g.cancelled++; }
    });
    const addEnemy = g.addEnemy;
    g.addEnemy = (...args) => {
        const enemy = addEnemy(...args);
        Object.setPrototypeOf(enemy, g.Game_Event.prototype);
        Object.assign(enemy, {
            positionPoint: () => new g.DotMoveSystem.DotMovePoint(enemy.x, enemy.y),
            width: () => 1, height: () => 1,
            collisionRect() { return new g.DotMoveSystem.DotMoveRectangle(this.x, this.y, this.width(), this.height()); },
            isNormalPriority: () => true, isThrough: () => false
        });
        new g.DotMoveSystem.MapCharacterCacheUpdater(enemy).updateMapCharactersCache();
        return enemy;
    };
    g.$gameTemp.clearDestination = () => g.destinationCleared++;
    g.$gamePlayer.setPosition(10, 10);
    g.$gamePlayer.teleportTo = g.$gamePlayer.findNearestValidPosition = () => { throw Error("Teleport禁止"); };
    g.aim = (x, y) => Object.assign(g.TouchInput, { x: (x - g.scroll.x) * 48 + 24, y: (y - g.scroll.y) * 48 + 48 });
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
test("導入版API確認: dashは入力方向/速度依存、moveToPositionは継続移動、Teleportは経路未検査", () => {
    const teleport = method(engine, "Game_Character.prototype.teleportTo =");
    assert.ok(teleport.includes("typeof notetag === 'number' && typeof minDistance === 'number'"));
    assert.ok(!teleport.includes("mouse or gamepad"));
    const dash = method(engine, "Game_Character.prototype.dash =");
    assert.ok(dash.includes("Input.isPressed('up')"));
    assert.ok(dash.includes("steps * this.distancePerFrame() * 3"));
    assert.ok(!dash.includes("this._rotation"));
    assert.ok(method(engine, "Game_Character.prototype.moveToPosition =").includes("this.moveToTargetContinous(targetX, targetY)"));
    assert.ok(method(engine, "Game_Character.prototype.rotateTo =").includes("TouchInput.x - characterScreenX"));
    const g = loadGame();
    assert.equal(typeof g.$gamePlayer.mover().createCollisionChecker().checkCollision, "function");
});

test("swift instantへdispatch・成功だけ消費/6秒Cooldown/即時ドロー・API引数", () => {
    const g = loadGame(); g.prepareSwift();
    const before = g.ProjectRCardDeck.getBattleState(), used = before.hand[0];
    const persistent = plain(g.ProjectRCardDeck.getPersistentData());
    const result = g.fireSwift(), state = g.ProjectRCardDeck.getBattleState();
    assert.equal(result.ok, true); assert.equal(result.cardId, CARD); assert.equal(result.targetType, "instant");
    assert.deepEqual(g.position(), [13, 10]); assert.equal(g.calls.length, 1);
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
    ["右下", [20, 20], [10 + 3 / Math.SQRT2, 10 + 3 / Math.SQRT2]],
    ["左上", [0, 0], [10 - 3 / Math.SQRT2, 10 - 3 / Math.SQRT2]],
    ["右上", [20, 0], [10 + 3 / Math.SQRT2, 10 - 3 / Math.SQRT2]],
    ["左下", [0, 20], [10 - 3 / Math.SQRT2, 10 + 3 / Math.SQRT2]],
    ["近距離", [11, 10], [11, 10]], ["3tile境界", [10, 13], [10, 13]]
]) test(`マウス${name}・遠距離は3tile以内/近距離はカーソル位置`, () => {
    const g = loadGame(); g.prepareSwift(); g.aim(...cursor);
    assert.equal(g.fireSwift().ok, true);
    assert.ok(Math.hypot(g.position()[0] - expected[0], g.position()[1] - expected[1]) < 1e-8);
    assert.ok(Math.hypot(g.position()[0] - 10, g.position()[1] - 10) <= 3 + 1e-8);
});
test("発動時点の最新カーソル位置を使用・スクロールしたmap座標変換", () => {
    const g = loadGame(); g.prepareSwift(); g.emitKey("keydown", 1);
    g.scroll = { x: 5.25, y: 3.125 };
    g.aim(11, 10); g.tick();
    assert.deepEqual(g.position(), [11, 10]); assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, true);
});
test("DotMove小数実座標でも8方向すべて3tile以内・cache更新", () => {
    for (const cursor of [[20,10],[0,10],[10,0],[10,20],[20,20],[0,0],[20,0],[0,20]]) {
        const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(10.7, 10.3); g.aim(...cursor);
        const before = g.cacheUpdates;
        assert.equal(g.fireSwift().ok, true);
        assert.ok(Math.hypot(g.position()[0] - 10.7, g.position()[1] - 10.3) <= 3 + 1e-8);
        assert.equal(g.calls.length, 1); assert.ok(g.cacheUpdates > before);
    }
});
test("着地点が壁なら経路上で止まる・開始tile/到達tileの通行判定を使用", () => {
    const g = loadGame(); g.prepareSwift(); g.blocked.add("13,10");
    assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), [12, 10]);
    assert.ok(g.passageChecks.some(c => c[0] === 12 && c[1] === 10 && c[2] === 6));
    assert.ok(g.passageChecks.some(c => c[0] === 13 && c[1] === 10 && c[2] === 4));
});
test("周囲が壁なら別着地点を探さず失敗・非消費", () => {
    const g = loadGame(); g.prepareSwift();
    for (let x = 0; x < 40; x++) for (let y = 0; y < 30; y++) {
        if (Math.hypot(x - 10, y - 10) <= 3) g.blocked.add(`${x},${y}`);
    }
    unchangedFailure(g); assert.equal(g.cancelled, 0);
});
test("全通行不可で経路なし・非消費/Cooldownなし", () => {
    const g = loadGame(); g.prepareSwift(); g.$gameMap.isPassable = () => false;
    unchangedFailure(g); assert.equal(g.cancelled, 0);
});
test("マップ外方向は端で停止・別の着地点へ補正しない", () => {
    const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(1, 10); g.aim(-100, 10);
    assert.equal(g.fireSwift().ok, true);
    assert.deepEqual(g.position(), [0, 10]);
});
for (const wallX of [12, 13]) test(`${wallX - 11}tile空間の先が壁・壁の反対側は空いていても直前で停止/成功`, () => {
    const g = loadGame(); g.prepareSwift(); g.blocked.add(`${wallX},10`);
    const used = g.ProjectRCardDeck.getBattleState().hand[0];
    assert.equal(g.fireSwift().ok, true);
    assert.deepEqual(g.position(), [wallX - 1, 10]);
    const state = g.ProjectRCardDeck.getBattleState();
    assert.equal(state.hand.length, 5);
    assert.ok(!state.hand.some(c => c.instanceId === used.instanceId));
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === used.instanceId).remainingSeconds, 6);
    assert.ok(!g.passageChecks.some(c => c[0] > wallX));
});
test("壁に密着した完全停止では非消費/新規Cooldownなし/手札維持", () => {
    const g = loadGame(); g.prepareSwift(); g.blocked.add("11,10");
    unchangedFailure(g); assert.equal(g.cancelled, 0); assert.equal(g.destinationCleared, 0);
});
test("step未満の隙間でも実際に移動できた分は成功・壁の手前を詰める", () => {
    const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(10.98, 10); g.blocked.add("12,10");
    assert.equal(g.fireSwift().ok, true);
    assert.ok(g.position()[0] > 10.99 && g.position()[0] <= 11 + 0.00002);
    assert.equal(g.position()[1], 10);
});
test("斜め4方向の壁を抜けず・壁沿いにslideせず方向を維持", () => {
    for (const [sx, sy] of [[1,1],[-1,1],[1,-1],[-1,-1]]) {
        const g = loadGame(); g.prepareSwift(); g.aim(10 + 10 * sx, 10 + 10 * sy);
        const wx = sx > 0 ? 12 : 8, wy = sy > 0 ? 12 : 8;
        g.blocked.add(`${wx},${wy}`);
        assert.equal(g.fireSwift().ok, true);
        const dx = g.position()[0] - 10, dy = g.position()[1] - 10;
        assert.ok(Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-8);
        assert.ok(Math.abs(dx) <= 1.00002 && Math.abs(dy) <= 1.00002);
    }
});
test("斜めの角に隣接する2壁は完全停止・角抜けしない", () => {
    const g = loadGame(); g.prepareSwift(); g.aim(20, 20);
    g.blocked.add("11,10"); g.blocked.add("10,11"); unchangedFailure(g);
});
test("片方向だけ通行不可の境界も通常通行判定で停止", () => {
    const g = loadGame(); g.prepareSwift();
    g.$gameMap.isPassable = (x, y, d) => !(x === 11 && y === 10 && d === 6);
    assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), [11, 10]);
});
test("通過不可の敵Eventは壁と同様に停止・Damage/移動なし", () => {
    const g = loadGame(), enemy = g.addEnemy(12, 10); g.prepareSwift();
    const hp = enemy.battler.hp;
    assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), [11, 10]);
    assert.equal(enemy.battler.hp, hp); assert.deepEqual([enemy.x, enemy.y], [12, 10]);
    assert.deepEqual(plain(g.commands), []);
});
test("密着した通過不可Eventでは完全停止・非消費", () => {
    const g = loadGame(); g.addEnemy(11, 10); g.prepareSwift(); unchangedFailure(g);
});
test("通常歩行で通過可能なEventの条件を維持", () => {
    for (const configure of [
        (g, e) => { e.isThrough = () => true; },
        (g, e) => { e.isNormalPriority = () => false; },
        (g, e) => { g.$gameSystem._playerPassThroughEvents = [e.eventId()]; }
    ]) {
        const g = loadGame(), enemy = g.addEnemy(12, 10); configure(g, enemy); g.prepareSwift();
        assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), [13, 10]);
    }
});
test("小さいPlayer/薄いEventでも通過不可Collisionを飛び越さない", () => {
    const g = loadGame(), enemy = g.addEnemy(10.55, 10); g.prepareSwift();
    g.$gamePlayer.width = () => 0.02; enemy.width = () => 0.001;
    assert.equal(g.fireSwift().ok, true);
    assert.ok(g.position()[0] > 10.5 && g.position()[0] <= 10.53002);
});
test("4辺のマップ端と端に密着した完全停止・ループ/通行許可でも越えない", () => {
    for (const [start, aim, end] of [
        [[1,10],[-20,10],[0,10]], [[38,10],[60,10],[39,10]],
        [[10,1],[10,-20],[10,0]], [[10,28],[10,60],[10,29]]
    ]) {
        const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition(...start); g.aim(...aim);
        g.$gameMap.isLoopHorizontal = g.$gameMap.isLoopVertical = () => true;
        g.$gameMap._allowRegions.add(0);
        assert.equal(g.fireSwift().ok, true); assert.deepEqual(g.position(), end);
        g.arrange(0, CARD); unchangedFailure(g);
    }
});
test("8方向に丸めない360度・発動中にmouseを動かしても固定方向", () => {
    const g = loadGame(); g.prepareSwift(); g.aim(20.125, 13.375);
    const setPosition = g.$gamePlayer.setPosition;
    g.$gamePlayer.setPosition = function(...args) { setPosition.apply(this, args); g.aim(0, 0); };
    assert.equal(g.fireSwift().ok, true);
    const [x,y] = g.position();
    assert.ok(Math.abs((y - 10) / (x - 10) - 1 / 3) < 1e-8);
    assert.ok(Math.abs(Math.hypot(x - 10, y - 10) - 3) < 1e-8);
});
test("すり抜け/DebugThrough中とCollisionChecker欠落では非消費", () => {
    for (const configure of [
        g => { g.$gamePlayer._through = true; },
        g => { g.$gamePlayer.isDebugThrough = () => true; },
        g => { g.$gamePlayer.mover = () => ({}); }
    ]) { const g = loadGame(); g.prepareSwift(); configure(g); unchangedFailure(g); }
});
test("同一位置ではactivationFailed・手札/山札/Cooldown維持", () => {
    const g = loadGame(); g.prepareSwift(); g.aim(10, 10); unchangedFailure(g);
    assert.equal(g.cancelled, 0); assert.equal(g.destinationCleared, 0);
});
test("APIがundefinedを返しても座標不変なら失敗", () => {
    const g = loadGame(); g.prepareSwift(); g.$gamePlayer.setPosition = () => undefined; unchangedFailure(g);
});
test("API例外/移動後例外でも元位置へ復元・非消費", () => {
    for (const moved of [false, true]) {
        const g = loadGame(); g.prepareSwift();
        const mover = g.$gamePlayer.mover.bind(g.$gamePlayer);
        g.$gamePlayer.mover = () => {
            const m = mover(), create = m.createCollisionChecker.bind(m);
            m.createCollisionChecker = opt => {
                if (!moved || g.position()[0] > 10) throw Error("API failed");
                return create(opt);
            };
            return m;
        };
        unchangedFailure(g);
    }
});
test("API不正座標/距離超過も復元して失敗", () => {
    for (const x of [NaN, 20]) {
        const g = loadGame(); g.prepareSwift();
        const setPosition = g.$gamePlayer.setPosition;
        let first = true;
        g.$gamePlayer.setPosition = function(...args) {
            if (first) { first = false; this._realX = x; } else setPosition.apply(this, args);
        };
        unchangedFailure(g);
    }
});
test("API欠落/不正マウス/死亡等の移動禁止/乗物は非消費", () => {
    for (const configure of [
        g => { g.$gamePlayer.mover = undefined; },
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
