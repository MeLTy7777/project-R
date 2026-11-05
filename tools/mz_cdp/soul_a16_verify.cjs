// I2: Apollo A16 + Hermes + SOUL P3-B の統合(ProjectRSoulSandbox の a16 シナリオ)の実機(Playtest)確認。
//   S0 開始: 指輪の一時付与・混成30枚デッキ(検証つき)・指定の最初の手札・SOULのハート=BossFrameworkのボス。競合は断る
//   S1 標的: 実キー(Q/E/X/C/V)+実マウスの照準でカードを使うと、ハートのHPだけが減る(アリーナのダミー・イベント3は減らない)
//   S2 防御: 防御ターンは実キーのカードが出ない(消費もしない)
//   S3 フェーズ: 公式の UpdateEventHp でHPを減らすと、BossFrameworkとAIのフェーズが進む
//   S4 勝利: HP0で reason=victory に1回だけ終わり、デッキ・指輪・所持・ダミー・武器が元に戻る
//   S5 外部終了: カード戦闘の終了でSOULが1回だけ終わり、元に戻る。stop() も安全
//   S6 stop() で途中終了: 元に戻る
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_a16_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", BF = "ProjectRBossFramework", AT = "ProjectRApolloTest", DK = "ProjectRCardDeck";
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const KEYS = ["Q", "E", "X", "C", "V"];
  const snap = () => json(`({ deck: $gameSystem._projectRCardDeckData, inv: $gameSystem._projectRCardInventory, dirty: ${AT}.isDirty(), cardBattle: ${DK}.isCardBattleActive(), sources: ProjectRCombatSession.sources(),
    weapon: $gameParty.leader().equips()[0] ? $gameParty.leader().equips()[0].id : 0, save: $gameSystem.isSaveEnabled(), soul: ${SO}.getPhase(), bf: (${BF}.getState() || {}).bossId || null,
    enemies: $gameMap.events().filter(function(e) { return e && !e.isSpawnEvent && (e.event().note || '').indexOf('<enemy>') >= 0; }).map(function(e) { return [e.eventId(), e._realX, e._realY]; }) })`);
  const hand = () => json(`${DK}.getBattleState().hand.map(function(h) { return h.cardId; })`);
  const heartId = () => ev(`${SO}.getState().heart.eventId`);
  const heartHp = () => ev("ProjectRCardModifiers.eventHp(" + "ProjectRSoulBattle.getState().heart.eventId" + ")");
  const aimHeart = async () => { const f = await json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId); return { x: e.screenX(), y: e.screenY() - 24 }; })()`); return c.pointer(f.x, f.y); };
  const useByKey = async cardId => { const h = await hand(); const i = h.indexOf(cardId); if (i < 0) return { ok: false, reason: "notInHand", hand: h }; await aimHeart(); await c.keyDown(KEYS[i]); await sleep(70); await c.keyUp(KEYS[i]); return { ok: true, key: KEYS[i] }; };
  const ends = []; let startOk = null;

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; window.__ends = []; ProjectRSoulBattle.onEnd(function(e) { window.__ends.push(e.reason); }); 'on'");
  await s.slow(1);
  const before = await snap();
  const fKeys = await ev("typeof ProjectRSoulSandbox.start + '/' + typeof ProjectRSoulSandbox.status + '/' + typeof ProjectRSoulSandbox.stop");

  await check("S0 開始: 指輪の一時付与・混成30枚デッキ(検証つき)・指定の手札・ハートがボス。簡単コマンドが揃っている", async () => {
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    startOk = r; await sleep(1200);
    const info = await json(`${AT}.deckInfo()`), st = await json(`${BF}.getState()`), status = await json(`${SB}.status()`), h = await hand(), snapNow = await snap();
    await s.shot("s0_start");
    rec("S0 start", r.ok && JSON.stringify(h) === JSON.stringify(HAND) && info.size === 30 && info.valid && info.inventoryReasons.length === 0 && info.rings.apollo === "player" && info.rings.hermes === "player"
      && st.bossId === "dev_boss_soul" && st.hp === 1000 && st.phaseCount === 3 && JSON.stringify(snapNow.sources.slice().sort()) === JSON.stringify(["boss:dev_boss_soul", "soul_battle"]) && snapNow.save === false
      && fKeys === "function/function/function" && status.a16 && status.a16.deckSize === 30,
      JSON.stringify({ hand: h, size: info.size, valid: info.valid, rings: info.rings, boss: st && [st.bossId, st.hp, st.phaseCount], sources: snapNow.sources, fKeys }));
  });

  await check("S1 標的(実キー+実マウス): カードを使うとハートのHPだけが減る。ダミー・イベント3のHPは減らない", async () => {
    await ev(`${SO}.getState(); 'ok'`);
    const hearts0 = await heartHp(); const others0 = await json("[2, 3, 4, 5, 6].map(function(i) { return ProjectRCardModifiers.eventHp(i); })");
    let used = [];
    for (const card of ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow"]) {
      const r = await useByKey(card); used.push(card + ":" + (r.ok ? r.key : r.reason)); await sleep(2500);
    }
    await s.shot("s1_attack");
    const hearts1 = await heartHp(), others1 = await json("[2, 3, 4, 5, 6].map(function(i) { return ProjectRCardModifiers.eventHp(i); })");
    const bf = await json(`${BF}.getState()`);
    rec("S1 target", hearts1 < hearts0 && JSON.stringify(others0) === JSON.stringify(others1) && bf.hp === hearts1,
      JSON.stringify({ heart: [hearts0, hearts1], others: [others0, others1], bossHp: bf.hp, used }));
  });

  await check("S2 防御ターンの入力遮断(実キー): 防御ターンはカードの実キーが効かず、手札も減らない", async () => {
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(400);
    const phase = await ev(`${SO}.getPhase()`), h0 = await hand();
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    await c.keyDown("E"); await sleep(70); await c.keyUp("E"); await sleep(300);
    const h1 = await hand(), blocked = await json(`${SO}.getBlockedCounts()`);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(300);
    rec("S2 defense", phase === "defense" && JSON.stringify(h0) === JSON.stringify(h1) && blocked.card >= 1, JSON.stringify({ phase, h0, h1, blocked }));
  });

  await check("S3 フェーズ: 公式のUpdateEventHpでHPを減らすと BossFramework と回避AIのフェーズが進む", async () => {
    const dealt = async n => ev(`(function() { var id = ${SO}.getState().heart.eventId; ProjectRCardModifiers.eventHp(id); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-${n}", exceedMaxHealth: "false" }); return 1; })()`);
    const hp0 = await heartHp();
    const want2 = hp0 - 600 + 0; await dealt(Math.max(0, hp0 - 640)); await sleep(500);
    const p2 = await json(`({ bf: ${BF}.getState().phase.id, dodge: ProjectRSoulBattleDodge.getState().phase, hp: ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId) })`);
    const hp1 = p2.hp; await dealt(Math.max(0, hp1 - 250)); await sleep(500);
    const p3 = await json(`({ bf: ${BF}.getState().phase.id, dodge: ProjectRSoulBattleDodge.getState().phase, hud: ${BF}.getHudState() })`);
    await s.shot("s3_phase");
    rec("S3 phase", p2.bf === "phase2" && p2.dodge === "phase2" && p3.bf === "phase3" && p3.dodge === "enrage" && p3.hud.hp > 0, JSON.stringify({ hp0, p2, p3: [p3.bf, p3.dodge, p3.hud.hp] }));
  });

  await check("S4 勝利: ハートのHPが0で reason=victory に1回だけ終わり、全て元に戻る", async () => {
    await ev(`(function() { var id = ${SO}.getState().heart.eventId; var hp = ProjectRCardModifiers.eventHp(id); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-" + (hp + 50), exceedMaxHealth: "false" }); return 1; })()`);
    await wait(`${SO}.getPhase() === 'idle'`, 8000); await sleep(1500);
    const e = await json("window.__ends"), after = await snap();
    await s.shot("s4_victory");
    rec("S4 victory", JSON.stringify(e) === JSON.stringify(["victory"]) && JSON.stringify(after.deck) === JSON.stringify(before.deck) && JSON.stringify(after.inv) === JSON.stringify(before.inv) && after.dirty === false
      && after.cardBattle === false && after.sources.length === 0 && after.weapon === before.weapon && after.save === before.save && JSON.stringify(after.enemies) === JSON.stringify(before.enemies) && after.bf === null,
      JSON.stringify({ ends: e, dirty: after.dirty, cardBattle: after.cardBattle, sources: after.sources, weapon: [before.weapon, after.weapon], enemiesSame: JSON.stringify(after.enemies) === JSON.stringify(before.enemies) }));
  });

  await check("S5 外部終了: a16を再開 → カード戦闘を外から終了すると、SOULが1回だけ終わり全て元に戻る", async () => {
    await sleep(3500);
    await ev("window.__ends.length = 0; 'ok'");
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    await sleep(1200);
    const ok0 = r.ok;
    await ev(`${DK}.endCardBattle(); 'ok'`); await sleep(1500);
    const e = await json("window.__ends"), after = await snap();
    rec("S5 external", ok0 && JSON.stringify(e) === JSON.stringify(["cardBattleEnded"]) && JSON.stringify(after.deck) === JSON.stringify(before.deck) && JSON.stringify(after.inv) === JSON.stringify(before.inv) && after.dirty === false && after.sources.length === 0 && after.soul === "idle",
      JSON.stringify({ start: r.ok ? "ok" : r, ends: e, dirty: after.dirty, sources: after.sources, soul: after.soul }));
  });

  await check("S6 stop(): 途中終了でも全て元に戻り、二重のstop()も安全", async () => {
    await sleep(3500);
    await ev("window.__ends.length = 0; 'ok'");
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, weapon: "sword", attackSeconds: 600 })`);
    await sleep(1200);
    const mid = await snap();
    const stop1 = await json(`${SB}.stop()`); await sleep(2000);
    const after = await snap(), stop2 = await json(`${SB}.stop()`);
    rec("S6 stop", r.ok && mid.weapon !== before.weapon && stop1.ok && stop2.ok && JSON.stringify(after.deck) === JSON.stringify(before.deck) && JSON.stringify(after.inv) === JSON.stringify(before.inv) && after.dirty === false
      && after.weapon === before.weapon && after.sources.length === 0, JSON.stringify({ midWeapon: mid.weapon, weapon: [before.weapon, after.weapon], dirty: after.dirty, sources: after.sources, steps: stop1.steps }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("SZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_a16_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
