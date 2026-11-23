/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Janus Ultimate「始まりと終わりの門」(Stage 2): 2つの門が、狙った場所で 0.3 秒後・0.9 秒後に範囲攻撃。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateActivation
 * @base ProjectR_JanusSkills
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_JanusSkills
 *
 * @param CastRangeTiles
 * @text 門を開ける最大距離(マス)
 * @type number
 * @decimals 2
 * @min 0.5
 * @default 4
 *
 * @param FirstDelaySeconds
 * @text 1つ目の門の範囲攻撃までの時間(秒)
 * @type number
 * @decimals 2
 * @min 0.01
 * @default 0.3
 *
 * @param FirstRadiusTiles
 * @text 1つ目の半径(マス)
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 2
 *
 * @param FirstDamageScale
 * @text 1つ目の基礎物理ダメージの倍率
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 1.5
 *
 * @param SecondDelaySeconds
 * @text 2つ目の範囲攻撃までの時間(秒)
 * @type number
 * @decimals 2
 * @min 0.02
 * @default 0.9
 *
 * @param SecondRadiusTiles
 * @text 2つ目の半径(マス)
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 2.8
 *
 * @param SecondDamageScale
 * @text 2つ目の基礎物理ダメージの倍率
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 2.5
 *
 * @param UltimateDamageGeneratesGauge
 * @text Ultimateの与ダメージでゲージを得る
 * @type boolean
 * @default false
 *
 * @help
 * ProjectR_JanusUltimate.js
 *
 * Janus の本番 Ultimate handler。既存の GodSummonManager(常駐の神)・UltimateActivation(Q の発動と、成功後だけのゲージ消費)・共有のゲージをそのまま使います。
 * Q を押した瞬間のカーソルの位置(プレイヤーから最大 4 マス。壁の手前で止まる・マップの内側)に2つの門を開き、
 *   0.3 秒後に半径 2 マス・基礎物理ダメージの 150 %、0.9 秒後に半径 2.8 マス・250 % の範囲攻撃をします(中心は開けた場所のまま)。
 *   それぞれの範囲攻撃は同じ敵に1回だけ(2つの範囲攻撃の両方に入った敵は、2回受ける)。壁を挟んだ敵には当たらない(CombatOcclusion の視線)。
 *   ダメージは通常の物理ダメージ(装備の武器のダメージ × 倍率。防御は無視しない)。この奥義のダメージではゲージは増えません(既定。パラメータで変更可)。
 * 【ゲージ】 handler が {ok:true, started:true} を返した後にだけ、UltimateActivation がゲージを消費します(開始に失敗したときは消費しません)。
 * 【後始末】 戦闘の終了・マップ移動・ロードで中断します(ゲージは返しません)。メニュー・会話中は進みません。何も保存しません。
 * 見た目: 専用の素材は無い。SE と、コードで描く2つの門の輪・画面のごく軽い光だけ(画像ファイルは参照しない)。専用のカットインの絵が無い間、ProjectR_CutIn は Janus には何も出さない(Hermes の絵で代用しない)。
 *
 * Console: ProjectRJanusUltimate.isActive() / getState() / getLastResult() / getConfig() / getRegistration()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const FPS = 60;
    const parameters = PluginManager.parameters("ProjectR_JanusUltimate");
    const setting = (name, fallback, min) => {
        const raw = parameters[name], value = raw === undefined || String(raw).trim() === "" ? NaN : Number(raw);
        return Number.isFinite(value) && value >= min ? value : fallback;
    };
    const config = Object.freeze({
        castRangeTiles: setting("CastRangeTiles", 4, 0.5),
        first: Object.freeze({ frames: Math.max(1, Math.round(setting("FirstDelaySeconds", 0.3, 0.01) * FPS)), radius: setting("FirstRadiusTiles", 2, 0.1), scale: setting("FirstDamageScale", 1.5, 0.1) }),
        second: Object.freeze({ frames: Math.max(2, Math.round(setting("SecondDelaySeconds", 0.9, 0.02) * FPS)), radius: setting("SecondRadiusTiles", 2.8, 0.1), scale: setting("SecondDamageScale", 2.5, 0.1) }),
        damageGeneratesGauge: String(parameters.UltimateDamageGeneratesGauge ?? "false").trim().toLowerCase() === "true"
    });
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const skills = () => root.ProjectRJanusSkills;
    const se = (name, pitch = 100) => safe(() => AudioManager.playSe({ name, volume: 80, pitch, pan: 0 }));

    let sequence = null;      // { id, map, center, frame, phases:[{ key, frames, radius, scale, done, hit:[] }] }。最大1。保存しない。
    let serial = 0, lastResult = null;

    const finish = reason => {
        if (!sequence) return;
        for (const ph of sequence.phases) if (ph.portal) { safe(() => skills().fx.dispose(ph.portal)); ph.portal = null; }          // 途中で終わったとき、開いたままの門を消す
        lastResult = { ok: true, instanceId: sequence.id, reason, hits: sequence.phases.map(ph => ({ key: ph.key, done: ph.done, hit: [...ph.hit] })), center: { ...sequence.center } };
        sequence = null;
    };
    const firePhase = (seq, phase) => {
        phase.done = true;
        const api = skills();
        for (const e of api.liveEnemies()) {
            if (!api.inArea(seq.center, phase.radius, e)) continue;
            phase.hit.push(e.eventId());                                                      // 各範囲攻撃は、同じ敵に1回
            try { api.physicalDamage(e, phase.scale, `janus_ultimate:${seq.id}:${phase.key}`, { gauge: config.damageGeneratesGauge, heavy: true }); } catch (_error) { /* 1体の失敗で奥義を止めない */ }
        }
        se(phase.key === "first" ? "Earth1" : "Earth3", phase.key === "first" ? 100 : 80);
        // 範囲攻撃の瞬間の光(門が弾ける)。見た目だけ
        const fx = api.fx;
        if (fx) { if (phase.portal) fx.dispose(phase.portal); phase.portal = null; fx.ring({ at: seq.center }, phase.radius, { color: phase.key === "first" ? 0xffffff : 0xc9a2ff, from: 0.85, to: 1.25, alpha: 1, frames: 16 }); }
    };
    const canAdvanceNow = (map, sceneActive) => {
        if (!sceneActive || map.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };

    // ---- handler(UltimateActivation の transaction): 開始に必要な準備がすべて整った後にだけ成功を返す ----
    const godId = root.ProjectRGodSummonManager?.resolveGodId?.("janus") ?? null;
    const start = context => {
        if (sequence) return { ok: false, reason: "ultimateEffectActive" };
        if (!godId || context?.godId !== godId || context?.summon?.persistent !== true) return { ok: false, reason: "wrongGod" };
        const map = typeof $gameMap !== "undefined" ? $gameMap : null, player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null, api = skills();
        if (!deck?.isCardBattleActive?.() || !map || !player || !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return { ok: false, reason: "mapUnavailable" };
        if (!api || typeof api.aimPoint !== "function" || typeof api.physicalDamage !== "function") return { ok: false, reason: "janusSkillsUnavailable" };
        if (typeof PluginManager._commands?.["Hendrix_Action_Engine:UpdateEventHp"] !== "function") return { ok: false, reason: "actionCombatUnavailable" };
        const aim = api.aimPoint(config.castRangeTiles);
        if (!aim || aim.ok !== true) return { ok: false, reason: aim?.reason || "invalidTarget" };
        sequence = { id: ++serial, map, center: aim.center, frame: 0, phases: [
            { key: "first", frames: config.first.frames, radius: config.first.radius, scale: config.first.scale, done: false, hit: [], portal: null },
            { key: "second", frames: config.second.frames, radius: config.second.radius, scale: config.second.scale, done: false, hit: [], portal: null }] };
        se("Door2", 70);                                                                      // 2つの門が開く
        // 専用のカットインの絵が無い間(ProjectR_CutIn は絵の無い神には出さない)、門の見た目と画面のごく軽い光だけで始まりを知らせる。見た目だけ
        safe(() => {
            if (api.fx) for (const phase of sequence.phases) phase.portal = api.fx.ring({ at: aim.center }, phase.radius, { color: phase.key === "first" ? 0xfff2b0 : 0xb48cff, hold: true, from: 0.3, to: 1, alpha: 0.65, frames: phase.frames });
            if (typeof $gameScreen !== "undefined") $gameScreen.startFlash([255, 255, 255, 60], 10);
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
            for (const phase of sequence.phases) if (!phase.done && sequence.frame >= phase.frames) firePhase(sequence, phase);
            if (sequence.phases.every(ph => ph.done)) finish("completed");
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

    root.ProjectRJanusUltimate = Object.freeze({
        VERSION: "0.1.0",
        isActive: () => !!sequence,
        getState: () => sequence && { instanceId: sequence.id, center: { ...sequence.center }, frame: sequence.frame, phases: sequence.phases.map(ph => ({ key: ph.key, frames: ph.frames, radius: ph.radius, scale: ph.scale, done: ph.done, hit: [...ph.hit] })) },
        getLastResult: () => lastResult && { ...lastResult },
        getConfig: () => ({ ...config }),
        getRegistration: () => ({ ...registration })
    });
})();
