// Phase Apollo-A7: 実機(Playtest)の確認 — 疫病の矢 Lv1〜3。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_plague_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_plague_rain", API = "ProjectRApolloPlagueRain", GV = "ProjectRGodSummonVisual", ST = "ProjectRApolloStatus";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000000 - await barHp(id);
  const aimAt = (x, y) => s.aim(x - 9, y - 15);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = () => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length : 0; })()");
  const evCount = re => json(`$gameMap.events().filter(function(e) { return e && ${re}.test(e.event().note || ''); }).length`);
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const shots = () => json(`${API}.getShots()`);
  const idle = async (ms = 20000) => wait(`${API}.getShots().length === 0`, ms);
  const committed = async (ms = 8000) => wait(`${API}.getLastResult() && ${API}.getLastResult().committed === true`, ms);
  const leftovers = async () => ({ arrows: await evCount("/projectRPlagueArrow/"), rats: await evCount("/projectRPlagueRat/"), pics: await pics("/apollo_plague/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    summons: await json("ProjectRGodSummonManager.getActiveSummons().length"), shots: (await shots()).length, states: await json(`${ST}.list().length`), mods: await json("ProjectRDamageModifiers.list().length") });
  const clean = v => v.arrows === 0 && v.rats === 0 && v.followers === 0 && v.anchors === 0 && v.summons === 0 && v.shots === 0 && v.states === 0 && v.mods === 0;
  const scene = async (enemies = {}, level = 1, kind = "plague", slow = 1) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(slow); await random(0.9);
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("P0 boot: 疫病の矢の登録(強力・最大4枚・Cooldown 5・direction・maxLevel 3)・Lv別の数値・VFXキー/ライブラリ/素材・Map002の矢とネズミのPrefab", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3),
      templates: ['ProjectR Apollo Plague Arrow', 'ProjectR Apollo Plague Rat'].map(function(n) { return !!$dataTemplateMap.events.find(function(e) { return e && e.name === n; }); }),
      keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_plague/.test(k); }).sort(), status: ProjectRCardCatalog.godStatus('apollo'),
      fields: ['circleSeconds','plagueStateSeconds','plagueAttackRate','plagueDamageTaken','plagueWeaknessRate','ratCount','ratDamage','splitCount','splitRadiusTiles'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }), legacy: ProjectRCardDeck.definitions.card('apollo_plague_attack').maxCopies })`);
    const libs = ["ProjectR_A7_Plague_Circle", "ProjectR_A7_Plague_Impact"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = ["img/characters/VFX/$ProjectR_PlagueArrow.png", "img/characters/VFX/$ProjectR_Rat.png", ...libs.map(n => `img/pictures/Animation/${n}.png`)].every(f => fs.existsSync(f));
    const d = v.def;
    rec("P0 boot", d.maxCopies === 4 && d.cooldownSeconds === 5 && d.maxLevel === 3 && d.rarity === "strong" && d.targetType === "direction" && v.c1.damage === 100 && v.c1.radius === 4 && v.c2.ratCount === 3 && v.c3.splitCount === 4
      && v.templates.every(Boolean) && v.keys.length === 2 && v.fields && v.legacy === 2 && lib === true && files && v.status.implemented >= 5, JSON.stringify({ ...v, lib, files }).slice(0, 500));
  });

  await check("P1 Lv1(実マウス+実キーQ): 矢が飛び(未消費)、敵に直撃100ダメージ。着弾地点に半径4マスの病のサークル。範囲内の敵だけに病(x0.9/x1.05/x1.03)", async () => {
    await scene({ 4: [15, 15], 5: [17, 17], 6: [15, 22] }, 1, "plague", 3);
    await aimAt(15, 15); await sleep(200);
    const before = await hand();
    await fireTap(); await sleep(150);
    const early = { pile: await pile(), hand: await hand(), pending: await json(`${API}.isPending()`), arrows: await evCount("/projectRPlagueArrow/") };
    await s.shot("p1_flight");
    await committed();
    await sleep(500);
    await s.slow(1);
    const circ = await json(`${API}.getCircles()`);
    const last = await json(`${API}.getLastResult()`);
    await s.shot("p1_circle");
    const f4 = await json(`${ST}.factorOf('event:4')`), f5 = await json(`${ST}.factorOf('event:5')`);
    rec("P1 lv1", early.pile === 0 && JSON.stringify(early.hand) === JSON.stringify(before) && early.pending === true && early.arrows === 1 && last.committed === true && last.direct === 1 && (await lost(4)) === 100 && (await lost(6)) === 0
      && (await pile()) === 1 && circ.length === 1 && circ[0].radius === 4 && circ[0].hasVisual && JSON.stringify(circ[0].infected) === JSON.stringify([4, 5]) && Math.abs(f4.damageTaken - 1.05) < 1e-9 && Math.abs(f4.weakness - 1.03) < 1e-9 && Math.abs(f4.attackRate - 0.9) < 1e-9
      && Math.abs(f5.damageTaken - 1.05) < 1e-9 && (await json(`${ST}.has('event:6', 'plague')`)) === false, JSON.stringify({ early: { pile: early.pile, arrows: early.arrows }, last: { direct: last.direct, inf: last.infected }, lost4: await lost(4), circ: circ.length }));
  });

  await check("P2 サークルの寿命と病(実機): 5秒でサークルの絵・錨が消え、病は出て3秒で切れる。外れ(半径内に敵なし)は非消費・サークルの絵も残らない。飛行中の再発動は plaguePending。壁を越える", async () => {
    await scene({ 4: [15, 15] }, 1);
    await aimAt(15, 15); await sleep(200);
    await fireTap(); await committed(); await sleep(300);
    const mid = { pics: await pics("/apollo_plague/"), circles: (await json(`${API}.getCircles()`)).length, state: await json(`${ST}.has('event:4', 'plague')`) };
    await wait(`${API}.getCircles().length === 0`, 9000); await sleep(300);
    const afterCircle = { pics: await pics("/apollo_plague/"), anchors: await json(`${GV}.getAnchors().length`), state: await json(`${ST}.has('event:4', 'plague')`) };
    await sleep(3400);
    const afterState = await json(`${ST}.has('event:4', 'plague')`);
    // 外れ + 重複
    await scene({ 4: [25, 20] }, 1);
    await aimAt(15, 15); await sleep(200);
    const before = await hand();
    await fireTap(); await sleep(100);
    const dup = await json("ProjectRCardDeck.requestUseCard(1)");
    await idle();
    const last = await json(`${API}.getLastResult()`);
    const miss = { reason: last.reason, pile: await pile(), same: JSON.stringify(await hand()) === JSON.stringify(before), dup: dup.detail, left: await leftovers() };
    // 壁越え
    await scene({ 4: [16, 15] }, 1);
    const ys = []; for (let y = 10; y <= 20; y++) ys.push(y);
    const setWall = v => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(ys)}.forEach(function(y) { m.data[5 * size + y * m.width + 12] = ${v}; }); return 'wall'; })()`);
    await setWall(255);
    await aimAt(16, 15); await sleep(200);
    await fireTap(); await committed(); await sleep(200);
    const wallLost = await lost(4);
    await setWall(0);
    rec("P2 lifetime-miss-wall", mid.pics >= 1 && mid.circles === 1 && mid.state === true && afterCircle.pics === 0 && afterCircle.anchors === 0 && afterCircle.state === true && afterState === false
      && miss.reason === "missed" && miss.pile === 0 && miss.same && miss.dup === "plaguePending" && clean(miss.left) && wallLost === 100, JSON.stringify({ mid, afterCircle, afterState, miss: { ...miss, left: undefined }, leftClean: clean(miss.left), wallLost }));
  });

  await check("P3 Lv2(実機): ネズミ3匹がサークルの敵へ向かい、1秒に1回(53 = 50 x 病1.05)攻撃。見た目のEvent。サークルが消えると消える", async () => {
    await scene({ 4: [15, 15], 5: [16, 18] }, 2);
    await aimAt(15, 15); await sleep(200);
    await fireTap(); await committed(); await sleep(400);
    const rats = await json(`${API}.getRats()`), ev0 = await evCount("/projectRPlagueRat/");
    await s.shot("p3_rats");
    const a0 = rats.reduce((x, r) => x + r.attacks, 0), l0 = (await lost(4)) + (await lost(5));
    await sleep(2100);
    const rats1 = await json(`${API}.getRats()`), a1 = rats1.reduce((x, r) => x + r.attacks, 0), l1 = (await lost(4)) + (await lost(5));
    await wait(`${API}.getShots().length === 0`, 9000); await sleep(3600); // サークルが消えたあと、病は3秒で切れる
    const end = await leftovers();
    rec("P3 lv2-rats", rats.length === 3 && ev0 === 3 && a1 - a0 >= 4 && a1 - a0 <= 8 && l1 - l0 === (a1 - a0) * 53 && clean(end) && end.rats === 0, JSON.stringify({ n: rats.length, ev0, attacks: a1 - a0, dmg: l1 - l0, end }));
  });

  await check("P4 Lv3(実機): メインの着弾から4本に分裂してばらけて着弾。サークル最大5つ。分裂した矢だけが敵を捉えた場合も確定。同時の見た目は上限内", async () => {
    await scene({ 4: [15, 15] }, 3);
    await ev("Math.random = window.__r0; 'real random'"); // 分裂の散らばりは本物の乱数で
    await aimAt(15, 15); await sleep(200);
    await fireTap();
    let maxTemp = 0, shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await shots()).length) { const t = (await json(`${API}.getTempObjectCount()`)).total; maxTemp = Math.max(maxTemp, t); if (!shot && (await json(`${API}.getCircles().length`)) >= 3) { shot = true; await s.shot("p4_split"); } await sleep(40); }
    const last = await json(`${API}.getLastResult()`);
    const kinds = (last.landings || []).map(l => l.kind);
    const spread = new Set((last.landings || []).slice(1).map(l => Math.round(l.heading))).size; // 分裂した矢の向きがばらける(敵に当たると着弾位置は近くに集まるため、向きで見る)
    // 分裂だけが敵に届く配置: メインの着弾点(右6マス)から約8マス先
    await scene({ 4: [23, 15] }, 3);
    await ev("Math.random = (function() { var s = [0.25, 0.9999]; var i = 0; return function() { return s[i++ % 2]; }; })(); 'seq'");
    await aimAt(15, 15); await sleep(200);
    await fireTap(); await sleep(80);
    const early = await pile();
    await idle(15000);
    const last2 = await json(`${API}.getLastResult()`);
    rec("P4 lv3-split", last.committed === true && kinds.length === 5 && kinds[0] === "main" && kinds.slice(1).every(k => k === "fragment") && spread >= 3 && maxTemp <= 40 && early === 0 && last2.committed === true && (last2.landings || []).some(l => l.kind === "fragment" && l.inside.includes(4)), // 確定は committed で見る(カードはCooldownが明けると山札へ戻るため、待ち時間で pile は変わる)
      JSON.stringify({ c1: last.committed, pile: await pile(), kinds, spread, maxTemp, early, c2: last2.committed, frag: last2 && last2.landings && last2.landings.map(l => l.kind + ":" + l.inside.join("/")) }));
  });

  await check("P5 取消と後片付け(実機): 飛行中・サークル中・ネズミ中の戦闘終了で、矢・ネズミ・サークルの絵・錨・病が全部消える。敵が消えても例外なし。frame処理時間", async () => {
    const out = [];
    for (const [level, wantMs] of [[1, 150], [3, 1200], [2, 1500]]) {
      await scene({ 4: [15, 15] }, level);
      await aimAt(15, 15); await sleep(200);
      await fireTap(); await sleep(wantMs);
      const live = { shots: (await shots()).length, arrows: await evCount("/projectRPlagueArrow/"), rats: await evCount("/projectRPlagueRat/"), pics: await pics("/apollo_plague/") };
      await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
      out.push({ level, live, after: await leftovers() });
    }
    await scene({ 4: [20, 15] }, 1);
    await aimAt(20, 15); await sleep(200);
    await fireTap(); await sleep(150);
    await ev("$gameMap.event(4).erase(); 'erased'");
    await idle();
    const erased = { reason: (await json(`${API}.getLastResult()`)).reason, left: await leftovers(), pile: await pile() };
    // 性能(Lv3 + サークル + ネズミ)
    await scene({ 4: [15, 15], 5: [16, 18], 6: [13, 17] }, 3);
    await aimAt(15, 15); await sleep(200);
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await fireTap(); await sleep(4000);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("P5 cleanup-perf", out.every(o => clean(o.after) && o.after.pics === 0) && out[0].live.arrows === 1 && out[2].live.rats >= 1 && erased.reason === "missed" && clean(erased.left) && erased.pile === 0 && t.length > 100 && avg < 8 && p95 < 14 && s.errors().length === 0,
      JSON.stringify({ live: out.map(o => o.live), erased: erased.reason, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("P6 退行なし(実機): ヒュアキントス(被弾100→10)・ギガース殺し(100ダメージ)・黄金の矢は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene({}, 1, "hyacinthus");
    await fireTap(); await sleep(250);
    const drop = await ev(`(function() { var a = $gameParty.leader(), b = a.hp; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-100' }); return b - a.hp; })()`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene({ 4: [15, 15] }, 1, "gigas");
    await aimAt(15, 15); await sleep(200);
    await fireTap(); await wait("ProjectRApolloGigasSlayer.getLastResult() && ProjectRApolloGigasSlayer.getLastResult().committed === true", 8000); await sleep(600);
    const gigas = await lost(4);
    rec("P6 unchanged", drop === 10 && gigas === 100, JSON.stringify({ drop, gigas }));
  });

  rec("PZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_plague_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
