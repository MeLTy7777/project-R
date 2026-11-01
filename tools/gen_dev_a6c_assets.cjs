"use strict";
// Phase Apollo-A6C のDEV素材(自作・差し替え前提)を生成する。外部素材は使わない。
//   node tools/gen_dev_a6c_assets.cjs <プロジェクトルート> [--force]
// 既存の画像は上書きしない(--force で作り直す)。
//   img/characters/VFX/$ProjectR_ErosBeam.png  エロスの矢 Lv3 のビームの1区間(1マス x 1マス。頭が上。幅0.9マス)。3パターン x 4行(1コマ48px。行はすべて同じ)。
//     上下の端でつながる(縦にいくつも並べて回転しても継ぎ目が出ない)。3パターンは電撃の揺らぎだけが違い、Eventのステップアニメで入れ替わる。ピンクゴールドと白。
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
const GOLD = [255, 205, 70], LIGHT = [255, 236, 150], WHITE = [255, 255, 245], PINK = [255, 140, 190], ROSE = [235, 90, 150];

// ---- ビームの1区間(48x48)。中心線 x=24。半幅 約21.6px(0.9マス)。縦に周期的(周波数が整数)なので上下がつながる ----
function beamCell(pattern) {
    const c = canvas(48, 48), cx = 24;
    for (let y = 0; y < 48; y++) {
        const wob = 0.6 * Math.sin((y / 48) * Math.PI * 2 * 2 + pattern * 2.1); // 芯のわずかな揺らぎ
        for (let x = 0; x < 48; x++) {
            const d = Math.abs(x + 0.5 - (cx + wob));
            plot(c, x, y, smooth(d - 14, 7.6) * 0.55, PINK); // 外側のピンクの光(半幅21.6px)
            plot(c, x, y, smooth(d - 9, 5) * 0.6, GOLD);
            plot(c, x, y, smooth(d - 5, 3.5) * 0.9, LIGHT);
            plot(c, x, y, smooth(d - 2, 2.5), WHITE); // 白熱の芯
        }
    }
    // 電撃(縦に周期的な折れ線。3パターンで位相が違う)
    for (const [f, amp, phase, rgb, w] of [[3, 9, 0.5, WHITE, 1.3], [5, 6, 2.4, LIGHT, 1.1], [2, 11, 4.1, ROSE, 1.2]]) {
        let prev = null;
        for (let y = 0; y <= 48; y++) {
            const x = cx + amp * Math.sin((y / 48) * Math.PI * 2 * f + phase + pattern * 2.1), p = { x, y };
            if (prev) segment(c, prev.x, prev.y, p.x, p.y, w, rgb, 0.9);
            prev = p;
        }
    }
    return c;
}
function segment(c, x0, y0, x1, y1, w, rgb, alpha) {
    const minX = Math.floor(Math.min(x0, x1) - w - 3), maxX = Math.ceil(Math.max(x0, x1) + w + 3), minY = Math.floor(Math.min(y0, y1) - w - 3), maxY = Math.ceil(Math.max(y0, y1) + w + 3);
    const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        // 上下の端をまたぐ分は反対側へ巻き戻して描く(継ぎ目をなくす)
        const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
        const a = smooth(Math.hypot(x + 0.5 - (x0 + dx * t), y + 0.5 - (y0 + dy * t)) - w / 2, 1) * alpha;
        plot(c, x, ((y % 48) + 48) % 48, a, rgb);
    }
}
function beamSheet() {
    const sheet = canvas(144, 192);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
        const cell = beamCell(col);
        for (let y = 0; y < 48; y++) cell.px.copy(sheet.px, ((row * 48 + y) * 144 + col * 48) * 4, y * 48 * 4, (y + 1) * 48 * 4);
    }
    return sheet;
}
function write(file, data, label) {
    if (fs.existsSync(file) && !force) { console.log("既にあるので作りません:", path.relative(root, file)); return; }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, encodePng(data.w, data.h, data.px));
    console.log("作成:", path.relative(root, file), label || "");
}
const sheet = beamSheet();
write(out("img", "characters", "VFX", "$ProjectR_ErosBeam.png"), sheet, `${sheet.w}x${sheet.h}`);
