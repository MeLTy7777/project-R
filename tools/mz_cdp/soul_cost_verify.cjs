// SOUL戦闘 L4-B マナコスト(承認済みD8)の実機(Playtest)確認 + スクリーンショット。実キー(Q/W/E/R/T)・CDP。
//   B1 HUD: 各枠に実際の消費マナ(Lv3の承認コスト)・足りない枠は「マナ不足」(クールダウン表示なし)
//   B2 絶: 実キーで続けて使っても構えの倍率は重ならない(3のまま)・速度の強化は1つ・コストはその都度1回
//   B3 神託: 停止中の再発動は拒否され、マナも引かず、停止は延長されない・停止中はマナが回復しない
//   B4 予約型(黄金の矢): 発射の成功でちょうど1回確定(命中するかどうかは関係ない)。命中しても・外れて消えても返金せず追加でも引かない(増えた単位 = 経過フレーム - コスト、で完全一致)。予約は残らない
//   B5 ストレングス: 蓄えがある間も重ね掛けできる(発動のたびにコストを引き、蓄えは回数分たまる)
//   B6 フェーズ: DEFENSE は LOCK(使えず・マナも動かない)・次の ATTACK は10・予約や割引を持ち越さない
//   B7 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない
// 竪琴の割引は実演奏の判定フレームが粗いCDPでは確かめにくいので、ノードのテスト(実際のリズムの押下)で確認する。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_cost_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", PR = "ProjectRSoulPrepare", HD = "ProjectRSoulHand", MN = "ProjectRSoulMana", HU = "ProjectRSoulBattleHUD", SK = "ProjectRSoulSkills", CM = "ProjectRCardModifiers";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const mana = () => json(`${MN}.getState()`);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(x) { return x.cardId; })");
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const key = async k => { await c.keyDown(k); await sleep(70); await c.keyUp(k); await sleep(300); };
  const WANT = ["hermes_zetsu", "apollo_oracle", "apollo_golden_volley", "hermes_strength", "hermes_sweep"];

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();

  await check("B1 HUD: 各枠に実際の消費マナ・足りない枠は「マナ不足」", async () => {
    await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 300, defenseSeconds: 5, level: 3, weapon: "sword", prepare: true })})`);
    const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'");
    await wait(`${PR}.isOpen()`, 5000); await sleep(800);
    await ev(`${PR}.chooseAttack()`);
    await ev("globalThis.__seed = 4711; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'");
    const ids = await json(`(function() { var H = ${HD}, want = ${JSON.stringify(WANT)}; for (var i = 0; i < 40000; i++) { var r = H.draw('player', { force: true }); if (want.every(function(id) { return r.drawn.some(function(c) { return c.cardId === id; }); })) { var used = {}; return want.map(function(id) { var c = r.drawn.filter(function(d) { return d.cardId === id && !used[d.instanceId]; })[0]; used[c.instanceId] = 1; return c.instanceId; }); } } return null; })()`);
    await ev("Math.random = function() { return 0.9; }; 'ok'");
    const quick = await json(`${PR}.quickAttack({ instanceIds: ${JSON.stringify(ids)} })`);
    await sleep(600);
    const h = await hand(), m = await json(`${HU}.getViewModel()`);
    const costs = m.hand.map(x => x.cost), expect = await json(`${JSON.stringify(WANT)}.map(function(id) { return ${MN}.costOf(id); })`);
    await json(`${MN}.devSet(5)`); await sleep(500);
    const low = (await json(`${HU}.getViewModel()`)).hand.map(x => x.state);
    await s.shot("b1_costs");
    await json(`${MN}.devSet(10)`);
    rec("B1 HUD", ok && ids && quick.ok && h.join() === WANT.join() && JSON.stringify(costs) === JSON.stringify(expect) && expect.join() === "6,9,5,5,4" && m.hand.every(x => x.cooling === 0 && x.state === "ready") && low[0] === "lowMana" && low[1] === "lowMana" && low[3] === "ready" && low[4] === "ready",
      JSON.stringify({ hand: h, costs, expect, lowStates: low }));
  });

  await check("B2 絶: 続けて使っても構えの倍率は重ならない・速度の強化は1つ・コストはその都度1回", async () => {
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("Q");
    const m1 = await json(`${CM}.getWeaponHitBonus()`), sp1 = (await mana()).spent;
    await json(`${MN}.devSet(10)`);
    await key("Q");
    const m2 = await json(`${CM}.getWeaponHitBonus()`), sp2 = (await mana()).spent;
    const speed = await json(`${SK}.getEffects().filter(function(e) { return e.kind === 'zetsuSpeed'; }).length`);
    const cd = await json("ProjectRCardDeck.definitions.card('hermes_zetsu').cooldownSeconds");
    rec("B2 絶", m1 && m2 && m1.multiplier === 3 && m2.multiplier === 3 && speed === 1 && sp1 - s0 === 6 && sp2 - s0 === 12 && cd !== 6,
      JSON.stringify({ multipliers: [m1 && m1.multiplier, m2 && m2.multiplier], speedEffects: speed, spent: [sp1 - s0, sp2 - s0], soulCooldownRemoved: cd }));
  });

  await check("B3 神託: 停止中の再発動は拒否・マナを引かない・停止は延長されない・停止中はマナが回復しない", async () => {
    await ev(`${SK}.endAll('b3'); 'ok'`);
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("W");
    const stopped = await ev("!!$gameMap.eventsPaused"), sp1 = (await mana()).spent;
    await json(`${MN}.devSet(3)`);
    const t0 = Date.now(), u0 = (await mana()).units;
    await key("W"); await key("W"); await key("W");
    const u1 = (await mana()).units, sp2 = (await mana()).spent;
    const released = await wait("!$gameMap.eventsPaused", 6000), elapsed = Date.now() - t0;
    await s.shot("b3_oracle");
    rec("B3 神託", stopped && sp1 - s0 === 9 && u0 === u1 && sp2 === sp1 && released && elapsed < 3600,
      JSON.stringify({ stopped, spent: [sp1 - s0, sp2 - s0], frozenUnits: [u0, u1], released, stopMs: elapsed }));
  });

  await check("B4 予約型(黄金の矢): 発射の成功で1回確定(命中・外れに依らない)・返金なし・追加で引かない・予約は残らない", async () => {
    await sleep(3400);                                                          // 神託の強化中が終わるまで
    await ev(`${SK}.endAll('b4'); 'ok'`);
    const h = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    const run = async (label, tx, ty) => {
      await json(`${MN}.devSet(10)`);
      const p = await json(`${ST}.toScreen(${tx} * 48, ${ty} * 48 - 24)`); await c.pointer(Math.round(p.x), Math.round(p.y)); await sleep(300);
      const s0 = (await mana()).spent, a0 = await json(`({ u: ${MN}.getState().units, e: ${SO}.getState().elapsedFrames })`);
      await key("E");
      const m1 = await mana(), eL = await json(`${SO}.getState().elapsedFrames`);
      await wait("!ProjectRApolloGoldenVolley.isPending()", 8000); await sleep(600);
      const m2 = await mana(), a1 = await json(`({ u: ${MN}.getState().units, e: ${SO}.getState().elapsedFrames })`), last = await json("ProjectRApolloGoldenVolley.getLastResult()");
      // 発射でコスト(5 = 300単位)を引いた後は、回復(1フレーム1単位)だけで増える。返金(+300)や二重の消費があれば範囲から外れる
      const exact = a1.u >= 300 && a1.u <= 300 + (a1.e - a0.e);
      return { label, launchSpent: m1.spent - s0, heldAtLaunch: m1.holds.length, charged: m1.charged.length, after: m2.spent - s0, holdsAfter: m2.holds.length, chargedAfter: m2.charged.length, committed: !!(last && last.committed), exact, dFrames: a1.e - a0.e, units: a1.u };
    };
    const hit = await run("命中", h.x, h.y);
    const miss = await run("外れ", h.x - 9, h.y + 9);
    rec("B4 予約型", hit.launchSpent === 5 && hit.heldAtLaunch === 0 && hit.charged === 1 && hit.after === 5 && hit.holdsAfter === 0 && hit.chargedAfter === 0 && hit.exact &&
      miss.launchSpent === 5 && miss.after === 5 && !miss.committed && miss.holdsAfter === 0 && miss.chargedAfter === 0 && miss.exact,
      JSON.stringify({ hit, miss }));
  });

  await check("B5 ストレングス: 重ね掛け可(発動のたびにコストを引く)", async () => {
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("R");
    const sp1 = (await mana()).spent, st1 = await json("ProjectRHermesStrength.getPending()");
    await json(`${MN}.devSet(10)`);
    await key("R");
    const sp2 = (await mana()).spent, st2 = await json("ProjectRHermesStrength.getPending()");
    rec("B5 ストレングス", sp1 - s0 === 5 && st1 && st1.stacks === 1 && sp2 - sp1 === 5 && st2 && st2.stacks === 2, JSON.stringify({ spent: [sp1 - s0, sp2 - s0], stacks: [st1 && st1.stacks, st2 && st2.stacks] }));
  });

  await check("B6 フェーズ: DEFENSE は LOCK(使えず・マナも動かない)・次の ATTACK は10・予約や割引を持ち越さない", async () => {
    await json(`${MN}.devSet(8)`);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    const d = await mana(), hud = await json(`${HU}.getViewModel().hand.map(function(x) { return x.state; })`);
    const spentD = d.spent;
    await key("T");                                                              // DEFENSE: 使えない
    const d2 = await mana();
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(800);
    await ev(`${PR}.quickAttack()`); await sleep(500);
    const a = await mana();
    rec("B6 フェーズ", d.phase === "defense" && d.current === 0 && hud.every(x => x === "locked") && d2.spent === spentD && a.phase === "attack" && a.whole >= 9 && a.holds.length === 0 && a.discount === null,
      JSON.stringify({ defense: [d.current, hud], noSpend: d2.spent === spentD, next: [a.current, a.holds.length, a.discount] }));
  });

  await check("B7 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const m = await mana(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })"), after = await saved();
    rec("B7 cleanup", back && !m.active && m.holds.length === 0 && m.discount === null && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y,
      JSON.stringify({ back, mana: [m.active, m.holds.length, m.discount], unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("BZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_cost_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・CDPの入力(人間の手動プレイの代わりではない)。devSet はPlaytest専用の確認用", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
