/*:
 * @target MZ
 * @plugindesc v1.0.0 神の召喚を見える形で表示するプレゼンテーション層（状態は持たない）。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_GodSummonManager
 * @base ProjectR_CombatPresence
 * @orderAfter ProjectR_GodSummonManager
 * @orderAfter ProjectR_CombatPresence
 *
 * @param HermesCharacterName
 * @text Hermes 表示画像（暫定）
 * @desc img/characters のファイル名(拡張子なし)。本番の画像ができたらここだけ差し替えます。
 * @type string
 * @default !Crystal
 *
 * @param HermesCharacterIndex
 * @text Hermes 画像Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @param ApolloCharacterName
 * @text Apollo 表示画像（暫定）
 * @desc img/characters のファイル名(拡張子なし)。本番の画像ができたらここだけ差し替えます。
 * @type string
 * @default !Flame
 *
 * @param ApolloCharacterIndex
 * @text Apollo 画像Index
 * @type number
 * @min 0
 * @max 7
 * @default 0
 *
 * @param PersistentOffsetX
 * @text 常駐神の横位置（Playerからのtile）
 * @type number
 * @decimals 2
 * @default -0.75
 *
 * @param PersistentOffsetY
 * @text 常駐神の縦位置（Playerからのtile）
 * @type number
 * @decimals 2
 * @default -0.75
 *
 * @param TransientOffsetX
 * @text 一時召喚の横位置（Playerからのtile）
 * @type number
 * @decimals 2
 * @default 0.75
 *
 * @param TransientOffsetY
 * @text 一時召喚の縦位置（Playerからのtile）
 * @type number
 * @decimals 2
 * @default -0.75
 *
 * @param TransientHoldFrames
 * @text 一時召喚の表示維持（frame）
 * @desc 論理上の寿命(GodSummonManager)は短いので、見えるように表示だけ延ばします。ゲームの挙動は変わりません。
 * @type number
 * @min 1
 * @default 45
 *
 * @param CardOffsetsJson
 * @text カード別の一時召喚の位置(JSON)
 * @desc {"cardId":{"x":横tile,"y":縦tile}}。指定したカードだけ、一時召喚の表示位置を変える(未指定は上の既定)。絶は主人公の真後ろ(包む位置)。
 * @type note
 * @default {"hermes_zetsu":{"x":0,"y":-0.25}}
 *
 * @help
 * 神の召喚を「見える形」にする表示専用のPluginです。ゲームの状態
 * (Divine HP・崩壊・復帰・一時召喚の寿命・カード消費)は一切持たず、
 * ProjectRGodSummonManagerの状態を毎フレーム読んで、見た目だけを合わせます。
 *
 * 【表示方法】 Action Combat(Hendrix)公式のPrefab + 親子機能を使います。
 *   Map002(テンプレートマップ)の「ProjectR God Visual」(note: <projectRGodVisual>、
 *   コメント <child of: player>)を $gameMap.spawnEvent で生成し、Playerの子として
 *   追従させます。すり抜け(through)・戦闘判定なし・敵の標的にならない・移動を妨げません。
 *   画像は生成後にこのPluginのPlugin Parameterから設定するので、本番の神の画像ができたら
 *   Plugin Parameterを変えるだけで差し替えられます(ゲームのコードは変更不要)。
 *   既定の !Crystal(Hermes) / !Flame(Apollo) は動作確認用の【暫定マーカー】で、
 *   最終的なアートではありません。
 *
 * 【表示される条件】 明示的な戦闘イベント中(ProjectRCombatPresence.isCombatEventActive())
 *   かつ、GodSummonManagerに該当する神がいる間だけ。
 *   ・常駐Ultimate神: 顕現中は表示、崩壊で消え、復帰で再表示。
 *   ・一時召喚: カード発動で現れ、論理寿命が尽きてからTransientHoldFramesの間表示して消えます。
 *   戦闘終了・マップ移動・ロード・戦闘イベント終了ですべて片付けます(Event/Spriteが残りません)。
 *
 * 【API】 ProjectRGodSummonVisual
 *   getVisuals()           表示中の一覧 [{kind, godId, eventId, summonId}]
 *   getTransientEventId(godId)  その神の一時召喚の表示EventId(無ければ0)
 *   swingWeapon(godId, degree)  公式Swing Weaponをその神の表示Eventから出す(失敗はfalse)
 *   getDiagnostics()       最後の失敗理由・生成回数(診断用)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ENGINE = "Hendrix_Action_Engine";
    const TAG = "<projectRGodVisual>";
    const params = PluginManager.parameters("ProjectR_GodSummonVisual");
    const finiteOr = (value, fallback) => Number.isFinite(Number(value)) && String(value).trim() !== "" ? Number(value) : fallback;
    const appearance = {
        hermes: { name: String(params.HermesCharacterName ?? "!Crystal"), index: Math.max(0, Math.floor(finiteOr(params.HermesCharacterIndex, 0))) },
        apollo: { name: String(params.ApolloCharacterName ?? "!Flame"), index: Math.max(0, Math.floor(finiteOr(params.ApolloCharacterIndex, 0))) }
    };
    const persistentOffset = { x: finiteOr(params.PersistentOffsetX, -0.75), y: finiteOr(params.PersistentOffsetY, -0.75) };
    const transientOffset = { x: finiteOr(params.TransientOffsetX, 0.75), y: finiteOr(params.TransientOffsetY, -0.75) };
    const holdFrames = Math.max(1, Math.floor(finiteOr(params.TransientHoldFrames, 45)));
    // カード別の位置。表示だけ(Hendrixの親子追従でPlayerと一緒に動くので、移動後もそのまま付いてくる)。
    const cardOffsets = (() => {
        try {
            const raw = JSON.parse(String(params.CardOffsetsJson === undefined ? '{"hermes_zetsu":{"x":0,"y":-0.25}}' : params.CardOffsetsJson).trim() || "{}");
            const out = {};
            for (const [id, o] of Object.entries(raw || {})) if (o && Number.isFinite(Number(o.x)) && Number.isFinite(Number(o.y))) out[id] = { x: Number(o.x), y: Number(o.y) };
            return out;
        } catch (_error) { return {}; }
    })();

    const visuals = new Map(); // key -> {key, kind, godId, summonId, eventId, map, expireAt}
    const diagnostics = { spawned: 0, removed: 0, swings: 0, lastSwingSource: null, lastError: null, templateEventId: 0 };
    let frame = 0;

    const manager = () => root.ProjectRGodSummonManager || null;
    const presence = () => root.ProjectRCombatPresence || null;
    const note = error => { diagnostics.lastError = String(error?.message || error); };

    const templateEventId = () => {
        if (diagnostics.templateEventId > 0 && $dataTemplateMap?.events?.[diagnostics.templateEventId]) {
            return diagnostics.templateEventId;
        }
        const events = typeof $dataTemplateMap !== "undefined" ? $dataTemplateMap?.events : null;
        if (!Array.isArray(events)) return 0;
        for (let id = 1; id < events.length; id++) {
            if (String(events[id]?.note || "").includes(TAG)) return (diagnostics.templateEventId = id);
        }
        return 0;
    };

    const appearanceFor = godId => appearance[godId] || null;

    const directionFromDegree = degree => {
        if (!Number.isFinite(degree)) return 2;
        const d = ((degree % 360) + 360) % 360;
        if (d >= 315 || d < 45) return 8;
        if (d < 135) return 6;
        if (d < 225) return 2;
        return 4;
    };

    const applyAppearance = (record, event) => {
        const look = appearanceFor(record.godId);
        if (!look || !event) return;
        // Eventのrefreshで画像がテンプレートの空画像に戻るので、毎フレーム確認して戻す。
        if (event._characterName !== look.name || event._characterIndex !== look.index) {
            event.setImage(look.name, look.index);
        }
        if (record.direction && event._direction !== record.direction) event.setDirection(record.direction);
    };

    const liveEvent = record => {
        const event = record.map?.event?.(record.eventId);
        return event && !event._erased && record.map === $gameMap ? event : null;
    };

    const destroyEvent = record => {
        const map = record.map;
        const event = map?.event?.(record.eventId);
        if (!event) return;
        try {
            if (map === $gameMap) {
                const interpreter = new Game_Interpreter();
                PluginManager.callCommand(interpreter, ENGINE, "DestroyEvent",
                    { target: String(record.eventId), destroyNearby: "", permanent: "false" });
            }
        } catch (error) {
            note(error);
        }
    };

    const remove = key => {
        const record = visuals.get(key);
        if (!record) return;
        visuals.delete(key);
        destroyEvent(record);
        diagnostics.removed++;
    };

    const clearAll = () => {
        for (const key of [...visuals.keys()]) remove(key);
        pendingSwings.length = 0;
    };

    const spawn = (key, kind, godId, summonId, baseOffset, direction) => {
        const player = $gamePlayer;
        // 見た目の高さ(CharacterPresentation)に合わせて縦オフセットを拡大。48pxなら無変更(三頭身でも神が体に埋まらない)。
        const offset = root.ProjectRCharacterPresentation?.scaleSummonOffset?.(baseOffset) ?? baseOffset;
        const tid = templateEventId();
        if (!player || !tid || typeof $gameMap.spawnEvent !== "function") {
            diagnostics.lastError = tid ? "playerUnavailable" : "templateMissing";
            return null;
        }
        try {
            const eventId = $gameMap.spawnEvent(tid, player._realX + offset.x, player._realY + offset.y, false);
            if (!eventId) { diagnostics.lastError = "spawnFailed"; return null; }
            const record = { key, kind, godId, summonId, eventId, map: $gameMap, direction, expireAt: null };
            visuals.set(key, record);
            diagnostics.spawned++;
            const event = $gameMap.event(eventId);
            if (event) {
                // 親子(Playerの子)として追従する相対位置は、生成位置から自動で決まる。念のため明示する。
                event.childOffsetX = offset.x;
                event.childOffsetY = offset.y;
                // Hendrixの親子追従は「プレイヤーの移動量」だけを足して動く。生成時に入る lastPlayerX/Y は「位置+オフセット」で、
                // 最初のフレームにずれた量だけ動いてしまい、神がプレイヤーの真上に重なる(実機で確認)。現在位置で上書きして防ぐ。
                if (event.isPlayerChild) {
                    event.lastPlayerX = player._realX;
                    event.lastPlayerY = player._realY;
                }
                applyAppearance(record, event);
            }
            return record;
        } catch (error) {
            note(error);
            return null;
        }
    };

    const wantedNow = () => {
        const m = manager();
        const p = presence();
        const deck = root.ProjectRCardDeck;
        if (!m || !deck?.isCardBattleActive?.() || p?.isCombatEventActive?.() !== true) return [];
        const wanted = [];
        const persistent = m.getPersistentUltimateSummon?.();
        if (persistent) {
            wanted.push({ key: "persistent", kind: "persistent", godId: persistent.godId, summonId: persistent.summonId,
                offset: persistentOffset, direction: 2 });
        }
        for (const summon of m.getActiveSummons?.() || []) {
            wanted.push({ key: `transient:${summon.summonId}`, kind: "transient", godId: summon.godId,
                summonId: summon.summonId, offset: cardOffsets[summon.cardId] || transientOffset, direction: directionFromDegree(summon.degree) });
        }
        return wanted;
    };

    const sync = () => {
        frame++;
        const wanted = wantedNow();
        const wantedKeys = new Set(wanted.map(w => w.key));
        for (const [key, record] of [...visuals]) {
            if (record.map !== $gameMap || !liveEvent(record)) { visuals.delete(key); continue; }
            if (wantedKeys.has(key)) { record.expireAt = null; continue; }
            if (record.kind === "persistent") { remove(key); continue; }
            // 一時召喚: 論理寿命が尽きた後も、見える時間だけ保持する。
            if (record.expireAt === null) record.expireAt = frame + holdFrames;
            if (frame >= record.expireAt) remove(key);
            else if (!presence()?.isCombatEventActive?.()) remove(key);
        }
        for (const w of wanted) {
            if (!visuals.has(w.key)) spawn(w.key, w.kind, w.godId, w.summonId, w.offset, w.direction);
        }
        for (const record of visuals.values()) applyAppearance(record, liveEvent(record));
        flushSwings();
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.apply(this, arguments);
        try {
            if (sceneActive) sync();
        } catch (error) {
            note(error);
        }
    };

    // マップ移動・ロード・戦闘終了ですべて片付ける(見た目だけで、状態は残さない)。
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() {
        visuals.clear(); // 旧マップのEventはマップごと破棄される。
        pendingSwings.length = 0;
        return _Game_Map_setup.apply(this, arguments);
    };
    const deck = root.ProjectRCardDeck;
    if (deck?.endBattle) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() {
            try { clearAll(); } catch (error) { note(error); }
            return _endBattle.apply(this, arguments);
        };
    }
    const _extract = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function() {
        visuals.clear();
        return _extract.apply(this, arguments);
    };

    const getTransientEventId = godId => {
        for (const record of visuals.values()) {
            if (record.kind === "transient" && (!godId || record.godId === godId) && liveEvent(record)) return record.eventId;
        }
        return 0;
    };

    // 公式 Swing Weapon を神の表示Eventから出す。コマンドはEventIdを受け取り、そのEventの向きで振る。
    // 一時召喚の表示Eventはカード発動の「次のマップ更新」で現れるため、要求は一度預かって
    // 表示Eventが現れた時点で実行する(数フレーム待っても現れなければPlayerから振る)。
    const pendingSwings = [];
    const SWING_WAIT_FRAMES = 4;
    const runSwing = (swing, eventId) => {
        const event = eventId ? $gameMap.event(eventId) : null;
        // 神の表示Eventは向き固定(directionFix)なので setDirection は無視され、MZ実機では振りがいつも同じ向き(右→下)になっていた。
        // 公式Swing Weaponは生成の瞬間にEventの向きだけを読むので、その間だけ向きを直接差し替え、すぐ元に戻す。
        const hadDirection = event && Number.isFinite(swing.degree) ? event._direction : undefined;
        try {
            if (hadDirection !== undefined) event._direction = directionFromDegree(swing.degree);
            const interpreter = new Game_Interpreter();
            PluginManager.callCommand(interpreter, ENGINE, "SwingWeapon", {
                weaponSprite: swing.weaponSprite, eventId: eventId ? String(eventId) : "player", offset: "0, -15",
                zIndex: "same", style: "clockwise", speed: "10",
                visualSettings: JSON.stringify({ traitEffect: "true", traitColor: "", traitBlend: "screen", traitOrder: "above" })
            });
            diagnostics.swings++;
            diagnostics.lastSwingSource = eventId ? "god:" + eventId : "player";
            return true;
        } catch (error) {
            note(error);
            return false;
        } finally {
            if (hadDirection !== undefined) event._direction = hadDirection;
        }
    };
    const flushSwings = () => {
        for (const swing of pendingSwings.splice(0)) {
            const eventId = getTransientEventId(swing.godId);
            if (eventId || frame - swing.frame >= SWING_WAIT_FRAMES) runSwing(swing, eventId);
            else pendingSwings.push(swing);
        }
    };
    const swingWeapon = (godId, degree, weaponSprite = "Pan") => {
        if (typeof $gameMap === "undefined" || !$gameMap) return false;
        pendingSwings.push({ godId, degree, weaponSprite, frame });
        return true;
    };

    root.ProjectRGodSummonVisual = {
        getVisuals: () => [...visuals.values()].map(r => ({ kind: r.kind, godId: r.godId, eventId: r.eventId, summonId: r.summonId })),
        getTransientEventId,
        swingWeapon,
        getAppearance: godId => ({ ...appearanceFor(godId) }),
        getDiagnostics: () => ({ ...diagnostics, visualCount: visuals.size, templateEventId: templateEventId() })
    };
})();
