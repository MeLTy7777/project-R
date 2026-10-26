"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const pluginPath = path.join(__dirname, "..", "js", "plugins", "ProjectR_CardDeckCore.js");
const api = require(pluginPath);
const { DefinitionRegistry, CardDeckService, BattleDeckSession, InvalidReason } = api;

let passed = 0;
const test = (name, body) => {
    body();
    passed++;
    console.log(`ok ${passed} - ${name}`);
};

const cards = [
    { cardId: "A", ringId: "R1", maxCopies: 30, cooldownSeconds: 100, maxLevel: 5, rarity: "normal", category: "attack", targetType: "direction" },
    { cardId: "B", ringId: "R2", maxCopies: 20, cooldownSeconds: 3, maxLevel: 3, rarity: "strong", category: "magic", targetType: "ground" },
    { cardId: "C", ringId: "R3", maxCopies: 1, cooldownSeconds: 1, maxLevel: 1, rarity: "special", category: "heal", targetType: "ally" },
    { cardId: "D", ringId: "R1", maxCopies: 3, cooldownSeconds: 2, maxLevel: 2, rarity: "normal", category: "buff", targetType: "instant" }
];
const rings = [
    { ringId: "R1", godId: "G1", equipActorIds: [2], initialOwner: "player" },
    { ringId: "R2", godId: "G2", equipActorIds: [3], initialOwner: "player" },
    { ringId: "R3", godId: "G3", equipActorIds: [2], initialOwner: "unowned" }
];
const definitions = new DefinitionRegistry(cards, rings);
const validDeck = [...Array(15).fill("A"), ...Array(15).fill("B")];

const makeService = () => {
    const service = new CardDeckService(definitions);
    for (const card of cards) service.setCardOwned(card.cardId, true);
    service.setDeck(validDeck);
    return service;
};

const reasonCodes = reasons => reasons.map(reason => reason.code);

test("デッキは30枚ちょうどだけ有効", () => {
    const service = makeService();
    assert.equal(service.isDeckValid(validDeck), true);
    assert.ok(reasonCodes(service.deckInvalidReasons(validDeck.slice(0, 29))).includes(InvalidReason.INVALID_DECK_SIZE));
});

test("無効デッキでは戦闘用デッキを開始しない", () => {
    const battle = new BattleDeckSession(makeService(), () => 0.5);
    const result = battle.start(validDeck.slice(0, 29));
    assert.equal(result.ok, false);
    assert.equal(battle.snapshot(), null);
    assert.ok(reasonCodes(result.reasons).includes(InvalidReason.INVALID_DECK_SIZE));
});

test("複数指輪のカードを混在できる", () => {
    const service = makeService();
    assert.equal(service.hasPlayerRing("R1"), true);
    assert.equal(service.hasPlayerRing("R2"), true);
    assert.equal(service.isDeckValid(validDeck), true);
});

test("主人公が未所持の指輪カードは無効", () => {
    const service = makeService();
    service.setRingUnowned("R2");
    assert.equal(service.canUseCard("B"), false);
    assert.ok(reasonCodes(service.cardInvalidReasons("B")).includes(InvalidReason.REQUIRED_RING_NOT_OWNED));
});

test("指輪を味方へ渡すとカードは無効になるがデッキは保持", () => {
    const service = makeService();
    const before = service.deck();
    assert.equal(service.assignRingToActor("R2", 3).ok, true);
    assert.equal(service.canUseCard("B"), false);
    assert.deepEqual(service.deck(), before);
});

test("主人公が手放した指輪のUltimate指定を解除", () => {
    const service = makeService();
    assert.equal(service.setUltimateRing("R2").ok, true);
    assert.equal(service.ultimateRingId(), "R2");
    service.assignRingToActor("R2", 3);
    assert.equal(service.ultimateRingId(), null);
    assert.equal(service.setUltimateRing("R3").ok, false);
});

test("味方1人につき指輪は1個まで", () => {
    const service = makeService();
    assert.equal(service.assignRingToActor("R1", 2).ok, true);
    const result = service.assignRingToActor("R3", 2);
    assert.equal(result.ok, false);
    assert.ok(reasonCodes(result.reasons).includes(InvalidReason.ACTOR_RING_LIMIT));
});

test("味方ごとの装備可能指輪を検証", () => {
    const service = makeService();
    assert.equal(service.canActorEquipRing("R1", 2), true);
    assert.equal(service.canActorEquipRing("R2", 2), false);
    assert.ok(reasonCodes(service.actorEquipReasons("R2", 2)).includes(InvalidReason.ACTOR_NOT_ALLOWED));
});

test("同一カード枚数上限をカード定義から検証", () => {
    const service = makeService();
    const deck = [...Array(4).fill("D"), ...Array(26).fill("A")];
    const reasons = service.deckInvalidReasons(deck);
    const copyReason = reasons.find(reason => reason.code === InvalidReason.MAX_COPIES_EXCEEDED);
    assert.deepEqual(copyReason, { code: InvalidReason.MAX_COPIES_EXCEEDED, cardId: "D", actual: 4, maximum: 3 });
});

test("無効理由APIは未所持カード・不正ID・指輪未所持を区別", () => {
    const service = makeService();
    service.setCardOwned("C", false);
    assert.ok(reasonCodes(service.cardInvalidReasons("C")).includes(InvalidReason.CARD_NOT_OWNED));
    assert.ok(reasonCodes(service.cardInvalidReasons("C")).includes(InvalidReason.REQUIRED_RING_NOT_OWNED));
    assert.ok(reasonCodes(service.cardInvalidReasons("missing")).includes(InvalidReason.INVALID_CARD_ID));
});

test("戦闘開始時に30個の一意Instanceを作り5枚ドロー", () => {
    const battle = new BattleDeckSession(makeService(), () => 0.5);
    const result = battle.start(validDeck);
    assert.equal(result.ok, true);
    assert.equal(result.state.hand.length, 5);
    assert.equal(result.state.drawPile.length, 25);
    const all = [...result.state.hand, ...result.state.drawPile];
    assert.equal(new Set(all.map(card => card.instanceId)).size, 30);
});

test("使用カードをCooldownへ移し即座に1枚補充", () => {
    const battle = new BattleDeckSession(makeService(), () => 0.5);
    battle.start(validDeck);
    const used = battle.snapshot().hand[0];
    const result = battle.use(used.instanceId);
    assert.equal(result.ok, true);
    assert.equal(result.state.hand.length, 5);
    assert.equal(result.state.drawPile.length, 24);
    assert.equal(result.state.cooldownPile[0].instance.instanceId, used.instanceId);
});

test("Cooldown終了後に捨て札へ移動", () => {
    const battle = new BattleDeckSession(makeService(), () => 0.5);
    battle.start(validDeck);
    const card = battle.snapshot().hand.find(entry => entry.cardId === "B");
    battle.use(card.instanceId);
    assert.equal(battle.updateCooldown(2).state.cooldownPile.length, 1);
    const finished = battle.updateCooldown(1).state;
    assert.equal(finished.cooldownPile.length, 0);
    assert.equal(finished.discardPile.length, 1);
});

test("山札0では捨て札だけ再シャッフルしCooldown中を含めない", () => {
    const service = makeService();
    const deck = Array(30).fill("A");
    service.setDeck(deck);
    const battle = new BattleDeckSession(service, () => 0.25);
    battle.start(deck);
    battle.use(battle.snapshot().hand[0].instanceId);
    battle.updateCooldown(100);
    for (let count = 0; count < 24; count++) battle.use(battle.snapshot().hand[0].instanceId);
    const beforeRebuild = battle.snapshot();
    assert.equal(beforeRebuild.drawPile.length, 0);
    assert.equal(beforeRebuild.discardPile.length, 1);
    assert.equal(beforeRebuild.cooldownPile.length, 24);
    const rebuilt = battle.use(beforeRebuild.hand[0].instanceId).state;
    assert.equal(rebuilt.hand.length, 5);
    assert.equal(rebuilt.cooldownPile.length, 25);
    assert.equal(rebuilt.discardPile.length, 0);
    assert.equal(rebuilt.drawPile.length, 0);
});

test("補充可能カードがなければ手札5枚未満を許可", () => {
    const service = makeService();
    const deck = Array(30).fill("A");
    const battle = new BattleDeckSession(service, () => 0.5);
    battle.start(deck);
    for (let count = 0; count < 26; count++) battle.use(battle.snapshot().hand[0].instanceId);
    const state = battle.snapshot();
    assert.equal(state.hand.length, 4);
    assert.equal(state.drawPile.length, 0);
    assert.equal(state.discardPile.length, 0);
    assert.equal(state.cooldownPile.length, 26);
});

test("同一cardId複数枚もInstance IDで識別", () => {
    const service = makeService();
    const battle = new BattleDeckSession(service, () => 0.5);
    const state = battle.start(Array(30).fill("A")).state;
    assert.equal(new Set(state.hand.map(card => card.instanceId)).size, 5);
    assert.equal(new Set(state.hand.map(card => card.cardId)).size, 1);
});

test("カード所持・Level・デッキ・指輪・Ultimateを保存復元", () => {
    const service = makeService();
    service.setCardLevel("A", 4);
    service.assignRingToActor("R2", 3);
    service.setUltimateRing("R1");
    const loaded = new CardDeckService(definitions, JSON.parse(JSON.stringify(service.exportPersistentData())));
    assert.deepEqual(loaded.cardOwnership("A"), { owned: true, level: 4 });
    assert.deepEqual(loaded.deck(), validDeck);
    assert.equal(loaded.ringOwner("R2"), "actor:3");
    assert.equal(loaded.ultimateRingId(), "R1");
});

test("Card Levelを定義上限へ収める", () => {
    const service = makeService();
    service.setCardLevel("A", 99);
    assert.equal(service.cardOwnership("A").level, 5);
});

test("戦闘一時データを恒久データへ混入しない", () => {
    const service = makeService();
    const before = service.exportPersistentData();
    const battle = new BattleDeckSession(service, () => 0.5);
    battle.start(validDeck);
    battle.use(battle.snapshot().hand[0].instanceId);
    assert.deepEqual(service.exportPersistentData(), before);
    assert.equal("drawPile" in service.exportPersistentData(), false);
});

test("旧セーブに新規データがなくても安全な初期値を生成", () => {
    const service = new CardDeckService(definitions, { unrelatedOldData: 1 });
    assert.deepEqual(service.deck(), []);
    assert.equal(service.ultimateRingId(), null);
    assert.equal(service.ringOwner("R1"), "player");
    assert.equal(service.isCardOwned("A"), false);
});

test("旧形式の保存項目を現行形式へ移行", () => {
    const service = new CardDeckService(definitions, {
        cards: { A: { owned: true, level: 3 } },
        ringOwnership: { R1: "actor:2" },
        ultimateRingId: "R2",
        deck: validDeck
    });
    assert.deepEqual(service.cardOwnership("A"), { owned: true, level: 3 });
    assert.equal(service.ringOwner("R1"), "actor:2");
    assert.equal(service.ultimateRingId(), "R2");
    assert.deepEqual(service.deck(), validDeck);
});

test("MZ統合時も既存Action Combat APIを上書きせず旧セーブを補完", () => {
    const source = fs.readFileSync(pluginPath, "utf8");
    const sentinel = () => "action-combat";
    class Game_System {
        initialize() {
            this.baseInitialized = true;
        }
    }
    const context = {
        console,
        PluginManager: { parameters: () => ({ CardDefinitions: "[]", RingDefinitions: "[]" }) },
        Game_System,
        DataManager: {
            extractSaveContents(contents) {
                context.$gameSystem = contents.system;
            }
        },
        checkCollide: sentinel,
        $gameSystem: null,
        module: { exports: {} },
        exports: {}
    };
    context.globalThis = context;
    vm.runInNewContext(source, context, { filename: pluginPath });
    const system = new context.Game_System();
    system.initialize();
    assert.equal(system.baseInitialized, true);
    assert.ok(system._projectRCardDeckData);
    assert.equal(context.checkCollide, sentinel);
    context.DataManager.extractSaveContents({ system: {} });
    assert.ok(context.$gameSystem._projectRCardDeckData);
    assert.equal(context.ProjectRCardDeck.getBattleState(), null);
});

test("ゲーム公開APIは戦闘中の指輪移動を禁止", () => {
    const source = fs.readFileSync(pluginPath, "utf8");
    const cardDefinitions = JSON.stringify(Array(30).fill(0).map((_value, index) => JSON.stringify({
        cardId: `C${index + 1}`,
        ringId: "R1",
        maxCopies: "1",
        cooldownSeconds: "1",
        maxLevel: "1",
        rarity: "normal",
        category: "attack",
        targetType: "instant"
    })));
    const ringDefinitions = JSON.stringify([JSON.stringify({
        ringId: "R1",
        godId: "G1",
        equipActorIds: "[\"2\"]",
        initialOwner: "player"
    })]);
    class Game_System {
        initialize() {}
    }
    const context = {
        console,
        PluginManager: { parameters: () => ({ CardDefinitions: cardDefinitions, RingDefinitions: ringDefinitions }) },
        Game_System,
        DataManager: { extractSaveContents() {} },
        $gameSystem: null,
        $gameParty: { inBattle: () => false },
        module: { exports: {} },
        exports: {},
        Math,
        JSON
    };
    context.globalThis = context;
    vm.runInNewContext(source, context, { filename: pluginPath });
    context.$gameSystem = new context.Game_System();
    context.$gameSystem.initialize();
    const publicApi = context.ProjectRCardDeck;
    const deck = Array.from({ length: 30 }, (_value, index) => `C${index + 1}`);
    for (const cardId of deck) publicApi.setCardOwned(cardId, true);
    publicApi.setDeck(deck);
    assert.equal(publicApi.canStartBossBattle(), true);
    assert.equal(publicApi.startBattle().ok, true);
    const blocked = publicApi.assignRingToActor("R1", 2);
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reasons[0].code, InvalidReason.RING_TRANSFER_DURING_BATTLE);
    assert.equal(publicApi.getRingOwner("R1"), "player");
    publicApi.endBattle();
    assert.equal(publicApi.assignRingToActor("R1", 2).ok, true);
});

console.log(`# ${passed} tests passed`);
