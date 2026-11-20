// フィールド戦闘 Stage 7D-A(ボスHUD)の実機(Playtest)検証。DEV_FieldBoss(Map011)の中ボスと、実際の銃・キーで確かめる。自動のやり直しはしない。
//   H1 表示: ボス戦に入ると HUD(Sprite_ProjectRFieldBossHUD。BattleHUD の層の中)が出る・名前・HP 500/500・PHASE 1/2・遷移の目盛り(50%)・既存の戦闘HUD(スキル枠など)もそのまま
//   H2 実際のHP: 実際の銃のヒットで HP が減る → HUD の HP は、ゲームに適用された実際の HP と(数フレーム以内に)一致・残像は遅れて追いつく・回復で上がる
//   H3 フェーズ: HP が 250 以下 → 遷移の間は PHASE 2/2…(金色)→ 終わると PHASE 2/2・回復してもフェーズは戻らない
//   H4 指定のない戦闘では出ない: Map008 / Map009 / Map010 の戦闘・探索マップ(Map001)
//   H5 後片付け: 倒すと 0 のまま少し残ってから消える(勝利で戻る)・撤退(中断)で消える・マップ移動で消える・入り直しは満タン・PHASE 1/2 から
//   H6 重なり: ボスHUD の範囲が、プレイヤーのHUD・スキル枠・ほかの戦闘HUD と重ならない・画面の上部に収まる・自然な戦闘中の予兆(扇形・直線)と重ならない
//   Z  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_boss_hud_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", SE = "ProjectRFieldStrongEnemy", HUD = "ProjectRFieldBossHud";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 900)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const hp = () => ev("$gameParty.leader().hp");
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const put = async (x, y) => { await ev(`$gamePlayer.locate(${Math.floor(x)}, ${Math.floor(y)}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(250); };
  const putEnemy = (x, y, dir) => ev(`(function(){ var e = $gameMap.event(1); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; e.setDirection(${dir || 2}); return 'ok'; })()`);
  const setEnemyHp = n => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(1); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '1', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const ehp = () => ev("$gameMap.getCurrentEventHp(1)");
  // HUD の Sprite(BattleHUD の Manager の子)の、いまの状態
  const hudSprite = "(function(){ var m = SceneManager._scene._projectRBattleHudLayer; return m ? m.children.find(function(x) { return x instanceof Sprite_ProjectRFieldBossHUD; }) : null; })()";
  const view = () => json(`(function(){ var h = ${hudSprite}; if (!h) return null; return { visible: h.visible && SceneManager._scene._projectRBattleHudLayer.visible, view: h.view, name: h._name._signature, phase: h._phase._signature, hpText: h._hpText._signature, ghost: h._ghost }; })()`);
  const installRec = () => ev(`(function(){ var h = ${hudSprite}; if (!h) return 'nohud'; window.__hudRec = []; if (!h.__recInstalled) { h.__recInstalled = true; var o = h.update; h.update = function() { var r = o.apply(this, arguments); if (window.__hudRec && this.view) window.__hudRec.push({ hp: this.view.hp, ratio: this.view.ratio, ghost: this._ghost, dead: this.view.dead, actual: $gameMap.getCurrentEventHp(1), vis: this.visible }); return r; }; } return 'ok'; })()`);
  const gunAt = async () => { const e = await ev("({ x: $gameMap.event(1).screenX(), y: $gameMap.event(1).screenY() })"); await c.pointer(e.x, e.y - 24); await sleep(80); await c.rightClick(undefined, 50); await sleep(260); };
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  const enter = async mapId => {
    await ev(`${FC}.end(); 'ok'`); await sleep(300);
    if ((await ev("$gameMap.mapId()")) !== 1 || (await ev(`${FC}.getEncounterState().state`)) !== "idle") { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1000); }
    await ev(`${FC}.startEncounter({ encounterId: 'hud', battleMapId: ${mapId}, spawnX: 10, spawnY: 12, direction: 8, resultVariableId: 9 }); 'ok'`);
    await waitMap(mapId); await wait(`${FC}.isActive()`, 15000); await sleep(1200); await topUp(); await ev("$gameSystem.setGunAmmo(51, 7); $gameParty.gainItem($dataItems[31], 60); 'ok'");
  };
  const fixEnemy = async (x, y, dir) => { await put(19, 13); await ev(`${FC}.detachEnemy(1); 'ok'`); await ev(`${FC}.attachEnemy(1, ${JSON.stringify({ strong: "dev_miniboss", reach: 2, sightTiles: 12, cooldownFrames: 80, chase: false })}); 'ok'`); await putEnemy(x, y, dir); await sleep(200); await ev(`${FC}.setPerception({ enabled: false }); 'ok'`); };

  await check("H1", async () => {
    await enter(11); await sleep(400);
    const v = await view(), st = await json(`${HUD}.getHudState()`), bhud = await json("ProjectRBattleHUD.getViewModel()");
    rec("H1 ボス戦に入ると HUD が出る: 名前・HP 500 / 500・PHASE 1/2・遷移の目盛り(50%)", !!v && v.visible && /DEV 中ボス\(2段階\)/.test(v.name) && /HP 500 \/ 500/.test(v.hpText) && /PHASE 1\/2/.test(v.phase) && v.view.marks.length === 1 && v.view.marks[0] === 0.5 && v.view.ratio === 1, { visible: v && v.visible, name: v && v.name, hpText: v && v.hpText, phase: v && v.phase, marks: v && v.view && v.view.marks });
    rec("H1b 既存の戦闘HUD(スキル枠など)はそのまま出ている・ボスHUDの状態は読み出しだけ", bhud.visible === true && bhud.slots.length >= 5 && st.hp === 500 && st.maxHp === 500, { visible: bhud.visible, slots: bhud.slots.length, st });
  });

  await check("H2", async () => {
    await fixEnemy(10, 4, 2); await put(10, 8); await topUp(); await sleep(400); await installRec();
    const before = await ehp(); await gunAt(); await sleep(900);
    const rec2 = await json("window.__hudRec"), iDrop = rec2.findIndex(r => r.hp < before), actualNow = await ehp();
    const after = rec2.slice(iDrop), ahead = rec2.filter(r => r.hp < r.actual).length, mism = after.filter(r => r.hp !== r.actual).length;
    rec("H2 実際の銃のヒット: HUD の HP が、ゲームに適用された実際の HP と一致(先取りしない・遅れたままにならない)", before === 500 && iDrop >= 0 && actualNow < 500 && after[after.length - 1].hp === actualNow && ahead === 0 && mism <= 1, { before, actualNow, iDrop, frames: rec2.length, ahead, mismatches: mism });
    const lag = after.filter(r => r.ghost > r.ratio + 0.01).length, firstGhost = after[0];
    await sleep(2500); const v2 = await view();
    rec("H2b バーの残像: 減った直後は遅れて見え(残像 > バー が数十フレーム)、そのあと追いつく", lag >= 10 && firstGhost.ghost > firstGhost.ratio && Math.abs(v2.ghost - v2.view.ratio) < 0.005, { lagFrames: lag, first: firstGhost && { ghost: +firstGhost.ghost.toFixed(3), ratio: +firstGhost.ratio.toFixed(3) }, final: { ghost: +v2.ghost.toFixed(3), ratio: +v2.view.ratio.toFixed(3) } });
    // 回復: HP が上がる(残像はすぐ追いつく)・過回復はバー 100% まで
    await setEnemyHp(400); await sleep(250); const h1 = await view(); await setEnemyHp(480); await sleep(250); const h2 = await view();
    rec("H2c 回復: HUD の HP が実際の値に上がる(400 → 480)・残像はすぐ追いつく", h1.view.hp === 400 && h2.view.hp === 480 && h2.view.ratio === 0.96 && Math.abs(h2.ghost - h2.view.ratio) < 1e-9, { h1: h1.view.hp, h2: h2.view.hp, ratio: h2.view.ratio, ghost: h2.ghost });
  });

  await check("H3", async () => {
    await enter(11); await fixEnemy(10, 6, 2); await put(10, 11); await topUp(); await setEnemyHp(300); await sleep(300);
    const a = await view(); await setEnemyHp(240); await wait(`${SE}.getPhase(1).transition === true`, 4000); await sleep(150);
    const t = await view(); await wait(`!${SE}.getPhase(1).transition`, 5000); await sleep(200); const d = await view();
    await setEnemyHp(480); await sleep(250); const e = await view();
    rec("H3 フェーズの表示: 遷移の前 PHASE 1/2 → 遷移の間 PHASE 2/2…(金色)→ 終わると PHASE 2/2 → 回復しても戻らない", /PHASE 1\/2/.test(a.phase) && t.view.transition === true && /PHASE 2\/2…/.test(t.phase) && d.view.transition === false && /PHASE 2\/2/.test(d.phase) && !/…/.test(d.phase) && e.view.hp === 480 && /PHASE 2\/2/.test(e.phase), { a: a.phase, t: t.phase, d: d.phase, e: e.phase });
  });

  await check("H4", async () => {
    const out = {};
    for (const [label, mapId] of [["Map008", 8], ["Map009", 9], ["Map010", 10]]) { await enter(mapId); if (mapId === 8) await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await sleep(600); const v = await view(); out[label] = { visible: v ? v.visible : null, state: await json(`${HUD}.getHudState()`) }; }
    await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(800); const v1 = await view(); out.Map001 = { visible: v1 ? v1.visible : null, state: await json(`${HUD}.getHudState()`) };
    rec("H4 指定のない戦闘(Map008 / 009 / 010)と探索マップ(Map001)ではボスHUD が出ない・Map008〜010 の戦闘は従来どおり開始できる", Object.values(out).every(o => o.visible === false && o.state === null), out);
  });

  await check("H5", async () => {
    // 倒す: HP 0 の表示(dead)が出る → 消える → 勝利で戻る(勝利の移動は、すぐ始まるので、dead の表示は数フレーム)
    await enter(11); await fixEnemy(10, 6, 2); await put(10, 11); await topUp(); await sleep(300); await installRec(); await setEnemyHp(0);
    const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(1000); const res = await ev("$gameVariables.value(9)"), after = await view(), rc = await json("window.__hudRec");
    const deadFrames = rc.filter(r => r.dead && r.hp === 0);
    rec("H5 倒すと HP 0 の表示(dead)が出る → 勝利で元のマップへ戻ると消える(結果=1)", deadFrames.length >= 1 && deadFrames.every(r => r.vis) && back && res === 1 && after && after.visible === false && (await json(HUD + ".getHudState()")) === null, { deadFrames: deadFrames.length, back, res, after: after && after.visible });
    // 撤退
    await enter(11); await fixEnemy(10, 6, 2); await put(10, 11); await topUp(); await setEnemyHp(240); await sleep(500); const mid = await view(); await ev(`${FC}.abortEncounter(); 'ok'`);
    const back2 = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(600); const gone = await view();
    rec("H5b 撤退(中断): 戦闘の途中で退くと HUD が消える・元のマップへ戻る(結果=3)", !!mid && mid.visible === true && back2 && gone.visible === false && (await json(`${HUD}.getHudState()`)) === null && (await ev("$gameVariables.value(9)")) === 3, { mid: mid && mid.visible, gone: gone && gone.visible });
    // 入り直し: Hendrix は生き残った敵の HP を引き継ぐ(既存の仕様)。HP を満タンに戻して退いたあとは、満タン・PHASE 1/2 から
    await enter(11); await setEnemyHp(500); await sleep(400); await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(600);
    await enter(11); await sleep(500); const re = await view();
    rec("H5c 入り直し: 満タン・PHASE 1/2 から(前の戦闘の表示を引きずらない)", !!re && re.visible && re.view.hp === 500 && /PHASE 1\/2/.test(re.phase) && re.view.transition === false && Math.abs(re.ghost - 1) < 1e-9, { hp: re && re.view.hp, phase: re && re.phase, ghost: re && re.ghost });
  });

  await check("H6", async () => {
    // 重なり: 自然な戦闘(ボスは追う・視界あり)で、HUD の範囲が、ほかの戦闘HUD・予兆(扇形・直線)と重ならない
    await ev(`${FC}.setPerception({ enabled: true }); ${FC}.detachEnemy(1); ${FC}.attachEnemy(1, { strong: 'dev_miniboss', reach: 2, sightTiles: 12, cooldownFrames: 80, chase: true }); 'ok'`); await put(10, 11); await putEnemy(10, 3, 2); await topUp();
    const geo = await json(`(function(){
      var m = SceneManager._scene._projectRBattleHudLayer, h = ${hudSprite}, b = h.getBounds(), hb = { x: b.x, y: b.y, w: b.width, h: b.height }, over = [], leaves = 0;
      function walk(n, path) { if (n === h || !n.visible || !n.worldVisible) return; var kids = n.children || [];
        if (n.bitmap || n.geometry || n.graphicsData) { var r = n.getBounds(); if (r.width > 1 && r.height > 1) { leaves++; if (r.x < hb.x + hb.w && hb.x < r.x + r.width && r.y < hb.y + hb.h && hb.y < r.y + r.height) over.push(path + ' ' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width) + 'x' + Math.round(r.height)); } }
        kids.forEach(function(k) { walk(k, path + '/' + (k.constructor.name || '?')); }); }
      m.children.forEach(function(k) { walk(k, k.constructor.name); });
      var ult = m.children.find(function(x) { return x.constructor.name === 'Sprite_ProjectRUltimateHUD'; }), ub = ult ? ult.getBounds() : null;
      return { hud: hb, screen: { w: Graphics.width, h: Graphics.height }, leaves: leaves, overlaps: over, ultimateBottom: ub ? Math.round(ub.y + ub.height) : null };
    })()`);
    rec("H6 ボスHUD が、ほかの戦闘HUD(ULTIMATE・プレイヤーの表示・スキル枠など)の描画される部品と重ならない・ULTIMATE の下・画面の上部(上 25%)・左右の中央", geo.hud.w > 100 && geo.leaves >= 5 && geo.overlaps.length === 0 && (geo.ultimateBottom === null || geo.hud.y >= geo.ultimateBottom - 1) && geo.hud.y + geo.hud.h <= geo.screen.h * 0.25 && Math.abs((geo.hud.x + geo.hud.w / 2) - geo.screen.w / 2) < geo.screen.w * 0.03, geo);
    // 予兆: 自然な戦闘で、予兆の多角形(画面の座標)が HUD の範囲に入らない
    let hits = 0, samples = 0; const t0 = Date.now();
    while (Date.now() - t0 < 22000) {
      const r = await json(`(function(){ var h = ${hudSprite}; var b = h.getBounds(); var out = 0, n = 0; ${SE}.telegraphs().forEach(function(t) { n++; var xs = t.polygon.map(function(p) { return $gameMap.adjustX(p.x) * 48; }), ys = t.polygon.map(function(p) { return $gameMap.adjustY(p.y) * 48; }); var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys); if (x0 < b.x + b.width && b.x < x1 && y0 < b.y + b.height && b.y < y1) out++; }); return { n: n, out: out, hp: $gameParty.leader().hp }; })()`);
      samples += r.n; hits += r.out; if (r.hp < 250) await topUp(); if (samples >= 60) break; await sleep(60);
    }
    rec("H6b 自然な戦闘中の予兆(扇形・直線)が、ボスHUD の範囲と重ならない", samples >= 20 && hits === 0, { samples, hits });
    await ev(`${FC}.abortEncounter(); 'ok'`); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000);
  });

  await check("Z", async () => {
    const writes = await ev("window.__writes"), errs = s.errors(), d = await json(`${SE}.diagnostics()`);
    rec("Z1 保存の書き込みなし", writes === 0, writes); rec("Z2 Console のエラーなし・強敵の plugin のエラー 0", errs.length === 0 && d.errors === 0, { errs: errs.slice(0, 3), pluginErrors: d.errors });
  });
  const fails = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - fails}/${s.results.length} passed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("ERR", e.stack); process.exit(1); });
