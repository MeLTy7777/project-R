/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カード所持枚数(H2C-B2): 実際の所持コピー数・デッキ枚数の検証・旧セーブの安全な移行・数量つき付与API。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 *
 * @command GrantCardCopies
 * @text カードを枚数つきで入手する
 * @desc カードを指定枚数だけ所持に加えます。報酬IDを入れると、同じIDでは一度だけ(二重付与なし)。空欄なら入手のたびに加算(ショップ購入向け)。
 *
 * @arg cardId
 * @text Card ID
 * @type string
 * @default
 *
 * @arg copies
 * @text 枚数
 * @type number
 * @min 1
 * @max 999
 * @default 1
 *
 * @arg rewardId
 * @text 報酬ID(空欄=繰り返し入手できる)
 * @type string
 * @default
 *
 * @help
 * ProjectR_CardInventory.js
 *
 * 【ルール(ユーザー確認済み)】
 *   カードには実際の所持枚数(OwnedCopies)があり、デッキに入れられる最大枚数は min(所持枚数, そのカードのコピー上限) です。
 *   例: ストレングス(上限10)を 1枚持つ→1枚 / 5枚→5枚 / 10枚→10枚 / 15枚→10枚(15枚は所持のまま保管)。
 *   デッキの編集は所持枚数を変えません。デッキから外してもカードは消えません。戦闘でカードを使っても所持枚数は減りません。
 *   山札・手札・Cooldown・捨て札は戦闘中の一時的な状態で、所持枚数とは別です。
 *   Card Levelは、物理コピーごとではなく「カードの種類」ごとに共通です(Coreの cardOwnership.level のまま)。
 *
 * 【保存】 $gameSystem._projectRCardInventory = { schema: 1, copies: {cardId: 整数}, rewards: {rewardId: 付与記録},
 *          legacy: { source, diagnostics, reconstructed, unknownOwnership, invalid, unlocks } }
 *   CardDeckCore(_projectRCardDeckData)の形式は変えていません。別の版つき領域です。
 *
 * 【旧セーブの移行(1回だけ。ロード時、メモリ上のみ。次にセーブするまでファイルは変わらない)】
 *   旧セーブに所持枚数はありません。記録から復元できる事実だけを使い、過去の枚数を作り上げません。
 *   ・解放済みのカード: max(1, 保存デッキ内のそのカードの枚数) 枚 = 「再構成した最小値」(実際の過去の所持数ではない)。
 *   ・H2C-Aの付与記録(_projectRHermesProduction.rings.hermes)が、完了済みの30枚付与であると確認できれば、その記録の枚数(7種30枚)。
 *     指輪を持っているだけでは付与の証拠にしません。
 *   ・未解放なのにデッキにあるカード: デッキは残し、所持は0のまま診断に出す(勝手に解放しない)。
 *   ・未知のカードID: デッキ・所持の元の記録を残し、診断に出す(捨てない・メタデータを作らない)。
 *   ・旧デッキは自動で削除・並べ替え・切り詰めをしません。無効なデッキは理由つきで残ります。
 *   ・schemaが記録済みなら再移行しません(ロードとセーブを繰り返しても増えない)。
 *
 * 【API】 ProjectRCardInventory
 *   getOwnedCopies(cardId) / getDeckCopies(cardId) / getMaxDeckCopies(cardId) / getDeckLimit(cardId)
 *   grantCopies(cardId, copies, {rewardId, source})      枚数つき付与。rewardIdあり=一度だけ / なし=毎回加算(ショップ向け)
 *   grantBundle(rewardId, {cardId: copies, ...}, {source}) 複数カードを一括(全部検証してから反映。原子的)
 *   hasReward(rewardId) / rewards()
 *   validateDeck(cardIds?)  所持枚数の検証だけ(詳細な理由つき) / deckReport(cardIds?) カードごとの内訳
 *   canAddToDeck(cardId, cardIds?)
 *   diagnostics()           移行の診断・カードごとの所持/根拠(読み取り専用)
 *   previewGrant(rewardId, {cardId: 目標枚数})  付与の影響プレビュー(加算と補充の比較。何も変更しない。H2C-B3)
 *   summary()               旧セーブ移行の説明: 確認済み / 推定の最小値 / 未知ID / 未解放でデッキにある / デッキの問題の内訳と、画面用の文(lines)
 *   report()                開発者向けの読みやすいレポート(文字列)。コンソールで ProjectRCardInventory.report()
 *   state()                 保存データのコピー
 *   (DEV) beginFixture()/endFixture()  テスト用アリーナが一時的な固定デッキを組むときだけ検証を外す
 *
 * 旧来の「解放だけ」の操作(ProjectRCardDeck.setCardOwned(id,true)・コマンド GrantCard)は、枚数を増やしません。
 * 所持が0なら最小1枚として扱うだけで、何度呼んでも増えません。枚数を増やすのは grantCopies / grantBundle / GrantCardCopies だけです。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CardInventory";
    const STATE_KEY = "_projectRCardInventory";
    const PRODUCTION_KEY = "_projectRHermesProduction";
    const SCHEMA = 1;
    const MAX_STORED_COPIES = 999;
    const CODE = Object.freeze({
        COPIES_EXCEEDS_OWNED: "CARD_COPIES_EXCEEDS_OWNED",
        INVALID_CARD_ID: "INVALID_CARD_ID",
        INVALID_COPIES: "INVALID_COPIES",
        COPIES_LIMIT: "COPIES_LIMIT",
        INVALID_REWARD_ID: "INVALID_REWARD_ID",
        EMPTY_BUNDLE: "EMPTY_BUNDLE"
    });

    const deck = () => root.ProjectRCardDeck;
    const canonical = value => value == null ? "" : String(value).trim();
    const isObject = value => !!value && typeof value === "object" && !Array.isArray(value);
    const clone = value => JSON.parse(JSON.stringify(value));
    const isCount = value => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_STORED_COPIES;
    const system = () => typeof $gameSystem !== "undefined" && $gameSystem ? $gameSystem : null;
    const definition = cardId => deck()?.definitions?.card?.(cardId) || null;
    const countIn = (cardIds, cardId) => cardIds.reduce((n, id) => n + (id === cardId ? 1 : 0), 0);

    // ---- 保存データ -----------------------------------------------------------------------------------------------
    const freshStore = source => ({
        schema: SCHEMA, seq: 0, copies: {}, rewards: {},
        legacy: { source, diagnostics: [], reconstructed: {}, unknownOwnership: {}, invalid: {}, unlocks: {} }
    });
    let memoryStore = null;       // $gameSystem が無いとき(起動直後・テスト)だけ使う
    let fixtureDepth = 0;
    let fixtureSnapshot = null;

    // H2C-Aの付与記録から、「完了済みの30枚付与」だと確認できるものだけ取り出す。指輪の所持だけでは証拠にしない。
    const verifiedGrant = production => {
        const record = isObject(production) && isObject(production.rings) ? production.rings.hermes : null;
        if (!isObject(record) || record.granted !== true || !isObject(record.cards)) return null;
        const cards = {};
        let total = 0;
        for (const [id, count] of Object.entries(record.cards)) {
            if (!definition(id) || !Number.isInteger(count) || count < 1 || count > MAX_STORED_COPIES) return { invalid: true };
            cards[canonical(id)] = count;
            total += count;
        }
        const expected = deck()?.DECK_SIZE ?? 30;
        if (total !== expected || record.totalCopies !== expected) return { invalid: true };
        return { cards, total, source: record.source || null };
    };

    // 旧セーブ(または所持枚数の無いデータ)から、解放済み・保存デッキ・付与記録を使って最小の所持枚数を再構成する。
    const migrate = (rawCore, production) => {
        const api = deck();
        const core = api.getPersistentData();
        const store = freshStore("legacy");
        const diagnostics = store.legacy.diagnostics;
        const deckIds = core.deckDefinition.cardIds;
        const verified = verifiedGrant(production);
        if (verified && verified.invalid) {
            diagnostics.push({ code: "GRANT_RECORD_UNVERIFIED", severity: "warning",
                message: "Hermesの付与記録はあるが、30枚の付与として確認できないため使いません。" });
        }
        const good = verified && !verified.invalid ? verified : null;
        for (const def of api.definitions.cardDefinitions()) {
            const id = def.cardId;
            const unlocked = !!core.cardOwnership[id]?.owned;
            const inDeck = countIn(deckIds, id);
            const grant = good ? good.cards[id] || 0 : 0;
            let copies = 0;
            let basis = "none";
            if (grant > 0) { copies = Math.max(grant, inDeck); basis = "verifiedGrant"; }
            else if (unlocked) { copies = Math.max(1, inDeck); basis = "reconstructedMinimum"; }
            else if (inDeck > 0) basis = "lockedCardInDeck";
            if (copies > 0) store.copies[id] = copies;
            if (copies > 0 || inDeck > 0) {
                store.legacy.reconstructed[id] = { copies, basis, unlocked, deckCopies: inDeck, verifiedGrant: grant };
            }
            if (basis === "reconstructedMinimum") {
                diagnostics.push({ code: "RECONSTRUCTED_MINIMUM", severity: "info", cardId: id, copies, deckCopies: inDeck,
                    message: "旧セーブに所持枚数が無いため、解放済みのカードを max(1, デッキ内の枚数) 枚と推定(実際の過去の枚数ではない)。" });
            }
            if (basis === "lockedCardInDeck") {
                diagnostics.push({ code: "LOCKED_CARD_IN_DECK", severity: "warning", cardId: id, deckCopies: inDeck,
                    message: "未解放のカードがデッキにあります。デッキは残し、所持0のまま(勝手に解放しません)。" });
            }
            if (grant > 0 && !unlocked) {
                diagnostics.push({ code: "LOCKED_WITH_COPIES", severity: "info", cardId: id, copies,
                    message: "付与記録の枚数は保持しますが、カードの解放フラグは未解放のままです。" });
            }
        }
        const knownIds = new Set(api.definitions.cardDefinitions().map(def => def.cardId));
        const unknownInDeck = new Map();
        for (const id of deckIds) if (!knownIds.has(id)) unknownInDeck.set(id, (unknownInDeck.get(id) || 0) + 1);
        for (const [id, count] of unknownInDeck) {
            diagnostics.push({ code: "UNKNOWN_CARD_IN_DECK", severity: "warning", cardId: id, deckCopies: count,
                message: "定義の無いカードIDがデッキにあります。元の記録を残しています。" });
        }
        const rawOwnership = isObject(rawCore) ? (rawCore.cardOwnership || rawCore.cards) : null;
        if (isObject(rawOwnership)) {
            for (const [id, value] of Object.entries(rawOwnership)) {
                if (knownIds.has(canonical(id))) continue;
                store.legacy.unknownOwnership[id] = clone(value === undefined ? null : value);
                diagnostics.push({ code: "UNKNOWN_OWNERSHIP_PRESERVED", severity: "info", cardId: id,
                    message: "定義の無いカードの所持記録を、そのまま保存領域に残しました。" });
            }
        }
        if (good) {
            store.rewards["hermes.ring.starter"] = { source: "legacyVerifiedRecord", cards: clone(good.cards), total: good.total,
                seq: ++store.seq, migrated: true };
            diagnostics.push({ code: "VERIFIED_GRANT_USED", severity: "info", total: good.total,
                message: "H2C-Aの付与記録(30枚)を確認できたため、その枚数を所持枚数にしました。" });
        } else if (api.getRingOwner?.("hermes") === "player") {
            diagnostics.push({ code: "RING_WITHOUT_GRANT_RECORD", severity: "info",
                message: "Hermesの指輪を持っていますが、30枚の付与記録は確認できません。指輪だけでは付与の証拠にしません(カードは付与しません)。" });
        }
        return store;
    };

    // 読み込んだ保存データの形を整える。不正な枚数は取り除くが、元の値は legacy.invalid に残す。
    const sanitize = store => {
        if (!isObject(store.copies)) store.copies = {};
        if (!isObject(store.rewards)) store.rewards = {};
        if (!isObject(store.legacy)) store.legacy = {};
        const legacy = store.legacy;
        if (!Array.isArray(legacy.diagnostics)) legacy.diagnostics = [];
        for (const key of ["reconstructed", "unknownOwnership", "invalid", "unlocks"]) if (!isObject(legacy[key])) legacy[key] = {};
        if (!Number.isFinite(store.seq)) store.seq = 0;
        for (const [id, value] of Object.entries(store.copies)) {
            if (isCount(value)) continue;
            legacy.invalid[id] = value === undefined ? null : clone(value);
            delete store.copies[id];
            legacy.diagnostics.push({ code: "INVALID_COPIES_REMOVED", severity: "warning", cardId: id,
                message: "負・小数・NaN・不正な所持枚数を取り除きました(元の値は legacy.invalid に残しています)。" });
        }
        return store;
    };

    const productionRaw = () => system()?.[PRODUCTION_KEY] ?? null;
    const store = () => {
        const sys = system();
        let current = sys ? sys[STATE_KEY] : memoryStore;
        if (!isObject(current) || !Number.isFinite(current.schema)) {
            current = migrate(null, productionRaw());
            if (sys) sys[STATE_KEY] = current; else memoryStore = current;
        }
        return current;
    };

    // ---- 読み取り ---------------------------------------------------------------------------------------------------
    const getOwnedCopies = cardId => {
        const value = store().copies[canonical(cardId)];
        return isCount(value) ? value : 0;
    };
    const getDeckCopies = (cardId, cardIds) => countIn(Array.isArray(cardIds) ? cardIds.map(canonical) : deck().getDeck(), canonical(cardId));
    const getMaxDeckCopies = cardId => definition(cardId)?.maxCopies ?? 0;
    const getDeckLimit = cardId => Math.min(getOwnedCopies(cardId), getMaxDeckCopies(cardId));

    const reasonFor = (id, count) => {
        const owned = getOwnedCopies(id);
        const max = getMaxDeckCopies(id);
        return { code: CODE.COPIES_EXCEEDS_OWNED, cardId: id, actual: count, owned, maxCopies: max, maximum: Math.min(owned, max) };
    };
    const validateDeck = cardIds => {
        const ids = Array.isArray(cardIds) ? cardIds.map(canonical) : deck().getDeck();
        const counts = new Map();
        for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
        const reasons = [];
        for (const [id, count] of counts) {
            if (definition(id) && count > getOwnedCopies(id)) reasons.push(reasonFor(id, count));
        }
        return reasons;
    };
    const deckReport = cardIds => {
        const ids = Array.isArray(cardIds) ? cardIds.map(canonical) : deck().getDeck();
        return [...new Set(ids)].map(id => ({
            cardId: id, known: !!definition(id), ownedCopies: getOwnedCopies(id), deckCopies: countIn(ids, id),
            maxDeckCopies: getMaxDeckCopies(id), deckLimit: getDeckLimit(id), ok: !definition(id) || countIn(ids, id) <= getOwnedCopies(id)
        }));
    };
    const canAddToDeck = (cardId, cardIds) => {
        const id = canonical(cardId);
        if (!definition(id)) return { ok: false, reason: CODE.INVALID_CARD_ID, reasons: [{ code: CODE.INVALID_CARD_ID, cardId: id }] };
        const current = Array.isArray(cardIds) ? cardIds.map(canonical) : deck().getDeck();
        const next = countIn(current, id) + 1;
        const reasons = [];
        if (next > getOwnedCopies(id)) reasons.push(reasonFor(id, next));
        if (next > getMaxDeckCopies(id)) {
            reasons.push({ code: "MAX_COPIES_EXCEEDED", cardId: id, actual: next, maximum: getMaxDeckCopies(id) });
        }
        return reasons.length ? { ok: false, reason: reasons[0].code, reasons } : { ok: true, reason: null, reasons: [] };
    };

    // ---- 付与(数量つき) --------------------------------------------------------------------------------------------
    const coreSetCardOwned = deck().setCardOwned; // 「解放だけ」の元の操作。枚数には触れない。
    const fail = (reason, extra) => Object.assign({ ok: false, granted: false, reason, reasons: [Object.assign({ code: reason }, extra || {})] }, extra || {});

    const grantBundle = (rewardId, cards, options = {}) => {
        const id = canonical(rewardId);
        if (rewardId != null && id === "" ) return fail(CODE.INVALID_REWARD_ID);
        if (id.length > 120) return fail(CODE.INVALID_REWARD_ID, { rewardId: id });
        if (!isObject(cards) || Object.keys(cards).length === 0) return fail(CODE.EMPTY_BUNDLE);
        const entries = [];
        for (const [rawId, rawCount] of Object.entries(cards)) {
            const cardId = canonical(rawId);
            if (!definition(cardId)) return fail(CODE.INVALID_CARD_ID, { cardId });
            if (typeof rawCount !== "number" || !Number.isInteger(rawCount) || rawCount < 1) return fail(CODE.INVALID_COPIES, { cardId, copies: rawCount });
            entries.push([cardId, rawCount]);
        }
        const state = store();
        if (id && isObject(state.rewards[id])) {
            return { ok: true, granted: false, reason: "alreadyGranted", rewardId: id, record: clone(state.rewards[id]) };
        }
        for (const [cardId, count] of entries) {
            if (getOwnedCopies(cardId) + count > MAX_STORED_COPIES) return fail(CODE.COPIES_LIMIT, { cardId, max: MAX_STORED_COPIES });
        }
        const before = {};
        const after = {};
        const given = {};
        for (const [cardId, count] of entries) {
            before[cardId] = getOwnedCopies(cardId);
            const unlocked = coreSetCardOwned.call(deck(), cardId, true); // 解放(現在のLevelは保たれる)。枚数は下で加算する。
            if (!unlocked.ok) return fail("unlockFailed", { cardId, detail: unlocked.reasons });
        }
        for (const [cardId, count] of entries) {
            state.copies[cardId] = before[cardId] + count;
            after[cardId] = state.copies[cardId];
            given[cardId] = (given[cardId] || 0) + count;
        }
        const total = entries.reduce((sum, entry) => sum + entry[1], 0);
        if (id) state.rewards[id] = { source: String(options.source || "grant"), cards: clone(given), total, seq: ++state.seq };
        return { ok: true, granted: true, reason: "granted", rewardId: id || null, added: given, total, before, after };
    };
    const grantCopies = (cardId, copies, options = {}) => {
        const result = grantBundle(options.rewardId == null || options.rewardId === "" ? null : options.rewardId,
            { [canonical(cardId)]: copies }, options);
        if (result.ok && result.granted) { result.cardId = canonical(cardId); result.copies = result.after[result.cardId]; }
        return result;
    };
    const hasReward = rewardId => isObject(store().rewards[canonical(rewardId)]);
    const rewards = () => clone(store().rewards);

    // ---- 旧来の「解放だけ」の操作 ------------------------------------------------------------------------------------
    // 枚数は増やさない。所持が0のカードを解放したときだけ最小1枚にする(何度呼んでも増えない)。
    const ensureLegacyUnlock = cardId => {
        const id = canonical(cardId);
        if (!definition(id) || fixtureDepth > 0) return;
        const state = store();
        if (getOwnedCopies(id) >= 1) return;
        state.copies[id] = 1;
        state.legacy.unlocks[id] = { kind: "legacyUnlockOnly", copies: 1 };
    };
    deck().setCardOwned = function(cardId, owned = true) {
        const result = coreSetCardOwned.apply(this, arguments);
        if (result && result.ok && owned) ensureLegacyUnlock(cardId);
        return result;
    };

    // ---- Coreの検証への接続(Core本体は変更しない) ---------------------------------------------------------------------
    const proto = deck().CardDeckService.prototype;
    const baseDeckInvalidReasons = proto.deckInvalidReasons;
    proto.deckInvalidReasons = function(cardIds) {
        const reasons = baseDeckInvalidReasons.apply(this, arguments);
        if (fixtureDepth > 0) return reasons;
        const list = cardIds === undefined ? this.data.deckDefinition.cardIds : cardIds;
        reasons.push(...validateDeck(Array.isArray(list) ? list : []));
        return reasons;
    };

    // 所持枚数の根拠: verifiedGrant(付与記録で確認) / reconstructedMinimum(旧セーブからの推定最小値) / legacyUnlockOnly / granted / none
    const basisOf = cardId => {
        const id = canonical(cardId);
        const state = store();
        if (state.legacy.unlocks[id]) return "legacyUnlockOnly";
        const known = state.legacy.reconstructed[id];
        if (known && known.copies > 0 && getOwnedCopies(id) === known.copies) return known.basis;
        return getOwnedCopies(id) > 0 ? (known && known.basis === "reconstructedMinimum" ? "reconstructedMinimum+granted" : "granted") : "none";
    };

    // ---- 診断(読み取り専用) -------------------------------------------------------------------------------------------
    const diagnostics = () => {
        const api = deck();
        const state = store();
        const persistent = api.getPersistentData();
        const ids = api.getDeck();
        const cards = api.definitions.cardDefinitions().map(def => {
            const known = state.legacy.reconstructed[def.cardId];
            return {
                cardId: def.cardId, ownedCopies: getOwnedCopies(def.cardId), deckCopies: countIn(ids, def.cardId),
                maxDeckCopies: def.maxCopies, deckLimit: getDeckLimit(def.cardId),
                unlocked: !!persistent.cardOwnership[def.cardId]?.owned, level: persistent.cardOwnership[def.cardId]?.level ?? 1,
                basis: basisOf(def.cardId), verified: known ? known.basis === "verifiedGrant" : false
            };
        });
        return clone({
            schema: state.schema, source: state.legacy.source,
            totalCopies: Object.keys(state.copies).reduce((sum, id) => sum + (isCount(state.copies[id]) ? state.copies[id] : 0), 0),
            cards, diagnostics: state.legacy.diagnostics, reconstructed: state.legacy.reconstructed,
            unknownOwnership: state.legacy.unknownOwnership, invalid: state.legacy.invalid, deckProblems: validateDeck(ids)
        });
    };

    // ---- 読み取り専用: 保存領域を作らずに読む(プレビュー・要約・レポート用) -----------------------------------------------------
    const peekStore = () => {
        const sys = system();
        const current = sys ? sys[STATE_KEY] : memoryStore;
        return isObject(current) && Number.isFinite(current.schema) ? current : migrate(null, productionRaw());
    };
    const copiesOf = (state, cardId) => { const v = state.copies[canonical(cardId)]; return isCount(v) ? v : 0; };

    // ---- 付与の影響プレビュー(H2C-B3・何も変更しない) -------------------------------------------------------------------
    // 「加算(additive)」= 目標の枚数をそのまま足す(現在の方針)。「補充(top-up)」= 目標の枚数に届くまでの不足分だけ足す(提案・未適用)。
    // 例: ストレングスを2枚持っていて目標10枚 → 加算は+10(12枚)、補充は+8(10枚)。方針の変更はユーザー承認が必要(付与の実装は加算のまま)。
    const previewGrant = (rewardId, cards) => {
        const state = peekStore();
        const id = canonical(rewardId);
        const rows = [];
        const problems = [];
        for (const [rawId, target] of Object.entries(isObject(cards) ? cards : {})) {
            const cardId = canonical(rawId);
            const def = definition(cardId);
            if (!def) { problems.push({ code: CODE.INVALID_CARD_ID, cardId }); continue; }
            if (typeof target !== "number" || !Number.isInteger(target) || target < 1) { problems.push({ code: CODE.INVALID_COPIES, cardId, copies: target }); continue; }
            const current = copiesOf(state, cardId);
            const topUpGrant = Math.max(0, target - current);
            rows.push({
                cardId, current, target, maxDeckCopies: def.maxCopies,
                additive: { grant: target, after: current + target, deckLimit: Math.min(current + target, def.maxCopies) },
                topUp: { grant: topUpGrant, after: current + topUpGrant, deckLimit: Math.min(current + topUpGrant, def.maxCopies) },
                differs: topUpGrant !== target
            });
        }
        const sum = pick => rows.reduce((total, row) => total + row[pick].grant, 0);
        return clone({
            rewardId: id || null, alreadyGranted: !!(id && isObject(state.rewards[id])), policyInEffect: "additive",
            rows, problems, totals: { additive: sum("additive"), topUp: sum("topUp") },
            note: "読み取り専用のプレビューです。所持・報酬記録・デッキは一切変更しません。付与の方針(加算/補充)の変更はユーザーの承認が必要です。", mutated: false
        });
    };

    // ---- 旧セーブ移行の説明(H2C-B3・読み取り専用) --------------------------------------------------------------------
    // 区別する4つ: 確認済みの所持 / 旧デッキから推定した最小値 / 未知・不正なカードID / 所持枚数・指輪のために無効なデッキ。
    const cardName = cardId => {
        const info = root.ProjectRMenuCore?.cardInfo?.(cardId);
        return info && info.defined ? info.name : String(cardId);
    };
    const classifyCard = (state, cardId) => {
        const copies = copiesOf(state, cardId);
        if (copies <= 0) return null;
        if (state.legacy.unlocks[cardId]) return "inferred";
        const known = state.legacy.reconstructed[cardId];
        if (known && known.basis === "reconstructedMinimum") return "inferred"; // 推定の最小値(その後に実際の付与があっても、推定を含む)
        return "confirmed"; // 付与記録で確認済み / 新しいゲームや付与APIで実際に付与された枚数
    };
    const summary = () => {
        const api = deck();
        const state = peekStore();
        const cards = api.definitions.cardDefinitions().map(def => def.cardId);
        const confirmed = [];
        const inferred = [];
        for (const cardId of cards) {
            const kind = classifyCard(state, cardId);
            if (kind === "confirmed") confirmed.push(cardId);
            else if (kind === "inferred") inferred.push(cardId);
        }
        const diagnostics = state.legacy.diagnostics;
        const ids = code => [...new Set(diagnostics.filter(d => d.code === code).map(d => d.cardId))];
        const unknownCardIds = [...new Set(ids("UNKNOWN_CARD_IN_DECK").concat(ids("UNKNOWN_OWNERSHIP_PRESERVED")))];
        const lockedInDeck = ids("LOCKED_CARD_IN_DECK");
        const reasons = api.getDeckInvalidReasons();
        const count = pred => reasons.filter(pred).length;
        const deckProblems = {
            size: count(r => r.code === "INVALID_DECK_SIZE"),
            ownership: count(r => r.code === "CARD_COPIES_EXCEEDS_OWNED" || r.code === "CARD_NOT_OWNED"),
            ring: count(r => r.code === "REQUIRED_RING_NOT_OWNED"),
            maxCopies: count(r => r.code === "MAX_COPIES_EXCEEDED"),
            unknownCard: count(r => r.code === "INVALID_CARD_ID")
        };
        const fromLegacy = state.legacy.source === "legacy";
        const lines = [];
        if (fromLegacy) {
            if (unknownCardIds.length) lines.push("定義の無いカードID：" + unknownCardIds.join("、") + "（デッキと所持の記録はそのまま保存しています）");
            if (lockedInDeck.length) lines.push("未解放のままデッキにあるカード：" + lockedInDeck.map(cardName).join("、") + "（解放はされません。デッキも変えていません）");
            if (inferred.length) lines.push("旧セーブから移行：" + inferred.length + "種の所持枚数は推定の最小値です（実際の過去の所持数ではありません）");
        }
        return clone({
            source: state.legacy.source, fromLegacy, confirmed, inferred, unknownCardIds, lockedInDeck, deckProblems, lines,
            note: "confirmed=付与記録・新規の付与で確認できた枚数 / inferred=旧セーブのデッキと解放から推定した最小値（実際の過去の所持数ではない）"
        });
    };
    // 開発者向けの読みやすいレポート(文字列)。コンソールで ProjectRCardInventory.report() と打つ。
    const report = () => {
        const api = deck();
        const state = peekStore();
        const info = summary();
        const ids = api.getDeck();
        const out = [];
        out.push("[CardInventory] schema=" + state.schema + " source=" + state.legacy.source + " totalCopies=" + Object.keys(state.copies).reduce((n, id) => n + (isCount(state.copies[id]) ? state.copies[id] : 0), 0) + " deck=" + ids.length);
        out.push("-- カード別(所持 / デッキ / 上限 / デッキに入れられる最大 / 区分) --");
        for (const def of api.definitions.cardDefinitions()) {
            const owned = copiesOf(state, def.cardId);
            const inDeck = countIn(ids, def.cardId);
            if (!owned && !inDeck) continue;
            const kind = classifyCard(state, def.cardId) || (inDeck ? "未解放(デッキにあり)" : "-");
            const known = state.legacy.reconstructed[def.cardId];
            out.push("  " + def.cardId + " (" + cardName(def.cardId) + ") owned=" + owned + " deck=" + inDeck + " max=" + def.maxCopies + " limit=" + Math.min(owned, def.maxCopies)
                + " " + kind + (known ? " basis=" + known.basis : "") + (state.legacy.unlocks[def.cardId] ? " (解放のみ→最小1枚)" : ""));
        }
        const unknownDeck = [...new Set(ids.filter(id => !definition(id)))];
        for (const id of unknownDeck) out.push("  " + id + " (未知のID) deck=" + countIn(ids, id) + " 元の記録を保持");
        out.push("-- 区分 -- 確認済み=" + info.confirmed.length + "種 / 推定の最小値=" + info.inferred.length + "種 / 未知のID=" + info.unknownCardIds.length + "種 / 未解放でデッキにある=" + info.lockedInDeck.length + "種");
        out.push("-- デッキの問題(件数) -- 枚数=" + info.deckProblems.size + " 所持=" + info.deckProblems.ownership + " 指輪=" + info.deckProblems.ring + " コピー上限=" + info.deckProblems.maxCopies + " 不明カード=" + info.deckProblems.unknownCard);
        if (state.legacy.diagnostics.length) {
            out.push("-- 診断 --");
            for (const d of state.legacy.diagnostics) out.push("  [" + d.severity + "] " + d.code + (d.cardId ? " " + d.cardId : "") + " : " + d.message);
        }
        const rewardIds = Object.keys(state.rewards);
        if (rewardIds.length) out.push("-- 報酬記録 -- " + rewardIds.map(id => id + (state.rewards[id].migrated ? "(移行)" : "")).join(", "));
        return out.join("\n");
    };

    // ---- DEV: テスト用アリーナの一時的な固定デッキ -------------------------------------------------------------------------
    // 開始時に保存領域を控え、終了時に元へ戻す。その間は所持枚数の検証と「解放だけ」の最小1枚処理を行わない。
    const beginFixture = () => {
        if (fixtureDepth === 0) fixtureSnapshot = clone(store());
        fixtureDepth++;
        return fixtureDepth;
    };
    const endFixture = () => {
        if (fixtureDepth === 0) return 0;
        fixtureDepth--;
        if (fixtureDepth === 0 && fixtureSnapshot) {
            const sys = system();
            if (sys) sys[STATE_KEY] = fixtureSnapshot; else memoryStore = fixtureSnapshot;
            fixtureSnapshot = null;
        }
        return fixtureDepth;
    };

    // ---- セーブ/ロード/新しいゲームへの接続 -----------------------------------------------------------------------------
    if (typeof Game_System !== "undefined") {
        const _initialize = Game_System.prototype.initialize;
        Game_System.prototype.initialize = function() {
            _initialize.call(this);
            this[STATE_KEY] = freshStore("newGame");
        };
    }
    if (typeof DataManager !== "undefined" && DataManager.extractSaveContents) {
        const _extractSaveContents = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function(contents) {
            const rawSystem = contents && contents.system;
            const rawCore = rawSystem && isObject(rawSystem._projectRCardDeckData) ? clone(rawSystem._projectRCardDeckData) : null;
            fixtureDepth = 0;
            fixtureSnapshot = null;
            const result = _extractSaveContents.apply(this, arguments);
            try {
                const sys = system();
                if (sys) {
                    if (isObject(sys[STATE_KEY]) && Number.isFinite(sys[STATE_KEY].schema)) sanitize(sys[STATE_KEY]);
                    else sys[STATE_KEY] = migrate(rawCore, sys[PRODUCTION_KEY]);
                }
            } catch (error) {
                if (typeof console !== "undefined") console.warn(`[${PLUGIN}] migration failed (saved data untouched):`, error);
            }
            return result;
        };
    }
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "GrantCardCopies", args => {
            const result = grantCopies(args?.cardId, Number.parseInt(args?.copies, 10), { rewardId: args?.rewardId, source: "GrantCardCopies" });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] GrantCardCopies failed:`, JSON.stringify(result.reasons));
            return result;
        });
    }

    root.ProjectRCardInventory = Object.freeze({
        VERSION: "1.0.0", SCHEMA, STATE_KEY, CODE, MAX_STORED_COPIES,
        getOwnedCopies, getDeckCopies, getMaxDeckCopies, getDeckLimit, basisOf,
        grantCopies, grantBundle, hasReward, rewards,
        validateDeck, deckReport, canAddToDeck,
        diagnostics, state: () => clone(store()),
        previewGrant, summary, report,
        beginFixture, endFixture, isFixture: () => fixtureDepth > 0,
        migrate, sanitize
    });
    if (typeof module !== "undefined" && module.exports) module.exports = root.ProjectRCardInventory;
})();
