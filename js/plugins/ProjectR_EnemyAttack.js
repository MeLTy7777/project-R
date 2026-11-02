/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 敵の攻撃の予約と予兆(Phase Apollo-A14): 敵の遠距離・近接の攻撃を「予約 → 溜め → 実行」で行い、予約そのものを予兆として公開する。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @orderAfter Hendrix_Action_Engine
 *
 * @help
 * ProjectR_EnemyAttack.js
 *
 * 【目的】 敵の攻撃の「予兆(telegraph)」を、本当に予定されている攻撃だけから作る。予測を捏造しない。
 *   予約(schedule)した攻撃は、このプラグインの時計が「溜め(windupFrames)」を数え、0になったらその場で本物のHendrixの攻撃(近接 = spawnEventHitbox /
 *   遠距離 = spawnEvent)を実行する。予兆は、その時計と実行の「同じ記録」なので、予告と実際の攻撃は必ず一致する(向き・位置・タイミングが違うことが無い)。
 *   溜めの途中で敵が倒れた・消えた・攻撃を受けて中断した・マップが変わった・APIで中断した場合は、攻撃は実行されず、予兆も同時に取り消される。
 *   既存の敵(Map001のゴブリンなど、イベントのページに待ち時間と攻撃を書いたもの)は、このAPIを通らないので予兆を出さない(対象外。無理に推測しない)。
 *
 * 【API】 ProjectREnemyAttack
 *   schedule(spec) -> { ok, id } | { ok:false, reason }
 *     spec = { eventId, kind: "ranged" | "melee", windupFrames(1〜600。既定45),
 *              // ranged: degree(0=上・時計回り。数値 or "player" = 予約の瞬間のプレイヤーの方向)、template(Hendrixのテンプレートマップの弾のEvent名)、length(予告する射程。既定12マス)
 *              // melee : notetag(例 "<myAttack><dmg: ゴブリン>")、reach(既定1 = 隣の1マス。向きは予約の瞬間のプレイヤーの方向の上下左右)、activeFrames(判定が残るframe。既定2)
 *              interruptOnDamage(既定 true: 溜めの途中で攻撃を受けたら中断) }
 *   get(id) / list() / getOutcome(id) / getLog() / diagnostics()
 *   cancel(id, reason) / interrupt(eventId, reason)   // その敵の予約をすべて中断する
 *   onAnnounce(fn) / onCancel(fn) / onFire(fn) -> 登録解除する関数。fn(記録)。
 *   clear(reason)
 *   予兆の記録: { id, eventId, kind, state:"pending", framesLeft, windup, degree, origin:{x,y}, length, area:{x,y,width,height}|null, createdFrame }
 *   終わった予約の結果(getOutcome): { id, state:"fired" | "cancelled", reason, frame, projectileId?, hitboxId?, damaged? }
 *
 * 【実行時の注意】 実行時のみ(セーブしない)。マップ移動・ロードですべて取り消す。ダメージは、Hendrixの公式コマンド UpdateEventHp(プレイヤー)を
 *   1つの攻撃につき1回だけ(近接 = 判定が残る間に1回 / 遠距離 = 弾がプレイヤーに届いた瞬間に1回で、その弾は消える)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const MAX_PENDING = 32, MAX_OUTCOMES = 80, MAX_LOG = 120, HIT_RADIUS = 0.55;
    const pending = new Map(); // id -> 記録
    const outcomes = new Map(); // id -> 結果(新しいものから MAX_OUTCOMES 件)
    const watchers = []; // 実行したあとの判定の監視: { kind, attackId, eventId, ... }
    const listeners = { announce: new Set(), cancel: new Set(), fire: new Set() };
    const log = [];
    let serial = 0, frameNo = 0;
    const note = entry => { log.push({ frame: frameNo, ...entry }); if (log.length > MAX_LOG) log.shift(); };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const rad = d => d * Math.PI / 180;
    const normalize = d => ((d % 360) + 360) % 360;
    const eventCenter = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const playerCenter = () => { const p = $gamePlayer.centerPositionPoint?.(); return p ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 }; };
    const degreeBetween = (a, b) => normalize(Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI);
    const hpOf = id => { const v = root.ProjectRCardModifiers?.eventHp?.(id); return Number.isFinite(v) ? v : (map()?.getCurrentEventHp?.(id) ?? 0); };
    const emit = (name, record) => { for (const fn of [...listeners[name]]) { try { fn(record); } catch (_error) { /* 通知先の例外で攻撃を止めない */ } } };
    const interpreter = eventId => { const i = new Game_Interpreter(); i._eventId = eventId; return i; };
    const command = (eventId, name, args) => PluginManager.callCommand(interpreter(eventId), ENGINE, name, args);
    const templateExists = name => typeof $dataTemplateMap !== "undefined" && !!$dataTemplateMap?.events?.some(e => e && e.name === name);
    const remember = outcome => {
        outcomes.set(outcome.id, outcome);
        while (outcomes.size > MAX_OUTCOMES) outcomes.delete(outcomes.keys().next().value);
    };
    const view = r => ({ id: r.id, eventId: r.eventId, kind: r.kind, state: r.state, framesLeft: r.framesLeft, windup: r.windup, degree: r.degree, origin: { ...r.origin }, length: r.length,
        area: r.area ? { ...r.area } : null, createdFrame: r.createdFrame });

    // ---------- 予約 ----------
    const schedule = spec => {
        const m = map();
        if (!m || typeof $gamePlayer === "undefined") return { ok: false, reason: "mapUnavailable" };
        if (!spec || (spec.kind !== "ranged" && spec.kind !== "melee")) return { ok: false, reason: "invalidKind" };
        const event = m.event(Number(spec.eventId));
        if (!event || event._erased) return { ok: false, reason: "sourceGone" };
        if (hpOf(event.eventId()) <= 0) return { ok: false, reason: "sourceDown" };
        const windup = Math.round(spec.windupFrames === undefined ? 45 : Number(spec.windupFrames));
        if (!(windup >= 1 && windup <= 600)) return { ok: false, reason: "invalidWindup" };
        if (pending.size >= MAX_PENDING) return { ok: false, reason: "tooMany" };
        for (const r of pending.values()) if (r.eventId === event.eventId()) return { ok: false, reason: "alreadyScheduled", id: r.id }; // 1体につき同時に1つ(溜め中に別の攻撃を重ねない)
        const origin = eventCenter(event), target = playerCenter();
        const record = { id: ++serial, eventId: event.eventId(), kind: spec.kind, state: "pending", framesLeft: windup, windup, origin, degree: 0, length: 0, area: null, createdFrame: frameNo,
            hp0: hpOf(event.eventId()), interruptOnDamage: spec.interruptOnDamage !== false, spec: { ...spec } };
        if (spec.kind === "ranged") {
            const degree = spec.degree === "player" || spec.degree === undefined ? degreeBetween(origin, target) : Number(spec.degree);
            if (!Number.isFinite(degree)) return { ok: false, reason: "invalidDegree" };
            if (!templateExists(spec.template)) return { ok: false, reason: "templateMissing" };
            record.degree = normalize(degree);
            record.length = Number.isFinite(Number(spec.length)) && Number(spec.length) > 0 ? Number(spec.length) : 12;
        } else {
            if (typeof spec.notetag !== "string" || !/^<[^>]+>/.test(spec.notetag)) return { ok: false, reason: "invalidNotetag" };
            const reach = Math.max(1, Math.round(Number(spec.reach) || 1));
            const dx = target.x - origin.x, dy = target.y - origin.y;
            const step = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || 1, y: 0 } : { x: 0, y: Math.sign(dy) || 1 };
            record.step = { x: step.x * reach, y: step.y * reach };
            record.degree = degreeBetween({ x: 0, y: 0 }, step);
            // 判定のEventは、敵のタイルから (step) 先のタイルに出る(1x1)。予兆の範囲 = そのタイルの中心と大きさ
            record.area = { x: event.x + record.step.x + 0.5, y: event.y + record.step.y + 0.5, width: 1, height: 1 };
            record.length = reach;
        }
        pending.set(record.id, record);
        note({ type: "announce", id: record.id, eventId: record.eventId, kind: record.kind, windup, degree: record.degree });
        emit("announce", view(record));
        return { ok: true, id: record.id, framesLeft: windup };
    };

    // ---------- 取消 ----------
    const cancel = (id, reason = "cancelled") => {
        const r = pending.get(Number(id));
        if (!r) return false;
        pending.delete(r.id);
        r.state = "cancelled";
        remember({ id: r.id, state: "cancelled", reason, frame: frameNo });
        note({ type: "cancel", id: r.id, eventId: r.eventId, reason });
        emit("cancel", { ...view(r), reason });
        return true;
    };
    const interrupt = (eventId, reason = "interrupted") => {
        let n = 0;
        for (const r of [...pending.values()]) if (r.eventId === Number(eventId) && cancel(r.id, reason)) n++;
        return n;
    };
    const clear = (reason = "clear") => {
        for (const r of [...pending.values()]) cancel(r.id, reason);
        watchers.length = 0;
    };

    // ---------- 実行(本物のHendrixの攻撃) ----------
    const tagOf = notetag => (notetag.match(/^<[^>]+>/) || [""])[0];
    const newEventsSince = before => map().events().filter(e => e && !before.has(e)).map(e => e.eventId());
    const fire = r => {
        const m = map(), event = m.event(r.eventId);
        const before = new Set(m.events());
        let result = { ok: true };
        try {
            if (r.kind === "ranged") {
                command(r.eventId, "spawnEvent", { eventId: r.spec.template, position: "this", startDegree: String(r.degree), turnToward: "", notSpawnOn: "", attachTo: "none", gridBased: "false", permanent: "false" });
                const made = newEventsSince(before);
                result.projectileId = made[0] ?? null;
                const bolt = result.projectileId !== null ? m.event(result.projectileId) : null;
                // 予兆の出発点・向きと、実際の弾が一致するように、出た弾を予兆の記録どおりの位置(敵の中心)・向きに合わせる(予測を捏造しない = 予兆が実際の攻撃を決める)
                if (bolt) { try { bolt.setPosition(r.origin.x - 0.5, r.origin.y - 0.5); bolt.rotateTo?.(r.degree); } catch (_error) { /* 位置・向きを合わせられなくても弾は出ている */ } }
                if (result.projectileId !== null) watchers.push({ kind: "projectile", attackId: r.id, eventId: result.projectileId, sourceId: r.eventId, tag: tagOf(r.spec.template ? (m.event(result.projectileId)?.event?.()?.note || "") : ""), damaged: false, age: 0 });
            } else {
                const x = event.x + r.step.x, y = event.y + r.step.y;
                command(r.eventId, "spawnEventHitbox", { name: "EnemyAttackHitbox", notetag: r.spec.notetag, comment: "", position: `this + ${r.step.x}, this + ${r.step.y}`, rotationDegree: "", turnToward: "", attachTo: "",
                    wait: String(Math.max(1, Math.round(Number(r.spec.activeFrames) || 2))) });
                const made = newEventsSince(before);
                result.hitboxId = made[0] ?? null;
                watchers.push({ kind: "melee", attackId: r.id, eventId: result.hitboxId, sourceId: r.eventId, tag: tagOf(r.spec.notetag), framesLeft: Math.max(1, Math.round(Number(r.spec.activeFrames) || 2)) + 1, damaged: false, x, y });
            }
        } catch (error) { result = { ok: false, error: String(error?.message || error) }; }
        pending.delete(r.id);
        r.state = "fired";
        remember({ id: r.id, state: result.ok ? "fired" : "cancelled", reason: result.ok ? "executed" : "executeFailed", frame: frameNo, projectileId: result.projectileId ?? null, hitboxId: result.hitboxId ?? null });
        note({ type: "fire", id: r.id, eventId: r.eventId, kind: r.kind, ...result });
        if (result.ok) emit("fire", { ...view(r), projectileId: result.projectileId ?? null, hitboxId: result.hitboxId ?? null });
        else emit("cancel", { ...view(r), reason: "executeFailed" });
    };
    // プレイヤーへの1回のダメージ(Hendrixの公式。ダメージ量は攻撃のnotetag/テンプレートの <dmg: スキル名>)
    const damagePlayer = (sourceId, tag) => {
        if (!tag || typeof root.checkCollide !== "function") return false;
        if (!root.checkCollide("player", tag, 0, 2)) return false;
        command(sourceId, "UpdateEventHp", { eventId: "player", value: "-damage", exceedMaxHealth: "false" });
        return true;
    };
    const watch = () => {
        for (let i = watchers.length - 1; i >= 0; i--) {
            const w = watchers[i], m = map();
            let done = false;
            try {
                if (w.kind === "melee") {
                    if (!w.damaged && damagePlayer(w.sourceId, w.tag)) { w.damaged = true; markDamaged(w.attackId); }
                    done = --w.framesLeft <= 0 || w.damaged;
                } else {
                    const e = m.event(w.eventId);
                    if (!e || e._erased) { done = true; } // 弾が消えた(壁・寿命・ほかのカードの防御) = ダメージなし
                    else {
                        w.age++;
                        if (!w.tag) w.tag = tagOf(e.event().note || "");
                        // 当たり = Hendrixの当たり判定(プレイヤーに当たっている弾のうち、最もプレイヤーに近い1つだけが、1回のダメージになる)
                        if (!w.damaged && nearestHit(w) && damagePlayer(w.sourceId, w.tag)) {
                            w.damaged = true; markDamaged(w.attackId);
                            try { command(w.eventId, "DestroyEvent", { target: String(w.eventId), destroyNearby: "", permanent: "false" }); } catch (_error) { /* 後片付け */ }
                            done = true;
                        } else if (w.age > 3600) done = true;
                    }
                }
            } catch (error) { note({ type: "error", id: w.attackId, message: String(error?.message || error) }); done = true; }
            if (done) watchers.splice(i, 1);
        }
    };
    const nearestHit = w => {
        const p = playerCenter(), mine = map().event(w.eventId);
        if (!mine) return false;
        const dist = e => { const c = eventCenter(e); return Math.hypot(c.x - p.x, c.y - p.y); };
        const best = watchers.filter(o => o.kind === "projectile" && !o.damaged && map().event(o.eventId) && !map().event(o.eventId)._erased).sort((a, b) => dist(map().event(a.eventId)) - dist(map().event(b.eventId)))[0];
        return best === w;
    };
    const markDamaged = id => { const o = outcomes.get(id); if (o) o.damaged = true; note({ type: "damage", id }); };

    // ---------- 毎フレーム ----------
    const tick = () => {
        frameNo++;
        for (const r of [...pending.values()]) {
            const e = map().event(r.eventId);
            if (!e || e._erased) { cancel(r.id, "sourceGone"); continue; }
            if (hpOf(r.eventId) <= 0) { cancel(r.id, "sourceDown"); continue; }
            if (r.interruptOnDamage && hpOf(r.eventId) < r.hp0 - 1e-6) { cancel(r.id, "interrupted"); continue; }
            if (root.ProjectR?.PlayerDeath?.isDead?.() === true) { cancel(r.id, "playerDead"); continue; }
            if (--r.framesLeft <= 0) fire(r);
        }
        if (watchers.length) watch();
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            if (!sceneActive || this.eventsPaused) return;
            try { tick(); } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear("mapSetup"); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear("load"); return _extract.apply(this, arguments); };
    }

    const on = name => fn => { if (typeof fn !== "function") return () => {}; listeners[name].add(fn); return () => listeners[name].delete(fn); };
    root.ProjectREnemyAttack = Object.freeze({
        MAX_PENDING, schedule, cancel, interrupt, clear,
        get: id => { const r = pending.get(Number(id)); return r ? view(r) : null; },
        list: () => [...pending.values()].map(view),
        getOutcome: id => { const o = outcomes.get(Number(id)); return o ? { ...o } : null; },
        getLog: () => log.map(entry => ({ ...entry })),
        diagnostics: () => ({ pending: pending.size, watchers: watchers.length, outcomes: outcomes.size, frame: frameNo, serial }),
        onAnnounce: on("announce"), onCancel: on("cancel"), onFire: on("fire")
    });
})();
