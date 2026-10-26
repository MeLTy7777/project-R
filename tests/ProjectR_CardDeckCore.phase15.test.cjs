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

function loadGame() {
    const context = {
        PluginManager: { parameters: name => name === "ProjectR_CardDeckCore" ? parameters : {} },
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
// 7種類を5/4/4/4/5/4/4枚。架空のカードや本番への初期配布を追加しない。
const deck = cardIds.flatMap((id, index) => Array(index === 0 || index === 4 ? 5 : 4).fill(id));
function preparedGame() {
    const game = loadGame();
    const api = game.ProjectRCardDeck;
    assert.equal(api.assignRingToPlayer("hermes").ok, true);
    assert.equal(api.assignRingToPlayer("apollo").ok, true);
    cardIds.forEach(id => assert.equal(api.setCardOwned(id).ok, true));
    api.setDeck(deck);
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
        assert.equal(card.maxCopies, 5);
        assert.equal(card.maxLevel, 5);
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
test("APIで明示配布したHermes＋Apollo混成30枚デッキが成立", () => {
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
test("実データの同一カード上限5枚を超えた6枚を拒否", () => {
    const api = preparedGame().ProjectRCardDeck;
    const invalid = [...deck];
    invalid[invalid.indexOf("apollo_lyre_calm")] = "hermes_swift_movement";
    api.setDeck(invalid);
    assert.equal(api.getDeck().length, 30);
    const reason = api.getDeckInvalidReasons().find(entry => entry.code === "MAX_COPIES_EXCEEDED");
    assert.equal(reason.cardId, "hermes_swift_movement");
    assert.equal(reason.actual, 6);
    assert.equal(reason.maximum, 5);
    assert.equal(api.startBattle().ok, false);
});
test("実データで恒久状態とCard Levelを保存復元、戦闘データは除外", () => {
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
console.log(`# ${passed} Phase 1.5 tests passed`);
