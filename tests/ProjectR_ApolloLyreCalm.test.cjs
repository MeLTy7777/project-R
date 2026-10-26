"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "apollo_lyre_calm";
const CALM = 34, SLEEP = 32, OBSCURE = 31, DISEASE = 33;
const PLUGIN = "ProjectR_ApolloLyreCalm";
const ADD = "Hendrix_Action_Engine:AddState";
const REMOVE = "Hendrix_Action_Engine:RemoveState";
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
function loadGame({ duration = "6.0" } = {}) {
    const g = fixture.createInputGame({ productionDefinitions: false, prepare: true });
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
    run(method(read("js/rmmz_core.js"), "Array.prototype.remove ="));
    // 標準Stateの付与/解除/重複防止/耐性(refreshのステート無効化含む)はMZ実ソース。
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
    run(read(`js/plugins/${PLUGIN}.js`));
    g.api = g.ProjectRApolloLyreCalm;
    g.calm = () => g.api.isPlayerCalm();
    // 敵・Event側と同じ公式AddState(target: player)経路。
    g.addOfficial = id => {
        g.PluginManager.callCommand({ _eventId: 0 }, "Hendrix_Action_Engine", "AddState", { target: "player", stateId: String(id) });
        g.commands.pop();
    };
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

test("本番登録・Database State34・精神異常リスト(睡眠32のみ)・Lyre定義", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const ps = config.$plugins;
    const p = ps.filter(p => p.name === PLUGIN);
    assert.equal(p.length, 1);
    assert.equal(p[0].status, true);
    assert.equal(p[0].parameters.DurationSeconds, "6.0");
    assert.ok(ps.indexOf(p[0]) > ps.findIndex(p => p.name === "ProjectR_ApolloDiseaseAttack"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${p[0].name}.js`)));
    const states = JSON.parse(read("data/States.json"));
    assert.equal(states.length, 35);
    assert.deepEqual(states.slice(31).map(s => s.id), [31, 32, 33, 34]);
    const calm = states[CALM];
    assert.equal(calm.name, "精神安定");
    assert.deepEqual(calm.traits, [{ code: 14, dataId: SLEEP, value: 1 }]);
    assert.equal(calm.restriction, 0);
    assert.equal(calm.autoRemovalTiming, 0);
    assert.equal(calm.removeByDamage, false);
    assert.equal(calm.removeByWalking, false);
    assert.equal(calm.removeAtBattleEnd, true);
    assert.equal(states.filter(s => s?.note?.includes("<ProjectRCard: apollo_lyre_calm>")).length, 1);
    for (const id of [OBSCURE, SLEEP, DISEASE]) assert.deepEqual(states[id].traits, []);
    assert.deepEqual(plain(loadGame().api.getMentalStateIds()), [SLEEP]);
    const defs = JSON.parse(ps.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions).map(JSON.parse);
    const card = defs.find(c => c.cardId === CARD);
    assert.equal(card.ringId, "apollo");
    assert.equal(card.cooldownSeconds, "10");
    assert.equal(card.targetType, "ally");
});
test("ally handlerへdispatch→Calm付与・睡眠解除・消費・10秒Cooldown・即時ドロー、マウス不要", () => {
    const g = loadGame(); g.start();
    const card = g.arrange();
    g.addOfficial(SLEEP);
    assert.equal(g.actor.isStateAffected(SLEEP), true);
    const persistent = plain(g.ProjectRCardDeck.getPersistentData());
    const before = g.ProjectRCardDeck.getBattleState();
    const result = g.ProjectRCardDeck.requestUseCard(0); // TouchInput/対象指定なし
    assert.equal(result.ok, true);
    assert.equal(result.targetType, "ally");
    assert.equal(g.actor.isStateAffected(SLEEP), false);
    assert.equal(g.calm(), true);
    assert.equal(g.actor.isStateAffected(CALM), true);
    // 睡眠はCalm付与時のMZ標準refresh(ステート無効化の消去)で解除される。
    assert.deepEqual(plain(g.commands.map(c => [c.name, c.args, c.eventId])), [
        ["AddState", { target: "player", stateId: "34" }, 0]]);
    const state = g.ProjectRCardDeck.getBattleState();
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length, before.drawPile.length - 1);
    assert.ok(!state.hand.some(c => c.instanceId === card.instanceId));
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === card.instanceId).remainingSeconds, 10);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), persistent);
});
test("認識阻害31と病33は解除も耐性もされない", () => {
    const g = loadGame(); g.start(); g.arrange();
    g.actor.addState(OBSCURE); g.actor.addState(DISEASE);
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.actor.isStateAffected(OBSCURE), true);
    assert.equal(g.actor.isStateAffected(DISEASE), true);
    g.actor.removeState(OBSCURE); g.actor.removeState(DISEASE);
    g.addOfficial(OBSCURE); g.addOfficial(DISEASE);
    assert.equal(g.actor.isStateAffected(OBSCURE), true);
    assert.equal(g.actor.isStateAffected(DISEASE), true);
});
test("解除対象なしでもCalmのみで成功", () => {
    const g = loadGame(); g.start(); const card = g.arrange();
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.calm(), true);
    assert.deepEqual(plain(g.commands.map(c => c.name)), ["AddState"]);
    assert.ok(g.ProjectRCardDeck.getBattleState().cooldownPile.some(c => c.instance.instanceId === card.instanceId));
});
test("Calm中は公式AddStateで睡眠32が付かず、設定外Stateは通常付与", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.addOfficial(SLEEP);
    assert.equal(g.actor.isStateAffected(SLEEP), false);
    g.actor.addState(SLEEP); // 標準addStateも同じ耐性
    assert.equal(g.actor.isStateAffected(SLEEP), false);
    g.addOfficial(15);
    assert.equal(g.actor.isStateAffected(15), true);
    g.addOfficial(OBSCURE);
    assert.equal(g.actor.isStateAffected(OBSCURE), true);
});
test("Calm終了後は睡眠が再び付与できる", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(6);
    g.addOfficial(SLEEP);
    assert.equal(g.actor.isStateAffected(SLEEP), true);
});
test("精神異常リストはCalm Stateのステート無効化に追加するだけで拡張できる", () => {
    const g = loadGame();
    g.$dataStates[CALM].traits.push({ code: 14, dataId: 15, value: 1 });
    g.start(); g.arrange(); g.actor.addState(15); g.actor.addState(OBSCURE);
    assert.deepEqual(plain(g.api.getMentalStateIds()), [SLEEP, 15]);
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.actor.isStateAffected(15), false);
    assert.equal(g.actor.isStateAffected(OBSCURE), true);
    g.addOfficial(15);
    assert.equal(g.actor.isStateAffected(15), false);
});
test("戦闘非稼働・指輪未所持は拒否、State付与なし", () => {
    const g = loadGame();
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, false);
    assert.equal(g.commands.length, 0);
    g.ProjectRCardDeck.setRingUnowned("apollo");
    assert.equal(g.ProjectRCardDeck.startCardBattle().ok, false);
    g.ProjectRCardDeck.assignRingToPlayer("apollo"); g.start(); g.arrange();
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.apollo = "unowned";
    const before = plain(g.ProjectRCardDeck.getBattleState());
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).reason, "cardUnavailable");
    assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
    assert.equal(g.commands.length, 0);
    assert.equal(g.calm(), false);
});
test("State付与失敗/欠落/例外はactivationFailed、全札非消費、睡眠も解除されない", () => {
    for (const fail of [
        g => { g.actor.isStateResist = id => id === CALM; },
        g => { g.actor.addState(1); }, // 戦闘不能: addState不可
        g => { g.PluginManager._commands[ADD] = () => {}; },
        g => { delete g.PluginManager._commands[REMOVE]; },
        g => { g.$dataStates[CALM].note = ""; },
        g => { g.PluginManager._commands[ADD] = () => { throw Error("failed"); }; },
        g => { const add = g.PluginManager._commands[ADD];
            g.PluginManager._commands[ADD] = function(args) { add.call(this, args); throw Error("after add"); }; }
    ]) {
        const g = loadGame(); g.start(); g.arrange();
        fail(g);
        g.actor._states.push(SLEEP); g.actor._stateTurns[SLEEP] = 0; // 死亡dieによる全State消去の後に仕込む
        const before = plain(g.ProjectRCardDeck.getBattleState());
        const result = g.ProjectRCardDeck.requestUseCard(0);
        assert.equal(result.reason, "activationFailed");
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
        assert.equal(g.actor.isStateAffected(CALM), false, `${fail}: ${result.detail}`);
        assert.equal(g.actor.isStateAffected(SLEEP), true);
        assert.equal(g.api.getRemainingSeconds(), 0);
    }
});
test("6秒経過で公式RemoveState(eventId=0)→State/API/残り時間とも解除", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(5.99);
    assert.equal(g.calm(), true);
    assert.ok(Math.abs(g.api.getRemainingSeconds() - 0.01) < 1e-6);
    g.ProjectRCardDeck.updateCooldown(0.01);
    assert.equal(g.calm(), false);
    assert.equal(g.actor.isStateAffected(CALM), false);
    assert.equal(g.api.getRemainingSeconds(), 0);
    assert.equal(g.commands.at(-1).name, "RemoveState");
    assert.equal(g.commands.at(-1).args.stateId, "34");
    assert.equal(g.commands.at(-1).eventId, 0);
});
test("再使用は重複せず残りを6秒へ更新し、解除を再実行、別Instanceも通常消費", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(4);
    g.actor._states.push(SLEEP); g.actor._stateTurns[SLEEP] = 0; // 耐性を回避して混入した場合
    const second = g.arrange();
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.actor.isStateAffected(SLEEP), false);
    assert.equal(g.actor._states.filter(id => id === CALM).length, 1);
    assert.ok(Math.abs(g.api.getRemainingSeconds() - 6) < 1e-9);
    assert.ok(g.ProjectRCardDeck.getBattleState().cooldownPile.some(c => c.instance.instanceId === second.instanceId));
    g.ProjectRCardDeck.updateCooldown(5.9); assert.equal(g.calm(), true);
    g.ProjectRCardDeck.updateCooldown(0.1); assert.equal(g.calm(), false);
});
test("設定データで持続時間を変更でき、不正な時間入力は進行させない", () => {
    const g = loadGame({ duration: "2.5" }); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    for (const seconds of [NaN, Infinity, -1, 0]) g.ProjectRCardDeck.updateCooldown(seconds);
    g.ProjectRCardDeck.updateCooldown(2.49); assert.equal(g.calm(), true);
    g.ProjectRCardDeck.updateCooldown(0.01); assert.equal(g.calm(), false);
    const bad = loadGame({ duration: "-3" }); bad.start(); bad.arrange(); bad.ProjectRCardDeck.requestUseCard(0);
    assert.equal(bad.api.getRemainingSeconds(), 6);
});
test("共通判定APIは内部タイマーでなく公式Stateを参照し、外部解除でタイマーを破棄", () => {
    const g = loadGame();
    g.actor.addState(CALM); assert.equal(g.calm(), true);
    g.actor.removeState(CALM); assert.equal(g.calm(), false);
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.actor.removeState(CALM); assert.equal(g.calm(), false);
    assert.equal(g.api.getRemainingSeconds(), 0);
    g.ProjectRCardDeck.updateCooldown(1); assert.equal(g.calm(), false);
});
test("endCardBattleでState/タイマー解除、繰返し終了/次戦に持ち越さない", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.endCardBattle(); g.ProjectRCardDeck.endCardBattle();
    assert.equal(g.calm(), false);
    assert.equal(g.actor.isStateAffected(CALM), false);
    assert.equal(g.api.getRemainingSeconds(), 0);
    assert.equal(g.ProjectRCardDeck.getBattleState(), null);
    g.ProjectRCardDeck.updateCooldown(100); // 非稼働中は何も進まない
    assert.equal(g.calm(), false);
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.ProjectRCardDeck.updateCooldown(5.9); assert.equal(g.calm(), true);
});
test("1～5各キーで一度だけ発動、長押し/Hotbar二重発火なし", () => {
    for (let digit = 1; digit <= 5; digit++) {
        const g = loadGame(); g.start(); g.arrange(digit - 1);
        const mapper = plain(g.Input.keyMapper);
        g.emitKey("keydown", digit); g.tick();
        assert.equal(g.ProjectRCardBattleInput.getLastResult().cardId, CARD);
        assert.equal(g.calm(), true);
        g.emitKey("keydown", digit, { repeat: true }); g.tick();
        assert.equal(g.commands.filter(c => c.name === "AddState").length, 1);
        assert.deepEqual(plain(g.legacyUses), []);
        assert.deepEqual(plain(g.Input.keyMapper), mapper);
        g.emitKey("keyup", digit);
    }
});
test("Input経由360フレームで解除、フォーカス/会話/メニュー中は時間停止", () => {
    const g = loadGame(); g.start(); g.arrange(); g.tap(1);
    g.emitWindow("blur"); for (let i = 0; i < 370; i++) g.tick();
    assert.equal(g.calm(), true); g.emitWindow("focus");
    g.$gameMessage.isBusy = () => true; for (let i = 0; i < 370; i++) g.tick();
    assert.equal(g.calm(), true); g.$gameMessage.isBusy = () => false;
    const scene = g.SceneManager._scene; g.SceneManager._scene = {};
    for (let i = 0; i < 370; i++) g.tick();
    assert.equal(g.calm(), true); g.SceneManager._scene = scene;
    for (let i = 0; i < 359; i++) g.tick(); assert.equal(g.calm(), true);
    g.tick(); assert.equal(g.calm(), false);
});
test("saveコピーからCalmのみ除去、実Actor/他State/Phase1形式を維持、ロードで持ち越さない", () => {
    const g = loadGame(); g.actor.addState(15);
    const before = plain(g.DataManager.makeSaveContents());
    g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    const saved = g.DataManager.makeSaveContents();
    assert.equal(g.calm(), true);
    assert.notEqual(saved.actors, g.$gameActors);
    assert.notEqual(saved.actors._data[1], g.actor);
    assert.equal(saved.actors._data[1].isStateAffected(CALM), false);
    assert.equal(saved.actors._data[1].isStateAffected(15), true);
    assert.equal(CALM in saved.actors._data[1]._stateTurns, false);
    assert.deepEqual(plain(saved.system), before.system);
    assert.deepEqual(Object.keys(saved).sort(), Object.keys(before).sort());
    assert.ok(!/remaining|activation|cooldownPile|drawPile/.test(JSON.stringify(saved)));
    g.DataManager.extractSaveContents(saved);
    assert.equal(g.calm(), false);
    assert.equal(g.api.getRemainingSeconds(), 0);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
});
test("主人公交代でも旧ActorにCalmを残さない", () => {
    const g = loadGame(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0);
    g.$gameActors._data[1] = new g.Game_Battler();
    g.ProjectRCardDeck.updateCooldown(1);
    assert.equal(g.actor.isStateAffected(CALM), false);
    assert.equal(g.calm(), false);
});
test("他instantカードはPhase 2A仮成功を維持しStateコマンドを呼ばない", () => {
    const g = loadGame(); g.start(); g.arrange(0, "hermes_swift_movement");
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
    assert.equal(g.commands.length, 0);
    assert.equal(g.calm(), false);
});
test("Lyre登録後もGolden Arrowのdirection/生成/Skill Damage/1Hitを維持", () => {
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
    assert.equal(result.state.cooldownPile.find(c => c.instance.instanceId === result.instanceId).remainingSeconds, 4);
    g.collideWith(enemy);
    assert.equal(enemy.bar.currentHp, 120);
    g.ProjectRCardDeck.endCardBattle();
});

console.log(`# ${passed} Phase 2C-6 tests passed`);
