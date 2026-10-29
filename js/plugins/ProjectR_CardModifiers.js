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
 * 3. ヒットフック(registerHitHook) — H2B-1
 *    敵Eventへの「ダメージ」(UpdateEventHpの値が - で始まるもの)の直前・直後に呼ばれる共有の窓口です。
 *    ・prepare(ctx) は 1回の命中につき1度。{ flat, forceCritical } を返すと、その命中の最終ダメージに flat を足し、
 *      クリティカルを確定させます(公式のクリティカル抽選は1回だけ。二重に掛けません)。
 *      prepareは「命中前」の状態(例: 睡眠中か)を見るために呼ばれます。
 *    ・finish(ctx, outcome) は命中後。outcome = { dealt, before, after }(HPバーを優先して読む)。
 *      例: 睡眠中の敵がダメージを受けたら起こす。
 *    ・固定ダメージ(カードの「50ダメージ」等): UpdateEventHpの引数に projectRFixed:{ base, flat?, critChanceBonus?, source? } を渡すと、
 *      この層が「基礎値 → クリティカル判定(自然な確率 + critChanceBonus、確定指定があれば確定) → 加算(固定側のflat + フックのflat)」を1度だけ計算して
 *      値を - で書き換えます。クリティカル倍率は公式 critDmgMultiplier(SHendrix_Action.applyCritical)です。
 *      固定ダメージは「絶」の武器ヒット強化の対象外です(通常の剣/銃だけが対象)。
 *
 * 4. 演出の二重発火防止(skipPresentationOnce / takePresentationSkip)
 *    カードの演出を「予約時」に先に出し、消費の確定時に同じ演出がもう一度出ないようにするための合図です。
 *    CutIn / CharacterPresentation が requestUseCard の成功で演出を出す直前に takePresentationSkip を確認します。
 *
 * API: ProjectRCardModifiers
 *   armWeaponHitBonus(spec) / clearWeaponHitBonus(reason) / getWeaponHitBonus() / getWeaponHitLog()
 *   setMoveSpeedFactor(id, factor, seconds) / clearMoveSpeedFactor(id) / moveSpeedFactor() / getMoveSpeedModifiers()
 *   registerHitHook(id, { prepare, finish }) / unregisterHitHook(id) / naturalCriticalChance(eventId)
 *   skipPresentationOnce(cardId, channels) / takePresentationSkip(cardId, channel) / clearPresentationSkip(cardId)
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

    const hitHooks = new Map(); // id -> { prepare, finish }
    const presentationSkips = new Map(); // cardId -> Set(channel)

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

    // 演出の二重発火防止。予約時に先に出した演出を、消費確定の成功で再び出さないための合図(その呼び出しの間だけ有効)。
    const skipPresentationOnce = (cardId, channels) => {
        presentationSkips.set(String(cardId), new Set(Array.isArray(channels) ? channels.map(String) : [String(channels)]));
    };
    const takePresentationSkip = (cardId, channel) => {
        const set = presentationSkips.get(String(cardId));
        return !!set && set.has(String(channel));
    };
    const clearPresentationSkip = cardId => { presentationSkips.delete(String(cardId)); };

    const clearAll = reason => {
        clearWeaponHitBonus(reason);
        speeds.clear();
        presentationSkips.clear();
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
    const boostedValue = (value, multiplier) =>
        value.replace(WEAPON_PATTERN, token => `Math.round(${token}*${multiplier})`);

    // ---------- ヒットフック ----------
    const registerHitHook = (id, hook) => {
        if (!String(id ?? "") || !hook || typeof hook !== "object") return false;
        hitHooks.set(String(id), hook);
        return true;
    };
    const unregisterHitHook = id => hitHooks.delete(String(id));
    const isDamageValue = value => typeof value === "string" && /^\s*-/.test(value);
    const safely = (callback, fallback) => { try { return callback(); } catch (_error) { return fallback; } };
    // 自然なクリティカル率(公式 itemCri と同じ式: 使用者CRI x (1 - 対象CEV))。装備・Stateの加算はMZの特殊能力値(xparam)で足し算。
    const naturalCriticalChance = id => safely(() => {
        const leader = $gameParty.leader();
        const target = typeof SgetBattlerForH === "function" ? SgetBattlerForH($gameMap.event(id)) : null;
        const cev = target && Number.isFinite(target.cev) ? target.cev : 0;
        const chance = (Number.isFinite(leader?.cri) ? leader.cri : 0) * (1 - cev);
        return Math.min(1, Math.max(0, chance));
    }, 0);
    const criticalMultiplier = () => safely(() => {
        const Action = typeof SHendrix_Action !== "undefined" ? SHendrix_Action : null;
        const value = Action ? new Action($gameParty.leader()).applyCritical(1) : NaN;
        return Number.isFinite(value) && value > 0 ? value : 1;
    }, 1);
    const prepareHooks = context => {
        const out = { flat: 0, forceCritical: false, entries: [] };
        for (const [id, hook] of [...hitHooks]) {
            if (typeof hook.prepare !== "function") continue;
            const result = safely(() => hook.prepare(context), null);
            if (!result || typeof result !== "object") continue;
            const flat = Number(result.flat);
            if (Number.isFinite(flat) && flat > 0) out.flat += flat;
            if (result.forceCritical === true) out.forceCritical = true;
            out.entries.push({ id, hook, result });
        }
        return out;
    };
    const finishHooks = (context, prepared, outcome) => {
        for (const { hook, result } of prepared.entries) {
            if (typeof hook.finish === "function") safely(() => hook.finish(context, outcome, result), null);
        }
    };
    // 公式のクリティカル抽選を、この1回の呼び出しの間だけ固定する(force=true: 必ず発生 / false: 発生しない)。
    const patchCritical = force => {
        const Action = typeof SHendrix_Action !== "undefined" ? SHendrix_Action : null;
        if (!Action) return () => {};
        const had = Object.prototype.hasOwnProperty.call(Action.prototype, "itemCri");
        const previous = Action.prototype.itemCri;
        Action.prototype.itemCri = function() { return force ? 1 : 0; };
        return () => { if (had) Action.prototype.itemCri = previous; else delete Action.prototype.itemCri; };
    };

    const wrap = () => {
        const key = `${ENGINE}:UpdateEventHp`;
        const original = typeof PluginManager !== "undefined" ? PluginManager._commands?.[key] : null;
        if (typeof original !== "function" || original.__projectRCardModifiers) return false;
        const wrapped = function(args) {
            const id = targetEventId(args, this);
            const enemy = id !== null && isEnemyEvent(id);
            const fixed = enemy && args && typeof args.projectRFixed === "object" && args.projectRFixed ? args.projectRFixed : null;
            const damaging = enemy && (!!fixed || isDamageValue(String(args?.value ?? "")));
            const hooked = damaging && hitHooks.size > 0;
            const current = bonus;
            const weaponBonus = !!current && enemy && !fixed && isWeaponValue(args?.value);
            if (!hooked && !weaponBonus && !fixed) return original.apply(this, arguments);

            const kind = fixed ? "fixed" : isWeaponValue(args?.value) ? "weapon" : "expression";
            const context = { eventId: id, kind, value: String(args?.value ?? ""), source: fixed ? String(fixed.source ?? "") : "" };
            const prepared = hooked ? prepareHooks(context) : { flat: 0, forceCritical: false, entries: [] };
            const before = eventHp(id);
            let value = String(args?.value ?? "");
            let critical = null;
            let baseDamage = null;
            let restore = () => {};
            if (fixed) {
                baseDamage = Math.max(0, Math.round(Number(fixed.base)));
                if (!Number.isFinite(baseDamage)) baseDamage = 0;
                const chance = Math.min(1, Math.max(0, naturalCriticalChance(id) + (Number(fixed.critChanceBonus) || 0)));
                critical = prepared.forceCritical || Math.random() < chance;
                const own = Math.max(0, Math.round(Number(fixed.flat) || 0)); // 固定ダメージ側の加算(例: 薙ぎ払いLv2の先端+50)
                const total = (critical ? Math.round(baseDamage * criticalMultiplier()) : baseDamage) + own + prepared.flat;
                value = `-${total}`;
            } else {
                if (weaponBonus) value = boostedValue(value, current.multiplier);
                // 加算は「基礎のダメージが出たとき」だけ(回避・無効で0なら加算しない)。評価はHendrixがtokenを数値へ置き換えてから行う。
                if (prepared.flat > 0) value = `((${value})<0?(${value})-${prepared.flat}:0)`;
                // 絶の強化中は公式の抽選を止める(強化がクリティカル相当)。確定クリティカルの指定があればそちらを優先する。
                if (prepared.forceCritical) { restore = patchCritical(true); critical = true; }
                else if (weaponBonus) restore = patchCritical(false);
            }
            const modified = Object.assign({}, args, { value });
            if (fixed) delete modified.projectRFixed;
            let result;
            try {
                if (weaponBonus) bonus = null; // 先に外す: 再入しても二重に掛からない
                result = original.call(this, modified);
            } catch (error) {
                if (weaponBonus && !bonus) bonus = current; // 例外ではダメージ未確定なので消費しない
                throw error;
            } finally {
                restore();
            }
            const after = eventHp(id);
            const cm = root.CollisionManager;
            const landed = before !== null && after !== null ? after < before
                : fixed || prepared.flat > 0 ? true : !(cm?.lastEvaded === true || cm?.lastImmunity === true);
            const dealt = before !== null && after !== null ? before - after : null;
            if (weaponBonus) {
                if (landed) {
                    note({ type: "consumed", id: current.id, multiplier: current.multiplier, eventId: id, dealt });
                } else if (!bonus) {
                    bonus = current; // 外れ/無効/0ダメージでは消費しない(残り時間も保持)
                    note({ type: "missed", id: current.id, eventId: id });
                }
            }
            if (fixed || prepared.entries.length || prepared.flat) {
                note({ type: "hit", source: context.source || kind, eventId: id, base: baseDamage, critical, flat: landed ? prepared.flat : 0, landed, dealt });
            }
            if (hooked) finishHooks(context, prepared, { dealt, before, after, landed });
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
        registerHitHook, unregisterHitHook, naturalCriticalChance,
        skipPresentationOnce, takePresentationSkip, clearPresentationSkip,
        clearAll, tick, isInstalled: () => installed || !!PluginManager._commands?.[`${ENGINE}:UpdateEventHp`]?.__projectRCardModifiers
    };
})();
