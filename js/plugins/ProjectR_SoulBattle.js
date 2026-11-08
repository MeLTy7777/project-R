/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 P1 コントローラ(オプトイン): idle/attack/defense/cleanup の状態、フェーズの自動遷移、防御中の攻撃入力の遮断、戦闘中のセーブ禁止、確実な復元。
 * @author ProjectR
 * @base Hendrix_Action_Engine
 * @base ProjectR_CombatSession
 * @base ProjectR_SoulBattlePoC
 * @orderAfter Hendrix_Action_Engine
 * @orderAfter Hendrix_Hotbar_Creator
 * @orderAfter ProjectR_CombatSession
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_SwordSystem
 * @orderAfter ProjectR_GunSystem
 * @orderAfter ProjectR_SoulBattlePoC
 *
 * @param AttackSeconds
 * @text 攻撃ターンの長さ(秒)
 * @desc 攻撃ターン(既存のカード・剣・銃が使える)の既定の長さ。StartSoulBattleや start() の指定が優先されます。
 * @type number
 * @decimals 1
 * @min 0.1
 * @default 8
 *
 * @param DefenseSeconds
 * @text 防御ターンの長さ(秒)
 * @desc 防御ターン(攻撃入力を遮断する仮のフェーズ)の既定の長さ。
 * @type number
 * @decimals 1
 * @min 0.1
 * @default 5
 *
 * @param Rounds
 * @text ラウンド数(0=終了するまで繰り返す)
 * @desc 攻撃ターン1回+防御ターン1回を1ラウンドとして、この回数で自動終了します。0なら end() するまで続きます。
 * @type number
 * @min 0
 * @default 0
 *
 * @param ShowLabel
 * @text フェーズ表示を出す
 * @desc 画面上部に「いまのフェーズと残り秒数」の小さな表示を出します(動作確認用)。
 * @type boolean
 * @default true
 *
 * @param PrepareLoop
 * @text 準備ループを使う(PREPARE→ATTACK→DEFENSE→PREPARE)
 * @desc true なら、開始時と防御の後に「準備」フェーズに入り、選択(攻撃)で攻撃へ進みます。false(既定)は従来の攻撃⇄防御。StartSoulBattleや start({prepare}) の指定が優先されます。
 * @type boolean
 * @default false
 *
 * @param PrepareAttackSeconds
 * @text 準備ループの攻撃ターンの長さ(秒・DEV仮)
 * @desc 準備ループ(prepare:true)で攻撃ターンの長さを指定しなかったときの既定(DEV の暫定値)。従来の攻撃⇄防御(prepare:false)には効きません。start() / StartSoulBattle の指定と setDurations が優先されます。
 * @type number
 * @decimals 1
 * @min 0.1
 * @default 8
 *
 * @param PrepareDefenseSeconds
 * @text 準備ループの防御ターンの長さ(秒・DEV仮)
 * @desc 準備ループ(prepare:true)で防御ターンの長さを指定しなかったときの既定(DEV の暫定値)。従来の攻撃⇄防御(prepare:false)には効きません。敵の弾幕(ProjectR_SoulEnemyBullets)が最後まで飛べる長さ。
 * @type number
 * @decimals 1
 * @min 0.1
 * @default 6
 *
 * @command StartSoulBattle
 * @text SOUL戦闘(P1): 開始
 * @desc SOUL戦闘のコントローラを始めます。プレイヤーの移動は止まり、戦闘中はセーブできません。
 * @arg attackSeconds
 * @text 攻撃ターンの長さ(秒。空=既定)
 * @type string
 * @default
 * @arg defenseSeconds
 * @text 防御ターンの長さ(秒。空=既定)
 * @type string
 * @default
 * @arg rounds
 * @text ラウンド数(空=既定。0=無限)
 * @type string
 * @default
 * @arg prepare
 * @text 準備ループ(空=プラグインパラメータ)
 * @type select
 * @option 既定(プラグインパラメータ)
 * @value auto
 * @option 使う
 * @value true
 * @option 使わない(従来の攻撃⇄防御)
 * @value false
 * @default auto
 * @arg firstPhase
 * @text 最初のフェーズ
 * @type select
 * @option 既定(準備ループなら準備から、そうでなければ攻撃から)
 * @value auto
 * @option 準備から(準備ループのとき)
 * @value prepare
 * @option 攻撃から
 * @value attack
 * @option 防御から
 * @value defense
 * @default auto
 * @arg heart
 * @text 敵ハート(P0のPoC)を出す
 * @type boolean
 * @default true
 * @arg pattern
 * @text ハートの動き
 * @type select
 * @option 止まる
 * @value static
 * @option 左右に往復
 * @value patrol
 * @option 楕円を回る
 * @value circle
 * @default patrol
 * @arg rangeX
 * @text ハートの動く範囲X(タイル)
 * @type number
 * @decimals 1
 * @min 0
 * @default 3
 * @arg rangeY
 * @text ハートの動く範囲Y(タイル。楕円のみ)
 * @type number
 * @decimals 1
 * @min 0
 * @default 0
 * @arg speed
 * @text ハートの速さ(タイル/秒)
 * @type number
 * @decimals 1
 * @min 0
 * @default 2
 *
 * @command EndSoulBattle
 * @text SOUL戦闘(P1): 終了して元に戻す
 * @desc 敵ハート・移動の停止・戦闘・セーブ禁止・表示を、すべて開始前の状態に戻します。
 *
 * @help
 * ProjectR_SoulBattle.js
 *
 * 【位置づけ】 SOUL戦闘のP1(進行役のコントローラ)です。js/plugins.js に登録しても、StartSoulBattle / start() を呼ぶまで何もしません(オプトイン)。
 *   敵のAI・弾幕・プレイヤーのハート操作はまだありません。防御ターンは「攻撃入力を遮断するだけの仮のフェーズ」です。
 *   js/plugins.js からこのプラグインの1行を消せば完全に無効になります(セーブデータには何も書きません)。
 *
 * 【状態】 idle(待機・戦闘なし) → attack ⇄ defense → cleanup(後始末・一瞬) → idle
 *   【準備ループ(オプトイン: start({prepare:true}) / パラメータ PrepareLoop)】 prepare → attack → defense → prepare … 開始時と防御の後に prepare に入ります。
 *   prepare : 時間では終わりません。選択(「攻撃」= beginAttack())か skipPhase() で attack へ進みます(ラウンドは進みません)。
 *             カード・通常攻撃・スキル・必殺技・ホットバーは DEFENSE と同じ仕組みで遮断します(理由は soulPrepare)。
 *             戦闘の時計も止めます: SOULのフェーズ時間は数えず、$gameMap.eventsPaused(敵ハートの動き・敵の攻撃・飛んでいる弾・武器)を立て、
 *             カードのクールダウンの時計(deck.updateCooldown)を進めません。自分が立てた eventsPaused は、準備を出る/終了する/マップ移動のどれでも必ず戻します。
 *             準備の画面(メニュー)は別プラグイン ProjectR_SoulBattlePrepare が出します。このコントローラは状態と遮断だけを持ちます。
 *   指定が無ければ従来どおり(攻撃⇄防御)。prepare を使わないときは何も変わりません。
 *   attack  : 既存のカード(Q/E/X/C/V)・剣・銃・必殺技がそのまま使えます。このプラグインは何も変えません。
 *   移動カード: SOULの間(攻撃・防御とも)、定義の category が "movement" のカード(絶・高速移動)は発動を受け付けません
 *             (reason: soulMovementBlocked)。カード・Cooldown・手札・絶の予備動作(予約)のどれも動かさないので、遅れて移動することもありません。
 *             すでに絶の予備動作中なら、SOULは始まりません(reason: movementPending)。SOULが終われば通常どおり使えます。
 *   defense : 新しい攻撃入力を遮断します。カード・必殺技・剣・銃(攻撃ボタン)・待ち行列の攻撃・長押し中のカード・
 *             Hendrix Hotbar のスキル(と共通イベントを持つアイテム)・攻撃用共通イベントの直接実行(並列割り当て)が対象です。
 *             遮断した入力ではカード・Cooldown・資源・弾薬を消費しません。
 *             すでに発動した攻撃(飛んでいる弾・矢、継続ダメージ、ビーム、範囲、毒など)は止めません。
 *             常駐の神・召喚の神(ProjectR_GodSummonManager)は自分から攻撃しないので、遮断の対象はありません。
 *   時間    : Game_Map.update で数えます(メニュー・会話・イベント中は進みません)。秒数はフレーム(1/60秒)に直します。
 *
 * 【ほかの機能との関係】
 *   戦闘セッション : ProjectRCombatSession に "soul_battle" として自分で登録します。ハートは P0 の ProjectRSoulBattlePoC に
 *                    combatSession:false, lockPlayer:false で出させるので、セッションの所有は重複しません。
 *   移動           : Hendrix の ControlPlayerMovement で止めます。自分が止めたときだけ、終了時に戻します。
 *   セーブ禁止     : $gameSystem の保存値(_saveEnabled)は書き換えません。戦闘中だけ isSaveEnabled() が false を返し、
 *                    Scene_Save の保存実行も止めます。終了すると何もしなくても元の許可に戻ります(セーブに混ざりません)。
 *   PoC単独の開始  : コントローラの動作中は拒否します(soulBattleActive)。コントローラは PoC が動作中なら開始しません(pocActive)。
 *
 * 【復元の契機】 end() / EndSoulBattle / ラウンド完了 / マップ移動 / ロード / ニューゲーム / タイトル等への場面移動 /
 *   戦闘の外部終了(endAllなど) / ハートの消滅 / プレイヤーの死亡。どれも同じ後始末を通ります。
 *
 * API: ProjectRSoulBattle
 *   start({ attackSeconds, defenseSeconds, rounds, prepare:true|false, firstPhase:"prepare"|"attack"|"defense", heart:true|false|{ pattern, rangeX, rangeY, speed, centerX, centerY },
 *           endOnHeartDefeat:true, endOnCardBattleEnd:true })       ※最後の2つは任意(既定は無効)。
 *        endOnHeartDefeat    ハートのHPが0以下(またはEventが撃破で消えた)になったら reason:"victory" で終える。
 *        endOnCardBattleEnd  開始時に動いていたカード戦闘が外から終わったら reason:"cardBattleEnded" で終える。
 *        -> { ok, reason?, state? }       end(reason?) -> boolean       isActive()       getPhase() -> "idle"|"prepare"|"attack"|"defense"|"cleanup"
 *   beginAttack(reason?) -> boolean(準備で「攻撃」を選ぶ。準備のときだけ true)    isPreparing()
 *   skipPhase() -> boolean(次のフェーズへ。準備なら攻撃へ)    setDurations({ attackSeconds, defenseSeconds }) (次のフェーズから有効)
 *   getDefaults() -> { legacy:{ attackSeconds, defenseSeconds }, prepare:{ attackSeconds, defenseSeconds }, explicit:{ attack, defense } }   秒数を指定しなかったときの既定(診断用)
 *   【秒数の既定】従来の攻撃⇄防御(prepare:false)は 8 / 5 秒(プラグインパラメータ)。準備ループ(prepare:true)は 8 / 6 秒(DEV の暫定値。PrepareAttackSeconds / PrepareDefenseSeconds)。
 *     start({ attackSeconds, defenseSeconds }) の明示指定と、setDurations で設定した値は、どちらの場合も優先されます。
 *   onPhase(fn) / onEnd(fn) -> 登録解除関数    fn({ from, to, round, reason }) / fn({ reason })
 *   getState() -> 診断用の状態     getLog()     getBlockedCounts() -> 防御中に遮断した入力の数(診断用)     gates() -> 遮断の取り付け状況
 */

(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulBattle";
    const ENGINE = "Hendrix_Action_Engine";
    const SOURCE_ID = "soul_battle";
    const PHASES = Object.freeze(["attack", "defense"]);                                  // 時間で進むフェーズ(従来どおり)
    const LOOP_PHASES = Object.freeze(["prepare", "attack", "defense"]);                  // 準備ループ(prepare:true)の一巡。prepare は時間では進まない
    const STATES = Object.freeze(["idle", "prepare", "attack", "defense", "cleanup"]);
    const MAX_LOG = 80;
    const params = PluginManager.parameters(PLUGIN);
    const finite = (value, fallback, min, max) => {
        const n = Number(value);
        return value !== "" && value !== undefined && value !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const config = Object.freeze({
        attackSeconds: finite(params.AttackSeconds, 8, 0.1, 600),
        defenseSeconds: finite(params.DefenseSeconds, 5, 0.1, 600),
        rounds: Math.floor(finite(params.Rounds, 0, 0, 999)),
        showLabel: params.ShowLabel === undefined || params.ShowLabel === "" ? true : String(params.ShowLabel) === "true",
        prepareLoop: params.PrepareLoop === undefined || params.PrepareLoop === "" ? false : String(params.PrepareLoop) === "true",      // 既定は従来の攻撃⇄防御
        prepareAttackSeconds: finite(params.PrepareAttackSeconds, 8, 0.1, 600),         // 準備ループ(prepare:true)で秒数を指定しなかったときの既定(DEV の暫定値。従来の攻撃⇄防御には効かない)
        prepareDefenseSeconds: finite(params.PrepareDefenseSeconds, 6, 0.1, 600)
    });

    let state = "idle";
    let run = null; // 動作中だけ存在する。セーブしない。
    let durations = { attackSeconds: config.attackSeconds, defenseSeconds: config.defenseSeconds }; // 実行時の既定(setDurationsで変更)
    const explicitDurations = { attack: false, defense: false };      // setDurations で明示された秒数は、準備ループの既定より優先する
    const blocked = { card: 0, movement: 0, attackEvent: 0, ultimate: 0, hotbar: 0, save: 0 };
    const prepareStats = { entered: 0, attackStarts: 0, skips: 0, cooldownFrozen: 0, pauses: 0 };      // 準備ループの診断(prepare:true のときだけ増える)
    const gateStatus = { card: false, attackEvent: false, attackInterpreter: false, ultimate: false, ultimateGauge: false, hotbarCommands: false, hotbarSlot: false, saveFlag: false, saveExecute: false, scene: false, cooldown: false };
    const log = [];
    const phaseHooks = new Set();
    const endHooks = new Set();
    const note = entry => { log.push(entry); if (log.length > MAX_LOG) log.shift(); };
    const fire = (hooks, payload) => {
        for (const hook of [...hooks]) {
            try { hook(payload); } catch (error) { note({ type: "hookError", message: String(error?.message || error) }); }
        }
    };
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const mapScene = () => {
        const current = typeof SceneManager !== "undefined" ? SceneManager._scene : null;
        return typeof Scene_Map !== "undefined" && current instanceof Scene_Map ? current : null;
    };
    const command = (name, args, eventId) => {
        const interpreter = new Game_Interpreter();
        interpreter._eventId = eventId || 0;
        PluginManager.callCommand(interpreter, ENGINE, name, args);
    };
    const movementLocked = () => (typeof playerMovementDisabled !== "undefined" ? !!playerMovementDisabled : false);
    const poc = () => root.ProjectRSoulBattlePoC;
    const attackCommonEventId = () => root.ProjectRCombatPresence?.settings?.attackCommonEventId ?? 1;
    const framesFor = seconds => Math.max(1, Math.round(seconds * 60));
    // 攻撃入力を遮断するフェーズ = DEFENSE と PREPARE(どちらも、カード・通常攻撃・スキル・必殺技を受け付けない)。理由の名前だけが違う。
    const defending = () => state === "defense" || state === "prepare";
    const lockReason = () => (state === "prepare" ? "soulPrepare" : "soulDefense");
    const soulActive = () => state === "attack" || state === "defense" || state === "prepare";
    const MOVEMENT_CATEGORIES = Object.freeze(["movement"]); // SOUL中は発動を受け付けないカードの分類(絶・高速移動)
    let hotbarGate = () => false; // installGates 内で差し替える(ホットバーの画面ができてから prototype を包む)

    // ---- 防御中の攻撃入力の遮断 ----
    // どれも「合流点」の手前で止めるだけ。防御中でなければ元の関数をそのまま呼ぶ(攻撃ターンは何も変わらない)。
    // 遮断した入力はカード・Cooldown・弾薬などを消費しない(元の関数に到達しない)。
    const blockedCard = () => ({ ok: false, reason: lockReason(), reasons: [{ code: lockReason() }] });
    const blockedMovement = () => ({ ok: false, reason: "soulMovementBlocked", reasons: [{ code: "soulMovementBlocked" }] });
    // 手札のhandIndex番目が移動カード(定義のcategoryが "movement")か。手札や定義が読めないときは false(元の関数に任せる)。
    const isMovementCardAt = handIndex => {
        try {
            const deck = root.ProjectRCardDeck;
            const card = deck.getBattleState?.()?.hand?.[handIndex];
            return !!card && MOVEMENT_CATEGORIES.includes(deck.definitions?.card?.(card.cardId)?.category);
        } catch (_error) { return false; }
    };
    const installGates = () => {
        // 1) カード(Q/E/X/C/V・押下プロファイルのカードの発動・待ち行列で後から処理される要求もここを通る)
        const deck = root.ProjectRCardDeck;
        if (deck && typeof deck.requestUseCard === "function") {
            const original = deck.requestUseCard;
            deck.requestUseCard = function(handIndex) {
                if (defending()) { blocked.card++; return blockedCard(); }
                // 移動カード(絶・高速移動)は、SOULの間は発動を受け付けない。元の関数を呼ばないので、予約(絶の予備動作)・消費・Cooldown・補充は起きない。
                // 待ち行列の要求も、ここで1枚ずつ判定される。
                if (soulActive() && isMovementCardAt(handIndex)) { blocked.movement++; return blockedMovement(); }
                return original.apply(this, arguments);
            };
            gateStatus.card = true;
        }
        // 1b) 準備(PREPARE)の間は、カードのクールダウンの時計(約15のプラグインが共有する deck.updateCooldown)を進めない。
        //     戦闘の時間(クールダウン・各効果の持続・状態異常)を止めるため。ATTACK/DEFENSE と、準備ループを使わないときの動作は変えない。
        if (deck && typeof deck.updateCooldown === "function") {
            const original = deck.updateCooldown;
            deck.updateCooldown = function() {
                if (state === "prepare") { prepareStats.cooldownFrozen++; return { ok: true, frozen: true, reason: "soulPrepare" }; }
                return original.apply(this, arguments);
            };
            gateStatus.cooldown = true;
        }
        // 2) 剣・銃・素手の攻撃ボタン(Hendrixが予約する攻撃用の共通イベント)。ProjectR_SwordSystem / GunSystem はこの予約の結果で動くので、予約しなければ動かない。
        if (typeof Game_Temp !== "undefined") {
            const original = Game_Temp.prototype.reserveCommonEvent;
            Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
                if (defending() && Number(commonEventId) === attackCommonEventId()) { blocked.attackEvent++; return undefined; }
                return original.apply(this, arguments);
            };
            gateStatus.attackEvent = true;
        }
        // 2b) 攻撃用の共通イベントの中身を直接動かす経路(Hendrix Keyboardの「並列」割り当てなど)。予約を通らないので、実行の準備で止める。
        if (typeof Game_Interpreter !== "undefined") {
            const original = Game_Interpreter.prototype.setup;
            Game_Interpreter.prototype.setup = function(list) {
                if (defending() && list && typeof $dataCommonEvents !== "undefined" && list === $dataCommonEvents?.[attackCommonEventId()]?.list) {
                    blocked.attackEvent++;
                    return undefined;
                }
                return original.apply(this, arguments);
            };
            gateStatus.attackInterpreter = true;
        }
        // 2c) Hendrix Hotbar(スキル・アイテムのスロット)。スキルの共通イベントを直接動かすので、上の遮断を通らない。
        //     スロットの使用は Sprite_SkillSlot.useSlotContents(キー・マウス)と UseSlot / UseSelectedSlot(ゲームパッド)の2系統。
        //     遮断するのは「スキル」と「共通イベントを持つアイテム」だけ。回復などの普通のアイテム・武器/防具スロットは止めない。
        const slotData = name => (typeof $gameSystem !== "undefined" ? $gameSystem?._uiSlotData?.[name] : null) || null;
        const slotBlocked = name => {
            const data = slotData(name);
            if (!data) return false;
            if (data.type === "skill") return true;
            return data.type === "item" && typeof $dataItems !== "undefined" && !!$dataItems?.[data.id]?.effects?.some(effect => effect.code === 44);
        };
        const hotbarGuard = name => { if (defending() && slotBlocked(name)) { blocked.hotbar++; return true; } return false; };
        const selectedSlotName = () => {
            const ui = mapScene()?._skillUI, cursor = ui?._gamepadCursor;
            return ui?._gamepadGrids?.[cursor?._currentGridIndex]?.slots?.[cursor?._currentSlotIndex]?.Name ?? null;
        };
        const commands = typeof PluginManager !== "undefined" ? PluginManager._commands : null;
        const useSlotKey = "Hendrix_Hotbar_Creator:UseSlot", useSelectedKey = "Hendrix_Hotbar_Creator:UseSelectedSlot";
        if (commands && typeof commands[useSlotKey] === "function" && typeof commands[useSelectedKey] === "function") {
            const useSlot = commands[useSlotKey], useSelected = commands[useSelectedKey];
            commands[useSlotKey] = function(args) { return hotbarGuard(args?.Name) ? undefined : useSlot.apply(this, arguments); };
            commands[useSelectedKey] = function() {
                if (defending()) { // 選択中のスロットが分からないときは、安全側に止める
                    const name = selectedSlotName();
                    if (name === null || slotBlocked(name)) { blocked.hotbar++; return undefined; }
                }
                return useSelected.apply(this, arguments);
            };
            gateStatus.hotbarCommands = true;
        }
        // スロットのクラスは Hendrix の内部にあるので、画面にあるスロットの prototype を一度だけ包む(戦闘の開始時と毎フレーム確かめる)。
        hotbarGate = () => {
            const slots = mapScene()?._skillUI?._slots;
            const first = slots && typeof slots.values === "function" ? slots.values().next().value : null;
            const proto = first ? Object.getPrototypeOf(first) : null;
            if (!proto || typeof proto.useSlotContents !== "function") return gateStatus.hotbarSlot;
            if (proto.useSlotContents._projectRSoulGate) return true;
            const original = proto.useSlotContents;
            const guarded = function() { return hotbarGuard(this._config?.Name) ? undefined : original.apply(this, arguments); };
            guarded._projectRSoulGate = true;
            proto.useSlotContents = guarded;
            gateStatus.hotbarSlot = true;
            return true;
        };
        // 3) 必殺技の新しい発動。2か所で止める。
        //    a) キーを押した時: UltimateActivation は CardBattleInput.getBlockedReason(event) が null のときだけ要求を受け付ける。
        //    b) 待ち行列に入っていた要求の処理時(攻撃ターンの最後に押して、防御に入ってから処理される場合): 発動の入口の
        //       「ゲージが満タンか」(isUltimateGaugeFull)を防御中だけ false にして、ゲージを消費せず断る(gaugeNotFull)。
        //    ※ CardBattleInput.canAcceptInput は止めない。Apollo/Hermes奥義の進行処理が「進めてよいか」の判定に使っており、
        //      止めると発動済みの奥義が防御中に固まってしまう(発動済みの攻撃は残す)。
        //    副作用: 防御中だけ BattleHUD のゲージ「満タン」表示が消える(ゲージの値・蓄積は変わらない)。
        const input = root.ProjectRCardBattleInput;
        if (input && typeof input.getBlockedReason === "function") {
            const reasonOf = input.getBlockedReason;
            input.getBlockedReason = function(event) {
                if (defending()) { if (event) blocked.ultimate++; return lockReason(); }
                return reasonOf.apply(this, arguments);
            };
            gateStatus.ultimate = true;
        }
        const gauge = root.ProjectRUltimateGauge;
        if (gauge && typeof gauge.isUltimateGaugeFull === "function") {
            const original = gauge.isUltimateGaugeFull;
            gauge.isUltimateGaugeFull = function() { return defending() ? false : original.apply(this, arguments); };
            gateStatus.ultimateGauge = true;
        }
        // 4) セーブ禁止。保存値(_saveEnabled)は触らず、戦闘中だけ false を返す。メニューのセーブ・オートセーブ・ProjectR_MenuHUD は isSaveEnabled を見る。
        if (typeof Game_System !== "undefined") {
            const original = Game_System.prototype.isSaveEnabled;
            Game_System.prototype.isSaveEnabled = function() {
                return state === "idle" ? original.apply(this, arguments) : false;
            };
            gateStatus.saveFlag = true;
        }
        // isSaveEnabled を見ない経路(イベントコマンド「セーブ画面を開く」)も、保存の実行で止める。
        if (typeof Scene_Save !== "undefined") {
            const original = Scene_Save.prototype.executeSave;
            Scene_Save.prototype.executeSave = function() {
                if (state !== "idle") { blocked.save++; this.onSaveFailure(); return undefined; }
                return original.apply(this, arguments);
            };
            gateStatus.saveExecute = true;
        }
    };
    installGates();

    // 防御に入った瞬間に、すでに待っている攻撃を片づける(待ち行列の共通イベント・長押し中のカード)。
    // CardBattleInput の押下要求の待ち行列は外から触れないので、次の更新で requestUseCard の遮断が捨てる。
    const clearQueuedAttacks = () => {
        let removed = 0;
        const queue = typeof $gameTemp !== "undefined" ? $gameTemp?._commonEventQueue : null;
        if (Array.isArray(queue)) {
            for (let i = queue.length - 1; i >= 0; i--) {
                if (Number(queue[i]) === attackCommonEventId()) { queue.splice(i, 1); removed++; }
            }
        }
        const canceled = !!root.ProjectRCardBattleInput?.cancelPress?.(undefined, lockReason());
        return { queuedEvents: removed, pressCanceled: canceled };
    };

    // ---- 準備(PREPARE)の凍結 ----
    // 準備の間は $gameMap.eventsPaused を立てる(PoCのハートの動き・敵の攻撃・飛んでいる弾・Hendrixの更新・武器など、ProjectR/Hendrixの戦闘の時計が従う共通の印)。
    // 自分が立てたときだけ、準備を出るとき(次のフェーズ・終了・マップ移動)に必ず戻す。他が先に立てていたら触らない。
    const holdPreparePause = r => {
        const m = map();
        if (m && !m.eventsPaused) { m.eventsPaused = true; r.pausedByPrepare = true; prepareStats.pauses++; }
    };
    const releasePreparePause = r => {
        if (!r.pausedByPrepare) return;
        r.pausedByPrepare = false;
        const m = map();
        if (m) m.eventsPaused = false;
    };

    // ---- フェーズ ----
    const secondsOf = phase => (phase === "attack" ? run.attackSeconds : run.defenseSeconds);
    const enterPhase = (phase, reason, from = state) => {
        releasePreparePause(run);                                // 準備を出る(または別フェーズへ入る)前に、必ず凍結を外す
        state = phase;
        run.phase = phase;
        run.total = phase === "prepare" ? 0 : framesFor(secondsOf(phase));      // 準備は時間で進まない(残り時間なし)
        run.frames = run.total;
        const cleared = phase === "defense" || phase === "prepare" ? clearQueuedAttacks() : null;
        if (phase === "prepare") prepareStats.entered++;
        note({ type: "phase", from, to: phase, round: roundOf(), reason, cleared });
        fire(phaseHooks, { from, to: phase, round: roundOf(), reason });          // 他のプラグイン(スキルの後始末など)が先に片づく
        if (run && !run.releasing && state === "prepare" && run.phase === "prepare") holdPreparePause(run);
    };
    const roundOf = () => Math.floor(run.phasesDone / 2) + 1;
    const nextPhase = reason => {
        if (!run || run.releasing) return false;
        if (run.phase === "prepare") {                           // 準備 → 攻撃。時間では来ない(選択 beginAttack か skipPhase だけ)。ラウンドは進めない
            enterPhase("attack", reason);
            return true;
        }
        if (!PHASES.includes(run.phase)) return false;
        run.phasesDone++;
        if (run.rounds > 0 && run.phasesDone >= run.rounds * 2) return release(run, "completed");
        // 準備ループ: 防御 → 準備(攻撃 → 防御 は従来どおり)
        enterPhase(run.phase === "defense" && run.prepare ? "prepare" : run.phase === "attack" ? "defense" : "attack", reason);
        return true;
    };
    // 準備で「攻撃」を選んだ。準備のときだけ受け付ける(時間・ラウンド・他のフェーズには影響しない)。
    const beginAttack = (reason = "choice") => {
        if (!run || run.releasing || state !== "prepare") return false;
        prepareStats.attackStarts++;
        return nextPhase(reason);
    };

    // ---- フェーズ表示(動作確認用の小さなSprite) ----
    const LABEL_W = 280, LABEL_H = 34;
    const createLabel = () => {
        const bitmap = new Bitmap(LABEL_W, LABEL_H);
        const sprite = new Sprite(bitmap);
        sprite.x = Math.round(((typeof Graphics !== "undefined" && Graphics.width) || 816) / 2 - LABEL_W / 2);
        sprite.y = 6;
        sprite._projectRSoulBattleLabel = true;
        return sprite;
    };
    const drawLabel = () => {
        const label = run.label;
        const seconds = Math.ceil(run.frames / 60);
        const key = `${run.phase}:${seconds}:${roundOf()}`;
        if (!label || run.labelKey === key) return;
        run.labelKey = key;
        const bitmap = label.bitmap;
        bitmap.clear();
        bitmap.fillRect(0, 0, LABEL_W, LABEL_H, run.phase === "attack" ? "rgba(20,110,60,0.75)" : run.phase === "prepare" ? "rgba(40,80,150,0.75)" : "rgba(150,30,50,0.75)");
        bitmap.fontSize = 20;
        const text = run.phase === "attack" ? `ATTACK  ${seconds}s  R${roundOf()}` : run.phase === "prepare" ? `PREPARE (choose)  R${roundOf()}` : `DEFENSE (attack locked)  ${seconds}s  R${roundOf()}`;
        bitmap.drawText(text, 8, 0, LABEL_W - 16, LABEL_H, "left");
    };
    const syncLabel = () => {
        const scene = mapScene();
        const spriteset = scene?._spriteset;
        if (!run.label || !spriteset) return;
        if (run.label.parent !== spriteset) spriteset.addChild(run.label); // メニューから戻ってSpritesetが作り直されたときも付け直す
        drawLabel();
    };

    // ---- 開始 ----
    const strict = (value, fallback, min, max) => {
        if (value === undefined || value === null || value === "") return { ok: true, value: fallback };
        const n = Number(value);
        return Number.isFinite(n) && n >= min && n <= max ? { ok: true, value: n } : { ok: false };
    };
    const normalizeHeart = heart => {
        if (heart === false || heart === "false") return null;
        const options = heart && typeof heart === "object" ? heart : {};
        return {
            centerX: options.centerX, centerY: options.centerY, pattern: options.pattern, rangeX: options.rangeX, rangeY: options.rangeY, speed: options.speed
        };
    };
    const start = (options = {}) => {
        if (state !== "idle" || run) return { ok: false, reason: "alreadyActive", state };
        const sessionApi = root.ProjectRCombatSession;
        if (!map() || typeof $gamePlayer === "undefined" || !mapScene()) return { ok: false, reason: "mapUnavailable" };
        if (!sessionApi || typeof sessionApi.begin !== "function" || !gateStatus.card || !gateStatus.attackEvent || !gateStatus.saveFlag) {
            return { ok: false, reason: "combatUnavailable" };
        }
        if (poc()?.isActive?.()) return { ok: false, reason: "pocActive" };
        // 絶の予備動作(予約済みの瞬間移動)は外から取り消せない。始める前なら待つしかないので、予備動作が終わるまで開始しない。
        if (root.ProjectRHermesZetsu?.isTeleportPending?.()) return { ok: false, reason: "movementPending" };
        // 秒数の既定: 従来の攻撃⇄防御は durations(8 / 5)。準備ループ(prepare:true)は準備ループ用の既定(DEV の暫定 8 / 6)。start() の指定と setDurations が優先。
        const prepareWanted = options.prepare === undefined || options.prepare === "" ? config.prepareLoop : options.prepare;
        const attack = strict(options.attackSeconds, prepareWanted === true && !explicitDurations.attack ? config.prepareAttackSeconds : durations.attackSeconds, 0.1, 600);
        const defense = strict(options.defenseSeconds, prepareWanted === true && !explicitDurations.defense ? config.prepareDefenseSeconds : durations.defenseSeconds, 0.1, 600);
        const rounds = strict(options.rounds, config.rounds, 0, 999);
        if (!attack.ok) return { ok: false, reason: "invalidAttackSeconds" };
        if (!defense.ok) return { ok: false, reason: "invalidDefenseSeconds" };
        if (!rounds.ok || !Number.isInteger(rounds.value)) return { ok: false, reason: "invalidRounds" };
        // 準備ループ(PREPARE → ATTACK → DEFENSE → PREPARE)。指定が無ければプラグインパラメータ(既定 false = 従来の攻撃⇄防御)。
        const prepare = options.prepare === undefined || options.prepare === "" ? config.prepareLoop : options.prepare;
        if (typeof prepare !== "boolean") return { ok: false, reason: "invalidOption:prepare" };
        const first = options.firstPhase === undefined || options.firstPhase === "" ? (prepare ? "prepare" : "attack") : String(options.firstPhase);
        if (first === "prepare" && !prepare) return { ok: false, reason: "prepareDisabled" };
        if (!LOOP_PHASES.includes(first)) return { ok: false, reason: "invalidFirstPhase" };
        const heart = normalizeHeart(options.heart === undefined ? true : options.heart);
        if (heart && typeof poc()?.start !== "function") return { ok: false, reason: "heartUnavailable" };
        // 任意の終了条件(既定はどちらも無効=従来どおり)。厳密な真偽値だけ受け付ける。
        for (const key of ["endOnHeartDefeat", "endOnCardBattleEnd"]) {
            if (options[key] !== undefined && typeof options[key] !== "boolean") return { ok: false, reason: "invalidOption:" + key };
        }

        const r = {
            mapId: map().mapId(), phase: first, frames: 0, total: 0, elapsed: 0, phasesDone: 0, rounds: rounds.value,
            attackSeconds: attack.value, defenseSeconds: defense.value, prepare, pausedByPrepare: false,
            ownsSession: false, lockedPlayer: false, heartOwned: false, heartExpected: !!heart, heartEventId: 0,
            label: null, labelKey: "", releasing: false, saveBefore: true,
            endOnHeartDefeat: options.endOnHeartDefeat === true && !!heart, endOnCardBattleEnd: options.endOnCardBattleEnd === true,
            hadCardBattle: !!root.ProjectRCardDeck?.isCardBattleActive?.(), heartAlive: false
        };
        try { r.saveBefore = !!Game_System.prototype.isSaveEnabled.call($gameSystem); } catch (_error) { r.saveBefore = true; }
        run = r;
        state = "cleanup"; // 開始の途中で失敗したときも、同じ後始末(release)で戻す。成功したらフェーズへ移る。
        try {
            const begun = sessionApi.begin(SOURCE_ID, { requireValidDeck: false });
            if (!begun.ok) return release(r, "combatRejected:" + begun.reason, { failed: true }); // alreadyActive も採用しない(所有の重複を避ける)
            r.ownsSession = true;
            if (!movementLocked()) {
                command("ControlPlayerMovement", { allowMovement: "false" }, 0);
                r.lockedPlayer = true;
            }
            if (heart) {
                const made = poc().start({ ...heart, combatSession: false, lockPlayer: false, managedBy: PLUGIN });
                if (!made.ok) return release(r, "heartFailed:" + made.reason, { failed: true });
                r.heartOwned = true;
                r.heartEventId = made.eventId;
            }
            if (config.showLabel) {
                try { r.label = createLabel(); } catch (error) { note({ type: "labelError", message: String(error?.message || error) }); }
            }
            hotbarGate();
            enterPhase(first, "start", "idle");
            syncLabel();
            note({ type: "start", mapId: r.mapId, first, prepare, attackSeconds: r.attackSeconds, defenseSeconds: r.defenseSeconds, rounds: r.rounds, heart: !!heart, saveBefore: r.saveBefore });
            return { ok: true, state };
        } catch (error) {
            return release(r, "error:" + String(error?.message || error), { failed: true });
        }
    };

    // ---- 終了・復元(すべての経路がここを通る) ----
    function release(r, reason, opts = {}) {
        if (r.releasing) return opts.failed ? { ok: false, reason } : false;
        r.releasing = true;
        state = "cleanup";
        const steps = [
            () => releasePreparePause(r),                                 // 準備の凍結(eventsPaused)は、どの終了経路でも最初に必ず外す
            () => { if (r.label) { r.label.parent?.removeChild?.(r.label); r.label.bitmap?.destroy?.(); r.label.destroy?.(); r.label = null; } },
            () => { if (r.heartOwned && poc()?.isActive?.()) poc().end("soulBattle:" + reason); r.heartOwned = false; },
            () => { if (r.lockedPlayer) command("ControlPlayerMovement", { allowMovement: "true" }, 0); r.lockedPlayer = false; },
            () => { if (r.ownsSession && root.ProjectRCombatSession) root.ProjectRCombatSession.end(SOURCE_ID, "soulBattle"); r.ownsSession = false; }
        ];
        for (const step of steps) {
            try { step(); } catch (error) { note({ type: "releaseError", message: String(error?.message || error) }); }
        }
        const rounds = r.phasesDone / 2;
        if (run === r) run = null;
        state = "idle";
        note({ type: "end", reason, rounds });
        fire(endHooks, { reason, rounds });
        return opts.failed ? { ok: false, reason } : true;
    }
    const end = (reason = "end") => (run ? release(run, reason) : false);

    // ハートのHPが一度でも正の値で観測され、その後0以下になったら撃破。HPが読めない間は撃破とみなさない。
    const heartDefeated = r => {
        const hp = poc()?.getState?.()?.hp;
        if (!Number.isFinite(hp)) return false;
        if (hp > 0) { r.heartAlive = true; return false; }
        return r.heartAlive;
    };
    // ---- 毎フレーム ----
    // 時間は Game_Map.update の先頭で数える(メニュー・会話・イベント中は進まない)。
    const timerRunning = map => {
        if (map.eventsPaused) return false;
        if (typeof map.isEventRunning === "function" && map.isEventRunning()) return false;
        if (typeof $gameMessage !== "undefined" && $gameMessage?.isBusy?.()) return false;
        return true;
    };
    if (typeof Game_Map !== "undefined") {
        const _update = Game_Map.prototype.update;
        Game_Map.prototype.update = function(sceneActive) {
            if (run && !run.releasing && sceneActive) {
                try {
                    const r = run;
                    if (r.mapId !== this.mapId()) end("mapChanged");
                    else if (r.endOnCardBattleEnd && r.hadCardBattle && !root.ProjectRCardDeck?.isCardBattleActive?.()) end("cardBattleEnded");   // カード戦闘が外から終わった
                    else if (r.endOnHeartDefeat && r.heartExpected && !poc()?.isActive?.()) end("victory");                                             // 撃破でハートのEventが消えた
                    else if (r.heartExpected && !poc()?.isActive?.()) end("heartGone");
                    else if (r.endOnHeartDefeat && heartDefeated(r)) end("victory");                                                                   // HPが0以下になった
                    else if (root.ProjectR?.PlayerDeath?.isDead?.()) end("playerDead");
                    else if (r.phase === "prepare") { /* 準備は時間で進まない(戦闘の時計は動かさない)。選択か skipPhase で攻撃へ */ }
                    else if (timerRunning(this)) {
                        r.elapsed++;
                        if (--r.frames <= 0) nextPhase("timer");
                    }
                } catch (error) { note({ type: "error", message: String(error?.message || error) }); }
            }
            return _update.apply(this, arguments);
        };
        const _setup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function() {
            if (run) release(run, "mapSetup");
            return _setup.apply(this, arguments);
        };
    }
    if (typeof Scene_Map !== "undefined") {
        const _sceneUpdate = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const result = _sceneUpdate.apply(this, arguments);
            // 防御中は、新しく始まった長押しのカードを毎フレーム取り消す(発動は requestUseCard の遮断が止めるが、溜め表示などを残さない)。
            if (run && defending()) { try { root.ProjectRCardBattleInput?.cancelPress?.(undefined, lockReason()); } catch (_error) { /* 表示のみ */ } }
            if (run) { try { hotbarGate(); } catch (_error) { /* ホットバーが無くても動く */ } }
            if (run) { try { syncLabel(); } catch (error) { note({ type: "error", message: String(error?.message || error) }); } }
            return result;
        };
    }
    if (typeof DataManager !== "undefined") {
        for (const name of ["extractSaveContents", "setupNewGame"]) {
            const original = DataManager[name];
            if (typeof original !== "function") continue;
            DataManager[name] = function() {
                if (run) release(run, name);
                return original.apply(this, arguments);
            };
        }
    }
    // マップ以外の場面(タイトル・ゲームオーバー等)へ移るときも戻す。場面の移動は SceneManager.goto を通る(メニューは push なので影響しない)。
    if (typeof SceneManager !== "undefined" && typeof SceneManager.goto === "function") {
        const _goto = SceneManager.goto;
        SceneManager.goto = function(sceneClass) {
            if (run && sceneClass && sceneClass !== Scene_Map) release(run, "sceneChange:" + (sceneClass.name || "scene"));
            return _goto.apply(this, arguments);
        };
        gateStatus.scene = true;
    }
    // 戦闘が外から終わったとき(endAllなど)は、コントローラも終える。
    if (root.ProjectRCombatSession?.onEnd) {
        root.ProjectRCombatSession.onEnd(payload => { if (run && payload?.sourceId === SOURCE_ID && !run.releasing) release(run, "combatEnded"); });
    }

    // ---- 操作 ----
    const setDurations = (options = {}) => {
        const attack = strict(options.attackSeconds, undefined, 0.1, 600);
        const defense = strict(options.defenseSeconds, undefined, 0.1, 600);
        if (!attack.ok || !defense.ok) return { ok: false, reason: "invalidDuration" };
        if (attack.value !== undefined) { durations.attackSeconds = attack.value; explicitDurations.attack = true; if (run) run.attackSeconds = attack.value; }
        if (defense.value !== undefined) { durations.defenseSeconds = defense.value; explicitDurations.defense = true; if (run) run.defenseSeconds = defense.value; }
        return { ok: true, attackSeconds: durations.attackSeconds, defenseSeconds: durations.defenseSeconds };
    };
    const getState = () => {
        const base = { state, blocked: { ...blocked }, attackSeconds: durations.attackSeconds, defenseSeconds: durations.defenseSeconds };
        const saveNow = typeof $gameSystem !== "undefined" && $gameSystem ? !!$gameSystem.isSaveEnabled() : null;
        if (!run) return { active: false, ...base, saveEnabled: saveNow };
        const r = run;
        return {
            active: true, ...base, phase: r.phase, prepare: r.prepare, paused: r.pausedByPrepare, prepareStats: { ...prepareStats }, round: roundOf(), phasesDone: r.phasesDone, rounds: r.rounds, mapId: r.mapId,
            framesLeft: r.frames, totalFrames: r.total, secondsLeft: r.frames / 60, elapsedFrames: r.elapsed,
            attackSeconds: r.attackSeconds, defenseSeconds: r.defenseSeconds,
            ownsSession: r.ownsSession, lockedPlayer: r.lockedPlayer, endOnHeartDefeat: r.endOnHeartDefeat, endOnCardBattleEnd: r.endOnCardBattleEnd, hadCardBattle: r.hadCardBattle, heart: { expected: r.heartExpected, owned: r.heartOwned, eventId: r.heartEventId },
            saveBefore: r.saveBefore, saveEnabled: saveNow, label: r.label ? { attached: !!r.label.parent, text: r.labelKey } : null
        };
    };

    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        PluginManager.registerCommand(PLUGIN, "StartSoulBattle", args => {
            const result = start({
                attackSeconds: args.attackSeconds, defenseSeconds: args.defenseSeconds, rounds: args.rounds, firstPhase: args.firstPhase === "auto" ? undefined : args.firstPhase,
                prepare: args.prepare === "true" ? true : args.prepare === "false" ? false : undefined,   // "auto"/空 = プラグインパラメータ
                heart: args.heart === "false" ? false : { pattern: args.pattern, rangeX: args.rangeX, rangeY: args.rangeY, speed: args.speed }
            });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] start failed:`, result.reason);
        });
        PluginManager.registerCommand(PLUGIN, "EndSoulBattle", () => { end("command"); });
    }

    root.ProjectRSoulBattle = Object.freeze({
        STATES, PHASES, LOOP_PHASES, SOURCE_ID,
        start, end, isActive: soulActive, getPhase: () => state,
        getDefaults: () => ({ legacy: { attackSeconds: durations.attackSeconds, defenseSeconds: durations.defenseSeconds }, prepare: { attackSeconds: explicitDurations.attack ? durations.attackSeconds : config.prepareAttackSeconds, defenseSeconds: explicitDurations.defense ? durations.defenseSeconds : config.prepareDefenseSeconds }, explicit: { attack: explicitDurations.attack, defense: explicitDurations.defense } }),
        isPreparing: () => state === "prepare", beginAttack,
        skipPhase: () => { if (state === "prepare") prepareStats.skips++; return nextPhase("skip"); }, setDurations,
        onPhase: fn => { phaseHooks.add(fn); return () => phaseHooks.delete(fn); },
        onEnd: fn => { endHooks.add(fn); return () => endHooks.delete(fn); },
        getState, getLog: () => log.map(entry => ({ ...entry })),
        getBlockedCounts: () => ({ ...blocked }),
        gates: () => ({ ...gateStatus })
    });
})();
