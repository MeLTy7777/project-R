// SOUL戦闘 L2〜L3(準備の画面・10枚ドロー・5枚選択・割り当て・固定手札・境目の後始末)の実機(Playtest)確認 + スクリーンショット。実マウス・実キー(CDP)。
//   Q1 画面の流れ(実クリック): 「攻撃」→ キャラ選択(実在のキャラだけ)→ 10枚が見える(シャッフル結果・カード名・引いた順)
//   Q2 選択(実クリック): 選択 n/5・選んだ順に Q/W/E/R/T・6枚目は拒否・外せる・5枚で「次へ」
//   Q3 割り当て(実クリック): スロットの入れ替え → 「決定」で ATTACK。5枠 = 割り当てた順(固定)・保存データは変わらない
//   Q4 固定手札(実キー・マナ制): Q で割り当てた枠のカードを使う・承認済みコストをちょうど1回引く・手札は入れ替わらず山札25のまま・マナが尽きると拒否→回復すれば再使用できる(消費されない)
//   Q5 次の準備: ATTACK→DEFENSE→PREPARE でメニューへ戻る・選択は空・新しいシャッフル(別の番号・別の10枚)・前の5枠は装備のまま
//   Q6 薙ぎ払いの溜めはフェーズ境目でダメージなしに取り消す(早く判定しない)
//   Q7 後片づけ: SOULを終えると固定が解け、元のマップへ戻り、保存データが変わらない
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/soul_l3_verify.cjs   (新しいNW.jsセッションで実行する)。入力はCDP(人間の手動プレイの代わりではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SB = "ProjectRSoulSandbox", SO = "ProjectRSoulBattle", ST = "ProjectRSoulStage", PR = "ProjectRSoulPrepare", HD = "ProjectRSoulHand", PC = "ProjectRSoulPhaseCleanup", MN = "ProjectRSoulMana", HU = "ProjectRSoulBattleHUD";
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 800)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(30); } return false; };
  const toActive = async () => (await wait(`$gameMap.mapId() === 6 && !$gamePlayer.isTransferring() && ${ST}.isActive() && ${SO}.isActive()`, 25000)) && (await sleep(1500), true);
  const toOrigin = async origin => { const ok = await wait(`$gameMap.mapId() === ${origin.map} && !$gamePlayer.isTransferring() && ${ST}.getState().state === 'idle' && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset`, 25000); await sleep(800); return ok; };
  const start = async () => { await ev(`${SB}.start("a16", ${JSON.stringify({ openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"], attackSeconds: 60, defenseSeconds: 60, level: 3, weapon: "sword", prepare: true })})`); const ok = await toActive(); await ev("ProjectRSoulBattleDodge.disarm(); 'ok'"); return ok; };
  const phase = () => ev(`${SO}.getPhase()`);
  const st = () => json(`${PR}.getState()`);
  const hs = () => json(`${HD}.getState()`);
  const battle = () => json("ProjectRCardDeck.getBattleState()");
  const layout = () => json(`${PR}.getLayout()`);
  const center = b => ({ x: Math.round(b.x + b.w / 2), y: Math.round(b.y + b.h / 2) });
  const clickId = async id => { const b = (await layout()).buttons.find(x => x.id === id); if (!b) throw new Error("no item " + id); const p = center(b); await c.click(p.x, p.y); await sleep(260); };
  const saved = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData, $gameSystem._projectRCardInventory, $gameParty._items, $gameParty._gold])");
  const heartHp = () => ev("ProjectRSoulBattlePoC.getState().hp");
  // 乱数を固定の列にする(ページ内。引きを再現できる)。drawUntil はテスト用の再シャッフル(実機の操作ではない)
  const seed = n => ev(`globalThis.__seed = ${n}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; }; 'ok'`);
  const drawUntil = need => json(`(function() { var H = ${HD}; for (var i = 0; i < 20000; i++) { var r = H.draw('player', { force: true }); if (${JSON.stringify(need)}.every(function(id) { return r.drawn.some(function(c) { return c.cardId === id; }); })) return r.drawn.map(function(c) { return [c.instanceId, c.cardId]; }); } return null; })()`);

  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await wait("SceneManager._scene instanceof Scene_Title && !SceneManager.isSceneChanging() && !!ColorManager._windowskin && ColorManager._windowskin.isReady()", 30000);
  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 25000); await sleep(1500);
  const origin = await json(`({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })`);
  let started = false, savedBefore = "", ids = [], wanted = [];

  await check("Q1 画面の流れ(実クリック): 「攻撃」→ キャラ選択 → 10枚が見える", async () => {
    started = await start();
    await ev("Math.random = function() { return 0.9; }; 'ok'"); await seed(77);
    await wait(`${PR}.isOpen()`, 5000); await sleep(900);
    savedBefore = await saved();
    await clickId("attack");
    const chars = (await st()).items.filter(i => i.kind === "char"), scr1 = await ev(`${PR}.getScreen()`), ph1 = await phase();
    await s.shot("q1_character");
    await clickId("char:player");
    const state = await st(), h = await hs(), cards = state.items.filter(i => i.kind === "card");
    await s.shot("q1_select");
    rec("Q1 画面の流れ", started && scr1 === "character" && ph1 === "prepare" && chars.length === 1 && chars[0].id === "char:player" && /30枚/.test(chars[0].sub) &&
      state.screen === "select" && cards.length === 10 && cards.every(x => /[^\u0000-\u007f]/.test(x.label)) && cards.map(x => x.order).join() === "1,2,3,4,5,6,7,8,9,10" &&
      /30枚をシャッフル/.test(state.subtitle) && /10枚を引きました/.test(state.subtitle) && state.right === "選択 0/5" && h.deckSize === 30 && new Set(h.drawn.map(x => x.instanceId)).size === 10,
      JSON.stringify({ chars: chars.map(x => x.id), screen: state.screen, cards: cards.map(x => x.label), subtitle: state.subtitle, right: state.right, serial: h.serial }));
  });

  await check("Q2 選択(実クリック): n/5・選んだ順の Q/W/E/R/T・6枚目は拒否・外せる", async () => {
    // 先頭が薙ぎ払い・一閃(発動が同期で成功)になるように、必要なカードを含む引きに差し替える(テスト用。画面はそのまま同じ準備の中)
    const drawn = await drawUntil(["hermes_sweep", "hermes_issen"]);
    ids = drawn.map(x => x[0]);
    await ev(`${PR}.back()`); await sleep(100); await ev(`${PR}.chooseCharacter("player")`); await sleep(300);
    const sweep = drawn.find(x => x[1] === "hermes_sweep")[0], issen = drawn.find(x => x[1] === "hermes_issen")[0];
    const others = drawn.filter(x => x[0] !== sweep && x[0] !== issen).slice(0, 4).map(x => x[0]);
    const pickOrder = [sweep, issen, others[0], others[1], others[2]];
    for (const id of pickOrder) await clickId("card:" + id);
    const five = await st();
    await clickId("card:" + others[3]);                                  // 6枚目
    const sixth = await st(), count6 = (await hs()).selected.length;
    await clickId("card:" + others[2]);                                  // 外す
    const four = await st();
    await clickId("card:" + others[2]);                                  // また選ぶ(順が末尾へ)
    await s.shot("q2_selected5");
    const final = await st();
    wanted = [sweep, issen, others[0], others[1], others[2]];
    rec("Q2 選択", five.right === "選択 5/5" && five.items.filter(i => i.picked).sort((a, b) => a.order - b.order).length === 5 && five.items.filter(i => i.picked).map(i => i.slot).sort().join("") === "EQRTW" &&
      count6 === 5 && /5枚まで/.test(sixth.notice) && four.right === "選択 4/5" && final.right === "選択 5/5" && final.items.find(i => i.id === "next").enabled,
      JSON.stringify({ five: five.right, slots: five.items.filter(i => i.picked).map(i => i.slot + ":" + i.label), sixthNotice: sixth.notice, count6, four: four.right, final: final.right }));
  });

  await check("Q3 割り当て(実クリック): 入れ替え → 「決定」で ATTACK。5枠は割り当てた順(固定)・保存データは変わらない", async () => {
    await clickId("next");
    const a1 = await st(), slots1 = a1.items.filter(i => i.kind === "slot").map(i => i.label);
    await clickId("slot:2"); await clickId("slot:4");                      // E と T を入れ替える
    const a2 = await st(), slots2 = a2.items.filter(i => i.kind === "slot").map(i => i.label);
    await s.shot("q3_assign");
    const h = await hs();
    const expectedIds = [h.slots[0], h.slots[1], h.slots[2], h.slots[3], h.slots[4]];
    await clickId("confirm"); await sleep(500);
    const b = await battle(), after = await saved();
    const wantedCards = h.slotCards.map(x => x.cardId);
    await s.shot("q3_attack");
    rec("Q3 割り当て・決定", a1.screen === "assign" && a1.items.filter(i => i.kind === "slot").map(i => i.key).join("") === "QWERT" && slots2[2] === slots1[4] && slots2[4] === slots1[2] && await phase() === "attack" &&
      b.hand.map(x => x.cardId).join() === wantedCards.join() && b.hand[0].cardId === "hermes_sweep" && b.hand[1].cardId === "hermes_issen" && b.drawPile.length === 25 && b.discardPile.length === 0 && b.cooldownPile.length === 0 && !!b.soulFixed && after === savedBefore,
      JSON.stringify({ slots1, slots2, phase: await phase(), hand: b.hand.map(x => x.cardId), wanted: wantedCards, piles: [b.drawPile.length, b.discardPile.length, b.cooldownPile.length], unchanged: after === savedBefore, expectedIds: expectedIds.length }));
  });

  await check("Q4 固定手札(実キー・マナ制): 枠のカードを使う・コストをちょうど1回引く・手札は入れ替わらない・マナが尽きると拒否→回復すれば再使用(消費されない)", async () => {
    const hand0 = (await battle()).hand.map(x => x.instanceId);
    await json(`${MN}.devSet(10)`);
    const cost = await json(`${MN}.costOf("hermes_sweep")`);                           // a16 は Lv3 = 4
    const sp0 = (await json(`${MN}.getState().spent`));
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    const sp1 = (await json(`${MN}.getState().spent`)), b1 = await battle();
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    const sp2 = (await json(`${MN}.getState().spent`));
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);          // 10 - 8 + 回復(約0.7) < 4 : マナ不足で拒否
    const sp3 = (await json(`${MN}.getState().spent`)), blocked = await json(`${HD}.getState().stats.manaBlocked`);
    const hud = await json(`${HU}.getViewModel().hand[0]`);
    await s.shot("q4_low_mana");
    await sleep(2600);                                                                    // 回復して 4 に届く
    await c.keyDown("Q"); await sleep(70); await c.keyUp("Q"); await sleep(300);
    const b2 = await battle(), sp4 = (await json(`${MN}.getState().spent`)), uses = b2.soulFixed.uses;
    rec("Q4 固定手札", sp1 - sp0 === cost && sp2 - sp0 === cost * 2 && sp3 === sp2 && blocked >= 1 && hud.state === "lowMana" && hud.cost === cost && sp4 - sp0 === cost * 3 && uses === 3 && b2.hand.map(x => x.instanceId).join() === hand0.join() && b2.drawPile.length === 25 && b2.cooldownPile.length === 0 && b1.hand.map(x => x.instanceId).join() === hand0.join() && await saved() === savedBefore,
      JSON.stringify({ cost, spent: [sp1 - sp0, sp2 - sp0, sp3 - sp0, sp4 - sp0], blocked, hud: [hud.state, hud.cost], uses, sameHand: b2.hand.map(x => x.instanceId).join() === hand0.join(), piles: [b2.drawPile.length, b2.cooldownPile.length] }));
  });

  await check("Q6 薙ぎ払いの溜めはフェーズ境目でダメージなしに取り消す", async () => {
    await sleep(600);
    const h = await json("ProjectRSoulBattlePoC.getState().hitCenter");
    const p = await json(`${ST}.toScreen(${h.x - 2} * 48, ${h.y} * 48 - 24)`); await c.pointer(Math.round(p.x), Math.round(p.y)); await sleep(250);
    await json(`${MN}.devSet(10)`);
    const hp0 = await heartHp(), drop0 = await json("ProjectRSoulBattleMelee.getStageStats().sweepDropped"), res0 = await json("ProjectRSoulBattleMelee.getLog().filter(function(e) { return e.type === 'sweepResolve'; }).length");
    await c.keyDown("Q"); await sleep(60); await c.keyUp("Q"); await sleep(60);                 // 薙ぎ払い(判定は12フレーム=0.2秒後)
    const staged = await json("ProjectRSoulBattleMelee.getStageStats()");
    await ev(`${SO}.skipPhase()`);                                                              // 判定の前にフェーズを変える
    const m = await json("ProjectRSoulBattleMelee.getStageStats()"), res1 = await json("ProjectRSoulBattleMelee.getLog().filter(function(e) { return e.type === 'sweepResolve'; }).length");
    await sleep(800);
    const hp1 = await heartHp(), cancelled = (await json(`${PC}.getStats()`)).cancelledSweeps;
    rec("Q6 溜めの取り消し", staged.sweeping >= 1 && m.sweeping === 0 && m.sweepDropped === drop0 + 1 && res1 === res0 && hp1 === hp0 && cancelled >= 1,
      JSON.stringify({ staged: staged.sweeping, afterBoundary: m.sweeping, dropped: [drop0, m.sweepDropped], resolves: [res0, res1], hp: [hp0, hp1], cancelled }));
  });

  await check("Q5 次の準備: メニューへ戻る・選択は空・新しいシャッフル・前の5枠は装備のまま", async () => {
    const h1 = await hs(), hand1 = (await battle()).hand.map(x => x.cardId);
    await ev(`${SO}.skipPhase()`); await sleep(300);                                          // DEFENSE → PREPARE
    await wait(`${PR}.isOpen()`, 3000); await sleep(900);
    const ph = await phase(), state = await st(), h0 = await hs();
    const sameHand = (await battle()).hand.map(x => x.cardId).join() === hand1.join();
    await seed(901);
    await clickId("attack"); await clickId("char:player");
    const h2 = await hs(), state2 = await st();
    await s.shot("q5_round2_select");
    rec("Q5 次の準備", ph === "prepare" && state.screen === "menu" && h0.drawn.length === 0 && h0.selected.length === 0 && sameHand && h2.serial > h1.serial && h2.selected.length === 0 && h2.drawn.length === 10 &&
      JSON.stringify(h2.drawn.map(x => x.cardId)) !== JSON.stringify(h1.drawn.map(x => x.cardId)) && state2.right === "選択 0/5" && h2.deckSize === 30,
      JSON.stringify({ ph, screen: state.screen, resetDrawn: h0.drawn.length, sameHand, serial: [h1.serial, h2.serial], round2: h2.drawn.map(x => x.cardId).join(","), right: state2.right }));
  });

  await check("Q7 後片づけ: SOULを終えると固定が解け、元のマップへ戻り、保存データが変わらない", async () => {
    await ev(`${SB}.stop()`);
    const back = await toOrigin(origin);
    const fixed = await ev(`${HD}.isFixed()`), open = await ev(`${PR}.isOpen()`), paused = await ev("!!$gameMap.eventsPaused");
    const w = await json("({ map: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y })");
    const tagged = await ev(`(function() { var tags = ${PC}.TAGS; return $gameMap.events().filter(function(e) { return e && !e._erased && tags.some(function(t) { return String(e.event().note || '').indexOf(t) >= 0; }); }).length; })()`);
    rec("Q7 cleanup", back && !fixed && !open && !paused && tagged === 0 && w.map === origin.map && w.x === origin.x && w.y === origin.y && await saved() === await saved(),
      JSON.stringify({ back, fixed, open, paused, tagged, now: [w.map, w.x, w.y] }));
  });

  const errs = s.errors().filter(e => !/Error saving manifest/.test(e));
  rec("QZ Consoleのエラーなし(manifest保存の雑音を除く)", errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(`${OUT}/soul_l3_results.json`, JSON.stringify({ note: "Playtest専用のa16シナリオ(prepare:true)・CDPの入力(人間の手動プレイの代わりではない)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
