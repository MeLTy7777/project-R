// SOUL戦闘 I4-B3b ATTACK / DEFENSE の秒数・ボスの弾幕の自動有効化・出現位置での弾ごとの被弾 の実機(Playtest)確認 + スクリーンショット。CDP。
//   K1 既定: a16(prepare:true)を秒数も bossAttacks も指定せずに始める → ATTACK 8秒 / DEFENSE 6秒。ボスの弾幕は F8 のコマンド無しで有効
//   K2 自然な遷移: PREPARE →(攻撃)→ ATTACK 480f → DEFENSE 360f → PREPARE。DEFENSE で第一形態の弾幕が自動で始まり、DEFENSE の終わる前に弾も警告も残らない(途中の打ち切りなし)
//   K3 実際のHP: 動かないハートに、狙い撃ち 3 発が弾ごとに 25 ずつ当たる(HP の比較)。HUD も同じ
//   K4 出現位置: 弾の出る位置にハートを置くと、重なった弾は同じフレームでも弾ごとに 25(放射波 13 発 = 325)。同じ弾は二度当たらず、HP の下限 1 で止まる(戦闘不能・ゲームオーバーにならない)
//   K5 被ダメージ倍率: DamageModifiers(0.4)を掛けると、弾ごとに 10 になる(出現位置の扇 9 発 x 2 波 = 180)
//   K7 配分(B4): 当たり判定を切った自然な DEFENSE で、弾幕は DEFENSE の長さに合わせて波・発の間隔が広がり、弾幕が終わってから DEFENSE の終わりまでの空きは 0.3〜1.0 秒(従来 1.7〜2.7 秒)。DEFENSE の終わる前に弾も警告も残らない
//   K6 後片づけ: stop() で自動開始が解除され、元のマップへ戻り、保存データが変わらない
// ボスの弾幕は DEV の仮表。ダメージ・当たり円・下限HPは DEV 設定(敗北の経路なし・D13 未承認)。入力はCDP(人間の手動プレイの代わりではない)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_pacing_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const state = () => json(`${EB}.getState()`);
  const hp = () => ev("$gameParty.leader().hp");
  const box = () => json(`${ST}.getBattleBox()`);
  const pointer = async (b, x, y) => c.pointer(Math.round(b.x + x * b.w), Math.round(b.y + y * b.w));       // 戦闘エリアの幅単位(x: 0〜1, y: 0〜9/16)の画面位置へ(本物のマウス)
  const full = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const SMP = `(function() { var st = ${EB}.getState(), so = ${SO}.getState(); return { phase: ${SO}.getPhase(), left: so.secondsLeft, total: so.totalFrames, run: st.running, live: st.live, tele: st.telegraphs, age: st.runner ? st.runner.age : null, name: st.runner ? st.runner.name : null, cleared: st.stats.cleared, hits: st.stats.hits, spawned: st.stats.spawned, hp: $gameParty.leader().hp, hud: ProjectRSoulBattleHUD.getViewModel().player.hp }; })()`;

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();
  // 秒数も bossAttacks も指定しない・enableBoss も呼ばない(F8 のコマンド無し)
  await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], level: 3, weapon: "sword", prepare: true })})`);
  const active = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'");
  await wait("ProjectRSoulPrepare.isOpen()", 5000); await sleep(600);

  await check("K1 既定", async () => {
    const st = await json(`${SO}.getState()`), eb = await state(), defs = await json(`${SO}.getDefaults()`);
    rec("K1 既定", active && st.prepare === true && st.attackSeconds === 8 && st.defenseSeconds === 6 && defs.legacy.defenseSeconds === 5 && defs.prepare.defenseSeconds === 6 && eb.enabled === true && eb.mode === "boss" && st.phase === "prepare",
      JSON.stringify({ attack: st.attackSeconds, defense: st.defenseSeconds, defaults: defs, bossAttacks: [eb.enabled, eb.mode] }));
  });

  const log = [];
  await check("K2/K3 自然な遷移と実際のHP", async () => {
    await full(); const b = await box();
    await ev("ProjectRSoulPrepare.isOpen() && ProjectRSoulPrepare.close && ProjectRSoulPrepare.close('test'); 'ok'").catch(() => {});
    await pointer(b, 0.5, 0.2813); await sleep(300);
    const hp0 = await hp(), st0 = await state();
    const t0 = Date.now(); await ev(`${SO}.beginAttack(); 'ok'`);
    const marks = []; let last = null, defSamples = [], sawPattern = null, shotWarn = false;
    while (Date.now() - t0 < 25000) {
      const m = await json(SMP);
      if (m.phase !== last) { marks.push({ phase: m.phase, t: Date.now() - t0, total: m.total }); last = m.phase; }
      if (m.phase === "defense") { defSamples.push(m); if (m.name) sawPattern = m.name; if (!shotWarn && m.tele > 0) { shotWarn = true; await s.shot("k2_defense_warning"); } }
      if (m.phase === "prepare" && marks.length >= 3) break;
      await sleep(15);
    }
    await sleep(300);
    const st1 = await state(), hp1 = await hp(), hud = await json("ProjectRSoulBattleHUD.getViewModel().player.hp");
    const atk = marks.find(m => m.phase === "attack"), def = marks.find(m => m.phase === "defense"), prep = marks.filter(m => m.phase === "prepare").pop();
    const attackMs = def.t - atk.t, defenseMs = prep.t - def.t;
    const tail = defSamples.filter(m => m.left < 0.9);                              // DEFENSE の終わる前の約 0.9 秒
    const hits = st1.stats.hits - st0.stats.hits;
    log.push({ marks, attackMs, defenseMs });
    rec("K2 自然な遷移", atk.total === 480 && def.total === 360 && Math.abs(attackMs - 8000) < 1000 && Math.abs(defenseMs - 6000) < 1000 && sawPattern === "dev_aimed" && tail.length > 5 && tail.every(m => !m.run && m.live === 0 && m.tele === 0) && st1.stats.cleared === st0.stats.cleared && shotWarn,
      JSON.stringify({ attack: [atk.total, attackMs], defense: [def.total, defenseMs], pattern: sawPattern, tailSamples: tail.length, tailClean: tail.every(m => !m.run && m.live === 0 && m.tele === 0), clearedUnchanged: st1.stats.cleared === st0.stats.cleared }));
    rec("K3 実際のHP", hits === 3 && hp1 === hp0 - 75 && hud === hp1 && st1.lastPick && st1.lastPick.phaseId === "phase1",
      JSON.stringify({ hits, hp: [hp0, hp1], hud, lastPick: st1.lastPick && [st1.lastPick.phaseId, st1.lastPick.pattern] }));
  });

  // 第三形態の最初の弾幕(放射波)で、出現位置にハートを置く。ゆっくり(スロー)再生で、1波目と2波目の間を観測する
  await check("K4 出現位置", async () => {
    await full(); await ev(`${BF}.setHp(Math.floor(${BF}.getState().maxHp * 0.3)); 'ok'`); await sleep(300);
    const b = await box(); await pointer(b, 0.5, 0.2813); await sleep(250);
    const hp0 = await hp(), h0 = (await state()).stats.hits;
    await s.slow(3);
    await ev(`${SO}.beginAttack(); 'ok'`);
    await wait(`${SO}.getPhase() === 'defense'`, 60000);
    await wait(`${EB}.getTelegraphs().length > 0`, 20000);
    const o = (await json(`${EB}.getTelegraphs()`))[0].origin;
    await pointer(b, o.x, 0.0141);                                                  // 弾の出る位置へ(警告の間に)
    await wait(`${EB}.getState().stats.hits >= ${h0 + 13}`, 20000);
    await sleep(250);                                                               // HUD は次のフレームで更新される(2波目まではスロー再生で約 1.9 秒ある)
    const m1 = await json(SMP), hits1 = await json(`${EB}.getHits()`);
    await s.shot("k4_spawn_hits");
    await wait(`${EB}.getState().running === false`, 60000);
    await sleep(300);
    const m2 = await json(SMP), all = await json(`${EB}.getHits()`), st = await state();
    await s.slow(1);
    const mine = all.slice(-(m2.hits - h0));
    const wave1 = hits1.slice(-(m1.hits - h0));
    const deadNow = await ev("$gameParty.leader().isDead()"), pd = await ev("ProjectR.PlayerDeath.isDead()"), scene = await ev("SceneManager._scene.constructor.name"), act = await ev(`${SO}.isActive()`), allDead = await ev("$gameParty.isAllDead()");
    rec("K4 出現位置", m1.hits - h0 === 13 && wave1.length === 13 && new Set(wave1.map(h => h.bulletId)).size === 13 && wave1.every(h => h.dealt === 25) && m1.hp === hp0 - 325 && m1.hud === m1.hp
      && m2.hits - h0 === 38 && new Set(mine.map(h => h.bulletId)).size === mine.length && m2.hp === 1 && deadNow === false && pd === false && allDead === false && scene === "Scene_Map" && act === true && st.stats.hitsAtFloor >= 1,
      JSON.stringify({ wave1: { hits: m1.hits - h0, hp: [hp0, m1.hp], hud: m1.hud, dealt: wave1.map(h => h.dealt).join("|") }, total: { hits: m2.hits - h0, hp: m2.hp, unique: new Set(mine.map(h => h.bulletId)).size, atFloor: st.stats.hitsAtFloor }, alive: { deadNow, pd, allDead, scene, act } }));
  });

  await check("K5 被ダメージ倍率", async () => {
    await ev(`${SO}.skipPhase && ${SO}.getPhase() === 'defense' && ${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'prepare'`, 20000);
    await full(); await s.slow(1);
    await ev("ProjectRDamageModifiers.add({ id: 'k-dmg', kind: 'damageTaken', target: 'player', value: 0.4 }); 'ok'");
    const b = await box(); await pointer(b, 0.5, 0.2813); await sleep(250);
    const hp0 = await hp(), h0 = (await state()).stats.hits;
    await s.slow(3);
    await ev(`${SO}.beginAttack(); 'ok'`);
    await wait(`${SO}.getPhase() === 'defense'`, 60000);
    await wait(`${EB}.getTelegraphs().length > 0`, 20000);
    const o = (await json(`${EB}.getTelegraphs()`))[0].origin, pattern = (await state()).runner.name;
    await pointer(b, o.x, 0.0141);
    await wait(`${EB}.getState().running === false`, 60000);
    await sleep(300);
    const st = await state(), hp1 = await hp(), hits = st.stats.hits - h0, all = await json(`${EB}.getHits()`);
    await s.slow(1);
    await ev("ProjectRDamageModifiers.remove('k-dmg'); 'ok'");
    const mine = all.slice(-hits);
    rec("K5 被ダメージ倍率", pattern === "dev_fan" && hits === 18 && hp0 - hp1 === 180 && mine.every(h => h.dealt === 10), JSON.stringify({ pattern, hits, hp: [hp0, hp1], dealt: [...new Set(mine.map(h => h.dealt))] }));
  });

  await check("K7 配分", async () => {
    await ev(`${SO}.getPhase() === 'defense' && ${SO}.skipPhase(); 'ok'`); await wait(`${SO}.getPhase() === 'prepare'`, 20000);
    await full(); await s.slow(1);
    await ev("ProjectRDamageModifiers.list && ProjectRDamageModifiers.remove('k-dmg'); 'ok'");
    await ev(`${EB}.setConfig({ collision: false }); 'ok'`);
    const b = await box(); await pointer(b, 0.5, 0.2813); await sleep(250);
    const rows = [];
    for (let round = 0; round < 3; round++) {                                         // 第三形態の巡回: 狙い撃ち5発 → 放射波 → 扇9発
      await ev(`${SO}.beginAttack(); 'ok'`);
      await wait(`${SO}.getPhase() === 'defense'`, 30000);
      let name = null, pace = null, endLeft = null, tailClean = true, fires = 0, lastSpawned = (await state()).stats.spawned, ages = [];
      const t0 = Date.now();
      while (Date.now() - t0 < 12000) {
        const m = await json(SMP);
        if (m.phase !== "defense") break;
        if (m.name) name = m.name;
        if (m.spawned > lastSpawned) { ages.push(m.age); lastSpawned = m.spawned; }
        if (name && !m.run && endLeft === null) endLeft = m.left;
        if (m.left < 0.3 && (m.run || m.live > 0 || m.tele > 0)) tailClean = false;
        await sleep(12);
      }
      const rs = await state(); pace = rs.lastPick && rs.lastPick.options;
      rows.push({ name, endLeft, tailClean, volleys: ages.length });
      await wait(`${SO}.getPhase() === 'prepare'`, 15000); await sleep(300);
    }
    const expectVolleys = { dev_aimed: 5, dev_radial: 3, dev_fan: 2 };
    rec("K7 配分", rows.length === 3 && rows.every(r => r.name && r.endLeft !== null && r.endLeft >= 0.3 && r.endLeft <= 1.0 && r.tailClean && r.volleys === expectVolleys[r.name]) && new Set(rows.map(r => r.name)).size === 3,
      JSON.stringify(rows.map(r => ({ pattern: r.name, idleSec: r.endLeft && +r.endLeft.toFixed(2), tailClean: r.tailClean, volleys: r.volleys }))));
  });

  await check("K6 後片づけ", async () => {
    await full();
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const st = await state(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })"), after = await saved();
    rec("K6 後片づけ", back && st.enabled === false && st.live === 0 && st.telegraphs === 0 && st.running === false && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y,
      JSON.stringify({ back, autoStartReleased: st.enabled === false, live: st.live, unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("KZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_pacing_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true・秒数指定なし・F8コマンドなし)・CDPの入力(人間の手動プレイの代わりではない)。ダメージ・当たり円・下限HPは DEV 設定。敗北の経路なし(D13 未承認)", log, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
