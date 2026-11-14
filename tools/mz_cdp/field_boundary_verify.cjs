// 霧の境界の描画と、戸口の死体の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   B1 Map008 の外周(通行不能の壁のタイル)が Region 255(視界を遮る)/ 通行は変わらない
//   B2 壁の角: 壁の端をかすめる視線で、外周の壁のマスが斜めに欠けない(4隅とも壁の絵が出る)
//   B3 縁のぼかし: 見えている所と暗い所(未探索・探索済み)の境が滑らか / 0 にすると従来の硬い縁 / 縁より外へはみ出さない / 探索済みの暗さより暗くならない
//   B4 隠れた敵: 縁のぼかしがあっても、敵・HPバー・予兆は漏れない
//   B5 戸口で倒された敵(原因の切り分け: 扉そのもの / 生きている敵の衝突 / 倒れた敵)・扉の開閉・繰り返し
//   B6 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_boundary_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FW = "ProjectR.FogOfWar";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(700); };
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(150); };
  const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(800));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'bd', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(500); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const parkEnemies = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  const decodePng = buf => { let off = 8, width = 0, height = 0, ctype = 0; const idat = []; while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; } const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } } return { width, height, bpp, data: out }; };
  const viewport = () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const toScreen = (tx, ty) => json(`({ x: $gameMap.adjustX(${tx}) * $gameMap.tileWidth(), y: $gameMap.adjustY(${ty}) * $gameMap.tileHeight() })`);
  const lum = p => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  const isBlack = p => p[0] < 12 && p[1] < 12 && p[2] < 12;
  // 1回のスクリーンショットから、ゲーム座標(sx, sy)のピクセルを読む関数を返す
  const grab = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); const png = decodePng(Buffer.from(r.data, "base64")), m = await viewport(); return (sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; }; };
  const tilePixel = async (tx, ty) => { const p = await toScreen(tx + 0.5, ty + 0.5); return (await grab())(p.x, p.y); };
  const leakScan = () => json(`(function(){ var hidden = {}; $gameMap.events().filter(function(e){ return e && !e._erased && e.databaseEnemy; }).forEach(function(e){ if (!ProjectR.FogOfWar.isEventVisible(e)) hidden[e.eventId()] = true; }); var leaks = []; (function walk(o, ok) { if (!o) return; var self = ok && o.visible !== false && o.renderable !== false && (o.worldAlpha === undefined || o.worldAlpha > 0) && (o.alpha === undefined || o.alpha > 0); var e = o._character || o._event; if (e && typeof e.eventId === 'function' && hidden[e.eventId()] && self) leaks.push((o.constructor && o.constructor.name) + ':' + e.eventId()); (o.children || []).forEach(function(ch){ walk(ch, self); }); })(SceneManager._scene, true); return { hidden: Object.keys(hidden), leaks: leaks }; })()`);
  const fogInfo = () => json("(function(){ var f = SceneManager._scene._spriteset._projectRFog, l = SceneManager._scene._spriteset._projectRVisionLayer; return { soft: !!f.soft, darkRenderable: l.dark.renderable, rebuilds: ProjectR.FogOfWar.getStats().softRebuilds || 0, feather: ProjectR.FogOfWar.getConfig().feather }; })()");
  // 左右の縁の横断: 行 sy で、x0 → x1 の輝度の並び
  const scanRow = (pix, sy, x0, x1) => { const a = []; for (let x = x0; x <= x1; x++) a.push(lum(pix(x, sy))); return a; };
  // 暗い側から明るい側へ向かう縁の「なめらかさ」: 見え始めの位置 i0、見えている所の基準値、その間(i0〜i0+24)の中間の値の数
  const edgeProfile = a => { const i0 = a.findIndex(v => v > 8); if (i0 < 0 || i0 + 24 >= a.length) return null; const plateau = a.slice(i0 + 14, i0 + 24).sort((p, q) => p - q)[5]; const win = a.slice(i0, i0 + 14); return { i0, plateau: Math.round(plateau), first: +(a[i0] / plateau).toFixed(2), mid: win.filter(v => v > 0.15 * plateau && v < 0.85 * plateau).length }; };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);

  await check("B1 Map008 の外周は視界を遮る", async () => {
    await enter();
    const r = await json(`(function(){ var w = $gameMap.width(), h = $gameMap.height(), ring = [], bad = [], passBad = []; for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { ring.push(1); if ($gameMap.regionId(x, y) !== 255) bad.push(x + ',' + y); if ($gamePlayer.canPass(x === 0 ? 1 : (x === w - 1 ? w - 2 : x), y === 0 ? 1 : (y === h - 1 ? h - 2 : y), x === 0 ? 4 : (x === w - 1 ? 6 : (y === 0 ? 8 : 2)))) passBad.push(x + ',' + y); } } var door = $gameMap.regionId(8, 7), row = []; for (var x = 1; x <= 15; x++) row.push($gameMap.regionId(x, 7)); return { w: w, h: h, ring: ring.length, bad: bad, passBad: passBad.slice(0, 4), doorRegion: door, rowRegions: row.join(','), floor: [[8, 9], [4, 4], [12, 4], [8, 3]].map(function(p){ return $gameMap.isPassable(p[0], p[1], 2); }) }; })()`);
    rec("B1a 外周 56 マスすべてが Region 255 / 扉のマスは Region 0(視界を遮るのは閉じた扉のイベント)/ 内側の壁の行 y=7 は 255", r.ring === 56 && r.bad.length === 0 && r.doorRegion === 0 && r.rowRegions === "255,255,255,255,255,255,255,0,255,255,255,255,255,255,255", JSON.stringify(r));
    rec("B1b 通行は変わらない(外周へは出られない・内側の床は歩ける)", r.passBad.length === 0 && r.floor.every(Boolean), JSON.stringify({ passBad: r.passBad, floor: r.floor }));
  });

  await check("B2 壁の角", async () => {
    await ev(`${parkEnemies} 'ok'`); await door(false); await place(8, 9, 8);
    const pix = await grab();
    const corners = [];
    for (const [tx, ty] of [[0, 7], [16, 7], [0, 8], [16, 8], [0, 6], [16, 6]]) {
      const p = await toScreen(tx, ty), pts = [[6, 6], [42, 6], [6, 42], [42, 42]].map(([ox, oy]) => lum(pix(p.x + ox, p.y + oy)));
      corners.push({ t: tx + "," + ty, min: Math.round(Math.min(...pts)), pts: pts.map(Math.round) });
    }
    const seen = corners.filter(k => k.t.endsWith(",7") || k.t.endsWith(",8"));
    rec("B2a 壁の行の端(0,7)・(16,7)と、その下の(0,8)・(16,8)が、4隅とも壁の絵で出る(斜めに欠けて黒が混じらない)", seen.every(k => k.min > 35), JSON.stringify(corners));
    await s.shot("bd_B2_corners");
    // 扉を開けた状態でも同じ(戸口の脇の壁の端)
    await door(true);
    const pix2 = await grab(), edge = [];
    for (const tx of [7, 9]) { const p = await toScreen(tx, 7); edge.push({ t: tx + ",7", pts: [[6, 6], [42, 6], [6, 42], [42, 42]].map(([ox, oy]) => Math.round(lum(pix2(p.x + ox, p.y + oy)))) }); }
    rec("B2b 扉を開けても、戸口の脇の壁(7,7)・(9,7)は壁の絵が欠けずに出る", edge.every(k => Math.min(...k.pts) > 35), JSON.stringify(edge));
    await door(false);
  });

  await check("B3 縁のぼかし", async () => {
    await ev("ProjectR.FogOfWar.resetConfig(); ProjectR.FogOfWar.clearExplored(); 'ok'");
    await ev(`${parkEnemies} 'ok'`); await door(false); await door(true); await place(8, 9, 8); await sleep(600);
    const info = await fogInfo();
    rec("B3a ぼかしの描画に切り替わっている(暗闇は FogOfWar の柔らかい版・元の暗闇は描かない)", info.soft === true && info.darkRenderable === false && info.rebuilds > 0 && info.feather === 6, JSON.stringify(info));
    const x0 = Math.round((await toScreen(2, 0)).x), x1 = Math.round((await toScreen(8.4, 0)).x), x2 = Math.round((await toScreen(8.6, 0)).x), x3 = Math.round((await toScreen(14, 0)).x);
    const softPix = await grab();
    // 柔らかい版・硬い版の全体の画面(視界の周り)を撮る
    const area = { x0: Math.round((await toScreen(1, 0)).x), x1: Math.round((await toScreen(16, 0)).x), y0: Math.round((await toScreen(0, 1.2)).y), y1: Math.round((await toScreen(0, 6.8)).y) };
    await s.shot("bd_B3_soft");
    await ev("ProjectR.FogOfWar.setConfig({ feather: 0 }); 'ok'"); await sleep(600);
    const hardPixSame = await grab();                                  // 同じ探索の状態で、ぼかしだけを切った画面(はみ出し・中央の明るさの比較用)
    // 縁のぼかしを切ると、探索の履歴も使わない(従来のマス単位)。探索済みのマスも従来の判定で作り直す(ぼかしあり = 多角形に少しでも重なるマス、なし = 中心が入るマス)
    await ev("ProjectR.FogOfWar.setConfig({ feather: 0 }); ProjectR.FogOfWar.clearExplored(); 'ok'"); await door(false); await door(true); await place(8, 9, 8); await sleep(700);
    const hardInfo = await fogInfo();
    const hardPix = await grab();
    // 縁のある行: 硬い版で、両側とも「黒 → 見えている所」の縁になっている行(探索済みの暗い箱が隣にない行)
    let rowY = null, hardEdges = null, softEdges = null; const tried = [];
    for (let y = Math.round((await toScreen(0, 4.0)).y); y < Math.round((await toScreen(0, 6.6)).y); y += 3) {
      const la = scanRow(hardPix, y, x0, x1), ra = scanRow(hardPix, y, x2, x3).reverse();
      tried.push([y, Math.round(la[0]), Math.round(ra[0]), JSON.stringify(edgeProfile(la)), JSON.stringify(edgeProfile(ra))].join("|"));
      if (la[0] < 8 && ra[0] < 8) { const he = { left: edgeProfile(la), right: edgeProfile(ra) }; if (he.left && he.right) { rowY = y; hardEdges = he; softEdges = { left: edgeProfile(scanRow(softPix, y, x0, x1)), right: edgeProfile(scanRow(softPix, y, x2, x3).reverse()) }; break; } }
    }
    await s.shot("bd_B3_hard");
    await ev("ProjectR.FogOfWar.resetConfig(); 'ok'"); await sleep(500);
    rec("B3b 視界の縁(未探索側)が滑らか: 見え始めは基準の 30% 以下・中間の明るさが 3 ピクセル以上続く。FeatherPixels=0 では硬い縁(中間 ≤ 2)で、元の暗闇に戻る", !!(softEdges && softEdges.left && softEdges.right) && [softEdges.left, softEdges.right].every(e => e.first <= 0.3 && e.mid >= 3) && !!(hardEdges && hardEdges.left && hardEdges.right) && [hardEdges.left, hardEdges.right].every(e => e.mid <= 2) && hardInfo.darkRenderable === true, JSON.stringify({ rowY, softEdges, hardEdges, hardInfo, tried: tried.slice(0, 4) }));
    // はみ出し(リーク)なし: 硬い縁のとき暗い(または探索済みの暗さの)所で、柔らかい版が硬い版より明るくならない
    let brighter = 0, total = 0, maxGain = 0;
    for (let y = area.y0; y < area.y1; y += 2) for (let x = area.x0; x < area.x1; x += 2) {
      const a = lum(softPix(x, y)), b = lum(hardPixSame(x, y)); total++;
      if (a - b > 12) { brighter++; maxGain = Math.max(maxGain, a - b); }
    }
    rec("B3c 縁より外へはみ出さない(柔らかい版が、硬い版より明るくなるのは縁のサブピクセルの誤差だけ: 0.3% 以下・差 45 以下。影の内側へ向けてだけ暗くなる)", brighter <= Math.ceil(total * 0.003) && maxGain <= 45, JSON.stringify({ brighter, total, maxGain: Math.round(maxGain) }));
    // 全体の明るさ(視界の中央)は変わらない
    const mid = await toScreen(8.5, 5.5), center = [lum(softPix(mid.x, mid.y)), lum(hardPixSame(mid.x, mid.y))];
    rec("B3d 視界の中央は、ぼかしの有無で明るさが変わらない(縁だけが滑らか)", Math.abs(center[0] - center[1]) < 6 && center[0] > 100, JSON.stringify(center));
  });

  await check("B3e 探索済みの縁", async () => {
    await ev("ProjectR.FogOfWar.resetConfig(); ProjectR.FogOfWar.clearExplored(); 'ok'");
    await ev(`${parkEnemies} 'ok'`); await door(true); await place(8, 3, 2); await place(8, 9, 8); await door(false); await door(true); await sleep(400);
    // 探索済みの暗い床(扉を開けた視界の外)と、見えている床の境(戸口から北の扇形の縁)
    const xa = Math.round((await toScreen(3, 0)).x), xb = Math.round((await toScreen(8.5, 0)).x);
    const softPix = await grab();
    await ev("ProjectR.FogOfWar.setConfig({ feather: 0 }); 'ok'"); await sleep(500);
    const hardPix = await grab();
    let a = null, b = null;
    for (let y = Math.round((await toScreen(0, 2.2)).y); y < Math.round((await toScreen(0, 6.2)).y); y += 3) {
      const h = scanRow(hardPix, y, xa, xb);
      if (h[0] > 25 && h[0] < 100 && h[h.length - 1] > 120 && h.slice(0, 20).every(v => v > 25 && v < 100)) { a = scanRow(softPix, y, xa, xb); b = h; break; }
    }
    if (!a) { const dbg = []; for (let y = Math.round((await toScreen(0, 2.2)).y); y < Math.round((await toScreen(0, 6.2)).y); y += 24) dbg.push(scanRow(hardPix, y, xa, xb).filter((_, i) => i % 20 === 0).map(Math.round).join(" ")); throw new Error("no explored/visible edge row found: " + dbg.join(" // ")); }
    await ev("ProjectR.FogOfWar.resetConfig(); 'ok'"); await sleep(400);
    const dim = Math.round(Math.min(...a.slice(0, 15))), dimAvg = a.slice(0, 15).reduce((p, q) => p + q, 0) / 15;
    const jumpMax = arr => { let m = 0; for (let i = 1; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i] - arr[i - 1])); return Math.round(m); };
    const plateau = a.slice(-10).sort((p, q) => p - q)[5];
    // 探索済みの暗さより暗くならない(黒い縁取りがない)
    const undershoot = Math.min(...a) < dim - 12;
    rec("B3e 探索済みの縁: 見えている所 → 探索済みの暗さへ滑らかに変わる(隣り合う 1px の輝度差の最大が、硬い縁より小さい)/ 暗さより暗い縁取りなし / 探索済みの暗さは保たれる", jumpMax(a) < jumpMax(b) * 0.8 && !undershoot && dimAvg > 20 && dimAvg < plateau * 0.65, JSON.stringify({ softJump: jumpMax(a), hardJump: jumpMax(b), dim, dimAvg: Math.round(dimAvg), plateau: Math.round(plateau), undershoot }));
    await s.shot("bd_B3e_explored");
  });

  await check("B4 隠れた敵はぼかしがあっても漏れない", async () => {
    await ev("ProjectR.FogOfWar.resetConfig(); 'ok'");
    await ev(`${parkEnemies} 'ok'`); await door(true); await place(8, 9, 8);
    // 視界の縁の少し外(未探索側)・探索済みの暗い所・扇形の縁の上に敵を置いて、有無で画面が同じこと
    const spots = [[5, 4], [11, 4], [8, 2], [6, 6]];
    const results = [];
    for (const [tx, ty] of spots) {
      await ev(`$gameMap.event(1).locate(${tx}, ${ty}); 'ok'`); await sleep(450);
      const sp = await toScreen(tx + 0.5, ty + 0.5), vis = await ev(`${FW}.isEventVisible($gameMap.event(1))`);
      const p1 = await grab(), scan = await leakScan();
      await ev("$gameMap.event(1).locate(1, 1); 'ok'"); await sleep(450);
      const p2 = await grab();
      let diff = 0; for (let dy = -40; dy <= 40; dy += 3) for (let dx = -40; dx <= 40; dx += 3) { const a = p1(sp.x + dx, sp.y + dy), b = p2(sp.x + dx, sp.y + dy); if (Math.abs(a[0] - b[0]) > 14 || Math.abs(a[1] - b[1]) > 14 || Math.abs(a[2] - b[2]) > 14) diff++; }
      results.push({ spot: tx + "," + ty, vis, diff: vis ? "(visible)" : diff, leaks: scan.leaks.length });
    }
    const hiddenOnes = results.filter(r => r.vis === false);
    rec("B4a 視界の外の敵は、縁のすぐ外・探索済みの暗い所・壁の陰のどこでも、敵の有無で画面が同じ(スプライト・HPバー・予兆の漏れなし)", hiddenOnes.length >= 3 && hiddenOnes.every(r => r.diff === 0 && r.leaks === 0), JSON.stringify(results));
    // 視界の中の敵は描かれる
    await ev("$gameMap.event(3).locate(8, 4); 'ok'"); await sleep(450);
    const ok = await ev(`${FW}.isEventVisible($gameMap.event(3))`);
    rec("B4b 視界の中の敵(扇形の中)は見える", ok === true, "");
    await ev("$gameMap.event(3).locate(8, 1); 'ok'");
  });

  await check("B5 戸口の死体・扉・繰り返し", async () => {
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    await enter();
    await ev(`${parkEnemies} 'ok'`); await door(true); await sleep(300);
    // D1 扉そのもの: 開いた扉は(敵がいなければ)通れる
    await place(8, 9, 8); await hold("W", 1500); const d1 = await pos();
    rec("B5a 開いた扉そのものは通れる(敵がいないとき、戸口を北へ抜けられる)= 扉は原因ではない", d1.y < 7, JSON.stringify(d1));
    // D2 生きている敵が戸口に立つと通れない(従来どおり)
    await ev("$gameMap.event(2).locate(8, 7); 'ok'"); await sleep(400);
    await place(8, 9, 8); await hold("W", 1500); const d2 = await pos();
    const live = await json("({ through: $gameMap.event(2)._through, prio: $gameMap.event(2)._priorityType })");
    rec("B5b 生きている敵が戸口にいる間は通れない(生きている敵の当たり判定は従来どおり)", d2.y > 7.9 && live.through === false && live.prio === 1, JSON.stringify({ d2, live }));
    // D3 倒すと通れる: 衝突の原因は倒れた敵のイベント(through / priority)
    await kill(2); await sleep(500);
    const dead = await json("(function(){ var e = $gameMap.event(2); return { through: e._through, prio: e._priorityType, erased: e._erased, hp: $gameMap.getCurrentEventHp(2), state: ProjectRFieldCombat.getEncounterState().state, canPassIn: $gamePlayer.canPass(8, 8, 8) }; })()");
    await place(8, 9, 8); await hold("W", 1500); const d3 = await pos();
    rec("B5c 倒すと(HP0)すぐ通り抜け可能になり、戸口を北へ抜けられる(原因は倒れた敵のイベントの当たり判定。消さない・戦闘はまだ続く)", dead.through === true && dead.prio === 0 && dead.erased === false && dead.hp <= 0 && dead.state === "fighting" && d3.y < 7, JSON.stringify({ dead, d3 }));
    // D4 もどる(北→南)も通れる・死体が戸口に残っていても扉を閉められる
    await hold("S", 1800); const d4 = await pos();
    rec("B5d 死体が戸口に残っていても、南へ戻れる", d4.y > 8, JSON.stringify(d4));
    await place(8, 8, 8); await c.pointer(960, 100); await sleep(200);
    await c.tap("F"); await sleep(900); const closed = await json("({ page: $gameMap.event(5)._pageIndex })");
    await c.tap("F"); await sleep(900); const opened = await json("({ page: $gameMap.event(5)._pageIndex })");
    rec("B5e 扉は前に立って F で閉じる・もう一度で開く(死体が戸口にあっても)", closed.page === 0 && opened.page === 1, JSON.stringify({ closed, opened }));
    // D5 倒した敵のうち、戸口の外(北側)にいる敵も通れる/勝利で戻る
    await kill(1); await kill(3); await leave();
    rec("B5f 全員倒すと勝利して戻る(勝利の判定は変わらない)", (await ev("$gameVariables.value(9)")) === 1, "");
    // D6 繰り返し(2回): 毎回、扉は閉・敵は初期状態・外周の壁も同じ
    const runs = [];
    for (let i = 0; i < 2; i++) {
      await enter();
      const fresh = await json("({ door: $gameMap.event(5)._pageIndex, through: [1, 2, 3].map(function(id){ return $gameMap.event(id)._through; }), ring: $gameMap.regionId(0, 7) })");
      await door(true); await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(2, 2); $gameMap.event(3).locate(14, 2); $gameMap.event(2).locate(8, 7); 'ok'`); await sleep(300);
      await kill(2); await sleep(400);
      await place(8, 9, 8); await hold("W", 1400); const p = await pos();
      const pxs = await tilePixel(0, 7);
      await kill(1); await kill(3); await leave();
      runs.push({ fresh, passed: p.y < 7, corner: Math.round(lum(pxs)), v: await ev("$gameVariables.value(9)") });
    }
    rec("B5g 繰り返し 2 回: 毎回、敵・扉は初期状態・外周は Region 255 のまま、戸口の死体を通れて、勝利で戻る(壁の角(0,7)は欠けない)", runs.every(r => r.fresh.door === 0 && r.fresh.through.every(t => t === false) && r.fresh.ring === 255 && r.passed && r.v === 1 && r.corner > 35), JSON.stringify(runs));
    const left = await json(`({ settled: $gameMap.events().filter(function(e){ return e._projectRFieldSettled; }).length, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled(), dark: SceneManager._scene._spriteset._projectRVisionLayer.dark.renderable })`);
    rec("B5h 探索マップへ戻ると、戦闘・敵の状態が残らない / セーブ可 / 元の暗闇の描画も(霧がなければ)従来どおり", left.settled === 0 && !left.active && !left.allowed && left.save, JSON.stringify(left));
  });

  await check("B6 性能・エラー・保存", async () => {
    await enter(); await ev(`${parkEnemies} 'ok'`); await door(true); await place(8, 9, 8);
    const measure = async feather => {
      await ev(`${FW}.setConfig({ feather: ${feather} }); 'ok'`); await sleep(300);
      await ev("(function(){ var sp = SceneManager._scene._spriteset; sp.__orig = sp.update; window.__ms = []; sp.update = function(){ var t = performance.now(); var r = sp.__orig.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(1300); await c.keyUp("A"); await c.keyDown("D"); await sleep(1300); await c.keyUp("D"); await c.keyDown("W"); await sleep(900); await c.keyUp("W"); await c.keyDown("S"); await sleep(900); await c.keyUp("S");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ var sp = SceneManager._scene._spriteset; sp.update = sp.__orig; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(2), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2), rebuilds: ProjectR.FogOfWar.getStats().softRebuilds || 0 }; })()");
      await place(8, 9, 8);
      return { feather, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const soft = await measure(6), hard = await measure(0);
    await ev(`${FW}.resetConfig(); 'ok'`);
    rec("B6a 縁のぼかしの負荷は小さい(1フレームの更新時間の増加 < 1.5ms)/ 約60fps", soft.fps > 52 && soft.avgMs - hard.avgMs < 1.5 && soft.p95Ms < 8, JSON.stringify({ soft, hard }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("B6b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_boundary_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
