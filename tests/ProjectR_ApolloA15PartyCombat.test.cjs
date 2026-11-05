"use strict";
// Phase Apollo-A15: 支援カード(エロスの矢・ヒュアキントス・月桂冠・竪琴)と、本物の ProjectR_PartyCombat の仲間との相互作用
//   (実エンジン: 実Map004 + 全plugin + 実Hendrix/DotMove。仲間は ProjectRPartyCombat.registerAlly / startSession で登録した本物。体は Map004 のダミーEvent に linkedActorId を付けたもの)
//   「製品の仲間は0人」なので、ここで確かめるのは Playtest 用の仲間まで(ストーリーの仲間・加入は作らない)。
//   敵 → 仲間のダメージは、A14 の本物の敵の攻撃(ProjectREnemyAttack + ProjectRTestEnemies)を Playtest 専用のつなぎで仲間の窓口(damageAlly)へ繋いで確かめる。
//   実機(描画・実キー・実Playtest)は tools/mz_cdp/apollo_a15_party_verify.cjs。
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const eros = require("./ProjectR_ApolloErosFixture.cjs");
const { assert, plain, cardWorld, handIds, frames, fireCard, center, placeEnemy, parkOthers, player, deckApi, barHp, lost } = fx;
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const H = "apollo_hyacinthus", L = "apollo_laurel_wreath", Y = "apollo_lyre_rhythm";
const P = w => w.ctx.ProjectRPartyCombat, ROSTER = w => w.ctx.ProjectRPartyRoster, ST = w => w.ctx.ProjectRApolloStatus;
const HY = w => w.ctx.ProjectRApolloHyacinthus, LA = w => w.ctx.ProjectRApolloLaurelWreath, LY = w => w.ctx.ProjectRApolloLyreRhythm;
const TE = w => w.ctx.ProjectRTestEnemies, EA = w => w.ctx.ProjectREnemyAttack;
const leader = w => w.ctx.$gameParty.leader();
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { player(w).locate(x, y); player(w)._realX = x; player(w)._realY = y; player(w).center(x, y); };
const member = (w, actorId) => plain(P(w).members()).find(m => m.actorId === actorId);
const hpOf = (w, actorId) => member(w, actorId).hp;
const override = (w, card, scope, key, value) => { const r = w.ctx.ProjectRCardBalance.setOverride(card, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };

// 仲間を最大2人、1回の startSession で登録する(addAlly は複数回呼ぶと先の仲間のHPが戻る)。
const party = (w, defs) => {
    for (const d of defs) assert.equal(P(w).registerAlly({ actorId: d.actorId, name: "仲間" + d.actorId, maxHp: d.maxHp ?? 400, normalAttack: { id: "n" + d.actorId, range: 1.5, cooldownSeconds: 1 } }).ok, true);
    const hp = {}; for (const d of defs) hp[d.actorId] = d.hp ?? d.maxHp ?? 400;
    const r = P(w).startSession(defs.map(d => d.actorId), { hp });
    assert.equal(r.ok, true, JSON.stringify(r));
    for (const d of defs) { w.ctx.$gameMap.event(d.eventId).linkedActorId = d.actorId; if (d.cx !== undefined) placeEnemy(w, d.eventId, d.cx, d.cy); }
};
const world = (card, level, opts = {}) => { const w = cardWorld(card, { level, ...opts }); return w; };
const use = (w, card) => fireCard(w, card);
const hyUse = w => { const r = use(w, H); assert.equal(r.ok, true, JSON.stringify(r)); frames(w, 2); return r; };

// ───────── 1) 名簿・生命周期 ─────────
test("名簿: 主人公 + 最大2人の仲間(本物のPartyCombat)。3人目は拒否。NPC・敵・召喚物のEventは仲間ではない。ダウンはincludeDownだけ", () => {
    const w = world(H, 2);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25 }, { actorId: 3, eventId: 6, cx: 16, cy: 25 }]);
    assert.deepEqual(plain(ROSTER(w).members()).map(m => m.key), ["player", "ally:2", "ally:3"]);
    assert.equal(ROSTER(w).keyForEvent(5), "ally:2"); assert.equal(ROSTER(w).keyForEvent(3), null, "ほかのEvent(敵・NPC・召喚物)は仲間ではない");
    assert.equal(P(w).registerAlly({ actorId: 4, name: "x", maxHp: 10, normalAttack: { id: "n", range: 1, cooldownSeconds: 1 } }).ok, true);
    assert.equal(plain(P(w).startSession([2, 3, 4])).reason, "tooManyAllies", "3人目は拒否");
    assert.equal(plain(ROSTER(w).members()).length, 3, "拒否しても今の出撃は変わらない");
    P(w).damageAlly(2, 1e6);
    assert.deepEqual(plain(ROSTER(w).members()).map(m => m.key), ["player", "ally:3"]);
    assert.deepEqual(plain(ROSTER(w).members({ includeDown: true })).map(m => m.key), ["player", "ally:2", "ally:3"]);
    assert.deepEqual(plain(P(w).healAlly(2, 100)), { ok: false, reason: "down" }, "ダウンは回復で復帰しない");
    assert.equal(member(w, 2).down, true); assert.equal(member(w, 2).hp, 0);
});

// ───────── 2) エロスの矢 ─────────
test("エロスの矢: 2人の仲間のうち傷ついた仲間だけ回復(1本50)。敵は回復しない(ダメージだけ)。ダウンした仲間は復帰しない・満タンは素通り", () => {
    const w = eros.erosWorld({ level: 1 });
    for (const id of [3, 4]) placeEnemy(w, id, 2 + id, 34);
    const c = center(w);
    // 仲間2(傷つき) と 仲間3(満タン) を同じ線上に置く。仲間3は満タンなので矢が素通りして奥の敵に当たる
    party(w, [{ actorId: 2, eventId: 5, cx: c.x + 4, cy: c.y, maxHp: 300, hp: 100 }, { actorId: 3, eventId: 6, cx: c.x + 6, cy: c.y, maxHp: 300, hp: 300 }]);
    placeEnemy(w, 4, c.x + 9, c.y);
    eros.aimDegree(w, 90, 3);
    const enemyBefore = eros.barHp(w, 4);
    eros.fire(w); eros.settle(w);
    assert.equal(hpOf(w, 2), 300, "傷ついた仲間は回復(上限まで)");
    assert.equal(hpOf(w, 3), 300, "満タンの仲間は変わらない");
    const result = plain(eros.api(w).getLastResult());
    assert.ok(result.hits.some(h => h.kind === "ally" && h.healed === 50));
    assert.ok(result.hits.every(h => h.kind !== "ally" || h.actorId !== 3 || h.healed === 0), "満タンの仲間への当たりは回復0");
    assert.ok(eros.barHp(w, 4) <= enemyBefore, "敵のHPは増えない(回復しない)");
    assert.ok(eros.lost(w, 5) === 0 && eros.lost(w, 6) === 0, "仲間のEventにダメージは入らない");
    // ダウンした仲間: 矢は回復も復帰もしない
    const d = eros.erosWorld({ level: 1 });
    for (const id of [3, 4]) placeEnemy(d, id, 2 + id, 34);
    const dc = center(d);
    party(d, [{ actorId: 2, eventId: 5, cx: dc.x + 4, cy: dc.y, maxHp: 300, hp: 100 }]);
    P(d).damageAlly(2, 1000);
    assert.equal(member(d, 2).down, true);
    eros.aimDegree(d, 90, 3);
    eros.fire(d); eros.settle(d);
    assert.deepEqual([member(d, 2).down, member(d, 2).hp], [true, 0], "ダウンした仲間は矢で復帰しない");
    assert.ok(plain(eros.api(d).getLastResult()).hits.every(h => h.kind !== "ally"), "ダウンした仲間は当たり対象ではない");
});

test("エロスの矢: 仲間を外した/戦闘から外れた仲間(endSession)は矢の対象ではない。主人公は既定で対象外", () => {
    const w = eros.erosWorld({ level: 1 });
    for (const id of [3, 4]) placeEnemy(w, id, 2 + id, 34);
    const c = center(w);
    party(w, [{ actorId: 2, eventId: 5, cx: c.x + 4, cy: c.y, maxHp: 300, hp: 100 }]);
    P(w).endSession();
    eros.aimDegree(w, 90, 3);
    const hp = leader(w).hp;
    eros.fire(w); eros.settle(w);
    assert.ok(plain(eros.api(w).getLastResult()).hits.every(h => h.kind !== "ally"), "出撃していないEventは対象外");
    assert.equal(leader(w).hp, hp);
});

// ───────── 3) ヒュアキントス ─────────
test("ヒュアキントス Lv2: 2人の仲間に受付期間。致死・非致死・HP満タンの被弾は、ダウン判定の前に90%軽減される", () => {
    const w = world(H, 2);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 20, cy: 25, maxHp: 400, hp: 50 }, { actorId: 3, eventId: 6, cx: 22, cy: 27, maxHp: 400, hp: 400 }]);
    hyUse(w);
    assert.deepEqual(plain(HY(w).getWindows()).map(x => x.key).sort(), ["ally:2", "ally:3", "player"]);
    assert.ok(ST(w).has("ally:2", "hyacinthus_guard") || ST(w).list("ally:2").length === 1, JSON.stringify(plain(ST(w).list("ally:2")).map(x => x.id)));
    frames(w, 5);
    const lethal = plain(P(w).damageAlly(2, 100)); // HP50: 100 → 10(軽減後) → 生き残る
    assert.deepEqual([lethal.ok, lethal.down, lethal.hp], [true, false, 40]);
    const full = plain(P(w).damageAlly(3, 100)); // 満タン: 100 → 10
    assert.deepEqual([full.ok, full.down, full.hp], [true, false, 390]);
    // 軽減後でも致死ならダウン(軽減は致死を無くすのではなく、先に掛かる)
    const dead = plain(P(w).damageAlly(2, 500)); // 500 → 50 > 40
    assert.deepEqual([dead.ok, dead.down, dead.hp], [true, true, 0]);
    assert.deepEqual(plain(P(w).damageAlly(2, 10)), { ok: false, reason: "alreadyDown" }, "ダウン後は被弾もできない(軽減で復帰もしない)");
    assert.deepEqual(plain(P(w).damageAlly(3, 0)), { ok: false, reason: "invalidDamage" }, "ダメージ0は無効");
});

test("ヒュアキントス Lv2: 軽減で0になった小さな被弾でも「被弾」として花が咲く(HPが減らなくても)。受付期間のあとは軽減されない", () => {
    const w = world(H, 2);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 20, cy: 25, maxHp: 400, hp: 400 }]);
    hyUse(w); frames(w, 5);
    const r = plain(P(w).damageAlly(2, 4)); // round(0.4) = 0 → HPは減らない
    assert.deepEqual([r.ok, r.down, r.hp], [true, false, 400]);
    frames(w, 3);
    assert.equal(plain(HY(w).getBlooms()).length, 1, "完全に軽減された被弾でも花が咲く");
    assert.equal(plain(HY(w).getBlooms())[0].owner, "ally:2");
    secs(w, 3.5);
    assert.equal(ST(w).has("ally:2", "hyacinthus_guard"), false, "受付期間(3秒)が終わると軽減は外れる");
    assert.equal(hpOf(w, 2), 400); P(w).damageAlly(2, 100); assert.equal(hpOf(w, 2), 300);
});

test("ヒュアキントス Lv2: 花は仲間を回復する(ダウンした仲間は復帰しない)。花の寿命が尽きると花も状態も残らない", () => {
    const w = world(H, 2);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 13, cy: 25, maxHp: 400, hp: 100 }, { actorId: 3, eventId: 6, cx: 14, cy: 25, maxHp: 400, hp: 100 }]);
    hyUse(w); frames(w, 5);
    P(w).damageAlly(3, 1e6); // 仲間3は花の中でダウン(軽減後でも致死)
    // 仲間3が先に致死級で倒れたので、花は咲かない場合に備えて主人公も被弾させる
    assert.equal(member(w, 3).down, true);
    leader(w).setHp(leader(w).mhp); w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdatePlayerHp", { target: "player", value: "-50" });
    frames(w, 3);
    assert.ok(plain(HY(w).getBlooms()).length >= 1, "花が咲いている");
    const before = hpOf(w, 2);
    secs(w, 1.5);
    assert.ok(hpOf(w, 2) - before >= 50, "傷ついた仲間は回復する " + (hpOf(w, 2) - before));
    assert.deepEqual([member(w, 3).down, member(w, 3).hp], [true, 0], "花はダウンした仲間を復帰させない");
    secs(w, 10);
    assert.deepEqual([plain(HY(w).getBlooms()).length, plain(HY(w).getWindows()).length, plain(ST(w).list()).filter(x => /^ally:/.test(x.target)).length], [0, 0, 0], "花・窓・状態がすべて消える");
    assert.equal(HY(w).getTempObjectCount().flowers, 0);
});

test("ヒュアキントス Lv2: 仲間が戦闘から外れる(endSession)と受付期間・軽減が即、片付く。同じ仲間を出撃し直しても古い軽減は残らない", () => {
    const w = world(H, 2);
    parkOthers(w, [5]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 20, cy: 25, maxHp: 400, hp: 400 }]);
    hyUse(w);
    assert.equal(ST(w).has("ally:2", "hyacinthus_guard"), true);
    P(w).endSession();
    assert.equal(ST(w).has("ally:2", "hyacinthus_guard"), false, "出撃から外れた瞬間に台帳から消える(次のframeを待たない)");
    frames(w, 2);
    assert.deepEqual(plain(HY(w).getWindows()).map(x => x.key), ["player"]);
    party(w, [{ actorId: 2, eventId: 5, cx: 20, cy: 25, maxHp: 400, hp: 400 }]);
    P(w).damageAlly(2, 100);
    assert.equal(hpOf(w, 2), 300, "出撃し直した仲間に古い軽減は掛からない");
});

// ───────── 4) 月桂冠 ─────────
test("月桂冠 Lv1: 根の中の2人の仲間が回復し、被ダメージ x0.7(致死・非致死)。根の外の仲間は回復も軽減もない。ダウンした仲間は復帰しない", () => {
    const w = world(L, 1);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    override(w, L, "constant", "growSeconds", 0);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 60 }, { actorId: 3, eventId: 6, cx: 12 + 9, cy: 25, maxHp: 1000, hp: 500 }]);
    use(w, L); frames(w, 3);
    const lethalLike = plain(P(w).damageAlly(2, 80)); // 80 x 0.7 = 56 < 60 → 生き残る(軽減が無ければダウン)
    assert.deepEqual([lethalLike.ok, lethalLike.down, lethalLike.hp], [true, false, 4]);
    const out = plain(P(w).damageAlly(3, 100)); // 根の外: 軽減なし
    assert.deepEqual([out.hp, out.down], [400, false]);
    const dead = plain(P(w).damageAlly(2, 10)); // 10 x 0.7 = 7 > 4 → ダウン
    assert.deepEqual([dead.ok, dead.down, dead.hp], [true, true, 0]);
    const before3 = hpOf(w, 3);
    secs(w, 2);
    assert.equal(hpOf(w, 3), before3, "根の外の仲間は回復しない");
    assert.deepEqual([member(w, 2).down, member(w, 2).hp], [true, 0], "根の中でもダウンした仲間は回復で復帰しない");
});

test("月桂冠 Lv1: 根の外へ出た瞬間に軽減が外れる。根が消える/出撃から外れる/ダウンしたときも状態が残らない", () => {
    const w = world(L, 1);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    override(w, L, "constant", "growSeconds", 0);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 1000 }, { actorId: 3, eventId: 6, cx: 15, cy: 25, maxHp: 1000, hp: 1000 }]);
    use(w, L); frames(w, 3);
    assert.equal(ST(w).has("ally:2", "laurel_roots"), true); assert.equal(ST(w).has("ally:3", "laurel_roots"), true);
    placeEnemy(w, 5, 12 + 9, 25); frames(w, 1);
    assert.equal(ST(w).has("ally:2", "laurel_roots"), false, "根を出た次のframeで外れる");
    assert.equal(plain(P(w).damageAlly(2, 100)).hp, 900);
    // 出撃から外れた(endSession) → 台帳から即消える
    P(w).endSession();
    assert.equal(ST(w).has("ally:3", "laurel_roots"), false, "出撃から外れたら即、消える");
    party(w, [{ actorId: 3, eventId: 6, cx: 40, cy: 25, maxHp: 1000, hp: 1000 }]);
    assert.equal(plain(P(w).damageAlly(3, 100)).hp, 900, "出撃し直した仲間に古い軽減は掛からない");
    // 根が消える(7秒) → 仲間の軽減は根と同時に消える
    const w2 = world(L, 1);
    parkOthers(w2, [5]); put(w2, 12, 25);
    override(w2, L, "constant", "growSeconds", 0);
    party(w2, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 1000 }]);
    use(w2, L); frames(w2, 3);
    assert.equal(plain(LA(w2).getPatches()).length, 1);
    for (let i = 0; i < 600 && plain(LA(w2).getPatches()).length; i++) frames(w2, 1);
    frames(w2, 1);
    assert.equal(plain(LA(w2).getPatches()).length, 0);
    assert.equal(ST(w2).has("ally:2", "laurel_roots"), false, "根が消えたら仲間の軽減もすぐ消える");
    assert.equal(ST(w2).has("player", "laurel_roots"), false, "主人公の軽減もすぐ消える");
    assert.equal(plain(P(w2).damageAlly(2, 100)).hp, 900);
    // 根の中でダウンした仲間の状態は残らない
    const w3 = world(L, 1);
    parkOthers(w3, [5]); put(w3, 12, 25);
    override(w3, L, "constant", "growSeconds", 0);
    party(w3, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 100, hp: 10 }]);
    use(w3, L); frames(w3, 3);
    P(w3).damageAlly(2, 500); frames(w3, 2);
    assert.equal(member(w3, 2).down, true);
    assert.equal(ST(w3).has("ally:2", "laurel_roots"), false, "ダウンした仲間に軽減の状態は残らない");
});

test("月桂冠 Lv2: 移動速度・スリップは主人公と敵だけ(仲間の移動はPartyCombatの担当で、速度の窓口が無い)。仲間のEventが<enemy>でもスリップを受けない", () => {
    const w = world(L, 2);
    parkOthers(w, [5]); put(w, 12, 25);
    override(w, L, "constant", "growSeconds", 0);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 1000 }]);
    const body0 = barHp(w, 5);
    use(w, L); secs(w, 2);
    assert.ok(w.ctx.ProjectRCardModifiers.moveSpeedFactor() > 1, "主人公は速くなる");
    assert.equal(lost(w, 5), 0, "仲間の体(<enemy>のダミー)にスリップは入らない");
    assert.equal(ST(w).has("event:5", "laurel_thorns"), false);
    assert.equal(body0, barHp(w, 5));
});

// ───────── 5) 竪琴 ─────────
const KIND = "heal";
const LNOTES = w => plain(LY(w).getNotes());
const SESSION = w => plain(LY(w).getSession());
const attackKey = w => w.ctx.$gameTemp.reserveCommonEvent(1);
const pressAt = (w, index) => {
    const n = LNOTES(w)[index];
    for (let i = 0; i < 2000 && SESSION(w).frame < n.arrive; i++) frames(w, 1);
    assert.equal(SESSION(w).frame, n.arrive);
    const before = plain(LY(w).getResults()).length;
    attackKey(w);
    return plain(LY(w).getResults()).slice(before)[0];
};
const kindIndex = (w, kind, nth = 0) => LNOTES(w).filter(n => n.kind === kind)[nth].index;

test("竪琴 Lv1: ヒールの音符は半径5の仲間(2人)を回復。半径の外・ダウンした仲間は回復しない(復帰もしない)。火力・速度は主人公のみ", () => {
    const w = world(Y, 1);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 500 }, { actorId: 3, eventId: 6, cx: 12 + 9, cy: 25, maxHp: 1000, hp: 500 }]);
    use(w, Y);
    const r = pressAt(w, kindIndex(w, KIND, 0));
    assert.ok(r.members.includes("ally:2") && r.members.includes("player") && !r.members.includes("ally:3"), JSON.stringify(r.members));
    assert.ok(hpOf(w, 2) - 500 >= 100, "半径内の仲間は回復 " + (hpOf(w, 2) - 500));
    assert.equal(hpOf(w, 3), 500, "半径の外の仲間は回復しない");
    // ダウンした仲間
    P(w).damageAlly(2, 1e6);
    const r2 = pressAt(w, kindIndex(w, KIND, 1));
    assert.ok(!r2.members.includes("ally:2"), "ダウンした仲間は対象外 " + JSON.stringify(r2.members));
    // 攻撃(火力)の音符は主人公のみ(3回目)
    const a = pressAt(w, kindIndex(w, "attack", 2));
    assert.equal(a.kind, "attack"); assert.equal(ST(w).has("ally:3", "lyre_attack"), false); assert.equal(ST(w).has("player", "lyre_attack"), true);
    secs(w, 3.5);
    assert.deepEqual([member(w, 2).down, member(w, 2).hp], [true, 0], "リジェネ・即時回復はダウンを復帰させない");
});

test("竪琴 Lv2: 3回とも同じ音符(ヒール)なら3回目は画面全体: 半径の外の仲間も回復。クレンズは主人公の異常状態(仲間は状態を持たない)", () => {
    const w = world(Y, 2);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 2000, hp: 500 }, { actorId: 3, eventId: 6, cx: 12 + 8, cy: 25, maxHp: 2000, hp: 500 }]);
    leader(w).addState(32);
    use(w, Y);
    pressAt(w, kindIndex(w, KIND, 0)); pressAt(w, kindIndex(w, KIND, 1));
    assert.ok(hpOf(w, 3) < 700, "1・2回目は半径5(遠い仲間にはほぼ届かない) " + hpOf(w, 3));
    const third = pressAt(w, kindIndex(w, KIND, 2));
    assert.equal(third.wide, true); assert.ok(third.members.includes("ally:3"), "3回目は画面全体 " + JSON.stringify(third.members));
    assert.ok(hpOf(w, 3) >= 500 + 100, "遠い仲間も3回目で回復");
    assert.ok(third.cleansed >= 1); assert.equal(leader(w).isStateAffected(32), false);
    assert.equal(plain(P(w).members()).every(m => !("states" in m)), true, "PartyCombatの仲間は状態を持たない(クレンズする対象が無い = 製品の仲間で状態を持たせるまで未確認)");
});

test("竪琴 Lv3: 選べる回数は合計5回(6回目は押せない)。5回ともヒールなら5回目が画面全体で、仲間は毎回回復する。出撃から外れた仲間はリジェネが止まる", () => {
    const w = world(Y, 3);
    parkOthers(w, [5, 6]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 5000, hp: 500 }, { actorId: 3, eventId: 6, cx: 12 + 8, cy: 25, maxHp: 5000, hp: 500 }]);
    use(w, Y);
    assert.equal(SESSION(w).level, 3);
    const results = [];
    for (let i = 0; i < 5; i++) results.push(pressAt(w, kindIndex(w, KIND, i)));
    assert.deepEqual(results.map(r => r.wide), [false, false, false, false, true], "5回すべて同じ音符のときだけ画面全体");
    assert.ok(results[4].members.includes("ally:3"));
    assert.ok(hpOf(w, 2) >= 500 + 100 * 5, "近い仲間は5回とも回復 " + hpOf(w, 2));
    assert.equal(SESSION(w).presses, 5);
    const six = plain(LY(w).press("attack"));
    assert.equal(six.ok, false, "6回目は押せない");
    // 出撃から外れた仲間は、リジェネが残っていても回復しない
    P(w).endSession();
    frames(w, 3);
    assert.equal(plain(LY(w).getBuffs()).regens.filter(r => r.key !== "player").length, 0, "出撃から外れた仲間のリジェネは捨てる");
});

// ───────── 6) 重なり ─────────
test("重なり: ヒュアキントス(x0.1) x 月桂冠(x0.7) は仮の積 x0.07。月桂冠を出ると x0.1、受付が終わると x0.7、両方終わると台帳が空", () => {
    const w = world(L, 2, { owned: [H], order: [L, H, L, H, L, ...fx.OTHER] });
    parkOthers(w, [5]); put(w, 12, 25);
    override(w, L, "constant", "growSeconds", 0);
    deckApi(w).setCardLevel(H, 2);
    party(w, [{ actorId: 2, eventId: 5, cx: 14, cy: 25, maxHp: 1000, hp: 1000 }]);
    use(w, L); frames(w, 3);
    for (let i = 0; i < 700 && !handIds(w).includes(H); i++) frames(w, 1);
    assert.ok(handIds(w).includes(H), "ヒュアキントスが手札に来た");
    hyUse(w);
    assert.ok(Math.abs(ST(w).factorOf("ally:2").damageTaken - 0.07) < 1e-6, "積 " + ST(w).factorOf("ally:2").damageTaken);
    assert.equal(plain(P(w).damageAlly(2, 100)).hp, 993);
    placeEnemy(w, 5, 12 + 9, 25); frames(w, 2);
    assert.ok(Math.abs(ST(w).factorOf("ally:2").damageTaken - 0.1) < 1e-6, "根を出ると月桂冠だけ外れる");
    assert.equal(plain(P(w).damageAlly(2, 100)).hp, 983);
    secs(w, 3.5);
    assert.equal(ST(w).has("ally:2", "hyacinthus_guard"), false);
    { const before = hpOf(w, 2); assert.equal(before - plain(P(w).damageAlly(2, 100)).hp, 100, "受付が終わると軽減なし(回復の影響を受けない同じ呼び出しで測る)"); }
    P(w).endSession();
    assert.equal(plain(ST(w).list()).filter(x => /^ally:/.test(x.target)).length, 0, "出撃から外れたら仲間の状態は全部消える");
});

// ───────── 7) 敵の本物の攻撃(A14)で仲間に当てる ─────────
const attachEnemy = (w, id, kind, dx, dy) => { const c = center(w); placeEnemy(w, id, c.x + dx, c.y + dy); assert.equal(plain(TE(w).attach(id, kind, kind === "ranged" ? { windupFrames: 20 } : { windupFrames: 15 })).ok, true); };
const runUntil = (w, cond, max = 400) => { for (let i = 0; i < max && !cond(); i++) frames(w, 1); return cond(); };

test("敵の遠距離攻撃(A14の本物の弾)が仲間に当たる: 弾は仲間で止まり主人公には届かない。固定30。ヒュアキントスで3(x0.1)。致死は軽減後に判定", () => {
    const w = world(H, 2);
    parkOthers(w, [3, 5]); put(w, 12, 25);
    party(w, [{ actorId: 2, eventId: 5, cx: 16, cy: 25, maxHp: 100, hp: 100 }]);
    attachEnemy(w, 3, "ranged", 8, 0);
    const hp0 = leader(w).hp, announced = [];
    EA(w).onAnnounce(r => announced.push(plain(r)));
    const r = plain(TE(w).attackNow(3, { target: "ally:2" }));
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(announced.length, 1, "本物の予兆が出る");
    assert.ok(Math.abs(announced[0].degree - 270) < 2, "向きは仲間(左) " + announced[0].degree);
    assert.ok(runUntil(w, () => plain(TE(w).getAllyHits()).length > 0), "弾が仲間に当たる");
    const hit = plain(TE(w).getAllyHits())[0];
    assert.deepEqual([hit.actorId, hit.amount, hit.result.ok, hit.result.hp], [2, 30, true, 70]);
    assert.equal(leader(w).hp, hp0, "主人公は被弾しない(弾は仲間で止まる)");
    assert.equal(EA(w).list().length, 0);
    // ヒュアキントス中: 30 → 3
    TE(w).clearAllyHits();
    placeEnemy(w, 3, center(w).x + 6, center(w).y); // 受付期間(3秒)のうちに届く近さ
    hyUse(w);
    assert.equal(plain(TE(w).attackNow(3, { target: "ally:2" })).ok, true);
    runUntil(w, () => plain(TE(w).getAllyHits()).length > 0);
    const hit2 = plain(TE(w).getAllyHits())[0];
    assert.deepEqual([hit2.amount, hit2.result.hp], [30, 67], "軽減後の3だけ減る " + JSON.stringify(hit2));
    // 致死の被弾(HP20に30): 無軽減ならダウン / ヒュアキントスなら生き残る
    const a = world(H, 1);
    parkOthers(a, [3, 5]); put(a, 12, 25);
    party(a, [{ actorId: 2, eventId: 5, cx: 16, cy: 25, maxHp: 100, hp: 20 }]);
    attachEnemy(a, 3, "ranged", 8, 0);
    const downs = []; P(a).onAllyDown(e => downs.push(e.actorId));
    TE(a).attackNow(3, { target: "ally:2" });
    runUntil(a, () => plain(TE(a).getAllyHits()).length > 0);
    assert.deepEqual([member(a, 2).down, downs], [true, [2]], "軽減が無いHP20への30はダウン");
});

test("敵の近接攻撃(A14の本物の判定)が仲間に当たる。月桂冠の根の中では x0.7(致死でも軽減後に判定)。ダウン後は当たらない", () => {
    const w = world(L, 1);
    parkOthers(w, [3, 5]); put(w, 12, 25);
    override(w, L, "constant", "growSeconds", 0);
    const c = center(w);
    // 敵3の左隣に仲間、主人公はさらに左(近接の向きは主人公の方向で決まるので同じ側に置く)
    party(w, [{ actorId: 2, eventId: 5, cx: c.x + 4, cy: c.y, maxHp: 100, hp: 25 }]);
    attachEnemy(w, 3, "melee", 5, 0);
    use(w, L); frames(w, 3);
    assert.equal(ST(w).has("ally:2", "laurel_roots"), true);
    assert.equal(plain(TE(w).attackNow(3)).ok, true);
    assert.ok(runUntil(w, () => plain(TE(w).getAllyHits()).length > 0, 200), "近接の判定が仲間に当たる");
    const hit = plain(TE(w).getAllyHits())[0];
    assert.equal(hit.kind, "melee");
    assert.deepEqual([hit.result.ok, hit.result.down, hit.result.hp], [true, false, 4], "30 x 0.7 = 21 < 25 → 生き残る(軽減が無ければ25-30でダウン)");
    // ダウンした仲間には当たらない(もう一度)
    P(w).damageAlly(2, 1000);
    TE(w).clearAllyHits();
    frames(w, 200);
    TE(w).attackNow(3);
    frames(w, 60);
    assert.equal(plain(TE(w).getAllyHits()).length, 0, "ダウンした仲間は被弾の対象ではない");
});

// ───────── 8) 仲間の体(<enemy>のダミー)を敵扱いしない ─────────
test("仲間の体のEventが<enemy>でも、月桂冠のスリップ・竪琴の病の対象にならない。NPC・敵はこれまでどおり", () => {
    const w = world(Y, 1);
    parkOthers(w, [3, 5]); put(w, 12, 25);
    const c = center(w);
    party(w, [{ actorId: 2, eventId: 5, cx: c.x + 2, cy: c.y, maxHp: 400, hp: 400 }]);
    placeEnemy(w, 3, c.x + 3, c.y + 1);
    use(w, Y);
    const r = pressAt(w, kindIndex(w, "plague", 0));
    assert.deepEqual(r.enemies, [3], "病の対象は敵だけ " + JSON.stringify(r.enemies));
    assert.equal(ST(w).has("event:5", "lyre_plague"), false);
});
