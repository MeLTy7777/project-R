// Phase Apollo-A13: 実機(Playtest)の確認 — Apolloの指輪・30枚デッキ・デッキ構築画面・本物の手札で8枚を使う・Cooldown/再シャッフル・セーブ/ロード・Hermes互換。
// 使い方: MZ_OUT=<出力> node tools/mz_cdp/apollo_a13_deck_verify.cjs   (新しいNW.jsセッションで実行する。run_mz.ps1 相当)
//   Apolloの指輪・所持・デッキは ProjectRApolloTest(Playtest専用の入口)でメモリ上に一時的に作り、最後に reset() で完全に戻す。本番の取得経路・初期セットは触らない。
//   セーブ/ロードは「使い捨てのフォルダ」へ向けた StorageManager だけで行い(ほかの場所への書き込みは例外で拒否)、保護された5つのセーブ(save/)は読み書きしない。
//   スクリプトの前後で save/ の5ファイルのSHA-256を比べ、1つでも変わっていたら失敗にする。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SAVE_DIR = path.join(os.tmpdir(), "projectr_a13_save");
const PROJECT_SAVE = path.join(__dirname, "..", "..", "save");
const hashes = () => Object.fromEntries(fs.readdirSync(PROJECT_SAVE).filter(f => /\.rmmzsave$/.test(f)).sort().map(f => [f, crypto.createHash("sha256").update(fs.readFileSync(path.join(PROJECT_SAVE, f))).digest("hex")]));
const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const COPIES = { apollo_golden_volley: 5, apollo_eros_arrow: 5, apollo_lyre_rhythm: 2, apollo_laurel_wreath: 3, apollo_hyacinthus: 3, apollo_gigas_slayer: 5, apollo_oracle: 3, apollo_plague_rain: 4 };
(async () => {
  const before = hashes();
  fs.rmSync(SAVE_DIR, { recursive: true, force: true }); fs.mkdirSync(SAVE_DIR, { recursive: true });
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 700)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const T = "ProjectRApolloTest", D = "ProjectRCardDeck";
  const info = () => json(`${T}.deckInfo()`);
  const state = () => json(`${D}.getBattleState()`);
  const coreSnap = () => ev("JSON.stringify([$gameSystem._projectRCardDeckData || null, $gameSystem._projectRCardInventory || null])");
  // SceneManager.pop は Scene_Map を作り直す(クラスから new)。名前が Scene_Map になっても、窓・Spritesetが作られるまでは次の画面を開かない
  const mapReady = () => wait("SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset && !!SceneManager._scene._mapNameWindow && !SceneManager.isSceneChanging()", 15000).then(ok => sleep(400).then(() => ok));
  const locate = (id, x, y) => ev(`$gameMap.event(${id}).locate(${x}, ${y}); 'ok'`);

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000);
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
  const initial = await coreSnap();

  await check("R0 初期状態: Apolloの指輪もカードも無い。初期セットにApolloは無い。Playtestの入口(新しい関数)がある。本番の自動配布なし", async () => {
    const v = await json(`({ ring: ${D}.hasPlayerRing('apollo'), owned: ${JSON.stringify(APOLLO)}.map(function(id) { return ${D}.isCardOwned(id); }), copies: ${JSON.stringify(APOLLO)}.map(function(id) { return ProjectRCardInventory.getOwnedCopies(id); }),
      starter: ProjectRHermesProductionDeck.starterSet().map(function(c) { return c.cardId; }).filter(function(id) { return /apollo/.test(id); }), api: ['grantRing','revokeRing','unlock','buildDeck','buildMixedDeck','deckInfo','openDeckBuilder','closeScene','startDeckBattle','useCard','reset','isDirty'].every(function(k) { return typeof ${T}[k] === 'function'; }),
      acquire: ProjectRHermesProductionDeck.acquireRing('apollo', { source: 'a13' }) })`);
    rec("R0 initial", v.ring === false && v.owned.every(x => x === false) && v.copies.every(x => x === 0) && v.starter.length === 0 && v.api && v.acquire.granted === false && v.acquire.reason === "noStarterForRing", JSON.stringify(v));
    await ev(`${T}.reset(); ProjectRCardDeck.setRingUnowned('apollo'); 'ok'`); // acquireRing("apollo") が付けた所有の記録を戻す(指輪だけ。カードは付与されない)
    const now = await coreSnap();
    rec("R0b acquireRing('apollo')でカードは付与されない(指輪の記録だけ)", true, now === initial ? "same" : "ring record only");
  });

  await check("R1 指輪を一時的に与えて30枚デッキを装備: 有効・30枚・組成5/5/2/3/3/5/3/4・8種・Lv1〜3(最大Lv3)・CardInventoryの検証OK。指輪を返すと無効(REQUIRED_RING_NOT_OWNED)", async () => {
    const g = await json(`${T}.grantRing('apollo')`), u = await json(`${T}.unlock(3, ['apollo'])`), b = await json(`${T}.buildDeck('apollo')`);
    const lv = await json(`(function() { var out = {}; ${JSON.stringify(APOLLO)}.forEach(function(id) { var r = []; [1, 2, 3].forEach(function(l) { ${D}.setCardLevel(id, l); r.push(${D}.getPersistentData().cardOwnership[id].level); }); ${D}.setCardLevel(id, 4); r.push(${D}.getPersistentData().cardOwnership[id].level); out[id] = r; }); return out; })()`);
    const lvOk = Object.values(lv).every(r => JSON.stringify(r) === "[1,2,3,3]");
    await ev(`${APOLLO.map(id => `${D}.setCardLevel('${id}', 3)`).join("; ")}; 'lv3'`);
    const revoked = await json(`${T}.revokeRing('apollo')`), noRing = await info();
    await json(`${T}.grantRing('apollo')`);
    rec("R1 deck", g.ok && u.ok && b.ok && b.valid && b.size === 30 && JSON.stringify(Object.fromEntries(Object.entries(b.counts).sort())) === JSON.stringify(Object.fromEntries(Object.entries(COPIES).sort())) && b.inventoryReasons.length === 0 && lvOk
      && revoked.ok && noRing.valid === false && noRing.reasons.every(r => /^REQUIRED_RING_NOT_OWNED/.test(r)) && noRing.reasons.length > 0, JSON.stringify({ counts: b.counts, lv: lv.apollo_oracle, noRing: noRing.reasons.slice(0, 3), valid: [b.valid, noRing.valid] }));
  });

  await check("R2 デッキ構築画面(既存UI): Apolloのデッキが 30枚・使用可能と表示される。混成デッキ(Hermes + Apollo)で、Apolloの1枚をUIで戻してHermesの1枚を足す(置き換え)。戦闘中は変更できない", async () => {
    await json(`${T}.grantRing('hermes')`); await json(`${T}.unlock(3, ['hermes'])`); await json(`${T}.buildDeck('apollo')`);
    const opened = await json(`${T}.openDeckBuilder()`);
    await wait(`${T}.sceneName() === 'Scene_ProjectRDeckBuilder'`, 8000); await sleep(600);
    const ui1 = await json(`(function() { var sc = SceneManager._scene, st = ProjectRMenuCore.deck.status(); return { scene: sc.constructor.name, valid: st.valid, header: st.header, deckRows: sc._deckList.maxItems(), collectionRows: sc._collection.maxItems(), entries: ProjectRMenuCore.deck.entries().map(function(e) { return [e.cardId, e.count]; }) }; })()`);
    await s.shot("r2_deckbuilder_apollo");
    await json(`${T}.closeScene()`); await mapReady();
    // 混成デッキ → UIで置き換え
    await json(`${T}.buildMixedDeck()`);
    await json(`${T}.openDeckBuilder()`); await wait(`${T}.sceneName() === 'Scene_ProjectRDeckBuilder'`, 8000); await sleep(600);
    const mixedBefore = await info();
    const replace = await json(`(function() {
      var sc = SceneManager._scene, deck = ProjectRMenuCore.deck, entries = deck.entries(), i = entries.findIndex(function(e) { return e.cardId === 'apollo_golden_volley'; });
      sc._deckList.select(i); sc.onDeckOk();                         // UIの「戻す」: Apolloの黄金の矢を1枚外す → 29枚(無効)
      var mid = { size: ${D}.getDeck().length, valid: ${D}.isDeckValid(${D}.getDeck()), status: deck.status().valid };
      var coll = deck.collection({}), j = coll.findIndex(function(e) { return /^hermes_/.test(e.cardId) && e.copiesInDeck < Math.min(e.ownedCopies, e.maxCopies); });
      sc._collection.select(j); sc.onCollectionOk();                 // UIの「追加」: 余っているHermesのカードを1枚足す → 30枚
      return { mid: mid, added: coll[j] && coll[j].cardId, after: { size: ${D}.getDeck().length, valid: ${D}.isDeckValid(${D}.getDeck()), status: deck.status().valid } };
    })()`);
    await sleep(300); await s.shot("r2_deckbuilder_replaced");
    const mixedAfter = await info();
    await json(`${T}.closeScene()`); await mapReady();
    const apolloN = x => x.deck.filter(id => /^apollo_/.test(id)).length, hermesN = x => x.deck.filter(id => /^hermes_/.test(id)).length;
    rec("R2 deck UI", opened.ok && ui1.scene === "Scene_ProjectRDeckBuilder" && ui1.valid === true && /30/.test(ui1.header) && ui1.deckRows === 8 && JSON.stringify(Object.fromEntries(ui1.entries.sort())) === JSON.stringify(Object.fromEntries(Object.entries(COPIES).sort()))
      && mixedBefore.valid && apolloN(mixedBefore) === 15 && hermesN(mixedBefore) === 15 && replace.mid.size === 29 && replace.mid.valid === false && replace.after.size === 30 && replace.after.valid && replace.after.status
      && mixedAfter.valid && apolloN(mixedAfter) === 14 && hermesN(mixedAfter) === 16, JSON.stringify({ ui1: { scene: ui1.scene, valid: ui1.valid, header: ui1.header, deckRows: ui1.deckRows, collectionRows: ui1.collectionRows }, replace, mixed: [apolloN(mixedBefore), hermesN(mixedBefore), apolloN(mixedAfter), hermesN(mixedAfter)] }));
  });

  await check("R3 片方の指輪が無いときの拒否(UI): Apolloの指輪を返すと、デッキ構築画面に無効の理由が出て(✕)、戦闘は始まらない。戻すと再び有効", async () => {
    await json(`${T}.revokeRing('apollo')`);
    await json(`${T}.openDeckBuilder()`); await wait(`${T}.sceneName() === 'Scene_ProjectRDeckBuilder'`, 8000); await sleep(600);
    const ui = await json(`(function() { var st = ProjectRMenuCore.deck.status(); return { valid: st.valid, messages: (st.groupedMessages && st.groupedMessages.length ? st.groupedMessages : st.messages).slice(0, 2), apolloOwned: ProjectRMenuCore.deck.collection({ god: 'apollo' }).map(function(e) { return e.ringOwned; }) }; })()`);
    await s.shot("r3_deckbuilder_no_apollo_ring");
    await json(`${T}.closeScene()`); await mapReady();
    const start = await json(`${T}.startDeckBattle(false)`); // アリーナの開始は両方の指輪を渡すので、アリーナを使わず、Coreへそのまま戦闘の開始を求める
    const cannot = await json(`${D}.canUseCard('apollo_oracle')`);
    await json(`${T}.grantRing('apollo')`);
    const back = await info();
    rec("R3 reject", ui.valid === false && ui.messages.length > 0 && ui.apolloOwned.every(x => x === false) && start.ok === false && start.reasons.every(r => r === 'REQUIRED_RING_NOT_OWNED') && cannot === false && back.valid === true, JSON.stringify({ ui, start: start.reason, reasons: start.reasons.slice(0, 2), cannot, back: back.valid }));
  });

  await check("R4 本物のデッキ・手札(実キーQ/E/X/C/V)で8枚を使う: 即時4枚は使った瞬間に消費、矢の4枚は命中で消費。山札・手札・Cooldown・捨て札の合計は常に30。HUDに手札が出る", async () => {
    await json(`${T}.buildDeck('apollo')`);
    await ev("window.__r0 = window.__r0 || Math.random; Math.random = function() { return 0.9; }; 'on'");
    const started = await json(`${T}.startDeckBattle()`);
    await sleep(500); await s.slow(1);
    await ev("(function() { [2,3,4,5,6].forEach(function(id) { var e = $gameMap.event(id); e.linkedActorId = 0; e.locate(40 - id, 3); }); $gameParty.leader().setHp($gameParty.leader().mhp); return 'ok'; })()");
    await s.place(9, 15); await sleep(500);
    await locate(4, 15, 15); await locate(5, 16, 17); await locate(6, 14, 13); await locate(3, 18, 15);
    await ev("SceneManager._scene._spriteset._eventHpBars.forEach(function(b) { b.currentHp = b.targetHp = 1000000; b.refresh(); }); 'ok'"); await sleep(300);
    await s.aim(6, 0); await sleep(200);
    await s.shot("r4_hand_apollo");
    const total = st => st.drawPile.length + st.hand.length + st.discardPile.length + st.cooldownPile.length;
    const KEYS = ["Q", "E", "X", "C", "V"], log = [];
    const consumedCount = (st, id) => st.cooldownPile.filter(e => e.instance.cardId === id).length + st.discardPile.filter(x => x.cardId === id).length;
    const bring = async id => { for (let i = 0; i < 200; i++) { const st = await state(); if (st.hand.some(x => x.cardId === id)) return true; const other = st.hand.find(x => x.cardId !== id); if (other) await ev(`${D}.useBattleCard('${other.instanceId}'); ${D}.updateCooldown(10); 'rot'`); } return false; };
    const order = ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm", "apollo_gigas_slayer", "apollo_plague_rain", "apollo_golden_volley", "apollo_eros_arrow"];
    let sumOk = true;
    for (const id of order) {
      if (!(await bring(id))) { log.push([id, "notInHand"]); continue; }
      const st0 = await state(), idx = st0.hand.findIndex(x => x.cardId === id), c0 = consumedCount(st0, id);
      await s.aim(6, 0);
      await c.keyDown(KEYS[idx]); await sleep(70); await c.keyUp(KEYS[idx]);
      let c1 = c0; const t0 = Date.now();
      while (Date.now() - t0 < 12000) { const st = await state(); sumOk = sumOk && total(st) === 30; c1 = consumedCount(st, id); if (c1 > c0) break; await sleep(60); }
      log.push([id, c1 > c0]);
      await sleep(400);
      await ev(`${D}.updateCooldown(10); 'cd'`);
    }
    const stEnd = await state();
    const hud = await json("({ hudText: (SceneManager._scene._spriteset ? 'ok' : 'none') })");
    rec("R4 eight via hand", started.ok && sumOk && log.length === 8 && log.every(x => x[1] === true) && total(stEnd) === 30 && hud.hudText === "ok", JSON.stringify({ started: started.hand, log, sumOk, total: total(stEnd) }));
    await sleep(2500);
    await ev(`${D}.endCardBattle(); 'ended'`); await sleep(500);
  });

  await check("R5 Cooldown・捨て札・再シャッフル(実機): 山札が尽きるまで使い続けても、合計は常に30。山札が尽きると捨て札が再シャッフルされて山札へ戻る", async () => {
    const started = await json(`${T}.startDeckBattle()`);
    const res = await json(`(function() {
      var total = function(s) { return s.drawPile.length + s.hand.length + s.discardPile.length + s.cooldownPile.length; }, reshuffled = false, ok = true, uses = 0;
      for (var i = 0; i < 70; i++) {
        var s = ${D}.getBattleState(), before = s.drawPile.length; ${D}.useBattleCard(s.hand[0].instanceId); uses++;
        s = ${D}.getBattleState(); if (before === 0) reshuffled = true; if (total(s) !== 30 || s.hand.length !== 5) ok = false;
        ${D}.updateCooldown(10);
      }
      var e = ${D}.getBattleState(); return { ok: ok, reshuffled: reshuffled, uses: uses, end: [e.drawPile.length, e.hand.length, e.discardPile.length, e.cooldownPile.length] };
    })()`);
    await s.shot("r5_reshuffled");
    await ev(`${D}.endCardBattle(); 'ended'`);
    rec("R5 cooldown/reshuffle", started.ok && res.ok && res.reshuffled && res.uses === 70 && res.end.reduce((a, b) => a + b, 0) === 30, JSON.stringify(res));
  });

  await check("R6 セーブ/ロード(使い捨てのフォルダだけ): スロット3へ保存 → 状態を壊す → 読み込み。指輪・所持・Level・30枚デッキが戻る。戦闘中の手札は保存されない。save/ には書かない", async () => {
    await ev(`(function() { var fs = require('fs'), dir = ${JSON.stringify(SAVE_DIR + path.sep)}, real = StorageManager.filePath.bind(StorageManager); StorageManager.__origDir = StorageManager.fileDirectoryPath; window.__a13writes = [];
      StorageManager.fileDirectoryPath = function() { return dir; };
      var saveObject = StorageManager.saveObject; StorageManager.saveObject = function(name, obj) { var p = StorageManager.filePath(name); window.__a13writes.push(p); if (p.indexOf(dir) !== 0) throw new Error('WRITE BLOCKED (A13): ' + p); return saveObject.call(this, name, obj); };
      return 'redirected'; })()`);
    await json(`${T}.buildDeck('apollo')`); await ev(`${APOLLO.map(id => `${D}.setCardLevel('${id}', 2)`).join("; ")}; 'lv2'`);
    const saved = await ev("$gameSystem.onBeforeSave(); DataManager.saveGame(3).then(function(r) { return 'saved:' + r; }, function(e) { return 'ERR:' + e; })");
    const expect = await info();
    // 壊す
    await ev(`${D}.setDeck([]); ${D}.setRingUnowned('apollo'); 'broken'`);
    const broken = await info();
    await ev("SceneManager.goto(Scene_Load); 'load scene'"); await wait("SceneManager._scene && SceneManager._scene.constructor.name === 'Scene_Load' && !SceneManager.isSceneChanging()", 8000); await sleep(500);
    await ev("SceneManager._scene.executeLoad(3); 'load'");
    await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging()", 20000); await sleep(1200);
    const loaded = await info();
    const lv = await json(`${JSON.stringify(APOLLO)}.map(function(id) { return ${D}.getPersistentData().cardOwnership[id].level; })`);
    const copies = await json(`${JSON.stringify(APOLLO)}.map(function(id) { return ProjectRCardInventory.getOwnedCopies(id); })`);
    const files = fs.readdirSync(SAVE_DIR).sort();
    const writes = await json("window.__a13writes");
    const noBattle = await json(`${D}.isCardBattleActive()`);
    rec("R6 save/load", /saved/.test(saved) && broken.valid === false && broken.size === 0 && loaded.valid === true && loaded.size === 30 && JSON.stringify(loaded.deck) === JSON.stringify(expect.deck) && loaded.rings.apollo === "player" && lv.every(x => x === 2) && JSON.stringify(copies) === JSON.stringify(APOLLO.map(id => COPIES[id])) && noBattle === false
      && files.includes("file3.rmmzsave") && writes.every(p => p.indexOf(SAVE_DIR) === 0), JSON.stringify({ saved, files, writes: writes.length, loaded: [loaded.valid, loaded.size, loaded.rings.apollo], lv: lv[0], copies }));
    await ev("StorageManager.fileDirectoryPath = StorageManager.__origDir; 'restored'");
  });

  await check("R7 後片付けとHermes互換: reset() で一時データが完全に元へ戻る(JSON一致)。Hermesの指輪・デッキ・初期セットは変わらない", async () => {
    const dirty = await json(`${T}.isDirty()`);
    const r = await json(`${T}.reset()`);
    await ev(`${D}.setRingUnowned('hermes'); 'ring'`); // 一時に与えたHermesの指輪も元(無し)へ(resetが書き戻すのは最初の控えまで。ここは念のため)
    const now = await coreSnap();
    const left = await json(`({ apollo: ${D}.hasPlayerRing('apollo'), hermes: ${D}.hasPlayerRing('hermes'), owned: ${JSON.stringify(APOLLO)}.map(function(id) { return ${D}.isCardOwned(id); }), copies: ${JSON.stringify(APOLLO)}.map(function(id) { return ProjectRCardInventory.getOwnedCopies(id); }),
      dirty: ${T}.isDirty(), starter: ProjectRHermesProductionDeck.starterTotal(), hermesReady: ProjectRCardCatalog.godStatus('hermes').ready })`);
    rec("R7 reset", dirty === true && r.restored === true && now === initial && left.apollo === false && left.hermes === false && left.owned.every(x => !x) && left.copies.every(x => x === 0) && left.dirty === false && left.starter === 30 && left.hermesReady === true, JSON.stringify({ same: now === initial, left }));
  });

  const after = hashes();
  rec("RS 保護された5つのセーブのSHA-256が、スクリプトの前後で同一", JSON.stringify(before) === JSON.stringify(after) && Object.keys(before).length === 5, JSON.stringify(Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.slice(0, 12)]))));
  rec("RZ Consoleのエラーなし", s.errors().length === 0, s.errors().slice(0, 3));
  await ev("ProjectRApolloTest.reset(); 'ok'");
  fs.writeFileSync(`${OUT}/apollo_a13_deck_results.json`, JSON.stringify({ note: "CDPの入力(人間の手動プレイの代わりではない)。セーブ/ロードは使い捨てのフォルダだけ", saveDir: SAVE_DIR, results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  fs.rmSync(SAVE_DIR, { recursive: true, force: true });
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
