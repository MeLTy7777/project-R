/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-1 Hermes「認識阻害」のinstant handler。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_ApolloGoldenArrow
 *
 * @param DurationSeconds
 * @text 認識阻害の持続時間（秒）
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 5.0
 *
 * @help
 * hermes_perception_obscureだけを実発動。他のinstantカードはPhase 2Aのまま。
 * <ProjectRCard: hermes_perception_obscure>のある唯一のDatabase Stateを使用。
 * 公式AddState(target: player, stateId)後、hasState('player', id)で成功確認。
 * 消費・10秒Cooldown・即時ドローは既存Routerへ委譲します。
 *
 * 効果時間だけをローカル管理。既存InputのupdateCooldown(1/60)に合わせ、
 * 操作可能なマップ時間で進行し、メニュー・会話・フォーカス喪失中は停止。
 * 再使用は時間を設定秒へ更新。終了時は公式RemoveState（eventId=0）で解除。
 * StateにはCommon Eventを設定しません。State CE専用のRemoveStateですが、
 * 導入版1.6.6bの実装でeventId=0はparty leaderの標準Stateを解除します。
 * 主人公交代時は元Actorの標準removeStateで解除します。
 *
 * 将来の新規索敵判定:
 *   ProjectRHermesRecognitionObscure.isPlayerRecognitionObscured()
 * 内部では公式hasStateのみ確認。攻撃・Damage・索敵そのものは変更しません。
 *
 * 残り時間・Activationは保存しません。標準Actor保存のコピーから専用Stateだけを
 * 除き、プレイ中のStateを維持したまま、ロード後の残留も防ぎます。
 * Phase 1の恒久データ形式は変更しません。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD_ID = "hermes_perception_obscure";
    const MARKER = `<ProjectRCard: ${CARD_ID}>`;
    const configured = Number(PluginManager.parameters("ProjectR_HermesRecognitionObscure").DurationSeconds);
    const duration = Number.isFinite(configured) && configured > 0 ? configured : 5;
    let effect = null; // { actor, stateId, remaining }。Game_*には格納しない。

    const stateId = () => {
        const matches = (typeof $dataStates !== "undefined" ? $dataStates : [])
            .filter(state => state?.note?.includes(MARKER));
        return matches.length === 1 ? matches[0].id : 0;
    };
    const leader = () => typeof $gameParty !== "undefined" ? $gameParty?.leader() : null;
    const command = (name, args) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = 0; // RemoveStateはtarget引数を持たず、呼出元0がplayer。
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const hasState = id => !!id && typeof root.hasState === "function" && root.hasState("player", id);
    const clearEffect = () => {
        const previous = effect;
        effect = null;
        const actor = leader();
        const id = previous?.stateId || stateId();
        if (actor?.isStateAffected(id)) {
            try {
                command("RemoveState", { stateId: String(id) });
            } finally {
                // コマンド欠落/主人公交代でも標準Stateだけを確実に片付ける。
                if (actor.isStateAffected(id)) actor.removeState(id);
            }
        }
        if (previous?.actor !== actor) previous?.actor.removeState(previous.stateId);
    };

    deck.registerActivationHandler("instant", context => {
        if (context.definition.cardId !== CARD_ID) return { ok: true };
        const id = stateId();
        const actor = leader();
        if (!deck.isCardBattleActive() || !id || !actor || typeof root.hasState !== "function" ||
                !["AddState", "RemoveState"].every(name =>
                    typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "recognitionStateUnavailable" };
        }
        if (effect && effect.actor !== actor) clearEffect();
        const alreadyAffected = hasState(id);
        try {
            command("AddState", { target: "player", stateId: String(id) });
            if (!hasState(id)) return { ok: false, reason: "stateApplicationFailed" };
        } catch (error) {
            // 付与後に公式処理が例外を出しても、非消費の新規効果を残さない。
            if (!alreadyAffected) actor.removeState(id);
            return { ok: false, reason: String(error?.message || error) };
        }
        effect = { actor, stateId: id, remaining: duration };
        return { ok: true };
    });

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
        const id = stateId();
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

    root.ProjectRHermesRecognitionObscure = {
        isPlayerRecognitionObscured: () => hasState(stateId())
    };
})();
