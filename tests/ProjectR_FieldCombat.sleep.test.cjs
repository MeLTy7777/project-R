"use strict";
// Stage 1D-2B: 葦笛(hermes_reed_flute)の睡眠ステートを、フィールド戦闘(ProjectR_FieldCombat)の敵のAIが見て止まる。
// 実エンジン(実Map004 + 全plugin)。睡眠の付与は FieldCombat の useAbility → 本物の葦笛のハンドラ → Hendrix の AddState(耐性も公式の処理)。ステートのフラグを直接立てることはしない。
// 敵の攻撃は本物の ProjectR_EnemyAttack(予兆つきの近接)と ProjectR_FieldStrongEnemy。実機(MZ)の見た目は Node では扱わない。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, parkOthers, aimDegree, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const ALL = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength", "apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const CARDS = ALL.filter(id => id !== "hermes_sweep");
const SLEEP = 32;
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, EA = w => w.ctx.ProjectREnemyAttack, SE = w => w.ctx.ProjectRFieldStrongEnemy;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const ev = (w, id) => w.ctx.$gameMap.event(id);
const pos = (w, id) => { const e = ev(w, id); return [e._realX, e._realY]; };
const hp = w => w.ctx.$gameParty.leader().hp;
const asleep = (w, id) => w.ctx.hasState(id, SLEEP) === true;
const pend = w => plain(EA(w).list()).filter(r => r.state === "pending");
const enemy = (w, id) => plain(FC(w).getState().enemies.find(e => e.eventId === id));
const dist = (w, id) => { const p = w.ctx.$gamePlayer.centerPositionPoint(), e = ev(w, id); return Math.hypot(e._realX + 0.5 - p.x, e._realY + 0.5 - p.y); };
const until = (w, cond, max = 600) => { for (let i = 0; i < max; i++) { if (cond()) return i; w.frames(1); } return cond() ? max : -1; };
const MELEE = { chase: true, reach: 1.2, windupFrames: 36, cooldownFrames: 60, sightTiles: 14, aggroTiles: 14 };

// enemies: { id: [距離, 角度, attachオプション | null(付けない)] }。flute は C キー(Lv1)、薙ぎ払いは LMB。視界は無効(いつも見える)。
function sleepWorld({ enemies = {}, aim = 90, fluteLevel = 1 } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    const d = D(w);
    for (const ring of ["hermes", "apollo"]) assert.equal(d.assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(d.setCardOwned(id, true).ok, true, id); assert.equal(d.setCardLevel(id, id === "hermes_reed_flute" ? fluteLevel : 1).ok, true, id); }
    for (const ring of ["hermes", "apollo"]) assert.equal(RL(w).equipRing(ring).ok, true, "equip " + ring);
    assert.equal(RL(w).setSkill("c", "hermes_reed_flute").ok, true); assert.equal(RL(w).setSkill("lmb", "hermes_sweep").ok, true);
    attachHpBars(w, ENEMIES, HP);
    w.run("Math.random = () => 0.999;");
    const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2);
    FC(w).setPerception({ enabled: false });
    parkOthers(w, Object.keys(enemies).map(Number));
    for (const [id, [r, deg]] of Object.entries(enemies)) placePolar(w, Number(id), r, deg);
    aimDegree(w, aim, 4);
    for (const [id, [, , opts]] of Object.entries(enemies)) if (opts) assert.equal(FC(w).attachEnemy(Number(id), opts).ok, true, "attach " + id);
    return w;
}
const flute = w => plain(FC(w).useAbility("card2"));

test("睡眠の付与は実ハンドラ(葦笛 → AddState): 範囲内の敵だけが眠る。葦笛の Cooldown(8秒)・睡眠時間(4秒)・消費は従来のまま。AIは眠った敵を「眠っている」と見る", () => {
    const w = sleepWorld({ enemies: { 4: [5, 90, MELEE], 5: [12, 90, MELEE] } });
    assert.equal(FC(w).isEnemyAsleep(4), false); assert.deepEqual(plain(FC(w).getEnemySleep(4)), { asleep: false, sleeps: 0, interrupted: 0 });
    const r = flute(w); assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.skillId, "hermes_reed_flute");
    assert.equal(asleep(w, 4), true, "範囲(8マス)内の敵は、公式のステートで眠る"); assert.equal(asleep(w, 5), false, "範囲外(12マス)の敵は眠らない");
    assert.deepEqual(plain(w.ctx.ProjectRHermesReedFlute.getLastResult()).slept, [4]);
    assert.equal(w.ctx.ProjectRHermesReedFlute.sleepSeconds(), 4, "睡眠時間は従来どおり 4秒(ここでは変えない)");
    assert.ok(Math.abs(plain(FC(w).getCooldowns()).hermes_reed_flute - 8) < 1e-9, "葦笛の Cooldown は 8秒のまま");
    assert.equal(FC(w).isEnemyAsleep(4), true); assert.equal(FC(w).isEnemyAsleep(5), false);
    frames(w, 2); assert.deepEqual(plain(FC(w).getEnemySleep(4)).asleep, true); assert.equal(plain(FC(w).getEnemySleep(4)).sleeps, 1);
    assert.equal(plain(FC(w).getEnemySleep(5)).asleep, false);
});

test("移動の抑止: 追ってくる敵は眠った瞬間から全く動かない(毎フレーム同じ位置)。眠っていない敵は追い続ける。起きたあとは追いかけ直す", () => {
    const w = sleepWorld({ enemies: { 4: [5, 90, MELEE], 5: [12, 90, MELEE] } });
    frames(w, 20);
    const a0 = pos(w, 4), d0 = dist(w, 4); frames(w, 20);
    assert.ok(dist(w, 4) < d0 - 0.3, "眠る前は追ってくる(距離が縮む)");
    assert.equal(flute(w).ok, true); frames(w, 1);
    const still = pos(w, 4), still5 = pos(w, 5);
    let n = 0;
    while (asleep(w, 4) && n < 400) { w.frames(1); n++; if (asleep(w, 4)) assert.deepEqual(pos(w, 4), still, `眠っている間は動かない(${n}フレーム目)`); }
    assert.ok(n >= 20, "しばらく眠っていた(睡眠は従来の時間で切れる): " + n + "フレーム");
    assert.ok(Math.hypot(pos(w, 5)[0] - still5[0], pos(w, 5)[1] - still5[1]) > 0.5, "眠っていない敵(範囲外)は、その間も追い続ける");
    // 起きた
    assert.equal(asleep(w, 4), false); frames(w, 1); assert.equal(plain(FC(w).getEnemySleep(4)).asleep, false, "AIも起きた");
    const w0 = pos(w, 4); frames(w, 40);
    assert.ok(Math.hypot(pos(w, 4)[0] - w0[0], pos(w, 4)[1] - w0[1]) > 0.3 || dist(w, 4) < 1.5, "起きたあとは、また追ってくる");
    assert.ok(a0 && still);
});

test("攻撃を始めない: 攻撃の間合いにいる眠った敵は、予約も溜めもせず、プレイヤーにダメージを与えない。眠っていない敵は従来どおり攻撃する", () => {
    const w = sleepWorld({ enemies: { 4: [1.4, 90, MELEE], 5: [1.4, 270, MELEE] } });
    const hp0 = hp(w);
    assert.equal(flute(w).ok, true);
    assert.deepEqual([asleep(w, 4), asleep(w, 5)], [true, true]);
    let n = 0, windup = 0, maxPend = 0;
    while (asleep(w, 4) && n < 400) { w.frames(1); n++; if (asleep(w, 4)) { maxPend = Math.max(maxPend, pend(w).length); if (enemy(w, 4).state === "windup") windup++; } }
    assert.ok(n >= 20); assert.equal(maxPend, 0, "眠っている間は、攻撃の予約(予兆)が1つも出ない"); assert.equal(windup, 0, "溜めに入らない"); assert.equal(hp(w), hp0, "眠っている間はダメージを受けない");
    assert.equal(enemy(w, 4).attacks, 0, "攻撃回数も増えない");
    // 眠っていない敵(葦笛の範囲外)の従来の攻撃は変わらない
    const w2 = sleepWorld({ enemies: { 4: [12, 90, MELEE], 5: [1.4, 270, MELEE] } });
    assert.equal(flute(w2).ok, true); assert.deepEqual([asleep(w2, 4), asleep(w2, 5)], [false, true]);
    const w3 = sleepWorld({ enemies: { 5: [1.4, 270, MELEE] } }); const h3 = hp(w3);
    assert.ok(until(w3, () => hp(w3) < h3, 200) >= 0, "対照: 葦笛を使わなければ、隣の敵は攻撃してダメージを与える");
});

test("溜め中(予兆つき)の攻撃は、眠った瞬間に中断される(ダメージなし)。中断は撃ち終えた扱いで、起きた直後に続けて撃たない。起きたあとはまた攻撃する", () => {
    const w = sleepWorld({ enemies: { 4: [1.4, 90, MELEE] } });
    assert.ok(until(w, () => pend(w).length === 1, 30) >= 0, "対照: 予兆(溜め)が出ている"); assert.equal(enemy(w, 4).state, "windup");
    const hp0 = hp(w);
    assert.equal(flute(w).ok, true);
    assert.equal(pend(w).length, 0, "眠った同じフレームのうちに、溜め中の攻撃(予兆)が取り消される(溜めが終わる瞬間に当たらない)");
    assert.deepEqual([plain(FC(w).getEnemySleep(4)).interrupted, enemy(w, 4).state], [1, "chase"]);
    let n = 0; while (asleep(w, 4) && n < 400) { w.frames(1); n++; assert.equal(pend(w).length, 0); }
    assert.equal(hp(w), hp0, "眠っている間のダメージはない");
    assert.equal(enemy(w, 4).attacks, 0, "中断した攻撃は『当たった攻撃』に数えない");
    // 起きたら、普通のAIへ: 少し間をおいて攻撃する
    assert.ok(until(w, () => hp(w) < hp0, 400) >= 0, "起きたあとは、また攻撃してダメージを与える");
    assert.ok(enemy(w, 4).attacks >= 1);
});

test("起床: 睡眠が切れる(従来の時間)/ ダメージを与えて起こす(従来の規則)のどちらでも、次のフレームから通常のAIへ戻る(固まらない・ステートも残らない)", () => {
    // ダメージで起こす: 薙ぎ払い(LMB)の実際の命中。起きたら攻撃してくる
    const w = sleepWorld({ enemies: { 4: [1.4, 90, MELEE] } });
    assert.equal(flute(w).ok, true); frames(w, 5); assert.equal(asleep(w, 4), true);
    const hp0 = hp(w); const swing = plain(FC(w).attackClick()); assert.equal(swing.ok, true, JSON.stringify(swing)); assert.ok(until(w, () => !asleep(w, 4), 30) >= 0, "斬撃が当たるまで(数フレーム)は眠ったまま");
    assert.equal(asleep(w, 4), false, "ダメージを与えたら起きる(従来の規則)"); frames(w, 1); assert.equal(w.ctx.ProjectRHermesReedFlute.isSleeping(4), false);
    assert.equal(plain(FC(w).getEnemySleep(4)).asleep, false, "AIも起きた");
    assert.ok(until(w, () => hp(w) < hp0, 300) >= 0, "起きた敵は、通常どおり攻撃してくる");
    // 戦闘の終了でも睡眠は片づく(従来どおり)。AIの記録も残らない
    const w2 = sleepWorld({ enemies: { 4: [3, 90, MELEE] } });
    assert.equal(flute(w2).ok, true); frames(w2, 3); FC(w2).end("test"); frames(w2, 2);
    assert.equal(asleep(w2, 4), false, "戦闘終了でステートも外れる(従来どおり)");
});

test("耐性・無効は従来のまま新しい規則を足さない: 睡眠への耐性(公式の State 耐性特性)がある敵は眠らず、通常どおり追って攻撃する。ほかの敵は眠る", () => {
    const w = sleepWorld({ enemies: { 4: [1.4, 90, MELEE], 5: [1.4, 270, MELEE] } });
    const battler = w.ctx.SgetBattlerForH(ev(w, 5));
    const traits = battler.traitObjects.bind(battler);                                          // この1体のバトラーだけに、睡眠(State 32)の耐性特性(code 14 = STATE_RESIST)を持たせる(公式の isStateResist / stateRate が読む)
    battler.traitObjects = () => traits().concat([{ traits: [{ code: 14, dataId: SLEEP, value: 1 }] }]);
    assert.equal(battler.isStateResist(SLEEP), true, "前提: 公式の判定で耐性あり");
    assert.equal(flute(w).ok, true, "一部が耐性でも、眠った敵がいれば発動は成功(従来どおり)");
    assert.deepEqual([asleep(w, 4), asleep(w, 5)], [true, false], "耐性のある敵は眠らない");
    assert.deepEqual(plain(w.ctx.ProjectRHermesReedFlute.getLastResult()).slept, [4]);
    const h0 = hp(w); let n = 0;
    while (asleep(w, 4) && n < 400) { w.frames(1); n++; }
    assert.equal(plain(FC(w).getEnemySleep(5)).sleeps, 0, "耐性のある敵のAIは眠りを経験していない");
    assert.ok(enemy(w, 5).attacks >= 1 || hp(w) < h0, "耐性のある敵は、眠っている敵の横で通常どおり攻撃する");
    // 全員が耐性: 葦笛は従来どおり(ステートは付かない)。AIは何も変わらない
    const w2 = sleepWorld({ enemies: { 5: [1.4, 270, MELEE] } });
    const b2 = w2.ctx.SgetBattlerForH(ev(w2, 5)), t2 = b2.traitObjects.bind(b2); b2.traitObjects = () => t2().concat([{ traits: [{ code: 14, dataId: SLEEP, value: 1 }] }]);
    flute(w2); assert.equal(asleep(w2, 5), false); frames(w2, 3); assert.equal(FC(w2).isEnemyAsleep(5), false);
    const h2 = hp(w2); assert.ok(until(w2, () => hp(w2) < h2, 200) >= 0, "眠らなかった敵は、通常どおり攻撃する");
});

test("強敵(FieldStrongEnemy)も同じ: 溜め中・攻撃中の攻撃は中断(ダメージなし)。眠っている間は選び直さず・動かない。起きたら攻撃を再開する", () => {
    const STRONG = { strong: "dev_strong", reach: 2, sightTiles: 12, cooldownFrames: 10, chase: false };
    const w = sleepWorld({ enemies: { 4: [1.6, 90, STRONG] } });
    assert.ok(until(w, () => SE(w).get(4), 60) >= 0, "対照: 強敵の攻撃が始まる"); assert.equal(plain(FC(w).getState().enemies.find(e => e.eventId === 4)).state !== undefined, true);
    const hp0 = hp(w);
    assert.equal(flute(w).ok, true); assert.equal(asleep(w, 4), true);
    assert.equal(SE(w).get(4), null, "溜め中の強敵の攻撃は、眠った瞬間に中断される");
    assert.equal(SE(w).getLog().filter(e => e.type === "end").pop().reason, "sleep");
    let n = 0, p0 = pos(w, 4); while (asleep(w, 4) && n < 400) { w.frames(1); n++; assert.equal(SE(w).get(4), null, "眠っている間は攻撃を選ばない"); assert.deepEqual(pos(w, 4), p0); }
    assert.equal(hp(w), hp0, "ダメージなし"); assert.ok(n >= 20);
    assert.ok(until(w, () => SE(w).get(4), 200) >= 0, "起きたら、強敵の攻撃を再開する");
});

test("既存の動きは変わらない: 睡眠のない敵・葦笛を使わない戦闘では、敵のAIは従来どおり(眠りの記録なし・追う・攻撃する)。葦笛の Cooldown 中の再使用は従来どおり失敗", () => {
    const w = sleepWorld({ enemies: { 4: [4, 90, MELEE] } });
    const d0 = dist(w, 4); frames(w, 30); assert.ok(dist(w, 4) < d0 - 0.3, "追う");
    assert.deepEqual(plain(FC(w).getEnemySleep(4)), { asleep: false, sleeps: 0, interrupted: 0 });
    assert.equal(FC(w).getEnemySleep(99), null, "付いていない敵は null");
    assert.ok(until(w, () => enemy(w, 4).attacks >= 1, 400) >= 0, "攻撃する");
    const w2 = sleepWorld({ enemies: { 4: [3, 90, MELEE] } });
    assert.equal(flute(w2).ok, true);
    const again = flute(w2); assert.deepEqual([again.ok, again.reason], [false, "cooldown"], "葦笛の Cooldown は従来どおり");
});

console.log(`\n${passed} tests passed`);
