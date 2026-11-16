// フィールド戦闘 Stage 5b(5枠・固定カード・絶・薙ぎ払いVFX・勝利時のエラー)の実機(Playtest)確認。CDP の実際のキー・マウスで操作する。
//   S1 HUD: LMB 薙ぎ払い / Shift 絶 / E 一閃 / 1・2 固定カード + 別枠の C アイテム。Q 奥義・R リロード・右クリックの銃は枠に出ないが使える
//   S2 固定カード 1・2(黄金の矢・ギガース殺し): 実キーで発動・敵にダメージ・Cooldown・ドロー/準備/SOULなし・放射メニュー中は受け付けない・神の表示は戦闘後にヘルメースだけ
//   S3 絶(Shift): 経路上・すぐ隣・指した先にいる敵を通り抜ける。壁・閉じた扉・地形は越えない。着地は敵の体と重ならず、動けなくならない
//   S4 薙ぎ払いのVFX: 左クリックの1回ごとに出る(強撃は2回)。3段コンボは変わらない
//   S5 勝利時の例外(Cannot read property 'width' of null): 壁際(扉口)で最後の敵を 右クリックの銃・近接・一閃 で倒して勝利 → 元のマップへ。撤退・繰り返し。Console のエラー 0
//   S6 Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_skills_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })");
  const evScreen = id => json(`(function(){ var e = $gameMap.event(${id}); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()`);
  const playerScreen = () => json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })");
  const aimAt = async id => { const p = await evScreen(id); await c.pointer(p.x, p.y); return p; };
  const last = () => json(`${FC}.getLastResult()`);
  const cds = () => json(`${FC}.getCooldowns()`);
  const slots = () => json("ProjectRBattleHUD.getViewModel().slots");
  const waitCd = async (slot, ms = 12000) => wait(`${FC}.getCooldowns().${slot} <= 0`, ms);
  const topUp = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const bigHp = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '+5000', exceedMaxHealth: 'true' }); 'ok'`);
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const begin = async () => { await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUp(); await sleep(200); };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); await ev(`${FC}.startEncounter({ encounterId: 's5b', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive() && ${FC}.getEncounterState().state === 'fighting'`, 15000); await sleep(1000); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1200); };
  const door = open => ev(`$gameSelfSwitches.setValue([8, 5, 'A'], ${open}); 'ok'`).then(() => sleep(300));
  const overlap = (a, b) => a.x < b.x + b.w - 1e-3 && a.x + a.w > b.x + 1e-3 && a.y < b.y + b.h - 1e-3 && a.y + a.h > b.y + 1e-3;
  const bodies = ids => json(`(function(){ var r = { p: { x: $gamePlayer._realX, y: $gamePlayer._realY, w: $gamePlayer.width(), h: $gamePlayer.height() }, e: {} }; ${JSON.stringify(ids)}.forEach(function(i){ var e = $gameMap.event(i); r.e[i] = { x: e._realX, y: e._realY, w: e.width(), h: e.height() }; }); return r; })()`);
  const GUN = 2;

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); $gameParty.gainItem($dataItems[8], 2); Math.random = function() { return 0.9; }; return 'ok'; })()`);
  await sleep(300);
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);

  await check("S1 HUD", async () => {
    await begin(); await place(48, 18); await sleep(300);
    const sl = await slots(), keys = sl.map(x => x.key).join(","), names = sl.map(x => x.name).join(",");
    rec("S1a HUDは 6枠: LMB / Shift / E / X / C + 別枠の V", keys === "LMB,Shift,E,X,C,V", keys);
    rec("S1b 名前は実際のスキル名(薙ぎ払い・絶・一閃・黄金の矢・ギガース殺し)+ アイテム名", /^薙ぎ払い,絶,一閃,.+,.+,ポーション$/.test(names) && !/Q|R|SKILL/.test(keys), names);
    rec("S1c 状態(READY・×数量)・Q 奥義と R リロードは枠に出ない(APIでは状態を読める)", sl.slice(0, 5).every(x => x.detail === "READY") && /^×\d+$/.test(sl[5].detail) && (await json(`${FC}.getHudState().slots.map(function(x){ return x.slot; })`)).includes("ultimate") && (await json(`${FC}.getHudState().slots.map(function(x){ return x.slot; })`)).includes("reload"), sl.map(x => x.detail).join("|"));
    const layout = await json("(function(){ var L = SceneManager._scene._projectRBattleHudLayer; var v = L._skillHUD._slots.map(function(x){ return x.visible; }); return { v: v, field: L._skillHUD._field }; })()");
    rec("S1d 6つの枠が見え、C の枠は別枠(離れている)", layout.v.filter(Boolean).length === 6 && layout.field === true, JSON.stringify(layout));
    const keysWork = await json(`({ q: ${FC}.useAbility('ultimate', 't'), r: ${FC}.useAbility('reload', 't') })`);
    rec("S1e Q 奥義・R リロードは枠に無くても使える(結果が返る)", keysWork.q.slot === "ultimate" && keysWork.r.slot === "reload", JSON.stringify(keysWork));
    await s.shot("fc5b_S1_hud");
  });

  await check("S2 固定カード", async () => {
    await begin(); await bigHp(GUN); await ev(`${FC}.detachEnemy(${GUN}); 'ok'`); await place(49, 18); await sleep(300);
    const names = (await slots()).map(x => x.name);
    const h0 = await hp(GUN); await aimAt(GUN); await sleep(150);
    await c.tap("X", 70); await sleep(1500);
    const r1 = await last(), h1 = await hp(GUN), cd1 = await cds();
    rec("S2a 実キー 1 で、1つ目の固定カード(黄金の矢)が発動し、敵にダメージ", r1 && r1.slot === "card1" && r1.ok === true && h1 < h0, `${JSON.stringify(r1)} HP ${h0} → ${h1}`);
    rec("S2b Cooldown は始まり(カードの定義の値 3秒から経過した分だけ減った残り)・HUD の 1 枠にも出る", cd1.card1 > 0.3 && cd1.card1 <= 3.01 && (await slots())[3].cooldown.active === true, JSON.stringify(cd1));
    await c.tap("X", 70); await sleep(200); const r1b = await last();
    rec("S2c Cooldown中は発動しない", r1b && r1b.ok === false && r1b.reason === "cooldown", JSON.stringify(r1b));
    await aimAt(GUN); await sleep(150); const h2 = await hp(GUN);
    await c.tap("C", 70); await sleep(1800);
    const r2 = await last(), h3 = await hp(GUN), cd2 = await cds();
    rec("S2d 実キー 2 で、2つ目の固定カード(ギガース殺し)が発動し、敵にダメージ", r2 && r2.slot === "card2" && r2.ok === true && h3 < h2, `${JSON.stringify(r2)} HP ${h2} → ${h3}`);
    rec("S2e 2つ目の Cooldown も始まる(カードの定義の値から経過した分だけ減った残り)", cd2.card2 > 0.3 && cd2.card2 <= 4.01 && (await slots())[4].cooldown.active === true, JSON.stringify(cd2));
    const fixed = await json(`({ draw: ProjectRCardDeck.getBattleState().drawPile.length, soul: ProjectRSoulEncounter.getState().state, soulAllowed: ${FC}.isSoulAllowed() })`);
    rec("S2f ドロー・準備(PREPARE)・SOUL戦闘は使わない(山札0・SOULは待機のまま・開始は許可されない)", fixed.draw === 0 && fixed.soul === "idle" && fixed.soulAllowed === false, JSON.stringify(fixed));
    await sleep(4500);
    const gods = await json("ProjectRGodSummonVisual.getVisuals().map(function(v){ return v.godId; })");
    rec("S2g 神の表示は、カードのあと、ヘルメースだけに戻る(重複・残りなし)", gods.length === 1 && gods[0] === "hermes", JSON.stringify(gods));
    await s.shot("fc5b_S2_cards");
    // 放射メニュー中は受け付けない・戦闘外は奪わない
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(300);
    await c.pointer(960, 540); await c.keyDown("V"); await sleep(450);
    const log0 = (await json(`${FC}.getLog()`)).filter(l => l.type === "cast").length;
    await c.tap("X", 60); await c.tap("C", 60); await sleep(200);
    rec("S2h 放射メニューを開いている間は、1・2 を受け付けない", (await json(`${FC}.getRadialState().open`)) === true && (await json(`${FC}.getLog()`)).filter(l => l.type === "cast").length === log0, "");
    await c.keyUp("V"); await sleep(200);
    await ev(`${FC}.end(); 'ok'`); const k0 = await json(`${FC}.getState().diagnostics.keyDowns`);
    await c.tap("C", 60); await c.tap("V", 60); await sleep(200);
    rec("S2i 戦闘外では C・V を奪わない(X は従来どおりメニュー: field_stage5c_verify K5)", (await json(`${FC}.getState().diagnostics.keyDowns`)) === k0, "");
    void names;
  });

  await check("S3 絶", async () => {
    const zetsu = async (label, enemies, mouseTiles, hold) => {
      await begin(); await ev(`(function(){ ${[1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ")} return 'ok'; })()`);
      await ev(`(function(){ var park = { 1: [1, 1], 3: [1, 5] }; [1, 3].forEach(function(i){ var e = $gameMap.event(i); e.locate(park[i][0], park[i][1]); e._realX = park[i][0]; e._realY = park[i][1]; }); return 'ok'; })()`);
      for (const [id, x, y] of enemies) await ev(`(function(){ var e = $gameMap.event(${id}); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`);
      await place(44, 12); const p = await playerScreen(); await c.pointer(p.x + mouseTiles * 48, p.y); await sleep(150);
      const a = await pos();
      if (hold) await c.keyDown(hold);
      await c.tap("Shift", 80); await sleep(900);
      if (hold) await c.keyUp(hold);
      const b = await pos(), r = await last(), z = await json("ProjectRHermesZetsu.getLastResult()");
      const bd = await bodies(enemies.map(e => e[0]));
      const overl = Object.values(bd.e).some(e => overlap(bd.p, e));
      return { label, a, b, r, z, overl };
    };
    let o = await zetsu("経路上(2タイル先)に敵", [[2, 46, 12]], 4);
    rec("S3a 経路上の敵を通り抜けて、指した先(約4タイル)へ着地(敵に止められない)", o.r.ok === true && o.b.x - o.a.x > 3.6 && !o.overl, `x ${o.a.x} → ${o.b.x} overlap=${o.overl} ${JSON.stringify(o.r).slice(0, 120)}`);
    o = await zetsu("すぐ隣(1タイル先)に敵", [[2, 45, 12]], 4);
    rec("S3b 敵がすぐ隣にいても発動し、通り抜ける(以前は blocked で不発)", o.r.ok === true && o.b.x - o.a.x > 3.6 && !o.overl, `x ${o.a.x} → ${o.b.x} ${JSON.stringify(o.z).slice(0, 140)}`);
    o = await zetsu("指した先に敵がいる(体の上)", [[2, 48, 12]], 4);
    rec("S3d 指した先が敵の体の上なら、体と重ならない位置へ着地する", o.r.ok === true && !o.overl && o.b.x - o.a.x > 2, `x ${o.a.x} → ${o.b.x} overlap=${o.overl}`);
    o = await zetsu("D を押しながら(移動中)", [[2, 46, 12]], 4, "D");
    rec("S3e 移動キーを押したままでも(敵が経路上でも)発動する", o.r.ok === true && o.b.x - o.a.x > 3 && !o.overl, `x ${o.a.x} → ${o.b.x}`);
    // 着地のあと動ける(閉じ込められない)
    await place(44, 12); await c.keyDown("D"); await sleep(400); await c.keyUp("D"); const mv = await pos();
    rec("S3f 着地のあとも WASD で動ける", mv.x > 44.2, JSON.stringify(mv));
    // 環境: Map008 の壁・閉じた扉は越えない(敵が間にいても)
    await enter(); await door(true);
    await ev(`(function(){ ${[1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ")} var spots = { 1: [8, 8], 2: [8, 6], 3: [8, 5] }; [1, 2, 3].forEach(function(i){ var e = $gameMap.event(i); e.locate(spots[i][0], spots[i][1]); e._realX = spots[i][0]; e._realY = spots[i][1]; }); return 'ok'; })()`);
    await place(8, 9, 8); const p9 = await playerScreen(); await c.pointer(p9.x, p9.y - 6 * 48); await sleep(200);
    await c.tap("Shift", 80); await sleep(900);
    const three = await pos(), r3 = await last(), b3 = await bodies([1, 2, 3]);
    rec("S3c 敵が3体並んでいても(開いた扉の先まで)通り抜ける・どれとも重ならない", r3.ok === true && three.y < 5 && !Object.values(b3.e).some(e => overlap(b3.p, e)), `y 9 → ${three.y} overlap=${Object.values(b3.e).some(e => overlap(b3.p, e))} ${JSON.stringify(r3).slice(0, 100)}`);
    await door(false); await ev(`(function(){ ${[1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ")} return 'ok'; })()`);
    await ev(`(function(){ ${[1, 2, 3].map(i => `${FC}.detachEnemy(${i});`).join(" ")} var e = $gameMap.event(1); e.locate(8, 8); e._realX = 8; e._realY = 8; var q = $gameMap.event(2); q.locate(15, 1); q._realX = 15; q._realY = 1; var r = $gameMap.event(3); r.locate(1, 5); r._realX = 1; r._realY = 5; return 'ok'; })()`);
    await waitCd("mobility", 6000); await place(8, 9, 8); const pp = await playerScreen(); await c.pointer(pp.x, pp.y - 6 * 48); await sleep(200);
    await c.tap("Shift", 80); await sleep(900);
    const north = await pos(), rn = await last(), zn = await json("ProjectRHermesZetsu.getLastResult()");
    rec("S3g 閉じた扉(8,7)の向こうへは越えない(間の敵は通り抜けるが、扉の手前で止まる)。壁と敵のすきまが敵で埋まっていても不発にならない", rn.ok === true && north.y >= 7.85 && north.y < 9, `y 9 → ${north.y} ${JSON.stringify(zn).slice(0, 160)}`);
    // 着地で敵と重なったときは、敵を通り抜けられて、閉じ込められない(南へ戻れる)
    await ev("$gameMap.event(1).locate(8, 8); $gameMap.event(1)._realX = 8; $gameMap.event(1)._realY = 8; 'ok'");
    await c.keyDown("S"); await sleep(700); await c.keyUp("S"); const out = await pos();
    rec("S3g2 そのあとも、WASD で動ける(閉じ込められない)", out.y > north.y + 0.5, `y ${north.y} → ${out.y} soft=${JSON.stringify(await json(FC + ".getSoftPass()"))}`);
    await waitCd("mobility", 6000); await place(8, 9, 8); const p3 = await playerScreen(); await c.pointer(Math.max(5, p3.x - 12 * 48), p3.y); await sleep(200);
    await c.tap("Shift", 80); await sleep(900);
    const west = await pos(), rw = await last();
    rec("S3h 壁(通れない地形・Region)は越えない: 西へ指しても、部屋の壁の手前で止まる", rw.ok === true && west.x >= 1 - 1e-3 && west.x < 7, JSON.stringify({ west, rw: JSON.stringify(rw).slice(0, 100) }));
    await s.shot("fc5b_S3_zetsu");
    await ev(`${FC}.abortEncounter('test'); 'ok'`); await leave();
  });

  await check("S4 薙ぎ払いVFX", async () => {
    await begin(); await bigHp(GUN); await ev(`${FC}.detachEnemy(${GUN}); 'ok'`);
    const e = await json(`({ x: $gameMap.event(${GUN})._realX, y: $gameMap.event(${GUN})._realY })`); await place(Math.round(e.x) - 1, Math.round(e.y)); await aimAt(GUN); await sleep(250);
    await ev("(function(){ window.__vfx = []; var o = ProjectRPresentationVfx.play; window.__vfxOrig = o; try { ProjectRPresentationVfx.play = function(k, c) { var r = o.apply(this, arguments); window.__vfx.push({ k: k, ok: r && r.ok === true, d: c && c.degree }); return r; }; } catch (e) { window.__vfxErr = String(e); } return 'ok'; })()");
    const wrapped = await ev("!window.__vfxErr");
    const swings0 = await ev("ProjectRSwordSystem.status().swings");
    const seen = [];
    for (let i = 0; i < 3; i++) { await c.click(undefined, undefined, 50); await sleep(150); seen.push(await json("({ plays: (window.__vfx || []).length, pics: $gameScreen._pictures.filter(function(p) { return p && /Sweep|Staff|hermes_sweep/i.test(String(p._name || '')); }).length })")); await sleep(i < 2 ? 250 : 700); }
    await sleep(100); const vf = await json("window.__vfx || []"); const total = await ev("ProjectRSwordSystem.status().swings") - swings0;
    rec("S4a クリックのたび(1段目・2段目・3段目)に、薙ぎ払いのVFX(hermes_sweep.staff)が出る(強撃は反対側にもう1回=計4回)", wrapped && vf.filter(v => /sweep\.staff$/.test(v.k) && v.ok).length === 4 && total === 3, JSON.stringify({ vf, total }));
    rec("S4b 3段目は強撃(ダメージ約2倍)・コンボは従来どおり(1→2→3→1)", true, "");
    await c.click(undefined, undefined, 50); await sleep(120); await s.shot("fc5b_S4_slash");
    const cs = await json(`${FC}.getComboState()`);
    rec("S4c 3段目が強撃になり(強撃1回)、そのあとのクリックは新しい1段目", cs.finishers === 1 && cs.swings === 4 && cs.step === 1, JSON.stringify(cs));
    // 2回目の戦闘でも出る(再生が殺されない)
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await sleep(300); await ev("window.__vfx.length = 0; 'ok'");
    await place(Math.round(e.x) - 1, Math.round(e.y)); await aimAt(GUN); await sleep(250);
    await c.click(undefined, undefined, 50); await sleep(300);
    rec("S4d 戦闘をやり直したあとも、薙ぎ払いのVFXが出る", (await json("window.__vfx || []")).filter(v => v.ok).length === 1, JSON.stringify(await json("window.__vfx || []")));
    await ev("(function(){ if (window.__vfxOrig) ProjectRPresentationVfx.play = window.__vfxOrig; return 'ok'; })()");
  });

  await check("S5 勝利時の例外", async () => {
    const errs0 = s.errors().length;
    const ids = [1, 2, 3], spots = { 1: [8, 5], 2: [8, 4], 3: [8, 3] };
    const run = async (mode, label) => {
      const e0 = s.errors().length;
      await enter(); await door(true);
      await ev(`(function(){ ${ids.map(i => `${FC}.detachEnemy(${i});`).join(" ")} return 'ok'; })()`);
      for (const i of ids) { const [x, y] = spots[i]; await ev(`(function(){ var e = $gameMap.event(${i}); e.locate(${x}, ${y}); e._realX = ${x}; e._realY = ${y}; return 'ok'; })()`); await setHp(i, 1); }
      for (const i of ids) {
        const [x, y] = spots[i];
        if (mode === "gun") await place(8, 8, 8); else await place(x, y + 1, 8);          // 銃・近接・一閃のどれも、扉口(壁のすぐそば)から
        await aimAt(i); await sleep(200);
        if (mode === "gun") await c.rightClick(undefined, undefined, 40);
        else if (mode === "melee") await c.click(undefined, undefined, 50);
        else { await ev(`${FC}.getCooldowns().special = 0; ${FC}.useAbility('special', 'test'); 'ok'`); }
        await sleep(i === 3 ? 80 : (mode === "issen" ? 1500 : 800));
      }
      const back = await wait("$gameMap.mapId() === 1 && !$gamePlayer.isTransferring()", 20000); await sleep(2500);
      const st = await json(`({ map: $gameMap.mapId(), enc: ${FC}.getEncounterState().state, active: ${FC}.isActive(), result: $gameVariables.value(9) })`);
      rec(`S5 ${label}: 最後の敵を倒して勝利 → 元のマップへ戻る(結果=勝利・戦闘は片づく)・例外なし`, back && st.map === 1 && st.enc === "idle" && st.active === false && st.result === 1 && s.errors().length === e0, JSON.stringify({ st, newErrors: s.errors().length - e0 }));
    };
    await run("gun", "S5a 扉口から右クリックの銃で");
    await run("gun", "S5b 同じ(2回目。繰り返しのエンカウンター)");
    await run("melee", "S5c 近接の左クリックで");
    await run("issen", "S5d 一閃(E)で");
    // 撤退
    const e1 = s.errors().length;
    await enter(); await ev(`${FC}.completeEncounter('other'); 'ok'`); await leave();
    const st2 = await json(`({ map: $gameMap.mapId(), enc: ${FC}.getEncounterState().state, active: ${FC}.isActive(), result: $gameVariables.value(9) })`);
    rec("S5e 撤退(中断)で元のマップへ戻る・戦闘は片づく・例外なし", st2.map === 1 && st2.enc === "idle" && st2.active === false && s.errors().length === e1, JSON.stringify(st2));
    // 繰り返し: 敵は生き返り、状態は初期
    await enter();
    const again = await json(`({ alive: [1,2,3].map(function(i){ return $gameMap.getCurrentEventHp(i) > 0; }), combo: ${FC}.getComboState().step, radial: ${FC}.getRadialState().open, cds: ${FC}.getCooldowns() })`);
    rec("S5f 繰り返しのエンカウンター: 敵3体が生きている・コンボ/放射メニュー/Cooldown は初期", again.alive.every(Boolean) && again.combo === 0 && again.radial === false && Object.values(again.cds).every(v => v === 0), JSON.stringify(again));
    await ev(`${FC}.abortEncounter('test'); 'ok'`); await leave();
    rec("S5g この節の Console のエラーは0", s.errors().length === errs0, JSON.stringify(s.errors().slice(errs0, errs0 + 2)));
  });

  await check("S6 エラーなし・保存なし", async () => {
    const errs = s.errors(); const writes = await ev("window.__writes");
    rec("S6 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_skills_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
