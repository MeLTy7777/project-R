/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 戦闘ライフサイクルの一元窓口（開始/終了で カード戦闘・HUD・神・Gauge・向き・仲間を一括管理）。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_CombatPresence
 * @orderAfter ProjectR_PartyCombat
 * @orderAfter ProjectR_UltimateGauge
 *
 * @command BeginCombat
 * @text 戦闘を開始する
 * @desc 明示的な戦闘イベントを開始します。HUD・カード戦闘・常駐の神・Gauge・照準向きが有効になります。
 * @arg sourceId
 * @text 戦闘ID（開始と終了で同じ名前）
 * @type string
 * @default event_combat
 * @arg requireValidDeck
 * @text デッキが不正なら開始しない
 * @type boolean
 * @default false
 * @arg resultSwitchId
 * @text 結果を入れるスイッチ（0=使わない）
 * @type switch
 * @default 0
 *
 * @command EndCombat
 * @text 戦闘を終了する
 * @desc 同じ戦闘IDの戦闘を終えます。最後の戦闘が終わると、HUD・カード戦闘・神・Gauge・仲間が片付きます。
 * @arg sourceId
 * @text 戦闘ID
 * @type string
 * @default event_combat
 *
 * @help
 * ProjectR_CombatSession.js
 *
 * 戦闘の開始/終了を1か所で扱います。敵が画面にいる・近づいた、というだけでは戦闘は始まりません。
 * イベントから BeginCombat / EndCombat（またはAPI）を呼んだときだけ始まります。
 *
 * 開始（begin）で行うこと:
 *   1. （任意）デッキ検証 … requireValidDeck:true なら不正なデッキで開始を拒否（デッキは書き換えません）。
 *   2. カード戦闘の開始（startCardBattle）… 常駐のUltimate神・Divine HP・Ultimate Gauge・
 *      Card Cooldownなどは、このカード戦闘の開始に各プラグインが連動して初期化します。
 *      デッキが不正で始められないとき、通常の戦闘（requireValidDeck:false）はカード無しで続行します。
 *   3. 明示的な戦闘イベントの開始（ProjectRCombatPresence.beginCombatEvent）… HUD・照準向き・武器の使用可否。
 *   4. 仲間の戦闘セッション（allies指定時。最大2人）。
 * 終了（end）… 同じIDの戦闘を終え、最後の戦闘が終わったら カード戦闘・神・Gauge・召喚・仲間・
 *   一時レジストリを片付け、HUDを隠し、照準向きを解除します。
 *   マップ移動・ロード・ニューゲームでも、残っている戦闘をすべて終えます。
 *
 * API: ProjectRCombatSession
 *   begin(sourceId, { allies, cardBattle, requireValidDeck, bossId? }) -> { ok, reason, reasons, messages, cardBattle }
 *   end(sourceId, reason?) -> boolean       endAll(reason?)
 *   isActive() / sources() / info()         onBegin(fn) / onEnd(fn) -> 登録解除関数
 * 戦闘状態はセーブされません。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_CombatSession";
    const deck = () => root.ProjectRCardDeck;
    const presence = () => root.ProjectRCombatPresence;
    const party = () => root.ProjectRPartyCombat;
    const menu = () => root.ProjectRMenuCore;

    const sources = new Map(); // sourceId -> { ownsCardBattle, options }
    let cardBattleOwner = null; // カード戦闘を開始した戦闘ID（最後の戦闘が終わるまで保持）
    const beginHooks = new Set();
    const endHooks = new Set();
    const fire = (hooks, payload) => {
        for (const hook of [...hooks]) {
            try { hook(payload); } catch (error) {
                if (typeof console !== "undefined") console.warn(`[${PLUGIN}] hook error:`, error);
            }
        }
    };

    const deckProblems = () => {
        const reasons = deck()?.getBossBattleStartInvalidReasons?.() || [];
        return { reasons, messages: menu()?.describeReasons?.(reasons) || reasons.map(r => r.code) };
    };

    const begin = (sourceId, options = {}) => {
        if (typeof sourceId !== "string" || !sourceId) return { ok: false, reason: "invalidSourceId", reasons: [], messages: [] };
        if (sources.has(sourceId)) return { ok: false, reason: "alreadyActive", reasons: [], messages: [] };
        const core = deck();
        if (!core || !presence()) return { ok: false, reason: "systemUnavailable", reasons: [], messages: [] };
        const problems = deckProblems();
        if (options.requireValidDeck && problems.reasons.length) {
            return { ok: false, reason: "invalidDeck", reasons: problems.reasons, messages: problems.messages };
        }
        // 仲間の確認は先に行う（失敗したときに何も開始していないようにする）。
        const allies = Array.isArray(options.allies) ? options.allies : [];
        if (allies.length && !party()) return { ok: false, reason: "partyUnavailable", reasons: [], messages: [] };
        let ownsCardBattle = false;
        let cardStarted = core.isCardBattleActive();
        if (!cardStarted && options.cardBattle !== false) {
            const started = core.startCardBattle();
            if (started.ok) { ownsCardBattle = true; cardStarted = true; }
        }
        if (allies.length) {
            const partyResult = party().startSession(allies, options.partyOptions || {});
            if (!partyResult.ok) {
                if (ownsCardBattle) core.endCardBattle();
                return { ok: false, reason: partyResult.reason, reasons: [], messages: [] };
            }
        }
        if (!presence().beginCombatEvent(sourceId)) {
            if (allies.length) party().endSession();
            if (ownsCardBattle) core.endCardBattle();
            return { ok: false, reason: "combatEventRejected", reasons: [], messages: [] };
        }
        if (ownsCardBattle) cardBattleOwner = sourceId;
        sources.set(sourceId, { ownsCardBattle, options: { ...options, allies: [...allies] } });
        const result = { ok: true, reason: null, reasons: problems.reasons, messages: problems.messages, cardBattle: cardStarted, sourceId };
        fire(beginHooks, { sourceId, options: sources.get(sourceId).options, cardBattle: cardStarted });
        return result;
    };

    const end = (sourceId, reason = "end") => {
        if (!sources.has(sourceId)) return false;
        sources.delete(sourceId);
        presence()?.endCombatEvent?.(sourceId);
        const last = sources.size === 0;
        if (last) {
            // 最後の戦闘: カード戦闘（神・Gauge・召喚・Bridgeは endBattle に連動して片付く）と仲間を終える。
            // 他の経路（Arena等）が開始したカード戦闘は、その開始者が終える。
            if (cardBattleOwner !== null) deck()?.endCardBattle?.();
            party()?.endSession?.();
            cardBattleOwner = null;
        }
        fire(endHooks, { sourceId, reason, last });
        return true;
    };

    const endAll = (reason = "endAll") => {
        const ids = [...sources.keys()];
        for (const id of ids) end(id, reason);
        presence()?.clearCombatEvents?.();
        return ids.length;
    };

    const info = () => ({
        active: sources.size > 0, sources: [...sources.keys()], cardBattle: !!deck()?.isCardBattleActive?.(),
        partyActive: !!party()?.isActive?.()
    });

    // マップ移動・ロード・ニューゲームで残さない（実行時のみ）。
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { endAll("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        if (DataManager.extractSaveContents) {
            const _extract = DataManager.extractSaveContents;
            DataManager.extractSaveContents = function() { sources.clear(); cardBattleOwner = null; return _extract.apply(this, arguments); };
        }
        if (DataManager.setupNewGame) {
            const _newGame = DataManager.setupNewGame;
            DataManager.setupNewGame = function() { sources.clear(); cardBattleOwner = null; return _newGame.apply(this, arguments); };
        }
    }
    // 他の経路でカード戦闘だけが終わった場合、明示的な戦闘も終える（HUDだけ残らないように）。
    if (deck()) {
        const _endBattle = deck().endBattle;
        deck().endBattle = function() {
            const result = _endBattle.apply(this, arguments);
            if (sources.size && !deck().isCardBattleActive()) cardBattleOwner = null;
            return result;
        };
    }

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "BeginCombat", function(args) {
            const result = begin(String(args.sourceId || "event_combat"), { requireValidDeck: args.requireValidDeck === "true" });
            const switchId = Number.parseInt(args.resultSwitchId, 10);
            if (switchId > 0 && typeof $gameSwitches !== "undefined") $gameSwitches.setValue(switchId, result.ok);
            if (!result.ok && result.reason === "invalidDeck") announceInvalidDeck(this, result.messages);
        });
        PluginManager.registerCommand(PLUGIN, "EndCombat", args => { end(String(args.sourceId || "event_combat"), "event"); });
    }

    // 開始を拒否したとき、理由をプレイヤーに見せる（デッキは書き換えない）。
    function announceInvalidDeck(interpreter, messages) {
        if (typeof $gameMessage === "undefined") return;
        $gameMessage.add("デッキが条件を満たしていないため、戦闘を始められません。");
        for (const line of (messages || []).slice(0, 3)) $gameMessage.add("・" + line);
        $gameMessage.add("メニューの「スキル」からデッキを直してください。");
        if (interpreter && typeof interpreter.setWaitMode === "function") interpreter.setWaitMode("message");
    }

    root.ProjectRCombatSession = {
        begin, end, endAll, info,
        isActive: () => sources.size > 0,
        sources: () => [...sources.keys()],
        onBegin: fn => { beginHooks.add(fn); return () => beginHooks.delete(fn); },
        onEnd: fn => { endHooks.add(fn); return () => endHooks.delete(fn); },
        announceInvalidDeck
    };
})();
