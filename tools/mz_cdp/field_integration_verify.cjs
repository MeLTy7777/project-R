// フィールド戦闘 × 戦争の霧 の統合の実機(Playtest)確認(Stage 3)。F8 なし。Map001 の入口(24,21)から Map008(南の控え室 + 扉つきの壁 + 北の戦闘エリア)へ、実キー・実マウスで通す。
//   J1 探索マップで敵が画面内にいても、ヘルメースの指輪(AcquireHermesRing)を入手できる / 戦闘中(エンカウンター・既存の戦闘)は、従来どおり指輪の受け渡しを断る
//   J2 入口 → 戦闘マップ: 壁・扉・敵3体 / 最初は敵が見えない(壁の向こう)/ 3状態(未探索=黒・探索済み=灰色・見える=通常)
//   J3 漏れの監査: 隠れた敵が、スプライト・HPバー・影・マーカー・予兆・演出のどれからも見えない(画面のピクセルと、描画ツリーの両方)
//   J4 入力(実キー): WASD(衝突)・マウスの照準・右クリック(銃。壁で止まる)・E 一閃・Shift 絶・Q 奥義・C アイテム・F(扉)
//   J5 扉と視界: 閉 → 開で、視線が通る敵だけ見える / 歩いて入ると見え方が変わる / 隠れた敵のAIは動き続ける
//   J6 攻撃と視界: 見えている敵には当たる・壁の向こうには当たらない
//   J7 勝利 → 元のマップ / 探索の記憶はマップごとに残る / 2回目は扉・敵が初期状態 / 後に何も残らない(HUD・敵・視界・戦闘)
//   J8 撤退・敗北・ロード後も、戦闘・視界・敵の描画が残らない
//   J9 性能(動き続けて約60fps)/ Console のエラーなし / 保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_integration_verify.cjs   (新しいNW.jsセッションで実行する)
const zlib = require("zlib");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", FW = "ProjectR.FogOfWar";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const enc = () => json(`${FC}.getEncounterState()`);
  const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const advance = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; if (await ev("$gameMessage.isBusy()")) await c.tap("F", 60); await sleep(120); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(120); };
  const vis = id => ev(`${FW}.isEventVisible($gameMap.event(${id}))`);
  const rendered = id => ev(`(function(){ var e = $gameMap.event(${id}); var sp = SceneManager._scene._spriteset._tilemap.children.filter(function(c){ return c._character === e; })[0]; return sp ? sp.renderable : null; })()`);
  const tileState = (x, y) => ev(`${FW}.getTileState(${x}, ${y})`);
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
  const screenOf = (tx, ty) => json(`({ x: Math.round(($gameMap.adjustX(${tx}) + 0.5) * 48), y: Math.round(($gameMap.adjustY(${ty}) + 0.5) * 48) })`);
  // 画面のピクセル(スクリーンショットのPNG)
  const decodePng = buf => {
    let off = 8, width = 0, height = 0, ctype = 0; const idat = [];
    while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8); if (type === "IHDR") { width = buf.readUInt32BE(off + 8); height = buf.readUInt32BE(off + 12); ctype = buf[off + 17]; } if (type === "IDAT") idat.push(buf.slice(off + 8, off + 8 + len)); off += 12 + len; }
    const bpp = ctype === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * bpp, out = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) { const f = raw[y * (stride + 1)]; for (let x = 0; x < stride; x++) { const v = raw[y * (stride + 1) + 1 + x], a1 = x >= bpp ? out[y * stride + x - bpp] : 0, b1 = y > 0 ? out[(y - 1) * stride + x] : 0, c1 = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0; let r = v; if (f === 1) r = v + a1; else if (f === 2) r = v + b1; else if (f === 3) r = v + ((a1 + b1) >> 1); else if (f === 4) { const p = a1 + b1 - c1, pa = Math.abs(p - a1), pb = Math.abs(p - b1), pc = Math.abs(p - c1); r = v + (pa <= pb && pa <= pc ? a1 : pb <= pc ? b1 : c1); } out[y * stride + x] = r & 255; } }
    return { width, height, bpp, data: out };
  };
  const shot = async () => { const r = await c.send("Page.captureScreenshot", { format: "png" }); return decodePng(Buffer.from(r.data, "base64")); };
  const viewport = async () => json("({ left: Graphics._canvas.getBoundingClientRect().left, top: Graphics._canvas.getBoundingClientRect().top, w: Graphics._canvas.getBoundingClientRect().width, h: Graphics._canvas.getBoundingClientRect().height, gw: Graphics.width, gh: Graphics.height, iw: window.innerWidth, ih: window.innerHeight })");
  const pixelAt = (png, m, sx, sy) => { const x = Math.round((m.left + sx * m.w / m.gw) * png.width / m.iw), y = Math.round((m.top + sy * m.h / m.gh) * png.height / m.ih); const i = (Math.max(0, Math.min(png.height - 1, y)) * png.width + Math.max(0, Math.min(png.width - 1, x))) * png.bpp; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
  const tilePixel = async (tx, ty) => { const m = await viewport(), p = await screenOf(tx, ty), png = await shot(); return pixelAt(png, m, p.x, p.y); };
  const isBlack = p => p[0] < 12 && p[1] < 12 && p[2] < 12;
  const isGray = p => Math.abs(p[0] - p[1]) < 14 && Math.abs(p[1] - p[2]) < 14 && p[0] > 30 && p[0] < 210;
  // 領域(タイルの中心 ± r tile)のピクセル列
  const region = async (tx, ty, r = 1) => { const m = await viewport(), p = await screenOf(tx, ty), png = await shot(), out = []; for (let dy = -r * 24; dy <= r * 24; dy += 6) for (let dx = -r * 24; dx <= r * 24; dx += 6) out.push(pixelAt(png, m, p.x + dx, p.y + dy)); return out; };
  const diffCount = (a, b) => a.reduce((n, p, i) => n + (Math.abs(p[0] - b[i][0]) > 14 || Math.abs(p[1] - b[i][1]) > 14 || Math.abs(p[2] - b[i][2]) > 14 ? 1 : 0), 0);
  // 描画ツリーの監査: 隠れている敵(霧が見えないと言う敵)に結びついた表示物が、実際に描かれる状態(自分も親も visible・renderable・alpha>0)にないか
  const leakScan = () => json(`(function(){
    var hidden = {}, list = $gameMap.events().filter(function(e){ return e && !e._erased && e.databaseEnemy; });
    list.forEach(function(e){ if (!ProjectR.FogOfWar.isEventVisible(e)) hidden[e.eventId()] = e; });
    var leaks = [], scanned = 0;
    (function walk(o, ok) {
      if (!o) return; var self = ok && o.visible !== false && o.renderable !== false && (o.worldAlpha === undefined || o.worldAlpha > 0) && (o.alpha === undefined || o.alpha > 0);
      scanned++;
      var ev = o._character || o._event; if (ev && typeof ev.eventId === 'function' && hidden[ev.eventId()] && self) leaks.push((o.constructor && o.constructor.name) + ':' + ev.eventId());
      (o.children || []).forEach(function(ch){ walk(ch, self); });
    })(SceneManager._scene, true);
    return { hidden: Object.keys(hidden), leaks: leaks, scanned: scanned };
  })()`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; window.__warn = []; var ow = console.warn; console.warn = function(){ window.__warn.push([].slice.call(arguments).join(' ')); return ow.apply(console, arguments); }; 'ok'");

  await check("J1 指輪の入手", async () => {
    await place(46, 15, 6); await sleep(1500);
    const onScreen = await json("({ events: $gameMap.events().filter(function(e){return e.databaseEnemy}).length, gated: ProjectRCombatPresence.isCombatActive() })");
    const before = await ev("ProjectRCardDeck.hasPlayerRing('hermes')");
    await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
    const after = await ev("ProjectRCardDeck.hasPlayerRing('hermes')");
    const warn = (await json("window.__warn")).filter(w => /AcquireHermesRing/.test(w));
    rec("J1a 探索マップで敵が画面内にいても、ヘルメースの指輪を入手できる(従来は RING_TRANSFER_DURING_BATTLE で断られた)", onScreen.events >= 2 && onScreen.gated === false && before === false && after === true && warn.length === 0, JSON.stringify({ onScreen, before, after, warn }));
  });

  let origin = null;
  await check("J2 入口 → 戦闘マップ", async () => {
    await place(24, 22, 8); await c.tap("W", 120); await sleep(300);
    origin = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
    await c.tap("F"); await sleep(400);
    const moved = await advance("$gameMap.mapId() === 8", 25000);
    await waitMap(8); const fighting = await wait(`${FC}.isActive()`, 15000); await sleep(600);
    const st = await json(`({ enc: ${FC}.getEncounterState().state, pos: [$gamePlayer.x, $gamePlayer.y], enemies: ${FC}.getEncounterState().enemies, door: $gameMap.event(5)._pageIndex, fog: !!SceneManager._scene._spriteset._projectRFog })`);
    rec("J2a 入口のNPCから戦闘マップへ(出現位置 (8,9)・敵3体に行動・扉は閉・霧の層あり)", moved && fighting && st.enc === "fighting" && st.pos[0] === 8 && st.pos[1] === 9 && st.enemies.length === 3 && st.door === 0 && st.fog, JSON.stringify(st));
    await ev("window.__init = [1, 2, 3].map(function(id){ var e = $gameMap.event(id); return [e._realX, e._realY]; }); 'ok'");
    const v = { A: await vis(1), B: await vis(2), C: await vis(3), npc: await vis(4), door: await vis(5) };
    rec("J2b 最初は、壁の向こうの敵3体が見えない(判定・スプライト)/ 南の控え室のNPCは見える", !v.A && !v.B && !v.C && v.npc === true && (await rendered(1)) === false && (await rendered(2)) === false && (await rendered(3)) === false, JSON.stringify(v));
    const states = { room: await tileState(8, 9), wall: await tileState(3, 7), north: await tileState(8, 2), far: await tileState(2, 1) };
    const pRoom = await tilePixel(8, 9), pNorth = await tilePixel(8, 2);
    rec("J2c 3状態: 控え室=見える(色つき)/ 壁の向こうの戦闘エリア=未探索(黒)", states.room === "visible" && states.north === "unexplored" && states.far === "unexplored" && isBlack(pNorth) && !isBlack(pRoom), JSON.stringify({ states, pRoom, pNorth }));
    await s.shot("fi_J2");
  });

  await check("J3 漏れの監査(隠れた敵)", async () => {
    const scan = await leakScan();
    rec("J3a 描画ツリーに、隠れた敵(A・B・C)に結びついた「描かれる」表示物がない(スプライト・HPバー・影・付属の画像)", scan.hidden.length === 3 && scan.leaks.length === 0 && scan.scanned > 50, JSON.stringify(scan));
    // ピクセル: 敵C(8,3)の周りを、敵がいるときと、(AIを止めて)遠くへ置いたときで比べる(同じなら、敵の絵・影・HPバーが漏れていない)
    const a = await region(8, 3, 1);
    await ev(`${FC}.detachEnemy(3); var e = $gameMap.event(3); window.__c3 = [e._realX, e._realY]; e.locate(15, 1); 'ok'`); await sleep(500);
    const b = await region(8, 3, 1);
    await ev(`var e = $gameMap.event(3); e.locate(window.__c3[0], window.__c3[1]); ${FC}.attachEnemy(3, { windupFrames: 30, cooldownFrames: 100, reach: 1.4, aggroTiles: 14 }); 'ok'`); await sleep(400);
    rec("J3b 敵Cの周りの画面は、敵がいてもいなくても同じ(真っ暗のまま。絵・影・HPバーが漏れない)", diffCount(a, b) === 0 && a.every(isBlack), JSON.stringify({ diff: diffCount(a, b), allBlack: a.every(isBlack) }));
    // 予兆: 隠れた敵が攻撃を溜めても、赤い範囲が出ない(扉の前の主人公のそばに予約して、画面を比べる)
    await ev("var e = $gameMap.event(3); e.locate(8, 6); 'ok'"); await sleep(300);
    const quiet = await region(8, 6, 1);
    await ev("ProjectREnemyAttack.schedule({ eventId: 3, kind: 'melee', windupFrames: 90, notetag: '<projectRFieldMelee><dmg: ゴブリン>', reach: 1.2 }); 'ok'"); await sleep(500);
    const info = await json(`({ records: ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length, telegraphs: ${FC}.getHudState().telegraphs, visibleEnemies: ${FC}.getVisibleEnemies(), hidden: !${FW}.isEventVisible($gameMap.event(3)) })`);
    const during = await region(8, 6, 1);
    rec("J3c 隠れた敵の攻撃の予兆(赤い範囲)は、記録はあっても画面に出ない(周りの画面が変わらない・見えている敵の一覧に入らない)", info.records > 0 && info.hidden && info.telegraphs === 0 && info.visibleEnemies.length === 0 && diffCount(quiet, during) === 0, JSON.stringify({ info, diff: diffCount(quiet, during) }));
    await ev("ProjectREnemyAttack.clear && ProjectREnemyAttack.clear('test'); var e = $gameMap.event(3); e.locate(8, 3); 'ok'"); await sleep(400);
    const scan2 = await leakScan();
    rec("J3d 予兆・移動のあとも、描画ツリーに漏れがない", scan2.leaks.length === 0, JSON.stringify(scan2));
  });

  await check("J4 入力(実キー・実マウス)", async () => {
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await place(8, 9, 8);
    // WASD と衝突: 北へ歩くと、閉じた扉(8,7)の手前で止まる / 横へ歩くと、壁(y=7)の手前で止まる
    await hold("W", 900); const p1 = await pos();
    rec("J4a W: 北へ歩き、閉じた扉の手前で止まる(扉の衝突)", p1.y < 9 && p1.y > 7.9, JSON.stringify(p1));
    await place(5, 9, 8); await hold("W", 900); const p2 = await pos();
    rec("J4b 壁(y=7)の手前で止まる(壁の衝突)", p2.y > 7.9 && p2.y < 9, JSON.stringify(p2));
    await place(8, 9, 2); await hold("A", 400); const pa = await pos(); await hold("D", 400); const pd = await pos(); await hold("S", 300); const ps = await pos();
    rec("J4c A / D / S で、左 / 右 / 下へ動く", pa.x < 8 - 0.5 && pd.x > pa.x + 0.5 && ps.y > pd.y + 0.3, JSON.stringify({ pa, pd, ps }));
    // マウスの照準
    await place(8, 9, 2); const sp = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); const dirs = [];
    for (const [n, dx, dy, want] of [["右", 300, 0, 6], ["左", -300, 0, 4], ["上", 0, -300, 8], ["下", 0, 300, 2]]) { await c.pointer(sp.x + dx, sp.y + dy); await sleep(300); dirs.push([n, want, (await pos()).d]); }
    rec("J4d マウスの方向を向く(戦闘マップ)", dirs.every(([, w, g]) => w === g), JSON.stringify(dirs));
    // 右クリック(銃): 北の壁へ撃つ(弾は壁で止まり、敵Cには当たらない)/ 弾薬は減る
    await c.pointer(sp.x, sp.y - 250); await sleep(250);
    const ammo0 = await json("$gameSystem.gunAmmo(0)"), c0 = await hp(3);
    await c.rightClick(undefined, undefined, 50); await sleep(900);
    rec("J4e 右クリックで撃てる(弾薬が減る)が、壁・扉の向こうの敵には当たらない", (await json("$gameSystem.gunAmmo(0)")) < ammo0 && (await hp(3)) === c0, JSON.stringify({ ammo0, c0, c1: await hp(3) }));
    // Q: 壁の向こうへ撃っても当たらない(Cooldownは始まる)
    await c.tap("E"); await sleep(600);
    const q = await json(`({ r: ${FC}.getLastResult(), cd: ${FC}.getCooldowns().special })`);
    rec("J4f Q(一閃): 発動して Cooldown が始まる。壁・扉の向こうの敵には当たらない", q.r && q.r.ok === true && q.cd > 5 && (await hp(3)) === c0, JSON.stringify({ q, c: await hp(3) }));
    await c.tap("E"); await sleep(200);
    rec("J4g Q を Cooldown 中に押すと発動しない", (await json(`${FC}.getLastResult()`)).reason === "cooldown", "");
    // Space: 壁の方向へ瞬間移動しても、壁を越えない
    await place(8, 9, 8); await c.pointer(sp.x, sp.y - 300); await sleep(250); await c.tap("Shift"); await sleep(700);
    const z = await pos();
    rec("J4h Shift(絶): 壁・扉の方向へ移動しても、壁を越えない(手前で止まる)", z.y > 7.9, JSON.stringify(z));
    // R: HP を減らして飲む
    await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("V"); await sleep(400);
    rec("J4i C(ポーション。短押し): HPが回復する", (await ev("$gameParty.leader().hp")) > 100 && (await json(`${FC}.getLastResult()`)).slot === "consumable", "");
    // E: ゲージが足りなければ不発 → 満タンで発動
    await c.tap("Q"); await sleep(250); const e0 = await json(`${FC}.getLastResult()`);
    await ev("ProjectRUltimateGauge.addUltimateGauge(100, 'dev', 'fi1'); 'ok'"); await c.tap("Q"); await sleep(1200); const e1 = await json(`${FC}.getLastResult()`);
    rec("J4j E(奥義): ゲージ不足なら不発(gaugeNotFull)/ 満タンなら発動", e0.reason === "gaugeNotFull" && e1.ok === true && (await ev("ProjectRUltimateGauge.getUltimateGauge()")) === 0, JSON.stringify({ e0: e0.reason, e1: e1.ok }));
    // C: アイテム(短押し)。奥義の直後で HP は満タンなので、効果なし(noEffect)で消費しない
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'"); await c.tap("V"); await sleep(200);
    const k = await json(`${FC}.getLastResult()`);
    rec("J4k C(アイテム): 直前のポーションの Cooldown 中 / HP満タンなので、使われない(cooldown か noEffect)", k.slot === "consumable" && k.ok === false && (k.reason === "cooldown" || k.reason === "noEffect"), JSON.stringify(k));
    await s.shot("fi_J4");
  });

  await check("J5 扉と視界", async () => {
    await place(8, 8, 8); await c.pointer(960, 100); await sleep(300);
    const before = { C: await vis(3), A: await vis(1), B: await vis(2), doorPage: await ev("$gameMap.event(5)._pageIndex") };
    // 扉が閉じている間(隠れている間)も、敵のAIは止まらない: 最初の位置から、扉の近くまで追いかけている(見えないまま)
    const init = await json("window.__init");
    const now = await json("({ a: [$gameMap.event(1)._realX, $gameMap.event(1)._realY], b: [$gameMap.event(2)._realX, $gameMap.event(2)._realY], c: [$gameMap.event(3)._realX, $gameMap.event(3)._realY], rA: false })");
    // 敵の視界(壁・閉じた扉が視線を遮る)が入ったので、閉じた扉の向こうの敵は、プレイヤーを追ってこない(最初の位置のまま待つ)。AI(行動の登録)は残っている
    const idleHidden = Math.hypot(now.a[0] - init[0][0], now.a[1] - init[0][1]) < 0.05 && Math.hypot(now.b[0] - init[1][0], now.b[1] - init[1][1]) < 0.05 && Math.hypot(now.c[0] - init[2][0], now.c[1] - init[2][1]) < 0.05 && (await json(`${FC}.listEnemies()`)).length === 3;
    rec("J5pre 扉が閉じている間(敵は見えない)、敵は視線が通らないのでプレイヤーを追わず、最初の位置で待つ(AI は登録されたまま)", idleHidden && before.A === false && before.B === false && before.C === false && (await rendered(1)) === false, JSON.stringify({ init, now, before }));
    await c.tap("F"); await sleep(900);                                               // 扉に話しかける(F): 開く
    const after = await json(`({ page: $gameMap.event(5)._pageIndex, C: ${FW}.isEventVisible($gameMap.event(3)), A: ${FW}.isEventVisible($gameMap.event(1)), B: ${FW}.isEventVisible($gameMap.event(2)), sw: $gameSelfSwitches.value([8, 5, 'A']) })`);
    rec("J5a 扉を開く(F)と、閉じていたときに見えなかった敵が、視線が通って見える(扉のページ・セルフスイッチも切り替わる)", before.C === false && before.doorPage === 0 && after.page === 1 && after.sw === true && after.C === true, JSON.stringify({ before, after }));
    const pC = await tilePixel(8, 3), rC = await rendered(3);
    rec("J5b 見えている敵Cは描かれる(画面の色が黒ではない)", rC === true && !isBlack(pC), JSON.stringify({ rC, pC }));
    const scan = await leakScan();
    const consistent = await ev("$gameMap.events().filter(function(e){return e && !e._erased && e.databaseEnemy}).every(function(e){ var sp = SceneManager._scene._spriteset._tilemap.children.filter(function(c){return c._character === e})[0]; return !sp || sp.renderable === ProjectR.FogOfWar.isEventVisible(e); })");
    rec("J5c 見えている敵は描かれ、隠れている敵は描かれない(描画と視界の判定が一致・描画ツリーに漏れなし)", scan.leaks.length === 0 && consistent, JSON.stringify(scan));
    // 敵Cが扉から来て攻撃する: 見えるあいだは予兆が出る
    const sawTele = await wait(`${FC}.getHudState().telegraphs > 0`, 12000);
    rec("J5e 見えている敵が攻撃を溜めると、予兆(赤い範囲)が出る", sawTele, JSON.stringify(await json(`${FC}.getState().enemies`)));
    await s.shot("fi_J5");
  });

  await check("J6 攻撃と視界", async () => {
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    // 見えている敵(C)に当てる: 照準してクリック
    const alive = await ev("$gameMap.getCurrentEventHp(3) > 0");
    if (alive) {
      // 敵は視界(敵の視界)で、見つけると戸口まで来て、プレイヤーのすぐ前(銃弾の出る位置より手前)で止まる。当たり判定の確認なので、敵Cを少し離れた位置で止める(AI を外す)
      await ev(`${FC}.detachEnemy(3); $gameMap.event(3).locate(8, 5); 'ok'`); await sleep(500);
      const c0 = await hp(3); let shots = 0;
      while (shots < 5 && (await hp(3)) >= c0 && (await ev("$gameMap.getCurrentEventHp(3) > 0"))) {      // 敵は動くので、毎回いまの位置へ照準し直して撃つ(自動照準ではない)
        const p = await json("(function(){ var e = $gameMap.event(3); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()");
        await c.pointer(p.x, p.y); await sleep(150); await c.rightClick(undefined, undefined, 50); await sleep(700); shots++;
      }
      rec("J6a 見えている敵には、照準して撃てば当たってHPが減る(右クリックの銃)", (await hp(3)) < c0, JSON.stringify({ c0, c1: await hp(3), shots, dbg: await json("({ e: [$gameMap.event(3)._realX, $gameMap.event(3)._realY], p: [$gamePlayer._realX, $gamePlayer._realY], dead: ProjectR.PlayerDeath && ProjectR.PlayerDeath.isDead && ProjectR.PlayerDeath.isDead() })") }));
    }
    await ev(`${FC}.attachEnemy(3, { windupFrames: 30, cooldownFrames: 100, reach: 1.4, aggroTiles: 14 }); 'ok'`);
    // 扉を閉める: 開いた扉の前(北側)から話しかけ → 視線が遮られ、敵が消える
    const doorState = await ev("$gameSelfSwitches.value([8, 5, 'A'])");
    rec("J6b 扉は開いたまま(前の手順)", doorState === true, "");
  });

  await check("J7 勝利と後始末", async () => {
    for (const id of [1, 2, 3]) await kill(id);
    const back = await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000);
    const p = await pos();
    rec("J7a 勝利で元のマップ・位置へ戻る(入口の手前・上向き)", back && Math.abs(p.x - origin.x) < 0.01 && Math.abs(p.y - origin.y) < 0.01 && p.d === 8, JSON.stringify({ origin, p }));
    const after = await json(`({ v: $gameVariables.value(9), active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), hud: ProjectRBattleHUD.getViewModel().visible, cardBattle: ProjectRCardDeck.isCardBattleActive(), tele: ${FC}.getHudState().telegraphs, ids: ${FW}.getVisibleEventIds().every(function(id){ return !!$gameMap.event(id); }), keys: ${FC}.getState().diagnostics.keyDowns })`);
    rec("J7b 戦闘・HUD・戦闘の状態が残らない / 視界の状態に前のマップのイベントが残らない", after.v === 1 && !after.active && !after.allowed && after.hud === false && !after.cardBattle && after.tele === 0 && after.ids === true, JSON.stringify(after));
    const keep = await json(`({ m8: ${FW}.getExploredCount(8), m1: ${FW}.getExploredCount(1) })`);
    rec("J7c 探索の記憶はマップごとに残る(Map008 の分が保持される)", keep.m8 > 20, JSON.stringify(keep));
    // 戻ったMap001: 敵・スプライトが前のマップから残っていない / すべての敵が描かれる(霧は壁が無いので全部見える)
    const scan = await leakScan();
    const consistent = await ev("$gameMap.events().filter(function(e){return e && !e._erased && e.databaseEnemy}).every(function(e){ var sp = SceneManager._scene._spriteset._tilemap.children.filter(function(c){return c._character === e})[0]; return !sp || sp.renderable === ProjectR.FogOfWar.isEventVisible(e); })");
    rec("J7d 探索マップに戻ったあと、敵の描画は「いま見えるか」と一致し(画面外の敵は隠れ、画面内の敵は描かれる)、前のマップの隠れた状態が残らない", scan.leaks.length === 0 && consistent, JSON.stringify(scan));
    // 2回目: 入口から。扉・敵は初期状態(扉は閉・敵は生きている・前回の探索の記憶は残る)
    await place(24, 22, 8); await c.tap("W", 120); await sleep(300); await c.tap("F"); await sleep(500);
    await advance("!$gameMessage.isBusy() && !$gameMap.isEventRunning()", 8000); await sleep(500);          // 1回目: 前回の結果の表示(ページ2)
    await c.tap("F"); await sleep(500);
    await advance("$gameMap.mapId() === 8", 25000); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(700);
    const second = await json(`({ serial: ${FC}.getEncounterState().serial, door: $gameMap.event(5)._pageIndex, sw: $gameSelfSwitches.value([8, 5, 'A']), enemies: ${FC}.getEncounterState().enemies, hp: [1, 2, 3].map(function(id){ return $gameMap.getCurrentEventHp(id); }), vis: [1, 2, 3].map(function(id){ return ProjectR.FogOfWar.isEventVisible($gameMap.event(id)); }), explored: ${FW}.getExploredCount(8) })`);
    rec("J7e 2回目のエンカウンター: 扉は閉・敵3体は生きている・敵は見えない(初期状態)・探索の記憶は前回から残る", second.serial === 2 && second.door === 0 && second.sw === false && second.enemies.length === 3 && second.hp.every(h => h > 0) && second.vis.every(v => v === false) && second.explored > 20, JSON.stringify(second));
    const grayNorth = await tileState(8, 2);
    rec("J7f 前回見た北側は、探索済み(灰色の地形)として残る(敵は出ない)", grayNorth === "explored" && isGray(await tilePixel(8, 2)), JSON.stringify({ grayNorth }));
    // 戦闘中は、ほかの指輪の受け渡しを断る(正当な戦闘中の制限は保つ)
    const during = await json("ProjectRCardDeck.assignRingToPlayer('apollo')");
    rec("J7g 戦闘中(エンカウンター)は、指輪の受け渡しを従来どおり断る", during && during.ok === false && JSON.stringify(during).includes("RING_TRANSFER_DURING_BATTLE"), JSON.stringify(during));
  });

  await check("J8 撤退・敗北・ロード", async () => {
    // 撤退: 控え室のNPC(8,11)
    await place(8, 10, 2); await c.tap("S", 80); await sleep(200); await c.pointer(960, 900); await sleep(300); await c.tap("F"); await sleep(400);
    await advance("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 25000); await sleep(1200);
    const r = await json(`({ st: ${FC}.getEncounterState().state, v: $gameVariables.value(9), active: ${FC}.isActive(), save: $gameSystem.isSaveEnabled(), ring: ProjectRCardDeck.assignRingToPlayer('apollo').ok })`);
    rec("J8a 撤退(NPC)で戻り、結果=3・戦闘が残らない・セーブが戻る・指輪の受け渡しが再び可能", r.st === "idle" && r.v === 3 && !r.active && r.save && r.ring === true, JSON.stringify(r));
    await ev("ProjectRCardDeck.setRingUnowned && ProjectRCardDeck.setRingUnowned('apollo'); $gameVariables.setValue(9, 0); 'ok'");
    // 敗北 → ロード
    await place(24, 22, 8); await c.tap("W", 120); await sleep(300);
    await ev("window.__base = JsonEx.stringify(DataManager.makeSaveContents()); 'ok'");
    await c.tap("F"); await sleep(400);
    if (await ev("$gameVariables.value(9) > 0")) { await advance("!$gameMessage.isBusy() && !$gameMap.isEventRunning()", 8000); await sleep(400); await c.tap("F"); await sleep(400); } await advance("$gameMap.mapId() === 8", 25000); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(400);
    await ev("$gameParty.leader().setHp(0); 'ok'"); await sleep(2500);
    const d = await json(`({ map: $gameMap.mapId(), st: ${FC}.getEncounterState().state, v: $gameVariables.value(9), active: ${FC}.isActive(), save: $gameSystem.isSaveEnabled(), tele: ${FC}.getHudState().telegraphs })`);
    rec("J8b 敗北: 自動では戻らない・戦闘は片づく・結果=2・セーブ禁止のまま", d.map === 8 && d.st === "defeat" && d.v === 2 && !d.active && d.save === false, JSON.stringify(d));
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("DataManager.extractSaveContents(JsonEx.parse(window.__base)); SceneManager.goto(Scene_Map); 'ok'");
    await waitMap(1); await sleep(1500);
    const l = await json(`({ st: ${FC}.getEncounterState().state, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled(), weapon: ProjectRCombatPresence.canUseWeapon(), hud: ProjectRBattleHUD.getViewModel().visible, hp: $gameParty.leader().hp, m8: ${FW}.getExploredCount(8), m1: ${FW}.getExploredCount(1) })`);
    const scan = await leakScan();
    rec("J8c ロード後: エンカウンター・戦闘・HUD・セーブ禁止が初期状態 / 視界の描画が残らない / 探索の記憶はセーブ時点の値", l.st === "idle" && !l.active && !l.allowed && l.save && !l.weapon && l.hud === false && l.hp > 0 && scan.leaks.length === 0, JSON.stringify({ l, scan }));
    const k0 = await json(`${FC}.getState().diagnostics.keyDowns`);
    for (const k of ["Q", "E", "R", "C", "V", "Shift"]) await c.tap(k);
    await sleep(300);
    rec("J8d ロード後の探索マップでは、戦闘の入力が無効", (await json(`${FC}.getState().diagnostics.keyDowns`)) === k0, "");
    // 旧セーブ(探索の記録なし)
    const old = await json(`(function(){ var raw = JsonEx.parse(window.__base); delete raw.system._projectRFogExplored; return JsonEx.stringify(raw).length > 0; })()`);
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("(function(){ var raw = JsonEx.parse(window.__base); delete raw.system._projectRFogExplored; DataManager.extractSaveContents(raw); SceneManager.goto(Scene_Map); })(); 'ok'");
    await waitMap(1); await sleep(1500);
    const o = await json(`({ count: ${FW}.getExploredCount(), m8: ${FW}.getExploredCount(8), tile: ${FW}.getTileState($gamePlayer.x, $gamePlayer.y) })`);
    rec("J8e 旧セーブ(探索の記録なし)も読める(空から始まる)", old && o.m8 === 0 && o.tile === "visible", JSON.stringify(o));
  });

  await check("J9 性能・エラー・保存", async () => {
    await ev("$gameVariables.setValue(9, 0); 'ok'");
    await place(24, 22, 8); await c.tap("W", 120); await sleep(300); await c.tap("F"); await sleep(400);
    await advance("$gameMap.mapId() === 8", 25000); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(500);
    await place(8, 9, 8);
    await ev("(function(){ var sp = SceneManager._scene._spriteset; sp.__orig = sp.update; window.__ms = []; sp.update = function(){ var t = performance.now(); var r = sp.__orig.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
    const n0 = await ev("window.__ms.length"), t0 = Date.now();
    await c.keyDown("A"); await sleep(1500); await c.keyUp("A"); await c.keyDown("D"); await sleep(1500); await c.keyUp("D");
    const n1 = await ev("window.__ms.length"), t1 = Date.now();
    const perf = await json("(function(){ var sp = SceneManager._scene._spriteset; sp.update = sp.__orig; var a = window.__ms.slice().sort(function(x,y){return x-y}); var avg = a.reduce(function(s,x){return s+x},0)/a.length; return { frames: a.length, avgMs: +avg.toFixed(2), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2), maxMs: +a[a.length-1].toFixed(2) }; })()");
    const fps = +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1);
    await sleep(500); const stats0 = await json(`${FW}.getStats()`); await sleep(1200); const stats1 = await json(`${FW}.getStats()`);
    rec("J9a 戦闘中に動き続けても約60fps・1フレームの更新時間が小さい / 止まっている間は再計算しない", fps > 52 && perf.avgMs < 6 && stats1.rasterizes === stats0.rasterizes && stats1.maskRebuilds === stats0.maskRebuilds, JSON.stringify({ fps, perf, stats0: { r: stats0.rasterizes, m: stats0.maskRebuilds }, stats1: { r: stats1.rasterizes, m: stats1.maskRebuilds } }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await advance("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 25000); await sleep(800);
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("J9b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_integration_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
