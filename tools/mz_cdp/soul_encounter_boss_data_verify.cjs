// SOUL戦闘 I6-B ボスごとの戦闘データ(HP・形態・弾幕の表・敵の絵)の実機(Playtest)確認 + スクリーンショット。CDP。
//   Q0 定義: Bosses パラメータ形式で2種類のボスを登録(HP 600 / 2500。形態・弾幕の表・敵の絵は別々)。HP未設定の定義は登録されず理由が出る。敵の絵のファイルの有無は実際のファイルで確認
//   Q1 ボス X の開始: 敵ハートの実際のHP・最大HP・BossFramework・HUD が 600、敵の絵と弾の出る位置(胸)が定義どおり、弾幕の表がボス X のもの(DEV の表ではない)
//   Q2 HPと形態の同期: ダメージで 割合ちょうど(300)の形態2へ。敵ハート / BossFramework / HUD が同じHP。実際の弾幕が形態2の表(扇・1波あたり5発)で、DEV の表(7発)ではない
//   Q3 勝利: ボス定義のHPを削りきって勝利(結果1)。表・敵の絵が元へ戻る
//   Q4 ボス Y: HP 2500・形態2つ(0.7 / 0.3)・弾幕の表3つ。割合ちょうどで形態が進む。中断(結果3)で後片づけ
//   Q5 欠落した素材: 敵の絵のファイルが無いボスは、理由つきで断る(結果3・何も変わらない)
//   Q6 敗北: 敵の弾でHP0 → 結果2・敗北メニュー・表が残らない・保存の書き込み0
// 入力はCDP(人間の手動プレイの代わりではない)。ゲームのファイルは変更しない(ボス定義・コモンイベントはメモリ上だけ。敵の絵は既存の素材を試験用に指定)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_encounter_boss_data_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework", EN = "ProjectRSoulEncounter";
const VAR = 20;
const mzStruct = v => Array.isArray(v) ? JSON.stringify(v.map(x => (x && typeof x === "object" ? mzStruct(x) : x))) : (v && typeof v === "object") ? JSON.stringify(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x && typeof x === "object" ? mzStruct(x) : typeof x === "number" ? String(x) : x]))) : v;
const DEFS = [
  { bossId: "cdp_boss_x", name: "CDP X", hp: 600, phases: [{ id: "x2", label: "X第二形態", hpRatio: 0.5 }],
    bulletPlan: [{ rotation: [{ pattern: "dev_aimed", shots: 2, shotGap: 40 }] }, { rotation: [{ pattern: "dev_fan", count: 5, spreadDeg: 80 }] }],
    enemyImageFolder: "enemies", enemyImageName: "Crab", enemyChestX: "0.5", enemyChestY: "0.45" },
  { bossId: "cdp_boss_y", name: "CDP Y", hp: 2500, phases: [{ id: "y2", label: "Y第二形態", hpRatio: 0.7 }, { id: "y3", label: "Y第三形態", hpRatio: 0.3 }],
    bulletPlan: [{ rotation: [{ pattern: "dev_radial", count: 9, waves: 2 }] }, { rotation: [{ pattern: "dev_aimed", shots: 3 }, { pattern: "dev_fan" }] }, { rotation: [{ pattern: "dev_fan", count: 11 }] }],
    enemyImageFolder: "enemies", enemyImageName: "Dragon" },
  { bossId: "cdp_boss_noimg", name: "CDP NOIMG", hp: 400, phases: [], bulletPlan: [{ rotation: [{ pattern: "dev_aimed" }] }], enemyImageFolder: "enemies", enemyImageName: "NoSuchImage_I6B" },
  { bossId: "cdp_boss_nohp", name: "CDP NOHP", phases: [], bulletPlan: [{ rotation: [{ pattern: "dev_aimed" }] }] }
];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const toOrigin = origin => wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && ${EN}.getState().state === 'idle'`, 30000);
  const encState = () => json(`${EN}.getState()`);
  const sceneName = () => ev("SceneManager._scene && SceneManager._scene.constructor.name");
  const v = id => ev(`$gameVariables.value(${id})`);
  const hurtHeart = amount => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(${SO}.getState().heart.eventId), value: '-${amount}', exceedMaxHealth: 'false' }); 'ok'`);
  const toDefense = async () => { await ev(`${SO}.beginAttack(); 'ok'`); await sleep(400); await ev(`${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'defense'`, 5000); };
  const heartHp = () => ev(`$gameMap.getCurrentEventHp(${SO}.getState().heart.eventId)`);
  const heartMax = () => ev(`$gameMap.event(${SO}.getState().heart.eventId).PRmhp`);
  const bfs = () => json(`${BF}.getState()`);
  const hud = () => json(`${BF}.getHudState()`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  // 本番のデッキ(ヘルメースの指輪の入手コマンド)
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
  // イベントのコマンド(メモリ上のコモンイベント)で開始する: ボスごと
  const base = await ev("$dataCommonEvents.length");
  const cmdFor = bossId => ({ code: 357, indent: 0, parameters: ["ProjectR_SoulEncounter", "StartSoulEncounter", "StartSoulEncounter", { bossId, resultVariableId: String(VAR) }] });
  const IDS = {};
  const bossIds = ["cdp_boss_x", "cdp_boss_y", "cdp_boss_noimg"];
  bossIds.forEach((b, i) => { IDS[b] = base + i; });
  await ev(`(function() { var C = ${JSON.stringify(IDS)}, cmds = ${JSON.stringify(Object.fromEntries(bossIds.map(b => [b, cmdFor(b)])))};
    Object.keys(C).forEach(function(b) { $dataCommonEvents[C[b]] = { id: C[b], name: 'TEST ' + b, trigger: 0, switchId: 1, list: [cmds[b], { code: 0, indent: 0, parameters: [] }] }; });
    return 'ok'; })()`);
  const startBoss = async bossId => { await ev(`$gameTemp.reserveCommonEvent(${IDS[bossId]}); 'ok'`); const ok = await wait(`${EN}.getState().state === 'fighting'`, 30000); await sleep(800); return ok; };

  await check("Q0 定義", async () => {
    const r = await json(`${EN}.loadBossesFromText(${JSON.stringify(mzStruct(DEFS))})`);
    const vx = await json(`${EN}.validateBoss('cdp_boss_x')`), vy = await json(`${EN}.validateBoss('cdp_boss_y')`), vn = await json(`${EN}.validateBoss('cdp_boss_noimg')`), vh = await json(`${EN}.validateBoss('cdp_boss_nohp')`);
    const rejected = await json(`${EN}.listRejected()`);
    rec("Q0 定義", r.registered.length === 3 && r.rejected.length === 1 && r.rejected[0].bossId === "cdp_boss_nohp" && /^hp:/.test(r.rejected[0].problems[0]) && vx.ok && vy.ok && !vn.ok && /NoSuchImage_I6B/.test(vn.problems.join()) && !vh.ok && rejected.length === 1 &&
      !vx.warnings.some(w => /確認できません/.test(w)),
      JSON.stringify({ registered: r.registered, rejected: r.rejected, x: [vx.ok, vx.warnings], y: [vy.ok, vy.warnings], noimg: vn.problems, nohp: vh.problems }));
  });

  await check("Q1 ボス X の開始", async () => {
    await ev("$gameVariables.setValue(" + VAR + ", 77); $gameParty.leader().setHp(300); 'ok'");
    const started = await startBoss("cdp_boss_x");
    const look = await json(`${ST}.getEnemyLook()`), plan = await json(`${EB}.getPlan('cdp_boss_x')`), def = await json(`${EB}.getPlan('default')`);
    const b = await bfs(), h = await hud(), poc = await json("ProjectRSoulBattlePoC.getState()");
    await s.shot("q1_boss_x");
    rec("Q1 ボス X の開始", started && (await heartHp()) === 600 && (await heartMax()) === 600 && poc.hpSource === "option" && b.bossId === "cdp_boss_x" && b.maxHp === 600 && b.hp === 600 && b.phaseCount === 2 && h.maxHp === 600 && h.hp === 600 && h.name === "CDP X" &&
      look.name === "Crab" && look.chest && look.chest.x === 0.5 && look.chest.y === 0.45 && plan && plan.phases.length === 2 && plan.phases[1].rotation[0].options.count === 5 && JSON.stringify(plan) !== JSON.stringify(def) && (await v(VAR)) === 0,
      JSON.stringify({ started, heartHp: await heartHp(), max: await heartMax(), hpSource: poc.hpSource, bf: [b.bossId, b.hp, b.maxHp, b.phaseCount], hud: h, look, plan: plan && plan.phases.map(p => [p.id, p.rotation.map(e => e.pattern)]) }));
  });

  await check("Q2 HPと形態の同期・弾幕", async () => {
    await hurtHeart(300); await sleep(500);                                           // 600 → 300 = 割合 0.5 ちょうど: 第二形態
    const b = await bfs(), h = await hud(), hp = await heartHp();
    const pick = await json(`${EB}.pickPattern()`);
    await toDefense();
    let max = 0, lastPick = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 5500) { const st = await json(`${EB}.getState()`); if (st.live > max) max = st.live; if (st.lastPick) lastPick = st.lastPick; if (lastPick && max >= 5 && st.live === 0 && st.running === false) break; await sleep(40); }
    await s.shot("q2_defense_bullets");
    const patLog = await json(`${EB}.getLog().filter(function(e) { return e.type === 'pattern'; }).pop()`);
    rec("Q2 HPと形態の同期・弾幕", hp === 300 && b.hp === 300 && h.hp === 300 && b.phaseIndex === 1 && b.phase.id === "x2" && h.phaseLabel === "X第二形態" && pick.pattern === "dev_fan" &&
      lastPick && lastPick.bossId === "cdp_boss_x" && lastPick.phaseId === "x2" && lastPick.pattern === "dev_fan" && lastPick.options.count === 5 && patLog && patLog.name === "dev_fan" && patLog.count === 5,
      JSON.stringify({ heartHp: hp, bf: [b.hp, b.phaseIndex, b.phase.id], hud: [h.hp, h.phaseLabel], pick: pick.pattern, lastPick: lastPick && [lastPick.bossId, lastPick.phaseId, lastPick.pattern, lastPick.options], patternLog: patLog && [patLog.name, patLog.count], maxLiveBullets: max }));
  });

  await check("Q3 勝利", async () => {
    await hurtHeart(300);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    const mid = await encState();
    const back = await toOrigin(origin); await sleep(600);
    const look = await json(`${ST}.getEnemyLook()`), def = await json(`${ST}.DEFAULT_ENEMY_LOOK`);
    rec("Q3 勝利", mid.last && mid.last.result === "victory" && (await v(VAR)) === 1 && back && (await json(`${EB}.getPlan('cdp_boss_x')`)) === null && look.name === def.name && (await ev(`${BF}.isActive()`)) === false && (await sceneName()) === "Scene_Map" && (await ev("$gameSystem.isSaveEnabled()")) === true,
      JSON.stringify({ result: mid.last, variable: await v(VAR), back, planGone: (await json(`${EB}.getPlan('cdp_boss_x')`)) === null, look: look.name }));
  });

  await check("Q4 ボス Y", async () => {
    await ev("$gameParty.leader().setHp(300); 'ok'");
    const started = await startBoss("cdp_boss_y");
    const look = await json(`${ST}.getEnemyLook()`), plan = await json(`${EB}.getPlan('cdp_boss_y')`);
    const hp0 = await heartHp(), max0 = await heartMax(), b0 = await bfs();
    await hurtHeart(750); await sleep(400); const b1 = await bfs(), h1 = await heartHp();       // 2500 → 1750 = 0.7 ちょうど
    await hurtHeart(1000); await sleep(400); const b2 = await bfs(), h2 = await heartHp(), hu = await hud(), pick = await json(`${EB}.pickPattern()`);   // → 750 = 0.3 ちょうど
    await s.shot("q4_boss_y");
    await ev(`${EN}.abort('cdp'); 'ok'`);
    await wait(`${EN}.getState().state !== 'fighting'`, 10000);
    const back = await toOrigin(origin); await sleep(500);
    rec("Q4 ボス Y", started && hp0 === 2500 && max0 === 2500 && b0.maxHp === 2500 && b0.phaseCount === 3 && look.name === "Dragon" && plan.phases.length === 3 && plan.phases[0].rotation[0].pattern === "dev_radial" &&
      h1 === 1750 && b1.hp === 1750 && b1.phaseIndex === 1 && h2 === 750 && b2.hp === 750 && b2.phaseIndex === 2 && hu.hp === 750 && hu.maxHp === 2500 && pick.phaseId === "y3" && pick.pattern === "dev_fan" &&
      back && (await v(VAR)) === 3 && (await json(`${EB}.getPlan('cdp_boss_y')`)) === null,
      JSON.stringify({ hp0, max0, bf0: [b0.maxHp, b0.phaseCount], look: look.name, hp1: [h1, b1.hp, b1.phaseIndex], hp2: [h2, b2.hp, b2.phaseIndex], hud: [hu.hp, hu.maxHp], pick: [pick.phaseId, pick.pattern], variable: await v(VAR) }));
  });

  await check("Q5 欠落した素材", async () => {
    await ev("$gameVariables.setValue(" + VAR + ", 55); $gameTemp.reserveCommonEvent(" + IDS.cdp_boss_noimg + "); 'ok'");
    await wait("!$gameMap._interpreter.isRunning() && !$gameTemp.isCommonEventReserved()", 5000); await sleep(800);
    const st = await encState(), rej = await json(`${EN}.getLog().filter(function(e) { return e.type === 'rejected'; }).pop()`);
    rec("Q5 欠落した素材", st.state === "idle" && (await json(`${ST}.getState().state`)) === "idle" && (await v(VAR)) === 3 && rej && rej.reason === "invalidBoss" && /NoSuchImage_I6B/.test((rej.problems || []).join()) && (await sceneName()) === "Scene_Map" && (await ev("$gameSystem.isSaveEnabled()")) === true && (await ev(`${BF}.isActive()`)) === false,
      JSON.stringify({ state: st.state, variable: await v(VAR), rejected: rej }));
  });

  await check("Q6 敗北", async () => {
    await ev("$gameParty.leader().setHp(1); 'ok'");                                   // 1発当たれば倒れる(狙い撃ち・放射波は動かなくても当たるとは限らないため)
    const started = await startBoss("cdp_boss_y");
    await toDefense();
    const b = await json(`${ST}.getBattleBox()`); await c.pointer(Math.round(b.x + b.w * 0.5), Math.round(b.y + b.h * 0.55)); await sleep(200);
    const reached = await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRSoulDefeat'", 60000); await sleep(1200);
    await s.shot("q6_defeat_menu");
    const st = await encState();
    rec("Q6 敗北", started && reached && (await v(VAR)) === 2 && st.state === "defeatMenu" && st.saveBlocked === true && (await ev("$gameSystem.isSaveEnabled()")) === false && (await json(`${EB}.getPlan('cdp_boss_y')`)) === null && (await ev(`${BF}.isActive()`)) === false && (await ev("window.__writes")) === 0,
      JSON.stringify({ started, reached, variable: await v(VAR), state: st.state, planGone: (await json(`${EB}.getPlan('cdp_boss_y')`)) === null, writes: await ev("window.__writes") }));
  });

  const writes = await ev("window.__writes");
  const errs = s.errors().filter(e => !/Error saving manifest|blocked by test/.test(e));
  rec("QZ Consoleのエラーなし・保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  fs.writeFileSync(`${OUT}/soul_encounter_boss_data_results.json`, JSON.stringify({ note: "Playtest専用: ボス定義(Bosses パラメータ形式)・コモンイベントはメモリ上だけ。敵の絵は既存の素材(Crab / Dragon)を試験用に指定。保存の書き込みは StorageManager.saveObject を止めて確認。入力はCDP(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
