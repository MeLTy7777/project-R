// フィールド戦闘 Stage 6B(命中の手応え: 点滅・反動・ヒットストップ・SE)の実機(Playtest)確認。CDP の実際のキー・マウスで操作し、フレームごとの記録で確かめる。
//   M  近接 1・2段目 / 3段目の強撃: 実際にダメージが入ったとき、当たった敵に 点滅・反動(絵だけ・攻撃の向き)・ヒットストップ・SE が出る。3段目は 点滅が長く・反動が大きく・SEが違う
//   G  銃: 弾の向きへ小さな反動・短い点滅・別のSE
//   X  外れ(敵が扇の外)では何も出ない / 薙ぎ払いが複数の敵に当たっても SE は1回・ヒットストップは当たった敵だけ
//   D  倒れた敵は止めない・動かさない(SEだけ)/ 勝利 → 元のマップへ戻り、何も残らない
//   T  時間・入力・Cooldown・他の敵のAIは止まらない(当たった敵だけが止まる)。Game_Event の位置は変わらない(押し戻しなし)
//   F  霧: 見えていない敵には、点滅・反動・SE・ヒットストップのどれも出ない
//   R  片づけ: 撤退・マップ移動・繰り返しの戦闘で、点滅・反動・ヒットストップ・予約が残らない
//   P  性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_hitfx_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const ONLY = process.env.ONLY || "";
  const check = async (id, fn) => { if (ONLY && !id.startsWith(ONLY)) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const hitfx = () => json(`${FC}.getHitFx()`);
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const putEnemy = (id, x, y) => ev(`(function(){ var e = $gameMap.event(${id}); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`);
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") await leave(); await ev(`${FC}.startEncounter({ encounterId: 'h6b', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  // 静止した的: AI を切り、位置を決め、HPを大きくする
  const targets = async (list, life = 100000) => { for (const [id, x, y] of list) { await ev(`${FC}.detachEnemy(${id}); 'ok'`); await putEnemy(id, x, y); await setHp(id, life); } await sleep(300); };
  const aimAt = async (dx, dy) => { const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); await c.pointer(p.x + dx * 48, p.y + dy * 48); await sleep(250); };
  const aimEvent = async id => { const p = await json(`({ x: Math.round($gameMap.event(${id}).screenX()), y: Math.round($gameMap.event(${id}).screenY() - 24) })`); await c.pointer(p.x, p.y); await sleep(250); };
  // 近接は、静止した的にもときどき(約4〜12%)当たらないことがある(手応えのオン/オフに関係なく。Stage 5 の判定側の既存の現象)。
  // 当たりが前提の測定は、当たるまで最大3回やり直す(最後の結果を返す)。当たらなかったクリックでは何も出ないこと自体は、X1 で確かめる。
  const retry = async (fn, ok, n = 3) => { let r; for (let i = 0; i < n; i++) { r = await fn(i); if (ok(r)) break; } return r; };
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");

  // フレームごとの記録: 敵の絵のずれ(反動)・点滅・ヒットストップの残り・敵と主人公の位置・Cooldown。SE の再生も記録する
  const REC = `(function(ids) { window.__rows = []; window.__se = []; window.__recIds = ids;
    if (!window.__recInstalled) { window.__recInstalled = true; var o = Spriteset_Map.prototype.update; Spriteset_Map.prototype.update = function() { var r = o.apply(this, arguments);
      if (window.__recOn) { var sp = SceneManager._scene._spriteset; (window.__recIds || []).forEach(function(id) { var e = $gameMap.event(id); if (!e) return; var spr = sp._characterSprites.filter(function(x) { return x._character === e; })[0];
        window.__rows.push({ f: Graphics.frameCount, id: id, dx: spr ? Math.round((spr.x - e.screenX()) * 100) / 100 : null, dy: spr ? Math.round((spr.y - e.screenY()) * 100) / 100 : null, a: spr ? spr._blendColor[3] : null, flashFlag: spr ? !!spr._projectRHitFlash : null,
          hs: window.ProjectRHitStop ? ProjectRHitStop.remaining(e) : 0, rx: e._realX, ry: e._realY, hp: $gameMap.getCurrentEventHp(id), px: $gamePlayer._realX, py: $gamePlayer._realY, cd: ProjectRFieldCombat.getCooldowns().special }); }); }
      return r; };
      var se = AudioManager.playSe; AudioManager.playSe = function(x) { if (window.__recOn) window.__se.push({ n: x.name, f: Graphics.frameCount, v: x.volume, p: x.pitch }); return se.apply(this, arguments); }; }
    window.__recOn = true; return 'ok'; })`;
  const startRec = ids => ev(`${REC}(${JSON.stringify(ids)})`);
  const stopRec = async () => { await ev("window.__recOn = false; 'ok'"); return json("({ rows: window.__rows, se: window.__se })"); };
  const rowsOf = (r, id) => r.rows.filter(x => x.id === id);
  const hitFrame = (rows, id0) => { const first = rows.find(x => x.hp < rows[0].hp); return first ? first.f : null; };
  const maxBy = (rows, key) => Math.max(...rows.map(x => Math.abs(x[key] || 0)));
  const flashLen = rows => rows.filter(x => x.a > 0).length;
  const hsMax = rows => Math.max(...rows.map(x => x.hs || 0));
  const seNames = r => r.se.map(x => x.n);
  const hitSes = r => r.se.filter(x => /^(Blow|Damage)/.test(x.n));

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  await sleep(300);

  // ---------------------------------------------------------------- M 近接 1〜3
  let meleePeak = 0, meleeFlash = 0;
  await check("M 近接", async () => {
    await enter(); await door(true);
    await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
    await place(8, 10, 6); await topUp(); await aimAt(5, 0);
    const info = await hitfx();
    rec("M0 命中の通知を、剣・銃の両方から受け取っている・設定は既定(ヒットストップ 3/6/2・反動 4/10/3)", info.listening.sword === true && info.listening.gun === true && info.config.hitstop.melee === 3 && info.config.hitstop.heavy === 6 && info.config.hitstop.gun === 2 && info.config.recoil.melee === 4 && info.config.recoil.heavy === 10 && info.config.recoil.gun === 3, JSON.stringify({ l: info.listening, h: info.config.hitstop, r: info.config.recoil }));
    const hit = async n => { await setHp(1, 100000); await sleep(2000); await startRec([1]); const b = await hitfx(); await c.click(); await sleep(900); const r = await stopRec(); const a = await hitfx(); return { r, b, a, rows: rowsOf(r, 1) }; };
    // 1段目
    const m1 = await retry(() => hit(1), r => hitFrame(r.rows) !== null); const f1 = hitFrame(m1.rows), pre = m1.rows[0];
    meleePeak = maxBy(m1.rows, "dx"); meleeFlash = flashLen(m1.rows);
    const rowsAfter = m1.rows.filter(x => x.f >= f1);
    rec("M1 1段目: 実際にHPが減ったときに手応えが出る(確認 +1・SE は 斬撃 Slash2 と 命中 Blow1 の1回ずつ)", f1 !== null && m1.a.stats.confirmed === m1.b.stats.confirmed + 1 && seNames(m1.r).filter(n => n === "Slash2").length === 1 && hitSes(m1.r).length === 1 && hitSes(m1.r)[0].n === "Blow1", JSON.stringify({ hitFrame: f1, conf: [m1.b.stats.confirmed, m1.a.stats.confirmed], se: seNames(m1.r) }));
    const dxMax = Math.max(...m1.rows.map(x => x.dx)), dyMax = maxBy(m1.rows, "dy"), peakAt = (m1.rows.find(x => x.dx === dxMax) || {}).f - f1;
    const back = m1.rows.filter(x => x.f >= f1 + 14).every(x => Math.abs(x.dx) < 0.3 && Math.abs(x.dy) < 0.3);
    rec("M2 反動(絵だけ): 敵は主人公の東 → 東へ最大 約4px・縦はほぼ動かない・約3フレームで最大・14フレーム後は元に戻る", dxMax >= 2.5 && dxMax <= 4.6 && dyMax < 1 && peakAt >= 1 && peakAt <= 5 && back, JSON.stringify({ dxMax, dyMax, peakAt, back }));
    const flashRows = m1.rows.filter(x => x.a > 0), fl = flashLen(m1.rows);
    rec("M3 点滅: 命中の直後から約6フレーム白く光り、終わると元(0)に戻る・フラグも戻る", fl >= 4 && fl <= 8 && flashRows[0].f - f1 <= 2 && m1.rows.slice(-5).every(x => x.a === 0 && x.flashFlag === false), JSON.stringify({ fl, start: flashRows[0] && flashRows[0].f - f1, tail: m1.rows.slice(-2).map(x => [x.a, x.flashFlag]) }));
    const stopped = rowsAfter.filter(x => x.hs > 0), moved = Math.abs(m1.rows[m1.rows.length - 1].rx - pre.rx) + Math.abs(m1.rows[m1.rows.length - 1].ry - pre.ry);
    rec("M4 ヒットストップ: 当たった敵だけ約3フレーム止まる(残りフレームが記録される)・Game_Event の位置は変わらない(押し戻しなし)", hsMax(m1.rows) >= 2 && hsMax(m1.rows) <= 3 && stopped.length >= 2 && moved < 1e-6, JSON.stringify({ hs: hsMax(m1.rows), stoppedFrames: stopped.length, moved }));
    rec("M5 手応えは終わると何も残らない(予約・点滅・反動の記録が空)", m1.a.active.length === 0 && m1.a.pending.length === 0, JSON.stringify({ active: m1.a.active.length, pending: m1.a.pending.length }));
    // 2段目・3段目(強撃)
    await sleep(1200);
    const three = async () => {                                                                    // 1段目 → 2段目 → 3段目(強撃)。近接はときどき当たらないことがある(既存の現象)ので、3回とも当たるまで最大3回やり直す
      await setHp(1, 100000); await sleep(1800); await startRec([1]);
      for (let i = 0; i < 3; i++) { await c.click(); await sleep(650); }
      await sleep(1000); const rr = await stopRec(); const rw = rowsOf(rr, 1);
      const hh = []; let pv = rw[0].hp; for (const x of rw) { if (x.hp < pv) hh.push(x.f); pv = x.hp; }
      await sleep(1000);
      return { r3: rr, rows: rw, hits: hh };
    };
    const t3 = await retry(three, x => x.hits.length === 3);
    const r3 = t3.r3, rows = t3.rows, hits = t3.hits, a3 = await hitfx();
    const hs3 = hitSes(r3).map(x => x.n);
    rec("M6 2段目・3段目: 3回のクリックで3回HPが減り、命中SEは Blow1 → Blow1 → Blow6(強撃は別のSE・低いピッチ)", hits.length === 3 && hs3.join(",") === "Blow1,Blow1,Blow6" && (hitSes(r3)[2].p < hitSes(r3)[0].p), JSON.stringify({ hits, se: hs3, pitch: hitSes(r3).map(x => x.p) }));
    const lastHit = hits[2], heavyRows = rows.filter(x => x.f >= lastHit - 1);
    const hpeak = maxBy(heavyRows, "dx"), hflash = flashLen(heavyRows), hhs = hsMax(heavyRows);
    rec("M7 3段目の強撃: 反動が大きく(約10px・通常の2倍以上)・点滅が長く(約10フレーム)・ヒットストップが長い(約6フレーム)", hpeak >= 7 && hpeak > meleePeak * 1.7 && hflash >= 8 && hflash > meleeFlash && hhs >= 5 && hhs <= 6, JSON.stringify({ meleePeak, hpeak, meleeFlash, hflash, hs: hhs }));
    rec("M8 3段目も1回の攻撃につきSEは1回(2回目の扇で同じ敵に重ねて鳴らさない)・位置は動かない", hitSes(r3).length === 3 && Math.abs(rows[rows.length - 1].rx - rows[0].rx) < 1e-6, JSON.stringify({ n: hitSes(r3).length }));
    await s.shot("h6b_M_done");
  });

  // ---------------------------------------------------------------- G 銃
  await check("G 銃", async () => {
    await door(true); await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
    await place(6, 10, 6); await topUp(); await aimEvent(1); await setHp(1, 100000); await sleep(1500);
    await startRec([1]); const b = await hitfx(); await c.rightClick(); await sleep(1100); const r = await stopRec(); const a = await hitfx(); const rows = rowsOf(r, 1);
    const f = hitFrame(rows), dxMax = Math.max(...rows.map(x => x.dx));
    rec("G1 銃で当たると、実際にHPが減ったときだけ手応えが出る(確認 +1・SE は 射撃 + 命中 Damage1 の1回)", f !== null && a.stats.confirmed === b.stats.confirmed + 1 && hitSes(r).length === 1 && hitSes(r)[0].n === "Damage1", JSON.stringify({ hitFrame: f, se: seNames(r), conf: [b.stats.confirmed, a.stats.confirmed] }));
    rec("G2 銃は小さな手応え: 反動は弾の向き(東)へ 約3px・点滅は短い(約4フレーム)・ヒットストップは約2フレーム・位置は動かない", dxMax >= 1.5 && dxMax <= 3.3 && flashLen(rows) >= 2 && flashLen(rows) <= 5 && hsMax(rows) >= 1 && hsMax(rows) <= 2 && Math.abs(rows[rows.length - 1].rx - rows[0].rx) < 1e-6, JSON.stringify({ dxMax, flash: flashLen(rows), hs: hsMax(rows) }));
    rec("G3 銃の命中SEは近接と違う(ダメージ音・音量が小さい)", hitSes(r)[0].n !== "Blow1" && hitSes(r)[0].v < 55, JSON.stringify(hitSes(r)));
  });

  // ---------------------------------------------------------------- X 外れ・複数
  await check("X 外れと複数", async () => {
    await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
    await place(8, 10, 6); await topUp(); await aimAt(-5, 0); await sleep(1200); await startRec([1]); const b = await hitfx();
    await c.click(); await sleep(900); const miss = await stopRec(); const a = await hitfx();
    rec("X1 外れ(敵は扇の外・真後ろ): HPは減らず、命中SE・点滅・反動・ヒットストップのどれも出ない(斬撃のSEだけ)", rowsOf(miss, 1).every(x => x.hp === rowsOf(miss, 1)[0].hp && x.a === 0 && Math.abs(x.dx) < 0.01 && x.hs === 0) && hitSes(miss).length === 0 && a.stats.confirmed === b.stats.confirmed && a.stats.notified === b.stats.notified, JSON.stringify({ se: seNames(miss), notified: [b.stats.notified, a.stats.notified] }));
    // 複数: 東に3体(上・正面・下)
    const multiShot = async () => {
      await sleep(1500); await targets([[1, 10, 10], [2, 10, 9], [3, 10, 11]]); await aimAt(5, 0); await sleep(1200);
      await startRec([1, 2, 3]); const b2 = await hitfx(); await c.click();
      const seen = new Set(); for (let i = 0; i < 12; i++) { for (const x of await json("ProjectRHitStop.getActive()")) seen.add(x.eventId); await sleep(30); }
      await sleep(700); const multi = await stopRec(); const a2 = await hitfx();
      return { b2, a2, seen, multi, hit3: [1, 2, 3].filter(id => rowsOf(multi, id).some((x, i, arr) => x.hp < arr[0].hp)) };
    };
    const { b2, a2, seen, multi, hit3 } = await retry(multiShot, r => r.hit3.length === 3);
    rec("X2 薙ぎ払いが3体に当たる: 3体ともHPが減り、命中SEは1回だけ(2体目・3体目は鳴らさない)", hit3.length === 3 && hitSes(multi).length === 1 && a2.stats.seSkipped >= b2.stats.seSkipped + 2, JSON.stringify({ hit3, se: seNames(multi), skipped: [b2.stats.seSkipped, a2.stats.seSkipped] }));
    rec("X3 ヒットストップは当たった3体にだけ・点滅と反動も3体それぞれに出る(他の敵・主人公は止まらない)", [1, 2, 3].every(id => seen.has(id)) && seen.size === 3 && [1, 2, 3].every(id => flashLen(rowsOf(multi, id)) >= 4 && maxBy(rowsOf(multi, id), "dx") + maxBy(rowsOf(multi, id), "dy") > 1.5), JSON.stringify({ seen: [...seen], flash: [1, 2, 3].map(id => flashLen(rowsOf(multi, id))) }));
    const up = rowsOf(multi, 2), down = rowsOf(multi, 3);
    rec("X4 反動の向きは、主人公から敵への向き(上の敵は上へ・下の敵は下へ・正面は東へ)", Math.min(...up.map(x => x.dy)) < -1 && Math.max(...down.map(x => x.dy)) > 1 && Math.max(...rowsOf(multi, 1).map(x => x.dx)) > 2, JSON.stringify({ upDy: Math.min(...up.map(x => x.dy)), downDy: Math.max(...down.map(x => x.dy)), frontDx: Math.max(...rowsOf(multi, 1).map(x => x.dx)) }));
  });

  // ---------------------------------------------------------------- T 時間・入力・他の敵のAIは止まらない
  await check("T 時間と入力", async () => {
    // AI のある敵 2体(A=主人公の東・B=西)。ヒットストップを長く(12フレーム)して見えやすくする(あとで戻す)
    await enter(); await door(true); await ev(`${FC}.setHitFeedback({ hitstop: { melee: 12 } }); 'ok'`);
    await place(8, 10, 6); await putEnemy(1, 10, 10); await putEnemy(2, 3, 10); await putEnemy(3, 14, 2); await ev("$gameMap.event(3).locate(14, 2); 'ok'"); await setHp(1, 100000); await setHp(2, 100000); await topUp();
    await aimAt(0, -5); await ev("ProjectRFieldCombat.useAbility('special', 'test'); 'ok'"); await sleep(400);     // 一閃の Cooldown(7秒)が進む様子を見る(敵のいない北へ)
    const tryT = async () => {
      await place(8, 10, 6); await putEnemy(1, 10, 10); await putEnemy(2, 3, 10); await ev("$gameMap.event(1).setDirection(4); $gameMap.event(2).setDirection(6); 'ok'"); await setHp(1, 100000); await setHp(2, 100000); await aimAt(5, 0); await sleep(200);
      await startRec([1, 2]); await sleep(150); await c.keyDown("W"); await c.click(); await sleep(700); await c.keyUp("W"); const rr = await stopRec(); await sleep(1500); return rr;
    };
    const r = await retry(tryT, rr => hitFrame(rowsOf(rr, 1)) !== null);
    const A = rowsOf(r, 1), B = rowsOf(r, 2), fA = hitFrame(A);
    const win = A.filter(x => x.f >= fA && x.hs > 0);
    const winFrames = win.map(x => x.f), inWin = rows => rows.filter(x => winFrames.includes(x.f));
    rec("T1 ヒットストップ(12フレームに延長して測定): 当たった敵 A は止まり(位置が変わらない)、AI のある別の敵 B は同じ間も進み続ける", win.length >= 8 && Math.abs(inWin(A)[inWin(A).length - 1].rx - inWin(A)[0].rx) < 1e-6 && Math.abs(inWin(B)[inWin(B).length - 1].rx - inWin(B)[0].rx) > 0.01, JSON.stringify({ frozenFrames: win.length, aMoved: inWin(A).length && inWin(A)[inWin(A).length - 1].rx - inWin(A)[0].rx, bMoved: inWin(B).length && inWin(B)[inWin(B).length - 1].rx - inWin(B)[0].rx }));
    const P = A.filter(x => winFrames.includes(x.f));
    const cdSteps = P.slice(1).map((x, i) => P[i].cd - x.cd), pySteps = P.slice(1).map((x, i) => x.py - P[i].py);
    rec("T2 止まっている間も、時計(Cooldown)は毎フレーム進み(1/60秒ずつ)・プレイヤーは入力どおり動き続ける(W 押しっぱなしで北へ)", cdSteps.length >= 6 && cdSteps.every(d => d > 0.014 && d < 0.019) && pySteps.filter(d => d < -0.001).length >= Math.floor(pySteps.length * 0.8), JSON.stringify({ cd: cdSteps.slice(0, 4), py: pySteps.slice(0, 4), n: cdSteps.length }));
    await ev(`${FC}.setHitFeedback({ hitstop: { melee: 3 } }); 'ok'`);
  });

  // ---------------------------------------------------------------- D 倒れる・勝利
  await check("D 倒れる・勝利", async () => {
    await enter(); await door(true); await targets([[1, 10, 10], [2, 10, 9], [3, 10, 11]]); await place(8, 10, 6); await topUp(); await aimAt(5, 0);
    const killShot = async () => {
      await setHp(1, 20); await setHp(2, 100000); await setHp(3, 100000); await sleep(600);
      await startRec([1, 2, 3]); await c.click();
      const sn = new Set(); for (let i = 0; i < 14; i++) { for (const x of await json("ProjectRHitStop.getActive()")) sn.add(x.eventId); await sleep(30); }
      await sleep(600); const rr = await stopRec(); return { seen: sn, r: rr, a: await hitfx() };
    };
    const ks = await retry(killShot, k => rowsOf(k.r, 1).some(x => x.hp <= 0) && [2, 3].every(id => rowsOf(k.r, id).some(x => x.hp < rowsOf(k.r, id)[0].hp)));
    const seen = ks.seen, r = ks.r, a = ks.a;
    const dead = rowsOf(r, 1), killedAt = dead.find(x => x.hp <= 0);
    rec("D1 倒した敵(1): 止めない・動かさない(ヒットストップ・反動なし)・命中SEは1回だけ(他の2体への分は鳴らさない)", !!killedAt && !seen.has(1) && seen.has(2) && seen.has(3) && dead.every(x => Math.abs(x.dx) < 0.01) && hitSes(r).length === 1 && a.stats.killed >= 1, JSON.stringify({ killed: !!killedAt, frozen: [...seen], se: hitSes(r).map(x => x.n), stats: a.stats.killed }));
    await sleep(800);
    rec("D2 倒れた敵の手応えは残らない(消えた敵の分は捨てる)", (await hitfx()).active.every(x => x.eventId !== 1), JSON.stringify((await hitfx()).active.map(x => x.eventId)));
    // 勝利: 残りを倒す → 元のマップへ戻り、何も残らない
    await setHp(2, 0); await setHp(3, 0); await leave();
    const after = await json(`({ map: $gameMap.mapId(), active: ${FC}.isActive(), hitfx: ${FC}.getHitFx(), stops: ProjectRHitStop.getActive(), flashed: SceneManager._scene._spriteset._characterSprites.filter(function(s) { return s._projectRHitFlash; }).length })`);
    rec("D3 勝利 → 元のマップへ戻る。点滅・反動・ヒットストップ・予約が残らない(絵にも点滅が残らない)", after.map === 1 && after.active === false && after.hitfx.active.length === 0 && after.hitfx.pending.length === 0 && after.stops.length === 0 && after.flashed === 0, JSON.stringify({ map: after.map, active: after.hitfx.active.length, pending: after.hitfx.pending.length, stops: after.stops.length, flashed: after.flashed }));
  });

  // ---------------------------------------------------------------- F 霧
  await check("F 霧", async () => {
    await enter(); await door(true); await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
    await place(8, 10, 6); await topUp(); await aimAt(5, 0); await sleep(1500);
    // 霧の判定を、敵 1 だけ「見えていない」に差し替える(この検証のページ内だけ。命中は本物の斬撃)
    await ev("(function(){ var f = ProjectR.FogOfWar; window.__origVis = f.isEventVisible; f.isEventVisible = function(e) { return e && e.eventId && e.eventId() === 1 ? false : window.__origVis.apply(this, arguments); }; return 'ok'; })()");
    await startRec([1]); const b = await hitfx(); await c.click(); await sleep(900); const r = await stopRec(); const a = await hitfx(); const rows = rowsOf(r, 1);
    rec("F1 見えていない敵に当たっても(HPは減る)、命中SE・点滅・反動・ヒットストップのどれも出ない(位置がもれない)", rows.some(x => x.hp < rows[0].hp) && hitSes(r).length === 0 && rows.every(x => x.a === 0 && Math.abs(x.dx) < 0.01 && x.hs === 0) && a.stats.hidden === b.stats.hidden + 1, JSON.stringify({ se: seNames(r), hidden: [b.stats.hidden, a.stats.hidden] }));
    await ev("ProjectR.FogOfWar.isEventVisible = window.__origVis; 'ok'"); await sleep(1500);
    const visShot = async () => { await setHp(1, 100000); await sleep(1500); await startRec([1]); await c.click(); await sleep(900); return stopRec(); };
    const r2 = await retry(visShot, rr => rowsOf(rr, 1).some(x => x.hp < rowsOf(rr, 1)[0].hp));
    rec("F2 見えるようになれば、手応えが出る", hitSes(r2).length === 1 && flashLen(rowsOf(r2, 1)) >= 4, JSON.stringify({ se: seNames(r2) }));
  });

  // ---------------------------------------------------------------- R 片づけ(撤退・マップ移動・繰り返し)
  await check("R 片づけ", async () => {
    for (const round of [1, 2, 3]) {
      await enter(); await door(true); await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
      await place(8, 10, 6); await topUp(); await aimAt(5, 0); await sleep(600); await c.click(); if (!(await wait(`${FC}.getHitFx().active.length + ${FC}.getHitFx().pending.length > 0`, 900))) { await sleep(700); await c.click(); await wait(`${FC}.getHitFx().active.length + ${FC}.getHitFx().pending.length > 0`, 900); }
      const mid = await hitfx();
      if (round === 1) await ev(`${FC}.end('retreat'); 'ok'`);
      else if (round === 2) { await ev("$gamePlayer.reserveTransfer(1, 24, 22, 8, 0); 'ok'"); await waitMap(1); await sleep(900); }
      else { await ev(`${FC}.cancelEncounter ? ${FC}.cancelEncounter('retreat') : ${FC}.end('retreat'); 'ok'`); await sleep(1500); }
      const after = await json(`({ hitfx: ${FC}.getHitFx(), stops: ProjectRHitStop.getActive(), flashed: SceneManager._scene._spriteset._characterSprites.filter(function(s) { return s._projectRHitFlash; }).length, active: ${FC}.isActive() })`);
      rec(`R${round} ${["撤退", "マップ移動", "中断"][round - 1]}: 手応えの途中で戦闘が終わっても、点滅・反動・ヒットストップ・予約が残らない(絵の点滅も戻る)`, (mid.active.length + mid.pending.length) >= 1 && after.hitfx.active.length === 0 && after.hitfx.pending.length === 0 && after.stops.length === 0 && after.flashed === 0 && after.active === false, JSON.stringify({ mid: [mid.active.length, mid.pending.length], after: [after.hitfx.active.length, after.hitfx.pending.length, after.stops.length, after.flashed] }));
      if ((await ev("$gameMap.mapId()")) !== 1) { await ev("$gamePlayer.reserveTransfer(1, 24, 22, 8, 0); 'ok'"); await waitMap(1); await sleep(800); }
    }
    // 繰り返しのあとも、最初の戦闘と同じように手応えが出る
    await enter(); await door(true); await targets([[1, 10, 10], [2, 2, 2], [3, 14, 2]]); await ev("$gameMap.event(2).locate(2, 2); $gameMap.event(3).locate(14, 2); 'ok'");
    await place(8, 10, 6); await topUp(); await aimAt(5, 0); await sleep(800);
    const r = await retry(async () => { await setHp(1, 100000); await sleep(1200); await startRec([1]); await c.click(); await sleep(900); return stopRec(); }, rr => rowsOf(rr, 1).some(x => x.hp < rowsOf(rr, 1)[0].hp));
    rec("R4 3回繰り返したあとの戦闘でも、手応えが出る(SE が1回・点滅・反動)", hitSes(r).length === 1 && flashLen(rowsOf(r, 1)) >= 4 && maxBy(rowsOf(r, 1), "dx") > 2, JSON.stringify({ se: seNames(r), flash: flashLen(rowsOf(r, 1)) }));
  });

  // ---------------------------------------------------------------- P 性能・エラー・保存
  await check("P 性能", async () => {
    await targets([[1, 10, 10], [2, 10, 9], [3, 10, 11]]); await place(8, 10, 6); await topUp(); await aimAt(5, 0);
    await ev("(function(){ var o = Scene_Map.prototype.update; window.__ms = []; window.__origSM = o; Scene_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
    const t0 = Date.now(); while (Date.now() - t0 < 7000) { for (const id of [1, 2, 3]) await setHp(id, 100000); await c.click(); await sleep(350); await c.rightClick(); await sleep(250); }
    const r = await json("(function(){ Scene_Map.prototype.update = window.__origSM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2), maxMs: +a[a.length-1].toFixed(2) }; })()");
    const fps = await ev("(function(){ return new Promise(function(res){ var n = 0, t0 = performance.now(); function f(){ n++; if (performance.now() - t0 >= 1500) res(Math.round(n * 1000 / (performance.now() - t0) * 10) / 10); else requestAnimationFrame(f); } requestAnimationFrame(f); }); })()").catch(() => null);
    const st = (await hitfx()).stats;
    rec("P1 連続で当て続けても軽い(Scene_Map.update の平均 < 6ms・p95 < 12ms)/ 約60fps・手応えが積み上がらない", r.avgMs < 6 && r.p95Ms < 12 && (fps === null || fps > 52) && (await hitfx()).pending.length < 8, JSON.stringify({ r, fps, confirmed: st.confirmed, se: st.se, seSkipped: st.seSkipped }));
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("P2 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const bad = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - bad}/${s.results.length} PASS`); require("fs").writeFileSync(`${process.env.MZ_OUT || "mz_out"}/field_hitfx_verify.json`, JSON.stringify(s.results, null, 1)); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FATAL", e.stack); process.exit(2); });
