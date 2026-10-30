// Phase H2C-B4: 実機(Playtest)の確認 — Hermes指輪の初期セット付与が「補充(top-up)」になったこと。
//   付与枚数 = max(0, 目標 - 今の所持)。目標 3/3/3/10/3/3/5。入手はイベントのプラグインコマンド(AcquireHermesRing)で行う。
// 使い方: MZ_OUT=<出力> MZ_TMP_SAVE=<一時のsaveフォルダ> node tools/mz_cdp/h2cb4_verify.cjs
//   新しいゲームはメモリ上(ProjectRProductionTest.freshGame)に作る。セーブ/ロードは MZ_TMP_SAVE(一時フォルダ)だけに書き、本物のScene_Load経路で読む。
//   本物のsave/には触れない。戦闘中のカード使用(Q/E)だけ実キー(CDPのInput.dispatchKeyEvent)。人間の手動確認ではない。
const fs = require("fs");
const { session } = require("./lib.cjs");
const OUT = process.env.MZ_OUT || "mz_out";
const norm = p => String(p || "").replace(/\\/g, "/").replace(/\/?$/, "/");
const TMP_SAVE = norm(process.env.MZ_TMP_SAVE);
const TARGET = { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 };
const IDS = Object.keys(TARGET);
const sortKeys = o => { if (Array.isArray(o)) return o.map(sortKeys); if (o && typeof o === "object") { const r = {}; for (const k of Object.keys(o).sort()) r[k] = sortKeys(o[k]); return r; } return o; };
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const expectedAfter = pre => { const m = {}; IDS.forEach(id => { m[id] = Math.max(TARGET[id], pre[id] || 0); }); return m; };
const expectedGrant = pre => { const m = {}; IDS.forEach(id => { m[id] = Math.max(0, TARGET[id] - (pre[id] || 0)); }); return m; };
(async () => {
  if (!process.env.MZ_TMP_SAVE) throw new Error("MZ_TMP_SAVE(一時のsaveフォルダ)を指定してください");
  const s = await session(); const { ev, c, rec, sleep } = s;
  const check = async (id, fn) => { try { await fn(); } catch (e) { rec(id + " (script error)", false, String(e.stack || e.message).slice(0, 600)); } };
  const json = expr => ev(`JSON.stringify(${expr}) || 'null'`).then(JSON.parse);
  const wait = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(cond)) return true; await sleep(25); } return false; };
  const ready = async () => { await wait("SceneManager._scene instanceof Scene_Map && SceneManager._scene._spriteset && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(800); };
  const fresh = async () => { await ev("ProjectRProductionTest.freshGame(); 'ok'"); await ready(); await s.slow(1); };
  const useDir = dir => ev(`StorageManager.fileDirectoryPath = function() { return ${JSON.stringify(dir)}; }; 'ok'`);
  const copies = () => json("(function() { var m = {}; " + JSON.stringify(IDS) + ".forEach(function(id) { m[id] = ProjectRCardInventory.getOwnedCopies(id); }); return m; })()");
  const snapshot = () => json("({ inv: ProjectRCardInventory.state(), core: ProjectRCardDeck.getPersistentData(), prod: ProjectRHermesProductionDeck.state(), deck: ProjectRCardDeck.getDeck() })");
  const runEvent = async command => {
    await ev(`$gameMap._interpreter.setup([{ code: 357, indent: 0, parameters: ${JSON.stringify(command)} }, { code: 0, indent: 0, parameters: [] }], 0); 'ev'`);
    await wait("!$gameMap.isEventRunning()", 6000);
  };
  const acquire = () => runEvent(["ProjectR_HermesProductionDeck", "AcquireHermesRing", "", {}]);
  const grantRing = () => runEvent(["ProjectR_MenuIntegration", "GrantRing", "", { ringId: "hermes" }]);
  const pre = counts => ev("(function(c) { Object.keys(c).forEach(function(id) { if (c[id] > 0) ProjectRCardInventory.grantCopies(id, c[id], { source: 'verify-earlier' }); }); })(" + JSON.stringify(counts) + "); 'ok'");
  const saveTo = async slot => {
    await ev("window.__saved = null; $gameSystem.onBeforeSave(); DataManager.saveGame(" + slot + ").then(function() { window.__saved = 'ok'; }).catch(function(e) { window.__saved = 'ERR ' + e; }); 'started'");
    await wait("window.__saved", 8000);
    return ev("window.__saved");
  };
  const loadFrom = async slot => {
    await ev("SceneManager.goto(Scene_Load); 'ok'"); await sleep(1500);
    await ev("SceneManager._scene.executeLoad(" + slot + "); 'ok'");
    await ready(); await sleep(1500);
  };

  rec("T0 前提: Playtestで動いている・補充の新API(previewStarterGrant の grants / grantBundle の mode)がある", await ev("Utils.isOptionValid('test') && typeof ProjectRProductionTest === 'object' && ProjectRHermesProductionDeck.previewStarterGrant().policyInEffect === 'topUp' && ProjectRCardInventory.grantBundle('x.probe', {}, { mode: 'topUp' }).reason === 'EMPTY_BUNDLE'"));

  await check("T1", async () => {
    await useDir(TMP_SAVE);
    const cases = [[0, 10, 10], [2, 8, 10], [8, 2, 10], [10, 0, 10], [12, 0, 12]];
    const rows = [];
    for (const [have, grant, total] of cases) {
      await fresh();
      if (have) await pre({ hermes_strength: have });
      await acquire();
      const got = await json("({ n: ProjectRCardInventory.getOwnedCopies('hermes_strength'), rec: ProjectRCardInventory.state().rewards['hermes.ring.starter'], prod: ProjectRHermesProductionDeck.state().rings.hermes })");
      rows.push({ have, grant: got.prod.cards.hermes_strength, total: got.n, mode: got.rec.mode, expectGrant: grant, expectTotal: total });
    }
    rec("T1 ストレングス 0/2/8/10/12枚(実機・イベントのプラグインコマンド): 付与 10/8/2/0/0枚 → 合計 10/10/10/10/12枚。減らさない・目標以上は増やさない", rows.every(r => r.grant === r.expectGrant && r.total === r.expectTotal && r.mode === "topUp"), rows);
  });

  await check("T2", async () => {
    const have = { hermes_issen: 1, hermes_psychopomp: 3, hermes_strength: 6, hermes_sweep: 5, hermes_reed_flute: 2 };
    await fresh(); await pre(have);
    const preview = await json("ProjectRHermesProductionDeck.previewStarterGrant()");
    await acquire();
    const after = await copies();
    const granted = await json("ProjectRHermesProductionDeck.state().rings.hermes.cards");
    const d = await json("({ n: ProjectRCardDeck.getDeck().length, valid: ProjectRCardDeck.isDeckValid(), sweepLimit: ProjectRCardInventory.getDeckLimit('hermes_sweep') })");
    rec("T2 一部だけ持っている混在(一閃1・サイコ3・ストレングス6・薙ぎ払い5・葦笛2): 付与は不足分だけ(2/0/3/4/0/1/5)、薙ぎ払い5枚は減らず、デッキに入る上限は3のまま。デッキ30枚・有効",
      same(granted, expectedGrant(have)) && same(after, expectedAfter(have)) && same(preview.grants, expectedGrant(have)) && d.n === 30 && d.valid && d.sweepLimit === 3, { granted, after, previewGrants: preview.grants, d });
  });

  await check("T3", async () => {
    const over = { hermes_issen: 6, hermes_psychopomp: 4, hermes_veil: 9, hermes_strength: 15, hermes_sweep: 3, hermes_reed_flute: 8, hermes_zetsu: 7 };
    await fresh(); await pre(over); const before = await copies();
    await acquire();
    const afterOver = await copies();
    const recOver = await json("ProjectRCardInventory.state().rewards['hermes.ring.starter']");
    rec("T3a 目標をすべて上回る所持: 何も付与されず枚数は不変。報酬記録(付与0枚)だけが残る", same(afterOver, before) && same(afterOver, expectedAfter(over)) && recOver && recOver.total === 0 && same(recOver.cards, {}), { before, afterOver, recOver });
    await fresh(); await pre(TARGET);
    await acquire();
    const exact = await copies();
    const d = await json("({ n: ProjectRCardDeck.getDeck().length, valid: ProjectRCardDeck.isDeckValid(), prod: ProjectRHermesProductionDeck.state().rings.hermes })");
    rec("T3b 7種すべて目標ちょうど: 付与0枚・枚数不変。空のデッキは従来どおり30枚で初期化", same(exact, TARGET) && d.prod.totalCopies === 0 && d.n === 30 && d.valid && d.prod.deckInitialized === true, { exact, d: { n: d.n, valid: d.valid, total: d.prod.totalCopies } });
  });

  await check("T4", async () => {
    await fresh(); await pre({ hermes_issen: 1, hermes_strength: 8, hermes_zetsu: 7 });
    const before = await snapshot();
    const p = await json("ProjectRHermesProductionDeck.previewStarterGrant()");
    const afterPreview = await snapshot();
    await acquire();
    const actual = await json("ProjectRHermesProductionDeck.state().rings.hermes.cards");
    const after = await copies();
    const p2 = await json("ProjectRHermesProductionDeck.previewStarterGrant()");
    rec("T4 プレビュー: 実機でも何も変更せず(所持・Core・付与記録・デッキ)、実際の付与枚数・付与後の所持と完全に一致する。付与後は『付与済み』を示す",
      same(before, afterPreview) && p.mutated === false && p.policyInEffect === "topUp" && same(p.grants, actual) && p.preview.rows.every(r => after[r.cardId] === r.after) && p.willGrantOnNextAcquisition === true && p2.rewardRecorded === true && p2.willGrantOnNextAcquisition === false, { grants: p.grants, actual });
  });

  await check("T5", async () => {
    await useDir(TMP_SAVE);
    await fresh(); await pre({ hermes_strength: 2 });
    await acquire();
    await ev("ProjectRCardDeck.setCardLevel('hermes_zetsu', 3); 'ok'");
    const before = await snapshot();
    const saved = await saveTo(1);
    await fresh(); await useDir(TMP_SAVE);
    for (let i = 0; i < 2; i++) await loadFrom(1);
    await acquire(); await grantRing();
    const dup = await json("ProjectRHermesProductionDeck.acquireRing('hermes')");
    const exp = await json("ProjectRHermesProductionDeck.grantStarter({ explicit: true })");
    await ev("(function() { var o = ProjectRCardDeck.definitions.ring('hermes'); ProjectRCardDeck.definitions.rings.set('hermes', Object.freeze(Object.assign({}, o, { equipActorIds: Object.freeze([4]) }))); })(); 'ok'");
    const moved = await json("(function() { var a = ProjectRMenuCore.rings.transferToActor('hermes', 4).ok; var b = ProjectRMenuCore.rings.returnToPlayer('hermes').ok; return [a, b]; })()");
    await acquire();
    const after = await snapshot();
    rec("T5 実際のセーブ(一時フォルダ)→新しいゲーム→本物のロード2回→再入手(2種のコマンド+API+明示付与)→指輪の譲渡と返却: 所持10枚・付与記録・デッキ・Levelは同一で、重複付与されない",
      saved === "ok" && same(after, before) && dup.reason === "alreadyOwned" && exp.reason === "alreadyGranted" && moved[0] && moved[1], { saved, dup: dup.reason, exp: exp.reason, moved, strength: after.inv.copies.hermes_strength });
  });

  await check("T6", async () => {
    await fresh();
    await pre({ hermes_issen: 1 });
    await ev("ProjectRCardDeck.setCardLevel('hermes_issen', 2); ProjectRCardDeck.setDeck(['hermes_issen', 'hermes_issen']); 'ok'");
    const deckBefore = await json("ProjectRCardDeck.getDeck()");
    await acquire();
    const d = await json("({ deck: ProjectRCardDeck.getDeck(), lv: ProjectRCardDeck.getPersistentData().cardOwnership.hermes_issen.level, rec: ProjectRHermesProductionDeck.state().rings.hermes, n: ProjectRCardInventory.getOwnedCopies('hermes_issen') })");
    rec("T6 カスタムデッキとLevelを保つ: 事前の一閃1枚・Lv2・2枚のデッキ → 補充後も一閃Lv2・デッキは変わらず(上書きなし)、一閃は3枚", same(d.deck, deckBefore) && d.lv === 2 && d.n === 3 && d.rec.deckInitialized === false, d);
  });

  await check("T7", async () => {
    await useDir(TMP_SAVE);
    await fresh();
    await ev("(function() { var d = ProjectRCardDeck; d.assignRingToPlayer('hermes'); d.setCardOwned('hermes_sword_attack', true); d.setCardLevel('hermes_sword_attack', 2); d.setDeck(['hermes_sword_attack', 'hermes_sword_attack']); delete $gameSystem._projectRHermesProduction; delete $gameSystem._projectRCardInventory; })(); 'ok'");
    const saved = await saveTo(2);
    await fresh(); await useDir(TMP_SAVE);
    const mark = c.events.length;
    await loadFrom(2);
    const errs = c.events.slice(mark).filter(e => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map(e => JSON.stringify(e.params).slice(0, 300));
    const loaded = await snapshot();
    const zeroNew = await copies();
    await acquire(); await grantRing();
    const afterAcq = await snapshot();
    const gate = await json("ProjectRHermesProductionDeck.grantStarter()");
    rec("T7a 旧セーブ(指輪あり・付与記録なし・旧デッキ)を本物のロードで読む: エラー無し・新Hermesは0枚のまま。再入手/GrantRingでも自動付与されない(指輪を持っているだけでは補充しない)",
      saved === "ok" && errs.length === 0 && same(zeroNew, { hermes_issen: 0, hermes_psychopomp: 0, hermes_veil: 0, hermes_strength: 0, hermes_sweep: 0, hermes_reed_flute: 0, hermes_zetsu: 0 }) && same(afterAcq, loaded) && gate.reason === "explicitRequired", { saved, errs: errs.slice(0, 2), gate: gate.reason });
    const res = await json("ProjectRHermesProductionDeck.grantStarter({ explicit: true, source: 'verify-legacy' })");
    const after = await snapshot();
    rec("T7b 明示付与(explicit)では補充される: 新7種が目標どおり(3/3/3/10/3/3/5)・旧剣は2枚/Lv2のまま・既存の旧デッキは上書きされない",
      res.granted === true && same(await copies(), TARGET) && after.inv.copies.hermes_sword_attack === 2 && after.core.cardOwnership.hermes_sword_attack.level === 2 && same(after.deck, loaded.deck), { total: res.totalCopies });
  });

  await check("T8", async () => {
    await fresh(); await pre({ hermes_strength: 2 });
    const before = await snapshot();
    const bad = await json("(function() { var inv = ProjectRCardInventory, out = []; [{ hermes_issen: 3, no_such_card: 3 }, { hermes_issen: 3, hermes_veil: 0 }, { hermes_issen: 3, hermes_veil: 1.5 }, { hermes_issen: 3, hermes_veil: 1000 }].forEach(function(cards) { var r = inv.grantBundle('hermes.ring.starter', cards, { mode: 'topUp' }); out.push([r.ok, r.granted]); }); var m = inv.grantBundle('hermes.ring.starter', { hermes_issen: 3 }, { mode: 'bogus' }); out.push([m.ok, m.granted]); return out; })()");
    const afterBad = await snapshot();
    rec("T8a 不正な補充(未知のカード・0・小数・上限超過・不明なmode)は原子的に失敗: 所持・Core・付与記録・デッキが一切変わらず、報酬記録も作られない", bad.every(r => r[0] === false && r[1] === false) && same(before, afterBad) && !(await ev("ProjectRCardInventory.hasReward('hermes.ring.starter')")), bad);
    const invalid = await json("(function() { var orig = ProjectRCardCatalog; window.__origCatalog = orig; window.ProjectRCardCatalog = Object.assign({}, orig, { hermesDesign: function() { return orig.hermesDesign().map(function(d) { return d.runtimeCardId === 'hermes_strength' ? Object.assign({}, d, { firstGrantCopies: 9 }) : d; }); } }); var r = ProjectRHermesProductionDeck.grantStarter({ explicit: true }); window.ProjectRCardCatalog = orig; return { ok: r.ok, granted: r.granted, reason: r.reason }; })()");
    const afterInvalid = await snapshot();
    rec("T8b 設計データが不正(合計30でない)なら付与せず(definitionsInvalid)、状態も報酬記録も変わらない。復元後は正しく補充される", invalid.granted === false && invalid.reason === "definitionsInvalid" && same(before, afterInvalid) && (await ev("ProjectRCardCatalog === window.__origCatalog")), invalid);
    await acquire();
    rec("T8c 失敗後の入手は通常どおり補充される(ストレングス2 → 10)", (await ev("ProjectRCardInventory.getOwnedCopies('hermes_strength')")) === 10 && (await ev("ProjectRCardInventory.hasReward('hermes.ring.starter')")));
  });

  await check("T9", async () => {
    await fresh(); await pre({ hermes_strength: 12, hermes_issen: 5 });
    await acquire();
    // Deck Builder(実Scene)の表示: 所持12枚でもデッキ上限は10枚。
    await ev("window.__drawn = []; if (!window.__drawHook) { window.__drawHook = true; var od = Bitmap.prototype.drawText; Bitmap.prototype.drawText = function(t) { if (window.__drawn.length < 4000) window.__drawn.push(String(t)); return od.apply(this, arguments); }; } 'ok'");
    await ev("ProjectRMenuIntegration.openDeckBuilder(); 'ok'");
    await wait("SceneManager._scene.constructor.name === 'Scene_ProjectRDeckBuilder' && !SceneManager.isSceneChanging()", 8000); await sleep(700);
    await ev("(function() { var sc = SceneManager._scene; var i = sc._collection._items.findIndex(function(e) { return e.cardId === 'hermes_strength'; }); sc._collection.select(i); window.__drawn = []; sc.refreshCollection(); sc.refreshDetail(); return i; })()");
    await sleep(500);
    const drawn = await json("window.__drawn");
    const detail = drawn.find(t => t.indexOf("ストレングス：所持") === 0) || "";
    rec("T9 Deck Builder(実Scene): 補充後(事前12枚)は「所持12枚 / デッキ10枚 / 上限10枚」と描かれる(上限を超える分は保管)。デッキは30枚で有効", /^ストレングス：所持12枚 \/ デッキ10枚 \/ 上限10枚/.test(detail) && (await ev("ProjectRCardDeck.getDeck().length === 30 && ProjectRCardDeck.isDeckValid()")), { detail });
    await ev("SceneManager.pop(); 'ok'"); await ready();
  });

  await check("T10", async () => {
    // 戦闘: 補充後の所持(ストレングス8→10・一閃5)は、実キーでカードを使っても変わらない。
    await fresh(); await pre({ hermes_strength: 8, hermes_issen: 5 });
    await acquire();
    await ev("ProjectRCombatTestArena.enter(); 'ok'");
    await wait("$gameMap.mapId() === 4 && !SceneManager.isSceneChanging() && !$gamePlayer.isTransferring()", 20000); await sleep(1500);
    await ev("[2,3,4,5,6].forEach(function(id) { $gameMap.event(id).locate(40 - id, 3); }); $gameParty.leader().forceChangeEquip(0, $dataWeapons[2]); $gameParty.leader().setHp($gameParty.leader().mhp); 'ok'");
    await s.place(12, 25); await sleep(400);
    const before = await snapshot();
    const begin = await json("(function() { var r = ProjectRCombatSession.begin('h2cb4', { requireValidDeck: true }); return { ok: r.ok, reason: r.reason }; })()");
    await s.sceneFrames(8);
    await s.place(12, 25); await s.aim(4, -1);
    let used = 0;
    for (let i = 0; i < 4; i++) {
      const pre0 = await json("ProjectRCardDeck.getBattleState()");
      await c.tap("Q", 90); await sleep(450);
      const post = await json("ProjectRCardDeck.getBattleState()");
      if (pre0 && post && post.cooldownPile.length + post.discardPile.length > pre0.cooldownPile.length + pre0.discardPile.length) used++;
      await c.tap("E", 90); await sleep(300);
    }
    const mid = await snapshot();
    await ev("ProjectRCombatSession.end('h2cb4'); ProjectRCardDeck.endCardBattle(); 'ok'"); await s.sceneFrames(10);
    const after = await snapshot();
    rec("T10 補充後の30枚デッキで戦闘が始まり、実キー(Q/E)でカードを使っても(使えたカード>=1)、物理所持・報酬記録・Level・デッキは戦闘中も戦闘後も変わらない",
      begin.ok && used >= 1 && same(mid.inv, before.inv) && same(after.inv, before.inv) && same(after.deck, before.deck) && same(after.core, before.core), { begin, used, strength: after.inv.copies.hermes_strength, issen: after.inv.copies.hermes_issen });
  });

  const stuck = await ev("Object.keys(Input._currentState).filter(function(k) { return Input._currentState[k]; })");
  rec("MZ 押されたままのキーがない・Consoleのエラーなし", stuck.length === 0 && s.errors().length === 0, { stuck, errors: s.errors().slice(0, 3) });
  fs.writeFileSync(`${OUT}/h2cb4_results.json`, JSON.stringify({ note: "新しいゲームはメモリ上、保存は一時フォルダにだけ書いた。戦闘のQ/Eだけ実キー(CDP)。人間の手動確認ではない", results: s.results }, null, 2));
  console.log(`\n${s.results.filter(r => r.ok).length}/${s.results.length} PASS`);
  process.exit(s.results.every(r => r.ok) ? 0 : 1);
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
