/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 4C Ultimate入力と発動トランザクション基盤（神ごとのhandler登録・検証・成功後のゲージ消費）。
 * @author ProjectR
 * @base ProjectR_UltimateGauge
 * @orderAfter ProjectR_GodSummonManager
 * @orderAfter ProjectR_UltimateGauge
 * @orderAfter ProjectR_CardBattleInput
 *
 * @param UltimateKey
 * @text Ultimateキー（暫定）
 * @type string
 * @default U
 * @desc カード戦闘中にUltimateを要求するキー。英字1文字(A-Z)。他の操作と衝突する場合や不正値は無効/既定のUになります。
 *
 * @help
 * Phase 4C: Ultimateを「発動する」ための入力・検証・トランザクションの土台です。
 * Apollo/HermesのUltimate攻撃・ダメージ・演出・HUDはまだありません。
 * 本番ではhandlerが未登録なので、キーを押すと noUltimateHandler になり、ゲージは100のまま残ります。
 *
 * 【入力】
 *   既定は U キー（ProjectR・Hendrix・データのどれも未使用であることを確認済み）。
 *   Plugin Parameter UltimateKey で変更できます（英字1文字）。
 *   ・ProjectRCardBattleInputと同じ方針で Input._onKeyDown/_onKeyUp をaliasします。
 *   ・カード戦闘中の「押下の瞬間」だけが1回の要求になります。押しっぱなし(repeat)は再要求しません。
 *   ・戦闘外・会話中・メニュー中・Ctrl/Alt/Shift/Meta・IME・編集欄・フォーカス喪失中は何もせず、元のInputへ委譲します。
 *   ・カードキー1～5、Sword/G17/Interact等の既存操作、keyMapper、Gamepad割当は変更しません。
 *   ・Button Config(Hendrix_Keyboard_Gamepad)や現在のkeyMapperで他の操作に使われているキーを指定すると、
 *     そのキーは奪わず、入力だけ無効になります(getInputBinding().active === false)。APIは使えます。
 *   ・入力処理は requestUltimateActivation("keyboard") を呼ぶだけで、トランザクションの中身を持ちません。
 *
 * 【API】 ProjectRUltimateActivation
 *   requestUltimateActivation(source?)
 *     検証 → handler呼び出し → 開始成功を確認 → ProjectRUltimateGauge.consumeUltimateGauge()。
 *     { ok, reason, started, source, godId, ringId, consumed, gauge, max, handlerReason?, consumeReason?, serial } を返す。
 *     例外は投げません。Console/テスト/将来のHUD・Gamepadからも直接呼べます。
 *   registerUltimateHandler(godId, handler) -> { ok, reason, godId, replaced }
 *     godIdは英数字/_/-の空でない文字列、handlerは関数。同じgodIdの再登録は置き換え(replaced:true)。他の神は変わりません。
 *   unregisterUltimateHandler(godId) -> { ok, reason, godId, removed }
 *   hasUltimateHandler(godId) / getRegisteredUltimateGods()  登録有無・登録済みgodIdの配列のコピー
 *   getLastUltimateActivationResult()  直近の結果のコピー(無ければnull。保存しない)
 *   getInputBinding()  { configured, key, code, keyCode, active, reason } のコピー
 *
 * 【検証順】 失敗理由
 *   1 battleInactive                カード戦闘が開始していない
 *   2 noUltimateGauge               ゲージ状態が無い(Ultimate未選択など)
 *   3 gaugeNotFull                  ゲージが最大値未満
 *   4 persistentUltimateUnavailable 常駐Ultimate神が顕現中でない(崩壊中など)
 *   5 invalidUltimateGod            戦闘のsnapshotからgod/ringを解決できない
 *   6 noUltimateHandler             その神のhandlerが未登録
 *   handler呼び出し後:
 *   ultimateHandlerException        handlerが例外 → ゲージ不変
 *   ultimateStartFailed             handlerが {ok:true, started:true} を返さなかった → ゲージ不変
 *   gaugeConsumeFailedAfterStart    開始成功後にゲージ消費が失敗(診断にconsumeReason)。巻き戻しはしません
 *   activationInProgress            handler実行中の再入
 *
 * 【handler契約】 handler(context) は同期的に結果を返します。
 *   成功: { ok: true, started: true, ... }      失敗: { ok: false, reason: "..." }
 *   undefined・例外・真偽値など、started === true かつ ok === true 以外は成功として扱いません。
 *   context(読み取り専用): { godId, ringId, battle, summon, player, gauge, max, source }
 *     battle/summonは戦闘開始時のsnapshot(GodSummonManager)。戦闘中にUltimate選択が変わっても影響しません。
 *   handlerは開始のための最小限の準備だけを行い、次をしてはいけません:
 *     ・Ultimateゲージの消費/リセット(成功後にこのpluginが行います)
 *     ・常駐Ultimate神の崩壊/除去
 *     ・Ultimate選択の変更
 *     ・activationが完了する前に戦闘を同期的に終了すること
 *   これらはUltimateの効果の進行中(後続のフレーム)に行ってください。
 *
 * 【後始末・保存】
 *   endCardBattle・マップ移動・onMapLoaded・ロードで、直近の結果・入力の保留を破棄します。
 *   handlerの登録は実行時の定義なので残ります(将来のUltimate効果pluginが読み込み時に登録するため)。
 *   何も保存しません。セーブ形式は変えていません。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const DEFAULT_KEY = "U";
    // 常にUltimateに使わないキー(会話の決定など)。操作割当はButton Configとkeymapperから動的に調べる。
    const FIXED_RESERVED = ["z", "1", "2", "3", "4", "5"];

    const gaugeApi = () => root.ProjectRUltimateGauge || null;
    const managerApi = () => root.ProjectRGodSummonManager || null;
    const cardInput = () => root.ProjectRCardBattleInput || null;

    // ---- handler登録 ----
    const handlers = new Map();
    const validGodId = value => typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);
    const registerUltimateHandler = (godId, handler) => {
        if (!validGodId(godId)) return { ok: false, reason: "invalidGodId", godId: null, replaced: false };
        if (typeof handler !== "function") return { ok: false, reason: "invalidHandler", godId, replaced: false };
        const replaced = handlers.has(godId);
        handlers.set(godId, handler);
        return { ok: true, reason: replaced ? "replaced" : "registered", godId, replaced };
    };
    const unregisterUltimateHandler = godId => {
        if (!validGodId(godId)) return { ok: false, reason: "invalidGodId", godId: null, removed: false };
        const removed = handlers.delete(godId);
        return { ok: removed, reason: removed ? "unregistered" : "noUltimateHandler", godId, removed };
    };

    // ---- 診断(保存しない) ----
    let lastResult = null;
    let serial = 0;
    let inProgress = false;
    const remember = result => { lastResult = Object.freeze({ ...result }); return result; };

    const safeCopy = value => {
        try {
            return value === undefined ? null : JSON.parse(JSON.stringify(value));
        } catch (error) {
            return null;
        }
    };
    const playerSnapshot = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        return Object.freeze(player && Number.isFinite(player._realX) && Number.isFinite(player._realY)
            ? { x: player._realX, y: player._realY } : { x: null, y: null });
    };

    // ---- 発動トランザクション ----
    // 検証はすべてhandler呼び出しより前。handlerが {ok:true, started:true} を返した直後にだけゲージを消費する。
    const requestUltimateActivation = source => {
        const origin = typeof source === "string" && source.length ? source : "api";
        const result = (reason, extra) => remember({ ok: false, reason, started: false, source: origin, godId: null,
            ringId: null, consumed: 0, serial: ++serial, ...extra });
        try {
            if (inProgress) return result("activationInProgress");
            if (!deck?.isCardBattleActive?.()) return result("battleInactive");
            const gauge = gaugeApi(), manager = managerApi();
            if (!gauge?.hasUltimateGaugeState?.()) return result("noUltimateGauge");
            if (!gauge.isUltimateGaugeFull()) return result("gaugeNotFull", { gauge: gauge.getUltimateGauge(), max: gauge.getUltimateGaugeMax() });
            if (!manager?.isPersistentUltimateAvailable?.()) return result("persistentUltimateUnavailable");
            const battle = manager.getPersistentUltimateBattleState();
            const summon = manager.getPersistentUltimateSummon();
            const godId = battle?.godId, ringId = battle?.ringId;
            if (typeof godId !== "string" || !godId.length || typeof ringId !== "string" || !ringId.length || !summon) {
                return result("invalidUltimateGod");
            }
            const handler = handlers.get(godId);
            if (!handler) return result("noUltimateHandler", { godId, ringId });
            const context = Object.freeze({ godId, ringId, battle, summon, player: playerSnapshot(),
                gauge: gauge.getUltimateGauge(), max: gauge.getUltimateGaugeMax(), source: origin });

            let handlerResult;
            inProgress = true;
            try {
                handlerResult = handler(context);
            } catch (error) {
                return result("ultimateHandlerException", { godId, ringId, error: String(error?.message || error) });
            } finally {
                inProgress = false;
            }
            if (!handlerResult || typeof handlerResult !== "object" || handlerResult.ok !== true || handlerResult.started !== true) {
                const handlerReason = handlerResult && typeof handlerResult === "object" && typeof handlerResult.reason === "string"
                    ? handlerResult.reason : "invalidHandlerResult";
                return result("ultimateStartFailed", { godId, ringId, handlerReason });
            }
            // 開始成功。ここで初めてゲージを消費する(ゲージ消費APIを使い、手動でリセットしない)。
            const consumed = gauge.consumeUltimateGauge();
            if (!consumed?.ok) {
                return result("gaugeConsumeFailedAfterStart", { started: true, godId, ringId,
                    consumeReason: consumed?.reason ?? "unknown", handlerResult: safeCopy(handlerResult) });
            }
            return remember({ ok: true, reason: "started", started: true, source: origin, godId, ringId,
                consumed: consumed.consumed, gauge: consumed.gauge, max: consumed.max, serial: ++serial,
                handlerResult: safeCopy(handlerResult) });
        } catch (error) {
            inProgress = false;
            return result("activationError", { error: String(error?.message || error) });
        }
    };

    // ---- 入力 ----
    const keyOf = raw => {
        const text = typeof raw === "string" ? raw.trim().toUpperCase() : "";
        return /^[A-Z]$/.test(text) ? text : DEFAULT_KEY;
    };
    const configuredKey = keyOf(typeof PluginManager !== "undefined" ? PluginManager.parameters("ProjectR_UltimateActivation")?.UltimateKey : DEFAULT_KEY);

    // 他の操作に使われているキー: Hendrix Button Configの割当先 + 現在のkeyMapperが別操作に割り当てているキー。
    const reservedByConfig = () => {
        const reserved = new Set(FIXED_RESERVED);
        try {
            const raw = PluginManager.parameters("Hendrix_Keyboard_Gamepad")?.["Button Config"];
            for (const entry of JSON.parse(raw || "[]")) {
                const button = typeof entry === "string" ? JSON.parse(entry) : entry;
                for (const name of String(button?.["To Key"] ?? "").split(",")) {
                    const key = name.trim().toLowerCase();
                    if (key) reserved.add(key);
                }
            }
        } catch (error) { /* 読めない設定は「予約なし」ではなく既知の予約だけで判定する。 */ }
        return reserved;
    };
    const getInputBinding = () => {
        const letter = configuredKey.toLowerCase();
        const keyCode = configuredKey.charCodeAt(0);
        const mapped = typeof Input !== "undefined" ? Input.keyMapper?.[keyCode] : undefined;
        let reason = null;
        if (reservedByConfig().has(letter)) reason = "keyConflict";
        else if (mapped !== undefined && mapped !== letter) reason = "keyConflict";
        return { configured: configuredKey, key: configuredKey, code: `Key${configuredKey}`, keyCode, active: reason === null, reason };
    };

    let pending = [];
    let generation = 0;
    let held = false; // 物理キーが押されている間(捕捉済み)。repeat・二重keydownを遮断する。
    let windowFocused = true;
    const resetInput = () => { pending = []; lastResult = null; generation++; };
    const resetLatch = () => { held = false; };

    const matches = (event, binding) => event.code ? event.code === binding.code : event.keyCode === binding.keyCode;

    if (deck && typeof Input !== "undefined" && typeof Scene_Map !== "undefined") {
        const _onKeyDown = Input._onKeyDown;
        Input._onKeyDown = function(event) {
            const binding = getInputBinding();
            if (binding.active && event && matches(event, binding)) {
                if (held) return; // 押しっぱなし(repeat)や二重keydownは元のInputにも渡さない。
                const accept = cardInput()?.canAcceptInput;
                if (!event.repeat && typeof accept === "function" && accept(event)) {
                    held = true;
                    pending.push("keyboard");
                    event.preventDefault?.();
                    return;
                }
            }
            return _onKeyDown.call(this, event);
        };
        const _onKeyUp = Input._onKeyUp;
        Input._onKeyUp = function(event) {
            const binding = getInputBinding();
            if (held && event && matches(event, binding)) { held = false; return; }
            return _onKeyUp.call(this, event);
        };
        const _clear = Input.clear;
        Input.clear = function() {
            resetLatch();
            resetInput();
            return _clear.apply(this, arguments);
        };
        root.addEventListener?.("blur", () => { windowFocused = false; resetLatch(); resetInput(); });
        root.addEventListener?.("focus", () => { windowFocused = true; });

        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const requests = pending;
            const stamp = generation;
            pending = [];
            _update.apply(this, arguments); // カード入力などを先に処理し、同フレームの会話開始・Scene切替も再判定する。
            const accept = cardInput()?.canAcceptInput;
            for (const origin of requests) {
                if (stamp !== generation || !windowFocused || typeof accept !== "function" || !accept()) break;
                requestUltimateActivation(origin);
            }
        };
    }

    // ---- 後始末: 直近の結果・入力の保留を破棄(handler登録は残す。何も保存しない) ----
    if (deck) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { resetInput(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { resetLatch(); resetInput(); return _setup.apply(this, arguments); };
    }
    if (typeof Scene_Map !== "undefined") {
        const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function() {
            const result = _onMapLoaded.apply(this, arguments);
            resetLatch();
            resetInput();
            return result;
        };
    }

    root.ProjectRUltimateActivation = {
        requestUltimateActivation,
        registerUltimateHandler,
        unregisterUltimateHandler,
        hasUltimateHandler: godId => validGodId(godId) && handlers.has(godId),
        getRegisteredUltimateGods: () => [...handlers.keys()].sort(),
        getLastUltimateActivationResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getInputBinding
    };
})();
