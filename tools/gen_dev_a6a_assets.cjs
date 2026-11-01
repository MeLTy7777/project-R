"use strict";
// Phase Apollo-A6A のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a6a_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/characters/VFX/$ProjectR_ErosArrow.png          エロスの矢(小さなピンクゴールド・頭が上)。3x4の12コマ(1コマ48px)すべて同じ
//   img/pictures/Animation/ProjectR_Eros_Muzzle.png     弓から放つ瞬間の小さな閃光(1コマ96px・8コマ・4列x2行。1回)
//   img/pictures/Animation/ProjectR_Eros_Glow.png       飛ぶ矢のまわりの淡い光(1コマ64px・8コマ・4列x2行。ループ)
//   img/pictures/Animation/ProjectR_Eros_HitDamage.png  敵に当たった火花(1コマ96px・8コマ。1回)
//   img/pictures/Animation/ProjectR_Eros_HitHeal.png    味方に当たった癒しの光(1コマ96px・8コマ。1回。ピンクの粒が昇る)
// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ上の4件(ProjectR_Eros_*)を、無ければ末尾に足す。
const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("./gen_dev3h_character.cjs");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
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
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245], PINK = [255, 140, 190], ROSE = [235, 90, 150], PALE = [255, 215, 225];
let seed = 20261104;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const disc = (c, cx, cy, r, rgb, alpha, soft = 1.4) => {
    for (let y = Math.floor(cy - r - soft - 2); y <= Math.ceil(cy + r + soft + 2); y++) for (let x = Math.floor(cx - r - soft - 2); x <= Math.ceil(cx + r + soft + 2); x++)
        plot(c, x, y, smooth(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r, soft) * alpha, rgb);
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

// ---- 矢(48pxのコマ。中心(24,24)が回転の中心。頭が上。小さい: 長さ約26px・幅約8px) ----
function arrowCell() {
    const c = canvas(48, 48), cx = 24;
    disc(c, cx, 24, 10, PINK, 0.28, 6); // 淡い光
    line(c, cx, 14, cx, 36, 3.2, ROSE, 0.7, 1.2); // 軸の外側
    line(c, cx, 14, cx, 36, 2, GOLD, 1, 0.9);
    line(c, cx, 15, cx, 35, 0.9, WHITE, 1, 0.7); // 白熱の芯
    for (let y = 9; y <= 16; y++) { // 鏃
        const t = (y - 9) / 7, hw = 3.6 * t;
        for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) plot(c, x, y, smooth(Math.abs(x + 0.5 - cx) - hw, 1), y < 12 ? WHITE : PALE);
    }
    for (const s of [-1, 1]) { line(c, cx, 33, cx + s * 4.2, 38, 1.5, PINK, 0.95); line(c, cx, 29, cx + s * 3.6, 33.5, 1.3, PALE, 0.9); } // 矢羽
    return c;
}
function arrowSheet() {
    const cell = arrowCell(), sheet = canvas(144, 192);
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++)
        for (let y = 0; y < 48; y++) cell.px.copy(sheet.px, ((cy * 48 + y) * 144 + cx * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4);
    return sheet;
}

// ---- 発射の閃光(96px・8コマ) ----
const MW = 96, MFRAMES = 8;
function muzzleFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, t = (i + 1) / MFRAMES, r = 8 + t * 30, fade = (1 - t) * (1 - t * 0.2);
    for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx);
        plot(c, x, y, smooth(d - r * 0.55, r * 0.9) * 0.55 * fade, PINK);
        plot(c, x, y, smooth(Math.abs(d - r) - 1.8, 5) * 0.85 * fade, LIGHT);
    }
    disc(c, cx, cx, 7 * (1 - t) + 2, WHITE, fade, 4);
    for (let k = 0; k < 7; k++) { // 火花
        const a = k / 7 * Math.PI * 2 + 0.4, d0 = r * 0.6, d1 = r * (1.0 + 0.5 * (k % 2));
        line(c, cx + Math.cos(a) * d0, cx + Math.sin(a) * d0, cx + Math.cos(a) * d1, cx + Math.sin(a) * d1, 1.6, k % 2 ? GOLD : WHITE, 0.9 * fade, 0.9);
    }
    return c;
}

// ---- 飛ぶ矢のまわりの光(64px・8コマ・ループ) ----
const GW = 64, GFRAMES = 8;
function glowFrame(i) {
    const c = canvas(GW, GW), cx = GW / 2, pulse = 0.82 + 0.18 * Math.sin(i / GFRAMES * Math.PI * 2);
    disc(c, cx, cx, 14 * pulse, PINK, 0.34, 11);
    disc(c, cx, cx, 7 * pulse, LIGHT, 0.5, 7);
    for (let k = 0; k < 3; k++) {
        const a = (k / 3 + i / GFRAMES) * Math.PI * 2, d = 10 + 3 * Math.sin(i + k);
        disc(c, cx + Math.cos(a) * d, cx + Math.sin(a) * d, 1.4, WHITE, 0.85, 1);
    }
    return c;
}

// ---- 敵に当たった火花(96px・8コマ) ----
function hitDamageFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, t = (i + 1) / MFRAMES, fade = 1 - t * t;
    disc(c, cx, cx, 6 + t * 18, PINK, 0.5 * fade, 9);
    disc(c, cx, cx, 5 * (1 - t) + 1.5, WHITE, fade, 3);
    for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + 0.2, d0 = 5 + t * 8, d1 = 10 + t * (22 + (k % 2) * 10);
        line(c, cx + Math.cos(a) * d0, cx + Math.sin(a) * d0, cx + Math.cos(a) * d1, cx + Math.sin(a) * d1, 2, k % 2 ? GOLD : ROSE, 0.95 * fade, 1);
    }
    return c;
}

// ---- 味方に当たった癒しの光(96px・8コマ。ピンクと金の粒が昇る輪) ----
function hitHealFrame(i) {
    const c = canvas(MW, MW), cx = MW / 2, t = (i + 1) / MFRAMES, fade = 1 - t * t * 0.9;
    for (let y = 0; y < MW; y++) for (let x = 0; x < MW; x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cx) * 1.5);
        plot(c, x, y, smooth(Math.abs(d - (8 + t * 26)) - 1.5, 5) * 0.8 * fade, PALE);
    }
    disc(c, cx, cx, 14 * (1 - t * 0.5), LIGHT, 0.4 * fade, 9);
    const rng = (n => () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; })(77);
    for (let k = 0; k < 9; k++) {
        const px = cx + (rng() - 0.5) * 36, startY = cx + 10 + rng() * 10, rise = (20 + rng() * 24) * t;
        disc(c, px, startY - rise, 1.2 + rng() * 1.2, k % 2 ? PINK : GOLD, 0.95 * fade, 1);
    }
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) ? data : encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const arrow = arrowSheet();
write(out("img", "characters", "VFX", "$ProjectR_ErosArrow.png"), arrow, `${arrow.w}x${arrow.h}`);
const sheets = {
    ProjectR_Eros_Muzzle: sheetOf(muzzleFrame, MFRAMES, 4, 2, MW, MW),
    ProjectR_Eros_Glow: sheetOf(glowFrame, GFRAMES, 4, 2, GW, GW),
    ProjectR_Eros_HitDamage: sheetOf(hitDamageFrame, MFRAMES, 4, 2, MW, MW),
    ProjectR_Eros_HitHeal: sheetOf(hitHealFrame, MFRAMES, 4, 2, MW, MW)
};
for (const [name, sheet] of Object.entries(sheets)) write(out("img", "pictures", "Animation", name + ".png"), sheet, `${sheet.w}x${sheet.h}`);

const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    const entry = (file, fps, zIndex, opacity, blend) => ({ spritesheetFile: "Animation/" + file, rows: 2, columns: 4, fps, zIndex, blendMode: blend, scale: 100, opacity, hue: 0, offsetX: 0, offsetY: -18,
        flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
        tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 });
    const wanted = {
        ProjectR_Eros_Muzzle: entry("ProjectR_Eros_Muzzle", 24, "6", 255, "Add"),
        ProjectR_Eros_Glow: entry("ProjectR_Eros_Glow", 12, "4", 200, "Add"),
        ProjectR_Eros_HitDamage: entry("ProjectR_Eros_HitDamage", 24, "6", 255, "Add"),
        ProjectR_Eros_HitHeal: entry("ProjectR_Eros_HitHeal", 16, "6", 255, "Add")
    };
    let added = 0;
    for (const [name, value] of Object.entries(wanted)) if (!library[name]) { library[name] = value; added++; }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
