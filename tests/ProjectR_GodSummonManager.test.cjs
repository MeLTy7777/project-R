"use strict";
// Phase 3A: 一時神召喚基盤。Golden Arrow/Swordsmanshipの既存fixture（導入版Action Engine実コード）を再利用する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack";
const source = read("tests/ProjectR_HermesSwordsmanship.test.cjs");
const fixture = { require, __dirname, console };
vm.runInNewContext(source.slice(0, source.indexOf("\nlet passed = 0;\n")) + "\nthis.createGame = loadGame;", fixture);
const loadGame = options => fixture.createGame(options);
const manager = g => g.ProjectRGodSummonManager;
const summons = g => manager(g).getActiveSummons();
// 手札に目的のカードが出るまで先頭を消費し、そのhandIndexを返す（同一戦闘内の連続発動用）。
function prepare(g, cardId) {
    const deck = g.ProjectRCardDeck;
    for (let n = 0; n < 40; n++) {
        const hand = deck.getBattleState().hand;
        const index = hand.findIndex(c => c.cardId === cardId);
        if (index >= 0) return index;
        deck.useBattleCard(hand[0].instanceId);
    }
    throw Error("card unavailable");
}
// perform()を観察する。effect呼出し時点の状態も記録する。
function spy(g) {
    const original = manager(g), log = { requests: [], contexts: [], atEffect: [] };
    g.ProjectRGodSummonManager = {
        ...original,
        perform(request, effect) {
            log.requests.push(request);
            return original.perform(request, context => {
                log.contexts.push(context);
                log.atEffect.push({ active: original.getActiveSummons().length, spawns: g.spawns.length,
                    commands: g.commands.length });
                return effect(context);
            });
        }
    };
    return log;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("登録: Managerは単一・Arrow/Swordより前、指輪→神の対応", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const names = c.$plugins.map(p => p.name), i = names.indexOf("ProjectR_GodSummonManager");
    assert.ok(i > names.indexOf("ProjectR_CardDeckCore"));
    assert.ok(i < names.indexOf("ProjectR_ApolloGoldenArrow"));
    assert.ok(i < names.indexOf("ProjectR_HermesSwordsmanship"));
    assert.equal(c.$plugins.filter(p => p.name === "ProjectR_GodSummonManager" && p.status).length, 1);
    const g = loadGame();
    assert.equal(manager(g).resolveGodId("apollo"), "apollo");
    assert.equal(manager(g).resolveGodId("hermes"), "hermes");
    assert.equal(manager(g).resolveGodId("zeus"), null);
    assert.equal(manager(g).resolveGodId("toString"), null);
});
test("Golden ArrowはApolloを解決し、効果より前に召喚が存在してcontextが渡る", () => {
    const g = loadGame(), log = spy(g); g.startWith(ARROW); g.aim(90);
    assert.equal(g.fire().reason, "success");
    const ctx = log.contexts[0];
    assert.equal(log.contexts.length, 1);
    assert.deepEqual([ctx.godId, ctx.ringId, ctx.cardId, ctx.owner], ["apollo", "apollo", ARROW, "player"]);
    assert.equal(log.atEffect[0].active, 1); assert.equal(log.atEffect[0].spawns, 0); // 召喚後・弾生成前
    assert.equal(g.spawns.length, 1);
    assert.equal(ctx.summon.godId, "apollo"); assert.equal(ctx.x, 10); assert.equal(ctx.y, 10);
    assert.ok(Math.abs(ctx.degree - 90) < 1e-8);
});
test("SwordsmanshipはHermesを解決し、効果より前に召喚が存在してcontextが渡る", () => {
    const g = loadGame(), log = spy(g); g.startWith(SWORD); g.aim(180);
    assert.equal(g.fire().reason, "success");
    const ctx = log.contexts[0];
    assert.deepEqual([ctx.godId, ctx.ringId, ctx.cardId, ctx.owner], ["hermes", "hermes", SWORD, "player"]);
    assert.equal(log.atEffect[0].active, 1);
    assert.equal(log.atEffect[0].commands, 0); // spawnEventHitbox前
    assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 1);
    assert.ok(Math.abs(ctx.degree - 180) < 1e-8);
    assert.deepEqual(plain(ctx.center), { x: 10.5, y: 10.5 });
});
test("成功時は既存どおり消費・Cooldown・即時ドロー、永続データ不変", () => {
    for (const [card, cd] of [[ARROW, 4], [SWORD, 3]]) {
        const g = loadGame(), deck = g.ProjectRCardDeck; g.startWith(card);
        const before = plain(deck.getBattleState()), persistent = plain(deck.getPersistentData());
        assert.equal(g.fire().ok, true);
        const state = plain(deck.getBattleState());
        assert.equal(state.hand.length, 5); assert.equal(state.drawPile.length, before.drawPile.length - 1);
        assert.equal(state.cooldownPile.find(c => c.instance.instanceId === before.hand[0].instanceId).remainingSeconds, cd);
        assert.deepEqual(plain(deck.getPersistentData()), persistent);
    }
});
test("召喚生成失敗（座標不正/神未解決/戦闘外）は効果未実行・非消費・召喚なし", () => {
    for (const card of [ARROW, SWORD]) {
        for (const fail of [g => { g.$gamePlayer.screenX = () => NaN; },
            g => { g.$gamePlayer._realY = NaN; g.$gamePlayer.centerPositionPoint = () => ({ x: NaN, y: 1 }); },
            g => { g.TouchInput.x = Infinity; }]) {
            const g = loadGame(), log = spy(g); g.startWith(card);
            const before = plain(g.ProjectRCardDeck.getBattleState()); fail(g);
            assert.equal(g.fire().reason, "activationFailed");
            assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
            assert.equal(log.contexts.length, 0); assert.equal(summons(g).length, 0);
            assert.equal(g.spawns.length, 0); assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 0);
        }
    }
    const g = loadGame(); let called = false;
    for (const request of [{ definition: { ringId: "zeus", cardId: "x" } }, { definition: null }]) {
        assert.equal(manager(g).perform(request, () => { called = true; return { ok: true }; }).ok, false);
    }
    assert.equal(called, false); assert.equal(summons(g).length, 0);
    g.ProjectRCardDeck.endCardBattle();
    assert.equal(manager(g).perform({ definition: { ringId: "apollo", cardId: ARROW } }, () => ({ ok: true })).reason,
        "battleInactive");
});
test("効果開始前の部分失敗は召喚を破棄し非消費（Arrow/Sword）", () => {
    const failures = [
        [ARROW, g => { g.$gameMap.spawnEvent = () => { throw Error("spawn failed"); }; }],
        [ARROW, g => { g.$gameMap.spawnEvent = () => null; }],
        [ARROW, g => { g.Game_Character.prototype.rotateTo = () => { throw Error("rotation failed"); }; }],
        [SWORD, g => { g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"] = () => { throw Error("hitbox failed"); }; }]
    ];
    for (const [card, fail] of failures) {
        const g = loadGame(), log = spy(g); g.startWith(card);
        const before = plain(g.ProjectRCardDeck.getBattleState()); fail(g);
        assert.equal(g.fire().reason, "activationFailed");
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
        assert.equal(log.contexts.length, 1); assert.equal(summons(g).length, 0);
        assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
        assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 0);
    }
    const g = loadGame(); g.startWith(ARROW);
    assert.equal(manager(g).perform({ definition: { ringId: "apollo", cardId: ARROW } }, () => { throw Error("boom"); }).ok, false);
    assert.equal(manager(g).perform({ definition: { ringId: "apollo", cardId: ARROW } }, () => ({ ok: false })).ok, false);
    assert.equal(summons(g).length, 0);
});
test("Golden Arrowの弾は従来どおり: プレイヤー位置・固定マウス角・直進・1Hit・Skill236", () => {
    const g = loadGame(); g.startWith(ARROW); g.aim(135); g.fire();
    const arrow = g.projectile();
    // 発射origin = 召喚アンカー = プレイヤー位置（spawnEventへ従来と同じ座標を要求）。
    assert.deepEqual(plain(g.spawns[0].slice(1, 3)), [10, 10]);
    assert.ok(Math.abs(arrow._rotation - 135) < 1e-8);
    g.aim(270); g.$gamePlayer._realX += 3; g.Graphics.frameCount++; g.$gameMap.update(true);
    assert.ok(Math.abs(g.projectile()._rotation - 135) < 1e-8);
    assert.equal(arrow.event().note.includes("<attacker: player>"), true);
    assert.equal(arrow.event().note.includes("<dmg: 黄金の弓矢>"), true);
    const h = loadGame(), enemy = h.addEnemy(); h.startWith(ARROW); h.fire(); h.collideWith(enemy);
    Object.assign(g, { hpCommands: h.hpCommands, ProjectRApolloGoldenArrow: h.ProjectRApolloGoldenArrow });
    assert.equal(enemy.bar.currentHp, 120); // a.atk*2 - b.def = 80（Skill 236）
    assert.equal(g.hpCommands().length, 1);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
    assert.equal(g.$dataSkills[236].damage.formula, "a.atk * 2 - b.def");
});
test("Swordsmanshipのhitboxは従来どおり: 前方0.75tile・3frame・各敵1Hit・Skill237・attacker=player", () => {
    const g = loadGame(); g.startWith(SWORD); g.aim(90); g.fire();
    const info = g.ProjectRHermesSwordsmanship.getActiveHitboxes()[0];
    assert.equal(info.framesLeft, 3);
    assert.ok(Math.abs(info.x - 10.75) < 1e-8);
    const swing = g.swing();
    assert.equal(swing.event().note.includes("<attacker: player>"), true);
    assert.equal(swing.event().note.includes("<dmg: ヘルメース剣術>"), true);
    const a = g.addEnemy(101, swing._realX, swing._realY + 0.5), b = g.addEnemy(102, swing._realX, swing._realY + 0.5);
    g.tick(3);
    assert.equal(a.bar.currentHp, 120); assert.equal(b.bar.currentHp, 120); // 各1Hit・Skill237 = 80
    assert.equal(g.hpCommands().length, 2);
    assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 0);
    assert.equal(g.$dataSkills[237].damage.formula, "a.atk * 2 - b.def");
});
test("召喚はHP・AI・標的・衝突を持たず、Eventを作らず移動を妨げない", () => {
    const g = loadGame(); g.startWith(ARROW);
    const eventsBefore = g.$gameMap.events().length;
    let seen;
    const result = manager(g).perform({ definition: { ringId: "hermes", cardId: SWORD } }, ctx => { seen = ctx; return { ok: true }; });
    assert.equal(result.ok, true);
    assert.equal(g.$gameMap.events().length, eventsBefore); // Map Eventなし=衝突/標的/Spriteなし
    const keys = Object.keys(seen.summon).join(",");
    assert.equal(/hp|mhp|ai|target|collision|hitbox|enemy|state|skill/i.test(keys), false, keys);
    assert.equal(seen.summon.transient, true); assert.equal(seen.summon.owner, "player");
    assert.equal(Object.isFrozen(seen.summon), true);
    assert.equal(g.$gamePlayer._realX, 10); // プレイヤーを動かさない
    assert.equal(g.addEnemy().event.event().note.includes("<enemy>"), true);
    const info = summons(g)[0];
    assert.equal(Object.keys(info).some(k => /hp|ai|target/i.test(k)), false);
});
test("効果後の寿命(12 map更新frame)で破棄。inactive/pause中は進まない", () => {
    const g = loadGame(); g.startWith(ARROW); g.fire();
    assert.equal(summons(g).length, 1); assert.equal(summons(g)[0].framesLeft, 12);
    g.tick(5, false); g.$gameMap.eventsPaused = true; g.tick(5); g.$gameMap.eventsPaused = false;
    assert.equal(summons(g)[0].framesLeft, 12);
    g.tick(11); assert.equal(summons(g).length, 1); g.tick(); assert.equal(summons(g).length, 0);
    const h = loadGame(); h.startWith(SWORD); h.fire(); h.tick(3);
    assert.equal(h.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 0);
    assert.equal(summons(h).length, 1); h.tick(9); assert.equal(summons(h).length, 0);
});
test("endCardBattleで全召喚を破棄", () => {
    const g = loadGame(); g.startWith(ARROW); g.fire();
    prepare(g, SWORD); g.ProjectRCardDeck.requestUseCard(prepare(g, SWORD));
    assert.equal(summons(g).length, 2);
    g.ProjectRCardDeck.endCardBattle();
    assert.equal(summons(g).length, 0); assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 0);
});
test("マップ移動とロードで召喚が残らない", () => {
    const g = loadGame(); g.startWith(ARROW); g.fire(); assert.equal(summons(g).length, 1);
    g.$gameMap.setup(2); assert.equal(summons(g).length, 0);
    const h = loadGame(); h.startWith(SWORD); h.fire(); assert.equal(summons(h).length, 1);
    const contents = h.DataManager.makeSaveContents();
    h.DataManager.extractSaveContents(contents);
    assert.equal(summons(h).length, 0);
    const k = loadGame(); k.startWith(SWORD); k.fire();
    k.SceneManager._scene.onMapLoaded(); assert.equal(summons(k).length, 0);
});
test("連続発動は別instanceで共存し、互いの効果/寿命を壊さない", () => {
    const g = loadGame(); g.startWith(ARROW);
    assert.equal(g.fire().ok, true); g.tick(5);
    assert.equal(g.ProjectRCardDeck.requestUseCard(prepare(g, ARROW)).ok, true);
    const list = summons(g);
    assert.equal(list.length, 2);
    assert.notEqual(list[0].summonId, list[1].summonId);
    assert.deepEqual(plain(list.map(s => s.framesLeft)), [7, 12]);
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 2);
    g.tick(7); assert.deepEqual(plain(summons(g).map(s => s.framesLeft)), [5]);
    g.tick(5); assert.equal(summons(g).length, 0);
    // 同じ神(Hermes)の剣術も連続して別hitbox/別召喚になる。
    const h = loadGame(); h.startWith(SWORD); h.fire();
    assert.equal(h.ProjectRCardDeck.requestUseCard(prepare(h, SWORD)).ok, true);
    assert.equal(summons(h).length, 2); assert.equal(h.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 2);
});
test("繰り返し発動しても召喚/弾/hitboxが蓄積しない", () => {
    const g = loadGame(); g.startWith(ARROW);
    for (let i = 0; i < 6; i++) {
        assert.equal(g.ProjectRCardDeck.requestUseCard(prepare(g, i % 2 ? SWORD : ARROW)).ok, true);
        g.tick(100);
        assert.equal(summons(g).length, 0);
    }
    assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 0);
    assert.equal(g.$gameMap.events().filter(e => e.event()?.note.includes("<projectRHermesSword>")).length, 0);
});
test("未移行の5枚は従来どおり（召喚を作らず・既存の成功/消費）", () => {
    for (const card of ["hermes_perception_obscure", "hermes_reed_flute_sleep", "hermes_swift_movement",
        "apollo_plague_attack", "apollo_lyre_calm"]) {
        const g = loadGame(), log = spy(g); g.startWith(card);
        const before = plain(g.ProjectRCardDeck.getBattleState());
        assert.equal(g.fire().reason, "success", card);
        assert.equal(log.requests.length, 0, card); assert.equal(summons(g).length, 0, card);
        assert.equal(g.ProjectRCardDeck.getBattleState().hand.some(c => c.instanceId === before.hand[0].instanceId), false, card);
    }
});
test("セーブ互換: 召喚はセーブ内容に入らず、保存APIも永続形式も不変", () => {
    const g = loadGame(); g.startWith(ARROW);
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]);
    assert.equal(g.DataManager.extractSaveContents, g.saveBeforePlugin[1]);
    const before = JSON.stringify(g.DataManager.makeSaveContents());
    g.fire();
    assert.equal(summons(g).length, 1);
    const after = JSON.stringify(g.DataManager.makeSaveContents());
    assert.equal(/summon/i.test(after), false);
    assert.equal(/summon/i.test(JSON.stringify(g.ProjectRCardDeck.getPersistentData())), false);
    assert.equal(/summon/i.test(JSON.stringify(g.$gameSystem)), false);
    assert.equal(before.length > 0, true);
});
test("Managerがない構成ではArrow/Swordとも発動失敗し非消費", () => {
    for (const card of [ARROW, SWORD]) {
        const g = loadGame(); g.startWith(card); const before = plain(g.ProjectRCardDeck.getBattleState());
        g.ProjectRGodSummonManager = undefined;
        assert.equal(g.fire().reason, "activationFailed");
        assert.deepEqual(plain(g.ProjectRCardDeck.getBattleState()), before);
        assert.equal(g.spawns.length, 0);
    }
});
console.log(`# ${passed} Phase 3A tests passed`);
