// Phase Apollo-A16: 実機(Playtest)の確認 — DEVボス戦の縦断スライス(ProjectRBossTest)。
//   ボスの攻撃は ProjectREnemyAttack の本物の予約(溜め → 実行)・Hendrixの弾/判定Event・公式の UpdateEventHp。入力はCDPの実キー・実マウス(人間の手動プレイの代わりではない)。
//   B0 開始: 指輪の一時付与 + 30枚の混成デッキ(検証つき)+ ボス。指定の最初の手札。終了で一時データが戻る
//   B1 移動・照準: 実キー WASD で動く(速さを計測)・マウスで狙う
//   B2 攻撃: G17(J)・剣(J)がボスのHPを減らす(1発・1振りのダメージを計測)
//   B3 遠距離: 神託(Q)で予兆が見える → 実行 → 動かなければ1回だけダメージ。実キーで横へ動けば避けられる
//   B4 近接: 予兆の範囲 → 動かなければダメージ。実キーで離れれば避けられる(避けるのに足りる時間か計測)
//   B5 防御: 月桂冠 Lv3(Q)が本物の弾を防ぐ / ヒュアキントス(Q)で被ダメージが x0.1
//   B6 フェーズ・連射・自動攻撃: HPを公式のUpdateEventHpで減らす → フェーズが進み、攻撃が速く・連射になる
//   B7 勝利・敗北・後片付け
//   B8 仲間(DEVのつなぎ): ボスの攻撃が仲間に当たる(本番の仲間統合ではない)
//   B9 性能: 自動攻撃 + カードを使い続ける30秒の Game_Map.update の時間・fps・Event数(ボスなしとの比較)
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a16_boss_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const BT = "ProjectRBossTest", EA = "ProjectREnemyAttack", BF = "ProjectRBossFramework", OR = "ProjectRApolloOracle", LA = "ProjectRApolloLaurelWreath", HY = "ProjectRApolloHyacinthus", AT = "ProjectRApolloTest";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const measures = {};
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  const hp = () => ev("$gameParty.leader().hp");
  const bossHp = () => ev("ProjectRCardModifiers.eventHp(3)");
  const bolts = () => json("$gameMap.events().filter(function(e) { return e && !e._erased && /projectRTestEnemy(Bolt|Melee)|projectRBossMelee/.test(e.event().note || ''); }).length");
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const hold = async (key, ms) => { await c.keyDown(key); await sleep(ms); await c.keyUp(key); };
  const tele = () => json(`${OR}.getTelegraphs()`);
  const report = () => json(`${BT}.getReport()`);
  const fireTap = async (key = "Q") => { await c.keyDown(key); await sleep(70); await c.keyUp(key); };
  const KEYS = ["Q", "E", "X", "C", "V"];
  const useByKey = async cardId => { const hand = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"); const i = hand.indexOf(cardId); if (i < 0) return { ok: false, reason: "notInHand", hand }; await fireTap(KEYS[i]); return { ok: true, key: KEYS[i], hand }; };
  const prep = async () => {
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 'ok'; })()");
  };
  const begin = async (opts = {}) => {
    await ev("$gamePlayer.locate(9, 15); $gamePlayer._realX = 9; $gamePlayer._realY = 15; $gamePlayer.center(9, 15); 'ok'"); await sleep(400);
    await s.slow(1);
    const r = await json(`${BT}.start(${JSON.stringify({ deck: "mixed", level: 2, maxHp: 4000, autoAttack: false, startDistance: 9, ...opts })})`);
    if (!r.ok) throw new Error("boss start failed " + JSON.stringify(r));
    await sleep(500); await prep();
    await ev("(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === 3; }); return b ? 'bar' : 'nobar'; })()");
    return r;
  };
  const finish = async () => { const r = await json(`${BT}.end()`); await sleep(7000); return r; };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000); // 起動が終わる前にマップへ移ると、ウィンドウスキン未読込のエラーになる
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  // 性能の基準: ボスなし(同じマップ)の rAF のfps
  const fps = async ms => ev(`new Promise(function(res) { var n = 0, t0 = performance.now(); function f(t) { n++; if (t - t0 >= ${ms}) res(n * 1000 / (t - t0)); else requestAnimationFrame(f); } requestAnimationFrame(f); })`);
  measures.fpsIdle = await fps(3000);

  await check("B0 開始: 指輪の一時付与・30枚の混成デッキ(検証つき)・指定の最初の手札・ボス(HP4000・3フェーズ)。二重開始は拒否", async () => {
    const hand = ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "hermes_strength", "apollo_golden_volley"];
    const r = await begin({ openingHand: hand });
    const info = await json(`${AT}.deckInfo()`), st = await json(`${BF}.getState()`), again = await json(`${BT}.start({})`);
    await s.shot("b0_boss_start");
    rec("B0 start", r.ok && JSON.stringify(r.hand.slice().sort()) === JSON.stringify(hand.slice().sort()) && info.size === 30 && info.valid && info.inventoryReasons.length === 0 && info.rings.apollo && info.rings.hermes
      && st.maxHp === 4000 && st.phaseCount === 3 && again.reason === "alreadyRunning", JSON.stringify({ hand: r.hand, size: info.size, valid: info.valid, rings: info.rings, boss: st && [st.hp, st.maxHp], again: again.reason }));
  });

  await check("B1 移動・照準(実キー): WASD で動く・速さを計測・マウスで狙う", async () => {
    await s.place(9, 15); await sleep(300);
    const p0 = await pos(); await hold("D", 1000); await sleep(150); const p1 = await pos(); await hold("S", 500); await sleep(150); const p2 = await pos(); await hold("A", 1000); await sleep(150); const p3 = await pos(); await hold("W", 500); await sleep(150); const p4 = await pos();
    const aim = await s.aim(5, -2);
    const speed = (p1.x - p0.x);
    measures.playerTilesPerSecond = speed;
    rec("B1 move+aim", p1.x > p0.x + 1 && p2.y > p1.y + 0.5 && p3.x < p2.x - 1 && p4.y < p3.y - 0.5 && aim && typeof aim.x === "number", JSON.stringify({ tilesPerSec: +speed.toFixed(2), p: [p0, p1, p2, p3, p4], aim }));
  });

  await check("B2 攻撃(実キーJ・マウス照準): G17 と剣がボスのHPを減らす。1発・1振りのダメージを計測する", async () => {
    await s.place(9, 15); await sleep(300);
    const equip = id => ev(`$gameParty.leader().forceChangeEquip(0, $dataWeapons[${id}]); 'eq'`);
    const gun0 = await ev("ProjectRGunSystem.status().shots"), hp0 = await bossHp();
    await equip(51); await sleep(300);
    const boss = await json("({ x: $gameMap.event(3)._realX, y: $gameMap.event(3)._realY })");
    const p = await pos(); await s.aim(boss.x - p.x, boss.y - p.y); await sleep(200);
    for (let i = 0; i < 4; i++) { await c.tap("J", 100); await sleep(450); }
    await sleep(2500);
    const gunShots = (await ev("ProjectRGunSystem.status().shots")) - gun0, hp1 = await bossHp();
    // 剣: ボスの隣へ
    await json(`(function() { $gameMap.event(3).setPosition($gamePlayer._realX + 1.1, $gamePlayer._realY); return 1; })()`); await sleep(200);
    await equip(2); await sleep(300); await s.aim(2, 0); await sleep(150);
    for (let i = 0; i < 3; i++) { await c.tap("J", 100); await sleep(700); }
    await sleep(800);
    const hp2 = await bossHp();
    measures.gunDamagePerShot = gunShots ? (hp0 - hp1) / gunShots : null; measures.swordDamagePerSwing = (hp1 - hp2) / 3;
    await s.shot("b2_attack");
    rec("B2 attacks", gunShots >= 1 && hp1 < hp0 && hp2 < hp1, JSON.stringify({ gunShots, gunLost: hp0 - hp1, swordLost: hp1 - hp2, perShot: measures.gunDamagePerShot, perSwing: measures.swordDamagePerSwing }));
  });
  await finish();

  await check("B3 遠距離(神託Q・実キー): 予兆が見える(向き・溜め)→ 実行 → 動かなければ1回ダメージ。実キーで横へ動けば避けられる", async () => {
    await begin({ openingHand: ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "hermes_strength", "apollo_golden_volley"] });
    await s.place(9, 15); await sleep(300);
    const used = await useByKey("apollo_oracle"); await sleep(400);
    const out = [];
    for (const dodge of [false, true]) {
      await s.place(9, 15); await sleep(250);
      await json(`(function() { $gameMap.event(3).setPosition(18.5, 14.5); return 1; })()`);
      const hp0 = await hp();
      const a = await json(`${BT}.attackNow('ranged')`);
      await sleep(350);
      const t = await tele(); if (!dodge) await s.shot("b3_ranged_telegraph");
      if (dodge) { await hold("S", 700); }
      await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000);
      await wait(`$gameMap.events().filter(function(e) { return e && !e._erased && /projectRTestEnemyBolt/.test(e.event().note || ''); }).length === 0`, 9000); await sleep(300);
      const o = await json(`${EA}.getOutcome(${a.id})`);
      out.push({ dodge, telegraphs: t.length, kind: t[0] && t[0].kind, degree: t[0] && Math.round(t[0].degree), lost: hp0 - await hp(), damaged: o.damaged === true });
      await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 1; })()");
    }
    rec("B3 ranged", used.ok && out[0].telegraphs === 1 && out[0].kind === "ranged" && Math.abs(out[0].degree - 270) < 4 && out[0].damaged && out[0].lost > 0 && !out[1].damaged && out[1].lost <= 0, JSON.stringify(out));
  });

  await finish();
  await check("B4 近接(神託Q・実キー): 予兆の範囲 → 動かなければダメージ。実キーで離れれば避けられる", async () => {
    await begin({ openingHand: ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "hermes_strength", "apollo_golden_volley"] });
    const out = [];
    for (const dodge of [false, true]) {
      await s.place(9, 15); await sleep(250);
      if (!dodge) { await useByKey("apollo_oracle"); await sleep(300); }
      await json(`(function() { $gameMap.event(3).setPosition(10.2, 14.5); return 1; })()`);
      const hp0 = await hp();
      const a = await json(`${BT}.attackNow('melee')`);
      await sleep(250);
      const t = await tele(); if (!dodge) await s.shot("b4_melee_telegraph");
      if (dodge) { await hold("A", 450); }
      await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000); await sleep(600);
      const o = await json(`${EA}.getOutcome(${a.id})`);
      out.push({ dodge, kind: t[0] && t[0].kind, area: t[0] && t[0].area && [t[0].area.width, t[0].area.height], lost: hp0 - await hp(), damaged: o.damaged === true, windup: a.framesLeft });
      await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 1; })()");
      await sleep(600);
    }
    rec("B4 melee", out[0].kind === "melee" && out[0].damaged && out[0].lost > 0 && !out[1].damaged && out[1].lost <= 0, JSON.stringify(out));
    measures.meleeWindupFrames = out[0].windup;
  });
  await finish();

  await check("B5 防御: 月桂冠 Lv3(Q)が本物の弾を防ぐ(ダメージなし)/ ヒュアキントス(Q)で弾のダメージが x0.1", async () => {
    await begin({ level: 3, openingHand: ["apollo_laurel_wreath", "apollo_hyacinthus", "apollo_oracle", "hermes_strength", "apollo_golden_volley"] });
    await s.place(9, 15); await sleep(300);
    await json(`(function() { $gameMap.event(3).setPosition(18.5, 14.5); return 1; })()`);
    const ul = await useByKey("apollo_laurel_wreath"); await sleep(600); // 月桂冠
    const hp0 = await hp();
    const a = await json(`${BT}.attackNow('ranged')`);
    await wait(`${EA}.getOutcome(${a.id}) && ${EA}.getOutcome(${a.id}).state === 'fired'`, 4000); await sleep(3500);
    await s.shot("b5_laurel");
    const st = await json(`${LA}.getStats()`), o = await json(`${EA}.getOutcome(${a.id})`), hpMid = await hp();
    await sleep(8000); // 根が消えるのを待つ
    // ヒュアキントス(手札2枚目 = 次のキー)。被ダメージを比べる
    await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 1; })()");
    const full = await hp();
    const uh = await useByKey("apollo_hyacinthus"); await sleep(400);
    const b = await json(`${BT}.attackNow('ranged')`);
    await wait(`${EA}.getOutcome(${b.id}) && ${EA}.getOutcome(${b.id}).state === 'fired'`, 4000);
    await wait(`$gameMap.events().filter(function(e) { return e && !e._erased && /projectRTestEnemyBolt/.test(e.event().note || ''); }).length === 0`, 9000); await sleep(300);
    const ob = await json(`${EA}.getOutcome(${b.id})`), lostH = full - await hp();
    rec("B5 defense", ul.ok && uh.ok && st.blocked >= 1 && o.damaged !== true && hpMid >= hp0 && ob.damaged === true && lostH >= 0 && lostH <= 3, JSON.stringify({ blocked: st.blocked, laurelDamaged: o.damaged === true, hp: [hp0, hpMid], hyacinthLost: lostH, hyDamaged: ob.damaged === true }));
  });
  await finish();

  await check("B6 フェーズ・連射・自動攻撃: HPを公式の UpdateEventHp で減らすとフェーズが進む(第二 66% / 第三 33%)。自動攻撃は近ければ近接、遠ければ遠距離。第三形態は3連射", async () => {
    await begin({ maxHp: 90000, autoAttack: true, openingHand: ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "hermes_strength", "apollo_golden_volley"] });
    await s.place(9, 15); await sleep(300);
    const dmg = amt => ev(`(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '3', value: '-${amt}', exceedMaxHealth: 'false' }); return 'hit'; })()`);
    await sleep(5000);
    const r1 = await report(), ph1 = (await json(`${BF}.getState()`)).phaseIndex, closed = await json("$gameMap.event(3)._realX - $gamePlayer._realX");
    measures.bossClosedDistance = closed;
    await json(`${BT}.setConfig({ holdDistance: 99 })`); // 以降は止まって撃つ(連射の確認)
    await json("(function() { $gameMap.event(3).setPosition($gamePlayer._realX + 10, $gamePlayer._realY); return 1; })()");
    await dmg(31500); await sleep(500); const ph2 = (await json(`${BF}.getState()`)).phaseIndex;
    await dmg(30000); await sleep(500); const ph3 = (await json(`${BF}.getState()`)).phaseIndex;
    await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 1; })()");
    await sleep(9000);
    const r3 = await report();
    const ranged3 = r3.attacks.list.filter(a => a.phase === 2 && a.kind === "ranged");
    await s.shot("b6_phase3");
    rec("B6 phases", ph1 === 0 && ph2 === 1 && ph3 === 2 && r1.attacks.announced >= 1 && closed < 3 && r3.attacks.byKind.ranged.announced >= 3 && ranged3.length >= 3 && ranged3.some(a => a.windup < 44) && !r3.error,
      JSON.stringify({ closed, phases: [ph1, ph2, ph3], attacks1: r1.attacks.byKind, attacks3: r3.attacks.byKind, windups3: ranged3.slice(0, 6).map(a => a.windup), phaseFrames: r3.phaseFrames, error: r3.error }));
  });
  await finish();

  await check("B7 勝利・敗北・後片付け: ボスHP0で勝利し攻撃が止まる / 主人公HP0で敗北し攻撃が止まる / 終了で弾・判定・予約・状態が残らない", async () => {
    await begin({ maxHp: 4000, autoAttack: true });
    await s.place(9, 15); await sleep(2500);
    await ev("(function() { var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '3', value: '-4000', exceedMaxHealth: 'false' }); return 'kill'; })()");
    await sleep(1200);
    const v = await report(), vAnn = v.attacks.announced; await sleep(3000);
    const v2 = await report(), active1 = await json(`${BF}.isActive()`), left = await bolts();
    await s.shot("b7_victory");
    const e1 = await finish();
    await begin({ maxHp: 90000, autoAttack: true });
    await s.place(9, 15); await sleep(2000);
    await ev("(function() { var a = $gameParty.leader(); a.setHp(1); var i = new Game_Interpreter(); i._eventId = 0; PluginManager.callCommand(i, 'Hendrix_Action_Engine', 'UpdatePlayerHp', { target: 'player', value: '-9999' }); return 'dead'; })()");
    await sleep(2500);
    const d = await report(), dAnn = d.attacks.announced; await sleep(3000);
    const d2 = await report(), left2 = await bolts();
    const e2 = await finish();
    // 敗北(PlayerDeath)後、プレイヤーは死亡のまま(自動の復活・リトライは無い)。次の戦闘の前にHPを戻す。戻さないと、新しい戦闘がすぐ「敗北」で終わる(B8で確認した)
    measures.deadAfterDefeat = await ev("ProjectR.PlayerDeath.isDead()");
    await ev("(function() { var a = $gameParty.leader(); a.setHp(a.mhp); return 1; })()"); await sleep(300);
    measures.deadAfterHeal = await ev("ProjectR.PlayerDeath.isDead()");
    const clean = await json(`({ pending: ${EA}.list().length, boss: ${BF}.isActive(), battle: ProjectRCardDeck.isCardBattleActive(), dirty: ${AT}.isDirty(), status: ProjectRApolloStatus.list().length, bolts: 0 })`);
    clean.bolts = await bolts();
    rec("B7 end", measures.deadAfterDefeat === true && measures.deadAfterHeal === false && v.over === "victory" && !active1 && v2.attacks.announced === vAnn && left === 0 && e1.reset.restored && d.over === "defeat" && d2.attacks.announced === dAnn && left2 === 0 && e2.reset.restored && clean.pending === 0 && !clean.boss && !clean.battle && !clean.dirty && clean.status === 0 && clean.bolts === 0,
      JSON.stringify({ victory: v.over, annAfterVictory: [vAnn, v2.attacks.announced], defeat: d.over, annAfterDefeat: [dAnn, d2.attacks.announced], clean }));
  });

  await check("B8 仲間(DEVのつなぎ。本番の仲間統合ではない): ボスの攻撃が仲間に当たる。終了で仲間の状態が残らない", async () => {
    const st8 = await begin({ allies: 2 });
    const right = await json("ProjectRPartyCombat.isActive()");
    await s.place(9, 15); await sleep(400);
    await json(`(function() { $gameMap.event(3).setPosition(18.5, 12.5); return 1; })()`);
    await json("ProjectRTestEnemies.clearAllyHits()");
    const roster = await json("ProjectRPartyRoster.members().map(function(m) { return m.key; })");
    const a = await json(`(function() { var al = $gameMap.event(5), b = $gameMap.event(3); var deg = ((Math.atan2(al._realX - b._realX, -(al._realY - b._realY)) * 180 / Math.PI) % 360 + 360) % 360; ProjectRTestEnemies.registerBolt(); return ProjectREnemyAttack.schedule({ eventId: 3, kind: 'ranged', windupFrames: 20, degree: deg, template: ProjectRTestEnemies.BOLT, length: 14 }); })()`);
    await wait("ProjectRTestEnemies.getAllyHits().length > 0", 10000); await sleep(300);
    const hits = await json("ProjectRTestEnemies.getAllyHits()"), ally = await json("ProjectRPartyCombat.members()");
    await s.shot("b8_ally");
    const e = await finish();
    const after = await json("({ active: ProjectRPartyCombat.isActive(), linked: $gameMap.event(5).linkedActorId })");
    rec("B8 allies", a.ok && JSON.stringify(roster) === JSON.stringify(["player", "ally:2", "ally:3"]) && hits.length >= 1 && hits[0].amount === 30 && ally.some(m => m.hp === 370) && e.reset.restored && !after.active && !after.linked, JSON.stringify({ started: st8.allies, activeRightAfterStart: right, roster, hits: hits.length, ally: ally.map(m => [m.actorId, m.hp]), after }));
  });

  await check("B9 性能: 自動攻撃 + カードを使い続ける30秒。Game_Map.update の時間(平均/p95/最大)・fps・Event数。ボスなしと比べる", async () => {
    await begin({ maxHp: 90000, autoAttack: true, level: 3 });
    await s.place(9, 15); await sleep(300);
    const t0 = Date.now(); let used = 0;
    const fpsP = fps(10000);
    while (Date.now() - t0 < 30000) {
      const r = await json("(function() { var d = ProjectRCardDeck, h = d.getBattleState().hand; for (var i = 0; i < h.length; i++) { var r = d.requestUseCard(i); if (r && (r.ok || r.pending)) return 1; } return 0; })()");
      used += r || 0;
      await ev("(function() { var a = $gameParty.leader(); if (a.hp < a.mhp * 0.5) a.setHp(a.mhp); return 1; })()");
      await c.tap("J", 60); await sleep(900);
    }
    const f = await fpsP, r = await report();
    measures.fpsBoss = f; measures.mapUpdateMs = r.mapUpdateMs; measures.maxEvents = r.maxEvents;
    await s.shot("b9_perf");
    await finish();
    rec("B9 perf", !r.error && r.mapUpdateMs.n > 1000 && r.mapUpdateMs.p95 < 16.7 && f > 40 && r.maxEvents < 400, JSON.stringify({ fpsIdle: +measures.fpsIdle.toFixed(1), fpsBoss: +f.toFixed(1), mapUpdateMs: r.mapUpdateMs, maxEvents: r.maxEvents, cardsUsed: used, attacks: r.attacks.byKind }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e)); // Playtestの起動時の manifest.json の書き込みの失敗(環境の雑音。ゲームの処理ではない)
  rec("BZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/apollo_a16_boss_results.json`, JSON.stringify({ note: "Playtest専用のDEVボス・CDPの入力(人間の手動プレイの代わりではない)", measures, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  console.log("measures", JSON.stringify(measures));
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
