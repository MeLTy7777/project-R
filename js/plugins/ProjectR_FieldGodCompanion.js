/*:
 * @target MZ
 * @plugindesc v0.3.2 ProjectR 神の同行: 常駐の神をプレイヤーの8方向の向きの「背後」へ置き、同じ神の表示を常に1体にする(表示だけ)。
 * @author ProjectR
 * @base ProjectR_GodSummonVisual
 * @base ProjectR_GodSummonManager
 * @orderAfter ProjectR_GodSummonVisual
 * @orderAfter ProjectR_FogOfWar
 * @orderAfter ProjectR_FieldFacing
 *
 * @param Enabled
 * @text 有効
 * @type boolean
 * @default true
 *
 * @param FieldCombatOnly
 * @text 背後への配置・1体化をフィールド戦闘中だけにする
 * @desc false(既定): 常駐の神がプレイヤーに付いてくる所(カード戦闘・テストアリーナ・フィールド戦闘)ならどこでも、背後への配置と1体化を行う。true: ProjectR_FieldCombat のエンカウンターの戦闘中だけ。孤児の片づけは、どちらでもフィールド戦闘中だけ。
 * @type boolean
 * @default false
 *
 * @param BehindTiles
 * @text 背後の距離(tile)
 * @desc プレイヤーの向きの反対側へ、この距離だけ離して置く。神の絵(高さ約2マス・足元が基準)が、プレイヤーの足元・脚に重ならないように、北向き(神が南側)でも足の下に収まる距離。
 * @type number
 * @decimals 2
 * @min 0
 * @default 1.2
 *
 * @param LiftTiles
 * @text 浮かせる高さ(tile。負=上)
 * @type number
 * @decimals 2
 * @default -0.1
 *
 * @param SouthExtraTiles
 * @text 神が南側(画面の下)に来るときの追加の距離(tile)
 * @desc 神の絵(約 44x83px = 1.7 マスの高さ)は足元が基準で、上へ伸びる。神が南側(北向き・北東向き・北西向き)にいると、絵の上端がプレイヤーの足・靴に届く。神の絵が、プレイヤーの足の下端より下に収まるよう、南向きの成分に比例して下げる(北向きで最大。実測: 北向きで合計 約 2 マス = 絵の高さ + 余白)。
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.9
 *
 * @param NorthExtraTiles
 * @text 神が北側(画面の上)に来るときの追加の距離(tile)
 * @desc 南向きのとき、神の絵の下端(足元の少し上)が、プレイヤーの頭の上端に届く。神の絵が、プレイヤーの頭の上に収まるよう、北向きの成分に比例して上げる(南向きで最大)。
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.75
 *
 * @param Smoothing
 * @text 向きが変わったときの追従の滑らかさ(0〜1。1=すぐ)
 * @desc 1フレームに、目標の位置へ近づく割合。向きを変えたとき、神が瞬間移動せず、背後へ滑らかに回り込む。
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 1
 * @default 0.25
 *
 * @help
 * ProjectR_FieldGodCompanion.js (表示だけ。神のDivine HP・崩壊・復帰・カード・スキルの効果/時間は変えない)
 *
 * 既存の ProjectR_GodSummonVisual(神の表示Event: 常駐=プレイヤーの子として左上に固定 / 一時召喚=スキルごとの位置)は変更せず、その表示Eventを毎フレーム調整します。
 *   1. 背後: 常駐の神(Ultimate の神)を、プレイヤーの現在の向きの反対側へ置く。向きは ProjectR_FieldFacing の8方向(戦闘中のマウス照準。N/NE/E/SE/S/SW/W/NW。斜めも)で、
 *      戦闘外は通常の4方向の向き。移動中・向きの変更中も毎フレーム更新(向きが変わると滑らかに回り込む)。台本の神(一時召喚・追従する神)は動かさない。
 *      描く順番: 神は、プレイヤー・ほかのキャラクターの「下」(優先度 0 = 通常のキャラクターより下)に描く。神が南側(北向きのとき)でも、プレイヤーの脚・足元の上に重ならない(背後に控える)。
 *      元の描く順番は、動かないとき(無効・戦闘外)に戻す。
 *   2. 1体だけ: 同じ神の表示Event(常駐・一時召喚・追従する神)が複数あるときは、1体だけ見せる(優先: 追従する神 > 最新の一時召喚 > 常駐)。スキルの演出中は常駐の神を一時的に隠し、
 *      演出が終わると同じ場所(背後)へ戻す。隠すのは透明化だけ(Eventは作り直さない)。
 * 4. FieldCombatOnly=true にすると、フィールド戦闘中だけ動く(それ以外は既存の神の表示のまま。隠したままの神は、戦闘が終わると戻す)。
 *   3. 後始末: GodSummonVisual が管理していない神の表示Event(孤児)は、数フレーム後に片づける。マップ移動・エンカウンターの終了・ロード・戦闘の終了で、状態を捨てる。
 *
 * API: ProjectRFieldGodCompanion
 *   getConfig() / setConfig({ enabled, behindTiles, liftTiles, smoothing }) / resetConfig()   (DEV。保存しない)
 *   getState()        { gods: { godId: { primary: {kind, eventId}, hidden: [eventId] } }, behind: {x, y} }
 *   getVisibleGods()  { godId: 見えている表示Eventの数 }(透明でない・画像あり)
 *   getDiagnostics()  { orphansRemoved, hides, shows, frames, staleSprites }
 */
(() => {
    "use strict";
    const NAME = "ProjectR_FieldGodCompanion", TAG = "<projectRGodVisual>", ENGINE = "Hendrix_Action_Engine";
    const root = typeof window !== "undefined" ? window : globalThis;
    const params = PluginManager.parameters(NAME);
    const finiteOr = (value, fallback, min, max) => { const n = Number(value); return value !== "" && value != null && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback; };
    const cfg = {
        enabled: String(params.Enabled ?? "true") !== "false",
        fieldOnly: String(params.FieldCombatOnly ?? "false") === "true",
        behindTiles: finiteOr(params.BehindTiles, 1.2, 0, 10),
        liftTiles: finiteOr(params.LiftTiles, -0.1, -10, 10),
        southExtraTiles: finiteOr(params.SouthExtraTiles, 0.9, 0, 5),
        northExtraTiles: finiteOr(params.NorthExtraTiles, 0.75, 0, 5),
        smoothing: finiteOr(params.Smoothing, 0.25, 0.01, 1)
    };
    const defaults = { ...cfg };
    const diagnostics = { orphansRemoved: 0, hides: 0, shows: 0, frames: 0, staleSprites: 0, lastError: null };
    const BEHIND = { 8: { x: 0, y: 1 }, 2: { x: 0, y: -1 }, 4: { x: 1, y: 0 }, 6: { x: -1, y: 0 } };      // 4方向の向き → 背後の単位ベクトル(上を向く=南が背後)。8方向の向きが使えないときの代わり
    const offsets = new Map();                                                                          // eventId → 現在の相対位置(なめらかに目標へ)
    const orphanFrames = new Map();
    const visual = () => root.ProjectRGodSummonVisual || null;
    const safe = (fn, fallback) => { try { return fn(); } catch (error) { diagnostics.lastError = String(error && error.message || error); return fallback; } };
    const tagged = event => !!event && String(safe(() => event.event().note, "") || "").includes(TAG);

    // 背後 = プレイヤーの向き(8方向。ProjectR_FieldFacing)の反対側。8方向が使えなければ、4方向の向き
    const behindVector = () => {
        const facing = root.ProjectRFieldFacing;
        const aim = facing && typeof facing.getAim === "function" ? safe(() => facing.getAim(), null) : null;
        if (aim && Number.isFinite(aim.vx) && Number.isFinite(aim.vy)) return { x: -aim.vx, y: -aim.vy };
        const dir = safe(() => $gamePlayer.direction(), 2);
        return BEHIND[dir] || BEHIND[2];
    };
    // 縦の余白: 神の絵は足元が基準で上に約 1.7 マス伸びる。南側(vy > 0)では絵の上端が足・靴に、北側(vy < 0)では絵の下端が頭に届くので、縦の成分に比例して離す
    //   (横に離れる向き(東・西)は、絵が重ならないので、そのまま)。
    const behindTarget = () => { const v = behindVector(); return { x: v.x * cfg.behindTiles, y: v.y * cfg.behindTiles + cfg.liftTiles + (v.y > 0 ? v.y * cfg.southExtraTiles : v.y * cfg.northExtraTiles) }; };

    // 表示Eventの一覧(GodSummonVisual の公開API)。 kind: persistent / transient / follower
    const collect = () => {
        const v = visual(), out = [];
        if (!v) return out;
        for (const r of safe(() => v.getVisuals(), [])) out.push({ kind: r.kind, godId: r.godId, eventId: r.eventId, order: Number(r.summonId) || 0 });
        for (const r of safe(() => v.getFollowers(), [])) if (!r.vanishing) out.push({ kind: "follower", godId: r.godId, eventId: r.eventId, order: 1e9 + r.id });
        return out;
    };
    const RANK = { follower: 3, transient: 2, persistent: 1 };
    const choosePrimary = list => list.reduce((best, r) => (!best || RANK[r.kind] > RANK[best.kind] || (RANK[r.kind] === RANK[best.kind] && r.order > best.order) ? r : best), null);

    // 描画されているか(Event のスプライトが作られている)。新しい表示Eventのスプライトは、生成の次のフレームに作られる
    const hasSprite = event => { const ts = SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap; return !!ts && ts.children.some(s => s && s._character === event); };
    const setHidden = (event, hidden) => {
        if (hidden) {
            if (!event._transparent) { event.setTransparent(true); event._projectRCompanionHidden = true; diagnostics.hides++; }
        } else if (event._projectRCompanionHidden) { event.setTransparent(false); event._projectRCompanionHidden = false; diagnostics.shows++; }
    };
    const placeBehind = event => {
        const p = $gamePlayer, target = behindTarget();
        event.isPlayerChild = false; event.theParent = null;                                           // Hendrix の「プレイヤーの子」の追従を止める(位置はここで決める)
        let o = offsets.get(event.eventId());
        if (!o) { o = { x: event._realX - p._realX, y: event._realY - p._realY }; offsets.set(event.eventId(), o); }
        const k = cfg.smoothing;
        o.x += (target.x - o.x) * k; o.y += (target.y - o.y) * k;
        if (Math.abs(target.x - o.x) < 0.005) o.x = target.x;
        if (Math.abs(target.y - o.y) < 0.005) o.y = target.y;
        event.setPosition(p._realX + o.x, p._realY + o.y);
        // 描く順番: プレイヤー・ほかのキャラクターの下(優先度 0)。南側にいても、プレイヤーの足元・脚の上に重ならない
        if (event._projectRCompanionPrio === undefined) event._projectRCompanionPrio = event._priorityType;
        if (event._priorityType !== 0 && typeof event.setPriorityType === "function") event.setPriorityType(0);
    };

    const destroyOrphan = event => {
        const id = event.eventId();
        try {
            const interpreter = new Game_Interpreter();
            PluginManager.callCommand(interpreter, ENGINE, "DestroyEvent", { target: String(id), destroyNearby: "", permanent: "false" });
        } catch (error) { diagnostics.lastError = String(error && error.message || error); }
        if (!event._erased) safe(() => event.erase(), null);
        orphanFrames.delete(id); offsets.delete(id); diagnostics.orphansRemoved++;
    };
    // GodSummonVisual が管理していない神の表示Event(孤児)を、数フレーム後に片づける。生成の直後の1〜2フレームは待つ。
    const audit = list => {
        const known = new Set(list.map(r => r.eventId));
        const v = visual();
        for (const r of safe(() => v.getAnchors(), [])) known.add(r.eventId);
        for (const e of $gameMap.events()) {
            if (!e || e._erased || !tagged(e)) continue;
            const id = e.eventId();
            if (known.has(id)) { orphanFrames.delete(id); continue; }
            const n = (orphanFrames.get(id) || 0) + 1; orphanFrames.set(id, n);
            if (n >= 3) destroyOrphan(e);
        }
        for (const id of [...orphanFrames.keys()]) { const e = $gameMap.event(id); if (!e || e._erased) orphanFrames.delete(id); }
        for (const id of [...offsets.keys()]) { const e = $gameMap.event(id); if (!e || e._erased) offsets.delete(id); }
        // 孤児のスプライト(Event がもう無いのに残っている描画)は、診断として数える
        const tilemap = SceneManager._scene && SceneManager._scene._spriteset && SceneManager._scene._spriteset._tilemap;
        let stale = 0;
        if (tilemap) for (const s of tilemap.children) { const c = s && s._character; if (c && typeof c.eventId === "function" && tagged(c) && $gameMap.event(c.eventId()) !== c) stale++; }
        diagnostics.staleSprites = stale;
    };

    const fieldActive = () => { const f = root.ProjectRFieldCombat; return !!f && typeof f.isActive === "function" && f.isActive() === true; };
    // 動かない間は、隠していた神を戻して、状態を捨てる(既存の表示のまま)
    // 動かない間は、隠していた神を戻し、背後へ動かしていた常駐の神は、GodSummonVisual の元の位置・追従(プレイヤーの子)へ戻す
    const release = () => {
        if (typeof $gameMap === "undefined" || !$gameMap) return;
        for (const e of $gameMap.events()) if (e && e._projectRCompanionHidden) setHidden(e, false);
        if (offsets.size && typeof $gamePlayer !== "undefined" && $gamePlayer) {
            for (const id of offsets.keys()) {
                const e = $gameMap.event(id);
                if (!e || e._erased || !tagged(e)) continue;
                safe(() => {
                    if (e._projectRCompanionPrio !== undefined) { if (typeof e.setPriorityType === "function") e.setPriorityType(e._projectRCompanionPrio); e._projectRCompanionPrio = undefined; }
                    e.isPlayerChild = true; e.theParent = $gamePlayer; e.lastPlayerX = $gamePlayer._realX; e.lastPlayerY = $gamePlayer._realY;
                    if (Number.isFinite(e.childOffsetX) && Number.isFinite(e.childOffsetY)) e.setPosition($gamePlayer._realX + e.childOffsetX, $gamePlayer._realY + e.childOffsetY);
                }, null);
            }
        }
        offsets.clear(); orphanFrames.clear();
    };
    const update = () => {
        if (typeof $gameMap === "undefined" || !$gameMap || typeof $gamePlayer === "undefined" || !$gamePlayer || $gamePlayer.isTransferring()) return;
        if (!cfg.enabled || (cfg.fieldOnly && !fieldActive())) { release(); return; }
        diagnostics.frames++;
        const list = collect(), byGod = new Map();
        for (const r of list) { if (!byGod.has(r.godId)) byGod.set(r.godId, []); byGod.get(r.godId).push(r); }
        for (const group of byGod.values()) {
            const primary = choosePrimary(group), primaryEvent = primary ? $gameMap.event(primary.eventId) : null;
            const primaryDrawn = !!primaryEvent && !primaryEvent._erased && !primaryEvent._transparent && hasSprite(primaryEvent);      // 新しい表示のスプライトが出るまで、いま見えている方を隠さない(1フレームも消えない)
            for (const r of group) {
                const event = $gameMap.event(r.eventId);
                if (!event || event._erased || !tagged(event)) continue;                                  // 神の表示Event(印あり)だけ動かす(同じ番号の別のイベントを巻き込まない)
                setHidden(event, r !== primary && primaryDrawn);                                         // 同じ神は、1体だけ見せる
                if (r.kind === "persistent") placeBehind(event);                                         // 常駐の神は、隠れている間も背後へ追従する(戻ったとき、飛ばない)
            }
        }
        // 一時召喚などが消えて、隠していた常駐の神だけが残った場合は、上のループで primary になり、setHidden(false) で戻る
        if (fieldActive()) audit(list); else orphanFrames.clear();                                      // 孤児の片づけは、フィールド戦闘中だけ(台本の神の表示を壊さない)
    };

    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (sceneActive) safe(update, null);
    };
    const reset = () => { offsets.clear(); orphanFrames.clear(); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { reset(); return _setup.apply(this, arguments); };
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() { reset(); return _extract.apply(this, arguments); };
    const deck = root.ProjectRCardDeck;
    if (deck && typeof deck.endBattle === "function") {
        const _end = deck.endBattle;
        deck.endBattle = function() { reset(); return _end.apply(this, arguments); };
    }

    const visibleGods = () => {
        const out = {}, v = visual();
        if (!v || typeof $gameMap === "undefined" || !$gameMap) return out;
        for (const r of collect()) {
            const e = $gameMap.event(r.eventId);
            if (e && !e._erased && !e._transparent && e._characterName) out[r.godId] = (out[r.godId] || 0) + 1;
        }
        return out;
    };
    root.ProjectRFieldGodCompanion = {
        getConfig: () => ({ ...cfg }),
        setConfig: o => { const c = o && typeof o === "object" ? o : {}; if (typeof c.enabled === "boolean") cfg.enabled = c.enabled; if (typeof c.fieldOnly === "boolean") cfg.fieldOnly = c.fieldOnly; if (c.behindTiles !== undefined) cfg.behindTiles = finiteOr(c.behindTiles, cfg.behindTiles, 0, 10); if (c.liftTiles !== undefined) cfg.liftTiles = finiteOr(c.liftTiles, cfg.liftTiles, -10, 10); if (c.southExtraTiles !== undefined) cfg.southExtraTiles = finiteOr(c.southExtraTiles, cfg.southExtraTiles, 0, 5); if (c.northExtraTiles !== undefined) cfg.northExtraTiles = finiteOr(c.northExtraTiles, cfg.northExtraTiles, 0, 5); if (c.smoothing !== undefined) cfg.smoothing = finiteOr(c.smoothing, cfg.smoothing, 0.01, 1); return { ...cfg }; },
        resetConfig: () => { Object.assign(cfg, defaults); return { ...cfg }; },
        getState: () => {
            const gods = {};
            for (const r of collect()) { const g = gods[r.godId] || (gods[r.godId] = { primary: null, hidden: [] }); const e = $gameMap.event(r.eventId); if (e && e._projectRCompanionHidden) g.hidden.push(r.eventId); else if (!g.primary || RANK[r.kind] > RANK[g.primary.kind]) g.primary = { kind: r.kind, eventId: r.eventId }; }
            return { gods, behind: behindTarget() };
        },
        getVisibleGods: visibleGods,
        getDiagnostics: () => ({ ...diagnostics, tracked: offsets.size })
    };
})();
