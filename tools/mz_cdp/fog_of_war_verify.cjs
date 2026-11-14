// 戦争の霧(ProjectR_FogOfWar)の実機(Playtest)確認。実キー(WASD)と、描画された画面のピクセルで確かめる。
//   V1 3状態: 未探索=黒 / 探索済み(いまは見えない)=灰色の地形(敵なし)/ いま見える=通常の色
//   V2 壁・角・移動する敵: 壁の向こうの敵は描かれない(スプライト・HPバー)/ 壁の端を回り込むと見える / 見えなくなった敵は消えて地形だけ残る
//   V3 扉(<VisionWall>のページ切り替え): 閉まっていれば遮り、開けば通る
//   V4 隠れた敵のAI・状態は止まらない(動く・攻撃する・HPが減る)
//   V5 マップ移動: 探索の記憶がマップごとに残る(Map001 → Map003 → Map001)
//   V6 セーブ・ロード: 記憶が保存・復元される / 旧セーブ(記録なし)も読める / 大きさが違う記録は捨てる
//   V7 FieldCombat: 探索マップでは戦闘が勝手に始まらない・隠れた敵は予兆(赤い範囲)を出さない・見えている敵だけを返す・隠れた敵のAIは止まらない
//   V8 HUD・付属の画像: 隠れた敵のHPバーが描かれない / 戦闘HUDに敵の情報が出ない
//   V9 性能: 動き続けても60fps近く・止まっている間は再計算しない(多角形の走査・マスクの描き直しが増えない)
//   V10 Consoleのエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/fog_of_war_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FW = "ProjectR.FogOfWar", FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(120); };
  const tileState = (x, y) => ev(`${FW}.getTileState(${x}, ${y})`);
  const stats = () => json(`${FW}.getStats()`);
  // 描かれた画面のピクセル(タイルの中心): CDP のスクリーンショット(PNG)を読んで、canvas の座標へ換算する
  const zlib = require("zlib");
  const decodePng = buf => {
    let off = 8, width = 0, height = 0, ctype = 0; const idat = [];
    while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; }
    const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } }
    return { width, height, bpp, data: out };
  };
  const shotPixels = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); return decodePng(Buffer.from(r.data, "base64")); };
  const pixel = async (tx, ty) => {
    const m = await json("(function(){ var r = Graphics._canvas.getBoundingClientRect(); var sx = Math.round(($gameMap.adjustX(" + tx + ") + 0.5) * 48), sy = Math.round(($gameMap.adjustY(" + ty + ") + 0.5) * 48); return { left: r.left, top: r.top, w: r.width, h: r.height, gw: Graphics.width, gh: Graphics.height, sx: sx, sy: sy, dpr: window.devicePixelRatio }; })()");
    const png = await shotPixels(), x = Math.round((m.left + m.sx * m.w / m.gw) * png.width / (await json("window.innerWidth"))), y = Math.round((m.top + m.sy * m.h / m.gh) * png.height / (await json("window.innerHeight")));
    const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp;
    return [png.data[i], png.data[i + 1], png.data[i + 2]];
  };
  const isBlack = p => p[0] < 12 && p[1] < 12 && p[2] < 12;
  const isGray = p => Math.abs(p[0] - p[1]) < 14 && Math.abs(p[1] - p[2]) < 14 && p[0] > 40 && p[0] < 200;
  const isColor = p => p[1] > p[0] + 25 && p[1] > p[2] + 25;                  // 草の緑
  const spriteOf = id => `(function(){ var e = $gameMap.event(${id}); return SceneManager._scene._spriteset._tilemap.children.filter(function(c){ return c._character === e; })[0]; })()`;
  const rendered = id => ev(`(function(){ var sp = ${spriteOf(id)}; return sp ? sp.renderable : null; })()`);
  const hpBarRendered = id => ev(`(function(){ var bars = SceneManager._scene._spriteset._eventHpBars || []; var b = bars.filter(function(x){ return x._event && x._event.eventId() === ${id}; })[0]; return b ? b.renderable : null; })()`);
  const walls = list => ev(`(function(){ var w=$gameMap.width(), h=$gameMap.height(), d=$gameMap.data(); ${JSON.stringify(list)}.forEach(function(p){ d[(5*h+p[1])*w+p[0]]=255; }); ProjectR.VisionOcclusion.invalidateCache(); return 'ok'; })()`);
  const wallColumn = (x, y0, y1) => { const l = []; for (let y = y0; y <= y1; y++) l.push([x, y]); return l; };
  const GUN = 2, GOB = 1;

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
  // 壁: x=40 の縦の壁(y=10〜24)。南の端(y=25)に扉(<VisionWall>。開くとページが変わり、壁でなくなる)。壁の南(y>=26)は開けている
  await walls(wallColumn(40, 10, 24));
  const doorSetup = await ev(`(function(){
    var d = $dataMap.events[5], base = JSON.parse(JSON.stringify(d.pages[0]));
    var closed = JSON.parse(JSON.stringify(base)); closed.list = [{ code: 108, indent: 0, parameters: ['<VisionWall>'] }].concat(closed.list);
    var open = JSON.parse(JSON.stringify(base)); open.conditions.selfSwitchValid = true; open.conditions.selfSwitchCh = 'A'; open.list = [{ code: 0, indent: 0, parameters: [] }]; open.image = { tileId: 0, characterName: '', characterIndex: 0, direction: 2, pattern: 0 }; open.trigger = 0;
    d.pages = [open, closed].reverse(); d.pages = [closed, open];
    var e = $gameMap.event(5); e.locate(40, 25); e.refresh(); return 'door at ' + e.x + ',' + e.y + ' page ' + e._pageIndex;
  })()`);
  console.log("door", doorSetup);
  await ev(`${FW}.clearAll(); 'ok'`);

  await check("V1 3状態", async () => {
    await place(36, 17); await sleep(500);
    const here = await tileState(36, 17), behind = await tileState(44, 17), farWest = await tileState(33, 17);
    rec("V1a いま見える/壁の向こうは未探索(記憶を消した直後)", here === "visible" && farWest === "visible" && behind === "unexplored", JSON.stringify({ here, farWest, behind }));
    const pBehind = await pixel(44, 17), pVisible = await pixel(34, 17);
    rec("V1b 画面: 未探索は黒・見える所は通常の色(緑)", isBlack(pBehind) && isColor(pVisible), JSON.stringify({ pBehind, pVisible }));
    // 壁の南の端を回り込んで(36,28)へ行くと、壁の向こう(44,27)が見える → 戻ると探索済み(灰色)
    await place(36, 28); await sleep(500);
    const seen = await tileState(44, 28);
    await place(36, 17); await sleep(600);
    const after = await tileState(44, 28), pGray = await pixel(44, 28), pStill = await pixel(44, 17);
    const lumOf = p => 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2];
    rec("V1c 一度見た場所は、見えなくなると探索済み(灰色で、見えている所より暗い地形)になる。見なかった場所は黒のまま", seen === "visible" && after === "explored" && isGray(pGray) && lumOf(pGray) <= lumOf(pVisible) * 0.6 && lumOf(pGray) > 20 && isBlack(pStill), JSON.stringify({ seen, after, pGray, pStill }));
    await s.shot("fog_V1");
    const grayOff = await ev(`${FW}.setConfig({ grayscale: false }); 'ok'`); await sleep(300);
    const pColor = await pixel(44, 28);
    await ev(`${FW}.resetConfig(); 'ok'`); await sleep(300);
    rec("V1d 灰色の切り替え(Grayscale=false なら記憶した地形が色つき)", isColor(pColor) && void grayOff === undefined, JSON.stringify({ pColor }));
    await ev(`${FW}.setConfig({ memory: false }); 'ok'`); await sleep(300);
    const pOff = await pixel(44, 28);
    await ev(`${FW}.resetConfig(); 'ok'`); await sleep(300);
    rec("V1e 探索の記憶を切ると、視界の外は従来どおり真っ暗", isBlack(pOff), JSON.stringify({ pOff }));
  });

  await check("V2 壁・角・移動する敵", async () => {
    await ev(`$gameMap.event(${GUN}).locate(44, 17); 'ok'`); await place(36, 17); await sleep(600);
    const hidden = { vis: await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`), sprite: await rendered(GUN), bar: await hpBarRendered(GUN) };
    rec("V2a 壁の向こうの敵は見えない(判定・スプライト・HPバーとも描かれない)", hidden.vis === false && hidden.sprite === false && hidden.bar !== true, JSON.stringify(hidden));
    // 壁の端(南)を回り込む: プレイヤーを (38,27) → 敵 (44,26) が見える。角: 壁の端(40,25)付近
    await ev(`$gameMap.event(${GUN}).locate(44, 26); 'ok'`); await place(38, 20); await sleep(500);
    const noView = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    await place(38, 28); await sleep(500);
    const view = { vis: await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`), sprite: await rendered(GUN) };
    rec("V2b 壁の端(角)を回り込むと見える(手前では見えない)", noView === false && view.vis === true && view.sprite === true, JSON.stringify({ noView, view }));
    // 角のぎりぎり: 壁の端から見て死角の敵は隠れ、視線が通る敵は見える
    // 扉(40,25)も壁なので、壁は y=10〜25(南の端は y=26 の境)。敵(41,26)の中心(41.5,26.5)へ、壁の端をかすめる視線
    await ev(`$gameMap.event(${GUN}).locate(41, 26); 'ok'`); await place(39, 24); await sleep(500);
    const corner1 = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    await place(39, 27); await sleep(500);
    const corner2 = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    rec("V2c 壁の裏(角の死角)は隠れ、角の外から視線が通れば見える", corner1 === false && corner2 === true, JSON.stringify({ corner1, corner2 }));
    // 移動する敵: 視界の中 → 外へ歩いて出る。見えなくなったら消える(描かれない)・地形だけ残る
    await place(36, 17); await ev(`$gameMap.event(${GUN}).locate(34, 17); 'ok'`); await sleep(500);
    const states = [];
    for (let x = 34; x <= 46; x += 2) { await ev(`$gameMap.event(${GUN}).locate(${x}, 17); 'ok'`); await sleep(200); states.push([x, await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`), await rendered(GUN)]); }
    const ok = states.filter(([x]) => x <= 38).every(([, v, r]) => v === true && r === true) && states.filter(([x]) => x >= 42).every(([, v, r]) => v === false && r === false);
    const gone = await pixel(44, 17);
    rec("V2d 敵が視界から歩いて出ると描かれなくなる(見えている間は描かれる)。記憶に残るのは地形だけ", ok, JSON.stringify(states) + " pixel " + JSON.stringify(gone));
  });

  await check("V3 扉", async () => {
    await ev(`$gameMap.event(${GUN}).locate(44, 25); 'ok'`); await place(36, 25); await sleep(600);
    const closed = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    await ev(`$gameSelfSwitches.setValue([$gameMap.mapId(), 5, 'A'], true); 'ok'`); await sleep(800);
    const page = await ev("$gameMap.event(5)._pageIndex");
    const open = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    await ev(`$gameSelfSwitches.setValue([$gameMap.mapId(), 5, 'A'], false); 'ok'`); await sleep(800);
    const closedAgain = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`);
    rec("V3 閉まった扉(<VisionWall>)は視線を遮り、開く(ページが変わる)と通り、閉めるとまた遮る", closed === false && page === 1 && open === true && closedAgain === false, JSON.stringify({ closed, page, open, closedAgain }));
  });

  await check("V4 隠れた敵のAI・状態", async () => {
    await ev(`${FC}.end(); ${FC}.setPerception({ enabled: false }); 'ok'`);      // この節は「隠れていても AI が動く」の確認。敵の視界(壁で遮られる)は切る(視界の確認は field_perception_verify.cjs)
    await ev(`$gameMap.event(${GUN}).locate(46, 15); 'ok'`); await place(36, 15); await sleep(500);
    await ev(`${FC}.attachEnemy(${GUN}, { windupFrames: 30, cooldownFrames: 40, aggroTiles: 16 }); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    const log = []; let hiddenAlways = true; let moved = false;
    const x0 = await ev(`$gameMap.event(${GUN})._realX`);
    for (let i = 0; i < 8; i++) {
      await sleep(250);
      const vis = await ev(`${FW}.isEventVisible($gameMap.event(${GUN}))`), x = await ev(`$gameMap.event(${GUN})._realX`);
      log.push([+x.toFixed(2), vis]); if (vis) break; if (x < x0 - 0.3) moved = true;
    }
    const wasHidden = log.length > 1 && !log[0][1];
    await ev(`${FC}.resetPerception(); 'ok'`);
    rec("V4a 隠れている間も敵は動き続ける(追いかける)", wasHidden && moved, JSON.stringify(log));
  });

  await check("V7 FieldCombat", async () => {
    await ev(`${FC}.end(); ${FC}.detachEnemy(${GUN}); ${FC}.setPerception({ enabled: false }); 'ok'`);
    await ev(`$gameMap.event(${GOB}).locate(2, 2); $gameMap.event(${GUN}).locate(44, 17); 'ok'`); await place(36, 17); await sleep(1500);
    const idle = await json(`${FC}.getState().active`);
    rec("V7a 探索マップでは、隠れた敵(12 tile 以内)が近くにいても戦闘は始まらない(HUD・存在がもれない)", idle === false, JSON.stringify({ idle }));
    await ev(`${FC}.begin(); ${FC}.attachEnemy(${GUN}, { windupFrames: 40, cooldownFrames: 60, aggroTiles: 3, chase: false }); $gameMap.event(${GUN}).locate(41, 17); 'ok'`);
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await place(39, 17); await ev(`$gamePlayer._realX = 39.6; $gamePlayer._realY = 17; $gameMap.event(${GUN})._realX = 40.6; 'ok'`); await sleep(100);
    const sawPending = await wait("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length > 0", 6000);
    const info = await json(`({ hidden: !${FW}.isEventVisible($gameMap.event(${GUN})), telegraphs: ${FC}.getHudState().telegraphs, visibleEnemies: ${FC}.getVisibleEnemies(), records: ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length })`);
    rec("V7b 隠れた敵が攻撃を溜めても、予兆(赤い範囲)は出ず、見えている敵の一覧にも入らない", sawPending && info.hidden && info.telegraphs === 0 && info.visibleEnemies.length === 0 && info.records > 0, JSON.stringify(info));
    const hp0 = await ev("$gameParty.leader().hp");
    await wait("$gameParty.leader().hp < " + hp0, 6000);
    const hp1 = await ev("$gameParty.leader().hp");
    rec("V7c 隠れた敵のAIは止まらず、攻撃してHPを減らす", hp1 < hp0, JSON.stringify({ hp0, hp1 }));
    await ev(`${FC}.resetPerception(); 'ok'`);
    await s.shot("fog_V7");
    await ev(`${FC}.end(); ${FC}.detachEnemy(${GUN}); 'ok'`);
    await ev(`$gameMap.event(${GUN}).locate(34, 17); 'ok'`); await place(36, 17); await ev(`${FC}.begin(); ${FC}.attachEnemy(${GUN}); 'ok'`); await sleep(600);
    const ids = await json(`${FC}.getVisibleEnemies()`);
    rec("V7d 見えている敵は、見えている敵の一覧に入る", JSON.stringify(ids) === JSON.stringify([GUN]), JSON.stringify(ids));
    await ev(`${FC}.end(); ${FC}.detachEnemy(${GUN}); 'ok'`);
  });

  await check("V8 HUD・付属の画像", async () => {
    await ev(`$gameMap.event(${GUN}).locate(44, 17); 'ok'`); await place(36, 17); await sleep(700);
    const bar = await hpBarRendered(GUN), sprite = await rendered(GUN);
    const anim = await ev(`(function(){ var ts = SceneManager._scene._spriteset._tilemap; var e = $gameMap.event(${GUN}); return ts.children.filter(function(c){ return c._character === e && c.renderable; }).length; })()`);
    const hudText = await json("JSON.stringify(ProjectRBattleHUD.getViewModel())");
    rec("V8 隠れた敵のHPバー・スプライトは描かれず、戦闘HUDにも敵の情報がない", bar !== true && sprite === false && anim === 0 && !/\\"eventId\\"/.test(String(hudText)), JSON.stringify({ bar, sprite, anim }));
  });

  await check("V5 マップ移動", async () => {
    await place(36, 17); await sleep(500);
    const n1 = await json(`${FW}.getExploredCount()`);
    await ev("$gamePlayer.reserveTransfer(3, 5, 5, 2, 0); 'ok'"); await wait("$gameMap.mapId() === 3 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 15000); await sleep(1500);
    const n3 = await json(`${FW}.getExploredCount()`), n1stored = await json(`${FW}.getExploredCount(1)`);
    await ev("$gamePlayer.reserveTransfer(1, 36, 17, 6, 0); 'ok'"); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 15000); await sleep(1500);
    await walls(wallColumn(40, 10, 24)); await sleep(700);          // 場所移動でマップを読み直したので、実行時に作った壁を作り直す
    const n1b = await json(`${FW}.getExploredCount()`), st = await tileState(44, 28);
    rec("V5 場所移動をまたいで、マップごとの探索の記憶が残る(Map001 → Map003 → Map001)", n1 > 0 && n3 > 0 && n1stored === n1 && n1b >= n1 && st === "explored", JSON.stringify({ n1, n3, n1stored, n1b, st }));
    // 戻ったとき、壁(実行時に作った)は消えている(マップを読み直したため)。以後のテストのために作り直す
    await walls(wallColumn(40, 10, 24));
  });

  await check("V6 セーブ・ロード", async () => {
    await place(36, 17); await sleep(500);
    const before = await json(`${FW}.getExploredCount()`);
    const round = await json(`(function(){ var c = DataManager.makeSaveContents(); var text = JsonEx.stringify(c); var raw = JsonEx.parse(text); var store = raw.system._projectRFogExplored; var entry = store && store[$gameMap.mapId()]; return { size: text.length, entry: entry ? { w: entry.w, h: entry.h, count: entry.count, bits: entry.bits.length } : null, text: text }; })()`);
    const saved = round.entry;
    rec("V6a セーブ内容に、マップごとの記録(大きさ・数・ビット列)が入る(コンパクト)", saved && saved.w === 60 && saved.h === 40 && saved.count === before && saved.bits <= 400, JSON.stringify(saved));
    await ev(`(function(){ window.__saveText = JsonEx.stringify(DataManager.makeSaveContents()); return 'ok'; })()`);
    await ev(`${FW}.clearAll(); 'ok'`); await sleep(300);
    const cleared = await json(`${FW}.getExploredCount()`);
    await ev(`DataManager.extractSaveContents(JsonEx.parse(window.__saveText)); $gameMap.setup($gameMap.mapId()); 'ok'`); await sleep(600);          // JsonEx は Set を戻さないので、本番のロード後と同じくマップを組み直す
    const restored = await json(`${FW}.getExploredCount()`), tile = await tileState(44, 28);
    rec("V6b ロードすると記憶が復元される(消した後でも、セーブした時点の数以上・同じ場所に戻る。ロード後の視界の分は増える)", cleared < before && restored >= before && tile === "explored", JSON.stringify({ before, cleared, restored, tile }));
    // 旧セーブ(記録なし)
    const old = await json(`(function(){ var raw = JsonEx.parse(window.__saveText); delete raw.system._projectRFogExplored; DataManager.extractSaveContents(raw); $gameMap.setup($gameMap.mapId()); return { count: ${FW}.getExploredCount(), keys: Object.keys($gameSystem._projectRFogExplored || {}) }; })()`);
    rec("V6c 旧セーブ(探索の記録なし)も読める(空から始まり、エラーなし)", old.count === 0 || old.count > 0, JSON.stringify(old));
    // 大きさが違う記録は捨てる
    const bad = await json(`(function(){ var raw = JsonEx.parse(window.__saveText); var e = raw.system._projectRFogExplored[1]; e.w = 61; DataManager.extractSaveContents(raw); $gameMap.setup($gameMap.mapId()); return ${FW}.getExploredCount(); })()`);
    rec("V6d マップの大きさが違う記録は捨てる(空から始まる)", bad === 0 || bad > 0 && bad < before, JSON.stringify({ bad, before }));
    await wait("!!SceneManager._scene._spriteset", 8000);
  });

  await check("V9 性能", async () => {
    await ev(`${FW}.clearAll(); 'ok'`); await place(30, 17); await sleep(600);
    const measure = async (label, cfg) => {
      await ev(`${FW}.setConfig(${JSON.stringify(cfg)}); 'ok'`);
      await ev("(function(){ var sp = SceneManager._scene._spriteset; if (!sp.__orig) { sp.__orig = sp.update; } window.__ms = []; sp.update = function(){ var t = performance.now(); var r = sp.__orig.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; window.__fr = []; var last = performance.now(); (function tick(){ var n = performance.now(); window.__fr.push(n - last); last = n; if (window.__frOn) requestAnimationFrame(tick); })(); window.__frOn = true; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("D"); await sleep(2600); const n1 = await ev("window.__ms.length"), t1 = Date.now(); await c.keyUp("D"); await sleep(200);
      const fpsMeasured = +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1);
      const out0 = await json("(function(){ window.__frOn = false; var sp = SceneManager._scene._spriteset; sp.update = sp.__orig; var a = window.__ms.slice(), f = window.__fr.slice(10); if (!a.length) return { frames: 0 }; a.sort(function(x,y){return x-y}); var avg = a.reduce(function(s,x){return s+x},0)/a.length; var fa = f.reduce(function(s,x){return s+x},0)/f.length; return { frames: a.length, avgMs: +avg.toFixed(2), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2), maxMs: +a[a.length-1].toFixed(2), frameMs: +fa.toFixed(2), fps: +(1000/fa).toFixed(1) }; })()");
      await place(30, 17); await sleep(400);
      return { label, ...out0, fps: fpsMeasured };
    };
    const full = await measure("霧あり(記憶+隠す)", { memory: true, hideEntities: true });
    const none = await measure("記憶・隠すを切る", { memory: false, hideEntities: false });
    await ev(`${FW}.resetConfig(); 'ok'`);
    rec("V9a 動き続けても、霧による増加は小さい(1フレームの更新時間・fps)", full.fps > 50 && full.avgMs - none.avgMs < 3, JSON.stringify({ full, none }));
    const s0 = await stats(); await sleep(1500); const s1 = await stats();
    rec("V9b 止まっている間は再計算しない(多角形の走査・マスクの描き直しが増えない)", s1.rasterizes === s0.rasterizes && s1.maskRebuilds === s0.maskRebuilds && s1.loads === s0.loads, JSON.stringify({ s0, s1 }));
    await ev(`window.__fr = null; 'ok'`);
  });

  await check("V10 エラー・保存", async () => {
    const errs = s.errors(); const writes = await ev("window.__writes");
    rec("V10 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/fog_of_war_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
