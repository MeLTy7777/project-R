"use strict";
// Stage 3: Themis の Ultimate「神罰・最後の審判」(ProjectR_ThemisUltimate)を、既存の GodSummonManager・UltimateActivation・共有ゲージ・Q(RingLoadout の Q 枠)・HUD で。
// 実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。入力は本物の Q キー。実機の見た目・Q 入力は tools/mz_cdp/themis_verify.cjs。
//   【1】登録: handler 登録済み → ULTIMATE 画面・Q 枠で選べる。Q が空なら自動では入らない・Core の選択は触らない・Hermes / Apollo / Janus は変わらない
//   【2】発動: Q・満タンのゲージ → カーソル方向 4 マス以内に裁きの輪 → 0.8 秒後 半径 2.8 マス・250 % × (1 + 0.2 × 罪状)・各敵1回・命中した敵の罪状だけ消費・成功後だけゲージ消費
//   【3】失敗ではゲージを減らさない。この奥義のダメージではゲージは増えない
//   【4】後始末: 戦闘の終了・マップ移動で中断(ダメージも罪状消費もなし)・保存しない  【5】HUD・神のパネル・カットインなし・ほかの神の絵を出さない
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { TEMP_RING, addTempRing } = require("./ProjectR_TempRing.cjs");
const { buildWorld, plain, attachHpBars, placePolar, placeEnemy, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, GM = w => w.ctx.ProjectRGodSummonManager;
const TU = w => w.ctx.ProjectRThemisUltimate, TS = w => w.ctx.ProjectRThemisSkills, CI = w => w.ctx.ProjectRCutIn;
const THEMIS = ["themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const fill = w => GA(w).addUltimateGauge(GA(w).getUltimateGaugeMax(), "test");
const gauge = w => ({ has: GA(w).hasUltimateGaugeState(), cur: GA(w).getUltimateGauge(), max: GA(w).getUltimateGaugeMax() });
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());
const persistent = w => JSON.stringify(D(w).getPersistentData());
const ev = (w, id) => w.ctx.$gameMap.event(id);
const sin = (w, id) => TS(w).sin.stacksOf(ev(w, id));
const addSin = (w, id, n = 1) => { for (let i = 0; i < n; i++) TS(w).sin.add(ev(w, id), "test"); };
const W = 100;

function world({ q = "themis", core = null, rings = ["themis"], begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of THEMIS) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    if (core) assert.equal(D(w).setUltimateRing(core).ok, true);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
// 裁きの輪の中心(カーソル 3 マス先)に対して、距離 d・向き(中心から見た)で敵を置く
const placeAround = (w, id, d, dx = 0, dy = 0) => { const c = center(w); placeEnemy(w, id, c.x + dx, c.y - 3.0 + dy + d); };

test("【1】登録: Themis の handler がある → ULTIMATE 画面・Q 枠で選べる(未所持は選べない)。Q が空なら自動では入らない。Core の選択は触らない(Q = themis・Core = hermes)", () => {
    const w = world({ q: "themis", core: "hermes", rings: ["themis", "hermes"] });
    assert.equal(UA(w).hasUltimateHandler("themis"), true); assert.deepEqual(plain(UA(w).getRegisteredUltimateGods()), ["apollo", "athena", "hermes", "janus", "themis"]);
    assert.equal(plain(TU(w).getRegistration()).ok, true); const temp = addTempRing(w); assert.equal(UA(w).hasUltimateHandler(temp.ringId), false, "一時の指輪(未実装)に奥義の処理は無い");
    const entry = plain(w.ctx.ProjectRMenuCore.ultimate.entries()).find(e => e.ringId === "themis"); assert.equal(entry.implemented, true, "ULTIMATE 画面: 実装済み");
    assert.equal(plain(w.ctx.ProjectRMenuCore.ultimate.entries()).find(e => e.ringId === temp.ringId).implemented, false);
    assert.equal(plain(FC(w).getUltimateState()).ringId, "themis"); assert.equal(GM(w).getPersistentUltimateRingId(), "themis"); assert.equal(GM(w).getPersistentUltimateGodId(), "themis");
    assert.equal(D(w).getUltimateRingId(), "hermes", "Core の選択(ULTIMATE 画面)は別のまま");
    FC(w).end("test");
    const e = world({ q: null, rings: ["themis"] });                                                          // Themis を装備しているだけでは Q は自動で入らない
    assert.equal(RL(e).getUltimate(), null); assert.equal(plain(FC(e).getUltimateState()).reason, "emptySlot"); assert.equal(GM(e).hasPersistentUltimateBattleState(), false);
    pressQ(e); assert.equal(TU(e).isActive(), false); assert.equal(D(e).getUltimateRingId(), null, "Core の選択も自動では入らない"); FC(e).end("test");
});

test("【2】発動: 満タンで Q → カーソル 3 マス先に裁きの輪。0.8 秒後 半径 2.8 マス・250 %(罪状なし)。範囲外・壁の向こうは当たらない・各敵1回・ゲージは成功後だけ 0 へ", () => {
    const w = world(); aimDegree(w, 0, 3); const c = center(w);
    placeAround(w, 3, 0); placeAround(w, 4, 2.0, 1.0, 0); placeAround(w, 5, 3.6, 0, 0); placeEnemy(w, 6, c.x + 1.0, c.y + 1.0);                       // 中心 / 中心から約 2.2 / 中心から 3.6(体の端 3.1 > 2.8)/ 主人公のすぐ後ろ(中心から 4 以上)
    fill(w); const max = gauge(w).max; resetHp(w);
    pressQ(w, 1);
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.deepEqual([r.ok, r.started, r.godId, r.ringId, r.consumed], [true, true, "themis", "themis", max], JSON.stringify(r));
    assert.equal(gauge(w).cur, 0, "成功後にゲージ消費"); assert.equal(TU(w).isActive(), true);
    near(plain(TU(w).getState()).center.y, c.y - 3, 0.1, "輪の中心 = カーソル 3 マス先"); near(plain(TU(w).getState()).radius, 2.8, 1e-9);
    frames(w, 40); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [0, 0, 0, 0], "0.8 秒(48 フレーム)より前はダメージなし");
    frames(w, 14); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 2.5, W * 2.5, 0, 0], "0.8 秒後: 半径 2.8 マス・250 %");
    frames(w, 60); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 2.5, W * 2.5, 0, 0], "各敵1回だけ(あとから増えない)");
    assert.equal(TU(w).isActive(), false); const res = plain(TU(w).getLastResult()); assert.equal(res.reason, "completed"); assert.deepEqual(res.hit.map(h => h.eventId).sort(), [3, 4]);
    FC(w).end("test");
});

test("【2b】ダメージ = 250 % × (1 + 0.2 × 罪状 0〜3)。敵ごとの罪状で変わる・命中した敵の罪状だけ全部消費・範囲外の敵の罪状は残る・ボスにも効く", () => {
    const w = world(); aimDegree(w, 0, 3);
    placeAround(w, 3, 0); placeAround(w, 4, 1.0, 1.0, 0); placeAround(w, 5, 1.0, -1.0, 0); placeAround(w, 6, 5.0, 0, 0); markBossOf(w, 5);
    addSin(w, 3, 0); addSin(w, 4, 2); addSin(w, 5, 3); addSin(w, 6, 3);
    fill(w); resetHp(w); pressQ(w, 1); assert.deepEqual([3, 4, 5, 6].map(i => sin(w, i)), [0, 2, 3, 3], "発動の時点では消費しない");
    frames(w, 70);
    near(lost(w, 3), W * 2.5 * 1.0, 1.01, "罪状 0: 250%"); near(lost(w, 4), W * 2.5 * 1.4, 1.01, "罪状 2: 250% × 1.4"); near(lost(w, 5), W * 2.5 * 1.6, 1.01, "罪状 3(ボス): 250% × 1.6"); assert.equal(lost(w, 6), 0, "範囲外");
    assert.deepEqual([3, 4, 5, 6].map(i => sin(w, i)), [0, 0, 0, 3], "命中した敵の罪状は全部消費・範囲外の敵の罪状は残る");
    assert.deepEqual(plain(TU(w).getLastResult()).hit.map(h => [h.eventId, h.stacks]).sort((a, b) => a[0] - b[0]), [[3, 0], [4, 2], [5, 3]]);
    FC(w).end("test");
});
function markBossOf(w, id) { const e = ev(w, id); e.event().note = (e.event().note || "") + "<fieldBoss: テストボス>"; }

test("【2c】発動してから輪が開くまでに罪状が増えた・減った場合は、ダメージの時点の罪状で計算する(0.8 秒のあいだに期限切れなら罪状 0 で計算)・通常の物理ダメージ(防御は無視しない)", () => {
    const w = world(); aimDegree(w, 0, 3); placeAround(w, 3, 0); placeAround(w, 4, 1.0, 1.0, 0); addSin(w, 3, 1);
    fill(w); resetHp(w); pressQ(w, 1); frames(w, 10); addSin(w, 3, 2); addSin(w, 4, 1);                  // 輪が開いている間に増える
    const calls = []; const orig = w.ctx.PluginManager.callCommand; w.ctx.PluginManager.callCommand = function (i, plugin, name, args) { calls.push({ name, args }); return orig.apply(this, arguments); };
    frames(w, 60); near(lost(w, 3), W * 2.5 * 1.6, 1.01, "ダメージの時点で罪状 3"); near(lost(w, 4), W * 2.5 * 1.2, 1.01, "ダメージの時点で罪状 1");
    const dmg = calls.filter(k => k.name === "UpdateEventHp"); assert.ok(dmg.length >= 2 && dmg.every(k => !k.args.projectRFixed && /player weapon/.test(String(k.args.value))), "固定ダメージ(防御無視)は使わない");
    FC(w).end("test");
});

test("【2d】カーソルが 4 マスより遠い・壁があるとき: 4 マスで止まる / 壁の手前で止まる。壁を挟んだ敵には当たらない", () => {
    const w = world(); aimDegree(w, 0, 9); const c = center(w);
    fill(w); pressQ(w, 1); near(plain(TU(w).getState()).center.y, c.y - 4, 0.1, "4 マスで止まる"); assert.equal(TU(w).isActive(), true); FC(w).end("test");
    const v = world(); aimDegree(v, 0, 3.5); const cv = center(v);
    for (let x = Math.floor(cv.x) - 3; x <= Math.floor(cv.x) + 3; x++) setRegion(v, x, Math.floor(cv.y - 1.5), 255);
    placeEnemy(v, 3, cv.x, cv.y - 2.4);
    fill(v); resetHp(v); pressQ(v, 1); const cy = plain(TU(v).getState()).center.y, wallBottom = Math.floor(cv.y - 1.5) + 1; assert.ok(cy >= wallBottom && cy < cv.y, `壁(Region 255。下端 ${wallBottom})の手前(主人公側)で止まる: ` + cy);
    frames(v, 70); assert.equal(lost(v, 3), 0, "壁の向こうの敵には当たらない"); FC(v).end("test");
});

test("【3】失敗ではゲージを減らさない: ゲージ不足(gaugeNotFull)・発動中の二重発動(ultimateStartFailed)・カーソルなし。この奥義のダメージでゲージは増えない", () => {
    const w = world(); aimDegree(w, 0, 3);
    pressQ(w, 1); assert.equal(last(w).reason, "gaugeNotFull"); assert.equal(TU(w).isActive(), false); assert.equal(gauge(w).cur, 0);
    fill(w); pressQ(w, 1); assert.equal(TU(w).isActive(), true); assert.equal(gauge(w).cur, 0);
    fill(w); const max = gauge(w).max; pressQ(w, 1);                                                           // 発動中にもう一度
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.equal(r.ok, false); assert.equal(r.reason, "ultimateStartFailed"); assert.equal(r.handlerReason, "ultimateEffectActive");
    assert.equal(gauge(w).cur, max, "失敗ではゲージは減らない");
    placeAround(w, 3, 0); addSin(w, 3, 3); resetHp(w); frames(w, 70); assert.ok(lost(w, 3) > 0); assert.equal(gauge(w).cur, max, "この奥義のダメージではゲージは増えない(満タンのまま = 増えれば超える/ 0 からも増えない)");
    FC(w).end("test");
    const z = world(); aimDegree(z, 0, 3); placeAround(z, 3, 0); resetHp(z); fill(z); pressQ(z, 1); assert.equal(gauge(z).cur, 0); frames(z, 70); assert.ok(lost(z, 3) > 0);
    assert.equal(gauge(z).cur, 0, "ゲージが 0 のときに奥義が命中しても、ゲージは増えない(奥義のダメージは充填の対象外)"); FC(z).end("test");
    const g = world(); fill(g); const gmax = gauge(g).max; g.mouse(NaN, NaN); pressQ(g, 1);
    const r2 = plain(UA(g).getLastUltimateActivationResult()); assert.equal(r2.ok, false, JSON.stringify(r2)); assert.equal(gauge(g).cur, gmax, "開始に失敗したときはゲージを消費しない"); assert.equal(TU(g).isActive(), false);
    FC(g).end("test");
});

test("【3b】通常スキルのダメージは従来どおりゲージを増やす(戒律の宣告・断罪の判決)。奥義のダメージだけが対象外", () => {
    const w = world({ begin: false }); assert.equal(RL(w).setSkill("e", "themis_edict").ok, true);
    assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); placePolar(w, 3, 2.0, 0);
    const e = ev(w, 3), m = w.ctx.$gameMap, p = w.ctx.ProjectR.CombatOcclusion.eventPolygon(e);
    w.mouse((p.reduce((s, q) => s + q.x, 0) / p.length - m.displayX()) * m.tileWidth(), (p.reduce((s, q) => s + q.y, 0) / p.length - m.displayY()) * m.tileHeight());
    const g0 = gauge(w).cur; assert.equal(plain(FC(w).useAbility("special")).ok, true); frames(w, 3); assert.ok(gauge(w).cur > g0, "通常スキルのダメージでゲージが増える: " + g0 + " → " + gauge(w).cur);
    FC(w).end("test");
});

test("【4】後始末: 戦闘の終了・マップ移動で中断(ダメージなし・罪状は消費しない・ゲージは返さない)。保存データ(RingLoadout・Core)は変わらない。Hermes・Apollo・Janus の奥義は従来どおり", () => {
    const w = world(); aimDegree(w, 0, 3); placeAround(w, 3, 0); addSin(w, 3, 2); const data0 = persistent(w), rl0 = JSON.stringify(plain(RL(w).getState()));
    fill(w); resetHp(w); pressQ(w, 1); frames(w, 10); FC(w).end("test"); assert.equal(TU(w).isActive(), false, "戦闘の終了で中断"); assert.equal(plain(TU(w).getLastResult()).reason, "battleEnded");
    frames(w, 80); assert.equal(lost(w, 3), 0, "中断後はダメージなし"); assert.equal(gauge(w).has, false, "戦闘が終われば、ゲージ状態も消える");
    assert.equal(persistent(w), data0); assert.equal(JSON.stringify(plain(RL(w).getState())), rl0);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/themis_ultimate|ThemisUltimate/.test(saved), false, "セーブ内容に奥義の状態は入らない");
    const m = world(); aimDegree(m, 0, 3); fill(m); pressQ(m, 1); assert.equal(TU(m).isActive(), true);
    m.run("$gameMap.setup($gameMap.mapId())"); assert.equal(TU(m).isActive(), false); assert.equal(plain(TU(m).getLastResult()).reason, "mapChanged");
    for (const [ring, host, flag] of [["hermes", "ProjectRHermesUltimate", "isHermesUltimateActive"], ["apollo", "ProjectRApolloUltimate", "isApolloUltimateActive"]]) {
        const h = world({ q: ring, rings: ["themis", ring] }); aimDegree(h, 0, 3); fill(h); pressQ(h, 1);
        assert.equal(h.ctx[host][flag](), true, ring + " の奥義が発動"); assert.equal(TU(h).isActive(), false, "Themis の奥義は動かない"); assert.equal(gauge(h).cur, 0);
        FC(h).end("test");
    }
    const j = world({ q: "janus", rings: ["themis", "janus"] }); aimDegree(j, 0, 3); fill(j); pressQ(j, 1);
    assert.equal(j.ctx.ProjectRJanusUltimate.isActive(), true, "Janus の奥義が発動"); assert.equal(TU(j).isActive(), false); FC(j).end("test");
});

test("【5】HUD: Q は充填中 → READY → 発動後に充填中へ。神のパネルは THEMIS。U キーは指輪モードでは無効。カットインなし(noArtwork)・ほかの神の絵を出さない・神の表示の見た目は無い", () => {
    const w = world(); aimDegree(w, 0, 3);
    const ult = () => plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate"), vm = () => plain(w.ctx.ProjectRBattleHUD.getViewModel());
    assert.deepEqual([ult().state, ult().ready], ["charging", false]); assert.equal(vm().divine.godId, "themis"); assert.equal(vm().ultimate.slotEmpty, undefined);
    fill(w); assert.deepEqual([ult().state, ult().ready, vm().ultimate.state], ["ready", true, "ready"]);
    const u = UA(w).getInputBinding(); w.keyDown(u.code, u.keyCode); frames(w, 3); w.keyUp(u.code, u.keyCode); frames(w, 2); assert.equal(TU(w).isActive(), false, "U は無効");
    pressQ(w, 1); assert.equal(TU(w).isActive(), true); assert.equal(ult().state, "charging"); assert.equal(gauge(w).cur, 0); frames(w, 70); assert.equal(ult().state, "charging");
    assert.deepEqual(plain(CI(w).show({ kind: "ultimate", godId: "themis" })), { ok: false, reason: "noArtwork" }, "カットインは出さない(ほかの神の絵で代用しない)");
    assert.deepEqual(plain(CI(w).show({ kind: "card", godId: "themis", cardId: "themis_edict" })), { ok: false, reason: "noArtwork" });
    assert.deepEqual(plain(CI(w).getActive()), []); assert.equal(Object.prototype.hasOwnProperty.call(plain(CI(w).assets().gods), "themis"), false, "Themis の絵の登録は無い(用意されたら GodEyesJson へ足すだけ)");
    assert.deepEqual(plain(w.ctx.ProjectRGodSummonVisual.getAppearance("themis")), {}, "神の表示の見た目は、Themis には無い(ほかの神の絵で代用しない)");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getVisuals()).filter(v => v.godId !== "themis").length, 0, "同行の表示にほかの神は出ない");
    FC(w).end("test");
});

test("【5b】旧い保存データ(Themis のスキル・奥義を持たない RingLoadout)がそのまま読め、Themis を持っていなければ何も変わらない(移行不要)。未実装の指輪(一時の指輪)は未実装のまま", () => {
    const w = world({ q: null, rings: ["hermes"], begin: false }); const s0 = JSON.stringify(plain(RL(w).getState()));
    assert.equal(RL(w).getUltimate(), null); assert.deepEqual(plain(RL(w).getUnlockedSkills("themis")), [], "未所持の Themis のスキルは解放されない");
    assert.equal(RL(w).setUltimate("themis").ok, false, "未所持の Themis は Q に入らない"); assert.equal(JSON.stringify(plain(RL(w).getState())), s0, "失敗しても何も変わらない");
    const temp = addTempRing(w); temp.own(); temp.equip(); assert.equal(RL(w).setUltimate(temp.ringId).ok, true, "API では入るが");
    assert.equal(UA(w).hasUltimateHandler(temp.ringId), false, "一時の指輪の奥義の処理は無い(未実装のまま)"); assert.deepEqual(plain(RL(w).getRingSkills(temp.ringId)), []); assert.equal(temp.cleanup().removed, true);
});

console.log(`\nall ${passed} passed`);
