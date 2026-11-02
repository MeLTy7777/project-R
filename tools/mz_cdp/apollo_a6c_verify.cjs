// Phase Apollo-A6C: 実機(Playtest)の確認 — エロスの矢 Lv3(追尾範囲7・左右80度の2方向x7本=14本・中央の3秒のビーム)。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a6c_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・仲間(PartyCombat)・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   視覚の証拠(14本+ビーム・壁越え・回復・向きの追従)は MZ_OUT の m*.png に残る。性能(frameの処理時間)は M8 の結果に残る。
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
  const addAllies = async list => { // [{ actorId, eventId, x, y, hp, maxHp }]
    await ev(`(function() { var p = ProjectRPartyCombat; var L = ${JSON.stringify(list)}; L.forEach(function(a) { p.registerAlly({ actorId: a.actorId, name: 'ally' + a.actorId, maxHp: a.maxHp, normalAttack: { id: 'n' + a.actorId, range: 1.5, cooldownSeconds: 1 } }); });
      if (p.isActive()) p.endSession(); p.startSession(L.map(function(a) { return a.actorId; })); L.forEach(function(a) { if (a.hp < a.maxHp) p.damageAlly(a.actorId, a.maxHp - a.hp); var e = $gameMap.event(a.eventId); e.linkedActorId = a.actorId; e.setPosition(a.x, a.y); }); return 'allies'; })()`);
    await settle();
  };
  const allyHpOf = id => json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === " + id + "; })[0].hp");
  const allyHp = () => json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const near = (a, b, tol = 4) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tol;
  const wallSet = (x, ys, v) => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(ys)}.forEach(function(y) { m.data[5 * size + y * m.width + ${x}] = ${v}; }); return 'wall'; })()`);

  const segs = () => json("$gameMap.events().filter(function(e) { return e && /projectRErosBeam/.test(e.event().note || ''); }).length");
  const leftovers3 = async () => ({ ...(await leftovers()), segs: await segs() });
  const clean3 = v => clean(v) && v.segs === 0;
  const beamNow = () => json(`${API}.getBeam()`);
  const lastR = () => json(`${API}.getLastResult()`);
  const R = r => ({ 3: [9 + r, 15], 4: [9 + r, 15], 5: [9 + r, 15], 6: [9 + r, 15] }); // 右へ r マス(イベントの座標は中心 - 0.5)
  const rightOf = (r, dy = 0) => [9 + r, 15 + dy];
  const sideOf = (deg, along, across) => { const h = deg * Math.PI / 180, u = [Math.sin(h), -Math.cos(h)], n = [Math.cos(h), Math.sin(h)]; return [9.5 + u[0] * along + n[0] * across - 0.5, 15.5 + u[1] * along + n[1] * across - 0.5]; };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("M0 boot: Lv3の登録(最大Lv3)・数値(追尾7・14本・ビーム3秒/300/80/0.1秒/幅0.9)・Lv1〜2は不変・VFXキー・ビーム区間のPrefabと素材・F6の項目", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3), limits: ${API}.limits,
      keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_eros/.test(k); }).sort(), template: !!$dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Eros Beam Segment'; }),
      fields: ['beamDurationSeconds','beamHealPerSecond','beamDamagePerSecond','beamTickSeconds','beamWidthTiles','bowBeamRangeTiles','homingRadiusTiles'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }),
      lv: ProjectRCardDeck.setCardLevel('${CARD}', 3) && ProjectRCardDeck.getPersistentData().cardOwnership['${CARD}'].level })`);
    const file = fs.existsSync("img/characters/VFX/$ProjectR_ErosBeam.png");
    const c3 = v.c3;
    rec("M0 boot", v.def.maxLevel === 3 && v.c1.radius === 3 && v.c2.radius === 3 && !v.c2.beam && c3.radius === 7 && c3.beam && c3.count === 14 && c3.sideCount === 2 && c3.beamSeconds === 3 && c3.beamHealRate === 300 && c3.beamDamageRate === 80 && c3.beamTickSeconds === 0.1
      && c3.beamTickHeal === 30 && c3.beamTickDamage === 8 && c3.beamMaxTicks === 30 && c3.beamWidth === 0.9 && c3.beamRange === 0 && c3.beamLength > 24 && v.keys.length === 6 && v.template && v.fields && v.lv === 3 && file && v.limits.HARD_LIFETIME_FRAMES === 3500, JSON.stringify({ c3, keys: v.keys, template: v.template, file }).slice(0, 600));
  });

  await check("M1 追尾範囲7 対 3(実機): 側面の矢から5マス外れた敵へ、Lv2は外れ、Lv3は曲がって当たる(ビームの外なのでダメージは矢だけ)", async () => {
    const pos = sideOf(10, 8, 5);
    await scene(2, { 3: pos });
    await aimRel(6, 0); await sleep(200);
    await fireTap(); await idle(30000);
    const lv2 = await lost(3), r2 = (await lastR()).reason;
    await scene(3, { 3: pos });
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) { if (!shot && (await tickOf()) >= 30) { shot = true; await s.shot("m1_radius7"); } await sleep(25); }
    const lv3 = await lost(3), last = await lastR();
    rec("M1 radius", lv2 === 0 && r2 === "missed" && lv3 >= 20 && lv3 % 20 === 0 && last.beam.damageTotal === 0 && last.hits.length >= 1, JSON.stringify({ lv2, r2, lv3, hits: last.hits.length, beamDamage: last.beam.damageTotal }));
  });

  await check("M2 14本 + 3秒のビーム(実マウス+実キーQ): 側面の2方向(10度・170度)x7本=14本が1秒以内、中央の方向の矢はなし。ビームは1本で約3秒。矢のEvent・ビーム区間・VFXの絵に上限", async () => {
    await scene(3, {});
    await aimRel(6, 0); await sleep(200);
    const before = await hand();
    await fireTap();
    const m = { arrows: 0, segs: 0, pics: 0, temp: 0 }; let shot1 = false, shot2 = false, beamFrames = 0; const t0 = Date.now(); let lastTick = -1;
    while (Date.now() - t0 < 20000 && (await seq()).length) {
      const e = await events(), sg = await segs(), p = await pics("/apollo_eros/"), tmp = (await json(`${API}.getTempObjectCount()`)).total, k = await tickOf();
      m.arrows = Math.max(m.arrows, e); m.segs = Math.max(m.segs, sg); m.pics = Math.max(m.pics, p); m.temp = Math.max(m.temp, tmp);
      if (!shot1 && k >= 20) { shot1 = true; await s.shot("m2_beam_and_arrows"); }
      if (!shot2 && k >= 100) { shot2 = true; await s.shot("m2_beam_only"); }
      lastTick = Math.max(lastTick, k);
      await sleep(30);
    }
    const log = (await json(`${API}.getEmissionLog()`)).slice(-14), last = await lastR();
    const dirs = [...new Set(log.map(e => e.direction))].sort();
    rec("M2 14+beam", log.length === 14 && JSON.stringify(dirs) === "[0,2]" && JSON.stringify([...new Set(log.map(e => e.tick))]) === "[0,8,17,25,34,42,51]" && near(log[0].degree, 10, 4) && near(log[1].degree, 170, 4)
      && last.beam.ticks === 30 && lastTick >= 170 && m.arrows <= 14 && m.segs >= 1 && m.segs <= 64 && m.pics <= 14 && m.temp <= 14 + 64 + 6 + 1 + 6 && last.reason === "missed" && JSON.stringify(await hand()) === JSON.stringify(before) && clean3(await leftovers3()),
      JSON.stringify({ n: log.length, dirs, deg: log.slice(0, 2).map(e => Math.round(e.degree)), ticks: last.beam.ticks, lastTick, m }));
  });

  await check("M3 向きの追従(実マウス): 発射の途中・ビームの途中でマウスを 右→下→上 へ動かすと、ビームの向きが即追従し、当たる対象が変わる", async () => {
    await scene(3, { 3: rightOf(6), 4: [9, 15 + 6] }, "eros", 4);
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    await waitTick(40);
    const h1 = (await beamNow()).heading;
    await aimRel(0, 6); await sleep(250);
    const h2 = (await beamNow()).heading; await s.shot("m3_beam_down");
    await waitTick(130);
    await aimRel(0, -6); await sleep(250);
    const h3 = (await beamNow()).heading; await s.shot("m3_beam_up");
    await idle(60000); await s.slow(1);
    const last = await lastR(), p = last.beam.perTarget;
    rec("M3 beam follows", near(h1, 90, 4) && near(h2, 180, 5) && near(h3, 0, 5) && p.e3 && p.e4 && p.e3.ticks >= 3 && p.e4.ticks >= 3 && p.e3.ticks + p.e4.ticks <= 30 && last.beam.ticks === 30, JSON.stringify({ h1, h2, h3, e3: p.e3 && p.e3.ticks, e4: p.e4 && p.e4.ticks }));
  });

  await check("M4 ビームの合計(実機): 敵は30tick=240ダメージ、味方(敵の後ろ・HP100/5000)は30tick=900回復。1tickは8ダメージ・30回復。tick番号に重複なし", async () => {
    await scene(3, { 3: rightOf(6) });
    await addAllies([{ actorId: 2, eventId: 6, x: 9 + 9, y: 15, hp: 100, maxHp: 5000 }]);
    await aimRel(6, 0); await sleep(200);
    await json(`(function() { window.__upd = []; var d = ${"ProjectRCardDeck"}; return 1; })()`);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 20000 && (await seq()).length) { if (!shot && (await tickOf()) >= 70) { shot = true; await s.shot("m4_enemy_and_ally"); } await sleep(30); }
    await sleep(400);
    const last = await lastR(), p = last.beam.perTarget;
    const ticks = (await json(`${API}.getHitLog()`)).filter(h => h.beam).map(h => h.tick).slice(-30);
    const arrowEnemy = last.hits.filter(h => h.kind === "enemy").length, arrowAlly = last.hits.filter(h => h.kind === "ally").reduce((a, h) => a + h.healed, 0);
    rec("M4 totals", p.e3.ticks === 30 && p.e3.damage === 240 && p.a2.ticks === 30 && p.a2.healed === 900 && last.beam.damageTotal === 240 && last.beam.healTotal === 900 && JSON.stringify(ticks) === JSON.stringify(Array.from({ length: 30 }, (_, i) => i))
      && (await lost(3)) === 240 + arrowEnemy * 20 && (await allyHpOf(2)) === 100 + 900 + arrowAlly && (await barHp(6)) === 1000000 && (await pile()) === 1,
      JSON.stringify({ e3: p.e3, a2: p.a2, arrowEnemy, arrowAlly, lost: await lost(3), allyHp: await allyHpOf(2) }));
  });

  await check("M5 混在した対象と壁越え(実機): Region 255の壁(2列)の向こうの敵・仲間2人へビームが同時に当たる。NPCと満タンの仲間と主人公には当たらない", async () => {
    await scene(3, { 3: rightOf(7), 4: rightOf(5) });
    const ys = []; for (let y = 5; y <= 25; y++) ys.push(y);
    await wallSet(12, ys, 255); await wallSet(13, ys, 255);
    await ev("(function() { var e = $gameMap.event(4), d = e.event(); e.event = function() { return Object.assign({}, d, { note: '<npc>' }); }; return 'npc'; })()");
    await addAllies([{ actorId: 2, eventId: 6, x: 9 + 9, y: 15, hp: 100, maxHp: 5000 }, { actorId: 3, eventId: 5, x: 9 + 8, y: 15, hp: 300, maxHp: 300 }]);
    await ev("$gameParty.leader().setHp(Math.max(1, $gameParty.leader().mhp - 100)); 'hurt'");
    const hp0 = await json("$gameParty.leader().hp");
    await aimRel(6, 0); await sleep(200);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 20000 && (await seq()).length) { if (!shot && (await tickOf()) >= 60) { shot = true; await s.shot("m5_through_wall"); } await sleep(30); }
    await sleep(300);
    await wallSet(12, ys, 0); await wallSet(13, ys, 0);
    await ev("delete $gameMap.event(4).event; 'restore'");
    const last = await lastR(), p = last.beam.perTarget;
    rec("M5 mixed-wall", p.e3 && p.e3.ticks === 30 && p.a2 && p.a2.ticks === 30 && p.a2.healed === 900 && !p.e4 && !p.a3 && !p.player && (await allyHpOf(3)) === 300 && (await json("$gameParty.leader().hp")) === hp0 && (await lost(4)) === 0,
      JSON.stringify({ keys: Object.keys(p), e3: p.e3 && p.e3.ticks, a2: p.a2 && p.a2.healed, a3hp: await allyHpOf(3) }));
  });

  await check("M6 消費と重複発動(実機): 側面の矢が届かない遠い敵でもビームの最初のtickで1回消費(予約では消費しない)。確定後も矢14本・ビーム30tickは最後まで。ビームの間は別スロットを発動できない。全外れ・満タンの味方だけは非消費", async () => {
    await scene(3, { 3: rightOf(10) }, "eros", 2);
    await aimRel(6, 0); await sleep(200);
    const startInstances = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.instanceId; })");
    await fireTap();
    const early = { pile: await pile(), pending: await json(`${API}.isPending()`) };
    let at = null;
    for (let i = 0; i < 300; i++) { const q = await seq(); if (!q.length) break; if (q[0].committed) { at = q[0]; break; } await sleep(10); }
    await waitTick(110);
    const second = await json("ProjectRCardDeck.requestUseCard(1)");
    const stillBeam = (await beamNow()).active;
    const gone = await json(`ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.instanceId; }).indexOf(${JSON.stringify(startInstances[0])}) < 0`);
    await idle(60000); await s.slow(1);
    const last = await lastR(), pileEnd = await pile();
    const again = await json("ProjectRCardDeck.requestUseCard(0)");
    await idle(60000);
    // 全外れ(的なし)・満タンの味方だけ
    await sleep(5500);
    await scene(3, {});
    await addAllies([{ actorId: 2, eventId: 6, x: 9 + 6, y: 15, hp: 300, maxHp: 300 }]);
    await aimRel(6, 0); await sleep(200);
    const before = await hand();
    await fireTap(); await idle(60000);
    const miss = await lastR();
    // ビームは最初の更新(tick 0)で当たるので、予約のままの状態は1フレームも見えない(予約では消費しないことは単体テストで確認)。ここでは「確定は矢を放ち終える前(emitted<14)」を見る
    rec("M6 settlement", at && at.committed === true && at.emitted <= 4 && second.reason !== "pending" && stillBeam === true && gone === true && last.completed === true && last.cancelled === false
      && last.beam.perTarget.e3.ticks === 30 && last.emitted === 14 && pileEnd === 1 && again.reason === "pending" && miss.reason === "missed" && miss.consumed === false && JSON.stringify(await hand()) === JSON.stringify(before) && (await pile()) === 0 && (await allyHpOf(2)) === 300,
      JSON.stringify({ early, at: at && { emitted: at.emitted }, second: second.reason, stillBeam, gone, completed: last.completed, e3: last.beam.perTarget.e3 && last.beam.perTarget.e3.ticks, emitted: last.emitted, pileEnd, again: again.reason, miss: miss.reason }));
  });

  await sleep(6000);
  await check("M7 取消と後片付け(実機): 確定前のビームの途中の戦闘終了=非消費で全部0。確定後=消費は戻らずcancelled。ビームの途中で敵が消えても続き、消えた敵へtickは入らない", async () => {
    await scene(3, {}, "eros", 2);
    await aimRel(6, 0); await sleep(200);
    await fireTap(); await waitTick(100);
    const mid1 = { segs: await segs(), beam: (await beamNow()).active };
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const pre = await lastR(), e1 = await leftovers3();
    await s.slow(1); await sleep(6000);
    await scene(3, { 3: rightOf(10), 4: rightOf(11) }, "eros", 2);
    await aimRel(6, 0); await sleep(200);
    await fireTap(); await waitTick(60);
    const tBefore = (await beamNow()).perTarget.e3.ticks;
    await ev("$gameMap.event(3).erase(); 'erased'");
    await waitTick(110);
    const e4 = (await beamNow()).perTarget.e4, e3 = (await beamNow()).perTarget.e3.ticks;
    const mid2 = { segs: await segs() };
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'"); await sleep(500);
    const post = await lastR(), e2 = await leftovers3();
    rec("M7 cancel", mid1.segs >= 1 && mid1.beam === true && pre.consumed === false && pre.committed === false && clean3(e1) && e3 === tBefore && e4 && e4.ticks >= 5 && mid2.segs >= 1 && post.cancelled === true && post.completed === false && post.consumed === true && post.beam.ticks < 30 && clean3(e2) && s.errors().length === 0,
      JSON.stringify({ mid1, pre: pre.reason, e1, e3, tBefore, e4: e4 && e4.ticks, post: { cancelled: post.cancelled, ticks: post.beam.ticks }, e2, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000);
  await check("M8 性能(実機): 敵2体+味方2人がビームに入るLv3、Lv2(21本)、待機の1frameの処理時間(updateScene)を測る", async () => {
    const install = () => ev(`(function() { if (window.__perfInstalled) return 'already'; window.__perfInstalled = true; window.__perf = { upd: [], on: false };
      var orig = SceneManager.updateScene; SceneManager.updateScene = function() { var t = performance.now(); var r = orig.apply(this, arguments); if (window.__perf.on) window.__perf.upd.push(performance.now() - t); return r; }; return 'installed'; })()`);
    await install();
    const stats = async () => json(`(function() { var u = window.__perf.upd.slice().sort(function(a, b) { return a - b; });
      var avg = function(a) { return a.length ? a.reduce(function(x, y) { return x + y; }, 0) / a.length : 0; }, pct = function(a, p) { return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0; };
      return { n: u.length, avg: avg(u), p95: pct(u, 0.95), max: u[u.length - 1] || 0 }; })()`);
    const measure = async (label, run) => { await ev("window.__perf.upd = []; window.__perf.on = true; 'on'"); await run(); await ev("window.__perf.on = false; 'off'"); const r = await stats(); console.log("  perf", label, JSON.stringify(r)); return r; };
    const crowd = async lv => { await scene(lv, { 3: rightOf(5), 4: rightOf(8) }); await addAllies([{ actorId: 2, eventId: 5, x: 9 + 6, y: 15.2, hp: 100, maxHp: 99999 }, { actorId: 3, eventId: 6, x: 9 + 9, y: 15, hp: 100, maxHp: 99999 }]); await aimRel(6, 0); await sleep(150); };
    await crowd(3);
    const idleR = await measure("待機(1.5秒・敵2+味方2)", async () => { await sleep(1500); });
    const lv3R = await measure("Lv3(14本+3秒ビーム・敵2体+味方2人に命中)", async () => { await fireTap(); await sleep(300); await idle(30000); });
    await sleep(5500);
    await crowd(2);
    const lv2R = await measure("Lv2(21本・同じ配置)", async () => { await fireTap(); await sleep(300); await idle(30000); });
    const last3 = lv3R;
    rec("M8 performance", lv3R.n > 150 && lv3R.p95 < 16.7 && lv3R.max < 33 && lv3R.avg < 8 && lv3R.avg - idleR.avg < 6 && lv2R.n > 30, JSON.stringify({ idle: idleR, lv3: lv3R, lv2: lv2R }));
  });

  await check("M9 退行なし(実機): Lv1は10本(200ダメージ)・Lv2は21本でビームなし・黄金の矢Lv1は従来どおり", async () => {
    await scene(1, { 3: rightOf(6) });
    await aimRel(6, 0); await sleep(200); await fireTap(); await idle(30000);
    const l1 = (await json(`${API}.getEmissionLog()`)).slice(-10), d1 = await lost(3), b1 = await beamNow();
    await sleep(5500);
    await scene(2, {});
    await aimRel(6, 0); await sleep(200); await fireTap(); await idle(30000);
    const l2 = (await json(`${API}.getEmissionLog()`)).slice(-21), b2 = await beamNow(), s2 = await segs();
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene(1, { 4: [13, 15] }, "golden");
    await aimRel(4, 0); await sleep(200); await fireTap();
    await wait("ProjectRApolloGoldenVolley.getLastResult() && ProjectRApolloGoldenVolley.getLastResult().committed === true", 8000);
    await sleep(2500);
    const g = await json("ProjectRApolloGoldenVolley.getLastResult()"), bar = await barHp(4);
    rec("M9 regression", l1.length === 10 && d1 === 200 && b1 === null && l2.length === 21 && b2 === null && s2 === 0 && g && g.committed === true && g.arrows === 3 && 1000000 - bar > 0 && (1000000 - bar) % 50 === 0,
      JSON.stringify({ l1: l1.length, d1, b1, l2: l2.length, b2, golden: g && g.arrows, dealt: 1000000 - bar }));
  });

  rec("MZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a6c_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
