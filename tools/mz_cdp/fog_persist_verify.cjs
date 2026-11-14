// 滑らかな探索の縁(記憶の灰色と未探索の黒の境)の保存の実機(Playtest)確認: セーブ/ロード・マップ移動・旧セーブ・繰り返しの戦闘。
//   FP1 新規の探索: 縁が斜めで、保存の記録(v2)は小さい
//   FP2 マップ移動(Map008 → Map001 → Map008): 戻っても、同じ縁(細かい記録まで同じ)。マップごとに別
//   FP3 セーブ → ロード(使い捨てのフォルダ): 同じ縁・未探索は完全な黒・灰色・FeatherPixels はそのまま・隠れた敵は描かれない
//   FP4 旧セーブ(履歴なし): 従来のマス単位(縁が階段)で動く。探索の記録は同じ。新しく探索した所は滑らか
//   FP5 複数マップの往復(Map008 → 001 → 003 → 007 → 008)・マップごとの記録
//   FP6 戦闘の出入りを繰り返しても、縁・記録が変わらない・育たない
//   FP7 セーブの大きさ(履歴あり/なし)
//   FP8 性能(視界の記録・保存・復元・フレーム)  FP9 Console のエラーなし・書き込みは使い捨てのフォルダだけ
// 使い方: MZ_OUT=<出力> MZ_TMP_SAVE=<一時のsaveフォルダ> node tools/mz_cdp/fog_persist_verify.cjs   (新しいNW.jsセッションで実行する。本物のsave/ へは書かない)
const fs = require("fs"), path = require("path");
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FW = "ProjectR.FogOfWar", KEY = "_projectRFogExplored";
const norm = p => String(p || "").replace(/\\/g, "/").replace(/\/?$/, "/");
const TMP = norm(process.env.MZ_TMP_SAVE);
const window_sizes = {};
(async () => {
  if (!process.env.MZ_TMP_SAVE) throw new Error("MZ_TMP_SAVE(一時のsaveフォルダ)を指定してください");
  fs.mkdirSync(TMP, { recursive: true });
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'fp', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const goMap = async (id, x, y, d) => { await ev(`$gamePlayer.reserveTransfer(${id}, ${x}, ${y}, ${d || 8}, 0); 'ok'`); await waitMap(id); await sleep(900); };
  const park = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  const hold = async (keys, ms) => { for (const k of keys) await c.keyDown(k); await sleep(ms); for (const k of keys) await c.keyUp(k); await sleep(150); };
  const aimDeg = async (deg, r = 220) => {
    const p = await json("(function(){ var c = $gamePlayer.centerPositionPoint(); return { x: $gameMap.adjustX(c.x) * $gameMap.tileWidth(), y: $gameMap.adjustY(c.y) * $gameMap.tileHeight() }; })()");
    const rad = deg * Math.PI / 180; await c.pointer(Math.round(p.x + Math.sin(rad) * r), Math.round(p.y - Math.cos(rad) * r)); await sleep(500);
  };
  const decodePng = buf => { let off = 8, width = 0, height = 0, ctype = 0; const idat = []; while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; } const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } } return { width, height, bpp, data: out }; };
  const viewport = () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const grab = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); const png = decodePng(Buffer.from(r.data, "base64")), m = await viewport(); return (sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; }; };
  const toScreen = (tx, ty) => json(`({ x: $gameMap.adjustX(${tx}) * $gameMap.tileWidth(), y: $gameMap.adjustY(${ty}) * $gameMap.tileHeight() })`);
  const lum = p => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  // 未探索で、視界の多角形から 3px 以上外で、見えている壁のマスでもない所(例外なし: 壁・扉の絵のはみ出しも数える)
  const unexploredSamples = `(function(step){ var l = SceneManager._scene._spriteset._projectRVisionLayer, v = l.visibility; if (!v) return null; var m = $gameMap, tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY(); var pts = v.points.map(function(p){ return { x: (p.x - dx) * tw, y: (p.y - dy) * th }; }); var wall = v.visibleRegionTiles || new Set(); var own = new Set(); (v.visibleKeepEvents ? Array.from(v.visibleKeepEvents) : []).forEach(function(id){ var e = m.event(id); if (e) own.add(Math.floor(e._realX + 1e-6) + ',' + Math.floor(e._realY + 1e-6)); }); var x0 = (0 - dx) * tw + 4, x1 = (m.width() - dx) * tw - 4, y0 = (0 - dy) * th + 4, y1 = (m.height() - dy) * th - 4;
      function inside(px, py) { var r = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) r = !r; } return r; }
      function dist(px, py) { var best = 1e9; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j], ex = b.x - a.x, ey = b.y - a.y, t = ((px - a.x) * ex + (py - a.y) * ey) / (ex * ex + ey * ey || 1); t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(px - (a.x + t * ex), py - (a.y + t * ey))); } return best; }
      var out = []; for (var y = Math.max(y0, 0); y < Math.min(y1, Graphics.height); y += step) for (var x = Math.max(x0, 0); x < Math.min(x1, Graphics.width); x += step) { var tx = Math.floor(x / tw + dx), ty = Math.floor(y / th + dy); if (ProjectR.FogOfWar.getTileState(tx, ty) !== 'unexplored') continue; if (wall.has(tx + ',' + ty) || own.has(tx + ',' + ty)) continue; if (inside(x, y) || dist(x, y) < 3) continue; out.push([x, y]); } return { sig: pts.length + ':' + pts.slice(0, 3).map(function(p){ return Math.round(p.x) + ',' + Math.round(p.y); }).join(';') + ':' + dx + ',' + dy, pts: out }; })`;
  const leakCheck = async (step = 8) => {
    const a = await json(`${unexploredSamples}(${step})`); if (!a) return { skipped: true };
    const pix = await grab(); const b = await json(`${unexploredSamples}(${step})`);
    if (!b || a.sig !== b.sig) return { skipped: true };
    const set = new Set(b.pts.map(p => p.join(","))); let bad = 0, worst = 0; const samples = [];
    for (const p of a.pts) { if (!set.has(p.join(","))) continue; const px = pix(p[0], p[1]); const mx = Math.max(px[0], px[1], px[2]); if (mx > 3) { bad++; worst = Math.max(worst, mx); if (samples.length < 4) samples.push([p, px]); } }
    return { skipped: false, n: a.pts.length, bad, worst, samples };
  };
  const leakScan = () => json(`(function(){ var hidden = {}; $gameMap.events().filter(function(e){ return e && !e._erased && e.databaseEnemy; }).forEach(function(e){ if (!ProjectR.FogOfWar.isEventVisible(e)) hidden[e.eventId()] = true; }); var leaks = []; (function walk(o, ok) { if (!o) return; var self = ok && o.visible !== false && o.renderable !== false && (o.worldAlpha === undefined || o.worldAlpha > 0) && (o.alpha === undefined || o.alpha > 0); var e = o._character || o._event; if (e && typeof e.eventId === 'function' && hidden[e.eventId()] && self) leaks.push((o.constructor && o.constructor.name) + ':' + e.eventId()); (o.children || []).forEach(function(ch){ walk(ch, self); }); })(SceneManager._scene, true); return { hidden: Object.keys(hidden), leaks: leaks }; })()`);
  const sha = p => require("crypto").createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  // 保存は、使い捨てのフォルダだけ(それ以外は例外)
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev(`(function(){ var dir = ${JSON.stringify(TMP)}; StorageManager.fileDirectoryPath = function() { return dir; }; window.__tmpWrites = []; window.__blocked = 0; var so = StorageManager.saveObject; StorageManager.saveObject = function(name, obj) { var p = StorageManager.filePath(name).replace(/\\\\/g, '/'); if (p.indexOf(dir) !== 0) { window.__blocked++; return Promise.reject(new Error('WRITE BLOCKED: ' + p)); } window.__tmpWrites.push(p); return so.call(this, name, obj); }; return 'ok'; })()`);
  await ev(`${FW}.resetConfig(); ${FW}.clearAll(); 'ok'`);

  // マップ 8 の探索(扉を開けて、斜めの視界の扇形を何度か作り、閉じる)。北の部屋の左の縁(黒 → 灰色)が、記憶の縁
  const explore = async () => {
    await ev(`${FW}.clearExplored(); ${park} 'ok'`); await door(true);
    for (const [x, y] of [[8, 10], [7.2, 9.5], [6.4, 9], [5, 9.5], [8, 9]]) { await place(x, y, 8); await aimDeg(0); }
    await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
  };
  const scan = async () => {
    const pix = await grab(); const rows = [], gray = [];
    const x0 = (await toScreen(2.5, 0)).x, x1 = (await toScreen(8.4, 0)).x, y0 = (await toScreen(0, 2.3)).y, y1 = (await toScreen(0, 6.5)).y;
    for (let y = Math.round(y0); y < y1; y += 4) { let edge = null; for (let x = Math.round(x0); x < x1; x++) { if (lum(pix(x, y)) > 12) { edge = x; break; } } rows.push(edge); if (edge !== null) { const p = pix(edge + 14, y); gray.push(Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) <= 10 && lum(p) > 12); } }
    const valid = rows.filter(v => v !== null); let maxJump = 0, big = 0;
    for (let i = 1; i < rows.length; i++) if (rows[i] !== null && rows[i - 1] !== null) { const d = Math.abs(rows[i] - rows[i - 1]); maxJump = Math.max(maxJump, d); if (d > 14) big++; }
    return { rows, n: rows.length, valid: valid.length, maxJump, big, grayRatio: gray.length ? gray.filter(Boolean).length / gray.length : 0 };
  };
  const same = (a, b) => { let worst = 0, cmp = 0; for (let i = 0; i < Math.min(a.rows.length, b.rows.length); i++) { if (a.rows[i] === null || b.rows[i] === null) { if (a.rows[i] !== b.rows[i]) worst = 999; continue; } cmp++; worst = Math.max(worst, Math.abs(a.rows[i] - b.rows[i])); } return { worst, cmp }; };
  // 細かい記録そのものの指紋(探索済みのマスの中で、見えた形のセル(1 マス 16x16)の数とハッシュ)
  const cells = () => json(`(function(){ var F = ${FW}, m = $gameMap, n = 0, h = 0, tiles = 0; for (var ty = 0; ty < m.height(); ty++) for (var tx = 0; tx < m.width(); tx++) { if (!F.isExplored(tx, ty)) continue; tiles++; for (var cy = 0; cy < 16; cy++) for (var cx = 0; cx < 16; cx++) if (F.isCellSeen(tx + (cx + 0.5) / 16, ty + (cy + 0.5) / 16) === true) { n++; h = (Math.imul(h, 31) + (ty * 16 + cy) * 4099 + tx * 16 + cx) >>> 0; } } return { n: n, h: h, tiles: tiles, count: F.getExploredCount(), has: F.hasHistory() }; })()`);
  const entry = id => json(`(function(){ var s = $gameSystem['${KEY}']; ${FW}.flush(); s = $gameSystem['${KEY}']; var e = s && s[${id}]; return e ? { w: e.w, h: e.h, count: e.count, v: e.v || 0, histLen: e.hist ? e.hist.length : 0, bitsLen: e.bits.length } : null; })()`);
  const stripAll = () => ev(`(function(){ ${FW}.flush(); var s = $gameSystem['${KEY}']; Object.keys(s).forEach(function(k){ delete s[k].v; delete s[k].hist; }); return 'ok'; })()`);
  const saveSlot = async n => { const r = await ev(`$gameSystem.onBeforeSave(); DataManager.saveGame(${n}).then(function(r) { return 'saved:' + r; }, function(e) { return 'ERR:' + e; })`); return r; };
  const loadSlot = async n => {
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(400);
    await ev(`window.__load = 'pending'; DataManager.loadGame(${n}).then(function() { $gameSystem.onAfterLoad(); SceneManager.goto(Scene_Map); window.__load = 'ok'; }, function(e) { window.__load = 'ERR ' + e; }); 'req'`);
    const ok = await wait("window.__load !== 'pending'", 15000); const r = await ev("window.__load");
    await wait("SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
    return { ok, r };
  };
  const frameMs = () => ev(`new Promise(function(res) { var n = 0, t0 = performance.now(), worst = 0, last = t0; (function f() { var t = performance.now(); worst = Math.max(worst, t - last); last = t; n++; if (t - t0 < 2000) requestAnimationFrame(f); else res(JSON.stringify({ fps: n / ((t - t0) / 1000), worst: worst })); })(); })`).then(JSON.parse);

  let scan0 = null, cells0 = null, ent0 = null, count1 = 0;
  await check("FP1 新規の探索", async () => {
    await enter(); await explore();
    scan0 = await scan(); await s.shot("fp_FP1_smooth"); cells0 = await cells(); ent0 = await entry(8);
    const cfg = await json(`${FW}.getConfig()`), st = await json(`${FW}.getStats()`);
    rec("FP1a 新規の探索: 記憶の縁(黒と灰色の境)は、階段でなく斜めの縁(隣り合う行の差 14px 以下)・灰色", scan0.valid >= 15 && scan0.big === 0 && scan0.maxJump <= 14 && scan0.grayRatio >= 0.9, JSON.stringify({ ...scan0, rows: undefined, cfg: cfg.feather }));
    rec("FP1b 保存の記録(v2): 縁のマスだけの細かい記録が付く(小さい)。探索済みのマスのビット列・数は従来どおり", ent0 && ent0.v === 2 && ent0.histLen > 0 && ent0.histLen < 6000 && ent0.w === 17 && ent0.h === 13 && ent0.count === cells0.count && cells0.has === true && st.histRecords > 0 && st.histRecords < 150, JSON.stringify({ ent0, cells0, records: st.histRecords }));
    // 比較(従来のマス単位): 履歴を使わない設定で同じ探索 → 縁は階段
    await ev(`${FW}.setConfig({ feather: 0 }); 'ok'`); await explore(); const stairs = await scan(); await ev(`${FW}.resetConfig(); 'ok'`); await sleep(300);
    rec("FP1c (比較)従来のマス単位は、同じ探索で縁が階段(隣り合う行の差が 24px 以上)", stairs.maxJump >= 24, JSON.stringify({ stairs: stairs.maxJump }));
    await explore(); scan0 = await scan(); cells0 = await cells();         // 比較のあとに、もう一度、同じ探索から(このあとの基準)
    await ev(`${FC}.abortEncounter('fp'); 'ok'`); await leave();
  });

  await check("FP2 マップ移動(Map008 → Map001 → Map008)", async () => {
    // Map001: 少し歩いて探索 → Map001 の記録は別
    await hold(["D"], 700); await hold(["S"], 500);
    const e1 = await entry(1); count1 = e1 ? e1.count : 0;
    await goMap(8, 8, 9, 8); await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
    const back = await scan(), cellsB = await cells(), diff = same(scan0, back), e8 = await entry(8);
    rec("FP2a Map008 へ戻ると、細かい記録まで同じ(見えたセルの数・ハッシュ・探索済みのマスの数が一致)・縁の位置が同じ(差 4px 以下)・まだ滑らか", cellsB.n === cells0.n && cellsB.h === cells0.h && cellsB.count === cells0.count && diff.worst <= 4 && diff.cmp >= 15 && back.big === 0 && back.maxJump <= 14, JSON.stringify({ cellsB, cells0, diff, big: back.big }));
    rec("FP2b マップごとに別の記録(Map001 と Map008)。Map008 の記録は増えて(止まって戻っただけなので、ほぼ同じ)いない・Map001 の探索は Map008 に出ない", e1 && e8 && e1.w === 60 && e1.h === 40 && count1 > 0 && e8.count === ent0.count && Math.abs(e8.histLen - ent0.histLen) <= 40, JSON.stringify({ e1, e8, ent0 }));
    await s.shot("fp_FP2_back");
  });

  await check("FP3 セーブ → ロード", async () => {
    const saved = await saveSlot(1), size1 =fs.existsSync(TMP + "file1.rmmzsave") ? fs.statSync(TMP + "file1.rmmzsave").size : -1;
    const writes = await json("window.__tmpWrites.map(function(p){ return p.replace(/^.*\\//, ''); })");
    // 履歴を外した版(旧セーブと同じ形)を、スロット 2 へ(大きさの比較・旧セーブの確認用)。メモリの記録は、保存の直前の flush が書き直すので、外したあとにもう一度 flush はしない(dirty でない)
    await ev(`${FW}.flush(); window.__histBackup = JSON.stringify($gameSystem['${KEY}']); 'ok'`); await stripAll();
    const saved2 = await saveSlot(2), size2 = fs.existsSync(TMP + "file2.rmmzsave") ? fs.statSync(TMP + "file2.rmmzsave").size : -1;
    await ev(`$gameSystem['${KEY}'] = JSON.parse(window.__histBackup); 'ok'`);
    const files = fs.readdirSync(TMP).filter(f => /\.rmmzsave$/.test(f));
    rec("FP3a 使い捨てのフォルダへ、本物の DataManager.saveGame で保存(スロット 1 = 履歴あり・スロット 2 = 履歴なしの旧セーブの形)", /saved:/.test(saved) && /saved:/.test(saved2) && files.includes("file1.rmmzsave") && files.includes("file2.rmmzsave") && size1 > 0 && size2 > 0 && (await json("window.__blocked")) === 0, JSON.stringify({ saved, saved2, files, size1, size2, writes: [...new Set(writes)] }));
    // ロード(タイトルを経由)
    const L = await loadSlot(1);
    const w = await json("({ mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
    const after = await scan(), cellsA = await cells(), diff = same(scan0, after);
    rec("FP3b ロード後の縁: 保存前と同じ(細かい記録のセル数・ハッシュ・探索済みの数が一致、縁の位置の差 4px 以下)・斜めのまま(隣り合う行の差 14px 以下)・灰色", L.ok && L.r === "ok" && w.mapId === 8 && cellsA.n === cells0.n && cellsA.h === cells0.h && cellsA.count === cells0.count && diff.worst <= 4 && after.big === 0 && after.maxJump <= 14 && after.grayRatio >= 0.9, JSON.stringify({ L, w, cellsA, cells0, diff, after: { ...after, rows: undefined } }));
    const leaks = []; await c.keyDown("A"); for (let i = 0; i < 3; i++) { await sleep(150); leaks.push(await leakCheck()); } await c.keyUp("A"); await c.keyDown("D"); for (let i = 0; i < 3; i++) { await sleep(150); leaks.push(await leakCheck()); } await c.keyUp("D");
    const used = leaks.filter(x => !x.skipped), pts = used.reduce((n, x) => n + x.n, 0), bad = used.reduce((n, x) => n + x.bad, 0);
    const ls = await leakScan(), cfg = await json(`${FW}.getConfig()`);
    rec("FP3c ロード後も、未探索(" + pts + " 点)は完全な黒・FeatherPixels と記憶の設定はそのまま・視界の外の敵は描かれない", used.length >= 4 && pts > 3000 && bad === 0 && cfg.feather === 6 && cfg.memory === true && cfg.grayscale === true && ls.hidden.length > 0 && ls.leaks.length === 0, JSON.stringify({ shots: used.length, pts, bad, cfg: [cfg.feather, cfg.memory, cfg.grayscale], hidden: ls.hidden, leaks: ls.leaks }));
    await s.shot("fp_FP3_loaded");
    window_sizes.slot1 = size1; window_sizes.slot2 = size2;
  });

  await check("FP4 旧セーブ(履歴なし)", async () => {
    const L = await loadSlot(2);
    await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
    const legacy = await scan(), cellsL = await cells(), e8 = await entry(8);
    rec("FP4a 旧セーブ(v・履歴なし)も読める: 探索済みのマスは同じ数。探索済みのマスは、すべて全部見えた(従来のマス単位: 見えたセル = マス数 x 256)。例外・エラーなし", L.ok && L.r === "ok" && cellsL.count === cells0.count && legacy.valid >= 15 && cellsL.n === cellsL.tiles * 256 && cellsL.n > cells0.n && cellsL.has === true && s.errors().length === 0, JSON.stringify({ L, cellsL, legacy: { ...legacy, rows: undefined }, e8 }));
    await s.shot("fp_FP4_legacy");
    // 旧セーブから続けて、新しく探索した所(別の向き・北の部屋の右側)は、滑らか
    await door(true); await place(8, 10, 8); await aimDeg(20); await place(9.5, 9, 8); await aimDeg(20); await door(false); await place(9.5, 9, 8); await sleep(500);
    const e8b = await entry(8), cellsN = await cells();
    rec("FP4b 旧セーブから続けて探索すると、新しく見えた所は細かい記録(v2)になり、旧セーブの探索済みのマスは従来のまま(全部見えた)・探索済みの数は増える", e8b && e8b.v === 2 && e8b.histLen > 0 && cellsN.count >= cellsL.count && cellsN.n > cellsL.n, JSON.stringify({ e8b, cellsL: { n: cellsL.n, count: cellsL.count }, cellsN: { n: cellsN.n, count: cellsN.count } }));
  });

  await check("FP5 複数マップの往復", async () => {
    await loadSlot(1); await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(300);
    const base = await cells(); const store = {};
    for (const [id, x, y] of [[1, 10, 10], [3, 8, 8], [7, 8, 8], [8, 8, 9]]) {
      await goMap(id, x, y, 8); await hold(["D"], 500); await hold(["W"], 400); await hold(["A"], 400);
      store[id] = await entry(id);
    }
    await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
    const back = await scan(), cellsB = await cells(), diff = same(scan0, back);
    const all = await json(`(function(){ ${FW}.flush(); var s = $gameSystem['${KEY}'], o = {}; Object.keys(s).forEach(function(k){ o[k] = { c: s[k].count, h: s[k].hist ? s[k].hist.length : 0 }; }); return o; })()`);
    rec("FP5a Map008 → 001 → 003 → 007 → 008: 戻ると、Map008 の細かい記録・縁が保存前と同じ(Map008 を離れて 3 回別のマップを歩いたあと)", cellsB.n === base.n && cellsB.h === base.h && diff.worst <= 4 && back.big === 0 && back.maxJump <= 14, JSON.stringify({ base, cellsB, diff }));
    rec("FP5b マップごとの記録: 001・003・007・008 が別々に残り、それぞれ探索済み > 0・大きさがマップと一致(Map003/007 は 17x13)", [1, 3, 7, 8].every(id => store[id] && store[id].count > 0) && store[3].w === 17 && store[7].w === 17 && store[1].w === 60 && Object.keys(all).length >= 4, JSON.stringify({ store, all }));
  });

  await check("FP6 戦闘の出入りの繰り返し", async () => {
    const before = await entry(8); const sizes = [];
    for (let i = 0; i < 2; i++) {
      await enter(); await ev(`${park} 'ok'`); await door(false); await place(8, 10, 8); await aimDeg(0); await sleep(600);
      sizes.push((await entry(8)).histLen); await ev(`${FC}.abortEncounter('fp'); 'ok'`); await leave();
    }
    await goMap(8, 8, 9, 8); await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(600);
    const after = await scan(), cellsA = await cells(), e = await entry(8), diff = same(scan0, after);
    rec("FP6a 戦闘 ↔ 探索マップを 2 回繰り返したあと、縁は同じ(差 4px 以下・滑らか)。記録は育たない(増えても、最初に歩いた分だけ)・探索済みの数は減らない", after.big === 0 && diff.worst <= 4 && e.histLen <= before.histLen + 400 && e.count >= before.count && cellsA.count >= cells0.count, JSON.stringify({ before, sizes, e, diff, cellsA: { n: cellsA.n, count: cellsA.count } }));
  });

  await check("FP7 セーブの大きさ", async () => {
    const st = await json(`(function(){ ${FW}.flush(); var s = $gameSystem['${KEY}'], total = 0, hist = 0, bits = 0; Object.keys(s).forEach(function(k){ total += JSON.stringify(s[k]).length; hist += s[k].hist ? s[k].hist.length : 0; bits += s[k].bits.length; }); return { maps: Object.keys(s).length, totalBytes: total, histBytes: hist, bitsBytes: bits }; })()`);
    const d = window_sizes.slot1 - window_sizes.slot2;
    rec("FP7 セーブの大きさ: 履歴の分(圧縮後のファイル 1 つ)の増加は 8KB 以内。霧の記録の全体(" + st.maps + " マップ)は 40KB 以内・履歴はそのうち大きすぎない", window_sizes.slot1 > 0 && window_sizes.slot2 > 0 && d < 8192 && st.totalBytes < 40000 && st.histBytes < 20000, JSON.stringify({ slot1: window_sizes.slot1, slot2: window_sizes.slot2, diff: d, ...st }));
  });

  await check("FP8 性能", async () => {
    const st = await json(`${FW}.getStats()`);
    const rasters = st.cellRasters || 0, per = rasters ? (st.cellMs || 0) / rasters : 0;
    await ev(`${FW}.setConfig({ feather: 6 }); 'ok'`); await place(8, 9, 8); await c.keyDown("A"); const on = await frameMs(); await c.keyUp("A");
    await ev(`${FW}.setConfig({ feather: 0 }); 'ok'`); await place(8, 9, 8); await c.keyDown("A"); const off = await frameMs(); await c.keyUp("A"); await ev(`${FW}.resetConfig(); 'ok'`);
    rec("FP8 性能: 視界の記録は 1 回 " + per.toFixed(3) + "ms(" + rasters + " 回)・保存(flush)・復元(decode)・履歴の作り直しは 1 回 10ms/10ms/40ms 以内(平均)・歩いている間のフレームは 50fps 以上で、履歴なし(feather 0)の 0.9 倍以上", rasters > 20 && per < 0.5 && (st.flushes ? st.flushMs / st.flushes : 0) < 10 && (st.loads ? (st.loadMs || 0) / st.loads : 0) < 10 && (st.accResets ? (st.accResetMs || 0) / st.accResets : 0) < 40 && on.fps >= 50 && on.fps >= off.fps * 0.9, JSON.stringify({ per: +per.toFixed(4), rasters, flushes: st.flushes, flushMs: +(st.flushMs || 0).toFixed(2), loads: st.loads, loadMs: +(st.loadMs || 0).toFixed(2), accResets: st.accResets, accResetMs: +(st.accResetMs || 0).toFixed(2), accFromGrid: st.accFromGrid, on, off, histRejected: st.histRejected || 0, histLoads: st.histLoads || 0 }));
  });

  await check("FP9 エラー・書き込み", async () => {
    const wr = await json("({ blocked: window.__blocked, writes: Array.from(new Set(window.__tmpWrites.map(function(p){ return p.replace(/^.*\\//, ''); }))) })");
    rec("FP9 Console のエラーなし・書き込みは使い捨てのフォルダだけ(ほかへ書こうとしたことなし)", s.errors().length === 0 && wr.blocked === 0 && wr.writes.length > 0 && wr.writes.every(f => /^(file[12]|global)\.rmmzsave$/.test(f)), JSON.stringify({ errors: s.errors().slice(0, 3), ...wr }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`
${s.results.length - fails.length}/${s.results.length} PASS`);
  fs.writeFileSync((process.env.MZ_OUT || "mz_out") + "/fog_persist_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
