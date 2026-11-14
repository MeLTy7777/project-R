// 神の同行(ProjectR_FieldGodCompanion)の実機(Playtest)確認。F8 なし(Map001 の入口 → Map008)。
//   G1 4方向(マウスの向き)で、常駐の神がプレイヤーの背後に付く
//   G2 移動中・向きの変更中も追従する(瞬間移動しない・収束する)
//   G3 同じ神の表示は常に1体(スキルの演出中も)。演出が終わると常駐の神が背後へ戻る / 繰り返し
//   G4 中断・エンカウンターの終了・移動・孤児: 神のEvent・スプライトが残らない・重複しない
//   G5 性能・Console のエラーなし・保存の書き込みなし
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/field_god_verify.cjs   (新しいNW.jsセッションで実行する)
const { session } = require("./lib.cjs");
const FC = "ProjectRFieldCombat", GC = "ProjectRFieldGodCompanion", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session({ field: true }); const { ev, c, rec, sleep, aim } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } console.log("   [errors after " + id + ": " + s.errors().length + "]"); };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const place = async (x, y, dir) => { await ev(`$gamePlayer.locate(${x}, ${y}); $gamePlayer._realX = ${x}; $gamePlayer._realY = ${y}; ${dir ? `$gamePlayer.setDirection(${dir});` : ""} $gamePlayer.center(${x}, ${y}); 'ok'`); await sleep(500); };
  const waitMap = id => wait(`$gameMap.mapId() === ${id} && !$gamePlayer.isTransferring() && !!SceneManager._scene._spriteset && !$gameMap.isEventRunning()`, 25000);
  const enter = async () => { await ev(`${FC}.startEncounter({ encounterId: 'gd', battleMapId: 8, spawnX: 8, spawnY: 9, direction: 8, resultVariableId: 9 }); 'ok'`); await wait("$gameMap.mapId() === 8 && !$gamePlayer.isTransferring()", 20000); await wait(`${FC}.isActive()`, 15000); await sleep(1200); };
  const leave = async () => { await wait(`$gameMap.mapId() === 1 && !$gamePlayer.isTransferring() && ${FC}.getEncounterState().state === 'idle'`, 25000); await sleep(800); };
  const park = `${FC}.detachEnemy(1); ${FC}.detachEnemy(2); ${FC}.detachEnemy(3); $gameMap.event(1).locate(1, 1); $gameMap.event(2).locate(15, 1); $gameMap.event(3).locate(8, 1);`;
  // マウスでプレイヤーの向きを変える(戦闘中は ProjectR_PlayerFacing がマウスの方向へ向ける)
  const face = async d => { const v = { 8: [0, -4], 2: [0, 4], 4: [-4, 0], 6: [4, 0] }[d]; await aim(v[0], v[1]); await sleep(700); return ev("$gamePlayer.direction()"); };
  const godInfo = () => json(`(function(){ var vs = ProjectRGodSummonVisual.getVisuals().filter(function(v){ return v.kind === 'persistent'; }); var e = vs.length ? $gameMap.event(vs[0].eventId) : null; return e ? { dx: e._realX - $gamePlayer._realX, dy: e._realY - $gamePlayer._realY, transparent: e._transparent, id: e.eventId() } : null; })()`);
  // 描画の事実(スプライト): 神の表示Eventのスプライトで、見えているもの(visible・renderable・Event が透明でない)の数
  const spriteCount = `(function(){ var ts = SceneManager._scene._spriteset._tilemap, n = {}, total = 0; ts.children.forEach(function(sp){ var ch = sp && sp._character; if (!ch || typeof ch.eventId !== 'function' || !ch.event || !ch.event() || !/projectRGodVisual/.test(ch.event().note || '')) return; total++; if (sp.visible !== false && sp.renderable !== false && !ch._transparent && !ch._erased && ch._characterName) n[ch._characterName] = (n[ch._characterName] || 0) + 1; }); return { n: n, total: total }; })()`;
  const recorder = `(function(){ if (window.__rec) return 'ok'; window.__rec = { frames: [], on: false }; var o = Spriteset_Map.prototype.update; Spriteset_Map.prototype.update = function(){ var r = o.apply(this, arguments); if (window.__rec.on) { try { var vs = ProjectRGodSummonVisual.getVisuals(), per = vs.filter(function(v){ return v.kind === 'persistent'; })[0], e = per ? $gameMap.event(per.eventId) : null; var c = ${spriteCount}; window.__rec.frames.push({ dx: e ? e._realX - $gamePlayer._realX : null, dy: e ? e._realY - $gamePlayer._realY : null, dir: $gamePlayer.direction(), n: c.n, total: c.total, kinds: vs.map(function(v){ return v.kind; }).join(','), px: $gamePlayer._realX, py: $gamePlayer._realY, gx: e ? e._realX : null, gy: e ? e._realY : null }); } catch (x) {} } return r; }; return 'ok'; })()`;
  const rec0 = () => ev("window.__rec.frames = []; window.__rec.on = true; 'ok'"), recStop = async () => { await ev("window.__rec.on = false; 'ok'"); return json("window.__rec.frames"); };

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await waitMap(1); await sleep(1500);
  await ev("window.__writes = 0; StorageManager.saveObject = function() { window.__writes++; return Promise.reject(new Error('blocked by test')); }; 'ok'");
  await ev(`(function(){ var it = new Game_Interpreter(); it.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', 'AcquireHermesRing', {}] }, { code: 0, indent: 0, parameters: [] }], 0); for (var i = 0; i < 20 && it.isRunning(); i++) it.update(); $gameParty.gainItem($dataItems[7], 3); return 'ok'; })()`);
  await ev(recorder);

  await check("G1 4方向で背後", async () => {
    const before = await json(`({ tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length, cfg: ${GC} && ${GC}.getConfig() })`);
    rec("G1a 探索マップには神の表示Eventがない / プラグインが読み込まれている", before.tagged === 0 && before.cfg && before.cfg.enabled === true, JSON.stringify(before));
    await enter(); await ev(`${park} 'ok'`);
    const st = await json(`({ persistent: ProjectRGodSummonManager.getPersistentUltimateStatus(), visuals: ProjectRGodSummonVisual.getVisuals() })`);
    rec("G1b 戦闘に入ると、常駐のヘルメースの表示が1体だけ出る", st.persistent === "active" && st.visuals.length === 1 && st.visuals[0].kind === "persistent" && st.visuals[0].godId === "hermes", JSON.stringify(st));
    const cfg = await json(`${GC}.getConfig()`); const B = cfg.behindTiles, L = cfg.liftTiles, E = cfg.southExtraTiles, Nn = cfg.northExtraTiles;
    const expectOf = { 8: [0, B + L + E], 2: [0, -B + L - Nn], 4: [B, L], 6: [-B, L] };                      // 北向き = 神は南側 → 絵の高さぶん、少し下げる(SouthExtraTiles)
    const rows = [];
    for (const d of [8, 6, 2, 4, 8, 2]) {
      const got = await face(d); const g = await godInfo();
      const e = expectOf[d];
      rows.push({ want: d, got, dx: +g.dx.toFixed(3), dy: +g.dy.toFixed(3), expect: e.map(v => +v.toFixed(3)), ok: got === d && Math.abs(g.dx - e[0]) < 0.06 && Math.abs(g.dy - e[1]) < 0.06 });
    }
    rec("G1c 上・右・下・左・上・下の向きで、神がプレイヤーの背後(向きの反対側)にいる", rows.every(r => r.ok), JSON.stringify(rows));
    await s.shot("gd_G1");
  });

  await check("G2 移動中・向きの変更中", async () => {
    await ev(`${park} 'ok'`); await place(8, 9, 8); await face(8); await sleep(500);
    await rec0();
    // 向きを 上 → 下 → 左 → 右 と素早く変える(移動しながら)
    await c.keyDown("D"); await face(8); await face(2); await face(4); await face(6); await c.keyUp("D");
    await c.keyDown("A"); await face(6); await face(4); await c.keyUp("A"); await sleep(600);
    const f = await recStop();
    let maxJump = 0, maxDist = 0, n = 0;
    for (let i = 1; i < f.length; i++) { if (f[i].dx === null || f[i - 1].dx === null) continue; n++; maxJump = Math.max(maxJump, Math.hypot((f[i].dx - f[i - 1].dx), (f[i].dy - f[i - 1].dy))); maxDist = Math.max(maxDist, Math.hypot(f[i].dx, f[i].dy)); }
    const cfg = await json(`${GC}.getConfig()`); const last = f[f.length - 1];
    rec("G2a 向きを素早く変えても、神は瞬間移動しない(1フレームの相対位置の変化が小さい: 上下は約 2 マス離れるので、北 ↔ 南に回る最初の1フレームは最大 約 1.0)/ 常にプレイヤーの近く", n > 100 && maxJump < 1.1 && maxDist < 2.4, JSON.stringify({ frames: n, maxJump: +maxJump.toFixed(3), maxDist: +maxDist.toFixed(3) }));
    rec("G2b 移動と向きが落ち着くと、神は背後の位置に収束する(左向き → 背後は右)", last.dir === 4 && Math.abs(last.dx - cfg.behindTiles) < 0.06 && Math.abs(last.dy - cfg.liftTiles) < 0.06, JSON.stringify({ last: { dir: last.dir, dx: last.dx, dy: last.dy } }));
    // 移動: プレイヤーが動いた分だけ神も動く(相対位置が保たれる)
    await place(8, 9, 8); await face(2); await sleep(400);
    const p0 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"), g0 = await godInfo();
    await c.keyDown("A"); await sleep(900); await c.keyUp("A"); await sleep(500);
    const p1 = await json("({ x: $gamePlayer._realX, y: $gamePlayer._realY })"), g1 = await godInfo();
    // マウスは画面に固定(Map008 は画面より小さく、スクロールしない)。プレイヤーが動くと、マウスとの角度が変わり、向き(8方向)が変わる。神は「いまの向きの背後」にいる
    const aim1 = await json("ProjectRFieldFacing.getAim()"), cfg1 = await json(`${GC}.getConfig()`);
    const want = [-aim1.vx * cfg1.behindTiles, -aim1.vy * cfg1.behindTiles + cfg1.liftTiles + (-aim1.vy > 0 ? -aim1.vy * cfg1.southExtraTiles : -aim1.vy * cfg1.northExtraTiles)];
    rec("G2c 歩いて(左へ)移動しても、神は付いてきて、いまの向き(8方向)の背後にいる", p1.x < p0.x - 1 && Math.abs(g1.dx - want[0]) < 0.07 && Math.abs(g1.dy - want[1]) < 0.07, JSON.stringify({ p0, p1, g0, g1, aim: aim1.name, want }));
  });

  await check("G3 1体だけ・スキルの演出", async () => {
    await ev(`${park} 'ok'`); await place(8, 9, 8); await face(8); await sleep(500);
    await rec0();
    const used = [];
    for (let i = 0; i < 3; i++) {                                        // 一閃(Q)を繰り返す(Cooldown 7秒)
      await ev("window.__q = null; 'ok'");
      const r = await json(`${FC}.useAbility('special', 'test')`); used.push(r && r.ok === true);
      await sleep(i < 2 ? 7600 : 2500);
    }
    for (let i = 0; i < 4; i++) { const r = await json(`${FC}.useAbility('mobility', 'test')`); used.push(r && r.ok === true); await sleep(3300); await place(8, 9, 8); await face(8); }
    const f = await recStop();
    const maxVisible = f.reduce((m, r) => Math.max(m, ...Object.values(r.n || {}), 0), 0);
    const hadTransient = f.some(r => /transient/.test(r.kinds)), hadHidden = f.some(r => /transient/.test(r.kinds) && (r.n["!Crystal"] || 0) === 1 && (r.total || 0) >= 2);
    const total2 = f.filter(r => (r.total || 0) >= 2).length;
    const gap = f.filter(r => (r.total || 0) >= 1 && Object.keys(r.n || {}).length === 0).length;
    rec("G3a スキル(一閃 ×3・絶 ×4)を繰り返しても、同じ神(ヘルメース)の見えている表示は、全フレームで1体以下 / 神が1フレームも消えない(演出の切り替え)", used.filter(Boolean).length >= 5 && maxVisible <= 1 && hadTransient && total2 > 0 && gap === 0, JSON.stringify({ used, frames: f.length, maxVisible, hadTransient, hadHidden, framesWithTwoEvents: total2, gapFrames: gap }));
    const after = await json(`({ vis: ${GC}.getVisibleGods(), state: ${GC}.getState(), diag: ${GC}.getDiagnostics(), count: ${spriteCount} })`);
    const g = await godInfo(); const cfg = await json(`${GC}.getConfig()`);
    rec("G3b 演出が終わると、常駐の神が1体だけ戻り、背後(向き=上 → 背後は下)にいる / 隠したままにならない", after.vis.hermes === 1 && g && g.transparent === false && Math.abs(g.dx) < 0.06 && Math.abs(g.dy - (cfg.behindTiles + cfg.liftTiles + cfg.southExtraTiles)) < 0.06 && after.diag.hides >= 1 && after.diag.shows >= 1, JSON.stringify({ vis: after.vis, g, diag: after.diag }));
    // 神のスキル(一閃)が表示するEvent(一時召喚)が、実際に出ていた(演出が省略されていない)
    rec("G3c 演出中は、一時召喚の表示が1体出て、その間は常駐の神を隠している(同時に2体見えるフレームがない)", hadTransient && f.filter(r => /transient/.test(r.kinds) && /persistent/.test(r.kinds)).every(r => (r.n["!Crystal"] || 0) <= 1) && f.some(r => /transient/.test(r.kinds) && /persistent/.test(r.kinds)), JSON.stringify({ both: f.filter(r => /transient/.test(r.kinds) && /persistent/.test(r.kinds)).length, sample: f.find(r => /transient/.test(r.kinds)) }));
    await s.shot("gd_G3");
  });

  await check("G4 中断・終了・移動・孤児", async () => {
    // 演出中に撤退(中断)
    await ev(`${park} 'ok'`); await place(8, 9, 8);
    await json(`${FC}.useAbility('special', 'test')`); await sleep(250);
    const mid = await json(`({ vis: ${GV}.getVisuals().map(function(v){ return v.kind; }), count: ${spriteCount} })`);
    await ev(`${FC}.abortEncounter('mid-skill'); 'ok'`); await leave();
    const left = await json(`({ tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length, visuals: ${GV}.getVisuals().length, followers: ${GV}.getFollowers().length, count: ${spriteCount}, diag: ${GC}.getDiagnostics(), hidden: $gameMap.events().filter(function(e){ return e._projectRCompanionHidden; }).length })`);
    rec("G4a スキルの演出中に撤退しても、探索マップへ戻ったあと、神のEvent・スプライットが残らない(孤児・隠したままのEventなし)", mid.vis.length >= 1 && left.tagged === 0 && left.visuals === 0 && left.followers === 0 && left.count.total === 0 && left.diag.staleSprites === 0 && left.hidden === 0, JSON.stringify({ mid, left }));
    // 繰り返しのエンカウンター: 毎回、常駐の神は1体・再入場しても重複しない
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await enter(); await ev(`${park} 'ok'`); await place(8, 9, 8);
      await json(`${FC}.useAbility('mobility', 'test')`); await sleep(500);
      const r = await json(`({ tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || '') && !e._erased; }).length, vis: ${GC}.getVisibleGods(), diag: ${GC}.getDiagnostics() })`);
      runs.push({ tagged: r.tagged, vis: r.vis.hermes || 0, stale: r.diag.staleSprites });
      await sleep(2500);
      await ev(`${FC}.abortEncounter('rep'); 'ok'`); await leave();
      runs[runs.length - 1].after = await json(`$gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length`);
    }
    rec("G4b 3回の繰り返し(入る → 絶 → 撤退): 毎回、見えている神は1体・神のEventは多くても2(常駐 + 演出中の一時召喚)・戻ると0", runs.every(r => r.vis <= 1 && r.tagged <= 2 && r.after === 0 && r.stale === 0), JSON.stringify(runs));
    // 孤児の片づけ: 管理外の神の表示Event(テンプレートから直接生成)は、数フレームで片づく
    await enter(); await ev(`${park} 'ok'`); await place(8, 9, 8);
    const orphan = await json(`(function(){ var tid = ${GV}.getDiagnostics().templateEventId; var id = $gameMap.spawnEvent(tid, 6, 9, false); var e = $gameMap.event(id); e.setImage('!Crystal', 0); return { tid: tid, id: id, tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || '') && !e._erased; }).length }; })()`);
    await sleep(400);
    const after = await json(`({ erased: !$gameMap.event(${orphan.id}) || $gameMap.event(${orphan.id})._erased === true, tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || '') && !e._erased; }).length, vis: ${GC}.getVisibleGods(), diag: ${GC}.getDiagnostics() })`);
    rec("G4c 管理外の神の表示Event(孤児)は、数フレームで片づく。常駐の神は1体のまま", orphan.id > 0 && orphan.tagged === 2 && after.erased && after.tagged === 1 && (after.vis.hermes || 0) === 1 && after.diag.orphansRemoved >= 1, JSON.stringify({ orphan, after }));
    // 場所移動(戦闘マップ → 探索マップ)・ロード: 状態を持ち越さない
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
    const tr = await json(`({ tracked: ${GC}.getDiagnostics().tracked, tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length })`);
    await ev("window.__base = JsonEx.stringify(DataManager.makeSaveContents()); 'ok'");
    await ev("SceneManager.goto(Scene_Title); 'ok'"); await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging()", 15000); await sleep(500);
    await ev("DataManager.extractSaveContents(JsonEx.parse(window.__base)); SceneManager.goto(Scene_Map); 'ok'"); await waitMap(1); await sleep(1200);
    const ld = await json(`({ tracked: ${GC}.getDiagnostics().tracked, tagged: $gameMap.events().filter(function(e){ return /projectRGodVisual/.test((e.event() && e.event().note) || ''); }).length, vis: ${GV}.getVisuals().length })`);
    rec("G4d 場所移動・ロードのあと、神のEventも追従の状態も残らない", tr.tracked === 0 && tr.tagged === 0 && ld.tracked === 0 && ld.tagged === 0 && ld.vis === 0, JSON.stringify({ tr, ld }));
    // 再度入って、ふつうに1体
    await enter(); await ev(`${park} 'ok'`); await sleep(500);
    const again = await json(`${GC}.getVisibleGods()`);
    rec("G4e ロード後の入り直しでも、神は1体", (again.hermes || 0) === 1, JSON.stringify(again));
    await ev(`${FC}.abortEncounter('t'); 'ok'`); await leave();
  });

  await check("G5 性能・エラー・保存", async () => {
    await enter(); await ev(`${park} 'ok'`); await place(8, 9, 8); await face(8);
    const measure = async enabled => {
      await ev(`${GC}.setConfig({ enabled: ${enabled} }); 'ok'`);
      await ev("(function(){ var o = Game_Map.prototype.update; window.__ms = []; window.__origGM = o; Game_Map.prototype.update = function(){ var t = performance.now(); var r = o.apply(this, arguments); window.__ms.push(performance.now() - t); return r; }; return 'ok'; })()");
      const n0 = await ev("window.__ms.length"), t0 = Date.now();
      await c.keyDown("A"); await sleep(1000); await c.keyUp("A"); await c.keyDown("D"); await sleep(1000); await c.keyUp("D");
      const n1 = await ev("window.__ms.length"), t1 = Date.now();
      const r = await json("(function(){ Game_Map.prototype.update = window.__origGM; var a = window.__ms.slice().sort(function(x,y){return x-y}); return { frames: a.length, avgMs: +(a.reduce(function(s,x){return s+x},0)/a.length).toFixed(3), p95Ms: +a[Math.floor(a.length*0.95)].toFixed(3) }; })()");
      return { enabled, ...r, fps: +((n1 - n0) * 1000 / (t1 - t0)).toFixed(1) };
    };
    const on = await measure(true), off = await measure(false);
    await ev(`${GC}.resetConfig(); 'ok'`);
    rec("G5a 神の同行の負荷は小さい(Game_Map.update の増加 < 0.5ms)/ 約60fps", on.fps > 52 && on.avgMs - off.avgMs < 0.5, JSON.stringify({ on, off }));
    await ev(`${FC}.abortEncounter('end'); 'ok'`); await leave();
    const errs = s.errors(), writes = await ev("window.__writes");
    rec("G5b Console のエラーなし / 保存の書き込みなし", errs.length === 0 && writes === 0, JSON.stringify({ errs: errs.slice(0, 3), writes }));
  });

  const fails = s.results.filter(r => !r.ok);
  console.log(`\n${s.results.length - fails.length}/${s.results.length} PASS`);
  require("fs").writeFileSync((process.env.MZ_OUT || "mz_out") + "/field_god_verify.json", JSON.stringify(s.results, null, 1));
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error("ERR", e.stack || e); process.exit(1); });
