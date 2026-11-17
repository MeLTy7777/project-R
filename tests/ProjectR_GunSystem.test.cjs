"use strict";
// Stage 6D: 銃(ProjectR_GunSystem)の至近距離(銃口より手前の敵)と、ゲージの与ダメージ(遅れて反映されるHP)。
// 実エンジン(実Map004 + 全plugin)で、銃の発射から通して確認する。MZ実機・描画は対象外(実機の確認は tools/mz_cdp/field_gun_gauge_verify.cjs)。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { zetsuWorld, attachHpBars, hpOf, equip, player, GUN_ID, SWORD_ID, read } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const ENEMIES = [2, 3, 4, 5, 6];
const ev = (w, id) => w.ctx.$gameMap.event(id);
const gunApi = w => w.ctx.ProjectRGunSystem;
const rad = degree => degree * Math.PI / 180;
// 乱数は固定(回避・会心・分散なし)。敵のHPバーは 100000 から。他の敵は遠くへ置く。
function gunWorld({ x = 11, y = 12 } = {}) {
    const w = zetsuWorld({ level: 1, x, y });
    attachHpBars(w, ENEMIES, 100000); equip(w, GUN_ID);
    w.run("Math.random = () => 0.5;"); w.frames(2);
    return w;
}
const map = w => w.ctx.$gameMap;
const passable = (w, x, y) => map(w).checkPassage(x, y, 0x0f);
// 周り(半径3マス)がすべて通れる場所(敵を輪に並べる)
function openSpot(w) {
    const m = map(w);
    for (let y = 4; y < m.height() - 4; y++) for (let x = 4; x < m.width() - 4; x++) {
        let ok = true; for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3 && ok; dx++) if (!passable(w, x + dx, y + dy)) ok = false;
        if (ok && !map(w).events().some(e => e && !e._erased && Math.abs(e._realX - x) <= 4 && Math.abs(e._realY - y) <= 4)) return { x, y };
    }
    return null;
}
const park = (w, keep) => { let k = 0; for (const id of ENEMIES) if (id !== keep) { const e = ev(w, id); e.locate(1 + k, 1); e._realX = 1 + k; e._realY = 1; k++; } };
const put = (w, id, x, y) => { const e = ev(w, id); e.locate(Math.round(x), Math.round(y)); e._realX = x; e._realY = y; };
const stand = (w, x, y) => { w.placePlayer(x, y); w.frames(3); player(w).center(player(w)._realX, player(w)._realY); };
const aimAtEvent = (w, id) => { const e = ev(w, id); w.mouse(e.screenX(), e.screenY() - 24); w.frames(1); };
const aimBearing = (w, degree, tiles = 4) => { w.mouse(player(w).screenX() + Math.sin(rad(degree)) * tiles * 48, player(w).screenY() - 24 - Math.cos(rad(degree)) * tiles * 48); w.frames(1); };
const reload = w => { w.ctx.$gameSystem.setGunAmmo(GUN_ID, 7); w.frames(14); };
// 1発撃って、敵(複数)のHPの減りを返す
const shoot = (w, ids) => {
    const before = Object.fromEntries(ids.map(id => [id, hpOf(w, id)]));
    reload(w); const r = gunApi(w).fire("t"); assert.equal(r.ok, true, JSON.stringify(r));
    w.frames(6);
    return Object.fromEntries(ids.map(id => [id, before[id] - hpOf(w, id)]));
};

test("至近距離: 16方向 × 距離(0.7・1.0・1.5・2.0マス)のすべてで、敵の方へ撃てば当たる(従来は真北の約1.6マス以内などで外れた)", () => {
    const w = gunWorld(); const spot = openSpot(w); assert.ok(spot, "前提: 周りが空いた場所がある");
    park(w, 4); stand(w, spot.x, spot.y);
    const misses = [];
    for (let angle = 0; angle < 360; angle += 22.5) for (const d of [0.7, 1.0, 1.5, 2.0]) {
        put(w, 4, spot.x + Math.sin(rad(angle)) * d, spot.y - Math.cos(rad(angle)) * d); w.frames(2); aimAtEvent(w, 4);
        const loss = shoot(w, [4])[4];
        if (!(loss > 0)) misses.push([angle, d]);
        w.frames(2);
    }
    assert.deepEqual(misses, [], "外れた (角度, 距離)");
});

test("至近距離でも、ダメージ・弾数・間隔・射程は変わらない(1発のダメージは遠くへ撃ったときと同じ。弾は1発減り、間隔は従来どおり。当たった弾は消え、外れた弾は射程まで飛ぶ)", () => {
    const w = gunWorld(); const spot = openSpot(w); park(w, 4); stand(w, spot.x, spot.y);
    put(w, 4, spot.x, spot.y - 3.0); w.frames(2); aimAtEvent(w, 4); const far = shoot(w, [4])[4];
    put(w, 4, spot.x, spot.y - 1.0); w.frames(2); aimAtEvent(w, 4); w.ctx.$gameSystem.setGunAmmo(GUN_ID, 7); w.frames(14);
    const ammo0 = gunApi(w).status().ammo, before = hpOf(w, 4); assert.equal(gunApi(w).fire("t").ok, true);
    const st = gunApi(w).status(); assert.equal(st.ammo, ammo0 - 1, "弾は1発だけ減る"); assert.equal(st.cooldown, gunApi(w).config.cooldown, "発射の間隔は従来どおり");
    w.frames(6); const near = before - hpOf(w, 4);
    assert.ok(far > 0); assert.equal(near, far, "至近距離のダメージは、遠くのときと同じ(式は変わらない)");
    assert.equal(gunApi(w).getActiveBullets().length, 0, "当たった弾は消える(1発1Hit)");
    // 敵のいない方へ撃った弾は、射程(bulletFrames)まで飛び続ける(至近距離の判定で消えたりしない)
    put(w, 4, spot.x + 3, spot.y + 3); w.frames(2); aimBearing(w, 0); reload(w); assert.equal(gunApi(w).fire("t").ok, true); w.frames(2);
    assert.equal(gunApi(w).getActiveBullets().length, 1, "外れた弾は飛んでいる(至近距離の判定で消えない)"); w.frames(gunApi(w).config.bulletFrames + 2); assert.equal(gunApi(w).getActiveBullets().length, 0, "射程(bulletFrames)で消える");
});

test("1発1Hit: 同じ線上に2体いても、至近距離の弾は1体にだけ当たる。線から外れた敵・後ろの敵には当たらない", () => {
    const w = gunWorld(); const spot = openSpot(w); park(w, 4); stand(w, spot.x, spot.y);
    put(w, 4, spot.x, spot.y - 0.9); put(w, 5, spot.x, spot.y - 1.6); w.frames(2); aimBearing(w, 0);
    const both = shoot(w, [4, 5]); assert.equal(Object.values(both).filter(v => v > 0).length, 1, "どちらか1体だけ: " + JSON.stringify(both));
    // 北へ撃つ: 東隣の敵・南(後ろ)の敵には当たらない
    park(w, 4); put(w, 4, spot.x + 1.5, spot.y); put(w, 5, spot.x, spot.y + 1.2); w.frames(2); aimBearing(w, 0);
    const side = shoot(w, [4, 5]); assert.deepEqual(side, { 4: 0, 5: 0 }, "線上にいない敵は無傷");
});

test("壁: 体と弾の間に壁があれば、至近距離でも当たらない。壁の手前の敵には当たる", () => {
    const w = gunWorld();
    // 北隣が壁(通れない)で、その向こうも通れる場所を探す
    const m = map(w); let found = null;
    for (let y = 3; y < m.height() - 3 && !found; y++) for (let x = 3; x < m.width() - 3 && !found; x++) {
        if (passable(w, x, y + 1) && passable(w, x, y) && !passable(w, x, y - 1) && passable(w, x, y - 2) && !m.events().some(e => e && !e._erased && Math.abs(e._realX - x) <= 3 && Math.abs(e._realY - y) <= 3)) found = { x, y };
    }
    assert.ok(found, "前提: 北隣が壁の場所がある");
    park(w, 4);
    // 壁の向こうの敵(壁の北 = y-2)には、体のすぐ北が壁なので当たらない
    stand(w, found.x, found.y); put(w, 4, found.x, found.y - 2); w.frames(2); aimBearing(w, 0);
    assert.equal(shoot(w, [4])[4], 0, "壁の向こうの敵には当たらない");
    // 壁の手前の敵(体と壁の間)に当たる: 1マス南に立ち、壁との間(y)の敵を撃つ
    stand(w, found.x, found.y + 1); put(w, 4, found.x, found.y); w.frames(2); aimBearing(w, 0);
    assert.ok(shoot(w, [4])[4] > 0, "壁の手前の敵には当たる");
});

// ---- ゲージ(遅れて反映されるHP) ----
// 実ゲームの Hendrix は HP を次のフレームで減らす(同じ呼び出しの前後では差が 0)。それを再現する: HP の読み取りを「前のフレームの終わりの値」にする。
function lagHp(w) {
    const m = map(w), real = m.getCurrentEventHp.bind(m), seen = new Map();
    const refresh = () => { for (const e of m.events()) if (e && e.eventId) seen.set(e.eventId(), real(e.eventId())); };
    m.getCurrentEventHp = id => (seen.has(id) ? seen.get(id) : real(id));
    refresh();
    const proto = w.ctx.Game_Map.prototype, original = proto.update;
    proto.update = function() { refresh(); return original.apply(this, arguments); };
    return { real };
}
const gauge = w => w.ctx.ProjectRUltimateGauge;
const realHp = (w, id) => ev(w, id).hpBar?.currentHp ?? hpOf(w, id);
test("ゲージ(Stage 6D): HP が次のフレームで減る実ゲームと同じ条件でも、銃の命中が与ダメージとしてゲージに1回だけ加算される(0.0025 × 実ダメージ)", () => {
    const w = gunWorld(); const spot = openSpot(w); lagHp(w); park(w, 4); stand(w, spot.x, spot.y);
    put(w, 4, spot.x + 2, spot.y); w.frames(3); aimAtEvent(w, 4);
    const g0 = gauge(w).getUltimateGauge(); reload(w); const lossBefore = hpOf(w, 4);
    assert.equal(gunApi(w).fire("t").ok, true);
    for (let i = 0; i < 8 && gauge(w).getPendingDamageCount() === 0; i++) w.frames(1);                  // 当たったフレーム(HPはまだ減って見えない)
    assert.equal(gauge(w).getPendingDamageCount(), 1, "反映を待っている"); assert.equal(gauge(w).getUltimateGauge(), g0, "当たったフレームではまだ加算しない");
    w.frames(6);
    const dmg = lossBefore - hpOf(w, 4); assert.equal(dmg, 64, "実ダメージ(銃 ATK で 64)");
    assert.ok(Math.abs(gauge(w).getUltimateGauge() - (g0 + dmg * 0.0025)) < 1e-9, `加算 = 実ダメージ × 0.0025: ${gauge(w).getUltimateGauge() - g0}`);
    assert.equal(gauge(w).getPendingDamageCount(), 0, "待ちは終わった"); const after = gauge(w).getUltimateGauge(); w.frames(20); assert.equal(gauge(w).getUltimateGauge(), after, "あとから二重に加算されない");
    assert.equal(gauge(w).getGainStats().last.source, "damage:gun");
});

test("ゲージ(Stage 6D): 回避(ダメージ 0)は加算しない・待ちは捨てる。複数の敵は別々に1回ずつ・同じフレームに複数当たっても実際に減った分だけ・連続して撃てば撃った分だけ", () => {
    const w = gunWorld(); const spot = openSpot(w); lagHp(w); park(w, 4); stand(w, spot.x, spot.y);
    // 回避: 乱数 0 → 敵の回避率(5%)より小さい → 回避になりダメージ 0
    put(w, 4, spot.x + 2, spot.y); w.frames(3); aimAtEvent(w, 4); const g0 = gauge(w).getUltimateGauge();
    w.run("Math.random = () => 0;"); reload(w); const h0 = hpOf(w, 4); assert.equal(gunApi(w).fire("t").ok, true); w.frames(14);
    assert.equal(hpOf(w, 4), h0, "回避: HPは減らない"); assert.equal(gauge(w).getUltimateGauge(), g0, "回避はゲージに加算しない"); assert.equal(gauge(w).getPendingDamageCount(), 0, "待ちは捨てる(残らない)");
    w.run("Math.random = () => 0.5;");
    // 連続して2発(別々の弾): それぞれ1回ずつ = 実ダメージの合計
    const h1 = hpOf(w, 4); const g1 = gauge(w).getUltimateGauge();
    reload(w); assert.equal(gunApi(w).fire("t").ok, true); w.frames(14); assert.equal(gunApi(w).fire("t").ok, true); w.frames(14);
    const total = h1 - hpOf(w, 4); assert.equal(total, 128, "2発とも当たった"); assert.ok(Math.abs(gauge(w).getUltimateGauge() - (g1 + total * 0.0025)) < 1e-9, "2発分(二重にも、取りこぼしもない)");
    // 複数の敵(薙ぎ払いが2体に当たる): 敵ごとに1回ずつ
    const sword = w.ctx.ProjectRSwordSystem; park(w, 4); put(w, 4, spot.x + 1.5, spot.y); put(w, 5, spot.x - 1.5, spot.y); w.frames(3); aimBearing(w, 90);
    const g2 = gauge(w).getUltimateGauge(), a0 = hpOf(w, 4), b0 = hpOf(w, 5);
    assert.equal(sword.swing("t", { anyWeapon: true, step: 3, damageScale: 2, sector: { radius: 4, arc: 190, frames: 15, passes: [{ offset: 0, delay: 1 }, { offset: 180, delay: 7 }] } }).ok, true); w.frames(40);
    const la = a0 - hpOf(w, 4), lb = b0 - hpOf(w, 5); assert.ok(la > 0 && lb > 0, "2体に当たった: " + [la, lb]);
    assert.ok(Math.abs(gauge(w).getUltimateGauge() - (g2 + (la + lb) * 0.0025)) < 1e-9, "敵ごとに1回ずつ(合計 = 実ダメージ × 0.0025。強撃の2回目の扇で二重にならない)");
    assert.equal(gauge(w).getPendingDamageCount(), 0);
});

test("ゲージ(Stage 6D): 従来の経路は変わらない: 同期にHPが減る(Nodeの世界)ときはその場で1回。ゲージの状態が無いときは待たない。戦闘の終了で待ちは消える", () => {
    const w = gunWorld(); const spot = openSpot(w); park(w, 4); stand(w, spot.x, spot.y);
    put(w, 4, spot.x + 2, spot.y); w.frames(3); aimAtEvent(w, 4); const g0 = gauge(w).getUltimateGauge(); reload(w); assert.equal(gunApi(w).fire("t").ok, true);
    for (let i = 0; i < 8 && gauge(w).getUltimateGauge() === g0; i++) w.frames(1);                       // 当たったフレームに、その場で加算される
    assert.ok(Math.abs(gauge(w).getUltimateGauge() - (g0 + 64 * 0.0025)) < 1e-9, "同期に減るときは、待たずに加算(従来どおり)"); assert.equal(gauge(w).getPendingDamageCount(), 0);
    // 待ちは、戦闘の終了で消える(次の戦闘へ持ち越さない)
    const w2 = gunWorld(); lagHp(w2); const s2 = openSpot(w2); park(w2, 4); stand(w2, s2.x, s2.y); put(w2, 4, s2.x + 2, s2.y); w2.frames(3); aimAtEvent(w2, 4); reload(w2);
    assert.equal(gunApi(w2).fire("t").ok, true); for (let i = 0; i < 8 && gauge(w2).getPendingDamageCount() === 0; i++) w2.frames(1); assert.equal(gauge(w2).getPendingDamageCount(), 1);
    w2.ctx.ProjectRCardDeck.endBattle(); assert.equal(gauge(w2).getPendingDamageCount(), 0, "戦闘の終了で待ちを消す");
    // 実装の前提(ソース): 加算式・addUltimateGauge は攻撃の plugin に持たせない(trackDamage を呼ぶだけ)
    for (const file of ["js/plugins/ProjectR_GunSystem.js", "js/plugins/ProjectR_SwordSystem.js"]) assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\//g, ""), /addUltimateGauge|damageGainRate/, file);
});

console.log(`${passed} Gun system tests passed`);
