/*:
 * @target MZ
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter ProjectR_PlayerDeathControl
 * @orderBefore ProjectR_BattleHUD
 * @plugindesc v1.0.0 画面内の生存敵に応じてProjectRの戦闘状態を切り替えます。
 * @author ProjectR
 *
 * @param AttackCommonEventId
 * @text 基本攻撃コモンイベント
 * @desc 射撃と近接攻撃を開始する共通イベントです。非戦闘中は予約を抑止します。
 * @type common_event
 * @default 1
 *
 * @param ScanIntervalFrames
 * @text 敵確認間隔（フレーム）
 * @desc 画面内の生存敵を再確認する間隔です。3なら60fps時に約0.05秒です。
 * @type number
 * @min 1
 * @default 3
 *
 * @param EndGraceFrames
 * @text 戦闘終了猶予（フレーム）
 * @desc 最後の画面内敵がいなくなってから非戦闘へ戻るまでの猶予です。24なら60fps時に約0.4秒です。
 * @type number
 * @min 0
 * @default 24
 *
 * @help
 * ProjectR_CombatPresence.js
 *
 * Hendrix Action EngineがGame_Eventへ設定したdatabaseEnemyと現在HPを
 * 使用し、画面内に生存中の敵がいる間だけ戦闘状態にします。
 * 戦闘状態は一時データで、セーブデータには保存しません。
 *
 * 公開API:
 *   ProjectRCombatPresence.isCombatActive()
 *   ProjectRCombatPresence.refresh()
 *   ProjectRCombatPresence.canUseWeapon()
 *   ProjectRCombatPresence.setBattleSummon(target)
 *   ProjectRCombatPresence.clearBattleSummon()
 *
 * setBattleSummon(target)には、次のいずれかを渡せます。
 *   - setCombatVisible(boolean)を持つ管理オブジェクト
 *   - visibleを持つSpriteなどの表示オブジェクト
 *   - setTransparent(boolean)を持つGame_Character
 *
 * このプラグインは召喚キャラクター、AI、HP、攻撃処理そのものは
 * 作成しません。確定した召喚システムから上記APIへ接続してください。
 */

(() => {
    "use strict";

    const pluginName = "ProjectR_CombatPresence";
    const parameters = PluginManager.parameters(pluginName);

    const positiveInteger = (value, fallback, minimum) => {
        const number = Number(value);
        return Number.isInteger(number) && number >= minimum ? number : fallback;
    };

    const attackCommonEventId = positiveInteger(
        parameters.AttackCommonEventId,
        1,
        1
    );
    const scanIntervalFrames = positiveInteger(
        parameters.ScanIntervalFrames,
        3,
        1
    );
    const endGraceFrames = positiveInteger(
        parameters.EndGraceFrames,
        24,
        0
    );

    const projectR = window.ProjectR = window.ProjectR || {};
    const CombatPresence = window.ProjectRCombatPresence =
        window.ProjectRCombatPresence || {};
    projectR.CombatPresence = CombatPresence;

    let combatActive = false;
    let lastEnemySeenFrame = null;
    let lastScanFrame = -Infinity;
    let battleSummonTarget = null;

    const currentFrame = () => {
        if (typeof Graphics === "undefined") return 0;
        const frame = Number(Graphics.frameCount);
        return Number.isFinite(frame) ? frame : 0;
    };

    const isCurrentSceneMap = () => {
        return typeof Scene_Map !== "undefined" &&
            typeof SceneManager !== "undefined" &&
            SceneManager._scene instanceof Scene_Map;
    };

    const currentSpriteset = () => {
        return isCurrentSceneMap() ? SceneManager._scene._spriteset : null;
    };

    const hideNormalFollowers = () => {
        if (typeof $gamePlayer === "undefined" || !$gamePlayer ||
            typeof $gamePlayer.followers !== "function") {
            return;
        }
        const followers = $gamePlayer.followers();
        if (followers && typeof followers.hide === "function") {
            followers.hide();
            if (typeof followers.refresh === "function") followers.refresh();
        }
    };

    const finiteOr = (value, fallback) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };

    const eventScreenBounds = (event, sprite = null) => {
        if (!event || typeof event.screenX !== "function" ||
            typeof event.screenY !== "function") {
            return null;
        }

        const tileWidth = typeof $gameMap?.tileWidth === "function" ?
            $gameMap.tileWidth() : 48;
        const tileHeight = typeof $gameMap?.tileHeight === "function" ?
            $gameMap.tileHeight() : 48;
        if (sprite && typeof sprite.isEmptyCharacter === "function" &&
            sprite.isEmptyCharacter()) {
            return null;
        }

        const x = sprite ? finiteOr(sprite.x, event.screenX()) : event.screenX();
        const y = sprite ? finiteOr(sprite.y, event.screenY()) : event.screenY();
        const spriteWidth = sprite ? Math.abs(finiteOr(sprite.width, 0)) : 0;
        const spriteHeight = sprite ? Math.abs(finiteOr(sprite.height, 0)) : 0;
        const width = spriteWidth > 0 ? spriteWidth : tileWidth;
        const height = spriteHeight > 0 ? spriteHeight : tileHeight;
        const anchorX = sprite ? finiteOr(sprite.anchor?.x, 0.5) : 0.5;
        const anchorY = sprite ? finiteOr(sprite.anchor?.y, 1) : 1;

        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            !Number.isFinite(width) || !Number.isFinite(height)) {
            return null;
        }

        return {
            left: x - width * anchorX,
            top: y - height * anchorY,
            right: x + width * (1 - anchorX),
            bottom: y + height * (1 - anchorY)
        };
    };

    const boundsTouchScreen = bounds => {
        if (!bounds || typeof Graphics === "undefined") return false;
        const width = Number(Graphics.width);
        const height = Number(Graphics.height);
        if (!(width > 0) || !(height > 0)) return false;
        return bounds.right >= 0 && bounds.left <= width &&
            bounds.bottom >= 0 && bounds.top <= height;
    };

    const isLivingActionEnemy = event => {
        if (!event || event._erased || !event.databaseEnemy) return false;
        if (event._isMinionActor || event.databaseActor || event.linkedActorId) {
            return false;
        }
        if (typeof event.event !== "function" || !event.event()) return false;
        if (typeof event.isTransparent === "function" && event.isTransparent()) {
            return false;
        }
        if (event._eventId && $gameMap?._events?.[event._eventId] !== event) {
            return false;
        }
        if (typeof $gameMap?.getCurrentEventHp !== "function") return false;
        return Number($gameMap.getCurrentEventHp(event._eventId)) > 0;
    };

    const hasLivingEnemyOnScreen = () => {
        const sprites = currentSpriteset()?._characterSprites;
        if (Array.isArray(sprites)) {
            for (let index = 0; index < sprites.length; index++) {
                const sprite = sprites[index];
                const event = sprite?._character;
                if (isLivingActionEnemy(event) &&
                    boundsTouchScreen(eventScreenBounds(event, sprite))) {
                    return true;
                }
            }
            return false;
        }

        const events = typeof $gameMap !== "undefined" ? $gameMap?._events : null;
        if (!Array.isArray(events)) return false;
        for (let eventId = 1; eventId < events.length; eventId++) {
            const event = events[eventId];
            if (isLivingActionEnemy(event) &&
                boundsTouchScreen(eventScreenBounds(event))) {
                return true;
            }
        }
        return false;
    };

    const setTargetVisible = (target, visible) => {
        if (!target) return;
        if (typeof target.setCombatVisible === "function") {
            target.setCombatVisible(visible);
        } else if ("visible" in Object(target)) {
            target.visible = visible;
        } else if (typeof target.setTransparent === "function") {
            target.setTransparent(!visible);
        }
    };

    const applyBattleSummonVisibility = () => {
        setTargetVisible(battleSummonTarget, combatActive);
    };

    const setCombatActive = active => {
        const next = !!active;
        if (combatActive === next) return;
        combatActive = next;
        applyBattleSummonVisibility();
    };

    const refreshCombatState = initial => {
        if (!isCurrentSceneMap()) {
            setCombatActive(false);
            return false;
        }

        const frame = currentFrame();
        const enemyPresent = hasLivingEnemyOnScreen();
        if (enemyPresent) {
            lastEnemySeenFrame = frame;
            setCombatActive(true);
        } else if (initial) {
            lastEnemySeenFrame = null;
            setCombatActive(false);
        } else if (combatActive &&
            (lastEnemySeenFrame === null ||
                frame - lastEnemySeenFrame >= endGraceFrames)) {
            setCombatActive(false);
        }

        return combatActive;
    };

    const resetCombatState = () => {
        lastEnemySeenFrame = null;
        lastScanFrame = -Infinity;
        setCombatActive(false);
        applyBattleSummonVisibility();
    };

    CombatPresence.isCombatActive = function() {
        return combatActive;
    };

    CombatPresence.refresh = function() {
        return refreshCombatState(false);
    };

    CombatPresence.canUseWeapon = function() {
        return combatActive;
    };

    CombatPresence.setBattleSummon = function(target) {
        if (battleSummonTarget && battleSummonTarget !== target) {
            setTargetVisible(battleSummonTarget, false);
        }
        battleSummonTarget = target || null;
        applyBattleSummonVisibility();
        return battleSummonTarget;
    };

    CombatPresence.clearBattleSummon = function() {
        setTargetVisible(battleSummonTarget, false);
        battleSummonTarget = null;
    };

    CombatPresence.settings = Object.freeze({
        attackCommonEventId,
        scanIntervalFrames,
        endGraceFrames
    });

    const _Game_Followers_initialize = Game_Followers.prototype.initialize;
    Game_Followers.prototype.initialize = function() {
        _Game_Followers_initialize.call(this);
        this.hide();
    };

    const _Game_Followers_show = Game_Followers.prototype.show;
    Game_Followers.prototype.show = function() {
        _Game_Followers_show.call(this);
        this.hide();
        this.refresh();
    };

    const _Game_Temp_reserveCommonEvent = Game_Temp.prototype.reserveCommonEvent;
    Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
        if (Number(commonEventId) === attackCommonEventId && isCurrentSceneMap()) {
            if (!combatActive) refreshCombatState(false);
            if (!CombatPresence.canUseWeapon()) return;
        }
        _Game_Temp_reserveCommonEvent.call(this, commonEventId);
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function() {
        _Scene_Map_start.call(this);
        resetCombatState();
        hideNormalFollowers();
        refreshCombatState(true);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        const frame = currentFrame();
        if (frame - lastScanFrame < scanIntervalFrames) return;
        lastScanFrame = frame;
        refreshCombatState(false);
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        resetCombatState();
        _Scene_Map_terminate.call(this);
    };
})();
