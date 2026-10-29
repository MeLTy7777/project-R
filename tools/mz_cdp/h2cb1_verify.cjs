// Phase H2C-B1: 実機(Playtest)の確認 — 所持モデルの現状と、既存セーブのロード(保護コピー・読み取りのみ)。
// 使い方: MZ_OUT=<出力フォルダ> MZ_SAVE_COPY=<保護コピーのsaveフォルダ> node tools/mz_cdp/h2cb1_verify.cjs
//   セーブの読み込みは StorageManager を保護コピーへ向けて行い、書き込み(saveObject)は例外で拒否する。本物のsave/には触れない。
//   入力はCDPでは送らない(状態の観測と準備だけ)。Escの実キー確認は h2cb1_esc.cjs(OSレベル入力)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const SAVE_COPY = (process.env.MZ_SAVE_COPY || "").replace(/\\/g, "/").replace(/\/?$/, "/");
(async () => {
  if (!process.env.MZ_SAVE_COPY) throw new Error("MZ_SAVE_COPY(保護コピーのsaveフォルダ)を指定してください");
  const s = await session(); const { ev, rec, sleep, c } = s;
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800); };
  const STARTER = ["hermes_issen", "hermes_psychopomp", "hermes_veil", "hermes_strength", "hermes_sweep", "hermes_reed_flute", "hermes_zetsu"];

  rec("B0 前提: SaveLoadGuardが読み込まれ、Playtestで動いている", await ev("typeof ProjectRSaveLoadGuard === 'object' && typeof ProjectRProductionTest === 'object' && Utils.isOptionValid('test')"), await ev("typeof ProjectRSaveLoadGuard"));

  // ---- 所持モデルの現状 ----
  await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1);
  await ev("$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ['ProjectR_HermesProductionDeck', 'AcquireHermesRing', '', {}] }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'");
  await wait("!$gameMap.isEventRunning()", 6000);
  const own = await json(`(function(ids) { var data = ProjectRCardDeck.getPersistentData(); var keys = {}; ids.forEach(function(id) { keys[id] = Object.keys(data.cardOwnership[id]).sort().join(','); });
    return { keys: keys, deck: data.deckDefinition.cardIds.length, valid: ProjectRCardDeck.isDeckValid(), topKeys: Object.keys(data).sort().join(','), version: data.version }; })(${JSON.stringify(STARTER)})`);
  rec("O1 所持データは種類ごとの {level, owned} だけ(コピー数のフィールドが無い)。入手イベントで7種が所持・デッキ30枚で有効", STARTER.every(id => own.keys[id] === "level,owned") && own.deck === 30 && own.valid && own.version === 1, own);

  const copies = await json(`(function() { var core = ProjectRMenuCore; core.deck.clear(); var results = []; for (var i = 0; i < 12; i++) { var r = core.deck.add('hermes_strength'); results.push(r.ok ? 'ok' : r.reason); }
    var owned = ProjectRCardDeck.getPersistentData().cardOwnership.hermes_strength; var entry = core.deck.collection().filter(function(e) { return e.cardId === 'hermes_strength'; })[0];
    return { results: results, owned: owned, copiesInDeck: entry && entry.copiesInDeck, maxCopies: entry && entry.maxCopies, ownedCopies: entry && entry.info.ownedCopies }; })()`);
  rec("O2 ストレングス: 所持の登録は1つ(owned:true)だが、デッキには上限の10枚まで入り、11枚目は拒否(MAX_COPIES_EXCEEDED)。所持コピー数という概念は無い", copies.results.slice(0, 10).every(r => r === "ok") && copies.results[10] === "MAX_COPIES_EXCEEDED" && copies.copiesInDeck === 10 && copies.maxCopies === 10 && copies.owned.owned === true && !("copies" in copies.owned), copies);
  // 30枚へ戻す(以降の確認のため)
  await ev("ProjectRMenuCore.deck.clear(); ProjectRCardDeck.setDeck(ProjectRCardCatalog.buildFinalHermesDeck()); 'ok'");

  const unown = await json(`(function() { var d = ProjectRCardDeck; var before = d.getDeck().length; d.setCardOwned('hermes_strength', false); var after = d.getDeck().length;
    var reasons = d.getDeckInvalidReasons().filter(function(r) { return r.code === 'CARD_NOT_OWNED'; }).length; var valid = d.isDeckValid(); d.setCardOwned('hermes_strength', true);
    return { before: before, after: after, notOwnedReasons: reasons, validWhileUnowned: valid, validAfterRestore: d.isDeckValid(), deckAfterRestore: d.getDeck().length }; })()`);
  rec("O3 所持を外してもデッキは削除・置換されず(30枚のまま)、無効になるだけ。所持を戻すと有効に戻る", unown.before === 30 && unown.after === 30 && unown.notOwnedReasons === 10 && unown.validWhileUnowned === false && unown.validAfterRestore === true && unown.deckAfterRestore === 30, unown);

  const grant = await json(`(function() { var d = ProjectRCardDeck; d.setCardLevel('hermes_strength', 2);
    ProjectRMenuIntegration.commands.GrantCard({ cardId: 'hermes_strength', level: '0' }); ProjectRMenuIntegration.commands.GrantCard({ cardId: 'hermes_strength' });
    var after = d.getPersistentData().cardOwnership.hermes_strength; d.setCardLevel('hermes_strength', 1); return after; })()`);
  rec("O4 GrantCardを(Level指定なしで)繰り返してもLevelは下がらない。重複して入手しても「枚数」は増えない(種類のフラグ)", grant.level === 2 && grant.owned === true, grant);

  const drop = await json(`(function() { var d = ProjectRCardDeck; $gameSystem._projectRCardDeckData.cardOwnership.hermes_strength.copies = 3; $gameSystem._projectRCardDeckData.futureField = 1; var data = d.getPersistentData();
    return { copies: 'copies' in data.cardOwnership.hermes_strength, future: 'futureField' in data, raw: 'copies' in $gameSystem._projectRCardDeckData.cardOwnership.hermes_strength }; })()`);
  rec("O5 Coreは毎回データを正規化し、未知のフィールド(copiesなど)を捨てる → 所持コピー数をCoreのcardOwnershipへ足してはいけない(別の保存領域が必要)", drop.copies === false && drop.future === false && drop.raw === false, drop);

  // ---- 既存セーブのロード(保護コピー・読み取りのみ・本物のScene_Load経路) ----
  await ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(SAVE_COPY)}; }; StorageManager.saveObject = function() { throw new Error('WRITE BLOCKED (H2C-B1)'); }; 'ok'`);
  const snapshot = () => json(`(function() { var d = ProjectRCardDeck, data = d.getPersistentData(); var hp = $gameSystem._projectRHermesProduction; return { rings: data.ringOwnershipState, owned: Object.keys(data.cardOwnership).filter(function(id) { return data.cardOwnership[id].owned; }).sort(), levels: Object.keys(data.cardOwnership).sort().map(function(id) { return id + ':' + data.cardOwnership[id].level; }), deck: data.deckDefinition.cardIds.slice().sort(), production: hp ? { granted: !!(hp.rings && hp.rings.hermes && hp.rings.hermes.granted) } : null }; })()`);
  const sameSnap = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const slot of [1, 2]) {
    await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1);
    const mark = c.events.length;
    await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
    await ev(`SceneManager._scene.executeLoad(${slot}); 'ok'`);
    await wait("SceneManager._scene instanceof Scene_Map && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(2500);
    const a = await snapshot();
    const f0 = await ev("window.__sf || 0"); await sleep(1200); const f1 = await ev("window.__sf || 0");
    // マップ → ProjectRの画面(デッキ構築)を直接開いて閉じる → もう一度スナップショット(画面遷移・メニューで所持やデッキが書き換わらない)
    await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'"); await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(800);
    await ev("SceneManager.pop(); 'ok'"); await ready();
    const b = await snapshot();
    const errs = c.events.slice(mark).filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 300));
    const info = await json("({ scene: SceneManager._scene.constructor.name, mapId: $gameMap.mapId(), purged: ProjectRSaveLoadGuard.lastPurged(), stale: ProjectRSaveLoadGuard.staleEvents(), setOk: $gameMap._allowRegions instanceof Set })");
    rec(`L${slot} 保護コピーのslot${slot}を本物のロード画面経路で読み込み: エラー無し・ゲームループが動く・マップに入る(古い生成イベントはメモリ上で外す: ${JSON.stringify(info.purged)})`, errs.length === 0 && f1 > f0 && info.scene === "Scene_Map" && info.stale.length === 0 && info.setOk, { errs, frames: [f0, f1], info });
    rec(`L${slot}b 既存セーブは勝手に移行されない: 読込直後と、デッキ画面を開閉した後で 指輪・所持・Level・デッキ が完全に同じ。新Hermesの一括付与の記録も作られない`, sameSnap(a, b) && (a.production === null || a.production.granted === false) && !a.owned.some(id => STARTER.indexOf(id) >= 0), { rings: a.rings, ownedCount: a.owned.length, deck: a.deck.length, production: a.production });
  }
  const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("BZ 押されたままのキーがない・Consoleのエラーなし", stuck.length === 0 && s.errors().length === 0, { stuck, errors: s.errors().slice(0, 3) });
  fs.writeFileSync(`${OUT}/h2cb1_results.json`, JSON.stringify({ note: "ロードは保護コピー(読み取りのみ)。入力はCDPでは送っていない", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
