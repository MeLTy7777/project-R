// フィールド戦闘 Stage 6D-A(近接が「ときどき当たらない」の調査と確認)の実機(Playtest)検証。CDP の実際のクリックで斬り、1スイングごとの生の記録を取る。自動のやり直しはしない。
//   原因の切り分け: 命中の判定(扇の判定が敵に触れたか = SwordSystem の hits)と、ダメージ(Hendrix の計算。敵の回避・会心)と、HPの反映を、別々に記録する。
//   結論(調査): ときどき HP が減らなかったのは、判定の失敗ではなく、Hendrix のダメージ計算が敵の回避(EVA 5%)を引いてダメージ 0 になっていたため(判定は 100% 当たっている)。
//   H1 判定の正しさ(乱数固定 = 回避・会心なし): 8方向(上下左右・斜め)× 繰り返し。敵が扇の中心にいるとき、毎回、判定が当たり、HPが減る
//   H2 扇の縁: 狙う向きから ±60°・±85°(扇の内側)は当たり、±125°・180°(外側)は外れる(幾何の正解と一致)
//   H3 コンボ: 1・2段目は前の敵だけ、3段目(強撃)は前と後ろの両方に当たる(毎回)。段が進む・受付時間
//   H4 動く的: 敵が周回する・近づくとき、フレームごとの位置から求めた幾何の正解(扇の角度・半径・時刻)と、判定の結果が一致する(境目の曖昧な回は除く)
//   H5 自然な乱数(固定なし): 判定の失敗(斬撃なし・扇が触れない)は 0。HPが減らなかった回は、すべて「敵の回避」と記録されている(回避率の実測つき)
//   H6 片づけ: 斬撃の途中で戦闘が終わっても、扇の判定が残らない。繰り返しの戦闘でも、最初のスイングから当たる
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_melee_hit_verify.cjs   (新しいNW.jsセッションで実行する)。生の記録は <MZ_OUT>/melee_hit_rows.json
const fs = require("fs");
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); } await ev(`${FC}.startEncounter({ encounterId: 'melee', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(1200); await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await sleep(300); };
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const rows = {}, push = (k, r) => { (rows[k] = rows[k] || []).push(r); };

  // ページ内の計測: フレームごとの 敵の位置・扇の状態・HP、斬撃の呼び出し、ダメージ計算(回避・会心)、動く的の駆動
  const INSTALL = `(function() {
    if (window.__mh) return 'ok'; window.__mh = { on: false, frames: [], swings: [], calc: [], i: 0, drive: null };
    var m = window.__mh, orig = Game_Map.prototype.update;
    Game_Map.prototype.update = function() {
      if (m.on && m.drive) { var d = m.drive, e = $gameMap.event(d.id); if (e) { var i = m.i, p = $gamePlayer.centerPositionPoint(); var b, r;
        if (d.kind === 'orbit') { b = d.b0 + d.dir * d.w * i; r = d.R; } else { b = d.b0; r = Math.max(0.7, d.d0 - d.v * i); }
        var x = p.x + r * Math.sin(b * Math.PI / 180) - 0.5, y = p.y - r * Math.cos(b * Math.PI / 180) - 0.5; e._realX = x; e._realY = y; e._x = Math.round(x); e._y = Math.round(y); } }
      var res = orig.apply(this, arguments);
      if (m.on) { m.i++; var row = { f: Graphics.frameCount, i: m.i, en: {}, hp: {}, sw: ProjectRSwordSystem.getActiveSweeps().map(function(s) { return { id: s.id, frame: s.frame, hits: s.hits, deg: s.degree, c: s.center, radius: s.radius, arc: s.arc, frames: s.frames, passes: s.passes }; }) };
        [1, 2].forEach(function(id) { var e = $gameMap.event(id); if (e) { row.en[id] = [e._realX + 0.5, e._realY + 0.5]; row.hp[id] = $gameMap.getCurrentEventHp(id); } }); m.frames.push(row); }
      return res; };
    var sw = ProjectRSwordSystem, so = sw.swing; sw.swing = function(src, opt) { var r = so.apply(this, arguments); if (m.on) m.swings.push({ f: Graphics.frameCount, i: m.i, step: opt && opt.step, ok: r && r.ok, reason: r && r.reason, degree: r && r.degree, serial: r && r.serial }); return r; };
    var mc = window.MaithlCalculateDamagePlayerWeapon; window.MaithlCalculateDamagePlayerWeapon = function(id, w, a) { var d = mc.apply(this, arguments); if (m.on) m.calc.push({ f: Graphics.frameCount, id: id, d: d, evaded: !!CollisionManager.lastEvaded, crit: !!CollisionManager.lastCritical }); return d; };
    window.__origRandom = Math.random; return 'ok'; })()`;
  const fixRandom = mode => ev(`Math.random = ${mode === "natural" ? "window.__origRandom" : "function() { return 0.5; }"}; 'ok'`);
  const startLog = drive => ev(`(function(){ var m = window.__mh; m.frames = []; m.swings = []; m.calc = []; m.i = 0; m.drive = ${drive ? JSON.stringify(drive) : "null"}; m.on = true; return 1; })()`);
  const stopLog = async () => { await ev("window.__mh.on = false; window.__mh.drive = null; 'ok'"); return json("({ frames: window.__mh.frames, swings: window.__mh.swings, calc: window.__mh.calc })"); };
  const aimBearing = async (deg, tiles = 5) => { const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); const r = deg * Math.PI / 180; await c.pointer(Math.round(p.x + Math.sin(r) * tiles * 48), Math.round(p.y - Math.cos(r) * tiles * 48)); await sleep(250); };
  const placeEnemyAt = (id, x, y) => ev(`(function(){ var e = $gameMap.event(${id}); e.locate(Math.round(${x}), Math.round(${y})); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`);
  const placePlayer = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(350); };

  // ---- 幾何の正解(扇: 半径・弧・時刻。狙う向き 0=上・時計回り)。敵(1マスの四角)の中心から求める ----
  const norm = a => ((a % 360) + 360) % 360, diffTo = (b, start, end) => { const rel = norm(b - start), w = norm(end - start); if (rel <= w) return 0; return Math.min(rel - w, 360 - rel); };
  // 1スイング分の記録 → { expect: "hit"|"miss"|"borderline", detail }
  const truth = (log, enemyId) => {
    let sure = false, near = false;
    const seen = {};
    for (const row of log.frames) for (const sw of row.sw) {
      seen[sw.id] = true; const en = row.en[enemyId]; if (!en) continue;
      for (const pass of sw.passes) {
        const pf = sw.frame - pass.delay; if (pf < 1 || pf > sw.frames) continue;
        const start = sw.deg + pass.offset - sw.arc / 2, a0 = start + sw.arc * (pf - 1) / sw.frames, a1 = start + sw.arc * pf / sw.frames;
        const dx = en[0] - sw.c.x, dy = en[1] - sw.c.y, dist = Math.hypot(dx, dy), bearing = norm(Math.atan2(dx, -dy) * 180 / Math.PI);
        const d = diffTo(bearing, a0, a1), half = Math.asin(Math.min(1, 0.5 / Math.max(dist, 0.5))) * 180 / Math.PI;
        if (d === 0 && dist <= sw.radius - 0.4) sure = true;
        if (d <= half + 8 && dist <= sw.radius + 0.9) near = true;
      }
    }
    return { expect: sure ? "hit" : near ? "borderline" : "miss" };
  };
  const swingRow = (log, hpBefore, enemyId, extra) => {
    const swing = log.swings[0] || null, maxSweepHits = Math.max(0, ...log.frames.flatMap(r => r.sw.map(x => x.hits)));
    const last = log.frames.length ? log.frames[log.frames.length - 1].hp[enemyId] : hpBefore;
    const tr = truth(log, enemyId);
    return { swing: swing && { ok: swing.ok, reason: swing.reason, step: swing.step, degree: swing.degree && +swing.degree.toFixed(1) }, sweepHits: maxSweepHits, calc: log.calc.map(x => ({ d: x.d, evaded: x.evaded, crit: x.crit })), hpDrop: hpBefore - last, expect: tr.expect, ...extra };
  };
  const detectOk = r => r.sweepHits > 0;                                                      // 扇の判定が敵に触れた(ダメージ計算の前)
  const oneClick = async (enemyId, drive, wait1 = 900) => {
    await setHp(enemyId, 100000); await sleep(1100);
    const hp0 = await ev(`$gameMap.getCurrentEventHp(${enemyId})`);
    await startLog(drive); await c.click(); await sleep(wait1); const log = await stopLog();
    return { log, hp0 };
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
  await enter(); await ev(INSTALL);
  const fixture = async () => { await ev("[1, 2, 3].forEach(function(i) { ProjectRFieldCombat.detachEnemy(i); }); 'ok'"); await placeEnemyAt(2, 2, 2); await placeEnemyAt(3, 14, 2); };
  const ENEMY_EVA = await json("(function(){ var b = SgetBattlerForH($gameMap.event(1)); return { eva: b.eva, def: b.def }; })()");
  console.log("enemy", JSON.stringify(ENEMY_EVA));

  // 北の広い部屋(行1〜6)に立つ。プレイヤー (8,4)
  const PX = 8, PY = 4;
  await check("H1 方向", async () => {
    await fixture(); await placePlayer(PX, PY); await topUp(); await fixRandom("fixed");
    const dirs = [["N", 0], ["NE", 45], ["E", 90], ["SE", 135], ["S", 180], ["SW", 225], ["W", 270], ["NW", 315]];
    let n = 0, ok = 0;
    for (const [name, deg] of dirs) for (let k = 0; k < 3; k++) {
      const r = Math.sin(deg * Math.PI / 180) * 2, q = -Math.cos(deg * Math.PI / 180) * 2;
      await placeEnemyAt(1, PX + r, PY + q);                                                   // プレイヤーから2マス(位置は左上どうしの差)
      await aimBearing(deg); const { log, hp0 } = await oneClick(1, null);
      const row = swingRow(log, hp0, 1, { dir: name, k }); push("H1", row); n++; if (detectOk(row) && row.hpDrop > 0) ok++;
    }
    rec("H1 8方向(上下左右・斜め)× 3回 = 24スイング: 敵が扇の中心にいるとき、毎回、判定が当たり HP が減る(乱数固定 = 回避なし)", ok === n, JSON.stringify({ ok, n, failures: rows.H1.filter(r => !(detectOk(r) && r.hpDrop > 0)).map(r => [r.dir, r.k, r.sweepHits, r.hpDrop, r.swing]) }));
  });

  await check("H2 扇の縁", async () => {
    await fixture(); await placePlayer(PX, PY); await topUp(); await fixRandom("fixed");
    await placeEnemyAt(1, PX + 2, PY);                                                       // 東の2マス
    const offs = [-125, -85, -60, 0, 60, 85, 125, 180]; let bad = [];
    for (const off of offs) for (let k = 0; k < 2; k++) {
      await aimBearing(90 + off); const { log, hp0 } = await oneClick(1, null);
      const row = swingRow(log, hp0, 1, { off, k }); push("H2", row);
      const want = Math.abs(off) <= 90 ? "hit" : "miss", got = row.hpDrop > 0 ? "hit" : "miss";
      if (want !== got || (row.expect !== "borderline" && row.expect !== want) || detectOk(row) !== (want === "hit")) bad.push([off, k, want, got, row.expect, row.sweepHits]);
    }
    rec("H2 扇の縁(敵は東・狙う向きを ±60°・±85°・±125°・180° ずらす): 内側(±85°まで)は当たり、外側(±125°・180°)は外れる(幾何の正解と一致)", bad.length === 0, JSON.stringify({ n: rows.H2.length, bad }));
  });

  await check("H3 コンボ", async () => {
    await fixture(); await placePlayer(PX, PY); await topUp(); await fixRandom("fixed");
    await placeEnemyAt(1, PX + 2, PY); await placeEnemyAt(2, PX - 2, PY); await aimBearing(90);                  // 前(東)と後ろ(西)
    const bad = [];
    for (let combo = 0; combo < 5; combo++) {
      await setHp(1, 100000); await setHp(2, 100000); await sleep(1800); await startLog(null);
      for (let i = 0; i < 3; i++) { await c.click(); await sleep(650); } await sleep(900); const log = await stopLog();
      const dropAt = id => { const out = []; let prev = log.frames[0].hp[id]; for (const r of log.frames) { if (r.hp[id] < prev) out.push(r.i); prev = r.hp[id]; } return out; };
      const front = dropAt(1), back = dropAt(2), steps = log.swings.map(x => x.step), oks = log.swings.map(x => x.ok);
      const row = { combo, steps, oks, frontHits: front.length, backHits: back.length, calc: log.calc.length }; push("H3", row);
      if (steps.join() !== "1,2,3" || !oks.every(Boolean) || front.length !== 3 || back.length !== 1) bad.push(row);
    }
    rec("H3 コンボ × 5回: 3回のクリックが 1・2・3段目になり、前の敵は3回とも、後ろの敵は3段目(強撃の2回目の扇)の1回だけ当たる", bad.length === 0, JSON.stringify({ combos: rows.H3.length, bad }));
  });

  await check("H4 動く的", async () => {
    await fixture(); await placePlayer(PX, PY); await topUp(); await fixRandom("fixed"); await aimBearing(90);
    let agree = 0, border = 0; const bad = [];
    const plans = [];
    for (let k = 0; k < 15; k++) plans.push({ id: 1, kind: "orbit", b0: [20, 50, 80, 110, 140, 200, 250, 290, 320, 350, 65, 95, 125, 155, 230][k], dir: k % 2 ? -1 : 1, w: [1.5, 2.5, 3.5][k % 3], R: 2.4 });
    for (let k = 0; k < 15; k++) plans.push({ id: 1, kind: "approach", b0: [90, 70, 110, 90, 60, 120, 90, 100, 80, 90, 45, 135, 90, 75, 105][k], d0: 5.5, v: [0.04, 0.06, 0.08][k % 3] });
    for (const plan of plans) {
      await placeEnemyAt(1, PX + 4, PY); const { log, hp0 } = await oneClick(1, plan, 1000);
      const row = swingRow(log, hp0, 1, { plan }); push("H4", row);
      if (row.expect === "borderline") { border++; continue; }
      const got = detectOk(row) ? "hit" : "miss"; if (got === row.expect) agree++; else bad.push([plan, row.expect, got, row.sweepHits]);
    }
    rec("H4 動く的(周回15回・近づく15回 = 30スイング): 扇の判定の結果が、フレームごとの敵の位置から求めた幾何の正解(角度・半径・時刻)と一致する(境目の曖昧な回は除く)", bad.length === 0 && agree + border === 30 && agree >= 20, JSON.stringify({ agree, borderline: border, bad }));
  });

  await check("H5 自然な乱数", async () => {
    await fixture(); await placePlayer(PX, PY); await topUp(); await fixRandom("natural");
    await placeEnemyAt(1, PX + 2, PY); await aimBearing(90);
    const N = 60; let hit = 0, evaded = 0, detectFail = 0, otherNoHp = 0; const fails = [];
    for (let i = 0; i < N; i++) {
      const { log, hp0 } = await oneClick(1, null); const row = swingRow(log, hp0, 1, { i }); push("H5", row);
      if (!row.swing || row.swing.ok === false || !detectOk(row)) { detectFail++; fails.push(row); } else if (row.hpDrop > 0) hit++; else if (row.calc.some(x => x.evaded)) evaded++; else { otherNoHp++; fails.push(row); }
    }
    rec("H5 自然な乱数(60スイング): 判定の失敗(斬撃なし・扇が触れない)は 0。HPが減らなかった回は、すべて「敵の回避」(ダメージ計算が回避を引いた)", detectFail === 0 && otherNoHp === 0 && hit + evaded === N, JSON.stringify({ N, hit, evaded, evadeRate: +(evaded / N).toFixed(3), enemyEva: ENEMY_EVA.eva, detectFail, otherNoHp, fails: fails.slice(0, 3) }));
  });

  await check("H6 片づけ", async () => {
    await fixRandom("fixed");
    for (let round = 1; round <= 3; round++) {
      await enter(); await fixture(); await placePlayer(PX, PY); await topUp(); await placeEnemyAt(1, PX + 2, PY); await aimBearing(90); await sleep(500);
      // 最初のスイングから当たる(前の戦闘の影響がない)
      const { log, hp0 } = await oneClick(1, null); const first = swingRow(log, hp0, 1, { round }); push("H6", first);
      // 斬撃の途中で戦闘を終える → 扇が残らない
      await c.click(); await sleep(90); const mid = await json("ProjectRSwordSystem.getActiveSweeps().length");
      await ev(`${FC}.end('round${round}'); 'ok'`); await sleep(300);
      const after = await json("({ sweeps: ProjectRSwordSystem.getActiveSweeps().length, map: $gameMap.mapId() })");
      rec(`H6-${round} 戦闘 ${round}: 最初のスイングから当たる・斬撃の途中(扇 ${mid} 個)で戦闘が終わっても、扇の判定が残らない`, detectOk(first) && first.hpDrop > 0 && after.sweeps === 0, JSON.stringify({ first: [first.sweepHits, first.hpDrop], midSweeps: mid, afterSweeps: after.sweeps, map: after.map }));
      if (after.map !== 1) await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000);
    }
  });

  await fixRandom("natural");
  const errs = s.errors(), writes = await ev("window.__writes");
  rec("Z Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  fs.writeFileSync(`${process.env.MZ_OUT || "mz_out"}/melee_hit_rows.json`, JSON.stringify(rows));
  const bad = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - bad}/${s.results.length} PASS`); fs.writeFileSync(`${process.env.MZ_OUT || "mz_out"}/field_melee_hit_verify.json`, JSON.stringify(s.results, null, 1)); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FATAL", e.stack); process.exit(2); });
