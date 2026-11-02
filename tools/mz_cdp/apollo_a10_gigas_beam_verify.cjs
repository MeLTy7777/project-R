// Phase Apollo-A10: 実機(Playtest)の確認 — ギガース殺し Lv3: 幅3マスの「1本」のビーム。絵の幅と当たり判定の幅が一致する。
//   G1: 撃つのは1本(ビームの記録が1つ・絵は幅3マスの1列(apollo_gigas.beam)・レーンの絵なし)。絵のSpriteの横幅(不透明部分)が3マス・中心が当たり判定(撃つ位置の中心線)と一致。
//   G2: 当たり判定の幅は3マス全体: 横 +1.4 / -1.4 の敵は11ヒット、横 +2.6 の敵は当たらない。継ぎ目(横 0.5)の敵も11ヒット(3倍にならない)。消費は1回。
//   G3: 一部が壁で遮られたときは、隣り合う3枚(幅1マス)で描き、遮られた帯だけ短い。判定も同じ長さ。
//   G4: 終わると絵・錨・召喚・Eventが残らない。Consoleのエラーなし。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a10_gigas_beam_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const API = "ProjectRApolloGigasSlayer";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const resetHp = () => ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
  const lost = async id => 1000000 - await barHp(id);
  const PX = 6, PY = 15;
  const scene = async enemies => {
    const started = await json("ProjectRApolloTest.start(3, 'gigas')");
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(40 - id, 3); }); return 'ok'; })()");
    await s.place(PX, PY); await sleep(500);
    for (const [id, x, y] of enemies) await locate(id, x, y);
    await resetHp(); await sleep(200);
    await s.aim(3, 0); await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const idle = async () => wait(`${API}.getShots().length === 0 && !${API}.isPending()`, 30000);
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };
  // ビームの絵(Sprite)の幾何: 各区間の「不透明部分」の横幅と、画面上での位置を、当たり判定の中心線(撃つ位置の中心)と比べる。狙い90度(右)なので、横 = 画面の縦。
  const geometry = (pattern) => json(`(function() {
    var pics = (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')) && p.sprite && p.sprite.bitmap; });
    var tile = $gameMap.tileWidth(), cp = $gamePlayer.centerPositionPoint();
    var originY = (cp.y - $gameMap.displayY()) * tile, originX = (cp.x - $gameMap.displayX()) * tile;
    var rows = pics.map(function(p) {
      var sp = p.sprite, b = sp.getBounds(), bm = sp.bitmap, f = sp._frame || { x: 0, y: 0, width: bm.width, height: bm.height };
      var data = bm.context.getImageData(f.x, f.y, f.width, f.height).data, minX = f.width, maxX = -1;
      for (var y = 0; y < f.height; y += 4) for (var x = 0; x < f.width; x++) { if (data[(y * f.width + x) * 4 + 3] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; } }
      var sc = Math.abs(sp.scale.x) || 1, opaqueW = (maxX - minX + 1) * sc, off = ((minX + maxX + 1) / 2 - f.width / 2) * sc;
      return { note: p.note, rot: sp.rotation, frame: [f.width, f.height], scale: sc, opaquePx: opaqueW, opaqueTiles: opaqueW / tile, artCenterOffsetTiles: off / tile,
        boundsY: [b.y, b.y + b.height], boundsX: [b.x, b.x + b.width], centerY: b.y + b.height / 2, centerX: b.x + b.width / 2, alpha: sp.alpha, visible: sp.visible };
    });
    return { tile: tile, originX: originX, originY: originY, count: rows.length, rows: rows };
  })()`);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("G0 画面(スクリーンショット): 撃った直後の1本のビーム(幅3マス)を撮る。数値の確認は G1", async () => {
    await scene([[4, PX + 9, PY]]);
    await fireTap();
    await wait(`(${API}.getShots()[0] || {}).phase === 'beam'`, 6000);
    await s.shot("g0_beam_fresh");
    await idle(); await sleep(300);
    rec("G0 screenshot", true, "g0_beam_fresh.png");
    await cooldown();
  });

  await check("G1 1本のビーム: 絵は幅3マスの1列(apollo_gigas.beam)・レーンの絵なし。Spriteの不透明部分の横幅 = 3マス、中心 = 当たり判定の中心線", async () => {
    await scene([[4, PX + 9, PY]]);
    await fireTap();
    await wait(`(${API}.getShots()[0] || {}).phase === 'beam'`, 6000); await sleep(250);
    const shots = await json(`${API}.getShots()`), beam = await json(`${API}.getBeam()`);
    const g = await geometry("/apollo_gigas\\.beam(?!lane)/"), lanes = await geometry("/apollo_gigas\\.beamlane/");
    await s.shot("g1_beam"); await sleep(120); await s.shot("g1_beam_b");
    const widths = g.rows.map(r => r.opaqueTiles), centers = g.rows.map(r => (r.centerY - g.originY) / g.tile);
    const maxCenterErr = Math.max(...centers.map(Math.abs));
    // 区間は3マスごとに並ぶ(画面外へ出るぶんは数えない): 同じ列(同じ横の中心)であること
    const sameLine = Math.max(...g.rows.map(r => r.centerY)) - Math.min(...g.rows.map(r => r.centerY));
    rec("G1 one-beam", shots.length === 1 && !!beam && g.count >= 3 && lanes.count === 0 && widths.every(w => Math.abs(w - 3) < 0.15) && maxCenterErr < 0.1 && sameLine < 4,
      JSON.stringify({ shots: shots.length, beamLimit: beam && beam.limit, segs: g.count, lanePics: lanes.count, widthsTiles: widths.slice(0, 4).map(w => +w.toFixed(3)), centerErrTiles: +maxCenterErr.toFixed(3), sameLinePx: +sameLine.toFixed(2),
        all: g.rows.map(r => [Math.round(r.centerX), Math.round(r.centerY), +(r.alpha).toFixed(2), r.visible, +r.opaqueTiles.toFixed(2)]), sample: g.rows[0] && { frame: g.rows[0].frame, scale: g.rows[0].scale, rot: g.rows[0].rot, artCenterOffsetTiles: +g.rows[0].artCenterOffsetTiles.toFixed(3), boundsY: g.rows[0].boundsY, originY: g.originY } }));
    await idle(); await sleep(300);
    await cooldown();
  });

  await check("G2 判定の幅は3マス全体: 横+1.4 / -1.4 の敵は11ヒット、横+2.6は当たらない。継ぎ目(横0.5)の敵も11ヒット。消費は1回", async () => {
    await scene([[4, PX + 7, PY + 1.4], [5, PX + 7, PY - 1.4], [6, PX + 7, PY + 2.6], [3, PX + 11, PY + 0.5]]);
    await fireTap(); await idle(); await sleep(400);
    const last = await json(`${API}.getLastResult()`);
    const by = Object.fromEntries((last.targets || []).map(t => [t.eventId, t.hits]));
    const pile = await json("(function() { var b = ProjectRCardDeck.getBattleState(); return b.cooldownPile.filter(function(e) { return e.instance.cardId === 'apollo_gigas_slayer'; }).length; })()");
    rec("G2 hitbox-width", by[4] === 11 && by[5] === 11 && by[3] === 11 && by[6] === undefined && (await lost(6)) === 0 && (await lost(4)) === 100 + 10 * 220 && pile === 1, JSON.stringify({ by, lost4: await lost(4), lost6: await lost(6), pile }));
    await cooldown();
  });

  await check("G3 一部が壁で遮られたとき: 隣り合う3枚(幅1マス)で描き、遮られた帯だけ短い。判定も同じ長さ", async () => {
    await scene([[4, PX + 12, PY + 1.2]]); // 敵の体は撃つ位置の中心線から +1.08〜+2.08 ではなく、実機では+0.12ずれる(体 15.88〜16.88 など)ので、帯3(横+0.5〜+1.5)の中に収まるよう +1.2 に置く
    await ev(`(function() { var m = $dataMap, size = m.width * m.height; m.data[5 * size + ${PY + 1} * m.width + ${PX + 4}] = 255; return 'wall'; })()`);
    await fireTap();
    await wait(`(${API}.getShots()[0] || {}).phase === 'beam'`, 6000); await sleep(250);
    const beam = await json(`${API}.getBeam()`);
    const diag = await json(`(function() { var cp = $gamePlayer.centerPositionPoint(), occ = ProjectR.CombatOcclusion, poly = occ.eventPolygon($gameMap.event(4)), g = ProjectRApolloGoldenVolley.geometry, lanes = g.buildLanes({ x: cp.x, y: cp.y }, 90, 3, 60).map(function(l) { return [l.index, +l.limit.toFixed(2)]; });
      return { center: [cp.x, cp.y], region: $gameMap.regionId(${PX + 4}, ${PY + 1}), poly: poly.map(function(p) { return [+p.x.toFixed(2), +p.y.toFixed(2)]; }), lanes: lanes }; })()`);
    const lanes = await geometry("/apollo_gigas\\.beamlane/"), whole = await geometry("/apollo_gigas\\.beam(?!lane)/");
    await s.shot("g3_blocked");
    const ys = lanes.rows.map(r => +((r.centerY - lanes.originY) / lanes.tile).toFixed(2));
    const distinct = [...new Set(ys.map(y => Math.round(y)))].sort((a, b) => a - b);
    await idle(); await sleep(300);
    const lost4 = await lost(4);
    await ev(`(function() { var m = $dataMap, size = m.width * m.height; m.data[5 * size + ${PY + 1} * m.width + ${PX + 4}] = 0; return 'wall off'; })()`);
    rec("G3 blocked-lane", lanes.count >= 3 && whole.count === 0 && JSON.stringify(distinct) === "[-1,0,1]" && lost4 === 0, JSON.stringify({ lanePics: lanes.count, wholePics: whole.count, lateralCentersTiles: distinct, beamLimit: beam && beam.limit, lost4, diag }));
    await cooldown();
  });

  await check("G4 後片付け: 絵・錨・召喚・Eventが残らない", async () => {
    await scene([[4, PX + 9, PY]]);
    await fireTap(); await idle(); await sleep(1500);
    const left = await json(`({ pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_(volley|gigas|charge)/.test(String(p.note || '')); }).length, anchors: ProjectRGodSummonVisual.getAnchors().length, followers: ProjectRGodSummonVisual.getFollowers().length,
      summons: ProjectRGodSummonManager.getActiveSummons().length, arrows: $gameMap.events().filter(function(e) { return e && /projectRGigasArrow/.test(e.event().note || ''); }).length, jobs: ${API}.getActiveVfxJobs().length })`);
    rec("G4 cleanup", left.pics === 0 && left.anchors === 0 && left.followers === 0 && left.summons === 0 && left.arrows === 0 && left.jobs === 0, JSON.stringify(left));
  });

  rec("GZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a10_gigas_beam_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
