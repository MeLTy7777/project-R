// I4-A(改訂): 専用ステージの攻撃の起点・重複Spriteの除去の実機(Playtest)確認 + スクリーンショット。実マウス/実キー(CDP)。
//   O1 近接(通常の剣): 起点 = カーソル。ハートの真上・1マス横(ホーミング)で当たり、遠ければ外れる。プレイヤーは動かない
//   O2 重複プレイヤーの除去: カード(一閃)のカットイン中、プレイヤーの複製(CutInLayer.overlay)は描かれない。カットイン本体は描かれる
//   O3 銃: 弾はキャラの置き場から出て、カーソルの方向へ飛び、当たる
//   O4 神のカード(Apolloを選択): 黄金の連矢・エロスの矢は神の置き場から出る。起点の置き換えは毎フレームの終わりに元へ戻る
//   O5 後片づけ: 元のマップ・座標・表示へ戻る
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_stage_origin_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const where = () => json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, rx: $gamePlayer._realX, ry: $gamePlayer._realY, dir: $gamePlayer.direction() })`);
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const heart = () => json(`(function() { var e = $gameMap.event(${SO}.getState().heart.eventId), c = ProjectRSoulBattlePoC.getState().hitCenter, p = ${ST}.toScreen(e.screenX(), e.screenY() - 24); return { tx: c.x, ty: c.y, sx: p.x, sy: p.y, scale: ${ST}.getViewport().scale }; })()`);
  const pointerTile = async (tx, ty) => { const p = await json(`${ST}.toScreen(${tx} * 48, ${ty} * 48 - 24)`); return c.pointer(Math.round(p.x), Math.round(p.y)); };
  const KEYS = ["Q", "W", "E", "R", "T"];
  const pressCard = async cardId => {                                                                         // 使うと手札が左へ詰まるので、毎回カードIDからキーを引く
    const hand = await json("ProjectRCardDeck.getBattleState().hand.map(function(h) { return h.cardId; })"), i = hand.indexOf(cardId);
    if (i < 0) return false;
    await c.keyDown(KEYS[i]); await sleep(60); await c.keyUp(KEYS[i]); return true;
  };
  const pressJ = async () => { await c.click(); };               // 通常攻撃 = 左クリック(カーソルは戦闘エリアの中)
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1200), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000); await sleep(600); return ok; };
  const startA16 = async weapon => { await ev(`${SB}.start("a16", { weapon: "${weapon}", openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 600 })`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const eventsWith = tag => json(`$gameMap.events().filter(function(e) { return e && !e._erased && String(e.event().note || '').indexOf('${tag}') >= 0; }).map(function(e) { return [e._realX + 0.5, e._realY + 0.5]; })`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
  await s.slow(1);
  const origin = await where();

  await check("O1 近接(通常の剣): 起点 = カーソル。真上・1マス横(ホーミング)で当たり、遠ければ外れる。プレイヤーは動かない", async () => {
    const ok = await startA16("sword");
    const p0 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    const h = await heart();
    const drops = [];
    const swingAt = async (label, tx, ty) => { await pointerTile(tx, ty); await sleep(120); const a = await heartHp(); await pressJ(); let b = a; const t0 = Date.now(); while (Date.now() - t0 < 1500) { await sleep(50); b = await heartHp(); if (b !== a) break; } drops.push([label, a - b]); await sleep(700); };
    await swingAt("真上", h.tx, h.ty);
    await s.shot("o1_sword_on_heart");
    await swingAt("1マス左(ホーミング)", h.tx - 1, h.ty);
    await swingAt("6マス左(遠い)", h.tx - 6, h.ty);
    const stats = await json("ProjectRSoulBattleMelee.getStageStats()"), p1 = await json("[$gamePlayer._realX, $gamePlayer._realY]");
    rec("O1 melee", ok && drops[0][1] > 0 && drops[1][1] === drops[0][1] && drops[2][1] === 0 && stats.cursorOrigin >= 3 && stats.homed >= 3 && JSON.stringify(p0) === JSON.stringify(p1),
      JSON.stringify({ drops, stats: [stats.cursorOrigin, stats.homed], playerMoved: JSON.stringify(p0) !== JSON.stringify(p1) }));
  });

  await check("O2 重複プレイヤーの除去: カード(一閃)のカットイン中、プレイヤーの複製は描かれない。カットイン本体は描かれる", async () => {
    await sleep(1500);
    const h = await heart();
    await pointerTile(h.tx, h.ty); await sleep(150);
    await c.keyDown("Q"); await sleep(60); await c.keyUp("Q");
    let sawCutIn = false, overlayDrawn = false;
    for (let i = 0; i < 12; i++) {
      await sleep(60);
      const st = await json(`(function() { var l = SceneManager._scene._spriteset._projectRCutInLayer; if (!l) return null; return { views: l.views.size, overlayVisible: l.overlay.visible, overlayRenderable: l.overlay.renderable }; })()`);
      if (st && st.views > 0) sawCutIn = true;
      if (st && st.overlayVisible && st.overlayRenderable) overlayDrawn = true;
      if (i === 3) await s.shot("o2_cutin");
    }
    const st2 = await json(`(function() { var l = SceneManager._scene._spriteset._projectRCutInLayer; return l ? { overlayVisible: l.overlay.visible, overlayRenderable: l.overlay.renderable } : null; })()`);
    rec("O2 no duplicate", sawCutIn && !overlayDrawn && st2.overlayRenderable === false, JSON.stringify({ sawCutIn, overlayDrawn, after: st2 }));
  });

  await check("O5 後片づけ(近接の確認の後): stop() で元のマップ・座標へ戻り、複製の表示も元へ", async () => {
    const stop = await json(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const w = await where(), st = await json(`${ST}.getState()`);
    rec("O5 cleanup", stop.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && st.state === "idle" && st.hiddenPlayerSprites === 0, JSON.stringify({ back, now: [w.map, w.x, w.y], hidden: st.hiddenPlayerSprites }));
  });

  await check("O3 銃: 弾はキャラの置き場から出て、カーソルの方向へ飛び、当たる(ずれれば外れる)", async () => {
    await sleep(2500);
    const ok = await startA16("gun");
    const h = await heart(), lay = await json(`${ST}.layout()`);
    await pointerTile(h.tx, h.ty); await sleep(150);
    const hp0 = await heartHp();
    await pressJ(); await sleep(40);
    const first = await eventsWith("<projectRGunBullet>");                                                  // 出た直後の位置(弾は速いので、すぐに遠ざかる)
    await sleep(40); await s.shot("o3_gun");
    await sleep(1500);
    const hp1 = await heartHp();
    // キャラの置き場から出て、ハートの方向(上)へ飛ぶ: 弾は「キャラの置き場とハートの間」の、キャラ寄りの線上にある。神の置き場(キャラより下)にはいない
    const near = first.length >= 1 && first[0][1] <= lay.playerCenter.y + 0.6 && first[0][1] > h.ty && Math.abs(first[0][0] - lay.playerCenter.x) < 1.5 && first[0][1] < lay.godCenter.y - 3;
    await sleep(500);
    await pointerTile(h.tx + 8, h.ty); await sleep(150);
    await pressJ(); await sleep(1800);
    const hp2 = await heartHp();
    rec("O3 gun", ok && near && hp1 < hp0 && hp2 === hp1, JSON.stringify({ firstBullet: first[0], playerCenter: lay.playerCenter, godCenter: lay.godCenter, hp: [hp0, hp1, hp2] }));
  });

  await check("O4 神のカード(Apolloを選択): 黄金の連矢・エロスの矢は神の置き場から出る。置き換えは毎フレームの終わりに元へ戻る", async () => {
    await ev("(function() { var m = ProjectRGodSummonManager; m.hasPersistentUltimateBattleState = function() { return true; }; m.getPersistentUltimateGodId = function() { return 'apollo'; }; return 1; })()");
    await sleep(800);
    const reps = await json(`${ST}.getReps()`), lay = await json(`${ST}.layout()`);
    const h = await heart();
    await pointerTile(h.tx, h.ty); await sleep(150);
    await pressCard("apollo_golden_volley"); await sleep(90);
    const volley = await eventsWith("<projectRGoldenVolley>");
    await sleep(60); await s.shot("o4_volley");
    const swapped1 = await ev(`${ST}.isOriginSwapped()`);
    await sleep(2600);
    await pressCard("apollo_eros_arrow");
    let eros = [];
    for (let i = 0; i < 25 && !eros.length; i++) { await sleep(40); eros = await eventsWith("<projectRErosArrow>"); }              // 後から数フレームかけて出るカード: 出た直後を拾う
    await s.shot("o4_eros");
    await sleep(600);
    const p = await json("[$gamePlayer._realX, $gamePlayer._realY]"), pl = await json(`${ST}.layout()`);
    const dist = (a, b) => Math.hypot(a[0] - b.x, a[1] - b.y);
    const nearGod = pts => pts.length > 0 && pts.every(pt => dist(pt, lay.godCenter) < 5);
    const lessThanChar = pts => pts.length > 0 && pts.every(pt => dist(pt, lay.godCenter) < dist(pt, lay.playerCenter) + 1.5);
    const log = await json(`${ST}.getOriginLog()`);
    rec("O4 god origin", reps.godId === "apollo" && volley.length >= 5 && eros.length >= 1 && lessThanChar(volley) && lessThanChar(eros) && swapped1 === false
      && Math.abs(p[0] - pl.player.x) < 1e-6 && Math.abs(p[1] - pl.player.y) < 1e-6 && log.length >= 2,
      JSON.stringify({ god: reps.godId, volleyFirst: volley.slice(0, 2), erosFirst: eros.slice(0, 2), godCenter: lay.godCenter, playerCenter: lay.playerCenter, playerAnchor: p, log: log.length, nearGod: nearGod(volley) }));
  });

  await check("O5b 後片づけ: stop() で元のマップ・座標・表示へ戻る。起点の置き換えは残らない", async () => {
    const stop = await json(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const w = await where(), st = await json(`${ST}.getState()`), swapped = await ev(`${ST}.isOriginSwapped()`);
    const sprites = await json(`(function() { var sc = SceneManager._scene, ch = [$gamePlayer].concat(($gamePlayer.followers()._data || []).filter(Boolean)); return (sc._spriteset._characterSprites || []).filter(function(s) { return ch.indexOf(s._character) >= 0; }).map(function(s) { return s.renderable; }); })()`);
    rec("O5b cleanup", stop.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && st.state === "idle" && !swapped && sprites.every(v => v === true), JSON.stringify({ back, now: [w.map, w.x, w.y], swapped, sprites }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("OZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_stage_origin_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
