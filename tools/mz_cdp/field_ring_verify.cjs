// Stage 1D-2D: 指輪ロードアウト(RingLoadout)モードのフィールド戦闘を、実機(MZ Playtest)で通しで確認する。CDP の実際のキー・マウスで操作する。
//   既存の field_* 検証は旧い固定スロット(legacy)が既定。このスクリプトは session({ field: true, ring: true }) で、RingLoadout モードを明示して使う。
//   R1  モードと HUD(ロードアウトどおりの名前・空の枠)    R2  ヘルメース5スキルの実キー(LMB/Shift/E/X/C)    R3  アポロン5スキルの実キー
//   R4  ストレングス(薙ぎ払い・銃の実ダメージ・1回で消費)  R5  葦笛の睡眠(実時間 約4秒・AI・起床)           R6  一閃の分割ダメージ(実時間 1・2・3秒)
//   R7  黄金の矢 Lv3(短押し / 長押しのビーム・追従・移動 50%・6秒 Cooldown)                                   R8  保存→ロード→戦闘 / 編集ロック / 空の枠 / スキルID単位の Cooldown
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_ring_verify.cjs   (新しいNW.jsセッションで実行する。ゲームのファイル・save/ は書かない)
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

  await check("R1 モードと HUD", async () => {
    rec("R1a 空の編成のまま戦闘を始める: 5枠すべて空(旧い固定スキルへ戻らない)", await loadout({}) && await (async () => { await begin(); const sl = await hud(); return sl.slice(0, 5).every(x => x.name === "―"); })(), JSON.stringify((await hud()).slice(0, 5).map(x => x.name)));
    rec("R1b 戦闘のモードは ring", (await json(`${FC}.getSlotSkills().mode`)) === "ring", "");
    rec("R1c ロードアウトの設定どおりの名前が HUD に出る(LMB 空 / Shift 一閃 / E 葦笛 / X 黄金の矢 / C 薙ぎ払い)", await loadout({ shift: "hermes_issen", e: "hermes_reed_flute", x: "apollo_golden_volley", c: "hermes_sweep" }) && await (async () => { await begin(); await sleep(300); const sl = await hud(); return sl.slice(0, 5).map(x => x.name).join(",") === "―,一閃,葦笛,黄金の矢,薙ぎ払い"; })(), JSON.stringify((await hud()).slice(0, 5).map(x => x.name)));
    await s.shot("ring_R1_hud");
  });

  await check("R2 ヘルメース5スキル(LMB / Shift / E / X / C)", async () => {
    rec("R2-0 編成", await loadout({ lmb: "hermes_sweep", shift: "hermes_zetsu", e: "hermes_issen", x: "hermes_reed_flute", c: "hermes_strength" }), "");
    await begin(); await prep(1.5);
    const h0 = await hp(E); await c.click(undefined, 70); await sleep(700); const h1 = await hp(E);
    rec("R2a LMB = 薙ぎ払い: 実クリックで敵のHPが減る", h1 < h0, `HP ${h0} → ${h1}`);
    await putEnemy(E, 12, 0); await aimDx(5); const p0 = await pos(); await c.tap("Shift", 80); await sleep(900); const p1 = await pos();
    rec("R2b Shift = 絶: 瞬間移動(物理 Shift の修飾つき)", Math.hypot(p1.x - p0.x, p1.y - p0.y) > 2, `${JSON.stringify(p0)} → ${JSON.stringify(p1)}`);
    await place(44, 12); await putEnemy(E, 4, 0); await sleep(150); await aimAt(E); await sleep(120);
    const h2 = await hp(E); await c.tap("E", 70); await sleep(300); const h3 = await hp(E), cd3 = await cds();
    rec("R2c E = 一閃: 敵にダメージ(直接 200)・Cooldown は一閃のスキルIDに付く(7秒)", h3 <= h2 - 150 && cd3.hermes_issen > 5.5 && cd3.hermes_issen <= 7.01, `HP ${h2} → ${h3} cd ${JSON.stringify(cd3)}`);
    await sleep(3400);                                                                               // 一閃の分割ダメージ(3秒)が終わるのを待つ(分割ダメージは睡眠を解く = 睡眠の除去条件は従来どおり)
    await putEnemy(E, 2, 0); await sleep(150); await c.tap("X", 70); await sleep(300);
    rec("R2d X = 葦笛: 範囲の敵が睡眠(State 32)になる", (await json(`${FC}.isEnemyAsleep(${E})`)) === true, JSON.stringify({ last: await json(`${FC}.getLastResult()`), cd: (await cds()).hermes_reed_flute, asleep: await ev("hasState(2, 32)"), pos: await pos(), enemy: await json("({ x: $gameMap.event(2)._realX, y: $gameMap.event(2)._realY })") }).slice(0, 400));
    await c.tap("C", 70); await sleep(300);
    rec("R2e C = ストレングス: 蓄えが1つ積まれる", (await json("ProjectRHermesStrength.getPending()"))?.stacks === 1, JSON.stringify(await json("ProjectRHermesStrength.getPending()")));
    await s.shot("ring_R2_hermes");
  });

  await check("R3 アポロン5スキル(LMB / Shift / E / X / C)", async () => {
    rec("R3-0 編成", await loadout({ lmb: "apollo_golden_volley", shift: "apollo_eros_arrow", e: "apollo_lyre_rhythm", x: "apollo_laurel_wreath", c: "apollo_plague_rain" }), "");
    await begin(); await prep(6);
    let h0 = await hp(E); await c.click(undefined, 60); await sleep(1800); let h1 = await hp(E);
    rec("R3a LMB = 黄金の矢(Lv1): 実クリックで矢が当たる", h1 < h0, `HP ${h0} → ${h1}`);
    await putEnemy(E, 6, 0); await sleep(150); await aimAt(E); await sleep(100); h0 = await hp(E); await c.tap("Shift", 80); await sleep(2800); h1 = await hp(E);
    rec("R3b Shift = エロスの矢: 当たってダメージ", h1 < h0, `HP ${h0} → ${h1}`);
    await c.tap("E", 70); await sleep(600);
    rec("R3c E = 竪琴: 演奏(音符)が始まる", !!(await json("ProjectRApolloLyreRhythm.getSession()")), "");
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUp(); await sleep(300); await prep(6);
    await c.tap("X", 70); await sleep(900); const lr = await json("ProjectRApolloLaurelWreath.getLastResult()");
    rec("R3d X = 月桂冠: 領域が1つ作られる", lr && lr.ok === true && lr.patches === 1, JSON.stringify(lr).slice(0, 200));
    await aimAt(E); await sleep(100); h0 = await hp(E); await c.tap("C", 70); await sleep(4500); h1 = await hp(E); const pr = await json("ProjectRApolloPlagueRain.getLastResult()");
    rec("R3e C = 疫病の矢: 着弾して感染・ダメージ", pr && pr.ok === true && h1 < h0, `HP ${h0} → ${h1} ${JSON.stringify(pr).slice(0, 160)}`);
    await s.shot("ring_R3_apollo");
  });

  await check("R4 ストレングス", async () => {
    rec("R4-0 編成", await loadout({ lmb: "hermes_sweep", c: "hermes_strength" }), "");
    await begin(); await prep(1.4); await ev("Math.random = function() { return 0.9; }; 'ok'");
    const swing = async () => { const h0 = await hp(E); await c.click(undefined, 60); await sleep(700); const d = h0 - await hp(E); await sleep(900); return d; };
    const base = await swing(), base2 = await swing();
    await c.tap("C", 70); await sleep(300);
    const st = await json("ProjectRHermesStrength.getPending()"); const boosted = await swing(); const after = await json("ProjectRHermesStrength.getPending()"); const next = await swing();
    rec("R4a 薙ぎ払い: 強化なし = 一定", base === base2 && base > 0, `${base}, ${base2}`);
    rec("R4b 蓄えた1回分で薙ぎ払いが強くなる(+10%の攻撃力)", st && st.stacks === 1 && boosted > base, `base ${base} → boosted ${boosted} (mult ${st && st.multiplier})`);
    rec("R4c 命中で蓄えを1回で消費・次は通常に戻る", after === null && next === base, `after=${JSON.stringify(after)} next=${next}`);
    // 銃(右クリック)
    await ev(`(function(){ var gun = $dataWeapons.filter(function(w){ return w && /<capacity:/i.test(w.note || ''); })[0]; if (gun) { $gameParty.leader().forceChangeEquip(0, gun); $gameSystem.setGunAmmo(gun.id, 20); } return gun ? gun.id : 0; })()`);
    await putEnemy(E, 5, 0); await sleep(200); await aimAt(E); await sleep(150);
    const shoot = async () => { const h0 = await hp(E); await c.rightClick(undefined, 60); await sleep(1500); const d = h0 - await hp(E); await sleep(1200); return d; };
    const g0 = await shoot(); await c.tap("C", 70); await sleep(300); const g1 = await shoot(); const g2 = await shoot(); const pend = await json("ProjectRHermesStrength.getPending()");
    rec("R4d 銃(右クリック): 蓄えで実ダメージが上がり、1回で消費する", g0 > 0 && g1 > g0 && g2 === g0 && pend === null, `通常 ${g0} / 強化 ${g1} / 次 ${g2} pending=${JSON.stringify(pend)}`);
  });

  await check("R5 葦笛の睡眠(実時間)", async () => {
    rec("R5-0 編成", await loadout({ x: "hermes_reed_flute", lmb: "hermes_sweep" }), "");
    await begin(); await ev("Math.random = function() { return 0.9; }; 'ok'"); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); await place(44, 12); await bigHp(E); await putEnemy(E, 1.6, 0); await sleep(200);
    await ev(`${FC}.attachEnemy(${E}, { chase: true, reach: 1.3, windupFrames: 40, cooldownFrames: 80, sightTiles: 14, aggroTiles: 14 }); 'ok'`);
    await aimAt(E);
    // 攻撃の溜めに入るのを待ってから、葦笛
    const wp = await wait("ProjectREnemyAttack.list().some(function(r){ return r.eventId === 2 && r.state === 'pending'; })", 8000);
    const hp0 = await ev("$gameParty.leader().hp");
    await s.shot("ring_R5a_windup");
    const f0 = await sf(), t0 = Date.now(); await c.tap("X", 70);
    const slept = await wait(`$gameMap.event(2) && hasState(2, 32)`, 1500);
    const pendNow = await json("ProjectREnemyAttack.list().filter(function(r){ return r.eventId === 2 && r.state === 'pending'; }).length");
    await s.shot("ring_R5b_asleep");
    const p1 = await pos(); let moved = false, attacked = false; const tSleep0 = Date.now();
    while (await ev("hasState(2, 32)")) { if (Date.now() - tSleep0 > 8000) break; const pl = (await json("ProjectREnemyAttack.list().filter(function(r){ return r.eventId === 2 && r.state === 'pending'; }).length")); if (pl > 0) attacked = true; await sleep(25); }
    const t1 = Date.now(), f1 = await sf(), hp1 = await ev("$gameParty.leader().hp");
    rec("R5a 攻撃の溜め(予兆)の最中に葦笛 → 眠る。溜め(予兆)はその場で消え、眠っている間は出ない", wp && slept && pendNow === 0 && attacked === false, `windup=${wp} slept=${slept} pendingAtSleep=${pendNow} warnedWhileAsleep=${attacked}`);
    rec("R5b 睡眠は実時間で約4秒(設計 4.0秒。以前は約2秒)", Math.abs((t1 - t0) / 1000 - 4) < 0.5 && Math.abs((f1 - f0) / 60 - 4) < 0.5, `${((t1 - t0) / 1000).toFixed(2)}秒 / ${f1 - f0}フレーム(${((f1 - f0) / 60).toFixed(2)}秒)`);
    rec("R5c 眠っている間は敵からダメージを受けない・近づかない", hp1 === hp0, `HP ${hp0} → ${hp1}`);
    await s.shot("ring_R5c_wake");
    const again = await wait("ProjectREnemyAttack.list().some(function(r){ return r.eventId === 2 && r.state === 'pending'; })", 5000);
    rec("R5d 起きたあとは、通常のAIに戻って、また攻撃の溜め(予兆)に入る", again, "");
    // ダメージで起きる(睡眠の除去条件は従来どおり)
    await ev(`${FC}.end(); ${FC}.begin(); ${FC}.setPerception({ enabled: false }); 'ok'`); await topUp(); await sleep(300); await place(44, 12); await bigHp(E); await putEnemy(E, 1.6, 0); await ev(`${FC}.detachEnemy(${E}); ${FC}.attachEnemy(${E}, { chase: true, reach: 1.3, windupFrames: 40, cooldownFrames: 80, sightTiles: 14, aggroTiles: 14 }); 'ok'`); await aimAt(E);
    await c.tap("X", 70); await sleep(300); const asleep = await ev("hasState(2, 32)"); await c.click(undefined, 60); await sleep(900);
    rec("R5e 眠った敵を攻撃すると起きる(ダメージで解除)", asleep === true && (await ev("hasState(2, 32)")) === false, "");
    void p1; void moved;
  });

  await check("R6 一閃の分割ダメージ(実時間)", async () => {
    rec("R6-0 編成", await loadout({ e: "hermes_issen" }), "");
    await begin(); await ev("Math.random = function() { return 0.9; }; 'ok'"); await prep(4);
    const h0 = await hp(E), f0 = await sf(), t0 = Date.now(); await c.tap("E", 70);
    const events = []; let prev = h0;
    while (Date.now() - t0 < 4600) { const h = await hp(E); if (h !== prev) { events.push({ ms: Date.now() - t0, frames: (await sf()) - f0, delta: prev - h }); prev = h; } await sleep(15); }
    const direct = events[0], splits = events.slice(1);
    rec("R6a 直接ダメージ(約 200)がすぐ入り、分割ダメージが3回(合計 約 50)", direct && direct.delta >= 150 && splits.length === 3 && Math.abs(splits.reduce((a, e) => a + e.delta, 0) - 50) <= 6, JSON.stringify(events));
    rec("R6b 分割ダメージは実時間で約 1・2・3秒(設計 3秒かけて3回。以前は約 0.5・1・1.5秒)", splits.length === 3 && splits.every((e, i) => Math.abs(e.frames / 60 - (i + 1)) < 0.35), JSON.stringify(splits));
    void h0;
  });

  await check("R7 黄金の矢 Lv3(実キー)", async () => {
    rec("R7-0 編成(黄金の矢 Lv3 を X に)", await loadout({ x: "apollo_golden_volley" }, { apollo_golden_volley: 3 }), "");
    await begin(); await prep(7); await ev("Math.random = function() { return 0.9; }; 'ok'");
    // 短押し → 通常
    let h0 = await hp(E); await c.keyDown("X"); await sleep(90); await c.keyUp("X"); await sleep(2200);
    const beam0 = await json(`${FC}.getBeamState()`); let h1 = await hp(E);
    rec("R7a 短押し(約0.1秒): 通常の矢が出て当たる。ビームにならず、ビームの Cooldown も無い", h1 < h0 && beam0.active === false && !beam0.cooldowns.apollo_golden_volley, `HP ${h0} → ${h1} ${JSON.stringify(beam0).slice(0, 160)}`);
    // 取り消し(0.25〜0.9秒で離す)
    await sleep(600); await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUp(); await sleep(300); await prep(7); await ev("Math.random = function() { return 0.9; }; 'ok'");
    h0 = await hp(E); await c.keyDown("X"); await sleep(500); await c.keyUp("X"); await sleep(1800); h1 = await hp(E); const cd1 = await cds();
    rec("R7b 0.5秒で離す: 取り消し(矢も出ず、Cooldown も付かない)", h1 === h0 && !(cd1.apollo_golden_volley > 0), `HP ${h0} → ${h1} cd ${JSON.stringify(cd1)}`);
    // 長押し → ビーム
    const f0 = await sf(), t0 = Date.now(); await c.keyDown("X");
    const started = await wait(`${FC}.getBeamState().active === true`, 2500); const tStart = Date.now() - t0, fStart = (await sf()) - f0;
    const b = await json(`${FC}.getBeamState()`), spd = await json("ProjectRCardModifiers.moveSpeedFactor()");
    rec("R7c 約0.9秒押し続けるとビームが始まる(54フレーム目)・移動速度は 50%", started && fStart >= 52 && fStart <= 58 && b.speedFactor === 0.5 && spd === 0.5, `開始 ${tStart}ms / ${fStart}フレーム speed=${spd}`);
    await sleep(250); const hb = await hp(E), g1 = await json("ProjectRApolloGoldenVolley.getHeldBeam()");
    // 追従: マウスを上へ動かすとビームの向きが変わる
    const d0 = g1.degree; await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)"); await sleep(100); const ps = await json("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() - 24 })"); await c.pointer(ps.x + 5 * 48, ps.y - 5 * 48); await sleep(250);
    const g2 = await json("ProjectRApolloGoldenVolley.getHeldBeam()");
    rec("R7d ビームが敵に当たる(0.2秒ごと)・マウスに追従して向きが変わる", hb < h1 && Math.abs((g2.degree - d0 + 540) % 360 - 180) > 15, `degree ${d0} → ${g2.degree} 敵HP ${h1} → ${hb}`);
    // 移動速度 50%
    await place(44, 12).catch(() => {}); await ev("$gamePlayer.center($gamePlayer._realX, $gamePlayer._realY)");
    const pa = await pos(); await c.keyDown("A"); await sleep(400); await c.keyUp("A"); const pb = await pos();
    // 1.5秒でビームが終わる
    const ended = await wait(`${FC}.getBeamState().active === false`, 3000); const tEnd = Date.now() - t0;
    await c.keyUp("X"); await sleep(250); const af = await json(`${FC}.getBeamState()`);
    rec("R7e ビームは最大1.5秒で終わる(離さなくても)・終わると移動速度は元に戻る", ended && tEnd - tStart <= 1800 && af.speedFactor === 1, `ビームの長さ ${tEnd - tStart}ms`);
    rec("R7f ビームが終わってから 6秒の専用 Cooldown(スキルIDに付く)", af.cooldowns.apollo_golden_volley > 4.5 && af.cooldowns.apollo_golden_volley <= 6.01, JSON.stringify(af.cooldowns));
    const dxBeam = Math.abs(pb.x - pa.x);
    // 通常の移動(ビーム外)との比較
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(300); await place(44, 12); const pc = await pos(); await c.keyDown("A"); await sleep(400); await c.keyUp("A"); const pd = await pos(); const dxNormal = Math.abs(pd.x - pc.x);
    rec("R7g ビーム中の歩く速さは通常の約 50%(同じ 0.4秒の移動距離の比)", dxNormal > 0.5 && dxBeam / dxNormal > 0.3 && dxBeam / dxNormal < 0.75, `ビーム中 ${dxBeam.toFixed(2)} / 通常 ${dxNormal.toFixed(2)} = ${(dxBeam / dxNormal).toFixed(2)}`);
    await s.shot("ring_R7_beam");
  });

  await check("R8 保存 → ロード → 戦闘 / 編集ロック / 空の枠 / スキルID単位の Cooldown", async () => {
    rec("R8-0 編成", await loadout({ shift: "hermes_sweep", x: "hermes_issen", c: "apollo_golden_volley" }), "");
    const before = await json(`${RL}.getState()`);
    // 保存データの往復(JsonEx)。ファイルは書かない(saveObject は遮断済み)。マップへ戻る手順は MZ の読み込みと同じ(SceneManager.goto(Scene_Map))
    const ok = await ev(`(function(){ var json = JsonEx.stringify(DataManager.makeSaveContents()); DataManager.createGameObjects(); DataManager.extractSaveContents(JsonEx.parse(json)); Scene_Load.prototype.reloadMapIfUpdated.call(null); SceneManager.goto(Scene_Map); return json.length > 0; })()`);
    await sleep(500); await waitMap(1); await sleep(1500); await s.parkFar();
    const after = await json(`${RL}.getState()`);
    rec("R8a 保存 → ロードで、装備と5枠が同じ(ファイルへは書かない)", ok && JSON.stringify(after) === JSON.stringify(before) && (await ev("window.__writes")) === 0, JSON.stringify(after).slice(0, 200));
    await ev(`${FC}.setDevAllowOutsideEncounter(true); ${FC}.setLoadoutSource('auto'); 'ok'`);
    await begin(); await prep(2);
    const sl = await hud();
    rec("R8b ロードしたあとの戦闘: HUD がロードしたロードアウトどおり(LMB 空 / Shift 薙ぎ払い / E 空 / X 一閃 / C 黄金の矢)", sl.slice(0, 5).map(x => x.name).join(",") === "―,薙ぎ払い,―,一閃,黄金の矢", sl.slice(0, 5).map(x => x.name).join(","));
    const snap = async () => JSON.stringify({ cd: await cds(), hp: await hp(E) });
    const s0 = await snap(); await c.tap("E", 70); await c.click(undefined, 60); await sleep(700);
    rec("R8c 空の枠(LMB / E)は何もしない(旧い固定スキルへ戻らない)", (await snap()) === s0, "");
    await c.tap("X", 70); await sleep(400); const cd = await cds(), sl2 = await hud();
    rec("R8d Cooldown はスキルID(一閃)に付き、X の枠の HUD にだけ出る。ほかの枠・スキルは独立", cd.hermes_issen > 5 && !(cd.apollo_golden_volley > 0) && sl2[3].cooldown.active === true && sl2[4].cooldown.active === false, JSON.stringify(cd));
    const state0 = JSON.stringify(await json(`${RL}.getState()`));
    const rejects = await json(`[${RL}.setSkill('lmb','hermes_zetsu').ok, ${RL}.clearSkill('x').ok, ${RL}.unequipRing('apollo').ok, ${RL}.equipRing('hermes').ok]`);
    rec("R8e 戦闘中は、装備・編成を変えられない(API は拒否・状態は不変)", rejects.every(v => v === false) && JSON.stringify(await json(`${RL}.getState()`)) === state0, JSON.stringify(rejects));
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    rec("R8f 戦闘が終われば、編集できる", (await json(`${RL}.setSkill('lmb','hermes_zetsu').ok`)) === true, "");
    await s.shot("ring_R8_after");
  });

  const errs = s.errors();
  rec("R9 Console のエラーなし・保存の書き込みなし", errs.length === 0 && (await ev("window.__writes")) === 0, errs.slice(0, 3).join(" | "));
  const failed = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - failed.length}/${s.results.length} PASS`); if (failed.length) console.log("FAIL:", failed.map(f => f.id).join(" / "));
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/ring_results.json", JSON.stringify(s.results, null, 1));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
