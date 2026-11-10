// SOUL戦闘 I6-A 本番の経路(イベントから StartSoulEncounter)の実機(Playtest)確認。CDP。
//   P0 初期状態: 登録済みのボスは I6-C のテスト用の仮のボス test_boss_a だけ(本番のボス定義は無い)/ 結果変数・コモンイベントの既定は未設定 / 指輪を入手する前はデッキが無い
//   P1 本番のデッキ: 指輪の入手コマンド(AcquireHermesRing)をイベントのコマンドとして実行 → ヘルメースの30枚で開始の検証を通る(ProjectRApolloTest は使わない)
//   P2 ボス定義: Bosses パラメータの保存形式(入れ子の JSON 文字列)を読んで登録(registerBoss の直接呼び出しは使わない)
//   P3 イベントから開始(F8なし): 通常のマップのイベントの実行(コモンイベントの予約 = イベントと同じ実行経路)で StartSoulEncounter。コマンドはすぐ戻り、次のコマンドも実行される。
//        準備ループ 8秒/6秒・ボスの弾幕は自動・HPの下限なし・保存禁止。結果の変数は戦闘中も戻る途中も 0。二重の開始は断る
//   P4 勝利: 戻りきってから 変数 1・勝利のコモンイベント1回(あとから増えない)。残りHPはそのまま
//   P5 その他(中断): 変数 3・その他のコモンイベント1回
//   P6 断られた開始(ボス未登録): 変数 3・コモンイベントは呼ばない・戦闘は始まらない
//   P7 敗北: 敵の弾でHP0 → 変数 2・敗北メニュー・コモンイベントは呼ばない・保存は書かれない
// 入力はCDP(人間の手動プレイの代わりではない)。ゲームのファイルは変更しない(コモンイベントはメモリ上だけ)。保存の書き込みは StorageManager.saveObject を止めて確認する。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_encounter_production_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework", EN = "ProjectRSoulEncounter";
const VAR = 20, REWARD = 19, MARK = 18, BOSS = "prod_cdp_boss";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const toOrigin = origin => wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && ${EN}.getState().state === 'idle'`, 30000);
  const saveOn = () => ev("$gameSystem.isSaveEnabled()");
  const encState = () => json(`${EN}.getState()`);
  const sceneName = () => ev("SceneManager._scene && SceneManager._scene.constructor.name");
  const v = id => ev(`$gameVariables.value(${id})`);
  const hp = () => ev("$gameParty.leader().hp");
  const hurtHeart = amount => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(${SO}.getState().heart.eventId), value: '-${amount}', exceedMaxHealth: 'false' }); 'ok'`);
  const toDefense = async () => { await ev(`${SO}.beginAttack(); 'ok'`); await sleep(400); await ev(`${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'defense'`, 5000); };
  // 本番のイベントと同じ経路: コモンイベントの予約 → マップのインタプリタが実行する(ファイルは変えず、メモリ上に作る)
  const startList = (extra = {}) => ({ code: 357, indent: 0, parameters: ["ProjectR_SoulEncounter", "StartSoulEncounter", "StartSoulEncounter", Object.assign({ bossId: BOSS, resultVariableId: String(VAR), victoryCommonEventId: "__V__", otherCommonEventId: "__O__" }, extra)] });

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  // 保存の書き込みを絶対に起こさない保険(書き込みの回数を数える)
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  // メモリ上のコモンイベント(テスト用): 開始 / 勝利(変数REWARD +1)/ その他(+100)/ 未登録ボスの開始
  const base = await ev("$dataCommonEvents.length");
  const IDS = { start: base, victory: base + 1, other: base + 2, unknown: base + 3 };
  const mk = (id, list) => ({ id, name: "TEST " + id, trigger: 0, switchId: 1, list: list.concat([{ code: 0, indent: 0, parameters: [] }]) });
  const withIds = cmd => { const p = JSON.parse(JSON.stringify(cmd)); p.parameters[3].victoryCommonEventId = String(IDS.victory); p.parameters[3].otherCommonEventId = String(IDS.other); return p; };
  const setVarCmd = (id, value, op = 0) => ({ code: 122, indent: 0, parameters: [id, id, op, 0, value] });
  await ev(`(function() { var mk = ${mk.toString()}; var C = ${JSON.stringify(IDS)}; var start = ${JSON.stringify(withIds(startList()))}; var unk = ${JSON.stringify(withIds(startList({ bossId: "no_such_boss" })))};
    $dataCommonEvents[C.start] = mk(C.start, [start, ${JSON.stringify(setVarCmd(MARK, 7))}]);
    $dataCommonEvents[C.victory] = mk(C.victory, [${JSON.stringify(setVarCmd(REWARD, 1, 1))}]);
    $dataCommonEvents[C.other] = mk(C.other, [${JSON.stringify(setVarCmd(REWARD, 100, 1))}]);
    $dataCommonEvents[C.unknown] = mk(C.unknown, [unk]);
    return 'ok'; })()`);
  const runEvent = id => ev(`$gameTemp.reserveCommonEvent(${id}); 'ok'`);
  const afterEvent = id => wait(`!$gameMap._interpreter.isRunning() && !$gameTemp.isCommonEventReserved()`, 5000);
  const toFight = async () => { await runEvent(IDS.start); const ok = await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(800); return ok; };

  await check("P0 初期状態", async () => {
    const params = await json(`(function() { var p = PluginManager.parameters('ProjectR_SoulEncounter'); return { bosses: p.Bosses, victory: p.VictoryCommonEventId, other: p.OtherCommonEventId, result: p.ResultVariableId }; })()`);
    const bosses = await json(`${EN}.listBosses()`);
    const val = await json(`${BF}.validateEntry()`);
    rec("P0 初期状態", Array.isArray(bosses) && JSON.stringify(bosses) === '["test_boss_a"]' && (params.victory === undefined || params.victory === "0") && (params.other === undefined || params.other === "0") && val.ok === false,
      JSON.stringify({ params, bosses, deckOk: val.ok, messages: val.messages }));
  });

  await check("P1 本番のデッキ", async () => {
    // 指輪の入手コマンド(ヘルメースの初期30枚)を、イベントのコマンドとして実行する
    await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
    await sleep(300);
    const val = await json(`${BF}.validateEntry()`), deck = await json("ProjectRCardDeck.getDeck()");
    rec("P1 本番のデッキ", val.ok === true && deck.length === 30 && deck.every(id => /^hermes_/.test(id)), JSON.stringify({ ok: val.ok, messages: val.messages, count: deck.length, sample: deck.slice(0, 3) }));
  });

  await check("P2 ボス定義(パラメータ形式)", async () => {
    const rot = p => JSON.stringify({ rotation: JSON.stringify([JSON.stringify({ pattern: p })]) });
    const text = JSON.stringify([JSON.stringify({ bossId: BOSS, name: "PROD CDP BOSS", hp: "1000", phases: JSON.stringify([JSON.stringify({ id: "phase2", label: "第二形態", hpRatio: "0.66" })]), bulletPlan: JSON.stringify([rot("dev_aimed"), rot("dev_fan")]), dodgeBoss: "", enemyImageFolder: "enemies", enemyImageName: "" })]);
    const r = await json(`${EN}.loadBossesFromText(${JSON.stringify(text)})`);
    const list = await json(`${EN}.listBosses()`);
    rec("P2 ボス定義(パラメータ形式)", r.registered.length === 1 && r.registered[0] === BOSS && r.errors.length === 0 && list.includes(BOSS), JSON.stringify({ r, list }));
  });

  await check("P3 イベントから開始(F8なし)", async () => {
    await ev("$gameVariables.setValue(" + VAR + ", 77); $gameVariables.setValue(" + REWARD + ", 0); $gameVariables.setValue(" + MARK + ", 0); $gameParty.leader().setHp(300); 'ok'");
    const started = await toFight();
    const st = await encState(), eb = await json(`${EB}.getState()`), cfg = await json(`${EB}.getConfig()`), so = await json(`${SO}.getState()`);
    await s.shot("p3_fighting");
    const marker = await v(MARK);
    rec("P3a 開始", started && st.state === "fighting" && marker === 7 && (await v(VAR)) === 0 && st.saveBlocked === true && (await saveOn()) === false && eb.enabled === true && eb.mode === "boss" && cfg.floorHp === 0 &&
      so.attackSeconds === 8 && so.defenseSeconds === 6 && so.prepare === true && (await ev(`${SO}.getPhase()`)) === "prepare" && (await json(`${BF}.getState().bossId`)) === BOSS,
      JSON.stringify({ started, state: st.state, markerAfterStartCommand: marker, variable: await v(VAR), saveEnabled: await saveOn(), bullets: [eb.enabled, eb.mode], floorHp: cfg.floorHp, seconds: [so.attackSeconds, so.defenseSeconds], prepare: so.prepare }));
    // 二重の開始(イベントをもう一度実行): 断る。戦闘・結果・コモンイベントは壊れない
    const serial = st.serial;
    await runEvent(IDS.start); await afterEvent(); await sleep(400);
    const st2 = await encState(), rejected = await json(`${EN}.getLog().filter(function(e) { return e.type === 'rejected' && e.reason === 'encounterActive'; }).length`);
    rec("P3b 二重の開始は断る", st2.state === "fighting" && st2.serial === serial && (await v(VAR)) === 0 && (await v(REWARD)) === 0 && rejected === 1, JSON.stringify({ state: st2.state, serial: [serial, st2.serial], variable: await v(VAR), reward: await v(REWARD), rejected }));
    // 準備 → 攻撃: 本番のデッキ(ヘルメース)から手札が引ける
    const qa = await json("ProjectRSoulPrepare.quickAttack()");
    await wait(`${SO}.getPhase() === 'attack'`, 5000); await sleep(300);
    const hand = (await json("ProjectRCardDeck.getBattleState().hand")).map(x => x.cardId);
    rec("P3c 本番のデッキで攻撃", qa.ok === true && hand.length === 5 && hand.every(id => /^hermes_/.test(id)) && (await json("ProjectRSoulMana.getState().active")) === true, JSON.stringify({ qa: qa.ok, hand }));
  });

  await check("P4 勝利", async () => {
    await toDefense(); await sleep(500);
    await hurtHeart(1000);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    // 戻る途中: 変数 0・報酬なし
    const midVar = await v(VAR), midReward = await v(REWARD), midState = (await encState()).state;
    const back = await toOrigin(origin); await sleep(1500);
    const st = await encState(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    const r1 = await v(REWARD); await sleep(2500); const r2 = await v(REWARD);
    rec("P4 勝利", midState !== "fighting" && midVar === 0 && midReward === 0 && back && (await v(VAR)) === 1 && r1 === 1 && r2 === 1 && (await hp()) === 300 && (await saveOn()) === true && st.saveBlocked === false && w.map === origin.map && Math.round(w.x) === Math.round(origin.x) && Math.round(w.y) === Math.round(origin.y),
      JSON.stringify({ mid: { state: midState, variable: midVar, reward: midReward }, variable: await v(VAR), reward: [r1, r2], hp: await hp(), saveEnabled: await saveOn(), now: [w.map, w.x, w.y] }));
  });

  await check("P5 その他(中断)", async () => {
    await ev("$gameVariables.setValue(" + REWARD + ", 0); $gameParty.leader().setHp(222); 'ok'");
    const started = await toFight();
    const during = await v(VAR);
    await ev(`${EN}.abort('cdp'); 'ok'`);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    const back = await toOrigin(origin); await sleep(1500);
    const r1 = await v(REWARD); await sleep(1500); const r2 = await v(REWARD);
    rec("P5 その他(中断)", started && during === 0 && back && (await v(VAR)) === 3 && r1 === 100 && r2 === 100 && (await hp()) === 222 && (await saveOn()) === true, JSON.stringify({ during, variable: await v(VAR), reward: [r1, r2], hp: await hp() }));
  });

  await check("P6 断られた開始", async () => {
    await ev("$gameVariables.setValue(" + REWARD + ", 0); $gameVariables.setValue(" + VAR + ", 55); 'ok'");
    await runEvent(IDS.unknown); await afterEvent(); await sleep(800);
    const st = await encState(), stage = await json(`${ST}.getState().state`);
    const rej = await json(`${EN}.getLog().filter(function(e) { return e.type === 'rejected'; }).pop()`);
    rec("P6 断られた開始", st.state === "idle" && stage === "idle" && (await v(VAR)) === 3 && (await v(REWARD)) === 0 && rej && rej.reason === "unknownBoss" && (await saveOn()) === true && (await sceneName()) === "Scene_Map", JSON.stringify({ state: st.state, stage, variable: await v(VAR), reward: await v(REWARD), rejected: rej }));
  });

  await check("P7 敗北", async () => {
    await ev("$gameVariables.setValue(" + REWARD + ", 0); $gameParty.leader().setHp(40); 'ok'");
    const started = await toFight();
    await toDefense();
    const b = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.55)); await sleep(200);
    const reached = await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRSoulDefeat'", 60000); await sleep(1200);
    await s.shot("p7_defeat_menu");
    const st = await encState(), eb = await json(`${EB}.getState()`);
    rec("P7 敗北", started && reached && (await v(VAR)) === 2 && (await v(REWARD)) === 0 && st.state === "defeatMenu" && st.saveBlocked === true && (await saveOn()) === false && eb.live === 0 && eb.enabled === false && (await ev(`${BF}.isActive()`)) === false && (await hp()) === 0,
      JSON.stringify({ started, reached, variable: await v(VAR), reward: await v(REWARD), state: st.state, saveEnabled: await saveOn(), hp: await hp() }));
  });

  const writes = await ev("window.__writes");
  const errs = s.errors().filter(e => !/Error saving manifest|blocked by test/.test(e));
  rec("PZ Consoleのエラーなし・保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  fs.writeFileSync(`${OUT}/soul_encounter_production_results.json`, JSON.stringify({ note: "Playtest専用: 本番のデータ(ヘルメースの初期デッキ・Bosses パラメータ形式・イベントのStartSoulEncounter)のみ使用。コモンイベントはメモリ上だけ。保存の書き込みは StorageManager.saveObject を止めて確認。入力はCDP(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
