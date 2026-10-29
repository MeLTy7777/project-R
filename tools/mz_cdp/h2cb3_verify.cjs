// Phase H2C-B3: 実機(Playtest)の確認 — 初期付与のプレビュー(読み取り専用)・現在の挙動(加算)・旧セーブ移行の説明(Deck Builderの実描画)・開発者レポート・旧カードと新カードの共存。
// 使い方: MZ_OUT=<出力> MZ_TMP_SAVE=<一時のsaveフォルダ> node tools/mz_cdp/h2cb3_verify.cjs
//   新しいゲームはメモリ上に作る。旧形式の保存は MZ_TMP_SAVE(一時フォルダ)だけに書き、本物のScene_Load経路で読む。本物のsave/には触れない。入力はCDPでは送らない(状態の準備と観測だけ)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const norm = p => String(p || "").replace(/\\/g, "/").replace(/\/?$/, "/");
const TMP_SAVE = norm(process.env.MZ_TMP_SAVE);
const sortKeys = o => { if (Array.isArray(o)) return o.map(sortKeys); if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o).sort()) r[k] = sortKeys(o[k]); return r; } return o; };
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
(async () => {
  if (!process.env.MZ_TMP_SAVE) throw new Error("MZ_TMP_SAVE(一時のsaveフォルダ)を指定してください");
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 600)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800); };
  const fresh = async () => { await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1); };
  const useDir = dir => ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(dir)}; }; 'ok'`);
  const snapshot = () => json("({ inv: ProjectRCardInventory.state(), core: ProjectRCardDeck.getPersistentData(), prod: ProjectRHermesProductionDeck.state(), deck: ProjectRCardDeck.getDeck() })");
  const drawnOnDeckBuilder = async () => {
    await ev("window.__drawn = []; if (!window.__drawHook) { window.__drawHook = true; var od = Bitmap.prototype.drawText; Bitmap.prototype.drawText = function(t) { if (window.__drawn.length < 6000) window.__drawn.push(String(t)); return od.apply(this, arguments); }; } 'ok'");
    await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'");
    await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(700);
    await ev("window.__drawn = []; SceneManager._scene.refreshHeader(); SceneManager._scene.refreshDetail(); 'ok'"); await sleep(500);
    const drawn = await json("window.__drawn");
    await ev("SceneManager.pop(); 'ok'"); await ready();
    return drawn;
  };

  rec("M0 前提: 新API(previewGrant / summary / report / previewStarterGrant / cardGenerations)がある", await ev("['previewGrant','summary','report'].every(function(k) { return typeof ProjectRCardInventory[k] === 'function'; }) && ['previewStarterGrant','cardGenerations'].every(function(k) { return typeof ProjectRHermesProductionDeck[k] === 'function'; })"));

  await check("M1-2", async () => {
    await fresh();
    await ev("ProjectRCardInventory.grantCopies('hermes_strength', 2, { source: 'verify' }); 'ok'");
    const before = await snapshot();
    const p = await json("ProjectRHermesProductionDeck.previewStarterGrant()");
    const after = await snapshot();
    const row = p.preview.rows.find(r => r.cardId === "hermes_strength");
    rec("M1 付与プレビュー(実機): 何も変更しない。ストレングス2枚 → 加算で12枚 / 補充で10枚。合計は加算30・補充28。方針は加算のまま", same(before, after) && !p.mutated && p.policyInEffect === "additive" && row.additive.after === 12 && row.topUp.grant === 8 && row.topUp.after === 10 && p.preview.totals.additive === 30 && p.preview.totals.topUp === 28 && p.willGrantOnNextAcquisition === true, { row, totals: p.preview.totals });
    await ev("$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', '', {}] }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'");
    await wait("!$gameMap.isEventRunning()", 6000);
    const granted = await json("({ strength: ProjectRCardInventory.getOwnedCopies('hermes_strength'), issen: ProjectRCardInventory.getOwnedCopies('hermes_issen') })");
    const snap = await snapshot();
    await ev("$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', '', {}] }, { code: 0, indent: 0, parameters: [] }], 0); ProjectRHermesProductionDeck.grantStarter({ explicit: true }); ProjectRCardInventory.grantBundle('hermes.ring.starter', { hermes_issen: 3 }); 'ev'");
    await wait("!$gameMap.isEventRunning()", 6000);
    const p2 = await json("ProjectRHermesProductionDeck.previewStarterGrant()");
    rec("M2 現在の挙動(加算)の実機確認: 事前に2枚あれば初期10枚が加わり12枚。報酬記録があるので再取得・明示付与・同じ報酬IDの付与でも増えない。プレビューも『付与済み』を示す", granted.strength === 12 && granted.issen === 3 && same(snap, await snapshot()) && p2.rewardRecorded && !p2.willGrantOnNextAcquisition, { granted, rewardRecorded: p2.rewardRecorded });
  });

  const legacyPrepare = "(function() { var d = ProjectRCardDeck; d.assignRingToPlayer('hermes'); d.assignRingToPlayer('apollo'); d.setCardOwned('hermes_sword_attack', true); d.setCardLevel('hermes_sword_attack', 2); d.setCardOwned('hermes_swift_movement', true);"
    + " d.setDeck(['hermes_sword_attack', 'hermes_sword_attack', 'hermes_swift_movement', 'hermes_zetsu', 'ghost_card', 'ghost_card']); $gameSystem._projectRCardDeckData.cardOwnership.ghost_card = { owned: true, level: 3 }; delete $gameSystem._projectRHermesProduction; })(); 'ok'";
  let legacyDeck = null;
  await check("M3-6", async () => {
    await useDir(TMP_SAVE);
    await fresh();
    await ev(legacyPrepare);
    await ev("delete $gameSystem._projectRCardInventory; 'ok'");
    await ev("window.__saved = null; $gameSystem.onBeforeSave(); DataManager.saveGame(3).then(function() { window.__saved = 'ok'; }).catch(function(e) { window.__saved = 'ERR ' + e; }); 'started'");
    await wait("window.__saved", 8000);
    const mark = c.events.length;
    await fresh(); await useDir(TMP_SAVE);
    await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
    await ev("SceneManager._scene.executeLoad(3); 'ok'");
    await ready(); await sleep(1500);
    const errs = c.events.slice(mark).filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 300));
    legacyDeck = await json("ProjectRCardDeck.getDeck()");
    const sum = await json("ProjectRCardInventory.summary()");
    rec("M3 旧形式の保存を本物のロードで読む: 4つが区別される(確認済み0 / 推定の最小値=剣・高速移動 / 未知ID=ghost_card / 未解放でデッキにある=絶)。エラー無し・デッキは変わらない",
      (await ev("window.__saved")) === "ok" && errs.length === 0 && sum.fromLegacy && sum.confirmed.length === 0 && same(sum.inferred.sort(), ["hermes_swift_movement", "hermes_sword_attack"]) && same(sum.unknownCardIds, ["ghost_card"]) && same(sum.lockedInDeck, ["hermes_zetsu"])
      && same(legacyDeck, ["hermes_sword_attack", "hermes_sword_attack", "hermes_swift_movement", "hermes_zetsu", "ghost_card", "ghost_card"]), { sum, errs: errs.slice(0, 2) });

    const before = await snapshot();
    const drawn = await drawnOnDeckBuilder();
    const first = sum.lines[0] + "　ほか" + (sum.lines.length - 1) + "件";
    rec("M4 Deck Builder(実Scene)のヘッダー3行目に、推定の最小値と注意の説明が描かれる(先頭=未知ID。『推定の最小値です（実際の過去の所持数ではありません）』も要約に含まれる)", drawn.indexOf(first) >= 0 && sum.lines.join("").indexOf("推定の最小値です（実際の過去の所持数ではありません）") >= 0 && sum.lines.length === 3, { first, found: drawn.indexOf(first) >= 0 });
    const report = await ev("ProjectRCardInventory.report()");
    const after = await snapshot();
    rec("M5 開発者レポートは文字列で読め(カード別・区分・診断)、デッキ画面の開閉とレポート生成で保存内容は変わらない", typeof report === "string" && /source=legacy/.test(report) && /hermes_sword_attack .*owned=2 deck=2 max=3 limit=2 inferred/.test(report) && /ghost_card \(未知のID\)/.test(report) && /RING_WITHOUT_GRANT_RECORD|UNKNOWN_CARD_IN_DECK/.test(report) && same(before, after), { reportHead: String(report).split("\n").slice(0, 6) });
    fs.writeFileSync(`${OUT}/h2cb3_report_sample.txt`, String(report));
    rec("M6 旧セーブの旧カードは削除・置換されず、Levelも保たれる(剣 Lv2 / 高速移動 / 旧デッキの並び)", same(after.deck, legacyDeck) && after.core.cardOwnership.hermes_sword_attack.level === 2 && after.core.cardOwnership.hermes_sword_attack.owned === true, { deck: after.deck.length });
  });

  await check("M7-9", async () => {
    await useDir(TMP_SAVE);
    await fresh();
    await ev("ProjectRHermesProductionDeck.acquireRing('hermes', { source: 'verify' }); 'ok'");
    const drawn = await drawnOnDeckBuilder();
    const sum = await json("ProjectRCardInventory.summary()");
    rec("M7 新しいゲーム: 旧セーブ移行の説明は描かれない(lines空)。付与された7種は確認済み", sum.lines.length === 0 && !sum.fromLegacy && sum.confirmed.length === 7 && !drawn.some(t => /旧セーブから移行|定義の無いカードID|未解放のままデッキ/.test(t)), { confirmed: sum.confirmed.length });
    await fresh();
    await ev("(function() { var d = ProjectRCardDeck; d.assignRingToPlayer('apollo'); ['hermes_swift_movement', 'hermes_reed_flute_sleep', 'hermes_perception_obscure', 'hermes_sword_attack', 'apollo_golden_arrow', 'apollo_plague_attack', 'apollo_lyre_calm'].forEach(function(id) { ProjectRCardInventory.grantCopies(id, d.definitions.card(id).maxCopies, { source: 'legacy' }); d.setCardLevel(id, 2); }); })(); 'ok'");
    const legacyBefore = await json("(function() { var m = {}; ['hermes_swift_movement', 'hermes_reed_flute_sleep', 'hermes_perception_obscure', 'hermes_sword_attack', 'apollo_golden_arrow', 'apollo_plague_attack', 'apollo_lyre_calm'].forEach(function(id) { m[id] = [ProjectRCardInventory.getOwnedCopies(id), ProjectRCardDeck.getPersistentData().cardOwnership[id].level]; }); return m; })()");
    await ev("ProjectRHermesProductionDeck.acquireRing('hermes', { source: 'verify' }); 'ok'");
    const legacyAfter = await json("(function() { var m = {}; ['hermes_swift_movement', 'hermes_reed_flute_sleep', 'hermes_perception_obscure', 'hermes_sword_attack', 'apollo_golden_arrow', 'apollo_plague_attack', 'apollo_lyre_calm'].forEach(function(id) { m[id] = [ProjectRCardInventory.getOwnedCopies(id), ProjectRCardDeck.getPersistentData().cardOwnership[id].level]; }); return m; })()");
    const newCopies = await json("(function() { var m = {}; ['hermes_issen', 'hermes_psychopomp', 'hermes_veil', 'hermes_strength', 'hermes_sweep', 'hermes_reed_flute', 'hermes_zetsu'].forEach(function(id) { m[id] = ProjectRCardInventory.getOwnedCopies(id); }); return m; })()");
    rec("M8 旧カードと新カードの共存(実機): 新Hermesの初回入手は新7枚(3/3/3/10/3/3/5)だけを付与し、旧Hermes4種・Apollo3種の所持とLevelは変わらない", same(legacyBefore, legacyAfter) && same(newCopies, { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 }), { legacyAfter });
    const g = await json("ProjectRHermesProductionDeck.cardGenerations()");
    rec("M9 旧カード/新カードの監査: 新7・旧7・その他0、表示名の完全な重複なし、紛らわしい対応が3組(旧→新)。旧カードの定義は残る", g.cards.filter(x => x.generation === "new").length === 7 && g.cards.filter(x => x.generation === "legacy").length === 7 && g.cards.filter(x => x.generation === "other").length === 0 && g.duplicateNames.length === 0 && g.confusablePairs.length === 3, { pairs: g.confusablePairs.map(p => `${p.legacyName}→${p.newName}${p.nameOverlap ? "(名前が部分一致)" : ""}`) });
  });

  const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("MZ 押されたままのキーがない・Consoleのエラーなし", stuck.length === 0 && s.errors().length === 0, { stuck, errors: s.errors().slice(0, 3) });
  fs.writeFileSync(`${OUT}/h2cb3_results.json`, JSON.stringify({ note: "旧形式の保存は一時フォルダにだけ書いた。入力はCDPでは送っていない(状態の準備と観測のみ)", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
