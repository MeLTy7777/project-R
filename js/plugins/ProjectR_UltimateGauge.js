/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 4A 戦闘中Ultimateゲージの基盤（実行時状態・加算・準備完了判定・消費）。
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
 * @help
 * 戦闘（ボス/カード戦）ごとに0から始まるUltimateゲージの基盤です。
 * このPhase 4Aでは「状態・加算API・問い合わせAPI・消費API」だけを提供します。
 * 実際の戦闘行動（与ダメージ・カード使用・支援・回避）からの加算、Ultimateの入力、
 * Ultimate攻撃、HUDは含みません（加算元の接続は後続フェーズ）。
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

    let state = null; // { max, current } 実行時のみ。
    const gainIds = new Set(); // 使用済みgainId（戦闘中のみ）。

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
    const clear = () => { state = null; gainIds.clear(); };

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

    if (deck) {
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
        clear
    };
})();
