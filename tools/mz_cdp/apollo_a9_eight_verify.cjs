// Phase Apollo-A9: 実機(Playtest)の確認 — Apollo 8枚(黄金の矢・エロスの矢・ギガース殺し・ヒュアキントス・疫病の矢・月桂冠・竪琴・神託)のLv3を、
//   続けて(手札に来た順に、実キー)全部使う。効果の同時成立・一時Event/絵の上限・updateScene の処理時間・DamageModifiersの衝突なし・戦闘終了での後片付けを確かめる。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a9_eight_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const APIS = ["ProjectRApolloGoldenVolley", "ProjectRApolloErosArrow", "ProjectRApolloGigasSlayer", "ProjectRApolloHyacinthus", "ProjectRApolloPlagueRain", "ProjectRApolloLaurelWreath", "ProjectRApolloLyreRhythm", "ProjectRApolloOracle"];
const ORDER = ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm", "apollo_gigas_slayer", "apollo_plague_rain", "apollo_golden_volley", "apollo_eros_arrow"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 600)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const tempTotal = () => ev(`(function() { var apis = ${JSON.stringify(APIS)}, sum = 0; apis.forEach(function(n) { var a = window[n]; if (a && a.getTempObjectCount) { var t = a.getTempObjectCount(); sum += (t.total !== undefined ? t.total : 0); } }); return sum; })()`);
  const NOTES = "projectR(GoldenVolley|ErosArrow|ErosBeam|GigasArrow|PlagueArrow|PlagueRat|LaurelRoot|LaurelWall|Hyacinth)";
  const apolloEvents = () => ev(`$gameMap.events().filter(function(e) { return e && /${NOTES}/.test(e.event().note || ''); }).length`);
  const leftovers = async () => ({ pics: await json("(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_/.test(String(p.note || '')); }).length"),
    events: await apolloEvents(), anchors: await json("ProjectRGodSummonVisual.getAnchors().length"), followers: await json("ProjectRGodSummonVisual.getFollowers().length"), summons: await json("ProjectRGodSummonManager.getActiveSummons().length"),
    states: await json("ProjectRApolloStatus.list().length"), mods: await json("ProjectRDamageModifiers.list().length"), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()"), temp: await tempTotal(), lyreUi: await json("ProjectRApolloLyreRhythm.getUi().active"),
    oracle: await json("ProjectRApolloOracle.getState()"), bonus: await json("ProjectRCardModifiers.getWeaponHitBonus()") });
  const clean = v => v.pics === 0 && v.events === 0 && v.anchors === 0 && v.followers === 0 && v.summons === 0 && v.states === 0 && v.mods === 0 && v.speed === 1 && v.temp === 0 && v.lyreUi === false && v.oracle === null && v.bonus === null;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("E1 8枚(Lv3)を手札に来た順に実キーで全部使う。全部が使え、台帳・DamageModifiersの衝突なし、一時Event/絵が上限以内、処理時間が許容内", async () => {
    const started = await json("ProjectRApolloTest.start(3, 'eros')");
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400);
    const mixed = await json(`(function() {
      var d = ProjectRCardDeck, ids = ${JSON.stringify(ORDER)};
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
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    const KEYS = ["Q", "E", "X", "C", "V"], pressed = [];
    let maxTemp = 0, maxEvents = 0, maxPics = 0;
    const sample = async () => { maxTemp = Math.max(maxTemp, await tempTotal()); maxEvents = Math.max(maxEvents, await apolloEvents()); maxPics = Math.max(maxPics, await json("(AnimatedPictureManager._animatedPictures || []).length")); };
    for (const id of ORDER) {
      let index = -1; const t0 = Date.now();
      while (Date.now() - t0 < 20000) { const hand = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"); index = hand.indexOf(id); if (index >= 0) break; await sample(); await sleep(60); }
      if (index < 0) { pressed.push(id + ":never"); continue; }
      await s.aim(6, 0);
      await c.keyDown(KEYS[index]); await sleep(60); await c.keyUp(KEYS[index]); await sleep(150); pressed.push(id + ":" + KEYS[index]);
      await sample();
    }
    const t1 = Date.now(); let shot = false;
    while (Date.now() - t1 < 5000) { await sample(); if (!shot && Date.now() - t1 > 1500) { shot = true; await s.shot("e1_eight"); } await sleep(60); }
    const st = { conflicts: await json("ProjectRDamageModifiers.getConflicts().length"), factor4: await json("ProjectRApolloStatus.factorOf('event:4')"), lost4: 1000000 - await barHp(4),
      gigas: await json("ProjectRApolloGigasSlayer.getLastResult()"), plague: await json("ProjectRApolloPlagueRain.getLastResult()"), hya: await json("ProjectRApolloHyacinthus.getLastResult()"),
      golden: await json("ProjectRApolloGoldenVolley.getLastResult()"), eros: await json("ProjectRApolloErosArrow.getLastResult()"), laurel: await json("ProjectRApolloLaurelWreath.getStats()"),
      lyre: await json("ProjectRApolloLyreRhythm.getLastResult()"), oracle: await json("ProjectRApolloOracle.getLastResult()") };
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    const allUsed = pressed.every(p => !/never/.test(p));
    rec("E1 eight", mixed.ok && allUsed && pressed.length === 8 && st.conflicts === 0 && st.lost4 >= 100 && maxTemp <= 200 && maxEvents <= 200 && t.length > 400 && avg < 10 && p95 < 18,
      JSON.stringify({ pressed, mixed: mixed.ok, conflicts: st.conflicts, lost4: st.lost4, factor4: st.factor4, results: { gigas: st.gigas && st.gigas.committed, plague: st.plague && st.plague.committed, hya: st.hya && st.hya.consumed, golden: st.golden && [st.golden.ok, st.golden.reason], eros: st.eros && [st.eros.ok, st.eros.reason], lyre: st.lyre && st.lyre.ok, oracle: st.oracle && st.oracle.ok }, laurel: st.laurel, maxTemp, maxEvents, maxPics, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) } }));
  });

  await check("E2 後片付け: 全部が動いている最中の戦闘終了で、8枚のEvent・絵・錨・Apollo・状態・速度・UI・予告線がすべて消える", async () => {
    const live = await leftovers();
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(900);
    const after = await leftovers();
    rec("E2 cleanup", clean(after), JSON.stringify({ liveTemp: live.temp, liveEvents: live.events, after }));
  });

  rec("EZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRCardBalance.resetCard('apollo_laurel_wreath'); ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a9_eight_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
