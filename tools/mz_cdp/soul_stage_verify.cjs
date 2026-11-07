// I4-A: SOUL専用ステージ(ProjectR_SoulBattleStage)の実機(Playtest)確認 + スクリーンショット。本物のマップ移動・本物のマウス/キー入力(CDP)。
//   T0 開始前の状態を記録(マップ・座標・向き・マウス変換なし・プレイヤー表示・セーブ許可)
//   T1 start("a16") → 専用マップ6へ移動 → SOUL開始。厳密な16:9の戦闘エリア / プレイヤー非表示 / HUDは戦闘エリアの外 / 混成30枚デッキ・BossFramework
//   T2 攻撃(実マウス+実キー): カーソルがハートの見える位置にあれば本物の照準が合い、カード(Q)でハートのHPが減る
//   T3 防御ターン: 実マウスでハートが戦闘エリアの中を動く(入れ子の箱は無い)。外へ出ても縁に張り付く。ダメージ・弾は出ない
//   T4 解像度の変更(1280x720 → 1920x1080): 16:9・座標変換・ボックス内
//   T5 勝利: 元のマップ・座標・向きへ戻り、プレイヤー表示・マウス変換・セーブ許可・デッキ/指輪が元通り
//   T6 stop() / T7 カード戦闘の外部終了: どちらも元へ戻る。移動は1回ずつ
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_stage_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", BF = "ProjectRBossFramework", ST = "ProjectRSoulStage", HUD = "ProjectRSoulBattleHUD", DK = "ProjectRCardDeck";
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const KEYS = ["Q", "W", "E", "R", "T"];
  const where = () => json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, rx: $gamePlayer._realX, ry: $gamePlayer._realY, dir: $gamePlayer.direction(), transferring: $gamePlayer.isTransferring() })`);
  const world = () => json(`({ deck: $gameSystem._projectRCardDeckData, inv: $gameSystem._projectRCardInventory, dirty: ProjectRApolloTest.isDirty(), cardBattle: ${DK}.isCardBattleActive(), sources: ProjectRCombatSession.sources(),
    save: $gameSystem.isSaveEnabled(), move: typeof playerMovementDisabled !== "undefined" ? playerMovementDisabled : null, stage: ${ST}.getState().state, mapped: ${ST}.getState().mapped })`);
  const playerSprites = () => json(`(function() { var sc = SceneManager._scene, ch = [$gamePlayer].concat(($gamePlayer.followers()._data || []).filter(Boolean));
    return (sc._spriteset._characterSprites || []).filter(function(s) { return ch.indexOf(s._character) >= 0; }).map(function(s) { return s.renderable; }); })()`);
  const ends = () => json("window.__ends");
  const backOn = async origin => {                                    // 元のマップへ戻って、ステージが片づくまで待つ
    const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000);
    await sleep(600);
    return ok;
  };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(900), true);
  const layoutNow = () => json(`(function() { var sc = SceneManager._scene, l = sc._projectRSoulHud, o = sc._projectRSoulStageLayers.overlay, sp = sc._spriteset;
    return { vp: ${ST}.getViewport(), zones: ${ST}.getRepZones(), box: ${ST}.getBattleBox(), sp: [sp.scale.x, sp.x, sp.y], hud: Object.keys(l.panels).map(function(k) { return [k, l.panels[k].x, l.panels[k].y]; }), cards: l.cardPanels.map(function(p) { return [p.x, p.y]; }),
      char: [o._stageChar.x, o._stageChar.y, o._stageChar.scale.x], god: [o._stageGod.x, o._stageGod.y, o._stageGod.scale.x] }; })()`);
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const heartOnScreen = () => json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId), p = ${ST}.toScreen(e.screenX(), e.screenY() - 24); return { x: p.x, y: p.y, sx: e.screenX(), sy: e.screenY() - 24 }; })()`);
  const hand = () => json(`${DK}.getBattleState().hand.map(function(h) { return h.cardId; })`);

  await ev("(function() { var t = 0; })(); 'x'");
  await ev("typeof DataManager !== 'undefined'");
  const t0 = Date.now(); while (Date.now() - t0 < 30000 && !(await ev("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()"))) await sleep(50);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; window.__ends = []; " + SO + ".onEnd(function(e) { window.__ends.push(e.reason); }); 'on'");
  await s.slow(1);
  const origin = await where(), baseWorld = await world();
  await s.shot("t0_origin");

  await check("T0 開始前: 元のマップ・座標・向きを記録。ステージは無効。マウス変換なし。プレイヤーは描かれる。セーブ可", async () => {
    const sprites = await playerSprites(), pc = await ev("Graphics.pageToCanvasX(400)"), api = await ev(`typeof ${SB}.start + '/' + typeof ${SB}.status + '/' + typeof ${SB}.stop + '/' + typeof ${ST}.enter`);
    rec("T0 baseline", origin.map !== 6 && baseWorld.stage === "idle" && !baseWorld.mapped && sprites.length >= 1 && sprites.every(v => v === true) && api === "function/function/function/function" && baseWorld.save === true,
      JSON.stringify({ origin, sprites, pageToCanvasX400: pc, api, save: baseWorld.save }));
  });

  const pcBase = await ev("Graphics.pageToCanvasX(400)");                                  // この環境の素のマウス変換(窓の大きさで変わる)
  const waitPc = async () => { const t = Date.now(); let v = await ev("Graphics.pageToCanvasX(400)"); while (v !== pcBase && Date.now() - t < 3000) { await sleep(100); v = await ev("Graphics.pageToCanvasX(400)"); } return v; };
  await check("T1 開始: 専用マップ6へ移動。厳密な16:9の戦闘エリア・プレイヤー非表示・HUDは戦闘エリアの外・混成30枚デッキ・BossFramework", async () => {
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    const arrived = await toActive();
    await sleep(800);
    const vp = await json(`${ST}.getViewport()`), sp = await json(`(function() { var sp = SceneManager._scene._spriteset; return { sx: sp.scale.x, sy: sp.scale.y, x: sp.x, y: sp.y, dx: $gameMap._displayX, dy: $gameMap._displayY }; })()`);
    const sprites = await playerSprites(), st = await json(`${ST}.getState()`), info = await json("ProjectRApolloTest.deckInfo()"), bf = await json(`${BF}.getState()`), hudm = await json(`${HUD}.getViewModel()`);
    const layout = await json(`(function() { var l = SceneManager._scene._projectRSoulHud; return { stageOn: l._stageOn, box: l.box.visible, corners: l.corners.map(function(x) { return x.visible; }), dim: SceneManager._scene._spriteset._tilemap.children.filter(function(c) { return c._projectRSoulDim; }).length }; })()`);
    const panels = await json(`(function() { var l = SceneManager._scene._projectRSoulHud, sx = l.scale.x, sy = l.scale.y; var vp = ${ST}.getViewport(); var r = [l.panels.state, l.panels.phase, l.panels.player, l.panels.counts].concat(l.cardPanels);
      return r.map(function(p) { var x0 = l.x + p.x * sx, x1 = x0 + p._w * sx, y0 = p.y * sy, y1 = y0 + p._h * sy; return !(x0 < vp.x + vp.w && x1 > vp.x && y0 < vp.y + vp.h && y1 > vp.y); }); })()`);
    await s.shot("t1_attack");
    rec("T1 start", r.ok && r.pending && arrived && vp.w * 9 === vp.h * 16 && Math.abs(sp.sx - vp.scale) < 1e-9 && Math.abs(sp.sy - vp.scale) < 1e-9 && sp.dx === 0 && sp.dy === 0 && sprites.every(v => v === false)
      && st.mapped && layout.stageOn && layout.dim === 0 && layout.corners.every(v => !v) && panels.every(v => v) && info.size === 30 && info.valid && bf.bossId === "dev_boss_soul" && hudm.hand.map(h => h.cardId).join() === HAND.join(),
      JSON.stringify({ start: r.ok ? "ok" : r, arrived, vp: [vp.x, vp.y, vp.w, vp.h], ratio: vp.w / vp.h, scale: [sp.sx, vp.scale], cam: [sp.dx, sp.dy], playerSprites: sprites, layout, panelsOutside: panels.every(v => v), deck: info.size, boss: bf.bossId }));
  });

  await check("T1b 置き場: 攻撃ターンは戦闘エリアの直下にキャラ、その下に神(左右中央・手札の上・戦闘エリアと重ならない)。使う絵は既存の資産", async () => {
    await sleep(800);
    const reps = await json(`${ST}.getReps()`), vp = await json(`${ST}.getViewport()`), zones = await json(`${ST}.getRepZones()`);
    const spr = await json(`(function() { var o = SceneManager._scene._projectRSoulStageLayers.overlay; function d(s) { return { v: s.visible, x: s.x, y: s.y, k: s.scale.x, ky: s.scale.y, ready: !!s._repFrame, url: s.bitmap && s.bitmap._url ? String(s.bitmap._url).split('/').pop() : '' }; } return { ch: d(o._stageChar), god: d(o._stageGod), en: d(o._stageEnemy) }; })()`);
    const cards = await json(`(function() { var l = SceneManager._scene._projectRSoulHud; return Math.min.apply(null, l.cardPanels.map(function(p) { return p.y * l.scale.y; })); })()`);
    const gw = await ev("Graphics.width");
    await s.shot("t1b_reps");
    const centered = Math.abs(spr.ch.x - gw / 2) <= 1 && Math.abs(spr.god.x - gw / 2) <= 1;
    const enemyOk = reps.enemyVisible && spr.en.v && spr.en.ready && Math.abs(spr.en.x - gw / 2) <= 1 && spr.en.k === spr.en.ky && spr.en.y < vp.y - 3 && zones.enemy.y >= 0 && zones.enemy.h >= 190 * (await ev("Graphics.height")) / 1080 - 1 && zones.enemy.y + zones.enemy.h <= vp.y - 3 && /^Highking/.test(spr.en.url);   // 敵は戦闘エリアの上(ボス名のパネルが無いので、画面の上から大きく)
    rec("T1b reps", enemyOk && reps.show && reps.charVisible && reps.godVisible && spr.ch.ready && spr.god.ready && centered && spr.ch.y > vp.y + vp.h && spr.ch.y < spr.god.y && spr.god.y + zones.god.h / 2 <= cards && spr.ch.k === spr.ch.ky && spr.god.k === spr.god.ky
      && /^(!Crystal|!Flame)/.test(spr.god.url) && Math.abs(vp.x * 2 + vp.w - gw) <= 1,
      JSON.stringify({ vp: [vp.x, vp.y, vp.w, vp.h], enemy: [reps.enemy, enemyOk], char: reps.char, god: [reps.godId, reps.god && reps.god.name], sprites: spr, cardTop: Math.round(cards) }));
  });

  await check("T2 攻撃(実マウス+実キー): カーソルがハートの見える位置にあれば照準が合い、カードでハートのHPが減る。プレイヤーは見えない", async () => {
    const h = await heartOnScreen();
    const m = await c.pointer(Math.round(h.x), Math.round(h.y));                        // 実マウスを、ハートが画面に映って見える位置へ
    const hp0 = await heartHp();
    const aimOk = Math.abs(m.x - h.sx) <= 2 && Math.abs(m.y - h.sy) <= 2;                // 本体のコードが見る座標 = ハートのマップ座標
    const hs = await hand(), idx = hs.indexOf("hermes_issen");
    await c.keyDown(KEYS[idx]); await sleep(70); await c.keyUp(KEYS[idx]); await sleep(2600);
    const hp1 = await heartHp();
    await s.shot("t2_cast");
    rec("T2 attack", aimOk && hp1 < hp0 && (await playerSprites()).every(v => v === false), JSON.stringify({ mouse: m, heartMap: [h.sx, h.sy], aimOk, hp: [hp0, hp1] }));
  });

  await check("T3 防御ターン: 実マウスでハートが戦闘エリアの中を動く(入れ子の箱は無い)。外へ出ても縁に張り付く。ダメージ・弾は出ない", async () => {
    const lay0 = await layoutNow();
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
    const lay1 = await layoutNow(), repsD = await json(`${ST}.getReps()`), visD = await json(`(function() { var o = SceneManager._scene._projectRSoulStageLayers.overlay; return [o._stageChar.visible, o._stageGod.visible, o._stageEnemy.visible]; })()`);
    const layoutSame = same(lay0, lay1);
    const box = await json(`${ST}.getBattleBox()`), vp = await json(`${ST}.getViewport()`), p0 = await ev("$gameParty.leader().hp"), ev0 = await ev("$gameMap.events().filter(function(e) { return e && !e._erased; }).length");
    const res = [];
    const probe = async (label, x, y) => { await c.pointer(Math.round(x), Math.round(y)); await sleep(200); const hrt = await json(`${ST}.getPlayerHeart()`); res.push({ label, heart: [Math.round(hrt.x), Math.round(hrt.y)], inBox: hrt.inBox, r: hrt.radius, active: hrt.active }); return hrt; };
    const a = await probe("中", box.x + box.w * 0.3, box.y + box.h * 0.7);
    const b = await probe("右の外", box.x + box.w + 250, box.y + box.h / 2);
    await s.shot("t3_defense_edge");
    const d = await probe("左上の外", vp.x - 20, vp.y - 20);
    const e = await probe("下の外", box.x + box.w / 2, box.y + box.h + 100);
    await c.pointer(Math.round(box.x + box.w * 0.5), Math.round(box.y + box.h * 0.5)); await sleep(300);
    await s.shot("t3_defense_center");
    const inside = h => h.x >= box.x + h.radius - 0.5 && h.x <= box.x + box.w - h.radius + 0.5 && h.y >= box.y + h.radius - 0.5 && h.y <= box.y + box.h - h.radius + 0.5;
    const p1 = await ev("$gameParty.leader().hp"), ev1 = await ev("$gameMap.events().filter(function(e) { return e && !e._erased; }).length");
    const vis = await json(`(function() { var o = SceneManager._scene._projectRSoulStageLayers.overlay; return [o._stageBox.visible, o._stageHeart.visible]; })()`);
    rec("T3b phase layout", layoutSame && !repsD.show && same(visD, [false, false, true]), JSON.stringify({ layoutSame, repsShown: repsD.show, visible: visD }));
    rec("T3 defense", [a, b, d, e].every(h => h.active && inside(h)) && Math.abs(a.x - (box.x + box.w * 0.3)) < 3 && a.inBox && !b.inBox && !d.inBox && !e.inBox && p0 === p1 && ev0 === ev1 && same(vis, [false, true]),
      JSON.stringify({ res, box: [Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h)], playerHp: [p0, p1], events: [ev0, ev1], vis }));
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(500);
  });

  await check("T4 解像度の変更: 1280x720 と 1920x1080 で、戦闘エリアは厳密な16:9のまま・マウス変換が追従・ハートはボックス内", async () => {
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(400);
    const run = async (w, h, shot) => {
      await ev(`Graphics.resize(${w}, ${h}); 'ok'`); await sleep(1200);
      const vp = await json(`${ST}.getViewport()`), sp = await json(`(function() { var sp = SceneManager._scene._spriteset; return { sx: sp.scale.x, sy: sp.scale.y }; })()`);
      const box = await json(`${ST}.getBattleBox()`);
      await c.pointer(Math.round(box.x + box.w + 200), Math.round(box.y + box.h / 2)); await sleep(250);
      const hrt = await json(`${ST}.getPlayerHeart()`), lay = await json(`(function() { var l = SceneManager._scene._projectRSoulStageLayers; return [l.backdrop.bitmap.width, l.backdrop.bitmap.height]; })()`);
      if (shot) await s.shot(shot);
      return { ok: vp.w * 9 === vp.h * 16 && Math.abs(sp.sx - vp.scale) < 1e-9 && sp.sx === sp.sy && hrt.active && hrt.x <= box.x + box.w - hrt.radius + 0.5 && hrt.x >= box.x + box.w - hrt.radius - 1 && lay[0] === w && lay[1] === h, vp: [vp.w, vp.h], lay };
    };
    const a = await run(1280, 720, "t4_1280"), b = await run(1920, 1080, null);
    await ev(`${SO}.skipPhase(); 'ok'`); await sleep(400);
    rec("T4 resize", a.ok && b.ok, JSON.stringify({ a, b }));
  });

  await check("T5 勝利: 元のマップ・座標・向きへ戻り、プレイヤー表示・マウス変換・セーブ許可・デッキ/指輪が元通り。戻りは1回だけ", async () => {
    await ev("window.__ends.length = 0; 'ok'");
    await ev(`(function() { var id = ${SO}.getState().heart.eventId; var hp = ProjectRCardModifiers.eventHp(id); PluginManager.callCommand(Object.assign(new Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: "-" + (hp + 50), exceedMaxHealth: "false" }); return 1; })()`);
    const back = await backOn(origin);
    const w = await where(), after = await world(), sprites = await playerSprites(), e = await ends(), pc = await waitPc(), gdiag = await json("({ w: Graphics.width, h: Graphics.height, bw: Graphics.boxWidth, iw: window.innerWidth, ih: window.innerHeight, scale: Graphics._realScale, stretch: Graphics._stretchEnabled, ox: Graphics._canvas ? Graphics._canvas.offsetLeft : null })");
    await s.shot("t5_victory");
    rec("T5 victory", back && same(e, ["victory"]) && w.map === origin.map && w.x === origin.x && w.y === origin.y && w.dir === origin.dir && Math.abs(w.rx - origin.rx) < 1e-6 && Math.abs(w.ry - origin.ry) < 1e-6
      && after.stage === "idle" && !after.mapped && sprites.every(v => v === true) && after.save === true && !after.dirty && !after.cardBattle && after.sources.length === 0 && same(after.deck, baseWorld.deck) && same(after.inv, baseWorld.inv) && pc === pcBase,
      JSON.stringify({ back, ends: e, origin: [origin.map, origin.x, origin.y, origin.dir], now: [w.map, w.x, w.y, w.dir, w.rx, w.ry], after: { stage: after.stage, mapped: after.mapped, save: after.save, dirty: after.dirty, cb: after.cardBattle }, sprites, pc, pcBase, gdiag }));
  });

  await check("T6 stop(): 途中の中止でも元のマップへ戻る(移動は1回)。二重のstop()は何もしない", async () => {
    await sleep(2500);
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    const arrived = await toActive();
    const st1 = await json(`${SB}.stop()`);
    const back = await backOn(origin);
    const w = await where(), after = await world();
    const st2 = await json(`${SB}.stop()`); await sleep(1200);
    const w2 = await where();
    rec("T6 stop", r.ok && arrived && st1.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && after.stage === "idle" && !after.dirty && st2.ok && w2.map === origin.map && w2.x === origin.x && same(after.deck, baseWorld.deck),
      JSON.stringify({ start: r.ok, arrived, steps: st1.steps, back, now: [w.map, w.x, w.y], second: [st2.ok, w2.map, w2.x, w2.y] }));
  });

  await check("T7 外部終了: カード戦闘を外から終わらせても、SOULが1回だけ終わり、元のマップへ戻る", async () => {
    await sleep(2500);
    await ev("window.__ends.length = 0; 'ok'");
    const r = await json(`${SB}.start("a16", { openingHand: ${JSON.stringify(HAND)}, attackSeconds: 600 })`);
    const arrived = await toActive();
    await ev(`${DK}.endCardBattle(); 'ok'`);
    const back = await backOn(origin);
    const w = await where(), after = await world(), e = await ends(), sprites = await playerSprites();
    rec("T7 external", r.ok && arrived && back && same(e, ["cardBattleEnded"]) && w.map === origin.map && w.x === origin.x && w.y === origin.y && after.stage === "idle" && !after.dirty && after.save === true && sprites.every(v => v === true) && same(after.deck, baseWorld.deck),
      JSON.stringify({ arrived, back, ends: e, now: [w.map, w.x, w.y], stage: after.stage, save: after.save }));
  });

  await check("T8 通常の探索は変わらない: ステージが終われば、マウス座標・カメラ・プレイヤー表示は通常どおり。マップ6は通常ゲームからは行けない(DEV)", async () => {
    const pc = await ev("Graphics.pageToCanvasX(500) + ',' + Graphics.pageToCanvasY(300)"), sp = await json("(function() { var sp = SceneManager._scene._spriteset; return [sp.scale.x, sp.scale.y]; })()");
    const m = await c.pointer(500, 300);
    rec("T8 normal", m.x === 500 && m.y === 300 && same(sp, [1, 1]) && (await playerSprites()).every(v => v === true) && (await ev(`${ST}.isPresenting()`)) === false, JSON.stringify({ pc, mouse: m, spriteset: sp }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("TZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_stage_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
