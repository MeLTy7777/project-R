/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 D13 本番の入口(ボス戦の開始〜勝敗の処理)。専用ステージへ移動 → SOUL戦闘(準備ループ)+ボス → 勝利 / 敗北 / その他の結果を1回だけ確定。敗北はボス用の敗北メニュー。
 * @author ProjectR
 * @base ProjectR_SoulBattle
 * @base ProjectR_SoulBattleStage
 * @base ProjectR_BossFramework
 * @base ProjectR_SoulEnemyBullets
 * @base ProjectR_PlayerDeath
 * @orderAfter ProjectR_SoulBattle
 * @orderAfter ProjectR_SoulBattleStage
 * @orderAfter ProjectR_BossFramework
 * @orderAfter ProjectR_SoulEnemyBullets
 *
 * @param ResultVariableId
 * @text 結果を入れる変数(0 = 使わない)
 * @desc SOUL戦闘の結果を入れる変数。1 = 勝利 / 2 = 敗北 / 3 = その他(中断・開始できなかった等)。開始を受け付けたときは 0(戦闘中)に戻します。StartSoulEncounter の指定が優先されます。
 * @type variable
 * @default 0
 *
 * @command StartSoulEncounter
 * @text SOUL戦闘(ボス戦): 開始
 * @desc 専用ステージへ移動してボス戦を始めます。終わると勝利・その他は元のマップへ戻り、敗北は敗北メニューへ進みます。
 * @arg bossId
 * @text Boss ID(registerBoss 済み)
 * @type string
 * @arg resultVariableId
 * @text 結果を入れる変数(0 = プラグインパラメータ)
 * @type variable
 * @default 0
 *
 * @help
 * ProjectR_SoulEncounter.js
 *
 * 【役割】SOUL戦闘(準備ループ)を「ボス戦」として本番で始め、終わりまで面倒をみる最小の制御です。DEV 用の ProjectR_SoulBattleSandbox とは別で、
 *   DEV 用の一時データ(指輪・デッキの一時付与・ダミーの退避・武器の差し替え)は一切触りません。プレイヤーの実際の装備デッキで戦います。
 *
 * 【承認済みの規則(D13)】
 *   ・敵ハートのHP0 = 勝利 / 主人公のHP0 = 敗北。同じフレームの同時 KO は勝利が先(ProjectR_SoulBattle の判定順)。結果は1回だけ確定します。
 *   ・HP の下限は無い(ProjectR_SoulEnemyBullets の floorHp = 0)。DEV の Sandbox だけが下限 1 を指定します。
 *   ・勝利: 主人公の残りHPはそのまま。専用ステージから元のマップ・元の位置へ戻り、結果の変数に 1 を入れます。報酬・分岐は既存のイベントが行います。
 *   ・敗北: 専用ステージから元のマップへ戻ったら、すぐに専用の「敗北メニュー」(Scene_ProjectRSoulDefeat)へ進みます。HP0 の主人公を操作できるマップに残しません。
 *       「セーブから再開」 = 標準のセーブ選択(ロード)画面。キャンセルすると敗北メニューへ戻ります(マップへは戻りません)。セーブが1つも無いときは選べません。
 *       「タイトルへ戻る」 = タイトルへ。自動のチェックポイント・再挑戦は作りません(戦闘前の状態は、読み込むセーブそのものです)。
 *   ・ラウンド上限は置きません(rounds = 0)。
 *   ・その他(中断・マップ移動・ハート消滅・開始に失敗)は結果 3 で、元のマップへ戻ります。
 *   ・保存の禁止: 開始を受け付けてから、戦闘中・ステージの出入り・敗北メニューの間は、セーブ(手動・自動・「セーブ画面を開く」)を許しません。
 *       解除は、結果が勝利 / その他で元のマップへ戻った後、または敗北メニューから読み込み・ニューゲームで別のセーブになったときです。
 *
 * 【ボスの登録】ProjectRSoulEncounter.registerBoss({ bossId, name, phases:[{ id, label, hpRatio }], dodgeBoss?, enemyImage? })
 *   ・敵ハートのHP = 既存の Database の敵(ProjectR_SoulBattlePoC の EnemyName)。BossFramework のボスは、始めるときに敵ハートの Event に結び付けて登録し直します。
 *   ・phases は BossFramework と同じ(HP の割合以下で次の形態)。弾幕のフェーズ別の表は ProjectRSoulEnemyBullets.registerPlan(bossId, plan)。
 *   ・dodgeBoss: 敵ハートの回避AI(ProjectRSoulBattleDodge)のボス定義名(任意)。enemyImage: { folder, name }(任意)。
 *
 * 【開始】ProjectRSoulEncounter.start({ bossId, resultVariableId?, attackSeconds?, defenseSeconds? }) またはプラグインコマンド StartSoulEncounter。
 *   受け付けないとき(何も変えません): unknownBoss / invalidResultVariable / encounterActive / soulActive / stageBusy / bossActive / mapUnavailable / invalidDeck(デッキが30枚等の条件を満たさない)/ stageEnterFailed。
 *   結果の変数が指定されていれば、受け付けない場合は 3(エンカウンターが動いている最中の拒否は除く)。
 *   開始のコマンドはすぐ戻ります(イベントは待ちません)。結果は変数で受け取り、並列処理・自動実行・条件付きページのイベントで続きを行ってください。
 *   (戦闘中にイベントの実行を待たせると、SOUL戦闘の時計が止まるため。)
 *
 * API: ProjectRSoulEncounter
 *   registerBoss(def) / unregisterBoss(bossId) / listBosses()
 *   start(options) -> { ok, pending?, reason? }      abort(reason?) -> boolean(戦闘中なら SOUL を終える = 結果 3)
 *   getState() -> { state, bossId, resultVariableId, saveBlocked, last }      state: idle / entering / fighting / leaving / defeat / defeatMenu
 *   getLastResult() -> { bossId, result:"victory"|"defeat"|"other", code, reason }     onResult(fn) -> 登録解除関数(勝利・その他で元のマップへ戻った後に呼ぶ)
 *   RESULT = { NONE:0, VICTORY:1, DEFEAT:2, OTHER:3 }     defeatCommands() -> 敗北メニューの項目(診断・テスト用)
 *   Scene_ProjectRSoulDefeat(敗北メニューの場面)
 *
 * 保存されません(実行時だけ)。通常のマップ戦闘・従来のSOUL・DEV の Sandbox・既存のセーブには影響しません。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulEncounter";
    const VERSION = "0.1.0";
    const RESULT = Object.freeze({ NONE: 0, VICTORY: 1, DEFEAT: 2, OTHER: 3 });
    const WAIT_ENTER = 1200, WAIT_LEAVE = 1200;                          // 移動が終わらないときに諦めるフレーム数(Stage 自身にも時間切れがある)
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const defaultVariable = Math.max(0, Math.floor(Number(params.ResultVariableId) || 0));
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (_error) { return null; } };
    const soul = () => api("ProjectRSoulBattle"), stage = () => api("ProjectRSoulStage"), bf = () => api("ProjectRBossFramework"), poc = () => api("ProjectRSoulBattlePoC");
    const bullets = () => api("ProjectRSoulEnemyBullets"), dodge = () => api("ProjectRSoulBattleDodge");
    const bosses = new Map();
    const rt = {
        state: "idle", job: null, systemRef: null, blockSave: false, resolved: false, boss: null, varId: 0, last: null, unsubEnd: null, armedDodge: false, waited: 0,
        defeatMePlayed: false, listeners: new Set(), serial: 0
    };
    const log = [];
    const note = entry => { log.push(entry); if (log.length > 60) log.shift(); };
    const mapIs = id => typeof $gameMap !== "undefined" && !!$gameMap && $gameMap.mapId() === id;
    const sceneReady = () => typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined" && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset &&
        typeof $gamePlayer !== "undefined" && !!$gamePlayer && !$gamePlayer.isTransferring();
    const stageState = () => safe(() => stage().getState().state, "none");
    const setVariable = code => {
        if (rt.varId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) { try { $gameVariables.setValue(rt.varId, code); } catch (error) { note({ type: "variableError", message: String(error && error.message || error) }); } }
    };
    const validVariable = id => Number.isInteger(id) && id >= 0 && (typeof $dataSystem === "undefined" || !$dataSystem || !$dataSystem.variables || id < $dataSystem.variables.length);

    // ---------------------------------------------------------------- ボスの登録 ----------------------------------------------------------------
    const registerBoss = def => {
        const bossId = def && typeof def.bossId === "string" ? def.bossId : "";
        if (!bossId) return { ok: false, reason: "invalidBoss" };
        const phases = (Array.isArray(def.phases) ? def.phases : []).filter(p => p && typeof p.id === "string" && Number(p.hpRatio) > 0 && Number(p.hpRatio) < 1).map(p => ({ id: p.id, label: typeof p.label === "string" ? p.label : p.id, hpRatio: Number(p.hpRatio) }));
        const look = def.enemyImage && typeof def.enemyImage.name === "string" && def.enemyImage.name ? { folder: def.enemyImage.folder === "sv_enemies" ? "sv_enemies" : "enemies", name: def.enemyImage.name } : null;
        bosses.set(bossId, Object.freeze({ bossId, name: typeof def.name === "string" && def.name ? def.name : bossId, phases: Object.freeze(phases), dodgeBoss: typeof def.dodgeBoss === "string" && def.dodgeBoss ? def.dodgeBoss : null, enemyImage: look }));
        return { ok: true, bossId };
    };

    // ---------------------------------------------------------------- 開始 ----------------------------------------------------------------
    const reject = (reason, extra) => {
        const busy = reason === "encounterActive";
        if (!busy && rt.pendingVarId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) safe(() => $gameVariables.setValue(rt.pendingVarId, RESULT.OTHER));      // 受け付けなかった: その他
        note({ type: "rejected", reason });
        return { ok: false, reason, ...(extra || {}) };
    };
    const start = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        rt.pendingVarId = 0;
        const varId = o.resultVariableId === undefined || o.resultVariableId === null || o.resultVariableId === "" || Number(o.resultVariableId) === 0 ? defaultVariable : Number(o.resultVariableId);
        if (!validVariable(varId)) return { ok: false, reason: "invalidResultVariable" };
        rt.pendingVarId = varId;
        if (rt.state !== "idle") return reject("encounterActive");
        const def = bosses.get(String(o.bossId || ""));
        if (!def) return reject("unknownBoss");
        if (!soul() || !stage() || !bf() || !poc()) return reject("pluginsMissing");
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || !sceneReady()) return reject("mapUnavailable");
        if (soul().isActive()) return reject("soulActive");
        if (stageState() !== "idle" && stageState() !== "none") return reject("stageBusy");
        if (bf().isActive()) return reject("bossActive");
        const entry = bf().validateEntry();
        if (!entry.ok) return reject("invalidDeck", { messages: entry.messages || [] });             // デッキが条件を満たさない: 何も変えずに断る(デッキは書き換えない)
        const moved = stage().enter();
        if (!moved.ok) return reject("stageEnterFailed", { detail: String(moved.reason) });
        rt.state = "entering"; rt.blockSave = true; rt.systemRef = $gameSystem; rt.resolved = false; rt.boss = def; rt.varId = varId; rt.last = null; rt.waited = 0; rt.serial++;
        rt.job = { options: { attackSeconds: o.attackSeconds, defenseSeconds: o.defenseSeconds } };
        setVariable(RESULT.NONE);                                                                    // 戦闘中は 0
        note({ type: "start", bossId: def.bossId, varId });
        return { ok: true, pending: true, bossId: def.bossId };
    };

    // ---------------------------------------------------------------- 結果 ----------------------------------------------------------------
    // SOUL戦闘が終わった(結果はここで1回だけ確定する。BossFramework の onVictory / onDefeat は見ない = 二重にならない)
    const onSoulEnd = payload => {
        if (rt.resolved) return;
        rt.resolved = true;
        const reasonNow = String(payload && payload.reason || "end");
        const result = reasonNow === "victory" ? "victory" : reasonNow === "playerDead" ? "defeat" : "other";      // 勝敗は SoulBattle の終了理由から(判定順は SoulBattle: 勝利が先)
        const code = result === "victory" ? RESULT.VICTORY : result === "defeat" ? RESULT.DEFEAT : RESULT.OTHER;
        const reason = String(payload && payload.reason || "end");
        endBossAndAi(reason);
        setVariable(code);
        rt.last = { bossId: rt.boss ? rt.boss.bossId : "", result, code, reason, rounds: payload ? payload.rounds : 0 };
        note({ type: "result", ...rt.last });
        if (rt.unsubEnd) { rt.unsubEnd(); rt.unsubEnd = null; }
        rt.state = result === "defeat" ? "defeat" : "leaving"; rt.waited = 0;
        const left = safe(() => stage().leave("encounter:" + result + ":" + reason), null);          // 元のマップ・元の位置へ戻る(敗北も、HP0 のマップで操作させずにすぐ敗北メニューへ進むため、いったん戻ってから)
        if (left && left.ok === false) note({ type: "leaveFailed", reason: left.reason });
    };
    // ボス(BossFramework)・回避AI・弾幕の自動開始を片づける。BossFramework の onVictory / onDefeat は発火させない(end)。
    const endBossAndAi = reason => {
        try { const b = bf(); if (b && b.isActive() && rt.boss && b.getState().bossId === rt.boss.bossId) b.end("encounter:" + reason); } catch (_error) { /* 後片づけ */ }
        try { bullets()?.disable?.(); } catch (_error) { /* 後片づけ */ }
        try { if (rt.armedDodge) dodge()?.disarm?.(); } catch (_error) { /* 後片づけ */ }
        rt.armedDodge = false;
    };
    // 開始前に結果が決まった(ステージへ着けない・開始に失敗): その他
    const resolveOther = reason => {
        if (rt.resolved) return;
        rt.resolved = true;
        endBossAndAi(reason);
        setVariable(RESULT.OTHER);
        rt.last = { bossId: rt.boss ? rt.boss.bossId : "", result: "other", code: RESULT.OTHER, reason, rounds: 0 };
        note({ type: "result", ...rt.last });
        if (rt.unsubEnd) { rt.unsubEnd(); rt.unsubEnd = null; }
        rt.state = "leaving"; rt.waited = 0;
        safe(() => stage().leave("encounter:other:" + reason));
    };
    const finishToIdle = () => {
        const last = rt.last;
        rt.state = "idle"; rt.job = null; rt.blockSave = false; rt.boss = null; rt.waited = 0;       // 元のマップへ戻った: セーブ禁止を解く
        note({ type: "idle" });
        for (const fn of [...rt.listeners]) { try { fn(last ? { ...last } : null); } catch (_error) { /* 通知 */ } }
    };
    // 別のセーブになった(読み込み・ニューゲーム): 実行時の記録を捨てる。敗北メニューから読み込んだときもここで保存禁止が解ける。
    const reset = why => {
        if (rt.state === "idle" && !rt.blockSave) return;
        note({ type: "reset", why, state: rt.state });
        if (rt.unsubEnd) { try { rt.unsubEnd(); } catch (_error) { /* 後片づけ */ } rt.unsubEnd = null; }
        rt.state = "idle"; rt.job = null; rt.blockSave = false; rt.boss = null; rt.resolved = false; rt.waited = 0; rt.systemRef = null; rt.armedDodge = false; rt.defeatMePlayed = false;
    };
    const abort = (reason = "abort") => {
        if (rt.state === "fighting" && soul() && soul().isActive()) return soul().end("encounter:" + reason);
        if (rt.state === "entering") { resolveOther("abort:" + reason); return true; }
        return false;
    };

    // ---------------------------------------------------------------- 戦闘の始まり(ステージに着いてから) ----------------------------------------------------------------
    const begin = () => {
        const def = rt.boss, o = rt.job.options;
        rt.job = null;
        try {
            const place = stage().layout().player, home = stage().layout().heartHome;
            $gamePlayer.locate(place.x, place.y); safe(() => $gamePlayer.setDirection(8));
            if (def.enemyImage && stage().setEnemyLook) safe(() => stage().setEnemyLook(def.enemyImage));
            bullets()?.setConfig?.({ floorHp: 0 });                                                 // 本番: HP は 0 まで減る(DEV の下限は使わない)
            if (def.dodgeBoss && dodge()?.arm) { const armed = dodge().arm({ boss: def.dodgeBoss }); rt.armedDodge = !!(armed && armed.ok); }
            const started = soul().start({ prepare: true, rounds: 0, attackSeconds: o.attackSeconds, defenseSeconds: o.defenseSeconds,
                heart: { centerX: home.x, centerY: home.y, pattern: "static" }, endOnHeartDefeat: true, endOnCardBattleEnd: true });
            if (!started.ok) { note({ type: "soulStartFailed", reason: started.reason }); return resolveOther("soulStartFailed:" + started.reason); }
            rt.unsubEnd = soul().onEnd(onSoulEnd);
            const heartId = soul().getState().heart.eventId, hp = poc().getState().hp, maxHp = Number.isFinite(hp) && hp > 0 ? Math.floor(hp) : 1000;
            const reg = bf().registerBoss({ bossId: def.bossId, name: def.name, maxHp, eventId: heartId, phases: def.phases.map(p => ({ ...p })) });
            if (!reg.ok) { soul().end("encounter:bossRegisterFailed"); return; }
            const bs = bf().start(def.bossId, {});
            if (!bs.ok) { soul().end("encounter:bossStartFailed"); return; }
            bullets()?.enableBoss?.({});                                                            // DEFENSE のたびに、ボスのフェーズに合う弾幕
            rt.state = "fighting";
            note({ type: "fighting", bossId: def.bossId, heartId, maxHp });
        } catch (error) {
            note({ type: "beginError", message: String(error && error.message || error) });
            if (soul() && soul().isActive()) soul().end("encounter:exception"); else resolveOther("exception");
        }
    };

    // ---------------------------------------------------------------- 毎フレーム(Scene_Map) ----------------------------------------------------------------
    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const result = _update.apply(this, arguments);
            try {
                if (rt.state === "entering") {
                    rt.waited++;
                    if (stageState() === "idle") resolveOther("stageUnavailable");                    // 移動が取り消された・時間切れ(Stage が片づけた)
                    else if (rt.job && stage().isActive() && mapIs(stage().STAGE_MAP_ID) && sceneReady() && rt.waited >= 3) begin();
                    else if (rt.waited > WAIT_ENTER) resolveOther("enterTimeout");
                } else if (rt.state === "leaving" || rt.state === "defeat") {
                    rt.waited++;
                    if (stageState() === "idle" && sceneReady()) {
                        if (rt.state === "leaving") finishToIdle();
                        else showDefeatMenu();
                    } else if (rt.waited > WAIT_LEAVE) { if (rt.state === "leaving") finishToIdle(); else showDefeatMenu(); }
                }
            } catch (error) { note({ type: "updateError", message: String(error && error.message || error) }); }
            return result;
        };
    }
    const showDefeatMenu = () => {
        rt.state = "defeatMenu"; rt.waited = 0;
        note({ type: "defeatMenu" });
        if (typeof SceneManager !== "undefined" && typeof Scene_ProjectRSoulDefeat !== "undefined") SceneManager.goto(Scene_ProjectRSoulDefeat);
    };

    // ---------------------------------------------------------------- 保存の禁止 ----------------------------------------------------------------
    const saveBlockedNow = system => rt.blockSave && (system === undefined || system === rt.systemRef);
    if (typeof Game_System !== "undefined") {
        const _isSaveEnabled = Game_System.prototype.isSaveEnabled;
        Game_System.prototype.isSaveEnabled = function() { return saveBlockedNow(this) ? false : _isSaveEnabled.apply(this, arguments); };
    }
    if (typeof Scene_Save !== "undefined") {                                                          // isSaveEnabled を見ない経路(イベントコマンド「セーブ画面を開く」)も、保存の実行で止める
        const _executeSave = Scene_Save.prototype.executeSave;
        Scene_Save.prototype.executeSave = function() {
            if (saveBlockedNow($gameSystem)) { if (typeof this.onSaveFailure === "function") this.onSaveFailure(); return undefined; }
            return _executeSave.apply(this, arguments);
        };
    }
    if (typeof DataManager !== "undefined") {
        const _setup = DataManager.setupNewGame;
        DataManager.setupNewGame = function() { reset("newGame"); return _setup.apply(this, arguments); };
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { reset("load"); return _extract.apply(this, arguments); };
    }

    // ---------------------------------------------------------------- 敗北メニュー ----------------------------------------------------------------
    // 項目: 「セーブから再開」(標準のロード画面。セーブが無ければ選べない)/「タイトルへ戻る」。自動のチェックポイント・再挑戦は無い。
    const anySave = () => typeof DataManager !== "undefined" && safe(() => DataManager.isAnySavefileExists(), false) === true;
    const defeatCommands = () => [{ name: "セーブから再開", symbol: "load", enabled: anySave() }, { name: "タイトルへ戻る", symbol: "title", enabled: true }];
    // 選んだときの遷移(場面の入れ替えだけ。テストできるよう関数にしてある)
    const chooseLoad = () => {
        if (!anySave()) return { ok: false, reason: "noSavefile" };
        SceneManager.push(Scene_Load);                                                             // キャンセルで pop され、敗北メニューへ戻る(マップへは戻らない)
        return { ok: true, to: "Scene_Load" };
    };
    const chooseTitle = () => { SceneManager.goto(Scene_Title); return { ok: true, to: "Scene_Title" }; };

    function Window_ProjectRSoulDefeat() { this.initialize(...arguments); }
    function Scene_ProjectRSoulDefeat() { this.initialize(...arguments); }
    if (typeof Window_Command !== "undefined" && typeof Scene_Base !== "undefined") {
        Window_ProjectRSoulDefeat.prototype = Object.create(Window_Command.prototype);
        Window_ProjectRSoulDefeat.prototype.constructor = Window_ProjectRSoulDefeat;
        Window_ProjectRSoulDefeat.prototype.initialize = function(rect) { Window_Command.prototype.initialize.call(this, rect); this.selectDefault(); };
        Window_ProjectRSoulDefeat.prototype.makeCommandList = function() { for (const c of defeatCommands()) this.addCommand(c.name, c.symbol, c.enabled); };
        Window_ProjectRSoulDefeat.prototype.selectDefault = function() { this.select(anySave() ? 0 : 1); };
        Window_ProjectRSoulDefeat.prototype.isCancelEnabled = function() { return false; };           // キャンセルでは何も起きない(敗北メニューから出られるのは、読み込むか、タイトルへ戻るときだけ)
        Window_ProjectRSoulDefeat.prototype.processCancel = function() { /* 何もしない */ };

        Scene_ProjectRSoulDefeat.prototype = Object.create(Scene_Base.prototype);
        Scene_ProjectRSoulDefeat.prototype.constructor = Scene_ProjectRSoulDefeat;
        Scene_ProjectRSoulDefeat.prototype.initialize = function() { Scene_Base.prototype.initialize.call(this); };
        Scene_ProjectRSoulDefeat.prototype.create = function() {
            Scene_Base.prototype.create.call(this);
            this.createBackground();
            this.createWindowLayer();
            this.createTitleSprite();
            this.createCommandWindow();
        };
        Scene_ProjectRSoulDefeat.prototype.start = function() {
            Scene_Base.prototype.start.call(this);
            safe(() => { AudioManager.stopBgm(); AudioManager.stopBgs(); });
            if (!rt.defeatMePlayed) { rt.defeatMePlayed = true; safe(() => AudioManager.playMe($dataSystem.gameoverMe)); }       // ME は最初の1回だけ(読み込みをキャンセルして戻ったときは鳴らさない)
            this.startFadeIn(this.slowFadeSpeed(), false);
        };
        Scene_ProjectRSoulDefeat.prototype.isBusy = function() { return Scene_Base.prototype.isBusy.call(this) || this._commandWindow.isClosing(); };
        Scene_ProjectRSoulDefeat.prototype.createBackground = function() {
            this._backSprite = new Sprite(new Bitmap(Graphics.width, Graphics.height));
            this._backSprite.bitmap.fillAll("#000000");
            this.addChild(this._backSprite);
        };
        Scene_ProjectRSoulDefeat.prototype.createTitleSprite = function() {
            this._titleSprite = new Sprite(new Bitmap(Graphics.width, 140));
            const bitmap = this._titleSprite.bitmap;
            bitmap.fontSize = 72; bitmap.textColor = "#d8404f"; bitmap.drawText("敗北", 0, 0, Graphics.width, 84, "center");
            bitmap.fontSize = 24; bitmap.textColor = "#cfd8e8"; bitmap.drawText("主人公のHPが0になりました", 0, 92, Graphics.width, 36, "center");
            this._titleSprite.y = Math.round(Graphics.height * 0.22);
            this.addChild(this._titleSprite);
        };
        Scene_ProjectRSoulDefeat.prototype.commandWindowRect = function() {
            const ww = 320, wh = this.calcWindowHeight(2, true);
            return new Rectangle(Math.floor((Graphics.boxWidth - ww) / 2), Math.floor(Graphics.boxHeight * 0.58), ww, wh);
        };
        Scene_ProjectRSoulDefeat.prototype.createCommandWindow = function() {
            this._commandWindow = new Window_ProjectRSoulDefeat(this.commandWindowRect());
            this._commandWindow.setHandler("load", this.commandLoad.bind(this));
            this._commandWindow.setHandler("title", this.commandTitle.bind(this));
            this.addWindow(this._commandWindow);
        };
        Scene_ProjectRSoulDefeat.prototype.commandLoad = function() {
            const r = chooseLoad();
            if (!r.ok) { safe(() => SoundManager.playBuzzer()); this._commandWindow.activate(); }
        };
        Scene_ProjectRSoulDefeat.prototype.commandTitle = function() {
            this._commandWindow.close();
            safe(() => this.fadeOutAll());
            chooseTitle();
        };
    }
    root.Scene_ProjectRSoulDefeat = Scene_ProjectRSoulDefeat;
    root.Window_ProjectRSoulDefeat = Window_ProjectRSoulDefeat;

    // ---------------------------------------------------------------- プラグインコマンド ----------------------------------------------------------------
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "StartSoulEncounter", args => {
            const result = start({ bossId: String(args.bossId || ""), resultVariableId: Number(args.resultVariableId) || 0 });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] start rejected:`, result.reason);
        });
    }

    root.ProjectRSoulEncounter = Object.freeze({
        VERSION, RESULT, registerBoss, unregisterBoss: bossId => bosses.delete(bossId), listBosses: () => [...bosses.keys()],
        start, abort, defeatCommands, chooseLoad, chooseTitle,
        onResult: fn => { if (typeof fn !== "function") return () => {}; rt.listeners.add(fn); return () => rt.listeners.delete(fn); },
        getLastResult: () => (rt.last ? { ...rt.last } : null),
        getState: () => ({ state: rt.state, bossId: rt.boss ? rt.boss.bossId : null, resultVariableId: rt.varId, saveBlocked: rt.blockSave, last: rt.last ? { ...rt.last } : null, serial: rt.serial }),
        getLog: () => log.map(e => ({ ...e }))
    });
})();
