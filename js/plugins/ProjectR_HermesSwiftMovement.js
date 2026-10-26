/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 2C-3 Hermes「高速移動」の公式Teleport接続。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base Hendrix_Action_Engine
 * @base ProjectR_HermesRecognitionObscure
 * @orderAfter ProjectR_HermesRecognitionObscure
 * @help
 * hermes_swift_movement専用。instantの他カードは既存handlerへ委譲します。
 * 発動時のマウス位置をmap座標へ変換し、実座標から最大3tileに制限。
 * 導入版1.6.6bにはteleportTo('mouse or gamepad', distance)の分岐が
 * ないため、実装済みのteleportTo(x, y)をPlayerから同期呼出します。
 * 小数のDotMove座標を考慮し、制限位置に近い3tile以内の整数座標を渡します。
 * 通行判定/補正は公式findNearestValidPositionのみ。補正先が3tile超なら失敗。
 * 戻り値ではなく移動前後の実座標で成功確認。例外/不正結果は元の位置へ戻します。
 * 成功時のみ既存transactionが消費・6秒Cooldown・即時ドローを行います。
 * 無敵/攻撃/State/VFX/敵移動は行いません。効果や時間の保存項目も追加しません。
 * 後続の召喚/VFXはactivateからmovePlayerに至る前へ追加できます。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const previousInstant = root.ProjectRHermesRecognitionObscure.activate;
    const CARD = "hermes_swift_movement";
    const MAX_DISTANCE = 3;
    const EPSILON = 1e-8;
    const failure = reason => ({ ok: false, reason });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);

    // 距離制限と整数化のみ。通行/壁/経路の判定は行わない。
    const limitedTarget = (start, cursor) => {
        const length = distance(start, cursor);
        const scale = length > MAX_DISTANCE ? MAX_DISTANCE / length : 1;
        const x = start.x + (cursor.x - start.x) * scale;
        const y = start.y + (cursor.y - start.y) * scale;
        return [Math.floor(x), Math.ceil(x)].flatMap(tx =>
            [Math.floor(y), Math.ceil(y)].map(ty => ({ x: tx, y: ty }))
        ).filter(point => distance(start, point) <= MAX_DISTANCE + EPSILON)
            .sort((a, b) => distance(a, { x, y }) - distance(b, { x, y }))[0];
    };

    const movePlayer = (player, target, start) => {
        // 公式の補正先を事前確認。遠方への補正で3tile制限を超えないようにする。
        const destination = player.findNearestValidPosition(target.x, target.y);
        if (!finitePoint(destination) || distance(start, destination) > MAX_DISTANCE + EPSILON) {
            return failure("noDestinationWithinRange");
        }
        try {
            player.teleportTo(destination.x, destination.y);
            const end = { x: player._realX, y: player._realY };
            if (!finitePoint(end) || distance(start, end) > MAX_DISTANCE + EPSILON) {
                throw Error("invalidMovementResult");
            }
            if (distance(start, end) <= EPSILON) return failure("playerDidNotMove");
            // DotMoveの以前の連続移動先/クリック移動先を成功後だけ解除。
            player.cancelMove?.();
            if (typeof $gameTemp !== "undefined") $gameTemp?.clearDestination?.();
            return { ok: true };
        } catch (error) {
            player.setPosition(start.x, start.y);
            return failure(String(error?.message || error));
        }
    };

    const activate = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!deck.isCardBattleActive() || !player || !map ||
                typeof TouchInput === "undefined" ||
                !["teleportTo", "findNearestValidPosition", "setPosition", "canMove"].every(
                    name => typeof player[name] === "function") ||
                typeof map.canvasToMapX !== "function" || typeof map.canvasToMapY !== "function") {
            return failure("movementUnavailable");
        }
        if (!player.canMove() || player.isInVehicle?.()) return failure("playerMovementLocked");
        const start = { x: player._realX, y: player._realY };
        // 引数評価時に固定。クリックは不要。Gamepad接続有無にも影響されない。
        const mouse = { x: TouchInput.x, y: TouchInput.y };
        if (!finitePoint(start) || !finitePoint(mouse)) return failure("invalidMousePosition");
        const cursor = { x: map.canvasToMapX(mouse.x), y: map.canvasToMapY(mouse.y) };
        if (!finitePoint(cursor)) return failure("invalidMousePosition");
        const target = limitedTarget(start, cursor);
        return target ? movePlayer(player, target, start) : failure("noDestinationWithinRange");
    };

    deck.registerActivationHandler("instant", context =>
        context.definition.cardId === CARD ? activate() : previousInstant(context));
})();
