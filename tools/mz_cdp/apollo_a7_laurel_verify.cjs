// Phase Apollo-A7: 実機(Playtest)の確認 — 月桂冠 Lv1〜3。実キー(CDP。カードはQ、移動はD)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_laurel_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・仲間(PartyCombat)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   被弾はHendrixの公式コマンド(UpdatePlayerHp)。敵の遠距離攻撃は現行の本番データに無いため、敵が撃った弾に見立てたEvent(_inheritedEnemyName付き)で確かめる。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_laurel_wreath", API = "ProjectRApolloLaurelWreath", GV = "ProjectRGodSummonVisual", ST = "ProjectRApolloStatus";
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
  const lost = async id => 1000000 - await barHp(id);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = () => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length : 0; })()");
  const evCount = re => json(`$gameMap.events().filter(function(e) { return e && ${re}.test(e.event().note || ''); }).length`);
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const hp = () => ev("$gameParty.leader().hp");
  const setHp = v => ev(`$gameParty.leader().setHp(${v}); $gameParty.leader().hp`);
  const hurtDrop = n => ev(`(function() { var a = $gameParty.leader(), b = a.hp; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-${n}' }); return b - a.hp; })()`);
  const noGrow = () => ev("ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 0).ok");
  const reset = () => ev("ProjectRCardBalance.resetCard('apollo_laurel_wreath'); 'reset'");
  const leftovers = async () => ({ roots: await evCount("/projectRLaurelRoot/"), walls: await evCount("/projectRLaurelWall/"), pics: await pics("/apollo_laurel/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    patches: await json(`${API}.getPatches().length`), mods: await json("ProjectRDamageModifiers.list().length"), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()") });
  const clean = v => v.roots === 0 && v.walls === 0 && v.followers === 0 && v.anchors === 0 && v.patches === 0 && v.mods === 0 && v.speed === 1;
  const scene = async (level, enemies = {}, kind = "laurel") => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); ProjectRCardBalance.resetCard('apollo_laurel_wreath'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); $gameParty.leader().setHp($gameParty.leader().mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const spawnProjectile = (x, y) => ev(`(function() { var m = $gameMap, tpl = $dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Plague Arrow'; }); var id = m.spawnEvent(tpl.id, ${x} - 0.5, ${y} - 0.5, false); var e = m.event(id); e._inheritedEnemyName = 'Slime'; return id; })()`);
  const projectileAlive = id => ev(`(function() { var e = $gameMap.event(${id}); return !!e && !e._erased; })()`);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("L0 boot: 月桂冠の登録(強力・最大3枚・Cooldown 8・instant・maxLevel 3)・Lv別の数値・VFXキー/ライブラリ/素材・Map002の根と壁のPrefab・弱点のmode", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3),
      templates: ['ProjectR Apollo Laurel Root', 'ProjectR Apollo Laurel Wall'].map(function(n) { return !!$dataTemplateMap.events.find(function(e) { return e && e.name === n; }); }),
      keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_laurel/.test(k); }).sort(), status: ProjectRCardCatalog.godStatus('apollo'),
      fields: ['rootSeconds','growSeconds','laurelHealPerSecond','laurelDamageTaken','laurelWeaknessScale','thornDamagePerSecond','wallSeconds','projectileWall'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }),
      mode: (function() { ProjectRApolloStatus.apply('player', 't', { seconds: 1, weakness: 0.1, weaknessMode: 'excessScale' }); var r = ProjectRDamageModifiers.weaknessAdjust(2, 'player'); ProjectRApolloStatus.remove('player', 't'); return r; })() })`);
    const libs = ["ProjectR_A7_Laurel_Zone", "ProjectR_A7_Laurel_Burst"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = ["img/characters/VFX/$ProjectR_LaurelRoot.png", "img/characters/VFX/$ProjectR_LaurelWall.png", ...libs.map(n => `img/pictures/Animation/${n}.png`)].every(f => fs.existsSync(f));
    const d = v.def;
    rec("L0 boot", d.maxCopies === 3 && d.cooldownSeconds === 8 && d.maxLevel === 3 && d.rarity === "strong" && d.targetType === "instant" && v.c1.radius === 5 && v.c1.healPerSecond === 50 && v.c1.damageTaken === 0.7 && v.c2.speedBonus === 0.2 && v.c2.thornDps === 30 && v.c3.wall === true
      && v.templates.every(Boolean) && v.keys.length === 2 && v.fields && Math.abs(v.mode - 1.1) < 1e-9 && lib === true && files && v.status.implemented >= 6, JSON.stringify({ ...v, lib, files }).slice(0, 500));
  });

  await check("L1 Lv1(実キーQ): 使った瞬間に消費。半径5・7秒の根。根の中で秒間50回復・被ダメージ100→70。根の外(別の場所)では等倍・回復なし", async () => {
    await scene(1);
    await noGrow();
    const before = await hand();
    await fireTap(); await sleep(300);
    const used = { pile: await pile(), hand: (await hand()).filter(x => x === CARD).length, before: before.filter(x => x === CARD).length, patches: await json(`${API}.getPatches()`), roots: await evCount("/projectRLaurelRoot/"), pics: await pics("/apollo_laurel/") };
    await s.shot("l1_roots");
    const h0 = await setHp(100);
    await sleep(2050);
    const healed = (await hp()) - h0;
    const drop = await hurtDrop(100);
    await s.place(9 + 8, 15); await sleep(700);
    const outStatus = await json(`${ST}.has('player', 'laurel_roots')`);
    await setHp(await ev("$gameParty.leader().mhp"));
    const dropOut = await hurtDrop(100);
    const hOut0 = await setHp(100); await sleep(1100); const outHeal = (await hp()) - hOut0;
    rec("L1 lv1", used.pile === 1 && used.hand === used.before - 1 && used.patches.length === 1 && used.patches[0].radius === 5 && used.roots >= 1 && used.pics >= 1 && healed >= 94 && healed <= 106 && drop === 70 && outStatus === false && dropOut === 100 && outHeal === 0,
      JSON.stringify({ used: { pile: used.pile, patches: used.patches.length, roots: used.roots, pics: used.pics }, healed, drop, outStatus, dropOut, outHeal }));
  });

  await check("L2 成長と寿命(実機・実キーD): 右へ歩くと根のパッチが増えて範囲が広がり、各パッチは作ってから7秒で別々に消える。成長は7秒で止まる。根が消えると絵・錨・Eventが全部消える", async () => {
    await scene(1);
    await fireTap(); await sleep(200);
    await c.keyDown("D"); await sleep(1800); await c.keyUp("D"); await sleep(300);
    const grown = await json(`${API}.getPatches()`);
    const px = await ev("$gamePlayer._realX");
    await s.shot("l2_trail");
    const early = grown.length;
    await wait(`${API}.getPatches().length === 0`, 20000); await sleep(400);
    const end = await leftovers();
    const frames = grown.map(p => p.framesLeft);
    rec("L2 grow-lifetime", early >= 2 && early <= 12 && px > 9.5 + 2 && Math.max(...frames) - Math.min(...frames) > 20 && clean(end) && end.pics === 0, JSON.stringify({ patches: early, px, spread: Math.max(...frames) - Math.min(...frames), end }));
  });

  await check("L3 Lv2(実機): 主人公の移動速度x1.2(根の中だけ)・根の中の敵に秒間30(0.5秒ごと15)・根の外の敵は無傷・Lv1は敵に何もしない", async () => {
    await scene(2, { 4: [12, 15], 5: [22, 15] });
    await noGrow();
    await fireTap(); await sleep(300);
    const speedIn = await ev("ProjectRCardModifiers.moveSpeedFactor()");
    await sleep(2050);
    const l4 = await lost(4), l5 = await lost(5);
    await s.shot("l3_thorns");
    await s.place(9 + 9, 15); await sleep(700);
    const speedOut = await ev("ProjectRCardModifiers.moveSpeedFactor()");
    await scene(1, { 4: [12, 15] });
    await noGrow();
    await fireTap(); await sleep(2100);
    const lv1 = await lost(4);
    rec("L3 lv2", Math.abs(speedIn - 1.2) < 1e-9 && l4 >= 56 && l4 <= 64 && l5 === 0 && speedOut === 1 && lv1 === 0, JSON.stringify({ speedIn, l4, l5, speedOut, lv1 }));
  });

  await check("L4 Lv3(実機): 敵の弾に見立てたEventが根の範囲に入った瞬間に消え、その位置に根の壁(1.5秒)。範囲の外の弾はそのまま。Lv2は防がない", async () => {
    await scene(3);
    await noGrow();
    await fireTap(); await sleep(300);
    const inside = await spawnProjectile(12, 15), outside = await spawnProjectile(22, 15), own = await ev("(function() { var m = $gameMap, tpl = $dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Plague Arrow'; }); return m.spawnEvent(tpl.id, 11.5, 14.5, false); })()");
    await sleep(250);
    const r1 = { inside: await projectileAlive(inside), outside: await projectileAlive(outside), own: await projectileAlive(own), walls: await json(`${API}.getWalls().length`), wallEvents: await evCount("/projectRLaurelWall/"), stats: await json(`${API}.getStats()`) };
    await s.shot("l4_wall");
    await sleep(1800);
    const r2 = { walls: await json(`${API}.getWalls().length`), wallEvents: await evCount("/projectRLaurelWall/") };
    await ev(`$gameMap.event(${outside}).erase(); $gameMap.event(${own}).erase(); 'cleanup'`);
    await scene(2);
    await noGrow();
    await fireTap(); await sleep(300);
    const p2 = await spawnProjectile(12, 15); await sleep(250);
    const lv2Alive = await projectileAlive(p2);
    rec("L4 lv3-wall", r1.inside === false && r1.outside === true && r1.own === true && r1.walls === 1 && r1.wallEvents === 1 && r1.stats.blocked >= 1 && r2.walls === 0 && r2.wallEvents === 0 && lv2Alive === true, JSON.stringify({ r1, r2, lv2Alive }));
  });

  await check("L5 仲間・取消・性能(実機): Lv1の仲間が根の中で回復・被ダメージ30%戻る。戦闘終了で根・壁・錨・状態・速度が全部消える。frame処理時間", async () => {
    await scene(1);
    await noGrow();
    await ev(`(function() { var p = ProjectRPartyCombat; p.registerAlly({ actorId: 2, name: 'ally2', maxHp: 1000, normalAttack: { id: 'n2', range: 1.5, cooldownSeconds: 1 } }); p.startSession([2]); p.damageAlly(2, 500); $gameMap.event(6).linkedActorId = 2; $gameMap.event(6).locate(11, 15); return 'ally'; })()`);
    await s.sceneFrames(5);
    await fireTap(); await sleep(300);
    const a0 = await json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
    await sleep(1100);
    const a1 = await json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
    await ev("ProjectRPartyCombat.damageAlly(2, 100); 'hit'"); await sleep(300);
    const refunded = (await json(`${API}.getMembers()`)).find(m => m.key === 'ally:2').refunded; // 差し戻し(100の30%)。間にHoTが入るので、HPの差ではなく差し戻しの量で見る
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const after = await leftovers();
    await scene(3, { 4: [12, 15] });
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await fireTap(); await c.keyDown("D"); await sleep(1500); await c.keyUp("D"); await sleep(2500);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("L5 ally-cleanup-perf", a1 - a0 >= 45 && a1 - a0 <= 56 && refunded === 30 && clean(after) && after.pics === 0 && t.length > 100 && avg < 8 && p95 < 14 && s.errors().length === 0,
      JSON.stringify({ heal: a1 - a0, refunded, after, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("L6 退行なし(実機): ヒュアキントス(被弾100→10)・疫病の矢(直撃100)は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, {}, "hyacinthus");
    await fireTap(); await sleep(250);
    const drop = await hurtDrop(100);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, { 4: [15, 15] }, "plague");
    await s.aim(6, 0); await sleep(200);
    await fireTap(); await wait("ProjectRApolloPlagueRain.getLastResult() && ProjectRApolloPlagueRain.getLastResult().committed === true", 8000); await sleep(500);
    rec("L6 unchanged", drop === 10 && (await lost(4)) === 100, JSON.stringify({ drop, plague: await lost(4) }));
  });

  rec("LZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_laurel_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
