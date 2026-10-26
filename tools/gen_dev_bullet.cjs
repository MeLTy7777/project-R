// ProjectR 開発用の弾画像(自作。外部素材なし)。小さく速い短い弾筋(細め・短め)。
// 使い方: node tools/gen_dev_bullet.cjs "<img/characters/VFX/$ProjectR_G17Bullet.png のパス>"
// 規格: 3x4 の 12コマ(1コマ48px)すべて同じ縦の弾道(頭が上、尾が下)。向きはゲーム側の rotateTo で回す。
const fs = require("fs"), zlib = require("zlib");
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const png = (w, h, px) => {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const W = 144, H = 192, px = Buffer.alloc(W * H * 4);
const set = (x, y, r, g, b, a) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; };
// 長さ15px・幅2px(中心の2列)+1pxの暗い縁。先端は白、中ほどは黄、尾は橙で細く消える。
const LEN = 15;
for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 3; cx++) {
    const ox = cx * 48 + 24, oy = cy * 48 + 24; // 弾の中心(回転の中心)
    for (let i = 0; i < LEN; i++) {
        const y = oy - 7 + i, t = i / (LEN - 1);
        const core = i < 3 ? [255, 255, 240] : i < 8 ? [255, 222, 96] : [255, 150, 48];
        const alpha = Math.round(255 * (t < 0.55 ? 1 : 1 - (t - 0.55) / 0.55 * 0.8));
        for (const dx of [-1, 0]) set(ox + dx, y, ...core, alpha);
        for (const dx of [-2, 1]) set(ox + dx, y, 60, 30, 0, Math.round(170 * (alpha / 255)));
    }
    for (const dx of [-1, 0]) set(ox + dx, oy - 8, 60, 30, 0, 170);
}
fs.writeFileSync(process.argv[2], png(W, H, px));
