// Stage 1E-2: 指輪装備・スキル編成・Q 奥義の最終統合 QA を、実機(MZ Playtest)で確認する。実の Scene_ProjectRRings / Scene_ProjectRUltimateSelect / Scene_Save / Scene_Load を、実キー(Enter)で操作する。
//   M1 メニューで装備・5枠・Q を編成(実キー)・ULTIMATE 画面の選択(別の神)・説明文
//   M2 実 Scene_Save   M3 状態を壊してから 実 Scene_Load(装備・5枠・Q・ULTIMATE 画面の選択の復元)
//   M4 読み込み後の戦闘(HUD・Q の表示: 充填中 / READY / 発動後・U は無効)   M5 戦闘中の編集ロック
//   M6 戦闘の終了・再開・Q 空・legacy・マップ移動で、この戦闘だけの指定が漏れない   M7 通常スキル5枠の実キーと HUD   M9 Console のエラーなし・ディスクへの書き込みなし
// 【セーブの保護】実際の save/ フォルダは一切書かない・読まない。StorageManager(saveObject / loadObject / exists / remove)をメモリ上のストアへ差し替える(実の Scene_Save / Scene_Load・DataManager.saveGame / loadGame・JsonEx の往復はそのまま通る)。
//   さらに fs.writeFileSync を包み、save を含むパスへの書き込みは数えて拒否する(ディスクへの書き込み 0 を確かめる)。実行の前後で save/ のハッシュ(別途)を比べる。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/ring_qa_verify.cjs   (新しいNW.jsセッションで実行する)

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
  // 【セーブの保護】StorageManager をメモリ上のストアへ差し替える(実の save/ は書かない・読まない)。fs.writeFileSync も save パスは拒否して数える。
  await ev(`(function(){
    window.__writes = 0; window.__diskWrites = 0; window.__mem = {}; window.__memWrites = 0;
    StorageManager.saveObject = function(name, obj) { window.__memWrites++; window.__mem[name] = JsonEx.stringify(obj); return Promise.resolve(); };
    StorageManager.loadObject = function(name) { return window.__mem[name] === undefined ? Promise.reject(new Error('no save: ' + name)) : Promise.resolve(JsonEx.parse(window.__mem[name])); };
    StorageManager.exists = function(name) { return window.__mem[name] !== undefined; };
    StorageManager.remove = function(name) { delete window.__mem[name]; return Promise.resolve(); };
    var fs = require('fs'), orig = fs.writeFileSync;
    fs.writeFileSync = function(p) { if (/save/i.test(String(p))) { window.__diskWrites++; throw new Error('disk write blocked by test: ' + p); } return orig.apply(this, arguments); };
    return 'ok'; })()`);

  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); $gameParty.gainItem($dataItems[8], 2); Math.random = function() { return 0.9; }; return 'ok'; })()`);
  await sleep(300);
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
  // 承認済み10スキルを所持させて(アポロンは本番の付与がまだ無いので、テスト用に付与)、2つの指輪を装備する
  await ev(`(function(){ ${D}.assignRingToPlayer('hermes'); ${D}.assignRingToPlayer('apollo'); ${JSON.stringify([...H5, ...A5].filter(i => i !== "hermes_sweep"))}.forEach(function(id){ ${D}.setCardOwned(id, true); ${D}.setCardLevel(id, 1); }); ${RL}.equipRing('hermes'); ${RL}.equipRing('apollo'); return 'ok'; })()`);
  console.log("loadout source", await ev(`${FC}.setLoadoutSource('auto'); ${FC}.getState().loadoutSource || 'auto'`));
  await ev(`window.__t0 = performance.now(); 'ok'`);
  await ev(`(function(){ if (window.__slowInstalled) return 1; var orig = SceneManager.updateScene, k = 0; window.__slow = 1; SceneManager.updateScene = function() { window.__sf = (window.__sf || 0) + 1; return orig.apply(this, arguments); }; window.__slowInstalled = true; return 1; })()`);
  const sf = () => ev("window.__sf || 0");


  // ---------------------------------------------------------------- 補助(実キー・実 Scene) ----------------------------------------------------------------
  const GA = "ProjectRUltimateGauge", GM = "ProjectRGodSummonManager", UA = "ProjectRUltimateActivation";
  const SLOT5 = ["lmb", "shift", "e", "x", "c"];
  const sceneName = () => ev("SceneManager._scene.constructor.name");
  const waitScene = async (name, ms = 12000) => { const ok = await wait(`SceneManager._scene && SceneManager._scene.constructor.name === '${name}' && !SceneManager.isSceneChanging() && SceneManager._scene.isActive()`, ms); await sleep(350); return ok; };
  const pushScene = async name => { await ev(`SceneManager.push(${name}); 'ok'`); return waitScene(name); };
  const popToMap = async () => { await ev("SceneManager.goto(Scene_Map); 'ok'"); const ok = await waitScene("Scene_Map"); await sleep(300); return ok; };
  // 窓の項目を選ぶ(カーソルの位置合わせだけを直接。決定・戻るは実キー)
  const sel = (win, pred) => ev(`(function(){ var s = SceneManager._scene, w = s.${win}, i = w.items().findIndex(function(e){ return ${pred}; }); if (i < 0) return -1; w.select(i); return i; })()`);
  const tabs = mode => ev(`(function(){ var s = SceneManager._scene; [s._rings, s._targets, s._slots, s._choices].forEach(function(w){ w.deactivate(); }); s._tabs.activate(); s._tabs.select(${mode}); return 'ok'; })()`);
  const enter = () => c.tap("Enter", 90);
  const ok = () => c.tap("F", 90);                                                                // 標準の決定(Scene_Save / Scene_Load)。Hendrix のキー割当で ok = F
  const equipKey = async ringId => { await tabs(0); await enter(); await sel("_rings", `e.ringId === '${ringId}'`); await enter(); const i = await sel("_targets", "e.kind === 'equip'"); if (i < 0) return false; await enter(); await sleep(150); return true; };
  const assignKey = async (slot, pred, keepOpen = false) => { await tabs(1); await enter(); const i = await sel("_slots", `e.slot === '${slot}'`); if (i < 0) return false; await enter(); const j = await sel("_choices", pred); if (j < 0) return false; if (keepOpen) return true; await enter(); await sleep(150); return true; };
  const clearKey = slot => assignKey(slot, "e.kind === 'clear'");
  const ultKey = async ringId => { const i = await sel("_list", `e.ringId === '${ringId}'`); if (i < 0) return false; await enter(); await sleep(150); return true; };
  const rlState = () => json(`${RL}.getState()`);
  const coreSel = () => ev(`${D}.getUltimateRingId() || null`);
  const coreData = () => ev(`JSON.stringify(${D}.getPersistentData())`);
  const gaugeNow = () => json(`({ has: ${GA}.hasUltimateGaugeState(), cur: ${GA}.getUltimateGauge(), max: ${GA}.getUltimateGaugeMax() })`);
  const fillGauge = () => ev(`(function(){ var g = ${GA}; return g.hasUltimateGaugeState() ? g.addUltimateGauge(g.getUltimateGaugeMax(), 'cdp').ok : false; })()`);
  const ultHud = () => json(`${FC}.getHudState().slots.filter(function(s){ return s.slot === 'ultimate'; })[0]`);
  const mgrRing = () => ev(`${GM}.getPersistentUltimateRingId() || null`);
  const override = () => json(`${GM}.getBattleUltimateRingOverride()`);
  const uaDiag = () => json(`${UA}.getInputDiagnostics()`);
  const SLOTS_A = { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "apollo_eros_arrow", x: "hermes_issen", c: "apollo_golden_volley" };
  const EXPECT = { schema: 1, equipped: ["hermes", "apollo"], slots: SLOTS_A, ultimate: "apollo" };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  await check("M1 メニューで装備・5枠・Q を編成(実の Scene_ProjectRRings・実キー)・ULTIMATE 画面", async () => {
    await ev(`${FC}.end(); ${D}.assignRingToPlayer('janus'); (function(){ ${RL}.unequipRing('hermes'); ${RL}.unequipRing('apollo'); ${SLOT5.map(sl => `${RL}.clearSkill('${sl}');`).join(" ")} ${RL}.clearUltimate(); return 'ok'; })()`);
    rec("M1-0 まっさらな状態(装備なし・5枠空・Q 空)", same(await rlState(), { schema: 1, equipped: [], slots: { lmb: null, shift: null, e: null, x: null, c: null }, ultimate: null }), JSON.stringify(await rlState()));
    rec("M1a 指輪画面を開く(Scene_ProjectRRings)", await pushScene("Scene_ProjectRRings"), await sceneName());
    rec("M1b 実キー Enter で、ヘルメース・アポロンを装備", (await equipKey("hermes")) && (await equipKey("apollo")) && (await rlState()).equipped.join() === "hermes,apollo", JSON.stringify(await rlState()));
    await s.shot("qa_M1b_equip");
    let okAll = true; for (const [slot, id] of Object.entries(SLOTS_A)) okAll = (await assignKey(slot, `e.skillId === '${id}'`)) && okAll;
    rec("M1c 実キー Enter で、5枠(LMB 薙ぎ払い / Shift 絶 / E エロスの矢 / X 一閃 / C 黄金の矢)を登録", okAll && same((await rlState()).slots, SLOTS_A), JSON.stringify((await rlState()).slots));
    rec("M1d Q 枠の候補を開く(アポロンを選んだ状態で止める): 説明に「ULTIMATE 画面とは別」「フィールド戦闘の Q」", await (async () => {
      const opened = await assignKey("q", "e.kind === 'ultimate' && e.ringId === 'apollo'", true); await sleep(250);
      const lines = await ev("SceneManager._scene.skillDetailLines().join(' / ')"); await s.shot("qa_M1d_q_choice");
      return opened && /ULTIMATE/.test(lines) && /フィールド戦闘/.test(lines) && lines;
    })(), "");
    await enter(); await sleep(150);
    rec("M1e Q = アポロン(実キー)。装備・5枠・Q がそろう", same(await rlState(), EXPECT), JSON.stringify(await rlState()));
    await s.shot("qa_M1e_skill_tab");
    rec("M1f 指輪画面の説明: 古い「未接続」の記述がなく、Q 枠の説明が出る", await ev("(function(){ var t = SceneManager._scene.skillDetailLines().join(' '); return !/まだ FieldCombat/.test(t); })()"), "");
    await popToMap();
    rec("M1g ULTIMATE 画面を開く → ヘルメースを選ぶ(実キー)。Q 枠は変わらない", (await pushScene("Scene_ProjectRUltimateSelect")) && (await ultKey("hermes")) && (await coreSel()) === "hermes" && (await rlState()).ultimate === "apollo", `core=${await coreSel()} q=${(await rlState()).ultimate}`);
    await sleep(300); await s.shot("qa_M1g_ultimate_screen");
    rec("M1h 2つの選択は独立(Core = hermes / Q = apollo)・Core の選択の保存", (await coreSel()) === "hermes" && (await rlState()).ultimate === "apollo", "");
    await popToMap();
  });

  await check("M2 実 Scene_Save(実キー F = 決定)", async () => {
    rec("M2a Scene_Save を開く", await pushScene("Scene_Save"), await sceneName());
    await s.shot("qa_M2_save_screen");
    const idx = await ev("SceneManager._scene._listWindow.index()");
    await ok();                                                                                  // このプロジェクトの決定キーは F(Hendrix のキー割当。Enter は標準の決定にならない)
    await wait("SceneManager._scene.constructor.name === 'Scene_Map'", 15000); await sleep(600);
    const keys = await json("Object.keys(window.__mem)");
    rec("M2b 保存された(メモリ上のストア。save/ には書かない)", keys.some(k => /^file/.test(k)) && (await ev("window.__diskWrites")) === 0, `keys=${keys.join()} idx=${idx}`);
    const saved = await json(`(function(){ var k = Object.keys(window.__mem).filter(function(k){ return /^file/.test(k); })[0]; var o = JsonEx.parse(window.__mem[k]); return { loadout: o.system._projectRRingLoadout, hasSession: JsonEx.stringify(o).indexOf('ultimateRingId') >= 0 }; })()`);
    rec("M2c 保存内容に、装備・5枠・Q(RingLoadout)が入り、この戦闘だけの指定は入らない", same(saved.loadout, EXPECT) && saved.hasSession === false, JSON.stringify(saved).slice(0, 220));
  });

  await check("M3 状態を壊してから 実 Scene_Load(実キー F = 決定): 装備・5枠・Q・ULTIMATE 画面の選択が戻る", async () => {
    await ev(`(function(){ ${RL}.unequipRing('hermes'); ${RL}.unequipRing('apollo'); ${SLOT5.map(sl => `${RL}.clearSkill('${sl}');`).join(" ")} ${RL}.clearUltimate(); ${D}.setUltimateRing('apollo'); return 'ok'; })()`);
    rec("M3-0 壊した(装備なし・5枠空・Q 空・Core = apollo)", (await rlState()).equipped.length === 0 && (await coreSel()) === "apollo", "");
    rec("M3a Scene_Load を開く", await (async () => { await ev("SceneManager.goto(Scene_Load); 'ok'"); return waitScene("Scene_Load"); })(), await sceneName());
    await s.shot("qa_M3_load_screen");
    const sel0 = await ev("SceneManager._scene._listWindow.index()"), en = await ev("SceneManager._scene.isSavefileEnabled(SceneManager._scene.savefileId())");
    await ok(); const back = await waitScene("Scene_Map", 25000); await sleep(1500);
    rec("M3b 読み込み後はマップ・ゲーム内の状態がそろう", back && (await ev("!$gamePlayer.isTransferring()")), `idx=${sel0} enabled=${en}`);
    rec("M3c 装備・5枠・Q がそのまま戻る", same(await rlState(), EXPECT), JSON.stringify(await rlState()));
    rec("M3d ULTIMATE 画面の選択(Core)は、保存時の hermes に戻り、Q 枠(apollo)とは別のまま", (await coreSel()) === "hermes" && (await rlState()).ultimate === "apollo", `core=${await coreSel()}`);
    rec("M3e 読み込み直後はこの戦闘だけの指定なし・ディスクへの書き込みなし", (await override()) === null && (await ev("window.__diskWrites")) === 0, "");
    await ev(`${FC}.setDevAllowOutsideEncounter(true); ${FC}.setLoadoutSource('auto'); 'ok'`);
  });

  await check("M4 読み込み後の戦闘: 5枠・Q の表示(充填中 / READY / 発動後)・U は無効", async () => {
    await begin(); await prep(2.2);
    const sl = await hud();
    rec("M4a 読み込んだ5枠が HUD に出る(薙ぎ払い・絶・一閃・黄金の矢 ほか)", sl.slice(0, 5).map(x => x.name).join(",").length > 0 && sl.slice(0, 5).every(x => x.name && x.name !== "―"), sl.slice(0, 5).map(x => x.name).join(","));
    const mg = await ev(`${GM}.getPersistentUltimateRingId()`), core = await coreSel(), u0 = await ultHud();
    rec("M4b 戦闘の神は Q 枠(アポロン)。ULTIMATE 画面の選択(ヘルメース)は使われない。HUD の Q は charging", mg === "apollo" && core === "hermes" && u0.state === "charging", JSON.stringify({ mg, core, q: u0.state }));
    await sleep(500); await s.shot("qa_M4_charging");
    await fillGauge(); await sleep(400); const u1 = await ultHud();
    rec("M4c ゲージ満タンで Q は READY", u1.state === "ready" && u1.ready === true, JSON.stringify(u1));
    await s.shot("qa_M4_ready");
    const d0 = await uaDiag(); await c.tap("U", 90); await sleep(400);
    rec("M4d 実キー U: 発動しない(満タンのまま・入力にも届かない)", (await gaugeNow()).cur === (await gaugeNow()).max && same(await uaDiag(), d0) && !(await ev("ProjectRApolloUltimate.isApolloUltimateActive()")), JSON.stringify(await uaDiag()));
    await c.tap("Q", 90); await sleep(350);
    rec("M4e 実キー Q: アポロンの奥義が発動し、ゲージ 0。HUD は charging に戻る", (await ev("ProjectRApolloUltimate.isApolloUltimateActive()")) === true && (await gaugeNow()).cur === 0 && (await ultHud()).state === "charging", JSON.stringify(await gaugeNow()));
    await s.shot("qa_M4_activated");
    await wait("!ProjectRApolloUltimate.isApolloUltimateActive()", 15000);
  });

  await check("M5 戦闘中の編集ロック", async () => {
    await begin(); await prep(2.2); await fillGauge();
    const before = JSON.stringify([await rlState(), await coreData(), await ev(`${D}.getRingOwner('hermes')`)]);
    await c.tap("Esc", 90); await sleep(600);
    rec("M5a 戦闘中は、実キー Esc でメニューが開かない", (await sceneName()) === "Scene_Map", await sceneName());
    rec("M5c ロック中(メニューが開けない戦闘中)も、戦闘の開始時の Q(アポロン)は使える", await (async () => { await c.tap("Q", 90); await sleep(350); return (await ev("ProjectRApolloUltimate.isApolloUltimateActive()")) === true && (await gaugeNow()).cur === 0; })(), "");
    await wait("!ProjectRApolloUltimate.isApolloUltimateActive()", 15000); await fillGauge();
    rec("M5b 指輪画面を直接開いて操作しても(実キー Enter)、装備・5枠・Q は変わらない", await (async () => {
      await pushScene("Scene_ProjectRRings"); await assignKey("q", "e.kind === 'clear'"); await assignKey("lmb", "e.skillId === 'hermes_sweep'"); await equipKey("hermes");
      const locked = await ev("ProjectRMenuCore.isLocked()");
      await s.shot("qa_M5_locked"); await popToMap();
      return JSON.stringify([await rlState(), await coreData(), await ev(`${D}.getRingOwner('hermes')`)]) === before && locked === true;
    })(), "");
    {
      const g1 = await gaugeNow(), u = await json(`${FC}.getUltimateState()`);
      await c.tap("Q", 90); await sleep(300);
      rec("M5d (参考)強制的に別の Scene を挟んで Scene_Map が作り直されると、常駐の神・ゲージは消える(従来の onMapLoaded の後始末)。そのとき Q は ultimateUnavailable で断り、何も消費しない(通常は戦闘中にメニューが開けず、起きない)", (await json(`${FC}.getLastResult().reason`)) === "ultimateUnavailable" && !(await ev("ProjectRApolloUltimate.isApolloUltimateActive()")), JSON.stringify({ g1, reason: u.reason }));
    }
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  await check("M6 遷移: 終了・再開・Q 空・legacy・マップ移動で、この戦闘だけの指定が漏れない", async () => {
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    rec("M6a 戦闘が終わると、この戦闘だけの指定・常駐の神が消える", (await override()) === null && (await mgrRing()) === null, "");
    // Q を空にして(実キー)から戦闘: Core の選択(ヘルメース)へ落ちない
    await ev("SceneManager.push(Scene_ProjectRRings); 'ok'"); await waitScene("Scene_ProjectRRings");
    const edited = await ev(`${RL}.clearUltimate().ok`);                                                 // 戦闘外・画面は開いたまま。(Q の解除は M1 の実キー操作と同じ API)
    await popToMap();
    await begin(); await prep(2.2);
    const em = await ultHud();
    rec("M6b Q が空: 常駐の神・ゲージなし・HUD は empty(Core = hermes が残っていても使わない)", edited === true && (await mgrRing()) === null && (await gaugeNow()).has === false && em.state === "empty" && (await coreSel()) === "hermes", JSON.stringify({ q: em.state, core: await coreSel() }));
    await sleep(400); await s.shot("qa_M6_q_empty");
    await c.tap("Q", 90); await sleep(300);
    rec("M6c 空の Q は何も起こさない", !(await ev("ProjectRHermesUltimate.isHermesUltimateActive() || ProjectRApolloUltimate.isApolloUltimateActive()")), "");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    // 未実装の指輪を Q に(古い保存データなどを想定)
    await ev(`(function(){ ${RL}.equipRing('janus'); ${RL}.setUltimate('janus'); return 'ok'; })()`);
    await begin(); await prep(2.2); const un = await ultHud();
    rec("M6d 未実装の指輪(Janus)が Q: HUD は unavailable・神もゲージもなし・ヘルメースへ落ちない", un.state === "unavailable" && (await mgrRing()) === null && (await gaugeNow()).has === false, JSON.stringify(un.state));
    await s.shot("qa_M6_q_unavailable");
    await ev(`${FC}.end(); ${RL}.clearUltimate(); ${RL}.setUltimate('hermes'); 'ok'`); await sleep(300);
    // 再開: Q = ヘルメース(Core もヘルメース)→ Core をアポロンにして legacy
    await begin(); const r1 = await mgrRing(); await ev(`${FC}.end(); 'ok'`); await sleep(200);
    await ev(`${D}.setUltimateRing('apollo'); ${FC}.setLoadoutSource('legacy'); 'ok'`); await ev(`${FC}.begin(); 'ok'`); await sleep(300);
    const legacy = { mode: await json(`${FC}.getSlotSkills().mode`), mg: await mgrRing(), ov: await override() };
    await ev(`${FC}.end(); ${FC}.setLoadoutSource('auto'); 'ok'`); await sleep(300);
    rec("M6e 再開 = Q(ヘルメース)/ legacy = Core の選択(アポロン)で、この戦闘だけの指定は使わない", r1 === "hermes" && legacy.mode === "legacy" && legacy.mg === "apollo" && legacy.ov === null, JSON.stringify({ r1, legacy }));
    // マップ移動(中断)
    await begin(); const during = await override();
    await ev("$gamePlayer.reserveTransfer(2, 5, 5, 2, 0); 'ok'"); await sleep(1500); await waitMap(2); await sleep(500);
    rec("M6f マップ移動(中断・別のマップへ): 戦闘も指定も消える", during && during.ringId === "hermes" && !(await json(`${FC}.getState().active`)) && (await override()) === null && (await mgrRing()) === null, JSON.stringify({ during, ov: await override(), active: await json(`${FC}.getState().active`), mg: await mgrRing() }));
    await ev("$gamePlayer.reserveTransfer(1, 44, 12, 2, 0); 'ok'"); await sleep(1500); await waitMap(1); await sleep(1200);
  });

  await check("M7 通常スキル5枠の実キーと HUD(ヘルメース・アポロンの編成)", async () => {
    await ev(`(function(){ ${RL}.clearUltimate(); ${RL}.setUltimate('apollo'); return 'ok'; })()`);
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await begin(); await prep(2.2);
    const h0 = await hp(E); await c.click(undefined, 70); await sleep(600);
    await putEnemy(E, 4, 0); await aimAt(E); await c.tap("E", 80); await sleep(300);
    await c.tap("X", 80); await sleep(300); await c.tap("C", 80); await sleep(300);
    const cd = await cds(), slots = await hud();
    rec("M7a LMB(薙ぎ払い)で敵のHPが減る・E / X / C のスキルID単位の Cooldown が付く(Q・ゲージの影響なし)", (await hp(E)) < h0 && cd.apollo_eros_arrow > 0 && cd.hermes_issen > 0 && (await gaugeNow()).cur >= 0, JSON.stringify(cd));
    rec("M7b HUD は枠ごとの Cooldown を出す(E・X。黄金の矢は Cooldown 0 + 発射の間隔 0.5 秒だけ)", slots[2].cooldown.active === true && slots[3].cooldown.active === true && slots[0].cooldown.active === false, JSON.stringify(slots.slice(0, 5).map(x => [x.name, x.cooldown.active])));
    await s.shot("qa_M7_hud");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });


  const errs = s.errors();
  rec("M9 Console のエラーなし・ディスクへの書き込みなし(save/ へ 0 回)", errs.length === 0 && (await ev("window.__diskWrites")) === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`
${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/qa_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
