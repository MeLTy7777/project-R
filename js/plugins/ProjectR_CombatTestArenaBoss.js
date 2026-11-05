/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR Playtest専用(Phase Apollo-A16): DEVボス戦(近接+遠距離の本物の予約攻撃・3フェーズ・勝利/敗北・計測)。既存の戦闘・カード・デッキを一緒に評価する縦断スライス。
 * @author ProjectR
 * @base ProjectR_EnemyAttack
 * @base ProjectR_BossFramework
 * @base ProjectR_CombatTestArenaApollo
 * @base ProjectR_CombatTestArenaEnemies
 * @orderAfter ProjectR_CombatTestArenaEnemies
 * @orderAfter ProjectR_CombatTestArenaApollo
 * @orderAfter ProjectR_BossFramework
 *
 * @help
 * ProjectR_CombatTestArenaBoss.js
 *
 * Playtestでしか有効になりません(本番・通常のプレイでは何もしません)。ストーリーの敵・報酬・本番の取得経路は作りません。
 * アリーナ(Map004)のダミー(<hp: 魔獣><enemy>)を1体、DEVボスにします(HPはメモリ上だけで差し替え。データのファイルは変えません)。
 *   ・ボスの攻撃は ProjectREnemyAttack の本物の予約(溜め → 実行)。近接は Hendrix の判定Event(spawnEventHitbox)、遠距離は Hendrix のspawnEvent の弾。
 *     ダメージは Hendrix 公式の UpdateEventHp(プレイヤー)。仲間(DEV)に当たるときは ProjectRTestEnemies のつなぎ(PartyCombat.damageAlly)。
 *   ・ボスのHP・フェーズ・勝利・敗北は ProjectRBossFramework(HPは敵EventのHPを毎フレーム読む。プレイヤーの剣・G17・カードのダメージがそのまま入る)。
 *   ・開始は、指輪の一時付与 + 全カードの所持/解放 + 本物の30枚デッキ(Core / CardInventory の検証つき)+ アリーナの戦闘。終了で一時データを元へ戻す(ProjectRApolloTest.reset)。
 *     テスト中にセーブしないこと(保護された5つのセーブは上書きしない)。
 *
 *   ProjectRBossTest.start({ deck: "mixed"|"apollo"|"hermes", level: 1〜3, maxHp, eventId, allies: 0|1|2, autoAttack, openingHand: [cardId...] })   開始。{ ok, ... }(openingHand = 最初に引く手札の指定。装備デッキにあるカードだけ)
 *   ProjectRBossTest.end()            終了(攻撃・弾・判定・HP・戦闘・一時データを片付ける)
 *   ProjectRBossTest.attackNow(kind)  今すぐ1回、"melee" か "ranged" を予約する(自動を切ったとき用)
 *   ProjectRBossTest.setAuto(true/false) / setConfig(patch) / getConfig()
 *   ProjectRBossTest.getReport()      計測: フェーズごとのframe・攻撃(予約/実行/命中)・溜めのframe・プレイヤー/ボスの被ダメージ・Game_Map.update の時間・Event数
 *   ProjectRBossTest.getState()       ボスのHP・フェーズ・位置・予約中の攻撃
 * ボスの動き(DEV): プレイヤーへ歩いて近づく(止まる距離あり)。攻撃パターンはフェーズごとの表(config.phases)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const BOSS_ID = "dev_boss_a16", MELEE_TAG = "<projectRBossMelee>";
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    const ea = () => root.ProjectREnemyAttack, te = () => root.ProjectRTestEnemies, bf = () => root.ProjectRBossFramework, at = () => root.ProjectRApolloTest, party = () => root.ProjectRPartyCombat;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
    const clone = value => JSON.parse(JSON.stringify(value));

    // 攻撃の表(フェーズ1〜3)。単位はframe(60 = 1秒)。ダメージは固定(遠距離 = テンプレートの<dmg: 30>、近接 = 下の meleeDamage。Hendrixの公式の防御つき)。
    const DEFAULT_CONFIG = {
        maxHp: 4000, eventId: 3, level: 2, deck: "mixed", allies: 0, autoAttack: true, startDistance: 9, holdDistance: 1.4, meleeTrigger: 2.4, meleeReach: 1,
        phases: [
            { speed: 0.035, cooldown: 150, rangedWindup: 60, meleeWindup: 42, burst: 1, burstGap: 24, meleeDamage: 40 },
            { speed: 0.045, cooldown: 110, rangedWindup: 50, meleeWindup: 36, burst: 2, burstGap: 22, meleeDamage: 45 },
            { speed: 0.055, cooldown: 85, rangedWindup: 44, meleeWindup: 32, burst: 3, burstGap: 20, meleeDamage: 50 }
        ]
    };
    let config = clone(DEFAULT_CONFIG);
    let run = null; // { eventId, startedFrame, ... }
    let startedByUs = false;

    const newRun = (eventId, level, deck) => ({
        eventId, level, deck, frame: 0, phaseFrames: [0, 0, 0], cooldown: 90, burstLeft: 0, burstTimer: 0, burstKind: null, auto: config.autoAttack,
        attacks: [], announced: 0, fired: 0, damaged: 0, byKind: { melee: { announced: 0, fired: 0, damaged: 0 }, ranged: { announced: 0, fired: 0, damaged: 0 } },
        playerLost: 0, bossLost: 0, lastPlayerHp: null, lastBossHp: null, perf: [], perfMax: 0, maxEvents: 0, over: null, lastDistance: null, unsub: []
    });

    // ---------- ボスの体(メモリ上だけでHPを差し替える) ----------
    const eventHpBar = e => { const bars = typeof SceneManager !== "undefined" ? SceneManager._scene?._spriteset?._eventHpBars : null; return Array.isArray(bars) ? bars.find(b => b && b._event === e) : null; };
    const setBossHp = (e, hp) => {
        e.PRmhp = hp; e._maxHp = hp;
        const bar = eventHpBar(e);
        if (bar) { bar._maxHp = hp; bar.currentHp = hp; bar.targetHp = hp; bar._previousHp = hp; bar._lastDrawnHp = null; try { bar.refresh?.(); } catch (_error) { /* 表示のみ */ } }
        if (e.hpStorageId && typeof $gameVariables !== "undefined") $gameVariables._data[e.hpStorageId] = hp;
    };
    const bossEvent = () => (run ? map()?.event(run.eventId) : null);
    const bossHp = () => { const e = bossEvent(); if (!e) return 0; const v = root.ProjectRCardModifiers?.eventHp?.(e.eventId()); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(e.eventId()) ?? 0); };
    const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const playerCenter = () => { const p = $gamePlayer.centerPositionPoint?.(); return p ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 }; };
    const phaseIndex = () => Math.min(2, Math.max(0, bf()?.getState?.()?.phaseIndex ?? 0));
    const alive = () => !!run && !run.over && !!bossEvent() && !bossEvent()._erased && bossHp() > 0;
    const pendingOf = () => (ea()?.list?.() || []).filter(r => r.eventId === run.eventId);

    // ---------- 攻撃(ProjectREnemyAttack の本物の予約) ----------
    const schedule = (kind, windupOverride) => {
        if (!run || !ea()) return fail("unavailable");
        const ph = config.phases[phaseIndex()];
        if (kind === "ranged") {
            const r = te()?.registerBolt?.();
            if (!r?.ok) return fail("boltUnavailable", { detail: r });
            return ea().schedule({ eventId: run.eventId, kind: "ranged", windupFrames: windupOverride ?? ph.rangedWindup, degree: "player", template: te().BOLT, length: 12 });
        }
        return ea().schedule({ eventId: run.eventId, kind: "melee", windupFrames: windupOverride ?? ph.meleeWindup, notetag: `${MELEE_TAG}<dmg: ${ph.meleeDamage}>`, reach: config.meleeReach, activeFrames: 3 });
    };
    const attackNow = kind => (kind === "melee" || kind === "ranged") ? schedule(kind) : fail("invalidKind");

    const onAnnounce = rec => {
        if (!run || rec.eventId !== run.eventId) return;
        run.announced++; run.byKind[rec.kind].announced++;
        const p = playerCenter(), b = eventCenter(bossEvent());
        run.attacks.push({ id: rec.id, kind: rec.kind, phase: phaseIndex(), windup: rec.windup, announcedFrame: run.frame, firedFrame: null, damaged: false, distance: Math.hypot(p.x - b.x, p.y - b.y) });
    };
    const onFire = rec => {
        if (!run || rec.eventId !== run.eventId) return;
        run.fired++; run.byKind[rec.kind].fired++;
        const a = run.attacks.find(x => x.id === rec.id); if (a) a.firedFrame = run.frame;
        if (run.burstLeft > 0 && rec.kind === run.burstKind) { run.burstTimer = Math.max(1, config.phases[phaseIndex()].burstGap); }
    };
    const onCancel = rec => { if (run && rec.eventId === run.eventId) { const a = run.attacks.find(x => x.id === rec.id); if (a) a.cancelled = rec.reason || true; run.burstLeft = 0; } };

    // ---------- 毎フレーム ----------
    const passable = (x, y) => { const m = map(); const tx = Math.floor(x + 0.5), ty = Math.floor(y + 0.5); return m.isValid(tx, ty) && m.checkPassage(tx, ty, 0x0f); };
    const stepTowardPlayer = (e, ph) => {
        const p = playerCenter(), b = eventCenter(e), dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy);
        run.lastDistance = d;
        if (d <= config.holdDistance) return;
        const nx = e._realX + dx / d * ph.speed, ny = e._realY + dy / d * ph.speed;
        if (passable(nx + 0.5, ny + 0.5)) e.setPosition(nx, ny); else if (passable(nx + 0.5, e._realY + 0.5)) e.setPosition(nx, e._realY); else if (passable(e._realX + 0.5, ny + 0.5)) e.setPosition(e._realX, ny);
    };
    const tick = () => {
        const e = bossEvent();
        if (!run || !e || run.over) return;
        run.frame++;
        const pi = phaseIndex(); run.phaseFrames[pi]++;
        const hp = bossHp(), leader = $gameParty.leader();
        if (run.lastBossHp !== null && hp < run.lastBossHp) run.bossLost += run.lastBossHp - hp;
        run.lastBossHp = hp;
        if (leader) { if (run.lastPlayerHp !== null && leader.hp < run.lastPlayerHp) run.playerLost += run.lastPlayerHp - leader.hp; run.lastPlayerHp = leader.hp; }
        run.maxEvents = Math.max(run.maxEvents, map().events().length);
        if (!alive()) return;
        const ph = config.phases[pi], pending = pendingOf();
        if (!pending.length) stepTowardPlayer(e, ph); // 溜めている間は動かない(予兆の位置と実行の位置が一致する)
        if (!run.auto || ($gameParty.leader()?.hp ?? 1) <= 0) return;
        if (pending.length) return;
        if (run.burstLeft > 0) {
            if (run.burstTimer > 0) { run.burstTimer--; return; }
            if (schedule(run.burstKind, Math.max(18, Math.round(ph.rangedWindup * 0.5))).ok) run.burstLeft--;
            return;
        }
        if (run.cooldown > 0) { run.cooldown--; return; }
        const p = playerCenter(), b = eventCenter(e), d = Math.hypot(p.x - b.x, p.y - b.y);
        const kind = d <= config.meleeTrigger ? "melee" : "ranged";
        if (schedule(kind).ok) {
            run.cooldown = ph.cooldown;
            if (kind === "ranged" && ph.burst > 1) { run.burstLeft = ph.burst - 1; run.burstKind = "ranged"; run.burstTimer = 9999; } // 実行(onFire)で間隔を始める
        }
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        const t0 = run ? now() : 0;
        _update.apply(this, arguments);
        if (run && sceneActive && !this.eventsPaused) {
            try { tick(); } catch (error) { run.error = String(error?.message || error); }
            const dt = now() - t0; run.perf.push(dt); if (run.perf.length > 3600) run.perf.shift(); run.perfMax = Math.max(run.perfMax, dt);
        }
    };

    // ---------- 計測 ----------
    const stats = values => {
        if (!values.length) return { n: 0, avg: 0, p95: 0, max: 0 };
        const sorted = [...values].sort((a, b) => a - b);
        return { n: values.length, avg: values.reduce((s, v) => s + v, 0) / values.length, p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))], max: sorted[sorted.length - 1] };
    };
    const outcomes = () => {
        const log = ea()?.getLog?.() || [];
        const damagedIds = new Set(log.filter(l => l.type === "damage").map(l => l.id));
        const allyHits = te()?.getAllyHits?.() || [];
        for (const a of run.attacks) { a.damaged = damagedIds.has(a.id) || allyHits.some(h => h.attackId === a.id); }
        run.damaged = run.attacks.filter(a => a.damaged).length;
        for (const kind of ["melee", "ranged"]) run.byKind[kind].damaged = run.attacks.filter(a => a.kind === kind && a.damaged).length;
    };
    const getReport = () => {
        if (!run) return null;
        outcomes();
        const e = bossEvent(), leader = $gameParty.leader();
        const leads = run.attacks.filter(a => a.firedFrame !== null).map(a => a.firedFrame - a.announcedFrame);
        let vfx = null; try { vfx = root.ProjectRPresentationVfx?.diagnostics?.() ?? null; } catch (_error) { vfx = null; }
        return {
            frame: run.frame, phaseFrames: [...run.phaseFrames], over: run.over, level: run.level, deck: run.deck,
            attacks: { announced: run.announced, fired: run.fired, damaged: run.damaged, byKind: clone(run.byKind), list: run.attacks.map(a => ({ ...a })) },
            windupFrames: stats(leads), playerLost: run.playerLost, bossLost: run.bossLost, playerHp: leader ? leader.hp : null, bossHp: e ? bossHp() : null,
            mapUpdateMs: { ...stats(run.perf), peak: run.perfMax }, maxEvents: run.maxEvents, events: map() ? map().events().length : 0,
            vfxActive: vfx?.active ?? vfx?.activeKeys?.length ?? null, error: run.error ?? null
        };
    };
    const getState = () => {
        if (!run) return null;
        const e = bossEvent(), s = bf()?.getState?.() ?? null;
        return { active: alive(), boss: s, hp: e ? bossHp() : null, x: e ? e._realX : null, y: e ? e._realY : null, pending: ea()?.list?.().filter(r => r.eventId === run.eventId) ?? [], auto: run.auto, distance: run.lastDistance, over: run.over };
    };

    // ---------- 開始・終了 ----------
    const clearShots = () => {
        const m = map(); if (!m) return;
        for (const ev of m.events()) {
            if (!ev || ev._erased) continue;
            const note = ev.event?.()?.note || "";
            if (!/projectRTestEnemy(Bolt|Melee)|projectRBossMelee/.test(note)) continue;
            try { const i = new Game_Interpreter(); i._eventId = ev.eventId(); PluginManager.callCommand(i, "Hendrix_Action_Engine", "DestroyEvent", { target: String(ev.eventId()), destroyNearby: "", permanent: "false" }); } catch (_error) { /* 後片付け */ }
        }
    };
    const finish = reason => {
        if (!run || run.over) return;
        run.over = reason;
        try { ea()?.clear?.("boss:" + reason); } catch (_error) { /* 後片付け */ }
        run.burstLeft = 0;
        clearShots();
    };
    const registerBoss = () => bf().registerBoss({ bossId: BOSS_ID, name: "DEV Boss (A16)", maxHp: config.maxHp, eventId: config.eventId,
        phases: [{ id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", label: "第三形態", hpRatio: 0.33 }] });
    const registerAllies = count => {
        if (!count) return { ok: true };
        const p = party(); if (!p) return fail("partyUnavailable");
        const ids = [2, 3].slice(0, count), events = [5, 6];
        for (const id of ids) p.registerAlly({ actorId: id, name: "DEV仲間" + id, maxHp: 400, normalAttack: { id: "n" + id, range: 1.5, cooldownSeconds: 1 } });
        const r = p.startSession(ids, {});
        if (!r.ok) return fail(r.reason || "partyFailed");
        const c = playerCenter();
        ids.forEach((id, i) => { const e = map().event(events[i]); e.linkedActorId = id; e.setPosition(c.x - 3 - i * 1.5 - 0.5, c.y + (i ? 1.5 : -1.5) - 0.5); });
        return { ok: true, ids };
    };
    const start = (options = {}) => {
        if (run) return fail("alreadyRunning");
        const d = at();
        if (!d || !bf() || !ea() || !te() || !root.ProjectRCombatTestArena) return fail("pluginsUnavailable");
        config = { ...config, ...Object.fromEntries(Object.entries(options).filter(([k]) => k in DEFAULT_CONFIG && k !== "phases")) };
        const level = Math.min(3, Math.max(1, Number(config.level) || 2));
        const gods = config.deck === "apollo" ? ["apollo"] : config.deck === "hermes" ? ["hermes"] : ["apollo", "hermes"];
        for (const god of gods) { const r = d.grantRing(god); if (!r.ok) { d.reset(); return fail("ringFailed", { god, detail: r }); } }
        const unlocked = d.unlock(level, gods);
        if (!unlocked.ok) { d.reset(); return fail("unlockFailed", { detail: unlocked }); }
        const built = config.deck === "mixed" ? d.buildMixedDeck() : d.buildDeck(config.deck);
        if (!built.ok || !built.valid) { d.reset(); return fail("deckInvalid", { reasons: built.reasons, inventoryReasons: built.inventoryReasons }); }
        const battle = d.startDeckBattle(true);
        if (!battle.ok) { d.reset(); return fail("battleFailed", { detail: battle }); }
        startedByUs = true;
        // 最初の手札の指定(DEV): 装備デッキの30枚のうち、指定のカードを先に引く並びで戦闘を始め直す(本物のデッキ・本物のドロー。山札のシャッフルだけを止める)
        let hand = battle.hand;
        if (Array.isArray(options.openingHand) && options.openingHand.length) {
            const cd = root.ProjectRCardDeck, rest = [...cd.getDeck()], want = [];
            for (const id of options.openingHand.slice(0, 5)) { const i = rest.indexOf(id); if (i >= 0) { want.push(id); rest.splice(i, 1); } }
            const order = [...want, ...rest].reverse(), original = Math.random;
            let restarted;
            Math.random = () => 1 - Number.EPSILON;
            try { cd.endCardBattle(); restarted = cd.startCardBattle(order); } finally { Math.random = original; }
            if (!restarted?.ok) { d.reset(); startedByUs = false; return fail("openingHandFailed", { detail: restarted }); }
            hand = cd.getBattleState().hand.map(c => c.cardId);
        }
        const e = map().event(Number(config.eventId));
        if (!e || e._erased) { d.reset(); startedByUs = false; return fail("bossEventMissing"); }
        // 他のダミーは遠くへ(この戦闘の標的にしない)。ボスは主人公の右。
        let parked = 0;
        for (const o of map().events()) { if (o && !o._erased && o !== e && o.event?.()?.note?.includes("<enemy>")) o.setPosition(47 - (parked++ % 20), 2 + Math.floor(parked / 20)); } // ボス以外の<enemy>(アリーナのダミー全部)は遠くの角へ
        const p = playerCenter();
        e.setPosition(p.x + Number(config.startDistance) - 0.5, p.y - 0.5);
        setBossHp(e, Math.max(1, Math.floor(Number(config.maxHp))));
        run = newRun(e.eventId(), level, config.deck);
        registerBoss();
        const started = bf().start(BOSS_ID, {});
        if (!started.ok) { run = null; d.reset(); startedByUs = false; return fail("bossStartFailed", { detail: started }); }
        run.unsub.push(bf().onVictory(() => finish("victory")), bf().onDefeat(() => finish("defeat")));
        run.unsub.push(ea().onAnnounce(onAnnounce), ea().onFire(onFire), ea().onCancel(onCancel));
        te().clearAllyHits?.(); te().watchAllies?.(e.eventId(), true);
        const allies = registerAllies(Number(config.allies) || 0);
        if (!allies.ok) { end(); return fail("alliesFailed", { detail: allies }); }
        const lead = $gameParty.leader(); run.lastPlayerHp = lead ? lead.hp : null; run.lastBossHp = bossHp();
        return { ok: true, bossId: BOSS_ID, eventId: e.eventId(), maxHp: bossHp(), level, deck: config.deck, hand, allies: allies.ids || [] };
    };
    const end = () => {
        if (!run) return { ok: true, ended: false };
        const was = run;
        finish(was.over || "end");
        for (const off of was.unsub) { try { off(); } catch (_error) { /* 後片付け */ } }
        try { te()?.watchAllies?.(was.eventId, false); te()?.clearAllyHits?.(); } catch (_error) { /* 後片付け */ }
        try { if (bf()?.isActive?.()) bf().end("dev"); } catch (_error) { /* 後片付け */ }
        try { if (party()?.isActive?.()) party().endSession(); for (const id of [5, 6]) { const e = map()?.event(id); if (e) e.linkedActorId = 0; } } catch (_error) { /* 後片付け */ }
        run = null;
        let reset = { ok: true };
        if (startedByUs) { try { reset = at().reset(); } catch (error) { reset = fail("resetFailed", { message: String(error?.message || error) }); } startedByUs = false; }
        return { ok: true, ended: true, over: was.over, reset };
    };
    const setAuto = on => { if (run) run.auto = !!on; config.autoAttack = !!on; return !!on; };
    const setConfig = patch => {
        for (const [k, v] of Object.entries(patch || {})) {
            if (k === "phases" && Array.isArray(v)) v.forEach((row, i) => { if (config.phases[i]) Object.assign(config.phases[i], row); });
            else if (k in DEFAULT_CONFIG && k !== "phases") config[k] = v;
        }
        return clone(config);
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { if (run) { try { end(); } catch (_error) { run = null; } } return _setup.apply(this, arguments); };

    root.ProjectRBossTest = Object.freeze({ BOSS_ID, MELEE_TAG, start, end, attackNow, setAuto, setConfig, getConfig: () => clone(config), getReport, getState, defaults: () => clone(DEFAULT_CONFIG) });
})();
