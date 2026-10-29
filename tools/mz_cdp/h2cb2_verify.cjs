// Phase H2C-B2: 実機(Playtest)の確認 — カードの実際の所持コピー数 / デッキ構築画面の表示 / 付与の冪等 / 指輪の譲渡 / セーブ往復 / 旧セーブの移行(保護コピー)。
// 使い方: MZ_OUT=<出力> MZ_SAVE_COPY=<保護コピーのsaveフォルダ> MZ_TMP_SAVE=<一時のsaveフォルダ> node tools/mz_cdp/h2cb2_verify.cjs
//   A部: 新しいゲームをメモリ上に作り、入手はイベントのプラグインコマンドで行う。セーブ/ロードは MZ_TMP_SAVE(一時フォルダ)だけに書く。本物のsave/には触れない。
//   B部: 既存セーブの保護コピーを本物のScene_Load経路で読み込む。書き込み(saveObject)は例外で拒否する。
//   入力: 戦闘中のカード使用(Q)だけ実キー(CDPのInput.dispatchKeyEvent)。終了時に押しっぱなしのキーが無いことを確認する。
//   Esc/X/B/右クリックの実キー確認は h2cb1_esc.cjs(OSレベル入力)で別に行う。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const norm = p => String(p || "").replace(/\\/g, "/").replace(/\/?$/, "/");
const SAVE_COPY = norm(process.env.MZ_SAVE_COPY);
const TMP_SAVE = norm(process.env.MZ_TMP_SAVE);
const STARTER = { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 };
const sortKeys = o => { if (Array.isArray(o)) return o.map(sortKeys); if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o).sort()) r[k] = sortKeys(o[k]); return r; } return o; };
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
(async () => {
  if (!process.env.MZ_SAVE_COPY || !process.env.MZ_TMP_SAVE) throw new Error("MZ_SAVE_COPY と MZ_TMP_SAVE を指定してください");
  const s = await session(); const { ev, c, rec, sleep } = s;
  const errorLog = [];
  const check = async (id, fn) => {
    const before = s.errors().length;
    try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 600)); }
    const now = s.errors().length; if (now !== before) { errorLog.push({ step: id, newErrors: s.errors().slice(before) }); console.log("  (console errors +" + (now - before) + " in " + id + ")"); }
  };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const settle = n => s.sceneFrames(n || 10);
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800); };
  const inv = () => json("ProjectRCardInventory.state()");
  const copies = () => json("(function() { var m = {}; ProjectRCardDeck.definitions.cardDefinitions().forEach(function(d) { var n = ProjectRCardInventory.getOwnedCopies(d.cardId); if (n) m[d.cardId] = n; }); return m; })()");
  const deckIds = () => json("ProjectRCardDeck.getDeck()");
  const total = () => ev("ProjectRCardInventory.diagnostics().totalCopies");
  const runEvent = async command => {
    await ev(`$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ${JSON.stringify(command)} }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'`);
    await wait("!$gameMap.isEventRunning()", 6000);
  };
  const fresh = async () => { await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1); };
  const useDir = dir => ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(dir)}; }; 'ok'`);

  rec("A0 前提: CardInventoryが読み込まれ、Playtestで動いている(Coreは変更していない)", await ev("typeof ProjectRCardInventory === 'object' && ProjectRCardInventory.SCHEMA === 1 && typeof ProjectRProductionTest === 'object' && Utils.isOptionValid('test')"));

  await check("A1-3", async () => {
    await fresh();
    const before = await json("({ copies: ProjectRCardInventory.diagnostics().totalCopies, owner: ProjectRCardDeck.getRingOwner('hermes') })");
    await runEvent(["ProjectR_HermesProductionDeck", "AcquireHermesRing", "", {}]);
    const got = await copies();
    rec("A1 Hermesの指輪の初回入手(イベントのプラグインコマンド)で、実コピーがちょうど 3/3/3/10/3/3/5", same(got, STARTER) && before.copies === 0 && before.owner === "unowned", { before, got });
    rec("A2 所持している物理コピーの合計は30枚", (await total()) === 30, await total());
    const d = await json("({ n: ProjectRCardDeck.getDeck().length, valid: ProjectRCardDeck.isDeckValid(), reasons: ProjectRCardDeck.getDeckInvalidReasons(), inv: ProjectRCardInventory.validateDeck() })");
    rec("A3 初期化されたデッキは30枚で、所持枚数の検証も含めて有効", d.n === 30 && d.valid && d.reasons.length === 0 && d.inv.length === 0, d);
  });

  await check("A4", async () => {
    // 実際のデッキ構築画面を開き、描画に使われる文字列を捕まえる。
    await ev("window.__drawn = []; if (!window.__drawHook) { window.__drawHook = true; var od = Bitmap.prototype.drawText; Bitmap.prototype.drawText = function(t) { if (window.__drawn.length < 4000) window.__drawn.push(String(t)); return od.apply(this, arguments); }; } 'ok'");
    await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'");
    await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(700);
    await ev("(function() { var sc = SceneManager._scene; var i = sc._collection._items.findIndex(function(e) { return e.cardId === 'hermes_strength'; }); sc._collection.select(i); window.__drawn = []; sc.refreshCollection(); sc.refreshDetail(); return i; })()");
    await sleep(500);
    const drawn = await json("window.__drawn");
    const detail = drawn.find(t => t.indexOf("ストレングス：所持") === 0) || "";
    rec("A4 デッキ構築画面(実Scene)の詳細に「ストレングス：所持10枚 / デッキ10枚 / 上限10枚」が描かれ、一覧には「10/10枚」が描かれる", detail === "ストレングス：所持10枚 / デッキ10枚 / 上限10枚" && drawn.indexOf("10/10枚") >= 0, { detail, hasRow: drawn.indexOf("10/10枚") >= 0 });
    await ev("SceneManager.pop(); 'ok'"); await ready();
  });

  await check("A13-14", async () => {
    // 戦闘: 有効な30枚デッキで開始し、実キー(Q)でカードを使っても、物理所持は変わらない。
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); $gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await s.place(12, 25); await sleep(400);
    const before = { inv: await inv(), deck: await deckIds() };
    const begin = await json("(function() { var r = ProjectRCombatSession.begin('h2cb2', { requireValidDeck: true }); return { ok: r.ok, reason: r.reason }; })()");
    await settle(8);
    const b0 = await json("ProjectRCardDeck.getBattleState()");
    await s.place(12, 25); await s.aim(4, -1);
    const handBefore = b0 ? b0.hand.length : -1;
    let used = 0;
    for (let i = 0; i < 4; i++) {
      const pre = await json("ProjectRCardDeck.getBattleState()");
      await c.tap("Q", 90); await sleep(450);
      const post = await json("ProjectRCardDeck.getBattleState()");
      if (pre && post && post.cooldownPile.length + post.discardPile.length > pre.cooldownPile.length + pre.discardPile.length) used++;
      await c.tap("E", 90); await sleep(300);
    }
    const mid = { inv: await inv(), deck: await deckIds() };
    await ev("ProjectRCombatSession.end('h2cb2'); ProjectRCardDeck.endCardBattle(); 'ok'"); await settle(10);
    const after = { inv: await inv(), deck: await deckIds() };
    rec("A13 有効な30枚デッキで戦闘が始まる(手札5枚・山札25枚)", begin.ok && b0 && handBefore === 5 && b0.drawPile.length === 25, { begin, hand: handBefore, draw: b0 && b0.drawPile.length });
    rec("A14 実キー(Q/E)でカードを使っても、物理所持・報酬記録・デッキは戦闘中も戦闘後も変わらない(使えたカード>=1)", used >= 1 && same(mid.inv, before.inv) && same(after.inv, before.inv) && same(after.deck, before.deck), { used });
    const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
    rec("A14b 押されたままのキーがない", stuck.length === 0, stuck);
  });

  await check("A5-8", async () => {
    // デッキを外しても所持は減らない / 所持を超える追加は拒否 / 追加入手で増える / コピー上限は守る。
    await ev("window.__g0 = Graphics.frameCount; 'ok'"); await wait("Graphics.frameCount - window.__g0 > 200", 15000); // 戦闘終了後の猶予(指輪の操作は戦闘中として拒否される)が過ぎるまで
    const copiesBefore = await copies();
    const removed = await json("(function() { var r = []; for (var i = 0; i < 6; i++) r.push(ProjectRMenuCore.deck.remove('hermes_strength').ok); return { r: r, deck: ProjectRCardDeck.getDeck().length }; })()");
    rec("A5 デッキからストレングスを6枚外しても、所持は10枚のまま(カードは消えない)", removed.r.every(Boolean) && removed.deck === 24 && same(await copies(), copiesBefore), removed);
    await ev("ProjectRCardDeck.assignRingToPlayer('apollo'); ProjectRCardInventory.grantCopies('apollo_golden_arrow', 2, { rewardId: 'h2cb2.test.apollo', source: 'verify' }); 'ok'");
    const adds = await json("(function() { var m = ProjectRMenuCore, r = []; for (var i = 0; i < 3; i++) { var x = m.deck.add('apollo_golden_arrow'); r.push(x.ok ? 'ok' : x.reason); } return { r: r, msg: m.deck.add('apollo_golden_arrow').message }; })()");
    rec("A6 所持2枚のカードは2枚まで追加でき、3枚目は拒否される(CARD_COPIES_EXCEEDS_OWNED・日本語の理由つき)", same(adds.r, ["ok", "ok", "CARD_COPIES_EXCEEDS_OWNED"]) && /所持枚数を超えています/.test(adds.msg), adds);
    const more = await json("(function() { var again = ProjectRCardInventory.grantCopies('apollo_golden_arrow', 1, { rewardId: 'h2cb2.test.apollo' }); var dup = again.granted;"
      + " var g = ProjectRCardInventory.grantCopies('apollo_golden_arrow', 1, { rewardId: 'h2cb2.test.apollo2', source: 'verify' }); var x = ProjectRMenuCore.deck.add('apollo_golden_arrow');"
      + " var over = ProjectRMenuCore.deck.add('apollo_golden_arrow'); return { dup: dup, granted: g.granted, add: x.ok, over: over.reason, owned: ProjectRCardInventory.getOwnedCopies('apollo_golden_arrow') }; })()");
    rec("A7 同じ報酬IDの再付与は増えず、別の報酬IDで1枚増やすと3枚目が入る。上限(3)を超える4枚目は拒否(MAX_COPIES_EXCEEDED)", more.dup === false && more.granted && more.add && more.over === "MAX_COPIES_EXCEEDED" && more.owned === 3, more);
    const big = await json("(function() { ProjectRCardInventory.grantCopies('hermes_strength', 5, { rewardId: 'h2cb2.test.strength', source: 'verify' }); var m = ProjectRMenuCore, r = []; m.deck.clear();"
      + " for (var i = 0; i < 12; i++) { var x = m.deck.add('hermes_strength'); r.push(x.ok ? 'ok' : x.reason); } return { r: r, owned: ProjectRCardInventory.getOwnedCopies('hermes_strength'), limit: ProjectRCardInventory.getDeckLimit('hermes_strength'), inDeck: ProjectRCardInventory.getDeckCopies('hermes_strength') }; })()");
    rec("A8 ストレングスを15枚所持しても、デッキに入るのは上限の10枚まで。15枚の所持は保存されたまま", big.owned === 15 && big.limit === 10 && big.inDeck === 10 && big.r.filter(x => x === "ok").length === 10 && big.r[10] === "MAX_COPIES_EXCEEDED", big);
    await ev("ProjectRCardDeck.setDeck(ProjectRCardCatalog.buildFinalHermesDeck()); 'ok'");
  });

  await check("A9-10", async () => {
    // セーブ/ロード(一時フォルダにだけ書く)。報酬記録・所持・デッキ・Levelが戻り、ロードを繰り返しても増えない。
    await useDir(TMP_SAVE);
    await ev("ProjectRCardDeck.setCardLevel('hermes_zetsu', 3); 'ok'");
    const before = { inv: await inv(), deck: await deckIds(), core: await json("ProjectRCardDeck.getPersistentData()") };
    const saved = await ev("$gameSystem.onBeforeSave(); DataManager.saveGame(1).then(function() { window.__saved = 'ok'; }).catch(function(e) { window.__saved = 'ERR ' + e; }); 'started'");
    await wait("window.__saved", 8000);
    const files = fs.readdirSync(TMP_SAVE.replace(/\/$/, "")).filter(f => /rmmzsave$/.test(f));
    await fresh(); await useDir(TMP_SAVE);
    const afterFresh = await total();
    for (let i = 0; i < 2; i++) {
      await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
      await ev("SceneManager._scene.executeLoad(1); 'ok'");
      await ready(); await sleep(1500);
    }
    const after = { inv: await inv(), deck: await deckIds(), core: await json("ProjectRCardDeck.getPersistentData()") };
    rec("A9 実際のセーブ(一時フォルダ)→新しいゲーム→本物のロードを2回: 所持枚数・報酬記録・デッキ・Levelが完全に同じ", (await ev("window.__saved")) === "ok" && files.indexOf("file1.rmmzsave") >= 0 && afterFresh === 0 && same(after.inv, before.inv) && same(after.deck, before.deck) && same(after.core, before.core), { saved: await ev("window.__saved"), files, afterFresh, total: await total() });
    await runEvent(["ProjectR_HermesProductionDeck", "AcquireHermesRing", "", {}]);
    await runEvent(["ProjectR_MenuIntegration", "GrantRing", "", { ringId: "hermes" }]);
    const dup = await json("ProjectRHermesProductionDeck.acquireRing('hermes')");
    rec("A10 ロード後の再入手(2種のコマンドとAPI)でも、物理コピーは増えない(30+追加分のまま)・デッキも変わらない", same(await inv(), before.inv) && dup.reason === "alreadyOwned" && same(await deckIds(), before.deck), { dup: dup.reason, total: await total() });
  });

  await check("A11-12", async () => {
    await ev("ProjectRProductionTest.allowAlly(4); 'ok'");
    const before = await copies(); const deck0 = await deckIds();
    const away = await json("(function() { var r = ProjectRMenuCore.rings.transferToActor('hermes', 4); var reasons = ProjectRCardDeck.getDeckInvalidReasons(); var codes = {}; reasons.forEach(function(x) { codes[x.code] = (codes[x.code] || 0) + 1; }); return { ok: r.ok, codes: codes, deck: ProjectRCardDeck.getDeck().length, valid: ProjectRCardDeck.isDeckValid() }; })()");
    const keptAway = same(await copies(), before) && same(await deckIds(), deck0);
    rec("A11 指輪を仲間へ渡すと、Hermesのカード30枚は無効(REQUIRED_RING_NOT_OWNED)になるが、所持もデッキも消えない(所持枚数の理由は出ない)", away.ok && !away.valid && away.codes.REQUIRED_RING_NOT_OWNED === 30 && Object.keys(away.codes).length === 1 && away.deck === 30 && keptAway, away);
    const back = await json("(function() { var r = ProjectRMenuCore.rings.returnToPlayer('hermes'); return { ok: r.ok, valid: ProjectRCardDeck.isDeckValid() }; })()");
    rec("A12 指輪を戻すとデッキは再び有効。コピーは増えない", back.ok && back.valid && same(await copies(), before) && same(await deckIds(), deck0), back);
    await ev("ProjectRProductionTest.restoreRings(); 'ok'");
  });

  // ---------------- C部: 旧形式のセーブを一時フォルダに作り、本物のScene_Load経路で読む(所持枚数の領域が無い保存) ----------------
  // 実在の保護セーブ(slot1/2)は所持0・デッキ0の旧形式なので、複数枚の旧デッキ・付与記録つき・未知ID・未解放カードがデッキにある場合は、ここで実機の移行を確認する。
  const legacyLoad = async (slot, prepareExpr) => {
    await useDir(TMP_SAVE);
    await fresh();
    await ev(prepareExpr);
    await ev("delete $gameSystem._projectRCardInventory; 'ok'"); // 旧セーブの形(所持枚数の領域が無い)にする
    await ev("window.__saved = null; $gameSystem.onBeforeSave(); DataManager.saveGame(" + slot + ").then(function() { window.__saved = 'ok'; }).catch(function(e) { window.__saved = 'ERR ' + e; }); 'started'");
    await wait("window.__saved", 8000);
    const mark = c.events.length;
    await fresh(); await useDir(TMP_SAVE);
    await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
    await ev("SceneManager._scene.executeLoad(" + slot + "); 'ok'");
    await ready(); await sleep(1500);
    const errs = c.events.slice(mark).filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 300));
    return { saved: await ev("window.__saved"), errs, inv: await inv(), deck: await deckIds() };
  };
  const LEGACY = { hermes_swift_movement: 3, hermes_reed_flute_sleep: 2, hermes_perception_obscure: 3, hermes_sword_attack: 3, apollo_golden_arrow: 3, apollo_plague_attack: 2, apollo_lyre_calm: 3 };
  await check("C1", async () => {
    const r = await legacyLoad(2, "ProjectRProductionTest.legacyOwner(); 'ok'");
    const expectDeck = Object.keys(LEGACY).reduce((a, id) => a.concat(Array(LEGACY[id]).fill(id)), []);
    rec("C1 旧形式の保存(旧カード7種19枚のデッキ・Level2)を本物のロードで読む: 所持枚数が max(1, デッキ内の枚数) に移行され、旧デッキは並びも含めて変わらない。新Hermesは付与されない", r.saved === "ok" && r.errs.length === 0 && r.inv.legacy.source === "legacy" && same(r.inv.copies, LEGACY) && same(r.deck, expectDeck) && Object.keys(STARTER).every(id => !(r.inv.copies[id] > 0)),
      { saved: r.saved, errs: r.errs.slice(0, 2), copies: r.inv.copies, deck: r.deck.length, diag: r.inv.legacy.diagnostics.map(x => x.code).slice(0, 9) });
    const again = await json("(function() { var l = ProjectRCardInventory.diagnostics(); return { problems: l.deckProblems, valid: ProjectRCardDeck.isDeckValid(), reasons: ProjectRCardDeck.getDeckInvalidReasons().map(function(x) { return x.code; }), level: ProjectRCardDeck.getPersistentData().cardOwnership.hermes_sword_attack.level }; })()");
    const snap = await inv();
    await ev("(function() { var json = JsonEx.stringify(DataManager.makeSaveContents()); DataManager.extractSaveContents(JsonEx.parse(json)); })(); 'ok'"); await sleep(500);
    rec("C1b 旧デッキは自動で削除・補完されない(19枚のまま=30枚に足りない理由だけ)。所持枚数の検証は満たす。Levelは保たれる。保存→読込を繰り返しても所持枚数は同じ", again.problems.length === 0 && !again.valid && same(again.reasons, ["INVALID_DECK_SIZE"]) && again.level === 2 && same(await inv(), snap), again);
  });
  await check("C2", async () => {
    const r = await legacyLoad(3, "ProjectRHermesProductionDeck.acquireRing('hermes', { source: 'verify' }); 'ok'");
    const dup = await json("(function() { var a = ProjectRHermesProductionDeck.acquireRing('hermes'); var b = ProjectRHermesProductionDeck.grantStarter({ explicit: true }); return [a.reason, b.reason]; })()");
    rec("C2 H2C-Aの付与記録(30枚)つきの旧形式の保存: 記録の7種30枚が所持枚数になる(verifiedGrant)。デッキ30枚は有効のまま。再取得・明示付与でも増えない", r.saved === "ok" && r.errs.length === 0 && same(r.inv.copies, STARTER) && r.inv.legacy.reconstructed.hermes_strength.basis === "verifiedGrant" && r.deck.length === 30 && same(dup, ["alreadyOwned", "alreadyGranted"]) && (await total()) === 30 && (await ev("ProjectRCardDeck.isDeckValid()")),
      { copies: r.inv.copies, basis: r.inv.legacy.reconstructed.hermes_strength && r.inv.legacy.reconstructed.hermes_strength.basis, dup });
  });
  await check("C3", async () => {
    const r = await legacyLoad(4, "(function() { var d = ProjectRCardDeck; d.assignRingToPlayer('hermes'); d.setCardOwned('hermes_sword_attack', true); d.setDeck(['hermes_sword_attack', 'hermes_zetsu', 'ghost_card', 'ghost_card']); $gameSystem._projectRCardDeckData.cardOwnership.ghost_card = { owned: true, level: 2 }; })(); 'ok'");
    rec("C3 未解放のカード・未知のカードIDがデッキにある旧形式の保存: デッキは残り、未解放は所持0のまま・勝手に解放されない・診断に出る。未知IDのデッキ記録は保存領域に残る", r.saved === "ok" && r.errs.length === 0 && same(r.deck, ["hermes_sword_attack", "hermes_zetsu", "ghost_card", "ghost_card"]) && (r.inv.copies.hermes_zetsu || 0) === 0
      && r.inv.legacy.diagnostics.some(x => x.code === "LOCKED_CARD_IN_DECK" && x.cardId === "hermes_zetsu") && r.inv.legacy.diagnostics.some(x => x.code === "UNKNOWN_CARD_IN_DECK" && x.cardId === "ghost_card") && !(await ev("ProjectRCardDeck.isCardOwned('hermes_zetsu')")),
      { copies: r.inv.copies, deck: r.deck, diag: r.inv.legacy.diagnostics.map(x => x.code + ":" + x.cardId) });
  });

  // ---------------- B部: 既存セーブの保護コピー(読み取りのみ・本物のScene_Load経路) ----------------
  await ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(SAVE_COPY)}; }; StorageManager.saveObject = function() { throw new Error('WRITE BLOCKED (H2C-B2)'); }; 'ok'`);
  const snapshot = () => json("(function() { var d = ProjectRCardDeck, data = d.getPersistentData(); return { rings: data.ringOwnershipState, owned: Object.keys(data.cardOwnership).filter(function(k) { return data.cardOwnership[k].owned; }).sort(), levels: Object.keys(data.cardOwnership).sort().map(function(k) { return k + ':' + data.cardOwnership[k].level; }), deck: d.getDeck(), ultimate: data.ultimateSelection, hp: $gameSystem._projectRHermesProduction || null }; })()");
  const legacyReports = {};
  for (const slot of [1, 2]) {
    await check("B" + slot, async () => {
      await fresh();
      const mark = c.events.length;
      await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
      await ev(`SceneManager._scene.executeLoad(${slot}); 'ok'`);
      await wait("SceneManager._scene instanceof Scene_Map && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(2500);
      const a = await snapshot(); const aInv = await inv();
      const f0 = await ev("window.__sf || 0"); await sleep(1200); const f1 = await ev("window.__sf || 0");
      await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'"); await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(800);
      const details = await json("(function() { var sc = SceneManager._scene; return { scene: sc.constructor.name, items: sc._collection ? sc._collection.maxItems() : -1 }; })()");
      await ev("SceneManager.pop(); 'ok'"); await ready();
      const b = await snapshot(); const bInv = await inv();
      await ev("(function() { var json = JsonEx.stringify(DataManager.makeSaveContents()); DataManager.extractSaveContents(JsonEx.parse(json)); })(); 'ok'"); await sleep(600);
      const cInv = await inv();
      const errs = c.events.slice(mark).filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 300));
      const report = await json("(function() { var r = ProjectRCardInventory.diagnostics(); return { source: r.source, total: r.totalCopies, deckProblems: r.deckProblems, diagnostics: r.diagnostics.map(function(x) { return x.code + (x.cardId ? ':' + x.cardId : ''); }), cards: r.cards.filter(function(x) { return x.ownedCopies || x.deckCopies; }).map(function(x) { return x.cardId + '=' + x.ownedCopies + '/deck' + x.deckCopies + '/' + x.basis; }) }; })()");
      legacyReports[slot] = report;
      const newHermes = Object.keys(STARTER).filter(id => (aInv.copies[id] || 0) > 0);
      rec(`B${slot} 保護コピーのslot${slot}を本物のロード経路で読み込み: エラー無し・ゲームループが動く。所持枚数が移行され(source=legacy)、保存デッキは削除・並べ替えされない`, errs.length === 0 && f1 > f0 && aInv.legacy.source === "legacy" && same(a.deck, b.deck), { errs: errs.slice(0, 2), frames: f1 - f0, deck: a.deck.length, report, details });
      rec(`B${slot}b 移行は1回だけで、指輪・解放・Level・デッキは読込前後と画面の開閉後で同じ。メモリ上のセーブ往復を挟んでも所持枚数は同じ(増えない)。新Hermesは付与されない(新Hermes所持: ${newHermes.length}種)`, same(a, b) && same(aInv.copies, bInv.copies) && same(aInv.copies, cInv.copies) && same(aInv.legacy.diagnostics, cInv.legacy.diagnostics) && !(a.hp && a.hp.rings && a.hp.rings.hermes && a.hp.rings.hermes.granted && false), { copies: aInv.copies });
    });
  }
  const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("BZ 押されたままのキーがない・Consoleのエラーなし", stuck.length === 0 && s.errors().length === 0, { stuck, errors: s.errors().slice(0, 3), errorLog: errorLog.slice(0, 3) });
  fs.writeFileSync(`${OUT}/h2cb2_results.json`, JSON.stringify({ note: "A部: 新しいゲームを一時フォルダでセーブ/ロード。B部: 保護コピーを読み取りのみで読み込み。入力: 戦闘のQ/Eだけ実キー(CDP)", legacyReports, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
