/*:
 * @target MZ
 * @plugindesc v1.0.0 Phase 3A カード発動時の一時神召喚（論理アンカー）基盤。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardBattleInput
 *
 * @param LifetimeFrames
 * @text 一時召喚の寿命（map更新frame）
 * @type number
 * @min 1
 * @default 12
 *
 * @help
 * カードを使うと、そのカードの指輪の神が一時的に召喚され、神が効果を実行する、
 * というルールの最小基盤です。CardDeckCoreは変更せず、カードhandlerが呼びます。
 *
 * 一時召喚は論理アンカーのみ（Map Eventを作らない）:
 *   HPなし / 敵の標的にならない / 移動を妨げない / AIなし / 自律攻撃なし /
 *   Game_*に保存されずセーブ対象外。美術素材は未使用で、将来Sprite/VFXを
 *   追加してもカードの挙動を変えずに済む構造です。
 *
 * 使い方（カードhandler側）:
 *   ProjectRGodSummonManager.perform({ definition }, context => ({ ok: true }))
 *   summon生成 → effectにcontextを渡す → { ok: true } なら寿命まで保持、
 *   失敗/例外なら即座に破棄して失敗を返す（カードは非消費）。
 * context: { summonId, godId, ringId, cardId, owner:"player", summon,
 *            x, y, center, degree, radians, distance }
 *   x,yはプレイヤーのreal座標（召喚位置=プレイヤー位置）、degreeは発動時の
 *   マウス方向（上=0度・時計回り）。攻撃者は従来どおりplayerです。
 *
 * 寿命はmap更新frame（メニュー・会話中は進まない）。終了(endCardBattle)・
 * マップ変更・ロードで全て破棄。複数の同時召喚は別instanceとして共存します。
 * 常駐の究極神召喚はこの仕組みの対象外です。
 *
 * Console: ProjectRGodSummonManager.getActiveSummons()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const configured = Number(PluginManager.parameters("ProjectR_GodSummonManager").LifetimeFrames);
    const defaultLifetime = Number.isFinite(configured) && configured >= 1 ? Math.floor(configured) : 12;
    // 指輪 → 神。将来の神はここへ足す。実行時のみの定義でセーブしない。
    const GODS = { apollo: "apollo", hermes: "hermes" };
    const summons = new Map();
    let serial = 0;

    const resolveGodId = ringId => Object.prototype.hasOwnProperty.call(GODS, ringId) ? GODS[ringId] : null;
    const publicInfo = summon => ({
        summonId: summon.summonId, godId: summon.godId, ringId: summon.ringId, cardId: summon.cardId,
        x: summon.x, y: summon.y, degree: summon.degree, framesLeft: summon.framesLeft
    });
    const release = summonId => summons.delete(summonId);
    const clear = () => summons.clear();

    const create = (definition, lifetime) => {
        const ringId = definition?.ringId, cardId = definition?.cardId;
        const godId = resolveGodId(ringId);
        if (!godId) return { ok: false, reason: "godUnresolved" };
        if (!deck.isCardBattleActive()) return { ok: false, reason: "battleInactive" };
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || typeof TouchInput === "undefined") return { ok: false, reason: "playerUnavailable" };
        // 従来のGolden Arrow/Swordsmanshipと同じ画面座標系・角度式。
        const dx = TouchInput.x - player.screenX(), dy = TouchInput.y - player.screenY();
        const x = player._realX, y = player._realY;
        if (![dx, dy, x, y].every(Number.isFinite)) return { ok: false, reason: "invalidMousePosition" };
        let center = null;
        if (typeof player.centerPositionPoint === "function") {
            const point = player.centerPositionPoint();
            if (![point?.x, point?.y].every(Number.isFinite)) return { ok: false, reason: "invalidPlayerPosition" };
            center = { x: point.x, y: point.y };
        }
        const radians = Math.atan2(dy, dx);
        const degree = (radians * 180 / Math.PI + 450) % 360;
        // HP・AI・衝突・Eventを一切持たない論理アンカー。
        const summon = Object.freeze({ summonId: ++serial, godId, ringId, cardId, owner: "player",
            transient: true, x, y, degree, framesLeft: lifetime });
        const record = { ...summon };
        summons.set(summon.summonId, record);
        const context = Object.freeze({ summonId: summon.summonId, godId, ringId, cardId, owner: "player",
            summon, x, y, center, degree, radians, distance: Math.hypot(dx, dy) });
        return { ok: true, context, record };
    };

    // 生成 → effect(context) → 成功なら寿命まで保持、失敗/例外なら即破棄。
    const perform = (request, effect) => {
        if (typeof effect !== "function") return { ok: false, reason: "effectMissing" };
        const lifetime = Number.isFinite(request?.lifetimeFrames) && request.lifetimeFrames >= 1
            ? Math.floor(request.lifetimeFrames) : defaultLifetime;
        let created;
        try {
            created = create(request?.definition, lifetime);
        } catch (error) {
            return { ok: false, reason: String(error?.message || error) };
        }
        if (!created.ok) return created;
        const id = created.context.summonId;
        try {
            const result = effect(created.context);
            if (result?.ok !== true) {
                release(id);
                return { ok: false, reason: result?.reason || "effectRejected" };
            }
            return { ok: true, summonId: id };
        } catch (error) {
            release(id);
            return { ok: false, reason: String(error?.message || error) };
        }
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused || !summons.size) return;
        for (const [id, summon] of [...summons]) {
            if (--summon.framesLeft <= 0) summons.delete(id);
        }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        clear();
    };

    root.ProjectRGodSummonManager = {
        resolveGodId, perform, release, clear,
        getActiveSummons: () => [...summons.values()].map(publicInfo)
    };
})();
