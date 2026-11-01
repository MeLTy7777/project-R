// Phase Apollo-A7: 実機(Playtest)の確認 — ギガース殺し Lv1〜3。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a7_gigas_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持・壁(Region 255)はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_gigas_slayer", API = "ProjectRApolloGigasSlayer", GV = "ProjectRGodSummonVisual", ST = "ProjectRApolloStatus";
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
  const pile = () => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length : 0; })()");
  const arrows = () => json("$gameMap.events().filter(function(e) { return e && /projectRGigasArrow/.test(e.event().note || ''); }).length");
  const pics = pattern => json(`(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return ${pattern}.test(String(p.note || '')); }).length`);
  const shots = () => json(`${API}.getShots()`);
  const idle = async (ms = 20000) => wait(`${API}.getShots().length === 0`, ms);
  const phaseIs = p => wait(`(${API}.getShots()[0] || {}).phase === '${p}'`, 6000);
  const leftovers = async () => ({ arrows: await arrows(), loops: await pics("/apollo_charge|apollo_volley/"), followers: await json(`${GV}.getFollowers().length`), anchors: await json(`${GV}.getAnchors().length`),
    summons: await json("ProjectRGodSummonManager.getActiveSummons().length"), jobs: await json(`${API}.getActiveVfxJobs().length`), shots: (await shots()).length });
  const clean = v => v.arrows === 0 && v.followers === 0 && v.anchors === 0 && v.summons === 0 && v.jobs === 0 && v.shots === 0;
  const scene = async (enemies = {}, level = 1, kind = "gigas", slow = 1) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${kind}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(slow); await random(0.9);
    await staging([2, 3, 4, 5, 6]);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } }); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    for (const [id, [x, y]] of Object.entries(enemies)) await locate(Number(id), x, y);
    await resetHp(); await sleep(200);
  };
  const fireTap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("G0 boot: ギガース殺しの登録(強力・最大5枚・Cooldown 3・maxLevel 3)・Lv別の数値・状態台帳・Map002の矢のPrefab・バランス項目", async () => {
    const v = await json(`({ def: ProjectRCardDeck.definitions.card('${CARD}'), c1: ${API}.config(1), c2: ${API}.config(2), c3: ${API}.config(3), template: !!$dataTemplateMap.events.find(function(e) { return e && e.name === 'ProjectR Apollo Gigas Slayer Arrow'; }),
      status: ProjectRCardCatalog.godStatus('apollo'), ledger: typeof ${ST}.apply, policy: ProjectRDamageModifiers.getPolicy(),
      fields: ['chargeSeconds','weakSeconds','weakDamageTaken','woundSeconds','woundDamagePerSecond','woundTickSeconds','woundDamageTaken'].every(function(k) { return !!ProjectRCardBalance.fieldOf(k); }) })`);
    const d = v.def;
    rec("G0 boot", d.maxCopies === 5 && d.cooldownSeconds === 3 && d.maxLevel === 3 && d.rarity === "strong" && d.targetType === "ground" && v.c1.damage === 100 && v.c1.chargeFrames === 30 && v.c1.weakTaken === 2 && v.c1.weakSeconds === 5
      && v.c2.wound === true && v.c2.woundDps === 30 && v.c3.beam === true && v.c3.beamWidth === 3 && v.template && v.fields && v.ledger === "function" && v.policy === "uncommitted" && v.status.implemented >= 3, JSON.stringify(v).slice(0, 500));
  });

  await check("G1 Lv1(実マウス+実キーQ): 発動直後は未消費で矢なし → 0.5秒のチャージ → 太い矢 → 命中で1回だけ消費して100ダメージ + 弱点状態(x2)", async () => {
    await scene({ 4: [15, 15] }, 1);
    await aimAt(15, 15); await sleep(200);
    const before = await hand();
    await fireTap();
    await sleep(150);
    const early = { phase: (await shots())[0]?.phase, arrows: await arrows(), pile: await pile(), hand: await hand(), pending: await json(`${API}.isPending()`) };
    await s.shot("g1_charge");
    await phaseIs("flight");
    const fly = { arrows: await arrows(), arrow: await json(`${API}.getArrow()`) };
    await s.shot("g1_flight");
    await idle();
    await sleep(200);
    const last = await json(`${API}.getLastResult()`);
    const weak = await json(`${ST}.list('event:4')`);
    const l1 = await lost(4);
    // 2発目: 弱点中なので100の2倍=200
    await aimAt(15, 15); await sleep(150);
    await fireTap(); await idle();
    await sleep(200);
    rec("G1 lv1", early.phase === "charge" && early.arrows === 0 && early.pile === 0 && JSON.stringify(early.hand) === JSON.stringify(before) && early.pending === true && fly.arrows === 1 && fly.arrow.width === 1
      && l1 === 100 && last.committed === true && last.totalHits === 1 && weak.length === 1 && weak[0].id === "gigas_weak" && weak[0].spec.damageTaken === 2 && (await lost(4)) === 300 && (await pile()) === 2,
      JSON.stringify({ early, fly: fly.arrows, l1, weak: weak.length, total: await lost(4), pile: await pile() }));
  });

  await check("G2 Lv2: 傷状態(x1.1 → 弱点x2との積x2.2)と秒間30のスリップ(1秒ごと5回 x 66)。命中自体は倍にならない", async () => {
    await scene({ 4: [15, 15] }, 2);
    await aimAt(15, 15); await sleep(200);
    await fireTap(); await idle();
    await sleep(200);
    const l0 = await lost(4);
    const f = await json(`${ST}.factorOf('event:4')`);
    const ids = (await json(`${ST}.list('event:4')`)).map(x => x.id).sort();
    await s.shot("g2_wound");
    await wait(`${ST}.list('event:4').length === 0`, 9000);
    await sleep(300);
    rec("G2 lv2", l0 === 100 && Math.abs(f.damageTaken - 2.2) < 1e-9 && JSON.stringify(ids) === JSON.stringify(["gigas_wound", "gigas_weak"].sort()) && (await lost(4)) === 100 + 5 * 66, JSON.stringify({ l0, f, ids, total: await lost(4) }));
  });

  await check("G3 Lv3: 幅3マスのビーム。2体(真横1マスずれ含む)に各11ヒット、1体 100 + 10 x 220 = 2300。幅の外の敵は無傷。消費は1回。ヒットストップ", async () => {
    await scene({ 4: [15, 15], 5: [15, 16], 3: [15, 19] }, 3);
    await aimAt(15, 15); await sleep(200);
    await fireTap();
    await phaseIs("beam");
    await s.shot("g3_beam");
    await idle();
    await sleep(300);
    const last = await json(`${API}.getLastResult()`);
    const by = Object.fromEntries(last.targets.map(t => [t.eventId, t]));
    rec("G3 lv3-beam", last.committed === true && by[4] && by[5] && by[4].hits === 11 && by[5].hits === 11 && !by[3] && (await lost(4)) === 2300 && (await lost(5)) === 2300 && (await lost(3)) === 0 && (await pile()) === 1
      && by[4].hitStopFrames > 0 && (await arrows()) === 0, JSON.stringify({ t: last.targets, l4: await lost(4), l5: await lost(5), l3: await lost(3), pile: await pile() }));
  });

  await check("G4 外れと重複(実機): 外れ(幅の外)は非消費で即再発動できる。チャージ中・飛行中の再発動は gigasPending。壁(Region 255)は矢もビームも止める", async () => {
    await scene({ 4: [15, 19] }, 1);
    await aimAt(15, 15); await sleep(200);
    const before = await hand();
    await fireTap(); await sleep(120);
    const dup1 = await json("ProjectRCardDeck.requestUseCard(1)");
    await phaseIs("flight");
    const dup2 = await json("ProjectRCardDeck.requestUseCard(1)");
    await idle();
    const last = await json(`${API}.getLastResult()`);
    const again = await json("ProjectRCardDeck.requestUseCard(0)");
    await idle();
    const miss = { dup1: dup1.detail, dup2: dup2.detail, reason: last.reason, pile: await pile(), hand: JSON.stringify(await hand()) === JSON.stringify(before), again: again.detail, lost: await lost(4) };
    // 壁
    const walls = [];
    for (let y = 9; y <= 21; y++) walls.push(y);
    const setWall = v => ev(`(function() { var m = $dataMap, size = m.width * m.height; ${JSON.stringify(walls)}.forEach(function(y) { m.data[5 * size + y * m.width + 12] = ${v}; }); return 'wall'; })()`);
    const wallResults = [];
    for (const level of [1, 3]) {
      await scene({ 4: [16, 15] }, level);
      await setWall(255);
      await aimAt(16, 15); await sleep(200);
      await fireTap(); await idle(25000);
      const r = await json(`${API}.getLastResult()`);
      wallResults.push({ level, reason: r.reason, lost: await lost(4), pile: await pile() });
      await setWall(0);
    }
    rec("G4 miss-dup-wall", miss.dup1 === "gigasPending" && miss.dup2 === "gigasPending" && miss.reason === "missed" && miss.pile === 0 && miss.hand && miss.again === "gigasReserved" && miss.lost === 0
      && wallResults.every(r => r.reason === "missed" && r.lost === 0 && r.pile === 0), JSON.stringify({ miss, wallResults }));
  });

  await check("G5 取消と後片付け(実機): チャージ中・飛行中・ビーム中の戦闘終了で、矢のEvent・VFX・Apollo・錨・ヒットストップが残らない。敵が消えても例外なし", async () => {
    const out = [];
    for (const [level, until] of [[1, "charge"], [1, "flight"], [3, "beam"]]) {
      await scene({ 4: [20, 15] }, level);
      await aimAt(20, 15); await sleep(200);
      await fireTap(); await phaseIs(until); await sleep(60);
      const live = { arrows: await arrows(), shots: (await shots()).length, summons: await json("ProjectRGodSummonManager.getActiveSummons().length") };
      await ev("ProjectRCardDeck.endCardBattle(); 'ended'");
      await sleep(500);
      out.push({ level, until, live, after: await leftovers(), pile: await pile(), reason: (await json(`${API}.getLastResult()`)).reason });
    }
    await scene({ 4: [20, 15] }, 1);
    await aimAt(20, 15); await sleep(200);
    await fireTap(); await phaseIs("flight");
    await ev("$gameMap.event(4).erase(); 'erased'");
    await idle();
    const erased = { last: await json(`${API}.getLastResult()`), left: await leftovers(), pile: await pile() };
    rec("G5 cleanup", out.every(o => clean(o.after) && o.pile === 0 && o.reason === "battleEnd") && out[0].live.shots === 1 && out[1].live.arrows === 1 && erased.last.reason === "missed" && clean(erased.left) && erased.pile === 0 && s.errors().length === 0,
      JSON.stringify({ out, erased: erased.last.reason, errors: s.errors().slice(0, 2) }));
  });

  await check("G6 性能(実機): Lv3のビーム中のupdateScene(敵3体に連続ヒット)。1フレームの予算(16.7ms)に対して十分に小さい", async () => {
    await scene({ 4: [15, 15], 5: [15, 16], 6: [17, 15] }, 3);
    await aimAt(15, 15); await sleep(200);
    await ev(`(function() { window.__perf = { t: [], on: true }; if (!window.__perfInstalled) { var o = SceneManager.updateScene; SceneManager.updateScene = function() { var t0 = performance.now(); var r = o.apply(this, arguments); if (window.__perf && window.__perf.on) window.__perf.t.push(performance.now() - t0); return r; }; window.__perfInstalled = true; } return 'ok'; })()`);
    await fireTap(); await idle(); await sleep(200);
    const t = await json("window.__perf.t"); await ev("window.__perf.on = false; 'off'");
    t.sort((a, b) => a - b);
    const avg = t.reduce((a, b) => a + b, 0) / t.length, p95 = t[Math.floor(t.length * 0.95)], max = t[t.length - 1];
    rec("G6 perf", t.length > 30 && avg < 8 && p95 < 14, JSON.stringify({ n: t.length, avg: +avg.toFixed(2), p95: +p95.toFixed(2), max: +max.toFixed(2) }));
  });

  await sleep(6000);
  await check("G7 退行なし(実機): 黄金の矢 Lv1(扇3本・50ダメージ)は従来どおり", async () => {
    await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6000);
    await scene({ 4: [13, 15] }, 1, "golden");
    await aimAt(13, 15); await sleep(200);
    const bar0 = await barHp(4);
    await fireTap();
    await wait("ProjectRApolloGoldenVolley.getLastResult() && ProjectRApolloGoldenVolley.getLastResult().committed === true", 8000);
    await sleep(2500);
    const last = await json("ProjectRApolloGoldenVolley.getLastResult()");
    const dealt = bar0 - await barHp(4);
    rec("G7 golden-unchanged", last && last.committed === true && last.arrows === 3 && dealt > 0 && dealt <= 150 && dealt % 50 === 0, JSON.stringify({ arrows: last && last.arrows, dealt }));
  });

  rec("GZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a7_gigas_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
