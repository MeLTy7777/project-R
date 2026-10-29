// ProjectR 開発用キャラクター「DEV3H」(三頭身)の自作スプライト生成スクリプト。外部素材は使っていません。
// 使い方: node tools/gen_dev3h_character.cjs <出力先フォルダ(img/characters)> [プレビューPNGの出力先]
//
// 規格(Hendrix Animation Solution v2.0.7 の「$ 付き=大型キャラクター」規約):
//   1コマ 96x96px / 1シート = (コマ数 x 96) x (4方向 x 96)。行の順は MZ 標準 = 下・左・右・上。
//   ファイル名: $DEV3H_<Action>_f<コマ数>.png ( _f はコマ数、Idle/Walk/Run は自動切替のキーワード )
//   三頭身: 頭の高さ 28px x 3 = 身長 84px。足元はコマの最下行(y=95)。残りは頭上と左右の余白(腕・剣・オーラ用)。
const fs = require("fs"), zlib = require("zlib"), path = require("path");

// ---------------- PNG ----------------
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const encodePng = (w, h, px) => {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};

// ---------------- 規格 ----------------
const W = 96, H = 96, CX = 48, FEET = 95, HIP = 65, SHO = 45, SS = 4;
const HEAD_H = 28, HEIGHT = 84; // 三頭身 = 28 x 3
const U_ARM = 11, L_ARM = 11, U_LEG = 15, L_LEG = 15;
const COLORS = {
    out: [28, 22, 34], skin: [244, 204, 168], skinS: [214, 166, 132], hair: [104, 64, 38], hairL: [142, 92, 54],
    jacket: [48, 104, 132], jacketS: [34, 78, 100], trim: [236, 146, 52], shirt: [236, 232, 220],
    pants: [62, 66, 86], pantsS: [46, 49, 66], boot: [48, 38, 34], bootS: [36, 28, 26],
    steel: [210, 220, 232], steelS: [150, 162, 180], hilt: [190, 140, 60], eye: [34, 28, 44], white: [255, 255, 255]
};

// ---------------- ラスタライザ(4倍で描いて縮小。縁はしきい値でくっきり) ----------------
class Layer {
    constructor() { this.w = W * SS; this.h = H * SS; this.d = new Uint8ClampedArray(this.w * this.h * 4); this.tint = 0; }
    paint(box, test, color) {
        const [x0, y0, x1, y1] = box;
        const ix0 = Math.max(0, Math.floor(x0 * SS)), iy0 = Math.max(0, Math.floor(y0 * SS));
        const ix1 = Math.min(this.w - 1, Math.ceil(x1 * SS)), iy1 = Math.min(this.h - 1, Math.ceil(y1 * SS));
        let [r, g, b] = color;
        if (this.tint) { r += (255 - r) * this.tint; g += (70 - g) * this.tint; b += (70 - b) * this.tint; }
        for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
            if (!test((ix + 0.5) / SS, (iy + 0.5) / SS)) continue;
            const i = (iy * this.w + ix) * 4;
            this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.d[i + 3] = 255;
        }
    }
    // 縁取り付き: 先に「ow だけ広げた」暗い形、次に本体。
    capsule(p, q, r, fill, ow = 1) {
        const test = rr => (x, y) => {
            const vx = q.x - p.x, vy = q.y - p.y, wx = x - p.x, wy = y - p.y;
            const len2 = vx * vx + vy * vy;
            const t = len2 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2)) : 0;
            const dx = wx - vx * t, dy = wy - vy * t;
            return dx * dx + dy * dy <= rr * rr;
        };
        const m = r + ow + 1;
        const box = [Math.min(p.x, q.x) - m, Math.min(p.y, q.y) - m, Math.max(p.x, q.x) + m, Math.max(p.y, q.y) + m];
        if (ow > 0) this.paint(box, test(r + ow), COLORS.out);
        this.paint(box, test(r), fill);
    }
    ellipse(c, rx, ry, rot, fill, ow = 1) {
        const cs = Math.cos(rot), sn = Math.sin(rot);
        const test = (ax, ay) => (x, y) => {
            const dx = x - c.x, dy = y - c.y;
            const lx = dx * cs + dy * sn, ly = -dx * sn + dy * cs;
            return (lx * lx) / (ax * ax) + (ly * ly) / (ay * ay) <= 1;
        };
        const m = Math.max(rx, ry) + ow + 1;
        const box = [c.x - m, c.y - m, c.x + m, c.y + m];
        if (ow > 0) this.paint(box, test(rx + ow, ry + ow), COLORS.out);
        this.paint(box, test(rx, ry), fill);
    }
    poly(pts, fill, ow = 1) {
        const inside = (x, y) => {
            let c = false;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const a = pts[i], b = pts[j];
                if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
            }
            return c;
        };
        const edge = (x, y, r) => {
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                const a = pts[i], b = pts[j];
                const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy;
                const t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len2)) : 0;
                const dx = x - a.x - vx * t, dy = y - a.y - vy * t;
                if (dx * dx + dy * dy <= r * r) return true;
            }
            return false;
        };
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const m = ow + 1;
        const box = [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m];
        if (ow > 0) this.paint(box, (x, y) => inside(x, y) || edge(x, y, ow), COLORS.out);
        this.paint(box, inside, fill);
    }
    star(c, r, fill) {
        const pts = [];
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; pts.push({ x: c.x + Math.sin(a) * rr, y: c.y - Math.cos(a) * rr }); }
        this.poly(pts, fill, 0);
    }
    // 4倍→等倍。半分以上塗られたら不透明(色は塗られたサンプルの平均)。
    resolve() {
        const out = Buffer.alloc(W * H * 4);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            let n = 0, r = 0, g = 0, b = 0;
            for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
                const i = ((y * SS + sy) * this.w + (x * SS + sx)) * 4;
                if (this.d[i + 3]) { n++; r += this.d[i]; g += this.d[i + 1]; b += this.d[i + 2]; }
            }
            if (n * 2 >= SS * SS) { const o = (y * W + x) * 4; out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(b / n); out[o + 3] = 255; }
        }
        return out;
    }
}

// ---------------- ポーズ ----------------
const rad = d => d * Math.PI / 180;
const basePose = () => ({
    dx: 0, dy: 0, rot: 0, lean: 0, headDx: 0, headDy: 0, headTilt: 0,
    // a/e: 側面(横向き)の角度(0=真下、+が前)。o/oe: 正面・背面での横への広がり(0=真下、90=真横、180=真上)。
    aF: { a: 4, e: 10, o: 7, oe: 3 }, aB: { a: -4, e: 10, o: 7, oe: 3 },
    lF: { a: 0, e: 0, o: 3, oe: 0 }, lB: { a: 0, e: 0, o: 3, oe: 0 },
    sword: null, sparks: [], aura: 0, tint: 0, hitBurst: false
});
// rv: 体全体の回転(Downで倒れるとき)を手足のベクトルにも掛ける
const limb = (view, joint, U, L, spec, sgn, rv = v => v) => {
    if (view === "right") {
        const v1 = rv({ x: U * Math.sin(rad(spec.a)), y: U * Math.cos(rad(spec.a)) });
        const p1 = { x: joint.x + v1.x, y: joint.y + v1.y };
        const t = spec.a + spec.e;
        const v2 = rv({ x: L * Math.sin(rad(t)), y: L * Math.cos(rad(t)) });
        return [joint, p1, { x: p1.x + v2.x, y: p1.y + v2.y }];
    }
    const k1 = Math.max(0.14, Math.abs(Math.cos(rad(spec.a))));
    const k2 = Math.max(0.14, Math.abs(Math.cos(rad(spec.a + spec.e))));
    const d1 = { x: sgn * Math.sin(rad(spec.o)), y: Math.cos(rad(spec.o)) };
    const v1 = rv({ x: U * k1 * d1.x, y: U * k1 * d1.y });
    const p1 = { x: joint.x + v1.x, y: joint.y + v1.y };
    const t = spec.o + spec.oe;
    const v2 = rv({ x: L * k2 * sgn * Math.sin(rad(t)), y: L * k2 * Math.cos(rad(t)) });
    return [joint, p1, { x: p1.x + v2.x, y: p1.y + v2.y }];
};

function drawCharacter(view, pose) {
    const layer = new Layer();
    layer.tint = pose.tint || 0;
    const side = view === "right", back = view === "up";
    const pivot = { x: CX, y: HIP };
    const R = rad(pose.rot), cs = Math.cos(R), sn = Math.sin(R);
    const T = p => { const x = p.x - pivot.x, y = p.y - pivot.y; return { x: pivot.x + x * cs - y * sn + pose.dx, y: pivot.y + x * sn + y * cs + pose.dy }; };
    const C = COLORS;
    const upper = p => ({ x: p.x + pose.lean * (HIP - p.y) / (HIP - SHO), y: p.y }); // 腰より上は前傾(lean)

    // 関節
    const hipSpread = side ? 0 : 5, shoSpread = side ? 0.8 : 10;
    const hipF = T({ x: CX + hipSpread, y: HIP }), hipB = T({ x: CX - hipSpread, y: HIP });
    const shoF = T(upper({ x: CX + shoSpread, y: SHO })), shoB = T(upper({ x: CX - shoSpread, y: SHO }));
    const rv = v => ({ x: v.x * cs - v.y * sn, y: v.x * sn + v.y * cs });
    const legF = limb(view, hipF, U_LEG, L_LEG, pose.lF, 1, rv), legB = limb(view, hipB, U_LEG, L_LEG, pose.lB, -1, rv);
    const armF = limb(view, shoF, U_ARM, L_ARM, pose.aF, 1, rv), armB = limb(view, shoB, U_ARM, L_ARM, pose.aB, -1, rv);
    const headC = T(upper({ x: CX + pose.headDx + pose.lean * 0.4, y: 26 + pose.headDy }));
    const neckA = T(upper({ x: CX, y: 41 })), neckB = T(upper({ x: CX, y: 46 }));
    const headRot = R + rad(pose.headTilt);
    const hp = (lx, ly) => ({ x: headC.x + lx * Math.cos(headRot) - ly * Math.sin(headRot), y: headC.y + lx * Math.sin(headRot) + ly * Math.cos(headRot) });
    const dirScale = side ? 1 : 1; // 側面は右向きで描き、左は反転して使う

    // 脚(ズボン+ブーツ)
    const drawLeg = (pts, sgn, far) => {
        const pant = far ? C.pantsS : C.pants, boot = far ? C.bootS : C.boot;
        layer.capsule(pts[0], pts[1], 4.6, pant); layer.capsule(pts[1], pts[2], 4.0, pant);
        if (side) layer.capsule({ x: pts[2].x - 0.5, y: pts[2].y - 1 }, { x: pts[2].x + 5.5, y: pts[2].y + 0.4 }, 3.6, boot);
        else layer.ellipse({ x: pts[2].x + sgn * 0.6, y: pts[2].y }, 4.6, 3.4, 0, boot);
    };
    // 腕(上着の袖+手)
    const drawArm = (pts, far) => {
        layer.capsule(pts[0], pts[1], 3.6, far ? C.jacketS : C.jacket); layer.capsule(pts[1], pts[2], 3.1, far ? C.jacketS : C.jacket);
        layer.ellipse(pts[2], 3.3, 3.3, 0, far ? C.skinS : C.skin);
    };
    const drawTorso = () => {
        const a = T(upper({ x: CX, y: SHO + 1 })), b = T({ x: CX, y: HIP });
        if (side) {
            layer.capsule(a, b, 7.2, C.jacket);
            layer.capsule(T({ x: CX + 1.5, y: HIP - 1.6 }), T({ x: CX - 1.5, y: HIP - 1.6 }), 2.3, C.trim, 0);
            layer.capsule(T(upper({ x: CX + 4.2, y: SHO + 3 })), T({ x: CX + 4.6, y: HIP - 3 }), 1.1, C.shirt, 0);
        } else {
            const sL = T(upper({ x: CX - 9.8, y: SHO - 1.5 })), sR = T(upper({ x: CX + 9.8, y: SHO - 1.5 }));
            const wL = T({ x: CX - 7.6, y: HIP + 1.5 }), wR = T({ x: CX + 7.6, y: HIP + 1.5 });
            layer.poly([sL, sR, wR, wL], C.jacket);
            layer.ellipse(T(upper({ x: CX, y: SHO - 1.5 })), 9.8, 4.2, R, C.jacket);
            layer.poly([T({ x: CX - 7.8, y: HIP - 3 }), T({ x: CX + 7.8, y: HIP - 3 }), T({ x: CX + 7.6, y: HIP + 1 }), T({ x: CX - 7.6, y: HIP + 1 })], C.trim, 0);
            if (!back) {
                layer.capsule(T(upper({ x: CX, y: SHO + 1 })), T({ x: CX, y: HIP - 4 }), 1.3, C.shirt, 0);
                layer.capsule(T(upper({ x: CX - 5.5, y: SHO + 2 })), T(upper({ x: CX - 5.5, y: SHO + 11 })), 0.9, C.jacketS, 0);
                layer.capsule(T(upper({ x: CX + 5.5, y: SHO + 2 })), T(upper({ x: CX + 5.5, y: SHO + 11 })), 0.9, C.jacketS, 0);
            } else {
                layer.capsule(T(upper({ x: CX, y: SHO })), T({ x: CX, y: HIP - 4 }), 0.9, C.jacketS, 0);
            }
        }
    };
    const drawHead = () => {
        layer.capsule(neckA, neckB, 3.2, C.skinS);
        layer.ellipse(headC, 12, 13, headRot, C.skin);
        if (back) {
            layer.ellipse(headC, 12.8, 13.8, headRot, C.hair);
            layer.capsule(hp(0, -12), hp(0, 4), 0.9, COLORS.hairL, 0);
            layer.ellipse(hp(-12.6, 4), 2.2, 3, headRot, C.skin); layer.ellipse(hp(12.6, 4), 2.2, 3, headRot, C.skin);
            layer.ellipse(hp(0, -3), 12.2, 10.6, headRot, C.hair, 0);
        } else if (side) {
            layer.ellipse(hp(12.2, 3.2), 2.4, 2.4, headRot, C.skin);               // 鼻
            layer.ellipse(hp(-4, -8.2), 13, 6, headRot, C.hair);                  // 髪
            layer.capsule(hp(-10, -1), hp(-14, 9), 3.6, C.hair);                    // 後ろ髪
            layer.poly([hp(0, -10), hp(12.6, -5.4), hp(12.2, -3), hp(7.5, -4.4), hp(0, -3.6)], C.hair);   // 前髪
            layer.ellipse(hp(6, 2.6), 1.5, 2.3, headRot, C.eye, 0);                 // 目
            layer.ellipse(hp(6.4, 1.8), 0.55, 0.7, headRot, C.white, 0);
            layer.capsule(hp(8.4, 9), hp(11, 9), 0.5, [168, 100, 92], 0);           // 口
            layer.ellipse(hp(-1.5, 3.6), 2.2, 3, headRot, C.skinS);                 // 耳
            layer.ellipse(hp(-7, -9.5), 5, 2, headRot - 0.4, C.hairL, 0);
        } else {
            layer.ellipse(hp(-9.6, 3), 1.6, 2.2, headRot, C.skinS, 0); layer.ellipse(hp(9.6, 3), 1.6, 2.2, headRot, C.skinS, 0);
            layer.ellipse(hp(0, -8.2), 12.8, 5.8, headRot, C.hair);
            layer.poly([hp(-12.6, -5), hp(-6.5, -2.4), hp(-1, -6.4), hp(3, -3.2), hp(7.5, -5.6), hp(12.6, -4.4), hp(12.6, -9), hp(-12.6, -9)], C.hair);
            layer.capsule(hp(-12, -3), hp(-12.4, 4), 1.9, C.hair, 0); layer.capsule(hp(12, -3), hp(12.4, 4), 1.9, C.hair, 0);
            layer.ellipse(hp(-5, -11), 5, 1.6, headRot - 0.2, C.hairL, 0);
            layer.ellipse(hp(-5.2, 3.6), 1.7, 2.6, headRot, C.eye, 0); layer.ellipse(hp(5.2, 3.6), 1.7, 2.6, headRot, C.eye, 0);
            layer.ellipse(hp(-4.6, 2.7), 0.6, 0.8, headRot, C.white, 0); layer.ellipse(hp(5.8, 2.7), 0.6, 0.8, headRot, C.white, 0);
            layer.capsule(hp(-1.6, 9), hp(1.6, 9), 0.55, [168, 100, 92], 0);
        }
    };
    const drawSword = (hand, ang) => {
        const dir = { x: Math.sin(rad(ang)), y: Math.cos(rad(ang)) };
        const at = d => ({ x: hand.x + dir.x * d, y: hand.y + dir.y * d });
        const nrm = { x: -dir.y, y: dir.x };
        layer.capsule(at(4), at(30), 1.9, C.steel);
        layer.capsule(at(6), at(29), 0.7, C.white, 0);
        layer.capsule({ x: at(4).x + nrm.x * 4, y: at(4).y + nrm.y * 4 }, { x: at(4).x - nrm.x * 4, y: at(4).y - nrm.y * 4 }, 1.3, C.hilt);
        layer.capsule(at(-2), at(3), 1.5, C.hilt);
    };

    // ---- 描画順 ----
    if (side) {
        drawArm(armB, true); drawLeg(legB, -1, true); drawTorso(); drawLeg(legF, 1, false); drawHead(); drawArm(armF, false);
    } else if (back) {
        drawArm(armB, true); drawArm(armF, false); drawLeg(legB, -1, false); drawLeg(legF, 1, false); drawTorso(); drawHead();
    } else {
        drawLeg(legB, -1, false); drawLeg(legF, 1, false); drawTorso(); drawArm(armB, false); drawArm(armF, false); drawHead();
    }
    if (pose.sword) {
        const hand = armF[2];
        const ang = side ? pose.sword.side : (back ? -pose.sword.front : pose.sword.front);
        drawSword(hand, ang);
        if (side) layer.ellipse(hand, 3.3, 3.3, 0, C.skin);
    }
    for (const s of pose.sparks) layer.star({ x: s.x, y: s.y }, s.r, s.c || [255, 244, 160]);
    const body = layer.resolve();

    // オーラ(等倍・半透明)をボディの背面に敷く
    const out = Buffer.alloc(W * H * 4);
    if (pose.aura > 0) {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const dx = (x + 0.5 - CX) / (24 + pose.aura * 6), dy = (y + 0.5 - 56) / (40 + pose.aura * 4);
            const d = dx * dx + dy * dy;
            if (d <= 1) {
                const ring = d > 0.82;
                const o = (y * W + x) * 4;
                out[o] = 255; out[o + 1] = ring ? 226 : 214; out[o + 2] = ring ? 120 : 140; out[o + 3] = ring ? 215 : 70;
            }
        }
    }
    for (let i = 0; i < W * H; i++) {
        if (body[i * 4 + 3]) { out[i * 4] = body[i * 4]; out[i * 4 + 1] = body[i * 4 + 1]; out[i * 4 + 2] = body[i * 4 + 2]; out[i * 4 + 3] = 255; }
    }
    if (pose.hitBurst) {
        for (const [bx, by] of [[CX - 20, 30], [CX + 22, 36], [CX + 14, 18]]) {
            for (let k = -4; k <= 4; k++) for (const [ux, uy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
                const x = Math.round(bx + ux * k), y = Math.round(by + uy * k);
                if (x >= 0 && y >= 0 && x < W && y < H) { const o = (y * W + x) * 4; out[o] = 255; out[o + 1] = 250; out[o + 2] = 220; out[o + 3] = 255; }
            }
        }
    }
    return out;
}

// ---------------- 行動ごとのポーズ ----------------
const sin = Math.sin, cos = Math.cos, PI = Math.PI, max = Math.max, abs = Math.abs;
const lerp = (a, b, t) => a + (b - a) * t;
const ACTIONS = {
    Idle: { frames: 4, make: i => {
        const t = i / 4 * 2 * PI, p = basePose();
        p.dy = Math.round(0.9 * sin(t) + 0.4); p.headDy = Math.round(-0.5 * sin(t)); p.aF.a = 3 + 2 * sin(t); p.aB.a = -3 - 2 * sin(t);
        p.aF.o = 7 + 1.5 * sin(t); p.aB.o = 7 + 1.5 * sin(t); p.lF.a = 3; p.lB.a = -3; return p; } },
    Walk: { frames: 6, make: i => {
        const f = i / 6 * 2 * PI, p = basePose();
        p.dy = -Math.round(1.6 * (1 - abs(sin(f)))) ; p.lean = 0.8;
        p.lF.a = 30 * sin(f); p.lF.e = -34 * max(0, cos(f)); p.lB.a = -30 * sin(f); p.lB.e = -34 * max(0, -cos(f));
        p.aF.a = -24 * sin(f); p.aF.e = 12 + 12 * max(0, -sin(f)); p.aB.a = 24 * sin(f); p.aB.e = 12 + 12 * max(0, sin(f));
        p.aF.o = 7 + 3 * sin(f); p.aB.o = 7 - 3 * sin(f); p.headDy = Math.round(0.5 * cos(2 * f)); return p; } },
    Run: { frames: 6, make: i => {
        const f = i / 6 * 2 * PI, p = basePose();
        p.dy = -Math.round(3.2 * (1 - abs(sin(f)))); p.lean = 5;
        p.lF.a = 50 * sin(f); p.lF.e = -70 * max(0, cos(f)); p.lB.a = -50 * sin(f); p.lB.e = -70 * max(0, -cos(f));
        p.aF.a = -52 * sin(f); p.aF.e = 78; p.aB.a = 52 * sin(f); p.aB.e = 78;
        p.aF.o = 12; p.aB.o = 12; p.aF.oe = 20; p.aB.oe = 20; p.headDx = 1; return p; } },
    SwordAttack: { frames: 6, make: i => {
        const p = basePose();
        const a = [-105, -40, 50, 112, 70, 20][i], e = [34, 22, 6, 0, 8, 12][i];
        p.aF.a = a; p.aF.e = e; p.aB.a = [-30, -10, 20, 35, 20, 0][i]; p.aB.e = 40;
        p.aF.o = [150, 110, 40, -25, 0, 6][i]; p.aF.oe = [10, 8, 2, 0, 2, 3][i]; p.aB.o = [20, 25, 30, 35, 25, 8][i]; p.aB.oe = 30;
        p.lean = [-3, -1, 3, 6, 3, 0][i]; p.lF.a = 20; p.lB.a = -16; p.lF.e = -8; p.lB.e = -4; p.lF.o = 6; p.lB.o = 6;
        p.dy = [1, 0, 0, 1, 0, 0][i]; p.headDx = [-1, 0, 1, 2, 1, 0][i];
        p.sword = { side: a + e, front: [150, 110, 40, -25, 0, 6][i] + [10, 8, 2, 0, 2, 3][i] };
        return p; } },
    GunAim: { frames: 2, make: i => {
        const p = basePose();
        p.aF.a = 86 + i; p.aF.e = 4; p.aB.a = 78 + i; p.aB.e = 6; p.aF.o = -9; p.aB.o = 11; p.aF.oe = 0; p.aB.oe = 0;
        p.lF.a = 14; p.lB.a = -12; p.lF.e = -6; p.lB.e = -4; p.lF.o = 6; p.lB.o = 6; p.lean = 2; p.dy = i; p.headDx = 1; return p; } },
    GunFire: { frames: 3, make: i => {
        const p = basePose();
        const rec = [1, 0.55, 0.15][i];
        p.aF.a = 86 + 12 * rec; p.aF.e = 4 - 6 * rec; p.aB.a = 78 + 10 * rec; p.aB.e = 6; p.aF.o = -9; p.aB.o = 11; p.aF.oe = 0; p.aB.oe = 0;
        p.lF.a = 14; p.lB.a = -12; p.lF.e = -6; p.lB.e = -4; p.lF.o = 6; p.lB.o = 6;
        p.lean = 2 - 6 * rec; p.headDx = 1 - 2 * rec; p.headDy = Math.round(-1 * rec); p.dy = Math.round(rec); return p; } },
    GunReload: { frames: 6, make: i => {
        const p = basePose();
        const hold = [0, 0.5, 1, 1, 0.6, 0.15][i];
        p.aF.a = lerp(50, 32, hold); p.aF.e = lerp(60, 82, hold); p.aB.a = lerp(34, 24, hold); p.aB.e = lerp(70, 84, hold);
        p.aF.o = 8; p.aB.o = 8; p.aF.oe = -2; p.aB.oe = -4;
        if (i === 2) { p.aB.a = 8; p.aB.e = 52; } if (i === 3) { p.aB.a = 26; p.aB.e = 88; }
        if (i === 5) { p.aF.a = 62; p.aF.e = 28; }
        p.lF.a = 12; p.lB.a = -10; p.lF.e = -4; p.lB.e = -4; p.lF.o = 6; p.lB.o = 6; p.lean = 2;
        p.headDy = Math.round(1.5 * hold); p.headDx = 1; p.headTilt = 6 * hold; p.dy = Math.round(hold); return p; } },
    SkillCast: { frames: 6, make: i => {
        const p = basePose(), t = [0, 0.3, 0.7, 1, 1, 0.5][i];
        p.aF.a = lerp(10, 150, t); p.aB.a = lerp(-10, 150, t); p.aF.e = lerp(14, 20, t); p.aB.e = lerp(14, 20, t);
        p.aF.o = lerp(7, 150, t); p.aB.o = lerp(7, 150, t); p.aF.oe = 6; p.aB.oe = 6;
        p.dy = -Math.round(2 * t); p.headDy = -Math.round(1.5 * t); p.lF.a = 4; p.lB.a = -4;
        p.sparks = i < 2 ? [] : [{ x: CX + 18 + i, y: 18 - i, r: 4.5 }, { x: CX - 17 - i, y: 20 - i, r: 4 }, { x: CX + 4, y: 6 + i, r: 3, c: [190, 230, 255] }];
        return p; } },
    // 絶(Zetsu)の両腕クロス: 胸の前で両腕を交差させる(正面は前腕が反対側の肩へ、側面は両腕を前に折る)。
    CrossArms: { frames: 4, make: i => {
        const p = basePose(), t = [0, 0.55, 1, 1][i];
        p.aF.o = lerp(7, -12, t); p.aB.o = lerp(7, -12, t); p.aF.oe = lerp(3, -100, t); p.aB.oe = lerp(3, -100, t);
        p.aF.a = lerp(4, 26, t); p.aB.a = lerp(-4, 20, t); p.aF.e = lerp(10, 112, t); p.aB.e = lerp(10, 122, t);
        p.dy = Math.round(t); p.headDy = Math.round(t); p.lean = 1.5 * t; p.lF.a = 3 * t; p.lB.a = -3 * t;
        return p; } },
    // 薙ぎ払い(H2B-1)の主人公モーション: 後ろへ引いた前腕を、体の前へ大きく振り払う(正面は横へ、側面は前へ)。
    ArmSweep: { frames: 4, make: i => {
        const p = basePose(), t = [0, 0.4, 0.85, 1][i];
        p.aF.a = lerp(-70, 105, t); p.aF.e = lerp(26, 4, t); p.aF.o = lerp(60, 150, t); p.aF.oe = lerp(18, 2, t);
        p.aB.a = lerp(-12, 24, t); p.aB.e = 30; p.aB.o = 12;
        p.lean = lerp(-2, 5, t); p.dy = i === 2 ? 1 : 0; p.headDx = lerp(-1, 2, t); p.lF.a = 14 * t; p.lB.a = -12 * t;
        return p; } },
    // ストレングス(H2B-2)の主人公モーション「ガッツポーズ」: 片腕を曲げて拳を握り、胸の前から上へ引き上げる。
    FistPump: { frames: 4, make: i => {
        const p = basePose(), t = [0, 0.45, 1, 1][i];
        p.aF.a = lerp(8, 20, t); p.aF.e = lerp(12, 128, t); p.aF.o = lerp(7, 40, t); p.aF.oe = lerp(3, -70, t);
        p.aB.a = lerp(-6, -14, t); p.aB.e = lerp(14, 40, t); p.aB.o = 7;
        p.dy = -Math.round(2 * t); p.headDy = -Math.round(1 * t); p.lean = -1.5 * t; p.lF.a = 4 * t; p.lB.a = -4 * t;
        p.sparks = i >= 2 ? [{ x: CX + 20, y: 14 - i, r: 4, c: [255, 220, 120] }, { x: CX - 18, y: 22 - i, r: 3.2, c: [255, 232, 160] }] : [];
        return p; } },
    // サイコポンポス(H2B-3B)の主人公モーション「指をはじく」: 片手を肩の高さへ上げ、3コマ目で指を弾く(青白い小さな火花)、4コマ目で戻す。
    FingerSnap: { frames: 4, make: i => {
        const p = basePose(), t = [0.45, 0.9, 1, 0.55][i];
        p.aF.a = lerp(8, 36, t); p.aF.e = lerp(12, 118, t); p.aF.o = lerp(7, 52, t); p.aF.oe = lerp(3, -48, t);
        p.aB.a = -6; p.aB.e = 14; p.aB.o = 7;
        p.headDy = i === 2 ? 1 : 0; p.headTilt = i === 2 ? 5 : 0; p.lean = i === 2 ? 1.5 : 0; p.dy = 0;
        p.sparks = i === 2 ? [{ x: CX + 21, y: 17, r: 3.4, c: [200, 232, 255] }, { x: CX + 26, y: 12, r: 2.4, c: [235, 246, 255] }, { x: CX + 17, y: 11, r: 2, c: [200, 232, 255] }] :
            i === 3 ? [{ x: CX + 24, y: 14, r: 2, c: [200, 232, 255] }] : [];
        return p; } },
    Ultimate: { frames: 8, make: i => {
        const p = basePose(), crouch = [0.8, 1, 0.3, 0, 0, 0, 0, 0][i], up = [0, 0, 0.5, 1, 1, 1, 1, 1][i];
        p.dy = Math.round(5 * crouch) - Math.round(3 * up); p.lF.a = 28 * crouch; p.lB.a = -28 * crouch; p.lF.e = -56 * crouch; p.lB.e = -56 * crouch;
        p.aF.a = lerp(-40, 170, up); p.aB.a = lerp(-40, 170, up); p.aF.e = 8; p.aB.e = 8;
        p.aF.o = lerp(14, 160, up); p.aB.o = lerp(14, 160, up); p.aF.oe = 8; p.aB.oe = 8;
        p.headDy = -Math.round(2 * up); p.lean = -2 * crouch;
        p.aura = i >= 2 ? 0.4 + 0.3 * sin(i * 1.3) : 0;
        p.sparks = i >= 3 ? [{ x: CX - 26 + i * 2, y: 22 + (i % 3) * 5, r: 3.6 }, { x: CX + 27 - i * 2, y: 30 - (i % 2) * 6, r: 3.6 }, { x: CX + (i % 2 ? 9 : -9), y: 6, r: 4.5, c: [255, 220, 120] }] : [];
        return p; } },
    Damage: { frames: 3, make: i => {
        const p = basePose(), k = [1, 0.8, 0.3][i];
        p.lean = -7 * k; p.headDx = -3 * k; p.headDy = -Math.round(1 * k); p.headTilt = -14 * k; p.dx = Math.round(-2 * k);
        p.aF.a = -30 * k; p.aB.a = -50 * k; p.aF.e = 30; p.aB.e = 30; p.aF.o = 40 * k + 7; p.aB.o = 55 * k + 7; p.lF.a = 18 * k; p.lB.a = -10 * k; p.lF.e = -14 * k;
        p.tint = i === 0 ? 0.5 : i === 1 ? 0.2 : 0; p.hitBurst = i === 0; return p; } },
    Down: { frames: 4, make: i => {
        const p = basePose(), r = [-14, -48, -78, -90][i];
        p.rot = r; p.lean = [-4, -3, 0, 0][i]; p.headTilt = [-10, -10, -6, 0][i];
        p.dy = [0, 8, 13, 21][i]; p.dx = [-1, 4, 12, 10][i];
        p.lF.a = [10, 18, 8, 0][i]; p.lF.e = [-18, -30, -10, 0][i]; p.lB.a = [-12, -10, -4, 0][i]; p.lB.e = [-6, -22, -6, 0][i];
        p.aF.a = [-60, -80, -40, -20][i]; p.aB.a = [-30, -50, -20, 10][i]; p.aF.e = 24; p.aB.e = 24; p.aF.o = 40; p.aB.o = 50;
        p.tint = i === 3 ? 0.12 : 0; return p; } }
};

// ---------------- 出力 ----------------
const VIEWS = ["down", "left", "right", "up"]; // MZ標準の行順
const flipCell = cell => {
    const out = Buffer.alloc(cell.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cell.copy(out, (y * W + (W - 1 - x)) * 4, (y * W + x) * 4, (y * W + x) * 4 + 4);
    return out;
};
const sheetFor = name => {
    const spec = ACTIONS[name], sw = spec.frames * W, sh = 4 * H;
    const px = Buffer.alloc(sw * sh * 4);
    for (let i = 0; i < spec.frames; i++) {
        const pose = spec.make(i);
        const cells = { down: drawCharacter("down", pose), right: drawCharacter("right", pose), up: drawCharacter("up", pose) };
        cells.left = flipCell(cells.right);
        VIEWS.forEach((view, row) => {
            for (let y = 0; y < H; y++) cells[view].copy(px, (((row * H + y) * sw) + i * W) * 4, y * W * 4, (y + 1) * W * 4);
        });
    }
    return { w: sw, h: sh, px, frames: spec.frames };
};
const fileName = name => `$DEV3H_${name}_f${ACTIONS[name].frames}.png`;

if (require.main === module) {
    const outDir = process.argv[2], preview = process.argv[3];
    if (!outDir) { console.error("使い方: node tools/gen_dev3h_character.cjs <出力フォルダ> [プレビューPNG]"); process.exit(1); }
    const sheets = {};
    for (const name of Object.keys(ACTIONS)) {
        sheets[name] = sheetFor(name);
        fs.writeFileSync(path.join(outDir, fileName(name)), encodePng(sheets[name].w, sheets[name].h, sheets[name].px));
        console.log(fileName(name), sheets[name].w + "x" + sheets[name].h);
    }
    if (preview) { // 確認用: 全行動 x 下/右/上 を並べた一覧(2倍)
        const names = (process.argv[4] ? process.argv[4].split(",") : Object.keys(ACTIONS)), maxF = Math.max(...names.map(n => ACTIONS[n].frames));
        const rows = names.length * 3, pw = maxF * W, ph = rows * H;
        const px = Buffer.alloc(pw * ph * 4);
        for (let i = 0; i < px.length; i += 4) { px[i] = 120; px[i + 1] = 150; px[i + 2] = 110; px[i + 3] = 255; }
        names.forEach((name, n) => {
            [0, 2, 3].forEach((srcRow, k) => {
                for (let f = 0; f < sheets[name].frames; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                    const s = (((srcRow * H + y) * sheets[name].w) + f * W + x) * 4;
                    if (!sheets[name].px[s + 3]) continue;
                    const d = ((((n * 3 + k) * H + y) * pw) + f * W + x) * 4;
                    sheets[name].px.copy(px, d, s, s + 4);
                }
            });
        });
        fs.writeFileSync(preview, encodePng(pw, ph, px));
    }
}
module.exports = { ACTIONS, sheetFor, fileName, encodePng, W, H, HEAD_H, HEIGHT };
