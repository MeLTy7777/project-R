/*:
 * @target MZ
 * @plugindesc v1.0.0 Apollo「月桂冠」(設計ID 11 / apollo_laurel_wreath) Lv1〜3: 半径5マスに月桂樹の根を張る(7秒)。根に触れている味方は秒間50回復・被ダメージ-30%・弱点の増分-90%。Lv2で移動+20%と敵へスリップ、Lv3で敵の遠距離攻撃を根の壁で防ぐ。
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
 * @orderAfter ProjectR_CharacterPresentation
 *
 * @param GrowSoundEffect
 * @text 根が張る効果音(RTPのSE名。空なら鳴らさない)
 * @desc ワークブックの音は「ジュルジュル」。専用音が無いのでRTPのTwine(絡みつく音)を仮に当てています。
 * @type string
 * @default Twine
 *
 * @param BlockSoundEffect
 * @text 根の壁が弾を防ぐ効果音(RTPのSE名。空なら鳴らさない)
 * @desc 仮のRTP音(Parry)。連続する場合は間引いて鳴らします。
 * @type string
 * @default Parry
 *
 * @help
 * ProjectR_ApolloLaurelWreath.js
 *
 * 新カード「月桂冠」(ワークブック「カード一覧」のCard ID 11)。ランタイムIDは apollo_laurel_wreath。Apollo / 支援 / 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / Buff(狙いなし = instant)/ 壁越え いいえ / 半径5マス。
 * 数値はすべて data/ProjectR_CardBalance.json(開発用エディタ F6)にあります。
 *
 * 【ワークブックの記述(確定)】
 *   Lv1: 効果範囲内に月桂樹の根を張り巡らす。操作キャラが移動すると根っこがその場に残ったまま範囲が増加する。根っこの生えている時間は7秒。
 *        根っこに触れている間、自分を含む味方が秒間回復50を得る。根っこに触れている間、被ダメージ-30%、弱点属性増加被ダメージ-90%。
 *   Lv2: 根っこに触れている間の移動速度が20%上昇し、敵が触れるとスリップダメージ秒間30ダメージ。
 *   Lv3: 敵の遠距離攻撃が発射されると、根っこの範囲に入った瞬間に根っこが壁をつくり、防ぐ。
 *   演出: 後ろにApolloが召喚され指をはじく / 右手を上げる / 白と金の根っこを周りに張り巡らす / 音「ジュルジュル」。
 *
 * 【実装】
 *   ・使った瞬間に消費(instant)。使った場所に半径5マスの根のパッチができ、7秒(rootSeconds)続く。パッチは作ってから7秒で消える。
 *   ・成長: 使ってから growSeconds(7秒)の間、操作キャラが前のパッチの中心から2マス(trailStepTiles)以上動くたびに、その場所へ新しいパッチ(半径5)を足す(最大12個)。
 *     古いパッチは「その場に残ったまま」それぞれ7秒で消える。根の範囲 = 生きているパッチの和。
 *   ・「触れている」= 中心が根の範囲(いずれかのパッチの半径5以内)にある味方(主人公と出撃中の仲間。PartyRoster)と敵。
 *   ・Lv1: 味方は0.5秒ごとに25(秒間50)回復(満タンなら何もしない)。被ダメージx0.7・弱点(有効度>1)の増分x0.1(例: x2.0 → x1.1)。ProjectR_ApolloStatus 経由で DamageModifiers へ。
 *   ・Lv2: 主人公の移動速度x1.2(根に触れている間だけ。CardModifiers)。根に触れている敵は秒間30(0.5秒ごとに15)のスリップ。
 *   ・Lv3: 敵の遠距離攻撃(Hendrixの標準で作られた、敵が撃った弾のEvent)が根の範囲に入った瞬間に、その弾を消し、その位置に根の壁(1.5秒)を作る。
 *     壁の近く(0.8マス)を通る弾も、壁がある間は消す。
 *
 * 【仮の決め(ワークブックに無い部分)】
 *   ・パッチの半径は新しい足し分も5(trailRadius は radiusTiles と同じ)。成長の期間は7秒・足すのは2マス動くたび。
 *   ・仲間の被ダメージ軽減は、ダウン判定の前に掛ける(Phase A9。ProjectR_ApolloStatus が PartyCombat.damageAlly を包んで、根の中の仲間の "ally:<actorId>" 状態の x0.7 を掛ける。根を出ると即、外れる)。
 *   ・「敵の遠距離攻撃」の判定: Hendrixが敵の弾として扱うEvent(敵が生成した弾 = _inheritedEnemyName を持つ、または <attacker: 敵の名前>)。
 *     現行の本番データには敵の弾のPrefabが無く(監査文書 §8)、実機の確認は敵の弾に見立てたEventで行う。敵の弾が実装されたら、そのまま防げる。
 *   ・壁は1.5秒(wallSeconds)・弾を防ぐ半径0.8(wallBlockRadiusTiles)。根の絵(パッチの円)は同時6つまで・根のEventは最大24個。
 *   ・使い直しは、成長の期間を新しく数え直す(既存のパッチは残る)。
 *   ・音は専用音が無く、RTPの Twine(根が張る)/ Parry(壁が防ぐ)で代用。
 *
 * API: ProjectRApolloLaurelWreath
 *   CARD / implementedMaxLevel / cardLevel() / config(level) / getPatches() / getMembers() / getWalls() / getLastResult() / getTempObjectCount() / isEnemyProjectile(event)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const ENGINE = "Hendrix_Action_Engine";
    const CARD = "apollo_laurel_wreath";
    const ROOT_TAG = "<projectRLaurelRoot>", ROOT_TEMPLATE = "ProjectR Apollo Laurel Root";
    const WALL_TAG = "<projectRLaurelWall>", WALL_TEMPLATE = "ProjectR Apollo Laurel Wall";
    const ROOTS_ID = "laurel_roots", THORNS_ID = "laurel_thorns", SPEED_ID = "apollo_laurel_wreath";
    const IMPLEMENTED_MAX_LEVEL = 3;
    const MAX_PATCHES = 12, PATCH_VISUAL_BUDGET = 6, ROOT_EVENT_BUDGET = 24, ROOTS_PER_PATCH = 4, WALL_BUDGET = 8, SOUND_GAP_FRAMES = 12;
    const STATUS_SECONDS = 0.3;
    const EPSILON = 1e-8;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_ApolloLaurelWreath") : {};

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
    const playSe = (key, fallback, volume = 80, pitch = 100) => { try { const name = String(params[key] === undefined ? fallback : params[key]).trim(); if (name && typeof AudioManager !== "undefined") AudioManager.playSe({ name, volume, pitch, pan: 0 }); } catch (_error) { /* 表示のみ */ } };
    const stopNote = note => { if (note) { try { root.ProjectRPresentationVfx?.stop?.(note); } catch (_error) { /* 表示のみ */ } } };
    const pvPlay = (key, context) => { try { return root.ProjectRPresentationVfx?.play?.(key, context) || null; } catch (_error) { return null; } };

    const SHEET = (file, fps) => Object.freeze({ file: "Animation/" + file, rows: 2, columns: 4, fps });
    try {
        const vfx = root.ProjectRPresentationVfx;
        vfx?.register?.("apollo_laurel.zone", { library: "ProjectR_A7_Laurel_Zone", sheet: SHEET("ProjectR_A7_Laurel_Zone", 8), anchor: "target", area: true, frame: 480, frameTiles: 10, loop: "infinite", scale: 100, opacity: 210, offsetY: 0, blend: "Add" });
        vfx?.register?.("apollo_laurel.burst", { library: "ProjectR_A7_Laurel_Burst", sheet: SHEET("ProjectR_A7_Laurel_Burst", 24), anchor: "target", scale: 100, opacity: 255, offsetY: -12, blend: "Add" });
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
            const c = { level, radius: num(tune("radiusTiles")), rootSeconds: num(tune("rootSeconds")), growSeconds: num(tune("growSeconds")), trailStep: num(tune("trailStepTiles")), maxPatches: Math.floor(num(tune("maxPatches"))),
                healPerSecond: num(e.laurelHealPerSecond), healTick: num(tune("laurelHealTickSeconds")), damageTaken: num(e.laurelDamageTaken), weaknessScale: num(e.laurelWeaknessScale),
                speedBonus: Number(e.speedBonus) > 0 ? num(e.speedBonus) : 0, thornDps: Number(e.thornDamagePerSecond) > 0 ? num(e.thornDamagePerSecond) : 0, thornTick: num(tune("thornTickSeconds")),
                wall: Number(e.projectileWall) === 1, wallSeconds: num(tune("wallSeconds")), wallRadius: num(tune("wallBlockRadiusTiles")), element: tune("element"), weaknessMultiplier: tune("weaknessMultiplier") };
            c.rootFrames = Math.max(1, Math.round(c.rootSeconds * 60)); c.growFrames = Math.max(0, Math.round(c.growSeconds * 60));
            c.healFrames = Math.max(1, Math.round(c.healTick * 60)); c.healAmount = Math.max(0, Math.round(c.healPerSecond * c.healTick)); c.wallFrames = Math.max(1, Math.round(c.wallSeconds * 60));
            const ok = c.radius > 0 && c.rootSeconds > 0 && c.growSeconds >= 0 && c.trailStep > 0 && c.maxPatches >= 1 && c.maxPatches <= MAX_PATCHES && c.healPerSecond >= 0 && c.healTick > 0
                && c.damageTaken > 0 && c.damageTaken <= 1 && c.weaknessScale >= 0 && c.weaknessScale <= 1 && c.speedBonus >= 0 && c.thornTick > 0 && c.wallSeconds > 0 && c.wallRadius > 0;
            return ok ? Object.freeze(c) : null;
        } catch (_error) { return null; }
    };

    // ---------- 状態(実行時のみ。セーブしない) ----------
    const patches = []; // { id, x, y, frames, anchor, notes, roots:[{eventId,event,map,gone}], cfg }
    const walls = []; // { id, x, y, frames, visual, radius }
    const members = new Map(); // key -> { healAcc, prevHp, insideFrames, healed, refunded }
    let grow = null; // { framesLeft, cfg, last:{x,y} }
    let lastResult = null, patchSerial = 0, wallSerial = 0, frameNo = 0, lastBlockSound = -Infinity, planned = null, blocked = 0, totalHealed = 0, thornsDealt = 0;
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 80) log.shift(); };

    // ---------- 環境 ----------
    const command = (name, args, eventId = 0) => { const interpreter = new Game_Interpreter(); interpreter._eventId = eventId; PluginManager.callCommand(interpreter, ENGINE, name, args); };
    const leader = () => (typeof $gameParty !== "undefined" ? $gameParty.leader() : null);
    const templateOf = name => { const t = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null; return t?.find(e => e?.name === name) || null; };
    const hpOf = id => { const v = modifiers()?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const isEnemy = event => !!event && !event._erased && !!event.event?.()?.note?.includes("<enemy>");
    const eventCenter = event => ({ x: event._realX + 0.5, y: event._realY + 0.5 });
    const destroyEv = f => {
        if (!f || f.gone) return;
        f.gone = true;
        const m = map();
        if (!m || f.map !== m || m.event(f.eventId) !== f.event) return;
        try { command("DestroyEvent", { target: String(f.eventId), destroyNearby: "", permanent: "false" }, f.eventId); } catch (_error) { /* 後片付けの失敗は握りつぶす */ }
    };
    const spawnVisual = (templateName, x, y) => {
        const m = map(), tpl = templateOf(templateName);
        if (!m || !tpl || typeof m.spawnEvent !== "function") return null;
        try {
            const before = new Set(m.events());
            const id = m.spawnEvent(tpl.id, x - 0.5, y - 0.5, false);
            const event = id && m.event(id);
            return event && !before.has(event) ? { eventId: id, event, map: m, gone: false } : null;
        } catch (_error) { return null; }
    };
    const positionOf = m => {
        if (m.key === "player") { const p = $gamePlayer.centerPositionPoint(); return { x: p.x, y: p.y }; }
        const e = m.eventId ? map()?.event(m.eventId) : null;
        if (e && !e._erased) return eventCenter(e);
        return Number.isFinite(m.x) && Number.isFinite(m.y) ? { x: m.x, y: m.y } : null;
    };
    const insideAny = p => !!p && patches.some(patch => Math.hypot(p.x - patch.x, p.y - patch.y) <= patch.radius + EPSILON);
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

    // ---------- パッチ(根) ----------
    const removePatch = (patch, reason) => {
        const i = patches.indexOf(patch);
        if (i >= 0) patches.splice(i, 1);
        for (const r of patch.roots) destroyEv(r);
        patch.roots.length = 0;
        for (const n of patch.notes) stopNote(n);
        patch.notes.length = 0;
        if (patch.anchor) { try { root.ProjectRGodSummonVisual?.removeAnchor?.(patch.anchor); } catch (_error) { /* 表示のみ */ } patch.anchor = null; }
        note({ type: "patchEnd", id: patch.id, reason });
    };
    const addPatch = (cfg, point) => {
        if (patches.length >= cfg.maxPatches) return null;
        const patch = { id: ++patchSerial, x: point.x, y: point.y, radius: cfg.radius, frames: cfg.rootFrames, anchor: null, notes: [], roots: [], cfg };
        patches.push(patch);
        if (patches.filter(p => p.anchor).length < PATCH_VISUAL_BUDGET) {
            try {
                const spawned = root.ProjectRGodSummonVisual?.spawnAnchor?.({ x: point.x, y: point.y }, { cardId: CARD });
                if (spawned?.ok) {
                    patch.anchor = spawned.id;
                    const ring = pvPlay("apollo_laurel.zone", { eventId: spawned.eventId, radiusTiles: cfg.radius });
                    if (ring?.note) patch.notes.push(ring.note);
                    pvPlay("apollo_laurel.burst", { eventId: spawned.eventId });
                }
            } catch (_error) { /* 表示のみ */ }
        }
        const rootEvents = patches.reduce((s, p) => s + p.roots.length, 0);
        for (let k = 0; k < ROOTS_PER_PATCH && rootEvents + k < ROOT_EVENT_BUDGET; k++) {
            const a = k / ROOTS_PER_PATCH * Math.PI * 2 + patch.id, d = cfg.radius * (k === 0 ? 0.15 : 0.55);
            const v = spawnVisual(ROOT_TEMPLATE, point.x + Math.cos(a) * d, point.y + Math.sin(a) * d);
            if (v) patch.roots.push(v);
        }
        note({ type: "patch", id: patch.id, x: point.x, y: point.y });
        return patch;
    };
    const resolve = (plan, activation) => {
        const cfg = plan.cfg, p = $gamePlayer.centerPositionPoint();
        const patch = addPatch(cfg, { x: p.x, y: p.y });
        grow = { framesLeft: cfg.growFrames, cfg, last: { x: p.x, y: p.y } };
        try { root.ProjectRGodSummonManager?.perform?.({ definition: plan.definition, aim: false, lifetimeFrames: 100 }, () => ({ ok: true })); } catch (_error) { /* 表示のみ */ }
        try { root.ProjectRCharacterPresentation?.request?.("FistPump", { source: "card", detail: CARD }); } catch (_error) { /* 表示のみ */ }
        playSe("GrowSoundEffect", "Twine", 80, 100);
        lastResult = { ok: true, consumed: true, level: plan.level, instanceId: activation?.instanceId ?? null, patches: patch ? 1 : 0, radius: cfg.radius, rootSeconds: cfg.rootSeconds };
        note({ type: "start", level: plan.level });
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

    // ---------- 敵の遠距離攻撃(Lv3) ----------
    const isEnemyProjectile = event => {
        if (!event || event._erased || !event.event) return false;
        const data = event.event?.(), n = String(data?.note || "");
        if (!data || n.includes("<enemy>") || n.includes(ROOT_TAG) || n.includes(WALL_TAG)) return false;
        if (event._inheritedEnemyName) return true;
        const m = n.match(/<attacker:\s*(.+?)>/i);
        return !!m && !/^(player|actor)/i.test(m[1].trim());
    };
    const addWall = (cfg, point) => {
        if (walls.length >= WALL_BUDGET) { const old = walls.shift(); destroyEv(old.visual); }
        const w = { id: ++wallSerial, x: point.x, y: point.y, frames: cfg.wallFrames, radius: cfg.wallRadius, visual: spawnVisual(WALL_TEMPLATE, point.x, point.y) };
        walls.push(w);
        return w;
    };
    const blockProjectiles = cfg => {
        const m = map();
        for (const event of m.events()) {
            if (!isEnemyProjectile(event)) continue;
            const p = eventCenter(event);
            const hitWall = walls.some(w => Math.hypot(p.x - w.x, p.y - w.y) <= w.radius + EPSILON);
            const entered = insideAny(p);
            if (!entered && !hitWall) continue;
            try { command("DestroyEvent", { target: String(event.eventId()), destroyNearby: "", permanent: "false" }, event.eventId()); } catch (_error) { continue; }
            blocked++;
            if (entered && !hitWall) addWall(cfg, p);
            if (frameNo - lastBlockSound >= SOUND_GAP_FRAMES) { lastBlockSound = frameNo; playSe("BlockSoundEffect", "Parry", 75, 100); }
            note({ type: "blocked", eventId: event.eventId(), x: p.x, y: p.y, wall: !(entered && !hitWall) });
        }
    };

    // ---------- 毎フレーム ----------
    const tickMembers = cfg => {
        const list = roster().members({ includeDown: false });
        const keys = new Set(list.map(m => m.key));
        for (const key of [...members.keys()]) if (!keys.has(key)) members.delete(key);
        for (const m of list) {
            let rec = members.get(m.key);
            if (!rec) { rec = { healAcc: 0, prevHp: m.hp, insideFrames: 0, healed: 0, refunded: 0 }; members.set(m.key, rec); }
            const p = positionOf(m), inside = insideAny(p);
            if (inside) {
                rec.insideFrames++;
                if (m.key !== "player") status().apply(m.key, ROOTS_ID, { seconds: STATUS_SECONDS, damageTaken: cfg.damageTaken, source: CARD }); // 仲間の被ダメージ(ダウン判定の前に掛かる。ProjectR_ApolloStatus)
                if (m.key === "player") {
                    status().apply("player", ROOTS_ID, { seconds: STATUS_SECONDS, damageTaken: cfg.damageTaken, weakness: cfg.weaknessScale, weaknessMode: "excessScale", source: CARD });
                    if (cfg.speedBonus > 0) modifiers()?.setMoveSpeedFactor?.(SPEED_ID, 1 + cfg.speedBonus, STATUS_SECONDS);
                }
                if (++rec.healAcc >= cfg.healFrames) {
                    rec.healAcc = 0;
                    if (m.hp < m.mhp) { const got = healMember(m, cfg.healAmount); rec.healed += got; totalHealed += got; }
                }
            } else { rec.healAcc = 0; if (m.key !== "player" && status().has(m.key, ROOTS_ID)) status().remove(m.key, ROOTS_ID, "left"); } // 仲間は根を出た瞬間に軽減が外れる
            const cur = m.key === "player" ? leader()?.hp : roster().allies({ includeDown: true }).find(x => x.key === m.key)?.hp;
            rec.prevHp = Number.isFinite(cur) ? cur : m.hp;
        }
    };
    const tickEnemies = cfg => {
        if (!(cfg.thornDps > 0)) return;
        for (const event of map().events()) {
            if (!isEnemy(event) || hpOf(event.eventId()) <= 0) continue;
            if (!insideAny(eventCenter(event))) continue;
            status().apply(status().targetKeyOfEvent(event.eventId()), THORNS_ID, { seconds: STATUS_SECONDS, dot: { perSecond: cfg.thornDps, tickSeconds: cfg.thornTick, source: CARD, element: cfg.element, weaknessMultiplier: cfg.weaknessMultiplier }, source: CARD });
        }
    };
    const update = () => {
        frameNo++;
        for (const patch of [...patches]) { if (--patch.frames <= 0) removePatch(patch, "expired"); }
        for (const w of [...walls]) { if (--w.frames <= 0) { walls.splice(walls.indexOf(w), 1); destroyEv(w.visual); } }
        const cfg = grow?.cfg || patches[0]?.cfg || walls[0] && null;
        if (grow && grow.framesLeft > 0) {
            grow.framesLeft--;
            const p = $gamePlayer.centerPositionPoint();
            if (Math.hypot(p.x - grow.last.x, p.y - grow.last.y) >= grow.cfg.trailStep - EPSILON) { if (addPatch(grow.cfg, { x: p.x, y: p.y })) grow.last = { x: p.x, y: p.y }; }
        }
        if (!patches.length) { if (members.size) members.clear(); if (!(grow && grow.framesLeft > 0)) grow = null; return; }
        const c = patches[patches.length - 1].cfg;
        tickMembers(c); tickEnemies(c);
        if (c.wall) blockProjectiles(c);
    };
    const clearAll = reason => {
        for (const patch of [...patches]) removePatch(patch, reason);
        for (const w of [...walls]) destroyEv(w.visual);
        walls.length = 0; members.clear(); grow = null;
        try { status()?.remove?.("player", ROOTS_ID, reason); modifiers()?.clearMoveSpeedFactor?.(SPEED_ID); } catch (_error) { /* 表示のみ */ }
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || (!patches.length && !walls.length && !grow)) return;
        if (this.eventsPaused) return;
        if (!deck.isCardBattleActive()) { clearAll("battleInactive"); return; }
        if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { clearAll("playerDead"); return; }
        try { update(); } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
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
        const tracked = new Set([...patches.flatMap(p => p.roots.map(r => r.event)), ...walls.map(w => w.visual?.event)].filter(Boolean));
        for (const event of m.events()) { const n = event?.event?.()?.note || ""; if (event && !tracked.has(event) && (n.includes(ROOT_TAG) || n.includes(WALL_TAG))) destroyEv({ eventId: event.eventId(), event, map: m, gone: false }); }
    };

    root.ProjectRApolloLaurelWreath = Object.freeze({
        CARD, implementedMaxLevel: IMPLEMENTED_MAX_LEVEL, cardLevel, config, isEnemyProjectile,
        getPatches: () => patches.map(p => ({ id: p.id, x: p.x, y: p.y, radius: p.radius, framesLeft: p.frames, roots: p.roots.length, hasVisual: !!p.anchor })),
        getMembers: () => [...members].map(([key, r]) => ({ key, insideFrames: r.insideFrames, healed: r.healed, refunded: r.refunded })),
        getWalls: () => walls.map(w => ({ id: w.id, x: w.x, y: w.y, framesLeft: w.frames })),
        getStats: () => ({ blocked, totalHealed, patches: patches.length, walls: walls.length, growFramesLeft: grow ? grow.framesLeft : 0 }),
        getLastResult: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null,
        getLog: () => log.map(e => ({ ...e })),
        getTempObjectCount: () => { const c = { roots: patches.reduce((s, p) => s + p.roots.length, 0), walls: walls.filter(w => w.visual && !w.visual.gone).length, anchors: patches.filter(p => p.anchor).length, notes: patches.reduce((s, p) => s + p.notes.length, 0) }; c.total = c.roots + c.walls + c.anchors + c.notes; return c; }
    });
})();
