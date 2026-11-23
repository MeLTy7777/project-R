"use strict";
// Stage 2-C: Janus の Ultimate「始まりと終わりの門」(ProjectR_JanusUltimate)を、既存の GodSummonManager・UltimateActivation・共有ゲージ・Q(RingLoadout の Q 枠)・HUD で。
// 実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。入力は本物の Q キー。実機の見た目・Q 入力は tools/mz_cdp/janus_verify.cjs。
//   【1】登録: handler 登録済み → ULTIMATE 画面・Q 枠で選べる(実装済み)。Q が空なら自動では入らない・Core の選択は触らない
//   【2】発動: Q・満タンのゲージ → カーソル方向 4 マス以内に2つの門 → 0.3 秒後 半径 2 / 150 %・0.9 秒後 半径 2.8 / 250 %・各回1回・成功後だけゲージ消費
//   【3】失敗ではゲージを減らさない(ゲージ不足・二重発動・準備が整わない)。この奥義のダメージではゲージは増えない
//   【4】後始末: 戦闘の終了・マップ移動で中断(ダメージなし)・保存しない。Hermes・Apollo の奥義は変わらない
//   【5】HUD(Q の充填中 / READY / 発動後)・神のパネル(JANUS)
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, GM = w => w.ctx.ProjectRGodSummonManager, JU = w => w.ctx.ProjectRJanusUltimate;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const fill = w => GA(w).addUltimateGauge(GA(w).getUltimateGaugeMax(), "test");
const gauge = w => ({ has: GA(w).hasUltimateGaugeState(), cur: GA(w).getUltimateGauge(), max: GA(w).getUltimateGaugeMax() });
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());
const persistent = w => JSON.stringify(D(w).getPersistentData());
const W = 100;

function world({ q = "janus", core = null, rings = ["janus"], begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    if (core) assert.equal(D(w).setUltimateRing(core).ok, true);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}

test("【1】登録: Janus の handler がある → ULTIMATE 画面・Q 枠で選べる。Q が空なら自動では入らない。Core の選択は触らない(Q = janus・Core = hermes)", () => {
    const w = world({ q: "janus", core: "hermes", rings: ["janus", "hermes"] });
    assert.equal(UA(w).hasUltimateHandler("janus"), true); assert.deepEqual(plain(UA(w).getRegisteredUltimateGods()), ["apollo", "hermes", "janus"]);
    assert.equal(plain(JU(w).getRegistration()).ok, true);
    const entry = plain(w.ctx.ProjectRMenuCore.ultimate.entries()).find(e => e.ringId === "janus"); assert.equal(entry.implemented, true, "ULTIMATE 画面: 実装済み");
    assert.equal(plain(FC(w).getUltimateState()).ringId, "janus"); assert.equal(GM(w).getPersistentUltimateRingId(), "janus"); assert.equal(GM(w).getPersistentUltimateGodId(), "janus");
    assert.equal(D(w).getUltimateRingId(), "hermes", "Core の選択(ULTIMATE 画面)は別のまま");
    FC(w).end("test");
    const e = world({ q: null, rings: ["janus"] });                                                         // Janus を装備しているだけでは Q は自動で入らない
    assert.equal(RL(e).getUltimate(), null); assert.equal(plain(FC(e).getUltimateState()).reason, "emptySlot"); assert.equal(GM(e).hasPersistentUltimateBattleState(), false);
    pressQ(e); assert.equal(JU(e).isActive(), false); FC(e).end("test");
});

test("【2】発動: 満タンで Q → 2つの門(カーソル 3 マス先)。0.3 秒後 半径 2 マス・150 %、0.9 秒後 半径 2.8 マス・250 %。各回1回・ゲージは成功後だけ 0 へ", () => {
    const w = world(); aimDegree(w, 0, 3);
    const c = center(w); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 90); placePolar(w, 5, 5.6, 0); placePolar(w, 6, 7.0, 0);          // 門の中心 / 中心から 3.0 離れた(体の端が半径 2 に届かないが 2.8 の内側)/ 中心から 2.6 / 遠い
    // ↑ 4 は主人公の右 3.0・上 0 → 中心(上 3.0)から √18 = 4.2 離れる。判定用に置き直す
    placePolar(w, 4, 3.0, 20);                                                                              // 中心(真上 3.0)から約 1.0 離れる = 2 つの範囲の内側
    placeAt(w, 5, c.x, c.y - 3.0 + 2.6);                                                                    // 中心から 2.6(体の端 2.1 > 2.0 / < 2.8)
    placeAt(w, 6, c.x, c.y - 3.0 + 3.6);                                                                    // 中心から 3.6(体の端 3.1 > 2.8)
    fill(w); const max = gauge(w).max; resetHp(w);
    pressQ(w, 1);
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.deepEqual([r.ok, r.started, r.godId, r.ringId, r.consumed], [true, true, "janus", "janus", max], JSON.stringify(r));
    assert.equal(gauge(w).cur, 0, "成功後にゲージ消費"); assert.equal(JU(w).isActive(), true);
    near(plain(JU(w).getState()).center.y, c.y - 3, 0.1, "門の中心 = カーソル 3 マス先");
    frames(w, 10); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [0, 0, 0, 0], "0.3 秒より前はダメージなし");
    frames(w, 12); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 1.5, W * 1.5, 0, 0], "0.3 秒後: 半径 2 マス・150 %(5 は体の端が 2.0 の外)");
    frames(w, 20); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 1.5, W * 1.5, 0, 0], "0.3 秒〜0.9 秒の間は増えない(各回1回)");
    frames(w, 30);
    assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 4, W * 4, W * 2.5, 0], "0.9 秒後: 半径 2.8 マス・250 %(中の2体は合計 400 %・5 は 250 %・6 は届かない)");
    assert.equal(JU(w).isActive(), false); const res = plain(JU(w).getLastResult()); assert.equal(res.reason, "completed");
    assert.deepEqual(res.hits.map(h => [h.key, [...h.hit].sort()]), [["first", [3, 4]], ["second", [3, 4, 5]]]);
    frames(w, 60); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [W * 4, W * 4, W * 2.5, 0], "終わったあとは増えない");
    FC(w).end("test");
});
function placeAt(w, id, x, y) { return fx.placeEnemy(w, id, x, y); }

test("【2b】カーソルが 4 マスより遠い・壁があるとき: 4 マスで止まる / 壁の手前で止まる(有効な場所)。カーソルがプレイヤーの足元でもプレイヤー中心", () => {
    const w = world(); aimDegree(w, 0, 9); const c = center(w);
    fill(w); pressQ(w, 1); near(plain(JU(w).getState()).center.y, c.y - 4, 0.1, "4 マスで止まる"); assert.equal(JU(w).isActive(), true); FC(w).end("test");
    const v = world(); aimDegree(v, 0, 3.5); const cv = center(v);
    for (let x = Math.floor(cv.x) - 2; x <= Math.floor(cv.x) + 2; x++) setRegion(v, x, Math.floor(cv.y - 2.3), 255);
    fill(v); pressQ(v, 1); const cy = plain(JU(v).getState()).center.y; assert.ok(cy > cv.y - 2.3 && cy < cv.y - 1, "壁(Region 255)の手前で止まる: " + cy); FC(v).end("test");
});

test("【3】失敗ではゲージを減らさない: ゲージ不足(gaugeNotFull)・発動中の二重発動(ultimateStartFailed)・手前の壁で遮られた敵には当たらない。この奥義のダメージでゲージは増えない", () => {
    const w = world(); aimDegree(w, 0, 3);
    pressQ(w, 1); assert.equal(last(w).reason, "gaugeNotFull"); assert.equal(JU(w).isActive(), false); assert.equal(gauge(w).cur, 0);
    fill(w); pressQ(w, 1); assert.equal(JU(w).isActive(), true); assert.equal(gauge(w).cur, 0);
    fill(w); const max = gauge(w).max; pressQ(w, 1);                                                          // 発動中にもう一度
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.equal(r.ok, false); assert.equal(r.reason, "ultimateStartFailed"); assert.equal(r.handlerReason, "ultimateEffectActive");
    assert.equal(gauge(w).cur, max, "失敗ではゲージは減らない");
    placePolar(w, 3, 3.0, 0); resetHp(w); frames(w, 70); assert.ok(lost(w, 3) > 0); assert.equal(gauge(w).cur, max, "この奥義のダメージではゲージは増えない(増えれば満タンを超えない = 同じ値のまま)");
    FC(w).end("test");
    const g = world(); fill(g); const gmax = gauge(g).max;
    const direct = plain(UA(g).getLastUltimateActivationResult()); void direct;
    // 開始に失敗(マウスなし)→ ゲージ不変: カーソルが無い状態を再現
    g.mouse(NaN, NaN); pressQ(g, 1);
    const r2 = plain(UA(g).getLastUltimateActivationResult()); assert.equal(r2.ok, false, JSON.stringify(r2)); assert.equal(gauge(g).cur, gmax, "開始に失敗したときはゲージを消費しない"); assert.equal(JU(g).isActive(), false);
    FC(g).end("test");
});
test("【3b】壁を挟んだ敵には当たらない(中心と敵の間に Region 255)", () => {
    const w = world(); aimDegree(w, 0, 3); const c = center(w);
    // 門は壁の手前(プレイヤーの上 約 1 マス)で止まる。壁の向こう(上 2.4 マス)の敵は、範囲の中でも視線が壁で遮られる
    placeAt(w, 3, c.x, c.y - 2.4);
    for (let x = Math.floor(c.x) - 3; x <= Math.floor(c.x) + 3; x++) setRegion(w, x, Math.floor(c.y - 1.5), 255);
    fill(w); resetHp(w); pressQ(w, 1); const wallEdge = Math.floor(c.y - 1.5) + 1; assert.ok(plain(JU(w).getState()).center.y >= wallEdge && plain(JU(w).getState()).center.y < wallEdge + 0.5, "門は壁の手前で止まる: " + plain(JU(w).getState()).center.y);
    frames(w, 70); assert.equal(lost(w, 3), 0, "壁の向こうの敵には当たらない");
    FC(w).end("test");
});

test("【4】後始末: 戦闘の終了・マップ移動で中断(以降のダメージなし・ゲージは返さない)。保存データ(RingLoadout・Core)は変わらない。Hermes・Apollo の奥義は従来どおり", () => {
    const w = world(); aimDegree(w, 0, 3); const c = center(w); placeAt(w, 3, c.x, c.y - 3.0); const data0 = persistent(w), rl0 = JSON.stringify(plain(RL(w).getState()));
    fill(w); resetHp(w); pressQ(w, 1); frames(w, 10); FC(w).end("test"); assert.equal(JU(w).isActive(), false, "戦闘の終了で中断"); assert.equal(plain(JU(w).getLastResult()).reason, "battleEnded");
    frames(w, 80); assert.equal(lost(w, 3), 0, "中断後はダメージなし"); assert.equal(gauge(w).has, false, "戦闘が終わればゲージ状態も消える");
    assert.equal(persistent(w), data0); assert.equal(JSON.stringify(plain(RL(w).getState())), rl0);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/janus_ultimate|JanusUltimate/.test(saved), false, "セーブ内容に奥義の状態は入らない");
    // マップ移動で中断
    const m = world(); aimDegree(m, 0, 3); fill(m); pressQ(m, 1); assert.equal(JU(m).isActive(), true);
    m.run("$gameMap.setup($gameMap.mapId())"); assert.equal(JU(m).isActive(), false); assert.equal(plain(JU(m).getLastResult()).reason, "mapChanged");
    // Hermes・Apollo の奥義は従来どおり(Q = hermes / apollo)
    for (const [ring, flag] of [["hermes", "isHermesUltimateActive"], ["apollo", "isApolloUltimateActive"]]) {
        const h = world({ q: ring, rings: ["janus", ring] }); aimDegree(h, 0, 3); fill(h); pressQ(h, 1);
        assert.equal(h.ctx[ring === "hermes" ? "ProjectRHermesUltimate" : "ProjectRApolloUltimate"][flag](), true, ring + " の奥義が発動"); assert.equal(JU(h).isActive(), false, "Janus の奥義は動かない"); assert.equal(gauge(h).cur, 0);
        FC(h).end("test");
    }
});

test("【5】HUD: Q は充填中 → READY → 発動後に充填中へ。神のパネルは JANUS。U キーは指輪モードでは無効", () => {
    const w = world(); aimDegree(w, 0, 3);
    const ult = () => plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate"), vm = () => plain(w.ctx.ProjectRBattleHUD.getViewModel());
    assert.deepEqual([ult().state, ult().ready], ["charging", false]); assert.equal(vm().divine.godId, "janus"); assert.equal(vm().ultimate.slotEmpty, undefined);
    fill(w); assert.deepEqual([ult().state, ult().ready, vm().ultimate.state], ["ready", true, "ready"]);
    const u = UA(w).getInputBinding(); w.keyDown(u.code, u.keyCode); frames(w, 3); w.keyUp(u.code, u.keyCode); frames(w, 2); assert.equal(JU(w).isActive(), false, "U は無効");
    pressQ(w, 1); assert.equal(JU(w).isActive(), true); assert.equal(ult().state, "charging"); assert.equal(gauge(w).cur, 0);
    frames(w, 70); assert.equal(ult().state, "charging");
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
