"use strict";
// Stage 1D-1: 指輪ロードアウト(ProjectRRingLoadout)を、フィールド戦闘(ProjectR_FieldCombat)の LMB / Shift / E / X / C の5枠へつなぐ。
// 実エンジン(実Map004 + 全plugin。RingLoadout・CardDeckCore・各スキルのハンドラ・SwordSystem も本物)。旧い固定スロットの確認は tests/ProjectR_FieldCombat.test.cjs。
// 実機(MZ)の見た目・HUDの描画は Node では扱わない。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, sleeping, player, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const ALL = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength", "apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const { IDS: JANUS_IDS } = require("./ProjectR_JanusImplemented.cjs");
const { IDS: THEMIS_IDS } = require("./ProjectR_ThemisImplemented.cjs");
const { IDS: ATHENA_IDS } = require("./ProjectR_AthenaImplemented.cjs");
const CARDS = ALL.filter(id => id !== "hermes_sweep");
const KEY = { shift: ["ShiftLeft", 16], e: ["KeyE", 69], x: ["KeyX", 88], c: ["KeyC", 67] };
const SLOT_NAME = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };

// slots: { lmb, shift, e, x, c } = スキルID(指輪ロードアウトの正規のAPIで割り当てる)。levels: { スキルID: Lv }。
function ringWorld({ slots = {}, levels = {}, begin = true, random = 0.999, source = "auto" } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.mouse(700, 300);
    FC(w).setLoadoutSource(source);
    const d = D(w);
    for (const ring of ["hermes", "apollo"]) assert.equal(d.assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(d.setCardOwned(id, true).ok, true, id); assert.equal(d.setCardLevel(id, levels[id] || 1).ok, true, id); }
    if (source === "auto") {
        for (const ring of ["hermes", "apollo"]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
        for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    }
    attachHpBars(w, ENEMIES, HP);
    if (random !== null) w.run(`Math.random = () => ${random};`);
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); }
    return w;
}
const tapKey = (w, slot, hold = 2) => { w.keyDown(...KEY[slot]); frames(w, hold); w.keyUp(...KEY[slot][0] ? KEY[slot] : []); frames(w, 1); };
const handIds = w => plain(D(w).getBattleState().hand.map(c => c.cardId));
const cd = w => plain(FC(w).getCooldowns());

test("モード: RingLoadout があれば ring。戦闘開始時に5枠の写しを取る。旧い固定スロットは明示した(DEV)ときだけ。保存データ・奥義の選択は書かない", () => {
    const w = ringWorld({ slots: { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "hermes_issen", x: "apollo_golden_volley", c: "hermes_strength" }, begin: false });
    const saved = JSON.stringify(w.ctx.$gameSystem._projectRRingLoadout), ult = D(w).getUltimateRingId?.() ?? null;
    assert.equal(FC(w).getLoadoutMode(), "ring");
    const b = FC(w).begin(); assert.equal(b.ok, true); assert.equal(b.mode, "ring");
    assert.deepEqual(plain(FC(w).getSlotSkills()), { mode: "ring", lmb: "hermes_sweep", shift: "hermes_zetsu", e: "hermes_issen", x: "apollo_golden_volley", c: "hermes_strength" });
    const lo = plain(FC(w).getLoadout());
    assert.deepEqual([lo.attack.cardId, lo.mobility.cardId, lo.special.cardId, lo.card1.cardId, lo.card2.cardId], ["hermes_sweep", "hermes_zetsu", "hermes_issen", "apollo_golden_volley", "hermes_strength"], "5枠にいま入っているスキル");
    assert.deepEqual(plain(FC(w).getHudState().slots.map(s => s.slot)).sort(), ["attack", "card1", "card2", "consumable", "mobility", "reload", "special", "ultimate"]);
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRRingLoadout), saved, "RingLoadout の保存データは書かない");
    assert.equal(D(w).getUltimateRingId?.() ?? null, ult, "CardDeckCore の奥義の選択を書き換えない(自動のヘルメース選択もしない)");
    FC(w).end("test");
    assert.equal(D(w).getUltimateRingId?.() ?? null, ult, "戦闘のあとも同じ");
    // 旧い固定スロット(DEV): 同じ世界で legacy にすると、従来のスロット(絶・一閃・黄金の矢・ギガース殺し)
    assert.equal(FC(w).setLoadoutSource("legacy"), true);
    const l = FC(w).begin(); assert.equal(l.ok, true); assert.equal(l.mode, "legacy");
    assert.deepEqual([FC(w).getLoadout().mobility.cardId, FC(w).getLoadout().special.cardId, FC(w).getLoadout().card2.cardId], ["hermes_zetsu", "hermes_issen", "apollo_gigas_slayer"]);
    FC(w).end("test");
    assert.equal(FC(w).setLoadoutSource("bogus"), false); assert.equal(FC(w).setLoadoutSource(null), true);
});

test("空の枠: 何もしない(旧い固定スキルへ戻さない)。手札・Cooldown・記録・点滅が変わらない。5枠すべて", () => {
    const w = ringWorld({ slots: {} });
    const hand0 = handIds(w), cd0 = cd(w), last0 = FC(w).getLastResult();
    for (const slot of ["attack", "mobility", "special", "card1", "card2"]) {
        const r = plain(FC(w).useAbility(slot)); assert.deepEqual([r.ok, r.reason], [false, "emptySlot"], slot);
    }
    for (const slot of ["shift", "e", "x", "c"]) { w.keyDown(...KEY[slot]); frames(w, 3); w.keyUp(...KEY[slot]); frames(w, 2); }
    w.attackClick(); frames(w, 3);
    assert.deepEqual(handIds(w), hand0, "固定のカードを手札に置かない");
    assert.deepEqual(cd(w), cd0); assert.deepEqual(FC(w).getLastResult(), last0, "記録に残らない");
    assert.equal(FC(w).getComboState().swings, 0, "LMB が空なら近接もしない");
    assert.equal(FC(w).getHudState().slots.find(s => s.slot === "special").state, "empty");
    const hud = plain(FC(w).getHudSlots());
    assert.deepEqual(hud.map(s => [s.slot, s.empty, s.name]).filter(s => s[0] !== "consumable"), [["attack", true, "―"], ["mobility", true, "―"], ["special", true, "―"], ["card1", true, "―"], ["card2", true, "―"]]);
    assert.ok(hud.every(s => s.slot === "consumable" || (s.iconIndex === 0 && s.detail === "---")));
});

test("薙ぎ払いは、どのキーでも同じ3段コンボ(1・2段 前方 / 3段 全周・2倍 / 受付0.5秒 / Cooldown 0)。単発のカード版は使わない", () => {
    const press = { lmb: w => { w.attackClick(); }, shift: w => tapKey(w, "shift", 1), e: w => tapKey(w, "e", 1), x: w => tapKey(w, "x", 1), c: w => tapKey(w, "c", 1) };
    for (const slot of ["lmb", "shift", "e", "x", "c"]) {
        const w = ringWorld({ slots: { [slot]: "hermes_sweep" } });
        const cfg = plain(FC(w).getComboConfig());
        assert.deepEqual(cfg.steps.map(s => s.style), ["clockwise", "counterclockwise", "fullcircle"], "段ごとの形");
        assert.equal(cfg.timeout, 30, "受付時間は0.5秒(30フレーム)");
        const steps = [];
        for (let n = 0; n < 3; n++) { press[slot](w); frames(w, 2); const l = plain(FC(w).getComboState().last); steps.push([l.ok, l.step, l.heavy, l.scale]); frames(w, 20); }
        assert.deepEqual(steps, [[true, 1, false, 1], [true, 2, false, 1], [true, 3, true, 2]], slot + ": 1・2段は通常 / 3段は強撃(2倍)");
        assert.equal(FC(w).getComboState().step, 0, "3段のあとは1段目へ戻る");
        assert.equal(plain(FC(w).getComboState()).finishers, 1);
        assert.equal(cd(w).hermes_sweep, 0, "基本の Cooldown は 0"); assert.deepEqual(handIds(w), [], "カード版(単発の扇)は使わない: 手札に置かない");
        assert.equal(FC(w).getLastResult().skillId, "hermes_sweep");
        w.ctx.ProjectRFieldCombat.end("test");
    }
});

test("薙ぎ払い: 受付 0.5秒を過ぎると1段目へ戻る(0.5秒以内なら続く)。HP が実際に減り、3段目は2倍のダメージ(判定は SwordSystem)", () => {
    const w = ringWorld({ slots: { x: "hermes_sweep" } });
    parkOthers(w, [4]); placePolar(w, 4, 1.3, 0); aimDegree(w, 0);
    const swing = () => { tapKey(w, "x", 1); frames(w, 3); };
    swing(); frames(w, 18); // 前の斬撃から約25フレーム後(0.5秒の内)
    assert.equal(FC(w).getComboState().step, 1, "25フレーム後はまだ1段目のあと");
    const d1 = lost(w, 4); assert.ok(d1 > 0, "1段目が命中して HP が減る " + d1);
    resetHp(w); swing(); frames(w, 18); const d2 = lost(w, 4); assert.equal(FC(w).getComboState().last.step, 2);
    assert.ok(d2 > 0, "2段目も命中");
    resetHp(w); swing(); frames(w, 5); const d3 = lost(w, 4); assert.equal(FC(w).getComboState().last.step, 3);
    assert.ok(d3 > 0 && Math.abs(d3 / d1 - 2) < 0.25, `3段目は2倍(${d1} → ${d3})`);
    // 受付を過ぎる: 31フレーム空けると1段目に戻る
    frames(w, 40); swing(); assert.equal(FC(w).getComboState().last.step, 1);
    frames(w, 31); assert.equal(FC(w).getComboState().step, 0, "受付 0.5秒を過ぎると戻る");
});

test("押す・離す: 5枠すべてで1回の押下は1回だけ発動(キーリピート・押しっぱなしで重複しない)。左クリックも1クリックにつき1回", () => {
    const strength = w => w.ctx.ProjectRHermesStrength.getPending().stacks;
    for (const slot of ["shift", "e", "x", "c"]) {
        const w = ringWorld({ slots: { [slot]: "hermes_strength" } });
        w.keyDown(...KEY[slot]); for (let i = 0; i < 6; i++) { w.keyDown(...KEY[slot], { repeat: true }); w.frames(1); }
        assert.equal(strength(w), 1, slot + ": リピートで増えない");
        frames(w, 20); w.keyUp(...KEY[slot]); frames(w, 20);
        assert.equal(strength(w), 1, slot + ": 離しても発動しない");
        w.keyDown(...KEY[slot]); frames(w, 2); w.keyUp(...KEY[slot]); frames(w, 2);
        assert.equal(strength(w), 2, slot + ": 押し直すと、また1回");
    }
    const w = ringWorld({ slots: { lmb: "hermes_strength" } });
    w.ctx.TouchInput._mousePressed = true;                       // 左ボタンを押しっぱなし
    w.attackClick(); frames(w, 3);
    const spam = plain(FC(w).attackClick("spam")); w.attackClick(); frames(w, 3);
    assert.equal(strength(w), 1, "押しっぱなしでは1回だけ(予約が繰り返されても受けない)");
    assert.equal(FC(w).getHoldState().lmbDown, true);
    w.ctx.TouchInput._mousePressed = false; frames(w, 3);
    assert.equal(FC(w).getHoldState().lmbDown, false, "離したと分かる");
    w.attackClick(); frames(w, 3); assert.equal(strength(w), 2, "離したあとの次のクリック");
    assert.ok(spam, "API の attackClick も LMB 枠のスキルを使う");
});

test("黄金の矢: 通常の発射 Lv1=3本 / Lv2=5本 / Lv3=11本。Cooldown 0・発射の最小の間隔 0.5秒。どのキーでも同じ", () => {
    const counts = [];
    for (const [level, expected] of [[1, 3], [2, 5]]) {
        const w = ringWorld({ slots: { x: "apollo_golden_volley" }, levels: { apollo_golden_volley: level } });
        parkOthers(w); aimDegree(w, 0, 4);
        w.keyDown(...KEY.x); frames(w, 1);                                // Lv1・2 は押した瞬間に発射
        const v = plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys());
        counts.push(v[0] && v[0].arrows); assert.equal(v[0].arrows, expected, `Lv${level}`); w.keyUp(...KEY.x); frames(w, 1);
        assert.equal(cd(w).apollo_golden_volley, 0, "基本の Cooldown は 0");
    }
    for (const slot of ["shift", "e", "c", "lmb"]) {                      // 別のキーでも同じ本数・同じ間隔
        const w = ringWorld({ slots: { [slot]: "apollo_golden_volley" }, levels: { apollo_golden_volley: 2 } });
        parkOthers(w); aimDegree(w, 0, 4);
        if (slot === "lmb") w.attackClick(); else w.keyDown(...KEY[slot]);
        frames(w, 2);
        assert.equal(plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys())[0].arrows, 5, slot);
    }
    // 間隔: 0.5秒(30フレーム)より前は interval で非消費の失敗 / 過ぎれば interval ではなくなる
    const w = ringWorld({ slots: { x: "apollo_golden_volley" } });
    parkOthers(w); aimDegree(w, 0, 4);
    assert.equal(FC(w).useAbility("card1").ok, true);
    assert.deepEqual(plain(FC(w).getGates()).apollo_golden_volley > 0, true);
    const hud = plain(FC(w).getHudState().slots.find(s => s.slot === "card1")); assert.equal(hud.cooldown, 0, "間隔は HUD の Cooldown には出ない"); assert.equal(hud.state, "ready");
    frames(w, 10); const early = plain(FC(w).useAbility("card1")); assert.deepEqual([early.ok, early.reason], [false, "interval"]);
    frames(w, 25); assert.deepEqual(plain(FC(w).getGates()), {}, "0.5秒で間隔は終わる");
    const late = plain(FC(w).useAbility("card1")); assert.notEqual(late.reason, "interval");
    assert.equal(plain(FC(w).getLastResult()).slot, "card1");
});

test("黄金の矢 Lv3: 押した瞬間には発射しない。短く離すと通常の11本 / 0.25秒以上押して離すと(0.9秒前)取り消し(Stage 1D-2A で確定。ビームの詳しい境界は goldenBeam テスト)。どのキーでも同じ", () => {
    for (const slot of ["x", "c", "e", "shift", "lmb"]) {
        const w = ringWorld({ slots: { [slot]: "apollo_golden_volley" }, levels: { apollo_golden_volley: 3 } });
        parkOthers(w); aimDegree(w, 0, 4);
        const down = () => { if (slot === "lmb") { w.ctx.TouchInput._mousePressed = true; w.attackClick(); } else w.keyDown(...KEY[slot]); };
        const up = () => { if (slot === "lmb") w.ctx.TouchInput._mousePressed = false; else w.keyUp(...KEY[slot]); };
        // 0.25秒を過ぎて 0.9秒前に離す(35フレーム): 通常の発射は出ない(取り消し)
        down(); frames(w, 35);
        assert.equal(plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys()).length, 0, slot + ": 押している間は発射しない");
        assert.equal(plain(FC(w).getHoldState().holds[0] || {}).ready, false, slot + ": 0.9秒前はビームの段階に達していない");
        up(); frames(w, 3);
        assert.equal(plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys()).length, 0, slot + ": 取り消しのあとに通常の発射を出さない");
        const log = plain(FC(w).getHoldState().log); assert.deepEqual([log.length, log[0].outcome, log[0].skillId], [1, "cancel", "apollo_golden_volley"]);
        assert.equal(cd(w).apollo_golden_volley, 0); assert.deepEqual(plain(FC(w).getGates()), {}, "発射していないので間隔も始まらない");
        // 短押し(5フレーム): 離したときに通常の発射(11本)
        frames(w, 10); down(); frames(w, 5); assert.equal(plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys()).length, 0, slot + ": 離すまでは出ない");
        up(); frames(w, 2);
        const v = plain(w.ctx.ProjectRApolloGoldenVolley.getActiveVolleys());
        assert.equal(v.length, 1, slot + ": 離したときに発射"); assert.equal(v[0].arrows, 11, slot + ": Lv3 の通常の発射は11本"); assert.equal(v[0].kind, "fan", "ビームではなく扇");
        assert.deepEqual(plain(FC(w).getHoldState().holds), [], "押下の記録は残らない");
    }
});

test("Cooldown はスキルID単位(物理キーではない): 同じスキルはどのキーでも同じ値 / 別のスキルとは独立 / 失敗は消費しない", () => {
    const want = { hermes_zetsu: 3, hermes_issen: 7, hermes_reed_flute: 8, hermes_strength: 0.1, apollo_eros_arrow: 5, apollo_lyre_rhythm: 4, apollo_laurel_wreath: 8, apollo_plague_rain: 5 };
    for (const id of Object.keys(want)) {
        const w = ringWorld({ slots: { c: id } }); parkOthers(w, [4]); placePolar(w, 4, 3, 0); aimDegree(w, 0, 3);
        const r = plain(FC(w).useAbility("card2")); assert.equal(r.ok, true, id + " " + JSON.stringify(r));
        assert.ok(Math.abs(cd(w)[id] - want[id]) < 1e-9, `${id}: ${cd(w)[id]} (期待 ${want[id]})`);
        assert.ok(!("card2" in cd(w)) && !("card1" in cd(w)), "スロット名のキーは持たない");
        assert.equal(FC(w).getHudState().slots.find(s => s.slot === "card2").cooldown > 0 || want[id] === 0, true);
        const again = plain(FC(w).useAbility("card2")); assert.deepEqual([again.ok, again.reason], [false, "cooldown"], id + ": Cooldown 中");
    }
    assert.deepEqual(Object.keys(cd(ringWorld({ slots: {} }))).sort(), ["consumable", "ultimate", ...ALL, ...JANUS_IDS, ...THEMIS_IDS, ...ATHENA_IDS].sort(), "10スキル + Janus 5 + Themis 5 + Athena 5 + 奥義 + アイテム");
    // 1つのスキルの Cooldown が別のキーの別スキルを止めない
    const w = ringWorld({ slots: { shift: "hermes_zetsu", e: "hermes_issen", x: "hermes_strength" } }); parkOthers(w); aimDegree(w, 0, 3);
    assert.equal(FC(w).useAbility("special").ok, true);
    assert.equal(FC(w).useAbility("special").reason, "cooldown");
    assert.equal(FC(w).useAbility("card1").ok, true, "一閃の Cooldown 中でも、ストレングスは使える");
    assert.ok(cd(w).hermes_issen > 6.9 && cd(w).hermes_strength > 0 && cd(w).hermes_zetsu === 0);
    w.ctx.ProjectRHermesZetsu.setWindupFrames(0);
    frames(w, 8 * 60); assert.equal(cd(w).hermes_issen, 0, "時間で戻る");
});

test("発動の成功・失敗: 成功したときだけ Cooldown・間隔。失敗(エラー・使えない)は何も消費しない。戦闘外・戦闘不能・放射メニュー中は発動しない", () => {
    const w = ringWorld({ slots: { x: "apollo_golden_volley", e: "hermes_issen" } });
    parkOthers(w); aimDegree(w, 0, 4);
    const ok = plain(FC(w).useAbility("card1")); assert.deepEqual([ok.ok, ok.slot, ok.skillId, ok.cardId], [true, "card1", "apollo_golden_volley", "apollo_golden_volley"]);
    frames(w, 40);                                                    // 間隔は終わった(前の矢が確定待ちでも、指輪ロードアウトは次を撃てる = Stage 1D-2A)
    aimDegree(w, 0, 0);                                               // マウスがプレイヤーの足元: 方向が決まらず失敗(非消費)
    const g0 = plain(FC(w).getGates()), c0 = cd(w);
    const bad = plain(FC(w).useAbility("card1"));
    assert.equal(bad.ok, false); assert.equal(bad.reason, "abilityFailed"); assert.equal(bad.detail, "invalidMousePosition");
    assert.deepEqual(plain(FC(w).getGates()), g0, "失敗は間隔を始めない"); assert.deepEqual(cd(w), c0, "失敗は Cooldown を始めない");
    assert.deepEqual([FC(w).getHudState().slots.find(s => s.slot === "card1").notice], ["方向なし"], "HUD に理由が出る");
    // 戦闘外
    FC(w).end("test");
    const out = plain(FC(w).useAbility("special")); assert.deepEqual([out.ok, out.reason], [false, "inactive"]);
    const w2 = ringWorld({ slots: { e: "hermes_strength" } });
    w2.ctx.ProjectR.PlayerDeath = { isDead: () => true };
    assert.equal(FC(w2).useAbility("special").reason, "playerDead");
    w2.ctx.ProjectR.PlayerDeath = { isDead: () => false };
    FC(w2).openRadial(); assert.equal(FC(w2).useAbility("special").reason, "menuOpen"); FC(w2).closeRadial(false);
    assert.equal(FC(w2).useAbility("special").ok, true);
});

test("戦闘開始時の写し: 戦闘中に RingLoadout の割り当てが変わっても(APIは戦闘中ロック)、写しで動く。所持・装備が外れたら発動しない(旧いスキルへ戻さない)", () => {
    const w = ringWorld({ slots: { e: "hermes_strength", x: "apollo_eros_arrow" } });
    assert.equal(RL(w).isLocked(), true, "戦闘中は編集できない");
    assert.equal(RL(w).setSkill("e", "hermes_issen").ok, false, "戦闘中の割り当て変更は拒否される");
    const real = RL(w);
    // 戦闘中に外から割り当てが変わった(想定外の経路)ことにしても、戦闘開始時の写しで動く
    w.ctx.ProjectRRingLoadout = Object.assign({}, real, { getSkill: () => "hermes_issen" });
    assert.equal(FC(w).useAbility("special").skillId, "hermes_strength", "写しのスキル(一閃ではない)");
    // アポロの指輪が外れた: x の黄金の矢系は使えない(skillUnavailable)。ヘルメースのスキルは使える
    w.ctx.ProjectRRingLoadout = Object.assign({}, real, { isRingEquipped: id => id !== "apollo" && real.isRingEquipped(id) });
    const hand0 = handIds(w), cd0 = cd(w);
    const off = plain(FC(w).useAbility("card1")); assert.deepEqual([off.ok, off.reason, off.skillId], [false, "skillUnavailable", "apollo_eros_arrow"]);
    assert.deepEqual(handIds(w), hand0, "カードは使われない"); assert.deepEqual(cd(w), cd0);
    w.ctx.ProjectRRingLoadout = Object.assign({}, real, { isSkillUnlocked: id => id !== "hermes_strength" && real.isSkillUnlocked(id) });
    assert.equal(FC(w).useAbility("special").reason, "skillUnavailable", "所持していないスキルも発動しない(Cooldown の確認より先)");
    FC(w).end("test");
    w.ctx.ProjectRRingLoadout = real;
});

test("竪琴の演奏中の左クリックは、通常の攻撃より先に音符の選択へ(LMB が空でも・薙ぎ払いでも)。終わったあとは通常の LMB に戻る", () => {
    for (const lmb of [null, "hermes_sweep"]) {
        const w = ringWorld({ slots: { e: "apollo_lyre_rhythm", ...(lmb ? { lmb } : {}) } });
        const lyre = w.ctx.ProjectRApolloLyreRhythm;
        assert.equal(FC(w).useAbility("special").ok, true); frames(w, 60);
        assert.ok(lyre.getSession(), "演奏が始まった"); const before = plain(lyre.getSession()).presses;
        w.attackClick(); frames(w, 2);
        assert.equal(plain(lyre.getSession()).presses, before + 1, "左クリックは音符の選択(" + (lmb || "LMB空") + ")");
        assert.equal(FC(w).getComboState().swings, 0, "近接の攻撃は出ない");
        assert.ok(FC(w).getLog().some(e => e.type === "lyreInput"));
        let guard = 0; while (lyre.getSession() && guard++ < 2400) frames(w, 1);
        assert.equal(lyre.getSession(), null, "演奏が終わる");
        frames(w, 30); w.attackClick(); frames(w, 3);
        assert.equal(FC(w).getComboState().swings, lmb ? 1 : 0, "終わったあとは通常の LMB(薙ぎ払い or 何もしない)");
    }
});

test("Q(奥義)の隔離(Stage 1E-1 で更新): Q 枠が空の ring では Q も U も発動しない(emptySlot。ヘルメースへの自動選択もない)。CardDeckCore の選択・ゲージは変わらない。旧い固定(legacy)の Q は従来どおり", () => {
    const w = ringWorld({ slots: { e: "hermes_strength" } });
    const ua = w.ctx.ProjectRUltimateActivation, ult0 = D(w).getUltimateRingId?.() ?? null, diag0 = plain(ua.getInputDiagnostics()), last0 = ua.getLastUltimateActivationResult();
    const q = plain(FC(w).useAbility("ultimate")); assert.deepEqual([q.ok, q.reason], [false, "emptySlot"]);
    const lr0 = plain(FC(w).getLastResult());
    w.keyDown("KeyQ", 81); frames(w, 3); w.keyUp("KeyQ", 81); frames(w, 2);
    assert.deepEqual(plain(FC(w).getLastResult()), lr0, "物理の Q も何も起こさない(空の枠は記録も点滅もしない)");
    assert.equal(w.ctx.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), false, "Q が空なら常駐の神もゲージもない(Core の選択へ戻らない)");
    const u = ua.getInputBinding(); w.keyDown(u.code, u.keyCode); frames(w, 3); w.keyUp(u.code, u.keyCode); frames(w, 2);
    assert.deepEqual(plain(ua.getInputDiagnostics()), diag0, "U キーは奥義の入力にも届かない");
    assert.deepEqual(ua.getLastUltimateActivationResult(), last0, "奥義の処理は一度も呼ばれない");
    assert.equal(D(w).getUltimateRingId?.() ?? null, ult0, "奥義の選択は変わらない(一時的な書き換えもない)");
    FC(w).end("test");
    // 戦闘が終われば U キーは元どおり(奥義の入力に届く)
    const keyDowns = plain(ua.getInputDiagnostics()).keyDowns; w.keyDown(u.code, u.keyCode); w.keyUp(u.code, u.keyCode);
    assert.equal(plain(ua.getInputDiagnostics()).keyDowns, keyDowns + 1, "戦闘外では従来どおり");
    // legacy: ヘルメースの自動選択・Q は従来どおり(emptySlot / ultimateUnavailable にならない)
    const l = ringWorld({ source: "legacy" });
    assert.equal(FC(l).getLoadoutMode(), "legacy"); assert.equal(D(l).getUltimateRingId?.(), "hermes", "旧い固定: ヘルメースを自動で選ぶ(従来どおり)");
    assert.ok(!["emptySlot", "ultimateUnavailable"].includes(plain(FC(l).useAbility("ultimate")).reason));
});

test("SOUL・保存データとの両立: 戦闘の前後で RingLoadout / SOUL のロードアウト / SoulMode が変わらない。SOUL の始まりは従来どおり止まる", () => {
    const w = ringWorld({ slots: { lmb: "hermes_sweep", e: "hermes_strength" }, begin: false });
    const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, w.ctx.$gameSystem._projectRSoulLoadout ?? null, D(w).getPersistentData?.().ultimateRingId ?? null]);
    const before = snap(), mode = FC(w).getSoulMode();
    assert.equal(FC(w).begin().ok, true); frames(w, 2);
    FC(w).useAbility("special"); w.attackClick(); frames(w, 5);
    assert.equal(FC(w).useAbility("ultimate").ok, false);
    FC(w).end("test");
    assert.equal(snap(), before, "RingLoadout・SOUL のロードアウト・奥義の選択は、戦闘のあとも同じ");
    assert.equal(FC(w).getSoulMode(), mode);
    FC(w).setSoulMode("off"); assert.equal(FC(w).isSoulAllowed(), false, "SoulMode=off(通常のプレイ)なら SOUL の始まりは止まる"); FC(w).setSoulMode(mode);
    assert.equal(FC(w).begin().ok, true); assert.equal(FC(w).begin().reason, "alreadyActive"); FC(w).end("test");
});

test("10スキルの実際の効果(FieldCombat 経由・実ハンドラ): 発動の成功だけでなく、各スキルの効果の状態を確かめる", () => {
    const aim = w => { aimDegree(w, 0, 3); };
    const world = (slots, levels) => { const w = ringWorld({ slots, levels }); parkOthers(w, [4]); placePolar(w, 4, 2.2, 0); aim(w); w.ctx.ProjectRHermesZetsu.setWindupFrames(0); return w; };
    const use = (w, slot) => { const r = plain(FC(w).useAbility(slot)); assert.equal(r.ok, true, slot + " " + JSON.stringify(r)); return r; };
    { // 薙ぎ払い(コンボ)
        const w = world({ lmb: "hermes_sweep" }); use(w, "attack"); frames(w, 20);
        assert.ok(lost(w, 4) > 0, "薙ぎ払い: 前方の敵に当たる"); assert.equal(FC(w).getComboState().step, 1);
    }
    { // 絶
        const w = world({ shift: "hermes_zetsu" }); const p0 = { x: player(w)._realX, y: player(w)._realY };
        use(w, "mobility"); frames(w, 20);
        assert.ok(Math.hypot(player(w)._realX - p0.x, player(w)._realY - p0.y) > 1, "絶: 瞬間移動した");
    }
    { // 一閃
        const w = world({ e: "hermes_issen" }); use(w, "special"); frames(w, 60);
        assert.ok(lost(w, 4) > 0, "一閃: 前方の敵に当たる");
    }
    { // 葦笛
        const w = world({ x: "hermes_reed_flute" }); placePolar(w, 4, 1.5, 0); use(w, "card1"); frames(w, 3);
        assert.equal(sleeping(w, 4), true, "葦笛: 範囲の敵が睡眠(ステート)になる。※ FieldCombat の敵AIが睡眠を見て止まる連携は Stage 1D-2");
    }
    { // ストレングス
        const w = world({ c: "hermes_strength" }); use(w, "card2");
        assert.equal(w.ctx.ProjectRHermesStrength.getPending().stacks, 1, "ストレングス: 次の攻撃の強化が積まれる");
    }
    { // 黄金の矢
        const w = world({ x: "apollo_golden_volley" }); use(w, "card1"); frames(w, 120);
        assert.ok(lost(w, 4) > 0, "黄金の矢: 前方の敵に当たる(命中が確定して消費)");
    }
    { // エロスの矢
        const w = world({ e: "apollo_eros_arrow" }); use(w, "special"); frames(w, 150);
        assert.ok(lost(w, 4) > 0, "エロスの矢: 前方の敵に当たってダメージ(命中が確定して消費)");
    }
    { // 竪琴
        const w = world({ c: "apollo_lyre_rhythm" }); use(w, "card2"); frames(w, 30);
        assert.ok(w.ctx.ProjectRApolloLyreRhythm.getSession(), "竪琴: 演奏(音符)が始まる");
    }
    { // 月桂冠
        const w = world({ shift: "apollo_laurel_wreath" }); use(w, "mobility"); frames(w, 30);
        const r = plain(w.ctx.ProjectRApolloLaurelWreath.getLastResult());
        assert.deepEqual([r.ok, r.consumed, r.patches], [true, true, 1], "月桂冠: 結果が成功し、月桂冠の領域が1つ作られる");
        assert.equal(plain(w.ctx.ProjectRApolloLaurelWreath.getStats()).patches, 1);
    }
    { // 疫病の矢
        const w = world({ x: "apollo_plague_rain" }); use(w, "card1"); frames(w, 30);
        frames(w, 170);
        const r = plain(w.ctx.ProjectRApolloPlagueRain.getLastResult());
        assert.deepEqual([r.ok, r.consumed, r.direct, r.infected], [true, true, 1, [4]], "疫病の矢: 着弾して前方の敵に当たり、感染する");
        assert.ok(lost(w, 4) > 0, "疫病の矢: ダメージ");
    }
});

test("HUD: スキルIDで名前・アイコン・Cooldown が決まる(物理キーではない)。LMB 以外に薙ぎ払いを入れても連続技の表示。旧いHUDの形は変わらない", () => {
    const w = ringWorld({ slots: { shift: "hermes_sweep", x: "hermes_issen", c: "apollo_golden_volley" } });
    parkOthers(w); aimDegree(w, 0, 3);
    let hud = plain(FC(w).getHudSlots());
    assert.deepEqual(hud.map(s => [s.key, s.slot, s.name]).filter(s => s[1] !== "consumable"), [["LMB", "attack", "―"], ["Shift", "mobility", "薙ぎ払い"], ["E", "special", "―"], ["X", "card1", "一閃"], ["C", "card2", "黄金の矢"]]);
    assert.deepEqual(hud.filter(s => s.slot === "mobility").map(s => s.combo.max), [3], "Shift の薙ぎ払いも連続技の表示");
    assert.deepEqual(hud.filter(s => ["card1", "card2"].includes(s.slot)).map(s => s.iconIndex), [78, 102], "一閃 78 / 黄金の矢 102 は、スキルIDで決まる(従来のスロット別のアイコンではない)");
    assert.equal(FC(w).useAbility("card1").ok, true);
    hud = plain(FC(w).getHudSlots()); const issen = hud.find(s => s.slot === "card1");
    assert.ok(issen.cooldown.active && Math.abs(issen.cooldown.total - 7) < 1e-9 && issen.state === "cooldown", "一閃の Cooldown(7秒)が X の枠に出る");
    assert.equal(hud.find(s => s.slot === "special").state, "unavailable", "空の枠は暗い表示 + empty");
    FC(w).end("test");
});

console.log(`\n${passed} tests passed`);
