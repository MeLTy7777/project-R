/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「絶」: マウス位置へ瞬間移動 + 直後の通常武器1ヒット強化(Lv1x1.5 / Lv2x2.0 / Lv3x3.0+速度x2.0)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base DotMoveSystem
 * @orderAfter ProjectR_HermesReedFluteSleep
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CutIn
 *
 * @help
 * ProjectR_HermesZetsu.js
 *
 * hermes_zetsu(絶)専用のground handler。Hermes / 強力 / 最大5枚 / 最大Lv3 / Cooldown 0.5秒
 * (定義はProjectR_CardCatalogが実行時に追加。旧7枚のCardDefinitionsは変更していません)。
 * 既存のgroundのhandler(葦笛)は変更せず、他のカードはそのまま渡します。
 *
 * 【瞬間移動】
 *   発動時のマウス位置(画面内に制限)へ、プレイヤーの足元が向かうよう直線で移動します。
 *   経路をたどり、障害物があればその直前の最も遠い安全な位置に着地します。
 *   ・通行不能な地形/通行不能なEvent … DotMoveの公式Collision(createCollisionChecker)で判定。
 *   ・Region 255(VisionWall) / <VisionWall> / <CombatWall> … ProjectR_CombatOcclusion の firstBlockerBetween で
 *     プレイヤー本体の矩形ごとスイープ(薄い壁のすり抜けなし)。独自の衝突系は作りません。
 *   ・マップ端はループ設定でも越えません。壁・Event・マップ外の内側には決して着地しません。
 *   安全に動ける地点が無い(最初から塞がれている/ほぼ動けない)ときは失敗します。失敗ではカード消費・
 *   Cooldown・補充・ダメージ強化・成功演出のどれも起こりません(移動も起きません)。
 *
 * 【ダメージ強化】成功した移動から0.8秒(戦闘時間)の間、最初に命中した通常の剣/銃の攻撃の最終ダメージを
 *   Lv1 x1.5 / Lv2 x2.0 / Lv3 x3.0 にします(レベルで「置換」。加算・乗算しない)。
 *   Lv3は加えて移動後1秒、実効移動速度x2.0。実体は ProjectR_CardModifiers が持ち、1ヒットで消費、
 *   外れでは消費せず、時間切れで消えます。カードの攻撃・Ultimate・継続ダメージは対象外。
 *   連続使用でも強化は1つだけ(置換)。戦闘終了・マップ移動・ロード・メニュー等で残りません。
 *
 * 【演出】成功が確定した後にだけ、(1)DEV3Hの両腕クロス(CharacterPresentation: CrossArms)、(2)Hermesの一時召喚表示
 *   (GodSummonVisual)、(3)出発点と到着点の黒白ノイズ(ProjectR_PresentationVfx → VFX Designerライブラリ)、
 *   (4)通常カットイン(ProjectR_CutIn)が出ます。いずれも表示だけで、移動・ダメージ・Cooldownを決めません。
 *
 * API: ProjectRHermesZetsu
 *   plan(mouse?)         移動先を計算するだけ(状態変更なし)。{ ok, start, land, requested, travelled, limiter, reason }
 *   getLastResult()      直近の発動結果(診断用・保存しない)
 *   effectsForLevel(lv)  累積レベルを解決したeffects      cardLevel()   所持データのレベル(既定1)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "hermes_zetsu";
    const BONUS_ID = CARD;
    const SPEED_ID = CARD;
    const MIN_TRAVEL = 0.1; // これ未満しか動けないなら失敗(ほぼその場)
    const INSET = 0.02; // 壁スイープ用の矩形を少し内側にして、壁に接しているだけの出発を誤検知しない
    const WALL_BACKOFF = INSET + 0.03;
    const STEP = 1 / 8;
    const SAFE_BACKOFF = 1 / 16;
    const EPSILON = 1e-4;

    // 累積レベル: 後のレベルの同名effectは置換する(ProjectRCardCatalog.resolveLevels)。
    const LEVELS = Object.freeze([
        Object.freeze({ level: 1, effects: Object.freeze({ hitMultiplier: 1.5, hitSeconds: 0.8 }) }),
        Object.freeze({ level: 2, effects: Object.freeze({ hitMultiplier: 2.0 }) }),
        Object.freeze({ level: 3, effects: Object.freeze({ hitMultiplier: 3.0, speedFactor: 2.0, speedSeconds: 1.0 }) })
    ]);
    const effectsForLevel = level => root.ProjectRCardCatalog.resolveLevels(LEVELS, level);

    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

    const cardLevel = () => {
        try {
            const definition = deck.definitions?.card?.(CARD);
            const saved = deck.getPersistentData?.().cardOwnership?.[CARD]?.level;
            const level = Number.parseInt(saved, 10);
            return clamp(Number.isFinite(level) ? level : 1, 1, definition?.maxLevel || 3);
        } catch (_error) {
            return 1;
        }
    };

    // ---------- 移動先の計算(状態を変えない) ----------
    const environment = mouseOverride => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!player || !map || typeof TouchInput === "undefined" || typeof Graphics === "undefined" ||
                !["mover", "width", "height", "screenX", "screenY", "setPosition", "canMove"].every(name => typeof player[name] === "function") ||
                !["width", "height", "tileWidth", "tileHeight"].every(name => typeof map[name] === "function")) {
            return failure("movementUnavailable");
        }
        if (!player.canMove() || player.isInVehicle?.()) return failure("playerMovementLocked");
        // すり抜け中は判定を迂回できるので発動しない(フラグ自体は変更しない)。
        if (player.isThrough?.() || player.isDebugThrough?.()) return failure("playerThrough");
        const occlusion = root.ProjectR?.CombatOcclusion;
        if (typeof occlusion?.firstBlockerBetween !== "function") return failure("occlusionUnavailable");
        const raw = mouseOverride || { x: TouchInput.x, y: TouchInput.y };
        if (!finitePoint(raw)) return failure("invalidMousePosition");
        // 範囲は「現在見えている画面」の中だけ。
        const mouse = { x: clamp(raw.x, 0, Graphics.width), y: clamp(raw.y, 0, Graphics.height) };
        const start = { x: player._realX, y: player._realY };
        const vector = { x: (mouse.x - player.screenX()) / map.tileWidth(), y: (mouse.y - player.screenY()) / map.tileHeight() };
        if (!finitePoint(start) || !finitePoint(vector)) return failure("invalidMousePosition");
        return { ok: true, player, map, occlusion, start, vector, mouse };
    };

    const computePlan = env => {
        const { player, map, occlusion, start, vector } = env;
        const w = player.width(), h = player.height();
        if (![w, h].every(n => Number.isFinite(n) && n > EPSILON)) return failure("invalidCollisionSize");
        const requested = Math.hypot(vector.x, vector.y);
        if (!(requested > MIN_TRAVEL)) return failure("noDestination", { requested, travelled: 0, limiter: "none" });
        const ux = vector.x / requested, uy = vector.y / requested;
        const at = t => ({ x: start.x + ux * t, y: start.y + uy * t });
        let limit = requested, limiter = "none";
        const narrow = (distance, name) => { if (distance < limit - 1e-9) { limit = Math.max(0, distance); limiter = name; } };

        // 1. マップ端(ループ設定でも越えない)
        if (ux > 0) narrow((map.width() - w - start.x) / ux, "bounds");
        if (ux < 0) narrow((0 - start.x) / ux, "bounds");
        if (uy > 0) narrow((map.height() - h - start.y) / uy, "bounds");
        if (uy < 0) narrow((0 - start.y) / uy, "bounds");

        // 2. Region 255 / VisionWall / CombatWall を本体矩形ごとスイープ
        const center = { x: start.x + w / 2, y: start.y + h / 2 };
        const half = { x: w / 2 - INSET, y: h / 2 - INSET };
        const footprint = [{ x: -half.x, y: -half.y }, { x: half.x, y: -half.y }, { x: half.x, y: half.y }, { x: -half.x, y: half.y }];
        const wallOptions = { mode: "combat", unwrapped: true, footprint };
        const hit = occlusion.firstBlockerBetween(center, { x: center.x + ux * limit, y: center.y + uy * limit }, wallOptions);
        if (hit) narrow(Math.max(0, hit.distance - WALL_BACKOFF), "wall");

        // 3. 通行不能な地形/Eventを、DotMoveの公式Collisionで短いstepごとに確認
        const mover = player.mover();
        if (typeof mover?.createCollisionChecker !== "function") return failure("movementUnavailable");
        const checker = mover.createCollisionChecker({ overComplementMode: true });
        const blocked = (from, to) => {
            if (ux !== 0 && (checker.checkCollision(to.x, from.y, ux > 0 ? 6 : 4).length ||
                    checker.checkCollision(to.x, to.y, ux > 0 ? 6 : 4).length)) return true;
            if (uy !== 0 && (checker.checkCollision(from.x, to.y, uy > 0 ? 2 : 8).length ||
                    checker.checkCollision(to.x, to.y, uy > 0 ? 2 : 8).length)) return true;
            return false;
        };
        const step = Math.min(STEP, w / 2, h / 2);
        let travelled = 0;
        while (limit - travelled > EPSILON) {
            const amount = Math.min(step, limit - travelled);
            const from = at(travelled);
            if (blocked(from, at(travelled + amount))) {
                let low = 0, high = amount;
                while (high - low > EPSILON) {
                    const mid = (low + high) / 2;
                    if (blocked(from, at(travelled + mid))) high = mid; else low = mid;
                }
                travelled += low;
                limiter = "collision";
                break;
            }
            travelled += amount;
        }

        // 4. 最終確認: 着地矩形がマップ内で、壁(Region/Event)と重ならない。だめなら少し手前へ。
        const safe = p => p.x >= -1e-9 && p.y >= -1e-9 && p.x + w <= map.width() + 1e-9 && p.y + h <= map.height() + 1e-9 &&
            !occlusion.firstBlockerBetween({ x: p.x + w / 2, y: p.y + h / 2 }, { x: p.x + w / 2, y: p.y + h / 2 }, wallOptions);
        while (travelled > 0 && !safe(at(travelled))) travelled = Math.max(0, travelled - SAFE_BACKOFF);

        const land = at(travelled);
        if (!finitePoint(land) || travelled < MIN_TRAVEL) {
            return failure("blocked", { start, requested, travelled, limiter: limiter === "none" ? "collision" : limiter });
        }
        return { ok: true, start, land, requested, travelled, limiter };
    };

    // ---------- 発動 ----------
    let pending = null; // 発動handlerが移動した直後〜requestUseCardの結果確定まで
    let lastResult = null;

    const commit = (plan, level, effects) => {
        const player = $gamePlayer;
        const modifiers = root.ProjectRCardModifiers;
        if (!modifiers) return failure("modifiersUnavailable");
        try {
            player.setPosition(plan.land.x, plan.land.y);
            const moved = { x: player._realX, y: player._realY };
            if (!finitePoint(moved) || Math.hypot(moved.x - plan.land.x, moved.y - plan.land.y) > EPSILON) throw Error("invalidMovementResult");
            // DotMoveの以前の連続移動先/クリック移動先を成功後だけ解除。
            player.cancelMove?.();
            if (typeof $gameTemp !== "undefined") $gameTemp?.clearDestination?.();
            const armed = modifiers.armWeaponHitBonus({ id: BONUS_ID, multiplier: effects.hitMultiplier, seconds: effects.hitSeconds, source: CARD });
            if (!armed.ok) throw Error(armed.reason);
            if (effects.speedFactor) {
                const speed = modifiers.setMoveSpeedFactor(SPEED_ID, effects.speedFactor, effects.speedSeconds);
                if (!speed.ok) throw Error(speed.reason);
            }
            return { ok: true, start: plan.start, land: plan.land, level, effects };
        } catch (error) {
            player.setPosition(plan.start.x, plan.start.y);
            modifiers.clearWeaponHitBonus("commitFailed");
            modifiers.clearMoveSpeedFactor(SPEED_ID);
            return failure(String(error?.message || error));
        }
    };

    const rollback = (tx, reason) => {
        try { $gamePlayer.setPosition(tx.start.x, tx.start.y); $gamePlayer.cancelMove?.(); } catch (_error) { /* 位置は最善で戻す */ }
        root.ProjectRCardModifiers?.clearWeaponHitBonus("rollback");
        root.ProjectRCardModifiers?.clearMoveSpeedFactor(SPEED_ID);
        try { root.ProjectRGodSummonManager?.release?.(tx.summonId); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRPresentationVfx?.clear?.(); } catch (_error) { /* 表示のみ */ }
        lastResult = { ok: false, reason, rolledBack: true };
    };

    // 成功が確定してから(消費・Cooldown・補充が済んだ後)、表示だけを出す。失敗は結果に影響しない。
    const finalize = tx => {
        lastResult = { ok: true, level: tx.level, start: tx.start, land: tx.land, effects: tx.effects,
            travelled: Math.hypot(tx.land.x - tx.start.x, tx.land.y - tx.start.y) };
        const vfx = root.ProjectRPresentationVfx;
        if (!vfx) return;
        try { vfx.play("hermes_zetsu.departure", { origin: tx.start }); } catch (_error) { /* 表示のみ */ }
        try { vfx.play("hermes_zetsu.arrival", {}); } catch (_error) { /* 表示のみ */ }
    };

    const activate = context => {
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        const plan = computePlan(env);
        if (!plan.ok) { lastResult = { ok: false, reason: plan.reason, limiter: plan.limiter, travelled: plan.travelled }; return failure(plan.reason); }
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        let committed = null;
        // Hermes一時召喚 → 移動。召喚は表示用の論理アンカーで、移動するのはPlayerだけ。失敗時は召喚も破棄される。
        const result = summons.perform({ definition: context?.definition, aim: false }, () => {
            committed = commit(plan, level, effects);
            return committed.ok ? { ok: true } : committed;
        });
        if (!result?.ok || !committed?.ok) return failure(result?.reason || committed?.reason || "activationFailed");
        pending = { ...committed, summonId: result.summonId };
        return { ok: true };
    };

    const previousGround = deck.getActivationHandler("ground");
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD
        ? activate(context) : previousGround ? previousGround(context) : { ok: true });

    // ルーターがカードを消費して初めて「成功」。そうでなければ移動・強化・召喚を元に戻す。
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        pending = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (pending) rollback(pending, "exception");
            pending = null;
            throw error;
        }
        const tx = pending;
        pending = null;
        if (tx) {
            if (result?.ok === true && result.cardId === CARD) finalize(tx);
            else rollback(tx, result?.detail || result?.reason || "notConsumed");
        }
        return result;
    };

    root.ProjectRHermesZetsu = Object.freeze({
        CARD, LEVELS,
        plan: mouse => { const env = environment(mouse); return env.ok ? computePlan(env) : env; },
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        effectsForLevel, cardLevel
    });
})();
