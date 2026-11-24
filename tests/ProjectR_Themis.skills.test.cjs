"use strict";
// Stage 3: Themis の通常スキル(ProjectR_ThemisSkills)と「罪状」の台帳。実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。
//   【0】登録: 5スキルが設計・実行時定義・バランス・RingLoadout に載る。Lv1〜3 の数値が仕様どおり
//   【1】戒律の宣告: カーソル上の敵1体(4 マス以内)・100 / 120 / 140 %・当たったら罪状 +1・Cooldown 7 秒
//   【2】審理の鎖: カーソル上の敵1体(3.5 マス以内)・罪状 +1・拘束 1.5 / 2.0 / 2.5 秒(攻撃は止めない)・ボスは速度低下 20 / 25 / 30 %・耐性・Cooldown 10 秒
//   【3】衡平の天秤: 被ダメージ軽減 20 / 30 / 40 %(2.5 秒)・最初の敵の直接攻撃の元の敵へ罪状 +1(1回の発動で最大1回)・Cooldown 13 秒
//   【4】断罪の判決: 160 / 195 / 230 % × (1 + 0.4 × 罪状)・ダメージが出た後にだけ消費・Cooldown 8 秒
//   【5】罪状の台帳: 最大3・追加のたびに 8 秒へ取り直し・期限切れで全消去・死亡 / 戦闘の終了 / マップ移動で消去・ボスにも付く・保存しない
//   【6】5つの枠・失敗は Cooldown を使わない・保存データ・ほかの神への影響なし
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, lost, resetHp, setRegion, center, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const THEMIS = ["themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, TS = w => w.ctx.ProjectRThemisSkills;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const SLOT_OF = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };
// セーブ内容に Themis の「実行時の状態」が入っていないかの検査。Themis の保存データとして正しい語(指輪ID・スキルID)以外で themis を含む語、
// または罪状・拘束の専用の語(sinStack・"sin"・"sins"・拘束の係数 0.0001)があれば違反。Hermes など既存の正規データ("granted" など)・ほかの神の状態は対象にしない。
const THEMIS_SAVED_WORDS = new Set(["themis", ...THEMIS]);
const themisSaveLeaks = json => [...new Set([...(json.match(/[A-Za-z0-9_]*themis[A-Za-z0-9_]*/gi) || []).filter(x => !THEMIS_SAVED_WORDS.has(x)), ...(json.match(/sinStack|"sins?"|0\.0001/g) || [])])];
const W = 100;                                                                 // 基礎物理ダメージ(倍率 1.0 = 100)

function themisWorld({ slots = {}, level = 1, begin = true, hermes = false } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    if (hermes) { const r = plain(w.ctx.ProjectRHermesProductionDeck.acquireRing("hermes", { source: "themis-test" })); assert.equal(r.ok, true, JSON.stringify(r)); }
    assert.equal(D(w).assignRingToPlayer("themis").ok, true); assert.equal(RL(w).equipRing("themis").ok, true);
    for (const id of THEMIS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const use = (w, slot) => plain(FC(w).useAbility(SLOT_OF[slot]));
const ev = (w, id) => w.ctx.$gameMap.event(id);
const sin = (w, id) => TS(w).sin.stacksOf(ev(w, id));
const addSin = (w, id, n = 1) => { let r = null; for (let i = 0; i < n; i++) r = plain(TS(w).sin.add(ev(w, id), "test")); return r; };
const speed = (w, id) => w.ctx.ProjectRCardModifiers.characterSpeedFactor(ev(w, id));
const hpOfPlayer = w => w.ctx.$gameParty.leader().hp;
const cd = (w, id) => plain(FC(w).getCooldowns())[id];
const markBoss = (w, id) => { const e = ev(w, id); e.event().note = (e.event().note || "") + "<fieldBoss: テストボス>"; };
const mouseAtEnemy = (w, id) => { const e = ev(w, id), m = w.ctx.$gameMap, p = w.ctx.ProjectR.CombatOcclusion.eventPolygon(e);
    const px = p.reduce((s, q) => s + q.x, 0) / p.length, py = p.reduce((s, q) => s + q.y, 0) / p.length; w.mouse((px - m.displayX()) * m.tileWidth(), (py - m.displayY()) * m.tileHeight()); };
const enemyHit = (w, eventId, value = "-50") => { const i = new w.ctx.Game_Interpreter(); i._eventId = eventId; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value, exceedMaxHealth: "false" }); frames(w, 2); };
const kill = (w, id) => { const i = new w.ctx.Game_Interpreter(); i._eventId = 0; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-" + (HP * 2), exceedMaxHealth: "false" }); frames(w, 2); };
// 1体を指定の距離・向きに置き、カーソルをその敵に合わせて、(スロット, スキル)で撃つ準備をする
const target = (w, id, r = 2.0, degree = 0) => { placePolar(w, id, r, degree); mouseAtEnemy(w, id); };

// ---------------------------------------------------------------- 【0】登録・バランス ----------------------------------------------------------------
test("【0】登録: 5スキルが設計(実装済み)・実行時定義・バランス・RingLoadout に載る。未所持では出ない・所持して装備すれば5枠のどれにも入る・Cooldown は仕様どおり", () => {
    const w = buildWorld(); assert.deepEqual(w.failures, []); w.enterMap(4, 12, 25); w.frames(3);
    const cat = w.ctx.ProjectRCardCatalog, deck = D(w), bal = w.ctx.ProjectRCardBalance;
    assert.deepEqual(plain(cat.godDesign("themis")).map(r => r.runtimeCardId), THEMIS);
    assert.ok(cat.godDesign("themis").every(r => r.implemented && r.implementedLevels === 3 && r.ringId === "themis" && r.god === "themis"));
    assert.deepEqual(plain(cat.runtimeIdAudit().problems), [], "予約IDの監査に問題なし");
    assert.deepEqual(THEMIS.map(id => deck.definitions.card(id)?.ringId), Array(5).fill("themis"));
    assert.deepEqual(THEMIS.map(id => deck.definitions.card(id).cooldownSeconds), [7, 10, 13, 0.05, 8], "カード定義の Cooldown(CardBalance の値。罪科の刻印は CardBalance の最小値 0.05)");
    assert.equal(bal.isReady(), true); assert.deepEqual(THEMIS.map(id => bal.hasCard(id)), Array(5).fill(true));
    assert.deepEqual(plain(RL(w).getRingSkills("themis")), THEMIS, "承認済みの表");
    assert.deepEqual(plain(RL(w).getUnlockedSkills("themis")), [], "未所持では解放されない");
    assert.equal(deck.assignRingToPlayer("themis").ok, true); assert.deepEqual(plain(RL(w).getUnlockedSkills("themis")), THEMIS);
    assert.equal(RL(w).setSkill("lmb", "themis_sin_mark").ok, false, "未装備の指輪のスキルは入らない");
    assert.equal(RL(w).equipRing("themis").ok, true);
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of THEMIS) { assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id); RL(w).clearSkill(slot); }
    assert.equal(RL(w).getSkillRing("themis_verdict"), "themis");
    assert.deepEqual(plain(RL(w).getRingSkills("athena")), [], "Athena は未実装のまま(表に無い)");
});
test("【0b】バランス(Lv1〜3 の数値): 戒律 100/120/140・鎖 1.5/2/2.5 秒と 80/75/70 %・天秤 20/30/40 % と 2.5 秒・刻印 90/100/110・100/110/125・115/130/145・判決 160/195/230 と +40%", () => {
    const w = buildWorld(); w.enterMap(4, 12, 25); w.frames(3); const b = w.ctx.ProjectRCardBalance, e = (id, lv) => plain(b.effects(id, lv));
    assert.deepEqual([1, 2, 3].map(lv => e("themis_edict", lv).damageScale), [1, 1.2, 1.4]); assert.deepEqual([b.constant("themis_edict", "castRangeTiles"), b.cooldownSeconds("themis_edict")], [4, 7]);
    assert.deepEqual([1, 2, 3].map(lv => [e("themis_chain", lv).immobilizeSeconds, e("themis_chain", lv).slowSeconds, e("themis_chain", lv).slowFactor]), [[1.5, 1.5, 0.8], [2, 2, 0.75], [2.5, 2.5, 0.7]]);
    assert.deepEqual([b.constant("themis_chain", "castRangeTiles"), b.cooldownSeconds("themis_chain")], [3.5, 10]);
    assert.deepEqual([1, 2, 3].map(lv => e("themis_balance", lv).incomingReduction), [0.2, 0.3, 0.4]); assert.deepEqual([b.constant("themis_balance", "durationSeconds"), b.cooldownSeconds("themis_balance")], [2.5, 13]);
    assert.deepEqual([1, 2, 3].map(lv => [e("themis_sin_mark", lv).damageScale, e("themis_sin_mark", lv).secondDamageScale, e("themis_sin_mark", lv).thirdDamageScale]), [[0.9, 1, 1.15], [1, 1.1, 1.3], [1.1, 1.25, 1.45]]);
    assert.equal(b.constant("themis_sin_mark", "comboWindowSeconds"), 0.5);
    assert.deepEqual([1, 2, 3].map(lv => e("themis_verdict", lv).damageScale), [1.6, 1.95, 2.3]); assert.deepEqual([b.constant("themis_verdict", "castRangeTiles"), b.constant("themis_verdict", "sinStackBonus"), b.cooldownSeconds("themis_verdict")], [4, 0.4, 8]);
});

// ---------------------------------------------------------------- 【1】戒律の宣告 ----------------------------------------------------------------
test("【1】戒律の宣告: カーソル上の敵1体へ 100 / 120 / 140 %(Lv1〜3)・当たったら罪状 +1・ほかの敵・カーソル外の敵には何も起きない・Cooldown 7 秒", () => {
    for (const [lv, scale] of [[1, 1], [2, 1.2], [3, 1.4]]) {
        const w = themisWorld({ slots: { e: "themis_edict" }, level: lv }); target(w, 3, 2.5, 0); placePolar(w, 4, 2.0, 90);
        resetHp(w); const r = use(w, "e"); assert.equal(r.ok, true, JSON.stringify(r)); frames(w, 3);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} ${scale * 100}%`); assert.equal(lost(w, 4), 0, "カーソルに無い敵には当たらない");
        assert.deepEqual([sin(w, 3), sin(w, 4)], [1, 0], "罪状 +1(当たった敵だけ)");
        near(cd(w, "themis_edict"), 7, 0.1, "Cooldown 7 秒"); const again = use(w, "e"); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown");
        const info = plain(TS(w).getLastResult("edict")); assert.deepEqual([info.targetEventId, info.level, info.sin], [3, lv, 1]);
        FC(w).end("test");
    }
});
test("【1b】戒律の宣告の対象: 射程 4 マス(体のどこかが届く)・射程外 / 壁の向こう / カーソルに敵なし は何も起きず Cooldown も使わない。通常の物理ダメージ(防御は無視しない)", () => {
    const w = themisWorld({ slots: { e: "themis_edict" } }); const c = center(w);
    placePolar(w, 3, 3.9, 0); mouseAtEnemy(w, 3); resetHp(w); assert.equal(use(w, "e").ok, true, "体の中心が 3.9 マス(4 以内)"); frames(w, 3); assert.ok(lost(w, 3) > 0); FC(w).end("test");
    const o = themisWorld({ slots: { e: "themis_edict" } }); placePolar(o, 3, 5.6, 0); mouseAtEnemy(o, 3); resetHp(o);
    let r = use(o, "e"); assert.equal(r.ok, false, "5.6 マス先(体の端 5.1 > 4)は射程外"); assert.equal(cd(o, "themis_edict"), 0, "Cooldown を使わない"); frames(o, 3); assert.equal(lost(o, 3), 0); assert.equal(sin(o, 3), 0);
    o.mouse(100, 100); r = use(o, "e"); assert.equal(r.ok, false); assert.equal(cd(o, "themis_edict"), 0, "カーソルに敵がいない: Cooldown を使わない"); FC(o).end("test");
    const v = themisWorld({ slots: { e: "themis_edict" } }); const cc = center(v);
    placePolar(v, 3, 3.0, 0); mouseAtEnemy(v, 3); for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(v, x, Math.floor(cc.y - 1.6), 255);      // 主人公と敵の間に壁
    resetHp(v); r = use(v, "e"); assert.equal(r.ok, false, "壁の向こうの敵は撃てない"); assert.equal(cd(v, "themis_edict"), 0); frames(v, 3); assert.equal(lost(v, 3), 0); assert.equal(sin(v, 3), 0);
    const calls = []; const orig = v.ctx.PluginManager.callCommand; v.ctx.PluginManager.callCommand = function (i, plugin, name, args) { calls.push({ name, args }); return orig.apply(this, arguments); };
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(v, x, Math.floor(cc.y - 1.6), 0);
    assert.equal(use(v, "e").ok, true); const dmg = calls.filter(k => k.name === "UpdateEventHp"); assert.ok(dmg.length >= 1 && dmg.every(k => !k.args.projectRFixed && /player weapon/.test(String(k.args.value))), "固定ダメージ(防御無視)は使わない");
    FC(v).end("test"); void c;
});

// ---------------------------------------------------------------- 【2】審理の鎖 ----------------------------------------------------------------
test("【2】審理の鎖: カーソル上の敵1体(3.5 マス以内)に罪状 +1 と拘束 1.5 / 2.0 / 2.5 秒(Lv1〜3)。ほかの敵は動ける・ダメージなし・過ぎれば元の速さ・Cooldown 10 秒", () => {
    for (const [lv, sec] of [[1, 1.5], [2, 2], [3, 2.5]]) {
        const w = themisWorld({ slots: { x: "themis_chain" }, level: lv }); target(w, 3, 3.0, 0); placePolar(w, 4, 2.0, 90);
        resetHp(w); const r = use(w, "x"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "themis_chain"), 10, 0.1, "Cooldown 10 秒");
        assert.ok(speed(w, 3) < 0.001, "拘束: 移動速度がほぼ 0"); assert.equal(speed(w, 4), 1); assert.deepEqual([sin(w, 3), sin(w, 4)], [1, 0], "罪状 +1(対象だけ)"); assert.deepEqual([lost(w, 3), lost(w, 4)], [0, 0], "ダメージなし");
        frames(w, Math.round(sec * 60) - 6); assert.ok(speed(w, 3) < 0.001, `Lv${lv}: ${sec - 0.1} 秒ではまだ拘束`);
        frames(w, 12); assert.equal(speed(w, 3), 1, `Lv${lv}: ${sec} 秒で解除`); assert.deepEqual(plain(TS(w).getState().holds), []); assert.equal(sin(w, 3), 1, "罪状は拘束とは別に残る(8 秒)");
        FC(w).end("test");
    }
});
test("【2b】審理の鎖の射程 3.5 マス: 範囲外・壁の向こう・対象なしは何も起きず Cooldown も使わない(罪状も付かない)", () => {
    const w = themisWorld({ slots: { x: "themis_chain" } }); placePolar(w, 3, 5.0, 0); mouseAtEnemy(w, 3);
    let r = use(w, "x"); assert.equal(r.ok, false, "5.0 マス先は射程外"); assert.equal(cd(w, "themis_chain"), 0); assert.equal(sin(w, 3), 0); assert.equal(speed(w, 3), 1);
    placePolar(w, 3, 3.2, 0); mouseAtEnemy(w, 3); r = use(w, "x"); assert.equal(r.ok, true, "3.2 マスは射程内"); FC(w).end("test");
    const o = themisWorld({ slots: { x: "themis_chain" } }); o.mouse(100, 100); r = use(o, "x"); assert.equal(r.ok, false); assert.equal(cd(o, "themis_chain"), 0); FC(o).end("test");
});
test("【2c】ボス(<fieldBoss>): 拘束ではなく移動速度の低下 20 / 25 / 30 %(速度 80 / 75 / 70 %)・同じ時間・罪状は付く(ボスにも)", () => {
    for (const [lv, factor, sec] of [[1, 0.8, 1.5], [2, 0.75, 2], [3, 0.7, 2.5]]) {
        const w = themisWorld({ slots: { x: "themis_chain" }, level: lv }); target(w, 3, 3.0, 0); markBoss(w, 3); assert.equal(TS(w).isBoss(ev(w, 3)), true);
        assert.equal(use(w, "x").ok, true); const info = plain(TS(w).getLastResult("chain")); assert.deepEqual([info.boss, info.slowed, info.immobilized, info.sin], [true, true, false, 1]);
        near(speed(w, 3), factor, 1e-9, `Lv${lv} ボスの速度`); assert.equal(sin(w, 3), 1, "ボスにも罪状");
        frames(w, Math.round(sec * 60) - 6); assert.equal(speed(w, 3), factor); frames(w, 12); assert.equal(speed(w, 3), 1, "ボスの低下も同じ時間で解除");
        FC(w).end("test");
    }
});
test("【2d】耐性(スタン 13 の無効)の敵は拘束されないが、罪状は付く。重ねがけしない(効果中の再発動は残り時間を取り直すだけ)。攻撃は止めない", () => {
    const w = themisWorld({ slots: { x: "themis_chain" } }); target(w, 3, 3.0, 0); const battler = w.run("SgetBattlerForH($gameMap.event(3))"); battler.isStateResist = id => id === 13;
    assert.equal(use(w, "x").ok, true); const info = plain(TS(w).getLastResult("chain")); assert.deepEqual([info.resisted, info.immobilized, info.sin], [true, false, 1]);
    assert.equal(speed(w, 3), 1, "耐性のある敵は動ける"); assert.equal(sin(w, 3), 1, "罪状は状態異常ではないので付く"); FC(w).end("test");
    const v = themisWorld({ slots: { x: "themis_chain" } }); target(v, 3, 3.0, 0); assert.equal(use(v, "x").ok, true); assert.ok(speed(v, 3) < 0.001);
    frames(v, 30); near(plain(TS(v).getState().holds).find(h => h.eventId === 3).remaining, 1.0, 0.05);
    const handler = D(v).getActivationHandler("ground"); const again = plain(handler({ definition: D(v).definitions.card("themis_chain") })); assert.equal(again.ok, true);
    const holds = plain(TS(v).getState().holds).filter(h => h.eventId === 3); assert.equal(holds.length, 1, "1体に1つ"); near(holds[0].remaining, 1.5, 0.05, "取り直し"); assert.equal(sin(v, 3), 2, "再発動で罪状 +1");
    const r = plain(v.ctx.ProjectREnemyAttack.schedule({ eventId: 3, kind: "melee", windupFrames: 10, notetag: "<projectRFieldMelee><dmg: ゴブリン>", reach: 1.2 })); assert.equal(r.ok, true, "拘束中でも攻撃を予約できる");
    frames(v, 14); assert.equal(plain(v.ctx.ProjectREnemyAttack.getOutcome(r.id)).state, "fired", "攻撃は実行される");
    FC(v).end("test"); assert.equal(speed(v, 3), 1, "戦闘の終了で解除");
});

// ---------------------------------------------------------------- 【3】衡平の天秤 ----------------------------------------------------------------
test("【3】衡平の天秤: 2.5 秒の間、被ダメージを 20 / 30 / 40 %(Lv1〜3)軽減する。受付が終われば元に戻る・Cooldown 13 秒", () => {
    for (const [lv, reduction] of [[1, 0.2], [2, 0.3], [3, 0.4]]) {
        const w = themisWorld({ slots: { x: "themis_balance" }, level: lv }); placePolar(w, 3, 2.0, 0);
        const h0 = hpOfPlayer(w); enemyHit(w, 3, "-50"); const plainLoss = h0 - hpOfPlayer(w); assert.ok(plainLoss > 0, "軽減なしのダメージ " + plainLoss);
        w.ctx.$gameParty.leader().setHp(h0); frames(w, 2);
        const r = use(w, "x"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "themis_balance"), 13, 0.1, "Cooldown 13 秒"); assert.ok(TS(w).getState().balance, "効果中");
        const h1 = hpOfPlayer(w); enemyHit(w, 3, "-50"); near(h1 - hpOfPlayer(w), plainLoss * (1 - reduction), 1.01, `Lv${lv} ${reduction * 100}% 軽減`);
        frames(w, 140); assert.ok(TS(w).getState().balance, "2.5 秒(150 フレーム)の手前ではまだ効果中"); frames(w, 20); assert.equal(TS(w).getState().balance, null, "2.5 秒で終わる"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "themis_balance"), false);
        w.ctx.$gameParty.leader().setHp(h0); frames(w, 2); const h2 = hpOfPlayer(w); enemyHit(w, 3, "-50"); near(h2 - hpOfPlayer(w), plainLoss, 1.01, "効果の後は元のダメージ");
        FC(w).end("test");
    }
});
test("【3b】効果中の最初の敵の直接攻撃の元の敵へ罪状 +1(1回の発動で最大1回)。環境(敵でない)ダメージは数えない・効果の外は付かない・効果中の再発動は失敗(Cooldown を使わない)", () => {
    const w = themisWorld({ slots: { x: "themis_balance" } }); placePolar(w, 3, 2.0, 0); placePolar(w, 4, 2.5, 90);
    enemyHit(w, 3); assert.equal(sin(w, 3), 0, "効果の外の攻撃には付かない");
    const nonEnemy = w.ctx.$gameMap.events().find(e => e && !String(e.event().note || "").includes("<enemy>"));
    assert.equal(use(w, "x").ok, true); enemyHit(w, nonEnemy.eventId()); enemyHit(w, 0); assert.deepEqual([sin(w, 3), sin(w, 4)], [0, 0], "環境ダメージ・呼び出し元なしは数えない"); assert.equal(TS(w).getState().balance.granted, false);
    enemyHit(w, 4); assert.deepEqual([sin(w, 3), sin(w, 4)], [0, 1], "最初に当たった敵(4)へ +1"); assert.equal(TS(w).getState().balance.granted, true);
    enemyHit(w, 3); enemyHit(w, 4); assert.deepEqual([sin(w, 3), sin(w, 4)], [0, 1], "1回の発動で最大1回: 2回目以降は付かない");
    const again = use(w, "x"); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown");
    const handler = D(w).getActivationHandler("instant"); const dup = plain(handler({ definition: D(w).definitions.card("themis_balance") })); assert.equal(dup.ok, false); assert.equal(dup.reason, "alreadyActive", "効果中の再発動は失敗");
    FC(w).end("test"); assert.equal(w.ctx.ProjectRApolloStatus.has("player", "themis_balance"), false, "戦闘の終了で解除");
});
test("【3c】天秤の軽減は、ほかの被ダメージ軽減とは積(DamageModifiers の規則は変えない)。ボスの攻撃でも罪状は付く", () => {
    const w = themisWorld({ slots: { x: "themis_balance" } }); placePolar(w, 3, 2.0, 0); markBoss(w, 3);
    const h0 = hpOfPlayer(w); enemyHit(w, 3, "-50"); const base = h0 - hpOfPlayer(w); w.ctx.$gameParty.leader().setHp(h0); frames(w, 2);
    assert.equal(w.ctx.ProjectRApolloStatus.apply("player", "other_guard", { seconds: 5, damageTaken: 0.5 }).ok, true);
    assert.equal(use(w, "x").ok, true); const h1 = hpOfPlayer(w); enemyHit(w, 3, "-50");
    near(h1 - hpOfPlayer(w), base * 0.8 * 0.5, 1.01, "20% 軽減 × 別の 50% 軽減 = 積"); assert.equal(sin(w, 3), 1, "ボスにも罪状");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0, "DamageModifiers の衝突は記録されない"); FC(w).end("test");
});

// ---------------------------------------------------------------- 【4】断罪の判決 ----------------------------------------------------------------
test("【4】断罪の判決: 160 / 195 / 230 %(Lv1〜3)× (1 + 0.4 × 罪状 0〜3)。ダメージが出た後にだけ罪状を全部消費。Cooldown 8 秒", () => {
    for (const [lv, base] of [[1, 1.6], [2, 1.95], [3, 2.3]]) for (const stacks of [0, 1, 2, 3]) {
        const w = themisWorld({ slots: { c: "themis_verdict" }, level: lv }); target(w, 3, 3.0, 0); addSin(w, 3, stacks); assert.equal(sin(w, 3), stacks);
        resetHp(w); const r = use(w, "c"); assert.equal(r.ok, true, JSON.stringify(r)); frames(w, 3);
        near(lost(w, 3), Math.round(W * base * (1 + 0.4 * stacks)), 1.01, `Lv${lv} 罪状${stacks}: ${base * 100}% × ${1 + 0.4 * stacks}`);
        assert.equal(sin(w, 3), 0, "ダメージが出た後に消費"); near(cd(w, "themis_verdict"), 8, 0.1, "Cooldown 8 秒");
        const info = plain(TS(w).getLastResult("verdict")); assert.deepEqual([info.stacksConsumed, info.targetEventId], [stacks, 3]);
        FC(w).end("test");
    }
});
test("【4b】断罪の判決の対象: 射程 4 マス・ほかの敵の罪状は消費しない・射程外 / 壁 / 対象なしでは罪状を消費せず Cooldown も使わない", () => {
    const w = themisWorld({ slots: { c: "themis_verdict" } }); target(w, 3, 3.0, 0); placePolar(w, 4, 2.0, 90); addSin(w, 3, 2); addSin(w, 4, 3);
    resetHp(w); assert.equal(use(w, "c").ok, true); frames(w, 3); assert.deepEqual([sin(w, 3), sin(w, 4)], [0, 3], "対象の罪状だけ消費する"); assert.equal(lost(w, 4), 0); FC(w).end("test");
    const o = themisWorld({ slots: { c: "themis_verdict" } }); placePolar(o, 3, 5.6, 0); mouseAtEnemy(o, 3); addSin(o, 3, 3); resetHp(o);
    let r = use(o, "c"); assert.equal(r.ok, false, "射程外"); assert.equal(cd(o, "themis_verdict"), 0); assert.equal(sin(o, 3), 3, "罪状は残る"); assert.equal(lost(o, 3), 0);
    o.mouse(100, 100); r = use(o, "c"); assert.equal(r.ok, false); assert.equal(cd(o, "themis_verdict"), 0); assert.equal(sin(o, 3), 3);
    const v = themisWorld({ slots: { c: "themis_verdict" } }); const cc = center(v); placePolar(v, 3, 3.0, 0); mouseAtEnemy(v, 3); addSin(v, 3, 3);
    for (let x = Math.floor(cc.x) - 1; x <= Math.floor(cc.x) + 1; x++) setRegion(v, x, Math.floor(cc.y - 1.6), 255);
    r = use(v, "c"); assert.equal(r.ok, false, "壁の向こう"); assert.equal(cd(v, "themis_verdict"), 0); assert.equal(sin(v, 3), 3); frames(v, 3); assert.equal(lost(v, 3), 0);
    FC(o).end("test"); FC(v).end("test");
});

// ---------------------------------------------------------------- 【5】罪状の台帳 ----------------------------------------------------------------
test("【5】罪状の台帳: 敵ごとに最大 3(4回目は 3 のまま)・追加のたびに 8 秒へ取り直す・8 秒で全部消える・敵ごとに独立", () => {
    const w = themisWorld(); placePolar(w, 3, 2.0, 0); placePolar(w, 4, 2.5, 90);
    assert.deepEqual([1, 2, 3, 3, 3].map(() => addSin(w, 3).stacks), [1, 2, 3, 3, 3], "上限 3"); assert.deepEqual([sin(w, 3), sin(w, 4)], [3, 0]);
    near(TS(w).sin.remainingOf(ev(w, 3)), 8, 1e-9, "期限 8 秒");
    frames(w, 300); near(TS(w).sin.remainingOf(ev(w, 3)), 3, 0.1, "5 秒で残り 3 秒"); assert.equal(sin(w, 3), 3, "期限の前は残る");
    addSin(w, 4); frames(w, 120); assert.equal(sin(w, 3), 3, "7 秒経過: まだ残る"); assert.equal(sin(w, 4), 1);
    addSin(w, 3); near(TS(w).sin.remainingOf(ev(w, 3)), 8, 1e-9, "満タンでも期限は取り直す"); frames(w, 300 + 60);
    assert.deepEqual([sin(w, 3), sin(w, 4)], [3, 0], "敵ごとに独立: 4 は先に期限が切れて全部消える・3 は取り直したのでまだ残る");
    frames(w, 130); assert.equal(sin(w, 3), 0, "8 秒で全部消える(1つずつ減らない)"); assert.deepEqual(plain(TS(w).getState().sins), []);
    FC(w).end("test");
});
test("【5b】消える場面: 敵の死亡(その場で)・戦闘の終了・マップ移動・ロード。ボスにも付く。罪状のない敵・倒れた敵には付かない", () => {
    const w = themisWorld(); placePolar(w, 3, 2.0, 0); placePolar(w, 4, 2.5, 90); placePolar(w, 5, 3.0, 180); markBoss(w, 5);
    addSin(w, 3, 2); addSin(w, 4, 1); addSin(w, 5, 3); assert.deepEqual([3, 4, 5].map(i => sin(w, i)), [2, 1, 3], "ボスにも付く");
    kill(w, 3); frames(w, 2); assert.equal(sin(w, 3), 0, "死亡で消える"); assert.deepEqual([sin(w, 4), sin(w, 5)], [1, 3], "ほかの敵は残る");
    assert.equal(addSin(w, 3).ok, false, "倒れた敵には付かない"); assert.equal(addSin(w, 3).reason, "invalidTarget");
    FC(w).end("test"); assert.deepEqual(plain(TS(w).getState().sins), [], "戦闘の終了で全部消える");
    const m = themisWorld(); placePolar(m, 3, 2.0, 0); addSin(m, 3, 2); m.enterMap(4, 14, 25); m.frames(3); assert.deepEqual(plain(TS(m).getState().sins), [], "マップ移動で消える");
    const l = themisWorld(); placePolar(l, 3, 2.0, 0); addSin(l, 3, 2); l.ctx.DataManager.extractSaveContents(l.ctx.DataManager.makeSaveContents()); assert.deepEqual(plain(TS(l).getState().sins), [], "ロードで消える");
    FC(m).end("test"); FC(l).end("test");
});
test("【5c】実行時のみ: 罪状・拘束・天秤の状態はセーブに入らない(保存データのスキーマ変更なし)。Themis のスキル以外は罪状に触れない(Hermes・Janus・DamageModifiers は変わらない)", () => {
    const w = themisWorld({ slots: { e: "themis_edict", x: "themis_chain", c: "themis_balance" } }); placePolar(w, 3, 2.0, 0); mouseAtEnemy(w, 3);
    const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, D(w).getPersistentData()]); const s0 = snap();
    assert.equal(use(w, "e").ok, true); frames(w, 130); assert.equal(use(w, "x").ok, true); assert.equal(use(w, "c").ok, true); addSin(w, 3, 2);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.deepEqual(themisSaveLeaks(saved), [], "セーブ内容に罪状・拘束・天秤の状態・残り時間は入らない(入ってよいのは指輪ID・スキルIDの登録だけ = RingLoadout の既存の保存)");
    assert.equal(snap(), s0, "RingLoadout・Core の保存データは変わらない(スロット登録はテスト前のまま)");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.list()).filter(m => /sin|themis/i.test(JSON.stringify(m))).length, 0, "罪状は DamageModifiers に登録されない");
    assert.equal(w.ctx.ProjectRDamageModifiers.factorFor("event:3", "damageTaken").factor, 1, "敵の被ダメージ倍率は 1 のまま");
    FC(w).end("test");
});

test("【5d】セーブの検査: Themis の実行時の状態を入れた保存は検出し、Hermes の正規の保存データ(granted など)・Themis の正規の保存データ(指輪・スキルID)は弾かない", () => {
    const w = themisWorld({ hermes: true, begin: false, slots: { e: "themis_edict", x: "themis_chain", c: "themis_balance" } });
    const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []);
    placePolar(w, 3, 2.0, 0); placePolar(w, 4, 2.6, 90); mouseAtEnemy(w, 3);
    assert.equal(use(w, "e").ok, true); frames(w, 130); assert.equal(use(w, "x").ok, true); assert.equal(use(w, "c").ok, true); addSin(w, 4, 2);
    assert.equal(sin(w, 4), 2, "Themis の実行時の状態が実際に有る(罪状・拘束・天秤)"); assert.equal(speed(w, 3) < 0.01 || sin(w, 3) >= 1, true);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    // 陰性: Hermes の正規の記録(granted)と、Themis の正規の保存(指輪・スキルID)があっても、実行時の状態が無ければ違反なし
    assert.equal(/"granted":true/.test(saved), true, "Hermes の入手記録(granted)が保存に入っている世界で確かめる");
    assert.equal(saved.includes("themis_sin_mark") && saved.includes("themis_chain"), true, "Themis の正規の保存(スキルID)は入っている");
    assert.deepEqual(themisSaveLeaks(saved), [], "Hermes・Themis の正規のデータは違反にならない");
    // 陽性: 実行時の状態を誤って保存する実装を模す(罪状・拘束・天秤・奥義の5通りの形)。どれも検出する
    const shapes = { sins: ["_themisSins", { 3: { stacks: 2, remaining: 5.5 } }], sinPlain: ["_themisSin", { e3: 2 }], hold: ["_themisHold", { event3: 0.0001 }], balance: ["_themisBalance", { active: true, until: 99 }], ultimate: ["_themisUltimate", { pending: true }], bare: ["_sinStack", 2] };
    for (const [name, [key, val]] of Object.entries(shapes)) {
        w.ctx.$gameSystem[key] = val; const j = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); delete w.ctx.$gameSystem[key];
        assert.equal(themisSaveLeaks(j).length > 0, true, "検出する: " + name);
    }
    assert.deepEqual(themisSaveLeaks(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents())), [], "対照のあと、後片付けで元に戻っている");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【6】5つの枠・失敗は Cooldown を使わない ----------------------------------------------------------------
test("【6】5つの枠(LMB / Shift / E / X / C)のどれからでも同じスキルが使える(戒律・鎖・天秤・判決)。Cooldown(7 / 10 / 13 / 8 秒)は成功したときだけ・スキルID単位・HUD に出る", () => {
    const prep = { themis_edict: w => target(w, 3, 2.5, 0), themis_chain: w => target(w, 3, 2.5, 0), themis_balance: w => { void w; }, themis_verdict: w => target(w, 3, 2.5, 0) };
    const expected = { themis_edict: 7, themis_chain: 10, themis_balance: 13, themis_verdict: 8 };
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of Object.keys(prep)) {
        const w = themisWorld({ slots: { [slot]: id } }); prep[id](w);
        const r = use(w, slot); assert.equal(r.ok, true, `${id}@${slot} ` + JSON.stringify(r)); assert.equal(r.skillId, id);
        near(cd(w, id), expected[id], 0.1, `${id} の Cooldown`); const again = use(w, slot); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown");
        const hud = plain(FC(w).getHudState()).slots.find(s => s.slot === SLOT_OF[slot]); assert.equal(hud.cooldown > 0, true, "HUD に Cooldown");
        FC(w).end("test");
    }
});
test("【6b】失敗は何も消費しない: 失敗の直後に Cooldown は 0・罪状は変わらない・成功すれば通る(対象なし → 対象あり)。カード戦闘の手札からは刻印・天秤などが誤って動かない", () => {
    const w = themisWorld({ slots: { e: "themis_edict", x: "themis_chain", c: "themis_verdict", shift: "themis_balance" } });
    w.mouse(100, 100); for (const slot of ["e", "x", "c"]) { const r = use(w, slot); assert.equal(r.ok, false, slot + " は対象なしで失敗"); }
    assert.deepEqual(["themis_edict", "themis_chain", "themis_verdict"].map(id => cd(w, id)), [0, 0, 0], "3つとも Cooldown 0");
    target(w, 3, 2.0, 0); assert.equal(use(w, "e").ok, true, "対象を合わせれば通る"); assert.equal(sin(w, 3), 1);
    const handler = D(w).getActivationHandler("direction"); const dup = plain(handler({ definition: D(w).definitions.card("themis_sin_mark") })); assert.equal(dup.ok, false); assert.equal(dup.reason, "fieldCombatOnly", "罪科の刻印は手札からは動かない");
    FC(w).end("test");
});
test("【6c】Janus・Hermes・Apollo と共存: Themis と Janus を同時に装備しても、それぞれのスキルが動き、罪状は Janus・Hermes のスキルでは変わらない", () => {
    const w = themisWorld({ slots: { e: "themis_edict" }, begin: false });                     // 戦闘の開始前に編成する(戦闘中は装備・編成の変更を拒否する既存の仕様)
    assert.equal(D(w).assignRingToPlayer("janus").ok, true); assert.equal(RL(w).equipRing("janus").ok, true);
    for (const id of ["janus_closed_gate", "janus_boundary_slash"]) { D(w).setCardOwned(id, true); D(w).setCardLevel(id, 1); assert.equal(RL(w).setSkill(id === "janus_closed_gate" ? "x" : "c", id).ok, true); }
    assert.equal(FC(w).begin().ok, true); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []);
    placePolar(w, 3, 2.5, 0); mouseAtEnemy(w, 3);
    assert.equal(use(w, "c").ok, true); frames(w, 20); assert.equal(sin(w, 3), 0, "Janus の境界断ちは罪状に触れない");
    assert.equal(use(w, "x").ok, true); assert.equal(sin(w, 3), 0, "Janus の閉門は罪状に触れない");
    assert.equal(use(w, "e").ok, true); assert.equal(sin(w, 3), 1, "Themis の戒律の宣告は罪状 +1"); FC(w).end("test");
});

console.log(`\nall ${passed} passed`);
