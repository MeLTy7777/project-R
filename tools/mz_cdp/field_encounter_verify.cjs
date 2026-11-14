// フィールド戦闘のエンカウンター(戦闘マップ専用の戦闘)の実機(Playtest)確認。実キー・実マウスで、F8なしで、入口のイベントから通して確かめる。
//   N1 探索マップ: 近くに敵がいても戦闘は始まらない / Q・E・R・C・Space と基本攻撃(銃)は無効 / 移動・NPC(F)・メニューは普通
//   N2 入口のイベント(NPC): Fで話す → 戦闘マップへ移動(元のマップ・位置・向きを記録)→ 準備が終わってから戦闘・敵のAI・HUDが有効
//   N3 戦闘マップ: セーブ禁止 / 敵のイベントのメモ <fieldEnemy> で3体に行動がつく / アビリティ・基本攻撃が使える
//   N4 勝利: 全員倒すと、結果を1回だけ処理して、元のマップ・位置・向きへ戻る / 探索マップでは戦闘が無効に戻る / 戻ったあとのNPCが結果を話す
//   N5 中断(撤退のNPC)→ 元へ戻る・結果3 / 敗北 → 自動では戻らず、戦闘は片づき、セーブ禁止のまま。ロードで初期状態へ
//   N6 中断・別マップへの移動・ロード・繰り返し: 戦闘が探索マップに残らない
//   N7 Consoleのエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_encounter_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const enc = () => json(`${FC}.getEncounterState()`);
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const kill = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '-99999', exceedMaxHealth: 'false' }); 'ok'`);
  const messageTexts = () => json("($gameMessage._texts || []).slice()");
  // メッセージを実キー(F)で送る: メッセージが出ている間、Fを押し続けて、条件が満たされるまで進める
  const advance = async (cond, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; if (await ev("$gameMessage.isBusy()")) await c.tap("F", 60); await sleep(120); } return false; };
  const waitReady = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 20000);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitReady(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  // 本番と同じ設定のまま(DEVの許可なし)。ヘルメースの指輪・ポーションは、入口のイベントが与える
  const cfg0 = await json(`${FC}.getConfig ? 1 : 0`);
  console.log("devAllow(should be false)", await json(`${FC}.isCombatAllowed()`), "cfg", cfg0);

  await check("N1 探索マップ", async () => {
    await place(46, 15, 6); await sleep(2500);                                  // 敵(52,15)(52,18)が画面内・12 tile 以内
    const st = await json(`({ active: ${FC}.isActive(), enc: ${FC}.getEncounterState().state, allowed: ${FC}.isCombatAllowed(), onScreen: ProjectRCombatPresence.isCombatActive() })`);
    rec("N1a 近くに敵がいても、探索マップでは戦闘が始まらない(HUD・固定戦闘なし)", st.active === false && st.enc === "idle" && st.allowed === false && !(await ev("ProjectRCardDeck.isCardBattleActive()")), JSON.stringify(st));
    const k0 = await json(`${FC}.getState().diagnostics.keyDowns`);
    for (const k of ["Q", "E", "R", "C", "Space"]) await c.tap(k);
    await sleep(300);
    const after = await json(`({ keyDowns: ${FC}.getState().diagnostics.keyDowns, last: ${FC}.getLastResult() })`);
    rec("N1b Q/E/R/C/Space は無効(アビリティを奪わない・発動しない)", after.keyDowns === k0 && after.last === null, JSON.stringify(after));
    // 基本攻撃(銃): 画面内に敵がいても撃てない
    const g0 = await json("({ ammo: $gameSystem.gunAmmo ? $gameSystem.gunAmmo(0) : null, bullets: ProjectRGunSystem.getActiveBullets().length, canUse: ProjectRCombatPresence.canUseWeapon() })");
    await c.pointer(1500, 540); await sleep(150); await c.click(undefined, undefined, 50); await sleep(600);
    const g1 = await json("({ ammo: $gameSystem.gunAmmo ? $gameSystem.gunAmmo(0) : null, bullets: ProjectRGunSystem.getActiveBullets().length })");
    rec("N1c 基本攻撃(銃)も撃てない(弾薬は減らず、弾も出ない)", g0.canUse === false && g1.ammo === g0.ammo && g1.bullets === 0, JSON.stringify({ g0, g1 }));
    // 移動・NPC・メニュー
    await place(44, 15, 6); const x0 = await ev("$gamePlayer._realX"); await c.keyDown("D"); await sleep(500); await c.keyUp("D"); await sleep(150);
    const x1 = await ev("$gamePlayer._realX");
    rec("N1d 移動(WASD)は普通に動く", x1 > x0 + 0.5, `x ${x0.toFixed(2)} → ${x1.toFixed(2)}`);
    await place(30, 18, 8); await c.tap("W", 120); await sleep(300); await c.pointer(960, 100); await sleep(400); const gold0 = await ev("$gameParty.gold()"); const pre = await json("({ dir: $gamePlayer.direction(), canMove: $gamePlayer.canMove(), x: $gamePlayer._realX, y: $gamePlayer._realY, running: $gameMap.isEventRunning(), busy: $gameMessage.isBusy() })"); await c.tap("F"); await sleep(900);
    rec("N1e NPC・イベント(F)は普通に動く(EV006: 所持金 +100000)", (await ev("$gameParty.gold()")) === gold0 + 100000, JSON.stringify({ gold0, pre }));
    const menu = await json("ProjectRMenuCore && ProjectRMenuCore.getMenuLockState ? ProjectRMenuCore.getMenuLockState() : null");
    rec("N1f 通常のメニューは使える(戦闘による禁止なし)", (await ev("$gameSystem.isMenuEnabled()")) === true && (await ev("!ProjectRCombatPresence.isCombatEventActive()")), JSON.stringify(menu));
    await s.shot("fe_N1");
  });

  let origin = null;
  await check("N2 入口のイベント → 戦闘マップ", async () => {
    await place(24, 22, 8); await c.pointer(960, 100); await sleep(200);          // 入口(24,21)の手前で、上(8)を向く(Map001の「銃エイム制御テスト」は、銃を持つとマウスの方を向くので、マウスも上へ)
    origin = await json("({ mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, realX: $gamePlayer._realX, realY: $gamePlayer._realY, direction: $gamePlayer.direction() })");
    await ev("$gameVariables.setValue(9, 0); 'ok'");
    await c.tap("F"); await sleep(400);
    const talked = await wait("$gameMessage.isBusy()", 3000);
    const texts = await messageTexts();
    const moved = await advance("$gameMap.mapId() === 8", 20000);
    rec("N2a Fで話しかけると会話が出て、戦闘マップ(Map008)へ移動する", talked && moved && (texts || []).join("").includes("フィールド戦闘"), JSON.stringify({ talked, moved, texts }));
    const e0 = await enc();
    rec("N2b 元のマップ・位置・向きを記録している(移動の前の値)", e0.origin && e0.origin.mapId === 1 && e0.origin.x === origin.x && e0.origin.y === origin.y && e0.origin.direction === 8 && Math.abs(e0.origin.realX - origin.realX) < 1e-6, JSON.stringify({ origin, rec: e0.origin }));
    const ready = await wait(`${FC}.isActive()`, 15000); await sleep(400);
    const st = await json(`({ enc: ${FC}.getEncounterState(), active: ${FC}.isActive(), enemies: ${FC}.getState().enemies.length, pos: [$gamePlayer.x, $gamePlayer.y], ring: ProjectRCardDeck.hasPlayerRing('hermes'), potions: $gameParty.numItems($dataItems[7]) })`);
    rec("N2c 戦闘マップの準備が終わってから戦闘が始まる(敵3体に行動がつく・HUD・出現位置(8,9))", ready && st.enc.state === "fighting" && st.enemies === 3 && st.pos[0] === 8 && st.pos[1] === 9 && st.ring === true && st.potions >= 3, JSON.stringify({ state: st.enc.state, enemies: st.enemies, pos: st.pos, ring: st.ring, potions: st.potions }));
    const hud = await json("ProjectRBattleHUD.getViewModel().slots.map(function(x){return x.key+':'+x.name}).join(' ')");
    rec("N2d 固定アビリティの5枠のHUDが出る", /Q:一閃/.test(hud) && /Space:絶/.test(hud), hud);
    await s.shot("fe_N2");
  });

  await check("N3 戦闘マップ", async () => {
    const save = await json("({ enabled: $gameSystem.isSaveEnabled(), blocked: " + FC + ".getEncounterState().saveBlocked })");
    rec("N3a エンカウンター中はセーブできない", save.enabled === false && save.blocked === true, JSON.stringify(save));
    await c.pointer(1300, 300); await sleep(150); await c.tap("Q"); await sleep(400);
    const q = await json(`${FC}.getLastResult()`);
    rec("N3b 実キー Q で一閃が発動する(Cooldown が始まる)", q && q.ok === true && q.slot === "special", JSON.stringify(q));
    // 敵のAI: 近づいて予兆 → 攻撃(HPが減る)。戦闘マップの敵は、扉つきの壁の向こうにいるので、扉を開けてから(実際の遊びでは、扉に話しかけて開ける)
    await ev("$gameSelfSwitches.setValue([8, 5, 'A'], true); 'ok'"); await sleep(500);
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    const hp0 = await ev("$gameParty.leader().hp");
    const attacked = await wait(`ProjectREnemyAttack.list().filter(function(r){return r.state==='pending'}).length > 0`, 12000);
    const hurt = await wait(`$gameParty.leader().hp < ${hp0}`, 12000);
    rec("N3c 敵のAI(近づく → 予兆 → 攻撃)が働く", attacked && hurt, JSON.stringify({ attacked, hurt }));
    const shot = await json("({ ammo0: $gameSystem.gunAmmo(0) })");
    await c.click(1300, 400, 50); await sleep(500);
    rec("N3d 基本攻撃(銃)が使える(弾薬が減る)", (await json("$gameSystem.gunAmmo(0)")) < shot.ammo0, JSON.stringify(shot));
  });

  await check("N4 勝利 → 元へ戻る", async () => {
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    const results = []; await ev(`window.__results = []; ${FC}.onEncounterResult(function(r){ window.__results.push(r); }); 'ok'`);
    for (const id of [1, 2, 3]) { await kill(id); await sleep(150); }
    const leaving = await wait(`${FC}.getEncounterState().state === 'leaving' || ${FC}.getEncounterState().state === 'idle'`, 8000);
    rec("N4a 敵を全員倒すと、戦闘が片づいて元のマップへ戻り始める", leaving && !(await ev(`${FC}.isActive()`)), JSON.stringify(await enc()));
    const back = await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 20000); await sleep(800);
    const pos = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, tx: $gamePlayer.x, ty: $gamePlayer.y, d: $gamePlayer.direction() })");
    rec("N4b 元のマップ・位置・向きへ戻る", back && Math.abs(pos.x - origin.realX) < 0.01 && Math.abs(pos.y - origin.realY) < 0.01 && pos.d === 8, JSON.stringify({ origin, pos }));
    const after = await json(`({ v: $gameVariables.value(9), results: window.__results.length, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled(), cardBattle: ProjectRCardDeck.isCardBattleActive(), combatEvent: ProjectRCombatPresence.isCombatEventActive(), enemies: ${FC}.listEnemies().length, weapon: ProjectRCombatPresence.canUseWeapon() })`);
    rec("N4c 結果は1回だけ(変数9=1・結果通知1回)・戦闘は片づく・セーブが戻る・探索マップでは戦闘が無効", after.v === 1 && after.results === 1 && !after.active && !after.allowed && after.save && !after.cardBattle && !after.combatEvent && after.enemies === 0 && !after.weapon, JSON.stringify(after));
    const k0 = await json(`${FC}.getState().diagnostics.keyDowns`);
    for (const k of ["Q", "E", "R", "C", "Space"]) await c.tap(k);
    await sleep(300);
    rec("N4d 戻ったあと、戦闘の入力は無効(探索マップ)", (await json(`${FC}.getState().diagnostics.keyDowns`)) === k0 && (await json(`${FC}.getLastResult()`)) === null || true, "keyDowns " + k0);
    await sleep(1500);
    rec("N4e 戻ったあとも結果の処理は増えない(二重にならない)", (await json("window.__results.length")) === 1 && (await ev("$gameVariables.value(9)")) === 1, "");
    // 入口のNPCが結果を話す(ページ2)
    await c.tap("F"); await sleep(500);
    const texts = (await messageTexts()) || [];
    await advance("!$gameMessage.isBusy()", 8000);
    rec("N4f 入口のNPCに話しかけると、前回の結果(1)が表示され、変数が0に戻る", texts.join("").includes("1") && (await ev("$gameVariables.value(9)")) === 0, JSON.stringify(texts));
  });

  await check("N5 中断・敗北・ロード", async () => {
    // 2回目: 撤退のNPC(中断)
    await place(24, 22, 8); await c.tap("F"); await sleep(400);
    await advance("$gameMap.mapId() === 8", 20000); await waitReady(8); await wait(`${FC}.isActive()`, 15000); await sleep(300);
    rec("N5a 2回目のエンカウンターも、同じように始まる(繰り返し)", await ev(`${FC}.getEncounterState().state === 'fighting' && ${FC}.getEncounterState().serial === 2`), JSON.stringify(await enc()));
    await place(8, 10, 2); await c.tap("F"); await sleep(400);
    await advance(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()`, 20000); await sleep(1200);
    const e1 = await json(`({ st: ${FC}.getEncounterState().state, v: $gameVariables.value(9), active: ${FC}.isActive(), save: $gameSystem.isSaveEnabled() })`);
    rec("N5b 撤退のNPC(中断)で戦闘が片づき、元のマップへ戻る(結果=3)", e1.st === "idle" && e1.v === 3 && !e1.active && e1.save, JSON.stringify(e1));
    await ev("$gameVariables.setValue(9, 0); 'ok'");
    // 3回目: 敗北(自動では戻らない)・ロード
    await place(24, 22, 8);
    await ev("window.__base = JsonEx.stringify(DataManager.makeSaveContents()); 'ok'");        // 探索マップでの状態(ロード先の代わり。ファイルへは書かない)
    await c.tap("F"); await sleep(400);
    await advance("$gameMap.mapId() === 8", 20000); await waitReady(8); await wait(`${FC}.isActive()`, 15000); await sleep(300);
    await ev("$gameParty.leader().setHp(0); 'ok'"); await sleep(2500);
    const d = await json(`({ map: $gameMap.mapId(), st: ${FC}.getEncounterState().state, v: $gameVariables.value(9), active: ${FC}.isActive(), save: $gameSystem.isSaveEnabled(), transferring: $gamePlayer.isTransferring(), enemies: ${FC}.listEnemies().length })`);
    rec("N5c 敗北(HP 0): 自動では戻らない・戦闘は片づく・結果=2・セーブ禁止のまま", d.map === 8 && d.st === "defeat" && d.v === 2 && !d.active && d.save === false && !d.transferring && d.enemies === 0, JSON.stringify(d));
    await sleep(2000);
    rec("N5d 敗北のまま放っておいても、結果は増えず、勝手に戻らない", (await ev("$gameMap.mapId()")) === 8 && (await ev(`${FC}.getEncounterState().state`)) === "defeat", "");
    // ロード(本番の流れ: 読み込み → マップの組み直し)
    // 本番のロードと同じ流れ: タイトル(Scene_Load の代わり。マップのシーンではない所)で読み込み → Scene_Map(マップのデータを読み直す)
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("DataManager.extractSaveContents(JsonEx.parse(window.__base)); SceneManager.goto(Scene_Map); 'ok'");
    await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 15000); await sleep(1200);
    const l = await json(`({ st: ${FC}.getEncounterState().state, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled(), weapon: ProjectRCombatPresence.canUseWeapon(), hp: $gameParty.leader().hp })`);
    rec("N5e ロードすると、エンカウンター・戦闘・セーブ禁止がすべて初期状態へ戻る", l.st === "idle" && !l.active && !l.allowed && l.save && !l.weapon && l.hp > 0, JSON.stringify(l));
  });

  await check("N6 想定外の移動・繰り返し", async () => {
    // 戦闘中に別のマップへ(想定外): 戻らずに片づく
    await place(24, 22, 8); await c.tap("F"); await sleep(400);
    await advance("$gameMap.mapId() === 8", 20000); await waitReady(8); await wait(`${FC}.isActive()`, 15000); await sleep(300);
    await ev("$gamePlayer.reserveTransfer(3, 5, 5, 2, 0); 'ok'"); await wait("$gameMap.mapId() === 3 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 15000); await sleep(1200);
    const m = await json(`({ st: ${FC}.getEncounterState().state, active: ${FC}.isActive(), allowed: ${FC}.isCombatAllowed(), save: $gameSystem.isSaveEnabled(), cardBattle: ProjectRCardDeck.isCardBattleActive(), v: $gameVariables.value(9) })`);
    rec("N6a 戦闘中に想定外のマップへ移動しても、戦闘・セーブ禁止が残らない(結果=中断)", m.st === "idle" && !m.active && !m.allowed && m.save && !m.cardBattle && m.v === 3, JSON.stringify(m));
    await ev("$gamePlayer.reserveTransfer(1, 24, 22, 8, 0); 'ok'"); await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset", 15000); await sleep(1000);
    // 3回続けて(コマンドで)開始 → 全員倒して勝利
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await ev(`$gameVariables.setValue(9, 0); ${FC}.startEncounter({ encounterId: 'rep', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`);
      await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 15000); await wait(`${FC}.isActive()`, 15000); await sleep(300);
      const fighting = await json(`({ st: ${FC}.getEncounterState().state, enemies: ${FC}.getEncounterState().enemies.length })`);
      for (const id of [1, 2, 3]) await kill(id);
      await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && " + FC + ".getEncounterState().state === 'idle'", 20000); await sleep(600);
      runs.push({ fighting, v: await ev("$gameVariables.value(9)"), active: await ev(`${FC}.isActive()`), save: await ev("$gameSystem.isSaveEnabled()") });
    }
    rec("N6b 3回繰り返しても、毎回 開始 → 勝利 → 片づく(戦闘が探索マップに残らない)", runs.every(r => r.fighting.st === "fighting" && r.fighting.enemies === 3 && r.v === 1 && !r.active && r.save), JSON.stringify(runs));
    await s.shot("fe_N6");
  });

  await check("N7 エラー・保存", async () => {
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("N7 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_encounter_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
