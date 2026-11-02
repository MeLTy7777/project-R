// Phase Apollo-A9: 実機(Playtest)の確認 — 月桂冠 Lv3(敵の遠距離攻撃を防ぐ)と神託 Lv1/Lv2(敵の弾の予告線・スロー)を、
//   「敵のEventがHendrix本体のspawnEventコマンドで撃った弾」で確かめる。弾の _inheritedEnemyName は Hendrix が付ける(このスクリプトは付けない)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a9_enemy_projectile_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   重要な区別: 現行の本番データ(Map001・CommonEvents・Map002のPrefab)には「敵が撃つ弾」も「敵の攻撃の予兆」も無い。
//   ここで使う弾は、Hendrixの公式パイプライン(敵Event → spawnEvent → 敵データの継承 → 前へ飛ぶ移動ルート)で作った DEV の弾(メモリ上のPrefab)で、
//   本番の敵の弾ではない。したがって「本番の敵の弾で確認済み」とは扱わない(監査文書 A9)。ファイルは書かない・セーブしない。入力はCDP。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const LAUREL = "ProjectRApolloLaurelWreath", ORACLE = "ProjectRApolloOracle";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const resetHp = () => ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
  const evCount = pattern => json(`$gameMap.events().filter(function(e) { return e && ${pattern}.test(e.event().note || ''); }).length`);
  // Hendrix公式の spawnEvent を、敵Event(<hp: 魔獣>)のインタプリタで実行する(= 敵が弾を撃つ)。向きは主人公へ。
  const shoot = (enemyId, x, y, degree) => ev(`(function() {
    var enemy = $gameMap.event(${enemyId}); enemy.locate(${x}, ${y});
    var before = $gameMap.events().map(function(e) { return e.eventId(); });
    var itp = new Game_Interpreter(); itp._eventId = ${enemyId};
    PluginManager.callCommand(itp, 'Hendrix_Action_Engine', 'spawnEvent', { eventId: 'DEV Enemy Test Bullet', position: 'this', startDegree: '${degree}', turnToward: '', notSpawnOn: '', attachTo: 'none', gridBased: 'false', permanent: 'false' });
    var made = $gameMap.events().filter(function(e) { return before.indexOf(e.eventId()) < 0; });
    return made.length ? made[0].eventId() : 0;
  })()`);
  const info = id => json(`(function() { var e = $gameMap.event(${id}); return e && !e._erased ? { x: e._realX, y: e._realY, inherited: e._inheritedEnemyName || null, rot: e._rotation } : null; })()`);
  const scene = async (level, kind) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(40 - id, 3); }); $gameParty.leader().setHp($gameParty.leader().mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    await resetHp(); await sleep(200);
    // 弾が遠くのEventに当たらないよう、動かない敵を弾の通り道から離す
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  // 敵の弾のPrefab(DEV・メモリ上だけ): 黄金の矢のPrefabの「前へ飛ぶ移動ルート」を複製し、note からApolloの印と <attacker: player> を外す
  await ev(`(function() {
    var src = $dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Golden Volley Arrow'; });
    var t = JSON.parse(JSON.stringify(src)); t.id = $dataTemplateMap.events.length; t.name = 'DEV Enemy Test Bullet'; t.note = '<hitbox: 0.3, 0.3>';
    $dataTemplateMap.events.push(t); return t.id; })()`);

  await check("P0 前提: 本番データに敵の弾・予兆は無い。アリーナの敵(<hp: 魔獣>)はHendrixのデータ上の敵。Hendrixのspawnで撃った弾に _inheritedEnemyName が付く(テストは付けない)", async () => {
    const prod = await json(`(function() { var out = { attackerEnemyTemplates: [], telegraphTags: 0 };
      $dataTemplateMap.events.forEach(function(e) { if (!e || e.name === 'DEV Enemy Test Bullet') return; var m = (e.note || '').match(/<attacker:\\s*(.+?)>/i); if (m && !/^(player|actor)/i.test(m[1].trim())) out.attackerEnemyTemplates.push(e.name); });
      out.enemy4 = !!($gameMap.event(4).databaseEnemy); out.enemyName = $gameMap.event(4).databaseEnemy && $gameMap.event(4).databaseEnemy.name;
      out.hendrixTelegraph = typeof window.ProjectRTelegraph !== 'undefined' || typeof ProjectRCombatPresence.getTelegraphs === 'function';
      return out; })()`);
    await scene(3, "laurel");
    const id = await shoot(4, 24, 15, 270); await sleep(150);
    const i = await info(id);
    rec("P0 前提", prod.attackerEnemyTemplates.length === 0 && prod.enemy4 === true && id > 0 && i && i.inherited === prod.enemyName && prod.hendrixTelegraph === false, JSON.stringify({ prod, id, i }));
    await ev(`var e = $gameMap.event(${id}); if (e) e.erase(); 'ok'`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500);
  });

  const noGrow = () => ev("ProjectRCardBalance.setOverride('apollo_laurel_wreath', 'constant', 'growSeconds', 3); 'ok'");
  await check("P1 月桂冠 Lv3(実機): 敵のEventが撃った弾(Hendrix公式のspawn)が根の範囲(半径5)に入った瞬間に消え、根の壁ができる。Lv2は防がない", async () => {
    await scene(3, "laurel"); await noGrow();
    await fireTap(); await sleep(300);
    const id = await shoot(4, 24, 15, 270);
    const alive0 = !!(await info(id));
    const t0 = Date.now(); let blocked = false;
    while (Date.now() - t0 < 8000) { if (!(await info(id))) { blocked = true; break; } await sleep(40); }
    await sleep(200);
    const stats = await json(`${LAUREL}.getStats()`), walls = await json(`${LAUREL}.getWalls().length`), wallEvents = await evCount("/projectRLaurelWall/");
    await s.shot("p1_wall");
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500);
    await scene(2, "laurel"); await noGrow();
    await fireTap(); await sleep(300);
    const id2 = await shoot(4, 24, 15, 270);
    let reached = false; const t1 = Date.now();
    while (Date.now() - t1 < 8000) { const i = await info(id2); if (!i) break; if (i.x < 10) { reached = true; break; } await sleep(40); }
    const lv2Alive = !!(await info(id2)) || reached;
    rec("P1 laurel", alive0 && blocked && stats.blocked >= 1 && walls >= 1 && wallEvents >= 1 && reached && lv2Alive, JSON.stringify({ alive0, blocked, stats, walls, wallEvents, reached }));
    await ev(`var e = $gameMap.event(${id2}); if (e) e.erase(); 'ok'`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500);
  });

  await check("P2 神託 Lv1(実機): 使ったあとに敵のEventが撃った最初の弾へ予告線が出て追従し、消えたら外れる。使う前に撃った弾・次の弾は予告しない", async () => {
    await scene(1, "oracle");
    const before = await shoot(4, 24, 15, 270);
    await fireTap(); await sleep(250);
    const none = (await json(`${ORACLE}.getTelegraphs()`)).length;
    await ev(`var e = $gameMap.event(${before}); if (e) e.erase(); 'ok'`);
    const next = await shoot(5, 24, 18, 270); await sleep(300);
    const t1 = await json(`${ORACLE}.getTelegraphs()`);
    await s.shot("p2_telegraph");
    const second = await shoot(6, 24, 12, 270); await sleep(250);
    const t3 = (await json(`${ORACLE}.getTelegraphs()`)).length;
    const heading = await info(next);
    await ev(`var e = $gameMap.event(${next}); if (e) e.erase(); 'ok'`); await sleep(300);
    const t4 = (await json(`${ORACLE}.getTelegraphs()`)).length;
    rec("P2 oracle", none === 0 && t1.length === 1 && t1[0].id === next && t1[0].hasSprite && Math.abs(t1[0].degree - 270) < 2 && t3 === 1 && t4 === 0 && heading && heading.inherited,
      JSON.stringify({ none, t1: t1.map(t => [t.id, t.degree, t.hasSprite]), t3, t4, second, heading }));
    await ev(`var e = $gameMap.event(${second}); if (e) e.erase(); 'ok'`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500);
  });

  await check("P3 神託 Lv2(実機): 敵のEventが撃った弾がスロー(x0.5)になる。自分は遅くならない", async () => {
    await scene(2, "oracle");
    await fireTap(); await sleep(250);
    const id = await shoot(4, 24, 15, 270); await sleep(200);
    const f = await ev(`ProjectRCardModifiers.characterSpeedFactor($gameMap.event(${id}))`), me = await ev("ProjectRCardModifiers.characterSpeedFactor($gamePlayer)");
    rec("P3 oracle slow", Math.abs(f - 0.5) < 1e-9 && me === 1, JSON.stringify({ f, me }));
    await ev(`var e = $gameMap.event(${id}); if (e) e.erase(); 'ok'`);
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(1000);
  });

  rec("PZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a9_enemy_projectile_results.json`, JSON.stringify({ note: "Hendrix公式のspawnで敵Eventが撃ったDEVの弾(本番の敵の弾ではない)。CDPの入力", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
