// SOUL戦闘 L0後始末 + L1データ窓口の実機(Playtest)確認。実キー(Q)・CDP。
//   C1 準備ループ: ATTACKで撃った矢が、DEFENSEの境目で片づく・DEFENSE/PREPARE/次のATTACKで動き出さず敵ハートのHPも減らない
//   C2 従来の攻撃⇄防御(prepare なし): 矢は防御へ持ち越す(従来どおり・後始末は何もしない)
//      (無関係なもの = 敵ハート・攻撃の印の無いEvent は、境目の時点で残る)
//   C4 SOULを終えると攻撃のEventが残らない・元のマップへ戻る・凍結が残らない
//   C5 キャラ→デッキ窓口(読み取り専用): 候補は主人公だけ・デッキは保存済み30枚と同じ・呼び出しで保存データが変わらない
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_l1_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", PC = "ProjectRSoulPhaseCleanup", PR = "ProjectRSoulPrepare", LD = "ProjectRSoulLoopData";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const HAND = ["apollo_golden_volley", "hermes_sweep", "hermes_issen", "apollo_eros_arrow", "apollo_gigas_slayer"];
  const start = async prepare => { await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: HAND, attackSeconds: 30, defenseSeconds: 4, level: 3, weapon: "sword", prepare })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const tagged = () => ev(`(function() { var tags = ${PC}.TAGS; return $gameMap.events().filter(function(e) { return e && !e._erased && tags.some(function(t) { return String(e.event().note || '').indexOf(t) >= 0; }); }).length; })()`);
  const others = () => json(`$gameMap.events().filter(function(e) { return e && !e._erased && ${PC}.TAGS.every(function(t) { return String(e.event().note || '').indexOf(t) < 0; }); }).map(function(e) { return e.eventId(); })`);
  const hp = () => ev("ProjectRSoulBattlePoC.getState().hp");
  const phase = () => ev(`${SO}.getPhase()`);
  const pressQ = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(250); };
  // 先頭が黄金の矢になる5枚で ATTACK を始める(準備画面と同じ確定。引きはテスト用に黄金の矢を含むものへ差し替える)
  const attackWithVolley = async () => {
    await ev(`${PR}.chooseAttack()`);
    await ev("globalThis.__seed = 99; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'");
    const ids = await json("(function() { var H = ProjectRSoulHand; for (var i = 0; i < 4000; i++) { var r = H.draw('player', { force: true }); var v = r.drawn.filter(function(c) { return c.cardId === 'apollo_golden_volley'; })[0]; if (v) return [v.instanceId].concat(r.drawn.filter(function(c) { return c !== v; }).slice(0, 4).map(function(c) { return c.instanceId; })); } return null; })()");
    await ev("Math.random = function() { return 0.9; }; 'ok'");
    return json(`${PR}.quickAttack({ instanceIds: ${JSON.stringify(ids)} })`);
  };
  const savedJson = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const baseSweeps = await json(`${PC}.getStats()`);

  await check("C1 準備ループ: 攻撃の矢が境目で片づき、あとから動き出さない", async () => {
    const ok = await start(true);
    await wait(`${PR}.isOpen()`, 5000); await sleep(500);
    await attackWithVolley(); await sleep(300);
    await pressQ(); await sleep(150);
    const before = await tagged(), hp0 = await hp(), othersBefore = await others();
    await s.shot("c1_arrows");
    await ev(`${SO}.skipPhase()`); await sleep(100);
    const afterBoundary = await tagged(), ph1 = await phase(), othersBoundary = await others();       // 境目の直後(神の見た目などは自分の寿命で消えるので、境目の時点で比べる)
    const st = await json(`${PC}.getStats()`);
    await sleep(1500);                                                       // DEFENSE の間
    const hpDefense = await hp(), tDefense = await tagged();
    const toPrepare = await wait(`${SO}.getPhase() === 'prepare'`, 8000);
    await sleep(800);
    const tPrepare = await tagged();
    await attackWithVolley(); await sleep(2000);                   // 次の ATTACK
    const tAttack = await tagged(), hpAttack = await hp();
    rec("C1 矢の後始末", ok && before >= 3 && afterBoundary === 0 && ph1 === "defense" && st.sweeps >= 1 && st.destroyed >= before && st.errors === 0 && tDefense === 0 && toPrepare && tPrepare === 0 && tAttack === 0 && hpAttack === hpDefense && hp0 >= hpDefense &&
      othersBefore.every(id => othersBoundary.includes(id)),
      JSON.stringify({ arrows: before, afterBoundary, ph1, stats: st, tDefense, tPrepare, tAttack, hp: [hp0, hpDefense, hpAttack], kept: othersBefore.length + "/" + othersBoundary.length }));
    await ev(`${SB}.stop()`); await toOrigin(origin);
  });

  await check("C2 従来の攻撃⇄防御: 矢は防御へ持ち越す(後始末は何もしない)", async () => {
    const swept0 = (await json(`${PC}.getStats()`)).sweeps;
    const ok = await start(false);
    await pressQ(); await sleep(150);
    const before = await tagged();
    await ev(`${SO}.skipPhase()`); await sleep(100);
    const inDefense = await tagged(), ph = await phase(), st = await json(`${PC}.getStats()`);
    rec("C2 従来の経路", ok && before >= 3 && ph === "defense" && inDefense > 0 && st.sweeps === swept0, JSON.stringify({ arrows: before, inDefense, ph, sweeps: [swept0, st.sweeps] }));
    await ev(`${SB}.stop()`); await toOrigin(origin);
  });

  await check("C4 終了: 準備ループのSOULをATTACKの途中で終えても攻撃のEventが残らず、元のマップへ戻り、凍結が残らない", async () => {
    const ok = await start(true);
    await wait(`${PR}.isOpen()`, 5000); await sleep(500);
    await attackWithVolley(); await sleep(300);
    await pressQ(); await sleep(150);
    const before = await tagged();
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const after = await tagged(), paused = await ev("!!$gameMap.eventsPaused"), move = await ev("playerMovementDisabled"), save = await ev("$gameSystem.isSaveEnabled()");
    const w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    rec("C4 終了", ok && before >= 3 && back && after === 0 && !paused && !move && save === true && w.map === origin.map && w.x === origin.x && w.y === origin.y,
      JSON.stringify({ arrows: before, back, after, paused, move, save, now: [w.map, w.x, w.y] }));
  });

  await check("C5 キャラ→デッキ窓口(読み取り専用)", async () => {
    const ok = await start(true);
    const before = await savedJson();
    const cands = await json(`${LD}.listCandidates()`), compat = await json(`${LD}.getCompatDeck()`), saved = await json("ProjectRCardDeck.getDeck()");
    const deck = await json(`${LD}.getDeck("player")`), ally = await json(`${LD}.getDeck("ally:2")`), snap = await json(`${LD}.snapshot()`);
    const after = await savedJson();
    const head = cands[0];
    rec("C5 データ窓口", ok && cands.length === 1 && head.key === "player" && head.eligible && head.compat && JSON.stringify(compat.cardIds) === JSON.stringify(saved) && saved.length === 30 && deck.ok && deck.cardIds.length === 30 &&
      ally.ok === false && ally.reason === "UNKNOWN_CHARACTER" && head.pool.length > 0 && head.pool.every(p => p.ownedCopies > 0) && before === after && snap.candidates.length === 1,
      JSON.stringify({ candidates: cands.map(x => x.key), deck: deck.cardIds && deck.cardIds.length, poolSize: head.pool.length, ally, unchanged: before === after }));
    await ev(`${SB}.stop()`); await toOrigin(origin);
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("CZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_l1_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true/false)・CDPの入力(人間の手動プレイの代わりではない)", baseSweeps, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
