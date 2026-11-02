"use strict";
// Phase Apollo-A10: ギガース殺し Lv3 のビームの確認 — 「幅3マスの1本のビーム」(3本のビームではない)。
//   ・撃つビームは1本。遮られていなければ、絵(VFX)も幅3マスの1枚("apollo_gigas.beam")で、レーンごとの絵("beamlane")は出ない。
//   ・当たり判定は幅3マス全体(内部は1マス幅の3つの帯に分けて計算するが、帯は隙間・重なりなしで連続し、1体の敵への連続ヒットは1本ぶん)。
//   ・遮られたときだけ、帯ごとの長さの違いを3枚の隣り合う絵(幅1マスずつ)で描く(判定と同じ長さ)。
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, frames, fireCard, aimDegree, lost, consumedHand, center, placeEnemy, parkOthers, setRegion } = fx;
const C = "apollo_gigas_slayer";
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRApolloGigasSlayer;
const settle = (w, max = 600) => { for (let i = 0; i < max && (api(w).getShots().length || api(w).isPending()); i++) frames(w, 1); };
const spyVfx = w => {
    const pv = w.ctx.ProjectRPresentationVfx, plays = [], play = pv.play;
    pv.play = (...a) => { const r = play.apply(pv, a); plays.push({ key: a[0], ctx: a[1] || {}, result: plain(r) }); return r; };
    return plays;
};
const lv3 = () => cardWorld(C, { level: 3 });
const prep = (w, enemies) => {
    parkOthers(w, enemies.map(e => e[0]));
    const c = center(w);
    for (const [id, dx, dy] of enemies) placeEnemy(w, id, c.x + dx, c.y + dy);
    aimDegree(w, 90, 3);
    return c;
};

test("構造: 幅3マスは、隙間・重なりのない連続した1マス幅の3つの帯(-1.5〜-0.5 / -0.5〜0.5 / 0.5〜1.5)。向きに関わらず撃つ位置の中心に対して左右対称", () => {
    const w = lv3();
    const g = w.ctx.ProjectRApolloGoldenVolley.geometry; // ギガース殺しは黄金の矢と同じ幾何(帯・届く範囲)を使う
    const lanes = plain(g.laneLayout(3));
    assert.equal(lanes.length, 3);
    assert.deepEqual(lanes.map(l => [l.lo, l.hi]), [[-1.5, -0.5], [-0.5, 0.5], [0.5, 1.5]]);
    assert.equal(lanes[0].hi, lanes[1].lo); assert.equal(lanes[1].hi, lanes[2].lo);
    assert.equal(lanes[2].hi - lanes[0].lo, api(w).config(3).beamWidth, "帯の合計 = 設定の幅");
    assert.equal(api(w).config(3).beamWidth, 3);
});

test("当たり判定の幅は、幅3マス全体。帯の継ぎ目(±0.5)にも隙間が無く、端(±1.5 + 敵の体の半分)でちょうど切れる。左右対称", () => {
    const w = lv3();
    const c = prep(w, [[3, 6, 0]]);
    const g = w.ctx.ProjectRApolloGoldenVolley.geometry, occ = w.ctx.ProjectR.CombatOcclusion;
    const probe = lateral => {
        placeEnemy(w, 3, c.x + 6, c.y + lateral); // 狙い90度(右) → 横 = 上下
        const poly = occ.eventPolygon(w.ctx.$gameMap.event(3));
        const lanes = g.buildLanes({ x: c.x, y: c.y }, 90, 3, 60);
        return g.beamRegion({ origin: { x: c.x, y: c.y }, degree: 90, lanes }, poly);
    };
    const xs = poly => poly.map(p => p.y);
    placeEnemy(w, 3, c.x + 6, c.y);
    const poly0 = occ.eventPolygon(w.ctx.$gameMap.event(3));
    const half = (Math.max(...xs(poly0)) - Math.min(...xs(poly0))) / 2;
    assert.ok(half > 0.1 && half < 1.5, "敵の体の半幅: " + half);
    const hitSet = [];
    for (let l = -3; l <= 3.0001; l += 0.05) { const lat = Math.round(l * 100) / 100; if (probe(lat)) hitSet.push(lat); }
    assert.ok(hitSet.length > 0);
    const edge = 1.5 + half;
    for (const l of hitSet) assert.ok(Math.abs(l) < edge + 1e-6, `幅の外では当たらない ${l}`);
    // 連続(隙間なし): 最小〜最大の間のすべての刻みが当たる
    const min = Math.min(...hitSet), max = Math.max(...hitSet);
    for (let l = min; l <= max + 1e-9; l += 0.05) assert.ok(hitSet.includes(Math.round(l * 100) / 100), `継ぎ目に隙間がある ${l}`);
    assert.ok(Math.abs(min + max) < 1e-6, `左右対称 [${min}, ${max}]`);
    assert.ok(edge - max <= 0.06 && edge - max >= -1e-6, `端でちょうど切れる: 理論 ${edge} / 実測の最大 ${max}`);
    for (const seam of [-0.5, 0.5]) assert.ok(hitSet.includes(seam), "継ぎ目 " + seam);
});

test("撃つのは1本: 遮られていなければ、絵は幅3マスの1枚(apollo_gigas.beam 1回)で、レーンの絵(beamlane)は出ない。矢のEventも出ない", () => {
    const w = lv3();
    prep(w, [[3, 8, 0]]);
    const plays = spyVfx(w);
    fireCard(w, C); frames(w, 31);
    assert.equal(plays.filter(p => p.key === "apollo_gigas.beam").length, 1, "幅3マスのビーム 1回");
    assert.equal(plays.filter(p => p.key === "apollo_gigas.beamlane").length, 0, "レーンごとの絵は出ない");
    const beam = plays.find(p => p.key === "apollo_gigas.beam");
    assert.equal(beam.ctx.degree, 90); assert.ok(beam.ctx.length > 20);
    assert.equal(beam.result.ok, true); assert.equal(beam.result.mode, "beam");
    assert.equal(beam.ctx.lateral, undefined, "横にずらさない(発射位置の中心に1枚)");
    assert.equal(plain(w.ctx.$gameMap.events().filter(e => e && e.event && /projectRGigasArrow/.test(e.event().note || "")).length), 0, "矢のEventは出ない");
    assert.equal(api(w).getShots().length, 1);
    assert.equal(plain(api(w).getBeam()).degree, 90, "ビームは同時に1本");
    settle(w);
});

test("連続ヒットは1本ぶん: 継ぎ目をまたぐ敵も、3つの帯すべてに触れる敵も、1体に最大11ヒット(3帯 x 11にならない)。ダメージ・弱点・傷は従来どおり", () => {
    const w = lv3();
    prep(w, [[3, 6, 0.5], [4, 6, 0], [5, 6, -1.3], [6, 6, 1.0]]);
    fireCard(w, C); frames(w, 31);
    settle(w);
    const res = plain(api(w).getLastResult());
    const by = Object.fromEntries(res.targets.map(t => [t.eventId, t]));
    for (const id of [3, 4, 5, 6]) assert.equal(by[id].hits, 11, "敵" + id + " は最大11ヒット: " + by[id].hits);
    assert.equal(res.totalHits, 44);
    for (const id of [3, 4, 5, 6]) assert.equal(lost(w, id), 100 + 10 * 220, "敵" + id + ": 1ヒット目100、以降は弱点x2 と 傷x1.1 の積(x2.2) = 220");
    assert.equal(consumedHand(w, C), 4, "消費は1回");
});

test("遮られたとき: 帯ごとの長さの違いだけ、隣り合う3枚(幅1マスずつ)で描く。絵の長さ = 判定の長さ。1本のビームのまま(同時に1発射)", () => {
    const w = lv3();
    const c = prep(w, [[3, 12, 1.0]]);
    // 発射位置の1マス下側の帯(横 +0.5〜+1.5)だけを、4マス先で壁にする(狙い90度 = 右。横 + = 下)
    setRegion(w, Math.floor(c.x) + 4, Math.floor(c.y) + 1, 255);
    const plays = spyVfx(w);
    fireCard(w, C); frames(w, 31);
    const lanes = plain(api(w).getBeam()) && plain(w.ctx.ProjectRApolloGigasSlayer.getShots())[0];
    const lanePlays = plays.filter(p => p.key === "apollo_gigas.beamlane");
    assert.equal(plays.filter(p => p.key === "apollo_gigas.beam").length, 0, "一部が遮られたので、幅3マスの1枚は使わない");
    assert.equal(lanePlays.length, 3, "3つの帯を隣り合う3枚で");
    const centers = lanePlays.map(p => p.ctx.lateral).sort((a, b) => a - b);
    assert.deepEqual(centers, [-1, 0, 1], "帯の中心(幅1マスずつで隙間なく並ぶ)");
    const lengths = Object.fromEntries(lanePlays.map(p => [p.ctx.lateral, p.ctx.length]));
    assert.ok(lengths[1] < lengths[0] - 1 && lengths[1] < lengths[-1] - 1, "遮られた帯だけ短い " + JSON.stringify(lengths));
    assert.ok(Math.abs(lengths[0] - lengths[-1]) < 1e-9, "遮られていない帯は同じ長さ");
    assert.equal(plain(api(w).getShots()).length, 1, "ビームは同時に1発射");
    settle(w);
});

test("終わると絵・錨・召喚が残らない。ビームのVFXの長さは画面の対角線まで(判定は地図の端まで)", () => {
    const w = lv3();
    prep(w, [[3, 8, 0]]);
    const plays = spyVfx(w);
    fireCard(w, C); frames(w, 31); settle(w); frames(w, 200);
    const beam = plays.find(p => p.key === "apollo_gigas.beam");
    assert.ok(beam.ctx.length <= w.ctx.ProjectRApolloGoldenVolley.visualReach() + 1e-9);
    const keys = plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /beam|charge/.test(k));
    assert.deepEqual(keys, [], "続くVFXが残らない");
    assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
    assert.equal(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length, 0);
});

// ---- 絵の幅 = 当たり判定の幅(Phase A10) ----
const readPng = file => { // 8bit RGBA・インターレースなしのPNGだけ読む(このリポジトリのDEV素材)
    const buf = fs.readFileSync(file); let o = 8, w = 0, h = 0; const idat = [];
    while (o < buf.length) { const len = buf.readUInt32BE(o), type = buf.toString("ascii", o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len); if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); assert.equal(data[8], 8); assert.equal(data[9], 6); } if (type === "IDAT") idat.push(data); o += 12 + len; }
    const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * 4, px = Buffer.alloc(h * stride);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
        for (let x = 0; x < stride; x++) {
            const a = x >= 4 ? px[y * stride + x - 4] : 0, b = y > 0 ? px[(y - 1) * stride + x] : 0, c = x >= 4 && y > 0 ? px[(y - 1) * stride + x - 4] : 0;
            const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
            const pred = f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? ((a + b) >> 1) : (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
            px[y * stride + x] = (line[x] + pred) & 255;
        }
    }
    return { w, h, px };
};
// 1コマの、横方向に「不透明(alpha > 40)」な列の範囲と、ほぼ全行で不透明な列の数
const lateralCoverage = (img, fx0, fy0, fw, fh) => {
    let min = fw, max = -1, solid = 0;
    for (let x = 0; x < fw; x++) { let n = 0; for (let y = 0; y < fh; y++) if (img.px[((fy0 + y) * img.w + fx0 + x) * 4 + 3] > 40) n++; if (n >= fh * 0.9) solid++; if (n > 0) { if (x < min) min = x; if (x > max) max = x; } }
    return { min, max, solid, width: max - min + 1 };
};
test("絵の幅: ギガース殺しのビームの絵(専用)は、幅3マス(144px)の端まで光が続く。レーンの絵(48px)は左右の端まで続き、隣と隙間なくつながる。offsetYは実機で測った値(-9: 当たり判定の中心線に重なる)", () => {
    const project = path.join(__dirname, "..");
    const beam = readPng(path.join(project, "img/pictures/Animation/ProjectR_Gigas_Beam.png")), lane = readPng(path.join(project, "img/pictures/Animation/ProjectR_Gigas_BeamLane.png"));
    assert.deepEqual([beam.w, beam.h, lane.w, lane.h], [576, 288, 192, 192]);
    for (let i = 0; i < 8; i++) {
        const b = lateralCoverage(beam, (i % 4) * 144, Math.floor(i / 4) * 144, 144, 144);
        assert.ok(b.width >= 140 && b.min <= 2 && b.max >= 141, `ビームのコマ${i}: 光は ${b.min}〜${b.max}(幅 ${b.width}px / 144px = ${(b.width / 48).toFixed(2)}マス)`);
        assert.ok(Math.abs(b.min - (143 - b.max)) <= 2, "左右対称");
        const l = lateralCoverage(lane, (i % 4) * 48, Math.floor(i / 4) * 96, 48, 96);
        assert.ok(l.min === 0 && l.max === 47 && l.solid >= 46, `レーンのコマ${i}: 左右の端まで光が続く ${l.min}〜${l.max} / 連続 ${l.solid}列`);
    }
    const w = lv3(), vfx = w.ctx.ProjectRPresentationVfx;
    assert.equal(vfx.mapping("apollo_gigas.beam").offsetY, -9); assert.equal(vfx.mapping("apollo_gigas.beamlane").offsetY, -9);
    assert.equal(vfx.mapping("apollo_gigas.beam").segmentTiles, 3, "幅3マス x 長さ3マスの区間");
    assert.equal(vfx.mapping("apollo_volley.beam").offsetY, -18, "黄金の矢のビームの絵は変えない");
    const library = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const name of ["ProjectR_Gigas_Beam", "ProjectR_Gigas_BeamLane"]) assert.equal(library[name].offsetY, -9, name);
});

console.log(`\n${passed} Apollo A10 Gigas beam tests passed`);
