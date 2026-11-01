// Phase Apollo-A4: 実機(Playtest)の確認 — 黄金の矢(apollo_golden_volley)Lv1〜2。実マウスの狙い・実キーの発動・実エンジンの矢の移動と命中・演出。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a4_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   新しいゲームはメモリ上に作り、Apolloの指輪・カードの所持・壁(Region 255)はこのセッションのメモリ上だけに足す(セーブしない・ファイルを書かない)。
//   入力はCDPのキー/マウスイベント(本物の入力経路を通るが、人間の手動確認ではない)。スクリーンショットは MZ_OUT へ出る。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_golden_volley";
const API = "ProjectRApolloGoldenVolley";
const RESERVED_OTHERS = ["apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async lv => { const r = await json(`ProjectRApolloTest.start(${lv})`); await sleep(400); await s.slow(1); return r; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000 - await barHp(id);
  const pending = () => json(`${API}.getPending()`);
  const arrows = () => json(`${API}.getActiveArrows()`);
  const last = () => json(`${API}.getLastResult()`);
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const volleyEvents = () => json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  // 敵(4番)をプレイヤー(9,15)から (dx, dy) タイルへ置いて、そちらへマウスを向ける。壁を足したときは後で戻す。
  const scene = async (lv, enemy = [13, 15]) => {
    await start(lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, enemy[0], enemy[1]); await resetHp(); await sleep(200);
    await s.aim(enemy[0] - 9, enemy[1] - 15);
  };
  const walls = [];
  const wall = async (x, ys) => ev(`(function() { var m = $dataMap, size = m.width * m.height, saved = []; ${JSON.stringify(ys)}.forEach(function(y) { var i = 5 * size + y * m.width + ${x}; saved.push([i, m.data[i]]); m.data[i] = 255; }); window.__wallSaved = (window.__wallSaved || []).concat(saved); return saved.length; })()`);
  const unwall = () => ev("(function() { (window.__wallSaved || []).forEach(function(p) { $dataMap.data[p[0]] = p[1]; }); var n = (window.__wallSaved || []).length; window.__wallSaved = []; return n; })()");
  const wallInk = () => walls.length;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  void wallInk;

  await check("V0 boot: 黄金の矢が登録済み(強力・5枚・Cd3・ground)、残りのApollo 7枚は未登録、旧Apollo 3枚は不変。Prefab・バランス・ライブラリ・素材がある", async () => {
    const v = await json(`({ api: !!${API}, def: ProjectRCardDeck.definitions.card('${CARD}'), inactive: ProjectRCardCatalog.inactiveRuntimeCards(), registry: ProjectRCardDeck.definitions.cardDefinitions().length,
      legacy: ['apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; }),
      template: !!$dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Golden Volley Arrow'; }), balance: ProjectRCardBalance.isReady() && ProjectRCardBalance.hasCard('${CARD}'),
      effects2: ${API}.effectsForLevel(2), test: typeof ProjectRApolloTest.start, vfx: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_volley/.test(k); }),
      cut: ProjectRCutIn.isCardEnabled('${CARD}') })`);
    const lib = await ev(`new Promise(function(res) { try { Promise.resolve(getAnimationFromLibrary('ProjectR_Volley_Burst')).then(function(a) { Promise.resolve(getAnimationFromLibrary('ProjectR_Volley_Particles')).then(function(b) { res(!!a && !!b); }, function() { res(false); }); }, function() { res(false); }); } catch (e) { res('err'); } })`);
    const files = ["img/characters/VFX/$ProjectR_GoldenArrow.png", "img/characters/VFX/$ProjectR_GoldenArrowThick.png", "img/pictures/ProjectR_Bow_DEV.png", "img/pictures/Animation/ProjectR_Volley_Burst.png", "img/pictures/Animation/ProjectR_Volley_Particles.png", "img/characters/$DEV3H_ArmExtend_f4.png"]
      .every(f => fs.existsSync(f));
    rec("V0 boot", v.api && v.def.maxCopies === 5 && v.def.cooldownSeconds === 3 && v.def.targetType === "ground" && v.def.rarity === "strong" && v.inactive.length === 7 && JSON.stringify(v.inactive.slice().sort()) === JSON.stringify(RESERVED_OTHERS.slice().sort())
      && v.registry === 15 && JSON.stringify(v.legacy) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]) && v.template && v.balance && v.effects2.projectileCount === 5 && v.test === "function"
      && v.vfx.length === 2 && v.cut === true && lib === true && files, JSON.stringify({ ...v, lib, files }).slice(0, 700));
  });

  await check("V1 実マウス+実キー(Lv1): 敵へマウスを向けてQ → 3本が±15度で飛ぶ。飛んでいる間はカードを消費せず、命中の瞬間に50ダメージ・1回だけ消費(Cooldownは命中から3秒)", async () => {
    await scene(1);
    const mouse = await json("({ x: TouchInput.x, y: TouchInput.y, px: $gamePlayer.screenX(), py: $gamePlayer.screenY() })");
    const aimDeg = ((Math.atan2(mouse.y - mouse.py, mouse.x - mouse.px) * 180 / Math.PI + 450) % 360);
    await s.slow(4);
    await c.tap("Q", 60);
    await settle(3);
    const midP = await pending(), midA = await arrows(), midPile = await pile(), midHand = await json("ProjectRCardDeck.getBattleState().hand.length"), midLost = await lost(4);
    await s.shot("v1_flight");
    await settle(40); await s.slow(1); await settle(30);
    const after = { lost: await lost(4), pile: await pile(), last: await last(), events: await volleyEvents(), pending: await pending(), cd: await json("ProjectRCardDeck.getBattleState().cooldownPile.map(function(e) { return e.remainingSeconds; })") };
    const degrees = midA.map(a => Math.round(a.degree * 100) / 100).sort((a, b) => a - b);
    const want = [aimDeg - 15, aimDeg, aimDeg + 15].map(d => Math.round(((d + 360) % 360) * 100) / 100).sort((a, b) => a - b);
    rec("V1 mouse+key Lv1", midP && midP.arrows >= 1 && midA.length >= 1 && midA.length <= 3 && degrees.every(d => want.some(w2 => Math.abs(w2 - d) < 0.05)) && midPile === 0 && midHand === 5 && midLost === 0
      && after.lost === 50 && after.pile === 1 && after.last.committed === true && after.last.hits.length === 1 && after.events === 0 && after.pending === null, JSON.stringify({ aimDeg, degrees, want, midP, midPile, midHand, midLost, after }).slice(0, 800));
  });

  await check("V2 斜めの狙い: 上(右上)の敵へ向けるとその方向へ矢が出て命中する。発射後にマウスを逆へ動かしても矢は追尾せず、回転は変わらない", async () => {
    await scene(1, [12, 12]);
    await s.slow(4);
    await c.tap("Q", 60); await settle(2);
    const a0 = await arrows(); const r0 = a0.map(a => a.rotation);
    await s.aim(-6, 3); // 発射後にマウスを逆へ
    await settle(3);
    const a1 = await arrows();
    const same = a1.length > 0 && a1.every(a => r0.some(r => Math.abs(r - a.rotation) < 1e-6));
    await settle(60); await s.slow(1); await settle(20);
    const dealt = await lost(4), last_ = await last();
    rec("V2 diagonal+capture", a0.length === 3 && same && dealt === 50 && last_.committed === true && Math.abs(last_.degree - 45) < 15, JSON.stringify({ r0, a1: a1.map(a => a.rotation), dealt, degree: last_.degree }));
  });

  await check("V3 外れ(失敗): 敵のいない方向へ撃つと、矢は壁/端/射程で消え、カードは消費されない(Cooldownなし)。すぐ再発射できる", async () => {
    await scene(1, [13, 15]);
    await s.aim(0, -5); // 真上(敵はいない)
    await s.slow(6);
    await c.tap("Q", 60); await settle(2);
    const flying = await pending(); // 飛んでいる間は確定待ち(まだ消費しない)
    await s.slow(1);
    await wait(`!${API}.isPending()`, 12000);
    await settle(10);
    const r = await last();
    const state = { pile: await pile(), hand: await json("ProjectRCardDeck.getBattleState().hand.length"), events: await volleyEvents(), dealt: await lost(4), summons: await json("ProjectRGodSummonManager.getActiveSummons().length") };
    await s.aim(4, 0);
    await s.slow(6);
    await c.tap("Q", 60); await settle(2);
    const again = await pending();
    await s.slow(1);
    await wait(`!${API}.isPending()`, 12000);
    await settle(10);
    rec("V3 miss", flying && r.reason === "missed" && r.consumed === false && state.pile === 0 && state.hand === 5 && state.events === 0 && state.dealt === 0 && state.summons === 0 && again !== null && (await lost(4)) === 50,
      JSON.stringify({ flying, r, state, again: !!again }).slice(0, 600));
  });

  await check("V4 重複防止(実キー連打): 確定待ちの間にQ/E/X/C/Vを連打しても矢は増えず(Lv1=3本)、消費は命中の1回だけ・ダメージは50", async () => {
    await scene(1, [15, 15]);
    await s.slow(10);
    await c.tap("Q", 40); await settle(1);
    for (const k of ["Q", "E", "X", "C", "V", "Q", "Q"]) { await c.tap(k, 30); }
    await settle(1);
    const count = await volleyEvents(), pend = await pending();
    await s.slow(1); await settle(60);
    const result = { count, pendingWas: !!pend, lost: await lost(4), pile: await pile(), events: await volleyEvents() };
    rec("V4 duplicate", count === 3 && result.pendingWas && result.lost === 50 && result.pile === 1 && result.events === 0, JSON.stringify(result));
  });

  await check("V5 Lv2(実キー): 5本・間隔15度・中央の太い矢。命中で50、続けて5秒間で計100のスリップ(20 x 5回)。最終的に1000→850", async () => {
    await scene(2);
    await s.slow(4);
    await c.tap("Q", 60); await settle(2);
    const a = await arrows();
    const thick = a.filter(x => x.thick).length, widths = a.map(x => x.width).sort();
    await s.shot("v5_lv2_flight");
    await settle(6); await s.shot("v5_lv2_flight_later");
    await settle(44); await s.slow(1); await settle(10);
    const hit = await lost(4), slip = await json(`${API}.getActiveSlips()`);
    await sleep(5600); await settle(5);
    const final = await lost(4), slipEnd = await json(`${API}.getActiveSlips().length`);
    rec("V5 Lv2 slip", a.length === 5 && thick === 1 && widths[0] === 0.3 && widths[4] === 0.9 && hit - (slip.length ? slip[0].dealt : 0) === 50 && slip.length === 1 && JSON.stringify(slip[0].ticks) === "[20,20,20,20,20]" && final === 150 && slipEnd === 0, JSON.stringify({ n: a.length, thick, widths, hit, slip, final, slipEnd }));
  });

  await check("V6 壁: 敵の手前にRegion 255の壁があると矢は通り抜けず、敵は無傷でカードも消費しない。壁を外すと同じ位置で命中する", async () => {
    await scene(2, [14, 15]);
    await wall(11, [11, 12, 13, 14, 15, 16, 17, 18, 19]);
    await c.tap("Q", 60); await settle(5);
    await wait(`!${API}.isPending()`, 12000); await settle(10);
    const blocked = { dealt: await lost(4), pile: await pile(), r: await last(), events: await volleyEvents() };
    const restored = await unwall();
    await c.tap("Q", 60); await settle(5);
    await wait(`!${API}.isPending()`, 12000); await settle(10);
    const open = { dealt: await lost(4), pile: await pile() };
    rec("V6 wall", blocked.dealt === 0 && blocked.pile === 0 && blocked.r.reason === "missed" && blocked.events === 0 && restored === 9 && open.dealt >= 50 && open.pile === 1, JSON.stringify({ blocked, restored, open }).slice(0, 600));
  });

  await check("V7 演出(実機): Apolloが現れて弓を振る・主人公がArmExtend・通常カットイン・発射の閃光VFX・光の粒子。終わると全部片付く(Event・VFX・カットイン)", async () => {
    await scene(1);
    await ev("window.__log = { vfx: [], act: [], cut: [] }; (function() { var p = ProjectRPresentationVfx.play; ProjectRPresentationVfx.play = function(k, ctx) { window.__log.vfx.push(k); return p.apply(this, arguments); };" +
      " var r = ProjectRCharacterPresentation.request; ProjectRCharacterPresentation.request = function(n, o) { window.__log.act.push(n); return r.apply(this, arguments); };" +
      " var sh = ProjectRCutIn.show; ProjectRCutIn.show = function(o) { window.__log.cut.push(o && o.cardId); return sh.apply(this, arguments); }; })(); 'spy'");
    await s.slow(4);
    await c.tap("Q", 60); await settle(8);
    const during = await json(`({ log: window.__log, visuals: ProjectRGodSummonVisual.getVisuals(), cut: ProjectRCutIn.getActive().map(function(e) { return e.cardId; }), vfx: ProjectRPresentationVfx.diagnostics(), act: ProjectRCharacterPresentation.current() })`);
    await s.shot("v7_present");
    await settle(30); await s.shot("v7_present_later");
    await settle(150); await s.slow(1); await settle(60);
    const gone = await json(`({ visuals: ProjectRGodSummonVisual.getVisuals().length, cut: ProjectRCutIn.getActive().length, events: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length, pending: ${API}.isPending(), summons: ProjectRGodSummonManager.getActiveSummons().length })`);
    rec("V7 presentation", during.log.vfx.indexOf("apollo_volley.burst") === 0 && during.log.act.indexOf("ArmExtend") >= 0 && during.log.cut.length === 1 && during.log.cut[0] === CARD
      && during.visuals.some(v => v.godId === "apollo") && during.cut.indexOf(CARD) >= 0 && gone.events === 0 && gone.cut === 0 && gone.pending === false && gone.summons === 0, JSON.stringify({ during, gone }).slice(0, 800));
  });

  await check("V8 戦闘終了で矢・確定待ち・スリップが片付く / 旧Apollo「黄金の弓矢」の実装は共存して不変", async () => {
    await scene(2);
    await s.slow(6);
    await c.tap("Q", 60); await settle(3);
    const before = await json(`({ events: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length, pending: ${API}.isPending() })`);
    await ev("ProjectRCombatTestArena.endTest(); 'end'"); await settle(8); await s.slow(1);
    const after = await json(`({ events: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length, pending: ${API}.isPending(), slips: ${API}.getActiveSlips().length, active: ProjectRCardDeck.isCardBattleActive() })`);
    const legacy = await json("ProjectRApolloGoldenArrow.getActiveProjectiles().length");
    rec("V8 cleanup", before.events === 5 && before.pending === true && after.events === 0 && after.pending === false && after.slips === 0 && after.active === false && legacy === 0, JSON.stringify({ before, after, legacy }));
  });

  await check("V9 セーブ内容: 発射・命中・スリップの前後でセーブ内容(makeSaveContents)が変わらない。矢・確定待ちはセーブに入らない", async () => {
    await scene(2);
    const a = await ev("JSON.stringify(DataManager.makeSaveContents())");
    await s.slow(4); await c.tap("Q", 60); await settle(50); await s.slow(1); await settle(20);
    const b = await ev("JSON.stringify(DataManager.makeSaveContents())");
    const keys = ["ProjectRApolloGoldenVolley", "pendingVolley", "getActiveArrows", "slip"].filter(k => b.indexOf(k) >= 0);
    // 戦闘中の変化(手札・山札・Cooldown・敵HP・位置)は戦闘の通常の状態。永続の所持・デッキ・Levelだけを比べる。
    const persistent = await json("ProjectRCardDeck.getPersistentData()");
    rec("V9 save", keys.length === 0 && persistent.cardOwnership["apollo_golden_volley"] && persistent.cardOwnership["apollo_golden_volley"].owned === true, JSON.stringify({ keys, owned: persistent.cardOwnership["apollo_golden_volley"], same: a.length === b.length }));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a4_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
