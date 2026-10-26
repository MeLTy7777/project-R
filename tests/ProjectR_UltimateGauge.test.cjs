"use strict";
// Phase 4A: Ultimate Gauge基盤。Golden Arrow/Swordsmanshipの実Action Engine fixtureとManager・Bridgeの実ソースを再利用する。
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
const GAUGE_FILE = "js/plugins/ProjectR_UltimateGauge.js", BRIDGE_FILE = "js/plugins/ProjectR_UltimateGodDamageBridge.js";
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack";
const mgr = g => g.ProjectRGodSummonManager;
const gauge = g => g.ProjectRUltimateGauge;
const deck = g => g.ProjectRCardDeck;
const battleTime = (g, frames = 1) => {
    const scene = g.mapScene || (g.mapScene = g.SceneManager._scene);
    for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; scene.update(); }
};
// 本番と同じ読み込み順（Manager → Bridge → Gauge）。Gaugeは戦闘開始前に読み込む。
function load(gaugeParameters = null, withBridge = false) {
    const g = loadGame();
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === "ProjectR_UltimateGauge" ? (gaugeParameters || {}) : params(name);
    if (withBridge) vm.runInContext(read(BRIDGE_FILE), g);
    vm.runInContext(read(GAUGE_FILE), g);
    return g;
}
function ready(god = "apollo", gaugeParameters = null, withBridge = false) {
    const g = load(gaugeParameters, withBridge);
    assert.equal(deck(g).setUltimateRing(god).ok, true);
    assert.equal(deck(g).startCardBattle().ok, true);
    return g;
}
const collapse = g => assert.equal(mgr(g).damagePersistentUltimate(100000).collapsed, true);
const snap = g => plain([gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeMax(), gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]);
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("有効なUltimate戦闘の開始でゲージが0/100で作られる。既定の最大値は100", () => {
    for (const god of ["apollo", "hermes"]) {
        const g = ready(god);
        assert.deepEqual(plain([gauge(g).hasUltimateGaugeState(), gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeMax(), gauge(g).getUltimateGaugeRate()]), [true, 0, 100, 0]);
        assert.deepEqual(snap(g), [0, 100, false, false]);
        assert.deepEqual(plain(gauge(g).getUltimateGaugeState()), { current: 0, max: 100, gauge: 0, rate: 0, full: false, ready: false });
    }
});
test("Ultimate未選択ならゲージ状態を作らない（戦闘と通常カードは普通に動く）", () => {
    const g = load(); g.startWith(ARROW);
    assert.equal(deck(g).startCardBattle().ok, true);
    assert.deepEqual(plain([gauge(g).hasUltimateGaugeState(), gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeMax(), gauge(g).getUltimateGaugeRate(), gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]),
        [false, 0, 0, 0, false, false]);
    assert.equal(gauge(g).getUltimateGaugeState(), null);
    const r = gauge(g).addUltimateGauge(50, "x");
    assert.deepEqual(plain([r.ok, r.reason, r.gained, r.gauge, r.max]), [false, "noUltimateGauge", 0, 0, 0]);
    assert.equal(deck(g).isCardBattleActive(), true); assert.equal(g.fire().reason, "success");
});
test("仲間が所持する指輪を選択している場合・戦闘外ではゲージ状態を作らない", () => {
    const g = load();
    assert.equal(gauge(g).addUltimateGauge(10).reason, "noUltimateGauge"); // 戦闘外
    deck(g).setUltimateRing("hermes"); g.$gameSystem._projectRCardDeckData.ringOwnershipState.hermes = "actor:3";
    assert.equal(deck(g).startCardBattle().ok, false); // Coreが所持していない指輪のデッキを拒否するため戦闘自体が始まらない
    assert.equal(gauge(g).hasUltimateGaugeState(), false);
    assert.equal(gauge(g).addUltimateGauge(10).reason, "noUltimateGauge");
    assert.equal(deck(g).isCardBattleActive(), false);
});
test("MaxGaugeは設定可能。不正値（0・負・NaN・Infinity・空・文字列）は100へ戻る", () => {
    assert.equal(gauge(ready("apollo", { MaxGauge: "50" })).getUltimateGaugeMax(), 50);
    assert.equal(gauge(ready("apollo", { MaxGauge: "250.5" })).getUltimateGaugeMax(), 250.5);
    for (const bad of ["0", "-5", "abc", "", " ", "NaN", "Infinity", "-Infinity", undefined]) {
        const g = ready("hermes", { MaxGauge: bad });
        assert.equal(gauge(g).getUltimateGaugeMax(), 100, String(bad));
        assert.equal(gauge(g).addUltimateGauge(1000).gauge, 100);
    }
    const none = ready("apollo", {}); assert.equal(gauge(none).getUltimateGaugeMax(), 100);
    const custom = ready("apollo", { MaxGauge: "40" }); gauge(custom).addUltimateGauge(10);
    assert.equal(gauge(custom).getUltimateGaugeRate(), 0.25);
});
test("正の加算が動き、結果オブジェクトに要求量・実加算・現在値・最大値・full/ready・sourceが入る", () => {
    const g = ready("apollo");
    const r = gauge(g).addUltimateGauge(25, "test:src", "g-1");
    assert.deepEqual(plain(r), { ok: true, reason: "added", requested: 25, gained: 25, source: "test:src", gainId: "g-1", gauge: 25, max: 100, rate: 0.25, full: false, ready: false });
    assert.deepEqual(snap(g), [25, 100, false, false]);
    const r2 = gauge(g).addUltimateGauge(10);
    assert.deepEqual(plain([r2.ok, r2.source, r2.gainId, r2.gauge]), [true, null, null, 35]);
});
test("小数加算は決定的: 0.1を10回で1.0、最大値との差が1e-9未満なら最大値として扱う", () => {
    const g = ready("apollo", { MaxGauge: "1" });
    for (let i = 0; i < 10; i++) assert.equal(gauge(g).addUltimateGauge(0.1).ok, true, String(i));
    assert.equal(gauge(g).getUltimateGauge(), 1); assert.equal(gauge(g).isUltimateGaugeFull(), true);
    const h = ready("hermes");
    assert.equal(gauge(h).addUltimateGauge(0.5).gauge, 0.5);
    assert.equal(gauge(h).addUltimateGauge(33.25).gauge, 33.75);
    assert.equal(gauge(h).addUltimateGauge(66.25 - 1e-12).gauge, 100);
    assert.equal(gauge(h).addUltimateGauge(1e-12).reason, "gaugeFull");
});
test("0・負・NaN・Infinity・文字列・null・オブジェクトの加算は拒否し、値もgainIdも変えない", () => {
    const g = ready("apollo"); gauge(g).addUltimateGauge(10);
    for (const bad of [0, -1, -0.5, NaN, Infinity, -Infinity, "5", null, undefined, {}, [], true]) {
        const r = gauge(g).addUltimateGauge(bad, "bad", "bad-id");
        assert.deepEqual(plain([r.ok, r.reason, r.gained, r.gauge]), [false, "invalidAmount", 0, 10], String(bad));
    }
    assert.equal(gauge(g).addUltimateGauge().reason, "invalidAmount");
    assert.equal(gauge(g).getUltimateGauge(), 10); assert.equal(gauge(g).getUltimateGaugeGainCount(), 0);
    for (const badId of [{}, [], NaN, Infinity, true, "" ]) {
        assert.equal(gauge(g).addUltimateGauge(5, "s", badId).reason, "invalidGainId", String(badId));
    }
    assert.equal(gauge(g).getUltimateGauge(), 10);
});
test("最大値でクランプされ、超えない。rateは0〜1。満タンでは実加算0でオーバーフローしない", () => {
    const g = ready("apollo");
    assert.equal(gauge(g).addUltimateGauge(90).gauge, 90);
    const r = gauge(g).addUltimateGauge(30);
    assert.deepEqual(plain([r.ok, r.requested, r.gained, r.gauge, r.rate, r.full]), [true, 30, 10, 100, 1, true]);
    for (const amount of [1, 50, 1e9, Number.MAX_VALUE]) {
        const full = gauge(g).addUltimateGauge(amount);
        assert.deepEqual(plain([full.ok, full.reason, full.gained, full.gauge, full.rate]), [false, "gaugeFull", 0, 100, 1]);
    }
    assert.equal(gauge(g).getUltimateGauge(), 100); assert.equal(gauge(g).getUltimateGaugeRate(), 1);
    const h = ready("hermes"); assert.equal(gauge(h).addUltimateGauge(1e9).gauge, 100);
    assert.equal(gauge(h).addUltimateGauge(Number.MAX_VALUE).gained, 0);
});
test("full問い合わせ: 100でtrue、99.999はfalse。100に達しても自動消費しない", () => {
    const g = ready("apollo");
    gauge(g).addUltimateGauge(99.999); assert.equal(gauge(g).isUltimateGaugeFull(), false);
    gauge(g).addUltimateGauge(0.001); assert.equal(gauge(g).isUltimateGaugeFull(), true);
    for (let i = 0; i < 3; i++) { battleTime(g, 120); gauge(g).addUltimateGauge(5); }
    assert.deepEqual(snap(g), [100, 100, true, true]); // 自動でリセットされない
});
test("gainId: 同じIDは1回だけ加算（重複はduplicateGain）、別IDは別々に加算、ID省略は何度でも直接加算", () => {
    const g = ready("apollo");
    assert.equal(gauge(g).addUltimateGauge(10, "dmg", "damage-attack-42").gained, 10);
    for (let frame = 0; frame < 20; frame++) {
        const r = gauge(g).addUltimateGauge(10, "dmg", "damage-attack-42");
        assert.deepEqual(plain([r.ok, r.reason, r.gained, r.gauge]), [false, "duplicateGain", 0, 10]);
    }
    assert.equal(gauge(g).addUltimateGauge(7, "card", "card-instance-128").gauge, 17);
    assert.equal(gauge(g).addUltimateGauge(3, "dodge", "perfect-dodge-17").gauge, 20);
    assert.equal(gauge(g).addUltimateGauge(5, "x", 42).gauge, 25);
    assert.equal(gauge(g).addUltimateGauge(5, "x", "42").reason, "duplicateGain"); // 数値42と文字列'42'は同一
    for (let i = 0; i < 4; i++) assert.equal(gauge(g).addUltimateGauge(5).ok, true); // 省略時は繰り返し加算
    assert.equal(gauge(g).getUltimateGauge(), 45);
    assert.equal(gauge(g).getUltimateGaugeGainCount(), 4);
    assert.deepEqual(plain([gauge(g).hasUltimateGaugeGainId("damage-attack-42"), gauge(g).hasUltimateGaugeGainId(42), gauge(g).hasUltimateGaugeGainId("nope"), gauge(g).hasUltimateGaugeGainId(null)]),
        [true, true, false, false]);
});
test("満タン時に新しいgainIdを渡しても使用済みにしない（消費後に同じ加算イベントを再処理できる）", () => {
    const g = ready("apollo");
    gauge(g).addUltimateGauge(100, "fill", "fill-1");
    const r = gauge(g).addUltimateGauge(30, "late", "late-1");
    assert.deepEqual(plain([r.ok, r.reason, r.gained, r.gauge, r.gainId]), [false, "gaugeFull", 0, 100, "late-1"]);
    assert.equal(gauge(g).hasUltimateGaugeGainId("late-1"), false);
    assert.equal(gauge(g).consumeUltimateGauge().ok, true);
    assert.equal(gauge(g).addUltimateGauge(30, "late", "late-1").gauge, 30); // 失われていない
    assert.equal(gauge(g).addUltimateGauge(30, "late", "late-1").reason, "duplicateGain");
    // 満タンでの重複は満タン判定より先にduplicateGain
    gauge(g).addUltimateGauge(70, "fill", "fill-2");
    assert.equal(gauge(g).addUltimateGauge(1, "fill", "fill-2").reason, "duplicateGain");
});
test("ready: 満タン+常駐神顕現中でtrue、満タンでなければfalse", () => {
    const g = ready("hermes");
    gauge(g).addUltimateGauge(99); assert.deepEqual(snap(g), [99, 100, false, false]);
    assert.equal(mgr(g).isPersistentUltimateAvailable(), true);
    gauge(g).addUltimateGauge(1); assert.deepEqual(snap(g), [100, 100, true, true]);
    assert.deepEqual(plain([gauge(g).getUltimateGaugeState().ready, gauge(g).getUltimateGaugeState().full]), [true, true]);
});
test("崩壊: ゲージは減らずリセットされない。崩壊中も加算でき、満タンでもreadyはfalse", () => {
    const g = ready("apollo");
    gauge(g).addUltimateGauge(60); collapse(g);
    assert.deepEqual(snap(g), [60, 100, false, false]); assert.equal(gauge(g).hasUltimateGaugeState(), true);
    assert.equal(gauge(g).addUltimateGauge(25, "while-collapsed", "c-1").gauge, 85);
    assert.equal(gauge(g).addUltimateGauge(15).gauge, 100);
    assert.deepEqual(snap(g), [100, 100, true, false]); // full=true, ready=false
    assert.equal(gauge(g).getUltimateGaugeState().ready, false);
    assert.equal(gauge(g).addUltimateGauge(1, "x", "c-2").reason, "gaugeFull");
    assert.equal(mgr(g).isPersistentUltimateCollapsed(), true);
});
test("復帰（15秒・50%）でゲージ100のままreadyがtrueに戻る。復帰ロジックは不変", () => {
    const g = ready("apollo");
    gauge(g).addUltimateGauge(100); collapse(g);
    battleTime(g, 899); assert.deepEqual(snap(g), [100, 100, true, false]);
    battleTime(g, 1);
    assert.deepEqual(plain([mgr(g).getPersistentUltimateStatus(), mgr(g).getPersistentUltimateDivineHp()]), ["active", 50]);
    assert.deepEqual(snap(g), [100, 100, true, true]);
    // 復帰前にまだ満タンでなければ復帰後も値はそのまま。
    const h = ready("hermes"); gauge(h).addUltimateGauge(40); collapse(h); battleTime(h, 900);
    assert.deepEqual(snap(h), [40, 100, false, false]);
});
test("consume: 満タンでなければnotFullで値不変、ゲージ無しはnoUltimateGauge", () => {
    const g = ready("apollo");
    let r = gauge(g).consumeUltimateGauge();
    assert.deepEqual(plain([r.ok, r.reason, r.consumed, r.gauge, r.max]), [false, "notFull", 0, 0, 100]);
    gauge(g).addUltimateGauge(99.5);
    r = gauge(g).consumeUltimateGauge();
    assert.deepEqual(plain([r.ok, r.reason, r.gauge]), [false, "notFull", 99.5]);
    assert.equal(gauge(g).getUltimateGauge(), 99.5);
    const none = load(); assert.equal(deck(none).startCardBattle().ok, true);
    r = gauge(none).consumeUltimateGauge();
    assert.deepEqual(plain([r.ok, r.reason, r.consumed, r.gauge, r.max]), [false, "noUltimateGauge", 0, 0, 0]);
    assert.equal(load().ProjectRUltimateGauge.consumeUltimateGauge().reason, "noUltimateGauge"); // 戦闘外
});
test("consume: 崩壊中はpersistentUltimateUnavailableで値不変。復帰後は成功する", () => {
    const g = ready("hermes");
    gauge(g).addUltimateGauge(100); collapse(g);
    for (let i = 0; i < 3; i++) {
        const r = gauge(g).consumeUltimateGauge();
        assert.deepEqual(plain([r.ok, r.reason, r.consumed, r.gauge, r.full, r.ready]), [false, "persistentUltimateUnavailable", 0, 100, true, false]);
    }
    assert.equal(gauge(g).getUltimateGauge(), 100);
    battleTime(g, 900);
    const ok = gauge(g).consumeUltimateGauge();
    assert.deepEqual(plain([ok.ok, ok.reason, ok.consumed, ok.gauge, ok.full, ok.ready]), [true, "consumed", 100, 0, false, false]);
});
test("consume成功でゲージが0になる。Ultimateは発動せず、神・Divine HP・カードに触れない。gainId履歴は残る", () => {
    const g = ready("apollo"); g.startWith(ARROW);
    gauge(g).addUltimateGauge(100, "fill", "keep-1");
    const hand = plain(deck(g).getBattleState()), battleBefore = plain(mgr(g).getPersistentUltimateBattleState());
    const r = gauge(g).consumeUltimateGauge();
    assert.deepEqual(plain([r.ok, r.reason, r.consumed, r.gauge, r.rate, r.full, r.ready]), [true, "consumed", 100, 0, 0, false, false]);
    assert.deepEqual(plain(mgr(g).getPersistentUltimateBattleState()), battleBefore);
    assert.deepEqual(plain(deck(g).getBattleState()), hand);
    assert.equal(mgr(g).getActiveSummons().length, 0);
    assert.equal(gauge(g).hasUltimateGaugeGainId("keep-1"), true);
    assert.equal(gauge(g).addUltimateGauge(50, "fill", "keep-1").reason, "duplicateGain"); // 消費後も重複加算できない
    assert.equal(gauge(g).consumeUltimateGauge().reason, "notFull"); // 連続消費はできない
});
test("消費後に再び満タンにでき、複数サイクル（満タン→消費）を繰り返せる", () => {
    const g = ready("apollo");
    for (let cycle = 1; cycle <= 4; cycle++) {
        assert.equal(gauge(g).addUltimateGauge(60, "c", `cycle-${cycle}-a`).gauge, 60);
        assert.equal(gauge(g).addUltimateGauge(60, "c", `cycle-${cycle}-b`).gauge, 100);
        assert.deepEqual(snap(g), [100, 100, true, true]);
        assert.equal(gauge(g).consumeUltimateGauge().ok, true);
        assert.deepEqual(snap(g), [0, 100, false, false]);
    }
    collapse(g); battleTime(g, 900); gauge(g).addUltimateGauge(100);
    assert.equal(gauge(g).consumeUltimateGauge().ok, true); // 崩壊を挟んでも使える
});
test("自動では増減しない: 時間経過・待機・崩壊・復帰・Divine HPダメージでゲージは変わらない（カード使用はPhase 4Bで加算元になった）", () => {
    const g = ready("apollo"); g.startWith(ARROW);
    gauge(g).addUltimateGauge(33);
    battleTime(g, 600);
    mgr(g).damagePersistentUltimate(30); assert.equal(gauge(g).getUltimateGauge(), 33);
    assert.equal(g.fire().reason, "success"); assert.equal(gauge(g).getUltimateGauge(), 35); // Phase 4B: CardUseGain(2.0)だけ増える
    collapse(g); assert.equal(gauge(g).getUltimateGauge(), 35);
    battleTime(g, 900); assert.equal(mgr(g).isPersistentUltimateAvailable(), true);
    assert.deepEqual(snap(g), [35, 100, false, false]);
    const fresh = ready("hermes"); battleTime(fresh, 1200); assert.equal(gauge(fresh).getUltimateGauge(), 0);
});
test("戦闘終了でゲージ状態とgainId履歴が消え、次の戦闘は0から始まる", () => {
    const g = ready("apollo");
    gauge(g).addUltimateGauge(100, "x", "end-1");
    deck(g).endCardBattle();
    assert.deepEqual(plain([gauge(g).hasUltimateGaugeState(), gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeMax(), gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady(),
        gauge(g).getUltimateGaugeGainCount(), gauge(g).hasUltimateGaugeGainId("end-1")]), [false, 0, 0, false, false, 0, false]);
    assert.equal(gauge(g).getUltimateGaugeState(), null);
    assert.equal(gauge(g).consumeUltimateGauge().reason, "noUltimateGauge");
    assert.equal(deck(g).startCardBattle().ok, true);
    assert.deepEqual(snap(g), [0, 100, false, false]);
    assert.equal(gauge(g).addUltimateGauge(10, "x", "end-1").gained, 10); // 同じgainIdも新しい戦闘では有効
    assert.equal(deck(g).startCardBattle().ok, true); // 開始し直しでも0から
    assert.deepEqual(plain([gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeGainCount()]), [0, 0]);
});
test("Ultimate選択を外す・失敗した開始では古いゲージを残さない（次の戦闘にゲージ無し）", () => {
    const g = ready("apollo"); gauge(g).addUltimateGauge(50);
    deck(g).endCardBattle(); deck(g).setUltimateRing(null);
    assert.equal(deck(g).startCardBattle().ok, true);
    assert.equal(gauge(g).hasUltimateGaugeState(), false);
    const bad = ready("hermes"); gauge(bad).addUltimateGauge(20);
    assert.equal(deck(bad).startCardBattle(["__no_such_card__"]).ok, false);
    assert.equal(gauge(bad).hasUltimateGaugeState(), false); assert.equal(gauge(bad).getUltimateGauge(), 0);
});
test("マップ移動・onMapLoaded・ロードでゲージ状態とgainIdが消え、ロード後に残らない", () => {
    for (const how of ["setup", "mapLoaded", "load"]) {
        const g = ready("apollo"); gauge(g).addUltimateGauge(70, "x", "z-1");
        if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        assert.deepEqual(plain([gauge(g).hasUltimateGaugeState(), gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeGainCount(), gauge(g).isUltimateReady()]), [false, 0, 0, false], how);
        assert.equal(gauge(g).addUltimateGauge(10).reason, "noUltimateGauge", how);
    }
});
test("ゲージの実行時状態はセーブされない。保存データ・セーブ処理は不変でUltimate選択は保持", () => {
    const g = ready("apollo");
    const before = JSON.stringify(deck(g).getPersistentData());
    gauge(g).addUltimateGauge(100, "save-source", "save-gain-1");
    assert.equal(JSON.stringify(deck(g).getPersistentData()), before);
    const serialized = JSON.stringify(g.DataManager.makeSaveContents());
    assert.equal(/save-gain|save-source|ultimateGauge|currentGauge|maxGauge|gainId/i.test(serialized + before), false);
    assert.equal(Object.keys(g.$gameSystem).some(k => /gauge/i.test(k)), false);
    assert.equal(g.DataManager.makeSaveContents, g.saveBeforePlugin[0]); // セーブ処理を差し替えていない
    g.DataManager.extractSaveContents(JSON.parse(serialized));
    assert.equal(deck(g).getUltimateRingId(), "apollo"); assert.equal(deck(g).hasPlayerRing("apollo"), true);
    assert.equal(gauge(g).hasUltimateGaugeState(), false);
    assert.equal(deck(g).startCardBattle().ok, true); assert.equal(gauge(g).getUltimateGauge(), 0); // ロード後の新戦闘は0から
});
test("返却値・状態は読み取り専用コピー: 結果やsnapshotを書き換えても内部ゲージは変わらない。Set/Mapを公開しない", () => {
    const g = ready("apollo");
    const r = gauge(g).addUltimateGauge(20); r.gauge = 999; r.full = true;
    assert.equal(gauge(g).getUltimateGauge(), 20);
    const state = gauge(g).getUltimateGaugeState();
    assert.throws(() => { state.current = 100; }, TypeError); assert.equal(gauge(g).getUltimateGauge(), 20);
    assert.notEqual(gauge(g).getUltimateGaugeState(), gauge(g).getUltimateGaugeState());
    assert.equal(Object.keys(gauge(g)).some(k => /^state$|^gainIds$|registry/i.test(k)), false);
    gauge(g).clear(); assert.equal(gauge(g).hasUltimateGaugeState(), false); // debug用
    assert.equal(deck(g).isCardBattleActive(), true); assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100); // clearは戦闘・Divine HPに触れない
});
test("Manager欠如・例外でも例外を投げない（readyはfalse、consumeは安全に失敗）", () => {
    const g = ready("apollo"), original = mgr(g);
    gauge(g).addUltimateGauge(100);
    g.ProjectRGodSummonManager = undefined;
    assert.deepEqual(snap(g), [100, 100, true, false]);
    assert.deepEqual(plain([gauge(g).consumeUltimateGauge().ok, gauge(g).consumeUltimateGauge().reason]), [false, "persistentUltimateUnavailable"]);
    g.ProjectRGodSummonManager = { ...original, isPersistentUltimateAvailable() { throw new Error("boom"); } };
    assert.equal(gauge(g).isUltimateReady(), false); assert.equal(gauge(g).consumeUltimateGauge().ok, false);
    assert.equal(gauge(g).addUltimateGauge(1).reason, "gaugeFull");
    g.ProjectRGodSummonManager = original;
    assert.equal(gauge(g).consumeUltimateGauge().ok, true);
});
test("Divine HP・Damage Bridge・一時召喚は不変（Gaugeはそれらを変えず、依存もしない）", () => {
    const g = ready("apollo", null, true), m = mgr(g), br = g.ProjectRUltimateGodDamageBridge;
    gauge(g).addUltimateGauge(100);
    const r = br.damagePersistentUltimateFromGlobalAttack({ attackId: "b1", amount: 20 });
    assert.deepEqual(plain([r.ok, r.divineHp, r.collapsed]), [true, 80, false]);
    assert.equal(br.damagePersistentUltimateFromGlobalAttack({ attackId: "b1", amount: 20 }).reason, "alreadyApplied");
    assert.equal(gauge(g).getUltimateGauge(), 100); // Divine HPダメージでゲージは変わらない
    assert.equal(br.damagePersistentUltimateFromGlobalAttack({ attackId: "b2", amount: 1000 }).collapsed, true);
    assert.deepEqual(snap(g), [100, 100, true, false]);
    assert.equal(br.getRegisteredAttackCount(), 2);
    battleTime(g, 900); assert.deepEqual(plain([m.getPersistentUltimateStatus(), m.getPersistentUltimateDivineHp()]), ["active", 50]);
    deck(g).endCardBattle(); assert.equal(br.getRegisteredAttackCount(), 0); assert.equal(gauge(g).hasUltimateGaugeState(), false);
    for (const file of ["ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge", "ProjectR_CardDeckCore", "ProjectR_CardBattleInput"]) {
        assert.equal(/UltimateGauge/.test(read(`js/plugins/${file}.js`).replace(/\/\*:[\s\S]*?\*\//, "")), false, file);
    }
    // 一時召喚はゲージを持たず、ゲージの影響も受けない。
    const t = ready("hermes"); t.startWith(SWORD); gauge(t).addUltimateGauge(100);
    assert.equal(t.fire().ok, true);
    const summons = mgr(t).getActiveSummons();
    assert.equal(summons.length, 1); assert.equal(/gauge/i.test(Object.keys(summons[0]).join(",")), false);
    assert.equal(gauge(t).getUltimateGauge(), 100);
});
test("7枚のカードはGaugeに依存せず、ゲージ有り/無しで同じ動作（Phase 4B: 攻撃3枚だけ与ダメージ報酬を任意参照）", () => {
    const cards = ["ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm", "ProjectR_HermesSwordsmanship",
        "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesSwiftMovement"];
    assert.equal(cards.length, 7);
    const attackers = new Set(["ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_HermesSwordsmanship"]);
    for (const file of cards) {
        const text = read(`js/plugins/${file}.js`);
        assert.equal(/UltimateGauge/.test(text), attackers.has(file), file);
        // 参照は「任意の」trackDamageだけ（Gaugeが無くても攻撃は同じ）。加算量の式やaddUltimateGaugeは持たない。
        assert.equal(/addUltimateGauge|recordDamageDealt|DamageGainRate/.test(text), false, file);
    }
    const withGauge = ready("apollo"); withGauge.startWith(ARROW);
    const without = load(); without.startWith(ARROW);
    assert.equal(withGauge.fire().reason, "success"); assert.equal(without.fire().reason, "success");
    assert.deepEqual(plain(withGauge.ProjectRApolloGoldenArrow.getActiveProjectiles().length), plain(without.ProjectRApolloGoldenArrow.getActiveProjectiles().length));
    assert.equal(gauge(withGauge).getUltimateGauge(), 2); // Phase 4B: 成功したカード使用でCardUseGain
    // 崩壊中も通常カードは動く（ゲージ満タンでも）。
    const c = ready("apollo"); c.startWith(ARROW); gauge(c).addUltimateGauge(100); collapse(c);
    assert.equal(c.fire().reason, "success"); assert.equal(gauge(c).getUltimateGauge(), 100); // 満タンでも溢れず、カードは通常どおり
});
test("plugins.js: Gaugeが1件登録され、Manager・Bridgeの後・全カードの前。既存entryとparameterは不変", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const index = name => c.$plugins.findIndex(p => p.name === name);
    const entries = c.$plugins.filter(p => p.name === "ProjectR_UltimateGauge");
    assert.equal(entries.length, 1); assert.equal(entries[0].status, true); assert.deepEqual(plain(entries[0].parameters), { MaxGauge: "100", CardUseGain: "2.0", SupportBonusGain: "2.0",
        DamageGainRate: "0.0025", DamageGainPerHitCap: "1.5", ImportantDodgeGain: "5.0" });
    assert.ok(index("ProjectR_UltimateGauge") > index("ProjectR_GodSummonManager"));
    assert.ok(index("ProjectR_UltimateGauge") > index("ProjectR_UltimateGodDamageBridge"));
    for (const card of ["ApolloGoldenArrow", "HermesSwordsmanship", "ApolloLyreCalm", "ApolloDiseaseAttack", "HermesRecognitionObscure", "HermesReedFluteSleep", "HermesSwiftMovement"]) {
        assert.ok(index("ProjectR_UltimateGauge") < index(`ProjectR_${card}`), card);
    }
    assert.deepEqual(plain(c.$plugins[index("ProjectR_GodSummonManager")].parameters), { LifetimeFrames: "12", PersistentOffsetX: "-0.75",
        PersistentOffsetY: "-0.75", DefaultDivineMaxHp: "100", RecoveryDelaySeconds: "15", RecoveryHpRate: "0.5" });
    assert.deepEqual(plain(c.$plugins[index("ProjectR_UltimateGodDamageBridge")].parameters), {});
    const src = read(GAUGE_FILE);
    assert.equal(/@base ProjectR_GodSummonManager/.test(src), true); assert.equal(/@param MaxGauge/.test(src), true);
    assert.equal(/\$gameParty|\$gameActors|setInterval|requestAnimationFrame|Graphics\.frameCount|updateCooldown|Game_Map\.prototype\.update/.test(src.replace(/\/\*:[\s\S]*?\*\//, "")), false); // 受動加算のhookなし
});
console.log(`# ${passed} Phase 4A tests passed`);
