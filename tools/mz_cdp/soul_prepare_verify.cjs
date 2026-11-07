// SOUL戦闘の準備ループ(L0: PREPARE → ATTACK → DEFENSE → PREPARE)の実機(Playtest)確認 + スクリーンショット。実キー・実マウス(CDP)。
//   P1 準備から始まる: 準備メニュー(「攻撃」「アイテム」)が戦闘エリアの中央に出る・凍結・HUDは PREPARE
//   P2 準備中の遮断: 実キー Q/W/E/R/T を押しても手札は動かない・戦闘エリアの左クリックは通常攻撃にならない
//   P3 準備中の時計: 数秒待っても フェーズは進まず・SOULの時間は数えず・敵ハートは動かない(ゲーム自体は動いている)
//   P4 「アイテム」(未実装): 実クリックで「未実装」の通知・フェーズ不変・アイテム/金/HPは変わらない
//   P5 「攻撃」: 実クリックでキャラ選択へ進む(まだ ATTACK ではない・通常攻撃にならない)。一括操作で ATTACK へ → 凍結が外れメニューが閉じる・実キー Q のカードが使える(固定手札)
//   P6 自動の遷移: ATTACK → DEFENSE(ハートはマウス・敵は胸) → PREPARE(メニュー再表示・第2ラウンド・枠のクールダウンは凍結のまま)
//   P7 キーボード: S で選択を切り替え・F(OK)で決定。アイテムは何も変えず、攻撃でキャラ選択へ進む。一括操作で ATTACK へ
//   P8 後片づけ: SOULを終えると、メニュー・凍結・隠した絵が残らず、元のマップへ戻る。通常のマップにメニューは出ない
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_prepare_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", HU = "ProjectRSoulBattleHUD", PR = "ProjectRSoulPrepare", SI = "ProjectRSoulInput";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const HAND = ["hermes_issen", "hermes_reed_flute", "apollo_golden_volley", "hermes_sweep", "apollo_eros_arrow"];
  const start = async () => { await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: HAND, attackSeconds: 4, defenseSeconds: 2, level: 3, weapon: "sword", prepare: true })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const phase = () => ev(`${SO}.getPhase()`);
  const prep = () => json(`${PR}.getState()`);
  const layout = () => json(`${PR}.getLayout()`);
  const center = b => ({ x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2) });
  const items = () => ev("JSON.stringify([$gameParty._items, $gameParty._gold, $gameParty.leader().hp])");
  const battle = () => json("ProjectRCardDeck.getBattleState()");
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  const KEYS = ["Q", "W", "E", "R", "T"];

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  await ev("Math.random = function() { return 0.9; }; 'on'");
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  const normalMenu = await json(`({ open: ${PR}.isOpen(), layer: !!SceneManager._scene._projectRSoulPrepare, paused: !!$gameMap.eventsPaused })`);

  let started = false;
  await check("P1 準備から始まる: メニューが戦闘エリアの中央に出る・凍結・HUDは PREPARE", async () => {
    started = await start();
    await wait(`${PR}.isOpen()`, 5000); await sleep(800);
    const ph = await phase(), p = await prep(), lay = await layout(), vp = await json(`${ST}.getViewport()`);
    const st = await json(`${SO}.getState()`), m = await json(`${HU}.getViewModel()`);
    const layerVisible = await ev("!!SceneManager._scene._projectRSoulPrepare && SceneManager._scene._projectRSoulPrepare.visible");
    await s.shot("p1_prepare_menu");
    const inside = lay && lay.panel.x >= vp.x && lay.panel.y >= vp.y && lay.panel.x + lay.panel.w <= vp.x + vp.w && lay.panel.y + lay.panel.h <= vp.y + vp.h;
    const centered = lay && Math.abs(lay.panel.x + lay.panel.w / 2 - (vp.x + vp.w / 2)) <= 2 && Math.abs(lay.panel.y + lay.panel.h / 2 - (vp.y + vp.h / 2)) <= 2;
    rec("P1 準備から始まる", started && ph === "prepare" && p.open && layerVisible && inside && centered && st.paused === true && await ev("!!$gameMap.eventsPaused") && m.phase === "prepare" && m.hand.every(x => x.state === "prepare") && m.secondsLeft === 0 && !normalMenu.open && !normalMenu.layer && !normalMenu.paused,
      JSON.stringify({ ph, open: p.open, layerVisible, inside, centered, paused: st.paused, hud: m.phase, hand: m.hand.map(x => x.state), normalMenu }));
  });

  await check("P2 準備中の遮断: 実キーQ/W/E/R/T・戦闘エリアの左クリックは何も起こさない", async () => {
    const before = { hand: (await battle()).hand.map(x => x.instanceId), cooling: (await battle()).cooldownPile.length, stats: await json(`${SI}.getStats()`), blocked: await json(`${SO}.getBlockedCounts()`), items: await items() };
    for (const k of KEYS) { await c.keyDown(k); await sleep(70); await c.keyUp(k); await sleep(70); }
    const vp = await json(`${ST}.getViewport()`), lay = await layout();
    await c.click(vp.x + 70, vp.y + 70);                                  // 戦闘エリアの中(準備画面の上のボタンの無い所)。画面が使い、通常攻撃にはならない
    await sleep(400);
    const after = { hand: (await battle()).hand.map(x => x.instanceId), cooling: (await battle()).cooldownPile.length, stats: await json(`${SI}.getStats()`), blocked: await json(`${SO}.getBlockedCounts()`), items: await items() };
    rec("P2 準備中の遮断", await phase() === "prepare" && JSON.stringify(before.hand) === JSON.stringify(after.hand) && after.cooling === before.cooling && after.stats.swallowedPrepare === before.stats.swallowedPrepare + 5 && after.stats.translated === before.stats.translated &&
      after.stats.attacksAllowed === before.stats.attacksAllowed && after.items === before.items,
      JSON.stringify({ swallowedPrepare: [before.stats.swallowedPrepare, after.stats.swallowedPrepare], translated: [before.stats.translated, after.stats.translated], attacksAllowed: [before.stats.attacksAllowed, after.stats.attacksAllowed], cooling: [before.cooling, after.cooling], blocked: [before.blocked, after.blocked] }));
  });

  await check("P3 準備中の時計: 数秒待ってもフェーズは進まず、敵ハートは動かない(ゲーム自体は動いている)", async () => {
    const f0 = await ev("Graphics.frameCount"), s0 = await json(`${SO}.getState()`), h0 = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    await sleep(3500);
    const f1 = await ev("Graphics.frameCount"), s1 = await json(`${SO}.getState()`), h1 = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    rec("P3 準備中の時計", f1 - f0 > 120 && await phase() === "prepare" && s1.elapsedFrames === s0.elapsedFrames && s1.framesLeft === 0 && s1.round === 1 && JSON.stringify(h0) === JSON.stringify(h1) && s1.paused === true,
      JSON.stringify({ frames: f1 - f0, elapsed: [s0.elapsedFrames, s1.elapsedFrames], round: s1.round, heart: [h0, h1] }));
  });

  await check("P4 「アイテム」(未実装): 実クリックで通知・フェーズ不変・何も消費しない", async () => {
    const lay = await layout(), before = await items(), battleBefore = JSON.stringify(await battle());
    const b = center(lay.buttons[1]);
    await c.click(b.x, b.y); await sleep(500);
    const p = await prep();
    await s.shot("p4_item_notice");
    rec("P4 アイテム(未実装)", await phase() === "prepare" && /未実装/.test(p.notice) && /消費していません/.test(p.notice) && p.stats.itemAttempts === 1 && await items() === before && JSON.stringify(await battle()) === battleBefore && await ev("!!$gameMap.eventsPaused"),
      JSON.stringify({ notice: p.notice, stats: p.stats, selected: p.selected }));
  });

  await check("P5 「攻撃」: 実クリックでキャラ選択へ。一括操作で ATTACK。実キーQ/Wのカードが使える(固定手札)", async () => {
    const lay = await layout(), b = center(lay.buttons[0]);
    const stats0 = await json(`${SI}.getStats()`);
    await c.click(b.x, b.y); await sleep(400);
    const stats1 = await json(`${SI}.getStats()`);
    const screen = await ev(`${PR}.getScreen()`), stillPrepare = await phase() === "prepare";
    await s.shot("p5_character_screen");
    // 先頭が「発動が同期で成功する」カード(薙ぎ払い・一閃)になる引きを選ぶ(テスト用の再シャッフル。実機の操作ではない)
    await ev("globalThis.__seed = 4242; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'");
    const picked = await json("(function() { var H = ProjectRSoulHand; for (var i = 0; i < 4000; i++) { var r = H.draw('player', { force: true }); var a = r.drawn.filter(function(c) { return c.cardId === 'hermes_sweep'; })[0], b = r.drawn.filter(function(c) { return c.cardId === 'hermes_issen'; })[0]; if (a && b) { var rest = r.drawn.filter(function(c) { return c !== a && c !== b; }).slice(0, 3).map(function(c) { return c.instanceId; }); return [a.instanceId, b.instanceId].concat(rest); } } return null; })()");
    await ev("Math.random = function() { return 0.9; }; 'ok'");
    const quick = await json(`${PR}.quickAttack({ instanceIds: ${JSON.stringify(picked)} })`);
    await sleep(400);
    const startedAttack = await phase() === "attack", p = await prep();
    await s.shot("p5_attack_started");
    const hand = (await battle()).hand.map(x => x.cardId);
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    await c.keyDown("W"); await sleep(70); await c.keyUp("W"); await sleep(400);
    const after = await battle();
    const t0 = await json(`${SO}.getState().secondsLeft`); await sleep(700); const t1 = await json(`${SO}.getState().secondsLeft`);
    rec("P5 攻撃", screen === "character" && stillPrepare && stats1.attacksAllowed === stats0.attacksAllowed && picked && quick.ok && startedAttack && !p.open && !(await ev("!!$gameMap.eventsPaused")) &&
      hand[0] === "hermes_sweep" && hand[1] === "hermes_issen" && after.hand.map(x => x.cardId).join() === hand.join() && after.cooldownPile.length === 0 && after.drawPile.length === 25 && (await json("ProjectRSoulMana.getState().spent")) >= 9.99 && t1 < t0,
      JSON.stringify({ screen, stillPrepare, attacksAllowed: [stats0.attacksAllowed, stats1.attacksAllowed], quick: quick.ok, startedAttack, hand, handAfter: after.hand.map(x => x.cardId), pile: [after.drawPile.length, after.cooldownPile.length], time: [t0, t1] }));
  });

  await check("P6 自動の遷移: ATTACK → DEFENSE → PREPARE(メニュー再表示・第2ラウンド・クールダウンは凍結のまま)", async () => {
    const toDefense = await wait(`${SO}.getPhase() === 'defense'`, 8000);
    await sleep(500);
    const heart = await json(`${ST}.getHearts()`), locked = await json(`${HU}.getViewModel().hand.map(function(x) { return x.state; })`);
    await s.shot("p6_defense");
    const toPrepare = await wait(`${SO}.getPhase() === 'prepare'`, 8000);
    await wait(`${PR}.isOpen()`, 3000); await sleep(600);
    const st = await json(`${SO}.getState()`), p = await prep();
    const cool0 = await json("ProjectRSoulMana.getState()"); await sleep(1500);
    const cool1 = await json("ProjectRSoulMana.getState()");                       // 準備ではマナも動かない(0のまま)
    await s.shot("p6_prepare_round2");
    rec("P6 自動の遷移", toDefense && heart.player && heart.player.mode === "mouse" && locked.every(x => x === "locked") && toPrepare && p.open && st.round === 2 && st.paused === true && cool0.current === 0 && cool1.current === 0 && !cool1.regenerating && p.stats.opened === 2,
      JSON.stringify({ toDefense, playerHeart: heart.player && heart.player.mode, locked, toPrepare, open: p.open, round: st.round, mana: [cool0.current, cool1.current], opened: p.stats.opened }));
  });

  await check("P7 キーボード: S で選択を切り替え・F(OK)で決定。アイテムは何も変えず、攻撃で ATTACK が始まる", async () => {
    await sleep(600);                                                    // 開いた直後の入力ガード(15フレーム)を過ぎる
    const before = await items();
    const sel0 = (await prep()).selected;
    await c.tap("S"); await sleep(200);
    const sel1 = (await prep()).selected;
    await c.tap("F"); await sleep(300);
    const afterItem = await prep();
    const stillPrepare = await phase() === "prepare";
    await c.tap("S"); await sleep(200);
    const sel2 = (await prep()).selected;
    await c.tap("F"); await sleep(500);
    const onCharacter = await ev(`${PR}.getScreen()`) === "character" && await phase() === "prepare";
    const quick = await json(`${PR}.quickAttack()`); await sleep(400);
    const nowAttack = quick.ok && await phase() === "attack";
    rec("P7 キーボード", sel0 === 0 && sel1 === 1 && stillPrepare && /未実装/.test(afterItem.notice) && afterItem.stats.itemAttempts === 2 && await items() === before && sel2 === 0 && onCharacter && nowAttack,
      JSON.stringify({ sel: [sel0, sel1, sel2], stillPrepare, notice: afterItem.notice, itemAttempts: afterItem.stats.itemAttempts, onCharacter, nowAttack }));
  });

  await check("P8 後片づけ: SOULを終えるとメニュー・凍結が残らず、元のマップへ戻る", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    const p = await prep(), st = await json(`${ST}.getState()`);
    const layerVisible = await ev("!!SceneManager._scene._projectRSoulPrepare && SceneManager._scene._projectRSoulPrepare.visible");
    const paused = await ev("!!$gameMap.eventsPaused");
    const move = await ev("playerMovementDisabled"), save = await ev("$gameSystem.isSaveEnabled()");
    rec("P8 cleanup", back && w.map === origin.map && w.x === origin.x && w.y === origin.y && !p.open && !layerVisible && !paused && !move && save === true && st.state === "idle" && await phase() === "idle",
      JSON.stringify({ back, now: [w.map, w.x, w.y], open: p.open, layerVisible, paused, move, save, stage: st.state }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("PZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_prepare_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
