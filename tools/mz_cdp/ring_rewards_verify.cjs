// Stage 5-B1: ProjectR_RingRewards(通信ランクを満たしたときの指輪の入手 / スキルの固定レベル報酬)を、実機(MZ Playtest)で確認する。
//   イベントが呼ぶ形そのもの(Game_Interpreter の「プラグインコマンド」= 引数は文字列)で実行する。ヒロイン・ランクの閾値・マップのイベントは使わない(ゲーム変数 3 をランクの代わりに使う)。
//   R1 ランク不足   R2 設定不足   R3 成功(4つの神)   R4 重複   R5 仲間が持つ指輪   R6 戦闘中(フィールド戦闘中)   R7 固定レベル   R8 レベルが実際の戦闘で効く(反照 Lv)
//   R9 保存 → 読込   R10 Hermes の本編の入手   R11 イベントの完了(失敗では完了にならない)   R13 スキルのレベルは指輪を持っているときだけ(未所持・仲間が所持 = -6)
//   R14 設定の誤り(結果の変数 = ランク変数はイベントを中断・使えない番号の指定は付与/レベル上げの前に拒否)。マップのイベント実行器($gameMap._interpreter)で動かす
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/ring_rewards_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject を差し替えてブロックする)
//   追跡されているデータ(HEAD)だけで動く: テスト敵(Map001 のイベント 1・2)の位置は、スクリプトが実行時に画面の外へ退避する(lib.cjs の parkFar)。
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", RL = "ProjectRRingLoadout", D = "ProjectRCardDeck", RR = "ProjectRRingRewards", INV = "ProjectRCardInventory", JS = "ProjectRJanusSkills";
const GODS = ["apollo", "janus", "themis", "athena"];
const RANK_VAR = 3, RESULT_VAR = 5, DONE_SWITCH = 7;
(async () => {
  const s = await session({ field: true, ring: true }); const { ev, c, rec, sleep } = s;
  const ONLY = (process.env.MZ_ONLY || "").split(",").filter(Boolean);
  const check = async (id, fn) => { if (ONLY.length && !ONLY.some(o => id.startsWith(o))) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [" + id + "] done"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(200); };
  const putEnemy = (id, dx, dy) => ev(`(function(){ var e = $gameMap.event(${id}), x = $gamePlayer._realX + (${dx}), y = $gamePlayer._realY + (${dy}); e.locate(x, y); e._realX = x; e._realY = y; return 'ok'; })()`);
  // イベントの「プラグインコマンド」と同じ形(code 357 / 引数は文字列)で実行する
  const cmd = (name, args) => ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_RingRewards', '${name}', '${name}', ${JSON.stringify(args)}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`);
  const acquire = (ring, over = {}) => cmd("AcquireRing", { ringId: ring, rankVariableId: String(RANK_VAR), requiredRank: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH), ...over });
  const raise = (skillId, lv, over = {}) => cmd("RaiseSkillLevel", { skillId, targetLevel: String(lv), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH), ...over });
  const setRank = n => ev(`$gameVariables.setValue(${RANK_VAR}, ${n}); 'ok'`);
  const resetResult = () => ev(`$gameVariables.setValue(${RESULT_VAR}, 0); $gameSwitches.setValue(${DONE_SWITCH}, false); 'ok'`);
  const out = () => json(`({ code: $gameVariables.value(${RESULT_VAR}), done: $gameSwitches.value(${DONE_SWITCH}) })`);
  const owner = ring => ev(`${D}.getRingOwner('${ring}')`);
  const level = id => ev(`(function(){ var e = ${D}.getPersistentData().cardOwnership['${id}']; return e ? e.level : 1; })()`);
  const owned = id => ev(`${D}.isCardOwned('${id}')`);
  const copies = () => json(`${INV}.state().copies`);
  const cards = () => json(`${D}.getPersistentData().cardOwnership`);
  const loadoutState = () => json(`${RL}.getState()`);
  const combat = () => ev("ProjectRCombatPresence.isCombatActive()");
  const calm = () => wait("!ProjectRCombatPresence.isCombatActive()", 20000);                          // 戦闘が終わって、戦闘中の判定が解けるまで待つ(猶予フレームがある)
  const setOwner = (ring, owner) => ev(`$gameSystem._projectRCardDeckData.ringOwnershipState.${ring} = '${owner}'; 'ok'`);   // 検証の準備(状態の書き換えだけ。ファイルは書かない)

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500); await s.parkFar();
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`window.__sf = 0; (function(){ var orig = SceneManager.updateScene; SceneManager.updateScene = function() { window.__sf = (window.__sf || 0) + 1; return orig.apply(this, arguments); }; })(); 'ok'`);
  const plugin = await json(`({ api: typeof ${RR}, cmds: Object.keys(PluginManager._commands).filter(function(k){ return k.indexOf('ProjectR_RingRewards:') === 0; }).sort(), owners: ${JSON.stringify(GODS)}.map(function(g){ return ${D}.getRingOwner(g); }), hermes: ${D}.getRingOwner('hermes') })`);

  // ---- R0: 読み込み ----
  await check("R0", async () => {
    rec("R0 プラグインが読み込まれ、コマンド2つが登録されている。新しいゲームでは4つの神の指輪は誰も持っていない", plugin.api === "object" && plugin.cmds.join() === "ProjectR_RingRewards:AcquireRing,ProjectR_RingRewards:RaiseSkillLevel" && plugin.owners.every(o => o === "unowned") && plugin.hermes === "unowned", JSON.stringify(plugin));
  });

  // ---- R10: Hermes の本編の入手(先に行う = 以降の「Hermes は変わらない」の基準) ----
  await check("R10", async () => {
    await resetResult(); await raise("hermes_sweep", 3); const pre = await out();
    rec("R10-pre Hermes の指輪を入手する前は、Hermes のスキルのレベルを上げられない: 結果 -6・完了にしない・Lv1 のまま", pre.code === -6 && pre.done === false && (await level("hermes_sweep")) === 1 && (await owner("hermes")) === "unowned", JSON.stringify(pre));
    await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); return 'ok'; })()`); await sleep(300);
    const cp = await copies(), total = Object.keys(cp).filter(k => k.indexOf("hermes_") === 0).reduce((a, k) => a + cp[k], 0);
    rec("R10a Hermes の本編の入手(AcquireHermesRing)は従来どおり: 主人公の所持・初期カードが 7種30枚(ストレングス10)", (await owner("hermes")) === "player" && total === 30 && cp.hermes_strength === 10, JSON.stringify({ total, strength: cp.hermes_strength }));
  });
  const hermesBefore = await json(`({ copies: ${INV}.state().copies, prod: $gameSystem._projectRHermesProduction })`);

  // ---- R1: ランク不足 ----
  await check("R1", async () => {
    await setRank(2); await resetResult(); const before = JSON.stringify(await loadoutState()) + JSON.stringify(await cards());
    await acquire("apollo"); const o = await out();
    rec("R1a ランク不足(2 < 3): 付与しない・結果 -3・完了スイッチは OFF", o.code === -3 && o.done === false && (await owner("apollo")) === "unowned", JSON.stringify(o));
    rec("R1b ランク不足では、装備・カード・レベルも変わらない", JSON.stringify(await loadoutState()) + JSON.stringify(await cards()) === before, "");
    await setRank(3); await acquire("apollo"); const o2 = await out();
    rec("R1c ちょうど必要ランク(3 ≧ 3): 付与される・結果 1・完了 ON(境界)", o2.code === 1 && o2.done === true && (await owner("apollo")) === "player", JSON.stringify(o2));
  });

  // ---- R2: 設定不足 ----
  await check("R2", async () => {
    await setRank(50); await resetResult();
    const cases = [["指輪が未設定(空)", { ringId: "" }, -2], ["hermes は対象外", { ringId: "hermes" }, -2], ["ランク変数が未設定(0)", { ringId: "janus", rankVariableId: "0" }, -1], ["必要ランクが未設定(0)", { ringId: "janus", requiredRank: "0" }, -1], ["必要ランクが空", { ringId: "janus", requiredRank: "" }, -1], ["ランク変数が範囲外(121)", { ringId: "janus", rankVariableId: "121" }, -1], ["結果の変数がランク変数と同じ", { ringId: "janus", resultVariableId: String(RANK_VAR) }, -1]];
    for (const [label, over, code] of cases) {
      await resetResult(); await acquire(over.ringId === undefined ? "janus" : over.ringId, over); const o = await out();
      const rankIntact = (await ev(`$gameVariables.value(${RANK_VAR})`)) === 50;
      const protectedCase = over.resultVariableId === String(RANK_VAR);                                // 結果をランク変数へ書く指定: 付与しない・ランク変数は書き換えない(結果のコードは書かれない)
      rec(`R2 ${label}: 付与しない${protectedCase ? "" : `(結果 ${code})`}・完了にしない・ランク変数は守られる`, (await owner("janus")) === "unowned" && o.done === false && rankIntact && (protectedCase || o.code === code), JSON.stringify(o));
    }
    // 引数が全部空のコマンド(エディタで何も設定しない場合)
    await resetResult(); await cmd("AcquireRing", { ringId: "", rankVariableId: "0", requiredRank: "0", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) });
    const o = await out(); const unowned = await json(`${JSON.stringify(["janus", "themis", "athena"])}.map(function(g){ return ${D}.getRingOwner(g); })`);
    rec("R2z 何も設定しないコマンドは何も付与しない(結果 -2・完了にしない・Janus / Themis / Athena は未所持のまま)", o.code === -2 && o.done === false && unowned.every(x => x === "unowned"), JSON.stringify({ o, unowned }));
  });

  // ---- R3: 成功(4つの神)・R4: 重複 ----
  await check("R3", async () => {
    await setOwner("apollo", "unowned"); await setRank(5);                                               // Apollo は R1c で入手済み。4つとも「成功」を確かめるため、準備として未所持へ戻す
    for (const g of GODS) {
      await resetResult(); const lo0 = JSON.stringify(await loadoutState()).length; await acquire(g, { requiredRank: "4" }); const o = await out();
      const st = await json(`({ own: ${D}.getRingOwner('${g}'), eq: ${RL}.isRingEquipped('${g}'), unlocked: ${RL}.getUnlockedSkills('${g}'), skills: ${RL}.getRingSkills('${g}'), q: ${RL}.getUltimate(), slots: ${RL}.getSlots() })`);
      rec(`R3-${g} 成功: 主人公の所持・結果 1・完了 ON・5スキルが解放される・自動で装備しない・スロットも Q も空のまま`, st.own === "player" && o.code === 1 && o.done === true && st.unlocked.length === 5 && st.unlocked.join() === st.skills.join() && st.eq === false && st.q === null && Object.values(st.slots).every(v => v === null), JSON.stringify({ o, own: st.own, eq: st.eq, q: st.q, slots: st.slots }));
    }
    const h = await json(`({ copies: ${INV}.state().copies, prod: $gameSystem._projectRHermesProduction })`);
    rec("R3z Hermes の所持枚数と付与記録は変わらない(4つの指輪を入手しても)", JSON.stringify(h) === JSON.stringify(hermesBefore), "");
  });
  await check("R4", async () => {
    await setRank(0); const snap = JSON.stringify([await loadoutState(), await cards(), await copies()]);
    for (let i = 0; i < 3; i++) { await resetResult(); await acquire("athena"); const o = await out(); rec(`R4-${i} 重複(${i + 2}回目): 結果 2(すでに済み)・完了 ON・何も変わらない(ランクが 0 に下がっていても)`, o.code === 2 && o.done === true && JSON.stringify([await loadoutState(), await cards(), await copies()]) === snap, JSON.stringify(o)); }
  });

  // ---- R5: 仲間が持つ指輪 ----
  await check("R5", async () => {
    await setOwner("themis", "actor:2");
    await setRank(9); await resetResult(); await acquire("themis"); const o = await out();
    rec("R5 仲間が持っている指輪は取り上げない: 結果 -5・完了にしない・所有者は actor:2 のまま", o.code === -5 && o.done === false && (await owner("themis")) === "actor:2", JSON.stringify(o));
    await setOwner("themis", "player");                                                                  // 元(R3 で主人公が持った状態)へ戻す
  });

  // ---- R6: 戦闘中(本物のフィールド戦闘 = FieldCombat.begin。CombatPresence の「戦闘中」が実際に立つ) ----
  await check("R6", async () => {
    await setOwner("athena", "unowned");                                                                 // 入手し直せるように、準備として未所持へ戻す
    await setRank(9); await resetResult();                                                                // 主人公は開始位置のまま(カメラを動かすと、画面の端の退避済みの敵が見えて「戦闘中」になってしまう)
    await ev(`${FC}.setDevAllowOutsideEncounter(true); ${FC}.begin(); 'ok'`); await sleep(500);
    const inCombat = await combat();
    await acquire("athena"); const o = await out();
    rec("R6a 戦闘中(フィールド戦闘が始まっている)は付与しない: 結果 -4・完了にしない・未所持のまま", inCombat && o.code === -4 && o.done === false && (await owner("athena")) === "unowned", JSON.stringify({ inCombat, o }));
    await resetResult(); const lv0 = await level("janus_dual_gate"); await raise("janus_dual_gate", 3); const o2 = await out();
    rec("R6b 戦闘中は(持っている指輪の)スキルのレベルも上げない: 結果 -4・レベルは変わらない・完了にしない", (await owner("janus")) === "player" && o2.code === -4 && o2.done === false && (await level("janus_dual_gate")) === lv0, JSON.stringify({ o2, lv0 }));
    await resetResult(); const lvA = await level("athena_aegis"); await raise("athena_aegis", 3); const o5 = await out();
    rec("R6e 戦闘中でも、持っていない指輪のスキルは -6(所持の確認が先)・レベルは変わらない", o5.code === -6 && o5.done === false && (await level("athena_aegis")) === lvA, JSON.stringify({ o5, lvA }));
    await ev(`${FC}.end(); 'ok'`); const settled = await calm();
    await resetResult(); await acquire("athena"); const o3 = await out();
    rec("R6c 戦闘が終われば付与できる(結果 1・完了 ON)", settled && o3.code === 1 && o3.done === true && (await owner("athena")) === "player", JSON.stringify({ settled, o3 }));
    await resetResult(); await raise("athena_aegis", 2); const o4 = await out();
    rec("R6d 戦闘が終われば、スキルのレベルも上げられる(結果 1・Lv2)", o4.code === 1 && (await level("athena_aegis")) === 2, JSON.stringify({ o4, lv: await level("athena_aegis") }));
  });

  // ---- R7: 固定レベル ----
  await check("R7", async () => {
    const id = "janus_reflection", other = "athena_counter";
    const ownedBefore = await owned(id), otherLv = await level(other), cp0 = JSON.stringify(await copies()), lo0 = JSON.stringify(await loadoutState());
    const seq = [[2, 1, 2], [2, 2, 2], [3, 1, 3], [2, 2, 3], [3, 2, 3]];                               // [目標, 期待する結果, 期待するレベル]
    for (const [target, code, lv] of seq) {
      await resetResult(); await raise(id, target); const o = await out();
      rec(`R7-Lv${target} 目標 Lv${target}: 結果 ${code}(1=上げた / 2=済み)・レベル ${lv}・完了 ON`, o.code === code && o.done === true && (await level(id)) === lv, JSON.stringify({ o, lv: await level(id) }));
    }
    rec("R7a 所持フラグ・所持枚数・指輪の装備・スキル枠・ほかのスキルのレベルは変わらない", (await owned(id)) === ownedBefore && JSON.stringify(await copies()) === cp0 && JSON.stringify(await loadoutState()) === lo0 && (await level(other)) === otherLv, "");
    const bad = [["", 2], ["zeus_bolt", 2], ["hermes_swift_movement", 2], [id, ""], [id, 1], [id, 4], [id, "x"]];
    for (const [sid, lv] of bad) { await resetResult(); await cmd("RaiseSkillLevel", { skillId: sid, targetLevel: String(lv), resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }); const o = await out(); rec(`R7-bad 不正(skillId=${JSON.stringify(sid)} / 目標=${JSON.stringify(lv)}): 結果 -2・完了にしない`, o.code === -2 && o.done === false && (await level(id)) === 3, JSON.stringify(o)); }
    await ev(`${D}.setCardLevel('${id}', 1); 'ok'`);                                                    // R8 のために Lv1 へ戻す(テスト用の状態の書き換え)
  });

  // ---- R8: レベルが実際の戦闘で効く(反照: 受け流しの窓 Lv2 = 0.5 秒 / Lv3 = 0.6 秒) ----
  await check("R8", async () => {
    await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
    await ev(`(function(){ ${FC}.end(); ${FC}.setLoadoutSource('auto'); ['lmb','shift','e','x','c'].forEach(function(sl){ ${RL}.clearSkill(sl); }); var r = ${RL}.equipRing('janus'); var t = ${RL}.setSkill('e', 'janus_reflection'); return [r.ok, t.ok]; })()`);
    await s.parkFar();
    for (const [target, window] of [[2, 0.5], [3, 0.6]]) {
      await calm(); await resetResult(); await raise("janus_reflection", target); const ro = await out();
      await ev(`${FC}.end(); ${FC}.begin(); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`); await sleep(300);
      const use = await json(`(function(){ var r = ${FC}.useAbility('special'); return { r: r, st: ${JS}.getState() }; })()`);
      rec(`R8-Lv${target} 報酬で上げたレベル(Lv${target})が、実際の反照に効く: 受け流しの窓 ${window} 秒・レベル ${target}`, ro.code === 1 && use.r && use.r.ok === true && !!use.st.armed && use.st.armed.level === target && Math.abs(use.st.armed.remaining - window) < 0.25, JSON.stringify({ reward: ro, r: use.r && use.r.ok, armed: use.st.armed }));
      await ev(`${FC}.end(); 'ok'`); await sleep(300);
    }
  });

  // ---- R9: 保存 → 読込 ----
  await check("R9", async () => {
    await ev(`${FC}.end(); 'ok'`); await calm();
    await raise("janus_reflection", 3); await raise("athena_spear_circle", 2);
    const saved = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    rec("R9a セーブに、このプラグイン固有の記録・新しい保存領域は入らない(ランク・必要ランク・RingRewards の語が無い)", !/RingRewards|rankVariable|requiredRank|_projectRRingRewards|_projectRRank/.test(saved), `len=${saved.length}`);
    const before = JSON.stringify([await json(`${D}.getPersistentData().ringOwnershipState`), await level("janus_reflection"), await level("athena_spear_circle")]);
    const broke = await json(`(function(){ $gameSystem._projectRCardDeckData.ringOwnershipState.themis = 'unowned'; ${D}.setCardLevel('janus_reflection', 1); return { themis: ${D}.getRingOwner('themis'), lv: ${D}.getPersistentData().cardOwnership['janus_reflection'].level }; })()`);           // 状態を壊してから読み込む
    rec("R9-pre 読み込む前に状態を壊せている(Themis 未所持・反照 Lv1)", broke.themis === "unowned" && broke.lv === 1, JSON.stringify(broke));
    await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(saved)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
    await sleep(800); await waitMap(1); await sleep(1200); await s.parkFar();
    const after = JSON.stringify([await json(`${D}.getPersistentData().ringOwnershipState`), await level("janus_reflection"), await level("athena_spear_circle")]);
    rec("R9b 読み込むと、指輪の所有とスキルのレベルが保存時に戻る(Themis・反照 Lv3・護槍旋陣 Lv2)", after === before, after);
    await calm();                                                                                        // マップを読み直した直後は、退避前のテスト敵で「戦闘中」の判定が残る(猶予フレーム)。解けるのを待つ
    await resetResult(); await acquire("themis"); const o1 = await out(); await resetResult(); await raise("janus_reflection", 3); const o2 = await out();
    rec("R9c 読み込んだ後の再実行は冪等: 持っている指輪は 2(済み)・目標以上のレベルは 2・レベルは増えない", o1.code === 2 && o2.code === 2 && (await level("janus_reflection")) === 3 && (await level("athena_spear_circle")) === 2, JSON.stringify({ o1, o2 }));
  });

  // ---- R13: スキルのレベルは、その指輪を主人公が持っているときだけ上げられる ----
  await check("R13", async () => {
    await calm();
    const th = (await json(`${RL}.getRingSkills('themis')`))[0];
    const kept = async () => JSON.stringify([await cards(), await copies(), await loadoutState()]);
    // 目標 Lv2 / Lv3 × 完了スイッチが OFF / ON の4通りで拒否: 結果 -6・スイッチはそのまま・レベル・所持フラグ・所持枚数・編成・所有者は変わらない
    const rejects = async (label, expectedOwner) => {
      const before = await kept(), lv = await level(th), got = [];
      for (const target of [2, 3]) for (const preset of [false, true]) {
        await resetResult(); await ev(`$gameSwitches.setValue(${DONE_SWITCH}, ${preset}); 'ok'`); await raise(th, target); const o = await out();
        got.push({ target, preset, code: o.code, done: o.done });
      }
      await resetResult();
      rec(label, got.every(g => g.code === -6 && g.done === g.preset) && (await kept()) === before && (await level(th)) === lv && (await owner("themis")) === expectedOwner, JSON.stringify({ lv, owner: await owner("themis"), got: got.map(g => g.code + (g.done ? "+on" : "")) }));
    };
    const reload = async saved => {
      await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(saved)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
      await sleep(800); await waitMap(1); await sleep(1200); await s.parkFar(); await calm();
    };
    await setOwner("themis", "unowned"); await ev(`${D}.setCardLevel('${th}', 1); 'ok'`);
    await rejects("R13a 未所持の指輪のスキルは上げられない: 結果 -6・完了スイッチ(OFF/ON)はそのまま・レベル・所持フラグ・枚数・編成は不変", "unowned");
    await setOwner("themis", "actor:2");
    await rejects("R13b 仲間が持っている指輪のスキルも上げられない: 結果 -6・何も変わらない・取り上げない", "actor:2");
    await ev(`${D}.setCardLevel('${th}', 2); 'ok'`);
    await rejects("R13c 保存されているレベル(Lv2)があっても、目標が同じ Lv2 でも「済み」にせず -6・保存済みのレベルはそのまま", "actor:2");
    await setOwner("themis", "unowned");
    const savedUnowned = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    await ev(`${D}.setCardLevel('${th}', 1); 'ok'`); await setOwner("themis", "player"); await reload(savedUnowned);
    rec("R13d 未所持 + 保存済み Lv2 のセーブを読み込むと、そのまま戻る(読込はレベルを書き換えない)", (await owner("themis")) === "unowned" && (await level(th)) === 2, JSON.stringify({ owner: await owner("themis"), lv: await level(th) }));
    await rejects("R13e 読み込んだ後も、未所持の指輪のスキルは -6(何も変わらない)", "unowned");
    await setRank(3); await resetResult(); await acquire("themis"); const got = await out(); const lvAfterAcquire = await level(th);
    const steps = [];
    for (const [target, code, lv] of [[2, 2, 2], [3, 1, 3], [3, 2, 3], [2, 2, 3]]) { await resetResult(); await raise(th, target); const o = await out(); steps.push({ target, ok: o.code === code && o.done === true && (await level(th)) === lv, code: o.code }); }
    rec("R13f 指輪を入手した後は成功する: 入手はレベルを変えない → Lv2 は済み → Lv3 へ上げる → 繰り返しは済み・下げない(どれも完了 ON)", got.code === 1 && lvAfterAcquire === 2 && steps.every(x => x.ok), JSON.stringify({ got, lvAfterAcquire, steps: steps.map(x => x.code) }));
    const savedOwned = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    await ev(`${D}.setCardLevel('${th}', 1); 'ok'`); await reload(savedOwned); await resetResult(); await raise(th, 3); const again = await out();
    rec("R13g 入手して上げたレベルもセーブ → ロードで戻り、読込後の再実行は済み(2)・新しい保存領域は無い", (await owner("themis")) === "player" && (await level(th)) === 3 && again.code === 2 && !/RingRewards|rankVariable|requiredRank/.test(savedOwned), JSON.stringify({ again, lv: await level(th) }));
    await setOwner("themis", "actor:2");
    await rejects("R13h 指輪を仲間へ渡した後は -6・上げたレベル(Lv3)は保たれる", "actor:2");
    await setOwner("themis", "player");
  });

  // ---- R14: 設定の誤り(マップの実際のイベント実行器で、プラグインコマンド → 条件分岐 → 後続の命令を動かす) ----
  await check("R14", async () => {
    await calm(); await setOwner("apollo", "unowned");
    // 「変数 [branchVar] が 1 以上 2 以下(= 成功・済みのコード)なら スイッチ9 ON」のあと、後続の命令(スイッチ10 ON)
    const runMapEvent = async (command, args, branchVar) => {
      await ev(`$gameSwitches.setValue(9, false); $gameSwitches.setValue(10, false); $gameMap._interpreter.setup([
        { code: 357, indent: 0, parameters: ['ProjectR_RingRewards', '${command}', '${command}', ${JSON.stringify(args)}] },
        { code: 111, indent: 0, parameters: [1, ${branchVar}, 0, 1, 1] }, { code: 111, indent: 1, parameters: [1, ${branchVar}, 0, 2, 2] },
        { code: 121, indent: 2, parameters: [9, 9, 0] }, { code: 0, indent: 2, parameters: [] }, { code: 412, indent: 1, parameters: [] },
        { code: 0, indent: 1, parameters: [] }, { code: 412, indent: 0, parameters: [] },
        { code: 121, indent: 0, parameters: [10, 10, 0] }, { code: 0, indent: 0, parameters: [] }], 0); 'ok'`);
      const finished = await wait("!$gameMap._interpreter.isRunning()", 8000); await sleep(150);
      return Object.assign({ finished }, await json("({ successBranch: $gameSwitches.value(9), later: $gameSwitches.value(10) })"));
    };
    const evArgs = over => Object.assign({ ringId: "apollo", rankVariableId: String(RANK_VAR), requiredRank: "1", resultVariableId: String(RESULT_VAR), completedSwitchId: String(DONE_SWITCH) }, over);
    const stateNow = async () => JSON.stringify([await owner("apollo"), await level("janus_reflection"), await cards(), await copies(), await loadoutState()]);
    for (const rank of [1, 2]) {
      await setRank(rank); await resetResult(); const before = await stateNow();
      const r = await runMapEvent("AcquireRing", evArgs({ resultVariableId: String(RANK_VAR) }), RANK_VAR);
      const rankNow = await ev(`$gameVariables.value(${RANK_VAR})`), o = await out();
      rec(`R14a 結果の変数 = ランク変数(ランク ${rank}): イベントを中断し、残ったランク ${rank} を成功と読む分岐も後続の命令も実行しない・付与しない・ランク変数と完了スイッチは不変`, r.finished && r.successBranch === false && r.later === false && rankNow === rank && o.done === false && (await stateNow()) === before, JSON.stringify({ r, rankNow, done: o.done, owner: await owner("apollo") }));
    }
    await setRank(9); await resetResult(); let before = await stateNow();
    const bad = await runMapEvent("AcquireRing", evArgs({ completedSwitchId: "999" }), RESULT_VAR); const badOut = await out();
    rec("R14b 使えない完了スイッチ(999): 指輪を付与する前に拒否(-1)・イベントは続き、分岐は失敗と読む", bad.finished && bad.successBranch === false && bad.later === true && badOut.code === -1 && (await stateNow()) === before && (await owner("apollo")) === "unowned", JSON.stringify({ bad, badOut }));
    await resetResult(); before = await stateNow();
    const badLv = await runMapEvent("RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: "999" }, RESULT_VAR); const badLvOut = await out();
    await ev(`${D}.setCardLevel('janus_reflection', 1); 'ok'`); const lvBefore = await level("janus_reflection"); await resetResult();
    const badLv2 = await runMapEvent("RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "3", resultVariableId: String(RESULT_VAR), completedSwitchId: "abc" }, RESULT_VAR);
    rec("R14c 使えない完了スイッチ: 持っている指輪のスキルでも、レベルを上げる前に拒否(-1)・レベルは変わらない", (await owner("janus")) === "player" && badLv.successBranch === false && badLvOut.code === -1 && badLv2.successBranch === false && (await out()).code === -1 && lvBefore === 1 && (await level("janus_reflection")) === 1, JSON.stringify({ badLv, badLvOut, lv: await level("janus_reflection") }));
    await resetResult(); await ev(`$gameSwitches.setValue(${DONE_SWITCH}, true); 'ok'`); before = await stateNow();
    const badVar = await runMapEvent("AcquireRing", evArgs({ resultVariableId: "999" }), RESULT_VAR); const badVarOut = await out();
    rec("R14d 使えない結果の変数(999): 付与する前に拒否・ON だった完了スイッチは触らない・何も付与しない", badVar.finished && badVar.successBranch === false && badVarOut.code === 0 && badVarOut.done === true && (await stateNow()) === before, JSON.stringify({ badVar, badVarOut }));
    await resetResult();
    const fixed = await runMapEvent("AcquireRing", evArgs(), RESULT_VAR); const fixedOut = await out();
    rec("R14e 設定を直せば同じイベントは成功する: 付与・結果 1・完了 ON・成功の分岐と後続の命令が実行される", fixed.finished && fixed.successBranch === true && fixed.later === true && fixedOut.code === 1 && fixedOut.done === true && (await owner("apollo")) === "player", JSON.stringify({ fixed, fixedOut }));
  });

  // ---- R11: イベントの完了(失敗では完了にならない。成功してから完了になる) ----
  await check("R11", async () => {
    await setOwner("apollo", "unowned"); await calm(); await setRank(1); await resetResult();
    // 1つのイベントのコマンド列: 入手(ランク不足で失敗)→ 同じ列の2回目(ランクを上げてから)。完了スイッチは、失敗では ON にならず、成功してから ON になる
    await acquire("apollo"); const failed = await out(); await setRank(3); await acquire("apollo"); const success = await out();
    rec("R11 失敗(ランク不足)では完了スイッチは OFF のまま・ランクを満たして成功したら ON になる(イベントのページ条件に使える)", failed.done === false && failed.code === -3 && success.done === true && success.code === 1, JSON.stringify({ failed, success }));
  });

  const errs = s.errors();
  rec("R12 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/ring_rewards_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
