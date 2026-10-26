/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-6 Apollo「リラの支援」の精神安定State付与。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_ApolloDiseaseAttack
 *
 * @param DurationSeconds
 * @text 精神安定の持続時間（秒）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 6.0
 *
 * @help
 * apollo_lyre_calm専用。既存のallyカード種別handlerを使い、対象選択・マウスなしで
 * 即時発動します（他のallyカードは前のhandlerへ委譲）。
 *
 * 効果（仮設定）:
 *   1. 精神異常Stateを主人公から解除（公式RemoveState）
 *   2. Database State「精神安定」を公式AddStateで付与
 *   3. 精神安定中は同じ精神異常Stateを公式の耐性で防ぐ
 *
 * 精神異常State一覧はプラグインではなく、Database State「精神安定」
 * （note: <ProjectRCard: apollo_lyre_calm>）の特徴「ステート無効化」に持たせます。
 * 初期値は睡眠(32)のみ。認識阻害(31)・病(33)は対象外。恐怖・混乱などを足す場合は
 * Databaseでステート無効化を追加するだけで、解除と耐性が同時に対象になります。
 * 耐性はMZ標準のステート無効化なので、独自の付与割込みはありません。
 *
 * Stateを先に付与・確認してから解除するため、付与失敗時は何も変更せず
 * activationFailed（非消費）。解除対象が無くても成功です。
 * 時間は認識阻害・葦笛睡眠と同じupdateCooldownで進み、メニュー・会話・
 * フォーカス喪失・戦闘非稼働中は停止。再使用は非stackで残りを設定秒へ更新。
 * endCardBattle()で解除。残り時間と精神安定Stateは保存しません。
 *
 * 将来のUI/AI用:
 *   ProjectRApolloLyreCalm.isPlayerCalm()
 *   ProjectRApolloLyreCalm.getRemainingSeconds()
 *   ProjectRApolloLyreCalm.getMentalStateIds()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD_ID = "apollo_lyre_calm";
    const MARKER = `<ProjectRCard: ${CARD_ID}>`;
    const STATE_RESIST = 14;
    const configured = Number(PluginManager.parameters("ProjectR_ApolloLyreCalm").DurationSeconds);
    const duration = Number.isFinite(configured) && configured > 0 ? configured : 6;
    let effect = null; // { actor, stateId, remaining }。Game_*には格納しない。

    const calmStateId = () => {
        const matches = (typeof $dataStates !== "undefined" ? $dataStates : [])
            .filter(state => state?.note?.includes(MARKER));
        return matches.length === 1 ? matches[0].id : 0;
    };
    // 精神異常State = 精神安定Stateの「ステート無効化」特徴。
    const mentalStateIds = () => {
        const id = calmStateId();
        if (!id) return [];
        const ids = $dataStates[id].traits.filter(t => t.code === STATE_RESIST).map(t => t.dataId);
        return [...new Set(ids)].filter(value => value !== id && !!$dataStates[value]);
    };
    const leader = () => typeof $gameParty !== "undefined" ? $gameParty?.leader() : null;
    const command = (name, args) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = 0; // RemoveStateはtarget引数を持たず、呼出元0がplayer。
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const hasState = id => !!id && typeof root.hasState === "function" && root.hasState("player", id);
    const removeState = (actor, id) => {
        if (!actor.isStateAffected(id)) return;
        try {
            command("RemoveState", { stateId: String(id) });
        } finally {
            // コマンド欠落/主人公交代でも標準Stateだけを確実に片付ける。
            if (actor.isStateAffected(id)) actor.removeState(id);
        }
    };
    const clearEffect = () => {
        const previous = effect;
        effect = null;
        const actor = leader();
        const id = previous?.stateId || calmStateId();
        if (actor && id) removeState(actor, id);
        if (previous && previous.actor !== actor) previous.actor.removeState(previous.stateId);
    };

    const previousAlly = deck.getActivationHandler("ally");
    const activate = () => {
        const id = calmStateId();
        const actor = leader();
        if (!deck.isCardBattleActive() || !id || !actor || typeof root.hasState !== "function" ||
                !["AddState", "RemoveState"].every(name =>
                    typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "calmStateUnavailable" };
        }
        if (effect && effect.actor !== actor) clearEffect();
        const alreadyCalm = hasState(id);
        const mental = mentalStateIds();
        const affected = mental.filter(value => actor.isStateAffected(value));
        try {
            command("AddState", { target: "player", stateId: String(id) });
            if (!hasState(id)) return { ok: false, reason: "stateApplicationFailed" };
        } catch (error) {
            // 付与後に公式処理が例外を出しても、非消費の新規効果を残さない。
            // Calm付与の標準refreshで先に消えた精神異常Stateも元へ戻す。
            if (!alreadyCalm) {
                actor.removeState(id);
                for (const value of affected) actor.addState(value);
            }
            return { ok: false, reason: String(error?.message || error) };
        }
        for (const value of mental) removeState(actor, value);
        effect = { actor, stateId: id, remaining: duration };
        return { ok: true };
    };
    deck.registerActivationHandler("ally", context => context.definition.cardId === CARD_ID
        ? activate() : previousAlly ? previousAlly(context) : { ok: true });

    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (effect) {
            if (!deck.isCardBattleActive() || effect.actor !== leader() || !hasState(effect.stateId)) {
                clearEffect();
            } else if (Number.isFinite(seconds) && seconds > 0) {
                effect.remaining = Math.max(0, effect.remaining - seconds);
                if (effect.remaining < 1e-8) clearEffect();
            }
        }
        return result;
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() {
        clearEffect();
        return _endBattle.apply(this, arguments);
    };

    // MZはActorの_statesを標準保存するため、専用Stateのみ保存用コピーから除外。
    const _makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _makeSaveContents.apply(this, arguments);
        const id = calmStateId();
        if (!id || !contents.actors?._data) return contents;
        const copy = value => Object.assign(Object.create(Object.getPrototypeOf(value)), value);
        const actors = copy(contents.actors);
        actors._data = actors._data.map(actor => {
            if (!actor?.isStateAffected(id)) return actor;
            const saved = copy(actor);
            saved._states = actor._states.filter(value => value !== id);
            saved._stateTurns = { ...actor._stateTurns };
            delete saved._stateTurns[id];
            return saved;
        });
        return { ...contents, actors };
    };
    const _extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        const result = _extractSaveContents.apply(this, arguments);
        effect = null; // ロード後に旧タイマーを持ち越さない。
        return result;
    };

    root.ProjectRApolloLyreCalm = {
        activate,
        isPlayerCalm: () => hasState(calmStateId()),
        getRemainingSeconds: () => effect && hasState(effect.stateId) ? effect.remaining : 0,
        getMentalStateIds: mentalStateIds
    };
})();
