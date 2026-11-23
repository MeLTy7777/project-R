// Ring HUD(Stage 1E-3): 指輪モードの Q の表示(空 = 暗い Q + 「未設定」/ 割り当て済みで使えない = 暗い Q + 「使用不可」/ 使える Q = 従来)を、実機(MZ Playtest)で確認する。ゲージと神のパネルは暗い表示のときは出さない。
//   H1 Q が空   H2 Q が割り当て済み(充填中 / READY / 発動後)が従来どおり   H3 使えない指輪(使用不可)・Q を設定して再開・legacy・戦闘後
//   描画側(Sprite_ProjectRUltimateHUD)の実際の表示状態を、シーンの中から読む。スクリーンショットは MZ_OUT/hudq_*.png
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_ring_hudq_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject は遮断)
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
  await waitMap(1); await sleep(1500);
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

  // 未実装の指輪(Themis)は、最初(戦闘の前)に付与・装備しておく。戦闘のあと(敵が交戦中の間)は、Core が指輪の移動を拒否する(RING_TRANSFER_DURING_BATTLE)
  rec("U0 Themis を付与・装備(戦闘の外)", await json(`({ a: ${D}.assignRingToPlayer('themis').ok, e: ${RL}.equipRing('themis').ok })`).then(r => r.a && r.e), "");


  // ---- HUD の Ultimate 区画の描画(Sprite_ProjectRUltimateHUD)を、シーンの中から探して、実際の表示状態を読む ----
  const sprite = () => json(`(function(){
    var seen = new Set(), stack = [SceneManager._scene], found = null;
    while (stack.length && !found) { var o = stack.pop(); if (!o || typeof o !== 'object' || seen.has(o)) continue; seen.add(o);
      if (typeof o.applySlotEmpty === 'function') { found = o; break; }
      if (o.children) for (var i = 0; i < o.children.length; i++) stack.push(o.children[i]);
      if (o._ultimateHUD) stack.push(o._ultimateHUD); if (o._hud) stack.push(o._hud); if (o._projectRBattleHud) stack.push(o._projectRBattleHud); if (o._projectRBattleHudLayer) stack.push(o._projectRBattleHudLayer);
    }
    if (!found) return null;
    return { visible: found.visible, emptyText: found._emptyText.visible, base: found._baseGraphics.visible, value: found._valueGraphics.visible, title: found._titleText.visible, valueText: found._valueText.visible,
      keyAlpha: found._keyGraphics.alpha, keyTextAlpha: found._keyText.alpha, keyLabel: found._keyText._signature ? JSON.parse(found._keyText._signature)[0] : null, emptyLabel: found._emptyText._signature ? JSON.parse(found._emptyText._signature)[0] : null,
      titleLabel: found._titleText._signature ? JSON.parse(found._titleText._signature)[0] : null, valueLabel: found._valueText._signature ? JSON.parse(found._valueText._signature)[0] : null };
  })()`);
  const vmU = () => json("ProjectRBattleHUD.getViewModel().ultimate");
  const vmD = () => json("ProjectRBattleHUD.getViewModel().divine");
  const settle = () => sleep(500);                                                                // HUD は 4 フレームごとに更新される

  await check("H1 Q が空(指輪モード): 暗い Q + 「未設定」。ゲージ・神のパネルなし", async () => {
    rec("H1-0 Q 枠を空にする(ULTIMATE メニュー側 = ヘルメース)", await setQ(null, "hermes"), "");
    await begin(); await prep(2.2); await settle();
    const u = await vmU(), d = await vmD(), sp = await sprite(), g = await gaugeNow();
    rec("H1a 表示データ: Q の空の枠(slotEmpty・キー Q)・神のパネルなし・ゲージなし", u.slotEmpty === true && u.key === "Q" && d === null && g.has === false, JSON.stringify({ u, d, g }));
    rec("H1b 描画: 区画は見える・暗い Q のキー(透過 0.35)と「未設定」・円弧のゲージ・数値は隠れる", !!sp && sp.visible === true && sp.emptyText === true && sp.emptyLabel === "未設定" && sp.keyLabel === "Q" && sp.keyAlpha === 0.35 && sp.base === false && sp.value === false && sp.title === false && sp.valueText === false, JSON.stringify(sp));
    await s.shot("hudq_H1_empty");
    const shotBig = await ev("1"); void shotBig;
  });

  await check("H2 Q が割り当て済み(ヘルメース): 充填中 → READY → 発動後が従来どおり", async () => {
    rec("H2-0 Q = ヘルメース", await setQ("hermes", "apollo"), "");
    await begin(); await prep(2.2); await settle();
    let u = await vmU(), sp = await sprite(), d = await vmD();
    rec("H2a 充填中: ゲージの円弧・数値・神のパネル(HERMES)が出る。「未設定」は出ない", u.slotEmpty === undefined && u.state === "charging" && !!d && d.godId === "hermes" && !!sp && sp.visible && sp.emptyText === false && sp.base === true && sp.valueText === true && sp.keyAlpha !== 0.35, JSON.stringify({ u: u.state, d: d && d.godId, sp }));
    await s.shot("hudq_H2_charging");
    await fillGauge(); await settle(); u = await vmU(); sp = await sprite();
    rec("H2b READY: 「Q - ULTIMATE」・100/100", u.state === "ready" && sp.titleLabel === "Q - ULTIMATE" && sp.valueLabel === "100/100" && sp.emptyText === false, JSON.stringify(sp));
    await s.shot("hudq_H2_ready");
    await c.tap("Q", 90); await sleep(300); u = await vmU(); sp = await sprite();
    rec("H2c 発動後: ULTIMATE ACTIVE・0/100 → 終われば充填中へ戻る。「未設定」は出ない", u.executing === true && sp.titleLabel === "ULTIMATE ACTIVE" && sp.emptyText === false, JSON.stringify(sp));
    await s.shot("hudq_H2_active");
    await wait("!ProjectRHermesUltimate.isHermesUltimateActive()", 15000); await settle(); u = await vmU(); sp = await sprite();
    rec("H2d 終了後は充填中(0/100)", u.state === "charging" && sp.valueLabel === "0/100" && sp.emptyText === false && sp.base === true, JSON.stringify(sp));
  });

  await check("H3 未実装の指輪(Themis が Q)・legacy・Q を設定して再開: 従来どおり / 空の表示は残らない", async () => {
    rec("H3-0 Q = Themis", await setQ("themis", "hermes"), "");
    await begin(); await prep(2.2); await settle();
    let u = await vmU(), sp = await sprite();
    const dv = await vmD();
    rec("H3a 割り当て済みで使えない Q(Themis): 暗い Q + 「使用不可」(「未設定」ではない)。ゲージ・数値・神のパネルなし", u.slotUnavailable === true && u.slotEmpty === undefined && dv === null && !!sp && sp.visible === true && sp.emptyText === true && sp.emptyLabel === "使用不可" && sp.keyAlpha === 0.35 && sp.base === false && sp.valueText === false, JSON.stringify({ u, dv, sp }));
    await s.shot("hudq_H3_unavailable");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    // Q が空 → 設定して再開: 空の表示が残らない
    await setQ(null, "hermes"); await begin(); await prep(2.2); await settle(); sp = await sprite();
    const wasEmpty = sp.emptyText === true;
    await setQ("apollo", "hermes"); await begin(); await prep(2.2); await settle(); sp = await sprite(); u = await vmU();
    rec("H3b Q が空 → 設定して再開: 「未設定」が消え、ゲージの表示に戻る", wasEmpty && sp.emptyText === false && sp.visible === true && sp.base === true && u.state === "charging", JSON.stringify(sp));
    await ev(`${FC}.end(); ${FC}.setLoadoutSource('legacy'); ${FC}.begin(); 'ok'`); await sleep(300); await settle(); u = await vmU(); sp = await sprite();
    rec("H3c legacy: 空の Q の表示にならない(従来の表示)", u.slotEmpty === undefined && !!sp && sp.emptyText === false, JSON.stringify(u.state));
    await ev(`${FC}.end(); ${FC}.setLoadoutSource('auto'); 'ok'`); await sleep(300); await settle(); sp = await sprite();
    rec("H3d 戦闘後: 「未設定」は出ない", !sp || sp.emptyText === false, JSON.stringify(sp));
  });

  const errs = s.errors();
  rec("H9 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`
${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/hudq_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
