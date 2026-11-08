// SOUL戦闘 I4-B3 ボスの弾幕(狙い撃ち・扇・放射波)とフェーズに合わせた選択の実機(Playtest)確認 + スクリーンショット。CDP。
//   P1 フェーズ選択+警告→弾: 本物の BossFramework のフェーズ(第一/第二/第三形態)ごとに、狙い撃ち / 扇 / 放射波が選ばれる。弾が出る前に警告の線が(24フレーム以上)出ている。右上に敵のカットインが出る
//   P2 避ける(各フェーズ): 警告の線・弾の進路から離れるように本物のマウス(CDP)でハートを動かすと、3種とも一度も当たらず HP も変わらない
//   P3 被弾: 動かないハートには当たり、HP が弾ごとに DEV のダメージぶん減って、SOUL の HUD も同じになる(下限1・敗北の経路なし)
//   P4 カットイン配置: 敵のカットインは戦闘エリアの外(右上)にあり、どの解像度でも戦闘エリアに重ならない
//   P5 一時停止: 放射波・狙い撃ちの途中で止めると警告の時計も弾も止まり、再開すると続きから
//   P6 片づけ: DEFENSE の終わり(skip)・SOUL の終了で、弾・警告・絵が残らず、古い弾幕の続きが撃たれない。元のマップへ戻り、保存データが変わらない
// ボスの弾幕は DEV の仮表(本番のボスの弾幕は仕様が決まってから登録)。ダメージ・当たり円・下限HPは DEV 設定。敗北の経路は無い(D13 未承認)。入力はCDP(人間の手動プレイの代わりではない)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_boss_patterns_verify.cjs   (新しいNW.jsセッションで実行する)
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", EB = "ProjectRSoulEnemyBullets", BF = "ProjectRBossFramework";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const state = () => json(`${EB}.getState()`);
  const phase = () => ev(`${SO}.getPhase()`);
  const leaderHp = () => ev("$gameParty.leader().hp");
  const layerCount = () => ev(`(function() { var l = SceneManager._scene._spriteset._tilemap.children.filter(function(c) { return c && c._projectRSoulEnemyBullets; })[0]; return l ? l.children.length : 0; })()`);
  const toPhase = async p => { for (let i = 0; i < 6 && (await phase()) !== p; i++) { await ev(`${SO}.skipPhase(); 'ok'`); await sleep(350); } return (await phase()) === p; };
  const box = () => json(`${ST}.getBattleBox()`);
  const pointer = async (b, x, y) => c.pointer(Math.round(b.x + x * b.w), Math.round(b.y + y * b.w));       // 戦闘エリアの幅単位(x: 0〜1, y: 0〜9/16)の画面位置へ(本物のマウス)
  const mouseTo = async (u, v) => { const b = await box(); await pointer(b, u, v * 9 / 16); await sleep(250); };
  // 新しい DEFENSE に入り直す(PREPARE → ATTACK → DEFENSE)。防御に入るたびに、ボスのフェーズに合う弾幕が始まる
  const freshDefense = async (u = 0.5, v = 0.5) => { await toPhase("prepare"); await toPhase("attack"); await mouseTo(u, v); await toPhase("defense"); };
  const SAMPLE = `(function() { var st = ${EB}.getState(), hc = ${EB}.getHeartCircle(); return { run: st.running, age: st.runner ? st.runner.age : null, name: st.runner ? st.runner.name : null, tele: st.telegraphs, live: st.live, hits: st.stats.hits, pick: st.lastPick, cutIn: ProjectRCutIn.getActive().filter(function(e) { return e.owner === 'enemy'; }).length,
    heart: hc ? { x: hc.x, y: hc.y } : null, rays: ${EB}.getTelegraphs().map(function(t) { return { ox: t.origin.x, oy: t.origin.y, a: t.angle }; }), bl: ${EB}.getBullets().map(function(b) { return { x: b.x, y: b.y, vx: b.vx, vy: b.vy }; }) }; })()`;
  // 警告の線・飛んでいる弾の進路(直線)から離れた「目的地」をマウスで選ぶ避け方(単体テストと同じ考え方)。ハートはマウスに即座に追従する。
  const clearanceAt = (rays, x, y, cap) => { let m = cap; for (const r of rays) { const ex = x - r.ox, ey = y - r.oy, dx = Math.cos(r.a), dy = Math.sin(r.a), along = ex * dx + ey * dy; if (along < -0.03) continue; m = Math.min(m, Math.abs(ex * -dy + ey * dx)); } return m; };
  const dodgeStep = async (b, smp, cap = 0.09, ok = 0.04) => {
    if (!smp.heart) return false;
    const rays = smp.rays.slice(); for (const k of smp.bl) { const sp = Math.hypot(k.vx, k.vy); if (sp > 0) rays.push({ ox: k.x, oy: k.y, a: Math.atan2(k.vy, k.vx) }); }
    const here = clearanceAt(rays, smp.heart.x, smp.heart.y, cap);
    if (here >= ok) return false;
    let best = { x: smp.heart.x, y: smp.heart.y, score: here };
    for (const d of [0.02, 0.05, 0.1, 0.18, 0.3]) for (let k = 0; k < 24; k++) {
      const x = Math.max(0.02, Math.min(0.98, smp.heart.x + Math.cos(k * Math.PI / 12) * d)), y = Math.max(0.02, Math.min(9 / 16 - 0.02, smp.heart.y + Math.sin(k * Math.PI / 12) * d));
      const score = clearanceAt(rays, x, y, cap) - 0.1 * Math.hypot(x - smp.heart.x, y - smp.heart.y);
      if (score > best.score + 1e-9) best = { x, y, score };
    }
    await pointer(b, best.x, best.y); return true;
  };
  // 1回の弾幕を最後まで観測する(避ける動きは dodge が true のときだけ)。警告 → 弾の順・カットイン・スクリーンショットも取る
  const observe = async (label, { dodge = true, maxMs = 90000 } = {}) => {
    const b = await box(), t0 = Date.now();
    const out = { name: null, firstTele: null, firstLive: null, cutIn: 0, teleMax: 0, samples: 0, shotWarn: false, shotBullets: false, moves: 0, startedAt: null };
    let started = false, pick = null;
    while (Date.now() - t0 < maxMs) {
      const smp = await json(SAMPLE);
      out.samples++;
      if (smp.run) { started = true; out.name = smp.name; pick = smp.pick; if (out.startedAt === null) out.startedAt = smp.age; }
      if (smp.tele > 0 && out.firstTele === null) out.firstTele = smp.age;
      if (smp.live > 0 && out.firstLive === null) out.firstLive = smp.age;
      out.teleMax = Math.max(out.teleMax, smp.tele); out.cutIn = Math.max(out.cutIn, smp.cutIn);
      if (smp.tele > 0 && !out.shotWarn && smp.live === 0) { out.shotWarn = true; await s.shot(label + "_warning"); }
      if (smp.live >= 1 && out.firstLive !== null && smp.age >= out.firstLive + 12 && !out.shotBullets) { out.shotBullets = true; await s.shot(label + "_bullets"); }
      if (dodge && (await dodgeStep(b, smp))) out.moves++;
      if (started && !smp.run) break;
      await sleep(12);
    }
    out.pick = pick; out.finished = started && !(await state()).running;
    return out;
  };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const before = await saved();
  await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 600, defenseSeconds: 60, level: 3, weapon: "sword", prepare: true })})`);
  const active = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'");
  await wait("ProjectRSoulPrepare.isOpen()", 5000); await sleep(600);
  const boss0 = await json(`${BF}.getState()`);
  await ev(`${EB}.setConfig({ collision: true, damage: 25, floorHp: 1, feedback: true }); ${EB}.enableBoss(); 'ok'`);       // カットインも出す(既定)

  // ---- P1 + P2: フェーズごとに1回ずつ。同じ観測で「選択」「警告→弾の順」「カットイン」「避けると当たらない」を調べる ----
  const rounds = [];
  const setPhase = async ratio => { await ev(`${BF}.setHp(Math.floor(${BF}.getState().maxHp * ${ratio})); 'ok'`); await sleep(200); };
  const phasePlan = [{ name: "フェーズ1(第一形態)", ratio: null, expect: "dev_aimed", tele: 1 }, { name: "フェーズ2(第二形態)", ratio: 0.6, expect: "dev_fan", tele: 7 }, { name: "フェーズ3(第三形態)", ratio: 0.3, expect: "dev_radial", tele: 13 }];
  await check("P1/P2 準備: 各フェーズの弾幕を1回ずつ、避けながら観測する", async () => {
    await s.slow(3);                                                      // 3分の1の速さ(CDPの往復の遅れを相対的に小さくする)
    for (let i = 0; i < phasePlan.length; i++) {
      const p = phasePlan[i];
      if (p.ratio !== null) await setPhase(p.ratio);
      await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
      const hp0 = await leaderHp(), h0 = (await state()).stats.hits;
      await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.5);
      await toPhase("defense");
      const o = await observe("p" + (i + 1), { dodge: true });
      const hp1 = await leaderHp(), st = await state(), bf = await json(`${BF}.getState()`);
      rounds.push({ ...p, o, hp0, hp1, hits: st.stats.hits - h0, bossPhase: bf.phaseIndex, bossPhaseId: bf.phase.id });
    }
    await s.slow(1);
    rec("P1/P2 準備", rounds.length === 3 && rounds.every(r => r.o.finished), JSON.stringify(rounds.map(r => ({ name: r.name, pattern: r.o.name, finished: r.o.finished, samples: r.o.samples, moves: r.o.moves }))));
  });
  await check("P1 フェーズ選択: BossFramework のフェーズに合う弾幕が選ばれ、警告の線(24フレーム以上)が先に出て、弾はそのあと。右上に敵のカットインが出る。フェーズの移行ルールは BossFramework のまま", async () => {
    const ok = rounds.length === 3 && rounds.every((r, i) => r.o.name === r.expect && r.o.pick && r.o.pick.phaseIndex === i && r.o.pick.bossPhaseIndex === i && r.bossPhase === i && r.o.teleMax >= r.tele &&
      r.o.firstTele !== null && r.o.firstLive !== null && r.o.firstLive - r.o.firstTele >= 24 && r.o.cutIn >= 1 && r.o.shotWarn && r.o.shotBullets);
    const evs = (await state()).bossPhaseEvents;
    rec("P1 フェーズ選択", ok && boss0.phaseIndex === 0 && evs.length === 2 && evs[0].to === 1 && evs[1].to === 2,
      JSON.stringify({ boss0: boss0.phase.id, rounds: rounds.map(r => ({ pattern: r.o.name, pick: r.o.pick && [r.o.pick.phaseId, r.o.pick.entryIndex], tele: r.o.teleMax, teleAge: r.o.firstTele, liveAge: r.o.firstLive, cutIn: r.o.cutIn, bossPhase: r.bossPhaseId })), events: evs.map(e => [e.from, e.to]) }));
  });
  await check("P2 避ける: 警告の線・弾の進路から離れる本物のマウスの動きで、3種とも一度も当たらず、HP も変わらない", async () => {
    rec("P2 避ける", rounds.length === 3 && rounds.every(r => r.hits === 0 && r.hp1 === r.hp0 && r.o.moves >= 1), JSON.stringify(rounds.map(r => ({ pattern: r.o.name, hits: r.hits, hp: [r.hp0, r.hp1], moves: r.o.moves }))));
  });

  // ---- P3: 動かなければ当たる。HP は弾ごとに DEV のダメージぶん減り、HUD も同じ。下限1で敗北しない ----
  await check("P3 被弾: 動かないハートには当たり、HP が弾ごとに 25 減って HUD も同じ。下限 1 で止まり、戦闘不能・ゲームオーバーにならない", async () => {
    await ev(`${EB}.setConfig({ collision: true, damage: 25, floorHp: 1 }); ${EB}.disable(); ${EB}.clear('p3'); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.5); await toPhase("defense"); await sleep(400);
    await mouseTo(0.5, 0.5);
    const hp0 = await leaderHp(), h0 = (await state()).stats.hits;
    await ev(`${EB}.fire('dev_radial', { cutIn: false }); 'ok'`);
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000 && (await state()).running) { if (!shot && (await json(`${EB}.getFeedback().length`)) > 0) { await s.shot("p3_hit"); shot = true; } await sleep(30); }
    await sleep(300);
    const st = await state(), hp1 = await leaderHp(), hud = await json("ProjectRSoulBattleHUD.getViewModel().player.hp"), hits = st.stats.hits - h0;
    // 巨大なダメージ: 下限 1
    await ev(`${EB}.setConfig({ damage: 1000000 }); 'ok'`);
    await ev(`${EB}.fire('dev_aimed', { cutIn: false, warnFrames: 24, shotGap: 24, shots: 2 }); 'ok'`);
    await wait(`${EB}.getState().running === false`, 40000); await sleep(300);
    const hpF = await leaderHp(), dead = await ev("$gameParty.leader().isDead()"), pd = await ev("ProjectR.PlayerDeath.isDead()"), scene = await ev("SceneManager._scene.constructor.name"), act = await ev(`${SO}.isActive()`), allDead = await ev("$gameParty.isAllDead()");
    await ev(`${EB}.setConfig({ damage: 25 }); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    rec("P3 被弾", hits >= 1 && hp1 === hp0 - 25 * hits && hud === hp1 && shot && hpF === 1 && dead === false && pd === false && allDead === false && scene === "Scene_Map" && act === true,
      JSON.stringify({ hits, hp: [hp0, hp1], hud, feedbackSeen: shot, floor: { hp: hpF, dead, playerDeath: pd, allDead, scene, soulActive: act } }));
  });

  // ---- P4: カットインの配置 ----
  await check("P4 カットイン配置: 敵のカットインは戦闘エリアの外(右上)で、どの解像度でも戦闘エリアに重ならない", async () => {
    const live = await json(`(function() { var r = ${ST}.getCutInRects(), v = ${ST}.getViewport(); return { enemy: r.enemy, ally: r.ally, vp: { x: v.x, y: v.y, w: v.w, h: v.h }, gw: v.gw, gh: v.gh }; })()`);
    const sizes = [[1920, 1080], [1280, 720], [816, 624], [1024, 768], [2560, 1080], [1600, 900]];
    const calc = await json(`${JSON.stringify(sizes)}.map(function(sz) { var vp = ${ST}.computeViewport(sz[0], sz[1]), r = ${ST}.computeCutInRects(vp); return { size: sz, right: r.enemy.x >= vp.x + vp.w, inScreen: r.enemy.x + r.enemy.w <= sz[0] && r.enemy.y >= 0, upper: r.enemy.y + r.enemy.h <= vp.y + vp.h / 2, allyLeft: r.ally.x + r.ally.w <= vp.x }; })`);
    // 実際のカットイン(右上)の表示: 弾幕を始めた直後に1枚撮る
    await ev(`${EB}.clear('p4'); ${EB}.fire('dev_aimed'); 'ok'`); await sleep(500);
    const act = await json("ProjectRCutIn.getActive().filter(function(e) { return e.owner === 'enemy'; })");
    await s.shot("p4_cutin"); await ev(`${EB}.clear('p4'); 'ok'`);
    const outside = live.enemy.x >= live.vp.x + live.vp.w;
    rec("P4 カットイン配置", outside && live.enemy.x + live.enemy.w <= live.gw && live.enemy.y + live.enemy.h <= live.vp.y + live.vp.h / 2 && live.ally.x + live.ally.w <= live.vp.x && calc.every(o => o.right && o.inScreen && o.upper && o.allyLeft) && act.length >= 1,
      JSON.stringify({ live: { enemy: live.enemy, vp: live.vp }, sizes: calc.map(o => [o.size.join("x"), o.right && o.inScreen && o.upper && o.allyLeft]), activeEnemyCutIns: act.length }));
  });

  // ---- P5: 一時停止 ----
  await check("P5 一時停止: 放射波・狙い撃ちの途中で止めると警告の時計も弾も止まり、再開すると続きから", async () => {
    const results = [];
    for (const name of ["dev_radial", "dev_aimed"]) {
      await ev(`${EB}.setConfig({ collision: false }); ${EB}.clear('p5'); 'ok'`);
      await toPhase("prepare"); await toPhase("attack"); await mouseTo(0.5, 0.5); await toPhase("defense"); await sleep(400);
      await ev(`${EB}.clear('p5'); ${EB}.fire('${name}', { cutIn: false }); 'ok'`);
      await sleep(name === "dev_radial" ? 1600 : 1100);
      await ev("$gameMap.eventsPaused = true; 'ok'"); await sleep(150);
      const snap = () => json(`(function() { var st = ${EB}.getState(); return { b: ${EB}.getBullets().map(function(b) { return [b.id, b.x, b.y, b.age]; }), t: ${EB}.getTelegraphs().map(function(t) { return [t.id, t.angle, t.fireIn]; }), age: st.runner ? st.runner.age : null, spawned: st.stats.spawned, paused: st.stats.pausedTicks, ticks: st.stats.ticks }; })()`);
      const a = await snap(); await sleep(1500); const b = await snap();
      await ev("$gameMap.eventsPaused = false; 'ok'"); await sleep(500); const c2 = await snap();
      results.push({ name, held: JSON.stringify([a.b, a.t, a.age, a.spawned]) === JSON.stringify([b.b, b.t, b.age, b.spawned]), counted: b.paused > a.paused, resumed: c2.ticks > b.ticks && (c2.age === null || c2.age > b.age), bullets: a.b.length, tele: a.t.length });
      await ev(`${EB}.clear('p5'); 'ok'`);
    }
    rec("P5 一時停止", results.every(r => r.held && r.counted && r.resumed && (r.bullets > 0 || r.tele > 0)), JSON.stringify(results));
  });

  // ---- P6: 片づけ ----
  await check("P6 片づけ: DEFENSE の終わり・SOUL の終了で、弾・警告・絵が残らず、古い弾幕の続きが撃たれない。元のマップへ戻り保存データが変わらない", async () => {
    await ev(`${EB}.setConfig({ collision: true, damage: 25 }); ${EB}.enableBoss(); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'`);
    const rounds2 = [];
    for (let i = 0; i < 2; i++) {
      await freshDefense(); await sleep(i === 0 ? 3200 : 1500);
      const mid = await state(), lc = await layerCount();
      await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);                        // DEFENSE → PREPARE(弾幕の途中)
      const after = await state(), lc2 = await layerCount(), spawned = after.stats.spawned;
      await toPhase("attack"); await sleep(1500);
      const later = await state();
      rounds2.push({ midLive: mid.live + mid.telegraphs, running: mid.running, layerBefore: lc, afterLive: after.live, afterTele: after.telegraphs, afterRunning: after.running, layerAfter: lc2, noLateShots: later.stats.spawned === spawned && later.live === 0 && later.telegraphs === 0 });
    }
    await freshDefense(); await sleep(2000);
    const beforeEnd = await state();
    await ev(`${SO}.end('abort'); 'ok'`); await sleep(600);
    const ended = await state(), lcEnd = await layerCount();
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const st = await state(), w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })"), after = await saved();
    await ev(`${EB}.disable(); 'ok'`);
    rec("P6 片づけ", rounds2.every(r => r.midLive > 0 && r.running && r.afterLive === 0 && r.afterTele === 0 && !r.afterRunning && r.layerAfter === 0 && r.noLateShots) && beforeEnd.live + beforeEnd.telegraphs > 0 && ended.live === 0 && ended.telegraphs === 0 && ended.running === false && lcEnd === 0 && back && st.live === 0 && after === before && w.map === origin.map && w.x === origin.x && w.y === origin.y,
      JSON.stringify({ rounds2, endLive: [beforeEnd.live + beforeEnd.telegraphs, ended.live], layerEnd: lcEnd, back, unchanged: after === before, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("PZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_boss_patterns_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・DEVのフェーズ表(狙い撃ち/扇/放射波)・CDPの入力(人間の手動プレイの代わりではない)。ダメージ・当たり円・下限HPは DEV 設定。敗北の経路なし(D13 未承認)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
