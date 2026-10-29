// ProjectR 開発用の演出素材(自作。外部素材なし)。最終アートができたら同じファイル名で差し替える。
//   1. img/pictures/Animation/ProjectR_Zetsu_Noise.png  ... 絶(Zetsu)の黒白ノイズ。8コマ(4列x2行・各160px)
//   2. img/pictures/ProjectR_CutIn_Hermes_Eyes_DEV.png    ... Hermesの目元(512x128・仮絵)
//   3. img/pictures/ProjectR_CutIn_Player_Eyes_DEV.png    ... 主人公の目元(512x128・仮絵)
// 使い方: node tools/gen_dev_cutin_vfx.cjs <プロジェクトのルート> [--only noise|eyes]
// 既存ファイルは上書きしません(同名があれば何もせず終了します)。作り直すときだけ --force を付けます(自作のDEV素材専用)。決定的(乱数は固定シード)なので再生成しても同じ絵です。
const fs = require("fs"), path = require("path"), zlib = require("zlib");

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
};
const encodePng = (w, h, px) => {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const rng = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const clamp01 = v => Math.min(1, Math.max(0, v));

// ---------- 1. 黒白ノイズ(8コマ) ----------
const FRAME = 160, COLUMNS = 4, ROWS = 2, FRAMES = COLUMNS * ROWS, BLOCK = 4;
const noiseSheet = () => {
    const w = FRAME * COLUMNS, h = FRAME * ROWS, px = Buffer.alloc(w * h * 4);
    for (let f = 0; f < FRAMES; f++) {
        const rand = rng(1000 + f * 7919);
        const envelope = Math.sin(Math.PI * (f + 0.5) / FRAMES); // 0→1→0
        const radius = 44 + 34 * envelope, cx = FRAME / 2, cy = FRAME / 2 + 6; // 小さすぎると実機で見えないので、最小でも大きめ
        const ox = (f % COLUMNS) * FRAME, oy = Math.floor(f / COLUMNS) * FRAME;
        // 横ずれ(グリッチ帯): 行ごとに小さくずらす
        const shifts = []; for (let by = 0; by < FRAME / BLOCK; by++) shifts.push(rand() < 0.18 ? Math.round((rand() - 0.5) * 6) * BLOCK : 0);
        for (let by = 0; by < FRAME / BLOCK; by++) for (let bx = 0; bx < FRAME / BLOCK; bx++) {
            const x = bx * BLOCK + BLOCK / 2, y = by * BLOCK + BLOCK / 2;
            const d = Math.hypot((x - cx) / 0.8, y - cy); // 縦長の楕円(人影の大きさ)
            const edge = radius * (0.85 + 0.3 * rand());
            const white = rand() < 0.5;
            const keep = d < edge && rand() < 0.97 - 0.3 * (d / edge);
            if (!keep) continue;
            const alpha = Math.round(255 * clamp01(0.35 + envelope) * clamp01(1.25 - d / edge));
            for (let yy = 0; yy < BLOCK; yy++) for (let xx = 0; xx < BLOCK; xx++) {
                const sx = bx * BLOCK + xx + shifts[by];
                if (sx < 0 || sx >= FRAME) continue;
                const i = ((oy + by * BLOCK + yy) * w + ox + sx) * 4;
                const v = white ? 255 : 0;
                px[i] = v; px[i + 1] = v; px[i + 2] = v; px[i + 3] = alpha;
            }
        }
    }
    return { w, h, px };
};

// ---------- 2/3. 目元(仮絵) ----------
const EYE_W = 512, EYE_H = 128;
const eyesImage = ({ iris, irisEdge, tilt, lid }) => {
    const px = Buffer.alloc(EYE_W * EYE_H * 4);
    const eyes = [{ cx: 150, cy: 66, flip: 1 }, { cx: 362, cy: 66, flip: -1 }];
    const halfW = 104, halfH = 36, irisR = 29, pupilR = 12;
    for (let y = 0; y < EYE_H; y++) for (let x = 0; x < EYE_W; x++) {
        let out = null;
        for (const eye of eyes) {
            const dx = x + 0.5 - eye.cx, dy = y + 0.5 - eye.cy, a = tilt * Math.PI / 180 * eye.flip;
            const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
            if (Math.abs(u) > halfW) continue;
            const hh = halfH * Math.pow(Math.max(0, 1 - (u / halfW) ** 2), 0.8) * (v < 0 ? 0.9 : 1);
            const inside = hh - Math.abs(v);
            if (inside < -1.2) continue;
            const cover = clamp01(inside / 1.4 + 0.5);
            let color = [246, 244, 240]; // 強膜
            if (inside < 3.2) color = lid; // まぶたの縁
            else {
                const iu = u - eye.flip * 6, dist = Math.hypot(iu, v);
                if (dist < irisR) {
                    const k = clamp01(dist / irisR);
                    color = iris.map((c, n) => Math.round(c * (1 - 0.55 * k) + irisEdge[n] * 0.55 * k));
                    if (dist < pupilR) color = [10, 10, 14];
                    if (Math.hypot(iu + 9, v + 9) < 5) color = [255, 255, 255]; // ハイライト
                }
            }
            out = { color, alpha: Math.round(255 * cover) };
        }
        if (out) { const i = (y * EYE_W + x) * 4; px[i] = out.color[0]; px[i + 1] = out.color[1]; px[i + 2] = out.color[2]; px[i + 3] = out.alpha; }
    }
    return { w: EYE_W, h: EYE_H, px };
};

const assets = root => ({
    noise: [{ file: path.join(root, "img", "pictures", "Animation", "ProjectR_Zetsu_Noise.png"), make: noiseSheet }],
    eyes: [
        { file: path.join(root, "img", "pictures", "ProjectR_CutIn_Hermes_Eyes_DEV.png"),
            make: () => eyesImage({ iris: [63, 208, 201], irisEdge: [14, 76, 92], tilt: 9, lid: [20, 36, 44] }) },
        { file: path.join(root, "img", "pictures", "ProjectR_CutIn_Player_Eyes_DEV.png"),
            make: () => eyesImage({ iris: [150, 96, 52], irisEdge: [64, 34, 20], tilt: 3, lid: [34, 24, 22] }) }
    ]
});

if (require.main === module) {
    const root = process.argv[2];
    if (!root) { console.error("使い方: node tools/gen_dev_cutin_vfx.cjs <プロジェクトのルート> [--only noise|eyes] [--force]"); process.exit(1); }
    const onlyIndex = process.argv.indexOf("--only"), only = onlyIndex > 0 ? process.argv[onlyIndex + 1] : null;
    const force = process.argv.includes("--force");
    const table = assets(path.resolve(root));
    for (const [group, list] of Object.entries(table)) {
        if (only && only !== group) continue;
        for (const { file, make } of list) {
            if (fs.existsSync(file) && !force) { console.log("skip (exists):", file); continue; }
            fs.mkdirSync(path.dirname(file), { recursive: true });
            const image = make();
            fs.writeFileSync(file, encodePng(image.w, image.h, image.px));
            console.log("wrote", file, image.w + "x" + image.h);
        }
    }
}
module.exports = { noiseSheet, eyesImage, encodePng, FRAME, COLUMNS, ROWS, FRAMES };
