"use strict";
// Phase 4D-1: Hermes本番Ultimate handler。Hermes剣術のfixture(実MZ Input・実Hendrix Action Engineの
// Collision/UpdateEventHp・実Manager・実Gauge・実Activation・実CardBattleInput)にProjectR_HermesUltimate.jsを読み込む。
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
const HERMES_FILE = "js/plugins/ProjectR_HermesUltimate.js";
const SWORD = "hermes_sword_attack";
const mgr = g => g.ProjectRGodSummonManager, gauge = g => g.ProjectRUltimateGauge;
const deck = g => g.ProjectRCardDeck, act = g => g.ProjectRUltimateActivation, hu = g => g.ProjectRHermesUltimate;

const productionConfig = {}; vm.runInNewContext(read("js/plugins.js"), productionConfig);
const keyboardParameters = productionConfig.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters;
const productionEntry = productionConfig.$plugins.find(p => p.name === "ProjectR_HermesUltimate");

// 本番と同じ読み込み順(Manager → Gauge → Activation → Hermes Ultimate)。
function load(hermesParameters = {}, { withHermes = true } = {}) {
    const g = loadGame();
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_HermesUltimate" ? hermesParameters
        : name === "ProjectR_UltimateActivation" || name === "ProjectR_UltimateGauge" ? {}
        : name === "Hendrix_Keyboard_Gamepad" ? keyboardParameters : params(name);
    vm.runInContext(read(GAUGE_FILE), g);
    for (let code = 65; code <= 90; code++) if (!g.Input.keyMapper[code]) g.Input.keyMapper[code] = String.fromCharCode(code).toLowerCase();
    vm.runInContext(read(ACT_FILE), g);
    g.saveFunctionsBefore = [g.DataManager.makeSaveContents, g.DataManager.extractSaveContents];
    g.reload = () => vm.runInContext(read(HERMES_FILE), g);
    if (withHermes) g.reload();
    g.scene = g.SceneManager._scene;
    return g;
}
// Hermes指輪をUltimateに選び、剣カードが先頭の手札で戦闘開始。
function ready(god = "hermes", hermesParameters = {}) {
    const g = load(hermesParameters);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    g.startWith(SWORD);
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
// 発動(API)。以後の最初のframeから進行する。
function start(g, degree = 0) {
    fill(g); g.aim(degree);
    const result = request(g);
    assert.equal(result.ok, true, JSON.stringify(result));
    return result;
}
const boxes = g => plain(hu(g).getActiveHitboxes());
const state = g => plain(hu(g).getHermesUltimateState());
const hpCommands = g => g.commands.filter(c => c.name === "UpdateEventHp");
const ultimateEvents = g => g.$gameMap.events().filter(e => e.event().note.includes("<projectRHermesUltimate>"));
// 敵: HPを多めにして多段Hitを数えやすくする。
function enemy(g, id, x, y, hp = 1000) {
    const e = g.addEnemy(id, x, y); e.bar.currentHp = e.bar.targetHp = hp; return e;
}
const atCenter = (g, id, hp) => enemy(g, id, g.$gamePlayer._realX, g.$gamePlayer._realY, hp); // プレイヤー中心の1tile
const near = (a, b) => Math.abs(a - b) < 1e-8;

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// ================= 登録 =================
test("plugins.js: Activation/Gauge/Manager/Swordsmanshipの後に1件だけ登録、名前とファイルが一致、既定parameter", () => {
    const names = productionConfig.$plugins.map(p => p.name), index = name => names.indexOf(name);
    assert.equal(productionConfig.$plugins.filter(p => p.name === "ProjectR_HermesUltimate").length, 1);
    assert.equal(productionEntry.status, true);
    assert.deepEqual(plain(productionEntry.parameters), { SlashCount: "6", SlashIntervalSeconds: "0.12", SequenceSeconds: "0.75",
        RangeTiles: "2.0", HitboxWidth: "1.5", LifetimeFrames: "3", UltimateDamageGeneratesGauge: "false" });
    for (const before of ["ProjectR_UltimateActivation", "ProjectR_UltimateGauge", "ProjectR_GodSummonManager",
        "ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_HermesSwordsmanship"]) {
        assert.ok(index("ProjectR_HermesUltimate") > index(before), before);
    }
    assert.equal(new Set(names).size, names.length);
    for (const plugin of productionConfig.$plugins.filter(p => /^ProjectR_/.test(p.name))) {
        assert.equal(fs.existsSync(path.join(__dirname, `../js/plugins/${plugin.name}.js`)), true, plugin.name);
    }
    const header = read(HERMES_FILE).slice(0, 2500);
    for (const dep of ["ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateActivation", "Hendrix_Action_Engine"]) {
        assert.match(header, new RegExp(`@base ${dep}`));
    }
    assert.match(header, /@param UltimateDamageGeneratesGauge[\s\S]*@default false/);
});
test("Hermesのhandlerを、Managerが解決したgod IDで登録。Apollo Ultimate pluginを読み込まないこの構成ではApolloは未登録、別の対応表は作らない", () => {
    const g = load();
    const godId = mgr(g).resolveGodId("hermes");
    assert.equal(godId, "hermes");
    assert.deepEqual(plain(act(g).getRegisteredUltimateGods()), [godId]);
    assert.equal(act(g).hasUltimateHandler("hermes"), true);
    assert.equal(act(g).hasUltimateHandler("apollo"), false);
    assert.deepEqual(plain(hu(g).getRegistration()), { ok: true, reason: "registered", godId: "hermes", replaced: false });
    const code = read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/["']hermes["']/.test(code.replace(/resolveGodId\?\.\("hermes"\)/, "")), false); // god IDの直書き・独自対応表なし
    assert.equal(/registerUltimateHandler\(\s*["']/.test(code), false);
});
test("pluginを二重に初期化してもregistryは壊れず、最新のhandlerが1つだけ使われる", () => {
    const g = ready(); g.reload(); g.reload();
    assert.deepEqual(plain(act(g).getRegisteredUltimateGods()), ["hermes"]);
    assert.deepEqual(plain(hu(g).getRegistration()), { ok: true, reason: "replaced", godId: "hermes", replaced: true });
    start(g);
    assert.equal(boxes(g).length, 1); assert.equal(ultimateEvents(g).length, 1);
    assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("Activation不在のときは登録しない(例外なし)", () => {
    const g = load({}, { withHermes: false }); vm.runInContext("delete window.ProjectRUltimateActivation; delete globalThis.ProjectRUltimateActivation", g); g.reload();
    assert.equal(hu(g).getRegistration().ok, false); assert.equal(hu(g).getRegistration().reason, "activationUnavailable");
});

// ================= 発動 =================
test("Hermes + ゲージ100 + 顕現中: Uキーから本番handlerが開始し、成功後にだけゲージが100→0になる", () => {
    const g = ready(); fill(g); g.aim(0);
    let consumed = 0; const consume = gauge(g).consumeUltimateGauge;
    gauge(g).consumeUltimateGauge = function() { consumed++; assert.equal(hu(g).isHermesUltimateActive(), true); return consume.apply(this, arguments); };
    assert.equal(gauge(g).getUltimateGauge(), 100);
    pressU(g);
    const result = act(g).getLastUltimateActivationResult();
    assert.deepEqual(plain([result.ok, result.reason, result.started, result.godId, result.consumed, result.gauge]),
        [true, "started", true, "hermes", 100, 0]);
    assert.equal(consumed, 1); // 消費はActivationが開始成功の後に1回だけ(startの時点でactive)
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(hu(g).isHermesUltimateActive(), true);
    assert.equal(result.handlerResult.instanceId, state(g).instanceId);
    assert.equal(result.handlerResult.slashCount, 6);
    // Ultimate指輪・Divine HP・常駐の状態は変わらない
    assert.deepEqual(plain([mgr(g).getPersistentUltimateStatus(), mgr(g).getPersistentUltimateDivineHp()]), ["active", 100]);
});
test("このpluginはゲージを消費・加算・リセットしない(ソース上も)", () => {
    const code = read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/consumeUltimateGauge|addUltimateGauge|recordDamageDealt|recordEventHpLoss|resetUltimate|clear\(\)/.test(code), false);
    assert.equal(/\.trackDamage/.test(code), true); // 加算は既存の共通処理を通すときだけ
});
test("開始の準備に失敗するとgaugeは100のまま、Ultimate状態もHitboxも残らない", () => {
    const failures = {
        skillMissing: g => { g.$dataSkills[235].note = ""; },
        skillNotDamage: g => { g.$dataSkills[235].damage.type = 0; },
        skillNameCollision: g => { g.$dataSkills[1].name = g.$dataSkills[235].name; },
        engineCommandMissing: g => { delete g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"]; },
        mapUnavailable: g => { g.SceneManager._scene._spriteset = null; },
        mouseOnPlayer: g => { g.TouchInput.x = g.$gamePlayer.screenX(); g.TouchInput.y = g.$gamePlayer.screenY(); },
        mouseNotFinite: g => { g.TouchInput.x = NaN; },
        playerPositionInvalid: g => { g.$gamePlayer.centerPositionPoint = () => ({ x: NaN, y: 1 }); },
        spawnThrows: g => { g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"] = () => { throw Error("spawnBoom"); }; },
        spawnCreatesNothing: g => { g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"] = () => {}; }
    };
    for (const [name, breakIt] of Object.entries(failures)) {
        const g = ready(); fill(g); g.aim(0); breakIt(g);
        const result = request(g);
        assert.deepEqual(plain([result.ok, result.reason, result.started, result.consumed]), [false, "ultimateStartFailed", false, 0], name);
        assert.equal(typeof result.handlerReason, "string", name);
        assert.equal(gauge(g).getUltimateGauge(), 100, name);
        assert.equal(hu(g).isHermesUltimateActive(), false, name); assert.equal(hu(g).getHermesUltimateState(), null, name);
        assert.equal(ultimateEvents(g).length, 0, name); assert.equal(boxes(g).length, 0, name);
        assert.equal(g.commands.filter(c => c.name === "UpdateEventHp").length, 0, name);
    }
});
test("Hitbox生成が途中で壊れても生成済みの専用Hitboxは片付く(回転失敗)", () => {
    const g = ready(); fill(g); g.aim(0);
    const rotate = g.Game_Character.prototype.rotateTo;
    g.Game_Character.prototype.rotateTo = function() { rotate.apply(this, arguments); this._rotation = NaN; };
    const result = request(g);
    assert.deepEqual(plain([result.reason, result.handlerReason]), ["ultimateStartFailed", "hitboxRotationFailed"]);
    assert.equal(ultimateEvents(g).length, 0); assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.equal([...g.$gameMap.tagToEvents.values()].some(list => list.some(e => e?.event?.().note.includes("projectRHermesUltimate"))), false);
    g.Game_Character.prototype.rotateTo = rotate;
    assert.equal(request(g).ok, true); // 失敗後に正常な発動ができる
});
test("崩壊中のHermesは発動できない(handlerは呼ばれずゲージ100のまま)。復帰後は発動できる", () => {
    const g = ready(); fill(g); collapse(g);
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason]), [false, "persistentUltimateUnavailable"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(hu(g).isHermesUltimateActive(), false);
    assert.equal(ultimateEvents(g).length, 0);
    frames(g, 15 * 60 + 5);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active");
    g.aim(0); assert.equal(request(g).ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("Apollo Ultimate pluginを読み込まない構成でApolloを選択してゲージ100でも、noUltimateHandlerでゲージ100のまま(Apollo本番handlerはPhase 4D-2の試験)", () => {
    const g = ready("apollo"); fill(g); g.aim(0);
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason, result.godId]), [false, "noUltimateHandler", "apollo"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(hu(g).isHermesUltimateActive(), false);
    pressU(g); assert.equal(act(g).getLastUltimateActivationResult().reason, "noUltimateHandler");
    assert.equal(ultimateEvents(g).length, 0);
});
test("戦闘外では開始できない(battleInactive)。ゲージ・状態は変わらない", () => {
    const g = ready(); fill(g); deck(g).endCardBattle(); g.aim(0);
    assert.equal(request(g).reason, "battleInactive"); assert.equal(hu(g).isHermesUltimateActive(), false);
});

// ================= 斬撃の列 =================
test("6回の斬撃: 基準角→+60→-60→+120→-120→反対。360度の小数角を保ち、4方向に丸めない", () => {
    for (const base of [0, 90, 23.75, 180, 270, 359.9]) {
        const g = ready(); start(g, base);
        const expected = [0, 60, -60, 120, -120, 180].map(offset => (((base + offset) % 360) + 360) % 360);
        const planned = state(g).slashDegrees;
        assert.equal(planned.length, 6, String(base));
        planned.forEach((degree, i) => assert.ok(near(degree, expected[i]) || near(degree, expected[i] - 360), `${base} #${i}: ${degree}`));
        assert.ok(near(state(g).baseDegree, base % 360));
        // 実際のHitboxの角度と位置: 原点はプレイヤー中心、中心は射程の半分(1.0 tile)前方。
        const first = boxes(g)[0], radians = (base - 90) * Math.PI / 180;
        assert.ok(near(first.degree, planned[0]));
        assert.equal(first.rotation, first.degree === 0 ? 360 : first.degree);
        assert.ok(near(first.x, 10 + Math.cos(radians) * 1.0), `x ${base}`);
        assert.ok(near(first.y + 0.5, 10 + Math.sin(radians) * 1.0), `y ${base}`);
    }
    const g = ready(); start(g, 23.75);
    assert.deepEqual(state(g).slashDegrees.map(d => Math.round(d * 100) / 100), [23.75, 83.75, 323.75, 143.75, 263.75, 203.75]);
    assert.equal(new Set(state(g).slashDegrees).size, 6);
});
test("基準のマウス角は発動時に1回だけ捕捉され、以後のマウス移動で列は回転しない", () => {
    const g = ready(); start(g, 30);
    const planned = state(g).slashDegrees; const seen = [];
    for (let i = 0; i < 60; i++) {
        g.aim((i * 37 + 200) % 360); frames(g); // マウスを大きく動かし続ける
        for (const box of boxes(g)) seen.push([box.slashIndex, box.degree]);
    }
    for (const [index, degree] of seen) assert.ok(near(degree, planned[index]), `slash ${index}`);
    assert.deepEqual(new Set(seen.map(s => s[0])), new Set([0, 1, 2, 3, 4, 5]));
    assert.equal(hu(g).getHermesUltimateLastResult().instanceId, 1); // 途中で動かしても同じ奥義が最後まで進行した
});
test("タイミング: 斬撃は0/8/15/22/29/36 frame(約0.12秒間隔)、6回だけ生成され、45 frame(0.75秒)で終了", () => {
    const g = ready(); start(g, 0);
    assert.equal(state(g).spawnedSlashes, 1); assert.equal(state(g).currentSlashIndex, 0);
    const spawnedAt = [0]; let completedAt = null;
    for (let frame = 1; frame <= 80; frame++) {
        const before = state(g)?.spawnedSlashes ?? 6;
        frames(g);
        const after = state(g)?.spawnedSlashes;
        if (after === undefined) { completedAt = frame; break; }
        if (after > before) spawnedAt.push(frame);
        assert.equal(hu(g).isHermesUltimateActive(), true);
    }
    assert.deepEqual(spawnedAt, [0, 8, 15, 22, 29, 36]);
    assert.equal(completedAt, 45);
    assert.equal(hu(g).isHermesUltimateActive(), false); assert.equal(hu(g).getHermesUltimateState(), null);
    assert.deepEqual(plain(hu(g).getHermesUltimateLastResult()), { instanceId: 1, outcome: "completed", slashCount: 6,
        spawnedSlashes: 6, failedSlashes: 0, hitCount: 0, elapsedSeconds: hu(g).getHermesUltimateLastResult().elapsedSeconds });
    assert.ok(Math.abs(hu(g).getHermesUltimateLastResult().elapsedSeconds - 0.75) < 0.02);
    assert.equal(ultimateEvents(g).length, 0); assert.equal(boxes(g).length, 0);
    const intervals = spawnedAt.slice(1).map((f, i) => (f - spawnedAt[i]) / 60);
    for (const seconds of intervals) assert.ok(Math.abs(seconds - 0.12) < 1 / 60 + 1e-9, String(seconds));
});
test("発動中の状態は安全なコピー: 内部の命中記録は公開されず、書き換えても進行は変わらない", () => {
    const g = ready(); start(g, 0);
    const s = hu(g).getHermesUltimateState(); s.slashDegrees.push(999); s.slashCount = 1; s.instanceId = -1;
    const list = hu(g).getActiveHitboxes(); list.length = 0;
    assert.equal(state(g).slashDegrees.length, 6); assert.equal(state(g).instanceId, 1); assert.equal(boxes(g).length, 1);
    assert.equal(Object.keys(hu(g)).some(k => /hit(Enemies|Registry)|slashes$/i.test(k)), false);
    assert.equal(Object.isFrozen(hu(g).getConfig()) || typeof hu(g).getConfig() === "object", true);
});
test("Plugin parameterで斬撃回数・間隔・射程などを変更できる。不正値は既定へ", () => {
    const g = ready("hermes", { SlashCount: "4", SlashIntervalSeconds: "0.2", SequenceSeconds: "0", RangeTiles: "3", HitboxWidth: "2", LifetimeFrames: "5" });
    assert.deepEqual(plain(hu(g).getConfig()), { slashCount: 4, intervalSeconds: 0.2, sequenceSeconds: 0, rangeTiles: 3, hitboxWidth: 2,
        lifetimeFrames: 5, damageGeneratesGauge: false });
    start(g, 0);
    assert.deepEqual(state(g).slashDegrees, [0, 90, 270, 180]);
    assert.equal(boxes(g)[0].framesLeft, 5);
    assert.ok(near(boxes(g)[0].y + 0.5, 10 - 1.5)); // 射程3の中心=1.5 tile前方(上)
    frames(g, 200); assert.equal(hu(g).isHermesUltimateActive(), false);
    assert.equal(hu(g).getHermesUltimateLastResult().spawnedSlashes, 4);
    for (const bad of [{ SlashCount: "0" }, { SlashCount: "x" }, { SlashCount: "-3" }, { SlashIntervalSeconds: "0" }, { RangeTiles: "-1" },
        { HitboxWidth: "" }, { LifetimeFrames: "0" }, { SequenceSeconds: "abc" }]) {
        const config = plain(load(bad).ProjectRHermesUltimate.getConfig());
        assert.deepEqual(config, { slashCount: 6, intervalSeconds: 0.12, sequenceSeconds: 0.75, rangeTiles: 2, hitboxWidth: 1.5,
            lifetimeFrames: 3, damageGeneratesGauge: false }, JSON.stringify(bad));
    }
    assert.equal(load({ SlashCount: "99" }).ProjectRHermesUltimate.getConfig().slashCount, 12);
    assert.equal(load({ UltimateDamageGeneratesGauge: "true" }).ProjectRHermesUltimate.getConfig().damageGeneratesGauge, true);
});
test("プレイヤーを動かさない。発動後にプレイヤーが動くと、以降の斬撃は新しい中心から出るが角度は同じ", () => {
    const g = ready(); start(g, 0);
    assert.equal(g.movements.length, 0); assert.deepEqual([g.$gamePlayer._realX, g.$gamePlayer._realY], [10, 10]);
    frames(g, 8); // 2回目の斬撃(index 1)が生成されるframe
    g.$gamePlayer._realX = 14; frames(g, 7); // 3回目(index 2)は新しい位置で生成
    const third = boxes(g).find(b => b.slashIndex === 2), planned = state(g).slashDegrees;
    assert.ok(third); assert.ok(near(third.degree, planned[2]));
    const radians = (planned[2] - 90) * Math.PI / 180;
    assert.ok(near(third.x, 14 + Math.cos(radians)), "x follows player center"); assert.ok(near(third.y + 0.5, 10 + Math.sin(radians)));
    assert.equal(g.movements.length, 0);
});

// ================= ダメージ =================
test("専用Database Skill(ID235)を使い、Swordsmanship(237)は不変。他のSkillも変わっていない", () => {
    const skills = JSON.parse(read("data/Skills.json")), before = JSON.parse(cp.execFileSync("git", ["show", "cd586e8:data/Skills.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    assert.equal(skills.length, before.length); assert.equal(skills.length, 240);
    skills.forEach((skill, i) => { if (i !== 235 && i !== 234) assert.deepEqual(skill, before[i], `skill ${i}`); }); // 234はPhase 4D-2のApollo Ultimate
    assert.equal(before[235].name, ""); // 未使用の空きスロットだった
    const skill = skills[235];
    assert.deepEqual(plain([skill.id, skill.name, skill.note, skill.damage.type, skill.damage.formula, skill.damage.variance, skill.damage.critical]),
        [235, "ヘルメース奥義", "<ProjectRUltimate: hermes_ultimate>", 1, "a.atk * 1.2 - b.def * 0.5", 0, false]);
    assert.match(skill.description, /仮/);
    assert.equal(skills.filter(s => s?.name === skill.name).length, 1);
    assert.equal(skills[237].name, "ヘルメース剣術"); assert.equal(skills[237].damage.formula, "a.atk * 2 - b.def");
    const g = ready(); start(g, 0);
    assert.match(ultimateEvents(g)[0].event().note, /<dmg: ヘルメース奥義><attacker: player><hitbox: 1\.5, 2>/);
    assert.doesNotMatch(ultimateEvents(g)[0].event().note, /weapon|playerAttack|hermes_sword/);
});
test("1つの斬撃が複数の敵に当たり、各敵へ公式Skill計算(50 = 50*1.2 - 20*0.5)とUpdateEventHp(-damage)", () => {
    const g = ready(); start(g, 0);
    const box = boxes(g)[0];
    const a = enemy(g, 101, box.x, box.y + 0.5), b = enemy(g, 102, box.x, box.y + 0.5), far = enemy(g, 103, 40, 40);
    frames(g);
    assert.equal(a.bar.currentHp, 950); assert.equal(b.bar.currentHp, 950); assert.equal(far.bar.currentHp, 1000);
    const commands = hpCommands(g);
    assert.equal(commands.length, 2);
    for (const c of commands) {
        assert.deepEqual(plain([c.plugin, c.args.value, c.args.exceedMaxHealth]), ["Hendrix_Action_Engine", "-damage", "false"]);
        assert.equal(c.eventId, box.eventId); // 攻撃元は斬撃Hitbox(従来のSwordsmanshipと同じ)
    }
});
test("同じ敵は1つの斬撃につき最大1回(3frame接触・離れて戻っても)、別の斬撃には再び当たる", () => {
    const g = ready(); start(g, 0);
    const target = atCenter(g, 101);
    frames(g); assert.equal(target.bar.currentHp, 950);
    frames(g); frames(g); // slash 0 の寿命(3frame)の間に接触し続けても二重Damageなし
    assert.equal(hpCommands(g).length, 1);
    // 離れて戻っても、同じ斬撃では当たらない
    const g2 = ready(); start(g2, 0); const t2 = atCenter(g2, 101);
    frames(g2); t2.event.locate(30, 30); frames(g2); t2.event.locate(10, 10); frames(g2);
    assert.equal(hpCommands(g2).length, 1); assert.equal(t2.bar.currentHp, 950);
    // 全シーケンスで、プレイヤー中心の敵は6つの斬撃それぞれから1回ずつ = 6回
    const g3 = ready(); start(g3, 0); const t3 = atCenter(g3, 101);
    frames(g3, 60);
    assert.equal(hpCommands(g3).length, 6); assert.equal(t3.bar.currentHp, 700);
    assert.deepEqual(new Set(hpCommands(g3).map(c => c.eventId)).size, 6); // 6個の別々の斬撃Hitbox
    assert.equal(hu(g3).getHermesUltimateLastResult().hitCount, 6);
});
test("倒れた敵・HP0・非enemy・消去済みEventには追加ダメージがない", () => {
    const g = ready(); start(g, 0);
    const dead = atCenter(g, 101, 0), npc = atCenter(g, 102), erased = atCenter(g, 103);
    npc.event._data.note = "<npc>"; erased.event._erased = true;
    frames(g, 60); assert.equal(hpCommands(g).length, 0);
    // 途中で倒れる: 200HPの敵は50ダメージ×4回で倒れ、5・6回目の斬撃では追加ダメージなし
    const g2 = ready(); start(g2, 0); const t = atCenter(g2, 101, 200);
    frames(g2, 60);
    assert.equal(t.bar.currentHp, 0); assert.equal(hpCommands(g2).length, 4);
    assert.equal(hu(g2).getHermesUltimateLastResult().hitCount, 4);
});
test("Database式の変更が実Damageに反映され、固定減算ではない", () => {
    const g = ready(); g.$dataSkills[235].damage.formula = "27"; start(g, 0);
    const target = atCenter(g, 101); frames(g); assert.equal(target.bar.currentHp, 973);
});
test("既存のAction Combat経路を保つ: 専用のDynamic Hitbox(Prefab不使用)・checkCollide・UpdateEventHpのみ", () => {
    const g = ready(); start(g, 0); atCenter(g, 101); frames(g, 60);
    assert.equal(g.spawns.length, 0);
    assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 6);
    assert.deepEqual([...new Set(g.commands.map(c => c.name))].sort(), ["UpdateEventHp", "spawnEventHitbox"]);
    const code = read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/setTimeout|setInterval|requestAnimationFrame|\.mhp|\.setHp|_hp\s*[-=]|currentHp\s*[-=]/.test(code), false);
    assert.equal(/UpdateEventHp/.test(code) && /checkCollide/.test(code) && /spawnEventHitbox/.test(code), true);
});
test("Ultimateのダメージは既定でUltimate Gaugeを増やさない(Phase 4Bの経路を呼ばない)", () => {
    const g = ready(); let tracked = 0, recorded = 0;
    const track = gauge(g).trackDamage; gauge(g).trackDamage = function() { tracked++; return track.apply(this, arguments); };
    const record = gauge(g).recordDamageDealt; gauge(g).recordDamageDealt = function() { recorded++; return record.apply(this, arguments); };
    start(g, 0); atCenter(g, 101); frames(g, 60);
    assert.equal(hpCommands(g).length, 6);
    assert.deepEqual([tracked, recorded], [0, 0]);
    assert.equal(gauge(g).getUltimateGauge(), 0); assert.equal(gauge(g).getGainStats().totals.damage ?? 0, 0);
});
test("UltimateDamageGeneratesGauge=trueでは既存のPhase 4B経路(trackDamage)で実ダメージ分だけ加算、式は複製しない", () => {
    const g = ready("hermes", { UltimateDamageGeneratesGauge: "true" }); start(g, 0); atCenter(g, 101); frames(g, 60);
    assert.equal(hpCommands(g).length, 6);
    // 実ダメージ50 × DamageGainRate 0.0025 = 0.125 を6斬撃ぶん
    assert.ok(near(gauge(g).getUltimateGauge(), 6 * 50 * gauge(g).getGainConfig().damageGainRate), String(gauge(g).getUltimateGauge()));
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:hermesUltimate:1:0:101"), true);
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:hermesUltimate:1:5:101"), true); // 斬撃ごとに別ID
    assert.equal(gauge(g).getGainStats().last.source, "damage:hermes_ultimate");
    const code = read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/damageGainRate|damageGainPerHitCap|\*\s*0\.0025/.test(code), false);
});
test("発動中に常駐Hermesが崩壊しても、始まった奥義は最後まで続く(無敵・キャンセルなし)", () => {
    const g = ready(); start(g, 0); const target = atCenter(g, 101);
    frames(g, 4); collapse(g);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "collapsed");
    frames(g, 60);
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "completed");
    assert.equal(target.bar.currentHp, 700); // 6回すべて命中
    assert.equal(mgr(g).getPersistentUltimateStatus(), "collapsed"); // 崩壊のルールは変えない
    assert.equal(/damagePersistentUltimate|isPersistentUltimate|hp\s*[+]=/.test(read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "")), false);
});

// ================= 同時実行 =================
test("発動中の再要求は拒否され(ultimateEffectActive)、ゲージ・進行中の奥義は変わらない。終了後は再発動できる", () => {
    const g = ready(); start(g, 0);
    const first = state(g), hitboxes = boxes(g);
    fill(g); // 外部からゲージを再充填
    const result = request(g);
    assert.deepEqual(plain([result.ok, result.reason, result.started, result.handlerReason]), [false, "ultimateStartFailed", false, "ultimateEffectActive"]);
    assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.deepEqual(boxes(g), hitboxes); assert.equal(state(g).instanceId, first.instanceId);
    pressU(g); // キー入力でも同じ
    assert.equal(act(g).getLastUltimateActivationResult().handlerReason, "ultimateEffectActive");
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(ultimateEvents(g).length, 1);
    frames(g, 60); assert.equal(hu(g).isHermesUltimateActive(), false);
    assert.equal(gauge(g).getUltimateGauge(), 100); // 拒否でも消費されていない
    g.aim(45); const again = request(g);
    assert.equal(again.ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(state(g).instanceId, first.instanceId + 1); // 実行ごとに一意なinstance ID
    assert.ok(near(state(g).baseDegree, 45));
    fill(g); frames(g, 60); assert.equal(hu(g).getHermesUltimateLastResult().instanceId, first.instanceId + 1);
});
test("通常カードは奥義中も使え、一時召喚と常駐Hermesは独立。通常の剣は従来どおり80ダメージ", () => {
    const g = ready(); const persistentBefore = plain(mgr(g).getPersistentUltimateSummon());
    assert.deepEqual(plain(mgr(g).getActiveSummons()), []);
    start(g, 0); // Ultimate自体は一時召喚を作らない
    assert.deepEqual(plain(mgr(g).getActiveSummons()), []);
    assert.deepEqual(plain(mgr(g).getPersistentUltimateSummon()), persistentBefore);
    frames(g, 2);
    const target = atCenter(g, 101);
    const fired = g.fire(); assert.equal(fired.reason, "success"); // 剣カード
    assert.equal(mgr(g).getActiveSummons().length, 1); assert.equal(mgr(g).getActiveSummons()[0].kind, "transient");
    assert.equal(mgr(g).getActiveSummons()[0].godId, "hermes");
    assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 1);
    assert.equal(hu(g).isHermesUltimateActive(), true);
    assert.equal(plain(mgr(g).getPersistentUltimateSummon()).summonId, persistentBefore.summonId); // 常駐は1体のまま
    frames(g, 60);
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "completed");
    // 奥義6回(1つ目の斬撃は寿命の最後の有効frameで命中) + 剣1回(80)。互いのHit記録・寿命は干渉しない。
    assert.equal(hpCommands(g).length, 7); assert.equal(target.bar.currentHp, 1000 - 6 * 50 - 80);
    const ultimateIds = new Set(ultimateEvents(g).map(e => e.eventId()));
    assert.equal(hpCommands(g).filter(c => ultimateIds.has(c.eventId)).length, 0); // 終了後に全Hitbox除去済み
});
test("剣(Swordsmanship)単独の動作は不変: 80ダメージ、同じ敵は1Hit", () => {
    const g = ready(); const target = enemy(g, 101, 20, 20, 200);
    g.fire(); const swing = g.swing(); target.event.locate(swing._realX, swing._realY + 0.5);
    frames(g); assert.equal(target.bar.currentHp, 120);
    assert.equal(g.commands.filter(c => c.name === "UpdateEventHp").length, 1);
    assert.equal(hu(g).isHermesUltimateActive(), false);
});

// ================= 進行の停止 =================
test("メニュー/会話/フォーカス喪失/イベント停止中は進まず、再開すると続きから進む", () => {
    const pauses = {
        sceneInactive: [g => { g.scene.isActive = () => false; }, g => { g.scene.isActive = () => true; }],
        message: [g => { g.$gameMessage.isBusy = () => true; }, g => { g.$gameMessage.isBusy = () => false; }],
        eventRunning: [g => { g.$gameMap.isEventRunning = () => true; }, g => { g.$gameMap.isEventRunning = () => false; }],
        eventsPaused: [g => { g.$gameMap.eventsPaused = true; }, g => { g.$gameMap.eventsPaused = false; }],
        focusLost: [g => { g.document.hasFocus = () => false; }, g => { g.document.hasFocus = () => true; }]
    };
    for (const [name, [pause, resume]] of Object.entries(pauses)) {
        const g = ready(); start(g, 0); frames(g, 2);
        const before = state(g); pause(g); frames(g, 120);
        assert.deepEqual(state(g), before, name); // 経過時間も斬撃も寿命も進まない
        assert.equal(boxes(g)[0].framesLeft, 1, name);
        resume(g); frames(g, 60);
        assert.equal(hu(g).isHermesUltimateActive(), false, name); assert.equal(hu(g).getHermesUltimateLastResult().spawnedSlashes, 6, name);
    }
    // Game_Map.update(sceneActive=false) でも進まない
    const g = ready(); start(g, 0); const before = state(g);
    for (let i = 0; i < 30; i++) g.$gameMap.update(false);
    assert.deepEqual(state(g), before);
});

// ================= 後始末 =================
function assertClean(g, label) {
    assert.equal(hu(g).isHermesUltimateActive(), false, label); assert.equal(hu(g).getHermesUltimateState(), null, label);
    assert.deepEqual(boxes(g), [], label); assert.equal(ultimateEvents(g).length, 0, label);
    assert.equal([...g.$gameMap.tagToEvents.values()].some(list => list.some(e => e?.event?.().note.includes("projectRHermesUltimate"))), false, label);
    assert.equal(Object.keys(g.$gameSystem.collidedOnceEvents || {}).concat(Object.keys(g.$gameSystem.collisionTimestamps || {}))
        .some(key => key.includes("projectRHermesUltimateHit")), false, label);
}
test("戦闘終了で奥義を中断し、Hitbox・命中記録を片付ける。ゲージは返さず、以後の更新で復活しない", () => {
    const g = ready(); start(g, 0); atCenter(g, 101); frames(g, 10);
    assert.equal(gauge(g).getUltimateGauge(), 0);
    deck(g).endCardBattle();
    assertClean(g, "endBattle");
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "battleEnded");
    assert.equal(gauge(g).hasUltimateGaugeState(), false); // 戦闘終了で状態ごと消える(返金なし)
    const hits = hpCommands(g).length; frames(g, 120); assert.equal(hpCommands(g).length, hits); assertClean(g, "later");
    assert.equal(deck(g).startCardBattle().ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("戦闘がendCardBattleを通らず非アクティブになっても、次の更新で中断される", () => {
    const g = ready(); start(g, 0);
    g.ProjectRCardDeck.isCardBattleActive = () => false;
    frames(g); assertClean(g, "inactive");
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "battleEnded");
});
test("マップ移動(setup)・Map入れ替え(ロード)・onMapLoadedで奥義を中断しHitboxを除去する", () => {
    const g1 = ready(); start(g1, 0); frames(g1, 9);
    assert.ok(boxes(g1).length >= 1); g1.$gameMap.setup(2);
    assertClean(g1, "setup"); assert.equal(hu(g1).getHermesUltimateLastResult().outcome, "mapChanged");

    const g2 = ready(); start(g2, 0); frames(g2, 9);
    const oldMap = g2.$gameMap, oldEvents = oldMap.events();
    g2.$gameMap = new g2.Game_Map(); g2.SceneManager._scene.onMapLoaded(); // ロード後に別のMapオブジェクト
    assert.equal(hu(g2).isHermesUltimateActive(), false); assert.equal(hu(g2).getHermesUltimateLastResult().outcome, "mapChanged");
    assert.equal(oldMap.events().length, 0); assert.ok(oldEvents.length >= 1); // 古いMap上のHitboxも除去

    const g3 = ready(); start(g3, 0); frames(g3, 9);
    g3.$gameMap = new g3.Game_Map(); frames(g3); // onMapLoadedを経ずにMapが入れ替わった場合は次の更新で
    assert.equal(hu(g3).isHermesUltimateActive(), false); assert.equal(hu(g3).getHermesUltimateLastResult().outcome, "mapChanged");

    // 同じMapのままonMapLoaded(メニューから戻る等)では奥義は続く。ただし登録外の専用Hitboxは除去される。
    const g4 = ready(); start(g4, 0); frames(g4, 2);
    g4.SceneManager._scene.onMapLoaded();
    assert.equal(hu(g4).isHermesUltimateActive(), true); assert.equal(boxes(g4).length >= 1, true);
});
test("Hitbox生成中に例外が出てもGame_Map.updateを壊さず、片付けて終了する", () => {
    const g = ready(); start(g, 0);
    g.PluginManager._commands["Hendrix_Action_Engine:UpdateEventHp"] = () => { throw Error("hpBoom"); };
    atCenter(g, 101);
    assert.doesNotThrow(() => frames(g, 2));
    assertClean(g, "error"); assert.equal(hu(g).getHermesUltimateLastResult().outcome, "error");
});
test("後の斬撃の生成に失敗しても残りの斬撃は続き、奥義全体は止まらない", () => {
    const g = ready(); start(g, 0);
    const original = g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"];
    let calls = 0;
    g.PluginManager._commands["Hendrix_Action_Engine:spawnEventHitbox"] = function() { if (++calls === 2) throw Error("boom"); return original.apply(this, arguments); };
    frames(g, 60);
    const result = hu(g).getHermesUltimateLastResult();
    assert.deepEqual(plain([result.outcome, result.spawnedSlashes, result.failedSlashes]), ["completed", 5, 1]);
    assertClean(g, "partial");
});
test("実行時の状態は保存されない。Hitboxが消えた後に$gameSystemは発動前と同じ", () => {
    const g = ready(); const systemBefore = JSON.stringify(g.$gameSystem);
    start(g, 0); atCenter(g, 101); frames(g, 10);
    assert.equal(/hermesUltimate|HermesUltimate|projectRHermesUltimate|instanceId/i.test(JSON.stringify(g.$gameSystem).replace(/projectRHermesUltimateHit\d+_\d+/g, "")), false);
    frames(g, 60); assertClean(g, "saved");
    // Hendrix本体がcheckCollide時に作る空の履歴(Swordsmanshipでも同じ)を除き、$gameSystemは発動前と同じ。
    assert.deepEqual(plain(g.$gameSystem.collisionTimestamps || {}), {}); assert.deepEqual(plain(g.$gameSystem.collidedOnceEvents || {}), {});
    const engineCaches = system => { const copy = plain(system); delete copy.collisionTimestamps; delete copy.collidedOnceEvents; return JSON.stringify(copy); };
    assert.equal(engineCaches(g.$gameSystem), engineCaches(JSON.parse(systemBefore)));
    assert.deepEqual([g.DataManager.makeSaveContents, g.DataManager.extractSaveContents], g.saveFunctionsBefore); // セーブ処理を包まない
    const code = read(HERMES_FILE).replace(/\/\*:[\s\S]*?\*\//, "");
    assert.equal(/makeSaveContents|extractSaveContents|\$gameSystem\.\w+\s*=[^=]/.test(code), false);
});
test("次の有効な奥義は、前の奥義の終了とゲージ再充填の後に実行できる(命中記録は引き継がない)", () => {
    const g = ready(); start(g, 0); const target = atCenter(g, 101); frames(g, 60);
    assert.equal(target.bar.currentHp, 700);
    start(g, 0); frames(g, 60);
    assert.equal(target.bar.currentHp, 400); // 2回目も6回命中(1回目の命中記録は残らない)
    assert.equal(hu(g).getHermesUltimateLastResult().instanceId, 2);
    assertClean(g, "second");
});

// ================= 回帰 =================
test("Phase 4A/4B/4C/Manager/Bridge/Coreは変更されておらず、Hermes固有の挙動を持ち込んでいない", () => {
    for (const file of ["ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge",
        "ProjectR_UltimateGauge", "ProjectR_UltimateActivation", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm",
        "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesSwiftMovement",
        "ProjectR_HermesSwordsmanship"]) {
        assert.equal(/HermesUltimate|hermes_ultimate|ProjectRUltimate:/.test(read(`js/plugins/${file}.js`)), false, file);
    }
    // 変更禁止のpluginは、Phase 4C完了時点(cd586e8)と完全に同じ
    // (UltimateActivation / HermesReedFluteSleep / HermesSwordsmanship は Phase 5A-RT3 で診断・表示連携を足したため、
    //  固定対象から外す。挙動は各専用テストと tests/ProjectR_CombatRuntimeCompliance.test.cjs で確認する)
    for (const file of ["ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge", "ProjectR_UltimateGauge",
        "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm",
        "ProjectR_HermesRecognitionObscure", "ProjectR_HermesSwiftMovement"]) {
        const before = cp.execFileSync("git", ["show", `cd586e8:js/plugins/${file}.js`], { encoding: "utf8", maxBuffer: 1 << 26 }).replace(/\r\n/g, "\n");
        assert.equal(read(`js/plugins/${file}.js`).replace(/\r\n/g, "\n"), before, file);
    }
    for (const file of ["Hendrix_Action_Engine", "Hendrix_Keyboard_Gamepad", "DotMoveSystem"]) {
        assert.equal(cp.execFileSync("git", ["status", "--short", `js/plugins/${file}.js`], { encoding: "utf8" }), "", file);
    }
});
test("Phase 4A/4B/4C/Divine HP/Damage Bridgeの動作は変わらない(Hermes Ultimate追加後)", () => {
    const g = ready();
    assert.deepEqual(plain(gauge(g).getGainConfig()), { cardUseGain: 2, supportBonusGain: 2, damageGainRate: 0.0025, damageGainPerHitCap: 1.5, importantDodgeGain: 5 });
    assert.equal(gauge(g).recordDamageDealt(400, { attackId: "a", targetId: 1 }).gained, 1);
    assert.equal(gauge(g).getUltimateGauge(), 1);
    assert.equal(gauge(g).consumeUltimateGauge().reason, "notFull");
    fill(g); assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100);
    const damage = mgr(g).damagePersistentUltimate(30, "boss");
    assert.deepEqual(plain([damage.ok, damage.divineHp, damage.collapsed]), [true, 70, false]);
    g.aim(0); start(g, 0); frames(g, 60);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 70); // 奥義はDivine HPを変えない
    assert.equal(mgr(g).getPersistentUltimateMaxDivineHp(), 100);
    collapse(g); fill(g); assert.equal(request(g).reason, "persistentUltimateUnavailable");
});
test("カード7枚の定義とHermes/Apolloの既存カードの発動は不変", () => {
    const cards = JSON.parse(productionConfig.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions).map(JSON.parse);
    assert.deepEqual(cards.slice(0, 7).map(c => c.cardId).sort(), ["apollo_plague_attack", "apollo_golden_arrow", "apollo_lyre_calm",
        "hermes_perception_obscure", "hermes_reed_flute_sleep", "hermes_sword_attack", "hermes_swift_movement"].sort());
    const g = ready(); g.fire();
    assert.equal(g.ProjectRHermesSwordsmanship.getActiveHitboxes().length, 1);
    assert.equal(hu(g).isHermesUltimateActive(), false); assert.equal(ultimateEvents(g).length, 0);
    const golden = load(); deck(golden).setUltimateRing("apollo"); golden.startWith("apollo_golden_arrow");
    assert.equal(golden.fire().reason, "success"); assert.equal(golden.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
});
test("セーブ互換: Skills.json以外のデータは変えず、保存済みデータの形式は同じ", () => {
    const g = ready();
    const withoutEngineCaches = () => { const copy = plain(g.$gameSystem); delete copy.collisionTimestamps; delete copy.collidedOnceEvents; return copy; };
    const systemBefore = withoutEngineCaches(), deckBefore = plain(deck(g).getPersistentData());
    start(g, 0); atCenter(g, 101); frames(g, 60);
    assert.equal(hu(g).getHermesUltimateLastResult().outcome, "completed");
    assert.deepEqual(withoutEngineCaches(), systemBefore); // 保存対象($gameSystem)は発動前後で同一
    assert.deepEqual(plain(deck(g).getPersistentData()), deckBefore);
    assert.equal(deck(g).getUltimateRingId(), "hermes");
    assert.deepEqual(Object.keys(systemBefore).sort(), ["_permanentEvents", "_projectRCardDeckData"]); // 新しい保存キーなし
    assert.deepEqual(g.saveFunctionsBefore, [g.DataManager.makeSaveContents, g.DataManager.extractSaveContents]);
});

console.log(`${passed} passed`);
