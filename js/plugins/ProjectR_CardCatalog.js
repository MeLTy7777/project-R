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
 *   追加済み(設計ID → runtime ID): 7 絶 → hermes_zetsu / 5 薙ぎ払い → hermes_sweep / 6 葦笛 → hermes_reed_flute /
 *   1 一閃 → hermes_issen / 4 ストレングス → hermes_strength。未実装: 2 サイコポンポス / 3 ヴェイル(Cursor対象タイプ未対応)。
 *
 * 【累積レベル規則】
 *   Lv2はLv1の効果を残して追加、Lv3はLv1とLv2を残して追加します。
 *   同じ効果に後のレベルが新しい数値を与えたときは、加算・乗算せず「置換」します。
 *   例: 倍率 1.5 → 2.0 → 3.0 のとき、Lv3の最終倍率は 3.0(6.5でも9.0でもない)。
 *
 * API: ProjectRCardCatalog
 *   resolveLevels(rows, level)   rows=[{level, effects:{...}}]  → 凍結された解決済みeffects
 *   hermesDesign()               7枚の設計(凍結。ワークブックの強さ・最大コピー数・Cooldown・対象タイプ・初回入手枚数)
 *   migrationAudit() / unmappedLegacyCards()  設計ID ↔ 旧(現行)カードID の対応と、設計7枚に含まれない現行カード
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

    // 正本: C:\\Users\\hmats\\Documents\\RMMZ\\_ProjectR_DesignSources\\ProjectR_CardManagement_Template(3).xlsx(「カード一覧」行2〜8・47列)。
    //   SHA-256 babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c。ここは数値の転記で、効果の仕様はXLSXが正です。
    // 強さ: strong=強力 / normal=通常 / special=特殊。標準のコピー上限は 通常3 / 強力2 / 特殊1(記入ガイド)。
    //   標準と違う最大コピー数は「例外」として、カード側のデータ(maxCopies)で持ちます。全体の上限規則は変えません。
    // targetType: ワークブックの対象タイプ。ヴェイルの「その他」は、ユーザー確認済みの「カーソル追従(Cursor)」として扱う。
    //   runtimeTargetTypeSupported=false の間は、CardDeckCoreがそのtargetTypeを受け付けない(H2Bで対応が必要)。
    // migration: 旧(現行ランタイム)カードとの対応。decisionはユーザー判断が済むまで「coexist(共存)」で、旧カードは1枚も消さない。
    const STANDARD_COPIES = Object.freeze({ normal: 3, strong: 2, special: 1 });
    const design = (designId, name, classification, maxCopies, cooldownSeconds, extra = {}) => Object.freeze({
        designId, name, classification, maxCopies, cooldownSeconds,
        standardMaxCopies: STANDARD_COPIES[classification], copyLimitException: maxCopies !== STANDARD_COPIES[classification],
        maxLevel: 3, firstGrantCopies: maxCopies,
        runtimeCardId: null, implemented: false, legacyCandidates: Object.freeze([]),
        migration: Object.freeze({ legacyCardId: null, decision: "new", status: "notImplemented", note: "" }),
        runtimeTargetTypeSupported: true, ...extra
    });
    const migration = (legacyCardId, decision, status, note) => Object.freeze({ legacyCardId, decision, status, note });
    const HERMES = Object.freeze([
        design(1, "一閃", "strong", 3, 7, { workbookTargetType: "Direction", targetType: "direction", category: "attack",
            runtimeCardId: "hermes_issen", implemented: true,
            migration: migration(null, "new", "implemented", "Phase H2B-2で新しいruntime ID hermes_issen として実装。旧カードに対応なし。新規。") }),
        design(2, "サイコポンポス", "normal", 3, 10, { workbookTargetType: "Heal", targetType: "ally", category: "special",
            migration: migration(null, "new", "notImplemented", "旧カードに対応なし。新規。「魂」の仕組みが必要。") }),
        design(3, "ヴェイル", "special", 3, 10, { workbookTargetType: "その他", targetType: "cursor", category: "support", runtimeTargetTypeSupported: false,
            legacyCandidates: Object.freeze(["hermes_perception_obscure"]),
            migration: migration("hermes_perception_obscure", "coexist-pending", "notImplemented",
                "旧「認識阻害」(プレイヤー自身・5秒)と近いが、新設計は「カーソルに追従する範囲内の味方がターゲットされない」。置換するか別カードにするかはユーザー判断。") }),
        design(4, "ストレングス", "special", 10, 0.1, { workbookTargetType: "Buff", targetType: "instant", category: "buff",
            runtimeCardId: "hermes_strength", implemented: true,
            migration: migration(null, "new", "implemented", "Phase H2B-2で新しいruntime ID hermes_strength として実装。旧カードに対応なし。新規。") }),
        design(5, "薙ぎ払い", "normal", 3, 0.5, { workbookTargetType: "Direction", targetType: "direction", category: "attack",
            runtimeCardId: "hermes_sweep", implemented: true,
            legacyCandidates: Object.freeze(["hermes_sword_attack"]),
            migration: migration("hermes_sword_attack", "coexist-pending", "implemented-as-new-id",
                "Phase H2B-1で新しいruntime ID hermes_sweep として実装。旧「Hermes剣術」(前方の短い矩形・Cooldown 3秒)は削除・上書きせず共存。置換するか共存のままかはユーザー判断(未決)。") }),
        design(6, "葦笛", "strong", 3, 8, { workbookTargetType: "その他", targetType: "instant", category: "sleep",
            runtimeCardId: "hermes_reed_flute", implemented: true,
            legacyCandidates: Object.freeze(["hermes_reed_flute_sleep"]),
            migration: migration("hermes_reed_flute_sleep", "coexist-pending", "implemented-as-new-id",
                "Phase H2B-1で新しいruntime ID hermes_reed_flute として実装。旧「葦笛睡眠」(最大2枚・12秒・半径4・睡眠4秒・対象0体なら非消費)は削除・上書きせず共存(挙動も不変)。置換するか共存のままかはユーザー判断(未決)。") }),
        design(7, "絶", "strong", 5, 0.5, { workbookTargetType: "Ground", targetType: "ground", category: "movement",
            runtimeCardId: "hermes_zetsu", implemented: true,
            migration: migration("hermes_zetsu", "new-runtime-id", "implemented",
                "新しいruntime ID。旧「高速移動」(hermes_swift_movement)は設計7枚に含まれないが、削除せず共存(扱いはユーザー判断)。") })
    ]);
    // 設計7枚に含まれない現行カード(削除・変更しない)。Apolloはこのワークブックの対象外(集計シートでApollo 0枚)。
    const UNMAPPED_LEGACY = Object.freeze([
        Object.freeze({ cardId: "hermes_swift_movement", name: "高速移動", decision: "coexist-pending", note: "絶の近縁だが別カード。設計7枚に無い。" }),
        Object.freeze({ cardId: "apollo_golden_arrow", name: "黄金の弓矢", decision: "keep", note: "Apollo。ワークブック対象外。" }),
        Object.freeze({ cardId: "apollo_plague_attack", name: "疫病攻撃", decision: "keep", note: "Apollo。ワークブック対象外。" }),
        Object.freeze({ cardId: "apollo_lyre_calm", name: "竪琴の鎮静", decision: "keep", note: "Apollo。ワークブック対象外。" })
    ]);

    // 実装済みの新設計カードの実行時定義。CardDeckCoreのDefinitionRegistryと同じ正規化・凍結で追加する。
    // 絶(Zetsu): Hermes / 強力 / 最大5枚 / 最大Lv3 / Cooldown 0.5秒 / Ground(マウス位置)。
    // 薙ぎ払い(H2B-1): Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 0.5秒 / Direction。
    // 葦笛(H2B-1): Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / その他(=instant。狙いを使わない)。category "sleep" は旧葦笛睡眠と同じ。
    // 一閃(H2B-2): Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 7秒 / Direction。
    // ストレングス(H2B-2): Hermes / 特殊 / 最大10枚 / 最大Lv3 / Cooldown 0.1秒 / Buff(対象なし = instant)。
    const RUNTIME_CARDS = Object.freeze([
        Object.freeze({ cardId: "hermes_zetsu", ringId: "hermes", maxCopies: 5, cooldownSeconds: 0.5, maxLevel: 3,
            rarity: "strong", category: "movement", targetType: "ground" }),
        Object.freeze({ cardId: "hermes_sweep", ringId: "hermes", maxCopies: 3, cooldownSeconds: 0.5, maxLevel: 3,
            rarity: "normal", category: "attack", targetType: "direction" }),
        Object.freeze({ cardId: "hermes_reed_flute", ringId: "hermes", maxCopies: 3, cooldownSeconds: 8, maxLevel: 3,
            rarity: "strong", category: "sleep", targetType: "instant" }),
        Object.freeze({ cardId: "hermes_issen", ringId: "hermes", maxCopies: 3, cooldownSeconds: 7, maxLevel: 3,
            rarity: "strong", category: "attack", targetType: "direction" }),
        Object.freeze({ cardId: "hermes_strength", ringId: "hermes", maxCopies: 10, cooldownSeconds: 0.1, maxLevel: 3,
            rarity: "special", category: "buff", targetType: "instant" })
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
        unmappedLegacyCards: () => UNMAPPED_LEGACY,
        migrationAudit: () => HERMES.map(card => ({ designId: card.designId, name: card.name, runtimeCardId: card.runtimeCardId, ...card.migration, implemented: card.implemented })),
        registeredRuntimeCards: () => [...registered]
    });
})();
