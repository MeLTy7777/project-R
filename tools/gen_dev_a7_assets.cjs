"use strict";
// Phase Apollo-A7 のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a7_assets.cjs <プロジェクトルート> <set> [--force]      set = hyacinth | plague | laurel | lyre | oracle | all
// 既存の画像は上書きしない(--force で作り直す)。VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ ProjectR_A7_* を、無ければ末尾に足す。
//   hyacinth: ProjectR_A7_Hyacinth_Bloom(192px・ループ・赤い花の輪) / _Petals(96px・花びらが散る) / _Guard(96px・ループ・受付期間の赤い光) / $ProjectR_Hyacinth.png(咲いた花のキャラ画像)
//   plague  : ProjectR_A7_Plague_Circle(384px・ループ・半径4マス・パープルゴールドの病のサークル) / _Impact(96px・着弾) / $ProjectR_PlagueArrow.png(矢) / $ProjectR_Rat.png(ネズミ)
//   laurel  : ProjectR_A7_Laurel_Zone(480px・ループ・半径5マス・白と金の根のしるし) / _Burst(96px) / $ProjectR_LaurelRoot.png(根のキャラ画像) / $ProjectR_LaurelWall.png(根の壁)
//   lyre    : ProjectR_A7_Lyre_Wave_Gold/Red/Blue/Green/Purple(192px・水面の波紋)
//   oracle  : ProjectR_A7_Oracle_Clock(128px・1秒で一周する時計) / _Sparkle(96px・指をはじく光の粒子)
const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("./gen_dev3h_character.cjs");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const wantSet = process.argv[3] || "all";
const force = process.argv.includes("--force");
const out = (...parts) => path.join(root, ...parts);
const canvas = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
const plot = (c, x, y, a, rgb) => {
    if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    const o = (y * c.w + x) * 4, cur = c.px[o + 3] / 255, next = a + cur * (1 - a), k = next > 0 ? a / next : 1;
    c.px[o] = Math.round(c.px[o] * (1 - k) + rgb[0] * k); c.px[o + 1] = Math.round(c.px[o + 1] * (1 - k) + rgb[1] * k);
    c.px[o + 2] = Math.round(c.px[o + 2] * (1 - k) + rgb[2] * k); c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width));
const C = { GOLD: [255, 205, 70], LIGHT: [255, 236, 150], WHITE: [255, 255, 245], RED: [225, 40, 60], DEEP: [160, 20, 50], PINKRED: [255, 110, 130], PURPLE: [150, 70, 200], VIOLET: [105, 40, 160],
    GREEN: [90, 190, 110], BLUE: [90, 150, 245], PALEGREEN: [200, 245, 205], BROWN: [120, 80, 50], RAT: [140, 130, 120], PALE: [255, 225, 230] };
const rngOf = seed => { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; };
const disc = (c, cx, cy, r, rgb, alpha, soft = 1.4) => {
    for (let y = Math.floor(cy - r - soft - 2); y <= Math.ceil(cy + r + soft + 2); y++) for (let x = Math.floor(cx - r - soft - 2); x <= Math.ceil(cx + r + soft + 2); x++)
        plot(c, x, y, smooth(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r, soft) * alpha, rgb);
};
const ring = (c, cx, cy, r, w, rgb, alpha, soft = 1.5) => {
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) plot(c, x, y, smooth(Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r) - w / 2, soft) * alpha, rgb);
};
const line = (c, x0, y0, x1, y1, w, rgb, alpha, soft = 1.2) => {
    const minX = Math.floor(Math.min(x0, x1) - w - 3), maxX = Math.ceil(Math.max(x0, x1) + w + 3), minY = Math.floor(Math.min(y0, y1) - w - 3), maxY = Math.ceil(Math.max(y0, y1) + w + 3);
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
        plot(c, x, y, smooth(Math.hypot(x + 0.5 - (x0 + dx * t), y + 0.5 - (y0 + dy * t)) - w / 2, soft) * alpha, rgb);
    }
};
function sheetOf(renderFrame, frames, cols, rows, fw, fh) {
    const w = cols * fw, h = rows * fh, sheet = canvas(w, h);
    for (let i = 0; i < frames; i++) {
        const frame = renderFrame(i), ox = (i % cols) * fw, oy = Math.floor(i / cols) * fh;
        for (let y = 0; y < fh; y++) frame.px.copy(sheet.px, ((oy + y) * w + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
    }
    return sheet;
}
const petal = (c, x, y, ang, len, rgb, alpha) => { // 花びら(細長い楕円)
    for (let t = 0; t <= 1; t += 0.12) {
        const px = x + Math.cos(ang) * len * t, py = y + Math.sin(ang) * len * t, r = Math.sin(t * Math.PI) * len * 0.28 + 0.4;
        disc(c, px, py, r, rgb, alpha, 0.9);
    }
};

// ---- 共通の部品 ----
// 拡がる輪(area用): 半径いっぱいへ。loop=trueなら最終コマが最初につながる(脈動)
function rippleFrame(size, i, frames, main, edge, dots) {
    const c = canvas(size, size), cx = size / 2, R = size / 2 - 4, pulse = 0.5 + 0.5 * Math.sin(i / frames * Math.PI * 2);
    disc(c, cx, cx, R, main, 0.16 + 0.05 * pulse, R * 0.5);
    ring(c, cx, cx, R - 2, 3, edge, 0.85, 1.6);
    ring(c, cx, cx, R * (0.45 + 0.35 * ((i / frames) % 1)), 2.2, main, 0.55 * (1 - ((i / frames) % 1)), 1.8);
    if (dots) { const rng = rngOf(dots.seed); for (let k = 0; k < dots.n; k++) { const a = rng() * Math.PI * 2 + i * 0.05, d = R * (0.2 + 0.7 * rng()); disc(c, cx + Math.cos(a) * d, cx + Math.sin(a) * d, dots.r, dots.rgb, 0.7 + 0.25 * Math.sin(i + k), 0.9); } }
    return c;
}
function burstFrame(size, i, frames, main, edge) {
    const c = canvas(size, size), cx = size / 2, t = (i + 1) / frames, fade = 1 - t * t;
    disc(c, cx, cx, 6 + t * size * 0.28, main, 0.5 * fade, size * 0.1);
    disc(c, cx, cx, 5 * (1 - t) + 1.5, [255, 255, 245], fade, 3);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + 0.3, d0 = 5 + t * 8, d1 = 9 + t * (size * 0.3 + (k % 2) * 8); line(c, cx + Math.cos(a) * d0, cx + Math.sin(a) * d0, cx + Math.cos(a) * d1, cx + Math.sin(a) * d1, 2, k % 2 ? edge : main, 0.95 * fade, 1); }
    return c;
}

const sheets = {}; // name -> { canvas, fps, loop }
const chars = {}; // file -> canvas (img/characters/VFX)
const library = {}; // name -> { fps, opacity, blend, z, offsetY }

function setHyacinth() {
    const add = (name, fn, frames, size, fps, opacity, offsetY) => { sheets[name] = sheetOf(fn, frames, 4, 2, size, size); library[name] = { fps, opacity, blend: "Add", z: "5", offsetY }; };
    add("ProjectR_A7_Hyacinth_Bloom", i => rippleFrame(192, i, 8, C.RED, C.PINKRED, { seed: 77, n: 14, r: 2.6, rgb: C.PALE }), 8, 192, 8, 210, 0);
    add("ProjectR_A7_Hyacinth_Petals", i => {
        const c = canvas(96, 96), cx = 48, t = (i + 1) / 8, fade = 1 - t * 0.7, rng = rngOf(31 + i * 0);
        for (let k = 0; k < 16; k++) { const a = rng() * Math.PI * 2, d = 6 + t * (14 + rng() * 26), x = cx + Math.cos(a) * d, y = cx + Math.sin(a) * d + t * 8; petal(c, x, y, a + t * 2.4, 7 + rng() * 4, k % 3 ? C.RED : C.PINKRED, 0.9 * fade); }
        disc(c, cx, cx, 8 * (1 - t) + 2, C.PALE, 0.7 * (1 - t), 4);
        return c;
    }, 8, 96, 14, 255, -12);
    add("ProjectR_A7_Hyacinth_Guard", i => {
        const c = canvas(96, 96), cx = 48, pulse = 0.5 + 0.5 * Math.sin(i / 8 * Math.PI * 2);
        disc(c, cx, cx + 4, 26 + 3 * pulse, C.RED, 0.22, 16); ring(c, cx, cx + 4, 28 + 2 * pulse, 2.4, C.PINKRED, 0.75, 1.6);
        const rng = rngOf(9); for (let k = 0; k < 5; k++) { const a = rng() * Math.PI * 2 + i * 0.1, d = 24 * rng(); petal(c, cx + Math.cos(a) * d, cx + 4 + Math.sin(a) * d - ((i + k * 2) % 8) * 1.5, a, 6, k % 2 ? C.RED : C.PALE, 0.8); }
        return c;
    }, 8, 96, 8, 235, 4);
    // 咲いた花(キャラ画像 3x4 = 144x192: 1コマ48px。3パターン(ゆれる) x 4方向 すべて同じ向き)
    const flower = pat => {
        const c = canvas(48, 48), cx = 24, sway = (pat - 1) * 1.2;
        line(c, cx, 44, cx + sway, 24, 2.4, [60, 140, 70], 1, 1);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; petal(c, cx + sway, 22, a, 10, k % 2 ? C.RED : C.PINKRED, 0.97); }
        disc(c, cx + sway, 22, 3.2, C.GOLD, 1, 1); disc(c, cx, 44, 6, C.RED, 0.18, 4);
        return c;
    };
    const sheet = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const cell = flower(col); for (let y = 0; y < 48; y++) cell.px.copy(sheet.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4); }
    chars["$ProjectR_Hyacinth.png"] = sheet;
}

function setPlague() {
    sheets["ProjectR_A7_Plague_Circle"] = sheetOf(i => rippleFrame(384, i, 8, C.PURPLE, C.GOLD, { seed: 5, n: 22, r: 3, rgb: [210, 170, 255] }), 8, 4, 2, 384, 384);
    library["ProjectR_A7_Plague_Circle"] = { fps: 8, opacity: 200, blend: "Add", z: "3", offsetY: 0 };
    sheets["ProjectR_A7_Plague_Impact"] = sheetOf(i => burstFrame(96, i, 8, C.PURPLE, C.GOLD), 8, 4, 2, 96, 96);
    library["ProjectR_A7_Plague_Impact"] = { fps: 24, opacity: 255, blend: "Add", z: "6", offsetY: -18 };
    // 矢(頭が上。パープルゴールド。48pxのコマ)
    const arrow = () => {
        const c = canvas(48, 48), cx = 24;
        disc(c, cx, 24, 10, C.PURPLE, 0.3, 6); line(c, cx, 12, cx, 38, 3.4, C.VIOLET, 0.75, 1.2); line(c, cx, 12, cx, 38, 2.1, C.GOLD, 1, 0.9); line(c, cx, 14, cx, 36, 0.9, C.WHITE, 1, 0.7);
        for (let y = 6; y <= 14; y++) { const t = (y - 6) / 8, hw = 4.2 * t; for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) plot(c, x, y, smooth(Math.abs(x + 0.5 - cx) - hw, 1), y < 10 ? C.WHITE : [225, 190, 255]); }
        for (const s of [-1, 1]) { line(c, cx, 35, cx + s * 4.5, 41, 1.6, C.PURPLE, 0.95); line(c, cx, 31, cx + s * 3.8, 36, 1.3, C.GOLD, 0.9); }
        return c;
    };
    const a = arrow(), sa = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) for (let y = 0; y < 48; y++) a.px.copy(sa.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4);
    chars["$ProjectR_PlagueArrow.png"] = sa;
    // ネズミ(48pxのコマ。3パターン = 足の動き。方向は4行とも同じ絵。右向き)
    const rat = pat => {
        const c = canvas(48, 48), leg = (pat - 1) * 2.2;
        disc(c, 24, 32, 11, [0, 0, 0], 0.18, 6);
        disc(c, 22, 30, 8.5, C.RAT, 1, 1.1); disc(c, 31, 28, 5.2, C.RAT, 1, 1); disc(c, 35, 27, 2.1, [235, 170, 175], 1, 0.8); disc(c, 33, 25, 2.6, [200, 150, 150], 1, 0.8);
        disc(c, 34, 28, 1.1, [20, 20, 30], 1, 0.6); disc(c, 36.5, 28.4, 0.9, [30, 20, 25], 1, 0.6);
        line(c, 14, 32, 5, 36 + leg * 0.5, 1.6, [210, 160, 165], 0.95, 0.8); line(c, 5, 36 + leg * 0.5, 2, 33, 1.3, [210, 160, 165], 0.9, 0.8);
        for (const [x, sgn] of [[17, 1], [26, -1]]) line(c, x, 37, x + sgn * leg, 42, 1.8, [110, 100, 95], 1, 0.8);
        disc(c, 23, 25, 3, C.PURPLE, 0.35, 2);
        return c;
    };
    const sr = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const cell = rat(col); for (let y = 0; y < 48; y++) cell.px.copy(sr.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4); }
    chars["$ProjectR_Rat.png"] = sr;
}

function setLaurel() {
    sheets["ProjectR_A7_Laurel_Zone"] = sheetOf(i => rippleFrame(480, i, 8, C.PALEGREEN, C.GOLD, { seed: 12, n: 26, r: 3, rgb: C.WHITE }), 8, 4, 2, 480, 480);
    library["ProjectR_A7_Laurel_Zone"] = { fps: 8, opacity: 210, blend: "Add", z: "3", offsetY: 0 };
    sheets["ProjectR_A7_Laurel_Burst"] = sheetOf(i => burstFrame(96, i, 8, C.PALEGREEN, C.GOLD), 8, 4, 2, 96, 96);
    library["ProjectR_A7_Laurel_Burst"] = { fps: 24, opacity: 255, blend: "Add", z: "6", offsetY: -12 };
    // 根(1タイルぶんの白と金の根。3パターンでゆれる)。地面に置く
    const root1 = pat => {
        const c = canvas(48, 48), rng = rngOf(100), sway = (pat - 1) * 1.1;
        disc(c, 24, 26, 20, C.PALEGREEN, 0.12, 10);
        for (let k = 0; k < 5; k++) { const a = rng() * Math.PI * 2, len = 14 + rng() * 8; let x = 24, y = 26; for (let s = 0; s < 6; s++) { const nx = x + Math.cos(a + (s % 2 ? 0.35 : -0.35) + sway * 0.05) * len / 6, ny = y + Math.sin(a + (s % 2 ? 0.35 : -0.35)) * len / 6; line(c, x, y, nx, ny, 2.6 - s * 0.3, k % 2 ? C.GOLD : [235, 235, 220], 0.95, 0.9); x = nx; y = ny; } }
        for (let k = 0; k < 4; k++) disc(c, 24 + (rng() - 0.5) * 30, 26 + (rng() - 0.5) * 30, 2.2, C.PALEGREEN, 0.9, 0.9);
        return c;
    };
    const sr = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const cell = root1(col); for (let y = 0; y < 48; y++) cell.px.copy(sr.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4); }
    chars["$ProjectR_LaurelRoot.png"] = sr;
    // 根の壁(1タイルぶん。縦に立ち上がる根の束)
    const wall = pat => {
        const c = canvas(48, 48), rng = rngOf(200), sway = (pat - 1) * 1.3;
        disc(c, 24, 40, 18, C.PALEGREEN, 0.16, 9);
        for (let k = 0; k < 6; k++) { let x = 8 + k * 6.4, y = 44; for (let s = 0; s < 7; s++) { const nx = x + (s % 2 ? 2.4 : -2.4) + sway * 0.4, ny = y - 6 - rng() * 1.5; line(c, x, y, nx, ny, 3.2 - s * 0.35, k % 2 ? C.GOLD : [240, 240, 225], 0.97, 0.9); x = nx; y = ny; } }
        return c;
    };
    const sw = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { const cell = wall(col); for (let y = 0; y < 48; y++) cell.px.copy(sw.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4); }
    chars["$ProjectR_LaurelWall.png"] = sw;
}

function setLyre() {
    for (const [name, main, edge] of [["Gold", C.GOLD, C.LIGHT], ["Red", C.RED, C.PINKRED], ["Blue", C.BLUE, [190, 220, 255]], ["Green", C.GREEN, C.PALEGREEN], ["Purple", C.PURPLE, [210, 170, 255]]]) {
        const key = "ProjectR_A7_Lyre_Wave_" + name;
        sheets[key] = sheetOf(i => rippleFrame(192, i, 8, main, edge, { seed: 40, n: 8, r: 2, rgb: C.WHITE }), 8, 4, 2, 192, 192);
        library[key] = { fps: 12, opacity: 190, blend: "Add", z: "3", offsetY: 0 };
    }
}

function setOracle() {
    sheets["ProjectR_A7_Oracle_Clock"] = sheetOf(i => {
        const c = canvas(128, 128), cx = 64, R = 52;
        disc(c, cx, cx, R, C.GOLD, 0.14, 12); ring(c, cx, cx, R, 3.2, C.GOLD, 0.95, 1.6); ring(c, cx, cx, R - 7, 1.4, C.LIGHT, 0.7, 1.2);
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; line(c, cx + Math.cos(a) * (R - 4), cx + Math.sin(a) * (R - 4), cx + Math.cos(a) * (R - (k % 3 ? 9 : 13)), cx + Math.sin(a) * (R - (k % 3 ? 9 : 13)), k % 3 ? 1.4 : 2.4, C.LIGHT, 0.95, 0.8); }
        const ang = i / 8 * Math.PI * 2 - Math.PI / 2; // 8コマで一周(fps 8 = 1秒)
        line(c, cx, cx, cx + Math.cos(ang) * (R - 12), cx + Math.sin(ang) * (R - 12), 3, C.WHITE, 1, 1);
        line(c, cx, cx, cx + Math.cos(ang / 12 - Math.PI / 2 + 0.2) * (R - 26), cx + Math.sin(ang / 12 - Math.PI / 2 + 0.2) * (R - 26), 3.4, C.LIGHT, 1, 1);
        disc(c, cx, cx, 4, C.WHITE, 1, 1);
        return c;
    }, 8, 4, 2, 128, 128);
    library["ProjectR_A7_Oracle_Clock"] = { fps: 8, opacity: 235, blend: "Add", z: "5", offsetY: -24 };
    sheets["ProjectR_A7_Oracle_Sparkle"] = sheetOf(i => burstFrame(96, i, 8, C.GOLD, C.LIGHT), 8, 4, 2, 96, 96);
    library["ProjectR_A7_Oracle_Sparkle"] = { fps: 20, opacity: 255, blend: "Add", z: "6", offsetY: -20 };
}

const SETS = { hyacinth: setHyacinth, plague: setPlague, laurel: setLaurel, lyre: setLyre, oracle: setOracle };
for (const [name, fn] of Object.entries(SETS)) if (wantSet === "all" || wantSet === name) fn();

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
for (const [name, sheet] of Object.entries(sheets)) write(out("img", "pictures", "Animation", name + ".png"), sheet, `${sheet.w}x${sheet.h}`);
for (const [file, sheet] of Object.entries(chars)) write(out("img", "characters", "VFX", file), sheet, `${sheet.w}x${sheet.h}`);

const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath) && Object.keys(library).length) {
    const raw = fs.readFileSync(libraryPath, "utf8"), lib = JSON.parse(raw);
    const entry = (name, v) => ({ spritesheetFile: "Animation/" + name, rows: 2, columns: 4, fps: v.fps, zIndex: v.z, blendMode: v.blend, scale: 100, opacity: v.opacity, hue: 0, offsetX: 0, offsetY: v.offsetY,
        flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
        tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 });
    let added = 0;
    for (const [name, v] of Object.entries(library)) if (!lib[name]) { lib[name] = entry(name, v); added++; }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(lib, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
