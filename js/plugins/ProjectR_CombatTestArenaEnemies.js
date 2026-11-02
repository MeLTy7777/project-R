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
    const attackNow = eventId => {
        const brain = brains.get(Number(eventId));
        if (!brain) return fail("notAttached");
        const spec = brain.kind === "ranged"
            ? { eventId: Number(eventId), kind: "ranged", windupFrames: brain.windupFrames, degree: "player", template: BOLT, length: 12 }
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
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive && !this.eventsPaused && brains.size) { try { tick(); } catch (_error) { /* DEV用 */ } }
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { brains.clear(); return _setup.apply(this, arguments); };

    root.ProjectRTestEnemies = Object.freeze({
        BOLT, BOLT_TAG, MELEE_NOTE, attach, attackNow, detach, clear, interrupt, registerBolt,
        setAuto: on => { auto = !!on; return auto; },
        list: () => [...brains].map(([id, b]) => ({ eventId: id, kind: b.kind, windupFrames: b.windupFrames, cooldown: b.cooldown }))
    });
})();
