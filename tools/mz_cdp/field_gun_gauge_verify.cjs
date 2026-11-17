// フィールド戦闘 Stage 6D(銃の至近距離・壁・ゲージの与ダメージ)の実機(Playtest)確認。CDP の実際のマウス・キーで撃ち・斬り、敵のHPの減りとゲージを測る。
//   乱数は、この検証のページ内だけ固定する(Math.random = 0.5 = 回避・会心・分散なし。回避の確認だけ 0)。ゲームのファイル・セーブは変えない。
//   原因(銃): 弾は銃口(プレイヤーの中心から約1〜2.4マス先。真北は約2.35マス)に出るので、それより手前にいる敵に重ならず、当たらなかった。
//   原因(ゲージ): Hendrix は HP を「次のフレーム」で減らすため、攻撃の呼び出しの前後の差が 0 になり、与ダメージのゲージが増えなかった(近接・銃・カードのどれも)。
//   G1 銃の死角: 16方向 × 距離(0.7・1.0・1.5・2.0マス)= 64発すべてが当たる(以前は真北 1.6 マス以内・上半面の 0.7 マスで外れた)。ダメージは遠くのときと同じ・弾は1発減る
//   G2 壁: 体と弾の間(閉じた扉・壁)に壁があれば当たらない。壁を背にした至近距離の敵(壁の手前)には当たる
//   G3 ゲージ: 近接(1・2・3段)・銃・薙ぎ払いが複数の敵に当たる・連続した銃撃のすべてで、ゲージの増え方 = 実際に減ったHP × 0.0025(二重にも取りこぼしもない)。回避(ダメージ 0)は増えない。待ちが残らない
//   G4 繰り返しの戦闘: 戦闘ごとにゲージは 0 から。待ちが残らない・銃と近接が毎回同じように当たる
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_gun_gauge_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(350); };
  const putEnemy = (id, x, y) => ev(`(function(){ var e = $gameMap.event(${id}); e.locate(Math.round(${x}), Math.round(${y})); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`);
  const aimBearing = async (deg, tiles = 5) => { const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); const r = deg * Math.PI / 180; await c.pointer(Math.round(p.x + Math.sin(r) * tiles * 48), Math.round(p.y - Math.cos(r) * tiles * 48)); await sleep(200); };
  const aimEvent = async id => { const p = await json(`({ x: Math.round($gameMap.event(${id}).screenX()), y: Math.round($gameMap.event(${id}).screenY() - 24) })`); await c.pointer(p.x, p.y); await sleep(150); };
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); } await ev(`${FC}.startEncounter({ encounterId: 'gg', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const gauge = () => json("ProjectRUltimateGauge.getUltimateGauge()");
  const park = async keep => { for (const id of [1, 2, 3]) { await ev(`${FC}.detachEnemy(${id}); 'ok'`); if (id !== keep) await putEnemy(id, id === 1 ? 2 : id === 2 ? 3 : 14, 1); } };
  // 敵のHPの減りの記録(フレーム単位)
  await ev(`(function() { var m = window.__g = { on: false, drops: [], hp: {}, n: 0 }; var o = Scene_Map.prototype.update; Scene_Map.prototype.update = function() { var r = o.apply(this, arguments); if (m.on) { m.n++; [1, 2, 3].forEach(function(id) { var e = $gameMap.event(id); if (!e) return; var h = $gameMap.getCurrentEventHp(id), p = m.hp[id]; if (p !== undefined && h < p) m.drops.push({ id: id, d: p - h, n: m.n }); m.hp[id] = h; }); } return r; }; window.__orig = Math.random; return 1; })()`);
  const startRec = () => ev("(function(){ var m = window.__g; m.drops = []; m.hp = {}; m.n = 0; m.on = true; return 1; })()");
  const stopRec = async () => { await ev("window.__g.on = false; 'ok'"); return json("window.__g.drops"); };
  const rng = mode => ev(`Math.random = ${mode === "natural" ? "window.__orig" : mode === "zero" ? "function() { return 0; }" : "function() { return 0.5; }"}; 'ok'`);
  const refill = () => ev("$gameSystem.setGunAmmo(51, 7); $gameParty.gainItem($dataItems[31], 20); 'ok'");
  const near = (a, b) => Math.abs(a - b) < 1e-6;

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);

  // ---------------------------------------------------------------- G1 銃の死角
  await check("G1 死角", async () => {
    await enter(); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await park(1); await rng("fixed"); await place(8, 3); await topUp();
    const rows = []; let n = 0;
    for (let a = 0; a < 360; a += 22.5) for (const d of [0.7, 1.0, 1.5, 2.0]) {
      const x = 8 + Math.sin(a * Math.PI / 180) * d, y = 3 - Math.cos(a * Math.PI / 180) * d;
      await refill(); await putEnemy(1, x, y); await setHp(1, 100000); await sleep(650); await aimEvent(1);
      const ammo0 = await json("ProjectRGunSystem.status().ammo"); await startRec(); await c.rightClick(undefined, 60); await sleep(550); const dr = (await stopRec()).filter(z => z.id === 1);
      const ammo1 = await json("ProjectRGunSystem.status().ammo"); rows.push({ a, d, hit: dr.length > 0, dmg: dr.reduce((t, z) => t + z.d, 0), ammoUsed: ammo0 - ammo1 }); n++;
    }
    const misses = rows.filter(r => !r.hit);
    rec("G1a 16方向 × 距離(0.7・1.0・1.5・2.0マス)= 64発すべてが当たる(以前は 19/128 が外れた)", rows.length === 64 && misses.length === 0, JSON.stringify({ shots: rows.length, misses: misses.map(r => [r.a, r.d]) }));
    rec("G1b 至近距離のダメージは遠くと同じ(1発 64)・弾はちょうど1発ずつ減る", rows.every(r => r.dmg === 64 && r.ammoUsed === 1), JSON.stringify({ dmgs: [...new Set(rows.map(r => r.dmg))], ammo: [...new Set(rows.map(r => r.ammoUsed))] }));
    const north = rows.filter(r => r.a === 0).map(r => [r.d, r.hit]);
    rec("G1c 真北(以前の死角)の 0.7・1.0・1.5 マスも当たる", north.slice(0, 3).every(x => x[1]), JSON.stringify(north));
  });

  // ---------------------------------------------------------------- G2 壁
  await check("G2 壁", async () => {
    await enter(); await park(1); await rng("fixed"); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], false); 'ok'"); await sleep(400);   // 扉を閉じる(壁と同じ)
    await refill(); await place(5, 8); await putEnemy(1, 5, 6); await setHp(1, 100000); await sleep(700); await aimEvent(1);                           // 壁(行7)の向こうの敵
    await startRec(); await c.rightClick(undefined, 60); await sleep(900); const beyond = (await stopRec()).filter(z => z.id === 1).length;
    rec("G2a 体のすぐ北が壁: 壁の向こう(北の部屋)の敵には当たらない(至近距離の判定で壁を抜けない)", beyond === 0, JSON.stringify({ hits: beyond }));
    await refill(); await place(5, 9); await putEnemy(1, 5, 8); await setHp(1, 100000); await sleep(700); await aimEvent(1);                           // 壁を背にした敵(壁の手前)
    await startRec(); await c.rightClick(undefined, 60); await sleep(900); const front = (await stopRec()).filter(z => z.id === 1);
    rec("G2b 壁を背にした至近距離の敵(壁の手前・1マス北)には当たる(弾の出現位置が壁の中でも)", front.length === 1 && front[0].d === 64, JSON.stringify(front));
    await refill(); await place(8, 9); await putEnemy(1, 8, 5); await setHp(1, 100000); await sleep(700); await aimEvent(1);                           // 閉じた扉の向こう
    await startRec(); await c.rightClick(undefined, 60); await sleep(900); const door = (await stopRec()).filter(z => z.id === 1).length;
    rec("G2c 閉じた扉の向こうの敵には当たらない", door === 0, JSON.stringify({ hits: door }));
    await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await sleep(400);
  });

  // ---------------------------------------------------------------- G3 ゲージ
  await check("G3 ゲージ", async () => {
    await enter(); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await park(1); await rng("fixed"); await place(8, 3); await topUp();
    const measure = async (label, act, ids = [1]) => {
      await sleep(1500); const g0 = await gauge(); await startRec(); await act(); await sleep(1300); const dr = (await stopRec()).filter(z => ids.includes(z.id)); const g1 = await gauge();
      const dmg = dr.reduce((t, z) => t + z.d, 0), pending = await json("ProjectRUltimateGauge.getPendingDamageCount()");
      await sleep(600); const g2 = await gauge();
      return { label, dmg, hits: dr.length, gain: g1 - g0, expect: dmg * 0.0025, later: g2 - g1, pending };
    };
    const results = [];
    await putEnemy(1, 10, 3); await setHp(1, 100000); await aimBearing(90);
    results.push(await measure("melee1", async () => { await c.click(); }));
    await sleep(1200); results.push(await measure("melee3(1-2-3)", async () => { for (let i = 0; i < 3; i++) { await c.click(); await sleep(650); } }));
    await refill(); await putEnemy(1, 12, 3); await setHp(1, 100000); await sleep(500); await aimEvent(1);
    results.push(await measure("gun1", async () => { await c.rightClick(undefined, 60); }));
    results.push(await measure("gun3連射", async () => { for (let i = 0; i < 3; i++) { await c.rightClick(undefined, 60); await sleep(320); } }));
    // 薙ぎ払いが3体に当たる(強撃)
    await putEnemy(1, 10, 3); await putEnemy(2, 9, 1.5); await putEnemy(3, 6, 4.5); await setHp(1, 100000); await setHp(2, 100000); await setHp(3, 100000); await ev("[2, 3].forEach(function(i) { ProjectRFieldCombat.detachEnemy(i); }); 'ok'"); await aimBearing(90);
    results.push(await measure("sweep(3体・強撃)", async () => { for (let i = 0; i < 3; i++) { await c.click(); await sleep(650); } }, [1, 2, 3]));
    for (const r of results) rec(`G3-${r.label} ゲージ: 増えた量 = 実際に減ったHP × 0.0025(HP ${r.dmg}・${r.hits} ヒット)。あとから増えない・待ちが残らない`, r.dmg > 0 && near(r.gain, r.expect) && near(r.later, 0) && r.pending === 0, JSON.stringify(r));
    // 回避(乱数 0 → 敵の回避率 5% より小さい): ダメージ 0・ゲージも増えない
    await rng("zero"); await putEnemy(2, 3, 1); await putEnemy(3, 14, 1); await putEnemy(1, 10, 3); await setHp(1, 100000); await sleep(700); await aimBearing(90);
    const ev1 = await measure("evade melee", async () => { await c.click(); }); await refill(); await aimEvent(1); const ev2 = await measure("evade gun", async () => { await c.rightClick(undefined, 60); });
    rec("G3-回避 回避(ダメージ 0)は、近接でも銃でも、ゲージが増えない・待ちが残らない", ev1.dmg === 0 && ev2.dmg === 0 && ev1.gain === 0 && ev2.gain === 0 && ev1.pending === 0 && ev2.pending === 0, JSON.stringify({ ev1, ev2 }));
    await rng("fixed");
  });

  // ---------------------------------------------------------------- G4 繰り返しの戦闘
  await check("G4 繰り返し", async () => {
    for (let round = 1; round <= 3; round++) {
      await enter(); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await park(1); await rng("fixed"); await place(8, 3); await topUp();
      const g0 = await gauge(); await refill(); await putEnemy(1, 8, 2); await setHp(1, 100000); await sleep(700); await aimEvent(1);                    // 真北 1 マス(以前の死角)
      await startRec(); await c.rightClick(undefined, 60); await sleep(700); const dg = (await stopRec()).filter(z => z.id === 1);
      await putEnemy(1, 10, 3); await aimBearing(90); await sleep(900); await startRec(); await c.click(); await sleep(900); const dm = (await stopRec()).filter(z => z.id === 1);
      const g1 = await gauge(), pending = await json("ProjectRUltimateGauge.getPendingDamageCount()"), exp = (dg.concat(dm)).reduce((t, z) => t + z.d, 0) * 0.0025;
      rec(`G4-${round} 戦闘 ${round}: ゲージは 0 から始まり、銃(真北 1 マス)と近接が当たり、増えた量 = 実ダメージ × 0.0025・待ちなし`, g0 === 0 && dg.length === 1 && dm.length === 1 && near(g1 - g0, exp) && pending === 0, JSON.stringify({ g0, gun: dg.map(z => z.d), melee: dm.map(z => z.d), gain: g1 - g0, exp, pending }));
      await ev(`${FC}.end('round'); 'ok'`); await sleep(300);
      const left = await json("ProjectRUltimateGauge.getPendingDamageCount()"); if (left !== 0) rec(`G4-${round}b 戦闘のあとに待ちが残らない`, false, String(left));
    }
  });

  const errs = s.errors(), writes = await ev("window.__writes");
  rec("Z Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  const bad = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - bad}/${s.results.length} PASS`); require("fs").writeFileSync(`${process.env.MZ_OUT || "mz_out"}/field_gun_gauge_verify.json`, JSON.stringify(s.results, null, 1)); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FATAL", e.stack); process.exit(2); });
