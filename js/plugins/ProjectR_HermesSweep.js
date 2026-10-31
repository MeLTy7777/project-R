/*:
 * @target MZ
 * @plugindesc v1.0.0 Hermes「薙ぎ払い」(設計ID 5): マウス方向へ190度・4マスの扇を一度だけ薙ぎ払う。Lv2先端+50 / Lv3クリティカル率+50%。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_HermesSwordsmanship
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_HermesZetsu
 *
 * @param SoundEffect
 * @text 薙ぎ払いの効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「ズシャッ」。RTP同梱のSlash2を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Slash2
 *
 * @help
 * ProjectR_HermesSweep.js
 *
 * 新カード「薙ぎ払い」(ワークブック「カード一覧」のCard ID 5)。ランタイムIDは hermes_sweep(旧Hermes剣術 hermes_sword_attack は
 * そのまま残り、置き換えません)。Hermes / 通常 / 最大3枚 / 最大Lv3 / Cooldown 0.5秒 / Direction。
 * 定義はProjectR_CardCatalogが実行時に追加します(旧7枚のCardDefinitionsとセーブは変更しません)。
 *
 * 【範囲(実際の幾何)】発動の瞬間のマウス方向を固定し、プレイヤー中心から 190度 x 半径4マス の扇を作ります。
 *   敵の判定は、敵Eventの攻撃判定矩形(ProjectR_CombatOcclusion.eventPolygon = Hendrix公式のhitbox)と扇の重なりです。
 *   四方向への近似はしません。扇(190度は凸でない)は95度の凸な2つに分けて、
 *   ProjectR_CombatOcclusion.hasLineToPolygon(from, polygon, {radius, clipPolygon})で
 *   「扇に含まれる敵の部分へ、壁(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)を通らずに届くか」を判定します。
 *   壁越しの敵には当たりません(ワークブックの壁越え=いいえ)。固定のEvent IDは使いません。
 *
 * 【効果(累積レベル。同じ効果の数値は置換、別の効果は足す)】
 *   Lv1: 扇の中の敵に50ダメージ(固定値。1発動につき各敵に1回)。
 *   Lv2: Lv1に加え、扇の「先端1マス」(中心から3〜4マス)に敵の体が触れていたら、その敵へ追加で+50ダメージ(最終ダメージへの加算)。
 *   Lv3: Lv1・Lv2に加え、このカードの攻撃のクリティカル発生率を +50%(加算。パーセントポイント)。
 *        MZのクリティカル率(特殊能力値CRI)は加算で積む規則(公式 itemCri = 使用者CRI x (1 - 対象CEV))なので、それに倣い
 *        「自然な率 + 0.5」(上限100%)とします。倍率はHendrixのcritDmgMultiplier(既定3.0)。相対(x1.5)ではありません。
 *        ※「50%上昇」が相対か加算かはワークブックに明記が無いため、この解釈は設計確認の対象です(docs参照)。
 *
 * 【消費】ワークブックの「対象なし時: カードを消費する」に従い、有効な発動(マウス方向が決まる・扇を作れる)であれば、
 *   敵に当たらなくても消費・Cooldown・補充・Ultimateゲージが通常どおり起きます。無効な発動(マウスがプレイヤーと同じ位置など)は非消費。
 *   ダメージは「消費が確定した後」に与えます(ルーターが消費に失敗したときは、ダメージも演出も出ません)。
 *
 * 【演出】Hermesがプレイヤーの前に現れ(GodSummonVisualのカード別位置)、ケーリュケイオンを振る(公式Swing Weapon)。
 *   白い杖の残像(VFX Designerライブラリ ProjectR_Sweep_Staff)を扇の向きに重ね、主人公は腕を前へ振り払う(ArmSweep)。
 *   通常カットイン(Hermesの目元)。Hermesは黒いノイズ(ProjectR_Hermes_Vanish)とともに消えます。いずれも表示だけで判定を決めません。
 *   VFX/動作/カットインの失敗は、カード消費・ダメージ・Cooldownに影響しません。
 *
 * API: ProjectRHermesSweep
 *   plan(degree?)         現在位置と角度での扇の命中計画(状態を変えない) { degree, center, targets:[{eventId, tip}] }
 *   getLastResult()       直近の発動結果(診断用・保存しない)
 *   effectsForLevel(lv)   累積レベルを解決したeffects      cardLevel()   所持データのレベル(既定1)
 *   geometry              { halfSectors, tipSlices, polar }(テスト用)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "hermes_sweep";
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_HermesSweep") : {};

    // 数値(190度・4マス・先端1マス・Lv別ダメージなど)は data/ProjectR_CardBalance.json(ProjectR_CardBalance)が持つ。ここは幾何の刻みだけ。
    const ARC_STEP_DEGREES = 6;
    const TIP_SLICE_DEGREES = 8;
    const EPSILON = 1e-8;

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
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

    // ---------- 幾何(タイル座標。上=0度・時計回り) ----------
    const polar = (center, radius, degree) => ({ x: center.x + Math.sin(rad(degree)) * radius, y: center.y - Math.cos(rad(degree)) * radius });
    // 弧は「外接」する折れ線(中点が半径Rに接する)にして、hasLineToPolygonのradiusで正確な円弧へ切り詰める。
    const halfSectors = (center, aim, arc = tune("arcDegrees"), radius = tune("radiusTiles")) => [[aim - arc / 2, aim], [aim, aim + arc / 2]].map(([from, to]) => {
        const count = Math.max(1, Math.ceil((to - from) / ARC_STEP_DEGREES));
        const outer = radius / Math.cos(rad((to - from) / count / 2));
        const polygon = [{ x: center.x, y: center.y }];
        for (let i = 0; i <= count; i++) polygon.push(polar(center, outer, from + (to - from) * i / count));
        return polygon;
    });
    // 先端(中心から TIP_TILES 手前〜外周)の細い扇形。各片は凸(台形)。
    const tipSlices = (center, aim, arc = tune("arcDegrees"), radius = tune("radiusTiles"), tip = tune("tipTiles")) => {
        const count = Math.ceil(arc / TIP_SLICE_DEGREES), slices = [];
        for (let i = 0; i < count; i++) {
            const from = aim - arc / 2 + arc * i / count, to = aim - arc / 2 + arc * (i + 1) / count;
            const half = rad((to - from) / 2), inner = (radius - tip) / Math.cos(half), outer = radius / Math.cos(half);
            slices.push([polar(center, inner, from), polar(center, outer, from), polar(center, outer, to), polar(center, inner, to)]);
        }
        return slices;
    };

    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const sectorTouches = (apex, polygon, clips, radius) =>
        clips.some(clip => occlusion().hasLineToPolygon(apex, polygon, { radius, clipPolygon: clip }));

    // 命中する敵の一覧(状態を変えない)。center: プレイヤー中心(タイル座標)。degree: 0=上・時計回り。
    const computeTargets = (center, degree, withTip) => {
        const map = $gameMap;
        const occ = occlusion();
        if (typeof occ?.hasLineToPolygon !== "function" || typeof occ?.eventPolygon !== "function") return null;
        const halves = halfSectors(center, degree), slices = withTip ? tipSlices(center, degree) : [];
        const targets = [];
        for (const enemy of map.events()) {
            if (!enemy || enemy._erased || !enemy.event()?.note?.includes("<enemy>")) continue;
            const enemyId = enemy.eventId(), hp = map.getCurrentEventHp(enemyId);
            if (hp == null || hp <= 0) continue;
            const polygon = occ.eventPolygon(enemy);
            if (!Array.isArray(polygon) || polygon.length < 3) continue;
            if (!sectorTouches(center, polygon, halves, tune("radiusTiles"))) continue;
            targets.push({ eventId: enemyId, tip: withTip ? sectorTouches(center, polygon, slices, tune("radiusTiles")) : false });
        }
        return targets.sort((a, b) => a.eventId - b.eventId);
    };

    const environment = () => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!player || !map || typeof player.centerPositionPoint !== "function" || typeof map.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof PluginManager._commands?.[`${ENGINE}:UpdateEventHp`] !== "function") return failure("actionCombatUnavailable");
        const center = player.centerPositionPoint();
        if (![center?.x, center?.y].every(Number.isFinite)) return failure("invalidPlayerPosition");
        return { ok: true, player, map, center: { x: center.x, y: center.y } };
    };

    // ---------- 発動 ----------
    // 流れ: handlerが「命中する敵」を計画(状態を変えない・Hermes召喚だけを作る)→ ルーターがカードを消費 → 確定後にダメージ・演出。
    let pending = null;
    let lastResult = null;
    let serial = 0;

    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };

    const activate = context => {
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (!balanceReady()) return failure("balanceUnavailable");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        if (typeof occlusion()?.hasLineToPolygon !== "function") return failure("occlusionUnavailable");
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        let plan = null;
        // Hermes一時召喚(表示用の論理アンカー)。マウス方向をここで固定する。マウスがプレイヤーと同じ位置などで方向が決まらなければ失敗(非消費)。
        const result = summons.perform({ definition: context?.definition }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            const degree = normalize(summon.degree);
            const targets = computeTargets(env.center, degree, effects.tipBonus > 0);
            if (!targets) return failure("occlusionUnavailable");
            plan = { degree, center: env.center, targets, level, effects, element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier"), summonId: summon.summonId, serial: ++serial };
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

    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:hermes_sweep" }, apply) : apply();
    };

    const present = plan => {
        try { root.ProjectRPresentationVfx?.play("hermes_sweep.staff", { degree: plan.degree }); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("hermes", plan.degree, "ProjectR_Caduceus_DEV"); } catch (_error) { /* 表示のみ */ }
        try {
            const name = String(params.SoundEffect === undefined ? "Slash2" : params.SoundEffect).trim();
            if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume: 85, pitch: 100, pan: 0 });
        } catch (_error) { /* 表示のみ */ }
    };

    // 消費が確定した後: 命中した敵それぞれに1回だけダメージ(固定値。クリティカル判定・加算はCardModifiersの固定ダメージ窓口)。
    const resolve = (plan, activation) => {
        const hits = [];
        for (const target of plan.targets) {
            const event = $gameMap.event(target.eventId);
            if (!event || event._erased) continue;
            const tipBonus = target.tip && plan.effects.tipBonus > 0 ? plan.effects.tipBonus : 0;
            try {
                trackDamage(target.eventId, `sweep:${plan.serial}`, () => command("UpdateEventHp", {
                    eventId: String(target.eventId), value: `-${plan.effects.damage}`, exceedMaxHealth: "false",
                    projectRFixed: { base: plan.effects.damage, flat: tipBonus, critChanceBonus: plan.effects.criticalChanceBonus || 0, source: CARD, element: plan.element, weaknessMultiplier: plan.weaknessMultiplier }
                }));
                hits.push({ eventId: target.eventId, tip: !!target.tip, tipBonus });
            } catch (error) {
                hits.push({ eventId: target.eventId, tip: !!target.tip, error: String(error?.message || error) });
            }
        }
        present(plan);
        lastResult = { ok: true, consumed: true, level: plan.level, degree: plan.degree, serial: plan.serial, targets: plan.targets.length,
            hits, instanceId: activation?.instanceId ?? null, effects: plan.effects };
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

    root.ProjectRHermesSweep = Object.freeze({
        CARD,
        get LEVELS() { return balance().levels(CARD); },
        get ARC_DEGREES() { return tune("arcDegrees"); },
        get RADIUS_TILES() { return tune("radiusTiles"); },
        get TIP_TILES() { return tune("tipTiles"); },
        plan: degree => {
            const env = environment();
            if (!env.ok) return env;
            const aim = Number.isFinite(degree) ? normalize(degree) : 0;
            const targets = computeTargets(env.center, aim, true);
            return targets ? { ok: true, degree: aim, center: env.center, targets } : failure("occlusionUnavailable");
        },
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        effectsForLevel, cardLevel,
        // 扇と多角形(タイル座標)の判定そのもの(テスト用)。壁は現在のマップのもの。
        geometry: Object.freeze({ halfSectors, tipSlices, polar,
            touches: (center, aim, polygon, withTip = false) => ({
                hit: sectorTouches(center, polygon, halfSectors(center, normalize(aim)), tune("radiusTiles")),
                tip: withTip ? sectorTouches(center, polygon, tipSlices(center, normalize(aim)), tune("radiusTiles")) : false }) })
    });
})();
