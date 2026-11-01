"use strict";
// Phase Apollo-A2: 複数の神に対応するカードカタログの基盤。Apollo 8枚の設計メタデータと予約ランタイムIDを持つが、効果は未実装で、本番では使えない。
//   正本: Template(3)(4).xlsx(SHA-256 8cb974a7...)。数値の控え = docs/ProjectR_Apollo_Workbook_Snapshot.json。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const root = path.join(__dirname, "..");
const snapshot = JSON.parse(fs.readFileSync(path.join(root, "docs/ProjectR_Apollo_Workbook_Snapshot.json"), "utf8"));

// ユーザー確定の予約ID(設計ID 8〜15の順)
const RESERVED = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const LEGACY_APOLLO = ["apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];
const COPIES = [5, 5, 2, 3, 3, 5, 3, 4];
// 黄金の矢(apollo_golden_volley)はPhase A4で実装・登録済み。残りの7枚は引き続き予約(未登録)。
const IMPLEMENTED = ["apollo_golden_volley"];
const INACTIVE = RESERVED.filter(id => !IMPLEMENTED.includes(id));
const INACTIVE_COPIES = COPIES.slice(1);
const HERMES_IDS = ["hermes_issen", "hermes_psychopomp", "hermes_veil", "hermes_strength", "hermes_sweep", "hermes_reed_flute", "hermes_zetsu"];

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.inv = () => w.ctx.ProjectRCardInventory;
    w.cat = () => w.ctx.ProjectRCardCatalog;
    // 予約カードの定義を、このテストのVMだけで一時的にレジストリへ入れる(本番では登録されない)。混成デッキ・所持・上限の検証用。
    w.registerPlanned = () => {
        for (const def of w.cat().plannedRuntimeCards("apollo")) w.deck().definitions.cards.set(def.cardId, Object.freeze(Object.assign({}, plain(def))));
    };
    return w;
}
const codes = reasons => plain(reasons).map(r => r.code);

test("予約ID: ユーザー確定の8個が設計ID 8〜15に対応し、一意・形式が正しく、旧ID・既存定義・他のIDと衝突しない(接頭辞の包含もなし)", () => {
    const w = world();
    const apollo = plain(w.cat().godDesign("apollo"));
    assert.deepEqual(apollo.map(d => d.designId), [8, 9, 10, 11, 12, 13, 14, 15]);
    assert.deepEqual(apollo.map(d => d.runtimeCardId), RESERVED);
    assert.equal(new Set(RESERVED).size, 8);
    for (const id of RESERVED) assert.match(id, /^apollo_[a-z_]+$/);
    const audit = plain(w.cat().runtimeIdAudit());
    assert.deepEqual(audit.problems, [], JSON.stringify(audit.problems));
    assert.deepEqual(audit.ids.length, 15, "Hermes 7 + Apollo 8");
    assert.equal(new Set(audit.ids).size, 15);
    const registry = new Set(w.deck().definitions.cardDefinitions().map(c => c.cardId));
    for (const id of RESERVED) { assert.equal(registry.has(id), id === "apollo_golden_volley", id + (id === "apollo_golden_volley" ? " はPhase A4で実装済み(登録)" : " は未登録")); for (const other of [...registry, ...LEGACY_APOLLO].filter(o => o !== id)) assert.ok(!other.startsWith(id) && !id.startsWith(other), `${id} と ${other} が接頭辞で重ならない`); }
    for (const id of LEGACY_APOLLO) assert.ok(registry.has(id), id + " は旧カードとして残っている");
    // リポジトリの本番コードでの出現: 予約IDはCardCatalogにだけ現れる(他のpluginが勝手に使っていない)
    const plugins = fs.readdirSync(path.join(root, "js/plugins")).filter(f => f.endsWith(".js"));
    for (const id of RESERVED) {
        const users = plugins.filter(f => fs.readFileSync(path.join(root, "js/plugins", f), "utf8").includes(id));
        // 黄金の矢(apollo_golden_volley)はPhase A4で実装済み。実装・演出の登録・DEVの入口にも現れる。残りの7枚は引き続きCardCatalogにだけ。
        if (id === "apollo_golden_volley") assert.deepEqual(users.sort(), ["ProjectR_ApolloGoldenVolley.js", "ProjectR_CardCatalog.js", "ProjectR_CharacterPresentation.js", "ProjectR_CombatTestArenaApollo.js", "ProjectR_CutIn.js", "ProjectR_GodSummonVisual.js"], id);
        else assert.deepEqual(users, ["ProjectR_CardCatalog.js"], id);
    }
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(root, "js/plugins.js"), "utf8"), config);
    const coreDefinitions = config.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions;
    for (const id of RESERVED) assert.ok(!coreDefinitions.includes(id), id + " は CardDeckCore の CardDefinitions(旧7枚)に入れない");
});

test("設計メタデータ: ワークブックの強さ・最大コピー数・Cooldown・対象タイプ・初回入手枚数・最大Lvと一致(合計30)。全8枚が標準上限の例外", () => {
    const w = world();
    const apollo = plain(w.cat().godDesign("apollo"));
    assert.equal(snapshot.sourceSha256, "8cb974a7af8e13abd43a4eb6d3f95d378b873cb5b389f89a0e69d96abd271b0f");
    assert.equal(snapshot.cards.length, 8);
    const rarity = { 強力: "strong", 通常: "normal", 特殊: "special" };
    snapshot.cards.forEach((s, i) => {
        const d = apollo[i];
        assert.deepEqual([d.designId, d.name, d.classification, d.maxCopies, d.cooldownSeconds, d.workbookTargetType, d.firstGrantCopies, d.maxLevel],
            [s.designId, s.name, rarity[s.classification], s.maxCopies, s.cooldownSeconds, s.workbookTargetType, s.firstGrantCopies, s.maxLevel], s.name);
        assert.deepEqual([d.god, d.ringId, d.implemented, d.status, d.targetTypeStatus], s.designId === 8 ? ["apollo", "apollo", true, "implemented", "confirmed"] : ["apollo", "apollo", false, "reserved", "provisional"], s.name); // 黄金の矢(設計ID 8)はPhase A4で実装済み
        assert.equal(d.copyLimitException, true, s.name + ": 標準上限(通常3/強力2/特殊1)の例外");
        assert.equal(s.designStatus, "確定"); assert.equal(s.acquisition, "初期デッキ");
    });
    assert.deepEqual(apollo.map(d => d.maxCopies), COPIES);
    assert.equal(w.cat().godTotalMaxCopies("apollo"), 30);
    assert.equal(snapshot.totalMaxCopies, 30);
    assert.ok(Object.isFrozen(w.cat().godDesign("apollo")) && Object.isFrozen(w.cat().designs()));
    assert.equal(w.cat().designs().length, 15);
    assert.deepEqual(plain(w.cat().gods()), ["hermes", "apollo"]);
});

test("Hermes は変わらない: hermesDesign()・引数なしのmigrationAudit()・30枚デッキ・設計IDと予約IDの対応は従来どおり", () => {
    const w = world();
    const hermes = plain(w.cat().hermesDesign());
    assert.deepEqual(hermes.map(d => d.runtimeCardId), HERMES_IDS);
    assert.ok(hermes.every(d => d.implemented && d.god === "hermes" && d.ringId === "hermes"));
    assert.equal(w.cat().hermesTotalMaxCopies(), 30);
    assert.equal(w.cat().migrationAudit().length, 7, "引数なしはHermesの7件のまま");
    assert.equal(w.cat().isFinalDeckReady(), true);
    assert.equal(plain(w.cat().buildFinalHermesDeck()).length, 30);
    assert.deepEqual(plain(w.cat().godDesign("hermes")), hermes);
    assert.equal(w.cat().isGodDeckReady("hermes"), true);
    assert.deepEqual(plain(w.cat().buildGodDeck("hermes")), plain(w.cat().buildFinalHermesDeck()));
    assert.deepEqual(plain(w.cat().registeredRuntimeCards()), ["hermes_zetsu", "hermes_sweep", "hermes_reed_flute", "hermes_issen", "hermes_strength", "hermes_veil", "hermes_psychopomp", "apollo_golden_volley"], "登録されるのはHermesの7枚 + 実装済みの黄金の矢(A4)だけ");
    const status = plain(w.cat().godStatus("apollo"));
    assert.deepEqual([status.count, status.totalMaxCopies, status.implemented, status.reserved, status.ready], [8, 30, 1, 7, false]);
    assert.equal(w.cat().isGodDeckReady("apollo"), false);
    assert.equal(w.cat().buildGodDeck("apollo"), null, "未実装の間はApolloの30枚デッキを組み立てない");
    assert.deepEqual(plain(w.cat().godDesign("nobody")), []);
});

test("未実装カードは本番で使えない: レジストリに無く、所持・付与・デッキ・Deck Builder・初期セット・戦闘のどこからも入らない", () => {
    const w = world();
    const d = w.deck(), inv = w.inv();
    assert.deepEqual(plain(w.cat().inactiveRuntimeCards()), INACTIVE);
    for (const id of INACTIVE) assert.equal(d.definitions.card(id), null, id);
    const cardList = d.definitions.cardDefinitions().map(c => c.cardId);
    assert.equal(cardList.length, 15, "旧7(Hermes旧4+Apollo旧3) + 新Hermes 7 + 黄金の矢(A4)");
    // 所持・付与
    for (const id of INACTIVE) {
        assert.equal(d.setCardOwned(id, true).ok, false, "解放できない: " + id);
        assert.equal(inv.grantCopies(id, 1, { source: "t" }).ok, false, "枚数付与できない: " + id);
        assert.equal(d.isCardOwned(id), false);
    }
    const bundle = inv.grantBundle("t.bundle", { apollo_oracle: 1, hermes_issen: 1 }, { source: "t" });
    assert.equal(bundle.ok, false, "予約カードを含む束は全体が拒否される(原子的)");
    assert.equal(inv.getOwnedCopies("hermes_issen"), 0, "束の他のカードも付与されない");
    assert.equal(inv.hasReward("t.bundle"), false);
    // プラグインコマンド経由
    const cmd = (plugin, name, args) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), plugin, name, args);
    cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "apollo_oracle", copies: "3", rewardId: "" });
    assert.equal(inv.getOwnedCopies("apollo_oracle"), 0);
    // デッキ
    const reasons = codes(d.getDeckInvalidReasons(RESERVED));
    assert.ok(reasons.includes("INVALID_CARD_ID"), reasons.join());
    assert.equal(d.isDeckValid(RESERVED), false);
    // 指輪を持っても何も付与されない(Apolloの指輪を渡しても予約カードは増えない)
    assert.equal(d.assignRingToPlayer("apollo").ok, true);
    for (const id of RESERVED) assert.equal(d.isCardOwned(id), false);
    // 初期セット(Hermes)はHermesの7枚30枚だけ。Apolloは含まない
    const starter = plain(w.ctx.ProjectRHermesProductionDeck.starterSet()).map(c => c.cardId);
    assert.deepEqual(starter.sort(), HERMES_IDS.slice().sort());
    assert.equal(starter.some(id => id.startsWith("apollo_")), false);
    // Deck Builder の一覧(MenuCoreがレジストリから自動生成)に予約カードは出ない
    // (所持しているカードだけが一覧に出る。旧Apollo 3枚を所持して指輪も持つ状態で、予約カードが混ざらないこと、登録すれば出る仕組みであることを確かめる)
    for (const id of LEGACY_APOLLO) assert.equal(inv.grantCopies(id, 1, { source: "t" }).ok, true, id);
    const listed = plain(w.ctx.ProjectRMenuCore.deck.collection({})).map(c => c.cardId);
    assert.deepEqual(listed.filter(id => id.startsWith("apollo_")).sort(), LEGACY_APOLLO.slice().sort(), "Deck Builderに出るApolloは旧3枚だけ");
    for (const id of RESERVED) assert.ok(!listed.includes(id), id);
    const w9 = world(); w9.registerPlanned(); w9.deck().assignRingToPlayer("apollo");
    assert.equal(w9.inv().grantCopies("apollo_oracle", 1, { source: "t" }).ok, true);
    assert.ok(plain(w9.ctx.ProjectRMenuCore.deck.collection({})).some(c => c.cardId === "apollo_oracle"), "登録して所持すれば一覧に出る(=登録しないことが門番)");
    // 「定義すればこうなる」データ(plannedRuntimeCards)はあるが、登録はされない
    const planned = plain(w.cat().plannedRuntimeCards("apollo"));
    assert.deepEqual(planned.map(p => p.cardId), INACTIVE, "予約のまま残るのは7枚(実装済みの黄金の矢は含まない)");
    assert.deepEqual(planned.map(p => p.maxCopies), INACTIVE_COPIES);
    assert.ok(planned.every(p => p.ringId === "apollo" && p.maxLevel === 3));
    assert.deepEqual(plain(w.cat().plannedRuntimeCards("hermes")), []);
    assert.deepEqual(plain(w.cat().inactiveRuntimeCards()), INACTIVE, "上の操作の後も未登録のまま");
});

test("カード単位のコピー上限: 予約定義を一時登録すると、ワークブックの最大コピー数(5/5/2/3/3/5/3/4)がデッキ検証の上限になる", () => {
    const w = world(); w.registerPlanned();
    const d = w.deck(), inv = w.inv();
    assert.equal(d.assignRingToPlayer("apollo").ok, true);
    RESERVED.forEach((id, i) => {
        assert.equal(d.definitions.card(id).maxCopies, COPIES[i], id);
        assert.equal(inv.grantCopies(id, 10, { source: "t" }).ok, true); // 付与は解放も兼ねる
        assert.equal(d.isCardOwned(id), true, id);
        assert.equal(inv.getOwnedCopies(id), 10, id + ": 所持は上限を超えて持てる");
        assert.equal(inv.getDeckLimit(id), COPIES[i], id + ": デッキに入る数 = min(所持, 上限)");
        const over = Array(COPIES[i] + 1).fill(id);
        assert.ok(codes(d.getDeckInvalidReasons(over)).includes("MAX_COPIES_EXCEEDED"), id + " は上限+1枚で超過");
        assert.ok(!codes(d.getDeckInvalidReasons(Array(COPIES[i]).fill(id))).includes("MAX_COPIES_EXCEEDED"), id + " は上限ちょうどなら超過しない");
    });
    // 所持が上限より少なければ、そちらが上限(物理所持)
    const w2 = world(); w2.registerPlanned(); w2.deck().assignRingToPlayer("apollo");
    w2.inv().grantCopies("apollo_golden_volley", 3, { source: "t" });
    assert.equal(w2.inv().getDeckLimit("apollo_golden_volley"), 3);
    assert.ok(codes(w2.inv().validateDeck(Array(4).fill("apollo_golden_volley"))).length > 0, "所持3枚でデッキ4枚は不可");
});

test("混成デッキと指輪の所有: Hermes + Apolloの30枚デッキが有効。Apolloの指輪を手放すとApolloのカードだけが使えず、保存デッキは30枚のまま残る", () => {
    const w = world(); w.registerPlanned();
    const d = w.deck(), inv = w.inv();
    assert.equal(d.assignRingToPlayer("hermes").ok, true); assert.equal(d.assignRingToPlayer("apollo").ok, true);
    const mixed = [].concat(Array(5).fill("hermes_zetsu"), Array(10).fill("hermes_strength"), Array(5).fill("apollo_golden_volley"), Array(5).fill("apollo_eros_arrow"), Array(5).fill("apollo_gigas_slayer"));
    assert.equal(mixed.length, 30);
    for (const id of new Set(mixed)) { assert.equal(d.setCardOwned(id, true).ok, true); assert.equal(inv.grantCopies(id, 10, { source: "t" }).ok, true); }
    assert.deepEqual(codes(d.getDeckInvalidReasons(mixed)), [], "混成30枚は有効");
    assert.equal(d.setDeck(mixed).ok, true);
    assert.deepEqual(plain(inv.validateDeck(mixed)), [], "所持枚数の検証も通る");
    // Apolloだけの30枚(最大コピー数の合計 = 30 で一意の構成)
    const apolloOnly = RESERVED.flatMap((id, i) => Array(COPIES[i]).fill(id));
    assert.equal(apolloOnly.length, 30);
    for (const id of RESERVED) { d.setCardOwned(id, true); inv.grantCopies(id, 10, { source: "t" }); }
    assert.deepEqual(codes(d.getDeckInvalidReasons(apolloOnly)), [], "Apolloだけの30枚も有効");
    // 指輪の所有: Apolloの指輪を持たない(未所持/仲間に渡す)と、Apolloのカードは使えない。保存デッキは消えない
    assert.equal(d.setRingUnowned("apollo").ok, true);
    const reasons = plain(d.getDeckInvalidReasons(mixed)).filter(r => r.code === "REQUIRED_RING_NOT_OWNED");
    assert.equal(reasons.length, 15, "Apolloのカード15枚だけが指輪不足");
    assert.ok(reasons.every(r => r.ringId === "apollo" && r.cardId.startsWith("apollo_")));
    assert.equal(plain(d.getDeck()).length, 30, "保存デッキは自動で削らない");
    assert.equal(d.assignRingToPlayer("apollo").ok, true);
    assert.deepEqual(codes(d.getDeckInvalidReasons(mixed)), [], "指輪を戻せばそのまま有効");
    // 31枚・29枚は従来どおり無効
    assert.ok(codes(d.getDeckInvalidReasons(mixed.concat("hermes_zetsu"))).includes("INVALID_DECK_SIZE"));
});

test("旧Apolloは触らない: 旧3枚の定義・所持・Level・保存デッキは新Apolloの予約/登録後も不変で、自動変換されない", () => {
    const w = world();
    const d = w.deck();
    const before = LEGACY_APOLLO.map(id => plain(d.definitions.card(id)));
    assert.deepEqual(before.map(c => [c.cardId, c.maxCopies, c.cooldownSeconds, c.rarity, c.targetType]),
        [["apollo_golden_arrow", 3, 4, "normal", "direction"], ["apollo_plague_attack", 2, 12, "strong", "direction"], ["apollo_lyre_calm", 3, 10, "normal", "ally"]]);
    // 旧セーブ相当: 旧Apolloを所持・保存デッキに持つ + 将来の新ID(未登録)が保存デッキに入っている
    const raw = { version: 1, cardOwnership: Object.fromEntries(LEGACY_APOLLO.map((id, i) => [id, { owned: true, level: 1 + i }])), ringOwnershipState: { hermes: "player", apollo: "player" },
        ultimateSelection: { ringId: "apollo" }, deckDefinition: { cardIds: [...LEGACY_APOLLO, "apollo_golden_volley", "apollo_oracle"] } };
    const normalized = plain(d.normalizePersistentData(JSON.parse(JSON.stringify(raw)), d.definitions));
    LEGACY_APOLLO.forEach((id, i) => assert.deepEqual(normalized.cardOwnership[id], { owned: true, level: 1 + i }, id));
    assert.deepEqual(normalized.deckDefinition.cardIds, [...LEGACY_APOLLO, "apollo_golden_volley", "apollo_oracle"], "保存デッキは書き換えない(未登録の新IDも保持され、検証で失敗として報告される)");
    for (const id of RESERVED) assert.equal(normalized.cardOwnership[id], undefined, "新Apolloを勝手に所持にしない");
    // 旧所持が新IDに影響しない/新IDの付与が旧に影響しない(登録した世界で確認)
    const w2 = world(); w2.registerPlanned(); w2.deck().assignRingToPlayer("apollo");
    w2.inv().grantCopies("apollo_golden_arrow", 2, { source: "t" });
    assert.equal(w2.inv().getOwnedCopies("apollo_golden_volley"), 0, "旧を持っていても新は0枚");
    w2.inv().grantCopies("apollo_golden_volley", 5, { source: "t" });
    assert.equal(w2.inv().getOwnedCopies("apollo_golden_arrow"), 2, "新を持っていても旧は不変");
    assert.equal(w2.deck().definitions.card("apollo_golden_arrow").maxCopies, 3);
    // 移行の対応: 黄金の矢/疫病の矢/竪琴だけが旧カード候補を持ち、判断待ち(共存)。ほかは新規。自動変換の記録は無い
    const audit = plain(w.cat().migrationAudit("apollo"));
    assert.equal(audit.length, 8);
    const by = Object.fromEntries(audit.map(a => [a.runtimeCardId, a]));
    assert.deepEqual([by.apollo_golden_volley.legacyCardId, by.apollo_golden_volley.decision], ["apollo_golden_arrow", "coexist-pending"]);
    assert.deepEqual([by.apollo_plague_rain.legacyCardId, by.apollo_plague_rain.decision], ["apollo_plague_attack", "coexist-pending"]);
    assert.deepEqual([by.apollo_lyre_rhythm.legacyCardId, by.apollo_lyre_rhythm.decision], ["apollo_lyre_calm", "coexist-pending"]);
    for (const id of ["apollo_eros_arrow", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle"]) assert.deepEqual([by[id].legacyCardId, by[id].decision], [null, "new"], id);
    assert.ok(audit.filter(a => a.runtimeCardId !== "apollo_golden_volley").every(a => a.implemented === false && a.status === "reserved-not-implemented"));
    assert.deepEqual([by.apollo_golden_volley.implemented, by.apollo_golden_volley.status], [true, "implemented-as-new-id"], "黄金の矢はPhase A4で実装済み(旧カードとは別IDで共存)");
    const unmapped = plain(w.cat().unmappedLegacyCards()).filter(c => c.cardId.startsWith("apollo_"));
    assert.deepEqual(unmapped.map(c => c.cardId).sort(), LEGACY_APOLLO.slice().sort(), "旧3枚は引き続き一覧にある");
});

test("セーブ/ロード: 登録した状態の混成デッキ・所持・Levelは往復で保たれる。未登録の状態でも保存デッキの新IDは消えない", () => {
    const w = world(); w.registerPlanned();
    const d = w.deck(), inv = w.inv();
    d.assignRingToPlayer("hermes"); d.assignRingToPlayer("apollo");
    const deckIds = [].concat(Array(5).fill("hermes_zetsu"), Array(10).fill("hermes_strength"), Array(5).fill("apollo_golden_volley"), Array(5).fill("apollo_eros_arrow"), Array(5).fill("apollo_gigas_slayer"));
    for (const id of new Set(deckIds)) { inv.grantCopies(id, 12, { source: "t" }); }
    d.setCardLevel("apollo_eros_arrow", 3);
    assert.equal(d.setDeck(deckIds).ok, true);
    const roundTrip = () => {
        const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
        return json;
    };
    const snap = () => plain({ deck: w.deck().getDeck(), copies: Object.fromEntries(["apollo_golden_volley", "apollo_eros_arrow", "hermes_zetsu"].map(id => [id, w.inv().getOwnedCopies(id)])),
        level: w.deck().getPersistentData().cardOwnership.apollo_eros_arrow, rings: w.deck().getPersistentData().ringOwnershipState });
    const before = snap();
    roundTrip(); roundTrip();
    assert.deepEqual(snap(), before, "往復しても同じ(増えも減りもしない)");
    assert.deepEqual(codes(w.deck().getDeckInvalidReasons()), [], "復元後も混成デッキは有効");
    // 予約カードを登録していない世界(いまの本番)でロードしても、保存デッキの新IDは書き換えない
    const data = JSON.parse(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()));
    const w3 = world();
    const json3 = w3.ctx.JsonEx.stringify(data);
    w3.ctx.DataManager.createGameObjects();
    w3.ctx.DataManager.extractSaveContents(w3.ctx.JsonEx.parse(json3));
    assert.deepEqual(plain(w3.deck().getDeck()), deckIds, "未登録でも保存デッキのIDは保持される");
    assert.ok(codes(w3.deck().getDeckInvalidReasons()).includes("INVALID_CARD_ID"), "使えない(未登録)として検証で報告される");
});

test("既存基盤の再利用: 累積Lv規則(resolveLevels)・バランスJSON・属性窓口をそのまま使う。重複した仕組みは作らない", () => {
    const w = world();
    // 累積Lv + 数値置換(Apollo黄金の矢の本数の例。設定ではなくテスト内の行)
    const rows = [{ level: 1, effects: { arrows: 3, spread: 15 } }, { level: 2, effects: { arrows: 5 } }, { level: 3, effects: { arrows: 11, spread: 10 } }];
    assert.deepEqual(plain(w.cat().resolveLevels(rows, 2)), { arrows: 5, spread: 15 });
    assert.deepEqual(plain(w.cat().resolveLevels(rows, 3)), { arrows: 11, spread: 10 });
    // バランスJSONは実装済みの8枚だけ(Hermes 7 + 黄金の矢(A4))。予約のままの7枚の数値は、各カードの実装Phaseで仕様が確定してから追加する。
    const balance = w.ctx.ProjectRCardBalance;
    assert.deepEqual(plain(balance.cardIds()).sort(), [...HERMES_IDS, "apollo_golden_volley"].sort());
    for (const id of INACTIVE) assert.equal(balance.hasCard(id), false);
    assert.equal(balance.validate("apollo_oracle", "cooldown", "cooldownSeconds", 3).reason, "unknownCard");
    assert.equal(typeof w.ctx.ProjectRElements.fixedFactor, "function");
    // 新しい在庫・デッキ・セーブの仕組みは増えていない(神ごとの別ストアなし)
    const system = w.ctx.DataManager.makeSaveContents().system;
    const keys = Object.keys(system).filter(k => /^_projectR/.test(k)).sort();
    assert.ok(!keys.some(k => /apollo/i.test(k)), "Apollo専用のセーブ領域は無い: " + keys.join());
});

test("設計の控えと文書: 控えのJSONが正本のSHA-256と範囲を持ち、監査文書が最終のIDを載せている。Chromium 85構文", () => {
    assert.equal(snapshot.sheet, "カード一覧"); assert.equal(snapshot.rows, "9-16");
    const doc = fs.readFileSync(path.join(root, "docs/ProjectR_ApolloCardDesignAudit_A0.md"), "utf8");
    for (const id of RESERVED) assert.ok(doc.includes("`" + id + "`"), "監査文書に " + id);
    const source = fs.readFileSync(path.join(root, "js/plugins/ProjectR_CardCatalog.js"), "utf8");
    assert.doesNotMatch(source, /\?\?=|\|\|=|&&=|\.at\(|\(\?<[=!]|\bstructuredClone\b|\.replaceAll\(|Object\.hasOwn\(/);
});

console.log(`${passed} Apollo A2 tests passed`);
