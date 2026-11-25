// Stage 5-B2: ProjectR_CommunicationRank(通信ランクをゲーム変数で管理)と、ProjectR_RingRewards との連携を、実機(MZ Playtest)で確認する。
//   イベントが呼ぶ形そのもの(プラグインコマンド = 引数は文字列)で、マップの実際のイベント実行器($gameMap._interpreter)でも動かす。
//   登録表はこのページの実行中だけ PluginManager.setParameters で差し替える(plugins.js は書き換えない)。キー test_a / test_b はテスト専用で、実在の人物ではない。
//   C0 読み込みと出荷の状態   C1 登録の誤り(壊れた JSON・使えない登録)は全体を停止(何も書かずイベント中断)・直せば成功   C2 読み取り   C3 引き上げ(下げない・冪等・上限)   C4 重なりの防止(イベント中断)
//   C5 RingRewards との連携   C6 保存 → 読込・以前のセーブ
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/communication_rank_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject を差し替えてブロックする)
//   追跡されているデータ(HEAD)だけで動く: テスト敵(Map001 のイベント 1・2)の位置は、スクリプトが実行時に画面の外へ退避する(lib.cjs の parkFar)。
const { session } = require("./lib.cjs");
const D = "ProjectRCardDeck", CR = "ProjectRCommunicationRank";
const PLUGIN = "ProjectR_CommunicationRank";
const GODS = ["apollo", "janus", "themis", "athena"];
const TABLE = [{ Key: "test_a", VariableId: "3", MaxRank: "5" }, { Key: "test_b", VariableId: "4", MaxRank: "3" }];
const RESULT_VAR = 5, OUTPUT_VAR = 6, DONE_SWITCH = 7;
(async () => {
  const s = await session({ field: true, ring: true }); const { ev, rec, sleep } = s;
  const ONLY = (process.env.MZ_ONLY || "").split(",").filter(Boolean);
  const check = async (id, fn) => { if (ONLY.length && !ONLY.some(o => id.startsWith(o))) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [" + id + "] done"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const calm = () => wait("!ProjectRCombatPresence.isCombatActive()", 20000);
  const configureRaw = text => ev(`PluginManager.setParameters('${PLUGIN}', { Characters: ${JSON.stringify(text)} }); 'ok'`);
  const configure = rows => configureRaw(JSON.stringify(rows.map(r => JSON.stringify(r))));
  const cmd = (plugin, name, args) => ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['${plugin}', '${name}', '${name}', ${JSON.stringify(args)}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
  const raise = (key, minimum, over = {}) => cmd(PLUGIN, "RaiseRankToMinimum", { characterKey: key, minimumRank: String(minimum), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH), ...over });
  const read = (key, over = {}) => cmd(PLUGIN, "ReadRank", { characterKey: key, outputVariableId: String(OUTPUT_VAR), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH), ...over });
  const acquire = (ring, over = {}) => cmd("ProjectR_RingRewards", "AcquireRing", { ringId: ring, rankVariableId: "3", requiredRank: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH), ...over });
  const v = id => ev(`$gameVariables.value(${id})`);
  const setVar = (id, n) => ev(`$gameVariables.setValue(${id}, ${n}); 'ok'`);
  const reset = () => ev(`$gameVariables.setValue(${RESULT_VAR}, 0); $gameSwitches.setValue(${DONE_SWITCH}, false); 'ok'`);
  const out = () => json(`({ code: $gameVariables.value(${RESULT_VAR}), done: $gameSwitches.value(${DONE_SWITCH}) })`);
  const ranks = () => json("[$gameVariables.value(3), $gameVariables.value(4)]");
  const rewardState = () => json(`({ own: ${JSON.stringify(["hermes", ...GODS])}.map(function(g){ return ${D}.getRingOwner(g); }), cards: ${D}.getPersistentData().cardOwnership, loadout: ProjectRRingLoadout.getState() })`).then(JSON.stringify);
  // 「変数 [branchVar] が 1 以上 2 以下(= 成功・済み)なら スイッチ9 ON」のあと、後続の命令(スイッチ10 ON)。マップの実際のイベント実行器で動かす
  const runMapEvent = async (plugin, command, args, branchVar) => {
    await ev(`$gameSwitches.setValue(9, false); $gameSwitches.setValue(10, false); $gameMap._interpreter.setup([
      { code: 357, indent: 0, parameters: ['${plugin}', '${command}', '${command}', ${JSON.stringify(args)}] },
      { code: 111, indent: 0, parameters: [1, ${branchVar}, 0, 1, 1] }, { code: 111, indent: 1, parameters: [1, ${branchVar}, 0, 2, 2] },
      { code: 121, indent: 2, parameters: [9, 9, 0] }, { code: 0, indent: 2, parameters: [] }, { code: 412, indent: 1, parameters: [] },
      { code: 0, indent: 1, parameters: [] }, { code: 412, indent: 0, parameters: [] },
      { code: 121, indent: 0, parameters: [10, 10, 0] }, { code: 0, indent: 0, parameters: [] }], 0); 'ok'`);
    const finished = await wait("!$gameMap._interpreter.isRunning()", 8000); await sleep(150);
    return Object.assign({ finished }, await json("({ successBranch: $gameSwitches.value(9), later: $gameSwitches.value(10) })"));
  };
  const reload = async saved => {
    await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(saved)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
    await sleep(800); await waitMap(1); await sleep(1200); await s.parkFar(); await calm();
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500); await s.parkFar(); await calm();
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  const oldSave = await ev("JsonEx.stringify(DataManager.makeSaveContents())");                           // 通信ランクをまだ使っていない時点のセーブ(以前のセーブの代わり)

  await check("C0", async () => {
    const st = await json(`({ cmds: Object.keys(PluginManager._commands).filter(function(k){ return k.indexOf('${PLUGIN}:') === 0; }).sort(), params: PluginManager.parameters('${PLUGIN}').Characters, entries: ${CR}.entries(), ids: ${CR}.rankVariableIds() })`);
    rec("C0a 読み込まれてコマンド2つが登録されている。出荷の登録表は空(人物・値は未設定)", st.cmds.join() === `${PLUGIN}:RaiseRankToMinimum,${PLUGIN}:ReadRank` && st.params === "[]" && st.entries.length === 0 && st.ids.length === 0, JSON.stringify(st));
    await reset(); await raise("test_a", 2); const o = await out();
    rec("C0b 登録が空のときは、どのキーも拒否(-1)・変数は変わらない", o.code === -1 && o.done === false && JSON.stringify(await ranks()) === "[0,0]", JSON.stringify(o));
  });

  await check("C1", async () => {
    const row = o => JSON.stringify(Object.assign({}, TABLE[0], o));
    const BROKEN = [
      ["表が壊れた JSON", "abc"],
      ["1行だけ壊れた JSON", JSON.stringify(["{broken", JSON.stringify(TABLE[1])])],
      ["使えない行(上限が未設定)と正しい行", JSON.stringify([JSON.stringify(TABLE[0]), row({ Key: "test_nomax", VariableId: "8", MaxRank: "0" })])],
      ["同じ変数の重複", JSON.stringify([JSON.stringify(TABLE[0]), row({ Key: "test_dup" })])]
    ];
    const commandArgs = () => [
      [PLUGIN, "RaiseRankToMinimum", { characterKey: "test_a", minimumRank: "5", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }],
      [PLUGIN, "ReadRank", { characterKey: "test_a", outputVariableId: String(OUTPUT_VAR), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }],
      ["ProjectR_RingRewards", "AcquireRing", { ringId: "themis", rankVariableId: "3", requiredRank: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }],
      ["ProjectR_RingRewards", "RaiseSkillLevel", { skillId: "apollo_eros_arrow", targetLevel: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }]
    ];
    const allData = () => json("({ vars: $gameVariables._data, done: $gameSwitches.value(7) })").then(JSON.stringify);
    await ev(`${D}.assignRingToPlayer('apollo'); 'ok'`); await setVar(3, 4); await setVar(4, 2);          // 正しい登録なら、4つのコマンドはどれも成功する状態
    let stale = 1;
    for (const [label, broken] of BROKEN) {
      await configureRaw(broken);
      for (const [plugin, command, a] of commandArgs()) {
        stale = stale === 1 ? 2 : 1;
        await setVar(RESULT_VAR, stale); await setVar(OUTPUT_VAR, stale); await ev(`$gameSwitches.setValue(${DONE_SWITCH}, false); 'ok'`);       // 前に残った成功の値
        const data = await allData(), reward = await rewardState();
        const r = await runMapEvent(plugin, command, a, RESULT_VAR);
        rec(`C1 ${label} / ${command}(残った値 ${stale}): イベントを中断(残った成功で先へ進まない)・全部の変数・完了スイッチ・指輪・スキルは不変`, r.finished && r.successBranch === false && r.later === false && (await allData()) === data && (await rewardState()) === reward, JSON.stringify(r));
      }
    }
    await configureRaw("abc"); await setVar(RESULT_VAR, 1);
    const data = await allData(), reward = await rewardState();
    const api = await json(`[${CR}.raiseRankToMinimum({ characterKey: 'test_a', minimumRank: 5, resultVariableId: 3 }), ${CR}.readRank({ characterKey: 'test_a', outputVariableId: 4, resultVariableId: 3 }), ${CR}.getRank('test_a'), ProjectRRingRewards.acquireRing({ ringId: 'themis', rankVariableId: 3, requiredRank: 1, resultVariableId: 4, completedSwitchId: 7 }), ProjectRRingRewards.raiseSkillLevel({ skillId: 'apollo_eros_arrow', targetLevel: 3, resultVariableId: 3, completedSwitchId: 7 })].map(function(r){ return [r.code, r.status, r.abortEvent]; })`);
    rec("C1x 壊れた登録の間は API も -1(rankConfigurationInvalid)。守る変数が分からないので、どの出力先も書かない", api.every(r => r[0] === -1 && r[1] === "rankConfigurationInvalid" && r[2] === true) && (await allData()) === data && (await rewardState()) === reward, JSON.stringify(api));
    await configure(TABLE);
    const st = await json(`({ valid: ${CR}.entries().map(function(e){ return e.valid; }), problems: ${CR}.problems().length, ids: ${CR}.rankVariableIds() })`);
    const passed = [];
    for (const [plugin, command, a] of commandArgs()) { await reset(); const r = await runMapEvent(plugin, command, a, RESULT_VAR), o = await out(); passed.push(r.successBranch && r.later && o.done && o.code === 1); }
    rec("C1y 登録を直すと、同じ4つのイベントがすべて成功して先へ進む(ランク 5・読み取り 5・指輪の入手・Lv3)", passed.length === 4 && passed.every(Boolean) && (await v(3)) === 5 && (await v(OUTPUT_VAR)) === 5 && (await ev(`${D}.getRingOwner('themis')`)) === "player" && (await ev(`${D}.getPersistentData().cardOwnership['apollo_eros_arrow'].level`)) === 3, JSON.stringify(passed));
    rec("C1z 正しい登録は使える(2件・問題なし・ランク用の変数 3, 4)", st.valid.join() === "true,true" && st.problems === 0 && st.ids.join() === "3,4", JSON.stringify(st));
    await setVar(3, 0); await setVar(4, 0); await setVar(OUTPUT_VAR, 0); await reset();
  });

  await check("C2", async () => {
    await reset(); await setVar(OUTPUT_VAR, 9); await read("test_a"); const o = await out();
    rec("C2a 読み取り: 最初のランクは 0(出力の変数)・結果 1・成功スイッチ ON", (await v(OUTPUT_VAR)) === 0 && o.code === 1 && o.done === true, JSON.stringify(o));
    await reset(); await setVar(OUTPUT_VAR, 4); await read("nobody"); const o2 = await out();
    rec("C2b 読み取りの失敗: 出力の変数は -1(前の値を残さない)・結果 -1・スイッチは OFF", (await v(OUTPUT_VAR)) === -1 && o2.code === -1 && o2.done === false, JSON.stringify(o2));
  });

  await check("C3", async () => {
    for (const [minimum, code, rank] of [[2, 1, 2], [2, 2, 2], [1, 2, 2], [5, 1, 5], [5, 2, 5]]) {
      await reset(); await raise("test_a", minimum); const o = await out();
      rec(`C3 引き上げ(最低 ${minimum}): 結果 ${code}・ランク ${rank}・完了 ON・ほかのキャラクターは 0 のまま`, o.code === code && o.done === true && (await v(3)) === rank && (await v(4)) === 0, JSON.stringify({ o, ranks: await ranks() }));
    }
    for (const [key, minimum, code] of [["test_b", 4, -2], ["test_a", 6, -2], ["test_a", 0, -1], ["test_a", "x", -2], ["", 2, -2]]) {
      await reset(); const before = JSON.stringify(await ranks()); await raise(key, minimum); const o = await out();
      rec(`C3 不正な指定(キー ${JSON.stringify(key)} / 値 ${JSON.stringify(minimum)}): 結果 ${code}・ランクは変わらない・完了にしない`, o.code === code && o.done === false && JSON.stringify(await ranks()) === before, JSON.stringify(o));
    }
    await reset(); await read("test_a"); rec("C3z 読み取りで引き上げ後のランクが得られる(5)", (await v(OUTPUT_VAR)) === 5 && (await out()).code === 1, String(await v(OUTPUT_VAR)));
  });

  await check("C4", async () => {
    const args = over => Object.assign({ characterKey: "test_a", minimumRank: "5", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }, over);
    const readArgs = over => Object.assign({ characterKey: "test_a", outputVariableId: String(OUTPUT_VAR), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }, over);
    for (const rank of [1, 2]) {
      for (const [label, command, a, branchVar] of [["引き上げ: 結果 = 自分のランク変数", "RaiseRankToMinimum", args({ resultVariableId: "3" }), 3], ["引き上げ: 結果 = 別のキャラクターのランク変数", "RaiseRankToMinimum", args({ resultVariableId: "4" }), 4], ["読み取り: 結果 = ランク変数", "ReadRank", readArgs({ resultVariableId: "4" }), 4], ["読み取り: 出力 = ランク変数", "ReadRank", readArgs({ outputVariableId: "4", resultVariableId: "0" }), 4]]) {
        await setVar(3, rank); await setVar(4, rank); await reset();
        const r = await runMapEvent(PLUGIN, command, a, branchVar), o = await out();
        rec(`C4 ${label}(ランク ${rank}): イベントを中断(残ったランクを成功と読まない・後続を実行しない)・ランクは不変・完了にしない`, r.finished && r.successBranch === false && r.later === false && o.done === false && JSON.stringify(await ranks()) === JSON.stringify([rank, rank]), JSON.stringify({ r, o, ranks: await ranks() }));
      }
    }
    await setVar(3, 0); await setVar(4, 0); await reset();
    const ok = await runMapEvent(PLUGIN, "RaiseRankToMinimum", args({ minimumRank: "2" }), RESULT_VAR), again = await runMapEvent(PLUGIN, "RaiseRankToMinimum", args({ minimumRank: "2" }), RESULT_VAR);
    rec("C4z 重なりが無ければ、イベントは続き成功と読める。同じイベントをもう一度実行しても成功(済み)で、ランクは増えない", ok.successBranch === true && ok.later === true && again.successBranch === true && (await v(3)) === 2, JSON.stringify({ ok, again, rank: await v(3) }));
  });

  await check("C5", async () => {
    await configure(TABLE); await setVar(3, 0); await setVar(4, 0); await calm();
    const before = await rewardState(); await reset(); await raise("test_a", 5); await raise("test_b", 3); await sleep(300);
    rec("C5a ランクを上限まで上げただけでは、指輪もスキルも装備も何も変わらない(自動で付与しない)", (await rewardState()) === before, "");
    await setVar(3, 2); await reset(); await acquire("janus"); const low = await out();
    await reset(); await raise("test_a", 3); await reset(); await acquire("janus"); const got = await out();
    rec("C5b 指輪は決まったイベントで、通信ランクの変数を使って入手する: ランク 2 は不足(-3) → 3 に引き上げて入手(1)", low.code === -3 && got.code === 1 && (await ev(`${D}.getRingOwner('janus')`)) === "player" && (await ev(`${D}.getRingOwner('athena')`)) === "unowned" && (await ev(`${D}.getRingOwner('hermes')`)) === "unowned", JSON.stringify({ low, got }));
    for (const rank of [1, 2]) {
      await setVar(4, rank); await reset(); const st0 = await rewardState();
      const a = await runMapEvent("ProjectR_RingRewards", "AcquireRing", { ringId: "athena", rankVariableId: "3", requiredRank: "3", resultVariableId: "4", completedSwitchId: String(DONE_SWITCH) }, 4);
      rec(`C5c 指輪の入手: 結果の変数 = 別のキャラクターのランク変数(ランク ${rank}): イベントを中断・付与しない・ランクは不変`, a.finished && a.successBranch === false && a.later === false && (await v(4)) === rank && (await rewardState()) === st0 && (await out()).done === false, JSON.stringify(a));
      await reset(); const st1 = await rewardState();
      const l = await runMapEvent("ProjectR_RingRewards", "RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "3", resultVariableId: "4", completedSwitchId: String(DONE_SWITCH) }, 4);
      rec(`C5d レベル上げ: 結果の変数 = ランク変数(ランク ${rank}): イベントを中断・レベルは不変・ランクは不変`, l.finished && l.successBranch === false && l.later === false && (await v(4)) === rank && (await rewardState()) === st1 && (await out()).done === false, JSON.stringify(l));
    }
    await reset(); await cmd("ProjectR_RingRewards", "RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "2", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }); const lv = await out();
    rec("C5e スキルのレベルは専用のイベントで上がる(指輪を所持・重なりなし → 結果 1・Lv2)", lv.code === 1 && (await ev(`${D}.getPersistentData().cardOwnership['janus_reflection'].level`)) === 2, JSON.stringify(lv));
  });

  await check("C6", async () => {
    await configure(TABLE); await setVar(3, 4); await setVar(4, 1);
    const saved = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    rec("C6a セーブに、登録表や新しい保存領域は入らない(キー・上限・プラグイン名の語が無い)。ランクはゲーム変数", !/CommunicationRank|test_a|test_b|MaxRank|_projectRCommunication|_projectRRank/.test(saved), `len=${saved.length}`);
    await setVar(3, 0); await setVar(4, 0); await reload(saved);
    rec("C6b 読み込むと、ランクが保存時の値に戻る(4 と 1)", JSON.stringify(await ranks()) === "[4,1]", JSON.stringify(await ranks()));
    await reset(); await raise("test_a", 4); const same = await out(); await reset(); await raise("test_a", 2); const lower = await out();
    rec("C6c 読込後の再実行は冪等: 同じ値・低い値は 2(済み)・ランクは下がらない", same.code === 2 && lower.code === 2 && (await v(3)) === 4, JSON.stringify({ same, lower }));
    await reload(oldSave);
    const fresh = await ranks(); await reset(); await raise("test_a", 1); const o = await out();
    rec("C6d 以前のセーブ(ランクを使う前)は、ランク 0 から読めて、そのまま引き上げられる", JSON.stringify(fresh) === "[0,0]" && o.code === 1 && (await v(3)) === 1, JSON.stringify({ fresh, o }));
  });

  const errs = s.errors();
  rec("C7 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/communication_rank_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
