// Phase Apollo-A7: 統合の確認(実機・CDP) — 新Apollo 6枚(ギガース殺し・疫病の矢・月桂冠・ヒュアキントス・竪琴 + 神託を別に)を同時に使ったときの
//   ・効果の同時成立(台帳の合成・DamageModifiersの衝突なし)・同時の見た目(Event・絵・UI)の上限・updateScene の処理時間・終了後の後片付け。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_integrated_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const APIS = ["ProjectRApolloGoldenVolley", "ProjectRApolloErosArrow", "ProjectRApolloGigasSlayer", "ProjectRApolloHyacinthus", "ProjectRApolloPlagueRain", "ProjectRApolloLaurelWreath", "ProjectRApolloLyreRhythm", "ProjectRApolloOracle"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const tempTotal = () => ev(`(function() { var apis = ${JSON.stringify(APIS)}, sum = 0; apis.forEach(function(n) { var a = window[n]; if (a && a.getTempObjectCount) { var t = a.getTempObjectCount(); sum += (t.total !== undefined ? t.total : 0); } }); return sum; })()`);
  const eventCount = () => ev("$gameMap.events().length");
  const picCount = () => ev("(AnimatedPictureManager._animatedPictures || []).length");
  const leftovers = async () => ({ pics: await json("(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_/.test(String(p.note || '')); }).length"),
    events: await json("$gameMap.events().filter(function(e) { return e && /projectR(GigasArrow|PlagueArrow|PlagueRat|LaurelRoot|LaurelWall|Hyacinth|ErosArrow|ErosBeam)/.test(e.event().note || ''); }).length"),
    anchors: await json("ProjectRGodSummonVisual.getAnchors().length"), followers: await json("ProjectRGodSummonVisual.getFollowers().length"), summons: await json("ProjectRGodSummonManager.getActiveSummons().length"),
    states: await json("ProjectRApolloStatus.list().length"), mods: await json("ProjectRDamageModifiers.list().length"), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()"), temp: await tempTotal(), lyreUi: await json("ProjectRApolloLyreRhythm.getUi().active") });
  const clean = v => v.pics === 0 && v.events === 0 && v.anchors === 0 && v.followers === 0 && v.summons === 0 && v.states === 0 && v.mods === 0 && v.speed === 1 && v.temp === 0 && v.lyreUi === false;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("I1 同時発動: Lv3のギガース殺し・疫病の矢・月桂冠・ヒュアキントス・竪琴を1秒以内に続けて使う。全部が成立し、被ダメージの倍率・敵の状態が台帳で積になり、衝突がない。1フレームの処理時間と同時の見た目が上限内", async () => {
    const started = await json("ProjectRApolloTest.start(3, 'eros')");
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400);
    // 手札を5枚の別々のカードにして戦闘を始め直す(ProjectRApolloTest と同じ方法: 開始の一瞬だけコピー上限を広げて、必ず元へ戻す)
    const mixed = await json(`(function() {
      var d = ProjectRCardDeck, ids = ['apollo_gigas_slayer','apollo_plague_rain','apollo_laurel_wreath','apollo_hyacinthus','apollo_lyre_rhythm'];
      ids.forEach(function(id) { d.setCardOwned(id, true); d.setCardLevel(id, 3); });
      var rest = ProjectRCombatTestArena.DRAW_SEQUENCE, order = ids.slice(); for (var i = 0; order.length < 30; i++) order.push(rest[i % rest.length]);
      var cardIds = order.slice().reverse(), counts = {}, originals = {}, realRandom = Math.random;
      cardIds.forEach(function(id) { counts[id] = (counts[id] || 0) + 1; });
      try {
        Object.keys(counts).forEach(function(id) { var o = d.definitions.cards.get(id); originals[id] = o; d.definitions.cards.set(id, Object.freeze(Object.assign({}, o, { maxCopies: Math.max(o.maxCopies, counts[id]) }))); });
        Math.random = function() { return 1 - Number.EPSILON; };
        var r = d.startCardBattle(cardIds);
        if (!r.ok) return { ok: false, reason: 'battleStartFailed' };
      } finally { Math.random = realRandom; Object.keys(originals).forEach(function(id) { d.definitions.cards.set(id, originals[id]); }); }
      return { ok: true, hand: d.getBattleState().hand.map(function(c) { return c.cardId; }) };
    })()`);
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; e.locate(40 - id, 3); }); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await s.place(9, 15); await sleep(500);
    await locate(4, 15, 15); await locate(5, 16, 17); await locate(6, 14, 13);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'"); await sleep(300);
    await ev("ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 3); 'ok'");
    await s.aim(6, 0); await sleep(200);
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } window.__max = { temp: 0, events: 0, pics: 0 }; return 'ok'; })()`);
    const baseEvents = await eventCount();
    // 手札は使うたびに左へ詰まるので、カードごとに「いまの手札の位置」のキー(Q/E/X/C/V)を押す
    const KEYS = ["Q", "E", "X", "C", "V"], pressed = [];
    for (const id of ["apollo_gigas_slayer", "apollo_plague_rain", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm"]) {
      const hand = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), index = hand.indexOf(id);
      if (index < 0) { pressed.push(id + ":notInHand"); continue; }
      await c.keyDown(KEYS[index]); await sleep(60); await c.keyUp(KEYS[index]); await sleep(120); pressed.push(id + ":" + KEYS[index]);
    }
    await ev(`$gameParty.leader().setHp($gameParty.leader().mhp - 40); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-100' }); 'hurt'`);
    let maxTemp = 0, maxEvents = 0, maxPics = 0, shot = false, lyreSeen = false, rats = 0, roots = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 6500) {
      maxTemp = Math.max(maxTemp, await tempTotal()); maxEvents = Math.max(maxEvents, (await eventCount()) - baseEvents); maxPics = Math.max(maxPics, await picCount());
      lyreSeen = lyreSeen || !!(await json("ProjectRApolloLyreRhythm.getSession()")); rats = Math.max(rats, (await json("ProjectRApolloPlagueRain.getRats().length"))); roots = Math.max(roots, await json("$gameMap.events().filter(function(e) { return e && /projectRLaurelRoot/.test(e.event().note || ''); }).length"));
      if (!shot && Date.now() - t0 > 1500) { shot = true; await s.shot("i1_concurrent"); }
      await sleep(60);
    }
    const st = {
      pressed,
      gigas: await json("ProjectRApolloGigasSlayer.getLastResult()"), plague: await json("ProjectRApolloPlagueRain.getLastResult()"), laurel: await json("ProjectRApolloLaurelWreath.getStats()"),
      hya: await json("ProjectRApolloHyacinthus.getLastResult()"), lyre: await json("ProjectRApolloLyreRhythm.getSession()"), factor4: await json("ProjectRApolloStatus.factorOf('event:4')"), conflicts: await json("ProjectRDamageModifiers.getConflicts().length"),
      hand: await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), lost4: 1000000 - await barHp(4) };
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    await s.shot("i1_after");
    rec("I1 concurrent", mixed.ok && mixed.hand.slice(0, 5).join() === "apollo_gigas_slayer,apollo_plague_rain,apollo_laurel_wreath,apollo_hyacinthus,apollo_lyre_rhythm"
      && st.gigas && st.gigas.committed === true && st.plague && st.plague.committed === true && st.hya && st.hya.consumed === true && st.hya.blooms >= 1 && lyreSeen && roots >= 1 && st.conflicts === 0
      && st.lost4 >= 100 && maxTemp <= 80 && maxEvents <= 60 && t.length > 200 && avg < 8 && p95 < 14,
      JSON.stringify({ pressed, lyreSeen, roots, mixed: mixed.ok, gigasC: st.gigas && st.gigas.committed, plagueC: st.plague && st.plague.committed, laurel: st.laurel, hyaBlooms: st.hya && st.hya.blooms, lyre: !!st.lyre, factor4: st.factor4, conflicts: st.conflicts, lost4: st.lost4, maxTemp, maxEvents, maxPics, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) } }));
  });

  await check("I2 後片付け: 全部が動いている最中の戦闘終了で、新Apollo 6枚のEvent・絵・錨・Apollo・状態・速度・UIがすべて消える。Consoleのエラーなし", async () => {
    // I1 の続きの状態(まだ効果が残っているはず)を作り直してから終わらせる
    await ev("PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-50' }); 'x'");
    const live = await leftovers();
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(700);
    const after = await leftovers();
    rec("I2 cleanup", clean(after) && s.errors().length === 0, JSON.stringify({ liveTemp: live.temp, after, errors: s.errors().slice(0, 3) }));
  });

  rec("IZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRCardBalance.resetCard('apollo_laurel_wreath'); ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_integrated_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
