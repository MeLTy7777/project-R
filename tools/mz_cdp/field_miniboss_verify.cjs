// フィールド戦闘 Stage 7C(2段階の中ボスの試作・DEV)の実機(Playtest)検証。DEV_FieldMiniboss(Map010)の中ボス 1 体(トレント HP500・プロフィール dev_miniboss)と、実際のキー・クリックで確かめる。自動のやり直しはしない。
//   M1 登録・マップ: Map010 に入ると中ボスが付く(HP500・フェーズ1)。フェーズ1は 7B と同じ(cone と line が交互・連続しない・Cooldown 80)
//   M2 遷移(実際の銃のヒット。HPは次のフレームで減る): 実際の HP が 250 以下になった最初のフレームで、1回だけ遷移・進行中の攻撃は取り消される・遷移の間(約1.5秒)は攻撃も移動もダメージもない・
//      演出(画面のフラッシュ 1 回・敵の色・金色の輪)・遷移の間にさらに撃っても再び遷移しない
//   M3 遷移中の致命傷: 遷移の途中で倒す → フェーズ2は始まらない・勝利で元のマップへ戻る(結果=1)
//   M4 フェーズ2: 同じ攻撃(溜め 54 / 66 フレーム)を 連続2撃(1撃目の硬直のすぐあとに2撃目)→ 長めの休み・予兆がオレンジ・敵の色が赤み・横歩きでよけられる・立っていれば当たる・銃で扇形を中断できる
//   M5 後片付け: 遷移の途中で撤退 → 攻撃・輪・判定が残らない・戻ったあとダメージなし・再入場はフェーズ1・HP500・遷移は新しい戦闘で再び1回
//   M6 Map009 の回帰: dev_strong の強敵は HP が 50% 以下でも遷移しない・連続しない
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_miniboss_verify.cjs   (新しいNW.jsセッションで実行する)
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
  const ehp = () => ev("$gameMap.getCurrentEventHp(1)");
  // 銃と同じダメージ式(player weapon)の命中を、コマンドで直接 n 回(タイミング・回避 5%・ばらつきで中断の検証が揺れないように)
  const weaponHits = n => ev(`(function(){ for (var i = 0; i < ${n}; i++) PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '1', value: '-player weapon', exceedMaxHealth: 'false' }); return 'ok'; })()`);
  const waitAttack = (kind, ms = 15000) => wait(`(function(){ var a = ${SE}.get(1); return !!a && ${kind ? `a.kind === '${kind}' && ` : ""}a.phase === 'windup'; })()`, ms);
  const waitEnd = (ms = 8000) => wait(`!${SE}.get(1)`, ms);
  const bossLog = () => json(`${SE}.getLog().filter(function(e) { return e.type === 'bossPhase'; })`);
  const tone = () => json("(function(){ var sp = SceneManager._scene._spriteset._characterSprites.find(function(x) { return x._character === $gameMap.event(1); }); return sp ? Array.from(sp._colorTone) : null; })()");
  const gunAt = async () => { const e = await ev("({ x: $gameMap.event(1).screenX(), y: $gameMap.event(1).screenY() })"); await c.pointer(e.x, e.y - 24); await sleep(80); await c.rightClick(undefined, 50); await sleep(260); };
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  await ev(`(function(){ window.__ph = []; ${SE}.onPhase(function(r) { window.__ph.push({ id: r.id, kind: r.kind, phase: r.phase, reason: r.reason, windup: r.windup, gf: Graphics.frameCount }); }); window.__flash = 0; var o = $gameScreen.startFlash; $gameScreen.startFlash = function() { window.__flash++; return o.apply(this, arguments); }; return 'ok'; })()`);
  const enter = async mapId => {
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); }
    await ev(`${FC}.startEncounter({ encounterId: 'mini', battleMapId: ${mapId}, spawnX: 10, spawnY: 12, direction: 8, resultVariableId: 9 }); 'ok'`);
    await waitMap(mapId); await wait(`${FC}.isActive()`, 15000); await sleep(1200); await topUp(); await ev("$gameSystem.setGunAmmo(51, 7); $gameParty.gainItem($dataItems[31], 60); 'ok'");
  };
  // 動かない設定で付け直す(プレイヤーを遠くへ置いてから)。profile = dev_miniboss / dev_strong
  const fixEnemy = async (x, y, dir, profile = "dev_miniboss", opt) => { await put(19, 13); await ev(`${FC}.detachEnemy(1); 'ok'`); await ev(`${FC}.attachEnemy(1, ${JSON.stringify({ strong: profile, reach: 2, sightTiles: 12, cooldownFrames: 80, chase: false, ...(opt || {}) })}); 'ok'`); await putEnemy(x, y, dir); await sleep(200); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); };
  const startsOf = () => json("window.__ph.filter(function(r) { return r.phase === 'windup'; })");

  await check("M1", async () => {
    await enter(10);
    const st = await json(`({ enemies: ${FC}.listEnemies(), mhp: $gameMap.getMaxEventHp(1), hp: $gameMap.getCurrentEventHp(1), tag: /strong=dev_miniboss/.test($gameMap.event(1).event().note), note: $dataMap.note, w: $gameMap.width(), phase: ${SE}.getPhase(1) })`);
    rec("M1 Map010: 中ボスが付く(トレント HP500・strong=dev_miniboss・<fieldBattleMap>・フェーズ1)", st.enemies.length === 1 && st.mhp === 500 && st.hp === 500 && st.tag && /fieldBattleMap/.test(st.note) && st.w === 21, st);
    // フェーズ1: 7B と同じ(自然な戦闘。cone と line が交互・連続しない・Cooldown が入る)
    await ev(`${FC}.setPerception({ enabled: true }); ${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_miniboss', reach: 2, sightTiles: 12, cooldownFrames: 80, chase: true }); 'ok'`);
    await put(10, 11); await putEnemy(10, 3, 2); await ev("window.__ph = []; 'ok'"); const t0 = Date.now();
    while (Date.now() - t0 < 40000) { const ph = await json("window.__ph.filter(function(r) { return r.phase === 'windup'; }).length"); if (ph >= 4) break; if ((await hp()) < 300) await topUp(); await sleep(60); }
    const all = await json("window.__ph"), starts = all.filter(r => r.phase === "windup"), ends = all.filter(r => r.phase === "end");
    let alt = true; for (let i = 1; i < starts.length; i++) if (starts[i].kind === starts[i - 1].kind) alt = false;
    const gaps = []; for (let i = 1; i < starts.length; i++) { const e = ends.find(x => x.id === starts[i - 1].id); if (e) gaps.push(starts[i].gf - e.gf); }
    const log = await bossLog();
    rec("M1b フェーズ1は 7B と同じ: cone と line が交互・攻撃の間に Cooldown(約80フレーム)・遷移なし", starts.length >= 4 && alt && gaps.length >= 3 && gaps.every(g => g >= 60) && log.length === 0, { kinds: starts.map(r => r.kind), gaps, log: log.length });
  });

  await check("M2", async () => {
    // 実際の銃のヒットで 250 を割る。敵は動かない。プレイヤーは (10,9)(敵 (10,5))
    await enter(10); await fixEnemy(10, 5, 2); await put(10, 9); await topUp(); await setEnemyHp(300); await sleep(500); await ev("window.__ph = []; window.__flash = 0; 'ok'");
    const ok = await waitAttack(null, 8000); const a0 = ok ? await json(`${SE}.get(1)`) : null;
    let shots = 0; while (shots < 8 && (await json(`${SE}.getLog().filter(function(e) { return e.type === 'bossPhase'; }).length`)) === 0) { await gunAt(); shots++; }
    await sleep(300);
    const log1 = await bossLog(), hpE = await ehp(), after = await json(`({ a: ${SE}.get(1), ph: ${SE}.getPhase(1), cues: ${SE}.cues().length, tele: ${SE}.telegraphs().length, flash: window.__flash, tone: null })`), t1 = await tone();
    rec("M2 実際の HP が 250 以下になった最初のフレームで1回だけ遷移・進行中の攻撃は取り消される・演出(フラッシュ 1 回・敵の色・金色の輪)", log1.filter(r => r.phase === "transition").length === 1 && hpE <= 250 && after.a === null && after.ph.transition === true && after.cues === 1 && after.tele === 0 && after.flash === 1 && t1 && t1[0] > 0, { had: !!a0, shots, hpE, after, tone: t1, log: log1 });
    // 遷移の間: 攻撃・移動・ダメージがない。さらに撃っても再び遷移しない(敵は先に回復しておく = 会心が続いて倒れるのを避ける。回復しても再遷移しない)
    await setEnemyHp(480); await sleep(200);
    const pos0 = await json("({ x: $gameMap.event(1)._realX, y: $gameMap.event(1)._realY })"), h0 = await hp(); let attacked = false, still = true; const tt = Date.now();
    await gunAt(); await gunAt();
    while (Date.now() - tt < 1100) { if (await json(`${SE}.get(1)`)) attacked = true; await sleep(60); }
    const pos1 = await json("({ x: $gameMap.event(1)._realX, y: $gameMap.event(1)._realY })"), h1 = await hp(), log2 = await bossLog();
    rec("M2b 遷移の間(約1.5秒): 攻撃しない・動かない・ダメージなし・さらに撃っても再び遷移しない", !attacked && Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y) < 0.02 && h1 === h0 && log2.filter(r => r.phase === "transition").length === 1, { attacked, moved: +Math.hypot(pos1.x - pos0.x, pos1.y - pos0.y).toFixed(3), h0, h1, transitions: log2.filter(r => r.phase === "transition").length });
    await wait(`!(${SE}.getPhase(1) || {}).transition`, 5000); await sleep(200);
    const t2 = await tone(), log3 = await bossLog();
    rec("M2c 遷移が終わる: フェーズ2・輪が消える・敵の色は赤み(フェーズ2の見た目)・遷移は1回のまま", log3.some(r => r.phase === "phase2") && (await json(`${SE}.cues().length`)) === 0 && t2 && t2[0] === 60 && t2[1] === -30 && log3.filter(r => r.phase === "transition").length === 1, { tone: t2, log: log3.map(r => r.phase) });
  });

  await check("M3", async () => {
    // 遷移の途中で倒す: フェーズ2は始まらず、勝利で元のマップへ戻る
    await enter(10); await fixEnemy(10, 6, 2); await put(10, 10); await topUp(); const p2before = (await bossLog()).filter(r => r.phase === "phase2").length; await setEnemyHp(240); await sleep(400);
    const inT = await wait(`${SE}.getPhase(1).transition === true`, 4000); await sleep(300); const h0 = await hp(); await setEnemyHp(0); await sleep(600);
    const st = await json(`({ a: ${SE}.get(1), cues: ${SE}.cues().length, list: ${SE}.list().length })`), log = await bossLog(); await sleep(1500);
    const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000), res = await ev("$gameVariables.value(9)");
    rec("M3 遷移の途中で倒す: フェーズ2は始まらない・攻撃も輪も残らない・勝利で元のマップへ戻る(結果=1)", inT && st.a === null && st.cues === 0 && st.list === 0 && log.filter(r => r.phase === "phase2").length === p2before && back && res === 1 && (await hp()) >= h0 - 1, { inT, st, log: log.map(r => r.phase), back, res });
  });

  await check("M4", async () => {
    // フェーズ2: 立っているプレイヤーに、連続2撃 → 長めの休み。溜めは同じ・予兆はオレンジ
    await enter(10); await fixEnemy(10, 6, 2, "dev_miniboss", { chase: true }); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); await put(10, 7.5); await topUp(); await setEnemyHp(240); await sleep(300);
    await wait(`${SE}.getPhase(1).transition === true`, 4000); await wait(`!${SE}.getPhase(1).transition`, 5000); await ev("window.__ph = []; 'ok'"); await put(10, 7.5);
    let look = null; const t0 = Date.now(); while (Date.now() - t0 < 25000) { const ph = await json("window.__ph.filter(function(r) { return r.phase === 'end'; }).length"); if (!look) { const tl = await json(`${SE}.telegraphs()`); if (tl.length && tl[0].look) look = tl[0].look; } if (ph >= 5) break; if ((await hp()) < 300) await topUp(); await sleep(40); }
    const all = await json("window.__ph"), starts = all.filter(r => r.phase === "windup"), ends = all.filter(r => r.phase === "end");
    const gapAfter = i => { const e = ends.find(x => x.id === starts[i - 1].id); return e ? starts[i].gf - e.gf : null; };
    const wins = {}; for (const r of starts) wins[r.kind] = r.windup;
    const g1 = gapAfter(1), g2 = gapAfter(2), g3 = gapAfter(3), tn = await tone();
    rec("M4 フェーズ2: 連続2撃(1撃目の硬直のすぐあとに2撃目)→ 長めの休み → 連続 …・同じ溜め(cone 54 / line 66)・予兆はオレンジ・敵は赤み", starts.length >= 4 && g1 !== null && g1 <= 3 && g2 >= 100 && g3 <= 3 && (wins.cone === undefined || wins.cone === 54) && (wins.line === undefined || wins.line === 66) && look && look.fill === 0xff8c1a && tn && tn[0] === 60, { kinds: starts.map(r => r.kind), g1, g2, g3, wins, look, tone: tn });
  });
  await check("M4b", async () => {
    // よけ方: 扇形・直線の溜めの間に横歩き(A)で当たらない・立っていれば当たる(対照)・銃で扇形を中断
    await enter(10); await fixEnemy(10, 6, 2); await put(10, 7.6); await topUp(); await setEnemyHp(240); await sleep(300); await wait(`${SE}.getPhase(1).transition === true`, 4000); await wait(`!${SE}.getPhase(1).transition`, 5000);
    const run = async (move) => {
      await fixEnemy(10, 6, 2); await ev("window.__ph = []; 'ok'"); await put(10, 7.6); await topUp(); const ok = await waitAttack("cone", 8000); if (!ok) return { started: false };
      const h0 = await hp(), n0 = await json(`${SE}.getLog().filter(function(e) { return e.type === 'damage'; }).length`); const id = (await json(`${SE}.get(1)`)).id;
      if (move) { await c.keyDown("D"); await sleep(800); await c.keyUp("D"); }
      await wait(`!${SE}.get(1) || ${SE}.get(1).id !== ${id}`, 8000); await sleep(150); return { started: true, lost: h0 - (await hp()), hits: (await json(`${SE}.getLog().filter(function(e) { return e.type === 'damage'; }).length`)) - n0 };
    };
    const still = await run(false), side = await run(true);
    rec("M4b フェーズ2の扇形: 立っていれば当たる(対照)・溜めの間の横歩きでよけられる(同じ予兆の形・時間)", still.started && (still.lost > 0 || still.hits > 0) && side.started && side.lost === 0 && side.hits === 0, { still, side });
    await fixEnemy(10, 6, 2); await ev("window.__ph = []; 'ok'"); await put(10, 7.6); await topUp(); await setEnemyHp(240); await wait(`(${SE}.getPhase(1) || {}).transition === true`, 4000); await wait(`!(${SE}.getPhase(1) || {}).transition`, 5000);
    await setEnemyHp(480); await sleep(150); const ok = await waitAttack("cone", 8000);
    if (ok) { const a0 = await json(`${SE}.get(1)`); await weaponHits(3); await wait(`!${SE}.get(1)`, 8000); const ph = await json("window.__ph"), end = ph.find(r => r.id === a0.id && r.phase === "end");
      rec("M4c フェーズ2でも、銃と同じダメージ(2発以上 ≥ 100)で扇形を中断できる(回復しても再び遷移しない)", !!end && end.reason === "interrupted" && (await bossLog()).length > 0, { reason: end && end.reason }); } else rec("M4c 中断", false, "cone が始まらない");
  });

  await check("M5", async () => {
    // 後片付け: 遷移の途中で撤退 → 攻撃・輪・判定が残らない・戻ったあとダメージなし。再入場はフェーズ1・HP500・遷移は新しい戦闘で再び1回
    await enter(10); await fixEnemy(10, 6, 2); await put(10, 10); await topUp(); await setEnemyHp(240); await wait(`${SE}.getPhase(1).transition === true`, 4000); await sleep(300); const h0 = await hp();
    await ev(`${FC}.abortEncounter(); 'ok'`); const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    const info = await json(`({ list: ${SE}.list().length, cues: ${SE}.cues().length, tele: ${SE}.telegraphs().length, res: $gameVariables.value(9), hp: $gameParty.leader().hp })`);
    rec("M5 遷移の途中で撤退: 攻撃・輪・予兆が残らない・元のマップへ戻る(結果=3)・戻ったあとダメージなし", back && info.list === 0 && info.cues === 0 && info.tele === 0 && info.res === 3 && info.hp >= h0, { back, info, h0 });
    const nTrans = () => json(`${SE}.getLog().filter(function(e) { return e.type === 'bossPhase' && e.phase === 'transition'; }).length`);
    // 生き残った敵の HP は、入り直しても引き継がれる(Hendrix の既存の仕様)。HP が 50% 以下のまま入り直すと、その入場で1回だけ遷移する(同じ入場で2回にならない)
    const rows = [];
    for (let i = 0; i < 2; i++) {
      const n0 = await nTrans(); await enter(10); await sleep(600); const ini = await json(`({ mhp: $gameMap.getMaxEventHp(1), hp: $gameMap.getCurrentEventHp(1), ph: ${SE}.getPhase(1) })`);
      const n1 = await nTrans(); await sleep(1800); await setEnemyHp(60); await sleep(400); const n2 = await nTrans(); rows.push({ low: true, hp: ini.hp, n: [n0, n1, n2] });
      await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(800);
    }
    rec("M5b 入り直し(HP が 50% 以下のまま): 入場ごとに遷移は1回だけ(同じ入場で2回にならない・追加のダメージでも増えない)", rows.every(r => r.low && r.hp <= 250 && r.n[1] - r.n[0] === 1 && r.n[2] === r.n[1]), rows);
    // HP を戻して(500)から退く → 入り直すと、フェーズ1・遷移なし。そのあと 250 を割ると、その入場で1回
    await enter(10); await setEnemyHp(500); await sleep(500); await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(800);
    const m0 = await nTrans(); await enter(10); await sleep(600); const full = await json(`({ hp: $gameMap.getCurrentEventHp(1), ph: ${SE}.getPhase(1) })`), m1 = await nTrans();
    await fixEnemy(10, 6, 2); await put(10, 10); await setEnemyHp(240); await sleep(500); const m2 = await nTrans();
    rec("M5c HP が満タンで入り直す: フェーズ1・遷移なし → 250 を割ると、その入場で1回だけ遷移", full.hp === 500 && full.ph.phase === 1 && full.ph.transition === false && m1 === m0 && m2 - m1 === 1, { full, m: [m0, m1, m2] });
    await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000);
  });

  await check("M6", async () => {
    // Map009 の回帰: dev_strong は 50% 以下でも遷移しない・連続しない
    await enter(9); const b0 = (await bossLog()).length; await fixEnemy(10, 6, 2, "dev_strong", { cooldownFrames: 60, chase: false }); await put(10, 9.6); await topUp(); await setEnemyHp(100); await ev("window.__ph = []; 'ok'");
    const t0 = Date.now(); while (Date.now() - t0 < 14000) { if ((await json("window.__ph.filter(function(r) { return r.phase === 'windup'; }).length")) >= 3) break; if ((await hp()) < 300) await topUp(); await sleep(60); }
    const all = await json("window.__ph"), starts = all.filter(r => r.phase === "windup"), ends = all.filter(r => r.phase === "end"), log = await bossLog(), cues = await json(`${SE}.cues().length`);
    const gaps = []; for (let i = 1; i < starts.length; i++) { const e = ends.find(x => x.id === starts[i - 1].id); if (e) gaps.push(starts[i].gf - e.gf); }
    rec("M6 Map009(dev_strong): HP が 50% 以下でも遷移しない・輪も出ない・連続しない(Cooldown 60 が入る)", starts.length >= 3 && log.length === b0 && cues === 0, { starts: starts.length, gaps, cues, newBossLogs: log.length - b0 });
    rec("M6b dev_strong の攻撃の間隔は従来どおり(連続の 0 フレームがない)", gaps.length >= 2 && gaps.every(g => g >= 50), gaps);
  });

  await check("Z", async () => {
    const writes = await ev("window.__writes"), errs = s.errors(), d = await json(`${SE}.diagnostics()`);
    rec("Z1 保存の書き込みなし", writes === 0, writes); rec("Z2 Console のエラーなし・強敵の plugin のエラー 0", errs.length === 0 && d.errors === 0, { errs: errs.slice(0, 3), pluginErrors: d.errors });
  });
  const fails = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - fails}/${s.results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("ERR", e.stack); process.exit(1); });
