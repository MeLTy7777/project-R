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
 * @param PersistentOffsetX
 * @text 常駐神の横オフセット（tile）
 * @desc Player位置からの論理アンカーのずれ。将来の浮遊表示用の仮値。
 * @type number
 * @decimals 2
 * @default -0.75
 *
 * @param PersistentOffsetY
 * @text 常駐神の縦オフセット（tile）
 * @type number
 * @decimals 2
 * @default -0.75
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
 *   マウス方向を使わない効果は request に aim:false を渡すと、degree/radians/
 *   distance が null になり、マウス座標の有無で失敗しません。
 *
 * 寿命はmap更新frame（メニュー・会話中は進まない）。終了(endCardBattle)・
 * マップ変更・ロードで全て破棄。複数の同時召喚は別instanceとして共存します。
 * 常駐の究極神召喚はこの仕組みの対象外です。
 *
 * Phase 3C-1 常駐Ultimate神（論理アンカー）:
 *   Coreに保存済みのUltimate指輪（getUltimateRingId）を、startCardBattle成功時に
 *   一度だけ読み取って戦闘中のsnapshotにします。主人公がその指輪を所持している
 *   場合だけ最大1体を作り、無効/未選択でも戦闘は通常どおり開始します。
 *   一時召喚（perform）とは別管理で、カード発動で壊れず、カード効果にも使いません。
 *   HP・AI・自律攻撃・標的・衝突・Ultimate Gaugeは持ちません。位置は毎回
 *   Playerの現在位置＋オフセットから導出するので、壁や経路探索の影響を受けません。
 *   endCardBattle・マップ移動・ロードで破棄。実行時のみでセーブしません。
 *   ProjectRGodSummonManager.hasPersistentUltimateSummon()
 *   ProjectRGodSummonManager.getPersistentUltimateSummon()  // 読み取り専用コピー
 *   ProjectRGodSummonManager.getPersistentUltimateGodId() / getPersistentUltimateRingId()
 *   ProjectRGodSummonManager.getPersistentUltimateResult()  // 直近の生成結果
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
    const finiteOr = (value, fallback) => Number.isFinite(Number(value)) && String(value).trim() !== "" ? Number(value) : fallback;
    const parameters = PluginManager.parameters("ProjectR_GodSummonManager");
    const offsetX = finiteOr(parameters.PersistentOffsetX, -0.75);
    const offsetY = finiteOr(parameters.PersistentOffsetY, -0.75);
    const summons = new Map(); // 一時召喚（カード発動ごと）。
    let persistent = null; // 常駐Ultimate召喚。最大1。
    let persistentResult = { ok: false, reason: "notStarted" };
    let serial = 0;

    // 指輪定義のgodIdを優先（Janus等の未実装神も常駐Ultimateに使える）。無ければ上の表。
    const resolveGodId = ringId => {
        const fromRing = typeof ringId === "string" ? deck.definitions?.ring?.(ringId)?.godId : null;
        if (fromRing) return fromRing;
        return Object.prototype.hasOwnProperty.call(GODS, ringId) ? GODS[ringId] : null;
    };
    const publicInfo = summon => ({
        kind: "transient", summonId: summon.summonId, godId: summon.godId, ringId: summon.ringId, cardId: summon.cardId,
        x: summon.x, y: summon.y, degree: summon.degree, framesLeft: summon.framesLeft
    });
    const release = summonId => summons.delete(summonId);
    const clear = () => {
        summons.clear();
        persistent = null;
        persistentResult = { ok: false, reason: "notStarted" };
    };

    const create = (definition, lifetime, aim) => {
        const ringId = definition?.ringId, cardId = definition?.cardId;
        const godId = resolveGodId(ringId);
        if (!godId) return { ok: false, reason: "godUnresolved" };
        if (!deck.isCardBattleActive()) return { ok: false, reason: "battleInactive" };
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || (aim && typeof TouchInput === "undefined")) return { ok: false, reason: "playerUnavailable" };
        // 従来のGolden Arrow/Swordsmanshipと同じ画面座標系・角度式。aim:falseは方向を使わない効果用。
        const dx = aim ? TouchInput.x - player.screenX() : 0, dy = aim ? TouchInput.y - player.screenY() : 0;
        const x = player._realX, y = player._realY;
        if (![dx, dy, x, y].every(Number.isFinite)) return { ok: false, reason: aim ? "invalidMousePosition" : "invalidPlayerPosition" };
        let center = null;
        if (typeof player.centerPositionPoint === "function") {
            const point = player.centerPositionPoint();
            if (![point?.x, point?.y].every(Number.isFinite)) return { ok: false, reason: "invalidPlayerPosition" };
            center = { x: point.x, y: point.y };
        }
        const radians = aim ? Math.atan2(dy, dx) : null;
        const degree = aim ? (radians * 180 / Math.PI + 450) % 360 : null;
        // HP・AI・衝突・Eventを一切持たない論理アンカー。
        const summon = Object.freeze({ summonId: ++serial, godId, ringId, cardId, owner: "player",
            transient: true, x, y, degree, framesLeft: lifetime });
        const record = { ...summon };
        summons.set(summon.summonId, record);
        const context = Object.freeze({ summonId: summon.summonId, godId, ringId, cardId, owner: "player",
            summon, x, y, center, degree, radians, distance: aim ? Math.hypot(dx, dy) : null });
        return { ok: true, context, record };
    };

    // 生成 → effect(context) → 成功なら寿命まで保持、失敗/例外なら即破棄。
    const perform = (request, effect) => {
        if (typeof effect !== "function") return { ok: false, reason: "effectMissing" };
        const lifetime = Number.isFinite(request?.lifetimeFrames) && request.lifetimeFrames >= 1
            ? Math.floor(request.lifetimeFrames) : defaultLifetime;
        let created;
        try {
            created = create(request?.definition, lifetime, request?.aim !== false);
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

    // ---- 常駐Ultimate召喚（論理アンカー） ----
    const playerPoint = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        return player && Number.isFinite(player._realX) && Number.isFinite(player._realY)
            ? { x: player._realX, y: player._realY } : null;
    };
    // 位置はPlayerの現在位置から毎回導出する（追従ではなく派生値）。
    const refreshPersistent = () => {
        const point = persistent && playerPoint();
        if (point) { persistent.x = point.x + persistent.offsetX; persistent.y = point.y + persistent.offsetY; }
    };
    const persistentInfo = () => {
        refreshPersistent();
        return persistent && Object.freeze({
            kind: "persistentUltimate", persistent: true, summonId: persistent.summonId, godId: persistent.godId,
            ringId: persistent.ringId, owner: "player", x: persistent.x, y: persistent.y,
            offsetX: persistent.offsetX, offsetY: persistent.offsetY
        });
    };
    const fail = reason => { persistent = null; persistentResult = { ok: false, reason }; return persistentResult; };
    // 戦闘開始時に一度だけ。既に有効な常駐があれば再利用し、重複は作らない。
    const ensurePersistent = () => {
        if (persistent) return persistentResult;
        try {
            if (!deck.isCardBattleActive()) return fail("battleInactive");
            const ringId = deck.getUltimateRingId?.();
            if (!ringId) return fail("noUltimateSelected");
            if (!deck.hasPlayerRing(ringId)) return fail("ultimateRingNotOwnedByPlayer");
            const godId = resolveGodId(ringId);
            if (!godId) return fail("godUnresolved");
            const point = playerPoint();
            if (!point) return fail("playerUnavailable");
            persistent = { summonId: ++serial, godId, ringId, offsetX, offsetY,
                x: point.x + offsetX, y: point.y + offsetY };
            persistentResult = { ok: true, godId, ringId };
        } catch (error) {
            return fail(String(error?.message || error));
        }
        return persistentResult;
    };
    const _startCardBattle = deck.startCardBattle;
    deck.startCardBattle = function() {
        const result = _startCardBattle.apply(this, arguments);
        // 成功した戦闘だけ。失敗しても戦闘結果は変えない。
        if (result?.ok) ensurePersistent(); else clear();
        return result;
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        refreshPersistent();
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
        getActiveSummons: () => [...summons.values()].map(publicInfo),
        ensurePersistentUltimateSummon: () => ({ ...ensurePersistent() }),
        hasPersistentUltimateSummon: () => !!persistent,
        getPersistentUltimateSummon: persistentInfo,
        getPersistentUltimateGodId: () => persistent?.godId ?? null,
        getPersistentUltimateRingId: () => persistent?.ringId ?? null,
        getPersistentUltimateResult: () => ({ ...persistentResult })
    };
})();
