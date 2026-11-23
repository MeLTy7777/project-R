"use strict";
// Stage 2-A: Janus の登録(カタログ・バランス・RingLoadout)と、双門(janus_dual_gate)= 基本攻撃の2段コンボ。
// 実エンジン(実Map004 + 全plugin + 実 SwordSystem)。入力は本物の左クリック / キー。実機の見た目は tools/mz_cdp/janus_verify.cjs。
//   【1】登録: 5スキルが設計・実行時定義・バランス・RingLoadout(装備した Janus の指輪)に載り、どの枠にも入る
//   【2】双門 1段目: 前方 110° の扇・1.8 マス(範囲内だけ・後ろ・範囲外は当たらない)/ 基礎物理ダメージ 100 / 108 / 115 %(Lv1〜3)
//   【3】双門 2段目: 前方の貫通する直線 3.0 マス × 幅 0.9(2体貫通・範囲外・横ずれは当たらない)/ 125 / 135 / 150 %。2段目の入力でマウスの向きへ向け直す
//   【4】コンボ: Cooldown 0・硬直の間は次の入力を受けない・継続の受付は硬直が終わってから 0.5 秒・受付を過ぎたら1段目へ戻る・1段ごとに同じ敵へ1回
//   【5】5つの枠(LMB / Shift / E / X / C)のどれからでも同じ。HUD は「1/2」。薙ぎ払い(Hermes の3段)は変わらない・切り替えで1段目から
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const JANUS = ["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);

function janusWorld({ slots = { lmb: "janus_dual_gate" }, level = 1, hermes = false, begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    const rings = hermes ? ["janus", "hermes"] : ["janus"];
    for (const r of rings) { assert.equal(D(w).assignRingToPlayer(r).ok, true, r); assert.equal(RL(w).equipRing(r).ok, true, r); }
    for (const id of JANUS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    if (hermes) { for (const id of ["hermes_zetsu", "hermes_issen"]) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); } }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const KEY = { shift: ["ShiftLeft", 16, { shiftKey: true }], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
function press(w, slot, hold = 3) {
    if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); frames(w, hold); w.ctx.TouchInput._mousePressed = false; frames(w, 1); return; }
    w.keyDown(...KEY[slot]); frames(w, hold); w.keyUp(KEY[slot][0], KEY[slot][1]); frames(w, 1);
}
const last = w => plain(FC(w).getLastResult());
const combo = w => plain(FC(w).getComboState());
// 1振り(押す)→ 結果のフレームまで進める。敵 id のHPの減りを返す。
const swingAndLose = (w, id, slot = "lmb", wait = 30) => { resetHp(w); press(w, slot); frames(w, wait); return lost(w, id); };
// 武器の基礎ダメージ W: Lv1 の1段目(倍率 1.0)の1ヒット
function baseDamage() {
    const w = janusWorld(); parkOthers(w, [4]); placePolar(w, 4, 1.0, 0); aimDegree(w, 0, 3);
    const d = swingAndLose(w, 4); assert.ok(d > 0, "基礎ダメージ " + d); FC(w).end("test"); return d;
}
const W = baseDamage();

// ---------------------------------------------------------------- 【1】登録 ----------------------------------------------------------------
test("【1】登録: 5スキルが設計(実装済み)・実行時定義・バランス・RingLoadout に載る。Janus の指輪を持って装備すれば、5枠のどれにも入る。未装備・未所持では出ない", () => {
    const w = buildWorld(); assert.deepEqual(w.failures, []); w.enterMap(4, 12, 25); w.frames(3);
    const cat = w.ctx.ProjectRCardCatalog, deck = D(w), bal = w.ctx.ProjectRCardBalance;
    assert.deepEqual(plain(cat.godDesign("janus")).map(r => r.runtimeCardId), JANUS);
    assert.ok(cat.godDesign("janus").every(r => r.implemented && r.implementedLevels === 3 && r.ringId === "janus" && r.god === "janus"));
    assert.deepEqual(plain(cat.runtimeIdAudit().problems), [], "予約IDの監査に問題なし");
    assert.deepEqual(JANUS.map(id => deck.definitions.card(id)?.ringId), Array(5).fill("janus"));
    assert.deepEqual(JANUS.map(id => deck.definitions.card(id).cooldownSeconds), [0.05, 10, 9, 12, 7], "カード定義の Cooldown(CardBalance の値): 閉門 10 / 反照 9 / 表裏転化 12 / 境界断ち 7 秒。双門は CardBalance の最小値 0.05(コンボなので、フィールド戦闘の Cooldown は SKILL_DEFS の 0)");
    assert.equal(bal.isReady(), true);
    assert.deepEqual(JANUS.map(id => bal.hasCard(id)), Array(5).fill(true));
    // RingLoadout: 未所持・未装備では 0 件 → 所持 → 装備で 5 件
    assert.deepEqual(plain(RL(w).getRingSkills("janus")), JANUS, "承認済みの表");
    assert.deepEqual(plain(RL(w).getUnlockedSkills("janus")), [], "未所持では解放されない");
    assert.equal(deck.assignRingToPlayer("janus").ok, true); assert.deepEqual(plain(RL(w).getUnlockedSkills("janus")), JANUS);
    assert.equal(RL(w).setSkill("lmb", "janus_dual_gate").ok, false, "未装備の指輪のスキルは入らない");
    assert.equal(RL(w).equipRing("janus").ok, true);
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of JANUS) { assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id); RL(w).clearSkill(slot); }
    assert.equal(RL(w).getSkillRing("janus_boundary_slash"), "janus");
});

test("【1b】バランス(Lv の累積・置換): 双門 100/108/115% と 125/135/150%、閉門・反照・表裏転化・境界断ちの Lv1〜3 の数値が仕様どおり", () => {
    const w = buildWorld(); w.enterMap(4, 12, 25); w.frames(3); const b = w.ctx.ProjectRCardBalance;
    const e = (id, lv) => plain(b.effects(id, lv));
    assert.deepEqual([1, 2, 3].map(lv => [e("janus_dual_gate", lv).damageScale, e("janus_dual_gate", lv).secondDamageScale]), [[1, 1.25], [1.08, 1.35], [1.15, 1.5]]);
    assert.deepEqual(["arcDegrees", "radiusTiles", "rangeTiles", "pathWidthTiles", "comboWindowSeconds"].map(k => b.constant("janus_dual_gate", k)), [110, 1.8, 3, 0.9, 0.5]);
    assert.deepEqual([1, 2, 3].map(lv => [e("janus_closed_gate", lv).immobilizeSeconds, e("janus_closed_gate", lv).slowFactor, e("janus_closed_gate", lv).slowSeconds]), [[1.5, 0.8, 1.5], [2, 0.75, 2], [2.5, 0.7, 2.5]]);
    assert.deepEqual([b.constant("janus_closed_gate", "castRangeTiles"), b.constant("janus_closed_gate", "radiusTiles"), b.cooldownSeconds("janus_closed_gate")], [3, 1.2, 10]);
    assert.deepEqual([1, 2, 3].map(lv => [e("janus_reflection", lv).counterWindowSeconds, e("janus_reflection", lv).damageScale]), [[0.4, 1], [0.5, 1.25], [0.6, 1.5]]);
    assert.deepEqual([b.constant("janus_reflection", "rangeTiles"), b.cooldownSeconds("janus_reflection")], [3, 9]);
    assert.deepEqual([1, 2, 3].map(lv => e("janus_inversion", lv).rangeTiles), [2.5, 3, 3.5]); assert.equal(b.cooldownSeconds("janus_inversion"), 12);
    assert.deepEqual([1, 2, 3].map(lv => e("janus_boundary_slash", lv).damageScale), [1.8, 2.1, 2.4]);
    assert.deepEqual(["windupSeconds", "rangeTiles", "pathWidthTiles"].map(k => b.constant("janus_boundary_slash", k)), [0.2, 4, 1.2]); assert.equal(b.cooldownSeconds("janus_boundary_slash"), 7);
});

// ---------------------------------------------------------------- 【2】1段目 ----------------------------------------------------------------
test("【2】双門 1段目: 前方 110° の扇・1.8 マス。範囲内の敵だけに、基礎物理ダメージ × 100 / 108 / 115 % を1回", () => {
    for (const [lv, scale] of [[1, 1], [2, 1.08], [3, 1.15]]) {
        const w = janusWorld({ level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.0, 0); placePolar(w, 4, 1.4, 45); placePolar(w, 5, 1.0, 180); placePolar(w, 6, 2.6, 0);          // 正面 / 斜め45°(弧の中) / 真後ろ / 範囲外
        resetHp(w); press(w, "lmb"); frames(w, 30);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 正面`); assert.ok(lost(w, 3) > 0);
        near(lost(w, 4), Math.round(W * scale), 1, `Lv${lv} 斜め45°(弧は ±55°)`);
        assert.equal(lost(w, 5), 0, "真後ろは当たらない"); assert.equal(lost(w, 6), 0, "1.8 マスの外は当たらない");
        assert.equal(last(w).step, 1); near(last(w).scale, scale, 1e-9);
        FC(w).end("test");
    }
});
test("【2b】1段目の扇の外側: 真横(90°。弧は ±55°)・半径(1.8)の少し外は当たらない(敵の体の大きさ ±0.5 を考慮した配置)。同じ敵には1回だけ(ダメージは1段分)", () => {
    const w = janusWorld(); aimDegree(w, 0, 3);
    placePolar(w, 3, 1.5, 90); placePolar(w, 4, 1.0, 0); placePolar(w, 5, 2.6, 20);
    resetHp(w); press(w, "lmb"); frames(w, 40);
    assert.equal(lost(w, 3), 0, "±55° の外"); assert.equal(lost(w, 5), 0, "半径 1.8 の外");
    near(lost(w, 4), W, 1, "正面は1段分だけ(扇が複数フレームにわたっても1回)");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【3】2段目 ----------------------------------------------------------------
test("【3】双門 2段目: 前方の貫通する直線 3.0 × 幅 0.9。直線上の2体を貫通・範囲外と横ずれは当たらない。125 / 135 / 150 %", () => {
    for (const [lv, scale2] of [[1, 1.25], [2, 1.35], [3, 1.5]]) {
        const w = janusWorld({ level: lv }); aimDegree(w, 0, 3);
        press(w, "lmb"); frames(w, 20);                                                                      // 1段目(敵なし)
        assert.equal(combo(w).step, 1);
        placePolar(w, 3, 1.2, 0); placePolar(w, 4, 2.7, 0); placePolar(w, 5, 3.9, 0); placePolar(w, 6, 1.5, 90);       // 手前 / 奥(貫通)/ 長さの外 / 真横
        resetHp(w); press(w, "lmb"); frames(w, 30);
        assert.equal(last(w).step, 2);
        near(lost(w, 3), Math.round(W * scale2), 1, `Lv${lv} 手前`); near(lost(w, 4), Math.round(W * scale2), 1, `Lv${lv} 奥(貫通)`);
        assert.equal(lost(w, 5), 0, "3.0 マスの外"); assert.equal(lost(w, 6), 0, "幅 0.9 の外(真横)");
        assert.equal(combo(w).step, 0, "2段目のあとは1段目へ戻る");
        FC(w).end("test");
    }
});
test("【3b】2段目の入力で、マウスの向きへ向け直す: 1段目は上・2段目は右へ → 右の敵だけ2段目で当たる", () => {
    const w = janusWorld(); aimDegree(w, 0, 3);
    press(w, "lmb"); frames(w, 20);
    aimDegree(w, 90, 3); placePolar(w, 3, 2.0, 90); placePolar(w, 4, 2.0, 0);
    resetHp(w); press(w, "lmb"); frames(w, 30);
    near(lost(w, 3), Math.round(W * 1.25), 1, "右(2段目の向き)"); assert.equal(lost(w, 4), 0, "上(1段目の向き)には出ない");
    assert.equal(last(w).step, 2);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【4】コンボの時間 ----------------------------------------------------------------
test("【4】コンボ: Cooldown 0・硬直(18 フレーム)の間は次の入力を受けず段も進まない・受付は硬直が終わってから 0.5 秒(30 フレーム)・過ぎたら1段目から", () => {
    const w = janusWorld(); aimDegree(w, 0, 3);
    assert.equal(plain(FC(w).getCooldowns()).janus_dual_gate, 0, "Cooldown 0");
    press(w, "lmb", 1);                                                                                      // 1段目(押下 ~1 フレーム)
    assert.equal(combo(w).step, 1); const lastAt = combo(w).swings;
    // 硬直の間(あと数フレーム): 入力は受けない(段は進まない・拒否の記録)
    const r = plain(FC(w).useAbility("attack")); assert.equal(r.ok, false); assert.equal(combo(w).step, 1, "段は進まない"); assert.equal(combo(w).swings, lastAt);
    // 硬直 18 + 受付 30 の内側: 進む
    frames(w, 18 + 20); assert.equal(combo(w).step, 1, "受付の内側"); assert.ok(combo(w).timeLeft > 0);
    const ok = plain(FC(w).useAbility("attack")); assert.equal(ok.ok, true); assert.equal(ok.step, 2, "硬直後 0.5 秒以内の入力は2段目");
    // 2段目のあとは1段目へ。受付を過ぎたら、1段目へ戻る
    frames(w, 24 + 40);                                                                                      // 2段目の硬直 + 受付(30)を過ぎる
    const again = plain(FC(w).useAbility("attack")); assert.equal(again.step, 1, "2段目のあと(受付の内外を問わず)次は1段目");
    frames(w, 18 + 31 + 2); assert.equal(combo(w).step, 0, "受付(硬直後 0.5 秒)を過ぎると1段目へ戻る(状態も0)");
    assert.equal(plain(FC(w).useAbility("attack")).step, 1);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【5】枠・HUD・薙ぎ払いとの共存 ----------------------------------------------------------------
test("【5】5つの枠(LMB / Shift / E / X / C)のどれにあっても同じ: 1段目・2段目。HUD の枠は「n/2」。Cooldown 表示なし", () => {
    for (const slot of ["lmb", "shift", "e", "x", "c"]) {
        const w = janusWorld({ slots: { [slot]: "janus_dual_gate" } }); aimDegree(w, 0, 3); placePolar(w, 3, 1.0, 0); placePolar(w, 4, 2.2, 0);
        resetHp(w); press(w, slot); frames(w, 20);
        const hudSlot = plain(FC(w).getHudState()).slots.find(s => s.slot === (slot === "lmb" ? "attack" : { shift: "mobility", e: "special", x: "card1", c: "card2" }[slot]));
        assert.equal(hudSlot.state, "ready", slot + " の HUD: ready");
        assert.ok(lost(w, 3) > 0, slot + " 1段目");
        const hud = plain(w.ctx.ProjectRBattleHUD.getViewModel().slots).find(s => s.fieldSkillId === "janus_dual_gate" || s.name === "双門");
        assert.ok(hud, slot + ": HUD に 双門"); assert.equal(hud.detail, "1/2", slot + " の HUD は 1/2"); assert.equal(hud.combo.max, 2);
        frames(w, 20); press(w, slot); frames(w, 30);
        assert.ok(lost(w, 4) > 0, slot + " 2段目(直線 3.0)で奥の敵"); assert.equal(plain(FC(w).getCooldowns()).janus_dual_gate, 0);
        FC(w).end("test");
    }
});
test("【5b】薙ぎ払い(Hermes の3段)は変わらない: 3段・受付 0.5 秒。双門との切り替えは1段目から", () => {
    const w = janusWorld({ slots: { lmb: "hermes_sweep", shift: "janus_dual_gate" }, hermes: true }); aimDegree(w, 0, 3);
    press(w, "lmb", 1); frames(w, 20); assert.deepEqual([combo(w).step, combo(w).max], [1, 3]);
    press(w, "lmb", 1); frames(w, 20); assert.equal(combo(w).step, 2);
    press(w, "shift"); frames(w, 25);                                                                        // 双門へ切り替え: 1段目から(2段目にならない)
    assert.equal(last(w).step, 1); assert.deepEqual([combo(w).step, combo(w).max], [1, 2]);
    press(w, "lmb", 1); frames(w, 25); assert.equal(last(w).step, 1, "薙ぎ払いに戻っても1段目から"); assert.equal(combo(w).max, 3);
    press(w, "lmb", 1); frames(w, 25); press(w, "lmb", 1); frames(w, 25); assert.equal(combo(w).step, 0, "薙ぎ払いは3段で一巡");
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
