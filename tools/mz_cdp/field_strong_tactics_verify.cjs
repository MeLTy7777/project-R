// フィールド戦闘 Stage 7B(強敵の攻撃の選び方と位置取り・DEV)の実機(Playtest)検証。DEV_FieldStrongEnemy(Map009)の強敵 1 体と、実際のキー・マウスで確かめる。自動のやり直しはしない。
//   乱数は固定しない(選び方は乱数を使わない)。プレイヤーの位置だけ、ページ内の locate で置く。
//   T1 距離で選ぶ: 近い(1.4マス)= cone / 中距離(4.5マス)= line(敵は動かない設定。決定の記録に 得点が残る)
//   T2 動かないプレイヤーに対する通しの戦闘(敵は追う・視界あり): 6回以上撃つ・同じ攻撃が続かない(cone と line が交互)・cone のあと帯(2.6〜5.0)まで下がる・line のあと 1.6 まで近づく・各攻撃の開始距離が範囲内
//   T3 コミットと再判断: 溜めの間にプレイヤーが動いても向き(予兆の形)は固定・決定の記録は変わらない / 硬直と Cooldown のあとで、いまの位置へ選び直す
//   T4 見失い: 壁ごし(視界 blocked)の間は、選ばない・プレイヤーの方へ動かない / 見えたら、いまの位置へ向けて撃つ(古い位置を覚えていない)
//   T5 中断: 扇形を銃 2 発で中断 → 履歴に cone が残り、次は(下がって)line になる
//   T6 後片付け: 位置取りの途中で撤退 → 攻撃・履歴が消える・戻ったあとダメージなし / 繰り返しの戦闘で履歴が前回を引きずらない
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_strong_tactics_verify.cjs   (新しいNW.jsセッションで実行する)
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
  const atk = () => json(`${SE}.get(1)`);
  const waitAttack = (kind, ms = 15000) => wait(`(function(){ var a = ${SE}.get(1); return !!a && ${kind ? `a.kind === '${kind}' && ` : ""}a.phase === 'windup'; })()`, ms);
  const waitEnd = (ms = 8000) => wait(`!${SE}.get(1)`, ms);
  const dist = () => ev("(function(){ var e = $gameMap.event(1); return Math.hypot(e._realX - $gamePlayer._realX, e._realY - $gamePlayer._realY); })()");
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  await ev(`(function(){ window.__ph = []; ${SE}.onPhase(function(r) { window.__ph.push({ id: r.id, kind: r.kind, phase: r.phase, reason: r.reason, gf: Graphics.frameCount }); }); return 'ok'; })()`);
  const enter = async () => {
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); }
    await ev(`${FC}.startEncounter({ encounterId: 'tactics', battleMapId: 9, spawnX: 10, spawnY: 12, direction: 8, resultVariableId: 9 }); 'ok'`);
    await waitMap(9); await wait(`${FC}.isActive()`, 15000); await sleep(1200); await topUp();
  };
  // 強敵を付け直す。プレイヤーを遠くへ置いてから(前の位置への攻撃が始まらないように)。chase=false は動かない設定
  const fixEnemy = async (x, y, dir, opt) => { await put(19, 13); await ev(`${FC}.detachEnemy(1); 'ok'`); await ev(`${FC}.attachEnemy(1, ${JSON.stringify({ strong: "dev_strong", reach: 2, sightTiles: 12, cooldownFrames: 60, chase: false, ...(opt || {}) })}); 'ok'`); await putEnemy(x, y, dir); await sleep(200); };
  const startKinds = () => json("window.__ph.filter(function(r) { return r.phase === 'windup'; }).map(function(r) { return r.kind; })");

  await check("T1", async () => {
    await enter(); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`);
    const one = async (d, want) => { await fixEnemy(10, 4, 2); await ev("window.__ph = []; 'ok'"); await put(10, 4 + d); await waitAttack(null, 6000); const a = await atk(), dec = await json(`${SE}.getDecision(1)`); await waitEnd(); await topUp(); return { want, kind: a && a.kind, chosen: dec && dec.chosen, scores: dec && Object.fromEntries(Object.entries(dec.scores).map(([k, v]) => [k, v.score])) }; };
    const near = await one(1.4, "cone"), mid = await one(4.5, "line");
    rec("T1 距離で選ぶ: 1.4マス = cone・4.5マス = line(決定の記録と一致)", near.kind === "cone" && near.chosen === "cone" && mid.kind === "line" && mid.chosen === "line", { near, mid });
  });

  await check("T2", async () => {
    // 動かないプレイヤー (10,11)・敵は追う(視界あり): 10回撃つまで。プレイヤーの HP は戻す
    await enter(); await ev(`${FC}.setPerception({ enabled: true }); ${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 80, chase: true }); 'ok'`);
    await put(10, 11); await putEnemy(10, 3, 2); await ev("window.__ph = []; 'ok'"); const rows = []; const t0 = Date.now(); let lastSerial = (await json(`${SE}.diagnostics()`)).serial;
    while (Date.now() - t0 < 70000 && rows.length < 7) {
      const st = await json(`({ a: ${SE}.get(1), hp: $gameParty.leader().hp, d: Math.hypot($gameMap.event(1)._realX - $gamePlayer._realX, $gameMap.event(1)._realY - $gamePlayer._realY) })`);
      if (st.hp < 300) await topUp();
      if (st.a && st.a.phase === "windup" && st.a.id !== lastSerial) { lastSerial = st.a.id; rows.push({ kind: st.a.kind, d: +st.d.toFixed(2) }); }
      await sleep(40);
    }
    const kinds = rows.map(r => r.kind);
    let noRepeat = true; for (let i = 1; i < kinds.length; i++) if (kinds[i] === kinds[i - 1]) noRepeat = false;
    const coneOk = rows.filter(r => r.kind === "cone").every(r => r.d <= 2.4), lineOk = rows.filter(r => r.kind === "line").every(r => r.d >= 2.1 && r.d <= 6.3);
    rec("T2 動かないプレイヤーに、cone と line が交互に出る(同じ攻撃が続かない)・開始距離が範囲内(cone ≤ 2.3・line 2.0〜6.2)", rows.length >= 6 && noRepeat && kinds.includes("cone") && kinds.includes("line") && coneOk && lineOk, rows);
    // 位置取り: cone のあと帯まで下がる(line 開始距離 ≥ 2.25)・line のあと 1.6 付近まで近づいて cone
    const lineAfterCone = rows.filter((r, i) => r.kind === "line" && i > 0 && rows[i - 1].kind === "cone").map(r => r.d), coneAfterLine = rows.filter((r, i) => r.kind === "cone" && i > 0 && rows[i - 1].kind === "line").map(r => r.d);
    rec("T2b 位置取り: cone のあとは下がってから line(2.25マス以上)・line のあとは近づいてから cone(cone の範囲 2.3マス以下)", lineAfterCone.length >= 1 && lineAfterCone.every(d => d >= 2.25) && coneAfterLine.length >= 1 && coneAfterLine.every(d => d <= 2.3), { lineAfterCone, coneAfterLine });
  });

  await check("T3", async () => {
    // コミット: 南の cone の溜めの間にプレイヤーを西へ動かしても、向き・予兆の形・決定の記録は変わらない。次の攻撃は、いまの位置(西)へ向く
    await fixEnemy(10, 7, 2, { chase: true, cooldownFrames: 30 }); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); await ev("window.__ph = []; 'ok'");
    await put(10, 8.6); const ok = await waitAttack("cone", 8000); if (!ok) { rec("T3 コミット", false, "cone が始まらない"); return; }
    const a0 = await atk(), poly0 = await json(`${SE}.displayPolygon(1)`), dec0 = await json(`${SE}.getDecision(1)`);
    await sleep(250); await put(6.5, 7.5); await sleep(150);
    const a1 = await atk(), poly1 = await json(`${SE}.displayPolygon(1)`), dec1 = await json(`${SE}.getDecision(1)`);
    rec("T3 溜めの間にプレイヤーが動いても、向き・予兆の形・決定の記録は変わらない(コミット)", a1 && a1.aim === a0.aim && JSON.stringify(poly1) === JSON.stringify(poly0) && dec1.frame === dec0.frame, { aim: [a0.aim, a1 && a1.aim], frame: [dec0.frame, dec1.frame] });
    await waitEnd(8000); await topUp();
    const ok2 = await waitAttack(null, 8000); const a2 = ok2 ? await atk() : null;
    rec("T3b 硬直と Cooldown のあとで、いまの位置(西)へ選び直して撃つ", !!a2 && Math.abs(a2.aim - 270) < 40 && a2.id > a0.id, { first: a0.aim, second: a2 && a2.aim, kind: a2 && a2.kind });
    await waitEnd(8000);
  });

  await check("T4", async () => {
    // 見失い: 壁(x=5,y=5〜8)ごし → 選ばない・プレイヤーの方へ動かない。見える位置へ出たら、いまの位置へ向けて撃つ
    await fixEnemy(3, 6, 6, { chase: true }); await ev(`${FC}.setPerception({ enabled: true }); 'ok'`); await put(8, 6); await topUp();
    const e0 = await json("({ x: $gameMap.event(1)._realX, y: $gameMap.event(1)._realY })"), s0 = (await json(`${SE}.diagnostics()`)).serial; await sleep(3500);
    const e1 = await json("({ x: $gameMap.event(1)._realX, y: $gameMap.event(1)._realY })"), st = await json(`({ s: ${SE}.diagnostics().serial, dec: ${SE}.getDecision(1), per: ${FC}.getEnemyPerception(1) })`);
    const moved = Math.hypot(e1.x - e0.x, e1.y - e0.y);
    rec("T4 壁ごし(視界 blocked)の間: 選ばない・プレイヤーの方へ動かない", st.s === s0 && st.per.reason === "blocked" && moved < 0.5 && st.dec === null, { moved: +moved.toFixed(2), serial: [s0, st.s], reason: st.per.reason, dec: st.dec });
    await putEnemy(3, 6, 2); await put(4, 10); const ok = await waitAttack(null, 8000); const a = ok ? await atk() : null; const want = 180 + Math.atan2(4 - 3, 10 - 6) * 0 + 0;
    rec("T4b 見える位置へ出ると、いまの位置の方向へ撃つ(壁ごしの古い位置の方向ではない)", !!a && a.aim > 150 && a.aim < 215, { aim: a && a.aim, kind: a && a.kind });
    await waitEnd(8000);
  });

  await check("T5", async () => {
    // 中断: 扇形を銃で中断 → 履歴に cone・次は(下がって)line
    await fixEnemy(10, 7, 2, { chase: true, cooldownFrames: 40 }); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); await ev("$gameSystem.setGunAmmo(51, 7); $gameParty.gainItem($dataItems[31], 60); 'ok'"); await ev("window.__ph = []; 'ok'"); await topUp();
    await put(10, 8.7); const ok = await waitAttack("cone", 8000); if (!ok) { rec("T5 中断", false, "cone が始まらない"); return; }
    const a0 = await atk(); const e = await ev("({ x: $gameMap.event(1).screenX(), y: $gameMap.event(1).screenY() })"); await c.pointer(e.x, e.y - 24); await sleep(80);
    for (let k = 0; k < 3; k++) { await c.rightClick(undefined, 50); await sleep(220); }
    await waitEnd(8000); const ph = await json("window.__ph"); const end = ph.find(r => r.id === a0.id && r.phase === "end"); const hist = await json(`${SE}.getHistory(1)`);
    await put(10, 8.7); const ok2 = await waitAttack(null, 10000); const a1 = ok2 ? await atk() : null; const d1 = await dist();
    rec("T5 扇形を銃で中断 → 履歴に cone が残る・次の攻撃は line(下がってから)", end && end.reason === "interrupted" && hist[hist.length - 1] === "cone" && !!a1 && a1.kind === "line", { reason: end && end.reason, hist, next: a1 && a1.kind, d: +d1.toFixed(2) });
    await waitEnd(8000);
  });

  await check("T6", async () => {
    // 後片付け: 位置取りの途中で撤退 → 攻撃・履歴が消える・戻ったあとダメージなし。繰り返しの戦闘で履歴を引きずらない
    await enter(); await ev(`${FC}.setPerception({ enabled: false }); ${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_strong', reach: 2, sightTiles: 12, cooldownFrames: 100, chase: true }); 'ok'`);
    await put(10, 8); await putEnemy(10, 6.8, 2); await topUp(); const ok = await waitAttack("cone", 8000); await waitEnd(8000); const hist0 = await json(`${SE}.getHistory(1)`);
    await sleep(400); const h0 = await hp(); await ev(`${FC}.abortEncounter(); 'ok'`);
    const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    const info = await json(`({ list: ${SE}.list(), hist: ${SE}.getHistory(1), hp: $gameParty.leader().hp })`);
    await enter(); const fresh = await json(`({ hist: ${SE}.getHistory(1), dec: ${SE}.getDecision(1), mhp: $gameMap.getMaxEventHp(1) })`);
    rec("T6 撤退で攻撃・履歴が消える・戻ったあとダメージなし。繰り返しの戦闘は履歴 0 から", ok && hist0.length >= 1 && back && info.list.length === 0 && info.hist.length === 0 && info.hp >= h0 && fresh.hist.length === 0 && fresh.mhp === 500, { ok, hist0, info, fresh });
    await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000);
  });

  await check("Z", async () => {
    const writes = await ev("window.__writes"), errs = s.errors(), d = await json(`${SE}.diagnostics()`);
    rec("Z1 保存の書き込みなし", writes === 0, writes); rec("Z2 Console のエラーなし・強敵の plugin のエラー 0", errs.length === 0 && d.errors === 0, { errs: errs.slice(0, 3), pluginErrors: d.errors });
  });
  const fails = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - fails}/${s.results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("ERR", e.stack); process.exit(1); });
