// Phase Apollo-A15: 実機(Playtest)の確認 — 支援カード(エロスの矢・ヒュアキントス・月桂冠・竪琴)と、本物の ProjectR_PartyCombat の仲間(最大2人)。
//   仲間は ProjectRPartyCombat.registerAlly / startSession で登録した本物(体はアリーナのダミーEvent + linkedActorId)。製品の仲間は0人なので Playtest 用の仲間まで。
//   P1 エロスの矢(実キーQ): 傷ついた仲間だけ回復。ダウンした仲間は回復も復帰もしない。敵は回復しない。主人公は変わらない
//   P2 ヒュアキントス Lv2(実キーQ): 2人の仲間に受付期間。致死級はダウン判定の前に x0.1。軽減で0になった被弾でも花が咲く。ダウン後は復帰しない。期限後はすべて片付く
//   P3 月桂冠 Lv1(実キーQ): 根の中の仲間は x0.7、外の仲間は軽減なし。根を出た瞬間に外れる。根が消えたら即、全員の状態が消える
//   P4 竪琴 Lv3(実キーQ/J): 選べる回数5回(6回目は押せない)。5回ともヒールで画面全体、遠い仲間も回復
//   P5 敵の本物の遠距離攻撃(A14)が仲間に当たる: 弾は仲間で止まり主人公は無傷。ヒュアキントス中は 30 → 3
//   P6 後片付けとConsoleのエラーなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a15_party_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const PC = "ProjectRPartyCombat", ST = "ProjectRApolloStatus", HY = "ProjectRApolloHyacinthus", LA = "ProjectRApolloLaurelWreath", LY = "ProjectRApolloLyreRhythm", ER = "ProjectRApolloErosArrow", TE = "ProjectRTestEnemies", EA = "ProjectREnemyAttack";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  const hp = () => ev("$gameParty.leader().hp");
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const member = id => json(`${PC}.members().filter(function(m) { return m.actorId === ${id}; })[0]`);
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const scene = async (level, kind) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(40 - id, 3); }); var a = $gameParty.leader(); a.setHp(a.mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'"); await sleep(200);
  };
  // 仲間(最大2人)を1回の startSession で登録する: defs = [{ actorId, eventId, x, y, maxHp, hp }]
  const party = async defs => {
    await ev(`(function() { var p = ProjectRPartyCombat, defs = ${JSON.stringify(defs)}, hp = {};
      defs.forEach(function(d) { p.registerAlly({ actorId: d.actorId, name: 'ally' + d.actorId, maxHp: d.maxHp, normalAttack: { id: 'n' + d.actorId, range: 1.5, cooldownSeconds: 1 } }); hp[d.actorId] = d.hp; });
      var r = p.startSession(defs.map(function(d) { return d.actorId; }), { hp: hp }); if (!r.ok) throw new Error(JSON.stringify(r));
      defs.forEach(function(d) { var e = $gameMap.event(d.eventId); e.linkedActorId = d.actorId; e.locate(d.x, d.y); }); return 'party'; })()`);
    await sleep(300);
  };
  const cooldown = async () => { await json(`${TE}.clear()`); await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };

  await c.send("Page.bringToFront").catch(() => {});
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000); // 起動が終わる前にマップへ移ると、ウィンドウスキン未読込のエラー(getPixel)になる
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("P1 エロスの矢(実キーQ): 傷ついた仲間だけ回復。ダウンした仲間は回復も復帰もしない。主人公のHPは変わらない。仲間の体にダメージは入らない", async () => {
    await scene(1, "eros");
    await party([{ actorId: 2, eventId: 5, x: 13, y: 13, maxHp: 400, hp: 100 }, { actorId: 3, eventId: 6, x: 13, y: 17, maxHp: 400, hp: 100 }]);
    await json(`${PC}.damageAlly(3, 1000)`);
    const roster = await json("ProjectRPartyRoster.members().map(function(m) { return m.key; })");
    const hp0 = await hp();
    await sleep(600); await s.aim(4, -2); await sleep(200);
    await fireTap(); await sleep(400);
    await s.shot("p1_eros_party");
    await wait(`${ER}.getSequences().length === 0`, 12000); await sleep(300);
    const a2 = await member(2), a3 = await member(3);
    const hits = await json(`${ER}.getLastResult().hits`);
    const body = await ev("SceneManager._scene._spriteset._eventHpBars.filter(function(b) { return b._event.eventId() === 5 || b._event.eventId() === 6; }).every(function(b) { return b.currentHp === 1000000; })");
    rec("P1 eros party", JSON.stringify(roster) === JSON.stringify(["player", "ally:2"]) && a2.hp > 100 && !a2.down && a3.down === true && a3.hp === 0 && hits.every(h => h.kind !== "ally" || h.actorId !== 3) && (await hp()) === hp0 && body,
      JSON.stringify({ roster, a2: [a2.hp, a2.down], a3: [a3.hp, a3.down], hits: hits.map(h => [h.kind, h.actorId, h.healed]), body }));
    await cooldown();
  });

  await check("P2 ヒュアキントス Lv2(実キーQ): 2人の仲間に受付期間。致死級の被弾はダウン判定の前に x0.1。軽減で0になった被弾でも花が咲く。ダウン後は復帰しない。期限後はすべて片付く", async () => {
    await scene(2, "hyacinthus");
    await party([{ actorId: 2, eventId: 5, x: 14, y: 15, maxHp: 400, hp: 50 }, { actorId: 3, eventId: 6, x: 16, y: 17, maxHp: 400, hp: 400 }]);
    await fireTap(); await sleep(400);
    const keys = await json(`${HY}.getWindows().map(function(w) { return w.key; }).sort()`);
    const guard = await json(`[${ST}.has('ally:2', 'hyacinthus_guard'), ${ST}.has('ally:3', 'hyacinthus_guard')]`);
    const lethal = await json(`${PC}.damageAlly(2, 100)`);
    const tiny = await json(`${PC}.damageAlly(3, 4)`);
    await sleep(500);
    await s.shot("p2_hyacinth_party");
    const owners = await json(`${HY}.getBlooms().map(function(b) { return b.owner; }).sort()`);
    const dead = await json(`${PC}.damageAlly(2, 20000)`); // 軽減後の2000でも花の回復後のHPを超える
    const heal = await json(`${PC}.healAlly(2, 100)`);
    await sleep(2500);
    const a2 = await member(2);
    await sleep(12000);
    const left = await json(`({ windows: ${HY}.getWindows().length, blooms: ${HY}.getBlooms().length, flowers: ${HY}.getTempObjectCount().flowers, states: ${ST}.list().filter(function(x) { return /^ally:/.test(x.target); }).length })`);
    rec("P2 hyacinth party", JSON.stringify(keys) === JSON.stringify(["ally:2", "ally:3", "player"]) && guard[0] && guard[1] && lethal.ok && !lethal.down && lethal.hp === 40 && tiny.ok && tiny.hp === 400
      && owners.includes("ally:2") && owners.includes("ally:3") && dead.down === true && heal.ok === false && a2.down === true && a2.hp === 0 && left.windows === 0 && left.blooms === 0 && left.flowers === 0 && left.states === 0,
      JSON.stringify({ keys, guard, lethal, tiny, owners, dead, heal, a2: [a2.hp, a2.down], left }));
    await cooldown();
  });

  await check("P3 月桂冠 Lv1(実キーQ): 根の中の仲間は x0.7・外の仲間は軽減なし。根を出た次のframeで外れる。根が消えたら全員の状態がすぐ消える", async () => {
    await scene(1, "laurel");
    await ev(`ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 0); 'ok'`);
    await party([{ actorId: 2, eventId: 5, x: 11, y: 15, maxHp: 1000, hp: 1000 }, { actorId: 3, eventId: 6, x: 18, y: 15, maxHp: 1000, hp: 1000 }]);
    await fireTap(); await sleep(500);
    await s.shot("p3_laurel_party");
    const inside = await json(`[${ST}.has('ally:2', 'laurel_roots'), ${ST}.has('ally:3', 'laurel_roots'), ${ST}.has('player', 'laurel_roots')]`);
    const hit = await json(`(function() { var b = ${PC}.members()[0].hp, r = ${PC}.damageAlly(2, 100); return [b - r.hp, r.ok]; })()`);
    const hitOut = await json(`(function() { var b = ${PC}.members()[1].hp, r = ${PC}.damageAlly(3, 100); return [b - r.hp, r.ok]; })()`);
    await locate(5, 28, 15); await sleep(60);
    const left = await json(`${ST}.has('ally:2', 'laurel_roots')`);
    await wait(`${LA}.getPatches().length === 0`, 12000); await sleep(100);
    const gone = await json(`({ patches: ${LA}.getPatches().length, states: ${ST}.list().filter(function(x) { return x.id === 'laurel_roots'; }).length })`);
    rec("P3 laurel party", inside[0] && !inside[1] && inside[2] && hit[0] === 70 && hitOut[0] === 100 && left === false && gone.patches === 0 && gone.states === 0, JSON.stringify({ inside, hit, hitOut, left, gone }));
    await cooldown();
  });

  await check("P4 竪琴 Lv3(実キーQ/J): 選べる回数は5回(6回目は押せない)。5回ともヒールで画面全体: 遠い仲間も回復。毎回、近い仲間は回復する", async () => {
    await scene(3, "lyre");
    await party([{ actorId: 2, eventId: 5, x: 11, y: 15, maxHp: 5000, hp: 500 }, { actorId: 3, eventId: 6, x: 16, y: 15, maxHp: 5000, hp: 500 }]);
    await fireTap(); await sleep(300);
    const notes = await json(`${LY}.getNotes()`);
    const heals = notes.filter(n => n.kind === "heal");
    const results = []; let expectedWide = [];
    for (let i = 0; i < 5; i++) {
      const n = heals[i];
      await wait(`${LY}.getSession() && ${LY}.getSession().frame >= ${n.arrive - 2}`, 30000);
      if (i === 4) expectedWide = await json("(function() { var w = Graphics.width / $gameMap.tileWidth(), h = Graphics.height / $gameMap.tileHeight(), x0 = $gameMap.displayX(), y0 = $gameMap.displayY(); return ProjectRPartyRoster.members().filter(function(m) { var p = m.key === 'player' ? $gamePlayer.centerPositionPoint() : (function() { var e = $gameMap.event(m.eventId); return { x: e._realX + 0.5, y: e._realY + 0.5 }; })(); return m.hp > 0 && p.x >= x0 && p.x <= x0 + w && p.y >= y0 && p.y <= y0 + h; }).map(function(m) { return m.key; }).sort(); })()");
      const before = (await json(`${LY}.getResults()`)).length;
      await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(120);
      const r = await json(`${LY}.getResults()`); results.push(r.length > before ? r[before] : null);
    }
    await s.shot("p4_lyre_party");
    const a2 = await member(2), a3 = await member(3);
    const dbg4 = await json(`({ roster: ProjectRPartyRoster.members().map(function(m) { return [m.key, m.eventId, m.hp]; }), ev6: [$gameMap.event(6)._realX, $gameMap.event(6)._realY], disp: [$gameMap.displayX(), $gameMap.displayY()], last: ${LY}.getResults().map(function(r) { return [r.kind, r.wide, r.members]; }) })`);
    await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(200);
    const count = (await json(`${LY}.getResults()`)).length;
    rec("P4 lyre party", results.every(r => r && r.hit && r.kind === "heal") && results.map(r => r.wide).join() === "false,false,false,false,true" && JSON.stringify([...results[4].members].sort()) === JSON.stringify(expectedWide) && expectedWide.includes("ally:3") && a2.hp >= 500 + 500 && a3.hp > 500 && count === 5,
      JSON.stringify({ wide: results.map(r => r && r.wide), a2: a2.hp, a3: a3.hp, count, expectedWide, got: results[4] && results[4].members, dbg4 }));
    await cooldown();
  });

  await check("P5 敵の本物の遠距離攻撃(A14)が仲間に当たる: 弾は仲間で止まり主人公は無傷。固定30。ヒュアキントス中は 30 → 3", async () => {
    await scene(2, "hyacinthus");
    await party([{ actorId: 2, eventId: 5, x: 15, y: 15, maxHp: 100, hp: 100 }]);
    await locate(3, 20, 15); await json(`${TE}.attach(3, 'ranged', { windupFrames: 20 })`);
    await json(`${TE}.clearAllyHits()`);
    const hp0 = await hp();
    const a = await json(`${TE}.attackNow(3, { target: 'ally:2' })`);
    await wait(`${TE}.getAllyHits().length > 0`, 10000); await sleep(200);
    const hit1 = await json(`${TE}.getAllyHits()[0]`), hpMid = await hp();
    await fireTap(); await sleep(400);
    await json(`${TE}.clearAllyHits()`);
    const b = await json(`${TE}.attackNow(3, { target: 'ally:2' })`);
    await wait(`${TE}.getAllyHits().length > 0`, 10000); await sleep(200);
    const hit2 = await json(`${TE}.getAllyHits()[0]`);
    await s.shot("p5_enemy_bolt_ally");
    rec("P5 enemy attack on ally", a.ok && hit1 && hit1.amount === 30 && hit1.result.hp === 70 && hpMid === hp0 && b.ok && hit2 && hit2.result.hp === 67 && (await hp()) === hp0, JSON.stringify({ hit1, hit2, hp: [hp0, hpMid, await hp()], a, b, log: await json(`${EA}.getLog().slice(-6)`), brains: await json(`${TE}.list()`), dbg: await json(`({ allies: ProjectRPartyRoster.allies().map(function(a) { return [a.actorId, a.eventId, a.hp]; }), ev5: [$gameMap.event(5)._realX, $gameMap.event(5)._realY, $gameMap.event(5)._erased], bolts: $gameMap.events().filter(function(e) { return e && /projectRTestEnemyBolt/.test(e.event().note || ''); }).map(function(e) { return [e.eventId(), e._realX, e._realY]; }) })`) }));
    await cooldown();
  });

  await check("P6 後片付け: 戦闘終了で仲間の状態・窓・根・花・リジェネがすべて消える", async () => {
    await scene(2, "hyacinthus");
    await party([{ actorId: 2, eventId: 5, x: 14, y: 15, maxHp: 400, hp: 400 }]);
    await fireTap(); await sleep(400);
    const before = await json(`${ST}.list().length`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(600);
    const after = await json(`({ states: ${ST}.list().length, windows: ${HY}.getWindows().length, blooms: ${HY}.getBlooms().length })`);
    rec("P6 cleanup", before > 0 && after.states === 0 && after.windows === 0 && after.blooms === 0, JSON.stringify({ before, after }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e)); // Playtestの起動時の manifest.json の書き込みの失敗(環境の雑音。ゲームの処理ではない)
  rec("PZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a15_party_results.json`, JSON.stringify({ note: "Playtest用の仲間(PartyCombat)・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
