/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 時限モディファイア(通常武器ヒット強化・移動速度係数)。戦闘時間で進み、保存しない。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_CardDeckCore
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_GunSystem
 *
 * @help
 * ProjectR_CardModifiers.js
 *
 * カードが「一定時間だけ」変える共有の量を、カード本体から切り離して持ちます。
 * 2種類だけです。どちらも実行時のみ(セーブしない)で、戦闘終了・マップ移動・ロードですべて消えます。
 *
 * 1. 通常武器ヒット強化(weaponHit)
 *    arm({ id, multiplier, seconds, source }) で1つだけ用意します(再度armすると置換。重ねがけしません)。
 *    次に「通常の剣/銃の攻撃」が実際にダメージを与えた1回だけ、その最終ダメージに multiplier を掛けます。
 *    ・通常の武器攻撃 = Hendrixの UpdateEventHp が value に「player weapon」を含み、対象が敵イベントのもの。
 *      (銃は ProjectR_GunSystem、剣は共通イベント1。どちらも同じこの窓口を通ります)
 *      カードの攻撃・Ultimate・継続ダメージ(<dmg:>/damage式)は対象外です。
 *    ・Hendrixが武器ダメージを計算して適用します(ダメージの所有者はHendrixのまま)。
 *      この層は value 式の「player weapon」を Math.round(player weapon*倍率) に置き換えて渡すだけで、
 *      1回の呼び出しにつき1度しか掛けません。
 *    ・強化中は、公式のクリティカル抽選を止めます(強化はクリティカル相当の保証効果なので二重に掛けない)。
 *    ・外れ(回避)・無効・ダメージ0は「命中」ではないので消費しません。時間切れで自動的に消えます。
 *    時間は ProjectRCardDeck.updateCooldown と同じ戦闘時間(操作可能なmap更新ごと 1/60秒)で進みます。
 *
 * 2. 移動速度係数(moveSpeed)
 *    setMoveSpeedFactor(id, factor, seconds) / clearMoveSpeedFactor(id)。
 *    移動中の「1フレームの移動距離」に、登録中の係数の積を掛けます(Game_Player.distancePerFrame)。
 *    プレイヤーの移動速度の値(_moveSpeed)・走り・他の係数には触れないので、解除は係数を外すだけで
 *    元の速度に戻り、他の修飾を壊しません。同じidで再設定すると置換(重ねがけしません)。
 *
 * API: ProjectRCardModifiers
 *   armWeaponHitBonus(spec) / clearWeaponHitBonus(reason) / getWeaponHitBonus() / getWeaponHitLog()
 *   setMoveSpeedFactor(id, factor, seconds) / clearMoveSpeedFactor(id) / moveSpeedFactor() / getMoveSpeedModifiers()
 *   clearAll(reason) / tick(seconds)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    if (!deck) return;
    const ENGINE = "Hendrix_Action_Engine";
    const EXPIRE_EPSILON = 1e-8;
    const WEAPON_PATTERN = /player\s+2nd\s+weapon|player\s+weapon/gi;

    let bonus = null; // { id, multiplier, remaining, source }
    const speeds = new Map(); // id -> { factor, remaining }
    const log = []; // 診断のみ。保存しない。
    const LOG_LIMIT = 30;
    let seq = 0; // 通し番号。ログは上限で古いものから落ちるので、増分を数えたい診断はseqで比べる
    const note = entry => { log.push(Object.freeze({ seq: ++seq, ...entry })); if (log.length > LOG_LIMIT) log.shift(); };

    const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

    // ---------- 通常武器ヒット強化 ----------
    const armWeaponHitBonus = spec => {
        const multiplier = Number(spec?.multiplier), seconds = Number(spec?.seconds);
        if (!Number.isFinite(multiplier) || multiplier <= 0 || !Number.isFinite(seconds) || seconds <= 0) {
            return { ok: false, reason: "invalidBonus" };
        }
        bonus = { id: String(spec.id ?? "bonus"), multiplier, remaining: seconds, source: String(spec.source ?? "") };
        note({ type: "armed", id: bonus.id, multiplier, seconds });
        return { ok: true };
    };
    const clearWeaponHitBonus = reason => {
        if (!bonus) return false;
        note({ type: "cleared", id: bonus.id, reason: String(reason ?? "cleared") });
        bonus = null;
        return true;
    };
    const getWeaponHitBonus = () => bonus ? { id: bonus.id, multiplier: bonus.multiplier, remaining: bonus.remaining, source: bonus.source } : null;

    // ---------- 移動速度係数 ----------
    const setMoveSpeedFactor = (id, factor, seconds) => {
        const f = Number(factor), s = Number(seconds);
        if (!Number.isFinite(f) || f <= 0 || !Number.isFinite(s) || s <= 0 || !String(id ?? "")) return { ok: false, reason: "invalidFactor" };
        speeds.set(String(id), { factor: f, remaining: s });
        return { ok: true };
    };
    const clearMoveSpeedFactor = id => speeds.delete(String(id));
    const moveSpeedFactor = () => { let product = 1; for (const entry of speeds.values()) product *= entry.factor; return product; };
    const getMoveSpeedModifiers = () => [...speeds].map(([id, e]) => ({ id, factor: e.factor, remaining: e.remaining }));

    const clearAll = reason => {
        clearWeaponHitBonus(reason);
        speeds.clear();
    };

    // 戦闘時間で進める。戦闘が無い/終わっていれば何も残さない。
    const tick = seconds => {
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        const delta = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
        if (!delta) return;
        if (bonus) {
            bonus.remaining -= delta;
            if (bonus.remaining < EXPIRE_EPSILON) { note({ type: "expired", id: bonus.id }); bonus = null; }
        }
        for (const [id, entry] of [...speeds]) {
            entry.remaining -= delta;
            if (entry.remaining < EXPIRE_EPSILON) speeds.delete(id);
        }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        tick(seconds);
        return result;
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        for (const method of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[method];
            if (typeof original !== "function") continue;
            DataManager[method] = function() { clearAll(method); return original.apply(this, arguments); };
        }
    }
    if (typeof Game_Player !== "undefined") {
        const _distancePerFrame = Game_Player.prototype.distancePerFrame;
        Game_Player.prototype.distancePerFrame = function() {
            return _distancePerFrame.apply(this, arguments) * (speeds.size ? moveSpeedFactor() : 1);
        };
    }

    // ---------- UpdateEventHp の窓口 ----------
    const isWeaponValue = value => typeof value === "string" && new RegExp(WEAPON_PATTERN.source, "i").test(value);
    const targetEventId = (args, interpreter) => {
        const raw = args?.eventId;
        if (raw === "this") return interpreter?._eventId ?? null;
        if (raw === "player" || raw === "all" || raw === undefined || raw === null || raw === "") return null;
        const id = Number(raw);
        return Number.isInteger(id) && id > 0 ? id : null;
    };
    const isEnemyEvent = id => {
        const event = typeof $gameMap !== "undefined" ? $gameMap.event(id) : null;
        return !!event && !event._erased && !event._isMinionActor && !event.linkedActorId;
    };
    // 公式のHPバー(Spritesetの_eventHpBars)の currentHp は、UpdateEventHpの中で即時に更新される。
    // $gameMap.getCurrentEventHp は保存先の変数を読み、その変数はバーの次の更新(次フレーム)で書かれるため、
    // 実機ではダメージ直後に読むと「減っていない」ように見える(H2Aの実機検証で判明)。バーがあれば必ずバーを読む。
    const eventHp = id => {
        if (typeof $gameMap === "undefined") return null;
        const event = $gameMap.event(id);
        const bars = typeof SceneManager !== "undefined" ? SceneManager._scene?._spriteset?._eventHpBars : null;
        const bar = event && Array.isArray(bars) ? bars.find(b => b && b._event === event) : null;
        if (bar && Number.isFinite(bar.currentHp)) return Math.max(0, bar.currentHp);
        const hp = typeof $gameMap.getCurrentEventHp === "function" ? $gameMap.getCurrentEventHp(id) : null;
        return Number.isFinite(hp) ? hp : null;
    };
    // 公式のクリティカル抽選だけを、この1回の呼び出しの間止める(強化がクリティカル相当なので二重に掛けない)。
    const suppressNativeCritical = () => {
        const Action = typeof SHendrix_Action !== "undefined" ? SHendrix_Action : null;
        if (!Action) return () => {};
        const had = Object.prototype.hasOwnProperty.call(Action.prototype, "itemCri");
        const previous = Action.prototype.itemCri;
        Action.prototype.itemCri = function() { return 0; };
        return () => { if (had) Action.prototype.itemCri = previous; else delete Action.prototype.itemCri; };
    };
    const boostedValue = (value, multiplier) =>
        value.replace(WEAPON_PATTERN, token => `Math.round(${token}*${multiplier})`);

    const wrap = () => {
        const key = `${ENGINE}:UpdateEventHp`;
        const original = typeof PluginManager !== "undefined" ? PluginManager._commands?.[key] : null;
        if (typeof original !== "function" || original.__projectRCardModifiers) return false;
        const wrapped = function(args) {
            const current = bonus;
            const id = current ? targetEventId(args, this) : null;
            if (!current || id === null || !isWeaponValue(args?.value) || !isEnemyEvent(id)) {
                return original.apply(this, arguments);
            }
            const before = eventHp(id);
            const modified = Object.assign({}, args, { value: boostedValue(String(args.value), current.multiplier) });
            const restore = suppressNativeCritical();
            let result;
            try {
                bonus = null; // 先に外す: 再入しても二重に掛からない
                result = original.call(this, modified);
            } catch (error) {
                if (!bonus) bonus = current; // 例外ではダメージ未確定なので消費しない
                throw error;
            } finally {
                restore();
            }
            const after = eventHp(id);
            const cm = root.CollisionManager;
            const landed = before !== null && after !== null ? after < before
                : !(cm?.lastEvaded === true || cm?.lastImmunity === true);
            if (landed) {
                note({ type: "consumed", id: current.id, multiplier: current.multiplier, eventId: id,
                    dealt: before !== null && after !== null ? before - after : null });
            } else if (!bonus) {
                bonus = current; // 外れ/無効/0ダメージでは消費しない(残り時間も保持)
                note({ type: "missed", id: current.id, eventId: id });
            }
            return result;
        };
        wrapped.__projectRCardModifiers = true;
        PluginManager._commands[key] = wrapped;
        return true;
    };
    const installed = wrap();

    root.ProjectRCardModifiers = {
        armWeaponHitBonus, clearWeaponHitBonus, getWeaponHitBonus, getWeaponHitLog: () => log.map(entry => ({ ...entry })),
        setMoveSpeedFactor, clearMoveSpeedFactor, moveSpeedFactor, getMoveSpeedModifiers,
        clearAll, tick, isInstalled: () => installed || !!PluginManager._commands?.[`${ENGINE}:UpdateEventHp`]?.__projectRCardModifiers
    };
})();
