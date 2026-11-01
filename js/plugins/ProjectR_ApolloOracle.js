/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「神託」(設計ID 14 / apollo_oracle) Lv1〜3: 次の敵の攻撃を予測して予告線を出す。Lv2で敵だけ1秒スロー(時計の演出)。Lv3で次の通常攻撃のダメージが2倍。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_CombatOcclusion
 * @base ProjectR_GodSummonManager
 * @base ProjectR_PresentationVfx
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 *
 * @param UseSoundEffect
 * @text 神託の効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「ニュータイプみたいな音」。専用音が無いのでRTPのStarlightを仮に当てています。
 * @type string
 * @default Starlight
 *
 * @param PredictSoundEffect
 * @text 予告線が出たときの効果音(RTPのSE名。空なら鳴らさない)
 * @desc 仮のRTP音(Sound2)。
 * @type string
 * @default Sound2
 *
 * @help
 * ProjectR_ApolloOracle.js
 *
 * 新カード「神託」(ワークブック「カード一覧」のCard ID 14)。ランタイムIDは apollo_oracle。Apollo / 特殊 / 強力 / 最大3枚 / 最大Lv3 / Cooldown 3秒 / その他(狙いなし = instant)/ 壁越え いいえ。
 * 数値はすべて data/ProjectR_CardBalance.json(開発用エディタ F6)にあります。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: 次の敵の攻撃を予測する。
 *   Lv2: 1秒間スローになる。(自分は含まない)
 *   Lv3: 次の通常攻撃のダメージが2倍になる。
 *   演出: 後ろにApolloが召喚され指をはじく / 主人公は何もしない / 指をはじくと同時に光の粒子 / Lv2以降は神の後ろに時計が出る(1秒で一周)/ 金 / 音「ニュータイプみたいな音」。
 *
 * 【実装(累積レベル)】
 *   使った瞬間に消費(instant)。
 *   ・Lv1(予測): 使った時点で飛んでいなかった「次の敵の攻撃」を、predictSeconds(5秒)の間、待ち受ける。敵が撃った弾(Hendrixの標準で作られた、敵の弾のEvent)が現れた瞬間に、
 *     その弾の進行方向へ予告線(金色。predictLengthTiles = 12マスまで。壁で止まる)を出し、弾が消えるまで追従して出し続ける。予告は「次の1回」だけ(その後の攻撃は予告しない)。
 *     予告の前に時間切れなら何も起きない(カードは消費済み)。敵の弾以外の攻撃(接触・近接)の予兆は、現行の敵AIに存在しないため対象外(未解決。API notifyAttack で、将来の敵AIが予兆を渡せる)。
 *   ・Lv2(スロー): 使ってから slowSeconds(1秒)の間、敵Eventと敵の弾の移動速度を slowFactor(x0.5)にする(主人公・仲間・味方の弾は含まない)。Apolloの後ろに時計の絵(1秒で一周)を出す。
 *     敵のAIの攻撃の間隔(クールダウン)は変わらない(移動・弾の速さだけ)。
 *   ・Lv3(次の通常攻撃x2): 次の通常の剣/銃の攻撃(1回)の最終ダメージを x2。hitSeconds(10秒)以内に当たらなければ消える。
 *     武器ヒット強化の枠(CardModifiers)は1つだけなので、すでに他の強化(絶など)が掛かっている場合は、その倍率にx2を掛けて重ねる(合成は積。監査文書 B13「3つの合成順は未定義」の仮の決め)。
 *
 * 【仮の決め(ワークブックに無い部分)】
 *   ・予測の待ち受けは5秒・予告線は12マス・「次の敵の攻撃」= 使った後に最初に現れた敵の弾。スローはx0.5(Hermesの鈍足と同じ)。通常攻撃x2の有効期限は10秒。
 *   ・音は専用音が無く、RTPの Starlight / Sound2 で代用。時計・予告線の絵は自作のDEV素材(`tools/gen_dev_a7_assets.cjs oracle`)。
 *
 * API: ProjectRApolloOracle
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / getState() / getTelegraphs() / notifyAttack(spec) / isEnemyProjectile(event) / getLastResult() / getTempObjectCount()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_oracle";
    const BONUS_ID = "apollo_oracle";
    const SLOW_ID = "apollo_oracle";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const EPSILON = 1e-8;
    const MAX_TELEGRAPHS = 6;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloOracle") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
    const rad = d => d * Math.PI / 180;
    const normalize = d => ((d % 360) + 360) % 360;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const modifiers = () => root.ProjectRCardModifiers;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const playSe = (key, fallback, volume = 80, pitch = 100) => { try { const name = String(params[key] === undefined ? fallback : params[key]).trim(); if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    const stopNote = n => { if (n) { try { root.ProjectRPresentationVfx?.stop?.(n); } catch (_error) { /* 表示のみ */ } } };

    const SHEET = (file, fps, rows = 2, columns = 4) => Object.freeze({ file: "Animation/" + file, rows, columns, fps });
    try {
        const vfx = root.ProjectRPresentationVfx;
        vfx?.register?.("apollo_oracle.sparkle", { library: "ProjectR_A7_Oracle_Sparkle", sheet: SHEET("ProjectR_A7_Oracle_Sparkle", 20), anchor: "target", scale: 100, opacity: 255, offsetY: -20, blend: "Add" });
        vfx?.register?.("apollo_oracle.clock", { library: "ProjectR_A7_Oracle_Clock", sheet: SHEET("ProjectR_A7_Oracle_Clock", 8), anchor: "target", loop: "infinite", scale: 100, opacity: 235, offsetY: -24, blend: "Add" });
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
            const c = { level, predict: Number(e.oraclePredict) === 1, predictSeconds: num(tune("predictSeconds")), length: num(tune("predictLengthTiles")),
                slow: Number(e.slowSeconds) > 0, slowSeconds: Number(e.slowSeconds) > 0 ? num(e.slowSeconds) : 0, slowFactor: Number(e.slowSeconds) > 0 ? num(e.slowFactor) : 1,
                bonus: Number(e.hitMultiplier) > 1, bonusMultiplier: Number(e.hitMultiplier) > 1 ? num(e.hitMultiplier) : 1, bonusSeconds: Number(e.hitMultiplier) > 1 ? num(e.hitSeconds) : 0 };
            c.predictFrames = Math.max(1, Math.round(c.predictSeconds * 60)); c.slowFrames = Math.round(c.slowSeconds * 60);
            const ok = c.predictSeconds > 0 && c.length > 0 && (!c.slow || (c.slowSeconds > 0 && c.slowFactor > 0 && c.slowFactor <= 1)) && (!c.bonus || (c.bonusMultiplier > 1 && c.bonusSeconds > 0));
            return ok ? Object.freeze(c) : null;
        } catch (_error) { return null; }
    };

    // ---------- 状態(実行時のみ。セーブしない) ----------
    let state = null; // { serial, level, cfg, framesLeft(予測の待ち受け), slowLeft, seen:Set, predictedDone, telegraphs:Map, slowed:Set, clockNote, summonDefinition, bonus }
    let serial = 0, planned = null, lastResult = null;
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 80) log.shift(); };
    const slowedEvents = new Set();

    // ---------- 敵の弾 ----------
    const isEnemyProjectile = event => {
        if (!event || event._erased || !event.event) return false;
        const data = event.event?.(), n = String(data?.note || "");
        if (!data || n.includes("<enemy>")) return false;
        if (event._inheritedEnemyName) return true;
        const m = n.match(/<attacker:\s*(.+?)>/i);
        return !!m && !/^(player|actor)/i.test(m[1].trim());
    };
    const isEnemy = event => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>");
    const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const headingOf = event => {
        if (Number.isFinite(event._rotation) && event._rotation !== 0) return normalize(event._rotation);
        const dir = event.direction?.() ?? event._direction;
        return { 8: 0, 6: 90, 2: 180, 4: 270 }[dir] ?? 180;
    };
    const pathLength = (from, degree, length) => {
        const ux = Math.sin(rad(degree)), uy = -Math.cos(rad(degree));
        const occ = occlusion();
        let limit = length;
        try {
            const hit = occ?.firstBlockerBetween?.(from, { x: from.x + ux * length, y: from.y + uy * length }, { mode: "combat", footprint: [{ x: -0.05, y: -0.05 }, { x: 0.05, y: -0.05 }, { x: 0.05, y: 0.05 }, { x: -0.05, y: 0.05 }] });
            if (hit && Number.isFinite(hit.distance)) limit = Math.min(limit, hit.distance);
        } catch (_error) { /* 壁の判定ができなければ全長 */ }
        return Math.max(0, limit);
    };

    // ---------- 予告線(表示だけ) ----------
    const createLine = (cfg) => {
        try {
            if (typeof Sprite === "undefined" || typeof Bitmap === "undefined") return null;
            const scene = SceneManager._scene;
            if (!scene || typeof scene.addChild !== "function") return null;
            const tile = map()?.tileWidth?.() || 48, w = Math.max(8, Math.round(cfg.length * tile));
            const bitmap = new Bitmap(w, 10);
            const ctx = bitmap._context;
            if (ctx) { const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(255,225,120,0.95)"); g.addColorStop(1, "rgba(255,225,120,0.1)"); ctx.fillStyle = g; ctx.fillRect(0, 2, w, 6); bitmap._baseTexture?.update?.(); }
            else bitmap.fillRect(0, 2, w, 6, "rgba(255,225,120,0.7)");
            const sprite = new Sprite(bitmap);
            sprite.anchor.set(0, 0.5);
            scene.addChild(sprite);
            return sprite;
        } catch (_error) { return null; }
    };
    const placeLine = (t) => {
        const sprite = t.sprite;
        if (!sprite) return;
        try {
            const m = map(), tw = m.tileWidth?.() || 48, th = m.tileHeight?.() || 48;
            sprite.x = (t.x - m.displayX()) * tw; sprite.y = (t.y - m.displayY()) * th;
            sprite.rotation = rad(t.degree - 90);
            sprite.scale.x = Math.min(1, t.length / Math.max(0.01, state ? state.cfg.length : t.length));
        } catch (_error) { /* 表示のみ */ }
    };
    const removeTelegraph = (id, reason) => {
        const t = state?.telegraphs.get(id);
        if (!t) return;
        state.telegraphs.delete(id);
        try { t.sprite?.parent?.removeChild?.(t.sprite); t.sprite?.destroy?.({ children: true }); } catch (_error) { /* 表示のみ */ }
        note({ type: "telegraphEnd", id, reason });
    };
    const addTelegraph = (id, spec) => {
        if (!state || state.telegraphs.size >= MAX_TELEGRAPHS) return null;
        const t = { id, x: spec.x, y: spec.y, degree: normalize(spec.degree), length: pathLength({ x: spec.x, y: spec.y }, spec.degree, state.cfg.length), age: 0, eventId: spec.eventId ?? null, sprite: createLine(state.cfg), source: spec.source || "projectile", framesLeft: spec.framesLeft ?? 0 };
        state.telegraphs.set(id, t);
        placeLine(t);
        state.predicted++;
        playSe("PredictSoundEffect", "Sound2", 70, 100);
        note({ type: "predict", id, x: t.x, y: t.y, degree: t.degree, length: t.length, source: t.source });
        return t;
    };

    // ---------- 発動(instant。使った瞬間に消費) ----------
    const activate = context => {
        if (!deck.isCardBattleActive()) return failure("battleInactive");
        if (!balanceReady()) return failure("balanceUnavailable");
        const level = cardLevel(), cfg = config(level);
        if (!cfg) return failure("balanceInvalid");
        planned = { level, cfg, definition: context?.definition };
        return { ok: true };
    };
    const previousInstant = deck.getActivationHandler("instant");
    deck.registerActivationHandler("instant", context => context.definition.cardId === CARD ? activate(context) : previousInstant ? previousInstant(context) : { ok: true });

    const armBonus = cfg => {
        const m = modifiers();
        const existing = m?.getWeaponHitBonus?.();
        const multiplier = (existing?.multiplier ?? 1) * cfg.bonusMultiplier;
        const seconds = Math.max(existing?.remaining ?? 0, cfg.bonusSeconds);
        const armed = m?.armWeaponHitBonus?.({ id: existing?.id ?? BONUS_ID, multiplier, seconds, source: existing?.source ? existing.source + "+" + CARD : CARD });
        return { ok: armed?.ok === true, multiplier, seconds, stackedOn: existing?.id ?? null };
    };
    const resolve = (plan, activation) => {
        if (state) endState("renewed");
        const cfg = plan.cfg, seen = new Set(map().events().filter(e => e && isEnemyProjectile(e)).map(e => e.eventId()));
        state = { serial: ++serial, level: plan.level, cfg, framesLeft: cfg.predict ? cfg.predictFrames : 0, slowLeft: cfg.slow ? cfg.slowFrames : 0, seen, predicted: 0, predictDone: false, telegraphs: new Map(), clockNote: null, bonus: null, instanceId: activation?.instanceId ?? null, definition: plan.definition };
        try { root.ProjectRGodSummonManager?.perform?.({ definition: plan.definition, aim: false, lifetimeFrames: Math.max(cfg.slowFrames, 60) + 30 }, () => ({ ok: true })); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("FingerSnap", { source: "card", detail: CARD }); } catch (_error) { /* 表示のみ */ }
        pvPlay("apollo_oracle.sparkle", {});
        playSe("UseSoundEffect", "Starlight", 80, 100);
        if (cfg.bonus) state.bonus = armBonus(cfg);
        if (cfg.slow) { state.clockWait = 12; }
        lastResult = { ok: true, consumed: true, serial: state.serial, level: plan.level, instanceId: state.instanceId, predict: cfg.predict, slow: cfg.slow, bonus: state.bonus, predicted: 0 };
        note({ type: "start", serial: state.serial, level: plan.level });
    };
    const _requestUseCard = deck.requestUseCard;
    deck.requestUseCard = function() {
        planned = null;
        let result;
        try { result = _requestUseCard.apply(this, arguments); }
        catch (error) { planned = null; throw error; }
        const plan = planned;
        planned = null;
        if (!plan) return result;
        if (result?.ok === true && result.cardId === CARD) { try { resolve(plan, result); } catch (error) { lastResult = { ok: false, reason: "error:" + String(error?.message || error) }; } }
        else lastResult = { ok: false, consumed: false, reason: result?.detail || result?.reason || "notConsumed" };
        return result;
    };

    // ---------- 毎フレーム ----------
    const slowAll = () => {
        const m = modifiers(), cfg = state.cfg;
        for (const event of map().events()) {
            if (!event || event._erased || !(isEnemy(event) || isEnemyProjectile(event))) continue;
            if (!slowedEvents.has(event)) { slowedEvents.add(event); }
            try { m?.setCharacterSpeedFactor?.(event, SLOW_ID, cfg.slowFactor); } catch (_error) { /* 表示のみ */ }
        }
    };
    const clearSlow = () => {
        const m = modifiers();
        for (const event of slowedEvents) { try { m?.clearCharacterSpeedFactor?.(event, SLOW_ID); } catch (_error) { /* 表示のみ */ } }
        slowedEvents.clear();
    };
    const updateClock = () => {
        if (!state.cfg.slow || state.clockNote || state.slowLeft <= 0) return;
        const apollo = root.ProjectRGodSummonVisual?.getTransientEventId?.("apollo") || 0;
        if (apollo) { const r = pvPlay("apollo_oracle.clock", { eventId: apollo }); state.clockNote = r?.note || null; state.clockEvent = apollo; }
        else if (--state.clockWait <= 0) state.clockWait = 0;
    };
    const tick = () => {
        const s = state;
        if (!s) return;
        const cfg = s.cfg, m = map();
        // 予測: 使った後に最初に現れた敵の弾
        if (cfg.predict && !s.predictDone && s.framesLeft > 0) {
            s.framesLeft--;
            for (const event of m.events()) {
                if (!event || s.seen.has(event.eventId()) || !isEnemyProjectile(event)) continue;
                const c = eventCenter(event);
                s.seen.add(event.eventId());
                addTelegraph(event.eventId(), { x: c.x, y: c.y, degree: headingOf(event), eventId: event.eventId() });
                s.predictDone = true;
                break;
            }
            if (s.framesLeft <= 0 && !s.predictDone) { s.predictDone = true; s.lapsed = true; note({ type: "predictLapsed", serial: s.serial }); }
        }
        // 予告線の追従(弾が消えたら外す)
        for (const [id, t] of [...s.telegraphs]) {
            t.age++;
            if (t.source === "projectile") {
                const e = m.event(id);
                if (!e || e._erased) { removeTelegraph(id, "projectileGone"); continue; }
                const c = eventCenter(e);
                t.x = c.x; t.y = c.y; t.degree = headingOf(e); t.length = pathLength({ x: c.x, y: c.y }, t.degree, cfg.length);
            } else if (--t.framesLeft <= 0) { removeTelegraph(id, "expired"); continue; }
            placeLine(t);
        }
        // スロー
        if (cfg.slow && s.slowLeft > 0) { s.slowLeft--; slowAll(); updateClock(); if (s.slowLeft <= 0) { clearSlow(); stopNote(s.clockNote); s.clockNote = null; note({ type: "slowEnd", serial: s.serial }); } }
        if (s.predictDone && s.slowLeft <= 0 && !s.telegraphs.size) { s.done = true; }
    };
    const endState = reason => {
        const s = state;
        if (!s) return;
        for (const id of [...s.telegraphs.keys()]) removeTelegraph(id, reason);
        clearSlow(); stopNote(s.clockNote);
        state = null;
        lastResult = lastResult && lastResult.serial === s.serial ? { ...lastResult, ended: reason, predicted: s.predicted, lapsed: !!s.lapsed } : lastResult;
        note({ type: "end", serial: s.serial, reason });
    };
    const clearAll = reason => {
        endState(reason);
        try { const b = modifiers()?.getWeaponHitBonus?.(); if (b && String(b.id) === BONUS_ID) modifiers().clearWeaponHitBonus(reason); } catch (_error) { /* 表示のみ */ }
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || !state) return;
        if (this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        try { tick(); if (state && state.done) endState("finished"); } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };

    // 将来の敵AIが「予兆」を渡すための窓口(現行の敵AIには予兆が無い)。使った後の最初の1回だけ予告線にする。
    const notifyAttack = spec => {
        if (!state || !state.cfg.predict || state.predictDone || !spec || !Number.isFinite(spec.x) || !Number.isFinite(spec.y) || !Number.isFinite(spec.degree)) return { ok: false, reason: "notWaiting" };
        const frames = Math.max(1, Math.round(num(spec.seconds) * 60) || 60);
        state.predictDone = true;
        return { ok: !!addTelegraph("n" + (++state.predicted), { x: spec.x, y: spec.y, degree: spec.degree, source: "notify", framesLeft: frames }) };
    };

    root.ProjectRApolloOracle = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, cardLevel, config, isEnemyProjectile, notifyAttack,
        getState: () => state ? { serial: state.serial, level: state.level, predictFramesLeft: state.framesLeft, slowFramesLeft: state.slowLeft, predicted: state.predicted, predictDone: state.predictDone, lapsed: !!state.lapsed, clock: !!state.clockNote, bonus: state.bonus ? { ...state.bonus } : null, slowed: slowedEvents.size } : null,
        getTelegraphs: () => state ? [...state.telegraphs.values()].map(t => ({ id: t.id, x: t.x, y: t.y, degree: t.degree, length: t.length, age: t.age, source: t.source, hasSprite: !!t.sprite })) : [],
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLog: () => log.map(e => ({ ...e })),
        getTempObjectCount: () => { const c = { lines: state ? [...state.telegraphs.values()].filter(t => t.sprite).length : 0, clock: state?.clockNote ? 1 : 0, slowed: slowedEvents.size }; c.total = c.lines + c.clock; return c; }
    });
})();
