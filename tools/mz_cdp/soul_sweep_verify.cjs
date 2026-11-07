// I4-A(仕上げ): 専用ステージの薙ぎ払い(Hermes)の実機(Playtest)確認 + スクリーンショット。実マウス/実キー(CDP)。
//   W1 見える扇: 発動の瞬間から、杖のVFXとケーリュケイオンの振りが「カーソルの点(扇の起点)」に出て、判定まで見え続ける(戦闘エリアの中・プレイヤー位置ではない)
//   W2 判定のタイミング: 発動から約12フレーム後にハートのHPが1回だけ減る。VFX(見えている動き)と同期している
//   W3 回避AI: 同じ配置で、回避型(AI)は扇の外へ出て外れ、AIなしのハートには当たる。AIは扇が見えてから動く
//   W4 通常のマップ: ステージを出れば、錨・差し替えは残らない(Hermesの本体VFX・Game_Player の画面位置は元のまま)
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_sweep_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", ME = "ProjectRSoulBattleMelee";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const heartHp = () => ev(`ProjectRCardModifiers.eventHp(${SO}.getState().heart.eventId)`);
  const heart = () => json(`(function() { var c = ProjectRSoulBattlePoC.getState().hitCenter; return { tx: c.x, ty: c.y }; })()`);
  const pointerTile = async (tx, ty) => { const p = await json(`${ST}.toScreen(${tx} * 48, ${ty} * 48 - 24)`); return c.pointer(Math.round(p.x), Math.round(p.y)); };
  const frame = () => ev("Graphics.frameCount");
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1200), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 20000); await sleep(600); return ok; };
  const hand = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];
  const start = async (extra = "") => { await ev(`${SB}.start("a16", { openingHand: ${JSON.stringify(hand)}, attackSeconds: 600 ${extra} })`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const restart = async () => { await ev(`${SB}.start("a16", { openingHand: ${JSON.stringify(hand)}, attackSeconds: 600 })`); await sleep(2500); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  // 薙ぎ払い関連の表示物(杖のVFX・ケーリュケイオン・残像)を、画面の(ステージ座標の)位置つきで集める
  const sweepSprites = () => json(`(function() { var res = []; function walk(o, depth) { if (!o || depth > 8) return; var vis = !(o.visible === false || o.renderable === false); var u = o.bitmap && o.bitmap._url ? String(o.bitmap._url).split('/').pop() : ''; if (u && /Sweep_Staff|Caduceus/.test(u)) { var g = o.getGlobalPosition ? o.getGlobalPosition() : { x: o.x, y: o.y }; res.push({ u: u, vis: vis, gx: Math.round(g.x), gy: Math.round(g.y), alpha: o.alpha === undefined ? null : +o.alpha.toFixed(2), sc: o.scale ? +o.scale.x.toFixed(2) : null }); } (o.children || []).forEach(function(ch) { walk(ch, depth + 1); }); } walk(SceneManager._scene, 0); return res; })()`);
  const KEYS = ["Q", "W", "E", "R", "T"];
  const pressSweep = async () => { const hs = await json("ProjectRCardDeck.getBattleState().hand.map(function(h) { return h.cardId; })"), i = hs.indexOf("hermes_sweep"); if (i < 0) return false; await c.keyDown(KEYS[i]); await sleep(60); await c.keyUp(KEYS[i]); return true; };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const playSe = await ev("(function() { window.__se = []; var o = AudioManager.playSe; AudioManager.playSe = function(se) { window.__se.push(se && se.name); return o.apply(this, arguments); }; return 'ok'; })()");
  void playSe;

  // 毎フレームの記録(ゲームのフレームごとに Game_Map.update の後で取る): フレーム・ハートのHP・見えている扇・扇の表示物の数と位置・ハートのx
  const installRec = () => ev(`(function() {
    window.__rec = window.__rec || { on: false, rows: [] };
    if (!window.__recHook) {
      var u = Game_Map.prototype.update;
      Game_Map.prototype.update = function() { var r = u.apply(this, arguments); if (window.__rec.on) { try { window.__rec.rows.push(window.__recRow()); } catch (e) { window.__rec.err = String(e); } } return r; };
      window.__recHook = true;
    }
    window.__recRow = function() {
      var res = [];
      (function walk(o, depth) { if (!o || depth > 8) return; var vis = !(o.visible === false || o.renderable === false); var url = o.bitmap && o.bitmap._url ? String(o.bitmap._url).split('/').pop() : ''; if (url && /Sweep_Staff|Caduceus/.test(url) && vis) { var g = o.getGlobalPosition ? o.getGlobalPosition() : { x: o.x, y: o.y }; res.push([Math.round(g.x), Math.round(g.y), url.slice(0, 16)]); } (o.children || []).forEach(function(ch) { walk(ch, depth + 1); }); })(SceneManager._scene, 0);
      return { f: Graphics.frameCount, hp: ProjectRCardModifiers.eventHp(ProjectRSoulBattle.getState().heart.eventId), vis: !!ProjectRSoulBattleMelee.getVisibleSweep(), n: res.length, p: res.slice(0, 2), hx: ProjectRSoulBattlePoC.getState().hitCenter.x };
    };
    window.__rec.rows = []; window.__rec.on = false; return 'ok';
  })()`);
  const record = async (ms, action) => { await ev("window.__rec.rows = []; window.__rec.on = true; 'on'"); const r = await action(); await sleep(ms); await ev("window.__rec.on = false; 'off'"); return { rows: await json("window.__rec.rows"), r }; };

  await check("W1/W2 見える扇と判定: 杖のVFXとケーリュケイオンの振りが扇の起点(カーソルの点)に出て、判定(約12フレーム後)まで毎フレーム見える。ハートのHPは判定の時刻に1回だけ減る", async () => {
    const ok = await start();
    await installRec();
    const h = await heart(), hp0 = await heartHp();
    await pointerTile(h.tx - 3, h.ty); await sleep(250);
    const cur = await json(`${ST}.getAttackCursor()`), apexScreen = await json(`${ST}.toScreen(${cur.x} * 48, ${cur.y} * 48)`), vp = await json(`${ST}.getViewport()`);
    const { rows, r: pressed } = await record(1500, async () => { const p = await pressSweep(); return p; });
    await s.shot("w1_after");
    const act = rows.findIndex(x => x.vis);                                           // 扇が見えた最初のフレーム
    const drop = rows.findIndex(x => x.hp < hp0);
    const fAct = rows[act].f, fDrop = drop >= 0 ? rows[drop].f : null;
    const lastVis = rows.map(x => x.vis).lastIndexOf(true);
    const drawn = rows.filter(x => x.n > 0).length;                                    // 扇の表示物が見えているフレーム数
    const withinWindup = rows.filter(x => x.f >= fAct && x.f < fAct + 12);
    const gaps = withinWindup.filter(x => x.n === 0).length;                           // 判定までの間に、表示物が消えたフレーム
    const positions = rows.filter(x => x.n > 0).flatMap(x => x.p);
    const closeToApex = positions.length > 0 && positions.every(p => Math.hypot(p[0] - apexScreen.x, p[1] - apexScreen.y) < 100);
    const inside = positions.every(p => p[0] >= vp.x && p[0] <= vp.x + vp.w && p[1] >= vp.y && p[1] <= vp.y + vp.h);
    const se = await json("window.__se");
    await s.shot("w1_sweep_done");
    rec("W1 visible", ok && pressed && act >= 0 && drawn >= 12 && gaps === 0 && positions.length > 0 && closeToApex && inside && se.indexOf("Slash2") >= 0 && rows[act].n > 0,
      JSON.stringify({ apexScreen, vp: [vp.x, vp.y, vp.w, vp.h], fAct, drawnFrames: drawn, gapsInWindup: gaps, firstPositions: positions.slice(0, 3), closeToApex, inside, se }));
    const hits = rows.filter(x => x.hp < hp0).map(x => x.hp);
    rec("W2 timing", fDrop !== null && fDrop - fAct >= 10 && fDrop - fAct <= 14 && hits.every(x => x === hits[0]) && hp0 - hits[0] > 0 && lastVis >= 0 && rows[lastVis].f >= fAct + 10 && rows[lastVis].f < fDrop + 1,
      JSON.stringify({ hp: [hp0, hits[0]], fAct, fDrop, framesToHit: fDrop === null ? null : fDrop - fAct, lastVisibleFrame: lastVis >= 0 ? rows[lastVis].f - fAct : null, rows: rows.length }));
  });

  await check("W3 回避AI: 同じ配置(扇の外周近く)で、回避型は扇が見えてから動いて外れ、AIなしは当たる。AIは予知しない(扇が見える前は動かない)", async () => {
    const run = async arm => {
      await restart();
      await sleep(1200);
      const h = await heart(), hp0 = await heartHp();
      if (arm) await ev(`ProjectRSoulBattleDodge.arm({ profile: "evasive" }); 'ok'`);
      await sleep(900);
      const idle = await json("ProjectRSoulBattleDodge.getState()");
      await pointerTile(h.tx - 3.9, h.ty); await sleep(250);
      await installRec();
      const { rows } = await record(1600, () => pressSweep());
      const hp1 = await heartHp(), st = await json("ProjectRSoulBattleDodge.getState()");
      const moved = Math.max.apply(null, rows.map(x => Math.abs(x.hx - h.tx)));
      return { hp: [hp0, hp1], idleDodges: idle.stats ? idle.stats.dodges : 0, reason: st.lastDodge && st.lastDodge.reason, moved: Math.round(moved * 100) / 100, cues: st.stats && st.stats.sweepCues };
    };
    const ai = await run(true);
    await s.shot("w3_ai_evaded");
    const still = await run(false);
    rec("W3 ai", ai.hp[0] === ai.hp[1] && ai.reason === "sweep" && ai.moved > 0.4 && ai.idleDodges === 0 && ai.cues === 1 && still.hp[1] < still.hp[0],
      JSON.stringify({ evasive: ai, noAi: still }));
  });

  await check("W4 後片づけ: stop() で元のマップへ戻り、薙ぎ払いの錨・画面位置の差し替え・本体関数の差し替えは残らない", async () => {
    const stop = await json(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const st = await json(`${ME}.getStageStats()`);
    const left = await json(`({ anchors: ProjectRGodSummonVisual.getAnchors().length, ownScreenX: Object.prototype.hasOwnProperty.call($gamePlayer, 'screenX'), vfxDeferred: ProjectRPresentationVfx.play.toString().indexOf('deferred') >= 0, swingDeferred: ProjectRGodSummonVisual.swingWeapon.toString().indexOf('cap.swing') >= 0, trackDeferred: ProjectRUltimateGauge.trackDamage.toString().indexOf('captureSweep') >= 0, sweeping: ${ME}.getStageStats().sweeping })`);
    const w = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
    rec("W4 cleanup", stop.ok && back && w.map === origin.map && w.x === origin.x && w.y === origin.y && left.anchors === 0 && !left.ownScreenX && !left.vfxDeferred && !left.swingDeferred && !left.trackDeferred && left.sweeping === 0,
      JSON.stringify({ back, left, stats: st }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("WZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_sweep_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
