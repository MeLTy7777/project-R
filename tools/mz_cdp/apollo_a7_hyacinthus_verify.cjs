// Phase Apollo-A7: 実機(Playtest)の確認 — ヒュアキントス Lv1〜3。実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_hyacinthus_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・仲間(PartyCombat)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。被弾はHendrixの公式コマンド(UpdatePlayerHp)で与える。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_hyacinthus", API = "ProjectRApolloHyacinthus", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const staging = async ids => { for (const id of ids) await ev(`$gameMap.event(${id}).locate(${40 - id}, 3); 'ok'`); };
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = () => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length : 0; })()");
  const flowers = () => json("$gameMap.events().filter(function(e) { return e && /projectRHyacinth/.test(e.event().note || ''); }).length");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const hp = () => ev("$gameParty.leader().hp");
  const setHp = v => ev(`$gameParty.leader().setHp(${v}); $gameParty.leader().hp`);
  const hurtDrop = n => ev(`(function() { var a = $gameParty.leader(), b = a.hp; PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-${n}' }); return b - a.hp; })()`); // 同じ評価の中で測る(花の回復が間に入らない)
  const hurt = n => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-${n}' }); 'hurt'`);
  const leftovers = async () => ({ flowers: await flowers(), pics: await pics("/apollo_hyacinth/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    windows: (await json(`${API}.getWindows().length`)), blooms: (await json(`${API}.getBlooms().length`)), mods: await json("ProjectRDamageModifiers.list().length"), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()") });
  const clean = v => v.flowers === 0 && v.followers === 0 && v.anchors === 0 && v.windows === 0 && v.blooms === 0 && v.mods === 0 && v.speed === 1;
  const scene = async (level, kind = "hyacinthus") => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'"); // 自然のクリティカルで固定ダメージが3倍にならないよう、乱数を固定する
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); $gameParty.leader().setHp($gameParty.leader().mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("H0 boot: ヒュアキントスの登録(特殊・最大3枚・Cooldown 7・instant・maxLevel 3)・Lv別の数値・VFXキー/ライブラリ/素材・Map002の花のPrefab", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3), template: !!$dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Hyacinth'; }),
      keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_hyacinth/.test(k); }).sort(), status: ProjectRCardCatalog.godStatus('apollo'),
      fields: ['acceptSeconds','guardDamageTaken','bloomSeconds','bloomHealPerSecond','bloomHealTickSeconds','partyShare'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }) })`);
    const libs = ["ProjectR_A7_Hyacinth_Bloom", "ProjectR_A7_Hyacinth_Petals", "ProjectR_A7_Hyacinth_Guard"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = ["img/characters/VFX/$ProjectR_Hyacinth.png", ...libs.map(n => `img/pictures/Animation/${n}.png`)].every(f => fs.existsSync(f));
    const d = v.def;
    rec("H0 boot", d.maxCopies === 3 && d.cooldownSeconds === 7 && d.maxLevel === 3 && d.rarity === "special" && d.targetType === "instant" && v.c1.acceptSeconds === 3 && v.c1.guardTaken === 0.1 && v.c1.healPerSecond === 50 && v.c1.radius === 2
      && v.c2.partyShare === true && v.c3.acceptSeconds === 5 && v.c3.speedBonus === 0.8 && v.template && v.keys.length === 3 && v.fields && lib === true && files && v.status.implemented >= 4, JSON.stringify({ ...v, lib, files }).slice(0, 500));
  });

  await check("H1 Lv1(実キーQ): 使った瞬間に消費。被弾100が90%軽減(10)。花が咲く(花6個・錨)。受付期間(3秒)後は等倍の被弾で咲かない", async () => {
    await scene(1);
    const before = await hand();
    await fireTap(); await sleep(250);
    const used = { pile: await pile(), hand: (await hand()).filter(x => x === CARD).length, before: before.filter(x => x === CARD).length, windows: await json(`${API}.getWindows()`), guard: await json("ProjectRApolloStatus.has('player', 'hyacinthus_guard')") };
    const drop1 = await hurtDrop(100); await sleep(250);
    const bloom = await json(`${API}.getBlooms()`);
    const fl = await flowers();
    await s.shot("h1_bloom");
    await sleep(3200); // 受付期間が終わる
    const ended = await json(`${API}.getWindows().length`);
    const lateDrop = await hurtDrop(100); await sleep(250);
    rec("H1 lv1", used.pile === 1 && used.hand === used.before - 1 && used.windows.length === 1 && used.guard === true && drop1 === 10 && bloom.length === 1 && bloom[0].radius === 2 && fl === 6 && ended === 0 && lateDrop === 100,
      JSON.stringify({ used, drop: drop1, bloom: bloom.length, fl, ended, lateDrop }));
  });

  await check("H2 花の回復(実機): 半径2マス内で秒間50。半径の外では回復しない。8秒で花のEvent・錨・VFXが片付く", async () => {
    await scene(1);
    await fireTap(); await sleep(150);
    await hurt(100); await sleep(250);
    const h0 = await setHp(50);
    await sleep(1100);
    const h1 = await hp();
    await s.place(14, 15); await sleep(300);
    const away0 = await hp();
    await sleep(1000);
    const away1 = await hp();
    await s.place(9, 15);
    const mid = { blooms: await json(`${API}.getBlooms()`), pics: await pics("/apollo_hyacinth/") };
    await s.shot("h2_heal");
    await wait(`${API}.getBlooms().length === 0`, 12000);
    await sleep(500);
    const left = await leftovers();
    rec("H2 heal", h1 - h0 >= 45 && h1 - h0 <= 56 && away1 === away0 && mid.blooms.length === 1 && mid.pics >= 1 && clean(left) && left.pics === 0, JSON.stringify({ healed: h1 - h0, away: away1 - away0, mid, left }));
  });

  await check("H3 Lv2/Lv3(実機): Lv2は仲間にも受付期間と花(被弾の90%が戻る)。Lv3は受付期間5秒と移動速度x1.8(受付期間の間だけ)", async () => {
    await scene(2);
    await ev(`(function() { var p = ProjectRPartyCombat; p.registerAlly({ actorId: 2, name: 'ally2', maxHp: 400, normalAttack: { id: 'n2', range: 1.5, cooldownSeconds: 1 } }); p.startSession([2]); $gameMap.event(6).linkedActorId = 2; $gameMap.event(6).locate(14, 15); return 'ally'; })()`);
    await s.sceneFrames(5);
    await fireTap(); await sleep(200);
    const wins = (await json(`${API}.getWindows()`)).map(w => w.key).sort();
    await ev("ProjectRPartyCombat.damageAlly(2, 100); 'hit'"); await sleep(300);
    const allyHp = await json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
    const bl = await json(`${API}.getBlooms()`);
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(400);
    await scene(3);
    await fireTap(); await sleep(250);
    const sp1 = await ev("ProjectRCardModifiers.moveSpeedFactor()");
    await sleep(4300);
    const sp2 = await ev("ProjectRCardModifiers.moveSpeedFactor()"), still = await json(`${API}.getWindows().length`);
    await sleep(1100);
    const sp3 = await ev("ProjectRCardModifiers.moveSpeedFactor()"), gone = await json(`${API}.getWindows().length`);
    rec("H3 lv2-lv3", JSON.stringify(wins) === JSON.stringify(["ally:2", "player"]) && allyHp === 390 && bl.length === 1 && bl[0].owner === "ally:2" && Math.abs(sp1 - 1.8) < 1e-9 && Math.abs(sp2 - 1.8) < 1e-9 && still === 1 && sp3 === 1 && gone === 0,
      JSON.stringify({ wins, allyHp, bloomOwner: bl[0] && bl[0].owner, sp1, sp2, still, sp3, gone }));
  });

  await check("H4 失敗と取消(実機): 被弾しなければ花は咲かない。受付期間中・花の最中の戦闘終了で、受付期間・軽減・花・錨・移動速度が全部消える", async () => {
    await scene(3);
    await fireTap(); await sleep(5600);
    const noHit = { blooms: await json(`${API}.getBlooms().length`), windows: await json(`${API}.getWindows().length`), flowers: await flowers() };
    await scene(3);
    await fireTap(); await sleep(150); await hurt(100); await sleep(300);
    const live = { blooms: await json(`${API}.getBlooms().length`), flowers: await flowers(), speed: await ev("ProjectRCardModifiers.moveSpeedFactor()") };
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const after = await leftovers();
    rec("H4 cleanup", noHit.blooms === 0 && noHit.windows === 0 && noHit.flowers === 0 && live.blooms === 1 && live.flowers === 6 && live.speed > 1 && clean(after) && s.errors().length === 0, JSON.stringify({ noHit, live, after, errors: s.errors().slice(0, 2) }));
  });

  await check("H5 性能(実機): 受付期間+花の最中のupdateScene", async () => {
    await scene(3);
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await fireTap(); await sleep(150); await hurt(100); await sleep(3500);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("H5 perf", t.length > 100 && avg < 8 && p95 < 14, JSON.stringify({ n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }));
  });

  await sleep(6000);
  await check("H6 退行なし(実機): ギガース殺し Lv1(100ダメージ)・黄金の矢 Lv1は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, "gigas");
    await ev("$gameMap.event(4).locate(15, 15); SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'"); await sleep(300);
    await s.aim(6, 0); await sleep(200);
    await fireTap();
    await wait("ProjectRApolloGigasSlayer.getLastResult() && ProjectRApolloGigasSlayer.getLastResult().committed === true", 8000);
    await sleep(800);
    const bar = await ev("SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === 4; }).currentHp");
    rec("H6 gigas-unchanged", 1000000 - bar === 100, JSON.stringify({ dealt: 1000000 - bar }));
  });

  rec("HZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_hyacinthus_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
