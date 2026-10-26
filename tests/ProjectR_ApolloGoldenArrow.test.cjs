"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const engine = read("js/plugins/Hendrix_Action_Engine.js");
const objects = read("js/rmmz_objects.js");
const engineLines = engine.split(/\r?\n/);
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const parameters = configuration.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters;
const mapData = JSON.parse(read("data/Map002.json"));
const skills = JSON.parse(read("data/Skills.json"));
const arrowTemplate = mapData.events.find(e => e?.note.includes("<projectRGoldenArrow>"));
const arrowSkill = skills.find(s => s?.note.includes("<ProjectRCard: apollo_golden_arrow>"));
const fixtureCards = [3, 2, 1, 3, 2].map((maxCopies, index) => ({
    cardId: `test_only_${index}`, ringId: "hermes", maxCopies, cooldownSeconds: 1, targetType: "instant"
}));
const cards = [...JSON.parse(parameters.CardDefinitions).map(JSON.parse), ...fixtureCards];
const deckIds = cards.flatMap(c => Array(Number(c.maxCopies)).fill(c.cardId));

function method(source, marker, ending = "\n};") {
    const start = source.indexOf(marker);
    const end = source.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, marker);
    return source.slice(start, end + ending.length);
}
function loadGame({ withoutPlugin = false, productionDefinitions = false, prepare = true } = {}) {
    const commands = [], movements = [], spawns = [];
    const noop = function() {};
    const actor = { atk: 50, hit: 1, cri: 0, attackElements: () => [1] };
    const game = {
        console, Game_CharacterBase: function() {}, Game_Character: function() {},
        Game_Event: function() { this.initialize(...arguments); },
        Game_Map: function() { this._events = []; this._mapId = 1; },
        Game_Interpreter: function() {}, Game_System: function() {},
        Scene_Map: function() {}, Spriteset_Map: function() {},
        Sprite_Character: function(event) { this._character = event; },
        Game_Enemy: function(id) {
            Object.assign(this, { def: 20, eva: 0, mev: 0, cev: 0, pdr: 1, mdr: 1, rec: 1,
                enemyId: () => id, elementRate: () => 1, isGuard: () => false });
        },
        PluginManager: { _commands: {}, parameters: () => ({ ...parameters,
            CardDefinitions: JSON.stringify((productionDefinitions ? cards.slice(0, 7) : cards).map(JSON.stringify)) }) },
        DataManager: {
            isSkill: item => game.$dataSkills.includes(item), isItem: () => false,
            isWeapon: () => false, isArmor: () => false,
            extractMetadata(data) { data.meta = {}; },
            makeSaveContents() { return { system: game.$gameSystem, map: game.$gameMap }; },
            extractSaveContents(contents) { game.$gameSystem = contents.system; game.$gameMap = contents.map; }
        },
        $dataSkills: plain(skills), $dataTemplateMap: plain(mapData),
        $dataEnemies: JSON.parse(read("data/Enemies.json")),
        $gameVariables: { _data: {}, value: () => 0 }, $gameActors: { actor: () => actor },
        $gameSelfSwitches: { setValue: noop }, $dataSystem: { switches: [] },
        $gameTemp: {},
        $gameParty: { leader: () => actor, inBattle: () => false },
        $gameMessage: { isBusy: () => false },
        TouchInput: { x: 620, y: 420 },
        Graphics: { frameCount: 1 }, navigator: { getGamepads: () => [] },
        document: { hasFocus: () => true, activeElement: { tagName: "BODY" }, addEventListener: noop },
        addEventListener: noop,
        SceneManager: { isSceneChanging: () => false },
        HpluginName: "Hendrix_Action_Engine", H_DotMoveSystem: true,
        hitboxCache: {}, eventHeightCache: new Map(), enemyNameCache: {}, critDmgMultiplier: 3,
        DotMoveSystem: { Degree: function(value) { this.value = value; } }
    };
    game.window = game;
    Object.assign(game.Game_Character.prototype, Object.create(game.Game_CharacterBase.prototype));
    Object.setPrototypeOf(game.Game_Character.prototype, game.Game_CharacterBase.prototype);
    Object.setPrototypeOf(game.Game_Event.prototype, game.Game_Character.prototype);
    Object.assign(game.Game_Event.prototype, {
        initialize(mapId, eventId) {
            this._mapId = mapId; this._eventId = eventId; this._pageIndex = 0;
            this.locate(0, 0);
        },
        locate(x, y) { this._x = this._realX = x; this._y = this._realY = y; },
        event() { return this._data; }, eventId() { return this._eventId; },
        screenX() { return (this._realX + 0.5) * 48; },
        screenY() { return (this._realY + (this._hasRotationCapability ? 1.5 : 1)) * 48; }
    });
    game.Game_Character.prototype.dotMoveByDeg = function(degree) { movements.push([this._eventId, degree]); };
    game.Game_Character.ROUTE_SCRIPT = 45;
    game.Game_Character.prototype.processMoveCommand = noop;
    game.Game_Map.prototype.setup = function(mapId) { this._mapId = mapId; this._events = []; };
    Object.assign(game.Game_Map.prototype, {
        event(id) { return this._events[id]; }, events() { return this._events.filter(Boolean); },
        mapId() { return this._mapId; },
        tileWidth: () => 48, tileHeight: () => 48, width: () => 100, height: () => 100,
        deltaX: (a, b) => a - b, deltaY: (a, b) => a - b,
        isLoopHorizontal: () => false, isLoopVertical: () => false, isEventRunning: () => false,
        update: function() {}
    });
    game.Game_Interpreter.prototype.removeEventHpBar = noop;
    game.Game_System.prototype.initialize = function() { this._permanentEvents = {}; };
    game.Scene_Map.prototype.isActive = () => true;
    game.Scene_Map.prototype.isBusy = () => false;
    game.Scene_Map.prototype.onMapLoaded = noop;
    game.Scene_Map.prototype.update = () => game.$gameMap.update(true);
    game.Spriteset_Map.prototype.cleanupEventHpBars = noop;
    const context = vm.createContext(game);
    const run = code => vm.runInContext(code, context);
    run("Math.random = () => 0.5; Math.randomInt = max => Math.floor(max / 2);");
    const managerSource = read("js/rmmz_managers.js");
    for (const marker of ["PluginManager.registerCommand =", "PluginManager.callCommand ="]) run(method(managerSource, marker));
    const coreSource = read("js/rmmz_core.js");
    run(coreSource.slice(coreSource.indexOf("function Input()"), coreSource.indexOf("function TouchInput()")));
    run(objects.slice(objects.indexOf("function Game_Item()"), objects.indexOf("function Game_ActionResult()")));
    run(engine.slice(engine.indexOf("class SHendrix_Action"), engine.indexOf("function MaithlCalculateDamagePlayerWeapon")));
    for (const marker of ["function SgetSkillDataH(", "function SapplyDefenseReductionH(", "function SprocessStateApplicationH("]) {
        run(method(engine, marker, "\n}"));
    }
    for (const marker of ["Game_Interpreter.prototype.calculateDamageAgainstEvent =",
        "Game_Event.prototype.getDamageFromNoteTag =", "Game_Event.prototype.hitboxData =",
        "Game_Character.prototype.rotateTo =", "Game_Character.prototype.moveToPosition =",
        "Game_CharacterBase.prototype._applyRotation =", "Game_CharacterBase.prototype.setRotation =",
        "Game_CharacterBase.prototype.setOriginPoint =", "Game_CharacterBase.prototype.setCustomRotation =",
        "Game_Map.prototype.getCurrentEventHp =", "Game_Interpreter.prototype.updateEventHp ="]) run(method(engine, marker));
    run("const _Game_Character_processMoveCommand = Game_Character.prototype.processMoveCommand;\n" +
        method(engine, "Game_Character.prototype.processMoveCommand ="));
    game.skillNameCache = Object.fromEntries(game.$dataSkills.filter(Boolean).map(s => [s.name.toLowerCase(), s]));
    run(engineLines.find(line => line.startsWith("function _0x4173()"))); // 導入済みCollisionManager全文
    run(engineLines.find(line => line.startsWith("const _0x4195c3 = _0x740f;"))); // 公式Collision・回転hitbox・タグindex全文
    run(method(engine, "window.checkCollide ="));
    run(engine.slice(engine.indexOf("function Hendrix_TemplateEvent()"), engine.indexOf("Game_Map.prototype.getNextEventId =")));
    for (const marker of ["Game_Map.prototype.getNextEventId =", "Game_Map.prototype.isPermanentEventId =",
        "Game_Map.prototype.resetNextEventId =", "Game_Map.prototype.spawnEvent =", "Game_Map.prototype.unspawnEvent =",
        "Spriteset_Map.prototype.unspawnEvent ="]) run(method(engine, marker));
    run(method(engine, "window.findTargets ="));
    for (const name of ["UpdateEventHp", "DestroyEvent"]) {
        run(method(engine, `PluginManager.registerCommand(HpluginName, "${name}",`, "\n});"));
    }
    const _command = game.PluginManager.callCommand;
    game.PluginManager.callCommand = function(self, plugin, name, args) {
        commands.push({ eventId: self._eventId, plugin, name, args: plain(args) });
        return _command.apply(this, arguments);
    };
    const _spawn = game.Game_Map.prototype.spawnEvent;
    game.Game_Map.prototype.spawnEvent = function() { spawns.push([...arguments]); return _spawn.apply(this, arguments); };
    run(read("js/plugins/ProjectR_CardDeckCore.js"));
    run(read("js/plugins/ProjectR_CardBattleInput.js"));
    game.saveBeforePlugin = [game.DataManager.makeSaveContents, game.DataManager.extractSaveContents];
    if (!withoutPlugin) {
        run(read("js/plugins/ProjectR_GodSummonManager.js"));
        run(read("js/plugins/ProjectR_ApolloGoldenArrow.js"));
    }
    game.$gameSystem = new game.Game_System(); game.$gameSystem.initialize();
    game.$gameMap = new game.Game_Map();
    game.$gamePlayer = { _realX: 10, _realY: 10, screenX: () => 504, screenY: () => 528, isTransferring: () => false };
    const spriteset = new game.Spriteset_Map();
    Object.assign(spriteset, { _characterSprites: [], _eventHpBars: [], _tilemap: { addChild: noop, removeChild: noop } });
    game.SceneManager._scene = new game.Scene_Map();
    game.SceneManager._scene._spriteset = spriteset;
    game.Input.initialize();
    const deck = game.ProjectRCardDeck;
    if (prepare) {
        deck.assignRingToPlayer("hermes"); deck.assignRingToPlayer("apollo");
        cards.forEach(card => deck.setCardOwned(card.cardId)); deck.setDeck(deckIds);
    }
    game.startWith = cardId => {
        deck.startCardBattle();
        while (deck.getBattleState().hand[0]?.cardId !== cardId) {
            const first = deck.getBattleState().hand[0]; assert.ok(first, cardId);
            deck.useBattleCard(first.instanceId);
        }
    };
    game.addEnemy = (id = 1, x = 20, y = 20) => {
        const event = new game.Game_Event(1, id); event.locate(x, y);
        event._data = { name: "enemy", note: "<hp: ゴブリン>\n<enemy>", pages: [{ list: [] }] };
        event.databaseEnemy = { id: 1 };
        game.$gameMap._events[id] = event; game.$gameMap.addEventToTagIndex(event);
        const bar = { _event: event, currentHp: 200, targetHp: 200, refresh: noop, _hpChangeDuration: 1 };
        spriteset._eventHpBars.push(bar);
        return { event, bar };
    };
    game.commands = commands; game.movements = movements; game.spawns = spawns;
    game.fire = () => deck.requestUseCard(0);
    game.projectile = () => game.$gameMap.event(game.ProjectRApolloGoldenArrow.getActiveProjectiles()[0]?.eventId);
    game.collideWith = enemy => {
        const projectile = game.projectile();
        enemy.event.locate(projectile._realX, projectile._realY + 0.5);
        game.Graphics.frameCount++;
        game.$gameMap.update(true);
    };
    return game;
}

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("登録はCore/Inputの後で一度だけ、Skill/Prefabと既存定義は正しく対応", () => {
    const plugins = configuration.$plugins;
    const index = plugins.findIndex(p => p.name === "ProjectR_ApolloGoldenArrow");
    assert.ok(index > plugins.findIndex(p => p.name === "ProjectR_CardBattleInput"));
    assert.equal(plugins.filter(p => p.name === "ProjectR_ApolloGoldenArrow" && p.status).length, 1);
    assert.equal(arrowSkill.id, 236);
    assert.equal(arrowTemplate.id, 3);
    assert.ok(arrowTemplate.note.includes(`<dmg: ${arrowSkill.name}>`));
    assert.ok(arrowTemplate.note.includes("<attacker: player>"));
    const golden = cards.find(c => c.cardId === "apollo_golden_arrow");
    assert.equal(golden.targetType, "direction");
    assert.equal(Number(golden.maxCopies), 3); assert.equal(Number(golden.maxLevel), 3);
    assert.equal(Number(golden.cooldownSeconds), 4);
});
test("Golden Arrowがdirection handlerへdispatchし1回だけ公式spawnEventを要求", () => {
    const game = loadGame(); game.startWith("apollo_golden_arrow");
    assert.equal(game.fire().reason, "success");
    assert.equal(game.spawns.length, 1);
    assert.equal(game.spawns[0][0], arrowTemplate.id);
    assert.equal(game.spawns[0][3], false);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
});
test("Apollo指輪未所持なら開始/使用拒否し弾を生成しない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.setRingUnowned("apollo");
    assert.equal(deck.startCardBattle().ok, false);
    assert.equal(game.fire().reason, "battleInactive");
    assert.equal(game.spawns.length, 0);
});
test("開始後もRouterが最新のApollo所有を検証し、未所持なら非消費", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck; game.startWith("apollo_golden_arrow");
    game.$gameSystem._projectRCardDeckData.ringOwnershipState.apollo = "unowned";
    const before = plain(deck.getBattleState());
    const result = game.fire();
    assert.equal(result.reason, "cardUnavailable");
    assert.equal(result.reasons[0].code, "REQUIRED_RING_NOT_OWNED");
    assert.equal(game.spawns.length, 0); assert.deepEqual(plain(deck.getBattleState()), before);
});
test("生成成功時だけカードをCooldownへ移し即時ドロー、永続データ不変", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck; game.startWith("apollo_golden_arrow");
    const before = plain(deck.getBattleState()), persistent = plain(deck.getPersistentData());
    assert.equal(game.fire().ok, true);
    const state = plain(deck.getBattleState());
    assert.equal(state.hand.length, 5); assert.equal(state.drawPile.length, before.drawPile.length - 1);
    const used = state.cooldownPile.find(c => c.instance.instanceId === before.hand[0].instanceId);
    assert.equal(used.remainingSeconds, 4);
    assert.deepEqual(plain(deck.getPersistentData()), persistent);
});
test("null/例外/回転失敗はactivationFailedで非消費、新しく生じた弾も片付ける", () => {
    for (const fail of [g => { g.$gameMap.spawnEvent = () => null; },
        g => { g.$gameMap.spawnEvent = () => { throw Error("spawn failed"); }; },
        g => { g.Game_Character.prototype.rotateTo = () => { throw Error("rotation failed"); }; },
        g => { const spawn = g.$gameMap.spawnEvent; g.$gameMap.spawnEvent = function() {
            spawn.apply(this, arguments); throw Error("post-registration failure");
        }; }]) {
        const game = loadGame(), deck = game.ProjectRCardDeck; game.startWith("apollo_golden_arrow");
        const before = plain(deck.getBattleState()); fail(game);
        const result = game.fire();
        assert.equal(result.reason, "activationFailed");
        assert.deepEqual(plain(deck.getBattleState()), before);
        assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
        assert.equal(game.$gameMap.events().filter(e => e.event()?.note.includes("<projectRGoldenArrow>")).length, 0,
            JSON.stringify({ result, commands: game.commands }));
    }
});
test("テンプレート/Skill/公式コマンド不足は生成前に非消費拒否", () => {
    for (const fail of [g => { g.$dataTemplateMap = null; }, g => { g.$dataSkills = []; },
        g => { delete g.PluginManager._commands["Hendrix_Action_Engine:UpdateEventHp"]; },
        g => { g.$dataTemplateMap.events[arrowTemplate.id].note = "<projectRGoldenArrow>"; }]) {
        const game = loadGame(), deck = game.ProjectRCardDeck; game.startWith("apollo_golden_arrow");
        const before = plain(deck.getBattleState()); fail(game);
        assert.equal(game.fire().reason, "activationFailed");
        assert.equal(game.spawns.length, 0); assert.deepEqual(plain(deck.getBattleState()), before);
    }
});
test("上下左右/斜めのマウス角を360度rotationへ渡し、発射後は追尾しない", () => {
    for (const [dx, dy, expected] of [[0,-100,0],[100,-100,45],[100,0,90],[100,100,135],
        [0,100,180],[-100,100,225],[-100,0,270],[-100,-100,315],[100,-53,62.076410285]]) {
        const game = loadGame(); game.startWith("apollo_golden_arrow");
        game.TouchInput.x = 504 + dx; game.TouchInput.y = 528 + dy;
        assert.equal(game.fire().ok, true);
        const event = game.projectile(), degree = event._rotation;
        assert.ok(Math.abs(degree - expected) < 0.00001, `${degree} vs ${expected}`);
        game.TouchInput.x = 1000; game.TouchInput.y = 0;
        const route = arrowTemplate.pages[0].moveRoute.list[0];
        event.processMoveCommand(route); event.processMoveCommand(route);
        assert.deepEqual(game.movements, [[event.eventId(), degree], [event.eventId(), degree]]);
        assert.equal(event._rotation, degree);
    }
});
test("Collision前はDamage要求なし、命中時だけ公式Skill計算→HP変更→弾破棄", () => {
    const game = loadGame(), enemy = game.addEnemy(); game.startWith("apollo_golden_arrow");
    game.fire(); game.Graphics.frameCount++; game.$gameMap.update(true);
    assert.equal(enemy.bar.currentHp, 200);
    assert.equal(game.commands.filter(c => c.name === "UpdateEventHp").length, 0);
    game.collideWith(enemy);
    assert.equal(enemy.bar.currentHp, 120); // Database formula: 50 * 2 - 20
    const damage = game.commands.find(c => c.name === "UpdateEventHp");
    assert.equal(damage.args.eventId, "1"); assert.equal(damage.args.value, "-damage");
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    assert.equal(game.$gameMap.events().filter(e => e.event()?.note.includes("<projectRGoldenArrow>")).length, 0);
    assert.equal(game.commands.at(-1).name, "DestroyEvent");
});
test("Database formula/属性設定の変更が実公式Damage計算へ反映", () => {
    const game = loadGame(), enemy = game.addEnemy(); game.startWith("apollo_golden_arrow");
    const skill = game.$dataSkills[arrowSkill.id];
    skill.damage.formula = "a.atk * 3 - b.def"; skill.damage.elementId = 2;
    enemy.event._battler = new game.Game_Enemy(1);
    enemy.event._battler.elementRate = id => id === 2 ? 0.5 : 1;
    game.fire(); game.collideWith(enemy);
    assert.equal(enemy.bar.currentHp, 135); // (50 * 3 - 20) * 0.5
});
test("重なる敵2体でも1Projectileは1Hitで終了、以降の更新で再Damageなし", () => {
    const game = loadGame(), first = game.addEnemy(1), second = game.addEnemy(2);
    game.startWith("apollo_golden_arrow"); game.fire();
    const arrow = game.projectile();
    first.event.locate(arrow._realX, arrow._realY + 0.5);
    second.event.locate(arrow._realX, arrow._realY + 0.5);
    game.Graphics.frameCount++; game.$gameMap.update(true);
    assert.equal(first.bar.currentHp, 120); assert.equal(second.bar.currentHp, 200);
    game.Graphics.frameCount++; game.$gameMap.update(true);
    assert.equal(game.commands.filter(c => c.name === "UpdateEventHp").length, 1);
});
test("同時に2発あってもDamage sourceの弾だけを破棄し、残りは次の命中を待つ", () => {
    const game = loadGame(), enemy = game.addEnemy(); game.startWith("apollo_golden_arrow"); game.fire();
    while (game.ProjectRCardDeck.getBattleState().hand[0].cardId !== "apollo_golden_arrow") {
        game.ProjectRCardDeck.useBattleCard(game.ProjectRCardDeck.getBattleState().hand[0].instanceId);
    }
    game.fire();
    const first = game.projectile();
    enemy.event.locate(first._realX, first._realY + 0.5);
    game.Graphics.frameCount++; game.$gameMap.update(true);
    assert.equal(enemy.bar.currentHp, 120);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    game.Graphics.frameCount++; game.$gameMap.update(true);
    assert.equal(enemy.bar.currentHp, 40);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
});
test("他6カードはPhase 2Aの仮成功を維持しProjectile/Damageを要求しない", () => {
    for (const card of cards.slice(0, 7).filter(c => c.cardId !== "apollo_golden_arrow")) {
        const game = loadGame(); game.startWith(card.cardId);
        assert.equal(game.fire().reason, "success");
        assert.equal(game.spawns.length, 0);
        assert.equal(game.commands.length, 0);
    }
});
test("通常武器の既存Bullet/Gun/CEへ追加弾判定を適用しない", () => {
    const game = loadGame(), enemy = game.addEnemy();
    const id = game.$gameMap.spawnEvent(7, 20, 20, false, 90);
    const gunId = game.$gameMap.spawnEvent(7, 12, 12, false, 90);
    game.$gameMap.update(true);
    assert.equal(enemy.bar.currentHp, 200); assert.equal(game.commands.length, 0);
    game.ProjectRCardDeck.endCardBattle();
    assert.ok(game.$gameMap.event(id)); assert.ok(game.$gameMap.event(gunId));
    assert.equal(game.$gameMap.event(id).event().note.split("\n")[0], "<projectRGunBullet>");
});
test("1キー→既存Input→Router→実生成が一度だけ発生、通常キー割当は不変", () => {
    const game = loadGame(), baseline = loadGame({ withoutPlugin: true });
    assert.deepEqual(plain(game.Input.keyMapper), plain(baseline.Input.keyMapper));
    game.startWith("apollo_golden_arrow");
    const event = { code: "KeyQ", keyCode: 81, preventDefault() {} };
    game.Input._onKeyDown(event); game.Input.update(); game.SceneManager._scene.update();
    game.Input._onKeyDown({ ...event, repeat: true }); game.Input.update(); game.SceneManager._scene.update();
    assert.equal(game.spawns.length, 1);
    assert.equal(game.ProjectRCardBattleInput.getLastResult().reason, "success");
});
test("Prefab寿命は公式wait90→DestroyEventで既存BulletやGunの動作を流用しない", () => {
    const page = arrowTemplate.pages[0];
    assert.equal(page.moveType, 3); assert.equal(page.moveRoute.repeat, true);
    assert.equal(page.moveRoute.list[0].parameters[0], "moveToPosition('forward')");
    assert.equal(JSON.stringify(page).includes("rotateTo"), false);
    assert.deepEqual(page.list[0], { code: 230, indent: 0, parameters: [90] });
    assert.equal(page.list[1].parameters[1], "DestroyEvent");
    assert.equal(arrowTemplate.note.includes("<weaponAttack>"), false);
    assert.ok(fs.existsSync(path.join(project, `img/characters/${page.image.characterName}.png`)));
});
test("終了・マップ移動で専用弾のみ破棄、ロードされた残存弾も公式APIで除去", () => {
    const game = loadGame(); game.startWith("apollo_golden_arrow"); game.fire();
    game.ProjectRCardDeck.endCardBattle();
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    game.startWith("apollo_golden_arrow"); game.fire(); game.$gameMap.setup(2);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    const orphan = game.$gameMap.spawnEvent(arrowTemplate.id, 10, 10, false, 90);
    const bullet = game.$gameMap.spawnEvent(7, 10, 10, false, 90);
    game.SceneManager._scene.onMapLoaded();
    assert.equal(game.$gameMap.event(orphan), null);
    assert.ok(game.$gameMap.event(bullet));
});
test("セーブ関数/Phase 1形式に変更なし、ロードによる一時状態破棄を維持", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    assert.equal(game.DataManager.makeSaveContents, game.saveBeforePlugin[0]);
    assert.equal(game.DataManager.extractSaveContents, game.saveBeforePlugin[1]);
    const before = plain(deck.getPersistentData()); game.startWith("apollo_golden_arrow"); game.fire();
    assert.deepEqual(plain(deck.getPersistentData()), before);
    game.DataManager.extractSaveContents({ system: game.$gameSystem, map: game.$gameMap });
    assert.equal(deck.getBattleState(), null); assert.equal(deck.isCardBattleActive(), false);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
});
test("実機手順書のConsoleコードで本番7種から30枚/黄金の弓矢を準備し復元できる", () => {
    const game = loadGame({ prepare: false, productionDefinitions: true });
    game.console = { log() {} };
    const before = plain(game.ProjectRCardDeck.getPersistentData());
    const blocks = [...read("docs/ProjectR_CardDeck_Phase2B.md").matchAll(/```js\n([\s\S]*?)```/g)].map(m => m[1]);
    assert.equal(blocks.length, 2);
    vm.runInContext(blocks[0], game);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(game.ProjectRCardDeck.getBattleState().hand[0].cardId, "apollo_golden_arrow");
    assert.equal(game.fire().reason, "success");
    vm.runInContext(blocks[1], game);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(game.ProjectRCardDeck.definitions.cardDefinitions().length, 7);
    assert.equal(game.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    assert.deepEqual(plain(game.ProjectRCardDeck.getPersistentData()), before);
});

console.log(`# ${passed} Phase 2B tests passed`);
