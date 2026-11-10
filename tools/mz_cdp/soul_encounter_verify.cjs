// SOUL戦闘 D13 本番の入口(ProjectR_SoulEncounter)と勝敗の実機(Playtest)確認 + スクリーンショット。CDP。
//   E1 開始: 専用ステージへ移動 → SOUL戦闘(準備ループ)+ボス。結果の変数は 0、保存禁止、敵の弾幕は自動で有効、HP の下限は無い(0)
//   E2 勝利: 敵ハートのHP0 → 結果 1。主人公の残りHPはそのまま。元のマップ・元の位置へ戻り、保存禁止が解ける
//   E3 T-19 同時 KO: 敵 HP0 と 自 HP0 を同じフレームに起こすと勝利(結果 1)。結果は1回だけ。敗北メニューは出ない
//   E4 その他: 中断で結果 3。元のマップへ戻る。繰り返し(続けて3回目まで)も毎回きれいに始まり終わる
//   E5 敗北: 敵の弾で主人公が HP0 → 結果 2。元のマップへ戻ってすぐ、敗北メニュー(セーブから再開 / タイトルへ戻る)へ。保存は敗北メニューの間も禁止。弾・警告・ボスは残らない
//   E6 敗北メニューの操作: キャンセルでは何も起きない。「セーブから再開」→ 標準のロード画面 → キャンセルで敗北メニューへ戻る(マップへは戻らない)。セーブが無いと選べない
//   E7 読み込み: ロード画面から実際に読み込むと、保存禁止が解けてマップへ(読み込み先のセーブは書き換えない: 保存の書き込みを止めて確認)
//   E8 タイトルへ: 敗北メニューから「タイトルへ戻る」でタイトルへ。保存禁止のまま(ニューゲームで解ける)
// 入力はCDP(人間の手動プレイの代わりではない)。ボスは試験用に登録(HP 1000・弾幕の表は DEV の表と同じ内容。本番のボスデータは別)。デッキは DEV の ProjectRApolloTest が一時的に与える。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_encounter_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework", EN = "ProjectRSoulEncounter";
const VAR = 20, BOSS = "cdp_boss";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const toOrigin = origin => wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && ${EN}.getState().state === 'idle'`, 30000);
  const saveOn = () => ev("$gameSystem.isSaveEnabled()");
  const encState = () => json(`${EN}.getState()`);
  const sceneName = () => ev("SceneManager._scene && SceneManager._scene.constructor.name");
  const varOf = () => ev(`$gameVariables.value(${VAR})`);
  const hp = () => ev("$gameParty.leader().hp");
  const hurtHeart = amount => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(${SO}.getState().heart.eventId), value: '-${amount}', exceedMaxHealth: 'false' }); 'ok'`);
  const startEncounter = async () => {
    const r = await json(`${EN}.start({ bossId: '${BOSS}', resultVariableId: ${VAR} })`);
    if (!r.ok) return r;
    await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(800);
    return r;
  };
  const toDefense = async () => { await ev(`${SO}.beginAttack(); 'ok'`); await sleep(400); await ev(`${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'defense'`, 5000); };
  const press = k => c.tap(k, 90);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  // 有効なデッキ(DEV の ProjectRApolloTest が一時的に与える。最後に reset で戻す)とボスの登録
  const deck = await json(`(function() { var at = ProjectRApolloTest; at.grantRing('apollo'); at.grantRing('hermes'); at.unlock(3, ['apollo', 'hermes']); var d = at.buildMixedDeck(); return { ok: d.ok, valid: d.valid }; })()`);
  const reg = await json(`${EN}.registerBoss({ bossId: '${BOSS}', name: 'CDP BOSS', hp: 1000, phases: [{ id: 'phase2', label: '第二形態', hpRatio: 0.66 }, { id: 'phase3', label: '第三形態', hpRatio: 0.33 }], bulletPlan: [{ rotation: [{ pattern: 'dev_aimed', options: {} }] }, { rotation: [{ pattern: 'dev_fan', options: {} }] }, { rotation: [{ pattern: 'dev_radial', options: {} }] }] })`);
  // 実際の保存を絶対に書かない保険(読み込みの確認で使う)。保護セーブは読むだけ
  await ev("window.__writes = 0; var __so = StorageManager.saveObject; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  const savedBefore = await ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");

  await check("E1 開始", async () => {
    await ev("$gameVariables.setValue(" + VAR + ", 77); $gameParty.leader().setHp(300); 'ok'");
    const r = await startEncounter();
    const st = await encState(), eb = await json(`${EB}.getState()`), cfg = await json(`${EB}.getConfig()`);
    await s.shot("e1_fighting");
    rec("E1 開始", deck.ok && deck.valid && reg.ok && r.ok && st.state === "fighting" && (await varOf()) === 0 && st.saveBlocked === true && (await saveOn()) === false && eb.enabled === true && eb.mode === "boss" && cfg.floorHp === 0 && (await ev(`${BF}.isActive()`)) === true && (await ev(`${SO}.getPhase()`)) === "prepare",
      JSON.stringify({ deck, start: r, state: st.state, variable: await varOf(), saveEnabled: await saveOn(), bullets: [eb.enabled, eb.mode], floorHp: cfg.floorHp, phase: await ev(`${SO}.getPhase()`) }));
  });

  await check("E2 勝利", async () => {
    await toDefense(); await sleep(600);
    await hurtHeart(1000);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    const mid = await encState();
    const back = await toOrigin(origin); await sleep(500);
    const st = await encState(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    rec("E2 勝利", mid.last && mid.last.result === "victory" && (await varOf()) === 1 && back && w.map === origin.map && Math.round(w.x) === Math.round(origin.x) && Math.round(w.y) === Math.round(origin.y) && (await hp()) === 300 && (await saveOn()) === true && st.saveBlocked === false && (await sceneName()) === "Scene_Map" && (await ev(`${BF}.isActive()`)) === false,
      JSON.stringify({ result: mid.last, variable: await varOf(), back, now: [w.map, w.x, w.y], hp: await hp(), saveEnabled: await saveOn(), scene: await sceneName() }));
  });

  await check("E3 T-19 同時KO", async () => {
    await ev("$gameParty.leader().setHp(250); 'ok'");
    const resultsBefore = (await json(`${EN}.getLog().filter(function(e) { return e.type === 'result'; }).length`));
    await startEncounter();
    await toDefense(); await sleep(500);
    // 同じ評価(= 同じフレーム)で、敵 HP0 と 自 HP0 を起こす
    await ev(`(function() { PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(${SO}.getState().heart.eventId), value: '-1000', exceedMaxHealth: 'false' }); $gameParty.leader().setHp(0); return 'ok'; })()`);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000); await sleep(300);
    const mid = await encState();
    const log = { length: (await json(`${EN}.getLog().filter(function(e) { return e.type === 'result'; }).length`)) - resultsBefore };
    // 勝利のあと、HP0 の主人公のまま元のマップへ戻る(敗北メニューには行かない)。HP0 の主人公をそのまま残さないよう、確認後に回復する
    const back = await toOrigin(origin); await sleep(800);
    const scene = await sceneName();
    await ev("$gameParty.leader().setHp(250); 'ok'");
    rec("E3 T-19 同時KO", mid.last && mid.last.result === "victory" && mid.last.reason === "victory" && log.length === 1 && (await varOf()) === 1 && back && scene === "Scene_Map",
      JSON.stringify({ result: mid.last, resultEntries: log.length, variable: await varOf(), scene }));
  });

  await check("E4 その他と繰り返し", async () => {
    const outcomes = [];
    for (let i = 0; i < 2; i++) {
      await ev("$gameParty.leader().setHp(222); 'ok'");
      await startEncounter();
      const during = await varOf();
      await ev(`${EN}.abort('cdp'); 'ok'`);
      await wait(`${EN}.getState().state !== 'fighting'`, 10000);
      const back = await toOrigin(origin); await sleep(400);
      const st = await encState();
      outcomes.push({ during, after: await varOf(), back, hp: await hp(), save: await saveOn(), serial: st.serial, clean: (await ev(`${BF}.isActive()`)) === false && (await json(`${EB}.getState().live`)) === 0 });
    }
    // 3回目: 勝利(繰り返しのあとでも普通に勝てる)
    await ev("$gameParty.leader().setHp(222); 'ok'");
    await startEncounter(); await toDefense(); await sleep(400); await hurtHeart(1000);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    const back3 = await toOrigin(origin); await sleep(400);
    outcomes.push({ after: await varOf(), back: back3, hp: await hp(), save: await saveOn() });
    rec("E4 その他と繰り返し", outcomes.slice(0, 2).every(o => o.during === 0 && o.after === 3 && o.back && o.hp === 222 && o.save === true && o.clean) && outcomes[2].after === 1 && outcomes[2].back && outcomes[2].hp === 222 && outcomes[2].save === true,
      JSON.stringify(outcomes));
  });

  await check("E5 敗北", async () => {
    await ev("$gameParty.leader().setHp(40); 'ok'");                                  // 弾 25 を 2 発で倒れる(動かない)
    await startEncounter(); await toDefense();
    const b = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.55)); await sleep(200);
    let sawBullets = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 40000 && (await encState()).state === "fighting") { if (!sawBullets && (await json(`${EB}.getState().live`)) > 0) { sawBullets = true; await s.shot("e5_bullets"); } await sleep(40); }
    const mid = await encState();
    const reached = await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRSoulDefeat'", 30000);
    await sleep(1200);
    await s.shot("e5_defeat_menu");
    const st = await encState();
    const eb = await json(`${EB}.getState()`), cmds = await json(`${EN}.defeatCommands()`);
    rec("E5 敗北", sawBullets && mid.last && mid.last.result === "defeat" && mid.last.reason === "playerDead" && (await varOf()) === 2 && reached && st.state === "defeatMenu" && st.saveBlocked === true && (await saveOn()) === false &&
      eb.live === 0 && eb.telegraphs === 0 && eb.running === false && eb.enabled === false && (await ev(`${BF}.isActive()`)) === false && (await hp()) === 0 && cmds.length === 2 && cmds[0].symbol === "load" && cmds[1].symbol === "title",
      JSON.stringify({ result: mid.last, variable: await varOf(), scene: await sceneName(), state: st.state, saveBlocked: st.saveBlocked, saveEnabled: await saveOn(), bullets: [eb.live, eb.telegraphs, eb.enabled], hp: await hp(), commands: cmds.map(x => [x.symbol, x.enabled]) }));
  });

  await check("E6 敗北メニューの操作", async () => {
    // キャンセルでは何も起きない
    await press("X"); await sleep(400);
    const afterCancel = await sceneName();
    // 「セーブから再開」(先頭の項目が選ばれている) → 決定 → ロード画面
    const idx = await ev("SceneManager._scene._commandWindow.index()");
    await press("F"); await sleep(1200);
    const inLoad = await sceneName();
    await s.shot("e6_load_screen");
    const saveInLoad = await saveOn();
    // ロード画面でキャンセル → 敗北メニューへ戻る(マップではない)
    await press("X"); await sleep(1500);
    const back = await sceneName();
    const st = await encState();
    // セーブが無い場合: 「セーブから再開」は選べない(ロード画面は開かない)
    await ev("window.__anyReal = DataManager.isAnySavefileExists; DataManager.isAnySavefileExists = function() { return false; }; 'ok'");
    await ev("SceneManager.goto(Scene_ProjectRSoulDefeat); 'ok'"); await sleep(1500);
    const none = await json("(function() { var w = SceneManager._scene._commandWindow; return { scene: SceneManager._scene.constructor.name, load: w.isCommandEnabled(0), title: w.isCommandEnabled(1), index: w.index() }; })()");
    await ev("SceneManager._scene._commandWindow.select(0); 'ok'"); await press("F"); await sleep(800);
    const stillDefeat = await sceneName();
    await ev("DataManager.isAnySavefileExists = window.__anyReal; SceneManager.goto(Scene_ProjectRSoulDefeat); 'ok'"); await sleep(1200);
    rec("E6 敗北メニューの操作", afterCancel === "Scene_ProjectRSoulDefeat" && idx === 0 && inLoad === "Scene_Load" && saveInLoad === false && back === "Scene_ProjectRSoulDefeat" && st.state === "defeatMenu" && none.load === false && none.title === true && none.index === 1 && stillDefeat !== "Scene_Load",
      JSON.stringify({ afterCancel, defaultIndex: idx, inLoad, saveEnabledInLoad: saveInLoad, afterLoadCancel: back, state: st.state, noSave: none, noSaveSelectScene: stillDefeat }));
  });

  await check("E7 読み込み", async () => {
    // 実際に読み込む(保存の書き込みは止めてある)。敗北メニュー → ロード画面 → 先頭の有効なセーブを決定
    const files = await json("DataManager._globalInfo.map(function(x, i) { return x ? i : null; }).filter(function(x) { return x !== null; })");
    await press("F"); await sleep(1200);
    const inLoad = await sceneName();
    const slot = await ev("(function() { var sc = SceneManager._scene, w = sc._listWindow; for (var i = 0; i < w.maxItems(); i++) { var id = w.savefileId ? w.indexToSavefileId(i) : i; if (DataManager.savefileInfo(id)) return i; } return -1; })()");
    if (slot >= 0) { await ev(`SceneManager._scene._listWindow.select(${slot}); 'ok'`); await press("F"); }
    const loaded = await wait("SceneManager._scene instanceof Scene_Map && !SceneManager.isSceneChanging()", 20000); await sleep(1500);
    const st = await encState();
    const writes = await ev("window.__writes");
    rec("E7 読み込み", inLoad === "Scene_Load" && slot >= 0 && loaded && st.state === "idle" && st.saveBlocked === false && (await saveOn()) === true && writes === 0 && (await sceneName()) === "Scene_Map",
      JSON.stringify({ files, inLoad, slot, loaded, state: st.state, saveBlocked: st.saveBlocked, saveEnabled: await saveOn(), writes, scene: await sceneName() }));
  });

  await check("E8 タイトルへ", async () => {
    // もう一度敗北 → 「タイトルへ戻る」。読み込み後の世界で、デッキを用意して続ける
    const dk = await json(`(function() { var at = ProjectRApolloTest; at.grantRing('apollo'); at.grantRing('hermes'); at.unlock(3, ['apollo', 'hermes']); var d = at.buildMixedDeck(); ${EN}.registerBoss({ bossId: '${BOSS}', name: 'CDP BOSS', hp: 1000, phases: [], bulletPlan: [{ rotation: [{ pattern: 'dev_aimed', options: {} }] }] }); return { ok: d.ok && d.valid }; })()`);
    await ev("$gameParty.leader().setHp(40); 'ok'");
    const r = await json(`${EN}.start({ bossId: '${BOSS}', resultVariableId: ${VAR} })`);
    let ok = r.ok;
    if (ok) { await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(600); await toDefense(); const b = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.55)); }
    const reached = ok && await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRSoulDefeat'", 60000); await sleep(1200);
    await press("S"); await sleep(300);                                               // 「タイトルへ戻る」へ
    const idx = await ev("SceneManager._scene._commandWindow.index()");
    await press("F"); await sleep(2500);
    const scene = await sceneName();
    const st = await encState();
    rec("E8 タイトルへ", dk.ok && r.ok && reached && idx === 1 && scene === "Scene_Title" && st.saveBlocked === true,
      JSON.stringify({ deck: dk, start: r, reached, index: idx, scene, saveBlocked: st.saveBlocked, state: st.state }));
  });

  const writes = await ev("window.__writes");
  const errs = s.errors().filter(e => !/Error saving manifest|blocked by test/.test(e));
  rec("EZ Consoleのエラーなし・保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  fs.writeFileSync(`${OUT}/soul_encounter_results.json`, JSON.stringify({ note: "Playtest専用: ボスは DEV 用に登録、デッキは ProjectRApolloTest が一時的に与える。保存の書き込みは StorageManager.saveObject を止めて確認。入力はCDP(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
