/*:
 * @target MZ
 * @plugindesc v0.2.0 ProjectR SOUL戦闘 P3-B 回避AI(オプトイン): 敵ハートが、複数の矢・追尾・近接の出ている判定・フェイントを「見てから」避ける。性格(プロファイル)とボスの設定に対応。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulBattlePoC
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleMelee
 *
 * @param ReactionFrames
 * @text 反応の遅れ(frame)
 * @desc 飛んでくる攻撃を初めて見てから、避け始めるまでの遅れ。1/60秒単位。大きいほど避けにくい。
 * @type number
 * @min 0
 * @max 120
 * @default 8
 *
 * @param MoveSpeed
 * @text 回避の速さ(タイル/秒)
 * @type number
 * @decimals 1
 * @min 0.5
 * @max 60
 * @default 9
 *
 * @param DodgeDistance
 * @text 1回の回避距離(タイル)
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 8
 * @default 1.8
 *
 * @param CooldownFrames
 * @text 回避のクールダウン(frame。回避の開始から数える)
 * @type number
 * @min 0
 * @max 600
 * @default 40
 *
 * @param RecoveryFrames
 * @text 回避後の硬直(frame。この間は避けられない)
 * @type number
 * @min 0
 * @max 600
 * @default 24
 *
 * @param ReturnSpeed
 * @text 元の位置へ戻る速さ(タイル/秒)
 * @desc 脅威が無いとき、ゆっくり開始位置(ホーム)へ戻ります。0なら戻りません。
 * @type number
 * @decimals 1
 * @min 0
 * @max 30
 * @default 2.5
 *
 * @param BoundsHalfX
 * @text 動ける範囲の半幅(タイル。ホーム中心)
 * @type number
 * @decimals 1
 * @min 0
 * @max 20
 * @default 4
 *
 * @param BoundsHalfY
 * @text 動ける範囲の半高(タイル。ホーム中心)
 * @type number
 * @decimals 1
 * @min 0
 * @max 20
 * @default 2.5
 *
 * @param HorizonFrames
 * @text 先読みの上限(frame)
 * @desc 「見えている攻撃が、この時間以内に当たりそうか」だけを調べます。プレイヤーの入力は読みません。
 * @type number
 * @min 1
 * @max 600
 * @default 90
 *
 * @param Margin
 * @text 避けるときの余白(タイル)
 * @type number
 * @decimals 2
 * @min 0
 * @max 2
 * @default 0.3
 *
 * @help
 * ProjectR_SoulBattleDodge.js (P3-A 基本の回避 + P3-B 複数弾・近接・性格・フェイント・ボス)
 *
 * 【位置づけ】 arm() するまで何もしません(オプトイン)。arm しなければ、従来どおりP0のハート(静止・往復・楕円)のままです。
 *   防御ターンの弾幕・プレイヤーのハート操作(P4)は未実装です。
 *
 * 【プレイヤーの入力・隠れた意図は読みません】 マウス・キー・手札・カードの選択は一切見ません。見るのは、マップに「すでに出ている」
 *   Event(飛び道具・近接の出ている判定)の位置・向き・大きさの変化と、自分のHP、プレイヤーの位置(誰にでも見える)だけです。
 *   予兆の無い攻撃に、瞬時の知識は与えません。
 *
 * 【P3-B の機能】
 *   複数の弾  見えている弾(最大 maxThreats 個)から、回避先を候補(約33点)から選びます。候補ごとに「その位置に着いたとき当たるか」を、
 *             自分が動いている途中の位置も含めて見積り、最も危険の低い所へ動きます。追尾弾(エロス)は、観測した旋回の速さから
 *             「直前なら避けられる」程度に見積もります(遠くからは避けられない)。気づいていない弾(反応の遅れの途中)は考慮しません。
 *   近接      出ている判定(通常の剣・剣カード・Hermes奥義)の向きを観測し、meleeWary のプロファイルは次の斬撃に備えて
 *             判定の向きに直角へ動きます。出た瞬間に当たるので、その斬撃自体は避けられません。被弾後に退く(hitReaction)こともできます。
 *   未対応    薙ぎ払い・一閃は判定のEventを作らず、予備動作もありません。プレイヤーの攻撃に予備動作はありません(CUES で明示)。
 *             Lv3のビーム(判定のEventなし)・エロスのビーム片・疫病のネズミ(Eventはあるが観測対象外)も未対応です(CUES と UNSUPPORTED_TAGS)。
 *             被弾の事後にしか反応できません。
 *   性格      プロファイル(反応・速さ・距離・クールダウン・硬直・回避の頻度・リスク許容・攻撃性・好む向き ほか)を registerProfile() で登録し、
 *             arm({ profile }) で選びます。ProjectR_SoulBattleAIData.js が 初心者/バランス/回避型/攻撃型/ボス を登録します。ダメージは変えません。
 *   フェイント 観測した矢の取り消し(遠くで消えた)・向きの急変は、AIの判断に影響します(回避の取り消しで硬直が延びる=付け入る隙・
 *             用心して反応が遅くなる)。取り消しの原因は区別できないため、壁に当たって消えた矢も取り消しとみなされることがあります。
 *   ボス      registerBoss() のデータ(プロファイル・HPフェーズごとの上書き・弱点: 連続回避で息切れ/大ダメージで怯み)を読むだけで、
 *             ボス固有のコードはありません。ProjectRBossFramework が動作中で frameworkBossId が一致すれば、そのHP割合とフェーズを読み取ります
 *             (読み取り専用。start/end/damage は呼びません)。
 *
 * 【状態】 idle → dodging → recovering → idle。ボス設定では exhausted(息切れ)・staggered(怯み)も加わります。
 *   フェーズ: 観測は攻撃ターンだけ。防御ターンに入ると観測を捨て(新しい回避は始めない)、動いている最中の回避は最後まで動きます。
 *   SOULの終了・マップ移動・ロード・ニューゲームで、AIの状態はすべて破棄されます。ダメージ・命中回数・スキルには触れません。
 *
 * API: ProjectRSoulBattleDodge
 *   arm({ profile, boss, reactionFrames, ..., bounds }) -> { ok, reason?, config }   次の(または動作中の)SOULのハートに適用。1回のSOULだけ有効
 *   setProfile(id) / setBoss(id)    動作中のAIの性格を切り替える(位置・状態は保つ)
 *   registerProfile(id, data) / registerBoss(def) / listProfiles() / listBosses() / getProfile(id) / getBoss(id)
 *   disarm() / isArmed() / isActive() / getState() / getStats() / getLog() / simulate(scenario) / CUES / THREAT_TAGS / MELEE_TAGS / HOMING_TAGS
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulBattleDodge";
    // 観測する「飛んでくる攻撃」(プロジェクトの弾のタグ)。近接の斬撃は含めない。
    const THREAT_TAGS = Object.freeze(["<projectRGoldenArrow>", "<projectRDiseaseAttack>", "<projectRApolloUltimate>", "<projectRGunBullet>", "<projectRGoldenVolley>",
        "<projectRErosArrow>", "<projectRGigasArrow>", "<projectRPlagueArrow>"]);
    const HOMING_TAGS = Object.freeze(["<projectRErosArrow>"]);
    // 攻撃のEventだが、観測対象にしないもの(CUESに「未対応」と明記)。AIは見ない・予知しない。
    const UNSUPPORTED_TAGS = Object.freeze(["<projectRErosBeam>", "<projectRPlagueRat>"]);
    // 近接の「出ている判定」(寿命は数フレーム。出た瞬間に当たる)。向きの観測にだけ使う。
    const MELEE_TAGS = Object.freeze(["<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"]);
    // 観測できる手がかりと、できないもの(成功を捏造しない)
    const CUES = Object.freeze({
        projectile: { supported: true, note: "飛び道具のEventの位置の変化から速度を測る" },
        volley: { supported: true, note: "同時に見える複数の弾を、危険度で評価して回避先を選ぶ" },
        homing: { supported: true, note: "観測した旋回の速さから、直前なら避けられる程度に見積もる" },
        directionChange: { supported: true, note: "弾の向きの急変(追尾以外)は、反応の遅れをやり直し、回避中なら付け入る隙になる" },
        canceledAttack: { supported: "partial", note: "遠くで消えた弾を取り消しとみなす。壁に当たって消えた場合と区別できない" },
        swordArea: { supported: "partial", note: "通常の剣の出ている判定を観測できるが、寿命が数フレームで、その斬撃は避けられない(次の斬撃に備える横移動だけ)" },
        swordCardArea: { supported: "partial", note: "剣カードも同じ" },
        hermesUltimateArea: { supported: "partial", note: "奥義の斬撃は順に出る。出た後の判定しか観測できず、避けられない" },
        sweep: { supported: false, note: "判定のEventを作らず、予備動作も無い。観測できる手がかりが無い(被弾の事後に反応するだけ)" },
        issen: { supported: false, note: "同上。継続ダメージの出血は自分のHPの減りとして事後にしか分からない" },
        windup: { supported: false, note: "プレイヤーの攻撃に予備動作は存在しない(絶の予備動作は移動カードでSOUL中は使えない)。AIに予知は与えない" },
        beamLv3: { supported: false, note: "Lv3の太いビーム(矢の同時発射の長押し・ギガース殺し)は判定のEventを作らない一括判定で、観測できる手がかりが無い。被弾の事後に退くだけ" },
        erosBeamFragment: { supported: false, note: "エロスLv3のビーム片(<projectRErosBeam>)はEventだが、観測対象にしていない(発射の一瞬に並ぶ判定で、避ける余地を設計していない)" },
        plagueRat: { supported: false, note: "疫病の矢Lv2〜3のネズミ(<projectRPlagueRat>)はEventだが、観測対象にしていない(着弾後に追って当たる範囲の攻撃)。避けられない" },
        bossFramework: { supported: "partial", note: "ProjectRBossFramework の状態(HP割合・フェーズ)を読み取り専用で参照。start/end/damage は呼ばない" }
    });
    const params = PluginManager.parameters(PLUGIN);
    const number = (value, fallback, min, max) => {
        const n = Number(value);
        return value !== "" && value !== undefined && value !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    // 設定の仕様(検証にも使う)。t: int/num/bool/enum
    const SPEC = Object.freeze({
        reactionFrames: { t: "int", min: 0, max: 120 }, reactionJitter: { t: "int", min: 0, max: 60 },
        moveSpeed: { t: "num", min: 0.5, max: 60 }, dodgeDistance: { t: "num", min: 0.1, max: 8 },
        cooldownFrames: { t: "int", min: 0, max: 600 }, recoveryFrames: { t: "int", min: 0, max: 600 },
        returnSpeed: { t: "num", min: 0, max: 30 }, boundsHalfX: { t: "num", min: 0, max: 20 }, boundsHalfY: { t: "num", min: 0, max: 20 },
        horizonFrames: { t: "int", min: 1, max: 600 }, margin: { t: "num", min: 0, max: 2 },
        dodgeFrequency: { t: "num", min: 0, max: 1 }, riskTolerance: { t: "num", min: 0, max: 1 }, aggression: { t: "num", min: 0, max: 1 },
        preferredSide: { t: "enum", values: ["none", "left", "right", "toward", "away"] },
        maxThreats: { t: "int", min: 1, max: 64 },
        hitReaction: { t: "bool" }, hitReactionDistance: { t: "num", min: 0.1, max: 8 },
        meleeWary: { t: "bool" }, meleeSidestepDistance: { t: "num", min: 0.1, max: 8 }, meleeAssumedLifetime: { t: "int", min: 1, max: 30 },
        feintSusceptibility: { t: "num", min: 0, max: 1 }, feintHesitationFrames: { t: "int", min: 0, max: 120 }, feintMemoryFrames: { t: "int", min: 0, max: 900 },
        baitRecoveryFrames: { t: "int", min: 0, max: 300 }, cancelGapTiles: { t: "num", min: 0.5, max: 10 }, redirectDegrees: { t: "num", min: 5, max: 90 }
    });
    const defaults = Object.freeze({
        reactionFrames: Math.round(number(params.ReactionFrames, 8, 0, 120)), reactionJitter: 0, moveSpeed: number(params.MoveSpeed, 9, 0.5, 60),
        dodgeDistance: number(params.DodgeDistance, 1.8, 0.1, 8), cooldownFrames: Math.round(number(params.CooldownFrames, 40, 0, 600)),
        recoveryFrames: Math.round(number(params.RecoveryFrames, 24, 0, 600)), returnSpeed: number(params.ReturnSpeed, 2.5, 0, 30),
        boundsHalfX: number(params.BoundsHalfX, 4, 0, 20), boundsHalfY: number(params.BoundsHalfY, 2.5, 0, 20),
        horizonFrames: Math.round(number(params.HorizonFrames, 90, 1, 600)), margin: number(params.Margin, 0.3, 0, 2),
        dodgeFrequency: 1, riskTolerance: 0, aggression: 0, preferredSide: "none", maxThreats: 12,
        hitReaction: false, hitReactionDistance: 1.4, meleeWary: false, meleeSidestepDistance: 1.6, meleeAssumedLifetime: 3,
        feintSusceptibility: 0, feintHesitationFrames: 0, feintMemoryFrames: 180, baitRecoveryFrames: 0, cancelGapTiles: 2.5, redirectDegrees: 20
    });
    const LIMITS = Object.freeze(Object.fromEntries(Object.entries(SPEC).filter(([, s]) => s.t === "int" || s.t === "num").map(([k, s]) => [k, [s.min, s.max]])));
    const MIN_THREAT_SPEED = 0.05;      // タイル/frame。これより遅いものは「飛んでくる攻撃」として扱わない
    const MAX_TRACKED = 48;             // 同時に追跡する弾・判定の上限(実行時間の安全装置)
    const MAX_LOG = 100;
    const DIRECTIONS = 16;              // 回避先の候補: 周囲16方向 × 距離2段 + その場

    let pending = null;                 // arm済み・まだハートに適用していない {config, base, boss}
    let ai = null;                      // 動作中の状態(実行時のみ。セーブしない)
    const log = [];
    const totals = { arms: 0, resets: 0 };
    const profiles = new Map();
    const bosses = new Map();
    const note = entry => { log.push({ frame: ai ? ai.frame : null, ...entry }); if (log.length > MAX_LOG) log.shift(); };

    const soul = () => root.ProjectRSoulBattle;
    const poc = () => root.ProjectRSoulBattlePoC;
    const occlusion = () => root.ProjectR?.CombatOcclusion;

    // ---- 設定の検証・プロファイル・ボス ----
    const checkValue = (key, value) => {
        const spec = SPEC[key];
        if (spec.t === "bool") return typeof value === "boolean" ? { ok: true, value } : { ok: false };
        if (spec.t === "enum") return spec.values.includes(value) ? { ok: true, value } : { ok: false };
        const n = Number(value);
        if (value === "" || value === null || typeof value === "boolean" || !Number.isFinite(n) || n < spec.min || n > spec.max) return { ok: false };
        return { ok: true, value: spec.t === "int" ? Math.round(n) : n };
    };
    // source のうち既知のキーだけを検証して target へ。undefined/null/"" は「指定なし」
    const mergeChecked = (target, source) => {
        for (const key of Object.keys(SPEC)) {
            const value = source?.[key];
            if (value === undefined || value === null || value === "") continue;
            const checked = checkValue(key, value);
            if (!checked.ok) return "invalidOption:" + key;
            target[key] = checked.value;
        }
        return null;
    };
    const idOk = id => typeof id === "string" && /^[A-Za-z0-9_\-]{1,40}$/.test(id);
    const registerProfile = (id, data) => {
        if (!idOk(id)) return { ok: false, reason: "invalidId" };
        const clean = {};
        const error = mergeChecked(clean, data || {});
        if (error) return { ok: false, reason: error };
        profiles.set(id, Object.freeze({ id, label: typeof data?.label === "string" ? data.label : id, data: Object.freeze(clean) }));
        return { ok: true, id };
    };
    const registerBoss = def => {
        if (!idOk(def?.id)) return { ok: false, reason: "invalidId" };
        if (def.profile !== undefined && !profiles.has(def.profile)) return { ok: false, reason: "unknownProfile" };
        const overrides = {};
        let error = mergeChecked(overrides, def.overrides || {});
        if (error) return { ok: false, reason: error };
        const phases = [];
        for (const phase of Array.isArray(def.phases) ? def.phases : []) {
            const ratio = Number(phase?.hpRatio);
            if (!(ratio >= 0 && ratio <= 1)) return { ok: false, reason: "invalidPhase" };
            const o = {};
            error = mergeChecked(o, phase.overrides || {});
            if (error) return { ok: false, reason: error };
            phases.push(Object.freeze({ id: String(phase.id ?? "p" + phases.length), label: String(phase.label ?? ""), hpRatio: ratio, overrides: Object.freeze(o) }));
        }
        phases.sort((a, b) => b.hpRatio - a.hpRatio);
        const w = def.weakness || {};
        const weakness = {};
        for (const [key, max] of [["exhaustAfterDodges", 20], ["exhaustWindowFrames", 1800], ["exhaustFrames", 1800], ["staggerDamage", 1e9], ["staggerFrames", 1800]]) {
            if (w[key] === undefined) continue;
            const n = Number(w[key]);
            if (!Number.isFinite(n) || n < 0 || n > max) return { ok: false, reason: "invalidWeakness:" + key };
            weakness[key] = n;
        }
        bosses.set(def.id, Object.freeze({ id: def.id, name: String(def.name ?? def.id), profile: def.profile ?? null, overrides: Object.freeze(overrides), phases: Object.freeze(phases),
            weakness: Object.freeze(weakness), frameworkBossId: typeof def.frameworkBossId === "string" ? def.frameworkBossId : null }));
        return { ok: true, id: def.id };
    };
    // options → 解決済みの設定。profile / boss / 個別の指定の順に重ねる(個別の指定が最優先)
    const resolve = options => {
        const source = options && typeof options === "object" ? options : {};
        const config = { ...defaults };
        let bossDef = null, profileId = null;
        if (source.boss !== undefined && source.boss !== null && source.boss !== "") {
            bossDef = bosses.get(source.boss);
            if (!bossDef) return { ok: false, reason: "invalidOption:boss" };
            profileId = bossDef.profile;
        }
        if (source.profile !== undefined && source.profile !== null && source.profile !== "") profileId = source.profile;
        if (profileId) {
            const profile = profiles.get(profileId);
            if (!profile) return { ok: false, reason: "invalidOption:profile" };
            Object.assign(config, profile.data);
        }
        if (bossDef) Object.assign(config, bossDef.overrides);
        const error = mergeChecked(config, source);
        if (error) return { ok: false, reason: error };
        if (source.bounds !== undefined && source.bounds !== null) {
            const b = source.bounds;
            if (typeof b !== "object" || ![b.minX, b.maxX, b.minY, b.maxY].every(Number.isFinite) || b.minX > b.maxX || b.minY > b.maxY) return { ok: false, reason: "invalidOption:bounds" };
            config.bounds = { minX: b.minX, maxX: b.maxX, minY: b.minY, maxY: b.maxY };
        }
        config.profile = profileId || null;
        config.boss = bossDef ? bossDef.id : null;
        return { ok: true, config, boss: bossDef };
    };

    // ---- 幾何 ----
    const centroid = polygon => ({ x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length });
    const extent = (polygon, c, ax, ay) => {
        let lo = Infinity, hi = -Infinity;
        for (const p of polygon) { const d = (p.x - c.x) * ax + (p.y - c.y) * ay; if (d < lo) lo = d; if (d > hi) hi = d; }
        return { lo, hi };
    };
    const validPolygon = polygon => Array.isArray(polygon) && polygon.length >= 3 && polygon.every(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
    const rectPolygon = (c, w, h) => [{ x: c.x - w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y - h / 2 }, { x: c.x + w / 2, y: c.y + h / 2 }, { x: c.x - w / 2, y: c.y + h / 2 }];
    const heartNow = () => {
        const p = poc();
        if (!p?.isActive?.()) return null;
        const state = p.getState();
        const event = state?.active && typeof $gameMap !== "undefined" ? $gameMap.event(state.eventId) : null;
        const polygon = event && !event._erased ? occlusion()?.eventPolygon?.(event) : null;
        if (!validPolygon(polygon) || !state.hitCenter) return null;
        return { event, polygon, center: { x: state.hitCenter.x, y: state.hitCenter.y }, hp: state.hp, id: state.eventId };
    };
    const mapBounds = () => ({ minX: 0.5, maxX: $gameMap.width() - 0.5, minY: 0.5, maxY: $gameMap.height() - 0.5 });
    const clampPoint = (point, bounds) => ({ x: Math.min(bounds.maxX, Math.max(bounds.minX, point.x)), y: Math.min(bounds.maxY, Math.max(bounds.minY, point.y)) });
    const playerPoint = () => {
        try {
            const point = typeof $gamePlayer !== "undefined" && typeof $gamePlayer.centerPositionPoint === "function" ? $gamePlayer.centerPositionPoint() : null;
            return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : null;
        } catch (_error) { return null; }
    };

    // ---- 危険度の見積り(純粋な計算。ゲームの状態を変えない) ----
    // 脅威の幾何(速度・向き・大きさ)を毎回の判断の前に一度だけ計算する
    const prepareThreat = threat => {
        const speed = Math.hypot(threat.vel.x, threat.vel.y);
        if (threat.kind === "area") {
            threat.geo = { area: true };
            return threat.geo;
        }
        if (threat.seen < 2 || speed < MIN_THREAT_SPEED) { threat.geo = null; return null; }
        const ux = threat.vel.x / speed, uy = threat.vel.y / speed, nx = -uy, ny = ux;
        threat.geo = { speed, ux, uy, nx, ny, tLat: extent(threat.polygon, threat.pos, nx, ny), tAlong: extent(threat.polygon, threat.pos, ux, uy) };
        return threat.geo;
    };
    const overlaps = (a, b) => {
        // 軸平行の外接矩形ではなく、多角形の分離軸(凸)で判定する
        for (const poly of [a, b]) {
            for (let i = 0; i < poly.length; i++) {
                const p = poly[i], q = poly[(i + 1) % poly.length];
                const ax = -(q.y - p.y), ay = q.x - p.x;
                if (Math.abs(ax) + Math.abs(ay) < 1e-9) continue;
                const pa = a.map(v => v.x * ax + v.y * ay), pb = b.map(v => v.x * ax + v.y * ay);
                if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
            }
        }
        return true;
    };
    // 1つの脅威が、ハートを from から dest へ動かしたときに当たる危険(0か1)と、当たるまでの時間
    const dangerOf = (threat, heartRel, from, dest, perFrame, cfg) => {
        const geo = threat.geo;
        if (!geo) return { danger: 0, timeToHit: Infinity };
        const dist = Math.hypot(dest.x - from.x, dest.y - from.y);
        const at = fraction => ({ x: from.x + (dest.x - from.x) * fraction, y: from.y + (dest.y - from.y) * fraction });
        const margin = cfg.margin * (1 - cfg.riskTolerance);
        if (geo.area) {
            // 出ている近接の判定: 1frame先の位置で重なるか(寿命が短く、出た後には避けにくい)
            const life = Math.max(0, cfg.meleeAssumedLifetime - (threat.seen - 1));
            if (life <= 0) return { danger: 0, timeToHit: Infinity };
            const p = at(dist > 0 ? Math.min(1, perFrame / dist) : 1);
            const polygon = heartRel.map(v => ({ x: v.x + p.x, y: v.y + p.y }));
            return { danger: overlaps(polygon, threat.polygon) ? 1 : 0, timeToHit: 0 };
        }
        const { speed, ux, uy, nx, ny, tLat, tAlong } = geo;
        const hAlongOf = () => extent(heartRel, { x: 0, y: 0 }, ux, uy), hLatOf = () => extent(heartRel, { x: 0, y: 0 }, nx, ny);
        const hAlong = hAlongOf(), hLat = hLatOf();
        let p = dist > 0 ? from : dest, tHit = 0;
        for (let i = 0; i < 3; i++) {                                   // 自分が動いている途中の位置で、当たる時刻を見積る
            const rx = p.x - threat.pos.x, ry = p.y - threat.pos.y, ahead = rx * ux + ry * uy;
            if (ahead + hAlong.hi - tAlong.lo < 0) return { danger: 0, timeToHit: Infinity };       // もう通り過ぎた
            tHit = Math.max(0, (ahead + hAlong.lo - tAlong.hi) / speed);
            p = at(dist > 0 ? Math.min(1, tHit * perFrame / dist) : 1);
        }
        if (tHit > cfg.horizonFrames) return { danger: 0, timeToHit: Infinity };
        const lateral = (p.x - threat.pos.x) * nx + (p.y - threat.pos.y) * ny;
        // 追尾弾: 時間がたつほど横へ曲がって追える(観測した旋回の速さから見積る)
        const slack = threat.homing ? Math.min(3, 0.5 * speed * (threat.turnRate || 0.06) * tHit * tHit) : 0;
        const hit = lateral + hLat.hi > tLat.lo - margin - slack && lateral + hLat.lo < tLat.hi + margin + slack;
        return { danger: hit ? 1 : 0, timeToHit: tHit };
    };
    // 注意: 同時に見える脅威のうち、近い(早く当たる)順に maxThreats 個だけ評価する。残りは数えるだけ(実行時間の上限)。
    const selectThreats = (threats, heartRel, from, perFrame, cfg) => {
        const rows = [];
        for (const t of threats) {
            const r = dangerOf(t, heartRel, from, from, perFrame, cfg);
            rows.push({ threat: t, nowDanger: r.danger, timeToHit: r.timeToHit });
        }
        // 当たる時刻の早い順(当たらないものは後ろ)
        rows.sort((a, b) => (a.timeToHit - b.timeToHit) || (a.threat.id - b.threat.id));
        const kept = rows.slice(0, cfg.maxThreats);
        return { kept, dropped: rows.length - kept.length };
    };
    const evalAt = (rows, heartRel, from, dest, perFrame, cfg) => {
        let danger = 0;
        for (const row of rows) danger += dangerOf(row.threat, heartRel, from, dest, perFrame, cfg).danger;
        return danger;
    };
    // 回避先の候補: その場 + 周囲16方向 × (満距離, 半距離)。範囲内へ寄せる。
    const candidatesOf = (from, distance, bounds, extraDirs) => {
        const list = [{ x: from.x, y: from.y, stay: true, angle: 0, scale: 0 }];
        const seen = new Set([`${from.x.toFixed(3)},${from.y.toFixed(3)}`]);
        const dirs = [];
        for (let i = 0; i < DIRECTIONS; i++) dirs.push(i * 2 * Math.PI / DIRECTIONS);
        for (const d of extraDirs || []) dirs.push(d);
        for (const scale of [1, 0.5]) for (const angle of dirs) {
            const target = clampPoint({ x: from.x + Math.cos(angle) * distance * scale, y: from.y + Math.sin(angle) * distance * scale }, bounds);
            if (Math.hypot(target.x - from.x, target.y - from.y) < 0.05) continue;
            const key = `${target.x.toFixed(3)},${target.y.toFixed(3)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            list.push({ ...target, stay: false, angle, scale });
        }
        return list;
    };
    const angleDiff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
    // 最も危険の低い回避先を選ぶ。危険が同じなら、脅威の進行方向に直角へ・好む向き・攻撃性で決める(決定的)。
    const chooseDestination = (state, heartRel, rows, normalAngle) => {
        const cfg = state.config, perFrame = cfg.moveSpeed / 60;
        const extra = normalAngle === null ? [] : [normalAngle, normalAngle + Math.PI];
        const list = candidatesOf(state.pos, cfg.dodgeDistance, state.bounds, extra);
        const player = state.player;
        let best = null;
        for (const c of list) {
            const danger = evalAt(rows, heartRel, state.pos, c, perFrame, cfg);
            let tie = 0;
            if (!c.stay && normalAngle !== null) tie += 0.2 * Math.min(angleDiff(c.angle, normalAngle), angleDiff(c.angle, normalAngle + Math.PI)) / Math.PI;
            if (!c.stay) tie += (1 - c.scale) * 0.05;                                   // 満距離を好む
            if (!c.stay) {
                const dx = c.x - state.pos.x, dy = c.y - state.pos.y;
                if (cfg.preferredSide === "left") tie -= 0.05 * (-dx / (Math.hypot(dx, dy) || 1));
                if (cfg.preferredSide === "right") tie -= 0.05 * (dx / (Math.hypot(dx, dy) || 1));
                if (player && (cfg.preferredSide === "toward" || cfg.preferredSide === "away" || cfg.aggression > 0)) {
                    const before = Math.hypot(state.pos.x - player.x, state.pos.y - player.y), after = Math.hypot(c.x - player.x, c.y - player.y);
                    const approach = (before - after) / Math.max(0.01, cfg.dodgeDistance);                 // 近づくほど正
                    if (cfg.preferredSide === "toward") tie -= 0.05 * approach;
                    if (cfg.preferredSide === "away") tie += 0.05 * approach;
                    tie -= 0.08 * cfg.aggression * approach;
                }
            }
            const score = danger * 1000 + tie;
            if (!best || score < best.score - 1e-9) best = { c, danger, score };
        }
        return { best, candidates: list.length, stayDanger: evalAt(rows, heartRel, state.pos, state.pos, perFrame, cfg) };
    };

    // ---- 状態の作成・破棄 ----
    const create = (config, bossDef, base) => {
        const heart = heartNow();
        if (!heart) return null;
        const half = { x: config.boundsHalfX, y: config.boundsHalfY };
        const own = config.bounds || { minX: heart.center.x - half.x, maxX: heart.center.x + half.x, minY: heart.center.y - half.y, maxY: heart.center.y + half.y };
        const world = mapBounds();
        const bounds = { minX: Math.max(own.minX, world.minX), maxX: Math.min(own.maxX, world.maxX), minY: Math.max(own.minY, world.minY), maxY: Math.min(own.maxY, world.maxY) };
        const home = clampPoint(heart.center, bounds);
        const heartRel = heart.polygon.map(p => ({ x: p.x - heart.center.x, y: p.y - heart.center.y }));
        return { config: { ...config }, base: { ...(base || config) }, boss: bossDef || null, phaseIndex: -1, frame: 0, state: "idle", stateFrames: 0, pos: { ...home }, home, bounds, heartRel,
            target: null, cooldownLeft: 0, recoveryLeft: 0, threats: new Map(), lastDodge: null, lastHp: heart.hp, maxHp: heart.hp, eventId: heart.id, freqAcc: 0,
            recentDodges: [], pendingMove: null, feintUntil: -1, selected: null, lastReason: null, lastEval: null, player: null, hpDropFrame: -1, cues: [],
            stats: { noticed: 0, dodges: 0, hitsTaken: 0, passed: 0, skippedCooldown: 0, skippedRecovery: 0, skippedFrequency: 0, noRoom: 0, noImprovement: 0,
                cancels: 0, redirects: 0, baited: 0, meleeCues: 0, hitReactions: 0, sidesteps: 0, exhaustions: 0, staggers: 0, trackDropped: 0, threatsDropped: 0, evaluations: 0, maxEvalCost: 0 } };
    };
    const reset = reason => {
        if (ai) { note({ type: "reset", reason }); totals.resets++; }
        ai = null; pending = null;
    };

    // ---- 観測: マップに出ている飛び道具・近接の判定のEventを、位置の変化から追う(入力は見ない) ----
    const headingDiff = (a, b) => { let d = Math.abs(a - b); if (d > Math.PI) d = 2 * Math.PI - d; return d; };
    const onThreatGone = (threat, heart) => {
        if (threat.kind !== "projectile") return;
        if (ai.hpDropFrame === ai.frame || ai.hpDropFrame === ai.frame - 1) { ai.stats.passed += 0; return; }              // 当たって消えた
        const geo = threat.geo;
        // 最後に見えた位置から、ハートまでの距離(進行方向)。遠くで消えた弾は「取り消された」とみなす
        let gap = null;
        if (geo) {
            const rx = heart.center.x - threat.pos.x, ry = heart.center.y - threat.pos.y;
            gap = rx * geo.ux + ry * geo.uy;
        }
        if (gap !== null && gap > ai.config.cancelGapTiles && threat.seen >= 2) {
            ai.stats.cancels++;
            ai.cues.push({ type: "cancel", frame: ai.frame, threatId: threat.id, gap: +gap.toFixed(2) });
            note({ type: "cancel", threatId: threat.id, gap: +gap.toFixed(2) });
            ai.feintUntil = ai.frame + ai.config.feintMemoryFrames;
            const wasDodging = ai.lastDodge && ai.lastDodge.threatId === threat.id && (ai.state === "dodging" || ai.state === "recovering");
            if (wasDodging) {                                                        // 取り消しに釣られた回避 = 付け入る隙
                ai.stats.baited++;
                if (ai.state === "recovering") ai.recoveryLeft += Math.round(ai.config.baitRecoveryFrames * ai.config.feintSusceptibility);
                else ai.baitPenalty = (ai.baitPenalty || 0) + Math.round(ai.config.baitRecoveryFrames * ai.config.feintSusceptibility);
            }
        } else {
            ai.stats.passed++;
        }
    };
    const observe = heart => {
        const occ = occlusion();
        const seen = new Set();
        for (const event of $gameMap.events()) {
            if (!event || event._erased || event === heart.event) continue;
            const eventNote = event.event?.()?.note;
            if (typeof eventNote !== "string") continue;
            let tag = THREAT_TAGS.find(t => eventNote.includes(t)), kind = "projectile";
            if (!tag) { tag = MELEE_TAGS.find(t => eventNote.includes(t)); kind = "area"; }
            if (!tag) continue;
            const id = event.eventId();
            if (ai.threats.size >= MAX_TRACKED && !ai.threats.has(id)) { ai.stats.trackDropped++; continue; }
            const polygon = occ?.eventPolygon?.(event);
            if (!validPolygon(polygon)) continue;
            const position = centroid(polygon);
            let threat = ai.threats.get(id);
            if (!threat || threat.event !== event) {
                threat = { id, event, tag, kind, first: ai.frame, pos: position, vel: { x: 0, y: 0 }, seen: 0, polygon, decided: false, homing: HOMING_TAGS.includes(tag), turnRate: 0, heading: null, geo: null };
                ai.threats.set(id, threat);
            } else {
                threat.vel = { x: position.x - threat.pos.x, y: position.y - threat.pos.y };
                threat.pos = position; threat.polygon = polygon;
                const speed = Math.hypot(threat.vel.x, threat.vel.y);
                if (kind === "projectile" && speed >= MIN_THREAT_SPEED) {
                    const heading = Math.atan2(threat.vel.y, threat.vel.x);
                    if (threat.heading !== null) {
                        const delta = headingDiff(heading, threat.heading);
                        if (threat.homing) threat.turnRate = threat.turnRate ? threat.turnRate * 0.7 + delta * 0.3 : delta;
                        else if (delta > ai.config.redirectDegrees * Math.PI / 180) {            // 向きの急変(フェイント): 見直しの遅れをやり直す
                            ai.stats.redirects++;
                            ai.cues.push({ type: "redirect", frame: ai.frame, threatId: id, degrees: +(delta * 180 / Math.PI).toFixed(1) });
                            note({ type: "redirect", threatId: id, degrees: +(delta * 180 / Math.PI).toFixed(1) });
                            threat.first = ai.frame; threat.decided = false; threat.skipped = false; threat.freqChecked = false; threat.allowed = false;
                            ai.feintUntil = ai.frame + ai.config.feintMemoryFrames;
                            const wasDodging = ai.lastDodge && ai.lastDodge.threatId === id && (ai.state === "dodging" || ai.state === "recovering");
                            if (wasDodging) {
                                ai.stats.baited++;
                                if (ai.state === "recovering") ai.recoveryLeft += Math.round(ai.config.baitRecoveryFrames * ai.config.feintSusceptibility);
                                else ai.baitPenalty = (ai.baitPenalty || 0) + Math.round(ai.config.baitRecoveryFrames * ai.config.feintSusceptibility);
                            }
                        }
                    }
                    threat.heading = heading;
                }
            }
            if (kind === "area" && threat.seen === 0) {                                        // 近接の判定が初めて見えた: 向き(イベント自身の回転角)を記録する
                // 当たったかどうかは、判定の多角形の重なりではなく「自分のHPが減ったか」で判断する(動的な判定は多角形の位置が実際の当たりと半タイルずれて見えるため)
                const rotation = Number(event._rotation);
                const axis = Number.isFinite(rotation) ? (rotation - 90) * Math.PI / 180 : longAxis(polygon, position);
                threat.axis = axis;
                ai.stats.meleeCues++;
                const cue = { type: "melee", frame: ai.frame, threatId: id, tag, axis, touched: false };
                ai.cues.push(cue); ai.lastAreaCue = cue;
                note({ type: "meleeCue", tag, axis: +(axis * 180 / Math.PI).toFixed(1) });
            }
            threat.seen++;
            seen.add(id);
        }
        for (const [id, threat] of [...ai.threats]) {
            if (seen.has(id)) continue;
            onThreatGone(threat, heart);
            ai.threats.delete(id);
        }
    };
    // 長い辺の向き(ラジアン、x軸基準)
    const longAxis = (polygon, c) => {
        let best = 0, bestLen = -1;
        for (let i = 0; i < polygon.length; i++) {
            const p = polygon[i], q = polygon[(i + 1) % polygon.length], len = Math.hypot(q.x - p.x, q.y - p.y);
            if (len > bestLen) { bestLen = len; best = Math.atan2(q.y - p.y, q.x - p.x); }
        }
        void c;
        return best;
    };
    const schedulePending = (reason, extra) => {
        if (ai.pendingMove && ai.pendingMove.reason === "meleeSidestep" && reason !== "meleeSidestep") return;
        ai.pendingMove = { reason, due: ai.frame + ai.config.reactionFrames, born: ai.frame, ...extra };
    };

    // ---- 判断 ----
    const reactionFor = threat => {
        const cfg = ai.config;
        const jitter = cfg.reactionJitter > 0 ? (threat.id * 7 + 3) % (cfg.reactionJitter + 1) : 0;       // 決定的(乱数なし)
        const hesitation = threat.first <= ai.feintUntil ? Math.round(cfg.feintHesitationFrames * cfg.feintSusceptibility) : 0;
        return cfg.reactionFrames + jitter + hesitation;
    };
    const enter = (state, frames = 0) => { ai.state = state; ai.stateFrames = 0; if (state === "recovering" || state === "exhausted" || state === "staggered") ai.recoveryLeft = frames; };
    const moveToward = (target, perFrame) => {
        const dx = target.x - ai.pos.x, dy = target.y - ai.pos.y, length = Math.hypot(dx, dy);
        if (length <= perFrame + 1e-9) { ai.pos = { x: target.x, y: target.y }; return true; }
        ai.pos = { x: ai.pos.x + dx / length * perFrame, y: ai.pos.y + dy / length * perFrame };
        return false;
    };
    const beginDodge = (dest, info) => {
        ai.target = { x: dest.x, y: dest.y };
        ai.cooldownLeft = ai.config.cooldownFrames;
        ai.stats.dodges++;
        ai.lastDodge = { frame: ai.frame, reason: info.reason, threat: info.threat?.tag || null, threatId: info.threat?.id ?? null, timeToHit: info.timeToHit === undefined || !Number.isFinite(info.timeToHit) ? null : +info.timeToHit.toFixed(2),
            from: { ...ai.pos }, to: { ...dest }, side: info.side ?? 0, distance: +Math.hypot(dest.x - ai.pos.x, dest.y - ai.pos.y).toFixed(3), danger: info.danger, dangerBefore: info.dangerBefore, candidates: info.candidates };
        note({ type: "dodgeStart", ...ai.lastDodge });
        enter("dodging");
    };
    const afterDodge = () => {
        note({ type: "dodgeEnd", at: { ...ai.pos } });
        const weak = ai.boss?.weakness;
        if (weak?.exhaustAfterDodges > 0) {                                                  // 連続回避で息切れ(付け入る隙)
            ai.recentDodges.push(ai.frame);
            ai.recentDodges = ai.recentDodges.filter(f => ai.frame - f <= (weak.exhaustWindowFrames || 600));
            if (ai.recentDodges.length >= weak.exhaustAfterDodges) {
                ai.recentDodges = [];
                ai.stats.exhaustions++;
                note({ type: "exhausted", frames: weak.exhaustFrames || 0 });
                return enter("exhausted", weak.exhaustFrames || 0);
            }
        }
        const frames = ai.config.recoveryFrames + (ai.baitPenalty || 0);
        ai.baitPenalty = 0;
        enter("recovering", frames);
        if (ai.recoveryLeft <= 0) enter("idle");
    };
    const updatePhase = heart => {
        if (!ai.boss) return;
        let ratio = ai.maxHp > 0 && Number.isFinite(heart.hp) ? heart.hp / ai.maxHp : 1;
        const framework = root.ProjectRBossFramework?.getState?.();                           // 読み取り専用
        if (framework && ai.boss.frameworkBossId && framework.bossId === ai.boss.frameworkBossId && framework.maxHp > 0) ratio = framework.hp / framework.maxHp;
        let index = -1;
        ai.boss.phases.forEach((phase, i) => { if (ratio <= phase.hpRatio + 1e-9) index = i; });
        if (index === ai.phaseIndex) return;
        ai.phaseIndex = index;
        ai.config = { ...ai.base, ...(index >= 0 ? ai.boss.phases[index].overrides : {}) };
        note({ type: "phase", index, id: index >= 0 ? ai.boss.phases[index].id : "base", ratio: +ratio.toFixed(3) });
    };

    // 退避(被弾後・近接の判定の向きへの備え): 脅威の進行方向ではなく、プレイヤーとの位置関係または判定の向きに直角へ動く
    const doPendingMove = heart => {
        const move = ai.pendingMove;
        if (!move || ai.frame < move.due || ai.cooldownLeft > 0) { if (move && ai.frame - move.born > 120) ai.pendingMove = null; return false; }
        ai.pendingMove = null;
        const cfg = ai.config, player = ai.player;
        let normal;
        if (move.axis !== undefined) normal = move.axis + Math.PI / 2;
        else if (player) normal = Math.atan2(ai.pos.y - player.y, ai.pos.x - player.x) + Math.PI / 2;
        else return false;
        const distance = move.reason === "meleeSidestep" ? cfg.meleeSidestepDistance : cfg.hitReactionDistance;
        const list = candidatesOf(ai.pos, distance, ai.bounds, [normal, normal + Math.PI]).filter(c => !c.stay && c.scale === 1 && (angleDiff(c.angle, normal) < 0.01 || angleDiff(c.angle, normal + Math.PI) < 0.01));
        if (!list.length) return false;
        const rows = [...ai.threats.values()].filter(t => t.kind === "projectile" && prepareThreat(t)).map(t => ({ threat: t }));
        const perFrame = cfg.moveSpeed / 60;
        let best = null;
        for (const c of list) {
            const score = evalAt(rows, ai.heartRel, ai.pos, c, perFrame, cfg) * 1000 + (cfg.preferredSide === "left" ? (c.x > ai.pos.x ? 1 : 0) : cfg.preferredSide === "right" ? (c.x < ai.pos.x ? 1 : 0) : 0) + (c.x < ai.pos.x ? 0.001 : 0);
            if (!best || score < best.score) best = { c, score };
        }
        if (!best) return false;
        if (move.reason === "meleeSidestep") ai.stats.sidesteps++; else ai.stats.hitReactions++;
        beginDodge(best.c, { reason: move.reason, threat: null, side: 0, danger: 0, dangerBefore: null, candidates: list.length });
        void heart;
        return true;
    };

    const tick = () => {
        if (!soul()?.isActive?.()) { if (ai) reset("soulInactive"); return; }
        const heart = heartNow();
        if (!heart) { if (ai) reset("heartGone"); return; }
        if (!ai) {
            if (!pending) return;
            ai = create(pending.config, pending.boss, pending.base); pending = null;
            if (!ai) return;
            note({ type: "start", home: { ...ai.home }, bounds: { ...ai.bounds }, profile: ai.config.profile, boss: ai.config.boss });
        }
        ai.frame++;
        ai.player = playerPoint();
        if (ai.cooldownLeft > 0) ai.cooldownLeft--;
        // 被弾(自分のHPの減り)は誰にでも分かる事実。ダメージそのものは扱わない
        if (Number.isFinite(heart.hp) && Number.isFinite(ai.lastHp) && heart.hp < ai.lastHp) {
            const drop = ai.lastHp - heart.hp;
            ai.stats.hitsTaken++; ai.hpDropFrame = ai.frame;
            const weak = ai.boss?.weakness;
            if (weak?.staggerDamage > 0 && drop >= weak.staggerDamage && ai.state !== "staggered") {      // 大ダメージで怯む(付け入る隙)
                ai.stats.staggers++; ai.target = null;
                note({ type: "staggered", drop, frames: weak.staggerFrames || 0 });
                enter("staggered", weak.staggerFrames || 0);
            }
            const cue = ai.lastAreaCue;
            if (cue && !cue.touched && ai.frame - cue.frame <= 2) {                         // 直前に見えた近接の判定に触れた(被弾した)
                cue.touched = true;
                if (ai.config.meleeWary) schedulePending("meleeSidestep", { axis: cue.axis });
            }
            if (ai.config.hitReaction) schedulePending("hitReaction");
        }
        ai.lastHp = heart.hp;
        updatePhase(heart);
        const attacking = soul().getPhase() === "attack";
        if (attacking) observe(heart); else { ai.threats.clear(); ai.selected = null; }
        ai.stateFrames++;
        const perFrame = ai.config.moveSpeed / 60;

        if (ai.state === "dodging") {
            if (moveToward(ai.target, perFrame)) afterDodge();
        } else if (ai.state === "recovering" || ai.state === "exhausted" || ai.state === "staggered") {
            if (--ai.recoveryLeft <= 0) enter("idle");
            else if (attacking) for (const t of ai.threats.values()) {                 // 動けない間に危険な弾が来たら見送りを記録
                if (t.kind === "projectile" && !t.skipped && ai.frame - t.first >= reactionFor(t) && prepareThreat(t) &&
                    dangerOf(t, ai.heartRel, ai.pos, ai.pos, perFrame, ai.config).danger > 0) { t.skipped = true; ai.stats.skippedRecovery++; }
            }
        } else if (attacking) {
            decide(heart, perFrame);
        }
        // 戻る先で当たりそうな脅威が無いときだけ、ゆっくりホームへ戻る(通り過ぎた矢は気にしない)
        if (ai.state === "idle" && ai.config.returnSpeed > 0 && !ai.pendingMove && (ai.pos.x !== ai.home.x || ai.pos.y !== ai.home.y)) {
            const saved = ai.pos;
            moveToward(ai.home, ai.config.returnSpeed / 60);
            const next = ai.pos;
            ai.pos = saved;
            const rows = [...ai.threats.values()].filter(t => t.kind === "projectile" && prepareThreat(t)).map(t => ({ threat: t }));
            if (evalAt(rows, ai.heartRel, next, next, perFrame, ai.config) === 0) ai.pos = next;
        }
        const applied = poc().moveHeartTo(ai.pos.x, ai.pos.y);
        if (!applied?.ok) note({ type: "moveFailed", reason: applied?.reason });
    };

    const decide = (heart, perFrame) => {
        const cfg = ai.config;
        // 気づいている脅威(反応の遅れを過ぎたもの)だけが対象。まだ気づいていない弾は考慮しない(情報の制限)
        const aware = [];
        for (const t of ai.threats.values()) {
            if (ai.frame - t.first < reactionFor(t)) continue;
            if (t.kind === "projectile") { if (prepareThreat(t)) aware.push(t); }
        }
        if (aware.length) {
            const { kept, dropped } = selectThreats(aware, ai.heartRel, ai.pos, perFrame, cfg);
            if (dropped) ai.stats.threatsDropped += dropped;
            const dangerous = kept.filter(r => r.nowDanger > 0);
            ai.selected = dangerous.length ? { id: dangerous[0].threat.id, tag: dangerous[0].threat.tag, timeToHit: +dangerous[0].timeToHit.toFixed(2), count: dangerous.length } : null;
            // 回避の頻度(決定的): 新しく危険になった脅威ごとに、頻度ぶんの回数だけ「避けようとする」
            let trigger = null;
            for (const row of dangerous) {
                const t = row.threat;
                if (!t.freqChecked) {
                    t.freqChecked = true;
                    ai.freqAcc += cfg.dodgeFrequency;
                    if (ai.freqAcc >= 1 - 1e-9) { ai.freqAcc -= 1; t.allowed = true; } else { t.allowed = false; ai.stats.skippedFrequency++; }
                    if (!t.decided) { t.decided = true; ai.stats.noticed++; }
                }
                if (t.allowed && !trigger) trigger = row;
            }
            if (trigger) {
                if (ai.cooldownLeft > 0) { if (!trigger.threat.skipped) { trigger.threat.skipped = true; ai.stats.skippedCooldown++; } }
                else {
                    const lead = trigger.threat.geo;
                    const normalAngle = Math.atan2(lead.ny, lead.nx);
                    const { best, candidates, stayDanger } = chooseDestination(ai, ai.heartRel, kept, normalAngle);
                    ai.stats.evaluations++; ai.lastEval = { threats: kept.length, candidates, cost: kept.length * candidates, dropped };
                    ai.stats.maxEvalCost = Math.max(ai.stats.maxEvalCost, ai.lastEval.cost);
                    if (!best || best.c.stay || best.danger >= stayDanger) {
                        if (!trigger.threat.skipped) { trigger.threat.skipped = true; if (best && !best.c.stay) ai.stats.noImprovement++; else ai.stats.noRoom++; }
                    } else {
                        const reason = dangerous.length > 1 ? `multi(${dangerous.length})` : trigger.threat.homing ? "homing" : "projectile";
                        const lateral = (best.c.x - ai.pos.x) * lead.nx + (best.c.y - ai.pos.y) * lead.ny;
                        ai.lastReason = reason;
                        beginDodge(best.c, { reason, threat: trigger.threat, timeToHit: trigger.timeToHit, side: lateral >= 0 ? 1 : -1, danger: best.danger, dangerBefore: stayDanger, candidates });
                        return;
                    }
                }
            }
        } else ai.selected = null;
        doPendingMove(heart);
    };

    // ---- フレームごと・後始末 ----
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            if ((ai || pending) && sceneActive && !this.eventsPaused) {
                try { tick(); } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
            }
            return _update.apply(this, arguments);
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { reset("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[name];
            if (typeof original !== "function") continue;
            DataManager[name] = function() { reset(name); return original.apply(this, arguments); };
        }
    }
    root.ProjectRSoulBattle?.onEnd?.(() => reset("soulEnd"));
    root.ProjectRSoulBattle?.onPhase?.(event => { if (ai && event?.to === "defense") { ai.threats.clear(); ai.selected = null; note({ type: "defenseEnter" }); } });

    // ---- 公開API ----
    const arm = options => {
        const resolved = resolve(options);
        if (!resolved.ok) return resolved;
        pending = { config: resolved.config, boss: resolved.boss, base: resolved.config };
        totals.arms++;
        if (soul()?.isActive?.() && heartNow()) {
            ai = create(pending.config, pending.boss, pending.base); pending = null;
            if (ai) note({ type: "start", home: { ...ai.home }, bounds: { ...ai.bounds }, profile: ai.config.profile, boss: ai.config.boss });
        }
        return { ok: true, config: { ...resolved.config }, applied: !!ai };
    };
    // 動作中の性格を切り替える(位置・状態・統計は保つ)。個別の上書きは捨てる。
    const switchTo = (key, id) => {
        if (!ai) return { ok: false, reason: "inactive" };
        const resolved = resolve({ [key]: id, bounds: { minX: ai.bounds.minX, maxX: ai.bounds.maxX, minY: ai.bounds.minY, maxY: ai.bounds.maxY } });
        if (!resolved.ok) return resolved;
        ai.config = { ...resolved.config }; ai.base = { ...resolved.config }; ai.boss = resolved.boss; ai.phaseIndex = -1;
        ai.cooldownLeft = 0; ai.freqAcc = 0;
        note({ type: "switch", [key]: id });
        return { ok: true, config: { ...ai.config } };
    };
    const disarm = () => { const had = !!(ai || pending); reset("disarm"); return had; };
    const getState = () => {
        if (!ai) return { armed: !!pending, active: false };
        return {
            armed: false, active: true, state: ai.state, frame: ai.frame, stateFrames: ai.stateFrames, position: { ...ai.pos }, home: { ...ai.home }, target: ai.target && { ...ai.target },
            bounds: { ...ai.bounds }, cooldownLeft: ai.cooldownLeft, recoveryLeft: ai.recoveryLeft, lastDodge: ai.lastDodge && { ...ai.lastDodge },
            selectedThreat: ai.selected && { ...ai.selected }, dodgeReason: ai.lastDodge ? ai.lastDodge.reason : null, lastEval: ai.lastEval && { ...ai.lastEval },
            profile: ai.config.profile, boss: ai.config.boss, phase: ai.boss ? (ai.phaseIndex >= 0 ? ai.boss.phases[ai.phaseIndex].id : "base") : null,
            pendingMove: ai.pendingMove && { reason: ai.pendingMove.reason, due: ai.pendingMove.due }, feintActive: ai.frame <= ai.feintUntil, cues: ai.cues.slice(-8),
            threats: [...ai.threats.values()].map(t => ({ id: t.id, tag: t.tag, kind: t.kind, homing: t.homing, seen: t.seen, speed: +Math.hypot(t.vel.x, t.vel.y).toFixed(3), noticed: t.decided, skipped: !!t.skipped })),
            stats: { ...ai.stats }, config: { ...ai.config }
        };
    };
    // 純粋な評価(テスト・診断用): ゲームの状態を使わず、与えた状況で回避先を選ぶ。
    //   scenario = { config, heart:{center,w,h}, pos, bounds:{...}, player?, threats:[{ id, pos, vel, w, h, homing?, turnRate?, kind?, seen? }] }
    const simulate = scenario => {
        const resolved = resolve(scenario?.config || {});
        if (!resolved.ok) return resolved;
        const cfg = resolved.config, c = scenario.heart?.center || { x: 0, y: 0 };
        const heartRel = rectPolygon({ x: 0, y: 0 }, scenario.heart?.w ?? 0.8, scenario.heart?.h ?? 0.8);
        const pos = scenario.pos || c;
        const bounds = scenario.bounds || { minX: pos.x - cfg.boundsHalfX, maxX: pos.x + cfg.boundsHalfX, minY: pos.y - cfg.boundsHalfY, maxY: pos.y + cfg.boundsHalfY };
        const threats = (scenario.threats || []).map((t, i) => {
            const threat = { id: t.id ?? i + 1, tag: t.tag || "<synthetic>", kind: t.kind || "projectile", pos: { ...t.pos }, vel: { ...t.vel }, seen: t.seen ?? 5, homing: !!t.homing, turnRate: t.turnRate || 0,
                polygon: rectPolygon(t.pos, t.w ?? 0.3, t.h ?? 0.3), geo: null };
            prepareThreat(threat);
            return threat;
        });
        const state = { config: cfg, pos: { ...pos }, bounds, player: scenario.player || null };
        const { kept, dropped } = selectThreats(threats.filter(t => t.geo), heartRel, state.pos, cfg.moveSpeed / 60, cfg);
        if (!kept.length) return { ok: true, action: "none", dropped, evaluated: 0, candidates: 0, dangerNow: 0 };
        const lead = kept.find(r => r.nowDanger > 0)?.threat || kept[0].threat;
        const normalAngle = lead.geo && !lead.geo.area ? Math.atan2(lead.geo.ny, lead.geo.nx) : null;
        const { best, candidates, stayDanger } = chooseDestination(state, heartRel, kept, normalAngle);
        return { ok: true, action: !best || best.c.stay || best.danger >= stayDanger ? "stay" : "dodge", dest: best && { x: best.c.x, y: best.c.y }, danger: best?.danger, dangerNow: stayDanger,
            evaluated: kept.length, dropped, candidates, cost: kept.length * candidates };
    };

    root.ProjectRSoulBattleDodge = Object.freeze({
        THREAT_TAGS, HOMING_TAGS, MELEE_TAGS, UNSUPPORTED_TAGS, CUES, defaults, LIMITS, arm, disarm, simulate,
        registerProfile, registerBoss, getProfile: id => profiles.get(id) || null, getBoss: id => bosses.get(id) || null,
        listProfiles: () => [...profiles.keys()], listBosses: () => [...bosses.keys()],
        setProfile: id => switchTo("profile", id), setBoss: id => switchTo("boss", id),
        isArmed: () => !!pending, isActive: () => !!ai, getState,
        getStats: () => (ai ? { ...ai.stats } : null), getLog: () => log.map(entry => ({ ...entry })), totals: () => ({ ...totals })
    });
})();
