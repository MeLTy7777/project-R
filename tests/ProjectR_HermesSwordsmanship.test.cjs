"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const cp = require("node:child_process");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const CARD = "hermes_sword_attack", PLUGIN = "ProjectR_HermesSwordsmanship";
const source = read("tests/ProjectR_ApolloGoldenArrow.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(source.slice(0, source.indexOf("let passed = 0;")) + "\nthis.createGame = loadGame;", fixture);
const engine = read("js/plugins/Hendrix_Action_Engine.js");
function method(marker, ending = "\n};") {
    const start = engine.indexOf(marker), end = engine.indexOf(ending, start);
    assert.ok(start >= 0 && end > start, marker);
    return engine.slice(start, end + ending.length);
}
function loadGame(options = {}) {
    const g = fixture.createGame(options);
    const run = code => vm.runInContext(code, g);
    run(engine.slice(engine.indexOf("function Game_MaithlDynamicEvent()"),
        engine.indexOf('PluginManager.registerCommand(HpluginName, "DestroyDynamicEvent",')));
    run(method("function SspawnEventsShorcutH(", "\n}"));
    // Sprite/scrollはfixture。座標はMZのobject-character(screenY、shiftY=0)規約。
    run("Game_MaithlDynamicEvent.prototype.screenY = function() { return (this._realY + 1) * 48; };");
    g.$gamePlayer.centerPositionPoint = () => ({ x: g.$gamePlayer._realX + 0.5, y: g.$gamePlayer._realY + 0.5 });
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === PLUGIN ? (options.parameters || {}) : params(name);
    run(read(`js/plugins/${PLUGIN}.js`));
    g.swing = () => {
        const id = g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0]?.eventId;
        return g.$gameMap.event(id);
    };
    g.tick = (count = 1, active = true) => {
        for (let i = 0; i < count; i++) { g.Graphics.frameCount++; g.$gameMap.update(active); }
    };
    g.aim = degree => {
        const radians = (degree - 90) * Math.PI / 180;
        g.TouchInput.x = g.$gamePlayer.screenX() + Math.cos(radians) * 150;
        g.TouchInput.y = g.$gamePlayer.screenY() + Math.sin(radians) * 150;
    };
    g.hitEnemy = (id = 1) => {
        const swing = g.swing();
        // 回転によるrealY -0.5を含めた実座標のHitbox中心に配置。
        return g.addEnemy(id + 100, swing._realX, swing._realY + 0.5);
    };
    g.hpCommands = () => g.commands.filter(c => c.name === "UpdateEventHp");
    return g;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
test("登録順/名前/3秒CD/専用Skill237と仮式が対応", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const i = c.$plugins.findIndex(p => p.name === PLUGIN);
    assert.ok(i > c.$plugins.findIndex(p => p.name === "ProjectR_ApolloGoldenArrow"));
    assert.equal(c.$plugins.filter(p => p.name === PLUGIN && p.status).length, 1);
    const card = JSON.parse(c.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions)
        .map(JSON.parse).find(c => c.cardId === CARD);
    assert.equal(card.targetType, "direction"); assert.equal(Number(card.cooldownSeconds), 3);
    const skills = JSON.parse(read("data/Skills.json"));
    assert.equal(skills[237].name, "ヘルメース剣術");
    assert.equal(skills[237].damage.formula, "a.atk * 2 - b.def");
    assert.match(skills[237].description, /仮/);
    const previous = JSON.parse(cp.execFileSync("git", ["show", "c8fe551:data/Skills.json"], { encoding: "utf8" }));
    // Phase 4D-1でID235(当時は未使用の空きスロット)がHermes Ultimate専用Skillになった。他は当時から不変。
    assert.equal(previous[235].name, "");
    assert.deepEqual(skills.slice(0, 237).filter((_, i) => i !== 235), previous.filter((_, i) => i !== 235));
});
test("小さいhandler取得APIは既存directionを返し他はnull、登録契約不変", () => {
    const g = loadGame(), d = g.ProjectRCardDeck;
    assert.equal(typeof d.getActivationHandler("direction"), "function");
    assert.equal(d.getActivationHandler("unknown"), null);
    assert.equal(d.registerActivationHandler("unknown", () => ({})), false);
});
test("Hermesのみ専用handlerへdispatchしDynamicを1回生成、Prefab不使用", () => {
    const g = loadGame(); g.startWith(CARD); assert.equal(g.fire().reason, "success");
    assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 1);
    assert.equal(g.spawns.length, 0); assert.equal(g.swing().isDynamicEvent, true);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
});
test("1～5入力adapterから1回生成、長押し再発火なし", () => {
    const g = loadGame(); g.startWith(CARD);
    const e = { code: "Digit1", keyCode: 49, preventDefault() {} };
    g.Input._onKeyDown(e); g.Input.update(); g.SceneManager._scene.update();
    assert.equal(g.ProjectRCardBattleInput.getLastResult().reason, "success");
    g.Input._onKeyDown({ ...e, repeat: true }); g.Input.update(); g.SceneManager._scene.update();
    assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 1);
});
test("指輪未所持はRouterが拒否し手札/山札/CD不変", () => {
    const g = loadGame(); g.startWith(CARD);
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "unowned";
    const before = plain(g.ProjectRCardDeck.getBattleState());
    assert.equal(g.fire().reason, "cardUnavailable");
    assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before); assert.equal(g.swing(), undefined);
});
test("battle inactiveでは生成不可", () => {
    const g = loadGame(); assert.equal(g.fire().reason, "battleInactive"); assert.equal(g.commands.length, 0);
});
test("発動時のmouse角を小数360度で保持、8方向/中間角も正しい前方位置", () => {
    for (const degree of [0, 45, 90, 135, 180, 225, 270, 315, 23.75, 359.9]) {
        const g = loadGame(); g.startWith(CARD); g.aim(degree); assert.equal(g.fire().ok, true);
        const info = g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0];
        assert.ok(Math.abs(info.degree - degree) < 1e-8);
        assert.equal(info.rotation, info.degree === 0 ? 360 : info.degree);
        const rad = (degree - 90) * Math.PI / 180;
        assert.ok(Math.abs(info.x - (10 + Math.cos(rad) * 0.75)) < 1e-8);
        assert.ok(Math.abs(info.y + 0.5 - (10 + Math.sin(rad) * 0.75)) < 1e-8);
    }
});
test("発動後mouse/player移動やgamepadで角度/位置を追尾しない", () => {
    const g = loadGame(); g.startWith(CARD); g.aim(23.75); g.fire();
    const before = g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0];
    g.aim(250); g.$gamePlayer._realX += 5; g.navigator.getGamepads = () => [{ axes: [-1, 0] }];
    g.tick(); const after = g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0];
    assert.equal(after.degree, before.degree); assert.equal(after.x, before.x); assert.equal(after.y, before.y);
});
test("3回のmap更新で消滅しinactive/pause中は寿命を進めない", () => {
    const g = loadGame(); g.startWith(CARD); g.fire(); const event = g.swing();
    g.tick(2, false); assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0].framesLeft, 3);
    g.$gameMap.eventsPaused = true; g.tick(3); g.$gameMap.eventsPaused = false;
    g.tick(); assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0].framesLeft, 2);
    g.tick(); assert.equal(g.swing(), event); g.tick(); assert.equal(g.swing(), undefined);
    assert.equal(g.$gameMap.event(event.eventId()), null);
    assert.equal([...g.$gameMap.tagToEvents.values()].some(list => list.includes(event)), false);
});
test("接触前はDamageなし、接触時に公式Skill計算とUpdateEventHp(-damage)", () => {
    const g = loadGame(); const enemy = g.addEnemy(); g.startWith(CARD); g.aim(90); g.fire();
    assert.equal(g.hpCommands().length, 0); g.tick(); assert.equal(enemy.bar.currentHp, 200);
    const swing = g.swing(); enemy.event.locate(swing._realX, swing._realY + 0.5); g.tick();
    assert.equal(enemy.bar.currentHp, 120); assert.equal(g.hpCommands().length, 1);
    assert.equal(g.hpCommands()[0].args.value, "-damage"); assert.equal(g.hpCommands()[0].eventId, swing.eventId());
    assert.match(swing.event().note, /<dmg: ヘルメース剣術><attacker: player>/);
    assert.doesNotMatch(swing.event().note, /<weaponAttack>|<playerAttack>|dmg: weapon/);
});
test("Database式の変更が実Damageに反映され固定減算でない", () => {
    const g = loadGame(); g.$dataSkills[237].damage.formula = "27";
    g.startWith(CARD); g.fire(); const enemy = g.hitEnemy(); g.tick();
    assert.equal(enemy.bar.currentHp, 173);
});
test("全8方向と中間角で公式Collisionによる命中、後方の敵には当たらない", () => {
    for (const degree of [0, 45, 90, 135, 180, 225, 270, 315, 23.75]) {
        const g = loadGame(); g.startWith(CARD); g.aim(degree); g.fire();
        const front = g.hitEnemy(1), rad = (degree - 90) * Math.PI / 180;
        const back = g.addEnemy(2, 10 - Math.cos(rad) * 2, 10 - Math.sin(rad) * 2);
        g.tick(); assert.equal(front.bar.currentHp, 120, `front ${degree}`); assert.equal(back.bar.currentHp, 200);
    }
});
test("同一敵へ3frame接触し続けても1Hit、離れて戻っても二重Damageなし", () => {
    const g = loadGame(); g.startWith(CARD); g.fire(); const enemy = g.hitEnemy();
    g.tick(); const swing = g.swing(); enemy.event.locate(30, 30); g.tick();
    enemy.event.locate(swing._realX, swing._realY + 0.5); g.tick();
    assert.equal(enemy.bar.currentHp, 120); assert.equal(g.hpCommands().length, 1);
});
test("複数敵へ各1Hit、最初のHitで消えず遅れて入った敵にも命中", () => {
    const g = loadGame(); g.startWith(CARD); g.fire();
    const a = g.hitEnemy(1), b = g.hitEnemy(2); g.tick();
    assert.equal(a.bar.currentHp, 120); assert.equal(b.bar.currentHp, 120); assert.ok(g.swing());
    const c = g.hitEnemy(3); g.tick(2);
    assert.equal(c.bar.currentHp, 120); assert.equal(g.hpCommands().length, 3);
});
test("非enemy/HP0/消去済みEventはDamage対象外", () => {
    const g = loadGame(); g.startWith(CARD); g.fire();
    const a = g.hitEnemy(1), b = g.hitEnemy(2), c = g.hitEnemy(3);
    a.event._data.note = "<npc>"; b.bar.currentHp = 0; c.event._erased = true;
    g.tick(3); assert.equal(g.hpCommands().length, 0);
});
test("同時斬撃は別sourceとしてそれぞれ1Hit、古いCollisionが次の斬撃を妨げない", () => {
    const g = loadGame(); g.startWith(CARD); g.fire(); const enemy = g.hitEnemy();
    while (g.ProjectRCardDeck.getBattleState().hand[0].cardId !== CARD) {
        g.ProjectRCardDeck.useBattleCard(g.ProjectRCardDeck.getBattleState().hand[0].instanceId);
    }
    assert.equal(g.fire().ok, true);
    assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 2);
    g.tick(3); assert.equal(enemy.bar.currentHp, 40); assert.equal(g.hpCommands().length, 2);
});
test("空振り生成成功で消費/3秒Cooldown/即時ドロー、永続データ不変", () => {
    const g = loadGame(), d = g.ProjectRCardDeck; g.startWith(CARD);
    const before = plain(d.getBattleState()), persistent = plain(d.getPersistentData());
    assert.equal(g.fire().ok, true); const after = plain(d.getBattleState());
    assert.equal(after.cooldownPile.find(c => c.instance.instanceId === before.hand[0].instanceId).remainingSeconds, 3);
    assert.equal(after.hand.length, 5); assert.equal(after.drawPile.length, before.drawPile.length - 1);
    assert.equal(after.hand.some(c => c.instanceId === before.hand[0].instanceId), false);
    g.tick(3); assert.equal(g.hpCommands().length, 0); assert.deepEqual(plain(d.getPersistentData()), persistent);
});
test("生成なし/登録後例外/方向失敗/異常座標は非消費と生成物解除", () => {
    const key = "Hendrix_Action_Engine:spawnEventHitbox";
    for (const failure of [g => { g.PluginManager._commands[key] = () => null; },
        g => { const original = g.PluginManager._commands[key]; g.PluginManager._commands[key] = function(args) {
            original.call(this, args); throw Error("after registration");
        }; },
        g => vm.runInContext("Game_MaithlDynamicEvent.prototype.rotateTo = function() { this._rotation = NaN; };", g),
        g => vm.runInContext("Game_MaithlDynamicEvent.prototype.rotateTo = function() { this._realX = NaN; };", g)]) {
        const g = loadGame(); g.startWith(CARD); failure(g); const before = plain(g.ProjectRCardDeck.getBattleState());
        assert.equal(g.fire().reason, "activationFailed"); assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
        assert.equal(g.$gameMap.events().filter(e => e.isDynamicEvent).length, 0);
    }
});
test("API欠如/Skill欠如/重複名/不正mouse/方向ゼロは非消費", () => {
    for (const fail of [g => { delete g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"]; },
        g => { g.$dataSkills[237] = null; }, g => { g.$dataSkills.push({ ...g.$dataSkills[237], id: 238 }); },
        g => { g.TouchInput.x = NaN; },
        g => { g.TouchInput.x = g.$gamePlayer.screenX(); g.TouchInput.y = g.$gamePlayer.screenY(); }]) {
        const g = loadGame(); g.startWith(CARD); fail(g); const before = plain(g.ProjectRCardDeck.getBattleState());
        assert.equal(g.fire().reason, "activationFailed"); assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
    }
});
test("Parameterで距離/幅/奥行/寿命を調整可能、不正値は既定値", () => {
    const g = loadGame({ parameters: { ForwardTiles: "1", HitboxWidth: "1.2", HitboxHeight: "0.8", LifetimeFrames: "5" } });
    g.startWith(CARD); g.aim(90); g.fire();
    assert.equal(g.swing()._realX, 11); assert.equal(g.swing().hitboxData().width, 1.2);
    assert.equal(g.swing().hitboxData().height, 0.8); g.tick(4); assert.ok(g.swing()); g.tick(); assert.equal(g.swing(), undefined);
    const fallback = loadGame({ parameters: { HitboxWidth: "NaN", LifetimeFrames: "0" } });
    fallback.startWith(CARD); fallback.fire(); assert.equal(fallback.swing().hitboxData().width, 1.5);
    fallback.tick(3); assert.equal(fallback.swing(), undefined);
});
test("Golden Arrowのdispatch/実Damage/非貫通を同時導入でも維持", () => {
    const g = loadGame(); g.startWith("apollo_golden_arrow"); assert.equal(g.fire().ok, true);
    const a = g.addEnemy(101), b = g.addEnemy(102), arrow = g.projectile();
    a.event.locate(arrow._realX, arrow._realY + 0.5); b.event.locate(arrow._realX, arrow._realY + 0.5);
    g.tick(); assert.equal(a.bar.currentHp, 120); assert.equal(b.bar.currentHp, 200);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0); assert.equal(g.swing(), undefined);
});
test("通常Sword用Dynamic/Bullet/GunにDamage/寿命/終了cleanupを適用しない", () => {
    const g = loadGame();
    g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"].call({ _eventId: 0 }, {
        position: "10, 10", notetag: "<playerAttack><hitbox: 1.5, 1.2>", wait: "", rotationDegree: "" });
    const normal = g.$gameMap.events()[0];
    const bulletId = g.$gameMap.spawnEvent(1, 10, 10, false, 90);
    const enemy = g.addEnemy(3, 10, 10); g.tick(4); g.ProjectRCardDeck.endCardBattle();
    assert.equal(g.$gameMap.event(normal.eventId()), normal); assert.ok(g.$gameMap.event(bulletId));
    assert.equal(enemy.bar.currentHp, 200); assert.equal(g.hpCommands().length, 0);
});
test("終了/マップ移動/ロードで専用Hitboxのみ除去、ID再利用Eventを消さない", () => {
    for (const action of [g => g.ProjectRCardDeck.endCardBattle(), g => g.$gameMap.setup(2)]) {
        const g = loadGame(); g.startWith(CARD); g.fire(); const e = g.swing(); action(g);
        assert.equal(g.$gameMap.events().includes(e), false); assert.equal(g.swing(), undefined);
    }
    const g = loadGame(); g.startWith(CARD); g.fire(); const e = g.swing();
    const replacement = g.addEnemy(e.eventId(), 30, 30); g.tick();
    assert.equal(g.$gameMap.event(e.eventId()), replacement.event);
    const orphan = new g.Game_MaithlDynamicEvent(1, 50, 10, 10, "<projectRHermesSword>", "", "", "DynamicHitbox");
    g.$gameMap._events[50] = orphan; g.$gameMap.addEventToTagIndex(orphan);
    g.SceneManager._scene.onMapLoaded(); assert.equal(g.$gameMap.event(50), null);
});
test("Save API/永続形式を維持しロードで戦闘一時状態を破棄", () => {
    const g = loadGame(), d = g.ProjectRCardDeck; const before = plain(d.getPersistentData());
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]);
    assert.equal(g.DataManager.extractSaveContents, g.saveBeforePlugin[1]);
    g.startWith(CARD); g.fire(); const contents = g.DataManager.makeSaveContents();
    g.DataManager.extractSaveContents(contents); g.SceneManager._scene.onMapLoaded();
    assert.equal(d.isCardBattleActive(), false); assert.equal(g.swing(), undefined);
    assert.deepEqual(plain(d.getPersistentData()), before);
});
test("斬撃終了時に専用Collision履歴/タグを解放、他の履歴は保持", () => {
    const g = loadGame(); g.startWith(CARD); g.fire(); g.hitEnemy(); g.tick();
    assert.ok(Object.keys(g.$gameSystem.collidedOnceEvents).some(k => k.includes("projectRHermesSwordHit")));
    g.$gameSystem.collidedOnceEvents.other = true;
    g.tick(2);
    assert.deepEqual(plain(g.$gameSystem.collidedOnceEvents), { other: true });
    assert.deepEqual(plain(g.$gameSystem.collisionTimestamps), {});
});
test("認識阻害/葦笛/高速移動のhandlerを同時導入で保持し既存実効果も成功", () => {
    for (const name of ["RecognitionObscure", "ReedFluteSleep", "SwiftMovement"]) {
        const text = read(`tests/ProjectR_Hermes${name}.test.cjs`), f = { require, __dirname, console };
        vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.g = loadGame();", f);
        const g = f.g, deck = g.ProjectRCardDeck;
        // 認識阻害単体fixtureはGame_Mapを持たないのでmap hookの器だけを補う。
        if (!g.Game_Map) { g.Game_Map = function() {}; g.Game_Map.prototype.update = function() {}; }
        const instant = deck.getActivationHandler("instant"), ground = deck.getActivationHandler("ground");
        vm.runInContext(read(`js/plugins/${PLUGIN}.js`), g);
        assert.equal(deck.getActivationHandler("instant"), instant);
        assert.equal(deck.getActivationHandler("ground"), ground);
        if (name === "RecognitionObscure") {
            g.start(); g.arrange(); assert.equal(deck.requestUseCard(0).ok, true); assert.equal(g.obscured(), true);
        } else if (name === "ReedFluteSleep") {
            const enemy = g.addEnemy(); g.start(); assert.equal(g.fire().ok, true); assert.equal(g.sleeping(enemy), true);
        } else {
            g.prepareSwift(); assert.equal(g.fireSwift().ok, true); assert.deepEqual(plain(g.position()), [13, 10]);
        }
    }
});
test("実機手順の一時30枚デッキ/手札準備/復元が本番7種で動作", () => {
    const g = loadGame({ prepare: false, productionDefinitions: true }); g.console = { log() {} };
    const before = plain(g.ProjectRCardDeck.getPersistentData());
    const blocks = [...read("docs/ProjectR_CardDeck_Phase2C4.md").matchAll(/```js\n([\s\S]*?)```/g)].map(m => m[1]);
    assert.equal(blocks.length, 2); vm.runInContext(blocks[0], g);
    const slot = g.prepareSword2c4();
    assert.equal(g.ProjectRCardDeck.getBattleState().hand[slot].cardId, CARD);
    assert.equal(g.ProjectRCardDeck.requestUseCard(slot).ok, true);
    vm.runInContext(blocks[1], g); assert.equal(g.ProjectRCardDeck.isCardBattleActive(), false);
    assert.deepEqual(plain(g.ProjectRCardDeck.getPersistentData()), before);
    assert.equal(g.ProjectRCardDeck.definitions.cardDefinitions().length, 7);
});
console.log(`# ${passed} Phase 2C-4 tests passed`);
