"use strict";
// Stage 7A: 強敵の攻撃パターンの土台(ProjectR_FieldStrongEnemy)。実エンジン(実Map004 + 全plugin。FieldCombat も本物)で、
//   扇形(cone)と細い直線(line)の「溜め → 判定 → 硬直」・予兆と判定が同じ形・向きの固定・壁/扉ごしの無効・中断・死亡・後片付け・敵の視界との関係を確かめる。
//   MZ実機・描画は対象外(実機の確認は tools/mz_cdp/field_strong_enemy_verify.cjs)。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { zetsuWorld, attachHpBars, player, setRegion, addWallEvent, read } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const ID = 4;
const rad = d => d * Math.PI / 180;
const FCs = w => w.ctx.ProjectRFieldCombat, SE = w => w.ctx.ProjectRFieldStrongEnemy;
const ev = (w, id) => w.ctx.$gameMap.event(id);
const hp = w => w.ctx.$gameParty.leader().hp;
const map = w => w.ctx.$gameMap;
const passable = (w, x, y) => map(w).checkPassage(x, y, 0x0f);
function openSpot(w) {      // 敵の東側(攻撃は主に東向き)に 13 x 5 の空きがある場所(敵を置く点)。Map004 の広い所は横長の廊下
    const m = map(w);
    for (let y = 3; y < m.height() - 3; y++) for (let x = 4; x < m.width() - 10; x++) {
        let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -3; dx <= 9 && ok; dx++) if (!passable(w, x + dx, y + dy)) ok = false;
        if (ok && !m.events().some(e => e && !e._erased && e._realX >= x - 4 && e._realX <= x + 10 && e._realY >= y - 3 && e._realY <= y + 3)) return { x, y };
    }
    return null;
}
const putEnemy = (w, x, y) => { const e = ev(w, ID); e.locate(x, y); e._realX = x; e._realY = y; e.setDirection(6); };
// プレイヤーを、敵の中心から (bearing 度, 距離) の点の中心に置く(0=上・時計回り)
const putPlayerAt = (w, cx, cy) => { const p = player(w); p.locate(Math.floor(cx), Math.floor(cy)); p._realX = cx - 0.5; p._realY = cy - 0.5; };
const polar = (w, deg, dist) => { const e = ev(w, ID), cx = e._realX + 0.5, cy = e._realY + 0.5; return { x: cx + Math.sin(rad(deg)) * dist, y: cy - Math.cos(rad(deg)) * dist }; };
const placeAt = (w, deg, dist) => { const q = polar(w, deg, dist); putPlayerAt(w, q.x, q.y); return q; };
const setEnemyHp = (w, v) => { const e = ev(w, ID); w.ctx.$gameVariables._data[e.hpStorageId] = v; const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === e); bar.currentHp = v; bar.targetHp = v; };
const topUp = w => w.ctx.$gameParty.leader().setHp(w.ctx.$gameParty.leader().mhp);

// 戦闘中の世界: 敵(ID 4)を空き地に置き、強敵として付ける。敵は動かない(chase=false)・視界は既定で無効(いつも見える)・Cooldown は短い。
function strongWorld({ perception = false, cooldown = 10, chase = false } = {}) {
    const w = zetsuWorld({ level: 1, x: 12, y: 25 });
    assert.equal(w.ctx.ProjectRCombatTestArena.endTest().ok, true); w.frames(2);
    FCs(w).setDevAllowOutsideEncounter(true);
    assert.equal(FCs(w).begin().ok, true);
    attachHpBars(w, [ID], 500);
    const spot = openSpot(w); assert.ok(spot, "前提: 周りが空いた場所がある");
    putEnemy(w, spot.x, spot.y);
    const r = FCs(w).attachEnemy(ID, { strong: "dev_strong", reach: 2, sightTiles: 12, cooldownFrames: cooldown, chase });
    assert.equal(r.ok, true, JSON.stringify(r));
    FCs(w).setPerception({ enabled: perception });
    w.run("Math.random = () => 0.5;");
    topUp(w); w.frames(2);
    return { w, spot };
}
const until = (w, cond, max = 400) => { for (let i = 0; i < max; i++) { if (cond()) return true; w.frames(1); } return cond(); };
const startAttack = (w, deg, dist, kind) => {
    placeAt(w, deg, dist); w.frames(1);
    assert.ok(until(w, () => SE(w).get(ID), 5), "攻撃が始まる");
    if (kind) assert.equal(SE(w).get(ID).kind, kind);
    return SE(w).get(ID);
};
const finishAttack = w => { assert.ok(until(w, () => !SE(w).get(ID), 400), "攻撃が終わる"); };

// ---- 幾何の補助(テスト側の独立な実装): 凸多角形 同士の重なり(SAT) ----
function overlaps(a, b) {
    for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], n = { x: -(q.y - p.y), y: q.x - p.x };
        const pr = s => s.map(v => v.x * n.x + v.y * n.y), A = pr(a), B = pr(b);
        if (Math.max(...A) < Math.min(...B) - 1e-9 || Math.max(...B) < Math.min(...A) - 1e-9) return false;
    }
    return true;
}
const grow = (poly, k) => { const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length, cy = poly.reduce((s, p) => s + p.y, 0) / poly.length; return poly.map(p => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k })); };
const bodyOf = w => w.ctx.ProjectR.CombatOcclusion.eventPolygon(player(w));

test("登録: plugins.js に1回だけ・有効・依存の後ろ。Map008 の3体のゴブリンは強敵ではない(変更なし)・Map009 の強敵は strong=dev_strong", () => {
    const cfg = {}; require("node:vm").runInNewContext(read("js/plugins.js"), cfg);
    const names = cfg.$plugins.map(p => p.name), i = names.indexOf("ProjectR_FieldStrongEnemy");
    assert.ok(i > names.indexOf("ProjectR_CombatOcclusion") && i > names.indexOf("ProjectR_EnemyAttack"), "依存の後ろ");
    assert.equal(names.filter(n => n === "ProjectR_FieldStrongEnemy").length, 1); assert.equal(cfg.$plugins[i].status, true);
    const m8 = JSON.parse(read("data/Map008.json")), gob = m8.events.filter(e => e && /<fieldEnemy/.test(e.note));
    assert.equal(gob.length, 3); for (const e of gob) { assert.ok(!/strong/i.test(e.note), "Map008 の敵は強敵ではない"); assert.ok(/<hp: ゴブリン>/.test(e.note)); }
    const m9 = JSON.parse(read("data/Map009.json")), boss = m9.events.filter(e => e && /<fieldEnemy/.test(e.note));
    assert.equal(boss.length, 1); assert.ok(/strong=dev_strong/.test(boss[0].note)); assert.ok(/<fieldBattleMap>/.test(m9.note));
    const infos = JSON.parse(read("data/MapInfos.json")); assert.ok(infos.some(x => x && x.id === 9 && x.name === "DEV_FieldStrongEnemy"));
});

test("形: 扇(正面 ±50°・半径2.6)と直線(幅0.8・長さ7)。予兆の形(displayPolygon)と判定が、体の形(プレイヤー)ごと一致する", () => {
    const { w } = strongWorld();
    // cone: 近いプレイヤーで始め、そのあと体を (角度, 距離) へ動かして、判定と予兆の重なりを比べる
    startAttack(w, 90, 1.6, "cone"); const aim = SE(w).get(ID).aim; assert.equal(aim, 90);
    let compared = 0;
    for (let a = -180; a < 180; a += 10) for (const d of [0.8, 1.5, 2.2, 2.55, 2.8, 3.4]) {
        placeAt(w, aim + a, d); const hit = SE(w).playerHitTest(ID), poly = SE(w).displayPolygon(ID), body = bodyOf(w);
        const inside = overlaps(poly, body), nearEdge = overlaps(grow(poly, 1.04), body) !== overlaps(grow(poly, 0.96), body);
        if (nearEdge) continue; compared++;
        assert.equal(hit, inside, `cone 角度${a} 距離${d}: 判定=${hit} 予兆と体の重なり=${inside}`);
    }
    assert.ok(compared > 150, "比べた点の数 " + compared);
    // 方向の考え方: 正面は当たり、真横(90°)・後ろは外れる(体の大きさを含めても)
    placeAt(w, aim, 1.5); assert.equal(SE(w).playerHitTest(ID), true);
    placeAt(w, aim + 100, 1.5); assert.equal(SE(w).playerHitTest(ID), false, "扇の外の斜め(プレイヤーの体は1x1)");
    placeAt(w, aim + 90, 1.5); assert.equal(SE(w).playerHitTest(ID), false, "真横");
    placeAt(w, aim + 180, 1.5); assert.equal(SE(w).playerHitTest(ID), false, "後ろ");
    placeAt(w, aim, 3.2); assert.equal(SE(w).playerHitTest(ID), false, "半径の外");
    SE(w).clear("test"); w.frames(2);
    // line
    putEnemy(w, ev(w, ID).x, ev(w, ID).y); setEnemyHp(w, 500);
    startAttack(w, 90, 4.0, "line"); const aim2 = SE(w).get(ID).aim; compared = 0;
    for (let lat = -1.6; lat <= 1.6; lat += 0.1) for (const d of [1.0, 2.0, 4.0, 6.5, 7.2, 8.0]) {
        const q = polar(w, aim2, d), nx = Math.cos(rad(aim2)), ny = Math.sin(rad(aim2)); putPlayerAt(w, q.x + nx * lat, q.y + ny * lat);
        const hit = SE(w).playerHitTest(ID), poly = SE(w).displayPolygon(ID), body = bodyOf(w);
        const inside = overlaps(poly, body), nearEdge = overlaps(grow(poly, 1.04), body) !== overlaps(grow(poly, 0.96), body); if (nearEdge) continue; compared++;
        assert.equal(hit, inside, `line 横${lat.toFixed(1)} 距離${d}`);
    }
    assert.ok(compared > 120, "比べた点の数 " + compared);
    placeAt(w, aim2, 4); assert.equal(SE(w).playerHitTest(ID), true, "正面");
    { const q = polar(w, aim2, 4), nx = Math.cos(rad(aim2)), ny = Math.sin(rad(aim2)); putPlayerAt(w, q.x + nx * 1.1, q.y + ny * 1.1); assert.equal(SE(w).playerHitTest(ID), false, "1歩(1.1マス)横へずれれば外れる"); }
});

test("時間: 溜め → 判定 → 硬直(cone 54/6/42・line 66/6/54 フレーム)。ダメージは判定の最初のフレームに1回だけ。終わると Cooldown", () => {
    for (const [kind, deg, dist, spec] of [["cone", 90, 1.8, { w: 54, a: 6, r: 42 }], ["line", 90, 4.5, { w: 66, a: 6, r: 54 }]]) {
        const { w } = strongWorld({ cooldown: 33 }); const seen = [];
        SE(w).onPhase(rec => seen.push({ ...rec, at: SE(w).diagnostics().frame }));
        const hp0 = hp(w); placeAt(w, deg, dist); w.frames(1);
        assert.ok(until(w, () => seen.some(r => r.phase === "end"), 400), "最後まで進む");
        const by = p => seen.find(r => r.phase === p);
        assert.equal(by("active").at - by("windup").at, spec.w, kind + " 溜め"); assert.equal(by("recovery").at - by("active").at, spec.a, kind + " 判定"); assert.equal(by("end").at - by("recovery").at, spec.r, kind + " 硬直");
        assert.equal(by("end").damaged, true); assert.ok(hp(w) < hp0, "ダメージを受けた");
        const dmg = SE(w).getLog().filter(e => e.type === "damage"); assert.equal(dmg.length, 1, "ダメージは1回だけ(判定が6フレーム続いても)");
        assert.equal(dmg[0].frame, by("active").at + 1, "ダメージは判定(active)の最初のフレーム");
        const st = FCs(w).getState().enemies.find(e => e.eventId === ID); assert.equal(st.attacks, 1); assert.ok(st.cooldown > 0 && st.cooldown <= 33, "終わったあと Cooldown");
        assert.ok(hp(w) > 0);
    }
});

test("よけ方: cone は横・後ろへ動けば当たらず、その場なら当たる。line は1歩の横ずれで当たらない。溜めの間、向きは追いかけない(固定)", () => {
    const run = (kind, deg, dist, move) => {
        const { w } = strongWorld(); placeAt(w, deg, dist); w.frames(1); assert.ok(SE(w).get(ID), "始まる"); assert.equal(SE(w).get(ID).kind, kind);
        const aim = SE(w).get(ID).aim, before = SE(w).displayPolygon(ID); w.frames(15);
        const dest = move(w, aim); if (dest) putPlayerAt(w, dest.x, dest.y);
        w.frames(1); assert.deepEqual(SE(w).displayPolygon(ID), before, "プレイヤーが動いても、向きは追いかけない(予兆の形は同じ)");
        const hp0 = hp(w); finishAttack(w); return hp0 - hp(w);
    };
    assert.ok(run("cone", 90, 1.6, () => null) > 0, "cone: その場は当たる");
    assert.equal(run("cone", 90, 1.6, (w, aim) => polar(w, aim + 90, 1.6)), 0, "cone: 真横へ動けば当たらない");
    assert.equal(run("cone", 90, 1.6, (w, aim) => polar(w, aim + 135, 1.6)), 0, "cone: 斜め後ろ");
    assert.equal(run("cone", 90, 1.6, (w, aim) => polar(w, aim + 180, 1.2)), 0, "cone: 後ろへ回る");
    assert.ok(run("line", 90, 4.5, () => null) > 0, "line: その場は当たる");
    assert.equal(run("line", 90, 4.5, (w, aim) => { const q = polar(w, aim, 4.5); return { x: q.x + Math.cos(rad(aim)) * 1.1, y: q.y + Math.sin(rad(aim)) * 1.1 }; }), 0, "line: 1歩の横ずれ");
    assert.ok(run("line", 90, 4.5, (w, aim) => polar(w, aim, 8.2)) === 0, "line: 長さの外(体の1x1を含めて)へ下がる");
});

test("壁・閉じた扉: 間に壁があれば攻撃を始めない。溜めの途中で壁ができれば、予兆は壁で切れて、壁の向こうには当たらない。壁の手前は当たる", () => {
    const wallBetween = (w, kind) => { const e = ev(w, ID); for (let dy = -2; dy <= 2; dy++) { if (kind === "region") setRegion(w, e.x + 2, e.y + dy, 255); else addWallEvent(w, kind, e.x + 2, e.y + dy); } };
    for (const kind of ["region", "CombatWall"]) {
        // 始める前に壁: 始まらない(予兆も出ない)
        let { w } = strongWorld(); wallBetween(w, kind); placeAt(w, 90, 4.0); w.frames(5);
        assert.equal(SE(w).get(ID), null, kind + ": 壁ごしでは攻撃を始めない"); assert.equal(SE(w).telegraphs().length, 0);
        // 始まったあとに壁: 予兆が切れ、壁の向こうは当たらない
        ({ w } = strongWorld()); placeAt(w, 90, 4.0); w.frames(1); assert.equal(SE(w).get(ID).kind, "line"); const full = SE(w).displayPolygon(ID); wallBetween(w, kind); w.frames(2);
        const clipped = SE(w).displayPolygon(ID); const len = poly => Math.max(...poly.map(p => Math.hypot(p.x - SE(w).get(ID).origin.x, p.y - SE(w).get(ID).origin.y)));
        assert.ok(len(clipped) < len(full) - 2, kind + ": 予兆は壁で切れる " + len(clipped) + " < " + len(full));
        const hp0 = hp(w); finishAttack(w); assert.equal(hp0, hp(w), kind + ": 壁の向こうのプレイヤーは当たらない");
        // 壁の手前(敵と壁のあいだ)のプレイヤーは当たる
        ({ w } = strongWorld()); wallBetween(w, kind); placeAt(w, 90, 1.2); w.frames(1);
        assert.equal(SE(w).get(ID)?.kind, "cone", kind + ": 壁の手前なら始まる"); const hp1 = hp(w); finishAttack(w); assert.ok(hp(w) < hp1, kind + ": 壁の手前は当たる");
    }
});

test("敵の視界との関係: 視野角の外・壁ごしでは始めない(見えている間だけ)。見えていれば始める。溜め中に見失っても、撃ち終える", () => {
    let { w } = strongWorld({ perception: true }); const e = ev(w, ID);
    e.setDirection(4);                                              // 敵は西向き。プレイヤーは東(後ろ): 視野角(既定の範囲)の外
    placeAt(w, 90, 4); w.frames(6); assert.equal(SE(w).get(ID), null, "視野角の外では見つけない → 攻撃しない");
    ({ w } = strongWorld({ perception: true })); ev(w, ID).setDirection(6); placeAt(w, 90, 4); w.frames(3);
    assert.ok(SE(w).get(ID), "正面に見えていれば始める");
    placeAt(w, 90, 20); w.frames(2); assert.ok(SE(w).get(ID), "溜めの途中で見失っても、始めた攻撃は撃ち終える(従来の溜めと同じ)");
    const aim = SE(w).get(ID).aim; w.frames(3); assert.equal(SE(w).get(ID).aim, aim, "向きは変わらない");
    finishAttack(w);
    ({ w } = strongWorld({ perception: true })); ev(w, ID).setDirection(6); const ee = ev(w, ID); for (let dy = -2; dy <= 2; dy++) setRegion(w, ee.x + 2, ee.y + dy, 255);
    placeAt(w, 90, 4); w.frames(6); assert.equal(SE(w).get(ID), null, "壁ごしの視界では始めない");
});

test("選び方: 近い(≤2.3)= cone / 遠い(2.0〜6.2)= line / 範囲の外は始めない / 両方当てはまる間は交互。Cooldown の間は始めない", () => {
    let { w } = strongWorld(); placeAt(w, 90, 7.5); w.frames(4); assert.equal(SE(w).get(ID), null, "6.2マスより遠い");
    placeAt(w, 90, 1.2); w.frames(1); assert.equal(SE(w).get(ID).kind, "cone"); finishAttack(w);
    ({ w } = strongWorld({ cooldown: 12 })); placeAt(w, 90, 5); w.frames(1); assert.equal(SE(w).get(ID).kind, "line");
    const kinds = []; SE(w).onPhase(r => { if (r.phase === "windup") kinds.push(r.kind); });
    finishAttack(w); const hpAfter = hp(w);
    // 終わった直後(Cooldown 中)は始めない
    putPlayerAt(w, ...Object.values(polar(w, 90, 2.1))); w.frames(5); assert.equal(SE(w).get(ID), null, "Cooldown の間は始めない");
    topUp(w); w.frames(10);
    for (let i = 0; i < 3 && kinds.length < 3; i++) { assert.ok(until(w, () => SE(w).get(ID), 60), "Cooldown が明ければ始める"); finishAttack(w); topUp(w); w.frames(2); }
    assert.equal(kinds.length >= 3, true); assert.notEqual(kinds[0], kinds[1], "両方当てはまる距離(2.1)では交互"); assert.notEqual(kinds[1], kinds[2]);
    assert.ok(hpAfter > 0);
});

test("中断: cone は溜めの間に100以上の損害で中断(ダメージなし・短い硬直)。line は中断されない(強い溜め)", () => {
    let { w } = strongWorld(); const hp0 = (placeAt(w, 90, 1.6), w.frames(1), hp(w)); assert.equal(SE(w).get(ID).kind, "cone");
    w.frames(10); setEnemyHp(w, 380); w.frames(1);
    assert.equal(SE(w).get(ID).interrupted, true); assert.equal(SE(w).get(ID).phase, "recovery");
    assert.ok(SE(w).telegraphs().length === 0, "中断で予兆は消える");
    finishAttack(w); assert.equal(hp(w), hp0, "中断した攻撃はダメージを出さない");
    const log = SE(w).getLog(); assert.equal(log.find(e => e.type === "end").reason, "interrupted");
    // 99 では中断しない
    ({ w } = strongWorld()); placeAt(w, 90, 1.6); w.frames(1); w.frames(10); setEnemyHp(w, 401); w.frames(1); assert.equal(SE(w).get(ID).interrupted, false);
    // line は 400 の損害でも中断しない(その場なら当たる)
    ({ w } = strongWorld()); const h1 = hp(w); placeAt(w, 90, 4.5); w.frames(1); w.frames(10); setEnemyHp(w, 100); w.frames(1);
    assert.equal(SE(w).get(ID).interrupted, false); assert.equal(SE(w).get(ID).phase, "windup"); finishAttack(w); assert.ok(hp(w) < h1, "line は撃ち終える");
});

test("死亡: 溜めの途中・判定中に敵が倒れたら、攻撃は取り消され、ダメージも予兆も残らない", () => {
    for (const waitFrames of [20, 70]) {                         // 20 = 溜めの途中 / 70 = line の判定中(66+)・cone なら硬直
        const { w } = strongWorld(); const h0 = hp(w); placeAt(w, 90, 4.5); w.frames(1); w.frames(waitFrames);
        setEnemyHp(w, 0); w.frames(2);
        assert.equal(SE(w).get(ID), null, "攻撃は消える"); assert.equal(SE(w).telegraphs().length, 0, "予兆も消える");
        const dmgBefore = h0 - hp(w); w.frames(80); assert.equal(h0 - hp(w), dmgBefore, "その後ダメージは増えない");
        assert.ok(!FCs(w).listEnemies().includes(ID), "FieldCombat の敵からも外れる");
    }
});

test("後片付け: 戦闘の終了(撤退・勝利・敗北は end を通る)・マップ移動・プレイヤーの死亡で、進行中の攻撃はすべて取り消し、ダメージは出さない", () => {
    let { w } = strongWorld(); placeAt(w, 90, 4.5); w.frames(1); w.frames(30); assert.ok(SE(w).get(ID)); const h0 = hp(w);
    FCs(w).end("test"); assert.equal(SE(w).get(ID), null); assert.equal(SE(w).telegraphs().length, 0); w.frames(120); assert.equal(hp(w), h0, "戦闘が終わったあとはダメージなし");
    ({ w } = strongWorld()); placeAt(w, 90, 4.5); w.frames(1); w.frames(30); const h1 = hp(w);
    w.enterMap(4, 12, 25); w.frames(3); assert.equal(SE(w).list().length, 0, "マップ移動(Game_Map.setup)で取り消す"); w.frames(120); assert.equal(hp(w), h1);
    ({ w } = strongWorld()); placeAt(w, 90, 4.5); w.frames(1); w.frames(20);
    w.run("globalThis.__pd = (window.ProjectR = window.ProjectR || {}).PlayerDeath; window.ProjectR.PlayerDeath = Object.assign({}, window.__pd, { isDead: () => true });");
    w.frames(2); assert.equal(SE(w).get(ID), null, "プレイヤーが死んだら攻撃は取り消す"); assert.equal(SE(w).getLog().filter(e => e.type === "end").pop().reason, "playerDead");
    w.run("window.ProjectR.PlayerDeath = window.__pd;");
    ({ w } = strongWorld()); placeAt(w, 90, 4.5); w.frames(1); w.frames(10); FCs(w).detachEnemy(ID); assert.equal(SE(w).get(ID), null, "撤退(detach)でも取り消す");
});

test("既存の敵は変わらない: 強敵でない敵は従来の予約・溜め・近接(ProjectR_EnemyAttack)のまま。強敵の plugin は触らない", () => {
    const { w } = strongWorld(); FCs(w).detachEnemy(ID);
    const r = FCs(w).attachEnemy(ID, { windupFrames: 20, cooldownFrames: 60, reach: 1.5, chase: false }); assert.equal(r.ok, true);
    placeAt(w, 90, 1.0); w.frames(2);
    const st = FCs(w).getState().enemies.find(e => e.eventId === ID); assert.equal(st.state, "windup", "従来の溜め");
    assert.equal(w.ctx.ProjectREnemyAttack.list().length, 1, "従来の予約が使われている"); assert.equal(SE(w).list().length, 0); assert.equal(SE(w).diagnostics().serial, 0, "強敵の plugin は何もしていない");
    // タグの読み取り(<fieldEnemy: strong=...>)
    const src = read("js/plugins/ProjectR_FieldCombat.js"); assert.ok(/key === "strong"/.test(src));
});

test("ソース: ダメージ式・Hendrix・敵の視界・経路探索・CombatOcclusion には触れていない(強敵の plugin は呼ぶだけ)", () => {
    const src = read("js/plugins/ProjectR_FieldStrongEnemy.js");
    assert.ok(!/ProjectRCardModifiers|MaithlCalculateDamage|setHp\(|gainHp\(/.test(src), "ダメージ式を自前で持たない(Hendrix の UpdateEventHp を通す)");
    assert.ok(/UpdateEventHp/.test(src) && /hasLineToPolygon/.test(src), "既存の経路・壁の判定を使う");
    for (const f of ["js/plugins/ProjectR_CombatOcclusion.js", "js/plugins/ProjectR_EnemyAttack.js"]) assert.ok(!/FieldStrongEnemy/.test(read(f)), f + " は変えていない");
    assert.ok(!/[?]{2}=|\|\|=|\.at\(|replaceAll|#[a-z]\w*\s*[=;(]/.test(src.replace(/\/\*[\s\S]*?\*\//, "")), "NW.js 0.48(Chromium 85)で使えない構文を含まない");
});
