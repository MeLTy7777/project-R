/*:
 * @target MZ
 * @plugindesc v1.0.0 ProjectR 共通VFX層: カードID→VFX Designerライブラリ→ワールド基準→後片付けの対応表。表示専用。
 * @author ProjectR
 * @base Hendrix_Animation_Solution
 * @base ProjectR_CardDeckCore
 * @orderAfter Hendrix_Animation_Solution
 *
 * @param MappingsJson
 * @text 追加・上書きマッピング(JSONオブジェクト)
 * @desc 例: {"key":{"library":"名前","sheet":{"file":"Animation/名前","rows":2,"columns":4,"fps":30},"anchor":"player"}}
 * @type note
 * @default
 *
 * @help
 * ProjectR_PresentationVfx.js
 *
 * 【方針】新しいカードのVFXは、導入済みHendrix Animation Solution(v2.0.7)のVFX Designerを優先します。
 *   VFX Designerでスプライトシートを読み込み、ライブラリへ保存(js/AnimationSolutionLibrary.json)し、
 *   プラグインコマンド「Show VFX from Library」(showAnimationFromLibrary)で再生する流れです。
 *   このPluginはその呼び出しを「キー」で包む薄い層で、公式APIに無いものは作りません。
 *
 * 【VFXはゲームの状態を持たない】カード消費・ダメージ・Cooldown・移動可否・命中・戦闘状態は一切持ちません。
 *   再生に失敗しても(コマンド欠落・ライブラリ未登録・画像なし・例外)呼び出し側には成功/失敗とも影響せず、
 *   play() は { ok:false, reason } を返すだけで例外を投げません。
 *
 * 【対応表の1件】 key → { library, sheet, anchor, ... }
 *   library : VFX Designerのライブラリ名(Show VFX from Libraryに渡す)
 *   sheet   : { file(img/pictures/からの相対・拡張子なし), rows, columns, fps }。ライブラリに登録が無いとき、
 *             同じスプライトシートを公式「Show VFX」(showAnimatedPicture)で再生する代替です。
 *   anchor  : "player"  = 発動後のプレイヤー位置(追従)。ライブラリ再生。
 *             "origin"  = play時に渡す origin(出発点の実座標)に固定。公式Show VFXの位置オフセット+stickModeで再生。
 *                         (ライブラリ再生はプレイヤー移動後に非同期で作られるため、出発点には置けないため)
 *   scale / opacity / offsetX / offsetY / blend / loop は任意。
 *
 * 【後片付け】clear() で、このPluginが出したVFXだけを公式の dispose で外します。
 *   戦闘終了・マップ移動・ロードで自動的に呼びます。
 *
 * API: ProjectRPresentationVfx
 *   play(key, { origin?:{x,y} })  → { ok, mode, reason? }
 *   clear()                       自分が出したVFXだけを除去
 *   mapping(key) / keys() / register(key, definition)
 *   probeLibrary()                ライブラリ登録の有無を非同期に調べる(診断用)
 *   diagnostics()                 再生・失敗の件数と直近の理由
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const ANIM = "Hendrix_Animation_Solution";
    const NOTE_PREFIX = "ProjectR:";
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters("ProjectR_PresentationVfx") : {};

    // 絶(Zetsu)の黒白ノイズ。DEV用の自作スプライトシート(8コマ・4列x2行)。最終素材はlibraryの画像を差し替えるだけ。
    const NOISE_SHEET = Object.freeze({ file: "Animation/ProjectR_Zetsu_Noise", rows: 2, columns: 4, fps: 30 });
    const defaults = {
        "hermes_zetsu.departure": { library: "ProjectR_Zetsu_Departure", sheet: NOISE_SHEET, anchor: "origin", scale: 100, opacity: 255, offsetY: -24 },
        "hermes_zetsu.arrival": { library: "ProjectR_Zetsu_Arrival", sheet: NOISE_SHEET, anchor: "player", scale: 120, opacity: 255, offsetY: -24 }
    };
    const mappings = new Map();
    const register = (key, definition) => {
        if (!key || !definition || typeof definition !== "object") return false;
        mappings.set(String(key), Object.freeze({ anchor: "player", scale: 100, opacity: 255, offsetX: 0, offsetY: 0, loop: 1, ...definition }));
        return true;
    };
    for (const [key, definition] of Object.entries(defaults)) register(key, definition);
    try {
        const extra = JSON.parse(String(params.MappingsJson || "{}").trim() || "{}");
        if (extra && typeof extra === "object") for (const [key, definition] of Object.entries(extra)) register(key, definition);
    } catch (_error) { /* 不正なJSONは無視(内蔵の対応表で動作) */ }

    const active = []; // { key, note, library }
    const libraryKnown = new Map(); // library名 -> true/false(調査済みのものだけ)
    const stats = { plays: 0, failures: 0, lastKey: null, lastMode: null, lastReason: null, cleared: 0 };
    const fail = (reason, key) => { stats.failures++; stats.lastReason = reason; stats.lastKey = key; return { ok: false, reason }; };

    const hasCommand = name => typeof PluginManager !== "undefined" && typeof PluginManager._commands?.[`${ANIM}:${name}`] === "function";
    const call = (name, args) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = 0;
        PluginManager.callCommand(interpreter, ANIM, name, args);
    };

    const probeLibrary = () => {
        const find = root.getAnimationFromLibrary;
        if (typeof find !== "function") return Promise.resolve(false);
        const work = [];
        for (const definition of mappings.values()) {
            if (!definition.library || libraryKnown.has(definition.library)) continue;
            try {
                work.push(Promise.resolve(find(definition.library)).then(
                    data => { libraryKnown.set(definition.library, !!data); },
                    () => { libraryKnown.set(definition.library, false); }));
            } catch (_error) { libraryKnown.set(definition.library, false); }
        }
        return Promise.all(work).then(() => true);
    };

    const screenOffset = origin => {
        const player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        const map = typeof $gameMap !== "undefined" ? $gameMap : null;
        if (!player || !map || !origin || ![origin.x, origin.y].every(Number.isFinite)) return null;
        return { x: Math.round((map.adjustX(origin.x) - map.adjustX(player._realX)) * map.tileWidth()),
            y: Math.round((map.adjustY(origin.y) - map.adjustY(player._realY)) * map.tileHeight()) };
    };

    const visual = definition => JSON.stringify({ scalePercent: String(definition.scale), opacity: String(definition.opacity),
        hue: "0", blendMode: definition.blend || "Normal", playInReverse: "false" });

    const playSheet = (key, definition, offset, stick) => {
        const sheet = definition.sheet;
        if (!sheet?.file) return fail("noSheet", key);
        if (!hasCommand("showAnimatedPicture")) return fail("vfxCommandMissing", key);
        const note = NOTE_PREFIX + key;
        call("showAnimatedPicture", {
            note, fps: String(sheet.fps || 30), loopCount: String(definition.loop || 1),
            spritesheetSettings: JSON.stringify({ spritesheetFile: sheet.file, row: String(sheet.rows), column: String(sheet.columns), frameRange: "" }),
            positionSettings: JSON.stringify({ eventId: "player", offsetX: String(offset.x + (definition.offsetX || 0)),
                offsetY: String(offset.y + (definition.offsetY || 0)), zIndex: "auto", origin: "center", stickMode: String(stick) }),
            visualSettings: visual(definition)
        });
        active.push({ key, note, library: null });
        return { ok: true, mode: "sheet" };
    };

    const play = (key, context = {}) => {
        stats.plays++;
        stats.lastKey = key;
        try {
            const definition = mappings.get(String(key));
            if (!definition) return fail("unmapped", key);
            if (typeof $gamePlayer === "undefined" || !$gamePlayer || typeof SceneManager === "undefined" ||
                !(SceneManager._scene instanceof Scene_Map)) return fail("mapSceneUnavailable", key);
            let result;
            if (definition.anchor === "origin") {
                const offset = screenOffset(context.origin);
                result = offset ? playSheet(key, definition, offset, true) : fail("invalidOrigin", key);
            } else if (definition.library && libraryKnown.get(definition.library) !== false && hasCommand("showAnimationFromLibrary")) {
                call("showAnimationFromLibrary", { animationName: definition.library, eventId: "player",
                    loopCount: String(definition.loop || 1), stickMode: "false" });
                active.push({ key, note: null, library: definition.library });
                result = { ok: true, mode: "library" };
            } else {
                result = playSheet(key, definition, { x: 0, y: 0 }, false);
            }
            if (result.ok) stats.lastMode = result.mode;
            return result;
        } catch (error) {
            return fail(String(error?.message || error), key);
        }
    };

    // 自分が出したVFXだけを公式のdisposeで外す。ほかのVFXには触れない。
    const clear = () => {
        const manager = root.AnimatedPictureManager;
        const libraryNotes = new Set(active.filter(a => a.library).map(a => "library_" + a.library));
        active.length = 0;
        try {
            for (const picture of [...(manager?._animatedPictures || [])]) {
                const note = String(picture?.note ?? "");
                if (note.startsWith(NOTE_PREFIX) || libraryNotes.has(note)) {
                    picture.dispose?.();
                    stats.cleared++;
                }
            }
        } catch (error) {
            stats.lastReason = String(error?.message || error);
        }
    };

    const deck = root.ProjectRCardDeck;
    if (deck?.endBattle) {
        const _endBattle = deck.endBattle;
        deck.endBattle = function() { clear(); return _endBattle.apply(this, arguments); };
    }
    if (typeof Game_Map !== "undefined") {
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() { clear(); return _setup.apply(this, arguments); };
    }
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { clear(); return _extract.apply(this, arguments); };
    }
    if (typeof Scene_Map !== "undefined") {
        const _onMapLoaded = Scene_Map.prototype.onMapLoaded;
        Scene_Map.prototype.onMapLoaded = function() {
            _onMapLoaded.apply(this, arguments);
            try { probeLibrary(); } catch (_error) { /* 診断のみ */ }
        };
    }

    root.ProjectRPresentationVfx = {
        play, clear, register, probeLibrary,
        mapping: key => mappings.has(key) ? { ...mappings.get(key) } : null,
        keys: () => [...mappings.keys()],
        diagnostics: () => ({ ...stats, active: active.length, libraries: Object.fromEntries(libraryKnown) })
    };
})();
