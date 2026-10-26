/*:
 * @target MZ
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatPresence
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter ProjectR_CombatPresence
 * @plugindesc v1.1.0 明示的な戦闘イベント中だけ照準方向へ向け、戦闘外は通常の移動向きに戻します。
 * @author ProjectR
 *
 * @help
 * ProjectR_PlayerFacing.js
 *
 * 向きの基準:
 *   ProjectRCombatPresence.isCombatEventActive()（beginCombatEventで始めた明示的な戦闘イベント）
 *   が真の間だけ、プレイヤーは毎フレーム公式のturnToward('mouse or gamepad', true)で
 *   マウス/ゲームパッドの照準方向を向きます。
 *
 * 戦闘外:
 *   通常のDotMove/MZの移動で向きが変わります（上下左右の移動 = その向き）。
 *   マウスを向き続けません。攻撃共通イベントや戦闘中の照準が付けたDirection Fixは、
 *   戦闘イベント終了後、または移動入力があった時点で解放します
 *   （マップイベントが意図して付けたDirection Fixには触れません）。
 *
 * 戦闘外のturnToward('mouse or gamepad')は従来どおり(敵が画面内にいない限り)抑止します。
 * マウスカーソル、クリック入力、武器Spriteの回転処理は変更しません。
 *
 * 戦闘中の「調べる」(決定キー=F。導入設定ではOkキー=F):
 *   起動は常に標準の判定(DotMoveの正面判定・トリガー・優先度)だけで行い、イベントを直接start()しません。
 *   ①まず現在の向き(照準)で標準処理。②外れたときだけ、すぐ隣(約1.5タイル以内)の決定ボタンの
 *   イベントがある向きへ一瞬向けて標準処理をやり直します(起動しなければ元の向きへ戻す)。
 *   向きの候補にするのは、敵・弾・透明・決定ボタン以外・プレイヤーと同じ優先度以外・空のイベントを除いたものだけ。
 *   会話中・イベント実行中は動きません。終了後は照準の向きに戻ります。カード用Q/E/X/C/VやUltimateキーとは無関係です。
 *
 * ProjectRPlayerFacing.getDiagnostics(): 直近のF押下の判定(canMove/イベント実行中/起動結果/起動したイベントID)と
 *   向き解放の履歴。Arenaの状態端末が表示します。
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

    // ---- 戦闘イベント(明示)中の向きと、戦闘外の向きの解放 ----
    // 戦闘イベント中: 毎フレーム公式のturnToward('mouse or gamepad', true)で照準方向へ向ける。
    // 戦闘外: 通常のDotMove/MZの移動で向きが変わる。攻撃共通イベントが付けたDirection Fixや
    //   戦闘イベント中に付けたDirection Fixは、戦闘イベント終了後 / 移動入力時に解放する
    //   (マップイベントが意図して付けたDirection Fixには触れない=自分が付けたと分かる場合だけ)。
    const combatPresenceApi = () => window.ProjectRCombatPresence || null;
    const isCombatEvent = () => combatPresenceApi()?.isCombatEventActive?.() === true;
    const attackCommonEventId = Number(combatPresenceApi()?.settings?.attackCommonEventId) || 1;

    let ownedFix = false;        // この Plugin / 攻撃共通イベントがDirection Fixを付けた
    let attackSeen = false;      // 攻撃共通イベントが予約された(Direction Fix ONを含む)
    let releasePending = false;  // 戦闘イベントが終わり、解放待ち
    let wasCombatEvent = false;
    const diagnostics = {
        aimFrames: 0, releasedFix: 0, lastRelease: null,
        lastOk: null, interactAssist: 0
    };

    const isFree = (player, sceneActive) => sceneActive !== false &&
        !$gameMap.isEventRunning() && !player.isMoveRouteForcing() &&
        !(typeof $gameMessage !== "undefined" && $gameMessage.isBusy());

    const walkingInput = () => {
        try {
            return Number(Input.dir4) !== 0 || Number(Input.dir8) !== 0;
        } catch (error) {
            return false;
        }
    };

    const releaseFix = (player, why) => {
        player.setDirectionFix(false);
        ownedFix = false;
        attackSeen = false;
        releasePending = false;
        diagnostics.releasedFix++;
        diagnostics.lastRelease = why;
    };

    const _Game_Temp_reserveCommonEvent = Game_Temp.prototype.reserveCommonEvent;
    Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
        if (Number(commonEventId) === attackCommonEventId) attackSeen = true;
        return _Game_Temp_reserveCommonEvent.apply(this, arguments);
    };

    const observeOk = player => {
        if (!Input.isTriggered("ok")) return;
        diagnostics.lastOk = {
            frame: currentFrame(), combatEvent: isCombatEvent(),
            canMove: !!player.canMove(), isMoving: !!player.isMoving(),
            eventRunning: !!$gameMap.isEventRunning(), messageBusy: !!$gameMessage.isBusy(),
            moveRouteForcing: !!player.isMoveRouteForcing(), outcome: "pressed"
        };
    };

    const updateFacing = (player, sceneActive) => {
        const combat = isCombatEvent();
        if (combat && !wasCombatEvent) releasePending = false;
        if (!combat && wasCombatEvent) releasePending = true;
        wasCombatEvent = combat;
        observeOk(player);
        const free = isFree(player, sceneActive);
        if (combat) {
            if (!free) return;
            player.turnToward(mouseAimTarget, true);
            ownedFix = true;
            diagnostics.aimFrames++;
            return;
        }
        if (!ownedFix && !(attackSeen && player.isDirectionFixed())) {
            attackSeen = false;
            return;
        }
        if (!player.isDirectionFixed()) {
            ownedFix = false;
            attackSeen = false;
            releasePending = false;
            return;
        }
        ownedFix = true;
        if (free && (releasePending || walkingInput())) {
            releaseFix(player, releasePending ? "combatEventEnded" : "walkingInput");
        }
    };

    const _Game_Player_update = Game_Player.prototype.update;
    Game_Player.prototype.update = function(sceneActive) {
        try {
            updateFacing(this, sceneActive);
        } catch (error) {
            console.error("ProjectR_PlayerFacing:", error);
        }
        return _Game_Player_update.apply(this, arguments);
    };

    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        _Game_Player_performTransfer.apply(this, arguments);
        if (ownedFix && !isCombatEvent() && this.isDirectionFixed()) releaseFix(this, "transfer");
    };

    // ---- 戦闘中の「調べる」(決定キー) ----
    // 戦闘中は照準方向に向きが固定されるため、通常の「正面判定」だけだとマウスの向き次第で
    // 端末・看板・扉に届かない。①決定キー押下の瞬間に隣の「決定ボタン」イベントの方向へ向け、
    // ②それでも標準処理が何も起動しなければ、同じ条件のイベントを標準の start() で起動する。
    // 戦闘外では何もしない(標準の動作のまま)。
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

    // 隣接する「調べられる」イベントを近い順に返す(向きの候補を作るだけ。起動の可否は標準処理が決める)。
    const interactCandidates = player => {
        const events = typeof $gameMap !== "undefined" && $gameMap ? $gameMap.events() : [];
        const found = [];
        for (const event of events) {
            if (!isInteractableEvent(event)) continue;
            const direction = directionToward(player, event);
            if (!direction) continue;
            found.push({ event, direction, distance: Math.hypot(event._realX - player._realX, event._realY - player._realY) });
        }
        return found.sort((a, b) => a.distance - b.distance);
    };

    // 照準による向き固定を一瞬だけ外して向きを変え、元の固定状態へ戻す。
    const turnPlayer = (player, direction) => {
        const fixed = player._directionFix;
        player._directionFix = false;
        player.setDirection(direction);
        player._directionFix = fixed;
    };

    // 戦闘中の「調べる」も標準の判定(DotMoveの正面判定・トリガー・優先度)だけで起動する。
    // イベントをstart()で直接起動しない。照準の向きで標準判定が外れたときだけ、隣の対象がある向きへ
    // 向けて標準判定をやり直す(起動しなければ元の向きへ戻す)。戦闘外は標準のまま。
    const _Game_Player_triggerButtonAction = Game_Player.prototype.triggerButtonAction;
    Game_Player.prototype.triggerButtonAction = function() {
        const pressed = Input.isTriggered("ok");
        const assist = pressed && isCombatActive() && this.canMove();
        let started = _Game_Player_triggerButtonAction.call(this);
        let outcome = started ? "engine" : "none";
        let candidate = null;
        if (!started && assist) {
            const tried = new Set([this.direction()]);
            for (const target of interactCandidates(this)) {
                candidate = candidate ?? target.event.eventId();
                if (tried.has(target.direction)) continue;
                tried.add(target.direction);
                const original = this.direction();
                turnPlayer(this, target.direction);
                if (_Game_Player_triggerButtonAction.call(this)) {
                    started = true;
                    outcome = "engineAligned:" + target.event.eventId();
                    candidate = target.event.eventId();
                    diagnostics.interactAssist++;
                    break;
                }
                turnPlayer(this, original);
            }
        }
        if (pressed && diagnostics.lastOk) {
            diagnostics.lastOk = { ...diagnostics.lastOk, candidate, outcome,
                startedEventId: started ? Number($gameMap._interpreter?.eventId?.()) || null : null };
        }
        return started;
    };

    window.ProjectRPlayerFacing = {
        getDiagnostics: () => JSON.parse(JSON.stringify({
            ...diagnostics, ownedFix, attackSeen, releasePending,
            combatEvent: isCombatEvent(), directionFixed: !!$gamePlayer?.isDirectionFixed?.()
        }))
    };
})();
