"use strict";
// Phase 4D-2: Apollo本番Ultimate handler。Hermes剣術のfixture(実MZ Input・実Hendrix Action Engineの
// Collision/spawnEvent/UpdateEventHp・実Manager・実Gauge・実Activation・実CardBattleInput・Golden Arrow・Hermes剣術)に
// ProjectR_HermesUltimate.js と ProjectR_ApolloUltimate.js を本番と同じ順に読み込む。
const assert = require("node:assert/strict");
const cp = require("node:child_process");
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
const GAUGE_FILE = "js/plugins/ProjectR_UltimateGauge.js", ACT_FILE = "js/plugins/ProjectR_UltimateActivation.js";
const HERMES_FILE = "js/plugins/ProjectR_HermesUltimate.js", APOLLO_FILE = "js/plugins/ProjectR_ApolloUltimate.js";
const ARROW_CARD = "apollo_golden_arrow";
const TAG = "projectRApolloUltimate";
const mgr = g => g.ProjectRGodSummonManager, gauge = g => g.ProjectRUltimateGauge;
const deck = g => g.ProjectRCardDeck, act = g => g.ProjectRUltimateActivation;
const au = g => g.ProjectRApolloUltimate, hu = g => g.ProjectRHermesUltimate;

const productionConfig = {}; vm.runInNewContext(read("js/plugins.js"), productionConfig);
const keyboardParameters = productionConfig.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters;
const productionEntry = productionConfig.$plugins.find(p => p.name === "ProjectR_ApolloUltimate");
const skillsData = JSON.parse(read("data/Skills.json"));
const mapData = JSON.parse(read("data/Map002.json"));
const apolloSkill = skillsData.find(s => s?.note?.includes("<ProjectRUltimate: apollo_ultimate>"));
const DAMAGE = 37; // a.atk(50) * 0.9 - b.def(20) * 0.4

// 本番と同じ読み込み順(Manager → Gauge → Activation → Hermes Ultimate → Apollo Ultimate)。
function load(apolloParameters = {}, { withApollo = true, hermesParameters = {} } = {}) {
    const g = loadGame();
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_ApolloUltimate" ? apolloParameters
        : name === "ProjectR_HermesUltimate" ? hermesParameters
        : name === "ProjectR_UltimateActivation" || name === "ProjectR_UltimateGauge" ? {}
        : name === "Hendrix_Keyboard_Gamepad" ? keyboardParameters : params(name);
    vm.runInContext(read(GAUGE_FILE), g);
    for (let code = 65; code <= 90; code++) if (!g.Input.keyMapper[code]) g.Input.keyMapper[code] = String.fromCharCode(code).toLowerCase();
    vm.runInContext(read(ACT_FILE), g);
    // 登録されたhandlerを控える(同時実行の頑健性試験用。registryの内容そのものは変えない)。
    g.handlers = {};
    const register = g.ProjectRUltimateActivation.registerUltimateHandler;
    g.ProjectRUltimateActivation.registerUltimateHandler = (godId, handler) => { g.handlers[godId] = handler; return register(godId, handler); };
    g.saveFunctionsBefore = [g.DataManager.makeSaveContents, g.DataManager.extractSaveContents];
    g.reloadHermes = () => vm.runInContext(read(HERMES_FILE), g);
    g.reload = () => vm.runInContext(read(APOLLO_FILE), g);
    g.reloadHermes();
    if (withApollo) g.reload();
    g.scene = g.SceneManager._scene;
    return g;
}
function ready(god = "apollo", apolloParameters = {}) {
    const g = load(apolloParameters);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    g.startWith(ARROW_CARD);
    assert.equal(mgr(g).getPersistentUltimateGodId(), god);
    return g;
}
const fill = g => assert.equal(gauge(g).addUltimateGauge(1000, "test").full, true);
const collapse = g => assert.equal(mgr(g).damagePersistentUltimate(100000).collapsed, true);
const frames = (g, count = 1) => { for (let i = 0; i < count; i++) { g.Graphics.frameCount++; g.scene.update(); } };
const keyEvent = (g, letter) => ({ code: `Key${letter}`, keyCode: letter.charCodeAt(0), key: letter.toLowerCase(), repeat: false,
    target: g.document.activeElement, preventDefault() {} });
const pressU = g => { g.Input._onKeyDown(keyEvent(g, "U")); frames(g); g.Input._onKeyUp(keyEvent(g, "U")); };
const request = g => act(g).requestUltimateActivation("api");
function start(g, degree = 0) {
    fill(g); g.aim(degree);
    const result = request(g);
    assert.equal(result.ok, true, JSON.stringify(result));
    return result;
}
const state = g => plain(au(g).getApolloUltimateState());
const arrows = g => plain(au(g).getActiveProjectiles());
const arrowEvents = g => g.$gameMap.events().filter(e => e.event().note.includes(`<${TAG}>`));
const hpCommands = g => g.commands.filter(c => c.name === "UpdateEventHp");
const destroyCommands = g => g.commands.filter(c => c.name === "DestroyEvent");
const ultimateSpawns = g => plain(g.spawns.filter(s => s[0] === 5));
const near = (a, b) => Math.abs(a - b) < 1e-8;
function enemy(g, id, x, y, hp = 1000) {
    const e = g.addEnemy(id, x, y); e.bar.currentHp = e.bar.targetHp = hp; return e;
}
// プレイヤーの位置(矢の発射位置)に重ねる。矢は同じ点から出るので、重なっている間は全ての矢と重なる。
const atPlayer = (g, id, hp, dy = 0.5) => enemy(g, id, g.$gamePlayer._realX, g.$gamePlayer._realY + dy, hp);
// 現在飛んでいる指定の矢に重ねる(Golden Arrow試験のcollideWithと同じ座標規約)。
const onArrow = (g, e, index = 0) => {
    const arrow = arrowEvents(g)[index];
    e.event.locate(arrow._realX, arrow._realY + 0.5);
};
// 発射frame(0=発動の瞬間)を記録する。
function launchFrames(g, total = 60) {
    const seen = [ultimateSpawns(g).length], at = [0];
    for (let i = 1; i <= total; i++) {
        frames(g);
        const count = ultimateSpawns(g).length;
        while (seen[seen.length - 1] < count) { seen.push(seen[seen.length - 1] + 1); at.push(i); }
    }
    return at;
}
const normalize = degree => ((degree % 360) + 360) % 360;

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// ================= 登録 =================
test("plugins.js: Activation/Gauge/Manager/Golden Arrow/Hermes Ultimateの後に1件だけ登録、名前とファイルが一致、既定parameter", () => {
    const names = productionConfig.$plugins.map(p => p.name), index = name => names.indexOf(name);
    assert.equal(productionConfig.$plugins.filter(p => p.name === "ProjectR_ApolloUltimate").length, 1);
    assert.equal(productionEntry.status, true);
    assert.deepEqual(plain(productionEntry.parameters), { ArrowCount: "7", ArrowIntervalSeconds: "0.10", SpreadStepDegrees: "10",
        ProjectileLifetimeFrames: "90", UltimateDamageGeneratesGauge: "false" });
    for (const before of ["ProjectR_UltimateActivation", "ProjectR_UltimateGauge", "ProjectR_GodSummonManager", "ProjectR_CardDeckCore",
        "ProjectR_CardBattleInput", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_HermesUltimate"]) {
        assert.ok(index("ProjectR_ApolloUltimate") > index(before), before);
    }
    assert.equal(new Set(names).size, names.length);
    for (const plugin of productionConfig.$plugins.filter(p => /^ProjectR_/.test(p.name))) {
        assert.equal(fs.existsSync(path.join(__dirname, `../js/plugins/${plugin.name}.js`)), true, plugin.name);
    }
    const header = read(APOLLO_FILE).slice(0, 3000);
    for (const dep of ["ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateActivation", "Hendrix_Action_Engine"]) {
        assert.match(header, new RegExp(`@base ${dep}`));
    }
    assert.match(header, /@param UltimateDamageGeneratesGauge[\s\S]*@default false/);
    for (const name of ["ArrowCount", "ArrowIntervalSeconds", "SpreadStepDegrees", "ProjectileLifetimeFrames"]) {
        assert.match(header, new RegExp(`@param ${name}`));
    }
});
test("Apolloのhandlerを、Managerが解決したgod IDで登録。Hermesの本番handlerも残り、他の神は未登録。別の対応表は作らない", () => {
    const g = load();
    const godId = mgr(g).resolveGodId("apollo");
    assert.equal(godId, "apollo");
    assert.deepEqual(plain(act(g).getRegisteredUltimateGods()), ["apollo", "hermes"]);
    assert.equal(act(g).hasUltimateHandler("apollo"), true); assert.equal(act(g).hasUltimateHandler("hermes"), true);
    for (const god of ["janus", "themis", "athena", "zeus"]) assert.equal(act(g).hasUltimateHandler(god), false, god);
    assert.deepEqual(plain(au(g).getRegistration()), { ok: true, reason: "registered", godId: "apollo", replaced: false });
    assert.deepEqual(plain(hu(g).getRegistration()), { ok: true, reason: "registered", godId: "hermes", replaced: false });
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/["']apollo["']/.test(code.replace(/resolveGodId\?\.\("apollo"\)/, "")), false); // god IDの直書き・独自対応表なし
    assert.equal(/registerUltimateHandler\(\s*["']/.test(code), false);
});
test("pluginを二重に初期化してもregistryは壊れず、最新のhandlerが1つだけ使われる。Hermesのhandlerは変わらない", () => {
    const g = ready(); const hermesHandler = g.handlers.hermes; g.reload(); g.reload();
    assert.deepEqual(plain(act(g).getRegisteredUltimateGods()), ["apollo", "hermes"]);
    assert.deepEqual(plain(au(g).getRegistration()), { ok: true, reason: "replaced", godId: "apollo", replaced: true });
    assert.equal(g.handlers.hermes, hermesHandler);
    start(g);
    assert.equal(arrows(g).length, 1); assert.equal(arrowEvents(g).length, 1);
    assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("handlerが無い神はnoUltimateHandlerのまま検証できる(Apollo handlerの除去・未登録の神)。ゲージは100のまま", () => {
    const g = ready(); fill(g); g.aim(0);
    assert.equal(act(g).unregisterUltimateHandler("apollo").removed, true);
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason, result.godId]), [false, "noUltimateHandler", "apollo"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(au(g).isApolloUltimateActive(), false);
    assert.equal(arrowEvents(g).length, 0);
    // 未登録の神(ring未実装)を選んだ場合も同じ
    const other = load(); assert.equal(act(other).hasUltimateHandler("janus"), false);
    assert.equal(act(other).unregisterUltimateHandler("janus").reason, "noUltimateHandler");
});
test("Activation不在のときは登録しない(例外なし)", () => {
    const g = load({}, { withApollo: false }); vm.runInContext("delete window.ProjectRUltimateActivation; delete globalThis.ProjectRUltimateActivation", g); g.reload();
    assert.equal(au(g).getRegistration().ok, false); assert.equal(au(g).getRegistration().reason, "activationUnavailable");
});

// ================= 発動 =================
test("Apollo + ゲージ100 + 顕現中: Uキーから本番handlerが開始し、成功後にだけゲージが100→0になる", () => {
    const g = ready(); fill(g); g.aim(0);
    let consumed = 0; const consume = gauge(g).consumeUltimateGauge;
    gauge(g).consumeUltimateGauge = function() { consumed++; assert.equal(au(g).isApolloUltimateActive(), true); return consume.apply(this, arguments); };
    assert.equal(gauge(g).getUltimateGauge(), 100);
    pressU(g);
    const result = act(g).getLastUltimateActivationResult();
    assert.deepEqual(plain([result.ok, result.reason, result.started, result.godId, result.consumed, result.gauge]),
        [true, "started", true, "apollo", 100, 0]);
    assert.equal(consumed, 1); // 消費はActivationが開始成功の後に1回だけ(startの時点でactive)
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(au(g).isApolloUltimateActive(), true);
    assert.equal(result.handlerResult.instanceId, state(g).instanceId);
    assert.equal(result.handlerResult.arrowCount, 7);
    assert.deepEqual(plain([mgr(g).getPersistentUltimateStatus(), mgr(g).getPersistentUltimateDivineHp()]), ["active", 100]);
});
test("このpluginはゲージを消費・加算・リセットしない(ソース上も)", () => {
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/consumeUltimateGauge|addUltimateGauge|recordDamageDealt|recordEventHpLoss|resetUltimate|clear\(\)/.test(code), false);
    assert.equal(/\.trackDamage/.test(code), true); // 加算は既存の共通処理を通すときだけ
});
test("開始の準備に失敗するとgaugeは100のまま、Ultimate状態も矢も残らない", () => {
    const failures = {
        skillMissing: g => { g.$dataSkills[234].note = ""; },
        skillNotDamage: g => { g.$dataSkills[234].damage.type = 0; },
        skillNameCollision: g => { g.$dataSkills[1].name = g.$dataSkills[234].name; },
        templateMissing: g => { g.$dataTemplateMap.events[5].name = "x"; },
        templateTagMissing: g => { g.$dataTemplateMap.events[5].note = "<dmg: アポロン奥義>\n<attacker: player>"; },
        templateWrongSkill: g => { g.$dataTemplateMap.events[5].note = g.$dataTemplateMap.events[5].note.replace("アポロン奥義", "黄金の弓矢"); },
        templateNotPlayerAttack: g => { g.$dataTemplateMap.events[5].note = g.$dataTemplateMap.events[5].note.replace("<attacker: player>", ""); },
        damageCommandMissing: g => { delete g.PluginManager._commands["Hendrix_Action_Engine:UpdateEventHp"]; },
        destroyCommandMissing: g => { delete g.PluginManager._commands["Hendrix_Action_Engine:DestroyEvent"]; },
        mapUnavailable: g => { g.SceneManager._scene._spriteset = null; },
        mouseOnPlayer: g => { g.TouchInput.x = g.$gamePlayer.screenX(); g.TouchInput.y = g.$gamePlayer.screenY(); },
        mouseNotFinite: g => { g.TouchInput.x = NaN; },
        playerPositionInvalid: g => { g.$gamePlayer._realX = NaN; },
        spawnReturnsNull: g => { g.$gameMap.spawnEvent = () => null; },
        spawnThrows: g => { g.$gameMap.spawnEvent = () => { throw Error("spawnBoom"); }; },
        spawnThrowsAfterRegistering: g => { const spawn = g.$gameMap.spawnEvent; g.$gameMap.spawnEvent = function() { spawn.apply(this, arguments); throw Error("late"); }; }
    };
    for (const [name, breakIt] of Object.entries(failures)) {
        const g = ready(); fill(g); g.aim(0); breakIt(g);
        const result = request(g);
        assert.deepEqual(plain([result.ok, result.reason, result.started, result.consumed]), [false, "ultimateStartFailed", false, 0], name);
        assert.equal(typeof result.handlerReason, "string", name);
        assert.equal(gauge(g).getUltimateGauge(), 100, name);
        assert.equal(au(g).isApolloUltimateActive(), false, name); assert.equal(au(g).getApolloUltimateState(), null, name);
        assert.equal(arrowEvents(g).length, 0, name); assert.equal(arrows(g).length, 0, name);
        assert.equal(hpCommands(g).length, 0, name);
    }
});
test("回転に失敗した1本目の矢は片付けられ、失敗後に正常な発動ができる", () => {
    const g = ready(); fill(g); g.aim(0);
    const rotate = g.Game_Character.prototype.rotateTo;
    g.Game_Character.prototype.rotateTo = function() { rotate.apply(this, arguments); this._rotation = NaN; };
    const result = request(g);
    assert.deepEqual(plain([result.reason, result.handlerReason]), ["ultimateStartFailed", "projectileRotationFailed"]);
    assert.equal(arrowEvents(g).length, 0); assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.equal([...g.$gameMap.tagToEvents.values()].some(list => list.some(e => e?.event?.().note.includes(TAG))), false);
    g.Game_Character.prototype.rotateTo = rotate;
    assert.equal(request(g).ok, true);
});
test("崩壊中のApolloは発動できない(handlerは呼ばれずゲージ100のまま)。復帰後は発動できる", () => {
    const g = ready(); fill(g); collapse(g);
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason]), [false, "persistentUltimateUnavailable"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(au(g).isApolloUltimateActive(), false);
    assert.equal(arrowEvents(g).length, 0);
    frames(g, 15 * 60 + 5);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active");
    g.aim(0); assert.equal(request(g).ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("別の神・常駐でない文脈ではApollo handlerは開始しない(wrongGod)", () => {
    const g = ready(); const handler = g.handlers.apollo;
    for (const context of [{ godId: "hermes", summon: { persistent: true } }, { godId: "apollo", summon: { persistent: false } },
        { godId: "apollo" }, null, undefined]) {
        assert.deepEqual(plain(handler(context)), { ok: false, reason: "wrongGod" });
    }
    assert.equal(au(g).isApolloUltimateActive(), false); assert.equal(arrowEvents(g).length, 0);
});
test("Hermesを選んだ戦闘ではHermes Ultimateが従来どおり開始し、Apollo handlerは動かない", () => {
    const g = ready("hermes"); fill(g); g.aim(0);
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason, result.godId, result.gauge]), [true, "started", "hermes", 0]);
    assert.equal(result.handlerResult.slashCount, 6);
    assert.equal(hu(g).isHermesUltimateActive(), true); assert.equal(au(g).isApolloUltimateActive(), false);
    assert.equal(arrowEvents(g).length, 0); assert.equal(ultimateSpawns(g).length, 0);
    frames(g, 60);
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "completed"); assert.equal(au(g).getApolloUltimateLastResult(), null);
});

// ================= 矢の連射 =================
test("矢は7本、順序は 基準 → +10 → -10 → +20 → -20 → +30 → -30(基準0度)。専用Prefab(ID5)・player位置・非恒久で生成", () => {
    const g = ready(); start(g, 0); frames(g, 200);
    const spawns = ultimateSpawns(g);
    assert.equal(spawns.length, 7);
    assert.deepEqual(spawns.map(s => normalize(s[4])), [0, 10, 350, 20, 340, 30, 330]);
    assert.deepEqual(spawns.map(s => s[0]), Array(7).fill(5));
    assert.deepEqual(spawns.map(s => s[3]), Array(7).fill(false)); // 非恒久
    assert.equal(g.spawns.length, 7); // Golden Arrowなど他のPrefabは生成していない
    assert.deepEqual(plain(au(g).getApolloUltimateLastResult()), { instanceId: 1, outcome: "completed", arrowCount: 7, launchedArrows: 7,
        failedArrows: 0, hitCount: 0, elapsedSeconds: au(g).getApolloUltimateLastResult().elapsedSeconds });
});
test("基準角は任意の方向(小数・360度近傍)に対して 基準+{0,+10,-10,+20,-20,+30,-30} を実数のまま使い、rotationも一致する", () => {
    for (const base of [0, 90, 180, 270, 23.75, 355, 5, 359.9, 123.456]) {
        const g = ready(); start(g, base);
        const expected = [0, 10, -10, 20, -20, 30, -30].map(offset => normalize(base + offset));
        assert.equal(state(g).arrowDegrees.length, 7);
        state(g).arrowDegrees.forEach((degree, i) => assert.ok(near(degree, expected[i]), `${base}:${i}:${degree}`));
        assert.ok(near(state(g).baseDegree, normalize(base)), String(base));
        frames(g, 40);
        const spawns = ultimateSpawns(g);
        spawns.forEach((s, i) => assert.ok(Math.abs(normalize(s[4]) - expected[i]) < 1e-6, `${base}:${i}`));
        for (const [i, event] of arrowEvents(g).entries()) {
            assert.ok(Math.abs(event._rotation - expected[arrows(g)[i].arrowIndex]) < 1e-6 ||
                Math.abs(normalize(event._rotation) - expected[arrows(g)[i].arrowIndex]) < 1e-6, `${base}:rot`);
        }
    }
});
test("基準角は発動時に1度だけ固定され、発射中のマウス移動は残りの矢の向きを変えない(各矢は発射時の角度のまま)", () => {
    const g = ready(); start(g, 90);
    frames(g, 3); g.aim(270); frames(g, 6); g.aim(0); frames(g, 8); g.TouchInput.x = 0; g.TouchInput.y = 0; frames(g, 30);
    assert.deepEqual(ultimateSpawns(g).map(s => normalize(s[4])), [90, 100, 80, 110, 70, 120, 60]);
    const beforeRotations = arrows(g).map(a => [a.arrowIndex, a.rotation]);
    g.aim(180); frames(g, 10);
    assert.deepEqual(arrows(g).map(a => [a.arrowIndex, a.rotation]), beforeRotations); // 飛行中も向きは固定
    for (const a of arrows(g)) assert.ok(near(normalize(a.rotation), a.degree));
});
test("発射間隔は約0.10秒(6有効frame)。0/6/12/…/36フレームで7本、最後の矢まで約0.6秒。以後は増えない", () => {
    const g = ready(); start(g, 0);
    assert.deepEqual(launchFrames(g, 90), [0, 6, 12, 18, 24, 30, 36]);
    assert.equal(ultimateSpawns(g).length, 7);
    assert.equal(state(g).launching, false); assert.equal(state(g).launchedArrows, 7);
    assert.ok(Math.abs(state(g).elapsedSeconds - 91 / 60) < 1e-6 || state(g).elapsedSeconds > 0.6);
});
test("矢が命中しなくても寿命(90有効frame)で消え、最後の矢の発射から91frame後に完了。矢は残らない", () => {
    const g = ready(); start(g, 0); frames(g, 36);
    assert.equal(ultimateSpawns(g).length, 7); assert.equal(au(g).getActiveProjectileCount(), 7); // 外れ続けるので7本とも飛行中
    frames(g, 89); // 最後の矢の寿命内
    assert.equal(au(g).isApolloUltimateActive(), true);
    assert.ok(au(g).getActiveProjectileCount() >= 1);
    frames(g, 5);
    assert.equal(au(g).isApolloUltimateActive(), false); assert.equal(au(g).getActiveProjectileCount(), 0);
    assert.equal(arrowEvents(g).length, 0);
    assert.equal(destroyCommands(g).length, 7); // 7本とも公式DestroyEventで破棄
    const result = au(g).getApolloUltimateLastResult();
    assert.deepEqual(plain([result.outcome, result.launchedArrows, result.hitCount]), ["completed", 7, 0]);
    assert.equal(hpCommands(g).length, 0);
    assert.equal(gauge(g).getUltimateGauge(), 0); // 外れても返金なし
});
test("Plugin Parameter: 本数・間隔・扇の角度・寿命を変更できる。不正値は既定値に戻る", () => {
    const custom = ready("apollo", { ArrowCount: "3", ArrowIntervalSeconds: "0.2", SpreadStepDegrees: "15", ProjectileLifetimeFrames: "30" });
    assert.deepEqual(plain(au(custom).getConfig()), { arrowCount: 3, intervalSeconds: 0.2, spreadStepDegrees: 15, lifetimeFrames: 30, damageGeneratesGauge: false });
    start(custom, 0); assert.deepEqual(launchFrames(custom, 60), [0, 12, 24]);
    assert.deepEqual(ultimateSpawns(custom).map(s => normalize(s[4])), [0, 15, 345]);
    frames(custom, 80); assert.equal(au(custom).isApolloUltimateActive(), false);
    const defaults = plain(au(load()).getConfig());
    assert.deepEqual(defaults, { arrowCount: 7, intervalSeconds: 0.1, spreadStepDegrees: 10, lifetimeFrames: 90, damageGeneratesGauge: false });
    for (const bad of [{ ArrowCount: "0" }, { ArrowCount: "99" }, { ArrowCount: "abc" }, { ArrowCount: "" }, { ArrowIntervalSeconds: "-1" },
        { ArrowIntervalSeconds: "0" }, { SpreadStepDegrees: "-5" }, { SpreadStepDegrees: "200" }, { ProjectileLifetimeFrames: "0" }, { UltimateDamageGeneratesGauge: "maybe" }]) {
        assert.deepEqual(plain(au(load(bad)).getConfig()), defaults, JSON.stringify(bad));
    }
    assert.equal(au(load({ ArrowCount: "12.9" })).getConfig().arrowCount, 12);
    assert.equal(au(load({ UltimateDamageGeneratesGauge: "true" })).getConfig().damageGeneratesGauge, true);
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/setTimeout|setInterval|requestAnimationFrame/.test(code), false);
});
test("発射位置: 各矢を生成する瞬間のプレイヤー位置(Golden Arrowと同じ原点)。常駐Apolloの論理アンカーは使わず、プレイヤーも動かさない", () => {
    const g = ready(); const anchor = plain(mgr(g).getPersistentUltimateSummon());
    assert.ok(anchor.offsetX !== 0 && anchor.offsetY !== 0); // アンカーはプレイヤーからずれた派生位置
    start(g, 0); const player = g.$gamePlayer;
    frames(g, 5); player._realX = 12; player._realY = 8; // 矢の間でプレイヤーが移動
    frames(g, 40);
    const spawns = ultimateSpawns(g);
    assert.deepEqual(spawns.slice(0, 1).map(s => [s[1], s[2]]), [[10, 10]]);
    assert.deepEqual(spawns.slice(1).map(s => [s[1], s[2]]), Array(6).fill([12, 8]));
    for (const s of spawns) { assert.notDeepEqual([s[1], s[2]], [anchor.x, anchor.y]); }
    assert.deepEqual([player._realX, player._realY], [12, 8]); // プレイヤーを移動させない
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/offsetX|offsetY|getPersistentUltimateSummon|context\.summon\.[xy]\b/.test(code), false);
    assert.match(read(APOLLO_FILE).slice(0, 4500), /発射位置/);
});

// ================= 矢の性質 =================
test("矢は直進のみ: PrefabはmoveToPosition('forward')+90フレーム寿命、発射後に位置・向きを書き換えず追尾しない", () => {
    const template = mapData.events[5], golden = mapData.events[3];
    assert.equal(template.id, 5); assert.equal(template.name, "ProjectR Apollo Ultimate Arrow");
    const page = template.pages[0];
    assert.equal(page.moveRoute.list[0].parameters[0], "moveToPosition('forward')");
    assert.deepEqual(page.list[0], { code: 230, indent: 0, parameters: [90] });
    assert.equal(page.through, true); assert.equal(page.moveType, 3);
    assert.deepEqual(page, golden.pages[0]); // 見た目・移動・寿命はGolden Arrowと完全に同じ
    assert.equal(template.note, `<projectRApolloUltimate>\n<dmg: ${apolloSkill.name}>\n<attacker: player>\n<hitbox: 0.3, 0.3>`);
    const g = ready(); start(g, 30); frames(g, 40);
    const decoy = enemy(g, 101, 30, 30, 1000); // 遠くの敵: 追尾しない
    const snapshot = arrows(g).map(a => ({ id: a.eventId, x: a.x, y: a.y, r: a.rotation }));
    g.aim(200); frames(g, 10);
    for (const before of snapshot) {
        const after = arrows(g).find(a => a.eventId === before.id);
        if (after) assert.deepEqual([after.x, after.y, after.rotation], [before.x, before.y, before.r]);
    }
    for (const event of arrowEvents(g)) {
        const id = event.eventId(), degree = event._rotation;
        g.movements.length = 0;
        event.processMoveCommand(template.pages[0].moveRoute.list[0]);
        assert.deepEqual(plain(g.movements), [[id, degree]]); // 自分の向きへ直進する移動だけ
    }
    assert.equal(decoy.bar.currentHp, 1000);
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/dotMoveByDeg|moveToPosition|moveTo|setPosition|locate\(|\.rotateTo\(.*enemy|homing|follow/i.test(code.replace(/event\.rotateTo\(degree\)/, "")), false);
});
test("命中前はダメージなし。命中時だけ専用Skill(ID234)の公式Damage計算→HP変更→その1本のみ破棄。攻撃者はplayer属性の矢", () => {
    const g = ready(); const target = enemy(g, 101, 30, 30, 200); start(g, 0); frames(g, 2);
    assert.equal(target.bar.currentHp, 200); assert.equal(hpCommands(g).length, 0);
    onArrow(g, target); frames(g);
    assert.equal(target.bar.currentHp, 200 - DAMAGE);
    const damage = hpCommands(g);
    assert.equal(damage.length, 1); assert.equal(damage[0].args.eventId, "101"); assert.equal(damage[0].args.value, "-damage");
    assert.equal(destroyCommands(g).length, 1); assert.equal(g.commands.at(-1).name, "DestroyEvent");
    assert.equal(damage[0].eventId, destroyCommands(g)[0].eventId); // 命中した矢が攻撃元で、同じ矢が破棄される
    assert.equal(au(g).getActiveProjectileCount(), 0);
    assert.equal(g.$gameMap.event(damage[0].eventId), null);
    assert.ok(/<attacker: player>/.test(mapData.events[5].note)); // player互換の攻撃者
    assert.equal(state(g).hitCount, 1);
});
test("DamageはDatabase Skillの式/属性変更に追従し、Golden Arrow(236)・他のSkillとは独立", () => {
    const run = edit => {
        const g = ready(); const target = enemy(g, 101, 30, 30, 1000); edit(g);
        start(g, 0); frames(g, 2); onArrow(g, target); frames(g);
        return 1000 - target.bar.currentHp;
    };
    assert.equal(run(() => {}), DAMAGE);
    assert.equal(run(g => { g.$dataSkills[234].damage.formula = "a.atk * 3 - b.def"; }), 130);
    assert.equal(run(g => { g.$dataSkills[236].damage.formula = "999"; }), DAMAGE); // Golden Arrowの式変更はUltimateに影響しない
    assert.equal(run(g => { g.$dataSkills[235].damage.formula = "999"; }), DAMAGE); // Hermes Ultimateとも独立
    const golden = ready(); const t = enemy(golden, 101, 30, 30, 1000); start(golden, 0);
    golden.fire(); // 通常のGolden Arrowも同時に撃てる(80ダメージ)
    const arrowId = golden.ProjectRApolloGoldenArrow.getActiveProjectiles()[0].eventId, arrow = golden.$gameMap.event(arrowId);
    t.event.locate(arrow._realX, arrow._realY + 0.5); frames(golden);
    const hits = hpCommands(golden);
    assert.ok(hits.some(c => c.eventId === arrowId)); const others = hits.filter(c => c.eventId !== arrowId).length; // 同じ位置にあるUltimateの矢の命中
    assert.equal(1000 - t.bar.currentHp, 80 + DAMAGE * others); // Golden Arrowは従来どおり80、Ultimateの矢は別に37ずつ
});
test("1本の矢は最大1回だけダメージ。命中した矢は消え、同じ矢が同じ敵・別の敵に再び当たらない(貫通なし)", () => {
    const g = ready(); const a = atPlayer(g, 101, 1000), b = atPlayer(g, 102, 1000);
    start(g, 0); frames(g, 60);
    const damage = hpCommands(g);
    assert.equal(damage.length, 7); // 7本 × 1回。敵が2体重なっていても1本は1体にだけ当たる
    assert.equal(new Set(damage.map(c => c.eventId)).size, 7); // 攻撃元の矢は全て別
    assert.equal(1000 - a.bar.currentHp + 1000 - b.bar.currentHp, 7 * DAMAGE);
    assert.equal(au(g).getApolloUltimateLastResult().hitCount, 7);
    assert.equal(arrowEvents(g).length, 0);
});
test("別々の矢は独立: 同じ敵(大きなボス)が弾幕で複数回被弾する", () => {
    const g = ready(); const boss = atPlayer(g, 101, 2000);
    start(g, 0); frames(g, 14); // 矢0〜2が出た時点
    assert.equal(hpCommands(g).length >= 1, true);
    frames(g, 50);
    const damage = hpCommands(g);
    assert.equal(damage.length, 7); assert.equal(new Set(damage.map(c => c.eventId)).size, 7);
    assert.equal(boss.bar.currentHp, 2000 - 7 * DAMAGE);
    assert.equal(hpCommands(g).every(c => c.args.eventId === "101"), true);
    // 重なった複数の矢は、同じframeに複数処理されても1本ずつ(1本が2回当たらない)
    const g2 = ready(); const boss2 = atPlayer(g2, 101, 2000); start(g2, 0); frames(g2, 12);
    const before = hpCommands(g2).length, alive = au(g2).getActiveProjectileCount();
    assert.deepEqual([before, alive], [2, 1], "矢0・1は命中して消え、12frame目に出た矢2だけが飛行中");
    assert.equal(boss2.bar.currentHp, 2000 - before * DAMAGE);
});
test("HPが0の敵や、途中で倒れた敵には追加ダメージを与えない。矢は敵を通過して飛び続ける", () => {
    const g = ready(); const dead = atPlayer(g, 101, 0), weak = atPlayer(g, 102, 50);
    start(g, 0); frames(g, 200);
    const toDead = hpCommands(g).filter(c => c.args.eventId === "101"), toWeak = hpCommands(g).filter(c => c.args.eventId === "102");
    assert.equal(toDead.length, 0); assert.equal(dead.bar.currentHp, 0);
    assert.equal(toWeak.length, 2); // 50 → 13 → 0(倒れた後は当たらない)
    assert.ok(weak.bar.currentHp <= 0);
    assert.equal(au(g).getApolloUltimateLastResult().launchedArrows, 7);
    assert.equal(arrowEvents(g).length, 0);
    // 倒れた後も残りの矢は消えずに飛び続ける(通過)
    const g2 = ready(); atPlayer(g2, 101, 30); start(g2, 0); frames(g2, 30);
    assert.equal(hpCommands(g2).length, 1); assert.ok(au(g2).getActiveProjectileCount() >= 3);
});
test("プレイヤーでも敵でもないEventには当たらず、他の弾(Golden Arrow・Disease)とも干渉しない", () => {
    const g = ready(); const target = enemy(g, 101, 30, 30, 1000);
    start(g, 0); frames(g, 2); g.fire(); // Golden Arrowも発射
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    const golden = g.$gameMap.event(g.ProjectRApolloGoldenArrow.getActiveProjectiles()[0].eventId);
    const ownBefore = arrowEvents(g).length;
    frames(g, 5);
    assert.equal(arrowEvents(g).length, ownBefore + 1); // Ultimateの矢はGolden Arrowの処理で消えず、発射も続く(2〜3frame目から6frame後に2本目)
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.ok(golden.event().note.includes("<projectRGoldenArrow>") && !golden.event().note.includes(TAG));
    assert.equal(hpCommands(g).length, 0); assert.equal(target.bar.currentHp, 1000);
});
test("Ultimateはステートを付与しない(病・Lyre)。Apollo病攻撃のState/Skillも変わらない", () => {
    const g = ready(); atPlayer(g, 101, 2000); start(g, 0); frames(g, 60);
    assert.deepEqual([...new Set(g.commands.map(c => c.name))].sort(), ["DestroyEvent", "UpdateEventHp"]);
    assert.equal(g.commands.some(c => /state|State/.test(c.name) || /state/i.test(JSON.stringify(c.args))), false);
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/addState|changeState|StateId|disease|plague|DoT/i.test(code), false);
    assert.equal(/explod|Explosion|AoE|pierce|homing/i.test(code), false);
    assert.equal(skillsData[238].name, "アポロン病攻撃"); assert.equal(skillsData[239].name, "病ダメージ");
    assert.equal(skillsData[236].damage.formula, "a.atk * 2 - b.def");
});
test("専用Database Skill(ID234 アポロン奥義)・式・分散なし。Hermes Ultimate(235)と他のSkillは不変", () => {
    const before = JSON.parse(cp.execFileSync("git", ["show", "e5502f3:data/Skills.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    assert.equal(skillsData.length, 240); assert.equal(skillsData.length, before.length);
    assert.equal(apolloSkill.id, 234);
    assert.deepEqual(plain(apolloSkill.damage), { critical: false, elementId: 0, formula: "a.atk * 0.9 - b.def * 0.4", type: 1, variance: 0 });
    assert.equal(apolloSkill.name, "アポロン奥義"); assert.equal(apolloSkill.note, "<ProjectRUltimate: apollo_ultimate>");
    assert.equal(before[234].name, ""); // 未使用の空きスロットだった
    skillsData.forEach((skill, i) => { if (i !== 234) assert.deepEqual(skill, before[i], `skill ${i}`); });
    assert.equal(skillsData.filter(s => s?.name === apolloSkill.name).length, 1);
    // Map002: 既存の4件(ID0〜4)は変更なし、ID5だけ追加
    const oldMap = JSON.parse(cp.execFileSync("git", ["show", "e5502f3:data/Map002.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    assert.equal(oldMap.events.length, 5); assert.equal(mapData.events.length, 6);
    oldMap.events.forEach((event, i) => assert.deepEqual(mapData.events[i], event, `event ${i}`));
    assert.deepEqual({ ...mapData, events: [] }, { ...oldMap, events: [] });
});

// ================= ゲージ =================
test("Ultimateのダメージは既定でUltimate Gaugeを増やさない(Phase 4Bの経路を呼ばない)", () => {
    const g = ready(); let tracked = 0, recorded = 0;
    const track = gauge(g).trackDamage; gauge(g).trackDamage = function() { tracked++; return track.apply(this, arguments); };
    const record = gauge(g).recordDamageDealt; gauge(g).recordDamageDealt = function() { recorded++; return record.apply(this, arguments); };
    atPlayer(g, 101, 2000); start(g, 0); frames(g, 60);
    assert.equal(hpCommands(g).length, 7);
    assert.deepEqual([tracked, recorded], [0, 0]);
    assert.equal(gauge(g).getUltimateGauge(), 0); assert.equal(gauge(g).getGainStats().totals.damage ?? 0, 0);
});
test("UltimateDamageGeneratesGauge=trueでは既存のPhase 4B経路(trackDamage)で実ダメージ分だけ加算し、gain IDは矢ごとに別、式は複製しない", () => {
    const g = ready("apollo", { UltimateDamageGeneratesGauge: "true" }); atPlayer(g, 101, 2000); start(g, 0); frames(g, 60);
    assert.equal(hpCommands(g).length, 7);
    const rate = gauge(g).getGainConfig().damageGainRate;
    assert.ok(near(gauge(g).getUltimateGauge(), 7 * DAMAGE * rate), String(gauge(g).getUltimateGauge()));
    for (let arrow = 0; arrow < 7; arrow++) {
        assert.equal(gauge(g).hasUltimateGaugeGainId(`damage:apolloUltimate:1:arrow:${arrow}:101`), true, `arrow ${arrow}`);
    }
    assert.equal(gauge(g).getUltimateGaugeGainCount(), 7); // gain IDの重複なし(7本=7加算)
    assert.equal(gauge(g).getGainStats().last.source, "damage:apollo_ultimate");
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/damageGainRate|damageGainPerHitCap|\*\s*0\.0025/.test(code), false);
    // 次の発動は別instanceなのでgain IDも別(前回のIDと衝突しない)
    fill(g); start(g, 0); frames(g, 60);
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:apolloUltimate:2:arrow:0:101"), true);
});
test("trueでも加算は実際に失ったHPだけ(オーバーキルは実HP分)。HP0の敵はゲージを与えない", () => {
    const g = ready("apollo", { UltimateDamageGeneratesGauge: "true" }); atPlayer(g, 101, 10); atPlayer(g, 102, 0);
    start(g, 0); frames(g, 60);
    assert.equal(hpCommands(g).filter(c => c.args.eventId === "102").length, 0);
    assert.ok(near(gauge(g).getUltimateGauge(), 10 * gauge(g).getGainConfig().damageGainRate), String(gauge(g).getUltimateGauge()));
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:apolloUltimate:1:arrow:0:102"), false);
});

// ================= 同時実行 =================
test("発動中の再要求は拒否され(ultimateEffectActive)、ゲージ・進行中の奥義は変わらない。終了後は再発動できる", () => {
    const g = ready(); start(g, 0);
    const first = state(g), shots = arrows(g);
    fill(g); // 外部からゲージを再充填
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason, result.started, result.handlerReason]), [false, "ultimateStartFailed", false, "ultimateEffectActive"]);
    assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.deepEqual(arrows(g), shots); assert.equal(state(g).instanceId, first.instanceId);
    pressU(g); // キー入力でも同じ
    assert.equal(act(g).getLastUltimateActivationResult().handlerReason, "ultimateEffectActive");
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(ultimateSpawns(g).length, 1);
    frames(g, 140); assert.equal(au(g).isApolloUltimateActive(), false);
    assert.equal(gauge(g).getUltimateGauge(), 100); // 拒否でも消費されていない
    g.aim(45); const again = request(g);
    assert.equal(again.ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(state(g).instanceId, first.instanceId + 1); // 実行ごとに一意なinstance ID
    assert.ok(near(state(g).baseDegree, 45));
    frames(g, 140); assert.equal(au(g).getApolloUltimateLastResult().instanceId, first.instanceId + 1);
    assert.equal(au(g).getApolloUltimateLastResult().launchedArrows, 7); // 2回目も7本(前回の状態は引き継がない)
});
test("通常カードは奥義中も使え、一時召喚と常駐Apolloは独立(常駐は1体のまま)。Golden Arrow単独は80ダメージで不変", () => {
    const g = ready(); const persistentBefore = plain(mgr(g).getPersistentUltimateSummon());
    assert.deepEqual(plain(mgr(g).getActiveSummons()), []);
    start(g, 0); // Ultimate自体は一時召喚を作らない
    assert.deepEqual(plain(mgr(g).getActiveSummons()), []);
    assert.deepEqual(plain(mgr(g).getPersistentUltimateSummon()), persistentBefore);
    frames(g, 2);
    const fired = g.fire(); assert.equal(fired.reason, "success"); // Golden Arrowカード
    assert.equal(mgr(g).getActiveSummons().length, 1); assert.equal(mgr(g).getActiveSummons()[0].kind, "transient");
    assert.equal(mgr(g).getActiveSummons()[0].godId, "apollo");
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.equal(au(g).isApolloUltimateActive(), true);
    assert.equal(plain(mgr(g).getPersistentUltimateSummon()).summonId, persistentBefore.summonId);
    // Golden Arrow単独の動作
    const single = ready(); const target = enemy(single, 101, 30, 30, 200); single.fire();
    const arrow = single.$gameMap.event(single.ProjectRApolloGoldenArrow.getActiveProjectiles()[0].eventId);
    target.event.locate(arrow._realX, arrow._realY + 0.5); frames(single);
    assert.equal(target.bar.currentHp, 120); assert.equal(au(single).isApolloUltimateActive(), false);
    assert.equal(single.commands.filter(c => c.name === "UpdateEventHp").length, 1);
});
test("Hermes UltimateとApollo Ultimateの状態は別々。同時に走っても互いの矢・Hitbox・命中記録を壊さない", () => {
    const g = ready(); atPlayer(g, 101, 5000);
    start(g, 0); frames(g, 3);
    // 1戦闘で選べる神は1つだが、実装は頑健であること: Hermes handlerを直接呼び、2つの奥義を並行させる
    const hermes = g.handlers.hermes({ godId: "hermes" });
    assert.deepEqual([hermes.ok, hermes.started], [true, true]);
    assert.equal(au(g).isApolloUltimateActive(), true); assert.equal(hu(g).isHermesUltimateActive(), true);
    assert.equal(g.handlers.hermes({ godId: "hermes" }).reason, "ultimateEffectActive"); // 各々が自分の二重発動だけを拒否
    assert.equal(g.handlers.apollo({ godId: "apollo", summon: { persistent: true } }).reason, "ultimateEffectActive");
    frames(g, 150);
    const apollo = au(g).getApolloUltimateLastResult(), hermesResult = hu(g).getHermesUltimateLastResult();
    assert.deepEqual(plain([apollo.outcome, apollo.launchedArrows, apollo.hitCount]), ["completed", 7, 7]);
    assert.deepEqual(plain([hermesResult.outcome, hermesResult.spawnedSlashes]), ["completed", 6]);
    const hits = hpCommands(g).length;
    assert.equal(hits, apollo.hitCount + hermesResult.hitCount); // 命中記録は共有されない
    assert.equal(arrowEvents(g).length, 0);
    assert.equal(g.$gameMap.events().some(e => e.event().note.includes("projectRHermesUltimate")), false);
    // Hermesの終了・中断はApolloの矢を消さない
    const h = ready(); start(h, 0); frames(h, 3); h.handlers.hermes({ godId: "hermes" }); hu(h).getHermesUltimateState();
    h.$gameMap.setup(2); // 両方中断される(マップ移動)
    assert.equal(au(h).isApolloUltimateActive(), false); assert.equal(hu(h).isHermesUltimateActive(), false);
});
test("メニュー/会話/フォーカス喪失/イベント停止中は次の矢を撃たず、再開すると続きから進む", () => {
    const pauses = {
        sceneInactive: [g => { g.scene.isActive = () => false; }, g => { g.scene.isActive = () => true; }],
        message: [g => { g.$gameMessage.isBusy = () => true; }, g => { g.$gameMessage.isBusy = () => false; }],
        eventRunning: [g => { g.$gameMap.isEventRunning = () => true; }, g => { g.$gameMap.isEventRunning = () => false; }],
        eventsPaused: [g => { g.$gameMap.eventsPaused = true; }, g => { g.$gameMap.eventsPaused = false; }],
        focusLost: [g => { g.document.hasFocus = () => false; }, g => { g.document.hasFocus = () => true; }]
    };
    for (const [name, [pause, resume]] of Object.entries(pauses)) {
        const g = ready(); start(g, 0); frames(g, 2);
        const before = state(g), spawnsBefore = ultimateSpawns(g).length; pause(g); frames(g, 120);
        assert.equal(state(g).elapsedSeconds, before.elapsedSeconds, name); // 発射の時間は進まない
        assert.equal(state(g).launchedArrows, before.launchedArrows, name);
        assert.equal(ultimateSpawns(g).length, spawnsBefore, name);
        resume(g); frames(g, 140);
        assert.equal(au(g).isApolloUltimateActive(), false, name); assert.equal(au(g).getApolloUltimateLastResult().launchedArrows, 7, name);
    }
    // Game_Map.update(sceneActive=false) でも進まない
    const g = ready(); start(g, 0); const before = state(g);
    for (let i = 0; i < 30; i++) g.$gameMap.update(false);
    assert.deepEqual(state(g), before);
    // 通常の探索中(戦闘外)には矢が出ない
    const idle = ready(); start(idle, 0); deck(idle).endCardBattle(); frames(idle, 120);
    assert.equal(ultimateSpawns(idle).length, 1);
});

// ================= 崩壊・返金なし =================
test("発動後にApolloが崩壊しても、始まった連射は最後まで続く(キャンセル・返金なし)。Divine HPの規則は変わらない", () => {
    const g = ready(); start(g, 0); const target = atPlayer(g, 101, 2000);
    frames(g, 4); collapse(g);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "collapsed");
    frames(g, 150);
    assert.equal(au(g).getApolloUltimateLastResult().outcome, "completed");
    assert.equal(au(g).getApolloUltimateLastResult().launchedArrows, 7);
    assert.equal(target.bar.currentHp, 2000 - 7 * DAMAGE);
    assert.equal(gauge(g).getUltimateGauge(), 0); // 返金なし
    assert.equal(mgr(g).getPersistentUltimateStatus(), "collapsed");
    assert.equal(/damagePersistentUltimate|isPersistentUltimate|hp\s*[+]=/.test(read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "")), false);
});

// ================= 後始末 =================
function assertClean(g, label) {
    assert.equal(au(g).isApolloUltimateActive(), false, label); assert.equal(au(g).getApolloUltimateState(), null, label);
    assert.deepEqual(arrows(g), [], label); assert.equal(au(g).getActiveProjectileCount(), 0, label);
    assert.equal(arrowEvents(g).length, 0, label);
    assert.equal([...g.$gameMap.tagToEvents.values()].some(list => list.some(e => e?.event?.().note.includes(TAG) && !e._erased)), false, label);
}
test("戦闘終了で奥義を中断し、この奥義の矢を片付ける。ゲージは返さず、以後の更新で復活しない", () => {
    const g = ready(); start(g, 0); enemy(g, 101, 30, 30, 1000); frames(g, 14);
    assert.ok(au(g).getActiveProjectileCount() >= 2); assert.equal(gauge(g).getUltimateGauge(), 0);
    deck(g).endCardBattle();
    assertClean(g, "endBattle");
    assert.equal(au(g).getApolloUltimateLastResult().outcome, "battleEnded");
    assert.equal(gauge(g).hasUltimateGaugeState(), false); // 戦闘終了で状態ごと消える(返金なし)
    const spawns = ultimateSpawns(g).length; frames(g, 120); assert.equal(ultimateSpawns(g).length, spawns); assertClean(g, "later");
    assert.equal(deck(g).startCardBattle().ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("戦闘がendCardBattleを通らず非アクティブになっても、次の更新で中断される", () => {
    const g = ready(); start(g, 0); frames(g, 8);
    g.ProjectRCardDeck.isCardBattleActive = () => false;
    frames(g); assertClean(g, "inactive");
    assert.equal(au(g).getApolloUltimateLastResult().outcome, "battleEnded");
});
test("マップ移動(setup)・Map入れ替え(ロード)・onMapLoadedで奥義を中断し矢を除去する。同じMapのonMapLoadedでは続く", () => {
    const g1 = ready(); start(g1, 0); frames(g1, 14);
    assert.ok(arrowEvents(g1).length >= 1); g1.$gameMap.setup(2);
    assertClean(g1, "setup"); assert.equal(au(g1).getApolloUltimateLastResult().outcome, "mapChanged");

    const g2 = ready(); start(g2, 0); frames(g2, 14);
    const oldMap = g2.$gameMap, oldEvents = oldMap.events();
    g2.$gameMap = new g2.Game_Map(); g2.SceneManager._scene.onMapLoaded(); // ロード後に別のMapオブジェクト
    assert.equal(au(g2).isApolloUltimateActive(), false); assert.equal(au(g2).getApolloUltimateLastResult().outcome, "mapChanged");
    assert.ok(oldEvents.length >= 1); assert.equal(oldMap.events().filter(e => e.event().note.includes(TAG)).length, 0); // 古いMapの矢も除去

    const g3 = ready(); start(g3, 0); frames(g3, 14);
    g3.$gameMap = new g3.Game_Map(); frames(g3); // onMapLoadedを経ずにMapが入れ替わった場合は次の更新で
    assert.equal(au(g3).isApolloUltimateActive(), false); assert.equal(au(g3).getApolloUltimateLastResult().outcome, "mapChanged");

    const g4 = ready(); start(g4, 0); frames(g4, 14);
    g4.SceneManager._scene.onMapLoaded();
    assert.equal(au(g4).isApolloUltimateActive(), true); assert.equal(arrowEvents(g4).length >= 1, true);
});
test("ロードで残った(追跡していない)Ultimateの矢だけを除去する。無関係なEventは消さない(Golden Arrow/Diseaseの残骸は各pluginの責務)", () => {
    const g = ready();
    const stray = g.$gameMap.spawnEvent(5, 14, 14, false, 90); // 追跡外のUltimateの矢(セーブ由来を想定)
    const bystander = enemy(g, 101, 20, 20, 100);
    assert.equal(arrowEvents(g).length, 1);
    g.SceneManager._scene.onMapLoaded();
    assert.equal(arrowEvents(g).length, 0); assert.equal(g.$gameMap.event(stray), null);
    assert.equal(g.$gameMap.event(101), bystander.event); assert.ok(bystander.event._erased !== true);
    assert.deepEqual(plain(destroyCommands(g).map(c => c.eventId)), [stray]); // DestroyEventはこの矢にだけ
    // 追跡中の奥義の矢は、onMapLoaded(同じMap)では消えない
    const h = ready(); start(h, 0); h.SceneManager._scene.onMapLoaded(); assert.equal(arrowEvents(h).length, 1);
    // ソースが触るのは自分のタグを持つEventだけ
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/projectRGoldenArrow|projectRDiseaseAttack/.test(code), false);
});
test("Ultimateの矢を片付けるとき、同じ戦闘中のGolden Arrow・Disease・通常の弾は消さない(完了/error)", () => {
    const g = ready(); start(g, 0); frames(g, 2); g.fire();
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    const goldenId = g.ProjectRApolloGoldenArrow.getActiveProjectiles()[0].eventId;
    vm.runInContext("const __orig = window.checkCollide; window.__boom = new Set(); window.checkCollide = function(id, t) { if (window.__boom.has(id)) throw Error('boom'); return __orig.apply(this, arguments); };", g);
    for (const a of arrows(g)) g.__boom.add(a.eventId);
    assert.doesNotThrow(() => frames(g, 2)); // 例外でもGame_Map.updateを壊さない
    assertClean(g, "error"); assert.equal(au(g).getApolloUltimateLastResult().outcome, "error");
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.ok(g.$gameMap.event(goldenId));
    // 通常完了でも同じ
    const h = ready(); start(h, 0); frames(h, 2); h.fire(); frames(h, 40);
    const hGolden = h.ProjectRApolloGoldenArrow.getActiveProjectiles()[0].eventId;
    frames(h, 100); assert.equal(au(h).isApolloUltimateActive(), false);
    assert.deepEqual(plain(h.ProjectRApolloGoldenArrow.getActiveProjectiles().map(a => a.eventId)), [hGolden]); // 完了後もGolden Arrowは残る
    assert.equal(destroyCommands(h).filter(c => c.eventId === hGolden).length, 0); // Ultimateの片付けがDestroyEventを送らない
});
test("後の矢の生成に失敗しても残りの矢は続き、奥義全体は止まらない", () => {
    const g = ready(); start(g, 0);
    const spawn = g.$gameMap.spawnEvent; let calls = 0;
    g.$gameMap.spawnEvent = function() { if (++calls === 2) throw Error("boom"); return spawn.apply(this, arguments); };
    frames(g, 150);
    const result = au(g).getApolloUltimateLastResult();
    assert.deepEqual(plain([result.outcome, result.launchedArrows, result.failedArrows]), ["completed", 6, 1]);
    assertClean(g, "partial");
});
test("実行時の状態は保存されない。奥義の後に$gameSystemは発動前と同じ", () => {
    const g = ready(); const systemBefore = JSON.stringify(g.$gameSystem);
    start(g, 0); atPlayer(g, 101, 2000); frames(g, 10);
    assert.equal(/apolloUltimate|ApolloUltimate|projectRApolloUltimate|instanceId/i.test(JSON.stringify(g.$gameSystem)), false);
    frames(g, 150); assertClean(g, "saved");
    const engineCaches = system => { const copy = plain(system); delete copy.collisionTimestamps; delete copy.collidedOnceEvents; return JSON.stringify(copy); };
    assert.equal(engineCaches(g.$gameSystem), engineCaches(JSON.parse(systemBefore)));
    assert.deepEqual([g.DataManager.makeSaveContents, g.DataManager.extractSaveContents], g.saveFunctionsBefore); // セーブ処理を包まない
    const code = read(APOLLO_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/makeSaveContents|extractSaveContents|\$gameSystem\.\w+\s*=[^=]/.test(code), false);
});
test("診断APIは安全なコピーを返し、可変なregistryを公開しない", () => {
    const g = ready(); start(g, 0); frames(g, 8);
    const s = au(g).getApolloUltimateState(); s.arrowDegrees.push(999); s.instanceId = 77;
    assert.equal(state(g).arrowDegrees.length, 7); assert.equal(state(g).instanceId, 1);
    const list = au(g).getActiveProjectiles(); list.length = 0; list.push({ hacked: true });
    assert.ok(au(g).getActiveProjectileCount() >= 1);
    const config = au(g).getConfig(); config.arrowCount = 99; assert.equal(au(g).getConfig().arrowCount, 7);
    assert.deepEqual(Object.keys(au(g)).sort(), ["getActiveProjectileCount", "getActiveProjectiles", "getApolloUltimateLastResult",
        "getApolloUltimateState", "getConfig", "getRegistration", "isApolloUltimateActive"]);
    assert.deepEqual(Object.keys(state(g)).sort(), ["activeProjectiles", "arrowCount", "arrowDegrees", "baseDegree", "currentArrowIndex",
        "elapsedSeconds", "failedArrows", "hitCount", "instanceId", "launchedArrows", "launching"]);
    assert.equal(au(g).getApolloUltimateLastResult(), null);
});
test("次の有効な奥義は、前の奥義の終了とゲージ再充填の後に実行できる(命中記録は引き継がない)", () => {
    const g = ready(); const target = atPlayer(g, 101, 3000); start(g, 0); frames(g, 60);
    assert.equal(target.bar.currentHp, 3000 - 7 * DAMAGE);
    fill(g); start(g, 0); frames(g, 60);
    assert.equal(target.bar.currentHp, 3000 - 14 * DAMAGE); // 2回目も7本命中
    assert.equal(au(g).getApolloUltimateLastResult().instanceId, 2);
    assert.equal(gauge(g).getUltimateGauge() >= 0, true);
    assertClean(g, "second");
});

// ================= 回帰 =================
test("Core/Input/Manager/Gauge/Activation/Bridge/既存カードplugin/Hermes系は変更されておらず、Apollo Ultimateを持ち込んでいない", () => {
    for (const file of ["ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge",
        "ProjectR_UltimateGauge", "ProjectR_UltimateActivation", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm",
        "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesSwiftMovement", "ProjectR_HermesSwordsmanship",
        "ProjectR_HermesUltimate"]) {
        assert.equal(/ApolloUltimate|apollo_ultimate|projectRApolloUltimate/.test(read(`js/plugins/${file}.js`)), false, file);
    }
    // 変更禁止のpluginは、Phase 4D-1完了時点(e5502f3)と完全に同じ
    for (const file of ["ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge",
        "ProjectR_UltimateGauge", "ProjectR_UltimateActivation", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm",
        "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesSwiftMovement", "ProjectR_HermesSwordsmanship",
        "ProjectR_HermesUltimate"]) {
        const before = cp.execFileSync("git", ["show", `e5502f3:js/plugins/${file}.js`], { encoding: "utf8", maxBuffer: 1 << 26 }).replace(/\r\n/g, "\n");
        assert.equal(read(`js/plugins/${file}.js`).replace(/\r\n/g, "\n"), before, file);
    }
    for (const file of ["Hendrix_Action_Engine", "Hendrix_Keyboard_Gamepad", "DotMoveSystem"]) {
        assert.equal(cp.execFileSync("git", ["status", "--short", `js/plugins/${file}.js`], { encoding: "utf8" }), "", file);
    }
});
test("Phase 4A/4B/4C/Divine HP/Damage Bridgeの動作は変わらない(Apollo Ultimate追加後)", () => {
    const g = ready();
    assert.deepEqual(plain(gauge(g).getGainConfig()), { cardUseGain: 2, supportBonusGain: 2, damageGainRate: 0.0025, damageGainPerHitCap: 1.5, importantDodgeGain: 5 });
    assert.equal(gauge(g).recordDamageDealt(400, { attackId: "a", targetId: 1 }).gained, 1);
    assert.equal(gauge(g).getUltimateGauge(), 1);
    assert.equal(gauge(g).consumeUltimateGauge().reason, "notFull");
    fill(g); assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100);
    const damage = mgr(g).damagePersistentUltimate(30, "boss");
    assert.deepEqual(plain([damage.ok, damage.divineHp, damage.collapsed]), [true, 70, false]);
    g.aim(0); start(g, 0); frames(g, 150);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 70); // 奥義はDivine HPを変えない
    assert.equal(mgr(g).getPersistentUltimateMaxDivineHp(), 100);
    collapse(g); fill(g); assert.equal(request(g).reason, "persistentUltimateUnavailable");
});
test("カード7枚の定義とApollo/Hermesの既存カードの発動は不変", () => {
    const cards = JSON.parse(productionConfig.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions).map(JSON.parse);
    assert.deepEqual(cards.slice(0, 7).map(c => c.cardId).sort(), ["apollo_plague_attack", "apollo_golden_arrow", "apollo_lyre_calm",
        "hermes_perception_obscure", "hermes_reed_flute_sleep", "hermes_sword_attack", "hermes_swift_movement"].sort());
    const golden = ready(); assert.equal(golden.fire().reason, "success");
    assert.equal(golden.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.equal(au(golden).isApolloUltimateActive(), false); assert.equal(arrowEvents(golden).length, 0);
    assert.equal(mapData.events[3].name, "ProjectR Apollo Golden Arrow"); assert.equal(mapData.events[4].name, "ProjectR Apollo Disease Attack");
});
test("セーブ互換: 保存済みデータの形式は同じで、新しい保存キーを追加しない", () => {
    const g = ready();
    const withoutEngineCaches = () => { const copy = plain(g.$gameSystem); delete copy.collisionTimestamps; delete copy.collidedOnceEvents; return copy; };
    const systemBefore = withoutEngineCaches(), deckBefore = plain(deck(g).getPersistentData());
    start(g, 0); atPlayer(g, 101, 2000); frames(g, 150);
    assert.equal(au(g).getApolloUltimateLastResult().outcome, "completed");
    assert.deepEqual(withoutEngineCaches(), systemBefore);
    assert.deepEqual(plain(deck(g).getPersistentData()), deckBefore);
    assert.equal(deck(g).getUltimateRingId(), "apollo");
    assert.deepEqual(Object.keys(systemBefore).sort(), ["_permanentEvents", "_projectRCardDeckData"]);
    assert.deepEqual(g.saveFunctionsBefore, [g.DataManager.makeSaveContents, g.DataManager.extractSaveContents]);
});

console.log(`${passed} passed`);
