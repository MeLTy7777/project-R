// メインメニューの SKILL = 指輪のスキル編成(LMB / Shift / E / X / C / Q)を直接開く、を実機(MZ Playtest)で確認する。実のメインメニュー(原画)を実キー(Esc / F / S / W / Tab / Enter)で操作する。
//   K1 SKILL → スキル編成が直接開く(空の状態の案内)  K2 戻る操作(Esc)  K3 指輪装備・受け渡しへの切替 → 5枠・Q を登録  K4 ULTIMATE・Tab 近道は従来どおり  K5 戦闘中は開けない・編集できない
// 【セーブの保護】StorageManager をメモリ上のストアへ差し替える(実の save/ は書かない)。ring_qa_verify.cjs と同じ。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/skill_menu_verify.cjs   (新しいNW.jsセッションで実行する)
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
  await waitMap(1); await sleep(1500); await s.parkFar();
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



  // ---------------------------------------------------------------- 補助 ----------------------------------------------------------------
  const sceneName = () => ev("SceneManager._scene.constructor.name");
  const waitScene = async (name, ms = 12000) => { const ok = await wait(`SceneManager._scene && SceneManager._scene.constructor.name === '${name}' && !SceneManager.isSceneChanging() && SceneManager._scene.isActive()`, ms); await sleep(450); return ok; };
  const sel = (win, pred) => ev(`(function(){ var s = SceneManager._scene, w = s.${win}, i = w.items().findIndex(function(e){ return ${pred}; }); if (i < 0) return -1; w.select(i); return i; })()`);
  const enter = () => c.tap("Enter", 90);
  const ok = () => c.tap("F", 90);                                                                // メインメニュー(原画)の決定 = F(Hendrix のキー割当)
  const rlState = () => json(`${RL}.getState()`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const menuIndex = () => ev("SceneManager._scene._index");
  const openMainMenu = async () => { await c.tap("Esc", 90); const okk = await waitScene("Scene_ProjectRMenu", 8000); return okk; };
  const toCommand = async symbol => {                                                             // 実キー(S = 下 / W = 上)で、メインメニューの項目へ動かす
    for (let i = 0; i < 8; i++) { if ((await ev("COMMANDS_SYMBOL()").catch(() => null)) === symbol) return true; const cur = await json("(function(){ var s = SceneManager._scene; return { i: s._index }; })()"); const order = ["skill", "ultimate", "item", "save", "load", "system", "title"]; const want = order.indexOf(symbol); if (cur.i === want) return true; await c.tap(cur.i < want ? "S" : "W", 80); await sleep(250); }
    return false;
  };
  const scr = () => json(`(function(){ var s = SceneManager._scene; return { name: s.constructor.name, mode: s._mode, tabs: s._tabs && s._tabs.active, slots: s._slots && s._slots.active, slotsVisible: s._slots && s._slots.visible, rings: s._rings && s._rings.active, choices: s._choices && s._choices.active, notice: s._notice || '', slotCount: s._slots ? s._slots.items().length : 0 }; })()`);
  const assignKey = async (slot, pred) => { await ev("(function(){ var s = SceneManager._scene; [s._rings, s._targets, s._slots, s._choices].forEach(function(w){ w.deactivate(); }); s._tabs.activate(); s._tabs.select(1); return 'ok'; })()"); await enter(); const i = await sel("_slots", `e.slot === '${slot}'`); if (i < 0) return false; await enter(); const j = await sel("_choices", pred); if (j < 0) return false; await enter(); await sleep(150); return true; };
  const equipKey = async ringId => { await ev("(function(){ var s = SceneManager._scene; [s._rings, s._targets, s._slots, s._choices].forEach(function(w){ w.deactivate(); }); s._tabs.activate(); s._tabs.select(0); return 'ok'; })()"); await enter(); await sel("_rings", `e.ringId === '${ringId}'`); await enter(); const i = await sel("_targets", "e.kind === 'equip'"); if (i < 0) return false; await enter(); await sleep(150); return true; };
  const SLOTS_A = { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "apollo_eros_arrow", x: "hermes_issen", c: "apollo_golden_volley" };

  await check("K1 メインメニュー(原画)の SKILL → スキル編成が直接開く(空の状態)", async () => {
    await s.tempRing(); await ev(`${FC}.end(); ${D}.assignRingToPlayer('zeus'); (function(){ ${RL}.unequipRing('hermes'); ${RL}.unequipRing('apollo'); ${RL}.unequipRing('zeus'); ${["lmb", "shift", "e", "x", "c"].map(sl => `${RL}.clearSkill('${sl}');`).join(" ")} ${RL}.clearUltimate(); return 'ok'; })()`);
    rec("K1-0 何も装備していない状態", (await rlState()).equipped.length === 0, "");
    rec("K1a 実キー Esc でメインメニュー(Scene_ProjectRMenu)が開く", await openMainMenu(), await sceneName());
    await s.shot("skillmenu_K1_main");
    rec("K1b 先頭の項目は SKILL(重複の SKILL 項目なし)", (await menuIndex()) === 0 && (await json("(function(){ var syms = []; return Object.keys(ProjectR.MenuHUD.commandScenes); })()")).filter(k => k === "skill").length === 1, `index=${await menuIndex()}`);
    await toCommand("skill"); await ok();
    rec("K1c 実キー F(決定)で、指輪のスキル編成が開く", await waitScene("Scene_ProjectRSkillLoadout", 8000), await sceneName());
    const st = await scr();
    rec("K1d スキル編成の枠の一覧(LMB / Shift / E / X / C / Q の 6 枠)がすぐ動く。上の項目は止まっている", st.mode === 1 && st.slots === true && st.tabs === false && st.slotsVisible === true && st.slotCount === 6, JSON.stringify(st));
    rec("K1e 空の状態の案内(登録できるスキル・奥義がありません。「指輪装備」で装備)", /登録できるスキル・奥義がありません/.test(st.notice) && /指輪装備/.test(st.notice), st.notice);
    await s.shot("skillmenu_K1_empty");
  });

  await check("K2 戻る操作: 枠の一覧 → (Esc)→ 上の項目 → (Esc)→ メインメニュー → (Esc)→ マップ", async () => {
    await c.tap("Esc", 90); await sleep(400);
    let st = await scr();
    rec("K2a 1回目の Esc: 上の項目へ(画面は閉じない)", st.name === "Scene_ProjectRSkillLoadout" && st.tabs === true && st.slots === false, JSON.stringify(st));
    await s.shot("skillmenu_K2_tabs");
    await c.tap("Esc", 90); const back = await waitScene("Scene_ProjectRMenu", 8000);
    rec("K2b 2回目の Esc: メインメニューへ戻る(カーソルは SKILL のまま)", back && (await menuIndex()) === 0, await sceneName());
    await c.tap("Esc", 90); const map = await waitScene("Scene_Map", 8000);
    rec("K2c 3回目の Esc: メインメニューが閉じてマップへ", map, await sceneName());
  });

  await check("K3 スキル編成の画面から、指輪装備・仲間への受け渡しの画面へ切り替え → 装備 → 5枠・Q を登録", async () => {
    await openMainMenu(); await toCommand("skill"); await ok(); await waitScene("Scene_ProjectRSkillLoadout", 8000);
    await c.tap("Esc", 90); await sleep(300);                                                       // 上の項目へ
    rec("K3a 上の項目から「指輪装備」へ切り替えて装備できる(既存の指輪画面)", (await equipKey("hermes")) && (await equipKey("apollo")) && (await rlState()).equipped.join() === "hermes,apollo", JSON.stringify((await rlState()).equipped));
    await s.shot("skillmenu_K3_equip");
    const targets = await json("(function(){ var s = SceneManager._scene; s._tabs.select(0); s._rings.select(s._rings.items().findIndex(function(e){ return e.ringId === 'hermes'; })); s.refreshTargets(); return s._targets.items().map(function(t){ return t.kind; }); })()");
    rec("K3b 受け渡しの操作(仲間に渡す・主人公へ戻す)も、同じ画面の指輪装備に残っている", targets.includes("equip") && targets.includes("actor") === (targets.length > 1), JSON.stringify(targets));
    let all = true; for (const [slot, id] of Object.entries(SLOTS_A)) all = (await assignKey(slot, `e.skillId === '${id}'`)) && all;
    all = (await assignKey("q", "e.kind === 'ultimate' && e.ringId === 'apollo'")) && all;
    rec("K3c 実キーで 5 枠と Q を登録(RingLoadout の既存の検証・保存)", all && same((await rlState()).slots, SLOTS_A) && (await rlState()).ultimate === "apollo", JSON.stringify(await rlState()));
    await s.shot("skillmenu_K3_assigned");
    rec("K3d 保存領域($gameSystem)にも入っている", same(await json("$gameSystem._projectRRingLoadout"), await rlState()), "");
    await ev("SceneManager.goto(Scene_Map); 'ok'"); await waitScene("Scene_Map", 8000);
    await openMainMenu(); await toCommand("skill"); await ok(); await waitScene("Scene_ProjectRSkillLoadout", 8000);
    const st = await scr();
    rec("K3e 登録済みなら、開き直しても空の案内は出ない(編成は残っている)", st.notice === "" && st.slots === true, JSON.stringify(st));
    await ev("SceneManager.goto(Scene_Map); 'ok'"); await waitScene("Scene_Map", 8000);
  });

  await check("K4 ULTIMATE・ULTIMATE → Tab → 指輪画面(従来の入口)は変わらない", async () => {
    await openMainMenu(); await toCommand("ultimate"); await ok();
    rec("K4a ULTIMATE は神の選択画面(従来どおり)", await waitScene("Scene_ProjectRUltimateSelect", 8000), await sceneName());
    await c.tap("Tab", 90);
    rec("K4b ULTIMATE → Tab → 指輪画面(Scene_ProjectRRings・上の項目から)", await waitScene("Scene_ProjectRRings", 8000) && (await scr()).tabs === true, JSON.stringify(await scr()));
    await ev("SceneManager.goto(Scene_Map); 'ok'"); await waitScene("Scene_Map", 8000);
  });

  await check("K5 戦闘中は SKILL(メニュー自体)が開けない・編集できない", async () => {
    await begin(); await prep(2.2);
    await c.tap("Esc", 90); await sleep(700);
    rec("K5a 戦闘中の Esc: メインメニューは開かない", (await sceneName()) === "Scene_Map", await sceneName());
    rec("K5b SKILL を API から開こうとしても拒否される", (await ev("ProjectRMenuIntegration.openSkillLoadout()")) === false && (await sceneName()) === "Scene_Map", "");
    const before = JSON.stringify(await rlState());
    const r = await json(`[${RL}.setSkill('lmb','hermes_zetsu').ok, ${RL}.clearSkill('x').ok, ${RL}.setUltimate('hermes').ok, ${RL}.unequipRing('apollo').ok]`);
    rec("K5c RingLoadout の API も拒否され、状態は変わらない", r.every(v => v === false) && JSON.stringify(await rlState()) === before, JSON.stringify(r));
    await ev(`${FC}.end(); 'ok'`); await sleep(500);
    await openMainMenu(); await toCommand("skill"); await ok();
    rec("K5d 戦闘が終われば SKILL を開ける(編集できる)", await waitScene("Scene_ProjectRSkillLoadout", 8000), await sceneName());
    await ev("SceneManager.goto(Scene_Map); 'ok'"); await waitScene("Scene_Map", 8000);
  });

  const errs = s.errors();
  rec("K9 Console のエラーなし・ディスクへの書き込みなし", errs.length === 0 && (await ev("window.__diskWrites")) === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`
${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/skillmenu_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
