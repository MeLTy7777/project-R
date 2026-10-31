/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「一閃」(設計ID 1): マウス方向へ最大11マスの一直線の居合斬り。防御無視200ダメージ + 3秒かけて分割ダメージ(Lv3は移動速度-50%)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_HermesStrength
 *
 * @param PathWidthTiles
 * @text 斬撃の経路の幅(tile・暫定)
 * @desc ワークブックに幅の指定は無いため暫定。Hermesの体の幅(約1マス)。経路上でこの幅に敵の判定矩形が触れたら命中。
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 1
 *
 * @param SplitTicks
 * @text 分割ダメージの回数(暫定)
 * @desc ワークブックに間隔の指定は無いため暫定。3秒を等間隔にこの回数で分けて与える(合計は必ず保存される)。既定3 = 1秒ごと。
 * @type number
 * @min 1
 * @max 30
 * @default 3
 *
 * @help
 * ProjectR_HermesIssen.js
 *
 * 新カード「一閃」(ワークブック「カード一覧」のCard ID 1)。ランタイムIDは hermes_issen。
 * Hermes / 強力 / 最大3枚 / 最大Lv3 / Cooldown 7秒 / Direction / 射程11マス。定義はProjectR_CardCatalogが実行時に追加します。
 *
 * 【攻撃(1発動 = 1つの権威ある攻撃)】発動の瞬間のマウス方向を固定し、プレイヤー中心から一直線に最大11マス。
 *   経路は壁(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)の手前で止まり、壁越しには届きません(ProjectR_CombatOcclusion.firstBlockerBetween)。
 *   経路の幅(PathWidthTiles、暫定1マス)に敵Eventの攻撃判定矩形が触れた敵が命中。複数の敵に当たり、各敵に1発動1回だけ(固定のEvent IDなし)。
 *   Hermesが動いて斬る見た目で、主人公は動きません(テレポートなどの副作用なし)。命中は消費が確定した瞬間に解決し、VFXの寿命とは無関係です。
 *   有効な発動(マウス方向が決まる)なら、誰にも当たらなくてもカードを消費します。無効(マウスがプレイヤーと同じ位置)は非消費。
 *
 * 【ダメージ】
 *   直接ダメージ: 命中時に防御を無視した 200(固定値。ワークブックの「ヒット時防御無視で200ダメージ」)。クリティカルは掛けない(暫定)。
 *   分割ダメージ(スプリットダメージ。ワークブックの定義が無いため暫定: 「3秒かけて与える継続ダメージ」。複数の対象で分け合うダメージではない):
 *     Lv1: 合計50 / Lv2: 合計100(置換) / Lv3: 合計100(維持) + その敵の移動速度 -50% を3秒。
 *     直接の200とは別。3秒を SplitTicks 回(既定3回 = 1秒ごと)に等分し、端数は先の回へ(50 = 17,17,16 / 100 = 34,33,33)。合計は必ず保存。
 *     毎回の100ではなく、3秒の合計が100。各回は防御無視の固定ダメージで、クリティカルは掛けない(暫定・設定は1か所)。
 *     再命中は「置換」(残りを捨てて新しい合計を最初から。重ねない)。戦闘時間(カードのCooldownと同じ時計)で進み、操作不能中は止まる。
 *     対象が倒れた・消えた・マップ移動・戦闘終了・ロード・主人公の死亡で止まる(残りのダメージは与えない)。
 *   移動速度低下: ProjectR_CardModifiers.setCharacterSpeedFactor で、その敵Eventの移動距離(distancePerFrame)に x0.5。他の係数は残り、期限で自分の係数だけ外れる。
 *     ※アリーナの敵は動かないため、実機では移動距離(distancePerFrame と実際の移動)で確認する。共通Enemy AIが無い間、AIの移動計画は未接続。
 *
 * 【演出】Hermesが前に現れて11マス(または壁の手前まで)を駆け、白と黒の雷が経路に一瞬光る(VFX Designerライブラリ
 *   ProjectR_Issen_Trail / ProjectR_Issen_Lightning)。主人公は腕を前に振り払う(ArmSweep)。通常カットイン。Hermesは黒いノイズとともに消える。
 *   風を切る音は検証済みの素材が無く未用意。VFXに攻撃の権限は無い。
 *
 * API: ProjectRHermesIssen
 *   plan(degree?)  現在位置と角度での計画(状態を変えない) { degree, length, targets:[{eventId, distance}] }
 *   getActiveSplits() / getLastResult() / effectsForLevel(lv) / cardLevel() / splitSchedule(total, ticks) / geometry
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "hermes_issen";
    const SPEED_ID = CARD;
    // 数値(射程11マス・直接ダメージ200・分割ダメージ・鈍足・軌道の幅・分割回数など)は data/ProjectR_CardBalance.json(ProjectR_CardBalance)が持つ。
    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const tune = key => balance().constant(CARD, key);
    const EPSILON = 1e-8;

    const effectsForLevel = level => balance().effects(CARD, level);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = degree => degree * Math.PI / 180;
    const normalize = degree => ((degree % 360) + 360) % 360;

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

    // 合計を ticks 回へ等分(端数は先の回へ)。合計は必ず保存される。
    const splitSchedule = (total, ticks = tune("splitTicks")) => {
        const count = Math.max(1, Math.floor(ticks)), whole = Math.max(0, Math.round(total));
        const base = Math.floor(whole / count), remainder = whole - base * count;
        return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
    };

    // ---------- 幾何(タイル座標。上=0度・時計回り) ----------
    const axes = polygon => polygon.map((p, i) => { const q = polygon[(i + 1) % polygon.length]; return { x: -(q.y - p.y), y: q.x - p.x }; });
    // 凸な2つの多角形が重なるか(SAT。接するだけは重ならない扱いにしない=触れたら命中)
    const overlap = (a, b) => {
        for (const axis of [...axes(a), ...axes(b)]) {
            if (Math.abs(axis.x) + Math.abs(axis.y) < EPSILON) continue;
            const pa = a.map(p => p.x * axis.x + p.y * axis.y), pb = b.map(p => p.x * axis.x + p.y * axis.y);
            if (Math.max(...pa) < Math.min(...pb) - EPSILON || Math.max(...pb) < Math.min(...pa) - EPSILON) return false;
        }
        return true;
    };
    const routeRect = (center, degree, length, width) => {
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree)), nx = -uy, ny = ux, h = width / 2;
        const a = { x: center.x, y: center.y }, b = { x: center.x + ux * length, y: center.y + uy * length };
        return [{ x: a.x + nx * h, y: a.y + ny * h }, { x: b.x + nx * h, y: b.y + ny * h }, { x: b.x - nx * h, y: b.y - ny * h }, { x: a.x - nx * h, y: a.y - ny * h }];
    };
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;

    // 壁の手前までの長さ(最大11マス)
    const routeLength = (center, degree) => {
        const range = tune("rangeTiles");
        const end = { x: center.x + Math.sin(rad(degree)) * range, y: center.y - Math.cos(rad(degree)) * range };
        const hit = occlusion().firstBlockerBetween(center, end, { mode: "combat", unwrapped: true });
        return hit ? Math.max(0, Math.min(range, hit.distance)) : range;
    };
    const computeTargets = (center, degree) => {
        const map = $gameMap, occ = occlusion();
        if (typeof occ?.firstBlockerBetween !== "function" || typeof occ?.eventPolygon !== "function") return null;
        const length = routeLength(center, degree);
        const rect = routeRect(center, degree, length, tune("pathWidthTiles")), ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree));
        const targets = [];
        for (const enemy of map.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const id = enemy.eventId(), hp = map.getCurrentEventHp(id);
            if (hp == null || hp <= 0) continue;
            const polygon = occ.eventPolygon(enemy);
            if (!Array.isArray(polygon) || polygon.length < 3 || !overlap(rect, polygon)) continue;
            const distance = Math.min(...polygon.map(p => (p.x - center.x) * ux + (p.y - center.y) * uy));
            targets.push({ eventId: id, distance: Math.max(0, distance) });
        }
        return { length, targets: targets.sort((a, b) => a.distance - b.distance || a.eventId - b.eventId) };
    };

    const environment = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!player || !map || typeof player.centerPositionPoint !== "function" || typeof map.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof PluginManager._commands?.[`${ENGINE}:UpdateEventHp`] !== "function") return failure("actionCombatUnavailable");
        const center = player.centerPositionPoint();
        if (![center?.x, center?.y].every(Number.isFinite)) return failure("invalidPlayerPosition");
        return { ok: true, center: { x: center.x, y: center.y } };
    };

    // ---------- 分割ダメージ・速度低下(実行時のみ。保存しない) ----------
    const splits = new Map(); // event -> { map, tickAmounts, interval, elapsed, next, slowRemaining, level, serial }
    let lastResult = null;
    let serial = 0;
    const modifiers = () => root.ProjectRCardModifiers;
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:hermes_issen" }, apply) : apply();
    };
    const dealFixed = (eventId, base, source, attackId, elemental = {}) => trackDamage(eventId, attackId, () => command("UpdateEventHp", {
        eventId: String(eventId), value: `-${base}`, exceedMaxHealth: "false",
        projectRFixed: { base, flat: 0, critical: false, source, element: elemental.element, weaknessMultiplier: elemental.weaknessMultiplier }
    }));

    const endSplit = (event, record, reason) => {
        splits.delete(event);
        try { modifiers()?.clearCharacterSpeedFactor?.(event, SPEED_ID); } catch (_error) { /* noop */ }
        lastResult = lastResult && { ...lastResult, lastEnd: { eventId: event.eventId(), reason } };
        void record;
    };
    const clearAll = reason => { for (const [event, record] of [...splits]) endSplit(event, record, reason); };
    // HPは公式HPバーを優先して読む(getCurrentEventHpの変数は表示の次のフレームで更新されるため)。
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : ($gameMap.getCurrentEventHp(id) ?? 0); };
    const alive = (event, record) => !!event && !event._erased && record.map === $gameMap && $gameMap.event(event.eventId()) === event && hpOf(event.eventId()) > 0;

    // 戦闘時間(カードのCooldownと同じ時計)で進める。操作不能中は進まない。
    const tick = seconds => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const [event, record] of [...splits]) {
            if (!alive(event, record)) { endSplit(event, record, "targetGone"); continue; }
            record.elapsed += seconds;
            while (record.next < record.tickAmounts.length && record.elapsed + EPSILON >= (record.next + 1) * record.interval) {
                const amount = record.tickAmounts[record.next++];
                try { dealFixed(event.eventId(), amount, "hermes_issen_split", `issen:${record.serial}:${record.next}`, record); } catch (_error) { /* 次のtickへ */ }
                record.dealt += amount;
                if (!alive(event, record)) break;
            }
            if (record.slowRemaining > 0) {
                record.slowRemaining = Math.max(0, record.slowRemaining - seconds);
                if (record.slowRemaining < EPSILON) modifiers()?.clearCharacterSpeedFactor?.(event, SPEED_ID);
            }
            if (!alive(event, record)) { endSplit(event, record, "targetDied"); continue; }
            if (record.next >= record.tickAmounts.length && record.slowRemaining < EPSILON) endSplit(event, record, "finished");
        }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (!deck.isCardBattleActive()) clearAll("battleInactive"); else tick(seconds);
        return result;
    };

    const startSplit = (eventId, plan) => {
        const event = $gameMap.event(eventId);
        if (!event || event._erased) return false;
        // 再命中は置換: 古い予定と速度係数を捨てて、新しい合計を最初から。
        const old = splits.get(event);
        if (old) endSplit(event, old, "replaced");
        const amounts = splitSchedule(plan.effects.splitTotal, plan.splitTicks);
        const record = { map: $gameMap, tickAmounts: amounts, interval: plan.effects.splitSeconds / amounts.length, elapsed: 0, next: 0, dealt: 0,
            slowRemaining: 0, level: plan.level, serial: ++serial, element: plan.element, weaknessMultiplier: plan.weaknessMultiplier };
        if (plan.effects.slowFactor && modifiers()?.setCharacterSpeedFactor?.(event, SPEED_ID, plan.effects.slowFactor)?.ok) record.slowRemaining = plan.effects.slowSeconds;
        splits.set(event, record);
        return true;
    };

    // ---------- 発動 ----------
    // 流れ: handlerが経路と命中を計画(状態を変えない・Hermes召喚だけ)→ ルーターがカードを消費 → 確定後に直接ダメージ・分割ダメージ・演出。
    let pending = null;
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };

    const activate = context => {
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (!balanceReady()) return failure("balanceUnavailable");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        if (typeof occlusion()?.firstBlockerBetween !== "function") return failure("occlusionUnavailable");
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        let plan = null;
        const result = summons.perform({ definition: context?.definition }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            const degree = normalize(summon.degree);
            const route = computeTargets(env.center, degree);
            if (!route) return failure("occlusionUnavailable");
            plan = { degree, center: env.center, length: route.length, targets: route.targets, level, effects, splitTicks: Math.floor(tune("splitTicks")), element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier"), summonId: summon.summonId, serial: ++serial };
            return { ok: true };
        });
        if (!result?.ok || !plan) return failure(result?.reason || "activationFailed");
        plan.summonId = result.summonId ?? plan.summonId;
        pending = plan;
        return { ok: true };
    };
    const previousDirection = deck.getActivationHandler("direction");
    deck.registerActivationHandler("direction", context => context.definition.cardId === CARD
        ? activate(context) : previousDirection ? previousDirection(context) : { ok: true });

    const present = plan => {
        try { root.ProjectRPresentationVfx?.play("hermes_issen.trail", { degree: plan.degree, length: plan.length }); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRPresentationVfx?.play("hermes_issen.lightning", { degree: plan.degree, length: plan.length }); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRGodSummonVisual?.dash?.("hermes", plan.degree, plan.length, 8); } catch (_error) { /* 表示のみ */ }
    };

    // 消費が確定した後: 経路上の各敵へ防御無視の直接ダメージを1回ずつ(経路の手前から順に)、分割ダメージを開始する。
    const resolve = (plan, activation) => {
        const hits = [];
        for (const target of plan.targets) {
            const event = $gameMap.event(target.eventId);
            if (!event || event._erased) continue;
            try {
                dealFixed(target.eventId, plan.effects.directDamage, CARD, `issen:${plan.serial}`, plan);
                const started = startSplit(target.eventId, plan); // 倒れていたら次のtickで終わる
                hits.push({ eventId: target.eventId, distance: target.distance, split: started });
            } catch (error) {
                hits.push({ eventId: target.eventId, distance: target.distance, error: String(error?.message || error) });
            }
        }
        present(plan);
        lastResult = { ok: true, consumed: true, level: plan.level, degree: plan.degree, length: plan.length, serial: plan.serial, targets: plan.targets.length,
            hits, instanceId: activation?.instanceId ?? null, effects: plan.effects, splitTicks: plan.splitTicks };
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

    // ---------- 後片付け ----------
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { if (pending) releaseSummon(pending.summonId); pending = null; clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive && splits.size && root.ProjectR?.PlayerDeath?.isDead?.() === true) clearAll("playerDead");
    };

    root.ProjectRHermesIssen = Object.freeze({
        CARD,
        get LEVELS() { return balance().levels(CARD); },
        get RANGE_TILES() { return tune("rangeTiles"); },
        get DIRECT_DAMAGE() { return effectsForLevel(1).directDamage; },
        get PATH_WIDTH() { return tune("pathWidthTiles"); },
        get SPLIT_TICKS() { return tune("splitTicks"); },
        plan: degree => {
            const env = environment();
            if (!env.ok) return env;
            const aim = Number.isFinite(degree) ? normalize(degree) : 0;
            const route = computeTargets(env.center, aim);
            return route ? { ok: true, degree: aim, center: env.center, length: route.length, targets: route.targets } : failure("occlusionUnavailable");
        },
        getActiveSplits: () => [...splits].map(([event, r]) => ({ eventId: event.eventId(), next: r.next, ticks: r.tickAmounts.slice(), dealt: r.dealt,
            elapsed: r.elapsed, slowRemaining: r.slowRemaining, level: r.level, serial: r.serial })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        effectsForLevel, cardLevel, splitSchedule,
        geometry: Object.freeze({ overlap, routeRect, routeLength })
    });
})();
