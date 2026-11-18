/*:
 * @target MZ
 * @plugindesc v0.2.0 ProjectR 強敵の攻撃パターンの土台(Stage 7A・7B・DEV): 溜め → 判定 → 硬直の3段階で、予兆と実際の判定が同じ形になる「扇形」と「細い直線」の攻撃。
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
 *     Stage 7B の選び方(乱数なし。毎回同じ状況なら同じ選択): 距離の範囲に入っていて、その攻撃の形が「いまのプレイヤーの体に実際に届く」ものだけが候補
 *       (壁・閉じた扉を含む。扇形は 1.8 マス以内、直線は 3.0〜5.5 マスが最も向く)。得点 = 距離の適合度(0〜1)− 直前と同じ攻撃の減点(0.5。2回続くと +0.3)+ 向きのずれの小さな加点(同点の判定用)。
 *       端の距離や、直前と同じ攻撃で(適合度 − 減点)が 0.25 未満のときは、もっと良い位置・別の攻撃になるまで待つ(45フレーム待っても変わらなければ撃つ)。選ぶのは、硬直と Cooldown が終わったあとだけ。始まった攻撃の向きは固定のまま。
 *     位置取り(Cooldown の間・見えているときだけ): 直前が cone なら、次の line のために 2.6〜5.0 マスの帯へ(近すぎれば少し下がる。壁で下がれなければ留まる)。直前が line なら、次の cone のために 1.6 マスまで近づく。
 *       見えていないときは、プレイヤーの位置を使った動きも、攻撃の選択もしない。
 *   ダメージは Hendrix の公式のコマンド(UpdateEventHp "-damage")。敵データベースの <dmg: 敵名> を使う(式は変えない)。
 *
 * 【API】 ProjectRFieldStrongEnemy
 *   update(ctx) -> { busy, started, finished, move }   (FieldCombat が呼ぶ。move = 攻撃していないときの位置取り: approach / hold / retreat / default)
 *   telegraphs() / get(eventId) / list() / interrupt(eventId, reason) / clear(reason) / onPhase(fn) / getLog() / diagnostics()
 *   getDecision(eventId) = 直近の選択の記録(候補ごとの 適合度・減点・加点・得点・届くか) / getHistory(eventId) = 直近3回の攻撃の種類
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
                cone: Object.freeze({ type: "cone", radius: 2.6, halfAngle: 50, arcStep: 6, windup: 54, active: 6, recovery: 42, minRange: 0, maxRange: 2.3, fit: Object.freeze([0, 0, 1.8, 2.3]), interruptDamage: 100 }),
                line: Object.freeze({ type: "line", length: 7, width: 0.8, windup: 66, active: 6, recovery: 54, minRange: 2.0, maxRange: 6.2, fit: Object.freeze([2.0, 3.0, 5.5, 6.2]), interruptDamage: Infinity })
            }),
            // 選び方・位置取り(仮の値)。fit = [0 になる近い端, 1 になる近い側, 1 の遠い側, 0 になる遠い端](台形)
            tactics: Object.freeze({ minFit: 0.25, patience: 45, repeat: 0.5, repeat2: 0.3, history: 3, angle: Object.freeze({ wide: 30, narrow: 10, coneBonus: 0.1, lineBonus: 0.05 }),
                band: Object.freeze({ lineMin: 2.6, lineMax: 5.0, coneStop: 1.6 }), retreatStuckFrames: 12 })
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
    const stateOf = id => { let s = states.get(id); if (!s) { s = { attack: null, last: null, count: 0, history: [], waited: 0, decision: null, noRetreat: false, retreatPrev: null, retreatStuck: 0 }; states.set(id, s); } return s; };
    const phaseEvent = (a, phase, extra) => { a.phase = phase; const rec = { id: a.id, eventId: a.eventId, kind: a.kind, phase, ...extra }; note({ type: "phase", ...rec }); emit(rec); };
    const finish = (s, reason) => { const a = s.attack; if (!a) return; s.attack = null; note({ type: "end", id: a.id, eventId: a.eventId, kind: a.kind, reason, damaged: a.damaged }); emit({ id: a.id, eventId: a.eventId, kind: a.kind, phase: "end", reason, damaged: a.damaged }); };
    // ---------- 選び方(Stage 7B) ----------
    const FACING_DEGREE = { 8: 0, 6: 90, 2: 180, 4: 270 };
    const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
    const trapezoid = (d, t) => (d < t[0] || d > t[3] ? 0 : d < t[1] ? (d - t[0]) / (t[1] - t[0]) : d <= t[2] ? 1 : (t[3] - d) / (t[3] - t[2]));
    // いまの状況での候補の評価。候補 = 距離の範囲に入っていて、その形が「いまのプレイヤーの体に実際に届く」(攻撃の判定と同じ hitNow。壁・閉じた扉を含む)もの。
    const evaluate = (profile, s, ctx, e) => {
        const T = profile.tactics, o = occlusion(), rows = {};
        const los = !(o && o.hasLineOfSight) || o.hasLineOfSight(ctx.center, ctx.player, { mode: "combat", ignoreEventIds: [ctx.eventId] });
        const aim = bearing(ctx.center, ctx.player); let off = 0;
        try { const face = FACING_DEGREE[typeof e.direction === "function" ? e.direction() : e._direction]; if (face !== undefined) off = angleDiff(aim, face); } catch (_e) { off = 0; }
        const last = s.history[s.history.length - 1], last2 = s.history[s.history.length - 2];
        for (const name of Object.keys(profile.attacks)) {
            const sp = profile.attacks[name], inRange = ctx.dist >= sp.minRange && ctx.dist <= sp.maxRange;
            const valid = inRange && los && hitNow({ origin: ctx.center, polygon: shapePolygon(sp, ctx.center, aim), eventId: ctx.eventId });
            const fit = trapezoid(ctx.dist, sp.fit), penalty = last === name ? T.repeat + (last2 === name ? T.repeat2 : 0) : 0;
            const bonus = sp.type === "line" ? (off <= T.angle.narrow ? T.angle.lineBonus : 0) : (off >= T.angle.wide ? T.angle.coneBonus : 0);
            rows[name] = { inRange, valid, fit: +fit.toFixed(3), penalty, bonus, score: +(fit - penalty + bonus).toFixed(3) };
        }
        const names = Object.keys(profile.attacks), anyValid = names.some(n => rows[n].valid);
        const ready = names.filter(n => rows[n].valid && (rows[n].fit - rows[n].penalty >= T.minFit || s.waited >= T.patience));          // 履歴の減点を引いた適合度が低いうちは、もっと良い位置(別の攻撃)を待つ
        let chosen = null;
        for (const n of ready) {                                                           // 得点が高い順。同点は「直前と違う攻撃」→ 宣言の順(cone が先)
            if (chosen === null || rows[n].score > rows[chosen].score + 1e-9 || (Math.abs(rows[n].score - rows[chosen].score) <= 1e-9 && chosen === last && n !== last)) chosen = n;
        }
        s.waited = anyValid && chosen === null ? s.waited + 1 : 0;                         // 良い位置を待っている間だけ数える
        return { frame: frameNo, dist: +ctx.dist.toFixed(3), los, off: +off.toFixed(1), chosen, reason: chosen ? "chosen" : !los ? "noLOS" : anyValid ? "waitBetter" : "noCandidate", scores: rows };
    };
    // 攻撃していない間の位置取り(見えているときだけ。見えていなければ呼ばれない)。直前が cone なら次の line のために中距離の帯へ、直前が line なら次の cone のために近づく。
    const reposition = (e, s, ctx, profile) => {
        if (ctx.chase === false) return "default";
        const B = profile.tactics.band, last = s.history[s.history.length - 1], d = ctx.dist;
        if (last === "line") return d <= B.coneStop ? "hold" : "approach";
        if (last !== "cone") return "default";
        if (d > B.lineMax) return "approach";
        if (d >= B.lineMin) return "hold";
        if (s.noRetreat) return "hold";
        // 下がる: プレイヤーと反対の向きへ 1 歩(DotMove の通常の移動。壁・ほかの敵には止められる)。進めない状態が続いたら、その Cooldown の間は下がらない
        if (s.retreatPrev && Math.hypot(e._realX - s.retreatPrev.x, e._realY - s.retreatPrev.y) < 0.002) s.retreatStuck++; else s.retreatStuck = 0;
        if (s.retreatStuck >= profile.tactics.retreatStuckFrames) { s.noRetreat = true; s.retreatPrev = null; return "hold"; }
        s.retreatPrev = { x: e._realX, y: e._realY };
        if (typeof e.dotMoveByDeg === "function") e.dotMoveByDeg(bearing(ctx.player, ctx.center));
        return "retreat";
    };
    const start = (e, profile, s, kind, ctx) => {
        const spec = profile.attacks[kind], origin = { x: ctx.center.x, y: ctx.center.y }, aim = bearing(origin, ctx.player);
        const a = { id: ++serial, eventId: ctx.eventId, kind, spec, phase: "windup", frames: spec.windup, total: spec.windup, origin, aim, polygon: shapePolygon(spec, origin, aim), hp0: hpOf(ctx.eventId),
            damaged: false, delivery: 0, notetag: notetagOf(e), profile: ctx.profile };
        s.attack = a; s.last = kind; s.count++; s.history.push(kind); if (s.history.length > profile.tactics.history) s.history.shift(); s.waited = 0; s.noRetreat = false; s.retreatStuck = 0; s.retreatPrev = null;
        note({ type: "choose", id: a.id, eventId: a.eventId, kind, dist: s.decision && s.decision.dist, scores: s.decision && Object.fromEntries(Object.entries(s.decision.scores).map(([k, v]) => [k, v.score])) });
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
            if (ctx.playerDead || !ctx.sees) { s.waited = 0; s.decision = null; return { busy: false, move: "default" }; }          // 見えていない間は、選ばない・位置を使った動きもしない
            if (!(ctx.cooldown > 0)) {                                                                                   // 選ぶのは、硬直と Cooldown が終わったあと(攻撃の途中では選び直さない)
                const d = evaluate(profile, s, ctx, e); s.decision = d;
                if (d.chosen) { start(e, profile, s, d.chosen, ctx); return { busy: true, started: d.chosen }; }
            }
            return { busy: false, move: reposition(e, s, ctx, profile) };
        } catch (error) { errors++; note({ type: "error", message: String(error && error.message || error) }); const s = states.get(ctx.eventId); if (s) s.attack = null; return { busy: false }; }
    };
    const interrupt = (eventId, reason = "interrupted") => {
        const s = states.get(Number(eventId)); if (!s) return false;
        const had = !!s.attack; if (had) finish(s, reason);
        if (reason === "detach" || reason === "enemyGone") states.delete(Number(eventId));          // 戦闘から外れた敵は、履歴ごと忘れる
        return had;
    };
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
        VERSION: "0.2.0", PROFILES, update, telegraphs, interrupt, clear, shapePolygon, displayPolygon,
        get: id => { const s = states.get(Number(id)); return s && s.attack ? view(s.attack) : null; },
        list: () => [...states.values()].filter(s => s.attack).map(s => view(s.attack)),
        playerHitTest: id => { const s = states.get(Number(id)); return !!(s && s.attack && hitNow(s.attack)); },
        onPhase: fn => { if (typeof fn !== "function") return () => {}; listeners.add(fn); return () => listeners.delete(fn); },
        getLog: () => log.map(e => ({ ...e })),
        getDecision: id => { const s = states.get(Number(id)); return s && s.decision ? JSON.parse(JSON.stringify(s.decision)) : null; },
        getHistory: id => { const s = states.get(Number(id)); return s ? [...s.history] : []; },
        diagnostics: () => ({ enemies: states.size, active: [...states.values()].filter(s => s.attack).length, frame: frameNo, serial, errors })
    });
})();
