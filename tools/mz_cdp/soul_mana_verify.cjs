// SOUL戦闘 L4-A マナ(資源の土台)の実機(Playtest)確認 + スクリーンショット。実キー(Q)・CDP。
//   K1 遷移: PREPARE = 0 / ATTACK 開始 = 10 / HUD は「現在値 / 上限」を出す
//   K2 回復: ATTACK の間だけ毎秒+1。増えた単位 = ATTACK の経過フレームと完全に一致する(実時間のずれ・フレーム落ちの影響なし)・上限10
//   K3 一時停止: メッセージ表示中は回復しない・消えると続きから回復
//   K4 神託の時間停止(実際のスキル・実キー): 停止中は回復しない・解除後に回復
//   K5 DEFENSE / PREPARE: 回復しない・ATTACK 終了で破棄・次の ATTACK 開始で10
//   K6 従来の攻撃⇄防御(prepare なし): マナは動かず HUD にも出ない
//   K7 後片づけ: SOULを終えるとマナは非アクティブ(0)・HUD から消え、元のマップへ戻り、保存データが変わらない
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_mana_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", PR = "ProjectRSoulPrepare", HD = "ProjectRSoulHand", MN = "ProjectRSoulMana", HU = "ProjectRSoulBattleHUD";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const start = async prepare => { await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 120, defenseSeconds: 120, level: 3, weapon: "sword", prepare })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const phase = () => ev(`${SO}.getPhase()`);
  const mana = () => json(`${MN}.getState()`);
  const hudMana = () => json(`(function() { var m = ${HU}.getViewModel(); return m ? m.mana : null; })()`);
  const clock = () => json(`({ u: ${MN}.getState().units, e: ${SO}.getState().elapsedFrames, p: ${MN}.getState().phase })`);   // 同じ瞬間の値
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const seed = n => ev(`globalThis.__seed = ${n}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'`);
  const nextAttack = async (ids) => json(`${PR}.quickAttack(${ids ? `{ instanceIds: ${JSON.stringify(ids)} }` : ""})`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();
  const outside = await mana();

  await check("K1 遷移: PREPARE = 0 / ATTACK 開始 = 10 / HUD は 現在値/上限", async () => {
    const ok = await start(true);
    await wait(`${PR}.isOpen()`, 5000); await sleep(1000);
    const m0 = await mana(), h0 = await hudMana();
    await s.shot("k1_prepare");
    const quick = await nextAttack(); await sleep(500);
    const m1 = await mana(), h1 = await hudMana();
    await s.shot("k1_attack");
    rec("K1 遷移", !outside.active && ok && m0.active && m0.phase === "prepare" && m0.current === 0 && h0 && h0.whole === 0 && h0.attack === false && quick.ok && m1.phase === "attack" && m1.max === 10 && m1.whole >= 9 && h1 && h1.attack === true && h1.max === 10 && h1.whole >= 9 && m1.stats.starts === 1,
      JSON.stringify({ outside: outside.active, prepare: [m0.current, h0 && h0.whole], attack: [m1.current, h1 && h1.whole, h1 && h1.attack], starts: m1.stats.starts }));
  });

  await check("K2 回復: 毎秒+1・増えた単位 = ATTACK の経過フレーム(実時間に依存しない)・上限10", async () => {
    const set = await json(`${MN}.devSet(2)`);
    const a = await clock();
    await sleep(2200);
    const b = await clock();
    const m = await mana();
    await sleep(500);
    await json(`${MN}.devSet(9)`);
    await sleep(2500);
    const capped = await mana();
    rec("K2 回復", set.ok && a.p === "attack" && b.u - a.u === b.e - a.e && b.e - a.e >= 100 && m.regenerating === true && capped.current === 10 && capped.units === 600 && capped.reason === "full",
      JSON.stringify({ dUnits: b.u - a.u, dFrames: b.e - a.e, reason: m.reason, capped: [capped.current, capped.units, capped.reason] }));
  });

  await check("K3 一時停止: メッセージ表示中は回復しない・消えると続きから", async () => {
    await json(`${MN}.devSet(3)`);
    await ev("$gameMessage.add('テスト'); 'ok'");
    await sleep(300);
    const a = await clock();
    await sleep(1500);
    const b = await clock(), m = await mana();
    await ev("$gameMessage.clear(); 'ok'");
    await sleep(1200);
    const c2 = await clock();
    rec("K3 一時停止", a.u === b.u && b.e === a.e && m.reason === "paused" && !m.regenerating && c2.u > b.u && c2.u - b.u === c2.e - b.e,
      JSON.stringify({ paused: [a.u, b.u], reason: m.reason, resumed: [b.u, c2.u, c2.e - b.e] }));
  });

  await check("K5 DEFENSE / PREPARE: 回復しない・ATTACK 終了で破棄・次の ATTACK で10", async () => {
    await json(`${MN}.devSet(6)`);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(400);                                  // DEFENSE
    const d0 = await mana(), hd = await hudMana();
    await json(`${MN}.devSet(2)`); const a = await clock(); await sleep(1500); const b = await clock();
    await s.shot("k5_defense");
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(800);                                  // PREPARE
    const p0 = await mana(); await json(`${MN}.devSet(5)`); await sleep(1500); const p1 = await mana();
    const quick = await nextAttack(); await sleep(400);
    const m = await mana();
    rec("K5 防御・準備", d0.phase === "defense" && d0.current === 0 && d0.lastDiscarded >= 6 && hd && hd.whole === 0 && !hd.attack && a.u === b.u && p0.phase === "prepare" && p1.current === 5 && quick.ok && m.phase === "attack" && m.whole >= 9 && m.stats.starts === 2 && m.stats.discards === 1,
      JSON.stringify({ defense: [d0.current, d0.lastDiscarded], noRegen: [a.u, b.u], prepare: [p0.current, p1.current], nextAttack: m.current, stats: m.stats }));
  });

  await check("K4 神託の時間停止(実キー): 停止中は回復しない・解除後に回復", async () => {
    // 神託を先頭にした5枠で ATTACK へ入り直す(テスト用の再シャッフル)
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(300); await ev(`${SO}.skipPhase(); 'ok'`); await sleep(900);   // → DEFENSE → PREPARE
    await ev(`${PR}.chooseAttack()`);
    await seed(303);
    const ids = await json(`(function() { var H = ${HD}; for (var i = 0; i < 30000; i++) { var r = H.draw('player', { force: true }); var o = r.drawn.filter(function(c) { return c.cardId === 'apollo_oracle'; })[0]; if (o) return [o.instanceId].concat(r.drawn.filter(function(c) { return c !== o; }).slice(0, 4).map(function(c) { return c.instanceId; })); } return null; })()`);
    await ev("Math.random = function() { return 0.9; }; 'ok'");
    const quick = await nextAttack(ids); await sleep(500);
    await json(`${MN}.devSet(10)`);                                                                  // 神託のコスト(Lv3 = 9)を払える量から
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(400);
    const stopped = await ev("!!$gameMap.eventsPaused");
    await json(`${MN}.devSet(3)`);                                                                   // 停止中は回復しないことの確認のため 3 に書き換える
    const a = await clock(); await sleep(1300); const b = await clock();
    await s.shot("k4_oracle_stop");
    const released = await wait("!$gameMap.eventsPaused", 6000);
    const r0 = await clock(); await sleep(1000); const r1 = await clock();
    rec("K4 神託", quick.ok && stopped && a.u === b.u && released && r1.u - r0.u === r1.e - r0.e && r1.u - r0.u >= 40,
      JSON.stringify({ stopped, duringStop: [a.u, b.u], released, after: [r1.u - r0.u, r1.e - r0.e] }));
  });

  await check("K6 従来の攻撃⇄防御(prepare なし): マナは動かず HUD にも出ない", async () => {
    await ev(`${SB}.stop()`); await toOrigin(origin);
    const ok = await start(false);
    await sleep(1500);
    const m = await mana(), h = await hudMana();
    rec("K6 従来", ok && await phase() === "attack" && !m.active && m.current === 0 && h === null, JSON.stringify({ active: m.active, current: m.current, hud: h }));
  });

  await check("K7 後片づけ: SOULを終えるとマナは非アクティブ・HUD から消え、元のマップへ戻る。保存データは変わらない", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const m = await mana(), h = await hudMana(), after = await saved();
    const w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    rec("K7 cleanup", back && !m.active && m.current === 0 && m.reason === "inactive" && h === null && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y,
      JSON.stringify({ back, mana: [m.active, m.current, m.reason], hud: h, unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("KZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_mana_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)。devSet はPlaytest専用の確認用", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
