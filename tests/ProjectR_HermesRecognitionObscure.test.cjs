"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "hermes_perception_obscure";
const STATE = 31;
const PLUGIN = "ProjectR_HermesRecognitionObscure";
const engine = read("js/plugins/Hendrix_Action_Engine.js");
const objects = read("js/rmmz_objects.js");
// 既存Phase 2Aの実Input/Keyboard/Hotbar fixtureを共有。既存テスト本体は実行しない。
const fixtureSource = read("tests/ProjectR_CardDeckCore.phase2a.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(fixtureSource.slice(0, fixtureSource.indexOf("const api = require(")) +
    "\nthis.createInputGame = loadGame;", fixture);
function method(source, marker, ending = "\n};") {
    const start = source.indexOf(marker);
    const end = source.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, marker);
    return source.slice(start, end + ending.length);
}
function loadGame({ duration = "5.0", production = false } = {}) {
    const g = fixture.createInputGame({ productionDefinitions: production, prepare: !production });
    const run = source => vm.runInContext(source, g);
    g.$dataStates = JSON.parse(read("data/States.json"));
    g.$gameMap.events = () => [];
    g.$gameMap.mapId = () => 1;
    g.PluginManager._commands = {};
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === PLUGIN ? { DurationSeconds: duration } : params(name);
    const managers = read("js/rmmz_managers.js");
    for (const marker of ["PluginManager.registerCommand =", "PluginManager.callCommand ="]) run(method(managers, marker));
    run("Number.prototype.clamp = function(min, max) { return Math.min(Math.max(this, min), max); };" +
        "Array.prototype.contains = Array.prototype.includes; Math.randomInt = max => Math.floor(max / 2);");
    const core = read("js/rmmz_core.js");
    run(method(core, "Array.prototype.remove ="));
    // 標準Stateの付与/解除/重複防止/耐性はMZ実ソース。Actor DB/描画はfixture。
    run(objects.slice(objects.indexOf("function Game_ActionResult()"), objects.indexOf("function Game_Actor()")));
    run("Game_Battler.prototype.paramBase = id => id === 0 ? 100 : 10;" +
        "Game_Battler.prototype.isActor = () => true; Game_Battler.prototype.actorId = () => 1;");
    g.actor = new g.Game_Battler();
    g.actor._hp = 100;
    g.actor._mp = 10;
    g.$gameActors = { _data: [null, g.actor] };
    g.$gameParty.leader = () => g.$gameActors._data[1];
    g.DataManager.makeSaveContents = () => ({ system: g.$gameSystem, actors: g.$gameActors });
    const extract = g.DataManager.extractSaveContents;
    g.DataManager.extractSaveContents = function(contents) {
        g.$gameActors = contents.actors;
        extract.call(this, contents);
    };
    run('const HpluginName = "Hendrix_Action_Engine"; const commonEventNameCache = {}; const stateNameCache = {};');
    for (const marker of ["window.findTargets =", "window.findTarget =", "window.hasState ="]) run(method(engine, marker));
    for (const marker of ["function SgetBattlerForH(", "function ScheckStateResistanceH(",
        "function findEventByLinkedActorId_StateCEH("]) run(method(engine, marker, "\n}"));
    // 導入版のState CE aliasも無改変で使用（今回のStateにはCEを設定しない）。
    run(engine.slice(engine.indexOf("const S_Game_Battler_addState_StateCEH"), engine.indexOf("window.hasState =")));
    for (const name of ["AddState", "RemoveState"]) {
        run(method(engine, `PluginManager.registerCommand(HpluginName, "${name}",`, "\n});"));
    }
    g.commands = [];
    const call = g.PluginManager.callCommand;
    g.PluginManager.callCommand = function(self, plugin, name, args) {
        g.commands.push({ plugin, name, args, eventId: self._eventId });
        return call.apply(this, arguments);
    };
    require("./GodSummonFixture.cjs")(g);
    run(read(`js/plugins/${PLUGIN}.js`));
    g.obscured = () => g.ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured();
    g.start = () => assert.equal(g.ProjectRCardDeck.startCardBattle().ok, true);
    g.arrange = (index = 0, cardId = CARD) => {
        const deck = g.ProjectRCardDeck;
        for (let attempts = 0; attempts < 30; attempts++) {
            const state = deck.getBattleState();
            if (state.hand[index]?.cardId === cardId) return state.hand[index];
            assert.equal(deck.useBattleCard(state.hand[index].instanceId).ok, true);
        }
        throw Error(`card unavailable: ${cardId}`);
    };
    return g;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("本番登録が有効/一意/順序・ファイル名一致、State31は非拘束・無敵なし", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const ps = config.$plugins;
    const p = ps.filter(p => p.name === PLUGIN);
    assert.equal(p.length, 1);
    assert.equal(p[0].status, true);
    assert.equal(p[0].parameters.DurationSeconds, "5.0");
    assert.ok(ps.indexOf(p[0]) > ps.findIndex(p => p.name === "ProjectR_ApolloGoldenArrow"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${p[0].name}.js`)));
    const state = JSON.parse(read("data/States.json"))[STATE];
    assert.equal(state.name, "認識阻害");
    assert.deepEqual(state.traits, []);
    assert.equal(state.restriction, 0);
    assert.equal(state.autoRemovalTiming, 0);
    assert.equal(state.removeByDamage, false);
    assert.equal(state.removeByWalking, false);
    assert.equal(state.removeAtBattleEnd, true);
});
test("instant dispatch→公式player State付与成功時だけ消費・10秒Cooldown・即時ドロー", () => {
    const g = loadGame(); g.start();
    const card = g.arrange();
    const persistent = plain(g.ProjectRCardDeck.getPersistentData());
    const before = g.ProjectRCardDeck.getBattleState();
    const result = g.ProjectRCardDeck.requestUseCard(0);
    assert.equal(result.ok, true);
    assert.equal(result.targetType, "instant");
    assert.equal(g.actor.isStateAffected(STATE), true);
    assert.equal(g.obscured(), true);
    assert.deepEqual(plain(g.commands), [{ plugin: "Hendrix_Action_Engine", name: "AddState",
        args: { target: "player", stateId: "31" }, eventId: 0 }]);
    const state = g.ProjectRCardDeck.getBattleState();
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length, before.drawPile.length - 1);
    assert.ok(!state.hand.some(c => c.instanceId === card.instanceId));
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === card.instanceId).remainingSeconds, 10);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), persistent);
});
test("Hermes指輪未所持は開始/使用拒否、State付与も消費もなし", () => {
    const g = loadGame();
    g.ProjectRCardDeck.setRingUnowned("hermes");
    assert.equal(g.ProjectRCardDeck.startCardBattle().ok, false);
    g.ProjectRCardDeck.assignRingToPlayer("hermes"); g.start(); g.arrange();
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "unowned";
    const before = plain(g.ProjectRCardDeck.getBattleState());
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).reason, "cardUnavailable");
    assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
    assert.equal(g.commands.length, 0);
    assert.equal(g.obscured(), false);
});
test("State耐性/死亡/公式付与失敗/欠落/例外はactivationFailed、全札非消費", () => {
    for (const fail of [
        g => { g.actor.isStateResist = () => true; },
        g => { g.actor.addState(1); },
        g => { g.PluginManager._commands['Hendrix_Action_Engine:AddState'] = () => {}; },
        g => { delete g.PluginManager._commands['Hendrix_Action_Engine:RemoveState']; },
        g => { g.$dataStates[STATE].note = ""; },
        g => { g.PluginManager._commands['Hendrix_Action_Engine:AddState'] = () => { throw Error('failed'); }; },
        g => { const add = g.PluginManager._commands['Hendrix_Action_Engine:AddState'];
            g.PluginManager._commands['Hendrix_Action_Engine:AddState'] = function(args) { add.call(this, args); throw Error('after add'); }; }
    ]) {
        const g = loadGame(); g.start(); g.arrange(); fail(g);
        const before = plain(g.ProjectRCardDeck.getBattleState());
        const result = g.ProjectRCardDeck.requestUseCard(0);
        assert.equal(result.reason, "activationFailed");
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
        assert.equal(g.actor.isStateAffected(STATE), false, `${fail}: ${result.detail}`);
    }
});
test("5秒経過で公式RemoveState(eventId=0)→State/APIともfalse", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(4.99);
    assert.equal(g.obscured(), true);
    g.ProjectRCardDeck.updateCooldown(0.01);
    assert.equal(g.obscured(), false);
    assert.equal(g.actor.isStateAffected(STATE), false);
    assert.equal(g.commands.at(-1).name, "RemoveState");
    assert.equal(g.commands.at(-1).eventId, 0);
});
test("再使用は重複せず残りを5秒へ更新し、別Instanceも通常消費", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(4);
    const second = g.arrange();
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.actor._states.filter(id => id === STATE).length, 1);
    assert.ok(g.ProjectRCardDeck.getBattleState().cooldownPile.some(c => c.instance.instanceId === second.instanceId));
    g.ProjectRCardDeck.updateCooldown(1.1);
    assert.equal(g.obscured(), true);
    g.ProjectRCardDeck.updateCooldown(3.9);
    assert.equal(g.obscured(), false);
});
test("設定データで持続時間を変更でき、不正な時間入力は進行させない", () => {
    const g = loadGame({ duration: "2.5" }); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    for (const seconds of [NaN, Infinity, -1, 0]) g.ProjectRCardDeck.updateCooldown(seconds);
    g.ProjectRCardDeck.updateCooldown(2.49); assert.equal(g.obscured(), true);
    g.ProjectRCardDeck.updateCooldown(0.01); assert.equal(g.obscured(), false);
});
test("共通判定APIは内部タイマーでなく公式Stateを参照する", () => {
    const g = loadGame();
    g.actor.addState(STATE); assert.equal(g.obscured(), true);
    g.actor.removeState(STATE); assert.equal(g.obscured(), false);
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.actor.removeState(STATE); assert.equal(g.obscured(), false);
    g.ProjectRCardDeck.updateCooldown(1); assert.equal(g.obscured(), false);
});
test("endCardBattleで強制解除、繰返し終了/次戦に残り時間を持ち越さない", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.endCardBattle(); g.ProjectRCardDeck.endCardBattle();
    assert.equal(g.obscured(), false);
    assert.equal(g.ProjectRCardDeck.getBattleState(), null);
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(4.9); assert.equal(g.obscured(), true);
});
test("1～5各キーで一度だけ発動、長押し/Hotbar二重発火なし", () => {
    for (let digit = 1; digit <= 5; digit++) {
        const g = loadGame(); g.start(); g.arrange(digit - 1);
        const mapper = plain(g.Input.keyMapper);
        g.emitKey("keydown", digit); g.tick();
        assert.equal(g.ProjectRCardBattleInput.getLastResult().cardId, CARD);
        assert.equal(g.obscured(), true);
        g.emitKey("keydown", digit, { repeat: true }); g.tick();
        assert.equal(g.commands.filter(c => c.name === "AddState").length, 1);
        assert.deepEqual(plain(g.legacyUses), []);
        assert.deepEqual(plain(g.Input.keyMapper), mapper);
        g.emitKey("keyup", digit);
    }
});
test("Input経由300フレームで解除、フォーカス/会話/メニュー中は時間停止", () => {
    const g = loadGame(); g.start(); g.arrange(); g.tap(1);
    g.emitWindow("blur"); for (let i = 0; i < 310; i++) g.tick();
    assert.equal(g.obscured(), true); g.emitWindow("focus");
    g.$gameMessage.isBusy = () => true; for (let i = 0; i < 310; i++) g.tick();
    assert.equal(g.obscured(), true); g.$gameMessage.isBusy = () => false;
    const scene = g.SceneManager._scene; g.SceneManager._scene = {};
    for (let i = 0; i < 310; i++) g.tick();
    assert.equal(g.obscured(), true); g.SceneManager._scene = scene;
    for (let i = 0; i < 299; i++) g.tick(); assert.equal(g.obscured(), true);
    g.tick(); assert.equal(g.obscured(), false);
});
test("saveコピーから専用State/ターンのみ除去、実Actor/他State/Phase1形式を維持", () => {
    const g = loadGame(); g.actor.addState(15);
    const before = plain(g.DataManager.makeSaveContents());
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    const saved = g.DataManager.makeSaveContents();
    assert.equal(g.obscured(), true);
    assert.notEqual(saved.actors, g.$gameActors);
    assert.notEqual(saved.actors._data[1], g.actor);
    assert.equal(saved.actors._data[1].isStateAffected(STATE), false);
    assert.equal(saved.actors._data[1].isStateAffected(15), true);
    assert.equal(STATE in saved.actors._data[1]._stateTurns, false);
    assert.deepEqual(plain(saved.system), before.system);
    assert.deepEqual(Object.keys(saved).sort(), Object.keys(before).sort());
    assert.deepEqual(Object.keys(saved.actors._data[1]).sort(), Object.keys(g.actor).sort());
    assert.ok(!/remaining|activation|cooldownPile|drawPile/.test(JSON.stringify(saved)));
    g.DataManager.extractSaveContents(saved);
    assert.equal(g.obscured(), false);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(g.ProjectRCardBattleInput.getLastResult(), null);
});
test("主人公交代でも旧Actorに専用Stateを残さない", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.$gameActors._data[1] = new g.Game_Battler();
    g.ProjectRCardDeck.updateCooldown(1);
    assert.equal(g.actor.isStateAffected(STATE), false);
    assert.equal(g.obscured(), false);
});
test("他instantカードはPhase2A仮成功を維持しStateコマンドを呼ばない", () => {
    const g = loadGame(); g.start(); g.arrange(0, "hermes_swift_movement");
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.commands.length, 0);
    assert.equal(g.obscured(), false);
});
test("Hermesを後から登録してもGolden Arrowのdirection/生成/Skill Damage/1Hitを維持", () => {
    const arrowFixture = { require, __dirname, console };
    const source = read("tests/ProjectR_ApolloGoldenArrow.test.cjs");
    vm.runInNewContext(source.slice(0, source.indexOf("let passed = 0;")) +
        "\nthis.createArrowGame = loadGame;", arrowFixture);
    const g = arrowFixture.createArrowGame();
    g.$dataStates = JSON.parse(read("data/States.json"));
    g.$gameParty.leader().isStateAffected = () => false;
    vm.runInContext(read(`js/plugins/${PLUGIN}.js`), g);
    const enemy = g.addEnemy(); g.startWith("apollo_golden_arrow");
    const result = g.fire();
    assert.equal(result.targetType, "direction");
    assert.equal(result.ok, true);
    assert.equal(result.state.hand.length, 5);
    assert.equal(result.state.cooldownPile.find(c => c.instance.instanceId === result.instanceId).remainingSeconds, 4);
    g.collideWith(enemy);
    assert.equal(enemy.bar.currentHp, 120);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    g.$gameMap.update(true);
    assert.equal(enemy.bar.currentHp, 120);
    g.ProjectRCardDeck.endCardBattle();
});
test("MZ手順書のConsoleコードを本番7定義で実行・再使用・恒久データ復元", () => {
    const g = loadGame({ production: true });
    const blocks = [...read("docs/ProjectR_CardDeck_Phase2C1.md").matchAll(/```js\r?\n([\s\S]*?)```/g)].map(m => m[1]);
    assert.equal(blocks.length, 3);
    const before = plain(g.ProjectRCardDeck.getPersistentData());
    vm.runInContext(blocks[0], g);
    assert.equal(g.ProjectRCardDeck.getBattleState().hand[0].cardId, CARD);
    g.tap(1); assert.equal(g.obscured(), true);
    g.ProjectRCardDeck.updateCooldown(5); assert.equal(g.obscured(), false);
    vm.runInContext(blocks[1], g);
    assert.equal(g.obscured(), true);
    g.tap(1); assert.equal(g.obscured(), true);
    vm.runInContext(blocks[2], g);
    assert.equal(g.obscured(), false);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), before);
    assert.equal(g.ProjectRCardDeck.definitions.cardDefinitions().length, 7);
});

console.log(`# ${passed} Phase 2C-1 tests passed`);
