/*:
 * @target MZ
 * @base ProjectR_PlayerDeath
 * @orderAfter ProjectR_PlayerDeath
 * @plugindesc v1.0.0 死亡中のプレイヤー移動と基本攻撃を禁止します。
 * @author ProjectR
 *
 * @param AttackCommonEventId
 * @text 基本攻撃コモンイベント
 * @type common_event
 * @default 1
 *
 * @help
 * ProjectR_PlayerDeathControl.js
 *
 * マップ上でプレイヤーが死亡している間、移動、通常の
 * 決定キー操作、新しい基本攻撃の開始を禁止します。
 *
 * 基本攻撃は、プラグインパラメータで指定したコモンイベントが
 * 予約されるのを死亡中だけ抑止します。
 * 通常戦闘中の処理には影響しません。
 *
 * 操作禁止状態は次のAPIで確認できます。
 *
 *   ProjectR.PlayerDeathControl.isLocked()
 *
 * ProjectR_PlayerDeathを、このプラグインより上で
 * 有効にしてください。
 *
 * このプラグインは、死亡演出、メニュー禁止、
 * ゲームオーバー表示、再挑戦・復活処理を行いません。
 */

(() => {
    "use strict";

    const pluginName = "ProjectR_PlayerDeathControl";
    const parameters = PluginManager.parameters(pluginName);
    const parsedAttackCommonEventId = Number(parameters.AttackCommonEventId);
    const attackCommonEventId = Number.isInteger(parsedAttackCommonEventId) &&
        parsedAttackCommonEventId > 0 ? parsedAttackCommonEventId : 1;

    const projectR = window.ProjectR = window.ProjectR || {};
    const PlayerDeath = projectR.PlayerDeath;

    if (!PlayerDeath || typeof PlayerDeath.isDead !== "function") {
        throw new Error(
            "ProjectR_PlayerDeathControlにはProjectR_PlayerDeathが必要です。"
        );
    }

    projectR.PlayerDeathControl = projectR.PlayerDeathControl || {};

    const PlayerDeathControl = projectR.PlayerDeathControl;

    const isMapPlayerDead = () => {
        if (typeof $gameParty === "undefined" || !$gameParty ||
            $gameParty.inBattle()) {
            return false;
        }
        return PlayerDeath.isDead();
    };

    PlayerDeathControl.isLocked = function() {
        return isMapPlayerDead();
    };

    const _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (PlayerDeathControl.isLocked()) {
            return false;
        }
        return _Game_Player_canMove.call(this);
    };

    const _Game_Temp_reserveCommonEvent =
        Game_Temp.prototype.reserveCommonEvent;
    Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
        if (PlayerDeathControl.isLocked() &&
            Number(commonEventId) === attackCommonEventId) {
            return;
        }
        _Game_Temp_reserveCommonEvent.call(this, commonEventId);
    };
})();
