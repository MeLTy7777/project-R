/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 L1 キャラ→デッキのデータ窓口(読み取り専用)。実在する出撃可能なキャラと、既存の所持カード・保存デッキを結び付けて返すだけ。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardInventory
 * @orderAfter ProjectR_PartyCombat
 * @orderAfter ProjectR_PartyRoster
 * @orderAfter ProjectR_SoulBattle
 *
 * @help
 * ProjectR_SoulLoopData.js
 *
 * 位置づけ: SOUL戦闘の新ループ(準備 → 攻撃 → 防御)で「キャラを選び、そのキャラの実際のデッキを使う」ための、データの読み取り窓口(L1)です。
 *   何も書き込みません(セーブ・カード所持・デッキ・指輪・仲間・戦闘の状態に触れません)。10枚ドロー・5枚の割り当て・マナ・キャラ選択の画面はありません。
 *   このプラグインを読み込んだだけでは、何も起きません。既存の30枚デッキの戦闘開始(ProjectRCardDeck.startCardBattle)は、そのままの互換経路です。
 *
 * 出撃できるキャラ(暫定の規則。確定は docs/ProjectR_SoulLoop_Plan.md の D3):
 *   ・主人公 = $gameParty.leader()。いつでも出撃できる。
 *   ・仲間   = 次の3つをすべて満たすアクター。
 *       1. $dataActors に実在する   2. 指輪を持っている(CardDeckCoreの指輪の所持が actor:<id>)
 *       3. ProjectRPartyCombat に仲間として定義済み(registerAlly)
 *     製品の仲間は現在0人(どの指輪も equipActorIds が空)なので、通常は主人公だけです。仲間は Combat Test Arena などのフィクスチャでだけ現れます。
 *   条件を満たさない候補は listCandidates() に eligible:false と理由つきで出ます(キャラを作ったり、勝手に出撃可能にしたりしません)。
 *
 * キャラごとのデッキ(D2の解決: 新しい保存領域を作らず、今あるデータだけを使う):
 *   ・主人公: 保存済みの30枚デッキ(ProjectRCardDeck.getDeck)がそのまま「実際のデッキ」。互換経路(compat:true)。
 *   ・仲間  : 今のルール(ProjectR_PartyCombat)では、仲間は主人公のカードデッキを使わず、持っている指輪のAIスキルで動きます。
 *             カードのデッキは保存されていないので deck は null(理由 NO_CHARACTER_DECK)。デッキを作り上げません。
 *             参考として、その指輪のカード(実在のカード定義)の「所持枚数に基づく候補プール」と、AIスキルの数だけを返します。
 *   ・どのキャラも pool(= そのキャラが持つ指輪のカード × 実際の所持枚数・Level・コピー上限)を持ちます。
 *
 * API: ProjectRSoulLoopData  (すべて読み取り専用。返す値は毎回新しいコピー)
 *   listCandidates()          主人公 + 仲間の候補(eligible / reasons つき)
 *   listCharacters()          出撃できるキャラだけ
 *   getCharacter(key)         "player" / "ally:<actorId>" → キャラ(deck / pool つき) か null
 *   getDeck(key)              { ok, source:"savedDeck", compat, cardIds, valid, reasons } か { ok:false, reason:"NO_CHARACTER_DECK"|"UNKNOWN_CHARACTER" }
 *   getPool(key)              そのキャラの指輪のカード(所持枚数つき)
 *   getCompatDeck()           現在の保存デッキ(互換経路。ProjectRCardDeck.getDeck と同じ)
 *   snapshot()                上のすべて(診断・テスト用)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const VERSION = "0.1.0";
    const PLAYER_KEY = "player";
    const ACTOR_PREFIX = "actor:";
    const Reason = Object.freeze({
        NO_CHARACTER_DECK: "NO_CHARACTER_DECK", UNKNOWN_CHARACTER: "UNKNOWN_CHARACTER",
        ACTOR_NOT_FOUND: "ACTOR_NOT_FOUND", NO_RING: "NO_RING", NO_ALLY_DEFINITION: "NO_ALLY_DEFINITION", NO_LEADER: "NO_LEADER"
    });

    const api = name => { try { const t = root[name]; return t && (typeof t === "object" || typeof t === "function") ? t : null; } catch (_error) { return null; } };
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const copy = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
    const core = () => api("ProjectRCardDeck");
    const inventory = () => api("ProjectRCardInventory");
    const leader = () => safe(() => (typeof $gameParty !== "undefined" ? $gameParty.leader() : null), null);
    const actorData = actorId => safe(() => (typeof $dataActors !== "undefined" ? $dataActors[actorId] || null : null), null);
    const ringsOf = owner => safe(() => core().definitions.ringDefinitions().filter(ring => core().getRingOwner(ring.ringId) === owner), []);

    // 1枚のカードの事実だけ(コストなど承認されていない値は持たない)
    const cardFact = (definition, ring) => {
        const cardId = definition.cardId;
        const owned = safe(() => core().getPersistentData().cardOwnership?.[cardId], null);
        const ownedCopies = Number(safe(() => inventory()?.getOwnedCopies?.(cardId), owned && owned.owned ? 1 : 0)) || 0;
        const maxDeckCopies = Number(safe(() => inventory()?.getMaxDeckCopies?.(cardId), Math.min(ownedCopies, definition.maxCopies))) || 0;
        const deckCopies = safe(() => core().getDeck().filter(id => id === cardId).length, 0);
        return {
            cardId, ringId: definition.ringId, godId: ring?.godId || "", category: definition.category, level: Number(owned?.level) || (ownedCopies > 0 ? 1 : 0),
            ownedCopies, maxCopies: definition.maxCopies, maxDeckCopies, deckCopies, cooldownSeconds: definition.cooldownSeconds,
            usableByPlayer: !!safe(() => core().canUseCard(cardId), false)
        };
    };
    const poolFor = ringIds => {
        const wanted = new Set(ringIds);
        const result = [];
        for (const definition of safe(() => core().definitions.cardDefinitions(), [])) {
            if (!wanted.has(definition.ringId)) continue;
            const fact = cardFact(definition, safe(() => core().definitions.ring(definition.ringId), null));
            if (fact.ownedCopies > 0) result.push(fact);          // 持っているカードだけ(未所持のカードを候補にしない)
        }
        return result;
    };

    // ---- 候補の列挙 ----
    const candidateActorIds = () => {
        const ids = new Set();
        const head = leader();
        const headId = head && typeof head.actorId === "function" ? head.actorId() : null;
        for (const ring of safe(() => core().definitions.ringDefinitions(), [])) {
            for (const id of ring.equipActorIds || []) ids.add(Number(id));
            const owner = safe(() => core().getRingOwner(ring.ringId), "");
            if (typeof owner === "string" && owner.startsWith(ACTOR_PREFIX)) ids.add(Number(owner.slice(ACTOR_PREFIX.length)));
        }
        for (const definition of safe(() => api("ProjectRPartyCombat")?.allyDefinitions?.(), []) || []) ids.add(Number(definition.actorId));
        ids.delete(Number(headId));
        return [...ids].filter(id => Number.isFinite(id) && id > 0).sort((a, b) => a - b);
    };

    const protagonist = () => {
        const actor = leader();
        if (!actor) return { key: PLAYER_KEY, kind: "protagonist", actorId: null, name: "", eligible: false, reasons: [Reason.NO_LEADER] };
        const savedDeck = safe(() => core().getDeck(), []);
        const reasons = safe(() => core().getDeckInvalidReasons(savedDeck), []);
        const ringIds = ringsOf("player").map(ring => ring.ringId);
        return {
            key: PLAYER_KEY, kind: "protagonist", actorId: safe(() => actor.actorId(), null), name: String(safe(() => actor.name(), "")),
            eligible: true, reasons: [], deployed: true, hp: Number(actor.hp), mhp: Number(actor.mhp), ringIds,
            deckSource: "savedDeck", compat: true,
            deck: { cardIds: [...savedDeck], size: savedDeck.length, valid: Array.isArray(reasons) && reasons.length === 0, reasons: copy(reasons) || [], usableCardIds: savedDeck.filter(id => safe(() => core().canUseCard(id), false)) },
            pool: poolFor(ringIds), aiSkillCount: null
        };
    };
    const ally = actorId => {
        const reasons = [];
        const data = actorData(actorId);
        if (!data || !String(data.name || "")) reasons.push(Reason.ACTOR_NOT_FOUND);
        const ringId = safe(() => core().actorRingId(actorId), null) || safe(() => (core().definitions.ringDefinitions().find(ring => core().getRingOwner(ring.ringId) === ACTOR_PREFIX + actorId) || {}).ringId, null);
        if (!ringId) reasons.push(Reason.NO_RING);
        const definition = safe(() => api("ProjectRPartyCombat")?.allyDefinition?.(actorId), null);
        if (!definition) reasons.push(Reason.NO_ALLY_DEFINITION);
        const member = safe(() => (api("ProjectRPartyCombat")?.members?.() || []).find(m => Number(m.actorId) === actorId), null);
        const ringIds = ringId ? [ringId] : [];
        return {
            key: "ally:" + actorId, kind: "ally", actorId, name: String(data?.name || definition?.name || ""),
            eligible: reasons.length === 0, reasons, deployed: !!member, down: member ? !!member.down : null, hp: member ? Number(member.hp) : null, mhp: member ? Number(member.maxHp) : (definition ? Number(definition.maxHp) : null),
            ringIds, deckSource: "none", compat: false,
            deck: null, deckReason: Reason.NO_CHARACTER_DECK,       // 仲間は指輪のAIスキルで動く。カードのデッキは保存されていない(作り上げない)
            pool: poolFor(ringIds),
            aiSkillCount: ringId && definition ? ((definition.ringSkills || {})[ringId] || []).length : 0
        };
    };

    const listCandidates = () => copy([protagonist(), ...candidateActorIds().map(ally)]);
    const listCharacters = () => listCandidates().filter(c => c.eligible);
    const getCharacter = key => {
        const k = String(key ?? "");
        if (k === PLAYER_KEY) return copy(protagonist());
        const m = /^ally:(\d+)$/.exec(k);
        return m && candidateActorIds().includes(Number(m[1])) ? copy(ally(Number(m[1]))) : null;
    };
    const getDeck = key => {
        const c = getCharacter(key);
        if (!c) return { ok: false, reason: Reason.UNKNOWN_CHARACTER };
        if (!c.eligible) return { ok: false, reason: Reason.UNKNOWN_CHARACTER, reasons: c.reasons };
        if (!c.deck) return { ok: false, reason: c.deckReason || Reason.NO_CHARACTER_DECK };
        return { ok: true, source: c.deckSource, compat: !!c.compat, cardIds: [...c.deck.cardIds], valid: c.deck.valid, reasons: copy(c.deck.reasons) };
    };
    const getPool = key => { const c = getCharacter(key); return c ? c.pool : null; };
    const getCompatDeck = () => {
        const cardIds = copy(safe(() => core().getDeck(), []));
        return { cardIds, size: cardIds.length, valid: !!safe(() => core().isDeckValid(cardIds), false) };
    };

    root.ProjectRSoulLoopData = Object.freeze({
        VERSION, Reason, PLAYER_KEY,
        listCandidates, listCharacters, getCharacter, getDeck, getPool, getCompatDeck,
        snapshot: () => ({ version: VERSION, candidates: listCandidates(), compat: getCompatDeck() })
    });
})();
