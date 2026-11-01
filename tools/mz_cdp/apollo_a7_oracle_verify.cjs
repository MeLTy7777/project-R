// Phase Apollo-A7: 実機(Playtest)の確認 — 神託 Lv1〜3。実キー(CDP。カードはQ、攻撃ボタンはJ)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_oracle_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   現行の本番データに敵の弾のPrefabが無いため、敵が撃った弾に見立てたEvent(_inheritedEnemyName付き)で予告線とスローを確かめる。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_oracle", API = "ProjectRApolloOracle", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const resetHp = () => ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
  const lost = async id => 1000000 - await barHp(id);
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const state = () => json(`${API}.getState()`);
  const spawnProjectile = (x, y, degree, enemy = true) => ev(`(function() { var m = $gameMap, tpl = $dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Plague Arrow'; }); var id = m.spawnEvent(tpl.id, ${x} - 0.5, ${y} - 0.5, false, ${Math.max(0.01, degree)}); var e = m.event(id); e.rotateTo(${Math.max(0.01, degree)}); ${enemy ? "e._inheritedEnemyName = 'Slime';" : ""} return id; })()`);
  const speedOf = id => ev(`ProjectRCardModifiers.characterSpeedFactor($gameMap.event(${id}))`);
  const leftovers = async () => ({ state: await state(), temp: await json(`${API}.getTempObjectCount()`), pics: await pics("/apollo_oracle/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    bonus: await json("ProjectRCardModifiers.getWeaponHitBonus()"), speed: await speedOf(4) });
  const clean = v => v.state === null && v.temp.total === 0 && v.pics === 0 && v.followers === 0 && v.anchors === 0 && v.bonus === null && v.speed === 1;
  const scene = async (level, enemies = {}, kind = "oracle") => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); ProjectRCardModifiers.clearWeaponHitBonus('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); $gameParty.leader().setHp($gameParty.leader().mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const attackTap = async () => { await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(900); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("O0 boot: 神託の登録(強力・最大3枚・Cooldown 3・instant・maxLevel 3)・Lv別の数値・VFXキー/ライブラリ/素材・8枚そろったカタログ・本番の初期セットにApolloなし", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3), keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_oracle/.test(k); }).sort(),
      status: ProjectRCardCatalog.godStatus('apollo'), starter: ProjectRHermesProductionDeck.starterSet().map(function(c) { return c.cardId; }).filter(function(id) { return /^apollo_/.test(id); }),
      fields: ['predictSeconds','predictLengthTiles','oraclePredict','slowSeconds','slowFactor','hitMultiplier','hitSeconds'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }) })`);
    const libs = ["ProjectR_A7_Oracle_Clock", "ProjectR_A7_Oracle_Sparkle"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = libs.map(n => `img/pictures/Animation/${n}.png`).every(f => fs.existsSync(f));
    const d = v.def;
    rec("O0 boot", d.maxCopies === 3 && d.cooldownSeconds === 3 && d.maxLevel === 3 && d.rarity === "strong" && d.targetType === "instant" && v.c1.predict && v.c1.length === 12 && v.c2.slow && v.c2.slowFactor === 0.5 && v.c3.bonus && v.c3.bonusMultiplier === 2
      && v.keys.length === 2 && v.fields && lib === true && files && v.status.implemented === 8 && v.status.reserved === 0 && v.starter.length === 0, JSON.stringify({ ...v, lib, files }).slice(0, 500));
  });

  await check("O1 Lv1(実キーQ): 使った瞬間に消費。使ったあとに最初に現れた敵の弾へ予告線(UI)が出て追従し、消えたら外れる。使う前から飛んでいた弾・次の弾は予告しない", async () => {
    await scene(1, {});
    const before = await spawnProjectile(20, 15, 270, true);
    await fireTap(); await sleep(250);
    const pile = await json("(function() { var b = ProjectRCardDeck.getBattleState(); return b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length; })()");
    const none = (await json(`${API}.getTelegraphs()`)).length;
    const next = await spawnProjectile(15, 17, 180, true); await sleep(250);
    const t1 = await json(`${API}.getTelegraphs()`);
    await s.shot("o1_telegraph");
    await ev(`(function() { var e = $gameMap.event(${next}); e.setPosition(e._realX, e._realY + 2); return 'moved'; })()`); await sleep(200);
    const t2 = await json(`${API}.getTelegraphs()`);
    const second = await spawnProjectile(14, 15, 90, true); await sleep(200);
    const t3 = (await json(`${API}.getTelegraphs()`)).length;
    await ev(`$gameMap.event(${next}).erase(); 'erased'`); await sleep(250);
    const t4 = (await json(`${API}.getTelegraphs()`)).length;
    rec("O1 lv1-predict", pile === 1 && none === 0 && t1.length === 1 && t1[0].id === next && t1[0].hasSprite && Math.abs(t1[0].degree - 180) < 0.5 && t1[0].length > 0 && t1[0].length <= 12 && t2[0].y > t1[0].y + 1.5 && t3 === 1 && t4 === 0 && second > 0 && before > 0,
      JSON.stringify({ pile, none, t1: t1.length, deg: t1[0] && t1[0].degree, len: t1[0] && t1[0].length, dy: t2[0] && t1[0] && t2[0].y - t1[0].y, t3, t4 }));
  });

  await check("O2 Lv2(実機): 使ってから1秒、敵と敵の弾がx0.5(主人公は含まない)。時計の絵(Apolloの後ろ・1秒で一周)が出て1秒後に外れる", async () => {
    await scene(2, { 4: [15, 15] });
    const flying = await spawnProjectile(18, 15, 270, true);
    await fireTap(); await sleep(250);
    const mid = { enemy: await speedOf(4), proj: await ev(`ProjectRCardModifiers.characterSpeedFactor($gameMap.event(${flying}))`), player: await ev("ProjectRCardModifiers.moveSpeedFactor()"), clock: await pics("/apollo_oracle\\.clock/"), st: await state() };
    await s.shot("o2_clock");
    await sleep(1100);
    const end = { enemy: await speedOf(4), proj: await ev(`ProjectRCardModifiers.characterSpeedFactor($gameMap.event(${flying}))`), clock: await pics("/apollo_oracle\\.clock/") };
    rec("O2 lv2-slow", mid.enemy === 0.5 && mid.proj === 0.5 && mid.player === 1 && mid.clock >= 1 && mid.st && mid.st.slowFramesLeft > 0 && end.enemy === 1 && end.proj === 1 && end.clock === 0, JSON.stringify({ mid, end }));
  });

  await check("O3 Lv3(実機・実キーQ→J): 次の通常攻撃(銃)のダメージがx2。次の1回だけ", async () => {
    await scene(3, { 4: [13, 15] });
    await s.aim(4, 0); await sleep(200);
    await attackTap();
    const base = await lost(4);
    await resetHp(); await sleep(300);
    await fireTap(); await sleep(250);
    const armed = await json("ProjectRCardModifiers.getWeaponHitBonus()");
    await attackTap();
    const doubled = await lost(4);
    const after = await json("ProjectRCardModifiers.getWeaponHitBonus()");
    await resetHp(); await sleep(700);
    await attackTap();
    const third = await lost(4);
    rec("O3 lv3-x2", base > 0 && armed && armed.multiplier === 2 && doubled === base * 2 && after === null && third === base, JSON.stringify({ base, armed: armed && armed.multiplier, doubled, after, third }));
  });

  await check("O4 取消と後片付け・性能(実機): 戦闘終了で予告線・スロー・時計・強化が全部消える。frame処理時間", async () => {
    await scene(3, { 4: [15, 15] });
    await fireTap(); await sleep(200);
    await spawnProjectile(14, 17, 180, true); await sleep(200);
    const live = { tel: (await json(`${API}.getTelegraphs()`)).length, enemy: await speedOf(4), bonus: await json("ProjectRCardModifiers.getWeaponHitBonus()") };
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const after = await leftovers();
    await scene(3, { 4: [15, 15] });
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await fireTap(); await sleep(200); await spawnProjectile(14, 17, 180, true); await sleep(3500);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("O4 cleanup-perf", live.tel === 1 && live.enemy === 0.5 && live.bonus && clean(after) && t.length > 100 && avg < 8 && p95 < 14 && s.errors().length === 0, JSON.stringify({ live, after, perf: { n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("O5 退行なし(実機): ギガース殺し(100ダメージ)・竪琴(音符12個)は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, { 4: [15, 15] }, "gigas");
    await s.aim(6, 0); await sleep(200);
    await fireTap(); await wait("ProjectRApolloGigasSlayer.getLastResult() && ProjectRApolloGigasSlayer.getLastResult().committed === true", 8000); await sleep(600);
    const gigas = await lost(4);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, {}, "lyre");
    await fireTap(); await sleep(250);
    const notes = await json("ProjectRApolloLyreRhythm.getSession()");
    rec("O5 unchanged", gigas === 100 && notes && notes.notes === 12, JSON.stringify({ gigas, notes: notes && notes.notes }));
  });

  rec("OZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_oracle_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
