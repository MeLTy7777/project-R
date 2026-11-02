// Phase Apollo-A5B: 実機(Playtest)の確認 — 黄金の矢 Lv3 のビーム(長押し)・連続ヒット・対象ローカルのヒットストップ。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a5b_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・壁(Region 255)・敵の移動はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   実際のヒット数・ダメージ・ヒットストップのframeは、結果のJSON(MZ_OUT/apollo_a5b_verify.json)とスクリーンショットに残る。
const { IMPLEMENTED: A7I, STILL_RESERVED: A7R, N: A7N } = require("./apollo_implemented.cjs");
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_golden_volley", API = "ProjectRApolloGoldenVolley", IN = "ProjectRCardBattleInput", HS = "ProjectRHitStop";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async lv => { const r = await json(`ProjectRApolloTest.start(${lv})`); await sleep(400); await s.slow(1); return r; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000000 - await barHp(id);
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const events = () => json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  const beamPics = () => json("(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_golden\\.beam/.test(String(p.note || '')); }).length");
  const scene = async (lv, enemies = { 4: [13, 15] }) => {
    await start(lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const aimAt = (x, y) => s.aim(x - 9, y - 15);
  const hold = async (ms = 750) => { await c.keyDown("Q"); await sleep(ms); await c.keyUp("Q"); };
  const rnd = d => Math.round(((d + 360) % 360) * 100) / 100;

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("B0 boot: ビームの設定(幅3・秒40・射程40・3ヒット/マス・50・最大11・ヒットストップ3/30)・HitStop・VFX・ライブラリ・F6の項目", async () => {
    const v = await json(`({ cfg: ${API}.beamConfig(), hs: typeof ${HS}.apply, lib: !!getAnimationFromLibrary, keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_volley/.test(k); }),
      fields: ['beamWidthTiles','beamSpeed','bowBeamRangeTiles','beamHitsPerTile','beamHitDamage','beamMaxHitsPerTarget','hitStopFrames','hitStopMaxFrames'].every(function(k) { return ProjectRCardBalance.constant('${CARD}', k) !== undefined; }),
      impl: ProjectRCardCatalog.godDesign('apollo')[0].beamImplemented, deck: ProjectRCardCatalog.buildGodDeck('apollo') })`);
    const lib = await ev(`new Promise(function(res) { Promise.resolve(getAnimationFromLibrary('ProjectR_Volley_Beam')).then(function(a) { res(!!a); }, function() { res(false); }); })`);
    rec("B0 boot", JSON.stringify(v.cfg) === JSON.stringify({ width: 3, speed: 40, range: 0, perTile: 3, damage: 50, maxHits: 11, stopFrames: 3, stopMax: 30 }) && v.hs === "function" && v.keys.length === 4 && v.fields && v.impl === true && (v.deck === null) === (A7R.length > 0) && lib === true && fs.existsSync("img/pictures/Animation/ProjectR_Volley_Beam.png"), JSON.stringify({ ...v, lib }));
  });

  await check("B1 実キーのhold(0.75秒): 扇ではなくビーム。矢のEventは出ない。発射では消費せず、最初のヒットで1回だけ消費。同じ敵へ11ヒット(550)。ビームのVFXは終わると全部消える", async () => {
    await scene(3);
    await aimAt(13, 15);
    const handBefore = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
    await s.slow(1);
    await c.keyDown("Q"); await sleep(750);
    const held = { sessions: await json(`${IN}.getPressSessions().length`), holdReached: await json(`${IN}.getPressSessions()[0].holdReached`), beam: await json(`${API}.getBeam()`) };
    await s.slow(6);
    await c.keyUp("Q"); await s.sceneFrames(3);
    const early = { arrows: await events(), beam: await json(`${API}.getBeam()`), pile: await pile(), hand: await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), pics: await beamPics(), jobs: await json(`${API}.getActiveVfxJobs().length`) };
    await s.shot("b1_beam_early");
    await s.sceneFrames(6); await s.shot("b1_beam_hit");
    await s.slow(1);
    await wait(`!${API}.getBeam()`, 10000); await settle(5);
    const r = await json(`${API}.getLastResult()`);
    await settle(40);
    const end = { pile: await pile(), lost: await lost(4), pics: await beamPics(), jobs: await json(`${API}.getActiveVfxJobs().length`), hs: await json(`${HS}.getActive().length`), ev: await events(), anchors: await json(`ProjectRGodSummonVisual.getAnchors().length`) };
    const samples = (r.hits || []).filter(h => h.target === 4).map(h => h.sample);
    rec("B1 beam", held.sessions === 1 && held.holdReached === true && held.beam === null && early.arrows === 0 && early.beam && early.beam.width === 3 && early.pile === 0 && JSON.stringify(early.hand) === JSON.stringify(handBefore) && early.pics >= 1 && early.jobs === 1
      && r.kind === "beam" && r.committed === true && r.targets.length === 1 && r.targets[0].hits === 11 && r.targets[0].damage === 550 && new Set(samples).size === 11 && end.pile === 1 && end.lost >= 550 && end.pics === 0 && end.jobs === 0 && end.hs === 0 && end.ev === 0 && end.anchors === 0,
      JSON.stringify({ early: { ...early, hand: undefined }, targets: r.targets, samples, end }));
  });

  await check("B2 複数の敵: 幅の中の3体にそれぞれ最大11ヒット(別カウント・各550)、幅の外の敵と後ろの敵には当たらない。消費は1回。ビームは1本", async () => {
    await scene(3, { 4: [13, 15], 5: [15, 16], 6: [14, 14] });
    await locate(3, 12, 20); await locate(2, 5, 15); // 幅の外(横5)と、後ろ
    await resetHp();
    await aimAt(13, 15);
    await hold(); await s.sceneFrames(2);
    const b = await json(`${API}.getBeam()`);
    await wait(`!${API}.getBeam()`, 10000); await settle(5);
    const r = await json(`${API}.getLastResult()`);
    const d = { e4: await lost(4), e5: await lost(5), e6: await lost(6), e3: await lost(3), e2: await lost(2) };
    const by = Object.fromEntries(r.targets.map(t => [t.eventId, t]));
    rec("B2 multi", b && b.origin && r.targets.length === 3 && [4, 5, 6].every(id => by[id] && by[id].hits === 11 && by[id].damage === 550 && by[id].slip === true) && d.e4 >= 550 && d.e5 >= 550 && d.e6 >= 550 && d.e3 === 0 && d.e2 === 0 && r.totalHits === 33 && r.totalDamage === 1650 && (await pile()) === 1,
      JSON.stringify({ targets: r.targets, total: [r.totalHits, r.totalDamage], d, limit: r.limit }));
  });

  await check("B3 外れ: 敵のいない方向のビームは非消費(手札・Cooldownなし)。すぐ撃ち直せる。外れの後のtapは扇", async () => {
    await scene(3);
    const handBefore = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
    await s.aim(0, -5);
    await hold(); await s.sceneFrames(2);
    const flying = await json(`${API}.getBeam() !== null && ${API}.isPending()`);
    await wait(`!${API}.isPending()`, 10000); await settle(5);
    const r = await json(`${API}.getLastResult()`);
    const st = { pile: await pile(), hand: await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), beam: await json(`${API}.getBeam()`), hs: await json(`${HS}.getActive().length`) };
    await aimAt(13, 15);
    await hold(); await s.sceneFrames(2);
    const again = await json(`${API}.getBeam() !== null`);
    await wait(`!${API}.getBeam()`, 10000); await settle(5);
    rec("B3 miss", flying && r.reason === "missed" && r.consumed === false && st.pile === 0 && JSON.stringify(st.hand) === JSON.stringify(handBefore) && st.beam === null && st.hs === 0 && again && (await lost(4)) >= 550 && (await pile()) === 1, JSON.stringify({ r: { reason: r.reason, limit: r.limit }, st, again }));
  });

  await check("B4 向きの違い: 開けている方向ごとに、狙った方向(離した時のマウス)へ幅3のビームが出て、その方向の近い敵に当たり、反対側の敵には当たらない", async () => {
    await scene(3);
    const dirs = [];
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const lim = await json(`${API}.geometry.beamLimit($gamePlayer.centerPositionPoint(), ${deg}, 40)`);
      if (lim >= 4) dirs.push({ deg, lim });
    }
    const out = [];
    for (const d of dirs.slice(0, 4)) {
      await scene(3, {});
      const dx = Math.sin(d.deg * Math.PI / 180), dy = -Math.cos(d.deg * Math.PI / 180);
      const ex = 9 + Math.round(dx * 3), ey = 15 + Math.round(dy * 3), bx = 9 - Math.round(dx * 3), by = 15 - Math.round(dy * 3);
      await locate(4, ex, ey); await locate(5, bx, by); await resetHp();
      await s.aim(dx * 4, dy * 4);
      const mouseDeg = await json("(function() { var m = { x: TouchInput.x, y: TouchInput.y, px: $gamePlayer.screenX(), py: $gamePlayer.screenY() }; return (Math.atan2(m.y - m.py, m.x - m.px) * 180 / Math.PI + 450) % 360; })()");
      await hold(); await s.sceneFrames(2);
      const bm = await json(`${API}.getBeam()`);
      await wait(`!${API}.getBeam()`, 10000); await settle(5);
      out.push({ deg: d.deg, mouseDeg: rnd(mouseDeg), beamDeg: bm && rnd(bm.degree), front: await lost(4), back: await lost(5) });
    }
    rec("B4 directions", dirs.length >= 3 && out.length >= 3 && out.every(o => o.beamDeg !== null && Math.abs(o.beamDeg - o.mouseDeg) < 0.01 && o.front >= 50 && o.back === 0), JSON.stringify({ dirs: dirs.length, out }));
  });

  await check("B5 壁: 手前にRegion 255の壁があるとビームの先端が壁で止まり、向こうの敵には当たらない(非消費)。壁を外すと同じ位置で11ヒット", async () => {
    await scene(3, { 4: [14, 15] });
    await ev(`(function() { var m = $dataMap, size = m.width * m.height, saved = []; [12,13,14,15,16,17,18].forEach(function(y) { var i = 5 * size + y * m.width + 11; saved.push([i, m.data[i]]); m.data[i] = 255; }); window.__wallSaved = saved; return saved.length; })()`);
    await aimAt(14, 15);
    await hold(); await s.sceneFrames(2);
    const limit = await json(`${API}.getBeamLog().slice(-1)[0].limit`);
    await wait(`!${API}.getBeam() && !${API}.isPending()`, 10000); await settle(5);
    const blocked = { lost: await lost(4), pile: await pile(), reason: (await json(`${API}.getLastResult()`)).reason };
    await ev("(function() { (window.__wallSaved || []).forEach(function(p) { $dataMap.data[p[0]] = p[1]; }); window.__wallSaved = []; return 'restored'; })()");
    await s.sleep(3500);
    const n5 = await json(`${API}.getBeamLog().length`);
    await hold(); await wait(`${API}.getBeamLog().length > ${n5}`, 5000); await wait(`!${API}.getBeam() && !${API}.isPending()`, 10000); await settle(5);
    const lr5 = await json(`${API}.getLastResult()`);
    const open = { hits: (lr5.targets || []).map(t => t.hits), pile: await pile(), reason: lr5.reason, limit: lr5.limit };
    rec("B5 wall", limit < 2.7 && blocked.lost === 0 && blocked.pile === 0 && blocked.reason === "missed" && open.hits[0] === 11 && open.pile === 1, JSON.stringify({ limit, blocked, open }));
  });

  await check("B6 ヒットストップ(実機): ビームに当たった敵だけが数frame止まる。動いている別の敵・プレイヤー・戦闘の時計(Cooldown)は止まらない。終わると元に戻る", async () => {
    await scene(3, { 4: [13, 16], 5: [5, 16] });
    // 敵4(ビームの中)と敵5(後ろ)を、上へ動かし続ける
    await ev("[4, 5].forEach(function(id) { var e = $gameMap.event(id); e.setMoveSpeed(3); e.forceMoveRoute({ list: [{ code: 4, parameters: [] }, { code: 4, parameters: [] }, { code: 3, parameters: [] }, { code: 0 }], repeat: true, skippable: true, wait: false }); }); 'moving'");
    await aimAt(13, 15);
    await s.slow(1);
    await c.keyDown("Q"); await sleep(750); // 保持は通常速度で(30更新以上)
    await s.slow(6);
    await c.keyUp("Q");
    const variant = await json(`${IN}.getPressSessions().length`);
    await s.sceneFrames(1);
    const rows = [];
    for (let i = 0; i < 45; i++) {
      await s.sceneFrames(1);
      rows.push(await json(`({ y4: $gameMap.event(4)._realY, x4: $gameMap.event(4)._realX, y5: $gameMap.event(5)._realY, x5: $gameMap.event(5)._realX, rem: ${HS}.remaining($gameMap.event(4)), rem5: ${HS}.remaining($gameMap.event(5)), px: $gamePlayer._realX,
        cd: (ProjectRCardDeck.getBattleState().cooldownPile[0] || {}).remainingSeconds, beam: ${API}.getBeam() !== null })`));
    }
    await s.slow(1); await settle(60);
    let frozenFrames = 0, frozenMoved = 0, otherMovedDuringFreeze = 0, otherFrames = 0, clockOk = 0, clockFrames = 0, resumed = false;
    const disp = (a, b) => Math.hypot(b.x4 - a.x4, b.y4 - a.y4), disp5 = (a, b) => Math.hypot(b.x5 - a.x5, b.y5 - a.y5);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i - 1].rem > 0) { frozenFrames++; if (disp(rows[i - 1], rows[i]) > 1e-6) frozenMoved++; otherFrames++; if (disp5(rows[i - 1], rows[i]) > 1e-6) otherMovedDuringFreeze++;
        if (rows[i - 1].cd !== undefined && rows[i].cd !== undefined) { clockFrames++; if (rows[i].cd < rows[i - 1].cd - 1e-9) clockOk++; } }
      if (frozenFrames > 0 && rows[i - 1].rem === 0 && disp(rows[i - 1], rows[i]) > 1e-6) resumed = true;
    }
    const stats = await json(`${HS}.getStats()`), lr = await json(`${API}.getLastResult()`);
    rec("B6 hit-stop", lr.kind === "beam" && lr.targets.length === 1 && lr.targets[0].eventId === 4 && stats.applied >= 1 && frozenFrames >= 3 && frozenMoved === 0 && otherMovedDuringFreeze >= Math.ceil(otherFrames * 0.6) && (clockFrames === 0 || clockOk === clockFrames)
      && lr.targets[0].hitStopFrames <= 30 && (await json(`${HS}.getActive().length`)) === 0, JSON.stringify({ sessionsAtRelease: variant, frozenFrames, frozenMoved, otherFrames, otherMovedDuringFreeze, clockFrames, clockOk, resumed, applied: stats.applied, skipped: stats.skippedUpdates, hitStopFrames: lr.targets[0] && lr.targets[0].hitStopFrames }));
  });

  await check("B7 後片付け: ビームの途中で戦闘を終えると、ビーム・ヒットストップ・VFXの絵・確定待ちが全部消える(ヒット前なら非消費)。ビームが終わった後も何も残らない", async () => {
    await scene(3, { 4: [13, 15] });
    await aimAt(13, 15);
    await s.slow(1);
    await c.keyDown("Q"); await sleep(750); // 保持は通常速度で(30更新以上)
    await s.slow(8);
    await c.keyUp("Q"); await s.sceneFrames(2);
    const before = { beam: await json(`${API}.getBeam() !== null`), pics: await beamPics(), jobs: await json(`${API}.getActiveVfxJobs().length`) };
    await ev("ProjectRCombatTestArena.endTest(); 'end'"); await s.sceneFrames(8);
    await s.slow(1); await settle(40);
    const after = { beam: await json(`${API}.getBeam()`), pending: await json(`${API}.isPending()`), pics: await beamPics(), jobs: await json(`${API}.getActiveVfxJobs().length`), hs: await json(`${HS}.getActive().length`), events: await events(), anchors: await json(`ProjectRGodSummonVisual.getAnchors().length`), active: await json("ProjectRCardDeck.isCardBattleActive()") };
    rec("B7 cleanup", before.beam && before.pics >= 1 && before.jobs === 1 && after.beam === null && !after.pending && after.pics === 0 && after.jobs === 0 && after.hs === 0 && after.events === 0 && after.anchors === 0 && after.active === false, JSON.stringify({ before, after }));
  });

  await check("B8 互換: Lv3のtapは11本の扇(ビームなし)、Lv1〜2は押した瞬間、保存内容にビーム・ヒットストップの状態が入らない、旧Apolloの定義は不変", async () => {
    await scene(3);
    await aimAt(13, 15);
    await s.slow(4); await c.tap("Q", 60); await s.sceneFrames(3);
    const fan = { arrows: await events(), beam: await json(`${API}.getBeam()`) };
    await s.slow(1); await wait(`!${API}.isPending()`, 10000); await settle(10);
    await scene(2); await aimAt(13, 15);
    await s.slow(3); await c.keyDown("Q"); await s.sceneFrames(3);
    const lv2 = { arrows: await events(), sessions: await json(`${IN}.getPressSessions().length`) };
    await c.keyUp("Q"); await s.slow(1); await wait(`!${API}.isPending()`, 10000);
    await scene(3); await aimAt(13, 15); await hold(); await s.sceneFrames(5);
    const save = await ev("JSON.stringify(DataManager.makeSaveContents())");
    const bad = ["getBeam", "ProjectRHitStop", "beamLog", "hitStop", "vfxJobs"].filter(k => save.indexOf(k) >= 0);
    const legacy = await json("['apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; })");
    rec("B8 compat", fan.arrows >= 8 && fan.beam === null && lv2.arrows >= 3 && lv2.sessions === 0 && bad.length === 0 && JSON.stringify(legacy) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]), JSON.stringify({ fan, lv2, bad, legacy }));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a5b_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
