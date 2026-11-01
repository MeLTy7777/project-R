/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「エロスの矢」(設計ID 9 / apollo_eros_arrow) Lv1: 1秒で10本のピンクゴールドの矢を連射。矢ごとに追尾(3マス以内)、敵に20ダメージ・味方に50回復。命中が確定してから消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_PartyRoster
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_CardModifiers
 * @orderAfter ProjectR_PartyRoster
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 * @orderAfter ProjectR_ApolloGoldenVolley
 *
 * @param ArrowSoundEffect
 * @text 矢を放つ効果音(RTPのSE名。空なら鳴らさない。2本に1回)
 * @desc ワークブックは「一本ごとに竪琴」。竪琴の素材は無いので、RTPのChime2を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Chime2
 *
 * @param ImpactSoundEffect
 * @text 命中の効果音(RTPのSE名。空なら鳴らさない。4frameより近い命中は間引く)
 * @desc 仮のRTP音(Chime1)です。
 * @type string
 * @default Chime1
 *
 * @help
 * ProjectR_ApolloErosArrow.js
 *
 * Apollo「エロスの矢」(ワークブック設計ID 9 / 特殊 / 最大5枚 / Cooldown 5秒 / Ground / 壁越え はい)の Lv1 だけを実装します。
 * Lv2(3方向・1方向7本)とLv3(追尾範囲7・中央がビーム)は未実装で、カードの登録上の最大Lvは1です(Lv2〜3は使えません)。
 *
 * 【Lv1(ワークブック)】ゴールドピンクの矢を連続で1秒間に10本放つ。途中で方向転換可能。放った矢の付近3マス以内に味方、敵がいた場合追尾する。
 *   味方に当たると一本につき50ヒール、敵に当たると一本につき20ダメージ。
 *
 * 【実装】
 *   ・発動(予約): マウス方向を向いて連射が始まる。発動の時点ではカードを消費しない。
 *   ・連射: 10本を 1秒(60更新。0,6,12,…,54更新目)に等間隔で放つ。矢ごとに「その瞬間のマウス方向」と「その瞬間のプレイヤー位置」から出る(途中の方向転換で後の矢の向きが変わる)。
 *   ・矢: 速さ・寿命・追尾の範囲・曲がる速さ・ダメージ・回復量・本数・連射の時間は data/ProjectR_CardBalance.json と開発用エディタ F6 で変えられる。
 *     矢は壁・Region・通行不能を無視して通り抜ける(ワークブック「壁越え: はい」)。マップの端・寿命でだけ消える。
 *   ・追尾: 矢の「からだ(当たり判定)」まで3マス以内にいる対象へ、曲がる速さの上限つきで向きを寄せる。いったん狙った対象は、範囲内にいる間は変えない。
 *   ・命中: 矢の通った線(掃き)と対象の当たり判定の交差で1本につき1回。当たった矢は消える(貫通なし・二重命中なし)。敵へは固定20(属性なし・弱点倍率1)、味方へは回復50(最大HPまで)。
 *     複数の対象に別々に当たってよい。敵を回復することも、味方を傷つけることもない(判定の対象がそもそも別)。
 *   ・消費: 最初の有効な命中(敵へのダメージ、または回復できる味方への命中)の瞬間に、正規の経路(requestUseCard)で1回だけ消費してCooldown。
 *     そのあとも残りの矢は撃ち続ける。全部外れたら消費しない。連射が終わるまで(命中前は確定まで)、同じカードの再発動は拒否する。
 *   ・取消・後片付け: 戦闘終了・マップ移動・ロード・主人公の戦闘不能・手札から消えた・対象の消滅で、矢のEvent・VFX・召喚の表示を残さない。
 *
 * 【仮の決め(ワークブックに無い。後から変えられる。仮であり確定ではない)】
 *   1. 対象の優先: 矢から対象のからだまでの距離が最も近い対象(敵と味方を区別しない)。同じ距離なら味方を先、次にEvent IDの小さい方。いったん決めた対象は範囲内にいる間は保つ。
 *   2. 主人公自身: 回復の対象にしない(selfHealEnabled=0)。1にすると、放った位置から0.8マス以上離れた矢が主人公のHPが減っていれば当たる。
 *   3. HP満タンの味方: 当てない・追尾もしない(素通り。fullHpAlliesEligible=0)。1にすると満タンでも当たり(回復量0)、確定の有効な命中になる。
 *   4. 味方 = ProjectR_PartyRoster の「出撃中の仲間(ダウンを除く)」だけ。任意のNPC・召喚物は含まない。仲間のAI・移動は変えない。
 *   5. 同じframeに同じ味方へ複数の矢が当たるとき、先の矢でHPが満タンになったら、後の矢は「無効な命中」として消える(重ねて回復しない)。
 *
 * 【演出(表示だけ。失敗しても消費・ダメージに影響しない)】
 *   通常のカットイン1回・Apollo(一時召喚の表示Event。連射が終わるまで出す)・主人公は片手を伸ばす(ArmExtend)。
 *   矢は専用の矢Event(Map002のテンプレート「ProjectR Apollo Eros Arrow」。DEVの自作画像 $ProjectR_ErosArrow)で、位置・向きはプラグインが毎frame与える。
 *   VFX Designerライブラリ(ProjectR_Eros_*): 放つ閃光(2本に1回)・飛ぶ矢の光(同時に最大6本)・命中の火花(敵)/癒しの光(味方)。1度に出す数に上限があり、終われば公式のdisposeで外す。
 *   効果音はパラメータ。竪琴の素材は無いので仮のRTPのChime。
 *
 * API: ProjectRApolloErosArrow
 *   CARD / implementedMaxLevel / config() / emitSchedule(count, frames) / geometry{ distanceToPolygon, footprint }
 *   isPending() / getPending() / getSequences() / getActiveArrows() / getEmissionLog() / getHitLog() / getLastResult() / getTempObjectCount() / getActiveVfxJobs()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_eros_arrow";
    const TAG = "<projectRErosArrow>";
    const TEMPLATE_NAME = "ProjectR Apollo Eros Arrow";
    const BOW_SPRITE = "ProjectR_Bow_DEV";
    const IMPLEMENTED_MAX_LEVEL = 1; // Lv2〜3は未実装(登録上の最大Lvも1)
    const EPSILON = 1e-8;
    const ALONG_HALF = 0.15; // 矢の当たり判定: 進行方向の半分の長さ(0.3マス)
    const ACROSS_HALF = 0.1; // 直交方向の半分の幅(0.2マス)
    const ALLY_BODY_HALF = 0.35; // からだの当たり判定が取れないときの代用(0.7マス角)
    const SELF_MIN_TRAVEL = 0.8; // 主人公自身へ当たるのは、放った位置からこれ以上離れてから
    const PRESENT_EVERY = 2; // 放つ演出(弓・閃光・音)は何本に1回か(同時の表示物と音の重なりを抑える)
    const GLOW_BUDGET = 6; // 飛ぶ矢の光を同時に付ける最大本数
    const SHORT_VFX_BUDGET = 6; // 放つ閃光・命中の火花を同時に出す最大数
    const SHORT_VFX_FRAMES = 26; // これを過ぎたら公式のdisposeで確実に外す
    const IMPACT_SOUND_GAP_FRAMES = 4;
    const ROTATION_PIVOT_PX = 10; // 実機で測った値: 回した矢Eventの絵の中心は、Eventの画面位置より尾の側へこのpx(回転の支点)ずれる
    const SHIFT_Y_PX = 6; // MZの通常キャラクターは、画面位置が足元より6px上
    const MIN_SHOWN_DEGREE = 0.01; // Hendrixはちょうど0度のEventを「回していない」扱いにして絵の位置の式が変わる。0度にしない
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloErosArrow") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const tune = key => balance().constant(CARD, key);
    const num = key => { const v = tune(key); return Number.isFinite(Number(v)) ? Number(v) : NaN; };
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = degree => degree * Math.PI / 180;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const roster = () => root.ProjectRPartyRoster || null;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);

    // 数値設定(バランスJSON/F6)。1つでも不正ならnull(発動を拒否して非消費)。
    const config = () => {
        try {
            const effects = balance().effects(CARD, 1);
            const cfg = { count: Math.floor(Number(effects.projectileCount)), damage: Number(effects.damage), heal: Number(effects.healAmount),
                emitSeconds: num("emitSeconds"), speed: num("projectileSpeed"), radius: num("homingRadiusTiles"), turnRate: num("homingTurnRate"),
                lifetimeSeconds: num("projectileLifetimeSeconds"), selfHeal: num("selfHealEnabled") === 1, fullHp: num("fullHpAlliesEligible") === 1,
                element: num("element"), weaknessMultiplier: num("weaknessMultiplier") };
            const ok = cfg.count >= 1 && cfg.damage >= 0 && cfg.heal >= 0 && cfg.emitSeconds > 0 && cfg.speed > 0 && cfg.radius >= 0 && cfg.turnRate > 0
                && cfg.lifetimeSeconds > 0 && Number.isFinite(cfg.element) && Number.isFinite(cfg.weaknessMultiplier);
            if (!ok) return null;
            cfg.emitFrames = Math.max(1, Math.round(cfg.emitSeconds * 60));
            cfg.lifetimeFrames = Math.max(1, Math.round(cfg.lifetimeSeconds * 60));
            cfg.step = cfg.speed / 60;
            return cfg;
        } catch (_error) { return null; }
    };
    // i本目(0始まり)を放す更新番号。連射の時間を本数で等分する(10本・60更新なら 0,6,12,…,54)。
    const emitSchedule = (count, frames) => Array.from({ length: Math.max(1, Math.floor(count)) }, (_, i) => Math.floor(i * frames / Math.max(1, Math.floor(count))));

    // ---------- 幾何 ----------
    const footprint = degree => {
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree)), nx = -uy, ny = ux;
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ x: nx * ACROSS_HALF * a + ux * ALONG_HALF * b, y: ny * ACROSS_HALF * a + uy * ALONG_HALF * b }));
    };
    const centroid = polygon => ({ x: polygon.reduce((s, p) => s + p.x, 0) / polygon.length, y: polygon.reduce((s, p) => s + p.y, 0) / polygon.length });
    const insidePolygon = (point, polygon) => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const a = polygon[i], b = polygon[j];
            if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        }
        return inside;
    };
    const distanceToPolygon = (point, polygon) => {
        if (insidePolygon(point, polygon)) return 0;
        let best = Infinity;
        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i], b = polygon[(i + 1) % polygon.length], dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy || 1;
            const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len2, 0, 1);
            best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
        }
        return best;
    };
    const degreeFromTo = (from, to) => normalize(Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI);
    const square = (c, half) => [{ x: c.x - half, y: c.y - half }, { x: c.x + half, y: c.y - half }, { x: c.x + half, y: c.y + half }, { x: c.x - half, y: c.y + half }];

    // ---------- 環境・Hendrix呼び出し ----------
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function"
            ? gauge.trackDamage(enemyId, { attackId, source: "damage:apollo_eros_arrow" }, apply) : apply();
    };
    const dealFixed = (eventId, base, attackId, cfg) => trackDamage(eventId, attackId, () => command("UpdateEventHp", {
        eventId: String(eventId), value: `-${base}`, exceedMaxHealth: "false",
        projectRFixed: { base, flat: 0, source: CARD, element: cfg.element, weaknessMultiplier: cfg.weaknessMultiplier }
    }));
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = (event, partyIds) => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>") && !partyIds.has(event.eventId());
    const isArrow = event => !!event?.event?.()?.note?.includes(TAG);
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };
    const eventCenter = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });
    const playerCenter = () => {
        const p = $gamePlayer.centerPositionPoint?.();
        return p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 };
    };
    const aimNow = () => { // GodSummonManager.create と同じ画面座標系・角度式(0=上・時計回り)
        try {
            const dx = TouchInput.x - $gamePlayer.screenX(), dy = TouchInput.y - $gamePlayer.screenY();
            return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > EPSILON ? normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450) : null;
        } catch (_error) { return null; }
    };

    const environment = () => {
        const m = map();
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !m || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof DotMoveSystem === "undefined" || typeof m.spawnEvent !== "function") return failure("actionCombatUnavailable");
        if (!["UpdateEventHp", "DestroyEvent"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) return failure("actionCombatUnavailable");
        const occ = occlusion();
        if (typeof occ?.firstContact !== "function" || typeof occ?.eventPolygon !== "function") return failure("occlusionUnavailable");
        if (!roster()) return failure("partyRosterUnavailable");
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG)) return failure("projectileTemplateUnavailable");
        return { ok: true, map: m, template };
    };

    // ---------- 状態 ----------
    const sequences = new Map(); // serial -> seq
    let serial = 0;
    let pendingSeq = null; // 確定待ち(まだ消費していない)
    let reserve = null; // handlerが立てた予約(requestUseCardの同期呼び出しの間だけ)
    let mode = null; // "commit"のときだけ、handlerは立てずに成功を返す
    let commitPlan = null;
    let lastResult = null;
    let frameNo = 0;
    let lastImpactSoundFrame = -Infinity;
    const emissionLog = [];
    const hitLog = [];
    const endLog = []; // 矢の最期(命中・寿命・マップの端など)の診断記録
    const vfxJobs = []; // { frames, note } 短いVFX(閃光・火花)を終わったら確実に外す
    const LOG_LIMIT = 200;
    const pushLog = (log, entry) => { log.push(entry); if (log.length > LOG_LIMIT) log.shift(); };

    const destroyArrow = arrow => {
        if (arrow.gone && arrow.destroyed) return;
        arrow.gone = true; arrow.destroyed = true;
        if (arrow.serial !== undefined) pushLog(endLog, { serial: arrow.serial, index: arrow.index, end: arrow.end || "removed", travelled: Math.round(arrow.travelled * 100) / 100, age: arrow.age, hit: arrow.hit || null });
        stopNote(arrow.glow); arrow.glow = null;
        const m = map();
        if (!m || arrow.map !== m || m.event(arrow.eventId) !== arrow.event) return;
        try { command("DestroyEvent", { target: String(arrow.eventId), destroyNearby: "", permanent: "false" }, arrow.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const liveArrows = seq => seq.arrows.filter(arrow => !arrow.gone);
    const emitting = seq => seq.next < seq.count;

    // ---------- 演出(表示だけ) ----------
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    function stopNote(note) { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } }
    const playSe = (key, fallback, volume, pitch) => {
        try {
            const name = String(params[key] === undefined ? fallback : params[key]).trim();
            if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 });
        } catch (_error) { /* 表示のみ */ }
    };
    const startShortVfx = (key, context) => {
        if (vfxJobs.length >= SHORT_VFX_BUDGET) return false; // 上限: 同時のVFXを増やしすぎない
        const r = pvPlay(key, context);
        if (r?.ok && r.note) { vfxJobs.push({ frames: SHORT_VFX_FRAMES, note: r.note, key }); return true; }
        return false;
    };
    const tickVfxJobs = () => {
        for (let i = vfxJobs.length - 1; i >= 0; i--) {
            if (--vfxJobs[i].frames <= 0) { stopNote(vfxJobs[i].note); vfxJobs.splice(i, 1); }
        }
    };
    const clearVfxJobs = () => { for (const job of vfxJobs.splice(0)) stopNote(job.note); };
    const godIdFor = definition => {
        const ringId = definition?.ringId;
        return deck.definitions?.ring?.(ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(ringId) || "apollo";
    };
    // 発動(予約)の演出: 通常のカットイン1回・主人公の片手(連射の間ずっと)。Apolloは一時召喚の表示Eventが連射の間出る。
    const presentStart = seq => {
        try { root.ProjectRCharacterPresentation?.request?.("ArmExtend", { source: "card", detail: CARD, frames: seq.cfg.emitFrames + 14, degree: seq.firstAim }); } catch (_error) { /* 表示のみ */ }
        try { if (root.ProjectRCutIn?.isCardEnabled?.(CARD)) root.ProjectRCutIn.show({ kind: "card", godId: godIdFor(seq.definition), cardId: CARD }); } catch (_error) { /* 表示のみ */ }
    };
    // 矢を放つ演出(PRESENT_EVERY本に1回): Apolloが弓を引いて放つ・閃光・音
    const presentEmit = (seq, arrow) => {
        if (arrow.index % PRESENT_EVERY !== 0) return;
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("apollo", arrow.aim, BOW_SPRITE); } catch (_error) { /* 表示のみ */ }
        const apolloEvent = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
        startShortVfx("apollo_eros.muzzle", { eventId: apolloEvent || "player", instance: `m${seq.serial}.${arrow.index}` });
        playSe("ArrowSoundEffect", "Chime2", 55, 120);
    };
    const glowCount = seq => liveArrows(seq).filter(arrow => arrow.glow).length;

    // ---------- 対象 ----------
    const bodyOf = (char, center) => {
        let polygon = [];
        try { polygon = occlusion().eventPolygon(char); } catch (_error) { polygon = []; }
        return Array.isArray(polygon) && polygon.length >= 3 && polygon.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)) ? polygon : square(center, ALLY_BODY_HALF);
    };
    // いまの当たり対象(敵・出撃中の仲間・設定が許せば主人公)。毎frame1回だけ集める。
    const gatherTargets = cfg => {
        const m = map(), r = roster(), list = [];
        const partyIds = new Set(r.allies({ includeDown: true }).map(a => a.eventId)); // 仲間のEventは敵として扱わない(<enemy>が付いていても)
        for (const event of m.events()) {
            if (!event || event._erased || !isEnemy(event, partyIds)) continue;
            const id = event.eventId();
            if (hpOf(id) > 0) list.push({ kind: "enemy", key: "e" + id, id, order: 1, event, polygon: bodyOf(event, eventCenter(event)) });
        }
        for (const ally of r.allies()) {
            if (ally.eventId === null || ally.eventId === undefined || !ally.alive) continue;
            const event = m.event(ally.eventId);
            if (!event || event._erased) continue;
            if (!(ally.hp < ally.mhp) && !cfg.fullHp) continue; // HP満タンは素通り(仮)
            list.push({ kind: "ally", key: "a" + ally.actorId, id: ally.eventId, actorId: ally.actorId, order: 0, event, polygon: bodyOf(event, eventCenter(event)) });
        }
        if (cfg.selfHeal) {
            const p = r.protagonist();
            if (p && p.alive && (p.hp < p.mhp || cfg.fullHp)) list.push({ kind: "self", key: "player", id: "player", order: 0, event: $gamePlayer, polygon: bodyOf($gamePlayer, playerCenter()) });
        }
        return list;
    };
    const usable = (target, arrow) => target.kind !== "self" || arrow.travelled >= SELF_MIN_TRAVEL;

    // ---------- 矢の生成・移動 ----------
    // 論理位置(矢の中心のタイル座標)に絵の中心が来るEvent位置。回した絵の中心は画面位置から尾の側へ ROTATION_PIVOT_PX ずれ、画面位置は足元の6px上。
    const shownDegree = degree => Math.max(MIN_SHOWN_DEGREE, normalize(degree));
    const visualReal = (x, y, degree) => {
        const h = rad(shownDegree(degree)), tw = map()?.tileWidth?.() || 48, th = map()?.tileHeight?.() || 48;
        return { x: x - 0.5 + ROTATION_PIVOT_PX * Math.sin(h) / tw, y: y - 1 + (SHIFT_Y_PX - ROTATION_PIVOT_PX * Math.cos(h)) / th };
    };
    const spawnArrowEvent = (env, spec) => {
        const m = env.map, before = new Set(m.events());
        try {
            const at = visualReal(spec.x, spec.y, spec.degree);
            const id = m.spawnEvent(env.template.id, at.x, at.y, false, shownDegree(spec.degree));
            const event = id && m.event(id);
            if (!event || before.has(event) || !isArrow(event) || typeof event.rotateTo !== "function") throw Error("projectileCreationFailed");
            event.rotateTo(shownDegree(spec.degree));
            return { ok: true, eventId: id, event, map: m };
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isArrow(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
            return failure(String(error?.message || error));
        }
    };
    const placeVisual = arrow => {
        const event = arrow.event;
        if (!event || event._erased) return;
        event.isPlayerChild = false;
        const at = visualReal(arrow.x, arrow.y, arrow.heading);
        event.setPosition(at.x, at.y);
        if (Math.abs(normalize(arrow.heading - arrow.shownHeading + 180) - 180) > 0.01) { event.rotateTo(shownDegree(arrow.heading)); arrow.shownHeading = arrow.heading; }
    };
    const emitArrow = (seq, index, env) => {
        const aim = index === 0 ? seq.firstAim : (aimNow() ?? seq.lastAim);
        seq.lastAim = aim;
        const origin = playerCenter();
        const spawned = spawnArrowEvent(env, { x: origin.x, y: origin.y, degree: aim });
        const arrow = { serial: seq.serial, index, aim, heading: aim, shownHeading: aim, x: origin.x, y: origin.y, last: { x: origin.x, y: origin.y }, age: 0, travelled: 0, lock: null,
            eventId: spawned.ok ? spawned.eventId : 0, event: spawned.ok ? spawned.event : null, map: spawned.ok ? spawned.map : null, gone: !spawned.ok, destroyed: !spawned.ok,
            glow: null, end: spawned.ok ? null : "spawnFailed", emitTick: seq.tick };
        seq.arrows.push(arrow);
        pushLog(emissionLog, { serial: seq.serial, index, tick: seq.tick, frame: frameNo, degree: aim, x: origin.x, y: origin.y, spawned: spawned.ok });
        if (!spawned.ok) { seq.spawnFailures++; return; }
        if (glowCount(seq) < GLOW_BUDGET) arrow.glow = pvPlay("apollo_eros.glow", { eventId: arrow.eventId, instance: `g${seq.serial}.${index}` })?.note || null;
        presentEmit(seq, arrow);
    };

    // 1本の、このframeの結果: { impact: {target, fraction} } | { end } | null(まだ飛んでいる)
    const stepArrow = (seq, arrow, targets) => {
        const cfg = seq.cfg, m = map(), occ = occlusion();
        if (arrow.map !== m || m.event(arrow.eventId) !== arrow.event || arrow.event._erased) return { end: "gone" };
        arrow.age++;
        const eligible = targets.filter(t => usable(t, arrow));
        // 追尾: 範囲内の対象のうち最も近い対象(同距離は味方→Event ID順)。狙った対象は範囲内にいる間は保つ。曲がる速さに上限。
        if (cfg.radius > 0 && eligible.length) {
            const near = eligible.map(t => ({ t, d: distanceToPolygon(arrow, t.polygon) })).filter(x => x.d <= cfg.radius + EPSILON);
            let pick = arrow.lock ? near.find(x => x.t.key === arrow.lock) : null;
            if (!pick) { near.sort((a, b) => (Math.abs(a.d - b.d) > 1e-6 ? a.d - b.d : a.t.order - b.t.order || (Number(a.t.id) || 0) - (Number(b.t.id) || 0))); pick = near[0] || null; }
            arrow.lock = pick ? pick.t.key : null;
            if (pick) {
                const delta = normalize(degreeFromTo(arrow, centroid(pick.t.polygon)) - arrow.heading + 180) - 180, maxTurn = cfg.turnRate / 60;
                arrow.heading = normalize(arrow.heading + clamp(delta, -maxTurn, maxTurn));
            }
        } else arrow.lock = null;
        const from = { x: arrow.x, y: arrow.y };
        const to = { x: from.x + Math.sin(rad(arrow.heading)) * cfg.step, y: from.y - Math.cos(rad(arrow.heading)) * cfg.step };
        const body = footprint(arrow.heading);
        let best = null;
        for (const target of eligible) {
            const fraction = occ.firstContact(from, to, target.polygon, body);
            if (fraction === null) continue;
            if (!best || fraction < best.fraction - EPSILON || (Math.abs(fraction - best.fraction) <= EPSILON && String(target.key) < String(best.target.key))) best = { target, fraction };
        }
        if (best) { // 当たった位置まで進めて止める(見た目の火花の位置)
            arrow.x = from.x + (to.x - from.x) * best.fraction; arrow.y = from.y + (to.y - from.y) * best.fraction;
            arrow.travelled += cfg.step * best.fraction; arrow.last = from;
            return { impact: best };
        }
        arrow.last = from; arrow.x = to.x; arrow.y = to.y; arrow.travelled += cfg.step;
        placeVisual(arrow);
        // 壁・Region・通行不能は通り抜ける(ワークブック: 壁越え はい)。マップの端と寿命でだけ消える。
        const w = m.width(), h = m.height();
        if (!m.isLoopHorizontal() && (arrow.x < -1 || arrow.x > w + 1)) return { end: "boundary" };
        if (!m.isLoopVertical() && (arrow.y < -1 || arrow.y > h + 1)) return { end: "boundary" };
        if (arrow.age > cfg.lifetimeFrames) return { end: "lifetime" };
        return null;
    };

    // ---------- 命中の適用 ----------
    const healAlly = (target, amount) => {
        const api = root.ProjectRPartyCombat;
        const member = api?.members?.().find(m => m.actorId === target.actorId);
        if (!member || member.down) return { ok: false, reason: "notAvailable" };
        const before = member.hp, result = api.healAlly(target.actorId, amount);
        return result?.ok ? { ok: true, applied: result.hp - before, hp: result.hp, mhp: member.maxHp } : { ok: false, reason: result?.reason || "healFailed" };
    };
    const healSelf = amount => {
        const actor = typeof $gameParty !== "undefined" ? $gameParty.leader() : null;
        if (!actor || !(actor.hp > 0)) return { ok: false, reason: "notAvailable" };
        const before = actor.hp, applied = Math.min(amount, Math.max(0, actor.mhp - actor.hp));
        if (applied > 0) actor.gainHp(applied);
        return { ok: true, applied: actor.hp - before, hp: actor.hp, mhp: actor.mhp };
    };
    const impactSound = () => {
        if (frameNo - lastImpactSoundFrame < IMPACT_SOUND_GAP_FRAMES) return;
        lastImpactSoundFrame = frameNo;
        playSe("ImpactSoundEffect", "Chime1", 60, 100);
    };
    const applyImpact = (seq, arrow, target) => {
        const record = { serial: seq.serial, arrow: arrow.index, kind: target.kind, id: target.id, key: target.key, frame: frameNo };
        arrow.end = "hit"; arrow.hit = target.key;
        destroyArrow(arrow);
        try {
            if (target.kind === "enemy") {
                if (!seq.map.event(target.id) || target.event._erased || hpOf(target.id) <= 0) { record.skipped = "targetGone"; }
                else {
                    const before = hpOf(target.id);
                    dealFixed(target.id, seq.cfg.damage, `eros:${seq.serial}:${arrow.index}`, seq.cfg);
                    record.damage = seq.cfg.damage; record.hpLost = before - hpOf(target.id);
                    startShortVfx("apollo_eros.hit", { eventId: target.id, instance: `h${seq.serial}.${arrow.index}` });
                }
            } else {
                const result = target.kind === "self" ? healSelf(seq.cfg.heal) : healAlly(target, seq.cfg.heal);
                if (!result.ok) record.skipped = result.reason;
                else {
                    record.requested = seq.cfg.heal; record.healed = result.applied;
                    startShortVfx("apollo_eros.heal", { eventId: target.kind === "self" ? "player" : target.id, instance: `h${seq.serial}.${arrow.index}` });
                }
            }
            if (!record.skipped) impactSound();
        } catch (error) {
            record.error = String(error?.message || error);
        }
        seq.hits.push(record);
        pushLog(hitLog, { ...record });
    };

    // ---------- 発動(予約) ----------
    const activate = context => {
        if (mode === "commit") return commitPlan ? { ok: true } : failure("noCommitPlan");
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (pendingSeq) return failure("volleyPending");
        for (const seq of sequences.values()) if (emitting(seq)) return failure("sequenceActive"); // 連射の途中は、別の手札の同じカードでも発動しない
        if (!balanceReady()) return failure("balanceUnavailable");
        const cfg = config();
        if (!cfg) return failure("balanceInvalid");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        let seq = null;
        const result = summons.perform({ definition: context?.definition, lifetimeFrames: cfg.emitFrames + 4 }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            seq = { serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, cfg, count: cfg.count, schedule: emitSchedule(cfg.count, cfg.emitFrames),
                tick: 0, next: 0, arrows: [], hits: [], committed: false, aborted: false, summonId: summon.summonId, firstAim: normalize(summon.degree), lastAim: normalize(summon.degree),
                env, map: env.map, spawnFailures: 0 };
            return { ok: true };
        });
        if (!result?.ok || !seq) return failure(result?.reason || "activationFailed");
        seq.summonId = result.summonId ?? seq.summonId;
        reserve = seq;
        return failure("reserved"); // ルーターには「まだ消費しない」と伝える。確定(最初の命中)の時に正規経路で1回だけ消費する。
    };
    const previousGround = deck.getActivationHandler("ground");
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD
        ? activate(context) : previousGround ? previousGround(context) : { ok: true });

    // ---------- 予約 → 確定 ----------
    const handIndexOf = instanceId => {
        const state = deck.getBattleState?.();
        return state ? state.hand.findIndex(card => card.instanceId === instanceId) : -1;
    };
    const finishPending = seq => { if (pendingSeq === seq) pendingSeq = null; };
    const resultOf = (seq, extra = {}) => ({ serial: seq.serial, arrows: seq.count, emitted: seq.next, hits: seq.hits.map(h => ({ ...h })), cfg: { ...seq.cfg }, instanceId: seq.instanceConsumed ?? seq.instanceId, ...extra });
    const destroySeq = seq => { for (const arrow of seq.arrows) destroyArrow(arrow); };
    // 取り消し: 矢を消し、カード・Cooldown・手札・山札・ゲージは一切変えていないので、戻す物は無い(確定前のみ)。
    const abortSeq = (seq, reason, extra = {}) => {
        if (seq.aborted) return;
        seq.aborted = true;
        destroySeq(seq);
        sequences.delete(seq.serial);
        finishPending(seq);
        releaseSummon(seq.summonId);
        lastResult = { ok: false, reason, aborted: true, consumed: false, committed: false, ...resultOf(seq), ...extra };
    };
    const commitSeq = seq => {
        if (seq.committed) return true;
        if (!deck.isCardBattleActive()) { abortSeq(seq, "battleInactive"); return false; }
        const index = handIndexOf(seq.instanceId);
        if (index < 0) { abortSeq(seq, "cardGone"); return false; }
        commitPlan = seq;
        mode = "commit";
        modifiers()?.skipPresentationOnce?.(CARD, ["cutIn", "action"]); // 発動時に演出済み
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
            seq.committed = true;
            seq.instanceConsumed = result.instanceId ?? seq.instanceId;
            finishPending(seq);
            return true;
        }
        abortSeq(seq, result?.detail || result?.reason || "notConsumed");
        return false;
    };
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        reserve = null;
        let result;
        try {
            result = _requestUseCard.apply(this, arguments);
        } catch (error) {
            if (reserve) releaseSummon(reserve.summonId);
            reserve = null;
            throw error;
        }
        const seq = reserve;
        reserve = null;
        if (!seq) return result;
        pendingSeq = seq;
        sequences.set(seq.serial, seq);
        lastResult = { ok: true, pending: true, consumed: false, committed: false, aim: seq.firstAim, ...resultOf(seq) };
        presentStart(seq);
        return { ok: false, reason: "pending", reasons: [{ code: "pending" }], pending: true, cardId: CARD, instanceId: seq.instanceId, detail: "erosReserved" };
    };

    // ---------- 毎フレーム ----------
    const processSequence = seq => {
        const cfg = seq.cfg;
        // 1) 放つ(このframeに放つ番の矢。放ったframeは動かさない)
        const fresh = new Set();
        while (seq.next < seq.count && seq.schedule[seq.next] <= seq.tick) {
            emitArrow(seq, seq.next, seq.env);
            fresh.add(seq.arrows[seq.arrows.length - 1]);
            seq.next++;
        }
        if (!seq.committed && seq.arrows[0]?.end === "spawnFailed") { abortSeq(seq, "projectileCreationFailed"); return; } // 最初の1本が作れないなら非消費で取り消す
        // 2) 動かして当たりを調べる
        const live = liveArrows(seq).filter(arrow => !fresh.has(arrow));
        const impacts = [];
        if (live.length) {
            const targets = gatherTargets(cfg);
            for (const arrow of live) {
                const outcome = stepArrow(seq, arrow, targets);
                if (!outcome) continue;
                if (outcome.impact) impacts.push({ arrow, target: outcome.impact.target });
                else { arrow.end = outcome.end; destroyArrow(arrow); }
            }
        }
        // 3) 最初の有効な命中でカードを消費する。消費できなければ全部消して何も与えない。
        if (impacts.length && !seq.committed && !commitSeq(seq)) return;
        impacts.sort((a, b) => a.arrow.index - b.arrow.index);
        for (const impact of impacts) applyImpact(seq, impact.arrow, impact.target);
        seq.tick++;
        if (seq.committed) lastResult = { ok: true, pending: false, consumed: true, committed: true, ...resultOf(seq) };
        // 4) 全部放ち終わって、飛んでいる矢が無ければ終わり。確定していなければ外れ(非消費)。
        if (!emitting(seq) && !liveArrows(seq).length) {
            if (!seq.committed) abortSeq(seq, "missed");
            else { sequences.delete(seq.serial); releaseSummon(seq.summonId); }
        }
    };

    const clearAll = reason => {
        for (const seq of [...sequences.values()]) {
            if (!seq.committed) abortSeq(seq, reason);
            else { destroySeq(seq); sequences.delete(seq.serial); releaseSummon(seq.summonId); }
        }
        if (pendingSeq) abortSeq(pendingSeq, reason);
        pendingSeq = null;
        clearVfxJobs();
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        frameNo++;
        if (vfxJobs.length) tickVfxJobs();
        if (!sequences.size || this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        for (const seq of [...sequences.values()]) {
            try { processSequence(seq); } catch (error) { abortSeq(seq, "error:" + String(error?.message || error)); }
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
        const tracked = new Set([...sequences.values()].flatMap(s => s.arrows.map(a => a.event)));
        for (const event of m.events()) if (isArrow(event) && !tracked.has(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
    };

    const tempObjectCount = () => {
        let arrows = 0, glows = 0;
        for (const seq of sequences.values()) for (const arrow of liveArrows(seq)) { arrows++; if (arrow.glow) glows++; }
        return { arrows, glows, short: vfxJobs.length, total: arrows + glows + vfxJobs.length };
    };
    root.ProjectRApolloErosArrow = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL,
        constants: Object.freeze({ ALONG_HALF, ACROSS_HALF, SELF_MIN_TRAVEL, PRESENT_EVERY, GLOW_BUDGET, SHORT_VFX_BUDGET, SHORT_VFX_FRAMES }),
        config: () => { const c = config(); return c ? { ...c } : null; },
        emitSchedule,
        geometry: Object.freeze({ distanceToPolygon, footprint, centroid, visualReal }),
        isPending: () => !!pendingSeq,
        getPending: () => pendingSeq ? { serial: pendingSeq.serial, instanceId: pendingSeq.instanceId, emitted: pendingSeq.next, arrows: liveArrows(pendingSeq).length } : null,
        getSequences: () => [...sequences.values()].map(s => ({ serial: s.serial, committed: s.committed, emitted: s.next, count: s.count, tick: s.tick, arrows: liveArrows(s).length, hits: s.hits.length })),
        getActiveArrows: () => [...sequences.values()].flatMap(s => liveArrows(s).map(a => ({ serial: s.serial, eventId: a.eventId, index: a.index, aim: a.aim, heading: a.heading,
            x: a.x, y: a.y, age: a.age, travelled: a.travelled, lock: a.lock, glow: !!a.glow }))),
        getEmissionLog: () => emissionLog.map(entry => ({ ...entry })),
        getHitLog: () => hitLog.map(entry => ({ ...entry })),
        getEndLog: () => endLog.map(entry => ({ ...entry })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getTempObjectCount: tempObjectCount,
        getActiveVfxJobs: () => vfxJobs.map(job => ({ frames: job.frames, note: job.note, key: job.key }))
    });
})();
