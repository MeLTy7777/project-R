/*:
 * @target MZ
 * @plugindesc v1.0.0 プレイヤーの死亡状態を検知・保持します。
 * @author ProjectR
 *
 * @help
 * ProjectR_PlayerDeath.js
 *
 * マップ上のプレイヤーであるパーティリーダーのHPを監視し、
 * HPが0以下、または標準の戦闘不能ステートになったときに、
 * ProjectR用の死亡状態を$gameSystemへ同期します。
 *
 * 死亡状態は次のどちらかで確認できます。
 *
 *   $gameSystem.isProjectRPlayerDead()
 *   ProjectR.PlayerDeath.isDead()
 *
 * マップ上では、死亡を検知してもRPGツクールMZ標準の
 * ゲームオーバー画面へ自動遷移しません。
 * 通常戦闘中のゲームオーバー判定は変更しません。
 *
 * このプラグインは、移動・攻撃の禁止、死亡演出、
 * ゲームオーバー表示、再挑戦・復活処理を行いません。
 */

(() => {
    "use strict";

    const projectR = window.ProjectR = window.ProjectR || {};
    projectR.PlayerDeath = projectR.PlayerDeath || {};

    const PlayerDeath = projectR.PlayerDeath;

    const currentLeader = () => {
        if (typeof $gameParty === "undefined" || !$gameParty) {
            return null;
        }
        return $gameParty.leader();
    };

    const calculateDeathState = () => {
        const leader = currentLeader();
        return !!leader && (leader.hp <= 0 || leader.isDead());
    };

    const syncDeathState = () => {
        const dead = calculateDeathState();
        if (typeof $gameSystem !== "undefined" && $gameSystem) {
            $gameSystem.setProjectRPlayerDead(dead);
        }
        return dead;
    };

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._projectRPlayerDead = false;
    };

    Game_System.prototype.isProjectRPlayerDead = function() {
        return !!this._projectRPlayerDead;
    };

    Game_System.prototype.setProjectRPlayerDead = function(dead) {
        this._projectRPlayerDead = !!dead;
    };

    PlayerDeath.isDead = function() {
        return calculateDeathState();
    };

    PlayerDeath.sync = function() {
        return syncDeathState();
    };

    const _Game_Battler_refresh = Game_Battler.prototype.refresh;
    Game_Battler.prototype.refresh = function() {
        _Game_Battler_refresh.call(this);
        if (this === currentLeader()) {
            syncDeathState();
        }
    };

    const _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        _Game_Player_update.call(this, sceneActive);
        syncDeathState();
    };

    const _Game_Party_isAllDead = Game_Party.prototype.isAllDead;
    Game_Party.prototype.isAllDead = function() {
        if (!this.inBattle() && PlayerDeath.isDead()) {
            return false;
        }
        return _Game_Party_isAllDead.call(this);
    };
})();
