"use strict";
// 指輪モードの Q 枠が空のときの HUD 表示(暗い Q + 「未設定」。ゲージ・神のパネルは出さない)。
// 実エンジン(実Map004 + 全plugin)。HUD の表示データ(ProjectRBattleHUD.getViewModel() = 描画が読む元のデータ)を確かめる。
// 実際の描画(暗い Q のキー・「未設定」の文字・位置・色)は Node では扱わない → tools/mz_cdp/field_ring_hudq_verify.cjs(実機のスクリーンショット)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, H = w => w.ctx.ProjectRBattleHUD;
const GA = w => w.ctx.ProjectRUltimateGauge;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const vm = w => plain(H(w).getViewModel());
const fill = w => GA(w).addUltimateGauge(GA(w).getUltimateGaugeMax(), "test");
const pressQ = w => { w.keyDown("KeyQ", 81); frames(w, 3); w.keyUp("KeyQ", 81); frames(w, 1); };
const CARDS = ["hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength", "apollo_golden_volley", "apollo_eros_arrow"];

function world({ q = null, extra = [], source = "auto", slots = { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "hermes_issen", x: "apollo_golden_volley", c: "apollo_eros_arrow" }, begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource(source);
    for (const ring of ["hermes", "apollo", ...extra]) { assert.equal(D(w).assignRingToPlayer(ring).ok, true, ring); assert.equal(RL(w).equipRing(ring).ok, true, ring); }
    for (const id of CARDS) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot);
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false }); }
    return w;
}

test("【1】Q が空(指輪モード): Ultimate 区画のデータは「Q の空の枠」(slotEmpty・キー Q)。ゲージなし・神のパネルなし。ほかの枠は変わらない", () => {
    const w = world({ q: null, extra: ["athena"] });
    const v = vm(w);
    assert.deepEqual([v.ultimate.slotEmpty, v.ultimate.key, v.ultimate.keyActive, v.ultimate.available, v.ultimate.state, v.ultimate.mode], [true, "Q", true, false, "none", "card"]);
    assert.equal(w.ctx.ProjectRUltimateGauge.hasUltimateGaugeState(), false, "ゲージの状態は作らない");
    assert.equal(w.ctx.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), false, "常駐の神がいない");
    assert.equal(v.divine, null, "神のパネルは出ない: " + JSON.stringify(v.divine));
    // ほかの枠(LMB・Shift・E・X・C・V)の表示データは、Q が割り当て済みの同じ編成と同じ
    const w2 = world({ q: "hermes" });
    assert.deepEqual(vm(w).slots, vm(w2).slots, "スキル枠の表示は Q の有無で変わらない");
    FC(w).end("test"); FC(w2).end("test");
});

test("【2】Q が割り当て済み: 充填中 → READY → 発動後。従来の表示のまま(slotEmpty なし・ゲージあり・神のパネルあり)", () => {
    const w = world({ q: "hermes" });
    let u = vm(w).ultimate;
    assert.equal(u.slotEmpty, undefined); assert.deepEqual([u.available, u.state, u.key, u.max], [true, "charging", "Q", 100]);
    assert.deepEqual([vm(w).divine.godId, vm(w).divine.status], ["hermes", "active"], "神のパネルが出る: " + JSON.stringify(vm(w).divine));
    GA(w).addUltimateGauge(40, "test"); u = vm(w).ultimate; assert.deepEqual([u.state, u.value, u.progress], ["charging", 40, 0.4]);
    fill(w); u = vm(w).ultimate; assert.deepEqual([u.state, u.ready, u.slotEmpty], ["ready", true, undefined]);
    pressQ(w); u = vm(w).ultimate; assert.equal(u.slotEmpty, undefined); assert.equal(u.executing, true, "発動中は ULTIMATE ACTIVE(従来)"); assert.equal(u.value, 0);
    frames(w, 400); u = vm(w).ultimate; assert.deepEqual([u.state, u.value, u.slotEmpty], ["charging", 0, undefined], "発動後は充填中へ戻る");
    FC(w).end("test");
});

test("【3】割り当て済みで使えない Q(Athena・奥義の処理の解除): 暗い Q + 「使用不可」(slotUnavailable)。ゲージ・神のパネルなし。HUD の状態は unavailable", () => {
    const j = world({ q: null, extra: ["athena"], begin: false }); assert.equal(RL(j).setUltimate("athena").ok, true);
    assert.equal(FC(j).begin().ok, true); frames(j, 2);
    let u = vm(j).ultimate; assert.deepEqual([u.slotUnavailable, u.slotEmpty, u.key, u.keyActive, u.available, u.state], [true, undefined, "Q", true, false, "none"]);
    assert.equal(vm(j).divine, null, "神のパネルなし"); assert.equal(GA(j).hasUltimateGaugeState(), false);
    assert.equal(plain(FC(j).getHudState()).slots.find(x => x.slot === "ultimate").state, "unavailable");
    FC(j).end("test");
    // 開始時は有効だったが、戦闘中に奥義の処理が外れた: 割り当ては残っている(getUltimate は hermes)→「使用不可」。ゲージは表示しない・消費もしない
    const h = world({ q: "hermes" }); fill(h); assert.equal(vm(h).ultimate.state, "ready");
    assert.equal(h.ctx.ProjectRUltimateActivation.unregisterUltimateHandler("hermes").removed, true);
    u = vm(h).ultimate; assert.deepEqual([u.slotUnavailable, u.slotEmpty], [true, undefined]); assert.equal(vm(h).divine, null, "神のパネルも隠す(常駐の神の状態自体は残る)");
    assert.equal(GA(h).getUltimateGauge(), GA(h).getUltimateGaugeMax(), "ゲージは減らない(表示だけ)"); assert.equal(RL(h).getUltimate(), "hermes");
    FC(h).end("test");
});

test("【3b】検証で割り当てがすでに外れた Q(戦闘中の所有の変更)は「使用不可」ではなく「未設定」。legacy・戦闘外は従来どおり", () => {
    const w = world({ q: "apollo" }); assert.equal(vm(w).ultimate.state, "charging");
    const d = D(w), orig = d.getRingOwner; d.getRingOwner = ringId => (ringId === "apollo" ? "actor:2" : orig.call(d, ringId));       // Core は戦闘中の移動を拒否するので、所有の変更は差し替えで再現
    assert.equal(RL(w).getUltimate(), null, "RingLoadout の検証で外れている");
    const u = vm(w).ultimate; assert.deepEqual([u.slotEmpty, u.slotUnavailable], [true, undefined]); assert.equal(vm(w).divine, null);
    assert.equal(plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate").state, "empty");
    assert.equal(plain(FC(w).getUltimateState()).reason, "ultimateUnavailable", "発動の判定は変えない(使用不可のまま・ゲージは消費しない)");
    d.getRingOwner = orig; FC(w).end("test");
    // legacy: Q の枠という考え方がない(従来)
    const l = world({ source: "legacy" }); assert.equal(FC(l).getLoadoutMode(), "legacy");
    assert.deepEqual([vm(l).ultimate.slotEmpty, vm(l).ultimate.slotUnavailable], [undefined, undefined]); assert.equal(vm(l).ultimate.state, "charging", "legacy はヘルメースの自動選択どおり"); assert.ok(vm(l).divine, "legacy は神のパネルあり");
    FC(l).end("test");
    // 戦闘外・戦闘の終了後
    const e = world({ q: null, begin: false });
    assert.deepEqual([vm(e).ultimate.slotEmpty, vm(e).ultimate.slotUnavailable], [undefined, undefined], "戦闘の前"); assert.equal(FC(e).begin().ok, true); frames(e, 2); assert.equal(vm(e).ultimate.slotEmpty, true);
    FC(e).end("test"); assert.deepEqual([vm(e).ultimate.slotEmpty, vm(e).ultimate.slotUnavailable], [undefined, undefined], "戦闘の終了後");
});

test("【4】Q を設定して次の戦闘を始めると、空の Q の表示は消える(戦闘ごとの写し)。保存データ(RingLoadout・Core)は表示で変わらない", () => {
    const w = world({ q: null });
    const snap = () => JSON.stringify([plain(RL(w).getState()), D(w).getPersistentData()]);
    const before = snap();
    assert.equal(vm(w).ultimate.slotEmpty, true); FC(w).end("test");
    assert.equal(snap(), before, "表示だけ。保存データは変わらない");
    assert.equal(RL(w).setUltimate("apollo").ok, true);
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    assert.deepEqual([vm(w).ultimate.slotEmpty, vm(w).ultimate.state], [undefined, "charging"]);
    FC(w).end("test");
});

test("【5】描画側(ProjectR_BattleHUD): slotEmpty = 暗い Q +「未設定」/ slotUnavailable = 暗い Q +「使用不可」。ゲージ・数値は隠す。通常の描画は、どちらも無いときだけ", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_BattleHUD.js"), "utf8");
    assert.match(src, /未設定/); assert.match(src, /使用不可/); assert.match(src, /slotEmpty/); assert.match(src, /slotUnavailable/);
    assert.ok(src.includes('data.mode !== "card" || data.available || !!data.slotEmpty || !!data.slotUnavailable'), "区画の表示条件に加えただけ(それ以外のときは従来どおり隠す)");
    assert.match(src, /applySlotEmpty\(true, data\.slotUnavailable \? "使用不可" : "未設定"\)[\s\S]*?return;[\s\S]*?applySlotEmpty\(false\)[\s\S]*?redrawGauge\(data\)/, "暗い表示のときはゲージの再描画をせず、そうでなければ元に戻してから従来の描画");
});

console.log(`\nall ${passed} passed`);
