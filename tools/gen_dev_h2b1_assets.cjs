"use strict";
// Phase H2B-1 のDEV素材(自作・差し替え前提)を生成する。
//   node tools/gen_dev_h2b1_assets.cjs <プロジェクトルート>
// 作るもの(既存の画像は上書きしない。無い物だけ作る / --force で作り直す):
//   img/pictures/ProjectR_Caduceus_DEV.png            ケーリュケイオン(杖)64x32。公式SwingWeaponに渡す武器画像(Pan.pngと同じ寸法・向き)
//   img/pictures/Animation/ProjectR_Sweep_Staff.png   薙ぎ払いの杖の残像(白・半透明)。4列x2行=8コマ、1コマ400x400。上向きが基準(回転で向きを合わせる)
//   img/pictures/Animation/ProjectR_Flute_Ripple.png  葦笛の水面の波(白・半透明)。4列x2行=8コマ、1コマ800x800。半径8マス=384pxに合わせる
//   img/characters/$DEV3H_ArmSweep_f4.png             主人公の「腕を前に振り払う」DEV3H(4コマ)
const fs = require("node:fs");
const path = require("node:path");
const { ACTIONS, sheetFor, fileName, encodePng } = require("./gen_dev3h_character.cjs");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const force = process.argv.includes("--force");
const out = (...parts) => path.join(root, ...parts);

const canvas = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
// 白で、alpha(0..1)を合成する(over)。
const plot = (c, x, y, a) => {
    if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    const o = (y * c.w + x) * 4, cur = c.px[o + 3] / 255;
    const next = a + cur * (1 - a);
    c.px[o] = 255; c.px[o + 1] = 255; c.px[o + 2] = 255; c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width)); // edge<=0: 内側(1)、widthで0

// ---- 杖の残像 ----
const STAFF_FRAME = 400, STAFF_COLS = 4, STAFF_ROWS = 2, STAFF_FRAMES = 8;
function staffFrame(index) {
    const size = STAFF_FRAME, cx = size / 2, cy = size / 2;
    const c = canvas(size, size);
    const from = -95, to = 95, span = to - from;
    const angle = i => from + span * (i / (STAFF_FRAMES - 2)); // 最後のコマは薄れて消えるだけ
    const head = Math.min(index, STAFF_FRAMES - 2);
    const theta = angle(head);
    const fade = index >= STAFF_FRAMES - 1 ? 0.35 : 1;
    const R0 = 120, R1 = 178; // 内側の杖の根元〜先端(px)。外周が約3.7マス
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const r = Math.hypot(dx, dy);
        if (r < 40 || r > 196) continue;
        const phi = Math.atan2(dx, -dy) * 180 / Math.PI; // 上=0、時計回り
        // 残像(三日月): 杖の角度から後ろへ約75度。後ろほど薄く、先端側ほど太い
        const behind = theta - phi;
        if (behind >= 0 && behind <= 75 && phi >= from - 4) {
            const age = behind / 75;
            const radial = (r - R0) / (R1 - R0); // 0..1
            const inner = R0 + (R1 - R0) * 0.35 * age; // 後ろほど細くなる
            const edgeIn = inner - r, edgeOut = r - (R1 + 14);
            const cover = Math.min(smooth(edgeIn, 3), smooth(edgeOut, 3));
            plot(c, x, y, cover * (1 - age) * (1 - age * 0.4) * 0.8 * fade);
            void radial;
        }
    }
    // 杖本体(白い線 + 先端の小さな翼)
    if (index < STAFF_FRAMES - 1) {
        const t = theta * Math.PI / 180, ux = Math.sin(t), uy = -Math.cos(t);
        const a = { x: cx + ux * 60, y: cy + uy * 60 }, b = { x: cx + ux * 186, y: cy + uy * 186 };
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const px = x + 0.5, py = y + 0.5;
            const abx = b.x - a.x, aby = b.y - a.y, len2 = abx * abx + aby * aby;
            const u = Math.max(0, Math.min(1, ((px - a.x) * abx + (py - a.y) * aby) / len2));
            const d = Math.hypot(px - (a.x + abx * u), py - (a.y + aby * u));
            plot(c, x, y, smooth(d - 3.2, 1.6) * 0.95 * fade);
            // 先端(ケーリュケイオンの翼): 先端付近で左右へ小さく広がる
            const tip = Math.hypot(px - b.x, py - b.y);
            plot(c, x, y, smooth(tip - 7, 2) * 0.9 * fade);
            const nx = -uy, ny = ux;
            for (const s of [-1, 1]) {
                const wing = Math.hypot(px - (b.x - ux * 8 + nx * s * 11), py - (b.y - uy * 8 + ny * s * 11));
                plot(c, x, y, smooth(wing - 4.5, 1.8) * 0.8 * fade);
            }
        }
    }
    return c;
}

// ---- 水面の波 ----
const RIPPLE_FRAME = 800, RIPPLE_FRAMES = 8;
function rippleFrame(index) {
    const size = RIPPLE_FRAME, c0 = size / 2;
    const c = canvas(size, size);
    const maxR = 384; // 半径8マス(48px x 8)
    const t = (index + 1) / RIPPLE_FRAMES;
    const rings = [0, 0.16, 0.32].map(delay => Math.max(0, Math.min(1, (t - delay) / (1 - 0.32))));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const r = Math.hypot(x + 0.5 - c0, y + 0.5 - c0);
        if (r > maxR + 12) continue;
        let a = 0;
        rings.forEach((progress, k) => {
            if (progress <= 0) return;
            const ringR = maxR * (0.12 + 0.88 * Math.sin(progress * Math.PI / 2)); // 速く出て、遅くなる(水面の波)
            const width = 5 - k * 0.8; // 太さ(px)
            const d = Math.abs(r - ringR);
            const fadeOut = 1 - progress * 0.85;
            a = Math.max(a, smooth(d - width, 2.2) * fadeOut * (0.85 - k * 0.12));
            // リングの内側にうっすらと半透明の面
            if (r < ringR) a = Math.max(a, 0.07 * (r / ringR) * fadeOut);
        });
        plot(c, x, y, a);
    }
    return c;
}

function sheetOf(renderFrame, frames, cols, rows, frameSize) {
    const w = cols * frameSize, h = rows * frameSize;
    const sheet = canvas(w, h);
    for (let i = 0; i < frames; i++) {
        const frame = renderFrame(i), ox = (i % cols) * frameSize, oy = Math.floor(i / cols) * frameSize;
        for (let y = 0; y < frameSize; y++) {
            frame.px.copy(sheet.px, ((oy + y) * w + ox) * 4, y * frameSize * 4, (y + 1) * frameSize * 4);
        }
    }
    return sheet;
}

// ---- 杖(武器画像 64x32、右向き) ----
function caduceusPicture() {
    const c = canvas(64, 32);
    const col = (x, y, rgb, a) => {
        if (x < 0 || y < 0 || x >= 64 || y >= 32 || a <= 0) return;
        const o = (y * 64 + x) * 4; c.px[o] = rgb[0]; c.px[o + 1] = rgb[1]; c.px[o + 2] = rgb[2]; c.px[o + 3] = Math.round(a * 255);
    };
    // 柄(金)。左の端から先端まで
    for (let x = 4; x < 56; x++) for (let y = 15; y <= 17; y++) col(x, y, y === 16 ? [255, 236, 150] : [214, 170, 70], 1);
    // 蛇の巻き付き(白と金の交互)
    for (let x = 10; x < 46; x++) {
        const y = 16 + Math.round(Math.sin(x * 0.55) * 4);
        col(x, y, [255, 255, 255], 1); col(x, y + 1, [230, 230, 230], 1);
        const y2 = 16 + Math.round(Math.sin(x * 0.55 + Math.PI) * 4);
        col(x, y2, [255, 220, 120], 1);
    }
    // 先端の玉と翼
    for (let y = 12; y <= 20; y++) for (let x = 53; x <= 61; x++) if (Math.hypot(x - 57, y - 16) <= 4.2) col(x, y, [255, 240, 170], 1);
    for (const s of [-1, 1]) for (let k = 0; k < 9; k++) {
        col(48 + k, 16 + s * (3 + Math.round(k * 0.9)), [255, 255, 255], 1);
        col(48 + k, 16 + s * (4 + Math.round(k * 0.9)), [225, 235, 255], 0.9);
    }
    return c;
}

function write(file, canvasOrPng, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const png = Buffer.isBuffer(canvasOrPng) ? canvasOrPng : encodePng(canvasOrPng.w, canvasOrPng.h, canvasOrPng.px);
    fs.writeFileSync(file, png);
    console.log("作成:", path.relative(root, file), label || "");
}

const staff = sheetOf(staffFrame, STAFF_FRAMES, STAFF_COLS, STAFF_ROWS, STAFF_FRAME);
write(out("img", "pictures", "Animation", "ProjectR_Sweep_Staff.png"), staff, `${staff.w}x${staff.h}`);
const ripple = sheetOf(rippleFrame, RIPPLE_FRAMES, 4, 2, RIPPLE_FRAME);
write(out("img", "pictures", "Animation", "ProjectR_Flute_Ripple.png"), ripple, `${ripple.w}x${ripple.h}`);
const cad = caduceusPicture();
write(out("img", "pictures", "ProjectR_Caduceus_DEV.png"), cad, "64x32");
const arm = sheetFor("ArmSweep");
write(out("img", "characters", fileName("ArmSweep")), encodePng(arm.w, arm.h, arm.px), `${arm.w}x${arm.h}`);
void ACTIONS;
