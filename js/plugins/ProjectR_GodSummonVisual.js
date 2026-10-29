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
 * @desc {"cardId":{"x":横tile,"y":縦tile,"forward":前方tile}}。指定したカードだけ、一時召喚の表示位置を変える(未指定は上の既定)。絶は主人公の真後ろ(包む位置)。forwardは発動時の向き(マウス方向。方向を使わないカードは主人公の向き)の前方へ。
 * @type note
 * @default {"hermes_zetsu":{"x":0,"y":-0.25},"hermes_sweep":{"forward":0.95,"y":-0.15},"hermes_reed_flute":{"forward":0.95,"y":-0.15},"hermes_issen":{"forward":0.95,"y":-0.15},"hermes_strength":{"x":0,"y":-0.25}}
 *
 * @param VanishNoiseCardIds
 * @text 黒いノイズとともに消える神のカードID(JSON配列)
 * @desc 一時召喚の表示が終わる少し前に、神の位置へ黒いノイズ(PresentationVfx "hermes.vanish")を重ねてから消す。表示のみ。
 * @type note
 * @default ["hermes_sweep","hermes_reed_flute","hermes_issen","hermes_strength"]
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
 *   dash(godId, degree, tiles, frames)  その神の表示Eventを、発動の向きへ tiles マス、frames かけて移動させる(一閃。表示だけ。Hermesが駆ける見た目)
 *   requestBalloon(godId, balloonId)  標準のふきだし(3=音符 など)をその神の表示Eventへ出す(一時召喚の表示Eventが現れるまで預かる)
 *   spawnFollower(godId, point, { cardId })  { ok, id, eventId }  任意のマップ位置(タイル単位の中心)に神の表示Eventを出す(ヴェイル: マウスに追従する神。Playerの子にはならない。表示だけ)
 *   moveFollower(id, point) / vanishFollower(id) / removeFollower(id) / getFollowers()
 *   spawnAnchor(point, { cardId }) / removeAnchor(id) / getAnchors()  画像なしの「錨」Event(魂のVFXをワールドの位置に結び付ける。through。getFollowers() には含めない。H2B-3B)
 *   swingFollower(id, degree, weaponSprite)  追従する神の表示Eventから公式Swing Weaponを出す(H2B-3B。vanish中は出さない。表示だけ)
 *     vanishFollower は黒いノイズ(hermes.vanish)を重ねてから短いframe後に破棄する。毎フレーム、位置はこのAPIで渡された点に合わせる。
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
    const DEFAULT_CARD_OFFSETS = '{"hermes_zetsu":{"x":0,"y":-0.25},"hermes_sweep":{"forward":0.95,"y":-0.15},"hermes_reed_flute":{"forward":0.95,"y":-0.15},"hermes_issen":{"forward":0.95,"y":-0.15},"hermes_strength":{"x":0,"y":-0.25}}';
    const cardOffsets = (() => {
        try {
            const raw = JSON.parse(String(params.CardOffsetsJson === undefined ? DEFAULT_CARD_OFFSETS : params.CardOffsetsJson).trim() || "{}");
            const out = {};
            for (const [id, o] of Object.entries(raw || {})) {
                if (!o || typeof o !== "object") continue;
                const x = o.x === undefined ? 0 : Number(o.x), y = o.y === undefined ? 0 : Number(o.y);
                const forward = o.forward === undefined ? null : Number(o.forward);
                if (Number.isFinite(x) && Number.isFinite(y) && (forward === null || Number.isFinite(forward))) out[id] = { x, y, forward };
            }
            return out;
        } catch (_error) { return {}; }
    })();
    const vanishCards = (() => {
        try {
            const list = JSON.parse(String(params.VanishNoiseCardIds === undefined ? '["hermes_sweep","hermes_reed_flute","hermes_issen","hermes_strength"]' : params.VanishNoiseCardIds).trim() || "[]");
            return new Set(Array.isArray(list) ? list.map(String) : []);
        } catch (_error) { return new Set(); }
    })();
    const VANISH_LEAD_FRAMES = 8; // 消える(表示Eventの破棄)のこのframe前に黒いノイズを重ねる
    const degreeFromDirection = direction => ({ 8: 0, 6: 90, 2: 180, 4: 270 })[direction];
    // カード別の位置。forwardがあれば発動時の向き(マウス方向。無ければ主人公の向き)の前方へずらす。
    const offsetForSummon = summon => {
        const entry = cardOffsets[summon.cardId];
        if (!entry) return transientOffset;
        if (entry.forward === null) return { x: entry.x, y: entry.y };
        const degree = Number.isFinite(summon.degree) ? summon.degree : degreeFromDirection($gamePlayer?.direction?.()) ?? 180;
        const radians = degree * Math.PI / 180;
        return { x: entry.x + Math.sin(radians) * entry.forward, y: entry.y - Math.cos(radians) * entry.forward };
    };
    const facingDegreeOf = summon => Number.isFinite(summon.degree) ? summon.degree : degreeFromDirection($gamePlayer?.direction?.());

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
        if (record.anchor && event) { // 画像なしの錨: 常に空の画像のまま(テンプレートのrefreshで戻っても空)
            if (event._characterName !== "" || event._characterIndex !== 0) event.setImage("", 0);
            return;
        }
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
        for (const id of [...followers.keys()]) removeFollower(id);
        for (const key of [...visuals.keys()]) remove(key);
        pendingSwings.length = 0;
        pendingBalloons.length = 0;
        pendingDashes.length = 0;
        dashes.clear();
    };

    const spawn = (key, kind, godId, summonId, baseOffset, direction, cardId) => {
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
            const record = { key, kind, godId, summonId, eventId, map: $gameMap, direction, expireAt: null, cardId: cardId || null, vanished: false };
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
                summonId: summon.summonId, offset: offsetForSummon(summon), direction: directionFromDegree(facingDegreeOf(summon)), cardId: summon.cardId });
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
            // 黒いノイズとともに消える神(表示のみ): 消える少し前に神の位置へノイズを重ね、ノイズの途中で表示Eventを破棄する。
            if (!record.vanished && record.cardId && vanishCards.has(record.cardId) && frame >= record.expireAt - VANISH_LEAD_FRAMES) {
                record.vanished = true;
                try { root.ProjectRPresentationVfx?.play?.("hermes.vanish", { eventId: record.eventId }); } catch (error) { note(error); }
            }
            if (frame >= record.expireAt) remove(key);
            else if (!presence()?.isCombatEventActive?.()) remove(key);
        }
        for (const w of wanted) {
            if (!visuals.has(w.key)) spawn(w.key, w.kind, w.godId, w.summonId, w.offset, w.direction, w.cardId);
        }
        for (const record of visuals.values()) applyAppearance(record, liveEvent(record));
        flushSwings();
    };

    const _Game_Map_update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _Game_Map_update.apply(this, arguments);
        try {
            if (sceneActive) { sync(); updateFollowers(); }
        } catch (error) {
            note(error);
        }
    };

    // マップ移動・ロード・戦闘終了ですべて片付ける(見た目だけで、状態は残さない)。
    const _Game_Map_setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() {
        visuals.clear(); // 旧マップのEventはマップごと破棄される。
        followers.clear();
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
        followers.clear();
        return _extract.apply(this, arguments);
    };

    // ---- 追従する神(カーソル)。一時召喚(論理アンカー)とは別管理で、位置は呼び出し側が毎フレーム渡す点に合わせる。 ----
    const followers = new Map(); // id -> { id, godId, eventId, map, point, cardId, vanishFrames }
    let followerSerial = 0;
    const FOLLOWER_VANISH_FRAMES = 8;
    const placeFollower = record => {
        const event = liveEvent(record);
        if (!event || !record.point) return;
        event.isPlayerChild = false; // 雛形の <child of: player> を打ち消す(Playerの移動量を足さない)
        event.theParent = null;
        event.setPosition(record.point.x - 0.5, record.point.y - 0.5);
        applyAppearance(record, event);
    };
    const spawnFollower = (godId, point, options = {}) => {
        const tid = templateEventId();
        if (typeof $gameMap === "undefined" || !$gameMap || !tid || typeof $gameMap.spawnEvent !== "function") return { ok: false, reason: tid ? "mapUnavailable" : "templateMissing" };
        if (!point || ![point.x, point.y].every(Number.isFinite) || (!options.invisible && !appearanceFor(godId))) return { ok: false, reason: "invalidPoint" };
        try {
            const eventId = $gameMap.spawnEvent(tid, point.x - 0.5, point.y - 0.5, false);
            if (!eventId) { diagnostics.lastError = "spawnFailed"; return { ok: false, reason: "spawnFailed" }; }
            const id = ++followerSerial;
            const record = { id, key: "follower:" + id, kind: "follower", godId, eventId, map: $gameMap, point: { x: point.x, y: point.y }, direction: 2,
                cardId: options.cardId || null, vanishFrames: null, anchor: options.invisible === true };
            followers.set(id, record);
            diagnostics.spawned++;
            placeFollower(record);
            return { ok: true, id, eventId };
        } catch (error) {
            note(error);
            return { ok: false, reason: String(error?.message || error) };
        }
    };
    const moveFollower = (id, point) => {
        const record = followers.get(id);
        if (!record || !point || ![point.x, point.y].every(Number.isFinite)) return false;
        record.point = { x: point.x, y: point.y };
        placeFollower(record); // その場で合わせる(次のマップ更新を待たず、1フレーム遅れない)
        return true;
    };
    const removeFollower = id => {
        const record = followers.get(id);
        if (!record) return false;
        followers.delete(id);
        destroyEvent(record);
        diagnostics.removed++;
        return true;
    };
    const vanishFollower = id => {
        const record = followers.get(id);
        if (!record || record.vanishFrames !== null) return false;
        record.vanishFrames = FOLLOWER_VANISH_FRAMES;
        try { root.ProjectRPresentationVfx?.play?.("hermes.vanish", { eventId: record.eventId }); } catch (error) { note(error); }
        return true;
    };
    // 追従する神の表示Eventから公式Swing Weaponを出す(サイコポンポス: Hermesが敵にとどめを刺したように見せる)。表示だけで、ダメージ・撃破の権限は持たない。
    const swingFollower = (id, degree, weaponSprite = "Pan") => {
        const record = followers.get(id);
        if (!record || !liveEvent(record) || record.vanishFrames !== null) return false;
        return runSwing({ degree, weaponSprite }, record.eventId);
    };
    const updateFollowers = () => {
        for (const [id, record] of [...followers]) {
            if (record.map !== $gameMap || !liveEvent(record)) { followers.delete(id); continue; }
            placeFollower(record);
            if (record.vanishFrames !== null && --record.vanishFrames <= 0) removeFollower(id);
        }
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
    const pendingBalloons = [];
    const pendingDashes = [];
    const dashes = new Map(); // eventId -> { dx, dy, framesLeft }
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
    const requestBalloon = (godId, balloonId) => {
        if (typeof $gameMap === "undefined" || !$gameMap) return false;
        pendingBalloons.push({ godId, balloonId: Number(balloonId) || 1, frame });
        return true;
    };
    // 表示Eventだけを動かす(Hendrixの親子追従は「プレイヤーの移動量」を足すだけなので、そのまま併用できる)。判定・攻撃権限は持たない。
    const dash = (godId, degree, tiles, frames) => {
        if (typeof $gameMap === "undefined" || !$gameMap || !Number.isFinite(degree) || !(tiles > 0)) return false;
        pendingDashes.push({ godId, degree, tiles, frames: Math.max(1, Math.floor(frames) || 8), frame });
        return true;
    };
    const flushDashes = () => {
        for (const item of pendingDashes.splice(0)) {
            const eventId = getTransientEventId(item.godId);
            if (eventId) {
                const radians = item.degree * Math.PI / 180, step = item.tiles / item.frames;
                dashes.set(eventId, { dx: Math.sin(radians) * step, dy: -Math.cos(radians) * step, framesLeft: item.frames });
            } else if (frame - item.frame < SWING_WAIT_FRAMES) pendingDashes.push(item);
        }
        for (const [eventId, d] of [...dashes]) {
            const event = $gameMap.event(eventId);
            if (!event || event._erased || d.framesLeft <= 0) { dashes.delete(eventId); continue; }
            try { event.setPosition(event._realX + d.dx, event._realY + d.dy); } catch (error) { note(error); dashes.delete(eventId); continue; }
            d.framesLeft--;
        }
    };
    const flushBalloons = () => {
        for (const item of pendingBalloons.splice(0)) {
            const eventId = getTransientEventId(item.godId);
            const event = eventId ? $gameMap.event(eventId) : null;
            if (event) { try { $gameTemp.requestBalloon(event, item.balloonId); } catch (error) { note(error); } }
            else if (frame - item.frame < SWING_WAIT_FRAMES) pendingBalloons.push(item);
        }
    };
    const flushSwings = () => {
        flushBalloons();
        flushDashes();
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
        swingWeapon, requestBalloon, dash,
        spawnFollower, moveFollower, vanishFollower, removeFollower, swingFollower,
        spawnAnchor: (point, options = {}) => spawnFollower("anchor", point, { ...options, invisible: true }),
        removeAnchor: id => { const record = followers.get(id); return record && record.anchor ? removeFollower(id) : false; },
        getFollowers: () => [...followers.values()].filter(r => !r.anchor).map(r => ({ id: r.id, godId: r.godId, eventId: r.eventId, point: { ...r.point }, vanishing: r.vanishFrames !== null })),
        getAnchors: () => [...followers.values()].filter(r => r.anchor).map(r => ({ id: r.id, eventId: r.eventId, point: { ...r.point } })),
        getAppearance: godId => ({ ...appearanceFor(godId) }),
        getDiagnostics: () => ({ ...diagnostics, visualCount: visuals.size, templateEventId: templateEventId() })
    };
})();
