"use strict";
// Stage 4: Athena 断陣の投槍(athena_spear_throw)= 基本攻撃のタップ / 長押し(ProjectR_FieldCombat の入力 + ProjectR_AthenaSkills の投擲)。実エンジン(実Map004 + 全plugin + 実 SwordSystem)。入力は本物の左クリック / キー。
//   【1】タップ(0.25 秒未満で離す): 2段コンボ。1段目 前方 90° の扇・1.8 マス・85 / 95 / 105 %。2段目 直線 2.4 マス × 幅 0.9・105 / 115 / 130 %
//   【2】コンボ: Cooldown 0・受付は硬直が終わってから 0.5 秒・過ぎたら1段目へ・1段ごとに同じ敵へ1回・HUD は「n/2」
//   【3】長押し(0.25 秒に達した瞬間): 4.5 マスの貫通する投擲1回・160 / 190 / 220 %・離したときには出さない(二重に撃たない)
//   【4】投擲の再使用 10 秒は別の時計(タップのコンボは再使用中も使える)・壁は貫通しない・壁が目の前なら失敗(再使用を始めない)
//   【5】5つの枠から同じ。黄金の矢 Lv3 の溜め・ビーム・タップは、どの枠でも従来どおり(入力の一般化で変わらない)。薙ぎ払い・双門・刻印は変わらない
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { IDS: ATHENA } = require("./ProjectR_AthenaImplemented.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const SPEAR = "athena_spear_throw", GV = "apollo_golden_volley";
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, G = w => w.ctx.ProjectRApolloGoldenVolley;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const W = 100;
const KEY = { shift: ["ShiftLeft", 16, { shiftKey: true }], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
const UPKEY = { shift: ["ShiftLeft", 16], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
const SLOT_NAME = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };

function spearWorld({ slots = { lmb: SPEAR }, level = 1, rings = ["athena"], gvLevel = 3, begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of ATHENA) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    if (rings.includes("apollo")) { assert.equal(D(w).setCardOwned(GV, true).ok, true); assert.equal(D(w).setCardLevel(GV, gvLevel).ok, true); }
    if (rings.includes("hermes")) for (const id of ["hermes_sweep", "hermes_zetsu"]) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    if (rings.includes("janus")) { D(w).setCardOwned("janus_dual_gate", true); D(w).setCardLevel("janus_dual_gate", 1); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const down = (w, slot) => { if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); } else w.keyDown(...KEY[slot]); };
const up = (w, slot) => { if (slot === "lmb") w.ctx.TouchInput._mousePressed = false; else w.keyUp(...UPKEY[slot]); };
const press = (w, slot = "lmb", hold = 3) => { down(w, slot); frames(w, hold); up(w, slot); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());
const combo = w => plain(FC(w).getComboState());
const holdLog = w => plain(FC(w).getHoldState()).log;
const lock = w => plain(FC(w).getBeamState()).cooldowns[SPEAR] || 0;
const thrown = w => holdLog(w).filter(e => e.skillId === SPEAR && e.outcome === "throw").length;
const hudSlot = (w, slot) => { const state = plain(FC(w).getHudState()).slots.find(s => s.slot === SLOT_NAME[slot]), slots = plain(FC(w).getHudSlots()).find(s => s.slot === SLOT_NAME[slot]); return { ...state, ...slots, lock: state.lock, ready: state.ready }; };

// ---------------------------------------------------------------- 【1】タップ = 2段コンボ ----------------------------------------------------------------
test("【1】タップ 1段目: 前方 90° の扇・1.8 マス(正面と ±45° の内側だけ。真後ろ・60°・範囲外は当たらない)・基礎物理ダメージの 85 / 95 / 105 %(Lv1〜3)", () => {
    for (const [lv, scale] of [[1, 0.85], [2, 0.95], [3, 1.05]]) {
        const w = spearWorld({ level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.0, 0); placePolar(w, 4, 1.3, 35); placePolar(w, 5, 1.6, 90); placePolar(w, 6, 1.0, 180);          // 正面 / 35°(内)/ 真横 90°(外。体の角まで含めて弧の外)/ 真後ろ
        resetHp(w); press(w); frames(w, 30);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 正面 ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, "35°(弧は ±45°)");
        assert.equal(lost(w, 5), 0, "真横(90°)は弧の外"); assert.equal(lost(w, 6), 0, "真後ろは当たらない");
        assert.equal(last(w).step, 1); assert.equal(last(w).skillId, SPEAR); near(last(w).scale, scale, 1e-9); assert.equal(combo(w).step, 1);
        frames(w, 40); parkOthers(w, []); placePolar(w, 3, 2.7, 0); resetHp(w); press(w); frames(w, 30); assert.equal(lost(w, 3), 0, "1.8 マスの外は当たらない(1段目)");
        FC(w).end("test");
    }
});
test("【1b】タップ 2段目: 前方の直線 2.4 マス × 幅 0.9(2体貫通・長さの外・真横は当たらない)・105 / 115 / 130 %(Lv1〜3)。2段目のあとは1段目へ戻る", () => {
    for (const [lv, scale] of [[1, 1.05], [2, 1.15], [3, 1.3]]) {
        const w = spearWorld({ level: lv }); aimDegree(w, 0, 3); press(w); frames(w, 22); assert.equal(combo(w).step, 1);
        placePolar(w, 3, 1.2, 0); placePolar(w, 4, 2.0, 0); placePolar(w, 5, 3.3, 0); placePolar(w, 6, 1.5, 90);                // 手前 / 奥(貫通)/ 長さの外 / 真横
        resetHp(w); press(w); frames(w, 30);
        assert.equal(last(w).step, 2); assert.equal(last(w).heavy, true);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 手前 ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, `Lv${lv} 奥(貫通)`);
        assert.equal(lost(w, 5), 0, "2.4 マスの外"); assert.equal(lost(w, 6), 0, "幅 0.9 の外(真横)"); assert.equal(combo(w).step, 0, "2段目のあとは1段目へ戻る");
        FC(w).end("test");
    }
});
test("【2】コンボ: Cooldown 0・受付 = 硬直が終わってから 0.5 秒・過ぎたら1段目へ戻る・HUD は n/2・硬直の間の入力は段を進めない・1段ごとに同じ敵へ1回", () => {
    const w = spearWorld(); aimDegree(w, 0, 3); placePolar(w, 3, 1.0, 0);
    assert.equal(combo(w).max, 2); assert.equal(plain(FC(w).getCooldowns())[SPEAR] || 0, 0, "Cooldown 0");
    const hud0 = hudSlot(w, "lmb"); assert.equal(hud0.detail, "READY"); assert.equal(hud0.combo.max, 2, "HUD の段数は2"); assert.equal(hud0.lock.state, "ready", "投擲の再使用の表示: ready");
    resetHp(w); press(w); assert.equal(combo(w).step, 1); const hud1 = hudSlot(w, "lmb"); assert.equal(hud1.detail, "1/2"); assert.equal(hud1.name, "断陣の投槍"); assert.equal(hud1.iconIndex, 100);
    frames(w, 30); near(lost(w, 3), Math.round(W * 0.85), 1, "1振りで1回だけ(同じ敵へ重ねて当たらない)");
    frames(w, 16 + 30 - 34 - 6); assert.equal(combo(w).step, 1, "硬直 16 フレーム + 受付 30 フレーム(0.5 秒)の手前ではまだ続く"); frames(w, 14); assert.equal(combo(w).step, 0, "受付を過ぎたら1段目へ戻る");
    press(w); assert.equal(last(w).step, 1); frames(w, 70); assert.equal(combo(w).step, 0, "2段目まで行かずに受付を過ぎたら戻る");
    press(w, "lmb", 1); const s1 = combo(w).step; w.attackClick(); assert.equal(combo(w).step, s1, "硬直の間の入力は段を進めない");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【3】長押し = 投擲 ----------------------------------------------------------------
test("【3】長押し: 0.25 秒(15 フレーム)に達した瞬間に1回だけ投げる(離したときには出さない)・160 / 190 / 220 %(Lv1〜3)・4.5 マスまで貫通・範囲外は当たらない", () => {
    for (const [lv, scale] of [[1, 1.6], [2, 1.9], [3, 2.2]]) {
        const w = spearWorld({ level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.5, 0); placePolar(w, 4, 3.4, 0); placePolar(w, 5, 5.6, 0); placePolar(w, 6, 2.0, 90);                // 手前 / 奥(貫通)/ 射程の外 / 真横
        resetHp(w); down(w, "lmb"); frames(w, 10); assert.equal(lost(w, 3), 0, "0.25 秒の前は何も出ない"); assert.equal(thrown(w), 0);
        frames(w, 8); near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 押している間に投げる ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, "貫通して奥にも");
        assert.equal(lost(w, 5), 0, "4.5 マスの外"); assert.equal(lost(w, 6), 0, "幅の外(真横)"); assert.equal(thrown(w), 1); assert.equal(last(w).throw, true); assert.equal(last(w).ok, true);
        frames(w, 40); up(w, "lmb"); frames(w, 30); near(lost(w, 3), Math.round(W * scale), 1, "離しても二重に撃たない"); assert.equal(thrown(w), 1); assert.equal(combo(w).step, 0, "投擲はコンボの段を進めない");
        assert.equal(holdLog(w).filter(e => e.outcome === "afterThrow").length, 1, "離した記録は afterThrow");
        FC(w).end("test");
    }
});
test("【3b】タップと長押しの境目: 0.25 秒未満で離す = コンボ(投擲なし)/ 0.25 秒以上 = 投擲(コンボなし)。長く押し続けても投擲は1回だけ", () => {
    const a = spearWorld(); aimDegree(a, 0, 3); placePolar(a, 3, 1.3, 0); resetHp(a); press(a, "lmb", 10); frames(a, 30);
    assert.equal(thrown(a), 0); assert.equal(last(a).step, 1, "短く押したのはタップ(コンボ1段目)"); near(lost(a, 3), Math.round(W * 0.85), 1); FC(a).end("test");
    const b = spearWorld(); aimDegree(b, 0, 3); placePolar(b, 3, 1.3, 0); resetHp(b); press(b, "lmb", 18); frames(b, 30);
    assert.equal(thrown(b), 1); assert.equal(combo(b).step, 0, "長押しはコンボを進めない"); near(lost(b, 3), Math.round(W * 1.6), 1); FC(b).end("test");
    const c = spearWorld(); aimDegree(c, 0, 3); placePolar(c, 3, 1.3, 0); resetHp(c); down(c, "lmb"); frames(c, 200); up(c, "lmb"); frames(c, 10);
    assert.equal(thrown(c), 1, "押し続けても1回だけ"); near(lost(c, 3), Math.round(W * 1.6), 1); assert.equal(hudSlot(c, "lmb").lock.state, "cooldown"); FC(c).end("test");
});

// ---------------------------------------------------------------- 【4】投擲の再使用・壁 ----------------------------------------------------------------
test("【4】投擲の再使用 10 秒は別の時計: 投げた瞬間から数え始める・その間の長押しは何も出さない(再使用を延ばさない)・タップのコンボは再使用中も使える・10 秒後にまた投げられる", () => {
    const w = spearWorld(); aimDegree(w, 0, 3); placePolar(w, 3, 2.0, 0); resetHp(w);
    press(w, "lmb", 18); frames(w, 5); assert.equal(thrown(w), 1); near(lock(w), 10, 0.5, "投擲の再使用 10 秒"); assert.equal(plain(FC(w).getCooldowns())[SPEAR] || 0, 0, "通常の Cooldown は 0 のまま");
    const hud = hudSlot(w, "lmb"); assert.equal(hud.lock.state, "cooldown"); near(hud.lock.cooldown, 10, 0.5); assert.equal(hud.ready, true, "スロット自体は使える(タップ)");
    resetHp(w); const d0 = lost(w, 3); press(w, "lmb", 20); frames(w, 20); assert.equal(thrown(w), 1, "再使用中の長押しは投げない"); assert.equal(lost(w, 3), d0, "ダメージなし"); assert.ok(last(w).reason === "throwLock" || last(w).ok === false, "失敗の記録 " + JSON.stringify(last(w)));
    assert.ok(holdLog(w).some(e => e.outcome === "throwFailed" && e.reason === "throwLock")); near(lock(w), 10 - (5 + 18 + 20 + 20 + 2) / 60, 1.2, "失敗しても再使用は延びない");
    frames(w, 100); resetHp(w); press(w, "lmb", 3); frames(w, 30); near(lost(w, 3), Math.round(W * 0.85), 1, "再使用中でもタップのコンボは使える"); assert.equal(last(w).step, 1); press(w); frames(w, 30); assert.equal(last(w).step, 2, "2段目も");
    frames(w, 600); assert.equal(lock(w), 0, "10 秒で明ける"); resetHp(w); press(w, "lmb", 18); frames(w, 5); assert.equal(thrown(w), 2, "また投げられる"); near(lost(w, 3), Math.round(W * 1.6), 1);
    FC(w).end("test"); assert.equal(lock(w), 0, "戦闘の終了で再使用の表示も片づく");
});
test("【4b】壁は貫通しない: 壁の手前の敵には当たり・壁の向こうには当たらない。壁が目の前なら投げられず(再使用を始めない)・Cooldown も使わない", () => {
    const w = spearWorld(); aimDegree(w, 0, 3); const cc = center(w);
    placePolar(w, 3, 1.2, 0); placePolar(w, 4, 3.6, 0);
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(w, x, Math.floor(cc.y - 2.0), 255);          // 約 2 マス先に壁
    resetHp(w); press(w, "lmb", 18); frames(w, 5); assert.equal(thrown(w), 1); near(lost(w, 3), Math.round(W * 1.6), 1, "壁の手前の敵には当たる"); assert.equal(lost(w, 4), 0, "壁の向こうの敵には当たらない");
    assert.ok(plain(w.ctx.ProjectRAthenaSkills.getLastResult("throw")).length < 2.1, "投擲の長さは壁の手前まで"); FC(w).end("test");
    const f = spearWorld(); aimDegree(f, 0, 3); const fc = center(f);
    for (let x = Math.floor(fc.x) - 1; x <= Math.floor(fc.x) + 1; x++) setRegion(f, x, Math.floor(fc.y - 0.9), 255);          // すぐ目の前が壁
    placePolar(f, 3, 3.0, 0); resetHp(f); press(f, "lmb", 18); frames(f, 5);
    assert.equal(thrown(f), 0, "壁が目の前なら投げない"); assert.equal(lost(f, 3), 0); assert.equal(lock(f), 0, "再使用を始めない"); assert.ok(holdLog(f).some(e => e.outcome === "throwFailed" && e.reason === "blocked"), JSON.stringify(holdLog(f)));
    for (let x = Math.floor(fc.x) - 1; x <= Math.floor(fc.x) + 1; x++) setRegion(f, x, Math.floor(fc.y - 0.9), 0);
    press(f, "lmb", 18); frames(f, 5); assert.equal(thrown(f), 1, "壁を外せばすぐ投げられる(失敗で再使用が始まっていない)"); FC(f).end("test");
});
test("【4c】中断: 溜めている間(0.25 秒の前)にほかのスキルが成功すると、そのタップも投擲も出ない(取り消し・Cooldown なし)。戦闘の終了・メニューで押下の記録は片づく", () => {
    const w = spearWorld({ slots: { lmb: SPEAR, x: "athena_aegis" } }); aimDegree(w, 0, 3); placePolar(w, 3, 1.3, 0); resetHp(w);
    down(w, "lmb"); frames(w, 5); const r = plain(FC(w).useAbility("card1")); assert.equal(r.ok, true, "ほかのスキルが成功"); frames(w, 20); up(w, "lmb"); frames(w, 20);
    assert.equal(lost(w, 3), 0, "溜めは取り消されて、離しても何も出ない"); assert.equal(thrown(w), 0); assert.ok(holdLog(w).some(e => e.skillId === SPEAR && (e.outcome === "canceled" || e.outcome === "interrupted")), JSON.stringify(holdLog(w)));
    down(w, "lmb"); frames(w, 5); FC(w).end("test"); assert.deepEqual(plain(FC(w).getHoldState()).holds, [], "戦闘の終了で押している記録は消える");
});

// ---------------------------------------------------------------- 【5】5つの枠・ほかのスキルは変わらない ----------------------------------------------------------------
test("【5】5つの枠(LMB / Shift / E / X / C)のどれからでも同じ: タップ = 2段コンボ・長押し = 投擲(キーは押している間に投げ、離しても二重に撃たない)", () => {
    for (const slot of ["lmb", "shift", "e", "x", "c"]) {
        const w = spearWorld({ slots: { [slot]: SPEAR } }); aimDegree(w, 0, 3); placePolar(w, 3, 1.3, 0); placePolar(w, 4, 3.0, 0);
        resetHp(w); press(w, slot, 3); frames(w, 30); assert.equal(last(w).step, 1, `${slot} タップ 1段目`); near(lost(w, 3), Math.round(W * 0.85), 1); assert.equal(last(w).skillId, SPEAR);
        frames(w, 60); resetHp(w); down(w, slot); frames(w, 18); near(lost(w, 3), Math.round(W * 1.6), 1, `${slot} 長押しで投げる`); near(lost(w, 4), Math.round(W * 1.6), 1, "貫通");
        up(w, slot); frames(w, 30); near(lost(w, 3), Math.round(W * 1.6), 1, `${slot}: 離しても二重に撃たない`); assert.equal(thrown(w), 1);
        FC(w).end("test");
    }
});
test("【5b】黄金の矢 Lv3 の溜め・ビーム・タップはどの枠でも従来どおり(入力の一般化で変わらない)。同時に装備した投槍も、それぞれ別の動き", () => {
    for (const gvSlot of ["lmb", "shift", "e", "x", "c"]) {
        const spearSlot = gvSlot === "lmb" ? "c" : "lmb";
        const w = spearWorld({ slots: { [gvSlot]: GV, [spearSlot]: SPEAR }, rings: ["athena", "apollo"] }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0);
        down(w, gvSlot); frames(w, 5); let h = plain(FC(w).getHoldState()).holds.find(x => x.skillId === GV); assert.equal(h.mode, "charge", `${gvSlot}: 黄金の矢は従来の溜め(charge)`); assert.equal(h.phase, "tap");
        frames(w, 15); h = plain(FC(w).getHoldState()).holds.find(x => x.skillId === GV); assert.equal(h.phase, "charge", "0.25 秒を過ぎたら溜め中");
        frames(w, 40); assert.equal(plain(FC(w).getBeamState()).active, true, `${gvSlot}: 0.9 秒でビームが始まる`); up(w, gvSlot); frames(w, 5); assert.equal(plain(FC(w).getBeamState()).active, false, "離すとビームが終わる");
        assert.equal(thrown(w), 0, "黄金の矢の長押しでは投槍は投げない"); FC(w).end("test");
        const t = spearWorld({ slots: { [gvSlot]: GV, [spearSlot]: SPEAR }, rings: ["athena", "apollo"] }); aimDegree(t, 0, 3); placePolar(t, 3, 1.3, 0); resetHp(t);
        press(t, gvSlot, 4); frames(t, 10); assert.equal(plain(FC(t).getBeamState()).active, false); assert.ok(plain(t.ctx.ProjectRApolloGoldenVolley.getActiveVolleys()).length > 0 || holdLog(t).some(e => e.skillId === GV && e.outcome === "tap"), `${gvSlot}: タップは通常の発射`);
        FC(t).end("test");
    }
});
test("【5c】薙ぎ払い(Hermes の3段)・双門(Janus の2段)・刻印(Themis の3段)は変わらない: 投槍と同じ戦闘で入れ替えても、コンボは1段目から。コンボの段数(HUD)も戻る", () => {
    const w = spearWorld({ slots: { lmb: "hermes_sweep", e: SPEAR }, rings: ["athena", "hermes"] }); aimDegree(w, 0, 3); placePolar(w, 3, 1.2, 0);
    for (let step = 1; step <= 3; step++) { press(w, "lmb"); frames(w, step === 3 ? 40 : 16); assert.equal(last(w).step, step, "薙ぎ払い " + step); assert.equal(last(w).skillId, "hermes_sweep"); }
    assert.equal(combo(w).max, 3); press(w, "e"); frames(w, 24); assert.equal(last(w).step, 1); assert.equal(last(w).skillId, SPEAR, "切り替えで1段目から"); assert.equal(combo(w).max, 2, "投槍は2段");
    press(w, "lmb"); frames(w, 30); assert.equal(last(w).step, 1); assert.equal(last(w).skillId, "hermes_sweep", "戻しても1段目から"); assert.equal(combo(w).max, 3); FC(w).end("test");
    const j = spearWorld({ slots: { lmb: "janus_dual_gate", e: SPEAR }, rings: ["athena", "janus"] }); aimDegree(j, 0, 3); placePolar(j, 3, 1.2, 0);
    press(j, "lmb"); frames(j, 26); press(j, "lmb"); frames(j, 40); assert.equal(last(j).step, 2); assert.equal(last(j).skillId, "janus_dual_gate"); press(j, "e"); frames(j, 24); assert.equal(last(j).skillId, SPEAR); assert.equal(last(j).step, 1); FC(j).end("test");
    const t = spearWorld({ slots: { lmb: "themis_sin_mark", e: SPEAR }, rings: ["athena", "themis"] }); aimDegree(t, 0, 3); placePolar(t, 3, 1.2, 0);
    press(t, "lmb"); frames(t, 24); press(t, "lmb"); frames(t, 24); assert.equal(last(t).step, 2); assert.equal(last(t).skillId, "themis_sin_mark"); press(t, "e"); frames(t, 24); assert.equal(last(t).skillId, SPEAR); assert.equal(last(t).step, 1); assert.equal(combo(t).max, 2); FC(t).end("test");
});
test("【5d】保存データ: コンボの状態・投擲の再使用・押している記録はセーブに入らない。RingLoadout・Core は変わらない", () => {
    const w = spearWorld({ begin: false }); const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, D(w).getPersistentData()]); const s0 = snap();
    assert.equal(FC(w).begin().ok, true); frames(w, 2); parkOthers(w, []); aimDegree(w, 0, 3); placePolar(w, 3, 1.3, 0);
    press(w, "lmb", 18); frames(w, 5); assert.equal(thrown(w), 1); assert.ok(lock(w) > 0);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/"beamCd"|lockSeconds|"throw"|afterThrow|athenaSpear/.test(saved), false);
    FC(w).end("test"); assert.equal(snap(), s0, "保存データは変わらない");
});

console.log(`\nall ${passed} passed`);
