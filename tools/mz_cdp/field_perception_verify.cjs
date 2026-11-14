// 敵の視界(距離・視野角・壁/閉じた扉)と、未探索の完全な黒の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   P1 閉じた扉・壁は敵の視線を遮る(追わない・攻撃しない)/ 開いた扉は通す(追う)
//   P2 見失うとすぐ止まる・プレイヤーの位置を追わない(探さない)/ 視線が戻ると、また見つけて追う
//   P3 視界の距離・視野角(敵ごとの設定も)/ 見つけたあとはプレイヤーの方を向く
//   P4 敵の視界は、プレイヤーの霧と無関係 / 従来の攻撃・追跡の設定(EnemyPerception=false)は変わらない
//   F1 未探索は、移動中・扉の開閉中・武器の重ね描き・神の演出中も、完全な黒(縁のぼかしの有無にかかわらず)
//   P5 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_perception_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FW = "ProjectR.FogOfWar";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep, aim } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'pc', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1000); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  // 敵1だけ使う(2・3 は遠くへ離して、行動をつけたまま動かさない=視界の外)。敵1は (x, y)・向き dir・オプション
  const setEnemy = async (x, y, dir, opts) => { await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(1, 1); var e = $gameMap.event(1); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; e.setDirection(${dir}); ${FC}.attachEnemy(1, ${JSON.stringify(opts || {})}); 'ok'`); await sleep(150); };
  const ep = () => json(`${FC}.getEnemyPerception(1)`);
  const epos = () => json("({ x: $gameMap.event(1)._realX, y: $gameMap.event(1)._realY, d: $gameMap.event(1).direction() })");
  const moved = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(120); };
  const decodePng = buf => { let off = 8, width = 0, height = 0, ctype = 0; const idat = []; while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; } const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } } return { width, height, bpp, data: out }; };
  const viewport = () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const grab = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); const png = decodePng(Buffer.from(r.data, "base64")), m = await viewport(); return (sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; }; };
  // 未探索で、視界の多角形から 3px 以上外で、見えている壁のマスでもない所の、画面の点(マップの範囲の中だけ。HUD の外)を、ページの中で数える
  const unexploredSamples = `(function(step){ var l = SceneManager._scene._spriteset._projectRVisionLayer, v = l.visibility; if (!v) return null; var m = $gameMap, tw = m.tileWidth(), th = m.tileHeight(), dx = m.displayX(), dy = m.displayY(); var pts = v.points.map(function(p){ return { x: (p.x - dx) * tw, y: (p.y - dy) * th }; }); var wall = v.visibleRegionTiles || new Set(); var x0 = (0 - dx) * tw + 4, x1 = (m.width() - dx) * tw - 4, y0 = (0 - dy) * th + 4, y1 = (m.height() - dy) * th - 4;
      function inside(px, py) { var r = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) r = !r; } return r; }
      function dist(px, py) { var best = 1e9; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j], ex = b.x - a.x, ey = b.y - a.y, t = ((px - a.x) * ex + (py - a.y) * ey) / (ex * ex + ey * ey || 1); t = Math.max(0, Math.min(1, t)); best = Math.min(best, Math.hypot(px - (a.x + t * ex), py - (a.y + t * ey))); } return best; }
      // 設計どおりに、壁・扉の絵が自分のマスの外へはみ出して見える部分(VisionOcclusion の「保持」: <VisionWall>/<VisionKeepVisible> のイベントの絵。例: 扉の上の弧)は、未探索の漏れに数えない
      var keepRects = []; (v.visibleKeepEvents ? Array.from(v.visibleKeepEvents) : []).forEach(function(id){ var e = $gameMap.event(id); var sp = e && SceneManager._scene._spriteset._tilemap.children.filter(function(c){ return c._character === e; })[0]; if (sp) { var b = sp.getBounds(); keepRects.push([b.x - 3, b.y - 3, b.x + b.width + 3, b.y + b.height + 3]); } });
      function inKeep(px, py) { return keepRects.some(function(r){ return px >= r[0] && px <= r[2] && py >= r[1] && py <= r[3]; }); }
      var out = []; for (var y = Math.max(y0, 0); y < Math.min(y1, Graphics.height); y += step) for (var x = Math.max(x0, 0); x < Math.min(x1, Graphics.width); x += step) { var tx = Math.floor(x / tw + dx), ty = Math.floor(y / th + dy); if (ProjectR.FogOfWar.getTileState(tx, ty) !== 'unexplored') continue; if (wall.has(tx + ',' + ty)) continue; if (inside(x, y) || dist(x, y) < 3 || inKeep(x, y)) continue; out.push([x, y]); } return { sig: pts.length + ':' + pts.slice(0, 3).map(function(p){ return Math.round(p.x) + ',' + Math.round(p.y); }).join(';') + ':' + dx + ',' + dy, pts: out }; })`;
  const leakCheck = async (step = 8) => {
    const a = await json(`${unexploredSamples}(${step})`); if (!a) return { skipped: true };
    const pix = await grab();
    const b = await json(`${unexploredSamples}(${step})`);
    if (!b || a.sig !== b.sig) return { skipped: true };                                           // 撮影中に視界が変わった(未探索は増えない = 探索済みは減らない ので、a ∩ b を使う)
    const set = new Set(b.pts.map(p => p.join(","))); let bad = 0, worst = 0; const samples = [];
    for (const p of a.pts) { if (!set.has(p.join(","))) continue; const px = pix(p[0], p[1]); const mx = Math.max(px[0], px[1], px[2]); if (mx > 3) { bad++; worst = Math.max(worst, mx); if (samples.length < 4) samples.push([p, px]); } }
    return { skipped: false, n: a.pts.length, bad, worst, samples };
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);

  await check("P1 壁・扉と視線", async () => {
    await enter();
    const def = await json(`${FC}.getPerception()`);
    rec("P0 既定: 敵の視界が有効・距離 10 tile・視野角 140°", def.enabled === true && def.sightTiles === 10 && def.fovDegrees === 140, JSON.stringify(def));
    await door(false); await place(8, 9, 8);
    await setEnemy(8, 3, 2); const p0 = await epos(); await sleep(2200);
    const closed = await ep(), p1 = await epos();
    rec("P1a 閉じた扉(壁)の向こうの敵は、プレイヤーを追わない・見つけない(従来は壁際まで追っていた)", moved(p0, p1) < 0.02 && closed.aware === false && closed.reason === "blocked" && closed.acquired === 0, JSON.stringify({ p0, p1, closed }));
    await door(true); await sleep(500);
    const open = await ep(), p2 = await epos(); await sleep(1000); const p3 = await epos();
    rec("P1b 扉を開けると視線が通り、敵は見つけて、プレイヤーの方(南)を向いて追う", open.aware === true && open.acquired === 1 && p3.y > p2.y + 0.5 && p3.d === 2, JSON.stringify({ open, p2, p3 }));
  });

  await check("P2 見失う・再び見つける", async () => {
    // 追っている最中に扉を閉める → すぐ止まる
    await door(true); await place(8, 9, 8); await setEnemy(8, 3, 2); await sleep(900);
    const chasing = await json(`(function(){ var e = $gameMap.event(1), p0 = e._realY; return p0; })()`);
    await ev("window.__tr = []; (function(){ var o = Game_Map.prototype.update; Game_Map.prototype.update = function(){ var r = o.apply(this, arguments); var e = $gameMap.event(1); if (window.__tr && window.__on) window.__tr.push([e._realX, e._realY, ProjectRFieldCombat.getEnemyPerception(1).aware]); return r; }; window.__origGMU = o; })(); window.__on = true; 'ok'");
    await door(false);                                                                               // 閉じる(その場で視線が切れる)
    await sleep(1500);
    await ev("window.__on = false; Game_Map.prototype.update = window.__origGMU; 'ok'");
    const tr = await json("window.__tr"); const lost = await ep();
    let stopAt = -1; for (let i = 0; i < tr.length; i++) if (!tr[i][2]) { stopAt = i; break; }
    const after = tr.slice(Math.max(0, stopAt) + 2); const drift = after.length ? Math.max(...after.map(r => Math.hypot(r[0] - after[0][0], r[1] - after[0][1]))) : 99;
    rec("P2a 扉を閉めて視線が切れると、その場ですぐ(数フレーム以内に)止まる・気づいていない状態になる・見失った回数が増える", stopAt >= 0 && stopAt <= 3 && drift < 0.02 && lost.aware === false && lost.losses === 1 && lost.reason === "blocked", JSON.stringify({ chasing, stopAt, drift: +drift.toFixed(4), lost, frames: tr.length }));
    // 見失っている間、プレイヤーが動いても、敵は(隠れたプレイヤーの位置へ)動かない
    const e0 = await epos(); const path = [];
    for (const [x, y] of [[3, 9], [13, 10], [8, 11], [2, 8], [8, 9]]) { await place(x, y, 8); await sleep(700); path.push(moved(e0, await epos())); }
    rec("P2b 見失っている間は、プレイヤーがどこへ動いても、敵は動かない・向きも変えない(プレイヤーの位置を追跡しない)", Math.max(...path) < 0.02 && (await epos()).d === e0.d, JSON.stringify({ e0, path: path.map(v => +v.toFixed(4)) }));
    // 扉を開けても、視線が通らない位置(壁の陰)では、見つけない。視線が通る位置へ戻ると、また見つけて追う
    await place(3, 9, 8); await door(true); await sleep(900);
    const side = await ep(), e1 = await epos();
    rec("P2c 扉を開けても、壁の陰(視線が通らない位置)のプレイヤーは見つけない・動かない", side.aware === false && side.reason === "blocked" && moved(e0, e1) < 0.02, JSON.stringify({ side, e0, e1 }));
    await place(8, 9, 8); await sleep(900);
    const back = await ep(), e2 = await epos(); await sleep(700); const e3 = await epos();
    rec("P2d 視線が通る位置へ戻ると、また見つけて(acquired が増える)追い始める(見失っていた位置 y≈4.97 から、戸口まで進む)", back.aware === true && back.acquired === 2 && e2.y > e0.y + 1 && e3.y >= e2.y, JSON.stringify({ back, e2, e3 }));
  });

  await check("P3 距離・視野角", async () => {
    await door(true); await place(8, 9, 8);
    await ev(`${FC}.resetPerception(); 'ok'`);
    await ev(`${FC}.setPerception({ sightTiles: 3 }); 'ok'`); await setEnemy(8, 3, 2); await sleep(900);
    const near = await ep(), p0 = await epos();
    rec("P3a 視界の距離(3 tile)より遠い敵(距離6)は見つけない・動かない", near.aware === false && near.reason === "range" && near.sightTiles === 3 && moved(p0, await epos()) < 0.02, JSON.stringify({ near, p0 }));
    await ev(`${FC}.setPerception({ sightTiles: 10 }); 'ok'`); await sleep(700);
    const far = await ep(); rec("P3b 距離を戻す(10)と見つけて追う", far.aware === true && far.sightTiles === 10, JSON.stringify(far));
    // 視野角: 背中を向けている敵は、視線が通る・距離内でも見つけない
    await setEnemy(8, 3, 8); await sleep(900);
    const behind = await ep(); const pb = await epos();
    rec("P3c 敵が北向き(プレイヤーは南)だと、視野角 140° の外なので見つけない・動かない(視線・距離は条件を満たす)", behind.aware === false && behind.reason === "fov" && behind.facing === 0 && behind.canSeeNow === false, JSON.stringify({ behind, pb }));
    await ev("$gameMap.event(1).setDirection(2); 'ok'"); await sleep(500);
    const faced = await ep(); rec("P3d 敵がプレイヤーの方(南)を向くと、見つけて追う", faced.aware === true, JSON.stringify(faced));
    await ev("$gameMap.event(1).setDirection(8); 'ok'"); await sleep(400);
    const keep = await ep(); rec("P3e 見つけたあとは向きを変えても追跡を続ける(プレイヤーの方を向き直す)", keep.aware === true && (await epos()).d === 2, JSON.stringify({ keep, e: await epos() }));
    // 敵ごとの設定(<fieldEnemy: sight=, fov=> / attachEnemy のオプション)は、プラグインパラメータに優先する
    await setEnemy(8, 3, 8, { sightTiles: 12, fovDegrees: 360 }); await ev(`${FC}.setPerception({ sightTiles: 2, fovDegrees: 30 }); 'ok'`); await sleep(900);
    const own = await ep();
    rec("P3f 敵ごとの視界(距離 12・視野角 360°)は、全体の設定(2 tile・30°)に上書きされない。背を向けていても全周で見つける", own.sightTiles === 12 && own.fovDegrees === 360 && own.aware === true, JSON.stringify(own));
    await ev(`${FC}.resetPerception(); 'ok'`);
  });

  await check("P4 霧と無関係・従来の設定", async () => {
    await door(true); await place(8, 9, 8); await setEnemy(8, 3, 2); await ev(`${FC}.resetPerception(); 'ok'`);
    // プレイヤーの霧が「敵はいない・見えない」と答えても、敵はプレイヤーを見つける・追う
    await ev(`window.__fogOrig = { e: ${FW}.isEventVisible, p: ${FW}.isPointVisible, t: ${FW}.getTileState }; ${FW}.isEventVisible = function(){ return false; }; ${FW}.isPointVisible = function(){ return false; }; ${FW}.getTileState = function(){ return 'unexplored'; }; 'ok'`);
    await sleep(800); const p = await ep(), a = await epos(); await sleep(700); const b = await epos();
    await ev(`${FW}.isEventVisible = window.__fogOrig.e; ${FW}.isPointVisible = window.__fogOrig.p; ${FW}.getTileState = window.__fogOrig.t; 'ok'`);
    rec("P4a プレイヤーの霧が敵を見えない・マスを未探索と答えても、敵の視界は変わらない(見つけて追う)", p.aware === true && b.y > a.y + 0.2, JSON.stringify({ p, a, b }));
    // 従来(EnemyPerception=false): 壁越しでも距離内なら追う
    await door(false); await place(8, 9, 8); await setEnemy(8, 3, 2, { aggroTiles: 10 }); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); await sleep(2500);
    const legacy = await epos();
    rec("P4b EnemyPerception を切ると従来どおり(閉じた扉の向こうから、壁際まで追ってくる)", legacy.y > 5, JSON.stringify(legacy));
    await ev(`${FC}.resetPerception(); 'ok'`);
    // 攻撃: 閉じた扉越しの攻撃はしない(届く距離でも)。見えれば攻撃する(従来の攻撃のルール)
    await setEnemy(8, 5, 2, { reach: 4, windupFrames: 20, cooldownFrames: 30 }); await door(false); await place(8, 8, 8); await sleep(2500);
    const noAtk = await json(`(function(){ var b = ${FC}.getState().enemies.filter(function(x){ return x.eventId === 1; })[0]; return { attacks: b && b.attacks, state: b && b.state }; })()`);
    rec("P4c 閉じた扉越しは、届く距離(4)でも攻撃しない(見えていないので)", noAtk.attacks === 0 && noAtk.state !== "windup", JSON.stringify(noAtk));
    await door(true); await sleep(2500);
    const atk = await json(`(function(){ var b = ${FC}.getState().enemies.filter(function(x){ return x.eventId === 1; })[0]; return { attacks: b && b.attacks }; })()`);
    rec("P4d 扉を開けて見えると、従来どおり溜めて攻撃する(攻撃の回数が増える)", atk.attacks >= 1, JSON.stringify(atk));
  });

  await check("F1 未探索は完全な黒", async () => {
    await ev(`${FC}.resetPerception(); ${FW}.resetConfig(); ${FW}.clearExplored(); 'ok'`);
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(5, 3); $gameMap.event(2).locate(11, 3); $gameMap.event(3).locate(3, 5); 'ok'`);
    await door(false); await place(8, 9, 8); await sleep(500);
    const r = [];
    const run = async (label, n = 1) => { for (let i = 0; i < n; i++) { const k = await leakCheck(); r.push({ label, ...k }); } };
    await run("静止(扉:閉)", 2);
    await door(true); await sleep(400); await run("静止(扉:開)", 2);
    // 縁のぼかしなし(硬い縁)でも
    await ev(`${FW}.setConfig({ feather: 0 }); 'ok'`); await sleep(500);
    const h = []; for (let i = 0; i < 3; i++) h.push(await leakCheck());
    await ev(`${FW}.resetConfig(); 'ok'`); await sleep(500);
    // 移動中 + 扉の開閉(10回)
    await c.keyDown("A");
    for (let i = 0; i < 6; i++) { await door(i % 2 === 0); await run("移動中・扉の開閉"); }
    await c.keyUp("A"); await c.keyDown("D");
    for (let i = 0; i < 6; i++) { await door(i % 2 === 1); await run("移動中・扉の開閉"); }
    await c.keyUp("D"); await sleep(300);
    // 壁のすぐ近くで、武器(銃)を壁・未探索へ向ける(重ね描き)
    await door(false); await place(8, 8, 8); await aim(0, -4); await sleep(500); await run("壁際・銃を北(未探索)へ", 3);
    await place(4, 8, 8); await aim(0, -4); await sleep(500); await run("壁際・銃を北(未探索)へ(西)", 2);
    await place(1, 8, 8); await aim(-4, 0); await sleep(500); await run("左端の壁際・銃を西へ", 2);
    // 神の演出中
    await place(8, 8, 8); await aim(0, -4); await sleep(400); await ev(`${FC}.useAbility('special', 'test'); 'ok'`);
    for (let i = 0; i < 6; i++) { await sleep(120); await run("神の演出中(一閃)"); }
    await door(true); await sleep(300); await place(8, 9, 8); await ev(`${FC}.useAbility('mobility', 'test'); 'ok'`);
    for (let i = 0; i < 4; i++) { await sleep(150); await run("神の演出中(絶)"); }
    const used = r.filter(x => !x.skipped), bad = used.reduce((n, x) => n + x.bad, 0), pts = used.reduce((n, x) => n + x.n, 0), worst = Math.max(0, ...used.map(x => x.worst));
    rec("F1a 未探索の点(" + pts + " 点・" + used.length + " 回の撮影)が、静止・移動中・扉の開閉・銃の重ね描き・神の演出中のすべてで、完全な黒(各色 ≤ 3)", used.length >= 25 && pts > 5000 && bad === 0, JSON.stringify({ shots: used.length, skipped: r.length - used.length, points: pts, bad, worst, byLabel: Object.fromEntries([...new Set(used.map(x => x.label))].map(l => [l, used.filter(x => x.label === l).reduce((n, x) => n + x.bad, 0)])), first: used.find(x => x.bad)?.samples }));
    await s.shot("pc_F1");
    const hu = h.filter(x => !x.skipped);
    rec("F1b FeatherPixels=0(硬い縁)でも、未探索は完全な黒", hu.length >= 2 && hu.every(x => x.bad === 0 && x.n > 1000), JSON.stringify(h));
    // 暗闇の濃さ(DarknessOpacity)が 1 未満でも、未探索は黒(記憶を使うとき)
    await ev(`${FW}.clearExplored(); (function(){ var l = SceneManager._scene._spriteset._projectRVisionLayer; l.dark.alpha = 0.5; return 'ok'; })()`); await sleep(500);
    const o = await leakCheck(); rec("F1c 元の暗闇の濃さが 0.5 に下がっても、未探索は完全な黒", !o.skipped && o.bad === 0 && o.n > 1000, JSON.stringify(o));
    // 探索済み(灰色)・見えている(通常の色)は保たれる
    const keep = await json(`({ state: ${FW}.getTileState(8, 9), explored: ${FW}.getExploredCount(), cfg: ${FW}.getConfig() })`);
    rec("F1d 探索済みの灰色・見えている通常の色・縁のぼかし(6px)の設定は保たれる", keep.state === "visible" && keep.explored > 20 && keep.cfg.feather === 6 && keep.cfg.grayscale === true && keep.cfg.memoryOpacity === 0.45, JSON.stringify(keep));
  });

  await check("P5 性能・エラー・保存", async () => {
    await ev(`${FC}.resetPerception(); 'ok'`); await door(true); await place(8, 9, 8);
    await ev(`${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(4, 3); $gameMap.event(2).locate(12, 3); $gameMap.event(3).locate(8, 2); ${FC}.attachEnemy(1); ${FC}.attachEnemy(2); ${FC}.attachEnemy(3); 'ok'`);
    const measure = async enabled => {
      await ev(`${FC}.setPerception({ enabled: ${enabled} }); 'ok'`);
      await ev("(function(){ var o = Game_Map.prototype.update; window.__ms = []; window.__origGM = o; Game_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(900); await c.keyUp("A"); await c.keyDown("D"); await sleep(900); await c.keyUp("D");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Game_Map.prototype.update = window.__origGM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3) }; })()");
      await place(8, 9, 8);
      return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const on = await measure(true), off = await measure(false);
    await ev(`${FC}.resetPerception(); 'ok'`);
    rec("P5a 敵3体の視界の負荷は小さい(Game_Map.update の増加 < 0.6ms)/ 約60fps", on.fps > 52 && on.avgMs - off.avgMs < 0.6, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("P5b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_perception_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
