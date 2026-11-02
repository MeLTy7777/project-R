// Phase Apollo-A8: 実機(Playtest)の確認 — 弓の3枚(黄金の矢 / エロスの矢 / ギガース殺し)の「射程：∞」。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a8_range_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   アリーナ(Map004)の地図を、このセッションのメモリ上だけ 200x60 の壁の無い広い床に置き換えて確かめる(ファイルは書かない・セーブしない)。
//   実機の画面は 1920x1080 = 40x22.5マス。従来の実際の上限は「矢が画面の外へ出る(isNearTheScreen)」「黄金の矢/ギガースは40マス」「エロスは2秒/24マス・ビーム12マス」だった。
//   入力はCDP(マウス移動 + キー。人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const G = "apollo_golden_volley", E = "apollo_eros_arrow", S_ = "apollo_gigas_slayer";
const API = { [G]: "ProjectRApolloGoldenVolley", [E]: "ProjectRApolloErosArrow", [S_]: "ProjectRApolloGigasSlayer" };
const KIND = { [G]: "golden", [E]: "eros", [S_]: "gigas" };
const NOTE = { [G]: "projectRGoldenVolley", [E]: "projectRErosArrow", [S_]: "projectRGigasArrow" };
const PX = 30, PY = 30; // プレイヤーの位置(カメラが中央に来て、右へ170マス続く)
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 600)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); return 'reset'; })()"); await sleep(150); };
  const lost = async id => 1000000 - await barHp(id);
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const hand = () => json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
  const pile = card => json("(function() { var b = ProjectRCardDeck.getBattleState(); return b ? b.cooldownPile.filter(function(e) { return e.instance.cardId === '" + card + "'; }).length : 0; })()");
  const arrowEvents = card => json(`$gameMap.events().filter(function(e) { return e && /${NOTE[card]}/.test(e.event().note || ''); }).length`);
  const beamEvents = () => json("$gameMap.events().filter(function(e) { return e && /projectRErosBeam/.test(e.event().note || ''); }).length");
  const maxArrowX = card => json(`Math.max.apply(null, [0].concat($gameMap.events().filter(function(e) { return e && /${NOTE[card]}/.test(e.event().note || ''); }).map(function(e) { return e._realX; })))`);
  const busy = card => json(`(function() { var a = ${API[card]}; var n = $gameMap.events().filter(function(e) { return e && /${NOTE[card]}|projectRErosBeam/.test(e.event().note || ''); }).length;
    return n > 0 || (a.isPending && a.isPending()) || (a.getShots && a.getShots().length > 0) || (a.getBeam && !!a.getBeam()) || (a.getActiveArrows && a.getActiveArrows().length > 0); })()`);
  const idle = async (card, ms = 40000) => { const t = Date.now(); while (Date.now() - t < ms) { if (!(await busy(card))) return Date.now() - t; await sleep(50); } return -1; };
  const leftovers = async card => ({ arrows: await arrowEvents(card), segments: await beamEvents(), followers: await json("ProjectRGodSummonVisual.getFollowers().length"), anchors: await json("ProjectRGodSummonVisual.getAnchors().length"),
    summons: await json("ProjectRGodSummonManager.getActiveSummons().length"), loops: await json("(AnimatedPictureManager._animatedPictures || []).filter(function(p) { return /apollo_(charge|volley.beam|eros.beam|gigas)/.test(String(p.note || '')); }).length") });
  const clean = v => v.arrows === 0 && v.segments === 0 && v.followers === 0 && v.anchors === 0 && v.summons === 0 && v.loops === 0;
  const setWall = (dx, v) => ev(`(function() { var m = $dataMap, size = m.width * m.height; for (var y = ${PY - 10}; y <= ${PY + 10}; y++) m.data[5 * size + y * m.width + ${PX + dx}] = ${v}; return 'wall'; })()`);
  const scene = async (card, level, enemies = {}) => {
    const started = await json(`ProjectRApolloTest.start(${level}, '${KIND[card]}')`);
    if (!started.ok) throw new Error("start failed " + JSON.stringify(started));
    await sleep(400); await s.slow(1); await random(0.9);
    await ev("(function() { var p = ProjectRPartyCombat; if (p.isActive()) p.endSession(); ProjectRApolloStatus.clear('script'); [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; if (e._erased) { e._erased = false; e.refresh(); } e.locate(2 + id, 58); }); return 'ok'; })()");
    await s.place(PX, PY); await sleep(500);
    for (const [id, dx, dy] of enemies) await locate(id, PX + dx, PY + (dy || 0));
    await resetHp(); await sleep(200);
    await s.aim(3, 0); await sleep(200);
  };
  const tap = async () => { await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); };
  const hold = async ms => { await c.keyDown("Q"); await sleep(ms); await c.keyUp("Q"); };
  const finish = async (card, id = "") => { const t = await idle(card); await sleep(1200); /* ビームの絵は終わって30frame後に外れる */ return { t, left: await leftovers(card) }; };
  const cooldown = async () => { await ev("ProjectRApolloTest.end(); 'ok'"); await sleep(6500); };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  // 広い地図: Map004 を読み込む瞬間に 200x60 の床へ置き換える(メモリ上だけ)
  await ev(`(function() { var o = DataManager.onLoad; window.__bigMap = { w: 200, h: 60 };
    DataManager.onLoad = function(obj) { if (obj === window.$dataMap && window.__bigMap && obj.width === 50 && obj.height === 36) {
      var W = window.__bigMap.w, H = window.__bigMap.h, floor = obj.data[15 * obj.width + 12], d = new Array(W * H * 6).fill(0); for (var i = 0; i < W * H; i++) d[i] = floor; obj.width = W; obj.height = H; obj.data = d; }
      return o.apply(this, arguments); }; return 'hook'; })()`);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("R0 boot: 地図は200x60。画面は1920x1080。3枚の射程の既定は0(∞)。エロスの寿命0・ビーム射程0", async () => {
    const v = await json(`({ w: $gameMap.width(), h: $gameMap.height(), gw: Graphics.width, gh: Graphics.height,
      gRange: ${API[G]}.RANGE_TILES, gEff: ${API[G]}.EFFECTIVE_RANGE_TILES, eLife: ${API[E]}.config(1).lifetimeSeconds, eBeam: ${API[E]}.config(3).beamRange, sBeam: ${API[S_]}.config(3).beamRange,
      hard: ${API[E]}.limits.HARD_LIFETIME_FRAMES, net: $dataTemplateMap.events.filter(function(e) { return e && /Apollo (Golden Volley|Eros|Gigas Slayer) Arrow/.test(e.name); }).map(function(e) { return e.pages[0].list.filter(function(l) { return l.code === 230; })[0].parameters[0]; }) })`);
    rec("R0 boot", v.w === 200 && v.h === 60 && v.gw === 1920 && v.gRange === 0 && v.gEff > 100 && v.eLife === 0 && v.eBeam === 0 && v.sBeam === 0 && v.hard < 3600 && v.net.length === 3 && v.net.every(n => n === 3600), JSON.stringify(v));
  });

  // ───────── 黄金の矢 ─────────
  await check("R1 黄金の矢 Lv1: 100マス先(従来の上限40マス/画面外の2.5倍・画面の外)の敵に当たる。矢は消え、消費は1回", async () => {
    await scene(G, 1, [[3, 100]]);
    await s.shot("r1_start");
    await tap();
    const r = await finish(G);
    await s.shot("r1_end");
    const l = await lost(3);
    rec("R1 golden 100マス", r.t > 0 && l === 50 && (await pile(G)) === 1 && clean(r.left), JSON.stringify({ t: r.t, lost: l, pile: await pile(G), left: r.left }));
    await cooldown();
  });
  await check("R2 黄金の矢 Lv1: 当たる敵がいない矢は地図の右の端まで飛んで消える(不死の矢にならない)。非消費", async () => {
    await scene(G, 1, []);
    const before = await hand();
    await tap();
    let maxX = 0; const t0 = Date.now();
    while (Date.now() - t0 < 40000 && (await busy(G))) { maxX = Math.max(maxX, await maxArrowX(G)); await sleep(100); }
    await sleep(300);
    const left = await leftovers(G), last = await json(`${API[G]}.getLastResult()`);
    rec("R2 golden 端", !(await busy(G)) && maxX > 170 && last.reason === "missed" && (await pile(G)) === 0 && JSON.stringify(await hand()) === JSON.stringify(before) && clean(left), JSON.stringify({ maxX, secs: Date.now() - t0, last: last.reason, left }));
    await cooldown();
  });
  await check("R3 黄金の矢: 60マス先の壁(Region 255)で止まる。壁の向こうの敵は無傷。壁を外すと当たる", async () => {
    await scene(G, 1, [[3, 100]]);
    await setWall(60, 255);
    await tap(); const r = await finish(G); const l1 = await lost(3);
    await setWall(60, 0); await cooldown();
    await scene(G, 1, [[3, 100]]);
    await tap(); const r2 = await finish(G); const l2 = await lost(3);
    rec("R3 golden 壁", r.t > 0 && l1 === 0 && l2 === 50 && clean(r.left) && clean(r2.left), JSON.stringify({ l1, l2 }));
    await cooldown();
  });
  await check("R4 黄金の矢 Lv3: 長押しのビームが100マス先に届く(判定)。絵は画面に映る範囲まで。壁で遮られる", async () => {
    await scene(G, 3, [[3, 100]]);
    await hold(700); await sleep(300);
    const beam = await json(`${API[G]}.getBeamLog().slice(-1)[0]`); const vr = await json(`${API[G]}.visualReach()`);
    await s.shot("r4_beam");
    const r = await finish(G); const l = await lost(3);
    await cooldown();
    await scene(G, 3, [[3, 100]]); await setWall(60, 255);
    await hold(700); const w = await finish(G); const lw = await lost(3);
    await setWall(60, 0);
    rec("R4 golden beam", !!beam && beam.limit > 100 && vr <= 64 && l > 0 && lw === 0 && clean(r.left) && clean(w.left), JSON.stringify({ limit: beam && beam.limit, vr, lost: l, wallLost: lw, left: r.left, wleft: w.left }));
    await cooldown();
  });
  await check("R5 黄金の矢: F6で有限の射程を入れるとそこで止まる(30マス)。解除すると∞に戻る", async () => {
    await ev(`ProjectRCardBalance.setOverride('${G}', 'constant', 'bowRangeTiles', 30); 'ok'`);
    await scene(G, 1, [[3, 50], [4, 20]]);
    await tap(); await finish(G);
    const near = await lost(4), far = await lost(3);
    await cooldown();
    await ev("ProjectRCardBalance.resetAll(); 'ok'");
    await scene(G, 1, [[3, 50]]); await tap(); await finish(G); const far2 = await lost(3);
    rec("R5 golden F6", near === 50 && far === 0 && far2 === 50, JSON.stringify({ near, far, far2 }));
    await ev("ProjectRCardBalance.resetAll(); 'ok'"); await cooldown();
  });

  // ───────── エロスの矢 ─────────
  await check("R6 エロスの矢 Lv1: 60マス先(従来の2秒/約24マスの2.5倍)の敵に当たる。矢は消える。壁(Region 255)を貫通する", async () => {
    await scene(E, 1, [[3, 60]]);
    await tap(); const r = await finish(E); const l = await lost(3);
    await cooldown();
    await scene(E, 1, [[3, 60]]); await setWall(30, 255);
    await tap(); const w = await finish(E); const lw = await lost(3);
    await setWall(30, 0);
    rec("R6 eros", r.t > 0 && l > 0 && lw > 0 && clean(r.left) && clean(w.left), JSON.stringify({ lost: l, wallLost: lw, tmp: await json(`${API[E]}.getTempObjectCount()`) }));
    await cooldown();
  });
  await check("R7 エロスの矢 Lv3: 左右の14本 + 3秒のビームが50マス先に届く(従来12マス)。追尾の半径7とは別。Eventは予算以内で、終わると0", async () => {
    await scene(E, 3, [[3, 50]]);
    await tap(); await sleep(500);
    const beam = await json(`${API[E]}.getBeam()`); const sb = await json(`${API[E]}.segmentBudget()`);
    let peak = 0; const t0 = Date.now();
    while (Date.now() - t0 < 12000 && (await busy(E))) { peak = Math.max(peak, (await json(`${API[E]}.getTempObjectCount()`)).total); await sleep(80); }
    await sleep(400);
    const l = await lost(3), left = await leftovers(E), tmp = await json(`${API[E]}.getTempObjectCount()`);
    await s.shot("r7_end");
    rec("R7 eros beam", !!beam && beam.length > 50 && l > 0 && peak <= 14 + sb + 6 + 1 + 6 && tmp.total === 0 && clean(left), JSON.stringify({ length: beam && beam.length, lost: l, peak, budget: sb, tmp, left }));
    await cooldown();
  });
  await check("R8 エロスの矢: 当たらない矢は地図の端か寿命で必ず消える。F6の寿命2秒では60マス先に届かない", async () => {
    await scene(E, 1, []);
    await tap(); const t0 = Date.now(); const r = await finish(E);
    const secs = (Date.now() - t0) / 1000;
    await cooldown();
    await ev(`ProjectRCardBalance.setOverride('${E}', 'constant', 'projectileLifetimeSeconds', 2); 'ok'`);
    await scene(E, 1, [[3, 60]]); await tap(); const f = await finish(E); const lf = await lost(3);
    await ev("ProjectRCardBalance.resetAll(); 'ok'");
    rec("R8 eros 端/F6", r.t > 0 && secs < 62 && clean(r.left) && lf === 0 && clean(f.left), JSON.stringify({ secs, finiteLost: lf }));
    await cooldown();
  });

  // ───────── ギガース殺し ─────────
  await check("R9 ギガース殺し Lv1: 100マス先の敵に100ダメージ + 弱点。壁(60マス先)で止まる。外れは非消費", async () => {
    await scene(S_, 1, [[3, 100]]);
    await tap(); const r = await finish(S_); const l = await lost(3);
    const weak = await json("ProjectRApolloStatus.has('event:3', 'gigas_weak')");
    await cooldown();
    await scene(S_, 1, [[3, 100]]); await setWall(60, 255);
    await tap(); const w = await finish(S_); const lw = await lost(3); const pw = await pile(S_);
    await setWall(60, 0);
    rec("R9 gigas", r.t > 0 && l === 100 && weak === true && lw === 0 && pw === 0 && clean(r.left) && clean(w.left), JSON.stringify({ lost: l, weak, wallLost: lw, wallPile: pw }));
    await cooldown();
  });
  await check("R10 ギガース殺し Lv3: ビームが100マス先に届く。壁で遮られる。F6の有限射程(20マス)で短くできる", async () => {
    await scene(S_, 3, [[3, 100]]);
    await tap(); await sleep(1200);
    const beam = await json(`${API[S_]}.getBeam()`);
    const r = await finish(S_); const l = await lost(3);
    await cooldown();
    await scene(S_, 3, [[3, 100]]); await setWall(60, 255);
    await tap(); const w = await finish(S_); const lw = await lost(3); await setWall(60, 0);
    await cooldown();
    await ev(`ProjectRCardBalance.setOverride('${S_}', 'constant', 'bowBeamRangeTiles', 20); 'ok'`);
    await scene(S_, 3, [[3, 50]]); await tap(); await finish(S_); const lf = await lost(3);
    await ev("ProjectRCardBalance.resetAll(); 'ok'");
    rec("R10 gigas beam", !!beam && beam.limit > 100 && l >= 100 && lw === 0 && lf === 0 && clean(r.left) && clean(w.left), JSON.stringify({ limit: beam && beam.limit, lost: l, wallLost: lw, finite: lf }));
    await cooldown();
  });

  rec("RZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.end(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a8_range_verify_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
