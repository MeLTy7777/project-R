/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 P0 PoC(オプトイン・検証専用): マップ上で動く敵ハート(見た目+Game_Eventの判定)を出し、既存の攻撃を当てる。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base DotMoveSystem
 * @base ProjectR_CombatSession
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter ProjectR_CombatSession
 *
 * @param HeartEnemyName
 * @text 敵ハートのDB敵キャラ名
 * @desc ハートのHPとダメージ計算(防御・属性)に使うデータベースの敵キャラ名。既存の敵Eventの <hp: 名前> と同じ意味です。
 * @type string
 * @default 魔獣
 *
 * @param HitboxSize
 * @text ハートの判定の大きさ(タイル)
 * @desc ハートの見た目と、Hendrixの当たり判定(正方形)の一辺。見た目と判定は同じ大きさです。
 * @type number
 * @decimals 2
 * @min 0.1
 * @max 3
 * @default 0.8
 *
 * @command StartHeartPoC
 * @text SOUL PoC: 敵ハートを出す
 * @desc 敵ハートを出し、戦闘(カード・HUD)を開始します。プレイヤーの移動は止まります(照準と攻撃は使えます)。
 * @arg centerX
 * @text 中心X(タイル。空=プレイヤーの位置)
 * @type string
 * @default
 * @arg centerY
 * @text 中心Y(タイル。空=プレイヤーの6マス上)
 * @type string
 * @default
 * @arg pattern
 * @text 動き
 * @type select
 * @option 止まる
 * @value static
 * @option 左右に往復
 * @value patrol
 * @option 楕円を回る
 * @value circle
 * @default patrol
 * @arg rangeX
 * @text 動く範囲X(タイル)
 * @type number
 * @decimals 1
 * @min 0
 * @default 3
 * @arg rangeY
 * @text 動く範囲Y(タイル。楕円のみ)
 * @type number
 * @decimals 1
 * @min 0
 * @default 0
 * @arg speed
 * @text 速さ(タイル/秒)
 * @type number
 * @decimals 1
 * @min 0
 * @default 2
 * @arg lockPlayer
 * @text プレイヤーの移動を止める
 * @type boolean
 * @default true
 *
 * @command EndHeartPoC
 * @text SOUL PoC: 終了して元に戻す
 * @desc 敵ハート・見た目・移動の停止・戦闘の開始を元に戻します。
 *
 * @help
 * ProjectR_SoulBattlePoC.js
 *
 * 【位置づけ】 SOUL戦闘の技術検証(P0)です。js/plugins.js に登録しない限り何も起きません(オプトイン)。
 *   本番の戦闘・敵AI・防御ターンは含みません。既存のAction Combatの攻撃(カード・銃・剣)が、動く敵ハートに当たることだけを確かめます。
 *
 * 【構成(既存の機能だけで組んでいます)】
 *   ハートの本体 : Hendrixの Game_Map.spawnEvent で出す Game_Event(<enemy> <hp: DB敵名> <hitbox: n,n> <hideHP>)。
 *                  雛形(テンプレート)はMap002を書き換えず、実行時のメモリ上にだけ追加し、終了時に外します。
 *   当たり判定   : そのEventの <hitbox> を、毎フレーム setPosition で動かします。既存の攻撃(checkCollide)が、そのまま当たります。
 *   ダメージ     : このPluginは HP もダメージも計算しません。既存の UpdateEventHp(-damage) が1回だけ働きます(DamageModifiers等も共通)。
 *   見た目       : ハート型のSpriteを、判定の中心に同期して置きます(Spriteset_Mapのtilemap。メニューから戻ると付け直します)。
 *   戦闘         : ProjectRCombatSession.begin("soul_poc")。既に始まっているカード戦闘は止めません(自分が始めたものだけ終えます)。
 *   操作         : プレイヤーの移動を Hendrix の ControlPlayerMovement で止めます。自分が止めた場合だけ、終了時に戻します。
 *   HPバー       : <hideHP> で表示しません(HPはHendrixが内部で持ちます)。
 *
 * 【終了と復元】 EndHeartPoC / end() のほか、マップ移動・ロード・ニューゲーム・戦闘の外部終了でも自動で元に戻します。
 *   セーブしません(セーブデータに何も書きません)。ハートの敵Eventは非恒久で、ロード後は SaveLoadGuard が取り除きます。
 *
 * API: ProjectRSoulBattlePoC
 *   start({ centerX, centerY, pattern:"static"|"patrol"|"circle", rangeX, rangeY, speed, lockPlayer, combatSession }) -> { ok, reason?, eventId? }
 *        ※ P1のコントローラ(ProjectR_SoulBattle)の動作中は単独では開始できません(reason: "soulBattleActive")。
 *   end(reason?) -> boolean       isActive()
 *   setMotion({ pattern, rangeX, rangeY, speed, centerX, centerY })       pauseMotion(flag)       moveHeartTo(x, y)   (x,y = 判定の中心・タイル)
 *   getState() -> 診断用の状態(位置・判定の中心・見た目の位置・HP)         getLog()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulBattlePoC";
    const ENGINE = "Hendrix_Action_Engine";
    const SOURCE_ID = "soul_poc";
    const HEART_TAG = "<projectRSoulHeartPoC>";
    const TEMPLATE_NAME = "ProjectR SOUL Heart PoC";
    const PATTERNS = Object.freeze(["static", "patrol", "circle"]);
    const MAX_LOG = 60;
    const params = PluginManager.parameters(PLUGIN);
    const number = (value, fallback, min = -Infinity, max = Infinity) => {
        const n = Number(value);
        return value !== "" && value !== undefined && value !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const config = Object.freeze({
        enemyName: params.HeartEnemyName === undefined || String(params.HeartEnemyName).trim() === "" ? "魔獣" : String(params.HeartEnemyName).trim(),
        hitbox: number(params.HitboxSize, 0.8, 0.1, 3)
    });

    let session = null; // 実行中だけ存在する。セーブしない。
    const log = [];
    const note = entry => { log.push(entry); if (log.length > MAX_LOG) log.shift(); };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const scene = () => (typeof SceneManager !== "undefined" ? SceneManager._scene : null);
    const mapScene = () => {
        const current = scene();
        return typeof Scene_Map !== "undefined" && current instanceof Scene_Map ? current : null;
    };
    const command = (name, args, eventId) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId || 0;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const movementLocked = () => (typeof playerMovementDisabled !== "undefined" ? !!playerMovementDisabled : false);

    // ---- 雛形(実行時のメモリ上だけ。Map002のデータは書き換えない) ----
    const addTemplate = () => {
        const events = $dataTemplateMap.events;
        const base = events.find(event => event && event.pages && event.pages[0]);
        if (!base) return null;
        const id = events.length;
        const data = JSON.parse(JSON.stringify(base));
        const page = data.pages[0];
        page.image = { tileId: 0, characterName: "", direction: 2, pattern: 0, characterIndex: 0 };
        page.list = [{ code: 0, indent: 0, parameters: [] }];
        page.through = true;
        page.moveType = 0;
        page.walkAnime = false;
        page.stepAnime = false;
        page.directionFix = true;
        data.id = id;
        data.name = TEMPLATE_NAME;
        data.x = 0;
        data.y = 0;
        data.pages = [page];
        data.note = [HEART_TAG, "<enemy>", `<hp: ${config.enemyName}>`, `<hitbox: ${config.hitbox}, ${config.hitbox}>`, "<hideHP>"].join("\n");
        delete data.meta;
        events[id] = data;
        if (typeof DataManager !== "undefined" && DataManager.extractMetadata) DataManager.extractMetadata(data);
        return { id, data };
    };
    const removeTemplate = s => {
        if (!s.templateId || typeof $dataTemplateMap === "undefined" || !$dataTemplateMap) return;
        const events = $dataTemplateMap.events;
        if (events[s.templateId] === s.templateData) {
            events[s.templateId] = null;
            while (events.length > 1 && !events[events.length - 1]) events.pop();
        }
        s.templateId = 0;
    };

    // ---- 判定の中心 ----
    // Hendrixの <hitbox: w,h> は、Eventのタイルの中心にある矩形。中心 = _realX/_realY + 0.5。
    // CombatOcclusion(公式の攻撃判定の多角形)があれば、その重心との差を一度だけ測って位置合わせに使う。
    const polygonCenter = event => {
        const occlusion = root.ProjectR?.CombatOcclusion;
        if (!occlusion || typeof occlusion.eventPolygon !== "function") return null;
        const polygon = occlusion.eventPolygon(event);
        if (!polygon || !polygon.length) return null;
        return { x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length };
    };
    const hitCenter = (event, offset) => ({ x: event._realX + offset.x, y: event._realY + offset.y });
    const place = (s, x, y) => {
        s.event.setPosition(x - s.offset.x, y - s.offset.y);
    };
    const calibrate = s => {
        s.offset = { x: 0.5, y: 0.5 };
        const measured = polygonCenter(s.event);
        if (measured) s.offset = { x: measured.x - s.event._realX, y: measured.y - s.event._realY };
    };

    // ---- 動き(フレーム数だけで決まる。乱数なし) ----
    const motionPoint = s => {
        const c = s.center;
        if (s.pattern === "patrol" && s.rangeX > 0) {
            const period = 4 * s.rangeX, u = ((s.distance % period) + period) % period;
            return { x: c.x + (u < 2 * s.rangeX ? u - s.rangeX : 3 * s.rangeX - u), y: c.y };
        }
        if (s.pattern === "circle" && (s.rangeX > 0 || s.rangeY > 0)) {
            const angle = s.distance / Math.max(s.rangeX, s.rangeY, 0.01);
            return { x: c.x + Math.cos(angle) * s.rangeX, y: c.y + Math.sin(angle) * s.rangeY };
        }
        return { x: c.x, y: c.y };
    };
    const startDistance = s => (s.pattern === "patrol" ? s.rangeX : 0); // 往復は中心から右向きに出発する
    const advance = s => {
        if (s.paused) return;
        s.frame++;
        s.distance += s.speed / 60;
        const point = motionPoint(s);
        place(s, point.x, point.y);
    };

    // ---- 見た目(ハート型のSprite。判定の中心に置く) ----
    const createSprite = () => {
        const size = Math.max(16, Math.round(config.hitbox * $gameMap.tileWidth()));
        const bitmap = new Bitmap(size, size);
        const c = bitmap.context;
        c.save();
        c.fillStyle = "#ff3355";
        c.strokeStyle = "#ffffff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(size * 0.5, size * 0.95);
        c.bezierCurveTo(size * 0.0, size * 0.55, size * 0.1, size * 0.05, size * 0.5, size * 0.3);
        c.bezierCurveTo(size * 0.9, size * 0.05, size * 1.0, size * 0.55, size * 0.5, size * 0.95);
        c.closePath();
        c.fill();
        c.stroke();
        c.restore();
        if (bitmap._baseTexture && typeof bitmap._baseTexture.update === "function") bitmap._baseTexture.update();
        const sprite = new Sprite(bitmap);
        sprite.anchor.set(0.5, 0.5);
        sprite.z = 5;
        sprite._projectRSoulHeartPoC = true;
        return sprite;
    };
    const syncSprite = s => {
        const current = mapScene();
        const tilemap = current?._spriteset?._tilemap;
        if (!s.sprite || !tilemap) return;
        if (s.sprite.parent !== tilemap) tilemap.addChild(s.sprite); // メニューから戻ってSpritesetが作り直されたときも付け直す
        const c = hitCenter(s.event, s.offset);
        s.sprite.x = Math.round($gameMap.adjustX(c.x) * $gameMap.tileWidth());
        s.sprite.y = Math.round($gameMap.adjustY(c.y) * $gameMap.tileHeight());
        s.sprite.visible = !s.event._erased;
    };

    // ---- 開始 ----
    const normalize = (options, s) => {
        const pattern = options.pattern === undefined || options.pattern === "" ? "patrol" : String(options.pattern);
        if (PATTERNS.indexOf(pattern) < 0) return false;
        s.pattern = pattern;
        s.rangeX = number(options.rangeX, 3, 0, 30);
        s.rangeY = number(options.rangeY, 0, 0, 30);
        s.speed = number(options.speed, 2, 0, 30);
        const player = $gamePlayer;
        const px = player._realX + 0.5, py = player._realY + 0.5;
        s.center = { x: number(options.centerX, px), y: number(options.centerY, py - 6) };
        return true;
    };
    const start = (options = {}) => {
        // P1のコントローラ(ProjectR_SoulBattle)の動作中は、単独の開始を断る。コントローラ自身は managedBy を付けて呼ぶ。
        if (options.managedBy !== "ProjectR_SoulBattle" && root.ProjectRSoulBattle?.getPhase?.() && root.ProjectRSoulBattle.getPhase() !== "idle") return { ok: false, reason: "soulBattleActive" };
        if (session) return { ok: false, reason: "alreadyActive" };
        const current = mapScene();
        if (!map() || typeof $gamePlayer === "undefined" || !current || !current._spriteset) return { ok: false, reason: "mapUnavailable" };
        if (typeof map().spawnEvent !== "function" || typeof root.checkCollide !== "function" ||
                !["DestroyEvent", "ControlPlayerMovement", "UpdateEventHp"].every(name => typeof PluginManager._commands?.[`${ENGINE}:${name}`] === "function")) {
            return { ok: false, reason: "actionCombatUnavailable" };
        }
        if (typeof $dataTemplateMap === "undefined" || !$dataTemplateMap?.events) return { ok: false, reason: "templateMapUnavailable" };
        const s = { mapId: map().mapId(), frame: 0, distance: 0, paused: false, releasing: false, lockedPlayer: false, ownsSession: false,
            templateId: 0, templateData: null, event: null, eventId: 0, hpStorageId: null, sprite: null, offset: { x: 0.5, y: 0.5 } };
        if (!normalize(options, s)) return { ok: false, reason: "invalidPattern" };
        s.distance = startDistance(s);
        try {
            const template = addTemplate();
            if (!template) return release(s, "templateMissing", { failed: true });
            s.templateId = template.id;
            s.templateData = template.data;
            const spawned = map().spawnEvent(s.templateId, s.center.x, s.center.y, false, null);
            const event = spawned ? map().event(spawned) : null;
            if (!event || !event.event()?.note?.includes(HEART_TAG)) return release(s, "spawnFailed", { failed: true });
            s.event = event;
            s.eventId = spawned;
            s.hpStorageId = event.hpStorageId || null;
            calibrate(s);
            place(s, s.center.x, s.center.y);
            if (typeof current._spriteset.refreshEventHpBars === "function") current._spriteset.refreshEventHpBars(); // HPバー(非表示)=HPの保持先を作る
            if (options.combatSession !== false && root.ProjectRCombatSession) {
                const begun = root.ProjectRCombatSession.begin(SOURCE_ID, { requireValidDeck: false });
                if (!begun.ok && begun.reason !== "alreadyActive") return release(s, "combatRejected:" + begun.reason, { failed: true });
                s.ownsSession = begun.ok;
            }
            if (options.lockPlayer !== false && !movementLocked()) {
                command("ControlPlayerMovement", { allowMovement: "false" }, 0);
                s.lockedPlayer = true;
            }
            try { s.sprite = createSprite(); } catch (error) { note({ type: "spriteError", message: String(error?.message || error) }); }
            session = s;
            syncSprite(s);
            note({ type: "start", eventId: s.eventId, pattern: s.pattern, center: { ...s.center } });
            return { ok: true, eventId: s.eventId };
        } catch (error) {
            return release(s, "error:" + String(error?.message || error), { failed: true });
        }
    };

    // ---- 終了・復元 ----
    // opts.eventGone: マップ移動・ロード等でEventごと消える場合は、DestroyEventを呼ばない。
    function release(s, reason, opts = {}) {
        if (s.releasing) return opts.failed ? { ok: false, reason } : false;
        s.releasing = true;
        const steps = [
            () => { if (s.lockedPlayer) command("ControlPlayerMovement", { allowMovement: "true" }, 0); s.lockedPlayer = false; },
            () => { if (s.sprite) { s.sprite.parent?.removeChild?.(s.sprite); s.sprite.destroy?.(); s.sprite = null; } },
            () => {
                const current = map();
                const alive = s.event && !opts.eventGone && current && current.mapId() === s.mapId && current.event(s.eventId) === s.event && !s.event._erased;
                if (alive) command("DestroyEvent", { target: String(s.eventId), destroyNearby: "", permanent: "false" }, s.eventId);
                if (s.hpStorageId && typeof $gameVariables !== "undefined" && $gameVariables?._data) delete $gameVariables._data[s.hpStorageId];
            },
            () => removeTemplate(s),
            () => { if (s.ownsSession && root.ProjectRCombatSession) root.ProjectRCombatSession.end(SOURCE_ID, "soulPoc"); s.ownsSession = false; }
        ];
        for (const step of steps) {
            try { step(); } catch (error) { note({ type: "releaseError", message: String(error?.message || error) }); }
        }
        if (session === s) session = null;
        note({ type: "end", reason, eventId: s.eventId });
        return opts.failed ? { ok: false, reason } : true;
    }
    const end = (reason = "end") => (session ? release(session, reason) : false);

    // ---- 毎フレーム ----
    // 動かす処理は Game_Map.update の先頭(既存の弾の判定より前)で行い、その同じフレームの判定が動いた後の位置を使う。
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            if (session && sceneActive && !this.eventsPaused) {
                try {
                    const s = session;
                    if (s.mapId !== this.mapId()) end("mapChanged");
                    else if (this.event(s.eventId) !== s.event || s.event._erased) end("heartGone");
                    else advance(s);
                } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
            }
            return _update.apply(this, arguments);
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() {
            if (session) release(session, "mapSetup", { eventGone: true });
            return _setup.apply(this, arguments);
        };
    }
    if (typeof Scene_Map !== "undefined") {
        const _sceneUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const result = _sceneUpdate.apply(this, arguments);
            if (session) { try { syncSprite(session); } catch (error) { note({ type: "error", message: String(error?.message || error) }); } }
            return result;
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[name];
            if (typeof original !== "function") continue;
            DataManager[name] = function() {
                if (session) release(session, name, { eventGone: true });
                return original.apply(this, arguments);
            };
        }
    }
    // 戦闘が外から終わったとき(endAllなど)は、PoCも終える。
    if (root.ProjectRCombatSession?.onEnd) {
        root.ProjectRCombatSession.onEnd(payload => { if (session && payload?.sourceId === SOURCE_ID && !session.releasing) release(session, "combatEnded"); });
    }

    // ---- 操作 ----
    const setMotion = (options = {}) => {
        if (!session) return { ok: false, reason: "inactive" };
        const s = session;
        const next = { pattern: s.pattern, rangeX: s.rangeX, rangeY: s.rangeY, speed: s.speed, center: { ...s.center } };
        if (!normalize({ pattern: options.pattern ?? s.pattern, rangeX: options.rangeX ?? s.rangeX, rangeY: options.rangeY ?? s.rangeY, speed: options.speed ?? s.speed,
                centerX: options.centerX ?? s.center.x, centerY: options.centerY ?? s.center.y }, s)) {
            Object.assign(s, next);
            return { ok: false, reason: "invalidPattern" };
        }
        s.distance = startDistance(s);
        const point = motionPoint(s);
        place(s, point.x, point.y);
        return { ok: true };
    };
    const moveHeartTo = (x, y) => {
        if (!session) return { ok: false, reason: "inactive" };
        if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return { ok: false, reason: "invalidPosition" };
        return setMotion({ pattern: "static", centerX: Number(x), centerY: Number(y) });
    };
    const getState = () => {
        const s = session;
        if (!s) return { active: false };
        const c = hitCenter(s.event, s.offset);
        const polygon = polygonCenter(s.event);
        return {
            active: true, eventId: s.eventId, mapId: s.mapId, pattern: s.pattern, rangeX: s.rangeX, rangeY: s.rangeY, speed: s.speed, paused: s.paused, frame: s.frame,
            center: { ...s.center }, position: { x: s.event._realX, y: s.event._realY }, hitCenter: c, polygonCenter: polygon,
            hp: map().getCurrentEventHp(s.eventId), hpStorageId: s.hpStorageId, lockedPlayer: s.lockedPlayer, ownsSession: s.ownsSession, templateId: s.templateId,
            sprite: s.sprite ? { x: s.sprite.x, y: s.sprite.y, visible: s.sprite.visible, attached: !!s.sprite.parent } : null
        };
    };

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "StartHeartPoC", args => {
            const result = start({ centerX: args.centerX, centerY: args.centerY, pattern: args.pattern, rangeX: args.rangeX, rangeY: args.rangeY, speed: args.speed,
                lockPlayer: args.lockPlayer !== "false" });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] start failed:`, result.reason);
        });
        PluginManager.registerCommand(PLUGIN, "EndHeartPoC", () => { end("command"); });
    }

    root.ProjectRSoulBattlePoC = Object.freeze({
        HEART_TAG, SOURCE_ID, PATTERNS,
        start, end, isActive: () => !!session, setMotion, moveHeartTo,
        pauseMotion: flag => { if (!session) return false; session.paused = !!flag; return true; },
        getState, getLog: () => log.map(entry => ({ ...entry }))
    });
})();
