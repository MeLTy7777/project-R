// Stage 3 の手動Playtestで見つかった3つの不具合の修正の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   K1 倒された敵が戸口をふさがない: 生きている敵は通れない(従来どおり)→ 倒すと、すぐ通り抜け可能(通行だけ。消さない・勝利の判定は同じ)/ 繰り返しのエンカウンターでは新しい敵から
//   K2 探索済みの地形の描画: 見えなくなった探索済みの地形が、灰色で、見えている所より暗い / 見えている所は通常の明るさ / 未探索は黒 / 隠れた敵は出ない
//   K3 壁のすぐ近くの主人公: 頭・体が壁(暗闇・壁の絵)に隠れない(重ね描きの有無で画面が変わる)/ 壁の衝突・視界の遮り・隠れた敵の隠蔽は変わらない / 敵・イベントは重ねない
//   K4 扉の開閉・場所移動・セーブ/ロード・繰り返し: 後に何も残らない
//   K5 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_fixes_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FW = "ProjectR.FogOfWar";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(600); };
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(150); };
  const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(800));
  const advance = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; if (await ev("$gameMessage.isBusy()")) await c.tap("F", 60); await sleep(120); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'fx', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(500); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const decodePng = buf => { let off = 8, width = 0, height = 0, ctype = 0; const idat = []; while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; } const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } } return { width, height, bpp, data: out }; };
  const shot = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); return decodePng(Buffer.from(r.data, "base64")); };
  const viewport = () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const pixelAt = (png, m, sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
  const toScreen = (tx, ty) => json(`({ x: Math.round(($gameMap.adjustX(${tx})) * 48), y: Math.round(($gameMap.adjustY(${ty})) * 48) })`);
  const tilePixel = async (tx, ty) => { const m = await viewport(), p = await toScreen(tx + 0.5, ty + 0.5), png = await shot(); return pixelAt(png, m, p.x, p.y); };
  const lum = p => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
  const isBlack = p => p[0] < 12 && p[1] < 12 && p[2] < 12;
  const isGray = p => Math.abs(p[0] - p[1]) < 14 && Math.abs(p[1] - p[2]) < 14;
  // 画面の領域(画面座標 sx,sy の周り ± half px)のピクセル列
  const regionPx = async (sx, sy, half) => { const m = await viewport(), png = await shot(), out = []; for (let dy = -half; dy <= half; dy += 4) for (let dx = -half; dx <= half; dx += 4) out.push(pixelAt(png, m, sx + dx, sy + dy)); return out; };
  const diffCount = (a, b) => a.reduce((n, p, i) => n + (Math.abs(p[0] - b[i][0]) > 14 || Math.abs(p[1] - b[i][1]) > 14 || Math.abs(p[2] - b[i][2]) > 14 ? 1 : 0), 0);
  const leakScan = () => json(`(function(){ var hidden = {}; $gameMap.events().filter(function(e){ return e && !e._erased && e.databaseEnemy; }).forEach(function(e){ if (!ProjectR.FogOfWar.isEventVisible(e)) hidden[e.eventId()] = true; }); var leaks = []; (function walk(o, ok) { if (!o) return; var self = ok && o.visible !== false && o.renderable !== false && (o.worldAlpha === undefined || o.worldAlpha > 0) && (o.alpha === undefined || o.alpha > 0); var e = o._character || o._event; if (e && typeof e.eventId === 'function' && hidden[e.eventId()] && self) leaks.push((o.constructor && o.constructor.name) + ':' + e.eventId()); (o.children || []).forEach(function(ch){ walk(ch, self); }); })(SceneManager._scene, true); return { hidden: Object.keys(hidden), leaks: leaks }; })()`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);

  await check("K1 倒された敵が戸口をふさがない", async () => {
    await enter();
    await door(true);
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(2, 2); $gameMap.event(3).locate(14, 2); $gameMap.event(2).locate(8, 7); 'ok'`); await sleep(400);
    await place(8, 9, 8); await hold("W", 1500);
    const blocked = await json("({ y: $gamePlayer._realY, through: $gameMap.event(2)._through, prio: $gameMap.event(2)._priorityType })");
    rec("K1a 生きている敵が戸口にいる間は、通れない(生きている敵の当たり判定は従来どおり)", blocked.y > 7.9 && blocked.through === false && blocked.prio === 1, JSON.stringify(blocked));
    await kill(2); await sleep(500);
    const dead = await json("(function(){ var e = $gameMap.event(2); return { through: e._through, prio: e._priorityType, hp: $gameMap.getCurrentEventHp(2), erased: e._erased, settled: !!e._projectRFieldSettled, state: ProjectRFieldCombat.getEncounterState().state }; })()");
    rec("K1b 倒れたら、すぐ通り抜け可能になる(消さない・優先度は主人公の下)/ 勝利の判定はまだ(残りの敵がいる)", dead.through === true && dead.prio === 0 && dead.hp <= 0 && dead.erased === false && dead.settled && dead.state === "fighting", JSON.stringify(dead));
    await place(8, 9, 8); await hold("W", 1500);
    const pass = await pos();
    rec("K1c 倒れた敵のいる戸口を通り抜けられる(Hendrix は敵を消さないので、以前は道をふさいでいた)", pass.y < 7, JSON.stringify(pass));
    const others = await json("[1, 3].map(function(id){ var e = $gameMap.event(id); return { through: e._through, prio: e._priorityType }; })");
    rec("K1d 生きているほかの敵は変わらない(通れない・優先度のまま)", others.every(o => o.through === false && o.prio === 1), JSON.stringify(others));
    await kill(1); await kill(3);
    await leave();
    rec("K1e 全員倒すと勝利して元のマップへ戻る(勝利の判定は変わらない)", (await ev("$gameVariables.value(9)")) === 1, "");
  });

  await check("K2 探索済みの地形の描画", async () => {
    await enter();
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1); 'ok'`);
    await door(true); await place(8, 3, 2); await place(8, 8, 8);                    // 北を探索して、南へ戻る
    const visibleSouth = await tilePixel(4, 9);
    await door(false);                                                                 // 扉を閉める(北は視界の外)
    const states = { north: await ev(`${FW}.getTileState(4, 4)`), south: await ev(`${FW}.getTileState(4, 9)`) };
    const north = await tilePixel(4, 4), outside = await tilePixel(-2, 5);
    rec("K2a 探索済み(いまは見えない)の地形は、灰色で、見えている所よりはっきり暗い(0.6倍以下)/ 黒ではない", states.north === "explored" && isGray(north) && lum(north) > 20 && lum(north) <= lum(visibleSouth) * 0.6, JSON.stringify({ states, north, visibleSouth }));
    rec("K2b 見えている所は通常の明るさ / 地図の外・未探索は黒", states.south === "visible" && lum(visibleSouth) > 100 && isBlack(outside), JSON.stringify({ visibleSouth, outside }));
    await door(true);
    const through = await tilePixel(8, 3), side = await tilePixel(4, 4);
    rec("K2c 扉を開けると、視線の通る所(8,3)は通常の明るさに戻り、壁の陰(4,4)は探索済みの暗さのまま", lum(through) > lum(visibleSouth) * 0.85 && lum(side) < lum(visibleSouth) * 0.6, JSON.stringify({ through, side }));
    await door(false);
    // 隠れた敵: 探索済みの暗い所にいても、描かれない(敵がいるときと、いないときで画面が同じ)
    await ev("$gameMap.event(1).locate(4, 4); 'ok'"); await sleep(400);
    const sp = await toScreen(4.5, 4.5);
    const withEnemy = await regionPx(sp.x, sp.y, 40);
    await ev("$gameMap.event(1).locate(1, 1); 'ok'"); await sleep(400);
    const without = await regionPx(sp.x, sp.y, 40);
    const scan = await leakScan();
    rec("K2d 探索済みの暗い所にいる敵は描かれない(周りの画面が敵の有無で同じ)・描画ツリーに漏れなし", diffCount(withEnemy, without) === 0 && scan.leaks.length === 0 && scan.hidden.length >= 1, JSON.stringify({ diff: diffCount(withEnemy, without), scan }));
    await s.shot("fx_K2");
  });

  await check("K3 壁のすぐ近くの主人公", async () => {
    await door(false);
    await ev("$gameMap.event(1).locate(5, 6); 'ok'"); await place(5, 8, 8); await sleep(400);        // 壁(y=7)の真南。敵Aは壁の真北(5,6)で隠れている
    const info = await json("({ sx: $gamePlayer.screenX(), sy: $gamePlayer.screenY() })");
    const lineY = (await toScreen(0, 8)).y;                                           // 壁の近い面(y=8.0)の画面のy
    const probe = async () => regionPx(info.sx, lineY - 36, 28);                    // 壁の面のすぐ上(壁の絵・暗闇にかかる所)で、主人公の頭・体がある所
    await ev(`${FW}.setConfig({ playerOverlay: false }); 'ok'`); await sleep(400);
    const off = await probe();
    await ev(`${FW}.resetConfig(); 'ok'`); await sleep(400);
    const on = await probe();
    rec("K3a 壁のすぐ近くで、主人公の頭・体が重ね描きで見える(PlayerOverlay の有無で、その領域の画面が変わる)", diffCount(on, off) >= 10, JSON.stringify({ diff: diffCount(on, off), samples: on.length }));
    const mirrors = await json("(function(){ var f = SceneManager._scene._spriteset._projectRFog; var keys = Array.from(f.mirrors.keys()); return { count: keys.length, charOnly: keys.every(function(k){ return !k._character || k._character === $gamePlayer; }), events: keys.filter(function(k){ return k._character && k._character !== $gamePlayer; }).length }; })()");
    rec("K3b 重ねるのは主人公(と持っている武器)だけ。敵・イベントは重ねない", mirrors.count >= 1 && mirrors.count <= 3 && mirrors.charOnly && mirrors.events === 0, JSON.stringify(mirrors));
    // 壁の向こうの敵Aは隠れたまま(壁の真北にいても、重ね描きで見えない)
    const spA = await toScreen(5.5, 6.5);
    const a1 = await regionPx(spA.x, spA.y, 36); await ev("$gameMap.event(1).locate(1, 1); 'ok'"); await sleep(400); const a2 = await regionPx(spA.x, spA.y, 36);
    const scan = await leakScan();
    rec("K3c 壁のすぐ向こうの敵(隠れている)は、主人公の重ね描きがあっても見えない(敵の有無で画面が同じ・漏れなし)", diffCount(a1, a2) === 0 && scan.leaks.length === 0 && (await ev(`${FW}.isEventVisible($gameMap.event(1))`)) === false, JSON.stringify({ diff: diffCount(a1, a2), scan }));
    // 壁の衝突・視界の遮り
    await place(5, 9, 8); await hold("W", 1200); const wall = await pos();
    rec("K3d 壁の衝突は変わらない(壁の手前で止まる)/ 視界は壁で遮られたまま(北は見えない)", wall.y > 7.9 && (await ev(`${FW}.getTileState(5, 4)`)) !== "visible", JSON.stringify(wall));
    await s.shot("fx_K3");
  });

  await check("K4 扉の開閉・移動・ロード・繰り返し", async () => {
    // 扉の開閉(F)で視線が切り替わる
    await ev("$gameMap.event(3).locate(8, 3); $gameMap.event(1).locate(2, 2); $gameMap.event(2).locate(14, 2); 'ok'");
    await place(8, 8, 8); await c.pointer(960, 100); await sleep(300);
    await door(false);
    const closed = await ev(`${FW}.isEventVisible($gameMap.event(3))`);
    await c.tap("F"); await sleep(900);
    const open = await json(`({ page: $gameMap.event(5)._pageIndex, vis: ${FW}.isEventVisible($gameMap.event(3)) })`);
    await c.tap("F"); await sleep(900);
    const closedAgain = await json(`({ page: $gameMap.event(5)._pageIndex, vis: ${FW}.isEventVisible($gameMap.event(3)) })`);
    rec("K4a 扉(F)を開くと視線が通って見え、閉じると見えなくなる(戸口で倒した敵がいても、開閉できる)", closed === false && open.page === 1 && open.vis === true && closedAgain.page === 0 && closedAgain.vis === false, JSON.stringify({ closed, open, closedAgain }));
    // 繰り返し: 3回、戸口で倒して勝つ。毎回、敵は新しい(通り抜け不可)・扉は閉
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await enter();
      const fresh = await json("({ door: $gameMap.event(5)._pageIndex, through: [1, 2, 3].map(function(id){ return $gameMap.event(id)._through; }), settled: [1, 2, 3].map(function(id){ return !!$gameMap.event(id)._projectRFieldSettled; }) })");
      await door(true); await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(2, 2); $gameMap.event(3).locate(14, 2); $gameMap.event(2).locate(8, 7); 'ok'`); await sleep(300);
      await kill(2); await sleep(400);
      await place(8, 9, 8); await hold("W", 1300); const p = await pos();
      await kill(1); await kill(3); await leave();
      runs.push({ fresh, passed: p.y < 7, v: await ev("$gameVariables.value(9)") });
    }
    rec("K4b 繰り返しの3回: 毎回、敵・扉は初期状態(通り抜け不可・扉は閉)で始まり、戸口で倒した敵は通り抜けられ、勝利で戻る", runs.every(r => r.fresh.door === 0 && r.fresh.through.every(t => t === false) && r.fresh.settled.every(t => t === false) && r.passed && r.v === 1), JSON.stringify(runs));
    const left = await json(`({ settled: $gameMap.events().filter(function(e){ return e._projectRFieldSettled; }).length, mirrors: SceneManager._scene._spriteset._projectRFog.mirrors.size, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled() })`);
    rec("K4c 探索マップへ戻ったあと、戦闘・敵の状態・重ね描きの余りが残らない(主人公の写しだけ)", left.settled === 0 && left.mirrors <= 3 && !left.active && !left.allowed && left.save, JSON.stringify(left));
    // 探索記憶: Map008 の記憶が残り、次の戦闘でも探索済みの暗さで描かれる
    await enter(); await door(false); await place(8, 9, 8);
    const mem = { state: await ev(`${FW}.getTileState(4, 4)`), px: await tilePixel(4, 4), south: await tilePixel(4, 9) };
    rec("K4d 2回目以降の戦闘でも、前に見た北側は探索済み(灰色・暗い)で描かれる", mem.state === "explored" && isGray(mem.px) && lum(mem.px) > 20 && lum(mem.px) <= lum(mem.south) * 0.6, JSON.stringify(mem));
    // 敗北 → ロード(タイトル経由)
    await ev("$gamePlayer.locate(24, 22); 'ok'");
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    await ev("window.__base = JsonEx.stringify(DataManager.makeSaveContents()); 'ok'");
    await enter(); await ev("$gameParty.leader().setHp(0); 'ok'"); await sleep(2500);
    const d = await json(`({ map: $gameMap.mapId(), st: ${FC}.getEncounterState().state, save: $gameSystem.isSaveEnabled() })`);
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("DataManager.extractSaveContents(JsonEx.parse(window.__base)); SceneManager.goto(Scene_Map); 'ok'"); await waitMap(1); await sleep(1200);
    const l = await json(`({ st: ${FC}.getEncounterState().state, active: ${FC}.isActive(), save: $gameSystem.isSaveEnabled(), m8: ${FW}.getExploredCount(8), mirrors: SceneManager._scene._spriteset._projectRFog.mirrors.size })`);
    rec("K4e 敗北 → ロード: 敗北は自動で戻らずセーブ禁止 / ロード後は初期状態・探索の記憶は保存時点・重ね描きの余りなし", d.map === 8 && d.st === "defeat" && d.save === false && l.st === "idle" && !l.active && l.save && l.m8 > 20 && l.mirrors <= 3, JSON.stringify({ d, l }));
  });

  await check("K5 性能・エラー・保存", async () => {
    await enter(); await door(false); await place(8, 9, 8);
    const measure = async overlay => {
      await ev(`${FW}.setConfig({ playerOverlay: ${overlay} }); 'ok'`);
      await ev("(function(){ var sp = SceneManager._scene._spriteset; sp.__orig = sp.update; window.__ms = []; sp.update = function(){ var t = performance.now(); var r = sp.__orig.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(1300); await c.keyUp("A"); await c.keyDown("D"); await sleep(1300); await c.keyUp("D");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ var sp = SceneManager._scene._spriteset; sp.update = sp.__orig; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(2), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2) }; })()");
      await place(8, 9, 8);
      return { overlay, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const withOverlay = await measure(true), without = await measure(false);
    await ev(`${FW}.resetConfig(); 'ok'`);
    rec("K5a 重ね描きの増加は小さい(1フレームの更新時間の増加 < 0.8ms)/ 約60fps", withOverlay.fps > 52 && withOverlay.avgMs - without.avgMs < 0.8, JSON.stringify({ withOverlay, without }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("K5b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_fixes_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
