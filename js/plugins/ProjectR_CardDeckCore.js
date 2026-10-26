/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カード・指輪・デッキ基盤（Phase 1）
 * @author ProjectR
 * @orderAfter Hendrix_Action_Engine
 *
 * @param CardDefinitions
 * @text カード定義
 * @type struct<CardDefinition>[]
 * @default []
 *
 * @param RingDefinitions
 * @text 指輪定義
 * @type struct<RingDefinition>[]
 * @default []
 *
 * @help
 * カード攻撃やHUDを実装せず、Phase 1のデータ、検証、戦闘用山札、
 * セーブ互換だけを提供します。
 *
 * 主なスクリプトAPI:
 *   ProjectRCardDeck.hasPlayerRing(ringId)
 *   ProjectRCardDeck.canActorEquipRing(ringId, actorId)
 *   ProjectRCardDeck.canUseCard(cardId)
 *   ProjectRCardDeck.isDeckValid(cardIds)
 *   ProjectRCardDeck.getDeckInvalidReasons(cardIds)
 *   ProjectRCardDeck.assignRingToPlayer(ringId)
 *   ProjectRCardDeck.assignRingToActor(ringId, actorId)
 *   ProjectRCardDeck.setUltimateRing(ringId)
 *   ProjectRCardDeck.startBattle(cardIds)
 *   ProjectRCardDeck.useBattleCard(instanceId)
 *   ProjectRCardDeck.updateCooldown(seconds)
 *
 * cardIdは将来Action Combatへ接続するDatabase Skill IDにもできます。
 * 戦闘用山札・手札・捨て札・Cooldownはセーブされません。
 */

/*~struct~CardDefinition:
 * @param cardId
 * @text Card ID
 * @type string
 * @default
 *
 * @param ringId
 * @text 必要な指輪ID
 * @type string
 * @default
 *
 * @param maxCopies
 * @text 同一カード上限
 * @type number
 * @min 1
 * @default 3
 *
 * @param cooldownSeconds
 * @text Cooldown（秒）
 * @type number
 * @decimals 2
 * @min 0
 * @default 0
 *
 * @param maxLevel
 * @text 最大Card Level
 * @type number
 * @min 1
 * @default 1
 *
 * @param rarity
 * @text Rarity
 * @type string
 * @default normal
 *
 * @param category
 * @text Category
 * @type string
 * @default normal
 *
 * @param targetType
 * @text 将来用Target Type
 * @type select
 * @option Direction
 * @value direction
 * @option Ground
 * @value ground
 * @option Instant
 * @value instant
 * @option Ally
 * @value ally
 * @default instant
 */

/*~struct~RingDefinition:
 * @param ringId
 * @text Ring ID
 * @type string
 * @default
 *
 * @param godId
 * @text God ID
 * @type string
 * @default
 *
 * @param equipActorIds
 * @text 装備可能Actor ID
 * @type actor[]
 * @default []
 *
 * @param initialOwner
 * @text 初期所有者
 * @type select
 * @option 未所持
 * @value unowned
 * @option 主人公
 * @value player
 * @default unowned
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN_NAME = "ProjectR_CardDeckCore";
    const DECK_SIZE = 30;
    const HAND_SIZE = 5;
    const SAVE_VERSION = 1;
    const OWNER_PLAYER = "player";
    const OWNER_UNOWNED = "unowned";
    const ACTOR_OWNER_PREFIX = "actor:";
    const TARGET_TYPES = new Set(["direction", "ground", "instant", "ally"]);

    const InvalidReason = Object.freeze({
        INVALID_DECK_SIZE: "INVALID_DECK_SIZE",
        INVALID_CARD_ID: "INVALID_CARD_ID",
        CARD_NOT_OWNED: "CARD_NOT_OWNED",
        REQUIRED_RING_NOT_OWNED: "REQUIRED_RING_NOT_OWNED",
        MAX_COPIES_EXCEEDED: "MAX_COPIES_EXCEEDED",
        INVALID_RING_ID: "INVALID_RING_ID",
        ACTOR_NOT_ALLOWED: "ACTOR_NOT_ALLOWED",
        ACTOR_RING_LIMIT: "ACTOR_RING_LIMIT",
        ULTIMATE_RING_NOT_OWNED: "ULTIMATE_RING_NOT_OWNED",
        RING_TRANSFER_DURING_BATTLE: "RING_TRANSFER_DURING_BATTLE"
    });

    const canonicalId = value => value == null ? "" : String(value).trim();
    const integer = (value, fallback, minimum = Number.MIN_SAFE_INTEGER) => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
    };
    const finiteNumber = (value, fallback, minimum = -Infinity) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
    };
    const clone = value => JSON.parse(JSON.stringify(value));

    const parseJson = (value, fallback) => {
        if (typeof value !== "string") return value ?? fallback;
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    };

    const parseStructArray = value => {
        const array = parseJson(value, []);
        if (!Array.isArray(array)) return [];
        return array.map(entry => parseJson(entry, null)).filter(Boolean);
    };

    const parseActorIds = value => {
        const parsed = parseJson(value, value);
        const list = Array.isArray(parsed) ? parsed : String(parsed || "").split(",");
        return [...new Set(list.map(id => integer(id, 0, 0)).filter(id => id > 0))];
    };

    class DefinitionRegistry {
        constructor(cardDefinitions = [], ringDefinitions = []) {
            this.cards = new Map();
            this.rings = new Map();
            for (const source of ringDefinitions || []) {
                const ringId = canonicalId(source?.ringId);
                if (!ringId || this.rings.has(ringId)) continue;
                const initialOwner = source.initialOwner === OWNER_PLAYER ? OWNER_PLAYER : OWNER_UNOWNED;
                this.rings.set(ringId, Object.freeze({
                    ringId,
                    godId: canonicalId(source.godId),
                    equipActorIds: Object.freeze(parseActorIds(source.equipActorIds)),
                    initialOwner
                }));
            }
            for (const source of cardDefinitions || []) {
                const cardId = canonicalId(source?.cardId);
                const ringId = canonicalId(source?.ringId);
                if (!cardId || !ringId || this.cards.has(cardId)) continue;
                const targetType = TARGET_TYPES.has(source.targetType) ? source.targetType : "instant";
                this.cards.set(cardId, Object.freeze({
                    cardId,
                    ringId,
                    maxCopies: integer(source.maxCopies, 3, 1),
                    cooldownSeconds: finiteNumber(source.cooldownSeconds, 0, 0),
                    maxLevel: integer(source.maxLevel, 1, 1),
                    rarity: canonicalId(source.rarity) || "normal",
                    category: canonicalId(source.category) || "normal",
                    targetType
                }));
            }
        }

        card(cardId) {
            return this.cards.get(canonicalId(cardId)) || null;
        }

        ring(ringId) {
            return this.rings.get(canonicalId(ringId)) || null;
        }

        cardDefinitions() {
            return [...this.cards.values()];
        }

        ringDefinitions() {
            return [...this.rings.values()];
        }
    }

    const initialPersistentData = definitions => {
        const ringOwnershipState = {};
        for (const ring of definitions.ringDefinitions()) {
            ringOwnershipState[ring.ringId] = ring.initialOwner;
        }
        return {
            version: SAVE_VERSION,
            cardOwnership: {},
            ringOwnershipState,
            ultimateSelection: { ringId: null },
            deckDefinition: { cardIds: [] }
        };
    };

    const normalizedOwner = value => {
        if (value === OWNER_PLAYER || value === OWNER_UNOWNED) return value;
        const match = String(value || "").match(/^actor:(\d+)$/);
        return match && Number(match[1]) > 0 ? `${ACTOR_OWNER_PREFIX}${Number(match[1])}` : OWNER_UNOWNED;
    };

    const normalizePersistentData = (raw, definitions) => {
        const base = initialPersistentData(definitions);
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

        const oldCards = raw.cardOwnership || raw.cards || {};
        for (const [id, value] of Object.entries(oldCards)) {
            const card = definitions.card(id);
            if (!card) continue;
            const objectValue = value && typeof value === "object" ? value : { owned: !!value };
            base.cardOwnership[card.cardId] = {
                owned: !!objectValue.owned,
                level: Math.min(card.maxLevel, integer(objectValue.level, 1, 1))
            };
        }

        const oldRings = raw.ringOwnershipState || raw.ringOwnership || {};
        for (const [id, owner] of Object.entries(oldRings)) {
            const ring = definitions.ring(id);
            if (ring) base.ringOwnershipState[ring.ringId] = normalizedOwner(owner);
        }

        const oldDeck = raw.deckDefinition?.cardIds || raw.deck || [];
        base.deckDefinition.cardIds = Array.isArray(oldDeck) ? oldDeck.map(canonicalId) : [];

        const oldUltimate = raw.ultimateSelection?.ringId ?? raw.ultimateRingId ?? null;
        const ultimateId = canonicalId(oldUltimate);
        if (ultimateId && definitions.ring(ultimateId) &&
                base.ringOwnershipState[ultimateId] === OWNER_PLAYER) {
            base.ultimateSelection.ringId = ultimateId;
        }
        return base;
    };

    class CardDeckService {
        constructor(definitions, persistentData) {
            this.definitions = definitions;
            this.data = normalizePersistentData(persistentData, definitions);
        }

        exportPersistentData() {
            return clone(this.data);
        }

        cardOwnership(cardId) {
            const card = this.definitions.card(cardId);
            if (!card) return null;
            const saved = this.data.cardOwnership[card.cardId];
            return saved ? { owned: !!saved.owned, level: saved.level } : { owned: false, level: 1 };
        }

        setCardOwned(cardId, owned = true) {
            const card = this.definitions.card(cardId);
            if (!card) return { ok: false, reasons: [{ code: InvalidReason.INVALID_CARD_ID, cardId: canonicalId(cardId) }] };
            const current = this.cardOwnership(card.cardId);
            this.data.cardOwnership[card.cardId] = { owned: !!owned, level: current.level };
            return { ok: true, reasons: [] };
        }

        setCardLevel(cardId, level) {
            const card = this.definitions.card(cardId);
            if (!card) return { ok: false, reasons: [{ code: InvalidReason.INVALID_CARD_ID, cardId: canonicalId(cardId) }] };
            const current = this.cardOwnership(card.cardId);
            this.data.cardOwnership[card.cardId] = {
                owned: current.owned,
                level: Math.min(card.maxLevel, integer(level, 1, 1))
            };
            return { ok: true, reasons: [] };
        }

        isCardOwned(cardId) {
            return !!this.cardOwnership(cardId)?.owned;
        }

        ringOwner(ringId) {
            const ring = this.definitions.ring(ringId);
            return ring ? normalizedOwner(this.data.ringOwnershipState[ring.ringId]) : null;
        }

        hasPlayerRing(ringId) {
            return this.ringOwner(ringId) === OWNER_PLAYER;
        }

        actorRingId(actorId) {
            const owner = `${ACTOR_OWNER_PREFIX}${integer(actorId, 0, 0)}`;
            return Object.keys(this.data.ringOwnershipState).find(
                ringId => this.data.ringOwnershipState[ringId] === owner
            ) || null;
        }

        actorEquipReasons(ringId, actorId) {
            const id = canonicalId(ringId);
            const actor = integer(actorId, 0, 0);
            const ring = this.definitions.ring(id);
            if (!ring) return [{ code: InvalidReason.INVALID_RING_ID, ringId: id }];
            if (!ring.equipActorIds.includes(actor)) {
                return [{ code: InvalidReason.ACTOR_NOT_ALLOWED, ringId: id, actorId: actor }];
            }
            const occupied = this.actorRingId(actor);
            if (occupied && occupied !== id) {
                return [{ code: InvalidReason.ACTOR_RING_LIMIT, ringId: id, actorId: actor, equippedRingId: occupied }];
            }
            return [];
        }

        canActorEquipRing(ringId, actorId) {
            return this.actorEquipReasons(ringId, actorId).length === 0;
        }

        assignRingToPlayer(ringId) {
            const id = canonicalId(ringId);
            if (!this.definitions.ring(id)) {
                return { ok: false, reasons: [{ code: InvalidReason.INVALID_RING_ID, ringId: id }] };
            }
            this.data.ringOwnershipState[id] = OWNER_PLAYER;
            return { ok: true, reasons: [] };
        }

        assignRingToActor(ringId, actorId) {
            const reasons = this.actorEquipReasons(ringId, actorId);
            if (reasons.length) return { ok: false, reasons };
            const id = canonicalId(ringId);
            this.data.ringOwnershipState[id] = `${ACTOR_OWNER_PREFIX}${integer(actorId, 0, 0)}`;
            if (this.data.ultimateSelection.ringId === id) this.data.ultimateSelection.ringId = null;
            return { ok: true, reasons: [] };
        }

        setRingUnowned(ringId) {
            const id = canonicalId(ringId);
            if (!this.definitions.ring(id)) {
                return { ok: false, reasons: [{ code: InvalidReason.INVALID_RING_ID, ringId: id }] };
            }
            this.data.ringOwnershipState[id] = OWNER_UNOWNED;
            if (this.data.ultimateSelection.ringId === id) this.data.ultimateSelection.ringId = null;
            return { ok: true, reasons: [] };
        }

        setUltimateRing(ringId) {
            if (ringId == null || canonicalId(ringId) === "") {
                this.data.ultimateSelection.ringId = null;
                return { ok: true, reasons: [] };
            }
            const id = canonicalId(ringId);
            if (!this.definitions.ring(id)) {
                return { ok: false, reasons: [{ code: InvalidReason.INVALID_RING_ID, ringId: id }] };
            }
            if (!this.hasPlayerRing(id)) {
                return { ok: false, reasons: [{ code: InvalidReason.ULTIMATE_RING_NOT_OWNED, ringId: id }] };
            }
            this.data.ultimateSelection.ringId = id;
            return { ok: true, reasons: [] };
        }

        ultimateRingId() {
            return this.data.ultimateSelection.ringId;
        }

        cardInvalidReasons(cardId, index = null) {
            const id = canonicalId(cardId);
            const card = this.definitions.card(id);
            if (!card) return [{ code: InvalidReason.INVALID_CARD_ID, cardId: id, index }];
            const reasons = [];
            if (!this.isCardOwned(id)) reasons.push({ code: InvalidReason.CARD_NOT_OWNED, cardId: id, index });
            if (!this.hasPlayerRing(card.ringId)) {
                reasons.push({ code: InvalidReason.REQUIRED_RING_NOT_OWNED, cardId: id, ringId: card.ringId, index });
            }
            return reasons;
        }

        canUseCard(cardId) {
            return this.cardInvalidReasons(cardId).length === 0;
        }

        deckInvalidReasons(cardIds = this.data.deckDefinition.cardIds) {
            const deck = Array.isArray(cardIds) ? cardIds.map(canonicalId) : [];
            const reasons = [];
            if (deck.length !== DECK_SIZE) {
                reasons.push({ code: InvalidReason.INVALID_DECK_SIZE, actual: deck.length, expected: DECK_SIZE });
            }
            const counts = new Map();
            deck.forEach((cardId, index) => {
                reasons.push(...this.cardInvalidReasons(cardId, index));
                counts.set(cardId, (counts.get(cardId) || 0) + 1);
            });
            for (const [cardId, count] of counts) {
                const card = this.definitions.card(cardId);
                if (card && count > card.maxCopies) {
                    reasons.push({
                        code: InvalidReason.MAX_COPIES_EXCEEDED,
                        cardId,
                        actual: count,
                        maximum: card.maxCopies
                    });
                }
            }
            return reasons;
        }

        isDeckValid(cardIds = this.data.deckDefinition.cardIds) {
            return this.deckInvalidReasons(cardIds).length === 0;
        }

        setDeck(cardIds) {
            this.data.deckDefinition.cardIds = Array.isArray(cardIds) ? cardIds.map(canonicalId) : [];
            return { ok: true, reasons: this.deckInvalidReasons() };
        }

        deck() {
            return [...this.data.deckDefinition.cardIds];
        }
    }

    const shuffleInPlace = (array, random) => {
        for (let index = array.length - 1; index > 0; index--) {
            const swapIndex = Math.floor(random() * (index + 1));
            [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
        }
        return array;
    };

    class BattleDeckSession {
        constructor(service, random = Math.random) {
            this.service = service;
            this.random = typeof random === "function" ? random : Math.random;
            this.state = null;
            this.nextInstanceNumber = 1;
        }

        start(cardIds = this.service.deck()) {
            const reasons = this.service.deckInvalidReasons(cardIds);
            if (reasons.length) return { ok: false, reasons };
            const instances = cardIds.map(cardId => ({
                instanceId: `card-${this.nextInstanceNumber++}`,
                cardId: canonicalId(cardId)
            }));
            this.state = {
                drawPile: shuffleInPlace(instances, this.random),
                hand: [],
                discardPile: [],
                cooldownPile: []
            };
            while (this.state.hand.length < HAND_SIZE && this.drawOne()) {
                // 初期手札を5枚まで補充する。
            }
            return { ok: true, reasons: [], state: this.snapshot() };
        }

        drawOne() {
            if (!this.state) return null;
            if (this.state.drawPile.length === 0 && this.state.discardPile.length > 0) {
                this.state.drawPile = shuffleInPlace(this.state.discardPile.splice(0), this.random);
            }
            const card = this.state.drawPile.pop() || null;
            if (card) this.state.hand.push(card);
            return card;
        }

        use(instanceId) {
            if (!this.state) return { ok: false, reason: "BATTLE_NOT_STARTED" };
            const index = this.state.hand.findIndex(card => card.instanceId === instanceId);
            if (index < 0) return { ok: false, reason: "CARD_NOT_IN_HAND" };
            const instance = this.state.hand.splice(index, 1)[0];
            const definition = this.service.definitions.card(instance.cardId);
            this.state.cooldownPile.push({
                instance,
                remainingSeconds: definition.cooldownSeconds
            });
            this.drawOne();
            return { ok: true, state: this.snapshot() };
        }

        updateCooldown(seconds) {
            if (!this.state) return { ok: false, reason: "BATTLE_NOT_STARTED" };
            const delta = finiteNumber(seconds, 0, 0);
            const remaining = [];
            for (const entry of this.state.cooldownPile) {
                entry.remainingSeconds = Math.max(0, entry.remainingSeconds - delta);
                if (entry.remainingSeconds <= 0) this.state.discardPile.push(entry.instance);
                else remaining.push(entry);
            }
            this.state.cooldownPile = remaining;
            return { ok: true, state: this.snapshot() };
        }

        snapshot() {
            return this.state ? clone(this.state) : null;
        }

        end() {
            this.state = null;
        }
    }

    const parameters = typeof PluginManager !== "undefined" && PluginManager.parameters ?
        PluginManager.parameters(PLUGIN_NAME) : {};
    const definitions = new DefinitionRegistry(
        parseStructArray(parameters.CardDefinitions),
        parseStructArray(parameters.RingDefinitions)
    );
    let battleSession = null;

    const ensureGameData = gameSystem => {
        if (!gameSystem) return initialPersistentData(definitions);
        gameSystem._projectRCardDeckData = normalizePersistentData(
            gameSystem._projectRCardDeckData,
            definitions
        );
        return gameSystem._projectRCardDeckData;
    };

    const currentService = () => {
        const gameSystem = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        const service = new CardDeckService(definitions, ensureGameData(gameSystem));
        if (gameSystem) gameSystem._projectRCardDeckData = service.data;
        return service;
    };

    const mutate = callback => {
        const gameSystem = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        const service = currentService();
        const result = callback(service);
        if (gameSystem) gameSystem._projectRCardDeckData = service.data;
        return result;
    };

    const combatIsActive = () => {
        if (battleSession) return true;
        if (typeof $gameParty !== "undefined" && $gameParty?.inBattle?.()) return true;
        return !!root.ProjectRCombatPresence?.isCombatActive?.();
    };

    const transferRing = callback => {
        if (combatIsActive()) {
            return { ok: false, reasons: [{ code: InvalidReason.RING_TRANSFER_DURING_BATTLE }] };
        }
        return mutate(callback);
    };

    const api = {
        InvalidReason,
        DECK_SIZE,
        HAND_SIZE,
        definitions,
        DefinitionRegistry,
        CardDeckService,
        BattleDeckSession,
        normalizePersistentData,
        getPersistentData: () => currentService().exportPersistentData(),
        getDeck: () => currentService().deck(),
        setDeck: cardIds => mutate(service => service.setDeck(cardIds)),
        isCardOwned: cardId => currentService().isCardOwned(cardId),
        setCardOwned: (cardId, owned = true) => mutate(service => service.setCardOwned(cardId, owned)),
        setCardLevel: (cardId, level) => mutate(service => service.setCardLevel(cardId, level)),
        hasPlayerRing: ringId => currentService().hasPlayerRing(ringId),
        getRingOwner: ringId => currentService().ringOwner(ringId),
        canActorEquipRing: (ringId, actorId) => currentService().canActorEquipRing(ringId, actorId),
        getActorRingInvalidReasons: (ringId, actorId) => currentService().actorEquipReasons(ringId, actorId),
        assignRingToPlayer: ringId => transferRing(service => service.assignRingToPlayer(ringId)),
        assignRingToActor: (ringId, actorId) => transferRing(service => service.assignRingToActor(ringId, actorId)),
        setRingUnowned: ringId => transferRing(service => service.setRingUnowned(ringId)),
        setUltimateRing: ringId => mutate(service => service.setUltimateRing(ringId)),
        getUltimateRingId: () => currentService().ultimateRingId(),
        canUseCard: cardId => currentService().canUseCard(cardId),
        getCardInvalidReasons: cardId => currentService().cardInvalidReasons(cardId),
        isDeckValid: cardIds => currentService().isDeckValid(cardIds),
        getDeckInvalidReasons: cardIds => currentService().deckInvalidReasons(cardIds),
        canStartBossBattle: cardIds => currentService().isDeckValid(cardIds),
        getBossBattleStartInvalidReasons: cardIds => currentService().deckInvalidReasons(cardIds),
        startBattle(cardIds) {
            const service = currentService();
            battleSession = new BattleDeckSession(service);
            const result = battleSession.start(cardIds === undefined ? service.deck() : cardIds);
            if (!result.ok) battleSession = null;
            return result;
        },
        isBattleActive: () => !!battleSession,
        useBattleCard(instanceId) {
            return battleSession ? battleSession.use(instanceId) : { ok: false, reason: "BATTLE_NOT_STARTED" };
        },
        updateCooldown(seconds) {
            return battleSession ? battleSession.updateCooldown(seconds) : { ok: false, reason: "BATTLE_NOT_STARTED" };
        },
        getBattleState: () => battleSession?.snapshot() || null,
        endBattle() {
            if (battleSession) battleSession.end();
            battleSession = null;
        }
    };

    root.ProjectRCardDeck = api;

    if (typeof Game_System !== "undefined") {
        const _Game_System_initialize = Game_System.prototype.initialize;
        Game_System.prototype.initialize = function() {
            _Game_System_initialize.call(this);
            this._projectRCardDeckData = initialPersistentData(definitions);
        };
    }

    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _DataManager_extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            _DataManager_extractSaveContents.call(this, contents);
            if (typeof $gameSystem !== "undefined" && $gameSystem) ensureGameData($gameSystem);
            battleSession = null;
        };
    }

    if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
