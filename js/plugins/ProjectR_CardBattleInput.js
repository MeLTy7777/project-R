/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2A カード戦闘中だけ1～5を手札へ排他的に渡します。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter Hendrix_Keyboard_Gamepad
 * @orderAfter Hendrix_Hotbar_Creator
 * @help
 * startCardBattle()で開始した戦闘だけが対象です。左クリックは不要です。
 * 数字列1～5（テンキーは対象外）の押下を次のマップ更新で処理します。
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

    const handIndexForEvent = event => {
        if (/^Digit[1-5]$/.test(event.code || "")) return Number(event.code.slice(-1)) - 1;
        if (!event.code && event.keyCode >= 49 && event.keyCode <= 53) return event.keyCode - 49;
        return -1;
    };

    const isEditing = element => !!element && (
        element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName || "") ||
        !!element.closest?.('[contenteditable]:not([contenteditable="false"]), [role="textbox"]')
    );

    const canAcceptInput = (event = {}) => {
        if (!deck.isCardBattleActive() || !windowFocused || event.defaultPrevented ||
                event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.isComposing) return false;
        if (typeof document !== "undefined" &&
                (document.hasFocus?.() === false || isEditing(document.activeElement))) return false;
        if (isEditing(event.target)) return false;
        if (typeof HallInputBlocked !== "undefined" && HallInputBlocked) return false;
        const manager = typeof SceneManager !== "undefined" ? SceneManager : null;
        const scene = manager?._scene;
        if (!(scene instanceof Scene_Map) || !scene.isActive() || scene.isBusy?.() ||
                manager.isSceneChanging?.() || manager._stopped) return false;
        if (typeof $gameMessage !== "undefined" && $gameMessage?.isBusy?.()) return false;
        if (typeof $gameMap !== "undefined" && $gameMap?.isEventRunning?.()) return false;
        if (typeof $gamePlayer !== "undefined" && $gamePlayer?.isTransferring?.()) return false;
        if (root.ProjectR?.FullscreenDialogue?.isActive?.()) return false;
        return !scene._windowLayer?.children?.some(child =>
            typeof Window_Selectable !== "undefined" && child instanceof Window_Selectable &&
            child.active && child.visible && child.isOpen()
        );
    };

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
        if (index >= 0 && canAcceptInput(event)) {
            // 空枠・発動失敗でもカード戦闘中はHotbarへフォールバックしない。
            if (!event.repeat) {
                captured.add(index);
                pending.push(index);
            }
            event.preventDefault();
            return;
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
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null
    };
})();
