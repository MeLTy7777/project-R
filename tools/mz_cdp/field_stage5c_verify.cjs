// フィールド戦闘 Stage 5c(実キーの Shift・X/C/V の割り当て・薙ぎ払いの当たり判定と見た目の一致)の実機(Playtest)確認。CDP の実際のキー・マウスで操作する。
//   K1 HUD: LMB / Shift / E / X / C の5枠 + 別枠 V のアイテム。Q 奥義・R リロード・右クリックの銃は枠に出ないが使える
//   K2 実キーの Shift(keydown の shiftKey = true)で絶が発動する。原因: CardBattleInput.getBlockedReason が shiftKey を「修飾キー」として断っていた
//   K3 Shift を押したまま E / X / C / Q / R も受け付ける
//   K4 X = 黄金の矢 / C = ギガース殺し(固定カード・ドロー無し)/ V = アイテム(短押し=使う・長押し=放射メニュー)。X はメニューを開かず、戦闘外では従来どおりメニューが開く
//   H  薙ぎ払い(3段コンボ)の当たり判定 = 見た目の扇(半径・弧・向き・時間)。見た目の内側は当たり、外側は外れる。斜め・3段目(強撃)・壁越し
//   H* スクリーンショット: 判定の扇の重ね描き(この検証のページ内だけ。ゲームのファイルには何も足さない)と、実際の VFX
//   E  Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_stage5c_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const ONLY = process.env.ONLY || "";
  const check = async (id, fn) => { if (ONLY && !id.startsWith(ONLY)) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const playerScreen = () => json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })");
  const footScreen = () => json("({ x: $gamePlayer.screenX(), y: $gamePlayer.screenY() })");
  const last = () => json(`${FC}.getLastResult()`);
  const slots = () => json("ProjectRBattleHUD.getViewModel().slots");
  const waitCd = async (slot, ms = 12000) => wait(`${FC}.getCooldowns().${slot} <= 0`, ms);
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); await ev(`${FC}.startEncounter({ encounterId: 's5c', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive() && ${FC}.getEncounterState().state === 'fighting'`, 15000); await sleep(1000); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1200); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); $gameParty.gainItem($dataItems[8], 2); Math.random = function() { return 0.9; }; return 'ok'; })()`);
  await sleep(300);

  // ---------------------------------------------------------------- 実キー(Map008 のエンカウンター)
  await check("K 実キー", async () => {
    await enter();
    const sl = await slots(), keys = sl.map(x => x.key).join(","), names = sl.map(x => x.name).join(",");
    rec("K1a HUD のキー: LMB / Shift / E / X / C + 別枠 V", keys === "LMB,Shift,E,X,C,V", keys);
    rec("K1b 名前は実際のスキル名(薙ぎ払い・絶・一閃・黄金の矢・ギガース殺し)+ アイテム名・Q/R は枠に無い", /^薙ぎ払い,絶,一閃,.+,.+,.+$/.test(names) && !/\bQ\b|\bR\b/.test(keys), names);
    const lo = await json(`${FC}.getLoadout()`);
    rec("K1c 割り当て: X=card1(黄金の矢)・C=card2(ギガース殺し)・V=アイテム・Q/R/Shift/E は従来どおり", lo.card1.key === "X" && lo.card1.cardId === "apollo_golden_volley" && lo.card2.key === "C" && lo.card2.cardId === "apollo_gigas_slayer" && lo.consumable.key === "V" && lo.ultimate.key === "Q" && lo.reload.key === "R" && lo.mobility.key === "Shift" && lo.special.key === "E", JSON.stringify(Object.fromEntries(Object.entries(lo).map(([k, v]) => [k, v.key]))));

    // K2: 実機の Shift は keydown の shiftKey が true(CDP も同じ修飾フラグを付ける)。
    const blockedWith = await json(`({ shift: ProjectRCardBattleInput.getBlockedReason({ shiftKey: true }), none: ProjectRCardBattleInput.getBlockedReason({}) })`);
    rec("K2a 原因の確認: CardBattleInput は shiftKey=true の keydown を「modifierKey」と断る(FieldCombat が Shift だけを外して判断する必要があった)", blockedWith.shift === "modifierKey", JSON.stringify(blockedWith));
    await ev(`window.__kd = []; document.addEventListener('keydown', function(e) { window.__kd.push({ code: e.code, shift: e.shiftKey }); }, true); 'ok'`);
    await ev("$gameMap.event(1).locate(4, 4); $gameMap.event(2).locate(12, 4); $gameMap.event(3).locate(8, 3); 'ok'"); await door(true);
    await place(8, 10, 8); const p = await playerScreen(); await c.pointer(p.x, p.y - 5 * 48); await sleep(200);
    const a = await pos(); await waitCd("mobility", 6000);
    await c.tap("Shift", 90); await sleep(1000);
    const b = await pos(), r = await last(), kd = await json("window.__kd.filter(function(k){ return k.code === 'ShiftLeft'; })"), dg = await json(`${FC}.getControlStats()`);
    rec("K2b 実キーの Shift(shiftKey=true の keydown)で、絶が発動して北へ移動する(無反応ではない)", kd.length > 0 && kd[0].shift === true && r.slot === "mobility" && r.ok === true && b.y < a.y - 3, `keydown ${JSON.stringify(kd[0])} y ${a.y} → ${b.y} ${JSON.stringify(r).slice(0, 120)}`);
    rec("K2c 診断: 受け付けた(accepted)・断った理由がない", dg && dg.diag && dg.diag.lastCode === "ShiftLeft" && dg.diag.lastDecision === "accepted" && dg.diag.lastReason === null, JSON.stringify(dg && dg.diag));
    // 修飾フラグ無しの合成キー(従来のテスト)も、同じく通る
    c.setPhysicalShift(false); await place(8, 10, 8); await c.pointer(p.x, p.y - 5 * 48); await sleep(200); await waitCd("mobility", 6000);
    const a2 = await pos(); await c.tap("Shift", 90); await sleep(1000); const b2 = await pos(); c.setPhysicalShift(true);
    rec("K2d 修飾フラグなしの Shift でも発動する", b2.y < a2.y - 3, `y ${a2.y} → ${b2.y}`);
    // K2e: 絶が使えない正当な理由 = Cooldown。HUD に COOL と秒数が出る
    await place(8, 10, 8); await c.pointer(p.x, p.y - 5 * 48); await sleep(200); await waitCd("mobility", 6000);
    await c.tap("Shift", 90); await sleep(300); const cdOn = (await slots())[1], rr = await last();
    await c.tap("Shift", 90); await sleep(200); const rcd = await last();
    rec("K2e 使えないとき(Cooldown)は、HUD に COOL と残り秒数・結果の理由が cooldown", cdOn.cooldown && cdOn.cooldown.active === true && /COOL|\d/.test(String(cdOn.detail)) && rcd.ok === false && rcd.reason === "cooldown", JSON.stringify({ detail: cdOn.detail, cooldown: cdOn.cooldown, reason: rcd.reason }));
    await waitCd("mobility", 6000);
    // K2f: 使えない正当な理由(閉じた扉の真下の壁ぎわで、壁へ向かう = 進める場所がない)は、動かず、枠の下の文字に理由が出る(無反応に見えない)
    await door(false); await place(8, 8, 8); const pc = await playerScreen(); await c.pointer(pc.x, pc.y - 4 * 48); await sleep(200);
    const a3 = await pos(); await c.tap("Shift", 90); await sleep(700);
    const b3 = await pos(), z3 = await json("ProjectRHermesZetsu.getLastResult()"), hudM = (await slots())[1], rr3 = await last();
    rec("K2f 進める場所がない(壁ぎわで壁へ)ときは、動かず、枠の下に理由(進めない)が出る・Cooldown は始まらない", Math.abs(b3.y - a3.y) < 0.2 && /進めない|方向なし|動けない/.test(String(hudM.detail)) && !(await json(`${FC}.getCooldowns().mobility > 0`)), JSON.stringify({ detail: hudM.detail, r: JSON.stringify(rr3).slice(0, 120), z: z3 && { ok: z3.ok, reason: z3.reason }, y: [a3.y, b3.y] }));
    await waitCd("mobility", 6000); await door(false);

    // K3: Shift を押したままの他のキー
    await place(8, 10, 8); await c.pointer(p.x, p.y - 4 * 48); await sleep(200); await waitCd("special", 12000);
    await c.keyDown("Shift"); await sleep(120);
    await c.tap("E", 80); await sleep(400); const rE = await last();
    await c.keyUp("Shift"); await sleep(120);
    rec("K3a Shift を押したままの E(一閃)も受け付ける", rE.slot === "special" && rE.ok === true, JSON.stringify(rE).slice(0, 140));
    await waitCd("card1", 8000); await topUp();
    await c.keyDown("Shift"); await sleep(100); await c.tap("X", 80); await sleep(300); const rX = await last(); await c.keyUp("Shift"); await sleep(100);
    rec("K3b Shift を押したままの X(黄金の矢)も受け付ける", rX.slot === "card1" && rX.ok === true, JSON.stringify(rX).slice(0, 140));
    await c.keyDown("Shift"); await sleep(100); await c.tap("R", 80); await sleep(200); const rR = await last(); await c.keyUp("Shift"); await sleep(100);
    rec("K3c Shift を押したままの R(リロード)も受け付ける(結果が返る)", rR.slot === "reload", JSON.stringify(rR).slice(0, 140));
    const dash = await ev("$gamePlayer.isDashing()");
    rec("K3d 戦闘中は Shift でダッシュしない", dash === false, String(dash));
  });

  await check("K4 X / C / V", async () => {
    await place(8, 10, 8);
    await ev("$gameMap.event(1).locate(8, 9); $gameMap.event(1)._realX = 8; $gameMap.event(1)._realY = 9; 'ok'");
    await ev(`${FC}.detachEnemy(1); 'ok'`); await setHp(1, 5000); await waitCd("card1", 8000); await waitCd("card2", 8000);
    const ps = await playerScreen();
    const e1 = await json("(function(){ var e = $gameMap.event(1); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()");
    await c.pointer(e1.x, e1.y); await sleep(150);
    const h0 = await hp(1); await c.tap("X", 70); await sleep(1600);
    const r1 = await last(), h1 = await hp(1);
    const scene1 = await ev("SceneManager._scene.constructor.name");
    rec("K4a 実キー X: 黄金の矢(card1)が発動して敵にダメージ・メニューは開かない", r1.slot === "card1" && r1.ok === true && h1 < h0 && scene1 === "Scene_Map", `${JSON.stringify(r1).slice(0, 110)} HP ${h0} → ${h1} scene ${scene1}`);
    await c.pointer(e1.x, e1.y); await sleep(150);
    const h2 = await hp(1); await c.tap("C", 70); await sleep(1800);
    const r2 = await last(), h3 = await hp(1);
    rec("K4b 実キー C: ギガース殺し(card2)が発動して敵にダメージ(C はアイテムではない)", r2.slot === "card2" && r2.ok === true && h3 < h2, `${JSON.stringify(r2).slice(0, 110)} HP ${h2} → ${h3}`);
    const cds = await json(`${FC}.getCooldowns()`), fixed = await json(`({ draw: ProjectRCardDeck.getBattleState().drawPile.length, soul: ProjectRSoulEncounter.getState().state, soulAllowed: ${FC}.isSoulAllowed() })`);
    rec("K4c 固定カードはドロー・準備(PREPARE)・SOUL戦闘を使わない(山札0・SOULは待機のまま・Cooldownは始まる)", fixed.draw === 0 && fixed.soul === "idle" && fixed.soulAllowed === false && cds.card1 + cds.card2 > 0, JSON.stringify({ fixed, cds }));
    // V: アイテム
    await ev("$gameParty.leader().setHp(1); 'ok'"); await waitCd("consumable", 12000);
    const before = await json("({ hp: $gameParty.leader().hp, n: $gameParty.numItems($dataItems[7]) })");
    await c.tap("V", 60); await sleep(500);
    const after = await json("({ hp: $gameParty.leader().hp, n: $gameParty.numItems($dataItems[7]) })"), rv = await last();
    rec("K4d 実キー V の短押し: 選んでいるアイテムを使う(HP回復・数量 -1)", rv.slot === "consumable" && rv.ok === true && after.hp > before.hp && after.n === before.n - 1, JSON.stringify({ before, after, rv: JSON.stringify(rv).slice(0, 100) }));
    await topUp(); await waitCd("consumable", 12000); await c.pointer(ps.x, ps.y - 100); await sleep(100);
    await c.keyDown("V"); await sleep(600); const open = await json(`${FC}.getRadialState().open`);
    await c.pointer(ps.x + 120, ps.y); await sleep(150); const hov = await json(`${FC}.getRadialState().index`);
    await s.shot("fc5c_K4_radialV");
    await c.keyUp("V"); await sleep(200); const closed = await json(`${FC}.getRadialState()`);
    rec("K4e V の長押し(0.3秒以上)で放射メニューが開き、離すと閉じて選ぶ(使わない)", open === true && closed.open === false && closed.commits >= 1, JSON.stringify({ open, hov, commits: closed.commits, selectedId: closed.selectedId }));
    // V を押している間は、ほかの戦闘キーを受け付けない
    await waitCd("card1", 8000); await c.keyDown("V"); await sleep(600);
    await c.tap("X", 60); await sleep(200); const blockedX = await json(`${FC}.getRadialState().blocked`);
    await c.keyUp("V"); await sleep(200);
    rec("K4f 放射メニュー中の X は受け付けない(メニュー中の入力の衝突なし)", blockedX >= 1, String(blockedX));
    // 戦闘外では X は従来どおり(メニュー/キャンセル): 戦闘を終えてから
    await ev(`${FC}.abortEncounter('test'); 'ok'`); await leave();
    await ev(`${FC}.setDevAllowOutsideEncounter(false); 'ok'`); await sleep(300);
    const act = await ev(`${FC}.isActive()`);
    await c.tap("X", 80); await sleep(900);
    const sceneOut = await ev("SceneManager._scene.constructor.name");
    rec("K5a 戦闘外では X は従来どおり(メニューを開く)", act === false && /Menu/.test(sceneOut), `active=${act} scene=${sceneOut}`);
    await c.tap("X", 80); await sleep(700); const back = await ev("SceneManager._scene.constructor.name");
    rec("K5b 戦闘外のメニューは X で閉じて、マップへ戻る", back === "Scene_Map", back);
    await c.keyDown("Shift"); await sleep(150);
    const dashOut = await json("({ mapper: Input.keyMapper[16], pressed: Input.isPressed('shift'), dashButton: $gamePlayer.isDashButtonPressed() })"); await c.keyUp("Shift"); await sleep(200);
    rec("K5c 戦闘外では Shift のダッシュのボタンは従来どおり(Input の shift が押され、isDashButtonPressed が true)", dashOut.mapper === "shift" && dashOut.pressed === true && dashOut.dashButton === true, JSON.stringify(dashOut));
    await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
  });

  // ---------------------------------------------------------------- 薙ぎ払いの当たり判定
  await check("H 当たり判定", async () => {
    await enter();
    await ev(`(function(){ [1, 2, 3].forEach(function(i){ ${FC}.detachEnemy(i); }); return 'ok'; })()`);
    for (const i of [1, 2, 3]) await setHp(i, 5000);
    const PARK = { 1: [1, 1], 2: [15, 1], 3: [15, 6] };
    const setPos = (id, cx, cy) => ev(`(function(){ var e = $gameMap.event(${id}); e._x = ${cx} - 0.5; e._y = ${cy} - 0.5; e._realX = ${cx} - 0.5; e._realY = ${cy} - 0.5; return 'ok'; })()`);
    const parkAll = async () => { for (const i of [1, 2, 3]) await setPos(i, PARK[i][0] + 0.5, PARK[i][1] + 0.5); };
    // 毎フレームの記録: 命中した更新の番号(扇の frame)
    await ev(`(function(){ window.__hit = {}; window.__lastHp = {}; var u = Game_Map.prototype.update; if (!window.__hitHooked) { window.__hitHooked = true; Game_Map.prototype.update = function() { var r = u.apply(this, arguments); [1,2,3].forEach(function(i){ var h = $gameMap.getCurrentEventHp(i); if (window.__lastHp[i] != null && h < window.__lastHp[i] && window.__hit[i] == null) { var sw = ProjectRSwordSystem.getActiveSweeps(); window.__hit[i] = sw.length ? sw[0].frame : -1; } window.__lastHp[i] = h; }); return r; }; } return 'ok'; })()`);
    const ang = d => d * Math.PI / 180;
    const clickAt = async (aimDeg, px, py) => {                    // 実マウスで、プレイヤーの足元から aimDeg(0=上・時計回り)へ狙って左クリック
      const f = await footScreen(); await c.pointer(f.x + Math.sin(ang(aimDeg)) * 240, f.y - Math.cos(ang(aimDeg)) * 240); await sleep(60);
    };
    const swings = async (step, aimDeg, px, py) => {               // step 段目の斬撃を出せる状態にして(前の段を空振りで進める)、狙いを固定する
      await sleep(1000); await parkAll(); await place(px, py);
      await clickAt(aimDeg, px, py);
      for (let i = 1; i < step; i++) { await c.click(undefined, undefined, 50); await sleep(340); }
    };
    // 敵の配置・HPの戻し・記録の初期化を1回の評価でまとめて行う(コンボの受付時間 0.8秒の内に、次のクリックを出すため)
    const prep = specs => ev(`(function(){ var h0 = {}; var specs = ${JSON.stringify(specs)}; window.__hit = {};
      specs.forEach(function(s) { var e = $gameMap.event(s.id); e._x = s.x - 0.5; e._y = s.y - 0.5; e._realX = s.x - 0.5; e._realY = s.y - 0.5;
        var hp = $gameMap.getCurrentEventHp(s.id); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: String(s.id), value: '+' + (5000 - hp), exceedMaxHealth: 'true' });
        window.__lastHp[s.id] = $gameMap.getCurrentEventHp(s.id); h0[s.id] = window.__lastHp[s.id]; });
      return JSON.stringify(h0); })()`).then(JSON.parse);
    const runCase = async (name, step, aimDeg, specs, px = 8, py = 4) => {
      const results = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        await swings(step, aimDeg, px, py);
        const cx = px + 0.5, cy = py + 0.5;
        await prep(specs.map(([id, phi, r]) => { const b = ang(aimDeg + phi); return { id, x: cx + Math.sin(b) * r, y: cy - Math.cos(b) * r }; }));
        await sleep(90);
        const h0 = {}; for (const [id] of specs) h0[id] = await hp(id);
        await c.click(undefined, undefined, 50); await sleep(850);
        const cs = await json(`${FC}.getComboState()`), hit = await json("window.__hit");
        if (!cs.last || cs.last.step !== step) { results.length = 0; continue; }      // 段がずれた(時間切れ等): やり直し
        for (const [id, phi, r, expect] of specs) { const h1 = await hp(id); results.push({ id, phi, r, expect, hit: h1 < h0[id], dmg: h0[id] - h1, frame: hit[id] ?? null, last: cs.last }); }
        break;
      }
      const ok = results.length === specs.length && results.every(x => x.hit === x.expect);
      rec(`H ${name}`, ok, results.map(x => `φ${x.phi}°/${x.r}マス ${x.expect ? "当たる" : "外れる"}→${x.hit ? "当たった(" + x.dmg + (x.frame != null ? ", frame " + x.frame : "") + ")" : "外れた"}`).join(" | ") + (ok ? "" : " last=" + JSON.stringify(results[0] && results[0].last)) || "段がずれた");
      return results;
    };

    // 1段目(東向き): 扇の内側(正面・先端・両端ぎりぎり側)は当たり、外側(射程外・真後ろ・斜め後ろ)は外れる
    const A = await runCase("H1a 1段目・東: 正面 3.4マス / 右 80° 2マス / 左 80° 2マス は当たる", 1, 90, [[1, 0, 3.4, true], [2, 80, 2, true], [3, -80, 2, true]]);
    await runCase("H1b 1段目・東: 射程外 4.9マス / 後ろ 120° 2マス / 後ろ -120° 2マス は外れる", 1, 90, [[1, 0, 4.9, false], [2, 120, 2, false], [3, -120, 2, false]]);
    await runCase("H1c 1段目・東: 真後ろ 2.5マスは外れる", 1, 90, [[1, 180, 2.5, false]]);
    // 時間(振りの進み): -80°側は早く、+80°側は遅く当たる(時計回りに振る)
    const early = A.find(x => x.phi === -80), late = A.find(x => x.phi === 80), mid = A.find(x => x.phi === 0);
    rec("H1d 当たる更新は、時計回りの振りに合わせて 左端(-80°)< 正面 < 右端(+80°)", early.frame != null && mid.frame != null && late.frame != null && early.frame < mid.frame && mid.frame < late.frame && late.frame <= 16, `frame ${early.frame} < ${mid.frame} < ${late.frame}`);
    // 2段目
    await runCase("H2a 2段目・東: 正面 3.4 / ±80° 2マスは当たる・後ろ 2.5マスは外れる", 2, 90, [[1, 0, 3.4, true], [2, 80, 2, true], [3, 180, 2.5, false]]);
    // 斜め(4方向): 正面・扇の端は当たり、真後ろは外れる
    for (const [name, aim, px, py] of [["北東 45°", 45, 8, 4], ["南東 135°", 135, 8, 3], ["南西 225°", 225, 8, 3], ["北西 315°", 315, 8, 4]])
      await runCase(`H3 1段目・${name}: 正面 2.5マス / 90° 2.2マスは当たる・真後ろ 2.5マスは外れる`, 1, aim, [[1, 0, 2.5, true], [2, 90, 2.2, true], [3, 180, 2.5, false]], px, py);
    // 3段目(強撃): 一回転(後ろにも当たる)・射程外は外れる・ダメージは倍
    const hv = await runCase("H4a 3段目(強撃)・東: 正面 / 後ろ 2.5マス / 右 80° は当たる", 3, 90, [[1, 0, 2.5, true], [2, 180, 2.5, true], [3, 80, 2, true]]);
    await runCase("H4b 3段目(強撃)・東: 射程外 4.9マスは外れる(後ろ側も)", 3, 90, [[1, 0, 4.9, false], [2, 180, 4.9, false]]);
    const n1 = A.find(x => x.phi === 0).dmg, n3 = hv.find(x => x.phi === 0).dmg;
    rec("H4c 3段目のダメージは1段目の倍(ComboFinisherDamage = 2。式は従来のまま)", n1 > 0 && n3 === n1 * 2, `1段目 ${n1} / 3段目 ${n3}`);
    const back = hv.find(x => x.phi === 180);
    rec("H4d 強撃の後ろ側(2回目の扇)は、1回目の扇より遅れて当たる(同じ斬撃で各敵に1回だけ)", back && hv.find(x => x.phi === 0).frame != null && back.frame > 7 && back.dmg === n3, `frame ${back && back.frame} dmg ${back && back.dmg}`);

    // 壁越し: 扉が閉じていれば、扉の向こうの敵には当たらない。開けば当たる(元の薙ぎ払いと同じ壁の判定)
    await swings(1, 0, 8, 9);
    await door(false); await prep([{ id: 1, x: 8.5, y: 6.5 }]); await sleep(120); const hw0 = await hp(1);
    await c.click(undefined, undefined, 50); await sleep(850); const hw1 = await hp(1);
    rec("H5a 閉じた扉(8,7)の向こうの敵(北 3マス)には当たらない", hw1 === hw0, `HP ${hw0} → ${hw1}`);
    await door(true); await sleep(1000); await prep([{ id: 1, x: 8.5, y: 6.5 }]); await sleep(120); const hw1b = await hp(1); await c.click(undefined, undefined, 50); await sleep(850); const hw2 = await hp(1);
    rec("H5b 扉を開けると、同じ位置の敵に当たる", hw2 < hw1b, `HP ${hw1b} → ${hw2}`);
    await door(false); await parkAll();

    // 1クリック=1回・コンボ・Cooldown・リセットは従来どおり
    await sleep(1000); await place(8, 4); await clickAt(90, 8, 4);
    const c0 = await json(`${FC}.getComboState()`);
    await c.mouseDown("left"); await sleep(450); const c1 = await json(`${FC}.getComboState()`); await sleep(450); await c.mouseUp("left"); await sleep(300);
    const c1b = await json(`${FC}.getComboState()`);
    rec("H6a 押しっぱなしでは1回だけ(自動で次の段へ進まない)", c1b.swings - c0.swings === 1 && c1.step === 1, JSON.stringify({ swings: c1b.swings - c0.swings, stepWhileHeld: c1.step }));
    await sleep(1000); const c2 = await json(`${FC}.getComboState()`);
    for (let i = 0; i < 3; i++) { await c.click(undefined, undefined, 50); await sleep(i < 2 ? 450 : 200); }
    const c3 = await json(`${FC}.getComboState()`);
    rec("H6b 3回のクリックで 1段目 → 2段目 → 3段目(強撃)→ 次は1段目(リセット)", c3.finishers - c2.finishers === 1 && c3.swings - c2.swings === 3 && c3.step === 0, JSON.stringify({ finishers: c3.finishers - c2.finishers, swings: c3.swings - c2.swings, step: c3.step }));
    await sleep(1000);

    // 見た目(VFX)と判定の扇の一致: 中心・向き・大きさ・進み(時間)
    //   VFX の絵(1コマ400px・杖が -95° → +95° へ振れる8コマ・24fps)の位置・回転を、判定の扇(中心・向き・半径)と同じ更新ごとに記録して比べる。
    await ev(`(function(){ window.__al = []; if (window.__alHooked) return 'ok'; window.__alHooked = true; var u = Game_Map.prototype.update; Game_Map.prototype.update = function() { var r = u.apply(this, arguments);
      var sw = ProjectRSwordSystem.getActiveSweeps()[0]; if (sw) { var pic = (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /fieldcombat_sweep|hermes_sweep/.test(String(p.note)) && p.sprite; })[0];
        var e = { sf: sw.frame, deg: sw.degree, rad: sw.radius, arc: sw.arc, cx: sw.center.x, cy: sw.center.y }; if (pic) { var sp = pic.sprite, b = sp.getBounds(), fr = sp.texture && sp.texture.frame; e.note = String(pic.note); e.vx = b.x + b.width / 2; e.vy = b.y + b.height / 2; e.rot = sp.rotation * 180 / Math.PI; e.size = b.width; e.cell = fr ? Math.round(fr.y / 400) * 4 + Math.round(fr.x / 400) : null; e.px = $gamePlayer.screenX(); e.py = $gamePlayer.screenY() - 24; }
        window.__al.push(e); } return r; }; return 'ok'; })()`);
    for (const step of [1, 3]) {
      await sleep(1000); await place(8, 4); await clickAt(90, 8, 4);
      for (let i = 1; i < step; i++) { await c.click(undefined, undefined, 50); await sleep(340); }
      await ev("window.__al = []; 'ok'");
      await c.click(undefined, undefined, 50); await sleep(900);
      const al = await json("window.__al"), withPic = al.filter(e => e.vx != null);
      const head = cell => cell <= 6 ? -95 + 190 * cell / 6 : null;      // 絵の杖の先の角度(狙う向きから。時計回りが正)
      const cmp = withPic.filter(e => head(e.cell) != null && e.sf <= 15).map(e => ({ sf: e.sf, cell: e.cell, d: (-95 + 190 * Math.max(0, e.sf - 1) / 15) - head(e.cell) })), diffs = cmp.map(x => Math.abs(x.d));      // d: 判定の角度 - 絵の杖の先の角度(絵は 1コマ = 31.7° ずつ飛ぶので、-75°(残像の長さ)〜 +32° の内なら、判定は見えている残像・杖の上にある)
      const maxCenter = Math.max(0, ...withPic.map(e => Math.hypot(e.vx - e.px, e.vy - e.py)));
      const rotOk = withPic.every(e => Math.abs(((e.rot - e.deg + 540) % 360) - 180) < 1.5 || Math.abs(((e.rot - e.deg - 180 + 540) % 360) - 180) < 1.5);
      const e0 = withPic[0] || {};
      if (step === 1) {
        rec("H7a VFX の中心 = 判定の扇の中心(プレイヤーのマスの中心。ずれ 2px 以内)", withPic.length >= 5 && maxCenter <= 2, `VFXあり ${withPic.length}更新 最大ずれ ${maxCenter.toFixed(1)}px(中心 ${Math.round(e0.vx)},${Math.round(e0.vy)} / マス中心 ${Math.round(e0.px)},${Math.round(e0.py)}) note=${e0.note}`);
        rec("H7b VFX の向き = 判定の向き(回転 = 狙った角度)", withPic.length >= 5 && rotOk, `rot ${e0.rot && e0.rot.toFixed(1)} / deg ${e0.deg && e0.deg.toFixed(1)}`);
        const outer = 196 / 48, tip = 186 / 48;
        rec("H7c 判定の半径は、残像の杖の先(3.9マス)と外周(4.1マス)の間", e0.rad >= tip - 0.05 && e0.rad <= outer, `半径 ${e0.rad} / 絵 ${e0.size}px = ${(e0.size / 2 / 48).toFixed(2)}マス(杖の先 ${tip.toFixed(2)} 外周 ${outer.toFixed(2)})`);
        rec("H7d 進み(時間): 毎更新、判定の扇の先は、絵の杖の先〜残像(後ろ 75°)〜 1コマ先(+32°)の内にある(見えている杖・残像から外れない)。平均のずれは 20° 以内", cmp.length >= 5 && cmp.every(x => x.d >= -77 && x.d <= 34) && diffs.reduce((a, b) => a + b, 0) / diffs.length <= 20, `比べた ${cmp.length}更新 差 ${cmp.map(x => x.sf + ':' + x.cell + '→' + x.d.toFixed(0)).join(' ')} 平均 ${(diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length)).toFixed(1)}°`);
        await s.shot("fc5c_H_vfx_step1");
      } else {
        const second = al.filter(e => e.sf >= 7);
        rec("H7e 強撃: VFX は2回(反対側へ6更新あと)。判定の扇も同じ2回", (await json("ProjectRSwordSystem.status()")) && al.some(e => e.sf >= 7) && withPic.some(e => e.sf >= 8), `更新 ${al.length}`);
      }
    }
    await ev(`${FC}.abortEncounter('test'); 'ok'`); await leave();
  });

  await check("E エラーなし・保存なし", async () => {
    const errs = s.errors(); const writes = await ev("window.__writes");
    rec("E Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_stage5c_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
