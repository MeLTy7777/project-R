// Stage 4: Athena(5 スキル + Ultimate「アイギス・不落の戦陣」)を、指輪モードのフィールド戦闘で実機(MZ Playtest)で確認する。CDP の実際のキー・マウス入力。
//   A1 アイギスの加護(全5枠・軽減・4秒)   A2 護槍旋陣(全周2回)   A3 断陣の投槍(タップ = 2段コンボ / 長押し = 投擲・投擲の再使用 10 秒はタップと別)   A4 破陣の盾衝(衝突の安全・怯み)   A5 女神の迎撃(前方 140°)
//   A6 Q の Ultimate(陣・開いた瞬間の 180 %・陣の中の軽減・ゲージは成功後だけ消費・奥義のダメージでゲージは増えない)   A7 セーブ → ロード   A8 既存の指輪(薙ぎ払い・黄金の矢 Lv3 の長押し)は変わらない   A9 Console のエラーなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/athena_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject を差し替えてブロックする)
//   追跡されているデータ(HEAD)だけで動く: テスト敵(Map001 のイベント 1・2)の位置は、スクリプトが実行時に画面の外へ退避する(lib.cjs の parkFar)。未コミットの Map データには頼らない。
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
  const GA = "ProjectRUltimateGauge", AS = "ProjectRAthenaSkills", AU = "ProjectRAthenaUltimate";
  const T5 = ["athena_aegis", "athena_spear_circle", "athena_spear_throw", "athena_shield_charge", "athena_counter"];
  const KEYFOR = { lmb: () => c.click(undefined, 60), shift: () => c.tap("Shift", 80), e: () => c.tap("E", 70), x: () => c.tap("X", 70), c: () => c.tap("C", 70) };
  const HOLDFOR = { lmb: ms => c.click(undefined, undefined, ms), shift: ms => c.tap("Shift", ms), e: ms => c.tap("E", ms), x: ms => c.tap("X", ms), c: ms => c.tap("C", ms) };
  const fillGauge = () => ev(`(function(){ var g = ${GA}; return g.hasUltimateGaugeState() ? g.addUltimateGauge(g.getUltimateGaugeMax(), 'cdp').ok : false; })()`);
  const gaugeNow = () => json(`({ has: ${GA}.hasUltimateGaugeState(), cur: ${GA}.getUltimateGauge(), max: ${GA}.getUltimateGaugeMax() })`);
  const lvl = (id, n) => ev(`${D}.setCardLevel('${id}', ${n}).ok`);
  const state = () => json(`${AS}.getState()`);
  const setSlots = async map => {
    await ev(`${FC}.end(); 'ok'`); await sleep(200);
    const r = await json(`(function(){ var out = []; ${SLOTS.map(sl => `out.push(${RL}.clearSkill('${sl}').ok);`).join(" ")} var m = ${JSON.stringify(map)}; Object.keys(m).forEach(function(sl){ out.push(${RL}.setSkill(sl, m[sl]).ok); }); return out; })()`);
    return r.every(Boolean);
  };
  const dmg = async (id, fn) => { const h0 = await hp(id); await fn(); await sleep(700); return h0 - await hp(id); };
  const cd = id => json(`(function(){ var v = ${FC}.getCooldowns()['${id}']; return v === undefined ? null : v; })()`);
  const lockNow = () => ev(`${FC}.getBeamState().cooldowns['athena_spear_throw'] || 0`);
  const holdLog = () => json(`${FC}.getHoldState().log`);
  const enemyHit = (from, v) => ev(`(function(){ var it = Object.assign(new Game_Interpreter(), { _eventId: ${from} }); PluginManager.callCommand(it, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: 'player', value: '${v}', exceedMaxHealth: 'false' }); return 'ok'; })()`);
  const php = () => ev("$gameParty.leader().hp");
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const E1 = 1, E2 = 2, E3 = 3;
  // Map001 の敵は「公式銃テスト敵」(イベント2)だけが <enemy>。もう1体(テスト用ゴブリン=イベント1。HPバーあり)を実行時だけ敵として扱う(ファイルは書かない)
  const patchEnemy = () => ev(`(function(){ var e = $gameMap.event(${E1}).event(); if (String(e.note).indexOf('<enemy>') < 0) e.note += String.fromCharCode(10) + '<enemy>'; return 'ok'; })()`);
  await patchEnemy();
  const bigAll = async () => { for (const i of [E1, E2, E3]) await bigHp(i); };
  const park = async () => { await ev(`${FC}.detachEnemy(${E1}); ${FC}.detachEnemy(${E2}); ${FC}.detachEnemy(${E3}); 'ok'`); };
  const fresh = async (dx1, dy1 = 0, dx2 = null, dy2 = 0) => {                                  // 戦闘を始め直し、主人公の位置と敵を置く(敵 E1 は (dx1, dy1)、E2 は (dx2, dy2))
    await begin(); await park(); await place(44, 12); await bigAll();
    await putEnemy(E1, dx1, dy1); if (dx2 !== null) await putEnemy(E2, dx2, dy2); await sleep(200);
  };

  rec("A0 Athena を付与・装備・5カードを所持(Lv1)", await json(`(function(){ var a = ${D}.assignRingToPlayer('athena').ok, e = ${RL}.equipRing('athena').ok; ${JSON.stringify(T5)}.forEach(function(id){ ${D}.setCardOwned(id, true); ${D}.setCardLevel(id, 1); }); return a && e && ${RL}.getRingSkills('athena').length === 5; })()`), "");

  // ---- A1: アイギスの加護 ----
  await check("A1 アイギスの加護: 全5枠・被ダメージ 25/45 %(Lv1/3)軽減・4 秒で終わる・Cooldown 14 秒・効果中の再発動は何も起きない", async () => {
    for (const sl of SLOTS) {
      rec(`A1-${sl}-0 ${sl} にアイギスの加護`, await setSlots({ [sl]: "athena_aegis" }), "");
      await fresh(3, 0); await topUp(); await sleep(150);
      const p0 = await php(); await enemyHit(E1, "-60"); await sleep(200); const plain = p0 - await php(); await topUp(); await sleep(100);
      await KEYFOR[sl](); await sleep(150); const st = await state();
      const p1 = await php(); await enemyHit(E1, "-60"); await sleep(250); const reduced = p1 - await php();
      const before = await cd("athena_aegis"); await KEYFOR[sl](); await sleep(150);
      rec(`A1-${sl} ${sl}: 被ダメージ 25% 軽減(${plain} → ${reduced})・Cooldown 14・再発動は何も起きない`, !!st.aegis && plain > 0 && near(reduced / plain, 0.75, 0.12) && near(before, 14, 1.5) && (await cd("athena_aegis")) <= before + 0.05, JSON.stringify({ plain, reduced, cd: before }));
      if (sl === "lmb") await s.shot("athena_A1_aegis");
    }
    await lvl("athena_aegis", 3); await setSlots({ x: "athena_aegis" }); await fresh(3, 0); await topUp(); await sleep(150);
    const p0 = await php(); await enemyHit(E1, "-60"); await sleep(200); const plain = p0 - await php(); await topUp(); await sleep(100);
    await KEYFOR.x(); await sleep(150); const p1 = await php(); await enemyHit(E1, "-60"); await sleep(250); const reduced = p1 - await php();
    rec("A1-lv3 Lv3: 被ダメージ 45% 軽減", plain > 0 && near(reduced / plain, 0.55, 0.12), JSON.stringify({ plain, reduced }));
    await sleep(4200); rec("A1-end 4 秒で効果が終わる(状態も外れる)", (await state()).aegis === null && !(await ev("ProjectRApolloStatus.has('player', 'athena_aegis')")), JSON.stringify((await state()).aegis));
    await lvl("athena_aegis", 1);
  });

  // ---- A2: 護槍旋陣 ----
  await check("A2 護槍旋陣: 全5枠・全周 半径 2 マスを 0.3 秒間隔で2回(真後ろにも当たる)・Lv1〜3 で 70/80/90 %・Cooldown 8 秒・範囲外は当たらない", async () => {
    for (const sl of SLOTS) {
      rec(`A2-${sl}-0 ${sl} に護槍旋陣`, await setSlots({ [sl]: "athena_spear_circle" }), "");
      await fresh(1.2, 0, -1.2, 0); await aimAt(E1); await sleep(120);
      const a1 = await hp(E1), a2 = await hp(E2);
      await KEYFOR[sl](); await sleep(120); const m1 = a1 - await hp(E1), m2 = a2 - await hp(E2); await sleep(600); const t1 = a1 - await hp(E1), t2 = a2 - await hp(E2);
      rec(`A2-${sl} ${sl}: 前も真後ろも当たり・2回目(0.3 秒後)で合計 ≒ 2 倍・Cooldown 8`, m1 > 0 && m2 > 0 && near(t1 / m1, 2, 0.35) && near(t2 / m2, 2, 0.35) && near(await cd("athena_spear_circle"), 8, 1.5), JSON.stringify({ m1, m2, t1, t2 }));
      if (sl === "lmb") await s.shot("athena_A2_circle");
    }
    const out = {};
    for (const n of [1, 3]) { await lvl("athena_spear_circle", n); await setSlots({ e: "athena_spear_circle" }); await fresh(1.2, 0); await aimAt(E1); await sleep(120); out[n] = await dmg(E1, () => KEYFOR.e()); await sleep(300); }
    rec("A2-lv Lv3 / Lv1 = 90 / 70 ≒ 1.29", out[1] > 0 && near(out[3] / out[1], 90 / 70, 0.2), JSON.stringify(out));
    await lvl("athena_spear_circle", 1); await setSlots({ e: "athena_spear_circle" }); await fresh(3.0, 0); await aimAt(E1); await sleep(120);
    rec("A2-out 半径 2 マスの外は当たらない", (await dmg(E1, () => KEYFOR.e())) === 0, "");
  });

  // ---- A3: 断陣の投槍(タップ = 2段コンボ / 長押し = 投擲)----
  await check("A3 断陣の投槍: 全5枠。タップ = 2段コンボ(1段目 扇・2段目 貫通線)/ 長押し(0.25 秒)= 貫通する投擲1回(離しても二重に撃たない)", async () => {
    for (const sl of SLOTS) {
      rec(`A3-${sl}-0 ${sl} に断陣の投槍`, await setSlots({ [sl]: "athena_spear_throw" }), "");
      await fresh(1.2, 0, 2.8, 0); await aimAt(E1); await sleep(120);
      const a1 = await hp(E1), a2 = await hp(E2);
      await KEYFOR[sl](); await sleep(500); const b1 = await hp(E1), b2 = await hp(E2), step1 = await json(`${FC}.getLastResult()`);
      await KEYFOR[sl](); await sleep(700); const c1 = await hp(E1), c2 = await hp(E2), step2 = await json(`${FC}.getLastResult()`);
      rec(`A3-${sl}-tap ${sl}: タップ 1段目は手前だけ(扇 1.8)・2段目は2体(貫通線 2.4)`, step1.step === 1 && step2.step === 2 && a1 - b1 > 0 && a2 - b2 === 0 && b1 - c1 > 0 && b2 - c2 > 0, JSON.stringify({ step1: step1.step, step2: step2.step, d: [a1 - b1, a2 - b2, b1 - c1, b2 - c2] }));
      await sleep(600);
      await fresh(1.5, 0, 3.4, 0); await aimAt(E1); await sleep(120);
      const h1 = await hp(E1), h2 = await hp(E2);
      await HOLDFOR[sl](450); await sleep(300); const d1 = h1 - await hp(E1), d2 = h2 - await hp(E2), log = await holdLog(), thr = log.filter(e => e.skillId === "athena_spear_throw" && e.outcome === "throw").length;
      await sleep(500); const e1 = h1 - await hp(E1);
      rec(`A3-${sl}-hold ${sl}: 長押しで貫通する投擲(2体)・1回だけ(離しても二重に撃たない)・投擲の再使用 10 秒が始まる`, d1 > 0 && d2 > 0 && thr === 1 && e1 === d1 && near(await lockNow(), 10, 1.5), JSON.stringify({ d1, d2, thr, e1, lock: await lockNow() }));
      if (sl === "lmb") await s.shot("athena_A3_throw");
      await sleep(300);
    }
    // 投擲の再使用中: 長押しは何も出ない・タップのコンボは使える
    await setSlots({ lmb: "athena_spear_throw" }); await fresh(1.5, 0); await aimAt(E1); await sleep(120);
    await HOLDFOR.lmb(450); await sleep(300); const h0 = await hp(E1);
    await HOLDFOR.lmb(450); await sleep(300); const noThrow = (await hp(E1)) === h0, log2 = await holdLog();
    await sleep(500); await KEYFOR.lmb(); await sleep(500); const tapDmg = h0 - await hp(E1);
    rec("A3-lock 再使用中の長押しは何も出ない・タップのコンボは使える", noThrow && log2.some(e => e.outcome === "throwFailed" && e.reason === "throwLock") && tapDmg > 0, JSON.stringify({ noThrow, tapDmg, lock: await lockNow() }));
    const hudLock = await json(`${FC}.getHudState().slots.filter(function(s){ return s.slot === 'attack'; })[0].lock`);
    rec("A3-hud HUD に投擲の再使用(cooldown)が出る", !!hudLock && hudLock.state === "cooldown" && hudLock.cooldown > 0, JSON.stringify(hudLock));
    // HUD(実画面が読む getHudSlots): T のカウントダウンが出て、減っていく。枠は使える(タップのコンボ可)
    const hudAtk = () => json(`${FC}.getHudSlots().filter(function(s){ return s.slot === 'attack'; })[0]`);
    const tv = x => { const m = /T (\d+\.\d)$/.exec(x.detail || ""); return m ? Number(m[1]) : null; };
    const hs1 = await hudAtk(); await sleep(1300); const hs2 = await hudAtk();
    rec("A3-hud-t HUD に T のカウントダウンが出て、1.3 秒で減る・枠は使える(タップのコンボ可)", tv(hs1) !== null && tv(hs2) !== null && tv(hs2) < tv(hs1) - 0.8 && hs1.available === true && hs1.disabled === false && hs1.lock.state === "cooldown", JSON.stringify({ d1: hs1.detail, d2: hs2.detail, available: hs1.available, lock: hs1.lock }));
    await s.shot("athena_A3_lock");
    // Lv の威力(投擲 160 / 220 %)
    const out = {};
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    for (const n of [1, 3]) { await lvl("athena_spear_throw", n); await setSlots({ lmb: "athena_spear_throw" }); await fresh(1.5, 0); await aimAt(E1); await sleep(120); const h = await hp(E1); await HOLDFOR.lmb(450); await sleep(500); out[n] = h - await hp(E1); }
    rec("A3-lv Lv3 / Lv1 の投擲 = 220 / 160 ≒ 1.375", out[1] > 0 && near(out[3] / out[1], 2.2 / 1.6, 0.2), JSON.stringify(out));
    await lvl("athena_spear_throw", 1);
    // 長押しの溜めの表示: 押して 0.1〜0.25 秒の間だけ CHARGE(押している最中の画面の表示データ)
    await lvl("athena_spear_throw", 1); await setSlots({ lmb: "athena_spear_throw" }); await fresh(1.5, 0); await aimAt(E1); await sleep(120);
    await c.mouseDown(); await sleep(110); const chg = await hudAtk(); await c.mouseUp(); await sleep(500);
    rec("A3-chg 長押しの途中(0.1 秒以降)の HUD は CHARGE", chg.detail === "CHARGE" && chg.lock.state === "charging", JSON.stringify({ detail: chg.detail, lock: chg.lock }));
    // 10 秒後にまた投げられる(実時間)
    await setSlots({ lmb: "athena_spear_throw" }); await fresh(1.5, 0); await aimAt(E1); await sleep(120); await HOLDFOR.lmb(450); await sleep(300);
    await sleep(10300); const hh = await hp(E1); await HOLDFOR.lmb(450); await sleep(400);
    rec("A3-reuse 10 秒後に、もう一度投げられる", hh - await hp(E1) > 0 && near(await lockNow(), 10, 1.5), JSON.stringify({ lock: await lockNow() }));
  });

  // ---- A4: 破陣の盾衝 ----
  await check("A4 破陣の盾衝: 全5枠・約 0.3 秒で前進(最大 2 マス・敵の手前で止まる)・前方の敵に1回・通常の敵は怯む・Cooldown 10 秒・マップの端では失敗して Cooldown を使わない", async () => {
    for (const sl of SLOTS) {
      rec(`A4-${sl}-0 ${sl} に破陣の盾衝`, await setSlots({ [sl]: "athena_shield_charge" }), "");
      await fresh(2.8, 0); await aimAt(E1); await sleep(120);
      const p0 = await pos(), h0 = await hp(E1);
      await KEYFOR[sl](); const mid = await pos(); await sleep(250);
      const st = await state(), p1 = await pos(), d = h0 - await hp(E1);                          // 前進(0.3 秒)が終わった直後: 怯み(0.4 秒)の間に見る
      const moved = p1.x - p0.x;
      rec(`A4-${sl} ${sl}: 前進(${moved.toFixed(2)} マス・最大 2)・敵の手前で止まる・ダメージ・怯み・Cooldown 10`, moved > 0.5 && moved <= 2.05 && mid.x - p0.x < moved + 0.01 && d > 0 && st.staggers.some(x => x.eventId === E1 || x.remaining > 0) && near(await cd("athena_shield_charge"), 10, 1.5), JSON.stringify({ moved, d, stagger: st.staggers, cd: await cd("athena_shield_charge") }));
      if (sl === "lmb") await s.shot("athena_A4_charge");
      await sleep(500);
    }
    await setSlots({ shift: "athena_shield_charge" }); await begin(); await park(); await place(0, 12); await bigAll(); await sleep(200);
    await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(150); const ft = await json("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() - 24 })"); await c.pointer(0, ft.y); await sleep(150);   // 左端(カーソルは画面の左端 = 主人公のすぐ左 = 向きは真左)
    const q0 = await pos(); await KEYFOR.shift(); await sleep(600); const q1 = await pos();
    rec("A4-edge マップの左端(進めない)では失敗して動かず、Cooldown も使わない", near(q1.x, q0.x, 0.05) && near(q1.y, q0.y, 0.05) && (await cd("athena_shield_charge")) === 0, JSON.stringify({ q0, q1, cd: await cd("athena_shield_charge") }));
  });

  // ---- A5: 女神の迎撃 ----
  await check("A5 女神の迎撃: 全5枠・前方からの敵の直接攻撃1回を 60 % 軽減して受け、反撃する・背後からは受け流さない・Cooldown 11 秒・2回目は軽減なし", async () => {
    for (const sl of SLOTS) {
      rec(`A5-${sl}-0 ${sl} に女神の迎撃`, await setSlots({ [sl]: "athena_counter" }), "");
      await fresh(2.5, 0); await aimAt(E1); await sleep(120); await topUp(); await sleep(100);
      const p0 = await php(); await enemyHit(E1, "-60"); await sleep(250); const plain = p0 - await php(); await topUp(); await sleep(100);
      const h0 = await hp(E1); await KEYFOR[sl](); const p1 = await php(); await enemyHit(E1, "-60"); await sleep(300); const armed = true, reduced = p1 - await php(), counter = h0 - await hp(E1), after = (await state()).counter;          // 受付(0.6 秒)は CDP の往復より短い: キーのあとは、すぐに1回の往復で攻撃を当てる
      const p2 = await php(); await enemyHit(E1, "-60"); await sleep(250); const second = p2 - await php();
      rec(`A5-${sl} ${sl}: 60% 軽減(${plain} → ${reduced})・反撃(${counter})・1回で終わる・2回目は軽減なし・Cooldown 11`, !!armed && plain > 0 && near(reduced / plain, 0.4, 0.12) && counter > 0 && after === null && near(second / plain, 1, 0.12) && near(await cd("athena_counter"), 11, 1.5), JSON.stringify({ plain, reduced, counter, second, cd: await cd("athena_counter") }));
      if (sl === "lmb") await s.shot("athena_A5_counter");
      await sleep(300);
    }
    await setSlots({ x: "athena_counter" }); await fresh(-2.5, 0); await s.aim(3, 0); await sleep(150); await topUp(); await sleep(100);
    const p0 = await php(); await enemyHit(E1, "-60"); await sleep(250); const plain = p0 - await php(); await topUp(); await sleep(100);
    const h0 = await hp(E1); await KEYFOR.x(); const p1 = await php(); await enemyHit(E1, "-60"); const stillArmed = !!(await state()).counter; await sleep(250); const back = p1 - await php();
    rec("A5-back 背後(カーソルと反対側)からの攻撃は軽減しない・反撃しない・待機は続く", plain > 0 && near(back / plain, 1, 0.12) && (await hp(E1)) === h0 && stillArmed, JSON.stringify({ plain, back, stillArmed }));
  });

  // ---- A6: Q の Ultimate「アイギス・不落の戦陣」 ----
  await check("A6 Ultimate: Q・満タンのゲージ → 半径 3 マスの陣(6 秒)・開いた瞬間に 180 %・陣の中は被ダメージ 60 % 軽減(外へ出たら外れる)・成功後だけゲージ消費・奥義のダメージでゲージは増えない・カットインなし", async () => {
    await setSlots({ lmb: "athena_spear_throw" }); await ev(`${RL}.setUltimate('athena'); 'ok'`);
    await fresh(1.2, 0, 8.0, 0); await aimAt(E1); await sleep(120);
    const b0 = await hp(E1); await KEYFOR.lmb(); await sleep(500); const base = b0 - await hp(E1);                      // 基準 = 断陣の投槍のタップ 1段目(85 %)
    await fresh(2.0, 0, 8.0, 0); await aimAt(E1); await sleep(120); await fillGauge(); await sleep(100);
    const g0 = await gaugeNow(), h1 = await hp(E1), h2 = await hp(E2), pc = await pos();
    await c.tap("Q", 80); await sleep(250);
    const act = await ev(`${AU}.isActive()`), g1 = await gaugeNow(), cut = await json("ProjectRCutIn.getActive()"), fxn = await ev(`${AS}.fx.count()`), ust = await json(`${AU}.getState()`);
    await s.shot("athena_A6_field");
    const d1 = h1 - await hp(E1);
    rec("A6-a Q で発動(陣の輪)・ゲージは成功後に 0・カットインは出ない・陣の中心 = 主人公の位置", act === true && g0.cur === g0.max && g1.cur === 0 && cut.length === 0 && fxn >= 1 && near(ust.center.x, pc.x + 0.5, 0.2), JSON.stringify({ act, g0, g1, cut, fxn, center: ust.center }));
    rec("A6-b 開いた瞬間: 範囲内の敵に 180 %(断陣の投槍 1段目 85 % を基準に ≒ 2.1 倍)・範囲外(8 マス)は無傷", base > 0 && near(d1 / base, 1.8 / 0.85, 0.5) && (await hp(E2)) === h2, JSON.stringify({ base, d1, ratio: d1 / base }));
    await topUp(); await sleep(100); const p0 = await php(); await enemyHit(E1, "-60"); await sleep(250); const inside = p0 - await php();
    await place(44 + 6, 12); await sleep(300); await topUp(); await sleep(100); const p1 = await php(); await enemyHit(E1, "-60"); await sleep(250); const outside = p1 - await php();
    const stOut = await json(`${AU}.getState()`);
    await place(44, 12); await sleep(300); await topUp(); await sleep(100); const p2 = await php(); await enemyHit(E1, "-60"); await sleep(250); const back = p2 - await php();
    rec("A6-c 陣の中は 60 % 軽減・外(6 マス離れる)は軽減なし(陣は主人公に付いてこない)・戻ればまた軽減", outside > 0 && near(inside / outside, 0.4, 0.15) && stOut.inside === false && near(back / outside, 0.4, 0.15), JSON.stringify({ inside, outside, back, insideFlagOutside: stOut.inside }));
    const g2 = await gaugeNow(); rec("A6-d 奥義のダメージではゲージは増えない", g2.cur === 0, JSON.stringify(g2));
    await sleep(6200); rec("A6-e 6 秒で陣が終わる(軽減の状態も外れる)", !(await ev(`${AU}.isActive()`)) && !(await ev("ProjectRApolloStatus.has('player', 'athena_ultimate_field')")), "");
    // 失敗(ゲージ不足)ではゲージは変わらない / 陣が残っている間の再発動
    await begin(); await park(); await place(44, 12); await bigAll(); await sleep(150); await c.tap("Q", 80); await sleep(300);
    rec("A6-f ゲージ不足では発動しない", !(await ev(`${AU}.isActive()`)), "");
    await fillGauge(); await sleep(100); await c.tap("Q", 80); await sleep(250); await fillGauge(); await sleep(100); const gm = (await gaugeNow()).cur; await c.tap("Q", 80); await sleep(250);
    rec("A6-g 陣が残っている間の再発動は失敗して、ゲージを消費しない", (await gaugeNow()).cur === gm && gm > 0, JSON.stringify({ gm, now: (await gaugeNow()).cur }));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    // 比較: Hermes の奥義のカットインは従来どおり
    await ev(`${RL}.setUltimate('hermes'); 'ok'`); await sleep(250);
    await begin(); await park(); await place(44, 12); await bigAll(); await fillGauge(); await sleep(100); await c.tap("Q", 80); await sleep(250);
    const cut2 = await json("ProjectRCutIn.getActive()");
    rec("A6-h 比較: Hermes の奥義のカットインは従来どおり出る", cut2.length === 1 && cut2[0].godId === "hermes", JSON.stringify(cut2));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- A7: セーブ → ロード ----
  await check("A7 セーブ内容: 加護・旋陣・盾衝・迎撃・投擲の再使用・陣の状態は入らない。装備・5枠・Q・カードの Lv は復元され、ロード後も動く", async () => {
    await ev(`${RL}.setUltimate('athena'); 'ok'`);
    await setSlots({ lmb: "athena_spear_throw", shift: "athena_shield_charge", e: "athena_spear_circle", x: "athena_aegis", c: "athena_counter" }); await lvl("athena_counter", 2);
    await fresh(2.0, 0); await aimAt(E1); await sleep(120); await fillGauge(); await sleep(100);
    await KEYFOR.x(); await sleep(150); await KEYFOR.c(); await sleep(100); await HOLDFOR.lmb(450); await sleep(200); await c.tap("Q", 80); await sleep(250);
    const live = await json(`({ s: ${AS}.getState(), u: ${AU}.isActive(), lock: ${FC}.getBeamState().cooldowns })`);
    const saved = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    // Athena 専用の検査: 保存データとして正しい語(指輪ID・スキルID)以外で athena を含む語、または実行時の状態の語があれば違反。Hermes の正規データ(granted など)は対象にしない
    const OKW = ["athena", ...T5];
    const leak = [...new Set([...(saved.match(/[A-Za-z0-9_]*athena[A-Za-z0-9_]*/gi) || []).filter(x => !OKW.includes(x)), ...(saved.match(/"staggers?"|"beamCd"|0\.0001|athena_ultimate_field/g) || [])])];
    rec("A7a 実行時の状態が実際に有るうえで、セーブ内容に Athena の実行時の状態は入らない(指輪ID・スキルIDだけ)", !!live.s.aegis && live.u === true && leak.length === 0 && saved.includes("athena_spear_throw"), `len=${saved.length} ${JSON.stringify(leak.slice(0, 4))}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(saved)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
    await sleep(800); await waitMap(1); await sleep(1200);
    const after = await json(`({ slots: ${RL}.getSlots(), q: ${RL}.getUltimate(), eq: ${RL}.getEquippedRings(), lv: ${D}.getPersistentData().cardOwnership['athena_counter'].level, st: ${AS}.getState(), u: ${AU}.isActive() })`);
    rec("A7b 保存データ(RingLoadout・Core): 5枠・Q・装備・Lv が保たれ、実行時の状態は残らない", after.slots.lmb === "athena_spear_throw" && after.slots.shift === "athena_shield_charge" && after.slots.e === "athena_spear_circle" && after.slots.x === "athena_aegis" && after.slots.c === "athena_counter" && after.q === "athena" && after.eq.includes("athena") && after.lv === 2 && after.st.aegis === null && after.st.counter === null && after.st.staggers.length === 0 && after.u === false, JSON.stringify(after));
    await patchEnemy(); await s.parkFar();                                                       // マップを読み直したので、実行時の <enemy> の付与と、テスト敵の退避をやり直す
    await fresh(1.2, 0); await aimAt(E1); await sleep(100);
    const d = await dmg(E1, () => KEYFOR.lmb());
    rec("A7c 続けて LMB の断陣の投槍(タップ)が動く", d > 0, `damage=${d}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- A8: 既存の指輪は変わらない(薙ぎ払い・黄金の矢 Lv3 の溜め・ビーム) ----
  await check("A8 既存の指輪: Hermes の薙ぎ払い(3段)は変わらない・黄金の矢 Lv3 の長押しビーム / タップはどの入力でも従来どおり(投槍と同時に装備しても)", async () => {
    await ev(`(function(){ ${D}.assignRingToPlayer('hermes'); ${RL}.equipRing('hermes'); ${D}.assignRingToPlayer('apollo'); ${RL}.equipRing('apollo'); ${D}.setCardOwned('hermes_sweep', true); ${D}.setCardLevel('hermes_sweep', 1); ${D}.setCardOwned('apollo_golden_volley', true); ${D}.setCardLevel('apollo_golden_volley', 3); return 'ok'; })()`);
    rec("A8-0 LMB に薙ぎ払い・E に断陣の投槍", await setSlots({ lmb: "hermes_sweep", e: "athena_spear_throw" }), "");
    await fresh(1.2, 0); await aimAt(E1); await sleep(120);
    for (let i = 0; i < 3; i++) { await KEYFOR.lmb(); await sleep(i < 2 ? 380 : 700); }
    const sw = await json(`${FC}.getLastResult()`); rec("A8-a 薙ぎ払い 3段", sw.step === 3 && sw.skillId === "hermes_sweep", JSON.stringify(sw));
    rec("A8-hud 薙ぎ払いの HUD は従来どおり(lock は付かない・READY か強撃!。投槍へ切り替える前)", await json(`(function(){ var a = ${FC}.getHudSlots().filter(function(s){ return s.slot === 'attack'; })[0]; return !!a && a.lock === undefined && /^(強撃!|READY)$/.test(a.detail); })()`), "");
    await KEYFOR.e(); await sleep(400); const sp = await json(`${FC}.getLastResult()`); rec("A8-b 断陣の投槍へ切り替えると1段目から", sp.step === 1 && sp.skillId === "athena_spear_throw", JSON.stringify(sp));
    for (const [sl, label] of [["lmb", "マウス"], ["shift", "Shift"], ["x", "X"]]) {
      rec(`A8-${sl}-0 ${sl} に黄金の矢(Lv3)・C に断陣の投槍`, await setSlots({ [sl]: "apollo_golden_volley", c: "athena_spear_throw" }), "");
      await fresh(4.0, 0); await aimAt(E1); await sleep(120);
      await KEYFOR[sl](); await sleep(300); const log1 = await holdLog(); const tap = log1.filter(e => e.skillId === "apollo_golden_volley" && e.outcome === "tap").length;          // 短く押す = タップ(通常の発射)
      await sleep(500); await HOLDFOR[sl](1100); await sleep(300); const log2 = await holdLog(); const beam = log2.filter(e => e.skillId === "apollo_golden_volley" && e.outcome === "beam").length;          // 長く押す = ビーム(そのあと 6 秒は連射)
      rec(`A8-${sl} ${label}: 黄金の矢 Lv3 は 1.1 秒の長押しでビーム・短く押すとタップ(通常の発射)のまま。投槍の投擲は出ない`, beam >= 1 && tap >= 1 && log2.every(e => e.skillId !== "athena_spear_throw" || e.outcome !== "throw"), JSON.stringify({ beam, tap }));
    }
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  const errs = s.errors();
  rec("A9 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/athena_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
