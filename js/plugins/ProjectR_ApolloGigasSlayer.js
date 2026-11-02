/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「ギガース殺し」(設計ID 13 / apollo_gigas_slayer) Lv1〜3: オートチャージの太い矢。当たった敵は弱点状態(被ダメージx2)。Lv2で傷状態、Lv3で幅3マスの連続ヒット。命中が確定してから消費。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_HitStop
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_ApolloStatus
 * @base ProjectR_ApolloGoldenVolley
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @orderAfter ProjectR_ApolloGoldenVolley
 * @orderAfter ProjectR_ApolloStatus
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 *
 * @param ChargeSoundEffect
 * @text オートチャージの効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「シュー…ズバァン」。専用音が無いので、RTPのWind5(シュー)を仮に当てています。
 * @type string
 * @default Wind5
 *
 * @param FireSoundEffect
 * @text 発射の効果音(RTPのSE名。空なら鳴らさない)
 * @desc 仮のRTP音(Bow2)。専用音ができたらここだけ差し替え。
 * @type string
 * @default Bow2
 *
 * @param HitSoundEffect
 * @text 命中の効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックは「ズバァン」。仮のRTP音(Blow7)。Lv3の連続ヒットは間引いて鳴らします。
 * @type string
 * @default Blow7
 *
 * @help
 * ProjectR_ApolloGigasSlayer.js
 *
 * 新カード「ギガース殺し」(ワークブック「カード一覧」のCard ID 13)。ランタイムIDは apollo_gigas_slayer。Apollo / 強力 / 最大5枚 / 最大Lv3 / Cooldown 3秒 / Ground。
 * 数値はすべて data/ProjectR_CardBalance.json(開発用エディタ F6)が持ちます。このPluginは幾何と手順だけを持ちます。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: 一本の太い矢(幅の当たり判定1マス)をチャージして放つ(オートチャージ)。当たった敵は弱点状態(持続5秒。被ダメージが2倍)。1ヒット100ダメージ。
 *   Lv2: 傷状態を付与(持続5秒。秒間30のスリップダメージを負い、被ダメージ10%増加)。
 *   Lv3: 幅が3マスになり、連続ヒットする。連続ヒット仕様は黄金の矢と同じ。
 *   成功: 範囲内に敵がいた場合 / 失敗: 範囲外 / 対象なし時: 対象外。壁越え: いいえ。複数対象: はい。
 *
 * 【射程(∞)】ワークブックの射程は∞。Phase A8で、矢(Lv1〜2)・ビーム(Lv3)とも「壁・敵・マップの端まで」届くようにしました(従来は40マスで止まっていた)。
 *   設定 bowRangeTiles / bowBeamRangeTiles の 0 = ∞(既定)。有限の値を入れればそこで止まります(F6)。到達はマップの対角線までの有限の値、矢の寿命は最大約58秒。ビームの絵は画面に映る範囲まで描きます。
 *
 * 【仮の決め(ワークブックに無い部分。バランス設定で変えられるものは変えられる)】
 *   ・オートチャージ = 発動してから 0.5秒(chargeSeconds)後に自動で放つ(長押し不要)。放つ瞬間のマウス方向へ撃つ(チャージ中は照準に追従)。
 *   ・矢の速さ20マス/秒・射程は∞(Phase A8。壁・マップの端まで)。矢は最初に当たった敵で止まる(Lv1〜2は貫通なし)。壁・マップの端で止まる。
 *   ・弱点状態の被ダメージx2 と 傷状態のx1.1 は積(x2.2)。状態は命中の「後」に付くので、その命中自体のダメージは倍になりません。
 *     傷のスリップは1秒ごとに30(5回で150)で、スリップも被ダメージ倍率(弱点x2・傷x1.1)の対象です(HPを減らす呼び出しはすべて同じ窓口を通るため)。
 *   ・再命中は状態の持続時間の更新(重ねがけしない。スリップの位相は保つ)。Lv3の連続ヒットでは、ヒットごとに更新されます。
 *   ・Lv3: 黄金の矢のビームと同じ連続ヒット(先端が秒40マスで進み、1/3マスごとにサンプル、同じ敵へ最大11ヒット、ヒットストップ3frame)。
 *     幅は3マス。1ヒット100ダメージ(最大1100)。弱点状態は最初のヒットから付くので、2ヒット目以降は被ダメージ倍率が掛かる。
 *
 * 【命中と消費(予約→確定。黄金の矢と同じ)】
 *   発動 → チャージ(カード未消費) → 発射。最初の有効なヒットの瞬間に、正規の経路(requestUseCard)でカードを1回だけ消費する。
 *   何にも当たらなければ非消費・Cooldownなし。チャージ中・飛行中の再発動は gigasPending で拒否(二重発射・二重消費を防ぐ)。
 *   確定時にカードが手札に無い・戦闘が終わっていた・消費に失敗したときは、矢を消して何も与えない。
 *   戦闘終了・マップ移動・ロード・死亡・対象の消滅で、矢・チャージ・ビームの絵・ヒットストップをすべて片付ける(セーブしない)。
 *
 * 【演出(表示だけ)】Apolloが主人公の前に現れ、弓を引いて光の粒子を集め(チャージ。公式Show VFX = VFX Designerライブラリ)、発射と同時に放出する。主人公は構え(ArmDraw)から手を前へ(ArmExtend)。
 *   通常カットイン1回。Lv3のビームは黄金の矢のビームの絵(VFX)を流用(黄金・幅3マス)。
 *
 * API: ProjectRApolloGigasSlayer
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / isPending() / getPending() / getShots() / getArrow() / getBeam() / getLastResult() / getHitLog() / getActiveVfxJobs()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_gigas_slayer";
    const TAG = "<projectRGigasArrow>";
    const TEMPLATE_NAME = "ProjectR Apollo Gigas Slayer Arrow";
    const BOW_SPRITE = "ProjectR_Bow_DEV";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const BEAM_LEVEL = 3;
    const WEAK_ID = "gigas_weak", WOUND_ID = "gigas_wound";
    const TEMPLATE_HITBOX = 0.3, ALONG_TILES = 0.3, EPSILON = 1e-8;
    const BEAM_VFX_FRAMES = 30, HIT_SOUND_GAP_FRAMES = 4, RECORD_LIMIT = 400;
    const UNIFORM_LANE_GAP = 0.05;
    const STALL_RATIO = 0.25, STALL_FRAMES = 4;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloGigasSlayer") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
    const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    // ---- 射程(ワークブック: ∞)。設定の 0 = ∞ = 「壁・当たり・マップの端まで」。有限の値を設定すればそこで止まる(F6)。 ----
    //   マップに閉じた有限の値で計算する: 到達距離の上限 = マップの対角線 + 2マス、寿命の上限 = HARD_LIFETIME_FRAMES(約58秒。Event の安全網 3600frame より短い)。
    //   見た目(ビームの絵)は、画面に映る範囲(画面の対角線)までを描く(それより遠くは画面の外)。当たり(判定)の到達とは別に、描く長さだけを抑える。
    const HARD_LIFETIME_FRAMES = 3500;
    const mapReach = () => { const m = map(); return m ? Math.hypot(m.width(), m.height()) + 2 : 0; };
    const reachOf = value => (Number(value) > 0 ? Number(value) : mapReach());
    const visualReach = () => {
        const m = map(), tile = m?.tileWidth?.() || 48;
        const w = (typeof Graphics !== "undefined" && Graphics.width) || 816, h = (typeof Graphics !== "undefined" && Graphics.height) || 624;
        return clamp(Math.ceil(Math.hypot(w, h) / tile), 24, 64);
    };
    const lifetimeFramesFor = (range, speed) => Math.min(HARD_LIFETIME_FRAMES, Math.ceil(range / Math.max(0.1, speed) * 60) + 60);

    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const rad = degree => degree * Math.PI / 180;
    const normalize = degree => ((degree % 360) + 360) % 360;
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const geo = () => root.ProjectRApolloGoldenVolley?.geometry || null;
    // ビームの絵(Phase A10): 幅3マスの当たり判定と絵の幅・中心を一致させるため、黄金の矢のビームの絵(apollo_volley.beam: 光が端へ向けて細る・offsetY -18)とは別に、
    //   ギガース殺し専用の絵を登録する(offsetY -9は実機で測った値: アンカー位置が+18px下になるのを、Hendrixが二重に適用するoffsetで打ち消し、絵の中心を撃つ位置の中心線に合わせる)。ProjectRPresentationVfx.register(公式の差し込み口)で、黄金の矢のVFXは変えない。
    //   ・apollo_gigas.beam: 幅3マス(144px)の端まで光が続き、端に縁の線がある。撃つ位置の中心線に重ねる。
    //   ・apollo_gigas.beamlane: 遮られたときの1マス幅のレーン。左右の端まで光が続き、隣り合うレーンと隙間なくつながる。
    try {
        const sheet = file => Object.freeze({ file: "Animation/" + file, rows: 2, columns: 4, fps: 18 });
        root.ProjectRPresentationVfx?.register?.("apollo_gigas.beam", { library: "ProjectR_Gigas_Beam", sheet: sheet("ProjectR_Gigas_Beam"), anchor: "player", beam: true, segmentTiles: 3, stick: true, scale: 100, opacity: 240, offsetY: -9, axisScale: true, blend: "Add" });
        root.ProjectRPresentationVfx?.register?.("apollo_gigas.beamlane", { library: "ProjectR_Gigas_BeamLane", sheet: sheet("ProjectR_Gigas_BeamLane"), anchor: "player", beam: true, segmentTiles: 2, stick: true, scale: 100, opacity: 240, offsetY: -9, axisScale: true, blend: "Add" });
    } catch (_error) { /* 表示のみ */ }
    const status = () => root.ProjectRApolloStatus || null;
    const hitStop = () => root.ProjectRHitStop;
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
    const seName = (key, fallback) => String(params[key] === undefined ? fallback : params[key]).trim();
    const playSe = (name, volume = 80, pitch = 100) => { try { if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };

    const cardLevel = () => {
        try {
            const definition = deck.definitions?.card?.(CARD);
            const level = Number.parseInt(deck.getPersistentData?.().cardOwnership?.[CARD]?.level, 10);
            return clamp(Number.isFinite(level) ? level : 1, 1, definition?.maxLevel || IMPLEMENTED_MAX_LEVEL);
        } catch (_error) { return 1; }
    };
    // レベルごとの設定(不正なら null → 発動を拒否して非消費)
    const config = level => {
        try {
            const e = effectsForLevel(level);
            const c = { level, damage: num(e.damage), chargeSeconds: num(tune("chargeSeconds")), speed: num(tune("projectileSpeed")), range: num(tune("bowRangeTiles")), width: num(tune("pathWidthTiles")),
                weakSeconds: num(e.weakSeconds), weakTaken: num(e.weakDamageTaken), element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier") };
            c.chargeFrames = Math.max(0, Math.round(c.chargeSeconds * 60));
            c.wound = Number(e.woundSeconds) > 0;
            if (c.wound) Object.assign(c, { woundSeconds: num(e.woundSeconds), woundDps: num(e.woundDamagePerSecond), woundTick: num(e.woundTickSeconds), woundTaken: num(e.woundDamageTaken) });
            c.beam = level >= BEAM_LEVEL && Number(e.beamWidthTiles) > 0;
            if (c.beam) Object.assign(c, { beamWidth: num(e.beamWidthTiles), beamSpeed: num(tune("beamSpeed")), beamRange: num(tune("bowBeamRangeTiles")), perTile: num(tune("beamHitsPerTile")),
                maxHits: Math.floor(num(tune("beamMaxHitsPerTarget"))), stopFrames: Math.floor(num(tune("hitStopFrames"))), stopMax: Math.floor(num(tune("hitStopMaxFrames"))) });
            const ok = c.damage >= 0 && c.chargeSeconds >= 0 && c.speed > 0 && c.range >= 0 && c.width > 0 && c.weakSeconds > 0 && c.weakTaken >= 1
                && (!c.wound || (c.woundSeconds > 0 && c.woundDps >= 0 && c.woundTick > 0 && c.woundTaken >= 1))
                && (!c.beam || (c.beamWidth > 0 && c.beamSpeed > 0 && c.beamRange >= 0 && c.perTile > 0 && c.maxHits >= 1 && c.stopFrames >= 0 && c.stopMax >= 0));
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
    const isArrow = event => !!event?.event?.()?.note?.includes(TAG);
    // 実測: 矢は移動ルート(moveToPosition('forward'))で飛ぶ。MZの自律移動は Game_CharacterBase.isNearTheScreen(画面中心から画面1つ分の外では動かない)で止まるため、
    //   これまでの実際の射程の上限は「画面の外へ出るところ」(実機1920x1080で横40マス/縦22.5マス)だった。この矢だけは、画面の外でも動き続ける(マップの端・壁・寿命で終わる)。
    const _isNearTheScreen = Game_CharacterBase.prototype.isNearTheScreen;
    Game_CharacterBase.prototype.isNearTheScreen = function() { return (this instanceof Game_Event && isArrow(this)) ? true : _isNearTheScreen.apply(this, arguments); };
    const releaseSummon = id => { try { root.ProjectRGodSummonManager?.release?.(id); } catch (_error) { /* 表示のみ */ } };
    const environment = () => {
        const m = map();
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!player || !m || typeof m.getCurrentEventHp !== "function") return failure("mapUnavailable");
        if (!(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return failure("mapUnavailable");
        if (typeof DotMoveSystem === "undefined" || typeof m.spawnEvent !== "function" || typeof root.checkCollide !== "function") return failure("actionCombatUnavailable");
        if (!["UpdateEventHp", "DestroyEvent", "ChangeHitboxData"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) return failure("actionCombatUnavailable");
        const occ = occlusion();
        if (typeof occ?.firstBlockerBetween !== "function" || typeof occ?.firstContact !== "function" || typeof occ?.eventPolygon !== "function") return failure("occlusionUnavailable");
        if (!geo() || !status()) return failure("statusUnavailable");
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const template = templates?.find(event => event?.name === TEMPLATE_NAME);
        if (!template || !template.note.includes(TAG)) return failure("projectileTemplateUnavailable");
        return { ok: true, map: m, template };
    };

    // ---------- 状態 ----------
    const shots = new Map(); // serial -> shot
    let serial = 0, pending = null, reserve = null, mode = null, commitPlan = null, lastResult = null, frameNo = 0, lastHitSoundFrame = -Infinity;
    const hitLog = [];
    const vfxJobs = [];

    const stopNote = note => { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    const endVfxJob = job => {
        for (const note of job.notes || []) stopNote(note);
        for (const id of job.anchors || []) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(id); } catch (_error) { /* 表示のみ */ } }
    };
    const clearVfxJobs = () => { for (const job of vfxJobs.splice(0)) endVfxJob(job); };
    const tickVfxJobs = () => { for (let i = vfxJobs.length - 1; i >= 0; i--) if (--vfxJobs[i].frames <= 0) { endVfxJob(vfxJobs[i]); vfxJobs.splice(i, 1); } };
    const endCharge = shot => {
        const c = shot.charge;
        if (!c) return;
        shot.charge = null;
        stopNote(c.bowNote); stopNote(c.glowNote);
        try { root.ProjectRCharacterPresentation?.release?.("ArmDraw"); } catch (_error) { /* 表示のみ */ }
    };

    const destroyArrow = arrow => {
        if (!arrow || arrow.gone) return;
        arrow.gone = true;
        const m = map();
        if (!m || arrow.map !== m || m.event(arrow.eventId) !== arrow.event) return;
        try { command("DestroyEvent", { target: String(arrow.eventId), destroyNearby: "", permanent: "false" }, arrow.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const destroyShot = shot => {
        destroyArrow(shot.arrow);
        endCharge(shot);
        try { hitStop()?.release?.(`gigas:${shot.serial}`); } catch (_error) { /* 表示のみ */ }
    };
    const aimNow = () => {
        try {
            const dx = TouchInput.x - $gamePlayer.screenX(), dy = TouchInput.y - $gamePlayer.screenY();
            return Number.isFinite(dx) && Number.isFinite(dy) && Math.hypot(dx, dy) > EPSILON ? normalize(Math.atan2(dy, dx) * 180 / Math.PI + 450) : null;
        } catch (_error) { return null; }
    };

    // ---------- 取引(予約 → 確定) ----------
    const handIndexOf = instanceId => { const s = deck.getBattleState?.(); return s ? s.hand.findIndex(card => card.instanceId === instanceId) : -1; };
    const finishPending = shot => { if (pending === shot) pending = null; };
    const abortShot = (shot, reason, extra = {}) => {
        if (shot.aborted) return;
        shot.aborted = true;
        destroyShot(shot);
        shots.delete(shot.serial);
        finishPending(shot);
        releaseSummon(shot.summonId);
        lastResult = { ok: false, reason, aborted: true, consumed: false, committed: false, level: shot.level, serial: shot.serial, hits: shot.hits.length, ...extra };
    };
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
        if (result?.ok === true && result.cardId === CARD) {
            shot.committed = true; shot.instanceConsumed = result.instanceId ?? shot.instanceId; finishPending(shot);
            return true;
        }
        abortShot(shot, result?.detail || result?.reason || "notConsumed");
        return false;
    };

    // ---------- 発動 ----------
    const activate = context => {
        if (mode === "commit") return commitPlan ? { ok: true } : failure("noCommitPlan");
        if (!deck.isCardBattleActive() || !root.ProjectRCardCatalog) return failure("battleInactive");
        if (pending) return failure("gigasPending");
        if (!balanceReady()) return failure("balanceUnavailable");
        const env = environment();
        if (!env.ok) return failure(env.reason);
        const summons = root.ProjectRGodSummonManager;
        if (!summons) return failure("godSummonUnavailable");
        const level = cardLevel(), cfg = config(level);
        if (!cfg) return failure("balanceInvalid");
        let shot = null;
        const result = summons.perform({ definition: context?.definition, lifetimeFrames: cfg.chargeFrames + 70 }, summon => {
            if (!Number.isFinite(summon.degree) || !(summon.distance >= EPSILON)) return failure("invalidMousePosition");
            shot = { serial: ++serial, instanceId: context.instance.instanceId, definition: context.definition, level, cfg, aim0: normalize(summon.degree), aim: null, phase: "charge", framesLeft: cfg.chargeFrames,
                committed: false, summonId: summon.summonId, hits: [], targets: new Map(), arrow: null, beam: null, charge: null, age: 0 };
            return { ok: true };
        });
        if (!result?.ok || !shot) return failure(result?.reason || "activationFailed");
        shot.summonId = result.summonId ?? shot.summonId;
        reserve = shot;
        return failure("reserved");
    };
    const previousGround = deck.getActivationHandler("ground");
    deck.registerActivationHandler("ground", context => context.definition.cardId === CARD ? activate(context) : previousGround ? previousGround(context) : { ok: true });

    const godIdFor = definition => deck.definitions?.ring?.(definition?.ringId)?.godId || root.ProjectRGodSummonManager?.resolveGodId?.(definition?.ringId) || "apollo";
    const present = shot => {
        try { if (root.ProjectRCutIn?.isCardEnabled?.(CARD)) root.ProjectRCutIn.show({ kind: "card", godId: godIdFor(shot.definition), cardId: CARD }); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("ArmDraw", { source: "card", detail: CARD, frames: 100000, degree: shot.aim0 }); } catch (_error) { /* 表示のみ */ }
        playSe(seName("ChargeSoundEffect", "Wind5"), 70, 100);
        shot.charge = { bowNote: null, glowNote: null, stage: 0, event: 0 };
    };

    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        reserve = null;
        let result;
        try { result = _requestUseCard.apply(this, arguments); }
        catch (error) { if (reserve) { destroyShot(reserve); releaseSummon(reserve.summonId); } reserve = null; throw error; }
        const shot = reserve;
        reserve = null;
        if (!shot) return result;
        pending = shot;
        shots.set(shot.serial, shot);
        lastResult = { ok: true, pending: true, consumed: false, committed: false, level: shot.level, serial: shot.serial, phase: shot.phase, instanceId: shot.instanceId };
        present(shot);
        return { ok: false, reason: "pending", reasons: [{ code: "pending" }], pending: true, cardId: CARD, instanceId: shot.instanceId, detail: "gigasReserved" };
    };

    // ---------- チャージ演出(表示だけ) ----------
    const updateCharge = shot => {
        const c = shot.charge;
        if (!c) return;
        if (!c.event) {
            c.event = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
            if (c.event) c.bowNote = pvPlay("apollo_charge.bow", { eventId: c.event, degree: shot.aim0 })?.note || null;
            return;
        }
        const total = Math.max(1, shot.cfg.chargeFrames), done = total - shot.framesLeft;
        const stage = done >= total * 0.8 ? 3 : done >= total * 0.5 ? 2 : done >= total * 0.2 ? 1 : 0;
        if (stage > c.stage) { stopNote(c.glowNote); c.glowNote = pvPlay("apollo_charge.glow" + stage, { eventId: c.event })?.note || null; c.stage = stage; }
    };

    // ---------- 発射 ----------
    const spawnArrow = (env, shot, x, y, degree) => {
        const m = env.map, before = new Set(m.events()), cfg = shot.cfg;
        try {
            const id = m.spawnEvent(env.template.id, x, y, false, degree);
            const event = id && m.event(id);
            if (!event || before.has(event) || !isArrow(event) || typeof event.rotateTo !== "function") throw Error("projectileCreationFailed");
            event.rotateTo(degree);
            if (!Number.isFinite(event._rotation) || Math.abs(event._rotation - degree) > 0.000001) throw Error("projectileRotationFailed");
            event.setMoveSpeed(Math.log2(Math.max(0.01, cfg.speed) * 256 / 60));
            if (Math.abs(cfg.width - 1) > EPSILON) command("ChangeHitboxData", { eventId: String(id), width: String(cfg.width), height: String(ALONG_TILES), offsetX: "0.0001", offsetY: "0.0001" }, id);
            return { ok: true, arrow: { eventId: id, event, map: m, degree, width: cfg.width, age: 0, last: null, origin: null, travelled: 0, stalled: 0, gone: false } };
        } catch (error) {
            for (const event of m.events()) if (!before.has(event) && isArrow(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
            return failure(String(error?.message || error));
        }
    };
    const fire = shot => {
        const env = environment();
        if (!env.ok) { abortShot(shot, env.reason); return; }
        const cfg = shot.cfg, degree = aimNow() ?? shot.aim0;
        shot.aim = degree;
        endCharge(shot);
        try { root.ProjectRGodSummonVisual?.swingWeapon?.("apollo", degree, BOW_SPRITE); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("ArmExtend", { source: "card", detail: CARD, frames: (cfg.beam ? 60 : 30), degree }); } catch (_error) { /* 表示のみ */ }
        pvPlay("apollo_volley.burst", { degree });
        playSe(seName("FireSoundEffect", "Bow2"), 80, 100);
        const apolloEvent = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
        if (apolloEvent) pvPlay("apollo_volley.particles", { eventId: apolloEvent });
        const p = $gamePlayer.centerPositionPoint(), origin = { x: p.x, y: p.y };
        if (cfg.beam) {
            const lanes = geo().buildLanes(origin, degree, cfg.beamWidth, reachOf(cfg.beamRange));
            const limit = Math.max(0, ...lanes.map(l => l.limit));
            shot.beam = { origin, degree, lanes, limit, head: 0, sampled: 0, done: false };
            shot.phase = "beam";
            presentBeam(shot);
        } else {
            const spawned = spawnArrow(env, shot, $gamePlayer._realX, $gamePlayer._realY, degree);
            if (!spawned.ok) { abortShot(shot, spawned.reason); return; }
            shot.arrow = spawned.arrow;
            shot.stepTiles = cfg.speed / 60;
            shot.range = reachOf(cfg.range);
            shot.maxFrames = lifetimeFramesFor(shot.range, cfg.speed);
            shot.phase = "flight";
        }
        lastResult = { ok: true, pending: !shot.committed, consumed: shot.committed, committed: shot.committed, level: shot.level, serial: shot.serial, degree, phase: shot.phase, instanceId: shot.instanceId };
    };
    const presentBeam = shot => {
        try {
            const b = shot.beam, vr = visualReach(), limits = b.lanes.map(l => Math.min(l.limit, vr)), job = { frames: BEAM_VFX_FRAMES, notes: [], anchors: [] };
            const collect = r => { if (r?.ok && Array.isArray(r.notes)) { job.notes.push(...r.notes); if (Array.isArray(r.anchors)) job.anchors.push(...r.anchors); } };
            const vfx = root.ProjectRPresentationVfx;
            if (Math.max(...limits) - Math.min(...limits) < UNIFORM_LANE_GAP) {
                if (b.limit > 0) collect(vfx?.play("apollo_gigas.beam", { degree: b.degree, length: Math.min(b.limit, vr), instance: "g" + shot.serial, origin: b.origin }));
            } else {
                for (const lane of b.lanes) if (lane.limit > 0) collect(vfx?.play("apollo_gigas.beamlane", { degree: b.degree, length: Math.min(lane.limit, vr), lateral: lane.center, instance: `g${shot.serial}.l${lane.index}`, origin: b.origin }));
            }
            if (job.notes.length) vfxJobs.push(job);
        } catch (_error) { /* 表示のみ */ }
    };

    // ---------- 命中 ----------
    const playHitSound = n => { if (frameNo - lastHitSoundFrame < HIT_SOUND_GAP_FRAMES) return; lastHitSoundFrame = frameNo; playSe(seName("HitSoundEffect", "Blow7"), 80, 100 + Math.min(10, n) * 2); };
    const applyStates = (shot, eventId) => {
        const cfg = shot.cfg, key = status().targetKeyOfEvent(eventId), out = {};
        out.weak = status().apply(key, WEAK_ID, { seconds: cfg.weakSeconds, damageTaken: cfg.weakTaken, source: CARD }).ok;
        if (cfg.wound) out.wound = status().apply(key, WOUND_ID, { seconds: cfg.woundSeconds, damageTaken: cfg.woundTaken, dot: { perSecond: cfg.woundDps, tickSeconds: cfg.woundTick, source: CARD, element: cfg.element, weaknessMultiplier: cfg.weaknessMultiplier }, source: CARD }).ok;
        return out;
    };
    // 1回のヒット(ダメージ → 状態の付与)。命中の「前」の倍率でダメージを与え、状態は後から付く。
    const hitTarget = (shot, enemy, id, sample) => {
        let rec = shot.targets.get(id);
        if (!rec) { rec = { eventId: id, hits: 0, damage: 0, lastK: 0, weak: false, wound: false, stopFrames: 0 }; shot.targets.set(id, rec); }
        const record = { target: id, hit: rec.hits + 1, sample, damage: shot.cfg.damage };
        try {
            dealFixed(id, shot.cfg.damage, `gigas:${shot.serial}:${id}:${sample}`, shot.cfg);
            rec.hits++; rec.damage += shot.cfg.damage; rec.lastK = sample;
            const s = applyStates(shot, id);
            rec.weak = !!s.weak; rec.wound = !!s.wound; record.weak = rec.weak; record.wound = rec.wound;
            if (shot.cfg.beam && shot.cfg.stopFrames > 0 && hitStop()) {
                const r = hitStop().apply(enemy, shot.cfg.stopFrames, { owner: `gigas:${shot.serial}`, maxFrames: shot.cfg.stopMax });
                rec.stopFrames = r?.total ?? rec.stopFrames;
            }
            playHitSound(rec.hits);
        } catch (error) { record.error = String(error?.message || error); }
        if (shot.hits.length < RECORD_LIMIT) shot.hits.push(record);
        if (hitLog.length < RECORD_LIMIT) hitLog.push({ serial: shot.serial, ...record });
        return record;
    };
    const summarize = shot => {
        const targets = [...shot.targets.values()].map(r => ({ eventId: r.eventId, hits: r.hits, damage: r.damage, weak: r.weak, wound: r.wound, hitStopFrames: r.stopFrames }));
        return { targets, totalHits: targets.reduce((s, r) => s + r.hits, 0), totalDamage: targets.reduce((s, r) => s + r.damage, 0) };
    };
    const recordResult = shot => {
        if (!shot.committed) return;
        lastResult = { ok: true, pending: false, consumed: true, committed: true, level: shot.level, serial: shot.serial, degree: shot.aim, phase: shot.phase, ...summarize(shot), instanceId: shot.instanceConsumed };
    };

    // 矢(Lv1〜2): 黄金の矢と同じ掃き判定
    const resolveArrow = (shot, enemies) => {
        const m = map(), occ = occlusion(), g = geo(), arrow = shot.arrow;
        if (arrow.map !== m || m.event(arrow.eventId) !== arrow.event || arrow.event._erased) return { gone: true };
        arrow.age++;
        const now = g.tileCenter(arrow.event), footprint = g.arrowBody(arrow.event, arrow.degree);
        if (![now.x, now.y].every(Number.isFinite)) return { gone: true };
        const from = arrow.last || now;
        if (!arrow.origin) arrow.origin = { x: from.x, y: from.y };
        arrow.last = now;
        arrow.travelled = Math.hypot(now.x - arrow.origin.x, now.y - arrow.origin.y);
        arrow.stalled = arrow.age > 1 && Math.hypot(now.x - from.x, now.y - from.y) < shot.stepTiles * STALL_RATIO ? arrow.stalled + 1 : 0;
        const wall = occ.firstBlockerBetween(from, now, { mode: "combat", footprint });
        let best = null;
        for (const enemy of enemies) {
            const id = enemy.eventId(), target = occ.eventPolygon(enemy);
            if (!Array.isArray(target) || target.length < 3) continue;
            const fraction = occ.firstContact(from, now, target, footprint);
            if (fraction === null) continue;
            if (!best || fraction < best.fraction - EPSILON || (Math.abs(fraction - best.fraction) <= EPSILON && id < best.enemyId)) best = { enemyId: id, fraction };
        }
        if (best && (!wall || best.fraction <= wall.fraction + EPSILON)) return best;
        if (wall) return { blocked: "wall" };
        if (root.checkCollide(arrow.eventId, "<destroyProjectile>") || root.checkCollide(arrow.eventId, "map boundary")) return { blocked: "boundary" };
        if (arrow.travelled > shot.range) return { blocked: "range" };
        if (arrow.stalled >= STALL_FRAMES) return { blocked: "stalled" };
        if (arrow.age > shot.maxFrames) return { blocked: "lifetime" };
        return null;
    };
    const processArrow = shot => {
        const m = map(), enemies = m.events().filter(event => isEnemy(event) && hpOf(event.eventId()) > 0);
        const outcome = resolveArrow(shot, enemies);
        if (!outcome) return;
        if (!outcome.enemyId) { shot.arrow.end = outcome.blocked || "gone"; destroyArrow(shot.arrow); finishFlight(shot); return; }
        if (!shot.committed && !commitShot(shot)) return;
        shot.arrow.end = "hit";
        destroyArrow(shot.arrow);
        const enemy = m.event(outcome.enemyId);
        if (enemy && !enemy._erased && hpOf(outcome.enemyId) > 0) hitTarget(shot, enemy, outcome.enemyId, 1);
        recordResult(shot);
        finishFlight(shot);
    };
    const finishFlight = shot => {
        if (!shot.committed) abortShot(shot, "missed");
        else { shots.delete(shot.serial); releaseSummon(shot.summonId); }
    };

    // ビーム(Lv3): 黄金の矢のビームと同じ連続ヒット
    const processBeam = shot => {
        const b = shot.beam, cfg = shot.cfg, occ = occlusion(), g = geo();
        if (!b.done) b.head = Math.min(b.limit, b.head + cfg.beamSpeed / 60);
        const kHead = Math.floor(b.head * cfg.perTile + 1e-9), kFrom = b.sampled + 1, planned = [];
        if (kHead >= kFrom) {
            for (const enemy of map().events().filter(event => isEnemy(event) && hpOf(event.eventId()) > 0)) {
                const id = enemy.eventId(), rec = shot.targets.get(id) || { hits: 0, lastK: 0 };
                if (rec.hits >= cfg.maxHits) continue;
                const region = g.beamRegion(b, occ.eventPolygon(enemy));
                if (!region) continue;
                const k0 = Math.max(1, kFrom, rec.lastK + 1, Math.ceil(region.enter * cfg.perTile - 1e-9));
                if (k0 > kHead) continue;
                for (let k = k0, n = rec.hits; k <= kHead && n < cfg.maxHits; k++, n++) planned.push({ k, id, enemy });
            }
            b.sampled = kHead;
        }
        if (planned.length && !shot.committed) { if (!commitShot(shot)) return; }
        planned.sort((x, y) => x.k - y.k || x.id - y.id);
        for (const hit of planned) {
            const rec = shot.targets.get(hit.id);
            if (rec && rec.hits >= cfg.maxHits) continue;
            if (!hit.enemy || hit.enemy._erased || map().event(hit.id) !== hit.enemy || hpOf(hit.id) <= 0) continue;
            hitTarget(shot, hit.enemy, hit.id, hit.k);
        }
        if (b.head >= b.limit - EPSILON) b.done = true;
        recordResult(shot);
        if (b.done) {
            if (!shot.committed) abortShot(shot, "missed", { kind: "beam", head: b.head, limit: b.limit });
            else { try { hitStop()?.release?.(`gigas:${shot.serial}`); } catch (_error) { /* 表示のみ */ } shots.delete(shot.serial); releaseSummon(shot.summonId); }
        }
    };

    const processShot = shot => {
        shot.age++;
        if (shot.phase === "charge") {
            updateCharge(shot);
            if (--shot.framesLeft <= 0) fire(shot);
            return;
        }
        if (shot.phase === "flight") processArrow(shot); else if (shot.phase === "beam") processBeam(shot);
    };

    const clearAll = reason => {
        for (const shot of [...shots.values()]) {
            if (!shot.committed) abortShot(shot, reason);
            else { destroyShot(shot); shots.delete(shot.serial); }
        }
        if (pending) abortShot(pending, reason);
        pending = null;
        clearVfxJobs();
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive) return;
        frameNo++;
        if (vfxJobs.length) tickVfxJobs();
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
        const tracked = new Set([...shots.values()].map(s => s.arrow?.event).filter(Boolean));
        for (const event of m.events()) if (isArrow(event) && !tracked.has(event)) destroyArrow({ eventId: event.eventId(), event, map: m, gone: false });
    };

    root.ProjectRApolloGigasSlayer = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, beamLevel: BEAM_LEVEL, cardLevel, config,
        isPending: () => !!pending,
        getPending: () => pending ? { serial: pending.serial, instanceId: pending.instanceId, level: pending.level, phase: pending.phase, framesLeft: pending.framesLeft } : null,
        getShots: () => [...shots.values()].map(s => ({ serial: s.serial, level: s.level, phase: s.phase, committed: s.committed, framesLeft: s.framesLeft, age: s.age, aim: s.aim, aim0: s.aim0 })),
        getArrow: () => { const s = [...shots.values()].find(x => x.arrow && !x.arrow.gone); return s ? { serial: s.serial, eventId: s.arrow.eventId, degree: s.arrow.degree, width: s.arrow.width, age: s.arrow.age, travelled: s.arrow.travelled } : null; },
        getBeam: () => { const s = [...shots.values()].find(x => x.beam); return s ? { serial: s.serial, degree: s.beam.degree, head: s.beam.head, limit: s.beam.limit, sampled: s.beam.sampled, done: s.beam.done, committed: s.committed, width: s.cfg.beamWidth,
            targets: [...s.targets.values()].map(r => ({ eventId: r.eventId, hits: r.hits, damage: r.damage, weak: r.weak, wound: r.wound, stopFrames: r.stopFrames })) } : null; },
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getHitLog: () => hitLog.map(h => ({ ...h })), clearHitLog: () => { hitLog.length = 0; },
        getActiveVfxJobs: () => vfxJobs.map(job => ({ frames: job.frames, notes: job.notes.slice(), anchors: (job.anchors || []).slice() }))
    });
})();
