/*:
 * @target MZ
 * @plugindesc v1.2.0 Apollo「黄金の矢」(設計ID 8 / apollo_golden_volley) Lv1〜3: 矢を3/5/11本同時に発射。Lv3は長押しで幅3マスのビーム(連続ヒット・ヒットストップ)。命中が確定してから消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_HitStop
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_HitStop
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 * @orderAfter ProjectR_HermesZetsu
 *
 * @param SoundEffect
 * @text 発射の効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「竪琴の1音」。RTP同梱のChime2を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Chime2
 *
 * @param HitSoundEffect
 * @text ビームの1ヒットごとの効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックは「連続ヒットするたびに竪琴が鳴る」。竪琴の素材は無いので、RTPのChime1を仮に当てています(専用音ができたらここだけ差し替え)。短い間隔のヒットは間引いて鳴らします。
 * @type string
 * @default Chime1
 *
 * @help
 * ProjectR_ApolloGoldenVolley.js
 *
 * 新カード「黄金の矢」(ワークブック「カード一覧」のCard ID 8)。ランタイムIDは apollo_golden_volley。旧「黄金の弓矢」
 * (apollo_golden_arrow)はそのまま残り、置き換えません。Apollo / 強力 / 最大5枚 / 最大Lv3 / Cooldown 3秒 / Ground。
 * 数値はすべて data/ProjectR_CardBalance.json(開発用エディタ F6)が持ちます。このPluginは幾何と手順だけを持ちます。
 * Phase A4でLv1〜2、Phase A5AでLv3の「通常の扇」と長押し入力の分岐(予約)を実装しました。
 * Phase A5BでLv3のビーム本体(長押し0.5秒で幅3マスのビーム・連続ヒット・ヒットストップ)を実装しました。
 *
 * 【Lv3(Phase A5A)】
 *   Lv3だけ、このカードのキーは「押した瞬間」ではなく「離した時」に発動します(A3の押下時間の検出。`when` でLv3のときだけ有効。Lv1〜2は従来どおり即時)。
 *   ・0.5秒(戦闘時計で30更新)未満で離す(tap): 11本・間隔10度の扇を発射(中心=離した直後のマウス方向。中央の太い矢とスリップ100はLv2から引き継ぐ)。
 *   ・0.5秒以上押して離す(hold): ビームを撃つ(下の【ビーム】)。扇は撃たない。
 *   ・1回の入力で両方は発動しない(1回の押下につき発動の依頼は1回)。押している間の取消(手札の入れ替わり・会話・フォーカス喪失・戦闘終了)では何も発動しない。
 *   ・消費は A4 と同じ: 扇のいずれかの矢が最初に当たった瞬間に1回だけ。全部外れたら消費しない。
 *
 * 【効果(累積レベル。同じ効果の数値は置換、別の効果は足す)】
 *   Lv1: マウス方向へ、高速でまっすぐ飛ぶ黄金の矢を3本同時に発射。矢の間隔は15度。1本につき固定50ダメージ。
 *   Lv2: 矢が5本になる(間隔は15度のまま)。中央(まっすぐ飛ぶ)の1本が太くなり、当たった敵に5秒間で計100のスリップダメージ。
 *   ・「太さ(0.9マス)」「5本の中央が1本(奇数のときだけ)」「速さ(20マス/秒)」「射程(40マス)」はワークブックに数値が無いため、
 *     仮の既定値です(ProjectR_CardBalance.jsonで変えられます)。スリップの重ねがけ規則は未決定のため、Issenの分割ダメージと同じ
 *     「再命中は置換(新しい合計を最初から)」にしています。
 *
 * 【狙い】発動の瞬間のマウス方向を固定します(Ground=マウス位置。効果は「指定の方向」へ撃つ)。矢はrotateToを一度だけ設定し、
 *   以後のマウス移動には追従しません。マウスがプレイヤーと同じ位置で方向が決まらないときは失敗(非消費)。
 *
 * 【壁】矢は壁を通り抜けません(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁。ProjectR_CombatOcclusion.firstBlockerBetween)。
 *   矢の体(公式のhitbox)を掃いて判定するので、速い矢でも壁や敵をすり抜けません。マップの端・<destroyProjectile>は公式checkCollideで判定。
 *
 * 【命中と消費(二段階の取引。絶と同じ予約→確定)】
 *   ワークブック: 成功=射程内の敵にヒット / 失敗=攻撃が外れる。外れたらカードを消費しない(既存の非消費の方針)。
 *   1. 予約: 発動キーで矢を発射する(演出・矢は出る)。このときカードはまだ消費しない(Cooldown・補充・Ultimateゲージも起きない)。
 *   2. 確定: いずれかの矢が敵に最初に当たった瞬間に、正規の経路(requestUseCard)でカードを1回だけ消費し、その命中のダメージを与える。
 *      以後に当たる他の矢も、それぞれ1回ずつダメージを与える(貫通なし。1本につき1回当たると消える)。
 *   3. 全部の矢が何にも当たらずに消えたら失敗。カードは消費されません。
 *   予約中(確定待ち)は、同じカードの発動はすべて「volleyPending」で非消費の失敗です(二重発射・二重消費を防ぐ)。
 *   確定時にカードが手札から消えていた・戦闘が終わっていた・消費に失敗したときは、矢を消して何も与えません。
 *
 * 【ビーム(Phase A5B。Lv3のhold)】
 *   ・離した直後のマウス方向へ、幅3マスのビームの先端が秒40マスで進む(追尾しない)。原点はプレイヤーの中心から。射程40マス。
 *     壁(Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)とマップの端で先端が止まる(中心線で判定)。壁の向こう・遮られた敵には当たらない(各敵の見える部分で判定)。
 *   ・連続ヒット: 先端が1/3マス進むごとに1サンプル。幅の中にいる敵はサンプルごとに1ヒット(1ヒット50ダメージ)。同じ敵へは1回の発動で最大11ヒット(上限550)。
 *     サンプル番号は敵ごとに1回だけなので、重なった判定で二重に当たらない。敵ごとにヒット数を数える。550は「最大」で、保証ではない(壁・射程・位置で減る)。
 *   ・ダメージは固定ダメージ(projectRFixed)で、UpdateEventHpを1ヒットにつき1回。属性・被ダメージ修飾の窓口を1回ずつ通る(迂回・二重はなし)。
 *   ・Lv2のスリップ(5秒で計100)は、ビームが当たった敵に、その敵への最初のヒットで1回だけ始める(既存の置換=更新。重ねない)。
 *   ・ヒットストップ(ProjectR_HitStop): 1ヒットで当たった敵だけを3frame止める(更新。重ねがけで伸ばさない)。1発動・1体あたり合計30frameまで。
 *     戦闘の時計・プレイヤー・入力・矢・Cooldown・他の敵は止めない。ダメージのタイミングは変えない。
 *   ・消費: 最初の有効なヒットで1回だけ(矢と同じ予約→確定)。1ヒットも無ければ消費しない。確定待ちの間の再入力は volleyPending で拒否。
 *   ・数値はすべて ProjectR_CardBalance.json の beam* / hitStop* (開発用エディタ F6)。仮の既定値で、最終のバランス承認を待っている。
 *
 * 【演出】Apolloが主人公の前に現れて弓を引き(公式Swing Weaponで弓の画像を振る)、主人公は手を前に突き出す(ArmExtend)。
 *   通常カットイン(Apolloの目元)、黄金の矢(電撃の光をまとう矢の絵)、発射の閃光(VFX Designerライブラリ ProjectR_Volley_Burst)、
 *   Apolloから漂う光の粒子(ProjectR_Volley_Particles)。いずれも表示だけで判定を決めず、失敗してもカード消費・ダメージに影響しません。
 *   カットイン・主人公の動作は「消費が確定した成功」ではなく発射時に出します(外れても発射の演出は出る)。確定時に重ねて出しません。
 *
 * API: ProjectRApolloGoldenVolley
 *   effectsForLevel(lv) / cardLevel()      累積レベルを解決したeffects / 所持データのレベル(既定1)
 *   arrowDegrees(aim, count?, spacing?)    発射角の一覧(中央=aim。0=上・時計回り)
 *   isPending() / getPending()             確定待ちの発射(あれば)
 *   getActiveVolleys() / getActiveArrows() 飛んでいる矢(診断用)   getActiveSlips()  継続中のスリップ
 *   getLastResult()                        直近の発射の結果(診断用・保存しない)。ビームは targets(敵ごとのヒット数とダメージ)を持つ
 *   getBeam() / getBeamLog()               いま飛んでいるビームの状態(先端・サンプル・敵ごとのヒット数) / 撃ったビームの記録
 *   slipSchedule(total, ticks?)            スリップの各回の量(合計は必ず保たれる)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_golden_volley";
    const TAG = "<projectRGoldenVolley>";
    const TEMPLATE_NAME = "ProjectR Apollo Golden Volley Arrow";
    const THICK_IMAGE = "VFX/$ProjectR_GoldenArrowThick";
    const BOW_SPRITE = "ProjectR_Bow_DEV";
    const IMPLEMENTED_MAX_LEVEL = 3; // Lv3はビームまで実装(A5B)
    const BEAM_LEVEL = 3;
    const HOLD_SECONDS = 0.5; // Lv3: これ以上押して離すとビーム(戦闘時計で30更新)
    const BEAM_VFX_FRAMES = 30; // ビームのVFX(8コマ / 18fps)が終わるまでのframe。過ぎたら公式のdisposeで確実に外す
    const HIT_SOUND_GAP_FRAMES = 4; // ビームの連続ヒットの効果音は、この間隔より近いものを間引く
    const BEAM_RECORD_LIMIT = 400; // 診断に残す個別ヒットの上限
    const TEMPLATE_HITBOX = 0.3;
    const ALONG_TILES = 0.3; // 矢のhitboxの進行方向の長さ(幅だけが可変)
    const EPSILON = 1e-8;
    const PARTICLE_WAIT_FRAMES = 12;
    const STALL_RATIO = 0.25; // 本来の1frameの歩幅のこの割合未満しか進まない状態が STALL_FRAMES 続いたら、止まった矢
    const STALL_FRAMES = 4;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloGoldenVolley") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = degree => degree * Math.PI / 180;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;

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

    // 発射角: 中央が狙い、左右へ spacing 度ずつ。本数が偶数のときは狙いの左右に対称に並ぶ(中央の1本は無い)。
    const arrowDegrees = (aim, count, spacing) => {
        const n = Math.max(1, Math.floor(count)), step = Number(spacing) || 0;
        return Array.from({ length: n }, (_, i) => normalize(aim + (i - (n - 1) / 2) * step));
    };
    const centerIndexOf = count => (Math.floor(count) % 2 === 1 ? (Math.floor(count) - 1) / 2 : -1);
    // 合計をticks回へ等分(端数は先の回へ)。合計は必ず保存される。
    const slipSchedule = (total, ticks = tune("splitTicks")) => {
        const count = Math.max(1, Math.floor(ticks)), whole = Math.max(0, Math.round(total));
        const base = Math.floor(whole / count), remainder = whole - base * count;
        return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
    };
    // バランス設定の「マス/秒」を、MZの移動速度(2^速度/256 マス/frame)へ。
    const moveSpeedFor = tilesPerSecond => Math.log2(Math.max(0.01, tilesPerSecond) * 256 / 60);

    // ---------- 環境・Hendrix呼び出し ----------
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:apollo_golden_volley" }, apply) : apply();
    };
    const dealFixed = (eventId, base, attackId, plan, natural) => trackDamage(eventId, attackId, () => command("UpdateEventHp", {
        eventId: String(eventId), value: `-${base}`, exceedMaxHealth: "false",
        projectRFixed: Object.assign({ base, flat: 0, source: CARD, element: plan.element, weaknessMultiplier: plan.weaknessMultiplier }, natural ? {} : { critical: false })
    }));
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = event => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>");
    const isArrow = event => !!event?.event?.()?.note?.includes(TAG);
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };
    const centerOf = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });

    const environment = () => {
        const m = map();
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !m || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof DotMoveSystem === "undefined" || typeof m.spawnEvent !== "function" || typeof root.checkCollide !== "function") return failure("actionCombatUnavailable");
        if (!["UpdateEventHp", "DestroyEvent", "ChangeHitboxData"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) return failure("actionCombatUnavailable");
        const occ = occlusion();
        if (typeof occ?.firstBlockerBetween !== "function" || typeof occ?.firstContact !== "function" || typeof occ?.eventPolygon !== "function") return failure("occlusionUnavailable");
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG)) return failure("projectileTemplateUnavailable");
        return { ok: true, map: m, template };
    };

    // ---------- 矢・発射(取引) ----------
    const volleys = new Map(); // serial -> volley
    const slips = new Map(); // enemy event -> { map, tickAmounts, interval, elapsed, next, dealt, serial, ... }
    let serial = 0;
    let pendingVolley = null; // 確定待ち(まだ消費していない)
    let reserve = null; // handlerが立てた予約(requestUseCardの同期呼び出しの間だけ)
    let mode = null; // "commit"のときだけ、handlerは立てずに成功を返す
    let commitPlan = null;
    let lastResult = null;
    let particleWait = null;
    const slipSerial = { value: 0 };

    const destroyArrow = arrow => {
        if (arrow.gone) return;
        arrow.gone = true;
        const m = map();
        if (!m || arrow.map !== m || m.event(arrow.eventId) !== arrow.event) return;
        try { command("DestroyEvent", { target: String(arrow.eventId), destroyNearby: "", permanent: "false" }, arrow.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const destroyVolley = volley => {
        for (const arrow of volley.arrows) destroyArrow(arrow);
        if (volley.kind === "beam") releaseHitStop(volley);
    };
    const liveArrows = volley => volley.arrows.filter(arrow => !arrow.gone);

    const spawnArrow = (env, spec) => {
        const m = env.map, before = new Set(m.events());
        try {
            const id = m.spawnEvent(env.template.id, spec.x, spec.y, false, spec.degree);
            const event = id && m.event(id);
            if (!event || before.has(event) || !isArrow(event) || typeof event.rotateTo !== "function") throw Error("projectileCreationFailed");
            event.rotateTo(spec.degree); // 発射時に一度だけ。以後マウスは見ない(追尾なし)。
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - spec.degree) > 0.000001) throw Error("projectileRotationFailed");
            event.setMoveSpeed(spec.moveSpeed);
            if (spec.thick) event.setImage(THICK_IMAGE, 0);
            // hitboxの幅(進行方向に直交する長さ)だけ変える。ChangeHitboxDataは0を「変更なし」と読むため、オフセットには微小値を渡す。
            if (Math.abs(spec.width - TEMPLATE_HITBOX) > EPSILON) {
                command("ChangeHitboxData", { eventId: String(id), width: String(spec.width), height: String(ALONG_TILES), offsetX: "0.0001", offsetY: "0.0001" }, id);
            }
            return { ok: true, arrow: { eventId: id, event, map: m, index: spec.index, degree: spec.degree, thick: !!spec.thick, width: spec.width,
                age: 0, last: null, origin: null, travelled: 0, stalled: 0, gone: false, hit: null } };
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isArrow(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
            return failure(String(error?.message || error));
        }
    };

    const activationVariant = () => { try { return root.ProjectRCardBattleInput?.getActivationVariant?.() ?? null; } catch (_error) { return null; } };
    const beamLog = []; // 撃ったビームの記録(診断用)
    let frameNo = 0; // マップ更新の通し番号(効果音の間引き用)
    let lastHitSoundFrame = -Infinity;
    const vfxJobs = []; // { frames, notes } ビームのVFXを終わったら確実に外す
    const hitStop = () => root.ProjectRHitStop;

    // ---------- ビーム(Lv3 hold) ----------
    const num = key => { const v = tune(key); return Number.isFinite(Number(v)) ? Number(v) : NaN; };
    const beamConfig = () => {
        try {
            const cfg = { width: num("beamWidthTiles"), speed: num("beamSpeed"), range: num("beamRangeTiles"), perTile: num("beamHitsPerTile"), damage: num("beamHitDamage"),
                maxHits: Math.floor(num("beamMaxHitsPerTarget")), stopFrames: Math.floor(num("hitStopFrames")), stopMax: Math.floor(num("hitStopMaxFrames")) };
            const ok = cfg.width > 0 && cfg.speed > 0 && cfg.range > 0 && cfg.perTile > 0 && cfg.damage >= 0 && cfg.maxHits >= 1 && cfg.stopFrames >= 0 && cfg.stopMax >= 0;
            return ok ? Object.freeze(cfg) : null;
        } catch (_error) { return null; }
    };
    // 先端が進める最大距離: 射程 / 壁(中心線)/ マップの端(ループしない向き)。
    const beamLimit = (origin, degree, range) => {
        const occ = occlusion(), m = map();
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree));
        let limit = range;
        const wall = typeof occ?.raycastWall === "function" ? occ.raycastWall(origin, degree, range, { mode: "combat" }) : null;
        if (wall && Number.isFinite(wall.distance)) limit = Math.min(limit, wall.distance);
        if (!m.isLoopHorizontal()) limit = Math.min(limit, ux > EPSILON ? (m.width() - origin.x) / ux : ux < -EPSILON ? (0 - origin.x) / ux : Infinity);
        if (!m.isLoopVertical()) limit = Math.min(limit, uy > EPSILON ? (m.height() - origin.y) / uy : uy < -EPSILON ? (0 - origin.y) / uy : Infinity);
        return Math.max(0, limit);
    };
    // 多角形を、ビームの座標系(a=進行方向, l=横)で「幅の中(|l|<=half)かつ前方(a>=0)」へ切り取る(Sutherland-Hodgman)。
    const clipHalf = (poly, inside, cross) => {
        const out = [];
        for (let i = 0; i < poly.length; i++) {
            const p = poly[i], q = poly[(i + 1) % poly.length], pin = inside(p), qin = inside(q);
            if (pin) out.push(p);
            if (pin !== qin) out.push(cross(p, q));
        }
        return out;
    };
    const beamRegion = (b, half, polygon) => {
        if (!Array.isArray(polygon) || polygon.length < 3) return null;
        const ux = Math.sin(rad(b.degree)), uy = -Math.cos(rad(b.degree)), nx = -uy, ny = ux;
        let poly = polygon.map(p => ({ a: (p.x - b.origin.x) * ux + (p.y - b.origin.y) * uy, l: (p.x - b.origin.x) * nx + (p.y - b.origin.y) * ny }));
        const edge = (coord, bound) => (p, q) => { const s = (bound - p[coord]) / (q[coord] - p[coord]); return { a: p.a + (q.a - p.a) * s, l: p.l + (q.l - p.l) * s }; };
        poly = clipHalf(poly, p => p.l <= half, edge("l", half));
        if (poly.length >= 3) poly = clipHalf(poly, p => p.l >= -half, edge("l", -half));
        if (poly.length >= 3) poly = clipHalf(poly, p => p.a >= 0, edge("a", 0));
        if (poly.length < 3) return null;
        const enter = Math.max(0, Math.min(...poly.map(p => p.a)));
        const world = poly.map(p => ({ x: b.origin.x + ux * p.a + nx * p.l, y: b.origin.y + uy * p.a + ny * p.l }));
        return { enter, world };
    };
    const beamVisible = (b, world) => {
        const occ = occlusion();
        if (typeof occ?.hasLineToPolygon !== "function") return true;
        try { return occ.hasLineToPolygon(b.origin, world, { radius: b.limit + EPSILON }) !== false; } catch (_error) { return true; }
    };
    const playHitSound = hitIndex => {
        if (frameNo - lastHitSoundFrame < HIT_SOUND_GAP_FRAMES) return;
        lastHitSoundFrame = frameNo;
        try {
            const name = String(params.HitSoundEffect === undefined ? "Chime1" : params.HitSoundEffect).trim();
            if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume: 70, pitch: 100 + Math.min(10, hitIndex) * 3, pan: 0 });
        } catch (_error) { /* 表示のみ */ }
    };
    const stopVfxNotes = notes => { for (const note of notes || []) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } };
    const endVfxJob = job => {
        stopVfxNotes(job.notes);
        for (const id of job.anchors || []) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(id); } catch (_error) { /* 表示のみ */ } }
    };
    const clearVfxJobs = () => { for (const job of vfxJobs.splice(0)) endVfxJob(job); };
    const tickVfxJobs = () => {
        for (let i = vfxJobs.length - 1; i >= 0; i--) {
            if (--vfxJobs[i].frames <= 0) { endVfxJob(vfxJobs[i]); vfxJobs.splice(i, 1); }
        }
    };
    const beamState = volley => {
        const b = volley.beam;
        return { serial: volley.serial, level: volley.level, degree: b.degree, origin: { ...b.origin }, width: volley.cfg.width, head: b.head, limit: b.limit, sampled: b.sampled, done: b.done, committed: volley.committed,
            targets: [...b.targets.values()].map(r => ({ eventId: r.eventId, hits: r.hits, damage: r.damage, lastK: r.lastK, slip: r.slip, stopFrames: r.stopFrames })) };
    };
    const beamSummary = volley => {
        const targets = [...volley.beam.targets.values()].map(r => ({ eventId: r.eventId, hits: r.hits, damage: r.damage, slip: r.slip, hitStopFrames: r.stopFrames }));
        return { targets, totalHits: targets.reduce((s, r) => s + r.hits, 0), totalDamage: targets.reduce((s, r) => s + r.damage, 0), head: volley.beam.head, limit: volley.beam.limit };
    };

    const processBeam = volley => {
        const b = volley.beam, cfg = volley.cfg, occ = occlusion();
        if (!b.done) b.head = Math.min(b.limit, b.head + cfg.speed / 60);
        const kHead = Math.floor(b.head * cfg.perTile + 1e-9), kFrom = b.sampled + 1;
        const planned = [];
        if (kHead >= kFrom) {
            const half = cfg.width / 2;
            for (const enemy of map().events().filter(event => isEnemy(event) && hpOf(event.eventId()) > 0)) {
                const id = enemy.eventId();
                const rec = b.targets.get(id) || { eventId: id, hits: 0, damage: 0, lastK: 0, slip: false, stopFrames: 0 };
                if (rec.hits >= cfg.maxHits) continue;
                const region = beamRegion(b, half, occ.eventPolygon(enemy));
                if (!region) continue;
                const k0 = Math.max(1, kFrom, rec.lastK + 1, Math.ceil(region.enter * cfg.perTile - 1e-9));
                if (k0 > kHead || !beamVisible(b, region.world)) continue;
                for (let k = k0, n = rec.hits; k <= kHead && n < cfg.maxHits; k++, n++) planned.push({ k, id, enemy });
            }
            b.sampled = kHead;
        }
        if (planned.length && !volley.committed) { if (!commitVolley(volley)) return; } // 最初の有効なヒットで1回だけ消費。失敗なら何も与えない
        planned.sort((x, y) => x.k - y.k || x.id - y.id);
        for (const hit of planned) {
            const enemy = hit.enemy;
            let rec = b.targets.get(hit.id);
            if (rec && rec.hits >= cfg.maxHits) continue;
            if (!enemy || enemy._erased || map().event(hit.id) !== enemy || hpOf(hit.id) <= 0) continue; // 倒れた・消えた敵には当てない
            if (!rec) { rec = { eventId: hit.id, hits: 0, damage: 0, lastK: 0, slip: false, stopFrames: 0 }; b.targets.set(hit.id, rec); }
            const record = { target: hit.id, sample: hit.k, hit: rec.hits + 1, damage: cfg.damage, head: b.head };
            try {
                dealFixed(hit.id, cfg.damage, `beam:${volley.serial}:${hit.id}:${hit.k}`, volley, true);
                rec.hits++; rec.damage += cfg.damage; rec.lastK = hit.k;
                if (rec.hits === 1 && volley.effects.splitTotal > 0) { record.slip = startSlip(hit.id, volley); rec.slip = !!record.slip; }
                if (cfg.stopFrames > 0 && hitStop()) {
                    const r = hitStop().apply(enemy, cfg.stopFrames, { owner: `volley:${volley.serial}`, maxFrames: cfg.stopMax });
                    rec.stopFrames = r?.total ?? rec.stopFrames;
                }
                playHitSound(rec.hits);
            } catch (error) { record.error = String(error?.message || error); }
            if (volley.hits.length < BEAM_RECORD_LIMIT) volley.hits.push(record);
        }
        if (b.head >= b.limit - EPSILON) b.done = true;
        if (volley.committed) {
            lastResult = { ok: true, pending: false, consumed: true, committed: true, kind: "beam", level: volley.level, serial: volley.serial, degree: volley.aim, ...beamSummary(volley), hits: volley.hits.map(h => ({ ...h })),
                done: b.done, effects: volley.effects, instanceId: volley.instanceConsumed };
        }
        if (b.done) {
            if (!volley.committed) abortVolley(volley, "missed", { kind: "beam", head: b.head, limit: b.limit });
            else { releaseHitStop(volley); volleys.delete(volley.serial); }
        }
    };
    const releaseHitStop = volley => { try { hitStop()?.release?.(`volley:${volley.serial}`); } catch (_error) { /* 表示のみ */ } };

    const activateBeam = (context, env) => {
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const cfg = beamConfig();
        if (!cfg) return failure("balanceUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        let volley = null;
        const result = summons.perform({ definition: context?.definition }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            const aim = normalize(summon.degree);
            let origin = summon.center;
            if (!origin || ![origin.x, origin.y].every(Number.isFinite)) { const p = $gamePlayer.centerPositionPoint(); origin = { x: p.x, y: p.y }; }
            origin = { x: origin.x, y: origin.y };
            const limit = beamLimit(origin, aim, cfg.range);
            volley = { kind: "beam", serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, level, effects, aim, degrees: [aim], count: 0, arrows: [], hits: [],
                committed: false, summonId: summon.summonId, cfg, element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier"), slipTicks: Math.floor(tune("splitTicks")),
                beam: { origin, degree: aim, limit, head: 0, sampled: 0, done: false, targets: new Map() } };
            return { ok: true };
        });
        if (!result?.ok || !volley) return failure(result?.reason || "activationFailed");
        volley.summonId = result.summonId ?? volley.summonId;
        reserve = volley;
        beamLog.push({ serial: volley.serial, level, degree: volley.aim, limit: volley.beam.limit, width: cfg.width });
        if (beamLog.length > 40) beamLog.shift();
        return failure("reserved");
    };

    const activate = context => {
        if (mode === "commit") return commitPlan ? { ok: true } : failure("noCommitPlan");
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (pendingVolley) return failure("volleyPending");
        if (!balanceReady()) return failure("balanceUnavailable");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        // Lv3の長押し(hold)はビーム。1回の入力で扇とビームの両方は出ない(variantは1つ)。
        if (cardLevel() >= BEAM_LEVEL && activationVariant() === "hold") return activateBeam(context, env);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), effects = effectsForLevel(level);
        const count = Math.max(1, Math.floor(effects.projectileCount)), spacing = effects.spreadDegrees;
        let volley = null;
        // Apollo一時召喚(表示用の論理アンカー)。マウス方向をここで固定する。方向が決まらなければ失敗(非消費)。
        const result = summons.perform({ definition: context?.definition }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            const aim = normalize(summon.degree), degrees = arrowDegrees(aim, count, spacing), center = centerIndexOf(count);
            const thickWidth = effects.thickWidthTiles > 0 && center >= 0 ? effects.thickWidthTiles : 0;
            const arrows = [];
            for (let i = 0; i < degrees.length; i++) {
                const thick = thickWidth > 0 && i === center;
                const spawned = spawnArrow(env, { x: summon.x, y: summon.y, degree: degrees[i], index: i, thick, width: thick ? thickWidth : tune("pathWidthTiles"),
                    moveSpeed: moveSpeedFor(tune("projectileSpeed")) });
                if (!spawned.ok) { arrows.forEach(destroyArrow); return failure(spawned.reason); }
                arrows.push(spawned.arrow);
            }
            volley = { serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, level, effects, aim, degrees, count, spacing,
                centerIndex: center, thickWidth, arrows, hits: [], committed: false, summonId: summon.summonId, range: tune("rangeTiles"),
                stepTiles: tune("projectileSpeed") / 60, maxFrames: Math.ceil(tune("rangeTiles") / Math.max(0.1, tune("projectileSpeed")) * 60) + 60,
                element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier"), slipTicks: Math.floor(tune("splitTicks")), settled: false };
            return { ok: true };
        });
        if (!result?.ok || !volley) return failure(result?.reason || "activationFailed");
        volley.summonId = result.summonId ?? volley.summonId;
        reserve = volley;
        // ルーターには「まだ消費しない」と伝える。確定(最初の命中)の時にrequestUseCardの正規経路で1回だけ消費する。
        return failure("reserved");
    };

    // Lv3だけ、離した時に発動する(tap=扇 / hold=ビームの分岐)。Lv1〜2は押した瞬間に発動(従来どおり)。
    const input = root.ProjectRCardBattleInput;
    const pressRegistered = typeof input?.registerPressProfile === "function"
        ? input.registerPressProfile(CARD, { holdSeconds: HOLD_SECONDS, fireOn: "release", when: () => {
            if (!balanceReady()) return false;
            return cardLevel() >= BEAM_LEVEL;
        } }) : { ok: false, reason: "inputUnavailable" };

    const previousGround = deck.getActivationHandler("ground");
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD
        ? activate(context) : previousGround ? previousGround(context) : { ok: true });

    // ---------- 演出(表示だけ。判定を決めない) ----------
    const godIdFor = definition => {
        const ringId = definition?.ringId;
        return deck.definitions?.ring?.(ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(ringId) || "apollo";
    };
    const present = volley => {
        try { root.ProjectRPresentationVfx?.play("apollo_volley.burst", { degree: volley.aim }); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("apollo", volley.aim, BOW_SPRITE); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("ArmExtend", { source: "card", detail: CARD }); } catch (_error) { /* 表示のみ */ }
        try { if (root.ProjectRCutIn?.isCardEnabled?.(CARD)) root.ProjectRCutIn.show({ kind: "card", godId: godIdFor(volley.definition), cardId: CARD }); } catch (_error) { /* 表示のみ */ }
        try {
            const name = String(params.SoundEffect === undefined ? "Chime2" : params.SoundEffect).trim();
            if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume: 80, pitch: 100, pan: 0 });
        } catch (_error) { /* 表示のみ */ }
        particleWait = PARTICLE_WAIT_FRAMES;
        if (volley.kind === "beam") { // 幅3マスの黄金のビーム(VFX Designerライブラリ ProjectR_Volley_Beam を区間ごとに並べる)
            try {
                const r = root.ProjectRPresentationVfx?.play("apollo_volley.beam", { degree: volley.aim, length: volley.beam.limit, instance: "v" + volley.serial, origin: volley.beam.origin });
                if (r?.ok && Array.isArray(r.notes)) vfxJobs.push({ frames: BEAM_VFX_FRAMES, notes: r.notes, anchors: Array.isArray(r.anchors) ? r.anchors : [] });
            } catch (_error) { /* 表示のみ */ }
        }
    };
    // Apolloの表示Eventは発動の次のマップ更新で現れるため、現れたら光の粒子を漂わせる(最大 PARTICLE_WAIT_FRAMES 待つ)。
    const updateParticles = () => {
        if (particleWait === null) return;
        const eventId = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
        if (eventId) {
            particleWait = null;
            try { root.ProjectRPresentationVfx?.play("apollo_volley.particles", { eventId }); } catch (_error) { /* 表示のみ */ }
        } else if (--particleWait <= 0) particleWait = null;
    };

    // ---------- スリップダメージ(Lv2。実行時のみ。保存しない) ----------
    const endSlip = (event, reason) => {
        slips.delete(event);
        lastResult = lastResult && { ...lastResult, lastSlipEnd: { eventId: event.eventId(), reason } };
    };
    const clearSlips = reason => { for (const event of [...slips.keys()]) endSlip(event, reason); };
    const alive = (event, record) => !!event && !event._erased && record.map === map() && map().event(event.eventId()) === event && hpOf(event.eventId()) > 0;
    const startSlip = (eventId, volley) => {
        const event = map().event(eventId);
        if (!event || event._erased || !(volley.effects.splitTotal > 0)) return false;
        const old = slips.get(event);
        if (old) endSlip(event, "replaced"); // 再命中は置換: 古い予定を捨てて、新しい合計を最初から(スリップの重ねがけ規則は未決定)
        const amounts = slipSchedule(volley.effects.splitTotal, volley.slipTicks);
        slips.set(event, { map: map(), tickAmounts: amounts, interval: volley.effects.splitSeconds / amounts.length, elapsed: 0, next: 0, dealt: 0,
            serial: ++slipSerial.value, volley: volley.serial, level: volley.level, element: volley.element, weaknessMultiplier: volley.weaknessMultiplier });
        return true;
    };
    // 戦闘時間(カードのCooldownと同じ時計)で進める。操作不能中は進まない。
    const tick = seconds => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const [event, record] of [...slips]) {
            if (!alive(event, record)) { endSlip(event, "targetGone"); continue; }
            record.elapsed += seconds;
            while (record.next < record.tickAmounts.length && record.elapsed + EPSILON >= (record.next + 1) * record.interval) {
                const amount = record.tickAmounts[record.next++];
                try { dealFixed(event.eventId(), amount, `volley_slip:${record.serial}:${record.next}`, record, false); } catch (_error) { /* 次のtickへ */ }
                record.dealt += amount;
                if (!alive(event, record)) break;
            }
            if (!alive(event, record)) { endSlip(event, "targetDied"); continue; }
            if (record.next >= record.tickAmounts.length) endSlip(event, "finished");
        }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (!deck.isCardBattleActive()) clearSlips("battleInactive"); else tick(seconds);
        return result;
    };

    // ---------- 予約 → 確定 ----------
    const handIndexOf = instanceId => {
        const state = deck.getBattleState?.();
        return state ? state.hand.findIndex(card => card.instanceId === instanceId) : -1;
    };
    const finishPending = volley => { if (pendingVolley === volley) pendingVolley = null; };
    // 取り消し: 矢を消し、カード・Cooldown・手札・山札・ゲージは一切変えていないので、戻す物は無い。
    const abortVolley = (volley, reason, extra = {}) => {
        if (volley.aborted) return;
        volley.aborted = true;
        destroyVolley(volley);
        volleys.delete(volley.serial);
        finishPending(volley);
        releaseSummon(volley.summonId);
        lastResult = { ok: false, reason, aborted: true, consumed: false, committed: false, level: volley.level, serial: volley.serial, arrows: volley.count,
            hits: volley.hits.length, effects: volley.effects, ...extra };
    };
    // 確定: 手札の同じカードを正規経路で1回だけ消費する。成功したらtrue。
    const commitVolley = volley => {
        if (volley.committed) return true;
        if (!deck.isCardBattleActive()) { abortVolley(volley, "battleInactive"); return false; }
        const index = handIndexOf(volley.instanceId);
        if (index < 0) { abortVolley(volley, "cardGone"); return false; }
        commitPlan = volley;
        mode = "commit";
        modifiers()?.skipPresentationOnce?.(CARD, ["cutIn", "action"]); // 発射時に演出済み
        let result;
        try {
            result = _requestUseCard.call(deck, index);
        } catch (error) {
            result = { ok: false, reason: "activationFailed", detail: String(error?.message || error) };
        } finally {
            mode = null;
            commitPlan = null;
            modifiers()?.clearPresentationSkip?.(CARD);
        }
        if (result?.ok === true && result.cardId === CARD) {
            volley.committed = true;
            volley.instanceConsumed = result.instanceId ?? volley.instanceId;
            finishPending(volley);
            return true;
        }
        abortVolley(volley, result?.detail || result?.reason || "notConsumed");
        return false;
    };

    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        reserve = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (reserve) { destroyVolley(reserve); releaseSummon(reserve.summonId); }
            reserve = null;
            throw error;
        }
        const volley = reserve;
        reserve = null;
        if (!volley) return result;
        // 予約(まだ消費していない): 矢は飛んでいる。確定待ちとして覚え、状態を持つ呼び出し元には pending として返す。
        pendingVolley = volley;
        volleys.set(volley.serial, volley);
        lastResult = { ok: true, pending: true, consumed: false, committed: false, kind: volley.kind || "fan", level: volley.level, serial: volley.serial, degree: volley.aim,
            arrows: volley.count, degrees: volley.degrees.slice(), effects: volley.effects, instanceId: volley.instanceId };
        present(volley);
        return { ok: false, reason: "pending", reasons: [{ code: "pending" }], pending: true, cardId: CARD, instanceId: volley.instanceId, detail: "volleyReserved" };
    };

    // ---------- 毎フレーム: 矢の移動後の判定 ----------
    // 矢の位置と体: 回転した(rotateTo済みの)イベントの「見た目の中心」は screenX/Y(G17の弾と同じ前提)。
    //   Hendrixのhitbox矩形をそのまま回すと、回転した矢のhitboxが半タイル下へずれ、0度だけ別の式になる(ProjectR_CombatOcclusion.eventPolygonの再現)ため、
    //   位置は見た目の中心、大きさは公式のhitboxData(width=進行方向に直交する長さ / height=進行方向の長さ)、向きはrotateToの角度から作る。
    const tileCenter = event => { const m = map(); return { x: m.displayX() + event.screenX() / m.tileWidth(), y: m.displayY() + event.screenY() / m.tileHeight() }; };
    const arrowBody = (event, degree) => {
        const data = event.hitboxData(), across = data.width / 2, along = data.height / 2;
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree)), nx = -uy, ny = ux;
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: nx * across * a + ux * along * b, y: ny * across * a + uy * along * b }));
    };

    // 1本の矢の、このframeの結果: { blocked } | { enemyId, fraction } | null(まだ飛んでいる)
    const resolveArrow = (volley, arrow, enemies) => {
        const m = map(), occ = occlusion();
        if (arrow.map !== m || m.event(arrow.eventId) !== arrow.event || arrow.event._erased) return { gone: true };
        arrow.age++;
        const now = tileCenter(arrow.event), footprint = arrowBody(arrow.event, arrow.degree);
        if (![now.x, now.y].every(Number.isFinite)) return { gone: true };
        const from = arrow.last || now;
        if (!arrow.origin) arrow.origin = { x: from.x, y: from.y };
        arrow.last = now;
        arrow.travelled = Math.hypot(now.x - arrow.origin.x, now.y - arrow.origin.y);
        // 進めなくなった矢(マップの端・移動できない場所で止まった)は外れ扱いで消す。公式の端判定が働かない場合の安全網。
        arrow.stalled = arrow.age > 1 && Math.hypot(now.x - from.x, now.y - from.y) < volley.stepTiles * STALL_RATIO ? arrow.stalled + 1 : 0;
        const wall = occ.firstBlockerBetween(from, now, { mode: "combat", footprint });
        let best = null;
        for (const enemy of enemies) {
            const id = enemy.eventId();
            const target = occ.eventPolygon(enemy);
            if (!Array.isArray(target) || target.length < 3) continue;
            const fraction = occ.firstContact(from, now, target, footprint);
            if (fraction === null) continue;
            if (!best || fraction < best.fraction - EPSILON || (Math.abs(fraction - best.fraction) <= EPSILON && id < best.enemyId)) best = { enemyId: id, fraction };
        }
        if (best && (!wall || best.fraction <= wall.fraction + EPSILON)) return best;
        if (wall) return { blocked: "wall" };
        if (root.checkCollide(arrow.eventId, "<destroyProjectile>") || root.checkCollide(arrow.eventId, "map boundary")) return { blocked: "boundary" };
        if (volley.range > 0 && arrow.travelled > volley.range) return { blocked: "range" };
        if (arrow.stalled >= STALL_FRAMES) return { blocked: "stalled" };
        if (arrow.age > volley.maxFrames) return { blocked: "lifetime" };
        return null;
    };

    const applyHit = (volley, arrow, enemyId) => {
        const event = map().event(enemyId);
        const record = { arrow: arrow.index, eventId: enemyId, center: arrow.index === volley.centerIndex, thick: arrow.thick, damage: volley.effects.damage };
        if (!event || event._erased) { record.skipped = "targetGone"; volley.hits.push(record); return; }
        // 同じframeの先の矢で倒れた敵には、重ねてダメージを与えない(二重の撃破を作らない)。矢は当たって消える。
        if (hpOf(enemyId) <= 0) { record.skipped = "targetDead"; volley.hits.push(record); return; }
        try {
            dealFixed(enemyId, volley.effects.damage, `volley:${volley.serial}:${arrow.index}`, volley, true);
            if (arrow.thick && volley.effects.splitTotal > 0) record.slip = startSlip(enemyId, volley);
        } catch (error) {
            record.error = String(error?.message || error);
        }
        volley.hits.push(record);
    };

    const processVolley = volley => {
        if (volley.kind === "beam") return processBeam(volley);
        const m = map();
        const enemies = m.events().filter(event => isEnemy(event) && hpOf(event.eventId()) > 0);
        const hits = [];
        for (const arrow of liveArrows(volley)) {
            const outcome = resolveArrow(volley, arrow, enemies);
            if (!outcome) continue;
            if (outcome.enemyId) hits.push({ arrow, enemyId: outcome.enemyId, fraction: outcome.fraction });
            else { arrow.end = outcome.blocked || "gone"; destroyArrow(arrow); }
        }
        if (hits.length && !volley.committed) {
            // 最初の命中でカードを消費する。消費できなければ矢を消して何も与えない。
            for (const hit of hits) { hit.arrow.hit = hit.enemyId; }
            if (!commitVolley(volley)) return;
        }
        // 当たった矢はこの命中で消える(貫通なし)。1本につき1回だけ。
        hits.sort((a, b) => a.fraction - b.fraction || a.arrow.index - b.arrow.index);
        for (const hit of hits) {
            hit.arrow.end = "hit";
            destroyArrow(hit.arrow);
            applyHit(volley, hit.arrow, hit.enemyId);
        }
        if (volley.committed) {
            lastResult = { ok: true, pending: false, consumed: true, committed: true, level: volley.level, serial: volley.serial, degree: volley.aim,
                arrows: volley.count, degrees: volley.degrees.slice(), hits: volley.hits.map(h => ({ ...h })), effects: volley.effects, instanceId: volley.instanceConsumed };
        }
        if (!liveArrows(volley).length) {
            if (!volley.committed) abortVolley(volley, "missed");
            else volleys.delete(volley.serial);
        }
    };

    const clearAll = reason => {
        for (const volley of [...volleys.values()]) {
            if (!volley.committed) abortVolley(volley, reason);
            else { destroyVolley(volley); volleys.delete(volley.serial); }
        }
        if (pendingVolley) abortVolley(pendingVolley, reason);
        pendingVolley = null;
        particleWait = null;
        clearVfxJobs();
        clearSlips(reason);
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        frameNo++;
        try { updateParticles(); } catch (_error) { /* 表示のみ */ }
        if (vfxJobs.length) tickVfxJobs();
        if (!volleys.size && !slips.size) return;
        if (slips.size && root.ProjectR?.PlayerDeath?.isDead?.() === true) clearSlips("playerDead");
        if (!volleys.size || this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        for (const volley of [...volleys.values()]) {
            try { processVolley(volley); } catch (error) { abortVolley(volley, "error:" + String(error?.message || error)); }
        }
    };

    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    // セーブに含まれた非恒久の矢(Hendrixの標準Map保存)は、ロード後に追跡が無いまま残る。このカードの矢だけを除去する。
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        const m = map();
        if (!m) return;
        const tracked = new Set([...volleys.values()].flatMap(v => v.arrows.map(a => a.event)));
        for (const event of m.events()) if (isArrow(event) && !tracked.has(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
    };

    root.ProjectRApolloGoldenVolley = Object.freeze({
        CARD,
        get LEVELS() { return balance().levels(CARD); },
        get SPEED() { return tune("projectileSpeed"); },
        get RANGE_TILES() { return tune("rangeTiles"); },
        effectsForLevel, cardLevel, arrowDegrees, centerIndexOf, slipSchedule, moveSpeedFor,
        implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, holdSeconds: HOLD_SECONDS, beamLevel: BEAM_LEVEL, pressRegistered: pressRegistered.ok === true,
        getBeamLog: () => beamLog.map(entry => ({ ...entry })),
        getBeamAttempts: () => beamLog.map(entry => ({ ...entry })), // A5Aの名前(ビームの分岐に入った記録)。A5BからはビームのBeamLogと同じ
        getBeam: () => { const v = [...volleys.values()].find(x => x.kind === "beam"); return v ? beamState(v) : null; },
        beamConfig: () => { const c = beamConfig(); return c ? { ...c } : null; },
        geometry: Object.freeze({ tileCenter, arrowBody, beamRegion, beamLimit }),
        isPending: () => !!pendingVolley,
        getPending: () => pendingVolley ? { serial: pendingVolley.serial, instanceId: pendingVolley.instanceId, level: pendingVolley.level, degree: pendingVolley.aim,
            degrees: pendingVolley.degrees.slice(), arrows: liveArrows(pendingVolley).length } : null,
        getActiveVolleys: () => [...volleys.values()].map(v => ({ serial: v.serial, kind: v.kind || "fan", committed: v.committed, arrows: liveArrows(v).length, level: v.level, hits: v.hits.length })),
        getActiveArrows: () => [...volleys.values()].flatMap(v => liveArrows(v).map(a => ({ volley: v.serial, eventId: a.eventId, index: a.index, degree: a.degree,
            rotation: a.event._rotation, thick: a.thick, width: a.width, age: a.age, travelled: a.travelled }))),
        getActiveSlips: () => [...slips].map(([event, r]) => ({ eventId: event.eventId(), next: r.next, ticks: r.tickAmounts.slice(), dealt: r.dealt, elapsed: r.elapsed, serial: r.serial })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getActiveVfxJobs: () => vfxJobs.map(job => ({ frames: job.frames, notes: job.notes.slice(), anchors: (job.anchors || []).slice() }))
    });
})();
