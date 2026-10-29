/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR カード対象指定の共通層: Cursor(マウスに追従する範囲)の座標変換と円の判定。状態を持たない。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardDeckCore
 *
 * @help
 * ProjectR_CardTargeting.js
 *
 * 【Cursor と Ground の違い】
 *   Ground : 発動の瞬間のマウス位置を1回だけ読み、固定の場所として使う(絶)。
 *   Cursor : 効果が続く間、毎フレーム「今のマウス位置」を読み直して範囲の中心にする(ヴェイル)。発動は1回で、
 *            マウスが動いてもカードの再消費・Cooldown・効果時間は変わらない。
 *   Direction / Ground / Buff(instant) / Ally の意味は変えません。CardDeckCore の targetType に "cursor" を足しただけです。
 *
 * 【Coreの変更なし】 CardDeckCore(保護対象)の TARGET_TYPES は変えません。"cursor" の handler は、このPluginが
 *   ProjectRCardDeck.registerActivationHandler("cursor", fn) / getActivationHandler("cursor") を受け持ち、発動ルーター
 *   (CardActivationRouter)が "cursor" のカードを受け取ったときだけ、その handler を渡します。他の対象タイプの登録・発動は一切変えません。
 *   Cursor以外の未知の対象タイプは、従来どおり unsupportedTargetType で安全に拒否されます。
 *
 * 【座標】 マウス = TouchInput.x / y (Graphics上の画面ピクセル)。マップ座標(タイル単位・連続値)へは
 *   x = $gameMap.displayX() + 画面x / tileWidth, y = $gameMap.displayY() + 画面y / tileHeight で変換する(画面スクロール・
 *   表示オフセット・タイルサイズに追従。ループマップの距離は $gameMap.deltaX / deltaY で最短を取る)。
 *   タイルiは [i, i+1) の範囲で、キャラクターの中心は centerPositionPoint()(DotMoveの当たり判定の中心)と同じ座標系。
 *
 * 【マウスが画面外・無効なとき】 TouchInput は画面内でだけ更新されるので、ウィンドウの外へ出ると最後の位置が残る。
 *   その位置が画面の外にある・数値でないときは「無効」(pointer().ok=false)。範囲の追従は最後の有効な位置を保つ。
 *   発動時に無効なら、そのカードは非消費で失敗する(ヴェイルの「射程: 画面内ならどこでも」)。
 *
 * API: ProjectRCardTargeting
 *   pointer()                        { ok, reason?, screen:{x,y}, world:{x,y} }(世界座標は有効なときだけ)
 *   screenToWorld(x, y)              タイル単位の連続座標
 *   characterCenter(character)       キャラクターの当たり判定の中心(タイル単位)
 *   distance(a, b)                   2点の距離(ループマップは最短)
 *   circleContains(center, radius, character)   中心が円の中(境界を含む)にあるか
 *   setPointerOverride(fn | null)    テスト用: fn() が { x, y } (画面ピクセル)を返す
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    let override = null;

    const finite = value => typeof value === "number" && Number.isFinite(value);
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

    const screenToWorld = (screenX, screenY) => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!map || !finite(screenX) || !finite(screenY)) return null;
        const tw = map.tileWidth(), th = map.tileHeight();
        if (!(tw > 0) || !(th > 0)) return null;
        return { x: map.displayX() + screenX / tw, y: map.displayY() + screenY / th };
    };

    const rawPointer = () => {
        if (typeof override === "function") return override();
        return typeof TouchInput !== "undefined" ? { x: TouchInput.x, y: TouchInput.y } : null;
    };

    const pointer = () => {
        const raw = rawPointer();
        if (!raw || !finite(raw.x) || !finite(raw.y)) return fail("invalidPointer");
        const width = typeof Graphics !== "undefined" ? Graphics.width : NaN, height = typeof Graphics !== "undefined" ? Graphics.height : NaN;
        const screen = { x: raw.x, y: raw.y };
        if (!finite(width) || !finite(height)) return fail("graphicsUnavailable", { screen });
        if (raw.x < 0 || raw.y < 0 || raw.x > width || raw.y > height) return fail("pointerOffScreen", { screen });
        const world = screenToWorld(raw.x, raw.y);
        return world ? { ok: true, screen, world } : fail("mapUnavailable", { screen });
    };

    const characterCenter = character => {
        if (!character) return null;
        if (typeof character.centerPositionPoint === "function") {
            const point = character.centerPositionPoint();
            if (point && finite(point.x) && finite(point.y)) return { x: point.x, y: point.y };
        }
        return finite(character._realX) && finite(character._realY) ? { x: character._realX + 0.5, y: character._realY + 0.5 } : null;
    };

    const delta = (a, b) => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        return { x: map && typeof map.deltaX === "function" ? map.deltaX(a.x, b.x) : a.x - b.x, y: map && typeof map.deltaY === "function" ? map.deltaY(a.y, b.y) : a.y - b.y };
    };
    const distance = (a, b) => { const d = delta(a, b); return Math.hypot(d.x, d.y); };
    const circleContains = (center, radius, character) => {
        const point = characterCenter(character);
        return !!center && !!point && finite(radius) && distance(center, point) <= radius + 1e-9;
    };

    // ---------- "cursor" の発動handler(Coreを変えずに追加) ----------
    const deck = root.ProjectRCardDeck;
    let cursorHandler = null;
    if (deck && typeof deck.registerActivationHandler === "function" && typeof deck.getActivationHandler === "function" && !deck.registerActivationHandler.__projectRCardTargeting) {
        const registerOriginal = deck.registerActivationHandler, getOriginal = deck.getActivationHandler;
        const register = function(targetType, handler) {
            if (targetType !== "cursor") return registerOriginal.apply(this, arguments);
            if (typeof handler !== "function") return false;
            cursorHandler = handler;
            return true;
        };
        register.__projectRCardTargeting = true;
        deck.registerActivationHandler = register;
        deck.getActivationHandler = function(targetType) { return targetType === "cursor" ? cursorHandler : getOriginal.apply(this, arguments); };
        const Router = deck.CardActivationRouter;
        if (Router && Router.prototype && typeof Router.prototype.requestUseCard === "function") {
            const requestOriginal = Router.prototype.requestUseCard;
            Router.prototype.requestUseCard = function() {
                // 発動ルーターは未知の対象種別を拒否する。cursorのhandlerがあるときだけ、そのルーターへ渡す(他の種別のhandlerは触らない)。
                if (cursorHandler && this.handlers instanceof Map && this.handlers.get("cursor") !== cursorHandler) this.handlers.set("cursor", cursorHandler);
                return requestOriginal.apply(this, arguments);
            };
        }
    }

    root.ProjectRCardTargeting = Object.freeze({
        TARGET_TYPE: "cursor",
        pointer, screenToWorld, characterCenter, distance, circleContains,
        setPointerOverride: fn => { override = typeof fn === "function" ? fn : null; }
    });
})();
