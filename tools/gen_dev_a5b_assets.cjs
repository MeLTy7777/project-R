"use strict";
// Phase Apollo-A5B のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a5b_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/pictures/Animation/ProjectR_Volley_Beam.png  黄金のビームの1区間(幅3マス x 長さ3マス = 1コマ144x144。上向き。4列x2行=8コマ)。
//     上下の端が継ぎ目なくつながる(電撃は周期が144pxの整数分の1)ので、同じ区間を並べてビーム全体にする(ProjectR_PresentationVfx の beam:true)。
// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ ProjectR_Volley_Beam を、無ければ末尾に足す。
const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("./gen_dev3h_character.cjs");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const force = process.argv.includes("--force");
const out = (...parts) => path.join(root, ...parts);
const W = 144, FRAMES = 8;
const canvas = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
const plot = (c, x, y, a, rgb) => {
    if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    const o = (y * c.w + x) * 4, cur = c.px[o + 3] / 255, next = a + cur * (1 - a), k = next > 0 ? a / next : 1;
    c.px[o] = Math.round(c.px[o] * (1 - k) + rgb[0] * k); c.px[o + 1] = Math.round(c.px[o + 1] * (1 - k) + rgb[1] * k);
    c.px[o + 2] = Math.round(c.px[o + 2] * (1 - k) + rgb[2] * k); c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width));
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245];
let seed = 20261102;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const arcs = [{ f: 1, amp: 34, ph: 0.4 }, { f: 2, amp: 22, ph: 2.1 }, { f: 3, amp: 14, ph: 4.0 }, { f: 2, amp: 30, ph: 5.2 }];
function frame(i) {
    const c = canvas(W, W), cx = W / 2, pulse = 0.85 + 0.15 * Math.sin(i / FRAMES * Math.PI * 2);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const d = Math.abs(x + 0.5 - cx);
        plot(c, x, y, smooth(d - 10, 60) * 0.42 * pulse, GOLD); // 幅3マス全体の光
        plot(c, x, y, smooth(d - 7, 12) * 0.9 * pulse, LIGHT);
        plot(c, x, y, smooth(d - 3, 5) * pulse, WHITE); // 白熱の芯
    }
    for (const [n, a] of arcs.entries()) { // 電撃: 周期が144の整数分の1なので、上下がつながる。コマごとに位相が整数周期ぶん進み、8コマで一巡
        for (let y = 0; y < W; y++) {
            const t = (a.f * y / W + (i / FRAMES) * (n % 2 ? -1 : 1) * a.f) * Math.PI * 2 + a.ph;
            const x = cx + a.amp * Math.sin(t) + 3 * Math.sin(y * 0.9 + i + n);
            for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(x) + dx, y, smooth(Math.abs(dx) - 0.8, 2.2) * 0.9, dx === 0 ? WHITE : GOLD);
        }
    }
    for (let k = 0; k < 7; k++) { // 火花
        const x = Math.round(cx + (rand() - 0.5) * 120), y = Math.floor(rand() * W);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) plot(c, x + dx, y + dy, smooth(Math.hypot(dx, dy) - 0.6, 1.8) * 0.9, WHITE);
    }
    return c;
}
function sheet() {
    const cols = 4, rows = 2, s = canvas(cols * W, rows * W);
    for (let i = 0; i < FRAMES; i++) {
        const f = frame(i), ox = (i % cols) * W, oy = Math.floor(i / cols) * W;
        for (let y = 0; y < W; y++) f.px.copy(s.px, ((oy + y) * s.w + ox) * 4, y * W * 4, (y + 1) * W * 4);
    }
    return s;
}
const file = out("img", "pictures", "Animation", "ProjectR_Volley_Beam.png");
if (fs.existsSync(file) && !force) console.log("既にあるので作りません:", path.relative(root, file));
else { const s = sheet(); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, encodePng(s.w, s.h, s.px)); console.log("作成:", path.relative(root, file), `${s.w}x${s.h}`); }
const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    if (!library.ProjectR_Volley_Beam) {
        library.ProjectR_Volley_Beam = { spritesheetFile: "Animation/ProjectR_Volley_Beam", rows: 2, columns: 4, fps: 18, zIndex: "6", blendMode: "Add", scale: 100, opacity: 240, hue: 0, offsetX: 0, offsetY: -18,
            flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
            tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 };
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加: 1件");
    } else console.log("ライブラリは登録済み");
}
