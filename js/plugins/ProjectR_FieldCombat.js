/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR リアルタイム・フィールド戦闘(BAPBAP参考): マップ上で連続して戦う固定アビリティ(Q/Space/E/R/C)・敵の予兆・HUD。SOUL戦闘の開始を止める。
 * @author ProjectR
 * @base ProjectR_CardDeckCore
 * @base ProjectR_CombatSession
 * @base ProjectR_CombatPresence
 * @base ProjectR_CardBattleInput
 * @base ProjectR_EnemyAttack
 * @orderAfter ProjectR_CardBattleInput
 * @orderAfter ProjectR_UltimateActivation
 * @orderAfter ProjectR_HermesZetsu
 * @orderAfter ProjectR_HermesIssen
 * @orderAfter ProjectR_EnemyAttack
 * @orderAfter ProjectR_SoulDevBoss
 *
 * @param SoulMode
 * @text SOUL戦闘の開始(通常のプレイ)
 * @desc off=SOUL/SOUL RUSHの開始をすべて断る(通常のプレイの既定) / dev=Playtestのときだけ許す / on=許す。コードとセーブデータは消しません。
 * @type select
 * @option off(通常のプレイでは使えない)
 * @value off
 * @option dev(Playtestだけ)
 * @value dev
 * @option on(使える)
 * @value on
 * @default off
 *
 * @param EnforceEncounterOnly
 * @text 戦闘は戦闘マップのエンカウンター中だけ(武器の使用も)
 * @desc true: エンカウンター中(と、アリーナ・SOUL等の既存の戦闘中)以外は、基本攻撃(銃・剣)が使えない。探索マップで戦闘の入力を無効にする。
 * @type boolean
 * @default true
 *
 * @param RequireBattleMapTag
 * @text 戦闘マップに <fieldBattleMap> を必須にする
 * @desc true: 移動先のマップのメモに <fieldBattleMap> が無いと、戦闘を始めず、元のマップへ戻る(探索マップを戦闘マップにしてしまう事故の防止)。
 * @type boolean
 * @default true
 *
 * @param DevAllowOutsideEncounter
 * @text (DEV) エンカウンター以外でも戦闘を始められる
 * @desc true: ProjectRFieldCombat.begin() をエンカウンターの外でも使える(テスト用。通常のプレイでは false)。
 * @type boolean
 * @default false
 *
 * @param EnemyPerception
 * @text 敵の視界(見えている間だけ追う)
 * @desc true: 敵は、視界の距離・視野角の中で、壁・閉じた扉に遮られずにプレイヤーが見えている間だけ追う・攻撃する。見失うと、すぐに止まって待つ(プレイヤーの位置を覚えない)。false: 従来(壁越しでも距離内なら追う)。
 * @type boolean
 * @default true
 *
 * @param EnemySightTiles
 * @text 敵の視界の距離(tile)
 * @desc 敵のイベントのメモ <fieldEnemy: sight=8> で、敵ごとに変えられる(aggro=N でも同じ)。
 * @type number
 * @decimals 1
 * @min 1
 * @default 10
 *
 * @param EnemyFovDegrees
 * @text 敵の視野角(度)
 * @desc 敵の向き(イベントの向き)を中心にした角度。360=全周。敵のイベントのメモ <fieldEnemy: fov=90> で、敵ごとに変えられる。見つけたあとは、プレイヤーの方を向いて追う(見失うまで視野角は問わない)。
 * @type number
 * @min 10
 * @max 360
 * @default 140
 *
 * @param SpecialCooldown
 * @text Q 特殊アビリティ(一閃)のCooldown(秒)
 * @desc 0以下ならカードの既定(7秒)。
 * @type number
 * @decimals 1
 * @default 7
 *
 * @param MobilityCooldown
 * @text Space 移動アビリティ(絶)のCooldown(秒)
 * @desc 絶のカードのCooldown(0.5秒)は手札の補充用の値なので、フィールド戦闘ではこの値を使う。
 * @type number
 * @decimals 1
 * @default 3
 *
 * @param ConsumableCooldown
 * @text R 消耗品のCooldown(秒)
 * @type number
 * @decimals 1
 * @default 8
 *
 * @param ConsumableItemId
 * @text R 消耗品のアイテムID(0=持っているHP回復薬を自動で選ぶ)
 * @type item
 * @default 0
 *
 * @command StartFieldEncounter
 * @text フィールド戦闘: エンカウンターを始める
 * @desc 元のマップ・位置・向きを記録し、(戦闘マップを指定すれば)そのまま戦闘マップへ移動します。戦闘は、戦闘マップの準備が終わってから始まります。
 * @arg encounterId
 * @text エンカウンターID(記録用の名前)
 * @type string
 * @default field_encounter
 * @arg battleMapId
 * @text 戦闘マップ(0=あとで「戦闘マップへ移動」で指定)
 * @type number
 * @min 0
 * @default 0
 * @arg spawnX
 * @text 出現位置 X
 * @type number
 * @min 0
 * @default 0
 * @arg spawnY
 * @text 出現位置 Y
 * @type number
 * @min 0
 * @default 0
 * @arg direction
 * @text 出現時の向き
 * @type select
 * @option 上
 * @value 8
 * @option 下
 * @value 2
 * @option 左
 * @value 4
 * @option 右
 * @value 6
 * @default 8
 * @arg resultVariableId
 * @text 結果を入れる変数(0=使わない。1=勝利 / 2=敗北 / 3=中断)
 * @type variable
 * @default 0
 * @arg victoryCommonEventId
 * @text 勝利して元のマップへ戻った後に実行するコモンイベント(0=なし)
 * @type common_event
 * @default 0
 * @arg otherCommonEventId
 * @text 中断して元のマップへ戻った後に実行するコモンイベント(0=なし)
 * @type common_event
 * @default 0
 *
 * @command TransferToBattleMap
 * @text フィールド戦闘: 戦闘マップへ移動する
 * @desc 「エンカウンターを始める」で戦闘マップを指定しなかったときに、移動先を指定して移動します(エンカウンターを始めた後だけ)。
 * @arg battleMapId
 * @text 戦闘マップ
 * @type number
 * @min 1
 * @default 1
 * @arg spawnX
 * @text 出現位置 X
 * @type number
 * @min 0
 * @default 0
 * @arg spawnY
 * @text 出現位置 Y
 * @type number
 * @min 0
 * @default 0
 * @arg direction
 * @text 出現時の向き
 * @type select
 * @option 上
 * @value 8
 * @option 下
 * @value 2
 * @option 左
 * @value 4
 * @option 右
 * @value 6
 * @default 8
 *
 * @command CompleteFieldEncounter
 * @text フィールド戦闘: エンカウンターを終える
 * @desc 戦闘を片づけて、元のマップ・位置・向きへ戻ります(結果は1回だけ処理)。敵を全員倒したときは自動で「勝利」になるので、ボス戦・撤退などの特別な終わり方に使います。
 * @arg result
 * @text 結果
 * @type select
 * @option 勝利
 * @value victory
 * @option 中断・撤退
 * @value other
 * @default victory
 *
 * @command AttachFieldEnemy
 * @text フィールド戦闘: 敵の行動をつける
 * @desc 戦闘マップのイベントを、近づいて溜めて攻撃する敵にします(イベントのメモに <fieldEnemy> と書いても同じ。戦闘マップの準備が終わった後に有効)。
 * @arg eventId
 * @text イベントID(0=このイベント)
 * @type number
 * @min 0
 * @default 0
 * @arg windupFrames
 * @text 溜め(フレーム)
 * @type number
 * @min 1
 * @default 36
 * @arg cooldownFrames
 * @text 攻撃後の間(フレーム)
 * @type number
 * @min 0
 * @default 120
 * @arg reach
 * @text 攻撃の届く距離(tile)
 * @type number
 * @decimals 1
 * @default 1.2
 * @arg sightTiles
 * @text 視界の距離(tile。空=パラメータ)
 * @type number
 * @decimals 1
 * @arg fovDegrees
 * @text 視野角(度。空=パラメータ)
 * @type number
 *
 * @command AbortFieldEncounter
 * @text フィールド戦闘: エンカウンターを中断する
 * @desc 戦闘を片づけて元のマップへ戻ります(結果は「中断」)。
 *
 * @help
 * ProjectR_FieldCombat.js
 *
 * 【目的】 戦闘を「マップ上のリアルタイム(BAPBAP参考)」へ戻す。ATTACK/DEFENSEの区切りもカードのドローも使わない。SOUL戦闘は
 *   コードもセーブも消さず、開始だけを止める(SoulMode)。新しい武器・スキル・敵AIは作らず、既存のProjectRの部品をつなぐ。
 *
 * 【エンカウンター(戦闘が使える場所)】 戦闘は、NPCとの会話・物語のイベントから入る「専用の戦闘マップ」の中だけです。探索マップでは、近くに敵がいても
 *   戦闘は始まらず、戦闘の入力(Q/E/R/C/Space・基本攻撃)は無効です(移動・NPC・イベント・メニューは普通のまま)。
 *   流れ: ①イベントのプラグインコマンド「エンカウンターを始める」(元のマップ・位置・向きを記録 → 戦闘マップへ移動)
 *         ②戦闘マップの準備が終わる(移動・フェード・開始時のイベントの後)→ 戦闘・敵の行動・アビリティ・HUDが有効になる
 *         ③敵を全員倒すと「勝利」(結果を1回だけ処理 → 戦闘を片づける → 元のマップ・位置・向きへ戻る → 結果の変数・コモンイベント)
 *            「エンカウンターを終える」(ボス戦・撤退など)/「中断する」でも同じ。敗北(HPが0)は、自動では戻らず、既存の死亡・ロードの扱いのまま
 *            (戦闘は片づく・結果=敗北・エンカウンター中はセーブできない)。ロード・ニューゲームで、すべて初期状態へ戻る。
 *   戦闘マップの条件: マップのメモに <fieldBattleMap>(RequireBattleMapTag)。敵にするイベントのメモ(または有効なページの注釈)に <fieldEnemy> と書く。
 *     <fieldEnemy: windup=36, cooldown=120, reach=1.2, aggro=10, chase=1>  (すべて省略可。数値の単位は「フィールド戦闘: 敵の行動をつける」と同じ)
 *     sight=視界の距離(tile) / fov=視野角(度)。省略すると、プラグインパラメータ(EnemySightTiles / EnemyFovDegrees)。
 *     敵のイベントには、Hendrix の敵の印(<hp: 敵名> と <enemy>)も必要です(武器・奥義が当たるように)。
 *
 * 【操作(固定)】
 *   WASD      移動(Hendrix Button Configのまま。DotMoveの自由移動)
 *   マウス    照準(戦闘中は ProjectR_PlayerFacing が主人公をマウスの方向へ向ける)
 *   左クリック(またはJ)  通常攻撃(既存の基本攻撃 共通イベント1 → 剣(SwordSystem) / 銃(GunSystem)。このPluginは変えない)
 *   Q         特殊アビリティ  = 一閃(hermes_issen。マウス方向の直線上の敵へ防御無視の直接ダメージ + 分割ダメージ)
 *   Space     移動アビリティ  = 絶(hermes_zetsu。マウス位置へ瞬間移動 + 直後の通常攻撃1ヒットを強化)。予兆された攻撃の範囲から抜ける回避
 *   E         奥義            = Ultimate(UltimateActivation。ゲージが満タンのときだけ。ゲージは与ダメージでたまる)
 *   R         消耗品          = HP回復薬(持っているアイテムを1個使う。Cooldownあり)
 *   C         アビリティのキャンセル(押しっぱなし中の発動・保留中の入力を取り消す)
 *   F         調べる(Hendrix Button Config の Interact。戦闘中もそのまま)
 *   戦闘中の入力の衝突は、このPluginがマップ戦闘中だけ Q/E/R/C/Space を先に受け取って解決する(メッセージ・メニュー・会話・イベント中は元のまま)。
 *
 * 【固定アビリティ】 カードの山札・手札・ドローは使わない。CardDeckCore の固定アビリティ(startCardBattle(FIXED_BATTLE) と useFixedCard)で、
 *   既存のカード効果(handler)をそのまま1回使う。所持カード・指輪には依らない。Cooldownはこのプラグインが持つ(スロットごと)。
 *
 * 【敵の視界】 敵は、(1)視界の距離の内側 (2)敵の向きを中心にした視野角の内側(見つける瞬間だけ)(3)敵とプレイヤーを結ぶ線が、壁(Region 255)・閉じた扉(<VisionWall>)に遮られていない、の3つが
 *   そろっている間だけ、プレイヤーを追い、攻撃する。開いた扉は視線を通す。見失った瞬間に、追うのをやめて、その場で待つ(プレイヤーの位置を覚えない・探さない)。
 *   見えるようになれば、また見つけて追う。視線の判定は ProjectR_CombatOcclusion(hasLineOfSight、mode:"vision")で、プレイヤーの霧(FogOfWar)とは無関係。攻撃・ダメージ・HP・戦闘のルールは変えない。
 *   API: getEnemyPerception(eventId) / getPerception() / setPerception({ enabled, sightTiles, fovDegrees })(DEV。保存しない)
 *
 * 【敵】 ProjectREnemyAttack(予約 → 溜め → 実行)を使う。attachEnemy(eventId) で、生きている敵のEventに「近づいて、溜めて、近接攻撃する」行動を
 *   つける(メモリ上だけ)。溜めの間、予兆(攻撃の範囲)が赤く画面に出る。Eventに元からある並列ページの攻撃は止める(二重にならないように)。
 *
 * API: ProjectRFieldCombat
 *   エンカウンター: startEncounter(options) / transferToBattleMap(options) / completeEncounter(result) / abortEncounter(reason)
 *                  getEncounterState() / onEncounterResult(fn) / isCombatAllowed()
 *   begin(options?) / end(reason?) / isActive() / getState()     (begin はエンカウンター中だけ。DEVは setDevAllowOutsideEncounter(true))
 *   getLoadout() / getCooldowns() / useAbility(slot, source?) / cancel() / getHudState() / getLastResult() / getLog()
 *   attachEnemy(eventId, options?) / detachEnemy(eventId) / listEnemies()
 *   getSoulMode() / setSoulMode(mode) / isSoulAllowed()
 *   スロット名: special(Q) / mobility(Space) / ultimate(E) / consumable(R) / cancel(C)
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_FieldCombat";
    const SOURCE = "field_combat";
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const num = (v, f, min) => { const n = Number(v); return Number.isFinite(n) && n >= (min ?? -Infinity) ? n : f; };
    const deck = () => root.ProjectRCardDeck;
    const presence = () => root.ProjectRCombatPresence;
    const combatSession = () => root.ProjectRCombatSession;
    const cardInput = () => root.ProjectRCardBattleInput;
    const enemyAttack = () => root.ProjectREnemyAttack;
    const ultimate = () => root.ProjectRUltimateActivation;
    const map = () => (typeof $gameMap !== "undefined" ? $gameMap : null);
    const safe = (fn, fallback) => { try { return fn(); } catch (_error) { return fallback; } };
    const fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });

    // ------------------------------------------------------------------ 設定(SOUL・自動開始・Cooldown) ----------------------------------------------------------------
    const cfg = {                                                                       // (旧 AutoEngage / EngageTiles / DisengageSeconds は廃止: 近づいただけの自動の戦闘開始はしない)
        soulMode: ["off", "dev", "on"].includes(String(params.SoulMode)) ? String(params.SoulMode) : "off",
        enforce: String(params.EnforceEncounterOnly ?? "true") !== "false",
        requireTag: String(params.RequireBattleMapTag ?? "true") !== "false",
        devAllowOutside: String(params.DevAllowOutsideEncounter ?? "false") === "true",
        consumableItemId: Math.round(num(params.ConsumableItemId, 0, 0)),
        perception: String(params.EnemyPerception ?? "true") !== "false",
        sightTiles: Math.max(1, num(params.EnemySightTiles, 10, 0.1)),
        fovDegrees: Math.min(360, Math.max(10, num(params.EnemyFovDegrees, 140, 0)))
    };
    const perceptionDefaults = { perception: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees };
    const isPlaytest = () => typeof Utils !== "undefined" && typeof Utils.isOptionValid === "function" && Utils.isOptionValid("test") === true;
    // SOUL/SOUL RUSHの開始を許すか。通常のプレイでは false(コード・セーブデータは消さない)。ProjectR_SoulEncounter.start と ProjectR_SoulTestEntry が確認する。
    const isSoulAllowed = () => cfg.soulMode === "on" || (cfg.soulMode === "dev" && isPlaytest());

    // ------------------------------------------------------------------ 固定アビリティの定義(ヘルメース) ----------------------------------------------------------------
    // 新しい技は作らない: 既存のカード効果(一閃・絶)・Ultimate・アイテムをスロットへ割り当てるだけ。Cooldownはここの値(カードの手札補充用の値ではない)。
    const LOADOUT = Object.freeze({
        attack:     Object.freeze({ slot: "attack",     key: "LMB",   code: null,        label: "通常攻撃", kind: "engine" }),
        special:    Object.freeze({ slot: "special",    key: "Q",     code: "KeyQ",      keyCode: 81, label: "一閃", kind: "card", cardId: "hermes_issen", cooldown: num(params.SpecialCooldown, 7, 0) }),
        mobility:   Object.freeze({ slot: "mobility",   key: "Space", code: "Space",     keyCode: 32, label: "絶",   kind: "card", cardId: "hermes_zetsu", cooldown: num(params.MobilityCooldown, 3, 0) }),
        ultimate:   Object.freeze({ slot: "ultimate",   key: "E",     code: "KeyE",      keyCode: 69, label: "奥義", kind: "ultimate", cooldown: 0 }),
        consumable: Object.freeze({ slot: "consumable", key: "R",     code: "KeyR",      keyCode: 82, label: "回復薬", kind: "item", cooldown: num(params.ConsumableCooldown, 8, 0) }),
        cancel:     Object.freeze({ slot: "cancel",     key: "C",     code: "KeyC",      keyCode: 67, label: "キャンセル", kind: "cancel", cooldown: 0 })
    });
    const SLOT_BY_CODE = Object.freeze({ KeyQ: "special", Space: "mobility", KeyE: "ultimate", KeyR: "consumable", KeyC: "cancel" });
    const SLOT_BY_KEYCODE = Object.freeze({ 81: "special", 32: "mobility", 69: "ultimate", 82: "consumable", 67: "cancel" });
    const CAST_SLOTS = ["special", "mobility", "ultimate", "consumable"];
    const FPS = 60;

    const rt = {
        active: false, engaged: false, frame: 0, serial: 0,
        cooldowns: { special: 0, mobility: 0, ultimate: 0, consumable: 0 },
        pending: [], captured: new Set(), lastResult: null, log: [], diag: { keyDowns: 0, accepted: 0, passed: 0, lastCode: null, lastDecision: null, lastReason: null },
        enemies: new Map(), flash: { slot: null, until: 0, ok: true }, generation: 0, lastPos: null, touchAssists: 0
    };
    const note = entry => { rt.log.push({ frame: rt.frame, ...entry }); if (rt.log.length > 120) rt.log.shift(); };

    // ------------------------------------------------------------------ 固定戦闘(CardDeckCore は変更しない) ----------------------------------------------------------------
    // カード効果(一閃・絶)は「手札のカードを使う」前提(使ったあとの消費・ダメージの確定を requestUseCard の後処理で行う)。手札・山札を持たない「固定戦闘」を、
    //   CardDeckCore が公開している BattleDeckSession の prototype を広げて作る(CardDeckCore のファイルは変えない)。
    //   ・startCardBattle(FIXED_BATTLE): デッキの検証なしに始まる。この戦闘の「手札」は固定アビリティが置かれる場所になり、使っても消えない(消費・Cooldown山・ドローなし)。
    //   ・useFixedCard(cardId): 固定アビリティを手札に置き(最初だけ)、通常の requestUseCard の経路で1回使う。所持・指輪の確認は省く。通常の戦闘では使えない。
    const FIXED_BATTLE = Object.freeze({ fixedAbilityBattle: true });
    const fixedSessions = new WeakSet();
    let fixedSession = null, pendingFixed = null;
    const installFixedBattle = () => {
        const d = deck(), S = d && d.BattleDeckSession;
        if (!d || !S || !S.prototype || S.prototype.__projectRFixed) return;
        const _start = S.prototype.start, _use = S.prototype.use;
        S.prototype.start = function(cardIds) {
            if (cardIds !== FIXED_BATTLE) return _start.apply(this, arguments);
            fixedSessions.add(this); pendingFixed = this;
            const real = this.service, fixedService = Object.create(real);
            fixedService.cardInvalidReasons = () => [];                                         // 所持・指輪の確認を省く(固定アビリティは所持に依らない)
            Object.defineProperty(this, "service", { get: () => fixedService, set() { /* requestUseCard が毎回代入する値は無視する */ }, configurable: true });
            this.state = { drawPile: [], hand: [], discardPile: [], cooldownPile: [] };
            return { ok: true, reasons: [], state: this.snapshot() };
        };
        S.prototype.use = function(instanceId) {
            if (!fixedSessions.has(this)) return _use.apply(this, arguments);
            if (!this.state) return { ok: false, reason: "BATTLE_NOT_STARTED" };
            return this.state.hand.some(card => card.instanceId === instanceId) ? { ok: true, state: this.snapshot() } : { ok: false, reason: "CARD_NOT_IN_HAND" };
        };
        S.prototype.__projectRFixed = true;
        d.FIXED_BATTLE = FIXED_BATTLE;
        d.useFixedCard = cardId => {
            const id = String(cardId ?? "").trim();
            if (!d.isCardBattleActive() || !fixedSession || !fixedSessions.has(fixedSession) || !fixedSession.state) return { ok: false, reason: "battleInactive" };
            if (!d.definitions?.card?.(id)) return { ok: false, reason: "cardUnavailable" };
            const hand = fixedSession.state.hand, instanceId = "fixed-" + id;
            let index = hand.findIndex(card => card.instanceId === instanceId);
            if (index < 0) { if (hand.length >= d.HAND_SIZE) return { ok: false, reason: "handFull" }; hand.push({ instanceId, cardId: id }); index = hand.length - 1; }
            return d.requestUseCard(index);
        };
        // startBattle は、新しい戦闘を作った直後に endBattle(前の戦闘の片づけ)を呼ぶので、開始が終わってから固定セッションを覚える。
        const _startBattle = d.startBattle;
        d.startBattle = function(cardIds) {
            pendingFixed = null;
            const result = _startBattle.apply(this, arguments);
            fixedSession = cardIds === FIXED_BATTLE && result && result.ok ? pendingFixed : null; pendingFixed = null;
            return result;
        };
        const _endBattle = d.endBattle;
        d.endBattle = function() { fixedSession = null; return _endBattle.apply(this, arguments); };
    };
    installFixedBattle();

    // ------------------------------------------------------------------ 開始と終了 ----------------------------------------------------------------
    const sceneIsMap = () => typeof SceneManager !== "undefined" && typeof Scene_Map !== "undefined" && SceneManager._scene instanceof Scene_Map && !!SceneManager._scene._spriteset;
    const soulBusy = () => safe(() => root.ProjectRSoulBattle?.isActive?.() === true || (root.ProjectRSoulEncounter?.getState?.().state ?? "idle") !== "idle", false);
    const resetCooldowns = () => { for (const slot of Object.keys(rt.cooldowns)) rt.cooldowns[slot] = 0; };

    const begin = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (rt.active) return fail("alreadyActive");
        if (!o.encounter && !isCombatAllowed()) return fail("encounterRequired");               // 戦闘は戦闘マップのエンカウンター中だけ(DEVだけ例外)
        if (!deck() || !combatSession() || !presence()) return fail("systemUnavailable");
        if (!sceneIsMap() || typeof $gamePlayer === "undefined" || !$gamePlayer) return fail("mapUnavailable");
        if (soulBusy()) return fail("soulActive");
        if (deck().isCardBattleActive?.()) return fail("cardBattleActive");                 // Arena等が持つカード戦闘の最中には始めない
        if (typeof deck().FIXED_BATTLE === "undefined" || typeof deck().useFixedCard !== "function") return fail("fixedBattleUnavailable");
        if (o.grantHermes === true) safe(() => { root.ProjectRHermesProductionDeck?.acquireRing?.("hermes", { source: "fieldCombat" }); deck().setUltimateRing?.("hermes"); });
        // 固定キャラクター(ヘルメース)の奥義: Ultimate指輪がまだ選ばれておらず、ヘルメースの指輪を主人公が持っているときだけ、ヘルメースを選ぶ(すでに選ばれている指輪は変えない)。
        safe(() => { if (!deck().getUltimateRingId?.() && deck().hasPlayerRing?.("hermes")) deck().setUltimateRing("hermes"); });
        const started = deck().startCardBattle(deck().FIXED_BATTLE);
        if (!started || started.ok !== true) return fail("fixedBattleFailed");
        const began = combatSession().begin(SOURCE, { cardBattle: false });
        if (!began.ok) { deck().endCardBattle(); return fail(began.reason || "combatSessionRejected"); }
        rt.active = true; rt.engaged = o.encounter === true; rt.pending = []; rt.generation++; rt.serial++;
        resetCooldowns(); rt.lastResult = null;
        note({ type: "begin", engaged: rt.engaged });
        return { ok: true, engaged: rt.engaged };
    };
    const end = (reason = "end") => {
        if (!rt.active) return false;
        rt.active = false; rt.engaged = false; rt.pending = []; rt.generation++;
        safe(() => cardInput()?.cancelPress?.(undefined, "fieldEnd"));
        safe(() => combatSession().end(SOURCE, reason));
        safe(() => { if (deck().isCardBattleActive?.()) deck().endCardBattle(); });
        for (const id of [...rt.enemies.keys()]) safe(() => enemyAttack()?.interrupt?.(id, "fieldEnd"));
        rt.captured.clear();
        note({ type: "end", reason });
        return true;
    };
    // CombatSession.endAll(マップ移動・ロード)で、こちらも終わる。
    if (combatSession()?.onEnd) combatSession().onEnd(info => { if (info && info.sourceId === SOURCE && rt.active) end("sessionEnded"); });

    // ------------------------------------------------------------------ 入力(Q/E/R/C/Space) ----------------------------------------------------------------
    const isEditing = element => !!element && (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName || ""));
    const blockedReason = (event = {}) => {
        if (!rt.active) return "inactive";
        if (event.defaultPrevented) return "defaultPrevented";
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return "modifierKey";
        if (event.isComposing) return "ime";
        if (typeof document !== "undefined" && (document.hasFocus?.() === false || isEditing(document.activeElement))) return "documentFocus";
        // 実際の入力受付可否は CardBattleInput と同じ判断(Scene・メッセージ・イベント・移動中・全画面会話・開いているウィンドウ)
        const reason = cardInput()?.getBlockedReason?.(event) ?? null;
        return reason;
    };
    const slotForEvent = event => event ? (event.code ? SLOT_BY_CODE[event.code] : SLOT_BY_KEYCODE[event.keyCode]) || null : null;
    if (typeof Input !== "undefined") {
        const _onKeyDown = Input._onKeyDown;
        Input._onKeyDown = function(event) {
            const slot = slotForEvent(event);
            if (slot && rt.active) {
                rt.diag.keyDowns++; rt.diag.lastCode = event.code || String(event.keyCode);
                if (rt.captured.has(slot)) { event.preventDefault?.(); return; }
                const reason = blockedReason(event);
                if (reason === null) {
                    if (!event.repeat) { rt.captured.add(slot); rt.pending.push(slot); rt.diag.accepted++; rt.diag.lastDecision = "accepted"; rt.diag.lastReason = null; }
                    event.preventDefault?.();
                    return;
                }
                rt.diag.passed++; rt.diag.lastDecision = "passedThrough"; rt.diag.lastReason = reason;
            }
            return _onKeyDown.call(this, event);
        };
        const _onKeyUp = Input._onKeyUp;
        Input._onKeyUp = function(event) {
            const slot = slotForEvent(event);
            if (slot && rt.captured.delete(slot)) return;
            return _onKeyUp.call(this, event);
        };
        const _clear = Input.clear;
        Input.clear = function() { rt.captured.clear(); rt.pending = []; return _clear.apply(this, arguments); };
    }
    if (typeof root.addEventListener === "function") root.addEventListener("blur", () => { rt.captured.clear(); rt.pending = []; });

    // ------------------------------------------------------------------ アビリティの発動 ----------------------------------------------------------------
    const playerDead = () => safe(() => root.ProjectR?.PlayerDeath?.isDead?.() === true, false);
    const cooldownOf = slot => rt.cooldowns[slot] || 0;
    const startCooldown = slot => { const d = LOADOUT[slot]; rt.cooldowns[slot] = Math.max(0, d.cooldown || 0); };
    const flash = (slot, ok) => { rt.flash = { slot, until: rt.frame + 14, ok }; };

    const pickConsumable = () => {
        if (typeof $gameParty === "undefined" || typeof $dataItems === "undefined") return null;
        const actor = $gameParty.leader();
        if (!actor) return null;
        if (cfg.consumableItemId > 0) { const item = $dataItems[cfg.consumableItemId]; return item && $gameParty.hasItem(item) ? item : null; }
        return $gameParty.items().find(item => item && item.itypeId === 1 && Array.isArray(item.effects) && item.effects.some(e => e.code === 11) && $gameParty.hasItem(item)) || null;
    };
    const useConsumable = () => {
        const actor = $gameParty.leader();
        if (!actor) return fail("noActor");
        const item = pickConsumable();
        if (!item) return fail("noItem");
        if (!actor.canUse(item)) return fail("cannotUse");
        const action = new Game_Action(actor);
        action.setItemObject(item);
        if (!action.testApply(actor)) return fail("noEffect", { itemId: item.id });                 // HPが満タンなどで効果がない: 消費しない
        const before = actor.hp;
        actor.useItem(item);
        action.apply(actor);
        actor.refresh?.();
        return { ok: true, itemId: item.id, healed: actor.hp - before };
    };
    const cancel = () => {
        let cancelled = 0;
        if (rt.pending.length) { cancelled += rt.pending.length; rt.pending = []; }
        if (safe(() => cardInput()?.cancelPress?.(undefined, "fieldCancel"), false)) cancelled++;
        safe(() => $gameTemp?.clearDestination?.());
        note({ type: "cancel", cancelled });
        return { ok: true, slot: "cancel", cancelled };
    };

    const castReason = slot => {
        if (!rt.active) return "inactive";
        if (playerDead()) return "playerDead";
        if (!CAST_SLOTS.includes(slot)) return "invalidSlot";
        if (cooldownOf(slot) > 0) return "cooldown";
        return null;
    };
    const useAbility = (slot, source = "api") => {
        if (slot === "cancel") { const r = cancel(); rt.lastResult = { ...r, source }; return r; }
        const reason = castReason(slot);
        let result;
        if (reason) result = fail(reason, { slot, cooldown: cooldownOf(slot) });
        else {
            const def = LOADOUT[slot];
            try {
                if (def.kind === "card") {
                    const used = deck().useFixedCard(def.cardId);
                    // 絶は「予約 → 予備動作 → 確定」なので、予約できた時点(pending)を成功とみなす。確定できなかった場合は getLastResult で分かる。
                    result = used && (used.ok === true || used.pending === true) ? { ok: true, slot, cardId: def.cardId, pending: used.pending === true } : fail("abilityFailed", { slot, detail: used?.detail || used?.reason || null });
                } else if (def.kind === "ultimate") {
                    const used = ultimate()?.requestUltimateActivation?.("field");
                    result = used && used.ok === true ? { ok: true, slot, godId: used.godId ?? null } : fail(used?.reason || "ultimateUnavailable", { slot, detail: used?.handlerReason || null });
                } else if (def.kind === "item") {
                    const used = useConsumable();
                    result = used.ok ? { ...used, slot } : { ...used, slot };
                } else result = fail("unsupportedKind", { slot });
            } catch (error) { result = fail("exception", { slot, detail: String(error?.message || error) }); }
            if (result.ok) startCooldown(slot);                                                  // 成功したときだけCooldown(失敗は何も消費しない)
        }
        result.source = source; result.frame = rt.frame;
        rt.lastResult = result; flash(slot, result.ok === true);
        note({ type: "cast", slot, ok: result.ok === true, reason: result.reason || null });
        return result;
    };

    // ------------------------------------------------------------------ 敵(予約 → 溜め → 近接攻撃 + 予兆) ----------------------------------------------------------------
    // 視界(ProjectR_FogOfWar): いまの視界の外にいる敵は、戦闘の開始・予兆・HUDで位置や存在をもらさない(AI・状態は止めない)。霧が無い・無効なら常に見えている扱い。
    const fog = () => root.ProjectR && root.ProjectR.FogOfWar;
    const eventVisible = event => { const f = fog(); return !f || typeof f.isEventVisible !== "function" || f.isEventVisible(event) !== false; };
    const enemyAlive = event => !!event && !event._erased && !!event.databaseEnemy && !event.linkedActorId && !event._isMinionActor &&
        typeof map()?.getCurrentEventHp === "function" && Number(map().getCurrentEventHp(event.eventId())) > 0;
    const center = e => ({ x: e._realX + 0.5, y: e._realY + 0.5 });
    const playerCenter = () => { const p = safe(() => $gamePlayer.centerPositionPoint?.(), null); return p ? { x: p.x, y: p.y } : { x: $gamePlayer._realX + 0.5, y: $gamePlayer._realY + 0.5 }; };
    const enemiesMayAct = () => sceneIsMap() && !safe(() => $gameMessage.isBusy(), false) && !safe(() => $gameMap.isEventRunning(), false) && !safe(() => $gamePlayer.isTransferring(), false);
    const attachEnemy = (eventId, options = {}) => {
        const e = map()?.event(Number(eventId));
        if (!e || e._erased) return fail("eventMissing");
        if (!enemyAlive(e)) return fail("notAliveEnemy");
        if (!enemyAttack()) return fail("enemyAttackUnavailable");
        const o = options && typeof options === "object" ? options : {};
        rt.enemies.set(e.eventId(), {
            eventId: e.eventId(), state: "chase", cooldown: 0, attackId: null,
            windupFrames: Math.round(num(o.windupFrames, 36, 1)), cooldownFrames: Math.round(num(o.cooldownFrames, 120, 0)),
            reach: num(o.reach, 1.2, 0.5), notetag: String(o.notetag || "<projectRFieldMelee><dmg: ゴブリン>"), chase: o.chase !== false,
            attacks: 0, aggroTiles: num(o.aggroTiles, 10, 1),
            // 視界(敵ごとに変えられる): sight / aggro(旧名)→ 距離。fov → 視野角。省略は、プラグインパラメータ
            sightTiles: Math.max(1, num(o.sightTiles, num(o.aggroTiles, cfg.sightTiles, 0.1), 0.1)), fovDegrees: Math.min(360, Math.max(10, num(o.fovDegrees, cfg.fovDegrees, 0))),
            customSight: o.sightTiles !== undefined || o.aggroTiles !== undefined, customFov: o.fovDegrees !== undefined,
            aware: false, sees: false, seeReason: null, acquired: 0, losses: 0
        });
        e._interpreter = null;                                                                    // 元からある並列ページの攻撃は止める(二重に攻撃しない)
        note({ type: "attach", eventId: e.eventId() });
        return { ok: true, eventId: e.eventId() };
    };
    // 倒された敵(HPが0以下)は、すぐに通り抜けられるようにする。Hendrix は、HP が 0 になってもイベントを消さない(消す処理は敵のページ/共通イベントにある)ので、
    //   戸口で倒れた敵が、プレイヤー・ほかの敵の通行をふさぎ続けていた。生きている敵の当たり判定・攻撃の判定・ドロップ・勝利の判定は変えない(通行だけ)。
    //   見た目(倒れた絵)は残し、プレイヤーの下に描かれる優先度(0)にする。
    const settleDeadEnemy = e => {
        if (!e || e._erased || e._projectRFieldSettled) return false;
        e._projectRFieldSettled = true;
        safe(() => { if (typeof e.setThrough === "function") e.setThrough(true); else e._through = true; });
        safe(() => { if (typeof e.setPriorityType === "function") e.setPriorityType(0); });
        note({ type: "enemyDown", eventId: e.eventId() });
        return true;
    };
    const settleDeadEnemies = () => { for (const id of rt.enemies.keys()) { const e = map()?.event(id); if (e && !enemyAlive(e)) settleDeadEnemy(e); } for (const id of enc.attached) { const e = map()?.event(id); if (e && !enemyAlive(e)) settleDeadEnemy(e); } };
    // ------------------------------------------------------------------ 敵の視界(距離・視野角・壁/閉じた扉) ----------------------------------------------------------------
    // 追うのは「いま見えている」間だけ。見失ったらすぐ止まって待つ(最後に見た位置を覚えない・探さない)。プレイヤーの霧(FogOfWar)とは無関係(ProjectR_CombatOcclusion の視線の判定だけを使う)。
    const occlusion = () => root.ProjectR && root.ProjectR.CombatOcclusion;
    const FACING_DEGREE = { 8: 0, 6: 90, 2: 180, 4: 270 };
    const bearingDegree = (from, to) => { const d = Math.atan2(to.x - from.x, -(to.y - from.y)) * 180 / Math.PI; return ((d % 360) + 360) % 360; };
    const directionOfBearing = deg => (deg >= 315 || deg < 45 ? 8 : deg < 135 ? 6 : deg < 225 ? 2 : 4);
    const enemyFacing = e => { const d = safe(() => (typeof e.direction === "function" ? e.direction() : e._direction), undefined); return FACING_DEGREE[d]; };
    const perceive = (e, b, p) => {
        const c = center(e), dist = Math.hypot(p.x - c.x, p.y - c.y);
        if (dist > b.sightTiles) return { sees: false, reason: "range", dist };
        const o = occlusion();
        if (o && typeof o.hasLineOfSight === "function" && !safe(() => o.hasLineOfSight(c, p, { mode: "vision", ignoreEventIds: [e.eventId()] }), true)) return { sees: false, reason: "blocked", dist };
        if (!b.aware && b.fovDegrees < 360) {                                                    // 見つける瞬間だけ視野角を見る(見つけたあとは、プレイヤーの方を向く)
            const facing = enemyFacing(e);
            if (facing !== undefined) { const diff = Math.abs(((bearingDegree(c, p) - facing + 540) % 360) - 180); if (diff > b.fovDegrees / 2 + 1e-6) return { sees: false, reason: "fov", dist }; }
        }
        return { sees: true, reason: "seen", dist };
    };
    const getEnemyPerception = eventId => {
        const b = rt.enemies.get(Number(eventId)), e = map()?.event(Number(eventId));
        if (!b || !e) return null;
        const p = playerCenter(), r = perceive(e, b, p);
        return { eventId: b.eventId, enabled: cfg.perception, aware: b.aware, sees: b.sees, canSeeNow: r.sees, reason: r.reason, dist: r.dist, sightTiles: b.sightTiles, fovDegrees: b.fovDegrees, facing: enemyFacing(e) ?? null, acquired: b.acquired, losses: b.losses };
    };
    const setPerception = o => {
        const c = o && typeof o === "object" ? o : {};
        if (typeof c.enabled === "boolean") cfg.perception = c.enabled;
        if (c.sightTiles !== undefined) cfg.sightTiles = Math.max(1, num(c.sightTiles, cfg.sightTiles, 0.1));
        if (c.fovDegrees !== undefined) cfg.fovDegrees = Math.min(360, Math.max(10, num(c.fovDegrees, cfg.fovDegrees, 0)));
        for (const b of rt.enemies.values()) { if (!b.customSight) b.sightTiles = cfg.sightTiles; if (!b.customFov) b.fovDegrees = cfg.fovDegrees; }
        return { enabled: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees };
    };
    const resetPerception = () => { cfg.perception = perceptionDefaults.perception; return setPerception({ sightTiles: perceptionDefaults.sightTiles, fovDegrees: perceptionDefaults.fovDegrees }); };
    const detachEnemy = eventId => { const had = rt.enemies.delete(Number(eventId)); if (had) safe(() => enemyAttack()?.interrupt?.(Number(eventId), "detach")); return had; };
    const updateEnemies = () => {
        const api = enemyAttack();
        if (!api || !rt.enemies.size) return;
        const p = playerCenter();
        for (const [id, b] of [...rt.enemies]) {
            const e = map()?.event(id);
            if (!e || !enemyAlive(e)) { settleDeadEnemy(e); rt.enemies.delete(id); safe(() => api.interrupt(id, "enemyGone")); continue; }
            if (b.cooldown > 0) b.cooldown--;
            const c = center(e), dist = Math.hypot(p.x - c.x, p.y - c.y);
            // 視界: 見えている間だけ「気づいている」。見失ったら、すぐ止まる(追跡の目標は持たない)。溜め(windup)の間は、いまの攻撃を撃ち終える(従来どおり)
            let sees = true;
            if (cfg.perception) {
                const r = perceive(e, b, p);
                sees = r.sees && !playerDead();
                b.seeReason = playerDead() ? "playerDead" : r.reason;
                if (sees && !b.aware) { b.aware = true; b.acquired++; note({ type: "acquire", eventId: id }); }
                else if (!sees && b.aware) { b.aware = false; b.losses++; note({ type: "lose", eventId: id, reason: b.seeReason }); }
                if (sees && b.state !== "windup") safe(() => e.setDirection(directionOfBearing(bearingDegree(c, p))));      // 見つけたら、プレイヤーの方を向く
            } else if (b.aware) { b.aware = false; }
            b.sees = sees;
            if (b.state === "windup") {
                const outcome = b.attackId != null ? safe(() => api.getOutcome(b.attackId), null) : null;
                const pendingRecord = b.attackId != null ? safe(() => api.get(b.attackId), null) : null;
                if (outcome || !pendingRecord || pendingRecord.state !== "pending") {
                    b.state = "chase"; b.cooldown = b.cooldownFrames; b.attackId = null; b.attacks++;
                }
                continue;                                                                           // 溜めの間は動かない(予兆と実際の攻撃を一致させる)
            }
            if (!playerDead() && sees && dist <= b.reach && b.cooldown <= 0) {
                const r = api.schedule({ eventId: id, kind: "melee", windupFrames: b.windupFrames, notetag: b.notetag, reach: Math.max(1, b.reach) });
                if (r && r.ok) { b.state = "windup"; b.attackId = r.id; }
                continue;
            }
            if (b.chase && sees && !playerDead() && dist > b.reach * 0.8 && dist <= (cfg.perception ? b.sightTiles : b.aggroTiles)) safe(() => e.dotMoveToPlayer?.());
        }
    };

    // ------------------------------------------------------------------ 戦闘中の接触イベント ----------------------------------------------------------------
    // 戦闘中は主人公の向きがマウスの方向に固定される。DotMove の「接触」イベント(場所移動の扉など)は、主人公の向き(顔の向き)で前方を調べるので、
    //   マウスと違う方向へ歩いて扉にぶつかっても発火しなくなる。そこで戦闘中だけ、移動キーを押しているのに進めなかったとき、押している方向の前方を調べる
    //   (通常のMZが「進めなかったとき、進行方向の前を調べる」のと同じ。調べるのはイベントの接触トリガーだけ)。
    const touchAssist = () => {
        const p = typeof $gamePlayer !== "undefined" ? $gamePlayer : null;
        if (!p || typeof Input === "undefined") return;
        const x = p._realX, y = p._realY, dir = Input.dir4 || 0, was = rt.lastPos;
        rt.lastPos = { x, y };
        if (dir > 0 && was && Math.abs(x - was.x) + Math.abs(y - was.y) < 1e-4 && safe(() => p.canMove(), false) && !safe(() => $gameMap.isEventRunning(), true)) {
            rt.touchAssists++;
            safe(() => p.checkEventTriggerTouchFront(dir));
        }
    };


    // ------------------------------------------------------------------ エンカウンター(戦闘マップ) ----------------------------------------------------------------
    // 戦闘は、NPCとの会話・物語のイベントから入る専用の戦闘マップの中だけ。探索マップでは、近くに敵がいても戦闘は始まらず、戦闘の入力は無効。
    //   state: idle → armed(開始した。元のマップ・位置・向きを記録済み)→ entering(戦闘マップへ移動中)→ fighting(戦闘マップの準備が終わり、戦闘が有効)
    //          → leaving(元のマップへ戻る途中)→ idle     /  fighting → defeat(敗北: 自動では戻らない。ロード・ニューゲームで idle)
    const RESULT = Object.freeze({ NONE: 0, VICTORY: 1, DEFEAT: 2, OTHER: 3 });
    const enc = {
        state: "idle", id: "", origin: null, battleMapId: 0, spawn: null, resultVarId: 0, victoryCE: 0, otherCE: 0, serial: 0, blockSave: false, systemRef: null,
        resolved: false, applied: false, pendingResult: RESULT.NONE, last: null, waited: 0, readyFrames: 0, attached: new Set(), queued: [], listeners: new Set(), log: []
    };
    const encNote = entry => { enc.log.push({ frame: rt.frame, ...entry }); if (enc.log.length > 80) enc.log.shift(); note({ type: "encounter", ...entry }); };
    const validVariable = id => Number.isInteger(id) && id >= 0 && (id === 0 || (typeof $dataSystem !== "undefined" && !!$dataSystem && id < $dataSystem.variables.length));
    const validMap = id => Number.isInteger(id) && id > 0 && typeof $dataMapInfos !== "undefined" && !!$dataMapInfos && !!$dataMapInfos[id];
    const int = (v, f) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : f; };
    // 戦闘が使えるのは、エンカウンターが fighting のとき(DEVの許可を除く)
    const isCombatAllowed = () => cfg.devAllowOutside || (enc.state === "fighting" && !!map() && map().mapId() === enc.battleMapId);

    const resetEncounter = (reason) => {
        const was = enc.state;
        if (rt.active) end("encounter:" + reason);
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.attached.clear(); enc.queued = [];
        enc.state = "idle"; enc.blockSave = false; enc.systemRef = null; enc.origin = null; enc.battleMapId = 0; enc.spawn = null; enc.waited = 0; enc.readyFrames = 0;
        enc.resolved = false; enc.applied = false; enc.pendingResult = RESULT.NONE; enc.id = ""; enc.resultVarId = 0; enc.victoryCE = 0; enc.otherCE = 0;
        if (was !== "idle") encNote({ type: "reset", reason, was });
    };
    const setResultVariable = code => { if (enc.resultVarId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) safe(() => $gameVariables.setValue(enc.resultVarId, code)); };
    const fireResult = payload => { for (const fn of [...enc.listeners]) safe(() => fn(payload)); };

    const startEncounter = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (enc.state !== "idle") return fail("encounterActive", { state: enc.state });
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || !map() || !sceneIsMap()) return fail("mapUnavailable");
        if (soulBusy()) return fail("soulActive");
        if (rt.active || deck()?.isCardBattleActive?.()) return fail("combatActive");
        if (playerDead()) return fail("playerDead");
        const battleMapId = int(o.battleMapId, 0), varId = int(o.resultVariableId, 0);
        if (!validVariable(varId)) return fail("invalidResultVariable");
        if (battleMapId > 0 && !validMap(battleMapId)) return fail("unknownBattleMap");
        if (battleMapId > 0 && battleMapId === map().mapId()) return fail("battleMapIsCurrentMap");
        enc.id = String(o.encounterId || "field_encounter"); enc.resultVarId = varId; enc.victoryCE = Math.max(0, int(o.victoryCommonEventId, 0)); enc.otherCE = Math.max(0, int(o.otherCommonEventId, 0));
        // 元のマップ・位置・向きを、移動の前に記録する(実座標も。戻るときに元の位置へ戻す)
        enc.origin = { mapId: map().mapId(), x: $gamePlayer.x, y: $gamePlayer.y, realX: $gamePlayer._realX, realY: $gamePlayer._realY, direction: $gamePlayer.direction() };
        enc.state = "armed"; enc.blockSave = true; enc.systemRef = $gameSystem; enc.resolved = false; enc.applied = false; enc.pendingResult = RESULT.NONE; enc.serial++; enc.waited = 0; enc.readyFrames = 0;
        setResultVariable(RESULT.NONE);                                                                // 戦闘中は 0
        encNote({ type: "start", id: enc.id, origin: { ...enc.origin } });
        if (battleMapId > 0) {
            const moved = transferToBattleMap({ battleMapId, spawnX: o.spawnX, spawnY: o.spawnY, direction: o.direction });
            if (!moved.ok) { resetEncounter("transferRejected"); return moved; }
        }
        return { ok: true, state: enc.state, origin: { ...enc.origin } };
    };
    // 戦闘マップのセルフスイッチ(扉の開閉・仕掛けなど)は、エンカウンターの開始のたびに初期状態へ戻す(マップを読み直しても、セルフスイッチは残るため)。
    const resetBattleMapSwitches = mapId => {
        const sw = typeof $gameSelfSwitches !== "undefined" ? $gameSelfSwitches : null;
        if (!sw || !sw._data) return 0;
        let n = 0;
        for (const key of Object.keys(sw._data)) if (String(key).split(",")[0] === String(mapId)) { delete sw._data[key]; n++; }
        return n;
    };
    const transferToBattleMap = (options = {}) => {
        const o = options && typeof options === "object" ? options : {};
        if (enc.state !== "armed") return fail("notArmed", { state: enc.state });
        const mapId = int(o.battleMapId, 0), x = int(o.spawnX, 0), y = int(o.spawnY, 0), d = [2, 4, 6, 8].includes(int(o.direction, 8)) ? int(o.direction, 8) : 8;
        if (!validMap(mapId)) return fail("unknownBattleMap");
        if (enc.origin && mapId === enc.origin.mapId) return fail("battleMapIsCurrentMap");
        enc.battleMapId = mapId; enc.spawn = { x, y, direction: d };
        resetBattleMapSwitches(mapId);                                                                 // 繰り返しのエンカウンターが、前回の扉・仕掛けの状態を引き継がない
        $gamePlayer.reserveTransfer(mapId, x, y, d, 0);
        enc.state = "entering"; enc.waited = 0; enc.readyFrames = 0;
        encNote({ type: "transfer", mapId, x, y, direction: d });
        return { ok: true, state: enc.state };
    };

    // ---- 敵(イベントのメモ <fieldEnemy: ...>・有効なページの注釈 / プラグインコマンド) ----
    const eventText = e => ((safe(() => e.event().note, "") || "") + "\n" + (safe(() => e.page().list, []) || []).filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n"));
    const parseEnemyTag = text => {
        const m = /<fieldEnemy(?::([^>]*))?>/i.exec(text || "");
        if (!m) return null;
        const o = {};
        for (const part of String(m[1] || "").split(/[,\s]+/)) {
            const kv = /^(\w+)=(.+)$/.exec(part.trim()); if (!kv) continue;
            const key = kv[1].toLowerCase(), v = kv[2];
            if (key === "windup") o.windupFrames = Number(v); else if (key === "cooldown") o.cooldownFrames = Number(v); else if (key === "reach") o.reach = Number(v);
            else if (key === "aggro") o.aggroTiles = Number(v); else if (key === "sight") o.sightTiles = Number(v); else if (key === "fov") o.fovDegrees = Number(v); else if (key === "chase") o.chase = !(v === "0" || v.toLowerCase() === "false");
        }
        return o;
    };
    const attachEncounterEnemy = (eventId, options) => {
        const r = attachEnemy(eventId, options);
        if (r.ok) enc.attached.add(Number(eventId));
        return r;
    };
    const scanEnemyTags = () => {
        let n = 0;
        for (const e of map().events()) { if (!e || e._erased) continue; const opt = parseEnemyTag(eventText(e)); if (opt && attachEncounterEnemy(e.eventId(), opt).ok) n++; }
        return n;
    };

    // ---- 戦闘マップの準備が終わったら戦闘を始める ----
    const activateEncounter = () => {
        const m = map();
        if (cfg.requireTag && !/<fieldBattleMap>/i.test(String(safe(() => $dataMap.note, "") || ""))) { encNote({ type: "notBattleMap", mapId: m.mapId() }); enc.state = "fighting"; finishEncounter("other", { reason: "notBattleMap" }); return; }
        enc.state = "fighting";                                                                        // begin() の許可のため先に fighting にする
        const began = begin({ encounter: true });
        if (!began.ok) { encNote({ type: "beginFailed", reason: began.reason }); finishEncounter("other", { reason: began.reason }); return; }
        const tagged = scanEnemyTags();
        for (const q of enc.queued.splice(0)) attachEncounterEnemy(q.eventId, q.options);
        encNote({ type: "fighting", enemies: [...enc.attached], tagged });
    };
    const allAttachedDead = () => {
        if (!enc.attached.size) return false;
        for (const id of enc.attached) { const e = map()?.event(id); if (e && !e._erased && enemyAlive(e)) return false; }
        return true;
    };

    // ---- 終わり方 ----
    // 勝利・中断: 結果は1回だけ。戦闘を片づけ(アビリティ・敵の行動・HUDを止める)、元のマップ・位置・向きへ戻り、戻ったあとに結果の変数・コモンイベントを処理する。
    const finishEncounter = (kind, info = {}) => {
        if (enc.state === "idle" || enc.state === "leaving" || enc.state === "defeat" || enc.resolved) return fail("notFighting", { state: enc.state });
        enc.resolved = true;
        settleDeadEnemies();
        const victory = kind === "victory";
        if (rt.active) end("encounter:" + kind);
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.pendingResult = victory ? RESULT.VICTORY : RESULT.OTHER;
        enc.state = "leaving"; enc.waited = 0;
        const o = enc.origin;
        if (o) safe(() => $gamePlayer.reserveTransfer(o.mapId, o.x, o.y, o.direction, 0));
        encNote({ type: "leaving", result: kind, ...info });
        return { ok: true, result: kind };
    };
    const applyReturn = () => {
        if (enc.applied) return;
        enc.applied = true;
        const o = enc.origin, code = enc.pendingResult, ce = code === RESULT.VICTORY ? enc.victoryCE : enc.otherCE;
        if (o) safe(() => { $gamePlayer._realX = o.realX; $gamePlayer._realY = o.realY; $gamePlayer.setDirection(o.direction); if ($gamePlayer.center) $gamePlayer.center(o.realX, o.realY); });
        setResultVariable(code);
        enc.last = { id: enc.id, result: code === RESULT.VICTORY ? "victory" : "other", code, serial: enc.serial };
        if (ce > 0 && typeof $gameTemp !== "undefined" && $gameTemp) safe(() => $gameTemp.reserveCommonEvent(ce));
        const payload = { ...enc.last };
        const last = enc.last;
        resetEncounter("returned");
        enc.last = last;
        encNote({ type: "returned", ...payload });
        fireResult(payload);
    };
    // 敗北: 自動では戻らない(既存の死亡・ロードの扱いのまま)。戦闘は片づけ、結果は1回だけ(変数=2)、エンカウンター中のセーブ禁止は続ける。
    const defeatEncounter = () => {
        if (enc.state !== "fighting" || enc.resolved) return;
        enc.resolved = true;
        if (rt.active) end("encounter:defeat");
        for (const id of [...rt.enemies.keys()]) detachEnemy(id);
        enc.state = "defeat"; enc.pendingResult = RESULT.DEFEAT;
        setResultVariable(RESULT.DEFEAT);
        enc.last = { id: enc.id, result: "defeat", code: RESULT.DEFEAT, serial: enc.serial };
        encNote({ type: "defeat" });
        fireResult({ ...enc.last });
    };
    const completeEncounter = (result = "victory") => {
        if (enc.state !== "fighting") return fail("notFighting", { state: enc.state });
        return finishEncounter(result === "victory" ? "victory" : "other", { reason: "command" });
    };
    // 中断(コマンド・外からの終了): 戦闘マップにいれば元のマップへ戻る。まだ移動していない(armed)なら、そのまま取り消す。
    const abortEncounter = (reason = "abort") => {
        if (enc.state === "idle") return false;
        if (enc.state === "leaving") return true;
        if ((enc.state === "fighting" || enc.state === "entering") && enc.origin && map() && map().mapId() !== enc.origin.mapId) { enc.state = "fighting"; finishEncounter("other", { reason }); return true; }
        if (!enc.resolved && enc.state !== "defeat") setResultVariable(RESULT.OTHER);
        resetEncounter(reason);
        return true;
    };
    // 予期しない場所へ移動した・戦闘が外から終えられた: 戻らずに片づける(結果=中断を1回だけ)
    const hardAbort = reason => {
        if (enc.state === "idle") return;
        if (!enc.resolved && enc.state !== "defeat") setResultVariable(RESULT.OTHER);
        encNote({ type: "hardAbort", reason });
        resetEncounter(reason);
    };

    const encounterTick = () => {
        if (enc.state === "idle" || enc.state === "armed" || enc.state === "defeat") return;
        const m = map();
        if (!m || typeof $gamePlayer === "undefined" || !$gamePlayer) return;
        const here = m.mapId(), busy = safe(() => $gamePlayer.isTransferring(), false);
        if (enc.state === "entering") {
            enc.waited++;
            if (here === enc.battleMapId && !busy && sceneIsMap()) {
                if (safe(() => $gameMap.isEventRunning() || $gameMessage.isBusy(), false)) { enc.readyFrames = 0; return; }       // 到着時のイベント・メッセージが終わるまで待つ
                if (++enc.readyFrames >= 3) activateEncounter();
            } else if (here !== enc.battleMapId && here !== enc.origin.mapId) hardAbort("mapChanged");
            else if (enc.waited > 1800 && !busy && !safe(() => $gameMap.isEventRunning(), false)) hardAbort("transferTimeout");
            return;
        }
        if (enc.state === "fighting") {
            if (here !== enc.battleMapId) { hardAbort("mapChanged"); return; }
            if (!rt.active) { if (!busy) finishEncounter("other", { reason: "combatEnded" }); return; }
            if (playerDead()) { defeatEncounter(); return; }
            settleDeadEnemies();
            if (rt.frame % 10 === 0 && allAttachedDead()) finishEncounter("victory", { reason: "allEnemiesDefeated" });
            return;
        }
        if (enc.state === "leaving") {
            enc.waited++;
            if (here === enc.origin.mapId && !busy && sceneIsMap()) applyReturn();
            else if (here !== enc.origin.mapId && here !== enc.battleMapId) hardAbort("mapChanged");
            else if (enc.waited > 1800 && !busy) hardAbort("returnTimeout");
        }
    };
    const getEncounterState = () => ({ state: enc.state, id: enc.id, serial: enc.serial, origin: enc.origin ? { ...enc.origin } : null, battleMapId: enc.battleMapId, spawn: enc.spawn ? { ...enc.spawn } : null,
        saveBlocked: enc.blockSave, enemies: [...enc.attached], resultVariableId: enc.resultVarId, last: enc.last ? { ...enc.last } : null, log: enc.log.slice(-12) });
    const onEncounterResult = fn => { if (typeof fn !== "function") return () => {}; enc.listeners.add(fn); return () => enc.listeners.delete(fn); };

    // ---- セーブの禁止(エンカウンター中。敗北後も、ロード・ニューゲームまで)/ ロード・ニューゲーム・マップ移動での片づけ ----
    const saveBlockedNow = system => enc.blockSave && (system === undefined || system === enc.systemRef);
    if (typeof Game_System !== "undefined") {
        const _isSaveEnabled = Game_System.prototype.isSaveEnabled;
        if (typeof _isSaveEnabled === "function") Game_System.prototype.isSaveEnabled = function() { return saveBlockedNow(this) ? false : _isSaveEnabled.apply(this, arguments); };
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
        DataManager.setupNewGame = function() { resetEncounter("newGame"); return _setup.apply(this, arguments); };
        const _extract = DataManager.extractSaveContents;
        DataManager.extractSaveContents = function() { resetEncounter("load"); return _extract.apply(this, arguments); };
    }
    // マップ移動: 想定した移動(戦闘マップへ入る・元のマップへ戻る)以外は、戻らずに片づける。戦闘が探索マップに残らない。
    if (typeof Game_Map !== "undefined") {
        const _mapSetup = Game_Map.prototype.setup;
        Game_Map.prototype.setup = function(mapId) {
            if (enc.state === "entering" || enc.state === "fighting") { if (mapId !== enc.battleMapId) hardAbort("mapChanged"); }
            else if (enc.state === "leaving") { if (!enc.origin || mapId !== enc.origin.mapId) hardAbort("mapChanged"); }
            else if (enc.state === "defeat" && mapId !== enc.battleMapId) resetEncounter("leftDefeatMap");
            return _mapSetup.apply(this, arguments);
        };
    }
    // 探索マップでは、基本攻撃(銃・剣)も使えない(CombatPresence の「画面内に敵がいる」だけでは使えない)。エンカウンター中・既存の戦闘(アリーナ・SOUL)・DEVの許可は除く。
    const weaponAllowed = () => !cfg.enforce || cfg.devAllowOutside || rt.active || isCombatAllowed() || !!presence()?.isCombatEventActive?.() || !!deck()?.isCardBattleActive?.() || soulBusy();
    const installWeaponGate = () => {
        const p = presence();
        if (!p || typeof p.canUseWeapon !== "function" || p.__projectRFieldGate) return;
        const original = p.canUseWeapon;
        p.canUseWeapon = function() { const v = original.apply(this, arguments); return v ? weaponAllowed() : v; };
        // 「戦闘中」の判定も同じ: 画面内に敵がいるだけでは戦闘中にしない。これを使う側(指輪の受け渡しの禁止・主人公のマウス向き)が、探索マップで画面内に敵がいても、
        //   指輪を入手できる・NPCへ向き直せる(正当な戦闘中=エンカウンター・既存の戦闘では、従来どおり禁止)。
        if (typeof p.isCombatActive === "function") { const originalActive = p.isCombatActive; p.isCombatActive = function() { const v = originalActive.apply(this, arguments); return v ? weaponAllowed() : v; }; }
        p.__projectRFieldGate = true;
    };
    installWeaponGate();

    // ---- プラグインコマンド ----
    if (typeof PluginManager !== "undefined" && PluginManager.registerCommand) {
        const warn = (name, r) => { if (r && r.ok === false && typeof console !== "undefined") console.warn(`[${PLUGIN}] ${name} rejected:`, r.reason); };
        PluginManager.registerCommand(PLUGIN, "StartFieldEncounter", args => warn("StartFieldEncounter", startEncounter(args)));
        PluginManager.registerCommand(PLUGIN, "TransferToBattleMap", args => warn("TransferToBattleMap", transferToBattleMap(args)));
        PluginManager.registerCommand(PLUGIN, "CompleteFieldEncounter", args => warn("CompleteFieldEncounter", completeEncounter(String(args && args.result || "victory"))));
        PluginManager.registerCommand(PLUGIN, "AbortFieldEncounter", () => { abortEncounter("command"); });
        PluginManager.registerCommand(PLUGIN, "AttachFieldEnemy", function(args) {
            const id = int(args && args.eventId, 0) || (this && typeof this.eventId === "function" ? this.eventId() : 0);
            const options = { windupFrames: Number(args && args.windupFrames) || undefined, cooldownFrames: args && args.cooldownFrames !== undefined && args.cooldownFrames !== "" ? Number(args.cooldownFrames) : undefined, reach: Number(args && args.reach) || undefined, sightTiles: args && args.sightTiles !== undefined && args.sightTiles !== "" ? Number(args.sightTiles) : undefined, fovDegrees: args && args.fovDegrees !== undefined && args.fovDegrees !== "" ? Number(args.fovDegrees) : undefined };
            if (enc.state === "fighting") warn("AttachFieldEnemy", attachEncounterEnemy(id, options));
            else if (enc.state === "entering" || enc.state === "armed") enc.queued.push({ eventId: id, options });          // 戦闘マップの準備が終わってから有効にする
        });
    }

    // ------------------------------------------------------------------ 毎フレーム ----------------------------------------------------------------
    const tickFrame = () => {
        rt.frame++;
        if (rt.active) {
            // 他の経路がカード戦闘を入れ替えた/終えた(Arena・SOUL等)ときは、こちらも終わる
            if (!deck()?.isCardBattleActive?.() || !presence()?.isCombatEventActive?.()) end("externalChange");
        }
        encounterTick();
    };
    if (typeof Scene_Map !== "undefined") {
        const _update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            const requests = rt.pending, generation = rt.generation;
            rt.pending = [];
            _update.apply(this, arguments);
            tickFrame();
            // 敵の行動(attachEnemy)は、戦闘中でなくても、隠れていても止めない(メッセージ・イベント・メニュー中だけ止まる)
            if (rt.enemies.size && enemiesMayAct()) updateEnemies();
            if (!rt.active || generation !== rt.generation) return;
            if (cardInput()?.getBlockedReason?.() !== null) { rt.pending = []; return; }          // メニュー・会話・イベント中は進めない
            const dt = 1 / FPS;
            for (const slot of Object.keys(rt.cooldowns)) if (rt.cooldowns[slot] > 0) rt.cooldowns[slot] = Math.max(0, rt.cooldowns[slot] - dt);
            safe(() => deck().updateCooldown(dt));                                                // 一閃の分割ダメージなどの時計(カード戦闘の時計)
            touchAssist();
            for (const slot of requests) { if (!rt.active || generation !== rt.generation) break; useAbility(slot, "keyboard"); }
            refreshLayer(this);
        };
        const _createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
        Scene_Map.prototype.createDisplayObjects = function() {
            _createDisplayObjects.apply(this, arguments);
            createLayer(this);
        };
    }

    // ------------------------------------------------------------------ 表示(スロットのHUD・敵の予兆) ----------------------------------------------------------------
    const getHudState = () => {
        const gauge = safe(() => { const g = root.ProjectRUltimateGauge; const max = g?.getUltimateGaugeMax?.() ?? 0; return max > 0 ? { gauge: g.getUltimateGauge(), max } : null; }, null);
        const slots = ["special", "mobility", "ultimate", "consumable"].map(slot => {
            const d = LOADOUT[slot], cd = cooldownOf(slot);
            const total = Math.max(0.0001, d.cooldown || 0);
            let ready = cd <= 0, extra = null;
            if (slot === "ultimate") { ready = !!gauge && gauge.gauge >= gauge.max; extra = gauge ? { gauge: gauge.gauge, max: gauge.max } : null; }
            if (slot === "consumable") { const item = pickConsumable(); ready = ready && !!item; extra = { count: item ? $gameParty.numItems(item) : 0 }; }
            return { slot, key: d.key, label: d.label, cooldown: cd, ratio: d.cooldown > 0 ? Math.min(1, cd / total) : 0, ready, extra, flash: rt.flash.slot === slot && rt.frame < rt.flash.until ? (rt.flash.ok ? "ok" : "ng") : null };
        });
        return { active: rt.active, slots, attack: { key: "LMB", label: "攻撃" }, cancel: { key: "C", label: "取消" }, telegraphs: telegraphRecords().length };
    };
    const telegraphRecords = () => {
        const api = enemyAttack(); if (!api || !rt.active) return [];
        return safe(() => api.list().filter(r => r && r.state === "pending" && eventVisible(map()?.event(r.eventId))), []);          // 隠れている敵の予兆は出さない(位置がもれる)
    };
    // HUD: 既存の ProjectR_BattleHUD の5枠(スキル枠)に、固定アビリティを表示する(カードの手札・山札の表示は、フィールド戦闘の間だけ使わない)。
    //   BattleHUD のデータ元(DataAdapter)の skills() / cardCounts() を、フィールド戦闘の間だけ差し替える。HUDの描画・配置は既存のまま。
    const slotIcon = (def, item) => {
        if (def.kind === "card") return safe(() => root.ProjectRBattleHUD?.getCardPresentation?.(def.cardId) || null, null);
        if (def.kind === "item" && item) return { name: item.name, iconIndex: item.iconIndex, imageName: "" };
        return null;
    };
    const hudSlots = () => {
        const state = getHudState();
        const bySlot = Object.fromEntries(state.slots.map(s => [s.slot, s]));
        const make = (slot, view) => {
            const d = LOADOUT[slot];
            const item = slot === "consumable" ? pickConsumable() : null;
            const pres = slotIcon(d, item) || {};
            const cd = view ? view.cooldown : 0;
            return {
                mode: "field", key: d.key, slot, name: slot === "cancel" ? d.label : (pres.name && slot !== "special" && slot !== "mobility" ? pres.name : d.label),
                iconIndex: pres.iconIndex || 0, imageName: pres.imageName || "", skillId: 0,
                available: slot === "cancel" ? true : !!(view && (view.ready || cd > 0)), disabled: slot === "cancel" ? false : !(view && view.ready),
                selected: !!(view && view.flash === "ok"), cooldown: { active: cd > 0, remaining: cd, total: d.cooldown || 0 }
            };
        };
        return ["special", "mobility", "ultimate", "consumable", "cancel"].map(slot => make(slot, bySlot[slot]));
    };
    const installHud = () => {
        const proto = root.ProjectRBattleHUD?.DataAdapter?.prototype;
        if (!proto || proto.__projectRFieldCombat) return;
        const _skills = proto.skills, _counts = proto.cardCounts;
        proto.skills = function() { return rt.active ? hudSlots() : _skills.apply(this, arguments); };
        proto.cardCounts = function() { return rt.active ? null : _counts.apply(this, arguments); };
        proto.__projectRFieldCombat = true;
    };
    installHud();
    // 奥義のキー表示も E にそろえる(Uキーも従来どおり使える)。
    safe(() => {
        const ua = ultimate();
        if (ua && typeof ua.getInputBinding === "function") {
            const original = ua.getInputBinding;
            ua.getInputBinding = function() { const b = original.apply(this, arguments); return rt.active && b ? { ...b, key: "E", active: true } : b; };
        }
    });

    // 予兆: ProjectREnemyAttack の予約の記録(いま溜め中の攻撃)を、そのまま赤く描く。予約が取り消されれば、予兆も同時に消える。
    let layerState = null;
    const createLayer = scene => {
        if (typeof PIXI === "undefined") return;
        const layer = new PIXI.Container();
        const tele = new PIXI.Graphics();
        layer.addChild(tele);
        const index = scene._windowLayer ? scene.getChildIndex(scene._windowLayer) : scene.children.length;
        scene.addChildAt(layer, Math.max(0, index));
        layerState = { scene, layer, tele };
    };
    const tw = () => (map()?.tileWidth?.() ?? 48), th = () => (map()?.tileHeight?.() ?? 48);
    const toScreen = (tx, ty) => ({ x: map().adjustX(tx) * tw(), y: map().adjustY(ty) * th() });
    const drawTelegraphs = g => {
        g.clear();
        for (const r of telegraphRecords()) {
            const progress = r.windup > 0 ? 1 - r.framesLeft / r.windup : 1;
            const fill = 0.16 + 0.34 * Math.max(0, Math.min(1, progress));
            if (r.area) {
                const p = toScreen(r.area.x, r.area.y);
                g.beginFill(0xff2a2a, fill); g.lineStyle(2, 0xff6666, 0.85);
                g.drawRect(p.x, p.y, r.area.width * tw(), r.area.height * th()); g.endFill();
            } else if (r.origin && Number.isFinite(r.degree)) {
                const o = toScreen(r.origin.x, r.origin.y), len = (r.length || 6) * tw(), rad = r.degree * Math.PI / 180;
                const ex = o.x + Math.sin(rad) * len, ey = o.y - Math.cos(rad) * len, w = 0.5 * tw();
                const nx = Math.cos(rad) * w / 2, ny = Math.sin(rad) * w / 2;
                g.beginFill(0xff2a2a, fill); g.lineStyle(2, 0xff6666, 0.85);
                g.drawPolygon([o.x - nx, o.y - ny, o.x + nx, o.y + ny, ex + nx, ey + ny, ex - nx, ey - ny]); g.endFill();
            }
        }
    };
    const refreshLayer = scene => {
        const L = layerState;
        if (!L || L.scene !== scene || L.layer.destroyed) return;
        L.layer.visible = rt.active;
        if (rt.active) drawTelegraphs(L.tele);
    };

    // ------------------------------------------------------------------ 公開API ----------------------------------------------------------------
    root.ProjectRFieldCombat = Object.freeze({
        VERSION: "0.1.0", SOURCE,
        begin, end, isActive: () => rt.active,
        getState: () => ({ active: rt.active, engaged: rt.engaged, encounter: enc.state, serial: rt.serial, frame: rt.frame, enemies: [...rt.enemies.values()].map(b => ({ eventId: b.eventId, state: b.state, attacks: b.attacks, cooldown: b.cooldown })), diagnostics: { ...rt.diag }, pending: rt.pending.length, touchAssists: rt.touchAssists }),
        getLoadout: () => JSON.parse(JSON.stringify(LOADOUT)),
        getCooldowns: () => ({ ...rt.cooldowns }),
        useAbility, cancel, getHudState, getHudSlots: hudSlots,
        getLastResult: () => (rt.lastResult ? JSON.parse(JSON.stringify(rt.lastResult)) : null),
        getLog: () => rt.log.map(e => ({ ...e })),
        attachEnemy, detachEnemy, listEnemies: () => [...rt.enemies.keys()],
        getEnemyPerception, getPerception: () => ({ enabled: cfg.perception, sightTiles: cfg.sightTiles, fovDegrees: cfg.fovDegrees }), setPerception, resetPerception,
        getVisibleEnemies: () => [...rt.enemies.keys()].filter(id => eventVisible(map()?.event(id))),
        setDevAllowOutsideEncounter: on => { cfg.devAllowOutside = !!on; return cfg.devAllowOutside; },
        isCombatAllowed,
        startEncounter, transferToBattleMap, completeEncounter, abortEncounter, getEncounterState, onEncounterResult,
        getConfig: () => ({ ...cfg }),
        getSoulMode: () => cfg.soulMode,
        setSoulMode: mode => { if (!["off", "dev", "on"].includes(mode)) return false; cfg.soulMode = mode; return true; },
        isSoulAllowed
    });
})();
