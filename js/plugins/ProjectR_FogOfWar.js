/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR 戦争の霧(Fog of War): 既存の視界(ProjectR_VisionOcclusion)に「探索済み(灰色で記憶)」と「敵・イベントの非表示」を足す。
 * @author ProjectR
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_VisionOcclusion
 * @orderAfter ProjectR_VisionOcclusion
 *
 * @param Memory
 * @text 探索の記憶
 * @desc true: 一度見えた場所を記憶し、いまの視界の外では灰色の地形だけを見せる。false: 従来どおり視界の外は真っ暗。
 * @type boolean
 * @default true
 *
 * @param Grayscale
 * @text 記憶した地形を灰色にする
 * @type boolean
 * @default true
 *
 * @param MemoryOpacity
 * @text 記憶した地形の明るさ
 * @desc 0〜1。通常の明るさに対する割合(色を灰色にしたうえで、この割合まで暗くする)。小さいほど暗く、探索済みと見えている所の差がはっきりする。
 * @type number
 * @min 0
 * @max 1
 * @decimals 2
 * @default 0.45
 *
 * @param FeatherPixels
 * @text 視界の縁のぼかし(px)
 * @desc 見えている所と暗い所(未探索・探索済み)の境目を、視界の内側へ向かってこの幅だけ滑らかにする。0=ぼかさない(従来どおりの硬い縁)。視界の計算・敵の可視判定・暗闇の外側の形は変えない(縁より外へはみ出さない)。
 * @type number
 * @min 0
 * @max 32
 * @default 6
 *
 * @param PlayerOverlay
 * @text 壁の近くで主人公を隠さない
 * @desc true: 壁のすぐ近くに立つと、主人公の頭などが壁の向こうの暗闇に隠れる問題を避けるため、主人公(と持っている武器)だけを暗闇の上に重ねて描く。ほかのキャラクター・敵は変わらない。
 * @type boolean
 * @default true
 *
 * @param HideEntities
 * @text 視界の外の敵・イベントを描かない
 * @desc true: いまの視界の外にいる敵・イベント(HPバー・影・付属の画像を含む)を描画しない。AI・状態・当たり判定は止めない。
 * @type boolean
 * @default true
 *
 * @param ExploreRangeTiles
 * @text 探索の記憶に入れる距離(tile)
 * @desc 0=いまの視界のすべて。0より大きいと、プレイヤーからこの距離までの見えた場所だけを記憶する(遠くが見えても記憶しない)。
 * @type number
 * @min 0
 * @decimals 1
 * @default 0
 *
 * @param ExtraOpaqueRegionIds
 * @text 追加の視界を遮るリージョンID
 * @desc カンマ区切り(例 240,241)。Region 255 と <VisionWall> に加えて、視界(霧)だけを遮るリージョン。通行や戦闘の判定は変えない。250は使えない。
 * @type string
 * @default
 *
 * @command ClearExplored
 * @text 探索の記憶を消す(このマップ)
 *
 * @command ClearAllExplored
 * @text 探索の記憶を消す(すべてのマップ)
 *
 * @help
 * ProjectR_FogOfWar.js
 *
 * 既存の ProjectR_VisionOcclusion(壁で遮られる視界)は、変更しません。その計算結果(視界の多角形・壁の面)を読み、次の3つの状態を足します。
 *   1. 未探索     … 地形も敵・イベントも見えない(真っ暗)。
 *   2. 探索済み   … いまの視界の外だが、以前に見た「静的な地形」だけを灰色で見せる。敵・イベントは出さない。
 *   3. いま見えている … 地形も敵・イベントも通常の色で描く。
 *
 * 【視界と通行の区別】 視界を遮るのは Region 255・<VisionWall>(イベントのメモ/注釈。扉は、開いたページに付けなければ開くと視界が通る)・
 *   ExtraOpaqueRegionIds だけです。通行不能な地形・<CombatWall> は視界を遮りません(通行の判定は別)。
 *
 * 【探索の記憶】 マップごとに「見えたマス」を記録し、場所移動・セーブ/ロードをまたいで保持します($gameSystem._projectRFogExplored。
 *   旧セーブには無いので、空から始まります)。マップの大きさが変わったマップの記録は捨てます。記憶するのは地形だけで、敵の位置は記憶しません。
 *   【滑らかな縁の保存(v2)】 探索済みの縁(灰色と黒の境)は、1 マスを 16x16(3px)に分けた「細かい記録」で持ち、マップごとの記録に { v: 2, hist: base64 } を足して保存します
 *   (全部見えたマスは書かない。「一部だけ見えた」マスだけ。1 マップ最大 1500 マス)。ロード・マップ移動のあとも、縁は斜めのまま。旧セーブ(bits だけ)・壊れた記録は、従来のマス単位(縁が階段)で動きます。
 *
 * 【隠れている敵】 いまの視界の外にいる敵・イベントは、スプライト・HPバー・付属の画像を描きません(renderable=false)。位置・AI・当たり判定・状態は
 *   そのままで、行動は止めません。API ProjectR.FogOfWar.isEventVisible(event) は、FieldCombat などが「見えている敵だけ」を扱うために使います。
 *
 * 【パラメータ】 視界の距離・角度・壁のリージョン・暗闇の濃さは ProjectR_VisionOcclusion のパラメータ(VisionRangeTiles など)。
 *   このプラグインは Memory / Grayscale / MemoryOpacity / PlayerOverlay / HideEntities / ExploreRangeTiles / ExtraOpaqueRegionIds。
 *
 * 【Stage 3 の修正】 ①記憶した地形が暗くならなかった(PIXI は、フィルターをかけた Tilemap に親の alpha を掛けない)ので、明るさを灰色のフィルターの中で下げる(既定 0.45)。
 *   ②壁のすぐ近くに立つと、主人公の頭などが「壁の向こう(視界の外)」にかかり、暗闇に隠れた。主人公(と持っている武器)だけを暗闇の上へ重ねて描く(PlayerOverlay)。
 *   壁の判定・視界の遮り・隠れた敵の隠蔽は変えない。
 *
 * 【視界の縁のぼかし(FeatherPixels)】 視界の斜めの縁は、PIXI のマスクがアンチエイリアスされないためギザギザになる。見えている形(視界の多角形 + 見えている壁のマス)を
 *   半分の解像度で描いてぼかし、「縁のちょうど上で完全に暗い・内側へ向かって透明」に変換して、暗闇(未探索の黒)と記憶した地形(探索済みの灰色)のマスクに使う。
 *   ぼかしは視界の内側だけ(縁より外へはみ出さない)。0 にすると、従来の硬い縁。レンダラが使えないときも従来どおり。
 *   視界の計算・敵の可視判定・当たり判定は変えない(描画だけ)。
 *
 * 【壁のRegion】 通行できないタイルも、視界を遮るなら Region 255 にしてください。通行不能でも Region 0 のタイル(マップの外周など)は、視線が内側の壁の端を
 *   かすめて通り抜け、壁のマスが斜めに欠けて見えます。
 *
 * API: ProjectR.FogOfWar (= window.ProjectRFogOfWar)
 *   getTileState(x,y) -> "unexplored" | "explored" | "visible"      isExplored(x,y) / isVisibleTile(x,y)
 *   isEventVisible(event) -> boolean(霧が無効・未計算のときは true)   isPointVisible(x,y)
 *   getExploredCount(mapId?) / clearExplored(mapId?) / clearAll() / flush()   getStats()
 */
(() => {
    "use strict";
    const NAME = "ProjectR_FogOfWar", VERSION = "0.1.0", STORE_KEY = "_projectRFogExplored";
    const root = typeof window !== "undefined" ? window : globalThis;
    const vision = root.ProjectR && root.ProjectR.VisionOcclusion, combat = root.ProjectR && root.ProjectR.CombatOcclusion;
    if (!vision || !combat || typeof vision.eventTags !== "function") throw new Error(`${NAME}: ProjectR_CombatOcclusion と ProjectR_VisionOcclusion を直前で有効にしてください。`);
    const params = PluginManager.parameters(NAME);
    const num = (v, f, min, max) => { const n = Number(v); return v !== "" && v != null && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : f; };
    const cfg = {
        memory: String(params.Memory ?? "true") !== "false", grayscale: String(params.Grayscale ?? "true") !== "false",
        memoryOpacity: num(params.MemoryOpacity, 0.45, 0, 1), playerOverlay: String(params.PlayerOverlay ?? "true") !== "false", hideEntities: String(params.HideEntities ?? "true") !== "false",
        exploreRange: num(params.ExploreRangeTiles, 0, 0, 9999), feather: num(params.FeatherPixels, 6, 0, 32)
    };
    const defaults = { ...cfg };
    const extraRegions = new Set(String(params.ExtraOpaqueRegionIds || "").split(",").map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n >= 1 && n <= 255 && n !== 250));
    const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
    const safe = (fn, fallback) => { try { return fn(); } catch (_error) { return fallback; } };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    // ------------------------------------------------------------------ 視界を遮るリージョンの追加(霧だけ) ----------------------------------------------------------------
    // ProjectR_VisionOcclusion は壁を combat.isVisionBlockedAt で調べる(視界の計算だけが使う)。ここに追加のリージョンを足す。通行・戦闘の判定は変えない。
    let extraInstalled = false;
    if (extraRegions.size) {
        extraInstalled = safe(() => {
            const original = combat.isVisionBlockedAt;
            combat.isVisionBlockedAt = (x, y) => original(x, y) || (!!map() && extraRegions.has(map().regionId(map().roundX(Math.floor(x)), map().roundY(Math.floor(y)))));
            if (typeof vision.invalidateCache === "function") vision.invalidateCache();
            return combat.isVisionBlockedAt !== original;
        }, false);
    }

    // ------------------------------------------------------------------ ビット列と base64(セーブ用。外部の関数に依存しない) ----------------------------------------------------------------
    const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytesToB64 = bytes => {
        let out = "";
        for (let i = 0; i < bytes.length; i += 3) {
            const a = bytes[i], b = i + 1 < bytes.length ? bytes[i + 1] : 0, c = i + 2 < bytes.length ? bytes[i + 2] : 0;
            out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)] + (i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : "=") + (i + 2 < bytes.length ? B64[c & 63] : "=");
        }
        return out;
    };
    const b64ToBytes = (text, length) => {
        const out = new Uint8Array(length), s = String(text || "").replace(/=+$/, "");
        let o = 0;
        for (let i = 0; i < s.length && o < length; i += 4) {
            const v = [0, 1, 2, 3].map(k => (i + k < s.length ? B64.indexOf(s[i + k]) : 0));
            if (v.some(n => n < 0)) return null;
            out[o++] = (v[0] << 2) | (v[1] >> 4);
            if (i + 2 < s.length && o < length) out[o++] = ((v[1] & 15) << 4) | (v[2] >> 2);
            if (i + 3 < s.length && o < length) out[o++] = ((v[2] & 3) << 6) | v[3];
        }
        return out;
    };

    // ------------------------------------------------------------------ 探索の記憶(マップごと) ----------------------------------------------------------------
    // 実行時は Uint8Array のビット列。セーブ対象の $gameSystem._projectRFogExplored[mapId] = { w, h, count, bits:base64 } へは、セーブの直前・マップ移動の直前にだけ書き出す。
    let memory = null, version = 0;
    const stats = { rasterizes: 0, entityUpdates: 0, maskRebuilds: 0, flushes: 0, loads: 0 };
    const sizeOf = (w, h) => Math.ceil((w * h) / 8);
    const countBits = bits => { let n = 0; for (let i = 0; i < bits.length; i++) { let v = bits[i]; while (v) { n += v & 1; v >>= 1; } } return n; };
    const flush = () => {
        if (!memory || !memory.dirty || typeof $gameSystem === "undefined" || !$gameSystem) return false;
        const store = $gameSystem[STORE_KEY] && typeof $gameSystem[STORE_KEY] === "object" ? $gameSystem[STORE_KEY] : ($gameSystem[STORE_KEY] = {});
        const t0 = now(), entry = { w: memory.w, h: memory.h, count: memory.count, bits: bytesToB64(memory.bits) };
        // 滑らかな縁の履歴(v2): 探索済みのマスのうち、「一部だけ見えた」マスの 16x16 の細かい記録だけを足す(全部見えたマスは、記録なし = 全部)。旧セーブ・旧コードは、bits だけで動く
        if (memory.grid) {
            const hist = encodeHist(memory.bits, memory.grid, memory.w, memory.h);
            stats.histRecords = hist.records; stats.histBytes = hist.text.length; if (hist.truncated) stats.histTruncated = (stats.histTruncated || 0) + 1;
            if (hist.text) { entry.v = FORMAT; entry.hist = hist.text; }
        }
        store[memory.mapId] = entry;
        memory.dirty = false; stats.flushes++; stats.flushMs = (stats.flushMs || 0) + (now() - t0);
        return true;
    };
    const loadMemory = () => {
        const m = map();
        if (!m || typeof $gameSystem === "undefined" || !$gameSystem) return null;
        const mapId = m.mapId(), w = m.width(), h = m.height();
        if (memory && memory.mapId === mapId && memory.w === w && memory.h === h) return memory;
        flush();
        const store = $gameSystem[STORE_KEY], entry = store && typeof store === "object" ? store[mapId] : null;
        let bits = null;
        if (entry && entry.w === w && entry.h === h && typeof entry.bits === "string") bits = b64ToBytes(entry.bits, sizeOf(w, h));      // 大きさが違う記録・壊れた記録は捨てる
        memory = { mapId, w, h, bits: bits || new Uint8Array(sizeOf(w, h)), count: 0, dirty: false };
        memory.count = bits ? countBits(bits) : 0;
        // 細かい記録(grid): 保存された履歴(v2)から復元する。履歴の無い(旧セーブ)・壊れた・大きすぎるマップは、探索済みのマス = 全部見えた(従来のマス単位)
        memory.grid = null; const t0 = now();
        if (w * h <= GRID_MAX_TILES) {
            let grid = null;
            if (bits && entry && entry.v === FORMAT && typeof entry.hist === "string") { grid = safe(() => decodeHist(entry.hist, memory.bits, w, h), null); if (grid) stats.histLoads = (stats.histLoads || 0) + 1; else stats.histRejected = (stats.histRejected || 0) + 1; }
            memory.grid = grid || newGrid(memory.bits, w, h); stats.loadMs = (stats.loadMs || 0) + (now() - t0);
        }
        stats.loads++; version++;
        return memory;
    };
    const idOf = (x, y) => { const m = map(); if (!m) return -1; const rx = m.roundX(x), ry = m.roundY(y); return rx >= 0 && ry >= 0 && rx < m.width() && ry < m.height() ? ry * m.width() + rx : -1; };
    const testBit = (bits, id) => id >= 0 && (bits[id >> 3] & (1 << (id & 7))) !== 0;
    const isExplored = (x, y) => { const mem = loadMemory(); return !!mem && testBit(mem.bits, idOf(x, y)); };
    let trackCells = false;      // true の間は、視界の形そのものを細かい記録(grid)へ足す(markExplored は grid に触らない)。false の間は、新しく探索したマスを「全部見えた」として足す
    const markExplored = id => {
        if (id < 0 || !memory || testBit(memory.bits, id)) return false;
        memory.bits[id >> 3] |= 1 << (id & 7); memory.count++; memory.dirty = true; version++;
        if (memory.grid && !trackCells) fillTile(memory.grid, memory.w, id);
        return true;
    };

    // ------------------------------------------------------------------ 滑らかな縁の履歴(保存できる形) ----------------------------------------------------------------
    // 見えた形(視界の多角形・壁のマス・主人公のマス)を、1 マスを 16x16 に分けた「細かい記録(grid)」に残す(3px 単位。Uint16Array: 1 つが 1 マスの 1 行 = 16 セル)。
    // 実行中の GPU の履歴(acc)とは別に、CPU 側でも持つので、保存・マップ移動のあとでも、同じ形を作り直せる。マップごとに 1 つ。大きなテクスチャは保存しない。
    //   保存の形(マップごとの記録に足す): { v: 2, hist: base64 }。hist = 「探索済みで、全部は見えていないマス」の並び(全部見えたマスは書かない = 旧セーブと同じ「全部」)。
    //   1 件 = varint((前の件のマス番号との差 - 1) * 2 + 種類) + (種類 1 のとき) 32 バイト(16 行 x 16 ビット、リトルエンディアン)。種類 0 = 探索済みだが、まだ何も見ていない。
    const SUB = 16, FORMAT = 2, MAX_HIST_RECORDS = 1500, GRID_MAX_TILES = 12000;
    const newGrid = (bits, w, h) => {
        const grid = new Uint16Array(w * h * SUB);
        for (let id = 0; id < w * h; id++) if (testBit(bits, id)) fillTile(grid, w, id);
        return grid;
    };
    const fillTile = (grid, w, id) => {
        const tx = id % w, ty = (id - tx) / w, base = ty * SUB * w + tx; let changed = false;
        for (let i = 0; i < SUB; i++) if (grid[base + i * w] !== 0xFFFF) { grid[base + i * w] = 0xFFFF; changed = true; }
        return changed;
    };
    // 1 行(row)のセル c0 以上 c1 未満を塗る
    const fillSpan = (grid, w, row, c0, c1) => {
        if (c1 <= c0) return false;
        let changed = false; const first = c0 >> 4, last = (c1 - 1) >> 4, rowBase = row * w;
        for (let tx = first; tx <= last; tx++) {
            const a = tx === first ? (c0 & 15) : 0, b = tx === last ? ((c1 - 1) & 15) + 1 : 16;
            const mask = ((1 << b) - 1) & ~((1 << a) - 1) & 0xFFFF, old = grid[rowBase + tx], next = old | mask;
            if (next !== old) { grid[rowBase + tx] = next; changed = true; }
        }
        return changed;
    };
    // 多角形(タイル座標)のうち、中心が内側にあるセルを塗る(top〜bottom の行だけ)。辺ごとに交点を集める(行数 x 辺の数にしない)
    const rasterCells = (grid, w, h, points, top, bottom) => {
        const n = points ? points.length : 0;
        if (n < 3 || !grid) return false;
        const maxRow = h * SUB, maxCol = w * SUB, lo = Math.max(0, Math.floor(top * SUB)), hi = Math.min(maxRow, Math.ceil(bottom * SUB));
        if (hi <= lo) return false;
        const rows = new Array(hi - lo);
        for (let i = 0; i < n; i++) {
            const a = points[i], b = points[(i + 1) % n];
            if (!(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(b.x) && Number.isFinite(b.y)) || a.y === b.y) continue;
            const r0 = Math.max(lo, Math.ceil(Math.min(a.y, b.y) * SUB - 0.5)), r1 = Math.min(hi, Math.ceil(Math.max(a.y, b.y) * SUB - 0.5)), k = (b.x - a.x) / (b.y - a.y);
            for (let r = r0; r < r1; r++) { const x = a.x + ((r + 0.5) / SUB - a.y) * k; (rows[r - lo] || (rows[r - lo] = [])).push(x); }
        }
        let changed = false;
        for (let r = lo; r < hi; r++) {
            const xs = rows[r - lo];
            if (!xs) continue;
            xs.sort((p, q) => p - q);
            for (let k = 0; k + 1 < xs.length; k += 2) if (fillSpan(grid, w, r, Math.max(0, Math.ceil(xs[k] * SUB - 0.5)), Math.min(maxCol, Math.ceil(xs[k + 1] * SUB - 0.5)))) changed = true;
        }
        return changed;
    };
    const putVarint = (out, value) => { let v = value; while (v >= 128) { out.push((v % 128) | 128); v = Math.floor(v / 128); } out.push(v); };
    const encodeHist = (bits, grid, w, h) => {
        const out = []; let prev = -1, records = 0, truncated = false;
        for (let id = 0; id < w * h; id++) {
            if (!testBit(bits, id)) continue;
            const tx = id % w, ty = (id - tx) / w, base = ty * SUB * w + tx; let full = true, empty = true;
            for (let i = 0; i < SUB && (full || empty); i++) { const v = grid[base + i * w]; if (v !== 0xFFFF) full = false; if (v !== 0) empty = false; }
            if (full) continue;
            if (records >= MAX_HIST_RECORDS) { truncated = true; continue; }       // 上限を超えたマスは、従来のマス単位(全部見えた)に戻す。保存を増やしすぎない
            putVarint(out, (id - prev - 1) * 2 + (empty ? 0 : 1)); prev = id; records++;
            if (!empty) for (let i = 0; i < SUB; i++) { const v = grid[base + i * w]; out.push(v & 255, v >> 8); }
        }
        return { text: out.length ? bytesToB64(Uint8Array.from(out)) : "", records, truncated };
    };
    // 壊れた記録(不正な文字・途中で切れた・範囲外)は null(呼び出し側が、従来のマス単位へ戻す)
    const decodeHist = (text, bits, w, h) => {
        const grid = newGrid(bits, w, h);
        if (!text) return grid;
        const len = Math.floor(String(text).replace(/=+$/, "").length * 3 / 4), bytes = b64ToBytes(text, len);
        if (!bytes) return null;
        let p = 0, prev = -1;
        while (p < bytes.length) {
            let v = 0, mul = 1, k = 0, b;
            do { if (p >= bytes.length || k >= 4) return null; b = bytes[p++]; v += (b & 127) * mul; mul *= 128; k++; } while (b & 128);
            const kind = v % 2, id = prev + 1 + (v - kind) / 2;
            if (id >= w * h || (kind === 1 && p + SUB * 2 > bytes.length)) return null;
            if (testBit(bits, id)) { const tx = id % w, ty = (id - tx) / w, base = ty * SUB * w + tx; for (let i = 0; i < SUB; i++) grid[base + i * w] = kind ? bytes[p + i * 2] | (bytes[p + i * 2 + 1] << 8) : 0; }
            if (kind === 1) p += SUB * 2;
            prev = id;
        }
        return grid;
    };

    // ------------------------------------------------------------------ いま見えているマス(視界の多角形を走査線で塗る) ----------------------------------------------------------------
    // points: 視界の多角形(タイル座標・角度順)。各行の中心で多角形と交わる区間に、中心が入るマスを返す([x,y] の配列。ループマップの外側の座標のまま)。
    const rasterizeTiles = (points, bounds) => {
        stats.rasterizes++;
        const out = [], n = points ? points.length : 0;
        if (n < 3) return out;
        for (let ty = Math.floor(bounds.top); ty < Math.ceil(bounds.bottom); ty++) {
            const y = ty + 0.5, xs = [];
            for (let i = 0; i < n; i++) {
                const a = points[i], b = points[(i + 1) % n];
                if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
            }
            xs.sort((p, q) => p - q);
            for (let k = 0; k + 1 < xs.length; k += 2) for (let tx = Math.ceil(xs[k] - 0.5); tx + 0.5 < xs[k + 1]; tx++) out.push([tx, ty]);
        }
        return out;
    };
    // 多角形と少しでも重なるマスを返す(各行の 3 本の走査線(上寄り・中央・下寄り)で、交わる区間に重なるマス)。積み上げの履歴(acc)と一緒に使う:
    //   履歴の形(多角形の記録)が、探索済みのマスの中に必ず収まるので、記憶した地形の縁は、マスの階段でなく、実際の視界の斜めの縁になる。
    const rasterizeTilesOverlap = (points, bounds) => {
        stats.rasterizes++;
        const out = [], n = points ? points.length : 0;
        if (n < 3) return out;
        for (let ty = Math.floor(bounds.top); ty < Math.ceil(bounds.bottom); ty++) {
            const seen = new Set();
            for (const off of [0.12, 0.5, 0.88]) {
                const y = ty + off, xs = [];
                for (let i = 0; i < n; i++) {
                    const a = points[i], b = points[(i + 1) % n];
                    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
                }
                xs.sort((p, q) => p - q);
                for (let k = 0; k + 1 < xs.length; k += 2) for (let tx = Math.floor(xs[k] + 1e-9); tx < xs[k + 1] - 1e-9; tx++) seen.add(tx);
            }
            for (const tx of seen) out.push([tx, ty]);
        }
        return out;
    };
    let overlapMode = false;
    let visibleNow = new Set(), lastVisibility = null;
    const updateVisibleTiles = (layer, visibility) => {
        const m = map(), mem = loadMemory();
        if (!m || !mem) return;
        const tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
        const bounds = { left: dx - 1, right: dx + Graphics.width / tw + 1, top: dy - 1, bottom: dy + Graphics.height / th + 1 };
        const player = typeof $gamePlayer !== "undefined" && $gamePlayer ? { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 } : null;
        trackCells = overlapMode && !!mem.grid;
        const tiles = overlapMode ? rasterizeTilesOverlap(visibility.points, bounds) : rasterizeTiles(visibility.points, bounds);
        // 壁そのもの(見えている壁の面)も、見えているマスに数える
        if (visibility.visibleRegionTiles) for (const key of visibility.visibleRegionTiles) { const [x, y] = key.split(",").map(Number); if (Number.isFinite(x) && Number.isFinite(y)) tiles.push([x, y]); }
        if (player) tiles.push([Math.floor(player.x), Math.floor(player.y)]);
        const seen = new Set();
        for (const [tx, ty] of tiles) {
            const id = idOf(tx, ty);
            if (id < 0) continue;
            seen.add(id);
            if (cfg.exploreRange > 0 && player && Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y) > cfg.exploreRange) continue;
            markExplored(id);
        }
        visibleNow = seen;
        if (trackCells) {
            const t0 = now();
            let changed = rasterCells(mem.grid, mem.w, mem.h, visibility.points, bounds.top, bounds.bottom);
            if (visibility.visibleRegionTiles) for (const key of visibility.visibleRegionTiles) { const [x, y] = key.split(",").map(Number); const id = Number.isFinite(x) && Number.isFinite(y) ? idOf(x, y) : -1; if (id >= 0 && fillTile(mem.grid, mem.w, id)) changed = true; }
            if (player) { const id = idOf(Math.floor(player.x), Math.floor(player.y)); if (id >= 0 && fillTile(mem.grid, mem.w, id)) changed = true; }
            if (changed) { mem.dirty = true; stats.cellChanges = (stats.cellChanges || 0) + 1; }
            stats.cellRasters = (stats.cellRasters || 0) + 1; if (t0) stats.cellMs = (stats.cellMs || 0) + (now() - t0);
        }
    };

    // ------------------------------------------------------------------ 敵・イベントの可視 ----------------------------------------------------------------
    // いまの視界の多角形の中に、体の代表点(中心と、内側へ寄せた角)が1つでも入っていれば見える。毎フレーム(敵は動くので)調べる。
    const entity = { ids: new Set(), mapId: -1, valid: false, keepIds: new Set() };
    const inside = (point, poly) => (typeof vision.inside === "function" ? vision.inside(point, poly) : false);
    const bodyPoints = e => {
        const poly = safe(() => combat.eventPolygon(e), []) || [];
        if (poly.length >= 3) {
            const cx = poly.reduce((s, p) => s + p.x / poly.length, 0), cy = poly.reduce((s, p) => s + p.y / poly.length, 0);
            return [{ x: cx, y: cy }, ...poly.map(p => ({ x: p.x + (cx - p.x) * 0.05, y: p.y + (cy - p.y) * 0.05 }))];
        }
        return [{ x: e._realX + 0.5, y: e._realY + 0.5 }];
    };
    // 神の表示Event(ProjectR_GodSummonVisual。<projectRGodVisual>)は、プレイヤーの一部(敵・イベントではない)。視界の多角形で隠さない(隠れてよい場所は、暗闇が覆う)
    const companionCache = new WeakMap();
    const isCompanion = e => { if (!e || typeof e !== "object") return false; let v = companionCache.get(e); if (v === undefined) { v = /<projectRGodVisual>/i.test(String(safe(() => e.event().note, "") || "")); companionCache.set(e, v); } return v; };
    const computeEntities = (visibility) => {
        const m = map(), ids = new Set(), keep = visibility ? visibility.visibleKeepEvents : null;
        if (!m || !visibility) return ids;
        const points = visibility.points || [];
        for (const e of m.events()) {
            if (!e || e._erased || typeof e.eventId !== "function") continue;
            const id = e.eventId();
            if (isCompanion(e)) { ids.add(id); continue; }
            if (safe(() => vision.eventTags(e).keep, false)) { if (keep && keep.has(id)) ids.add(id); continue; }       // <VisionWall>/<VisionKeepVisible> は既存の判定(壁に遮られていなければ見える)
            if (points.length >= 3 && bodyPoints(e).some(p => inside(p, points))) ids.add(id);
        }
        return ids;
    };
    const fogActive = () => entity.valid && cfg.hideEntities && safe(() => vision.settings().enabled, false) && entity.mapId === (map() ? map().mapId() : -2);
    const isEventVisible = e => {
        if (!e || typeof e.eventId !== "function" || !fogActive()) return true;
        return entity.ids.has(e.eventId());
    };
    const isPointVisible = (x, y) => {
        if (!fogActive() || !lastVisibility) return true;
        return inside({ x, y }, lastVisibility.points || []);
    };
    const tileState = (x, y) => {
        if (!map()) return "unexplored";
        const id = idOf(x, y);
        if (id >= 0 && visibleNow.has(id)) return "visible";
        return isExplored(x, y) ? "explored" : "unexplored";
    };

    // ------------------------------------------------------------------ 表示 ----------------------------------------------------------------
    // ProjectR_VisionOcclusion の VisionLayer(暗闇・保持)に、記憶した地形の層を差し込む。層の座標は暗闇と同じ(画面の px)。
    //   記憶の層 = 外側の container(マスク = 探索済みのマス)> 内側の container(マスク = いまの視界の外)> 灰色にした全地形の Tilemap。
    // 描画だけの写し(Sprite_Character の更新・Action Combat のフックを重複させない)。同じ texture を共有するので、アニメーションの絵も同時に変わる。
    const mirrorSprite = (source, target) => {
        target.texture = source.texture;
        for (const key of ["position", "scale", "pivot", "skew", "anchor"]) if (source[key] && target[key] && typeof target[key].copyFrom === "function") target[key].copyFrom(source[key]);
        for (const key of ["rotation", "alpha", "visible", "renderable", "tint", "blendMode"]) if (source[key] !== undefined) target[key] = source[key];
        target.filters = source.filters;
        const kids = (source.children || []).filter(c => c && typeof Sprite !== "undefined" && c instanceof PIXI.Sprite);
        while (target.children.length > kids.length) target.removeChildAt(target.children.length - 1).destroy({ children: true, texture: false, baseTexture: false });
        kids.forEach((child, i) => { if (!target.children[i]) target.addChild(new PIXI.Sprite()); mirrorSprite(child, target.children[i]); });
    };
    let fogIds = 0; const visIds = new WeakMap();
    class Fog {
        constructor(spriteset, layer) {
            this.spriteset = spriteset; this.layer = layer; this.lastCache = null; this.maskSig = ""; this.lastVisibility = null; this.touched = new WeakSet();
            this.tiles = new Tilemap();
            const m = map();
            this.tiles.tileWidth = m.tileWidth(); this.tiles.tileHeight = m.tileHeight();
            this.tiles.setData(m.width(), m.height(), m.data());
            this.tiles.horizontalWrap = m.isLoopHorizontal(); this.tiles.verticalWrap = m.isLoopVertical();
            this.outer = new PIXI.Container(); this.inner = new PIXI.Container();
            this.exploredMask = new PIXI.Graphics(); this.outsideMask = new PIXI.Graphics();
            this.exploredMask.isFastRect = () => false; this.outsideMask.isFastRect = () => false;      // 穴・複数の矩形を正しくステンシルで切り抜く(PIXI 5 の isFastRect は穴を無視する)
            this.mid = new PIXI.Container(); this.acc = null; this.accOk = true;
            this.inner.addChild(this.tiles); this.mid.addChild(this.inner); this.outer.addChild(this.mid);
            this.outer.mask = this.exploredMask; this.inner.mask = this.outsideMask;
            this.filter = null; this.filterSig = "";
            const index = layer.dark ? layer.getChildIndex(layer.dark) + 1 : 0;
            layer.addChildAt(this.outer, Math.min(index, layer.children.length));
            layer.addChild(this.exploredMask, this.outsideMask);
            this.outer.visible = false;
            // 主人公の重ね描き: 暗闇(と保持の層)の上。壁のすぐ近くで、主人公の体が壁の向こう(暗闇)に隠れないようにする
            this.soft = null; this.softOk = true; this.exploredSig = "";
            this.unexploredMask = new PIXI.Graphics(); this.unexploredMask.isFastRect = () => false;
            layer.addChild(this.unexploredMask);
            this.keepClip = new PIXI.Graphics(); this.keepClip.isFastRect = () => false; this.keepSig = "";
            layer.addChild(this.keepClip);
            this.overlay = new PIXI.Container(); this.mirrors = new Map();
            const keepIndex = layer.keep ? layer.getChildIndex(layer.keep) + 1 : layer.children.length;
            layer.addChildAt(this.overlay, Math.min(keepIndex, layer.children.length));
        }
        // 記憶した地形のフィルター: 灰色(desaturate)+ 暗さ(brightness)。PIXI の container.alpha は、フィルターをかけた Tilemap には効かないので、明るさもフィルターの中で下げる。
        updateFilter() {
            const F = PIXI.filters && PIXI.filters.ColorMatrixFilter;
            if (!F) { this.tiles.filters = null; return; }
            const sig = (cfg.grayscale ? "g" : "c") + "," + cfg.memoryOpacity;
            if (this.filter && this.filterSig === sig) return;
            const f = this.filter || (this.filter = new F());
            f.reset();
            if (cfg.grayscale) f.desaturate();
            f.brightness(cfg.memoryOpacity, true);
            this.filterSig = sig; this.tiles.filters = [f];
            if (!this.tiles.filterArea || this.tiles.filterArea.width !== Graphics.width || this.tiles.filterArea.height !== Graphics.height) this.tiles.filterArea = new PIXI.Rectangle(0, 0, Graphics.width, Graphics.height);
        }
        // 主人公(と、持っている武器の表示)だけを、暗闇の上へ重ねて描く。ほかの敵・キャラクターは重ねない(壁の向こうの敵は隠れたまま)。
        updateOverlay(show) {
            const ts = this.spriteset._tilemap, pl = typeof $gamePlayer !== "undefined" ? $gamePlayer : null, wanted = [];
            if (show && cfg.playerOverlay && ts && pl && map()) {
                const tw = map().tileWidth(), th = map().tileHeight();
                const body = ts.children.find(ch => ch && ch._character === pl);
                if (body) {
                    for (const ch of ts.children) {
                        if (ch === body) wanted.push(ch);
                        else if (typeof Sprite !== "undefined" && ch && ch.constructor === Sprite && !ch._character && !ch._event && ch.bitmap && Math.abs(ch.x - body.x) <= tw * 1.5 && Math.abs(ch.y - body.y) <= th * 1.8) wanted.push(ch);   // 銃・剣の表示(Display Weapon)
                    }
                }
            }
            for (const [src, cp] of this.mirrors) if (!wanted.includes(src)) { this.overlay.removeChild(cp); cp.destroy({ children: true, texture: false, baseTexture: false }); this.mirrors.delete(src); }
            wanted.forEach((src, i) => {
                let cp = this.mirrors.get(src);
                if (!cp) { cp = new PIXI.Sprite(); this.mirrors.set(src, cp); this.overlay.addChild(cp); }
                mirrorSprite(src, cp);
                if (typeof this.overlay.setChildIndex === "function" && this.overlay.children[i] !== cp) this.overlay.setChildIndex(cp, i);
            });
        }
        syncTiles() {
            const original = this.spriteset._tilemap;
            if (!original) return;
            if (this.lastBitmaps !== original._bitmaps || this.tiles.flags !== original.flags) { this.lastBitmaps = original._bitmaps; this.tiles.setBitmaps(original._bitmaps); this.tiles.flags = original.flags; }
            this.tiles.origin.copyFrom(original.origin);
            this.tiles.animationCount = original.animationCount; this.tiles.animationFrame = original.animationFrame;
            if (this.tiles.width !== original.width || this.tiles.height !== original.height) { this.tiles.width = original.width; this.tiles.height = original.height; this.tiles.refresh(); }
        }
        // 探索済みのマスを、行ごとの連続区間にして矩形で描く(見える範囲の中だけ)
        drawExploredMask(mem) {
            const m = map(), g = this.exploredMask, tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
            const u = this.unexploredMask;
            g.clear(); g.beginFill(0xffffff, 1); u.clear(); u.beginFill(0xffffff, 1);
            const x0 = Math.floor(dx) - 1, x1 = Math.ceil(dx + Graphics.width / tw) + 1, y0 = Math.floor(dy) - 1, y1 = Math.ceil(dy + Graphics.height / th) + 1;
            for (let ty = y0; ty < y1; ty++) {
                let runStart = null, offStart = null;
                for (let tx = x0; tx <= x1; tx++) {
                    const on = tx < x1 && testBit(mem.bits, idOf(tx, ty)), off = tx < x1 && !on;
                    if (on && runStart === null) runStart = tx;
                    if (!on && runStart !== null) { g.drawRect((runStart - dx) * tw, (ty - dy) * th, (tx - runStart) * tw, th); runStart = null; }
                    if (off && offStart === null) offStart = tx;
                    if (!off && offStart !== null) { u.drawRect((offStart - dx) * tw, (ty - dy) * th, (tx - offStart) * tw, th); offStart = null; }
                }
            }
            g.endFill(); u.endFill(); stats.maskRebuilds++;
        }
        // 見えている壁・扉のイベントの絵(スプライト)が、画面の上で占めるマスの範囲 [tx0, ty0, tx1, ty1](スプライトが無ければ、イベント自身のマス)。
        //   扉の絵は自分のマスより高い(弧が上のマスへ出る)。絵は、扉そのもの(透明な所は何も描かない)なので、まるごと見せる。
        keepEventTiles(e) {
            const m = map(), tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
            const ts = this.spriteset._tilemap, sp = ts && ts.children ? ts.children.find(c => c && c._character === e && Number(c.width) > 1 && Number(c.height) > 1 && c.anchor) : null;
            if (sp) {
                const left = sp.x - sp.width * sp.anchor.x, right = left + sp.width, top = sp.y - sp.height * sp.anchor.y, bottom = top + sp.height;
                return [Math.floor(left / tw + dx + 1e-6), Math.floor(top / th + dy + 1e-6), Math.floor((right - 1e-6) / tw + dx), Math.floor((bottom - 1e-6) / th + dy)];
            }
            const tx = Math.floor(e._realX + 1e-6), ty = Math.floor(e._realY + 1e-6);
            return [tx, ty, tx, ty];
        }
        // 切り抜き(重ね描きのマスク)= 探索済みのマス + 見えている壁・扉のイベントの絵の範囲。主人公の重ね描きが、扉の前(上半身が扉の絵・扉の上のマスにかかる所)でも出る。
        // 未探索の地形・敵は出さない(壁・扉のイベントの絵は、イベントそのものだけで、地形ではない)。
        drawKeepClip(mem, visibility) {
            const m = map(), g = this.keepClip, tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
            g.clear(); g.beginFill(0xffffff, 1);
            const x0 = Math.floor(dx) - 1, x1 = Math.ceil(dx + Graphics.width / tw) + 1, y0 = Math.floor(dy) - 1, y1 = Math.ceil(dy + Graphics.height / th) + 1;
            for (let ty = y0; ty < y1; ty++) {
                let runStart = null;
                for (let tx = x0; tx <= x1; tx++) {
                    const on = tx < x1 && testBit(mem.bits, idOf(tx, ty));
                    if (on && runStart === null) runStart = tx;
                    if (!on && runStart !== null) { g.drawRect((runStart - dx) * tw, (ty - dy) * th, (tx - runStart) * tw, th); runStart = null; }
                }
            }
            const ids = visibility && visibility.visibleKeepEvents ? visibility.visibleKeepEvents : [];
            for (const id of ids) { const e = m.event(id); if (e && !e._erased) { const r = this.keepEventTiles(e); g.drawRect((r[0] - dx) * tw, (r[1] - dy) * th, (r[2] - r[0] + 1) * tw, (r[3] - r[1] + 1) * th); } }
            g.endFill();
        }
        // ---- 視界の縁のぼかし(FeatherPixels > 0)----
        // 「いま見えている形」(視界の多角形 + 見えている壁のマス)を、半分の解像度のテクスチャへ描いてぼかし、
        // 縁のちょうど上で不透明(= 完全に暗い)・内側へ向かって透明になるように変換する(=縁より外へはみ出さない)。
        // そのテクスチャを、(1) 暗闇の代わり(未探索の黒)と、(2) 記憶した地形のマスク(探索済みの灰色)に使う。PIXI のステンシルマスク・Graphics は
        // アンチエイリアスされないので、斜めの縁がギザギザになる。画像のマスクならアルファが効く。
        softAvailable() {
            if (cfg.feather <= 0 || !this.softOk) return false;
            const app = typeof Graphics !== "undefined" ? Graphics.app : null;
            return !!(app && app.renderer && PIXI.RenderTexture && PIXI.filters && PIXI.filters.BlurFilter && PIXI.filters.ColorMatrixFilter);
        }
        ensureSoft() {
            if (this.soft) return this.soft;
            const res = 0.5, w = Math.max(1, Math.ceil(Graphics.width * res)), h = Math.max(1, Math.ceil(Graphics.height * res));
            const rt = PIXI.RenderTexture.create({ width: w, height: h });
            const g = new PIXI.Graphics(), stage = new PIXI.Container();
            stage.addChild(g);
            const blur = new PIXI.filters.BlurFilter(1, 4, 1), cm = new PIXI.filters.ColorMatrixFilter();
            cm.matrix = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -3, 3];   // 色は白、アルファ = 3 × (1 − ぼかした視界)(0〜1 に収まる)。縁(0.5)と、縁の約 1px 内側(0.667)まで 1(完全に暗い)・そこから内側へ 0。縁のサブピクセルの誤差でも、未探索へ漏れない
            stage.filters = [blur, cm]; stage.filterArea = new PIXI.Rectangle(0, 0, w, h);
            const maskSprite = new PIXI.Sprite(rt), darkSprite = new PIXI.Sprite(rt);
            maskSprite.scale.set(1 / res); darkSprite.scale.set(1 / res); darkSprite.tint = 0x000000;
            const layer = this.layer, index = layer.dark ? layer.getChildIndex(layer.dark) + 1 : 0;
            layer.addChildAt(darkSprite, Math.min(index, layer.children.length));
            layer.addChild(maskSprite);
            this.inner.filterArea = new PIXI.Rectangle(0, 0, Graphics.width, Graphics.height);
            this.soft = { res, w, h, rt, g, stage, blur, cm, maskSprite, darkSprite, sig: "", blurSig: "" };
            return this.soft;
        }
        // ---- 探索の履歴(積み上げ): 見えた形(多角形・壁のマス)を、マップ全体の半分以下の解像度のテクスチャへ積み上げる ----
        // 記憶した地形の縁(探索済み = 灰色 と 未探索 = 黒 の境)を、マスの階段でなく、見えた形の斜めの縁にする。保存は従来どおりマスのビット列(読み込み直した所は、そのマス単位)。
        accAvailable() {
            if (cfg.feather <= 0 || !this.accOk || cfg.exploreRange > 0 || !this.softAvailable()) return false;
            const m = map();
            if (!m || m.isLoopHorizontal() || m.isLoopVertical()) return false;
            return m.width() * m.tileWidth() * m.height() * m.tileHeight() <= 24e6;
        }
        ensureAcc() {
            if (this.acc) return this.acc;
            const soft = this.ensureSoft(), m = map(), tw = m.tileWidth(), th = m.tileHeight(), W = m.width() * tw, H = m.height() * th;
            const res = Math.min(0.5, Math.sqrt(4e6 / (W * H))), w = Math.max(1, Math.ceil(W * res)), h = Math.max(1, Math.ceil(H * res));
            const rt = PIXI.RenderTexture.create({ width: w, height: h }), invRt = PIXI.RenderTexture.create({ width: w, height: h });
            const g = new PIXI.Graphics(), stage = new PIXI.Container(); stage.addChild(g);
            const invStage = new PIXI.Container(), invCm = new PIXI.filters.ColorMatrixFilter();
            invCm.matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 1];              // 黒・アルファ = 1 − 履歴(履歴の外 = 不透明の黒)
            invStage.addChild(new PIXI.Sprite(rt)); invStage.filters = [invCm]; invStage.filterArea = new PIXI.Rectangle(0, 0, w, h);
            const maskSprite = new PIXI.Sprite(rt), darkSprite = new PIXI.Sprite(invRt);
            maskSprite.scale.set(1 / res); darkSprite.scale.set(1 / res);
            const layer = this.layer, index = layer.getChildIndex(soft.darkSprite) + 1;
            layer.addChildAt(darkSprite, Math.min(index, layer.children.length));
            layer.addChild(maskSprite);
            this.mid.filterArea = new PIXI.Rectangle(0, 0, Graphics.width, Graphics.height);
            this.acc = { res, w, h, rt, invRt, g, stage, invStage, maskSprite, darkSprite, mem: null, visId: 0 };
            return this.acc;
        }
        // 履歴を作り直す: 探索済みのマス(ビット列)をまるごと描く
        resetAcc(mem) {
            const a = this.acc, m = map(), tw = m.tileWidth(), th = m.tileHeight(), r = a.res, renderer = Graphics.app.renderer;
            a.g.clear(); a.g.beginFill(0xffffff, 1);
            if (mem.grid && mem.w === m.width() && mem.h === m.height()) {
                // 細かい記録(保存・復元できる形)から、そのまま描く。行ごとの連続区間を、同じ区間が続く行どうしでまとめる(矩形の数を減らす)
                const w = mem.w, cw = tw / SUB * r, ch = th / SUB * r; let open = new Map();
                const emit = (key, row1) => { const [c0, c1, row0] = key.split(",").map(Number); a.g.drawRect(c0 * cw, row0 * ch, (c1 - c0) * cw, (row1 - row0) * ch); };
                for (let row = 0; row <= mem.h * SUB; row++) {
                    const runs = new Map();
                    if (row < mem.h * SUB) {
                        let start = null; const base = row * w;
                        for (let tx = 0; tx <= w; tx++) {
                            const v = tx < w ? mem.grid[base + tx] : 0;
                            if (v === 0xFFFF) { if (start === null) start = tx * SUB; continue; }
                            if (v === 0) { if (start !== null) { runs.set(start + "," + tx * SUB, true); start = null; } continue; }
                            for (let k = 0; k < SUB; k++) {
                                if ((v >> k) & 1) { if (start === null) start = tx * SUB + k; }
                                else if (start !== null) { runs.set(start + "," + (tx * SUB + k), true); start = null; }
                            }
                        }
                    }
                    const next = new Map();
                    for (const [key, row0] of open) if (!runs.has(key)) emit(key + "," + row0, row); else next.set(key, row0);
                    for (const key of runs.keys()) if (!next.has(key)) next.set(key, row);
                    open = next;
                }
                a.g.endFill();
                renderer.render(a.stage, a.rt, true);
                a.mem = mem; a.visId = 0; stats.accResets = (stats.accResets || 0) + 1; stats.accFromGrid = (stats.accFromGrid || 0) + 1;
                return;
            }
            for (let ty = 0; ty < m.height(); ty++) {
                let run = null;
                for (let tx = 0; tx <= m.width(); tx++) {
                    const on = tx < m.width() && testBit(mem.bits, idOf(tx, ty));
                    if (on && run === null) run = tx;
                    if (!on && run !== null) { a.g.drawRect(run * tw * r, ty * th * r, (tx - run) * tw * r, th * r); run = null; }
                }
            }
            a.g.endFill();
            renderer.render(a.stage, a.rt, true);
            a.mem = mem; a.visId = 0; stats.accResets = (stats.accResets || 0) + 1;
        }
        // 今の視界の形(多角形・見えている壁のマス・主人公のマス)を、履歴へ足す
        addAcc(visibility) {
            const a = this.acc, m = map(), tw = m.tileWidth(), th = m.tileHeight(), r = a.res, renderer = Graphics.app.renderer, g = a.g;
            g.clear(); g.beginFill(0xffffff, 1);
            const pts = visibility.points || [];
            if (pts.length >= 3) g.drawPolygon(pts.flatMap(p => [p.x * tw * r, p.y * th * r]));
            for (const key of visibility.visibleRegionTiles || []) { const [x, y] = key.split(",").map(Number); if (Number.isFinite(x) && Number.isFinite(y)) g.drawRect(x * tw * r, y * th * r, tw * r, th * r); }
            if (typeof $gamePlayer !== "undefined" && $gamePlayer) g.drawRect(Math.floor($gamePlayer._realX + 0.5) * tw * r, Math.floor($gamePlayer._realY + 0.5) * th * r, tw * r, th * r);
            g.endFill();
            renderer.render(a.stage, a.rt, false);
            renderer.render(a.invStage, a.invRt, true);
            stats.accAdds = (stats.accAdds || 0) + 1;
        }
        renderSoft(visibility, dx, dy, tw, th) {
            const s = this.ensureSoft(), r = s.res, renderer = Graphics.app.renderer;
            const bs = Math.max(0.3, cfg.feather * r / 2.5);
            if (s.blurSig !== String(bs)) { s.blurSig = String(bs); s.blur.blur = bs; }
            const g = s.g; g.clear(); g.beginFill(0xffffff, 1);
            const pts = visibility.points || [];
            if (pts.length >= 3) g.drawPolygon(pts.flatMap(p => [(p.x - dx) * tw * r, (p.y - dy) * th * r]));
            // 見えている壁(保持の層が、マスクの外でも壁の全体を描く)のマスは、まるごと「見えている」側にする: 壁のすぐ近くの床が暗くならず、壁のマスの途中で縁が斜めに切れない
            const rows = new Map();
            for (const key of visibility.visibleRegionTiles || []) { const [x, y] = key.split(",").map(Number); if (Number.isFinite(x) && Number.isFinite(y)) { if (!rows.has(y)) rows.set(y, []); rows.get(y).push(x); } }
            for (const [y, xs] of rows) {
                xs.sort((a, b) => a - b);
                let a = xs[0], b = xs[0];
                for (let i = 1; i <= xs.length; i++) {
                    if (i < xs.length && xs[i] === b + 1) { b = xs[i]; continue; }
                    g.drawRect((a - dx) * tw * r, (y - dy) * th * r, (b - a + 1) * tw * r, th * r);
                    if (i < xs.length) { a = xs[i]; b = xs[i]; }
                }
            }
            g.endFill();
            renderer.render(s.stage, s.rt, true);
            stats.softRebuilds = (stats.softRebuilds || 0) + 1;
            s.ready = true;
            return true;
        }
        update() {
            const layer = this.layer, config = safe(() => vision.settings(), { enabled: false, opacity: 1 });
            const mem = loadMemory();
            const visibility = layer.visibility || null;
            const active = !!mem && config.enabled && layer.visible !== false && !!visibility;
            if (!active) {
                this.outer.visible = false; entity.valid = false; this.restoreAll(); this.updateOverlay(false);
                if (layer.dark) layer.dark.renderable = true;
                if (this.soft) { this.soft.darkSprite.visible = false; if (this.soft.darkSprite.mask) this.soft.darkSprite.mask = null; }
                if (this.acc) { this.acc.darkSprite.visible = false; if (this.acc.darkSprite.mask) this.acc.darkSprite.mask = null; if (this.mid.mask) this.mid.mask = null; this.acc.maskSprite.renderable = false; }
                this.unexploredMask.renderable = false; this.outsideMask.renderable = false; this.exploredMask.renderable = false;
                this.edgeSig = "";
                return;
            }
            overlapMode = cfg.memory && this.accAvailable();
            if (visibility !== lastVisibility) { lastVisibility = visibility; updateVisibleTiles(layer, visibility); }
            // --- 記憶した地形 ---
            const showMemory = cfg.memory && config.opacity > 0 && mem.count > 0;
            this.outer.visible = showMemory;
            if (showMemory) {
                const original = this.spriteset._tilemap;
                if (layer.lastCache !== this.lastCache) { this.lastCache = layer.lastCache; this.tiles.refresh(); }
                this.syncTiles();
                this.inner.alpha = 1;
                this.updateFilter();
                const m = map(), tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
                const sig = [version, dx, dy, Graphics.width, Graphics.height].join(",");
                if (sig !== this.maskSig) { this.maskSig = sig; this.drawExploredMask(mem); }
                void original;
            }
            // --- 視界の縁(ぼかし / 従来の硬い縁)---
            let soft = this.softAvailable() ? safe(() => this.ensureSoft(), null) : null;
            if (!soft && this.softOk && cfg.feather > 0 && this.soft === null && typeof Graphics !== "undefined" && Graphics.app) this.softOk = false;
            {
                const m = map(), tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY();
                const edgeSig = [(visIds.get(visibility) || (visIds.set(visibility, ++fogIds), fogIds)), dx, dy, cfg.feather, soft ? 1 : 0].join(",");
                if (this.edgeSig !== edgeSig) {
                    this.edgeSig = edgeSig;
                    // 柔らかい版の描画に失敗したら、その場で硬い縁へ戻す(失敗のまま元の暗闇を止めると、未探索が丸見えになる)
                    if (soft && safe(() => this.renderSoft(visibility, dx, dy, tw, th), false) !== true) { soft = null; this.softOk = false; stats.softFailures = (stats.softFailures || 0) + 1; }
                    if (!soft) {
                        const toScreen = p => ({ x: (p.x - dx) * tw, y: (p.y - dy) * th });
                        const g = this.outsideMask, pts = (visibility.points || []).map(toScreen);
                        g.clear(); g.beginFill(0x000000, 1);
                        g.drawRect(-tw * 4, -th * 4, Graphics.width + tw * 8, Graphics.height + th * 8);
                        if (pts.length >= 3) { g.beginHole(); g.drawPolygon(pts.flatMap(p => [p.x, p.y])); g.endHole(); }
                        g.endFill();
                    }
                }
                const darkLayer = layer.dark;
                if (soft) {
                    if (darkLayer) darkLayer.renderable = false;
                    // 未探索は、完全に不透明な黒(DarknessOpacity が 1 未満でも)。記憶を使わないときだけ、従来の暗闇の濃さ
                    soft.darkSprite.visible = true; soft.darkSprite.alpha = showMemory ? 1 : (darkLayer ? darkLayer.alpha : config.opacity);
                    const darkMask = showMemory ? this.unexploredMask : null;
                    if (soft.darkSprite.mask !== darkMask) soft.darkSprite.mask = darkMask;
                    if (this.inner.mask !== soft.maskSprite) this.inner.mask = soft.maskSprite;
                } else {
                    if (darkLayer) darkLayer.renderable = true;
                    if (this.soft) { this.soft.darkSprite.visible = false; if (this.soft.darkSprite.mask) this.soft.darkSprite.mask = null; }
                    if (this.inner.mask !== this.outsideMask) this.inner.mask = this.outsideMask;
                }
                // PIXI は、mask を外すと、そのマスク用の図形を「描く」状態(renderable = true)に戻す。マスク用の図形は、常に描かない(ステンシル/スプライトのマスクとしてだけ使う)
                // 探索の履歴(積み上げ): 記憶した地形を「見えた形 ∩ 探索済みのマス」で表示し、探索済みのマスの中の「まだ見ていない所」は黒にする
                let accOn = false;
                if (showMemory && soft && this.accAvailable()) {
                    accOn = safe(() => {
                        const a = this.ensureAcc(), vid = visIds.get(visibility) || 0;
                        if (a.mem !== mem) { const t0 = now(); this.resetAcc(mem); a.visId = 0; stats.accResetMs = (stats.accResetMs || 0) + (now() - t0); }
                        if (a.visId !== vid) { this.addAcc(visibility); a.visId = vid; }
                        a.maskSprite.position.set(-dx * tw, -dy * th); a.darkSprite.position.set(-dx * tw, -dy * th);
                        return true;
                    }, false);
                    if (!accOn) { this.accOk = false; stats.accFailures = (stats.accFailures || 0) + 1; overlapMode = false; }
                }
                if (accOn) {
                    if (this.mid.mask !== this.acc.maskSprite) this.mid.mask = this.acc.maskSprite;
                    this.acc.darkSprite.visible = true; if (this.acc.darkSprite.mask !== this.exploredMask) this.acc.darkSprite.mask = this.exploredMask;
                } else if (this.acc) {
                    if (this.mid.mask) this.mid.mask = null;
                    this.acc.darkSprite.visible = false; if (this.acc.darkSprite.mask) this.acc.darkSprite.mask = null;
                } else if (this.mid.mask) this.mid.mask = null;
                if (this.acc) { this.acc.maskSprite.renderable = false; }
                // 保持の層(壁・扉のイベントの絵)は、まるごと見せる(扉の上の弧も)。壁のマスは「最初に当たった壁」だけで探索済み。切り抜きはかけない(以前の版の切り抜きを外す)
                if (layer.tiles && layer.tiles.mask) layer.tiles.mask = null;
                // 重ね描き(主人公・持っている武器)は、探索済みのマス + 見えている壁・扉の絵の範囲の中だけ(壁の向こうの未探索へ、武器などが漏れない。扉の前では、主人公が扉の絵の前に出る)
                if (showMemory) {
                    // 描き直しは、探索の記録・スクロール・見えている壁/扉のイベントの絵の範囲が変わったときだけ(歩くたびの視界の変化では描き直さない)
                    const keys = []; if (visibility && visibility.visibleKeepEvents) for (const id of visibility.visibleKeepEvents) { const e = map().event(id); if (e && !e._erased) keys.push(id + "@" + this.keepEventTiles(e).join(",")); }
                    const ksig = [version, dx, dy, keys.sort().join(";"), Graphics.width, Graphics.height].join(",");
                    if (ksig !== this.keepSig) { this.keepSig = ksig; this.drawKeepClip(mem, visibility); }
                }
                this.keepClip.renderable = false;
                const overlayMask = showMemory ? this.keepClip : null;
                if (this.overlay.mask !== overlayMask) this.overlay.mask = overlayMask;
                this.outsideMask.renderable = false; this.unexploredMask.renderable = false; this.exploredMask.renderable = false; this.keepClip.renderable = false;
                if (this.soft) this.soft.maskSprite.renderable = false;
            }
            // --- 敵・イベント(毎フレーム)---
            entity.mapId = map().mapId(); entity.valid = true;
            entity.ids = cfg.hideEntities ? computeEntities(visibility) : entity.ids; stats.entityUpdates++;
            lastVisibility = visibility;
            this.applyEntities();
            this.updateOverlay(true);
        }
        applyEntities() {
            const ts = this.spriteset._tilemap, hide = cfg.hideEntities;
            if (!ts || !map()) return;
            for (const sprite of ts.children) {
                const e = sprite && sprite._character;
                if (!e || typeof e.eventId !== "function" || map().event(e.eventId()) !== e) continue;
                const show = !hide || isEventVisible(e) || safe(() => vision.eventTags(e).keep, false);
                sprite.renderable = show; if (!show) this.touched.add(sprite);
            }
            const bars = this.spriteset._eventHpBars;
            if (Array.isArray(bars)) for (const bar of bars) {
                const e = bar && bar._event;
                if (!e || typeof e.eventId !== "function") continue;
                const show = !hide || isEventVisible(e);
                bar.renderable = show; if (!show) this.touched.add(bar);
            }
        }
        restoreAll() {
            const ts = this.spriteset._tilemap;
            if (ts) for (const sprite of ts.children) if (sprite && this.touched.has(sprite)) sprite.renderable = true;
            const bars = this.spriteset._eventHpBars;
            if (Array.isArray(bars)) for (const bar of bars) if (bar && this.touched.has(bar)) bar.renderable = true;
        }
    }
    const _create = Spriteset_Map.prototype.createLowerLayer;
    Spriteset_Map.prototype.createLowerLayer = function() {
        _create.apply(this, arguments);
        const layer = this._projectRVisionLayer;
        if (layer && typeof Tilemap !== "undefined" && typeof PIXI !== "undefined") safe(() => { this._projectRFog = new Fog(this, layer); });
    };
    const _update = Spriteset_Map.prototype.update;
    Spriteset_Map.prototype.update = function() {
        const value = _update.apply(this, arguments);
        if (this._projectRFog) this._projectRFog.update();
        return value;
    };
    const _destroy = Spriteset_Map.prototype.destroy;
    Spriteset_Map.prototype.destroy = function() { entity.valid = false; lastVisibility = null; return _destroy.apply(this, arguments); };

    // ------------------------------------------------------------------ セーブ・移動 ----------------------------------------------------------------
    // 保存の直前、マップ移動の直前に、いまのマップの記録を $gameSystem へ書く。ロード・ニューゲームでは実行時の記録を捨てて、読み込んだ $gameSystem から読み直す。
    if (typeof DataManager !== "undefined") {
        if (typeof DataManager.makeSaveContents === "function") {
            const _make = DataManager.makeSaveContents;
            DataManager.makeSaveContents = function() { flush(); return _make.apply(this, arguments); };
        }
        if (typeof DataManager.extractSaveContents === "function") {
            const _extract = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function() { memory = null; visibleNow = new Set(); lastVisibility = null; entity.valid = false; version++; return _extract.apply(this, arguments); };
        }
        if (typeof DataManager.setupNewGame === "function") {
            const _setup = DataManager.setupNewGame;
            DataManager.setupNewGame = function() { memory = null; visibleNow = new Set(); lastVisibility = null; entity.valid = false; version++; return _setup.apply(this, arguments); };
        }
    }
    if (typeof Game_Map !== "undefined") {
        const _mapSetup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() {
            flush(); memory = null; visibleNow = new Set(); lastVisibility = null; entity.valid = false; version++;
            return _mapSetup.apply(this, arguments);
        };
    }
    const clearExplored = mapId => {
        if (typeof $gameSystem === "undefined" || !$gameSystem) return false;
        const id = mapId === undefined ? (map() ? map().mapId() : null) : Number(mapId);
        if (id === null) return false;
        if ($gameSystem[STORE_KEY] && typeof $gameSystem[STORE_KEY] === "object") delete $gameSystem[STORE_KEY][id];
        if (memory && memory.mapId === id) { memory = null; version++; visibleNow = new Set(); lastVisibility = null; }
        return true;
    };
    const clearAll = () => { if (typeof $gameSystem === "undefined" || !$gameSystem) return false; $gameSystem[STORE_KEY] = {}; memory = null; version++; visibleNow = new Set(); lastVisibility = null; return true; };
    const getExploredCount = mapId => {
        if (mapId === undefined || (map() && Number(mapId) === map().mapId())) { const mem = loadMemory(); return mem ? mem.count : 0; }
        const entry = typeof $gameSystem !== "undefined" && $gameSystem && $gameSystem[STORE_KEY] ? $gameSystem[STORE_KEY][mapId] : null;
        return entry && typeof entry.count === "number" ? entry.count : 0;
    };
    PluginManager.registerCommand(NAME, "ClearExplored", () => { clearExplored(); });
    PluginManager.registerCommand(NAME, "ClearAllExplored", () => { clearAll(); });

    root.ProjectR.FogOfWar = root.ProjectRFogOfWar = {
        version: VERSION, STORE_KEY,
        getTileState: tileState, isExplored, isVisibleTile: (x, y) => visibleNow.has(idOf(x, y)),
        isEventVisible, isPointVisible, getExploredCount, clearExplored, clearAll, flush,
        getConfig: () => ({ ...cfg, extraOpaqueRegionIds: [...extraRegions], extraInstalled }),
        // DEV・診断用: 実行中に表示の設定を切り替える(セーブしない。パラメータの値へは resetConfig で戻す)
        setConfig: o => { const c = o && typeof o === "object" ? o : {}; for (const k of ["memory", "grayscale", "hideEntities", "playerOverlay"]) if (typeof c[k] === "boolean") cfg[k] = c[k]; if (c.memoryOpacity !== undefined) cfg.memoryOpacity = num(c.memoryOpacity, cfg.memoryOpacity, 0, 1); if (c.exploreRange !== undefined) cfg.exploreRange = num(c.exploreRange, cfg.exploreRange, 0, 9999); if (c.feather !== undefined) cfg.feather = num(c.feather, cfg.feather, 0, 32); return { ...cfg }; },
        resetConfig: () => { Object.assign(cfg, defaults); return { ...cfg }; },
        getStats: () => ({ ...stats, visibleTiles: visibleNow.size, explored: memory ? memory.count : 0, hiddenEvents: entity.valid && map() ? map().events().filter(e => e && !e._erased && !entity.ids.has(e.eventId())).length : 0 }),
        // テスト・診断用の純粋な部品
        rasterizeTiles, rasterizeTilesOverlap, bytesToB64, b64ToBytes, getVisibleEventIds: () => [...entity.ids],
        // 滑らかな縁の履歴(細かい記録): 1 マスを 16x16 に分けた見えた形。診断・テスト用
        HIST: { SUB, FORMAT, MAX_RECORDS: MAX_HIST_RECORDS, GRID_MAX_TILES }, rasterCells, encodeHist, decodeHist, newGrid,
        isCellSeen: (x, y) => { const mem = loadMemory(); if (!mem || !mem.grid) return null; const cx = Math.floor(x * SUB), cy = Math.floor(y * SUB); if (cx < 0 || cy < 0 || cx >= mem.w * SUB || cy >= mem.h * SUB) return false; return ((mem.grid[cy * mem.w + (cx >> 4)] >> (cx & 15)) & 1) === 1; },
        hasHistory: () => { const mem = loadMemory(); return !!(mem && mem.grid); }
    };
})();
