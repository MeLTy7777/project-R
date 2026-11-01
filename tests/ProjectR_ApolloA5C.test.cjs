"use strict";
// Phase Apollo-A5C: 黄金の矢 Lv3 のビームの遮蔽(幅全体・レーン方式)と、長押し中のチャージ演出。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
//   ダメージ・ヒット間隔・上限・幅・消費は A5B のまま(ProjectR_ApolloA5B.test.cjs)。ここは「遮蔽の正しさ」と「演出の出入り・後片付け」を確かめる。
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_ApolloVolleyFixture.cjs");
const { assert, plain, volleyWorld, VOLLEY, deckApi, api, aimDegree, frames, arrows, lost, arrowEvents, state, center, placeEnemy, parkOthers, setRegion, addWallEvent, player, KEYS } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const input = w => w.ctx.ProjectRCardBattleInput;
const pile = w => (state(w)?.cooldownPile || []).filter(e => e.instance.cardId === VOLLEY).length;
const log = w => plain(input(w).getPressLog());
const last = w => plain(api(w).getLastResult());
const [CODE, KEYCODE] = KEYS.Q;
const settle = (w, max = 400) => { for (let i = 0; i < max && (arrows(w).length || api(w).isPending() || api(w).getBeam()); i++) frames(w, 1); };
const centerPlayer = w => player(w).center(player(w)._realX, player(w)._realY);
const holdDown = (w, n) => { centerPlayer(w); w.keyDown(CODE, KEYCODE); frames(w, n); };
const release = (w, settleFrames = 1) => { w.keyUp(CODE, KEYCODE); frames(w, settleFrames); };
const hold = (w, n = 40, settleFrames = 1) => { holdDown(w, n); release(w, settleFrames); };
const beam = w => plain(api(w).getBeam());
const dir = degree => ({ ux: Math.sin(degree * Math.PI / 180), uy: -Math.cos(degree * Math.PI / 180) });
const putAt = (w, id, aim, a, l) => { const c = center(w), { ux, uy } = dir(aim); return placeEnemy(w, id, c.x + ux * a - uy * l, c.y + uy * a + ux * l); };
const lanesOf = w => beam(w).lanes.map(l => Math.round(l.limit * 100) / 100);
const spyVfx = w => { const pv = w.ctx.ProjectRPresentationVfx, plays = [], stops = [], play = pv.play, stop = pv.stop;
    pv.play = (...a) => { const r = play.apply(pv, a); plays.push({ key: a[0], ctx: a[1] ? plain(a[1]) : null, result: plain(r) }); return r; };
    pv.stop = (...a) => { stops.push(a[0]); return stop.apply(pv, a); };
    return { plays, stops }; };
const spySe = w => { const se = [], am = w.ctx.AudioManager, ps = am.playSe; am.playSe = s => { se.push(s.name); }; return { se, restore: () => { am.playSe = ps; } }; };
const followers = w => plain(w.ctx.ProjectRGodSummonVisual.getFollowers());
const anchors = w => plain(w.ctx.ProjectRGodSummonVisual.getAnchors());
const cp = w => w.ctx.ProjectRCharacterPresentation;
// 横の壁の柱: 発射点から前方 a マス・横 l マス(右手側が正)の位置のタイルを Region 255 にする(軸に揃った発射向き専用)
const pillar = (w, aim, a, l) => { const c = center(w), { ux, uy } = dir(aim); setRegion(w, Math.floor(c.x + ux * a - uy * l), Math.floor(c.y + uy * a + ux * l), 255); };

test("横の壁(柱)の遮蔽: 幅の端のレーンだけを遮る。柱の裏の敵は当たらず、遮られていないレーンの敵には当たる(同じ発射で)。中心線の外の壁も効く", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5, 6]);
    const c = center(w);
    // 前方3マス・横+1(右手側 = 下)の柱 2マス分(横+0.5〜+2.5)。中心線(横0)は通る
    for (const l of [1, 2]) setRegion(w, Math.floor(c.x) + 3, Math.floor(c.y) + l, 255);
    putAt(w, 4, 90, 7, 0); // 中央のレーン: 遮られない
    putAt(w, 5, 90, 7, 1.0); // 柱の裏(+側のレーン): 遮られる
    putAt(w, 6, 90, 7, -1.0); // 反対側のレーン: 遮られない
    aimDegree(w, 90, 4);
    hold(w);
    const lanes = lanesOf(w);
    assert.equal(lanes.length, 3);
    assert.ok(lanes[2] < 3.1 && lanes[2] > 2.0, `柱のあるレーンは柱の手前まで: ${lanes[2]}`);
    assert.ok(lanes[0] > 6 && lanes[1] > 6, "柱の無いレーンは先まで届く");
    settle(w);
    assert.ok(lost(w, 4) >= 550, "遮られていない敵には当たる(11ヒット)");
    assert.ok(lost(w, 6) >= 550, "反対側のレーンの敵にも当たる");
    assert.equal(lost(w, 5), 0, "柱の裏の敵は無傷");
    const by = Object.fromEntries(last(w).targets.map(t => [t.eventId, t]));
    assert.equal(by[4].hits, 11); assert.equal(by[6].hits, 11); assert.equal(by[5], undefined);
    assert.equal(pile(w), 1, "遮られていない敵への最初のヒットで1回だけ消費");
});

test("柱の手前の敵は、同じレーンでも当たる。幅の外にあるだけの壁(体が幅に入らない)は遮らない。幅の端に接するだけも遮らない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    const c = center(w);
    setRegion(w, Math.floor(c.x) + 4, Math.floor(c.y) + 2, 255); // 横+1.5〜+2.5 = 幅(±1.5)の外に接するだけ(軸に揃った壁)
    putAt(w, 4, 90, 7, 1.0); putAt(w, 5, 90, 3, 1.0);
    aimDegree(w, 90, 4);
    hold(w);
    assert.deepEqual(lanesOf(w).map(v => v > 6), [true, true, true], "幅に入らない壁は遮らない");
    settle(w);
    assert.ok(lost(w, 4) >= 550 && lost(w, 5) >= 550);
    // 柱が手前にあるとき、柱より手前(前方2マス)の同じレーンの敵には当たる
    const v = volleyWorld({ level: 3 });
    parkOthers(v, [4, 5]);
    const d = center(v);
    setRegion(v, Math.floor(d.x) + 4, Math.floor(d.y) + 1, 255);
    putAt(v, 4, 90, 2, 1.0); putAt(v, 5, 90, 7, 1.0);
    aimDegree(v, 90, 4);
    hold(v); settle(v);
    assert.ok(lost(v, 4) > 0, "柱の手前の敵には当たる"); assert.equal(lost(v, 5), 0, "柱の向こうの敵は無傷");
});

test("幅の端をまたぐ敵: 一部のレーンが遮られても、遮られていないレーンに体がかかっていれば当たる。全レーンが遮られれば当たらない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    const c = center(w);
    for (const l of [1, 2]) setRegion(w, Math.floor(c.x) + 3, Math.floor(c.y) + l, 255);
    putAt(w, 4, 90, 7, 0.5); // 体の横の範囲は 0 〜 +1: 中央のレーン(開)と+側のレーン(遮られる)にまたがる
    aimDegree(w, 90, 4);
    hold(w); settle(w);
    assert.equal(last(w).targets.find(t => t.eventId === 4).hits, 11, "開いているレーンにかかる部分で当たる");
    // 全レーンを壁で塞ぐ
    const x = volleyWorld({ level: 3 });
    parkOthers(x, [4]);
    const d = center(x);
    for (let l = -3; l <= 3; l++) setRegion(x, Math.floor(d.x) + 3, Math.floor(d.y) + l, 255);
    putAt(x, 4, 90, 7, 0.5);
    aimDegree(x, 90, 4);
    const before = plain(state(x));
    hold(x); settle(x);
    assert.equal(lost(x, 4), 0); assert.equal(last(x).reason, "missed"); assert.deepEqual(plain(state(x)), before, "全部遮られた = 非消費");
});

test("<CombatWall> / 通行不能タイルの縁 / マップの端: 幅の横の壁もレーンを遮る。端では、端の外へはみ出すレーンは進めない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    const c = center(w);
    addWallEvent(w, "CombatWall", Math.floor(c.x) + 3, Math.floor(c.y) + 1); // 幅の+側のレーンだけにかかる壁イベント
    putAt(w, 4, 90, 7, 1.0); putAt(w, 5, 90, 7, 0);
    aimDegree(w, 90, 4);
    hold(w);
    const lanes = lanesOf(w);
    assert.ok(lanes[2] < 3.1 && lanes[0] > 6 && lanes[1] > 6, `CombatWall(横+側): ${lanes}`);
    settle(w);
    assert.equal(lost(w, 4), 0); assert.ok(lost(w, 5) > 0);
    // 通行不能タイルの縁(Region以外): 実マップの壁の縁。アリーナの壁際で、壁へ向かうレーンの長さが壁までの距離になる
    const g = api(w).geometry, lanesAtWall = g.buildLanes({ x: 12.5, y: 25.5 }, 270, 3, 40);
    assert.ok(lanesAtWall.every(l => l.limit > 0 && l.limit <= 12.5 + 1e-6), `左の壁/端: ${lanesAtWall.map(l => l.limit)}`);
    // マップの端: 端の上すれすれの発射では、端の外へはみ出す側のレーンは0
    const m = w.ctx.$gameMap;
    const edge = g.buildLanes({ x: 20.5, y: 0.7 }, 90, 3, 40); // 横-側(上)のレーンは y = -0.3 の外から始まる
    assert.equal(edge[0].limit, 0, "端の外から始まるレーンは進めない"); assert.ok(edge[2].limit > 0);
    const right = g.buildLanes({ x: m.width() - 0.7, y: 20.5 }, 90, 3, 40);
    assert.ok(right.every(l => l.limit <= 0.7 + 1e-6), "右の端");
});

test("斜め(45度)の発射: 帯は発射方向に揃えた矩形で掃く。斜めの柱は、かかるレーンだけを遮り、他のレーンの敵には当たる", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    const g = api(w).geometry, c = center(w);
    const free = g.buildLanes(c, 45, 3, 40).map(l => l.limit);
    assert.ok(free.every(v => v > 3), `45度の自由な向き(アリーナの隅へ向かう): ${free}`);
    // 斜めの柱: 前方2.5マス・横+1.6(右下側)のタイル
    const { ux, uy } = dir(45), nx = -uy, ny = ux;
    const tx = Math.floor(c.x + ux * 2.5 + nx * 1.6), ty = Math.floor(c.y + uy * 2.5 + ny * 1.6);
    setRegion(w, tx, ty, 255);
    // 柱のタイルの実際の中心を、発射の座標系(前方a・横l)で測る
    const pc = { x: tx + 0.5 - c.x, y: ty + 0.5 - c.y }, pa = pc.x * ux + pc.y * uy, pl = pc.x * nx + pc.y * ny;
    const lanes = g.buildLanes(c, 45, 3, 40).map(l => l.limit);
    const shorter = lanes.map((v, i) => v < free[i] - 0.2);
    assert.ok(shorter.some(Boolean), `柱のあるレーンは短くなる: ${lanes} vs ${free} (柱 a=${pa.toFixed(2)} l=${pl.toFixed(2)})`);
    assert.ok(!shorter.every(Boolean), "全部のレーンが遮られるわけではない(柱は幅の一部だけにかかる)");
    const blockedLane = pl > 0.5 ? 2 : pl < -0.5 ? 0 : 1, openLane = blockedLane === 2 ? 0 : 2;
    assert.ok(Math.abs(lanes[openLane] - free[openLane]) < 1e-6, "柱の反対側のレーンは変わらない");
    // 実際に撃つ: 柱のすぐ向こう(同じ横)の敵は無傷、反対側のレーンの敵には当たる
    const behind = { a: pa + 1.6, l: pl }, other = { a: Math.min(free[openLane] - 1.2, 3.4), l: (openLane === 2 ? 1 : -1) * 1.0 };
    putAt(w, 4, 45, other.a, other.l);
    putAt(w, 5, 45, behind.a, behind.l);
    aimDegree(w, 45, 4);
    hold(w); settle(w);
    assert.ok(lost(w, 4) > 0, "斜めでも、遮られていないレーンの敵に当たる");
    assert.equal(lost(w, 5), 0, "斜めの柱の向こうの敵は当たらない");
});

test("見た目とダメージの一致: 全レーンが同じ長さなら幅3マスの1枚、一部が遮られればレーンごとに「そのレーンの長さまで」描く。ダメージの届く範囲と同じ長さ・同じ中心", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    const c = center(w);
    for (const l of [1, 2]) setRegion(w, Math.floor(c.x) + 3, Math.floor(c.y) + l, 255);
    putAt(w, 4, 90, 7, 0);
    aimDegree(w, 90, 4);
    const spy = spyVfx(w);
    hold(w);
    const lanes = beam(w).lanes;
    const lanePlays = spy.plays.filter(p => p.key === "apollo_volley.beamlane");
    assert.ok(!spy.plays.some(p => p.key === "apollo_volley.beam"), "一部が遮られたので、幅3の1枚は使わない");
    assert.equal(lanePlays.length, lanes.filter(l => l.limit > 0).length);
    for (const p of lanePlays) {
        const lane = lanes.find(l => Math.abs(l.center - p.ctx.lateral) < 1e-9);
        assert.ok(lane, "レーンの中心");
        assert.ok(Math.abs(p.ctx.length - lane.limit) < 1e-9, `描く長さ = レーンの届く長さ: ${p.ctx.length} vs ${lane.limit}`);
        assert.equal(p.ctx.degree, 90); assert.equal(p.result.mode, "beam");
        assert.equal(p.result.segments, Math.ceil(lane.limit / 2 - 1e-9), "2マスの区間を並べる");
    }
    settle(w); frames(w, 32);
    assert.equal(anchors(w).length, 0, "終わったら錨Eventも全部外す");
    assert.equal(plain(api(w).getActiveVfxJobs()).length, 0);
    // 遮られていない発射は、いままでどおり幅3の1枚
    const o = volleyWorld({ level: 3 });
    parkOthers(o, [4]); putAt(o, 4, 90, 6, 0); aimDegree(o, 90, 4);
    const spy2 = spyVfx(o);
    hold(o);
    assert.equal(spy2.plays.filter(p => p.key === "apollo_volley.beam").length, 1);
    assert.equal(spy2.plays.filter(p => p.key === "apollo_volley.beamlane").length, 0);
    assert.ok(Math.abs(spy2.plays.find(p => p.key === "apollo_volley.beam").ctx.length - beam(o).limit) < 1e-9);
    settle(o);
});

test("ダメージ・ヒット間隔・上限・幅は変わらない: 遮られていない敵は A5B と同じ 11ヒット・550。サンプル番号は一意。消費・Cooldown・外れも同じ", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]);
    putAt(w, 4, 90, 5, 0); putAt(w, 5, 90, 9, 1);
    aimDegree(w, 90, 4);
    hold(w); settle(w);
    const r = last(w);
    for (const t of r.targets) { assert.equal(t.hits, 11); assert.equal(t.damage, 550); }
    assert.deepEqual(plain(api(w).beamConfig()), { width: 3, speed: 40, range: 40, perTile: 3, damage: 50, maxHits: 11, stopFrames: 3, stopMax: 30 });
    assert.equal(r.totalDamage, 1100);
    const samples = r.hits.filter(h => h.target === 4).map(h => h.sample);
    assert.equal(new Set(samples).size, 11);
    assert.equal(pile(w), 1);
    const cd = state(w).cooldownPile.find(e => e.instance.cardId === VOLLEY).remainingSeconds;
    assert.ok(cd > 2 && cd <= 3);
});

test("チャージ(長押し中): 8更新から、Apolloが現れて弓を引き、主人公は構え(ArmDraw)、光が強まり、30更新で合図(輪 + 効果音1回)。チャージ中は矢・ビーム・ダメージ・消費・カットインなし", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    putAt(w, 4, 90, 6, 0);
    aimDegree(w, 90, 4);
    const spy = spyVfx(w), snd = spySe(w);
    const cut = []; const sh = w.ctx.ProjectRCutIn.show; w.ctx.ProjectRCutIn.show = (...a) => { cut.push(a[0]); return sh.apply(w.ctx.ProjectRCutIn, a); };
    const before = plain(state(w));
    centerPlayer(w); w.keyDown(CODE, KEYCODE);
    frames(w, 6);
    assert.equal(api(w).getCharge().active, false, "8更新未満はまだ出さない");
    assert.equal(followers(w).length, 0);
    frames(w, 4); // 10更新
    let c = plain(api(w).getCharge());
    assert.equal(c.active, true); assert.equal(c.stage, 1);
    assert.equal(followers(w).length, 1, "Apolloの表示Event"); assert.equal(followers(w)[0].godId, "apollo");
    assert.equal(cp(w).isActive("ArmDraw"), true, "主人公の構え");
    assert.deepEqual(spy.plays.map(p => p.key), ["apollo_charge.bow", "apollo_charge.glow1"]);
    assert.equal(spy.plays[0].ctx.degree, 90, "弓の向き = 押した時のマウス方向");
    frames(w, 6); c = plain(api(w).getCharge()); assert.equal(c.stage, 2); // 16
    frames(w, 10); c = plain(api(w).getCharge()); assert.equal(c.stage, 3); assert.equal(c.ready, false); // 26
    frames(w, 4); c = plain(api(w).getCharge()); assert.equal(c.ready, false, "30更新目の直前はまだ"); frames(w, 1); c = plain(api(w).getCharge()); assert.equal(c.ready, true); // 押下の更新数が30(押下セッションの更新はマップ更新の後)
    assert.deepEqual(spy.plays.map(p => p.key), ["apollo_charge.bow", "apollo_charge.glow1", "apollo_charge.glow2", "apollo_charge.glow3", "apollo_charge.bowhold", "apollo_charge.ready"], "強まる順");
    assert.equal(snd.se.filter(n => n === "Bell1").length, 1, "合図の効果音は1回");
    frames(w, 20); assert.equal(snd.se.filter(n => n === "Bell1").length, 1, "押し続けても重ねて鳴らさない");
    assert.equal(arrowEvents(w).length, 0); assert.equal(api(w).getBeam(), null); assert.equal(api(w).isPending(), false);
    assert.equal(lost(w, 4), 0); assert.deepEqual(plain(state(w)), before, "チャージ中は消費もCooldownもない");
    assert.equal(cut.length, 0, "チャージ中にカットインは出ない");
    assert.equal(plain(api(w).getBeamLog()).length, 0);
    // 離す → 次の更新でチャージを外し、いつもの発射(ビーム・弓・ArmExtend・カットイン1回)へつながる
    release(w, 2);
    assert.equal(api(w).getCharge().active, false); assert.equal(followers(w).filter(f => true).length, 0, "チャージのApolloは外れる");
    assert.equal(cp(w).isActive("ArmDraw"), false);
    assert.notEqual(api(w).getBeam(), null); assert.equal(cut.length, 1, "カットインは発射時の1回だけ");
    assert.equal(snd.se.filter(n => n === "Chime2").length, 1, "発射音も1回");
    const chargeNotes = spy.plays.filter(p => /^apollo_charge/.test(p.key)).map(p => p.result.note);
    assert.equal(chargeNotes.length, 6);
    for (const n of chargeNotes) assert.ok(spy.stops.includes(n), `外した: ${n}`);
    settle(w); snd.restore();
    assert.equal(pile(w), 1); assert.ok(lost(w, 4) >= 550);
});

test("tapとLv1〜2: 8更新未満のtapではチャージの演出は出ない(扇は従来どおり)。Lv1〜2は押下セッションもチャージも作らない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w); aimDegree(w, 90, 4);
    const spy = spyVfx(w);
    centerPlayer(w); w.keyDown(CODE, KEYCODE); frames(w, 7); release(w, 2);
    assert.equal(arrows(w).length, 11); assert.equal(plain(api(w).getChargeLog()).length, 0);
    assert.equal(spy.plays.filter(p => /^apollo_charge/.test(p.key)).length, 0); assert.equal(followers(w).length, 0);
    assert.equal(cp(w).isActive("ArmDraw"), false);
    for (const level of [1, 2]) {
        const v = volleyWorld({ level }); parkOthers(v); aimDegree(v, 90, 4);
        const s2 = spyVfx(v);
        centerPlayer(v); v.keyDown(CODE, KEYCODE); frames(v, 40);
        assert.equal(api(v).getCharge().active, false); assert.equal(followers(v).length, 0);
        assert.equal(s2.plays.filter(p => /^apollo_charge/.test(p.key)).length, 0);
        assert.equal(plain(input(v).getPressSessions()).length, 0);
        release(v, 2);
    }
});

test("チャージの取消: 手札の入れ替わり・会話・戦闘終了・入力のリセット(フォーカス喪失)・手動で、次の更新ですぐ全部外れる。離しても何も出ない・消費しない", () => {
    const run = (name, cancel, afterKeyUp = true) => {
        const w = volleyWorld({ level: 3 });
        parkOthers(w, [4]); putAt(w, 4, 90, 6, 0); aimDegree(w, 90, 4);
        const spy = spyVfx(w);
        holdDown(w, 28);
        assert.equal(api(w).getCharge().active, true, name + ": チャージ中");
        assert.equal(followers(w).length, 1);
        cancel(w);
        frames(w, 2);
        assert.equal(api(w).getCharge().active, false, name + ": チャージは外れる");
        assert.equal(followers(w).length, 0, name + ": Apolloの表示Eventなし"); assert.equal(anchors(w).length, 0);
        assert.equal(cp(w).isActive("ArmDraw"), false, name + ": 構えを解く");
        const played = spy.plays.filter(p => /^apollo_charge/.test(p.key)).map(p => p.result.note);
        for (const n of played) assert.ok(spy.stops.includes(n), `${name}: 外した ${n}`);
        if (afterKeyUp) { w.keyUp(CODE, KEYCODE); frames(w, 3); }
        assert.equal(arrowEvents(w).length, 0, name + ": 矢なし"); assert.equal(api(w).getBeam(), null, name + ": ビームなし"); assert.equal(api(w).isPending(), false);
        assert.equal(lost(w, 4), 0, name + ": ダメージなし");
        assert.equal(plain(api(w).getBeamLog()).length, 0);
        return w;
    };
    const w1 = run("手札の入れ替わり", w => assert.equal(deckApi(w).useBattleCard(plain(deckApi(w).getBattleState().hand[0]).instanceId).ok, true));
    assert.equal(pile(w1), 1, "別の経路で使った1枚だけ(発動では消費していない)");
    run("会話", w => w.ctx.$gameMessage.add("x"));
    run("戦闘終了", w => deckApi(w).endCardBattle());
    run("入力のリセット(フォーカス喪失)", w => w.ctx.Input.clear());
    run("手動", w => input(w).cancelPress(0, "manual"));
    // 取消の後も、通常どおり撃てる
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]); putAt(w, 4, 90, 6, 0); aimDegree(w, 90, 4);
    holdDown(w, 28); input(w).cancelPress(0, "manual"); frames(w, 2); w.keyUp(CODE, KEYCODE); frames(w, 2);
    hold(w, 40);
    assert.notEqual(api(w).getBeam(), null);
    settle(w); assert.equal(pile(w), 1);
});

test("演出の後片付け: 一連(チャージ→発射→終了)のあとに、一時Event(Apollo・錨)・VFXの絵・構え・ヒットストップが残らない。VFXが失敗してもゲームの状態は変わらない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]); putAt(w, 4, 90, 6, 0); aimDegree(w, 90, 4);
    const eventsBefore = w.ctx.$gameMap.events().filter(Boolean).length;
    const spy = spyVfx(w);
    hold(w, 42, 2); settle(w); frames(w, 60);
    assert.equal(followers(w).length, 0); assert.equal(anchors(w).length, 0);
    assert.equal(api(w).getCharge().active, false); assert.equal(plain(api(w).getActiveVfxJobs()).length, 0);
    assert.equal(w.ctx.ProjectRHitStop.getActive().length, 0); assert.equal(cp(w).isActive("ArmDraw"), false);
    assert.equal(arrowEvents(w).length, 0);
    const stopped = new Set(spy.stops);
    for (const p of spy.plays) if (/^apollo_charge/.test(p.key) && p.result && p.result.note) assert.ok(stopped.has(p.result.note), `絵を外した: ${p.key} ${p.result.note}`);
    for (const p of spy.plays) if (p.result && p.result.notes) for (const n of p.result.notes) assert.ok(stopped.has(n), `ビームの絵を外した: ${n}`);
    // 生成したEventが増えたまま残らない(Apolloの表示Eventの生成と除去は対になる)
    assert.ok(w.ctx.$gameMap.events().filter(Boolean).length <= eventsBefore + 2, "Event数が増え続けない");
    const types = plain(api(w).getChargeLog()).map(e => e.type);
    assert.deepEqual(types, ["start", "ready", "end"]);
    // VFX・表示が例外を投げても、消費・ダメージ・ヒット数は同じ
    const f = volleyWorld({ level: 3 });
    parkOthers(f, [4]); putAt(f, 4, 90, 6, 0); aimDegree(f, 90, 4);
    f.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    f.ctx.ProjectRGodSummonVisual.spawnFollower = () => { throw new Error("follower down"); };
    f.ctx.ProjectRCharacterPresentation.request = () => { throw new Error("motion down"); };
    hold(f, 40, 2); settle(f);
    assert.equal(last(f).targets[0].hits, 11); assert.equal(pile(f), 1); assert.equal(f.ctx.ProjectRHitStop.getActive().length, 0);
});

test("ヒットストップ・後払い・バランスは変わらない: 当たった敵だけが止まる / 最初のヒットで1回だけ消費 / 外れは非消費 / 数値はF6で変更できる / 他の入力・カードは変わらない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4, 5]); putAt(w, 4, 90, 5, 0); putAt(w, 5, 270, 6, 0);
    aimDegree(w, 90, 4);
    const counts = { 4: 0, 5: 0 };
    for (const id of [4, 5]) { const e = w.ctx.$gameMap.event(id), o = e.updateSelfMovement; e.updateSelfMovement = function() { counts[id]++; return o.apply(this, arguments); }; }
    hold(w, 40);
    const c0 = { ...counts }; frames(w, 30);
    assert.ok(w.ctx.ProjectRHitStop.getStats().skippedUpdates > 0);
    assert.ok(counts[5] - c0[5] > counts[4] - c0[4], "ビームの外の敵は止まらない");
    settle(w); assert.equal(pile(w), 1);
    const m = volleyWorld({ level: 3 }); parkOthers(m); aimDegree(m, 90, 4);
    const b = plain(state(m)); hold(m); settle(m);
    assert.equal(last(m).reason, "missed"); assert.deepEqual(plain(state(m)), b);
    const B = w.ctx.ProjectRCardBalance;
    for (const [key, value] of [["beamWidthTiles", 2], ["beamHitDamage", 60], ["beamMaxHitsPerTarget", 5], ["hitStopFrames", 2], ["beamSpeed", 30]]) assert.equal(B.setOverride(VOLLEY, "constant", key, value).ok, true, key);
    B.resetAll();
    for (const id of ["hermes_sweep", "hermes_zetsu", "apollo_golden_arrow"]) assert.equal(input(w).getPressProfile(id), null, id);
    // 幅が変わっても、レーンは幅に合わせて分かれる(2マス幅 = 2レーン、2.5マス幅 = 3レーン)
    const g = api(w).geometry;
    assert.equal(g.laneLayout(2).length, 2); assert.equal(g.laneLayout(2.5).length, 3); assert.ok(Math.abs(g.laneLayout(2.5)[2].hi - 1.25) < 1e-9);
    assert.equal(g.laneLayout(3).length, 3);
});

test("配線: チャージ用のVFXは対応表とライブラリに登録、素材がそろっている。ArmDrawは構えの動作に登録。プラグインパラメータとドキュメント", () => {
    const w = volleyWorld({ level: 3 });
    const keys = plain(w.ctx.ProjectRPresentationVfx.keys());
    for (const key of ["apollo_charge.bow", "apollo_charge.bowhold", "apollo_charge.glow1", "apollo_charge.glow2", "apollo_charge.glow3", "apollo_charge.ready", "apollo_volley.beamlane"]) assert.ok(keys.includes(key), key);
    const lib = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const name of ["ProjectR_Volley_BeamLane", "ProjectR_Charge_Bow", "ProjectR_Charge_BowHold", "ProjectR_Charge_Glow", "ProjectR_Charge_Ready"]) {
        assert.ok(lib[name], name);
        assert.ok(fs.existsSync(path.join(project, "img/pictures", lib[name].spritesheetFile + ".png")), name);
    }
    assert.ok(fs.existsSync(path.join(project, "img/characters/$DEV3H_ArmDraw_f4.png")));
    assert.equal(plain(cp(w).PRIORITY).ArmDraw, 80);
    assert.ok(plain(cp(w).getProfile("protagonist").actions.ArmDraw).sprite === "$DEV3H_ArmDraw_f4");
    const config = {}; require("node:vm").runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), config);
    assert.ok(JSON.parse(config.$plugins.find(p => p.name === "ProjectR_CutIn").parameters.CutInCardIds).includes(VOLLEY));
});

console.log(`\n${passed} Apollo A5C tests passed`);
