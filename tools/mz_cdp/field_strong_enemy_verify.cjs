// フィールド戦闘 Stage 7A(強敵の攻撃パターンの土台・DEV)の実機(Playtest)検証。DEV_FieldStrongEnemy(Map009)の強敵 1 体(トレント・HP500)と、実際のキー・マウス・クリックだけで確かめる。自動のやり直しはしない。
//   乱数は固定しない(自然)。敵の位置・プレイヤーの位置だけ、ページ内の locate で置く(戦闘の状態は動かさない)。
//   A  登録・マップ・自然な戦闘: Map009 に入ると強敵が付く(HP500)・止まって立っているだけのプレイヤーに、直線と扇形の両方を溜め → 判定 → 硬直で撃つ・予兆(HUDの数)・ダメージは判定のフレームに1回だけ・フレーム数が仕様どおり・実時間も 60fps
//   B  よけ方(実キー): 直線は A/D の横歩きでよけられる・扇形は横歩きでよけられる・絶(Shift)でも抜けられる・その場に立っていれば当たる(対照)・E 一閃を溜めの間に当てると扇形は中断(ダメージなし)・直線は中断されない
//   C  壁: 壁ごし(x=5 の壁)では攻撃を始めない・溜めの途中で柱(14〜15,7〜8)の裏へ入ると、予兆は柱で切れて当たらない(対照: 柱の手前は当たる)
//   D  後片付け: 溜めの途中で敵を倒す(攻撃・予兆が消える・勝利で元のマップへ戻る)・撤退(中断)でも消える・繰り返しの戦闘でも毎回動く
//   E  既存の回帰: Map008 の3体のゴブリンは強敵ではない(従来の予約・溜め・近接のまま。強敵の plugin は何もしない)
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_strong_enemy_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", SE = "ProjectRFieldStrongEnemy";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const hp = () => ev("$gameParty.leader().hp");
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const put = async (x, y) => { await ev(`$gamePlayer.locate(${Math.floor(x)}, ${Math.floor(y)}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(250); };
  const putEnemy = (x, y, dir) => ev(`(function(){ var e = $gameMap.event(1); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; e.setDirection(${dir || 2}); return 'ok'; })()`);
  const setEnemyHp = n => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(1); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '1', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const atk = () => json(`${SE}.get(1)`);
  const sd = () => json(`${SE}.diagnostics()`);
  const waitAttack = (kind, ms = 15000) => wait(`(function(){ var a = ${SE}.get(1); return !!a && ${kind ? `a.kind === '${kind}' && ` : ""}a.phase === 'windup'; })()`, ms);
  const waitEnd = (ms = 6000) => wait(`!${SE}.get(1)`, ms);
  // 戦闘の準備(新しいセッションの最初): 指輪・ポーション。FieldCombat に入る
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  // 位相の記録(ゲームのフレーム数と実時間つき)
  await ev(`(function(){ window.__ph = []; ${SE}.onPhase(function(r) { window.__ph.push({ id: r.id, kind: r.kind, phase: r.phase, reason: r.reason, damaged: r.damaged, gf: Graphics.frameCount, t: performance.now() }); }); window.__dmg = []; return 'ok'; })()`);
  const enter = async (mapId, chase) => {
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); }
    await ev(`${FC}.startEncounter({ encounterId: 'strong', battleMapId: ${mapId}, spawnX: ${mapId === 9 ? 10 : 8}, spawnY: ${mapId === 9 ? 12 : 10}, direction: 8, resultVariableId: 9 }); 'ok'`);
    await waitMap(mapId); await wait(`${FC}.isActive()`, 15000); await sleep(1200);
    if (mapId === 8) await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'");
    await sleep(300); await topUp();
  };
  // 強敵を「動かない・視界あり」の状態で付け直す(幾何を確かめる検証用。自然な戦闘は A で確かめる)
  const fixEnemy = async (x, y, dir) => { await put(19, 13); await ev(`${FC}.detachEnemy(1); 'ok'`); await ev(`${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 60, chase: false }); 'ok'`); await putEnemy(x, y, dir); await sleep(200); };
  const phases = () => json("window.__ph");
  const phaseOf = (list, id, p) => list.find(r => r.id === id && r.phase === p);

  // ---- A 登録・マップ・自然な戦闘 ----
  await check("A1", async () => {
    await enter(9);
    const st = await json(`({ strong: typeof ${SE}, enemies: ${FC}.listEnemies(), mhp: $gameMap.getMaxEventHp(1), hp: $gameMap.getCurrentEventHp(1), name: $gameMap.event(1).databaseEnemy && $gameMap.event(1).databaseEnemy.name, tag: /strong=dev_strong/.test($gameMap.event(1).event().note), w: $gameMap.width(), h: $gameMap.height(), note: $dataMap.note })`);
    rec("A1 Map009: 強敵が付く(トレント・HP500・strong=dev_strong・<fieldBattleMap>・21x15)", st.strong === "object" && st.enemies.length === 1 && st.mhp === 500 && st.hp === 500 && st.name === "トレント" && st.tag && st.w === 21 && st.h === 15 && /fieldBattleMap/.test(st.note), st);
  });
  await check("A2", async () => {
    // 自然な戦闘(敵は追う・視界あり)。プレイヤーは (10,12) に立ったまま。直線と扇形の両方が出るまで、HPを戻しながら見る
    await ev(`${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 70, chase: true }); 'ok'`);
    await put(10, 12); await putEnemy(10, 3, 2); await ev("window.__ph = []; 'ok'"); let hpLost = 0, teleSeen = 0; const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const st = await json(`({ a: ${SE}.get(1), n: ${FC}.getHudState().telegraphs, hp: $gameParty.leader().hp })`);
      if (st.a && st.a.phase === "windup" && st.n >= 1) teleSeen++;
      if (st.hp < 250) await topUp();
      const ph = await phases(); if (ph.some(r => r.kind === "line" && r.phase === "end") && ph.some(r => r.kind === "cone" && r.phase === "end")) break;
      await sleep(60);
    }
    const ph = await phases(), kinds = [...new Set(ph.map(r => r.kind))], log = await json(`${SE}.getLog()`);
    const dmgs = log.filter(e => e.type === "damage"), ends = ph.filter(r => r.phase === "end");
    rec("A2 自然な戦闘: 直線と扇形の両方が出る・予兆が出る(HUD の数 ≥ 1)・エラー 0", kinds.includes("line") && kinds.includes("cone") && teleSeen > 0 && (await sd()).errors === 0, { kinds, teleSeen, attacks: ends.length });
    const per = {}; for (const r of ph) if (r.phase !== "end" || true) { per[r.id] = per[r.id] || {}; per[r.id][r.phase] = r; }
    const spec = { cone: { w: 54, a: 6, r: 42 }, line: { w: 66, a: 6, r: 54 } }; let okFrames = true, okTime = true, detail = [];
    for (const id of Object.keys(per)) { const p = per[id]; if (!p.windup || !p.active || !p.recovery || !p.end) continue; const sp = spec[p.windup.kind];
      const dw = p.active.gf - p.windup.gf, da = p.recovery.gf - p.active.gf, dr = p.end.gf - p.recovery.gf, ms = p.active.t - p.windup.t;
      if (Math.abs(dw - sp.w) > 1 || Math.abs(da - sp.a) > 1 || Math.abs(dr - sp.r) > 1) okFrames = false;
      if (ms < sp.w * 16.67 * 0.7 || ms > sp.w * 16.67 * 1.4) okTime = false; detail.push([p.windup.kind, dw, da, dr, Math.round(ms)]); }
    rec("A3 溜め → 判定 → 硬直 のフレーム数が仕様どおり(cone 54/6/42・line 66/6/54。±1)・溜めの実時間が 60fps と合う", okFrames && okTime && detail.length >= 2, detail);
    const byAttack = {}; for (const d of dmgs) byAttack[d.id] = (byAttack[d.id] || 0) + 1;
    rec("A4 ダメージは1つの攻撃につき最大1回(判定が6フレームあっても)・ダメージが出た攻撃は damaged=true", Object.values(byAttack).every(n => n === 1) && dmgs.length >= 1 && dmgs.every(d => ends.find(e => e.id === d.id)?.damaged === true), { byAttack, dmgs: dmgs.length });
  });

  // ---- B よけ方(実キー) ----
  await check("B1", async () => {
    // 直線: 敵 (10,5)・プレイヤー (10,10)(約5マス)。溜めの間に D を押し続けて横へ歩く → 当たらない / 対照: 立っている → 当たる
    const run = async (move) => {
      await fixEnemy(10, 5, 2); await put(10, 10); await topUp(); await ev("window.__ph = []; 'ok'"); const ok = await waitAttack("line", 8000); if (!ok) return { started: false };
      const x0 = await ev("$gamePlayer._realX"); const h0 = await hp();
      if (move) { await c.keyDown("D"); await sleep(520); await c.keyUp("D"); }
      await waitEnd(8000); const x1 = await ev("$gamePlayer._realX"); return { started: true, moved: +(x1 - x0).toFixed(2), lost: h0 - (await hp()) };
    };
    const still = await run(false), side = await run(true);
    rec("B1 直線: 立っていれば当たる(対照)・溜めの間に D で横へ歩けば(1マス以上)当たらない", still.started && still.lost > 0 && side.started && side.moved >= 1 && side.lost === 0, { still, side });
  });
  await check("B2", async () => {
    // 扇形: 敵 (10,8)・プレイヤー (10,9.6)(約1.6マス)。溜めの間に D で横へ歩く → 当たらない
    const run = async (move, key) => {
      await fixEnemy(10, 8, 2); await put(10, 9.6); await topUp(); await ev("window.__ph = []; 'ok'"); const ok = await waitAttack("cone", 8000); if (!ok) return { started: false };
      const x0 = await ev("$gamePlayer._realX"), y0 = await ev("$gamePlayer._realY"); const h0 = await hp();
      if (move) { await c.keyDown(key); await sleep(800); await c.keyUp(key); }
      await waitEnd(8000); const x1 = await ev("$gamePlayer._realX"), y1 = await ev("$gamePlayer._realY"); return { started: true, moved: +Math.hypot(x1 - x0, y1 - y0).toFixed(2), lost: h0 - (await hp()) };
    };
    const still = await run(false), side = await run(true, "D"), side2 = await run(true, "A");
    rec("B2 扇形: 立っていれば当たる(対照)・溜めの間に A/D で横へ歩けば(約3マス)当たらない", still.started && still.lost > 0 && side.started && side.moved >= 2.4 && side.lost === 0 && side2.started && side2.moved >= 2.4 && side2.lost === 0, { still, side, side2 });
  });
  await check("B3", async () => {
    // 絶(Shift): 溜めの間に、敵の横の遠くへマウスを向けて Shift → 瞬間移動して当たらない(直線)
    await fixEnemy(10, 5, 2); await put(10, 10); await topUp(); await ev("window.__ph = []; 'ok'"); const ok = await waitAttack("line", 8000); if (!ok) { rec("B3 絶", false, "line が始まらない"); return; }
    const h0 = await hp(), p0 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
    const f = await ev("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() })"); await c.pointer(f.x + 3 * 48, f.y - 24); await sleep(120); await c.tap("Shift", 70);
    await waitEnd(8000); const p1 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"); const lost = h0 - (await hp()); const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    rec("B3 直線: 溜めの間に絶(Shift)で横へ瞬間移動すれば(1マス以上)当たらない", dist >= 1.5 && lost === 0, { dist: +dist.toFixed(2), lost });
  });
  await check("B4", async () => {
    // スキル・武器: 扇形の溜めの間に、銃を2発(64×2 ≥ 100)当てる → 扇形は中断(ダメージなし)。直線は大きな損害でも中断されない(強い溜め)。一閃(E)は強敵に当たる
    await fixEnemy(10, 8, 2); await setEnemyHp(500); await ev("$gameSystem.setGunAmmo(51, 7); $gameParty.gainItem($dataItems[31], 60); 'ok'"); await topUp(); await sleep(300); await ev("window.__ph = []; 'ok'");
    await put(10, 9.8); const ok = await waitAttack("cone", 8000); if (!ok) { rec("B4 銃で中断", false, "cone が始まらない"); return; }
    const h0 = await hp(), a0 = await atk(); const e = await ev("({ x: $gameMap.event(1).screenX(), y: $gameMap.event(1).screenY() })"); await c.pointer(e.x, e.y - 24); await sleep(80);
    for (let k = 0; k < 3; k++) { await c.rightClick(undefined, 50); await sleep(220); }
    await waitEnd(8000); const ph = await phases(), end = ph.find(r => a0 && r.id === a0.id && r.phase === "end"); const lost = h0 - (await hp()); const ehp = await ev("$gameMap.getCurrentEventHp(1)");
    rec("B4 銃を2発以上当てると(128 ≥ 100)扇形の溜めは中断される(中断・プレイヤーのダメージなし)", end && end.reason === "interrupted" && lost === 0 && ehp <= 372, { reason: end && end.reason, lost, ehp, hp0: a0 && a0.hp0, log: (await json(`${SE}.getLog().slice(-5)`)).map(x => [x.frame, x.phase || x.type, x.interrupted || x.reason || ""]) });
  });
  await check("B4b", async () => {
    await fixEnemy(10, 5, 2); await setEnemyHp(500); await topUp(); await sleep(300); await ev("window.__ph = []; 'ok'");
    await put(10, 10); const ok2 = await waitAttack("line", 8000); if (!ok2) { rec("B4b 直線の中断", false, "line が始まらない"); return; }
    await setEnemyHp(100); await sleep(120); const mid = await atk();
    rec("B4b 直線は大きな損害(400)でも中断されない(強い溜め)", mid && mid.kind === "line" && mid.interrupted === false && mid.phase === "windup", mid);
    await waitEnd(8000);
  });
  await check("B4c", async () => {
    // 一閃(E): 強敵に当たってダメージを与える(スキルが使える)
    await fixEnemy(10, 8, 2); await setEnemyHp(500); await topUp(); await sleep(300); await put(10, 5.2); await ev(`$gameMap.event(1)._erased = false; 'ok'`);
    const e = await ev("({ x: $gameMap.event(1).screenX(), y: $gameMap.event(1).screenY() })"); await c.pointer(e.x, e.y - 24); await sleep(100);
    const e0 = await ev("$gameMap.getCurrentEventHp(1)"); await c.tap("E", 70); await sleep(2500); const e1 = await ev("$gameMap.getCurrentEventHp(1)"); const last = await json(`${FC}.getLastResult()`);
    rec("B4c 一閃(E)は強敵に当たる(HPが減る)", last && last.ok === true && e0 - e1 >= 150, { last: last && last.ok, dealt: e0 - e1 });
  });

  // ---- C 壁 ----
  await check("C1", async () => {
    // 壁(x=5, y=5〜8)ごし: 敵 (3,6) 東向き・プレイヤー (8,6)。視界が壁で切れて、攻撃を始めない
    await fixEnemy(3, 6, 6); await ev(`${FC}.setPerception({ enabled: true }); 'ok'`); await put(8, 6); await topUp(); const s0 = (await sd()).serial; await sleep(3500);
    const per = await json(`${FC}.getEnemyPerception(1)`), s1 = (await sd()).serial;
    rec("C1 壁ごしは攻撃を始めない(視界 blocked・予兆なし)", s1 === s0 && per && per.reason === "blocked", { serial: [s0, s1], reason: per && per.reason });
    // 壁を抜けた位置(壁の端より外: y=10)なら始める(対照)
    await putEnemy(3, 6, 2); await put(4, 10); await ev("window.__ph = []; 'ok'"); const ok = await wait(`!!${SE}.get(1) || ${SE}.diagnostics().serial > ${s1}`, 8000);
    rec("C1b 壁のない向きでは始める(対照)", ok, ok);
    await waitEnd(8000);
  });
  await check("C2", async () => {
    // 柱(14〜15, 7〜8): 敵 (10,7) 東向き・プレイヤー (13,7)(約3マス)→ 溜めの途中で柱の裏 (16.2,7) へ。予兆は柱で切れ、当たらない。対照: 柱の手前に立ち続けると当たる
    await ev(`${FC}.setPerception({ enabled: false }); 'ok'`);
    const run = async hide => {
      await fixEnemy(10, 7, 6); await put(13, 7); await topUp(); await ev("window.__ph = []; 'ok'"); const ok = await waitAttack("line", 8000); if (!ok) return { started: false };
      const full = await json(`${SE}.displayPolygon(1)`); await sleep(200); if (hide) await put(16.2, 7);
      await sleep(150); const poly = await json(`${SE}.displayPolygon(1)`), o = await json(`${SE}.get(1).origin`); const len = p => Math.max(...p.map(v => Math.hypot(v.x - o.x, v.y - o.y)));
      const h0 = await hp(); await waitEnd(8000); return { started: true, len: +len(poly).toFixed(2), lost: h0 - (await hp()) };
    };
    const front = await run(false), behind = await run(true);
    rec("C2 柱の裏へ入ると、予兆は柱で切れて(長さ < 4.5)・当たらない。柱の手前に立っていれば当たる", front.started && front.lost > 0 && behind.started && behind.len < 4.5 && behind.lost === 0, { front, behind });
  });

  // ---- D 後片付け ----
  await check("D1", async () => {
    // 溜めの途中で敵を倒す → 攻撃・予兆が消える。ダメージなし。勝利で Map001 へ戻る(結果=1)
    await enter(9); await ev(`${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 60, chase: false }); 'ok'`); await putEnemy(10, 6, 2); await put(10, 11); await topUp();
    const ok = await waitAttack("line", 10000); if (!ok) { rec("D1 勝利", false, "始まらない"); return; }
    const h0 = await hp(); await sleep(300); await setEnemyHp(0); await sleep(500);
    const st = await json(`({ a: ${SE}.get(1), tele: ${SE}.telegraphs().length, n: ${FC}.getHudState().telegraphs })`);
    await sleep(1500); const h1 = await hp();
    const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); const res = await ev("$gameVariables.value(9)");
    rec("D1 溜めの途中で倒す: 攻撃・予兆が消える・その後ダメージなし・勝利で元のマップへ戻る(結果=1)", st.a === null && st.tele === 0 && st.n === 0 && h1 === h0 && back && res === 1, { st, h0, h1, back, res });
  });
  await check("D2", async () => {
    // 撤退: 溜めの途中で中断(abort)→ 攻撃が消える・元のマップへ戻る(結果=3)・戻ったあとダメージなし
    await enter(9); await ev(`${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 60, chase: false }); 'ok'`); await putEnemy(10, 6, 2); await put(10, 11); await topUp();
    const ok = await waitAttack("line", 10000); if (!ok) { rec("D2 撤退", false, "始まらない"); return; }
    await sleep(300); const h0 = await hp(); await ev(`${FC}.abortEncounter(); 'ok'`);
    const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    const res = await ev("$gameVariables.value(9)"), list = await json(`${SE}.list()`), h1 = await hp();
    rec("D2 撤退(中断)でも攻撃が消える・元のマップへ戻る(結果=3)・戻ったあとダメージなし", back && res === 3 && list.length === 0 && h1 >= h0, { back, res, list, h0, h1 });
  });
  await check("D3", async () => {
    // 繰り返しの戦闘: 3回続けて入っても、毎回、強敵は HP500 で付き、攻撃が始まる(前回の攻撃・予兆を引きずらない)
    const rows = [];
    for (let i = 0; i < 3; i++) {
      const serial0 = (await sd()).serial; await enter(9); const info = await json(`({ mhp: $gameMap.getMaxEventHp(1), hp: $gameMap.getCurrentEventHp(1), stale: ${SE}.list().filter(function(a) { return a.id <= ${serial0}; }).length })`);
      await ev(`${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 60, chase: false }); 'ok'`); await putEnemy(10, 6, 2); await put(10, 11);
      const ok = await waitAttack(null, 10000); rows.push({ ...info, started: ok });
      await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(800);
    }
    rec("D3 繰り返し(3回)の戦闘: 毎回 HP500・前回の攻撃が残らない・毎回攻撃が始まる", rows.every(r => r.mhp === 500 && r.hp === 500 && r.stale === 0 && r.started), rows);
  });

  // ---- E 既存の回帰 ----
  await check("E1", async () => {
    await enter(8); const before = (await sd()).serial;
    const en = await json(`({ list: ${FC}.listEnemies(), strong: [1, 2, 3].map(function(i) { return /strong/i.test($gameMap.event(i).event().note); }) })`);
    await ev("$gamePlayer.locate(8, 6); $gamePlayer._realX = 8; $gamePlayer._realY = 6; $gamePlayer.center(8, 6); 'ok'"); await sleep(250); await topUp();
    const t0 = Date.now(); let sawWindup = false; while (Date.now() - t0 < 12000 && !sawWindup) { sawWindup = (await json(`${FC}.getState().enemies`)).some(e => e.state === "windup"); await sleep(80); }
    const after = await sd();
    rec("E1 Map008 のゴブリン3体: 強敵ではない・従来の予約と溜め(windup)で攻撃する・強敵の plugin は何もしない(攻撃 0)", en.list.length === 3 && en.strong.every(v => v === false) && sawWindup && after.serial === before && after.active === 0, { en, sawWindup, serial: [before, after.serial] });
    await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000);
  });
  await check("Z", async () => {
    const writes = await ev("window.__writes"), errs = s.errors();
    rec("Z1 保存の書き込みなし", writes === 0, writes); rec("Z2 Console のエラーなし", errs.length === 0, errs.slice(0, 3));
  });
  const fails = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - fails}/${s.results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("ERR", e.stack); process.exit(1); });
