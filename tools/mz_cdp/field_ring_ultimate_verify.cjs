// Stage 1E-1: RingLoadout の Q 奥義(ヘルメース・アポロン)を、指輪モードのフィールド戦闘で実機(MZ Playtest)で確認する。CDP の実際のキー・マウスで操作する。
//   U1 Q が空(奥義なし・Core の選択が別でも漏れない)   U2 Q=ヘルメース   U3 Q=アポロン(いずれも ULTIMATE メニュー側は別の指輪)
//   U4 未実装の指輪(一時の指輪 zeus。Athena は Stage 4 で実装済み)・戦闘中の指輪の移動の拒否・U は戦闘外では従来どおり    U9 Console のエラーなし・保存の書き込みなし
//   U は指輪モードの戦闘中は無効(Q だけが奥義の入口)。ゲージは既存の共有ゲージ(テストでは addUltimateGauge で満タンにする)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_ring_ultimate_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", RL = "ProjectRRingLoadout", D = "ProjectRCardDeck";
const H5 = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"];
const A5 = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const SLOTS = ["lmb", "shift", "e", "x", "c"];
(async () => {
  const s = await session({ field: true, ring: true }); const { ev, c, rec, sleep } = s;
  const ONLY = (process.env.MZ_ONLY || '').split(',').filter(Boolean);
  const check = async (id, fn) => { if (ONLY.length && !ONLY.some(o => id.startsWith(o))) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const putEnemy = (id, dx, dy) => ev(`(function(){ var e = $gameMap.event(${id}), x = $gamePlayer._realX + (${dx}), y = $gamePlayer._realY + (${dy}); e.locate(x, y); e._realX = x; e._realY = y; return 'ok'; })()`);
  const evScreen = id => json(`(function(){ var e = $gameMap.event(${id}); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()`);
  const aimAt = async id => { await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(120); const p = await evScreen(id); await c.pointer(p.x, p.y); return p; };
  const aimDx = async dx => { await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(120); const f = await json("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() - 24 })"); await c.pointer(f.x + dx * 48, f.y); };
  const cds = () => json(`${FC}.getCooldowns()`);
  const hud = () => json("ProjectRBattleHUD.getViewModel().slots");
  const bigHp = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '+9000', exceedMaxHealth: 'true' }); 'ok'`);
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const loadout = async (slots, levels = {}) => {                                              // 戦闘の外で、RingLoadout の正規のAPIで編成する
    await ev(`${FC}.end(); 'ok'`); await sleep(200);
    const r = await json(`(function(){ var out = []; ${SLOTS.map(sl => `out.push(${RL}.clearSkill('${sl}').ok);`).join(" ")} var m = ${JSON.stringify(slots)}, lv = ${JSON.stringify(levels)};
      Object.keys(lv).forEach(function(id){ ${D}.setCardLevel(id, lv[id]); });
      Object.keys(m).forEach(function(sl){ out.push(${RL}.setSkill(sl, m[sl]).ok); }); return out; })()`);
    return r.every(Boolean);
  };
  const begin = async () => { await ev(`${FC}.end(); ${FC}.setLoadoutSource('auto'); ${FC}.begin(); 'ok'`); await topUp(); await sleep(250); };
  const E = 2;                                                                                  // Map001 の「公式銃テスト敵」(HPバーあり)
  const prep = async (dx = 2.2) => { await ev(`${FC}.detachEnemy(${E}); 'ok'`); await place(44, 12); await bigHp(E); await putEnemy(E, dx, 0); await sleep(200); await aimAt(E); await sleep(120); };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500); await s.parkFar();
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); $gameParty.gainItem($dataItems[8], 2); Math.random = function() { return 0.9; }; return 'ok'; })()`);
  await sleep(300);
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
  // 承認済み10スキルを所持させて(アポロンは本番の付与がまだ無いので、テスト用に付与)、2つの指輪を装備する
  await ev(`(function(){ ${D}.assignRingToPlayer('hermes'); ${D}.assignRingToPlayer('apollo'); ${JSON.stringify([...H5, ...A5].filter(i => i !== "hermes_sweep"))}.forEach(function(id){ ${D}.setCardOwned(id, true); ${D}.setCardLevel(id, 1); }); ${RL}.equipRing('hermes'); ${RL}.equipRing('apollo'); return 'ok'; })()`);
  console.log("loadout source", await ev(`${FC}.setLoadoutSource('auto'); ${FC}.getState().loadoutSource || 'auto'`));
  await ev(`window.__t0 = performance.now(); 'ok'`);
  await ev(`(function(){ if (window.__slowInstalled) return 1; var orig = SceneManager.updateScene, k = 0; window.__slow = 1; SceneManager.updateScene = function() { window.__sf = (window.__sf || 0) + 1; return orig.apply(this, arguments); }; window.__slowInstalled = true; return 1; })()`);
  const sf = () => ev("window.__sf || 0");


  // ---- Stage 1E-1: Q 奥義の確認用の補助 ----
  const GA = "ProjectRUltimateGauge", GM = "ProjectRGodSummonManager", UA = "ProjectRUltimateActivation";
  const setQ = async (q, core) => {                                                             // 戦闘の外で、RingLoadout の正規のAPIで Q 枠を決める。core = ULTIMATE メニュー側(CardDeckCore)の選択(別の指輪にしておく)
    await ev(`${FC}.end(); 'ok'`); await sleep(200);
    const r = await json(`(function(){ var out = []; out.push(${q ? `${RL}.setUltimate('${q}').ok` : `${RL}.clearUltimate().ok`}); ${core ? `out.push(${D}.setUltimateRing('${core}').ok);` : ""} return out; })()`);
    return r.every(Boolean);
  };
  const fillGauge = () => ev(`(function(){ var g = ${GA}; return g.hasUltimateGaugeState() ? g.addUltimateGauge(g.getUltimateGaugeMax(), 'cdp').ok : false; })()`);
  const gaugeNow = () => json(`({ has: ${GA}.hasUltimateGaugeState(), cur: ${GA}.getUltimateGauge(), max: ${GA}.getUltimateGaugeMax() })`);
  const ultHud = () => json(`${FC}.getHudState().slots.filter(function(s){ return s.slot === 'ultimate'; })[0]`);
  const mgr = () => json(`({ ring: ${GM}.getPersistentUltimateRingId(), god: ${GM}.getPersistentUltimateGodId(), has: ${GM}.hasPersistentUltimateSummon(), ov: ${GM}.getBattleUltimateRingOverride() })`);
  const coreSel = () => ev(`${D}.getUltimateRingId() || null`);
  const coreData = () => ev(`JSON.stringify(${D}.getPersistentData())`);
  const uaDiag = () => json(`${UA}.getInputDiagnostics()`);
  const hermesOn = () => ev("ProjectRHermesUltimate.isHermesUltimateActive()");
  const apolloOn = () => ev("ProjectRApolloUltimate.isApolloUltimateActive()");

  // 未実装の指輪(一時の指輪 zeus。Athena は Stage 4 で実装済み)は、最初(戦闘の前)に付与・装備しておく。戦闘のあと(敵が交戦中の間)は、Core が指輪の移動を拒否する(RING_TRANSFER_DURING_BATTLE)
  await s.tempRing();
  rec("U0 一時の指輪(zeus。未実装)を付与・装備(戦闘の外)", await json(`({ a: ${D}.assignRingToPlayer('zeus').ok, e: ${RL}.equipRing('zeus').ok })`).then(r => r.a && r.e), "");

  await check("U1 Q が空: 奥義なし(自動のヘルメースなし・Core の選択が別にあっても漏れない)", async () => {
    rec("U1-0 Q 枠を空にする(ULTIMATE メニュー側 = ヘルメース)", await setQ(null, "hermes"), "");
    const data0 = await coreData();
    await begin(); await prep(2.2);
    const m = await mgr(), g = await gaugeNow(), h = await ultHud(), diag0 = await uaDiag(), last0 = await json(`${UA}.getLastUltimateActivationResult()`);
    rec("U1a 常駐の神なし・ゲージなし(ヘルメースへ自動で戻らない。Core の選択は hermes のまま)", m.ring === null && m.has === false && m.ov && m.ov.ringId === null && g.has === false && (await coreSel()) === "hermes", JSON.stringify({ m, g }));
    rec("U1b HUD の Q は empty", h.state === "empty" && h.ready === false, JSON.stringify(h));
    await c.tap("Q", 80); await sleep(300); await c.tap("U", 80); await sleep(300);
    rec("U1c 実キー Q・U: 何も起きない(奥義の処理は一度も呼ばれない・入力にも届かない)", !(await hermesOn()) && !(await apolloOn()) && JSON.stringify(await json(`${UA}.getLastUltimateActivationResult()`)) === JSON.stringify(last0) && JSON.stringify(await uaDiag()) === JSON.stringify(diag0), JSON.stringify(await uaDiag()));
    await s.shot("ult_U1_empty");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    rec("U1d 戦闘後: Core の保存データは1文字も変わらない・この戦闘の指定は消える", (await coreData()) === data0 && (await json(`${GM}.getBattleUltimateRingOverride()`)) === null, "");
  });

  const ultimateFlow = (ring, other, onFn, onExpr, label) => async () => {
    rec(`${label}-0 Q = ${ring}(ULTIMATE メニュー側 = ${other})`, await setQ(ring, other), "");
    const data0 = await coreData();
    await begin(); await prep(2.2);
    const m = await mgr(), g0 = await gaugeNow(), h0 = await ultHud();
    rec(`${label}a 戦闘の神・指輪は ${ring}(Core の選択は ${other} のまま)・ゲージあり・HUD は charging`, m.ring === ring && m.god === ring && m.has === true && g0.has === true && g0.cur === 0 && h0.state === "charging" && (await coreSel()) === other, JSON.stringify({ m, g0, h0: h0.state }));
    await c.tap("Q", 80); await sleep(300);
    rec(`${label}b ゲージ不足で実キー Q: 発動しない・ゲージは変わらない(gaugeNotFull)`, (await json(`${FC}.getLastResult().reason`)) === "gaugeNotFull" && !(await onFn()) && (await gaugeNow()).cur === 0, JSON.stringify(await json(`${FC}.getLastResult()`)));
    await fillGauge(); await sleep(150);
    const h1 = await ultHud(), g1 = await gaugeNow();
    rec(`${label}c ゲージ満タンで HUD は ready`, h1.state === "ready" && h1.ready === true && g1.cur === g1.max && g1.max > 0, JSON.stringify({ h1: h1.state, g1 }));
    const hp0 = await hp(E), d0 = await uaDiag();
    await c.tap("U", 80); await sleep(400);
    rec(`${label}d 実キー U: 発動しない(指輪モードでは U は無効)・ゲージ満タンのまま・入力にも届かない`, !(await onFn()) && (await gaugeNow()).cur === g1.max && JSON.stringify(await uaDiag()) === JSON.stringify(d0), JSON.stringify(await uaDiag()));
    await c.tap("Q", 80); await sleep(250);
    const r = await json(`${UA}.getLastUltimateActivationResult()`);
    rec(`${label}e 実キー Q: ${ring} の奥義が始まり、成功後にだけゲージを消費(満タン → 0)`, !!r && r.ok === true && r.godId === ring && r.ringId === ring && (await onFn()) === true && (await gaugeNow()).cur === 0, JSON.stringify(r));
    await s.shot(`ult_${label}_active`);
    const done = await wait(`!(${onExpr})`, 15000);
    const hp1 = await hp(E);
    rec(`${label}f 奥義が終わる(戦闘は続く)・敵にダメージ`, done && hp1 < hp0, `HP ${hp0} → ${hp1} done=${done}`);
    rec(`${label}g Core の保存データ・選択は不変(ULTIMATE メニュー側 = ${other})`, (await coreData()) === data0 && (await coreSel()) === other, "");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    rec(`${label}h 戦闘後: この戦闘の指定は消え、常駐の神も消える`, (await json(`${GM}.getBattleUltimateRingOverride()`)) === null && (await json(`${GM}.hasPersistentUltimateBattleState()`)) === false, "");
  };
  await check("U2 Q = ヘルメース(ULTIMATE メニュー側 = アポロン)", ultimateFlow("hermes", "apollo", hermesOn, "ProjectRHermesUltimate.isHermesUltimateActive()", "U2"));
  await check("U3 Q = アポロン(ULTIMATE メニュー側 = ヘルメース)", ultimateFlow("apollo", "hermes", apolloOn, "ProjectRApolloUltimate.isApolloUltimateActive()", "U3"));

  await check("U4 未実装の指輪(一時の指輪 zeus。Athena は Stage 4 で実装済み)・戦闘中の指輪の移動の拒否・U は戦闘外では従来どおり", async () => {
    rec("U4-0 Q = zeus(未実装)", await setQ("zeus", "hermes"), "");
    await begin(); await prep(2.2);
    const m = await mgr(), g = await gaugeNow(), h = await ultHud();
    rec("U4a 奥義なし(常駐の神・ゲージなし。ヘルメースへ落ちない)・HUD は unavailable", m.ring === null && m.has === false && g.has === false && h.state === "unavailable", JSON.stringify({ m, g, h: h.state }));
    await c.tap("Q", 80); await sleep(300);
    rec("U4b 実キー Q: ultimateUnavailable・何も起きない", (await json(`${FC}.getLastResult().reason`)) === "ultimateUnavailable" && !(await hermesOn()), JSON.stringify(await json(`${FC}.getLastResult()`)));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    rec("U4c Q = ヘルメース(ULTIMATE メニュー側 = アポロン)", await setQ("hermes", "apollo"), "");
    await begin(); await prep(2.2); await fillGauge();
    const rej = await json(`${D}.setRingUnowned('hermes').ok`);
    await c.tap("Q", 80); await sleep(250);
    rec("U4d 戦闘中の指輪の移動は Core が拒否し、Q はそのまま発動する", rej === false && (await hermesOn()) === true && (await gaugeNow()).cur === 0, `reject=${rej}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    const k0 = (await uaDiag()).keyDowns; await c.tap("U", 80); await sleep(200);
    rec("U4e 戦闘が終われば U は入力に届く(ゲートは指輪モードの戦闘中だけ)", (await uaDiag()).keyDowns === k0 + 1, `${k0} → ${(await uaDiag()).keyDowns}`);
  });

  const errs = s.errors();
  rec("U9 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/ult_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
