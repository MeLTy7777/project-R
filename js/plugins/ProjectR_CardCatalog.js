/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カード設計カタログ(Hermes 7枚のデータモデル)と累積レベル解決。表示・保存なし。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 *
 * @help
 * ProjectR_CardCatalog.js
 *
 * 【役割】
 *   1. ユーザー確定のHermes 7枚の「設計」を読み取り専用のデータとして持つ(設計ID・強さ・最大枚数・Cooldown)。
 *      設計IDはワークブックの識別子で、ランタイムのcardIdやDB IDとは別物です。
 *      実装済み(implemented)になるまで、既存の旧cardIdも置き換えません(旧セーブ互換)。
 *   2. 本番の初期30枚デッキは、7枚すべてが実装されるまで有効にしません(isFinalDeckReady)。
 *   3. 全カード共通の「累積レベル」規則を1か所で解決します(resolveLevels)。
 *
 * 【実行時のカード定義の追加(旧カードとセーブの互換)】
 *   旧7枚のCardDefinitionsパラメータ(plugins.js)は一切変えません。新設計で実装済みのカードだけを、
 *   このPluginが起動時に ProjectRCardDeck.definitions へ追加します(RUNTIME_CARDS)。cardIdが既にあれば何もしません。
 *   所持データ(cardOwnership)は未所持が既定なので、旧セーブ・本番デッキには影響しません。
 *
 * 【累積レベル規則】
 *   Lv2はLv1の効果を残して追加、Lv3はLv1とLv2を残して追加します。
 *   同じ効果に後のレベルが新しい数値を与えたときは、加算・乗算せず「置換」します。
 *   例: 倍率 1.5 → 2.0 → 3.0 のとき、Lv3の最終倍率は 3.0(6.5でも9.0でもない)。
 *
 * API: ProjectRCardCatalog
 *   resolveLevels(rows, level)   rows=[{level, effects:{...}}]  → 凍結された解決済みeffects
 *   hermesDesign()               7枚の設計(凍結)
 *   hermesTotalMaxCopies()       最大コピー数の合計(30)
 *   isFinalDeckReady()           7枚すべて実装済みか
 *   finalDeckBlockers()          未実装カードの名前一覧
 *   buildFinalHermesDeck()       準備完了なら30枚のcardId配列、未完なら null
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;

    const integer = (value, fallback, minimum) => {
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
    };

    // 後のレベルの同名effectは置換(加算・乗算しない)。入力順に依らず、levelの昇順で畳み込む。
    const resolveLevels = (rows, level) => {
        const wanted = integer(level, 1, 1);
        const resolved = {};
        const ordered = (Array.isArray(rows) ? rows : []).filter(row => row && row.effects)
            .map((row, index) => ({ row, index })).sort((a, b) => (a.row.level - b.row.level) || (a.index - b.index));
        for (const { row } of ordered) {
            if (row.level <= wanted) Object.assign(resolved, row.effects);
        }
        return Object.freeze(resolved);
    };

    // 強さ: strong=強力 / normal=通常 / special=特殊。runtimeCardIdが null のものは未実装(旧cardIdとは別管理)。
    // legacyCandidates は「どの旧カードが近いか」の参考情報で、ユーザー確定前なので何にも使いません。
    const design = (designId, name, classification, maxCopies, cooldownSeconds, extra = {}) => Object.freeze({
        designId, name, classification, maxCopies, cooldownSeconds,
        runtimeCardId: null, implemented: false, legacyCandidates: Object.freeze([]), ...extra
    });
    const HERMES = Object.freeze([
        design(1, "一閃", "strong", 3, 7),
        design(2, "サイコポンポス", "normal", 3, 10),
        design(3, "ヴェイル", "special", 3, 10, { legacyCandidates: Object.freeze(["hermes_perception_obscure"]) }),
        design(4, "ストレングス", "special", 10, 0.1),
        design(5, "薙ぎ払い", "normal", 3, 0.5, { legacyCandidates: Object.freeze(["hermes_sword_attack"]) }),
        design(6, "葦笛", "strong", 3, 8, { legacyCandidates: Object.freeze(["hermes_reed_flute_sleep"]) }),
        design(7, "絶", "strong", 5, 0.5, { runtimeCardId: "hermes_zetsu", implemented: true })
    ]);

    // 実装済みの新設計カードの実行時定義。CardDeckCoreのDefinitionRegistryと同じ正規化・凍結で追加する。
    // 絶(Zetsu): Hermes / 強力 / 最大5枚 / 最大Lv3 / Cooldown 0.5秒 / Ground(マウス位置)。
    const RUNTIME_CARDS = Object.freeze([
        Object.freeze({ cardId: "hermes_zetsu", ringId: "hermes", maxCopies: 5, cooldownSeconds: 0.5, maxLevel: 3,
            rarity: "strong", category: "movement", targetType: "ground" })
    ]);
    const registerRuntimeCards = () => {
        const registry = root.ProjectRCardDeck?.definitions;
        const cards = registry?.cards;
        if (!(cards instanceof Map)) return [];
        const added = [];
        for (const card of RUNTIME_CARDS) {
            if (cards.has(card.cardId) || !registry.ring?.(card.ringId)) continue; // 重複・未定義の指輪は追加しない
            cards.set(card.cardId, Object.freeze({ ...card }));
            added.push(card.cardId);
        }
        return added;
    };
    const registered = registerRuntimeCards();

    const totalMaxCopies = () => HERMES.reduce((sum, card) => sum + card.maxCopies, 0);
    const blockers = () => HERMES.filter(card => !card.implemented).map(card => card.name);
    const isFinalDeckReady = () => blockers().length === 0 && totalMaxCopies() === 30;
    const buildFinalHermesDeck = () => {
        if (!isFinalDeckReady()) return null;
        const ids = [];
        for (const card of HERMES) for (let i = 0; i < card.maxCopies; i++) ids.push(card.runtimeCardId);
        return ids;
    };

    root.ProjectRCardCatalog = Object.freeze({
        resolveLevels,
        hermesDesign: () => HERMES,
        hermesTotalMaxCopies: totalMaxCopies,
        isFinalDeckReady,
        finalDeckBlockers: blockers,
        buildFinalHermesDeck,
        runtimeCards: () => RUNTIME_CARDS,
        registeredRuntimeCards: () => [...registered]
    });
})();
