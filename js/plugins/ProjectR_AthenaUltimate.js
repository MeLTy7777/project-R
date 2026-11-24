/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR Athena Ultimate「アイギス・不落の戦陣」(Stage 4): 主人公を中心に守りの陣を6秒間張り、開いた瞬間に範囲内の敵へ1回ダメージ。陣の中にいる間は被ダメージを軽減する。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_GodSummonManager
 * @base ProjectR_UltimateActivation
 * @base ProjectR_AthenaSkills
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_AthenaSkills
 *
 * @param RadiusTiles
 * @text 陣の半径(マス)
 * @type number
 * @decimals 2
 * @min 0.5
 * @default 3
 *
 * @param DurationSeconds
 * @text 陣の持続(秒)
 * @type number
 * @decimals 2
 * @min 0.5
 * @default 6
 *
 * @param DamageScale
 * @text 開いた瞬間の範囲攻撃: 基礎物理ダメージの倍率
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 1.8
 *
 * @param DamageReduction
 * @text 陣の中にいる間の被ダメージ軽減(0.6 = 60%)
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 0.95
 * @default 0.6
 *
 * @help
 * ProjectR_AthenaUltimate.js
 *
 * Athena の本番 Ultimate handler。既存の GodSummonManager(常駐の神)・UltimateActivation(Q の発動と、成功後だけのゲージ消費)・共有のゲージをそのまま使います。
 * Q を押した瞬間の主人公の位置を中心に、半径 3 マスの守りの陣を 6 秒間張ります(陣はその場に残る。主人公に付いてこない)。
 *   ・開いた瞬間に、範囲内の敵(壁を挟まない)へ1回、基礎物理ダメージの 180 %(同じ敵に1回)。この奥義のダメージではゲージは増えません(常に)。
 *   ・主人公が陣の中にいる間、被ダメージを 60 % 軽減する(既存の ProjectR_ApolloStatus の台帳 = 他の軽減とは積。陣の外へ出たら、その場で外れる)。
 *   ・陣が残っている間の再発動は失敗する(ゲージは消費しない)。
 * 【ゲージ】 handler が {ok:true, started:true} を返した後にだけ、UltimateActivation がゲージを消費します(開始に失敗したときは消費しません)。
 * 【後始末】 戦闘の終了・マップ移動・ロードで終わります(ゲージは返しません)。メニュー・会話中は進みません。何も保存しません。Core の選択・U キー・Q の自動割り当てには触れません。
 * 見た目: 専用の素材は無い。SE と、コードで描く輪・画面のごく軽い光だけ(画像ファイルは参照しない)。専用のカットインの絵が無い間、ProjectR_CutIn は絵の無い神には何も出さない(他の神の絵では代用しない)。
 *
 * Console: ProjectRAthenaUltimate.isActive() / getState() / getLastResult() / getConfig() / getRegistration()
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const deck = root.ProjectRCardDeck;
    const FPS = 60, EPS = 1e-6;
    const FIELD_STATUS_ID = "athena_ultimate_field";
    const parameters = PluginManager.parameters("ProjectR_AthenaUltimate");
    const setting = (name, fallback, min, max = Infinity) => {
        const raw = parameters[name], value = raw === undefined || String(raw).trim() === "" ? NaN : Number(raw);
        return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
    };
    const config = Object.freeze({
        radius: setting("RadiusTiles", 3, 0.5),
        seconds: setting("DurationSeconds", 6, 0.5),
        scale: setting("DamageScale", 1.8, 0.1),
        reduction: setting("DamageReduction", 0.6, 0.01, 0.95)
    });
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const skills = () => root.ProjectRAthenaSkills;
    const ledger = () => { const s = root.ProjectRApolloStatus; return s && typeof s.apply === "function" && typeof s.remove === "function" ? s : null; };
    const se = (name, pitch = 100) => safe(() => AudioManager.playSe({ name, volume: 80, pitch, pan: 0 }));

    let field = null;         // { id, map, center, remaining, radius, inside, hit:[], ring }。最大1。保存しない。
    let serial = 0, lastResult = null;

    const setInside = inside => {
        if (!field) return;
        const l = ledger();
        if (!l) return;
        if (inside) { safe(() => l.apply("player", FIELD_STATUS_ID, { seconds: 0.2, damageTaken: 1 - config.reduction, source: "athena_ultimate" })); }          // 毎フレーム取り直す(外へ出たら外し、止まっても 0.2 秒で消える)
        else if (field.inside) safe(() => l.remove("player", FIELD_STATUS_ID));
        field.inside = inside;
    };
    const finish = reason => {
        if (!field) return;
        safe(() => ledger()?.remove("player", FIELD_STATUS_ID));
        if (field.ring) { safe(() => skills().fx.dispose(field.ring)); field.ring = null; }
        lastResult = { ok: true, instanceId: field.id, reason, hit: field.hit.map(h => ({ ...h })), center: { ...field.center }, remainingSeconds: Math.max(0, field.remaining) };
        field = null;
    };
    const playerInside = () => {
        const pc = skills()?.playerCenter?.();
        return !!pc && !!field && Math.hypot(pc.x - field.center.x, pc.y - field.center.y) <= field.radius + EPS;
    };
    const canAdvanceNow = (map, sceneActive) => {
        if (!sceneActive || map.eventsPaused) return false;
        const accept = root.ProjectRCardBattleInput?.canAcceptInput;
        return typeof accept === "function" ? accept() === true : true;
    };

    // ---- handler(UltimateActivation の transaction): 開始に必要な準備がすべて整った後にだけ成功を返す ----
    const godId = root.ProjectRGodSummonManager?.resolveGodId?.("athena") ?? null;
    const start = context => {
        if (field) return { ok: false, reason: "ultimateEffectActive" };
        if (!godId || context?.godId !== godId || context?.summon?.persistent !== true) return { ok: false, reason: "wrongGod" };
        const map = typeof $gameMap !== "undefined" ? $gameMap : null, player = typeof $gamePlayer !== "undefined" ? $gamePlayer : null, api = skills();
        if (!deck?.isCardBattleActive?.() || !map || !player || !(SceneManager._scene instanceof Scene_Map) || !SceneManager._scene._spriteset) return { ok: false, reason: "mapUnavailable" };
        if (!api || typeof api.playerCenter !== "function" || typeof api.physicalDamage !== "function") return { ok: false, reason: "athenaSkillsUnavailable" };
        if (!ledger()) return { ok: false, reason: "statusLedgerUnavailable" };
        if (typeof PluginManager._commands?.["Hendrix_Action_Engine:UpdateEventHp"] !== "function") return { ok: false, reason: "actionCombatUnavailable" };
        const center = api.playerCenter();
        if (!center) return { ok: false, reason: "invalidPosition" };
        field = { id: ++serial, map, center: { x: center.x, y: center.y }, remaining: config.seconds, radius: config.radius, inside: false, hit: [], ring: null };
        // 開いた瞬間の範囲攻撃(1回)。壁を挟んだ敵・範囲外には当たらない。ゲージは増やさない。
        for (const e of api.liveEnemies()) {
            if (!api.inArea(field.center, field.radius, e)) continue;
            try { api.physicalDamage(e, config.scale, `athena_ultimate:${field.id}`, { gauge: false, heavy: true }); field.hit.push({ eventId: e.eventId(), scale: config.scale }); } catch (_error) { /* 1体の失敗で奥義を止めない */ }
        }
        setInside(playerInside());
        se("Barrier", 70); se("Earth3", 80);
        safe(() => {
            if (api.fx) field.ring = api.fx.ring({ at: field.center }, field.radius, { color: 0x9fd8ff, hold: true, from: 1, to: 1, alpha: 0.5, frames: Math.round(config.seconds * FPS) + 2 });
            if (typeof $gameScreen !== "undefined") $gameScreen.startFlash([220, 240, 255, 80], 12);
        });
        return { ok: true, started: true, instanceId: field.id, center: { ...field.center }, hit: field.hit.map(h => h.eventId) };
    };
    const registration = (() => {
        const activation = root.ProjectRUltimateActivation;
        if (!activation || !godId) return { ok: false, reason: !activation ? "activationUnavailable" : "godUnresolved", godId };
        return activation.registerUltimateHandler(godId, start);
    })();

    // ---- ライフサイクル ----
    const _updateCooldown = deck.updateCooldown;
    deck.updateCooldown = function(seconds) {                          // 陣の持続は戦闘時計(ゲージ・Cooldown と同じ時計)で進む
        const r = _updateCooldown.apply(this, arguments);
        const s = Number(seconds);
        if (field && Number.isFinite(s) && s > 0) { field.remaining -= s; if (field.remaining < 1e-8) finish("expired"); }
        return r;
    };
    const _update = Game_Map.prototype.update;
    Game_Map.prototype.update = function(sceneActive) {
        _update.apply(this, arguments);
        if (!field) return;
        try {
            if (field.map !== this) return finish("mapChanged");
            if (!deck.isCardBattleActive()) return finish("battleEnded");
            if (safe(() => root.ProjectR?.PlayerDeath?.isDead?.() === true, false)) return finish("playerDead");
            if (!canAdvanceNow(this, sceneActive)) return;
            setInside(playerInside());                                 // 陣の中にいる間だけ軽減(外へ出たら外す)
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

    root.ProjectRAthenaUltimate = Object.freeze({
        VERSION: "0.1.0",
        isActive: () => !!field,
        getState: () => field && { instanceId: field.id, center: { ...field.center }, remaining: field.remaining, radius: field.radius, inside: field.inside, hit: field.hit.map(h => ({ ...h })) },
        getLastResult: () => lastResult && { ...lastResult },
        getConfig: () => ({ ...config }),
        getRegistration: () => ({ ...registration })
    });
})();
