"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const configuration = {};
vm.runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), configuration);
const registrations = configuration.$plugins.filter(entry => entry.name === "ProjectR_CardDeckCore");
assert.equal(registrations.length, 1);
assert.equal(registrations[0].status, true);
const parameters = registrations[0].parameters;

function loadGame(testParameters = parameters) {
    const context = {
        PluginManager: { parameters: name => name === "ProjectR_CardDeckCore" ? testParameters : {} },
        Game_System: function() {},
        $gameParty: { inBattle: () => false },
        DataManager: {
            makeSaveContents() { return { system: context.$gameSystem }; },
            extractSaveContents(contents) { context.$gameSystem = contents.system; }
        }
    };
    context.Game_System.prototype.initialize = function() { this.existingSaveValue = 42; };
    vm.runInNewContext(fs.readFileSync(path.join(project, "js/plugins/ProjectR_CardDeckCore.js"), "utf8"), context);
    context.$gameSystem = new context.Game_System();
    context.$gameSystem.initialize();
    return context;
}
const plain = value => JSON.parse(JSON.stringify(value));
const cardIds = ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure",
    "hermes_sword_attack", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];
const realCards = JSON.parse(parameters.CardDefinitions).map(JSON.parse);
// 7実カードの上限合計は19枚。通常/強力/特殊の一時定義11枚分をテスト内だけで補う。
const fixtureCards = ["normal", "strong", "special", "normal", "strong"].map((rarity, index) => ({
    cardId: `test_only_${index}`, ringId: index % 2 ? "apollo" : "hermes",
    maxCopies: { normal: 3, strong: 2, special: 1 }[rarity],
    cooldownSeconds: 1, maxLevel: 3, rarity, category: "test_only", targetType: "instant"
}));
const testParameters = { ...parameters,
    CardDefinitions: JSON.stringify([...realCards, ...fixtureCards].map(card => JSON.stringify(card))) };
const deck = [...realCards, ...fixtureCards].flatMap(card => Array(Number(card.maxCopies)).fill(card.cardId));
function preparedGame(useFixtures = true) {
    const game = loadGame(useFixtures ? testParameters : parameters);
    const api = game.ProjectRCardDeck;
    assert.equal(api.assignRingToPlayer("hermes").ok, true);
    assert.equal(api.assignRingToPlayer("apollo").ok, true);
    api.definitions.cardDefinitions().forEach(card => assert.equal(api.setCardOwned(card.cardId).ok, true));
    api.setDeck(useFixtures ? deck : realCards.flatMap(card => Array(Number(card.maxCopies)).fill(card.cardId)));
    return game;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("実際のplugins.jsから5指輪と5神を識別", () => {
    const rings = loadGame().ProjectRCardDeck.definitions.ringDefinitions();
    assert.deepEqual(plain(rings.map(ring => ring.ringId)), ["hermes", "apollo", "janus", "themis", "athena"]);
    assert.equal(new Set(rings.map(ring => ring.godId)).size, 5);
    for (const ring of rings) {
        assert.equal(ring.godId, ring.ringId);
        assert.equal(ring.equipActorIds.length, 0);
    }
});
test("Hermes4種・Apollo3種が必要指輪と定義項目を持つ", () => {
    const definitions = loadGame().ProjectRCardDeck.definitions;
    assert.deepEqual(plain(definitions.cardDefinitions().map(card => card.cardId)), cardIds);
    for (const id of cardIds) {
        const card = definitions.card(id);
        assert.equal(card.ringId, id.startsWith("hermes_") ? "hermes" : "apollo");
        assert.equal(card.maxCopies, { normal: 3, strong: 2, special: 1 }[card.rarity]);
        assert.equal(card.maxLevel, 3);
        assert.ok(card.cooldownSeconds > 0);
        assert.ok(card.rarity && card.category);
        assert.ok(["instant", "direction", "ground", "ally"].includes(card.targetType));
        assert.equal("damage" in card, false);
    }
});
test("本番初期状態は5指輪・7カードとも未所持、デッキ空", () => {
    const api = loadGame().ProjectRCardDeck;
    api.definitions.ringDefinitions().forEach(ring => assert.equal(api.getRingOwner(ring.ringId), "unowned"));
    cardIds.forEach(id => assert.equal(api.isCardOwned(id), false));
    assert.equal(api.getDeck().length, 0);
    assert.equal(api.getUltimateRingId(), null);
});
test("テスト専用一時定義を補ったHermes＋Apollo混成30枚デッキが成立", () => {
    const api = preparedGame().ProjectRCardDeck;
    assert.equal(api.getDeck().length, 30);
    assert.equal(api.isDeckValid(), true);
    assert.equal(api.canStartBossBattle(), true);
    assert.equal(api.getDeckInvalidReasons().length, 0);
    assert.equal(api.startBattle().state.hand.length, 5);
    assert.equal(api.getBattleState().drawPile.length, 25);
});
test("Apollo指輪を外すとApolloだけ無効、保存デッキ維持、戻すと復旧", () => {
    const api = preparedGame().ProjectRCardDeck;
    const before = plain(api.getDeck());
    assert.equal(api.setRingUnowned("apollo").ok, true);
    for (const id of cardIds) assert.equal(api.canUseCard(id), id.startsWith("hermes_"));
    const reasons = api.getDeckInvalidReasons();
    assert.ok(reasons.length > 0);
    reasons.forEach(reason => {
        assert.equal(reason.code, "REQUIRED_RING_NOT_OWNED");
        assert.equal(reason.ringId, "apollo");
    });
    assert.deepEqual(plain(api.getDeck()), before);
    assert.equal(api.canStartBossBattle(), false);
    assert.equal(api.assignRingToPlayer("apollo").ok, true);
    assert.equal(api.isDeckValid(), true);
    assert.deepEqual(plain(api.getDeck()), before);
});
test("5神すべて主人公所持時だけUltimate指定可能、手放すと解除", () => {
    const api = loadGame().ProjectRCardDeck;
    for (const ring of api.definitions.ringDefinitions()) {
        assert.equal(api.setUltimateRing(ring.ringId).ok, false);
        assert.equal(api.assignRingToPlayer(ring.ringId).ok, true);
        assert.equal(api.setUltimateRing(ring.ringId).ok, true);
        assert.equal(api.getUltimateRingId(), ring.ringId);
        api.setRingUnowned(ring.ringId);
        assert.equal(api.getUltimateRingId(), null);
    }
});
test("実7カードだけでは30枚不足、上限超過による水増しを拒否", () => {
    const api = preparedGame(false).ProjectRCardDeck;
    assert.equal(api.getDeck().length, 19);
    assert.equal(api.isDeckValid(), false);
    assert.equal(api.getDeckInvalidReasons()[0].code, "INVALID_DECK_SIZE");
    api.setDeck(Array.from({ length: 30 }, (_, index) => cardIds[index % cardIds.length]));
    assert.equal(api.getDeck().length, 30);
    assert.ok(api.getDeckInvalidReasons().some(reason => reason.code === "MAX_COPIES_EXCEEDED"));
    assert.equal(api.startBattle().ok, false);
});
test("通常3・強力2・特殊1の境界と上限超過理由を検証", () => {
    const api = preparedGame().ProjectRCardDeck;
    for (const [id, maximum] of [["hermes_sword_attack", 3], ["apollo_plague_attack", 2], ["test_only_2", 1]]) {
        assert.equal(api.definitions.card(id).maxCopies, maximum);
        assert.equal(api.getDeckInvalidReasons().length, 0);
        const invalid = [...deck];
        invalid[invalid.findIndex(cardId => cardId !== id)] = id;
        const reason = api.getDeckInvalidReasons(invalid).find(entry => entry.code === "MAX_COPIES_EXCEEDED");
        assert.equal(reason.cardId, id);
        assert.equal(reason.actual, maximum + 1);
        assert.equal(reason.maximum, maximum);
        assert.equal(api.isDeckValid(invalid), false);
    }
});
test("実データの通常カード上限3枚を超えた4枚を拒否", () => {
    const api = preparedGame().ProjectRCardDeck;
    const invalid = [...deck];
    invalid[invalid.indexOf("apollo_lyre_calm")] = "hermes_swift_movement";
    api.setDeck(invalid);
    assert.equal(api.getDeck().length, 30);
    const reason = api.getDeckInvalidReasons().find(entry => entry.code === "MAX_COPIES_EXCEEDED");
    assert.equal(reason.cardId, "hermes_swift_movement");
    assert.equal(reason.actual, 4);
    assert.equal(reason.maximum, 3);
    assert.equal(api.startBattle().ok, false);
});
test("一時定義を使う戦闘中でも恒久状態とCard Levelを保存復元、戦闘データは除外", () => {
    const game = preparedGame();
    const api = game.ProjectRCardDeck;
    api.setCardLevel("apollo_golden_arrow", 3);
    api.setUltimateRing("apollo");
    const before = plain(api.getPersistentData());
    api.startBattle();
    api.useBattleCard(api.getBattleState().hand[0].instanceId);
    assert.equal(api.getBattleState().cooldownPile.length, 1);
    const serialized = JSON.stringify(game.DataManager.makeSaveContents());
    for (const key of ["drawPile", "hand", "discardPile", "cooldownPile", "instanceId", "remainingSeconds", "ultimateGauge"]) {
        assert.equal(serialized.includes(`"${key}"`), false);
    }
    game.DataManager.extractSaveContents(JSON.parse(serialized));
    assert.deepEqual(plain(api.getPersistentData()), before);
    assert.equal(api.getPersistentData().cardOwnership.apollo_golden_arrow.level, 3);
    assert.equal(game.$gameSystem.existingSaveValue, 42);
    assert.equal(api.getBattleState(), null);
});
test("本番7カードのLevelは1～3、旧Lv5保存値をLv3へ補正し他の恒久データを保持", () => {
    const game = preparedGame(false);
    const api = game.ProjectRCardDeck;
    for (const cardId of cardIds) {
        api.setCardLevel(cardId, 5);
        assert.equal(api.getPersistentData().cardOwnership[cardId].level, 3);
        api.setCardLevel(cardId, 0);
        assert.equal(api.getPersistentData().cardOwnership[cardId].level, 1);
        api.setCardLevel(cardId, 2);
    }
    api.setUltimateRing("apollo");
    const before = plain(api.getPersistentData());
    const saved = JSON.parse(JSON.stringify(game.DataManager.makeSaveContents()));
    saved.system._projectRCardDeckData.cardOwnership.apollo_golden_arrow.level = 5;
    game.DataManager.extractSaveContents(saved);
    before.cardOwnership.apollo_golden_arrow.level = 3;
    assert.deepEqual(plain(api.getPersistentData()), before);
    assert.deepEqual(plain(api.getDeck()), before.deckDefinition.cardIds);
    assert.equal(game.$gameSystem.existingSaveValue, 42);
    assert.equal(api.getBattleState(), null);
});
test("Phase 1空データと新規項目なし旧セーブを形式変更なしで補完", () => {
    const game = loadGame();
    for (const oldData of [undefined, { version: 1, cardOwnership: {}, ringOwnershipState: {}, ultimateSelection: { ringId: null }, deckDefinition: { cardIds: [] } }]) {
        game.DataManager.extractSaveContents({ system: { existingSaveValue: 42, _projectRCardDeckData: oldData } });
        const data = game.ProjectRCardDeck.getPersistentData();
        assert.equal(data.version, 1);
        assert.equal(Object.keys(data.ringOwnershipState).length, 5);
        assert.equal(game.$gameSystem.existingSaveValue, 42);
        assert.equal(game.ProjectRCardDeck.isCardOwned("apollo_golden_arrow"), false);
    }
});
test("MZ手順書の全Consoleコードが順に実行でき、一時定義が本番データへ混入しない", () => {
    const game = loadGame();
    const logs = [];
    game.console = { log: (...values) => logs.push(plain(values)), table() {} };
    const document = fs.readFileSync(path.join(project, "docs/ProjectR_CardDeck_Phase15.md"), "utf8");
    const snippets = [...document.matchAll(/```js\r?\n([\s\S]*?)```/g)].map(match => match[1]);
    assert.equal(snippets.length, 7);
    snippets.forEach((snippet, index) => {
        if (index === snippets.length - 1) {
            game.DataManager.extractSaveContents(JSON.parse(JSON.stringify(game.DataManager.makeSaveContents())));
        }
        vm.runInNewContext(snippet, game);
    });
    assert.equal(game.ProjectRCardDeck.definitions.cardDefinitions().length, 7);
    assert.equal(game.ProjectRCardDeck.getDeck().length, 19);
    assert.equal(game.service15.deck().length, 30);
    assert.equal(game.service15.isDeckValid(), true);
    assert.equal(game.ProjectRCardDeck.getPersistentData().cardOwnership.apollo_golden_arrow.level, 3);
    assert.equal(JSON.stringify(game.DataManager.makeSaveContents()).includes("test_only_"), false);
    assert.equal(game.ProjectRCardDeck.getBattleState(), null);
    assert.ok(logs.some(values => values.some(value => value?.drawPile?.length === 25 && value?.hand?.length === 5)));
    assert.ok(logs.some(values => values.some(value => value?.cooldownPile?.length === 1)));
    assert.ok(logs.some(values => values.some(value => value?.discardPile?.length === 1 && value?.cooldownPile?.length === 0)));
});
console.log(`# ${passed} Phase 1.5 tests passed`);
