// SOUL戦闘 L4-B ストレングスの蓄え(ATTACK の終了で捨てる)と、他の一時的な強化の持ち越しなしの実機(Playtest)確認。実キー(Q/W/E/R/T)・CDP。
//   S1 重ね掛け: 蓄えがある間も続けて発動でき、発動のたびにマナ5を引き、蓄えは回数分たまる
//   S2 ATTACK の終了(skip): 使われなかった蓄えは捨てられ、DEFENSE・PREPARE・次の ATTACK のどこにも無い・次の ATTACK でまた使える(拒否されない)
//   S3 連続するラウンド: 2回発動 → 使わず終了 → すべて捨てる、を3回。毎回マナ5ずつ(計10)引かれ、前のラウンドから持ち越さない
//   S4 他の一時的な強化: 絶・神託を使って ATTACK を終えると、効果・時間停止・武器の強化が残らず、次の ATTACK に持ち越さない
//   S7 物理ダメージのカード(一閃)にも蓄えが使われ、ダメージが増える・非ダメージ(神託)では消費されない・1回の使用で一度だけ消費
//   S5 通常武器の命中での消費: ハートの隣から通常攻撃を当てると蓄えが一度に消費され、同じ ATTACK でまた使える
//   S6 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_strength_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", PR = "ProjectRSoulPrepare", HD = "ProjectRSoulHand", MN = "ProjectRSoulMana", SK = "ProjectRSoulSkills", CM = "ProjectRCardModifiers", HS = "ProjectRHermesStrength";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const mana = () => json(`${MN}.getState()`);
  const pend = () => json(`${HS}.getPending()`);
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const key = async k => { await c.keyDown(k); await sleep(70); await c.keyUp(k); await sleep(300); };
  const phase = () => ev(`${SO}.getPhase()`);
  const WANT = ["hermes_strength", "hermes_zetsu", "apollo_oracle", "hermes_sweep", "hermes_issen"];   // Q=ストレングス W=絶 E=神託
  const nextAttack = async () => { await armAttack(); };
  const toDefenseAndBack = async () => {                                      // ATTACK → DEFENSE → PREPARE → ATTACK(skip)
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    const inDefense = { phase: await phase(), pending: await pend(), paused: await ev("!!$gameMap.eventsPaused"), bonus: await json(`${CM}.getWeaponHitBonus()`), effects: await json(`${SK}.getEffects().length`) };
    await ev(`${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'prepare'`, 8000); await sleep(500);
    const inPrepare = { phase: await phase(), pending: await pend() };
    return { inDefense, inPrepare };
  };

  // PREPARE で「Q=ストレングス W=絶 E=神託」の手札を引き直して ATTACK を始める(毎ラウンド同じ手札にする)
  const armAttack = async () => {
    await ev(`${PR}.chooseAttack()`);
    await ev("globalThis.__seed = 4711; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'");
    const ids = await json(`(function() { var H = ${HD}, want = ${JSON.stringify(WANT)}; for (var i = 0; i < 40000; i++) { var r = H.draw('player', { force: true }); if (want.every(function(id) { return r.drawn.some(function(c) { return c.cardId === id; }); })) { var used = {}; return want.map(function(id) { var c = r.drawn.filter(function(d) { return d.cardId === id && !used[d.instanceId]; })[0]; used[c.instanceId] = 1; return c.instanceId; }); } } return null; })()`);
    await ev("Math.random = function() { return 0.9; }; 'ok'");
    const quick = await json(`${PR}.quickAttack({ instanceIds: ${JSON.stringify(ids)} })`);
    await wait(`${SO}.getPhase() === 'attack'`, 6000); await sleep(500);
    return { ids, quick };
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();

  await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 300, defenseSeconds: 6, level: 3, weapon: "sword", prepare: true })})`);
  const active = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'");
  await wait(`${PR}.isOpen()`, 5000); await sleep(800);
  const armed = await armAttack();
  const ids = armed.ids, quick = armed.quick;
  const setup = active && ids && quick.ok;

  await check("S1 重ね掛け: 蓄えがある間も発動でき、発動のたびにマナを引く", async () => {
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("Q");
    const sp1 = (await mana()).spent, p1 = await pend();
    await json(`${MN}.devSet(10)`);
    await key("Q");
    const sp2 = (await mana()).spent, p2 = await pend();
    rec("S1 重ね掛け", setup && sp1 - s0 === 5 && p1 && p1.stacks === 1 && sp2 - sp1 === 5 && p2 && p2.stacks === 2, JSON.stringify({ setup, spent: [sp1 - s0, sp2 - s0], stacks: [p1 && p1.stacks, p2 && p2.stacks] }));
  });

  await check("S2 ATTACK の終了: 蓄えを捨て、DEFENSE・PREPARE・次の ATTACK に持ち越さない・また使える", async () => {
    const pAttack = await pend();
    const d = await toDefenseAndBack();
    await nextAttack();
    const pNext = await pend(), bonus = await json(`${CM}.getWeaponHitBonus()`);
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("Q");
    const sp = (await mana()).spent, pAgain = await pend();
    const dropped = await json(`${SK}.getState().stats.strengthDropped || 0`);
    await s.shot("s2_after_exit");
    rec("S2 ATTACK 終了", pAttack && pAttack.stacks === 2 && d.inDefense.phase === "defense" && d.inDefense.pending === null && d.inPrepare.phase === "prepare" && d.inPrepare.pending === null &&
      pNext === null && !bonus && sp - s0 === 5 && pAgain && pAgain.stacks === 1 && dropped >= 1,
      JSON.stringify({ attackBefore: pAttack && pAttack.stacks, defense: d.inDefense, prepare: d.inPrepare, nextAttack: pNext, bonus, reCastSpent: sp - s0, reCast: pAgain && pAgain.stacks, strengthDropped: dropped }));
  });

  await check("S3 連続するラウンド: 毎回、2回発動 → 使わず終了 → すべて捨てる", async () => {
    const rounds = [];
    for (let i = 0; i < 3; i++) {
      const d = await toDefenseAndBack();                                      // 直前の蓄えをまず捨てる
      await nextAttack();
      await json(`${MN}.devSet(10)`);
      const s0 = (await mana()).spent, pre = await pend();
      await key("Q"); await json(`${MN}.devSet(10)`); await key("Q");           // 2回目も重ね掛けできる
      const m = await mana(), p = await pend();
      rounds.push({ carried: !!(d.inDefense.pending || d.inPrepare.pending || pre), spent: m.spent - s0, stacks: p && p.stacks, start: null });
    }
    rec("S3 連続ラウンド", rounds.every(r => !r.carried && r.spent === 10 && r.stacks === 2), JSON.stringify(rounds));
  });

  await check("S4 他の一時的な強化(絶・神託): ATTACK の終了で効果・時間停止・武器の強化が残らない", async () => {
    await toDefenseAndBack(); await nextAttack();
    await json(`${MN}.devSet(10)`);
    await key("W");
    const during = await json(`({ bonus: ${CM}.getWeaponHitBonus(), effects: ${SK}.getEffects().length })`);
    await json(`${MN}.devSet(10)`);
    await key("E");
    const stopped = await ev("!!$gameMap.eventsPaused");
    const d = await toDefenseAndBack();
    const left = d.inDefense;                                                   // DEFENSE の時点(PREPARE は仕様で時間を止めるので止まっていてよい)
    await nextAttack();
    const next = await json(`({ bonus: ${CM}.getWeaponHitBonus(), effects: ${SK}.getEffects().length, paused: !!$gameMap.eventsPaused, m: ${MN}.getState() })`);
    rec("S4 他の強化", during.bonus && during.effects > 0 && stopped && !left.bonus && left.effects === 0 && !left.paused && !d.inPrepare.pending && !next.bonus && next.effects === 0 && !next.paused && next.m.holds.length === 0 && next.m.discount === null,
      JSON.stringify({ during, stopped, afterExit: { bonus: left.bonus, effects: left.effects, paused: left.paused }, nextAttack: { bonus: next.bonus, effects: next.effects, paused: next.paused, holds: next.m.holds.length } }));
  });

  await check("S5 通常武器の命中での消費: ハートの隣から通常攻撃を当てると蓄えが一度に消費される", async () => {
    await ev(`${HS}.clear('s5'); 'ok'`);
    const h = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    await ev(`$gamePlayer.locate(Math.round(${h.x}), Math.round(${h.y}) + 1); $gamePlayer.setDirection(8); 'ok'`); await sleep(500);
    await json(`${MN}.devSet(10)`);
    await key("Q");
    const p1 = await pend(), hp0 = await json("ProjectRSoulBattlePoC.getState().hp");
    const p = await json(`${ST}.toScreen(${h.x} * 48, ${h.y} * 48 - 24)`); await c.pointer(Math.round(p.x), Math.round(p.y)); await sleep(300);
    for (let i = 0; i < 4; i++) { await c.click(); await sleep(500); if (!(await pend())) break; }
    const p2 = await pend(), hp1 = await json("ProjectRSoulBattlePoC.getState().hp"), last = await json(`${HS}.getLastAttack()`);
    await json(`${MN}.devSet(10)`);
    const s0 = (await mana()).spent;
    await key("Q");
    const sp = (await mana()).spent, p3 = await pend();
    await s.shot("s5_consumed");
    rec("S5 命中で消費", p1 && p1.stacks === 1 && p2 === null && hp1 < hp0 && sp - s0 === 5 && p3 && p3.stacks === 1,
      JSON.stringify({ before: p1 && p1.stacks, after: p2, hp: [hp0, hp1], lastAttack: last, reCastSpent: sp - s0, reCast: p3 && p3.stacks }));
  });

  await check("S7 物理ダメージのカード(一閃)にも蓄えが使われる・非ダメージ(神託)では消費されない", async () => {
    await ev(`${HS}.clear('s7'); 'ok'`);
    await sleep(3600);                                                            // 神託の停止が残っていれば待つ
    const h = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    await ev(`$gamePlayer.locate(Math.round(${h.x}), Math.round(${h.y}) + 1); $gamePlayer.setDirection(8); 'ok'`); await sleep(500);
    const p = await json(`${ST}.toScreen(${h.x} * 48, ${h.y} * 48 - 24)`); await c.pointer(Math.round(p.x), Math.round(p.y)); await sleep(300);
    const hp = () => json("ProjectRSoulBattlePoC.getState().hp");
    await json(`${MN}.devSet(10)`);
    const a0 = await hp(); await key("T"); await sleep(900); const baseline = a0 - (await hp());            // 蓄えなし
    await json(`${MN}.devSet(10)`); await key("Q"); await json(`${MN}.devSet(10)`); await key("Q");
    const stacked = await pend();
    await json(`${MN}.devSet(10)`); await key("E");                                                      // 神託(非ダメージ): 蓄えは消費されない
    const afterOracle = await pend();
    await ev(`${HS}.clear('s7b'); 'ok'`); await sleep(300);
    await json(`${MN}.devSet(10)`); await key("Q"); await json(`${MN}.devSet(10)`); await key("Q");
    await json(`${MN}.devSet(10)`);
    const b0 = await hp(); await key("T"); await sleep(900); const boosted = b0 - (await hp());
    const left = await pend(), last = await json(`${HS}.getLastAttack()`);
    await s.shot("s7_card");
    rec("S7 物理カード", baseline > 0 && boosted > baseline && boosted / baseline <= 1.32 && stacked && stacked.stacks === 2 && afterOracle && afterOracle.stacks === 2 && left === null && last && last.card === true && last.source === "hermes_issen" && last.stacks === 2,
      JSON.stringify({ baseline, boosted, stacked: stacked && stacked.stacks, afterOracle: afterOracle && afterOracle.stacks, left, last }));
  });

  await check("S6 後片づけ: SOULを終えると元のマップへ戻り、保存データが変わらない", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const p = await pend(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })"), after = await saved();
    rec("S6 cleanup", back && p === null && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y, JSON.stringify({ back, pending: p, unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("SZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_strength_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・CDPの入力(人間の手動プレイの代わりではない)。devSet は Playtest専用の確認用", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
