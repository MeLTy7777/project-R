/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Themis Ultimate「神罰・最後の審判」(Stage 3): 狙った場所に 0.8 秒後、範囲攻撃(罪状が多いほど強い)。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateActivation
 * @base ProjectR_ThemisSkills
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_ThemisSkills
 *
 * @param CastRangeTiles
 * @text 狙える最大距離(マス)
 * @type number
 * @decimals 2
 * @min 0.5
 * @default 4
 *
 * @param DelaySeconds
 * @text 範囲攻撃までの時間(秒)
 * @type number
 * @decimals 2
 * @min 0.02
 * @default 0.8
 *
 * @param RadiusTiles
 * @text 範囲の半径(マス)
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 2.8
 *
 * @param DamageScale
 * @text 基礎物理ダメージの倍率
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 2.5
 *
 * @param SinStackBonus
 * @text 敵の罪状1つあたりの追加ダメージ(0.2 = +20%)
 * @type number
 * @decimals 2
 * @min 0
 * @default 0.2
 *
 * @help
 * ProjectR_ThemisUltimate.js
 *
 * Themis の本番 Ultimate handler。既存の GodSummonManager(常駐の神)・UltimateActivation(Q の発動と、成功後だけのゲージ消費)・共有のゲージをそのまま使います。
 * Q を押した瞬間のカーソルの位置(プレイヤーから最大 4 マス。壁の手前で止まる・マップの内側)に裁きの輪を開き、
 *   0.8 秒後に半径 2.8 マスの範囲へ、基礎物理ダメージの 250 % × (1 + 0.2 × その敵の罪状)。範囲の中心は開けた場所のまま。
 *   同じ敵には1回だけ。ダメージが出た敵の罪状は、全部消費する(範囲外・壁の向こうの敵・罪状は変わらない)。壁を挟んだ敵には当たらない(CombatOcclusion の視線)。
 *   ダメージは通常の物理ダメージ(装備の武器のダメージ × 倍率。防御は無視しない)。この奥義のダメージではゲージは増えません(常に)。
 * 【ゲージ】 handler が {ok:true, started:true} を返した後にだけ、UltimateActivation がゲージを消費します(開始に失敗したときは消費しません)。
 * 【後始末】 戦闘の終了・マップ移動・ロードで中断します(ゲージは返しません)。メニュー・会話中は進みません。何も保存しません。Core の選択・U キーの制限・Q の自動割り当てには触れません。
 * 見た目: 専用の素材は無い。SE と、コードで描く裁きの輪・画面のごく軽い光だけ(画像ファイルは参照しない)。専用のカットインの絵が無い間、ProjectR_CutIn は Themis には何も出さない(ほかの神の絵で代用しない)。
 *
 * Console: ProjectRThemisUltimate.isActive() / getState() / getLastResult() / getConfig() / getRegistration()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const FPS = 60;
    const parameters = PluginManager.parameters("ProjectR_ThemisUltimate");
    const setting = (name, fallback, min) => {
        const raw = parameters[name], value = raw === undefined || String(raw).trim() === "" ? NaN : Number(raw);
        return Number.isFinite(value) && value >= min ? value : fallback;
    };
    const config = Object.freeze({
        castRangeTiles: setting("CastRangeTiles", 4, 0.5),
        frames: Math.max(1, Math.round(setting("DelaySeconds", 0.8, 0.02) * FPS)),
        radius: setting("RadiusTiles", 2.8, 0.1),
        scale: setting("DamageScale", 2.5, 0.1),
        stackBonus: setting("SinStackBonus", 0.2, 0)
    });
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const skills = () => root.ProjectRThemisSkills;
    const se = (name, pitch = 100) => safe(() => AudioManager.playSe({ name, volume: 80, pitch, pan: 0 }));

    let sequence = null;      // { id, map, center, frame, frames, radius, done, hit:[], portal }。最大1。保存しない。
    let serial = 0, lastResult = null;

    const finish = reason => {
        if (!sequence) return;
        if (sequence.portal) { safe(() => skills().fx.dispose(sequence.portal)); sequence.portal = null; }          // 途中で終わったとき、開いたままの輪を消す
        lastResult = { ok: true, instanceId: sequence.id, reason, done: sequence.done, hit: sequence.hit.map(h => ({ ...h })), center: { ...sequence.center } };
        sequence = null;
    };
    const fire = seq => {
        seq.done = true;
        const api = skills();
        for (const e of api.liveEnemies()) {
            if (!api.inArea(seq.center, seq.radius, e)) continue;
            const stacks = api.sin.stacksOf(e), scale = config.scale * (1 + config.stackBonus * stacks), id = e.eventId();
            try {
                api.physicalDamage(e, scale, `themis_ultimate:${seq.id}`, { gauge: false, heavy: true });          // 奥義のダメージではゲージを増やさない
                api.sin.consume(e);                                                                                  // ダメージが出た敵だけ、罪状を全部消費する
                seq.hit.push({ eventId: id, stacks, scale });
            } catch (_error) { /* 1体の失敗で奥義を止めない(その敵の罪状は残る) */ }
        }
        se("Earth3", 70); se("Blow1", 60);
        const fx = api.fx;
        if (fx) { if (seq.portal) fx.dispose(seq.portal); seq.portal = null; fx.ring({ at: seq.center }, seq.radius, { color: 0xff3355, from: 0.85, to: 1.25, alpha: 1, frames: 18 }); }
        safe(() => { if (typeof $gameScreen !== "undefined") $gameScreen.startFlash([255, 220, 230, 90], 12); });
    };
    const canAdvanceNow = (map, sceneActive) => {
        if (!sceneActive || map.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };

    // ---- handler(UltimateActivation の transaction): 開始に必要な準備がすべて整った後にだけ成功を返す ----
    const godId = root.ProjectRGodSummonManager?.resolveGodId?.("themis") ?? null;
    const start = context => {
        if (sequence) return { ok: false, reason: "ultimateEffectActive" };
        if (!godId || context?.godId !== godId || context?.summon?.persistent !== true) return { ok: false, reason: "wrongGod" };
        const map = typeof $gameMap !== "undefined" ? $gameMap : null, player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null, api = skills();
        if (!deck?.isCardBattleActive?.() || !map || !player || !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return { ok: false, reason: "mapUnavailable" };
        if (!api || typeof api.aimPoint !== "function" || typeof api.physicalDamage !== "function" || !api.sin) return { ok: false, reason: "themisSkillsUnavailable" };
        if (typeof PluginManager._commands?.["Hendrix_Action_Engine:UpdateEventHp"] !== "function") return { ok: false, reason: "actionCombatUnavailable" };
        const aim = api.aimPoint(config.castRangeTiles);
        if (!aim || aim.ok !== true) return { ok: false, reason: aim?.reason || "invalidTarget" };
        sequence = { id: ++serial, map, center: aim.center, frame: 0, frames: config.frames, radius: config.radius, done: false, hit: [], portal: null };
        se("Door2", 60);                                                                      // 裁きの輪が開く
        // 専用のカットインの絵が無い間(ProjectR_CutIn は絵の無い神には出さない)、輪とごく軽い光だけで始まりを知らせる。見た目だけ
        safe(() => {
            if (api.fx) sequence.portal = api.fx.ring({ at: aim.center }, config.radius, { color: 0xffd0d8, hold: true, from: 0.3, to: 1, alpha: 0.65, frames: config.frames });
            if (typeof $gameScreen !== "undefined") $gameScreen.startFlash([255, 255, 255, 50], 10);
        });
        return { ok: true, started: true, instanceId: sequence.id, center: { ...aim.center }, distance: aim.distance };
    };
    const registration = (() => {
        const activation = root.ProjectRUltimateActivation;
        if (!activation || !godId) return { ok: false, reason: !activation ? "activationUnavailable" : "godUnresolved", godId };
        return activation.registerUltimateHandler(godId, start);
    })();

    // ---- ライフサイクル ----
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!sequence) return;
        try {
            if (sequence.map !== this) return finish("mapChanged");
            if (!deck.isCardBattleActive()) return finish("battleEnded");
            if (!canAdvanceNow(this, sceneActive)) return;
            sequence.frame++;
            if (!sequence.done && sequence.frame >= sequence.frames) fire(sequence);
            if (sequence.done) finish("completed");
        } catch (_error) { finish("error"); }
    };
    const _endBattle = deck.endBattle;
    deck.endBattle = function() { finish("battleEnded"); return _endBattle.apply(this, arguments); };
    const _setup = Game_Map.prototype.setup;
    Game_Map.prototype.setup = function() { finish("mapChanged"); return _setup.apply(this, arguments); };
    if (typeof DataManager !== "undefined") {
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { finish("load"); return _extract.apply(this, arguments); };
    }

    root.ProjectRThemisUltimate = Object.freeze({
        VERSION: "0.1.0",
        isActive: () => !!sequence,
        getState: () => sequence && { instanceId: sequence.id, center: { ...sequence.center }, frame: sequence.frame, frames: sequence.frames, radius: sequence.radius, done: sequence.done, hit: sequence.hit.map(h => ({ ...h })) },
        getLastResult: () => lastResult && { ...lastResult },
        getConfig: () => ({ ...config }),
        getRegistration: () => ({ ...registration })
    });
})();
