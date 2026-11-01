// Phase Apollo-A6A: 実機(Playtest)の確認 — エロスの矢 Lv1。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a6a_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・仲間(PartyCombat)・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
//   視覚の証拠(連射・追尾・回復・壁越え・複数の対象)は MZ_OUT の e*.png に残る。
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
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000000 - await barHp(id);
  const aimAt = (x, y) => s.aim(x - 9, y - 15);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const events = () => json("$gameMap.events().filter(function(e) { return e && /projectRErosArrow/.test(e.event().note || ''); }).length");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const seq = () => json(`${API}.getSequences()`);
  const tickOf = async () => { const q = await seq(); return q.length ? q[0].tick : -1; };
  const waitTick = async (n, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { const k = await tickOf(); if (k >= n || k < 0) return k; await sleep(15); } return -2; };
  const idle = async (ms = 20000) => wait(`${API}.getSequences().length === 0`, ms);
  const leftovers = async () => ({ events: await events(), pics: await pics("/apollo_eros/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    summons: await json("ProjectRGodSummonManager.getActiveSummons().length"), temp: await json(`${API}.getTempObjectCount()`), jobs: await json(`${API}.getActiveVfxJobs().length`), seq: (await seq()).length });
  const clean = v => v.events === 0 && v.pics === 0 && v.followers === 0 && v.anchors === 0 && v.summons === 0 && v.temp.total === 0 && v.jobs === 0 && v.seq === 0;
  const scene = async (enemies = {}, kind = "eros", slow = 1) => {
    const started = await json(`ProjectRApolloTest.start(1, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(slow); await random(0.9);
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); return 'ok'; })()"); // 前の確認で消した敵を戻す
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const addAlly = async (eventId, x, y, hp = 100, maxHp = 400) => {
    await ev(`(function() { var p = ProjectRPartyCombat; p.registerAlly({ actorId: 2, name: 'ally2', maxHp: ${maxHp}, normalAttack: { id: 'n2', range: 1.5, cooldownSeconds: 1 } });
      if (p.isActive()) p.endSession(); p.startSession([2]); p.damageAlly(2, ${maxHp - hp}); $gameMap.event(${eventId}).linkedActorId = 2; $gameMap.event(${eventId}).locate(${x}, ${y}); return 'ally'; })()`);
    await settle();
  };
  const allyHp = () => json("ProjectRPartyCombat.members().filter(function(m) { return m.actorId === 2; })[0].hp");
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("E0 boot: エロスの矢の登録(特殊・最大5枚・Cooldown 5・maxLevel 1)・数値(10本/1秒/3マス/20/50)・VFXキーとライブラリと素材・Map002の矢のPrefab", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), cfg: ${API}.config(), keys: ProjectRPresentationVfx.keys().filter(function(k) { return /apollo_eros/.test(k); }).sort(),
      fields: ['emitSeconds','homingRadiusTiles','homingTurnRate','projectileLifetimeSeconds','selfHealEnabled','fullHpAlliesEligible','healAmount','damage'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }),
      template: !!$dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Eros Arrow'; }), status: ProjectRCardCatalog.godStatus('apollo'), lv: ProjectRCardDeck.setCardLevel('${CARD}', 3) && ProjectRCardDeck.getPersistentData().cardOwnership['${CARD}'].level })`);
    const libs = ["ProjectR_Eros_Muzzle", "ProjectR_Eros_Glow", "ProjectR_Eros_HitDamage", "ProjectR_Eros_HitHeal"];
    const lib = await ev(`Promise.all(${JSON.stringify(libs)}.map(function(n) { return Promise.resolve(getAnimationFromLibrary(n)).then(function(a) { return !!a; }, function() { return false; }); })).then(function(r) { return r.every(Boolean); })`);
    const files = ["img/characters/VFX/$ProjectR_ErosArrow.png", ...libs.map(n => `img/pictures/Animation/${n}.png`)].every(f => fs.existsSync(f));
    const d = v.def, cf = v.cfg;
    rec("E0 boot", d.maxCopies === 5 && d.cooldownSeconds === 5 && d.maxLevel === 2 && d.rarity === "special" && d.targetType === "ground" && cf.count === 10 && cf.emitFrames === 60 && cf.radius === 3 && cf.damage === 20 && cf.heal === 50
      && v.keys.length === 4 && v.fields && v.template && v.status.implemented === 2 && v.lv === 2 && lib === true && files, JSON.stringify({ ...v, lib, files }).slice(0, 600));
  });

  await check("E1 連射と方向転換(実マウス+実キーQ): 10本が60更新に等間隔。途中でマウスを動かすと、あとの矢は新しい方向へ出る", async () => {
    await scene({ 4: [13, 15] }, "eros", 4); // 4倍遅く(1秒の連射が約4秒)にして、マウスを動かすタイミングを確実にとる
    await aimAt(13, 15); await sleep(200);
    await fireTap();
    const k1 = await waitTick(26); await aimAt(9, 11); // 真上へ
    await s.shot("e1_aim_up");
    const k2 = await waitTick(46); await aimAt(5, 15); // 左へ
    await idle(30000);
    await s.slow(1);
    const log = await json(`${API}.getEmissionLog()`);
    const degrees = log.map(e => Math.round(e.degree));
    const ticks = log.map(e => e.tick);
    const dmg = await lost(4);
    const first = degrees.slice(0, 5), second = degrees.slice(5, 8), third = degrees.slice(8);
    const near = (list, v) => list.every(d => Math.min(Math.abs(d - v), 360 - Math.abs(d - v)) <= 4);
    rec("E1 連射・方向転換", log.length === 10 && JSON.stringify(ticks) === "[0,6,12,18,24,30,36,42,48,54]" && near(first, 90) && near(second, 0) && near(third, 270) && dmg === 20 * 5 && (await pile()) === 1,
      JSON.stringify({ k1, k2, degrees, ticks, dmg, pile: await pile() }));
  });

  await check("E2 敵への追尾と20ダメージ(実機): 右へ撃つと、右6・上2の敵へ曲がって10本とも当たり合計200。カードは1枚だけ消費", async () => {
    await scene({ 4: [15, 13] });
    await aimAt(15, 15); await sleep(200);
    const before = await hand();
    await fireTap();
    let maxPics = 0, maxTemp = 0, maxEvents = 0, shotMid = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) {
      const p = await pics("/apollo_eros/"), temp = (await json(`${API}.getTempObjectCount()`)).total, e = await events();
      maxPics = Math.max(maxPics, p); maxTemp = Math.max(maxTemp, temp); maxEvents = Math.max(maxEvents, e);
      if (!shotMid && (await tickOf()) >= 22) { shotMid = true; await s.shot("e2_homing_mid"); }
      await sleep(30);
    }
    await s.shot("e2_end");
    await sleep(500);
    const last = await json(`${API}.getLastResult()`);
    const end = await leftovers();
    rec("E2 homing-damage", (await lost(4)) === 200 && last.hits.length === 10 && last.hits.every(h => h.kind === "enemy" && h.damage === 20 && h.hpLost === 20) && last.committed === true && (await pile()) === 1
      && (await hand()).filter(x => x === CARD).length === before.filter(x => x === CARD).length - 1 && maxEvents <= 10 && maxPics <= 12 && maxTemp <= 22 && clean(end),
      JSON.stringify({ lost: await lost(4), hits: last.hits.length, maxEvents, maxPics, maxTemp, end }));
  });

  await check("E3 追尾の範囲(3マス): 一度も3マス以内に入らない敵(上5マス)へは曲がらず外れ、非消費。すぐ撃ち直せる", async () => {
    await scene({ 4: [17, 10] });
    await aimAt(17, 15); await sleep(200);
    const before = await hand();
    await fireTap(); await sleep(300);
    const pend = await json(`${API}.isPending()`);
    await idle();
    const last = await json(`${API}.getLastResult()`);
    const again = await json("ProjectRCardDeck.requestUseCard(0)");
    const handAfter = await hand();
    await idle();
    rec("E3 out-of-radius", pend === true && (await lost(4)) === 0 && last.reason === "missed" && last.consumed === false && JSON.stringify(before) === JSON.stringify(handAfter) && (await pile()) === 0 && again.reason === "pending",
      JSON.stringify({ pend, lost: await lost(4), reason: last.reason, again: again.reason }));
  });

  await check("E4 味方への追尾と50回復(実機): 出撃中の仲間のHPが50ずつ戻り(最大400)、<enemy>枠のEventにダメージは入らない", async () => {
    await scene({});
    await addAlly(6, 15, 14, 100, 400);
    await aimAt(15, 15); await sleep(200);
    const hp0 = await allyHp(), enemyHp0 = await barHp(6);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) { if (!shot && (await tickOf()) >= 24) { shot = true; await s.shot("e4_ally_heal"); } await sleep(30); }
    await sleep(300);
    const last = await json(`${API}.getLastResult()`);
    const healed = last.hits.filter(h => h.kind === "ally");
    rec("E4 ally-heal", hp0 === 100 && (await allyHp()) === 400 && healed.length === 6 && healed.every(h => h.healed === 50) && last.hits.every(h => h.kind === "ally") && (await barHp(6)) === enemyHp0 && (await pile()) === 1,
      JSON.stringify({ hp0, hp: await allyHp(), healed: healed.length, kinds: [...new Set(last.hits.map(h => h.kind))], enemyHp: await barHp(6) - enemyHp0 }));
  });

  await check("E5 壁越え(実機): Region 255の壁の向こうの敵にも10本とも当たる。壁で止まらない", async () => {
    await scene({ 4: [15, 15] });
    const wall = ys => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(ys)}.forEach(function(y) { m.data[5 * size + y * m.width + 12] = 255; }); return 'wall'; })()`);
    const ys = []; for (let y = 10; y <= 20; y++) ys.push(y);
    await wall(ys);
    await aimAt(15, 15); await sleep(200);
    await fireTap();
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await seq()).length) { if (!shot && (await tickOf()) >= 30) { shot = true; await s.shot("e5_through_wall"); } await sleep(30); }
    await sleep(300);
    await ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(ys)}.forEach(function(y) { m.data[5 * size + y * m.width + 12] = 0; }); return 'unwall'; })()`);
    rec("E5 wall-pass", (await lost(4)) === 200 && (await pile()) === 1, JSON.stringify({ lost: await lost(4), pile: await pile() }));
  });

  await check("E6 複数の対象と二重命中の防止(実機): 2体の敵と味方1人へ別々に当たり、1本は1回だけ。合計が命中数と一致", async () => {
    await scene({ 4: [15, 11], 5: [15, 19] }, "eros", 3);
    await addAlly(6, 15, 15, 100, 1000);
    await aimAt(15, 11); await sleep(200);
    await fireTap();
    await waitTick(20); await aimAt(15, 15); // 味方へ
    await waitTick(38); await aimAt(15, 19); // 下の敵へ
    let shot = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000 && (await seq()).length) { if (!shot && (await tickOf()) >= 44) { shot = true; await s.shot("e6_multi"); } await sleep(30); }
    await s.slow(1);
    await sleep(300);
    const last = await json(`${API}.getLastResult()`);
    const log = last.hits;
    const arrows = log.map(h => h.arrow), enemyHits = log.filter(h => h.kind === "enemy"), allyHits = log.filter(h => h.kind === "ally");
    rec("E6 multi-target", new Set(arrows).size === arrows.length && log.length <= 10 && enemyHits.length + allyHits.length === log.length && (await lost(4)) + (await lost(5)) === enemyHits.length * 20
      && (await allyHp()) === 100 + allyHits.reduce((a, h) => a + h.healed, 0) && log.length >= 6 && new Set(log.map(h => h.key)).size >= 2 && last.committed === true,
      JSON.stringify({ n: log.length, kinds: [enemyHits.length, allyHits.length], keys: [...new Set(log.map(h => h.key))], lost: [await lost(4), await lost(5)], allyHp: await allyHp() }));
  });

  await check("E7 消費と重複発動(実機): 予約では消費せず、最初の命中で1回(連射の途中)。連射中は同じカードを発動できず、全部外れたら非消費", async () => {
    await scene({ 4: [16, 15] }, "eros", 3);
    await aimAt(16, 15); await sleep(200);
    const before = await hand();
    await fireTap();
    await waitTick(3);
    const early = { pile: await pile(), hand: await hand(), pending: await json(`${API}.isPending()`) };
    const second = await json("ProjectRCardDeck.requestUseCard(1)");
    let at = null;
    for (let i = 0; i < 400; i++) { const q = await seq(); if (!q.length) break; if (q[0].committed) { at = q[0]; break; } await sleep(20); }
    const during = await json("ProjectRCardDeck.requestUseCard(1)");
    await idle(30000);
    await s.slow(1);
    const last = await json(`${API}.getLastResult()`);
    const handEnd = await hand();
    rec("E7 consume", early.pile === 0 && JSON.stringify(early.hand) === JSON.stringify(before) && early.pending === true && second.reason !== "pending" && at && at.committed === true && at.emitted < 10 && during.reason !== "pending"
      && (await pile()) === 1 && handEnd.filter(x => x === CARD).length === before.filter(x => x === CARD).length - 1 && (await lost(4)) === 200 && last.hits.length === 10,
      JSON.stringify({ early: { pile: early.pile, pending: early.pending }, second: second.reason, at, during: during.reason, pile: await pile(), lost: await lost(4) }));
  });

  await check("E8 取消と後片付け(実機): 連射の途中の戦闘終了・敵の消滅で、矢のEvent・VFX・Apollo・錨が残らない。敵が消えても例外なし", async () => {
    await scene({ 4: [20, 15] }, "eros", 2);
    await aimAt(20, 15); await sleep(200);
    await fireTap();
    await waitTick(20);
    const mid = { events: await events(), pics: await pics("/apollo_eros/"), temp: (await json(`${API}.getTempObjectCount()`)).total };
    await ev("$gameMap.event(4).erase(); 'erased'");
    await idle(30000);
    const afterErase = await json(`${API}.getLastResult()`);
    const e1 = await leftovers();
    await s.slow(1);
    // 戦闘終了
    await scene({ 4: [20, 15] }, "eros", 2);
    await aimAt(20, 15); await sleep(200);
    await fireTap(); await waitTick(15);
    const live = await events();
    await ev("ProjectRCardDeck.endCardBattle(); 'ended'");
    await sleep(500);
    const e2 = await leftovers();
    rec("E8 cleanup", mid.events >= 2 && mid.pics >= 1 && afterErase.reason === "missed" && clean(e1) && live >= 1 && clean(e2) && s.errors().length === 0, JSON.stringify({ mid, reason: afterErase.reason, e1, live, e2, errors: s.errors().slice(0, 2) }));
  });

  await sleep(6000); // 戦闘の余韻
  await check("E9 退行なし(実機): 黄金の矢 Lv1(扇3本・50ダメージ)は従来どおり。エロスの矢の登録で変わらない", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene({ 4: [13, 15] }, "golden");
    await aimAt(13, 15); await sleep(200);
    const hp0 = await json("$gameMap.getCurrentEventHp(4)"), bar0 = await barHp(4);
    await fireTap();
    await wait("ProjectRApolloGoldenVolley.getLastResult() && ProjectRApolloGoldenVolley.getLastResult().committed === true", 8000);
    await sleep(2500);
    const last = await json("ProjectRApolloGoldenVolley.getLastResult()");
    const hp1 = await json("$gameMap.getCurrentEventHp(4)"), bar1 = await barHp(4), dealt = bar0 - bar1; // HPバーの表示値の差(バーのリセットは実HPへ遅れて反映されるため、実HPの差は使わない)
    rec("E9 golden-volley-unchanged", last && last.committed === true && last.arrows === 3 && dealt > 0 && dealt <= 150 && dealt % 50 === 0 && (await json(`${API}.getSequences().length`)) === 0,
      JSON.stringify({ arrows: last && last.arrows, hp0, hp1, bar0, bar1, dealt, hits: last && last.hits }));
  });

  rec("EZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a6a_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
