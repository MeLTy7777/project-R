// Phase Apollo-A2: 実機(Playtest)の確認 — 複数の神対応のカードカタログ。Apollo 8枚の予約IDは本番で使えず、旧Apollo 3枚・Hermes 7枚・Deck Builder・混成デッキ・セーブ往復は従来どおり。
// 使い方: MZ_OUT=<出力> MZ_TMP_SAVE=<一時のsaveフォルダ> node tools/mz_cdp/apollo_a2_verify.cjs
//   新しいゲームはメモリ上に作る。保存は MZ_TMP_SAVE(一時フォルダ)だけに書き、本物のScene_Save/Load経路で往復する。本物のsave/ には書かない。入力はCDP(人間の手動確認ではない)。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const norm = p => String(p || "").replace(/\\/g, "/").replace(/\/?$/, "/");
const TMP_SAVE = norm(process.env.MZ_TMP_SAVE);
const RESERVED = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const LEGACY = ["apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];
// 黄金の矢(apollo_golden_volley)はPhase A4で実装・登録済み。残りの7枚が引き続き予約(未登録)。
const INACTIVE = RESERVED.filter(id => id !== "apollo_golden_volley" && id !== "apollo_eros_arrow"); // A4・A6Aで実装済みの2枚を除く
const COPIES = [5, 5, 2, 3, 3, 5, 3, 4];
(async () => {
  if (!process.env.MZ_TMP_SAVE) throw new Error("MZ_TMP_SAVE(一時のsaveフォルダ)を指定してください");
  fs.mkdirSync(TMP_SAVE, { recursive: true });
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 500)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(400); };
  const fresh = async () => { await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1); };
  const useDir = dir => ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(dir)}; }; 'ok'`);
  // 予約カードの定義を、この実機セッションのメモリ上だけでレジストリへ入れる(混成デッキ・上限の確認用。本番では登録されない)
  const registerPlanned = () => ev("(function() { ProjectRCardCatalog.plannedRuntimeCards('apollo').forEach(function(d) { ProjectRCardDeck.definitions.cards.set(d.cardId, Object.freeze(Object.assign({}, d))); }); return ProjectRCardCatalog.inactiveRuntimeCards().length; })()");

  console.log("chromium", await ev("process.versions.chromium + ' / nw ' + process.versions.nw"));
  await wait("typeof DataManager !== 'undefined' && !!SceneManager._scene && DataManager.isDatabaseLoaded()", 30000);
  await ev("DataManager._globalInfo = DataManager._globalInfo || []; DataManager.setupNewGame(); SceneManager.goto(Scene_Map); 'ok'");
  await ready();
  await ev("ProjectRCombatTestArena.enter(); 'ok'");
  await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);

  await check("A1 カタログ: 15設計(Hermes 7 + Apollo 8)・Apolloの予約ID・最大コピー合計30・コピー上限(5/5/2/3/3/5/3/4)", async () => {
    const v = await json("({ n: ProjectRCardCatalog.designs().length, gods: ProjectRCardCatalog.gods(), ids: ProjectRCardCatalog.godDesign('apollo').map(function(d) { return d.runtimeCardId; }), copies: ProjectRCardCatalog.godDesign('apollo').map(function(d) { return d.maxCopies; }), total: ProjectRCardCatalog.godTotalMaxCopies('apollo'), status: ProjectRCardCatalog.godStatus('apollo'), hermes: ProjectRCardCatalog.godTotalMaxCopies('hermes'), ready: [ProjectRCardCatalog.isGodDeckReady('hermes'), ProjectRCardCatalog.isGodDeckReady('apollo')], deck: ProjectRCardCatalog.buildGodDeck('apollo') })");
    rec("A1 catalog", v.n === 15 && JSON.stringify(v.gods) === '["hermes","apollo"]' && JSON.stringify(v.ids) === JSON.stringify(RESERVED) && JSON.stringify(v.copies) === JSON.stringify(COPIES) && v.total === 30 && v.hermes === 30
      && v.status.reserved === 6 && v.status.implemented === 2 && v.ready[0] === true && v.ready[1] === false && v.deck === null, JSON.stringify(v).slice(0, 300));
  });

  await check("A2 衝突なし・未登録: runtimeIdAuditが問題0件、予約8枚はレジストリに無く、旧Apollo 3枚とHermes 7枚は従来どおり登録されている", async () => {
    const v = await json("({ audit: ProjectRCardCatalog.runtimeIdAudit(), inactive: ProjectRCardCatalog.inactiveRuntimeCards(), registry: ProjectRCardDeck.definitions.cardDefinitions().map(function(c) { return c.cardId; }), registered: ProjectRCardCatalog.registeredRuntimeCards() })");
    rec("A2 audit", v.audit.problems.length === 0 && v.inactive.length === 6 && JSON.stringify(v.inactive) === JSON.stringify(INACTIVE) && INACTIVE.every(id => v.registry.indexOf(id) < 0) && v.registry.indexOf("apollo_golden_volley") >= 0 && LEGACY.every(id => v.registry.indexOf(id) >= 0)
      && v.registry.indexOf("apollo_eros_arrow") >= 0 && v.registry.length === 16 && v.registered.length === 9, JSON.stringify({ problems: v.audit.problems, registry: v.registry.length, registered: v.registered.length }));
  });

  await check("A3 本番で使えない: 予約カードは解放・付与(API/プラグインコマンド)できず、デッキにも入らない。Hermesの指輪の初期付与は30枚のままApolloを含まない", async () => {
    await fresh();
    const v = await json(`(function() { var out = { own: [], grant: [] }; ${JSON.stringify(INACTIVE)}.forEach(function(id) { out.own.push(ProjectRCardDeck.setCardOwned(id, true).ok); out.grant.push(ProjectRCardInventory.grantCopies(id, 1, { source: 't' }).ok); });
      var cmd = function(p, n, a) { PluginManager.callCommand(new Game_Interpreter(), p, n, a); };
      cmd('ProjectR_CardInventory', 'GrantCardCopies', { cardId: 'apollo_oracle', copies: '2', rewardId: '' }); cmd('ProjectR_MenuIntegration', 'GrantCard', { cardId: 'apollo_oracle' });
      out.oracle = ProjectRCardInventory.getOwnedCopies('apollo_oracle'); out.oracleOwned = ProjectRCardDeck.isCardOwned('apollo_oracle');
      out.deckReasons = ProjectRCardDeck.getDeckInvalidReasons(${JSON.stringify(INACTIVE)}).map(function(r) { return r.code; }).filter(function(x, i, a) { return a.indexOf(x) === i; });
      ProjectRCardDeck.assignRingToPlayer('apollo'); out.afterRing = ${JSON.stringify(INACTIVE)}.some(function(id) { return ProjectRCardDeck.isCardOwned(id); }); return out; })()`);
    await fresh();
    const hermes = await json(`(function() { var r = ProjectRHermesProductionDeck.acquireRing('hermes', { source: 'a2' }); var ids = ProjectRCardDeck.definitions.cardDefinitions().map(function(c) { return c.cardId; });
      return { ok: r.ok, total: ProjectRCardCatalog.hermesDesign().reduce(function(s, d) { return s + ProjectRCardInventory.getOwnedCopies(d.runtimeCardId); }, 0), apollo: ids.filter(function(id) { return /^apollo_/.test(id) && ProjectRCardInventory.getOwnedCopies(id) > 0; }), deck: ProjectRCardDeck.getDeck().length }; })()`);
    rec("A3 inactive", v.own.every(x => x === false) && v.grant.every(x => x === false) && v.oracle === 0 && v.oracleOwned === false && v.deckReasons.indexOf("INVALID_CARD_ID") >= 0 && v.afterRing === false
      && hermes.total === 30 && hermes.apollo.length === 0 && hermes.deck === 30, JSON.stringify({ v, hermes }).slice(0, 400));
  });

  await check("A4 Deck Builder(本物の画面): 旧Apollo 3枚を所持すると出るが、予約カードは出ない。Apolloの絞り込みには旧3枚だけ", async () => {
    await fresh();
    await ev(`ProjectRCardDeck.assignRingToPlayer('apollo'); ${JSON.stringify(LEGACY)}.forEach(function(id) { ProjectRCardInventory.grantCopies(id, 1, { source: 'a2' }); }); 'own'`);
    await ev("ProjectRMenuIntegration.openDeckBuilder(); 'open'");
    await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(700);
    const v = await json("(function() { var ids = ProjectRMenuCore.deck.collection({}).map(function(c) { return c.cardId; }); return { scene: SceneManager._scene.constructor.name, apollo: ids.filter(function(id) { return /^apollo_/.test(id); }), total: ids.length }; })()");
    await s.shot("apollo_a2_deckbuilder");
    await ev("SceneManager.pop(); 'pop'"); await ready();
    rec("A4 deck builder", v.scene === "Scene_ProjectRDeckBuilder" && JSON.stringify(v.apollo.sort()) === JSON.stringify(LEGACY.slice().sort()) && INACTIVE.every(id => v.apollo.indexOf(id) < 0), JSON.stringify(v));
  });

  await check("A5 混成デッキ(予約定義を実機のメモリ上だけで登録): Hermes + Apollo の30枚が有効。Apolloの指輪を外すとApolloのカード15枚だけが指輪不足。コピー上限は5/5/2/3/3/5/3/4", async () => {
    await fresh();
    const n = await registerPlanned();
    const v = await json(`(function() { var D = ProjectRCardDeck, I = ProjectRCardInventory; D.assignRingToPlayer('hermes'); D.assignRingToPlayer('apollo');
      var cards = ['hermes_zetsu','hermes_strength','apollo_golden_volley','apollo_eros_arrow','apollo_gigas_slayer'];
      cards.forEach(function(id) { I.grantCopies(id, 12, { source: 'a2' }); });
      function rep(id, n) { var a = []; for (var i = 0; i < n; i++) a.push(id); return a; }
      var mixed = [].concat(rep('hermes_zetsu', 5), rep('hermes_strength', 10), rep('apollo_golden_volley', 5), rep('apollo_eros_arrow', 5), rep('apollo_gigas_slayer', 5));
      var out = { n: ${n}, size: mixed.length, valid: D.getDeckInvalidReasons(mixed).length, set: D.setDeck(mixed).ok };
      D.setRingUnowned('apollo'); var r = D.getDeckInvalidReasons(mixed).filter(function(x) { return x.code === 'REQUIRED_RING_NOT_OWNED'; }); out.ringMissing = r.length; out.kept = D.getDeck().length; out.ringIds = r.map(function(x) { return x.ringId; }).filter(function(x, i, a) { return a.indexOf(x) === i; });
      D.assignRingToPlayer('apollo'); out.restored = D.getDeckInvalidReasons(mixed).length;
      out.limits = ${JSON.stringify(RESERVED)}.map(function(id) { return D.definitions.card(id).maxCopies; });
      out.over = D.getDeckInvalidReasons(rep('apollo_golden_volley', 6)).some(function(x) { return x.code === 'MAX_COPIES_EXCEEDED'; });
      return out; })()`);
    rec("A5 mixed", v.n === 0 && v.size === 30 && v.valid === 0 && v.set === true && v.ringMissing === 15 && v.kept === 30 && JSON.stringify(v.ringIds) === '["apollo"]' && v.restored === 0
      && JSON.stringify(v.limits) === JSON.stringify(COPIES) && v.over === true, JSON.stringify(v));
  });

  await check("A6 セーブ往復(実Scene_Save/Load・一時フォルダ): 混成デッキ・所持・Levelが保たれる。予約定義を登録しない状態で読み込んでも、保存デッキの新IDは書き換わらない", async () => {
    await fresh();
    await registerPlanned();
    await useDir(TMP_SAVE);
    await ev(`(function() { var D = ProjectRCardDeck, I = ProjectRCardInventory; D.assignRingToPlayer('hermes'); D.assignRingToPlayer('apollo');
      ['hermes_zetsu','hermes_strength','apollo_golden_volley','apollo_eros_arrow','apollo_gigas_slayer'].forEach(function(id) { I.grantCopies(id, 12, { source: 'a2' }); });
      function rep(id, n) { var a = []; for (var i = 0; i < n; i++) a.push(id); return a; }
      D.setDeck([].concat(rep('hermes_zetsu', 5), rep('hermes_strength', 10), rep('apollo_golden_volley', 5), rep('apollo_eros_arrow', 5), rep('apollo_gigas_slayer', 5))); D.setCardLevel('apollo_eros_arrow', 3); return 'set'; })()`);
    const snap = () => json("({ deck: ProjectRCardDeck.getDeck(), copies: ['apollo_golden_volley','apollo_eros_arrow','hermes_zetsu'].map(function(id) { return ProjectRCardInventory.getOwnedCopies(id); }), level: ProjectRCardDeck.getPersistentData().cardOwnership.apollo_eros_arrow })");
    const before = await snap();
    // 実際の保存(Scene_Save経路と同じ DataManager.saveGame)→ 新しいゲーム → 実際の読み込み(Scene_Load経路)
    const saved = await ev("DataManager.saveGame(1).then(function() { return 'saved'; }, function(e) { return 'ERR ' + e; })");
    await ev("ProjectRProductionTest.freshGame(); 'fresh'"); await ready();
    await ev("window.__loadResult = 'pending'; DataManager.loadGame(1).then(function() { window.__loadResult = 'loaded'; }, function(e) { window.__loadResult = 'ERR ' + e; }); 'req'");
    await wait("window.__loadResult !== 'pending'", 8000);
    const loadResult = await ev("window.__loadResult");
    await ev("Scene_Load.prototype.reloadMapIfUpdated.call(null); SceneManager.goto(Scene_Map); 'go'"); await ready();
    const after = await snap();
    // 予約定義が登録されていない状態の読み込み = いまの本番: 登録を取り除いてから、もう一度読み込む
    await ev(`${JSON.stringify(INACTIVE)}.forEach(function(id) { ProjectRCardDeck.definitions.cards.delete(id); }); 'unregister'`);
    await ev("window.__loadResult = 'pending'; DataManager.loadGame(1).then(function() { window.__loadResult = 'loaded'; }, function(e) { window.__loadResult = 'ERR ' + e; }); 'req'");
    await wait("window.__loadResult !== 'pending'", 8000);
    await ev("Scene_Load.prototype.reloadMapIfUpdated.call(null); SceneManager.goto(Scene_Map); 'go'"); await ready();
    const noDefs = await json("({ deck: ProjectRCardDeck.getDeck(), reasons: ProjectRCardDeck.getDeckInvalidReasons().map(function(r) { return r.code; }).filter(function(x, i, a) { return a.indexOf(x) === i; }) })");
    rec("A6 save roundtrip", saved === "saved" && loadResult === "loaded" && JSON.stringify(before) === JSON.stringify(after) && JSON.stringify(noDefs.deck) === JSON.stringify(before.deck) && noDefs.reasons.indexOf("INVALID_CARD_ID") >= 0,
      JSON.stringify({ saved, loadResult, same: JSON.stringify(before) === JSON.stringify(after), deckSame: JSON.stringify(noDefs.deck) === JSON.stringify(before.deck), reasons: noDefs.reasons }));
  });

  await check("A7 旧Apolloは不変: 旧3枚の定義(最大/Cooldown/対象)・State/Skill/Prefabのデータが変わっていない", async () => {
    const v = await json(`({ defs: ${JSON.stringify(LEGACY)}.map(function(id) { var d = ProjectRCardDeck.definitions.card(id); return [d.maxCopies, d.cooldownSeconds, d.targetType]; }),
      skills: [236, 238, 239].map(function(i) { return $dataSkills[i].name + ':' + $dataSkills[i].damage.formula; }), states: [33, 34].map(function(i) { return $dataStates[i].name; }) })`);
    rec("A7 legacy", JSON.stringify(v.defs) === JSON.stringify([[3, 4, "direction"], [2, 12, "direction"], [3, 10, "ally"]]) && v.skills[0].indexOf("黄金の弓矢") === 0 && v.states[0] === "病" && v.states[1] === "精神安定", JSON.stringify(v));
  });

  const errs = await s.errors();
  rec("Z コンソールエラーなし", errs.length === 0, errs.slice(0, 3).join(" | ").slice(0, 400));
  const failed = s.results.filter(r => !r.ok);
  fs.writeFileSync(`${OUT}/apollo_a2_verify.json`, JSON.stringify({ total: s.results.length, failed: failed.length, results: s.results }, null, 1));
  console.log(`DONE total=${s.results.length} failed=${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error("FATAL", e); process.exit(2); });
