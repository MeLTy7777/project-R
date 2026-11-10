/*:
 * @target MZ
 * @plugindesc v0.3.0 ProjectR SOUL戦闘 D13/I6 本番の入口(ボス戦の開始〜勝敗の処理)。ボスごとのHP・形態・弾幕の表・敵の絵を定義から使い、専用ステージへ移動 → SOUL戦闘(準備ループ)+ボス → 勝利 / 敗北 / その他の結果を1回だけ確定。敗北はボス用の敗北メニュー。
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
 * @param VictoryCommonEventId
 * @text 勝利後に呼ぶコモンイベント(0 = 呼ばない)
 * @desc 勝利して元のマップへ戻り、結果の変数を書いたあとに、1回だけ予約するコモンイベント。報酬・ストーリーの進行はそこで行ってください(二重に動きません)。StartSoulEncounter の指定が優先されます。
 * @type common_event
 * @default 0
 *
 * @param OtherCommonEventId
 * @text その他(中断など)のあとに呼ぶコモンイベント(0 = 呼ばない)
 * @desc 勝利でも敗北でもない終わり方(中断・開始の失敗など)で元のマップへ戻ったあとに、1回だけ予約するコモンイベント。敗北は敗北メニューへ進むので、コモンイベントは呼びません。
 * @type common_event
 * @default 0
 *
 * @param Bosses
 * @text ボス定義の一覧
 * @desc ここに登録したボスだけが StartSoulEncounter で使えます。初期は空です。HP・弾幕の表は必須で、足りない・不正な定義は登録されません(理由は F8 コンソールと getLog())。ボスの数値・素材は、仕様が決まってから設定してください(このプラグインは作りません)。
 * @type struct<BossDef>[]
 * @default []
 *
 * @command StartSoulEncounter
 * @text SOUL戦闘(ボス戦): 開始
 * @desc 専用ステージへ移動してボス戦を始めます。終わると勝利・その他は元のマップへ戻り、敗北は敗北メニューへ進みます。
 * @arg bossId
 * @text Boss ID(Bosses に登録済みのもの)
 * @type string
 * @arg resultVariableId
 * @text 結果を入れる変数(0 = プラグインパラメータ)
 * @type variable
 * @default 0
 * @arg victoryCommonEventId
 * @text 勝利後のコモンイベント(0 = プラグインパラメータ)
 * @type common_event
 * @default 0
 * @arg otherCommonEventId
 * @text その他のあとのコモンイベント(0 = プラグインパラメータ)
 * @type common_event
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
 * 【ボスの登録(I6-B)】ProjectRSoulEncounter.registerBoss({ bossId, name, hp, phases:[{ id, label, hpRatio }], bulletPlan:[{ rotation:[{ pattern, options }] }], dodgeBoss?, enemyImage?:{ folder, name, chest?:{ x, y } } })
 *   ・**ボスごとのデータは、すべてボス定義で決まります**(PoC の敵「魔獣」・DEV の仮の弾幕の表・仮の絵に黙って置き換えません)。
 *   ・hp(必須。1以上の整数)= 敵ハートの最大HP。敵ハートの生成に渡し、BossFramework の最大HPにも同じ値を使います(ダメージ・形態の切り替え・勝利は同じHP)。
 *   ・phases = 第二形態以降(HPの割合以下で入る。割合の大きい順に並べ替えます)。第一形態(phase1)は自動です。
 *   ・bulletPlan(必須)= 形態ごとの弾幕の表。第一形態から順に「形態の数+1」個。ProjectRSoulEnemyBullets の弾幕(dev_fan / dev_aimed / dev_radial)と、その項目(count / spreadDeg / arcDeg / speed / warnFrames / shots / shotGap / waves / waveGap / waveWarn)を使います。
 *       戦闘の間だけ ProjectRSoulEnemyBullets.registerPlan(bossId, plan) で登録し、終わったら元に戻します。
 *   ・enemyImage = 敵の絵(img/<enemies|sv_enemies>/<name>.png)。指定したのにファイルが無いボスは始められません。未指定は仮の絵(警告)。chest = 弾の出る位置(絵の中の割合 0〜1)。
 *   ・dodgeBoss = 回避AI(ProjectRSoulBattleDodge)に登録済みのボス定義名(任意。未登録なら始められません)。
 *   ・不正・不足のある定義は登録されません(registerBoss は { ok:false, reason:"invalidBoss", problems:[…] })。StartSoulEncounter はその理由(problems)付きで断ります(結果の変数は 3)。
 *       validateBoss(bossId) = { ok, problems, warnings } / listRejected() = 登録されなかった定義と理由。
 *
 * 【開始】ProjectRSoulEncounter.start({ bossId, resultVariableId?, attackSeconds?, defenseSeconds? }) またはプラグインコマンド StartSoulEncounter。
 *   受け付けないとき(何も変えません): unknownBoss / invalidResultVariable / encounterActive / soulActive / stageBusy / bossActive / mapUnavailable / invalidDeck(デッキが30枚等の条件を満たさない)/ stageEnterFailed。
 *   結果の変数が指定されていれば、受け付けない場合は 3(エンカウンターが動いている最中の拒否は除く)。
 *   開始のコマンドはすぐ戻ります(イベントは待ちません)。戦闘中にイベントの実行を待たせると、SOUL戦闘の時計が止まるためです。
 *
 * 【結果の受け取り方(I6-A)】結果の変数は、**戦闘が完全に終わってから**書きます(戦闘中・ステージから戻る途中は 0 = 進行中)。
 *   ・勝利(1)・その他(3): 元のマップへ戻って保存禁止が解けた直後に、変数を書き、VictoryCommonEventId / OtherCommonEventId があれば、そのコモンイベントを**1回だけ**予約します。
 *       報酬・ストーリーの進行は、そのコモンイベント(または変数を見るイベント)で行ってください。コモンイベントは戦闘1回につき1回しか呼ばれません。
 *   ・敗北(2): 敗北メニューへ進みます(コモンイベントは呼びません)。
 *   ・開始を断ったとき(ボス未登録・デッキ不正など)は、その場で変数が 3 になります(戦闘は始まりません。断った理由は getLog() / コンソール)。
 *   変数を見るイベントで報酬を出す場合は、報酬のあとにその変数を 0 に戻す(または専用のスイッチ・セルフスイッチを立てる)と、二重に出ません。
 *   二重の開始は、動いている間は必ず断ります(encounterActive)。
 *
 * 【エディタでの設定(戦闘を始めるイベント)】
 *   1. プラグイン「ProjectR_SoulEncounter」の Bosses にボスを1つ登録する(bossId・名前・**HP**・形態・**弾幕の表**・必要なら敵の絵)。足りない値があるボスは始められません(理由は F8 コンソールと getLog())。
 *   2. 変数を1つ決める(例: 20「SOUL戦闘の結果」)。ResultVariableId に指定するか、コマンドの引数で指定する。
 *   3. 戦闘を始めるイベント(例: ボスの前の決定ボタンのイベント)に、プラグインコマンド「SOUL戦闘(ボス戦): 開始」(bossId・変数・必要ならコモンイベント)を置く。
 *      その前に、ヘルメースの指輪の入手(プラグインコマンド「ヘルメースの指輪を入手する」。初回は初期カード30枚)が済んでいること。デッキが条件を満たさないと開始を断る(変数 3)。
 *   4. 勝利後のコモンイベント(または変数を見るイベント)に、報酬とストーリーの進行を置く。
 *   ※ 本番のボスのHP・形態・弾幕の表・敵の絵の素材は、仕様が決まってからボス定義に入れてください(このプラグインは作りません)。
 *   ※ ProjectR_SoulBattlePoC の HeartEnemyName(魔獣 HP 1000)は、従来の PoC・DEV の Sandbox 用です。本番のボス戦では使いません。
 *   ※ 開始のコマンドの直後に、結果の変数を読まないでください(0 = 進行中。戦闘が終わって元のマップへ戻ってから 1 / 3 になります)。結果は、コモンイベント(勝利・その他)か、別のイベント(話しかけたとき)で読みます。
 *      敗北(2)は敗北メニューへ進み、「セーブから再開」で別のセーブを読み込むので、マップ上のイベントでは読めません。
 *   ※ 入力する値・テスト用のイベントのコマンド・確認の手順は docs/ProjectR_SoulLoop_Plan.md の §16.9。
 *
 * API: ProjectRSoulEncounter
 *   registerBoss(def) -> { ok, reason?, problems?, warnings? } / unregisterBoss(bossId) / listBosses() / getBoss(bossId) / validateBoss(bossId) / listRejected()
 *   loadBossesFromText(Bosses パラメータの文字列) -> { registered, errors, rejected }(起動時に Bosses パラメータから自動で登録される)     setAssetChecker(fn) = 敵の絵の有無の確認の差し替え(テスト用)
 *   start(options) -> { ok, pending?, reason? }      abort(reason?) -> boolean(戦闘中なら SOUL を終える = 結果 3)
 *   getState() -> { state, bossId, resultVariableId, saveBlocked, last }      state: idle / entering / fighting / leaving / defeat / defeatMenu
 *   getLastResult() -> { bossId, result:"victory"|"defeat"|"other", code, reason }     onResult(fn) -> 登録解除関数(勝利・その他で元のマップへ戻った後に呼ぶ)
 *   RESULT = { NONE:0, VICTORY:1, DEFEAT:2, OTHER:3 }     defeatCommands() -> 敗北メニューの項目(診断・テスト用)
 *   Scene_ProjectRSoulDefeat(敗北メニューの場面)
 *
 * 保存されません(実行時だけ)。通常のマップ戦闘・従来のSOUL・DEV の Sandbox・既存のセーブには影響しません。
 */
/*~struct~BossDef:
 * @param bossId
 * @text Boss ID(StartSoulEncounter で指定する名前)
 * @desc 必須。"default" は使えません。
 * @type string
 * @param name
 * @text 表示名(HUD)
 * @desc 空 = Boss ID を表示します(警告)。
 * @type string
 * @param hp
 * @text ボスのHP(必須・1以上の整数。0 = 未設定)
 * @desc 敵ハートの最大HPです。ダメージ・形態の切り替え(HPの割合)・勝利(HP0)はすべてこのHPで動きます。未設定のボスは始められません(PoC の敵「魔獣」には置き換えません)。
 * @type number
 * @min 0
 * @max 99999999
 * @default 0
 * @param phases
 * @text 形態(HPの割合以下で次の形態。空 = 形態なし)
 * @desc 第一形態は自動です(ここには第二形態以降を、HPの割合が大きい順に書きます)。
 * @type struct<BossPhase>[]
 * @default []
 * @param bulletPlan
 * @text 弾幕の表(必須。第一形態から順に「形態の数+1」個)
 * @desc 形態ごとの弾幕です。第一形態 → 第二形態 … の順に並べます。形態の数と合わない表は受け付けません(DEV の仮の表は本番のボスには使いません)。
 * @type struct<BulletPhase>[]
 * @default []
 * @param dodgeBoss
 * @text 敵ハートの回避AIのボス定義名(任意)
 * @desc ProjectR_SoulBattleDodge に登録済みの名前。未登録の名前は受け付けません。
 * @type string
 * @param enemyImageFolder
 * @text 敵の絵のフォルダ(任意)
 * @type select
 * @option enemies
 * @option sv_enemies
 * @default enemies
 * @param enemyImageName
 * @text 敵の絵のファイル名(拡張子なし。空 = 仮の絵)
 * @desc img/<フォルダ>/<名前>.png が必要です。指定したのにファイルが無いと始められません(黙って別の絵にはしません)。空のときは仮の絵(警告)。
 * @type string
 * @param enemyChestX
 * @text 弾の出る位置(胸)X(0〜1。空 = 中央 0.5)
 * @desc 敵の絵の中の割合です。敵の絵を指定したときだけ使います。
 * @type string
 * @param enemyChestY
 * @text 弾の出る位置(胸)Y(0〜1。空 = 中央 0.5)
 * @type string
 */
/*~struct~BossPhase:
 * @param id
 * @text 形態のID(例: phase2。phase1 は第一形態用に予約)
 * @type string
 * @param label
 * @text 表示名(例: 第二形態)
 * @type string
 * @param hpRatio
 * @text この割合以下のHPで入る(0.01〜0.99)
 * @type number
 * @decimals 2
 * @min 0.01
 * @max 0.99
 * @default 0.5
 */
/*~struct~BulletPhase:
 * @param rotation
 * @text この形態の弾幕(DEFENSE ごとに上から順に巡回)
 * @type struct<BulletEntry>[]
 * @default []
 */
/*~struct~BulletEntry:
 * @param pattern
 * @text 弾幕の種類
 * @type select
 * @option 扇(dev_fan)
 * @value dev_fan
 * @option 狙い撃ち(dev_aimed)
 * @value dev_aimed
 * @option 放射波(dev_radial)
 * @value dev_radial
 * @default dev_aimed
 * @param count
 * @text 弾の数(1〜31。扇・放射。空 = 種類の既定)
 * @type string
 * @param spreadDeg
 * @text 扇の広がり(度 0〜180。扇)
 * @type string
 * @param arcDeg
 * @text 放射の角度(度 0〜180。放射波)
 * @type string
 * @param speed
 * @text 弾の速さ(幅/秒 0.02〜3)
 * @type string
 * @param warnFrames
 * @text 警告のフレーム数(1〜600。実際は最低 24)
 * @type string
 * @param shots
 * @text 発数(1〜12。狙い撃ち)
 * @type string
 * @param shotGap
 * @text 発の間隔(フレーム 1〜600。狙い撃ち)
 * @type string
 * @param waves
 * @text 波の数(1〜8。扇・放射波)
 * @type string
 * @param waveGap
 * @text 波の間隔(フレーム 1〜600。扇・放射波)
 * @type string
 * @param waveWarn
 * @text 波ごとの警告(フレーム 1〜600。放射波)
 * @type string
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const PLUGIN = "ProjectR_SoulEncounter";
    const VERSION = "0.3.0";
    const RESULT = Object.freeze({ NONE: 0, VICTORY: 1, DEFEAT: 2, OTHER: 3 });
    const WAIT_ENTER = 1200, WAIT_LEAVE = 1200;                          // 移動が終わらないときに諦めるフレーム数(Stage 自身にも時間切れがある)
    const params = typeof PluginManager !== "undefined" && PluginManager.parameters ? PluginManager.parameters(PLUGIN) : {};
    const defaultVariable = Math.max(0, Math.floor(Number(params.ResultVariableId) || 0));
    const intOr0 = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? n : 0; };
    const defaultVictoryEvent = intOr0(params.VictoryCommonEventId), defaultOtherEvent = intOr0(params.OtherCommonEventId);
    const safe = (fn, fallback = null) => { try { const v = fn(); return v === undefined ? fallback : v; } catch (_error) { return fallback; } };
    const api = name => { try { const t = root[name]; return t && typeof t === "object" ? t : null; } catch (_error) { return null; } };
    const soul = () => api("ProjectRSoulBattle"), stage = () => api("ProjectRSoulStage"), bf = () => api("ProjectRBossFramework"), poc = () => api("ProjectRSoulBattlePoC");
    const bullets = () => api("ProjectRSoulEnemyBullets"), dodge = () => api("ProjectRSoulBattleDodge");
    const bosses = new Map();
    const rt = {
        state: "idle", job: null, systemRef: null, blockSave: false, resolved: false, boss: null, varId: 0, last: null, pendingCode: 0, planBoss: null, priorPlan: null, victoryEvent: 0, otherEvent: 0, reservedSerial: 0, unsubEnd: null, armedDodge: false, waited: 0,
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

    // ---------------------------------------------------------------- ボスの登録・検証(I6-B) ----------------------------------------------------------------
    // 本番のボスは、HP・形態・弾幕の表・敵の絵をすべて定義で持つ。足りない・不正な定義は登録せず、理由(problems)を返す。
    // PoC の敵(魔獣)・DEV の仮の弾幕の表・仮の絵に、黙って置き換えない(仮の絵だけは「未指定」の警告つきで使う)。
    const HP_MAX = 99999999;
    const BULLET_OPTIONS = Object.freeze({           // 弾幕の項目 → [最小, 最大, 整数か](ProjectR_SoulEnemyBullets の startPattern の許容範囲と同じ)
        count: [1, 31, true], spreadDeg: [0, 180, false], arcDeg: [0, 180, false], speed: [0.02, 3, false], warnFrames: [1, 600, true],
        shots: [1, 12, true], shotGap: [1, 600, true], waves: [1, 8, true], waveGap: [1, 600, true], waveWarn: [1, 600, true]
    });
    const blank = v => v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    const numOrNaN = v => (blank(v) ? NaN : Number(v));
    const BAD_FILE_NAME = /[\\/:*?"<>|]|^\.+$/;
    const rejectedDefs = new Map();                  // bossId -> problems(登録されなかった定義。StartSoulEncounter が理由つきで断るために覚える)
    let assetChecker = null;                         // テスト用: (folder, name) => true | false | null(不明)
    // 敵の絵のファイルがあるか(NW.js の実行時)。確認できないときは null(不明 = 警告だけ)。
    const defaultAssetExists = (folder, name) => {
        try {
            if (typeof require !== "function" || typeof process === "undefined" || !process.mainModule || !process.mainModule.filename) return null;
            const fs = require("fs"), path = require("path");
            const base = path.join(path.dirname(process.mainModule.filename), "img", folder, name);
            return [".png", ".png_", ".rpgmvp"].some(ext => fs.existsSync(base + ext));
        } catch (_error) { return null; }
    };
    const assetExists = (folder, name) => { if (typeof assetChecker === "function") { try { return assetChecker(folder, name); } catch (_error) { return null; } } return defaultAssetExists(folder, name); };

    // ボス定義(実行時の形)を検証して正規化する。戻り値 { ok, bossId, def?, problems, warnings }
    const normalizeDef = raw => {
        const problems = [], warnings = [];
        const bad = (field, message) => problems.push(field + ": " + message);
        const d = raw && typeof raw === "object" ? raw : {};
        const bossId = typeof d.bossId === "string" ? d.bossId.trim() : "";
        if (!bossId) bad("bossId", "未設定です");
        else if (bossId === "default") bad("bossId", "\"default\" は使えません(弾幕の既定の表と区別できなくなります)");
        const name = typeof d.name === "string" ? d.name.trim() : "";
        if (!name) warnings.push("name: 未設定のため bossId を表示名に使います");
        let hp = 0;
        if (blank(d.hp) || Number(d.hp) === 0) bad("hp", "未設定です(1以上の整数。ボスごとに指定してください。PoC の敵「魔獣」には置き換えません)");
        else { const n = Number(d.hp); if (!Number.isInteger(n) || n < 1 || n > HP_MAX) bad("hp", "1〜" + HP_MAX + " の整数が必要です(指定: " + d.hp + ")"); else hp = n; }
        // 形態(第二形態以降)
        const phases = [], seenId = new Set(["phase1"]), seenRatio = new Set();
        const rawPhases = blank(d.phases) ? [] : d.phases;
        if (!Array.isArray(rawPhases)) bad("phases", "配列ではありません");
        else rawPhases.forEach((p, i) => {
            const f = "phases[" + i + "]";
            if (!p || typeof p !== "object") { bad(f, "項目ではありません"); return; }
            const id = typeof p.id === "string" ? p.id.trim() : "", ratio = numOrNaN(p.hpRatio);
            let okItem = true;
            if (!id) { bad(f + ".id", "未設定です"); okItem = false; } else if (seenId.has(id)) { bad(f + ".id", "\"" + id + "\" は重複しています(phase1 は第一形態用に予約)"); okItem = false; } else seenId.add(id);
            if (!(ratio > 0 && ratio < 1)) { bad(f + ".hpRatio", "0より大きく1より小さい数が必要です(指定: " + p.hpRatio + ")"); okItem = false; }
            else if (seenRatio.has(ratio)) { bad(f + ".hpRatio", ratio + " は重複しています"); okItem = false; } else seenRatio.add(ratio);
            if (okItem) phases.push({ id, label: typeof p.label === "string" && p.label.trim() ? p.label.trim() : id, hpRatio: ratio });
        });
        phases.sort((a, b) => b.hpRatio - a.hpRatio);       // BossFramework と同じ並び(割合の大きい順 = 弾幕の表の形態番号)
        const dodgeBoss = typeof d.dodgeBoss === "string" && d.dodgeBoss.trim() ? d.dodgeBoss.trim() : null;
        // 敵の絵
        let enemyImage = null;
        const im = d.enemyImage;
        if (!blank(im) && typeof im !== "object") bad("enemyImage", "項目ではありません");
        else if (im && !blank(im.name)) {
            const folder = blank(im.folder) ? "enemies" : String(im.folder).trim(), imageName = String(im.name).trim();
            if (folder !== "enemies" && folder !== "sv_enemies") bad("enemyImage.folder", "enemies か sv_enemies のどちらかです(指定: " + im.folder + ")");
            else if (BAD_FILE_NAME.test(imageName)) bad("enemyImage.name", "ファイル名として使えません(" + imageName + ")");
            else {
                let chest = null;
                const c = im.chest;
                if (c && (!blank(c.x) || !blank(c.y))) {
                    const cx = numOrNaN(c.x), cy = numOrNaN(c.y);
                    if (!(cx >= 0 && cx <= 1) || !(cy >= 0 && cy <= 1)) bad("enemyImage.chest", "x と y は 0〜1 の数が必要です(指定: " + c.x + ", " + c.y + ")"); else chest = { x: cx, y: cy };
                }
                enemyImage = Object.freeze({ folder, name: imageName, ...(chest ? { chest: Object.freeze(chest) } : {}) });
            }
        } else warnings.push("enemyImage: 未指定のため、仮の絵(ProjectR_SoulBattleStage の既定)を使います");
        // 弾幕の表(形態の数+1 個。第一形態から順)
        let bulletPlan = null;
        const bp = d.bulletPlan, patterns = safe(() => bullets().PATTERNS, null), paceMax = safe(() => bullets().PACE.maxFrames, 336);
        if (blank(bp) || (Array.isArray(bp) && bp.length === 0)) bad("bulletPlan", "未設定です(形態の数+1 個の弾幕の表が必要です。DEV の仮の表は本番のボスには使いません)");
        else if (!Array.isArray(bp)) bad("bulletPlan", "配列ではありません");
        else {
            const before = problems.length, want = phases.length + 1, rotations = [];
            if (bp.length !== want) bad("bulletPlan", "形態の数と合いません(形態が " + want + " 個あるのに、表が " + bp.length + " 個です。第一形態から順に並べてください)");
            bp.forEach((ph, i) => {
                const f = "bulletPlan[" + i + "]", rot = ph && Array.isArray(ph.rotation) ? ph.rotation : null;
                if (!rot || !rot.length) { bad(f + ".rotation", "1つ以上の弾幕が必要です"); return; }
                const rotation = [];
                rot.forEach((e, j) => {
                    const g = f + ".rotation[" + j + "]", pattern = e && typeof e.pattern === "string" ? e.pattern.trim() : "";
                    if (!pattern) { bad(g + ".pattern", "未設定です"); return; }
                    if (patterns && !patterns[pattern]) { bad(g + ".pattern", "\"" + pattern + "\" は存在しません(" + Object.keys(patterns).join(" / ") + ")"); return; }
                    const options = {}, src = e.options && typeof e.options === "object" ? e.options : {};
                    for (const key of Object.keys(src)) {
                        if (blank(src[key])) continue;
                        const spec = BULLET_OPTIONS[key];
                        if (!spec) { bad(g + "." + key, "知らない項目です"); continue; }
                        const n = Number(src[key]);
                        if (!Number.isFinite(n) || n < spec[0] || n > spec[1] || (spec[2] && !Number.isInteger(n))) bad(g + "." + key, spec[0] + "〜" + spec[1] + (spec[2] ? " の整数" : " の数") + "が必要です(指定: " + src[key] + ")");
                        else options[key] = n;
                    }
                    if (patterns && patterns[pattern] && problems.length === before) {            // 長すぎる弾幕は DEFENSE に収まらない(警告だけ)
                        const base = patterns[pattern], waves = options.shots !== undefined ? options.shots : options.waves !== undefined ? options.waves : (base.shots !== undefined ? base.shots : base.waves);
                        const gap = options.shotGap !== undefined ? options.shotGap : options.waveGap !== undefined ? options.waveGap : (base.shotGap !== undefined ? base.shotGap : base.waveGap);
                        const warn = Math.max(24, options.warnFrames !== undefined ? options.warnFrames : base.warnFrames), est = warn + (Math.max(1, waves) - 1) * gap;
                        if (est > paceMax) warnings.push(g + ": 弾幕が長く(約 " + est + "f)、DEFENSE(6秒 = 360f)の終わりまでに収まらない可能性があります");
                    }
                    rotation.push({ pattern, options });
                });
                rotations.push(rotation);
            });
            if (problems.length === before && rotations.length === want) bulletPlan = Object.freeze({ phases: rotations.map((rotation, i) => ({ id: i === 0 ? "phase1" : phases[i - 1].id, label: i === 0 ? "第一形態" : phases[i - 1].label, rotation })) });
        }
        if (problems.length) return { ok: false, bossId, problems, warnings };
        return { ok: true, bossId, problems, warnings, def: Object.freeze({ bossId, name: name || bossId, hp, phases: Object.freeze(phases.map(p => Object.freeze(p))), dodgeBoss, enemyImage, bulletPlan, warnings: Object.freeze(warnings.slice()) }) };
    };
    const registerBoss = def => {
        const r = normalizeDef(def);
        const id = r.bossId;
        if (!r.ok) {
            if (id) { bosses.delete(id); rejectedDefs.set(id, r.problems.slice()); }
            note({ type: "bossRejected", bossId: id, problems: r.problems });
            return { ok: false, reason: "invalidBoss", bossId: id, problems: r.problems, warnings: r.warnings };
        }
        rejectedDefs.delete(id);
        bosses.set(id, r.def);
        return { ok: true, bossId: id, warnings: r.warnings };
    };
    const unregisterBoss = bossId => { rejectedDefs.delete(bossId); return bosses.delete(bossId); };
    // 実行環境での確認(敵の絵のファイル・回避AIの定義)。開始のたびに行う。ここで見つかった問題は、黙って別のものに置き換えず、開始を断る。
    const checkEnvironment = def => {
        const problems = [], warnings = [];
        if (def.enemyImage) {
            const exists = assetExists(def.enemyImage.folder, def.enemyImage.name);
            if (exists === false) problems.push("enemyImage: img/" + def.enemyImage.folder + "/" + def.enemyImage.name + ".png が見つかりません");
            else if (exists === null) warnings.push("enemyImage: ファイルの有無を確認できませんでした");
        }
        if (def.dodgeBoss) {
            const list = safe(() => dodge().listBosses(), null);
            if (!Array.isArray(list)) problems.push("dodgeBoss: 回避AI(ProjectR_SoulBattleDodge)がありません");
            else if (list.indexOf(def.dodgeBoss) < 0) problems.push("dodgeBoss: \"" + def.dodgeBoss + "\" は回避AIに登録されていません");
        }
        return { problems, warnings };
    };
    const validateBoss = bossId => {
        const id = String(bossId || "");
        if (rejectedDefs.has(id)) return { ok: false, bossId: id, problems: rejectedDefs.get(id).slice(), warnings: [] };
        const def = bosses.get(id);
        if (!def) return { ok: false, bossId: id, problems: ["bossId: 登録されていません"], warnings: [] };
        const env = checkEnvironment(def);
        return { ok: env.problems.length === 0, bossId: id, problems: env.problems, warnings: def.warnings.concat(env.warnings) };
    };

    // MZ の struct パラメータは、JSON の文字列が入れ子になっている。文字列が JSON の配列・オブジェクトなら、再帰的に開く。
    const deepParse = value => {
        if (typeof value === "string") {
            const t = value.trim();
            if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) { try { return deepParse(JSON.parse(t)); } catch (_error) { return value; } }
            return value;
        }
        if (Array.isArray(value)) return value.map(deepParse);
        if (value && typeof value === "object") { const out = {}; for (const k of Object.keys(value)) out[k] = deepParse(value[k]); return out; }
        return value;
    };
    // struct の項目 → 実行時のボス定義
    const defFromParam = d => {
        const optionKeys = Object.keys(BULLET_OPTIONS);
        const bulletPlan = Array.isArray(d.bulletPlan) ? d.bulletPlan.map(ph => ({
            rotation: ph && Array.isArray(ph.rotation) ? ph.rotation.map(e => {
                const options = {};
                if (e && typeof e === "object") for (const k of optionKeys) if (!blank(e[k])) options[k] = e[k];
                return { pattern: e && typeof e === "object" ? e.pattern : "", options };
            }) : null
        })) : d.bulletPlan;
        return {
            bossId: d.bossId, name: d.name, hp: d.hp, phases: Array.isArray(d.phases) ? d.phases : d.phases, dodgeBoss: d.dodgeBoss, bulletPlan,
            enemyImage: blank(d.enemyImageName) ? null : { folder: d.enemyImageFolder, name: d.enemyImageName, chest: { x: d.enemyChestX, y: d.enemyChestY } }
        };
    };
    // ボス定義のパラメータ(Bosses)の文字列から登録する。何も作らない(空は何も登録しない。不正・不足の項目は登録せず理由を返す)。戻り値 { registered:[bossId], errors:[理由], rejected:[{ bossId, problems }] }
    const loadBossesFromText = text => {
        const out = { registered: [], errors: [], rejected: [] };
        let list = null;
        try { list = deepParse(typeof text === "string" && text.trim() ? text : "[]"); } catch (error) { out.errors.push("parse:" + String(error && error.message || error)); return out; }
        if (!Array.isArray(list)) { out.errors.push("notArray"); return out; }
        list.forEach((d, i) => {
            if (!d || typeof d !== "object") { out.errors.push("item" + i + ":notObject"); return; }
            const r = registerBoss(defFromParam(d));
            if (r.ok) out.registered.push(r.bossId);
            else { out.errors.push("item" + i + "(" + (r.bossId || "?") + "): " + r.problems.join(" / ")); out.rejected.push({ bossId: r.bossId, problems: r.problems.slice() }); }
        });
        return out;
    };

    // ---------------------------------------------------------------- 開始 ----------------------------------------------------------------
    const reject = (reason, extra) => {
        const busy = reason === "encounterActive";
        if (!busy && rt.pendingVarId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) safe(() => $gameVariables.setValue(rt.pendingVarId, RESULT.OTHER));      // 受け付けなかった: その他
        note({ type: "rejected", reason, ...(extra && extra.problems ? { problems: extra.problems } : {}) });
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
        if (!def) { const id = String(o.bossId || ""); return rejectedDefs.has(id) ? reject("invalidBoss", { problems: rejectedDefs.get(id).slice() }) : reject("unknownBoss"); }
        if (!soul() || !stage() || !bf() || !poc()) return reject("pluginsMissing");
        if (typeof $gamePlayer === "undefined" || !$gamePlayer || !sceneReady()) return reject("mapUnavailable");
        if (soul().isActive()) return reject("soulActive");
        if (stageState() !== "idle" && stageState() !== "none") return reject("stageBusy");
        if (bf().isActive()) return reject("bossActive");
        const env = checkEnvironment(def);                                                            // 敵の絵のファイル・回避AI: 無いものを黙って別のものに置き換えず、何も変えずに断る
        if (env.problems.length) return reject("invalidBoss", { problems: env.problems });
        const entry = bf().validateEntry();
        if (!entry.ok) return reject("invalidDeck", { messages: entry.messages || [] });             // デッキが条件を満たさない: 何も変えずに断る(デッキは書き換えない)
        const moved = stage().enter();
        if (!moved.ok) return reject("stageEnterFailed", { detail: String(moved.reason) });
        rt.state = "entering"; rt.blockSave = true; rt.systemRef = $gameSystem; rt.resolved = false; rt.boss = def; rt.varId = varId; rt.last = null; rt.pendingCode = RESULT.NONE; rt.waited = 0; rt.serial++;
        rt.victoryEvent = intOr0(o.victoryCommonEventId) || defaultVictoryEvent; rt.otherEvent = intOr0(o.otherCommonEventId) || defaultOtherEvent;
        rt.job = { options: { attackSeconds: o.attackSeconds, defenseSeconds: o.defenseSeconds } };
        setVariable(RESULT.NONE);                                                                    // 戦闘中は 0
        note({ type: "start", bossId: def.bossId, varId, hp: def.hp, warnings: def.warnings.concat(env.warnings) });
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
        rt.pendingCode = code;                                                                      // 結果の変数は、元のマップへ戻って(または敗北メニューへ進む直前に)書く。戦闘中・戻る途中は 0
        rt.last = { bossId: rt.boss ? rt.boss.bossId : "", result, code, reason, rounds: payload ? payload.rounds : 0 };
        note({ type: "result", ...rt.last });
        if (rt.unsubEnd) { rt.unsubEnd(); rt.unsubEnd = null; }
        rt.state = result === "defeat" ? "defeat" : "leaving"; rt.waited = 0;
        const left = safe(() => stage().leave("encounter:" + result + ":" + reason), null);          // 元のマップ・元の位置へ戻る(敗北も、HP0 のマップで操作させずにすぐ敗北メニューへ進むため、いったん戻ってから)
        if (left && left.ok === false) note({ type: "leaveFailed", reason: left.reason });
    };
    // ボス(BossFramework)・回避AI・弾幕の自動開始を片づける。BossFramework の onVictory / onDefeat は発火させない(end)。
    // 戦闘の間だけ登録したボスごとの弾幕の表を元に戻す(同じ名前の表が元からあれば、それを戻す)
    const restorePlan = () => {
        try { if (rt.planBoss) { const b = bullets(); if (rt.priorPlan) b.registerPlan(rt.planBoss, rt.priorPlan); else b.unregisterPlan(rt.planBoss); } } catch (_error) { /* 後片づけ */ }
        rt.planBoss = null; rt.priorPlan = null;
    };
    const endBossAndAi = reason => {
        try { const b = bf(); if (b && b.isActive() && rt.boss && b.getState().bossId === rt.boss.bossId) b.end("encounter:" + reason); } catch (_error) { /* 後片づけ */ }
        try { bullets()?.disable?.(); } catch (_error) { /* 後片づけ */ }
        restorePlan();
        try { if (rt.armedDodge) dodge()?.disarm?.(); } catch (_error) { /* 後片づけ */ }
        rt.armedDodge = false;
    };
    // 開始前に結果が決まった(ステージへ着けない・開始に失敗): その他
    const resolveOther = reason => {
        if (rt.resolved) return;
        rt.resolved = true;
        endBossAndAi(reason);
        rt.pendingCode = RESULT.OTHER;
        rt.last = { bossId: rt.boss ? rt.boss.bossId : "", result: "other", code: RESULT.OTHER, reason, rounds: 0 };
        note({ type: "result", ...rt.last });
        if (rt.unsubEnd) { rt.unsubEnd(); rt.unsubEnd = null; }
        rt.state = "leaving"; rt.waited = 0;
        safe(() => stage().leave("encounter:other:" + reason));
    };
    const finishToIdle = () => {
        const last = rt.last, serial = rt.serial, eventId = last && last.code === RESULT.VICTORY ? rt.victoryEvent : rt.otherEvent;
        rt.state = "idle"; rt.job = null; rt.blockSave = false; rt.boss = null; rt.waited = 0;       // 元のマップへ戻った: セーブ禁止を解く
        if (last) setVariable(rt.pendingCode || last.code);                                          // 結果の変数は、ここで初めて書く(戦闘が完全に終わった後)
        // 報酬・ストーリーは既存のコモンイベントに任せる。戦闘1回につき1回だけ予約する(二重に動かさない)。
        if (last && eventId > 0 && rt.reservedSerial !== serial && typeof $gameTemp !== "undefined" && $gameTemp) { rt.reservedSerial = serial; safe(() => $gameTemp.reserveCommonEvent(eventId)); note({ type: "commonEvent", id: eventId, code: last.code, serial }); }
        note({ type: "idle" });
        for (const fn of [...rt.listeners]) { try { fn(last ? { ...last } : null); } catch (_error) { /* 通知 */ } }
    };
    // 別のセーブになった(読み込み・ニューゲーム): 実行時の記録を捨てる。敗北メニューから読み込んだときもここで保存禁止が解ける。
    const reset = why => {
        if (rt.state === "idle" && !rt.blockSave) return;
        restorePlan();
        note({ type: "reset", why, state: rt.state });
        if (rt.unsubEnd) { try { rt.unsubEnd(); } catch (_error) { /* 後片づけ */ } rt.unsubEnd = null; }
        rt.state = "idle"; rt.job = null; rt.blockSave = false; rt.boss = null; rt.resolved = false; rt.waited = 0; rt.systemRef = null; rt.armedDodge = false; rt.defeatMePlayed = false; rt.pendingCode = RESULT.NONE;
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
            // ボスごとの弾幕の表(戦闘の間だけ登録。終わったら元に戻す)。DEV の仮の表には置き換えない
            rt.priorPlan = safe(() => bullets().getPlan(def.bossId), null);
            const planned = bullets().registerPlan(def.bossId, def.bulletPlan);
            if (!planned || !planned.ok) { rt.priorPlan = null; note({ type: "planFailed", reason: planned && planned.reason }); return resolveOther("planFailed:" + (planned && planned.reason)); }
            rt.planBoss = def.bossId;
            if (def.enemyImage && stage().setEnemyLook) safe(() => stage().setEnemyLook(def.enemyImage));
            bullets()?.setConfig?.({ floorHp: 0 });                                                 // 本番: HP は 0 まで減る(DEV の下限は使わない)
            if (def.dodgeBoss && dodge()?.arm) { const armed = dodge().arm({ boss: def.dodgeBoss }); rt.armedDodge = !!(armed && armed.ok); }
            const started = soul().start({ prepare: true, rounds: 0, attackSeconds: o.attackSeconds, defenseSeconds: o.defenseSeconds,
                heart: { centerX: home.x, centerY: home.y, pattern: "static", hp: def.hp }, endOnHeartDefeat: true, endOnCardBattleEnd: true });
            if (!started.ok) { note({ type: "soulStartFailed", reason: started.reason }); return resolveOther("soulStartFailed:" + started.reason); }
            rt.unsubEnd = soul().onEnd(onSoulEnd);
            const heartId = soul().getState().heart.eventId, hpNow = poc().getState().hp, maxHp = def.hp;                 // 敵ハートのHP = ボス定義のHP(PoC の敵のHPや 1000 には置き換えない)
            if (hpNow !== maxHp) { note({ type: "hpMismatch", expected: maxHp, actual: hpNow }); soul().end("encounter:hpMismatch"); return; }
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
        setVariable(RESULT.DEFEAT);                                                                  // 敗北メニューへ進む直前に書く(保存禁止は敗北メニューの間も続く)
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
            const result = start({ bossId: String(args.bossId || ""), resultVariableId: Number(args.resultVariableId) || 0, victoryCommonEventId: Number(args.victoryCommonEventId) || 0, otherCommonEventId: Number(args.otherCommonEventId) || 0 });
            if (!result.ok && typeof console !== "undefined") console.warn(`[${PLUGIN}] start rejected:`, result.reason, result.problems ? result.problems : "");
        });
    }

    {   // 起動時: Bosses パラメータの定義を登録する(初期は空 = 何も登録しない)
        const loaded = loadBossesFromText(params.Bosses);
        if (loaded.errors.length) { note({ type: "bossParamErrors", errors: loaded.errors }); if (typeof console !== "undefined") loaded.errors.forEach(e => console.warn(`[${PLUGIN}] Bosses:`, e)); }
    }

    root.ProjectRSoulEncounter = Object.freeze({
        VERSION, RESULT, registerBoss, loadBossesFromText, unregisterBoss, listBosses: () => [...bosses.keys()], validateBoss,
        getBoss: bossId => { const d = bosses.get(String(bossId || "")); return d ? JSON.parse(JSON.stringify(d)) : null; },
        listRejected: () => [...rejectedDefs.entries()].map(([bossId, problems]) => ({ bossId, problems: problems.slice() })),
        setAssetChecker: fn => { assetChecker = typeof fn === "function" ? fn : null; return true; },
        start, abort, defeatCommands, chooseLoad, chooseTitle,
        onResult: fn => { if (typeof fn !== "function") return () => {}; rt.listeners.add(fn); return () => rt.listeners.delete(fn); },
        getLastResult: () => (rt.last ? { ...rt.last } : null),
        getState: () => ({ state: rt.state, bossId: rt.boss ? rt.boss.bossId : null, resultVariableId: rt.varId, saveBlocked: rt.blockSave, last: rt.last ? { ...rt.last } : null, serial: rt.serial }),
        getLog: () => log.map(e => ({ ...e }))
    });
})();
