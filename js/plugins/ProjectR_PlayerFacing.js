/*:
 * @target MZ
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatPresence
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter ProjectR_CombatPresence
 * @plugindesc v1.0.0 戦闘中だけプレイヤーを照準方向へ向けます。
 * @author ProjectR
 *
 * @help
 * ProjectR_PlayerFacing.js
 *
 * ProjectRCombatPresenceを戦闘状態の基準として使用します。
 *
 * 非戦闘中:
 *   プレイヤーへのturnToward('mouse or gamepad')を抑止し、
 *   DotMoveの通常の移動方向更新を使用します。
 *
 * 戦闘中:
 *   Hendrix Action Engineの既存照準方向処理をそのまま使用します。
 *
 * マウスカーソル、クリック入力、武器Spriteの回転処理は変更しません。
 */

(() => {
    "use strict";

    const mouseAimTarget = "mouse or gamepad";
    const suppressedAimFrames = new WeakMap();

    const isCombatActive = () => {
        const combatPresence = window.ProjectRCombatPresence;
        if (!combatPresence ||
            typeof combatPresence.isCombatActive !== "function") {
            return true;
        }
        return !!combatPresence.isCombatActive();
    };

    const isPlayer = character => {
        return typeof $gamePlayer !== "undefined" &&
            $gamePlayer && character === $gamePlayer;
    };

    const currentFrame = () => {
        if (typeof Graphics === "undefined") return null;
        const frame = Number(Graphics.frameCount);
        return Number.isFinite(frame) ? frame : null;
    };

    const isSameFrame = (left, right) => {
        return left === null || right === null || left === right;
    };

    const _Game_Character_turnToward = Game_Character.prototype.turnToward;
    Game_Character.prototype.turnToward = function(
        target,
        forceDirection = false,
        maxDistance = null
    ) {
        if (isPlayer(this) && target === mouseAimTarget && !isCombatActive()) {
            suppressedAimFrames.set(this, currentFrame());
            return;
        }
        suppressedAimFrames.delete(this);
        return _Game_Character_turnToward.call(
            this,
            target,
            forceDirection,
            maxDistance
        );
    };

    const _Game_Player_setDirectionFix = Game_Player.prototype.setDirectionFix;
    Game_Player.prototype.setDirectionFix = function(directionFix) {
        const suppressedFrame = suppressedAimFrames.get(this);
        if (suppressedFrame !== undefined) {
            const frame = currentFrame();
            if (directionFix && isSameFrame(suppressedFrame, frame)) {
                suppressedAimFrames.delete(this);
                if (!isCombatActive()) {
                    _Game_Player_setDirectionFix.call(this, false);
                    return;
                }
            } else if (!isSameFrame(suppressedFrame, frame)) {
                suppressedAimFrames.delete(this);
            }
        }
        _Game_Player_setDirectionFix.call(this, directionFix);
    };
})();
