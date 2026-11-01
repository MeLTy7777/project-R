// Phase Apollo-A6B: 実機(Playtest)の確認 — エロスの矢 Lv2(80度間隔の3方向 x 1方向7本 = 21本)。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a6b_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・仲間(PartyCombat)・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   視覚の証拠(21本の連射・3方向・壁越え・回復)は MZ_OUT の l*.png に残る。性能(frameの処理時間とFPS)は L7 の結果に残る。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_eros_arrow", API = "ProjectRApolloErosArrow", GV = "ProjectRGodSummonVisual";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const setPos = (id, x, y) => ev(`$gameMap.event(${id}).setPosition(${x}, ${y}); 'ok'`);
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000000 - await barHp(id);
  const aimRel = (dx, dy) => s.aim(dx, dy); // プレイヤーの足元からの相対(タイル)
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const events = () => json("$gameMap.events().filter(function(e) { return e && /projectRErosArrow/.test(e.event().note || ''); }).length");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const seq = () => json(`${API}.getSequences()`);
  const tickOf = async () => { const q = await seq(); return q.length ? q[0].tick : -1; };
  const waitTick = async (n, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { const k = await tickOf(); if (k >= n || k < 0) return k; await sleep(15); } return -2; };
  const idle = async (ms = 30000) => wait(`${API}.getSequences().length === 0`, ms);
  const leftovers = async () => ({ events: await events(), pics: await pics("/apollo_eros/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    summons: await json("ProjectRGodSummonManager.getActiveSummons().length"), temp: await json(`${API}.getTempObjectCount()`), jobs: await json(`${API}.getActiveVfxJobs().length`), seq: (await seq()).length });
  const clean = v => v.events === 0 && v.pics === 0 && v.followers === 0 && v.anchors === 0 && v.summons === 0 && v.temp.total === 0 && v.jobs === 0 && v.seq === 0;
  const scene = async (level, enemies = {}, kind = "eros", slow = 1) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(slow); await random(0.9);
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await setPos(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  // 3方向の的(プレイヤー(9.5,15.5)から、狙い=右(90度)・その左右80度の10度・170度へ r マス)。イベントの座標は中心 - 0.5
  const threeTargets = (r = 6) => ({ 3: [9.5 + r - 0.5, 15.5 - 0.5], 4: [9.5 + r * Math.sin(10 * Math.PI / 180) - 0.5, 15.5 - r * Math.cos(10 * Math.PI / 180) - 0.5], 5: [9.5 + r * Math.sin(170 * Math.PI / 180) - 0.5, 15.5 - r * Math.cos(170 * Math.PI / 180) - 0.5] });
  const addAlly = async (eventId, x, y, hp = 100, maxHp = 400) => {
    await ev(`(function() { var p = ProjectRPartyCombat; p.registerAlly({ actorId: 2, name: 'ally2', maxHp: ${maxHp}, normalAttack: { id: 'n2', range: 1.5, cooldownSeconds: 1 } });
      if (p.isActive()) p.endSession(); p.startSession([2]); p.damageAlly(2, ${maxHp - hp}); $gameMap.event(${eventId}).linkedActorId = 2; $gameMap.event(${eventId}).setPosition(${x}, ${y}); return 'ally'; })()`);
    await settle();
  };
  const allyHp = () => json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const near = (a, b, tol = 4) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tol;
  const wallSet = (x, ys, v) => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(ys)}.forEach(function(y) { m.data[5 * size + y * m.width + ${x}] = ${v}; }); return 'wall'; })()`);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("L0 boot: Lv2の登録(最大Lv2)・数値(3方向・80度・1方向7本・計21本)・Lv1は10本のまま・Lv3へ上がらない・F6の項目", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), lv1: ${API}.config(1), lv2: ${API}.config(2), limits: ${API}.limits,
      fields: ['directionCount','directionSpacingDegrees','arrowsPerDirection','directionOriginOffsetTiles'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }),
      row: ProjectRCardCatalog.godDesign('apollo').find(function(r) { return r.designId === 9; }).implementedLevels, lv: ProjectRCardDeck.setCardLevel('${CARD}', 3) && ProjectRCardDeck.getPersistentData().cardOwnership['${CARD}'].level })`);
    rec("L0 boot", v.def.maxLevel === 3 && v.lv1.count === 10 && v.lv1.directions === 1 && v.lv2.directions === 3 && v.lv2.perDirection === 7 && v.lv2.count === 21 && v.lv2.spacing === 80 && v.lv2.radius === 3 && v.lv2.damage === 20 && v.lv2.heal === 50
      && v.lv2.originOffset === 0 && v.fields && v.row === 3 && v.lv === 3 && v.limits.VISUAL_ARROW_BUDGET === 30, JSON.stringify(v).slice(0, 500));
  });

  await check("L1 21本(実マウス+実キーQ): 1方向7本 x 3方向が1秒(60更新)に。3方向は狙い・その左右80度。出発点は同じ。Event・VFXの絵は上限内", async () => {
    await scene(2, {});
    await aimRel(6, 0); await sleep(200);
    const before = await hand();
    await fireTap();
    let maxEvents = 0, maxPics = 0, maxTemp = 0, shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) {
      const e = await events(), p = await pics("/apollo_eros/"), tmp = (await json(`${API}.getTempObjectCount()`)).total;
      maxEvents = Math.max(maxEvents, e); maxPics = Math.max(maxPics, p); maxTemp = Math.max(maxTemp, tmp);
      if (!shot && (await tickOf()) >= 30) { shot = true; await s.shot("l1_three_directions"); }
      await sleep(25);
    }
    const log = await json(`${API}.getEmissionLog()`);
    const slots = [...new Set(log.map(e => e.tick))];
    const first = log.filter(e => e.slot === 0).map(e => e.degree);
    const spacingOk = [0, 1, 2, 3, 4, 5, 6].every(sl => { const d = log.filter(e => e.slot === sl).map(e => e.degree); return d.length === 3 && near((d[1] - d[0] + 360) % 360, 80, 0.01) && near((d[2] - d[1] + 360) % 360, 80, 0.01); });
    const sameOrigin = [0, 1, 2, 3, 4, 5, 6].every(sl => { const o = log.filter(e => e.slot === sl); return o.every(e => Math.abs(e.x - o[0].x) < 1e-6 && Math.abs(e.y - o[0].y) < 1e-6); });
    await sleep(500);
    rec("L1 21 arrows", log.length === 21 && JSON.stringify(slots) === "[0,8,17,25,34,42,51]" && [0, 1, 2].every(k => log.filter(e => e.direction === k).length === 7) && near(first[1], 90, 4) && near(first[0], 10, 4) && near(first[2], 170, 4) && spacingOk && sameOrigin
      && maxEvents <= 21 && maxPics <= 14 && maxTemp <= 33 && (await pile()) === 0 && (await json(`${API}.getLastResult().reason`)) === "missed" && JSON.stringify(await hand()) === JSON.stringify(before) && clean(await leftovers()),
      JSON.stringify({ n: log.length, slots, first: first.map(Math.round), spacingOk, sameOrigin, maxEvents, maxPics, maxTemp, pile: await pile() }));
  });

  await check("L2 方向転換(実マウス): 連射の途中でマウスを動かすと、あとの発射の時刻の3方向は新しい狙いを中心に計算し直される", async () => {
    await scene(2, {}, "eros", 4);
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    await waitTick(20); await aimRel(0, -6); // 上(0度)
    await s.shot("l2_aim_up");
    await waitTick(40); await aimRel(-6, 0); // 左(270度)
    await idle(40000);
    await s.slow(1);
    const log = (await json(`${API}.getEmissionLog()`)).slice(-21); // この連射の21本(記録は連射をまたいで残る)
    const aimOf = sl => Math.round(log.filter(e => e.slot === sl)[0].aim);
    const a = [0, 1, 2, 3, 4, 5, 6].map(aimOf);
    const sl5 = log.filter(e => e.slot === 6).map(e => Math.round(e.degree));
    rec("L2 aim change", log.length === 21 && near(a[0], 90, 4) && near(a[1], 90, 4) && near(a[2], 90, 4) && near(a[3], 0, 4) && near(a[4], 0, 4) && near(a[5], 270, 4) && near(a[6], 270, 4) && near(sl5[0], 190, 4) && near(sl5[1], 270, 4) && near(sl5[2], 350, 4),
      JSON.stringify({ aims: a, lastSlot: sl5 }));
  });

  await check("L3 追尾・ダメージ・壁越え(実機): 3方向の敵へ各7本=21本が1回ずつ当たり、1本20(各140・合計420)。Region 255の壁の向こうでも同じ", async () => {
    await scene(2, threeTargets(6));
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) { if (!shot && (await tickOf()) >= 34) { shot = true; await s.shot("l3_hits"); } await sleep(25); }
    await sleep(400);
    const last = await json(`${API}.getLastResult()`);
    const dmg = [await lost(3), await lost(4), await lost(5)];
    const plain = last.hits.length === 21 && new Set(last.hits.map(h => h.arrow)).size === 21 && JSON.stringify(dmg) === "[140,140,140]" && last.committed === true && last.completed === true && (await pile()) === 1;
    // 壁越え
    await scene(2, threeTargets(6));
    const ys = []; for (let y = 5; y <= 25; y++) ys.push(y);
    await wallSet(12, ys, 255); await wallSet(11, ys, 255);
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    let shot2 = false; const t1 = Date.now();
    while (Date.now() - t1 < 12000 && (await seq()).length) { if (!shot2 && (await tickOf()) >= 34) { shot2 = true; await s.shot("l3_through_wall"); } await sleep(25); }
    await sleep(400);
    await wallSet(12, ys, 0); await wallSet(11, ys, 0);
    const dmg2 = [await lost(3), await lost(4), await lost(5)];
    rec("L3 homing-damage-wall", plain && JSON.stringify(dmg2) === "[140,140,140]", JSON.stringify({ dmg, hits: last.hits.length, dmg2 }));
  });

  await check("L4 味方への回復(実機): 3方向のうち1方向の先の味方のHPが50ずつ戻り(最大400)、同時に別方向の敵へ7本。<enemy>枠のEventにダメージなし", async () => {
    const t = threeTargets(6);
    await scene(2, { 3: t[3] });
    await addAlly(6, t[4][0], t[4][1], 100, 400);
    await aimRel(6, 0); await sleep(200);
    const enemyBar0 = await barHp(6);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) { if (!shot && (await tickOf()) >= 40) { shot = true; await s.shot("l4_ally_and_enemy"); } await sleep(25); }
    await sleep(400);
    const last = await json(`${API}.getLastResult()`);
    const healed = last.hits.filter(h => h.kind === "ally"), enemy = last.hits.filter(h => h.kind === "enemy");
    rec("L4 ally-heal", enemy.length === 7 && (await lost(3)) === 140 && healed.length >= 1 && healed.every(h => h.healed === 50 || h.healed > 0) && (await allyHp()) === 100 + healed.reduce((a, h) => a + h.healed, 0) && (await allyHp()) <= 400 && (await barHp(6)) === enemyBar0,
      JSON.stringify({ enemy: enemy.length, healed: healed.map(h => h.healed), allyHp: await allyHp(), lost3: await lost(3) }));
  });

  await check("L5 確定と手札の入れ替え(実機): 予約では消費せず、最初の命中で1回。確定したカードが手札から消えても、残りの矢は全部放たれて当たる(21命中)。連射中は別スロットの同じカードを発動できない", async () => {
    await scene(2, threeTargets(9), "eros", 2);
    await aimRel(6, 0); await sleep(200);
    const startHand = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.instanceId; })");
    await fireTap();
    await waitTick(2);
    const early = { pile: await pile(), pending: await json(`${API}.isPending()`) };
    const second = await json("ProjectRCardDeck.requestUseCard(1)");
    let at = null;
    for (let i = 0; i < 600; i++) { const q = await seq(); if (!q.length) break; if (q[0].committed) { at = q[0]; break; } await sleep(15); }
    const during = await json("ProjectRCardDeck.requestUseCard(2)");
    const instanceGone = await json(`ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.instanceId; }).indexOf(${JSON.stringify(startHand[0])}) < 0`);
    await idle(40000); await s.slow(1);
    const last = await json(`${API}.getLastResult()`);
    const after = await json(`(function() { var h = ProjectRCardDeck.getBattleState().hand; return h.filter(function(c) { return c.cardId === '${CARD}'; }).length; })()`);
    const pileEnd = await pile();
    const again = await json("ProjectRCardDeck.requestUseCard(0)");
    await idle(40000);
    rec("L5 settlement", early.pile === 0 && early.pending === true && second.reason !== "pending" && at && at.committed === true && at.emitted < 21 && during.reason !== "pending" && instanceGone === true
      && last.completed === true && last.cancelled === false && last.hits.length === 21 && pileEnd === 1 && after === 4 && again.reason === "pending",
      JSON.stringify({ early, second: second.reason, at: at && { emitted: at.emitted, slot: at.slot }, during: during.reason, instanceGone, completed: last.completed, hits: last.hits.length, pile: pileEnd, eros: after, again: again.reason }));
  });

  await check("L6 取消と後片付け(実機): 連射の途中(確定前)の戦闘終了=非消費で全部消える。確定後の戦闘終了=消費は戻らず残りだけ消え、cancelledで記録。VFX・Apollo・錨も0", async () => {
    await scene(2, { 3: [30, 15] }, "eros", 2);
    await aimRel(6, 0); await sleep(200);
    await fireTap(); await waitTick(25);
    const live = await events();
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const pre = await json(`${API}.getLastResult()`), e1 = await leftovers();
    await s.slow(1);
    await sleep(6000);
    await scene(2, threeTargets(6), "eros", 2);
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    for (let i = 0; i < 600; i++) { const q = await seq(); if (!q.length || q[0].committed) break; await sleep(15); }
    await waitTick((await tickOf()) + 4);
    const emittedAt = (await seq())[0] && (await seq())[0].emitted;
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const post = await json(`${API}.getLastResult()`), e2 = await leftovers();
    rec("L6 cancel", live >= 3 && pre.consumed === false && pre.committed === false && clean(e1) && post.cancelled === true && post.completed === false && post.consumed === true && post.committed === true && emittedAt < 21 && post.hits.length < 21 && clean(e2) && s.errors().length === 0,
      JSON.stringify({ live, pre: { consumed: pre.consumed, reason: pre.reason }, e1, post: { cancelled: post.cancelled, hits: post.hits.length, emittedAt }, e2, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("L7 性能(実機): 待機・Lv1・Lv2の連射中の1frameの処理時間(updateScene)を測る。Lv2でも95%tileが16.7ms(60FPSの1frame)に収まり、最大でも33ms未満", async () => {
    const install = () => ev(`(function() { if (window.__perfInstalled) return 'already'; window.__perfInstalled = true; window.__perf = { upd: [], dt: [], on: false, last: 0 };
      var orig = SceneManager.updateScene; SceneManager.updateScene = function() { var t = performance.now(); var r = orig.apply(this, arguments); if (window.__perf.on) window.__perf.upd.push(performance.now() - t); return r; };
      (function loop(now) { if (window.__perf.on && window.__perf.last) window.__perf.dt.push(now - window.__perf.last); window.__perf.last = now; requestAnimationFrame(loop); })(0); return 'installed'; })()`);
    await install();
    const stats = async () => json(`(function() { var u = window.__perf.upd.slice().sort(function(a, b) { return a - b; }), d = window.__perf.dt.slice().sort(function(a, b) { return a - b; });
      var avg = function(a) { return a.length ? a.reduce(function(x, y) { return x + y; }, 0) / a.length : 0; }, pct = function(a, p) { return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
      return { n: u.length, updAvg: avg(u), updP95: pct(u, 0.95), updMax: u[u.length - 1] || 0, dtAvg: avg(d), dtP95: pct(d, 0.95), dtMax: d[d.length - 1] || 0, fps: avg(d) ? 1000 / avg(d) : 0 }; })()`);
    const measure = async (label, run) => { await ev("window.__perf.upd = []; window.__perf.dt = []; window.__perf.on = true; 'on'"); await run(); await ev("window.__perf.on = false; 'off'"); const r = await stats(); console.log("  perf", label, JSON.stringify(r)); return r; };
    await scene(1, {});
    const idleR = await measure("待機(1.5秒)", async () => { await sleep(1500); });
    await aimRel(6, 0); await sleep(150);
    const lv1R = await measure("Lv1連射(10本)", async () => { await fireTap(); await sleep(300); await idle(20000); });
    await sleep(5500);
    await scene(2, threeTargets(6));
    await aimRel(6, 0); await sleep(150);
    const lv2R = await measure("Lv2連射(21本・3方向の敵へ命中)", async () => { await fireTap(); await sleep(300); await idle(20000); });
    await sleep(500);
    // FPSの値は参考(この環境の描画ループは上限なしで約300Hzのため、frameの処理時間で判定する)
    rec("L7 performance", lv2R.n > 60 && lv2R.updP95 < 16.7 && lv2R.updMax < 33 && lv2R.updAvg < 8 && lv2R.updAvg - idleR.updAvg < 6 && lv1R.n > 30, JSON.stringify({ idle: idleR, lv1: lv1R, lv2: lv2R }));
  });

  await check("L8 退行なし(実機): Lv1は10本・黄金の矢Lv1は従来どおり", async () => {
    await scene(1, { 4: [13, 15] });
    await aimRel(4, 0); await sleep(200);
    await fireTap(); await idle(20000);
    const log = await json(`${API}.getEmissionLog()`);
    const lv1 = log.slice(-10);
    const lv1ok = lv1.length === 10 && lv1.every(e => e.direction === 0) && (await lost(4)) === 200 && (await pile()) === 1;
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, { 4: [13, 15] }, "golden");
    await aimRel(4, 0); await sleep(200);
    await fireTap();
    await wait("ProjectRApolloGoldenVolley.getLastResult() && ProjectRApolloGoldenVolley.getLastResult().committed === true", 8000);
    await sleep(2500);
    const g = await json("ProjectRApolloGoldenVolley.getLastResult()");
    const bar = await barHp(4);
    rec("L8 regression", lv1ok && g && g.committed === true && g.arrows === 3 && 1000000 - bar > 0 && (1000000 - bar) % 50 === 0 && (await json(`${API}.getSequences().length`)) === 0, JSON.stringify({ lv1ok, golden: g && g.arrows, dealt: 1000000 - bar }));
  });

  rec("LZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a6b_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
