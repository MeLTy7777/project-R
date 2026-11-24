// Stage 3: Themis(5 スキル + Ultimate「神罰・最後の審判」)と「罪状」を、指輪モードのフィールド戦闘で実機(MZ Playtest)で確認する。CDP の実際のキー・マウスで操作する。
//   T1 罪科の刻印(3連撃)を LMB/Shift/E/X/C の全5枠で・Lv1〜3(3段目に当たった敵ごとに罪状 +1)   T2 戒律の宣告   T3 審理の鎖   T4 衡平の天秤   T5 断罪の判決
//   T6 罪状の台帳(上限3・8秒で全消去・見た目の輪)   T7 Q の Ultimate(0.8秒後の範囲・罪状ボーナス・ゲージは成功後だけ消費・奥義のダメージでゲージは増えない・カットインなし)
//   T8 セーブ内容 → ロード(装備・Q・カードのLvは保存され、罪状などの実行時の効果は保存されない)   T9 Hermes の薙ぎ払いは変わらない   T10 Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/themis_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject を差し替えてブロック)
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
  // 追跡されているデータ(HEAD の Map001)では、テスト敵(イベント 1・2)が開始位置の画面内(x=42)にいて、戦闘中扱いになり指輪の付与が失敗する。
  // 未コミットの DEV の Map データ(x=52 へ移した版)に頼らず、スクリプトの側で画面の外へ置く(以降の検証は putEnemy で敵を都度置くので、検証の内容は変わらない)。
  const parkFar = () => ev("(function(){ [[1, 52, 15], [2, 52, 18]].forEach(function(p){ var e = $gameMap.event(p[0]); if (!e) return; e.locate(p[1], p[2]); e._realX = p[1]; e._realY = p[2]; }); return 'ok'; })()");
  await parkFar(); await sleep(300);
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
  const GA = "ProjectRUltimateGauge", GM = "ProjectRGodSummonManager", UA = "ProjectRUltimateActivation", TS = "ProjectRThemisSkills", TU = "ProjectRThemisUltimate";
  const T5 = ["themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
  const KEYFOR = { lmb: () => c.click(undefined, 60), shift: () => c.tap("Shift", 80), e: () => c.tap("E", 70), x: () => c.tap("X", 70), c: () => c.tap("C", 70) };
  const fillGauge = () => ev(`(function(){ var g = ${GA}; return g.hasUltimateGaugeState() ? g.addUltimateGauge(g.getUltimateGaugeMax(), 'cdp').ok : false; })()`);
  const gaugeNow = () => json(`({ has: ${GA}.hasUltimateGaugeState(), cur: ${GA}.getUltimateGauge(), max: ${GA}.getUltimateGaugeMax() })`);
  const ultHud = () => json(`${FC}.getHudState().slots.filter(function(s){ return s.slot === 'ultimate'; })[0]`);
  const lvl = (id, n) => ev(`${D}.setCardLevel('${id}', ${n}).ok`);
  const state = () => json(`${TS}.getState()`);
  // Themis: 5 つのカードを所持させ、Lv を揃えて、5枠へ登録(戦闘の外・RingLoadout の正規API)
  const setSlots = async map => {
    await ev(`${FC}.end(); 'ok'`); await sleep(200);
    const r = await json(`(function(){ var out = []; ${SLOTS.map(sl => `out.push(${RL}.clearSkill('${sl}').ok);`).join(" ")} var m = ${JSON.stringify(map)}; Object.keys(m).forEach(function(sl){ out.push(${RL}.setSkill(sl, m[sl]).ok); }); return out; })()`);
    return r.every(Boolean);
  };
  const dmg = async (id, fn) => { const h0 = await hp(id); await fn(); await sleep(700); return h0 - await hp(id); };
  const pCenter = () => json("({ x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 })");
  const evCenter = id => json(`({ x: $gameMap.event(${id})._realX + 0.5, y: $gameMap.event(${id})._realY + 0.5 })`);
  const cd = id => json(`(function(){ var v = ${FC}.getCooldowns()['${id}']; return v === undefined ? null : v; })()`);
  const enemyHit = (from, v) => ev(`(function(){ var it = Object.assign(new Game_Interpreter(), { _eventId: ${from} }); PluginManager.callCommand(it, 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: 'player', value: '${v}', exceedMaxHealth: 'false' }); return 'ok'; })()`);

  rec("T0 Themis を付与・装備・5カードを所持(Lv1)", await json(`(function(){ var a = ${D}.assignRingToPlayer('themis').ok, e = ${RL}.equipRing('themis').ok; ${JSON.stringify(T5)}.forEach(function(id){ ${D}.setCardOwned(id, true); ${D}.setCardLevel(id, 1); }); return a && e && ${RL}.getRingSkills('themis').length === 5; })()`), "");
  const E1 = 1, E2 = 2, E3 = 3;
  // Map001 の敵は「公式銃テスト敵」(イベント2)だけが <enemy>。もう1体(テスト用ゴブリン=イベント1。HPバーあり)を実行時だけ敵として扱う(ファイルは書かない)
  const patchEnemy = () => ev(`(function(){ var e = $gameMap.event(${E1}).event(); if (String(e.note).indexOf('<enemy>') < 0) e.note += String.fromCharCode(10) + '<enemy>'; return 'ok'; })()`);
  await patchEnemy();
  const bigAll = async () => { for (const i of [E1, E2, E3]) await bigHp(i); };
  const park = async () => { await ev(`${FC}.detachEnemy(${E1}); ${FC}.detachEnemy(${E2}); ${FC}.detachEnemy(${E3}); 'ok'`); };


  const sinOf = id => ev(`${TS}.sin.stacksOf($gameMap.event(${id}))`);
  const addSin = (id, n) => ev(`(function(){ for (var i = 0; i < ${n}; i++) ${TS}.sin.add($gameMap.event(${id}), 'cdp'); return ${TS}.sin.stacksOf($gameMap.event(${id})); })()`);
  const php = () => ev("$gameParty.leader().hp");
  const near = (a, b, tol) => Math.abs(a - b) <= tol;

  // ---- T1: 罪科の刻印(3段コンボ)を全5枠で・Lv1〜3 ----
  await check("T1 罪科の刻印: LMB/Shift/E/X/C の全5枠。1段目(扇)・2段目(扇)・3段目(貫通線)。3段目に当たった敵ごとに罪状 +1(1・2段目では付かない)", async () => {
    for (const sl of SLOTS) {
      rec(`T1-${sl}-0 ${sl} に罪科の刻印を登録`, (await setSlots({ [sl]: "themis_sin_mark" })) && (await json(`${RL}.getSlots()['${sl}']`)) === "themis_sin_mark", "");
      await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.2, 0); await putEnemy(E2, 2.6, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const a1 = await hp(E1), a2 = await hp(E2);
      await KEYFOR[sl](); await sleep(500);                                                     // 1段目(扇 1.8 マス: 奥の敵(2.6)には届かない)
      const b1 = await hp(E1), b2 = await hp(E2), sinAfter1 = await sinOf(E1);
      await KEYFOR[sl](); await sleep(500);                                                     // 2段目(受付時間内)
      const c1 = await hp(E1), sinAfter2 = await sinOf(E1);
      await KEYFOR[sl](); await sleep(800);                                                     // 3段目(貫通線 3.0 マス: 2体)
      const d1 = await hp(E1), d2 = await hp(E2), s1 = await sinOf(E1), s2 = await sinOf(E2);
      const r = { step1: a1 - b1, step1far: a2 - b2, step2: b1 - c1, step3: c1 - d1, step3far: b2 - d2, sin: [sinAfter1, sinAfter2, s1, s2] };
      rec(`T1-${sl}-a ${sl}: 1段目は手前だけ・2段目も当たる・3段目は2体(貫通)に当たり、罪状は3段目の後だけ +1ずつ`, r.step1 > 0 && r.step1far === 0 && r.step2 > 0 && r.step3 > 0 && r.step3far > 0 && r.sin[0] === 0 && r.sin[1] === 0 && r.sin[2] === 1 && r.sin[3] === 1, JSON.stringify(r));
      await sleep(600);
    }
    await s.shot("themis_T1_sin_mark");
    const out = {};
    for (const n of [1, 3]) {
      await lvl("themis_sin_mark", n); await setSlots({ lmb: "themis_sin_mark" }); await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.2, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const h0 = await hp(E1); await KEYFOR.lmb(); await sleep(500); const h1 = await hp(E1); await KEYFOR.lmb(); await sleep(500); const h2 = await hp(E1); await KEYFOR.lmb(); await sleep(800); const h3 = await hp(E1);
      out[n] = { step1: h0 - h1, step2: h1 - h2, step3: h2 - h3 }; await sleep(600);
    }
    rec("T1-lv Lv3 / Lv1: 1段目 110/90・2段目 125/100・3段目 145/115(各段のダメージの比)", near(out[3].step1 / out[1].step1, 110 / 90, 0.2) && near(out[3].step2 / out[1].step2, 1.25, 0.15) && near(out[3].step3 / out[1].step3, 145 / 115, 0.15), JSON.stringify(out));
    await lvl("themis_sin_mark", 1);
  });

  // ---- T2: 戒律の宣告 ----
  await check("T2 戒律の宣告: 全5枠・カーソル上の敵1体・罪状 +1・Lv1〜3 で威力が上がる(100/120/140 %)・Cooldown 7 秒・射程外は何も起きず Cooldown も使わない", async () => {
    for (const sl of SLOTS) {
      rec(`T2-${sl}-0 ${sl} に戒律の宣告`, await setSlots({ [sl]: "themis_edict" }), "");
      await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 2.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const d = await dmg(E1, () => KEYFOR[sl]()), sn = await sinOf(E1), c = await cd("themis_edict");
      rec(`T2-${sl} ${sl}: ダメージ・罪状 +1・Cooldown 7`, d > 0 && sn === 1 && near(c, 7, 1.5), JSON.stringify({ d, sn, cd: c }));
      await sleep(300);
    }
    await s.shot("themis_T2_edict");
    const out = {};
    for (const n of [1, 2, 3]) {
      await lvl("themis_edict", n); await setSlots({ e: "themis_edict" }); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 2.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
      out[n] = await dmg(E1, () => KEYFOR.e()); await sleep(300);
    }
    rec("T2-lv Lv1 < Lv2 < Lv3(100/120/140 %)", out[1] > 0 && out[2] > out[1] && out[3] > out[2] && near(out[3] / out[1], 1.4, 0.15) && near(out[2] / out[1], 1.2, 0.1), JSON.stringify(out));
    await lvl("themis_edict", 1);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 6.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
    const dfar = await dmg(E1, () => KEYFOR.e());
    rec("T2-out 射程外(4 マスより遠い)は何も起きず、Cooldown も罪状も使わない", dfar === 0 && (await sinOf(E1)) === 0 && (await cd("themis_edict")) === 0, JSON.stringify({ dfar, cd: await cd("themis_edict") }));
  });

  // ---- T3: 審理の鎖 ----
  await check("T3 審理の鎖: 罪状 +1・拘束 1.5/2.0/2.5 秒(Lv1〜3)・ダメージなし・Cooldown 10 秒・Cooldown 中の再発動は何も起きない", async () => {
    rec("T3-0 X に審理の鎖", await setSlots({ x: "themis_chain" }), "");
    for (const n of [1, 2, 3]) {
      await lvl("themis_chain", n); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(150); await aimAt(E1); await sleep(100);
      const h0 = await hp(E1); await KEYFOR.x(); await sleep(250);
      const st = await state(), hold = st.holds.find(h => h.eventId === E1);
      rec(`T3-lv${n} Lv${n}: 拘束(残り ${[1.5, 2, 2.5][n - 1]} 秒前後)・罪状 +1・ダメージなし・Cooldown 10`, !!hold && hold.kind === "immobilize" && near(hold.remaining, [1.5, 2, 2.5][n - 1], 0.5) && (await sinOf(E1)) === 1 && (await hp(E1)) === h0 && near(await cd("themis_chain"), 10, 1.5), JSON.stringify({ hold, sin: await sinOf(E1), cd: await cd("themis_chain") }));
      if (n === 1) { await s.shot("themis_T3_chain"); const before = await cd("themis_chain"); await KEYFOR.x(); await sleep(250); rec("T3-cd Cooldown 中の再発動は何も起きない(罪状も増えない)", (await cd("themis_chain")) <= before + 0.05 && (await sinOf(E1)) === 1, `${before} → ${await cd("themis_chain")}`); }
      await sleep(300);
    }
    await lvl("themis_chain", 1); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 5.5, 0); await sleep(150); await aimAt(E1); await sleep(100); await KEYFOR.x(); await sleep(200);
    rec("T3-out 射程外(3.5 マスより遠い)は何も起きず Cooldown も使わない", (await state()).holds.length === 0 && (await cd("themis_chain")) === 0 && (await sinOf(E1)) === 0, "");
  });

  // ---- T4: 衡平の天秤 ----
  await check("T4 衡平の天秤: 被ダメージ 20/30/40 % 軽減(Lv1〜3)・最初の敵の攻撃の元の敵へ罪状 +1(1回だけ)・Cooldown 13 秒・効果中の再発動は何も起きない", async () => {
    rec("T4-0 C に衡平の天秤", await setSlots({ c: "themis_balance" }), "");
    for (const [n, red] of [[1, 0.2], [3, 0.4]]) {
      await lvl("themis_balance", n); await begin(); await park(); await place(44, 12); await bigAll(); await topUp(); await sleep(200);
      const p0 = await php(); await enemyHit(E1, "-60"); await sleep(200); const plain = p0 - await php(); await topUp(); await sleep(100);
      await KEYFOR.c(); await sleep(150); const st = await state();
      const p1 = await php(); await enemyHit(E1, "-60"); await sleep(250); const reduced = p1 - await php(); const s1 = await sinOf(E1);
      await enemyHit(E1, "-60"); await sleep(200);
      rec(`T4-lv${n} Lv${n}: 被ダメージ ${red * 100}% 軽減(${plain} → ${reduced})・攻撃した敵に罪状 +1(2回目は増えない)・Cooldown 13`, !!st.balance && plain > 0 && near(reduced / plain, 1 - red, 0.12) && s1 === 1 && (await sinOf(E1)) === 1 && near(await cd("themis_balance"), 13, 1.5), JSON.stringify({ plain, reduced, sin: [s1, await sinOf(E1)], cd: await cd("themis_balance") }));
      if (n === 1) { await s.shot("themis_T4_balance"); const before = await cd("themis_balance"); await KEYFOR.c(); await sleep(200); rec("T4-cd 再発動は何も起きない", (await cd("themis_balance")) <= before + 0.05, ""); }
      await sleep(2800);
      rec(`T4-end Lv${n}: 2.5 秒で効果が終わる`, (await state()).balance === null, JSON.stringify((await state()).balance));
    }
    await lvl("themis_balance", 1);
  });

  // ---- T5: 断罪の判決 ----
  await check("T5 断罪の判決: 罪状 0 の基準に対して 罪状3 で 2.2 倍(1 + 0.4 × 3)・ダメージの後にだけ罪状を全部消費・Lv1〜3・Cooldown 8 秒・射程外は罪状を消費しない", async () => {
    rec("T5-0 C に断罪の判決", await setSlots({ c: "themis_verdict" }), "");
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(200); await aimAt(E1); await sleep(120);
    const d0 = await dmg(E1, () => KEYFOR.c());
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(200); await aimAt(E1); await sleep(120);
    const sn = await addSin(E1, 3); await s.shot("themis_T5_sin3");
    const d3 = await dmg(E1, () => KEYFOR.c());
    rec("T5-a 罪状 3 → 罪状 0 の 2.2 倍(160 % → 160 × 2.2 %)・消費後は罪状 0・Cooldown 8", sn === 3 && d0 > 0 && near(d3 / d0, 2.2, 0.25) && (await sinOf(E1)) === 0 && near(await cd("themis_verdict"), 8, 1.5), JSON.stringify({ d0, d3, sn, sin: await sinOf(E1), cd: await cd("themis_verdict") }));
    const out = {};
    for (const n of [1, 3]) {
      await lvl("themis_verdict", n); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(200); await aimAt(E1); await sleep(120); out[n] = await dmg(E1, () => KEYFOR.c());
    }
    rec("T5-lv Lv3 / Lv1 = 230 / 160 ≒ 1.44", near(out[3] / out[1], 2.3 / 1.6, 0.15), JSON.stringify(out));
    await lvl("themis_verdict", 1); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 6.5, 0); await sleep(200); await aimAt(E1); await sleep(120); await addSin(E1, 2);
    await KEYFOR.c(); await sleep(300);
    rec("T5-out 射程外は罪状を消費せず Cooldown も使わない", (await sinOf(E1)) === 2 && (await cd("themis_verdict")) === 0, JSON.stringify({ sin: await sinOf(E1) }));
  });

  // ---- T6: 罪状の台帳(実機の時間: 8 秒で全部消える・上限3)と見た目 ----
  await check("T6 罪状の台帳: 上限 3・8 秒で全部消える・戦闘の終了で消える・見た目の輪が出る(1つ)", async () => {
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(200);
    const caps = []; for (let i = 0; i < 4; i++) caps.push(await addSin(E1, 1));
    rec("T6-a 罪状は最大 3(4回目も 3)・見た目の輪が出ている", JSON.stringify(caps) === "[1,2,3,3]" && (await ev(`${TS}.fx.count()`)) >= 1, JSON.stringify({ caps, fx: await ev(`${TS}.fx.count()`) }));
    await s.shot("themis_T6_sin_ring");
    await sleep(7000); rec("T6-b 7 秒ではまだ残る", (await sinOf(E1)) === 3, String(await sinOf(E1)));
    await sleep(1900); rec("T6-c 8 秒で全部消える(輪も消える)", (await sinOf(E1)) === 0 && (await ev(`${TS}.fx.count()`)) === 0, JSON.stringify({ sin: await sinOf(E1), fx: await ev(`${TS}.fx.count()`) }));
    await addSin(E1, 2); await ev(`${FC}.end(); 'ok'`); await sleep(200);
    rec("T6-d 戦闘の終了で全部消える", (await json(`${TS}.getState().sins`)).length === 0, "");
  });

  // ---- T7: Q の Ultimate「神罰・最後の審判」 ----
  await check("T7 Ultimate: Q・満タンのゲージ → 0.8 秒後に半径 2.8 マスの範囲・250 % × (1 + 0.2 × 罪状)・成功後だけゲージ消費・ゲージは奥義のダメージで増えない・カットインなし・罪状は命中した敵だけ消費", async () => {
    await ev(`${FC}.end(); ${RL}.setUltimate('themis'); 'ok'`); await sleep(250);
    // 基準 = 戒律の宣告 Lv1(100 %)のダメージ
    await setSlots({ e: "themis_edict" }); await ev(`${RL}.setUltimate('themis'); 'ok'`);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 2.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
    const base = await dmg(E1, () => KEYFOR.e());
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await putEnemy(E2, 9.0, 0); await sleep(150); await aimDx(3); await addSin(E1, 2); await addSin(E2, 3); await fillGauge(); await sleep(100);
    const g0 = await gaugeNow(); const h0 = await hp(E1), h2 = await hp(E2);
    await c.tap("Q", 80); await sleep(150);
    const act = await ev(`${TU}.isActive()`), g1 = await gaugeNow(), cut = await json("ProjectRCutIn.getActive()"), fxn = await ev(`${TS}.fx.count()`);
    await s.shot("themis_T7_ultimate_ring");
    rec("T7-a Q で発動(裁きの輪が出る)・ゲージは成功後に 0・カットインは出ない(ほかの神の絵を使わない)", act === true && g0.cur === g0.max && g1.cur === 0 && cut.length === 0 && fxn >= 1, JSON.stringify({ act, g0, g1, cut, fxn }));
    await sleep(1200);
    const d1 = h0 - await hp(E1), g2 = await gaugeNow();
    rec("T7-b 0.8 秒後: 範囲内の敵(罪状 2)に 250 % × 1.4 = 3.5 倍(戒律 100 % を基準)・範囲外の敵(罪状 3)は無傷で罪状も残る・命中した敵の罪状は消費", near(d1 / base, 3.5, 0.5) && (await hp(E2)) === h2 && (await sinOf(E1)) === 0 && (await sinOf(E2)) === 3, JSON.stringify({ base, d1, ratio: d1 / base, sin: [await sinOf(E1), await sinOf(E2)] }));
    rec("T7-c 奥義のダメージではゲージは増えない・終われば輪も消える", g2.cur === 0 && !(await ev(`${TU}.isActive()`)), JSON.stringify(g2));
    await s.shot("themis_T7_ultimate_after");
    // 失敗(ゲージ不足)ではゲージ・罪状は変わらない
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(150); await aimDx(3); await addSin(E1, 1); await c.tap("Q", 80); await sleep(1200);
    rec("T7-d ゲージ不足では発動せず、罪状も消費しない", !(await ev(`${TU}.isActive()`)) && (await sinOf(E1)) === 1 && (await hp(E1)) === (await hp(E1)), "");
    // U キーは指輪モードでは無効 / Hermes の奥義のカットインは従来どおり
    await ev(`${FC}.end(); ${RL}.setUltimate('hermes'); 'ok'`); await sleep(250);
    await begin(); await park(); await place(44, 12); await bigAll(); await fillGauge(); await sleep(100); await c.tap("Q", 80); await sleep(250);
    const cut2 = await json("ProjectRCutIn.getActive()");
    rec("T7-e 比較: Hermes の奥義のカットインは従来どおり出る", cut2.length === 1 && cut2[0].godId === "hermes", JSON.stringify(cut2));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- T8: セーブ → ロード: 装備・Q・Lv は保存され、実行時の効果(罪状・拘束・天秤・奥義)は保存されない ----
  await check("T8 セーブ内容: 罪状・拘束・天秤の状態は入らない。装備・5枠・Q・カードの Lv は復元され、Themis の通常スキルがロード後も動く", async () => {
    await ev(`${RL}.setUltimate('themis'); 'ok'`);
    await setSlots({ lmb: "themis_sin_mark", shift: "themis_chain", e: "themis_edict", x: "themis_balance", c: "themis_verdict" }); await lvl("themis_chain", 2);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(150); await aimAt(E1); await addSin(E1, 3); await ev(`${TS}.sin.add($gameMap.event(${E1}), 'x'); 'ok'`);
    const saved = await ev("JsonEx.stringify(DataManager.makeSaveContents())");
    // Themis 専用の検査: 保存データとして正しい語(指輪ID・スキルID)以外で themis を含む語、または罪状・拘束の専用の語があれば違反。Hermes の正規データ(granted など)は対象にしない
    const OKW = ["themis", "themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
    const leak = [...new Set([...(saved.match(/[A-Za-z0-9_]*themis[A-Za-z0-9_]*/gi) || []).filter(x => !OKW.includes(x)), ...(saved.match(/sinStack|"sins?"|0\.0001/g) || [])])];
    rec("T8a セーブ内容に罪状・拘束・天秤の状態(Themis 専用の語: sinStack・sin(s)・0.0001・指輪ID/スキルID以外の themis_ 系)は入らない", leak.length === 0 && saved.includes("themis_sin_mark"), `len=${saved.length} ${JSON.stringify(leak.slice(0, 4))}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    // 本物のロードと同じ流れ(Scene_Load.onLoadSuccess): extractSaveContents → 同じマップを読み直し → Scene_Map
    await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(saved)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
    await sleep(800); await waitMap(1); await sleep(1200);
    const after = await json(`({ slots: ${RL}.getSlots(), q: ${RL}.getUltimate(), eq: ${RL}.getEquippedRings(), lv: ${D}.getPersistentData().cardOwnership['themis_chain'].level, sins: ${TS}.getState().sins })`);
    rec("T8b 保存データ(RingLoadout・Core)の状態: 5枠・Q・装備・Lv が保たれ、実行時の罪状は残らない", after.slots.lmb === "themis_sin_mark" && after.slots.shift === "themis_chain" && after.slots.e === "themis_edict" && after.slots.x === "themis_balance" && after.slots.c === "themis_verdict" && after.q === "themis" && after.eq.includes("themis") && after.lv === 2 && after.sins.length === 0, JSON.stringify(after));
    await patchEnemy(); await parkFar();                                                        // マップを読み直したので、実行時の <enemy> の付与と、テスト敵の退避をやり直す
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 1.2, 0); await sleep(150); await aimAt(E1); await sleep(100);
    const d = await dmg(E1, () => KEYFOR.lmb());
    rec("T8c 続けて LMB の罪科の刻印が動く", d > 0, `damage=${d}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- T9: Hermes・Janus・Apollo は変わらない(薙ぎ払いの3段コンボ・双門の2段コンボ) ----
  await check("T9 既存の指輪: Hermes の薙ぎ払い(3段)は罪状を付けない・Themis のコンボとの切り替えで1段目から", async () => {
    await ev(`${D}.assignRingToPlayer('hermes'); ${RL}.equipRing('hermes'); ${D}.setCardOwned('hermes_sweep', true); ${D}.setCardLevel('hermes_sweep', 1); 'ok'`);
    rec("T9-0 LMB に薙ぎ払い・E に罪科の刻印", await setSlots({ lmb: "hermes_sweep", e: "themis_sin_mark" }), "");
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 1.2, 0); await sleep(200); await aimAt(E1); await sleep(120);
    for (let i = 0; i < 3; i++) { await KEYFOR.lmb(); await sleep(i < 2 ? 380 : 700); }
    const swSteps = await json(`${FC}.getLastResult()`);
    rec("T9-a 薙ぎ払い 3段・罪状は付かない", swSteps.step === 3 && swSteps.skillId === "hermes_sweep" && (await sinOf(E1)) === 0, JSON.stringify(swSteps));
    await KEYFOR.e(); await sleep(400); const sw = await json(`${FC}.getLastResult()`);
    rec("T9-b 罪科の刻印へ切り替えると1段目から", sw.step === 1 && sw.skillId === "themis_sin_mark", JSON.stringify(sw));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  const errs = s.errors();
  rec("T10 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/themis_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
