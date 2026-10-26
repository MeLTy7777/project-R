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
 *
 * 戦闘中の「調べる」(決定キー):
 *   戦闘中は照準方向に向きが固定されるため、決定キーを押した瞬間だけ、
 *   すぐ隣(約1.5タイル以内)にある決定ボタンのイベントの方向へ向けます。
 *   敵・弾・透明なイベントは対象外です。近くに対象が無ければ何もしません。
 *   カード用の1～5キーやUltimateキーとは関係しません。
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

    // 戦闘中は照準方向にプレイヤーの向きが固定されるため、決定キーで近くの
    // イベント(端末・看板・扉)を調べても、マウスがそちらを向いていないと起動しない。
    // 決定キーが押された瞬間だけ、すぐ隣の「決定ボタン」イベントの方向へ向ける。
    // 戦闘外では何もしない(通常の向きでそのまま調べられる)。
    const interactReach = 1.5;
    const interactAlignment = 0.75;

    const isInteractableEvent = event => {
        if (!event || event._erased || typeof event.isTriggerIn !== "function") return false;
        if (event.databaseEnemy || event.isSpawnEvent || event.isPlayerChild) return false;
        if (typeof event.isTransparent === "function" && event.isTransparent()) return false;
        if (typeof event.isNormalPriority === "function" && !event.isNormalPriority()) return false;
        if (!event.isTriggerIn([0])) return false;
        const list = typeof event.list === "function" ? event.list() : null;
        return !!list && list.length > 1;
    };

    const directionToward = (player, event) => {
        const dx = Number(event._realX) - Number(player._realX);
        const dy = Number(event._realY) - Number(player._realY);
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        if (Math.max(ax, ay) > interactReach || Math.min(ax, ay) > interactAlignment) {
            return 0;
        }
        return ax > ay ? (dx > 0 ? 6 : 4) : (dy > 0 ? 2 : 8);
    };

    const nearestInteractDirection = player => {
        const events = typeof $gameMap !== "undefined" && $gameMap ? $gameMap.events() : [];
        let bestDirection = 0;
        let bestDistance = Infinity;
        for (const event of events) {
            if (!isInteractableEvent(event)) continue;
            const direction = directionToward(player, event);
            if (!direction) continue;
            const distance = Math.hypot(
                event._realX - player._realX,
                event._realY - player._realY
            );
            if (distance < bestDistance) {
                bestDistance = distance;
                bestDirection = direction;
            }
        }
        return bestDirection;
    };

    const _Game_Player_triggerButtonAction = Game_Player.prototype.triggerButtonAction;
    Game_Player.prototype.triggerButtonAction = function() {
        if (isCombatActive() && Input.isTriggered("ok") && this.canMove()) {
            const direction = nearestInteractDirection(this);
            if (direction && direction !== this.direction()) {
                // 照準による向き固定を一瞬だけ外して向きを変え、元の固定状態へ戻す。
                const fixed = this._directionFix;
                this._directionFix = false;
                this.setDirection(direction);
                this._directionFix = fixed;
            }
        }
        return _Game_Player_triggerButtonAction.call(this);
    };
})();
