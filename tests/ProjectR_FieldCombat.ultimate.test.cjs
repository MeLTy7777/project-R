"use strict";
// Stage 1E-1: RingLoadout の Q 枠の奥義(ヘルメース・アポロン)を、FieldCombat の指輪モードへつなぐ。
// 実エンジン(実Map004 + 全plugin + 実ハンドラ)。入力は本物のキー(Input._onKeyDown)。実機(MZ)の見た目・カットインは Node では扱わない。
//   【1】Q が空 / 無効(未実装)= 奥義なし(常駐の神・ゲージ・自動のヘルメースなし)。Core の保存された選択が別にあっても漏れない
//   【2】Q = ヘルメース / アポロン: Core の選択が別でも Q の指輪。満タンのゲージで実際の Q キーで発動し、成功後にだけゲージを消費
//   【3】失敗(ゲージ不足・handler 失敗・例外・神の崩壊・handler 解除)ではゲージは減らない
//   【4】戦闘中の所有の変更(指輪を手放す)で Q は発動しない。ゲージ・常駐状態は戦闘の終わりまで残る
//   【5】U キー: 指輪モードの戦闘中は、FieldCombat の入口でも UltimateActivation の独自の入力経路(保留・Scene_Map.update)でも止まる。legacy・戦闘外・ゲート無しは従来どおり
//   【6】Core の保存データ・選択は一切変わらない(setUltimateRing の呼び出しなし・getUltimateRingId の差し替えなし)
//   【7】後始末: 戦闘の終了・開始の失敗・マップ移動・読み込みで、この戦闘だけの指定は消える。次の戦闘へ漏れない
//   【8】隔離: legacy の FieldCombat・通常のカード戦闘(第2引数なし / {} / null / 文字列)・SoulMode・ULTIMATE メニュー(Core)の選択は従来どおり
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck;
const UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, GM = w => w.ctx.ProjectRGodSummonManager;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const fill = w => { const g = GA(w); return g.addUltimateGauge(g.getUltimateGaugeMax(), "test"); };
const gauge = w => ({ has: GA(w).hasUltimateGaugeState(), cur: GA(w).getUltimateGauge(), max: GA(w).getUltimateGaugeMax() });
const hermesActive = w => w.ctx.ProjectRHermesUltimate.isHermesUltimateActive();
const apolloActive = w => w.ctx.ProjectRApolloUltimate.isApolloUltimateActive();
const ov = w => plain(GM(w).getBattleUltimateRingOverride());
const persistentData = w => JSON.stringify(D(w).getPersistentData());

// q: RingLoadout の Q 枠(指輪ID | null)/ core: CardDeckCore の保存された奥義の選択(別の指輪にしておく)/ extra: 追加で持って装備する指輪
function ringWorld({ q = null, core = null, extra = [], source = "auto", begin = true } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource(source);
    for (const ring of ["hermes", "apollo", ...extra]) assert.equal(D(w).assignRingToPlayer(ring).ok, true, ring);
    for (const ring of ["hermes", "apollo", ...extra]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
    if (q) assert.equal(RL(w).setUltimate(q).ok, true, "Q=" + q);
    if (core) assert.equal(D(w).setUltimateRing(core).ok, true, "core=" + core);
    attachHpBars(w, ENEMIES, HP);
    w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); }
    return w;
}
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const pressU = (w, hold = 3) => { const u = UA(w).getInputBinding(); w.keyDown(u.code, u.keyCode); frames(w, hold); w.keyUp(u.code, u.keyCode); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());

// ---------------------------------------------------------------- 【1】Q が空 / 無効 ----------------------------------------------------------------
test("【1a】Q が空: 奥義なし(常駐の神・ゲージ・自動のヘルメースなし)。Core の選択が別にあっても漏れない。Q・U は何も起こさない", () => {
    for (const core of [null, "hermes", "apollo"]) {
        const w = ringWorld({ q: null, core });
        assert.equal(RL(w).getUltimate(), null);
        assert.equal(FC(w).getLoadoutMode(), "ring");
        assert.equal(GM(w).hasPersistentUltimateBattleState(), false, "常駐の神の戦闘状態なし (core=" + core + ")");
        assert.equal(GM(w).hasPersistentUltimateSummon(), false);
        assert.equal(GM(w).getPersistentUltimateRingId(), null, "ヘルメースへ自動で戻らない");
        assert.deepEqual(ov(w), { ringId: null }, "明示的な「なし」(Core の選択へは戻さない)");
        assert.deepEqual(gauge(w), { has: false, cur: 0, max: 0 }, "ゲージの状態もない");
        const s = plain(FC(w).getUltimateState()); assert.deepEqual([s.selected, s.ringId, s.reason], [null, null, "emptySlot"]);
        assert.equal(D(w).getUltimateRingId() ?? null, core, "Core の選択は元のまま");
        const lr0 = plain(FC(w).getLastResult()); const q = plain(FC(w).useAbility("ultimate")); assert.deepEqual([q.ok, q.reason], [false, "emptySlot"]);
        assert.deepEqual(plain(FC(w).getLastResult()), lr0, "空の枠は記録も点滅もしない");
        pressQ(w); pressU(w);
        assert.equal(hermesActive(w) || apolloActive(w), false);
        assert.equal(UA(w).getLastUltimateActivationResult(), null, "UltimateActivation は一度も呼ばれない");
        const hud = plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate"); assert.deepEqual([hud.state, hud.ready], ["empty", false]);
        FC(w).end("test");
    }
});

test("【1b】Q が未実装の指輪(Janus): 奥義なし。常駐の神・ゲージなし。Q は ultimateUnavailable(HUD は unavailable)", () => {
    const w = ringWorld({ q: "janus", core: "hermes", extra: ["janus"] });
    assert.equal(RL(w).getUltimate(), "janus");
    assert.equal(UA(w).hasUltimateHandler(GM(w).resolveGodId("janus")), false, "janus の handler はない(作らない)");
    const s = plain(FC(w).getUltimateState()); assert.deepEqual([s.selected, s.ringId, s.reason], ["janus", null, "ultimateUnavailable"]);
    assert.equal(GM(w).hasPersistentUltimateBattleState(), false);
    assert.equal(gauge(w).has, false);
    assert.equal(D(w).getUltimateRingId(), "hermes", "Core の選択(ヘルメース)は使われず、変わりもしない");
    const q = plain(FC(w).useAbility("ultimate")); assert.deepEqual([q.ok, q.reason], [false, "ultimateUnavailable"]);
    assert.equal(plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate").state, "unavailable");
    pressQ(w); assert.equal(last(w).reason, "ultimateUnavailable", "物理の Q も同じ");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【2】Q = ヘルメース / アポロン ----------------------------------------------------------------
for (const [ring, other, active, otherActive] of [["hermes", "apollo", hermesActive, apolloActive], ["apollo", "hermes", apolloActive, hermesActive]]) {
    test(`【2】Q = ${ring}(Core の選択は ${other}): 戦闘の神・指輪は ${ring}。満タンで実際の Q キー → 発動し、成功後にだけゲージ消費。Core の保存データは不変`, () => {
        const w = ringWorld({ q: ring, core: other });
        const data0 = persistentData(w), getter = D(w).getUltimateRingId;
        let setCalls = 0; const orig = D(w).setUltimateRing; D(w).setUltimateRing = function () { setCalls++; return orig.apply(this, arguments); };
        assert.equal(GM(w).getPersistentUltimateRingId(), ring); assert.equal(GM(w).getPersistentUltimateGodId(), ring);
        assert.equal(GM(w).hasPersistentUltimateSummon(), true); assert.equal(GM(w).isPersistentUltimateAvailable(), true);
        assert.deepEqual(ov(w), { ringId: ring });
        assert.equal(D(w).getUltimateRingId(), other, "Core の選択は別のまま");
        const s = plain(FC(w).getUltimateState()); assert.deepEqual([s.selected, s.ringId, s.reason], [ring, ring, null]);
        assert.equal(gauge(w).has, true); assert.equal(gauge(w).cur, 0);
        const hud0 = plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate"); assert.deepEqual([hud0.state, hud0.ready], ["charging", false]);
        // ゲージ不足: 発動しない・ゲージは変わらない
        pressQ(w); assert.equal(last(w).reason, "gaugeNotFull"); assert.equal(active(w), false); assert.equal(gauge(w).cur, 0);
        // 満タン → 実際の Q キー
        fill(w); const max = gauge(w).max; assert.equal(gauge(w).cur, max);
        const hud1 = plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate"); assert.deepEqual([hud1.state, hud1.ready], ["ready", true]);
        pressQ(w);
        const r = plain(UA(w).getLastUltimateActivationResult());
        assert.deepEqual([r.ok, r.started, r.godId, r.ringId, r.consumed, r.source], [true, true, ring, ring, max, "field"], JSON.stringify(r));
        assert.equal(last(w).ok, true); assert.equal(last(w).slot, "ultimate");
        assert.equal(active(w), true, ring + " の奥義が始まる"); assert.equal(otherActive(w), false, other + " は始まらない");
        assert.equal(gauge(w).cur, 0, "成功後にゲージを消費");
        frames(w, 30);
        // Core の保存データ・選択・getter は変わらない
        assert.equal(setCalls, 0, "setUltimateRing は一度も呼ばれない");
        assert.equal(D(w).getUltimateRingId, getter, "getUltimateRingId は差し替えられていない");
        assert.equal(D(w).getUltimateRingId(), other); assert.equal(persistentData(w), data0, "Core の保存データは1文字も変わらない");
        D(w).setUltimateRing = orig;
        FC(w).end("test");
        assert.equal(persistentData(w), data0, "戦闘のあとも変わらない");
    });
}

test("【2c】Q = ヘルメース / Core の選択なし(null): 自動の選択はしない。Q の指輪だけが使われ、戦闘のあとも Core の選択は null のまま", () => {
    const w = ringWorld({ q: "hermes", core: null });
    assert.equal(D(w).getUltimateRingId() ?? null, null);
    assert.equal(GM(w).getPersistentUltimateRingId(), "hermes");
    FC(w).end("test");
    assert.equal(D(w).getUltimateRingId() ?? null, null, "legacy のような自動選択を書き込まない");
});

// ---------------------------------------------------------------- 【3】失敗ではゲージを減らさない ----------------------------------------------------------------
test("【3】失敗(handler の {ok:false}・例外・不正な結果・神の崩壊・handler 解除)ではゲージは減らず、奥義は始まらない。成功すれば消費", () => {
    const run = (setup, expectReason) => {
        const w = ringWorld({ q: "hermes", core: "apollo" });
        fill(w); const max = gauge(w).max;
        setup(w);
        const before = gauge(w).cur;
        pressQ(w);
        const reason = last(w).reason;
        assert.equal(last(w).ok, false, expectReason);
        assert.equal(reason, expectReason, JSON.stringify(last(w)));
        assert.equal(gauge(w).cur, before, expectReason + ": ゲージは減らない"); assert.equal(before, max);
        assert.equal(hermesActive(w), false);
        FC(w).end("test");
        return w;
    };
    run(w => UA(w).registerUltimateHandler("hermes", () => ({ ok: false, reason: "nope" })), "ultimateStartFailed");
    run(w => UA(w).registerUltimateHandler("hermes", () => { throw new Error("boom"); }), "ultimateHandlerException");
    run(w => UA(w).registerUltimateHandler("hermes", () => true), "ultimateStartFailed");
    run(w => assert.equal(GM(w).damagePersistentUltimate(9999, "test").collapsed, true), "persistentUltimateUnavailable");
    // handler を解除した = 実装されていない扱い(ゲージは消えない・FieldCombat の入口で断る)
    const w = run(w => assert.equal(UA(w).unregisterUltimateHandler("hermes").removed, true), "ultimateUnavailable");
    assert.equal(w.ctx.ProjectRUltimateActivation.getLastUltimateActivationResult(), null, "handler が無いときは UltimateActivation まで届かない");
});

test("【3b】UltimateActivation を直接呼んでも(handler 解除済み)ゲージは減らない: noUltimateHandler。ゲージ不足は gaugeNotFull", () => {
    const w = ringWorld({ q: "apollo" });
    assert.equal(UA(w).requestUltimateActivation("api").reason, "gaugeNotFull");
    fill(w); UA(w).unregisterUltimateHandler("apollo");
    const r = plain(UA(w).requestUltimateActivation("api")); assert.equal(r.reason, "noUltimateHandler"); assert.equal(gauge(w).cur, gauge(w).max);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【4】戦闘中の所有・装備の変更 ----------------------------------------------------------------
// CardDeckCore は戦闘中の指輪の移動を拒否する(RING_TRANSFER_DURING_BATTLE)。それでも、読み込み・外部の変更で所有・装備が変わった場合に備えて、Q の発動のたびに確かめ直す。
// 所有の変更は getRingOwner の差し替えで、装備の変更は保存データの直接の書き換えで再現する(Core の API は拒否するので使えない)。
const loseRing = (w, id) => { const d = D(w), orig = d.getRingOwner; d.getRingOwner = ringId => (ringId === id ? "actor:2" : orig.call(d, ringId)); return () => { d.getRingOwner = orig; }; };
test("【4a】戦闘中に Q の指輪を手放すと(所有の変更): Q は発動しない(ultimateUnavailable)。ゲージ・常駐の神は戦闘の終わりまで残り、ゲージは減らない", () => {
    const w = ringWorld({ q: "apollo", core: "hermes" });
    assert.equal(D(w).setRingUnowned("apollo").ok, false, "Core は戦闘中の指輪の移動を拒否する");
    fill(w); const max = gauge(w).max;
    const restore = loseRing(w, "apollo");
    assert.equal(RL(w).getUltimate(), null, "RingLoadout の掃除で Q 枠は空になる");
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo", "常駐の神の戦闘状態は戦闘の終わりまで残る(従来どおり)");
    assert.equal(plain(FC(w).getUltimateState()).reason, "ultimateUnavailable");
    assert.equal(plain(FC(w).getHudState()).slots.find(x => x.slot === "ultimate").state, "empty", "RingLoadout の検証で割り当てがすでに外れているので、HUD は「使用不可」ではなく「未設定」(発動の理由は ultimateUnavailable のまま)");
    pressQ(w); assert.equal(last(w).reason, "ultimateUnavailable"); assert.equal(apolloActive(w), false);
    assert.equal(gauge(w).cur, max, "ゲージは減らない");
    assert.equal(UA(w).getLastUltimateActivationResult(), null, "UltimateActivation までは届かない");
    restore();
    FC(w).end("test");
});
test("【4b】戦闘中に Q ではない方の指輪を手放しても、Q は影響を受けない", () => {
    const w = ringWorld({ q: "hermes", core: "apollo" });
    fill(w);
    const restore = loseRing(w, "apollo");
    assert.equal(RL(w).getUltimate(), "hermes");
    pressQ(w); assert.equal(last(w).ok, true); assert.equal(hermesActive(w), true); assert.equal(gauge(w).cur, 0);
    restore(); FC(w).end("test");
});
test("【4c】戦闘中に Q の指輪の装備が外れた(保存データの直接の変更): Q は発動しない。ゲージは減らない", () => {
    const w = ringWorld({ q: "hermes", core: "apollo" });
    fill(w); const max = gauge(w).max;
    const data = w.ctx.$gameSystem._projectRRingLoadout; data.equipped = data.equipped.filter(id => id !== "hermes");
    assert.equal(RL(w).isRingEquipped("hermes"), false);
    pressQ(w); assert.equal(last(w).reason, "ultimateUnavailable"); assert.equal(hermesActive(w), false); assert.equal(gauge(w).cur, max);
    FC(w).end("test");
});
test("【4d】戦闘中に Q 枠が別の指輪へ変わっても(外部の変更)、開始時の写しとずれていれば発動しない(戦闘中に別の神の奥義へ切り替わらない)", () => {
    const w = ringWorld({ q: "hermes", core: "hermes" });
    fill(w);
    w.ctx.$gameSystem._projectRRingLoadout.ultimate = "apollo";
    assert.equal(RL(w).getUltimate(), "apollo");
    pressQ(w); assert.equal(last(w).reason, "ultimateUnavailable"); assert.equal(apolloActive(w), false); assert.equal(hermesActive(w), false); assert.equal(gauge(w).cur, gauge(w).max);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【5】U キー ----------------------------------------------------------------
test("【5a】指輪モードの戦闘中: U は満タンのゲージ・有効な Q があっても発動しない(FieldCombat の入口)。Q は発動する。戦闘のあとは U は従来どおり入力に届く", () => {
    const w = ringWorld({ q: "hermes", core: "hermes" });
    fill(w); const max = gauge(w).max, diag0 = plain(UA(w).getInputDiagnostics()), last0 = UA(w).getLastUltimateActivationResult();
    pressU(w, 4);
    assert.deepEqual(plain(UA(w).getInputDiagnostics()), diag0, "U は UltimateActivation の入力にも届かない");
    assert.deepEqual(UA(w).getLastUltimateActivationResult(), last0); assert.equal(hermesActive(w), false); assert.equal(gauge(w).cur, max);
    pressQ(w); assert.equal(hermesActive(w), true); assert.equal(gauge(w).cur, 0);
    FC(w).end("test");
    const kd = plain(UA(w).getInputDiagnostics()).keyDowns, u = UA(w).getInputBinding();
    w.keyDown(u.code, u.keyCode); w.keyUp(u.code, u.keyCode);
    assert.equal(plain(UA(w).getInputDiagnostics()).keyDowns, kd + 1, "戦闘外は従来どおり");
});

test("【5b】UltimateActivation の独自の入力経路(FieldCombat の入口を通らない): ゲートが止めている間は、保留にも発動にもならない。解除・ゲート無しは従来どおり。例外は「止める」側", () => {
    // 通常のカード戦闘(FieldCombat なし)で、U の経路だけを確かめる
    const mk = () => {
        const w = buildWorld(); assert.deepEqual(w.failures, []);
        w.enterMap(4, 12, 25); w.frames(3);
        D(w).assignRingToPlayer("hermes"); D(w).setUltimateRing("hermes");
        const b = D(w).startCardBattle(D(w).FIXED_BATTLE); assert.equal(b.ok, true, JSON.stringify(b));
        frames(w, 3); fill(w); return w;
    };
    // ゲート無し: 従来どおり発動
    let w = mk(); pressU(w); assert.equal(hermesActive(w), true, "ゲート無しは従来どおり"); assert.equal(gauge(w).cur, 0);
    // ゲート true: keydown が保留にならない
    w = mk(); const max = gauge(w).max;
    assert.deepEqual(plain(UA(w).registerInputGate("t", () => true)), { ok: true, id: "t" });
    pressU(w); assert.equal(hermesActive(w), false); assert.equal(gauge(w).cur, max);
    assert.equal(plain(UA(w).getInputDiagnostics()).lastDecision, "suppressed");
    // 解除すれば従来どおり
    assert.equal(UA(w).unregisterInputGate("t").ok, true); pressU(w); assert.equal(hermesActive(w), true);
    // 保留に入ったあとでゲートが閉じる(戦闘の開始より前に押された U): Scene_Map.update で捨てる
    w = mk(); const u = UA(w).getInputBinding();
    w.keyDown(u.code, u.keyCode);                                                         // 保留に入る
    UA(w).registerInputGate("late", () => true); frames(w, 2); w.keyUp(u.code, u.keyCode); frames(w, 1);
    assert.equal(hermesActive(w), false, "保留中の U もゲートで捨てる"); assert.equal(gauge(w).cur, gauge(w).max);
    UA(w).unregisterInputGate("late"); pressU(w); assert.equal(hermesActive(w), true, "ゲート解除後の新しい U は届く(ラッチが残らない)");
    // 例外を投げるゲートは「止める」
    w = mk(); UA(w).registerInputGate("bad", () => { throw new Error("x"); }); pressU(w);
    assert.equal(hermesActive(w), false, "ゲートの例外は止める側");
    // 不正な登録
    assert.equal(UA(w).registerInputGate("", () => true).ok, false); assert.equal(UA(w).registerInputGate("x", null).ok, false);
    // 直接の呼び出し(Q・API)はゲートで止めない
    w = mk(); UA(w).registerInputGate("t", () => true); assert.equal(UA(w).requestUltimateActivation("api").ok, true);
});

// ---------------------------------------------------------------- 【7】後始末 ----------------------------------------------------------------
test("【7】後始末: 戦闘の終了・開始の失敗・マップ移動・読み込みで、この戦闘だけの指定は消える。次の戦闘へ漏れない(Core の選択どおり / 新しい Q)", () => {
    // 終了 → 次の戦闘は新しい Q(apollo)
    const w = ringWorld({ q: "hermes", core: "apollo" });
    assert.equal(GM(w).getPersistentUltimateRingId(), "hermes");
    FC(w).end("test");
    assert.equal(ov(w), null, "戦闘の終了で消える"); assert.equal(GM(w).hasPersistentUltimateBattleState(), false);
    assert.equal(RL(w).setUltimate("apollo").ok, true);
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo", "新しい Q の指輪"); FC(w).end("test");
    // 終了 → Q を空にして次の戦闘: 前の指輪を引き継がない
    assert.equal(RL(w).clearUltimate().ok, true);
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    assert.equal(GM(w).hasPersistentUltimateBattleState(), false, "Q が空なら、前の戦闘の指輪も Core の選択も使わない"); FC(w).end("test");
    // 開始の失敗(CombatSession が拒否): 巻き戻して指定が残らない
    const w2 = ringWorld({ q: "hermes", core: "apollo", begin: false });
    const cs = w2.ctx.ProjectRCombatSession, orig = cs.begin;
    cs.begin = () => ({ ok: false, reason: "test" });
    const f = plain(FC(w2).begin()); assert.equal(f.ok, false);
    cs.begin = orig;
    assert.equal(ov(w2), null, "失敗した開始から指定が残らない"); assert.equal(GM(w2).hasPersistentUltimateBattleState(), false);
    assert.equal(D(w2).isCardBattleActive(), false); assert.equal(FC(w2).getState().active, false);
    assert.equal(plain(FC(w2).getUltimateState()).selected, null, "写しも残らない");
    // 通常のカード戦闘の開始の失敗(デッキ不正)でも、指定は残らない
    const bad = plain(D(w2).startCardBattle(["nonexistent_card"], { ultimateRingId: "hermes" })); assert.equal(bad.ok, false);
    assert.equal(ov(w2), null);
    // マップ移動: 戦闘も指定も消える
    assert.equal(FC(w2).begin().ok, true); frames(w2, 2);
    assert.deepEqual(ov(w2), { ringId: "hermes" });
    w2.enterMap(4, 14, 25); frames(w2, 3);
    assert.equal(FC(w2).getState().active, false); assert.equal(ov(w2), null); assert.equal(GM(w2).hasPersistentUltimateBattleState(), false);
    assert.equal(plain(FC(w2).getUltimateState()).selected, null);
    // Game_Map.setup / onMapLoaded 単体でも消える
    const w3 = ringWorld({ q: "apollo", core: "hermes" });
    assert.deepEqual(ov(w3), { ringId: "apollo" });
    w3.run("$gameMap.setup($gameMap.mapId())"); assert.equal(ov(w3), null, "Game_Map.setup で消える");
});

// ---------------------------------------------------------------- 【8】隔離 ----------------------------------------------------------------
test("【8a】legacy の FieldCombat: 従来どおり(ヘルメースの自動選択・Core の選択の使用・U が使える)。第2引数は渡さない", () => {
    const w = ringWorld({ source: "legacy", begin: false });
    let args = null; const outer = D(w).startCardBattle;
    D(w).startCardBattle = function () { args = [...arguments]; return outer.apply(this, arguments); };
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    D(w).startCardBattle = outer;
    assert.equal(FC(w).getLoadoutMode(), "legacy");
    assert.equal(args.length, 1, "legacy は第2引数を足さない");
    assert.equal(D(w).getUltimateRingId(), "hermes", "ヘルメースを自動で選ぶ(従来どおり)");
    assert.equal(ov(w), null); assert.equal(GM(w).getPersistentUltimateRingId(), "hermes", "Core の選択を使う");
    fill(w);
    // legacy の Q は従来どおり(FieldCombat の入口)。U は legacy では UltimateActivation の入力に届く(FieldCombat は止めず、ゲートも閉じない)
    assert.equal(plain(FC(w).getUltimateState()).selected, null, "legacy は ring 用の写しを持たない");
    w.keyDown("KeyQ", 81); frames(w, 3); w.keyUp("KeyQ", 81); frames(w, 1);
    assert.equal(last(w).slot, "ultimate"); assert.equal(last(w).ok, true, JSON.stringify(last(w))); assert.equal(hermesActive(w), true, "legacy の Q は従来どおり発動");
    FC(w).end("test");
    const w3 = ringWorld({ source: "legacy", begin: true }); fill(w3);
    const kd = plain(UA(w3).getInputDiagnostics()).keyDowns;
    assert.equal(FC(w3).getLoadoutMode(), "legacy"); pressU(w3);
    assert.equal(plain(UA(w3).getInputDiagnostics()).keyDowns, kd + 1, "legacy の U は入力に届く");
    FC(w3).end("test");
    // legacy で、すでに選ばれている指輪は変えない
    const w2 = ringWorld({ source: "legacy", core: "apollo", begin: false });
    assert.equal(FC(w2).begin().ok, true); assert.equal(D(w2).getUltimateRingId(), "apollo"); assert.equal(GM(w2).getPersistentUltimateRingId(), "apollo"); FC(w2).end("test");
});

test("【8b】通常のカード戦闘(CombatTestArena 等): startCardBattle の第2引数なし / {} / 無関係なキー は Core の選択。{ultimateRingId:null} は奥義なし、文字列はその指輪。Core の選択は常に不変", () => {
    const w = buildWorld(); assert.deepEqual(w.failures, []); w.enterMap(4, 12, 25); w.frames(3);
    for (const r of ["hermes", "apollo"]) assert.equal(D(w).assignRingToPlayer(r).ok, true);
    assert.equal(D(w).setUltimateRing("apollo").ok, true);
    const data0 = persistentData(w), FB = D(w).FIXED_BATTLE;
    const start = (...a) => { const r = D(w).startCardBattle(FB, ...a); assert.equal(r.ok, true, JSON.stringify(r)); const ring = GM(w).getPersistentUltimateRingId(), over = ov(w); D(w).endCardBattle(); return [ring, over]; };
    assert.deepEqual(start(), ["apollo", null], "オプションなし = Core の選択");
    assert.deepEqual(start(undefined), ["apollo", null]);
    assert.deepEqual(start({}), ["apollo", null], "{} = Core の選択");
    assert.deepEqual(start({ other: 1 }), ["apollo", null]);
    assert.deepEqual(start(null), ["apollo", null]);
    assert.deepEqual(start({ ultimateRingId: undefined }), [null, { ringId: null }], "キーがあれば、値が undefined でも「なし」(省略とは区別する)");
    assert.deepEqual(start({ ultimateRingId: null }), [null, { ringId: null }], "null = この戦闘は奥義なし");
    assert.deepEqual(start({ ultimateRingId: "" }), [null, { ringId: null }]);
    assert.deepEqual(start({ ultimateRingId: 5 }), [null, { ringId: null }], "文字列以外は「なし」");
    assert.deepEqual(start({ ultimateRingId: "hermes" }), ["hermes", { ringId: "hermes" }]);
    assert.deepEqual(start({ ultimateRingId: "nonexistent" }), [null, { ringId: "nonexistent" }], "持っていない指輪は常駐の神を作らない");
    assert.deepEqual(start(), ["apollo", null], "指定は次の戦闘へ漏れない");
    assert.equal(D(w).getUltimateRingId(), "apollo"); assert.equal(persistentData(w), data0, "Core の保存データは不変");
});

test("【8c】SOUL・保存データとの両立: SoulMode は変わらない(SOUL の始まりの停止そのものは FieldCombat.test / loadout.test が確かめる)。戦闘の前後で RingLoadout / Core の保存が変わらない。ULTIMATE メニュー側の選択は Q とは独立", () => {
    const w = ringWorld({ q: "hermes", core: "apollo", begin: false });
    const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, persistentData(w)]);
    const before = snap(), soulMode = FC(w).getSoulMode();
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    assert.equal(FC(w).useAbility("ultimate").ok, false);
    FC(w).end("test");
    assert.equal(snap(), before, "戦闘の前後で RingLoadout・Core の保存が変わらない"); assert.equal(FC(w).getSoulMode(), soulMode, "SoulMode は変わらない");
    // ULTIMATE メニュー(Core)の選択を変えても Q 枠は変わらず、Q 枠を変えても Core は変わらない
    assert.equal(D(w).setUltimateRing("hermes").ok, true); assert.equal(RL(w).getUltimate(), "hermes");
    assert.equal(RL(w).setUltimate("apollo").ok, true); assert.equal(D(w).getUltimateRingId(), "hermes", "Q 枠の変更は Core の選択を変えない");
    assert.equal(FC(w).begin().ok, true); frames(w, 2); assert.equal(GM(w).getPersistentUltimateRingId(), "apollo", "FieldCombat は Q 枠"); FC(w).end("test");
    assert.equal(D(w).getUltimateRingId(), "hermes");
});

// ---------------------------------------------------------------- 【9】保存・読み込み ----------------------------------------------------------------
test("【9】保存・読み込み: この戦闘だけの指定は保存されない(戦闘中に保存しても、Q 枠・Core の選択だけ)。読み込んだあとは、保存した Q 枠の指輪で始まり、Core の選択は別のまま", () => {
    const a = ringWorld({ q: "apollo", core: "hermes", begin: false });
    const idle = a.ctx.JsonEx.stringify(a.ctx.DataManager.makeSaveContents());
    assert.equal(FC(a).begin().ok, true); frames(a, 2); fill(a);
    const during = a.ctx.JsonEx.stringify(a.ctx.DataManager.makeSaveContents());
    assert.equal(during.includes("ultimateRingId"), false, "この戦闘だけの指定は保存データにない");
    const pick = json => { const o = a.ctx.JsonEx.parse(json); return JSON.stringify([o.system._projectRRingLoadout, a.ctx.JsonEx.stringify(o).includes("sessionRing")]); };
    assert.equal(pick(during), pick(idle), "戦闘中の保存でも、RingLoadout の保存は戦闘の前と同じ");
    FC(a).end("test");
    // 新しい世界へロード
    const w = buildWorld(); assert.deepEqual(w.failures, []);
    w.ctx.DataManager.createGameObjects(); w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(idle));
    assert.equal(RL(w).getUltimate(), "apollo", "Q 枠は保存・読み込みで残る"); assert.equal(D(w).getUltimateRingId(), "hermes", "Core の選択も別に残る");
    assert.equal(ov(w), null, "読み込み直後は指定なし");
    const dm = w.ctx.DataManager, create = dm.createGameObjects; dm.createGameObjects = () => {};
    try { w.enterMap(4, 12, 25); } finally { dm.createGameObjects = create; }
    w.frames(3); w.mouse(700, 300); FC(w).setLoadoutSource("auto"); attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false });
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo"); assert.equal(D(w).getUltimateRingId(), "hermes");
    fill(w); pressQ(w); assert.equal(apolloActive(w), true, "読み込んだ Q 枠で発動"); assert.equal(gauge(w).cur, 0);
    FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
