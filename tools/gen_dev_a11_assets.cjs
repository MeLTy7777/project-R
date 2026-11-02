"use strict";
// Phase Apollo-A11のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a11_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/pictures/Animation/ProjectR_Golden_Beam.png      黄金の矢Lv3のビームの1区間(幅3マス x 長さ3マス = 1コマ144x144。上向き。4列x2行=8コマ)。
//     従来の共有の絵(ProjectR_Volley_Beam)と違い、横の光が幅3マスの端(±72px)まで続き、端に細い縁の線がある(= 当たり判定の幅と絵の幅が一致する)。
//     上下の端が継ぎ目なくつながる(電撃の周期が144pxの整数分の1)ので、同じ区間を並べてビーム全体にする。
//   img/pictures/Animation/ProjectR_Golden_BeamLane.png  遮られたときの1レーン(幅1マス x 長さ2マス = 1コマ48x96)。左右の端まで光が続き、隣り合うレーンと隙間なくつながる。
// VFX Designerライブラリ(js/AnimationSolutionLibrary.json)へ上の2件を、無ければ末尾に足す(offsetY -9: 実機のアンカー位置(+18px)とHendrixの二重適用を合わせて、撃つ位置の中心線に重ねる)。
const fs = require("node:fs");
const path = require("node:path");
const { encodePng } = require("./gen_dev3h_character.cjs");
const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const force = process.argv.includes("--force");
const out = (...parts) => path.join(root, ...parts);
const FRAMES = 8;
const canvas = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
const plot = (c, x, y, a, rgb) => {
    if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
    const o = (y * c.w + x) * 4, cur = c.px[o + 3] / 255, next = a + cur * (1 - a), k = next > 0 ? a / next : 1;
    c.px[o] = Math.round(c.px[o] * (1 - k) + rgb[0] * k); c.px[o + 1] = Math.round(c.px[o + 1] * (1 - k) + rgb[1] * k);
    c.px[o + 2] = Math.round(c.px[o + 2] * (1 - k) + rgb[2] * k); c.px[o + 3] = Math.round(Math.min(1, next) * 255);
};
const smooth = (edge, width) => Math.max(0, Math.min(1, 1 - Math.max(0, edge) / width));
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245];
const arcsFor = scale => [{ f: 1, amp: 34 * scale, ph: 1.1 }, { f: 2, amp: 22 * scale, ph: 3.0 }, { f: 3, amp: 14 * scale, ph: 5.1 }, { f: 2, amp: 30 * scale, ph: 0.2 }]; // 位相をギガース殺し(A10)とずらして、見た目を少し変える

// 幅 W x 高さ H の1コマ。half = 横の半幅(px)。rim: 端の縁の線を描く(ビーム全体の外側)。
function frame(i, W, H, { rim, arcScale, coreWidth, feather }) {
    const c = canvas(W, H), cx = W / 2, half = W / 2, pulse = 0.85 + 0.15 * Math.sin(i / FRAMES * Math.PI * 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.abs(x + 0.5 - cx), fromEdge = half - d; // 端までの距離(端 = 0)
        plot(c, x, y, (feather > 0 ? Math.min(1, fromEdge / feather + 0.2) : 1) * 0.5 * pulse, GOLD); // 幅いっぱいの光(端まで続く。ビームの外側の端だけ4pxぼかす。レーンはぼかさず隣と隙間なくつなぐ)
        plot(c, x, y, smooth(d - coreWidth * 0.6, coreWidth * 1.2) * 0.9 * pulse, LIGHT);
        plot(c, x, y, smooth(d - 3, 5) * pulse, WHITE); // 白熱の芯
        if (rim) plot(c, x, y, smooth(Math.abs(fromEdge - 4) - 1.5, 2.5) * 0.9 * pulse, LIGHT); // 端の縁(幅3マスの境)
    }
    for (const [n, a] of arcsFor(arcScale).entries()) { // 電撃: 周期が高さの整数分の1なので、上下がつながる
        for (let y = 0; y < H; y++) {
            const t = (a.f * y / H + (i / FRAMES) * (n % 2 ? -1 : 1) * a.f) * Math.PI * 2 + a.ph;
            const x = cx + a.amp * Math.sin(t) + 3 * Math.sin(y * 0.9 + i + n);
            for (let dx = -3; dx <= 3; dx++) plot(c, Math.round(x) + dx, y, smooth(Math.abs(dx) - 0.8, 2.2) * 0.9, dx === 0 ? WHITE : GOLD);
        }
    }
    return c;
}
function sheet(W, H, opts) {
    const cols = 4, rows = 2, s = canvas(cols * W, rows * H);
    for (let i = 0; i < FRAMES; i++) {
        const f = frame(i, W, H, opts), ox = (i % cols) * W, oy = Math.floor(i / cols) * H;
        for (let y = 0; y < H; y++) f.px.copy(s.px, ((oy + y) * s.w + ox) * 4, y * W * 4, (y + 1) * W * 4);
    }
    return s;
}
const assets = {
    ProjectR_Golden_Beam: sheet(144, 144, { rim: true, arcScale: 1.45, coreWidth: 40, feather: 4 }),
    ProjectR_Golden_BeamLane: sheet(48, 96, { rim: false, arcScale: 0.45, coreWidth: 14, feather: 0 })
};
for (const [name, s] of Object.entries(assets)) {
    const file = out("img", "pictures", "Animation", name + ".png");
    if (fs.existsSync(file) && !force) console.log("既にあるので作りません:", path.relative(root, file));
    else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, encodePng(s.w, s.h, s.px)); console.log("作成:", path.relative(root, file), `${s.w}x${s.h}`); }
}
const libraryPath = out("js", "AnimationSolutionLibrary.json");
if (fs.existsSync(libraryPath)) {
    const raw = fs.readFileSync(libraryPath, "utf8"), library = JSON.parse(raw);
    let added = 0;
    for (const name of Object.keys(assets)) {
        if (library[name]) continue;
        library[name] = { spritesheetFile: "Animation/" + name, rows: 2, columns: 4, fps: 18, zIndex: "6", blendMode: "Add", scale: 100, opacity: 240, hue: 0, offsetX: 0, offsetY: -9,
            flip: false, flipY: false, randomFlipX: false, randomFlipY: false, rotation: 0, randomRotation: false, playInReverse: false, bloomEffect: false, blurAmount: 15,
            tintColor: "#FFFFFF", intensity: 255, openingAnimation: "none", endingAnimation: "none", animationDuration: 30 };
        added++;
    }
    if (added) {
        const indent = /\n( +)"/.exec(raw);
        fs.writeFileSync(libraryPath, JSON.stringify(library, null, indent ? indent[1].length : 2) + (raw.endsWith("\n") ? "\n" : ""));
        console.log("ライブラリへ追加:", added, "件");
    } else console.log("ライブラリは登録済み");
}
