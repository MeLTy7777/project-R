"use strict";
// Phase Apollo-A11: 黄金の矢 Lv3 のビームの絵を、当たり判定(幅3マス)に合わせる。
//   従来の共有の絵(apollo_volley.beam)は、見える幅が約2.46マスで、実機で中心が18px上にずれていた。
//   専用の絵 apollo_golden.beam / apollo_golden.beamlane(別ファイル・別キー。ギガース殺しの apollo_gigas.* とは別)に差し替える。
//   ダメージ・11ヒット・スリップ・射程・判定・Cooldown・チャージ・後払いの消費は変えない(既存の A4〜A5C・A8 のテストが引き続き通る)。
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const fx = require("./ProjectR_ApolloVolleyFixture.cjs");
const { assert, plain, volleyWorld, VOLLEY, api, aimDegree, frames, lost, center, placeEnemy, parkOthers, setRegion, player, KEYS } = fx;
const project = path.join(__dirname, "..");
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const [CODE, KEYCODE] = KEYS.Q;
const hold = w => { player(w).center(player(w)._realX, player(w)._realY); w.keyDown(CODE, KEYCODE); frames(w, 40); w.keyUp(CODE, KEYCODE); frames(w, 1); };
const settle = (w, max = 600) => { for (let i = 0; i < max && (api(w).getBeam() || api(w).isPending() || fx.arrows(w).length); i++) frames(w, 1); };
const spyVfx = w => {
    const pv = w.ctx.ProjectRPresentationVfx, plays = [], play = pv.play;
    pv.play = (...a) => { const r = play.apply(pv, a); plays.push({ key: a[0], ctx: a[1] || {}, result: plain(r) }); return r; };
    return plays;
};
const lv3 = () => volleyWorld({ level: 3 });
const prep = (w, enemies) => {
    parkOthers(w, enemies.map(e => e[0]));
    const c = center(w);
    for (const [id, dx, dy] of enemies) placeEnemy(w, id, c.x + dx, c.y + dy);
    aimDegree(w, 90, 3);
    return c;
};

test("撃つのは1本: 遮られていなければ、絵は幅3マスの1枚(apollo_golden.beam 1回)で、レーンの絵・従来の共有の絵(apollo_volley.beam)・ギガース殺しの絵は出ない", () => {
    const w = lv3();
    prep(w, [[3, 8, 0]]);
    const plays = spyVfx(w);
    hold(w);
    assert.equal(plays.filter(p => p.key === "apollo_golden.beam").length, 1);
    assert.equal(plays.filter(p => /beamlane|apollo_volley\.beam|apollo_gigas/.test(p.key)).length, 0);
    const beam = plays.find(p => p.key === "apollo_golden.beam");
    assert.equal(beam.result.ok, true); assert.equal(beam.result.mode, "beam");
    assert.equal(beam.ctx.degree, 90); assert.equal(beam.ctx.lateral, undefined, "横にずらさない(撃つ位置の中心線に1枚)");
    assert.equal(plain(api(w).getBeam()).degree, 90, "ビームは同時に1本");
    settle(w);
});

test("遮られたとき: 1つの帯だけ短い。隣り合う3枚(帯の中心 -1 / 0 / +1)で描き、絵の長さ = 判定の帯の長さ(画面の対角線まで)。遮られていない帯は同じ長さ", () => {
    const w = lv3();
    const c = prep(w, [[3, 12, 1.2]]);
    setRegion(w, Math.floor(c.x) + 4, Math.floor(c.y) + 1, 255); // 撃つ位置の中心線から +0.5〜+1.5 の帯(狙い90度 = 右。横 + = 下)
    const plays = spyVfx(w);
    hold(w);
    const lanePlays = plays.filter(p => p.key === "apollo_golden.beamlane");
    assert.equal(plays.filter(p => p.key === "apollo_golden.beam").length, 0, "一部が遮られたので、幅3マスの1枚は使わない");
    assert.equal(lanePlays.length, 3);
    assert.deepEqual(lanePlays.map(p => p.ctx.lateral).sort((a, b) => a - b), [-1, 0, 1]);
    const g = w.ctx.ProjectRApolloGoldenVolley, vr = g.visualReach();
    const lanes = g.geometry.buildLanes({ x: c.x, y: c.y }, 90, 3, 200);
    for (const p of lanePlays) {
        const lane = lanes.find(l => Math.abs(l.center - p.ctx.lateral) < 1e-9);
        assert.ok(Math.abs(p.ctx.length - Math.min(lane.limit, vr)) < 1e-6, `帯${lane.index}の絵の長さ = 判定の長さ: ${p.ctx.length} vs ${Math.min(lane.limit, vr)}`);
    }
    const len = Object.fromEntries(lanePlays.map(p => [p.ctx.lateral, p.ctx.length]));
    assert.ok(len[1] < len[0] - 1 && Math.abs(len[0] - len[-1]) < 1e-6, JSON.stringify(len));
    assert.equal(lost(w, 3), 0, "遮られた帯の先の敵は当たらない(判定は変えていない)");
    settle(w);
});

test("判定は従来どおり: 幅3マス全体で1本ぶんの連続ヒット(最大11・50ダメージ)。継ぎ目の敵・帯をまたぐ敵も11ヒット、幅の外(+2.6)は当たらない", () => {
    const w = lv3();
    prep(w, [[3, 6, 0.5], [4, 6, 0], [5, 6, -1.3], [6, 6, 2.6]]);
    hold(w); settle(w);
    const res = plain(api(w).getLastResult());
    const by = Object.fromEntries(res.targets.map(t => [t.eventId, t.hits]));
    for (const id of [3, 4, 5]) assert.equal(by[id], 11, "敵" + id + ": " + by[id]);
    assert.equal(by[6], undefined); assert.equal(lost(w, 6), 0);
    for (const id of [3, 4, 5]) assert.equal(lost(w, id), 11 * 50, "1ヒット50 x 11");
});

// ---- 絵の幅 = 当たり判定の幅 ----
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
const lateralCoverage = (img, fx0, fy0, fw, fh) => {
    let min = fw, max = -1, solid = 0;
    for (let x = 0; x < fw; x++) { let n = 0; for (let y = 0; y < fh; y++) if (img.px[((fy0 + y) * img.w + fx0 + x) * 4 + 3] > 40) n++; if (n >= fh * 0.9) solid++; if (n > 0) { if (x < min) min = x; if (x > max) max = x; } }
    return { min, max, solid, width: max - min + 1 };
};
test("絵の幅: 黄金の矢の専用の絵は幅3マス(144px)の端まで光が続き、レーンの絵(48px)は左右の端まで続く。別ファイル・別キーで、ギガース殺しの絵・従来の共有の絵は変わっていない", () => {
    const beam = readPng(path.join(project, "img/pictures/Animation/ProjectR_Golden_Beam.png")), lane = readPng(path.join(project, "img/pictures/Animation/ProjectR_Golden_BeamLane.png"));
    assert.deepEqual([beam.w, beam.h, lane.w, lane.h], [576, 288, 192, 192]);
    for (let i = 0; i < 8; i++) {
        const b = lateralCoverage(beam, (i % 4) * 144, Math.floor(i / 4) * 144, 144, 144);
        assert.ok(b.width >= 140 && b.min <= 2 && b.max >= 141 && Math.abs(b.min - (143 - b.max)) <= 2, `ビームのコマ${i}: ${b.min}〜${b.max}(${(b.width / 48).toFixed(2)}マス)`);
        const l = lateralCoverage(lane, (i % 4) * 48, Math.floor(i / 4) * 96, 48, 96);
        assert.ok(l.min === 0 && l.max === 47 && l.solid >= 46, `レーンのコマ${i}: ${l.min}〜${l.max} / 連続 ${l.solid}列`);
    }
    const w = lv3(), vfx = w.ctx.ProjectRPresentationVfx;
    assert.equal(vfx.mapping("apollo_golden.beam").offsetY, -9); assert.equal(vfx.mapping("apollo_golden.beamlane").offsetY, -9);
    assert.equal(vfx.mapping("apollo_golden.beam").library, "ProjectR_Golden_Beam");
    assert.equal(vfx.mapping("apollo_golden.beam").segmentTiles, 3);
    assert.equal(vfx.mapping("apollo_golden.beamlane").segmentTiles, 2);
    assert.equal(vfx.mapping("apollo_volley.beam").offsetY, -18, "従来の共有の絵は変えない");
    assert.equal(vfx.mapping("apollo_volley.beam").library, "ProjectR_Volley_Beam");
    assert.equal(vfx.mapping("apollo_gigas.beam").library, "ProjectR_Gigas_Beam", "ギガース殺しの絵は別のまま");
    const lib = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const name of ["ProjectR_Golden_Beam", "ProjectR_Golden_BeamLane"]) assert.equal(lib[name].offsetY, -9, name);
    assert.equal(lib.ProjectR_Volley_Beam.offsetY, -18, "従来のライブラリ項目は変えない");
    assert.notEqual(fs.readFileSync(path.join(project, "img/pictures/Animation/ProjectR_Golden_Beam.png")).compare(fs.readFileSync(path.join(project, "img/pictures/Animation/ProjectR_Gigas_Beam.png"))), 0, "ギガース殺しとは別の素材");
});

test("終わると絵・錨・召喚が残らない。ビームの絵の長さは画面の対角線まで", () => {
    const w = lv3();
    prep(w, [[3, 8, 0]]);
    const plays = spyVfx(w);
    hold(w); settle(w); frames(w, 200);
    assert.ok(plays.find(p => p.key === "apollo_golden.beam").ctx.length <= api(w).visualReach() + 1e-9);
    assert.deepEqual(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /beam|charge/.test(k)), []);
    assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
    assert.equal(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length, 0);
});

console.log(`\n${passed} Apollo A11 Golden beam tests passed`);
