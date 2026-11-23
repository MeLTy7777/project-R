"use strict";
// Stage 2-B: Janus の閉門・反照・表裏転化・境界断ち(ProjectR_JanusSkills)。実エンジン(実Map004 + 全plugin + 実 Hendrix のダメージ)。
//   【1】閉門: 中心(カーソル方向 最大3マス・壁の手前)・半径 1.2・ダメージなし・拘束 1.5/2.0/2.5秒(通常)/ 速度低下 20/25/30%(ボス)・耐性・重ねがけなし・攻撃は止めない・後片付け
//   【2】反照: 受付 0.4/0.5/0.6秒・敵の直接攻撃の1回を無効 → 3マス以内の元の敵へ 100/125/150% の反撃・1回だけ・環境ダメージは無効にしない・再帰なし
//   【3】表裏転化: カーソル上の通常の敵と入れ替え(2.5/3.0/3.5マス)・ボス/無効/範囲外/危ない入れ替えは何も動かさず Cooldown も使わない・敵の溜め中の攻撃は中断
//   【4】境界断ち: 0.2秒の予備動作 → 4 × 1.2 の貫通する直線・180/210/240%・1回ずつ・壁を挟んだ敵には当たらない
//   【5】5つの枠から同じ・Cooldown(10/9/12/7秒)は成功したときだけ・保存データ・戦闘の終了での解除
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, attachHpBars, placePolar, placeEnemy, center, parkOthers, aimDegree, lost, resetHp, setRegion, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const JANUS = ["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"];
const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, JS = w => w.ctx.ProjectRJanusSkills;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} ${a} vs ${b}`);
const SLOT_OF = { lmb: "attack", shift: "mobility", e: "special", x: "card1", c: "card2" };

function janusWorld({ slots = {}, level = 1, begin = true } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    assert.equal(D(w).assignRingToPlayer("janus").ok, true); assert.equal(RL(w).equipRing("janus").ok, true);
    for (const id of JANUS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, level).ok, true, id); }
    for (const [slot, id] of Object.entries(slots)) assert.equal(RL(w).setSkill(slot, id).ok, true, slot + "=" + id);
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    if (begin) { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); parkOthers(w, []); }
    return w;
}
const use = (w, slot) => plain(FC(w).useAbility(SLOT_OF[slot]));
const speed = (w, id) => w.ctx.ProjectRCardModifiers.characterSpeedFactor(w.ctx.$gameMap.event(id));
const hpOfPlayer = w => w.ctx.$gameParty.leader().hp;
const cd = (w, id) => plain(FC(w).getCooldowns())[id];
const markBoss = (w, id) => { const e = w.ctx.$gameMap.event(id); e.event().note = (e.event().note || "") + "<fieldBoss: テストボス>"; };
const mouseAtEnemy = (w, id) => { const e = w.ctx.$gameMap.event(id), c = center(w), m = w.ctx.$gameMap, p = w.ctx.ProjectR.CombatOcclusion.eventPolygon(e);
    const px = p.reduce((s, q) => s + q.x, 0) / p.length, py = p.reduce((s, q) => s + q.y, 0) / p.length; void c; w.mouse((px - m.displayX()) * m.tileWidth(), (py - m.displayY()) * m.tileHeight()); };
// 基礎ダメージ W(Lv1 双門 1段目 = 倍率 1.0。ここでは境界断ちの Lv ごとの値の基準)
const W = 100;
// 敵の直接攻撃(Hendrix の UpdateEventHp。呼び出し元 = 敵イベント)を、実際の EnemyAttack と同じ経路で主人公へ当てる
const enemyHit = (w, eventId, value = "-50") => { const i = new w.ctx.Game_Interpreter(); i._eventId = eventId; w.ctx.PluginManager.callCommand(i, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value, exceedMaxHealth: "false" }); frames(w, 2); };

// ---------------------------------------------------------------- 【1】閉門 ----------------------------------------------------------------
test("【1】閉門: カーソル方向 3 マス先を中心に半径 1.2。範囲内の通常の敵は拘束(移動不能)・範囲外は何も起きない・ダメージなし・Cooldown 10 秒", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(w, 0, 3);
    placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 20); placePolar(w, 5, 5.5, 0); placePolar(w, 6, 3.0, 90);
    const dpf3 = w.ctx.$gameMap.event(3).distancePerFrame(), dpf5 = w.ctx.$gameMap.event(5).distancePerFrame();
    resetHp(w); const r = use(w, "e"); assert.equal(r.ok, true, JSON.stringify(r)); frames(w, 3);
    const info = plain(JS(w).getLastResult("closed")); assert.deepEqual([info.immobilized.sort(), info.slowed, info.resisted], [[3, 4], [], []], JSON.stringify(info));
    near(info.center.y, center(w).y - 3, 0.05, "中心 = 3 マス先"); near(info.radius, 1.2, 1e-9);
    assert.ok(speed(w, 3) < 0.001 && speed(w, 4) < 0.001, "拘束: 移動速度がほぼ 0"); assert.equal(speed(w, 5), 1, "範囲外は変わらない"); assert.equal(speed(w, 6), 1);
    assert.ok(w.ctx.$gameMap.event(3).distancePerFrame() < dpf3 * 0.001 && w.ctx.$gameMap.event(5).distancePerFrame() === dpf5, "移動できる距離が 0 に近い");
    assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [0, 0, 0, 0], "ダメージなし");
    near(cd(w, "janus_closed_gate"), 10, 0.1, "Cooldown 10 秒");
    FC(w).end("test");
});
test("【1b】拘束の長さ: Lv1 1.5 秒 / Lv2 2.0 秒 / Lv3 2.5 秒(戦闘の時計で。過ぎれば元の速さ)", () => {
    for (const [lv, sec] of [[1, 1.5], [2, 2], [3, 2.5]]) {
        const w = janusWorld({ slots: { e: "janus_closed_gate" }, level: lv }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0);
        assert.equal(use(w, "e").ok, true);
        frames(w, Math.round(sec * 60) - 6); assert.ok(speed(w, 3) < 0.001, `Lv${lv}: ${sec - 0.1} 秒ではまだ拘束`);
        frames(w, 12); assert.equal(speed(w, 3), 1, `Lv${lv}: ${sec} 秒で解除`); assert.deepEqual(plain(JS(w).getState().holds), []);
        FC(w).end("test");
    }
});
test("【1c】ボス(<fieldBoss>): 拘束ではなく移動速度の低下 20 / 25 / 30 %(速度 80 / 75 / 70 %)。同じ時間", () => {
    for (const [lv, factor, sec] of [[1, 0.8, 1.5], [2, 0.75, 2], [3, 0.7, 2.5]]) {
        const w = janusWorld({ slots: { e: "janus_closed_gate" }, level: lv }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 20); markBoss(w, 3);
        assert.equal(w.ctx.ProjectRJanusSkills.isBoss(w.ctx.$gameMap.event(3)), true); assert.equal(use(w, "e").ok, true);
        const info = plain(JS(w).getLastResult("closed")); assert.deepEqual([info.slowed, info.immobilized], [[3], [4]], "ボスは低下・通常の敵は拘束");
        near(speed(w, 3), factor, 1e-9, `Lv${lv} ボスの速度`); assert.ok(speed(w, 4) < 0.001);
        frames(w, Math.round(sec * 60) - 6); assert.equal(speed(w, 3), factor); frames(w, 12); assert.equal(speed(w, 3), 1, "ボスの低下も同じ時間で解除");
        FC(w).end("test");
    }
});
test("【1d】耐性(麻痺 12 / スタン 13 の無効・有効度 0)の敵には効かない。重ねがけはしない(効果中の再発動は残り時間を取り直すだけ)。壁を挟んだ敵には効かない", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); placePolar(w, 4, 3.0, 25);
    const battler = SgetBattler(w, 4); battler.isStateResist = id => id === 13;                           // 4 はスタン無効
    assert.equal(use(w, "e").ok, true); const info = plain(JS(w).getLastResult("closed"));
    assert.deepEqual([info.immobilized, info.resisted], [[3], [4]]); assert.equal(speed(w, 4), 1, "耐性のある敵は動ける");
    // 重ねがけなし: 0.5 秒進めてから、同じ敵へもう一度(ハンドラを直接)→ 残り時間は 1.5 に取り直し(2.0 ではない)・係数は積まれない
    frames(w, 30); const before = plain(JS(w).getState().holds).find(h => h.eventId === 3).remaining; near(before, 1.0, 0.05);
    const handler = D(w).getActivationHandler("ground"); const again = plain(handler({ definition: D(w).definitions.card("janus_closed_gate") })); assert.equal(again.ok, true);
    const holds = plain(JS(w).getState().holds).filter(h => h.eventId === 3); assert.equal(holds.length, 1, "1体に1つ"); near(holds[0].remaining, 1.5, 0.05, "取り直し"); assert.ok(speed(w, 3) < 0.001);
    FC(w).end("test");
    // 壁(Region 255)を挟んだ敵: 中心と敵の間に壁
    const v = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(v, 0, 3); const c = center(v);
    placePolar(v, 3, 3.0, 0); placePolar(v, 4, 4.4, 0);                                                      // 3 = 中心 / 4 = 中心の向こう(1.4 先。半径 1.2 + 体の半分で届くが、壁がある)
    for (let x = Math.floor(c.x) - 2; x <= Math.floor(c.x) + 2; x++) setRegion(v, x, Math.floor(c.y - 3.7), 255);
    assert.equal(use(v, "e").ok, true); const i2 = plain(JS(v).getLastResult("closed")); assert.ok(!i2.immobilized.includes(4), "壁を挟んだ敵には効かない: " + JSON.stringify(i2));
    FC(v).end("test");
});
function SgetBattler(w, id) { return w.run(`SgetBattlerForH($gameMap.event(${id}))`); }
test("【1e】攻撃は止めない: 拘束中の敵も攻撃の予約・実行ができる。戦闘の終了・マップ移動で解除(保存しない)", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate" } }); aimDegree(w, 0, 3); const e = placePolar(w, 3, 3.0, 0); void e;
    assert.equal(use(w, "e").ok, true); assert.ok(speed(w, 3) < 0.001);
    const r = plain(w.ctx.ProjectREnemyAttack.schedule({ eventId: 3, kind: "melee", windupFrames: 10, notetag: "<projectRFieldMelee><dmg: ゴブリン>", reach: 1.2 })); assert.equal(r.ok, true, "拘束中でも攻撃を予約できる");
    frames(w, 14); assert.equal(plain(w.ctx.ProjectREnemyAttack.getOutcome(r.id)).state, "fired", "攻撃は実行される");
    FC(w).end("test"); assert.equal(speed(w, 3), 1, "戦闘の終了で解除"); assert.deepEqual(plain(JS(w).getState().holds), []);
    const saved = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()); assert.equal(/0.0001|"remaining"|immobiliz|speedFactor/.test(saved), false, "セーブ内容に効果の状態(拘束・残り時間)は入らない");
});

// ---------------------------------------------------------------- 【2】反照 ----------------------------------------------------------------
test("【2】反照: 受付の間の敵の直接攻撃を1回無効にし、3マス以内の元の敵へ基礎物理ダメージ × 100 / 125 / 150 % で反撃。2回目は通る(1回だけ)", () => {
    for (const [lv, scale] of [[1, 1], [2, 1.25], [3, 1.5]]) {
        const w = janusWorld({ slots: { x: "janus_reflection" }, level: lv }); placePolar(w, 3, 2.0, 0); placePolar(w, 4, 2.5, 90);
        const hp0 = hpOfPlayer(w); resetHp(w);
        const r = use(w, "x"); assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(JS(w).getState().armed); near(cd(w, "janus_reflection"), 9, 0.1, "Cooldown 9 秒");
        enemyHit(w, 3);
        assert.equal(hpOfPlayer(w), hp0, `Lv${lv}: 無効になる`); const hit = plain(JS(w).getLastResult("reflectionHit")); assert.deepEqual([hit.negated, hit.countered, hit.attackerEventId], [true, true, 3]);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 反撃 ${scale * 100}%`); assert.equal(lost(w, 4), 0, "ほかの敵には出ない");
        assert.equal(JS(w).getState().armed, null, "受付は1回で終わる");
        enemyHit(w, 4, "-50"); assert.ok(hpOfPlayer(w) < hp0, "2回目の攻撃は通る");
        FC(w).end("test");
    }
});
test("【2b】受付時間: Lv1 0.4 秒 / Lv2 0.5 秒 / Lv3 0.6 秒。過ぎてからの攻撃は通る(反撃も出ない)", () => {
    for (const [lv, sec] of [[1, 0.4], [2, 0.5], [3, 0.6]]) {
        const w = janusWorld({ slots: { x: "janus_reflection" }, level: lv }); placePolar(w, 3, 2.0, 0); const hp0 = hpOfPlayer(w);
        assert.equal(use(w, "x").ok, true); near(plain(JS(w).getState().armed).remaining, sec, 1e-9);
        frames(w, Math.round(sec * 60) - 6); assert.ok(JS(w).getState().armed, `${sec - 0.1} 秒: まだ受付中`);
        frames(w, 12); assert.equal(JS(w).getState().armed, null, `${sec} 秒で受付終了`);
        resetHp(w); enemyHit(w, 3); assert.ok(hpOfPlayer(w) < hp0, "受付の外の攻撃は通る"); assert.equal(lost(w, 3), 0, "反撃も出ない");
        FC(w).end("test");
    }
});
test("【2c】3マスより遠い元の敵には反撃しない(攻撃は無効になる)。敵ではないイベントのダメージ(環境)は無効にしない・反撃のダメージで連鎖しない", () => {
    const w = janusWorld({ slots: { x: "janus_reflection" } }); placePolar(w, 3, 3.6, 0); placePolar(w, 4, 1.5, 180); const hp0 = hpOfPlayer(w); resetHp(w);
    assert.equal(use(w, "x").ok, true); enemyHit(w, 3);
    assert.equal(hpOfPlayer(w), hp0, "3マスの外の敵の攻撃も無効"); const hit = plain(JS(w).getLastResult("reflectionHit")); assert.deepEqual([hit.negated, hit.countered], [true, false]); assert.equal(lost(w, 3), 0);
    // 環境: 敵ではないイベント(<enemy> を持たない)・イベント 0 からのダメージは止めない
    const w2 = janusWorld({ slots: { x: "janus_reflection" } }); const hpA = hpOfPlayer(w2); assert.equal(use(w2, "x").ok, true);
    const nonEnemy = w2.ctx.$gameMap.events().find(e => e && !String(e.event().note || "").includes("<enemy>"));
    enemyHit(w2, nonEnemy.eventId()); assert.ok(hpOfPlayer(w2) < hpA, "環境(敵でない)ダメージは無効にならない"); assert.ok(JS(w2).getState().armed, "環境のダメージでは受付を使わない");
    enemyHit(w2, 0); assert.ok(JS(w2).getState().armed, "呼び出し元なし(0)も止めない");
    FC(w).end("test"); FC(w2).end("test");
});
test("【2d】実際の敵の近接攻撃(EnemyAttack の予約 → 実行 → 判定)でも1回無効になる。受付の後は通る。戦闘の終了で受付は消える", () => {
    const w = janusWorld({ slots: { x: "janus_reflection" }, level: 3 }); placePolar(w, 3, 1.0, 0); parkOthers(w, [3]); const hp0 = hpOfPlayer(w); resetHp(w);
    assert.equal(use(w, "x").ok, true);
    const r = plain(w.ctx.ProjectREnemyAttack.schedule({ eventId: 3, kind: "melee", windupFrames: 20, notetag: "<projectRFieldMelee><dmg: ゴブリン>", reach: 1.2 })); assert.equal(r.ok, true);
    frames(w, 40); assert.equal(hpOfPlayer(w), hp0, "実際の近接攻撃が無効"); assert.equal(plain(JS(w).getLastResult("reflectionHit")).countered, true); assert.ok(lost(w, 3) > 0, "反撃");
    const r2 = plain(w.ctx.ProjectREnemyAttack.schedule({ eventId: 3, kind: "melee", windupFrames: 20, notetag: "<projectRFieldMelee><dmg: ゴブリン>", reach: 1.2 })); assert.equal(r2.ok, true);
    frames(w, 40); assert.ok(hpOfPlayer(w) < hp0, "2回目は通る");
    const w2 = janusWorld({ slots: { x: "janus_reflection" } }); assert.equal(use(w2, "x").ok, true); assert.ok(JS(w2).getState().armed); FC(w2).end("test"); assert.equal(JS(w2).getState().armed, null, "戦闘の終了で受付は消える");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【3】表裏転化 ----------------------------------------------------------------
test("【3】表裏転化: カーソル上の通常の敵と位置を入れ替える(中心が入れ替わる)。ダメージなし・Cooldown 12 秒。敵の溜め中の攻撃は中断", () => {
    const w = janusWorld({ slots: { c: "janus_inversion" } }); placePolar(w, 3, 2.0, 90); const c0 = center(w), e0 = (() => { const e = w.ctx.$gameMap.event(3); return { x: e._realX, y: e._realY }; })();
    const p0 = { x: w.ctx.$gamePlayer._realX, y: w.ctx.$gamePlayer._realY }; mouseAtEnemy(w, 3);
    const sched = plain(w.ctx.ProjectREnemyAttack.schedule({ eventId: 3, kind: "melee", windupFrames: 30, notetag: "<projectRFieldMelee><dmg: ゴブリン>", reach: 1.2 })); assert.equal(sched.ok, true);
    resetHp(w); const hp0 = hpOfPlayer(w); const r = use(w, "c"); assert.equal(r.ok, true, JSON.stringify(r));
    const e = w.ctx.$gameMap.event(3), p = w.ctx.$gamePlayer;
    near(p._realX, e0.x, 1e-3, "主人公 → 敵の位置"); near(p._realY, e0.y, 1e-3); near(e._realX, p0.x, 1e-3, "敵 → 主人公の位置"); near(e._realY, p0.y, 1e-3); void c0;
    assert.equal(lost(w, 3), 0, "ダメージなし"); near(cd(w, "janus_inversion"), 12, 0.1, "Cooldown 12 秒");
    assert.equal(plain(w.ctx.ProjectREnemyAttack.list()).filter(x => x.eventId === 3).length, 0, "溜め中の攻撃は中断(古い位置から出ない)");
    frames(w, 40); assert.equal(hpOfPlayer(w), hp0, "入れ替わった主人公に古い攻撃は当たらない");
    FC(w).end("test");
});
test("【3b】範囲: Lv1 2.5 / Lv2 3.0 / Lv3 3.5 マス。範囲外は何も動かさず Cooldown も使わない(outOfRange)", () => {
    for (const [lv, range] of [[1, 2.5], [2, 3.0], [3, 3.5]]) {
        for (const [dist, ok] of [[range - 0.2, true], [range + 0.3, false]]) {
            const w = janusWorld({ slots: { c: "janus_inversion" }, level: lv }); placePolar(w, 3, dist, 90); mouseAtEnemy(w, 3);
            const e = w.ctx.$gameMap.event(3), p = w.ctx.$gamePlayer, before = [p._realX, p._realY, e._realX, e._realY];
            const r = use(w, "c"); assert.equal(r.ok, ok, `Lv${lv} 距離 ${dist}: ` + JSON.stringify(r));
            if (!ok) { assert.equal(r.detail, "outOfRange"); assert.deepEqual([p._realX, p._realY, e._realX, e._realY], before, "何も動かない"); assert.equal(cd(w, "janus_inversion"), 0, "Cooldown を使わない"); }
            FC(w).end("test");
        }
    }
});
test("【3c】拒否(何も動かさない・Cooldown なし): ボス / 敵がいない(noTarget)/ 倒れた敵 / 目標の近くに別の体があって入れ替えが危ない(unsafeSwap)", () => {
    const check = (setup, reason) => {
        const w = janusWorld({ slots: { c: "janus_inversion" } }); setup(w);
        const p = w.ctx.$gamePlayer, before = [p._realX, p._realY, ...ENEMIES.map(i => w.ctx.$gameMap.event(i)._realX)];
        const r = use(w, "c"); assert.equal(r.ok, false, reason + " " + JSON.stringify(r)); assert.equal(r.detail, reason, JSON.stringify(r));
        assert.deepEqual([p._realX, p._realY, ...ENEMIES.map(i => w.ctx.$gameMap.event(i)._realX)], before, "何も動かない"); assert.equal(cd(w, "janus_inversion"), 0, "Cooldown を使わない");
        FC(w).end("test");
    };
    check(w => { placePolar(w, 3, 2.0, 90); markBoss(w, 3); mouseAtEnemy(w, 3); }, "bossImmune");
    check(w => { placePolar(w, 3, 2.0, 90); w.mouse(300, 200); }, "noTarget");
    check(w => { placePolar(w, 3, 2.0, 90); mouseAtEnemy(w, 3); const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(3)); bar.currentHp = bar.targetHp = 0; }, "noTarget");
    check(w => { placePolar(w, 3, 2.0, 90); placePolar(w, 4, 0.2, 0); mouseAtEnemy(w, 3); }, "unsafeSwap");                    // 主人公のすぐそば(4)が、入れ替えで敵(3)が来る位置と重なる
});
test("【3d】壁: 敵が壁の向こう側の位置にいて、入れ替えると主人公が壁の中へ着地するようなとき(Region 255 の上の目標)は拒否", () => {
    const w = janusWorld({ slots: { c: "janus_inversion" } }); const c = center(w); placePolar(w, 3, 2.0, 90); mouseAtEnemy(w, 3);
    const e = w.ctx.$gameMap.event(3), tx = Math.floor(e._realX + 0.5), ty = Math.floor(e._realY + 0.5); setRegion(w, tx, ty, 255);        // 敵が立っている位置が壁(Region 255)
    const p = w.ctx.$gamePlayer, before = [p._realX, p._realY, e._realX, e._realY]; void c;
    const r = use(w, "c"); assert.equal(r.ok, false); assert.equal(r.detail, "unsafeSwap", JSON.stringify(r)); assert.deepEqual([p._realX, p._realY, e._realX, e._realY], before); assert.equal(cd(w, "janus_inversion"), 0);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【4】境界断ち ----------------------------------------------------------------
test("【4】境界断ち: 0.2 秒(12 フレーム)の予備動作のあと、4 マス × 幅 1.2 の貫通する直線。180 / 210 / 240 %・同じ敵に1回・Cooldown 7 秒", () => {
    for (const [lv, scale] of [[1, 1.8], [2, 2.1], [3, 2.4]]) {
        const w = janusWorld({ slots: { x: "janus_boundary_slash" }, level: lv }); aimDegree(w, 0, 3);
        placePolar(w, 3, 1.5, 0); placePolar(w, 4, 3.6, 0); placePolar(w, 5, 4.9, 0); placePolar(w, 6, 2.0, 90);        // 手前 / 奥(体が長さの端に触れる)/ 長さの外 / 真横(幅の外)
        resetHp(w); const r = use(w, "x"); assert.equal(r.ok, true, JSON.stringify(r)); near(cd(w, "janus_boundary_slash"), 7, 0.1, "Cooldown 7 秒");
        frames(w, 8); assert.deepEqual([3, 4, 5, 6].map(i => lost(w, i)), [0, 0, 0, 0], "予備動作の間(0.2 秒)はダメージなし");
        frames(w, 12);
        near(lost(w, 3), Math.round(W * scale), 1, `Lv${lv} 手前 ${scale * 100}%`); near(lost(w, 4), Math.round(W * scale), 1, `Lv${lv} 奥(貫通)`);
        assert.equal(lost(w, 5), 0, "4 マスの外"); assert.equal(lost(w, 6), 0, "幅 1.2 の外");
        frames(w, 30); near(lost(w, 3), Math.round(W * scale), 1, "同じ敵には1回だけ"); assert.equal(JS(w).getState().slashPending, null);
        FC(w).end("test");
    }
});
test("【4b】壁を挟んだ敵には当たらない(Region 255)。発動の瞬間の向きと位置が使われる(予備動作の間にマウスを動かしても変わらない)。防御は無視しない(通常ダメージ)", () => {
    const w = janusWorld({ slots: { x: "janus_boundary_slash" } }); aimDegree(w, 0, 3); const c = center(w);
    placePolar(w, 3, 1.5, 0); placePolar(w, 4, 3.2, 0); placePolar(w, 5, 2.0, 90);
    for (let x = Math.floor(c.x) - 1; x <= Math.floor(c.x) + 1; x++) setRegion(w, x, Math.floor(c.y - 2.4), 255);          // 手前の敵(3)と奥の敵(4)の間に壁
    const calls = []; const orig = w.ctx.PluginManager.callCommand; w.ctx.PluginManager.callCommand = function (i, plugin, name, args) { calls.push({ name, args }); return orig.apply(this, arguments); };
    resetHp(w); assert.equal(use(w, "x").ok, true); aimDegree(w, 90, 3);                                                          // 予備動作の間に右へ向け直しても、斬る向きは上のまま
    frames(w, 24); assert.ok(lost(w, 3) > 0, "壁の手前は当たる"); assert.equal(lost(w, 4), 0, "壁の向こうは当たらない"); assert.equal(lost(w, 5), 0, "向きは発動の瞬間のまま");
    const dmg = calls.filter(c2 => c2.name === "UpdateEventHp"); assert.ok(dmg.length >= 1 && dmg.every(c2 => !c2.args.projectRFixed && /player weapon/.test(String(c2.args.value))), "固定ダメージ(防御無視)は使わない: 通常の物理ダメージの式(装備の武器のダメージ × 倍率)");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【5】5つの枠・Cooldown・失敗は消費しない ----------------------------------------------------------------
test("【5】5つの枠(LMB / Shift / E / X / C)のどれからでも同じスキルが使える。Cooldown は成功したときだけ(10 / 9 / 12 / 7 秒)・スキルID単位", () => {
    const setup = { janus_closed_gate: w => { aimDegree(w, 0, 3); placePolar(w, 3, 3.0, 0); }, janus_reflection: w => { void w; }, janus_boundary_slash: w => { aimDegree(w, 0, 3); placePolar(w, 3, 1.5, 0); },
        janus_inversion: w => { placePolar(w, 3, 2.0, 90); mouseAtEnemy(w, 3); } };
    const expected = { janus_closed_gate: 10, janus_reflection: 9, janus_inversion: 12, janus_boundary_slash: 7 };
    for (const slot of ["lmb", "shift", "e", "x", "c"]) for (const id of Object.keys(setup)) {
        const w = janusWorld({ slots: { [slot]: id } }); setup[id](w);
        const r = use(w, slot); assert.equal(r.ok, true, `${id}@${slot} ` + JSON.stringify(r)); assert.equal(r.skillId, id);
        near(cd(w, id), expected[id], 0.1, `${id} の Cooldown`); const again = use(w, slot); assert.equal(again.ok, false); assert.equal(again.reason, "cooldown", "Cooldown 中は使えない");
        const hud = plain(FC(w).getHudState()).slots.find(s => s.slot === SLOT_OF[slot]); assert.equal(hud.cooldown > 0, true, "HUD に Cooldown");
        FC(w).end("test");
    }
});
test("【5b】保存データ(RingLoadout)・Core の選択・SOUL のデータは変わらない。Janus のスキルは Hermes・Apollo の枠の動作を変えない", () => {
    const w = janusWorld({ slots: { e: "janus_closed_gate", x: "janus_boundary_slash" }, begin: false });
    const snap = () => JSON.stringify([w.ctx.$gameSystem._projectRRingLoadout, D(w).getPersistentData()]); const s0 = snap();
    assert.equal(FC(w).begin().ok, true); frames(w, 2); parkOthers(w, []); aimDegree(w, 0, 3); placePolar(w, 3, 2.0, 0);
    assert.equal(use(w, "e").ok, true); assert.equal(use(w, "x").ok, true); frames(w, 30); FC(w).end("test");
    assert.equal(snap(), s0, "保存データは変わらない");
});

console.log(`\nall ${passed} passed`);
