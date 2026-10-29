"use strict";
// Phase H2B-3B のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_h2b3b_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。すべて青白い色。
//   img/pictures/Animation/ProjectR_Soul_Manifest.png     魂の出現(青白い光が立ち上がって玉になる)。4列x2行=8コマ、1コマ192x192。1回だけ再生
//   img/pictures/Animation/ProjectR_Soul_Hover.png        漂う魂(涙形の青白い光・ゆらぎ)。1コマ96x96。ループ
//   img/pictures/Animation/ProjectR_Soul_Collect.png      回収の光(魂が光の粒になって上へ吸い込まれる)。1コマ192x192。1回だけ
//   img/pictures/Animation/ProjectR_Psychopomp_Strike.png Hermesの斬撃の閃光(斜めの白い線と火花)。1コマ192x192。1回だけ
//   img/characters/$DEV3H_FingerSnap_f4.png               主人公の「指をはじく」(4コマ x 4方向)
const fs = require("node:fs");
const path = require("node:path");
const { sheetFor, fileName, encodePng } = require("./gen_dev3h_character.cjs");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const force = process.argv.includes("--force");
const out = (...parts) => path.join(root, ...parts);

const canvas = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
const plot = (c, x, y, a, rgb) => {
    if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    const o = (y * c.w + x) * 4, cur = c.px[o + 3] / 255, next = a + cur * (1 - a);
    const k = next > 0 ? a / next : 1;
    c.px[o] = Math.round(c.px[o] * (1 - k) + rgb[0] * k); c.px[o + 1] = Math.round(c.px[o + 1] * (1 - k) + rgb[1] * k);
    c.px[o + 2] = Math.round(c.px[o + 2] * (1 - k) + rgb[2] * k); c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width));
let seed = 20261030;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function sheetOf(renderFrame, frames, cols, rows, fw, fh) {
    const w = cols * fw, h = rows * fh, sheet = canvas(w, h);
    for (let i = 0; i < frames; i++) {
        const frame = renderFrame(i), ox = (i % cols) * fw, oy = Math.floor(i / cols) * fh;
        for (let y = 0; y < fh; y++) frame.px.copy(sheet.px, ((oy + y) * w + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
    }
    return sheet;
}
const WHITE = [244, 250, 255], ICE = [186, 222, 255], BLUE = [120, 176, 255];

// 魂の本体(涙形): 中心 (cx, cy)、半径 r、上に尾を引く。
function drawSoul(c, cx, cy, r, tail, alpha, wobble) {
    for (let y = Math.floor(cy - r - tail - 4); y <= Math.ceil(cy + r * 2.2 + 8); y++) for (let x = Math.floor(cx - r * 2.2 - 8); x <= Math.ceil(cx + r * 2.2 + 8); x++) {
        const dx = x + 0.5 - cx, up = cy - (y + 0.5);
        let d;
        if (up <= 0) d = Math.hypot(dx, -up);
        else { const w = r * Math.max(0, 1 - up / (tail + r)) + 0.0001; d = Math.abs(dx + Math.sin(up * 0.35 + wobble) * 1.2) / w * r; d = Math.max(d, 0); }
        if (up > 0 && up > tail + r) continue;
        const core = smooth(d - r * 0.45, r * 0.5), body = smooth(d - r, r * 0.9);
        plot(c, x, y, body * 0.55 * alpha, BLUE);
        plot(c, x, y, smooth(d - r * 0.8, r * 0.7) * 0.8 * alpha, ICE);
        plot(c, x, y, core * alpha, WHITE);
    }
}

// ---- 魂の出現(192): 光の輪が収束し、青白い玉になる ----
const MW = 192, MFRAMES = 8;
function manifestFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, cy = MW / 2 + 14, t = (i + 1) / MFRAMES;
    const ring = 78 * (1 - t) + 10, fade = i < 6 ? 1 : 1 - (i - 5) / 3;
    for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        plot(c, x, y, smooth(Math.abs(r - ring) - 2, 2.4) * 0.9 * (1 - t * 0.5) * fade, ICE);
    }
    drawSoul(c, cx, cy, 6 + 12 * Math.min(1, t * 1.6), 10 + 36 * t, Math.min(1, t * 1.8) * fade, i * 0.8);
    for (let k = 0; k < 14; k++) {
        const a = rand() * Math.PI * 2, d = (1 - t) * (30 + rand() * 60) + 6, px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - 1.2, 1.6) * 0.9 * fade, WHITE);
    }
    return c;
}

// ---- 漂う魂(96): ゆらぎながら呼吸する光。8コマで1周期 ----
const HW = 96, HFRAMES = 8;
function hoverFrame(i) {
    const c = canvas(HW, HW), phase = i / HFRAMES * Math.PI * 2, cx = HW / 2 + Math.sin(phase) * 1.5, cy = HW / 2 + 6 - Math.sin(phase) * 3;
    // 足元の淡い光
    for (let y = 0; y < HW; y++) for (let x = 0; x < HW; x++) plot(c, x, y, smooth(Math.hypot((x + 0.5 - HW / 2) / 1.7, y + 0.5 - (HW - 12)) - 9, 7) * 0.35, BLUE);
    drawSoul(c, cx, cy, 8 + Math.sin(phase) * 0.8, 22 + Math.sin(phase + 1) * 3, 1, phase);
    for (let k = 0; k < 3; k++) { // 小さな粒が昇る
        const life = ((i / HFRAMES) + k / 3) % 1, px = cx + Math.sin(k * 2.1 + phase) * 6, py = cy - 10 - life * 34;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - 1, 1.5) * (1 - life) * 0.9, WHITE);
    }
    return c;
}

// ---- 回収の光(192): 魂が粒になって上へ吸い込まれる ----
function collectFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, cy = MW / 2 + 14, t = (i + 1) / MFRAMES, fade = Math.max(0, 1 - t * t);
    drawSoul(c, cx, cy - 20 * t, 18 * (1 - t * 0.6), 20 + 40 * t, fade, i);
    for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        plot(c, x, y, smooth(Math.abs(r - 14 - t * 56) - 1.8, 2.2) * 0.8 * fade, ICE);
    }
    for (let k = 0; k < 18; k++) {
        const a = k / 18 * Math.PI * 2 + 0.3, d = 10 + t * (30 + (k % 3) * 18), px = cx + Math.cos(a) * d, py = cy - t * 46 + Math.sin(a) * d * 0.7;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - 1.3, 1.6) * fade, WHITE);
    }
    return c;
}

// ---- Hermesの斬撃の閃光(192): 斜めの白い線と火花 ----
function strikeFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, cy = MW / 2, t = (i + 1) / MFRAMES, grow = Math.min(1, t * 2.2), fade = i < 3 ? 1 : Math.max(0, 1 - (i - 2) / 5);
    const len = 84 * grow, ux = Math.cos(-Math.PI / 4), uy = Math.sin(-Math.PI / 4);
    for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
        if (Math.abs(along) > len) continue;
        const taper = 1 - Math.abs(along) / len;
        plot(c, x, y, smooth(across - 1.5 * taper, 3 + 5 * taper) * 0.95 * fade, WHITE);
        plot(c, x, y, smooth(across - 5 * taper, 10 * taper + 1) * 0.35 * fade, BLUE);
    }
    for (let k = 0; k < 10; k++) {
        const a = rand() * Math.PI * 2, d = 10 + t * (20 + rand() * 50), px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - 1.1, 1.5) * fade, ICE);
    }
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) ? data : encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const sheets = {
    ProjectR_Soul_Manifest: sheetOf(manifestFrame, MFRAMES, 4, 2, MW, MW),
    ProjectR_Soul_Hover: sheetOf(hoverFrame, HFRAMES, 4, 2, HW, HW),
    ProjectR_Soul_Collect: sheetOf(collectFrame, MFRAMES, 4, 2, MW, MW),
    ProjectR_Psychopomp_Strike: sheetOf(strikeFrame, MFRAMES, 4, 2, MW, MW)
};
for (const [name, sheet] of Object.entries(sheets)) write(out("img", "pictures", "Animation", name + ".png"), sheet, `${sheet.w}x${sheet.h}`);
const snap = sheetFor("FingerSnap");
write(out("img", "characters", fileName("FingerSnap")), encodePng(snap.w, snap.h, snap.px), `${snap.w}x${snap.h}`);

// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)への登録。既存の項目は一切変えず、無い項目だけを末尾に足す。
const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    const entry = (file, fps, zIndex, opacity, blend) => ({ spritesheetFile: "Animation/" + file, rows: 2, columns: 4, fps, zIndex, blendMode: blend, scale: 100, opacity, hue: 0, offsetX: 0, offsetY: 0,
        flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
        tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 });
    const wanted = {
        ProjectR_Soul_Manifest: entry("ProjectR_Soul_Manifest", 14, "3", 255, "Add"),
        ProjectR_Soul_Hover: entry("ProjectR_Soul_Hover", 8, "2", 240, "Add"),
        ProjectR_Soul_Collect: entry("ProjectR_Soul_Collect", 16, "3", 255, "Add"),
        ProjectR_Psychopomp_Strike: entry("ProjectR_Psychopomp_Strike", 20, "3", 255, "Add")
    };
    let added = 0;
    for (const [name, value] of Object.entries(wanted)) if (!library[name]) { library[name] = value; added++; }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
