/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「葦笛」(設計ID 6): 半径8マスの敵を眠らせる(壁越えなし)。ダメージで起床。Lv2 睡眠中への攻撃+50 / Lv3 その攻撃はクリティカル確定。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_HermesReedFluteSleep
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_HermesReedFluteSleep
 * @orderAfter ProjectR_HermesSwiftMovement
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_HermesSweep
 *
 * @param SleepSeconds
 * @text 睡眠の持続時間(秒)
 * @desc ワークブックに睡眠時間の指定は無いため、旧「葦笛睡眠」(ProjectR_HermesReedFluteSleep)のDurationSeconds(4秒)を引き継ぎます。0以下/空なら旧Pluginの値。
 * @type number
 * @decimals 2
 * @default 0
 *
 * @help
 * ProjectR_HermesReedFlute.js
 *
 * 新カード「葦笛」(ワークブック「カード一覧」のCard ID 6)。ランタイムIDは hermes_reed_flute(旧葦笛睡眠 hermes_reed_flute_sleep は
 * そのまま残り、挙動も変えません)。Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / 対象タイプ「その他」(=instant。狙いを使わない)。
 * 定義はProjectR_CardCatalogが実行時に追加します(旧7枚のCardDefinitionsとセーブは変更しません)。
 *
 * 【範囲】プレイヤー中心から半径8マス。敵Eventの攻撃判定矩形(ProjectR_CombatOcclusion.eventPolygon)が円に触れ、
 *   かつ壁(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)を通らずに届く敵だけが対象です(hasLineToPolygon)。
 *   複数の敵に同時に効きます。固定のEvent IDは使いません。
 *
 * 【効果(累積レベル)】
 *   Lv1: 範囲内の敵を眠らせる。ダメージを与えると起きる。
 *   Lv2: Lv1に加え、このカードで眠らせた敵に与えるダメージが +50(最終ダメージへの加算)。
 *   Lv3: Lv1・Lv2に加え、その攻撃はクリティカル確定。
 *   「その攻撃」= 睡眠中の敵に最初に命中した、プレイヤーのダメージ(通常の剣/銃・カードの攻撃)。命中の「前」に睡眠状態を見て加算・確定を決め、
 *   命中して初めて起こします(回避・無効なら起きず、加算もしません)。起きた後は加算されません(1回の睡眠につき1回)。
 *   公式のクリティカル抽選は1回だけ(ProjectR_CardModifiersのヒットフックが確定指定に切り替える)ので、二重に掛かりません。
 *   絶の武器ヒット強化とは別の効果です(両方有効なら、それぞれ別に効きます)。
 *
 * 【睡眠】State 32(<ProjectRCard: hermes_reed_flute_sleep>)を公式AddStateで付与します(旧葦笛睡眠と同じState。耐性・無効化は公式に委譲)。
 *   時間は 旧Pluginの DurationSeconds を引き継ぎ(既定4秒。ワークブックに睡眠時間の指定が無いため新しい値は決めていません)、
 *   カードのCooldownと同じ戦闘時間で進みます(操作不能中は停止)。再使用は時間の更新で、重ねません。
 *   敵の頭上のZzzふきだしは、既存のProjectR_WeaponPresentationがStateを読んで出します。
 *   ※共通のEnemy AIはまだ無いため、睡眠中に敵が止まる接続は後続Phaseです(旧葦笛睡眠と同じ)。
 *
 * 【消費】ワークブックの「対象なし時: カードを消費する」に従い、有効な発動であれば敵が1体もいなくても消費・Cooldown・補充・ゲージが起きます
 *   (旧葦笛睡眠は「睡眠付与0体なら非消費」のまま。これは新カードだけの規則です)。無効な発動(戦闘外・Hermes召喚の失敗など)は非消費。
 *   睡眠は「消費が確定した後」に付与します。
 *
 * 【演出】Hermesがプレイヤーの前に現れて笛を吹き(DEV: 音符のふきだし)、白く半透明の水面の波(VFX Designerライブラリ ProjectR_Flute_Ripple)が
 *   効果範囲いっぱいへ広がります。主人公は何もしない(ワークブックの「なにもしない」)。通常カットイン。Hermesは黒いノイズとともに消えます。
 *   笛の音は利用できるRTPの音が無いため未用意(内容要件)。いずれも表示だけで判定を決めません。
 *
 * API: ProjectRHermesReedFlute
 *   plan()              今の位置での対象の計画(状態を変えない) { center, targets:[eventId] }
 *   isSleeping(eventId) このカードの睡眠が有効か      getSleepers() 診断用    getLastResult()
 *   effectsForLevel(lv) / cardLevel()                 sleepSeconds()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "hermes_reed_flute";
    const HOOK_ID = CARD;
    const RADIUS_TILES = 8; // 正本(ワークブック)の値。変更はユーザーの設計変更なので、パラメータにはしない。
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesReedFlute") : {};
    const legacyParams = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesReedFluteSleep") : {};
    const positive = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
    const sleepSeconds = () => positive(params.SleepSeconds, positive(legacyParams.DurationSeconds, 4));

    const LEVELS = Object.freeze([
        Object.freeze({ level: 1, effects: Object.freeze({ sleep: true }) }),
        Object.freeze({ level: 2, effects: Object.freeze({ sleepBonusDamage: 50 }) }),
        Object.freeze({ level: 3, effects: Object.freeze({ guaranteedCritical: true }) })
    ]);
    const effectsForLevel = level => root.ProjectRCardCatalog.resolveLevels(LEVELS, level);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });

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

    const map = () => typeof $gameMap !== "undefined" ? $gameMap : null;
    const stateId = () => {
        const matches = (typeof $dataStates !== "undefined" ? $dataStates : []).filter(s => s?.note?.includes("<ProjectRCard: hermes_reed_flute_sleep>"));
        return matches.length === 1 ? matches[0].id : 0;
    };
    const battlerFor = event => typeof SgetBattlerForH === "function" ? SgetBattlerForH(event) : null;
    const command = (name, eventId, id) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, { target: String(eventId), stateId: String(id) });
    };
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;

    // ---------- 睡眠の状態(実行時のみ。保存しない) ----------
    const sleepers = new Map(); // event -> { map, battler, stateId, remaining, level, effects }
    let lastResult = null;
    let serial = 0;

    const sleepingNow = (event, record) => !!record && !event._erased && record.map === map() && map().event(event.eventId()) === event &&
        typeof root.hasState === "function" && root.hasState(event.eventId(), record.stateId);
    const clearSleeper = (event, record, reason) => {
        sleepers.delete(event);
        try {
            if (record.map === map() && map().event(event.eventId()) === event) command("RemoveState", event.eventId(), record.stateId);
        } finally {
            record.battler?.removeState?.(record.stateId); // コマンド欠落・イベント差替えでもBattlerだけは確実に戻す
        }
        lastResult = lastResult && { ...lastResult, lastClear: { eventId: event.eventId(), reason } };
    };
    const clearAll = reason => { for (const [event, record] of [...sleepers]) clearSleeper(event, record, reason); };

    // ---------- 命中フック: 命中の「前」に睡眠を見て加算・確定を決め、命中した「後」に起こす ----------
    const hook = {
        prepare(context) {
            const event = map()?.event(context.eventId);
            const record = event ? sleepers.get(event) : null;
            if (!record || !sleepingNow(event, record)) return null;
            return { flat: record.effects.sleepBonusDamage || 0, forceCritical: record.effects.guaranteedCritical === true, record };
        },
        finish(context, outcome, prepared) {
            const record = prepared?.record;
            if (!record) return;
            const event = map()?.event(context.eventId);
            // 起こすのは「実際にダメージが入った」とき。回避・無効・0ダメージでは眠ったまま(加算もされていない)。
            const damaged = outcome.dealt !== null && outcome.dealt !== undefined ? outcome.dealt > 0 : outcome.landed === true;
            if (!damaged) return;
            if (event && sleepers.get(event) === record) clearSleeper(event, record, "damaged");
            lastResult = { ...(lastResult || {}), woke: { eventId: context.eventId, bonus: prepared.flat, critical: prepared.forceCritical, dealt: outcome.dealt } };
        }
    };
    const modifiers = () => root.ProjectRCardModifiers;
    const registerHook = () => modifiers()?.registerHitHook?.(HOOK_ID, hook) === true;
    const hookRegistered = registerHook();

    // ---------- 対象の計画(状態を変えない) ----------
    const environment = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const m = map();
        if (!player || !m || typeof player.centerPositionPoint !== "function" || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        const center = player.centerPositionPoint();
        if (![center?.x, center?.y].every(Number.isFinite)) return failure("invalidPlayerPosition");
        return { ok: true, map: m, center: { x: center.x, y: center.y } };
    };
    const computeTargets = center => {
        const occ = occlusion();
        if (typeof occ?.hasLineToPolygon !== "function" || typeof occ?.eventPolygon !== "function") return null;
        const targets = [];
        for (const enemy of map().events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const id = enemy.eventId(), hp = map().getCurrentEventHp(id);
            if (hp == null || hp <= 0) continue;
            const polygon = occ.eventPolygon(enemy);
            if (!Array.isArray(polygon) || polygon.length < 3) continue;
            if (!occ.hasLineToPolygon(center, polygon, { radius: RADIUS_TILES })) continue;
            if (!battlerFor(enemy)?.isAlive?.()) continue;
            targets.push(id);
        }
        return targets.sort((a, b) => a - b);
    };

    // ---------- 発動 ----------
    // 流れ: handlerが対象を計画(状態を変えない・Hermes召喚だけを作る)→ ルーターがカードを消費 → 確定後に睡眠付与・演出。
    let pending = null;
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };

    const prerequisites = () => {
        const missing = [];
        if (!deck.isCardBattleActive()) missing.push("cardBattle");
        if (!stateId()) missing.push("sleepState");
        for (const name of ["hasState"]) if (typeof root[name] !== "function") missing.push(name);
        if (typeof SgetBattlerForH !== "function") missing.push("SgetBattlerForH");
        for (const name of ["AddState", "RemoveState", "UpdateEventHp"]) {
            if (typeof PluginManager._commands?.[`${ENGINE}:${name}`] !== "function") missing.push(`${name}Command`);
        }
        if (!hookRegistered && !registerHook()) missing.push("hitHook");
        return missing;
    };

    const activate = context => {
        const missing = prerequisites();
        if (missing.length) return failure("sleepUnavailable", { detail: missing.join(",") });
        const env = environment();
        if (!env.ok) return failure(env.reason);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        let plan = null;
        const result = summons.perform({ definition: context?.definition, aim: false }, summon => {
            const targets = computeTargets(env.center);
            if (!targets) return failure("occlusionUnavailable");
            plan = { center: env.center, targets, level, effects, summonId: summon.summonId, serial: ++serial };
            return { ok: true };
        });
        if (!result?.ok || !plan) return failure(result?.reason || "activationFailed");
        plan.summonId = result.summonId ?? plan.summonId;
        pending = plan;
        return { ok: true };
    };

    const previousInstant = deck.getActivationHandler("instant");
    deck.registerActivationHandler("instant", context => context.definition.cardId === CARD
        ? activate(context) : previousInstant ? previousInstant(context) : { ok: true });

    const applySleep = (eventId, plan) => {
        const event = map().event(eventId);
        const id = stateId();
        const battler = event ? battlerFor(event) : null;
        if (!event || event._erased || !battler?.isAlive?.()) return false;
        const already = typeof root.hasState === "function" && root.hasState(eventId, id);
        try {
            command("AddState", eventId, id);
            if (!root.hasState(eventId, id)) return false;
            sleepers.set(event, { map: map(), battler, stateId: id, remaining: sleepSeconds(), level: plan.level, effects: plan.effects, serial: plan.serial });
            return true;
        } catch (_error) {
            if (!already) battler.removeState(id); // 付与後の例外で、新しい睡眠を残さない
            return false;
        }
    };

    const present = plan => {
        try { root.ProjectRPresentationVfx?.play("hermes_flute.ripple", {}); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRGodSummonVisual?.requestBalloon?.("hermes", 3); } catch (_error) { /* 表示のみ(3 = 音符) */ }
        void plan;
    };

    const resolve = (plan, activation) => {
        const applied = [];
        for (const eventId of plan.targets) if (applySleep(eventId, plan)) applied.push(eventId);
        present(plan);
        lastResult = { ok: true, consumed: true, level: plan.level, serial: plan.serial, targets: plan.targets.slice(), slept: applied,
            noTarget: plan.targets.length === 0, instanceId: activation?.instanceId ?? null, sleepSeconds: sleepSeconds(), effects: plan.effects };
    };

    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        pending = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (pending) releaseSummon(pending.summonId);
            pending = null;
            throw error;
        }
        const plan = pending;
        pending = null;
        if (!plan) return result;
        if (result?.ok === true && result.cardId === CARD) resolve(plan, result);
        else {
            releaseSummon(plan.summonId);
            lastResult = { ok: false, consumed: false, reason: result?.detail || result?.reason || "notConsumed", rolledBack: true };
        }
        return result;
    };

    // ---------- 時間・後片付け ----------
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        for (const [event, record] of [...sleepers]) {
            if (!deck.isCardBattleActive() || !sleepingNow(event, record) || !record.battler.isAlive()) { clearSleeper(event, record, "invalid"); continue; }
            if (Number.isFinite(seconds) && seconds > 0) {
                record.remaining = Math.max(0, record.remaining - seconds);
                if (record.remaining < 1e-8) clearSleeper(event, record, "expired");
            }
        }
        return result;
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { if (pending) releaseSummon(pending.summonId); pending = null; clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };

    root.ProjectRHermesReedFlute = Object.freeze({
        CARD, LEVELS, RADIUS_TILES,
        plan: () => {
            const env = environment();
            if (!env.ok) return env;
            const targets = computeTargets(env.center);
            return targets ? { ok: true, center: env.center, targets } : failure("occlusionUnavailable");
        },
        isSleeping: eventId => {
            const event = map()?.event(eventId);
            const record = event ? sleepers.get(event) : null;
            return !!record && sleepingNow(event, record);
        },
        getSleepers: () => [...sleepers].map(([event, record]) => ({ eventId: event.eventId(), remaining: record.remaining, level: record.level, serial: record.serial })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        effectsForLevel, cardLevel, sleepSeconds
    });
})();
