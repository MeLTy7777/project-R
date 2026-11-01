/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「ヒュアキントス」(設計ID 12 / apollo_hyacinthus) Lv1〜3: 受付期間中は被ダメージ90%軽減。被弾すると半径2マスにヒヤシンスが咲き、中の味方を秒間50回復。Lv2で仲間にも、Lv3で受付期間5秒+移動速度+80%。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CardCatalog
 * @base ProjectR_CardBalance
 * @base ProjectR_CardModifiers
 * @base ProjectR_ApolloStatus
 * @base ProjectR_PartyRoster
 * @base ProjectR_GodSummonManager
 * @base ProjectR_PresentationVfx
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_ApolloStatus
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CutIn
 *
 * @param BloomSoundEffect
 * @text 花が咲く効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「ファーン」。専用音が無いのでRTPのHeal4を仮に当てています(専用音ができたらここだけ差し替え)。
 * @type string
 * @default Heal4
 *
 * @param HealSoundEffect
 * @text 花の中の回復の効果音(RTPのSE名。空なら鳴らさない)
 * @desc 回復のたびに鳴ると重なるので、花ごとに最初の回復の1回だけ鳴らします。仮のRTP音(Heal1)。
 * @type string
 * @default Heal1
 *
 * @help
 * ProjectR_ApolloHyacinthus.js
 *
 * 新カード「ヒュアキントス」(ワークブック「カード一覧」のCard ID 12)。ランタイムIDは apollo_hyacinthus。Apollo / 特殊 / 最大3枚 / 最大Lv3 / Cooldown 7秒 / Buff(狙いなし)。
 * 数値はすべて data/ProjectR_CardBalance.json(開発用エディタ F6)が持ちます。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: カード使用後、受付期間の3秒間中に使用キャラクターがダメージを食らうと、効果範囲(半径2マス)にヒヤシンスを咲かせる。味方が咲いたヒヤシンスに入ると秒間50ヒールする。
 *        受付期間中は被ダメージを90%軽減する。
 *   Lv2: カードの効果がパーティーメンバーにも付与される。
 *   Lv3: 受付期間が5秒になり、移動速度が80%上昇。
 *   成功: 受付期間中にダメージを受ける / 失敗: 受付期間中にダメージを受けない。複数対象: いいえ / 壁越え: いいえ。
 *   演出: ダメージを受けた後にApolloが召喚され、キャラクターを包む / 赤いヒヤシンスの花びらが散りながら効果範囲に広がる / 赤 / 音「ファーン」。
 *
 * 【実装】
 *   ・カードは使った瞬間に消費され(instant。Hermesのストレングスなどと同じ)、受付期間が始まる。使用者は被ダメージx0.1(90%軽減)。
 *     軽減は ProjectR_ApolloStatus を通して DamageModifiers へ(HPを減らす呼び出し1回につき1回)。受付期間はカードの戦闘時計で進む。
 *   ・受付期間中に使用者のHPが減ると(どの経路でも。HPの監視)、その時の使用者の位置にヒヤシンスが咲き、Apolloが一時召喚で現れる。花は半径2マス・bloomSeconds(8秒)続き、
 *     中にいる味方(主人公と出撃中の仲間)のうちHPが減っている者を、bloomHealTickSeconds(0.5秒)ごとに 50 x 間隔 回復する。受付期間が終わっても花は残る。
 *   ・Lv2: 出撃中の仲間(PartyRoster)にも同じ受付期間が付く。仲間は被ダメージの軽減が「受けた後の差し戻し」になる(PartyCombat の被ダメージ窓口は DamageModifiers に接続していないため)。
 *     受けたダメージ D のうち、軽減されなかった D - round(D x 0.1) を直後に回復する。一撃で倒れた(ダウン)仲間は戻らない。仲間が被弾したら、その仲間の位置にも花が咲く。
 *   ・Lv3: 受付期間5秒。使用者の移動速度x1.8(CardModifiers.setMoveSpeedFactor。受付期間の間)。
 *
 * 【仮の決め(ワークブックに無い部分)】
 *   ・花は参加者ごとに受付期間につき1回だけ咲く(最初の被弾で)。花の持続は8秒(bloomSeconds)。
 *   ・受付期間中に被弾しなくてもカードは消費済み(失敗 = 花が咲かないだけ)。使った瞬間に消費する(予約→確定にしない)。
 *   ・「味方」= 主人公 + 出撃中の仲間(PartyRoster)。使用者本人も花の中で回復する。NPCは含まない。
 *   ・回復は秒間50を0.5秒ごとの25ずつ(HPが満タンの者には何もしない)。
 *   ・受付期間の重複: 同じカードを受付期間中にもう一度使うと、受付期間を更新する(軽減を重ねない・花も1回ぶん)。
 *
 * API: ProjectRApolloHyacinthus
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / getWindows() / getBlooms() / getLastResult() / getTempObjectCount() / getActiveVfxJobs()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const CARD = "apollo_hyacinthus";
    const TAG = "<projectRHyacinth>";
    const TEMPLATE_NAME = "ProjectR Apollo Hyacinth";
    const SPEED_ID = "apollo_hyacinthus";
    const GUARD_ID = "hyacinthus_guard";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const MAX_FLOWERS_PER_BLOOM = 6, MAX_BLOOMS = 3;
    const SUMMON_FRAMES = 100;
    const EPSILON = 1e-8;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloHyacinthus") : {};

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
    const playSe = (key, fallback, volume = 80, pitch = 100) => { try { const name = String(params[key] === undefined ? fallback : params[key]).trim(); if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };
    const stopNote = note => { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };

    // ---- VFX Designerライブラリへの対応(PresentationVfx の内蔵表は変えず、ここで足す) ----
    const SHEET = (file, fps) => Object.freeze({ file: "Animation/" + file, rows: 2, columns: 4, fps });
    try {
        const vfx = root.ProjectRPresentationVfx;
        vfx?.register?.("apollo_hyacinth.guard", { library: "ProjectR_A7_Hyacinth_Guard", sheet: SHEET("ProjectR_A7_Hyacinth_Guard", 8), anchor: "target", loop: "infinite", scale: 100, opacity: 235, offsetY: 4, blend: "Add" });
        vfx?.register?.("apollo_hyacinth.bloom", { library: "ProjectR_A7_Hyacinth_Bloom", sheet: SHEET("ProjectR_A7_Hyacinth_Bloom", 8), anchor: "target", area: true, frame: 192, frameTiles: 4, loop: "infinite", scale: 100, opacity: 210, offsetY: 0, blend: "Add" });
        vfx?.register?.("apollo_hyacinth.petals", { library: "ProjectR_A7_Hyacinth_Petals", sheet: SHEET("ProjectR_A7_Hyacinth_Petals", 14), anchor: "target", scale: 100, opacity: 255, offsetY: -12, blend: "Add" });
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
            const c = { level, acceptSeconds: num(e.acceptSeconds), guardTaken: num(e.guardDamageTaken), healPerSecond: num(e.bloomHealPerSecond), partyShare: Number(e.partyShare) === 1,
                speedBonus: Number(e.speedBonus) > 0 ? num(e.speedBonus) : 0, radius: num(tune("radiusTiles")), bloomSeconds: num(tune("bloomSeconds")), healTick: num(tune("bloomHealTickSeconds")) };
            const ok = c.acceptSeconds > 0 && c.guardTaken >= 0 && c.guardTaken <= 1 && c.healPerSecond >= 0 && c.radius > 0 && c.bloomSeconds > 0 && c.healTick > 0 && c.speedBonus >= 0;
            c.healAmount = Math.max(0, Math.round(c.healPerSecond * c.healTick));
            return ok ? Object.freeze(c) : null;
        } catch (_error) { return null; }
    };

    // ---------- 状態(実行時のみ。セーブしない) ----------
    const windows = []; // { key, kind, actorId, remaining, prevHp, bloomed, level, vfx:[notes], cfg, guardSeen }
    const blooms = []; // { id, x, y, remaining, healAcc, radius, flowers:[{eventId,event,map}], anchor, notes, healed, ticks, owner, healSoundPlayed }
    let lastResult = null, serial = 0, bloomSerial = 0, planned = null;
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 60) log.shift(); };

    // ---------- 参加者のHP・位置 ----------
    const leader = () => (typeof $gameParty !== "undefined" ? $gameParty.leader() : null);
    const participantHp = w => {
        if (w.kind === "player") { const a = leader(); return a ? { hp: a.hp, mhp: a.mhp } : null; }
        const m = roster()?.allies?.({ includeDown: true })?.find(x => x.actorId === w.actorId);
        return m ? { hp: m.hp, mhp: m.mhp, down: !!m.down } : null;
    };
    const eventCenter = id => { const e = map()?.event(id); return e && !e._erased ? { x: e._realX + 0.5, y: e._realY + 0.5 } : null; };
    const positionOf = m => {
        if (m.key === "player") { const p = $gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; }
        return (m.eventId ? eventCenter(m.eventId) : null) || (Number.isFinite(m.x) && Number.isFinite(m.y) ? { x: m.x, y: m.y } : null);
    };
    const healMember = (m, amount) => {
        if (!(amount > 0)) return 0;
        if (m.key === "player") { const a = leader(); if (!a || !(a.hp > 0)) return 0; const before = a.hp, applied = Math.min(amount, Math.max(0, a.mhp - a.hp)); if (applied > 0) a.gainHp(applied); return a.hp - before; }
        const api = root.ProjectRPartyCombat, member = api?.members?.().find(x => x.actorId === m.actorId);
        if (!member || member.down) return 0;
        const before = member.hp, result = api.healAlly(m.actorId, amount);
        return result?.ok ? result.hp - before : 0;
    };

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

    const endWindow = (w, reason) => {
        const i = windows.indexOf(w);
        if (i >= 0) windows.splice(i, 1);
        if (w.kind === "player") status()?.remove?.("player", GUARD_ID, reason);
        for (const n of w.notes) stopNote(n);
        note({ type: "windowEnd", key: w.key, reason, bloomed: w.bloomed });
        lastResult = lastResult && { ...lastResult, windows: lastResult.windows?.map(x => x.key === w.key ? { ...x, ended: reason, bloomed: w.bloomed } : x) };
    };
    const startWindow = (cfg, member, definition) => {
        const existing = windows.find(w => w.key === member.key);
        if (existing) endWindow(existing, "renewed");
        const hp = member.key === "player" ? leader()?.hp : member.hp;
        const w = { key: member.key, kind: member.key === "player" ? "player" : "ally", actorId: member.actorId ?? null, remaining: cfg.acceptSeconds, prevHp: hp, bloomed: false, cfg, definition, notes: [], reduced: 0, refunded: 0, damaged: 0 };
        windows.push(w);
        if (w.kind === "player") {
            status().apply("player", GUARD_ID, { seconds: cfg.acceptSeconds, damageTaken: cfg.guardTaken, source: CARD });
            const played = pvPlay("apollo_hyacinth.guard", {});
            if (played?.note) w.notes.push(played.note);
        }
        return w;
    };
    const resolve = (plan, activation) => {
        const cfg = plan.cfg;
        const members = [roster().protagonist()].filter(Boolean);
        if (cfg.partyShare) members.push(...roster().allies());
        const started = members.map(m => startWindow(cfg, m, plan.definition || deck.definitions.card(CARD)));
        if (cfg.speedBonus > 0) root.ProjectRCardModifiers?.setMoveSpeedFactor?.(SPEED_ID, 1 + cfg.speedBonus, cfg.acceptSeconds);
        lastResult = { ok: true, consumed: true, serial: ++serial, level: plan.level, instanceId: activation?.instanceId ?? null, accept: cfg.acceptSeconds, windows: started.map(w => ({ key: w.key })), speed: cfg.speedBonus > 0 ? 1 + cfg.speedBonus : null, blooms: 0 };
        note({ type: "start", level: plan.level, windows: started.map(w => w.key) });
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

    // ---------- 花(被弾で咲く) ----------
    const environmentTemplate = () => {
        const templates = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        const t = templates?.find(e => e?.name === TEMPLATE_NAME);
        return t && t.note.includes(TAG) ? t : null;
    };
    const spawnFlowers = (bloom, count) => {
        const m = map(), tpl = environmentTemplate();
        if (!m || !tpl || typeof m.spawnEvent !== "function") return;
        const spots = [{ x: 0, y: 0 }];
        for (let k = 0; k < count - 1; k++) { const a = k / Math.max(1, count - 1) * Math.PI * 2, r = bloom.radius * 0.62; spots.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
        for (const s of spots.slice(0, count)) {
            try {
                const before = new Set(m.events());
                const id = m.spawnEvent(tpl.id, Math.max(0, bloom.x + s.x - 0.5), Math.max(0, bloom.y + s.y - 0.5), false);
                const event = id && m.event(id);
                if (event && !before.has(event)) bloom.flowers.push({ eventId: id, event, map: m });
            } catch (_error) { /* 表示のみ */ }
        }
    };
    const destroyEvent = f => {
        const m = map();
        if (!m || f.map !== m || m.event(f.eventId) !== f.event) return;
        try { const interpreter = new Game_Interpreter(); interpreter._eventId = f.eventId; PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "DestroyEvent", { target: String(f.eventId), destroyNearby: "", permanent: "false" }); } catch (_error) { /* 表示のみ */ }
    };
    const removeBloom = (bloom, reason) => {
        const i = blooms.indexOf(bloom);
        if (i >= 0) blooms.splice(i, 1);
        for (const f of bloom.flowers) destroyEvent(f);
        bloom.flowers.length = 0;
        for (const n of bloom.notes) stopNote(n);
        if (bloom.anchor) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(bloom.anchor); } catch (_error) { /* 表示のみ */ } }
        note({ type: "bloomEnd", id: bloom.id, reason, healed: bloom.healed });
    };
    const summonApollo = definition => {
        try { root.ProjectRGodSummonManager?.perform?.({ definition, aim: false, lifetimeFrames: SUMMON_FRAMES }, () => ({ ok: true })); } catch (_error) { /* 表示のみ */ }
    };
    const bloomAt = (w, point) => {
        if (blooms.length >= MAX_BLOOMS) removeBloom(blooms[0], "limit");
        const cfg = w.cfg, bloom = { id: ++bloomSerial, owner: w.key, x: point.x, y: point.y, remaining: cfg.bloomSeconds, healAcc: 0, radius: cfg.radius, healPerSecond: cfg.healPerSecond, healAmount: cfg.healAmount, healTick: cfg.healTick,
            flowers: [], anchor: null, notes: [], healed: 0, ticks: 0, healSoundPlayed: false, byMember: {} };
        blooms.push(bloom);
        w.bloomed = true;
        try {
            const spawned = root.ProjectRGodSummonVisual?.spawnAnchor?.({ x: point.x, y: point.y }, { cardId: CARD });
            if (spawned?.ok) {
                bloom.anchor = spawned.id;
                const ring = pvPlay("apollo_hyacinth.bloom", { eventId: spawned.eventId, radiusTiles: cfg.radius });
                if (ring?.note) bloom.notes.push(ring.note);
                pvPlay("apollo_hyacinth.petals", { eventId: spawned.eventId });
            }
        } catch (_error) { /* 表示のみ */ }
        spawnFlowers(bloom, MAX_FLOWERS_PER_BLOOM);
        summonApollo(w.definition);
        playSe("BloomSoundEffect", "Heal4", 80, 100);
        if (lastResult) lastResult.blooms = (lastResult.blooms || 0) + 1;
        note({ type: "bloom", id: bloom.id, owner: w.key, x: point.x, y: point.y });
        return bloom;
    };

    // ---------- 戦闘時計(カードのCooldownと同じ。操作不能中は進まない) ----------
    const hpNow = w => participantHp(w);
    const onDamaged = (w, amount, current) => {
        w.damaged += amount;
        const refund = w.kind === "ally" ? amount - Math.round(amount * w.cfg.guardTaken) : 0;
        if (refund > 0 && !current.down) { const got = healMember({ key: w.key, actorId: w.actorId }, refund); w.refunded += got; if (got) w.prevHp = (hpNow(w)?.hp ?? w.prevHp); }
        if (!w.bloomed) {
            const m = roster().members({ includeDown: true }).find(x => x.key === w.key);
            const point = m ? positionOf(m) : null;
            if (point) bloomAt(w, point);
        }
    };
    const tickBlooms = seconds => {
        for (const bloom of [...blooms]) {
            bloom.remaining -= seconds; bloom.healAcc += seconds;
            while (bloom.healAcc + EPSILON >= bloom.healTick && bloom.remaining + seconds > 0) {
                bloom.healAcc -= bloom.healTick; bloom.ticks++;
                if (bloom.healAmount > 0) {
                    for (const m of roster().members()) {
                        if (!(m.hp > 0) || m.hp >= m.mhp) continue;
                        const p = positionOf(m);
                        if (!p || Math.hypot(p.x - bloom.x, p.y - bloom.y) > bloom.radius + EPSILON) continue;
                        const got = healMember(m, bloom.healAmount);
                        if (got > 0) {
                            bloom.healed += got; bloom.byMember[m.key] = (bloom.byMember[m.key] || 0) + got;
                            if (!bloom.healSoundPlayed) { bloom.healSoundPlayed = true; playSe("HealSoundEffect", "Heal1", 65, 100); }
                        }
                    }
                }
            }
            if (bloom.remaining <= EPSILON) removeBloom(bloom, "expired");
        }
    };
    const tick = seconds => {
        if (!Number.isFinite(seconds) || seconds <= 0) return;
        for (const w of [...windows]) {
            const cur = hpNow(w);
            if (!cur) { endWindow(w, "memberGone"); continue; }
            if (cur.hp < w.prevHp - EPSILON) onDamaged(w, w.prevHp - cur.hp, cur);
            const after = hpNow(w);
            if (after) w.prevHp = after.hp;
            w.remaining -= seconds;
            if (w.remaining <= EPSILON) endWindow(w, "expired");
        }
        tickBlooms(seconds);
    };
    const clearAll = reason => {
        for (const w of [...windows]) endWindow(w, reason);
        for (const b of [...blooms]) removeBloom(b, reason);
        try { root.ProjectRCardModifiers?.clearMoveSpeedFactor?.(SPEED_ID); } catch (_error) { /* 表示のみ */ }
    };
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {
        const result = _updateCooldown.apply(this, arguments);
        if (!deck.isCardBattleActive()) { if (windows.length || blooms.length) clearAll("battleInactive"); }
        else if (windows.length || blooms.length) { try { tick(Number(seconds)); } catch (error) { note({ type: "error", message: String(error?.message || error) }); } }
        return result;
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
        const tracked = new Set(blooms.flatMap(b => b.flowers.map(f => f.event)));
        for (const event of m.events()) if (event && !tracked.has(event) && event.event?.()?.note?.includes(TAG)) destroyEvent({ eventId: event.eventId(), event, map: m });
    };

    root.ProjectRApolloHyacinthus = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, cardLevel, config,
        getWindows: () => windows.map(w => ({ key: w.key, kind: w.kind, remaining: w.remaining, bloomed: w.bloomed, damaged: w.damaged, refunded: w.refunded, accept: w.cfg.acceptSeconds })),
        getBlooms: () => blooms.map(b => ({ id: b.id, owner: b.owner, x: b.x, y: b.y, remaining: b.remaining, radius: b.radius, healed: b.healed, ticks: b.ticks, flowers: b.flowers.length, byMember: { ...b.byMember } })),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLog: () => log.map(e => ({ ...e })),
        getTempObjectCount: () => { const c = { flowers: blooms.reduce((s, b) => s + b.flowers.length, 0), anchors: blooms.filter(b => b.anchor).length, notes: windows.reduce((s, w) => s + w.notes.length, 0) + blooms.reduce((s, b) => s + b.notes.length, 0) }; c.total = c.flowers + c.anchors + c.notes; return c; },
        tick
    });
})();
