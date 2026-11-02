"use strict";
// Phase Apollo-A8: 弓の3枚(黄金の矢 / エロスの矢 / ギガース殺し)の「射程：∞」。実エンジン(実Map004の床を壁の無い 200x60 の広い地図に置き換え + 全plugin + 実Hendrix/DotMove)。
// 従来の上限(黄金の矢=40マス、エロスの矢=2秒/24マスとビーム12マス、ギガース殺し=40マス、Event安全網=300frame)を超える遠くの敵に当たること、
// 壁・地図の端・寿命の上限でちゃんと止まり一時Event/VFXが残らないこと、F6で有限の射程にも戻せること(既定は∞のまま)を確かめる。
// MZ実機(描画・実入力)は対象外 → tools/mz_cdp/apollo_a8_range_verify.cjs。
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, fireCard, aimDegree, lost, consumedHand, pile, center, placeEnemy, parkOthers, player, setRegion, KEYS } = fx;

const GOLDEN = "apollo_golden_volley", EROS = "apollo_eros_arrow", GIGAS = "apollo_gigas_slayer";
const BIG = { width: 200, height: 60 };
const NOTE = { [GOLDEN]: /projectRGoldenVolley/, [EROS]: /projectRErosArrow/, [GIGAS]: /projectRGigasArrow/ };
const API = { [GOLDEN]: "ProjectRApolloGoldenVolley", [EROS]: "ProjectRApolloErosArrow", [GIGAS]: "ProjectRApolloGigasSlayer" };
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const world = (card, level, opts = {}) => cardWorld(card, { level, bigMap: BIG, x: 12, y: 30, ...opts });
const api = (w, card) => w.ctx[API[card]];
const override = (w, card, scope, key, value) => { const r = w.ctx.ProjectRCardBalance.setOverride(card, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const arrowEvents = (w, card) => w.ctx.$gameMap.events().filter(e => e && e.event && NOTE[card].test(e.event().note || ""));
const beamEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRErosBeam/.test(e.event().note || ""));
const busy = (w, card) => {
    const a = api(w, card);
    if (arrowEvents(w, card).length || beamEvents(w).length) return true;
    if (a.isPending && a.isPending()) return true;
    if (card === GIGAS && a.getShots().length) return true;
    if (card === GOLDEN && (a.getBeam() || a.getActiveArrows().length)) return true;
    if (card === EROS && (a.getBeam() || a.getActiveArrows().length)) return true;
    return false;
};
// 全部の矢・ビームが消えるまで進める。かかったフレーム数を返す(上限で諦めたら -1)。
const settle = (w, card, max = 1200) => { for (let i = 0; i < max; i++) { if (!busy(w, card)) return i; frames(w, 1); } return -1; };
const hold = (w, ms = 40) => { const [code, keycode] = KEYS.Q; player(w).center(player(w)._realX, player(w)._realY); w.keyDown(code, keycode); frames(w, ms); w.keyUp(code, keycode); frames(w, 1); };
// 右(狙い90度)へ dx マスの位置に敵を置く。他は退避(通り道から外れた左下)。
const prep = (w, enemies) => {
    for (const id of [3, 4, 5, 6]) placeEnemy(w, id, 2 + id, 58);
    const c = center(w);
    for (const [id, dx, dy = 0] of enemies) placeEnemy(w, id, c.x + dx, c.y + dy);
    aimDegree(w, 90, 3);
    return c;
};
const wallAt = (w, dx) => { const c = center(w); for (let y = Math.floor(c.y) - 8; y <= Math.floor(c.y) + 8; y++) setRegion(w, Math.floor(c.x) + dx, y, 255); };
const cleanState = (w, card) => {
    frames(w, 180); // 命中の一瞬の演出(burst / particles)が自然に終わるまで待つ
    assert.equal(arrowEvents(w, card).length, 0, "矢のEventが残っていない");
    assert.equal(beamEvents(w).length, 0, "ビームの区間Eventが残っていない");
    const keys = plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /apollo_(volley|eros|gigas)/.test(k) && /charge|beam/.test(k)); // 続くVFX(チャージ・ビーム)。一瞬の演出は数えない assert.equal(keys.length, 0, "続くVFX(チャージ・ビーム)が残っていない: " + keys);
};

test("前提: 広い地図は 200x60。従来の上限(40マス/24マス)を十分に超える。射程の既定は3枚とも 0 = ∞", () => {
    for (const card of [GOLDEN, EROS, GIGAS]) {
        const w = world(card, 1);
        assert.equal(w.ctx.$gameMap.width(), 200); assert.equal(w.ctx.$gameMap.height(), 60);
        const b = w.ctx.ProjectRCardBalance;
        const constants = plain(b.describe(card));
        const text = JSON.stringify(constants);
        if (card !== EROS) assert.ok(text.includes("bowRangeTiles") && text.includes("bowBeamRangeTiles"), card + " のF6に射程の項目");
        else assert.ok(text.includes("bowBeamRangeTiles") && text.includes("projectileLifetimeSeconds"), "エロスのF6に寿命とビーム射程");
    }
    const g = world(GOLDEN, 3), e = world(EROS, 3), s = world(GIGAS, 3);
    assert.equal(g.ctx.ProjectRApolloGoldenVolley.RANGE_TILES, 0);
    assert.ok(g.ctx.ProjectRApolloGoldenVolley.EFFECTIVE_RANGE_TILES > 100, "∞ = 地図の対角線までの有限の値: " + g.ctx.ProjectRApolloGoldenVolley.EFFECTIVE_RANGE_TILES);
    assert.ok(e.ctx.ProjectRApolloErosArrow.mapReach() > 100); assert.equal(e.ctx.ProjectRApolloErosArrow.config(3).beamRange, 0);
    assert.equal(s.ctx.ProjectRApolloGigasSlayer.config(3).beamRange, 0);
    assert.equal(e.ctx.ProjectRApolloErosArrow.config(1).lifetimeSeconds, 0, "エロスの矢の寿命も 0 = ∞");
});

// ───────────────────────── 黄金の矢 ─────────────────────────
test("黄金の矢 Lv1: 100マス先(従来の40マスの2.5倍)の敵に当たる。矢は命中・端で消え、Eventが残らず、消費は1回", () => {
    const w = world(GOLDEN, 1);
    prep(w, [[3, 100]]);
    fireCard(w, GOLDEN);
    const took = settle(w, GOLDEN);
    assert.ok(took > 0, "寿命の上限(3500frame)までに終わる: " + took);
    assert.equal(lost(w, 3), 50, "中央の矢が1本当たって50ダメージ(扇の左右は外れる)");
    assert.equal(consumedHand(w, GOLDEN), 4); assert.equal(pile(w, GOLDEN).length, 1);
    cleanState(w, GOLDEN);
});

test("黄金の矢 Lv1: 当たる敵がいなければ、矢は地図の端まで飛んで消える(不死の矢にならない)。全部外れは非消費", () => {
    const w = world(GOLDEN, 1);
    prep(w, []);
    fireCard(w, GOLDEN);
    let maxX = 0;
    for (let i = 0; i < 1500 && busy(w, GOLDEN); i++) { for (const a of arrowEvents(w, GOLDEN)) maxX = Math.max(maxX, a._realX); frames(w, 1); }
    assert.equal(busy(w, GOLDEN), false, "1500frame(25秒)以内に消える");
    assert.ok(maxX > 150, "従来の40マスを超えて、地図の右の端近くまで飛ぶ: " + maxX);
    assert.equal(consumedHand(w, GOLDEN), 5, "全部外れは消費しない"); assert.equal(plain(api(w, GOLDEN).getLastResult()).reason, "missed");
    cleanState(w, GOLDEN);
});

test("黄金の矢: 壁(Region 255)は通り抜けない。60マス先の壁の向こうは無傷、壁が無ければ当たる", () => {
    const w = world(GOLDEN, 1);
    prep(w, [[3, 100]]); wallAt(w, 60);
    fireCard(w, GOLDEN); assert.ok(settle(w, GOLDEN) > 0);
    assert.equal(lost(w, 3), 0); assert.equal(consumedHand(w, GOLDEN), 5);
    cleanState(w, GOLDEN);
});

test("黄金の矢 Lv3: ビームは100マス先まで届く(当たりは地図の端まで)。絵(VFX)の長さは画面に映る範囲で止める。壁で遮られる", () => {
    const w = world(GOLDEN, 3);
    prep(w, [[3, 100]]);
    const plays = [], pv = w.ctx.ProjectRPresentationVfx, play = pv.play;
    pv.play = (...a) => { const r = play.apply(pv, a); plays.push(a); return r; };
    hold(w);
    const beam = plain(api(w, GOLDEN).getBeam());
    assert.ok(beam && beam.limit > 100, "ビームの届く長さ(判定): " + (beam && beam.limit));
    const vr = api(w, GOLDEN).visualReach();
    assert.ok(plays.some(p => p[0] === "apollo_golden.beam" && p[1].length <= vr + 1e-9), "絵の長さは画面の範囲(" + vr + ")まで");
    assert.ok(settle(w, GOLDEN) > 0);
    assert.ok(lost(w, 3) > 0, "100マス先の敵に当たる: " + lost(w, 3));
    cleanState(w, GOLDEN);
    const wall = world(GOLDEN, 3);
    prep(wall, [[3, 100]]); wallAt(wall, 60);
    hold(wall); assert.ok(settle(wall, GOLDEN) > 0);
    assert.equal(lost(wall, 3), 0, "ビームも壁で遮られる"); cleanState(wall, GOLDEN);
});

test("黄金の矢: F6で有限の射程を入れるとそこで止まる(bowRangeTiles / bowBeamRangeTiles)。既定のままなら∞", () => {
    const w = world(GOLDEN, 1);
    override(w, GOLDEN, "constant", "bowRangeTiles", 30);
    prep(w, [[3, 50], [4, 20, 4]]);
    placeEnemy(w, 4, center(w).x + 20, center(w).y);
    placeEnemy(w, 3, center(w).x + 50, center(w).y);
    fireCard(w, GOLDEN); assert.ok(settle(w, GOLDEN) > 0);
    assert.equal(lost(w, 3), 0, "30マスで止まるので50マス先には届かない");
    assert.equal(lost(w, 4), 50, "20マス先には当たる");
    cleanState(w, GOLDEN);
    const b = world(GOLDEN, 3);
    override(b, GOLDEN, "constant", "bowBeamRangeTiles", 20);
    prep(b, [[3, 50]]); hold(b);
    assert.ok(plain(api(b, GOLDEN).getBeam()).limit <= 20 + 1e-6);
    assert.ok(settle(b, GOLDEN) > 0); assert.equal(lost(b, 3), 0);
    assert.equal(b.ctx.ProjectRCardBalance.setOverride(GOLDEN, "constant", "bowRangeTiles", -1).ok, false, "負の値は拒否");
    assert.equal(b.ctx.ProjectRCardBalance.setOverride(GOLDEN, "constant", "bowRangeTiles", 2001).ok, false, "上限 2000");
});

// ───────────────────────── エロスの矢 ─────────────────────────
test("エロスの矢 Lv1: 60マス先(従来の2秒/約24マスの2.5倍)の敵に当たる。矢は消え、消費は1回。追尾の半径3とは別", () => {
    const w = world(EROS, 1);
    prep(w, [[3, 60]]);
    fireCard(w, EROS);
    assert.ok(settle(w, EROS) > 0);
    assert.ok(lost(w, 3) > 0, "60マス先に当たる: " + lost(w, 3));
    assert.equal(consumedHand(w, EROS), 4);
    cleanState(w, EROS);
    assert.equal(plain(api(w, EROS).config(1)).radius, 3, "追尾の半径は3のまま(射程ではない)");
});

test("エロスの矢: 壁(Region 255)を貫通する。30マス先の壁の向こう、60マス先の敵にも当たる", () => {
    const w = world(EROS, 1);
    prep(w, [[3, 60]]); wallAt(w, 30);
    fireCard(w, EROS); assert.ok(settle(w, EROS) > 0);
    assert.ok(lost(w, 3) > 0, "壁を貫通して当たる");
    cleanState(w, EROS);
});

test("エロスの矢: 当たらない矢は地図の端か寿命の上限(3500frame)で必ず消える。一時Eventは0に戻る", () => {
    const w = world(EROS, 3);
    prep(w, []);
    fireCard(w, EROS);
    let maxEvents = 0;
    for (let i = 0; i < 3700 && busy(w, EROS); i++) { maxEvents = Math.max(maxEvents, plain(api(w, EROS).getTempObjectCount()).total); frames(w, 1); }
    assert.equal(busy(w, EROS), false, "3700frame以内にすべて消える");
    assert.ok(maxEvents <= 14 + api(w, EROS).segmentBudget() + 6 + 1 + 6, "一時Eventの同時数は上限以内: " + maxEvents);
    assert.equal(plain(api(w, EROS).getTempObjectCount()).total, 0);
    cleanState(w, EROS);
    assert.ok(api(w, EROS).limits.HARD_LIFETIME_FRAMES < 3600, "寿命の上限はEventの安全網(3600frame)より短い");
});

test("エロスの矢 Lv3: ビームは50マス先(従来の12マスの4倍)の敵に届く。3秒の持続とは別。F6で12マスに戻すと届かない", () => {
    const w = world(EROS, 3);
    prep(w, [[3, 50]]);
    placeEnemy(w, 3, center(w).x + 50, center(w).y + 6); // 矢の通り道から外す(ビームだけを見る)
    aimDegree(w, 90, 3);
    fireCard(w, EROS); frames(w, 3);
    const beam = plain(api(w, EROS).getBeam());
    assert.ok(beam && beam.length > 50, "ビームの届く長さ: " + (beam && beam.length));
    assert.ok(beamEvents(w).length <= api(w, EROS).segmentBudget(), "区間Eventは予算以内(絵は画面に映る範囲まで)");
    // 敵を軸上に置き直す: ビーム(幅0.9)が3秒の間に当たる
    placeEnemy(w, 3, center(w).x + 50, center(w).y);
    assert.ok(settle(w, EROS) > 0);
    assert.ok(lost(w, 3) > 0, "50マス先の敵に当たる");
    cleanState(w, EROS);
    const f = world(EROS, 3);
    override(f, EROS, 3, "bowBeamRangeTiles", 12);
    prep(f, [[3, 50]]); aimDegree(f, 90, 3);
    fireCard(f, EROS); frames(f, 3);
    assert.ok(plain(api(f, EROS).getBeam()).length <= 12 + 1e-6, "有限の射程12はそのまま使える");
});

test("エロスの矢: F6で寿命2秒に戻すと従来どおり届かない(24マス)。既定の0は∞", () => {
    const w = world(EROS, 1);
    override(w, EROS, "constant", "projectileLifetimeSeconds", 2);
    prep(w, [[3, 60]]);
    fireCard(w, EROS); assert.ok(settle(w, EROS) > 0);
    assert.equal(lost(w, 3), 0, "2秒では60マスに届かない");
    assert.equal(consumedHand(w, EROS), 5, "全部外れは消費しない");
    cleanState(w, EROS);
});

// ───────────────────────── ギガース殺し ─────────────────────────
test("ギガース殺し Lv1: 100マス先(従来の40マスの2.5倍)の敵に100ダメージ+弱点。矢は消え、消費は1回", () => {
    const w = world(GIGAS, 1);
    prep(w, [[3, 100]]);
    fireCard(w, GIGAS);
    assert.ok(settle(w, GIGAS) > 0);
    assert.equal(lost(w, 3), 100);
    assert.equal(w.ctx.ProjectRApolloStatus.has("event:3", "gigas_weak"), true, "弱点状態が付く");
    assert.equal(consumedHand(w, GIGAS), 4); assert.equal(pile(w, GIGAS).length, 1);
    cleanState(w, GIGAS);
});

test("ギガース殺し: 壁で止まる(60マス先)。当たらなければ地図の端で消えて非消費", () => {
    const w = world(GIGAS, 1);
    prep(w, [[3, 100]]); wallAt(w, 60);
    fireCard(w, GIGAS); assert.ok(settle(w, GIGAS) > 0);
    assert.equal(lost(w, 3), 0); assert.equal(consumedHand(w, GIGAS), 5); assert.equal(plain(api(w, GIGAS).getLastResult()).reason, "missed");
    cleanState(w, GIGAS);
    const n = world(GIGAS, 2);
    prep(n, []); fireCard(n, GIGAS);
    assert.ok(settle(n, GIGAS, 1700) > 0, "敵がいなくても地図の端か寿命で終わる");
    assert.equal(consumedHand(n, GIGAS), 5); cleanState(n, GIGAS);
});

test("ギガース殺し Lv3: ビームは100マス先まで届く。壁で遮られる。F6の有限射程(bowBeamRangeTiles)で短くできる", () => {
    const w = world(GIGAS, 3);
    prep(w, [[3, 100]]);
    fireCard(w, GIGAS); frames(w, 31);
    const beam = plain(api(w, GIGAS).getBeam());
    assert.ok(beam && beam.limit > 100, "ビームの届く長さ: " + JSON.stringify(beam));
    assert.ok(settle(w, GIGAS) > 0);
    assert.ok(lost(w, 3) >= 100, "100マス先の敵に当たる: " + lost(w, 3));
    cleanState(w, GIGAS);
    const wall = world(GIGAS, 3);
    prep(wall, [[3, 100]]); wallAt(wall, 60);
    fireCard(wall, GIGAS); assert.ok(settle(wall, GIGAS) > 0); assert.equal(lost(wall, 3), 0, "壁で遮られる"); cleanState(wall, GIGAS);
    const f = world(GIGAS, 3);
    override(f, GIGAS, "constant", "bowBeamRangeTiles", 20);
    prep(f, [[3, 50]]); fireCard(f, GIGAS); assert.ok(settle(f, GIGAS) > 0);
    assert.equal(lost(f, 3), 0, "射程20マスなので50マス先には届かない");
    const g = world(GIGAS, 1);
    override(g, GIGAS, "constant", "bowRangeTiles", 20);
    prep(g, [[3, 50]]); fireCard(g, GIGAS); assert.ok(settle(g, GIGAS) > 0);
    assert.equal(lost(g, 3), 0, "矢の射程20マス"); assert.equal(consumedHand(g, GIGAS), 5);
});

test("他のカードへ影響しない: エロス・黄金の矢・ギガースの射程の設定は、共有の rangeTiles / beamRangeTiles を使うカード(旧Apollo・Hermes等)へ触れない", () => {
    const w = world(GOLDEN, 1);
    const fields = plain(w.ctx.ProjectRCardBalance.fields());
    assert.ok(fields.rangeTiles && fields.beamRangeTiles, "従来の項目は残っている");
    assert.ok(fields.bowRangeTiles && fields.bowBeamRangeTiles);
    assert.equal(fields.bowRangeTiles.min, 0); assert.equal(fields.bowBeamRangeTiles.min, 0);
    assert.equal(fields.rangeTiles.min, 1, "共有の項目の下限は変えない(0 = ∞ は弓専用)");
});

console.log(`\n${passed} Apollo A8 infinite-range tests passed`);
