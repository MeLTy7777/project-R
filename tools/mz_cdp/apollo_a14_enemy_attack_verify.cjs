// Phase Apollo-A14: 実機(Playtest)の確認 — 敵の攻撃の予約と予兆(ProjectREnemyAttack)、神託 Lv1 の予測、月桂冠 Lv3 の弾防ぎ。
//   Playtest専用の敵(ProjectRTestEnemies): アリーナのダミー(<hp: 魔獣><enemy>)の1体を遠距離、1体を近接にして、予約 → 溜め → 実行(Hendrixの本物の攻撃)で実際に戦う。
//   E1 神託 × 遠距離: 予告線(向き・溜め)→ 実行で弾へ引き継ぎ → 弾がプレイヤーに届き1回だけダメージ → 予告が消える
//   E2 取消(遠距離): 溜めの途中の中断(API / 敵が攻撃を受ける)→ 予告が消え・弾が出ず・ダメージなし
//   E3 神託 × 近接: 範囲(判定が出るタイル)の予告 → 実行 → 1回だけダメージ。避ければ当たらない
//   E4 取消(近接): 予告の範囲が消え、判定が出ない
//   E5 月桂冠 Lv3: 敵の弾を根で防ぐ(ダメージなし・根の壁)。近接は防がない。プレイヤー自身の弾は防がない
//   E6 後片付け: 予約・弾・判定・根・壁・予告線が残らない。重複ダメージ・孤児のEventなし。Consoleのエラーなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a14_enemy_attack_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const path = require("path");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const EA = "ProjectREnemyAttack", TE = "ProjectRTestEnemies", OR = "ProjectRApolloOracle", LA = "ProjectRApolloLaurelWreath";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  const hp = () => ev("$gameParty.leader().hp");
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const bolts = () => json("$gameMap.events().filter(function(e) { return e && /projectRTestEnemyBolt/.test(e.event().note || ''); }).length");
  const hitboxes = () => json("$gameMap.events().filter(function(e) { return e && /projectRTestEnemyMelee/.test(e.event().note || ''); }).length");
  const tele = () => json(`${OR}.getTelegraphs()`);
  const scene = async (level, kind) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(40 - id, 3); }); var a = $gameParty.leader(); a.setHp(a.mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'"); await sleep(200);
    await json(`${EA}.clear('script')`);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const cooldown = async () => { await json(`${TE}.clear()`); await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };
  const waitPending = () => wait(`${EA}.list().length > 0`, 4000);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("E0 前提: ProjectREnemyAttack とPlaytestの敵が読み込まれる。弾のテンプレートはメモリ上だけ(Map002のファイルは変わらない)。既存の敵(ゴブリン等)は予約を通らないので予兆を出さない", async () => {
    const before = await json("$dataTemplateMap.events.some(function(e) { return e && e.name === 'ProjectR Test Enemy Bolt'; })");
    await scene(1, "oracle");
    const att = await json(`${TE}.attach(3, 'ranged')`);
    const after = await json("$dataTemplateMap.events.some(function(e) { return e && e.name === 'ProjectR Test Enemy Bolt'; })");
    const file = fs.readFileSync(path.join(__dirname, "..", "..", "data", "Map002.json"), "utf8");
    const api = await json(`['schedule','cancel','interrupt','get','list','getOutcome','onAnnounce','onCancel','onFire'].every(function(k) { return typeof ${EA}[k] === 'function'; })`);
    rec("E0 boot", before === false && att.ok && after === true && !/Test Enemy Bolt/.test(file) && api, JSON.stringify({ before, after, att: att.ok, fileHasBolt: /Test Enemy Bolt/.test(file), api }));
    await cooldown();
  });

  await check("E1 神託 Lv1 × 遠距離(実機・実キーQ): 予約された本物の攻撃を予告する(向き・溜め)。実行されると同じ線が弾へ引き継がれ、弾がプレイヤーに届くと1回だけダメージ、予告は消える", async () => {
    await scene(1, "oracle");
    await locate(3, 20, 15); await json(`${TE}.attach(3, 'ranged')`);
    await fireTap(); await sleep(300);
    const none = await tele();
    const hp0 = await hp();
    const a = await json(`${TE}.attackNow(3)`);
    await sleep(350);
    const t1 = await tele(); const rec1 = await json(`${EA}.get(${a.id})`);
    await s.shot("e1_ranged_telegraph");
    await sleep(120);
    const t2 = await tele(), rec2 = await json(`${EA}.get(${a.id})`);
    const noBoltYet = await bolts();
    await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000); await sleep(150);
    const handoff = await tele(); const out = await json(`${EA}.getOutcome(${a.id})`);
    await s.shot("e1_ranged_projectile");
    await wait(`${EA}.getOutcome(${a.id}).damaged === true`, 12000); await sleep(400);
    const hp1 = await hp(), after = await tele(), boltsLeft = await bolts();
    await sleep(1500);
    const hp2 = await hp();
    rec("E1 oracle ranged", none.length === 0 && t1.length === 1 && t1[0].source === "attack" && t1[0].kind === "ranged" && Math.abs(t1[0].degree - 270) < 2 && t1[0].hasSprite && rec2 && rec2.framesLeft < rec1.framesLeft && t2[0] && t2[0].framesLeft < t1[0].framesLeft && noBoltYet === 0
      && out.state === "fired" && handoff.length === 1 && handoff[0].source === "projectile" && handoff[0].id === out.projectileId && hp1 < hp0 && hp2 === hp1 && after.length === 0 && boltsLeft === 0,
      JSON.stringify({ t1: t1.map(x => [x.source, x.kind, Math.round(x.degree), x.framesLeft, x.hasSprite]), t2f: t2[0] && t2[0].framesLeft, recLeft: [rec1 && rec1.framesLeft, rec2 && rec2.framesLeft], handoff: handoff.map(x => [x.source, x.id]), out, hp: [hp0, hp1, hp2], after: after.length, boltsLeft }));
    await cooldown();
  });

  await check("E2 取消(遠距離): 溜めの途中の中断(APIと、敵が攻撃を受ける)で、予告が消え・弾が出ず・ダメージなし", async () => {
    const results = [];
    for (const how of ["interrupt", "damaged"]) {
      await scene(1, "oracle");
      await locate(3, 20, 15); await json(`${TE}.attach(3, 'ranged')`);
      await fireTap(); await sleep(300);
      const hp0 = await hp();
      const a = await json(`${TE}.attackNow(3)`);
      await sleep(500);
      const before = await tele();
      if (how === "interrupt") await json(`${TE}.interrupt(3)`);
      else await ev("(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === 3; }); b.currentHp = b.targetHp = 999000; b.refresh(); return 'hit'; })()");
      await sleep(400);
      const after = await tele(), out = await json(`${EA}.getOutcome(${a.id})`);
      await sleep(2500);
      results.push({ how, before: before.length, after: after.length, out: out && [out.state, out.reason], bolts: await bolts(), hpSame: (await hp()) === hp0, pending: (await json(`${EA}.list().length`)) });
      await cooldown();
    }
    rec("E2 cancel ranged", results.every(r => r.before === 1 && r.after === 0 && r.out[0] === "cancelled" && r.bolts === 0 && r.hpSame && r.pending === 0), JSON.stringify(results));
  });

  await check("E3 神託 Lv1 × 近接(実機): 範囲(判定が出るタイル)の予告 → 実行 → プレイヤーがそこにいれば1回だけダメージ。溜めの間に避ければ当たらず、予告は実行で消える", async () => {
    const results = [];
    for (const dodge of [false, true]) {
      await scene(1, "oracle");
      await locate(4, 10, 15); await json(`${TE}.attach(4, 'melee')`);
      await fireTap(); await sleep(300);
      const hp0 = await hp();
      const a = await json(`${TE}.attackNow(4)`);
      await sleep(300);
      const t1 = await tele(), rec1 = await json(`${EA}.get(${a.id})`);
      if (!dodge) await s.shot("e3_melee_telegraph");
      if (dodge) { await s.place(5, 15); }
      await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000); await sleep(500);
      const after = await tele(), out = await json(`${EA}.getOutcome(${a.id})`), lost = hp0 - await hp();
      await sleep(800);
      results.push({ dodge, kind: t1[0] && t1[0].kind, area: t1[0] && t1[0].area, rec: rec1 && rec1.area, afterFire: after.length, damaged: out.damaged === true, lost, lostLater: hp0 - await hp(), hb: await hitboxes() });
      await cooldown();
    }
    const [hit, miss] = results;
    rec("E3 oracle melee", hit.kind === "melee" && hit.area && hit.area.width === 1 && JSON.stringify(hit.area) === JSON.stringify(hit.rec) && hit.afterFire === 0 && hit.damaged && hit.lost > 0 && hit.lostLater === hit.lost && hit.hb === 0
      && !miss.damaged && miss.lost <= 0 && miss.afterFire === 0 && miss.hb === 0, JSON.stringify(results));
  });

  await check("E4 取消(近接): 中断で予告の範囲が消え、判定のEventは出ず、ダメージなし", async () => {
    await scene(1, "oracle");
    await locate(4, 10, 15); await json(`${TE}.attach(4, 'melee')`);
    await fireTap(); await sleep(300);
    const hp0 = await hp();
    const a = await json(`${TE}.attackNow(4)`);
    await sleep(250);
    const before = await tele();
    await json(`${TE}.interrupt(4)`);
    await sleep(300);
    const after = await tele(), out = await json(`${EA}.getOutcome(${a.id})`);
    await sleep(1200);
    rec("E4 cancel melee", before.length === 1 && before[0].kind === "melee" && after.length === 0 && out.state === "cancelled" && (await hitboxes()) === 0 && (await hp()) === hp0, JSON.stringify({ before: before.length, after: after.length, out, hb: await hitboxes() }));
    await cooldown();
  });

  await check("E5 月桂冠 Lv3(実機): 敵が撃った本物の弾は根(半径5)に入った瞬間に消え、根の壁ができて、ダメージなし。近接は防がない。プレイヤー自身の弾(銃・実キーJ)は防がない", async () => {
    await scene(3, "laurel");
    await ev("ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 3); 'ok'");
    await locate(3, 22, 15); await json(`${TE}.attach(3, 'ranged', { windupFrames: 20 })`);
    await fireTap(); await sleep(400);
    const hp0 = await hp();
    const a = await json(`${TE}.attackNow(3)`);
    await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000);
    // プレイヤー自身の弾(銃)
    const shots0 = await ev("ProjectRGunSystem.status().shots");
    await c.keyDown("J"); await sleep(60); await c.keyUp("J"); await sleep(250);
    const shots1 = await ev("ProjectRGunSystem.status().shots");
    await wait(`${LA}.getStats().blocked >= 1`, 12000); await sleep(500);
    await s.shot("e5_laurel_block");
    const st = await json(`${LA}.getStats()`), log = await json(`${LA}.getLog().filter(function(e) { return e.type === 'blocked'; }).map(function(e) { return e.eventId; })`);
    const out = await json(`${EA}.getOutcome(${a.id})`);
    const walls = await json("$gameMap.events().filter(function(e) { return e && /projectRLaurelWall/.test(e.event().note || ''); }).length");
    await sleep(2200);
    const hpAfter = await hp();
    // 近接(根の中でも当たる)
    await locate(4, 10, 15); await json(`${TE}.attach(4, 'melee', { windupFrames: 10 })`);
    const m = await json(`${TE}.attackNow(4)`);
    await wait(`${EA}.getOutcome(${m.id}) && ${EA}.getOutcome(${m.id}).state === 'fired'`, 4000); await sleep(600);
    const mo = await json(`${EA}.getOutcome(${m.id})`), st2 = await json(`${LA}.getStats()`);
    rec("E5 laurel", st.blocked === 1 && log.length === 1 && log[0] === out.projectileId && out.damaged !== true && hpAfter >= hp0 && walls >= 1 && shots1 === shots0 + 1 && mo.damaged === true && st2.blocked === 1,
      JSON.stringify({ blocked: st.blocked, log, projectile: out.projectileId, damaged: out.damaged, hp: [hp0, hpAfter], walls, shots: [shots0, shots1], melee: mo.damaged, blocked2: st2.blocked }));
    await cooldown();
  });

  await check("E6 後片付けと重複ダメージなし: 予約・弾・判定・予告線・監視が残らない", async () => {
    await scene(1, "oracle");
    await locate(3, 20, 15); await locate(4, 10, 15);
    await json(`${TE}.attach(3, 'ranged')`); await json(`${TE}.attach(4, 'melee')`);
    await fireTap(); await sleep(300);
    const hp0 = await hp();
    const ra = await json(`${TE}.attackNow(3)`), rb = await json(`${TE}.attackNow(4)`);
    await sleep(9000);
    const d = await json(`${EA}.diagnostics()`), left = await json(`({ bolts: $gameMap.events().filter(function(e) { return e && /projectRTestEnemy/.test(e.event().note || ''); }).length, tele: ${OR}.getTelegraphs().length, temp: ${OR}.getTempObjectCount().total, pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_oracle/.test(String(p.note || '')); }).length })`);
    const perAttack = [ra.id, rb.id].map(id => ({ id, damageEvents: 0 }));
    const damageLog = await json(`${EA}.getLog().filter(function(e) { return e.type === 'damage'; }).map(function(e) { return e.id; })`);
    for (const p of perAttack) p.damageEvents = damageLog.filter(x => x === p.id).length;
    const log = Math.max(...perAttack.map(p => p.damageEvents));
    rec("E6 cleanup", d.pending === 0 && d.watchers === 0 && left.bolts === 0 && left.tele === 0 && left.temp === 0 && log === 1 && perAttack.every(p => p.damageEvents === 1) && (await hp()) < hp0, JSON.stringify({ d, left, perAttack }));
    await cooldown();
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e)); // Playtestの起動時の manifest.json の書き込みの失敗(前のNW.jsの終了直後に起きる環境の雑音。ゲームの処理ではない)
  rec("EZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a14_enemy_attack_results.json`, JSON.stringify({ note: "Playtest専用の敵(予約で攻撃)・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
