"use strict";
// Phase 3C-2: 常駐Ultimate神のDivine HP / 崩壊 / 復帰。Golden Arrow/Swordsmanshipの実Action Engine fixtureを再利用する。
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
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack";
const mgr = g => g.ProjectRGodSummonManager;
const deck = g => g.ProjectRCardDeck;
const persistent = g => mgr(g).getPersistentUltimateSummon();
const transients = g => mgr(g).getActiveSummons();
const tickMap = (g, n = 1) => { for (let i = 0; i < n; i++) { g.Graphics.frameCount++; g.$gameMap.update(true); } };
// 戦闘時間: Scene_Map.update経由（Inputが操作可能な間だけdeck.updateCooldown(1/60)を呼ぶ）。
// Scene切替の停止確認では SceneManager._scene を差し替えても、元のScene_Mapの更新だけを呼び続ける。
const battleTime = (g, frames = 1) => {
    const scene = g.mapScene || (g.mapScene = g.SceneManager._scene);
    for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; scene.update(); }
};
const start = g => { const r = deck(g).startCardBattle(); assert.equal(r.ok, true); return r; };
const ready = (god = "apollo") => { const g = loadGame(); assert.equal(deck(g).setUltimateRing(god).ok, true); start(g); return g; };
const collapse = g => mgr(g).damagePersistentUltimate(1000);
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message || ""} ${actual} != ${expected}`);
// 配置済みManagerを別Plugin Parameterで再読込（Phase 3C-1と同じ方式。旧closureは参照されなくなる）。
function reloadWithParams(g, parameters) {
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_GodSummonManager" ? parameters : params(name);
    vm.runInContext(read("js/plugins/ProjectR_GodSummonManager.js"), g);
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("有効な常駐神は戦闘開始でDivine HP満タン（既定100/100）・active・タイマー0・顕現あり", () => {
    const g = ready("apollo"), m = mgr(g);
    assert.deepEqual(plain([m.hasPersistentUltimateBattleState(), m.getPersistentUltimateStatus(),
        m.getPersistentUltimateDivineHp(), m.getPersistentUltimateMaxDivineHp(), m.getPersistentUltimateDivineHpRate(),
        m.getPersistentUltimateRecoveryRemainingSeconds()]), [true, "active", 100, 100, 1, 0]);
    assert.equal(m.isPersistentUltimateCollapsed(), false);
    assert.equal(m.isPersistentUltimateAvailable(), true);
    assert.equal(m.hasPersistentUltimateSummon(), true);
    const state = m.getPersistentUltimateBattleState();
    assert.deepEqual(plain(state), { godId: "apollo", ringId: "apollo", status: "active", manifested: true,
        divineHp: 100, maxDivineHp: 100, divineHpRate: 1, recoveryRemainingSeconds: 0 });
});
test("無効な選択では戦闘状態なし。Divine HPの数値APIは0・statusはnone", () => {
    const g = loadGame(); start(g); const m = mgr(g);
    assert.deepEqual(plain([m.hasPersistentUltimateBattleState(), m.getPersistentUltimateStatus(), m.isPersistentUltimateAvailable(),
        m.isPersistentUltimateCollapsed(), m.getPersistentUltimateDivineHp(), m.getPersistentUltimateMaxDivineHp(),
        m.getPersistentUltimateDivineHpRate(), m.getPersistentUltimateRecoveryRemainingSeconds(), m.getPersistentUltimateBattleState()]),
        [false, "none", false, false, 0, 0, 0, 0, null]);
    const result = m.damagePersistentUltimate(10);
    assert.deepEqual(plain([result.ok, result.reason, result.damage]), [false, "noPersistentUltimate", 0]);
});
test("設定値: 最大HP・復帰秒数・復帰割合を変更でき、不正値は既定へ/範囲内へ丸める", () => {
    const g = loadGame(); reloadWithParams(g, { DefaultDivineMaxHp: "40", RecoveryDelaySeconds: "2", RecoveryHpRate: "0.25" });
    deck(g).setUltimateRing("hermes"); start(g);
    assert.equal(mgr(g).getPersistentUltimateMaxDivineHp(), 40); assert.equal(mgr(g).getPersistentUltimateDivineHp(), 40);
    collapse(g); near(mgr(g).getPersistentUltimateRecoveryRemainingSeconds(), 2);
    battleTime(g, 119); assert.equal(mgr(g).isPersistentUltimateCollapsed(), true);
    battleTime(g, 1); assert.equal(mgr(g).isPersistentUltimateCollapsed(), false);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 10);
    for (const [params, expected] of [
        [{ DefaultDivineMaxHp: "abc", RecoveryDelaySeconds: "-3", RecoveryHpRate: "x" }, [100, 15, 50]],
        [{ DefaultDivineMaxHp: "0", RecoveryDelaySeconds: "", RecoveryHpRate: "7" }, [100, 15, 100]],
        [{ DefaultDivineMaxHp: "-5", RecoveryDelaySeconds: "0", RecoveryHpRate: "-1" }, [100, 0, 1]]]) {
        const h = loadGame(); reloadWithParams(h, params); deck(h).setUltimateRing("apollo"); start(h);
        assert.equal(mgr(h).getPersistentUltimateMaxDivineHp(), expected[0], JSON.stringify(params));
        collapse(h); near(mgr(h).getPersistentUltimateRecoveryRemainingSeconds(), expected[1]);
        battleTime(h, 1000); assert.equal(mgr(h).getPersistentUltimateStatus(), "active");
        assert.equal(mgr(h).getPersistentUltimateDivineHp(), expected[2], JSON.stringify(params)); // 割合0でもHPは0にならない
    }
});
test("ダメージでDivine HPが減り、結果に実ダメージ・残HP・状態が入る。sourceは任意の文字列メタ情報", () => {
    const g = ready("apollo"), m = mgr(g);
    const r = m.damagePersistentUltimate(30, "boss:test");
    assert.deepEqual(plain(r), { ok: true, damage: 30, requested: 30, collapsed: false, status: "active",
        divineHp: 70, maxDivineHp: 100, divineHpRate: 0.7, source: "boss:test" });
    assert.equal(m.getPersistentUltimateDivineHp(), 70); near(m.getPersistentUltimateDivineHpRate(), 0.7);
    assert.equal(m.damagePersistentUltimate(0.5).damage, 0.5); // 小数も可
    assert.equal(m.damagePersistentUltimate(10, { a: 1 }).source, null); // 文字列以外のsourceは保持しない
    assert.equal(m.isPersistentUltimateAvailable(), true); assert.equal(m.hasPersistentUltimateSummon(), true);
});
test("ダメージは0でクランプされ、超過分は実ダメージに含めない", () => {
    const g = ready("hermes"), m = mgr(g);
    const r = m.damagePersistentUltimate(250);
    assert.deepEqual(plain([r.ok, r.damage, r.requested, r.divineHp, r.collapsed, r.status]), [true, 100, 250, 0, true, "collapsed"]);
    assert.equal(m.getPersistentUltimateDivineHp(), 0);
});
test("不正なダメージ（NaN/Infinity/負/0/文字列/null等）は無視され、HPも状態も変わらない", () => {
    const g = ready("apollo"), m = mgr(g);
    for (const bad of [NaN, Infinity, -Infinity, -5, 0, "10", null, undefined, {}, [], true]) {
        const r = m.damagePersistentUltimate(bad);
        assert.deepEqual(plain([r.ok, r.reason, r.damage, r.collapsed]), [false, "invalidDamage", 0, false], String(bad));
    }
    assert.deepEqual(plain([m.getPersistentUltimateDivineHp(), m.getPersistentUltimateStatus()]), [100, "active"]);
    assert.equal(m.damagePersistentUltimate().ok, false);
});
test("HP0で崩壊: 顕現だけが消え、戦闘状態・神/指輪snapshotは残り、Ultimateは使用不可", () => {
    const g = ready("apollo"), m = mgr(g);
    const summonId = persistent(g).summonId;
    const r = collapse(g);
    assert.deepEqual(plain([r.ok, r.collapsed, r.status]), [true, true, "collapsed"]);
    assert.equal(m.hasPersistentUltimateSummon(), false); assert.equal(persistent(g), null);
    assert.equal(m.hasPersistentUltimateBattleState(), true);
    assert.equal(m.isPersistentUltimateCollapsed(), true); assert.equal(m.getPersistentUltimateStatus(), "collapsed");
    assert.equal(m.isPersistentUltimateAvailable(), false);
    assert.deepEqual(plain([m.getPersistentUltimateGodId(), m.getPersistentUltimateRingId()]), ["apollo", "apollo"]);
    const state = m.getPersistentUltimateBattleState();
    assert.deepEqual(plain([state.status, state.manifested, state.divineHp, state.maxDivineHp, state.recoveryRemainingSeconds]),
        ["collapsed", false, 0, 100, 15]);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
    assert.notEqual(summonId, undefined);
});
test("崩壊は戦闘終了ではない: カード戦闘・手札・所有・指輪・Ultimate選択・保存データは不変", () => {
    const g = ready("apollo");
    const hand = plain(deck(g).getBattleState()), data = JSON.stringify(deck(g).getPersistentData());
    collapse(g);
    assert.equal(deck(g).isCardBattleActive(), true);
    assert.deepEqual(plain(deck(g).getBattleState()), hand);
    assert.equal(JSON.stringify(deck(g).getPersistentData()), data);
    assert.equal(deck(g).getUltimateRingId(), "apollo"); assert.equal(deck(g).hasPlayerRing("apollo"), true);
    assert.equal(g.spawns.length, 0); assert.equal(g.commands.length, 0);
});
test("崩壊中の追加ダメージは拒否され、復帰タイマーもHPも崩壊状態も変わらない", () => {
    const g = ready("apollo"), m = mgr(g);
    collapse(g); battleTime(g, 60);
    const before = plain(m.getPersistentUltimateBattleState());
    for (const amount of [1, 100, 99999]) {
        const r = m.damagePersistentUltimate(amount);
        assert.deepEqual(plain([r.ok, r.reason, r.damage, r.collapsed, r.status, r.divineHp]), [false, "collapsed", 0, false, "collapsed", 0]);
    }
    assert.deepEqual(plain(m.getPersistentUltimateBattleState()), before);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14);
});
test("復帰: 14.98秒では戻らず、15秒でHP50%・顕現復活・available・タイマー0。顕現は1体", () => {
    const g = ready("apollo"), m = mgr(g);
    const first = persistent(g).summonId;
    collapse(g);
    battleTime(g, 899);
    assert.equal(m.isPersistentUltimateCollapsed(), true); assert.equal(m.hasPersistentUltimateSummon(), false);
    assert.equal(m.getPersistentUltimateDivineHp(), 0); assert.equal(m.isPersistentUltimateAvailable(), false);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 1 / 60);
    battleTime(g, 1);
    assert.equal(m.getPersistentUltimateStatus(), "active"); assert.equal(m.isPersistentUltimateCollapsed(), false);
    assert.equal(m.getPersistentUltimateDivineHp(), 50); near(m.getPersistentUltimateDivineHpRate(), 0.5);
    assert.equal(m.getPersistentUltimateRecoveryRemainingSeconds(), 0);
    assert.equal(m.hasPersistentUltimateSummon(), true); assert.equal(m.isPersistentUltimateAvailable(), true);
    const info = persistent(g);
    assert.deepEqual(plain([info.godId, info.ringId, info.kind]), ["apollo", "apollo", "persistentUltimate"]);
    assert.notEqual(info.summonId, first);
    assert.equal(transients(g).length, 0); // 復帰した顕現は常駐のみ。重複しない
    battleTime(g, 600); assert.equal(persistent(g).summonId, info.summonId); // 追加で再生成されない
    assert.equal(m.getPersistentUltimateDivineHp(), 50);
});
test("復帰した顕現はPlayer現在位置＋offsetに追従する", () => {
    const g = ready("hermes"); collapse(g);
    g.$gamePlayer._realX = 5; g.$gamePlayer._realY = 7;
    battleTime(g, 900);
    assert.deepEqual(plain([persistent(g).x, persistent(g).y]), [5 - 0.75, 7 - 0.75]);
    g.$gamePlayer._realX = 6; tickMap(g);
    assert.equal(persistent(g).x, 6 - 0.75);
});
test("復帰後のHP50からの再ダメージで再崩壊し、崩壊/復帰を何度でも繰り返せる（古いタイマーなし）", () => {
    const g = ready("apollo"), m = mgr(g), ids = [];
    for (let round = 0; round < 3; round++) {
        const r = round === 0 ? collapse(g) : m.damagePersistentUltimate(50); // 復帰後50 → ちょうど0
        assert.deepEqual(plain([r.ok, r.collapsed]), [true, true], `round ${round}`);
        assert.equal(m.hasPersistentUltimateSummon(), false);
        near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
        battleTime(g, 450); near(m.getPersistentUltimateRecoveryRemainingSeconds(), 7.5);
        battleTime(g, 450);
        assert.deepEqual(plain([m.getPersistentUltimateStatus(), m.getPersistentUltimateDivineHp()]), ["active", 50], `round ${round}`);
        ids.push(persistent(g).summonId);
    }
    assert.equal(new Set(ids).size, 3);
    // 部分ダメージ後の再ダメージ・クランプ。
    assert.equal(m.damagePersistentUltimate(20).divineHp, 30);
    assert.deepEqual(plain([m.damagePersistentUltimate(999).damage, m.getPersistentUltimateStatus()]), [30, "collapsed"]);
    battleTime(g, 900); assert.equal(m.getPersistentUltimateDivineHp(), 50);
});
test("復帰タイマーは既存と同じ停止条件で止まる（会話/メニュー/Scene切替/フォーカス喪失/イベント実行中）", () => {
    const g = ready("apollo"), m = mgr(g);
    collapse(g); battleTime(g, 60); near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14);
    g.$gameMessage.isBusy = () => true; battleTime(g, 1000);
    g.$gameMessage.isBusy = () => false;
    const scene = g.SceneManager._scene;
    g.SceneManager._scene = {}; battleTime(g, 1000); g.SceneManager._scene = scene; // メニュー等でScene_Mapでない
    scene.isBusy = () => true; battleTime(g, 1000); scene.isBusy = () => false;
    g.document.hasFocus = () => false; battleTime(g, 1000); g.document.hasFocus = () => true;
    const running = g.$gameMap.isEventRunning; g.$gameMap.isEventRunning = () => true; battleTime(g, 1000); g.$gameMap.isEventRunning = running;
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14); // 一切進まない
    assert.equal(m.isPersistentUltimateCollapsed(), true);
    battleTime(g, 839); assert.equal(m.isPersistentUltimateCollapsed(), true);
    battleTime(g, 1); assert.equal(m.isPersistentUltimateCollapsed(), false);
});
test("戦闘時間以外では進まない: 探索中のmap更新・戦闘外のupdateCooldownで復帰しない", () => {
    const g = ready("apollo"), m = mgr(g);
    collapse(g); tickMap(g, 3000); // Game_Map.updateだけ（戦闘時間ではない）
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15); assert.equal(m.isPersistentUltimateCollapsed(), true);
    deck(g).endCardBattle();
    deck(g).updateCooldown(100); battleTime(g, 1000); tickMap(g, 1000);
    assert.equal(m.hasPersistentUltimateBattleState(), false); assert.equal(m.hasPersistentUltimateSummon(), false);
    assert.equal(m.getPersistentUltimateStatus(), "none");
});
test("低水準のdeck.updateCooldown(秒)でも進む。不正な秒数（NaN/負/0）は無視", () => {
    const g = ready("apollo"), m = mgr(g); collapse(g);
    for (const bad of [NaN, -5, 0, Infinity, "3", undefined]) deck(g).updateCooldown(bad);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
    deck(g).updateCooldown(14.5); near(m.getPersistentUltimateRecoveryRemainingSeconds(), 0.5);
    assert.equal(m.isPersistentUltimateCollapsed(), true);
    deck(g).updateCooldown(0.5); assert.equal(m.getPersistentUltimateStatus(), "active");
});
test("カード戦闘終了/マップ移動/onMapLoaded/ロードで、崩壊中のHP・復帰タイマー・顕現が全て消える", () => {
    for (const how of ["end", "setup", "mapLoaded", "load"]) {
        const g = ready("apollo"), m = mgr(g); collapse(g); battleTime(g, 100);
        if (how === "end") deck(g).endCardBattle();
        else if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        assert.deepEqual(plain([m.hasPersistentUltimateBattleState(), m.hasPersistentUltimateSummon(), m.isPersistentUltimateCollapsed(),
            m.isPersistentUltimateAvailable(), m.getPersistentUltimateStatus(), m.getPersistentUltimateDivineHp(),
            m.getPersistentUltimateMaxDivineHp(), m.getPersistentUltimateRecoveryRemainingSeconds(), m.getPersistentUltimateGodId(),
            m.getPersistentUltimateBattleState()]), [false, false, false, false, "none", 0, 0, 0, null, null], how);
        if (how !== "end") assert.equal(deck(g).isCardBattleActive(), how === "setup" || how === "mapLoaded" ? true : false);
        deck(g).updateCooldown(100); battleTime(g, 1000); // 戦闘外（またはクリア済み）では復帰しない
        assert.equal(m.hasPersistentUltimateSummon(), false, how);
    }
});
test("通常のアクティブ状態でもクリアされ、次の戦闘は必ず満タンの新規状態", () => {
    const g = ready("apollo"), m = mgr(g);
    m.damagePersistentUltimate(40); assert.equal(m.getPersistentUltimateDivineHp(), 60);
    deck(g).endCardBattle(); assert.equal(m.hasPersistentUltimateBattleState(), false);
    start(g); assert.deepEqual(plain([m.getPersistentUltimateDivineHp(), m.getPersistentUltimateStatus()]), [100, "active"]);
    collapse(g); start(g); // 崩壊中に戦闘を開始し直す
    assert.deepEqual(plain([m.getPersistentUltimateDivineHp(), m.getPersistentUltimateStatus(), m.hasPersistentUltimateSummon()]), [100, "active", true]);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 0);
});
test("ensurePersistentUltimateSummonは崩壊中に再顕現せず、復帰を早めない", () => {
    const g = ready("apollo"), m = mgr(g); collapse(g);
    for (let i = 0; i < 3; i++) assert.equal(m.ensurePersistentUltimateSummon().ok, true);
    assert.equal(m.hasPersistentUltimateSummon(), false); assert.equal(m.isPersistentUltimateCollapsed(), true);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 15);
});
test("戦闘中にUltimate選択を変えても/外しても、崩壊・復帰は開始時のsnapshotのまま", () => {
    const g = ready("apollo"), m = mgr(g); collapse(g);
    deck(g).setUltimateRing("hermes"); battleTime(g, 300);
    deck(g).setUltimateRing(null); battleTime(g, 600);
    assert.equal(m.getPersistentUltimateStatus(), "active");
    assert.deepEqual(plain([persistent(g).godId, m.getPersistentUltimateGodId()]), ["apollo", "apollo"]);
    assert.equal(deck(g).getUltimateRingId(), null); // 選択変更はそのまま（Managerは書き換えない）
});
test("返却値は読み取り専用: 戦闘状態を書き換えてもHP・タイマー・状態は変わらない。変更はManager API経由のみ", () => {
    const g = ready("apollo"), m = mgr(g);
    const state = m.getPersistentUltimateBattleState();
    assert.equal(Object.isFrozen(state), true);
    assert.throws(() => { state.divineHp = 1; }); assert.throws(() => { state.status = "collapsed"; });
    assert.notEqual(m.getPersistentUltimateBattleState(), m.getPersistentUltimateBattleState());
    const result = m.damagePersistentUltimate(10); result.divineHp = 1; result.collapsed = true;
    assert.equal(m.getPersistentUltimateDivineHp(), 90);
    collapse(g); const collapsed = m.getPersistentUltimateBattleState(); assert.equal(collapsed.manifested, false);
    const summon = persistent(g); assert.equal(summon, null);
    battleTime(g, 900); const info = persistent(g); assert.throws(() => { info.godId = "hermes"; });
    assert.equal(m.getPersistentUltimateGodId(), "apollo");
    const resultCopy = m.getPersistentUltimateResult(); resultCopy.ok = false;
    assert.equal(m.getPersistentUltimateResult().ok, true);
});
test("Divine HPは一時召喚に存在せず、論理アンカーはHP/ダメージ受付を持たず、敵HP APIを流用しない", () => {
    const g = ready("apollo");
    g.startWith(ARROW); assert.equal(g.fire().reason, "success");
    const transient = transients(g)[0];
    assert.equal(/hp|divine|health/i.test(Object.keys(transient).join(",")), false);
    assert.equal(/hp|divine|health/i.test(Object.keys(persistent(g)).join(",")), false);
    collapse(g); battleTime(g, 900);
    assert.equal(g.$gameMap.events().filter(e => /summon|god|divine/i.test(JSON.stringify(e._data || {}))).length, 0);
    assert.equal(g.commands.filter(c => /Hp/i.test(c.name)).length, 0); // 敵HP APIを偽の実装として使っていない
});
test("崩壊中でも同じ神のカード（Golden Arrow）は発動でき、一時召喚が作られる。崩壊/復帰タイマーは影響されない", () => {
    const g = ready("apollo"), m = mgr(g); g.startWith(ARROW);
    collapse(g); battleTime(g, 30);
    near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14.5);
    const used = deck(g).getBattleState().hand.length;
    const r = g.fire();
    assert.equal(r.reason, "success"); assert.equal(r.ok, true);
    assert.equal(transients(g).length, 1); assert.equal(transients(g)[0].godId, "apollo"); assert.equal(transients(g)[0].kind, "transient");
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.equal(m.hasPersistentUltimateSummon(), false); assert.equal(m.isPersistentUltimateCollapsed(), true);
    battleTime(g, 12); assert.equal(transients(g).length, 0); // 一時召喚の寿命で消えても、常駐は復活/変化しない
    assert.equal(m.hasPersistentUltimateSummon(), false); near(m.getPersistentUltimateRecoveryRemainingSeconds(), 14.5 - 12 / 60);
    assert.ok(used >= 1);
});
test("崩壊中のHermes剣術も従来どおり（Skill 237のDamage）。一時Hermes召喚が作られ、復帰後も常駐は1体", () => {
    const g = ready("hermes"), m = mgr(g); g.startWith(SWORD);
    collapse(g); const enemy = g.addEnemy(101, 0, 0); g.aim(90);
    assert.equal(g.fire().ok, true);
    const swing = g.swing(); enemy.event.locate(swing._realX, swing._realY + 0.5); tickMap(g, 3);
    assert.equal(enemy.bar.currentHp, 120);
    assert.equal(m.isPersistentUltimateCollapsed(), true);
    battleTime(g, 900);
    assert.equal(m.getPersistentUltimateStatus(), "active"); assert.equal(m.hasPersistentUltimateSummon(), true);
    assert.equal(transients(g).length, 0);
});
test("常駐が顕現中のカード発動は従来どおり。一時召喚が常駐Divine HPを変えない", () => {
    const g = ready("apollo"), m = mgr(g); g.startWith(ARROW);
    const id = persistent(g).summonId; assert.equal(g.fire().reason, "success");
    assert.equal(persistent(g).summonId, id); assert.equal(m.getPersistentUltimateDivineHp(), 100);
    tickMap(g, 20); assert.equal(m.getPersistentUltimateDivineHp(), 100); assert.equal(m.isPersistentUltimateAvailable(), true);
});
test("他の5枚も、同じ神の常駐Ultimateが崩壊していても従来どおり一時召喚経由で動作する", () => {
    const loaders = {
        obscure: fixtureLoader("tests/ProjectR_HermesRecognitionObscure.test.cjs"),
        flute: fixtureLoader("tests/ProjectR_HermesReedFluteSleep.test.cjs"),
        swift: fixtureLoader("tests/ProjectR_HermesSwiftMovement.test.cjs"),
        disease: fixtureLoader("tests/ProjectR_ApolloDiseaseAttack.test.cjs"),
        lyre: fixtureLoader("tests/ProjectR_ApolloLyreCalm.test.cjs")
    };
    const CARDS = { obscure: ["hermes_perception_obscure", "hermes"], flute: ["hermes_reed_flute_sleep", "hermes"],
        swift: ["hermes_swift_movement", "hermes"], disease: ["apollo_plague_attack", "apollo"], lyre: ["apollo_lyre_calm", "apollo"] };
    const rigs = {
        obscure: g => ({ prepare() { g.start(); g.arrange(); }, fire: () => deck(g).requestUseCard(0), effect: () => g.obscured() }),
        flute: g => { const enemy = g.addEnemy(); return { prepare() { g.start(); g.arrange(0, CARDS.flute[0]); },
            fire: () => deck(g).requestUseCard(0), effect: () => g.sleeping(enemy) }; },
        swift: g => ({ prepare() { g.prepareSwift(); }, fire: () => g.fireSwift(), effect: () => g.position().join(",") }),
        disease: g => ({ prepare() { g.begin(); }, fire: () => deck(g).requestUseCard(0), effect: () => g.spawns.length }),
        lyre: g => ({ prepare() { g.start(); g.arrange(); }, fire: () => deck(g).requestUseCard(0), effect: () => g.calm() })
    };
    for (const key of Object.keys(CARDS)) {
        const g = loaders[key](); const rig = rigs[key](g); const initial = rig.effect();
        deck(g).setUltimateRing(CARDS[key][1]); rig.prepare();
        const m = mgr(g);
        assert.equal(m.getPersistentUltimateGodId(), CARDS[key][1], key);
        assert.equal(collapse(g).collapsed, true, key);
        const result = rig.fire();
        assert.equal(result.ok, true, `${key}: ${result.reason}`);
        assert.notEqual(rig.effect(), initial, key);
        assert.equal(transients(g).length, 1, key); assert.equal(transients(g)[0].godId, CARDS[key][1], key);
        assert.equal(m.isPersistentUltimateCollapsed(), true, key); assert.equal(m.hasPersistentUltimateSummon(), false, key);
        assert.equal(m.isPersistentUltimateAvailable(), false, key);
    }
});
test("通常カード7枚・Core・Inputは常駐Ultimate/Divine HP/崩壊を参照しない（崩壊チェックを足していない）", () => {
    const cards = ["ApolloGoldenArrow", "ApolloDiseaseAttack", "ApolloLyreCalm", "HermesSwordsmanship",
        "HermesRecognitionObscure", "HermesReedFluteSleep", "HermesSwiftMovement"];
    const pattern = /PersistentUltimate|Collapsed|DivineHp|damagePersistent/i;
    for (const name of cards) assert.equal(pattern.test(read(`js/plugins/ProjectR_${name}.js`)), false, name);
    assert.equal(pattern.test(read("js/plugins/ProjectR_CardDeckCore.js")), false);
    assert.equal(pattern.test(read("js/plugins/ProjectR_CardBattleInput.js")), false);
});
test("セーブ: Divine HP・最大HP・崩壊状態・復帰タイマー・顕現は保存されず、Ultimate選択だけが保持される", () => {
    const g = ready("apollo"); deck(g).setUltimateRing("apollo");
    const before = JSON.stringify(deck(g).getPersistentData());
    collapse(g); battleTime(g, 100);
    assert.equal(JSON.stringify(deck(g).getPersistentData()), before);
    assert.equal(/divine|collaps|recover|hp|summon|persistentUltimate/i.test(before), false);
    const contents = g.DataManager.makeSaveContents();
    assert.equal(Object.keys(contents).some(k => /summon|divine|collaps/i.test(k)), false);
    assert.equal(Object.keys(g.$gameSystem).some(k => /summon|divine|collaps/i.test(k)), false);
    const serialized = JSON.stringify(contents);
    assert.equal(/divineHp|maxDivineHp|recoveryRemaining|collapsed/i.test(serialized), false);
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]); // セーブ処理にhookしていない
    g.DataManager.extractSaveContents(JSON.parse(JSON.stringify({ system: contents.system, map: contents.map })));
    assert.equal(deck(g).getUltimateRingId(), "apollo");
    assert.equal(mgr(g).hasPersistentUltimateBattleState(), false); assert.equal(mgr(g).hasPersistentUltimateSummon(), false);
    start(g); assert.deepEqual(plain([mgr(g).getPersistentUltimateDivineHp(), mgr(g).getPersistentUltimateStatus()]), [100, "active"]);
});
test("Phase 3C-1互換: 戦闘開始失敗時の理由・offset・追従・一時召喚との分離・公開APIが維持される", () => {
    const g = loadGame(); start(g);
    assert.equal(mgr(g).getPersistentUltimateResult().reason, "noUltimateSelected");
    const h = ready("hermes");
    assert.deepEqual(plain([persistent(h).kind, persistent(h).persistent, persistent(h).owner, persistent(h).x, persistent(h).y]),
        ["persistentUltimate", true, "player", 10 - 0.75, 10 - 0.75]);
    assert.equal(transients(h).length, 0);
    for (const name of ["resolveGodId", "perform", "release", "clear", "getActiveSummons", "ensurePersistentUltimateSummon",
        "hasPersistentUltimateSummon", "getPersistentUltimateSummon", "getPersistentUltimateGodId", "getPersistentUltimateRingId",
        "getPersistentUltimateResult"]) assert.equal(typeof mgr(h)[name], "function", name);
    assert.equal(mgr(h).release(persistent(h).summonId), false);
    assert.equal(mgr(h).getPersistentUltimateResult().ok, true);
});
test("plugins.js: Managerに現在の既定値が明示され、Core/Input後・全カード前の登録順は不変", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const entries = c.$plugins.filter(p => p.name === "ProjectR_GodSummonManager");
    assert.equal(entries.length, 1); assert.equal(entries[0].status, true);
    assert.deepEqual(plain(entries[0].parameters), { LifetimeFrames: "12", PersistentOffsetX: "-0.75", PersistentOffsetY: "-0.75",
        DefaultDivineMaxHp: "100", RecoveryDelaySeconds: "15", RecoveryHpRate: "0.5" });
    const index = name => c.$plugins.findIndex(p => p.name === name);
    assert.ok(index("ProjectR_GodSummonManager") > index("ProjectR_CardBattleInput"));
    for (const card of ["ApolloGoldenArrow", "ApolloDiseaseAttack", "ApolloLyreCalm", "HermesSwordsmanship",
        "HermesRecognitionObscure", "HermesReedFluteSleep", "HermesSwiftMovement"]) {
        assert.ok(index("ProjectR_GodSummonManager") < index(`ProjectR_${card}`), card);
    }
});
console.log(`# ${passed} Phase 3C-2 tests passed`);
