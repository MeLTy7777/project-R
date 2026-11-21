"use strict";
// Stage 1D-2A: 黄金の矢 Lv3 の押す・離す・長押しビーム(フィールド戦闘 ProjectR_FieldCombat + ProjectR_ApolloGoldenVolley の持続ビーム)。
// 実エンジン(実Map004 + 全plugin。RingLoadout・CardDeckCore・GoldenVolley・ストレングスなど各スキルのハンドラも本物)。
// 時間は戦闘の更新(60/秒)で数える: 0.25秒=15 / 0.90秒=54 / 1.5秒=90 / 0.2秒=12 / 0.5秒=30 / 6秒=360。実機(MZ)の見た目(ビームの絵・HUD の描画)は Node では扱わない。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const ALL = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength", "apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const CARDS = ALL.filter(id => id !== "hermes_sweep");
const KEY = { shift: ["ShiftLeft", 16], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
const SLOT_NAME = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };
const GV = "apollo_golden_volley";
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, G = w => w.ctx.ProjectRApolloGoldenVolley;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };

// slot: 黄金の矢を入れるキー。others: { slot: スキルID }。enemies: { id: [距離, 角度] }(指定した敵だけ置く。ほかは退避)。aim: マウスの角度。
function beamWorld({ slot = "x", level = 3, others = {}, enemies = { 4: [4, 0] }, aim = 0, source = "auto" } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.mouse(700, 300);
    FC(w).setLoadoutSource(source);
    const d = D(w);
    for (const ring of ["hermes", "apollo"]) assert.equal(d.assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(d.setCardOwned(id, true).ok, true, id); assert.equal(d.setCardLevel(id, id === GV ? level : 1).ok, true, id); }
    if (source === "auto") {
        for (const ring of ["hermes", "apollo"]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
        assert.equal(RL(w).setSkill(slot, GV).ok, true);
        for (const [s, id] of Object.entries(others)) assert.equal(RL(w).setSkill(s, id).ok, true, s + "=" + id);
    }
    attachHpBars(w, ENEMIES, HP);
    w.run("Math.random = () => 0.999;");
    const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2);
    parkOthers(w, Object.keys(enemies).map(Number));
    for (const [id, [r, deg]] of Object.entries(enemies)) placePolar(w, Number(id), r, deg);
    aimDegree(w, aim, 4);
    return w;
}
const down = (w, slot) => { if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); } else w.keyDown(...KEY[slot]); };
const up = (w, slot) => { if (slot === "lmb") w.ctx.TouchInput._mousePressed = false; else w.keyUp(...KEY[slot]); };
const vols = w => plain(G(w).getActiveVolleys());
const fans = w => vols(w).filter(v => v.kind === "fan");
const beam = w => plain(G(w).getHeldBeam());
const bst = w => plain(FC(w).getBeamState());
const hold = w => plain(FC(w).getHoldState());
const cd = w => plain(FC(w).getCooldowns());
const casts = w => plain(FC(w).getLog()).filter(e => e.type === "cast" && e.skillId === GV && e.ok);
// 離した記録(押した長さ frames)から、期待する結果を決める(0.25秒=15 未満 = tap / 0.90秒=54 未満 = cancel / それ以上 = ビーム)
const expectedOutcome = n => (n < 15 ? "tap" : n < 54 ? "cancel" : "beam");
// 押す → n更新 → 離す → 1更新。離しの記録(outcome と、押していた長さ)を返す。キーは「押した更新」の次から数えて n、左クリックは押した直後から数えるため +1(押下を受けるタイミングの違い)。
function pressFor(w, slot, n) { down(w, slot); frames(w, n); up(w, slot); frames(w, 1); const log = hold(w).log; return log[log.length - 1]; }

test("ルール値: 0.25秒=15 / 0.90秒=54 / ビーム最大1.5秒=90 / 同じ敵へ0.2秒=12 / 通常の間隔0.5秒 / ビームのCooldown 6秒 / 移動速度 溜め100%・ビーム50%", () => {
    const w = beamWorld();
    const r = plain(FC(w).getBeamRules());
    assert.deepEqual([r.tapFrames, r.startFrames, r.tapSeconds, r.startSeconds], [15, 54, 0.25, 0.9]);
    assert.deepEqual([r.durationSeconds, r.hitSeconds, r.repeatIntervalSeconds, r.cooldownSeconds], [1.5, 0.2, 0.5, 6]);
    assert.deepEqual([r.chargeSpeedFactor, r.beamSpeedFactor], [1, 0.5]);
    assert.deepEqual(plain(G(w).heldBeamRules), { frames: 90, hitFrames: 12, seconds: 1.5, hitSeconds: 0.2 });
});

test("時間の境界(キー X): 14更新=通常の11本 / 15更新=取り消し / 53更新=取り消し / 54更新=ビーム自動開始。取り消しは発射もCooldownも無し", () => {
    for (const [n, outcome] of [[13, "tap"], [14, "tap"], [15, "cancel"], [16, "cancel"], [53, "cancel"], [54, "beam"], [55, "beam"]]) {
        const w = beamWorld({ enemies: {}, aim: 0 });
        const e = pressFor(w, "x", n);
        assert.equal(e.outcome, outcome, `${n}更新で離す`);
        if (outcome === "tap") {
            assert.equal(e.frames, n); assert.equal(fans(w).length, 1, "離したときに通常の発射"); assert.equal(fans(w)[0].arrows, 11, "Lv3 は11本");
            assert.deepEqual(bst(w).cooldowns, {}, "通常の発射はビームのCooldownを付けない"); assert.equal(plain(G(w).getHeldBeamLog()).length, 0);
        } else if (outcome === "cancel") {
            assert.equal(e.frames, n); assert.equal(vols(w).length, 0, "取り消し: 発射しない");
            assert.deepEqual(bst(w).cooldowns, {}, "取り消し: ビームのCooldownは付かない"); assert.deepEqual(plain(FC(w).getGates()), {}, "取り消し: 間隔も始まらない");
            assert.equal(cd(w)[GV], 0); assert.equal(plain(G(w).getHeldBeamLog()).length, 0, "ビームは始まっていない");
        } else {
            assert.equal(fans(w).length, 0, "ビームの押下から通常の発射は出ない");
            const log = plain(G(w).getHeldBeamLog()); assert.equal(log.length, 1, "ビームが1回始まって終わった"); assert.equal(log[0].reason, "release");
            assert.equal(bst(w).cooldowns[GV], 6, "離した = ビームの終わり: 6秒のCooldown");
        }
        assert.deepEqual(hold(w).holds, [], "押下の記録は残らない");
    }
});

test("5つのキーすべて(LMB / Shift / E / X / C)で同じ: 短押し=11本 / 0.25〜0.90秒=取り消し / 0.90秒=ビーム。左クリックも同じ(離したことは TouchInput から読む)", () => {
    for (const slot of ["lmb", "shift", "e", "x", "c"]) {
        // 短押し
        let w = beamWorld({ slot, enemies: {} });
        let e = pressFor(w, slot, 8); assert.equal(e.outcome, "tap", slot); assert.equal(fans(w).length, 1, slot); assert.equal(fans(w)[0].arrows, 11, slot);
        assert.equal(plain(G(w).getHeldBeamLog()).length, 0, slot + ": ビームは出ない");
        // 押した瞬間には発射しない
        w = beamWorld({ slot, enemies: {} });
        down(w, slot); frames(w, 5); assert.equal(vols(w).length, 0, slot + ": 押している間(0.25秒前)も発射しない");
        frames(w, 20); assert.equal(hold(w).holds[0].phase, "charge", slot + ": 0.25秒を過ぎると溜め中"); assert.equal(vols(w).length, 0, slot + ": 溜め中も発射しない");
        up(w, slot); frames(w, 1);
        e = hold(w).log[0]; assert.equal(e.outcome, "cancel", slot); assert.equal(vols(w).length, 0, slot + ": 取り消し");
        assert.deepEqual(bst(w).cooldowns, {}, slot + ": Cooldownなし");
        // 0.9秒: ビーム
        w = beamWorld({ slot, enemies: { 4: [4, 0] } });
        down(w, slot); frames(w, 62);
        assert.equal(beam(w).active, true, slot + ": ビーム自動開始"); assert.equal(bst(w).beam.skillId, GV); assert.equal(bst(w).beam.slot, SLOT_NAME[slot]);
        assert.equal(vols(w).filter(v => v.kind === "heldBeam").length, 1); assert.equal(fans(w).length, 0, slot + ": 扇は出ない");
        up(w, slot); frames(w, 1);
        assert.equal(beam(w).active, false, slot + ": 離すと終わる"); assert.equal(bst(w).cooldowns[GV], 6, slot + ": 6秒のCooldown(スキルID単位)");
        assert.equal(fans(w).length, 0, slot + ": 離しても通常の発射は出ない");
        assert.deepEqual(Object.keys(bst(w).cooldowns), [GV], "Cooldown の持ち主はスキルID(スロット名ではない)");
    }
});

test("左クリックの境界: 押した長さで tap / cancel / beam が決まる(離しを受けるタイミングの1更新差を含めて、記録の長さで判定)", () => {
    for (const n of [12, 13, 14, 15, 52, 53, 54]) {
        const w = beamWorld({ slot: "lmb", enemies: {} });
        const e = pressFor(w, "lmb", n);
        const measured = e.outcome === "beam" ? null : e.frames;
        if (measured !== null) assert.equal(e.outcome, expectedOutcome(measured), `${n}更新 → 記録 ${measured}`);
        else assert.ok(n >= 53, "beam は 0.9秒付近以降だけ");
    }
});

test("ビームの持続: 0.9秒で開始 → 最大1.5秒(90更新)で自分で終わる(duration)。押し続けていても終わる。同じ敵へ 0.2秒(12更新)に1回 = 最大8回。HPが実際に減る", () => {
    const w = beamWorld({ enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 54); assert.equal(beam(w).active, false, "押下を受けた更新から数えて 54更新目にはまだ(53更新おき)");
    frames(w, 1);
    let b = beam(w); assert.equal(b.active, true); assert.equal(b.maxFrames, 90); assert.equal(b.hitFrames, 12);
    frames(w, 1); b = beam(w); const hits1 = b.targets.find(t => t.eventId === 4); assert.equal(hits1.hits, 1, "入った更新で最初の1回");
    frames(w, 88); assert.equal(beam(w).active, true, "89更新目までは続く"); frames(w, 2);
    assert.equal(beam(w).active, false, "90更新で終わる(押し続けていても)");
    const log = plain(G(w).getHeldBeamLog()); assert.equal(log.length, 1); assert.equal(log[0].reason, "duration"); assert.equal(log[0].age, 90);
    assert.equal(log[0].totalHits, 8, "1.5秒で最大8回(0.2秒に1回)"); assert.equal(log[0].totalDamage, 400, "1回50ダメージ"); assert.equal(log[0].committed, true);
    const rec = plain(G(w).getLastResult()); const ages = rec.hits.filter(h => h.target === 4).map(h => h.age);
    assert.deepEqual(ages, [1, 13, 25, 37, 49, 61, 73, 85], "同じ敵へは 12更新おき"); assert.ok(ages.every((a, i) => i === 0 || a - ages[i - 1] >= 12));
    assert.equal(bst(w).cooldowns[GV] > 5.9, true, "終わった時点から6秒のCooldown");
    // 押し続けても、離して押し直すまでは何も出ない: 離す → 通常の発射もビームも出ない
    frames(w, 20); assert.equal(fans(w).length, 0, "ビームのあと押し続けても通常の発射は出ない"); up(w, "x"); frames(w, 2);
    assert.equal(fans(w).length, 0, "離しても通常の発射は出ない(同じ押下から両方は出ない)");
    const entries = hold(w).log.map(e => e.outcome); assert.deepEqual(entries, ["beam", "afterBeam"]);
    // ダメージは重複しない: 直接の8回(400)+ Lv2 のスリップ 100(5秒)= 500 だけ
    frames(w, 330); assert.equal(lost(w, 4), 500, "直接 400 + スリップ 100。二重に当たらない");
});

test("ビームの当たり: 幅の外・後ろの敵には当たらない。複数の敵へそれぞれ 0.2秒に1回。倒れた敵は撃たない", () => {
    const w = beamWorld({ enemies: { 4: [4, 0], 5: [7, 0], 3: [4, 90], 6: [4, 180] } });
    down(w, "x"); frames(w, 60);
    const t = beam(w).targets.map(x => x.eventId).sort();
    assert.deepEqual(t, [4, 5], "ビームの幅3マスの中の敵だけ(横・後ろの敵には当たらない)");
    frames(w, 30); up(w, "x"); frames(w, 2);
    const rec = plain(G(w).getLastResult()), per = {};
    for (const h of rec.hits) (per[h.target] = per[h.target] || []).push(h.age);
    for (const [id, ages] of Object.entries(per)) assert.ok(ages.every((a, i) => i === 0 || a - ages[i - 1] >= 12), `敵${id}: 12更新以上おき`);
    assert.equal(lost(w, 3), 0); assert.equal(lost(w, 6), 0);
    assert.ok(lost(w, 4) > 0 && lost(w, 5) > 0);
});

test("ビームはマウスの向きに追従する: 向きを変えると当たる敵が変わる(0度の敵 → 90度の敵)", () => {
    const w = beamWorld({ enemies: { 4: [4, 0], 5: [4, 90] }, aim: 0 });
    down(w, "x"); frames(w, 60);
    assert.ok(Math.abs(beam(w).degree - 0) < 1e-6 || Math.abs(beam(w).degree - 360) < 1e-6, "最初は上");
    assert.deepEqual(beam(w).targets.map(x => x.eventId), [4]);
    aimDegree(w, 90, 4); frames(w, 14);
    assert.ok(Math.abs(beam(w).degree - 90) < 0.5, "マウスの向きへ追従: " + beam(w).degree);
    frames(w, 14);
    const ids = beam(w).targets.map(x => x.eventId).sort(); assert.deepEqual(ids, [4, 5], "向きを変えたあとは、右の敵にも当たる");
    const t4 = beam(w).targets.find(x => x.eventId === 4), before = t4.hits; frames(w, 24);
    assert.equal(beam(w).targets.find(x => x.eventId === 4).hits, before, "向きから外れた敵には、もう当たらない");
    assert.ok(beam(w).targets.find(x => x.eventId === 5).hits >= 2);
});

test("移動速度: 溜めている間 100% / ビーム中 50% / 終わったら 100%(ほかの係数も壊さない)", () => {
    const w = beamWorld({ enemies: {} });
    const p = w.ctx.$gamePlayer, base = p.distancePerFrame();
    down(w, "x"); frames(w, 5);
    assert.equal(p.distancePerFrame(), base, "押した直後"); assert.equal(bst(w).speedFactor, 1);
    frames(w, 30); assert.equal(hold(w).holds[0].phase, "charge"); assert.equal(p.distancePerFrame(), base, "溜め中は100%");
    frames(w, 22); assert.equal(beam(w).active, true);
    assert.ok(Math.abs(p.distancePerFrame() - base * 0.5) < 1e-12, "ビーム中は50%"); assert.equal(bst(w).speedFactor, 0.5);
    frames(w, 20); assert.ok(Math.abs(p.distancePerFrame() - base * 0.5) < 1e-12, "ビームの間ずっと50%");
    up(w, "x"); frames(w, 1);
    assert.equal(p.distancePerFrame(), base, "終わったら100%"); assert.equal(bst(w).speedFactor, 1);
    // ほかの移動係数(絶・ヴェイルなど)と一緒でも、掛け合わさり、自分の分だけ外れる(ビームのCooldown中は長押しでもビームにならないので、新しい戦闘で)
    const w2 = beamWorld({ enemies: {} }), p2 = w2.ctx.$gamePlayer, base2 = p2.distancePerFrame();
    w2.ctx.ProjectRCardModifiers.setMoveSpeedFactor("other", 1.5, 10);
    down(w2, "x"); frames(w2, 70); assert.equal(beam(w2).active, true); assert.ok(Math.abs(p2.distancePerFrame() - base2 * 0.75) < 1e-9, "他の係数と掛け合わさる");
    up(w2, "x"); frames(w2, 1); assert.ok(Math.abs(p2.distancePerFrame() - base2 * 1.5) < 1e-9, "自分の係数だけ外れる");
});

test("ビームのCooldown 6秒(ビームが終わってから・スキルIDごと): 6秒目に明ける / 通常の発射とは独立(通常の Cooldown は 0 のまま)", () => {
    const w = beamWorld({ enemies: {} });
    down(w, "x"); frames(w, 60); up(w, "x"); frames(w, 1);
    assert.ok(bst(w).cooldowns[GV] > 5.95 && bst(w).cooldowns[GV] <= 6);
    assert.equal(cd(w)[GV], 0, "通常の発射の Cooldown は 0");
    assert.equal(plain(FC(w).getHudState().slots.find(s => s.slot === "card1").beam).state, "cooldown");
    frames(w, 350); assert.ok(bst(w).cooldowns[GV] > 0, "5.9秒ではまだ");
    frames(w, 12); assert.deepEqual(bst(w).cooldowns, {}, "6秒で明ける(±1更新)");
    // 明けたあと、押し直せばまたビーム
    down(w, "x"); frames(w, 60); assert.equal(beam(w).active, true, "Cooldown が明けたら、また長押しでビーム"); up(w, "x"); frames(w, 1);
    assert.equal(plain(G(w).getHeldBeamLog()).length, 2);
});

test("ビームのCooldown中: 押している間 0.5秒ごとに通常の発射(連射)。押した瞬間にも1発。ビームにはならない", () => {
    const w = beamWorld({ enemies: {} });
    down(w, "x"); frames(w, 60); up(w, "x"); frames(w, 1);                              // ビーム → 離す(Cooldown 開始)
    const before = fans(w).length; assert.equal(before, 0);
    down(w, "x"); frames(w, 2);
    assert.equal(fans(w).length, 1, "押した瞬間(長押しを待たず)に通常の発射"); assert.equal(fans(w)[0].arrows, 11);
    let concurrent = fans(w).length;
    for (let i = 0; i < 100; i++) { w.frames(1); concurrent = Math.max(concurrent, fans(w).length); }
    const times = casts(w).map(e => e.frame);
    assert.ok(times.length >= 4 && times.length <= 5, "約100更新で 0.5秒おき: " + times.length);
    for (let i = 1; i < times.length; i++) assert.equal(times[i] - times[i - 1], 30, "最小の間隔 0.5秒(30更新)ちょうど");
    assert.equal(beam(w).active, false, "連射中はビームにならない"); assert.equal(plain(G(w).getHeldBeamLog()).length, 1);
    assert.ok(concurrent >= 2, "前の矢が飛んでいても次を撃てる(確定待ちで拒否されない): 同時に飛んだ扇 " + concurrent);
    assert.equal(hold(w).holds[0].phase, "repeat");
    up(w, "x"); frames(w, 1);
    assert.equal(hold(w).log.slice(-1)[0].outcome, "repeat"); assert.equal(cd(w)[GV], 0, "通常の発射の Cooldown は 0 のまま");
});

test("ビームのCooldownが明けても、押しっぱなしのままではビームへ切り替わらない(離して押し直したときだけ)", () => {
    const w = beamWorld({ enemies: {} });
    down(w, "x"); frames(w, 60); up(w, "x"); frames(w, 1);
    down(w, "x"); frames(w, 2);                                                             // Cooldown 中に押し始める(連射)
    frames(w, 365);                                                                          // 6秒を過ぎる
    assert.deepEqual(bst(w).cooldowns, {}, "ビームのCooldownは明けた");
    frames(w, 120);                                                                          // さらに押し続ける(押した長さは 0.9秒を大きく超える)
    assert.equal(beam(w).active, false, "切り替わらない"); assert.equal(plain(G(w).getHeldBeamLog()).length, 1, "ビームはあの1回だけ");
    const n = casts(w).length; frames(w, 40); assert.ok(casts(w).length > n, "連射は続く");
    up(w, "x"); frames(w, 2);
    down(w, "x"); frames(w, 60); assert.equal(beam(w).active, true, "離して押し直したら、長押しでビーム"); up(w, "x"); frames(w, 1);
    assert.equal(plain(G(w).getHeldBeamLog()).length, 2);
});

test("通常の発射とビームは同じ発動から出ない: ビームのあとに離しても扇は出ない / ビーム中に扇は無い / 直前の発射(間隔の途中)でも長押しならビーム", () => {
    const w = beamWorld({ enemies: { 4: [4, 0] } });
    assert.equal(pressFor(w, "x", 5).outcome, "tap"); assert.equal(casts(w).length, 1, "通常の発射が1回(矢は敵に当たって消えてもよい)");
    assert.ok(plain(FC(w).getGates())[GV] > 0, "通常の発射の間隔の途中");
    down(w, "x"); frames(w, 56);
    assert.equal(beam(w).active, true, "ビームは通常の発射の間隔(0.5秒)に縛られない");
    assert.equal(casts(w).length, 1, "ビーム中に新しい通常の発射は出ない(最初の1回だけ)");
    up(w, "x"); frames(w, 2); assert.equal(casts(w).length, 1, "離しても通常の発射は増えない"); assert.equal(fans(w).length, 0);
});

test("ビームの二重始動はできない: 動いている間の startHeldBeam は拒否(ダメージ・消費・入力コールバックが二重にならない)", () => {
    const w = beamWorld({ enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 60);
    const again = plain(G(w).startHeldBeam({ onEnd: () => { throw new Error("呼ばれない"); } }));
    assert.deepEqual([again.ok, again.reason], [false, "beamActive"]);
    assert.equal(vols(w).filter(v => v.kind === "heldBeam").length, 1);
    const hits = beam(w).targets[0].hits; frames(w, 12); assert.ok(beam(w).targets[0].hits - hits <= 1, "0.2秒に1回のまま");
    up(w, "x"); frames(w, 1);
    assert.equal(plain(G(w).getHeldBeamLog()).length, 1, "onEnd は1回だけ(ビームの記録が1つ)"); assert.equal(plain(FC(w).getHoldState().log.filter(e => e.outcome === "beam")).length, 1);
    assert.equal(G(w).stopHeldBeam("again"), false, "止まったビームは止められない");
});

test("中断(溜め中): ほかのスキルの成功 / 回避 / 怯み / スタン → 取り消し(発射なし・ビームのCooldownなし)。押し続けていてもビームにならない", () => {
    // ほかのスキル(E = ストレングス)
    let w = beamWorld({ others: { e: "hermes_strength" }, enemies: {} });
    down(w, "x"); frames(w, 30); assert.equal(hold(w).holds[0].phase, "charge");
    w.keyDown(...KEY.e); frames(w, 2); w.keyUp(...KEY.e);
    assert.equal(hold(w).holds[0].phase, "canceled", "ほかのスキルが成功したら溜めは取り消し");
    frames(w, 60); assert.equal(beam(w).active, false, "押し続けても、離して押し直すまでビームにならない");
    up(w, "x"); frames(w, 2);
    assert.equal(vols(w).length, 0, "発射なし"); assert.deepEqual(bst(w).cooldowns, {}, "ビームを始めていないのでCooldownなし");
    assert.deepEqual(hold(w).log.map(e => e.outcome), ["interrupted", "canceled"]);
    // 失敗したほかのスキル(Cooldown中)は中断しない
    w = beamWorld({ others: { e: "hermes_strength" }, enemies: {} });
    w.keyDown(...KEY.e); frames(w, 1); w.keyUp(...KEY.e); frames(w, 1);
    down(w, "x"); frames(w, 2); w.keyDown(...KEY.e); frames(w, 1); w.keyUp(...KEY.e);
    assert.equal(plain(FC(w).getLastResult()).reason, "cooldown", "ストレングスは Cooldown 中で失敗");
    frames(w, 56); assert.equal(beam(w).active, true, "失敗したスキルは中断しない");
    up(w, "x"); frames(w, 1);
    // 回避・怯み・スタン
    for (const reason of ["dodge", "stagger", "stun"]) {
        w = beamWorld({ enemies: {} });
        down(w, "x"); frames(w, 25);
        const r = plain(FC(w).interruptHold(reason)); assert.deepEqual([r.ok, r.interrupted], [true, 1], reason);
        frames(w, 60); assert.equal(beam(w).active, false, reason + ": ビームにならない");
        up(w, "x"); frames(w, 2); assert.equal(vols(w).length, 0, reason); assert.deepEqual(bst(w).cooldowns, {}, reason + ": Cooldownなし");
        assert.equal(hold(w).log[0].reason, reason);
    }
});

test("中断(ビーム中): ほかのスキル / 回避 / 怯み / スタン → ビームが終わり、6秒のCooldownが始まる。通常の発射は出ない", () => {
    let w = beamWorld({ others: { e: "hermes_strength" }, enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 70); assert.equal(beam(w).active, true);
    w.keyDown(...KEY.e); frames(w, 2); w.keyUp(...KEY.e); frames(w, 1);
    assert.equal(beam(w).active, false, "ほかのスキルの成功でビームが終わる");
    let log = plain(G(w).getHeldBeamLog()); assert.equal(log.length, 1); assert.match(log[0].reason, /^interrupt:skill/);
    assert.ok(bst(w).cooldowns[GV] > 5.9, "6秒のCooldown"); assert.equal(plain(FC(w).getBeamState()).speedFactor, 1, "移動速度も戻る");
    up(w, "x"); frames(w, 2); assert.equal(fans(w).length, 0, "離しても通常の発射は出ない");
    for (const reason of ["dodge", "stagger", "stun"]) {
        w = beamWorld({ enemies: { 4: [4, 0] } });
        down(w, "x"); frames(w, 70); assert.equal(beam(w).active, true);
        assert.equal(plain(FC(w).interruptHold(reason)).interrupted, 1);
        assert.equal(beam(w).active, false, reason); assert.ok(bst(w).cooldowns[GV] > 5.9, reason + ": 6秒のCooldown");
        log = plain(G(w).getHeldBeamLog()); assert.equal(log[0].reason, "interrupt:" + reason);
        assert.equal(w.ctx.$gamePlayer.distancePerFrame() > 0 && bst(w).speedFactor === 1, true);
        up(w, "x"); frames(w, 2); assert.equal(fans(w).length, 0);
    }
});

test("通常のHPダメージだけでは中断しない(溜め中も、ビーム中も)", () => {
    const w = beamWorld({ enemies: { 4: [4, 0] } });
    const leader = w.ctx.$gameParty.leader(), hp0 = leader.hp;
    down(w, "x"); frames(w, 20);
    leader.gainHp(-3); frames(w, 2);
    assert.equal(hold(w).holds[0].phase, "charge", "溜め中のHPダメージでは中断しない");
    frames(w, 40); assert.equal(beam(w).active, true);
    leader.gainHp(-3); frames(w, 5);
    assert.equal(beam(w).active, true, "ビーム中のHPダメージでも中断しない");
    assert.ok(leader.hp <= hp0 - 6 || leader.hp < hp0, "HPは実際に減っている");
    up(w, "x"); frames(w, 1); assert.equal(plain(G(w).getHeldBeamLog())[0].reason, "release");
});

test("そのほかの終わり: メニュー・会話(入力の取り消し)/ 戦闘の終了 / 戦闘不能 → ビームが終わる(ビーム中はCooldown開始・溜め中はなし)。移動係数・矢は残らない", () => {
    // 会話(メッセージ)で入力が止まる: 溜め中
    let w = beamWorld({ enemies: {} });
    down(w, "x"); frames(w, 30); w.ctx.$gameMessage.add("会話"); frames(w, 2);
    assert.deepEqual(hold(w).holds, [], "溜め中の押下は取り消される"); assert.deepEqual(bst(w).cooldowns, {}); assert.equal(vols(w).length, 0);
    // 会話: ビーム中
    w = beamWorld({ enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 60); assert.equal(beam(w).active, true);
    w.ctx.$gameMessage.add("会話"); frames(w, 2);
    assert.equal(beam(w).active, false, "会話でビームが終わる"); assert.ok(bst(w).cooldowns[GV] > 5.9); assert.equal(bst(w).speedFactor, 1);
    // 戦闘の終了
    w = beamWorld({ enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 60); assert.equal(beam(w).active, true);
    FC(w).end("test"); frames(w, 1);
    assert.equal(beam(w).active, false, "戦闘終了でビームが終わる"); assert.equal(vols(w).length, 0); assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "移動係数は残らない");
    assert.deepEqual(hold(w).holds, []); assert.equal(plain(G(w).getHeldBeamLog()).length, 1);
    // 戦闘不能
    w = beamWorld({ enemies: { 4: [4, 0] } });
    down(w, "x"); frames(w, 60); assert.equal(beam(w).active, true);
    w.ctx.ProjectR.PlayerDeath = { isDead: () => true }; frames(w, 3);
    assert.equal(beam(w).active, false, "戦闘不能でビームが終わる"); assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1);
});

test("Lv1・Lv2 は従来どおり: 押した瞬間に通常の発射(3本 / 5本)。長押しでビームにならず、押下の記録もない", () => {
    for (const [level, count] of [[1, 3], [2, 5]]) {
        const w = beamWorld({ level, enemies: {} });
        down(w, "x"); frames(w, 2);
        assert.equal(fans(w).length, 1, `Lv${level}: 押した瞬間に発射`); assert.equal(fans(w)[0].arrows, count);
        assert.deepEqual(hold(w).holds, [], "押下の記録はない");
        frames(w, 90); assert.equal(beam(w).active, false, "長押ししてもビームにならない"); assert.equal(plain(G(w).getHeldBeamLog()).length, 0);
        up(w, "x"); frames(w, 2); assert.equal(casts(w).length, 1, "押している間も離しても、発射は最初の1回だけ(連射もしない)"); assert.deepEqual(bst(w).cooldowns, {});
    }
});

test("旧い固定スロット(legacy)は従来どおり: 前の矢が確定待ちの間は次の発射を拒否(volleyPending)。同時発射を許すのは指輪ロードアウトだけ", () => {
    const w = beamWorld({ source: "legacy", enemies: {} });
    assert.equal(FC(w).getLoadoutMode(), "legacy");
    assert.equal(D(w).concurrentVolleysAllowed(), false);
    assert.equal(FC(w).useAbility("card1").ok, true);
    frames(w, 5);
    const second = plain(D(w).useFixedCard(GV)); assert.deepEqual([second.ok, second.detail], [false, "volleyPending"], "旧い固定スロット: 確定待ちの間は拒否(従来どおり)");
    const r = beamWorld({ enemies: {} }); assert.equal(D(r).concurrentVolleysAllowed(), true, "ring のフィールド戦闘は許す");
    FC(r).end("test"); assert.equal(D(r).concurrentVolleysAllowed(), false, "戦闘外は許さない");
});

test("HUD: 黄金の矢の枠にビームの状態(ready → charging → active → cooldown)。通常の Cooldown 表示は変わらない。ほかのスキルの枠には付かない", () => {
    const w = beamWorld({ others: { e: "hermes_strength" }, enemies: {} });
    const slotOf = (name, hud = FC(w).getHudState()) => plain(hud.slots.find(s => s.slot === name));
    assert.equal(slotOf("card1").beam.state, "ready"); assert.equal("beam" in slotOf("special"), false, "ほかのスキルには beam が付かない");
    const detail = () => plain(FC(w).getHudSlots().find(s => s.slot === "card1"));
    assert.equal(detail().detail, "READY");
    down(w, "x"); frames(w, 10); assert.equal(slotOf("card1").beam.state, "ready", "0.25秒前はまだ溜めではない");
    frames(w, 15); assert.equal(slotOf("card1").beam.state, "charging"); assert.equal(detail().detail, "CHARGE");
    frames(w, 35); assert.equal(slotOf("card1").beam.state, "active"); assert.equal(detail().detail, "BEAM"); assert.equal(detail().cooldown.active, false, "通常の Cooldown ではない");
    up(w, "x"); frames(w, 1);
    const s = slotOf("card1"); assert.equal(s.beam.state, "cooldown"); assert.ok(s.beam.cooldown > 5.9 && s.beam.total === 6);
    assert.equal(s.cooldown, 0, "通常の Cooldown は 0"); assert.equal(s.ready, true, "通常の発射は撃てる");
    assert.match(detail().detail, /^B 5\.9|^B 6\.0/); assert.equal(detail().cooldown.active, false);
    // Lv2 では beam を出さない
    const w2 = beamWorld({ level: 2, enemies: {} });
    assert.equal("beam" in plain(FC(w2).getHudState().slots.find(s => s.slot === "card1")), false);
});

console.log(`\n${passed} tests passed`);
