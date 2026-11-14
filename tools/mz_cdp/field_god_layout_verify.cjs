// 神の同行の「見た目」(実際のスプライトの大きさ・基準点・描く順番・絵の重なり)の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   GL1 8方向(マウス照準)で、神の絵とプレイヤーの絵が(透明でない画素で)重ならない・神がプレイヤーの前に描かれない
//   GL2 神のスプライトの寸法・基準点・描く順番(優先度・z)の実測 / 神が南側でも、プレイヤーの足元の下に収まる
//   GL3 歩きながら・向きを変えながら: 重なり・神の消えるフレームがない
//   GL4 一閃・絶の繰り返し: 同じ神は常に1体 / 演出の前後で重なりがない
//   GL5 エンカウンターの片づけ・場所移動の繰り返し
//   GL6 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_god_layout_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FF = "ProjectRFieldFacing", GC = "ProjectRFieldGodCompanion", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'gl', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const park = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  const hold = async (keys, ms) => { for (const k of keys) await c.keyDown(k); await sleep(ms); for (const k of keys) await c.keyUp(k); await sleep(150); };
  const aimDeg = async (deg, r = 300) => { const p = await json("(function(){ var c = $gamePlayer.centerPositionPoint(); return { x: $gameMap.adjustX(c.x) * 48, y: $gameMap.adjustY(c.y) * 48 }; })()"); const rad = deg * Math.PI / 180; await c.pointer(Math.round(p.x + Math.sin(rad) * r), Math.round(p.y - Math.cos(rad) * r)); await sleep(900); };
  const DIRS = [[0, "N"], [45, "NE"], [90, "E"], [135, "SE"], [180, "S"], [225, "SW"], [270, "W"], [315, "NW"]];
  const decodePng = buf => { let off = 8, width = 0, height = 0, ctype = 0; const idat = []; while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; } const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } } return { width, height, bpp, data: out }; };
  const viewport = () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const grab = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); const png = decodePng(Buffer.from(r.data, "base64")), m = await viewport(); return (sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; }; };
  // 神のスプライトと、主人公に結びつくスプライト(本体・武器・影など)の、いまの寸法・基準点・位置・優先度
  const SPR = `(function(){ var sp = SceneManager._scene._spriteset, ts = sp._tilemap, pl = ts.children.filter(function(c){ return c._character === $gamePlayer; })[0], vs = ProjectRGodSummonVisual.getVisuals().filter(function(v){ return v.kind === 'persistent'; }), ge = vs.length ? $gameMap.event(vs[0].eventId) : null, gs = ge ? ts.children.filter(function(c){ return c._character === ge; })[0] : null; var info = function(o){ if (!o) return null; var b = o.getBounds(); return { x: +o.x.toFixed(1), y: +o.y.toFixed(1), w: o.width, h: o.height, ax: o.anchor ? o.anchor.x : null, ay: o.anchor ? o.anchor.y : null, z: o.z, zIndex: o.zIndex, bx: +b.x.toFixed(1), by: +b.y.toFixed(1), bw: +b.width.toFixed(1), bh: +b.height.toFixed(1), vis: o.visible, ren: o.renderable }; }; return { player: info(pl), god: info(gs), godEvent: ge && { rx: ge._realX, ry: ge._realY, prio: ge._priorityType, through: ge._through, char: ge._characterName, idx: ge._characterIndex }, playerEvent: { rx: $gamePlayer._realX, ry: $gamePlayer._realY, prio: $gamePlayer._priorityType } }; })()`;
  // 描画の寸法を、透明でない画素で測る: 神だけ・主人公だけを隠した画面から、それぞれの「絵の画素」の集合を作り、重なる画素を数える
  const hideSets = `(function(){ var sp = SceneManager._scene._spriteset, ts = sp._tilemap, pl = ts.children.filter(function(c){ return c._character === $gamePlayer; })[0], vs = ProjectRGodSummonVisual.getVisuals().filter(function(v){ return v.kind === 'persistent'; }), ge = $gameMap.event(vs[0].eventId); window.__sets = { god: ts.children.filter(function(c){ return c._character === ge; }), player: ts.children.filter(function(c){ return c._character === $gamePlayer || (!c._character && !c._event && c.bitmap && Math.abs(c.x - pl.x) <= 110 && Math.abs(c.y - pl.y) <= 110); }), overlay: sp._projectRFog.overlay }; return { god: window.__sets.god.length, player: window.__sets.player.length }; })()`;
  const setHidden = (which, hidden) => ev(`(function(){ var S = window.__sets; var list = ${JSON.stringify(which)} === 'god' ? S.god : S.player; list.forEach(function(c){ if (${hidden}) { c.__r = c.renderable; c.renderable = false; c.__v = c.visible; c.visible = false; c.__u = c.update; c.update = function(){}; } else { c.renderable = c.__r !== undefined ? c.__r : true; c.visible = c.__v !== undefined ? c.__v : true; if (c.__u) { c.update = c.__u; c.__u = undefined; } } }); ${JSON.stringify(which)} === 'player' && (S.overlay.visible = !${hidden}); return 'ok'; })()`);
  const measureOverlap = async () => {
    const info = await json(SPR); await json(hideSets);
    const rect = { x: Math.round(Math.min(info.player.bx, info.god.bx) - 12), y: Math.round(Math.min(info.player.by, info.god.by) - 12), w: Math.round(Math.max(info.player.bx + info.player.bw, info.god.bx + info.god.bw) - Math.min(info.player.bx, info.god.bx) + 24), h: Math.round(Math.max(info.player.by + info.player.bh, info.god.by + info.god.bh) - Math.min(info.player.by, info.god.by) + 24) };
    const N = async () => { await setHidden("god", true); await setHidden("player", true); await sleep(170); const g = await grab(); await setHidden("god", false); await setHidden("player", false); await sleep(120); return g; };
    const onlyGod = async () => { await setHidden("player", true); await sleep(170); const g = await grab(); await setHidden("player", false); await sleep(120); return g; };
    const onlyPlayer = async () => { await setHidden("god", true); await sleep(170); const g = await grab(); await setHidden("god", false); await sleep(120); return g; };
    const pn = await N(), pg = await onlyGod(), pp = await onlyPlayer(), pa = await grab();
    const differs = (a, b) => Math.abs(a[0] - b[0]) > 24 || Math.abs(a[1] - b[1]) > 24 || Math.abs(a[2] - b[2]) > 24;
    let gPix = 0, pPix = 0, both = 0, godCovered = 0, gx0 = 1e9, gx1 = -1, gy0 = 1e9, gy1 = -1, px0 = 1e9, px1 = -1, py0 = 1e9, py1 = -1;
    for (let y = rect.y; y < rect.y + rect.h; y += 1) for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      const n = pn(x, y), isG = differs(pg(x, y), n), isP = differs(pp(x, y), n);
      if (isG) { gPix++; gx0 = Math.min(gx0, x); gx1 = Math.max(gx1, x); gy0 = Math.min(gy0, y); gy1 = Math.max(gy1, y); }
      if (isP) { pPix++; px0 = Math.min(px0, x); px1 = Math.max(px1, x); py0 = Math.min(py0, y); py1 = Math.max(py1, y); }
      if (isG && isP) { both++; if (differs(pa(x, y), pg(x, y))) godCovered++; }       // 重なる画素のうち、実際の画面で、主人公の絵が神の絵を覆っているもの(= 神が主人公の後ろ)
    }
    return { info, gPix, pPix, both, godCovered, god: [gx0, gy0, gx1, gy1], player: [px0, py0, px1, py1] };
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);

  await check("GL1 8方向の絵の重なり", async () => {
    await enter(); await ev(`${park} 'ok'`); await ev(`$gameSelfSwitches.setValue([8, 5, 'A'], false); 'ok'`); await place(8, 3.6, 8);                    // 北の部屋(縦 6 マス)の中ほど: 北向きで神が 2 マス下・南向きで 2 マス上でも、壁に入らない
    const rows = [];
    for (const [deg, name] of DIRS) {
      // 神が上下に約 2 マス離れるので、壁(上下の壁の上層タイルが、優先度 0 の神を隠す)に入らない行で測る: 神が南側になる向き(N/NE/NW)は上寄り、北側になる向き(S/SE/SW)は下寄り
      await place(8, [0, 45, 315].includes(deg) ? 3.3 : [135, 180, 225].includes(deg) ? 4.9 : 4.1, 8); await aimDeg(deg); const m = await measureOverlap(); const i = m.info;
      rows.push({ name, godPix: m.gPix, playerPix: m.pPix, overlapPix: m.both, godBehind: m.both ? +(m.godCovered / m.both).toFixed(2) : null, godBox: m.god, playerBox: m.player, gSprite: i.god && [i.god.w, i.god.h, i.god.ay], pSprite: i.player && [i.player.w, i.player.h, i.player.ay], godPrio: i.godEvent.prio, godZ: i.god && i.god.z, playerZ: i.player && i.player.z, dy: +(i.godEvent.ry - i.playerEvent.ry).toFixed(2), dx: +(i.godEvent.rx - i.playerEvent.rx).toFixed(2) });
      if (deg === 0) await s.shot("gl_N");
    }
    console.log("ROWS", JSON.stringify(rows));
    rec("GL1a 8方向すべてで、神の絵と主人公の絵が、透明でない画素で重ならない(重なり 0 画素・または神の絵の 3% 以下)", rows.every(r => r.godPix > 1500 && r.overlapPix <= Math.max(2, r.godPix * 0.03)), JSON.stringify(rows.map(r => [r.name, r.godPix, r.overlapPix, r.godBehind])));
    const north = rows[0];
    rec("GL1b 北向き(神が南側)で、神の絵の上端が、主人公の足の下端(靴の底)より下にある(神の絵が足・脚にかからない)", north.godBox[1] >= north.playerBox[3] - 1, JSON.stringify({ godTop: north.godBox[1], playerBottom: north.playerBox[3], gap: north.godBox[1] - north.playerBox[3] }));
    const south = rows[4];
    rec("GL1b2 南向き(神が北側)で、神の絵の下端が、主人公の頭の上端より上にある(神の絵が頭にかからない)", south.godBox[3] <= south.playerBox[1] + 1, JSON.stringify({ godBottom: south.godBox[3], playerTop: south.playerBox[1], gap: south.playerBox[1] - south.godBox[3] }));
    rec("GL1c 神は、主人公・ほかのキャラクターの下(優先度 0)に描かれ、重なる画素があっても、主人公の絵が神の絵を覆う(神が前に来ない)", rows.every(r => r.godPrio === 0 && (r.overlapPix === 0 || (r.godBehind !== null && r.godBehind >= 0.9))), JSON.stringify(rows.map(r => [r.name, r.godPrio, r.godZ, r.playerZ, r.godBehind])));
  });

  await check("GL2 スプライトの実測", async () => {
    await place(8, 3.6, 8); await aimDeg(0); const info = await json(SPR);
    rec("GL2a 神のスプライト: 基準点 (0.5, 1)(足元)・寸法・優先度 0・すり抜け(当たり判定なし)・表示中", !!info.god && info.god.ax === 0.5 && info.god.ay === 1 && info.godEvent.prio === 0 && info.godEvent.through === true && info.god.vis !== false && info.god.ren !== false && info.godEvent.char, JSON.stringify(info));
  });

  await check("GL3 歩き・向きの変更中", async () => {
    await place(8, 10, 8); await aimDeg(0);
    const frames = []; const rec0 = () => ev(`(function(){ if (!window.__gl) { window.__gl = { on: false, f: [] }; var o = Spriteset_Map.prototype.update; Spriteset_Map.prototype.update = function(){ var r = o.apply(this, arguments); if (window.__gl.on) { try { var ts = SceneManager._scene._spriteset._tilemap, pl = ts.children.filter(function(c){ return c._character === $gamePlayer; })[0], gs = ts.children.filter(function(c){ return c._character && c._character.event && /projectRGodVisual/.test((c._character.event() || {}).note || '') && !c._character._transparent && c._character._characterName; }); var gb = gs.length ? gs[0].getBounds() : null, pb = pl.getBounds(); window.__gl.f.push({ n: gs.length, gTop: gb ? gb.y : null, gBottom: gb ? gb.y + gb.height : null, gx: gb ? gb.x + gb.width / 2 : null, pBottom: pb.y + pb.height, prio: gs.length ? gs[0]._character._priorityType : null }); } catch (e) {} } return r; }; } window.__gl.f = []; window.__gl.on = true; return 'ok'; })()`);
    await rec0();
    await c.keyDown("D"); for (const d of [0, 90, 180, 270, 0]) await aimDeg(d, 250); await c.keyUp("D"); await c.keyDown("A"); for (const d of [45, 135, 225, 315]) await aimDeg(d, 250); await c.keyUp("A");
    const f = await json("window.__gl.f"); await ev("window.__gl.on = false; 'ok'");
    const gaps = f.filter(r => r.n === 0).length, multi = f.filter(r => r.n > 1).length;
    rec("GL3a 歩きながら向きを一周させても(" + f.length + " フレーム)、見える神は毎フレーム 1 体(消えない・2 体にならない)・優先度は常に 0", f.length > 300 && gaps === 0 && multi === 0 && f.every(r => r.prio === 0), JSON.stringify({ frames: f.length, gaps, multi }));
  });

  await check("GL4 スキルの繰り返し", async () => {
    await place(8, 3.6, 8); await aimDeg(0, 200);
    const rows = []; await ev("window.__gl.f = []; window.__gl.on = true; 'ok'");
    for (let i = 0; i < 2; i++) { await json(`${FC}.useAbility('special', 'test')`); await sleep(1500); rows.push(await measureOverlapSafe()); await sleep(i < 1 ? 6200 : 1500); }
    for (let i = 0; i < 3; i++) { await json(`${FC}.useAbility('mobility', 'test')`); await sleep(500); rows.push(await measureOverlapSafe()); await sleep(2800); await place(8, 4, 8); await aimDeg(i % 2 ? 135 : 225, 140); }
    const f = await json("window.__gl.f"); await ev("window.__gl.on = false; 'ok'");
    const gaps = f.filter(r => r.n === 0).length, multi = f.filter(r => r.n > 1).length;
    rec("GL4a 一閃×2・絶×3 を繰り返す間(" + f.length + " フレーム)、見える神は毎フレーム 1 体(消えない・2 体にならない)", f.length > 500 && gaps === 0 && multi === 0, JSON.stringify({ frames: f.length, gaps, multi }));
    await place(8, 3.6, 8); await aimDeg(0); await sleep(1500); const m = await measureOverlap();
    rec("GL4b 演出が終わると、常駐の神が背後に戻り、主人公と絵が重ならない", m.gPix > 1500 && m.both <= Math.max(2, m.gPix * 0.03) && m.info.godEvent.prio === 0, JSON.stringify({ godPix: m.gPix, overlap: m.both, prio: m.info.godEvent.prio }));
    async function measureOverlapSafe() { try { const info = await json(SPR); return { vis: await json(`${GC}.getVisibleGods()`), prio: info.godEvent && info.godEvent.prio }; } catch (e) { return null; } }
    void rows;
  });

  await check("GL5 片づけ・移動", async () => {
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    const left = await json(`({ tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length, tracked: ${GC}.getDiagnostics().tracked, hidden: $gameMap.events().filter(function(e){ return e._projectRCompanionHidden; }).length })`);
    rec("GL5a 戦闘の終了(撤退)で、神のEvent・追従の状態・隠した神が探索マップに残らない", left.tagged === 0 && left.tracked === 0 && left.hidden === 0, JSON.stringify(left));
    const runs = [];
    for (let i = 0; i < 2; i++) {
      await enter(); await ev(`${park} 'ok'`); await place(8, 3.6, 8); await aimDeg(0); await sleep(500);
      const m = await measureOverlap(); await json(`${FC}.useAbility('mobility', 'test')`); await sleep(600); const vis = await json(`${GC}.getVisibleGods()`);
      await sleep(2800); await ev(`${FC}.abortEncounter('r'); 'ok'`); await leave();
      runs.push({ godPix: m.gPix, overlap: m.both, vis: vis.hermes || 0, tagged: await json(`$gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length`) });
    }
    rec("GL5b 戦闘 ↔ 探索マップを2回繰り返す: 毎回、入った直後の北向きで重ならない・演出中も神は1体・戻ると0", runs.every(r => r.godPix > 1500 && r.overlap <= Math.max(2, r.godPix * 0.03) && r.vis <= 1 && r.tagged === 0), JSON.stringify(runs));
    // 台本の神(追従)は動かさない
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await aimDeg(0);
    const sp = await json(`${GV}.spawnFollower('hermes', { x: 5.5, y: 4.5 }, { cardId: 'hermes_issen' })`); await sleep(500);
    const fp = await json(`(function(){ var e = $gameMap.event(${sp.eventId}); return [e._realX, e._realY]; })()`), vis = await json(`${GC}.getVisibleGods()`);
    await json(`${GV}.removeFollower(${sp.id})`); await sleep(500);
    const back = await json(`${GC}.getVisibleGods()`);
    rec("GL5c 台本の神(追従)は動かされない・同時に見えるのは1体・外すと常駐の神が戻る", sp.ok && Math.abs(fp[0] - 5) < 0.05 && Math.abs(fp[1] - 4) < 0.05 && vis.hermes === 1 && back.hermes === 1, JSON.stringify({ fp, vis, back }));
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
  });

  await check("GL6 性能・エラー・保存", async () => {
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await aimDeg(0);
    const measure = async enabled => {
      await ev(`${GC}.setConfig({ enabled: ${enabled} }); 'ok'`);
      await ev("(function(){ var o = Game_Map.prototype.update; window.__ms = []; window.__origGM = o; Game_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(1000); await c.keyUp("A"); await c.keyDown("D"); await sleep(1000); await c.keyUp("D");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Game_Map.prototype.update = window.__origGM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3) }; })()");
      await place(8, 10, 8); return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const on = await measure(true), off = await measure(false); await ev(`${GC}.setConfig({ enabled: true }); 'ok'`);
    rec("GL6a 神の同行の負荷は小さい(Game_Map.update の増加 < 0.5ms)/ 約60fps", on.fps > 52 && on.avgMs - off.avgMs < 0.5, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("GL6b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_god_layout_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
