"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "apollo_plague_attack", PLUGIN = "ProjectR_ApolloDiseaseAttack", STATE = 33, SKILL = 238, DOT = 239;
const TAG = "<projectRDiseaseAttack>";
const source = read("tests/ProjectR_ApolloGoldenArrow.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(source.slice(0, source.indexOf("let passed = 0;")) + "\nthis.createGame = loadGame;", fixture);
const engine = read("js/plugins/Hendrix_Action_Engine.js");
const objects = read("js/rmmz_objects.js");
const mapData = JSON.parse(read("data/Map002.json"));
const template = mapData.events.find(e => e?.note.includes(TAG));
function method(marker, ending = "\n};") {
    const start = engine.indexOf(marker), end = engine.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, marker);
    return engine.slice(start, end + ending.length);
}
function loadGame({ parameters = {}, withPlugin = true } = {}) {
    const g = fixture.createGame();
    const run = code => vm.runInContext(code, g);
    g.$dataStates = JSON.parse(read("data/States.json"));
    g.commonEventNameCache = {}; g.stateNameCache = {};
    run("Number.prototype.clamp = function(min, max) { return Math.min(Math.max(this, min), max); };" +
        "Array.prototype.contains = Array.prototype.includes;");
    const core = read("js/rmmz_core.js");
    run(core.slice(core.indexOf("Array.prototype.remove ="), core.indexOf("\n};", core.indexOf("Array.prototype.remove =")) + 3));
    run(objects.slice(objects.indexOf("function Game_ActionResult()"), objects.indexOf("function Game_Actor()")));
    run(objects.slice(objects.indexOf("function Game_Enemy()"), objects.indexOf("function Game_Actors()")));
    for (const marker of ["window.findTarget =", "window.hasState ="]) run(method(marker));
    for (const marker of ["function SgetBattlerForH(", "function ScheckStateResistanceH(",
        "function findEventByLinkedActorId_StateCEH("]) run(method(marker, "\n}"));
    run(engine.slice(engine.indexOf("const S_Game_Battler_addState_StateCEH"), engine.indexOf("window.hasState =")));
    for (const name of ["AddState", "RemoveState"]) {
        run(method(`PluginManager.registerCommand(HpluginName, "${name}",`, "\n});"));
    }
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === PLUGIN ? parameters : params(name);
    g.saveBeforeDisease = [g.DataManager.makeSaveContents, g.DataManager.extractSaveContents];
    if (withPlugin) run(read(`js/plugins/${PLUGIN}.js`));
    const deck = g.ProjectRCardDeck;
    g.arrange = (cardId = CARD) => {
        for (let i = 0; i < 40; i++) {
            const hand = deck.getBattleState().hand;
            if (hand[0].cardId === cardId) return hand[0];
            assert.equal(deck.useBattleCard(hand[0].instanceId).ok, true);
        }
        throw Error(`card unavailable ${cardId}`);
    };
    g.begin = () => { assert.equal(deck.startCardBattle().ok, true); return g.arrange(); };
    g.enemy = (id = 1, x = 20, y = 20, immune) => {
        const e = g.addEnemy(id, x, y);
        if (immune) {
            const db = { ...plain(g.$dataEnemies[1]), id: g.$dataEnemies.length };
            db.traits.push(immune);
            g.$dataEnemies.push(db);
            e.event.databaseEnemy = { id: db.id };
        } else {
            e.event.databaseEnemy = { id: 1 };
        }
        e.battler = g.SgetBattlerForH(e.event);
        return e;
    };
    g.tick = (frames = 1) => { for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; g.$gameMap.update(true); } };
    g.time = seconds => deck.updateCooldown(seconds);
    g.hit = enemy => {
        const arrow = g.$gameMap.event(g.ProjectRApolloDiseaseAttack.getActiveProjectiles()[0]?.eventId);
        enemy.event.locate(arrow._realX, arrow._realY + 0.5);
        g.tick();
    };
    g.diseased = e => g.ProjectRApolloDiseaseAttack.isEventDiseased(e.event.eventId());
    g.dotCommands = () => g.commands.filter(c => c.name === "UpdateEventHp" && /^-\d+$/.test(c.args.value));
    return g;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const INITIAL = 50 - 20, TICK = 25 - 10; // atk 50 / def 20（Database式）

test("Database ID/式/Prefab/登録: Skill238・DoT239・State33、既存State31/32とGolden Arrowは不変", () => {
    const skills = JSON.parse(read("data/Skills.json")), states = JSON.parse(read("data/States.json"));
    assert.equal(skills[SKILL].name, "アポロン病攻撃"); assert.equal(skills[SKILL].note, "<ProjectRCard: apollo_plague_attack>");
    assert.equal(skills[DOT].name, "病ダメージ"); assert.equal(skills[DOT].note, "<ProjectRCard: apollo_plague_attack_dot>");
    for (const id of [SKILL, DOT]) assert.equal(skills[id].damage.type, 1);
    assert.equal(skills[236].name, "黄金の弓矢"); assert.equal(skills[237].name, "ヘルメース剣術");
    const state = states[STATE];
    assert.equal(state.name, "病"); assert.equal(state.note, "<ProjectRCard: apollo_plague_attack>");
    assert.deepEqual(state.traits, []); assert.equal(state.removeByDamage, false);
    assert.equal(state.autoRemovalTiming, 0); assert.equal(state.restriction, 0);
    assert.equal(states[31].name, "認識阻害"); assert.equal(states[32].name, "睡眠");
    assert.equal(states.length, 34); assert.equal(skills.length, 240);
    assert.equal(template.id, 4); assert.ok(template.note.includes("<dmg: アポロン病攻撃>"));
    assert.ok(template.note.includes("<attacker: player>")); assert.equal(template.note.includes("<weaponAttack>"), false);
    assert.equal(mapData.events[3].note.includes("<projectRGoldenArrow>"), true);
    const config = {}; vm.runInNewContext(read("js/plugins.js"), config);
    const ps = config.$plugins, p = ps.filter(x => x.name === PLUGIN);
    assert.equal(p.length, 1); assert.equal(p[0].status, true);
    assert.deepEqual(plain(p[0].parameters), { DurationSeconds: "6.0", TickIntervalSeconds: "1.0", MaxTicks: "6" });
    assert.ok(ps.indexOf(p[0]) > ps.findIndex(x => x.name === "ProjectR_HermesSwordsmanship"));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${PLUGIN}.js`)));
});
test("direction handlerへdispatch: 弾を1つだけ公式spawnEventし、Golden Arrow Prefabは使わない", () => {
    const g = loadGame(); g.begin();
    const result = g.ProjectRCardDeck.requestUseCard(0);
    assert.equal(result.ok, true); assert.equal(result.cardId, CARD); assert.equal(result.targetType, "direction");
    assert.equal(g.spawns.length, 1); assert.equal(g.spawns[0][0], template.id); assert.equal(g.spawns[0][3], false);
    assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 1);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
});
test("Apollo指輪必須・戦闘非稼働は拒否し、弾を作らない", () => {
    const g = loadGame(), deck = g.ProjectRCardDeck;
    assert.equal(deck.requestUseCard(0).reason, "battleInactive");
    g.begin(); g.$gameSystem._projectRCardDeckData.ringOwnershipState.apollo = "unowned";
    const before = plain(deck.getBattleState());
    assert.equal(deck.requestUseCard(0).reason, "cardUnavailable");
    assert.equal(g.spawns.length, 0); assert.deepEqual(plain(deck.getBattleState()), before);
    deck.setRingUnowned("apollo"); assert.equal(deck.startCardBattle().ok, false);
});
test("生成成功で消費・12秒Cooldown・即時ドロー、永続データ不変", () => {
    const g = loadGame(), deck = g.ProjectRCardDeck, card = g.begin();
    const before = plain(deck.getBattleState()), persistent = plain(deck.getPersistentData());
    const result = deck.requestUseCard(0);
    assert.equal(result.instanceId, card.instanceId);
    const state = plain(deck.getBattleState());
    assert.equal(state.hand.length, 5); assert.equal(state.drawPile.length, before.drawPile.length - 1);
    assert.equal(state.cooldownPile.find(c => c.instance.instanceId === card.instanceId).remainingSeconds, 12);
    assert.deepEqual(plain(deck.getPersistentData()), persistent);
});
test("生成/回転失敗・必須データ欠落はactivationFailedで非消費、残った弾もなし", () => {
    for (const fail of [g => { g.$gameMap.spawnEvent = () => null; },
        g => { g.$gameMap.spawnEvent = () => { throw Error("spawn failed"); }; },
        g => { g.Game_Character.prototype.rotateTo = () => { throw Error("rotation failed"); }; },
        g => { const spawn = g.$gameMap.spawnEvent; g.$gameMap.spawnEvent = function() { spawn.apply(this, arguments); throw Error("post"); }; },
        g => { g.$dataTemplateMap = null; }, g => { g.$dataStates = []; },
        g => { g.$dataSkills[DOT].note = ""; }, g => { g.$dataSkills[SKILL].damage.type = 0; },
        g => { delete g.PluginManager._commands["Hendrix_Action_Engine:AddState"]; }]) {
        const g = loadGame(), deck = g.ProjectRCardDeck; g.begin();
        const before = plain(deck.getBattleState()); fail(g);
        assert.equal(deck.requestUseCard(0).reason, "activationFailed");
        assert.deepEqual(plain(deck.getBattleState()), before);
        assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 0);
        assert.equal(g.$gameMap.events().filter(e => e.event()?.note.includes(TAG)).length, 0);
    }
});
test("8方向/小数角のマウス角をspawn時に360度で固定し、発射後は追尾しない", () => {
    for (const [dx, dy, expected] of [[0,-100,0],[100,-100,45],[100,0,90],[100,100,135],
        [0,100,180],[-100,100,225],[-100,0,270],[-100,-100,315],[100,-53,62.076410285]]) {
        const g = loadGame(); g.begin();
        g.TouchInput.x = 504 + dx; g.TouchInput.y = 528 + dy;
        assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true);
        const event = g.$gameMap.event(g.ProjectRApolloDiseaseAttack.getActiveProjectiles()[0].eventId);
        const degree = event._rotation;
        assert.ok(Math.abs(degree - expected) < 0.00001, `${degree} vs ${expected}`);
        g.TouchInput.x = 1000; g.TouchInput.y = 0;
        const route = template.pages[0].moveRoute.list[0];
        event.processMoveCommand(route); event.processMoveCommand(route);
        assert.deepEqual(plain(g.movements), [[event.eventId(), degree], [event.eventId(), degree]]);
        assert.equal(event._rotation, degree);
    }
});
test("命中前はDamage/State/DoT要求なし。命中で初撃(Database式)→Disease→弾破棄", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0);
    g.tick(); g.time(3);
    assert.equal(e.bar.currentHp, 200); assert.equal(g.diseased(e), false);
    assert.equal(g.commands.filter(c => ["UpdateEventHp", "AddState"].includes(c.name)).length, 0);
    g.hit(e);
    assert.equal(e.bar.currentHp, 200 - INITIAL);
    const damage = g.commands.find(c => c.name === "UpdateEventHp");
    assert.equal(damage.args.value, "-damage"); assert.equal(damage.args.eventId, "1");
    assert.equal(g.diseased(e), true); assert.equal(g.hasState(1, STATE), true);
    assert.equal(g.ProjectRApolloDiseaseAttack.getRemainingSeconds(1), 6);
    assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 0);
    assert.equal(g.$gameMap.events().filter(x => x.event()?.note.includes(TAG)).length, 0);
    assert.equal(g.commands.at(-1).name, "DestroyEvent");
});
test("Database式変更は初撃・DoT双方へ反映（独自HP計算なし）", () => {
    const g = loadGame(), e = g.enemy(); g.begin();
    g.$dataSkills[SKILL].damage.formula = "a.atk * 2 - b.def";
    g.$dataSkills[DOT].damage.formula = "a.atk - b.def";
    g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    assert.equal(e.bar.currentHp, 200 - 80); g.time(1);
    assert.equal(e.bar.currentHp, 200 - 80 - 30);
    assert.equal(g.dotCommands()[0].args.value, "-30");
});
test("1発1Hit: 重なる2体でも先頭1体だけ、以降の更新で再Damageなし", () => {
    const g = loadGame(), first = g.enemy(1), second = g.enemy(2); g.begin(); g.ProjectRCardDeck.requestUseCard(0);
    const arrow = g.$gameMap.event(g.ProjectRApolloDiseaseAttack.getActiveProjectiles()[0].eventId);
    first.event.locate(arrow._realX, arrow._realY + 0.5); second.event.locate(arrow._realX, arrow._realY + 0.5);
    g.tick(3);
    assert.equal(first.bar.currentHp, 200 - INITIAL); assert.equal(second.bar.currentHp, 200);
    assert.equal(g.diseased(first), true); assert.equal(g.diseased(second), false);
    assert.equal(g.commands.filter(c => c.name === "UpdateEventHp").length, 1);
});
test("空振りでもカードは消費済み。Golden Arrowの弾や通常Bullet/Gunには干渉しない", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.tick(5);
    assert.equal(g.ProjectRCardDeck.getBattleState().cooldownPile.length, 1);
    const bullet = g.$gameMap.spawnEvent(1, 20, 20, false, 90); g.tick();
    assert.equal(e.bar.currentHp, 200); assert.ok(g.$gameMap.event(bullet));
});
test("State耐性: 無効化/有効度0でも初撃は有効・カード成功、Disease/DoTなし", () => {
    for (const trait of [{ code: 14, dataId: STATE, value: 1 }, { code: 13, dataId: STATE, value: 0 }]) {
        const g = loadGame(), e = g.enemy(1, 20, 20, trait); g.begin();
        assert.equal(g.ProjectRCardDeck.requestUseCard(0).ok, true); g.hit(e);
        assert.equal(e.bar.currentHp, 200 - INITIAL); assert.equal(g.diseased(e), false);
        assert.equal(e.battler.isStateAffected(STATE), false);
        for (let i = 0; i < 8; i++) g.time(1);
        assert.equal(e.bar.currentHp, 200 - INITIAL); assert.equal(g.dotCommands().length, 0);
    }
});
test("DoTは1秒ごと・最大6回、公式calculateDamageAgainstEvent→UpdateEventHp、6秒で終了", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    const base = 200 - INITIAL;
    for (const seconds of [NaN, Infinity, -1, 0]) g.time(seconds);
    g.time(0.99); assert.equal(e.bar.currentHp, base);
    g.time(0.01); assert.equal(e.bar.currentHp, base - TICK);
    for (let n = 2; n <= 6; n++) {
        g.time(0.99); assert.equal(e.bar.currentHp, base - TICK * (n - 1));
        g.time(0.01); assert.equal(e.bar.currentHp, base - TICK * n);
    }
    assert.equal(g.dotCommands().length, 6); assert.equal(g.diseased(e), false);
    assert.equal(e.battler.isStateAffected(STATE), false);
    for (let i = 0; i < 5; i++) g.time(1);
    assert.equal(e.bar.currentHp, base - TICK * 6); assert.equal(g.dotCommands().length, 6);
    assert.equal(g.commands.at(-1).name, "RemoveState");
    assert.ok(g.dotCommands().every(c => c.args.value === `-${TICK}`));
});
test("実フレーム(1/60秒)でも6秒・6回ちょうど。大きな時間差でも上限を超えない", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    for (let f = 0; f < 359; f++) g.time(1 / 60);
    assert.equal(g.dotCommands().length, 5); assert.equal(g.diseased(e), true);
    g.time(1 / 60);
    assert.equal(g.dotCommands().length, 6); assert.equal(g.diseased(e), false);
    const h = loadGame(), f = h.enemy(); h.begin(); h.ProjectRCardDeck.requestUseCard(0); h.hit(f); h.time(60);
    assert.equal(h.dotCommands().length, 6); assert.equal(f.bar.currentHp, 200 - INITIAL - TICK * 6);
});
test("再命中はstackせず残り6秒・tickを初期化。Damageで解除されない", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    g.time(2.5); assert.equal(g.dotCommands().length, 2);
    g.arrange(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    assert.equal(e.battler._states.filter(id => id === STATE).length, 1);
    assert.equal(g.ProjectRApolloDiseaseAttack.getRemainingSeconds(1), 6);
    const hp = e.bar.currentHp;
    g.time(0.99); assert.equal(g.dotCommands().length, 2); assert.equal(e.bar.currentHp, hp);
    g.time(0.01); assert.equal(g.dotCommands().length, 3);
    e.battler.gainHp(-20); e.battler.onDamage(20);
    assert.equal(g.diseased(e), true);
    g.time(5); assert.equal(g.dotCommands().length, 8); assert.equal(g.diseased(e), false);
});
test("DoT/Disease中に敵が死亡・消去・差替えされたら安全に停止", () => {
    for (const cleanup of [g => { g.$gameMap.event(1)._erased = true; }, g => { g.$gameMap._events[1] = null; },
        g => { g.bar.currentHp = TICK; }]) {
        const g = loadGame(), e = g.enemy(); g.bar = e.bar; g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
        cleanup(g); g.time(1); g.time(1);
        assert.equal(g.ProjectRApolloDiseaseAttack.isEventDiseased(1), false);
        assert.equal(e.battler.isStateAffected(STATE), false);
        g.time(10); assert.ok(g.dotCommands().length <= 1);
    }
});
test("初撃で倒した敵にはDiseaseを付けない", () => {
    const g = loadGame(), e = g.enemy(); e.bar.currentHp = INITIAL; g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    assert.equal(g.diseased(e), false); assert.equal(g.commands.filter(c => c.name === "AddState").length, 0);
});
test("endCardBattleでDisease・タイマー・飛翔中の弾を破棄し、以後DoTなし", () => {
    const g = loadGame(), e = g.enemy(), d = g.ProjectRCardDeck; g.begin(); d.requestUseCard(0); g.hit(e);
    g.arrange(); d.requestUseCard(0); g.time(1.5);
    d.endCardBattle();
    assert.equal(g.diseased(e), false); assert.equal(e.battler.isStateAffected(STATE), false);
    assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 0);
    const hp = e.bar.currentHp; d.updateCooldown(10);
    assert.equal(e.bar.currentHp, hp);
    g.begin(); assert.equal(g.diseased(e), false);
});
test("マップsetup・同ID差替えでも元Battlerの病を解除、ロード残存弾も除去", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    g.$gameMap.setup(2);
    assert.equal(e.battler.isStateAffected(STATE), false); assert.equal(g.diseased(e), false);
    const orphan = g.$gameMap.spawnEvent(template.id, 10, 10, false, 90);
    const bullet = g.$gameMap.spawnEvent(1, 10, 10, false, 90);
    g.SceneManager._scene.onMapLoaded();
    assert.equal(g.$gameMap.event(orphan), null); assert.ok(g.$gameMap.event(bullet));
});
test("Scene更新(1/60)で進み、メッセージ/イベント実行中・戦闘非稼働では進まない", () => {
    const g = loadGame(), e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e);
    const scene = g.SceneManager._scene;
    for (let i = 0; i < 60; i++) scene.update();
    assert.equal(g.dotCommands().length, 1);
    g.$gameMessage.isBusy = () => true; for (let i = 0; i < 300; i++) scene.update();
    g.$gameMessage.isBusy = () => false; g.$gameMap.isEventRunning = () => true; for (let i = 0; i < 300; i++) scene.update();
    g.$gameMap.isEventRunning = () => false;
    assert.equal(g.dotCommands().length, 1); assert.ok(g.ProjectRApolloDiseaseAttack.getRemainingSeconds(1) > 4.9);
    for (let i = 0; i < 60; i++) scene.update();
    assert.equal(g.dotCommands().length, 2);
});
test("Parameterで持続・間隔・回数を変更でき、不正値は既定へ戻る", () => {
    const g = loadGame({ parameters: { DurationSeconds: "3", TickIntervalSeconds: "0.5", MaxTicks: "4" } });
    const e = g.enemy(); g.begin(); g.ProjectRCardDeck.requestUseCard(0); g.hit(e); g.time(3);
    assert.equal(g.dotCommands().length, 4);
    const h = loadGame({ parameters: { DurationSeconds: "-1", TickIntervalSeconds: "x", MaxTicks: "0" } });
    const f = h.enemy(); h.begin(); h.ProjectRCardDeck.requestUseCard(0); h.hit(f); h.time(6);
    assert.equal(h.dotCommands().length, 6);
});
test("セーブ: 関数連鎖/永続形式は不変、Disease Stateと実行時タイマーは保存されずロードで除去", () => {
    const g = loadGame(), e = g.enemy(), deck = g.ProjectRCardDeck;
    const persistent = plain(deck.getPersistentData());
    g.begin(); deck.requestUseCard(0); g.hit(e);
    assert.deepEqual(plain(deck.getPersistentData()), persistent);
    assert.equal(e.battler.isStateAffected(STATE), true);
    const contents = g.DataManager.makeSaveContents();
    const savedEvent = contents.map._events[1];
    assert.equal(savedEvent._battler.isStateAffected(STATE), false);
    assert.equal(JSON.stringify(contents).includes("tickTimer"), false);
    assert.equal(e.battler.isStateAffected(STATE), true); // 実行中の戦闘は壊さない
    g.$gameMap = contents.map; g.$gameMap._events[1] = e.event;
    g.DataManager.extractSaveContents(contents);
    assert.equal(e.battler.isStateAffected(STATE), false); assert.equal(g.diseased(e), false);
    assert.equal(deck.getBattleState(), null);
    const plainGame = loadGame({ withPlugin: false });
    assert.equal(plain(Object.keys(g.DataManager)).join(), plain(Object.keys(plainGame.DataManager)).join());
});
test("回帰: Golden Arrowは従来どおり専用Prefab/12→4秒Cooldown、他directionは前のhandlerへ連鎖", () => {
    const g = loadGame(); g.begin(); g.arrange("apollo_golden_arrow");
    const result = g.ProjectRCardDeck.requestUseCard(0);
    assert.equal(result.ok, true); assert.equal(g.spawns[0][0], 3);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 0);
    assert.equal(g.ProjectRCardDeck.getBattleState().cooldownPile.at(-1).remainingSeconds, 4);
    const calls = [], h = fixture.createGame(); // 前handlerを差し込んだ上でプラグインを読み込む
    h.ProjectRCardDeck.registerActivationHandler("direction", ctx => { calls.push(ctx.definition.cardId); return { ok: true }; });
    vm.runInContext(read("js/plugins/ProjectR_ApolloDiseaseAttack.js"), Object.assign(h, {
        $dataStates: JSON.parse(read("data/States.json"))
    }));
    h.ProjectRCardDeck.getActivationHandler("direction")({ definition: { cardId: "hermes_sword_attack" } });
    assert.deepEqual(plain(calls), ["hermes_sword_attack"]);
});

console.log(`# ${passed} Phase 2C-5 tests passed`);
