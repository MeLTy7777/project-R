/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR Playtest専用(Phase Apollo-A14): 敵の攻撃の予兆の確認用の敵(遠距離1体・近接1体)。アリーナのダミー(<enemy>)を、一時的に「予約で攻撃する敵」にする。
 * @author ProjectR
 * @base ProjectR_EnemyAttack
 * @orderAfter ProjectR_EnemyAttack
 * @orderAfter ProjectR_CombatTestArena
 *
 * @help
 * ProjectR_CombatTestArenaEnemies.js
 *
 * Playtestでしか有効になりません(本番・通常のプレイでは何もしません)。ストーリーの敵・既存の敵AIは変えません。
 * アリーナ(Map004)にいる動かないダミー(<hp: 魔獣><enemy>)の1体を「遠距離の敵」、別の1体を「近接の敵」として、
 * ProjectREnemyAttack の予約(溜め → 実行)で本当に攻撃させます。予約の記録がそのまま予兆になるので、神託の予測や月桂冠の防御を、実際の攻撃で確かめられます。
 *
 *   ProjectRTestEnemies.attach(eventId, "ranged" | "melee", { windupFrames, cooldownFrames, auto })   そのEventを攻撃する敵にする
 *   ProjectRTestEnemies.attackNow(eventId)    今すぐ1回、攻撃を予約する(溜めが始まる)。{ ok, id }
 *   ProjectRTestEnemies.interrupt(eventId)    その敵の溜め中の攻撃を中断する(ProjectREnemyAttack.interrupt)
 *   ProjectRTestEnemies.setAuto(true/false)   自動で攻撃する(プレイヤーが範囲内にいて、クールダウンが明けたとき)。既定は false(確認用に手動)
 *   ProjectRTestEnemies.detach(eventId) / clear() / list()
 * 【仲間への攻撃(Phase Apollo-A15)】 製品には「敵 → 仲間」のダメージの窓口が無いので、Playtest専用のつなぎを持つ(ProjectR_PartyCombat は変えない)。
 *   敵の攻撃(遠距離の弾・近接の判定)が、出撃中の仲間(PartyCombat + PartyRoster の linkedActorId を持つEvent)の体に当たったら、固定ダメージ(既定30)を
 *   ProjectRPartyCombat.damageAlly で与える(ヒュアキントス・月桂冠の軽減は、この窓口の中で、ダウン判定の前に掛かる)。弾は当たった仲間で消える(主人公に届く前に仲間が受ける)。
 *   ProjectRTestEnemies.attackNow(eventId, { target: "player" | "ally:<actorId>" | 角度(度) })   遠距離の向きを指定する。近接の向きは ProjectREnemyAttack が主人公の方向で決める(仲間を同じ側に置く)。
 *   ProjectRTestEnemies.watchAllies(eventId, on)   brains を使わず ProjectREnemyAttack で直接攻撃する敵(DEVボス)の攻撃も、仲間への当たりを見る。
 *   ProjectRTestEnemies.setAllyDamage(n) / getAllyHits() / clearAllyHits()   ダメージ量と、仲間に当たった記録。
 * 遠距離の弾 = Mapのテンプレート "ProjectR Test Enemy Bolt"(メモリ上だけ。Map002は変えない)。ダメージは固定(<dmg: 30>。Hendrixの公式の防御の計算つき)。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const BOLT = "ProjectR Test Enemy Bolt", BOLT_TAG = "<projectRTestEnemyBolt>", MELEE_NOTE = "<projectRTestEnemyMelee><dmg: 30>";
    const brains = new Map(); // eventId -> { kind, windupFrames, cooldownFrames, cooldown, auto }
    let auto = false;
    const api = () => root.ProjectREnemyAttack;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

    // 遠距離の弾のテンプレート(メモリ上だけ): 黄金の矢のPrefabの「前へ飛ぶ移動ルート + 3600frameで消える」を複製し、Apolloの印を外して、敵の弾の印とダメージを付ける。速さは遅め(確認しやすいよう 3.75マス/秒)。
    const registerBolt = () => {
        if (typeof $dataTemplateMap === "undefined" || !$dataTemplateMap?.events) return fail("templateMapUnavailable");
        if ($dataTemplateMap.events.some(e => e && e.name === BOLT)) return { ok: true, existed: true };
        const source = $dataTemplateMap.events.find(e => e && e.name === "ProjectR Apollo Golden Volley Arrow");
        if (!source) return fail("sourceTemplateMissing");
        const clone = JSON.parse(JSON.stringify(source));
        clone.id = $dataTemplateMap.events.length; clone.name = BOLT; clone.note = `${BOLT_TAG}<dmg: 30><hitbox: 0.3, 0.3>`;
        for (const page of clone.pages || []) page.moveSpeed = 4;
        $dataTemplateMap.events.push(clone);
        return { ok: true, id: clone.id };
    };
    const attach = (eventId, kind, options = {}) => {
        const e = map()?.event(Number(eventId));
        if (!e || e._erased) return fail("eventMissing");
        if (kind !== "ranged" && kind !== "melee") return fail("invalidKind");
        if (!api()) return fail("enemyAttackUnavailable");
        if (kind === "ranged") { const r = registerBolt(); if (!r.ok) return r; }
        brains.set(e.eventId(), { kind, windupFrames: Math.round(options.windupFrames ?? (kind === "ranged" ? 60 : 40)), cooldownFrames: Math.round(options.cooldownFrames ?? 180), cooldown: 0, auto: options.auto === true });
        return { ok: true, eventId: e.eventId(), kind };
    };
    const centerOf = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const degreeToTarget = (e, target) => {
        if (typeof target === "number" && Number.isFinite(target)) return target;
        const m = /^ally:(d+)$/.exec(String(target || ""));
        if (!m) return "player";
        const ally = root.ProjectRPartyRoster?.allies?.({ includeDown: true })?.find(a => a.actorId === Number(m[1]));
        const body = ally && ally.eventId != null ? map()?.event(ally.eventId) : null;
        if (!body || body._erased) return null;
        const a = centerOf(e), b = centerOf(body);
        return ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI) % 360 + 360) % 360;
    };
    const attackNow = (eventId, options = {}) => {
        const brain = brains.get(Number(eventId));
        if (!brain) return fail("notAttached");
        const source = map()?.event(Number(eventId));
        const degree = brain.kind === "ranged" && source ? degreeToTarget(source, options?.target) : "player";
        if (degree === null) return fail("targetMissing");
        const spec = brain.kind === "ranged"
            ? { eventId: Number(eventId), kind: "ranged", windupFrames: brain.windupFrames, degree, template: BOLT, length: 12 }
            : { eventId: Number(eventId), kind: "melee", windupFrames: brain.windupFrames, notetag: MELEE_NOTE, reach: 1, activeFrames: 2 };
        return api().schedule(spec);
    };
    const detach = eventId => { api()?.interrupt?.(Number(eventId), "detached"); return brains.delete(Number(eventId)); };
    const clear = () => { for (const id of [...brains.keys()]) detach(id); };
    const interrupt = eventId => api()?.interrupt?.(Number(eventId), "interrupted") ?? 0;

    // 自動(任意): プレイヤーが範囲内にいて、溜め中でもクールダウン中でもないとき、1回だけ予約する。
    const tick = () => {
        const m = map();
        if (!m || !api()) return;
        const p = $gamePlayer.centerPositionPoint?.() ?? { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 };
        for (const [id, brain] of brains) {
            const e = m.event(id);
            if (!e || e._erased) { brains.delete(id); continue; }
            if (brain.cooldown > 0) { brain.cooldown--; continue; }
            if (!(auto || brain.auto) || api().list().some(r => r.eventId === id)) continue;
            const d = Math.hypot(e._realX + 0.5 - p.x, e._realY + 0.5 - p.y);
            const inRange = brain.kind === "ranged" ? d >= 3 && d <= 14 : d <= 1.8;
            if (inRange && attackNow(id).ok) brain.cooldown = brain.cooldownFrames;
        }
    };
    // ---- 仲間への当たり(Playtest専用のつなぎ) ----
    const ALLY_HIT_RADIUS = 0.55; // ProjectREnemyAttack の主人公への当たり(0.55)と同じ
    let allyDamage = 30;
    const tracked = []; // { attackId, kind, projectileId, hitboxId, frames }
    const watched = new Set(); // brains を使わず ProjectREnemyAttack で直接攻撃する敵(DEVボスなど)の、仲間への当たりも見る
    const allyHits = [];
    const allyBodies = () => {
        const list = root.ProjectRPartyRoster?.allies?.() || [], m = map(), out = [];
        for (const a of list) { const e = a.eventId != null ? m?.event(a.eventId) : null; if (e && !e._erased) out.push({ actorId: a.actorId, key: a.key, center: centerOf(e) }); }
        return out;
    };
    const destroyShot = id => {
        try {
            const i = new Game_Interpreter(); i._eventId = id;
            PluginManager.callCommand(i, "Hendrix_Action_Engine", "DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" });
        } catch (_error) { /* 後片付け */ }
    };
    const hitAlly = (record, body) => {
        const result = root.ProjectRPartyCombat?.damageAlly?.(body.actorId, allyDamage);
        allyHits.push({ attackId: record.attackId, kind: record.kind, actorId: body.actorId, amount: allyDamage, result: result ? { ...result } : null });
        if (allyHits.length > 60) allyHits.shift();
    };
    const trackAllies = () => {
        if (!tracked.length) return;
        const m = map(), bodies = allyBodies();
        for (let i = tracked.length - 1; i >= 0; i--) {
            const t = tracked[i];
            const id = t.kind === "ranged" ? t.projectileId : t.hitboxId;
            const e = id != null ? m.event(id) : null;
            let done = !e || e._erased || --t.frames <= 0;
            if (!done && bodies.length) {
                const c = centerOf(e);
                const hits = bodies.filter(b => t.kind === "ranged" ? Math.hypot(b.center.x - c.x, b.center.y - c.y) <= ALLY_HIT_RADIUS : Math.abs(b.center.x - c.x) <= 0.7 && Math.abs(b.center.y - c.y) <= 0.7)
                    .sort((a, b) => Math.hypot(a.center.x - c.x, a.center.y - c.y) - Math.hypot(b.center.x - c.x, b.center.y - c.y));
                if (hits.length) { hitAlly(t, hits[0]); if (t.kind === "ranged") destroyShot(id); done = true; }
            }
            if (done) tracked.splice(i, 1);
        }
    };
    try {
        api()?.onFire?.(record => {
            if (!brains.has(record.eventId) && !watched.has(record.eventId)) return;
            if (record.kind === "ranged" && record.projectileId != null) tracked.push({ attackId: record.id, kind: "ranged", projectileId: record.projectileId, frames: 3600 });
            else if (record.kind === "melee" && record.hitboxId != null) tracked.push({ attackId: record.id, kind: "melee", hitboxId: record.hitboxId, frames: 4 });
        });
    } catch (_error) { /* 仲間への当たりが使えないだけ */ }

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive && !this.eventsPaused && brains.size) { try { tick(); } catch (_error) { /* DEV用 */ } }
        if (sceneActive && !this.eventsPaused && tracked.length) { try { trackAllies(); } catch (_error) { /* DEV用 */ } }
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { brains.clear(); watched.clear(); tracked.length = 0; return _setup.apply(this, arguments); };

    root.ProjectRTestEnemies = Object.freeze({
        BOLT, BOLT_TAG, MELEE_NOTE, attach, attackNow, detach, clear, interrupt, registerBolt,
        setAuto: on => { auto = !!on; return auto; },
        watchAllies: (eventId, on = true) => { if (on) watched.add(Number(eventId)); else watched.delete(Number(eventId)); return watched.has(Number(eventId)); },
        setAllyDamage: n => { if (Number.isFinite(Number(n)) && Number(n) > 0) allyDamage = Number(n); return allyDamage; },
        getAllyHits: () => allyHits.map(h => ({ ...h })), clearAllyHits: () => { allyHits.length = 0; },
        list: () => [...brains].map(([id, b]) => ({ eventId: id, kind: b.kind, windupFrames: b.windupFrames, cooldown: b.cooldown }))
    });
})();
