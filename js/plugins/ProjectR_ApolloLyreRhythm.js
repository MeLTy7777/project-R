/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「竪琴」(設計ID 10 / apollo_lyre_rhythm) Lv1〜3: 3秒間に音符(火力・速度・ヒール・病)が流れ、攻撃ボタンをタイミングよく押した音符の効果を最大3回得る。Lv2で全部同じなら画面全体+クレンズ、Lv3で音符が5周。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_ApolloStatus
 * @base ProjectR_PartyRoster
 * @base ProjectR_GodSummonManager
 * @base ProjectR_PresentationVfx
 * @base ProjectR_CombatPresence
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_ApolloStatus
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CutIn
 * @orderAfter ProjectR_CharacterPresentation
 * @orderAfter ProjectR_GunSystem
 * @orderAfter ProjectR_SwordSystem
 *
 * @param NoteSoundEffect
 * @text 音符を選んだときの効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「竪琴の演奏」。専用音が無いのでRTPのChime2を音程を変えて仮に当てています(音符の種類ごとに音程が違い、続けて押すと演奏がつながって聞こえる)。
 * @type string
 * @default Chime2
 *
 * @param MissSoundEffect
 * @text タイミングを外したときの効果音(RTPのSE名。空なら鳴らさない)
 * @desc 仮のRTP音(Cancel2)。
 * @type string
 * @default Cancel2
 *
 * @help
 * ProjectR_ApolloLyreRhythm.js
 *
 * 新カード「竪琴」(ワークブック「カード一覧」のCard ID 10)。ランタイムIDは apollo_lyre_rhythm。旧「リラの支援/竪琴の鎮静」(apollo_lyre_calm)は置き換えず共存。
 * Apollo / 特殊 / 特殊 / 最大2枚 / 最大Lv3 / Cooldown 4秒 / その他(狙いなし = instant)/ 壁越え はい / 半径5マス。数値は data/ProjectR_CardBalance.json(開発用エディタ F6)。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: 発動後、プレイキャラクターの下に音符が一定間隔で流れる。(火力アップ10%・8秒 / スピードアップ10%・8秒 / 即時ヒール100 + リジェネ3秒間に100ヒール / 敵に病状態付与の音符)
 *        3秒間に各音符が順番に3回流れてくる。攻撃ボタンをタイミングよく押すたびにその音符の効果を得られる。同じ音符を選択すると効果が重なる。音符は全部で3回押せる。
 *        音符を選択した瞬間に効果を得られる。同じ音符を押すと効果時間が更新される。病状態 = -10%攻撃力ダウン・被ダメージ5%増加・弱点属性被ダメージ3%増加。
 *   Lv2: すべて同じ音符を選ぶと、その効果の範囲が画面内すべてになり、味方の異常状態を解除するクレンズ効果も追加する。
 *   Lv3: 音符の流れる量が、3秒間に順番に5回に増加。
 *   成功: 各音符をタイミングよく押す / 失敗: タイミングを外す。演出: 竪琴を持った Apollo が後ろに / 音符を選ぶたびに演奏・指揮者のように手を振る / 選ぶたびに範囲が水面の波のように揺らぎ、音符の効果に対応した色の波紋 / 金色と各音符の色。
 *
 * 【実装】
 *   ・使った瞬間に消費(instant)。3秒(rhythmSeconds)の「演奏」が始まる。音符は 火力 → 速度 → ヒール → 病 の順で、これを rounds 周(Lv1〜2は3周 = 12個、Lv3は5周 = 20個)、
 *     3秒に等間隔で並べる(0.25秒 / Lv3は0.15秒ごとに1つが「ライン」(プレイヤーの足元の位置)に届く)。最初の音符は発動から noteLeadSeconds(0.6秒)後に届く。
 *   ・攻撃ボタン(Hendrixの攻撃入力 = 共通イベント1)を押すと、その瞬間に最も近い音符(前後 hitWindowSeconds = 0.1秒以内。音符の間隔の半分を超えない)を選ぶ。押すたびに1回を使い(最大3回 = maxPresses)、
 *     タイミングを外した押下も1回に数える(効果なし)。演奏中は、押した攻撃入力は音符の選択に使われ、剣・銃は動かない(回数を使い切ると、あとは通常の攻撃へ戻る)。
 *   ・選んだ瞬間の効果(半径5マスの味方 = 主人公+出撃中の仲間 / 病は半径5マスの敵):
 *       火力: 攻撃力・魔力 +10% x 重なり(8秒。押すたびに時間を更新)。速度: 移動速度 +10% x 重なり(8秒。主人公のみ)。
 *       ヒール: 即時100 + 3秒かけて100(重なりごとに加算)。病: 敵に病(5秒。攻撃力 -10% x 重なり・被ダメージ +5% x 重なり・弱点 +3% x 重なり)。
 *   ・Lv2: 3回とも同じ音符で、3回目を選んだ瞬間、その3回目の効果の範囲が「画面内すべて」になり、味方の異常状態を解除する(クレンズ)。
 *   ・見た目: プレイヤーの足元から右へ並ぶ音符が左のラインへ流れる(色: 火力=赤 / 速度=青 / ヒール=緑 / 病=紫)。選ぶたびに、その音符の色の波紋(水面の波)が半径5マスへ広がり、Apolloが演奏し、主人公は手を振る(ArmSweep)。
 *
 * 【仮の決め(ワークブックに無い部分)】
 *   ・「3秒間に各音符が順番に3回」は「4種類を順番に3周 = 12個」と読んだ(押せるのは3回)。Lv3は5周 = 20個(押せる回数は3回のまま)。
 *   ・効果の「重なり」は加算(火力 1 + 0.1 x n、病 1 + 0.05 x n など)。同じ音符を押すと時間は更新。重なりの上限は押せる回数(3)なので、上限は自然に3。監査文書 §10 B9 は未確定のまま。
 *   ・病の持続は5秒(ワークブックに無い)。クレンズの「異常状態」= 行動制限(restriction)を持つ・能力を下げる特徴を持つ・睡眠(32)・病(33)のState(死亡(1)・精神安定(34)は除く)。
 *   ・タイミングを外した押下も1回に数える。回数を使い切ったあと・演奏が終わったあとの攻撃は通常どおり。
 *   ・音は専用音が無く、RTPの Chime2 を音程違いで代用(火力100・速度112・ヒール126・病89)。
 *
 * API: ProjectRApolloLyreRhythm
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / getSession() / getNotes() / press(source?) / getResults() / getBuffs() / getLastResult() / getUi() / getTempObjectCount() / KINDS
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "apollo_lyre_rhythm";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const KINDS = Object.freeze(["attack", "speed", "heal", "plague"]);
    const COLORS = Object.freeze({ attack: "#ff5a5a", speed: "#5a9bff", heal: "#5ad28a", plague: "#b068e8" });
    const GLYPH = Object.freeze({ attack: "力", speed: "速", heal: "癒", plague: "病" });
    const PITCH = Object.freeze({ attack: 100, speed: 112, heal: 126, plague: 89 });
    const ATTACK_ID = "lyre_attack", PLAGUE_ID = "lyre_plague", SPEED_ID = "apollo_lyre_speed";
    const EPSILON = 1e-8;
    const MAX_NOTES = 40;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloLyreRhythm") : {};

    const balance = () => root.ProjectRCardBalance;
    const balanceReady = () => !!balance()?.isReady?.() && !!balance().hasCard(CARD);
    const effectsForLevel = level => balance().effects(CARD, level);
    const tune = key => balance().constant(CARD, key);
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const num = v => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const roster = () => root.ProjectRPartyRoster;
    const status = () => root.ProjectRApolloStatus;
    const modifiers = () => root.ProjectRCardModifiers;
    const leader = () => (typeof $gameParty !== "undefined" ? $gameParty.leader() : null);
    const playSe = (key, fallback, volume = 80, pitch = 100) => { try { const name = String(params[key] === undefined ? fallback : params[key]).trim(); if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };
    const stopNote = n => { if (n) { try { root.ProjectRPresentationVfx?.stop?.(n); } catch (_error) { /* 表示のみ */ } } };

    const SHEET = (file, fps) => Object.freeze({ file: "Animation/" + file, rows: 2, columns: 4, fps });
    try {
        const vfx = root.ProjectRPresentationVfx;
        for (const [kind, name] of [["gold", "Gold"], ["attack", "Red"], ["speed", "Blue"], ["heal", "Green"], ["plague", "Purple"]]) {
            vfx?.register?.("apollo_lyre.wave." + kind, { library: "ProjectR_A7_Lyre_Wave_" + name, sheet: SHEET("ProjectR_A7_Lyre_Wave_" + name, 12), anchor: "target", area: true, frame: 192, frameTiles: 4, scale: 100, opacity: 190, offsetY: 0, blend: "Add" });
        }
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
            const c = { level, radius: num(tune("radiusTiles")), rhythmSeconds: num(tune("rhythmSeconds")), lead: num(tune("noteLeadSeconds")), rounds: Math.floor(num(e.noteRounds)), maxPresses: Math.floor(num(tune("maxPresses"))),
                hitWindow: num(tune("hitWindowSeconds")), buffSeconds: num(tune("buffSeconds")), attackBonus: num(tune("lyreAttackBonus")), speedBonus: num(tune("lyreSpeedBonus")),
                healInstant: num(tune("lyreHealInstant")), healRegen: num(tune("lyreHealRegenTotal")), healRegenSeconds: num(tune("lyreHealRegenSeconds")),
                plagueSeconds: num(tune("lyrePlagueSeconds")), plagueAttack: num(tune("lyrePlagueAttackDown")), plagueTaken: num(tune("lyrePlagueDamageTaken")), plagueWeak: num(tune("lyrePlagueWeakness")),
                screenWide: Number(e.screenWide) === 1, cleanse: Number(e.cleanse) === 1 };
            c.notes = c.rounds * KINDS.length;
            c.interval = c.rhythmSeconds / Math.max(1, c.notes);
            c.windowFrames = Math.max(1, Math.round(Math.min(c.hitWindow, c.interval * 0.5 - 0.01) * 60));
            c.intervalFrames = c.interval * 60; c.leadFrames = Math.round(c.lead * 60); c.totalFrames = Math.round(c.rhythmSeconds * 60) + c.leadFrames;
            const ok = c.radius > 0 && c.rhythmSeconds > 0 && c.lead >= 0 && c.rounds >= 1 && c.notes <= MAX_NOTES && c.maxPresses >= 1 && c.hitWindow > 0 && c.buffSeconds > 0 && c.attackBonus >= 0 && c.speedBonus >= 0
                && c.healInstant >= 0 && c.healRegen >= 0 && c.healRegenSeconds > 0 && c.plagueSeconds > 0 && c.plagueAttack >= 0 && c.plagueTaken >= 0 && c.plagueWeak >= 0 && c.windowFrames >= 1;
            return ok ? Object.freeze(c) : null;
        } catch (_error) { return null; }
    };

    // ---------- 演奏(実行時のみ。セーブしない) ----------
    let session = null; // { serial, level, cfg, frame, notes, presses, results, stacks, buffs, regens, definition, ui, notesVfx }
    let serial = 0, planned = null, lastResult = null;
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 120) log.shift(); };
    const buffs = { attack: null, speed: null }; // { stacks, remaining }
    const regens = new Map(); // key -> { perFrame, remaining, rate, acc }
    const stacks = { attack: 0, speed: 0, heal: 0, plague: 0 };
    const plagueTargets = new Set();

    // ---------- 発動(instant。使った瞬間に消費) ----------
    const activate = context => {
        if (!deck.isCardBattleActive()) return failure("battleInactive");
        if (!balanceReady()) return failure("balanceUnavailable");
        if (!status()) return failure("statusUnavailable");
        const level = cardLevel(), cfg = config(level);
        if (!cfg) return failure("balanceInvalid");
        planned = { level, cfg, definition: context?.definition };
        return { ok: true };
    };
    const previousInstant = deck.getActivationHandler("instant");
    deck.registerActivationHandler("instant", context => context.definition.cardId === CARD ? activate(context) : previousInstant ? previousInstant(context) : { ok: true });

    const buildNotes = cfg => Array.from({ length: cfg.notes }, (_, i) => ({ index: i, kind: KINDS[i % KINDS.length], arrive: cfg.leadFrames + Math.round(i * cfg.intervalFrames), state: "flowing", pressedAt: null }));
    const resolve = (plan, activation) => {
        if (session) endSession("renewed");
        const cfg = plan.cfg;
        session = { serial: ++serial, level: plan.level, cfg, frame: 0, notes: buildNotes(cfg), presses: 0, results: [], definition: plan.definition, instanceId: activation?.instanceId ?? null, ui: null, waves: [], cleansed: 0 };
        try { root.ProjectRGodSummonManager?.perform?.({ definition: plan.definition, aim: false, lifetimeFrames: cfg.totalFrames + 20 }, () => ({ ok: true })); } catch (_error) { /* 表示のみ */ }
        createUi(session);
        lastResult = { ok: true, consumed: true, serial: session.serial, level: plan.level, notes: cfg.notes, rounds: cfg.rounds, instanceId: session.instanceId, presses: 0, results: [] };
        note({ type: "start", serial: session.serial, level: plan.level });
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

    // ---------- 効果 ----------
    const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = event => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>");
    const screenRect = () => { const m = map(); const w = (typeof Graphics !== "undefined" ? Graphics.width : 816) / (m.tileWidth?.() || 48), h = (typeof Graphics !== "undefined" ? Graphics.height : 624) / (m.tileHeight?.() || 48); return { x0: m.displayX(), y0: m.displayY(), x1: m.displayX() + w, y1: m.displayY() + h }; };
    const inScreen = (p, r) => p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1;
    const positionOf = m => {
        if (m.key === "player") { const p = $gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; }
        const e = m.eventId ? map()?.event(m.eventId) : null;
        if (e && !e._erased) return eventCenter(e);
        return Number.isFinite(m.x) && Number.isFinite(m.y) ? { x: m.x, y: m.y } : null;
    };
    const targetsFor = (cfg, wide) => {
        const origin = $gamePlayer.centerPositionPoint(), rect = wide ? screenRect() : null;
        const near = p => !!p && (wide ? inScreen(p, rect) : Math.hypot(p.x - origin.x, p.y - origin.y) <= cfg.radius + EPSILON);
        return { members: roster().members().filter(m => m.hp > 0 && near(positionOf(m))), enemies: map().events().filter(e => isEnemy(e) && hpOf(e.eventId()) > 0 && near(eventCenter(e))) };
    };
    const healMember = (m, amount) => {
        if (!(amount > 0)) return 0;
        if (m.key === "player") { const a = leader(); if (!a || !(a.hp > 0)) return 0; const before = a.hp, applied = Math.min(amount, Math.max(0, a.mhp - a.hp)); if (applied > 0) a.gainHp(applied); return a.hp - before; }
        const api = root.ProjectRPartyCombat, member = api?.members?.().find(x => x.actorId === m.actorId);
        if (!member || member.down) return 0;
        const before = member.hp, result = api.healAlly(m.actorId, amount);
        return result?.ok ? result.hp - before : 0;
    };
    const abnormalState = id => {
        if (id === 1 || id === 34) return false;
        const st = typeof $dataStates !== "undefined" ? $dataStates[id] : null;
        if (!st) return false;
        if (id === 32 || id === 33 || st.restriction > 0) return true;
        return (st.traits || []).some(t => (t.code === 21 || t.code === 22) && t.value < 1);
    };
    const cleanse = () => {
        let removed = 0;
        for (const actor of ($gameParty?.members?.() || [])) for (const id of [...(actor._states || [])]) if (abnormalState(id)) { actor.removeState(id); removed++; }
        return removed;
    };
    const applyEffect = (s, kind, wide) => {
        const cfg = s.cfg, who = targetsFor(cfg, wide), info = { kind, wide, members: who.members.map(m => m.key), enemies: who.enemies.map(e => e.eventId()) };
        stacks[kind]++;
        const n = stacks[kind];
        if (kind === "attack") {
            for (const m of who.members) { if (m.key === "player") { status().apply("player", ATTACK_ID, { seconds: cfg.buffSeconds, attackRate: 1 + cfg.attackBonus * n, source: CARD }); info.attackRate = 1 + cfg.attackBonus * n; } }
            buffs.attack = { stacks: n, remaining: cfg.buffSeconds };
        } else if (kind === "speed") {
            if (who.members.some(m => m.key === "player")) { modifiers()?.setMoveSpeedFactor?.(SPEED_ID, 1 + cfg.speedBonus * n, cfg.buffSeconds); info.speed = 1 + cfg.speedBonus * n; }
            buffs.speed = { stacks: n, remaining: cfg.buffSeconds };
        } else if (kind === "heal") {
            info.healed = 0;
            for (const m of who.members) {
                info.healed += healMember(m, cfg.healInstant);
                const rate = cfg.healRegen / cfg.healRegenSeconds * n; // 秒間(重なりごとに加算)
                regens.set(m.key, { rate, remaining: cfg.healRegenSeconds * 60, acc: 0, healed: regens.get(m.key)?.healed ?? 0 });
            }
        } else if (kind === "plague") {
            for (const e of who.enemies) {
                const key = status().targetKeyOfEvent(e.eventId());
                const r = status().apply(key, PLAGUE_ID, { seconds: cfg.plagueSeconds, damageTaken: 1 + cfg.plagueTaken * n, weakness: 1 + cfg.plagueWeak * n, attackRate: Math.max(0.1, 1 - cfg.plagueAttack * n), source: CARD });
                if (r.ok) plagueTargets.add(key);
            }
            info.plagueStacks = n;
        }
        return info;
    };

    // ---------- 押下(攻撃入力) ----------
    const press = (source = "attack") => {
        const s = session;
        if (!s || s.presses >= s.cfg.maxPresses || s.frame < 0) return { ok: false, reason: "noSession" };
        // この瞬間に最も近い、まだ使っていない音符(ライン = arrive)
        let best = null;
        for (const n of s.notes) { if (n.state !== "flowing") continue; const d = Math.abs(s.frame - n.arrive); if (d <= s.cfg.windowFrames && (!best || d < best.d)) best = { n, d }; }
        s.presses++;
        const result = { press: s.presses, frame: s.frame, source };
        if (!best) { result.hit = false; result.reason = "timing"; playSe("MissSoundEffect", "Cancel2", 60, 100); }
        else {
            const n = best.n; n.state = "picked"; n.pressedAt = s.frame;
            const picked = s.results.filter(r => r.hit).map(r => r.kind);
            result.hit = true; result.kind = n.kind; result.index = n.index; result.offset = s.frame - n.arrive;
            const same3 = picked.length + 1 === s.cfg.maxPresses && [...picked, n.kind].every(k => k === n.kind);
            const wide = s.cfg.screenWide && same3;
            Object.assign(result, applyEffect(s, n.kind, wide));
            result.wide = wide;
            if (wide && s.cfg.cleanse) { result.cleansed = cleanse(); s.cleansed += result.cleansed; }
            presentPress(s, n, wide);
        }
        s.results.push(result);
        if (lastResult) { lastResult.presses = s.presses; lastResult.results = s.results.map(r => ({ ...r })); }
        note({ type: "press", serial: s.serial, ...result });
        return { ok: true, ...result };
    };
    const presentPress = (s, n, wide) => {
        playSe("NoteSoundEffect", "Chime2", 80, PITCH[n.kind]);
        try { root.ProjectRCharacterPresentation?.request?.("ArmSweep", { source: "card", detail: CARD }); } catch (_error) { /* 表示のみ */ }
        if (s.waves.length < 6) {
            const gold = pvPlay("apollo_lyre.wave.gold", { radiusTiles: wide ? 8 : s.cfg.radius });
            const colored = pvPlay("apollo_lyre.wave." + n.kind, { radiusTiles: wide ? 10 : s.cfg.radius * 0.8 });
            for (const r of [gold, colored]) if (r?.note) s.waves.push({ note: r.note, frames: 60 });
        }
        if (s.ui) s.ui.flash(n.index, n.kind);
    };

    // 攻撃入力の受け口: Hendrixの共通イベント1(攻撃ボタン)を、演奏中は音符の選択に使う。銃・剣は動かない(回数を使い切ったら通常の攻撃へ戻る)。
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    if (typeof Game_Temp !== "undefined") {
        const _reserve = Game_Temp.prototype.reserveCommonEvent;
        Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
            if (session && Number(commonEventId) === attackCommonEventId() && session.presses < session.cfg.maxPresses && session.frame >= 0 && deck.isCardBattleActive()) {
                press("attack");
                return;
            }
            return _reserve.apply(this, arguments);
        };
    }

    // ---------- 音符のUI(プレイヤーの足元を流れる。表示だけ) ----------
    const createUi = s => {
        try {
            if (typeof Sprite === "undefined" || typeof Bitmap === "undefined") return;
            const scene = SceneManager._scene;
            if (!scene || typeof scene.addChild !== "function") return;
            const layer = new Sprite();
            const sprites = s.notes.map(n => {
                const sp = new Sprite(new Bitmap(36, 36));
                const b = sp.bitmap;
                b.drawCircle(18, 18, 16, COLORS[n.kind]);
                b.drawCircle(18, 18, 12, "rgba(0,0,0,0.35)");
                b.fontSize = 18; b.textColor = "#ffffff"; b.drawText(GLYPH[n.kind], 0, 0, 36, 36, "center");
                sp.anchor.set(0.5, 0.5); sp.visible = false; sp.opacity = 0;
                layer.addChild(sp);
                return sp;
            });
            const line = new Sprite(new Bitmap(6, 48)); line.bitmap.fillRect(0, 0, 6, 48, "#ffe9a0"); line.anchor.set(0.5, 0.5); line.opacity = 200; layer.addChild(line);
            scene.addChild(layer);
            s.ui = { layer, sprites, line, flashes: new Map(), flash(index, kind) { this.flashes.set(index, 20); }, destroyed: false };
        } catch (_error) { s.ui = null; }
    };
    const updateUi = s => {
        const ui = s.ui;
        if (!ui || ui.destroyed) return;
        try {
            const px = $gamePlayer.screenX(), py = $gamePlayer.screenY() + 30, cfg = s.cfg, travel = Math.max(1, cfg.leadFrames), speed = 300 / travel; // 発動から noteLeadSeconds 後に最初の音符がラインへ(右300pxから)
            ui.line.x = px; ui.line.y = py;
            for (let i = 0; i < s.notes.length; i++) {
                const n = s.notes[i], sp = ui.sprites[i], dt = n.arrive - s.frame; // ラインまでの残りframe
                const x = px + dt * speed, visible = x > px - 80 && x < px + 330 && n.state !== "picked";
                sp.visible = visible || ui.flashes.has(i); sp.x = n.state === "picked" ? px : x; sp.y = py;
                const f = ui.flashes.get(i);
                if (f !== undefined) { sp.scale.set(1 + (20 - f) * 0.04, 1 + (20 - f) * 0.04); sp.opacity = Math.round(255 * f / 20); if (f <= 1) ui.flashes.delete(i); else ui.flashes.set(i, f - 1); }
                else { sp.scale.set(1, 1); sp.opacity = n.state === "missed" ? 90 : Math.min(255, Math.max(0, 200 - Math.max(0, -dt) * 8)); }
            }
        } catch (_error) { /* 表示のみ */ }
    };
    const destroyUi = s => {
        const ui = s?.ui;
        if (!ui || ui.destroyed) return;
        ui.destroyed = true;
        try { ui.layer.parent?.removeChild?.(ui.layer); ui.layer.destroy?.({ children: true }); } catch (_error) { /* 表示のみ */ }
        s.ui = null;
    };

    // ---------- 時間 ----------
    const endSession = reason => {
        const s = session;
        if (!s) return;
        session = null;
        for (const w of s.waves) stopNote(w.note);
        destroyUi(s);
        lastResult = lastResult && lastResult.serial === s.serial ? { ...lastResult, ended: reason, presses: s.presses, results: s.results.map(r => ({ ...r })) } : lastResult;
        note({ type: "end", serial: s.serial, reason, presses: s.presses });
    };
    const resetEffects = reason => {
        try { status()?.remove?.("player", ATTACK_ID, reason); } catch (_error) { /* 表示のみ */ }
        for (const key of [...plagueTargets]) { try { status()?.remove?.(key, PLAGUE_ID, reason); } catch (_error) { /* 表示のみ */ } }
        plagueTargets.clear(); regens.clear(); buffs.attack = null; buffs.speed = null;
        for (const k of KINDS) stacks[k] = 0;
        try { modifiers()?.clearMoveSpeedFactor?.(SPEED_ID); } catch (_error) { /* 表示のみ */ }
    };
    const tickFrame = () => {
        const s = session;
        if (s) {
            s.frame++;
            for (const n of s.notes) if (n.state === "flowing" && s.frame > n.arrive + s.cfg.windowFrames) n.state = "missed";
            for (const w of [...s.waves]) if (--w.frames <= 0) { stopNote(w.note); s.waves.splice(s.waves.indexOf(w), 1); }
            updateUi(s);
            if (s.frame > s.cfg.totalFrames + 20) endSession("finished");
        }
        // リジェネ
        for (const [key, r] of [...regens]) {
            r.acc += r.rate / 60; r.remaining--;
            const whole = Math.floor(r.acc);
            if (whole >= 1) { const m = roster().members().find(x => x.key === key); r.acc -= whole; if (m && m.hp > 0 && m.hp < m.mhp) r.healed += healMember(m, whole); }
            if (r.remaining <= 0) regens.delete(key);
        }
        // 効果の時間(火力・速度は台帳・CardModifiersが持つ。重なりの数は時間切れで0に戻す)
        for (const k of ["attack", "speed"]) { const b = buffs[k]; if (b) { b.remaining -= 1 / 60; if (b.remaining <= EPSILON) { buffs[k] = null; stacks[k] = 0; } } }
        if (!status()?.has?.("player", ATTACK_ID) && buffs.attack) { buffs.attack = null; stacks.attack = 0; }
        for (const key of [...plagueTargets]) if (!status().has(key, PLAGUE_ID)) plagueTargets.delete(key);
        if (!plagueTargets.size && stacks.plague) stacks.plague = 0;
    };
    const active = () => !!session || regens.size > 0 || buffs.attack || buffs.speed || plagueTargets.size > 0;
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || !active()) return;
        if (this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { endSession("battleInactive"); resetEffects("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { endSession("playerDead"); resetEffects("playerDead"); return; }
        try { tickFrame(); } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
    };
    const clearAll = reason => { endSession(reason); resetEffects(reason); };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { clearAll("battleEnd"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { clearAll("mapSetup"); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { clearAll("load"); return _extract.apply(this, arguments); };

    root.ProjectRApolloLyreRhythm = Object.freeze({
        CARD, KINDS, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, cardLevel, config, press, abnormalState, cleanse,
        getSession: () => session ? { serial: session.serial, level: session.level, frame: session.frame, presses: session.presses, notes: session.notes.length, rounds: session.cfg.rounds, maxPresses: session.cfg.maxPresses, cleansed: session.cleansed } : null,
        getNotes: () => session ? session.notes.map(n => ({ index: n.index, kind: n.kind, arrive: n.arrive, state: n.state, pressedAt: n.pressedAt })) : [],
        getResults: () => session ? session.results.map(r => ({ ...r })) : (lastResult?.results || []).map(r => ({ ...r })),
        getBuffs: () => ({ attack: buffs.attack && { ...buffs.attack }, speed: buffs.speed && { ...buffs.speed }, stacks: { ...stacks }, regens: [...regens].map(([k, r]) => ({ key: k, rate: r.rate, remaining: r.remaining, healed: r.healed })), plague: [...plagueTargets] }),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLog: () => log.map(e => ({ ...e })),
        getUi: () => session?.ui ? { active: true, sprites: session.ui.sprites.length, visible: session.ui.sprites.filter(sp => sp.visible).length } : { active: false },
        getTempObjectCount: () => { const c = { sprites: session?.ui ? session.ui.sprites.length + 1 : 0, waves: session ? session.waves.length : 0 }; c.total = c.sprites + c.waves; return c; }
    });
})();
