/*:
 * @target MZ
 * @plugindesc v1.2.0 カード戦闘中だけ Q/E/X/C/V を手札(左から1～5枠)へ排他的に渡します。押下時間の検出(任意)つき。
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
 * 押下時間の検出(Phase Apollo-A3・任意。登録しないカードは従来どおり押した瞬間に発動):
 *   registerPressProfile(cardId, { holdSeconds, fireOn?:"manual"|"release", onPress?, onHold?, onRelease?, onCancel? })
 *     onXxx(session): session = { id, index, cardId, heldFrames, heldSeconds, holdReached, activated, activate(variant), cancel(reason) }
 *     onRelease/onCancel の第2情報: session.variant("tap"|"hold") / session.reason。カードを消費するのは session.activate() だけ。
 *   unregisterPressProfile(cardId) / getPressProfile(cardId) / getPressSessions() / getPressLog() / cancelPress(handIndex?, reason?)
 *   getActivationVariant() : activate(variant) による requestUseCard の最中だけ variant("tap"|"hold"|任意)、それ以外は null
 *   取消の理由: handChanged(手札が入れ替わった) / blocked:<理由>(会話・メニュー・Scene切替など) / reset(戦闘終了・フォーカス喪失・Input.clear) / handler
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


    // ---- 押下時間の検出(Phase Apollo-A3) --------------------------------------------------------------------------------------------
    // カードが任意で「押下プロファイル」を登録すると、そのカードのキー(Q/E/X/C/V)は押した瞬間には発動せず、押下の開始・しきい値到達・離した・取消を
    // 受け取れる。プロファイルが無いカードは従来どおり(押した次のマップ更新で requestUseCard)。この Phase では、どのカードも登録しない。
    //   時間は Scene_Map.update の更新回数(Cooldownと同じ戦闘時計・1/60秒)で数える。会話・メニュー・フォーカス喪失など入力が受け付けられない間は止まらず「取消」になる。
    //   キーリピート: 押しっぱなしのkeydownは最初の1回だけ(従来の captured で保護)。取消後も、keyupまで同じキーは再発動しない。
    //   カードを消費するのは session.activate(variant) だけ(= requestUseCard を次のマップ更新で1回)。押す・長押しだけでは消費しない。
    //   いつ発動するか(離した時/しきい値到達時)や tap と hold の意味はカードの設計で決める。fireOn:"release" は離した時に tap/hold を付けて発動する便宜だけ。
    const profiles = new Map(); // cardId -> { holdSeconds, thresholdFrames, fireOn, onPress, onHold, onRelease, onCancel }
    const pressSessions = new Map(); // handIndex -> session
    const pressLog = [];
    const PRESS_LOG_LIMIT = 60;
    let pressSerial = 0;
    let currentVariant = null;
    const logPress = entry => { pressLog.push(entry); if (pressLog.length > PRESS_LOG_LIMIT) pressLog.shift(); };
    const handCard = index => {
        try { const hand = deck.getBattleState?.()?.hand; return Array.isArray(hand) ? hand[index] || null : null; } catch (_error) { return null; }
    };
    const framesFor = seconds => Math.max(1, Math.round(seconds * 60));
    const registerPressProfile = (cardId, profile = {}) => {
        const id = String(cardId ?? "").trim();
        const holdSeconds = Number(profile.holdSeconds);
        if (!id) return { ok: false, reason: "invalidCardId" };
        if (!Number.isFinite(holdSeconds) || holdSeconds <= 0 || holdSeconds > 30) return { ok: false, reason: "invalidHoldSeconds" };
        for (const name of ["onPress", "onHold", "onRelease", "onCancel"]) if (profile[name] !== undefined && typeof profile[name] !== "function") return { ok: false, reason: "invalidHandler", detail: name };
        const fireOn = profile.fireOn === undefined ? "manual" : profile.fireOn;
        if (fireOn !== "manual" && fireOn !== "release") return { ok: false, reason: "invalidFireOn" };
        if (fireOn === "manual" && !profile.onRelease && !profile.onHold && !profile.onPress) return { ok: false, reason: "noActivationPath" }; // 発動する経路が無いと、押してもカードが使えなくなる
        profiles.set(id, Object.freeze({ holdSeconds, thresholdFrames: framesFor(holdSeconds), fireOn,
            onPress: profile.onPress, onHold: profile.onHold, onRelease: profile.onRelease, onCancel: profile.onCancel }));
        return { ok: true, thresholdFrames: framesFor(holdSeconds) };
    };
    const sessionView = session => ({
        id: session.id, index: session.index, cardId: session.cardId, instanceId: session.instanceId, holdSeconds: session.profile.holdSeconds,
        thresholdFrames: session.profile.thresholdFrames, heldFrames: session.heldFrames, heldSeconds: session.heldFrames / 60,
        holdReached: session.holdReached, activated: session.activated, state: session.state,
        activate: variant => activatePress(session, variant),
        cancel: reason => endPress(session.index, "cancel", reason || "handler")
    });
    const callHandler = (session, name, extra) => {
        const handler = session.profile[name];
        if (typeof handler !== "function") return;
        try { handler(Object.assign(sessionView(session), extra || {})); } catch (error) { logPress({ type: "handlerError", id: session.id, name, message: String(error?.message || error) }); }
    };
    // カードの発動を依頼する(次のマップ更新で requestUseCard を1回)。1回の押下で何度呼んでも、依頼は1回だけ。
    const activatePress = (session, variant) => {
        if (session.activated || session.state === "ended") return { ok: false, reason: session.activated ? "alreadyActivated" : "sessionEnded" };
        session.activated = true;
        pending.push({ index: session.index, variant: variant ? String(variant) : null, instanceId: session.instanceId, pressId: session.id });
        logPress({ type: "activate", id: session.id, variant: variant || null, heldFrames: session.heldFrames });
        return { ok: true };
    };
    const beginPress = index => {
        const card = handCard(index);
        const profile = card ? profiles.get(String(card.cardId)) : null;
        if (!profile) return false;
        const session = { id: ++pressSerial, index, cardId: String(card.cardId), instanceId: card.instanceId ?? null, profile, heldFrames: 0, holdReached: false, activated: false, state: "pressing" };
        pressSessions.set(index, session);
        logPress({ type: "press", id: session.id, index, cardId: session.cardId });
        callHandler(session, "onPress");
        return true;
    };
    // reason: "release" | "cancel"
    const endPress = (index, kind, reason) => {
        const session = pressSessions.get(index);
        if (!session) return false;
        pressSessions.delete(index);
        if (kind === "release") {
            const variant = session.holdReached ? "hold" : "tap";
            session.state = "releasing"; // 離した通知の間は activate できる(終わったら ended)
            logPress({ type: "release", id: session.id, variant, heldFrames: session.heldFrames });
            if (session.profile.fireOn === "release") activatePress(session, variant);
            callHandler(session, "onRelease", { variant });
            session.state = "ended";
        } else {
            session.state = "ended";
            logPress({ type: "cancel", id: session.id, reason: reason || "cancel", heldFrames: session.heldFrames });
            callHandler(session, "onCancel", { reason: reason || "cancel" });
        }
        return true;
    };
    const cancelAllPresses = reason => { for (const index of [...pressSessions.keys()]) endPress(index, "cancel", reason); };
    const advancePresses = () => {
        for (const session of [...pressSessions.values()]) {
            const card = handCard(session.index);
            if (!card || card.instanceId !== session.instanceId) { endPress(session.index, "cancel", "handChanged"); continue; }
            session.heldFrames++;
            if (!session.holdReached && session.heldFrames >= session.profile.thresholdFrames) {
                session.holdReached = true;
                logPress({ type: "hold", id: session.id, heldFrames: session.heldFrames });
                callHandler(session, "onHold");
            }
        }
    };

    const resetSessionInput = () => { pending = []; lastResult = null; inputGeneration++; cancelAllPresses("reset"); };
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
                    if (!beginPress(index)) pending.push(index); // 押下プロファイルのあるカードは、押した瞬間には発動しない
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
        const releasedIndex = handIndexForEvent(event);
        if (captured.delete(releasedIndex)) { endPress(releasedIndex, "release"); return; }
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
        if (pressSessions.size && generation === inputGeneration && !canAcceptInput()) cancelAllPresses("blocked:" + (getBlockedReason() || "unknown"));
        if (generation !== inputGeneration || !canAcceptInput()) return;
        deck.updateCooldown(1 / 60);
        advancePresses();
        for (const item of requests) {
            if (generation !== inputGeneration || !canAcceptInput()) break;
            if (typeof item === "number") { // 従来の押下(押下プロファイルなし)
                const result = deck.requestUseCard(item);
                if (generation === inputGeneration) lastResult = result;
                continue;
            }
            // 押下プロファイルのカード: 依頼時と同じカードが同じ枠にあるときだけ発動する(入れ替わっていたら消費しない)
            const card = handCard(item.index);
            if (!card || card.instanceId !== item.instanceId) {
                if (generation === inputGeneration) lastResult = { ok: false, reason: "handChanged", variant: item.variant };
                continue;
            }
            currentVariant = item.variant;
            let result;
            try { result = deck.requestUseCard(item.index); } finally { currentVariant = null; }
            if (generation === inputGeneration) lastResult = Object.assign({}, result, { variant: item.variant });
        }
    };

    root.ProjectRCardBattleInput = {
        canAcceptInput,
        getBlockedReason,
        getDiagnostics: () => ({ ...diagnostics }),
        getKeyLabels: () => [...CARD_KEYS],
        registerPressProfile, unregisterPressProfile: cardId => profiles.delete(String(cardId ?? "").trim()),
        getPressProfile: cardId => { const p = profiles.get(String(cardId ?? "").trim()); return p ? { holdSeconds: p.holdSeconds, thresholdFrames: p.thresholdFrames, fireOn: p.fireOn } : null; },
        getPressSessions: () => [...pressSessions.values()].map(s => { const { activate, cancel, ...view } = sessionView(s); return view; }),
        getPressLog: () => pressLog.map(entry => ({ ...entry })),
        cancelPress: (index, reason) => { if (index === undefined) { const had = pressSessions.size > 0; cancelAllPresses(reason || "manual"); return had; } return endPress(index, "cancel", reason || "manual"); },
        getActivationVariant: () => currentVariant,
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null
    };
})();
