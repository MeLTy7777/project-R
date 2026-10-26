/*:
 * @target MZ
 * @plugindesc v1.1.0 Phase 4A/4B 戦闘中Ultimateゲージ（状態・加算・準備完了判定・消費）と加算元（カード使用・支援・与ダメージ・重要回避）。
 * @author ProjectR
 * @base ProjectR_GodSummonManager
 * @orderAfter ProjectR_GodSummonManager
 *
 * @param MaxGauge
 * @text ゲージ最大値
 * @type number
 * @decimals 2
 * @min 1
 * @default 100
 * @desc Ultimateゲージの最大値。0以下・数値以外は100として扱います。
 *
 * @param CardUseGain
 * @text カード使用成功の加算量（暫定）
 * @type number
 * @decimals 4
 * @min 0
 * @default 2.0
 * @desc 発動に成功し消費されたカード1枚ごとの加算量。0で無効。負・数値以外は既定値に戻ります。
 *
 * @param SupportBonusGain
 * @text 支援カード成功の追加加算量（暫定）
 * @type number
 * @decimals 4
 * @min 0
 * @default 2.0
 * @desc category=support のカードが成功したとき、カード使用の加算量に上乗せする量。
 *
 * @param DamageGainRate
 * @text ダメージ加算率（暫定）
 * @type number
 * @decimals 6
 * @min 0
 * @default 0.0025
 * @desc 実際に減ったHP × この値 がゲージ加算量（1回のダメージごと）。
 *
 * @param DamageGainPerHitCap
 * @text 1ダメージあたりの加算上限（暫定）
 * @type number
 * @decimals 4
 * @min 0
 * @default 1.5
 * @desc 1回のダメージイベントで加算できる最大量。
 *
 * @param ImportantDodgeGain
 * @text 重要回避成功の加算量（暫定）
 * @type number
 * @decimals 4
 * @min 0
 * @default 5.0
 * @desc recordImportantDodge が成功したときの加算量。
 *
 * @help
 * 戦闘（ボス/カード戦）ごとに0から始まるUltimateゲージです。
 * Phase 4A: 状態・加算API・問い合わせAPI・消費API。
 * Phase 4B: 実際の戦闘行動からの加算元（下記）。加算量はすべて暫定値で、最終バランスではありません。
 * Ultimateの入力、Ultimate攻撃、HUDは含みません。
 *
 * ---- Phase 4B 加算元（すべてaddUltimateGaugeを経由。ゲージは戦闘の観察役で、失敗しても戦闘は止まりません） ----
 *  カード使用: ProjectRCardDeck.requestUseCardがSUCCESS（発動成功かつ消費）を返したときだけ
 *    CardUseGainを1回。失敗・未消費・空振りカードの扱いはCore準拠（空振りでも発動成功なら加算）。
 *    gainIdは card:<カードinstanceId>:<そのinstanceの使用回数>。同じ結果を2度処理しても1回だけ。
 *    常駐神が崩壊中でも加算します。
 *  支援: そのカードのcategoryがsupportなら、さらにSupportBonusGainを上乗せ（CardUseGainと重ねる）。
 *  与ダメージ: recordDamageDealt(実ダメージ, {attackId, targetId, tickId?, source?}) が
 *    min(実ダメージ × DamageGainRate, DamageGainPerHitCap) を加算。実ダメージは「実際に減ったHP」
 *    （trackDamage/recordEventHpLossが前後のHPから求める）。死亡済みの敵・HPが減らない攻撃は加算なし。
 *    gainIdは damage:<attackId>:<targetId>[:<tickId>]。
 *  重要回避: 現在、ProjectRに回避システムは存在しません。recordImportantDodge(dodgeId, source?) を
 *    公開しておくだけで、実ゲームからの呼び出しは未接続です。敵の攻撃が外れただけでは加算しません。
 *  加算しないもの: 時間経過・戦闘開始・神の顕現/復帰・被ダメージ・Divine HPへのダメージ・カードのドロー/
 *    クールダウン・一時召喚の生成・メニュー操作。
 *
 * ---- Phase 4A ----
 *
 * ゲージ状態は、有効な常駐Ultimate戦闘状態（Ultimate指輪を選択し、Playerが所持）が
 * ある戦闘にだけ作られます。無い場合はゲージ状態を作りませんが、戦闘と通常カードは
 * 従来どおり動きます。ゲージ自体の値（現在値・最大値・gainId履歴）は実行時のみで、
 * セーブしません。endCardBattle・マップ移動・ロードで破棄され、次の戦闘は必ず0から始まります。
 *
 * 満タン（full）と使用可能（ready）は別の概念です。
 *   isUltimateGaugeFull(): 現在値 >= 最大値（常駐神の崩壊に関係なく）
 *   isUltimateReady():     ゲージ状態あり かつ 満タン かつ 常駐神が顕現中（崩壊中は偽）
 * 常駐神が崩壊してもゲージは減りません。崩壊中にゲージが満タンになることもあり、
 * 復帰（Manager側の15秒後）と同時にreadyになります。満タンになっても自動消費はせず、
 * consumeUltimateGauge()が明示的に呼ばれるまで最大値のままです。
 *
 * API（Console: ProjectRUltimateGauge）:
 *   addUltimateGauge(amount, source?, gainId?)
 *     amountは正の有限数のみ。最大値で止まり超えません。結果は
 *     { ok, reason, requested, gained, gauge, max, rate, full, ready, source, gainId }。
 *     ok:trueは実際に増えた場合のみ。それ以外は理由つきでok:false（例外は投げません）。
 *       reason: invalidAmount / invalidGainId / noUltimateGauge / duplicateGain / gaugeFull / added
 *     gainId（省略可、文字列または有限数）: 同じgainIdでは戦闘中1回だけ加算します。
 *       2回目以降はduplicateGain（加算なし）。省略時は何度でも直接加算できます。
 *       すでに満タンでの呼び出しはgained:0・reason:gaugeFullで、gainIdは「使用済み」にしません
 *       （ゲージ消費後に同じイベントを再処理しても加算が失われないため）。
 *     小数も可。最大値との差が1e-9未満なら最大値として扱います。
 *   consumeUltimateGauge()
 *     満タン かつ 常駐神が顕現中のときだけゲージを0にします（Ultimateは発動しません）。
 *     { ok, reason, consumed, gauge, max, rate, full, ready }。
 *     失敗理由: noUltimateGauge / notFull / persistentUltimateUnavailable（失敗時は値を変えません）。
 *     gainId履歴は消費後も残ります（同じgainIdの再加算はできません）。
 *   hasUltimateGaugeState() / getUltimateGauge() / getUltimateGaugeMax() / getUltimateGaugeRate()
 *   isUltimateGaugeFull() / isUltimateReady() / getUltimateGaugeState()
 *     ゲージ状態が無いときは数値は0、真偽はfalse（getUltimateGaugeStateはnull）。
 *     getUltimateGaugeRate()は0.0〜1.0。
 *   hasUltimateGaugeGainId(gainId) / getUltimateGaugeGainCount() / clear()  診断・debug用
 *
 * 自動で増えません（時間経過・待機・神の復帰・被ダメージで加算されません）。
 * Divine HP・崩壊・復帰はManagerが持ち続け、このpluginはManagerを読むだけです。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const EPSILON = 1e-9; // 小数加算で最大値の直前に止まるのを避ける許容。
    const DEFAULT_MAX = 100;
    const configuredMax = (() => {
        const raw = PluginManager.parameters("ProjectR_UltimateGauge").MaxGauge;
        const value = Number(raw);
        return typeof raw !== "undefined" && String(raw).trim() !== "" && Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX;
    })();

    // Phase 4B 暫定の加算量。不正値（負・NaN・Infinity・空・数値以外）は既定値へ戻す。0は「その加算元を無効」。
    const gainParameters = PluginManager.parameters("ProjectR_UltimateGauge");
    const nonNegative = (raw, fallback) => {
        const value = Number(raw);
        return typeof raw !== "undefined" && String(raw).trim() !== "" && Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    const gainConfig = Object.freeze({
        cardUseGain: nonNegative(gainParameters.CardUseGain, 2.0),
        supportBonusGain: nonNegative(gainParameters.SupportBonusGain, 2.0),
        damageGainRate: nonNegative(gainParameters.DamageGainRate, 0.0025),
        damageGainPerHitCap: nonNegative(gainParameters.DamageGainPerHitCap, 1.5),
        importantDodgeGain: nonNegative(gainParameters.ImportantDodgeGain, 5.0)
    });

    let state = null; // { max, current } 実行時のみ。
    const gainIds = new Set(); // 使用済みgainId（戦闘中のみ）。
    // 診断（読み取り専用・非保存）: 加算元別の累計と直近の結果。戦闘ごとに消える。
    const newTotals = () => ({ card: 0, support: 0, damage: 0, dodge: 0 });
    let totals = newTotals();
    let lastGain = null;
    const useCounts = new Map(); // instanceId -> 発動回数（同じinstanceは冷却後に再使用されるためgainIdに含める）
    const processedActivations = new WeakSet(); // 処理済みの発動結果（同じ結果の二重処理防止）

    const manager = () => root.ProjectRGodSummonManager || null;
    const normalizeId = value => {
        if (typeof value === "string") return value.length ? value : null;
        return typeof value === "number" && Number.isFinite(value) ? String(value) : null;
    };
    const godAvailable = () => {
        try { return !!manager()?.isPersistentUltimateAvailable(); } catch (error) { return false; }
    };
    const isFull = () => !!state && state.current >= state.max;
    const isReady = () => isFull() && godAvailable();
    const gaugeFields = () => ({
        gauge: state ? state.current : 0, max: state ? state.max : 0,
        rate: state ? Math.min(1, Math.max(0, state.current / state.max)) : 0, full: isFull(), ready: isReady()
    });
    const clear = () => { state = null; gainIds.clear(); totals = newTotals(); lastGain = null; useCounts.clear(); };

    const addUltimateGauge = (amount, source, gainId) => {
        const base = { ok: false, reason: null, requested: typeof amount === "number" ? amount : null, gained: 0,
            source: typeof source === "string" ? source : null, gainId: null };
        const reject = (reason, extra) => ({ ...base, reason, ...gaugeFields(), ...extra });
        try {
            if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return reject("invalidAmount");
            let id = null;
            if (gainId !== undefined && gainId !== null) {
                id = normalizeId(gainId);
                if (id === null) return reject("invalidGainId");
            }
            if (!state) return reject("noUltimateGauge", { gainId: id });
            if (id !== null && gainIds.has(id)) return reject("duplicateGain", { gainId: id });
            if (isFull()) return reject("gaugeFull", { gainId: id }); // 満タンではgainIdを消費しない。
            const before = state.current;
            const next = Math.min(state.max, before + amount);
            state.current = state.max - next < EPSILON ? state.max : next;
            if (id !== null) gainIds.add(id);
            return { ...base, ok: true, reason: "added", gained: state.current - before, ...gaugeFields(), gainId: id };
        } catch (error) {
            return reject("gaugeError");
        }
    };

    // Ultimate実行側が「開始に成功したあと」に呼ぶ原子的な資源消費。ここではUltimateを発動しない。
    const consumeUltimateGauge = () => {
        const fail = reason => ({ ok: false, reason, consumed: 0, ...gaugeFields() });
        try {
            if (!state) return fail("noUltimateGauge");
            if (!isFull()) return fail("notFull");
            if (!godAvailable()) return fail("persistentUltimateUnavailable");
            const consumed = state.current;
            state.current = 0;
            return { ok: true, reason: "consumed", consumed, ...gaugeFields() };
        } catch (error) {
            return fail("gaugeError");
        }
    };

    // ---- Phase 4B 加算元。方針（量・上限・gainId）はすべてここに集約し、すべてaddUltimateGauge経由 ----
    // 加算元からの呼び出しは例外を投げず、失敗しても戦闘（カード発動・ダメージ）を妨げない。
    const award = (category, amount, source, gainId) => {
        const result = amount > 0 ? addUltimateGauge(amount, source, gainId)
            : { ok: false, reason: "zeroGain", requested: amount, gained: 0, source, gainId: gainId ?? null, ...gaugeFields() };
        if (result.ok) totals[category] += result.gained;
        lastGain = { category, ok: result.ok, reason: result.reason, requested: result.requested, gained: result.gained,
            source: result.source, gainId: result.gainId };
        return result;
    };
    const rejected = (reason, extra) => ({ ok: false, reason, gained: 0, ...gaugeFields(), ...extra });

    // カード使用: requestUseCardのSUCCESS結果（Routerが発動成功を確認し、カードを消費した後）を1回だけ処理する。
    // instanceIdは冷却後に再び手札へ戻るため、そのinstanceの使用回数もgainIdへ含める。
    const recordCardUse = activation => {
        try {
            if (!activation || typeof activation !== "object" || activation.ok !== true || activation.reason !== "success") {
                return rejected("notActivated");
            }
            const instanceId = normalizeId(activation.instanceId);
            if (instanceId === null) return rejected("invalidInstanceId");
            const snapshot = activation.state && typeof activation.state === "object" ? activation.state : null;
            if (processedActivations.has(activation) || (snapshot && processedActivations.has(snapshot))) {
                return rejected("duplicateActivation");
            }
            processedActivations.add(activation);
            if (snapshot) processedActivations.add(snapshot);
            if (!state) return rejected("noUltimateGauge");
            const use = (useCounts.get(instanceId) || 0) + 1;
            useCounts.set(instanceId, use);
            const card = award("card", gainConfig.cardUseGain, "card", `card:${instanceId}:${use}`);
            // 支援ボーナスはカードのcategory（既存メタデータ）がsupportのときだけ。カード名は見ない。
            const support = deck?.definitions?.card(activation.cardId)?.category === "support"
                ? award("support", gainConfig.supportBonusGain, "support", `support:${instanceId}:${use}`) : null;
            const gained = card.gained + (support ? support.gained : 0);
            return { ok: gained > 0, reason: gained > 0 ? "added" : card.reason, gained, card, support, ...gaugeFields() };
        } catch (error) {
            return rejected("gaugeError");
        }
    };

    // 与ダメージ: 実際に減ったHP（実ダメージ）× DamageGainRate を、1回あたりDamageGainPerHitCapで頭打ちにして加算する。
    const damageGainId = context => {
        const explicit = normalizeId(context.damageId);
        if (explicit !== null) return explicit;
        const attackId = normalizeId(context.attackId), targetId = normalizeId(context.targetId);
        if (attackId === null || targetId === null) return null; // 識別子が無ければgainId無し（呼び出し側が二重呼び出しを避ける）。
        const tickId = context.tickId == null ? undefined : normalizeId(context.tickId);
        if (tickId === null) return null;
        return ["damage", attackId, targetId, ...(tickId === undefined ? [] : [tickId])].join(":");
    };
    const recordDamageDealt = (actualDamage, context) => {
        try {
            const ctx = context && typeof context === "object" ? context : {};
            const source = typeof ctx.source === "string" ? ctx.source : "damage";
            if (typeof actualDamage !== "number" || !Number.isFinite(actualDamage) || actualDamage <= 0) {
                return rejected("invalidDamage", { actualDamage: typeof actualDamage === "number" ? actualDamage : null, source });
            }
            const rawGain = actualDamage * gainConfig.damageGainRate;
            const gain = Math.min(rawGain, gainConfig.damageGainPerHitCap);
            const result = award("damage", gain, source, damageGainId(ctx));
            return { ...result, actualDamage, rawGain, gain, capped: rawGain > gainConfig.damageGainPerHitCap };
        } catch (error) {
            return rejected("gaugeError");
        }
    };
    // 対象イベントの現在HP。倒されて消えたイベントは0。HPが読めない場合はundefined（実ダメージを偽って作らない）。
    const eventHp = eventId => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!map) return undefined;
        const event = map.event(eventId);
        if (!event || event._erased) return 0;
        const hp = map.getCurrentEventHp(eventId);
        return hp == null ? undefined : hp;
    };
    const recordEventHpLoss = (eventId, hpBefore, context) => {
        try {
            const ctx = { targetId: eventId, ...(context && typeof context === "object" ? context : {}) };
            const before = typeof hpBefore === "number" ? hpBefore : NaN;
            if (!(before > 0)) return recordDamageDealt(0, ctx); // 既に倒れている/HP不明の対象は加算なし。
            const after = eventHp(eventId);
            if (after === undefined) return rejected("hpUnavailable");
            return recordDamageDealt(before - Math.max(0, after), ctx);
        } catch (error) {
            return rejected("gaugeError");
        }
    };
    // 攻撃側のHP適用をそのまま実行し、前後のHP差を与ダメージとして記録する。applyの結果と例外は変えない。
    const trackDamage = (eventId, context, apply) => {
        let before;
        try { before = eventHp(eventId); } catch (error) { before = undefined; }
        try {
            return apply();
        } finally {
            if (before > 0) recordEventHpLoss(eventId, before, context);
        }
    };

    // 重要回避: ProjectRには回避システムが無いため、実ゲームからは未接続。成功判定を行う将来の仕組みが呼ぶための入口。
    const recordImportantDodge = (dodgeId, source) => {
        try {
            const id = normalizeId(dodgeId);
            if (id === null) return rejected("invalidDodgeId");
            return award("dodge", gainConfig.importantDodgeGain, typeof source === "string" ? source : "dodge", `dodge:${id}`);
        } catch (error) {
            return rejected("gaugeError");
        }
    };

    if (deck) {
        const _requestUseCard = deck.requestUseCard;
        deck.requestUseCard = function() {
            const result = _requestUseCard.apply(this, arguments);
            if (result?.ok === true) recordCardUse(result); // 例外は投げない。発動結果はそのまま返す。
            return result;
        };
        // 戦闘開始: 有効な常駐Ultimate戦闘状態（Managerが作成済み）があるときだけ0から始める。
        // 開始し直し・失敗・Ultimate無しでは前のゲージを残さない。
        const _startCardBattle = deck.startCardBattle;
        deck.startCardBattle = function() {
            clear();
            const result = _startCardBattle.apply(this, arguments);
            try {
                if (result?.ok && manager()?.hasPersistentUltimateBattleState()) state = { max: configuredMax, current: 0 };
            } catch (error) {
                clear();
            }
            return result;
        };
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof Scene_Map !== "undefined") {
        const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function() {
            _onMapLoaded.apply(this, arguments);
            clear();
        };
    }

    root.ProjectRUltimateGauge = {
        addUltimateGauge,
        consumeUltimateGauge,
        hasUltimateGaugeState: () => !!state,
        getUltimateGauge: () => state ? state.current : 0,
        getUltimateGaugeMax: () => state ? state.max : 0,
        getUltimateGaugeRate: () => gaugeFields().rate,
        isUltimateGaugeFull: isFull,
        isUltimateReady: isReady,
        getUltimateGaugeState: () => state && Object.freeze({ current: state.current, max: state.max, ...gaugeFields() }),
        hasUltimateGaugeGainId: gainId => { const id = normalizeId(gainId); return id !== null && gainIds.has(id); },
        getUltimateGaugeGainCount: () => gainIds.size,
        // Phase 4B
        recordCardUse,
        recordDamageDealt,
        recordEventHpLoss,
        trackDamage,
        recordImportantDodge,
        getGainConfig: () => gainConfig,
        getGainStats: () => Object.freeze({ totals: Object.freeze({ ...totals }), last: lastGain && Object.freeze({ ...lastGain }) }),
        clear
    };
})();
