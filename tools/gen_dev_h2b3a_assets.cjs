"use strict";
// Phase H2B-3A のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_h2b3a_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/pictures/Animation/ProjectR_Veil_Circle.png  ヴェイルの魔法陣(暗い紫の真円)。4列x2行=8コマ、1コマ480x480(半径5マス@48px=240px)。ループ再生を想定(回転が8コマで一周期の1/8)
//   img/pictures/Animation/ProjectR_Veil_Touch.png   Hermesが地面に手を付いた波紋(暗い紫)。1コマ144x144。1回だけ再生
//   img/pictures/Animation/ProjectR_Veil_Aura.png    効果を受けている味方の足元のオーラ(暗い紫の楕円と細い光)。1コマ96x96。ループ
const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("./gen_dev3h_character.cjs");

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
function sheetOf(renderFrame, frames, cols, rows, fw, fh) {
    const w = cols * fw, h = rows * fh, sheet = canvas(w, h);
    for (let i = 0; i < frames; i++) {
        const frame = renderFrame(i), ox = (i % cols) * fw, oy = Math.floor(i / cols) * fh;
        for (let y = 0; y < fh; y++) frame.px.copy(sheet.px, ((oy + y) * w + ox) * 4, y * fw * 4, (y + 1) * fw * 4);
    }
    return sheet;
}
const DARK = [56, 14, 98], MID = [96, 34, 158], LIGHT = [158, 96, 226];

// ---- 魔法陣: 真円(半径5マス=240px)。外周・内周・六芒星・文字風の点・薄い面。8コマで 1/8 周期(六芒星と12点は6/12回対称)ぶん回る ----
const CW = 480, CFRAMES = 8, CR = 236;
function circleFrame(i) {
    const c = canvas(CW, CW), cx = CW / 2, cy = CW / 2;
    const rot = i * (2 * Math.PI / 48), pulse = 0.85 + 0.15 * Math.sin(i / CFRAMES * 2 * Math.PI);
    const star = CR * 0.78;
    const segs = [];
    for (const base of [0, Math.PI / 3]) for (let k = 0; k < 3; k++) {
        const a0 = base + k * 2 * Math.PI / 3 + rot - Math.PI / 2, a1 = a0 + 2 * Math.PI / 3;
        segs.push({ p: { x: Math.cos(a0) * star, y: Math.sin(a0) * star }, q: { x: Math.cos(a1) * star, y: Math.sin(a1) * star } });
    }
    for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
        if (r > CR + 6) continue;
        let a = 0, rgb = MID;
        if (r <= CR) a = Math.max(a, 0.24 + 0.08 * (r / CR)); // 薄い面
        const ring = (radius, w, strength, color) => { const v = smooth(Math.abs(r - radius) - w / 2, 1.6) * strength; if (v > a) { a = v; rgb = color; } };
        ring(CR, 5, 0.95 * pulse, LIGHT); // 外周(半径5マスの縁)
        ring(CR - 14, 2.5, 0.75, MID); // 外周の内側
        ring(CR * 0.52, 3, 0.7, MID); // 内周
        for (const s of segs) {
            const vx = s.q.x - s.p.x, vy = s.q.y - s.p.y, t = Math.max(0, Math.min(1, ((dx - s.p.x) * vx + (dy - s.p.y) * vy) / (vx * vx + vy * vy)));
            const v = smooth(Math.hypot(dx - s.p.x - vx * t, dy - s.p.y - vy * t) - 1.5, 1.4) * 0.85;
            if (v > a) { a = v; rgb = LIGHT; }
        }
        for (let k = 0; k < 12; k++) { // 文字風の点
            const ka = rot + k * 2 * Math.PI / 12, v = smooth(Math.hypot(dx - Math.cos(ka) * (CR - 7), dy - Math.sin(ka) * (CR - 7)) - 3, 1.6) * 0.95;
            if (v > a) { a = v; rgb = LIGHT; }
        }
        for (let k = 0; k < 6; k++) { // 内側の小円
            const ka = rot + k * 2 * Math.PI / 6 - Math.PI / 2, v = smooth(Math.abs(Math.hypot(dx - Math.cos(ka) * star, dy - Math.sin(ka) * star) - 14) - 1.2, 1.3) * 0.8;
            if (v > a) { a = v; rgb = MID; }
        }
        plot(c, x, y, a, rgb);
    }
    return c;
}

// ---- Hermesが地面に手を付いた波紋(1回) ----
const TW = 144, TFRAMES = 8;
function touchFrame(i) {
    const c = canvas(TW, TW), cx = TW / 2, cy = TW / 2, grow = (i + 1) / TFRAMES, fade = 1 - Math.pow(grow, 2) * 0.9;
    for (let y = 0; y < TW; y++) for (let x = 0; x < TW; x++) {
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        let a = smooth(Math.abs(r - (10 + 58 * grow)) - 2.2, 2) * 0.95 * fade;
        a = Math.max(a, smooth(Math.abs(r - (6 + 36 * grow)) - 1.5, 1.6) * 0.7 * fade);
        if (r < 14 * (1 - grow * 0.5)) a = Math.max(a, 0.55 * fade); // 手の下
        plot(c, x, y, a, a > 0.8 ? LIGHT : MID);
    }
    return c;
}

// ---- 効果を受けている味方の足元のオーラ(ループ) ----
const AW = 96, AFRAMES = 8;
function auraFrame(i) {
    const c = canvas(AW, AW), cx = AW / 2, cy = AW * 0.72, phase = i / AFRAMES * 2 * Math.PI, pulse = 1 + 0.08 * Math.sin(phase);
    const rx = 34 * pulse, ry = 15 * pulse;
    for (let y = 0; y < AW; y++) for (let x = 0; x < AW; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, e = Math.hypot(dx, dy);
        let a = smooth(Math.abs(e - 1) * ry - 1.6, 1.6) * 0.95;
        a = Math.max(a, smooth(Math.abs(e - 0.62) * ry - 1, 1.2) * 0.5);
        if (e < 1) a = Math.max(a, 0.18);
        plot(c, x, y, a, e > 0.9 ? LIGHT : MID);
    }
    for (let k = 0; k < 5; k++) { // 立ち上る細い光
        const ka = k / 5 * 2 * Math.PI, life = ((i / AFRAMES) + k / 5) % 1, px = cx + Math.cos(ka) * rx * 0.7, py = cy + Math.sin(ka) * ry * 0.7 - life * 40;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -2; dx <= 2; dx++) plot(c, Math.round(px) + dx, Math.round(py) + dy, smooth(Math.hypot(dx, dy * 0.6) - 1, 1.4) * (1 - life) * 0.8, LIGHT);
    }
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const circle = sheetOf(circleFrame, CFRAMES, 4, 2, CW, CW);
write(out("img", "pictures", "Animation", "ProjectR_Veil_Circle.png"), circle, `${circle.w}x${circle.h}`);
const touch = sheetOf(touchFrame, TFRAMES, 4, 2, TW, TW);
write(out("img", "pictures", "Animation", "ProjectR_Veil_Touch.png"), touch, `${touch.w}x${touch.h}`);
const aura = sheetOf(auraFrame, AFRAMES, 4, 2, AW, AW);
write(out("img", "pictures", "Animation", "ProjectR_Veil_Aura.png"), aura, `${aura.w}x${aura.h}`);
