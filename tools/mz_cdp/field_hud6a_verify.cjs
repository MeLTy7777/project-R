// フィールド戦闘 Stage 6A(スキルHUDの読みやすさ)の実機(Playtest)確認。CDP の実際のキー・マウスで操作し、HUD の Sprite の状態と画面を読む。
//   A  アイコン: LMB 薙ぎ払い / Shift 絶 / E 一閃 / X 黄金の矢 / C ギガース殺し の5枠 + 別枠 V アイテム。5スキルはどれもアイコンが出る(暗くしても見える)。Q 奥義・R リロード・右クリックの銃は枠に出ない(操作は使える)
//   B  Cooldown: 実キーで使うと、暗幕(残り割合)と残り秒(10秒未満は小数1桁)が出て、終わると READY に戻り短く光る。残り秒は実際の Cooldown と一致し、減る一方
//   C  LMB のコンボ: 実クリックで 1/3 → 2/3 → 強撃!(丸と受付時間の線)。受付時間を過ぎれば READY
//   D  V アイテム: 使えなかった直後の理由と数量・使うと Cooldown と個数(×n)・長押しの放射メニューで選ぶと枠の名前が変わる(従来どおり)
//   E  720p / 1080p / 1440p: 枠・ガイドが画面に収まり、重ならず、戦場(プレイヤーの足元)を隠さない。文字は実寸 14px 以上・枠からはみ出さない。画面写真を MZ_OUT へ
//   F  戦闘の開始・終了: 勝利で元のマップへ戻り、2回目の戦闘でも アイコン・状態が正しい(古い Cooldown・光が残らない)
//   G  性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_hud6a_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep } = s;
  const ONLY = process.env.ONLY || "";
  const check = async (id, fn) => { if (ONLY && !id.startsWith(ONLY)) return; try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(300); };
  const last = () => json(`${FC}.getLastResult()`);
  const radial = () => json(`${FC}.getRadialState()`);
  const waitCd = async (slot, ms = 12000) => wait(`${FC}.getCooldowns().${slot} <= 0`, ms);
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.end(); 'ok'`); await sleep(300); await ev(`${FC}.startEncounter({ encounterId: 'h6a', battleMapId: 8, spawnX: 8, spawnY: 10, direction: 8, resultVariableId: 9 }); 'ok'`); await waitMap(8); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(1200); };
  const park = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  const setHp = (id, n) => ev(`(function(){ var hp = $gameMap.getCurrentEventHp(${id}); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), 'Hendrix_Action_Engine', 'UpdateEventHp', { eventId: '${id}', value: (${n} > hp ? '+' : '') + (${n} - hp), exceedMaxHealth: 'true' }); return 'ok'; })()`);
  const killAll = async () => { for (const id of [1, 2, 3]) await setHp(id, 0); };
  // HUD の6つの枠の Sprite の状態(文字は Sprite_ProjectRText が持つ _signature の先頭)。fx = 重ね描き(暗幕・コンボの丸)の図形
  const READ = `(function() { var L = SceneManager._scene._projectRBattleHudLayer; function t(x) { try { return JSON.parse(x._signature)[0]; } catch (e) { return ''; } }
    return L._skillHUD._slots.map(function(sp) { var gd = sp._fx.geometry && sp._fx.geometry.graphicsData || [], polys = [], circles = 0, rects = [];
      gd.forEach(function(d) { var sh = d.shape; if (!sh) return; if (sh.type === 1) rects.push({ w: Math.round(sh.width * 10) / 10 }); else if (sh.type === 2) circles++; else if (sh.type === 0 && sh.points && sh.points.length > 4) polys.push({ maxY: Math.round(Math.max.apply(null, sh.points.filter(function(v, i) { return i % 2 === 1; }))), alpha: d.fillStyle.alpha }); });
      return { visible: sp.visible, key: t(sp._keyText), state: t(sp._fStateText), name: t(sp._fNameText), cool: t(sp._fCoolText), coolVisible: sp._fCoolText.visible, count: t(sp._fCountText), countVisible: sp._fCountText.visible,
        icon: sp._icon._iconIndex, iconVisible: sp._icon.visible, iconAlpha: Math.round(sp._icon.alpha * 100) / 100, fieldMode: !!sp._fieldMode, legacyShown: sp._slotText.visible || sp._nameText.visible || sp._cooldownText.visible,
        prev: sp._prevFieldState, flash: sp._readyFlashUntil > Graphics.frameCount, wipeY: polys.length ? polys[0].maxY : 0, circles: circles, bar: rects.length ? rects[rects.length - 1].w : 0 }; }); })()`;
  const hud = () => json(READ);
  const num = t => Number(t);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function() { var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); $gameParty.gainItem($dataItems[8], 2); $gameParty.gainItem($dataItems[9], 1); return 'ok'; })()`);
  await sleep(300);

  // ---------------------------------------------------------------- A アイコンと枠
  await check("A アイコン", async () => {
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await sleep(500);
    const h = await hud(), vm = await json("ProjectRBattleHUD.getViewModel().slots");
    rec("A1 6つの枠(LMB / Shift / E / X / C + 別枠 V)がフィールド戦闘の表示。カード戦闘用の文字は隠れている", h.length === 6 && h.every(x => x.visible && x.fieldMode && !x.legacyShown) && h.map(x => x.key).join(",") === "LMB,Shift,E,X,C,V", JSON.stringify(h.map(x => [x.key, x.fieldMode, x.legacyShown])));
    rec("A2 5つのスキルのアイコン: 薙ぎ払い=76 / 絶=82 / 一閃=78 / 黄金の矢=102 / ギガース殺し=70(既存の IconSet。新しい素材なし)。V は選んでいるアイテムのアイコン", h.slice(0, 5).map(x => x.icon).join(",") === "76,82,78,102,70" && h[5].icon === (await ev("$dataItems[7].iconIndex")) && h.every(x => x.iconVisible), JSON.stringify(h.map(x => [x.key, x.icon, x.iconVisible])));
    rec("A3 5スキルのアイコンはどれも 0 ではない(空の枠がない)・使えるときは明るい", h.slice(0, 5).every(x => x.icon > 0 && x.iconAlpha === 1), JSON.stringify(h.map(x => x.iconAlpha)));
    rec("A4 名前: 薙ぎ払い / 絶 / 一閃 / 黄金の矢 / ギガース殺し / ポーション。状態: 5スキルは READY・V は ×3", h.slice(0, 5).map(x => x.name).join(",") === "薙ぎ払い,絶,一閃,黄金の矢,ギガース殺し" && h.slice(0, 5).every(x => x.state === "READY") && h[5].name === "ポーション" && h[5].state === "×3", JSON.stringify(h.map(x => [x.name, x.state])));
    rec("A5 Q 奥義・R リロード・右クリックの銃は枠に出ない(データにも無い)が、状態は読める", !vm.some(x => /^(Q|R|RMB)$/.test(x.key)) && (await json(`${FC}.getHudState().slots.map(function(x){ return x.slot; })`)).join(",").includes("ultimate") && (await json(`${FC}.getHudState().gun.key`)) === "RMB", JSON.stringify(vm.map(x => x.key)));
    await s.shot("h6a_A_ready");
  });

  // ---------------------------------------------------------------- B Cooldown
  await check("B Cooldown", async () => {
    await ev("$gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1); 'ok'");
    for (const sl of ["mobility", "special", "card1", "card2"]) await waitCd(sl, 15000);
    await place(8, 10, 8); const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); await c.pointer(p.x + 200, p.y - 120); await sleep(200);
    await c.tap("E", 70); await sleep(80); await c.tap("X", 70); await sleep(80); await c.tap("C", 70); await sleep(80); await c.tap("Shift", 90);
    const samples = []; const t0 = Date.now();
    while (Date.now() - t0 < 8000) { const [h, cd] = await Promise.all([hud(), json(`${FC}.getCooldowns()`)]); samples.push({ t: Date.now() - t0, h, cd }); if (h.slice(1, 5).every(x => x.state === "READY") && samples.length > 8) break; await sleep(110); }
    const slotOf = { 1: "mobility", 2: "special", 3: "card1", 4: "card2" }, names = { 1: "Shift", 2: "E", 3: "X", 4: "C" };
    const first = samples[1] || samples[0];
    rec("B1 使った直後: 4つの枠が COOL・残り秒が出る・アイコンは暗いが見える・暗幕が出る", [1, 2, 3, 4].every(i => first.h[i].state === "COOL" && first.h[i].coolVisible && first.h[i].iconVisible && first.h[i].iconAlpha < 1 && first.h[i].iconAlpha > 0.4 && first.h[i].wipeY > 0), JSON.stringify([1, 2, 3, 4].map(i => [names[i], first.h[i].state, first.h[i].cool, first.h[i].iconAlpha, first.h[i].wipeY])));
    await s.shot("h6a_B_cooling");
    // 残り秒の書式と、実際の Cooldown との一致(±0.3秒)・減る一方
    let formatOk = true, matchOk = true, monotone = true, worst = 0; const prev = {};
    for (const sm of samples) for (const i of [1, 2, 3, 4]) { const x = sm.h[i]; if (!x.coolVisible) continue; const secs = num(x.cool), real = sm.cd[slotOf[i]]; if (!(real >= 10 ? /^\d+$/.test(x.cool) : /^\d\.\d$/.test(x.cool))) formatOk = false; worst = Math.max(worst, Math.abs(secs - real)); if (Math.abs(secs - real) > 0.35) matchOk = false; if (prev[i] !== undefined && secs > prev[i] + 0.001) monotone = false; prev[i] = secs; }
    rec("B2 残り秒の書式: 10秒未満は小数1桁(例 2.4)・10秒以上は整数。実際の Cooldown と ±0.35 秒で一致", formatOk && matchOk, JSON.stringify({ formatOk, matchOk, worst: Math.round(worst * 100) / 100, n: samples.length }));
    rec("B3 残り秒は減る一方(増えない)", monotone, "");
    // 暗幕の高さ = 残り割合 × 枠の高さ(140)。ratio が下がると暗幕は低くなる
    const wipes = [3, 4].map(i => samples.filter(sm => sm.h[i].coolVisible).map(sm => sm.h[i].wipeY));
    const wipeShrinks = wipes.every(w => w.length > 3 && w[0] > w[w.length - 1] && w.every((y, k) => k === 0 || y <= w[k - 1] + 1));
    const wipeMatch = samples.filter(sm => sm.h[3].coolVisible).every(sm => { const ratio = sm.cd.card1 / 3; return Math.abs(sm.h[3].wipeY - Math.min(140, 140 * ratio)) < 12; });
    rec("B4 暗幕は、残り割合に合わせて下から引いていく(高さ = 140 × 残り割合 ± 12。減る一方)", wipeShrinks && wipeMatch, JSON.stringify({ x: wipes[0].slice(0, 6), c: wipes[1].slice(0, 6) }));
    const end = samples[samples.length - 1];
    rec("B5 終わると READY に戻る(残り秒・暗幕が消える・アイコンは明るい)", [1, 2, 3, 4].every(i => end.h[i].state === "READY" && !end.h[i].coolVisible && end.h[i].iconAlpha === 1 && end.h[i].wipeY === 0), JSON.stringify([1, 2, 3, 4].map(i => [end.h[i].state, end.h[i].coolVisible, end.h[i].iconAlpha])));
    rec("B6 待ち → 使える の瞬間に枠が短く光る(約0.3秒)", [1, 2, 3, 4].some(i => samples.some(sm => sm.h[i].flash)), JSON.stringify(samples.filter(sm => sm.h.some(x => x.flash)).length));
    await sleep(500); const later = await hud(); rec("B7 光は終わって残らない", later.every(x => !x.flash), "");
    await s.shot("h6a_B_ready_again");
  });

  // ---------------------------------------------------------------- C コンボ
  await check("C コンボ", async () => {
    await place(8, 10, 8); const p = await json("({ x: Math.round($gamePlayer.screenX()), y: Math.round($gamePlayer.screenY() - 24) })"); await c.pointer(p.x + 200, p.y - 120); await sleep(300);
    const read0 = async () => (await hud())[0];
    const a0 = await read0();
    rec("C0 コンボの前: READY・丸は3つ(空)・受付の線なし", a0.state === "READY" && a0.circles === 3 && a0.bar === 0, JSON.stringify(a0));
    await c.click(); await sleep(130); const a1 = await read0(); const sc1 = await json(`${FC}.getHudState().combo`);
    await sleep(200); const a1b = await read0();
    await c.click(); await sleep(130); const a2 = await read0(); await sleep(300);
    await c.click(); await sleep(130); const a3 = await read0(); await s.shot("h6a_C_finisher");
    rec("C1 1回目: 1/3・受付時間の線が出る(時間とともに短くなる)", a1.state === "1/3" && a1.bar > 0 && a1b.bar < a1.bar && sc1.step === 1, JSON.stringify({ a1: a1.state, bar: [a1.bar, a1b.bar] }));
    rec("C2 2回目: 2/3(受付の線は戻る)", a2.state === "2/3" && a2.bar > a1b.bar, JSON.stringify({ a2: a2.state, bar: a2.bar }));
    rec("C3 3回目: 強撃!(丸が3つとも埋まり、金色の枠)", a3.state === "強撃!" && a3.circles === 3, JSON.stringify({ a3: a3.state, circles: a3.circles }));
    await sleep(1600); const a4 = await read0();
    rec("C4 受付時間を過ぎれば READY に戻る・もう一度1回目から", a4.state === "READY" && a4.bar === 0, JSON.stringify({ a4: a4.state }));
    await c.click(); await sleep(130); rec("C5 戻ったあとの1回目は、また 1/3(コンボの数え方は変わらない)", (await read0()).state === "1/3", ""); await sleep(1500);
  });

  // ---------------------------------------------------------------- D V アイテム
  await check("D アイテム", async () => {
    await ev("$gameParty.leader().setHp($gameParty.leader().mhp); 'ok'"); await waitCd("consumable", 12000);
    await c.tap("V", 80); await sleep(250); const al = (await hud())[5], r = await last();
    rec("D1 使えなかった直後(HP満タン): 理由(効果なし)と数量(×3)が出る・枠が赤い知らせ", r && r.ok === false && al.state === "効果なし" && al.countVisible && al.count === "×3", JSON.stringify({ r: r && r.reason, state: al.state, count: al.count, countVisible: al.countVisible }));
    await s.shot("h6a_D_alert"); await sleep(1700); const al2 = (await hud())[5];
    rec("D2 知らせは約1.5秒で消え、数量(×3)に戻る", al2.state === "×3" && !al2.countVisible, JSON.stringify(al2));
    await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("V", 80); await sleep(300); const cd1 = (await hud())[5], n1 = await ev("$gameParty.numItems($dataItems[7])");
    rec("D3 使うと Cooldown(8秒・残り秒と暗幕)・個数が減る(×2)・アイコンは見える", cd1.coolVisible && num(cd1.cool) > 7 && num(cd1.cool) <= 8 && cd1.state === "×2" && n1 === 2 && cd1.iconVisible && cd1.iconAlpha < 1, JSON.stringify({ cool: cd1.cool, state: cd1.state, n: n1 }));
    await s.shot("h6a_D_item_cool"); await waitCd("consumable", 10000); await sleep(300);
    // 長押しの放射メニュー(従来どおり): ハイポーションを選ぶと、V の枠の名前が変わる
    await c.pointer(960, 540); await sleep(100); await c.keyDown("V"); await sleep(450); const open = await radial();
    const idx = open.items.findIndex(i => i.id === 8), n = open.items.length;
    const ang = -Math.PI / 2 + idx * 2 * Math.PI / n; await c.pointer(open.center.x + Math.cos(ang) * 140, open.center.y + Math.sin(ang) * 140); await sleep(200); const hov = await radial();
    await s.shot("h6a_D_radial"); await c.keyUp("V"); await sleep(300); const sel = await radial(), v = (await hud())[5];
    rec("D4 長押しの放射メニュー: 開く・方向のアイテムが選ばれる・離すと V の枠がそのアイテムの表示になる(使わない)", open.open === true && hov.hoverId === 8 && sel.open === false && sel.selectedId === 8 && v.name === "ハイポーション" && (await ev("$gameParty.numItems($dataItems[8])")) === 2, JSON.stringify({ open: open.open, hover: hov.hoverId, sel: sel.selectedId, name: v.name }));
    await ev("[7, 8, 9].forEach(function(id) { $gameParty.gainItem($dataItems[id], -99); }); 'ok'"); await sleep(500); const none = (await hud())[5];
    rec("D5 ポーションが全部なくなると「使えない」表示(×0 または NO ITEM)・アイコンは暗い", /^(NO ITEM|×0)$/.test(none.state) && none.iconAlpha < 1 && none.iconAlpha > 0, JSON.stringify({ state: none.state, name: none.name, alpha: none.iconAlpha }));
    await ev("$gameParty.gainItem($dataItems[7], 3); $gameParty.gainItem($dataItems[8], 2); 'ok'"); await sleep(300);
  });

  // ---------------------------------------------------------------- E 解像度(実際の遊び方と同じ: ゲームの画面は 1920x1080 のまま、ウィンドウの大きさだけを 720p / 1080p / 1440p にする)
  await check("E 解像度", async () => {
    await ev(`${park} 'ok'`); await place(8, 10, 8);
    const measure = () => json(`(function() { var L = SceneManager._scene._projectRBattleHudLayer, cv = Graphics._canvas.getBoundingClientRect(), k = cv.width / Graphics.width;
      function b(s) { var r = s.getBounds(); return { l: Math.round(r.x * k), t: Math.round(r.y * k), r: Math.round((r.x + r.width) * k), b: Math.round((r.y + r.height) * k) }; }
      var sl = L._skillHUD._slots, fonts = []; sl.forEach(function(sp) { [sp._fStateText, sp._fNameText, sp._fCoolText].forEach(function(tx) { var txt = ''; try { txt = JSON.parse(tx._signature)[0]; } catch (e) {} fonts.push({ px: tx.bitmap.fontSize * L.scale.x * k, text: txt, w: txt && tx.visible ? tx.bitmap.measureTextWidth(txt) : 0, max: tx.bitmap.width, shown: tx.visible }); }); });
      return { vw: Math.round(cv.width), vh: Math.round(cv.height), k: k, slots: sl.map(b), guide: b(L._fieldGuideHUD), fonts: fonts, playerFootY: Math.round($gamePlayer.screenY() * k), mapBottom: Math.round(($gameMap.height() * $gameMap.tileHeight() - $gameMap.displayY() * $gameMap.tileHeight()) * k) }; })()`);
    for (const [w, h] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
      await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await sleep(1000);
      await place(8, 10, 8); await c.pointer(960, 540); await sleep(300);
      await ev("$gameParty.leader().setHp(100); 'ok'"); await c.tap("E", 70); await c.tap("X", 70); await sleep(400);
      const m = await measure(), tops = [...m.slots.map(x => x.t), m.guide.t];
      const inside = m.slots.every(x => x.l >= 0 && x.t >= 0 && x.r <= m.vw && x.b <= m.vh) && m.guide.l >= 0 && m.guide.r <= m.vw;
      const noOverlap = m.guide.b <= Math.min(...m.slots.map(x => x.t)) + 1 && m.slots.every((x, i) => i === 0 || x.l >= m.slots[i - 1].r - 1);
      const minTopRatio = Math.min(...tops) / m.vh;
      rec(`E-${h}p-a ${w}x${h}: スキル枠・ガイドが画面に収まり、重ならない`, inside && noOverlap && m.vh === h, JSON.stringify({ vw: m.vw, vh: m.vh, l: m.slots[0].l, r: m.slots[5].r, guide: m.guide, top: Math.min(...tops) }));
      rec(`E-${h}p-b ${w}x${h}: HUD は画面の下の端だけ(上端は画面の 78% より下)で、プレイヤーの足元より下。戦場を隠さない`, minTopRatio >= 0.78 && Math.min(...tops) > m.playerFootY + 4, JSON.stringify({ topRatio: Math.round(minTopRatio * 1000) / 1000, footY: m.playerFootY, top: Math.min(...tops) }));
      const f = m.fonts.filter(x => x.shown && x.text), minPx = Math.min(...f.map(x => x.px));
      rec(`E-${h}p-c ${w}x${h}: 文字は実寸 14px 以上(状態・名前・残り秒)で、枠からはみ出さない`, minPx >= 14 && f.every(x => x.w <= x.max + 1), JSON.stringify({ minPx: Math.round(minPx * 10) / 10, n: f.length, widest: Math.max(...f.map(x => x.w / x.max)).toFixed(2) }));
      await s.shot(`h6a_E_${h}p`);
      const shotFile = `${process.env.MZ_OUT || 'mz_out'}/h6a_E_${h}p_cdp.png`; const r = await c.send("Page.captureScreenshot", { format: "png" }); require("fs").writeFileSync(shotFile, Buffer.from(r.data, "base64"));
      await waitCd("special", 9000); await waitCd("card1", 5000);
    }
    await c.send("Emulation.clearDeviceMetricsOverride"); await sleep(900);
  });

  // ---------------------------------------------------------------- F 戦闘の開始・終了
  await check("F 開始・終了", async () => {
    await place(8, 10, 8); await ev("$gameMap.event(1).locate(4, 4); $gameMap.event(2).locate(12, 4); $gameMap.event(3).locate(8, 3); 'ok'");
    await c.tap("E", 70); await sleep(300); const during = (await hud())[2];
    rec("F0 勝利の前: E は Cooldown 中", during.state === "COOL" && during.coolVisible, JSON.stringify(during));
    await killAll(); await leave();
    const after = await json(`({ map: $gameMap.mapId(), active: ${FC}.isActive(), hudVisible: SceneManager._scene._projectRBattleHudLayer.visible, enc: ${FC}.getEncounterState().state })`);
    rec("F1 勝利 → 元のマップへ戻り、戦闘は終わる(HUD の戦闘表示も出ない)", after.map === 1 && after.active === false && after.enc === "idle", JSON.stringify(after));
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await sleep(600);
    const h2 = await hud();
    rec("F2 2回目の戦闘: 6つの枠・アイコン・READY が最初から正しい(古い Cooldown・暗幕・光が残らない)", h2.length === 6 && h2.slice(0, 5).map(x => x.icon).join(",") === "76,82,78,102,70" && h2.slice(0, 5).every(x => x.state === "READY" && !x.coolVisible && x.iconAlpha === 1 && x.wipeY === 0 && !x.flash) && h2.every(x => x.fieldMode && !x.legacyShown), JSON.stringify(h2.map(x => [x.key, x.state, x.coolVisible, x.flash, x.wipeY])));
    // 戦闘が終わったあと、カード戦闘の描画へ戻るとき(アダプターが元の枠データを返す)の後始末: フィールド用の部品が残らない
    await ev(`${FC}.end(); 'ok'`); await sleep(600);
    const back = await json(`(function(){ var L = SceneManager._scene._projectRBattleHudLayer, ad = L._adapter; var orig = ad.skills; ad.skills = function() { return [{ mode: 'card', key: 'Q', name: 'テスト', detail: '', iconIndex: 5, imageName: '', available: true, disabled: false, selected: false, cooldown: { active: false, remaining: 0, total: 0 } }, undefined, undefined, undefined, undefined]; }; L._skillHUD._field = false; L._skillHUD.reset(); Graphics.frameCount = Math.ceil(Graphics.frameCount / 4) * 4; L._skillHUD.update(); var sp = L._skillHUD._slots[0]; var res = { fieldMode: !!sp._fieldMode, fShown: sp._fStateText.visible || sp._fNameText.visible || sp._fCoolText.visible || sp._fCountText.visible, legacy: sp._slotText.visible && sp._nameText.visible, alpha: sp._icon.alpha, scale: Math.round(sp._icon.scale.x * 100) / 100, y: sp._icon.y }; ad.skills = orig; return res; })()`);
    rec("F3 カード戦闘の枠の描画へ戻ると、フィールド戦闘用の部品は隠れ、アイコンの大きさ・位置・明るさは元どおり", back.fieldMode === false && back.fShown === false && back.legacy === true && back.alpha === 1 && back.scale === 2 && back.y === 56, JSON.stringify(back));
  });

  // ---------------------------------------------------------------- G 性能・エラー・保存
  await check("G 性能", async () => {
    await enter(); await ev(`${park} 'ok'`); await place(8, 10, 8); await sleep(500);
    await ev("(function(){ var o = Scene_Map.prototype.update; window.__ms = []; window.__origSM = o; Scene_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
    // Cooldown を続けて回しながら(HUD が毎回描き直される)測る
    const t0 = Date.now(); while (Date.now() - t0 < 6000) { await c.tap("E", 60); await c.tap("X", 60); await c.tap("C", 60); await c.tap("Shift", 60); await sleep(300); }
    const r = await json("(function(){ Scene_Map.prototype.update = window.__origSM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(2), maxMs: +a[a.length-1].toFixed(2) }; })()");
    const fps = await ev("(function(){ return new Promise(function(res){ var n = 0, t0 = performance.now(); function f(){ n++; if (performance.now() - t0 >= 1500) res(Math.round(n * 1000 / (performance.now() - t0) * 10) / 10); else requestAnimationFrame(f); } requestAnimationFrame(f); }); })()").catch(() => null);
    rec("G1 Cooldown を回し続けても軽い(Scene_Map.update の平均 < 6ms・p95 < 12ms)/ 約60fps", r.avgMs < 6 && r.p95Ms < 12 && (fps === null || fps > 52), JSON.stringify({ r, fps }));
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("G2 Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const bad = s.results.filter(r => !r.ok).length; console.log(`\n${s.results.length - bad}/${s.results.length} PASS`); require("fs").writeFileSync(`${process.env.MZ_OUT || "mz_out"}/field_hud6a_verify.json`, JSON.stringify(s.results, null, 1)); process.exit(bad ? 1 : 0);
})().catch(e => { console.log("FATAL", e.stack); process.exit(2); });
