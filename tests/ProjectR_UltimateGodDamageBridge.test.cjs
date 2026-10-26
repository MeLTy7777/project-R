"use strict";
// Phase 3C-3: ボス/範囲攻撃 → 常駐Ultimate神Divine HPのbridge。Golden Arrow/Swordsmanshipの実Action Engine fixtureを再利用する。
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
const loadGame = fixtureLoader("tests/ProjectR_HermesSwordsmanship.test.cjs");
const BRIDGE_FILE = "js/plugins/ProjectR_UltimateGodDamageBridge.js";
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack";
const mgr = g => g.ProjectRGodSummonManager;
const bridge = g => g.ProjectRUltimateGodDamageBridge;
const deck = g => g.ProjectRCardDeck;
const persistent = g => mgr(g).getPersistentUltimateSummon();
const transients = g => mgr(g).getActiveSummons();
const tickMap = (g, n = 1) => { for (let i = 0; i < n; i++) { g.Graphics.frameCount++; g.$gameMap.update(true); } };
const battleTime = (g, frames = 1) => {
    const scene = g.mapScene || (g.mapScene = g.SceneManager._scene);
    for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; scene.update(); }
};
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message || ""} ${actual} != ${expected}`);
function reloadManager(g, parameters) {
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_GodSummonManager" ? parameters : params(name);
    vm.runInContext(read("js/plugins/ProjectR_GodSummonManager.js"), g);
}
// 戦闘開始前にBridgeを読み込む（本番は常にManagerの後ろ）。
function ready(god = "apollo", managerParameters = null) {
    const g = loadGame();
    if (managerParameters) reloadManager(g, managerParameters);
    vm.runInContext(read(BRIDGE_FILE), g);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    assert.equal(deck(g).startCardBattle().ok, true);
    return g;
}
// 既定offset -0.75の常駐神は (9.25, 9.25)。
const GOD = { x: 9.25, y: 9.25 };
const area = (g, attackId, extra = {}) => bridge(g).damagePersistentUltimateInArea({ attackId, x: GOD.x, y: GOD.y, radius: 1, amount: 20, ...extra });
const global = (g, attackId, amount = 20) => bridge(g).damagePersistentUltimateFromGlobalAttack({ attackId, amount });
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("常駐神が円内にいると、Divine HPが指定量だけ減る（結果にkind/damage/残HPが入る）", () => {
    const g = ready("apollo");
    const r = area(g, "meteor-1", { source: "boss:meteor" });
    assert.deepEqual(plain([r.ok, r.hit, r.kind, r.reason, r.attackId, r.damage, r.collapsed, r.status, r.divineHp, r.maxDivineHp, r.distance]),
        [true, true, "area", "hit", "meteor-1", 20, false, "active", 80, 100, 0]);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80);
    assert.equal(mgr(g).hasPersistentUltimateSummon(), true); assert.equal(mgr(g).isPersistentUltimateAvailable(), true);
});
test("円外ではダメージなし・攻撃IDも記憶しない（後で範囲内になれば同じ攻撃で当たる）", () => {
    const g = ready("hermes");
    const r = area(g, "wide-1", { x: 20, y: 20, radius: 2 });
    assert.deepEqual(plain([r.ok, r.hit, r.reason, r.damage]), [false, false, "outsideArea", 0]);
    near(r.distance, Math.hypot(20 - GOD.x, 20 - GOD.y));
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100); assert.equal(bridge(g).getRegisteredAttackCount(), 0);
    assert.equal(area(g, "wide-1").ok, true); // 同じ攻撃IDでも、未命中だったので範囲内なら当たる
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80);
});
test("円の境界は含む: 距離=半径はhit、わずかに内側の半径はmiss。斜めの3-4-5も境界でhit", () => {
    const g = ready("apollo");
    assert.equal(area(g, "b1", { x: GOD.x + 3, y: GOD.y, radius: 3 }).hit, true);
    assert.equal(area(g, "b2", { x: GOD.x + 3, y: GOD.y, radius: 2.99 }).reason, "outsideArea");
    assert.equal(area(g, "b3", { x: GOD.x + 3, y: GOD.y + 4, radius: 5 }).hit, true);
    assert.equal(area(g, "b4", { x: GOD.x, y: GOD.y, radius: 0 }).hit, true); // 半径0は同一点のみ
    assert.equal(area(g, "b5", { x: GOD.x + 0.5, y: GOD.y, radius: 0 }).reason, "outsideArea");
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 40);
});
test("Phase 3C-1の論理アンカー位置（Player+PersistentOffset）を使い、Player位置だけでは判定しない", () => {
    const g = ready("apollo");
    // Player(10,10)中心の半径0.5は、offset(-0.75,-0.75)の神(距離約1.06)には届かない。
    assert.equal(area(g, "p1", { x: 10, y: 10, radius: 0.5 }).reason, "outsideArea");
    assert.equal(area(g, "p2", { x: 10, y: 10, radius: 1.1 }).hit, true);
    // Playerが動けば神も追従し、判定もそれに従う。
    g.$gamePlayer._realX = 30; g.$gamePlayer._realY = 4; tickMap(g);
    assert.equal(area(g, "p3", { x: GOD.x, y: GOD.y, radius: 1 }).reason, "outsideArea");
    assert.equal(area(g, "p4", { x: 29.25, y: 3.25, radius: 0 }).hit, true);
    // 設定したoffsetも使われる。
    const h = ready("hermes", { PersistentOffsetX: "1.5", PersistentOffsetY: "-2" });
    assert.deepEqual(plain([persistent(h).x, persistent(h).y]), [11.5, 8]);
    assert.equal(bridge(h).damagePersistentUltimateInArea({ attackId: "o1", x: 11.5, y: 8, radius: 0, amount: 5 }).hit, true);
    assert.equal(bridge(h).damagePersistentUltimateInArea({ attackId: "o2", x: 9.25, y: 9.25, radius: 0.5, amount: 5 }).reason, "outsideArea");
});
test("ループマップでは$gameMap.deltaX/deltaYの差分で判定する", () => {
    const g = ready("apollo");
    g.$gameMap.deltaX = (a, b) => { let d = a - b; if (d > 10) d -= 20; if (d < -10) d += 20; return d; };
    g.$gamePlayer._realX = 0.75; g.$gamePlayer._realY = 9.75; tickMap(g); // 神は(0, 9)
    assert.equal(persistent(g).x, 0);
    assert.equal(bridge(g).damagePersistentUltimateInArea({ attackId: "l1", x: 19.5, y: 9, radius: 1, amount: 10 }).hit, true); // 生の差19.5でも実距離0.5
    g.$gameMap.deltaX = undefined; // deltaが無い環境では生の差
    assert.equal(bridge(g).damagePersistentUltimateInArea({ attackId: "l2", x: 19.5, y: 9, radius: 1, amount: 10 }).reason, "outsideArea");
});
test("Event中心の補助API: Eventの現在のreal座標を中心に同じ円判定へ渡す", () => {
    const g = ready("apollo");
    const near1 = g.addEnemy(301, GOD.x + 2, GOD.y), far = g.addEnemy(302, 25, 25);
    const hpBefore = near1.bar.currentHp;
    assert.equal(bridge(g).damagePersistentUltimateFromEventArea(302, 3, 20, "ev-far").reason, "outsideArea");
    const r = bridge(g).damagePersistentUltimateFromEventArea(301, 3, 20, "ev-near", "boss:301");
    assert.deepEqual(plain([r.ok, r.kind, r.damage, r.divineHp]), [true, "area", 20, 80]);
    assert.equal(bridge(g).damagePersistentUltimateFromEventArea(301, 3, 20, "ev-near").reason, "alreadyApplied");
    assert.equal(bridge(g).damagePersistentUltimateFromEventArea(999, 3, 20, "ev-none").reason, "eventNotFound");
    near1.event.locate(GOD.x + 5, GOD.y); // Eventが移動すれば新しい位置が中心
    assert.equal(bridge(g).damagePersistentUltimateFromEventArea(301, 3, 20, "ev-moved").reason, "outsideArea");
    assert.equal(near1.bar.currentHp, hpBefore); assert.equal(far.bar.currentHp, 200); // 敵のHPには触れない
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80);
});
test("全体攻撃: 距離判定なしでアクティブな常駐神にダメージ。明示的に呼んだときだけ", () => {
    const g = ready("hermes");
    area(g, "a-out", { x: 99, y: 99, radius: 1 });
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100); // 範囲攻撃は全体攻撃にならない
    const r = global(g, "quake-1", 35);
    assert.deepEqual(plain([r.ok, r.kind, r.reason, r.damage, r.divineHp, r.distance]), [true, "global", "hit", 35, 65, null]);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 65);
});
test("同じ攻撃IDは1回だけ（毎frame呼んでも減らない）。別IDは別々にダメージ", () => {
    const g = ready("apollo");
    for (let frame = 0; frame < 30; frame++) {
        const r = area(g, "meteor-42"); tickMap(g);
        assert.equal(r.ok, frame === 0); if (frame) assert.equal(r.reason, "alreadyApplied");
    }
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80);
    assert.equal(global(g, "meteor-42").reason, "alreadyApplied"); // 範囲/全体で同じIDも1回
    assert.equal(area(g, "meteor-43").ok, true); assert.equal(global(g, "meteor-44").ok, true);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 40);
    assert.equal(bridge(g).getRegisteredAttackCount(), 3);
    assert.deepEqual(plain([bridge(g).hasAttackHit("meteor-42"), bridge(g).hasAttackHit("meteor-99"), bridge(g).hasAttackHit(null)]), [true, false, false]);
});
test("攻撃ID再利用は決定的: 数値42と文字列'42'は同一、崩壊/復帰後でも同じIDは適用済み、createAttackIdは一意", () => {
    const g = ready("apollo");
    assert.equal(area(g, 42).ok, true); assert.equal(area(g, "42").reason, "alreadyApplied");
    assert.equal(global(g, 42).reason, "alreadyApplied");
    const ids = new Set(Array.from({ length: 50 }, () => bridge(g).createAttackId("meteor")));
    assert.equal(ids.size, 50); assert.ok([...ids].every(id => id.startsWith("meteor-")));
    assert.match(bridge(g).createAttackId(), /^attack-\d+$/);
    assert.equal(global(g, "big-1", 1000).collapsed, true);
    battleTime(g, 900); assert.equal(mgr(g).isPersistentUltimateAvailable(), true);
    assert.equal(global(g, "big-1", 10).reason, "alreadyApplied"); // 復帰後も同じIDは再ヒットしない
    assert.equal(global(g, "big-2", 10).ok, true);
});
test("不正な入力はHPも記憶も変えず安全に拒否（amount/attackId/area）。例外は投げない", () => {
    const g = ready("apollo");
    for (const bad of [0, -1, NaN, Infinity, "5", null, undefined, {}]) {
        const r1 = area(g, "inv", { amount: bad }), r2 = bridge(g).damagePersistentUltimateFromGlobalAttack({ attackId: "inv", amount: bad });
        assert.deepEqual(plain([r1.ok, r1.reason, r2.ok, r2.reason]), [false, "invalidDamage", false, "invalidDamage"], String(bad));
    }
    for (const bad of [null, undefined, "", {}, NaN, Infinity, [], true]) {
        assert.equal(area(g, bad).reason, "invalidAttackId", String(bad)); assert.equal(global(g, bad).reason, "invalidAttackId");
    }
    for (const extra of [{ radius: NaN }, { radius: -1 }, { radius: "1" }, { x: NaN }, { y: undefined }, { x: null }]) {
        assert.equal(area(g, "inv-area", extra).reason, "invalidArea", JSON.stringify(extra));
    }
    assert.equal(bridge(g).damagePersistentUltimateInArea().reason, "invalidArea");
    assert.equal(bridge(g).damagePersistentUltimateFromGlobalAttack(null).reason, "invalidAttackId");
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100); assert.equal(bridge(g).getRegisteredAttackCount(), 0);
    assert.equal(mgr(g).isPersistentUltimateAvailable(), true);
});
test("常駐Ultimateが無い（未選択/所持なし/戦闘外）なら安全にnoPersistentUltimate。攻撃側は継続できる", () => {
    const g = loadGame(); vm.runInContext(read(BRIDGE_FILE), g);
    assert.equal(area(g, "n0").reason, "noPersistentUltimate"); // 戦闘外
    assert.equal(deck(g).startCardBattle().ok, true);
    for (const r of [area(g, "n1"), global(g, "n2")]) assert.deepEqual(plain([r.ok, r.hit, r.reason, r.status, r.divineHp]), [false, false, "noPersistentUltimate", "none", 0]);
    deck(g).setUltimateRing("apollo"); // 戦闘中の選択変更は次の戦闘から
    assert.equal(global(g, "n3").reason, "noPersistentUltimate");
    deck(g).endCardBattle(); assert.equal(global(g, "n4").reason, "noPersistentUltimate");
    assert.equal(bridge(g).getRegisteredAttackCount(), 0); assert.equal(deck(g).getBattleState(), null);
    // 仲間所持の指輪を選択していた場合も（Coreが選択を無効化する）。
    const h = loadGame(); vm.runInContext(read(BRIDGE_FILE), h);
    deck(h).setUltimateRing("hermes"); h.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "actor:3";
    deck(h).startCardBattle(); assert.equal(global(h, "n5").reason, "noPersistentUltimate");
});
test("Manager欠如・内部例外でも例外を投げず結果を返す（ボス攻撃は継続できる）", () => {
    const g = ready("apollo"), original = mgr(g);
    g.ProjectRGodSummonManager = undefined;
    for (const r of [area(g, "m1"), global(g, "m2"), bridge(g).damagePersistentUltimateFromEventArea(1, 1, 5, "m3"), bridge(g).damagePersistentUltimateInArea({})]) {
        assert.equal(r.ok, false); assert.equal(r.reason, "managerUnavailable");
    }
    g.ProjectRGodSummonManager = { ...original, hasPersistentUltimateBattleState() { throw new Error("boom"); } };
    assert.equal(global(g, "m4").reason, "bridgeError");
    g.ProjectRGodSummonManager = original;
    assert.equal(global(g, "m5").ok, true);
});
test("範囲/全体のダメージでも既存の崩壊が起こる: 0固定・顕現消滅・15秒タイマー開始、戦闘は継続", () => {
    const g = ready("apollo"), m = mgr(g);
    assert.equal(global(g, "c1", 60).collapsed, false);
    const r = area(g, "c2", { amount: 9999 });
    assert.deepEqual(plain([r.ok, r.damage, r.collapsed, r.status, r.divineHp]), [true, 40, true, "collapsed", 0]);
    assert.deepEqual(plain([m.hasPersistentUltimateSummon(), m.isPersistentUltimateCollapsed(), m.isPersistentUltimateAvailable(), m.hasPersistentUltimateBattleState()]),
        [false, true, false, true]);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
    assert.equal(deck(g).isCardBattleActive(), true); assert.equal(deck(g).getUltimateRingId(), "apollo"); assert.equal(deck(g).hasPlayerRing("apollo"), true);
});
test("崩壊中のarea/global呼び出しは追加ダメージなし・再崩壊なし・復帰タイマーを再始動しない", () => {
    const g = ready("hermes"), m = mgr(g);
    global(g, "d1", 1000); battleTime(g, 60); near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14);
    for (let i = 0; i < 5; i++) {
        const r1 = area(g, `d-area-${i}`, { amount: 500 }), r2 = global(g, `d-global-${i}`, 500);
        assert.deepEqual(plain([r1.ok, r1.reason, r1.damage, r1.collapsed, r2.ok, r2.reason, r2.collapsed]), [false, "collapsed", 0, false, false, "collapsed", false]);
    }
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14);
    assert.equal(m.getPersistentUltimateDivineHp(), 0); assert.equal(bridge(g).getRegisteredAttackCount(), 1); // 崩壊中の呼び出しは記憶しない
    battleTime(g, 839); assert.equal(m.isPersistentUltimateCollapsed(), true);
    battleTime(g, 1); assert.equal(m.getPersistentUltimateStatus(), "active"); // 14秒+1秒=15秒で復帰（再始動されていない）
});
test("15秒で50%復帰し、復帰した神は新しい攻撃IDで再びダメージを受け、再崩壊→再復帰できる", () => {
    const g = ready("apollo"), m = mgr(g);
    global(g, "r1", 1000);
    battleTime(g, 900);
    assert.deepEqual(plain([m.getPersistentUltimateStatus(), m.getPersistentUltimateDivineHp(), m.hasPersistentUltimateSummon()]), ["active", 50, true]);
    assert.equal(area(g, "r1").reason, "alreadyApplied");
    const r = area(g, "r2", { amount: 20 });
    assert.deepEqual(plain([r.ok, r.divineHp]), [true, 30]);
    assert.equal(global(g, "r3", 30).collapsed, true);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
    battleTime(g, 900); assert.deepEqual(plain([m.getPersistentUltimateStatus(), m.getPersistentUltimateDivineHp()]), ["active", 50]);
    assert.equal(transients(g).length, 0);
});
test("一時召喚（カード発動）はDivine damageの対象にならず、Bridgeは一時召喚を変更しない", () => {
    const g = ready("apollo"); g.startWith(ARROW);
    assert.equal(g.fire().reason, "success");
    const before = plain(transients(g)); assert.equal(before.length, 1);
    // 一時召喚の位置（Player位置）を中心にしても、判定されるのは常駐神のアンカーだけ。
    const t = before[0];
    assert.equal(bridge(g).damagePersistentUltimateInArea({ attackId: "t1", x: t.x, y: t.y, radius: 0.5, amount: 50 }).reason, "outsideArea");
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100);
    assert.equal(global(g, "t2", 30).divineHp, 70);
    assert.deepEqual(plain(transients(g)), before); assert.equal(/hp|divine/i.test(Object.keys(transients(g)[0]).join(",")), false);
    // 崩壊中でも一時召喚は影響を受けない。
    global(g, "t3", 1000); assert.deepEqual(plain(transients(g)), before);
    tickMap(g, 12); assert.equal(transients(g).length, 0);
});
test("崩壊中でも通常カード（Golden Arrow/剣術）は従来どおり使える。Bridge呼び出しはカードに影響しない", () => {
    const g = ready("apollo"); g.startWith(ARROW);
    global(g, "k1", 1000); assert.equal(mgr(g).isPersistentUltimateCollapsed(), true);
    area(g, "k2"); global(g, "k3");
    const hand = plain(deck(g).getBattleState());
    assert.equal(g.fire().reason, "success"); assert.equal(transients(g)[0].godId, "apollo");
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.notDeepEqual(plain(deck(g).getBattleState()), hand); // カードは通常どおり消費・補充される
    const h = ready("hermes"); h.startWith(SWORD); global(h, "k4", 1000);
    const enemy = h.addEnemy(101, 0, 0); h.aim(90); assert.equal(h.fire().ok, true);
    const swing = h.swing(); enemy.event.locate(swing._realX, swing._realY + 0.5); tickMap(h, 3);
    assert.equal(enemy.bar.currentHp, 120);
});
test("神は標的候補にならない: Event/Command/Spawnを作らず、<enemy>等のtag・Action Engineの標的検索を使わない", () => {
    const g = ready("apollo"), events = g.$gameMap.events().length;
    area(g, "x1"); global(g, "x2"); bridge(g).damagePersistentUltimateFromEventArea(1, 2, 5, "x3");
    assert.equal(g.$gameMap.events().length, events); assert.equal(g.commands.length, 0); assert.equal(g.spawns.length, 0);
    const source = read(BRIDGE_FILE).replace(/\/\*:[\s\S]*?\*\//, ""); // ヘルプコメントを除く
    assert.equal(/<enemy>|<friendly>|findTarget|checkRange|checkCollide|spawnEvent|registerCommand|\$gameParty|\$gameActors|Game_Event\b/.test(source), false);
    assert.equal(Object.keys(persistent(g)).some(k => /enemy|friendly|target|hp/i.test(k)), false);
});
test("命中記憶は戦闘終了で消える（次の戦闘では同じIDでも新規。HPは満タン）", () => {
    const g = ready("apollo"); area(g, "e1");
    assert.deepEqual(plain([bridge(g).getRegisteredAttackCount(), bridge(g).hasAttackHit("e1")]), [1, true]);
    deck(g).endCardBattle();
    assert.deepEqual(plain([bridge(g).getRegisteredAttackCount(), bridge(g).hasAttackHit("e1"), bridge(g).getLastResult()]), [0, false, null]);
    assert.equal(deck(g).startCardBattle().ok, true);
    assert.equal(area(g, "e1").ok, true); assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80);
    assert.equal(deck(g).startCardBattle().ok, true); // 戦闘の開始し直しでも消える
    assert.equal(bridge(g).getRegisteredAttackCount(), 0); assert.equal(area(g, "e1").ok, true);
});
test("命中記憶はマップ移動・onMapLoaded・ロードでも消え、ロード後に残らない", () => {
    for (const how of ["setup", "mapLoaded", "load"]) {
        const g = ready("apollo"); area(g, "z1"); global(g, "z2");
        assert.equal(bridge(g).getRegisteredAttackCount(), 2);
        if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        assert.deepEqual(plain([bridge(g).getRegisteredAttackCount(), bridge(g).hasAttackHit("z1"), bridge(g).getLastResult()]), [0, false, null], how);
        assert.equal(mgr(g).hasPersistentUltimateBattleState(), false, how);
        assert.equal(area(g, "z1").reason, "noPersistentUltimate", how);
    }
});
test("命中記憶・Divine HPはセーブされない。保存データ・セーブ処理は不変でUltimate選択は保持", () => {
    const g = ready("apollo");
    const before = JSON.stringify(deck(g).getPersistentData());
    area(g, "sv-attack-1"); global(g, "sv-attack-2", 1000);
    assert.equal(JSON.stringify(deck(g).getPersistentData()), before);
    const contents = g.DataManager.makeSaveContents();
    const serialized = JSON.stringify(contents);
    assert.equal(/sv-attack|bridge|divineHp|collapsed|recovery/i.test(serialized + before), false);
    assert.equal(Object.keys(g.$gameSystem).some(k => /bridge|attack|divine|summon/i.test(k)), false);
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]);
    g.DataManager.extractSaveContents(JSON.parse(serialized));
    assert.equal(deck(g).getUltimateRingId(), "apollo");
    assert.equal(bridge(g).getRegisteredAttackCount(), 0);
});
test("返却値・診断は読み取り専用コピー: 結果を書き換えても内部は変わらず、最後の結果と件数を確認できる", () => {
    const g = ready("apollo");
    const r = area(g, "ro-1"); r.divineHp = 1; r.hit = false;
    const last = bridge(g).getLastResult();
    assert.deepEqual(plain([last.attackId, last.hit, last.divineHp]), ["ro-1", true, 80]);
    last.hit = false; assert.equal(bridge(g).getLastResult().hit, true);
    assert.notEqual(bridge(g).getLastResult(), bridge(g).getLastResult());
    assert.equal(Object.keys(bridge(g)).some(k => /^hits$|registry/i.test(k)), false); // Set/Mapを公開しない
    assert.equal(bridge(g).getRegisteredAttackCount(), 1);
    bridge(g).clear(); assert.deepEqual(plain([bridge(g).getRegisteredAttackCount(), bridge(g).getLastResult()]), [0, null]);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 80); // clearはHPに触れない
    assert.equal(area(g, "ro-1").ok, true); // 命中履歴を消せば（debug用）同じIDでも再ヒット
});
test("Phase 3C-1/3C-2の公開APIと挙動は不変（Bridgeは追加のみ。Manager・Core・カードにBridgeへの依存なし）", () => {
    const g = ready("hermes"), m = mgr(g);
    for (const name of ["resolveGodId", "perform", "release", "clear", "getActiveSummons", "ensurePersistentUltimateSummon",
        "hasPersistentUltimateSummon", "getPersistentUltimateSummon", "getPersistentUltimateGodId", "getPersistentUltimateRingId",
        "getPersistentUltimateResult", "damagePersistentUltimate", "hasPersistentUltimateBattleState", "isPersistentUltimateCollapsed",
        "isPersistentUltimateAvailable", "getPersistentUltimateStatus", "getPersistentUltimateDivineHp", "getPersistentUltimateMaxDivineHp",
        "getPersistentUltimateDivineHpRate", "getPersistentUltimateRecoveryRemainingSeconds", "getPersistentUltimateBattleState"]) {
        assert.equal(typeof m[name], "function", name);
    }
    assert.deepEqual(plain(m.getPersistentUltimateBattleState()), { godId: "hermes", ringId: "hermes", status: "active", manifested: true,
        divineHp: 100, maxDivineHp: 100, divineHpRate: 1, recoveryRemainingSeconds: 0 });
    assert.equal(m.damagePersistentUltimate(10).divineHp, 90); // 直接APIは従来どおり攻撃ID保護なしで使える
    assert.equal(m.damagePersistentUltimate(10).divineHp, 80);
    for (const file of ["ProjectR_GodSummonManager", "ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack",
        "ProjectR_ApolloLyreCalm", "ProjectR_HermesSwordsmanship", "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesSwiftMovement"]) {
        assert.equal(/UltimateGodDamageBridge/.test(read(`js/plugins/${file}.js`)), false, file);
    }
});
test("plugins.js: Bridgeが1件登録され、Manager後・全カード前。既存Manager parameterは不変", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const index = name => c.$plugins.findIndex(p => p.name === name);
    const entries = c.$plugins.filter(p => p.name === "ProjectR_UltimateGodDamageBridge");
    assert.equal(entries.length, 1); assert.equal(entries[0].status, true); assert.deepEqual(plain(entries[0].parameters), {});
    assert.ok(index("ProjectR_UltimateGodDamageBridge") > index("ProjectR_GodSummonManager"));
    for (const card of ["ApolloGoldenArrow", "HermesSwordsmanship", "ApolloLyreCalm"]) assert.ok(index("ProjectR_UltimateGodDamageBridge") < index(`ProjectR_${card}`), card);
    assert.deepEqual(plain(c.$plugins[index("ProjectR_GodSummonManager")].parameters), { LifetimeFrames: "12", PersistentOffsetX: "-0.75",
        PersistentOffsetY: "-0.75", DefaultDivineMaxHp: "100", RecoveryDelaySeconds: "15", RecoveryHpRate: "0.5" });
    assert.equal(/@base ProjectR_GodSummonManager/.test(read(BRIDGE_FILE)), true);
});
console.log(`# ${passed} Phase 3C-3 tests passed`);
