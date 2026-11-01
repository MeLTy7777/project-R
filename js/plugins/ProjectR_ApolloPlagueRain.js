/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「疫病の矢」(設計ID 15 / apollo_plague_rain) Lv1〜3: 壁を越える矢が着弾して直撃100ダメージ + 半径4マスの病のサークル(5秒)。Lv2でネズミ、Lv3で矢が分裂。着弾で敵がいたら消費(予約→確定)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_ApolloStatus
 * @base ProjectR_PresentationVfx
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_ApolloStatus
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 *
 * @param FireSoundEffect
 * @text 発射の効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「ファーン…ダスッ」。専用音が無いのでRTPのBow3(ファーン)を仮に当てています。
 * @type string
 * @default Bow3
 *
 * @param LandSoundEffect
 * @text 着弾の効果音(RTPのSE名。空なら鳴らさない)
 * @desc 「ダスッ」。仮のRTP音(Blow5)。分裂した矢の着弾は間引いて鳴らします。
 * @type string
 * @default Blow5
 *
 * @help
 * ProjectR_ApolloPlagueRain.js
 *
 * 新カード「疫病の矢」(ワークブック「カード一覧」のCard ID 15)。ランタイムIDは apollo_plague_rain。旧「疫病攻撃/病の矢」(apollo_plague_attack)は置き換えず共存。
 * Apollo / 妨害 / 強力 / 最大4枚 / 最大Lv3 / Cooldown 5秒 / Direction / 壁越え はい / 有効範囲 半径4。数値は data/ProjectR_CardBalance.json(開発用エディタ F6)。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: 病状態を付与する矢を発射し、着弾地点に病状態を付与するサークルを展開する。範囲は記載通り(半径4)。持続時間5秒。直撃100ダメージ(複数回Hit: いいえ)。
 *   Lv2: 着弾地点からネズミが召喚され、ネズミが付近の敵を攻撃する。効果時間終了とともに消失する。1秒に1回攻撃し、ダメージは50。
 *   Lv3: 矢が分裂し、広範囲に広がる(ランダム)。
 *   成功: 範囲内に敵がいた場合 / 失敗: 範囲外にいると失敗 / 対象なし時: 対象外。演出: 後ろにApollo・弓を引いて発射 / 手を上げる / パープルゴールドの矢を降らす / 音「ファーン…ダスッ」。
 *
 * 【病状態(竪琴の病と共通・ワークブックの「病状態とは」)】-10%攻撃力ダウン・被ダメージ5%増加・弱点属性被ダメージ3%増加。ProjectR_ApolloStatus が対象ごとに1つの倍率にまとめる。
 *
 * 【実装(累積レベル)】
 *   Lv1: 発動でマウス位置へ向かう矢を放つ(秒18マス・最大14マス先まで。壁を越える)。矢は途中で敵に当たるとその位置で着弾(直撃: 100ダメージ)、当たらなければマウス位置で着弾。
 *        着弾地点に半径4マスの病のサークル(5秒)。サークルの中の敵(中心が半径内)に0.25秒ごとに病を付ける(病は3秒持続・サークルの中にいる間は更新)。
 *   Lv2: メインの着弾地点にネズミ3匹(ratCount)。サークルの中の最寄りの敵へ向かい(秒4マス)、1マス以内で1秒に1回50ダメージ(固定)。サークルが消えると消える。
 *   Lv3: メインの矢が着弾したあと、4本(splitCount)の矢に分裂し、着弾地点の周囲(5マス以内・ランダム)へ飛んで、それぞれ着弾する(直撃・サークルも同じ)。
 *
 * 【命中と消費(予約→確定。黄金の矢と同じ)】
 *   発動 → 矢が飛ぶ(カード未消費) → 着弾。いずれかの着弾で「直撃した、または半径内に敵がいた」最初の瞬間に、正規の経路(requestUseCard)でカードを1回だけ消費する。
 *   すべての着弾で範囲内に敵がいなければ失敗 = 非消費・Cooldownなし・サークル(の絵)も消す。飛行中の再発動は plaguePending で拒否。
 *   戦闘終了・マップ移動・ロード・死亡・対象の消滅で、矢・サークル・ネズミ・絵・状態をすべて片付ける(セーブしない)。
 *
 * 【仮の決め(ワークブックに無い部分)】
 *   ・「Direction」だが着弾地点があるため、矢はマウス位置へ飛ぶ(射程14マスで止める)。「半径4メートル」は4マス。壁は越える。
 *   ・病の持続はサークルにいる間は更新、出たあと3秒(plagueStateSeconds)。サークルが無くなっても残りの3秒は残る。
 *   ・Lv3: 分裂した矢は4本・着弾地点から5マス以内にランダム(Math.random)。各矢が着弾してそれぞれ半径4のサークルを作る(ネズミはメインの着弾だけ)。
 *   ・サークルの同時の絵は6つまで(超えた分は絵なしで効果だけ)。ネズミは最大10匹。
 *   ・直撃100ダメージは固定ダメージ(属性なし)。ネズミ50も固定ダメージ。どちらも被ダメージの倍率(病・弱点など)の対象。
 *
 * API: ProjectRApolloPlagueRain
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / isPending() / getPending() / getShots() / getArrows() / getCircles() / getRats() / getLastResult() / getTempObjectCount() / geometry
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_plague_rain";
    const ARROW_TAG = "<projectRPlagueArrow>", ARROW_TEMPLATE = "ProjectR Apollo Plague Arrow";
    const RAT_TAG = "<projectRPlagueRat>", RAT_TEMPLATE = "ProjectR Apollo Plague Rat";
    const BOW_SPRITE = "ProjectR_Bow_DEV";
    const PLAGUE_ID = "plague";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const MAX_TOTAL_ARROWS = 12, MAX_CIRCLES = 13, CIRCLE_VISUAL_BUDGET = 6, MAX_RATS = 10, SOUND_GAP_FRAMES = 4;
    const EPSILON = 1e-8;
    const ALONG_HALF = 0.2, ACROSS_HALF = 0.15;
    const ROTATION_PIVOT_PX = 10, SHIFT_Y_PX = 6, MIN_SHOWN_DEGREE = 0.01;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloPlagueRain") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = d => d * Math.PI / 180;
    const normalize = d => ((d % 360) + 360) % 360;
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const status = () => root.ProjectRApolloStatus || null;
    const playSe = (key, fallback, volume = 80, pitch = 100) => { try { const name = String(params[key] === undefined ? fallback : params[key]).trim(); if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    const stopNote = note => { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } };
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };

    // ---- VFX Designerライブラリへの対応(PresentationVfx の内蔵表は変えず、ここで足す) ----
    const SHEET = (file, fps) => Object.freeze({ file: "Animation/" + file, rows: 2, columns: 4, fps });
    try {
        const vfx = root.ProjectRPresentationVfx;
        vfx?.register?.("apollo_plague.circle", { library: "ProjectR_A7_Plague_Circle", sheet: SHEET("ProjectR_A7_Plague_Circle", 8), anchor: "target", area: true, frame: 384, frameTiles: 8, loop: "infinite", scale: 100, opacity: 200, offsetY: 0, blend: "Add" });
        vfx?.register?.("apollo_plague.impact", { library: "ProjectR_A7_Plague_Impact", sheet: SHEET("ProjectR_A7_Plague_Impact", 24), anchor: "target", scale: 100, opacity: 255, offsetY: -18, blend: "Add" });
    } catch (_error) { /* 表示のみ */ }

    const cardLevel = () => {
        try {
            const definition = deck.definitions?.card?.(CARD);
            const level = Number.parseInt(deck.getPersistentData?.().cardOwnership?.[CARD]?.level, 10);
            return clamp(Number.isFinite(level) ? level : 1, 1, definition?.maxLevel || IMPLEMENTED_MAX_LEVEL);
        } catch (_error) { return 1; }
    };
    const config = level => {
        try {
            const e = effectsForLevel(level);
            const c = { level, damage: num(e.damage), radius: num(tune("radiusTiles")), speed: num(tune("projectileSpeed")), range: num(tune("rangeTiles")), circleSeconds: num(tune("circleSeconds")),
                stateSeconds: num(tune("plagueStateSeconds")), tickSeconds: num(tune("circleTickSeconds")), attackRate: num(tune("plagueAttackRate")), damageTaken: num(tune("plagueDamageTaken")), weakness: num(tune("plagueWeaknessRate")),
                element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier"),
                ratCount: Number(e.ratCount) > 0 ? Math.floor(num(e.ratCount)) : 0, ratDamage: num(e.ratDamage), ratSeconds: num(e.ratAttackSeconds), ratSpeed: num(e.ratSpeed), ratReach: num(e.ratReach),
                splitCount: Number(e.splitCount) > 0 ? Math.floor(num(e.splitCount)) : 0, splitRadius: num(e.splitRadiusTiles) };
            c.circleFrames = Math.max(1, Math.round(c.circleSeconds * 60)); c.tickFrames = Math.max(1, Math.round(c.tickSeconds * 60));
            c.ratFrames = Math.max(1, Math.round((c.ratSeconds || 1) * 60));
            const ok = c.damage >= 0 && c.radius > 0 && c.speed > 0 && c.range > 0 && c.circleSeconds > 0 && c.stateSeconds > 0 && c.tickSeconds > 0 && c.attackRate >= 0 && c.damageTaken >= 1 && c.weakness >= 1
                && (c.ratCount === 0 || (c.ratCount <= MAX_RATS && c.ratDamage >= 0 && c.ratSeconds > 0 && c.ratSpeed > 0 && c.ratReach > 0))
                && (c.splitCount === 0 || (1 + c.splitCount <= MAX_TOTAL_ARROWS && c.splitRadius > 0));
            return ok ? Object.freeze(c) : null;
        } catch (_error) { return null; }
    };

    // ---------- 環境・Hendrix呼び出し ----------
    const command = (name, args, eventId = 0) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const trackDamage = (enemyId, attackId, apply) => {
        const gauge = root.ProjectRUltimateGauge;
        return typeof gauge?.trackDamage === "function" ? gauge.trackDamage(enemyId, { attackId, source: `damage:${CARD}` }, apply) : apply();
    };
    const dealFixed = (eventId, base, attackId, cfg) => trackDamage(eventId, attackId, () => command("UpdateEventHp", {
        eventId: String(eventId), value: `-${base}`, exceedMaxHealth: "false",
        projectRFixed: { base, flat: 0, source: CARD, element: cfg.element, weaknessMultiplier: cfg.weaknessMultiplier }
    }));
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = event => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>");
    const enemies = () => map().events().filter(event => isEnemy(event) && hpOf(event.eventId()) > 0);
    const eventCenter = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });
    const templateOf = name => { const t = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null; return t?.find(e => e?.name === name) || null; };
    const environment = () => {
        const m = map(), player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !m || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof m.spawnEvent !== "function") return failure("actionCombatUnavailable");
        if (!["UpdateEventHp", "DestroyEvent"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) return failure("actionCombatUnavailable");
        const occ = occlusion();
        if (typeof occ?.firstContact !== "function" || typeof occ?.eventPolygon !== "function") return failure("occlusionUnavailable");
        if (!status()) return failure("statusUnavailable");
        const arrow = templateOf(ARROW_TEMPLATE), rat = templateOf(RAT_TEMPLATE);
        if (!arrow || !arrow.note.includes(ARROW_TAG) || !rat || !rat.note.includes(RAT_TAG)) return failure("projectileTemplateUnavailable");
        return { ok: true, map: m, arrow, rat };
    };

    // ---------- 状態 ----------
    const shots = new Map();
    let serial = 0, pending = null, reserve = null, mode = null, commitPlan = null, lastResult = null, frameNo = 0, lastSoundFrame = -Infinity;
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 80) log.shift(); };

    const destroyEv = f => {
        if (!f || f.gone) return;
        f.gone = true;
        const m = map();
        if (!m || f.map !== m || m.event(f.eventId) !== f.event) return;
        try { command("DestroyEvent", { target: String(f.eventId), destroyNearby: "", permanent: "false" }, f.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const removeCircle = c => {
        for (const n of c.notes) stopNote(n);
        c.notes.length = 0;
        if (c.anchor) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(c.anchor); } catch (_error) { /* 表示のみ */ } c.anchor = null; }
    };
    const destroyShot = (shot, keepStates = false) => {
        for (const a of shot.arrows) destroyEv(a.visual);
        for (const r of shot.rats) destroyEv(r.visual);
        for (const c of shot.circles) removeCircle(c);
        shot.rats.length = 0; shot.circles.length = 0;
        if (!keepStates) for (const key of shot.statesTouched) { status()?.remove?.(key, PLAGUE_ID, "shotEnd"); }
    };
    const endShot = (shot, reason, keepStates = false) => {
        destroyShot(shot, keepStates);
        shots.delete(shot.serial);
        if (pending === shot) pending = null;
        releaseSummon(shot.summonId);
        note({ type: "end", serial: shot.serial, reason });
    };
    const abortShot = (shot, reason, extra = {}) => {
        if (shot.aborted) return;
        shot.aborted = true;
        destroyShot(shot);
        shots.delete(shot.serial);
        if (pending === shot) pending = null;
        releaseSummon(shot.summonId);
        lastResult = { ok: false, reason, aborted: true, consumed: false, committed: false, level: shot.level, serial: shot.serial, landings: shot.landings.length, ...extra };
    };

    // ---------- 取引(予約 → 確定) ----------
    const handIndexOf = instanceId => { const s = deck.getBattleState?.(); return s ? s.hand.findIndex(card => card.instanceId === instanceId) : -1; };
    const commitShot = shot => {
        if (shot.committed) return true;
        if (!deck.isCardBattleActive()) { abortShot(shot, "battleInactive"); return false; }
        const index = handIndexOf(shot.instanceId);
        if (index < 0) { abortShot(shot, "cardGone"); return false; }
        commitPlan = shot; mode = "commit";
        modifiers()?.skipPresentationOnce?.(CARD, ["cutIn", "action"]); // 発動時に演出済み
        let result;
        try { result = _requestUseCard.call(deck, index); }
        catch (error) { result = { ok: false, reason: "activationFailed", detail: String(error?.message || error) }; }
        finally { mode = null; commitPlan = null; modifiers()?.clearPresentationSkip?.(CARD); }
        if (result?.ok === true && result.cardId === CARD) { shot.committed = true; shot.instanceConsumed = result.instanceId ?? shot.instanceId; if (pending === shot) pending = null; return true; }
        abortShot(shot, result?.detail || result?.reason || "notConsumed");
        return false;
    };

    // ---------- 発動 ----------
    const aimTarget = (summon, cfg) => {
        const tile = map()?.tileWidth?.() || 48;
        const dist = clamp(summon.distance / tile, 0.5, cfg.range);
        return { degree: normalize(summon.degree), dist };
    };
    const activate = context => {
        if (mode === "commit") return commitPlan ? { ok: true } : failure("noCommitPlan");
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (pending) return failure("plaguePending");
        if (!balanceReady()) return failure("balanceUnavailable");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), cfg = config(level);
        if (!cfg) return failure("balanceInvalid");
        let shot = null;
        const flight = Math.ceil(cfg.range / cfg.speed * 60) * (cfg.splitCount ? 2 : 1) + 20;
        const result = summons.perform({ definition: context?.definition, lifetimeFrames: flight }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            const t = aimTarget(summon, cfg), p = $gamePlayer.centerPositionPoint();
            shot = { serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, level, cfg, committed: false, summonId: summon.summonId, arrows: [], circles: [], rats: [], landings: [], statesTouched: new Set(),
                aim: t.degree, origin: { x: p.x, y: p.y }, target: { degree: t.degree, dist: t.dist }, age: 0, hits: [], ratsSpawned: false, direct: 0 };
            return { ok: true };
        });
        if (!result?.ok || !shot) return failure(result?.reason || "activationFailed");
        shot.summonId = result.summonId ?? shot.summonId;
        reserve = shot;
        return failure("reserved");
    };
    const previousDirection = deck.getActivationHandler("direction");
    deck.registerActivationHandler("direction", context => context.definition.cardId === CARD ? activate(context) : previousDirection ? previousDirection(context) : { ok: true });

    const godIdFor = definition => deck.definitions?.ring?.(definition?.ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(definition?.ringId) || "apollo";
    const present = shot => {
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("apollo", shot.aim, BOW_SPRITE); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("SkillCast", { source: "card", detail: CARD }); } catch (_error) { /* 表示のみ */ }
        try { if (root.ProjectRCutIn?.isCardEnabled?.(CARD)) root.ProjectRCutIn.show({ kind: "card", godId: godIdFor(shot.definition), cardId: CARD }); } catch (_error) { /* 表示のみ */ }
        playSe("FireSoundEffect", "Bow3", 80, 100);
    };
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        reserve = null;
        let result;
        try { result = _requestUseCard.apply(this, arguments); }
        catch (error) { if (reserve) { releaseSummon(reserve.summonId); } reserve = null; throw error; }
        const shot = reserve;
        reserve = null;
        if (!shot) return result;
        const env = environment();
        if (!env.ok || !launch(shot, env, shot.origin, shot.target.degree, shot.target.dist, "main")) { releaseSummon(shot.summonId); lastResult = { ok: false, reason: env.ok ? "projectileCreationFailed" : env.reason, consumed: false }; return failure(env.ok ? "projectileCreationFailed" : env.reason); }
        pending = shot;
        shots.set(shot.serial, shot);
        lastResult = { ok: true, pending: true, consumed: false, committed: false, level: shot.level, serial: shot.serial, degree: shot.aim, instanceId: shot.instanceId, landings: 0 };
        present(shot);
        return { ok: false, reason: "pending", reasons: [{ code: "pending" }], pending: true, cardId: CARD, instanceId: shot.instanceId, detail: "plagueReserved" };
    };

    // ---------- 矢(論理 + 見た目のEvent) ----------
    const shownDegree = d => Math.max(MIN_SHOWN_DEGREE, normalize(d));
    const visualReal = (x, y, degree) => {
        const h = rad(shownDegree(degree)), tw = map()?.tileWidth?.() || 48, th = map()?.tileHeight?.() || 48;
        return { x: x - 0.5 + ROTATION_PIVOT_PX * Math.sin(h) / tw, y: y - 1 + (SHIFT_Y_PX - ROTATION_PIVOT_PX * Math.cos(h)) / th };
    };
    const spawnVisual = (env, kind, x, y, degree) => {
        const m = env.map, before = new Set(m.events());
        try {
            const arrow = kind === "arrow", tpl = arrow ? env.arrow : env.rat;
            const at = arrow ? visualReal(x, y, degree) : { x: x - 0.5, y: y - 0.5 };
            const id = m.spawnEvent(tpl.id, at.x, at.y, false, arrow ? shownDegree(degree) : undefined);
            const event = id && m.event(id);
            if (!event || before.has(event)) throw Error("visualCreationFailed");
            if (arrow) { if (typeof event.rotateTo !== "function") throw Error("rotateUnavailable"); event.rotateTo(shownDegree(degree)); }
            return { eventId: id, event, map: m, gone: false, shown: degree };
        } catch (_error) { return null; }
    };
    const placeVisual = (f, x, y, degree) => {
        const event = f?.event;
        if (!event || event._erased || f.gone) return;
        event.isPlayerChild = false;
        if (degree !== undefined) {
            const at = visualReal(x, y, degree);
            event.setPosition(at.x, at.y);
            if (Math.abs(normalize(degree - f.shown + 180) - 180) > 0.01) { event.rotateTo(shownDegree(degree)); f.shown = degree; }
        } else event.setPosition(x - 0.5, y - 0.5);
    };
    // kind: "main" | "fragment"。(x,y) から degree へ dist マス飛ぶ矢を1本つくる。
    const launch = (shot, env, from, degree, dist, kind) => {
        if (shot.arrows.length >= MAX_TOTAL_ARROWS) return false;
        const arrow = { id: shot.arrows.length + 1, kind, x: from.x, y: from.y, last: { x: from.x, y: from.y }, heading: normalize(degree), dist, travelled: 0, gone: false, landed: false, visual: null, age: 0 };
        arrow.visual = spawnVisual(env, "arrow", arrow.x, arrow.y, arrow.heading);
        if (!arrow.visual) return false;
        shot.arrows.push(arrow);
        return true;
    };

    // ---------- 着弾・サークル・ネズミ ----------
    const circleVisual = (shot, c) => {
        if (shot.circles.filter(x => x.anchor).length >= CIRCLE_VISUAL_BUDGET) return;
        try {
            const spawned = root.ProjectRGodSummonVisual?.spawnAnchor?.({ x: c.x, y: c.y }, { cardId: CARD });
            if (spawned?.ok) {
                c.anchor = spawned.id;
                const ring = pvPlay("apollo_plague.circle", { eventId: spawned.eventId, radiusTiles: c.radius });
                if (ring?.note) c.notes.push(ring.note);
                pvPlay("apollo_plague.impact", { eventId: spawned.eventId });
            }
        } catch (_error) { /* 表示のみ */ }
    };
    const inCircle = (c, event) => { const p = eventCenter(event); return Math.hypot(p.x - c.x, p.y - c.y) <= c.radius + EPSILON; };
    const applyPlague = (shot, c, event) => {
        const cfg = shot.cfg, key = status().targetKeyOfEvent(event.eventId());
        const r = status().apply(key, PLAGUE_ID, { seconds: cfg.stateSeconds, damageTaken: cfg.damageTaken, weakness: cfg.weakness, attackRate: cfg.attackRate, source: CARD });
        if (r.ok) { shot.statesTouched.add(key); c.infected.add(event.eventId()); }
        return r.ok;
    };
    const spawnRats = (shot, c, env) => {
        const cfg = shot.cfg;
        for (let i = 0; i < cfg.ratCount; i++) {
            const a = i / cfg.ratCount * Math.PI * 2, at = { x: c.x + Math.cos(a) * 0.7, y: c.y + Math.sin(a) * 0.7 };
            const rat = { id: i + 1, x: at.x, y: at.y, circle: c, target: null, cooldown: 0, attacks: 0, damage: 0, visual: spawnVisual(env, "rat", at.x, at.y) };
            shot.rats.push(rat);
        }
        shot.ratsSpawned = true;
    };
    const landingSound = () => { if (frameNo - lastSoundFrame >= SOUND_GAP_FRAMES) { lastSoundFrame = frameNo; playSe("LandSoundEffect", "Blow5", 75, 100); } };
    // 着弾: 直撃(あれば)と、半径内の敵の有無を判定。最初の「敵がいた」着弾でカードを確定する。
    const land = (shot, arrow, point, directEvent, env) => {
        arrow.landed = true; destroyEv(arrow.visual);
        const cfg = shot.cfg;
        const c = { id: shot.circles.length + 1, x: point.x, y: point.y, radius: cfg.radius, frames: cfg.circleFrames, tickFramesLeft: 0, ticks: 0, anchor: null, notes: [], infected: new Set(), kind: arrow.kind };
        const inside = enemies().filter(e => inCircle(c, e));
        const hit = directEvent && hpOf(directEvent.eventId()) > 0 ? directEvent : null;
        const record = { arrow: arrow.id, kind: arrow.kind, heading: arrow.heading, x: point.x, y: point.y, direct: hit ? hit.eventId() : null, inside: inside.map(e => e.eventId()) };
        shot.landings.push(record);
        shot.circles.push(c);
        circleVisual(shot, c);
        landingSound();
        const success = !!hit || inside.length > 0;
        if (success && !shot.committed && !commitShot(shot)) return;
        if (shot.committed) {
            if (hit) { try { dealFixed(hit.eventId(), cfg.damage, `plague:${shot.serial}:${arrow.id}`, cfg); shot.direct++; record.damage = cfg.damage; } catch (error) { record.error = String(error?.message || error); } }
            for (const e of enemies()) if (inCircle(c, e)) applyPlague(shot, c, e);
            c.tickFramesLeft = cfg.tickFrames;
            if (arrow.kind === "main" && cfg.ratCount > 0 && !shot.ratsSpawned) spawnRats(shot, c, env);
        } else c.dormant = true; // 確定前に着弾したサークル(敵がいなかった)。確定した瞬間に有効になる
        if (arrow.kind === "main" && cfg.splitCount > 0) {
            for (let k = 0; k < cfg.splitCount; k++) {
                const ang = Math.random() * 360, d = cfg.splitRadius * (0.35 + 0.65 * Math.random());
                const target = { x: point.x + Math.sin(rad(ang)) * d, y: point.y - Math.cos(rad(ang)) * d };
                if (launch(shot, env, point, ang, d, "fragment")) shot.arrows[shot.arrows.length - 1].target = target;
            }
        }
        if (shot.committed) wakeDormant(shot);
    };
    const wakeDormant = shot => {
        for (const c of shot.circles) {
            if (!c.dormant) continue;
            c.dormant = false; c.tickFramesLeft = shot.cfg.tickFrames;
            for (const e of enemies()) if (inCircle(c, e)) applyPlague(shot, c, e);
            if (c.kind === "main" && shot.cfg.ratCount > 0 && !shot.ratsSpawned) { const env = environment(); if (env.ok) spawnRats(shot, c, env); }
        }
    };
    const summarize = shot => ({ landings: shot.landings.map(l => ({ ...l, inside: l.inside.slice() })), circles: shot.circles.length, rats: shot.rats.length, direct: shot.direct,
        infected: [...new Set(shot.circles.flatMap(c => [...c.infected]))].sort((a, b) => a - b), ratDamage: shot.rats.reduce((s, r) => s + r.damage, 0), ratAttacks: shot.rats.reduce((s, r) => s + r.attacks, 0) });
    const record = shot => {
        if (!shot.committed) return;
        lastResult = { ok: true, pending: false, consumed: true, committed: true, level: shot.level, serial: shot.serial, degree: shot.aim, instanceId: shot.instanceConsumed, ...summarize(shot), arrowsTotal: shot.arrows.length };
    };

    // ---------- 毎フレーム ----------
    const stepArrow = (shot, arrow, env) => {
        if (arrow.landed) return;
        arrow.age++;
        const occ = occlusion(), cfg = shot.cfg, step = cfg.speed / 60;
        const target = arrow.target ? Math.hypot(arrow.target.x - arrow.last.x, arrow.target.y - arrow.last.y) : Math.max(0, arrow.dist - arrow.travelled);
        const ux = arrow.target ? (arrow.target.x - arrow.x) / Math.max(EPSILON, Math.hypot(arrow.target.x - arrow.x, arrow.target.y - arrow.y)) : Math.sin(rad(arrow.heading));
        const uy = arrow.target ? (arrow.target.y - arrow.y) / Math.max(EPSILON, Math.hypot(arrow.target.x - arrow.x, arrow.target.y - arrow.y)) : -Math.cos(rad(arrow.heading));
        const move = Math.min(step, target);
        const from = { x: arrow.x, y: arrow.y }, now = { x: arrow.x + ux * move, y: arrow.y + uy * move };
        // 直撃: 掃いた線分が敵の体に最初に触れる位置(壁は越える)
        const ex = Math.sin(rad(arrow.heading)), ey = -Math.cos(rad(arrow.heading)), nx = -ey, ny = ex;
        const footprint = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => ({ x: nx * ACROSS_HALF * p + ex * ALONG_HALF * q, y: ny * ACROSS_HALF * p + ey * ALONG_HALF * q }));
        let best = null;
        for (const enemy of enemies()) {
            const polygon = occ.eventPolygon(enemy);
            if (!Array.isArray(polygon) || polygon.length < 3) continue;
            const fraction = occ.firstContact(from, now, polygon, footprint);
            if (fraction === null) continue;
            if (!best || fraction < best.fraction - EPSILON || (Math.abs(fraction - best.fraction) <= EPSILON && enemy.eventId() < best.event.eventId())) best = { fraction, event: enemy };
        }
        if (best) { const p = { x: from.x + (now.x - from.x) * best.fraction, y: from.y + (now.y - from.y) * best.fraction }; arrow.x = p.x; arrow.y = p.y; land(shot, arrow, p, best.event, env); return; }
        arrow.x = now.x; arrow.y = now.y; arrow.last = { x: now.x, y: now.y }; arrow.travelled += move;
        if (move >= target - EPSILON) { land(shot, arrow, { x: now.x, y: now.y }, null, env); return; }
        placeVisual(arrow.visual, arrow.x, arrow.y, arrow.heading);
        if (arrow.age > Math.ceil(cfg.range / Math.max(0.1, cfg.speed) * 60) * 3 + 120) { arrow.landed = true; destroyEv(arrow.visual); }
    };
    const stepCircles = shot => {
        const cfg = shot.cfg;
        for (const c of [...shot.circles]) {
            if (c.dormant) continue;
            if (--c.tickFramesLeft <= 0) { c.tickFramesLeft = cfg.tickFrames; c.ticks++; for (const e of enemies()) if (inCircle(c, e)) applyPlague(shot, c, e); }
            if (--c.frames <= 0) {
                removeCircle(c);
                shot.circles.splice(shot.circles.indexOf(c), 1);
                for (const r of [...shot.rats]) if (r.circle === c) { destroyEv(r.visual); shot.rats.splice(shot.rats.indexOf(r), 1); }
                note({ type: "circleEnd", serial: shot.serial, id: c.id });
            }
        }
    };
    const stepRats = shot => {
        const cfg = shot.cfg;
        for (const r of shot.rats) {
            const c = r.circle;
            let target = r.target ? map().event(r.target) : null;
            if (!target || target._erased || hpOf(target.eventId()) <= 0 || !inCircle(c, target)) {
                target = null; let best = Infinity;
                for (const e of enemies()) { if (!inCircle(c, e)) continue; const p = eventCenter(e), d = Math.hypot(p.x - r.x, p.y - r.y); if (d < best) { best = d; target = e; } }
                r.target = target ? target.eventId() : null;
            }
            if (r.cooldown > 0) r.cooldown--;
            if (target) {
                const p = eventCenter(target), d = Math.hypot(p.x - r.x, p.y - r.y);
                if (d > cfg.ratReach) { const s = Math.min(cfg.ratSpeed / 60, d - cfg.ratReach * 0.5); r.x += (p.x - r.x) / d * s; r.y += (p.y - r.y) / d * s; }
                else if (r.cooldown <= 0) {
                    r.cooldown = cfg.ratFrames; r.attacks++;
                    try { dealFixed(target.eventId(), cfg.ratDamage, `plague_rat:${shot.serial}:${r.id}:${r.attacks}`, cfg); r.damage += cfg.ratDamage; } catch (_error) { /* 次の攻撃へ */ }
                }
            }
            placeVisual(r.visual, r.x, r.y);
        }
    };
    const processShot = shot => {
        shot.age++;
        const env = environment();
        if (!env.ok) { abortShot(shot, env.reason); return; }
        for (const arrow of [...shot.arrows]) { stepArrow(shot, arrow, env); if (shot.aborted) return; }
        if (shot.committed) { wakeDormant(shot); stepCircles(shot); stepRats(shot); record(shot); }
        const flying = shot.arrows.some(a => !a.landed);
        if (!flying && !shot.committed) { abortShot(shot, "missed"); return; }
        if (!flying && shot.committed && !shot.circles.length) { record(shot); endShot(shot, "finished", true); }
    };
    const clearAll = reason => {
        for (const shot of [...shots.values()]) { if (!shot.committed) abortShot(shot, reason); else { endShot(shot, reason); } }
        pending = null;
        status()?.clear?.(reason);
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        frameNo++;
        if (!shots.size || this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        for (const shot of [...shots.values()]) {
            try { processShot(shot); } catch (error) { abortShot(shot, "error:" + String(error?.message || error)); }
        }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };
    const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
    Scene_Map.prototype.onMapLoaded = function() {
        _onMapLoaded.apply(this, arguments);
        const m = map();
        if (!m) return;
        const tracked = new Set([...shots.values()].flatMap(s => [...s.arrows.map(a => a.visual?.event), ...s.rats.map(r => r.visual?.event)]).filter(Boolean));
        for (const event of m.events()) { const n = event?.event?.()?.note || ""; if (event && !tracked.has(event) && (n.includes(ARROW_TAG) || n.includes(RAT_TAG))) destroyEv({ eventId: event.eventId(), event, map: m, gone: false }); }
    };

    root.ProjectRApolloPlagueRain = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, cardLevel, config,
        isPending: () => !!pending,
        getPending: () => pending ? { serial: pending.serial, instanceId: pending.instanceId, level: pending.level, arrows: pending.arrows.filter(a => !a.landed).length } : null,
        getShots: () => [...shots.values()].map(s => ({ serial: s.serial, level: s.level, committed: s.committed, age: s.age, arrows: s.arrows.length, flying: s.arrows.filter(a => !a.landed).length, circles: s.circles.length, rats: s.rats.length, landings: s.landings.length })),
        getArrows: () => [...shots.values()].flatMap(s => s.arrows.filter(a => !a.landed).map(a => ({ serial: s.serial, id: a.id, kind: a.kind, x: a.x, y: a.y, heading: a.heading, travelled: a.travelled, dist: a.dist }))),
        getCircles: () => [...shots.values()].flatMap(s => s.circles.map(c => ({ serial: s.serial, id: c.id, x: c.x, y: c.y, radius: c.radius, framesLeft: c.frames, ticks: c.ticks, dormant: !!c.dormant, infected: [...c.infected], hasVisual: !!c.anchor }))),
        getRats: () => [...shots.values()].flatMap(s => s.rats.map(r => ({ serial: s.serial, id: r.id, x: r.x, y: r.y, target: r.target, attacks: r.attacks, damage: r.damage }))),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLog: () => log.map(e => ({ ...e })),
        getTempObjectCount: () => { const list = [...shots.values()]; const c = { arrows: list.reduce((s, x) => s + x.arrows.filter(a => !a.landed && a.visual && !a.visual.gone).length, 0), rats: list.reduce((s, x) => s + x.rats.filter(r => r.visual && !r.visual.gone).length, 0), anchors: list.reduce((s, x) => s + x.circles.filter(k => k.anchor).length, 0), notes: list.reduce((s, x) => s + x.circles.reduce((n, k) => n + k.notes.length, 0), 0) }; c.total = c.arrows + c.rats + c.anchors + c.notes; return c; },
        geometry: Object.freeze({ visualReal, inCircle })
    });
})();
