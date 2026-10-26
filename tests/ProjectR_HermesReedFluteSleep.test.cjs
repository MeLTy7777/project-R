"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "hermes_reed_flute_sleep", STATE = 32, PLUGIN = "ProjectR_HermesReedFluteSleep";
const source = read("tests/ProjectR_HermesRecognitionObscure.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(source.slice(0, source.indexOf("let passed = 0;")) + "\nthis.createGame = loadGame;", fixture);
const engine = read("js/plugins/Hendrix_Action_Engine.js");
function method(source, marker) {
    const start = source.indexOf(marker), end = source.indexOf("\n};", start);
    assert.ok(start >= 0 && end > start, marker);
    return source.slice(start, end + 4);
}
function loadGame({ range = "4", duration = "4.0", production = false } = {}) {
    const g = fixture.createGame({ production });
    const run = code => vm.runInContext(code, g);
    run("Math.random = () => 0.5;");
    g.Game_Map = function() {};
    g.Game_Map.prototype.setup = function() { this._events = []; };
    g.Game_Map.prototype.event = function(id) { return this._events[id]; };
    g.Game_Map.prototype.events = function() { return this._events.filter(Boolean); };
    Object.setPrototypeOf(g.$gameMap, g.Game_Map.prototype);
    delete g.$gameMap.events;
    g.$gameMap._events = [];
    g.$gameMap.deltaX = (x, y) => x - y;
    g.$gameMap.deltaY = (x, y) => x - y;
    g.$gamePlayer.x = 0; g.$gamePlayer.y = 0; g.$gamePlayer.direction = () => 2;
    g.$gameVariables = { _data: {} };
    g.$dataEnemies = JSON.parse(read("data/Enemies.json"));
    g.$gameActors.actor = id => g.$gameActors._data[id];
    const objects = read("js/rmmz_objects.js");
    run(objects.slice(objects.indexOf("function Game_Enemy()"), objects.indexOf("function Game_Actors()")));
    run("Game_Enemy.prototype.isActor = () => false;");
    run(method(engine, "Game_System.prototype.checkInRange ="));
    run(method(engine, "window.checkRange ="));
    run(method(engine, "Game_Map.prototype.getCurrentEventHp ="));
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === PLUGIN ? { RangeTiles: range, DurationSeconds: duration } : params(name);
    const save = g.DataManager.makeSaveContents;
    g.DataManager.makeSaveContents = () => ({ ...save(), map: g.$gameMap });
    const extract = g.DataManager.extractSaveContents;
    g.DataManager.extractSaveContents = function(contents) { extract(contents); g.$gameMap = contents.map; };
    require("./GodSummonFixture.cjs")(g);
    run(read(`js/plugins/${PLUGIN}.js`));
    g.addEnemy = (x = 2, y = 0, tag = "<enemy>") => {
        const id = g.$gameMap._events.length || 1;
        const data = { id, name: "enemy", note: tag };
        const databaseEnemy = { ...plain(g.$dataEnemies[1]), id: g.$dataEnemies.length };
        g.$dataEnemies.push(databaseEnemy);
        const enemy = { _eventId: id, x, y, databaseEnemy,
            eventId: () => id, event: () => data, direction: () => 2, getHpValueFromNote: () => 200 };
        g.$gameMap._events[id] = enemy;
        g.SgetBattlerForH(enemy);
        Object.defineProperty(enemy, "battler", { get: () => enemy._battler });
        return enemy;
    };
    g.sleeping = event => g.ProjectRHermesReedFluteSleep.isEventSleeping(event.eventId());
    g.fire = () => { g.arrange(0, CARD); return g.ProjectRCardDeck.requestUseCard(0); };
    return g;
}
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

test("登録一意/順序/ファイル一致、専用State32はDamage・ターン解除/回復/無敵なし", () => {
    const config = {}; vm.runInNewContext(read("js/plugins.js"), config);
    const ps = config.$plugins, p = ps.filter(p => p.name === PLUGIN);
    assert.equal(p.length, 1); assert.equal(p[0].status, true);
    assert.deepEqual(plain(p[0].parameters), { RangeTiles: "4", DurationSeconds: "4.0" });
    assert.ok(ps.indexOf(p[0]) > ps.findIndex(p => p.name === "ProjectR_HermesRecognitionObscure"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", PLUGIN + ".js")));
    const s = JSON.parse(read("data/States.json"))[STATE];
    assert.equal(s.name, "睡眠"); assert.equal(s.note, `<ProjectRCard: ${CARD}>`);
    assert.equal(s.removeByDamage, false); assert.equal(s.autoRemovalTiming, 0);
    assert.equal(s.restriction, 0); assert.deepEqual(s.traits, []);
});
test("葦笛がground専用handlerへdispatch、1体成功で消費/12秒Cooldown/即時ドロー", () => {
    const g = loadGame(), e = g.addEnemy(); g.start();
    const result = g.fire();
    assert.equal(result.ok, true); assert.equal(result.cardId, CARD); assert.equal(result.targetType, "ground");
    assert.equal(g.sleeping(e), true); assert.equal(g.hasState(e.eventId(), STATE), true);
    assert.equal(g.ProjectRHermesReedFluteSleep.canEnemyAct(e.eventId()), false);
    const state = g.ProjectRCardDeck.getBattleState();
    assert.equal(state.hand.length, 5);
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === result.instanceId).remainingSeconds, 12);
    assert.equal(g.commands.filter(c => c.name === "AddState").length, 1);
});
test("Hermes指輪未所持では使用不可・効果なし・非消費", () => {
    const g = loadGame(), e = g.addEnemy(); g.start(); g.arrange(0, CARD);
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "unowned";
    const before = plain(g.ProjectRCardDeck.getBattleState());
    assert.equal(g.ProjectRCardDeck.requestUseCard(0).reason, "cardUnavailable");
    assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before); assert.equal(g.sleeping(e), false);
});
test("円形4tile以内の複数敵/境界に適用、斜め範囲外/非enemy/死亡/消去は除外", () => {
    const g = loadGame();
    const inside = [g.addEnemy(0, 0), g.addEnemy(4, 0), g.addEnemy(2, 3), g.addEnemy(-4, 0)];
    const outside = [g.addEnemy(4, 4), g.addEnemy(4.01, 0), g.addEnemy(1, 0, "<object>")];
    const dead = g.addEnemy(); dead.hpStorageId = 1; g.$gameVariables._data[1] = 0; outside.push(dead);
    const erased = g.addEnemy(); erased._erased = true; outside.push(erased);
    g.start(); assert.equal(g.fire().ok, true);
    inside.forEach(e => assert.equal(g.sleeping(e), true));
    outside.forEach(e => assert.equal(g.sleeping(e), false));
});
test("対象0体/全員耐性/有効度0/付与失敗ならactivationFailed・全札非消費", () => {
    for (const fail of [g => {}, g => { const e=g.addEnemy(); e.databaseEnemy.traits.push({code:14,dataId:STATE,value:1}); },
        g => { const e=g.addEnemy(); e.databaseEnemy.traits.push({code:13,dataId:STATE,value:0}); },
        g => { g.addEnemy(); g.PluginManager._commands['Hendrix_Action_Engine:AddState'] = () => {}; }]) {
        const g = loadGame(); fail(g); g.start(); g.arrange(0, CARD);
        const before = plain(g.ProjectRCardDeck.getBattleState());
        assert.equal(g.ProjectRCardDeck.requestUseCard(0).reason, "activationFailed");
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
    }
});
test("一部耐性/失敗でも1体成功なら消費、Database耐性を公式処理で尊重", () => {
    const g = loadGame(), immune = g.addEnemy(), normal = g.addEnemy();
    immune.databaseEnemy.traits.push({ code:14, dataId:STATE, value:1 });
    g.start(); assert.equal(g.fire().ok, true); assert.equal(g.sleeping(immune), false); assert.equal(g.sleeping(normal), true);
});
test("4秒で公式RemoveState(呼出元敵ID)により解除、無効な時間は無視", () => {
    const g = loadGame(), e = g.addEnemy(); g.start(); g.fire();
    for (const seconds of [NaN, Infinity, -1, 0]) g.ProjectRCardDeck.updateCooldown(seconds);
    g.ProjectRCardDeck.updateCooldown(3.99); assert.equal(g.sleeping(e), true);
    g.ProjectRCardDeck.updateCooldown(.01); assert.equal(g.sleeping(e), false);
    assert.equal(g.ProjectRHermesReedFluteSleep.canEnemyAct(e.eventId()), true);
    assert.equal(g.commands.at(-1).name, "RemoveState"); assert.equal(g.commands.at(-1).eventId, e.eventId());
});
test("再使用で残り4秒へ更新、State重複なし", () => {
    const g = loadGame(), e = g.addEnemy(); g.start(); g.fire(); g.ProjectRCardDeck.updateCooldown(3);
    assert.equal(g.fire().ok, true); assert.equal(e.battler._states.filter(id => id === STATE).length, 1);
    g.ProjectRCardDeck.updateCooldown(1.1); assert.equal(g.sleeping(e), true);
    g.ProjectRCardDeck.updateCooldown(2.9); assert.equal(g.sleeping(e), false);
});
test("DamageでSleep解除せずHP回復なし（MZ実onDamage/State処理）", () => {
    const g = loadGame(), e = g.addEnemy(); g.start(); g.fire();
    e.battler.gainHp(-20); e.battler.onDamage(20);
    assert.equal(g.sleeping(e), true); assert.equal(e.battler.hp, 180);
});
test("battle終了/マップsetup/同ID差替え時は元敵のSleepを解除", () => {
    for (const cleanup of [g => g.ProjectRCardDeck.endCardBattle(), g => g.$gameMap.setup(),
        g => { g.$gameMap._events[1] = null; g.ProjectRCardDeck.updateCooldown(.1); }]) {
        const g = loadGame(), e = g.addEnemy(); g.start(); g.fire(); cleanup(g);
        assert.equal(e.battler.isStateAffected(STATE), false); assert.equal(g.sleeping(e), false);
    }
});
test("カードキー1～5だけで即時発動、長押し重複/Hotbar発火なし", () => {
    for (let key = 1; key <= 5; key++) {
        const g = loadGame(), e = g.addEnemy(); g.start(); g.arrange(key - 1, CARD); g.tap(key);
        assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, true); assert.equal(g.sleeping(e), true);
        assert.deepEqual(plain(g.legacyUses), []);
    }
});
test("メニュー/会話/フォーカス喪失中は停止、240フレームで解除", () => {
    const g = loadGame(), e = g.addEnemy(); g.start(); g.arrange(0, CARD); g.tap(1);
    g.emitWindow("blur"); for(let i=0;i<250;i++)g.tick(); assert.equal(g.sleeping(e), true); g.emitWindow("focus");
    g.$gameMessage.isBusy=()=>true; for(let i=0;i<250;i++)g.tick(); assert.equal(g.sleeping(e), true); g.$gameMessage.isBusy=()=>false;
    g.HallInputBlocked=true; for(let i=0;i<250;i++)g.tick(); assert.equal(g.sleeping(e), true); g.HallInputBlocked=false;
    const scene=g.SceneManager._scene; g.SceneManager._scene={}; for(let i=0;i<250;i++)g.tick();
    assert.equal(g.sleeping(e), true); g.SceneManager._scene=scene;
    for(let i=0;i<239;i++)g.tick(); assert.equal(g.sleeping(e), true); g.tick(); assert.equal(g.sleeping(e), false);
});
test("設定から半径/持続変更、敵の既存検知情報を壊さない", () => {
    const g = loadGame({range:"2",duration:"1.5"}), e=g.addEnemy(2), far=g.addEnemy(3);
    const target={}; const last={range:9,eyes:90}; e._detectedEvent=target; e._lastCheckRange=last;
    g.start(); g.fire(); assert.equal(g.sleeping(e), true); assert.equal(g.sleeping(far), false);
    assert.equal(e._detectedEvent,target); assert.equal(e._lastCheckRange,last); assert.deepEqual(last,{range:9,eyes:90});
    g.ProjectRCardDeck.updateCooldown(1.5); assert.equal(g.sleeping(e), false);
});
test("公式付与後例外/検索失敗/依存API欠落は新規効果を残さず非消費", () => {
    for (const fail of [g => {
        const add=g.PluginManager._commands['Hendrix_Action_Engine:AddState'];
        g.PluginManager._commands['Hendrix_Action_Engine:AddState']=function(args){add.call(this,args);throw Error('after');};
    }, g => {g.checkRange=()=>{throw Error('range');};}, g=>{g.findTargets=undefined;},
        g=>{delete g.PluginManager._commands['Hendrix_Action_Engine:RemoveState'];}]) {
        const g=loadGame(), e=g.addEnemy(); g.start(); g.arrange(0,CARD); fail(g);
        const before=plain(g.ProjectRCardDeck.getBattleState());
        assert.equal(g.ProjectRCardDeck.requestUseCard(0).reason,'activationFailed', String(fail));
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()),before); assert.equal(e.battler.isStateAffected(STATE),false);
    }
});
test("Save形式/他State/実体を維持しSleepと時間は保存せず、ロードで残留なし", () => {
    const g=loadGame(), e=g.addEnemy(); e.battler.addState(15);
    const before=g.DataManager.makeSaveContents(); const persistent=plain(g.ProjectRCardDeck.getPersistentData());
    g.start(); g.fire(); const saved=g.DataManager.makeSaveContents();
    assert.equal(g.sleeping(e),true); assert.equal(saved.map._events[1]._battler.isStateAffected(STATE),false);
    assert.equal(saved.map._events[1]._battler.isStateAffected(15),true);
    assert.equal(STATE in saved.map._events[1]._battler._stateTurns,false);
    assert.deepEqual(Object.keys(saved).sort(),Object.keys(before).sort());
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()),persistent);
    assert.ok(!/remaining|cooldownPile|activation/.test(JSON.stringify(saved)));
    g.DataManager.extractSaveContents(saved);
    assert.equal(g.ProjectRCardDeck.isCardBattleActive(),false); assert.equal(g.sleeping(e),false);
});
test("Recognition ObscureのState31/5秒/終了/APIは併用時も維持", () => {
    const g=loadGame(), e=g.addEnemy(); g.start(); g.arrange(); g.ProjectRCardDeck.requestUseCard(0); g.fire();
    assert.equal(g.obscured(),true); g.ProjectRCardDeck.updateCooldown(4); assert.equal(g.sleeping(e),false); assert.equal(g.obscured(),true);
    g.ProjectRCardDeck.updateCooldown(.99); assert.equal(g.obscured(),true);
    g.ProjectRCardDeck.updateCooldown(.01); assert.equal(g.obscured(),false);
    g.ProjectRCardDeck.endCardBattle(); assert.equal(g.obscured(),false);
});
test("Golden Arrowは睡眠plugin併用時もdirection発射/1Hit/4秒Cooldown/即時ドロー維持", () => {
    const f={require,__dirname,console}, s=read('tests/ProjectR_ApolloGoldenArrow.test.cjs');
    vm.runInNewContext(s.slice(0,s.indexOf('let passed = 0;'))+'\nthis.create=loadGame;',f);
    const g=f.create(); g.$dataStates=JSON.parse(read('data/States.json'));
    vm.runInContext(read(`js/plugins/${PLUGIN}.js`),g);
    const e=g.addEnemy();g.startWith('apollo_golden_arrow');const r=g.fire();
    assert.equal(r.ok,true);assert.equal(r.state.hand.length,5);
    assert.equal(r.state.cooldownPile.find(c=>c.instance.instanceId===r.instanceId).remainingSeconds,4);
    g.collideWith(e);assert.equal(e.bar.currentHp,120);assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length,0);
});
test("公式tag索引の複数敵を適用し、1体の付与後例外でも他の成功を消費へ反映", () => {
    const g=loadGame(), failed=g.addEnemy(), good=g.addEnemy();
    g.$gameMap.tagToEvents=new Map([["<enemy>",[failed,good]]]);
    const add=g.PluginManager._commands['Hendrix_Action_Engine:AddState'];
    g.PluginManager._commands['Hendrix_Action_Engine:AddState']=function(args) {
        add.call(this,args); if(this._eventId===failed.eventId()) throw Error('one failure');
    };
    g.start(); assert.equal(g.fire().ok,true); assert.equal(g.sleeping(failed),false); assert.equal(g.sleeping(good),true);
});
test("再付与失敗は既存Sleepと残り時間を維持", () => {
    const g=loadGame(), e=g.addEnemy();g.start();g.fire();g.ProjectRCardDeck.updateCooldown(3);
    const add=g.PluginManager._commands['Hendrix_Action_Engine:AddState'];
    g.PluginManager._commands['Hendrix_Action_Engine:AddState']=function(args){add.call(this,args);throw Error('refresh failure');};
    assert.equal(g.fire().reason,'activationFailed');assert.equal(g.sleeping(e),true);
    g.ProjectRCardDeck.updateCooldown(1);assert.equal(g.sleeping(e),false);
});
test("リンク先Actor/databaseActorのSleepもSaveコピーで除外し実体は維持", () => {
    for(const linked of [true,false]) {
        const g=loadGame(), e=g.addEnemy();delete e.databaseEnemy;delete e._battler;
        if(linked)e.linkedActorId=1;else e.databaseActor=g.actor;
        g.start();assert.equal(g.fire().ok,true);
        const saved=g.DataManager.makeSaveContents();assert.equal(g.sleeping(e),true);
        assert.equal(saved.actors._data[1].isStateAffected(STATE),false);
        if(!linked)assert.equal(saved.map._events[1].databaseActor.isStateAffected(STATE),false);
        g.ProjectRCardDeck.endCardBattle();assert.equal(g.actor.isStateAffected(STATE),false);
    }
});
test("Saveコピーは敵検知/親子/Actorリンクの共有参照を維持し、参照先にもSleepを残さない", () => {
    const g=loadGame(), e=g.addEnemy(), other=g.addEnemy();
    other._detectedEvent=e;other._parentEvent=e;e.databaseActor=g.actor;
    g.start();g.fire();const saved=g.DataManager.makeSaveContents();
    const first=saved.map._events[1],second=saved.map._events[2];
    assert.equal(second._detectedEvent,first);assert.equal(second._parentEvent,first);
    assert.equal(first.databaseActor,saved.actors._data[1]);
    assert.equal(second._detectedEvent._battler.isStateAffected(STATE),false);
    assert.equal(g.sleeping(e),true);
});
test("実機手順書の全Consoleコードを本番7定義で実行し復元できる", () => {
    const g=loadGame({production:true});g.addEnemy();const e=g.addEnemy();
    const before=plain(g.ProjectRCardDeck.getPersistentData());
    const blocks=[...read('docs/ProjectR_CardDeck_Phase2C2.md').matchAll(/```js\r?\n([\s\S]*?)```/g)].map(m=>m[1]);
    assert.equal(blocks.length,3);vm.runInContext(blocks[0],g);
    g.tap(g.sleepSlot2c2+1);assert.equal(g.sleeping(e),true);
    g.ProjectRCardDeck.updateCooldown(12);vm.runInContext(blocks[1],g);assert.equal(g.sleeping(e),true);
    g.tap(g.sleepSlot2c2+1);assert.equal(g.ProjectRCardBattleInput.getLastResult().ok,true);
    vm.runInContext(blocks[2],g);assert.equal(g.sleeping(e),false);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()),before);
    assert.equal(g.ProjectRCardDeck.definitions.cardDefinitions().length,7);
});
console.log(`# ${passed} Phase 2C-2 tests passed`);
