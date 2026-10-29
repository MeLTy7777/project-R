"use strict";
// Phase H2B-2 のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_h2b2_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/pictures/Animation/ProjectR_Issen_Trail.png      一閃の斬撃の軌跡(白)。4列x2行=8コマ、1コマ160x560(上向きの11マス=528px)
//   img/pictures/Animation/ProjectR_Issen_Lightning.png  一閃の白と黒の雷。同じ寸法
//   img/pictures/Animation/ProjectR_Strength_Circle.png  ストレングスの魔法陣(黄金)。1コマ240x240
//   img/pictures/Animation/ProjectR_Strength_Light.png   ストレングスの黄金の光(魔法陣から立ち上る)。1コマ240x320
//   img/characters/$DEV3H_FistPump_f4.png                主人公のガッツポーズ(4コマ x 4方向)
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
    // 色は「あとから重ねた色」を新しい寄与の割合で混ぜる
    const k = next > 0 ? a / next : 1;
    c.px[o] = Math.round(c.px[o] * (1 - k) + rgb[0] * k); c.px[o + 1] = Math.round(c.px[o + 1] * (1 - k) + rgb[1] * k);
    c.px[o + 2] = Math.round(c.px[o + 2] * (1 - k) + rgb[2] * k); c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width));
let seed = 20261029;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function sheetOf(renderFrame, frames, cols, rows, fw, fh) {
    const w = cols * fw, h = rows * fh, sheet = canvas(w, h);
    for (let i = 0; i < frames; i++) {
        const frame = renderFrame(i), ox = (i % cols) * fw, oy = Math.floor(i / cols) * fh;
        for (let y = 0; y < fh; y++) frame.px.copy(sheet.px, ((oy + y) * w + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
    }
    return sheet;
}

// ---- 一閃: 軌跡(上向きの縦長。下=発動点、上=11マス先) ----
const TW = 160, TH = 560, TFRAMES = 8;
function trailFrame(i) {
    const c = canvas(TW, TH), cx = TW / 2;
    // 先端が走る(0→1)。各コマで「走った長さ」までの細い白い刃筋 + 周りの薄い光。後半は消える。
    const run = Math.min(1, (i + 1) / 4), fade = i < 4 ? 1 : Math.max(0, 1 - (i - 3) / 5);
    const tip = TH - 16 - run * (TH - 40); // 上端のy
    for (let y = Math.max(0, Math.floor(tip)); y < TH - 8; y++) {
        const along = (TH - 8 - y) / (TH - 8 - tip); // 0=発動点側 1=先端
        const half = 2.2 + 3.2 * (1 - along); // 発動点側ほど太い
        for (let x = 0; x < TW; x++) {
            const d = Math.abs(x + 0.5 - cx);
            const core = smooth(d - half, 1.4), glow = smooth(d - (half + 14), 14) * 0.28;
            plot(c, x, y, Math.max(core, glow) * fade * (0.55 + 0.45 * (1 - along)), [255, 255, 255]);
        }
    }
    return c;
}
// ---- 一閃: 白と黒の雷(ジグザグ。コマごとに形が変わる) ----
function lightningFrame(i) {
    const c = canvas(TW, TH), cx = TW / 2, fade = i < 3 ? 1 : Math.max(0, 1 - (i - 2) / 5);
    const bolts = [{ rgb: [20, 20, 28], width: 3.4, amp: 30 }, { rgb: [255, 255, 255], width: 2.2, amp: 26 }, { rgb: [255, 255, 255], width: 1.6, amp: 38 }];
    bolts.forEach((bolt, b) => {
        let x = cx + (rand() - 0.5) * 8;
        const pts = [];
        for (let y = TH - 8; y > 8; y -= 22 + rand() * 18) { x = Math.max(24, Math.min(TW - 24, x + (rand() - 0.5) * bolt.amp)); pts.push({ x, y }); }
        for (let k = 0; k + 1 < pts.length; k++) {
            const p = pts[k], q = pts[k + 1], steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y));
            for (let s = 0; s <= steps; s++) {
                const t = s / steps, px = p.x + (q.x - p.x) * t, py = p.y + (q.y - p.y) * t, r = Math.ceil(bolt.width + 2);
                for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - bolt.width / 2, 1.2) * 0.9 * fade, bolt.rgb);
            }
        }
        void b;
    });
    return c;
}
// ---- ストレングス: 魔法陣(黄金。足元に広がる楕円。コマごとに回転・拡大) ----
const CW = 240, CFRAMES = 8;
function circleFrame(i) {
    const c = canvas(CW, CW), cx = CW / 2, cy = CW / 2;
    const grow = Math.min(1, (i + 1) / 3), fade = i < 5 ? 1 : Math.max(0, 1 - (i - 4) / 4), rot = i * 0.35;
    const rx = 100 * grow, ry = 50 * grow; // 地面に寝かせた楕円
    for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) {
        const dx = (x + 0.5 - cx), dy = (y + 0.5 - cy) * (rx / ry), r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) + rot;
        if (r > rx + 4) continue;
        let a = 0;
        a = Math.max(a, smooth(Math.abs(r - rx) - 2.5, 1.6)); // 外周
        a = Math.max(a, smooth(Math.abs(r - rx * 0.78) - 1.5, 1.4) * 0.8); // 内周
        // 六芒星(2つの正三角形)
        for (const base of [0, Math.PI / 3]) for (let k = 0; k < 3; k++) {
            const a0 = base + k * 2 * Math.PI / 3 + rot, a1 = a0 + 2 * Math.PI / 3, ra = rx * 0.78;
            const p = { x: Math.cos(a0) * ra, y: Math.sin(a0) * ra }, q = { x: Math.cos(a1) * ra, y: Math.sin(a1) * ra };
            const vx = q.x - p.x, vy = q.y - p.y, t = Math.max(0, Math.min(1, ((dx - p.x) * vx + (dy - p.y) * vy) / (vx * vx + vy * vy)));
            a = Math.max(a, smooth(Math.hypot(dx - p.x - vx * t, dy - p.y - vy * t) - 1.4, 1.3) * 0.9);
        }
        // 文字風の点(外周と内周のあいだ)
        const dots = 12; for (let k = 0; k < dots; k++) { const ka = rot * 2 + k * 2 * Math.PI / dots; a = Math.max(a, smooth(Math.hypot(dx - Math.cos(ka) * rx * 0.89, dy - Math.sin(ka) * rx * 0.89) - 2.2, 1.4) * 0.9); }
        void ang;
        plot(c, x, Math.round(cy + (y - cy) * (ry / rx)) === y ? y : y, a * fade, [255, 214, 90]);
    }
    return c;
}
// ---- ストレングス: 黄金の光(魔法陣から立ち上る柱と粒) ----
const LW = 240, LH = 320, LFRAMES = 8;
function lightFrame(i) {
    const c = canvas(LW, LH), cx = LW / 2, base = LH - 40;
    const rise = Math.min(1, (i + 1) / 4), fade = i < 5 ? 1 : Math.max(0, 1 - (i - 4) / 4);
    for (let y = 0; y < base; y++) {
        const along = (base - y) / base; if (along > rise) continue;
        const half = 56 * (1 - along * 0.55) * (0.6 + 0.4 * Math.min(1, (rise - along) * 4));
        for (let x = 0; x < LW; x++) {
            const d = Math.abs(x + 0.5 - cx), a = smooth(d - half, half * 0.9) * (1 - along) * 0.55 * fade;
            plot(c, x, y, a, along < 0.25 ? [255, 238, 150] : [255, 206, 70]);
        }
    }
    for (let k = 0; k < 26; k++) { // 粒
        const px = cx + (rand() - 0.5) * 120, life = (rand() + i / LFRAMES * 1.4) % 1, py = base - life * (base - 10), r = 1.6 + rand() * 2.4;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy) - r, 1.4) * (1 - life) * fade, [255, 244, 190]);
    }
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) ? data : encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const trail = sheetOf(trailFrame, TFRAMES, 4, 2, TW, TH);
write(out("img", "pictures", "Animation", "ProjectR_Issen_Trail.png"), trail, `${trail.w}x${trail.h}`);
const lightning = sheetOf(lightningFrame, TFRAMES, 4, 2, TW, TH);
write(out("img", "pictures", "Animation", "ProjectR_Issen_Lightning.png"), lightning, `${lightning.w}x${lightning.h}`);
const circle = sheetOf(circleFrame, CFRAMES, 4, 2, CW, CW);
write(out("img", "pictures", "Animation", "ProjectR_Strength_Circle.png"), circle, `${circle.w}x${circle.h}`);
const light = sheetOf(lightFrame, LFRAMES, 4, 2, LW, LH);
write(out("img", "pictures", "Animation", "ProjectR_Strength_Light.png"), light, `${light.w}x${light.h}`);
const fist = sheetFor("FistPump");
write(out("img", "characters", fileName("FistPump")), encodePng(fist.w, fist.h, fist.px), `${fist.w}x${fist.h}`);
