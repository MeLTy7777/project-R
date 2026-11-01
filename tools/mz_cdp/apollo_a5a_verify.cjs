// Phase Apollo-A5A: 実機(Playtest)の確認 — 黄金の矢 Lv3 の扇(11本・間隔10度)と長押し(ビーム予約)の分岐。実マウス移動 + 実キー(CDP)。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a5a_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・カードの所持はこのセッションのメモリ上だけ(セーブしない・ファイルを書かない)。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const CARD = "apollo_golden_volley", API = "ProjectRApolloGoldenVolley", IN = "ProjectRCardBattleInput";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const start = async lv => { const r = await json(`ProjectRApolloTest.start(${lv})`); await sleep(400); await s.slow(1); return r; };
  const barHp = id => ev(`(function() { var b = SceneManager._scene._spriteset._eventHpBars.find(function(x) { return x._event.eventId() === ${id}; }); return b ? b.currentHp : $gameMap.getCurrentEventHp(${id}); })()`);
  const settle = n => s.sceneFrames(n || 10);
  const resetHp = async () => { await ev("(function() { SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000; b.refresh(); }); return 'reset'; })()"); await settle(); };
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);
  const HOME = { 2: [44, 6], 3: [37, 15], 4: [10, 15], 5: [12, 15], 6: [11, 17] };
  const goHome = async () => { for (const [id, [x, y]] of Object.entries(HOME)) await locate(Number(id), x, y); await settle(); };
  const staging = async ids => { for (const id of ids) await locate(id, 40 - id, 3); };
  const random = v => ev(`window.__r0 = window.__r0 || Math.random; Math.random = function() { return ${v}; }; 'on'`);
  const lost = async id => 1000 - await barHp(id);
  const pile = () => json("ProjectRCardDeck.getBattleState().cooldownPile.filter(function(e) { return e.instance.cardId === '" + CARD + "'; }).length");
  const events = () => json("$gameMap.events().filter(function(e) { return e && /projectRGoldenVolley/.test(e.event().note || ''); }).length");
  const scene = async (lv, enemy = [13, 15]) => {
    await start(lv); await random(0.9); await goHome(); await staging([2, 3, 4, 5, 6]);
    await s.place(9, 15); await sleep(500); await locate(4, enemy[0], enemy[1]); await resetHp(); await sleep(200);
    await s.aim(enemy[0] - 9, enemy[1] - 15);
  };
  const rnd = d => Math.round(((d + 360) % 360) * 100) / 100;
  const mouseDeg = async () => { const m = await json("({ x: TouchInput.x, y: TouchInput.y, px: $gamePlayer.screenX(), py: $gamePlayer.screenY() })"); return (Math.atan2(m.y - m.py, m.x - m.px) * 180 / Math.PI + 450) % 360; };

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("W0 boot: Lv3の行(11本・10度)・押下プロファイル(0.5秒・離した時に発動)・ビーム未実装", async () => {
    const v = await json(`({ e3: ${API}.effectsForLevel(3), p: ${IN}.getPressProfile('${CARD}'), reg: ${API}.pressRegistered, beam: ProjectRCardCatalog.godDesign('apollo')[0].beamImplemented, impl: ProjectRCardCatalog.godDesign('apollo')[0].implementedLevels,
      other: ['hermes_sweep','hermes_zetsu','apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { return ${IN}.getPressProfile(id); }) })`);
    rec("W0 boot", v.e3.projectileCount === 11 && v.e3.spreadDegrees === 10 && v.e3.thickWidthTiles === 0.9 && v.e3.splitTotal === 100 && v.e3.damage === 50 && v.p.holdSeconds === 0.5 && v.p.thresholdFrames === 30 && v.p.fireOn === "release" && v.reg
      && v.beam === false && v.impl === 3 && v.other.every(x => x === null), JSON.stringify(v));
  });

  await check("W1 Lv3 tap(実マウス+実キー): 短く押して離す → 11本・10度刻み・マウス方向が中心。発射では消費せず、命中で1回だけ消費。50ダメージ", async () => {
    await scene(3);
    const aim = await mouseDeg();
    await s.slow(4);
    await c.keyDown("Q"); await sleep(60);
    const midHold = { arrows: await events(), sessions: await json(`${IN}.getPressSessions().length`), pending: await json(`${API}.isPending()`) };
    await c.keyUp("Q"); await s.sceneFrames(3);
    const pend = await json(`${API}.getPending()`), cnt = await events(), pl = await pile();
    await s.shot("w1_fan");
    const want = Array.from({ length: 11 }, (_, i) => rnd(aim + (i - 5) * 10));
    const got = pend ? pend.degrees.map(rnd) : [];
    await s.sceneFrames(60); await s.slow(1); await s.sceneFrames(30);
    const after = { lost: await lost(4), pile: await pile(), last: await json(`${API}.getLastResult()`), ev: await events() };
    rec("W1 tap fan", midHold.arrows === 0 && midHold.sessions === 1 && !midHold.pending && pend && cnt >= 8 && cnt <= 11 && JSON.stringify(got) === JSON.stringify(want) && pl === 0
      && after.lost >= 50 && after.pile === 1 && after.last.committed === true && after.last.arrows === 11 && after.ev === 0, JSON.stringify({ aim, midHold, cnt, got, pl, after: { lost: after.lost, pile: after.pile, hits: after.last.hits } }).slice(0, 600));
  });

  await check("W2 Lv3 hold(0.5秒以上): 離しても扇は出ず、カードは消費されず、Cooldownも始まらない。ビーム未実装の表示(ふきだし・診断)。直後のtapは普通に扇を撃てる", async () => {
    await scene(3);
    const handBefore = await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })");
    await ev("window.__bal = []; (function() { var r = $gamePlayer.requestBalloon; $gamePlayer.requestBalloon = function(id) { window.__bal.push(id); return r.apply(this, arguments); }; })(); 'spy'");
    await c.keyDown("Q"); await sleep(750);
    const mid = { held: await json(`${IN}.getPressSessions()[0].holdReached`), arrows: await events() };
    await c.keyUp("Q"); await settle(6);
    const st = { arrows: await events(), pile: await pile(), hand: await json("ProjectRCardDeck.getBattleState().hand.map(function(c) { return c.cardId; })"), attempts: await json(`${API}.getBeamAttempts()`), bal: await json("window.__bal"),
      last: await json(`${IN}.getLastResult()`), pending: await json(`${API}.isPending()`), dealt: await lost(4) };
    await s.shot("w2_hold");
    await c.tap("Q", 60); await s.sceneFrames(3);
    const fan = await events();
    rec("W2 hold", mid.held === true && mid.arrows === 0 && st.arrows === 0 && st.pile === 0 && JSON.stringify(st.hand) === JSON.stringify(handBefore) && st.attempts.length === 1 && JSON.stringify(st.bal) === "[8]"
      && st.last.ok === false && st.last.detail === "beamUnavailable" && st.last.variant === "hold" && !st.pending && st.dealt === 0 && fan >= 8, JSON.stringify({ mid, st, fan }).slice(0, 700));
  });

  await check("W3 Lv1/Lv2は従来どおり即時: キーを押している間にもう矢が出ていて、押下セッションは作られない。離しても追加の発動なし", async () => {
    const out = {};
    for (const lv of [1, 2]) {
      await scene(lv);
      await s.slow(3);
      await c.keyDown("Q"); await s.sceneFrames(3);
      const during = { arrows: await events(), sessions: await json(`${IN}.getPressSessions().length`) };
      await c.keyUp("Q"); await s.sceneFrames(3);
      out[lv] = { during, after: await events() };
      await s.slow(1); await s.sceneFrames(60);
    }
    rec("W3 immediate Lv1-2", out[1].during.arrows >= 1 && out[1].during.arrows <= 3 && out[1].during.sessions === 0 && out[2].during.arrows >= 3 && out[2].during.arrows <= 5 && out[2].during.sessions === 0
      && out[1].after <= out[1].during.arrows && out[2].after <= out[2].during.arrows, JSON.stringify(out));
  });

  await check("W4 狙いは離した時の方向: 押している間にマウスを動かしても、離した直後の向きが中心。発射後に動かしても追尾しない", async () => {
    await scene(3);
    await s.slow(4);
    await c.keyDown("Q"); await sleep(40);
    await s.aim(-3, -4); await s.sceneFrames(2);
    await s.aim(3, 3); // 離す直前の向き
    const dRelease = await mouseDeg();
    await c.keyUp("Q"); await s.sceneFrames(3);
    const pend = await json(`${API}.getPending()`), rot0 = await json(`${API}.getActiveArrows().map(function(a) { return a.rotation; })`);
    await s.aim(-5, 0); await s.sceneFrames(4);
    const rot1 = await json(`${API}.getActiveArrows().map(function(a) { return a.rotation; })`);
    await s.slow(1); await s.sceneFrames(80);
    const center = pend ? rnd(pend.degrees[5]) : null;
    rec("W4 release aim", pend && Math.abs(center - rnd(dRelease)) < 0.01 && rot1.every(r => rot0.indexOf(r) >= 0), JSON.stringify({ center, dRelease: rnd(dRelease), n0: rot0.length, n1: rot1.length }));
  });

  await check("W5 Lv2の効果の引き継ぎ: Lv3の中央の矢が当たると 50 + 5秒100のスリップ(合計150)、側面の矢はスリップなし。11本のうち中央だけ太い", async () => {
    await scene(3);
    await s.slow(4);
    await c.tap("Q", 50); await s.sceneFrames(3);
    const a = await json(`${API}.getActiveArrows()`);
    const widths = a.map(x => x.width), thick = a.filter(x => x.thick).length;
    await s.slow(1); await s.sceneFrames(70);
    const slip = await json(`${API}.getActiveSlips()`);
    await sleep(5800); await s.sceneFrames(5);
    const final = await lost(4), left = await json(`${API}.getActiveSlips().length`), hits = await json(`${API}.getLastResult().hits`);
    // 4マス先の敵には隣り合う複数の矢が当たる: 1本50 x 当たった本数 + 中央の矢のスリップ100(5秒)
    rec("W5 DoT inherit", thick === 1 && Math.max(...widths) === 0.9 && slip.length === 1 && JSON.stringify(slip[0].ticks) === "[20,20,20,20,20]" && hits.every(h => h.damage === 50) && hits.filter(h => h.slip).length === 1 && final === 50 * hits.length + 100 && left === 0, JSON.stringify({ n: a.length, thick, slip, hits: hits.length, final }));
  });

  await check("W6 取消(実機): 押している間の戦闘終了・会話・手札の入れ替わり・キーリピートでは何も発動しない。離しても扇もビームも出ない", async () => {
    const out = {};
    await scene(3);
    const base = { presses: await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'press'; }).length`), cancels: await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'cancel'; }).length`), attempts: await json(`${API}.getBeamAttempts().length`) };
    await c.keyDown("Q"); await sleep(200);
    for (let i = 0; i < 6; i++) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyQ", windowsVirtualKeyCode: 81, key: "q", autoRepeat: true }); await sleep(30); }
    out.presses = (await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'press'; }).length`)) - base.presses;
    const inst = await json("ProjectRCardDeck.getBattleState().hand[0].instanceId");
    await ev(`ProjectRCardDeck.useBattleCard(${JSON.stringify(inst)}); 'swap'`); await settle(4);
    out.cancel1 = (await json(`${IN}.getPressLog().filter(function(e) { return e.type === 'cancel'; }).map(function(e) { return e.reason; })`)).slice(base.cancels);
    await c.keyUp("Q"); await settle(4);
    out.a = { ev: await events(), attempts: (await json(`${API}.getBeamAttempts().length`)) - base.attempts, pending: await json(`${API}.isPending()`) };
    await scene(3);
    await c.keyDown("Q"); await sleep(300);
    await ev("$gameMessage.add('取消'); 'msg'"); await settle(6); await ev("$gameMessage.clear(); 'clear'");
    await c.keyUp("Q"); await settle(4);
    out.b = { ev: await events(), attempts: (await json(`${API}.getBeamAttempts().length`)) - base.attempts, pile: await pile() };
    await scene(3);
    await c.keyDown("Q"); await sleep(700);
    await ev("ProjectRCombatTestArena.endTest(); 'end'"); await settle(6);
    await c.keyUp("Q"); await settle(4);
    out.c = { ev: await events(), pending: await json(`${API}.isPending()`), sessions: await json(`${IN}.getPressSessions().length`), attempts: (await json(`${API}.getBeamAttempts().length`)) - base.attempts };
    rec("W6 cancel", out.presses === 1 && out.cancel1.length === 1 && out.cancel1[0] === "handChanged" && out.a.ev === 0 && out.a.attempts === 0 && !out.a.pending
      && out.b.ev === 0 && out.b.attempts === 0 && out.b.pile === 0 && out.c.ev === 0 && !out.c.pending && out.c.sessions === 0 && out.c.attempts === 0, JSON.stringify(out));
  });

  await check("W7 外れ・重複: 敵のいない方向へのtapは非消費。確定待ちの間の連打は拒否され、矢は11本のまま(増えない)・消費は1回", async () => {
    await scene(3, [15, 15]);
    await s.aim(0, -5);
    await c.tap("Q", 50); await settle(5);
    await wait(`!${API}.isPending()`, 15000); await settle(5);
    const miss = { r: await json(`${API}.getLastResult()`), pile: await pile(), ev: await events() };
    await s.aim(6, 0);
    await s.slow(10);
    await c.tap("Q", 40); await s.sceneFrames(1);
    for (const k of ["Q", "E", "X", "C", "V", "Q"]) await c.tap(k, 30);
    const n = await events(), pend = await json(`${API}.isPending()`);
    await s.slow(1); await s.sceneFrames(90);
    rec("W7 miss+dup", (miss.r.reason === "missed" || miss.r.aborted) && miss.pile === 0 && miss.ev === 0 && n >= 8 && n <= 11 && pend === true && await pile() === 1 && (await lost(4)) >= 50, JSON.stringify({ miss: { reason: miss.r.reason, pile: miss.pile }, n, pend, pile: await pile(), lost: await lost(4) }));
  });

  await check("W8 保存内容: Lv3の扇・holdの分岐の前後でセーブ内容に矢・押下の状態が入らない。旧Apollo/G17/剣の入力は不変(J=剣は押下セッションなし)", async () => {
    await scene(3);
    await c.tap("Q", 50); await settle(30); await c.keyDown("Q"); await sleep(700); await c.keyUp("Q"); await settle(10);
    const save = await ev("JSON.stringify(DataManager.makeSaveContents())");
    const bad = ["pressSession", "getActiveArrows", "pendingVolley", "beamAttempts"].filter(k => save.indexOf(k) >= 0);
    await ev("$gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); 'sword'");
    await c.tap("J", 80); await settle(10);
    const sessions = await json(`${IN}.getPressSessions().length`), legacy = await json("['apollo_golden_arrow','apollo_plague_attack','apollo_lyre_calm'].map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; })");
    rec("W8 save+inputs", bad.length === 0 && sessions === 0 && JSON.stringify(legacy) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]), JSON.stringify({ bad, sessions, legacy }));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a5a_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
