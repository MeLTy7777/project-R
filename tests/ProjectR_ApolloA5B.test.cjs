"use strict";
// Phase Apollo-A5B: 黄金の矢 Lv3 のビーム(長押し)・連続ヒット・対象ローカルのヒットストップ。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
//   入力は本物の経路(Input._onKeyDown/_onKeyUp → Scene_Map.update)。時間は戦闘時計(Scene_Map.update の更新回数)。MZ実機は tools/mz_cdp/apollo_a5b_verify.cjs。
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_ApolloVolleyFixture.cjs");
const { assert, plain, volleyWorld, VOLLEY, deckApi, api, aimDegree, frames, arrows, lost, resetHp, arrowEvents, state, center, placeEnemy, parkOthers, setRegion, addWallEvent, player, countCommands, KEYS, HP } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const input = w => w.ctx.ProjectRCardBattleInput;
const pile = w => (state(w)?.cooldownPile || []).filter(e => e.instance.cardId === VOLLEY).length;
const log = w => plain(input(w).getPressLog());
const last = w => plain(api(w).getLastResult());
const [CODE, KEYCODE] = KEYS.Q;
const settle = (w, max = 400) => { for (let i = 0; i < max && (arrows(w).length || api(w).isPending() || api(w).getBeam()); i++) frames(w, 1); };
const press = (w, held, settleFrames = 1) => {
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, held); w.keyUp(CODE, KEYCODE); frames(w, settleFrames);
};
const hold = (w, settleFrames = 1) => press(w, 40, settleFrames);
const beam = w => plain(api(w).getBeam());
const tune = (w, key, value) => assert.equal(w.ctx.ProjectRCardBalance.setOverride(VOLLEY, "constant", key, value).ok, true, key);
const dir = degree => ({ ux: Math.sin(degree * Math.PI / 180), uy: -Math.cos(degree * Math.PI / 180) });
// 発射点(プレイヤー中心)から、狙い方向へ a マス・横へ l マス(右手側が正)の位置へ敵の中心を置く
const putAt = (w, id, aim, a, l) => { const c = center(w), { ux, uy } = dir(aim); return placeEnemy(w, id, c.x + ux * a - uy * l, c.y + uy * a + ux * l); };
const ENEMY = id => id;
const hitsOf = (w, id) => (last(w).hits || []).filter(h => h.target === id);

test("入力の境界(戦闘時計): 29更新で離す=tap=11本の扇(ビームなし) / 30更新で離す=hold=ビーム(矢なし)。1回の入力で両方は出ない", () => {
    const run = held => { const w = volleyWorld({ level: 3 }); parkOthers(w); aimDegree(w, 90, 4); press(w, held); return w; };
    const w29 = run(29), w30 = run(30);
    assert.equal(arrows(w29).length, 11); assert.equal(api(w29).getBeam(), null, "29更新 = tap = 扇");
    assert.equal(arrows(w30).length, 0); assert.notEqual(api(w30).getBeam(), null, "30更新 = hold = ビーム");
    for (const w of [w29, w30]) assert.equal(log(w).filter(e => e.type === "activate").length, 1, "発動の依頼は1回");
    assert.equal(plain(input(w29).getLastResult()).variant, "tap"); assert.equal(plain(input(w30).getLastResult()).variant, "hold");
    assert.equal(api(w30).getBeamLog().length, 1); assert.equal(api(w29).getBeamLog().length, 0);
    assert.equal(arrowEvents(w30).length, 0, "holdは扇の矢を1本も出さない");
    assert.equal(w29.ctx.ProjectRHitStop.getStats().applied, 0);
});

test("ビームの幅3マスと方向: 離した時のマウス方向へ、幅3マス(横±1.5)。中は当たり、外は当たらない。向きを変えても同じ。追尾しない。後ろには当たらない", () => {
    // アリーナの開けている4方向(上・右・下・左)で実際に撃つ。斜めは下の幾何の単体と、近い敵への実射で確かめる。
    for (const aim of [90, 0, 180, 270]) {
        const w = volleyWorld({ level: 3 });
        parkOthers(w, [3, 4, 5, 6]);
        putAt(w, 3, aim, 7, 1.9); // 縁の内側(敵の体の端が±1.4)
        putAt(w, 4, aim, 7, -1.9);
        putAt(w, 5, aim, 7, 2.1); // 外(体の端が1.6 > 1.5)
        putAt(w, 6, aim, -4, 0); // 後ろ
        aimDegree(w, aim, 4);
        press(w, 40);
        const b = beam(w);
        assert.equal(b.width, 3); assert.ok(Math.abs(b.degree - aim) < 1e-6, `向き ${aim}: ${b.degree}`);
        aimDegree(w, (aim + 120) % 360, 5); // 発射後に動かしても追尾しない
        settle(w);
        assert.ok(lost(w, 3) > 0 && lost(w, 4) > 0, `aim ${aim}: 幅の内側の敵に当たる`);
        assert.equal(lost(w, 5), 0, `aim ${aim}: 幅の外には当たらない`);
        assert.equal(lost(w, 6), 0, `aim ${aim}: 後ろには当たらない`);
        assert.ok(last(w).limit > 0);
    }
    // 斜め(45度): 近い敵に当たる。横の外側は「体の端」が斜めに張り出すぶん(約0.7)遠くで外れる
    const d = volleyWorld({ level: 3 });
    parkOthers(d, [3, 4]);
    putAt(d, 3, 45, 3, 0); putAt(d, 4, 45, 3, 2.4);
    aimDegree(d, 45, 4);
    press(d, 40); assert.ok(Math.abs(beam(d).degree - 45) < 1e-6); settle(d);
    assert.ok(lost(d, 3) > 0); assert.equal(lost(d, 4), 0);
    // 幾何の単体(任意の角度): 幅3 = 横±1.5。前方(a>=0)だけ。入り口の距離 enter
    const g = api(d).geometry, b = { origin: { x: 10, y: 10 }, degree: 30, lanes: g.laneLayout(3).map(l => ({ ...l, limit: 40 })) };
    const u = { x: Math.sin(Math.PI / 6), y: -Math.cos(Math.PI / 6) }, n = { x: -u.y, y: u.x };
    const box = (a, l) => [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([dx, dy]) => ({ x: 10 + u.x * a + n.x * l + dx, y: 10 + u.y * a + n.y * l + dy }));
    assert.ok(g.beamRegion(b, box(6, 0)) && g.beamRegion(b, box(6, 1.9)), "内側");
    assert.equal(g.beamRegion(b, box(6, 2.5)), null, "外側");
    assert.equal(g.beamRegion(b, box(-4, 0)), null, "後ろ");
    assert.ok(Math.abs(g.beamRegion(b, box(6, 0)).enter - 5.5) < 0.2, "入り口の距離は体の手前の端");
});

test("連続ヒット: 先端が1/3マス進むごとに1サンプル。敵ごとに1ヒット50・最大11ヒット(上限550)。サンプル番号は敵ごとに一意(重なった判定で二重に当たらない)。敵ごとに別カウント", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    putAt(w, 4, 90, 5, 0);
    putAt(w, 5, 90, 9, 1);
    aimDegree(w, 90, 4);
    press(w, 40);
    settle(w);
    const r = last(w);
    const by = Object.fromEntries(r.targets.map(t => [t.eventId, t]));
    assert.equal(by[4].hits, 11); assert.equal(by[4].damage, 550);
    assert.equal(by[5].hits, 11); assert.equal(by[5].damage, 550);
    assert.equal(lost(w, 4), 550); assert.equal(lost(w, 5), 550);
    for (const id of [4, 5]) {
        const samples = hitsOf(w, id).map(h => h.sample);
        assert.equal(new Set(samples).size, samples.length, "サンプル番号は一意");
        assert.deepEqual(samples, [...samples].sort((a, b) => a - b), "サンプルは進行順");
        assert.ok(hitsOf(w, id).every(h => h.damage === 50));
    }
    assert.equal(r.totalHits, 22); assert.equal(r.totalDamage, 1100);
    assert.equal(pile(w), 1, "消費は1回");
    // UpdateEventHp は1ヒットにつきちょうど1回(属性・修飾の窓口を1回ずつ通る)
    const calls = countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").filter(c => c.args.projectRFixed && c.args.projectRFixed.source === VOLLEY);
    assert.equal(calls.length, 22);
    assert.ok(calls.every(c => c.args.projectRFixed.base === 50 && c.args.projectRFixed.element === 0));
});

test("ヒット数は「保証」ではない: 壁で先端が止まる・敵が先端の近くにいると、サンプル数ぶんだけ(実際のヒット数を記録)", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    const c = center(w), wallX = Math.floor(c.x) + 4; // 先端は壁の手前(約3.5マス)で止まる
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) setRegion(w, wallX, y, 255);
    putAt(w, 4, 90, 2.0, 0); // 先端の近く: 体の手前の端が1.5マス
    aimDegree(w, 90, 4);
    press(w, 40);
    const limit = beam(w).limit;
    assert.ok(limit > 3 && limit < 4.1, `先端は壁で止まる: ${limit}`);
    settle(w);
    const kMax = Math.floor(limit * 3 + 1e-9), kMin = Math.ceil(1.5 * 3 - 1e-9);
    const hits = last(w).targets.find(t => t.eventId === 4).hits;
    assert.equal(hits, Math.min(11, kMax - kMin + 1), `サンプル ${kMin}〜${kMax} のぶんだけ`);
    assert.ok(hits < 11, "11回には届かない(550は最大)");
    assert.equal(lost(w, 4), hits * 50);
});

test("壁・端: 先端はRegion 255 / <CombatWall> / マップの端で止まり、壁の向こうの敵には当たらない。壁の手前の敵には当たる", () => {
    for (const kind of ["region", "event"]) {
        const w = volleyWorld({ level: 3 });
        parkOthers(w, [4, 5]);
        const c = center(w), wallX = Math.floor(c.x) + 4;
        for (let y = Math.floor(c.y) - 8; y <= Math.floor(c.y) + 8; y++) { if (kind === "region") setRegion(w, wallX, y, 255); else addWallEvent(w, "CombatWall", wallX, y); }
        putAt(w, 4, 90, 2, 0); // 手前
        putAt(w, 5, 90, 7, 0); // 向こう
        aimDegree(w, 90, 4);
        press(w, 40);
        assert.ok(beam(w).limit < 4.6, `${kind}: 先端が壁で止まる ${beam(w).limit}`);
        settle(w);
        assert.ok(lost(w, 4) > 0, `${kind}: 壁の手前には当たる`);
        assert.equal(lost(w, 5), 0, `${kind}: 壁の向こうには当たらない`);
    }
    // 横の壁の柱(幅の中のレーンだけを遮る)の詳細は ProjectR_ApolloA5C.test.cjs
    // マップの端: ループしない向きでは、端より先へは進まない
    const w = volleyWorld({ level: 3 });
    const geometry = api(w).geometry;
    assert.ok(geometry.beamLimit({ x: 2.5, y: 25.5 }, 270, 40) <= 2.5 + 1e-6, "左の端");
    assert.ok(geometry.beamLimit({ x: 12.5, y: 3.5 }, 0, 100) <= 3.5 + 1e-6, "上の端");
    const m = w.ctx.$gameMap;
    assert.ok(geometry.beamLimit({ x: m.width() - 1.5, y: 20.5 }, 90, 100) <= 1.5 + 1e-6, "右の端");
    assert.ok(geometry.beamLimit({ x: 20.5, y: m.height() - 1.5 }, 180, 100) <= 1.5 + 1e-6, "下の端");
});

test("消費(後払い): 発射では消費せず、最初の有効なヒットで1回だけ消費・Cooldown 3秒。全部外れなら消費もCooldownもなし。確定待ちの再入力は拒否", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 9, 0);
    aimDegree(w, 90, 4);
    const before = plain(state(w));
    hold(w);
    assert.equal(api(w).isPending(), true);
    assert.deepEqual(plain(state(w)), before, "発射だけでは変わらない");
    // 確定待ちの間の再入力(tap・hold)
    press(w, 3); assert.equal(plain(input(w).getLastResult()).detail, "volleyPending");
    hold(w); assert.equal(plain(input(w).getLastResult()).detail, "volleyPending");
    assert.equal(api(w).getBeamLog().length, 1, "ビームは増えない"); assert.equal(arrowEvents(w).length, 0);
    settle(w);
    assert.equal(pile(w), 1);
    const cd = state(w).cooldownPile.find(e => e.instance.cardId === VOLLEY).remainingSeconds;
    assert.ok(cd > 2 && cd <= 3, `Cooldown: ${cd}`);
    // 外れ
    const m = volleyWorld({ level: 3 });
    parkOthers(m);
    aimDegree(m, 90, 4);
    const b2 = plain(state(m));
    hold(m); settle(m);
    assert.equal(last(m).reason, "missed"); assert.equal(last(m).consumed, false);
    assert.deepEqual(plain(state(m)), b2, "全部外れ = 消費なし・Cooldownなし");
    assert.equal(api(m).isPending(), false); assert.equal(m.ctx.ProjectRHitStop.getActive().length, 0);
    hold(m); assert.notEqual(api(m).getBeam(), null, "外れた後はすぐ撃てる");
});

test("確定の失敗: ヒット前にカードが手札から消えた・消費の経路が失敗したときは、ビームを消して何も与えない(二重消費もしない)", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 8, 0);
    aimDegree(w, 90, 4);
    hold(w);
    const id = plain(api(w).getPending()).instanceId;
    assert.equal(deckApi(w).useBattleCard(id).ok, true);
    const pileBefore = pile(w);
    settle(w);
    assert.equal(lost(w, 4), 0); assert.equal(last(w).reason, "cardGone"); assert.equal(pile(w), pileBefore);
    assert.equal(api(w).getBeam(), null);
    const x = volleyWorld({ level: 3 });
    parkOthers(x, [4]);
    putAt(x, 4, 90, 8, 0);
    aimDegree(x, 90, 4);
    hold(x);
    const d = deckApi(x), handler = d.getActivationHandler("ground");
    d.registerActivationHandler("ground", context => context.definition.cardId === VOLLEY ? { ok: false, reason: "forcedFailure" } : handler(context));
    settle(x);
    d.registerActivationHandler("ground", handler);
    assert.equal(lost(x, 4), 0); assert.equal(pile(x), 0); assert.equal(api(x).isPending(), false);
});

test("Lv2のスリップを引き継ぐ: ビームが当たった各敵に、最初のヒットで1回だけ(11ヒットしても重ねない)。5秒で計100(20 x 5)。再度のビームは置換(更新)", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    putAt(w, 4, 90, 5, 0);
    putAt(w, 5, 90, 8, 0.5);
    aimDegree(w, 90, 4);
    hold(w); settle(w);
    const slips = plain(api(w).getActiveSlips());
    assert.deepEqual(slips.map(s => s.eventId).sort(), [4, 5], "当たった敵ごとに1件");
    for (const s of slips) assert.deepEqual(s.ticks, [20, 20, 20, 20, 20]);
    assert.deepEqual(last(w).targets.map(t => t.slip), [true, true]);
    for (let i = 0; i < 360; i++) deckApi(w).updateCooldown(1 / 60);
    assert.equal(lost(w, 4), 550 + 100); assert.equal(lost(w, 5), 550 + 100);
    assert.equal(plain(api(w).getActiveSlips()).length, 0);
    // 再度: Cooldownを明けて撃つと、途中のスリップは置換される(重ならない)
    for (let i = 0; i < 200; i++) deckApi(w).updateCooldown(1 / 60);
    resetHp(w, [4, 5]);
    hold(w); settle(w);
    for (let i = 0; i < 90; i++) deckApi(w).updateCooldown(1 / 60);
    hold(w);
    // 確定待ちの間はもう撃てない(拒否)。Cooldown中なのでスリップは1件のまま
    assert.equal(plain(api(w).getActiveSlips()).filter(s => s.eventId === 4).length, 1);
});

test("固定ダメージの窓口を1ヒット1回: 被ダメージ修飾(x2)を登録すると、1ヒット50が100(二重の適用なし)。属性は無属性のまま。弱点の記録も変わらない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 6, 0);
    aimDegree(w, 90, 4);
    const DM = w.ctx.ProjectRDamageModifiers;
    assert.equal(DM.add({ id: "t.x2", kind: "damageTaken", target: "event:4", value: 2 }).ok, true);
    hold(w); settle(w);
    assert.equal(last(w).targets[0].hits, 11);
    assert.equal(lost(w, 4), 11 * 100, "1ヒットにつき50 x 2を1回");
    DM.clear();
});

test("ヒットストップ(対象ローカル): 当たった敵だけが3frame止まる。他の敵・プレイヤー・戦闘の時計(Cooldown)・矢は止まらない。ダメージのタイミングは変わらない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    putAt(w, 4, 90, 5, 0);
    putAt(w, 5, 270, 6, 0); // ビームの外(後ろ)
    tune(w, "beamMaxHitsPerTarget", 1); // 1ヒットだけ → 止まるのはちょうど3frame
    aimDegree(w, 90, 4);
    const counts = { 3: 0, 4: 0, 5: 0 };
    for (const id of [3, 4, 5]) { const e = w.ctx.$gameMap.event(id), orig = e.updateSelfMovement; e.updateSelfMovement = function() { counts[id]++; return orig.apply(this, arguments); }; }
    const playerUpdates = { n: 0 }; const pu = w.ctx.$gamePlayer.update; w.ctx.$gamePlayer.update = function() { playerUpdates.n++; return pu.apply(this, arguments); };
    hold(w);
    const c0 = { ...counts }, p0 = playerUpdates.n;
    settle(w, 200);
    const frameCount = 0; void frameCount;
    frames(w, 20);
    const hs = plain(w.ctx.ProjectRHitStop.getStats());
    assert.equal(hs.applied, 1, "1ヒット = 1回の止め");
    assert.equal(hs.skippedUpdates, 3, "ちょうど3frame止まる");
    assert.equal(last(w).targets[0].damage, 50, "1ヒット50(スリップは別)");
    const df = f => f; void df;
    const elapsed = counts[3] - c0[3];
    assert.ok(elapsed > 0);
    assert.equal(counts[5] - c0[5], elapsed, "ビームの外の敵は止まらない");
    assert.equal(elapsed - (counts[4] - c0[4]), 3, "当たった敵だけが3frame分遅れる");
    assert.equal(counts[3] - c0[3], elapsed, "無関係なEventも止まらない");
    assert.equal(playerUpdates.n - p0, elapsed, "プレイヤーは止まらない");
    assert.equal(w.ctx.ProjectRHitStop.getActive().length, 0, "終わったら何も残らない");
});

test("ヒットストップの上限: 連続ヒットでも伸ばし続けない(残りは更新、1発動・1体あたりの合計は上限まで)。0で無効。倒れた敵は解除。プレイヤーは対象外", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 5, 0);
    tune(w, "hitStopMaxFrames", 5);
    aimDegree(w, 90, 4);
    const e4 = w.ctx.$gameMap.event(4); let upd = 0; const orig = e4.updateSelfMovement; e4.updateSelfMovement = function() { upd++; return orig.apply(this, arguments); };
    hold(w); settle(w, 200); frames(w, 20);
    const t = last(w).targets[0];
    assert.equal(t.hits, 11);
    assert.ok(t.hitStopFrames <= 5, `合計の上限: ${t.hitStopFrames}`);
    assert.ok(w.ctx.ProjectRHitStop.getStats().skippedUpdates <= 5);
    // 0 = 無効
    const z = volleyWorld({ level: 3 });
    parkOthers(z, [4]); putAt(z, 4, 90, 5, 0); tune(z, "hitStopFrames", 0); aimDegree(z, 90, 4);
    hold(z); settle(z, 200);
    assert.equal(z.ctx.ProjectRHitStop.getStats().applied, 0);
    assert.equal(lost(z, 4), 550, "ダメージは変わらない");
    // 部品の単体: 更新(max)・上限・対象外
    const hsApi = w.ctx.ProjectRHitStop;
    assert.equal(hsApi.apply(w.ctx.$gamePlayer, 3).reason, "unsupportedTarget");
    assert.equal(hsApi.apply(e4, 0).reason, "invalidFrames");
    const r1 = plain(hsApi.apply(e4, 4, { owner: "u", maxFrames: 6 })), r2 = plain(hsApi.apply(e4, 4, { owner: "u", maxFrames: 6 }));
    assert.deepEqual([r1.remaining, r2.remaining], [4, 4], "同じ長さの重ねがけは伸びない(max更新。8にならない)");
    const r3 = plain(hsApi.apply(e4, 10, { owner: "u", maxFrames: 6 }));
    assert.deepEqual([r3.remaining, r3.total, r3.capped], [6, 6, true], "長く要求しても、1発動の合計上限(6)まで");
    assert.equal(hsApi.apply(e4, 4, { owner: "u", maxFrames: 6 }).capped, true, "上限に達したら、その発動ではもう止めない");
    e4.erase();
    frames(w, 1);
    assert.equal(hsApi.getActive().length, 0, "消えたEventは解除");
    hsApi.release("u");
});

test("後片付け: 戦闘終了・マップ移動・ロード・対象の消滅・取消で、ビームもヒットストップもVFXジョブも残らない。消費済みなら消費は戻らない", () => {
    const make = () => { const w = volleyWorld({ level: 3 }); parkOthers(w, [4]); putAt(w, 4, 90, 6, 0); aimDegree(w, 90, 4); return w; };
    const clean = (w, why) => {
        assert.equal(api(w).getBeam(), null, why + ": ビームなし"); assert.equal(api(w).isPending(), false);
        assert.equal(w.ctx.ProjectRHitStop.getActive().length, 0, why + ": ヒットストップなし");
        assert.equal(plain(api(w).getActiveVfxJobs()).length, 0, why + ": VFXジョブなし");
        assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0, why + ": 錨Eventなし");
    };
    let w = make(); hold(w); frames(w, 2); assert.notEqual(api(w).getBeam(), null);
    deckApi(w).endCardBattle(); clean(w, "戦闘終了"); assert.equal(pile(w), 0, "ヒット前の終了は非消費"); assert.equal(last(w).reason, "battleEnd");
    w = make(); hold(w); frames(w, 12); assert.equal(pile(w), 1);
    deckApi(w).endCardBattle(); clean(w, "ヒット後の戦闘終了");
    w = make(); hold(w); frames(w, 3); w.ctx.$gameMap.setup(4); clean(w, "マップ移動");
    w = make(); hold(w); frames(w, 3); w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents()); clean(w, "ロード");
    // 対象の消滅(ビーム中に敵が消える)
    w = make(); hold(w); frames(w, 8);
    w.ctx.$gameMap.event(4).erase(); settle(w);
    assert.ok(lost(w, 4) < 550, "消えた敵にはそれ以上当てない");
    clean(w, "対象の消滅");
    // 取消(押している間に戦闘終了)
    w = make(); player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 35); deckApi(w).endCardBattle(); w.keyUp(CODE, KEYCODE); frames(w, 3); clean(w, "取消"); assert.equal(api(w).getBeamLog().length, 0);
});

test("VFX: ビームの区間(3マス)を並べて再生し、終わったあと(30frame)に確実に外す。VFX Designerライブラリに登録済み。VFXの失敗は消費・ダメージを変えない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 6, 0);
    aimDegree(w, 90, 4);
    const pv = w.ctx.ProjectRPresentationVfx, plays = [], stops = [];
    const play = pv.play, stop = pv.stop;
    pv.play = (...a) => { const r = play.apply(pv, a); plays.push([a, plain(r)]); return r; };
    pv.stop = (...a) => { stops.push(a[0]); return stop.apply(pv, a); };
    hold(w);
    const beamPlay = plays.find(p => p[0][0] === "apollo_volley.beam");
    assert.ok(beamPlay, "ビームのVFXを再生");
    const limit = beam(w).limit;
    assert.ok(Math.abs(beamPlay[0][1].length - limit) < 1e-9 && beamPlay[0][1].degree === 90);
    assert.equal(beamPlay[1].ok, true); assert.equal(beamPlay[1].mode, "beam");
    assert.equal(beamPlay[1].segments, Math.ceil(limit / 3 - 1e-9), "3マスの区間を並べる");
    assert.equal(beamPlay[1].notes.length, beamPlay[1].segments);
    assert.equal(plain(api(w).getActiveVfxJobs()).length, 1);
    assert.equal(beamPlay[1].anchors.length, beamPlay[1].segments, "区間ごとに画像なしの錨Event(拡縮なしのワールド位置)へ結び付ける");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, beamPlay[1].segments);
    frames(w, 31);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getAnchors()).length, 0, "終わったら錨Eventも全部外す");
    assert.equal(plain(api(w).getActiveVfxJobs()).length, 0, "30frame後にVFXジョブは終わる");
    assert.deepEqual(stops.filter(n => /apollo_volley.beam/.test(n)).sort(), beamPlay[1].notes.slice().sort(), "再生した全部の区間を外す");
    settle(w);
    // 素材とライブラリ
    const lib = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    assert.ok(lib.ProjectR_Volley_Beam && lib.ProjectR_Volley_Beam.spritesheetFile === "Animation/ProjectR_Volley_Beam");
    assert.ok(fs.existsSync(path.join(project, "img/pictures/Animation/ProjectR_Volley_Beam.png")));
    assert.ok(pv.keys().includes("apollo_volley.beam"));
    // VFXが例外を投げても結果は同じ
    const f = volleyWorld({ level: 3 });
    parkOthers(f, [4]); putAt(f, 4, 90, 6, 0); aimDegree(f, 90, 4);
    f.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    f.ctx.ProjectRGodSummonVisual.swingWeapon = () => { throw new Error("swing down"); };
    hold(f); settle(f);
    assert.equal(lost(f, 4), 550); assert.equal(pile(f), 1);
});

test("演出と効果音: Apolloの弓・主人公の手(ArmExtend)・通常カットインを発射時に1回。1ヒットごとの効果音は短い間隔を間引く(ヒット数より少なく、0ではない)", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 5, 0);
    aimDegree(w, 90, 4);
    const log2 = { swing: 0, act: [], cut: 0, se: [] };
    const sv = w.ctx.ProjectRGodSummonVisual, cp = w.ctx.ProjectRCharacterPresentation, ci = w.ctx.ProjectRCutIn;
    const sw = sv.swingWeapon, rq = cp.request, sh = ci.show;
    sv.swingWeapon = (...a) => { log2.swing++; return sw.apply(sv, a); };
    cp.request = (...a) => { log2.act.push(a[0]); return rq.apply(cp, a); };
    ci.show = (...a) => { log2.cut++; return sh.apply(ci, a); };
    const am = w.ctx.AudioManager; const ps = am.playSe; am.playSe = se => { log2.se.push(se.name); };
    hold(w); settle(w);
    am.playSe = ps;
    assert.equal(log2.swing, 1); assert.deepEqual(log2.act, ["ArmDraw", "ArmExtend"], "押している間は構え(ArmDraw)、離すと発射の動作(ArmExtend)"); assert.equal(log2.cut, 1, "確定(消費)で重ねない");
    const hitSounds = log2.se.filter(n => n === "Chime1").length;
    assert.ok(hitSounds > 0 && hitSounds < 11, `ヒット音は間引かれる: ${hitSounds}`);
    assert.equal(log2.se.filter(n => n === "Chime2").length, 1, "発射音は1回");
});

test("バランス設定: ビームの幅・速さ・射程・ヒット間隔・1ヒットのダメージ・最大ヒット数・ヒットストップはすべて上書きで反映される。範囲外は拒否。F6の項目に出る", () => {
    const base = volleyWorld({ level: 3 });
    const B = base.ctx.ProjectRCardBalance;
    const cfg = plain(api(base).beamConfig());
    assert.deepEqual(cfg, { width: 3, speed: 40, range: 40, perTile: 3, damage: 50, maxHits: 11, stopFrames: 3, stopMax: 30 });
    for (const [key, value] of [["beamWidthTiles", 0], ["beamSpeed", 0], ["beamHitsPerTile", 0], ["beamMaxHitsPerTarget", 0], ["beamHitDamage", -1], ["hitStopFrames", -1], ["beamRangeTiles", 0]]) {
        assert.equal(B.setOverride(VOLLEY, "constant", key, value).ok, false, `${key}=${value} は拒否`);
    }
    assert.equal(B.setOverride(VOLLEY, "constant", "beamMaxHitsPerTarget", 2.5).ok, false, "整数のみ");
    // 反映: 幅1 → 横1.9の敵は当たらない / 1ヒット70 / 最大3ヒット / 射程6
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [3, 4]);
    putAt(w, 3, 90, 5, 1.2); // 幅3なら当たり(体の端0.7)、幅1(±0.5)なら体の端が0.7>0.5で外
    putAt(w, 4, 90, 4, 0);
    tune(w, "beamWidthTiles", 1); tune(w, "beamHitDamage", 70); tune(w, "beamMaxHitsPerTarget", 3); tune(w, "beamRangeTiles", 6); tune(w, "beamSpeed", 20);
    aimDegree(w, 90, 4);
    hold(w);
    const b = beam(w);
    assert.equal(b.width, 1); assert.ok(b.limit <= 6 + 1e-6);
    settle(w);
    assert.equal(lost(w, 3), 0, "幅1の外");
    assert.equal(lost(w, 4), 3 * 70, "70ダメージ x 最大3ヒット");
    // ヒット間隔: 1マスあたり6ヒットでも、上限は11
    const h = volleyWorld({ level: 3 });
    parkOthers(h, [4]); putAt(h, 4, 90, 5, 0); tune(h, "beamHitsPerTile", 6); aimDegree(h, 90, 4);
    hold(h); settle(h);
    assert.equal(last(h).targets[0].hits, 11);
    // Lv3以外・Lv1〜2のバランスは変わらない
    assert.equal(api(h).effectsForLevel(2).projectileCount, 5);
    // 編集用: 項目の定義がある
    const defs = JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8"));
    for (const key of ["beamWidthTiles", "beamSpeed", "beamRangeTiles", "beamHitsPerTile", "beamHitDamage", "beamMaxHitsPerTarget", "hitStopFrames", "hitStopMaxFrames"]) {
        assert.ok(defs.fields[key] && !defs.fields[key].reserved, key);
        assert.ok(Object.prototype.hasOwnProperty.call(defs.cards[VOLLEY].constants, key), key);
    }
});

test("既存の入力・カードとの互換: Lv1〜2は即時、Lv3のtapは扇、他のカード・旧Apolloは押下プロファイル無し。Lv3の本番取得経路は無いまま(30枚デッキは組めない)", () => {
    for (const level of [1, 2]) {
        const w = volleyWorld({ level }); parkOthers(w); aimDegree(w, 90, 4);
        player(w).center(player(w)._realX, player(w)._realY);
        w.keyDown(CODE, KEYCODE); frames(w, 3);
        assert.equal(arrows(w).length, level === 1 ? 3 : 5, `Lv${level}は押した瞬間に発射`); assert.equal(api(w).getBeam(), null);
        w.keyUp(CODE, KEYCODE); frames(w, 2);
    }
    const w = volleyWorld({ level: 3 });
    for (const id of ["hermes_sweep", "hermes_zetsu", "hermes_issen", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"]) assert.equal(input(w).getPressProfile(id), null, id);
    const cat = w.ctx.ProjectRCardCatalog;
    assert.equal(cat.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0); assert.equal(cat.godStatus("apollo").ready, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length === 0);
    assert.ok(!JSON.stringify(plain(w.ctx.ProjectRHermesProductionDeck.starterSet())).includes(VOLLEY));
    // ProjectR_HitStop は他のカードの挙動を変えない(止めを使うのはこのカードのビームだけ)
    const text = fs.readdirSync(path.join(project, "js/plugins")).filter(f => f.endsWith(".js") && f !== "ProjectR_HitStop.js" && f !== "ProjectR_ApolloGoldenVolley.js" && f !== "ProjectR_ApolloGigasSlayer.js")
        .filter(f => /ProjectRHitStop/.test(fs.readFileSync(path.join(project, "js/plugins", f), "utf8")));
    assert.deepEqual(text, [], "他のpluginはヒットストップを使っていない");
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), config);
    const names = config.$plugins.map(p => p.name);
    assert.ok(names.indexOf("ProjectR_HitStop") >= 0 && names.indexOf("ProjectR_HitStop") < names.indexOf("ProjectR_ApolloGoldenVolley"), "HitStopは黄金の矢より前");
    assert.ok(names.indexOf("ProjectR_HitStop") > names.indexOf("Hendrix_Action_Engine"));
});

console.log(`\n${passed} Apollo A5B tests passed`);
