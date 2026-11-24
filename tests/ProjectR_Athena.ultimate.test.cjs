"use strict";
// Stage 4: Athena の Ultimate「アイギス・不落の戦陣」(ProjectR_AthenaUltimate)を、既存の GodSummonManager・UltimateActivation・共有ゲージ・Q(RingLoadout の Q 枠)・HUD で。
// 実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。入力は本物の Q キー。実機の見た目・Q 入力は tools/mz_cdp/athena_verify.cjs。
//   【1】登録: handler 登録済み → ULTIMATE 画面・Q 枠で選べる。Q が空なら自動では入らない・Core の選択は触らない・Hermes / Apollo / Janus / Themis は変わらない
//   【2】発動: Q・満タンのゲージ → 主人公を中心に半径 3 マスの陣を 6 秒。開いた瞬間に範囲内の敵へ 180 %(各敵1回)・成功後だけゲージ消費
//   【3】陣の中にいる間は被ダメージ 60 % 軽減(外へ出たら外れ、戻ればまた効く)・陣はその場に残る(主人公に付いてこない)
//   【4】失敗ではゲージを減らさない・この奥義のダメージでゲージは増えない  【5】後始末・保存しない  【6】HUD・カットインなし・ほかの神の絵を出さない
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { IDS: ATHENA } = require("./ProjectR_AthenaImplemented.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, GM = w => w.ctx.ProjectRGodSummonManager;
const AU = w => w.ctx.ProjectRAthenaUltimate, AS = w => w.ctx.ProjectRAthenaSkills, CI = w => w.ctx.ProjectRCutIn;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const fill = w => GA(w).addUltimateGauge(GA(w).getUltimateGaugeMax(), "test");
const gauge = w => ({ has: GA(w).hasUltimateGaugeState(), cur: GA(w).getUltimateGauge(), max: GA(w).getUltimateGaugeMax() });
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());
const persistent = w => JSON.stringify(D(w).getPersistentData());
const leader = w => w.ctx.$gameParty.leader();
const enemyHit = (w, eventId, value = "-50") => { const i = new w.ctx.Game_Interpreter(); i._eventId = eventId; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value, exceedMaxHealth: "false" }); frames(w, 2); };
const hitLoss = (w, from) => { leader(w).setHp(leader(w).mhp); frames(w, 2); const h0 = leader(w).hp; enemyHit(w, from); return h0 - leader(w).hp; };
const moveTo = (w, x, y) => { const p = w.ctx.$gamePlayer; p.locate(x, y); p._realX = x; p._realY = y; frames(w, 3); };
const W = 100;

function world({ q = "athena", core = null, rings = ["athena"], begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of ATHENA) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    if (core) assert.equal(D(w).setUltimateRing(core).ok, true);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}

test("【1】登録: Athena の handler がある → ULTIMATE 画面・Q 枠で選べる(未所持は選べない)。Q が空なら自動では入らない。Core の選択は触らない(Q = athena・Core = hermes)", () => {
    const w = world({ q: "athena", core: "hermes", rings: ["athena", "hermes"] });
    assert.equal(UA(w).hasUltimateHandler("athena"), true); assert.deepEqual(plain(UA(w).getRegisteredUltimateGods()), ["apollo", "athena", "hermes", "janus", "themis"]);
    assert.equal(plain(AU(w).getRegistration()).ok, true); assert.deepEqual(plain(AU(w).getConfig()), { radius: 3, seconds: 6, scale: 1.8, reduction: 0.6 });
    const entry = plain(w.ctx.ProjectRMenuCore.ultimate.entries()).find(e => e.ringId === "athena"); assert.equal(entry.implemented, true, "ULTIMATE 画面: 実装済み");
    assert.equal(plain(FC(w).getUltimateState()).ringId, "athena"); assert.equal(GM(w).getPersistentUltimateRingId(), "athena"); assert.equal(GM(w).getPersistentUltimateGodId(), "athena");
    assert.equal(D(w).getUltimateRingId(), "hermes", "Core の選択(ULTIMATE 画面)は別のまま");
    FC(w).end("test");
    const e = world({ q: null, rings: ["athena"] });                                                          // Athena を装備しているだけでは Q は自動で入らない
    assert.equal(RL(e).getUltimate(), null); assert.equal(plain(FC(e).getUltimateState()).reason, "emptySlot"); assert.equal(GM(e).hasPersistentUltimateBattleState(), false);
    pressQ(e); assert.equal(AU(e).isActive(), false); assert.equal(D(e).getUltimateRingId(), null, "Core の選択も自動では入らない"); FC(e).end("test");
});

test("【2】発動: 満タンで Q → 主人公を中心に半径 3 マスの陣を張り、その瞬間に範囲内の敵へ 180 %(各敵1回)。範囲外・壁の向こうは当たらない。ゲージは成功後だけ 0 へ", () => {
    const w = world(); aimDegree(w, 0, 3); const c = center(w);
    placePolar(w, 3, 1.5, 0); placePolar(w, 4, 2.4, 120); placePolar(w, 5, 5.0, 240); placePolar(w, 6, 2.6, 300);          // 範囲内 3 体(前・右下・左上)+ 範囲外(5 マス)
    fill(w); const max = gauge(w).max; resetHp(w);
    pressQ(w, 1);
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.deepEqual([r.ok, r.started, r.godId, r.ringId, r.consumed], [true, true, "athena", "athena", max], JSON.stringify(r));
    assert.equal(gauge(w).cur, 0, "成功後にゲージ消費"); assert.equal(AU(w).isActive(), true);
    near(plain(AU(w).getState()).center.x, c.x, 0.05, "陣の中心 = 主人公の位置"); near(plain(AU(w).getState()).center.y, c.y, 0.05); near(plain(AU(w).getState()).radius, 3, 1e-9);
    frames(w, 3); for (const id of [3, 4, 6]) near(lost(w, id), W * 1.8, 1, "範囲内: 180 % id" + id); assert.equal(lost(w, 5), 0, "範囲外(5 マス)は当たらない");
    frames(w, 60); for (const id of [3, 4, 6]) near(lost(w, id), W * 1.8, 1, "各敵1回だけ(あとから増えない)");
    assert.deepEqual(plain(AU(w).getState()).hit.map(h => h.eventId).sort(), [3, 4, 6], "命中の記録"); FC(w).end("test");
});

test("【2b】陣は 6 秒(360 フレーム)続いて終わる。陣の外(壁の向こう)の敵・陣の外へ出た敵には当たらない。通常の物理ダメージ(防御は無視しない)", () => {
    const w = world(); aimDegree(w, 0, 3); placePolar(w, 3, 1.5, 0);
    const cv = center(w); placePolar(w, 4, 2.4, 180); for (let x = Math.floor(cv.x) - 2; x <= Math.floor(cv.x) + 2; x++) setRegion(w, x, Math.floor(cv.y + 1.2), 255);          // 真後ろ(下)との間に壁
    fill(w); resetHp(w);
    const calls = []; const orig = w.ctx.PluginManager.callCommand; w.ctx.PluginManager.callCommand = function (i, plugin, name, args) { calls.push({ name, args }); return orig.apply(this, arguments); };
    pressQ(w, 1); frames(w, 3);
    near(lost(w, 3), W * 1.8, 1); assert.equal(lost(w, 4), 0, "壁を挟んだ敵には当たらない");
    const dmg = calls.filter(k => k.name === "UpdateEventHp" && String(k.args.value).includes("player weapon")); assert.ok(dmg.length >= 1 && dmg.every(k => !k.args.projectRFixed), "固定ダメージ(防御無視)は使わない");
    frames(w, 330); assert.equal(AU(w).isActive(), true, "6 秒(360 フレーム)の手前ではまだ陣が残る"); near(plain(AU(w).getState()).remaining, 0.5, 0.3, "残り約 0.5 秒");
    frames(w, 40); assert.equal(AU(w).isActive(), false, "6 秒で終わる"); assert.equal(plain(AU(w).getLastResult()).reason, "expired"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_ultimate_field"), false);
    FC(w).end("test");
});

test("【3】陣の中にいる間は被ダメージを 60 % 軽減する。外へ出たら外れ、戻ればまた効く。陣は主人公に付いてこない(その場に残る)。ほかの軽減とは積", () => {
    const w = world(); aimDegree(w, 0, 3); placePolar(w, 3, 1.5, 0); const base = hitLoss(w, 3); assert.ok(base > 0);
    const c0 = center(w); fill(w); pressQ(w, 1); frames(w, 3); assert.equal(AU(w).isActive(), true);
    near(hitLoss(w, 3), base * 0.4, 1.51, "陣の中: 60 % 軽減"); assert.equal(plain(AU(w).getState()).inside, true);
    moveTo(w, w.ctx.$gamePlayer._realX + 4, w.ctx.$gamePlayer._realY); assert.equal(plain(AU(w).getState()).inside, false, "陣の外へ出た"); near(hitLoss(w, 3), base, 1.01, "陣の外: 軽減なし");
    near(plain(AU(w).getState()).center.x, c0.x, 0.05, "陣は主人公に付いてこない"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_ultimate_field"), false, "外では状態が外れている");
    moveTo(w, c0.x - 0.5, c0.y - 0.5); assert.equal(plain(AU(w).getState()).inside, true, "戻った"); near(hitLoss(w, 3), base * 0.4, 1.51, "戻ればまた軽減");
    assert.equal(w.ctx.ProjectRApolloStatus.apply("player", "other_guard", { seconds: 5, damageTaken: 0.5 }).ok, true); near(hitLoss(w, 3), base * 0.4 * 0.5, 1.51, "60% 軽減 × 別の 50% 軽減 = 積");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0, "DamageModifiers の衝突は記録されない"); FC(w).end("test");
});

test("【4】失敗ではゲージを減らさない: ゲージ不足(gaugeNotFull)・陣が残っている間の二重発動(ultimateStartFailed)・開始できないとき。この奥義のダメージでゲージは増えない", () => {
    const w = world(); aimDegree(w, 0, 3);
    pressQ(w, 1); assert.equal(last(w).reason, "gaugeNotFull"); assert.equal(AU(w).isActive(), false); assert.equal(gauge(w).cur, 0);
    fill(w); pressQ(w, 1); assert.equal(AU(w).isActive(), true); assert.equal(gauge(w).cur, 0);
    fill(w); const max = gauge(w).max; pressQ(w, 1);                                                           // 陣が残っている間にもう一度
    const r = plain(UA(w).getLastUltimateActivationResult()); assert.equal(r.ok, false); assert.equal(r.reason, "ultimateStartFailed"); assert.equal(r.handlerReason, "ultimateEffectActive");
    assert.equal(gauge(w).cur, max, "失敗ではゲージは減らない");
    FC(w).end("test");
    const z = world(); aimDegree(z, 0, 3); placePolar(z, 3, 1.5, 0); resetHp(z); fill(z); pressQ(z, 1); assert.equal(gauge(z).cur, 0); frames(z, 5); assert.ok(lost(z, 3) > 0);
    assert.equal(gauge(z).cur, 0, "ゲージが 0 のときに奥義が命中しても、ゲージは増えない(奥義のダメージは充填の対象外)"); FC(z).end("test");
    // 開始に失敗したとき(状態の台帳が使えない)はゲージを消費しない
    const g = world(); fill(g); const gmax = gauge(g).max; const ledger = g.ctx.ProjectRApolloStatus, realApply = ledger.apply;
    g.ctx.ProjectRApolloStatus = Object.freeze({ clear: ledger.clear });                                    // apply / remove の無い台帳(使えない)
    pressQ(g, 1); const r2 = plain(UA(g).getLastUltimateActivationResult()); assert.equal(r2.ok, false, JSON.stringify(r2)); assert.equal(r2.handlerReason, "statusLedgerUnavailable"); assert.equal(gauge(g).cur, gmax, "開始に失敗したときはゲージを消費しない"); assert.equal(AU(g).isActive(), false);
    g.ctx.ProjectRApolloStatus = ledger; void realApply; FC(g).end("test");
});
test("【4b】通常スキルのダメージは従来どおりゲージを増やす(護槍旋陣)。奥義のダメージだけが対象外", () => {
    const w = world({ begin: false }); assert.equal(RL(w).setSkill("e", "athena_spear_circle").ok, true);
    assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); placePolar(w, 3, 1.5, 0);
    const g0 = gauge(w).cur; assert.equal(plain(FC(w).useAbility("special")).ok, true); frames(w, 3); assert.ok(gauge(w).cur > g0, "通常スキルのダメージでゲージが増える: " + g0 + " → " + gauge(w).cur);
    FC(w).end("test");
});

test("【5】後始末: 戦闘の終了・マップ移動で陣が消える(軽減も外れる・ゲージは返さない)。保存データ(RingLoadout・Core)は変わらず、セーブに陣の状態は入らない。Hermes・Apollo・Janus・Themis の奥義は従来どおり", () => {
    const w = world(); aimDegree(w, 0, 3); placePolar(w, 3, 1.5, 0); const data0 = persistent(w), rl0 = JSON.stringify(plain(RL(w).getState()));
    fill(w); resetHp(w); pressQ(w, 1); frames(w, 5); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_ultimate_field"), true, "陣の中の軽減が付いている");
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/athena_ultimate|AthenaUltimate|athena_field/.test(saved), false, "セーブ内容に奥義の状態は入らない");
    FC(w).end("test"); assert.equal(AU(w).isActive(), false, "戦闘の終了で消える"); assert.equal(plain(AU(w).getLastResult()).reason, "battleEnded"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "athena_ultimate_field"), false, "軽減も外れる");
    assert.equal(gauge(w).has, false, "戦闘が終われば、ゲージ状態も消える"); assert.equal(persistent(w), data0); assert.equal(JSON.stringify(plain(RL(w).getState())), rl0);
    const m = world(); aimDegree(m, 0, 3); fill(m); pressQ(m, 1); assert.equal(AU(m).isActive(), true);
    m.run("$gameMap.setup($gameMap.mapId())"); assert.equal(AU(m).isActive(), false); assert.equal(plain(AU(m).getLastResult()).reason, "mapChanged"); assert.equal(m.ctx.ProjectRApolloStatus.has("player", "athena_ultimate_field"), false);
    const l = world(); aimDegree(l, 0, 3); fill(l); pressQ(l, 1); assert.equal(AU(l).isActive(), true); l.ctx.DataManager.extractSaveContents(l.ctx.DataManager.makeSaveContents()); assert.equal(AU(l).isActive(), false, "ロードで消える"); assert.ok(["load", "battleEnded"].includes(plain(AU(l).getLastResult()).reason), "ロード(Core が戦闘を終わらせる経路を含む)で終わる: " + plain(AU(l).getLastResult()).reason);
    for (const [ring, host, flag] of [["hermes", "ProjectRHermesUltimate", "isHermesUltimateActive"], ["apollo", "ProjectRApolloUltimate", "isApolloUltimateActive"]]) {
        const h = world({ q: ring, rings: ["athena", ring] }); aimDegree(h, 0, 3); fill(h); pressQ(h, 1);
        assert.equal(h.ctx[host][flag](), true, ring + " の奥義が発動"); assert.equal(AU(h).isActive(), false, "Athena の奥義は動かない"); assert.equal(gauge(h).cur, 0);
        FC(h).end("test");
    }
    for (const [ring, host] of [["janus", "ProjectRJanusUltimate"], ["themis", "ProjectRThemisUltimate"]]) {
        const j = world({ q: ring, rings: ["athena", ring] }); aimDegree(j, 0, 3); fill(j); pressQ(j, 1);
        assert.equal(j.ctx[host].isActive(), true, ring + " の奥義が発動"); assert.equal(AU(j).isActive(), false); FC(j).end("test");
    }
});

test("【6】HUD: Q は充填中 → READY → 発動後に充填中へ。神のパネルは ATHENA。U キーは指輪モードでは無効。カットインなし(noArtwork)・ほかの神の絵を出さない・神の表示の見た目は無い", () => {
    const w = world(); aimDegree(w, 0, 3);
    const ult = () => plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate"), vm = () => plain(w.ctx.ProjectRBattleHUD.getViewModel());
    assert.deepEqual([ult().state, ult().ready], ["charging", false]); assert.equal(vm().divine.godId, "athena"); assert.equal(vm().ultimate.slotEmpty, undefined);
    fill(w); assert.deepEqual([ult().state, ult().ready, vm().ultimate.state], ["ready", true, "ready"]);
    const u = UA(w).getInputBinding(); w.keyDown(u.code, u.keyCode); frames(w, 3); w.keyUp(u.code, u.keyCode); frames(w, 2); assert.equal(AU(w).isActive(), false, "U は無効");
    pressQ(w, 1); assert.equal(AU(w).isActive(), true); assert.equal(ult().state, "charging"); assert.equal(gauge(w).cur, 0);
    assert.deepEqual(plain(CI(w).show({ kind: "ultimate", godId: "athena" })), { ok: false, reason: "noArtwork" }, "カットインは出さない(ほかの神の絵で代用しない)");
    assert.deepEqual(plain(CI(w).show({ kind: "card", godId: "athena", cardId: "athena_aegis" })), { ok: false, reason: "noArtwork" });
    assert.deepEqual(plain(CI(w).getActive()), []); assert.equal(Object.prototype.hasOwnProperty.call(plain(CI(w).assets().gods), "athena"), false, "Athena の絵の登録は無い(用意されたら GodEyesJson へ足すだけ)");
    assert.deepEqual(plain(w.ctx.ProjectRGodSummonVisual.getAppearance("athena")), {}, "神の表示の見た目は、Athena には無い(ほかの神の絵で代用しない)");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getVisuals()).filter(v => v.godId !== "athena").length, 0, "同行の表示にほかの神は出ない");
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
