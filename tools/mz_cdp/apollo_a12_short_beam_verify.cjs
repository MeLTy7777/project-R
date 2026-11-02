// Phase Apollo-A12: 実機(Playtest)の確認 — 短いビーム区間(壁のすぐ前で撃った)でも、絵の幅が3マス(レーンは1マス)のまま、絵の先端が判定の届く所までで止まる。
//   黄金の矢Lv3(長押しのビーム)とギガース殺しLv3(チャージ後のビーム)の両方。向き: 横・縦・斜め45度。
//   ケース: 3帯とも壁(0.5マス先・1.5マス先・2.5マス先)/ 1つの帯だけ壁(0.5マス先)。
//   測るもの(絵のSpriteごと): 不透明部分の幅(= 幅方向の拡縮 x 不透明な列)、長さ(= 長さ方向の拡縮)、中心線からの横ずれ、手前の端・先端(進行方向)。
//   期待: 幅 = 3.00(レーンは1.00)、先端 = min(帯の判定の長さ, 画面の対角線)(誤差0.1マス)、手前の端 >= 0(撃つ位置より後ろへはみ出さない)、横ずれ <= 0.1。
//   比較用(修正前の動き): 同じ短い長さで従来の一様拡縮(axisScale なし)のキー apollo_volley.beam を再生して、幅を測る。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a12_short_beam_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARDS = {
  golden: { api: "ProjectRApolloGoldenVolley", beam: "apollo_golden", pattern: "apollo_golden", fire: "hold", busy: "!!ProjectRApolloGoldenVolley.getBeam() || ProjectRApolloGoldenVolley.isPending()" },
  gigas: { api: "ProjectRApolloGigasSlayer", beam: "apollo_gigas", pattern: "apollo_gigas", fire: "tap", busy: "ProjectRApolloGigasSlayer.getShots().length > 0 || ProjectRApolloGigasSlayer.isPending()" }
};
const PX = 100, PY = 60;
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(15); } return false; };
  const resetHp = () => ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'reset'");
  const scene = async kind => {
    const started = await json(`ProjectRApolloTest.start(3, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(2 + id, 118); }); return 'ok'; })()");
    await s.place(PX, PY); await sleep(500);
    await resetHp(); await sleep(150);
  };
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };
  const setWalls = (tiles, v) => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(tiles)}.forEach(function(t) { m.data[5 * size + t[1] * m.width + t[0]] = ${v}; }); return 'walls'; })()`);
  // 撃つ位置の中心から、向き degree・距離 d・横 l の点が入るタイル
  const tilesAt = (degree, d, laterals) => { const r = degree * Math.PI / 180, ux = Math.sin(r), uy = -Math.cos(r), nx = -uy, ny = ux, cx = PX + 0.5, cy = PY + 0.5; return laterals.map(l => [Math.floor(cx + ux * d + nx * l), Math.floor(cy + uy * d + ny * l)]); };
  const fire = async card => {
    if (card.fire === "hold") { await c.keyDown("Q"); await sleep(700); await c.keyUp("Q"); }
    else { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); }
  };
  const geometry = (pattern, degree) => json(`(function() {
    var pics = (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')) && p.sprite && p.sprite.bitmap; });
    var tile = $gameMap.tileWidth(), cp = $gamePlayer.centerPositionPoint(), rad = ${degree} * Math.PI / 180;
    var ox = (cp.x - $gameMap.displayX()) * tile, oy = (cp.y - $gameMap.displayY()) * tile, ux = Math.sin(rad), uy = -Math.cos(rad), nx = -uy, ny = ux;
    var rows = pics.map(function(p) {
      var sp = p.sprite, b = sp.getBounds(), bm = sp.bitmap, f = sp._frame || { x: 0, y: 0, width: bm.width, height: bm.height };
      var data = bm.context.getImageData(f.x, f.y, f.width, f.height).data, minX = f.width, maxX = -1;
      for (var y = 0; y < f.height; y += 4) for (var x = 0; x < f.width; x++) { if (data[(y * f.width + x) * 4 + 3] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; } }
      var cx = b.x + b.width / 2, cy = b.y + b.height / 2, dx = cx - ox, dy = cy - oy, widthTiles = (maxX - minX + 1) * Math.abs(sp.scale.x) / tile, lenTiles = f.height * Math.abs(sp.scale.y) / tile;
      var along = (dx * ux + dy * uy) / tile;
      return { lateral: (dx * nx + dy * ny) / tile, along: along, width: widthTiles, length: lenTiles, near: along - lenTiles / 2, far: along + lenTiles / 2, sx: sp.scale.x, sy: sp.scale.y };
    });
    return { count: rows.length, rows: rows };
  })()`);
  const expectedLanes = (api, degree) => json(`(function() { var cp = $gamePlayer.centerPositionPoint(), g = ProjectRApolloGoldenVolley.geometry, vr = ProjectRApolloGoldenVolley.visualReach(); return g.buildLanes({ x: cp.x, y: cp.y }, ${degree}, 3, 200).map(function(l) { return { center: l.center, end: Math.min(l.limit, vr) }; }); })()`);
  const stopAll = () => ev("ProjectRPresentationVfx.clear(); 'cleared'");
  const legacyWidth = async (degree, length) => { // 従来の一様拡縮(axisScale なし)のキーを、同じ短い長さで再生して幅を測る(比較用)
    await ev(`(function() { var cp = $gamePlayer.centerPositionPoint(); ProjectRPresentationVfx.play('apollo_volley.beam', { degree: ${degree}, length: ${length}, instance: 'legacy', origin: { x: cp.x, y: cp.y } }); return 'ok'; })()`);
    await sleep(250);
    const g = await geometry("/apollo_volley\\.beam(?!lane)/", degree); await stopAll(); await sleep(250);
    return g.count ? +g.rows[0].width.toFixed(3) : null;
  };

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

  // [名前, 向き, 壁の距離d(撃つ位置の中心から。タイルの手前の縁までの長さ = 判定の長さ), 壁を置く横の帯, 狙い(dx, dy)]
  const cases = [
    ["horizontal wall 0.5", 90, 0.75, [-1, 0, 1], 5, 0], ["horizontal wall 1.5", 90, 1.75, [-1, 0, 1], 5, 0], ["horizontal wall 2.5", 90, 2.75, [-1, 0, 1], 5, 0],
    ["vertical(up) wall 0.5", 0, 0.75, [-1, 0, 1], 0, -5], ["diagonal 45 wall 0.5", 45, 0.75, [-1, 0, 1], 4, -4],
    ["horizontal lane+1 only wall 0.5", 90, 0.75, [1], 5, 0], ["vertical lane-1 only wall 0.5", 0, 0.75, [-1], 0, -5]
  ];
  for (const kind of ["golden", "gigas"]) {
    const card = CARDS[kind];
    await check(`S-${kind} 短い区間: 幅3マスのまま・先端は判定の長さまで・手前は撃つ位置から(壁のすぐ前・向き別)`, async () => {
      const out = [];
      for (const [name, degree, d, laterals, dx, dy] of cases) {
        await scene(kind);
        const tiles = tilesAt(degree, d, laterals);
        await setWalls(tiles, 255);
        await s.aim(dx, dy); await sleep(200);
        await fire(card);
        await wait(`${card.api}.getBeam ? !!${card.api}.getBeam() : ${card.api}.getShots().length > 0`, 6000); await sleep(150);
        const whole = await geometry(`/${card.pattern}\\.beam(?!lane)/`, degree), lanes = await geometry(`/${card.pattern}\\.beamlane/`, degree), exp = await expectedLanes(card.api, degree);
        if (kind === "golden" && name === "horizontal wall 0.5") await s.shot("a12_golden_short");
        if (kind === "gigas" && name === "horizontal wall 0.5") await s.shot("a12_gigas_short");
        const rows = whole.count ? whole.rows.map(r => ({ ...r, group: "whole" })) : lanes.rows.map(r => ({ ...r, group: String(Math.round(r.lateral)) }));
        const groups = {};
        for (const r of rows) { const g = groups[r.group] = groups[r.group] || { width: r.width, near: 9e9, far: -9e9, latErr: 0 }; g.near = Math.min(g.near, r.near); g.far = Math.max(g.far, r.far); g.width = Math.min(g.width, r.width); g.latErr = Math.max(g.latErr, Math.abs(r.lateral - (r.group === "whole" ? 0 : Number(r.group)))); }
        const expEnd = k => k === "whole" ? Math.min(...exp.map(e => e.end)) : (exp.find(e => e.center === Number(k)) || {}).end;
        const checks = Object.entries(groups).map(([k, g]) => ({ group: k, width: +g.width.toFixed(3), near: +g.near.toFixed(3), far: +g.far.toFixed(3), expFar: +expEnd(k).toFixed(3), latErr: +g.latErr.toFixed(3),
          ok: Math.abs(g.width - (k === "whole" ? 3 : 1)) < (k === "whole" ? 0.15 : 0.08) && Math.abs(g.far - expEnd(k)) < 0.12 && g.near > -0.12 && g.latErr < 0.1 }));
        const shortest = Math.min(...exp.map(e => e.end));
        const legacy = whole.count && shortest < 3 ? await legacyWidth(degree, Math.max(0.1, shortest)) : null;
        out.push({ name, mode: whole.count ? "whole" : "lanes", expectedEnds: exp.map(e => +e.end.toFixed(2)), checks, legacyWidth: legacy });
        await idle(card); await sleep(300);
        await setWalls(tiles, 0); await cooldown();
      }
      rec(`S-${kind}`, out.length === cases.length && out.every(o => o.checks.length > 0 && o.checks.every(x => x.ok)), JSON.stringify(out));
    });
  }
  async function idle(card) { await wait(`!(${card.busy})`, 30000); }

  await check("S-cleanup 後片付け: 絵・錨・召喚・Event・予約(pendingScales)が残らない", async () => {
    await scene("golden"); await setWalls(tilesAt(90, 0.75, [-1, 0, 1]), 255);
    await s.aim(5, 0); await sleep(200); await fire(CARDS.golden); await idle(CARDS.golden); await sleep(1800);
    await setWalls(tilesAt(90, 0.75, [-1, 0, 1]), 0);
    const left = await json(`({ pics: (AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_(volley|golden|gigas|charge)/.test(String(p.note || '')); }).length, anchors: ProjectRGodSummonVisual.getAnchors().length, followers: ProjectRGodSummonVisual.getFollowers().length,
      summons: ProjectRGodSummonManager.getActiveSummons().length, arrows: $gameMap.events().filter(function(e) { return e && /projectRGoldenVolley|projectRGigasArrow/.test(e.event().note || ''); }).length, pending: ProjectRPresentationVfx.diagnostics().pendingScales, jobs: ProjectRApolloGoldenVolley.getActiveVfxJobs().length })`);
    rec("S-cleanup", left.pics === 0 && left.anchors === 0 && left.followers === 0 && left.summons === 0 && left.arrows === 0 && left.pending === 0 && left.jobs === 0, JSON.stringify(left));
  });

  rec("SZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a12_short_beam_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
