// Phase Apollo-A11: 実機(Playtest)の確認 — 黄金の矢 Lv3 のビームの絵の幅・中心が、当たり判定(幅3マス)と一致する。
//   各方向(横・縦・斜め2方向)で、ビームの絵のSprite(不透明部分の幅・中心の横ずれ)を測る。比較用に、従来の共有の絵(apollo_volley.beam)を同じ条件で再生して測る(= 修正前)。
//   B1: 横 / 縦(上) / 斜め45度 / 斜め135度: 実際のビームの絵 = 幅3マス・中心のずれ ~0。従来の絵 = 約2.46マス・中心が約0.4マスずれ。
//   B2: 遮られたとき(横・縦): 隣り合う3枚(帯の中心 -1 / 0 / +1)で、遮られた帯だけ短く、絵の長さ = 判定の帯の長さ(画面の対角線まで)。
//   B3: 判定は従来どおり: 横 +1.4 / -1.4 の敵は11ヒット(50 x 11)、+2.6は当たらない。消費は1回。
//   B4: 終わると絵・錨・召喚・Eventが残らない。ギガース殺しの絵(apollo_gigas.*)は別のまま。Consoleのエラーなし。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a11_golden_beam_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const API = "ProjectRApolloGoldenVolley";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(20); } return false; };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const resetHp = () => ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
  const lost = async id => 1000000 - await barHp(id);
  const PX = 100, PY = 60; // 壁の無い広い地図(200x120。アリーナの床を置き換え。メモリ上だけ)の中央。どの向きにも、画面に映る範囲より長いビームが撃てる
  const scene = async enemies => {
    const started = await json("ProjectRApolloTest.start(3, 'golden')");
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(2 + id, 118); }); return 'ok'; })()");
    await s.place(PX, PY); await sleep(500);
    for (const [id, x, y] of enemies) await locate(id, x, y);
    await resetHp(); await sleep(200);
  };
  const holdFire = async () => { await c.keyDown("Q"); await sleep(700); await c.keyUp("Q"); };
  const idle = async () => wait(`!${API}.getBeam() && !${API}.isPending() && ${API}.getActiveArrows().length === 0`, 30000);
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };
  // ビームの絵(Sprite)の幾何。degree = 発射の向き(0=上・時計回り)。lateral = 撃つ位置の中心線(当たり判定の中心線)からの横ずれ(マス)、along = 進行方向の位置(マス)。
  const geometry = (pattern, degree) => json(`(function() {
    var pics = (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')) && p.sprite && p.sprite.bitmap; });
    var tile = $gameMap.tileWidth(), cp = $gamePlayer.centerPositionPoint(), rad = ${degree} * Math.PI / 180;
    var ox = (cp.x - $gameMap.displayX()) * tile, oy = (cp.y - $gameMap.displayY()) * tile, ux = Math.sin(rad), uy = -Math.cos(rad), nx = -uy, ny = ux;
    var rows = pics.map(function(p) {
      var sp = p.sprite, b = sp.getBounds(), bm = sp.bitmap, f = sp._frame || { x: 0, y: 0, width: bm.width, height: bm.height };
      var data = bm.context.getImageData(f.x, f.y, f.width, f.height).data, minX = f.width, maxX = -1;
      for (var y = 0; y < f.height; y += 4) for (var x = 0; x < f.width; x++) { if (data[(y * f.width + x) * 4 + 3] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; } }
      var sc = Math.abs(sp.scale.x) || 1, cx = b.x + b.width / 2, cy = b.y + b.height / 2, dx = cx - ox, dy = cy - oy;
      return { note: String(p.note).slice(0, 40), opaqueTiles: (maxX - minX + 1) * sc / tile, lateral: (dx * nx + dy * ny) / tile, along: (dx * ux + dy * uy) / tile, frame: [f.width, f.height] };
    });
    return { count: rows.length, rows: rows };
  })()`);
  const stopAll = () => ev("ProjectRPresentationVfx.clear && ProjectRPresentationVfx.clear(); 'cleared'");
  const legacy = async degree => { // 従来の共有の絵を、同じ条件(撃つ位置の中心・向き・長さ12)で再生して測る
    await ev(`(function() { var cp = $gamePlayer.centerPositionPoint(); window.__legacy = ProjectRPresentationVfx.play('apollo_volley.beam', { degree: ${degree}, length: 12, instance: 'legacy', origin: { x: cp.x, y: cp.y } }); return 'ok'; })()`);
    await sleep(200);
    const g = await geometry("/apollo_volley\\.beam(?!lane)/", degree);
    await stopAll(); await sleep(300);
    return g;
  };
  const summary = g => ({ n: g.count, width: +(g.rows.reduce((a, r) => a + r.opaqueTiles, 0) / Math.max(1, g.count)).toFixed(3), lateral: +(g.rows.reduce((a, r) => a + r.lateral, 0) / Math.max(1, g.count)).toFixed(3), maxAbsLateral: +Math.max(...g.rows.map(r => Math.abs(r.lateral))).toFixed(3) });

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev(`(function() { var o = DataManager.onLoad; window.__bigMap = { w: 200, h: 120 };
    DataManager.onLoad = function(obj) { if (obj === window.$dataMap && window.__bigMap && obj.width === 50 && obj.height === 36) {
      var W = window.__bigMap.w, H = window.__bigMap.h, floor = obj.data[15 * obj.width + 12], d = new Array(W * H * 6).fill(0); for (var i = 0; i < W * H; i++) d[i] = floor; obj.width = W; obj.height = H; obj.data = d; }
      return o.apply(this, arguments); }; return 'hook'; })()`);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("B0 画面(スクリーンショット): 撃った直後の1本のビーム(幅3マス)", async () => {
    await scene([]);
    await s.aim(5, 0); await sleep(200);
    await holdFire();
    await wait(`!!${API}.getBeam()`, 6000);
    await s.shot("b0_golden_beam_fresh");
    await idle(); await sleep(300);
    rec("B0 screenshot", true, "b0_golden_beam_fresh.png");
    await cooldown();
  });

  const directions = [["horizontal", 90, 5, 0], ["vertical(up)", 0, 0, -5], ["diagonal 45", 45, 4, -4], ["diagonal 135", 135, 4, 4]];
  await check("B1 絵の幅と中心(横・縦・斜め2方向): 実際のビーム = 幅3マス・中心のずれ ~0。従来の絵(比較)= 約2.46マス・約0.4マスずれ", async () => {
    const out = [];
    for (const [name, degree, dx, dy] of directions) {
      await scene([]);
      const before = summary(await legacy(degree));
      await s.aim(dx, dy); await sleep(200);
      await holdFire();
      await wait(`!!${API}.getBeam()`, 6000); await sleep(120);
      const shots = await json(`${API}.getBeam() ? 1 : 0`);
      const g = await geometry("/apollo_golden\\.beam(?!lane)/", degree), lanePics = (await geometry("/apollo_golden\\.beamlane/", degree)).count, old = (await geometry("/apollo_volley\\.beam/", degree)).count;
      const after = summary(g);
      out.push({ name, degree, before, after, shots, lanePics, oldPics: old });
      await idle(); await sleep(300); await cooldown();
    }
    const ok = out.every(r => r.after.n >= 2 && Math.abs(r.after.width - 3) < 0.15 && r.after.maxAbsLateral < 0.1 && r.lanePics === 0 && r.oldPics === 0 && r.before.width < 2.6); // 従来の絵は幅が約2.42マス(縦では中心のずれが進行方向に出るので、横ずれは0)
    rec("B1 width-center", ok, JSON.stringify(out));
  });

  await check("B2 遮られたとき(横・縦): 隣り合う3枚(帯の中心 -1 / 0 / +1)で、遮られた帯だけ短く、絵の長さ = 判定の帯の長さ", async () => {
    const out = [];
    for (const [name, degree, dx, dy, wallX, wallY] of [["horizontal", 90, 5, 0, PX + 4, PY + 1], ["vertical(up)", 0, 0, -5, PX + 1, PY - 4], ["diagonal 45", 45, 4, -4, Math.floor(PX + 0.5 + Math.SQRT1_2 * 6 + Math.SQRT1_2), Math.floor(PY + 0.5 - Math.SQRT1_2 * 6 + Math.SQRT1_2)]]) {
      await scene([]);
      await ev(`(function() { var m = $dataMap, size = m.width * m.height; m.data[5 * size + ${wallY} * m.width + ${wallX}] = 255; return 'wall'; })()`);
      await s.aim(dx, dy); await sleep(200);
      await holdFire();
      await wait(`!!${API}.getBeam()`, 6000); await sleep(120);
      const lanes = await geometry("/apollo_golden\\.beamlane/", degree), whole = (await geometry("/apollo_golden\\.beam(?!lane)/", degree)).count;
      const expect = await json(`(function() { var cp = $gamePlayer.centerPositionPoint(), g = ${API}.geometry, vr = ${API}.visualReach(); return g.buildLanes({ x: cp.x, y: cp.y }, ${degree}, 3, 200).map(function(l) { return { center: l.center, end: Math.min(l.limit, vr) }; }); })()`);
      const byLane = {};
      for (const r of lanes.rows) { const k = Math.round(r.lateral); byLane[k] = byLane[k] || { n: 0, end: 0, maxLat: 0 }; byLane[k].n++; byLane[k].end = Math.max(byLane[k].end, r.along + 1); byLane[k].maxLat = Math.max(byLane[k].maxLat, Math.abs(r.lateral - k)); }
      const rows = expect.map(e => ({ lane: e.center, expectedEnd: +e.end.toFixed(2), drawnEnd: +(byLane[e.center]?.end ?? -1).toFixed(2), maxLateralErr: +(byLane[e.center]?.maxLat ?? 9).toFixed(3) }));
      out.push({ name, whole, rows });
      await idle(); await sleep(300); await ev(`(function() { var m = $dataMap, size = m.width * m.height; m.data[5 * size + ${wallY} * m.width + ${wallX}] = 0; return 'off'; })()`); await cooldown();
    }
    const ok = out.every(r => r.whole === 0 && r.rows.every(x => Math.abs(x.drawnEnd - x.expectedEnd) < 0.6 && x.maxLateralErr < 0.1) && Math.min(...r.rows.map(x => x.expectedEnd)) < Math.max(...r.rows.map(x => x.expectedEnd)) - 1);
    rec("B2 blocked-lane", ok, JSON.stringify(out));
  });

  await check("B3 判定は従来どおり(横): +1.4 / -1.4 / 継ぎ目 +0.5 の敵は11ヒット(50 x 11)、+2.6は当たらない。消費は1回", async () => {
    await scene([[4, PX + 7, PY + 1.4], [5, PX + 7, PY - 1.4], [6, PX + 7, PY + 2.6], [3, PX + 11, PY + 0.5]]);
    await s.aim(5, 0); await sleep(200);
    await holdFire(); await idle(); await sleep(400);
    const last = await json(`${API}.getLastResult()`);
    const by = Object.fromEntries((last.targets || []).map(t => [t.eventId, t.hits]));
    const pile = await json("(function() { var b = ProjectRCardDeck.getBattleState(); return b.cooldownPile.filter(function(e) { return e.instance.cardId === 'apollo_golden_volley'; }).length; })()");
    rec("B3 hitbox", by[4] === 11 && by[5] === 11 && by[3] === 11 && by[6] === undefined && (await lost(4)) === 550 && (await lost(6)) === 0 && pile === 1, JSON.stringify({ by, lost4: await lost(4), lost6: await lost(6), pile }));
    await cooldown();
  });

  await check("B4 後片付けと分離: 絵・錨・召喚・Eventが残らない。ギガース殺しの絵のキー・素材は別のまま", async () => {
    await scene([]);
    await s.aim(5, 0); await sleep(200);
    await holdFire(); await idle(); await sleep(1500);
    const left = await json(`({ pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_(volley|golden|gigas|charge)/.test(String(p.note || '')); }).length, anchors: ProjectRGodSummonVisual.getAnchors().length, followers: ProjectRGodSummonVisual.getFollowers().length,
      summons: ProjectRGodSummonManager.getActiveSummons().length, arrows: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length, jobs: ${API}.getActiveVfxJobs().length,
      sep: ProjectRPresentationVfx.mapping('apollo_gigas.beam').library === 'ProjectR_Gigas_Beam' && ProjectRPresentationVfx.mapping('apollo_golden.beam').library === 'ProjectR_Golden_Beam' && ProjectRPresentationVfx.mapping('apollo_volley.beam').library === 'ProjectR_Volley_Beam' })`);
    rec("B4 cleanup", left.pics === 0 && left.anchors === 0 && left.followers === 0 && left.summons === 0 && left.arrows === 0 && left.jobs === 0 && left.sep === true, JSON.stringify(left));
  });

  rec("BZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a11_golden_beam_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
