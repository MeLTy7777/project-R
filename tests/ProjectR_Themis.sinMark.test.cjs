"use strict";
// Stage 3: Themis の罪科の刻印(themis_sin_mark)= 基本攻撃の3段コンボ(ProjectR_FieldCombat)。実エンジン(実Map004 + 全plugin + 実 SwordSystem)。入力は本物の左クリック / キー。
//   【1】1段目 前方 110° の扇・1.8 マス・90 / 100 / 110 %  【2】2段目 同じ扇・100 / 110 / 125 %  【3】3段目 貫通する直線 3.0 × 幅 0.9・115 / 130 / 145 %
//   【4】罪状: 3段目に当たった敵ごとに +1(1・2段目は付かない・外れた敵には付かない・上限 3)
//   【5】コンボ: Cooldown 0・継続の受付は硬直が終わってから 0.5 秒・過ぎたら1段目へ戻る・1段ごとに同じ敵へ1回・HUD は「n/3」
//   【6】5つの枠から同じ。薙ぎ払い(Hermes の3段)・双門(Janus の2段)は変わらない・切り替えで1段目から
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const THEMIS = ["themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, TS = w => w.ctx.ProjectRThemisSkills;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);

function markWorld({ slots = { lmb: "themis_sin_mark" }, level = 1, rings = ["themis"], begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of THEMIS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    if (rings.includes("hermes")) for (const id of ["hermes_sweep", "hermes_zetsu"]) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    if (rings.includes("janus")) for (const id of ["janus_dual_gate"]) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const KEY = { shift: ["ShiftLeft", 16, { shiftKey: true }], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
function press(w, slot = "lmb", hold = 3) {
    if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); frames(w, hold); w.ctx.TouchInput._mousePressed = false; frames(w, 1); return; }
    w.keyDown(...KEY[slot]); frames(w, hold); w.keyUp(KEY[slot][0], KEY[slot][1]); frames(w, 1);
}
const last = w => plain(FC(w).getLastResult());
const combo = w => plain(FC(w).getComboState());
const ev = (w, id) => w.ctx.$gameMap.event(id);
const sin = (w, id) => TS(w).sin.stacksOf(ev(w, id));
const W = 100;
// 3段を順に当てる(1段ごとに硬直が終わるまで待つ)。敵 id の、各段のダメージの増分を返す。
function threeSteps(w, ids, wait = 22) {
    const out = [];
    for (let step = 1; step <= 3; step++) { resetHp(w); press(w, "lmb"); frames(w, wait + 8); out.push(ids.map(i => lost(w, i))); frames(w, 0); if (step < 3) assert.equal(combo(w).step, step, `${step}段目のあと`); }
    return out;
}

test("【1】1段目: 前方 110° の扇・1.8 マス(範囲内だけ・真後ろ・範囲外は当たらない)・基礎物理ダメージの 90 / 100 / 110 %(Lv1〜3)・罪状は付かない", () => {
    for (const [lv, scale] of [[1, 0.9], [2, 1], [3, 1.1]]) {
        const w = markWorld({ level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.0, 0); placePolar(w, 4, 1.4, 45); placePolar(w, 5, 1.0, 180); placePolar(w, 6, 2.6, 0);          // 正面 / 斜め45° / 真後ろ / 範囲外
        resetHp(w); press(w); frames(w, 30);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 正面 ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, "斜め45°(弧は ±55°)");
        assert.equal(lost(w, 5), 0, "真後ろは当たらない"); assert.equal(lost(w, 6), 0, "1.8 マスの外は当たらない");
        assert.deepEqual([3, 4, 5, 6].map(i => sin(w, i)), [0, 0, 0, 0], "1段目は罪状を付けない"); assert.equal(last(w).step, 1); near(last(w).scale, scale, 1e-9);
        FC(w).end("test");
    }
});
test("【2】2段目: 同じ扇(前方 110°・1.8 マス)・100 / 110 / 125 %(Lv1〜3)・マウスの向きへ向け直す・罪状は付かない", () => {
    for (const [lv, scale] of [[1, 1], [2, 1.1], [3, 1.25]]) {
        const w = markWorld({ level: lv }); aimDegree(w, 0, 3); press(w); frames(w, 22); assert.equal(combo(w).step, 1);
        aimDegree(w, 90, 3); placePolar(w, 3, 1.0, 90); placePolar(w, 4, 1.0, 270); placePolar(w, 5, 2.6, 90);                // 2段目の向き(右)/ 反対側(左。体の大きさ ±0.5 を考慮)/ 範囲外
        resetHp(w); press(w); frames(w, 30);
        assert.equal(last(w).step, 2); near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 右 ${scale * 100}%`); assert.equal(lost(w, 4), 0, "向きの反対側には出ない(向きはマウスで取り直す)"); assert.equal(lost(w, 5), 0);
        assert.deepEqual([3, 4, 5].map(i => sin(w, i)), [0, 0, 0], "2段目は罪状を付けない"); assert.equal(combo(w).step, 2);
        FC(w).end("test");
    }
});
test("【3】3段目: 前方の貫通する直線 3.0 マス × 幅 0.9(2体貫通・長さの外・真横は当たらない)・115 / 130 / 145 %(Lv1〜3)。3段目のあとは1段目へ戻る", () => {
    for (const [lv, scale] of [[1, 1.15], [2, 1.3], [3, 1.45]]) {
        const w = markWorld({ level: lv }); aimDegree(w, 0, 3); press(w); frames(w, 22); press(w); frames(w, 24); assert.equal(combo(w).step, 2);
        placePolar(w, 3, 1.2, 0); placePolar(w, 4, 2.7, 0); placePolar(w, 5, 3.9, 0); placePolar(w, 6, 1.5, 90);                // 手前 / 奥(貫通)/ 長さの外 / 真横
        resetHp(w); press(w); frames(w, 30);
        assert.equal(last(w).step, 3); assert.equal(last(w).heavy, true);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 手前 ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, `Lv${lv} 奥(貫通)`);
        assert.equal(lost(w, 5), 0, "3.0 マスの外"); assert.equal(lost(w, 6), 0, "幅 0.9 の外(真横)"); assert.equal(combo(w).step, 0, "3段目のあとは1段目へ戻る");
        FC(w).end("test");
    }
});
test("【4】罪状: 3段目に当たった敵ごとに +1(外れた敵には付かない)・1・2段目では付かない・3段を2周で 2・上限 3・1回の斬撃で同じ敵に複数付かない", () => {
    const w = markWorld(); aimDegree(w, 0, 3);
    placePolar(w, 3, 1.2, 0); placePolar(w, 4, 2.7, 0); placePolar(w, 5, 1.5, 90);                                          // 直線上の2体 + 外れる1体
    press(w); frames(w, 22); press(w); frames(w, 24); assert.deepEqual([3, 4, 5].map(i => sin(w, i)), [0, 0, 0], "1・2段目では付かない");
    press(w); frames(w, 40); assert.deepEqual([3, 4, 5].map(i => sin(w, i)), [1, 1, 0], "3段目: 当たった2体に +1 ずつ・外れた敵には付かない");
    frames(w, 30); assert.deepEqual([3, 4].map(i => sin(w, i)), [1, 1], "同じ斬撃の中で、あとから増えない(1振り1ヒット)");
    for (let round = 2; round <= 4; round++) { press(w); frames(w, 22); press(w); frames(w, 24); press(w); frames(w, 40); assert.equal(sin(w, 3), Math.min(3, round), `${round} 周目`); }
    assert.equal(sin(w, 3), 3, "上限 3"); near(TS(w).sin.remainingOf(ev(w, 3)), 8, 1.0, "満タンでも、追加のたびに 8 秒へ取り直す(最後の命中からの経過 0.7 秒ほどの分だけ少ない)");
    FC(w).end("test"); assert.deepEqual(plain(TS(w).getState().sins), [], "戦闘の終了で全部消える");
});
test("【4b】3段目が壁・距離で外れたとき・敵のいない空振りでは罪状が付かない。コンボの途中で敵が倒れても落ちない", () => {
    const w = markWorld(); aimDegree(w, 0, 3); placePolar(w, 3, 5.0, 0);
    press(w); frames(w, 22); press(w); frames(w, 24); press(w); frames(w, 40); assert.equal(sin(w, 3), 0, "遠い敵には付かない"); assert.deepEqual(plain(TS(w).getState().sins), []);
    assert.deepEqual(plain(TS(w).getState().watched).length > 0, true, "3段目の斬撃は見張られる(外れても記録するだけ)");
    FC(w).end("test");
});

test("【5】コンボ: Cooldown 0(いつでも次を押せる)・継続の受付 = 硬直が終わってから 0.5 秒・過ぎたら1段目へ戻る・HUD は n/3・硬直の間は入力が空振りして段を進めない", () => {
    const w = markWorld(); aimDegree(w, 0, 3); placePolar(w, 3, 1.0, 0);
    assert.equal(combo(w).max, 3); assert.equal(plain(FC(w).getCooldowns()).themis_sin_mark || 0, 0, "Cooldown 0");
    const hud0 = plain(FC(w).getHudSlots()).find(s => s.slot === "attack"); assert.equal(hud0.detail, "READY"); assert.equal(hud0.combo.max, 3, "HUD の段数は3");
    press(w); assert.equal(combo(w).step, 1); const hud1 = plain(FC(w).getHudSlots()).find(s => s.slot === "attack");
    assert.equal(hud1.detail, "1/3"); assert.equal(hud1.combo.max, 3); assert.equal(hud1.name, "罪科の刻印"); assert.equal(hud1.iconIndex, 76);
    frames(w, 16 + 30 - 6); assert.equal(combo(w).step, 1, "硬直 16 フレーム + 受付 30 フレーム(0.5 秒)の手前ではまだ続く");
    frames(w, 12); assert.equal(combo(w).step, 0, "受付を過ぎたら1段目へ戻る"); press(w); assert.equal(last(w).step, 1);
    frames(w, 60); assert.equal(combo(w).step, 0, "3段目まで行かずに受付を過ぎたら戻る");
    // 硬直の間の入力は段を進めない
    resetHp(w); press(w, "lmb", 1); const s1 = combo(w).step; w.attackClick(); assert.equal(combo(w).step, s1, "硬直の間の入力は段を進めない");
    FC(w).end("test");
});

test("【6】5つの枠(LMB / Shift / E / X / C)のどれからでも同じ3段コンボ。キーからも3段目で罪状 +1", () => {
    for (const slot of ["lmb", "shift", "e", "x", "c"]) {
        const w = markWorld({ slots: { [slot]: "themis_sin_mark" } }); aimDegree(w, 0, 3); placePolar(w, 3, 1.2, 0);
        for (let step = 1; step <= 3; step++) { press(w, slot); frames(w, step === 3 ? 40 : 24); assert.equal(last(w).ok, true, `${slot} 段${step}`); assert.equal(last(w).step, step); assert.equal(last(w).skillId, "themis_sin_mark"); }
        assert.equal(sin(w, 3), 1, `${slot}: 3段目で罪状 +1`); FC(w).end("test");
    }
});
test("【6b】薙ぎ払い(Hermes の3段)・双門(Janus の2段)は変わらない: Themis と同じ戦闘で入れ替えても、コンボは1段目から。薙ぎ払い・双門では罪状は付かない", () => {
    const w = markWorld({ slots: { lmb: "hermes_sweep", e: "themis_sin_mark" }, rings: ["themis", "hermes"] }); aimDegree(w, 0, 3); placePolar(w, 3, 1.2, 0);
    for (let step = 1; step <= 3; step++) { press(w, "lmb"); frames(w, step === 3 ? 40 : 16); assert.equal(last(w).step, step, "薙ぎ払い " + step + "(受付は斬撃から 0.5 秒 = 従来どおり)"); assert.equal(last(w).skillId, "hermes_sweep"); }
    assert.equal(sin(w, 3), 0, "薙ぎ払いの3段目は罪状を付けない");
    press(w, "e"); frames(w, 24); assert.equal(last(w).step, 1); assert.equal(last(w).skillId, "themis_sin_mark", "切り替えで1段目から");
    press(w, "lmb"); frames(w, 30); assert.equal(last(w).step, 1); assert.equal(last(w).skillId, "hermes_sweep", "戻しても1段目から"); FC(w).end("test");
    const j = markWorld({ slots: { lmb: "janus_dual_gate", e: "themis_sin_mark" }, rings: ["themis", "janus"] }); aimDegree(j, 0, 3); placePolar(j, 3, 1.2, 0);
    press(j, "lmb"); frames(j, 26); press(j, "lmb"); frames(j, 40); assert.equal(last(j).step, 2); assert.equal(combo(j).max, 2, "双門は2段のまま"); assert.equal(sin(j, 3), 0, "双門は罪状を付けない");
    press(j, "e"); frames(j, 24); assert.equal(last(j).skillId, "themis_sin_mark"); assert.equal(last(j).step, 1); assert.equal(combo(j).max, 3); FC(j).end("test");
});
test("【6c】保存データ: コンボの状態・罪状はセーブに入らない。RingLoadout・Core は変わらない", () => {
    const w = markWorld({ begin: false }); const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, D(w).getPersistentData()]); const s0 = snap();
    assert.equal(FC(w).begin().ok, true); frames(w, 2); parkOthers(w, []); aimDegree(w, 0, 3); placePolar(w, 3, 1.2, 0);
    press(w); frames(w, 22); press(w); frames(w, 24); press(w); frames(w, 40); assert.equal(sin(w, 3), 1);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/"stacks"|sinStack|"sins?"|"remaining"|"watched"/.test(saved), false);
    FC(w).end("test"); assert.equal(snap(), s0, "保存データは変わらない");
});

console.log(`\nall ${passed} passed`);
