"use strict";
// Phase H2C-A: Hermes 本番デッキ統合(指輪の初回入手 → 7種30枚の付与 → デッキ初期化 → メニュー → 戦闘前検証 → 戦闘中のカード循環)。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map004)で動かす。MZの描画・音はstub。
// 実機(NW.js)での確認は tools/mz_cdp/h2ca_verify.cjs。
const assert = require("node:assert/strict");
const { buildWorld, plain, read } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

const STARTER = [
    ["hermes_issen", "一閃", 3], ["hermes_psychopomp", "サイコポンポス", 3], ["hermes_veil", "ヴェイル", 3], ["hermes_strength", "ストレングス", 10],
    ["hermes_sweep", "薙ぎ払い", 3], ["hermes_reed_flute", "葦笛", 3], ["hermes_zetsu", "絶", 5]
];
const IDS = STARTER.map(row => row[0]);
const LEGACY = ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack"];
const APOLLO = ["apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.mouse(700, 300);
    w.g = w.ctx;
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.prod = () => w.ctx.ProjectRHermesProductionDeck;
    w.menu = () => w.ctx.ProjectRMenuCore;
    w.cmd = (plugin, name, args = {}) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), plugin, name, args);
    w.grantRing = (ringId = "hermes") => w.cmd("ProjectR_MenuIntegration", "GrantRing", { ringId });
    w.acquire = () => w.cmd("ProjectR_HermesProductionDeck", "AcquireHermesRing");
    w.data = () => plain(w.deck().getPersistentData());
    w.counts = () => { const m = {}; for (const id of plain(w.deck().getDeck())) m[id] = (m[id] || 0) + 1; return m; };
    // セーブ → ロードの往復(JsonEx。ファイルは作らない)。
    w.roundTrip = () => {
        const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
        return json;
    };
    // 新しいゲーム(本物のDataManager.setupNewGame。セーブ一覧は空として扱う。ファイルは触らない)。
    w.newGame = () => { w.ctx.DataManager._globalInfo = []; w.ctx.DataManager.setupNewGame(); };
    w.afterCombat = () => { w.ctx.Graphics.frameCount = (Number(w.ctx.Graphics.frameCount) || 0) + 120; w.frames(10); };
    w.allowAlly = (actorId, ringId = "hermes") => {
        const ring = w.deck().definitions.ring(ringId);
        w.deck().definitions.rings.set(ringId, Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
    };
    return w;
}
const allInstances = s => [...s.hand, ...s.drawPile, ...s.discardPile, ...s.cooldownPile.map(e => e.instance)];
const EXPECT_COUNTS = Object.fromEntries(STARTER.map(([id, , n]) => [id, n]));

test("登録: 新Hermes 7枚のランタイムIDは重複せず、定義は1つずつ。最大枚数・Cooldown・対象は正本どおり(合計30)", () => {
    const w = world();
    const d = w.deck();
    const expected = {
        hermes_issen: [3, 7, "direction", "strong"], hermes_psychopomp: [3, 10, "instant", "normal"], hermes_veil: [3, 10, "cursor", "special"],
        hermes_strength: [10, 0.1, "instant", "special"], hermes_sweep: [3, 0.5, "direction", "normal"],
        hermes_reed_flute: [3, 8, "instant", "strong"], hermes_zetsu: [5, 0.5, "ground", "strong"]
    };
    assert.equal(new Set(IDS).size, 7);
    let total = 0;
    for (const id of IDS) {
        const card = d.definitions.card(id);
        assert.ok(card, id);
        assert.equal(card.ringId, "hermes", id);
        assert.equal(card.maxLevel, 3, id);
        assert.deepEqual([card.maxCopies, card.cooldownSeconds, card.targetType, card.rarity], expected[id], id);
        total += card.maxCopies;
    }
    assert.equal(total, 30);
    // Mapは同じキーを二重に持てない。追加登録は7件で、旧カードと重ならない。
    const registered = w.ctx.ProjectRCardCatalog.registeredRuntimeCards();
    assert.deepEqual([...registered].sort(), [...IDS].sort());
    for (const id of LEGACY.concat(APOLLO)) assert.ok(!registered.includes(id), id);
    assert.deepEqual(plain(w.prod().starterSet().map(c => [c.cardId, c.copies])), plain(STARTER.map(r => [r[0], r[2]])));
    assert.equal(w.prod().starterTotal(), 30);
    assert.deepEqual(plain(w.prod().starterProblems()), []);
});

test("初期状態: 指輪は未所持・新カードは未所持・デッキは空。起動やマップ入場では何も付与されない", () => {
    const w = world();
    assert.equal(w.deck().getRingOwner("hermes"), "unowned");
    for (const id of IDS) assert.equal(w.deck().isCardOwned(id), false, id);
    assert.deepEqual(plain(w.deck().getDeck()), []);
    assert.equal(w.prod().hasGranted(), false);
    w.frames(30);
    assert.equal(w.prod().hasGranted(), false);
    assert.equal(w.deck().startCardBattle().ok, false, "空のデッキでは戦闘を始められない");
});

test("初回入手(既存コマンド GrantRing): ちょうど7種30枚が付与され、レベル1・デッキが30枚で初期化され、検証を通る", () => {
    const w = world();
    w.grantRing("hermes");
    const d = w.deck();
    assert.equal(d.getRingOwner("hermes"), "player");
    for (const id of IDS) {
        assert.equal(d.isCardOwned(id), true, id);
        assert.equal(w.data().cardOwnership[id].level, 1, id);
    }
    assert.equal(plain(d.getDeck()).length, 30);
    assert.deepEqual(w.counts(), EXPECT_COUNTS);
    assert.deepEqual(plain(d.getDeckInvalidReasons()), []);
    assert.equal(d.isDeckValid(), true);
    assert.equal(d.canStartBossBattle(), true);
    const state = plain(w.prod().state());
    assert.equal(state.version, 1);
    assert.equal(state.rings.hermes.granted, true);
    assert.equal(state.rings.hermes.totalCopies, 30);
    assert.equal(state.rings.hermes.deckInitialized, true);
    assert.deepEqual(state.rings.hermes.cards, EXPECT_COUNTS);
    // 所持の枚数 = カードの種類ごとの最大コピー数(合計30)。
    const owned = IDS.reduce((sum, id) => sum + w.menu().cardInfo(id).ownedCopies, 0);
    assert.equal(owned, 30);
    // Apollo や旧カードは付与されない。
    for (const id of LEGACY.concat(APOLLO)) assert.equal(d.isCardOwned(id), false, id);
    assert.equal(d.getRingOwner("apollo"), "unowned");
});

test("初回入手の経路は3つとも同じ結果: 専用コマンド / API / 既存GrantRing。それぞれ別の世界で30枚", () => {
    for (const how of ["command", "api", "grantRing"]) {
        const w = world();
        if (how === "command") w.acquire();
        else if (how === "api") {
            const r = w.prod().acquireRing("hermes");
            assert.equal(r.ok && r.acquired && r.granted, true, JSON.stringify(plain(r)));
        } else w.grantRing();
        assert.equal(plain(w.deck().getDeck()).length, 30, how);
        assert.deepEqual(w.counts(), EXPECT_COUNTS, how);
        assert.equal(plain(w.prod().state()).rings.hermes.granted, true, how);
    }
});

test("冪等: 繰り返し実行(コマンド・API・明示付与)では、所持・Level・デッキ・記録が一切変わらず、二重付与されない", () => {
    const w = world();
    w.grantRing();
    w.deck().setCardLevel("hermes_zetsu", 2);
    const before = { data: w.data(), state: plain(w.prod().state()) };
    for (let i = 0; i < 3; i++) {
        w.grantRing(); w.acquire();
        assert.equal(w.prod().acquireRing("hermes").granted, false);
        assert.equal(w.prod().grantStarter({ explicit: true }).reason, "alreadyGranted");
        assert.equal(w.prod().onNewGame().granted, false);
    }
    assert.deepEqual(w.data(), before.data);
    assert.deepEqual(plain(w.prod().state()), before.state);
    assert.equal(plain(w.deck().getDeck()).length, 30);
});

test("既存の所持を壊さない: すでに持つカードのLevel・既存の(空でない)デッキ・他の神の指輪とカードはそのまま", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("apollo");
    for (const id of APOLLO) d.setCardOwned(id, true);
    d.setCardOwned("hermes_zetsu", true); d.setCardLevel("hermes_zetsu", 3);
    d.setCardOwned("hermes_sword_attack", true); d.setCardLevel("hermes_sword_attack", 2);
    const existing = ["apollo_golden_arrow", "apollo_golden_arrow", "hermes_sword_attack", "apollo_lyre_calm"];
    d.setDeck(existing);
    w.grantRing();
    const data = w.data();
    assert.equal(data.cardOwnership.hermes_zetsu.level, 3, "高いLevelを下げない");
    assert.equal(data.cardOwnership.hermes_sword_attack.level, 2);
    assert.deepEqual(plain(d.getDeck()), existing, "既存のデッキを上書きしない");
    assert.equal(plain(w.prod().state()).rings.hermes.deckInitialized, false);
    assert.deepEqual(plain(plain(w.prod().state()).rings.hermes.ownedBefore), ["hermes_zetsu"]);
    assert.equal(d.getRingOwner("apollo"), "player");
    for (const id of APOLLO) assert.equal(d.isCardOwned(id), true, id);
    for (const id of IDS) assert.equal(d.isCardOwned(id), true, id);
});

test("セーブ/ロード: 付与の記録・所持・デッキが往復で保たれ、ロード後の再実行でも二重付与されない", () => {
    const w = world();
    w.grantRing();
    w.menu().deck.remove("hermes_strength"); // 29枚(編集の保存も確認)
    const before = { data: w.data(), state: plain(w.prod().state()), deck: plain(w.deck().getDeck()) };
    const json = w.roundTrip();
    assert.ok(json.includes("_projectRHermesProduction"));
    assert.deepEqual(w.data(), before.data);
    assert.deepEqual(plain(w.prod().state()), before.state);
    assert.deepEqual(plain(w.deck().getDeck()), before.deck);
    w.grantRing(); w.acquire();
    assert.deepEqual(w.data(), before.data, "ロード後の再入手では何も増えない");
    assert.equal(plain(w.deck().getDeck()).length, 29, "ロードでデッキが30枚へ戻らない");
});

test("セーブの互換: 記録の無い旧セーブ・壊れた記録でも読み込め、未付与として扱う(読み込んだだけでは何も付与しない)", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_sword_attack", true);
    w.ctx.$gameSystem._projectRHermesProduction = undefined;
    w.roundTrip();
    assert.equal(w.prod().hasGranted(), false);
    for (const junk of ["text", 7, [], { version: 99 }, { version: 1, rings: "x" }, { rings: { hermes: "x" } }, null]) {
        w.ctx.$gameSystem._projectRHermesProduction = junk;
        assert.equal(w.prod().hasGranted(), false, JSON.stringify(junk));
        assert.ok(Number.isFinite(plain(w.prod().state()).version), JSON.stringify(junk));
        assert.equal(typeof plain(w.prod().state()).rings, "object");
    }
    for (const id of IDS) assert.equal(d.isCardOwned(id), false, id);
});

test("旧セーブ(指輪と旧カードを持つ): 読み込んでも30枚は付与されない。入手コマンドも新規入手ではないので付与しない", () => {
    const w = world();
    const d = w.deck();
    w.ctx.ProjectRProductionTest.legacyOwner();
    const before = w.data();
    w.roundTrip();
    assert.deepEqual(w.data(), before);
    assert.equal(w.prod().hasGranted(), false);
    w.grantRing("hermes"); w.acquire();
    assert.equal(w.prod().acquireRing("hermes").reason, "alreadyOwned");
    assert.deepEqual(w.data(), before, "既存の所持・Level・旧デッキは一切変わらない");
    for (const id of IDS) assert.equal(d.isCardOwned(id), false, id);
    assert.equal(plain(d.getDeck()).length, 19);
    assert.equal(w.prod().grantStarter().reason, "explicitRequired", "明示がなければ付与しない");
    assert.equal(w.prod().hasGranted(), false);
    const report = w.prod().diagnose();
    assert.equal(report.deck.kind, "legacy");
    assert.equal(report.deck.valid, false);
    assert.ok(report.deck.reasons.some(r => r.code === "INVALID_DECK_SIZE" && r.actual === 19));
    assert.equal(report.production.ownedKinds, 0);
    assert.deepEqual(plain(report.legacy.owned).sort(), [...LEGACY, ...APOLLO].sort());
});

test("旧セーブで指輪が仲間にある/未所持: 仲間にあるなら奪い返さず付与もしない。未所持の旧セーブで初めて入手するなら付与する(旧デッキは保つ)", () => {
    const w = world();
    const d = w.deck();
    w.allowAlly(4);
    d.assignRingToPlayer("hermes"); d.setCardOwned("hermes_sword_attack", true);
    d.setDeck(["hermes_sword_attack"]);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).ok, true);
    const result = w.prod().acquireRing("hermes");
    assert.equal(result.reason, "heldByAlly");
    assert.equal(d.getRingOwner("hermes"), "actor:4", "入手コマンドで仲間から奪い返さない");
    assert.equal(w.prod().hasGranted(), false);
    // 未所持の旧セーブ(Apolloだけ持つ)でヘルメースの指輪を初めて入手 → 付与。既存の旧デッキは上書きしない。
    const v = world();
    v.deck().assignRingToPlayer("apollo"); v.deck().setCardOwned("apollo_golden_arrow", true);
    v.deck().setDeck(["apollo_golden_arrow", "apollo_golden_arrow"]);
    v.grantRing();
    assert.equal(v.prod().hasGranted(), true);
    assert.deepEqual(plain(v.deck().getDeck()), ["apollo_golden_arrow", "apollo_golden_arrow"]);
    for (const id of IDS) assert.equal(v.deck().isCardOwned(id), true, id);
});

test("新しいゲーム: Hermesの指輪を最初から持つ設定なら同じ付与を一度だけ。持たない設定(現在の本番)なら何もしない。ロードでは付与しない", () => {
    const w = world();
    // 現在の本番設定(initialOwner = unowned): 何も付与されない。
    w.newGame();
    assert.equal(w.deck().getRingOwner("hermes"), "unowned");
    assert.equal(w.prod().hasGranted(), false);
    assert.deepEqual(plain(w.deck().getDeck()), []);
    // initialOwner = player の設定をメモリ上だけで再現。
    const ring = w.deck().definitions.ring("hermes");
    w.deck().definitions.rings.set("hermes", Object.freeze({ ...ring, initialOwner: "player" }));
    w.newGame();
    assert.equal(w.deck().getRingOwner("hermes"), "player");
    assert.equal(w.prod().hasGranted(), true);
    assert.equal(plain(w.prod().state()).rings.hermes.source, "newGame");
    assert.deepEqual(w.counts(), EXPECT_COUNTS);
    assert.equal(w.deck().isDeckValid(), true);
    const snapshot = w.data();
    w.roundTrip();
    assert.deepEqual(w.data(), snapshot);
    assert.equal(w.prod().onNewGame().granted, false);
    // 新しいゲームを始め直すと記録も作り直される(前のゲームの記録を持ち越さない)。
    w.newGame();
    assert.equal(plain(w.prod().state()).rings.hermes.granted, true);
    assert.equal(plain(w.prod().state()).rings.hermes.source, "newGame");
});

test("明示的な付与(将来の移行用): explicit:true のときだけ旧セーブにも一度だけ付与できる。自動では呼ばれない", () => {
    const w = world();
    w.ctx.ProjectRProductionTest.legacyOwner();
    const legacyDeck = plain(w.deck().getDeck());
    const r = w.prod().grantStarter({ explicit: true, source: "migration" });
    assert.equal(r.granted, true);
    assert.deepEqual(plain(w.deck().getDeck()), legacyDeck, "旧デッキは上書きされない");
    assert.equal(w.prod().grantStarter({ explicit: true }).reason, "alreadyGranted");
    for (const id of IDS) assert.equal(w.deck().isCardOwned(id), true, id);
});

test("戦闘中は入手も付与も拒否され、状態が変わらない", () => {
    const w = world();
    w.ctx.ProjectRCombatSession.begin("t", { requireValidDeck: false });
    const r = w.prod().acquireRing("hermes");
    assert.equal(r.ok, false);
    assert.equal(w.deck().getRingOwner("hermes"), "unowned");
    assert.equal(w.prod().hasGranted(), false);
    w.grantRing();
    assert.equal(w.deck().getRingOwner("hermes"), "unowned", "既存コマンドも戦闘中は失敗");
    assert.equal(w.prod().hasGranted(), false);
    w.ctx.ProjectRCombatSession.end("t");
});

test("コピー上限: ストレングス10・絶5・他3。超過はメニューで拒否され、メッセージが出る。旧カードや全体の規則は変わらない", () => {
    const w = world();
    w.grantRing();
    const core = w.menu();
    for (const [id, , max] of STARTER) {
        core.deck.clear(); // 1枚種類ずつ確認する(デッキが30枚に達するとDECK_FULLが先に出るため)
        for (let i = 0; i < max; i++) assert.equal(core.deck.add(id).ok, true, `${id} ${i + 1}`);
        const over = core.deck.add(id);
        assert.equal(over.ok, false, id);
        assert.equal(over.reason, "MAX_COPIES_EXCEEDED", id);
        assert.match(over.message, new RegExp(`コピー上限超過：.*（${max + 1}/${max}）`), id);
    }
    core.deck.clear();
    for (const [id, , max] of STARTER) for (let i = 0; i < max; i++) assert.equal(core.deck.add(id).ok, true, id);
    assert.equal(core.deck.add("hermes_strength").reason, "DECK_FULL");
    assert.equal(plain(w.deck().getDeck()).length, 30);
    assert.equal(core.deck.status().valid, true);
    // 全体の規則: 旧カードの上限は変わらない。
    const d = w.deck();
    assert.deepEqual(plain(LEGACY.concat(APOLLO).map(id => d.definitions.card(id).maxCopies)), [3, 2, 3, 3, 3, 2, 3]);
    d.setCardOwned("hermes_sword_attack", true);
    core.deck.clear();
    for (let i = 0; i < 3; i++) assert.equal(core.deck.add("hermes_sword_attack").ok, true);
    assert.equal(core.deck.add("hermes_sword_attack").reason, "MAX_COPIES_EXCEEDED");
});

test("混在デッキ: 新Hermes + Apollo は30枚で有効。Apolloの指輪を仲間へ渡すとApolloのカードだけ無効(削除・自動交換なし)。戻すと再び有効", () => {
    const w = world();
    const d = w.deck();
    w.grantRing();
    d.assignRingToPlayer("apollo");
    for (const id of APOLLO) d.setCardOwned(id, true);
    const mixed = [];
    for (const [id, , n] of STARTER) for (let i = 0; i < (id === "hermes_strength" ? 4 : id === "hermes_zetsu" ? 3 : 2) && i < n; i++) mixed.push(id);
    while (mixed.length < 22) mixed.push("hermes_strength");
    mixed.push("apollo_golden_arrow", "apollo_golden_arrow", "apollo_golden_arrow", "apollo_plague_attack", "apollo_plague_attack",
        "apollo_lyre_calm", "apollo_lyre_calm", "apollo_lyre_calm");
    d.setDeck(mixed);
    assert.equal(mixed.length, 30);
    assert.equal(d.isDeckValid(), true, JSON.stringify(plain(d.getDeckInvalidReasons())));
    assert.equal(w.prod().diagnose().deck.kind, "mixed");
    w.allowAlly(4, "apollo");
    assert.equal(w.menu().rings.transferToActor("apollo", 4).ok, true);
    const reasons = d.getDeckInvalidReasons();
    assert.equal(reasons.length, 8);
    assert.ok(reasons.every(r => r.code === "REQUIRED_RING_NOT_OWNED" && r.ringId === "apollo"));
    assert.deepEqual(plain(d.getDeck()), mixed, "無効になっても削除・並べ替えされない");
    assert.equal(w.menu().rings.returnToPlayer("apollo").ok, true);
    assert.equal(d.isDeckValid(), true);
});

test("指輪の譲渡と復帰: 譲渡で30枚すべてが無効になるが所持・デッキは残る。理由は指輪ごとにまとめて表示。戻すと再付与なしで再び有効", () => {
    const w = world();
    w.grantRing();
    w.allowAlly(4);
    const core = w.menu();
    const before = { data: w.data(), deck: plain(w.deck().getDeck()), state: plain(w.prod().state()) };
    assert.equal(core.rings.transferToActor("hermes", 4).ok, true);
    assert.equal(w.deck().getRingOwner("hermes"), "actor:4");
    const status = core.deck.status();
    assert.equal(status.valid, false);
    assert.equal(status.reasons.filter(r => r.code === "REQUIRED_RING_NOT_OWNED").length, 30);
    assert.equal(status.groupedMessages.length, 1, "7行×…ではなく指輪ごとの1件にまとまる");
    assert.match(status.groupedMessages[0], /ヘルメースの指輪を主人公が持っていないため使えません：.*（計30枚）/);
    for (const [, name] of STARTER) assert.ok(status.groupedMessages[0].includes(name), name);
    assert.deepEqual(plain(w.deck().getDeck()), before.deck, "デッキは削除・置換されない");
    for (const id of IDS) assert.equal(w.deck().isCardOwned(id), true, id);
    assert.equal(w.deck().startCardBattle().ok, false, "無効なデッキでは戦闘を始められない");
    assert.equal(w.deck().canStartBossBattle(), false);
    assert.equal(w.prod().acquireRing("hermes").reason, "heldByAlly");
    assert.equal(w.deck().getRingOwner("hermes"), "actor:4");
    assert.equal(core.rings.returnToPlayer("hermes").ok, true);
    assert.equal(w.deck().isDeckValid(), true);
    assert.deepEqual(w.data(), before.data, "再取得で所持もLevelも増減しない");
    assert.deepEqual(plain(w.prod().state()), before.state, "再付与の記録も変わらない");
    w.grantRing(); w.acquire();
    assert.deepEqual(w.data(), before.data);
});

test("指輪の譲渡は戦闘中は拒否され、デッキ編集も戦闘中は拒否される", () => {
    const w = world();
    w.grantRing();
    w.allowAlly(4);
    assert.equal(w.ctx.ProjectRCombatSession.begin("t", { requireValidDeck: true }).ok, true);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).reason, "inCombat");
    assert.equal(w.menu().deck.remove("hermes_strength").reason, "inCombat");
    assert.equal(w.menu().deck.clear().reason, "inCombat");
    assert.equal(w.deck().getRingOwner("hermes"), "player");
    assert.equal(plain(w.deck().getDeck()).length, 30);
    w.ctx.ProjectRCombatSession.end("t");
});

test("デッキ編集: 追加・削除・並べ替えが保存され、ロードでも保たれる。入手し直しても編集が戻らない", () => {
    const w = world();
    w.grantRing();
    const core = w.menu();
    assert.equal(core.deck.remove("hermes_strength").ok, true);
    assert.equal(core.deck.remove("hermes_strength").ok, true);
    assert.equal(core.deck.status().valid, false);
    assert.match(core.deck.status().messages[0], /30枚必要（現在28枚）/);
    assert.equal(core.deck.add("hermes_zetsu").ok, false, "絶は5枚まで");
    assert.equal(core.deck.add("hermes_strength").ok, true);
    assert.equal(core.deck.add("hermes_strength").ok, true);
    assert.equal(core.deck.status().valid, true);
    assert.equal(core.deck.remove("hermes_issen").ok, true);
    const edited = plain(w.deck().getDeck());
    w.roundTrip();
    assert.deepEqual(plain(w.deck().getDeck()), edited);
    w.grantRing(); w.acquire();
    assert.deepEqual(plain(w.deck().getDeck()), edited);
    assert.equal(w.counts().hermes_issen, 2);
});

test("メニュー表示: 7枚すべてが日本語名・神・分類・強さ・Cooldown・対象(Cursorを含む)・Level別効果つきで一覧に出る。重複や欠けがない", () => {
    const w = world();
    w.grantRing();
    const core = w.menu();
    const entries = core.deck.collection();
    assert.deepEqual(plain(entries.map(e => e.cardId)).sort(), [...IDS].sort(), "新旧の重複エントリーがない(旧カードは未所持)");
    assert.equal(new Set(entries.map(e => e.cardId)).size, entries.length);
    const want = {
        hermes_issen: ["一閃", "攻撃", "強力", 7, "方向", 3], hermes_psychopomp: ["サイコポンポス", "特殊", "通常", 10, "回復", 3],
        hermes_veil: ["ヴェイル", "支援", "特殊", 10, "カーソル追従", 3], hermes_strength: ["ストレングス", "特殊", "特殊", 0.1, "強化", 10],
        hermes_sweep: ["薙ぎ払い", "攻撃", "通常", 0.5, "方向", 3], hermes_reed_flute: ["葦笛", "妨害", "強力", 8, "その他", 3],
        hermes_zetsu: ["絶", "移動", "強力", 0.5, "指定位置", 5]
    };
    for (const entry of entries) {
        const [name, category, rarity, cooldown, target, copies] = want[entry.cardId];
        const info = entry.info;
        assert.equal(info.name, name, entry.cardId);
        assert.equal(info.categoryLabel, category, entry.cardId);
        assert.equal(info.rarityLabel, rarity, entry.cardId);
        assert.equal(info.cooldownSeconds, cooldown, entry.cardId);
        assert.ok(info.targetLabel.startsWith(target), `${entry.cardId} ${info.targetLabel}`);
        assert.equal(info.godId, "hermes", entry.cardId);
        assert.equal(info.godName, "ヘルメース");
        assert.equal(info.ringName, "ヘルメースの指輪");
        assert.equal(entry.maxCopies, copies, entry.cardId);
        assert.equal(info.ownedCopies, copies, entry.cardId);
        assert.equal(entry.level, 1);
        assert.equal(entry.maxLevel, 3);
        assert.equal(entry.usable, true);
        assert.equal(entry.copiesInDeck, copies);
        assert.equal(info.levels.length, 3, entry.cardId);
        assert.ok(info.description.length > 5, entry.cardId);
        assert.equal(w.ctx.ProjectRBattleHUD.getCardPresentation(entry.cardId).name, name, "手札HUDとメニューで同じ名前");
    }
    assert.equal(core.cardInfo("hermes_veil").targetType, "cursor");
    assert.equal(core.cardInfo("hermes_psychopomp").targetType, "instant", "Healは魂の回収であり最寄りの味方を選ぶallではない");
    const deckEntries = core.deck.entries();
    assert.equal(deckEntries.length, 7);
    assert.equal(deckEntries.reduce((s, e) => s + e.count, 0), 30);
    // 旧カードの表示は変わらない。
    assert.equal(core.cardInfo("hermes_sword_attack").name, "ヘルメース剣術");
    assert.equal(core.cardInfo("apollo_lyre_calm").targetLabel, "味方");
});

test("Level表示: Level別の効果は累積(置換)として正本の数値を含み、現在のLevelはカード所持データから読む", () => {
    const w = world();
    w.grantRing();
    const core = w.menu();
    const numbers = {
        hermes_issen: ["200", "50", "100", "-50%", "3秒"], hermes_psychopomp: ["50", "100", "150", "3%", "3秒"],
        hermes_veil: ["5秒", "30%", "50%"], hermes_strength: ["10%", "15%", "防御"],
        hermes_sweep: ["50", "先端1マス", "50%"], hermes_reed_flute: ["眠", "50", "クリティカル確定"],
        hermes_zetsu: ["×1.5", "×2.0", "×3.0", "0.8秒", "1秒"]
    };
    for (const [id, list] of Object.entries(numbers)) {
        const text = core.cardInfo(id).levels.join("|");
        for (const token of list) assert.ok(text.includes(token), `${id}: ${token}`);
    }
    // Level上昇を所持データに反映すると、メニューの現在Levelが変わる(Level上限はCoreが丸める)。
    w.deck().setCardLevel("hermes_zetsu", 3);
    w.deck().setCardLevel("hermes_issen", 9);
    const by = id => core.deck.collection().find(e => e.cardId === id);
    assert.equal(by("hermes_zetsu").level, 3);
    assert.equal(by("hermes_issen").level, 3);
    const resolved = w.ctx.ProjectRCardCatalog.resolveLevels([{ level: 1, effects: { m: 1.5 } }, { level: 2, effects: { m: 2 } }, { level: 3, effects: { m: 3, s: 2 } }], 3);
    assert.deepEqual(plain(resolved), { m: 3, s: 2 });
});

test("戦闘開始: 30枚の初期デッキで開始でき、手札5枚・山札25枚。編集済みの(Apollo混在)30枚はそのまま使われ、開始でも所持・デッキ・記録は変わらない", () => {
    const w = world();
    w.grantRing();
    // 初期デッキそのもので開始: 手札5枚 + 山札25枚。
    const starterBegin = w.ctx.ProjectRCombatSession.begin("starter", { requireValidDeck: true });
    assert.equal(starterBegin.ok, true, JSON.stringify(plain(starterBegin)));
    const s0 = w.deck().getBattleState();
    assert.equal(s0.hand.length, 5);
    assert.equal(s0.drawPile.length, 25);
    assert.equal(s0.discardPile.length + s0.cooldownPile.length, 0);
    w.ctx.ProjectRCombatSession.end("starter");
    w.afterCombat(); // 戦闘終了後の猶予(EndGraceFrames 24。Graphics.frameCount で数える)が過ぎるまで、指輪の操作は戦闘中として拒否される
    // Hermes 30枚の組成は一意(合計の最大がちょうど30)なので、別の組成にするにはApolloを混ぜる。
    const d = w.deck(), core = w.menu();
    d.assignRingToPlayer("apollo");
    for (const id of APOLLO) d.setCardOwned(id, true);
    for (let i = 0; i < 5; i++) assert.equal(core.deck.remove("hermes_strength").ok, true);
    for (let i = 0; i < 3; i++) assert.equal(core.deck.remove("hermes_zetsu").ok, true);
    for (const id of ["apollo_golden_arrow", "apollo_golden_arrow", "apollo_golden_arrow", "apollo_plague_attack", "apollo_plague_attack",
        "apollo_lyre_calm", "apollo_lyre_calm", "apollo_lyre_calm"]) assert.equal(core.deck.add(id).ok, true, id);
    const edited = plain(d.getDeck());
    assert.equal(edited.length, 30);
    assert.equal(d.isDeckValid(), true);
    const before = { data: w.data(), state: plain(w.prod().state()) };
    const begin = w.ctx.ProjectRCombatSession.begin("battle", { requireValidDeck: true });
    assert.equal(begin.ok, true, JSON.stringify(plain(begin)));
    const state = plain(d.getBattleState());
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length, 25);
    const tally = {}; for (const c of allInstances(state)) tally[c.cardId] = (tally[c.cardId] || 0) + 1;
    const expected = {}; for (const id of edited) expected[id] = (expected[id] || 0) + 1;
    assert.deepEqual(tally, expected, "戦闘デッキは編集後のデッキそのもの(初期デッキへ戻さない)");
    assert.deepEqual(w.data(), before.data);
    assert.deepEqual(plain(w.prod().state()), before.state);
    w.ctx.ProjectRCombatSession.end("battle");
    assert.deepEqual(plain(d.getDeck()), edited, "戦闘終了後もデッキは編集済みのまま");
    assert.deepEqual(w.data(), before.data);
    // 29枚の不正なデッキは、ボス戦開始(requireValidDeck)を拒否し、デッキを書き換えない。
    core.deck.remove("apollo_lyre_calm");
    const bad = w.ctx.ProjectRCombatSession.begin("boss", { requireValidDeck: true });
    assert.equal(bad.ok, false);
    assert.equal(plain(d.getDeck()).length, 29);
});

// ---- 戦闘中のカード循環(本物の30枚デッキ・本物の上限) ----
function startOrdered(w, order) {
    // 山札は末尾から引く。シャッフルを止め、逆順で渡す(上限は本物のまま。orderは30枚のデッキの並び替え)。
    const ids = plain(w.deck().getDeck()).slice();
    const rest = ids.slice();
    const sequence = [];
    for (const id of order) { const i = rest.indexOf(id); assert.ok(i >= 0, id); sequence.push(...rest.splice(i, 1)); }
    sequence.push(...rest);
    w.ctx.ProjectRCombatSession.end("battle");
    w.deck().endCardBattle();
    w.run("globalThis.__random = Math.random; Math.random = () => 1 - Number.EPSILON;");
    const r = w.deck().startCardBattle([...sequence].reverse());
    w.run("Math.random = globalThis.__random;");
    assert.equal(r.ok, true, JSON.stringify(plain(r)));
    return sequence;
}
const piles = w => { const s = plain(w.deck().getBattleState()); return { hand: s.hand.map(c => c.cardId), draw: s.drawPile.map(c => c.cardId), discard: s.discardPile.map(c => c.cardId), cooldown: s.cooldownPile.map(e => ({ id: e.instance.cardId, left: e.remainingSeconds })), state: s }; };
const tick = (w, seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) w.deck().updateCooldown(1 / 60); };

test("カード循環: 使う → 手札から外れCooldownへ → すぐ補充 → 期限切れで捨て札 → 山札が尽きたら捨て札だけを混ぜ直す(Cooldown中は含めない)。常に30枚", () => {
    const w = world();
    w.grantRing();
    const sequence = startOrdered(w, ["hermes_strength", "hermes_strength", "hermes_strength", "hermes_strength", "hermes_strength"]);
    const d = w.deck();
    let p = piles(w);
    assert.deepEqual(p.hand, sequence.slice(0, 5));
    assert.equal(p.draw.length, 25);
    // 1枚使う(低水準の消費。実カードの効果は別のテスト)。
    const instanceId = p.state.hand[0].instanceId;
    assert.equal(d.useBattleCard(instanceId).ok, true);
    p = piles(w);
    assert.equal(p.hand.length, 5, "使った直後に補充される");
    assert.equal(p.cooldown.length, 1);
    assert.equal(p.cooldown[0].left, 0.1);
    assert.equal(allInstances(p.state).length, 30);
    tick(w, 0.2);
    p = piles(w);
    assert.equal(p.cooldown.length, 0);
    assert.equal(p.discard.length, 1, "期限切れは捨て札へ");
    // 山札を尽くす: 手札を使い続け、Cooldownを待たずに25枚引き切る。
    for (let i = 0; i < 24; i++) { d.useBattleCard(piles(w).state.hand[0].instanceId); }
    p = piles(w);
    assert.equal(p.draw.length, 0, "山札が尽きた");
    assert.equal(p.hand.length, 5);
    assert.equal(allInstances(p.state).length, 30);
    const cooling = new Set(p.state.cooldownPile.map(e => e.instance.instanceId));
    const discarded = new Set(p.state.discardPile.map(c => c.instanceId));
    // 次の補充で混ぜ直す: 山札は捨て札のみから作られ、Cooldown中のカードは混ざらない。
    d.useBattleCard(p.state.hand[0].instanceId);
    const after = piles(w);
    const drawnFromDiscard = after.state.hand.filter(c => !p.state.hand.some(h => h.instanceId === c.instanceId));
    assert.ok(drawnFromDiscard.every(c => discarded.has(c.instanceId) && !cooling.has(c.instanceId)), "混ぜ直しは捨て札だけ");
    for (const e of after.state.cooldownPile) assert.ok(!after.state.drawPile.some(c => c.instanceId === e.instance.instanceId), "Cooldown中は山札にない");
    const ids = allInstances(after.state).map(c => c.instanceId);
    assert.equal(new Set(ids).size, 30, "どのカードも重複せず、失われない");
});

test("7種すべてが引けて、実際のhandlerで発動できる(1リクエスト = 1枚の消費)。旧カードのhandlerは動かない", () => {
    const w = world();
    w.grantRing();
    const order = ["hermes_issen", "hermes_psychopomp", "hermes_veil", "hermes_strength", "hermes_sweep", "hermes_reed_flute", "hermes_zetsu"];
    startOrdered(w, order);
    w.ctx.ProjectRCombatSession.begin("battle", { requireValidDeck: false }); // 既に戦闘中のカード戦闘は維持される
    w.frames(2);
    const d = w.deck();
    const used = [];
    const logged = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { logged.push(plugin + ":" + name); return original.apply(this, arguments); };
    for (let n = 0; n < 7; n++) {
        const p = piles(w);
        const card = p.hand[0];
        const cooldownBefore = p.cooldown.length + p.discard.length;
        w.mouse(700, 300 + n * 10);
        w.ctx.$gamePlayer.center(w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY);
        let result = plain(d.requestUseCard(0));
        // 絶は本番の予備動作(約8フレーム)のあとに消費が確定する(H2Aの取引)。確定を待つ。
        if (card === "hermes_zetsu") {
            assert.equal(result.pending, true, JSON.stringify(result));
            assert.equal(piles(w).hand[0], "hermes_zetsu", "予備動作中は手札に残る");
            w.frames(40);
            result = { ok: true, cardId: card };
        }
        assert.equal(result.ok, true, `${card}: ${JSON.stringify(result)}`);
        assert.equal(result.cardId, card);
        used.push(result.cardId);
        const q = piles(w);
        assert.equal(q.cooldown.length + q.discard.length, cooldownBefore + 1, `${card}は1枚だけ消費`);
        assert.equal(q.hand.length, 5);
        assert.equal(allInstances(q.state).length, 30);
        tick(w, 11);
        w.frames(1);
    }
    assert.deepEqual(used, order);
    const forbidden = ["ProjectR_HermesSwordsmanship", "ProjectR_HermesReedFluteSleep", "ProjectR_HermesRecognitionObscure", "ProjectR_HermesSwiftMovement", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm"];
    for (const entry of logged) assert.ok(!forbidden.some(f => entry.startsWith(f + ":")), entry);
    w.ctx.PluginManager.callCommand = original;
});

test("押しっぱなしで重複発動しない: 0.1秒Cooldownのストレングスと0.5秒の絶でも、1回の押下 = 1回の発動(キーリピートは無視)", () => {
    for (const [card, ring] of [["hermes_strength", 0.1], ["hermes_zetsu", 0.5]]) {
        const w = world();
        w.grantRing();
        startOrdered(w, Array(Math.min(5, card === "hermes_zetsu" ? 5 : 5)).fill(card));
        w.ctx.ProjectRCombatSession.begin("battle", { requireValidDeck: false });
        w.frames(2);
        assert.equal(piles(w).hand.filter(id => id === card).length, 5);
        w.keyDown("KeyQ", 81);
        for (let i = 0; i < 45; i++) { w.ctx.Input._onKeyDown({ code: "KeyQ", keyCode: 81, repeat: true, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, isComposing: false, defaultPrevented: false, target: null, preventDefault() {} }); w.frames(1); }
        const p = piles(w);
        const consumed = p.cooldown.length + p.discard.length;
        assert.equal(consumed, 1, `${card}: 45フレーム(Cooldown ${ring}秒の数倍)押し続けても1回`);
        w.keyUp("KeyQ", 81);
        w.frames(2);
        assert.equal(piles(w).cooldown.length + piles(w).discard.length, 1);
        // 離してから押し直すと、正当に2回目が発動する。
        w.ctx.$gamePlayer.center(w.ctx.$gamePlayer._realX, w.ctx.$gamePlayer._realY);
        w.mouse(300, 250); // 絶は現在地と同じ場所へは移動しないので、別の場所を指す
        w.tap("KeyQ", 81);
        w.frames(30); // 絶の予備動作が終わって消費が確定するまで
        assert.equal(piles(w).cooldown.length + piles(w).discard.length, 2, `${card}: 押し直しは別の発動`);
    }
});

test("診断: 不明なカードID・混在・空のデッキを分類し、何も削除・変更しない", () => {
    const w = world();
    const d = w.deck();
    assert.equal(w.prod().diagnose().deck.kind, "empty");
    w.grantRing();
    assert.equal(w.prod().diagnose().deck.kind, "production");
    d.setCardOwned("hermes_sword_attack", true);
    d.setDeck([...plain(d.getDeck()).slice(0, 29), "hermes_sword_attack"]);
    assert.equal(w.prod().diagnose().deck.kind, "mixed");
    const unknown = [...plain(d.getDeck()).slice(0, 29), "ghost_card"];
    d.setDeck(unknown);
    const report = w.prod().diagnose();
    assert.equal(report.deck.kind, "hasUnknownCards");
    assert.deepEqual(plain(report.deck.unknownCardIds), ["ghost_card"]);
    assert.ok(report.deck.reasons.some(r => r.code === "INVALID_CARD_ID"));
    assert.deepEqual(plain(d.getDeck()), unknown, "未知のIDも黙って捨てない");
});

test("旧カード→新カードの移行案は表示専用: 適用されず、所持・デッキ・Levelを一切変えない。対応は仕様どおり", () => {
    const w = world();
    w.ctx.ProjectRProductionTest.legacyOwner();
    const before = w.data();
    const proposal = w.prod().legacyMigrationProposal();
    assert.equal(proposal.applied, false);
    assert.deepEqual(w.data(), before);
    const by = Object.fromEntries(proposal.rows.map(r => [r.legacy, r]));
    assert.equal(by.hermes_sword_attack.proposed, "hermes_sweep");
    assert.equal(by.hermes_reed_flute_sleep.proposed, "hermes_reed_flute");
    assert.equal(by.hermes_perception_obscure.proposed, "hermes_veil");
    assert.equal(by.hermes_swift_movement.proposed, null);
    assert.equal(by.hermes_reed_flute_sleep.legacyInDeck, 2);
    assert.equal(by.hermes_reed_flute_sleep.wouldFitCopyLimit, true);
    assert.equal(by.hermes_sword_attack.legacyOwned, true);
    assert.equal(by.hermes_sword_attack.proposedOwned, false);
    for (const id of LEGACY) assert.ok(w.deck().definitions.card(id), "旧カードの定義は残っている");
});

test("登録: 新プラグイン2つが本番の順で登録され、ファイル名と一致。DEVヘルパーはPlaytest以外では何も公開しない", () => {
    const names = [];
    const config = {};
    require("node:vm").runInNewContext(read("js/plugins.js"), config);
    for (const p of config.$plugins) names.push(p.name);
    const at = n => names.indexOf(n);
    assert.ok(at("ProjectR_HermesProductionDeck") > at("ProjectR_HermesPsychopomp"));
    assert.ok(at("ProjectR_HermesProductionDeck") > at("ProjectR_MenuIntegration"));
    assert.ok(at("ProjectR_HermesProductionDeck") > at("ProjectR_CardCatalog"));
    assert.ok(at("ProjectR_HermesProductionDeck") > at("ProjectR_BattleHUD"));
    assert.ok(at("ProjectR_CombatTestArenaProduction") > at("ProjectR_HermesProductionDeck"));
    assert.equal(names.filter(n => n === "ProjectR_HermesProductionDeck").length, 1);
    for (const n of ["ProjectR_HermesProductionDeck", "ProjectR_CombatTestArenaProduction"]) {
        assert.ok(config.$plugins.find(p => p.name === n).status, n);
        assert.ok(read(`js/plugins/${n}.js`).includes("@plugindesc"), n);
    }
    const dist = buildWorld({ playtest: false });
    assert.deepEqual(dist.failures, []);
    assert.equal(dist.ctx.ProjectRProductionTest, undefined, "配布版にDEVヘルパーはない");
    assert.equal(typeof dist.ctx.ProjectRHermesProductionDeck.acquireRing, "function", "本番の入口は配布版にもある");
});

test("触れていないもの: CardDeckCore・Hendrix・rmmz_*は変更されていない。カタログはデッキを自分では適用しない", () => {
    const cp = require("node:child_process");
    const out = cp.execFileSync("git", ["diff", "--name-only", "HEAD", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/rmmz_core.js", "js/rmmz_managers.js", "js/rmmz_objects.js", "js/rmmz_scenes.js", "js/rmmz_sprites.js", "js/rmmz_windows.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js"],
        { cwd: require("./RealEngineHarness.cjs").project, encoding: "utf8" });
    assert.equal(out.trim(), "");
    const w = world();
    assert.equal(w.ctx.ProjectRCardCatalog.isFinalDeckActivated(), false, "カタログ自体は適用しない");
    assert.deepEqual(plain(w.deck().getDeck()), [], "プラグイン読み込みだけではデッキは変わらない");
});

console.log(`\n${passed} tests passed`);
