/*:
 * @target MZ
 * @plugindesc v1.1.0 ProjectR カード設計カタログ(Hermes 7枚 + Apollo 8枚の設計メタデータ)と累積レベル解決。表示・保存なし。
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
 *   2. 本番の初期30枚デッキは、7枚すべてが実装されるまで有効にしません(isFinalDeckReady)。実装後(H2C-A)の付与とデッキ初期化は
 *      ProjectR_HermesProductionDeck(指輪の初回入手時に一度だけ)が行います。このカタログはデッキを適用しません。
 *   3. 全カード共通の「累積レベル」規則を1か所で解決します(resolveLevels)。
 *
 * 【実行時のカード定義の追加(旧カードとセーブの互換)】
 *   旧7枚のCardDefinitionsパラメータ(plugins.js)は一切変えません。新設計で実装済みのカードだけを、
 *   このPluginが起動時に ProjectRCardDeck.definitions へ追加します(RUNTIME_CARDS)。cardIdが既にあれば何もしません。
 *   所持データ(cardOwnership)は未所持が既定なので、旧セーブ・本番デッキには影響しません。
 *   追加済み(設計ID → runtime ID): 7 絶 → hermes_zetsu / 5 薙ぎ払い → hermes_sweep / 6 葦笛 → hermes_reed_flute /
 *   1 一閃 → hermes_issen / 4 ストレングス → hermes_strength / 3 ヴェイル → hermes_veil(Cursor)。2 サイコポンポス → hermes_psychopomp(H2B-3B。ワークブックの対象タイプ Heal は魂を拾う意味で、実行時は instant)。設計の全7枚が実装済み。
 *
 * 【複数の神(Phase Apollo-A2)】
 *   Apollo 8枚の設計(設計ID 8〜15・最大コピー数の合計30・全て確定)を、Hermesと同じ形式の読み取り専用データとして持ちます。
 *   runtimeCardId は衝突確認済みの「予約ID」で、implemented=false の間は CardDeckCore のレジストリへ登録しません
 *   (所持・付与・デッキ・Deck Builder・戦闘のどこからも使えない)。旧Apollo 3枚は削除・改名・自動変換をせず共存します。
 *   既存のHermes API(hermesDesign / migrationAudit() / buildFinalHermesDeck など)は、引数なしで従来と同じ結果を返します。
 *   Phase Apollo-A4: 設計ID 8 黄金の矢(apollo_golden_volley)だけを実装済みにし、実行時にレジストリへ登録します(Lv1〜3。Lv3の長押しはビーム。ProjectR_ApolloGoldenVolley)。残りの7枚は予約のままです。
 *   Phase Apollo-A6A: 設計ID 9 エロスの矢(apollo_eros_arrow)のLv1を実装済みにします(ProjectR_ApolloErosArrow)。Phase Apollo-A6BでLv2(80度間隔の3方向x7本)も実装し、登録上のmaxLevelは2です(Lv3は実装まで使えません)。残りの6枚は予約のままです。
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
 *   designs() / gods() / godDesign(godId)       全神/神ごとの設計(凍結。godId = "hermes" | "apollo")
 *   godTotalMaxCopies(godId) / godStatus(godId)  最大コピー数の合計・実装数・予約数・ブロッカー
 *   isGodDeckReady(godId) / buildGodDeck(godId)  その神の全カードが実装済みで合計30枚か / 30枚の参考一覧(未完は null。デッキの適用はしない)
 *   migrationAudit(godId)                         godId を渡すとその神の設計ID ↔ 旧カードID(省略時はHermes)
 *   plannedRuntimeCards(godId?)                   未実装(予約)カードの「登録すればこうなる」定義(凍結・登録されない)
 *   reservedRuntimeIds() / runtimeIdAudit()       予約IDと衝突監査(重複・旧ID・レジストリ・接頭辞の包含)
 *   inactiveRuntimeCards()                         予約済みでレジストリに無い(使えない)カードID
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
        god: "hermes", ringId: "hermes", runtimeCardId: null, implemented: false, legacyCandidates: Object.freeze([]),
        migration: Object.freeze({ legacyCardId: null, decision: "new", status: "notImplemented", note: "" }),
        runtimeTargetTypeSupported: true, ...extra
    });
    const migration = (legacyCardId, decision, status, note) => Object.freeze({ legacyCardId, decision, status, note });
    const HERMES = Object.freeze([
        design(1, "一閃", "strong", 3, 7, { workbookTargetType: "Direction", targetType: "direction", category: "attack",
            runtimeCardId: "hermes_issen", implemented: true,
            migration: migration(null, "new", "implemented", "Phase H2B-2で新しいruntime ID hermes_issen として実装。旧カードに対応なし。新規。") }),
        // ワークブックの対象タイプ「Heal」は、魂を拾って主人公を回復する意味。既存の ally/Heal(最寄りの味方を選ぶ)の意味ではないので、実行時は対象を選ばない instant。
        design(2, "サイコポンポス", "normal", 3, 10, { workbookTargetType: "Heal", targetType: "instant", category: "support",
            runtimeCardId: "hermes_psychopomp", implemented: true,
            migration: migration(null, "new", "implemented", "Phase H2B-3Bで新しいruntime ID hermes_psychopomp として実装。旧カードに対応なし。新規。ワークブックのHealは既存のallの選択ではなく、魂の回収による主人公の回復。") }),
        design(3, "ヴェイル", "special", 3, 10, { workbookTargetType: "その他", targetType: "cursor", category: "support",
            runtimeCardId: "hermes_veil", implemented: true,
            legacyCandidates: Object.freeze(["hermes_perception_obscure"]),
            migration: migration("hermes_perception_obscure", "coexist-pending", "implemented-as-new-id",
                "Phase H2B-3Aで新しいruntime ID hermes_veil として実装(Cursor対象)。旧「認識阻害」(プレイヤー自身・5秒・Stateによる)は削除・上書きせず共存(挙動も不変)。置換するか共存のままかはユーザー判断(未決)。") }),
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

    // ---- Apollo 8枚の設計(Phase Apollo-A2: メタデータの予約だけ。効果は未実装・未登録) -------------------------------------------------
    // 正本: _ProjectR_DesignSources\\ProjectR_CardManagement_Template(3)(4).xlsx(「カード一覧」行9〜16・全て「確定」・最大コピー数の合計30)。
    //   SHA-256 8cb974a7af8e13abd43a4eb6d3f95d378b873cb5b389f89a0e69d96abd271b0f。効果の仕様はXLSX(と ProjectR_Cards_15_ExactTranscription.md)が正で、ここは数値の転記と予約IDだけ。
    // runtimeCardId は「予約」: 衝突確認済みの安定ID。implemented=false の間は CardDeckCore のレジストリへ登録しない
    //   (所持・付与・デッキ・Deck Builder・戦闘のどこからも使えない)。旧Apollo 3枚(apollo_golden_arrow / apollo_plague_attack / apollo_lyre_calm)は
    //   削除・改名・自動変換をせず共存する(legacyCandidates は「名前が近い旧カード」の記録で、移行の対応表ではない)。
    // targetType は暫定(targetTypeStatus:"provisional"): ワークブックの対象タイプを、Hermesの前例(Buff・その他 = 狙いを使わない instant)で実行時の種別へ置いたもの。
    //   確定は各カードの実装Phaseで行う(特に黄金の矢は Ground だが効果は「指定の方向」。監査文書 §10 B1)。
    const apolloRow = (designId, name, classification, maxCopies, cooldownSeconds, extra) => design(designId, name, classification, maxCopies, cooldownSeconds, {
        god: "apollo", ringId: "apollo", targetTypeStatus: "provisional", status: "reserved", ...extra });
    const APOLLO = Object.freeze([
        apolloRow(8, "黄金の矢", "strong", 5, 3, { workbookTargetType: "Ground", targetType: "ground", category: "attack",
            runtimeCardId: "apollo_golden_volley", implemented: true, status: "implemented", targetTypeStatus: "confirmed", implementedLevels: 3, beamImplemented: true,
            legacyCandidates: Object.freeze(["apollo_golden_arrow"]),
            migration: migration("apollo_golden_arrow", "coexist-pending", "implemented-as-new-id",
                "Phase Apollo-A4でLv1〜2、A5AでLv3の扇、A5Bでビームを新しいruntime ID apollo_golden_volley として実装(Lv3は未実装)。旧「黄金の弓矢」(最大3・Cooldown 4・矢1本・Skill式)とは数値も効果も別カードで、自動変換しない。旧カードは削除・上書きせず共存。") }),
        apolloRow(9, "エロスの矢", "special", 5, 5, { workbookTargetType: "Ground", targetType: "ground", category: "special",
            runtimeCardId: "apollo_eros_arrow", implemented: true, status: "implemented", targetTypeStatus: "confirmed", implementedLevels: 2,
            migration: migration(null, "new", "implemented", "Phase Apollo-A6AでLv1、A6BでLv2を新ランタイムID apollo_eros_arrow として実装(Lv3は未実装で、登録上の最大Lvは2)。旧カードに対応なし。新規。") }),
        apolloRow(10, "竪琴", "special", 2, 4, { workbookTargetType: "その他", targetType: "instant", category: "special",
            runtimeCardId: "apollo_lyre_rhythm", legacyCandidates: Object.freeze(["apollo_lyre_calm"]),
            migration: migration("apollo_lyre_calm", "coexist-pending", "reserved-not-implemented",
                "新ランタイムID apollo_lyre_rhythm を予約。旧「リラの支援/竪琴の鎮静」(ally・最大3・Cooldown 10・睡眠を防ぐState)とは効果が根本的に別(新: 音符のリズム入力)で、自動変換しない。旧カードは共存。") }),
        apolloRow(11, "月桂冠", "strong", 3, 8, { workbookTargetType: "Buff", targetType: "instant", category: "support",
            runtimeCardId: "apollo_laurel_wreath",
            migration: migration(null, "new", "reserved-not-implemented", "新ランタイムID apollo_laurel_wreath を予約。旧カードに対応なし。新規。") }),
        apolloRow(12, "ヒュアキントス", "special", 3, 7, { workbookTargetType: "Buff", targetType: "instant", category: "special",
            runtimeCardId: "apollo_hyacinthus",
            migration: migration(null, "new", "reserved-not-implemented", "新ランタイムID apollo_hyacinthus を予約。旧カードに対応なし。新規。") }),
        apolloRow(13, "ギガース殺し", "strong", 5, 3, { workbookTargetType: "Ground", targetType: "ground", category: "disrupt",
            runtimeCardId: "apollo_gigas_slayer",
            migration: migration(null, "new", "reserved-not-implemented", "新ランタイムID apollo_gigas_slayer を予約。旧カードに対応なし。新規。") }),
        apolloRow(14, "神託", "strong", 3, 3, { workbookTargetType: "その他", targetType: "instant", category: "special",
            runtimeCardId: "apollo_oracle",
            migration: migration(null, "new", "reserved-not-implemented", "新ランタイムID apollo_oracle を予約。旧カードに対応なし。新規。") }),
        apolloRow(15, "疫病の矢", "strong", 4, 5, { workbookTargetType: "Direction", targetType: "direction", category: "disrupt",
            runtimeCardId: "apollo_plague_rain", legacyCandidates: Object.freeze(["apollo_plague_attack"]),
            migration: migration("apollo_plague_attack", "coexist-pending", "reserved-not-implemented",
                "新ランタイムID apollo_plague_rain を予約。旧「疫病攻撃/アポロン病攻撃」(最大2・Cooldown 12・命中した敵への継続ダメージ)とは着弾サークル・ネズミ・分裂を持つ別カードで、自動変換しない。旧カードは共存。") })
    ]);
    const DESIGNS_BY_GOD = Object.freeze({ hermes: HERMES, apollo: APOLLO });
    const GOD_IDS = Object.freeze(Object.keys(DESIGNS_BY_GOD));
    const ALL_DESIGNS = Object.freeze([].concat(HERMES, APOLLO));
    const godRows = godId => DESIGNS_BY_GOD[godId] || Object.freeze([]);
    // 設計に含まれない/設計と別カードの現行カード(削除・変更しない)。Apollo 3枚は新設計(設計ID 8/10/15)とは別の旧実装で、共存する。
    const UNMAPPED_LEGACY = Object.freeze([
        Object.freeze({ cardId: "hermes_swift_movement", name: "高速移動", decision: "coexist-pending", note: "絶の近縁だが別カード。設計7枚に無い。" }),
        Object.freeze({ cardId: "apollo_golden_arrow", name: "黄金の弓矢", decision: "keep", note: "Apollo旧実装。新設計の黄金の矢(設計ID 8 / apollo_golden_volley)とは別カードで共存。" }),
        Object.freeze({ cardId: "apollo_plague_attack", name: "疫病攻撃", decision: "keep", note: "Apollo旧実装。新設計の疫病の矢(設計ID 15 / apollo_plague_rain)とは別カードで共存。" }),
        Object.freeze({ cardId: "apollo_lyre_calm", name: "竪琴の鎮静", decision: "keep", note: "Apollo旧実装。新設計の竪琴(設計ID 10 / apollo_lyre_rhythm)とは別カードで共存。" })
    ]);

    // 実装済みの新設計カードの実行時定義。CardDeckCoreのDefinitionRegistryと同じ正規化・凍結で追加する。
    // 絶(Zetsu): Hermes / 強力 / 最大5枚 / 最大Lv3 / Cooldown 0.5秒 / Ground(マウス位置)。
    // 薙ぎ払い(H2B-1): Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 0.5秒 / Direction。
    // 葦笛(H2B-1): Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / その他(=instant。狙いを使わない)。category "sleep" は旧葦笛睡眠と同じ。
    // 一閃(H2B-2): Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 7秒 / Direction。
    // ストレングス(H2B-2): Hermes / 特殊 / 最大10枚 / 最大Lv3 / Cooldown 0.1秒 / Buff(対象なし = instant)。
    // ヴェイル(H2B-3A): Hermes / 特殊 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / Cursor(マウスに追従する半径5マス)。
    // サイコポンポス(H2B-3B): Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / ワークブックはHeal(実行時は対象を選ばない instant。魂を拾って回復)。
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
            rarity: "special", category: "buff", targetType: "instant" }),
        Object.freeze({ cardId: "hermes_veil", ringId: "hermes", maxCopies: 3, cooldownSeconds: 10, maxLevel: 3,
            rarity: "special", category: "support", targetType: "cursor" }),
        Object.freeze({ cardId: "hermes_psychopomp", ringId: "hermes", maxCopies: 3, cooldownSeconds: 10, maxLevel: 3,
            rarity: "normal", category: "support", targetType: "instant" }),
        // 黄金の矢(Apollo-A4。Lv1〜2のみ実装): Apollo / 強力 / 最大5枚 / 最大Lv3(所持上限は設計どおり。Lv3の効果は未実装でLv2と同じ) / Cooldown 3秒 / Ground(マウス位置が撃つ方向)。
        Object.freeze({ cardId: "apollo_golden_volley", ringId: "apollo", maxCopies: 5, cooldownSeconds: 3, maxLevel: 3,
            rarity: "strong", category: "attack", targetType: "ground" }),
        // エロスの矢(Apollo-A6A/A6B。Lv1〜2を実装): Apollo / 特殊 / 最大5枚 / Cooldown 5秒 / Ground(マウス方向)。Lv3の効果は未実装なので登録上の最大Lvは2(ワークブックの最大Lv3は設計行のまま)。
        Object.freeze({ cardId: "apollo_eros_arrow", ringId: "apollo", maxCopies: 5, cooldownSeconds: 5, maxLevel: 2,
            rarity: "special", category: "special", targetType: "ground" })
    ]);
    const registerRuntimeCards = () => {
        const registry = root.ProjectRCardDeck?.definitions;
        const cards = registry?.cards;
        if (!(cards instanceof Map)) return [];
        const added = [];
        for (const card of RUNTIME_CARDS) {
            const row = ALL_DESIGNS.find(d => d.runtimeCardId === card.cardId);
            if (row && !row.implemented) continue; // 未実装(予約)の設計は登録しない
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

    // ---- 複数の神(Apollo-A2): 神ごとの集計・予約IDの監査 ------------------------------------------------------------------------------
    const godTotalMaxCopies = godId => godRows(godId).reduce((sum, card) => sum + card.maxCopies, 0);
    const godBlockers = godId => godRows(godId).filter(card => !card.implemented).map(card => card.name);
    const isGodDeckReady = godId => godRows(godId).length > 0 && godBlockers(godId).length === 0 && godTotalMaxCopies(godId) === 30;
    const buildGodDeck = godId => {
        if (!isGodDeckReady(godId)) return null;
        const ids = [];
        for (const card of godRows(godId)) for (let i = 0; i < card.maxCopies; i++) ids.push(card.runtimeCardId);
        return ids;
    };
    const godStatus = godId => {
        const rows = godRows(godId);
        return Object.freeze({ god: godId, ringId: rows.length ? rows[0].ringId : null, count: rows.length, totalMaxCopies: godTotalMaxCopies(godId),
            implemented: rows.filter(card => card.implemented).length, reserved: rows.filter(card => !card.implemented && !!card.runtimeCardId).length,
            blockers: Object.freeze(godBlockers(godId)), ready: isGodDeckReady(godId) });
    };
    // 未実装(予約)カードの定義。CardDeckCoreのレジストリへは登録されない(登録するのは実装Phaseで implemented を true にするときだけ)。
    const plannedRuntimeCards = godId => ALL_DESIGNS.filter(d => !d.implemented && d.runtimeCardId && (!godId || d.god === godId)).map(d => Object.freeze({
        cardId: d.runtimeCardId, ringId: d.ringId, maxCopies: d.maxCopies, cooldownSeconds: d.cooldownSeconds, maxLevel: d.maxLevel,
        rarity: d.classification, category: d.category, targetType: d.targetType }));
    const reservedRuntimeIds = () => ALL_DESIGNS.filter(d => d.runtimeCardId).map(d => d.runtimeCardId);
    const inactiveRuntimeCards = () => {
        const cards = root.ProjectRCardDeck?.definitions?.cards;
        return ALL_DESIGNS.filter(d => d.runtimeCardId && !d.implemented && !(cards instanceof Map && cards.has(d.runtimeCardId))).map(d => d.runtimeCardId);
    };
    const runtimeIdAudit = () => {
        const problems = [];
        const ids = reservedRuntimeIds();
        const cards = root.ProjectRCardDeck?.definitions?.cards;
        const legacy = new Set(UNMAPPED_LEGACY.map(c => c.cardId).concat(...ALL_DESIGNS.map(d => d.legacyCandidates)));
        const seen = new Set();
        for (const d of ALL_DESIGNS) {
            if (!d.runtimeCardId) continue;
            if (seen.has(d.runtimeCardId)) problems.push({ type: "duplicate", cardId: d.runtimeCardId });
            seen.add(d.runtimeCardId);
            if (legacy.has(d.runtimeCardId)) problems.push({ type: "legacyId", cardId: d.runtimeCardId });
            if (!d.implemented && cards instanceof Map && cards.has(d.runtimeCardId)) problems.push({ type: "reservedButRegistered", cardId: d.runtimeCardId });
            if (d.implemented && cards instanceof Map && !cards.has(d.runtimeCardId)) problems.push({ type: "implementedButMissing", cardId: d.runtimeCardId });
            if (!/^[a-z]+_[a-z_]+$/.test(d.runtimeCardId) || !d.runtimeCardId.startsWith(d.god + "_")) problems.push({ type: "badShape", cardId: d.runtimeCardId });
        }
        // Noteの印(<ProjectRCard: id>)などの部分一致で別カードに誤ってかからないよう、予約IDは他のどのIDの接頭辞にもならないこと
        // (実装済みのHermesの hermes_reed_flute と旧 hermes_reed_flute_sleep の重なりは、導入済みで動作確認済みのためここでは数えない)。
        const reserved = ALL_DESIGNS.filter(d => !d.implemented && d.runtimeCardId).map(d => d.runtimeCardId);
        const everyId = [...ids, ...legacy, ...(cards instanceof Map ? [...cards.keys()] : [])];
        for (const a of new Set(reserved)) for (const b of new Set(everyId)) if (a !== b && b.startsWith(a)) problems.push({ type: "prefix", cardId: a, other: b });
        return { ids, problems };
    };

    root.ProjectRCardCatalog = Object.freeze({
        resolveLevels,
        hermesDesign: () => HERMES,
        hermesTotalMaxCopies: totalMaxCopies,
        isFinalDeckReady, // 設計の7枚がすべて実装済みで合計30枚か(実装の完了のみ。デッキの有効化ではない)
        isFinalDeckActivated: () => false, // このカタログ自体はデッキを適用しない(読み取り専用のデータ)。H2C-A以降の付与・初期化は ProjectR_HermesProductionDeck が指輪の初回入手時に行う
        finalDeckBlockers: blockers,
        buildFinalHermesDeck,
        runtimeCards: () => RUNTIME_CARDS,
        unmappedLegacyCards: () => UNMAPPED_LEGACY,
        migrationAudit: godId => godRows(godId || "hermes").map(card => ({ designId: card.designId, name: card.name, runtimeCardId: card.runtimeCardId, ...card.migration, implemented: card.implemented })),
        designs: () => ALL_DESIGNS, gods: () => GOD_IDS, godDesign: godRows, godTotalMaxCopies, godStatus, isGodDeckReady, buildGodDeck,
        plannedRuntimeCards, reservedRuntimeIds, inactiveRuntimeCards, runtimeIdAudit,
        registeredRuntimeCards: () => [...registered]
    });
})();
