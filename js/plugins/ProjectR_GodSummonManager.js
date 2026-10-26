/*:
 * @target MZ
 * @plugindesc v1.1.0 カード発動時の一時神召喚と、常駐Ultimate神（Divine HP・崩壊・復帰）の基盤。
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
 * @param DefaultDivineMaxHp
 * @text 常駐神の最大Divine HP（仮）
 * @desc 常駐Ultimate神専用のHP。戦闘開始ごとに満タン。バランス用の仮値。
 * @type number
 * @min 1
 * @default 100
 *
 * @param RecoveryDelaySeconds
 * @text 崩壊からの復帰秒数（仮）
 * @desc Divine HPが0になってから自動復帰するまでの戦闘中の秒数。
 * @type number
 * @decimals 2
 * @min 0
 * @default 15
 *
 * @param RecoveryHpRate
 * @text 復帰時のHP割合（仮）
 * @desc 復帰時にDivine HPを最大値のこの割合まで戻す（0〜1）。
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.5
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
 *   論理アンカー自体はAI・自律攻撃・標的・衝突・Ultimate Gaugeを持ちません
 *   （HPは下のPhase 3C-2のDivine HPとして戦闘状態側に持つ）。位置は毎回
 *   Playerの現在位置＋オフセットから導出するので、壁や経路探索の影響を受けません。
 *   endCardBattle・マップ移動・ロードで破棄。実行時のみでセーブしません。
 *   ProjectRGodSummonManager.hasPersistentUltimateSummon()
 *   ProjectRGodSummonManager.getPersistentUltimateSummon()  // 読み取り専用コピー
 *   ProjectRGodSummonManager.getPersistentUltimateGodId() / getPersistentUltimateRingId()
 *   ProjectRGodSummonManager.getPersistentUltimateResult()  // 直近の生成結果
 *
 * Phase 3C-2 常駐Ultimate神のDivine HP / 崩壊 / 復帰:
 *   常駐Ultimate神だけが戦闘中専用のDivine HPを持ちます（Player/敵のHPとは別。
 *   一時召喚やカードには持たせません）。戦闘開始ごとに満タン、セーブしません。
 *   Divine HPが0で「崩壊」: 論理アンカー（顕現）は消え、Ultimateは使用不可になりますが、
 *   戦闘中の常駐神の情報（神・指輪・HP）は残ります。カード（一時召喚）はそのまま使えます。
 *   崩壊からRecoveryDelaySeconds後（カードのクールダウンと同じ戦闘時間で進み、
 *   メニュー・会話・フォーカス喪失中は止まる）に、最大値のRecoveryHpRate分のHPで自動復帰し、
 *   顕現が戻ります。何度でも繰り返します。endCardBattle・マップ移動・ロードで全て破棄。
 *   ProjectRGodSummonManager.damagePersistentUltimate(amount, source?)  // 将来のボス/AoE用
 *   ProjectRGodSummonManager.hasPersistentUltimateBattleState()   // 戦闘中の常駐神がいるか
 *   ProjectRGodSummonManager.isPersistentUltimateCollapsed()
 *   ProjectRGodSummonManager.isPersistentUltimateAvailable()     // 顕現中かつHP>0
 *   ProjectRGodSummonManager.getPersistentUltimateStatus()       // "none"|"active"|"collapsed"
 *   ProjectRGodSummonManager.getPersistentUltimateDivineHp() / getPersistentUltimateMaxDivineHp()
 *   ProjectRGodSummonManager.getPersistentUltimateDivineHpRate()
 *   ProjectRGodSummonManager.getPersistentUltimateRecoveryRemainingSeconds()
 *   ProjectRGodSummonManager.getPersistentUltimateBattleState()  // 読み取り専用コピー
 *   hasPersistentUltimateSummon / getPersistentUltimateSummon は「顕現中」のみ真/非null。
 *   getPersistentUltimateGodId / RingId は崩壊中も戦闘中の常駐神を返します。
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
    // Divine HP関連の仮値（バランス用）。不正値は既定へ、復帰割合は0〜1へ丸める。
    const divineMaxHp = (() => { const v = finiteOr(parameters.DefaultDivineMaxHp, 100); return v >= 1 ? v : 100; })();
    const recoveryDelay = (() => { const v = finiteOr(parameters.RecoveryDelaySeconds, 15); return v >= 0 ? v : 15; })();
    const recoveryRate = Math.min(1, Math.max(0, finiteOr(parameters.RecoveryHpRate, 0.5)));
    const summons = new Map(); // 一時召喚（カード発動ごと）。
    let persistent = null; // 常駐Ultimateの顕現（論理アンカー）。最大1。崩壊中はnull。
    let battle = null; // 常駐Ultimateの戦闘状態 {godId, ringId, maxHp, hp, status, recoveryRemaining}。顕現とは別。
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
        battle = null;
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
    // 顕現（論理アンカー）を作る。戦闘状態のgod/ringのsnapshotをそのまま使う。
    const manifest = point => {
        persistent = { summonId: ++serial, godId: battle.godId, ringId: battle.ringId, offsetX, offsetY,
            x: point.x + offsetX, y: point.y + offsetY };
    };
    const fail = reason => { persistent = null; battle = null; persistentResult = { ok: false, reason }; return persistentResult; };
    // 戦闘開始時に一度だけ。既に有効な常駐があれば再利用し、重複は作らない。
    const ensurePersistent = () => {
        if (battle) return persistentResult; // 崩壊中でも作り直さない（復帰は時間経過のみ）。
        try {
            if (!deck.isCardBattleActive()) return fail("battleInactive");
            const ringId = deck.getUltimateRingId?.();
            if (!ringId) return fail("noUltimateSelected");
            if (!deck.hasPlayerRing(ringId)) return fail("ultimateRingNotOwnedByPlayer");
            const godId = resolveGodId(ringId);
            if (!godId) return fail("godUnresolved");
            const point = playerPoint();
            if (!point) return fail("playerUnavailable");
            battle = { godId, ringId, maxHp: divineMaxHp, hp: divineMaxHp, status: "active", recoveryRemaining: 0 };
            manifest(point);
            persistentResult = { ok: true, godId, ringId };
        } catch (error) {
            return fail(String(error?.message || error));
        }
        return persistentResult;
    };
    const divineHpOf = () => battle ? battle.hp : 0;
    const battleInfo = () => battle && Object.freeze({
        godId: battle.godId, ringId: battle.ringId, status: battle.status, manifested: !!persistent,
        divineHp: battle.hp, maxDivineHp: battle.maxHp, divineHpRate: battle.hp / battle.maxHp,
        recoveryRemainingSeconds: battle.status === "collapsed" ? battle.recoveryRemaining : 0
    });
    const isAvailable = () => !!battle && battle.status === "active" && battle.hp > 0 && !!persistent;
    // 将来のボス/AoE用。有効な常駐Ultimateが顕現中のときだけHPを減らす。
    const damagePersistentUltimate = (amount, source) => {
        const info = reason => ({ ok: false, reason, damage: 0, collapsed: false, status: battle ? battle.status : "none",
            divineHp: divineHpOf(), maxDivineHp: battle ? battle.maxHp : 0 });
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return info("invalidDamage");
        if (!battle) return info("noPersistentUltimate");
        if (battle.status !== "active" || battle.hp <= 0) return info("collapsed");
        const damage = Math.min(amount, battle.hp);
        battle.hp = Math.max(0, battle.hp - damage);
        const collapsed = battle.hp <= 0;
        if (collapsed) {
            // 崩壊: 顕現だけを消し、戦闘状態は残して復帰タイマーを開始（カード/戦闘/指輪/選択には触れない）。
            battle.hp = 0;
            battle.status = "collapsed";
            battle.recoveryRemaining = recoveryDelay;
            persistent = null;
        }
        return { ok: true, damage, requested: amount, collapsed, status: battle.status, divineHp: battle.hp,
            maxDivineHp: battle.maxHp, divineHpRate: battle.hp / battle.maxHp, source: typeof source === "string" ? source : null };
    };
    // 復帰: 最大値 * 割合のHPで顕現を戻す。Player位置が無ければ0秒のまま次の戦闘時間で再試行。
    const recover = () => {
        const point = playerPoint();
        if (!point) return false;
        battle.hp = Math.min(battle.maxHp, Math.max(battle.maxHp * recoveryRate, Math.min(1, battle.maxHp)));
        battle.status = "active";
        battle.recoveryRemaining = 0;
        manifest(point);
        return true;
    };
    const advanceRecovery = seconds => {
        if (!battle || battle.status !== "collapsed" || !Number.isFinite(seconds) || seconds <= 0) return;
        battle.recoveryRemaining = Math.max(0, battle.recoveryRemaining - seconds);
        if (battle.recoveryRemaining < 1e-8) { battle.recoveryRemaining = 0; recover(); }
    };
    // 認識阻害・睡眠・病と同じ戦闘時間（InputのupdateCooldown）。停止条件もInput側に従う。
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (battle && deck.isCardBattleActive()) advanceRecovery(seconds);
        return result;
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
        getPersistentUltimateGodId: () => battle?.godId ?? null,
        getPersistentUltimateRingId: () => battle?.ringId ?? null,
        getPersistentUltimateResult: () => ({ ...persistentResult }),
        damagePersistentUltimate,
        hasPersistentUltimateBattleState: () => !!battle,
        isPersistentUltimateCollapsed: () => battle?.status === "collapsed",
        isPersistentUltimateAvailable: isAvailable,
        getPersistentUltimateStatus: () => battle ? battle.status : "none",
        getPersistentUltimateDivineHp: divineHpOf,
        getPersistentUltimateMaxDivineHp: () => battle ? battle.maxHp : 0,
        getPersistentUltimateDivineHpRate: () => battle ? battle.hp / battle.maxHp : 0,
        getPersistentUltimateRecoveryRemainingSeconds: () => battle && battle.status === "collapsed" ? battle.recoveryRemaining : 0,
        getPersistentUltimateBattleState: battleInfo
    };
})();
