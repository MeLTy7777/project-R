// 8方向の向き・神の背後(8方向)・探索/戦闘の移動・壁/扉の可視性の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   FA1 マウスの8つの向き(斜めも)→ 8方向データ・正確な角度。MZ本体の向き(4方向)は 2/4/6/8 のまま
//   FA2 向きは WASD と無関係 / 斜め移動の速さ・衝突は変わらない(FieldFacing の有無で同じ)
//   FA3 斜めの照準でも、攻撃(左クリック)・スキル(一閃)・調べる(F)が動く
//   FA4 神は8方向すべてで背後 / 移動・向きの変更中も滑らか / スキルを繰り返しても1体 / 台本の神(追従)は動かさない
//   FA5 探索マップ ↔ 戦闘の移動を繰り返しても、神・向きの状態が残らない
//   FA6 壁・扉の大きな絵が、未探索を見せない(未探索は完全な黒)/ 扉自身・壁・探索済み・縁のぼかし・隠れた敵は保たれる
//   FA8 視界の縁(記憶の灰色と未探索の黒の境)が、マスの階段でなく斜めの縁 / 縁の近くを歩いても未探索は黒
//   FA7 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_facing_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FF = "ProjectRFieldFacing", GC = "ProjectRFieldGodCompanion", GV = "ProjectRGodSummonVisual", FW = "ProjectR.FogOfWar";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'fa', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const park = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  const hold = async (keys, ms) => { for (const k of keys) await c.keyDown(k); await sleep(ms); for (const k of keys) await c.keyUp(k); await sleep(150); };
  // マウスを、プレイヤーの中心から degree(上=0・時計回り)の方向へ r px(ゲーム座標)置く
  const aimDeg = async (deg, r = 220) => {
    const p = await json("(function(){ var c = $gamePlayer.centerPositionPoint(); return { x: $gameMap.adjustX(c.x) * $gameMap.tileWidth(), y: $gameMap.adjustY(c.y) * $gameMap.tileHeight() }; })()");
    const rad = deg * Math.PI / 180; await c.pointer(Math.round(p.x + Math.sin(rad) * r), Math.round(p.y - Math.cos(rad) * r)); await sleep(500);
    return json(`({ aim: ${FF}.getAim(), dir4: $gamePlayer.direction() })`);
  };
  const DIRS = [[0, 8, "N"], [45, 9, "NE"], [90, 6, "E"], [135, 3, "SE"], [180, 2, "S"], [225, 1, "SW"], [270, 4, "W"], [315, 7, "NW"]];
  const spriteCount = `(function(){ var ts = SceneManager._scene._spriteset._tilemap, n = {}, total = 0; ts.children.forEach(function(sp){ var ch = sp && sp._character; if (!ch || typeof ch.eventId !== 'function' || !ch.event || !ch.event() || !/projectRGodVisual/.test(ch.event().note || '')) return; total++; if (sp.visible !== false && sp.renderable !== false && !ch._transparent && !ch._erased && ch._characterName) n[ch._characterName] = (n[ch._characterName] || 0) + 1; }); return { n: n, total: total }; })()`;
  const recorder = `(function(){ if (window.__rec) return 'ok'; window.__rec = { frames: [], on: false }; var o = Spriteset_Map.prototype.update; Spriteset_Map.prototype.update = function(){ var r = o.apply(this, arguments); if (window.__rec.on) { try { var vs = ProjectRGodSummonVisual.getVisuals(), per = vs.filter(function(v){ return v.kind === 'persistent'; })[0], e = per ? $gameMap.event(per.eventId) : null; var c = ${spriteCount}; window.__rec.frames.push({ dx: e ? e._realX - $gamePlayer._realX : null, dy: e ? e._realY - $gamePlayer._realY : null, n: c.n, total: c.total, kinds: vs.map(function(v){ return v.kind; }).join(',') }); } catch (x) {} } return r; }; return 'ok'; })()`;
  const godOff = () => json(`(function(){ var vs = ProjectRGodSummonVisual.getVisuals().filter(function(v){ return v.kind === 'persistent'; }); var e = vs.length ? $gameMap.event(vs[0].eventId) : null; return e ? { dx: e._realX - $gamePlayer._realX, dy: e._realY - $gamePlayer._realY, transparent: e._transparent } : null; })()`);
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

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  await ev(recorder);

  await check("FA1 8つの向き", async () => {
    const out0 = await json(`({ active: ${FF}.isActive(), aim: ${FF}.getAim(), dir4: $gamePlayer.direction() })`);
    rec("FA0 探索マップ(戦闘外)では、8方向データは4方向の向きと同じ(斜めにならない)", out0.active === false && out0.aim.active === false && [2, 4, 6, 8].includes(out0.aim.dir8) && out0.aim.dir8 === out0.dir4, JSON.stringify(out0));
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8);
    const rows = [];
    for (const [deg, dir8, name] of DIRS) { const r = await aimDeg(deg); rows.push({ name, dir8: r.aim.dir8, got: r.aim.name, degree: +r.aim.degree.toFixed(1), dir4: r.dir4, ok: r.aim.active === true && r.aim.dir8 === dir8 && r.aim.name === name && Math.abs(r.aim.degree - deg) < 1.5 && [2, 4, 6, 8].includes(r.dir4) }); }
    rec("FA1a マウスを N/NE/E/SE/S/SW/W/NW に置くと、8方向データがその向き・正確な角度(±1.5°)になる。MZ本体の向きは 2/4/6/8 のまま(斜めを渡さない)", rows.every(r => r.ok), JSON.stringify(rows));
    // 斜めの照準でも、MZ本体の向きは、近い4方向(斜めの両隣のどちらか)
    const adj = { 9: [8, 6], 3: [6, 2], 1: [2, 4], 7: [4, 8] };
    rec("FA1b 斜め(NE/SE/SW/NW)の照準では、MZ本体の4方向の向きは、斜めの両隣のどちらか(互換の4方向の見た目)", rows.filter(r => adj[r.dir8]).every(r => adj[r.dir8].includes(r.dir4)), JSON.stringify(rows.filter(r => adj[r.dir8])));
    // 中間の角度(正確な角度が丸められていない)
    const mids = [];
    for (const deg of [10, 30, 100, 200, 300, 350]) { const r = await aimDeg(deg); mids.push({ deg, got: +r.aim.degree.toFixed(1), d8: r.aim.degree8, dir8: r.aim.dir8 }); }
    rec("FA1c 中間の角度(10°・30°・100°・200°・300°・350°)も、正確な角度を返し、最も近い8方向へ丸める", mids.every(m => Math.abs(m.got - m.deg) < 1.5 && Math.abs(((m.d8 - m.deg + 540) % 360) - 180) <= 22.6), JSON.stringify(mids));
    await s.shot("fa_FA1");
  });

  await check("FA2 WASDと独立・斜め移動", async () => {
    await place(8, 9, 8); const r0 = await aimDeg(45, 600); const seen = [];
    for (const keys of [["W"], ["A"], ["S"], ["D"], ["W", "D"], ["S", "A"]]) { await place(8, 9, 8); await aimDeg(45, 600); const t0 = []; await c.keyDown(keys[0]); if (keys[1]) await c.keyDown(keys[1]); for (let i = 0; i < 4; i++) { await sleep(100); t0.push(await ev(`${FF}.getAim().dir8`)); } for (const k of keys) await c.keyUp(k); seen.push({ keys: keys.join("+"), dirs: t0 }); await sleep(200); }
    rec("FA2a 移動キー(W/A/S/D・斜め W+D / S+A)を押している間も、照準(NE)の向きは変わらない", r0.aim.dir8 === 9 && seen.every(x => x.dirs.every(d => d === 9)), JSON.stringify(seen));
    // 斜め移動の速さ: FieldFacing の有無で同じ・単軸との比(DotMove の標準)
    const run = async (keys, enabled) => { await ev(`${FF}.setConfig({ enabled: ${enabled} }); 'ok'`); await place(8, 10, 8); await aimDeg(0); const p0 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"); await hold(keys, 600); const p1 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"); return +Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(3); };
    const on = { s: await run(["A"], true), d: await run(["A", "S"], true) }, off = { s: await run(["A"], false), d: await run(["A", "S"], false) };
    await ev(`${FF}.setConfig({ enabled: true }); 'ok'`);
    rec("FA2b 斜め移動・単軸移動の速さは、8方向データの有無で同じ(誤差 5% 以内)", Math.abs(on.s - off.s) <= off.s * 0.05 + 0.02 && Math.abs(on.d - off.d) <= off.d * 0.05 + 0.02 && on.d > 0.5, JSON.stringify({ on, off }));
    // 衝突: 壁(y=7)へ斜めに歩いても、壁を抜けない
    await place(4, 9, 8); await aimDeg(135); await hold(["W", "D"], 1500); const w = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
    rec("FA2c 壁へ斜め(W+D)に歩いても、壁の手前で止まる(衝突は変わらない)", w.y > 7.9 && w.x > 4.5, JSON.stringify(w));
  });

  await check("FA3 斜めの照準で攻撃・スキル・調べる", async () => {
    // 攻撃(左クリック): 北東の敵を撃つ
    await door(false);
    await ev(`${park} $gameMap.event(1).locate(1, 1); 'ok'`); await place(5, 5, 8);
    await ev(`${FC}.detachEnemy(2); var e = $gameMap.event(2); e.locate(8, 2); e._realX = 8; e._realY = 2; 'ok'`); await sleep(300);
    const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
    const h0 = await hp(2); let shots = 0;
    while (shots < 6 && (await hp(2)) >= h0) { const p = await json("(function(){ var e = $gameMap.event(2); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()"); await c.pointer(p.x, p.y); await sleep(200); await c.rightClick(undefined, undefined, 50); await sleep(700); shots++; }
    const aimDuring = await json(`${FF}.getAim()`);
    rec("FA3a 斜め(北東)の照準で、右クリックの銃が当たる(武器の照準は変わらない)", (await hp(2)) < h0 && aimDuring.dir8 === 9, JSON.stringify({ h0, h1: await hp(2), shots, aim: aimDuring.name }));
    // スキル(一閃: 照準方向の直線): 南西の敵
    await ev(`var e = $gameMap.event(2); e.locate(11, 2); e._realX = 11; e._realY = 2; $gameMap.event(3).locate(6, 7); 'ok'`);
    await place(8, 5, 8); await ev(`$gameMap.event(2).locate(11, 2); 'ok'`); await sleep(300);
    const q0 = await hp(2); await aimDeg(45, 150); const r = await json(`${FC}.useAbility('special', 'test')`); await sleep(900);
    rec("FA3b 斜め(北東)の照準で、一閃(Q)が照準方向の敵に当たる(スキルの方向は変わらない)", r && r.ok === true && (await hp(2)) < q0, JSON.stringify({ r: r && r.ok, q0, q1: await hp(2) }));
    // 調べる(F): 斜めの照準で扉の前に立つ → 開く(PlayerFacing の補助)
    await ev(`$gameMap.event(2).locate(15, 1); 'ok'`); await door(false); await place(8, 8, 8); await aimDeg(45, 150);
    await c.tap("F"); await sleep(900); const p1 = await ev("$gameMap.event(5)._pageIndex");
    rec("FA3c 斜めの照準でも、扉の前で F を押すと扉が開く(調べるは変わらない)", p1 === 1, JSON.stringify({ page: p1 }));
    await door(false);
  });

  await check("FA4 神は8方向で背後", async () => {
    await ev(`${park} 'ok'`); await place(8, 10, 8); await ev(`${GC}.resetConfig(); 'ok'`);
    const cfg = await json(`${GC}.getConfig()`), B = cfg.behindTiles, L = cfg.liftTiles, E = cfg.southExtraTiles, Nn = cfg.northExtraTiles;
    const rows = [];
    for (const [deg, dir8, name] of DIRS) {
      const r = await aimDeg(deg); await sleep(500); const g = await godOff(); const rad = deg * Math.PI / 180;
      const ex = [-Math.sin(rad) * B, Math.cos(rad) * B + L + (Math.cos(rad) > 0 ? Math.cos(rad) * E : Math.cos(rad) * Nn)];
      rows.push({ name, dx: +g.dx.toFixed(3), dy: +g.dy.toFixed(3), ex: ex.map(v => +v.toFixed(3)), ok: r.aim.dir8 === dir8 && Math.abs(g.dx - ex[0]) < 0.07 && Math.abs(g.dy - ex[1]) < 0.07 });
    }
    rec("FA4a 8つの向き(斜めも)すべてで、神が向きの反対側(背後)にいる(距離 1.2・浮かせる -0.1・南側は絵の高さぶん下げる)", rows.every(r => r.ok), JSON.stringify(rows));
    // 移動しながら向きを回す: 1フレームの変化が小さい
    await ev("window.__rec.frames = []; window.__rec.on = true; 'ok'");
    await c.keyDown("D"); for (const d of [0, 45, 90, 135, 180, 225, 270, 315, 0]) await aimDeg(d, 200); await c.keyUp("D"); await sleep(300);
    const f = await json("window.__rec.frames"); await ev("window.__rec.on = false; 'ok'");
    let maxJump = 0, maxDist = 0, n = 0; for (let i = 1; i < f.length; i++) { if (f[i].dx === null || f[i - 1].dx === null) continue; n++; maxJump = Math.max(maxJump, Math.hypot(f[i].dx - f[i - 1].dx, f[i].dy - f[i - 1].dy)); maxDist = Math.max(maxDist, Math.hypot(f[i].dx, f[i].dy)); }
    rec("FA4b 歩きながら向きを一周させても、神は瞬間移動しない(相対位置の変化 ≤ 1.1/フレーム(北 ↔ 南は約 2 マス離れる))・常にプレイヤーの近く", n > 200 && maxJump < 1.1 && maxDist < 2.4, JSON.stringify({ frames: n, maxJump: +maxJump.toFixed(3), maxDist: +maxDist.toFixed(3) }));
    // スキルの繰り返し(斜めの照準): 一閃×2・絶×3 で、同じ神は常に1体
    await place(8, 4, 8); await aimDeg(135, 120); await ev("window.__rec.frames = []; window.__rec.on = true; 'ok'");
    const used = [];
    for (let i = 0; i < 2; i++) { used.push((await json(`${FC}.useAbility('special', 'test')`)).ok); await sleep(i < 1 ? 7600 : 2500); }
    for (let i = 0; i < 3; i++) { used.push((await json(`${FC}.useAbility('mobility', 'test')`)).ok); await sleep(3300); await place(8, 4, 8); await aimDeg(i % 2 ? 225 : 135, 120); }
    const g2 = await json("window.__rec.frames"); await ev("window.__rec.on = false; 'ok'");
    const maxVisible = g2.reduce((m, r) => Math.max(m, ...Object.values(r.n || {}), 0), 0), gap = g2.filter(r => (r.total || 0) >= 1 && Object.keys(r.n || {}).length === 0).length, twoEv = g2.filter(r => (r.total || 0) >= 2).length;
    rec("FA4c 斜めの照準でスキル(一閃×2・絶×3)を繰り返しても、同じ神は全フレームで1体以下・1フレームも消えない", used.filter(Boolean).length >= 4 && maxVisible <= 1 && gap === 0 && twoEv > 0, JSON.stringify({ used, frames: g2.length, maxVisible, gap, twoEv }));
    // 台本の神(追従する神)は動かさず、常駐の神は隠れる。外すと戻る
    const cfg0 = await json(`${GC}.getConfig()`);
    await place(8, 10, 8); await aimDeg(45, 200);
    const sp = await json(`${GV}.spawnFollower('hermes', { x: 5.5, y: 4.5 }, { cardId: 'hermes_issen' })`); await sleep(500);
    const during = await json(`({ vis: ${GC}.getVisibleGods(), fpos: (function(){ var e = $gameMap.event(${sp.eventId}); return [e._realX, e._realY]; })(), per: (function(){ var v = ${GV}.getVisuals()[0]; return v ? $gameMap.event(v.eventId)._transparent : null; })() })`);
    await json(`${GV}.removeFollower(${sp.id})`); await sleep(500);
    const after = await json(`({ vis: ${GC}.getVisibleGods() })`); const g3 = await godOff();
    rec("FA4d 台本の神(追従する神)は、位置を動かされない・同時に見えるのは1体・外すと常駐の神が背後へ戻る", sp.ok && during.vis.hermes === 1 && Math.abs(during.fpos[0] - 5) < 0.05 && Math.abs(during.fpos[1] - 4) < 0.05 && during.per === true && after.vis.hermes === 1 && g3 && g3.transparent === false && Math.abs(g3.dx + Math.sin(Math.PI / 4) * cfg0.behindTiles) < 0.08, JSON.stringify({ sp: sp.ok, during, after, g3 }));
    await s.shot("fa_FA4");
  });

  await check("FA5 探索 ↔ 戦闘の移動", async () => {
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    // 探索マップ: 戦闘外は4方向・神はいない。台本の神(追従する神)を出しても、位置は動かない・消えない
    const ex = await json(`({ active: ${FF}.isActive(), aim: ${FF}.getAim(), tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length })`);
    const fp = await json(`${GV}.spawnFollower('apollo', { x: $gamePlayer._realX + 3.5, y: $gamePlayer._realY + 0.5 })`); await sleep(600);
    const sc = await json(`({ f: (function(){ var e = $gameMap.event(${fp.eventId}); return [e._realX - $gamePlayer._realX, e._realY - $gamePlayer._realY, e._transparent]; })(), vis: ${GC}.getVisibleGods(), diag: ${GC}.getDiagnostics() })`);
    await json(`${GV}.removeFollower(${fp.id})`); await sleep(400);
    rec("FA5a 探索マップ: 戦闘外の向きは4方向 / 台本の神(Apollo の追従)は、位置を動かされず・消されず(孤児扱いされない)、外すと残らない", ex.active === false && [2, 4, 6, 8].includes(ex.aim.dir8) && ex.tagged === 0 && fp.ok && Math.abs(sc.f[0] - 3) < 0.05 && sc.f[2] === false && sc.vis.apollo === 1 && sc.diag.orphansRemoved === 0, JSON.stringify({ ex, sc }));
    const runs = [];
    for (let i = 0; i < 2; i++) {
      await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8);
      const r = await aimDeg(315, 200); await sleep(600); const g = await godOff(); const vis = await json(`${GC}.getVisibleGods()`);
      await json(`${FC}.useAbility('mobility', 'test')`); await sleep(500); const vis2 = await json(`${GC}.getVisibleGods()`);
      await sleep(2500); await ev(`${FC}.abortEncounter('rep'); 'ok'`); await leave();
      const left = await json(`({ tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length, active: ${FF}.isActive(), dir8: ${FF}.getAim().dir8, tracked: ${GC}.getDiagnostics().tracked })`);
      runs.push({ aim: r.aim.name, god: [+g.dx.toFixed(2), +g.dy.toFixed(2)], vis: vis.hermes, vis2: vis2.hermes || 0, left });
    }
    rec("FA5b 戦闘 ↔ 探索マップを2回繰り返す: 毎回、向き(NW)・神の背後(南東)が正しく、見える神は1体、戻ると神のEvent・追従の状態・8方向の有効状態が残らない", runs.every(r => r.aim === "NW" && Math.abs(r.god[0] - 0.707 * 1.2) < 0.08 && r.vis === 1 && r.vis2 <= 1 && r.left.tagged === 0 && r.left.active === false && [2, 4, 6, 8].includes(r.left.dir8) && r.left.tracked === 0), JSON.stringify(runs));
    // 敗北 → ロード(タイトル経由)
    await ev("window.__base = JsonEx.stringify(DataManager.makeSaveContents()); 'ok'");
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("DataManager.extractSaveContents(JsonEx.parse(window.__base)); SceneManager.goto(Scene_Map); 'ok'"); await waitMap(1); await sleep(1200);
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await aimDeg(135, 200); await sleep(600);
    const again = await json(`({ vis: ${GC}.getVisibleGods(), aim: ${FF}.getAim().name })`);
    rec("FA5c ロード後に入り直しても、向き(SE)・神は1体(保存に8方向の状態を持たない)", again.aim === "SE" && again.vis.hermes === 1, JSON.stringify(again));
  });

  await check("FA6 壁・扉の絵・プレイヤーとの重なり", async () => {
    await ev(`${FW}.resetConfig(); ${FW}.clearExplored(); 'ok'`);
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(5, 3); $gameMap.event(2).locate(11, 3); $gameMap.event(3).locate(3, 5); 'ok'`);
    await door(false); await place(8, 10, 8); await aimDeg(0); await sleep(500);
    // 保持の層(壁のマス・扉の絵の複製)を隠した画面(B)と、そのままの画面(A)を比べる。B では未探索が完全な黒(保持の層が原因でないものは、すべて黒)。
    // A では、扉の絵の範囲の外が完全な黒(扉の絵は、自分の絵だけを足す)。扉の絵は、まるごと見える(上の弧も)。
    const setCopies = vis => ev(`(function(){ var l = SceneManager._scene._spriteset._projectRVisionLayer; l.keep.visible = ${vis}; return l.copies.size; })()`);
    const copyBounds = () => json("(function(){ var l = SceneManager._scene._spriteset._projectRVisionLayer, out = []; l.copies.forEach(function(sp){ var b = sp.getBounds(); out.push([b.x - 2, b.y - 2, b.x + b.width + 2, b.y + b.height + 2]); }); return out; })()");
    const abCheck = async (label) => {
      const a = await json(`${unexploredSamples}(8)`); if (!a) return { label, skipped: true };
      const bounds = await copyBounds(); const pixA = await grab();
      await setCopies(false); await sleep(160); const pixB = await grab(); const b = await json(`${unexploredSamples}(8)`); await setCopies(true); await sleep(100);
      if (!b || a.sig !== b.sig) return { label, skipped: true };
      const set = new Set(b.pts.map(p => p.join(","))); let badB = 0, badA = 0, inDoor = 0, door = 0; const samples = [];
      for (const p of a.pts) {
        if (!set.has(p.join(","))) continue;
        const inside = bounds.some(r => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3]);
        const pb = pixB(p[0], p[1]), pa = pixA(p[0], p[1]);
        if (Math.max(pb[0], pb[1], pb[2]) > 3) { badB++; if (samples.length < 3) samples.push(["B", p, pb]); }
        if (!inside && Math.max(pa[0], pa[1], pa[2]) > 3) { badA++; if (samples.length < 3) samples.push(["A", p, pa]); }
        if (inside) { inDoor++; if (Math.max(pa[0], pa[1], pa[2]) > 3) door++; }
      }
      return { label, skipped: false, n: a.pts.length, badA, badB, inDoor, doorArt: door, samples };
    };
    const r = [];
    for (let i = 0; i < 2; i++) r.push(await abCheck("閉じた扉(正面)"));
    await place(5, 8, 8); await aimDeg(45); r.push(await abCheck("閉じた扉(斜め・左から)"));
    await place(11, 8, 8); await aimDeg(315); r.push(await abCheck("閉じた扉(斜め・右から)"));
    await place(8, 8, 8); await aimDeg(0); await door(true); r.push(await abCheck("開いた扉")); await door(false); r.push(await abCheck("扉を閉じた直後"));
    await c.keyDown("A"); for (let i = 0; i < 4; i++) { await door(i % 2 === 0); r.push(await abCheck("移動中・扉の開閉")); } await c.keyUp("A");
    const used = r.filter(x => !x.skipped), pts = used.reduce((n, x) => n + x.n, 0), badA = used.reduce((n, x) => n + x.badA, 0), badB = used.reduce((n, x) => n + x.badB, 0), art = used.reduce((n, x) => n + x.doorArt, 0);
    rec("FA6a 未探索の点(" + pts + " 点・" + used.length + " 回)が、扉の絵を隠した画面では完全な黒 / 扉の絵がある画面でも、扉の絵の範囲の外は完全な黒(扉の絵は自分の絵だけを足す)", used.length >= 7 && pts > 3000 && badB === 0 && badA === 0 && art > 0, JSON.stringify({ shots: used.length, skipped: r.length - used.length, points: pts, badA, badB, doorArtPixels: art, first: (used.find(x => x.badA || x.badB) || {}).samples }));
    // 閉じた扉の上の弧: 扉の絵が、扉自身のマスより上(8,6)にも、まるごと出ている(切り取られていない)。扉の絵を隠すと、そこは黒
    await ev(`${FW}.clearExplored(); 'ok'`); await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(600);
    const arc = await toScreen(8.5, 6.8);
    const pxA = (await grab())(arc.x, arc.y); await setCopies(false); await sleep(160); const pxB = (await grab())(arc.x, arc.y); await setCopies(true); await sleep(100);
    const tall = await json("(function(){ var e = $gameMap.event(5); var sp = SceneManager._scene._spriteset._tilemap.children.filter(function(c){ return c._character === e; })[0]; return { h: sp ? sp.height : null, w: sp ? sp.width : null }; })()");
    rec("FA6b 閉じた扉の絵は、まるごと見える(扉の上のマス(8,6)にかかる弧も切り取られない)。扉の絵を隠すと、そこは黒(未探索の地形は出ない)", tall.h > 48 && lum(pxA) > 25 && lum(pxB) <= 3, JSON.stringify({ sprite: tall, withDoor: pxA, withoutDoor: pxB }));
    // 主人公: 扉の前・戸口の中・戸口を通る間、扉の絵・暗闇の後ろに隠れない(主人公の絵を隠した画面と比べて、主人公の矩形の中が大きく変わる)
    const playerDiff = async () => {
      const rect = await json("(function(){ var p = SceneManager._scene._spriteset._tilemap.children.filter(function(c){ return c._character === $gamePlayer; })[0], b = p.getBounds(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()");
      const withP = await grab();
      await ev("(function(){ var sp = SceneManager._scene._spriteset, ts = sp._tilemap, body = ts.children.filter(function(c){ return c._character === $gamePlayer; })[0]; window.__hid = ts.children.filter(function(c){ return c._character === $gamePlayer || (!c._character && !c._event && c.bitmap && Math.abs(c.x - body.x) <= 110 && Math.abs(c.y - body.y) <= 110); }); window.__hid.forEach(function(c){ c.__v = c.renderable; c.renderable = false; }); sp._projectRFog.overlay.visible = false; return window.__hid.length; })()"); await sleep(160);
      const without = await grab();
      await ev("(function(){ var sp = SceneManager._scene._spriteset; window.__hid.forEach(function(c){ c.renderable = c.__v; }); sp._projectRFog.overlay.visible = true; return 'ok'; })()"); await sleep(100);
      let n = 0, total = 0;
      for (let y = Math.round(rect.y + rect.h * 0.1); y < rect.y + rect.h * 0.95; y += 3) for (let x = Math.round(rect.x + rect.w * 0.25); x < rect.x + rect.w * 0.75; x += 3) { total++; const a = withP(x, y), b = without(x, y); if (Math.abs(a[0] - b[0]) > 20 || Math.abs(a[1] - b[1]) > 20 || Math.abs(a[2] - b[2]) > 20) n++; }
      return { n, total };
    };
    const pos = [];
    await door(false); for (const y of [8.6, 8.2, 8.0]) { await place(8, y, 8); await aimDeg(0); await sleep(200); pos.push({ door: "閉", y, ...(await playerDiff()) }); }
    await door(true); for (const y of [8.5, 7.5, 7, 6.5, 6]) { await place(8, y, 8); await aimDeg(0); await sleep(200); pos.push({ door: "開", y, ...(await playerDiff()) }); }
    rec("FA6c 主人公は、閉じた扉の前・開いた戸口の中・戸口を通る間のどこでも、扉の絵・暗闇の後ろに隠れない(主人公の絵を隠した画面と比べて、体の矩形の 30% 以上が変わる)", pos.every(p => p.n >= p.total * 0.3), JSON.stringify(pos));
    // 壁(最初に当たる壁)・探索済み・縁のぼかし・隠れた敵
    await door(false); await place(8, 10, 8); await aimDeg(0); await sleep(400);
    const wallPx = await tilePixelAt(3, 7), floorPx = await tilePixelAt(4, 10);
    await door(true); await place(8, 4, 2); await place(8, 10, 8); await door(false); await sleep(500);
    const dim = await tilePixelAt(4, 4), st = await json(`({ north: ${FW}.getTileState(4, 4), south: ${FW}.getTileState(4, 10), cfg: ${FW}.getConfig() })`);
    rec("FA6d 見える壁(3,7)は壁の絵・見える床は通常の明るさ・探索済み(4,4)は暗い灰色・縁のぼかし/灰色/暗さの設定は保たれる", lum(wallPx) > 35 && lum(floorPx) > 100 && st.north === "explored" && lum(dim) > 15 && lum(dim) < lum(floorPx) * 0.6 && st.cfg.feather === 6 && st.cfg.grayscale === true && st.cfg.memoryOpacity === 0.45, JSON.stringify({ wallPx, floorPx, dim, st }));
    await ev(`$gameMap.event(1).locate(5, 4); 'ok'`); await sleep(500);
    const scan = await leakScan();
    rec("FA6e 隠れた敵(探索済みの暗い所)は、描かれない(漏れなし)", scan.hidden.length >= 1 && scan.leaks.length === 0, JSON.stringify(scan));
    // 扉の衝突・調べる(F): 閉じた扉は通れない・F で開閉できる
    await ev(`$gameMap.event(1).locate(1, 1); 'ok'`); await door(false); await place(8, 8.4, 8); await aimDeg(0); await hold(["W"], 900); const blocked = await json("({ y: $gamePlayer._realY })");
    await c.tap("F"); await sleep(900); const op = await ev("$gameMap.event(5)._pageIndex"); await hold(["W"], 1200); const thru = await json("({ y: $gamePlayer._realY })");
    rec("FA6f 扉の衝突・調べるは変わらない: 閉じた扉は通れない / F で開く / 開けば通れる", blocked.y > 7.9 && op === 1 && thru.y < 7, JSON.stringify({ blocked, op, thru }));
    await s.shot("fa_FA6");
  });

  await check("FA8 視界の縁の階段(記憶の縁)", async () => {
    // 扉を開けて、斜めの視界(扇形)を何度か作り、扉を閉める → 記憶した地形(灰色)と未探索(黒)の境が、マスの階段でなく、視界の斜めの縁になる
    const explore = async () => {
      await door(false); await place(8, 10, 8); await sleep(300);                                  // 南の部屋へ戻ってから消す(北の部屋にいるまま消すと、すぐ北の部屋が探索済みになる)
      await ev(`${FW}.clearExplored(); 'ok'`); await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1); 'ok'`);
      await door(true);
      for (const [x, y] of [[8, 10], [7.2, 9.5], [6.4, 9], [5, 9.5], [8, 9]]) { await place(x, y, 8); await aimDeg(0); }
      await door(false); await place(8, 9, 8); await aimDeg(0); await sleep(500);
    };
    // 北の部屋の行ごとに、左の縁(黒 → 記憶の灰色)の位置を測る。隣り合う行(4px おき)の縁の位置の差が大きい = 階段
    const scan = async () => {
      const pix = await grab(); const rows = [];
      const x0 = (await toScreen(2.5, 0)).x, x1 = (await toScreen(8.4, 0)).x, y0 = (await toScreen(0, 2.3)).y, y1 = (await toScreen(0, 6.5)).y;
      for (let y = Math.round(y0); y < y1; y += 4) { let edge = null; for (let x = Math.round(x0); x < x1; x++) { if (lum(pix(x, y)) > 12) { edge = x; break; } } rows.push(edge); }
      const valid = rows.filter(v => v !== null); let maxJump = 0, big = 0;
      for (let i = 1; i < rows.length; i++) if (rows[i] !== null && rows[i - 1] !== null) { const d = Math.abs(rows[i] - rows[i - 1]); maxJump = Math.max(maxJump, d); if (d > 14) big++; }
      return { rows: rows.length, valid: valid.length, maxJump, big, first: valid.slice(0, 6) };
    };
    await explore(); const smooth = await scan();
    await s.shot("fa_FA8_smooth");
    // 比較: 従来のマス単位の記憶(FeatherPixels=0 では履歴を使わない)は、同じ縁が階段になる
    await ev(`${FW}.setConfig({ feather: 0 }); 'ok'`); await explore(); const stairs = await scan(); await s.shot("fa_FA8_tiles");
    await ev(`${FW}.resetConfig(); 'ok'`); await sleep(300);
    rec("FA8a 記憶の縁(黒と灰色の境)が、階段でなく斜めの縁: 隣り合う行の縁の位置の差が 14px 以下(従来のマス単位は、48px のように大きく跳ぶ)", smooth.valid >= 15 && smooth.big === 0 && smooth.maxJump <= 14 && stairs.maxJump >= 24, JSON.stringify({ smooth, stairs }));
    // 縁の近くを歩いても、未探索は黒・漏れなし・隠れた敵は出ない
    await explore();
    const leaks = [];
    // 縁の近くを少しずつ歩く(歩いては止まり、止まった画面を調べる。歩いている最中は視界が毎フレーム変わり、前後の読み取りが合わない)
    for (const k of ["A", "A", "A", "A", "D", "D", "D", "D", "D", "D", "D", "D"]) { await hold([k], 130); await sleep(250); leaks.push(await leakCheck()); }
    const used = leaks.filter(x => !x.skipped), pts = used.reduce((n, x) => n + x.n, 0), bad = used.reduce((n, x) => n + x.bad, 0);
    rec("FA8b 記憶の縁の近くを歩いても、未探索(" + pts + " 点)は完全な黒(扉自身の1マス以外に例外なし)", used.length >= 6 && pts > 6000 && bad === 0, JSON.stringify({ shots: used.length, points: pts, bad, first: (used.find(x => x.bad) || {}).samples }));
    const st = await json(`${FW}.getStats()`);
    await sleep(800);
    rec("FA8c 履歴の描き直しは、視界が変わったときだけ(止まっている間は増えない)", await (async () => { const a = (await json(`${FW}.getStats()`)).accAdds || 0; await sleep(700); const b = (await json(`${FW}.getStats()`)).accAdds || 0; return a === b && (st.accAdds || 0) > 0 && !(st.accFailures); })(), JSON.stringify({ accAdds: st.accAdds, accResets: st.accResets, accFailures: st.accFailures || 0 }));
  });

  await check("FA7 性能・エラー・保存", async () => {
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); 'ok'`); await door(true); await place(8, 10, 8); await aimDeg(45);
    const measure = async enabled => {
      await ev(`${FF}.setConfig({ enabled: ${enabled} }); 'ok'`);
      await ev("(function(){ var o = Scene_Map.prototype.update; window.__ms = []; window.__origSM = o; Scene_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(900); await c.keyUp("A"); await c.keyDown("D"); await sleep(900); await c.keyUp("D");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Scene_Map.prototype.update = window.__origSM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3) }; })()");
      await place(8, 10, 8);
      return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const runs = { on: [], off: [] };                                  // 交互に2回ずつ測り、小さい方(ゆらぎを除く)を使う
    for (let i = 0; i < 2; i++) { runs.on.push(await measure(true)); runs.off.push(await measure(false)); }
    const on = runs.on.reduce((a, b) => (a.avgMs <= b.avgMs ? a : b)), off = runs.off.reduce((a, b) => (a.avgMs <= b.avgMs ? a : b));
    await ev(`${FF}.setConfig({ enabled: true }); 'ok'`);
    rec("FA7a 8方向データ + 神の背後 + 壁・扉の切り抜きの負荷は小さい(Scene_Map.update の増加 < 0.5ms)/ 約60fps", on.fps > 52 && on.avgMs - off.avgMs < 0.5, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("FA7b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  async function tilePixelAt(tx, ty) { const p = await toScreen(tx + 0.5, ty + 0.5); return (await grab())(p.x, p.y); }
  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_facing_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
