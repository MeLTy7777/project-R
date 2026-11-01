"use strict";
// Phase Apollo-A5C のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a5c_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/pictures/Animation/ProjectR_Volley_BeamLane.png  ビームの1レーン(幅1マス x 長さ2マス = 1コマ48x96。上向き。4列x2行=8コマ)。上下が継ぎ目なくつながる。一部のレーンだけ遮られたとき用
//   img/pictures/Animation/ProjectR_Charge_Bow.png       弓を引くアニメ(1コマ96px・上向きが狙い方向。弦が引かれ、矢が下がり、光が増す。4列x2行=8コマ)
//   img/pictures/Animation/ProjectR_Charge_BowHold.png   引き切った弓(1コマ96px・2コマのゆらぎ。2列x1行。ループ)
//   img/pictures/Animation/ProjectR_Charge_Glow.png      弓に集まる黄金の光の粒(1コマ96px・8コマ。ループ。強さは再生時の拡縮・不透明度で3段階)
//   img/pictures/Animation/ProjectR_Charge_Ready.png     満タン(0.5秒)の合図の輪(1コマ128px・8コマ。1回)
//   img/characters/$DEV3H_ArmDraw_f4.png                 主人公の「弓を引いて構える」(4コマ x 4方向)
// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ上の5件(ProjectR_Volley_BeamLane / ProjectR_Charge_*)を、無ければ末尾に足す。
const fs = require("node:fs");
const path = require("node:path");
const { sheetFor, fileName, encodePng } = require("./gen_dev3h_character.cjs");
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
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245], AMBER = [230, 150, 40];
let seed = 20261103;
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

// ---- ビームの1レーン(48 x 96。上下がつながる) ----
const LW = 48, LH = 96, LFRAMES = 8;
function laneFrame(i) {
    const c = canvas(LW, LH), cx = LW / 2, pulse = 0.85 + 0.15 * Math.sin(i / LFRAMES * Math.PI * 2);
    for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
        const d = Math.abs(x + 0.5 - cx);
        plot(c, x, y, smooth(d - 8, 16) * 0.5 * pulse, GOLD); plot(c, x, y, smooth(d - 5, 8) * 0.9 * pulse, LIGHT); plot(c, x, y, smooth(d - 2, 3.5) * pulse, WHITE);
    }
    for (const [n, a] of [{ f: 1, amp: 11, ph: 0.4 }, { f: 2, amp: 7, ph: 2.6 }].entries()) {
        for (let y = 0; y < LH; y++) {
            const t = (a.f * y / LH + (i / LFRAMES) * (n % 2 ? -1 : 1) * a.f) * Math.PI * 2 + a.ph, x = cx + a.amp * Math.sin(t);
            for (let dx = -2; dx <= 2; dx++) plot(c, Math.round(x) + dx, y, smooth(Math.abs(dx) - 0.6, 1.8) * 0.9, dx === 0 ? WHITE : GOLD);
        }
    }
    return c;
}

// ---- 弓を引くアニメ(96px。上=狙い方向。弓は上へ膨らむ弧、弦は下側) ----
const BW = 96, BFRAMES = 8;
function drawBow(c, pull, glow) {
    const cx = BW / 2, top = 20, bottom = 76, midY = 48, arcX = 0;
    // 弓の弧(上向きにふくらむ。中心が上)
    let prev = null;
    for (let i = 0; i <= 24; i++) {
        const t = i / 24, x = cx - 28 + 56 * t, y = midY - Math.sin(t * Math.PI) * 24 + 8;
        if (prev) { line(c, prev.x, prev.y, x, y, 4, AMBER, 1, 0.8); line(c, prev.x, prev.y, x, y, 2.4, GOLD, 1, 0.8); line(c, prev.x, prev.y, x, y, 1, WHITE, 0.9, 0.7); }
        prev = { x, y };
    }
    void top; void bottom; void arcX;
    const tipL = { x: cx - 28, y: midY + 8 }, tipR = { x: cx + 28, y: midY + 8 }, nock = { x: cx, y: midY + 8 + 6 + pull * 26 };
    line(c, tipL.x, tipL.y, nock.x, nock.y, 1.2, WHITE, 0.9, 0.7); line(c, tipR.x, tipR.y, nock.x, nock.y, 1.2, WHITE, 0.9, 0.7); // 弦
    line(c, nock.x, nock.y, nock.x, nock.y - 44, 1.8, LIGHT, 1, 0.8); // つがえた矢(上向き)
    disc(c, nock.x, nock.y - 46, 2.6, WHITE, 1, 1);
    if (glow > 0) disc(c, cx, midY - 6, 14 + 10 * glow, GOLD, 0.22 * glow, 12);
}
function bowFrame(i) { const c = canvas(BW, BW), t = i / (BFRAMES - 1); drawBow(c, t, t); return c; }
function bowHoldFrame(i) { const c = canvas(BW, BW); drawBow(c, 1, 1); disc(c, BW / 2, 42, 18 + 3 * i, GOLD, 0.2 + 0.08 * i, 12); for (let k = 0; k < 4; k++) disc(c, BW / 2 + (rand() - 0.5) * 36, 36 + (rand() - 0.5) * 30, 1.3, WHITE, 0.9, 1); return c; }

// ---- 光の粒(96px。中心へ集まる) ----
const GW = 96, GFRAMES = 8;
const motes = Array.from({ length: 14 }, () => ({ ang: rand() * Math.PI * 2, r0: 34 + rand() * 12, size: 1.2 + rand() * 1.6, spin: (rand() - 0.5) * 0.8 }));
function glowFrame(i) {
    const c = canvas(GW, GW), cx = GW / 2, cy = GW / 2, phase = i / GFRAMES;
    disc(c, cx, cy, 10, GOLD, 0.25, 12); disc(c, cx, cy, 4, WHITE, 0.8, 4);
    for (const m of motes) { // 外から中心へ向かい、1周期で1周する(ループでつながる)
        const f = (phase + m.r0 / 100) % 1, r = m.r0 * (1 - f), a = m.ang + m.spin * f * 2 + f * 1.5;
        disc(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, m.size, LIGHT, Math.sin(f * Math.PI) * 0.95, 1.2);
    }
    return c;
}
// ---- 満タンの輪(128px) ----
const RW = 128, RFRAMES = 8;
function readyFrame(i) {
    const c = canvas(RW, RW), cx = RW / 2, t = (i + 1) / RFRAMES, r = 12 + t * 46, fade = 1 - t * t;
    for (let y = 0; y < RW; y++) for (let x = 0; x < RW; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cx); plot(c, x, y, smooth(Math.abs(d - r) - 2.5, 7) * 0.9 * fade, LIGHT); plot(c, x, y, smooth(Math.abs(d - r) - 0.8, 2.5) * fade, WHITE); }
    disc(c, cx, cx, 20 * (1 - t) + 4, GOLD, 0.6 * fade, 10);
    return c;
}

function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.isBuffer(data) ? data : encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const sheets = {
    ProjectR_Volley_BeamLane: [sheetOf(laneFrame, LFRAMES, 4, 2, LW, LH), 18],
    ProjectR_Charge_Bow: [sheetOf(bowFrame, BFRAMES, 4, 2, BW, BW), 16],
    ProjectR_Charge_BowHold: [sheetOf(bowHoldFrame, 2, 2, 1, BW, BW), 8, 1, 2],
    ProjectR_Charge_Glow: [sheetOf(glowFrame, GFRAMES, 4, 2, GW, GW), 10],
    ProjectR_Charge_Ready: [sheetOf(readyFrame, RFRAMES, 4, 2, RW, RW), 24]
};
for (const [name, [sheet]] of Object.entries(sheets)) write(out("img", "pictures", "Animation", name + ".png"), sheet, `${sheet.w}x${sheet.h}`);
const draw = sheetFor("ArmDraw");
write(out("img", "characters", fileName("ArmDraw")), encodePng(draw.w, draw.h, draw.px), `${draw.w}x${draw.h}`);

const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    const entry = (file, fps, zIndex, opacity, blend, rows = 2, columns = 4) => ({ spritesheetFile: "Animation/" + file, rows, columns, fps, zIndex, blendMode: blend, scale: 100, opacity, hue: 0, offsetX: 0, offsetY: -18,
        flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
        tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 });
    const wanted = {
        ProjectR_Volley_BeamLane: entry("ProjectR_Volley_BeamLane", 18, "6", 240, "Add"),
        ProjectR_Charge_Bow: entry("ProjectR_Charge_Bow", 16, "5", 255, "Normal"),
        ProjectR_Charge_BowHold: entry("ProjectR_Charge_BowHold", 8, "5", 255, "Normal", 1, 2),
        ProjectR_Charge_Glow: entry("ProjectR_Charge_Glow", 10, "4", 200, "Add"),
        ProjectR_Charge_Ready: entry("ProjectR_Charge_Ready", 24, "6", 255, "Add")
    };
    let added = 0;
    for (const [name, value] of Object.entries(wanted)) if (!library[name]) { library[name] = value; added++; }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
