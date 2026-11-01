"use strict";
// Phase Apollo-A4 のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a4_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。すべて黄金色。
//   img/characters/VFX/$ProjectR_GoldenArrow.png       黄金の矢(細い・上向き)。3x4の12コマ(1コマ48px)すべて同じ
//   img/characters/VFX/$ProjectR_GoldenArrowThick.png  黄金の矢(太い・Lv2の中央の1本)。同じ寸法
//   img/pictures/ProjectR_Bow_DEV.png                  Apolloの弓 64x32(Pan.pngと同じ寸法・向き。公式SwingWeaponに渡す武器画像)
//   img/pictures/Animation/ProjectR_Volley_Burst.png   発射の閃光(黄金の電撃が前へ走る)。4列x2行=8コマ、1コマ256x256(上向きが基準・中心から前へ)
//   img/pictures/Animation/ProjectR_Volley_Particles.png  Apolloから漂う光の粒子。1コマ128x128、8コマ
//   img/characters/$DEV3H_ArmExtend_f4.png             主人公の「手を前に突きだす」(4コマ x 4方向)
// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ ProjectR_Volley_Burst / ProjectR_Volley_Particles を、無ければ末尾に足す。
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
let seed = 20261101;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245], AMBER = [230, 150, 40];

const disc = (c, cx, cy, r, rgb, alpha, soft = 1.4) => {
    for (let y = Math.floor(cy - r - soft - 2); y <= Math.ceil(cy + r + soft + 2); y++) for (let x = Math.floor(cx - r - soft - 2); x <= Math.ceil(cx + r + soft + 2); x++)
        plot(c, x, y, smooth(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r, soft) * alpha, rgb);
};
// 線分(太さ w)。端は丸い。
const line = (c, x0, y0, x1, y1, w, rgb, alpha, soft = 1.2) => {
    const minX = Math.floor(Math.min(x0, x1) - w - 3), maxX = Math.ceil(Math.max(x0, x1) + w + 3);
    const minY = Math.floor(Math.min(y0, y1) - w - 3), maxY = Math.ceil(Math.max(y0, y1) + w + 3);
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

// ---- 矢(48px のコマ。中心 (24,24) が回転の中心。頭が上) ----
function arrowCell(thick) {
    const c = canvas(48, 48), cx = 24;
    const head = thick ? 3 : 6, tail = thick ? 45 : 40, half = thick ? 15 : 2.2; // 太い矢は幅 約30px(0.6マス)
    disc(c, cx, 24, thick ? 22 : 9, GOLD, thick ? 0.22 : 0.3, thick ? 8 : 5); // 光
    line(c, cx, head + (thick ? 14 : 8), cx, tail, half * 2, AMBER, 0.55, 1.5); // 軸の外側
    line(c, cx, head + (thick ? 12 : 7), cx, tail - 1, Math.max(1.6, half * 1.1), GOLD, 1, 1.0);
    line(c, cx, head + (thick ? 10 : 6), cx, tail - 2, Math.max(1, half * 0.45), WHITE, 1, 0.8); // 白熱の芯
    // 鏃(三角)
    const baseY = head + (thick ? 14 : 9), spread = thick ? half + 4 : 5.2;
    for (let y = head; y <= baseY; y++) {
        const t = (y - head) / (baseY - head), hw = spread * t;
        for (let x = Math.floor(cx - hw - 1); x <= Math.ceil(cx + hw + 1); x++) plot(c, x, y, smooth(Math.abs(x + 0.5 - cx) - hw, 1) , y < head + 3 ? WHITE : LIGHT);
    }
    // 矢羽(尾の左右)
    for (const s of [-1, 1]) { line(c, cx, tail - 6, cx + s * (thick ? 12 : 5), tail + 1, thick ? 3 : 1.6, LIGHT, 0.95); line(c, cx, tail - 11, cx + s * (thick ? 10 : 4.4), tail - 5, thick ? 2.6 : 1.4, GOLD, 0.9); }
    // 電撃の火花
    for (let k = 0; k < (thick ? 6 : 3); k++) {
        const y = 14 + k * (thick ? 5 : 8), s = k % 2 ? -1 : 1, off = (thick ? 9 : 4.5) + k % 3;
        line(c, cx + s * off, y, cx + s * (off + 3), y + 3, 1.1, WHITE, 0.9, 0.8);
    }
    return c;
}
function arrowSheet(thick) {
    const cell = arrowCell(thick), sheet = canvas(144, 192);
    for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++)
        for (let y = 0; y < 48; y++) cell.px.copy(sheet.px, ((cy * 48 + y) * 144 + cx * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4);
    return sheet;
}

// ---- 弓(64x32。左端が持ち手側・右が前) ----
function bowPicture() {
    const c = canvas(64, 32);
    // 弓の弧(右へふくらむ)と弦
    const cx = 34, top = 2, bottom = 29;
    let prev = null;
    for (let i = 0; i <= 28; i++) {
        const t = i / 28, y = top + (bottom - top) * t, bulge = Math.sin(t * Math.PI), x = cx + bulge * 18;
        if (prev) { line(c, prev.x, prev.y, x, y, 3.4, AMBER, 1, 0.8); line(c, prev.x, prev.y, x, y, 2, GOLD, 1, 0.8); line(c, prev.x, prev.y, x, y, 0.9, WHITE, 0.9, 0.7); }
        prev = { x, y };
    }
    line(c, cx, top, cx - 7, 16, 1, WHITE, 0.85, 0.7); line(c, cx - 7, 16, cx, bottom, 1, WHITE, 0.85, 0.7); // 弦を引いた形
    line(c, cx - 7, 16, 54, 16, 1.6, LIGHT, 1, 0.8); // つがえた矢
    for (let k = 0; k < 4; k++) disc(c, 56 + k * 0.1, 16, 1.6 - k * 0.2, WHITE, 0.9);
    return c;
}

// ---- 発射の閃光(256px。中心から上へ。黄金の電撃) ----
const BW = 256, BFRAMES = 8;
function burstFrame(i) {
    const c = canvas(BW, BW), cx = BW / 2, cy = BW / 2, t = (i + 1) / BFRAMES, grow = Math.min(1, t * 2.4), fade = i < 3 ? 1 : Math.max(0, 1 - (i - 2) / 5);
    disc(c, cx, cy, 34 * (0.6 + t * 0.6), GOLD, 0.5 * fade, 16);
    disc(c, cx, cy, 16 * (1 - t * 0.5), WHITE, 0.9 * fade, 8);
    const rays = 7;
    for (let r = 0; r < rays; r++) {
        const base = -42 + (84 * r) / (rays - 1), len = (84 + (r % 3) * 20) * grow;
        // 折れ線の電撃
        let px = cx, py = cy;
        const steps = 6;
        for (let s = 1; s <= steps; s++) {
            const dist = (len * s) / steps, ang = (base + (rand() - 0.5) * 22) * Math.PI / 180;
            const nx = cx + Math.sin(ang) * dist, ny = cy - Math.cos(ang) * dist;
            line(c, px, py, nx, ny, 5, GOLD, 0.45 * fade, 2.2); line(c, px, py, nx, ny, 2, WHITE, 0.95 * fade, 1);
            px = nx; py = ny;
        }
    }
    return c;
}

// ---- Apolloから漂う光の粒子(128px) ----
const PW = 128, PFRAMES = 8;
const particleSeeds = Array.from({ length: 16 }, () => ({ x: 20 + rand() * 88, y: 60 + rand() * 50, r: 1.4 + rand() * 2.4, rise: 14 + rand() * 30, sway: rand() * 6, phase: rand() * 6.28 }));
function particleFrame(i) {
    const c = canvas(PW, PW), t = (i + 1) / PFRAMES;
    for (const p of particleSeeds) {
        const x = p.x + Math.sin(p.phase + t * 5) * p.sway, y = p.y - p.rise * t, a = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.95;
        disc(c, x, y, p.r * 2.2, GOLD, 0.28 * a, 3); disc(c, x, y, p.r, WHITE, a, 1);
    }
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) ? data : encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
for (const [name, thick] of [["$ProjectR_GoldenArrow", false], ["$ProjectR_GoldenArrowThick", true]]) {
    const s = arrowSheet(thick); write(out("img", "characters", "VFX", name + ".png"), s, `${s.w}x${s.h}`);
}
write(out("img", "pictures", "ProjectR_Bow_DEV.png"), bowPicture(), "64x32");
const burst = sheetOf(burstFrame, BFRAMES, 4, 2, BW, BW);
write(out("img", "pictures", "Animation", "ProjectR_Volley_Burst.png"), burst, `${burst.w}x${burst.h}`);
const particles = sheetOf(particleFrame, PFRAMES, 4, 2, PW, PW);
write(out("img", "pictures", "Animation", "ProjectR_Volley_Particles.png"), particles, `${particles.w}x${particles.h}`);
const extend = sheetFor("ArmExtend");
write(out("img", "characters", fileName("ArmExtend")), encodePng(extend.w, extend.h, extend.px), `${extend.w}x${extend.h}`);

// VFX Designerライブラリへの登録。既存の項目は一切変えず、無い項目だけを末尾に足す。
const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    const entry = (file, fps, zIndex, opacity, blend, offsetY) => ({ spritesheetFile: "Animation/" + file, rows: 2, columns: 4, fps, zIndex, blendMode: blend, scale: 100, opacity, hue: 0, offsetX: 0, offsetY,
        flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
        tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 });
    const wanted = {
        ProjectR_Volley_Burst: entry("ProjectR_Volley_Burst", 24, "6", 255, "Add", -24),
        ProjectR_Volley_Particles: entry("ProjectR_Volley_Particles", 10, "3", 235, "Add", -30)
    };
    let added = 0;
    for (const [name, value] of Object.entries(wanted)) if (!library[name]) { library[name] = value; added++; }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
