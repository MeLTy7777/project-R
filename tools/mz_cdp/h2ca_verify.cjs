// Phase H2C-A の実機検証(Hermes本番デッキ統合: 指輪の初回入手 / 7種30枚 / デッキ構築 / 戦闘前検証 / 戦闘中のカード循環 / 指輪の譲渡 / 旧セーブ)
// 使い方: MZ_OUT=<出力フォルダ> node tools/mz_cdp/h2ca_verify.cjs
//   すでに起動している Playtest(nw.exe <project> test --remote-debugging-port=9222)へ接続するだけです。MZを起動・終了しません。
//   「新しいゲーム」はメモリ上で作り直します(DataManager.setupNewGame)。セーブスロットには一切書きません(セーブ→ロードはJsonExのメモリ往復)。
//   入手はイベントのプラグインコマンド(コマンド357)を本物のGame_Interpreterで実行して行います。
//   デッキ構築画面の編集・戦闘中のカード(Q)・押しっぱなしは、実入力(Input.dispatchKeyEvent)です。終了時に押しっぱなしのキーを全部離します。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const STARTER = { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 };
const NAMES = { hermes_issen: "一閃", hermes_psychopomp: "サイコポンポス", hermes_veil: "ヴェイル", hermes_strength: "ストレングス", hermes_sweep: "薙ぎ払い", hermes_reed_flute: "葦笛", hermes_zetsu: "絶" };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = o => { const r = {}; for (const k of Object.keys(o).sort()) r[k] = o[k]; return r; };
(async () => {
  const s = await session(); const { ev, c, rec, sleep } = s;
  const errorLog = [];
  const check = async (id, fn) => {
    const before = s.errors().length;
    try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); }
    const now = s.errors().length; if (now !== before) { errorLog.push({ step: id, newErrors: s.errors().slice(before) }); console.log("  (console errors +" + (now - before) + " in " + id + ")"); }
  };
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const settle = n => s.sceneFrames(n || 10);
  const data = () => json("ProjectRCardDeck.getPersistentData()");
  const prodState = () => json("ProjectRHermesProductionDeck.state()");
  const deckIds = () => json("ProjectRCardDeck.getDeck()");
  const counts = async () => { const m = {}; for (const id of await deckIds()) m[id] = (m[id] || 0) + 1; return m; };
  const battle = () => json("ProjectRCardDeck.getBattleState()");
  const consumed = async () => { const b = await battle(); return b.cooldownPile.length + b.discardPile.length; };
  const total = b => b.hand.length + b.drawPile.length + b.discardPile.length + b.cooldownPile.length;
  const releaseAll = async () => { for (const k of ["Q", "E", "X", "C", "V", "F", "U", "R", "J", "Esc", "W", "A", "S", "D", "Enter", "Tab", "Down", "Up", "Left", "Right", "Shift"]) { try { await c.keyUp(k); } catch (_e) { /* 未定義 */ } } await ev("Input.clear(); TouchInput.clear(); 'cleared'"); };
  const runEvent = async (plugin, command, args) => {
    await ev(`(function() { var list = [{ code: 357, indent: 0, parameters: [${JSON.stringify(plugin)}, ${JSON.stringify(command)}, "", ${JSON.stringify(args || {})}] }, { code: 0, indent: 0, parameters: [] }]; $gameMap._interpreter.setup(list, 0); return 'set'; })()`);
    const ended = await wait("!$gameMap.isEventRunning()", 6000); await settle(4); return ended;
  };
  const ready = () => wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000);
  const roundTrip = async () => { const r = await json("ProjectRProductionTest.roundTrip()"); await ready(); await sleep(1200); await s.slow(1); return r; };
  const fresh = async () => {
    await ev("ProjectRProductionTest.freshGame(); 'ok'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1200);
    await s.slow(1);
  };
  const enterArena = async () => {
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); $gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await s.place(12, 25); await sleep(400);
  };
  const orderedBattle = async (order) => json(`(function(order) { var d = ProjectRCardDeck; var ids = d.getDeck().slice(), seq = [];
      order.forEach(function(id) { var i = ids.indexOf(id); if (i >= 0) seq.push(ids.splice(i, 1)[0]); }); seq = seq.concat(ids);
      ProjectRCombatSession.end('h2ca'); d.endCardBattle(); var r = Math.random; Math.random = function() { return 1 - Number.EPSILON; };
      var res = d.startCardBattle(seq.slice().reverse()); Math.random = r;
      return { ok: res.ok, reasons: res.reasons, hand: res.ok ? d.getBattleState().hand.map(function(x) { return x.cardId; }) : [] }; })(${JSON.stringify(order)})`);
  const sceneName = () => ev("SceneManager._scene.constructor.name");
  const closeToMap = async () => { for (let i = 0; i < 4; i++) { if ((await sceneName()) === "Scene_Map") return true; await c.tap("X", 90); await sleep(300); } return (await sceneName()) === "Scene_Map"; };

  try {
    const env = await json("({ playtest: Utils.isOptionValid('test'), w: Graphics.width, h: Graphics.height, plugins: ['ProjectR_HermesProductionDeck','ProjectR_CombatTestArenaProduction'].map(function(n) { return $plugins.some(function(p) { return p.name === n && p.status; }); }), helper: typeof ProjectRProductionTest, api: typeof ProjectRHermesProductionDeck })");
    rec("P0 実機: Playtest・1920x1080・本番プラグインとDEVヘルパーが読み込まれている", env.playtest && env.w === 1920 && env.h === 1080 && env.plugins.every(Boolean) && env.helper === "object" && env.api === "object", env);

    // ---- 新しいゲーム → 初回入手 ----
    await check("fresh", async () => {
      await fresh();
      const st = await json("({ owner: ProjectRCardDeck.getRingOwner('hermes'), cards: " + JSON.stringify(Object.keys(STARTER)) + ".map(function(id) { return ProjectRCardDeck.isCardOwned(id); }), deck: ProjectRCardDeck.getDeck().length, granted: ProjectRHermesProductionDeck.hasGranted(), startOk: ProjectRCardDeck.startCardBattle().ok })");
      rec("P1 新しいゲーム: Hermesの指輪は未所持・新カードは未所持・デッキは空・何も付与されない・空デッキでは戦闘不可",
        st.owner === "unowned" && st.cards.every(v => v === false) && st.deck === 0 && st.granted === false && st.startOk === false, st);
    });
    let afterGrant = null;
    await check("acquire", async () => {
      const ended = await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      const owner = await ev("ProjectRCardDeck.getRingOwner('hermes')");
      const cnt = await counts();
      const st = await prodState(), d = await data();
      const levels = Object.keys(STARTER).every(id => d.cardOwnership[id] && d.cardOwnership[id].owned && d.cardOwnership[id].level === 1);
      const valid = await json("({ valid: ProjectRCardDeck.isDeckValid(), reasons: ProjectRCardDeck.getDeckInvalidReasons(), boss: ProjectRCardDeck.canStartBossBattle() })");
      rec("P2 イベント(コマンド357)で指輪を初回入手: ちょうど7種30枚・Lv1・デッキ30枚で初期化・30枚検証OK・ボス戦開始可",
        ended && owner === "player" && same(cnt, STARTER) && levels && valid.valid && valid.boss && st.rings.hermes.granted && st.rings.hermes.totalCopies === 30 && st.rings.hermes.deckInitialized,
        { owner, cnt, valid, record: st.rings.hermes });
      afterGrant = { data: await data(), state: await prodState(), deck: await deckIds() };
    });
    await check("idempotent", async () => {
      await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      await runEvent("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
      await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      const now = { data: await data(), state: await prodState(), deck: await deckIds() };
      rec("P3 同じ入手イベントを3回再実行(専用コマンド・既存GrantRing): 所持・Level・デッキ・記録が一切変わらない(二重付与なし)", same(now, afterGrant), { deck: now.deck.length });
      const trip = await roundTrip();
      const after = { data: await data(), state: await prodState(), deck: await deckIds() };
      await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      await runEvent("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
      const again = { data: await data(), state: await prodState(), deck: await deckIds() };
      rec("P4 セーブ→ロード(メモリ往復): 記録・所持・デッキが保たれ、ロード後の再入手でも変わらない", trip.ok && same(after, afterGrant) && same(again, afterGrant), { bytes: trip.bytes });
    });

    // ---- デッキ構築画面(本物のScene) ----
    await check("deckbuilder", async () => {
      await ev("ProjectRMenuIntegration.openDeckBuilder()");
      const opened = await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(900);
      const scene = await json("(function() { var sc = SceneManager._scene; return { items: sc._collection.items().map(function(e) { return { id: e.cardId, name: e.info.name, level: e.level, max: e.maxCopies, inDeck: e.copiesInDeck, usable: e.usable, target: e.info.targetLabel, cat: e.info.categoryLabel, rar: e.info.rarityLabel, cd: e.info.cooldownSeconds, god: e.info.godName }; }), deck: sc._deckList.items().map(function(e) { return { id: e.cardId, n: e.count }; }), status: ProjectRMenuCore.deck.status() }; })()");
      await s.shot("h2ca_01_deckbuilder_all");
      const idsOk = same(scene.items.map(e => e.id).sort(), Object.keys(STARTER).sort());
      const namesOk = scene.items.every(e => e.name === NAMES[e.id] && e.max === STARTER[e.id] && e.level === 1 && e.usable && e.god === "ヘルメース");
      const deckOk = scene.deck.length === 7 && scene.deck.every(e => STARTER[e.id] === e.n);
      rec("P5 デッキ構築: 7種すべてが日本語名・所持上限(枚数)・Lv1・使用可で並び、デッキは7種30枚・✔使用可能", opened && idsOk && namesOk && deckOk && scene.status.valid && scene.status.count === 30, { items: scene.items.map(e => [e.name, e.max, e.cat, e.rar, e.cd, e.target]), status: scene.status.header });
      // 各カードを実キーで選び、詳細(Level別効果・対象・分類)を撮る
      await c.tap("F", 90); await sleep(300);
      const order = scene.items.map(e => e.id);
      for (const target of ["hermes_veil", "hermes_strength", "hermes_psychopomp"]) {
        const want = order.indexOf(target);
        let cur = await ev("SceneManager._scene._collection.index()");
        while (cur < want) { await c.tap("S", 70); cur++; }
        while (cur > want) { await c.tap("W", 70); cur--; }
        await sleep(350);
        await s.shot("h2ca_02_detail_" + target);
      }
    });
    await check("edit", async () => {
      const before = await counts();
      const order = await json("SceneManager._scene._collection.items().map(function(e) { return e.cardId; })");
      const go = async id => { const want = order.indexOf(id); let cur = await ev("SceneManager._scene._collection.index()"); while (cur < want) { await c.tap("S", 70); cur++; } while (cur > want) { await c.tap("W", 70); cur--; } await sleep(250); };
      await go("hermes_zetsu"); await c.tap("Shift", 90); await sleep(300);
      const removed = await counts(); const st1 = await json("ProjectRMenuCore.deck.status()");
      await s.shot("h2ca_03_after_remove_zetsu");
      await go("hermes_strength"); await c.tap("F", 90); await sleep(300);
      const notice = await ev("SceneManager._scene._notice");
      const afterOver = await counts();
      await go("hermes_zetsu"); await c.tap("F", 90); await sleep(300);
      const restored = await counts(); const st2 = await json("ProjectRMenuCore.deck.status()");
      rec("P6 実キーでの編集: Shift=1枚戻す→29枚(無効の理由を表示)・上限(ストレングス10)で11枚目は拒否されメッセージ・Enter=追加で30枚に復帰",
        removed.hermes_zetsu === 4 && st1.valid === false && /30枚必要（現在29枚）/.test(st1.messages[0]) && /コピー上限超過：ストレングス（11\/10）/.test(notice) && same(afterOver, removed) && same(restored, before) && st2.valid,
        { removed: removed.hermes_zetsu, header1: st1.header, notice, restoredOk: same(restored, before) });
      const closed = await closeToMap();
      const afterClose = await counts();
      rec("P7 実キー(X = キャンセル)で画面を閉じられ、デッキ編集は保たれる", closed && same(afterClose, before) && same(await counts(), STARTER), { closed, afterClose });
    });

    // ---- 戦闘(アリーナ) ----
    await check("combat-entry", async () => {
      await enterArena();
      const before = { data: await data(), state: await prodState(), deck: await deckIds() };
      const begin = await json("(function() { var r = ProjectRCombatSession.begin('h2ca', { requireValidDeck: true }); return { ok: r.ok, reason: r.reason }; })()");
      await settle(8);
      const b = await battle();
      const lock = await json("({ menu: ProjectRMenuIntegration.openDeckBuilder(), remove: ProjectRMenuCore.deck.remove('hermes_strength').reason, grant: ProjectRHermesProductionDeck.acquireRing('hermes').reason })");
      const tally = {}; for (const x of [...b.hand, ...b.drawPile]) tally[x.cardId] = (tally[x.cardId] || 0) + 1;
      const after = { data: await data(), state: await prodState(), deck: await deckIds() };
      rec("P8 戦闘開始: 初期30枚デッキで開始でき、手札5枚・山札25枚・組成が正しい。開始しても付与・初期化・デッキのリセットはない。戦闘中はメニュー・編集が拒否される",
        begin.ok && b.hand.length === 5 && b.drawPile.length === 25 && same(sorted(tally), sorted(STARTER)) && same(after, before) && lock.menu === false && lock.remove === "inCombat" && lock.grant === "alreadyOwned",
        { begin, hand: b.hand.map(x => x.cardId), draw: b.drawPile.length, lock });
    });
    await check("cycle", async () => {
      const order = ["hermes_issen", "hermes_psychopomp", "hermes_veil", "hermes_strength", "hermes_sweep", "hermes_reed_flute", "hermes_zetsu"];
      const started = await orderedBattle(order);
      await ev("ProjectRCombatSession.begin('h2ca', { requireValidDeck: false }); 'ok'"); await settle(6); await s.slow(1);
      const used = [], failures = [];
      for (let i = 0; i < 7; i++) {
        const before = await battle();
        const card = before.hand[0].cardId;
        await s.place(12, 25); await s.aim(card === "hermes_zetsu" ? 5 : 4, card === "hermes_issen" ? 0 : -1);
        await c.tap("Q", 90);
        await sleep(card === "hermes_zetsu" ? 1400 : 500);
        const last = await s.last();
        const b = await battle();
        // 絶は予備動作(約8フレーム)の「保留」として返る。消費の確定(下の枚数)で成功を判定する。
        const ok = last && (last.ok || (card === "hermes_zetsu" && last.reason === "pending")) && last.cardId === card && b.hand.length === 5 && total(b) === 30 && (b.cooldownPile.length + b.discardPile.length) === i + 1;
        used.push(last && last.cardId);
        if (!ok) failures.push({ i, card, last: last && { ok: last.ok, reason: last.reason, cardId: last.cardId }, hand: b.hand.length, total: total(b), cd: b.cooldownPile.length, dis: b.discardPile.length });
        await sleep(150);
      }
      await s.shot("h2ca_04_after_seven_cards");
      rec("P9 実キー(Q)で7種すべてを引いて発動: 1回の押下 = 1枚の消費・使った直後に補充・常に30枚・手札5枚", same(used, order) && failures.length === 0, { used, failures });
      // Cooldownの期限切れ → 捨て札
      const t0 = Date.now(); let b = await battle();
      while (b.cooldownPile.length > 0 && Date.now() - t0 < 16000) { await sleep(500); b = await battle(); }
      rec("P10 Cooldown(最長10秒)が切れると全部捨て札へ。山札に混ざらず、30枚が保たれる", b.cooldownPile.length === 0 && b.discardPile.length === 7 && total(b) === 30 && b.drawPile.length === 18, { cooldown: b.cooldownPile.length, discard: b.discardPile.length, draw: b.drawPile.length, total: total(b) });
    });
    await check("held", async () => {
      for (const card of ["hermes_strength", "hermes_zetsu"]) {
        await orderedBattle([card, card, card, card, card]);
        await ev("ProjectRCombatSession.begin('h2ca', { requireValidDeck: false }); 'ok'"); await settle(6); await s.slow(1);
        await s.place(12, 25); await s.aim(5, -1);
        const before = await consumed();
        await c.keyDown("Q");
        for (let i = 0; i < 28; i++) { await c.send("Input.dispatchKeyEvent", { type: "keyDown", code: "KeyQ", windowsVirtualKeyCode: 81, key: "q", autoRepeat: true }); await sleep(50); }
        const during = await consumed();
        await c.keyUp("Q"); await sleep(500);
        const after = await consumed();
        const st = card === "hermes_strength" ? await json("ProjectRHermesStrength.getStacks ? ProjectRHermesStrength.getStacks() : null") : null;
        rec(`P11 押しっぱなし(約1.4秒のキーリピート): ${NAMES[card]}(Cooldown ${card === "hermes_strength" ? "0.1" : "0.5"}秒)でも1回しか発動しない`, during - before === 1 && after - before === 1, { before, during, after, stacks: st });
      }
    });
    await check("combat-end", async () => {
      // 本物の戦闘セッション(開始 → 実キーで1枚使う → 終了)で、戦闘終了の後始末を確認する。
      await ev("ProjectRCombatSession.end('h2ca'); ProjectRCardDeck.endCardBattle(); 'ok'"); await settle(10);
      const began = await json("(function() { var r = ProjectRCombatSession.begin('h2ca_end', { requireValidDeck: true }); return { ok: r.ok, reason: r.reason }; })()"); await settle(8);
      const before = { data: await data(), state: await prodState() };
      await s.slow(1); await s.place(12, 25); await s.aim(4, -1); await c.tap("Q", 90); await sleep(800);
      const usedOne = (await consumed()) >= 1;
      await ev("ProjectRCombatSession.end('h2ca_end'); 'ok'"); await settle(10);
      const st = await json("({ battle: ProjectRCardDeck.getBattleState(), active: ProjectRCardDeck.isCardBattleActive() })");
      const after = { data: await data(), state: await prodState() };
      rec("P12 戦闘終了(本物のセッション): 戦闘状態(手札・山札)は消え、所持・デッキ・記録は戦闘前のまま(リセットなし)", began.ok && usedOne && st.battle === null && st.active === false && same(after, before) && same(await counts(), STARTER), { counts: await counts() });
    });

    // ---- 指輪の譲渡 ----
    await check("transfer", async () => {
      await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); 'ok'");
      await s.place(12, 25);
      const calm = await wait("!ProjectRCombatPresence.isCombatActive() && !ProjectRCardDeck.isCardBattleActive()", 8000); await settle(60);
      const before = { data: await data(), state: await prodState(), deck: await deckIds() };
      const allowed = await json("ProjectRProductionTest.allowAlly(4)");
      const tr = await json("ProjectRMenuCore.rings.transferToActor('hermes', 4)");
      const st = await json("ProjectRMenuCore.deck.status()");
      const startBlocked = await json("(function() { var r = ProjectRCombatSession.begin('boss', { requireValidDeck: true }); return { ok: r.ok, reason: r.reason }; })()");
      await ev("ProjectRCombatSession.end('boss'); 'ok'"); await settle(10);
      const mid = { data: await data(), deck: await deckIds() };
      await ev("ProjectRMenuIntegration.openDeckBuilder()"); await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(900);
      await s.shot("h2ca_05_ring_with_ally_invalid_deck");
      await closeToMap();
      rec("P13 指輪を仲間へ渡す: 30枚すべてが無効(理由は指輪ごとにまとめて表示)だが、所持・デッキは消えず、戦闘(ボス戦検証)は拒否される",
        calm && allowed[0] === 4 && tr.ok && st.valid === false && st.reasons.filter(r => r.code === "REQUIRED_RING_NOT_OWNED").length === 30 && st.groupedMessages.length === 1 && /ヘルメースの指輪を主人公が持っていないため使えません/.test(st.groupedMessages[0]) &&
          same(mid.data.cardOwnership, before.data.cardOwnership) && same(mid.deck, before.deck) && startBlocked.ok === false,
        { owner: await ev("ProjectRCardDeck.getRingOwner('hermes')"), msg: st.groupedMessages[0], blocked: startBlocked });
      const ret = await json("ProjectRMenuCore.rings.returnToPlayer('hermes')");
      await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      await runEvent("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
      const back = { data: await data(), state: await prodState(), deck: await deckIds(), valid: await ev("ProjectRCardDeck.isDeckValid()") };
      rec("P14 指輪を戻す: 再び使えるようになり、30枚の再付与はない(所持・Level・記録・デッキは譲渡前と同一。入手イベントを再実行しても同じ)", ret.ok && back.valid === true && same({ data: back.data, state: back.state, deck: back.deck }, before), { valid: back.valid });
      const during = await json("(function() { var b = ProjectRCombatSession.begin('t', { requireValidDeck: true }); var r = ProjectRMenuCore.rings.transferToActor('hermes', 4); ProjectRCombatSession.end('t'); return { began: b.ok, transfer: r.reason }; })()");
      await ev("ProjectRProductionTest.restoreRings(); 'ok'");
      rec("P15 戦闘中の指輪の譲渡は拒否される(inCombat)", during.began && during.transfer === "inCombat", during);
    });

    // ---- 旧セーブ ----
    await check("legacy", async () => {
      await fresh();
      const made = await json("ProjectRProductionTest.legacyOwner()");
      await roundTrip();
      const before = { data: await data(), deck: await deckIds() };
      await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
      await runEvent("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
      const after = { data: await data(), deck: await deckIds() };
      const rep = await json("ProjectRHermesProductionDeck.diagnose()");
      const prop = await json("ProjectRHermesProductionDeck.legacyMigrationProposal()");
      const mid = { data: await data(), deck: await deckIds() };
      await ev("ProjectRMenuIntegration.openDeckBuilder()"); await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(900);
      await s.shot("h2ca_06_legacy_save_deckbuilder");
      await closeToMap();
      rec("P16 旧セーブ(指輪と旧カード19枚): ロードや入手イベントで30枚は付与されず、旧カード・Level・保存デッキは一切変わらない。診断は legacy / 19枚 / 無効(30枚必要)",
        made.ok && same(after, before) && !(await ev("ProjectRHermesProductionDeck.hasGranted()")) && rep.deck.kind === "legacy" && rep.deck.count === 19 && rep.deck.valid === false && rep.production.ownedKinds === 0,
        { kind: rep.deck.kind, count: rep.deck.count, owned: rep.legacy.owned.length });
      rec("P17 旧→新の移行案は表示専用(applied=false)で、所持・デッキを変えない", prop.applied === false && same(mid, after) && prop.rows.length === 4, prop.rows.map(r => [r.legacy, r.proposed]));
    });

    // ---- ユーザーの既存セーブ(読み取りだけ。メモリに読み込んで確認する。書き込み・上書きはしない) ----
    await check("real-saves", async () => {
      const report = [];
      for (const slot of [1, 2, 3]) {
        const exists = await ev(`StorageManager.exists(DataManager.makeSavename(${slot}))`);
        if (!exists) { report.push({ slot, exists: false }); continue; }
        await fresh();
        // 本物のScene_Load.onLoadSuccessと同じ手順: マップ更新の確認(reloadMapIfUpdated)→Scene_Mapへ。読み込みと同じ処理の中で行う(間に別のフレームを挟まない)。
        await ev(`DataManager.loadGame(${slot}).then(function() { Scene_Load.prototype.reloadMapIfUpdated.call(null); SceneManager.goto(Scene_Map); return 'loaded'; })`);
        await ready(); await sleep(1200);
        const view = async () => json("(function() { var d = ProjectRCardDeck.getPersistentData(); var rep = ProjectRHermesProductionDeck.diagnose(); return { rings: d.ringOwnershipState, owned: Object.keys(d.cardOwnership).filter(function(k) { return d.cardOwnership[k].owned; }), deck: d.deckDefinition.cardIds.length, kind: rep.deck.kind, valid: rep.deck.valid, productionOwned: rep.production.ownedKinds, granted: rep.ring.granted, legacyOwned: rep.legacy.owned }; })()");
        const loaded = await view();
        const before = { data: await data(), deck: await deckIds() };
        await roundTrip();
        const trip = { data: await data(), deck: await deckIds() };
        let afterEvents = trip;
        if (loaded.rings.hermes === "player") {
          await runEvent("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
          await runEvent("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
          afterEvents = { data: await data(), deck: await deckIds() };
        }
        const finalView = await view();
        report.push({ slot, exists: true, loaded, ringHermes: loaded.rings.hermes, stable: same(before, trip) && same(trip, afterEvents), newCardsAfter: finalView.productionOwned, grantedAfter: finalView.granted });
      }
      const ok = report.every(r => !r.exists || (r.stable && (r.ringHermes !== "player" ? true : r.newCardsAfter === r.loaded.productionOwned && r.grantedAfter === false)));
      rec("P19 ユーザーの既存セーブ3つ(読み取りのみ): 読み込み・メモリ往復・入手イベントの再実行で、所持・デッキは一切変わらず、30枚は付与されない(指輪を持つ場合)", ok, report);
    });

    // ユーザーの旧セーブ(slot1)を読み込むと、Hendrixの生成Event(マップデータに無いEvent)をVisionOcclusionが読めず1件エラーを出す。
    // これはこのPhaseの変更とは無関係: 本Phaseの2プラグインを無効化し MenuCore/DeckBuilder を HEAD に戻したコピーでも、同じ読み込みで同じエラーが出ることを確認済み(docsに記録)。
    const knownLoad = errorLog.filter(e => e.step === "real-saves").reduce((n, e) => n + e.newErrors.length, 0);
    const errors = s.errors();
    const unexpected = errorLog.filter(e => e.step !== "real-saves");
    rec("P18 Console(F8)に赤いエラーがない(旧セーブ読み込み時の既存の1件を除く)", unexpected.length === 0 && errors.length - knownLoad === 0,
      { total: errors.length, knownPreExistingOnRealSaveLoad: knownLoad, other: errors.length - knownLoad, steps: errorLog.map(e => e.step) });
  } finally {
    await releaseAll();
    fs.writeFileSync(`${OUT}/h2ca_results.json`, JSON.stringify(s.results, null, 1));
    const failed = s.results.filter(r => !r.ok);
    console.log(`\nRESULT ${s.results.length - failed.length}/${s.results.length}`);
    process.exit(failed.length ? 1 : 0);
  }
})().catch(e => { console.error(e); process.exit(2); });
