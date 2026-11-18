/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR 強敵の攻撃パターンの土台(Stage 7A・DEV): 溜め → 判定 → 硬直の3段階で、予兆と実際の判定が同じ形になる「扇形」と「細い直線」の攻撃。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatOcclusion
 * @orderAfter ProjectR_CombatOcclusion
 * @orderAfter ProjectR_EnemyAttack
 *
 * @help
 * ProjectR_FieldStrongEnemy.js
 *
 * 【目的】 ProjectR には雑魚はいない。強敵・中ボス・ボスの攻撃を、同じ型で増やしていくための土台。
 *   この版(DEV・試作)の攻撃は2つだけ:
 *     cone(扇形)  プレイヤーの方向の正面の扇。横か後ろへ動けばよけられる。
 *     line(直線)  プレイヤーの方向へまっすぐ伸びる細い帯。横へ1歩ずれればよけられる。
 *   どちらも「溜め(windup)→ 判定(active)→ 硬直(recovery)」。溜めの間、予兆(赤い形)が出て、向きは溜めの始まりで固定する(追いかけない)。
 *   予兆の形と、実際の判定の形は同じ多角形(shapePolygon)。壁・閉じた扉(ProjectR_CombatOcclusion の combat)は、判定を通さない(予兆も壁で切って描く)。
 *
 * 【使い方】 敵イベントのメモに <fieldEnemy: strong=dev_strong, reach=2, sight=12, cooldown=80> を書く(戦闘マップ・<fieldBattleMap> のエンカウンター中)。
 *   ProjectR_FieldCombat が毎フレーム update() を呼ぶ。攻撃の選び方は、敵の視界(距離・視野角・壁)で「見えている」ときだけ。
 *     プレイヤーが近い(2.3マス以内)→ cone / 遠い(2.0〜6.2マス)→ line / 両方当てはまる間は交互。
 *   ダメージは Hendrix の公式のコマンド(UpdateEventHp "-damage")。敵データベースの <dmg: 敵名> を使う(式は変えない)。
 *
 * 【API】 ProjectRFieldStrongEnemy
 *   update(ctx) -> { busy, started, finished }   (FieldCombat が呼ぶ)
 *   telegraphs() / get(eventId) / list() / interrupt(eventId, reason) / clear(reason) / onPhase(fn) / getLog() / diagnostics()
 *   shapePolygon(spec, origin, aimDegree) / displayPolygon(eventId) / playerHitTest(eventId) / PROFILES
 *
 * 【実行時の注意】 実行時のみ(セーブしない)。マップ移動・ロード・戦闘の終了・敵の死亡・撤退で、進行中の攻撃はすべて取り消し、ダメージは出さない。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const MAX_LOG = 160;
    const DEG = Math.PI / 180;
    // 試作の強敵 dev_strong。数値は仮(バランスの調整はしない)。frames は 60fps。
    const PROFILES = Object.freeze({
        dev_strong: Object.freeze({
            name: "DEV 強敵", staggerFrames: 24,
            attacks: Object.freeze({
                cone: Object.freeze({ type: "cone", radius: 2.6, halfAngle: 50, arcStep: 6, windup: 54, active: 6, recovery: 42, minRange: 0, maxRange: 2.3, interruptDamage: 100 }),
                line: Object.freeze({ type: "line", length: 7, width: 0.8, windup: 66, active: 6, recovery: 54, minRange: 2.0, maxRange: 6.2, interruptDamage: Infinity })
            })
        })
    });
    const states = new Map();                 // eventId -> { attack, last, count }
    const listeners = new Set();
    const log = [];
    let frameNo = 0, serial = 0, errors = 0;
    const note = entry => { log.push({ frame: frameNo, ...entry }); if (log.length > MAX_LOG) log.shift(); };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const occlusion = () => root.ProjectR && root.ProjectR.CombatOcclusion;
    const normalize = d => ((d % 360) + 360) % 360;
    const bearing = (from, to) => normalize(Math.atan2(to.x - from.x, -(to.y - from.y)) / DEG);
    const dirVec = degree => ({ x: Math.sin(degree * DEG), y: -Math.cos(degree * DEG) });
    const fourDir = deg => (deg >= 315 || deg < 45 ? 8 : deg < 135 ? 6 : deg < 225 ? 2 : 4);
    const hpOf = id => { try { return Number(map().getCurrentEventHp(id)) || 0; } catch (_e) { return 0; } };
    const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const playerCenter = () => { const p = $gamePlayer.centerPositionPoint?.(); return p ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 }; };
    const playerDead = () => { try { return root.ProjectR?.PlayerDeath?.isDead?.() === true; } catch (_e) { return false; } };
    const emit = rec => { for (const fn of [...listeners]) { try { fn(rec); } catch (_e) { /* 通知先の例外で攻撃を止めない */ } } };

    // ---------- 形(予兆と判定で同じ) ----------
    // 扇形: 原点 + 円弧の点(arcStep 度ごと)。半角 60 度以下なので凸。直線: 原点を通る幅 width・長さ length の長方形。
    const shapePolygon = (spec, origin, aim) => {
        const d = dirVec(aim);
        if (spec.type === "line") {
            const nx = -d.y * spec.width / 2, ny = d.x * spec.width / 2, ex = origin.x + d.x * spec.length, ey = origin.y + d.y * spec.length;
            return [{ x: origin.x - nx, y: origin.y - ny }, { x: origin.x + nx, y: origin.y + ny }, { x: ex + nx, y: ey + ny }, { x: ex - nx, y: ey - ny }];
        }
        const n = Math.max(2, Math.ceil(spec.halfAngle * 2 / spec.arcStep)), pts = [{ x: origin.x, y: origin.y }];
        for (let i = 0; i <= n; i++) { const v = dirVec(aim - spec.halfAngle + (spec.halfAngle * 2) * i / n); pts.push({ x: origin.x + v.x * spec.radius, y: origin.y + v.y * spec.radius }); }
        return pts;
    };
    // 予兆として描く形: 壁・閉じた扉で切る(扇は各方向の光線、直線は3本の光線の最短)。壁がなければ shapePolygon とまったく同じ。
    const blockerFraction = (a, from, to) => { const o = occlusion(); const hit = o && o.firstBlockerBetween ? o.firstBlockerBetween(from, to, { mode: "combat", ignoreEventIds: [a.eventId] }) : null; return hit && Number.isFinite(hit.fraction) ? Math.max(0, Math.min(1, hit.fraction)) : 1; };
    const clippedPolygon = a => {
        const base = a.polygon, o = a.origin;
        if (a.spec.type === "line") {
            const d = dirVec(a.aim), nx = -d.y * a.spec.width / 2, ny = d.x * a.spec.width / 2;
            let f = 1;
            for (const k of [-1, 0, 1]) { const s = { x: o.x + nx * k, y: o.y + ny * k }; f = Math.min(f, blockerFraction(a, s, { x: s.x + d.x * a.spec.length, y: s.y + d.y * a.spec.length })); }
            if (f >= 1) return base;
            const L = a.spec.length * f;
            return [{ x: o.x - nx, y: o.y - ny }, { x: o.x + nx, y: o.y + ny }, { x: o.x + d.x * L + nx, y: o.y + d.y * L + ny }, { x: o.x + d.x * L - nx, y: o.y + d.y * L - ny }];
        }
        const out = [base[0]];
        for (let i = 1; i < base.length; i++) { const p = base[i], f = blockerFraction(a, o, p); out.push(f >= 1 ? p : { x: o.x + (p.x - o.x) * f, y: o.y + (p.y - o.y) * f }); }
        return out;
    };
    const playerBody = () => {
        const o = occlusion(); let poly = [];
        try { poly = o && o.eventPolygon ? o.eventPolygon($gamePlayer) : []; } catch (_e) { poly = []; }
        if (poly && poly.length >= 3) return poly;
        const c = playerCenter(); return [{ x: c.x - 0.3, y: c.y - 0.3 }, { x: c.x + 0.3, y: c.y - 0.3 }, { x: c.x + 0.3, y: c.y + 0.3 }, { x: c.x - 0.3, y: c.y + 0.3 }];
    };
    // 判定: プレイヤーの体の形が、攻撃の形と重なり、かつ壁・閉じた扉に遮られずに原点から届くか(ProjectR_CombatOcclusion.hasLineToPolygon。clipPolygon = 攻撃の形)
    const hitNow = a => {
        const o = occlusion(); if (!o || typeof o.hasLineToPolygon !== "function") return false;
        return o.hasLineToPolygon(a.origin, playerBody(), { clipPolygon: a.polygon, mode: "combat", ignoreEventIds: [a.eventId] }) === true;
    };

    // ---------- ダメージ(Hendrix の公式の経路。判定は上の幾何で決め、配送だけ 1x1 の判定で行う) ----------
    const interpreter = eventId => { const i = new Game_Interpreter(); i._eventId = eventId; return i; };
    const command = (eventId, name, args) => PluginManager.callCommand(interpreter(eventId), ENGINE, name, args);
    const notetagOf = e => `<projectRFieldStrong><dmg: ${(e && e.databaseEnemy && e.databaseEnemy.name) || "ゴブリン"}>`;
    const deliver = a => {
        const c = playerCenter();
        command(a.eventId, "spawnEventHitbox", { name: "EnemyAttackHitbox", notetag: a.notetag, comment: "", position: `${c.x - 0.5}, ${c.y - 0.5}`, rotationDegree: "", turnToward: "", attachTo: "", wait: "3" });
        a.delivery = 4;
    };
    const tryDamage = a => {
        if (a.damaged || !(a.delivery > 0)) return;
        a.delivery--;
        if (typeof root.checkCollide !== "function" || !root.checkCollide("player", "<projectRFieldStrong>", 0, 2)) return;
        command(a.eventId, "UpdateEventHp", { eventId: "player", value: "-damage", exceedMaxHealth: "false" });
        a.damaged = true; a.delivery = 0; note({ type: "damage", id: a.id, eventId: a.eventId, kind: a.kind });
    };

    // ---------- 攻撃の進行 ----------
    const stateOf = id => { let s = states.get(id); if (!s) { s = { attack: null, last: null, count: 0 }; states.set(id, s); } return s; };
    const phaseEvent = (a, phase, extra) => { a.phase = phase; const rec = { id: a.id, eventId: a.eventId, kind: a.kind, phase, ...extra }; note({ type: "phase", ...rec }); emit(rec); };
    const finish = (s, reason) => { const a = s.attack; if (!a) return; s.attack = null; note({ type: "end", id: a.id, eventId: a.eventId, kind: a.kind, reason, damaged: a.damaged }); emit({ id: a.id, eventId: a.eventId, kind: a.kind, phase: "end", reason, damaged: a.damaged }); };
    const choose = (profile, s, ctx) => {
        const f = [];
        for (const name of Object.keys(profile.attacks)) { const sp = profile.attacks[name]; if (ctx.dist >= sp.minRange && ctx.dist <= sp.maxRange) f.push(name); }
        if (!f.length) return null;
        const o = occlusion();
        if (o && typeof o.hasLineOfSight === "function" && !o.hasLineOfSight(ctx.center, ctx.player, { mode: "combat", ignoreEventIds: [ctx.eventId] })) return null;      // 届かない攻撃(壁・閉じた扉ごし)は予兆も出さない
        return f.length > 1 ? (f.find(n => n !== s.last) || f[0]) : f[0];
    };
    const start = (e, profile, s, kind, ctx) => {
        const spec = profile.attacks[kind], origin = { x: ctx.center.x, y: ctx.center.y }, aim = bearing(origin, ctx.player);
        const a = { id: ++serial, eventId: ctx.eventId, kind, spec, phase: "windup", frames: spec.windup, total: spec.windup, origin, aim, polygon: shapePolygon(spec, origin, aim), hp0: hpOf(ctx.eventId),
            damaged: false, delivery: 0, notetag: notetagOf(e), profile: ctx.profile };
        s.attack = a; s.last = kind; s.count++;
        try { e.setDirection(fourDir(aim)); } catch (_e) { /* 向きは見た目だけ */ }
        phaseEvent(a, "windup", { aim, windup: spec.windup });
        return a;
    };
    const step = (s, ctx, profile) => {
        const a = s.attack;
        tryDamage(a);
        if (playerDead()) { finish(s, "playerDead"); return { busy: false, finished: true }; }
        if (hpOf(a.eventId) <= 0) { finish(s, "sourceDown"); return { busy: false, finished: true }; }
        if (a.phase === "windup") {
            if (a.hp0 - hpOf(a.eventId) >= a.spec.interruptDamage - 1e-6) { a.interrupted = true; a.frames = profile.staggerFrames; phaseEvent(a, "recovery", { interrupted: true }); return { busy: true }; }
            if (--a.frames <= 0) { a.frames = a.spec.active; phaseEvent(a, "active", {}); }          // 次のフレームから active(判定は active のフレームごとに spec.active 回)
            return { busy: true };
        }
        if (a.phase === "active") {
            if (!a.damaged && a.delivery <= 0 && hitNow(a)) deliver(a);
            tryDamage(a);
            if (--a.frames <= 0) { a.frames = a.spec.recovery; phaseEvent(a, "recovery", {}); }
            return { busy: true };
        }
        if (--a.frames <= 0) { finish(s, a.interrupted ? "interrupted" : "completed"); return { busy: false, finished: true }; }
        return { busy: true };
    };
    // FieldCombat が、強敵(strong=...)のイベントごとに毎フレーム呼ぶ。busy=true の間、FieldCombat は敵を動かさない・ほかの攻撃を始めない。
    const update = ctx => {
        frameNo++;
        try {
            const profile = PROFILES[ctx.profile] || PROFILES.dev_strong, e = map() && map().event(ctx.eventId), s = stateOf(ctx.eventId);
            if (!e || e._erased || hpOf(ctx.eventId) <= 0) { if (s.attack) finish(s, "sourceGone"); return { busy: false }; }
            if (ctx.active === false) { if (s.attack) finish(s, "inactive"); return { busy: false }; }          // 戦闘が終わったあと(撤退・勝利・敗北の移動の間)は、新しい攻撃を始めない・進行中のものは取り消す
            if (s.attack) return step(s, ctx, profile);
            if (ctx.playerDead || !ctx.sees || ctx.cooldown > 0) return { busy: false };
            const kind = choose(profile, s, ctx);
            if (!kind) return { busy: false };
            start(e, profile, s, kind, ctx);
            return { busy: true, started: kind };
        } catch (error) { errors++; note({ type: "error", message: String(error && error.message || error) }); const s = states.get(ctx.eventId); if (s) s.attack = null; return { busy: false }; }
    };
    const interrupt = (eventId, reason = "interrupted") => { const s = states.get(Number(eventId)); if (!s || !s.attack) return false; finish(s, reason); return true; };
    const clear = (reason = "clear") => { for (const s of states.values()) if (s.attack) finish(s, reason); states.clear(); };
    const view = a => ({ id: a.id, eventId: a.eventId, kind: a.kind, phase: a.phase, framesLeft: a.frames, total: a.total, aim: a.aim, origin: { ...a.origin }, damaged: a.damaged, interrupted: !!a.interrupted, hp0: a.hp0 });
    const displayPolygon = eventId => { const s = states.get(Number(eventId)); return s && s.attack ? clippedPolygon(s.attack).map(p => ({ x: p.x, y: p.y })) : null; };
    // 予兆の記録(FieldCombat が赤く描く)。回復(硬直)の間は出さない。
    const telegraphs = () => {
        const out = [];
        for (const s of states.values()) {
            const a = s.attack; if (!a || (a.phase !== "windup" && a.phase !== "active")) continue;
            let polygon; try { polygon = clippedPolygon(a); } catch (_e) { polygon = a.polygon; }
            out.push({ eventId: a.eventId, kind: a.kind, phase: a.phase, progress: a.phase === "active" ? 1 : 1 - a.frames / a.total, polygon: polygon.map(p => ({ x: p.x, y: p.y })) });
        }
        return out;
    };

    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear("load"); return _extract.apply(this, arguments); };
    }
    root.ProjectRFieldStrongEnemy = Object.freeze({
        VERSION: "0.1.0", PROFILES, update, telegraphs, interrupt, clear, shapePolygon, displayPolygon,
        get: id => { const s = states.get(Number(id)); return s && s.attack ? view(s.attack) : null; },
        list: () => [...states.values()].filter(s => s.attack).map(s => view(s.attack)),
        playerHitTest: id => { const s = states.get(Number(id)); return !!(s && s.attack && hitNow(s.attack)); },
        onPhase: fn => { if (typeof fn !== "function") return () => {}; listeners.add(fn); return () => listeners.delete(fn); },
        getLog: () => log.map(e => ({ ...e })),
        diagnostics: () => ({ enemies: states.size, active: [...states.values()].filter(s => s.attack).length, frame: frameNo, serial, errors })
    });
})();
