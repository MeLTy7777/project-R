// フィールド戦闘 Stage 5(操作の再設計)の実機(Playtest)確認。CDP の実際のキー・マウス(左クリック・右クリック・Q/E/R/C/Shift)だけで操作する。
//   K1  HUD: Q 奥義 / Shift 絶 / E 一閃 / R リロード / C アイテム(実際のキー名・状態)・操作ガイド・SKILL 表示なし
//   K2  左クリック: 近接3段コンボ(1クリック=1回の斬撃。1→2→3段目の強撃(ダメージ約2倍)→1段目へ戻る)
//   K3  押しっぱなし: 左ボタンを1.5秒押し続けても、斬撃は1回だけ(自動で進まない)
//   K4  コンボの受付時間: 1.1秒あけると1段目へ戻る
//   K5  右クリック: 銃(1クリック=1発・弾薬が減る・照準した敵に当たる)。右クリックメニュー・マップのメニューは出ない
//   K6  R: リロード(既存の銃の仕組み。満タンなら何も起きない)
//   K7  Q: 奥義(実際のゲージ。満タンでなければ発動しない)
//   K8  Shift: 絶(マウスの方向へ瞬間移動・Cooldown 3秒)。戦闘中は Shift のダッシュが無効
//   K9  E: 一閃(照準した敵にダメージ・Cooldown 7秒)
//   K10 C: 短押し=アイテムを使う / 長押し=放射メニュー(マウスの方向で選び、離すと選ぶ(使わない)・取り消し・アイテムなし・持ち物の変化・会話で閉じる・開いている間の入力の衝突)
//   K11 解像度: 720p / 1080p / 1440p で、HUD(スキル枠・操作ガイド・放射メニュー)が画面に収まり、重ならない。スクリーンショット
//   K12 戦闘外: 戦闘の入力は無効(左・右クリック・Q/E/R/C/Shift)。HUD・Shift のダッシュは従来のまま
//   K13 繰り返し: 戦闘ごとにコンボ・放射メニュー・キーの状態が初期へ戻る
//   K14 Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_controls_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", GUNAPI = "ProjectRGunSystem", SWORD = "ProjectRSwordSystem";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const hp = id => ev(`$gameMap.getCurrentEventHp(${id})`);
  const ph = () => ev("$gameParty.leader().hp");
  const pos = () => json("({ x: $gamePlayer._realX, y: $gamePlayer._realY, d: $gamePlayer.direction() })");
  const place = async (x, y) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const enemyScreen = id => json(`(function() { var e = $gameMap.event(${id}); return { x: Math.round(e.screenX()), y: Math.round(e.screenY() - 24) }; })()`);
  const playerScreen = () => json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })");
  const aimAt = async id => { const p = await enemyScreen(id); await c.pointer(p.x, p.y); return p; };
  const last = () => json(`${FC}.getLastResult()`);
  const cds = () => json(`${FC}.getCooldowns()`);
  const topUpPlayer = () => ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
  const waitCd = async (slot, ms = 12000) => wait(`${FC}.getCooldowns().${slot} <= 0`, ms);
  const bigHp = id => ev(`PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: '+5000', exceedMaxHealth: 'true' }); 'ok'`);
  const swings = () => ev(`${SWORD}.status().swings`);
  const gun = () => json(`${GUNAPI}.status()`);
  const combo = () => json(`${FC}.getComboState()`);
  const radial = () => json(`${FC}.getRadialState()`);
  const slots = () => json("ProjectRBattleHUD.getViewModel().slots");
  const itemCount = id => ev(`$gameParty.numItems($dataItems[${id}])`);
  const GUN = 2;                // Map001の公式銃テスト敵(52,18。<enemy> つき = 武器が当たる既存の敵)

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 6); $gameParty.gainItem($dataItems[8], 2); $gameParty.gainItem($dataItems[15], 1); Math.random = function() { return 0.9; }; return 'ok'; })()`);
  await sleep(300);
  await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);                // このスクリプトは、操作・HUDの確認(探索マップでの許可=DEV)。エンカウンターの入口は field_encounter_verify.cjs
  await ev("window.__ctx = []; document.addEventListener('contextmenu', function(e) { window.__ctx.push(e.defaultPrevented); }, false); 'ok'");
  const weapon = await json(`({ gun: ${GUNAPI}.status(), weapon: ($gameParty.leader().equips()[0] || {}).name })`);
  console.log("weapon", JSON.stringify(weapon));

  const begin = async () => { await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer(); await sleep(200); };
  const meleePlace = async () => { const e = await json(`({ x: $gameMap.event(${GUN})._realX, y: $gameMap.event(${GUN})._realY })`); await place(Math.round(e.x) - 1, Math.round(e.y)); await aimAt(GUN); await sleep(250); };

  await check("K1 HUD", async () => {
    rec("K0 銃を装備している(RMB の確認ができる)", weapon.gun && weapon.gun.equipped === true && weapon.gun.ammo > 0, JSON.stringify(weapon));
    await begin(); await bigHp(GUN); await ev(`${FC}.detachEnemy(${GUN}); 'ok'`); await place(48, 18); await sleep(400);
    const sl = await slots(), keys = sl.map(x => x.key).join(","), names = sl.map(x => x.name).join(",");
    rec("K1a HUDは、メイン5枠 LMB / Shift / E / X / C + 別枠の V(Q 奥義・R リロードは枠に出ない)", keys === "LMB,Shift,E,X,C,V", keys + " / " + names);
    rec("K1b 名前: 薙ぎ払い / 絶 / 一閃 / (固定カード2枚)/ (アイテム名)", /^薙ぎ払い,絶,一閃,.+,.+,.+$/.test(names), names);
    rec("K1c SKILL 表示・DRAW/DISCARD 表示は出ない", !JSON.stringify(sl).includes("SKILL") && (await json("ProjectRBattleHUD.getViewModel().counts")) === null, "");
    rec("K1d C はアイテム枠(別の枠・選んでいるアイテムのアイコン・数量)", sl[5].accent === "item" && sl[5].iconIndex > 0 && /^×\d+$/.test(sl[5].detail), JSON.stringify({ d: sl[5].detail, icon: sl[5].iconIndex }));
    rec("K1e 状態の表示(READY・数量)", sl.slice(0, 5).every(x => x.detail === "READY") && /^×\d+$/.test(sl[5].detail), sl.map(x => x.detail).join(" | "));
    const guide = await json("(function() { var L = SceneManager._scene._projectRBattleHudLayer; return { visible: L._fieldGuideHUD.visible, field: L._skillHUD._field, mgr: L.visible }; })()");
    rec("K1f 操作ガイド(LMB コンボ / RMB 射撃)が出て、スキル枠の並びが field 用", guide.visible === true && guide.field === true && guide.mgr === true, JSON.stringify(guide));
    await s.shot("fc5_K1_hud_1080");
  });

  await check("K2 左クリック=近接3段コンボ", async () => {
    await begin(); await bigHp(GUN); await meleePlace();
    const out = [];
    for (let i = 0; i < 3; i++) {
      const h0 = await hp(GUN), n0 = await swings(); await c.click(undefined, undefined, 50); await sleep(420);
      out.push({ step: i + 1, dmg: h0 - (await hp(GUN)), swings: (await swings()) - n0, combo: (await combo()).step, last: (await combo()).last });
    }
    const cs = await combo();
    rec("K2a クリック1回につき斬撃は1回(3回クリックして3回)", out.every(o => o.swings === 1), JSON.stringify(out.map(o => [o.step, o.swings])));
    rec("K2b 1段目・2段目は通常のダメージ(同じ・0より大きい)", out[0].dmg > 0 && out[1].dmg === out[0].dmg, JSON.stringify(out.map(o => o.dmg)));
    rec("K2c 3段目は強撃(ダメージ約2倍)", out[2].dmg >= out[0].dmg * 2 - 1 && out[2].dmg <= out[0].dmg * 2 + 1, JSON.stringify(out.map(o => o.dmg)));
    rec("K2d 段の進み 1 → 2 → (3段目のあと)0 に戻る / 強撃の回数 1", out[0].combo === 1 && out[1].combo === 2 && out[2].combo === 0 && cs.finishers === 1, JSON.stringify({ steps: out.map(o => o.combo), finishers: cs.finishers }));
    rec("K2e 実際の段(last.step)が 1,2,3", out.map(o => o.last && o.last.step).join() === "1,2,3", out.map(o => o.last && o.last.step).join());
    await sleep(650);
    const n1 = await swings(); await c.click(undefined, undefined, 50); await sleep(400);
    rec("K2f 3段目のあと、次のクリックは新しい1段目", (await swings()) - n1 === 1 && (await combo()).step === 1, JSON.stringify(await combo()));
    // 斬撃の間隔の内(3段目の硬直)のクリックは出ない・段を進めない
    await sleep(700); await c.click(undefined, undefined, 40); await sleep(60); const c2 = await combo(); const n2 = await swings(); await c.click(undefined, undefined, 40); await sleep(80); const n3 = await swings();
    rec("K2g 間隔(18フレーム)の内の連打は、斬撃を増やさず段も進めない", n3 - n2 === 0 && (await combo()).step === c2.step, JSON.stringify({ n2, n3, c2: c2.step, c3: (await combo()).step }));
    await s.shot("fc5_K2_combo");
  });

  await check("K3 押しっぱなし", async () => {
    await begin(); await bigHp(GUN); await meleePlace(); await sleep(700);
    const n0 = await swings(), st0 = (await combo()).swings;
    await c.mouseDown("left"); await sleep(1500); await c.mouseUp("left"); await sleep(300);
    const n1 = await swings();
    rec("K3a 左ボタンを1.5秒押し続けても、斬撃は1回だけ(自動で進まない)", n1 - n0 === 1 && (await combo()).swings - st0 === 1, JSON.stringify({ n0, n1 }));
  });

  await check("K4 コンボの受付時間", async () => {
    await begin(); await bigHp(GUN); await meleePlace();
    await c.click(undefined, undefined, 50); await sleep(450); await c.click(undefined, undefined, 50); await sleep(100);
    rec("K4a 2回目のクリックで2段目", (await combo()).step === 2, JSON.stringify(await combo()));
    await sleep(1100);
    const cs = await combo();
    rec("K4b 受付時間(0.8秒)を過ぎると1段目へ戻る", cs.step === 0 && cs.resets >= 1, JSON.stringify(cs));
    await c.click(undefined, undefined, 50); await sleep(150);
    rec("K4c 次のクリックは1段目", (await combo()).last.step === 1, JSON.stringify((await combo()).last));
  });

  await check("K5 右クリック=銃", async () => {
    await begin(); await bigHp(GUN); await place(48, 18); await sleep(300);
    await ev("window.__ctx.length = 0; 'ok'");
    const h0 = await hp(GUN), g0 = await gun(), n0 = await swings();
    await aimAt(GUN); await sleep(150); await c.rightClick(undefined, undefined, 60); await sleep(900);
    const h1 = await hp(GUN), g1 = await gun();
    rec("K5a 右クリック1回で銃が1発(弾薬が1減る)・斬撃は出ない", g1.shots - g0.shots === 1 && g1.ammo === g0.ammo - 1 && (await swings()) === n0, JSON.stringify({ shots: [g0.shots, g1.shots], ammo: [g0.ammo, g1.ammo] }));
    rec("K5b 照準した敵(4 tile 先)に当たってHPが減る", h1 < h0, `HP ${h0} → ${h1}`);
    await c.pointer((await playerScreen()).x - 300, (await playerScreen()).y); await sleep(250);
    await c.rightClick(undefined, undefined, 60); await sleep(900);
    rec("K5c 反対側へ撃つと当たらない(自動照準なし)", (await hp(GUN)) === h1, `HP ${h1} → ${await hp(GUN)}`);
    const menu = await json("({ scene: SceneManager._scene.constructor.name, ctx: window.__ctx })");
    rec("K5d 右クリックメニュー(contextmenu)は出ない・マップのメニューも開かない", menu.scene === "Scene_Map" && menu.ctx.length >= 1 && menu.ctx.every(x => x === true), JSON.stringify(menu));
    await waitCd("consumable", 100); await sleep(500);
    const g2 = await gun(); await c.mouseDown("right"); await sleep(1500); await c.mouseUp("right"); await sleep(300); const g3 = await gun();
    rec("K5e 右ボタンを1.5秒押し続けても、1発だけ", g3.shots - g2.shots === 1, JSON.stringify({ g2: g2.shots, g3: g3.shots }));
    await aimAt(GUN); await c.click(undefined, undefined, 50); await sleep(400);
    rec("K5f 左クリックは銃を撃たない(近接)", (await gun()).shots === g3.shots, "");
  });

  await check("K6 R リロード", async () => {
    await begin(); await place(48, 18); await sleep(300); await aimAt(GUN);
    const g0 = await gun();
    if (g0.ammo >= g0.capacity) { await c.rightClick(undefined, undefined, 50); await sleep(400); await c.rightClick(undefined, undefined, 50); await sleep(500); }
    const g1 = await gun();
    await c.tap("R"); await sleep(200);
    const mid = await json(`({ reloading: ${GUNAPI}.isReloading(), r: ${FC}.getLastResult(), hud: ${FC}.getHudState().slots.filter(function(x) { return x.slot === "reload"; })[0].state })`);
    rec("K6a R でリロードが始まる(状態 reloading)", g1.ammo < g1.capacity && mid.reloading === true && mid.r.ok === true && mid.r.slot === "reload" && mid.hud === "reloading", JSON.stringify({ g1: [g1.ammo, g1.capacity], mid }));
    await sleep(900);
    const g2 = await gun();
    rec("K6b リロード後、弾薬が満タン・ストックが減る", g2.ammo === g2.capacity && g2.reserve < g1.reserve && g2.reloading === false, JSON.stringify({ before: [g1.ammo, g1.reserve], after: [g2.ammo, g2.reserve] }));
    await c.tap("R"); await sleep(300);
    const r = await last();
    rec("K6c 満タンなら何も起きない(magazineFull)", r && r.ok === false && r.reason === "magazineFull" && (await gun()).reloading === false, JSON.stringify(r));
    rec("K6d リロードはCooldownを使わない", (await json(`${FC}.getCooldowns()`)).reload === undefined, "");
  });

  await check("K7 Q 奥義", async () => {
    await begin(); await bigHp(GUN); await place(51, 18); await sleep(300);
    await c.tap("Q"); await sleep(250);
    const r0 = await last();
    rec("K7a ゲージが満タンでなければ発動しない(gaugeNotFull)", r0 && r0.ok === false && r0.reason === "gaugeNotFull" && r0.slot === "ultimate", JSON.stringify(r0));
    await ev("ProjectRUltimateGauge.addUltimateGauge(100, 'fieldTest', 'fc5_fill'); 'ok'"); await sleep(250);
    const ready = (await json(`${FC}.getHudState().slots[0]`));
    rec("K7b 満タンなら奥義の状態が ready(枠には出さない。上のゲージが光る)", ready.slot === "ultimate" && ready.ready === true && ready.state === "ready", JSON.stringify({ s: ready.state, r: ready.ready }));
    await aimAt(GUN); await sleep(150); await c.tap("Q"); await sleep(900);
    const r1 = await last(), g = await ev("ProjectRUltimateGauge.getUltimateGauge()");
    rec("K7c Q で奥義が発動し、ゲージが0になる", r1 && r1.ok === true && g === 0, JSON.stringify(r1) + " gauge " + g);
    await sleep(3500);
  });

  await check("K8 Shift 絶", async () => {
    await begin(); await place(44, 12); await sleep(300);
    const a = await pos(), p = await playerScreen(); await c.pointer(p.x + 4 * 48, p.y); await sleep(200);
    await c.tap("Shift"); await sleep(700);
    const b = await pos(), cd = await cds(), r = await last();
    rec("K8a Shift でマウスの方向へ瞬間移動(約3tile)", r && r.ok === true && r.slot === "mobility" && b.x - a.x > 1.5, `x ${a.x.toFixed(2)} → ${b.x.toFixed(2)} ${JSON.stringify(r)}`);
    rec("K8b Cooldown 3秒", cd.mobility > 2 && cd.mobility <= 3, JSON.stringify(cd));
    await waitCd("mobility", 6000); await place(44, 12);
    await c.keyDown("D"); await c.keyDown("Shift"); await sleep(350);
    const dash = await json("({ dashing: $gamePlayer.isDashing(), button: $gamePlayer.isDashButtonPressed(), shift: Input.isPressed('shift') })");
    await c.keyUp("Shift"); await c.keyUp("D"); await sleep(200);
    rec("K8c 戦闘中は Shift のダッシュが無効(歩き続けても isDashing=false)", dash.dashing === false && dash.button === false, JSON.stringify(dash));
  });

  await check("K9 E 一閃", async () => {
    await begin(); await bigHp(GUN); await place(49, 18); await sleep(300);
    const h0 = await hp(GUN); await aimAt(GUN); await sleep(150); await c.tap("E"); await sleep(800);
    const r = await last(), h1 = await hp(GUN), cd = await cds();
    rec("K9a E で一閃が発動し、照準した敵にダメージ", r && r.ok === true && r.slot === "special" && h1 < h0, `${JSON.stringify(r)} HP ${h0} → ${h1}`);
    rec("K9b Cooldown 7秒(HUDにも出る)", cd.special > 6 && cd.special <= 7 && (await slots())[2].cooldown.active === true, JSON.stringify(cd));
    await c.tap("E"); await sleep(200);
    const r2 = await last(); rec("K9c Cooldown中は発動しない", r2 && r2.ok === false && r2.reason === "cooldown", JSON.stringify(r2));
  });

  await check("K10 C アイテム", async () => {
    await begin(); await place(44, 12); await sleep(300);
    // 短押し: 選んでいるアイテム(既定 = ポーション)を使う
    await ev("$gameParty.leader().setHp(100); 'ok'");
    const n0 = await itemCount(7); await c.tap("V", 80); await sleep(300);
    const r = await last(), h = await ph(), cd = await cds();
    rec("K10a C の短押しで、選んでいるポーションを1個使う(HP回復・個数-1)", r && r.ok === true && r.itemId === 7 && h > 100 && (await itemCount(7)) === n0 - 1, `${JSON.stringify(r)} HP ${h} 個数 ${n0} → ${await itemCount(7)}`);
    rec("K10b Cooldown 8秒(HUDのアイテム枠にも出る)", cd.consumable > 7 && cd.consumable <= 8 && (await slots())[5].cooldown.active === true, JSON.stringify(cd));
    await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("V", 80); await sleep(250);
    const r2 = await last(); rec("K10c Cooldown中は使えない", r2 && r2.ok === false && r2.reason === "cooldown", JSON.stringify(r2));
    await waitCd("consumable", 9500);
    // 長押し: 放射メニューが開く(0.3秒)
    await c.pointer(960, 540); await sleep(100);
    await c.keyDown("V"); await sleep(150); const early = await radial(); await sleep(300); const open = await radial();
    rec("K10d C の長押し: 0.15秒ではまだ開かず、0.45秒で放射メニューが開く(アイテムの一覧)", early.open === false && open.open === true && open.items.length >= 3, JSON.stringify({ early: early.open, open: open.open, items: open.items.map(i => [i.id, i.count]) }));
    await s.shot("fc5_K10_radial_open");
    const idx = open.items.findIndex(i => i.id === 8); const n = open.items.length;
    const flick = async (i, dist = 140) => { const rr = await radial(); const ang = -Math.PI / 2 + i * 2 * Math.PI / n; await c.pointer(rr.center.x + Math.cos(ang) * dist, rr.center.y + Math.sin(ang) * dist); await sleep(150); return radial(); };
    const hov = await flick(idx);
    rec("K10e マウスの方向のアイテムが光る(ハイポーション)", hov.hoverId === 8 && hov.index === idx, JSON.stringify({ hoverId: hov.hoverId, index: hov.index }));
    await s.shot("fc5_K10_radial_hover");
    const cnt = [await itemCount(7), await itemCount(8)];
    await c.keyUp("V"); await sleep(200);
    const afterSel = await radial();
    rec("K10f C を離すと選ぶ(メニューが閉じる・使わない・個数とCooldownは変わらない)", afterSel.open === false && afterSel.selectedId === 8 && (await itemCount(8)) === cnt[1] && (await itemCount(7)) === cnt[0] && (await cds()).consumable === 0, JSON.stringify({ sel: afterSel.selectedId, cd: await cds() }));
    rec("K10g HUDのアイテム枠が、選んだアイテムの表示になる", (await slots())[5].name === "ハイポーション" && (await slots())[5].iconIndex === (await ev("$dataItems[8].iconIndex")), JSON.stringify((await slots())[5]));
    await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("V", 80); await sleep(300);
    const r3 = await last();
    rec("K10h 短押しで、選んだハイポーションを使う", r3 && r3.ok === true && r3.itemId === 8 && (await itemCount(8)) === cnt[1] - 1, JSON.stringify(r3));
    await waitCd("consumable", 9500);
    // 動かさずに離す = 変えない
    await c.pointer(960, 540); await sleep(100); await c.keyDown("V"); await sleep(450); await c.keyUp("V"); await sleep(200);
    rec("K10i 動かさずに離すと、選んでいるアイテムは変わらない", (await radial()).selectedId === 8 && (await radial()).open === false, "");
    // 右クリックで取り消し(撃たない)
    const shots0 = (await gun()).shots;
    await c.pointer(960, 540); await sleep(100); await c.keyDown("V"); await sleep(450);
    let rr = await flick(0); await c.rightClick(undefined, undefined, 50); await sleep(200);
    const closedByRmb = (await radial()).open === false; await c.keyUp("V"); await sleep(200);
    rec("K10j 右クリックで取り消し(銃は撃たない・選択は変わらない)", closedByRmb && (await gun()).shots === shots0 && (await radial()).selectedId === 8, JSON.stringify({ shots0, shots: (await gun()).shots, sel: (await radial()).selectedId }));
    // 開いている間の入力の衝突
    await ev(`${FC}.end(); ${FC}.begin(); 'ok'`); await topUpPlayer(); await sleep(300);
    await c.pointer(960, 540); await sleep(100); await c.keyDown("V"); await sleep(450);
    const sw0 = await swings(), log0 = (await json(`${FC}.getLog()`)).filter(l => l.type === "cast").length, g0 = (await gun()).shots, rl0 = (await gun()).reloading;
    await c.click(undefined, undefined, 50); for (const k of ["Q", "E", "R", "Shift"]) await c.tap(k, 60); await sleep(250);
    const openStill = (await radial()).open;
    rec("K10k 開いている間は、左クリック・Q/E/R/Shift を受け付けない(斬撃・アビリティ・リロードなし)", openStill && (await swings()) === sw0 && (await json(`${FC}.getLog()`)).filter(l => l.type === "cast").length === log0 && (await gun()).reloading === rl0 && (await radial()).blocked >= 4, JSON.stringify({ blocked: (await radial()).blocked }));
    // 持ち物が変わる
    const items0 = (await radial()).items.length;
    await ev("$gameParty.gainItem($dataItems[9], 1); 'ok'"); await sleep(260);
    const items1 = (await radial()).items.length;
    await ev("$gameParty.loseItem($dataItems[9], 1); 'ok'"); await sleep(260);
    const items2 = (await radial()).items.length;
    rec("K10l 開いている間に持ち物が変わると、一覧が更新される(増える・減る)", items1 === items0 + 1 && items2 === items0, JSON.stringify([items0, items1, items2]));
    // 会話・メッセージで閉じる
    await ev("$gameMessage.add('テスト'); 'ok'"); await sleep(300);
    const closedMsg = (await radial()).open === false; await ev("$gameMessage.clear(); 'ok'"); await c.keyUp("V"); await sleep(300);
    rec("K10m メッセージが出たら、放射メニューは閉じる(選択は変わらない)", closedMsg && (await radial()).selectedId > 0, "");
    // アイテムなし
    const stock = {}; for (const id of [7, 8, 9, 15]) { stock[id] = await itemCount(id); if (stock[id] > 0) await ev(`$gameParty.loseItem($dataItems[${id}], ${stock[id]}); 'ok'`); }
    await c.pointer(960, 540); await sleep(100); await c.keyDown("V"); await sleep(450);
    const empty = await radial();
    rec("K10n アイテムが無くても放射メニューは開く(アイテムなし)", empty.open === true && empty.items.length === 0, JSON.stringify({ open: empty.open, n: empty.items.length }));
    await s.shot("fc5_K10_radial_empty");
    await c.keyUp("V"); await sleep(200);
    await c.tap("V", 80); await sleep(250); const rEmpty = await last();
    rec("K10o 在庫が無いと使えない(noItem)", rEmpty && rEmpty.ok === false && rEmpty.reason === "noItem", JSON.stringify(rEmpty));
    for (const id of [7, 8, 9, 15]) if (stock[id] > 0) await ev(`$gameParty.gainItem($dataItems[${id}], ${stock[id]}); 'ok'`);
    // 効果がない(HP満タン)なら使わない
    await ev(`${FC}.selectConsumable(7); 'ok'`); await topUpPlayer(); const n7 = await itemCount(7);
    await c.tap("V", 80); await sleep(250); const rFull = await last();
    rec("K10p HPが満タンなら使わない(noEffect・個数もCooldownも変わらない)", rFull && rFull.ok === false && rFull.reason === "noEffect" && (await itemCount(7)) === n7 && (await cds()).consumable === 0, JSON.stringify(rFull));
  });

  await check("K11 解像度", async () => {
    await begin(); await place(44, 12); await sleep(300);
    const orig = await json("({ w: Graphics.width, h: Graphics.height })");
    const bounds = () => json(`(function() { var L = SceneManager._scene._projectRBattleHudLayer; function b(s) { var r = s.getBounds(); return { l: Math.round(r.x), t: Math.round(r.y), r: Math.round(r.x + r.width), b: Math.round(r.y + r.height) }; } return { w: Graphics.width, h: Graphics.height, sx: L.scale.x, slots: L._skillHUD._slots.map(b), guide: b(L._fieldGuideHUD), radial: L._radialHUD.visible ? b(L._radialHUD) : null }; })()`);
    for (const [w, h] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
      await ev(`Graphics.resize(${w}, ${h}); 'ok'`); await sleep(900);
      await c.pointer(Math.round(w / 2), Math.round(h / 2)); await sleep(100);
      const b = await bounds();
      const inside = b.slots.every(x => x.l >= 0 && x.t >= 0 && x.r <= b.w && x.b <= b.h) && b.guide.l >= 0 && b.guide.r <= b.w;
      const gapOk = b.slots[5].l - b.slots[4].r >= 30 * b.sx;
      const noOverlap = b.guide.b <= Math.min(...b.slots.map(x => x.t)) + 1 && b.slots.every((x, i) => i === 0 || x.l >= b.slots[i - 1].r - 1);
      rec(`K11-${h}p-a ${w}x${h}: スキル枠・操作ガイドが画面に収まる`, inside, JSON.stringify({ slots: [b.slots[0].l, b.slots[5].r], guide: b.guide, w: b.w, h: b.h }));
      rec(`K11-${h}p-b ${w}x${h}: 重ならない(ガイド行と枠・枠どうし)・C のアイテム枠は離れている`, noOverlap && gapOk, JSON.stringify({ guideBottom: b.guide.b, slotTop: Math.min(...b.slots.map(x => x.t)), gap: b.slots[5].l - b.slots[4].r }));
      await s.shot(`fc5_K11_${h}p_hud`);
      await c.keyDown("V"); await sleep(450); await c.pointer(Math.round(w / 2) + 100, Math.round(h / 2) - 60); await sleep(200);
      const b2 = await bounds();
      rec(`K11-${h}p-c ${w}x${h}: 放射メニューが画面に収まる`, !!b2.radial && b2.radial.l >= -2 && b2.radial.t >= -2 && b2.radial.r <= b2.w + 2 && b2.radial.b <= b2.h + 2, JSON.stringify(b2.radial));
      await s.shot(`fc5_K11_${h}p_radial`);
      await c.keyUp("V"); await sleep(250);
    }
    await ev(`Graphics.resize(${orig.w}, ${orig.h}); 'ok'`); await sleep(600);
  });

  await check("K12 戦闘外", async () => {
    await ev(`${FC}.end(); ${FC}.setDevAllowOutsideEncounter(false); 'ok'`); await sleep(400);
    const vm = await json("ProjectRBattleHUD.getViewModel()");
    const k0 = await json(`${FC}.getState().diagnostics.keyDowns`), sw0 = await swings(), g0 = (await gun()).shots, r0 = await last();
    await c.pointer(1300, 400); await c.click(undefined, undefined, 50); await sleep(200); await c.rightClick(undefined, undefined, 50); await sleep(300);
    for (const k of ["Q", "E", "R", "C", "V", "Shift"]) await c.tap(k, 60);
    await sleep(300);
    rec("K12a 戦闘外では、戦闘の入力を受け取らない(キー・斬撃・銃)", (await json(`${FC}.getState().diagnostics.keyDowns`)) === k0 && (await swings()) === sw0 && (await gun()).shots === g0 && (await combo()).swings === 0, JSON.stringify({ k0, sw0, g0 }));
    const guide = await json("(function() { var L = SceneManager._scene._projectRBattleHudLayer; return { guide: L._fieldGuideHUD.worldVisible, radial: L._radialHUD.worldVisible, field: L._skillHUD._field && L.visible }; })()");
    rec("K12b 戦闘外では、HUDは従来の表示(field 用の枠・ガイド・放射メニューは出ない)", !(vm.slots[0] && vm.slots[0].mode === "field") && guide.guide === false && guide.radial === false && guide.field === false, JSON.stringify({ mode: vm.slots[0] && vm.slots[0].mode, guide }));
    await c.keyDown("D"); await c.keyDown("Shift"); await sleep(350);
    const dash = await json("({ pressed: Input.isPressed('shift'), button: $gamePlayer.isDashButtonPressed() })");
    await c.keyUp("Shift"); await c.keyUp("D"); await sleep(200);
    rec("K12c 戦闘外では Shift のダッシュが従来どおり(Shift を押している)", dash.pressed === true && dash.button === true, JSON.stringify(dash));
    await ev(`${FC}.setDevAllowOutsideEncounter(true); 'ok'`);
  });

  await check("K13 繰り返し", async () => {
    const out = [];
    for (let i = 0; i < 3; i++) {
      await begin(); await bigHp(GUN); await meleePlace();
      const start = await combo();
      await c.click(undefined, undefined, 50); await sleep(450); await c.click(undefined, undefined, 50); await sleep(100);
      await c.keyDown("V"); await sleep(450); const open = (await radial()).open;
      await ev(`${FC}.end(); 'ok'`); await sleep(200); await c.keyUp("V"); await sleep(100);
      const after = await json(`({ active: ${FC}.isActive(), radial: ${FC}.getRadialState().open, slotMode: ProjectRBattleHUD.getViewModel().slots[0] && ProjectRBattleHUD.getViewModel().slots[0].mode })`);
      out.push({ fresh: start.step === 0 && start.swings === 0, open, closed: after.radial === false && after.active === false && after.slotMode !== "field" });
    }
    rec("K13 3回繰り返しても、毎回コンボが初期状態で始まり、終了時に放射メニュー・field 用HUDが片づく", out.every(o => o.fresh && o.open && o.closed), JSON.stringify(out));
    await begin(); await ev("$gameParty.leader().setHp(100); 'ok'"); await sleep(200);
    const n0 = await itemCount(7), sel = (await radial()).selectedId; await c.tap("V", 80); await sleep(300);
    rec("K13b 繰り返しのあとも、C の短押しが使える(キーが固着していない)・選んだアイテムは保持", (await itemCount(7)) <= n0 && (await last()).slot === "consumable", JSON.stringify({ sel, last: await last() }));
    await ev(`${FC}.end(); 'ok'`);
  });

  await check("K14 エラーなし・保存なし", async () => {
    const errs = s.errors(); const writes = await ev("window.__writes");
    rec("K14 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_controls_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
