// Phase Apollo-A3: 実機(Playtest)の確認 — 押下時間の検出(実キー)・被ダメージ/弱点/状態の修飾(中立・1回だけ)・主人公+仲間の名簿。Apolloの8枚は未登録のまま。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a3_verify.cjs
//   新しいゲームはメモリ上に作り、押下プロファイル・修飾・仲間はこのセッションのメモリ上だけに足す(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const RESERVED = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async (card, lv) => { const r = await ev(`JSON.stringify(ProjectRHermesTest.start(${JSON.stringify(card)}, ${lv}))`); await sleep(400); await s.slow(1); return JSON.parse(r); };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000 - await barHp(id);
  const scene = async lv => { await start("sweep", lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]); await s.place(9, 15); await sleep(500); await locate(4, 12, 15); await resetHp(); await sleep(200); await s.aim(3, 0); };
  const DM = "ProjectRDamageModifiers", IN = "ProjectRCardBattleInput";
  // 実キー(CDPのキーイベント)。autoRepeat:true でキーリピートを再現する
  const keyEvent = (type, repeat) => c.send("Input.dispatchKeyEvent", { type, code: "KeyQ", windowsVirtualKeyCode: 81, key: "q", autoRepeat: !!repeat });
  const handSize = () => json("ProjectRCardDeck.getBattleState().hand.length");
  const pileSize = () => json("ProjectRCardDeck.getBattleState().cooldownPile.length");

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("P0 boot: 新しい共有基盤が読み込まれ、既定は中立(修飾なし・ポリシー未確定)。Apollo 8枚は未登録・CardModifiersが最外", async () => {
    const v = await json(`({ dm: !!${DM} && ${DM}.isInstalled(), policy: ${DM}.getPolicy(), reapply: ${DM}.getReapplyPolicy(), any: ${DM}.hasAny(), roster: !!ProjectRPartyRoster, press: typeof ${IN}.registerPressProfile,
      outer: !!PluginManager._commands['Hendrix_Action_Engine:UpdateEventHp'].__projectRCardModifiers, inactive: ProjectRCardCatalog.inactiveRuntimeCards(), registry: ProjectRCardDeck.definitions.cardDefinitions().length })`);
    rec("P0 boot", v.dm && v.policy === "uncommitted" && v.reapply === "uncommitted" && !v.any && v.roster && v.press === "function" && v.outer && v.inactive.length === 6 && JSON.stringify(v.inactive) === JSON.stringify(RESERVED.filter(id => id !== "apollo_golden_volley" && id !== "apollo_eros_arrow")) && v.registry === 16, JSON.stringify(v));
  });

  await check("P1 プロファイルなしは従来どおり: 実キーのQを押すと(押した次の更新で)薙ぎ払いが発動して50ダメージ。押下の記録は作られない", async () => {
    await scene(1);
    await c.tap("Q", 120); await settle(30);
    const dealt = await lost(4);
    const log = await json(`${IN}.getPressLog()`);
    rec("P1 default", dealt === 50 && log.length === 0, `dealt=${dealt} log=${log.length}`);
  });

  await check("P2 押下時間(実キー): 押している間はカードを消費せず、短押し=tap・長押し=holdで離した時に1回だけ発動(fireOn:release)", async () => {
    const results = {};
    for (const [name, holdMs] of [["tap", 150], ["hold", 900]]) {
      await scene(1);
      await ev(`${IN}.registerPressProfile('hermes_sweep', { holdSeconds: 0.5, fireOn: 'release' }); 'reg'`);
      await keyEvent("keyDown", false);
      await sleep(Math.min(holdMs, 250));
      const mid = { hand: await handSize(), pile: await pileSize(), sessions: await json(`${IN}.getPressSessions().length`), dealt: await lost(4) };
      await sleep(Math.max(0, holdMs - 250));
      await keyEvent("keyUp", false);
      await settle(20);
      results[name] = { mid, pile: await pileSize(), dealt: await lost(4), last: await json(`${IN}.getLastResult()`), log: (await json(`${IN}.getPressLog()`)).map(e => e.type + (e.variant ? ":" + e.variant : "")) };
      await ev(`${IN}.unregisterPressProfile('hermes_sweep'); 'unreg'`);
    }
    const ok = results.tap.mid.hand === 5 && results.tap.mid.pile === 0 && results.tap.mid.dealt === 0 && results.tap.mid.sessions === 1
      && results.tap.last.variant === "tap" && results.tap.dealt === 50 && results.tap.log.indexOf("release:tap") >= 0
      && results.hold.mid.pile === 0 && results.hold.last.variant === "hold" && results.hold.dealt === 50 && results.hold.log.indexOf("hold") >= 0 && results.hold.log.indexOf("release:hold") >= 0;
    rec("P2 tap/hold", ok, JSON.stringify(results).slice(0, 600));
  });

  await check("P3 キーリピートと取消(実キー): 押しっぱなしのキーリピートでセッションは増えず発動しない。会話の表示で取消され、離しても発動しない", async () => {
    await scene(1);
    await ev(`${IN}.registerPressProfile('hermes_sweep', { holdSeconds: 0.5, fireOn: 'release' }); 'reg'`);
    const pressesBefore = await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'press'; }).length`); // 記録は押下をまたいで残る(P2の分)
    await keyEvent("keyDown", false);
    for (let i = 0; i < 8; i++) { await keyEvent("keyDown", true); await sleep(40); }
    const during = await json(`({ sessions: ${IN}.getPressSessions().length, presses: ${IN}.getPressLog().filter(function(e) { return e.type === 'press'; }).length - ${pressesBefore} })`);
    await ev("$gameMessage.add('取消テスト'); 'msg'"); await settle(6);
    const cancelled = await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'cancel'; }).map(function(e) { return e.reason; })`);
    await ev("$gameMessage.clear(); 'clear'");
    await keyEvent("keyUp", false); await settle(20);
    const after = { pile: await pileSize(), dealt: await lost(4), sessions: await json(`${IN}.getPressSessions().length`) };
    await ev(`${IN}.unregisterPressProfile('hermes_sweep'); 'unreg'`);
    rec("P3 repeat+cancel", during.sessions === 1 && during.presses === 1 && cancelled.length === 1 && /^blocked:/.test(cancelled[0]) && after.pile === 0 && after.dealt === 0 && after.sessions === 0, JSON.stringify({ during, cancelled, after }));
  });

  await check("D1 被ダメージ倍率は中立が既定で、登録すれば実機のカードで1回だけ: 薙ぎ払い 50 → 75(×1.5)。他の敵は変わらず、外すと50に戻る", async () => {
    await scene(1);
    await c.tap("Q", 80); await settle(30); const neutral = await lost(4);
    await scene(1);
    await ev(`${DM}.add({ id: 'v.taken', kind: 'damageTaken', target: 'event:4', value: 1.5 }); ${DM}.setTracing(true); ${DM}.clearTrace(); 'add'`);
    await c.tap("Q", 80); await settle(30);
    const boosted = await lost(4);
    const trace = await json(`${DM}.getTrace().filter(function(t) { return t.type === 'damage'; })`);
    // 同じ条件で別の敵(5番)へのキーなら中立
    await ev(`${DM}.clear(); ${DM}.add({ id: 'v.other', kind: 'damageTaken', target: 'event:5', value: 3 }); 'other'`);
    await scene(1);
    await c.tap("Q", 80); await settle(30);
    const other = await lost(4);
    await ev(`${DM}.clear(); 'clear'`);
    rec("D1 once", neutral === 50 && boosted === 75 && trace.length === 1 && trace[0].source === "hermes_sweep" && other === 50, JSON.stringify({ neutral, boosted, trace, other }));
  });

  await check("D2 実際の剣(通常攻撃)と一閃の多段にも、各ヒット1回だけ(剣 ×1.5 ≒、一閃 直接300+分割26+26+24 = 376)", async () => {
    await start("sweep", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 10, 15); await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'eq'"); await resetHp(); await sleep(300);
    const attack = async () => { const f = await s.foot(); await c.pointer(f.x + 48, f.y - 24); await sleep(120); await c.tap("J", 120); await settle(8); };
    await attack(); const base = await lost(4); await settle(30); await resetHp();
    await ev(`${DM}.add({ id: 'v.taken', kind: 'damageTaken', target: 'enemies', value: 1.5 }); 'add'`);
    await attack(); const boosted = await lost(4); await settle(30);
    await ev(`${DM}.clear(); 'clear'`);
    await start("issen", 1); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, 13, 15); await resetHp(); await sleep(200);
    await ev(`${DM}.add({ id: 'v.taken', kind: 'damageTaken', target: 'enemies', value: 1.5 }); ${DM}.setTracing(true); ${DM}.clearTrace(); 'add'`);
    await s.aim(4, 0); await c.tap("Q", 60); await settle(60 * 4 + 20);
    const issen = await lost(4);
    const hits = await json(`${DM}.getTrace().filter(function(t) { return t.type === 'damage'; }).length`);
    await ev(`${DM}.clear(); 'clear'`);
    rec("D2 weapon+multihit", base > 0 && Math.abs(boosted - base * 1.5) <= 1 && issen === 376 && hits === 4, JSON.stringify({ base, boosted, issen, hits }));
  });

  await check("D3 重ねがけは未確定(既定=中立で衝突を記録)→ 選ぶと乗算/加算。弱点修飾(対象別)と状態(期間・戦闘時計)", async () => {
    await scene(1);
    await ev(`${DM}.add({ id: 'v.a', kind: 'damageTaken', target: 'event:4', value: 1.5 }); ${DM}.add({ id: 'v.b', kind: 'damageTaken', target: 'enemies', value: 2 }); ${DM}.clearConflicts(); 'two'`);
    await c.tap("Q", 80); await settle(30); const uncommitted = await lost(4);
    const conflicts = await json(`${DM}.getConflicts().length`);
    await ev(`${DM}.setPolicy('multiplicative'); 'mul'`); await scene(1); await ev(`${DM}.add({ id: 'v.a', kind: 'damageTaken', target: 'event:4', value: 1.5 }); ${DM}.add({ id: 'v.b', kind: 'damageTaken', target: 'enemies', value: 2 }); ${DM}.setPolicy('multiplicative'); 'again'`);
    await c.tap("Q", 80); await settle(30); const multiplicative = await lost(4);
    await ev(`${DM}.clear(); ${DM}.setPolicy('uncommitted'); 'reset'`);
    // 弱点修飾(炎に弱い敵に、薙ぎ払いを炎属性にして)
    await ev("$dataEnemies[5].traits = $dataEnemies[5].traits.concat([{code:11,dataId:2,value:2}]); ProjectRCardBalance.setOverride('hermes_sweep', 'constant', 'element', 2); 'fire'");
    await scene(1); await c.tap("Q", 80); await settle(30); const weak = await lost(4);
    await scene(1); await ev(`${DM}.add({ id: 'v.w', kind: 'weakness', target: 'event:4', value: 1.5, mode: 'rateMultiplier' }); 'w'`);
    await c.tap("Q", 80); await settle(30); const scoped = await lost(4);
    await ev(`${DM}.clear(); ProjectRCardBalance.resetAll(); 'cleanup'`);
    // 状態: 戦闘時計で期限が来ると外れる
    await scene(1);
    await ev(`${DM}.status.apply({ id: 'disease', target: 'event:4', seconds: 5, modifiers: [{ kind: 'damageTaken', value: 1.05 }] }); 'status'`);
    const has1 = await json(`${DM}.status.has('disease', 'event:4')`);
    await ev("ProjectRCardDeck.updateCooldown(5.1); 'tick'");
    const has2 = await json(`${DM}.status.has('disease', 'event:4')`);
    const any = await json(`${DM}.hasAny()`);
    rec("D3 policy+weakness+status", uncommitted === 50 && conflicts >= 1 && multiplicative === 150 && weak === 100 && scoped === 150 && has1 === true && has2 === false && any === false,
      JSON.stringify({ uncommitted, conflicts, multiplicative, weak, scoped, has1, has2, any }));
  });

  await check("D4 主人公への被ダメージ倍率(UpdatePlayerHp): 中立で20 → 登録(0.5)で10、回復は変わらず、gainHpの包みは外れる", async () => {
    const v = await json(`(function() { var L = $gameParty.leader(); var cmd = function(n, a) { PluginManager.callCommand(new Game_Interpreter(), 'Hendrix_Action_Engine', n, a); };
      var loss = function(fn) { L.setHp(L.mhp); var b = L.hp; fn(); return b - L.hp; };
      var out = { neutral: loss(function() { cmd('UpdatePlayerHp', { value: '-20', target: 'player' }); }) };
      ${DM}.add({ id: 'v.p', kind: 'damageTaken', target: 'player', value: 0.5 });
      out.halved = loss(function() { cmd('UpdatePlayerHp', { value: '-20', target: 'player' }); });
      L.setHp(L.mhp - 40); var h = L.hp; cmd('UpdatePlayerHp', { value: '15', target: 'player' }); out.heal = L.hp - h;
      out.wrapped = Object.prototype.hasOwnProperty.call(L, 'gainHp'); ${DM}.clear(); L.setHp(L.mhp); return out; })()`);
    rec("D4 player", v.neutral === 20 && v.halved === 10 && v.heal === 15 && v.wrapped === false, JSON.stringify(v));
  });

  await check("R1 名簿(読み取り専用): 既定は主人公だけ。PartyCombatのセッションで仲間が加わり、ダウンは除外、NPC・敵は含まれず、仲間の状態は名簿の参照で変わらない", async () => {
    const v = await json(`(function() { var R = ProjectRPartyRoster, P = ProjectRPartyCombat; var out = { start: R.members().map(function(m) { return m.key; }) };
      [2, 3].forEach(function(id) { P.registerAlly({ actorId: id, name: 'ally' + id, maxHp: 80, normalAttack: { id: 'n' + id, range: 1.5, cooldownSeconds: 1 } }); }); P.startSession([2, 3]);
      var before = JSON.stringify(P.members()); var intents = JSON.stringify(P.getIntentLog());
      out.party = R.members().map(function(m) { return m.key; }); out.isPartyEvent5 = R.isPartyEvent(5); out.npcKey = R.keyForEvent(5);
      var copy = R.allies(); copy[0].hp = 99999; out.unchanged = JSON.stringify(P.members()) === before && JSON.stringify(P.getIntentLog()) === intents;
      P.damageAlly(2, 9999); out.afterDown = R.allies().map(function(a) { return a.key; }); out.withDown = R.allies({ includeDown: true }).map(function(a) { return a.key; });
      P.endSession(); out.end = R.members().map(function(m) { return m.key; }); return out; })()`);
    rec("R1 roster", JSON.stringify(v.start) === '["player"]' && JSON.stringify(v.party) === '["player","ally:2","ally:3"]' && v.isPartyEvent5 === false && v.npcKey === null && v.unchanged === true
      && JSON.stringify(v.afterDown) === '["ally:3"]' && JSON.stringify(v.withDown) === '["ally:2","ally:3"]' && JSON.stringify(v.end) === '["player"]', JSON.stringify(v));
  });

  await check("C1 互換: Apollo 8枚は未登録のまま、旧Apollo 3枚の定義は不変、セーブ内容は修飾・押下プロファイルの有無で同一", async () => {
    const v = await json(`(function() { var a = JSON.stringify(DataManager.makeSaveContents());
      ${DM}.add({ id: 'v.save', kind: 'damageTaken', target: 'any', value: 2 }); ${IN}.registerPressProfile('hermes_sweep', { holdSeconds: 0.5, fireOn: 'release' });
      var b = JSON.stringify(DataManager.makeSaveContents()); ${DM}.clear(); ${IN}.unregisterPressProfile('hermes_sweep');
      var legacy = ['apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; });
      return { same: a === b, noKeys: a.indexOf('ProjectRDamageModifiers') < 0 && a.indexOf('pressProfile') < 0, legacy: legacy, inactive: ProjectRCardCatalog.inactiveRuntimeCards().length, registry: ProjectRCardDeck.definitions.cardDefinitions().length }; })()`);
    rec("C1 compat", v.same && v.noKeys && JSON.stringify(v.legacy) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]) && v.inactive === 6 && v.registry === 16, JSON.stringify(v));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a3_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
