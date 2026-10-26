"use strict";
// Phase 4C: Ultimate入力と発動トランザクション。Hermes/Golden Arrowの既存fixture(実MZ Input・実Hendrix Keyboard・
// 実Manager・実Gauge・実CardBattleInput)にProjectR_UltimateActivation.jsを読み込む。handlerは常にテスト用のfake。
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
const GAUGE_FILE = "js/plugins/ProjectR_UltimateGauge.js", ACT_FILE = "js/plugins/ProjectR_UltimateActivation.js";
const mgr = g => g.ProjectRGodSummonManager, gauge = g => g.ProjectRUltimateGauge;
const deck = g => g.ProjectRCardDeck, act = g => g.ProjectRUltimateActivation;

// 本番のプロジェクト設定(js/plugins.js)のHendrix Button Config。fixtureのPluginManagerは名前を無視するため明示的に渡す。
const productionConfig = {}; vm.runInNewContext(read("js/plugins.js"), productionConfig);
const keyboardParameters = productionConfig.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters;
// 本番と同じ読み込み順(Manager → Gauge → Activation)。
function load(activationParameters = {}) {
    const g = loadGame();
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_UltimateActivation" ? activationParameters
        : name === "ProjectR_UltimateGauge" ? {}
        : name === "Hendrix_Keyboard_Gamepad" ? keyboardParameters : params(name);
    vm.runInContext(read(GAUGE_FILE), g);
    // 実ゲームのHendrix remapKeys()と同じく、未割当の文字キーは自身の名前(u→"u")に割り当てる(fixtureでは未実行のため再現)。
    for (let code = 65; code <= 90; code++) if (!g.Input.keyMapper[code]) g.Input.keyMapper[code] = String.fromCharCode(code).toLowerCase();
    g.mappersBefore = plain([g.Input.keyMapper, g.Input.gamepadMapper]);
    // Activationが登録するwindowのblur/focusだけを捕捉してテストから発火できるようにする。
    const listeners = new Map(), addListener = g.addEventListener;
    g.addEventListener = (name, fn) => { listeners.set(name, [...(listeners.get(name) || []), fn]); return addListener?.(name, fn); };
    g.emitWindow = name => listeners.get(name)?.forEach(fn => fn());
    vm.runInContext(read(ACT_FILE), g);
    return g;
}
function ready(god = "apollo", activationParameters = {}) {
    const g = load(activationParameters);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    assert.equal(deck(g).startCardBattle().ok, true);
    return g;
}
const fill = g => assert.equal(gauge(g).addUltimateGauge(1000, "test").full, true);
const collapse = g => assert.equal(mgr(g).damagePersistentUltimate(100000).collapsed, true);
const tick = (g, frames = 1) => {
    const scene = g.mapScene || (g.mapScene = g.SceneManager._scene);
    for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; scene.update(); }
};
const keyEvent = (g, letter, extra = {}) => ({
    code: `Key${letter}`, keyCode: letter.charCodeAt(0), key: letter.toLowerCase(), repeat: false,
    target: g.document.activeElement, preventDefault() { this.defaultPrevented = true; }, ...extra
});
const down = (g, letter = "U", extra) => { const e = keyEvent(g, letter, extra); g.Input._onKeyDown(e); return e; };
const up = (g, letter = "U", extra) => g.Input._onKeyUp(keyEvent(g, letter, extra));
// handlerの呼び出し記録。resultは差し替え可能。
function fake(g, godId = "apollo", result = () => ({ ok: true, started: true })) {
    const calls = [];
    assert.equal(act(g).registerUltimateHandler(godId, ctx => { calls.push(ctx); return typeof result === "function" ? result(ctx) : result; }).ok, true);
    return calls;
}
const state = g => plain({ gauge: gauge(g).getUltimateGauge(), status: mgr(g).getPersistentUltimateStatus(), hp: mgr(g).getPersistentUltimateDivineHp(),
    ring: deck(g).getUltimateRingId() });

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// ================= 入力 =================
test("既定キーはUでactive。ProjectR/Hendrix/データの既存操作と衝突せず、keyMapper/Gamepad割当を変えない", () => {
    const g = load();
    assert.deepEqual(plain(act(g).getInputBinding()), { configured: "U", key: "U", code: "KeyU", keyCode: 85, active: true, reason: null });
    assert.deepEqual(plain([g.Input.keyMapper, g.Input.gamepadMapper]), g.mappersBefore);
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const buttons = JSON.parse(c.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters["Button Config"]).map(JSON.parse);
    const bound = buttons.flatMap(b => String(b["To Key"]).split(",").map(s => s.trim().toLowerCase()));
    assert.equal(bound.includes("u"), false);
    assert.equal(g.Input.keyMapper[85], "u"); // Hendrixの未割当文字キー(自身の名前のまま)。
    for (const file of fs.readdirSync(path.join(__dirname, "..", "js/plugins")).filter(f => /^ProjectR_/.test(f) && f !== "ProjectR_UltimateActivation.js")) {
        assert.equal(/KeyU\b|keyCode\s*===?\s*85\b|isTriggered\(["']u["']\)/.test(read(`js/plugins/${file}`)), false, file);
    }
});
test("キーはPlugin Parameterで変更できる。小文字は大文字化、不正値(空・複数文字・数字・記号)は既定のU", () => {
    for (const [raw, expected] of [["I", "I"], ["o", "O"], [" k ", "K"]]) {
        const binding = act(load({ UltimateKey: raw })).getInputBinding();
        assert.deepEqual(plain([binding.key, binding.code, binding.active]), [expected, `Key${expected}`, true], raw);
    }
    for (const bad of ["", "  ", "UU", "1", "F1", "Space", "あ", undefined]) {
        assert.equal(act(load({ UltimateKey: bad })).getInputBinding().key, "U", String(bad));
    }
    const g = ready("apollo", { UltimateKey: "I" }); const calls = fake(g); fill(g);
    down(g, "U"); tick(g); assert.equal(calls.length, 0); // Uはもう割り当てではない
    up(g, "U"); down(g, "I"); tick(g); assert.equal(calls.length, 1);
});
test("他の操作のキーを指定しても奪わず入力無効(J=攻撃, F=Interact, W=移動, Z=決定, 1=カード)。元のInputへ委譲される", () => {
    for (const letter of ["J", "F", "W", "A", "S", "D", "Z"]) {
        const g = ready("apollo", { UltimateKey: letter }); const calls = fake(g); fill(g);
        const binding = act(g).getInputBinding();
        assert.deepEqual(plain([binding.active, binding.reason]), [false, "keyConflict"], letter);
        const e = down(g, letter); tick(g);
        assert.equal(e.defaultPrevented, undefined, letter); assert.equal(calls.length, 0, letter);
        assert.equal(gauge(g).getUltimateGauge(), 100, letter);
    }
    const g = ready("apollo", { UltimateKey: "J" }); fake(g); fill(g);
    down(g, "J"); assert.equal(g.Input._currentState.j, true); // 攻撃入力は従来どおりInputに届く。
    assert.equal(act(g).requestUltimateActivation("api").ok, true); // APIは入力無効でも使える。
});
test("実行中にkeyMapperでUが別操作へ割り当てられた場合は衝突として入力を無効にする", () => {
    const g = ready("apollo"); const calls = fake(g); fill(g);
    g.Input.keyMapper[85] = "ok";
    assert.deepEqual(plain([act(g).getInputBinding().active, act(g).getInputBinding().reason]), [false, "keyConflict"]);
    down(g); tick(g); assert.equal(calls.length, 0);
    g.Input.keyMapper[85] = "u"; assert.equal(act(g).getInputBinding().active, true);
});
test("戦闘外のキーは何もせず元のInputへ委譲(preventDefaultもしない)", () => {
    const g = load(); const calls = fake(g);
    const e = down(g); tick(g);
    assert.equal(e.defaultPrevented, undefined); assert.equal(g.Input._currentState.u, true);
    assert.equal(calls.length, 0); assert.equal(act(g).getLastUltimateActivationResult(), null);
    up(g); assert.notEqual(g.Input._currentState.u, true);
});
test("1回の押下=1回の要求。押下は次のマップ更新で処理され、Inputには渡さない", () => {
    const g = ready(); const calls = fake(g); fill(g);
    const e = down(g);
    assert.equal(calls.length, 0); // keydownの同期処理ではhandlerを呼ばない
    assert.equal(e.defaultPrevented, true); assert.notEqual(g.Input._currentState.u, true);
    tick(g); assert.equal(calls.length, 1);
    assert.equal(act(g).getLastUltimateActivationResult().source, "keyboard");
    assert.equal(act(g).getLastUltimateActivationResult().reason, "started");
    tick(g, 30); assert.equal(calls.length, 1); // フレーム数に依存せず1回
});
test("押しっぱなし(repeat・二重keydown)は再要求しない。離して押し直すと新しい要求になる", () => {
    const g = ready(); const calls = fake(g, "apollo", { ok: false, reason: "busy" }); fill(g);
    down(g); tick(g); assert.equal(calls.length, 1);
    for (let i = 0; i < 10; i++) { down(g, "U", { repeat: true }); tick(g, 2); }
    down(g, "U", { repeat: false }); tick(g, 2); // repeatフラグが無い二重keydownも遮断
    assert.equal(calls.length, 1);
    up(g); tick(g); assert.equal(calls.length, 1);
    down(g); tick(g); assert.equal(calls.length, 2);
    up(g); down(g); down(g, "U", { repeat: true }); tick(g); assert.equal(calls.length, 3);
    assert.equal(gauge(g).getUltimateGauge(), 100); // 失敗が続いてもゲージは不変
});
test("戦闘前から押され続けているキーのrepeatは要求にならない", () => {
    const g = ready(); const calls = fake(g); fill(g);
    down(g, "U", { repeat: true }); tick(g, 3);
    assert.equal(calls.length, 0);
    up(g); down(g); tick(g); assert.equal(calls.length, 1);
});
test("カードキー Q/E/X/C/V をUltimateキーに指定しても奪わず入力無効(keyConflict)。数字1～5はもうカードキーではない", () => {
    for (const letter of ["Q", "E", "X", "C", "V"]) {
        const g = ready("apollo", { UltimateKey: letter }); const calls = fake(g); fill(g);
        const binding = act(g).getInputBinding();
        assert.deepEqual(plain([binding.active, binding.reason]), [false, "keyConflict"], letter);
        down(g, letter); tick(g);
        assert.equal(calls.length, 0, letter); assert.equal(gauge(g).getUltimateGauge(), 100, letter);
        assert.equal(act(g).getInputDiagnostics().lastDecision, "bindingInactive", letter);
    }
    // 数字キーはUltimateキーに使える(予約済みではなくなった)が、1文字の英字指定のみ有効なので"1"は既定のUへ。
    assert.equal(act(load({ UltimateKey: "1" })).getInputBinding().key, "U");
});
test("カードキー Q/E は従来どおりカード入力へ。Ultimateの要求にも影響しない", () => {
    const g = ready(); const calls = fake(g); fill(g);
    const before = plain(g.ProjectRCardBattleInput.getLastResult());
    const e = { code: "KeyQ", keyCode: 81, repeat: false, target: g.document.activeElement, preventDefault() { this.defaultPrevented = true; } };
    g.Input._onKeyDown(e); tick(g);
    assert.equal(e.defaultPrevented, true); assert.notEqual(g.ProjectRCardBattleInput.getLastResult(), null);
    assert.notDeepEqual(plain(g.ProjectRCardBattleInput.getLastResult()), before);
    assert.equal(calls.length, 0); assert.equal(act(g).getLastUltimateActivationResult(), null);
    g.Input._onKeyUp(e);
    // Ultimate押下中もカードキーは通る。
    down(g); const e2 = { ...e, defaultPrevented: undefined, code: "KeyE", keyCode: 69 };
    g.Input._onKeyDown(e2); tick(g);
    assert.equal(calls.length, 1); assert.equal(e2.defaultPrevented, true);
    assert.notDeepEqual(plain(g.ProjectRCardBattleInput.getLastResult()), before); // KeyEも従来どおりカード入力が処理
});
test("Ctrl/Alt/Shift/Meta・編集欄・メッセージ中・フォーカス喪失・別Sceneでは要求しない", () => {
    const g = ready(); const calls = fake(g, "apollo", { ok: false, reason: "x" }); fill(g);
    for (const mod of ["ctrlKey", "altKey", "shiftKey", "metaKey"]) {
        const e = down(g, "U", { [mod]: true }); tick(g); up(g, "U", { [mod]: true });
        assert.equal(e.defaultPrevented, undefined, mod);
    }
    down(g, "U", { isComposing: true }); tick(g); up(g);
    down(g, "U", { target: { tagName: "INPUT" } }); tick(g); up(g);
    g.$gameMessage.isBusy = () => true; down(g); tick(g); up(g); g.$gameMessage.isBusy = () => false;
    assert.equal(calls.length, 0);
    down(g); g.emitWindow("blur"); tick(g); assert.equal(calls.length, 0); // 押下後フォーカス喪失 → 保留は破棄
    up(g); g.emitWindow("focus");
    const scene = g.SceneManager._scene; down(g); g.SceneManager._scene = {}; tick(g); g.SceneManager._scene = scene;
    assert.equal(calls.length, 0);
    up(g); down(g); tick(g); assert.equal(calls.length, 1); // 通常状態では要求できる
});

// ================= 検証 =================
test("検証の失敗: 戦闘外/ゲージ状態なし/未満/崩壊中/handler未登録(いずれもhandlerを呼ばずゲージ不変)", () => {
    const calls = [];
    const outside = load(); fake(outside); calls.push(act(outside).requestUltimateActivation("api"));
    const none = load(); none.startWith("apollo_golden_arrow"); assert.equal(deck(none).startCardBattle().ok, true);
    const noneCalls = fake(none); calls.push(act(none).requestUltimateActivation("api"));
    const low = ready(); const lowCalls = fake(low); gauge(low).addUltimateGauge(99.9, "t"); calls.push(act(low).requestUltimateActivation("api"));
    const down_ = ready(); const downCalls = fake(down_); fill(down_); collapse(down_); calls.push(act(down_).requestUltimateActivation("api"));
    const bare = ready(); fill(bare); calls.push(act(bare).requestUltimateActivation("api"));
    assert.deepEqual(calls.map(r => r.reason), ["battleInactive", "noUltimateGauge", "gaugeNotFull", "persistentUltimateUnavailable", "noUltimateHandler"]);
    assert.ok(calls.every(r => r.ok === false && r.started === false && r.consumed === 0));
    assert.equal(noneCalls.length + lowCalls.length + downCalls.length, 0);
    assert.equal(gauge(low).getUltimateGauge(), 99.9); assert.equal(gauge(down_).getUltimateGauge(), 100); assert.equal(gauge(bare).getUltimateGauge(), 100);
    assert.deepEqual(plain([calls[4].godId, calls[4].ringId]), ["apollo", calls[4].ringId]);
});
test("検証は定義順: ゲージ未満ならhandler無しでもgaugeNotFull、崩壊中ならhandler無しでもpersistentUltimateUnavailable", () => {
    const g = ready(); assert.equal(act(g).requestUltimateActivation().reason, "gaugeNotFull");
    fill(g); collapse(g); assert.equal(act(g).requestUltimateActivation().reason, "persistentUltimateUnavailable");
    assert.equal(act(g).getLastUltimateActivationResult().reason, "persistentUltimateUnavailable");
});
test("god/ringを解決できないsnapshotはinvalidUltimateGod(handlerを呼ばない)", () => {
    for (const broken of [{ godId: "", ringId: "apollo" }, { godId: "apollo", ringId: null }, null]) {
        const g = ready(); const calls = fake(g); fill(g);
        g.ProjectRGodSummonManager.getPersistentUltimateBattleState = () => broken;
        const r = act(g).requestUltimateActivation("api");
        assert.equal(r.reason, "invalidUltimateGod"); assert.equal(calls.length, 0); assert.equal(gauge(g).getUltimateGauge(), 100);
    }
});

// ================= handler =================
test("戦闘のsnapshotの神のhandlerだけが選ばれる(ApolloとHermes)", () => {
    for (const god of ["apollo", "hermes"]) {
        const g = ready(god); const other = god === "apollo" ? "hermes" : "apollo";
        const mine = fake(g, god), theirs = fake(g, other); fill(g);
        const r = act(g).requestUltimateActivation("api");
        assert.deepEqual(plain([r.ok, r.godId]), [true, god]);
        assert.deepEqual([mine.length, theirs.length], [1, 0]);
    }
});
test("handlerには読み取り専用の安全なcontextが渡る", () => {
    const g = ready("hermes"); const calls = fake(g, "hermes"); fill(g);
    assert.equal(act(g).requestUltimateActivation("console").ok, true);
    const ctx = calls[0];
    assert.deepEqual(Object.keys(ctx).sort(), ["battle", "gauge", "godId", "max", "player", "ringId", "source", "summon"]);
    assert.deepEqual(plain([ctx.godId, ctx.ringId, ctx.gauge, ctx.max, ctx.source]), ["hermes", "hermes", 100, 100, "console"]);
    assert.deepEqual(plain([ctx.battle.status, ctx.battle.godId, ctx.battle.divineHp]), ["active", "hermes", 100]);
    assert.deepEqual(plain([ctx.summon.kind, ctx.summon.godId, ctx.summon.persistent]), ["persistentUltimate", "hermes", true]);
    assert.ok(Number.isFinite(ctx.player.x) && Number.isFinite(ctx.player.y));
    for (const part of [ctx, ctx.battle, ctx.summon, ctx.player]) assert.equal(Object.isFrozen(part), true);
    assert.throws(() => { ctx.godId = "apollo"; }, TypeError);
    assert.equal(typeof ctx.consumeUltimateGauge, "undefined");
});
test("Ultimate選択を戦闘中に変えても、戦闘開始時のgod/ringがcontextになる", () => {
    const g = ready("apollo"); const apollo = fake(g, "apollo"), hermes = fake(g, "hermes"); fill(g);
    deck(g).setUltimateRing("hermes"); // 保存設定が戦闘中に変わった想定
    assert.equal(deck(g).getUltimateRingId(), "hermes");
    const r = act(g).requestUltimateActivation("api");
    assert.deepEqual(plain([r.ok, r.godId, r.ringId]), [true, "apollo", "apollo"]);
    assert.deepEqual([apollo.length, hermes.length], [1, 0]);
    assert.equal(apollo[0].battle.godId, "apollo");
});
test("handlerの失敗(明示失敗・started:false・不正な戻り値)はUltimate未開始でゲージもgodも不変", () => {
    const bad = [{ ok: false, reason: "noTarget" }, { ok: true, started: false }, { ok: false, started: true }, { started: true },
        { ok: true }, { ok: true, started: "true" }, { ok: 1, started: 1 }, undefined, null, true, 1, "started", [], () => ({ ok: true, started: true }),
        Promise.resolve({ ok: true, started: true })];
    for (const result of bad) {
        const g = ready(); const calls = fake(g, "apollo", () => result); fill(g);
        const before = state(g);
        const r = act(g).requestUltimateActivation("api");
        assert.deepEqual(plain([r.ok, r.reason, r.started, r.consumed]), [false, "ultimateStartFailed", false, 0], String(result));
        assert.equal(calls.length, 1); assert.deepEqual(state(g), before); assert.equal(gauge(g).isUltimateReady(), true);
    }
    const g = ready(); fake(g, "apollo", { ok: false, reason: "noTarget" }); fill(g);
    assert.equal(act(g).requestUltimateActivation().handlerReason, "noTarget");
    const h = ready(); fake(h, "apollo", () => undefined); fill(h);
    assert.equal(act(h).requestUltimateActivation().handlerReason, "invalidHandlerResult");
});
test("handlerが例外を投げても捕捉し、ゲージは不変で戦闘は続行できる", () => {
    const g = ready(); let boom = true; const calls = fake(g, "apollo", () => { if (boom) throw new Error("boom"); return { ok: true, started: true }; }); fill(g);
    const r = act(g).requestUltimateActivation("api");
    assert.deepEqual(plain([r.ok, r.reason, r.started, r.error]), [false, "ultimateHandlerException", false, "boom"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(deck(g).isCardBattleActive(), true);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active");
    boom = false; assert.equal(act(g).requestUltimateActivation().ok, true); // 例外後も再入ガードが残らない
    assert.equal(calls.length, 2);
    const h = ready(); fake(h, "apollo", () => { throw "plain string"; }); fill(h);
    assert.equal(act(h).requestUltimateActivation().reason, "ultimateHandlerException");
});

// ================= トランザクション =================
test("成功したhandlerはちょうど1回だけ呼ばれ、成功した直後にだけゲージが0になる", () => {
    const g = ready(); const seen = [];
    const calls = fake(g, "apollo", () => { seen.push(gauge(g).getUltimateGauge()); return { ok: true, started: true, detail: "x" }; }); fill(g);
    const r = act(g).requestUltimateActivation("api");
    assert.equal(calls.length, 1); assert.deepEqual(seen, [100]); // handler実行中は消費前(100)
    assert.deepEqual(plain([r.ok, r.reason, r.started, r.consumed, r.gauge, r.max, r.godId]), [true, "started", true, 100, 0, 100, "apollo"]);
    assert.deepEqual(plain(r.handlerResult), { ok: true, started: true, detail: "x" });
    assert.deepEqual(plain([gauge(g).getUltimateGauge(), gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]), [0, false, false]);
    assert.deepEqual(plain(act(g).getLastUltimateActivationResult()), plain(r));
});
test("成功後の再要求はgaugeNotFull。再充填で再び発動でき、複数回のサイクルが動く", () => {
    const g = ready(); const calls = fake(g); fill(g);
    for (let cycle = 1; cycle <= 3; cycle++) {
        assert.equal(act(g).requestUltimateActivation("api").ok, true, `cycle ${cycle}`);
        const again = act(g).requestUltimateActivation("api");
        assert.equal(again.reason, "gaugeNotFull"); assert.equal(calls.length, cycle);
        assert.equal(gauge(g).getUltimateGauge(), 0);
        gauge(g).addUltimateGauge(60, "t"); assert.equal(act(g).requestUltimateActivation().reason, "gaugeNotFull");
        gauge(g).addUltimateGauge(60, "t"); assert.equal(gauge(g).isUltimateReady(), true);
    }
    assert.equal(act(g).requestUltimateActivation().ok, true); assert.equal(calls.length, 4);
});
test("handlerが契約違反(自分でゲージ消費・神の崩壊)をしても投げず、gaugeConsumeFailedAfterStartで診断を残す", () => {
    const own = ready(); fake(own, "apollo", () => { assert.equal(gauge(own).consumeUltimateGauge().ok, true); return { ok: true, started: true }; }); fill(own);
    const r1 = act(own).requestUltimateActivation("api");
    assert.deepEqual(plain([r1.ok, r1.reason, r1.started, r1.consumeReason]), [false, "gaugeConsumeFailedAfterStart", true, "notFull"]);
    const col = ready(); fake(col, "apollo", () => { collapse(col); return { ok: true, started: true }; }); fill(col);
    const r2 = act(col).requestUltimateActivation("api");
    assert.deepEqual(plain([r2.ok, r2.reason, r2.started, r2.consumeReason]), [false, "gaugeConsumeFailedAfterStart", true, "persistentUltimateUnavailable"]);
    assert.equal(gauge(col).getUltimateGauge(), 100); // 手動リセットはしない
    assert.equal(act(col).getLastUltimateActivationResult().reason, "gaugeConsumeFailedAfterStart");
});
test("handler内からの再要求は拒否(activationInProgress)され、外側の発動は完了する", () => {
    const g = ready(); let inner = null;
    const calls = fake(g, "apollo", () => { inner = act(g).requestUltimateActivation("nested"); return { ok: true, started: true }; }); fill(g);
    const r = act(g).requestUltimateActivation("api");
    assert.equal(inner.reason, "activationInProgress"); assert.equal(r.ok, true); assert.equal(calls.length, 1);
    assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("キー入力でも同じトランザクション: 成功でゲージ0、直後の押し直しはgaugeNotFull", () => {
    const g = ready(); const calls = fake(g); fill(g);
    down(g); tick(g); assert.equal(gauge(g).getUltimateGauge(), 0); assert.equal(calls.length, 1);
    up(g); down(g); tick(g);
    assert.equal(act(g).getLastUltimateActivationResult().reason, "gaugeNotFull"); assert.equal(calls.length, 1);
});

// ================= 崩壊/復帰 =================
test("満タンでも崩壊中は発動できない(handler未呼び出し・ゲージ100)。復帰後は発動可能。崩壊中の加算でも同じ", () => {
    const g = ready(); const calls = fake(g); collapse(g);
    gauge(g).addUltimateGauge(1000, "t"); // 崩壊中でも満タンにはできる
    assert.deepEqual(plain([gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]), [true, false]);
    down(g); tick(g); up(g);
    assert.equal(act(g).getLastUltimateActivationResult().reason, "persistentUltimateUnavailable");
    assert.equal(calls.length, 0); assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.equal(act(g).requestUltimateActivation("api").reason, "persistentUltimateUnavailable");
    tick(g, 1000); // 約15秒で復帰(Managerの既存仕様)
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active"); assert.equal(gauge(g).getUltimateGauge(), 100);
    down(g); tick(g);
    assert.equal(calls.length, 1); assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(mgr(g).getPersistentUltimateStatus(), "active"); // Divine HPは発動で変わらない
});

// ================= 登録 =================
test("handler登録: 置き換え情報・不正入力の拒否・他の神を壊さない・内部registryを公開しない", () => {
    const g = load(); const a = act(g);
    const f1 = () => ({ ok: true, started: true }), f2 = () => ({ ok: true, started: true });
    assert.deepEqual(plain(a.registerUltimateHandler("apollo", f1)), { ok: true, reason: "registered", godId: "apollo", replaced: false });
    assert.deepEqual(plain(a.registerUltimateHandler("hermes", f1)), { ok: true, reason: "registered", godId: "hermes", replaced: false });
    assert.deepEqual(plain(a.registerUltimateHandler("apollo", f2)), { ok: true, reason: "replaced", godId: "apollo", replaced: true });
    assert.deepEqual(plain(a.getRegisteredUltimateGods()), ["apollo", "hermes"]);
    for (const bad of ["", " ", "a b", "apollo!", null, undefined, 5, {}, [], true]) {
        const r = a.registerUltimateHandler(bad, f1);
        assert.deepEqual(plain([r.ok, r.reason, r.replaced]), [false, "invalidGodId", false], String(bad));
        assert.equal(a.hasUltimateHandler(bad), false);
    }
    for (const bad of [null, undefined, "fn", {}, 1, true]) assert.equal(a.registerUltimateHandler("zeus", bad).reason, "invalidHandler");
    assert.equal(a.hasUltimateHandler("zeus"), false); assert.deepEqual(plain(a.getRegisteredUltimateGods()), ["apollo", "hermes"]);
    const list = a.getRegisteredUltimateGods(); list.push("evil"); list.length = 0;
    assert.deepEqual(plain(a.getRegisteredUltimateGods()), ["apollo", "hermes"]);
    assert.equal(Object.keys(a).some(k => /registry|handlers$/i.test(k)), false);
    assert.deepEqual(plain(a.unregisterUltimateHandler("hermes")), { ok: true, reason: "unregistered", godId: "hermes", removed: true });
    assert.equal(a.unregisterUltimateHandler("hermes").removed, false);
    assert.equal(a.unregisterUltimateHandler("").reason, "invalidGodId");
    assert.deepEqual([a.hasUltimateHandler("apollo"), a.hasUltimateHandler("hermes")], [true, false]);
});
test("置き換えたhandlerが次の発動から使われ、他の神のhandlerは影響を受けない", () => {
    const g = ready(); const old = fake(g, "apollo"), other = fake(g, "hermes"); fill(g);
    const latest = [];
    assert.equal(act(g).registerUltimateHandler("apollo", ctx => { latest.push(ctx.godId); return { ok: true, started: true }; }).replaced, true);
    assert.equal(act(g).requestUltimateActivation().ok, true);
    assert.deepEqual([old.length, other.length, latest.length], [0, 0, 1]);
});
test("Activation単体にはApollo/Hermesの実Ultimate handlerもダメージも無い(未登録・押してもnoUltimateHandlerでゲージ100のまま。本番handlerは別pluginがPhase 4D-1/4D-2で登録)", () => {
    const g = ready("apollo"); assert.deepEqual(plain(act(g).getRegisteredUltimateGods()), []);
    fill(g); down(g); tick(g);
    const r = act(g).getLastUltimateActivationResult();
    assert.deepEqual(plain([r.ok, r.reason, r.godId]), [false, "noUltimateHandler", "apollo"]);
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(gauge(g).isUltimateReady(), true);
    const source = read(ACT_FILE);
    assert.equal(/registerUltimateHandler\(["'](apollo|hermes)/.test(source), false);
    assert.equal(/UpdateEventHp|damagePersistentUltimate|addUltimateGauge|spawnEventHitbox|startAnimation/.test(source.replace(/\/\*:[\s\S]*?\*\//, "")), false);
    assert.equal(fs.readdirSync(path.join(__dirname, "../js/plugins")).some(f => /Ultimate.*Apollo|Apollo.*Ultimate/.test(f)), true); // Phase 4D-2以降: Hermes/Apollo Ultimateは各々別plugin(この試験はActivation単体なので読み込まない)
});

// ================= 後始末・保存 =================
test("endCardBattleで直近の結果と保留中の入力が消える。handler登録は残る。次の戦闘でゲージは0から", () => {
    const g = ready(); const calls = fake(g); fill(g);
    assert.equal(act(g).requestUltimateActivation().ok, true);
    assert.notEqual(act(g).getLastUltimateActivationResult(), null);
    fill(g); up(g); down(g); // 押下は保留中(まだ更新されていない)
    deck(g).endCardBattle();
    assert.equal(act(g).getLastUltimateActivationResult(), null);
    tick(g, 3); assert.equal(calls.length, 1); // 戦闘終了で保留は破棄され、発動しない
    assert.equal(act(g).hasUltimateHandler("apollo"), true);
    up(g); assert.equal(act(g).requestUltimateActivation().reason, "battleInactive");
    assert.equal(deck(g).startCardBattle().ok, true); assert.equal(gauge(g).getUltimateGauge(), 0);
});
test("戦闘終了後も、押したままのキーのrepeatは元のInputへ漏れず、keyupで解放される", () => {
    const g = ready(); fake(g); fill(g);
    down(g); tick(g); deck(g).endCardBattle();
    down(g, "U", { repeat: true }); assert.notEqual(g.Input._currentState.u, true);
    up(g); down(g); assert.equal(g.Input._currentState.u, true); // 戦闘外の新しい押下は通常どおり
});
test("マップ移動・onMapLoaded・ロードで直近の結果と保留入力が消える", () => {
    for (const how of ["setup", "mapLoaded", "load"]) {
        const g = ready(); const calls = fake(g); fill(g);
        act(g).requestUltimateActivation("api"); assert.notEqual(act(g).getLastUltimateActivationResult(), null, how);
        down(g);
        if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        if (how === "load") { g.$gameMap.setup(1); g.SceneManager._scene.onMapLoaded(); }
        assert.equal(act(g).getLastUltimateActivationResult(), null, how);
        tick(g, 2); assert.equal(calls.length, 1, how); // 保留していた押下は実行されない
        assert.equal(act(g).hasUltimateHandler("apollo"), true, how);
    }
});
test("発動の実行状態は保存されず、Ultimate選択・保存データ・Divine HPは変わらない", () => {
    const g = ready("hermes"); fake(g, "hermes"); fill(g);
    const saveBefore = JSON.stringify(g.DataManager.makeSaveContents()), before = state(g);
    assert.equal(act(g).requestUltimateActivation("api").ok, true);
    const saveAfter = JSON.stringify(g.DataManager.makeSaveContents());
    assert.equal(saveAfter, saveBefore);
    assert.equal(/activation|ultimateActivation|handler|held|binding/i.test(saveAfter.replace(/ProjectRCardDeck/g, "")), false);
    const after = state(g);
    assert.deepEqual([after.status, after.hp, after.ring], [before.status, before.hp, before.ring]); // gaugeだけが100→0
    assert.deepEqual([before.gauge, after.gauge], [100, 0]);
    deck(g).endCardBattle();
    assert.equal(deck(g).getUltimateRingId(), "hermes");
    const restored = JSON.stringify(g.DataManager.makeSaveContents()); assert.equal(restored, saveBefore);
});
test("Phase 4A/4Bの動作は不変: 加算量の設定・カード使用加算・満タン/崩壊の扱い・consumeの契約", () => {
    const cardGame = load(); deck(cardGame).setUltimateRing("apollo"); cardGame.startWith("apollo_golden_arrow");
    assert.equal(cardGame.fire().reason, "success"); assert.equal(gauge(cardGame).getUltimateGauge(), 2); // 4Bのカード使用加算
    const g = ready("apollo");
    assert.deepEqual(plain(gauge(g).getGainConfig()), { cardUseGain: 2, supportBonusGain: 2, damageGainRate: 0.0025, damageGainPerHitCap: 1.5, importantDodgeGain: 5 });
    assert.equal(gauge(g).recordImportantDodge("d1").gained, 5);
    assert.equal(gauge(g).recordDamageDealt(400, { attackId: "a", targetId: 1 }).gained, 1);
    assert.equal(gauge(g).consumeUltimateGauge().reason, "notFull");
    fill(g); collapse(g);
    assert.equal(gauge(g).consumeUltimateGauge().reason, "persistentUltimateUnavailable");
    assert.deepEqual(plain([gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]), [true, false]);
    // Activationはdeckのカード使用やダメージ経路を包まない。
    const source = read(ACT_FILE);
    assert.equal(/deck\.requestUseCard|deck\.useBattleCard|trackDamage/.test(source.replace(/\/\*:[\s\S]*?\*\//, "")), false);
});
test("カード戦闘の通常入力(1～5)と7枚のカードの動作はActivation追加後も同じ(Golden Arrowが発射される)", () => {
    const g = load(); g.startWith("apollo_golden_arrow");
    assert.equal(g.fire().reason, "success");
    assert.equal(g.ProjectRApolloGoldenArrow.getActiveProjectiles().length, 1);
    assert.equal(gauge(g).hasUltimateGaugeState(), false); // Ultimate未選択なら従来どおりゲージ無し
});
test("plugins.js: Gauge/Managerの後、全カードpluginの前に1件だけ登録され、名前とファイルが一致する", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const names = c.$plugins.map(p => p.name), index = name => names.indexOf(name);
    const entries = c.$plugins.filter(p => p.name === "ProjectR_UltimateActivation");
    assert.equal(entries.length, 1); assert.equal(entries[0].status, true);
    assert.deepEqual(plain(entries[0].parameters), { UltimateKey: "U" });
    assert.ok(index("ProjectR_UltimateActivation") > index("ProjectR_UltimateGauge"));
    assert.ok(index("ProjectR_UltimateActivation") > index("ProjectR_GodSummonManager"));
    assert.ok(index("ProjectR_UltimateActivation") > index("ProjectR_CardBattleInput"));
    for (const card of ["ApolloGoldenArrow", "HermesSwordsmanship", "ApolloDiseaseAttack", "ApolloLyreCalm", "HermesSwiftMovement"]) {
        assert.ok(index("ProjectR_UltimateActivation") < index(`ProjectR_${card}`), card);
    }
    assert.equal(new Set(names).size, names.length);
    assert.equal(fs.existsSync(path.join(__dirname, "../js/plugins/ProjectR_UltimateActivation.js")), true);
});
test("Plugin headerの依存・orderAfterとUltimateKey parameter", () => {
    const header = read(ACT_FILE).slice(0, 1200);
    assert.match(header, /@base ProjectR_UltimateGauge/);
    for (const dep of ["ProjectR_GodSummonManager", "ProjectR_UltimateGauge", "ProjectR_CardBattleInput"]) assert.match(header, new RegExp(`@orderAfter ${dep}`));
    assert.match(header, /@param UltimateKey[\s\S]*@default U/);
});

console.log(`${passed} tests passed`);
