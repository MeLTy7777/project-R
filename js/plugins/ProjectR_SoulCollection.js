/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 魂(ソウル)の収集基盤。戦闘中だけ存在する一時オブジェクト。生成・範囲内の回収(壁越え不可)・1回だけの回収・後片付け。回復や強化は持たない。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_PresentationVfx
 * @base ProjectR_GodSummonVisual
 * @base ProjectR_CombatOcclusion
 * @orderAfter ProjectR_GodSummonVisual
 * @orderAfter ProjectR_PresentationVfx
 * @orderAfter ProjectR_CombatOcclusion
 *
 * @param MaxSouls
 * @text 同時に存在できる魂の上限(暫定)
 * @desc 多数の敵が同時に倒れてもEvent・VFXを増やしすぎないための上限。超えたら最も古い魂から外す(回復は得られない)。
 * @type number
 * @min 1
 * @default 60
 *
 * @param MaxSoulVfx
 * @text 同時に表示する魂のVFX数(暫定)
 * @desc 魂そのものは上限までいくつでも存在するが、表示(VFXを結び付ける錨Event)はこの数まで。超えた魂は見た目なしで残り、回収はできる。
 * @type number
 * @min 0
 * @default 30
 *
 * @help
 * ProjectR_SoulCollection.js
 *
 * 【魂とは】敵が倒された場所に現れる、戦闘中だけの一時オブジェクトです。アイテム・通貨・装備ドロップではなく、インベントリにも入らず、
 *   通常のドロップ報酬・ボスのフェーズ・敵の消滅には関係しません。魂そのものはマップのEventではないので、移動の邪魔になりません。
 *   見た目(VFX)を結び付けるための画像なしの「錨Event」(through)を、魂1つにつき最大1つ出します(MaxSoulVfx まで)。錨も移動を妨げません。
 *   保存しません。セーブデータに何も書きません。
 *
 * 【この基盤が持つもの / 持たないもの】
 *   持つ  : 固有ID・位置・生成と同時の重複拒否(同じ敵の同じ死亡から魂は1つ)・範囲内の回収・壁越え不可の判定・1回だけの回収・上限・後片付け・表示(VFX)の呼び出し。
 *   持たない: 回復量・攻撃力上昇・効果時間(これらはカード側 = ProjectR_HermesPsychopomp)。VFXは表示だけで、回収の権限を持たない
 *            (VFXの再生や錨Eventの生成に失敗しても魂・回収・回復は変わらない)。
 *
 * 【回収の規則】collectAround({ center, radius, lineOfSight, filter }) が、距離 <= radius(境界を含む。魂の中心と center の距離)で、
 *   lineOfSight が true のときは ProjectR_CombatOcclusion.firstBlockerBetween(壁 = Region 255 / <VisionWall> / <CombatWall> / 通行不能タイルの縁)に
 *   遮られない魂だけを回収して返します。壁の判定ができない(Occlusionが無い)ときは、回収せず安全側に倒します。
 *   魂は返す前に台帳から外すので、同じ魂が2回回収されることはありません。複数の魂は独立に、生成順(固有IDの昇順)で返します。
 *
 * 【VFX】VFX Designerライブラリ ProjectR_Soul_Manifest(出現)・ProjectR_Soul_Hover(漂う・ループ)・ProjectR_Soul_Collect(回収)。
 *   魂ごとの錨Eventに結び付けて再生する(ProjectR_PresentationVfx の target アンカー)。回収した魂の錨は、回収の光が終わるまで少しだけ残してから消す。
 *
 * API: ProjectRSoulCollection
 *   spawn({ position:{x,y}, enemyKey, level, windowSerial, source }) → { ok, id } | { ok:false, reason }   dedupe: enemyKey が同じ魂は拒否("duplicate")
 *   collectAround({ center, radius, lineOfSight, filter }) → [soul]   filter(soul) が true を返した魂だけを対象にする(省略可)
 *   remove(id, reason) / removeWhere(predicate, reason) / clear(reason)
 *   playAtSoul(soulId, key)   魂の錨Eventに結び付けてVFXを1回出す(Hermesの斬撃の閃光など。回収済みの魂も、錨が残っている間は可。表示だけ)
 *   list() / get(id) / count() / history()   subscribe(id, listener)  listener({ type:"spawn"|"collect"|"remove", soul, reason })
 *   distance(a, b) / blockedBetween(a, b) / diagnostics()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_SoulCollection") : {};
    const toInt = (value, fallback, min) => { const n = Number.parseInt(value, 10); return Number.isFinite(n) && n >= min ? n : fallback; };
    const MAX_SOULS = toInt(params.MaxSouls, 60, 1);
    const MAX_VFX = toInt(params.MaxSoulVfx, 30, 0);
    const COLLECT_LINGER_FRAMES = 40; // 回収の光(8コマ・16fps = 約30frame)が終わるまで錨を残す
    const HISTORY_LIMIT = 60;
    const EPSILON = 1e-9;

    const souls = new Map(); // id -> soul
    const anchors = new Map(); // soulId -> { id(錨), eventId, notes:[...], hover, framesLeft:null|n }
    const dedupe = new Set(); // 生成済みの enemyKey(この戦闘の間)
    const listeners = new Map();
    const history = [];
    const stats = { spawned: 0, collected: 0, removed: 0, duplicates: 0, capacityRemoved: 0, blockedByWall: 0, occlusionUnavailable: 0, vfxSkipped: 0, vfxErrors: 0, listenerErrors: 0 };
    let serial = 0;

    const vfx = () => root.ProjectRPresentationVfx;
    const visual = () => root.ProjectRGodSummonVisual;
    const occlusion = () => root.ProjectR?.CombatOcclusion || null;
    const safely = (callback, fallback) => { try { return callback(); } catch (_error) { return fallback; } };
    const clone = soul => ({ id: soul.id, serial: soul.serial, position: { ...soul.position }, enemyKey: soul.enemyKey, level: soul.level, windowSerial: soul.windowSerial,
        source: soul.source, mapId: soul.mapId, collected: soul.collected, hasVfx: anchors.has(soul.id) });
    const emit = (type, soul, reason) => {
        history.push({ type, id: soul.id, reason: reason ?? null, enemyKey: soul.enemyKey });
        if (history.length > HISTORY_LIMIT) history.shift();
        for (const listener of [...listeners.values()]) {
            try { listener({ type, soul: clone(soul), reason: reason ?? null }); } catch (_error) { stats.listenerErrors++; }
        }
    };

    // ---------- 距離と壁 ----------
    const distance = (a, b) => {
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        const dx = map && typeof map.deltaX === "function" ? map.deltaX(a.x, b.x) : a.x - b.x;
        const dy = map && typeof map.deltaY === "function" ? map.deltaY(a.y, b.y) : a.y - b.y;
        return Math.hypot(dx, dy);
    };
    // true = 壁に遮られる / false = 遮られない / null = 判定できない
    const blockedBetween = (from, to) => {
        const occ = occlusion();
        if (!occ || typeof occ.firstBlockerBetween !== "function") return null;
        return safely(() => !!occ.firstBlockerBetween(from, to, { mode: "combat", unwrapped: true }), null);
    };

    // ---------- 表示(VFX)。表示だけで、失敗しても魂は変わらない ----------
    const playOn = (anchor, key, instance) => {
        const result = safely(() => vfx()?.play?.(key, { eventId: anchor.eventId, instance }), null);
        if (result && result.ok && result.note) anchor.notes.push(result.note);
        return result;
    };
    const showSpawn = soul => {
        if (anchors.size >= MAX_VFX) { stats.vfxSkipped++; return; }
        try {
            const spawned = visual()?.spawnAnchor?.(soul.position, { cardId: "soul" });
            if (!spawned || !spawned.ok) { stats.vfxErrors++; return; }
            const anchor = { id: spawned.id, eventId: spawned.eventId, notes: [], hover: null, framesLeft: null };
            anchors.set(soul.id, anchor);
            playOn(anchor, "hermes_psychopomp.manifest", "m" + soul.id);
            const hover = playOn(anchor, "hermes_psychopomp.soul", "h" + soul.id);
            anchor.hover = hover && hover.ok ? hover.note || null : null;
        } catch (_error) { stats.vfxErrors++; }
    };
    const releaseAnchor = (soulId, immediate) => {
        const anchor = anchors.get(soulId);
        if (!anchor) return;
        if (anchor.hover) { safely(() => vfx()?.stop?.(anchor.hover)); anchor.notes = anchor.notes.filter(n => n !== anchor.hover); anchor.hover = null; }
        if (!immediate) { anchor.framesLeft = COLLECT_LINGER_FRAMES; return; }
        for (const note of anchor.notes) safely(() => vfx()?.stop?.(note));
        safely(() => visual()?.removeAnchor?.(anchor.id));
        anchors.delete(soulId);
    };
    const stepAnchors = () => {
        for (const [soulId, anchor] of [...anchors]) {
            if (anchor.framesLeft === null) continue;
            if (--anchor.framesLeft <= 0) releaseAnchor(soulId, true);
        }
    };

    // ---------- 生成・撤去 ----------
    const currentMapId = () => typeof $gameMap !== "undefined" && $gameMap ? $gameMap.mapId() : 0;
    const spawn = (options = {}) => {
        const position = options.position;
        if (!position || ![position.x, position.y].every(Number.isFinite)) return { ok: false, reason: "invalidPosition" };
        const enemyKey = options.enemyKey === undefined || options.enemyKey === null ? null : String(options.enemyKey);
        if (enemyKey !== null && dedupe.has(enemyKey)) { stats.duplicates++; return { ok: false, reason: "duplicate" }; }
        if (enemyKey !== null) dedupe.add(enemyKey);
        const soul = { id: ++serial, serial, position: { x: position.x, y: position.y }, enemyKey, level: Number.isFinite(Number(options.level)) ? Number(options.level) : 1,
            windowSerial: options.windowSerial ?? null, source: options.source ?? null, mapId: currentMapId(), collected: false };
        souls.set(soul.id, soul);
        stats.spawned++;
        // 上限: 最も古い魂から外す(新しい魂を優先)。
        while (souls.size > MAX_SOULS) {
            const oldest = souls.values().next().value;
            if (!oldest || oldest === soul) break;
            stats.capacityRemoved++;
            remove(oldest.id, "capacity");
        }
        showSpawn(soul);
        emit("spawn", soul);
        return { ok: true, id: soul.id, soul: clone(soul) };
    };
    const remove = (id, reason = "removed") => {
        const soul = souls.get(id);
        if (!soul) return false;
        souls.delete(id);
        stats.removed++;
        releaseAnchor(id, true);
        emit("remove", soul, reason);
        return true;
    };
    const removeWhere = (predicate, reason) => {
        let count = 0;
        for (const soul of [...souls.values()]) if (predicate(clone(soul)) === true && remove(soul.id, reason)) count++;
        return count;
    };
    const clear = (reason = "clear") => {
        for (const soul of [...souls.values()]) remove(soul.id, reason);
        for (const soulId of [...anchors.keys()]) releaseAnchor(soulId, true); // 回収済みで残っていた錨も外す
        dedupe.clear();
    };

    // ---------- 回収 ----------
    const collectAround = (options = {}) => {
        const center = options.center, radius = Number(options.radius);
        if (!center || ![center.x, center.y].every(Number.isFinite) || !(radius >= 0)) return [];
        const needLine = options.lineOfSight !== false;
        const got = [];
        for (const soul of [...souls.values()]) {
            if (soul.collected || soul.mapId !== currentMapId()) continue;
            if (distance(center, soul.position) > radius + EPSILON) continue;
            if (typeof options.filter === "function" && options.filter(clone(soul)) !== true) continue;
            if (needLine) {
                const blocked = blockedBetween(center, soul.position);
                if (blocked === null) { stats.occlusionUnavailable++; continue; } // 判定できない: 安全側(回収しない)
                if (blocked) { stats.blockedByWall++; continue; }
            }
            // 1回だけ: 返す前に台帳から外す。
            soul.collected = true;
            souls.delete(soul.id);
            stats.collected++;
            const anchor = anchors.get(soul.id);
            if (anchor) { releaseAnchor(soul.id, false); playOn(anchor, "hermes_psychopomp.collect", "c" + soul.id); }
            emit("collect", soul);
            got.push(clone(soul));
        }
        return got;
    };

    // ---------- 後片付け ----------
    const deck = root.ProjectRCardDeck;
    // 診断用の件数・履歴は、新しい戦闘の開始で空にする(戦闘をまたいで貯めない)。魂そのものは endBattle / マップ移動で片付く。
    if (deck && typeof deck.startCardBattle === "function") {
        const _startCardBattle = deck.startCardBattle;
        deck.startCardBattle = function() { history.length = 0; for (const key of Object.keys(stats)) stats[key] = 0; return _startCardBattle.apply(this, arguments); };
    }
    if (deck && typeof deck.endBattle === "function") {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear("battleEnd"); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear("mapSetup"); return _setup.apply(this, arguments); };
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            _update.apply(this, arguments);
            if (sceneActive !== false && anchors.size) safely(stepAnchors, null);
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const method of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[method];
            if (typeof original !== "function") continue;
            DataManager[method] = function() { clear(method); return original.apply(this, arguments); };
        }
    }

    root.ProjectRSoulCollection = Object.freeze({
        MAX_SOULS, MAX_VFX,
        spawn, collectAround, remove, removeWhere, clear, distance, blockedBetween,
        playAtSoul: (soulId, key) => { const anchor = anchors.get(soulId); return anchor ? playOn(anchor, key, "s" + soulId) : null; },
        list: () => [...souls.values()].map(clone),
        get: id => souls.has(id) ? clone(souls.get(id)) : null,
        count: () => souls.size,
        history: () => history.map(entry => ({ ...entry })),
        subscribe: (id, listener) => { if (!String(id ?? "") || typeof listener !== "function") return false; listeners.set(String(id), listener); return true; },
        unsubscribe: id => listeners.delete(String(id)),
        diagnostics: () => ({ ...stats, souls: souls.size, anchors: anchors.size, vfxActive: [...anchors.values()].filter(a => a.hover).length, dedupeKeys: dedupe.size })
    });
})();
