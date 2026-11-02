"use strict";
// Phase Apollo-A14: 敵の攻撃の予約と予兆(ProjectREnemyAttack)、神託 Lv1 の予測、月桂冠 Lv3 の弾防ぎ(実エンジン: 実Map004 + 全plugin + 実Hendrix/DotMove)。
//   予兆は「予約された本物の攻撃」の記録そのもの(溜め → 実行を同じ記録が行う)。中断・取消・敵の消滅では実行されず、予兆も同時に消える。
//   実機(描画・実キー・実Playtest)は tools/mz_cdp/apollo_a14_enemy_attack_verify.cjs。
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, frames, fireCard, aimDegree, center, placeEnemy, parkOthers, player, deckApi, handIds } = fx;
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const EA = w => w.ctx.ProjectREnemyAttack, TE = w => w.ctx.ProjectRTestEnemies, ORACLE = w => w.ctx.ProjectRApolloOracle, LAUREL = w => w.ctx.ProjectRApolloLaurelWreath;
const leader = w => w.ctx.$gameParty.leader();
const boltEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRTestEnemyBolt/.test(e.event().note || ""));
const hitboxes = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRTestEnemyMelee/.test(e.event().note || ""));
const world = (card = "apollo_oracle", level = 1) => {
    const w = cardWorld(card, { level, random: 0.9 });
    parkOthers(w, []);
    return w;
};
const setHp = (w, id, hp) => { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = bar.targetHp = hp; bar.refresh(); };
const place = (w, id, dx, dy) => { const c = center(w); placeEnemy(w, id, c.x + dx, c.y + dy); };

test("登録とAPI: 予約・取消・中断・通知が使える。Playtestの敵の入口がある。不正な予約は理由つきで拒否(予兆を作らない)", () => {
    const w = world();
    for (const k of ["schedule", "cancel", "interrupt", "get", "list", "getOutcome", "onAnnounce", "onCancel", "onFire", "clear"]) assert.equal(typeof EA(w)[k], "function", k);
    for (const k of ["attach", "attackNow", "detach", "interrupt", "setAuto", "registerBolt"]) assert.equal(typeof TE(w)[k], "function", k);
    place(w, 3, 8, 0);
    assert.equal(EA(w).schedule({ eventId: 3, kind: "magic" }).reason, "invalidKind");
    assert.equal(EA(w).schedule({ eventId: 999, kind: "melee", notetag: "<x>" }).reason, "sourceGone");
    assert.equal(EA(w).schedule({ eventId: 3, kind: "ranged", windupFrames: 0, template: "x" }).reason, "invalidWindup");
    assert.equal(EA(w).schedule({ eventId: 3, kind: "ranged", windupFrames: 30, template: "no such" }).reason, "templateMissing");
    assert.equal(EA(w).schedule({ eventId: 3, kind: "melee", windupFrames: 30, notetag: "plain" }).reason, "invalidNotetag");
    assert.equal(EA(w).list().length, 0, "拒否された予約は予兆にならない");
    assert.equal(TE(w).attackNow(3).reason, "notAttached");
});

test("遠距離: 予約で予兆(向き・射程・溜め)が出る → 溜めが終わると、本物のHendrixの弾が予告どおりの向きに出る → 弾がプレイヤーに届くと1回だけダメージ(同じ弾は消える)", () => {
    const w = world();
    place(w, 3, 8, 0);
    assert.equal(plain(TE(w).attach(3, "ranged")).ok, true);
    const announced = [], fired = [];
    EA(w).onAnnounce(r => announced.push(plain(r))); EA(w).onFire(r => fired.push(plain(r)));
    const hp0 = leader(w).hp;
    const r = plain(TE(w).attackNow(3));
    assert.equal(r.ok, true);
    assert.equal(announced.length, 1);
    const t = plain(EA(w).get(r.id));
    assert.deepEqual([t.kind, t.state, t.framesLeft, t.windup], ["ranged", "pending", 60, 60]);
    assert.ok(Math.abs(t.degree - 270) < 1, "プレイヤーは左(270度): " + t.degree);
    assert.ok(Math.abs(t.origin.x - (center(w).x + 8)) < 0.6);
    assert.equal(boltEvents(w).length, 0, "溜め中は弾は無い(予兆だけ)");
    frames(w, 59);
    assert.equal(EA(w).get(r.id).framesLeft, 1); assert.equal(boltEvents(w).length, 0);
    frames(w, 1);
    assert.equal(EA(w).get(r.id), null, "実行されたので予約は消える");
    const outcome = plain(EA(w).getOutcome(r.id));
    assert.equal(outcome.state, "fired"); assert.ok(Number.isInteger(outcome.projectileId));
    assert.equal(fired.length, 1); assert.equal(fired[0].projectileId, outcome.projectileId);
    const bolt = w.ctx.$gameMap.event(outcome.projectileId);
    assert.ok(bolt && /projectRTestEnemyBolt/.test(bolt.event().note));
    assert.ok(bolt._inheritedEnemyName, "Hendrixが敵の弾として印を付ける(テストは付けない)");
    assert.ok(Math.abs(bolt._rotation - t.degree) < 1.5, `弾の向き = 予告の向き: ${bolt._rotation} vs ${t.degree}`);
    for (let i = 0; i < 400 && w.ctx.$gameMap.event(outcome.projectileId) && !w.ctx.$gameMap.event(outcome.projectileId)._erased; i++) frames(w, 1);
    assert.ok(leader(w).hp < hp0, "弾が届いてダメージ: " + (hp0 - leader(w).hp));
    const lost = hp0 - leader(w).hp;
    frames(w, 30);
    assert.equal(hp0 - leader(w).hp, lost, "同じ攻撃のダメージは1回だけ");
    assert.equal(boltEvents(w).length, 0, "弾は残らない");
    assert.equal(EA(w).getOutcome(r.id).damaged, true);
});

test("近接: 予兆は「判定が出るタイル」(プレイヤーの方向の隣の1マス)と溜め。溜めが終わると、そのタイルに本物の判定が出て、プレイヤーがそこにいれば1回だけダメージ。溜めの間に動いて避ければ当たらない", () => {
    const w = world();
    const c = center(w);
    place(w, 4, 1, 0);
    assert.equal(plain(TE(w).attach(4, "melee")).ok, true);
    const hp0 = leader(w).hp;
    const r = plain(TE(w).attackNow(4));
    const t = plain(EA(w).get(r.id));
    assert.equal(t.kind, "melee");
    assert.ok(Math.abs(t.area.x - (Math.floor(c.x) + 0.5)) < 0.01 && Math.abs(t.area.y - c.y) < 0.6 && t.area.width === 1 && t.area.height === 1, JSON.stringify(t.area));
    assert.equal(hitboxes(w).length, 0, "溜め中は判定は無い");
    frames(w, 40 + 3);
    assert.equal(EA(w).getOutcome(r.id).state, "fired");
    const lost = hp0 - leader(w).hp;
    assert.ok(lost > 0, "判定のタイルにいたのでダメージ: " + lost);
    frames(w, 30);
    assert.equal(hp0 - leader(w).hp, lost, "1回だけ");
    assert.equal(hitboxes(w).length, 0, "判定のEventは残らない");
    // 避ける
    const hp1 = leader(w).hp;
    const r2 = plain(TE(w).attackNow(4));
    const area = plain(EA(w).get(r2.id)).area;
    frames(w, 10);
    player(w).locate(Math.floor(c.x) - 3, Math.floor(c.y)); player(w)._realX = Math.floor(c.x) - 3; player(w)._realY = Math.floor(c.y);
    frames(w, 40);
    assert.equal(EA(w).getOutcome(r2.id).state, "fired");
    assert.equal(leader(w).hp, hp1, "予告のタイルから離れていたので当たらない: " + JSON.stringify(area));
});

test("取消: 溜めの途中の中断(API・敵が攻撃を受ける・敵が倒れる・敵が消える)では、攻撃は実行されず、弾も判定も出ず、予兆も同時に消える。ダメージなし", () => {
    for (const [name, cut, reason] of [
        ["API", (w, id) => EA(w).interrupt(id, "stun"), "stun"],
        ["攻撃を受けた", (w, id) => setHp(w, id, 99000), "interrupted"],
        ["倒れた", (w, id) => setHp(w, id, 0), "sourceDown"],
        ["消えた", (w, id) => w.ctx.$gameMap.event(id).erase(), "sourceGone"]
    ]) {
        const w = world();
        place(w, 3, 8, 0);
        TE(w).attach(3, "ranged");
        const cancels = [];
        EA(w).onCancel(r => cancels.push(plain(r)));
        const hp0 = leader(w).hp;
        const r = plain(TE(w).attackNow(3));
        frames(w, 20);
        assert.ok(EA(w).get(r.id), name + ": 溜め中");
        cut(w, 3);
        frames(w, 2);
        assert.equal(EA(w).get(r.id), null, name + ": 予約が消える");
        assert.equal(plain(EA(w).getOutcome(r.id)).state, "cancelled"); assert.equal(plain(EA(w).getOutcome(r.id)).reason, reason, name);
        assert.equal(cancels.length, 1);
        frames(w, 80);
        assert.equal(boltEvents(w).length, 0, name + ": 弾は出ない");
        assert.equal(leader(w).hp, hp0, name + ": ダメージなし");
        assert.equal(EA(w).list().length, 0);
    }
});

test("同じ敵の二重予約は拒否(溜め中に別の攻撃を重ねない)。マップ設定・ロードでは予約が全部消え、予兆の状態はセーブされない", () => {
    const w = world();
    place(w, 3, 8, 0); place(w, 4, 1, 0);
    TE(w).attach(3, "ranged"); TE(w).attach(4, "melee");
    assert.equal(plain(TE(w).attackNow(3)).ok, true);
    assert.equal(plain(TE(w).attackNow(3)).reason, "alreadyScheduled");
    assert.equal(plain(TE(w).attackNow(4)).ok, true);
    assert.equal(EA(w).list().length, 2);
    const text = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    assert.ok(!/ProjectREnemyAttack|framesLeft|windup/.test(text), "予兆はセーブされない");
    w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(text));
    assert.equal(EA(w).list().length, 0, "ロードで全部消える");
    assert.equal(plain(EA(w).getOutcome(1)).reason, "load");
});

// ---------- 神託 Lv1 ----------
const use = (w, card) => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(card)))); };
const tele = w => plain(ORACLE(w).getTelegraphs());

test("神託 Lv1: 使ったあとに予約された本物の遠距離攻撃を予告する(向き・溜め)。予約を取り消すと予告も消え、予測は1回で終わる。実行されると同じ線が弾へ引き継がれ、弾が消えると外れる", () => {
    const w = world();
    place(w, 3, 8, 0);
    TE(w).attach(3, "ranged");
    assert.equal(use(w, "apollo_oracle").ok, true);
    assert.deepEqual(tele(w), [], "攻撃が無ければ予告を作らない(捏造しない)");
    const a = plain(TE(w).attackNow(3));
    frames(w, 2);
    let t = tele(w);
    assert.equal(t.length, 1); assert.equal(t[0].source, "attack"); assert.equal(t[0].kind, "ranged"); assert.equal(t[0].attackId, a.id);
    assert.ok(Math.abs(t[0].degree - 270) < 1); assert.ok(t[0].framesLeft <= 58 && t[0].framesLeft > 50);
    frames(w, 20);
    assert.ok(tele(w)[0].framesLeft < t[0].framesLeft, "溜めが進む");
    // 取消 → 予告も消える
    EA(w).interrupt(3, "stun"); frames(w, 2);
    assert.deepEqual(tele(w), [], "取消で予告が消える");
    assert.ok(plain(ORACLE(w).getLog()).some(e => e.type === "telegraphEnd" && e.reason === "attackCancelled"));
    assert.equal(plain(ORACLE(w).getLastResult()).predicted, 1, "予測は1回");
    place(w, 3, 8, 0);
    assert.equal(plain(TE(w).attackNow(3)).ok, true);
    frames(w, 3);
    assert.deepEqual(tele(w), [], "予測は「次の1回」だけ。取り消されたあとの別の攻撃は予告しない");
    EA(w).clear("test");
    // 実行 → 引き継ぎ
    const w2 = world();
    place(w2, 3, 8, 0); TE(w2).attach(3, "ranged");
    use(w2, "apollo_oracle");
    const b = plain(TE(w2).attackNow(3));
    frames(w2, 62);
    t = tele(w2);
    const out = plain(EA(w2).getOutcome(b.id));
    assert.equal(t.length, 1); assert.equal(t[0].source, "projectile"); assert.equal(t[0].id, out.projectileId, "同じ予告線が弾へ引き継がれる");
    for (let i = 0; i < 500 && tele(w2).length; i++) frames(w2, 1);
    assert.deepEqual(tele(w2), [], "弾が消えたら予告も消える");
});

test("神託 Lv1: 近接の攻撃も予告する(判定が出るタイルの四角)。実行されたら消える。すでに溜め中の攻撃(使う前に予約)も「次の攻撃」として予告する。予約を通らない従来の敵の弾の予告線も従来どおり", () => {
    const w = world();
    place(w, 4, 1, 0); TE(w).attach(4, "melee");
    const a = plain(TE(w).attackNow(4));
    frames(w, 5);
    assert.equal(use(w, "apollo_oracle").ok, true); // 使う前から溜め中の攻撃
    frames(w, 2);
    const t = tele(w);
    assert.equal(t.length, 1); assert.equal(t[0].kind, "melee"); assert.equal(t[0].attackId, a.id);
    assert.ok(t[0].area && t[0].area.width === 1 && t[0].area.height === 1);
    assert.deepEqual([t[0].area.x, t[0].area.y], [plain(EA(w).get(a.id)).area.x, plain(EA(w).get(a.id)).area.y], "予告の範囲 = 予約の記録");
    frames(w, 45);
    assert.deepEqual(tele(w), [], "実行されたら消える");
    // 従来: 予約を通らない敵の弾(Hendrixが敵の弾として印を付けたEvent)
    const w2 = world();
    use(w2, "apollo_oracle");
    const tpl = w2.ctx.$dataTemplateMap.events.find(e => e && e.name === "ProjectR Apollo Plague Arrow");
    const id = w2.ctx.$gameMap.spawnEvent(tpl.id, center(w2).x + 5, center(w2).y, false);
    w2.ctx.$gameMap.event(id)._inheritedEnemyName = "Slime";
    frames(w2, 3);
    assert.equal(tele(w2).length, 1); assert.equal(tele(w2)[0].source, "projectile");
});

test("神託 Lv1: 近接の判定のEvent(spawnEventHitbox)は「弾」ではなく、予告線を作らない(神託・月桂冠とも)", () => {
    const w = world();
    place(w, 4, 1, 0); TE(w).attach(4, "melee");
    use(w, "apollo_oracle");
    // 予約を通らない近接の判定のEvent(従来の敵がページで出すもの)を直接出す
    const hitbox = new w.ctx.Game_Interpreter(); hitbox._eventId = 4;
    w.ctx.PluginManager.callCommand(hitbox, "Hendrix_Action_Engine", "spawnEventHitbox", { name: "x", notetag: "<plainHitbox>", comment: "", position: "this + 1, this + 0", rotationDegree: "", turnToward: "", attachTo: "", wait: "30" });
    frames(w, 3);
    const e = w.ctx.$gameMap.events().find(x => x && /plainHitbox/.test(x.event().note || ""));
    assert.ok(e && e._inheritedEnemyName, "敵が出した判定のEvent");
    assert.equal(ORACLE(w).isEnemyProjectile(e), false);
    assert.equal(tele(w).length, 0);
});

// ---------- 月桂冠 Lv3 ----------
test("月桂冠 Lv3: 敵が撃った本物の弾は根の範囲(半径5)に入った瞬間に消え、根の壁ができ、プレイヤーはダメージを受けない。近接の判定は弾ではないので防がない。プレイヤー自身の弾は通る。同じ弾で二重ダメージなし", () => {
    const w = world("apollo_laurel_wreath", 3);
    w.ctx.ProjectRCardBalance.setOverride("apollo_laurel_wreath", "constant", "growSeconds", 3);
    place(w, 3, 12, 0); TE(w).attach(3, "ranged", { windupFrames: 20 });
    assert.equal(use(w, "apollo_laurel_wreath").ok, true);
    frames(w, 5);
    const hp0 = leader(w).hp;
    const a = plain(TE(w).attackNow(3));
    frames(w, 22);
    const out = plain(EA(w).getOutcome(a.id));
    assert.equal(out.state, "fired");
    const own = (() => { const tpl = w.ctx.$dataTemplateMap.events.find(e => e && e.name === "ProjectR G17 Bullet"); return w.ctx.$gameMap.spawnEvent(tpl.id, center(w).x + 1.5, center(w).y + 1, false); })();
    for (let i = 0; i < 300 && w.ctx.$gameMap.event(out.projectileId) && !w.ctx.$gameMap.event(out.projectileId)._erased; i++) frames(w, 1);
    assert.equal(leader(w).hp, hp0, "弾は根で止まったのでダメージなし");
    assert.ok(plain(LAUREL(w).getStats()).blocked >= 1, "防いだ: " + JSON.stringify(plain(LAUREL(w).getStats())));
    assert.ok(plain(LAUREL(w).getWalls()).length >= 1, "根の壁");
    const blockedIds = plain(LAUREL(w).getLog()).filter(e => e.type === "blocked").map(e => e.eventId);
    assert.deepEqual(blockedIds, [out.projectileId], "防いだのは敵の弾だけ。プレイヤー自身の弾(attacker: player)は防がない: " + JSON.stringify(blockedIds));
    assert.equal(plain(LAUREL(w).getStats()).blocked, 1);
    assert.notEqual(EA(w).getOutcome(a.id).damaged, true);
    // 近接は防がない(弾ではない)
    place(w, 4, 1, 0); TE(w).attach(4, "melee", { windupFrames: 10 });
    const m = plain(TE(w).attackNow(4));
    frames(w, 16);
    assert.equal(EA(w).getOutcome(m.id).state, "fired");
    assert.equal(plain(EA(w).getOutcome(m.id)).damaged, true, "近接の判定は根の中でも当たる(月桂冠 Lv3は遠距離の弾だけを防ぐ。被ダメージの軽減x0.7と根の回復は別)");
    assert.equal(plain(LAUREL(w).getStats()).blocked, 1, "近接の判定は「防いだ」に数えない");
    // Lv2は防がない
    const w2 = world("apollo_laurel_wreath", 2);
    w2.ctx.ProjectRCardBalance.setOverride("apollo_laurel_wreath", "constant", "growSeconds", 3);
    place(w2, 3, 12, 0); TE(w2).attach(3, "ranged", { windupFrames: 20 });
    use(w2, "apollo_laurel_wreath"); frames(w2, 5);
    const hp2 = leader(w2).hp;
    const b = plain(TE(w2).attackNow(3));
    for (let i = 0; i < 700 && !(plain(EA(w2).getOutcome(b.id) || {}).damaged); i++) frames(w2, 1);
    assert.ok(leader(w2).hp < hp2, "Lv2は弾を防がない(従来どおり)");
});

test("後片付け: 攻撃が全部終わると、予約・弾・判定のEvent・予告線・監視が残らない", () => {
    const w = world();
    place(w, 3, 8, 0); place(w, 4, 1, 0);
    TE(w).attach(3, "ranged"); TE(w).attach(4, "melee");
    use(w, "apollo_oracle");
    TE(w).attackNow(3); TE(w).attackNow(4);
    for (let i = 0; i < 700; i++) frames(w, 1);
    assert.deepEqual(plain(EA(w).diagnostics()), { pending: 0, watchers: 0, outcomes: 2, frame: plain(EA(w).diagnostics()).frame, serial: 2 });
    assert.equal(boltEvents(w).length, 0); assert.equal(hitboxes(w).length, 0);
    assert.deepEqual(tele(w), []);
    assert.equal(plain(ORACLE(w).getTempObjectCount()).total, 0);
    EA(w).clear("test");
});

console.log(`\n${passed} Apollo A14 enemy attack tests passed`);
