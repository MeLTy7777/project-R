// 出入口(扉口)の渋滞(Stage 4b)の実機(Playtest)確認。F8 なし(startEncounter → Map008)。再現できる複数の敵の扉口シナリオを使う。
//   T1 倒した敵は、扉口でもすぐ通れる(予約を待たない)・後ろの敵が死体の上を通る・プレイヤーが死体の上を通って北へ行ける
//   T2 見失って扉口に固まった敵の列が、道を空ける(追わない・プレイヤーがどこにいても同じ)/ 北の部屋の敵は動かない
//   T3 扉口で前後を敵にはさまれたプレイヤーが、実キー(W/S)で抜けられる(ソフト衝突)・離れると戻る・壁と閉じた扉は通れない
//   T4 開いた扉・閉じた扉(追う/止まる)・敵3体で重ならない
//   T5 全員倒して勝利・繰り返しのエンカウンター(状態が残らない・同じ渋滞がまた解ける)
//   T6 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_traffic_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'tr', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1000); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
  const stats = () => json(`${FC}.getNavStats()`);
  const nav = id => json(`${FC}.getEnemyNav(${id})`);
  const E = () => json(`[1,2,3].map(function(i){ var e = $gameMap.event(i); return { i: i, x: e._realX, y: e._realY, thr: e._through, hp: $gameMap.getCurrentEventHp(i) }; })`);
  const P = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const passList = () => json("($gameSystem._playerPassThroughEvents || [])");
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // 扉口の列: 敵 ids を (8, ys) に縦に並べて attach(行動の設定 opts)。使わない敵は遠くへ(行動なし)
  const arrange = async (cfg, opts) => {
    const keep = cfg.map(l => l.id), park = { 1: [1, 1], 2: [15, 1], 3: [1, 5] };
    let code = [1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ");
    for (const i of [1, 2, 3]) if (!keep.includes(i)) code += ` var q${i} = $gameMap.event(${i}); q${i}.locate(${park[i][0]}, ${park[i][1]}); q${i}._realX = ${park[i][0]}; q${i}._realY = ${park[i][1]};`;
    for (const l of cfg) code += ` var e${l.id} = $gameMap.event(${l.id}); e${l.id}.locate(${l.x}, ${l.y}); e${l.id}._realX = ${l.x}; e${l.id}._realY = ${l.y}; e${l.id}.setDirection(${l.dir || 2}); ${FC}.attachEnemy(${l.id}, ${JSON.stringify(opts || {})});`;
    await ev(`(function(){ ${code} return 'ok'; })()`); await sleep(100);
  };
  const SLOW = { sightTiles: 16, fovDegrees: 360, windupFrames: 200, cooldownFrames: 300 };     // 長い溜め(攻撃は実行されにくい)
  const FILE = [{ id: 1, x: 8, y: 5 }, { id: 2, x: 8, y: 4 }, { id: 3, x: 8, y: 3 }];
  const gapHook = () => ev(`(function(){ window.__minGap = 9; var o = Scene_Map.prototype.update; window.__origSM = o; Scene_Map.prototype.update = function(){ var r = o.apply(this, arguments); var a = [1,2,3].map(function(i){ return $gameMap.event(i); }).filter(function(e){ return $gameMap.getCurrentEventHp(e.eventId()) > 0; }); for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) { var g = Math.max(Math.abs(a[i]._realX - a[j]._realX), Math.abs(a[i]._realY - a[j]._realY)); if (g < window.__minGap) window.__minGap = g; } return r; }; return 'ok'; })()`);
  const gapUnhook = () => ev("Scene_Map.prototype.update = window.__origSM; window.__minGap");

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }]); $gameMap._interpreter = it; return 'ok'; })()`);
  await sleep(600);

  await check("T1 倒した敵", async () => {
    await enter(); await door(true); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 9, 8);
    await arrange(FILE, { sightTiles: 16, fovDegrees: 360, windupFrames: 36, cooldownFrames: 90 }); await gapHook();
    await wait("$gameMap.event(1)._realY > 7.5", 8000);                                   // 先頭が扉口に着く(2番目が、すぐ後ろに続く)
    const before = await E();
    await kill(1);
    const t0 = Date.now(); const thrOk = await wait("$gameMap.event(1)._through === true && $gameMap.event(1)._setThroughReserve == null", 600); const ms = Date.now() - t0;
    const front = await E();
    await sleep(2500); const after = await E();
    const minGap = await gapUnhook();
    rec("T1a 倒した(扉口の先頭の)敵は、すぐ(0.6 秒以内・次のフレーム)通り抜け可能・DotMove の予約が残らない・優先度 0", thrOk === true && ms < 600 && (await json("$gameMap.event(1)._priorityType")) === 0, JSON.stringify({ thrOk, ms, front: front[0] }));
    rec("T1b 後ろの敵(2・3)が、死体の上を通って前へ進む(死体のいる位置を越える)・生きている敵同士は重ならない(最小の間隔 ≥ 0.9)", after[1].y > before[0].y + 0.3 && after[1].thr === false && minGap >= 0.9, JSON.stringify({ corpse: front[0], e2: after[1].y, e3: after[2].y, minGap: +minGap.toFixed(3) }));
    await kill(2); await sleep(300);
    await ev(`${FC}.detachEnemy(3); ${FC}.attachEnemy(3, { chase: false }); $gameMap.event(3).locate(12, 2); $gameMap.event(3)._realX = 12; $gameMap.event(3)._realY = 2; 'ok'`); await sleep(300);
    await place(8, 9, 8); await c.keyDown("W"); await sleep(3500); await c.keyUp("W"); const p = await P();
    rec("T1c プレイヤーが(実キー W)扉口の死体の上(2 体分)を通って、北の部屋へ行ける", p.y < 5.5 && (await passList()).length === 0, JSON.stringify({ p, passList: await passList() }));
    const st = await stats();
    rec("T1d 倒した敵(1・2)は敵の一覧から外れる(残りは 3 だけ)・経路探索の例外なし", JSON.stringify(await json(`${FC}.listEnemies()`)) === "[3]" && st.errors === 0, JSON.stringify(st));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
  });

  await check("T2 見失って固まった列が道を空ける", async () => {
    await enter(); await door(true); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 9, 8);
    await arrange(FILE, { sightTiles: 16, fovDegrees: 360, windupFrames: 36, cooldownFrames: 90 }); await gapHook();
    await sleep(1000);                                                                      // 扉口に先頭・その北に 2 体(縦の列)
    const file = await E(); const inDoorway = file.some(e => e.y > 6.6 && e.y < 7.5);
    await ev("$gamePlayer.locate(3, 10); $gamePlayer._realX = 3; $gamePlayer._realY = 10; $gamePlayer.setDirection(4); $gamePlayer.center(3, 10); 'ok'");   // 扉の正面の線を外れる(全員、見失う)
    await sleep(120); const blind = await json(`[1,2,3].map(function(i){ return ${FC}.getEnemyPerception(i).aware; })`);
    await sleep(4500); const done = await E(); const st = await stats(); const minGap = await gapUnhook();
    const stillInDoor = done.filter(e => e.hp > 0 && Math.floor(e.y + 0.5) === 7 && Math.floor(e.x + 0.5) === 8);
    rec("T2a 扉口に先頭が着いた状態で、プレイヤーが扉の正面から外れると、列の敵が見失う(再現。先頭は、位置によってはまだ見えている)", inDoorway && blind.filter(a => a === false).length >= 2, JSON.stringify({ file: file.map(e => +e.y.toFixed(2)), blind }));
    rec("T2b 4.5 秒後、扉口(8,7)に立ったままの敵はいない(従来は 3 体とも固まったまま)・道を空ける動きをした・重ならない", stillInDoor.length === 0 && st.yields >= 1 && minGap >= 0.9 && st.errors === 0, JSON.stringify({ done: done.map(e => [+e.x.toFixed(2), +e.y.toFixed(2)]), yields: st.yields, yieldFrames: st.yieldFrames, yieldBlocked: st.yieldBlocked, minGap: +minGap.toFixed(3) }));
    // 北の部屋に残っている敵は、見失っている間は動かない(追わない・プレイヤーの位置へ向かわない)
    const north = done.filter(e => e.y < 6.5), later = []; await sleep(1500); const d2 = await E();
    for (const e of north) { const o = d2.find(v => v.i === e.i); later.push(Math.hypot(o.x - e.x, o.y - e.y)); }
    rec("T2c 北の部屋に残った敵は、見失っている間は動かない(プレイヤーを追わない・向かわない)", later.every(m => m < 0.02), JSON.stringify({ north: north.map(e => e.i), later: later.map(v => +v.toFixed(3)) }));
    // 見えるようになれば、また追う(視界は従来どおり)
    await place(8, 10, 8); await sleep(2500); const d3 = await E(); const aw = await json(`[1,2,3].map(function(i){ return ${FC}.getEnemyPerception(i).aware; })`);
    rec("T2d 扉の正面へ戻ると、見える敵はまた追う(見つけた状態になる)", aw.some(a => a === true), JSON.stringify({ aw, ys: d3.map(e => +e.y.toFixed(2)) }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
  });

  await check("T3 扉口ではさまれたプレイヤー", async () => {
    await enter(); await door(true); await ev(`${FC}.resetNavStats(); 'ok'`);
    // 扉口(8,7)にプレイヤー。北(8,5.95)と南(8,8.05)に、接した敵
    await arrange([{ id: 1, x: 8, y: 5.95 }, { id: 2, x: 8, y: 8.05 }], { ...SLOW });
    await place(8, 7, 2); await sleep(900);
    const trapped0 = await P(), e0 = await E();
    await c.keyDown("S"); await sleep(300); await c.keyUp("S"); const stuck = await P();
    rec("T3a 再現: 扉口で前後を敵にはさまれて、最初は(南へ押しても)動けない", Math.abs(stuck.y - trapped0.y) < 0.06 && e0[0].y < 6.25 && e0[1].y > 7.9, JSON.stringify({ trapped0, stuck, e1: e0[0].y, e2: e0[1].y }));
    await c.keyDown("S"); await sleep(3000); await c.keyUp("S"); const out = await P(); const soft = await json(`${FC}.getSoftPass()`);
    rec("T3b 押し続けると(24 フレーム後)、南の敵だけ通り抜けられ、扉口の外(y>8.5)へ出られる(攻撃を待つ敵は、そのまま)", out.y > 8.5 && (await json(`${FC}.getNavStats()`)).softPass >= 1, JSON.stringify({ out, soft, st: (await stats()).softPass }));
    await sleep(1200); const lst = await passList(), soft2 = await json(`${FC}.getSoftPass()`);
    rec("T3c 体が離れたら、通り抜けを戻す(_playerPassThroughEvents は空・ソフト衝突の一覧も空)", lst.length === 0 && soft2.length === 0, JSON.stringify({ lst, soft2 }));
    // 壁・閉じた扉は通れない(通り抜けは敵のイベントだけ)
    await door(false); await arrange([{ id: 1, x: 8, y: 5 }], { ...SLOW }); await place(8, 8, 8); await c.keyDown("W"); await sleep(2500); await c.keyUp("W"); const atDoor = await P();
    await place(10, 8, 6); await c.keyDown("D"); await sleep(2500); await c.keyUp("D"); const atWall = await P();
    rec("T3d 閉じた扉(8,7)は通れない(y が 7.9 を超えて北へ行けない)・壁は通れない", atDoor.y > 7.85 && atWall.x < 15.05, JSON.stringify({ atDoor, atWall }));
    await door(true);
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const afterEnd = await passList();
    rec("T3e 戦闘が終わったら、通り抜けの一覧にソフト衝突のぶんが残らない(セーブデータに残さない)", afterEnd.length === 0, JSON.stringify(afterEnd));
  });

  await check("T4 扉の開閉・3体", async () => {
    await enter(); await ev(`${FC}.resetNavStats(); 'ok'`); await door(false); await place(8, 9, 8);
    await arrange(FILE, { sightTiles: 16, fovDegrees: 360, windupFrames: 36, cooldownFrames: 90 }); const d0 = await E(); await sleep(1500); const d1 = await E();
    rec("T4a 扉が閉じている間は、3 体とも追わない・動かない(壁の向こう)", d0.every((e, i) => dist(e, d1[i]) < 0.02), JSON.stringify({ d0: d0.map(e => +e.y.toFixed(2)), d1: d1.map(e => +e.y.toFixed(2)) }));
    await gapHook(); await door(true); await sleep(2500); const mid = await E();
    rec("T4b 扉を開けると、扉の正面の列が見つけて近づく(先頭が扉口を越える)", mid.some(e => e.y > 7.3), JSON.stringify({ ys: mid.map(e => +e.y.toFixed(2)) }));
    await door(false); await sleep(300); const closed1 = await E(); await sleep(1200); const closed2 = await E();
    const inNorth = closed2.filter(e => e.y < 6.7);
    rec("T4c 追っている最中に扉を閉じると、(北側に残っている敵は)その場で止まる・重ならない", inNorth.every(e => { const o = closed1.find(v => v.i === e.i); return dist(e, o) < 0.02; }) && (await gapUnhook()) >= 0.9 && (await passList()).length === 0, JSON.stringify({ inNorth: inNorth.map(e => e.i), closed: closed2.map(e => +e.y.toFixed(2)) }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
  });

  await check("T5 勝利・繰り返し", async () => {
    for (let round = 1; round <= 2; round++) {
      await enter();
      const fresh = await json(`({ door: $gameSelfSwitches.value([8, 5, 'A']), soft: ${FC}.getSoftPass(), pass: ($gameSystem._playerPassThroughEvents || []), enemies: ${FC}.listEnemies(), thr: [1,2,3].map(function(i){ return $gameMap.event(i)._through; }) })`);
      await door(true); await ev(`${FC}.resetNavStats(); 'ok'`); await place(8, 9, 8);
      await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
      await arrange(FILE, { ...SLOW }); await sleep(1100);
      await place(3, 10, 4); await sleep(4000);                                              // 渋滞を作って、解けるのを待つ
      const st = await stats(), d = await E();
      const doorwayFree = d.filter(e => Math.floor(e.y + 0.5) === 7 && Math.floor(e.x + 0.5) === 8).length === 0;
      rec(`T5a 繰り返し ${round}: 初期状態(扉は閉・敵 3 体・通り抜けなし・死んだ敵なし)→ 敵の列が扉口をふさがない(長い溜めの敵は溜め中のまま)`, fresh.door === false && fresh.soft.length === 0 && fresh.pass.length === 0 && fresh.enemies.length === 3 && fresh.thr.every(v => v === false) && doorwayFree && st.errors === 0, JSON.stringify({ fresh, doorwayFree, yields: st.yields }));
      // 3 体を、扉口の列のまま倒して勝利(死体が戸口に残っていても、勝利の判定・戻る処理は変わらない)
      await place(8, 9, 8); await sleep(600);
      for (const id of [1, 2, 3]) { await kill(id); await sleep(150); }
      const won = await wait(`${FC}.getEncounterState().state === 'leaving' || ${FC}.getEncounterState().state === 'idle' || $gameMap.mapId() === 1`, 12000);
      await leave();
      const after = await json(`({ pass: ($gameSystem._playerPassThroughEvents || []), soft: ${FC}.getSoftPass(), state: ${FC}.getEncounterState().state, map: $gameMap.mapId(), result: $gameVariables.value(9) })`);
      rec(`T5b 繰り返し ${round}: 全員倒すと勝利して元のマップへ戻る(結果の変数 1)・通り抜けの一覧は空`, won && after.map === 1 && after.state === 'idle' && after.result === 1 && after.pass.length === 0 && after.soft.length === 0, JSON.stringify(after));
    }
  });

  await check("T6 性能・エラー・保存", async () => {
    await enter(); await door(true); await place(8, 9, 8);
    await arrange(FILE, { sightTiles: 16, fovDegrees: 360, windupFrames: 36, cooldownFrames: 90 });
    const measure = async enabled => {
      await ev(`${FC}.setPathfinding(${enabled}); ${FC}.setSoftCollision(${enabled}); ${FC}.resetNavStats(); 'ok'`); await place(8, 9, 8);
      await arrange(FILE, { sightTiles: 16, fovDegrees: 360, windupFrames: 36, cooldownFrames: 90 });
      await ev("(function(){ var o = Scene_Map.prototype.update; window.__ms = []; window.__origGM = o; Scene_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now(); await sleep(1100); await place(3, 10, 4); await sleep(3000); const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Scene_Map.prototype.update = window.__origGM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3), maxMs: +a[a.length-1].toFixed(3) }; })()");
      return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const on = await measure(true), off = await measure(false); await ev(`${FC}.setPathfinding(true); ${FC}.setSoftCollision(true); 'ok'`);
    rec("T6a 扉口に敵 3 体の渋滞・解消の間の負荷は小さい(1 フレーム全体の平均の増加 < 0.4ms)・約60fps", on.fps > 52 && on.avgMs - off.avgMs < 0.4, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("T6b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_traffic_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
