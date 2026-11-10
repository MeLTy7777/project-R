// SOUL戦闘 I6-C 実際に作ったテスト用データ(docs §16.9)の実機(Playtest)確認 + スクリーンショット。CDP。
//   T0 データ: ProjectR_SoulTestEntry が有効・Encounter の Bosses から test_boss_a が登録済み・コモンイベント 5/6・マップ 7・開始位置(1: 29,19)は元のまま
//   T1 入り口: F7 でテストマップ(8, 9)へ → もう一度 F7 で元の場所へ → 再び F7 でテストマップ
//   T2 D リセット / E 断られる開始(変数 20 = 3・コモンイベントなし)/ C 結果の確認(文章の表示)
//   T3 A 勝利: 全回復・位置の記録・指輪・開始 → 準備 → 形態2 → 勝利 → 元のマップ・位置・向きへ。勝利のコモンイベントが1回だけ(文章の表示つき)。2回目で 2 回(3 にならない)
//   T4 B 敗北: HP 1 → 敵の弾で敗北メニュー・勝利/その他のコモンイベントなし・保存できない
// 入力はCDP(人間の手動プレイの代わりではない)。保存の書き込みは StorageManager.saveObject を止めて確認する。ゲームのファイルは変更しない。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_encounter_test_setup_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework", EN = "ProjectRSoulEncounter";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const v = id => ev(`$gameVariables.value(${id})`);
  const here = () => json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, dir: $gamePlayer.direction() })");
  const onMap = (map) => wait(`$gameMap.mapId() === ${map} && !$gamePlayer.isTransferring() && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && ${EN}.getState().state === 'idle' && ${ST}.getState().state === 'idle'`, 30000);
  const f7 = () => ev("document.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 118, which: 118, bubbles: true })); 'ok'");
  const startEvent = id => ev(`$gameMap.event(${id}).start(); 'ok'`);
  const hurtHeart = amount => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(${SO}.getState().heart.eventId), value: '-${amount}', exceedMaxHealth: 'false' }); 'ok'`);
  const toDefense = async () => { await ev(`${SO}.beginAttack(); 'ok'`); await sleep(400); await ev(`${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'defense'`, 5000); };
  // メッセージ(文章の表示)を、決定キー(F)で閉じる。最初の画面は撮影する
  const messages = [];
  const closeMessages = async (shotName) => {
    let shot = false;
    for (let i = 0; i < 12; i++) {
      if (!(await wait("$gameMessage.isBusy()", i === 0 ? 4000 : 800))) break;
      await sleep(500);
      if (shotName && !shot) { messages.push(await ev("new Window_Base(new Rectangle(0, 0, 100, 100)).convertEscapeCharacters($gameMessage.allText())")); await s.shot(shotName); shot = true; }          // 表示内容は \V[n] を実際の値に直したもの
      await c.tap("F", 90); await sleep(350);
    }
    return wait("!$gameMessage.isBusy() && !$gameMap._interpreter.isRunning()", 6000);
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await here();
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");

  await check("T0 データ", async () => {
    const d = await json(`({ entry: typeof ProjectRSoulTestEntry, bosses: ${EN}.listBosses(), rejected: ${EN}.listRejected(), ce5: $dataCommonEvents[5] && $dataCommonEvents[5].name, ce6: $dataCommonEvents[6] && $dataCommonEvents[6].name,
      map7: $dataMapInfos[7] && $dataMapInfos[7].name, start: [$dataSystem.startMapId, $dataSystem.startX, $dataSystem.startY], boss: ${EN}.validateBoss('test_boss_a'), params: PluginManager.parameters('ProjectR_SoulEncounter') })`);
    rec("T0 データ", d.entry === "object" && JSON.stringify(d.bosses) === '["test_boss_a"]' && d.rejected.length === 0 && d.ce5 === "TEST_SOUL勝利" && d.ce6 === "TEST_SOULその他" && d.map7 === "TEST_SOUL" &&
      d.start.join() === "1,29,19" && d.boss.ok && d.boss.problems.length === 0 && d.boss.warnings.length === 0 && d.params.ResultVariableId === "0",
      JSON.stringify({ entry: d.entry, bosses: d.bosses, rejected: d.rejected, ce: [d.ce5, d.ce6], map7: d.map7, start: d.start, validate: d.boss }));
  });

  await check("T1 入り口(F7)", async () => {
    await f7();
    const at = await onMap(7); await sleep(1200);
    const p1 = await here(), count = await ev("$gameMap.events().length");
    await s.shot("t1_test_map");
    const ret = await json("ProjectRSoulTestEntry.getReturnPoint()");
    await f7();
    const back = await onMap(origin.map); await sleep(800);
    const p2 = await here();
    await f7();
    const again = await onMap(7); await sleep(800);
    const p3 = await here();
    rec("T1 入り口(F7)", at && p1.map === 7 && p1.x === 8 && p1.y === 9 && p1.dir === 8 && count === 5 && ret && ret.mapId === origin.map && back && p2.map === origin.map && Math.round(p2.x) === Math.round(origin.x) && Math.round(p2.y) === Math.round(origin.y) && p2.dir === origin.dir && again && p3.map === 7 && p3.x === 8 && p3.y === 9,
      JSON.stringify({ origin, toTest: p1, events: count, returnPoint: ret, backAt: p2, again: p3 }));
  });

  await check("T2 D・E・C", async () => {
    // D リセット(変数を適当な値にしてから)
    await ev("$gameVariables.setValue(20, 9); $gameVariables.setValue(19, 9); $gameVariables.setValue(18, 9); $gameVariables.setValue(15, 9); 'ok'");
    await startEvent(4); const closedD = await closeMessages("t2_d_reset");
    const afterD = [await v(20), await v(19), await v(18), await v(15)];
    // E 断られる開始(結果の変数は、時間が経ってから読む)
    await startEvent(5); await sleep(1500);
    const afterE = { result: await v(20), counters: [await v(19), await v(18)], state: (await json(`${EN}.getState()`)).state, map: (await here()).map };
    // C 結果の確認
    await startEvent(3); const closedC = await closeMessages("t2_c_result");
    rec("T2 D・E・C", closedD && closedC && afterD.every(x => x === 0) && afterE.result === 3 && afterE.counters.every(x => x === 0) && afterE.state === "idle" && afterE.map === 7 && /結果 3 /.test(messages[1] || "") && /勝利イベント 0 回 \/ その他イベント 0 回/.test(messages[1] || ""),
      JSON.stringify({ afterD, afterE, messages }));
  });

  await check("T3 A 勝利", async () => {
    const runA = async (label, expectCount) => {
      await ev("$gamePlayer.locate(2, 4); $gamePlayer.setDirection(8); $gameParty.leader().setHp(60); 'ok'");
      await startEvent(1);
      const fighting = await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(800);
      const mid = { result: await v(20), recorded: [await v(17), await v(16), await v(15), await v(11)], hp: await ev("$gameParty.leader().hp"), mhp: await ev("$gameParty.leader().mhp") };
      const heartHp = await ev(`$gameMap.getCurrentEventHp(${SO}.getState().heart.eventId)`), look = await json(`${ST}.getEnemyLook()`), b = await json(`${BF}.getState()`);
      if (label === "1回目") await s.shot("t3_boss_a");
      await hurtHeart(100); await sleep(500);
      const phase2 = (await json(`${BF}.getState()`)).phaseIndex;
      await toDefense(); await sleep(500);
      await hurtHeart(100);
      await wait(`${EN}.getState().state !== 'fighting'`, 10000);
      const during = [await v(20), await v(19)];
      const back = await onMap(7); await sleep(600);
      const closed = await closeMessages(label === "1回目" ? "t3_victory_event" : null);
      const after = { result: await v(20), victory: await v(19), other: await v(18), pos: await here() };
      await sleep(1500);
      const later = await v(19);
      return { fighting, mid, heartHp, look: look.name, boss: [b.bossId, b.maxHp, b.phaseCount], phase2, during, back, closed, after, later, expectCount };
    };
    const r1 = await runA("1回目", 1);
    rec("T3a A 勝利(1回目)", r1.fighting && r1.mid.result === 0 && r1.mid.recorded.join() === "2,4,7,8" && r1.mid.hp === r1.mid.mhp && r1.heartHp === 200 && r1.look === "Crab" && r1.boss.join() === "test_boss_a,200,2" && r1.phase2 === 1 &&
      r1.during[0] === 0 && r1.during[1] === 0 && r1.back && r1.closed && r1.after.result === 1 && r1.after.victory === 1 && r1.after.other === 0 && r1.after.pos.map === 7 && r1.after.pos.x === 2 && r1.after.pos.y === 4 && r1.after.pos.dir === 8 && r1.later === 1 && /SOUL勝利のコモンイベントが動きました\(1回目\)/.test(messages[messages.length - 1] || ""),
      JSON.stringify({ ...r1, messages }));
    const r2 = await runA("2回目", 2);
    rec("T3b A 勝利(2回目 = 勝利イベントは 2 回)", r2.fighting && r2.back && r2.closed && r2.after.result === 1 && r2.after.victory === 2 && r2.later === 2 && r2.after.pos.x === 2 && r2.after.pos.y === 4, JSON.stringify(r2));
  });

  await check("T4 B 敗北", async () => {
    await ev("$gamePlayer.locate(5, 4); $gamePlayer.setDirection(8); 'ok'");
    await startEvent(2);
    const fighting = await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(800);
    const hp1 = await ev("$gameParty.leader().hp");
    await toDefense();
    const box = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(box.x + box.w * 0.5), Math.round(box.y + box.h * 0.55)); await sleep(200);
    const reached = await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRSoulDefeat'", 60000); await sleep(1200);
    await s.shot("t4_defeat_menu");
    const st = await json(`${EN}.getState()`);
    rec("T4 B 敗北", fighting && hp1 === 1 && reached && (await v(20)) === 2 && (await v(19)) === 2 && (await v(18)) === 0 && st.state === "defeatMenu" && st.saveBlocked === true && (await ev("$gameSystem.isSaveEnabled()")) === false && (await ev("window.__writes")) === 0,
      JSON.stringify({ fighting, hpAtStart: hp1, reached, result: await v(20), counters: [await v(19), await v(18)], state: st.state, saveEnabled: await ev("$gameSystem.isSaveEnabled()") }));
  });

  const writes = await ev("window.__writes");
  const errs = s.errors().filter(e => !/Error saving manifest|blocked by test/.test(e));
  rec("TZ Consoleのエラーなし・保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  fs.writeFileSync(`${OUT}/soul_encounter_test_setup_results.json`, JSON.stringify({ note: "Playtest専用: 実際のテスト用データ(Map007・コモンイベント 5/6・Encounter の Bosses・ProjectR_SoulTestEntry)を使用。F7 はキーイベントの送出。入力はCDP(人間の手動プレイの代わりではない)。保存の書き込みは StorageManager.saveObject を止めて確認", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
