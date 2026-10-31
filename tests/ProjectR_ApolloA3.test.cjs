"use strict";
// Phase Apollo-A3: 将来のApollo 8枚が使う共有の戦闘基盤。押下時間の検出(tap/hold/release/取消/キーリピート)、被ダメージ・弱点・状態の修飾、主人公+仲間の名簿。
// どれも未使用(Apolloの8枚は未登録のまま)で、既定は中立: 既存のダメージの数値と入力の挙動を変えない。実エンジン(実Map004 + 全plugin)。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, SWEEP, ISSEN, placePolar, parkOthers, aimDegree, lost, resetHp, useCard, runFrames, state, deckApi, weaponHit, equip, SWORD_ID, KEYS } = fx;
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const TARGET = 4;
const inputApi = w => w.ctx.ProjectRCardBattleInput;
const dm = w => w.ctx.ProjectRDamageModifiers;
const Q = KEYS.Q;
const handSize = w => state(w).hand.length;
const pile = w => state(w).cooldownPile.length;
const down = (w, extra) => w.keyDown(Q[0], Q[1], extra);
const up = w => w.keyUp(Q[0], Q[1]);
function pressWorld(options = {}) {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [TARGET]); resetHp(w); placePolar(w, TARGET, 3, 0); aimDegree(w, 0);
    w.log = [];
    w.profile = Object.assign({ holdSeconds: 0.5, fireOn: "manual",
        onPress: s => w.log.push(["press", s.heldFrames]), onHold: s => w.log.push(["hold", s.heldFrames]),
        onRelease: s => w.log.push(["release", s.variant, s.heldFrames]), onCancel: s => w.log.push(["cancel", s.reason, s.heldFrames]) }, options);
    return w;
}

// ================= 入力: 押下時間 =================
test("プロファイル未登録のカードは従来どおり: 押した次の更新で1回だけ発動し、押下時間の記録も作らない", () => {
    const w = pressWorld();
    assert.equal(inputApi(w).getPressProfile(SWEEP), null);
    const before = handSize(w);
    down(w); w.frames(2); up(w); w.frames(2);
    assert.equal(pile(w), 1, "発動してCooldownに入る");
    assert.equal(plain(inputApi(w).getLastResult()).ok, true);
    assert.equal(inputApi(w).getPressSessions().length, 0);
    assert.deepEqual(plain(inputApi(w).getPressLog()), []);
    assert.equal(before, 5);
    assert.equal(inputApi(w).getActivationVariant(), null);
});

test("登録の検証: holdSecondsは0より大きい数、ハンドラは関数、発動経路が無い手動プロファイルは拒否", () => {
    const w = pressWorld();
    const api = inputApi(w);
    for (const bad of [{ holdSeconds: 0 }, { holdSeconds: -1 }, { holdSeconds: NaN }, { holdSeconds: "x" }, { holdSeconds: 31 }]) assert.equal(api.registerPressProfile(SWEEP, Object.assign({ onRelease() {} }, bad)).reason, "invalidHoldSeconds");
    assert.equal(api.registerPressProfile("", { holdSeconds: 0.5, onRelease() {} }).reason, "invalidCardId");
    assert.equal(api.registerPressProfile(SWEEP, { holdSeconds: 0.5, onRelease: 1 }).reason, "invalidHandler");
    assert.equal(api.registerPressProfile(SWEEP, { holdSeconds: 0.5, fireOn: "hold" }).reason, "invalidFireOn");
    assert.equal(api.registerPressProfile(SWEEP, { holdSeconds: 0.5 }).reason, "noActivationPath", "押しても何も起きない/使えなくなる登録は拒否");
    assert.equal(api.getPressProfile(SWEEP), null);
    const ok = plain(api.registerPressProfile(SWEEP, { holdSeconds: 0.5, fireOn: "release" }));
    assert.deepEqual(ok, { ok: true, thresholdFrames: 30 });
    assert.deepEqual(plain(api.getPressProfile(SWEEP)), { holdSeconds: 0.5, thresholdFrames: 30, fireOn: "release" });
    assert.equal(api.unregisterPressProfile(SWEEP), true); assert.equal(api.getPressProfile(SWEEP), null);
});

test("押下時間: 押した瞬間は発動しない。tap(しきい値未満)とhold(しきい値以上)を境界で正しく分け、カードは手動の発動までは消費されない", () => {
    for (const [frames, expected] of [[1, "tap"], [10, "tap"], [29, "tap"], [30, "hold"], [31, "hold"], [60, "hold"]]) {
        const w = pressWorld();
        assert.equal(inputApi(w).registerPressProfile(SWEEP, w.profile).ok, true);
        down(w);
        assert.equal(pile(w), 0, "押した瞬間は消費しない"); assert.equal(handSize(w), 5);
        w.frames(frames);
        assert.equal(pile(w), 0, "押している間も消費しない(手動プロファイル)");
        assert.equal(plain(inputApi(w).getPressSessions())[0].heldFrames, frames);
        up(w); w.frames(2);
        const release = w.log.find(e => e[0] === "release");
        assert.deepEqual(release.slice(0, 2), ["release", expected], `${frames}frame → ${expected}`);
        assert.equal(release[2], frames);
        assert.equal(w.log.filter(e => e[0] === "hold").length, frames >= 30 ? 1 : 0, "しきい値到達の通知は1回だけ");
        assert.equal(pile(w), 0, "手動の発動(activate)を呼ばなければ消費されない");
        assert.equal(inputApi(w).getPressSessions().length, 0, "離したらセッションは終わる");
    }
});

test("fireOn:'release'と手動activate: 離したときにvariant(tap/hold)つきで1回だけ発動する。activateを何度呼んでも消費は1回", () => {
    for (const [frames, expected] of [[5, "tap"], [40, "hold"]]) {
        const w = pressWorld({ fireOn: "release" });
        assert.equal(inputApi(w).registerPressProfile(SWEEP, w.profile).ok, true);
        down(w); w.frames(frames);
        assert.equal(pile(w), 0);
        up(w);
        assert.equal(pile(w), 0, "離した直後はまだ依頼だけ(次のマップ更新で発動)");
        w.frames(2);
        assert.equal(pile(w), 1, "発動して消費は1回");
        const last = plain(inputApi(w).getLastResult());
        assert.equal(last.ok, true); assert.equal(last.variant, expected);
        assert.equal(inputApi(w).getActivationVariant(), null, "発動の外ではvariantは見えない");
        w.frames(5); assert.equal(pile(w), 1, "二重発動しない");
    }
    // 手動: しきい値到達時(押している途中)に発動できる。その後に離しても2回目は発動しない
    const w = pressWorld({ onHold: s => { w.log.push(["hold"]); s.activate("hold"); w.log.push(["again", s.activate("hold").reason]); } });
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(31);
    assert.equal(pile(w), 1, "押している最中のしきい値到達で発動");
    assert.deepEqual(w.log.find(e => e[0] === "again"), ["again", "alreadyActivated"]);
    up(w); w.frames(3);
    assert.equal(pile(w), 1, "離しても2回目は発動しない");
    assert.equal(plain(inputApi(w).getLastResult()).variant, "hold");
});

test("発動の瞬間に活性化ハンドラが variant を読める(getActivationVariant)。通常の発動では null のまま", () => {
    const w = pressWorld({ fireOn: "release" });
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    const seen = [];
    const core = deckApi(w), original = core.requestUseCard;
    // requestUseCardを包んで、発動の最中の variant を記録する(テスト用)
    const router = w.ctx.ProjectRCardDeck;
    const keep = router.getActivationHandler("direction");
    router.registerActivationHandler("direction", context => { seen.push(inputApi(w).getActivationVariant()); return keep(context); });
    down(w); w.frames(35); up(w); w.frames(2);
    assert.deepEqual(seen, ["hold"]);
    void original;
});

test("キーリピート保護: 押しっぱなしのkeydown(repeat)や、離す前の2回目のkeydownはセッションを増やさず発動もしない。取消後もkeyupまで再発動しない", () => {
    const w = pressWorld();
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(3);
    for (let i = 0; i < 6; i++) { down(w, { repeat: true }); w.frames(1); }
    down(w); w.frames(1); // repeatフラグ無しの2回目(離す前)も無視される
    assert.equal(w.log.filter(e => e[0] === "press").length, 1, "押下の通知は1回だけ");
    assert.equal(inputApi(w).getPressSessions().length, 1);
    assert.equal(pile(w), 0);
    // 取消(手動)後、キーを押したままでは新しいセッションは始まらない
    assert.equal(inputApi(w).cancelPress(0, "test"), true);
    assert.deepEqual(w.log.filter(e => e[0] === "cancel").map(e => e[1]), ["test"]);
    for (let i = 0; i < 5; i++) { down(w, { repeat: true }); w.frames(1); }
    down(w); w.frames(1);
    assert.equal(inputApi(w).getPressSessions().length, 0, "押したままでは再開しない");
    up(w); w.frames(2);
    assert.equal(w.log.filter(e => e[0] === "release").length, 0, "取消済みのセッションは離しても release にならない");
    down(w); w.frames(2);
    assert.equal(inputApi(w).getPressSessions().length, 1, "離したあとの新しい押下は新しいセッション");
    assert.equal(pile(w), 0);
});

test("取消: 手札の入れ替わり・会話などの入力不可・戦闘終了・手動。取消後は離しても発動せず、依頼済みの発動も手札が変わっていれば消費しない", () => {
    // 手札が入れ替わった(押している最中に、その札が別の経路で使われた)
    let w = pressWorld();
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(4);
    const instanceId = state(w).hand[0].instanceId;
    assert.equal(deckApi(w).useBattleCard(instanceId).ok, true, "外部の経路で同じ札を使った");
    w.frames(2);
    assert.deepEqual(w.log.filter(e => e[0] === "cancel").map(e => e[1]), ["handChanged"]);
    up(w); w.frames(2);
    assert.equal(w.log.filter(e => e[0] === "release").length, 0);
    assert.equal(pile(w), 1, "消費されたのは外部の1枚だけ");
    // 入力不可(メッセージ表示中など)
    w = pressWorld();
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(4);
    w.ctx.$gameMessage.add("会話");
    w.frames(2);
    const reasons = w.log.filter(e => e[0] === "cancel").map(e => e[1]);
    assert.equal(reasons.length, 1); assert.match(reasons[0], /^blocked:/);
    w.ctx.$gameMessage.clear(); up(w); w.frames(3);
    assert.equal(pile(w), 0, "取消後に離しても発動しない");
    // 戦闘終了
    w = pressWorld({ fireOn: "release" });
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(4);
    deckApi(w).endBattle();
    assert.deepEqual(w.log.filter(e => e[0] === "cancel").map(e => e[1]), ["reset"]);
    up(w); w.frames(3);
    assert.equal(w.log.filter(e => e[0] === "release").length, 0);
    assert.equal(inputApi(w).getPressSessions().length, 0);
    // 発動を依頼したあと、実行の前に手札が入れ替わった → 消費しない
    w = pressWorld({ fireOn: "release" });
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(4); up(w);
    const swapped = state(w).hand[0].instanceId;
    deckApi(w).useBattleCard(swapped);
    w.frames(2);
    assert.equal(plain(inputApi(w).getLastResult()).reason, "handChanged");
    assert.equal(pile(w), 1, "二重に消費されない(外部の1枚だけ)");
});

test("ハンドラの例外は入力を壊さない。複数のスロットは独立に動き、プロファイルの無いカードは長押し中でも普通に使える", () => {
    const w = pressWorld({ onPress() { throw new Error("boom"); }, onHold() { throw new Error("boom2"); } });
    inputApi(w).registerPressProfile(SWEEP, w.profile);
    down(w); w.frames(35);
    assert.equal(inputApi(w).getPressSessions().length, 1, "例外でもセッションは続く");
    const errors = plain(inputApi(w).getPressLog()).filter(e => e.type === "handlerError").map(e => e.name);
    assert.deepEqual(errors, ["onPress", "onHold"]);
    up(w); w.frames(2);
    // 別カード(プロファイルなし)を、長押し中の別スロットで使う
    const w2 = pressWorld();
    inputApi(w2).unregisterPressProfile(SWEEP);
    const E = KEYS.E;
    // Qにだけプロファイルを付けるため、Eのカードは別ID(狙いを使わず必ず成功するストレングス)にする
    fx.restartWithOrder(w2, [SWEEP, "hermes_strength", SWEEP, SWEEP, SWEEP, ...fx.OTHER]);
    inputApi(w2).registerPressProfile(SWEEP, Object.assign({}, w2.profile));
    w2.keyDown(Q[0], Q[1]); w2.frames(5);
    w2.keyDown(E[0], E[1]); w2.frames(3); w2.keyUp(E[0], E[1]); w2.frames(5);
    const last2 = plain(inputApi(w2).getLastResult());
    assert.deepEqual([last2.ok, last2.cardId, last2.handIndex], [true, "hermes_strength", 1], "プロファイルの無い2枚目は長押し中でも、従来どおり使える");
    assert.equal(inputApi(w2).getPressSessions().length, 1, "長押し中のQは続いている");
    assert.equal(w2.log.filter(e => e[0] === "cancel").length, 0);
});

// ================= ダメージ: 中立 =================
// 薙ぎ払いと同じ固定ダメージの呼び出し(projectRFixed。属性はバランス設定のelement)を直接行う。カードの手札・Cooldownに依らず、何度でも同じ条件で繰り返せる。
const sweepDamage = w => {
    parkOthers(w, [TARGET]); resetHp(w);
    w.run("Math.random = () => 0.999;");
    const element = w.ctx.ProjectRCardBalance.constant(SWEEP, "element");
    new w.ctx.Game_Interpreter();
    w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(TARGET), value: "-50", exceedMaxHealth: "false",
        projectRFixed: { base: 50, flat: 0, critical: false, source: SWEEP, element, weaknessMultiplier: 1 } });
    return lost(w, TARGET);
};
const dmWorld = (card = SWEEP, level = 1) => { const w = hermesWorld({ card, level }); return w; };
const giveFireWeakness = w => w.ctx.$dataEnemies[5].traits.push(w.run("({ code: 11, dataId: 2, value: 2 })"));

test("既定は中立: 修飾が無い間、固定ダメージ・武器・数値のDoT・多段のダメージも、Hendrixに渡す引数も従来と同じ。ポリシーは未確定(uncommitted)", () => {
    const w = dmWorld();
    const api = dm(w);
    assert.deepEqual(plain(api.list()), []); assert.equal(api.hasAny(), false);
    assert.equal(api.getPolicy(), "uncommitted"); assert.equal(api.getReapplyPolicy(), "uncommitted");
    assert.equal(sweepDamage(w), 50);
    equip(w, SWORD_ID);
    const first = weaponHit(w, TARGET), second = weaponHit(w, TARGET);
    assert.ok(first > 0 && first === second, "武器は同じ乱数なら同じダメージ");
    // 値1の修飾は登録できても、引数を書き換えず数値も変えない
    assert.equal(api.add({ id: "t.neutral", kind: "damageTaken", target: "any", value: 1 }).ok, true);
    resetHp(w);
    assert.equal(weaponHit(w, TARGET), first);
    assert.equal(sweepDamage(w), 50);
    assert.equal(api.add({ id: "t.neutralWeak", kind: "weakness", target: "any", value: 1, mode: "rateMultiplier" }).ok, true);
    giveFireWeakness(w);
    w.ctx.ProjectRCardBalance.setOverride(SWEEP, "constant", "element", 2);
    assert.equal(sweepDamage(w), 100, "値1の弱点修飾も中立");
    // 検証
    for (const [bad, reason] of [[{ id: "", kind: "damageTaken", target: "any", value: 1 }, "invalidId"], [{ id: "x", kind: "nope", target: "any", value: 1 }, "invalidKind"],
        [{ id: "x", kind: "damageTaken", target: "any", value: -1 }, "invalidValue"], [{ id: "x", kind: "damageTaken", target: "any", value: NaN }, "invalidValue"],
        [{ id: "x", kind: "damageTaken", target: "bad", value: 1 }, "invalidTarget"], [{ id: "x", kind: "weakness", target: "any", value: 1 }, "invalidMode"]]) assert.equal(api.add(bad).reason, reason);
    assert.equal(api.setPolicy("nonsense"), false); assert.equal(api.getPolicy(), "uncommitted");
});

test("被ダメージ倍率は1回だけ: 固定ダメージ・武器・数値のDoT・一閃の多段(直接+分割3回)の各ヒットに1回ずつ。対象外の敵・味方には掛からない", () => {
    const w = dmWorld();
    const api = dm(w);
    api.setTracing(true);
    assert.equal(api.add({ id: "t.taken", kind: "damageTaken", target: "event:" + TARGET, value: 1.5 }).ok, true);
    assert.equal(sweepDamage(w), 75, "固定50 × 1.5(1回)");
    let trace = plain(api.getTrace()).filter(t => t.type === "damage");
    assert.equal(trace.length, 1); assert.equal(trace[0].key, "event:" + TARGET); assert.equal(trace[0].factor, 1.5);
    assert.equal(trace[0].source, "hermes_sweep", "ダメージの出どころ(attribution)が記録される");
    // 武器(式)
    api.remove("t.taken"); equip(w, SWORD_ID); resetHp(w);
    const base = weaponHit(w, TARGET);
    api.add({ id: "t.taken", kind: "damageTaken", target: "event:" + TARGET, value: 1.5 }); resetHp(w);
    const boosted = weaponHit(w, TARGET);
    assert.ok(Math.abs(boosted - base * 1.5) <= 1, `武器 ${base} → ${boosted}(1.5倍。2回掛かれば2.25倍)`);
    // 数値のDoT(病などが "-N" で呼ぶ形)
    resetHp(w);
    const interpreter = new w.ctx.Game_Interpreter();
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(TARGET), value: "-30", exceedMaxHealth: "false" });
    assert.equal(lost(w, TARGET), 45);
    // 別の敵には掛からない
    resetHp(w);
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "5", value: "-30", exceedMaxHealth: "false" });
    assert.equal(lost(w, 5), 30, "対象キー以外は中立");
    // 回復(正の値)は変えない
    const hp0 = fx.barHp(w, TARGET);
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(TARGET), value: "20", exceedMaxHealth: "true" });
    assert.equal(fx.barHp(w, TARGET) - hp0, 20);
    // 多段(一閃): 直接200 + 分割50を3tick(17/17/16)。各ヒットに1回
    const w2 = dmWorld(ISSEN);
    dm(w2).setTracing(true);
    dm(w2).add({ id: "t.taken", kind: "damageTaken", target: "enemies", value: 1.5 });
    parkOthers(w2, [TARGET]); resetHp(w2); placePolar(w2, TARGET, 4, 0); aimDegree(w2, 0);
    w2.run("Math.random = () => 0.999;");
    assert.equal(useCard(w2, 0).ok, true);
    runFrames(w2, 60 * 4);
    assert.equal(lost(w2, TARGET), 300 + 26 + 26 + 24, "直接200→300、分割17→26・17→26・16→24(各ヒット1回)");
    assert.equal(plain(dm(w2).getTrace()).filter(t => t.type === "damage").length, 4, "4ヒット = 記録4件(二重適用なし)");
});

test("主人公・仲間への被ダメージ倍率: UpdatePlayerHp / UpdateEventHp('player') のHP減少に1回だけ。回復は変えず、対象キー以外は中立", () => {
    const w = dmWorld();
    const api = dm(w), leader = w.ctx.$gameParty.leader();
    const cmd = (name, args) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), "Hendrix_Action_Engine", name, args);
    leader.setHp(leader.mhp);
    const loss = fn => { const before = leader.hp; fn(); return before - leader.hp; };
    assert.equal(loss(() => cmd("UpdatePlayerHp", { value: "-20", target: "player" })), 20, "中立");
    assert.equal(api.add({ id: "t.player", kind: "damageTaken", target: "player", value: 0.5 }).ok, true);
    assert.equal(loss(() => cmd("UpdatePlayerHp", { value: "-20", target: "player" })), 10, "主人公は0.5倍");
    assert.equal(loss(() => cmd("UpdatePlayerHp", { value: "-20" })), 10, "targetなし = 主人公");
    assert.equal(loss(() => cmd("UpdateEventHp", { eventId: "player", value: "-20", exceedMaxHealth: "false" })), 10, "UpdateEventHp('player')も1回");
    leader.setHp(Math.max(1, leader.mhp - 50));
    const hpBefore = leader.hp; cmd("UpdatePlayerHp", { value: "15", target: "player" });
    assert.equal(leader.hp - hpBefore, 15, "回復は変えない");
    // 対象が違う: ally:2 の修飾は主人公に掛からない。主人公の修飾は actor 2 に掛からない
    api.clear(); api.add({ id: "t.ally", kind: "damageTaken", target: "ally:2", value: 2 });
    leader.setHp(leader.mhp);
    assert.equal(loss(() => cmd("UpdatePlayerHp", { value: "-20", target: "player" })), 20);
    const actor2 = w.ctx.$gameActors.actor(2);
    actor2.setHp(actor2.mhp);
    const before2 = actor2.hp; cmd("UpdatePlayerHp", { value: "-10", target: "2" });
    assert.equal(before2 - actor2.hp, 20, "actor 2 は2倍(1回)");
    // gainHpの包みは呼び出しの後に必ず外れる
    assert.equal(Object.prototype.hasOwnProperty.call(actor2, "gainHp"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(leader, "gainHp"), false);
});

test("重ねがけの規則は未確定: 既定(uncommitted)では2つ以上を合成せず中立にして衝突を記録。単独は適用。乗算/加算は選択したときだけ", () => {
    const w = dmWorld();
    const api = dm(w);
    api.add({ id: "t.a", kind: "damageTaken", target: "event:" + TARGET, value: 1.5 });
    assert.equal(sweepDamage(w), 75, "1つなら適用(合成の規則が要らない)");
    api.add({ id: "t.b", kind: "damageTaken", target: "enemies", value: 2 });
    api.clearConflicts();
    assert.equal(sweepDamage(w), 50, "2つ以上は合成しない = 中立(数値を勝手に決めない)");
    const conflicts = plain(api.getConflicts());
    assert.ok(conflicts.length >= 1 && conflicts[0].reason === "stackingPolicyUncommitted" && conflicts[0].ids.length === 2, JSON.stringify(conflicts));
    assert.equal(api.setPolicy("multiplicative"), true);
    assert.equal(sweepDamage(w), 150, "乗算: 1.5 × 2 = 3.0");
    assert.equal(api.setPolicy("additive"), true);
    assert.equal(sweepDamage(w), 125, "加算: 1 + 0.5 + 1 = 2.5");
    assert.deepEqual(plain(api.factorFor("event:" + TARGET)).ids.sort(), ["t.a", "t.b"]);
    assert.equal(api.setPolicy("uncommitted"), true);
});

test("弱点修飾は対象別・1回だけ: 弱点(有効度>1)にだけ効き、mode(rateMultiplier / excessScale)の2通りを選べる。耐性・等倍・他の対象・別modeの混在は中立", () => {
    const w = dmWorld();
    const api = dm(w);
    giveFireWeakness(w);
    w.ctx.ProjectRCardBalance.setOverride(SWEEP, "constant", "element", 2);
    assert.equal(sweepDamage(w), 100, "弱点×2のみ");
    api.add({ id: "t.w", kind: "weakness", target: "event:" + TARGET, value: 1.5, mode: "rateMultiplier" });
    assert.equal(sweepDamage(w), 150, "有効度 2 × 1.5 = 3 → 50 × 3");
    api.remove("t.w"); api.add({ id: "t.w", kind: "weakness", target: "event:" + TARGET, value: 0.5, mode: "excessScale" });
    assert.equal(sweepDamage(w), 75, "1 + (2-1) × 0.5 = 1.5 → 50 × 1.5");
    api.remove("t.w"); api.add({ id: "t.w", kind: "weakness", target: "event:5", value: 3, mode: "rateMultiplier" });
    assert.equal(sweepDamage(w), 100, "別の敵のキーなら中立");
    // 弱点でない属性(氷=耐性0.5)は変えない
    api.remove("t.w"); api.add({ id: "t.w", kind: "weakness", target: "any", value: 3, mode: "rateMultiplier" });
    w.ctx.ProjectRCardBalance.setOverride(SWEEP, "constant", "element", 3);
    w.ctx.$dataEnemies[5].traits.push(w.run("({ code: 11, dataId: 3, value: 0.5 })"));
    assert.equal(sweepDamage(w), 25, "耐性は変わらない");
    // 別modeの混在は合成しない
    w.ctx.ProjectRCardBalance.setOverride(SWEEP, "constant", "element", 2);
    api.add({ id: "t.w2", kind: "weakness", target: "any", value: 0.5, mode: "excessScale" });
    api.clearConflicts();
    assert.equal(sweepDamage(w), 100, "別modeが混ざったら中立");
    assert.equal(plain(api.getConflicts())[0].reason, "mixedModes");
    // スキル経路(calcElementRate)にも同じ修飾が1回: 病ダメージの属性を炎にして比較
    api.clear(); w.ctx.ProjectRElements.setLogging(true); w.ctx.ProjectRElements.clearLog();
    const interpreter = new w.ctx.Game_Interpreter(), event = w.ctx.$gameMap.event(TARGET);
    w.ctx.$dataSkills[239].damage.elementId = 2;
    const calc = () => { w.run("Math.random = () => 0.999;"); return interpreter.calculateDamageAgainstEvent(event, "skill", 239); };
    const plainWeak = calc();
    api.add({ id: "t.s", kind: "weakness", target: "event:" + TARGET, value: 1.5, mode: "rateMultiplier" });
    const scoped = calc();
    api.add({ id: "t.s2", kind: "weakness", target: "event:5", value: 9, mode: "rateMultiplier" });
    const other = calc();
    w.ctx.$dataSkills[239].damage.elementId = 0;
    assert.ok(Math.abs(scoped - plainWeak * 1.5) <= 1, `スキル経路 ${plainWeak} → ${scoped}`);
    assert.equal(other, scoped, "別の対象の修飾は無関係");
    // 弱点修飾と被ダメージ倍率は別の段で、それぞれ1回(50 × 3 → × 1.2)
    api.clear();
    api.add({ id: "t.w", kind: "weakness", target: "event:" + TARGET, value: 1.5, mode: "rateMultiplier" });
    api.add({ id: "t.d", kind: "damageTaken", target: "event:" + TARGET, value: 1.2 });
    assert.equal(sweepDamage(w), 180, "固定50 × 弱点3(2×1.5) = 150 → 被ダメージ 1.2 = 180");
});

test("状態(status): 期間つきの修飾の束。戦闘時計で進み期限で消え、戦闘終了で消える。再付与の規則は未確定(uncommitted)で、選べば refresh/replace/stack", () => {
    const w = dmWorld();
    const api = dm(w), deck = w.ctx.ProjectRCardDeck;
    const apply = (extra = {}) => api.status.apply(Object.assign({ id: "disease", target: "event:" + TARGET, seconds: 5, modifiers: [{ kind: "damageTaken", value: 1.05 }] }, extra));
    assert.equal(api.status.apply({ id: "x", target: "event:" + TARGET, seconds: 0, modifiers: [{ kind: "damageTaken", value: 1 }] }).reason, "invalidStatus");
    assert.equal(api.status.apply({ id: "x", target: "event:" + TARGET, seconds: 1, modifiers: [{ kind: "damageTaken", value: -1 }] }).reason, "invalidValue", "不正な束は全体を拒否(中途半端に登録しない)");
    assert.equal(api.hasAny(), false);
    assert.deepEqual(plain(apply()), { ok: true, applied: true });
    assert.equal(api.status.has("disease", "event:" + TARGET), true);
    assert.equal(sweepDamage(w), 53, "50 × 1.05 = 52.5 → 53");
    // 再付与(既定 = 未確定): 既存を変えず、衝突として記録
    api.clearConflicts();
    assert.equal(apply().applied, false);
    assert.equal(plain(api.getConflicts())[0].reason, "reapplyPolicyUncommitted");
    assert.equal(api.status.list().length, 1);
    // 戦闘時計で期限切れ
    deck.updateCooldown(4.9); assert.equal(api.status.has("disease"), true);
    deck.updateCooldown(0.2);
    assert.equal(api.status.has("disease"), false); assert.equal(api.hasAny(), false, "束の修飾も外れる");
    assert.equal(sweepDamage(w), 50, "期限後は中立に戻る");
    // 再付与の規則を選ぶ
    assert.equal(api.setReapplyPolicy("refresh"), true);
    apply(); deck.updateCooldown(3); assert.equal(apply().refreshed, true);
    deck.updateCooldown(3); assert.equal(api.status.has("disease"), true, "更新されたので3+3秒でも残っている");
    api.clear();
    assert.equal(api.setReapplyPolicy("stack"), true); apply(); apply();
    assert.equal(api.status.list().length, 2);
    api.clear();
    assert.equal(api.setReapplyPolicy("replace"), true); apply(); apply();
    assert.equal(api.status.list().length, 1);
    // 戦闘終了で消える・セーブに入らない
    const clean = JSON.stringify(w.ctx.DataManager.makeSaveContents());
    assert.ok(!clean.includes("disease") && !clean.includes("ProjectRDamageModifiers"));
    deck.endBattle();
    assert.equal(api.status.list().length, 0); assert.equal(api.hasAny(), false);
    // 敵Eventが消えた状態は片付く
    api.setReapplyPolicy("uncommitted");
});

// ================= 名簿 =================
test("名簿(読み取り専用): 主人公+出撃中の仲間だけ。NPC・敵・召喚物は含まない。ダウンした仲間は既定で除外。仲間のAI・状態は変えない", () => {
    const w = dmWorld();
    const roster = w.ctx.ProjectRPartyRoster, party = w.ctx.ProjectRPartyCombat;
    const protagonist = plain(roster.protagonist());
    assert.deepEqual([protagonist.key, protagonist.kind, protagonist.eventId], ["player", "protagonist", null]);
    assert.equal(roster.allies().length, 0, "製品の仲間は0人(セッションなし)");
    assert.deepEqual(plain(roster.members()).map(m => m.key), ["player"]);
    const fighter = id => ({ actorId: id, name: "仲間" + id, maxHp: 80, normalAttack: { id: "n" + id, range: 1.5, cooldownSeconds: 1 } });
    party.registerAlly(fighter(2)); party.registerAlly(fighter(3));
    assert.equal(party.startSession([2, 3]).ok, true);
    const intentsBefore = JSON.stringify(plain(party.getIntentLog())), membersBefore = JSON.stringify(plain(party.members()));
    assert.deepEqual(plain(roster.allies()).map(a => a.key), ["ally:2", "ally:3"]);
    assert.deepEqual(plain(roster.members()).map(m => m.key), ["player", "ally:2", "ally:3"]);
    assert.equal(roster.count(), 3);
    assert.equal(roster.isPartyKey("ally:2"), true); assert.equal(roster.isPartyKey("ally:9"), false); assert.equal(roster.isPartyKey("event:5"), false);
    // NPCや敵のEventは仲間ではない
    assert.equal(roster.isPartyEvent(5), false, "敵EventはNO");
    const npc = w.ctx.$gameMap.event(5); npc.event().note;
    assert.equal(roster.keyForEvent(5), null);
    // Actorに結び付いたEventだけが仲間のEventとして引ける
    w.ctx.$gameMap.event(6).linkedActorId = 3;
    assert.equal(roster.keyForEvent(6), "ally:3"); assert.equal(roster.isPartyEvent(6), true);
    assert.equal(plain(roster.allies()).find(a => a.key === "ally:3").eventId, 6);
    // ダウンした仲間は既定で除外、includeDownで含む
    party.damageAlly(2, 9999);
    assert.deepEqual(plain(roster.allies()).map(a => a.key), ["ally:3"]);
    assert.deepEqual(plain(roster.allies({ includeDown: true })).map(a => a.key), ["ally:2", "ally:3"]);
    assert.equal(plain(roster.allies({ includeDown: true }))[0].down, true);
    // 返り値を書き換えても元は変わらない・名簿の参照でAI/状態は変化しない(意図ログは増えない)
    const copy = roster.allies({ includeDown: true }); copy[0].hp = 123456; copy.push({ key: "x" });
    assert.notEqual(plain(party.members())[0].hp, 123456);
    assert.equal(JSON.stringify(plain(party.getIntentLog())), intentsBefore, "名簿の参照は仲間の意図(AI)を作らない");
    assert.notEqual(JSON.stringify(plain(party.members())), membersBefore, "(ダウンさせた分だけ変わっている = 名簿以外の操作)");
    party.endSession();
    assert.equal(roster.allies().length, 0);
    // 被ダメージ修飾の対象キー "party" は、この名簿と同じ集合(NPC・敵を含まない)
    assert.equal(dm(w).matches("party", "player"), true); assert.equal(dm(w).matches("party", "ally:2"), true);
    assert.equal(dm(w).matches("party", "event:5"), false); assert.equal(dm(w).matches("enemies", "event:5"), true);
});

// ================= 互換性 =================
test("互換性: Apollo 8枚は未登録のまま・旧Apollo/Hermesの定義と保存デッキは不変・登録/チェーンの順序(CardModifiersが最外)・既存の入力と属性は従来どおり", () => {
    const w = dmWorld();
    const d = deckApi(w);
    for (const id of ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"]) assert.equal(d.definitions.card(id), null, id);
    assert.equal(d.definitions.cardDefinitions().length, 14);
    const legacy = ["apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"].map(id => plain(d.definitions.card(id)));
    assert.deepEqual(legacy.map(c => [c.maxCopies, c.cooldownSeconds, c.targetType]), [[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]);
    const command = w.ctx.PluginManager._commands["Hendrix_Action_Engine:UpdateEventHp"];
    assert.equal(!!command.__projectRCardModifiers, true, "CardModifiersが最外のまま");
    assert.equal(dm(w).isInstalled(), true);
    // 修飾を使っていないとき、ダメージ計算に関係するのは従来のプラグインだけ(新しい仕組みは何も登録していない)
    assert.equal(dm(w).hasAny(), false);
    assert.equal(w.ctx.ProjectRElements.weaknessModifiers().length, 0);
    // セーブ内容は修飾の有無で変わらない
    const clean = JSON.stringify(w.ctx.DataManager.makeSaveContents());
    dm(w).add({ id: "t.save", kind: "damageTaken", target: "any", value: 2 });
    assert.equal(JSON.stringify(w.ctx.DataManager.makeSaveContents()), clean);
    const roundTrip = () => { const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); w.ctx.DataManager.createGameObjects(); w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json)); };
    roundTrip();
    assert.equal(dm(w).hasAny(), false, "ロードで実行時の修飾は消える");
    // 累積Lv規則は変わらない(同じ効果は置換・別の効果は累積)
    const rows = [{ level: 1, effects: { arrows: 3, spread: 15 } }, { level: 2, effects: { arrows: 5 } }, { level: 3, effects: { arrows: 11, spread: 10, hold: 0.5 } }];
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.resolveLevels(rows, 3)), { arrows: 11, spread: 10, hold: 0.5 });
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.resolveLevels(rows, 2)), { arrows: 5, spread: 15 });
});

test("Chromium 85で使えない構文を足していない / 新しいplugin二つがplugins.jsに正しい順序で登録されている", () => {
    for (const file of ["ProjectR_DamageModifiers", "ProjectR_PartyRoster", "ProjectR_CardBattleInput", "ProjectR_Elements"]) {
        const source = fs.readFileSync(path.join(root, `js/plugins/${file}.js`), "utf8");
        assert.doesNotMatch(source, /\?\?=|\|\|=|&&=|\.at\(|\(\?<[=!]|\bstructuredClone\b|\.replaceAll\(|Object\.hasOwn\(/, file);
    }
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(root, "js/plugins.js"), "utf8"), config);
    const names = config.$plugins.map(p => p.name), at = n => names.indexOf(n);
    assert.ok(at("ProjectR_KillAttribution") < at("ProjectR_DamageModifiers") && at("ProjectR_DamageModifiers") < at("ProjectR_CardModifiers"), "KillAttribution < DamageModifiers < CardModifiers");
    assert.ok(at("ProjectR_PartyCombat") < at("ProjectR_PartyRoster"));
    for (const name of ["ProjectR_DamageModifiers", "ProjectR_PartyRoster"]) assert.ok(fs.existsSync(path.join(root, `js/plugins/${name}.js`)), name);
});

console.log(`${passed} Apollo A3 tests passed`);
