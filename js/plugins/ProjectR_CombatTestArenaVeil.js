/*:
 * @target MZ
 * @plugindesc v1.0.0 DEV専用 Combat Test Arena 追加: ヴェイル用の「DEV敵AI」と「DEV味方(<npc>)」(Playtest限定)。製品の敵AIではない。
 * @author ProjectR
 * @base ProjectR_CombatTestArena
 * @base ProjectR_HermesVeil
 * @base ProjectR_TargetEligibility
 * @base Hendrix_Action_Engine
 * @orderAfter ProjectR_CombatTestArenaHermesB1
 *
 * @help
 * ProjectR_CombatTestArenaVeil.js
 *
 * Playtest専用。製品に共通の敵AIが無い間、ヴェイル(標的の秘匿)がHendrixの敵AIの部品に実際に効くことを確かめるための
 * 検証用フィクスチャです。製品の敵AIの完成を意味しません(ドキュメントでも「DEV敵AIで検証」と「製品AIへの接続は未了」を分けて記録)。
 *
 *   ProjectRVeilTest.ai.enable({ ids: [3, 4], range: 20, target: "player" | "<npc>", move: true })
 *       指定した敵Eventが、毎フレーム Hendrix の window.checkRange(敵, range, target)(= 公式のRange Detection)で標的を探し、
 *       見つかれば moveToClosest('detected event')(= 公式の「検知した標的へ移動」)で追う。製品の敵Eventページと同じ部品を使う。
 *   ProjectRVeilTest.ai.state()     { enabled, ids, enemies:[{ id, state:"idle"|"chase", seen, detected, chaseFrames, idleFrames }], transitions:[...] }
 *   ProjectRVeilTest.ai.disable()
 *   ProjectRVeilTest.ally.spawn(cx, cy) → { ok, eventId }   <npc> の味方(DEV)を、当たり判定の中心が (cx, cy)(タイル)になるように出す(Hendrixの雛形Eventから。見た目だけ画像を足す)。
 *       雛形の「Playerの子」を打ち消し、move() で指定した位置に毎フレーム留める(移動AIを持たない固定の標的)。
 *   ProjectRVeilTest.ally.move(eventId, cx, cy) / remove(eventId) / clear() / list()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;
    const ENGINE = "Hendrix_Action_Engine";
    const ALLY_TAG = "<npc>";
    const TRACE_LIMIT = 40;

    let ai = null; // { ids, range, target, move }
    const stats = new Map(); // eventId -> { state, seen, detected, chaseFrames, idleFrames }
    const transitions = [];
    let frame = 0;
    const allies = new Map(); // eventId -> { image }

    const detectedLabel = event => {
        const d = event?._detectedEvent;
        if (!d) return null;
        return d === $gamePlayer ? "player" : "event:" + (typeof d.eventId === "function" ? d.eventId() : "?");
    };

    const step = () => {
        frame++;
        if (!ai || typeof root.checkRange !== "function") return;
        for (const id of ai.ids) {
            const event = $gameMap.event(id);
            if (!event || event._erased) continue;
            const entry = stats.get(id) || { state: "idle", seen: false, detected: null, chaseFrames: 0, idleFrames: 0 };
            // 公式のRange Detection。見つけたら event._detectedEvent に標的が入る(Hendrixの仕様)。
            const seen = root.checkRange(id, ai.range, ai.target, 0, 0) === true;
            const next = seen ? "chase" : "idle";
            if (next !== entry.state) { transitions.push({ frame, id, from: entry.state, to: next, detected: detectedLabel(event) }); if (transitions.length > TRACE_LIMIT) transitions.shift(); }
            entry.state = next; entry.seen = seen; entry.detected = detectedLabel(event);
            if (seen) {
                entry.chaseFrames++;
                // 公式の「検知した標的へ移動」。標的が無い(秘匿などで外された)と何も起きない。
                if (ai.move && typeof event.moveToClosest === "function") { try { event.moveToClosest("detected event", false, false); } catch (_error) { /* DEVの検証のみ */ } }
            } else entry.idleFrames++;
            stats.set(id, entry);
        }
    };
    const keepAllyImages = () => {
        for (const [id, ally] of [...allies]) {
            const event = $gameMap.event(id);
            if (!event || event._erased) { allies.delete(id); continue; }
            event.isPlayerChild = false; // 雛形の <child of: player> を打ち消す
            event.theParent = null;
            event.setPosition(ally.cx - ally.offset.x, ally.cy - ally.offset.y);
            if (event._characterName !== ally.image.name || event._characterIndex !== ally.image.index) event.setImage(ally.image.name, ally.image.index);
        }
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sceneActive || this.eventsPaused) return;
        try { step(); keepAllyImages(); } catch (_error) { /* DEVの検証のみ */ }
    };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { allies.clear(); stats.clear(); transitions.length = 0; return _setup.apply(this, arguments); };

    const spawnAlly = (x, y, image = { name: "People1", index: 0 }) => {
        const templateId = root.ProjectRGodSummonVisual?.getDiagnostics?.().templateEventId;
        if (!templateId || typeof $gameMap.spawnEvent !== "function") return { ok: false, reason: "templateMissing" };
        const eventId = $gameMap.spawnEvent(templateId, x, y, false);
        const event = eventId ? $gameMap.event(eventId) : null;
        if (!event) return { ok: false, reason: "spawnFailed" };
        // 雛形のデータは全インスタンスで共有なので書き換えず、このEventだけの data を返すようにする(note に <npc>)。
        const data = { ...event.event(), name: "DevAlly", note: ALLY_TAG };
        event.event = function() { return data; };
        event.isPlayerChild = false;
        event.theParent = null;
        event.setImage(image.name, image.index);
        event.setPosition(x - 0.5, y - 0.5);
        const c = event.centerPositionPoint();
        const offset = { x: c.x - event._realX, y: c.y - event._realY }; // 位置→当たり判定の中心のずれ(一定)
        event.setPosition(x - offset.x, y - offset.y);
        allies.set(eventId, { image, cx: x, cy: y, offset });
        return { ok: true, eventId };
    };
    const moveAlly = (eventId, cx, cy) => {
        const ally = allies.get(eventId), event = ally ? $gameMap.event(eventId) : null;
        if (!ally || !event || ![cx, cy].every(Number.isFinite)) return false;
        ally.cx = cx; ally.cy = cy;
        event.setPosition(cx - ally.offset.x, cy - ally.offset.y);
        return true;
    };
    const removeAlly = eventId => {
        if (!allies.has(eventId)) return false;
        allies.delete(eventId);
        try {
            const interpreter = new Game_Interpreter();
            PluginManager.callCommand(interpreter, ENGINE, "DestroyEvent", { target: String(eventId), destroyNearby: "", permanent: "false" });
        } catch (_error) { /* noop */ }
        return true;
    };

    root.ProjectRVeilTest = Object.freeze({
        ai: Object.freeze({
            enable: (options = {}) => {
                const ids = (Array.isArray(options.ids) ? options.ids : [3]).map(Number).filter(Number.isInteger);
                ai = { ids, range: Number(options.range) > 0 ? Number(options.range) : 20, target: options.target || "player", move: options.move !== false };
                stats.clear(); transitions.length = 0;
                return { ok: true, ...ai };
            },
            disable: () => { ai = null; return { ok: true }; },
            state: () => ({ enabled: !!ai, ids: ai ? ai.ids.slice() : [], target: ai ? ai.target : null,
                enemies: [...stats].map(([id, s]) => ({ id, ...s })), transitions: transitions.map(t => ({ ...t })) })
        }),
        ally: Object.freeze({
            spawn: spawnAlly, move: moveAlly, remove: removeAlly,
            clear: () => { for (const id of [...allies.keys()]) removeAlly(id); },
            list: () => [...allies.keys()]
        })
    });
})();
