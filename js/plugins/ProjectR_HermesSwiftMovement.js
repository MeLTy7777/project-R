/*:
 * @target MZ
 * @plugindesc v1.1.0 Phase 2C-3 Hermes「高速移動」の経路Collision接続。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base ProjectR_HermesRecognitionObscure
 * @orderAfter ProjectR_HermesRecognitionObscure
 * @help
 * hermes_swift_movement専用。instantの他カードは既存handlerへ委譲します。
 * 発動時のマウス方向を固定し、最大3tileを同期移動します。
 * DotMoveのmover().createCollisionChecker()で短いstepごとに
 * tile/Eventの通行を確認し、最初の衝突の手前で停止します。
 * 斜めは両軸と終点を確認。壁沿いのslide/別着地点の探索はしません。
 * teleportTo/findNearestValidPositionは使用しません。
 * 戻り値ではなく移動前後の実座標で成功確認。例外/不正結果は元の位置へ戻します。
 * 成功時のみ既存transactionが消費・6秒Cooldown・即時ドローを行います。
 * 無敵/攻撃/State/VFX/敵移動は行いません。効果や時間の保存項目も追加しません。
 * Phase 3B: 移動前にProjectRGodSummonManagerでHermes一時召喚を作り、成功した場合だけ
 * 従来のmovePlayerを実行します。実際に移動するのはPlayerのみで、召喚は移動しません。
 * Managerが無い/生成失敗なら移動せず非消費です。
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const previousInstant = root.ProjectRHermesRecognitionObscure.activate;
    const CARD = "hermes_swift_movement";
    const MAX_DISTANCE = 3;
    // DotMoveの矩形判定誤差(1/65536tile)による微小変位は移動成功にしない。
    const EPSILON = 1e-4;
    const STEP = 1 / 16;
    const failure = reason => ({ ok: false, reason });
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);

    const movePlayer = (player, map, start, vector) => {
        try {
            const mover = player.mover();
            if (typeof mover?.createCollisionChecker !== "function") return failure("movementUnavailable");
            const width = player.width(), height = player.height();
            if (![width, height].every(n => Number.isFinite(n) && n > EPSILON)) {
                return failure("invalidCollisionSize");
            }
            const length = Math.hypot(vector.x, vector.y);
            if (length <= EPSILON) return failure("playerDidNotMove");
            const limit = Math.min(MAX_DISTANCE, length);
            const ux = vector.x / length, uy = vector.y / length;
            // Player矩形より小さいstep。方向/距離はこの発動内で固定。
            const step = Math.min(STEP, width / 2, height / 2);
            let travelled = 0;
            while (limit - travelled > EPSILON) {
                const from = { x: player._realX, y: player._realY };
                const checker = mover.createCollisionChecker({ overComplementMode: true });
                const canStep = amount => {
                    const to = { x: start.x + ux * (travelled + amount), y: start.y + uy * (travelled + amount) };
                    // Region許可/ループ設定でもマップ端は越えない。
                    if (to.x < 0 || to.y < 0 || to.x + width > map.width() || to.y + height > map.height()) return false;
                    // 通常DotMoveの正式なtile/Event判定。斜めの角抜けも保守的に止める。
                    if (ux !== 0 && (checker.checkCollision(to.x, from.y, ux > 0 ? 6 : 4).length ||
                            checker.checkCollision(to.x, to.y, ux > 0 ? 6 : 4).length)) return false;
                    if (uy !== 0 && (checker.checkCollision(from.x, to.y, uy > 0 ? 2 : 8).length ||
                            checker.checkCollision(to.x, to.y, uy > 0 ? 2 : 8).length)) return false;
                    return true;
                };
                let amount = Math.min(step, limit - travelled);
                const blocked = !canStep(amount);
                if (blocked) {
                    // 最初の障害物までの残りだけを詰める。壁の先は探索しない。
                    let low = 0, high = amount;
                    while (high - low > EPSILON) {
                        const mid = (low + high) / 2;
                        if (canStep(mid)) low = mid; else high = mid;
                    }
                    amount = low;
                }
                if (amount <= EPSILON) break;
                travelled += amount;
                player.setPosition(start.x + ux * travelled, start.y + uy * travelled);
                if (!finitePoint({ x: player._realX, y: player._realY }) ||
                        Math.hypot(player._realX - (start.x + ux * travelled),
                            player._realY - (start.y + uy * travelled)) > EPSILON) {
                    throw Error("invalidMovementResult");
                }
                if (blocked) break;
            }
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

    const activate = context => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!deck.isCardBattleActive() || !player || !map ||
                typeof TouchInput === "undefined" ||
                !["mover", "width", "height", "screenX", "screenY", "setPosition", "canMove"].every(
                    name => typeof player[name] === "function") ||
                !["width", "height", "tileWidth", "tileHeight"].every(name => typeof map[name] === "function")) {
            return failure("movementUnavailable");
        }
        if (!player.canMove() || player.isInVehicle?.()) return failure("playerMovementLocked");
        // すり抜け中は判定を迂回できるので発動しない。フラグ自体は変更しない。
        if (player.isThrough?.() || player.isDebugThrough?.()) return failure("playerThrough");
        const start = { x: player._realX, y: player._realY };
        // 引数評価時に固定。クリックは不要。Gamepad接続有無にも影響されない。
        const mouse = { x: TouchInput.x, y: TouchInput.y };
        if (!finitePoint(start) || !finitePoint(mouse)) return failure("invalidMousePosition");
        // 導入版rotateToのmouse分岐と同じscreenX/Y基準。gamepad分岐は使わない。
        const vector = { x: (mouse.x - player.screenX()) / map.tileWidth(),
            y: (mouse.y - player.screenY()) / map.tileHeight() };
        if (!finitePoint(vector)) return failure("invalidMousePosition");
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        // Hermes一時召喚 → Hermesが高速移動を付与。Playerだけが実際に移動する。
        return summons.perform({ definition: context?.definition }, () => movePlayer(player, map, start, vector));
    };

    deck.registerActivationHandler("instant", context =>
        context.definition.cardId === CARD ? activate(context) : previousInstant(context));
})();
