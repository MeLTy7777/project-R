// Stage 2: Janus(5 スキル + Ultimate「始まりと終わりの門」)を、指輪モードのフィールド戦闘で実機(MZ Playtest)で確認する。CDP の実際のキー・マウスで操作する。
//   J1 双門(2連撃)を LMB/Shift/E/X/C の全5枠で・Lv1〜3   J2 閉門(拘束)・Lv1〜3・Cooldown   J3 反照(受け流し+反撃)
//   J4 表裏転化(位置の入れ替え)・Lv1〜3・Cooldown   J5 境界断ち(貫通線)・Lv1〜3・Cooldown
//   J8 Stage 2-E: 命中の手応え(HitFx/HitStop)・門と輪の見た目(コードで描く)・Janus の奥義にカットインを出さない
//   J6 セーブ内容 → ロード(装備・Q・カードのLvは保存され、実行時の効果は保存されない)   J7 Q の Ultimate(2つの門)・ゲージは成功後だけ消費   J9 Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/janus_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない = saveObject を差し替えてブロック)
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
  const GA = "ProjectRUltimateGauge", GM = "ProjectRGodSummonManager", UA = "ProjectRUltimateActivation", JS = "ProjectRJanusSkills", JU = "ProjectRJanusUltimate";
  const J5 = ["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"];
  const KEYFOR = { lmb: () => c.click(undefined, 60), shift: () => c.tap("Shift", 80), e: () => c.tap("E", 70), x: () => c.tap("X", 70), c: () => c.tap("C", 70) };
  const fillGauge = () => ev(`(function(){ var g = ${GA}; return g.hasUltimateGaugeState() ? g.addUltimateGauge(g.getUltimateGaugeMax(), 'cdp').ok : false; })()`);
  const gaugeNow = () => json(`({ has: ${GA}.hasUltimateGaugeState(), cur: ${GA}.getUltimateGauge(), max: ${GA}.getUltimateGaugeMax() })`);
  const ultHud = () => json(`${FC}.getHudState().slots.filter(function(s){ return s.slot === 'ultimate'; })[0]`);
  const lvl = (id, n) => ev(`${D}.setCardLevel('${id}', ${n}).ok`);
  const state = () => json(`${JS}.getState()`);
  // Janus: 5 つのカードを所持させ、Lv を揃えて、5枠へ登録(戦闘の外・RingLoadout の正規API)
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

  rec("J0 Janus を付与・装備・5カードを所持(Lv1)", await json(`(function(){ var a = ${D}.assignRingToPlayer('janus').ok, e = ${RL}.equipRing('janus').ok; ${JSON.stringify(J5)}.forEach(function(id){ ${D}.setCardOwned(id, true); ${D}.setCardLevel(id, 1); }); return a && e && ${RL}.getRingSkills('janus').length === 5; })()`), "");
  const E1 = 1, E2 = 2, E3 = 3;
  // Map001 の敵は「公式銃テスト敵」(イベント2)だけが <enemy>。もう1体(テスト用ゴブリン=イベント1。HPバーあり)を実行時だけ敵として扱う(ファイルは書かない)
  const patchEnemy = () => ev(`(function(){ var e = $gameMap.event(${E1}).event(); if (String(e.note).indexOf('<enemy>') < 0) e.note += String.fromCharCode(10) + '<enemy>'; return 'ok'; })()`);
  await patchEnemy();
  const bigAll = async () => { for (const i of [E1, E2, E3]) await bigHp(i); };
  const park = async () => { await ev(`${FC}.detachEnemy(${E1}); ${FC}.detachEnemy(${E2}); ${FC}.detachEnemy(${E3}); 'ok'`); };

  // ---- J1: 双門(2連撃)を全5枠で・Lv1〜3 ----
  await check("J1 双門: LMB/Shift/E/X/C の全5枠。1段目(扇)→ 2段目(貫通線)。Lv1〜3 で1段目・2段目のダメージが増える", async () => {
    const perSlot = {};
    for (const sl of SLOTS) {
      rec(`J1-${sl}-0 ${sl} に双門を登録`, (await setSlots({ [sl]: "janus_dual_gate" })) && (await json(`${RL}.getSlots()['${sl}']`)) === "janus_dual_gate", "");
      await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.2, 0); await putEnemy(E2, 2.6, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const h1a = await hp(E1), h2a = await hp(E2);
      await KEYFOR[sl](); await sleep(500);                                                     // 1段目
      const h1b = await hp(E1), h2b = await hp(E2);
      await KEYFOR[sl](); await sleep(700);                                                     // 2段目(受付時間内)
      const h2c = await hp(E2);
      perSlot[sl] = { hit1: h1a - h1b, hit1far: h2a - h2b, hit2: h2b - h2c };
      rec(`J1-${sl}-a ${sl}: 1段目が手前の敵に当たり、奥の敵には当たらない / 2段目が奥の敵(貫通線の先)に当たる`, perSlot[sl].hit1 > 0 && perSlot[sl].hit1far === 0 && perSlot[sl].hit2 > 0, JSON.stringify(perSlot[sl]));
      await sleep(900);
    }
    await s.shot("janus_J1_dual");
    const out = {};
    for (const n of [1, 2, 3]) {
      await lvl("janus_dual_gate", n); await setSlots({ lmb: "janus_dual_gate" }); await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.2, 0); await putEnemy(E2, 2.6, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const a = await hp(E1), b = await hp(E2); await KEYFOR.lmb(); await sleep(500); const a2 = await hp(E1); await KEYFOR.lmb(); await sleep(700); const b2 = await hp(E2);
      out[n] = { hit1: a - a2, hit2: b - b2 }; await sleep(800);
    }
    const r1 = out[1], r2 = out[2], r3 = out[3];
    rec("J1-lv Lv1 < Lv2 < Lv3(1段目 100/108/115 %・2段目 125/135/150 %)", r1.hit1 > 0 && r2.hit1 >= r1.hit1 && r3.hit1 > r1.hit1 && r2.hit2 >= r1.hit2 && r3.hit2 > r1.hit2 && Math.abs(r3.hit1 / r1.hit1 - 1.15) < 0.12 && Math.abs(r3.hit2 / r1.hit2 - 1.2) < 0.12, JSON.stringify(out));
    await lvl("janus_dual_gate", 1);
  });

  // ---- J2: 閉門 ----
  await check("J2 閉門: ダメージなし・拘束(Lv1〜3 = 1.5/2.0/2.5 秒)・Cooldown 10 秒(Cooldown 中の再発動は何も起きない)", async () => {
    rec("J2-0 X に閉門", await setSlots({ x: "janus_closed_gate" }), "");
    for (const n of [1, 2, 3]) {
      await lvl("janus_closed_gate", n); await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 3.0, 0); await sleep(150); await aimAt(E1); await sleep(100);
      const h0 = await hp(E1); await KEYFOR.x(); await sleep(250);
      const st = await state(), hold = st.holds.find(h => h.eventId === E1);
      rec(`J2-lv${n} Lv${n}: 拘束され(残り ${[1.5, 2, 2.5][n - 1]} 秒前後)・ダメージなし・Cooldown 10`, !!hold && hold.kind === "immobilize" && Math.abs(hold.remaining - [1.5, 2, 2.5][n - 1]) < 0.5 && (await hp(E1)) === h0 && Math.abs((await cd("janus_closed_gate")) - 10) < 1.5, JSON.stringify({ hold, hp: [h0, await hp(E1)], cd: await cd("janus_closed_gate") }));
      if (n === 1) {
        await s.shot("janus_J2_closed");
        const before = await cd("janus_closed_gate"); await KEYFOR.x(); await sleep(250);
        rec("J2-cd Cooldown 中の再発動は何も起きない(Cooldown は延びない)", (await cd("janus_closed_gate")) <= before + 0.05, `${before} → ${await cd("janus_closed_gate")}`);
      }
      await sleep(300);
    }
    await lvl("janus_closed_gate", 1); await begin(); await park(); await place(44, 12); await bigAll();
    await putEnemy(E1, 3.0, 0); await putEnemy(E2, 6.0, 0); await sleep(150); await aimAt(E1); await sleep(100); await KEYFOR.x(); await sleep(250);
    const st2 = await state(); rec("J2-out 範囲外の敵は拘束されない", st2.holds.some(h => h.eventId === E1) && !st2.holds.some(h => h.eventId === E2), JSON.stringify(st2.holds));
  });

  // ---- J3: 反照 ----
  await check("J3 反照: 発動後の受け流し窓で敵の近接を無効化して反撃(Lv1〜3 の窓 0.4/0.5/0.6 秒)・Cooldown 9 秒", async () => {
    rec("J3-0 E に反照", await setSlots({ e: "janus_reflection" }), "");
    for (const n of [1, 2, 3]) {
      await lvl("janus_reflection", n); await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.0, 0); await sleep(150); await aimAt(E1); await sleep(100);
      await KEYFOR.e(); await sleep(60);
      const st = await state();
      rec(`J3-lv${n}-a Lv${n}: 受け流し待機が始まる(窓 ${[0.4, 0.5, 0.6][n - 1]} 秒)・Cooldown 9`, !!st.armed && Math.abs((st.armed.remaining ?? st.armed.seconds ?? [0.4, 0.5, 0.6][n - 1]) - [0.4, 0.5, 0.6][n - 1]) < 0.25 && Math.abs((await cd("janus_reflection")) - 9) < 1.5, JSON.stringify({ armed: st.armed, cd: await cd("janus_reflection") }));
      const php0 = await ev("$gameParty.leader().hp"), ehp0 = await hp(E1);
      await enemyHit(E1, "-40"); await sleep(250);
      const php1 = await ev("$gameParty.leader().hp"), ehp1 = await hp(E1);
      const rl = await json(`${JS}.getLastResult('reflectionHit')`);                         // 本物のゴブリンの攻撃が先に受け流されることもある(その場合、追加の一撃は通常どおり当たる)
      rec(`J3-lv${n}-b Lv${n}: 敵の一撃を受け流して無効化し(Lv${n} の倍率で)反撃する。受け流しの後は待機が消える`, !!rl && rl.negated === true && rl.countered === true && rl.level === n && rl.scale === [1, 1.25, 1.5][n - 1] && ehp1 < ehp0 && (n === 1 || php1 >= php0) && !(await state()).armed, JSON.stringify({ php: [php0, php1], ehp: [ehp0, ehp1], rl }));
      if (n === 1) await s.shot("janus_J3_reflection");
      await sleep(300);
    }
    await lvl("janus_reflection", 1); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 1.0, 0); await sleep(120);
    await KEYFOR.e(); await sleep(800);
    const php0 = await ev("$gameParty.leader().hp"); await enemyHit(E1, "-40"); await sleep(250);
    rec("J3-end 窓(0.4 秒)が切れたあとの敵の攻撃は通常どおり当たる", (await ev("$gameParty.leader().hp")) < php0, "");
  });

  // ---- J4: 表裏転化 ----
  await check("J4 表裏転化: カーソルの敵と位置を入れ替える(Lv1〜3 = 範囲 2.5/3.0/3.5 マス)・ダメージなし・範囲外は失敗して Cooldown を消費しない・Cooldown 12 秒", async () => {
    rec("J4-0 C に表裏転化", await setSlots({ c: "janus_inversion" }), "");
    for (const n of [1, 2, 3]) {
      await lvl("janus_inversion", n); await begin(); await park(); await place(44, 12); await bigAll();
      const reach = [2.5, 3, 3.5][n - 1];
      await putEnemy(E1, reach - 0.3, 0); await sleep(200); await aimAt(E1); await sleep(100);
      const p0 = await pCenter(), e0 = await evCenter(E1), h0 = await hp(E1);
      await KEYFOR.c(); await sleep(350);
      const p1 = await pCenter(), e1 = await evCenter(E1);
      rec(`J4-lv${n}-a Lv${n}: プレイヤーと敵の位置が入れ替わる・ダメージなし・Cooldown 12`, Math.abs(p1.x - e0.x) < 0.6 && Math.abs(e1.x - p0.x) < 0.6 && (await hp(E1)) === h0 && Math.abs((await cd("janus_inversion")) - 12) < 1.5, JSON.stringify({ p0, e0, p1, e1, cd: await cd("janus_inversion") }));
      if (n === 1) await s.shot("janus_J4_inversion");
      await sleep(300);
    }
    await lvl("janus_inversion", 1); await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 4.5, 0); await sleep(200); await aimAt(E1); await sleep(100);
    const p0 = await pCenter(); await KEYFOR.c(); await sleep(300); const p1 = await pCenter();
    rec("J4-out 範囲外(4.5 マス)は失敗: 位置は変わらず Cooldown も消費しない", Math.abs(p1.x - p0.x) < 0.05 && !((await cd("janus_inversion")) > 0.05), JSON.stringify({ p0, p1, cd: await cd("janus_inversion"), last: await json(`${FC}.getLastResult()`) }));
  });

  // ---- J5: 境界断ち ----
  await check("J5 境界断ち: 0.2 秒の溜めのあと、貫通する線(4マス)に 180/210/240 %。各敵に1回・Cooldown 7 秒", async () => {
    rec("J5-0 Shift に境界断ち", await setSlots({ shift: "janus_boundary_slash" }), "");
    const out = {};
    for (const n of [1, 2, 3]) {
      await lvl("janus_boundary_slash", n); await begin(); await park(); await place(44, 12); await bigAll();
      await putEnemy(E1, 1.5, 0); await putEnemy(E2, 3.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
      const a = await hp(E1), b = await hp(E2); await KEYFOR.shift(); await sleep(60);
      const early = (a - await hp(E1)) + (b - await hp(E2));
      await sleep(700); out[n] = { d1: a - await hp(E1), d2: b - await hp(E2), early };
      if (n === 1) { await s.shot("janus_J5_slash"); rec("J5-cd Cooldown 7 秒", Math.abs((await cd("janus_boundary_slash")) - 7) < 1.5, String(await cd("janus_boundary_slash"))); }
      await sleep(300);
    }
    rec("J5-lv 溜め中(0.06 秒)は無傷 / 貫通線の2体に当たる / Lv1 < Lv2 < Lv3 (180/210/240 %)", out[1].early === 0 && out[1].d1 > 0 && out[1].d2 > 0 && out[2].d1 >= out[1].d1 && out[3].d1 > out[1].d1 && Math.abs(out[3].d1 / out[1].d1 - 240 / 180) < 0.15, JSON.stringify(out));
  });

  // ---- J7: Q の Ultimate ----
  await check("J7 Q の Ultimate「始まりと終わりの門」: ゲージ不足では発動しない / 満タンで実キー Q → 0.3 秒後・0.9 秒後に範囲攻撃 / 成功後だけゲージ消費 / U は無効", async () => {
    await ev(`${FC}.end(); 'ok'`); await sleep(250);
    rec("J7-0 Q = Janus(ULTIMATE メニュー側 = ヘルメース)", await json(`(function(){ ${D}.setUltimateRing('hermes'); return ${RL}.setUltimate('janus').ok; })()`), "");
    const core0 = await ev(`JSON.stringify(${D}.getPersistentData())`);
    await setSlots({ lmb: "janus_dual_gate" });
    await ev(`${RL}.setUltimate('janus'); 'ok'`);
    await begin(); await park(); await place(44, 12); await bigAll();
    const g0 = await gaugeNow(), h0 = await ultHud(), m = await json(`({ ring: ${GM}.getPersistentUltimateRingId(), god: ${GM}.getPersistentUltimateGodId() })`);
    rec("J7a 神・指輪は janus・ゲージあり(0)・HUD は charging", m.ring === "janus" && m.god === "janus" && g0.has === true && g0.cur === 0 && h0.state === "charging", JSON.stringify({ m, g0, h0: h0.state }));
    await aimDx(3); await c.tap("Q", 80); await sleep(300);
    rec("J7b ゲージ不足の Q: 発動しない(gaugeNotFull)・ゲージ変化なし", (await json(`${FC}.getLastResult().reason`)) === "gaugeNotFull" && !(await ev(`${JU}.isActive()`)), JSON.stringify(await json(`${FC}.getLastResult()`)));
    await fillGauge(); await sleep(150);
    const h1 = await ultHud(), g1 = await gaugeNow();
    rec("J7c 満タンで HUD は ready", h1.state === "ready" && h1.ready === true && g1.cur === g1.max && g1.max > 0, JSON.stringify({ h1: h1.state, g1 }));
    await c.tap("U", 80); await sleep(300);
    rec("J7d 実キー U: 無効(指輪モード)・ゲージは満タンのまま", !(await ev(`${JU}.isActive()`)) && (await gaugeNow()).cur === g1.max, "");
    await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(120);
    await putEnemy(E1, 3.0, 0); await putEnemy(E2, 5.6, 0); await sleep(150); await aimDx(3); await sleep(100);      // E1 = 門の中心 / E2 = 中心から 2.6(1つ目の半径 2 の外・2つ目の半径 2.8 の内側)
    const a = await hp(E1), b = await hp(E2);
    const f0 = await sf();
    await c.tap("Q", 80);
    const r = await json(`${UA}.getLastUltimateActivationResult()`);
    rec("J7e 実キー Q: 始まる(成功)・成功後にゲージ消費(満タン → 0)・2つの門が開く", !!r && r.ok === true && r.godId === "janus" && (await ev(`${JU}.isActive()`)) === true && (await gaugeNow()).cur === 0, JSON.stringify(r));
    // フレーム数で計測する(スクリーンショットなどで時間が空かないように、続けて監視してから撮る)
    const log = []; const t0 = Date.now();
    while (Date.now() - t0 < 2200) { log.push({ f: (await sf()) - f0, a: a - await hp(E1), b: b - await hp(E2) }); await sleep(15); }
    const firstA = log.find(x => x.a > 0), firstB = log.find(x => x.b > 0), secondA = log.find(x => firstA && x.a > firstA.a);
    const last = log[log.length - 1];
    rec("J7f 1つ目: 約 0.3 秒(18 フレーム)後に内側の敵だけ(外側の敵は無傷)", !!firstA && firstA.f >= 8 && firstA.f <= 40 && firstA.b === 0, JSON.stringify({ firstA, firstB }));
    rec("J7g 2つ目: 約 0.9 秒(54 フレーム)後に外側の敵にも届き、内側の敵はもう一度(合計 150 + 250 = 400 %)・各回1回だけ", !!secondA && secondA.f >= 40 && secondA.f <= 90 && !!firstB && firstB.f >= 40 && Math.abs(last.a / firstA.a - 400 / 150) < 0.4 && Math.abs(last.b / firstA.a - 250 / 150) < 0.4 && !(await ev(`${JU}.isActive()`)), JSON.stringify({ firstA, secondA, firstB, last }));
    await s.shot("janus_J7_ultimate_end");
    const core1 = await ev(`JSON.stringify(${D}.getPersistentData())`);
    rec("J7h Core の選択・保存データは不変(Q = janus は RingLoadout 側)", core0 === core1 && (await ev(`${D}.getUltimateRingId()`)) === "hermes", "");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- J6: セーブ → ロード ----
  await check("J6 セーブ内容: 装備・5枠・Q・カードのLv は保存され、実行時の効果(拘束・反照待機・奥義)は保存されない / ロード後も5枠が動く", async () => {
    await lvl("janus_closed_gate", 3); await setSlots({ lmb: "janus_dual_gate", shift: "janus_closed_gate", e: "janus_reflection", x: "janus_inversion", c: "janus_boundary_slash" });
    await ev(`${RL}.setUltimate('janus'); 'ok'`);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(150); await aimAt(E1); await sleep(100); await KEYFOR.shift(); await sleep(250);
    const contents = await ev(`JsonEx.stringify(DataManager.makeSaveContents())`);
    rec("J6a セーブ内容に拘束・奥義の実行時の状態は入らない", !/"holds"|"armed"|JanusUltimate|"sequence"/.test(contents) && contents.includes("janus_closed_gate") && contents.includes("janus_boundary_slash"), `len=${contents.length}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    // 本物のロードと同じ流れ(Scene_Load.onLoadSuccess): extractSaveContents → 同じマップを読み直し → Scene_Map
    await ev(`(function(){ var c = JsonEx.parse(${JSON.stringify(contents)}); DataManager.extractSaveContents(c); $gamePlayer.reserveTransfer($gameMap.mapId(), $gamePlayer.x, $gamePlayer.y); $gamePlayer.requestMapReload(); SceneManager.goto(Scene_Map); return 'ok'; })()`);
    await sleep(800); await waitMap(1); await sleep(1200); await s.parkFar();
    const after = await json(`({ slots: ${RL}.getSlots(), q: ${RL}.getUltimate(), eq: ${RL}.getEquippedRings(), lv: ${D}.getPersistentData().cardOwnership['janus_closed_gate'].level, state: ${JS}.getState() })`);
    rec("J6b ロード後: 5枠・Q・装備・Lv が復元され、実行時の効果は残らない", after.slots.lmb === "janus_dual_gate" && after.slots.shift === "janus_closed_gate" && after.slots.e === "janus_reflection" && after.slots.x === "janus_inversion" && after.slots.c === "janus_boundary_slash" && after.q === "janus" && after.eq.includes("janus") && after.lv === 3 && after.state.holds.length === 0 && !after.state.armed, JSON.stringify(after));
    await patchEnemy();                                                                         // マップを読み直したので、実行時の <enemy> の付与をやり直す
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 1.2, 0); await sleep(150); await aimAt(E1); await sleep(100);
    const d = await dmg(E1, () => KEYFOR.lmb());
    rec("J6c ロード後も LMB の双門が動く", d > 0, `damage=${d}`);
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  // ---- J8: Stage 2-E: 命中の手応え・見た目・カットイン ----
  await check("J8 Stage 2-E: 命中の手応え(HitFx/HitStop)・門と輪の見た目・Janus の奥義にカットインを出さない(Hermes の絵を使わない)", async () => {
    const hitStats = () => json(`${FC}.getHitFx().stats`);
    const fxN = () => ev(`${JS}.fx.count()`);
    // マップの更新だけを止めて(輪・線・敵の動きがその場で止まる)撮る。slowOn/slowOff = 止める/戻す(実時間の戦闘の時計も同じ更新で進むので、止めている間は効果の時間も進まない)
    const slowOn = () => ev("if (!window.__origMU) { window.__origMU = Game_Map.prototype.update; Game_Map.prototype.update = function() {}; } 1"), slowOff = () => ev("if (window.__origMU) { Game_Map.prototype.update = window.__origMU; window.__origMU = null; } 1");
    // 境界断ち: 予備動作の線 → 斬撃の光。当たった敵に強撃の手応え(実ゲームでは HP が次のフレームで減る → 確定する)
    await patchEnemy(); await lvl("janus_boundary_slash", 1); rec("J8-0 Shift に境界断ち", await setSlots({ shift: "janus_boundary_slash" }), "");
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 1.5, 0); await putEnemy(E2, 3.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
    const s0 = await hitStats(); await KEYFOR.shift(); await slowOn(); await sleep(150);
    rec("J8a 境界断ち: 予備動作の線が出ている(輪・線は 1 つ)", (await fxN()) === 1, String(await fxN())); await s.shot("janus_J8_slash_windup");
    await slowOff(); await sleep(60); await slowOn(); await sleep(100); await s.shot("janus_J8_slash_release"); await slowOff(); await sleep(900);
    const s1 = await hitStats(), act = await json(`${FC}.getHitFx().active`);
    rec("J8b 境界断ち: 2体に命中の手応えが確定する(点滅・反動・ヒットストップ・SE。SE は1回の斬撃につき1回)", s1.confirmed - s0.confirmed === 2 && s1.se - s0.se === 1 && s1.flashes - s0.flashes === 2, JSON.stringify({ s0, s1, act }));
    rec("J8c 斬撃が終われば見た目も消える", (await fxN()) === 0, String(await fxN()));
    // 閉門・反照・表裏転化の見た目
    await setSlots({ x: "janus_closed_gate", e: "janus_reflection", c: "janus_inversion" });
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await putEnemy(E2, 6.5, 0); await sleep(200); await aimAt(E1); await sleep(120);
    await KEYFOR.x(); await slowOn(); await sleep(300); const n1 = await fxN(); await s.shot("janus_J8_closed_gate"); await slowOff();
    rec("J8d 閉門: 門が閉じる輪 + 拘束した敵の輪が出ている(1つ以上)", n1 >= 1, JSON.stringify({ n1, st: await state() }));
    await sleep(300); await putEnemy(E1, 7.0, 0); await putEnemy(E2, 9.0, 0); await sleep(150); const c0 = (await json(`${JS}.fx.stats()`)).created; await KEYFOR.e(); await slowOn(); await sleep(30); const n2 = await fxN(), c1 = (await json(`${JS}.fx.stats()`)).created; await s.shot("janus_J8_reflection"); await slowOff();
    const rh = await json(`${JS}.getLastResult('reflectionHit')`);
    rec("J8e 反照: 待機の輪が出る(敵の攻撃を受け流せば、光も出る。本物の敵の攻撃で早く消えることもある)", c1 - c0 >= 1, JSON.stringify({ created: c1 - c0, n2, st: await state() }));
    await sleep(900);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 2.2, 0); await sleep(200); await aimAt(E1); await sleep(120);
    await KEYFOR.c(); await slowOn(); await sleep(250); const n3 = await fxN(); await s.shot("janus_J8_inversion"); await slowOff();
    rec("J8f 表裏転化: 入れ替わった2か所に輪が出ている", n3 === 2, JSON.stringify({ n3, st: await state(), last: await json(`${FC}.getLastResult()`), fx: await json(`${JS}.fx.entries()`), stats: await json(`${JS}.fx.stats()`), frame: await sf() }));
    await sleep(1500);
    // 奥義: カットインは出ない(Hermes の絵を使わない)・門の見た目はある
    await ev(`${FC}.end(); 'ok'`); await sleep(250);
    await ev(`${RL}.setUltimate('janus'); 'ok'`);
    await begin(); await park(); await place(44, 12); await bigAll(); await putEnemy(E1, 3.0, 0); await sleep(150); await aimDx(3); await fillGauge(); await sleep(100);
    await c.tap("Q", 80); await sleep(120); await slowOn(); await sleep(100);
    const cut = await json("ProjectRCutIn.getActive()"), ng = await fxN();
    await s.shot("janus_J8_ultimate_portals");
    rec("J8g 奥義: カットインは出ない(Hermes の目元の絵を使わない)・2つの門が出ている", cut.length === 0 && ng >= 2, JSON.stringify({ cut, ng }));
    await slowOff(); await sleep(190); await slowOn(); await sleep(100); await s.shot("janus_J8_ultimate_burst"); await slowOff(); await sleep(1800);
    rec("J8h 奥義が終われば門の見た目も全部消える", (await fxN()) === 0 && !(await ev(`${JU}.isActive()`)), String(await fxN()));
    // 比較: Hermes の奥義のカットインは従来どおり出る
    await ev(`${FC}.end(); ${RL}.setUltimate('hermes'); 'ok'`); await sleep(250);
    await begin(); await park(); await place(44, 12); await bigAll(); await fillGauge(); await sleep(100); await c.tap("Q", 80); await sleep(250);
    const cut2 = await json("ProjectRCutIn.getActive()");
    rec("J8i 比較: Hermes の奥義のカットインは従来どおり出る", cut2.length === 1 && cut2[0].godId === "hermes" && cut2[0].kind === "ultimate", JSON.stringify(cut2));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
  });

  const errs = s.errors();
  rec("J9 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/janus_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
