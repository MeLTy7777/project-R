/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 I6-C Playtest専用: F7 キーで、SOUL戦闘のテストマップ(TEST_SOUL)へ移動 / 元の場所へ戻る。配布版(Playtest以外)では何もしません。
 * @author ProjectR
 *
 * @param Enabled
 * @text 有効にする
 * @desc オフにすると、F7 キーは何もしません(テストが終わったら、このプラグインごとオフにしても構いません)。
 * @type boolean
 * @default true
 *
 * @param TestMapId
 * @text テストマップのID
 * @desc SOUL戦闘のテスト用のマップ(TEST_SOUL)。
 * @type number
 * @min 1
 * @default 7
 *
 * @param EntryX
 * @text 入り口のX(タイル)
 * @type number
 * @min 0
 * @default 8
 *
 * @param EntryY
 * @text 入り口のY(タイル)
 * @type number
 * @min 0
 * @default 9
 *
 * @param EntryDirection
 * @text 入り口での向き(2 下 / 4 左 / 6 右 / 8 上)
 * @type select
 * @option 上(8)
 * @value 8
 * @option 下(2)
 * @value 2
 * @option 左(4)
 * @value 4
 * @option 右(6)
 * @value 6
 * @default 8
 *
 * @param KeyCode
 * @text 切り替えキーのコード(118 = F7)
 * @desc 切り替えに使うキーの keyCode。既存で使われているキー(F2〜F6・F8・F9・ゲームの操作キー)とぶつからないものにしてください。
 * @type number
 * @min 1
 * @default 118
 *
 * @help
 * ProjectR_SoulTestEntry.js
 *
 * 【位置づけ】 SOUL戦闘のテスト(docs/ProjectR_SoulLoop_Plan.md §16.9)の「入り口」です。テストマップ(TEST_SOUL)へ行くために、
 *   既存のマップのイベントやゲームの開始位置(System.json)を書き換えなくて済むようにします。
 *   **Playtest(エディタの「テストプレイ」)のときだけ**動きます。配布版・Playtest 以外では、何も登録せず、何もしません。
 *
 * 【使い方】
 *   F7 キー(マップの上で、メッセージ・移動中・戦闘中でないとき):
 *     ・いまのマップがテストマップ以外 → いまの場所(マップ・位置・向き)を覚えて、テストマップの入り口へ移動する。
 *     ・いまのマップがテストマップ → 覚えた場所へ戻る(覚えていなければ、ゲームの開始位置へ)。
 *   SOUL戦闘(ProjectRSoulEncounter)の最中・専用ステージにいる間・SOUL戦闘の準備中は、何も起きません。
 *   覚えた場所は実行時だけで、セーブしません(別のセーブを読み込む・ニューゲームで消えます)。
 *
 * 【外し方】 テストが終わったら、プラグイン管理でこのプラグインをオフ(または削除)するか、パラメータ「有効にする」をオフにします。
 *   データ(マップ・コモンイベント・変数)は変えません。
 *
 * API: ProjectRSoulTestEntry(Playtest のときだけ存在)
 *   toggle() -> { ok, reason?, to?: "test" | "back", mapId, x, y }      いまのマップに応じて、テストマップへ移動 / 元へ戻る
 *   canToggle() -> { ok, reason? }      getReturnPoint() -> { mapId, x, y, direction } | null      getConfig()
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulTestEntry";
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    if (!isPlaytest()) return;                                           // 配布版では何も作らない

    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const int = (value, fallback, min) => { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= min ? n : fallback; };
    const config = Object.freeze({
        enabled: params.Enabled === undefined || params.Enabled === "" ? true : String(params.Enabled) === "true",
        mapId: int(params.TestMapId, 7, 1), x: int(params.EntryX, 8, 0), y: int(params.EntryY, 9, 0),
        direction: [2, 4, 6, 8].includes(Number(params.EntryDirection)) ? Number(params.EntryDirection) : 8,
        keyCode: int(params.KeyCode, 118, 1)
    });
    const runtime = { systemRef: null, returnPoint: null };             // 実行時だけ。セーブしない
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (_error) { return null; } };
    const syncRuntime = () => {
        const system = typeof $gameSystem !== "undefined" ? $gameSystem : null;
        if (runtime.systemRef !== system) { runtime.systemRef = system; runtime.returnPoint = null; }      // 別のセーブ / ニューゲームへ切り替わったら、古い場所は使わない
    };
    const sceneIsMap = () => typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined" && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset;

    const canToggle = () => {
        if (!config.enabled) return { ok: false, reason: "disabled" };
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || typeof $gameMap === "undefined" || !$gameMap) return { ok: false, reason: "noGame" };
        if (!sceneIsMap()) return { ok: false, reason: "notMapScene" };
        if (SceneManager.isSceneChanging() || $gamePlayer.isTransferring()) return { ok: false, reason: "transferring" };
        if (typeof $gameMessage !== "undefined" && $gameMessage && $gameMessage.isBusy()) return { ok: false, reason: "messageBusy" };
        if ($gameMap.isEventRunning && $gameMap.isEventRunning()) return { ok: false, reason: "eventRunning" };
        const encounter = api("ProjectRSoulEncounter");
        if (encounter && encounter.getState && encounter.getState().state !== "idle") return { ok: false, reason: "soulEncounterActive" };
        const stage = api("ProjectRSoulStage");
        if (stage && stage.getState && stage.getState().state !== "idle") return { ok: false, reason: "soulStageActive" };
        if (stage && $gameMap.mapId() === stage.STAGE_MAP_ID) return { ok: false, reason: "onSoulStage" };
        const soul = api("ProjectRSoulBattle");
        if (soul && soul.isActive && soul.isActive()) return { ok: false, reason: "soulBattleActive" };
        return { ok: true };
    };
    const fallbackPoint = () => {
        const s = typeof $dataSystem !== "undefined" ? $dataSystem : null;
        return s && s.startMapId > 0 ? { mapId: s.startMapId, x: s.startX, y: s.startY, direction: 2 } : null;
    };
    const toggle = () => {
        syncRuntime();
        const can = canToggle();
        if (!can.ok) return can;
        if ($gameMap.mapId() !== config.mapId) {
            runtime.returnPoint = { mapId: $gameMap.mapId(), x: $gamePlayer.x, y: $gamePlayer.y, direction: $gamePlayer.direction() };
            $gamePlayer.reserveTransfer(config.mapId, config.x, config.y, config.direction, 0);
            return { ok: true, to: "test", mapId: config.mapId, x: config.x, y: config.y };
        }
        const point = runtime.returnPoint || fallbackPoint();
        if (!point) return { ok: false, reason: "noReturnPoint" };
        runtime.returnPoint = null;
        $gamePlayer.reserveTransfer(point.mapId, point.x, point.y, point.direction, 0);
        return { ok: true, to: "back", mapId: point.mapId, x: point.x, y: point.y };
    };

    if (typeof document !== "undefined" && document && typeof document.addEventListener === "function") {
        document.addEventListener("keydown", event => {
            if (!event || event.keyCode !== config.keyCode || event.repeat || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return;
            const result = toggle();
            if (result.ok) {
                try { event.preventDefault(); } catch (_error) { /* 無視 */ }
                try { SoundManager.playOk(); } catch (_error) { /* 無視 */ }
                if (typeof console !== "undefined") console.log(`[${PLUGIN}] ${result.to === "test" ? "テストマップへ" : "元の場所へ"}: map ${result.mapId} (${result.x}, ${result.y})`);
            }
        });
    }

    root.ProjectRSoulTestEntry = Object.freeze({
        VERSION: "0.1.0", toggle, canToggle: () => { syncRuntime(); return canToggle(); },
        getReturnPoint: () => { syncRuntime(); return runtime.returnPoint ? { ...runtime.returnPoint } : null; },
        getConfig: () => ({ ...config })
    });
})();
