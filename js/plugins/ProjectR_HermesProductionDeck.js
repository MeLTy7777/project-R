/*:
 * @target MZ
 * @plugindesc v1.1.0 Hermes本番デッキ統合(H2C-A/H2C-B2): 指輪の初回入手で7種30枚を一度だけ付与・デッキ初期化・表示名/説明/Level別効果・旧セーブの診断。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardInventory
 * @base ProjectR_BattleHUD
 * @base ProjectR_MenuCore
 * @base ProjectR_MenuIntegration
 * @orderAfter ProjectR_CardCatalog
 * @orderAfter ProjectR_CardInventory
 * @orderAfter ProjectR_MenuIntegration
 * @orderAfter ProjectR_HermesPsychopomp
 *
 * @command AcquireHermesRing
 * @text ヘルメースの指輪を入手する(初回は初期カード30枚)
 * @desc 指輪をまだ誰も持っていなければ主人公の所持にし、初回だけ初期カード(7種30枚)を付与します。2回目以降・すでに所持している場合は何も増やしません。戦闘中は失敗します。
 *
 * @help
 * ProjectR_HermesProductionDeck.js
 *
 * 【役割】Phase H2C-A。実装済みの新Hermes 7枚(ワークブックの設計ID 1〜7)を、通常のゲーム進行(指輪の入手・所持・デッキ構築・戦闘前検証)へ接続します。
 *   新しいカード効果は作りません。既存の7枚の実装・旧カード(hermes_sword_attack など)・既存セーブの内容は変えません。
 *
 * 【初回入手と付与(冪等)】
 *   次の経路のどれでも、Hermesの指輪を「誰も持っていない状態」から主人公が初めて手に入れた瞬間に、一度だけ次を行います。
 *     ・プラグインコマンド「ヘルメースの指輪を入手する」(本プラグイン)
 *     ・既存のプラグインコマンド ProjectR_MenuIntegration「指輪を主人公に入手させる」で ringId=hermes(本プラグインが包んで連動)
 *     ・API ProjectRHermesProductionDeck.acquireRing("hermes")
 *   付与 = 一閃3 / サイコポンポス3 / ヴェイル3 / ストレングス10 / 薙ぎ払い3 / 葦笛3 / 絶5 = 7種30枚(正本はProjectR_CardCatalogの設計データ)。
 *   H2C-B2: 付与は実際の所持コピー数(ProjectR_CardInventory)として加算します(30枚の物理コピー)。デッキに入れられる枚数は min(所持枚数, maxCopies)。
 *   すでに独立して持っているコピーは減らしも上書きもせず、その上に初期コピーを加えます(報酬ID hermes.ring.starter で一度だけ)。
 *   すでに所持しているカードのLevelは下げません。デッキが空のときだけ、付与した30枚でデッキを初期化します。既存のデッキは上書きしません。
 *   付与の記録は $gameSystem._projectRHermesProduction(version 1)に保存します。記録が無い旧セーブは「未付与」と読みます。
 *   2回目の入手・セーブ/ロード・指輪を仲間に渡して戻した場合・別の経路での再入手では、付与も初期化もしません(二重付与なし)。
 *
 * 【新しいゲーム】新しいゲームの開始時にHermesの指輪をすでに主人公が持つ設定(CardDeckCoreのRingDefinitions.initialOwner=player)なら、
 *   同じ付与を一度だけ行います。ロードでは付与しません。
 *
 * 【旧セーブ】指輪をすでに持つ旧セーブを読み込んでも、30枚は付与しません。旧カードのID・所持・Level・保存デッキは一切変更しません。
 *   旧カードと新カードは別のランタイムIDで共存します(統合は未決。移行案は legacyMigrationProposal() に表示専用で出し、適用しません)。
 *
 * 【表示】カード名(HUDとメニュー共通)・説明・Level別効果・分類(ワークブックの系統)・対象タイプ(Cursorを含む)をここで登録します。
 *   神の絵・音は不要です(アイコンは未設定)。
 *
 * API: ProjectRHermesProductionDeck
 *   starterSet() / starterTotal()          付与するカードと枚数(30)
 *   acquireRing(ringId?, {source})        指輪の入手(冪等)。戻り値 { ok, acquired, granted, reason, ... }
 *   grantStarter({source, explicit})      付与だけ(冪等)。指輪をすでに持つ旧セーブには explicit:true が必要
 *   hasGranted() / state()                付与の記録
 *   diagnose()                            指輪・新旧カード・デッキの診断(読み取り専用)
 *   legacyMigrationProposal()             旧カード→新カードの移行案とこのセーブへの影響(表示専用。何も変更しない)
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_HermesProductionDeck";
    const RING_ID = "hermes";
    const STATE_KEY = "_projectRHermesProduction";
    const STATE_VERSION = 1;
    const STARTER_REWARD_ID = "hermes.ring.starter";

    const deck = () => root.ProjectRCardDeck;
    const catalog = () => root.ProjectRCardCatalog;
    const menu = () => root.ProjectRMenuCore;
    const hud = () => root.ProjectRBattleHUD;

    // ---- 表示データ(ワークブック「カード一覧」のゲーム内説明・Lv1〜3を、実装済みの意味で書き起こしたもの) -----------------
    // levels[i] = Level i+1 で加わる/置き換わる効果。実装の正は各カードのPluginで、ここは表示だけ(効果・数値は変えない)。
    const DISPLAY = Object.freeze({
        hermes_issen: Object.freeze({
            name: "一閃", categoryLabel: "攻撃", targetLabel: "方向(マウス方向・最大11マス)",
            description: "ヘルメースがマウスポインタ方向に一直線に居合切りをする。",
            levels: Object.freeze([
                "命中した敵に防御無視200ダメージ + 3秒間の分割ダメージ(合計50)。",
                "分割ダメージが合計100に置き換わる。",
                "敵の移動速度-50%(3秒)が加わる。"
            ])
        }),
        hermes_psychopomp: Object.freeze({
            name: "サイコポンポス", categoryLabel: "特殊", targetLabel: "回復(対象なし・即時。魂を拾って回復)",
            description: "効果時間(10秒)中に敵を倒すと敵から魂が落ちる。その魂を拾うと自身のHPを回復する。",
            levels: Object.freeze([
                "魂1つにつきHP+50(半径5マスで回収)。",
                "回復量が+100に置き換わる。",
                "回復量が+150に置き換わり、攻撃力+3%(拾ってから3秒・重ね掛け)が加わる。"
            ])
        }),
        hermes_veil: Object.freeze({
            name: "ヴェイル", categoryLabel: "支援", targetLabel: "カーソル追従(マウスに追従する半径5マス)",
            description: "マウスポインタ上にヘルメースが召喚され、魔法陣を作成する。その中に入ると敵からターゲットを取られなくなる。マウスポインタを追尾する。",
            levels: Object.freeze([
                "範囲内の味方は敵にターゲットされなくなる(5秒)。",
                "範囲内の味方の移動速度が30%上昇する。",
                "範囲内の味方のクリティカル発生率が50%上昇する。"
            ])
        }),
        hermes_strength: Object.freeze({
            name: "ストレングス", categoryLabel: "特殊", targetLabel: "強化(対象なし・即時)",
            description: "力を蓄え、次の物理攻撃のパワーを上げる。",
            levels: Object.freeze([
                "次の物理攻撃の攻撃力が10%上昇(重ね掛け可・上限なし。攻撃で一度にすべて消費)。",
                "1回あたりの上昇が15%に置き換わる。",
                "15%に加えて、その攻撃は防御を無視する。"
            ])
        }),
        hermes_sweep: Object.freeze({
            name: "薙ぎ払い", categoryLabel: "攻撃", targetLabel: "方向(マウス方向・扇状4マス)",
            description: "マウスポインタ方向に杖を薙ぎ払う。",
            levels: Object.freeze([
                "判定内の敵に50ダメージ。",
                "先端1マスに当てると+50ダメージが加わる。",
                "クリティカル発生率が50%上昇する。"
            ])
        }),
        hermes_reed_flute: Object.freeze({
            name: "葦笛", categoryLabel: "妨害", targetLabel: "その他(対象なし・即時。周囲の敵)",
            description: "周囲の敵を眠らせる。",
            levels: Object.freeze([
                "範囲内の敵を眠らせる。ダメージを与えると起きる。",
                "眠らせた敵に与えるダメージが+50される。",
                "その攻撃はクリティカル確定になる。"
            ])
        }),
        hermes_zetsu: Object.freeze({
            name: "絶", categoryLabel: "移動", targetLabel: "指定位置(マウス位置・遮蔽物の手前まで)",
            description: "指定の位置にテレポートする。遮蔽物がある場合はその直前にテレポートする。",
            levels: Object.freeze([
                "テレポート後0.8秒以内に最初に命中した通常武器攻撃の最終ダメージ×1.5。",
                "上記の倍率が×2.0に置き換わる。",
                "倍率が×3.0に置き換わり、テレポート後1秒間、移動速度×2.0が加わる。"
            ])
        })
    });

    // ---- 旧カード → 新カードの移行案(表示専用。適用しない。判断はユーザー・H2C以降) ------------------------------------
    const LEGACY_MAP = Object.freeze([
        Object.freeze({ legacy: "hermes_sword_attack", proposed: "hermes_sweep", relation: "replacement-candidate",
            differences: "旧=前方の短い矩形・Cooldown 3秒・最大3枚 / 新=扇状190度・4マス・0.5秒・最大3枚" }),
        Object.freeze({ legacy: "hermes_reed_flute_sleep", proposed: "hermes_reed_flute", relation: "replacement-candidate",
            differences: "旧=最大2枚・12秒・半径4・睡眠4秒・対象0体は非消費 / 新=最大3枚・8秒・半径8・ダメージで起床・対象なしでも消費" }),
        Object.freeze({ legacy: "hermes_perception_obscure", proposed: "hermes_veil", relation: "replacement-candidate",
            differences: "旧=主人公自身・5秒・State / 新=カーソル追従の範囲内の味方・5秒・標的から外れる" }),
        Object.freeze({ legacy: "hermes_swift_movement", proposed: null, relation: "no-equivalent",
            differences: "旧=マウス方向へ最大3マスの高速移動。設計7枚に対応なし(絶は別カード)。共存のまま" })
    ]);

    const OWNER_PLAYER = "player";
    const OWNER_UNOWNED = "unowned";

    // ---- 状態(セーブされる付与の記録) ---------------------------------------------------------------------------------
    let memoryState = null; // $gameSystem が無いとき(起動直後・テスト)だけ使う
    const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
    const freshState = () => ({ version: STATE_VERSION, rings: {} });
    const readState = () => {
        const system = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        let state = system ? system[STATE_KEY] : memoryState;
        if (!isObject(state) || !isObject(state.rings)) {
            state = freshState();
            if (system) system[STATE_KEY] = state; else memoryState = state;
        } else if (!Number.isFinite(state.version)) {
            state.version = STATE_VERSION; // versionの無い記録は version 1 として読む(中身は変えない)
        }
        return state;
    };
    const ringRecord = ringId => {
        const record = readState().rings[ringId];
        return isObject(record) ? record : null;
    };
    const copy = value => JSON.parse(JSON.stringify(value));

    // ---- 付与するカード(正本 = CardCatalogの設計データ) -----------------------------------------------------------------
    const starterSet = () => {
        const designs = catalog()?.hermesDesign?.() || [];
        return designs.filter(d => d.implemented && d.runtimeCardId).map(d => ({
            designId: d.designId, cardId: d.runtimeCardId, name: d.name, copies: d.firstGrantCopies, maxCopies: d.maxCopies
        }));
    };
    const starterTotal = () => starterSet().reduce((sum, card) => sum + card.copies, 0);
    const starterProblems = () => {
        const problems = [];
        const set = starterSet();
        if (set.length !== 7) problems.push({ code: "STARTER_CARD_COUNT", actual: set.length, expected: 7 });
        if (starterTotal() !== 30) problems.push({ code: "STARTER_TOTAL", actual: starterTotal(), expected: 30 });
        for (const card of set) {
            const definition = deck()?.definitions?.card?.(card.cardId);
            if (!definition) problems.push({ code: "CARD_NOT_REGISTERED", cardId: card.cardId });
            else if (definition.ringId !== RING_ID) problems.push({ code: "CARD_RING_MISMATCH", cardId: card.cardId, ringId: definition.ringId });
            else if (card.copies > definition.maxCopies) problems.push({ code: "COPIES_OVER_MAX", cardId: card.cardId });
        }
        return problems;
    };

    const combatActive = () => !!menu()?.isLocked?.();
    const ringOwner = ringId => deck()?.getRingOwner?.(ringId) ?? null;

    // ---- 付与(冪等・原子的) ------------------------------------------------------------------------------------------
    // performGrant: 呼び出し側(初回入手 / 新しいゲーム)が「新規の入手」であることを確認済みの内部処理。
    const hasGranted = ringId => !!ringRecord(ringId || RING_ID)?.granted;
    const performGrant = source => {
        const api = deck();
        if (!api) return { ok: false, granted: false, reason: "noCore" };
        if (hasGranted(RING_ID)) return { ok: true, granted: false, reason: "alreadyGranted" };
        if (combatActive()) return { ok: false, granted: false, reason: "inCombat" };
        const problems = starterProblems();
        if (problems.length) return { ok: false, granted: false, reason: "definitionsInvalid", problems };

        const inventory = root.ProjectRCardInventory;
        if (!inventory) return { ok: false, granted: false, reason: "noInventory" };
        const set = starterSet();
        const ownedBefore = set.filter(card => api.isCardOwned(card.cardId)).map(card => card.cardId);
        const copiesBefore = {};
        const bundle = {};
        for (const card of set) { copiesBefore[card.cardId] = inventory.getOwnedCopies(card.cardId); bundle[card.cardId] = card.copies; }
        // 実際の所持コピーとして加算する(解放も同時に行い、既存のLevelは変えない)。報酬IDで二重付与を防ぐ。
        const granted = inventory.grantBundle(STARTER_REWARD_ID, bundle, { source: "hermesStarter:" + source });
        if (!granted.ok) return { ok: false, granted: false, reason: "grantFailed", detail: granted.reasons };
        if (!granted.granted) return { ok: true, granted: false, reason: "alreadyGranted" };
        // デッキが空で、指輪を主人公が持つときだけ初期化する。既存のデッキ(不正でも)は上書きしない。
        let deckInitialized = false;
        if (api.getDeck().length === 0 && ringOwner(RING_ID) === OWNER_PLAYER) {
            const ids = catalog()?.buildFinalHermesDeck?.();
            if (Array.isArray(ids) && ids.length === 30) {
                api.setDeck(ids);
                deckInitialized = true;
            }
        }
        const cards = {};
        for (const card of set) cards[card.cardId] = card.copies;
        readState().rings[RING_ID] = {
            granted: true, source, version: STATE_VERSION, cards, totalCopies: starterTotal(), deckInitialized, ownedBefore, copiesBefore
        };
        return { ok: true, granted: true, reason: "granted", source, cards, totalCopies: starterTotal(), deckInitialized, ownedBefore, copiesBefore };
    };
    // 公開の grantStarter は「明示的な付与」専用。指輪をすでに持つ旧セーブを読み込んだだけでは呼ばれない。
    const grantStarter = (options = {}) => {
        if (hasGranted(RING_ID)) return { ok: true, granted: false, reason: "alreadyGranted" };
        if (options.explicit !== true) return { ok: false, granted: false, reason: "explicitRequired", owner: ringOwner(RING_ID) };
        return performGrant(String(options.source || "explicit"));
    };

    // ---- 指輪の入手 -------------------------------------------------------------------------------------------------
    const acquireRing = (ringId = RING_ID, options = {}) => {
        const api = deck();
        const id = String(ringId || "").trim();
        if (!api) return { ok: false, acquired: false, granted: false, reason: "noCore" };
        if (!api.definitions.ring(id)) return { ok: false, acquired: false, granted: false, reason: "INVALID_RING_ID" };
        const previous = ringOwner(id);
        if (previous === OWNER_PLAYER) return { ok: true, acquired: false, granted: false, reason: "alreadyOwned", previousOwner: previous };
        if (previous !== OWNER_UNOWNED) return { ok: true, acquired: false, granted: false, reason: "heldByAlly", previousOwner: previous };
        const assigned = api.assignRingToPlayer(id);
        if (!assigned.ok) return { ok: false, acquired: false, granted: false, reason: "assignFailed", detail: assigned.reasons };
        if (id !== RING_ID) return { ok: true, acquired: true, granted: false, reason: "noStarterForRing", previousOwner: previous };
        const grant = performGrant(String(options.source || "acquisition"));
        return { ...grant, ok: grant.ok, acquired: true, granted: !!grant.granted, previousOwner: previous };
    };

    // 既存の「指輪を主人公に入手させる」コマンド(ProjectR_MenuIntegration)に連動する。ほかの指輪・失敗・2回目は元のまま。
    const hookGrantRingCommand = () => {
        if (typeof PluginManager === "undefined" || !PluginManager.registerCommand) return false;
        const integration = root.ProjectRMenuIntegration;
        const original = integration?.commands?.GrantRing;
        if (typeof original !== "function") return false;
        PluginManager.registerCommand("ProjectR_MenuIntegration", "GrantRing", function(args) {
            const id = String(args?.ringId || "").trim();
            const previous = id === RING_ID ? ringOwner(id) : null;
            const result = original.apply(this, arguments);
            if (id === RING_ID && previous === OWNER_UNOWNED && result && result.ok !== false) {
                performGrant("GrantRing");
            }
            return result;
        });
        return true;
    };
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "AcquireHermesRing", () => {
            const result = acquireRing(RING_ID, { source: "AcquireHermesRing" });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] AcquireHermesRing failed:`, JSON.stringify(result));
            return result;
        });
    }
    const hooked = hookGrantRingCommand();

    // ---- 新しいゲーム ------------------------------------------------------------------------------------------------
    const onNewGame = () => {
        if (ringOwner(RING_ID) === OWNER_PLAYER && !hasGranted(RING_ID)) return performGrant("newGame");
        return { ok: true, granted: false, reason: "noRingAtStart" };
    };
    if (typeof DataManager !== "undefined" && DataManager.setupNewGame) {
        const _setupNewGame = DataManager.setupNewGame;
        DataManager.setupNewGame = function() {
            _setupNewGame.apply(this, arguments);
            try { onNewGame(); } catch (error) {
                if (typeof console !== "undefined") console.warn(`[${PLUGIN}] new game grant failed:`, error);
            }
        };
    }
    // ---- 診断(読み取り専用) -----------------------------------------------------------------------------------------
    const diagnose = () => {
        const api = deck();
        const production = starterSet();
        const productionIds = production.map(card => card.cardId);
        // 旧カード = 新設計より前から本番にある7枚(Hermes 4種 + Apollo 3種)。
        const legacyIds = [...new Set(LEGACY_MAP.map(row => row.legacy).concat((catalog()?.unmappedLegacyCards?.() || []).map(card => card.cardId)))];
        const cardIds = api ? api.getDeck() : [];
        const count = id => cardIds.filter(x => x === id).length;
        const reasons = api ? api.getDeckInvalidReasons(cardIds) : [];
        const unknown = [...new Set(cardIds.filter(id => api && !api.definitions.card(id)))];
        const productionInDeck = cardIds.filter(id => productionIds.includes(id)).length;
        const legacyInDeck = cardIds.filter(id => legacyIds.includes(id)).length;
        const otherInDeck = cardIds.length - productionInDeck - legacyInDeck - unknown.length;
        let kind = "empty";
        if (cardIds.length) {
            if (unknown.length) kind = "hasUnknownCards";
            else if (productionInDeck && (legacyInDeck || otherInDeck)) kind = "mixed";
            else if (productionInDeck) kind = "production";
            else if (legacyInDeck && !otherInDeck) kind = "legacy";
            else kind = "other";
        }
        const record = ringRecord(RING_ID);
        return {
            ring: { id: RING_ID, owner: ringOwner(RING_ID), granted: !!record?.granted, record: record ? copy(record) : null },
            production: {
                cards: production.map(card => ({ cardId: card.cardId, name: card.name, owned: !!api?.isCardOwned(card.cardId),
                    level: api?.getPersistentData?.().cardOwnership?.[card.cardId]?.level ?? 1, copies: card.copies, inDeck: count(card.cardId),
                    ownedCopies: root.ProjectRCardInventory?.getOwnedCopies?.(card.cardId) ?? 0 })),
                ownedKinds: production.filter(card => api?.isCardOwned(card.cardId)).length,
                totalCopies: production.reduce((sum, card) => sum + (root.ProjectRCardInventory?.getOwnedCopies?.(card.cardId) ?? 0), 0),
                problems: starterProblems()
            },
            legacy: {
                owned: legacyIds.filter(id => api?.isCardOwned(id)),
                inDeck: legacyIds.map(id => ({ cardId: id, count: count(id) })).filter(e => e.count > 0)
            },
            deck: { count: cardIds.length, kind, valid: reasons.length === 0, reasons: copy(reasons), unknownCardIds: unknown,
                productionInDeck, legacyInDeck, otherInDeck },
            messages: menu()?.deck?.status?.().groupedMessages || []
        };
    };

    const legacyMigrationProposal = () => {
        const api = deck();
        const cardIds = api ? api.getDeck() : [];
        const rows = LEGACY_MAP.map(row => {
            const legacyDef = api?.definitions?.card?.(row.legacy) || null;
            const newDef = row.proposed ? api?.definitions?.card?.(row.proposed) || null : null;
            const inDeck = cardIds.filter(id => id === row.legacy).length;
            return {
                legacy: row.legacy, proposed: row.proposed, relation: row.relation, differences: row.differences,
                legacyOwned: !!api?.isCardOwned(row.legacy), legacyLevel: api?.getPersistentData?.().cardOwnership?.[row.legacy]?.level ?? 1,
                legacyInDeck: inDeck, legacyMaxCopies: legacyDef?.maxCopies ?? null, proposedMaxCopies: newDef?.maxCopies ?? null,
                proposedOwned: row.proposed ? !!api?.isCardOwned(row.proposed) : false,
                wouldFitCopyLimit: newDef ? inDeck <= newDef.maxCopies : null
            };
        });
        return { applied: false, note: "表示専用の提案です。このAPIは所持・デッキ・Levelを一切変更しません。適用するかはユーザー判断(H2C以降)。", rows };
    };

    // ---- 表示の登録(HUD・メニュー共通。神の絵・音は不要) -----------------------------------------------------------------
    const registerPresentation = () => {
        const registered = [];
        for (const [cardId, display] of Object.entries(DISPLAY)) {
            hud()?.setCardPresentation?.(cardId, { name: display.name });
            menu()?.setCardText?.(cardId, {
                description: display.description, levels: [...display.levels],
                categoryLabel: display.categoryLabel, targetLabel: display.targetLabel
            });
            registered.push(cardId);
        }
        return registered;
    };
    const presented = registerPresentation();

    root.ProjectRHermesProductionDeck = Object.freeze({
        VERSION: "1.1.0",
        STARTER_REWARD_ID,
        RING_ID,
        STATE_KEY,
        display: () => DISPLAY,
        presentedCardIds: () => [...presented],
        grantRingCommandHooked: () => hooked,
        starterSet, starterTotal, starterProblems,
        acquireRing, grantStarter, onNewGame,
        hasGranted, state: () => copy(readState()),
        diagnose, legacyMigrationProposal
    });
    if (typeof module !== "undefined" && module.exports) module.exports = root.ProjectRHermesProductionDeck;
})();
