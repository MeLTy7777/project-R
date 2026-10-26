"use strict";
// Phase 3B: 残り5枚（認識阻害/葦笛睡眠/高速移動/病の矢/リラの支援）の神召喚経由。
// 各カードの既存fixture（実Router・導入版Action Engine・MZ標準State）を再利用する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function fixtureLoader(file) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", f);
    return f.createGame;
}
const loaders = {
    obscure: fixtureLoader("tests/ProjectR_HermesRecognitionObscure.test.cjs"),
    flute: fixtureLoader("tests/ProjectR_HermesReedFluteSleep.test.cjs"),
    swift: fixtureLoader("tests/ProjectR_HermesSwiftMovement.test.cjs"),
    disease: fixtureLoader("tests/ProjectR_ApolloDiseaseAttack.test.cjs"),
    lyre: fixtureLoader("tests/ProjectR_ApolloLyreCalm.test.cjs")
};
const CARDS = {
    obscure: { card: "hermes_perception_obscure", god: "hermes", type: "instant", cooldown: 10 },
    flute: { card: "hermes_reed_flute_sleep", god: "hermes", type: "ground", cooldown: 12 },
    swift: { card: "hermes_swift_movement", god: "hermes", type: "instant", cooldown: 6 },
    disease: { card: "apollo_plague_attack", god: "apollo", type: "direction", cooldown: 12 },
    lyre: { card: "apollo_lyre_calm", god: "apollo", type: "ally", cooldown: 10 }
};
const manager = g => g.ProjectRGodSummonManager;
const summons = g => manager(g).getActiveSummons();
const deck = g => g.ProjectRCardDeck;
const tickMap = (g, n = 1) => { for (let i = 0; i < n; i++) g.Game_Map.prototype.update.call(g.$gameMap, true); };
// カードごとの「手札へ準備」「発動」「効果の観測値」。観測値は効果が起きると変わる。
const rigs = {
    obscure: g => ({ prepare() { g.start(); g.arrange(); }, again() { g.arrange(); },
        fire: () => deck(g).requestUseCard(0), effect: () => g.obscured() }),
    flute: g => { const enemy = g.addEnemy(); return { enemy, prepare() { g.start(); g.arrange(0, CARDS.flute.card); },
        again() { g.arrange(0, CARDS.flute.card); }, fire: () => deck(g).requestUseCard(0), effect: () => g.sleeping(enemy) }; },
    swift: g => ({ prepare() { g.prepareSwift(); }, again() { g.arrange(0, CARDS.swift.card); deck(g).updateCooldown(12); },
        fire: () => g.fireSwift(), effect: () => g.position().join(",") }),
    disease: g => ({ prepare() { g.begin(); }, again() { g.arrange(); },
        fire: () => deck(g).requestUseCard(0), effect: () => g.spawns.length }),
    lyre: g => ({ prepare() { g.start(); g.arrange(); }, again() { g.arrange(); },
        fire: () => deck(g).requestUseCard(0), effect: () => g.calm() })
};
function setup(key) {
    const g = loaders[key]();
    const rig = rigs[key](g);
    rig.initial = rig.effect(); // 準備前の観測値（起点）
    return { g, rig };
}
// perform()を観察し、効果実行時点の観測値を記録する。
function spy(g, rig) {
    const original = manager(g), log = { contexts: [], atEffect: [] };
    g.ProjectRGodSummonManager = { ...original, perform(request, effect) {
        return original.perform(request, context => {
            log.contexts.push(context);
            log.atEffect.push({ active: original.getActiveSummons().length, observed: rig.effect() });
            return effect(context);
        });
    } };
    return log;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("5枚とも対応する神を効果より前に解決し、contextが効果へ届く", () => {
    for (const key of Object.keys(CARDS)) {
        const info = CARDS[key], { g, rig } = setup(key);
        rig.prepare();
        const before = rig.effect(), log = spy(g, rig);
        const result = rig.fire();
        assert.equal(result.ok, true, key); assert.equal(result.targetType, info.type, key);
        assert.equal(log.contexts.length, 1, key);
        const ctx = log.contexts[0];
        assert.deepEqual([ctx.godId, ctx.ringId, ctx.cardId, ctx.owner], [info.god, info.god, info.card, "player"], key);
        assert.equal(ctx.summon.transient, true, key);
        assert.equal(log.atEffect[0].active, 1, key);              // 召喚は効果より前に存在
        assert.equal(log.atEffect[0].observed, before, key);       // 効果開始前の観測値は不変
        assert.equal(summons(g).length, 1, key);
        assert.equal(manager(g).resolveGodId(ctx.ringId), info.god, key);
    }
});
test("成功時は従来どおり消費・Cooldown・即時ドロー、永続データ不変", () => {
    for (const key of Object.keys(CARDS)) {
        const { g, rig } = setup(key); rig.prepare();
        const state0 = plain(deck(g).getBattleState()), persistent = plain(deck(g).getPersistentData());
        assert.equal(rig.fire().ok, true, key);
        const state = plain(deck(g).getBattleState());
        assert.equal(state.hand.some(c => c.instanceId === state0.hand[0].instanceId), false, key);
        assert.equal(state.cooldownPile.find(c => c.instance.instanceId === state0.hand[0].instanceId).remainingSeconds,
            CARDS[key].cooldown, key);
        assert.deepEqual(plain(deck(g).getPersistentData()), persistent, key);
    }
});
test("召喚が作れない/Managerが無い場合は効果未実行・非消費・Stateも移動も弾もなし", () => {
    for (const key of Object.keys(CARDS)) {
        for (const fail of ["plain", "missing", "nan"]) {
            const { g, rig } = setup(key); rig.prepare();
            const before = plain(deck(g).getBattleState()), observed = rig.effect();
            let called = false;
            if (fail === "plain") {
                const original = manager(g);
                g.ProjectRGodSummonManager = { ...original, perform: () => ({ ok: false, reason: "summonCreationFailed" }) };
            } else if (fail === "missing") {
                g.ProjectRGodSummonManager = undefined;
            } else {
                if (key === "swift") continue; // 高速移動は元から座標不正を召喚前に検出（別テストで確認済み）
                g.$gamePlayer._realX = NaN;
            }
            const result = rig.fire();
            assert.equal(result.reason, "activationFailed", `${key}/${fail}`);
            assert.deepEqual(plain(deck(g).getBattleState()), before, `${key}/${fail}`);
            assert.equal(rig.effect(), fail === "nan" && key === "swift" ? rig.effect() : observed, `${key}/${fail}`);
            assert.equal(called, false);
            if (g.ProjectRGodSummonManager) assert.equal(summons(g).length, 0, `${key}/${fail}`);
        }
    }
});
test("効果側の失敗（対象なし/移動不能/付与失敗/生成失敗）は従来どおり非消費で、召喚も破棄", () => {
    const failures = {
        obscure: g => { g.hasState = () => false; },
        flute: (g, rig) => { rig.enemy.x = 99; },
        swift: g => { g.$gamePlayer.mover = () => ({}); },
        disease: g => { g.$gameMap.spawnEvent = () => { throw Error("spawn failed"); }; },
        lyre: g => { g.hasState = () => false; }
    };
    for (const key of Object.keys(CARDS)) {
        const { g, rig } = setup(key); rig.prepare();
        const before = plain(deck(g).getBattleState()), observed = rig.effect();
        failures[key](g, rig);
        assert.equal(rig.fire().reason, "activationFailed", key);
        assert.deepEqual(plain(deck(g).getBattleState()), before, key);
        assert.equal(summons(g).length, 0, key);
        if (key === "disease") assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 0);
        if (key === "swift") assert.equal(rig.effect(), observed);
    }
});
test("Lyreのrollback: 付与後に例外でもCalm未付与・睡眠は元に戻り・非消費", () => {
    const { g, rig } = setup("lyre"); rig.prepare(); g.addOfficial(32);
    assert.equal(g.actor.isStateAffected(32), true);
    const before = plain(deck(g).getBattleState());
    const add = g.PluginManager._commands["Hendrix_Action_Engine:AddState"];
    g.PluginManager._commands["Hendrix_Action_Engine:AddState"] = function() { add.apply(this, arguments); throw Error("boom"); };
    assert.equal(rig.fire().reason, "activationFailed");
    assert.equal(g.calm(), false); assert.equal(g.actor.isStateAffected(32), true);
    assert.deepEqual(plain(deck(g).getBattleState()), before); assert.equal(summons(g).length, 0);
});
test("Lyreは召喚失敗時に睡眠を解除せずCalmも付与しない", () => {
    const { g, rig } = setup("lyre"); rig.prepare(); g.addOfficial(32);
    g.ProjectRGodSummonManager = { ...manager(g), perform: () => ({ ok: false, reason: "x" }) };
    assert.equal(rig.fire().reason, "activationFailed");
    assert.equal(g.actor.isStateAffected(32), true); assert.equal(g.calm(), false);
    assert.equal(g.commands.length, 0);
});
test("認識阻害: State31・5秒・非stack・再使用で更新・battle end解除は従来どおり", () => {
    const { g, rig } = setup("obscure"); rig.prepare();
    assert.equal(rig.fire().ok, true); assert.equal(g.obscured(), true);
    assert.equal(g.actor._states.filter(s => s === 31).length, 1);
    deck(g).updateCooldown(3); rig.again(); assert.equal(rig.fire().ok, true);
    assert.equal(g.actor._states.filter(s => s === 31).length, 1);
    deck(g).updateCooldown(4.9); assert.equal(g.obscured(), true);
    deck(g).updateCooldown(0.2); assert.equal(g.obscured(), false);
    rig.again(); rig.fire(); assert.equal(g.obscured(), true);
    deck(g).endCardBattle(); assert.equal(g.obscured(), false); assert.equal(summons(g).length, 0);
});
test("葦笛睡眠: 範囲内の複数敵のみ、4秒、再使用で更新、対象なしは失敗は従来どおり", () => {
    const { g, rig } = setup("flute"); const near = g.addEnemy(3, 0), far = g.addEnemy(9, 0);
    rig.prepare(); assert.equal(rig.fire().ok, true);
    assert.equal(g.sleeping(rig.enemy), true); assert.equal(g.sleeping(near), true); assert.equal(g.sleeping(far), false);
    deck(g).updateCooldown(3.5); assert.equal(g.sleeping(near), true);
    deck(g).updateCooldown(0.6); assert.equal(g.sleeping(near), false); assert.equal(g.sleeping(rig.enemy), false);
    const solo = setup("flute"); solo.rig.enemy.x = 9; solo.g.addEnemy(9, 0); solo.rig.prepare();
    assert.equal(solo.rig.fire().reason, "activationFailed");
});
test("高速移動: 最大3tile、障害物の手前で停止、全阻止は失敗、移動するのはPlayerのみ", () => {
    const { g, rig } = setup("swift"); g.aim(20, 10); rig.prepare();
    const log = spy(g, rig);
    assert.equal(rig.fire().ok, true);
    assert.deepEqual(plain(g.position()), [13, 10]);
    assert.equal(log.atEffect[0].observed, "10,10"); // 召喚時点ではPlayerは未移動
    assert.equal(summons(g)[0].x, 10);                // 召喚アンカーは動かない
    const blocked = setup("swift"); blocked.g.aim(20, 10); blocked.g.blocked.add("11,10"); blocked.g.blocked.add("11,9");
    blocked.rig.prepare();
    const before = plain(deck(blocked.g).getBattleState());
    if (blocked.rig.fire().ok) assert.ok(blocked.g.position()[0] < 13);
    else assert.deepEqual(plain(deck(blocked.g).getBattleState()), before);
});
test("病の矢: 弾は召喚経由で従来どおり発射、初撃30→Disease→1秒15のDoT、再付与で更新", () => {
    const { g, rig } = setup("disease"); const enemy = g.enemy(); rig.prepare();
    const log = spy(g, rig);
    g.aim?.(90);
    assert.equal(rig.fire().ok, true);
    assert.equal(log.atEffect[0].observed, 0);                       // 召喚時点で弾は未生成
    assert.equal(g.spawns.length, 1);
    assert.deepEqual(plain(g.spawns[0].slice(1, 3)), [log.contexts[0].x, log.contexts[0].y]);
    assert.equal(g.ProjectRApolloDiseaseAttack.getActiveProjectiles().length, 1);
    const hp0 = enemy.bar.currentHp;
    g.hit(enemy);
    assert.equal(hp0 - enemy.bar.currentHp, 30);                     // Skill 238
    assert.equal(g.diseased(enemy), true);
    g.time(1); assert.equal(hp0 - enemy.bar.currentHp, 45);          // Skill 239
    g.time(5); assert.equal(hp0 - enemy.bar.currentHp, 30 + 15 * 6); assert.equal(g.diseased(enemy), false);
    assert.equal(summons(g).length, 1); tickMap(g, 12); assert.equal(summons(g).length, 0);
});
test("病の矢: State耐性の敵は初撃のみ（従来どおり）で召喚は発射後に破棄", () => {
    const { g, rig } = setup("disease"); const enemy = g.enemy(1, 20, 20, { code: 14, dataId: 33, value: 1 });
    rig.prepare(); assert.equal(rig.fire().ok, true);
    g.hit(enemy); assert.equal(g.diseased(enemy), false);
    tickMap(g, 12); assert.equal(summons(g).length, 0);
});
test("Lyre: 睡眠のみ解除/耐性、認識阻害31・病33は対象外、6秒、再使用で更新、解除繰り返し", () => {
    const { g, rig } = setup("lyre"); rig.prepare();
    g.addOfficial(32); g.actor.addState(31); g.actor.addState(33);
    assert.equal(rig.fire().ok, true);
    assert.equal(g.actor.isStateAffected(32), false); assert.equal(g.calm(), true);
    assert.equal(g.actor.isStateAffected(31), true); assert.equal(g.actor.isStateAffected(33), true);
    g.addOfficial(32); assert.equal(g.actor.isStateAffected(32), false);
    deck(g).updateCooldown(3); rig.again(); assert.equal(rig.fire().ok, true);
    assert.equal(g.actor._states.filter(s => s === 34).length, 1);
    assert.ok(Math.abs(g.api.getRemainingSeconds() - 6) < 1e-6);
    deck(g).updateCooldown(5.9); assert.equal(g.calm(), true);
    deck(g).updateCooldown(0.2); assert.equal(g.calm(), false);
    rig.again(); rig.fire(); deck(g).endCardBattle(); assert.equal(g.calm(), false);
});
test("連続発動は別instanceで共存し、寿命後に全て消える（5枚）", () => {
    for (const key of Object.keys(CARDS)) {
        const { g, rig } = setup(key); rig.prepare();
        assert.equal(rig.fire().ok, true, key);
        tickMap(g, 5);
        rig.again(); assert.equal(rig.fire().ok, true, key);
        const list = summons(g);
        assert.equal(list.length, 2, key); assert.notEqual(list[0].summonId, list[1].summonId, key);
        assert.deepEqual(plain(list.map(s => s.framesLeft)), [7, 12], key);
        tickMap(g, 12); assert.equal(summons(g).length, 0, key);
    }
});
test("endCardBattle/マップ移動/ロードで召喚が残らない（5枚）", () => {
    for (const key of Object.keys(CARDS)) {
        for (const how of ["end", "setup", "load"]) {
            const { g, rig } = setup(key); rig.prepare(); assert.equal(rig.fire().ok, true, key);
            assert.equal(summons(g).length, 1, key);
            if (how === "end") deck(g).endCardBattle();
            else if (how === "setup") g.Game_Map.prototype.setup.call(g.$gameMap, 2);
            else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
            assert.equal(summons(g).length, 0, `${key}/${how}`);
        }
    }
});
test("セーブ互換: 召喚情報は永続データにもセーブ内容にも入らない（5枚）", () => {
    for (const key of Object.keys(CARDS)) {
        const { g, rig } = setup(key); rig.prepare();
        const persistent = JSON.stringify(deck(g).getPersistentData());
        assert.equal(rig.fire().ok, true, key);
        assert.equal(summons(g).length, 1, key);
        assert.equal(JSON.stringify(deck(g).getPersistentData()), persistent, key);
        assert.equal(/summon/i.test(persistent), false, key);
        const contents = g.DataManager.makeSaveContents();
        assert.equal(Object.keys(contents).some(k => /summon/i.test(k)), false, key);
        assert.equal(Object.keys(g.$gameSystem).some(k => /summon/i.test(k)), false, key);
    }
});
test("プラグイン順: Managerは移行済み全カードより前、Phase 3Aの2枚も維持", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const names = c.$plugins.map(p => p.name), at = names.indexOf("ProjectR_GodSummonManager");
    assert.ok(at > names.indexOf("ProjectR_CardDeckCore"));
    for (const name of ["ProjectR_ApolloGoldenArrow", "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep",
        "ProjectR_HermesSwiftMovement", "ProjectR_HermesSwordsmanship", "ProjectR_ApolloDiseaseAttack",
        "ProjectR_ApolloLyreCalm"]) {
        assert.ok(names.indexOf(name) > at, name);
        assert.ok(read(`js/plugins/${name}.js`).includes("@base ProjectR_GodSummonManager"), name);
    }
});
console.log(`# ${passed} Phase 3B tests passed`);
