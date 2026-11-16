// リアルタイム・フィールド戦闘(ProjectR_FieldCombat)の実機(Playtest)確認。CDP の実際のキー(WASD/Q 奥義/Shift 絶/E 一閃/R リロード/C アイテム/F)とマウス(移動・左クリック・右クリック)だけで操作する。
//   S1 SOUL戦闘の開始が止まる(通常のプレイ)/ 解除すれば元どおり開始できる / F7 のテスト入口も止まる
//   E1 戦闘の開始・終了(DEVの手動 begin / end): 戦闘イベント・固定戦闘・HUD(固定アビリティ5枠)/ 終わると片づく。探索マップで勝手に始まらない(エンカウンターは field_encounter_verify)
//   M1 WASD移動  A1 マウスの照準(向き)  B1 右クリックの銃(照準した敵だけ当たる・外れる)
//   Q1 特殊(一閃。E): 当たる・外れる・Cooldown  Z1 移動(絶): 瞬間移動・Cooldown・壁の手前で止まる  R1 アイテム(C 短押し)  U1 奥義(Q)  C1 キャンセル(API)
//   T1 敵の予兆と回避: 予兆(赤い範囲)が出て、範囲から出れば当たらず、出なければ当たる
//   F1 戦闘中のイベント(F): 戦闘中でも調べられる / マップ移動で戦闘が片づく
//   I1 戦闘中でないときのキーは元のまま(アビリティが発動しない)  X1 繰り返し  X2 Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_combat_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const ph = () => ev("$gameParty.leader().hp");
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const toScreen = (tx, ty) => `(function() { return { x: Math.round(($gameMap.adjustX(${tx})) * 48), y: Math.round(($gameMap.adjustY(${ty})) * 48) }; })()`;
  const enemyScreen = id => json(`(function() { var e = $gameMap.event(${id}); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()`);
  const playerScreen = () => json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })");
  const aimAt = async id => { const p = await enemyScreen(id); await c.pointer(p.x, p.y); return p; };
  const hold = async (k, ms) => { await c.keyDown(k); await sleep(ms); await c.keyUp(k); await sleep(80); };
  const last = () => json(`${FC}.getLastResult()`);
  const cds = () => json(`${FC}.getCooldowns()`);
  const topUpPlayer = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const waitCd = async (slot, ms = 12000) => wait(`${FC}.getCooldowns().${slot} <= 0`, ms);
  const GUN = 2;                // Map001の公式銃テスト敵(52,18。<enemy> つき = 武器・奥義が当たる既存の敵)。ゴブリン(1)は<enemy>が無く武器が当たらない旧テスト敵なので、使わない
  const bigHp = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '+5000', exceedMaxHealth: 'true' }); 'ok'`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); return 'ok'; })()`);
  await sleep(300);
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);   // このスクリプトは、アビリティ・HUD・予兆などの部品の確認。探索マップでの許可(DEV)。エンカウンターの入口は field_encounter_verify.cjs

  await check("S1 SOUL戦闘の開始が止まる", async () => {
    const mode = await json(`${FC}.getSoulMode()`);
    const r = await json("ProjectRSoulEncounter.start({ bossId: 'dev_majuu' })");
    const st = await json("ProjectRSoulEncounter.getState()");
    const mapBefore = await ev("$gameMap.mapId()");
    await c.tap("F7"); await sleep(800);
    const mapAfter = await ev("$gameMap.mapId()");
    const transferring = await ev("$gamePlayer.isTransferring()");
    rec("S1a 通常のプレイでは soulDisabled(状態・マップは変わらない)", mode === "off" && r && r.ok === false && r.reason === "soulDisabled" && st.state === "idle", JSON.stringify({ mode, r, state: st.state }));
    rec("S1b F7 のテスト入口も止まる(マップ移動なし)", mapBefore === mapAfter && !transferring, `map ${mapBefore} → ${mapAfter}`);
    await ev(`${FC}.setSoulMode('on'); 'ok'`);
    const r2 = await json("ProjectRSoulEncounter.start({ bossId: 'unknown_boss_x' })");
    rec("S1c 解除すると元の判定へ(未知のボスは unknownBoss。soulDisabled ではない)", r2 && r2.reason === "unknownBoss", JSON.stringify(r2));
    await ev(`${FC}.setSoulMode('off'); 'ok'`);
  });

  await check("E1 戦闘の開始・終了", async () => {
    await place(46, 15);
    await sleep(2500);
    const idle = await json(`${FC}.getState().active`);
    rec("E1a 探索マップで敵(12 tile 以内)が近くにいても、戦闘は勝手に始まらない", idle === false, JSON.stringify({ idle }));
    await ev(`${FC}.setDevAllowOutsideEncounter(false); 'ok'`);
    const refused = await json(`${FC}.begin()`);
    await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
    rec("E1b エンカウンターの外では begin() も断る(DEVの許可を切ったとき)", refused.ok === false && refused.reason === "encounterRequired", JSON.stringify(refused));
    const began = await json(`${FC}.begin()`);
    const started = await wait(`${FC}.isActive() && ProjectRCombatPresence.isCombatEventActive() && ProjectRCardDeck.isCardBattleActive()`, 4000);
    const slots = await json("ProjectRBattleHUD.getViewModel().slots");
    const names = slots ? slots.map(x => (x.key || "") + ":" + (x.name || "")).join(" ") : "";
    rec("E1c begin で戦闘イベント・固定戦闘(手札/山札なし)になる", began.ok === true && started && (await json("ProjectRCardDeck.getBattleState().drawPile.length")) === 0, JSON.stringify({ began, started }));
    rec("E1d HUDに、メイン5枠(LMB 薙ぎ払い / Shift 絶 / E 一閃 / 1・2 固定カード)+ 別枠の C アイテムが出る", !!slots && slots.length === 6 && /LMB:薙ぎ払い/.test(names) && /Shift:絶/.test(names) && /E:一閃/.test(names) && /X:/.test(names) && /C:/.test(names) && /V:/.test(names), names);
    const cards = await json("ProjectRBattleHUD.getViewModel().counts");
    rec("E1e カードのドロー表示(DRAW/DISCARD)は出ない", cards === null || cards === undefined, JSON.stringify(cards));
    await s.shot("fc_E1_engaged");
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    const ended = !(await ev(`${FC}.isActive() || ProjectRCombatPresence.isCombatEventActive() || ProjectRCardDeck.isCardBattleActive()`));
    rec("E1f end で、HUD・戦闘イベント・固定戦闘が片づく", ended, JSON.stringify(await json(`${FC}.getState()`)));
  });

  await check("M1 WASD移動", async () => {
    await place(46, 15); await ev(`${FC}.begin(); 'ok'`); await sleep(300);
    const a = await pos(); await hold("D", 500); const b = await pos(); await hold("A", 500); const c2 = await pos();
    await hold("S", 500); const d = await pos(); await hold("W", 500); const e = await pos();
    rec("M1a D=右 / A=左", b.x > a.x + 0.5 && c2.x < b.x - 0.5, `x ${a.x.toFixed(2)} → ${b.x.toFixed(2)} → ${c2.x.toFixed(2)}`);
    rec("M1b S=下 / W=上", d.y > c2.y + 0.5 && e.y < d.y - 0.5, `y ${c2.y.toFixed(2)} → ${d.y.toFixed(2)} → ${e.y.toFixed(2)}`);
    const keyCount = (await json(`${FC}.getState().diagnostics.keyDowns`));
    rec("M1c 移動キーはアビリティ入力に奪われない", keyCount === 0, "keyDowns " + keyCount);
  });

  await check("A1 マウスの照準(向き)", async () => {
    await place(46, 15); await sleep(200);
    const p = await playerScreen(); const dirs = [];
    for (const [n, dx, dy, want] of [["右", 300, 0, 6], ["左", -300, 0, 4], ["上", 0, -300, 8], ["下", 0, 300, 2]]) { await c.pointer(p.x + dx, p.y + dy); await sleep(250); dirs.push([n, want, (await pos()).d]); }
    rec("A1 マウスの方向を向く(戦闘中)", dirs.every(([, want, got]) => want === got), JSON.stringify(dirs));
  });

  await check("B1 右クリックの銃(左クリックは近接。3段コンボは field_controls_verify.cjs)", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer();
    await place(48, 18); await sleep(300);
    const h0 = await hp(GUN);
    const ammo0 = await ev("$gameSystem.gunAmmo ? $gameSystem.gunAmmo(0) : null");
    await aimAt(GUN); await c.rightClick(undefined, undefined, 40); await sleep(900);
    const h1 = await hp(GUN);
    rec("B1a 右クリックの銃: 照準した敵に当たってHPが減る", h1 < h0, `HP ${h0} → ${h1}`);
    await c.pointer((await playerScreen()).x - 300, (await playerScreen()).y); await sleep(250);
    await c.rightClick(undefined, undefined, 40); await sleep(900);
    const h2 = await hp(GUN);
    rec("B1b 反対側へ撃つと当たらない(自動照準なし)", h2 === h1, `HP ${h1} → ${h2}`);
    const ammo1 = await ev("$gameSystem.gunAmmo ? $gameSystem.gunAmmo(0) : null");
    rec("B1c 弾薬が減る", ammo0 === null || ammo1 === ammo0 - 2, "ammo " + ammo0 + " → " + ammo1);
  });

  await check("Q1 特殊アビリティ(一閃)", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer();
    await bigHp(GUN); await place(48, 18); await sleep(300);
    const h0 = await hp(GUN);
    await aimAt(GUN); await sleep(150); await c.tap("E"); await sleep(700);
    const r = await last(), h1 = await hp(GUN), cd = await cds();
    rec("Q1a Eで一閃が発動し、照準した敵にダメージ", r && r.ok === true && r.slot === "special" && h1 < h0, `${JSON.stringify(r)} HP ${h0} → ${h1}`);
    rec("Q1b Cooldown 7秒が始まる(HUDにも出る)", cd.special > 6 && cd.special <= 7, JSON.stringify(cd));
    await c.tap("E"); await sleep(200);
    const r2 = await last();
    rec("Q1c Cooldown中は発動しない(cooldown)", r2 && r2.ok === false && r2.reason === "cooldown", JSON.stringify(r2));
    await s.shot("fc_Q1_issen");
    const w = await waitCd("special", 9000);
    await topUpPlayer(); const p = await playerScreen(); await c.pointer(p.x - 300, p.y); await sleep(250);
    const hb = await hp(GUN); await c.tap("E"); await sleep(700); const ha = await hp(GUN);
    rec("Q1d 反対側へ撃つと当たらない(自動照準なし)", w && ha === hb, `HP ${hb} → ${ha}`);
  });

  await check("Z1 移動アビリティ(絶)", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer();
    await place(44, 12); await sleep(300);
    const a = await pos(), p = await playerScreen();
    await c.pointer(p.x + 4 * 48, p.y); await sleep(200);
    await c.tap("Shift"); await sleep(700);
    const b = await pos(), cd = await cds(), r = await last();
    rec("Z1a Shiftでマウスの方向へ瞬間移動(約3tile)", r && r.ok === true && b.x - a.x > 1.5, `x ${a.x.toFixed(2)} → ${b.x.toFixed(2)} ${JSON.stringify(r)}`);
    rec("Z1b Cooldown 3秒", cd.mobility > 2 && cd.mobility <= 3, JSON.stringify(cd));
    await c.tap("Shift"); await sleep(200);
    const r2 = await last(); rec("Z1c Cooldown中は発動しない", r2 && r2.ok === false && r2.reason === "cooldown", JSON.stringify(r2));
    await waitCd("mobility", 6000);
    // 壁の手前で止まる: マップの西端へ向けて
    await place(2, 12); const p2 = await playerScreen(); await c.pointer(Math.max(5, p2.x - 400), p2.y); await sleep(200);
    await c.tap("Shift"); await sleep(700);
    const e = await pos(); rec("Z1d マップの端を越えない", e.x >= 0 && e.x < 2.01, `x ${e.x.toFixed(2)}`);
    await s.shot("fc_Z1_zetsu");
  });

  await check("R1 消耗品", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(200);
    await topUpPlayer(); const n0 = await ev("$gameParty.numItems($dataItems[7])");
    await c.tap("V"); await sleep(300);
    const r0 = await last(); rec("R1a HPが満タンなら使わない(消費しない)", r0 && r0.ok === false && r0.reason === "noEffect" && (await ev("$gameParty.numItems($dataItems[7])")) === n0, JSON.stringify(r0));
    await ev("$gameParty.leader().setHp(100); 'ok'");
    await c.tap("V"); await sleep(300);
    const r1 = await last(), h = await ph(), n1 = await ev("$gameParty.numItems($dataItems[7])");
    rec("R1b Cの短押しでポーションを使いHPが回復・個数が1減る", r1 && r1.ok === true && h > 100 && n1 === n0 - 1, `HP 100 → ${h}, 個数 ${n0} → ${n1}`);
    const cd = await cds(); rec("R1c Cooldown 8秒", cd.consumable > 7 && cd.consumable <= 8, JSON.stringify(cd));
    await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("V"); await sleep(250);
    const r2 = await last(); rec("R1d Cooldown中は使えない", r2 && r2.ok === false && r2.reason === "cooldown", JSON.stringify(r2));
  });

  await check("U1 奥義", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer(); await bigHp(GUN); await place(51, 18); await sleep(300);
    await c.tap("Q"); await sleep(250);
    const r0 = await last(); rec("U1a ゲージが満タンでなければ発動しない(gaugeNotFull)", r0 && r0.ok === false && r0.reason === "gaugeNotFull", JSON.stringify(r0));
    await ev("ProjectRUltimateGauge.addUltimateGauge(100, 'fieldTest', 'fc_fill_1'); 'ok'");
    const full = await ev("ProjectRUltimateGauge.isUltimateGaugeFull()");
    const h0 = await hp(GUN); await aimAt(GUN); await sleep(150);
    await c.tap("Q"); await sleep(1200);
    const r1 = await last(); const g = await ev("ProjectRUltimateGauge.getUltimateGauge()");
    rec("U1b 満タンならQで奥義が発動し、ゲージが0になる", full && r1 && r1.ok === true && g === 0, JSON.stringify(r1) + " gauge " + g);
    await wait("!ProjectRHermesUltimate || true", 100); await sleep(3500);
    const h1 = await hp(GUN); rec("U1c 奥義が敵にダメージ(6連斬)", h1 < h0, `HP ${h0} → ${h1}`);
  });

  await check("C1 キャンセル(API。キーは無い)", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(200);
    const r = await json(`${FC}.useAbility('cancel', 'test')`); rec("C1 useAbility('cancel') で保留中の入力・放射メニューを取り消せる(C は Stage 5 でアイテムのキー)", r && r.ok === true && r.slot === "cancel", JSON.stringify(r));
  });

  await check("T1 敵の予兆と回避", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(200);
    await bigHp(GUN); await ev(`${FC}.detachEnemy(${GUN}); 'ok'`);
    await ev(`${FC}.setPerception({ fovDegrees: 360 }); 'ok'`);                    // 敵の向きに関係なく見つける(この節は予兆と回避の確認。視界は field_perception_verify.cjs)
    const at = await json(`${FC}.attachEnemy(${GUN}, { windupFrames: 70, cooldownFrames: 200 })`);
    rec("T1a 敵に予約攻撃の行動をつけられる(元の並列攻撃は止める)", at && at.ok === true, JSON.stringify(at));
    // 動かない位置で: 予兆が出る → その場から出ない → 当たる
    await topUpPlayer(); await place(51, 18); await sleep(200);
    await c.pointer(1500, 400);
    const seen = await wait("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length > 0", 8000);
    await sleep(250);
    const rec1 = await json("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'})[0]");
    const geom = await ev(`(function(){ var t = SceneManager._scene.children.filter(function(c){return c.children && c.children.some(function(g){return g.geometry && g.geometry.graphicsData && g.geometry.graphicsData.length>0;});}); return t.length; })()`);
    rec("T1b 溜めの間、予兆(攻撃の範囲)の記録が出て、画面に赤く描かれる", seen && !!rec1 && geom > 0, JSON.stringify({ seen, area: rec1 && rec1.area, framesLeft: rec1 && rec1.framesLeft, drawn: geom }));
    await s.shot("fc_T1_telegraph");
    const h0 = await ev("$gameParty.leader().mhp");          // 予兆を確かめている間に攻撃が当たっていることがあるので、基準は満タンのHP(直前に満タンにしている)
    await wait("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length === 0", 4000); await sleep(500);
    const h1 = await ph();
    rec("T1c 範囲から出なければ当たる(HPが減る)", h1 < h0, `HP ${h0} → ${h1}`);
    // 回避: 予兆が出たら、Shift で範囲から出る → 当たらない
    await topUpPlayer(); await waitCd("mobility", 6000);
    await wait(`${FC}.getState().enemies[0] && ${FC}.getState().enemies[0].cooldown === 0`, 8000);
    await place(51, 18); await sleep(150);
    const seen2 = await wait("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length > 0", 8000);
    const pp = await playerScreen(); await c.pointer(pp.x - 3 * 48, pp.y); await sleep(100);
    await c.tap("Shift"); await sleep(500);
    const where = await pos();
    const h2 = await ph();
    await wait("ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length === 0", 4000); await sleep(500);
    const h3 = await ph();
    rec("T1d 予兆の間に Shift で範囲から出れば当たらない(回避)", seen2 && where.x < 50.2 && h3 === h2, `x ${where.x.toFixed(2)} HP ${h2} → ${h3}`);
    await json(`${FC}.detachEnemy(${GUN})`);
  });

  await check("F1 戦闘中のイベント", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(200);
    // 決定ボタン(F)のイベント: EV006(30,17)は「所持金 +100000」。戦闘中でも、隣で F を押せば動く
    await place(30, 18); await ev("$gamePlayer.setDirection(8); 'ok'"); await sleep(300);
    const active = await ev(`${FC}.isActive()`), g0 = await ev("$gameParty.gold()");
    await c.tap("F"); await sleep(700);
    const g1 = await ev("$gameParty.gold()");
    rec("F1a 戦闘中でも F で隣のイベントを調べられる(イベントが動く)", active && g1 === g0 + 100000, JSON.stringify({ active, gold: g0 + " → " + g1 }));
    // 接触のイベント: 移動(MAP003)(31,19)へ W で歩いて入る → マップ移動で戦闘が片づく
    await place(31, 20); await sleep(300); await ev(`${FC}.isActive() || ${FC}.begin(); 'ok'`);
    await hold("W", 900);
    const moved = await wait("$gameMap.mapId() === 3 && !$gamePlayer.isTransferring()", 12000); await sleep(800);
    rec("F1b マップ移動で戦闘が片づく(固定戦闘・戦闘イベントなし)", moved && !(await ev(`${FC}.isActive()`)) && !(await ev("ProjectRCardDeck.isCardBattleActive()")) && !(await ev("ProjectRCombatPresence.isCombatEventActive()")), JSON.stringify(await json(`${FC}.getState()`)));
    await ev("$gamePlayer.reserveTransfer(1, 46, 15, 6, 0); 'ok'"); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 12000); await sleep(1000);
  });

  await check("K1 敵を倒す", async () => {
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await place(49, 16); await sleep(300);
    const on = await wait(`${FC}.isActive()`, 4000);
    const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
    await kill(1); await kill(2); await sleep(4000);
    const hps = [await hp(1), await hp(2)];
    const still = await ev(`${FC}.isActive()`);
    rec("K1 すべての敵を倒しても、DEVの手動の戦闘は自動では終わらない(終わらせるのはエンカウンターだけ)", on && hps.every(h => h <= 0) && still === true, JSON.stringify({ on, hps, still }));
    await ev(`${FC}.end(); 'ok'`);
  });

  await check("I1 戦闘中でないときのキーは元のまま", async () => {
    await ev(`${FC}.end(); 'ok'`); await place(20, 30); await sleep(300);
    const k0 = await json(`${FC}.getState().diagnostics.keyDowns`);
    for (const k of ["Q", "E", "R", "C", "V", "Shift"]) await c.tap(k);
    await sleep(300);
    const st = await json(`${FC}.getState()`);
    rec("I1 戦闘外では Q/E/R/C/Shift をアビリティとして奪わない・発動しない", st.active === false && st.diagnostics.keyDowns === k0 && (await last()) === null, JSON.stringify(st.diagnostics));
  });

  await check("X1 繰り返し", async () => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      await place(46, 15); await ev(`${FC}.begin(); 'ok'`); await sleep(200);
      await c.tap("E"); await sleep(150); const cdUp = (await cds()).special;
      await ev(`${FC}.end(); 'ok'`); await sleep(100);
      out.push({ cdUp: Math.round(cdUp), clean: !(await ev("ProjectRCardDeck.isCardBattleActive()")) && !(await ev("ProjectRCombatPresence.isCombatEventActive()")) });
    }
    rec("X1 3回繰り返しても、毎回Cooldownが新しく始まり、終わると片づく", out.every(o => o.cdUp >= 6 && o.clean), JSON.stringify(out));
  });

  await check("X2 エラーなし・保存なし", async () => {
    const errs = s.errors(); const writes = await ev("window.__writes");
    rec("X2 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_combat_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
