// I3: SOUL戦闘の専用バトルHUD(ProjectR_SoulBattleHUD)の実機(Playtest)確認 + スクリーンショット。
//   H0 開始前: 通常HUDの表示(renderable / visible)を記録 → a16を開始
//   H1 開始: 通常HUD(BattleHUD・ホットバー・メニューボタン・敵HPバー)が隠れ、専用HUD・暗転が出る。表示値は本物のAPIと一致
//   H2 攻撃(実キー+実マウス): カードを使うとボスHP・手札・山札の表示が変わる。本物のハート・照準はマップ上のまま
//   H3 防御ターン: バトルボックスの予約レイアウトだけ。カードはLOCK表示、実キーは効かない
//   H4 フェーズ: HPを公式のUpdateEventHpで減らすとフェーズ表示が進む
//   H5 勝利: 通常HUDが元の表示へ戻る(開始前と同じ値)
//   H6 外部終了・stop(): どちらでも元の表示へ戻る
//   H7 解像度の変更: 1280x720 / 1920x1080 でレイアウトと暗転が追従する
//   H8 性能: SOUL HUD表示中のGame_Map.update相当のfpsを、通常HUDと比べる
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_hud_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", BF = "ProjectRBossFramework", HUD = "ProjectRSoulBattleHUD", DK = "ProjectRCardDeck";
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const KEYS = ["Q", "E", "X", "C", "V"];
  // 通常HUDの表示物の renderable / visible
  const flags = () => json(`(function() { var sc = SceneManager._scene, sp = sc._spriteset;
    var f = function(o) { return o ? [o.renderable, o.visible] : null; };
    return { battleHud: f(sc._projectRBattleHudLayer), skillUI: f(sc._skillUI), menuButton: f(sc._menuButton), hendrixHuds: (sc.hendrixHuds || []).map(function(h) { return f(h.container || h); }),
      bars: (sp._eventHpBars || []).map(function(b) { return [b._event.eventId(), b.renderable, b.visible]; }), label: sp.children.filter(function(c) { return c._projectRSoulBattleLabel; }).map(f) }; })()`);
  const dimInfo = () => json(`(function() { var sc = SceneManager._scene, tm = sc._spriteset._tilemap; var d = tm.children.filter(function(c) { return c._projectRSoulDim; });
    return { count: d.length, z: d[0] && d[0].z, w: d[0] && d[0]._dimW, h: d[0] && d[0]._dimH, gw: Graphics.width, gh: Graphics.height }; })()`);
  const hand = () => json(`${DK}.getBattleState().hand.map(function(h) { return h.cardId; })`);
  const aimHeart = async () => { const f = await json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId); return { x: e.screenX(), y: e.screenY() - 24 }; })()`); return c.pointer(f.x, f.y); };
  const useByKey = async cardId => { const h = await hand(); const i = h.indexOf(cardId); if (i < 0) return { ok: false, reason: "notInHand", hand: h }; await aimHeart(); await c.keyDown(KEYS[i]); await sleep(70); await c.keyUp(KEYS[i]); return { ok: true, key: KEYS[i] }; };
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const dealt = n => ev(`(function() { var id = ${SO}.getState().heart.eventId; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-${n}", exceedMaxHealth: "false" }); return 1; })()`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fps = async ms => ev(`new Promise(function(res) { var n = 0, t0 = performance.now(); function f(t) { n++; if (t - t0 >= ${ms}) res(n * 1000 / (t - t0)); else requestAnimationFrame(f); } requestAnimationFrame(f); })`);
  const measures = {};

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; window.__ends = []; " + SO + ".onEnd(function(e) { window.__ends.push(e.reason); }); 'on'");
  await s.slow(1);
  const before = await flags();
  const sandboxApi = await ev(`typeof ${SB}.start + '/' + typeof ${SB}.status + '/' + typeof ${SB}.stop + '/' + typeof ${HUD}.getViewModel`);
  measures.fpsNormal = await fps(3000);
  await s.shot("h0_before");

  await check("H0 開始前: 通常HUDの表示を記録。専用HUDは無効(通常のアリーナ戦闘では出ない)", async () => {
    const st = await json(`${HUD}.getState()`);
    rec("H0 baseline", sandboxApi === "function/function/function/function" && !st.active && st.hiddenCount === 0 && before.battleHud && before.battleHud[0] === true, JSON.stringify({ api: sandboxApi, st: [st.active, st.hiddenCount], battleHud: before.battleHud, bars: before.bars.length }));
  });

  await check("H1 開始: 通常HUDが隠れ、専用HUDと暗転が出る。表示値は本物のAPIと一致", async () => {
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    await sleep(1500);
    const f = await flags(), st = await json(`${HUD}.getState()`), vm = await json(`${HUD}.getViewModel()`), dim = await dimInfo(), bf = await json(`${BF}.getHudState()`);
    await s.shot("h1_attack");
    const hidden = f.battleHud[0] === false && f.skillUI[0] === false && f.bars.every(b => b[1] === false) && f.label.every(l => l[0] === false) && (!f.menuButton || f.menuButton[0] === false);
    const visibleUntouched = f.skillUI[1] === before.skillUI[1];   // BattleHUD本体の visible は本体が毎フレーム決める(SOUL中は戦闘イベント扱いで true)。ここでは触らない物だけ比べる
    rec("H1 start", r.ok && st.active && st.layerVisible && hidden && visibleUntouched && dim.count === 1 && dim.z === 2 && dim.w === dim.gw && dim.h === dim.gh && vm.phase === "attack"
      && vm.boss.name === bf.name && vm.boss.hp === bf.hp && vm.hand.map(h => h.cardId).join() === HAND.join() && vm.hand.every(h => h.level === 3),
      JSON.stringify({ hidden, visibleUntouched, st: [st.active, st.hiddenCount], dim, boss: vm.boss && [vm.boss.name, vm.boss.hp], hand: vm.hand.map(h => h.name + ":Lv" + h.level + ":CD" + h.cooldownSeconds) }));
  });

  await check("H2 攻撃(実キー+実マウス): カードを使うとボスHP・手札・山札の表示が変わる。マップ上の本物のハートはそのまま", async () => {
    const hp0 = await heartHp(), vm0 = await json(`${HUD}.getViewModel()`);
    const used = [];
    for (const card of ["hermes_issen", "apollo_eros_arrow"]) { const r = await useByKey(card); used.push(card + ":" + (r.ok ? r.key : r.reason)); await sleep(2200); }
    await sleep(300);
    const hp1 = await heartHp(), vm1 = await json(`${HUD}.getViewModel()`), heart = await json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId); return { visible: !e._erased, tx: e._realX, ty: e._realY, active: ProjectRSoulBattlePoC.isActive() }; })()`);
    await s.shot("h2_cast");
    rec("H2 cast", hp1 < hp0 && vm1.boss.hp === hp1 && vm1.counts.cooldown >= 1 && vm1.hand.map(h => h.cardId).join() !== vm0.hand.map(h => h.cardId).join() && heart.visible && heart.active,
      JSON.stringify({ hp: [hp0, hp1], vmHp: vm1.boss.hp, counts: [vm0.counts, vm1.counts], used }));
  });

  await check("H3 防御ターン: バトルボックスの予約レイアウトだけ。カードはLOCK、実キーは効かず手札は減らない", async () => {
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(800);
    const vm = await json(`${HUD}.getViewModel()`), h0 = await hand(), box = await json(`(function() { var l = SceneManager._scene._projectRSoulHud; return { box: l.box.visible, corners: l.corners.map(function(x) { return x.visible; }) }; })()`);
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    const h1 = await hand();
    await s.shot("h3_defense");
    rec("H3 defense", vm.phase === "defense" && box.box === true && box.corners.every(v => v === false) && vm.hand.every(h => h.empty || h.state === "locked") && same(h0, h1), JSON.stringify({ phase: vm.phase, box, states: vm.hand.map(h => h.state), handSame: same(h0, h1) }));
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(600);
  });

  await check("H4 フェーズ: HPを減らすとボス名・フェーズ表示が進み、HP表示が追従する", async () => {
    const hp0 = await heartHp();
    await dealt(Math.max(0, hp0 - 640)); await sleep(700);
    const vm2 = await json(`${HUD}.getViewModel()`); await s.shot("h4_phase2");
    const hp1 = await heartHp(); await dealt(Math.max(0, hp1 - 250)); await sleep(700);
    const vm3 = await json(`${HUD}.getViewModel()`); await s.shot("h4_phase3");
    rec("H4 phases", vm2.boss.phaseIndex === 1 && vm3.boss.phaseIndex === 2 && vm3.boss.hp === 250 && vm3.boss.ratio === 0.25, JSON.stringify({ p2: [vm2.boss.phaseLabel, vm2.boss.hp], p3: [vm3.boss.phaseLabel, vm3.boss.hp, vm3.boss.ratio] }));
  });

  await check("H7 解像度の変更(SOUL中): 1280x720 → 1920x1080 でレイアウト・暗転が追従する(重複しない)", async () => {
    const run = async (w, h, shot) => {
      await ev(`Graphics.resize(${w}, ${h}); 'ok'`); await sleep(900);
      const info = await json(`(function() { var l = SceneManager._scene._projectRSoulHud; return { sx: l.scale.x, sy: l.scale.y, gw: Graphics.width, gh: Graphics.height }; })()`), dim = await dimInfo();
      if (shot) await s.shot(shot);
      return { ok: Math.abs(info.sx - info.gw / 1920) < 1e-6 && Math.abs(info.sy - info.gh / 1080) < 1e-6 && dim.count === 1 && dim.w === info.gw && dim.h === info.gh, info, dim };
    };
    const a = await run(1280, 720, "h7_1280"), b = await run(1920, 1080, null);
    rec("H7 resize", a.ok && b.ok && (await json(`${HUD}.getState()`)).active, JSON.stringify({ a: [a.info.gw, a.info.gh, a.dim.count], b: [b.info.gw, b.info.gh, b.dim.count] }));
  });

  await check("H8 性能: SOUL HUD表示中のfps(通常のアリーナ戦闘との比較)", async () => {
    measures.fpsSoulHud = await fps(4000);
    rec("H8 perf", measures.fpsSoulHud > 40, JSON.stringify({ fpsNormal: +measures.fpsNormal.toFixed(1), fpsSoulHud: +measures.fpsSoulHud.toFixed(1) }));
  });

  await check("H5 勝利: 通常HUDが開始前と全く同じ表示へ戻る。専用HUD・暗転は消える", async () => {
    await ev(`(function() { var id = ${SO}.getState().heart.eventId; var hp = ProjectRCardModifiers.eventHp(id); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-" + (hp + 50), exceedMaxHealth: "false" }); return 1; })()`);
    await wait(`${SO}.getPhase() === 'idle'`, 8000); await sleep(1500);
    const after = await flags(), st = await json(`${HUD}.getState()`), dim = await dimInfo(), ends = await json("window.__ends");
    await s.shot("h5_victory");
    const stripBars = x => x.bars.map(b => b[1]);                    // 敵のHPバーは数が変わる(ハートのバーが消える)ので、残っている物の renderable を比べる
    const barsRestored = after.bars.every(b => b[1] === true);
    rec("H5 victory", same(ends, ["victory"]) && !st.active && st.hiddenCount === 0 && dim.count === 0 && after.battleHud[0] === before.battleHud[0] && after.skillUI[0] === before.skillUI[0]
      && same(after.menuButton, before.menuButton) && barsRestored && after.label.length === 0, JSON.stringify({ ends, st: [st.active, st.hiddenCount], dim: dim.count, battleHud: [before.battleHud, after.battleHud], skillUI: [before.skillUI, after.skillUI] }));
  });

  await check("H6 外部終了・stop(): どちらでも通常HUDが元の表示へ戻り、a16は再び開始できる", async () => {
    await sleep(3500);
    await ev("window.__ends.length = 0; 'ok'");
    const r1 = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`); await sleep(1500);
    const hiddenNow = (await flags()).battleHud[0] === false;
    await ev(`${DK}.endCardBattle(); 'ok'`); await sleep(1500);
    const a = await flags(), sa = await json(`${HUD}.getState()`), ends = await json("window.__ends");
    await sleep(3500);
    const r2 = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`); await sleep(1500);
    const hiddenAgain = (await flags()).battleHud[0] === false;
    const stop = await json(`${SB}.stop()`); await sleep(2500);
    const b = await flags(), sb = await json(`${HUD}.getState()`);
    rec("H6 external/stop", r1.ok && hiddenNow && same(ends, ["cardBattleEnded"]) && a.battleHud[0] === true && !sa.active && sa.hiddenCount === 0 && r2.ok && hiddenAgain && stop.ok && b.battleHud[0] === true && !sb.active && sb.hiddenCount === 0,
      JSON.stringify({ r1: r1.ok || r1, hiddenNow, ends, afterExternal: [a.battleHud, sa.active], r2: r2.ok || r2, hiddenAgain, stop: stop.ok, afterStop: [b.battleHud, sb.active], activations: sb.activations, restores: sb.restores }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("HZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_hud_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", measures, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  console.log("measures", JSON.stringify(measures));
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
