/*:
 * @target MZ
 * @plugindesc v1.1.0 カード戦闘中だけ Q/E/X/C/V を手札(左から1～5枠)へ排他的に渡します。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter Hendrix_Keyboard_Gamepad
 * @orderAfter Hendrix_Hotbar_Creator
 * @help
 * startCardBattle()で開始した戦闘だけが対象です。左クリックは不要です。
 * 手札の左から順に Q / E / X / C / V の押下を次のマップ更新で処理します。
 * （1～5キーはカード発動に使いません。戦闘外・戦闘中とも元のInputへ委譲します）
 * XはHendrix Button ConfigでCancelにも割り当てられていますが、カード戦闘中の
 * マップ上ではCancelは使われないため、このPluginが先に捕捉してカードへ渡します。
 * 戦闘外は元のInputへ委譲し、keyMapper/Gamepad割当を変更しません。
 *
 * KeyboardのInput.isTriggered/isPressedとHotbarInputStatusには、
 * 物理キー1個だけを消費するAPIがないため、Input._onKeyDown/Upをaliasします。
 * カード用の押下を元のInputへ渡さず、Hotbar/Keyboard CEとの二重発火を防ぎます。
 * Ctrl/Alt/Meta/Shift、IME、編集欄、別Scene、会話・選択・イベント、
 * フォーカス喪失時はカードを発動しません。押しっぱなしは再発動しません。
 * Action EngineのControlInputによる全入力停止も尊重します。
 *
 * ProjectRCardBattleInput.getLastResult() : 最後の入力結果（保存しない）
 * ProjectRCardBattleInput.canAcceptInput() : 入力受付可否
 * ProjectRCardBattleInput.getBlockedReason(event?) : 受け付けない理由(受付可ならnull)
 * ProjectRCardBattleInput.getDiagnostics() : 直近のキー入力の判定(診断用。保存しない)
 * ProjectRCardBattleInput.getKeyLabels() : ["Q","E","X","C","V"]
 * Cooldownは操作可能なマップ更新ごとに既存APIへ1/60秒渡します。
 * メニュー・会話・フォーカス喪失中は進行を停止します。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    if (!deck || typeof Input === "undefined" || typeof Scene_Map === "undefined") return;

    let pending = [];
    let lastResult = null;
    let windowFocused = true;
    let inputGeneration = 0;
    // 戦闘終了後も、捕捉済み押下のkeyupまではrepeatを既存入力へ漏らさない。
    const captured = new Set();

    // 手札の左から順(スロット1～5)のキー。表示(BattleHUD)・説明・テストはこの順を基準にする。
    const CARD_KEYS = Object.freeze(["Q", "E", "X", "C", "V"]);
    const handIndexForEvent = event => {
        if (!event) return -1;
        if (event.code) return /^Key[A-Z]$/.test(event.code) ? CARD_KEYS.indexOf(event.code.slice(3)) : -1;
        return CARD_KEYS.findIndex(key => key.charCodeAt(0) === event.keyCode);
    };
    let diagnostics = { keyDowns: 0, accepted: 0, blocked: 0, lastCode: null, lastIndex: -1, lastDecision: null, lastReason: null };
    const note = (event, index, decision, reason) => {
        diagnostics = { ...diagnostics, lastCode: event?.code || String(event?.keyCode ?? ""), lastIndex: index,
            lastDecision: decision, lastReason: reason || null };
    };

    const isEditing = element => !!element && (
        element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName || "") ||
        !!element.closest?.('[contenteditable]:not([contenteditable="false"]), [role="textbox"]')
    );

    // 受け付けない最初の理由(受付可ならnull)。診断(Arenaの状態端末)にも使う。
    const getBlockedReason = (event = {}) => {
        if (!deck.isCardBattleActive()) return "cardBattleInactive";
        if (!windowFocused) return "windowNotFocused";
        if (event.defaultPrevented) return "defaultPrevented";
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return "modifierKey";
        if (event.isComposing) return "ime";
        if (typeof document !== "undefined" &&
                (document.hasFocus?.() === false || isEditing(document.activeElement))) return "documentFocus";
        if (isEditing(event.target)) return "editingField";
        if (typeof HallInputBlocked !== "undefined" && HallInputBlocked) return "inputBlocked";
        const manager = typeof SceneManager !== "undefined" ? SceneManager : null;
        const scene = manager?._scene;
        if (!(scene instanceof Scene_Map)) return "notSceneMap";
        if (!scene.isActive() || scene.isBusy?.() || manager.isSceneChanging?.() || manager._stopped) return "sceneBusy";
        if (typeof $gameMessage !== "undefined" && $gameMessage?.isBusy?.()) return "messageBusy";
        if (typeof $gameMap !== "undefined" && $gameMap?.isEventRunning?.()) return "eventRunning";
        if (typeof $gamePlayer !== "undefined" && $gamePlayer?.isTransferring?.()) return "transferring";
        if (root.ProjectR?.FullscreenDialogue?.isActive?.()) return "fullscreenDialogue";
        const window = scene._windowLayer?.children?.find(child =>
            typeof Window_Selectable !== "undefined" && child instanceof Window_Selectable &&
            child.active && child.visible && child.isOpen());
        return window ? "activeWindow:" + (window.constructor?.name || "Window") : null;
    };
    const canAcceptInput = (event = {}) => getBlockedReason(event) === null;

    const resetSessionInput = () => { pending = []; lastResult = null; inputGeneration++; };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() {
        resetSessionInput();
        return _endBattle.apply(this, arguments);
    };

    const _onKeyDown = Input._onKeyDown;
    Input._onKeyDown = function(event) {
        const index = handIndexForEvent(event);
        if (captured.has(index)) return;
        if (index >= 0) {
            diagnostics = { ...diagnostics, keyDowns: diagnostics.keyDowns + 1 };
            const reason = getBlockedReason(event);
            if (reason === null) {
                // 空枠・発動失敗でもカード戦闘中はHotbarへフォールバックしない。
                if (!event.repeat) {
                    captured.add(index);
                    pending.push(index);
                    diagnostics = { ...diagnostics, accepted: diagnostics.accepted + 1 };
                    note(event, index, "accepted", null);
                }
                event.preventDefault();
                return;
            }
            if (reason !== "cardBattleInactive") {
                diagnostics = { ...diagnostics, blocked: diagnostics.blocked + 1 };
            }
            note(event, index, "passedThrough", reason);
        }
        return _onKeyDown.call(this, event);
    };

    const _onKeyUp = Input._onKeyUp;
    Input._onKeyUp = function(event) {
        if (captured.delete(handIndexForEvent(event))) return;
        return _onKeyUp.call(this, event);
    };

    const _clear = Input.clear;
    Input.clear = function() {
        captured.clear();
        resetSessionInput();
        return _clear.apply(this, arguments);
    };
    root.addEventListener?.("blur", () => {
        windowFocused = false;
        captured.clear();
        resetSessionInput();
    });
    root.addEventListener?.("focus", () => { windowFocused = true; });

    const _update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        const requests = pending;
        const generation = inputGeneration;
        pending = [];
        // 先に既存Sceneを更新し、同フレームの会話開始・Scene切替も再判定する。
        _update.apply(this, arguments);
        if (generation !== inputGeneration || !canAcceptInput()) return;
        deck.updateCooldown(1 / 60);
        for (const index of requests) {
            if (generation !== inputGeneration || !canAcceptInput()) break;
            const result = deck.requestUseCard(index);
            if (generation === inputGeneration) lastResult = result;
        }
    };

    root.ProjectRCardBattleInput = {
        canAcceptInput,
        getBlockedReason,
        getDiagnostics: () => ({ ...diagnostics }),
        getKeyLabels: () => [...CARD_KEYS],
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null
    };
})();
