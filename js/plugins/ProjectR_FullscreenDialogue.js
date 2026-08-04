/*:
 * @target MZ
 * @plugindesc v1.5.0 情景描写と履歴を扱えるノベル風全画面会話を表示します。
 * @author ProjectR
 *
 * @param DisplayMode
 * @text 既定の表示モード
 * @type select
 * @option 履歴パネル
 * @value historyPanel
 * @option ノベル風オーバーレイ
 * @value overlayNovel
 * @default historyPanel
 *
 * @param BackOpacity
 * @text 半透明背景の透明度
 * @type number
 * @min 0
 * @max 255
 * @default 160
 *
 * @param BodyFontSize
 * @text 本文フォントサイズ
 * @type number
 * @min 8
 * @default 28
 *
 * @param NameFontSize
 * @text 話者名フォントサイズ
 * @type number
 * @min 8
 * @default 32
 *
 * @param TextMarginX
 * @text 本文の左右余白
 * @type number
 * @min 0
 * @default 64
 *
 * @param TextMarginTop
 * @text 本文の上余白
 * @type number
 * @min 0
 * @default 280
 *
 * @param TextMarginBottom
 * @text 本文の下余白
 * @type number
 * @min 0
 * @default 48
 *
 * @param LineGap
 * @text 行間
 * @type number
 * @min 0
 * @default 10
 *
 * @param OutlineWidth
 * @text 文字の縁取り幅
 * @type number
 * @min 0
 * @default 5
 *
 * @param LeftPictureX
 * @text 左立ち絵の初期X座標
 * @type number
 * @min -9999
 * @default 32
 *
 * @param LeftPictureY
 * @text 左立ち絵の初期Y座標
 * @type number
 * @min -9999
 * @default 0
 *
 * @param LeftPictureScale
 * @text 左立ち絵の初期倍率
 * @desc 100で原寸大です。
 * @type number
 * @min 1
 * @default 100
 *
 * @param RightPictureX
 * @text 右立ち絵の初期X座標
 * @desc 右端を基準にするため、少し内側へ置く場合は負の値にします。
 * @type number
 * @min -9999
 * @default -32
 *
 * @param RightPictureY
 * @text 右立ち絵の初期Y座標
 * @type number
 * @min -9999
 * @default 0
 *
 * @param RightPictureScale
 * @text 右立ち絵の初期倍率
 * @desc 100で原寸大です。
 * @type number
 * @min 1
 * @default 100
 *
 * @param InactivePictureOpacity
 * @text 非発言側の透明度
 * @type number
 * @min 0
 * @max 255
 * @default 140
 *
 * @param PictureFadeFrames
 * @text 立ち絵切り替えフェード時間
 * @type number
 * @min 0
 * @default 8
 *
 * @param TextAreaHeightRate
 * @text テキスト領域の高さ（％）
 * @desc 画面高さに対する、上部テキスト領域の割合です。
 * @type number
 * @min 20
 * @max 70
 * @default 42
 *
 * @param TextPanelOpacity
 * @text テキストパネルの透明度
 * @type number
 * @min 0
 * @max 255
 * @default 100
 *
 * @param TextHistoryTopMargin
 * @text 履歴領域の上余白
 * @type number
 * @min 0
 * @default 24
 *
 * @param TextHistoryBottomMargin
 * @text 履歴領域内の下余白
 * @type number
 * @min 0
 * @default 12
 *
 * @param HistoryEntrySpacing
 * @text 発言同士の間隔
 * @type number
 * @min 0
 * @default 12
 *
 * @param TextPortraitGap
 * @text テキストと立ち絵の間隔
 * @type number
 * @min 0
 * @default 16
 *
 * @param PortraitBottomMargin
 * @text 立ち絵の下余白
 * @type number
 * @min 0
 * @default 12
 *
 * @param PreventPortraitTextOverlap
 * @text 立ち絵の重なりを防止
 * @type boolean
 * @on 防止する
 * @off 防止しない
 * @default true
 *
 * @param InputStartDelay
 * @text 会話開始時の入力待ち
 * @desc 会話開始直後に送り操作を受け付けないフレーム数です。
 * @type number
 * @min 0
 * @max 120
 * @default 8
 *
 * @param InputRepeatDelay
 * @text 文章送り後の入力待ち
 * @desc 1回送った直後に次の送り操作を受け付けないフレーム数です。
 * @type number
 * @min 0
 * @max 120
 * @default 6
 *
 * @param AutoUiScale
 * @text 解像度に合わせてUIを拡大
 * @type boolean
 * @on 拡大する
 * @off 拡大しない
 * @default true
 *
 * @param BaseScreenWidth
 * @text 基準画面幅
 * @type number
 * @min 1
 * @default 816
 *
 * @param BaseScreenHeight
 * @text 基準画面高さ
 * @type number
 * @min 1
 * @default 624
 *
 * @param MinimumUiScale
 * @text UI倍率の最小値
 * @type number
 * @decimals 2
 * @min 0.10
 * @default 1.00
 *
 * @param MaximumUiScale
 * @text UI倍率の最大値
 * @type number
 * @decimals 2
 * @min 0.10
 * @default 1.75
 *
 * @param TextContentMaxWidth
 * @text テキスト領域の最大幅
 * @desc 0で画面幅いっぱいまで使用します。
 * @type number
 * @min 0
 * @default 1600
 *
 * @param OverlayScreenDimOpacity
 * @text オーバーレイ時の全体暗転
 * @desc 0でマップやピクチャを暗くしません。
 * @type number
 * @min 0
 * @max 255
 * @default 72
 *
 * @param OverlayTextPosition
 * @text オーバーレイ本文位置
 * @type select
 * @option 上部
 * @value top
 * @option 上部から中央の間
 * @value upperCenter
 * @option 下部
 * @value bottom
 * @default upperCenter
 *
 * @param OverlayTextBackdropEnabled
 * @text 文字の補助背景を表示
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @default true
 *
 * @param OverlayTextBackdropOpacity
 * @text 文字の補助背景の透明度
 * @type number
 * @min 0
 * @max 255
 * @default 112
 *
 * @param OverlayTextBackdropPadding
 * @text 文字の補助背景の余白
 * @type number
 * @min 0
 * @default 16
 *
 * @param OverlayTextBackdropStyle
 * @text 文字の補助背景の種類
 * @type select
 * @option グラデーション
 * @value gradient
 * @option 半透明の黒帯
 * @value band
 * @option なし
 * @value none
 * @default gradient
 *
 * @param OverlayPortraitScaleBoost
 * @text オーバーレイ立ち絵の拡大補正
 * @type number
 * @decimals 2
 * @min 0.10
 * @default 1.25
 *
 * @param OverlayPortraitMaxHeightRate
 * @text オーバーレイ立ち絵の最大高さ率
 * @desc 画面高さを1.00とした上限です。
 * @type number
 * @decimals 2
 * @min 0.10
 * @max 1.00
 * @default 0.88
 *
 * @param OverlayPortraitBottomMargin
 * @text オーバーレイ立ち絵の下余白
 * @type number
 * @min 0
 * @default 12
 *
 * @param OverlayPortraitSideMargin
 * @text オーバーレイ立ち絵の左右余白
 * @type number
 * @min 0
 * @default 24
 *
 * @param OverlayNameFontSize
 * @text オーバーレイ話者名サイズ
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 8
 * @default 22
 *
 * @param OverlayBodyFontSize
 * @text オーバーレイ本文サイズ
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 8
 * @default 28
 *
 * @param OverlayTextMaxWidth
 * @text オーバーレイ本文の最大幅
 * @desc 0で画面幅いっぱいまで使用します。
 * @type number
 * @min 0
 * @default 1500
 *
 * @param OverlayTextLineSpacing
 * @text オーバーレイ本文の行間
 * @type number
 * @min 0
 * @default 8
 *
 * @param OverlayNameBodySpacing
 * @text オーバーレイ話者名と本文の間隔
 * @type number
 * @min 0
 * @default 6
 *
 * @param OverlayHistoryMode
 * @text オーバーレイ履歴の表示方式
 * @type select
 * @option 発言を積み重ねる
 * @value stack
 * @option 最新発言だけ表示
 * @value latestOnly
 * @default stack
 *
 * @param OverlayHistoryHeightRate
 * @text オーバーレイ履歴の下端位置（％）
 * @desc stackで文章を表示できる下端を、画面上端からの割合で指定します。
 * @type number
 * @min 30
 * @max 90
 * @default 55
 *
 * @param OverlayMaxVisibleEntries
 * @text オーバーレイの最大表示件数
 * @desc 0で件数制限なし。内部履歴は削除しません。
 * @type number
 * @min 0
 * @default 4
 *
 * @param OverlayHistoryEntrySpacing
 * @text オーバーレイ発言間の余白
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 0
 * @default 16
 *
 * @param SceneDescriptionLabelEnabled
 * @text 情景描写ラベルを表示
 * @desc 情景描写の本文上に専用ラベルを表示します。
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @default true
 *
 * @param SceneDescriptionLabel
 * @text 情景描写ラベル
 * @desc 情景描写の本文上に表示する名前です。
 * @type string
 * @default 情景描写
 *
 * @param SceneDescriptionFontSize
 * @text 情景描写本文サイズ
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 8
 * @default 26
 *
 * @param SceneDescriptionLabelFontSize
 * @text 情景描写ラベルサイズ
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 8
 * @default 20
 *
 * @param SceneDescriptionTextColor
 * @text 情景描写の文字色番号
 * @desc RPGツクールMZの文字色番号です。0は通常の白文字です。
 * @type number
 * @min 0
 * @default 0
 *
 * @param SceneDescriptionOpacity
 * @text 情景描写文字の不透明度
 * @type number
 * @min 0
 * @max 255
 * @default 230
 *
 * @param SceneDescriptionAlignment
 * @text 情景描写の文字揃え
 * @type select
 * @option 左揃え
 * @value left
 * @option 中央揃え
 * @value center
 * @default left
 *
 * @param SceneDescriptionActiveSide
 * @text 情景描写時の立ち絵明暗
 * @type select
 * @option 左右を暗くする
 * @value none
 * @option 直前の明暗を維持
 * @value keep
 * @option 左右を明るくする
 * @value both
 * @default none
 *
 * @param SceneDescriptionTopSpacing
 * @text 情景描写の上余白
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 0
 * @default 8
 *
 * @param SceneDescriptionBottomSpacing
 * @text 情景描写の下余白
 * @desc AutoUiScaleオン時は画面解像度に合わせて拡大します。
 * @type number
 * @min 0
 * @default 12
 *
 * @command StartDialogue
 * @text 全画面会話の開始
 * @desc 立ち絵付きの全画面会話を開始します。
 *
 * @arg displayMode
 * @text 表示モード
 * @desc 未指定時はプラグインパラメータの既定値を使用します。
 * @type select
 * @option プラグイン設定を使用
 * @value default
 * @option 履歴パネル
 * @value historyPanel
 * @option ノベル風オーバーレイ
 * @value overlayNovel
 * @default default
 *
 * @arg overlayHistoryMode
 * @text オーバーレイ履歴の表示方式
 * @desc 未指定時はプラグインパラメータの既定値を使用します。
 * @type select
 * @option プラグイン設定を使用
 * @value default
 * @option 発言を積み重ねる
 * @value stack
 * @option 最新発言だけ表示
 * @value latestOnly
 * @default default
 *
 * @arg entryType
 * @text 発言種別
 * @desc 未指定の既存イベントは通常発言として扱います。
 * @type select
 * @option 通常発言
 * @value dialogue
 * @option 情景描写
 * @value sceneDescription
 * @default dialogue
 *
 * @arg speakerName
 * @text 話者名
 * @type string
 * @default
 *
 * @arg text
 * @text 本文
 * @type multiline_string
 * @default
 *
 * @arg leftPicture
 * @text 左立ち絵
 * @type file
 * @dir img/pictures
 * @default
 *
 * @arg rightPicture
 * @text 右立ち絵
 * @type file
 * @dir img/pictures
 * @default
 *
 * @arg activeSide
 * @text 発言側
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @option 両方
 * @value both
 * @option なし
 * @value none
 * @default left
 *
 * @arg rightMirror
 * @text 右立ち絵を左右反転
 * @type boolean
 * @on 反転する
 * @off 反転しない
 * @default false
 *
 * @arg waitForCompletion
 * @text 決定操作または終了まで待つ
 * @desc keepOpenオン時は決定操作、オフ時は会話終了まで待ちます。
 * @type boolean
 * @on 待つ
 * @off 待たない
 * @default true
 *
 * @arg keepOpen
 * @text 会話画面を開いたままにする
 * @desc オンの場合、決定後も閉じずAppendDialogueを待ちます。
 * @type boolean
 * @on 開いたまま
 * @off 最後に閉じる
 * @default false
 *
 * @command AppendDialogue
 * @text 発言を履歴へ追加
 * @desc 開いている全画面会話へ新しい発言を追加します。
 *
 * @arg entryType
 * @text 発言種別
 * @desc 未指定の既存イベントは通常発言として扱います。
 * @type select
 * @option 通常発言
 * @value dialogue
 * @option 情景描写
 * @value sceneDescription
 * @default dialogue
 *
 * @arg speakerName
 * @text 話者名
 * @type string
 * @default
 *
 * @arg text
 * @text 本文
 * @type multiline_string
 * @default
 *
 * @arg activeSide
 * @text 発言側
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @option 両方
 * @value both
 * @option なし
 * @value none
 * @default left
 *
 * @arg waitForAdvance
 * @text 決定操作までイベントを待つ
 * @type boolean
 * @on 待つ
 * @off 待たない
 * @default true
 *
 * @command ChangeText
 * @text 本文の変更
 * @desc 表示中の話者名、本文、発言側を変更します。
 *
 * @arg entryType
 * @text 発言種別
 * @desc keepは現在の最新発言の種別を維持します。
 * @type select
 * @option 現在の種別を維持
 * @value keep
 * @option 通常発言
 * @value dialogue
 * @option 情景描写
 * @value sceneDescription
 * @default keep
 *
 * @arg speakerName
 * @text 話者名
 * @type string
 * @default
 *
 * @arg text
 * @text 本文
 * @type multiline_string
 * @default
 *
 * @arg activeSide
 * @text 発言側
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @option 両方
 * @value both
 * @option なし
 * @value none
 * @default left
 *
 * @command ChangePictures
 * @text 立ち絵の変更
 * @desc 表示中の左右立ち絵と発言側を変更します。
 *
 * @arg leftPicture
 * @text 左立ち絵
 * @type file
 * @dir img/pictures
 * @default
 *
 * @arg rightPicture
 * @text 右立ち絵
 * @type file
 * @dir img/pictures
 * @default
 *
 * @arg activeSide
 * @text 発言側
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @option 両方
 * @value both
 * @option なし
 * @value none
 * @default left
 *
 * @arg rightMirror
 * @text 右立ち絵を左右反転
 * @type boolean
 * @on 反転する
 * @off 反転しない
 * @default false
 *
 * @command ChangeActiveSide
 * @text 発言側の変更
 * @desc 発言中の立ち絵だけを切り替えます。
 *
 * @arg activeSide
 * @text 発言側
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @option 両方
 * @value both
 * @option なし
 * @value none
 * @default left
 *
 * @command EndDialogue
 * @text 全画面会話の終了
 * @desc 背景、立ち絵、話者名、本文をすべて消します。
 *
 * @command SetPicturePosition
 * @text 立ち絵位置の変更
 * @desc 指定した側の立ち絵の位置と倍率を変更します。
 *
 * @arg side
 * @text 対象
 * @type select
 * @option 左
 * @value left
 * @option 右
 * @value right
 * @default left
 *
 * @arg x
 * @text X座標
 * @type number
 * @min -9999
 * @default 0
 *
 * @arg y
 * @text Y座標
 * @type number
 * @min -9999
 * @default 0
 *
 * @arg scale
 * @text 倍率
 * @desc 100で原寸大です。
 * @type number
 * @min 1
 * @default 100
 *
 * @help
 * ProjectR_FullscreenDialogue.js
 *
 * マップ画面の上に、半透明の黒い背景、左右の立ち絵、
 * 話者名、本文を重ねて表示するProjectR専用プラグインです。
 * historyPanelは従来の履歴表示、overlayNovelは枠のない履歴を
 * 背景や立ち絵へ直接重ねるノベルゲーム風表示です。
 *
 * 立ち絵画像は img/pictures/ に入れてください。
 * 例: img/pictures/Hero_Normal.png
 *
 * 本文では、RPGツクールMZ標準の制御文字を一部使用できます。
 * \V[n] 変数
 * \N[n] アクター名
 * \C[n] 文字色
 * \I[n] アイコン
 * \{ 文字を大きくする
 * \} 文字を小さくする
 * \\ バックスラッシュ
 *
 * プラグインコマンドの本文に \n と入力すると改行として扱います。
 *
 * StartDialogueの「会話画面を開いたままにする」をオンにすると、
 * 決定操作後も画面を閉じず、AppendDialogueで発言を追加できます。
 * 最後はEndDialogueを実行して会話画面を閉じてください。
 * オフの場合は従来どおり、本文を自動ページ分割して最後に閉じます。
 * overlayNovelのstackでは、AppendDialogueの発言を下へ追加します。
 * 表示範囲を超えると古い発言を上へ送り、最新発言を表示します。
 * OverlayHistoryHeightRateは、stack履歴領域の下端位置を
 * 画面上端からの割合で指定します。
 * latestOnlyでは、従来どおり最新発言だけを表示します。
 * entryTypeをsceneDescriptionにすると、話者名の代わりに
 * 情景描写専用のラベル、文字サイズ、色、透明度を使用します。
 * entryTypeがない既存イベントはdialogueとして扱います。
 *
 * TextMarginTopとTextMarginBottomは以前の設定との互換性のために
 * 残しています。v1.1.0以降の上部履歴配置には、TextAreaHeightRate、
 * TextHistoryTopMargin、TextHistoryBottomMarginを使用します。
 *
 * AutoUiScaleをオンにすると、816×624を基準にフォント、余白、
 * 行間、立ち絵位置を画面解像度へ合わせて自動拡大します。
 * 全画面の暗い背景にはRPGツクールMZ標準のScreenSpriteを使用します。
 *
 * このプラグインはScene_Map、Game_Player、Game_Temp、
 * Game_Interpreterを必要な範囲で拡張します。
 * 既存処理は保存してから呼び出し、全画面会話中だけ入力を抑制します。
 */

(() => {
    "use strict";

    const pluginName = "ProjectR_FullscreenDialogue";
    const completionWaitModeName = "projectRFullscreenDialogue";
    const advanceWaitModeName = "projectRFullscreenDialogueAdvance";
    const parameters = PluginManager.parameters(pluginName);

    const clamp = (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    };

    const numberParam = (name, defaultValue, min, max) => {
        const rawValue = parameters[name];
        if (rawValue === undefined || rawValue === "") {
            return defaultValue;
        }
        const value = Number(rawValue);
        if (!Number.isFinite(value)) {
            return defaultValue;
        }
        return clamp(value, min, max);
    };

    const boolArg = (value, defaultValue = false) => {
        if (value === undefined || value === "") {
            return defaultValue;
        }
        return String(value).toLowerCase() === "true";
    };

    const boolParam = (name, defaultValue) => {
        return boolArg(parameters[name], defaultValue);
    };

    const stringParam = (name, defaultValue) => {
        return parameters[name] === undefined ?
            defaultValue : String(parameters[name]);
    };

    const choiceValue = (value, choices, defaultValue) => {
        const normalized = String(value || "");
        return choices.includes(normalized) ? normalized : defaultValue;
    };

    const choiceParam = (name, choices, defaultValue) => {
        return choiceValue(parameters[name], choices, defaultValue);
    };

    const displayModes = ["historyPanel", "overlayNovel"];
    const overlayTextPositions = ["top", "upperCenter", "bottom"];
    const overlayBackdropStyles = ["gradient", "band", "none"];
    const overlayHistoryModes = ["stack", "latestOnly"];
    const entryTypes = ["dialogue", "sceneDescription"];
    const changeEntryTypes = ["keep", ...entryTypes];
    const sceneDescriptionAlignments = ["left", "center"];
    const sceneDescriptionActiveSides = ["none", "keep", "both"];

    const textArg = value => String(value || "").replace(/\\n/g, "\n");
    const pictureArg = value => String(value || "").trim();

    const settings = {
        displayMode: choiceParam("DisplayMode", displayModes, "historyPanel"),
        backOpacity: numberParam("BackOpacity", 160, 0, 255),
        bodyFontSize: numberParam("BodyFontSize", 28, 8, 96),
        nameFontSize: numberParam("NameFontSize", 32, 8, 96),
        textMarginX: numberParam("TextMarginX", 64, 0, 9999),
        lineGap: numberParam("LineGap", 10, 0, 96),
        outlineWidth: numberParam("OutlineWidth", 5, 0, 32),
        leftPictureX: numberParam("LeftPictureX", 32, -9999, 9999),
        leftPictureY: numberParam("LeftPictureY", 0, -9999, 9999),
        leftPictureScale: numberParam("LeftPictureScale", 100, 1, 9999),
        rightPictureX: numberParam("RightPictureX", -32, -9999, 9999),
        rightPictureY: numberParam("RightPictureY", 0, -9999, 9999),
        rightPictureScale: numberParam("RightPictureScale", 100, 1, 9999),
        inactivePictureOpacity: numberParam(
            "InactivePictureOpacity", 140, 0, 255
        ),
        pictureFadeFrames: numberParam("PictureFadeFrames", 8, 0, 120),
        textAreaHeightRate: numberParam("TextAreaHeightRate", 42, 20, 70),
        textPanelOpacity: numberParam("TextPanelOpacity", 100, 0, 255),
        textHistoryTopMargin: numberParam(
            "TextHistoryTopMargin", 24, 0, 9999
        ),
        textHistoryBottomMargin: numberParam(
            "TextHistoryBottomMargin", 12, 0, 9999
        ),
        historyEntrySpacing: numberParam(
            "HistoryEntrySpacing", 12, 0, 9999
        ),
        textPortraitGap: numberParam("TextPortraitGap", 16, 0, 9999),
        portraitBottomMargin: numberParam(
            "PortraitBottomMargin", 12, 0, 9999
        ),
        preventPortraitTextOverlap: boolParam(
            "PreventPortraitTextOverlap", true
        ),
        inputStartDelay: Math.round(numberParam(
            "InputStartDelay", 8, 0, 120
        )),
        inputRepeatDelay: Math.round(numberParam(
            "InputRepeatDelay", 6, 0, 120
        )),
        autoUiScale: boolParam("AutoUiScale", true),
        baseScreenWidth: numberParam("BaseScreenWidth", 816, 1, 99999),
        baseScreenHeight: numberParam("BaseScreenHeight", 624, 1, 99999),
        minimumUiScale: numberParam("MinimumUiScale", 1, 0.1, 10),
        maximumUiScale: numberParam("MaximumUiScale", 1.75, 0.1, 10),
        textContentMaxWidth: numberParam(
            "TextContentMaxWidth", 1600, 0, 99999
        ),
        overlayScreenDimOpacity: numberParam(
            "OverlayScreenDimOpacity", 72, 0, 255
        ),
        overlayTextPosition: choiceParam(
            "OverlayTextPosition",
            overlayTextPositions,
            "upperCenter"
        ),
        overlayTextBackdropEnabled: boolParam(
            "OverlayTextBackdropEnabled", true
        ),
        overlayTextBackdropOpacity: numberParam(
            "OverlayTextBackdropOpacity", 112, 0, 255
        ),
        overlayTextBackdropPadding: numberParam(
            "OverlayTextBackdropPadding", 16, 0, 9999
        ),
        overlayTextBackdropStyle: choiceParam(
            "OverlayTextBackdropStyle",
            overlayBackdropStyles,
            "gradient"
        ),
        overlayPortraitScaleBoost: numberParam(
            "OverlayPortraitScaleBoost", 1.25, 0.1, 100
        ),
        overlayPortraitMaxHeightRate: numberParam(
            "OverlayPortraitMaxHeightRate", 0.88, 0.1, 1
        ),
        overlayPortraitBottomMargin: numberParam(
            "OverlayPortraitBottomMargin", 12, 0, 9999
        ),
        overlayPortraitSideMargin: numberParam(
            "OverlayPortraitSideMargin", 24, 0, 9999
        ),
        overlayNameFontSize: numberParam(
            "OverlayNameFontSize", 22, 8, 96
        ),
        overlayBodyFontSize: numberParam(
            "OverlayBodyFontSize", 28, 8, 96
        ),
        overlayTextMaxWidth: numberParam(
            "OverlayTextMaxWidth", 1500, 0, 99999
        ),
        overlayTextLineSpacing: numberParam(
            "OverlayTextLineSpacing", 8, 0, 96
        ),
        overlayNameBodySpacing: numberParam(
            "OverlayNameBodySpacing", 6, 0, 9999
        ),
        overlayHistoryMode: choiceParam(
            "OverlayHistoryMode", overlayHistoryModes, "stack"
        ),
        overlayHistoryHeightRate: numberParam(
            "OverlayHistoryHeightRate", 55, 30, 90
        ),
        overlayMaxVisibleEntries: Math.round(numberParam(
            "OverlayMaxVisibleEntries", 4, 0, 9999
        )),
        overlayHistoryEntrySpacing: numberParam(
            "OverlayHistoryEntrySpacing", 16, 0, 9999
        ),
        sceneDescriptionLabelEnabled: boolParam(
            "SceneDescriptionLabelEnabled", true
        ),
        sceneDescriptionLabel: stringParam(
            "SceneDescriptionLabel", "情景描写"
        ),
        sceneDescriptionFontSize: numberParam(
            "SceneDescriptionFontSize", 26, 8, 96
        ),
        sceneDescriptionLabelFontSize: numberParam(
            "SceneDescriptionLabelFontSize", 20, 8, 96
        ),
        sceneDescriptionTextColor: Math.round(numberParam(
            "SceneDescriptionTextColor", 0, 0, 9999
        )),
        sceneDescriptionOpacity: Math.round(numberParam(
            "SceneDescriptionOpacity", 230, 0, 255
        )),
        sceneDescriptionAlignment: choiceParam(
            "SceneDescriptionAlignment",
            sceneDescriptionAlignments,
            "left"
        ),
        sceneDescriptionActiveSide: choiceParam(
            "SceneDescriptionActiveSide",
            sceneDescriptionActiveSides,
            "none"
        ),
        sceneDescriptionTopSpacing: numberParam(
            "SceneDescriptionTopSpacing", 8, 0, 9999
        ),
        sceneDescriptionBottomSpacing: numberParam(
            "SceneDescriptionBottomSpacing", 12, 0, 9999
        )
    };

    const playerDeathControlParameters = PluginManager.parameters(
        "ProjectR_PlayerDeathControl"
    );
    const parsedAttackCommonEventId = Number(
        playerDeathControlParameters.AttackCommonEventId
    );
    const attackCommonEventId = Number.isInteger(parsedAttackCommonEventId) &&
        parsedAttackCommonEventId > 0 ? parsedAttackCommonEventId : 0;

    const defaultPicturePositions = () => ({
        left: {
            x: settings.leftPictureX,
            y: settings.leftPictureY,
            scale: settings.leftPictureScale
        },
        right: {
            x: settings.rightPictureX,
            y: settings.rightPictureY,
            scale: settings.rightPictureScale
        }
    });

    const projectR = window.ProjectR = window.ProjectR || {};
    const FullscreenDialogue =
        projectR.FullscreenDialogue = projectR.FullscreenDialogue || {};

    const state = {
        active: false,
        keepOpen: false,
        displayMode: settings.displayMode,
        overlayHistoryMode: settings.overlayHistoryMode,
        entryType: "dialogue",
        speakerName: "",
        text: "",
        history: [],
        pages: [""],
        pageIndex: 0,
        leftPicture: "",
        rightPicture: "",
        activeSide: "none",
        pictureActiveSide: "none",
        rightMirror: false,
        positions: defaultPicturePositions(),
        waitingAdvanceId: 0,
        needsTextRefresh: false,
        needsPictureRefresh: false,
        inputLockFrames: 0,
        directKeyTriggered: false,
        rawGamepadOkPressed: false
    };

    let currentLayer = null;
    let nextAdvanceId = 0;
    let directKeyListenerInstalled = false;
    let cachedLayoutKey = "";
    let cachedLayoutMetrics = null;

    const normalizeActiveSide = activeSide => {
        const value = String(activeSide || "none");
        return ["left", "right", "both", "none"].includes(value) ?
            value : "none";
    };

    const normalizeEntryType = entryType => {
        return choiceValue(entryType, entryTypes, "dialogue");
    };

    const entryTypeOf = entry => {
        return normalizeEntryType(entry && entry.entryType);
    };

    const isSceneDescriptionEntry = entry => {
        return entryTypeOf(entry) === "sceneDescription";
    };

    const updatePictureActiveSideForEntry = entry => {
        if (!isSceneDescriptionEntry(entry)) {
            state.pictureActiveSide = normalizeActiveSide(entry.activeSide);
        } else if (settings.sceneDescriptionActiveSide !== "keep") {
            state.pictureActiveSide = settings.sceneDescriptionActiveSide;
        }
    };

    // UI用のboxサイズではなく、実際のレンダラー領域を基準にします。
    const screenSize = () => {
        const app = Graphics.app;
        const rendererScreen = app && app.renderer && app.renderer.screen;
        const rendererWidth = rendererScreen ? Number(rendererScreen.width) : 0;
        const rendererHeight = rendererScreen ? Number(rendererScreen.height) : 0;
        const width = Math.ceil(Math.max(
            Number(Graphics.width) || 0,
            rendererWidth || 0,
            1
        ));
        const height = Math.ceil(Math.max(
            Number(Graphics.height) || 0,
            rendererHeight || 0,
            1
        ));
        return { width, height };
    };

    const windowPadding = () => {
        if (typeof $gameSystem !== "undefined" && $gameSystem &&
            typeof $gameSystem.windowPadding === "function") {
            return Math.max(0, Number($gameSystem.windowPadding()) || 0);
        }
        return 12;
    };

    const uiScaleForSize = (width, height) => {
        if (!settings.autoUiScale) {
            return 1;
        }
        const scaleX = width / settings.baseScreenWidth;
        const scaleY = height / settings.baseScreenHeight;
        const minimum = Math.min(
            settings.minimumUiScale,
            settings.maximumUiScale
        );
        const maximum = Math.max(
            settings.minimumUiScale,
            settings.maximumUiScale
        );
        return clamp(Math.min(scaleX, scaleY), minimum, maximum);
    };

    const scaledPixel = (value, uiScale, minimum = 0) => {
        return Math.max(minimum, Math.round(value * uiScale));
    };

    const invalidateLayoutCache = () => {
        cachedLayoutKey = "";
        cachedLayoutMetrics = null;
    };

    const layoutMetrics = () => {
        const { width, height } = screenSize();
        const basePadding = windowPadding();
        const displayMode = state.displayMode;
        const isOverlay = displayMode === "overlayNovel";
        const cacheKey = [
            width,
            height,
            basePadding,
            displayMode,
            state.overlayHistoryMode
        ].join(",");
        if (cacheKey === cachedLayoutKey && cachedLayoutMetrics) {
            return cachedLayoutMetrics;
        }
        const uiScale = uiScaleForSize(width, height);
        const ui = {
            bodyFontSize: scaledPixel(
                isOverlay ? settings.overlayBodyFontSize : settings.bodyFontSize,
                uiScale,
                8
            ),
            nameFontSize: scaledPixel(
                isOverlay ? settings.overlayNameFontSize : settings.nameFontSize,
                uiScale,
                8
            ),
            lineGap: scaledPixel(
                isOverlay ? settings.overlayTextLineSpacing : settings.lineGap,
                uiScale
            ),
            outlineWidth: scaledPixel(settings.outlineWidth, uiScale),
            textMarginX: scaledPixel(settings.textMarginX, uiScale),
            textHistoryTopMargin: scaledPixel(
                settings.textHistoryTopMargin,
                uiScale
            ),
            textHistoryBottomMargin: scaledPixel(
                settings.textHistoryBottomMargin,
                uiScale
            ),
            historyEntrySpacing: scaledPixel(
                settings.historyEntrySpacing,
                uiScale
            ),
            overlayHistoryEntrySpacing: scaledPixel(
                settings.overlayHistoryEntrySpacing,
                uiScale
            ),
            sceneDescriptionFontSize: scaledPixel(
                settings.sceneDescriptionFontSize,
                uiScale,
                8
            ),
            sceneDescriptionLabelFontSize: scaledPixel(
                settings.sceneDescriptionLabelFontSize,
                uiScale,
                8
            ),
            sceneDescriptionTopSpacing: scaledPixel(
                settings.sceneDescriptionTopSpacing,
                uiScale
            ),
            sceneDescriptionBottomSpacing: scaledPixel(
                settings.sceneDescriptionBottomSpacing,
                uiScale
            ),
            speakerBodyGap: scaledPixel(
                isOverlay ? settings.overlayNameBodySpacing : 4,
                uiScale
            ),
            textPortraitGap: scaledPixel(settings.textPortraitGap, uiScale),
            portraitBottomMargin: scaledPixel(
                settings.portraitBottomMargin,
                uiScale
            ),
            overlayPortraitBottomMargin: scaledPixel(
                settings.overlayPortraitBottomMargin,
                uiScale
            ),
            overlayPortraitSideMargin: scaledPixel(
                settings.overlayPortraitSideMargin,
                uiScale
            ),
            overlayBackdropPadding: scaledPixel(
                settings.overlayTextBackdropPadding,
                uiScale
            ),
            textPadding: scaledPixel(basePadding, uiScale)
        };
        const marginX = clamp(
            ui.textMarginX,
            0,
            Math.max(0, Math.floor((width - 1) / 2))
        );
        const uncappedTextWidth = Math.max(1, width - marginX * 2);
        const maximumTextWidth = isOverlay ?
            settings.overlayTextMaxWidth : settings.textContentMaxWidth;
        const textWidth = maximumTextWidth > 0 ?
            Math.min(uncappedTextWidth, maximumTextWidth) :
            uncappedTextWidth;
        const textX = Math.round((width - textWidth) / 2);
        let textTop;
        let textHeight;
        if (isOverlay) {
            if (state.overlayHistoryMode === "stack") {
                // 割合は高さではなく、画面上端から見た履歴領域の下端です。
                const historyBottom = clamp(
                    Math.round(
                        height * settings.overlayHistoryHeightRate / 100
                    ),
                    1,
                    height
                );
                if (settings.overlayTextPosition === "upperCenter") {
                    textTop = Math.round(height * 0.14);
                } else {
                    textTop = scaledPixel(24, uiScale);
                }
                textTop = clamp(textTop, 0, Math.max(0, historyBottom - 1));
                textHeight = Math.max(1, historyBottom - textTop);
            } else {
                const requestedTextHeight = Math.max(
                    1,
                    Math.round(height * 0.32)
                );
                textHeight = Math.min(requestedTextHeight, height);
                if (settings.overlayTextPosition === "top") {
                    textTop = scaledPixel(24, uiScale);
                } else if (settings.overlayTextPosition === "bottom") {
                    textTop = height - textHeight - scaledPixel(36, uiScale);
                } else {
                    textTop = Math.round(height * 0.14);
                }
                textTop = clamp(
                    textTop,
                    0,
                    Math.max(0, height - textHeight)
                );
            }
        } else {
            textTop = clamp(
                ui.textHistoryTopMargin,
                0,
                Math.max(0, height - 1)
            );
            const requestedTextHeight = Math.max(
                1,
                Math.round(height * settings.textAreaHeightRate / 100)
            );
            const maxTextHeight = Math.max(
                1,
                height - textTop - ui.textPortraitGap - 1
            );
            textHeight = Math.min(requestedTextHeight, maxTextHeight);
        }
        const textBottom = textTop + textHeight;
        const portraitTop = isOverlay ? 0 : Math.min(
            height,
            textBottom + ui.textPortraitGap
        );
        const backdropPadding = isOverlay ? ui.overlayBackdropPadding : 0;
        const backdropLeft = Math.max(0, textX - backdropPadding);
        const backdropTop = Math.max(0, textTop - backdropPadding);
        const backdropRight = Math.min(
            width,
            textX + textWidth + backdropPadding
        );
        const backdropBottom = Math.min(
            height,
            textBottom + backdropPadding
        );
        cachedLayoutKey = cacheKey;
        cachedLayoutMetrics = {
            key: cacheKey,
            width,
            height,
            displayMode,
            uiScale,
            ui,
            textRect: {
                x: textX,
                y: textTop,
                width: textWidth,
                height: textHeight
            },
            backdropRect: {
                x: backdropLeft,
                y: backdropTop,
                width: Math.max(1, backdropRight - backdropLeft),
                height: Math.max(1, backdropBottom - backdropTop)
            },
            textBottom,
            portraitTop
        };
        return cachedLayoutMetrics;
    };

    const requestRefresh = () => {
        state.needsTextRefresh = true;
        state.needsPictureRefresh = true;
    };

    const lockAdvanceInput = frames => {
        state.inputLockFrames = Math.max(
            state.inputLockFrames,
            Math.max(0, Math.round(frames))
        );
        state.directKeyTriggered = false;
    };

    const isRawGamepadOkPressed = () => {
        if (typeof navigator === "undefined" || !navigator.getGamepads) {
            return false;
        }
        try {
            const gamepads = navigator.getGamepads();
            return Array.from(gamepads || []).some(gamepad => {
                const button = gamepad && gamepad.buttons && gamepad.buttons[0];
                return Boolean(button && (button.pressed || button.value > 0.5));
            });
        } catch (error) {
            return false;
        }
    };

    const pollRawGamepadOk = () => {
        // Hendrix側でok割り当てが外れていても、標準決定ボタンだけ補完します。
        const pressed = isRawGamepadOkPressed();
        const triggered = pressed && !state.rawGamepadOkPressed;
        state.rawGamepadOkPressed = pressed;
        return triggered;
    };

    const isDirectAdvanceKey = event => {
        const code = String(event.code || "");
        return code === "Enter" || code === "NumpadEnter" ||
            code === "Space" || code === "KeyZ" ||
            Number(event.keyCode) === 13 || Number(event.keyCode) === 32 ||
            Number(event.keyCode) === 90;
    };

    const onDirectKeyDown = event => {
        if (!state.active || event.repeat || !isDirectAdvanceKey(event)) {
            return;
        }
        state.directKeyTriggered = true;
        if (typeof event.preventDefault === "function") {
            event.preventDefault();
        }
    };

    const startDirectKeyListener = () => {
        if (!directKeyListenerInstalled && typeof document !== "undefined") {
            document.addEventListener("keydown", onDirectKeyDown);
            directKeyListenerInstalled = true;
        }
    };

    const stopDirectKeyListener = () => {
        if (directKeyListenerInstalled && typeof document !== "undefined") {
            document.removeEventListener("keydown", onDirectKeyDown);
        }
        directKeyListenerInstalled = false;
        state.directKeyTriggered = false;
    };

    const makeHistoryEntry = (args, requestedEntryType) => {
        const entryType = normalizeEntryType(
            requestedEntryType === undefined ?
                args.entryType : requestedEntryType
        );
        return {
            entryType,
            speakerName: entryType === "sceneDescription" ?
                "" : textArg(args.speakerName),
            text: textArg(args.text),
            activeSide: normalizeActiveSide(args.activeSide)
        };
    };

    FullscreenDialogue.isActive = function() {
        return state.active;
    };

    FullscreenDialogue.isKeepOpen = function() {
        return state.keepOpen;
    };

    FullscreenDialogue.displayMode = function() {
        return state.displayMode;
    };

    FullscreenDialogue.overlayHistoryMode = function() {
        return state.overlayHistoryMode;
    };

    FullscreenDialogue.setLayer = function(layer) {
        currentLayer = layer;
        requestRefresh();
    };

    FullscreenDialogue.clearLayer = function(layer) {
        if (!layer || currentLayer === layer) {
            currentLayer = null;
        }
    };

    FullscreenDialogue.start = function(args) {
        const requestedMode = String(args.displayMode || "default");
        state.displayMode = requestedMode === "default" ?
            settings.displayMode :
            choiceValue(requestedMode, displayModes, settings.displayMode);
        const requestedHistoryMode = String(
            args.overlayHistoryMode || "default"
        );
        state.overlayHistoryMode = requestedHistoryMode === "default" ?
            settings.overlayHistoryMode :
            choiceValue(
                requestedHistoryMode,
                overlayHistoryModes,
                settings.overlayHistoryMode
            );
        invalidateLayoutCache();
        const firstEntry = makeHistoryEntry(args);
        state.active = true;
        state.keepOpen = boolArg(args.keepOpen, false);
        state.entryType = firstEntry.entryType;
        state.speakerName = firstEntry.speakerName;
        state.text = firstEntry.text;
        state.history = [firstEntry];
        state.pages = [state.text];
        state.pageIndex = 0;
        state.leftPicture = pictureArg(args.leftPicture);
        state.rightPicture = pictureArg(args.rightPicture);
        state.activeSide = firstEntry.activeSide;
        state.pictureActiveSide = "none";
        updatePictureActiveSideForEntry(firstEntry);
        state.rightMirror = boolArg(args.rightMirror, false);
        state.positions = defaultPicturePositions();
        state.waitingAdvanceId = 0;
        state.inputLockFrames = 0;
        state.rawGamepadOkPressed = isRawGamepadOkPressed();
        startDirectKeyListener();
        lockAdvanceInput(settings.inputStartDelay);
        requestRefresh();
        return state.keepOpen;
    };

    FullscreenDialogue.append = function(args) {
        if (!state.active) {
            return false;
        }
        const entry = makeHistoryEntry(args);
        state.history.push(entry);
        state.keepOpen = true;
        state.entryType = entry.entryType;
        state.speakerName = entry.speakerName;
        state.text = entry.text;
        state.pages = [state.text];
        state.pageIndex = 0;
        state.activeSide = entry.activeSide;
        updatePictureActiveSideForEntry(entry);
        lockAdvanceInput(settings.inputRepeatDelay);
        state.needsTextRefresh = true;
        state.needsPictureRefresh = true;
        return true;
    };

    FullscreenDialogue.changeText = function(args) {
        if (!state.active) {
            return;
        }
        const latestEntry = state.history[state.history.length - 1] || {
            entryType: state.entryType
        };
        const requestedEntryType = choiceValue(
            args.entryType,
            changeEntryTypes,
            "keep"
        );
        const entryType = requestedEntryType === "keep" ?
            entryTypeOf(latestEntry) : requestedEntryType;
        const entry = makeHistoryEntry(args, entryType);
        state.entryType = entry.entryType;
        state.speakerName = entry.speakerName;
        state.text = entry.text;
        state.pages = [state.text];
        state.pageIndex = 0;
        state.activeSide = entry.activeSide;
        updatePictureActiveSideForEntry(entry);
        if (state.history.length > 0) {
            state.history[state.history.length - 1] = entry;
        } else {
            state.history.push(entry);
        }
        lockAdvanceInput(settings.inputRepeatDelay);
        state.needsTextRefresh = true;
        state.needsPictureRefresh = true;
    };

    FullscreenDialogue.changePictures = function(args) {
        if (!state.active) {
            return;
        }
        state.leftPicture = pictureArg(args.leftPicture);
        state.rightPicture = pictureArg(args.rightPicture);
        state.activeSide = normalizeActiveSide(args.activeSide);
        updatePictureActiveSideForEntry({
            entryType: state.entryType,
            activeSide: state.activeSide
        });
        state.rightMirror = boolArg(args.rightMirror, false);
        state.needsPictureRefresh = true;
    };

    FullscreenDialogue.changeActiveSide = function(args) {
        if (!state.active) {
            return;
        }
        state.activeSide = normalizeActiveSide(args.activeSide);
        if (state.history.length > 0) {
            state.history[state.history.length - 1].activeSide =
                state.activeSide;
        }
        updatePictureActiveSideForEntry({
            entryType: state.entryType,
            activeSide: state.activeSide
        });
        state.needsPictureRefresh = true;
    };

    FullscreenDialogue.setPicturePosition = function(args) {
        const side = String(args.side || "left");
        if (!["left", "right"].includes(side)) {
            return;
        }
        const currentPosition = state.positions[side];
        const x = Number(args.x);
        const y = Number(args.y);
        const scale = Number(args.scale);
        state.positions[side] = {
            x: Number.isFinite(x) ? x : currentPosition.x,
            y: Number.isFinite(y) ? y : currentPosition.y,
            scale: Number.isFinite(scale) ? Math.max(1, scale) :
                currentPosition.scale
        };
        state.needsPictureRefresh = true;
    };

    FullscreenDialogue.end = function() {
        stopDirectKeyListener();
        state.active = false;
        state.keepOpen = false;
        state.displayMode = settings.displayMode;
        state.overlayHistoryMode = settings.overlayHistoryMode;
        state.entryType = "dialogue";
        state.speakerName = "";
        state.text = "";
        state.history.length = 0;
        state.pages = [""];
        state.pageIndex = 0;
        state.leftPicture = "";
        state.rightPicture = "";
        state.activeSide = "none";
        state.pictureActiveSide = "none";
        state.rightMirror = false;
        state.positions = defaultPicturePositions();
        state.waitingAdvanceId = 0;
        state.inputLockFrames = 0;
        state.rawGamepadOkPressed = false;
        invalidateLayoutCache();
        if (currentLayer &&
            typeof currentLayer.resetDialogueHistoryState === "function") {
            currentLayer.resetDialogueHistoryState();
        }
        requestRefresh();
    };

    FullscreenDialogue.requestAdvanceWait = function() {
        if (!state.active || !state.keepOpen) {
            return 0;
        }
        nextAdvanceId++;
        state.waitingAdvanceId = nextAdvanceId;
        return state.waitingAdvanceId;
    };

    FullscreenDialogue.isWaitingForAdvance = function(advanceId) {
        return state.active && Number(advanceId) > 0 &&
            state.waitingAdvanceId === Number(advanceId);
    };

    FullscreenDialogue.setPages = function(pages) {
        state.pages = pages.length > 0 ? pages : [""];
        state.pageIndex = clamp(state.pageIndex, 0, state.pages.length - 1);
    };

    FullscreenDialogue.currentPageText = function() {
        return state.pages[state.pageIndex] || "";
    };

    FullscreenDialogue.advance = function() {
        if (!state.active) {
            return;
        }
        if (state.keepOpen) {
            if (state.waitingAdvanceId > 0) {
                state.waitingAdvanceId = 0;
                lockAdvanceInput(settings.inputRepeatDelay);
            }
            return;
        }
        if (state.pageIndex + 1 < state.pages.length) {
            state.pageIndex++;
            state.needsTextRefresh = true;
            lockAdvanceInput(settings.inputRepeatDelay);
        } else {
            this.end();
        }
    };

    FullscreenDialogue.updateInput = function() {
        if (!state.active) {
            return;
        }
        const rawGamepadTriggered = pollRawGamepadOk();
        if (state.inputLockFrames > 0) {
            state.inputLockFrames--;
            state.directKeyTriggered = false;
            return;
        }
        const standardTriggered = Input.isTriggered("ok");
        const touchTriggered = TouchInput.isTriggered();
        const directKeyTriggered = state.directKeyTriggered;
        state.directKeyTriggered = false;
        if (standardTriggered || touchTriggered || directKeyTriggered ||
            rawGamepadTriggered) {
            this.advance();
        }
    };

    class Window_ProjectRFullscreenDialogueText extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 0;
            this.backOpacity = 0;
            this.contentsOpacity = 255;
            this._lastPlacementKey = "";
            this._bodyY = 0;
            this._historyScrollY = 0;
            this._overlayHistoryScrollY = 0;
            this._overlayHistoryEntryCount = 0;
            this._overlayVisibleEntryStartIndex = 0;
            this._overlayLayouts = [];
            this._layoutMetrics = null;
            this.updatePlacement();
        }

        lineHeight() {
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            return ui.bodyFontSize + ui.lineGap;
        }

        resetFontSettings() {
            super.resetFontSettings();
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            this.contents.fontSize = ui.bodyFontSize;
            this.contents.textColor = "#ffffff";
            this.contents.outlineColor = "rgba(0, 0, 0, 0.9)";
            this.contents.outlineWidth = ui.outlineWidth;
        }

        updatePlacement(metrics = layoutMetrics()) {
            const rect = metrics.textRect;
            const x = rect.x;
            const y = rect.y;
            const width = rect.width;
            const height = rect.height;
            const padding = metrics.ui.textPadding;
            const key = [x, y, width, height, padding].join(",");
            this._layoutMetrics = metrics;
            if (key !== this._lastPlacementKey) {
                this.move(x, y, width, height);
                if (this.padding !== padding) {
                    this.padding = padding;
                }
                this.createContents();
                this._lastPlacementKey = key;
                state.needsTextRefresh = true;
            }
        }

        refresh() {
            this.updatePlacement();
            this.contents.clear();
            if (!state.active) {
                this.resetOverlayHistoryLayout();
                return;
            }
            const showsOverlayHistory = state.displayMode === "overlayNovel" &&
                state.overlayHistoryMode === "stack" &&
                (state.keepOpen || state.history.length > 1);
            if (showsOverlayHistory) {
                this.drawOverlayHistory();
            } else if (state.displayMode === "overlayNovel") {
                this.resetOverlayHistoryLayout();
                this.resetOverlayBackdropBounds();
                this.drawPagedText();
            } else if (state.keepOpen || state.history.length > 1) {
                this.drawHistory();
            } else {
                this.drawPagedText();
            }
        }

        historyViewportHeight() {
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const bottomMargin = Math.min(
                ui.textHistoryBottomMargin,
                Math.max(0, this.innerHeight - 1)
            );
            return Math.max(1, this.innerHeight - bottomMargin);
        }

        resetOverlayHistoryLayout() {
            this._overlayHistoryScrollY = 0;
            this._overlayHistoryEntryCount = 0;
            this._overlayVisibleEntryStartIndex = 0;
            this._overlayLayouts = [];
        }

        resetOverlayBackdropBounds() {
            const layer = this.parent;
            if (layer &&
                typeof layer.resetOverlayTextContentBounds === "function") {
                layer.resetOverlayTextContentBounds();
            }
        }

        drawOverlayHistory() {
            const maxWidth = Math.max(1, this.innerWidth);
            const viewportHeight = this.historyViewportHeight();
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const spacing = ui.overlayHistoryEntrySpacing;
            const maximumEntries = settings.overlayMaxVisibleEntries;
            const firstIndex = maximumEntries > 0 ?
                Math.max(0, state.history.length - maximumEntries) : 0;
            const entries = state.history.slice(firstIndex);
            const layouts = entries.map((entry, index) => {
                return Object.assign(
                    this.makeOverlayHistoryEntryLayout(
                        entry,
                        maxWidth,
                        index > 0
                    ),
                    {
                        historyIndex: firstIndex + index
                    }
                );
            });
            const entriesHeight = layouts.reduce((sum, layout) => {
                return sum + layout.height;
            }, 0);
            const spacingHeight = Math.max(0, layouts.length - 1) * spacing;
            const totalHeight = entriesHeight + spacingHeight;
            this._overlayHistoryScrollY = Math.max(
                0,
                totalHeight - viewportHeight
            );
            this._overlayHistoryEntryCount = state.history.length;
            this._overlayVisibleEntryStartIndex = firstIndex;

            const alignsToBottom = settings.overlayTextPosition === "bottom" &&
                totalHeight < viewportHeight;
            let y = alignsToBottom ?
                viewportHeight - totalHeight : -this._overlayHistoryScrollY;
            let visibleTop = viewportHeight;
            let visibleBottom = 0;
            this.resetFontSettings();
            this._overlayLayouts = layouts.map(layout => {
                const positionedLayout = Object.assign({}, layout, { y });
                const entryBottom = y + layout.height;
                if (entryBottom > 0 && y < viewportHeight) {
                    this.drawOverlayHistoryEntry(
                        positionedLayout,
                        maxWidth
                    );
                    visibleTop = Math.min(visibleTop, Math.max(0, y));
                    visibleBottom = Math.max(
                        visibleBottom,
                        Math.min(viewportHeight, entryBottom)
                    );
                }
                y += layout.height + spacing;
                return positionedLayout;
            });

            // 表示中の履歴だけを覆う高さへ補助背景を合わせます。
            const layer = this.parent;
            if (layer &&
                typeof layer.setOverlayTextContentBounds === "function") {
                layer.setOverlayTextContentBounds(
                    Math.min(visibleTop, visibleBottom),
                    Math.max(visibleTop, visibleBottom)
                );
            }
        }

        makeOverlayHistoryEntryLayout(entry, maxWidth, hasPreviousEntry) {
            if (isSceneDescriptionEntry(entry)) {
                return this.makeSceneDescriptionEntryLayout(
                    entry,
                    maxWidth,
                    hasPreviousEntry
                );
            }
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const hasName = Boolean(entry.speakerName.trim());
            const hasBody = Boolean(entry.text) || !hasName;
            const nameText = hasName ? this.wrapText(
                entry.speakerName,
                maxWidth,
                ui.nameFontSize
            ) : "";
            const bodyText = hasBody ? this.wrapText(
                entry.text,
                maxWidth,
                ui.bodyFontSize
            ) : "";
            const nameHeight = hasName ?
                this.overlayLayoutTextHeight(nameText) : 0;
            const bodyHeight = hasBody ?
                this.overlayLayoutTextHeight(bodyText) : 0;
            const bodyY = hasName && hasBody ?
                nameHeight + ui.speakerBodyGap : 0;
            return {
                entryType: "dialogue",
                nameText,
                bodyText,
                hasName,
                hasBody,
                bodyY,
                height: Math.max(1, hasBody ? bodyY + bodyHeight : nameHeight)
            };
        }

        makeSceneDescriptionEntryLayout(
            entry,
            maxWidth,
            hasPreviousEntry
        ) {
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const label = settings.sceneDescriptionLabelEnabled ?
                textArg(settings.sceneDescriptionLabel) : "";
            const hasLabel = Boolean(label.trim());
            const hasBody = Boolean(entry.text) || !hasLabel;
            const colorIndex = settings.sceneDescriptionTextColor;
            const labelText = hasLabel ? this.wrapText(
                label,
                maxWidth,
                ui.sceneDescriptionLabelFontSize,
                colorIndex
            ) : "";
            const bodyText = hasBody ? this.wrapText(
                entry.text,
                maxWidth,
                ui.sceneDescriptionFontSize,
                colorIndex
            ) : "";
            const labelHeight = hasLabel ?
                this.overlayLayoutTextHeight(labelText) : 0;
            const bodyHeight = hasBody ?
                this.overlayLayoutTextHeight(bodyText) : 0;
            const topSpacing = hasPreviousEntry ?
                ui.sceneDescriptionTopSpacing : 0;
            const labelY = topSpacing;
            const bodyY = topSpacing + (hasLabel ?
                labelHeight + ui.speakerBodyGap : 0);
            const contentBottom = hasBody ?
                bodyY + bodyHeight : labelY + labelHeight;
            return {
                entryType: "sceneDescription",
                labelText,
                bodyText,
                hasLabel,
                hasBody,
                labelY,
                bodyY,
                alignment: settings.sceneDescriptionAlignment,
                opacity: settings.sceneDescriptionOpacity,
                height: Math.max(
                    1,
                    contentBottom + ui.sceneDescriptionBottomSpacing
                )
            };
        }

        overlayLayoutTextHeight(text) {
            return Math.max(1, String(text || "").split("\n").reduce(
                (total, line) => {
                    return total + this.overlayLayoutLineHeight(line);
                },
                0
            ));
        }

        overlayLayoutLineHeight(line) {
            const measuredHeight = Math.max(
                1,
                this.safeTextSize(line).height
            );
            if (!/\\I\[\d+\]/i.test(line)) {
                return measuredHeight;
            }
            const iconHeight = Math.max(
                Number(ImageManager.standardIconHeight) || 0,
                Number(ImageManager.iconHeight) || 0,
                32
            ) + 4;
            return Math.max(measuredHeight, iconHeight);
        }

        drawOverlayHistoryEntry(layout, maxWidth) {
            if (layout.entryType === "sceneDescription") {
                this.drawSceneDescriptionEntry(layout, maxWidth);
                return;
            }
            if (layout.hasName) {
                this.drawTextEx(layout.nameText, 0, layout.y, maxWidth);
            }
            if (layout.hasBody) {
                this.drawTextEx(
                    layout.bodyText,
                    0,
                    layout.y + layout.bodyY,
                    maxWidth
                );
            }
        }

        drawSceneDescriptionEntry(layout, maxWidth) {
            const y = Number(layout.y) || 0;
            if (layout.hasLabel) {
                this.drawSceneDescriptionText(
                    layout.labelText,
                    y + layout.labelY,
                    maxWidth,
                    layout.alignment,
                    layout.opacity
                );
            }
            if (layout.hasBody) {
                this.drawSceneDescriptionText(
                    layout.bodyText,
                    y + layout.bodyY,
                    maxWidth,
                    layout.alignment,
                    layout.opacity
                );
            }
        }

        drawSceneDescriptionText(text, y, maxWidth, alignment, opacity) {
            const previousOpacity = this.contents.paintOpacity;
            this.contents.paintOpacity = opacity;
            try {
                let lineY = y;
                for (const line of String(text || "").split("\n")) {
                    const lineWidth = Math.min(
                        maxWidth,
                        Math.max(0, this.safeTextWidth(line))
                    );
                    const x = alignment === "center" ?
                        Math.round((maxWidth - lineWidth) / 2) : 0;
                    this.drawTextEx(
                        line,
                        x,
                        lineY,
                        Math.max(1, maxWidth - x)
                    );
                    lineY += this.overlayLayoutLineHeight(line);
                }
            } finally {
                this.contents.paintOpacity = previousOpacity;
            }
        }

        drawPagedText() {
            if (state.entryType === "sceneDescription") {
                this.drawSceneDescriptionPagedText();
                return;
            }
            this._bodyY = 0;
            this.drawSpeakerName();
            FullscreenDialogue.setPages(this.makePages(state.text));
            this.resetFontSettings();
            this.drawTextEx(
                FullscreenDialogue.currentPageText(),
                0,
                this._bodyY,
                this.innerWidth
            );
        }

        drawSceneDescriptionPagedText() {
            const maxWidth = Math.max(1, this.innerWidth);
            const viewportHeight = this.historyViewportHeight();
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const layout = this.makeSceneDescriptionEntryLayout(
                {
                    entryType: "sceneDescription",
                    text: state.text
                },
                maxWidth,
                false
            );
            this._bodyY = layout.bodyY;
            if (layout.hasLabel) {
                this.drawSceneDescriptionText(
                    layout.labelText,
                    layout.labelY,
                    maxWidth,
                    layout.alignment,
                    layout.opacity
                );
            }
            const maxBodyHeight = Math.max(
                1,
                viewportHeight - layout.bodyY -
                    ui.sceneDescriptionBottomSpacing
            );
            FullscreenDialogue.setPages(
                this.makeSceneDescriptionPages(
                    state.text,
                    maxWidth,
                    maxBodyHeight
                )
            );
            if (layout.hasBody) {
                this.drawSceneDescriptionText(
                    FullscreenDialogue.currentPageText(),
                    layout.bodyY,
                    maxWidth,
                    layout.alignment,
                    layout.opacity
                );
            }
        }

        makeSceneDescriptionPages(text, maxWidth, maxHeight) {
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const wrappedText = this.wrapText(
                text,
                maxWidth,
                ui.sceneDescriptionFontSize,
                settings.sceneDescriptionTextColor
            );
            const lines = wrappedText.split("\n");
            const pages = [];
            let pageLines = [];

            for (const line of lines) {
                const candidateLines = pageLines.concat(line);
                const candidateText = candidateLines.join("\n");
                const candidateHeight = this.overlayLayoutTextHeight(
                    candidateText
                );
                if (pageLines.length > 0 && candidateHeight > maxHeight) {
                    pages.push(pageLines.join("\n"));
                    pageLines = [line];
                } else {
                    pageLines = candidateLines;
                }
            }
            if (pageLines.length > 0 || pages.length === 0) {
                pages.push(pageLines.join("\n"));
            }
            return pages;
        }

        drawSpeakerName() {
            const speakerName = state.speakerName.trim();
            if (!speakerName) {
                this._bodyY = 0;
                return;
            }
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const nameText = this.wrapText(
                speakerName,
                this.innerWidth,
                ui.nameFontSize
            );
            const nameHeight = this.safeTextSize(nameText).height;
            this.drawTextEx(nameText, 0, 0, this.innerWidth);
            this._bodyY = Math.min(
                this.historyViewportHeight() - 1,
                Math.max(0, nameHeight + ui.speakerBodyGap)
            );
        }

        makePages(text) {
            const maxWidth = Math.max(1, this.innerWidth);
            const maxHeight = Math.max(
                1,
                this.historyViewportHeight() - this._bodyY
            );
            const wrappedText = this.wrapText(
                text,
                maxWidth,
                (this._layoutMetrics || layoutMetrics()).ui.bodyFontSize
            );
            const lines = wrappedText.split("\n");
            const pages = [];
            let pageLines = [];

            for (const line of lines) {
                const candidateLines = pageLines.concat(line);
                const candidateText = candidateLines.join("\n");
                const candidateHeight = this.safeTextSize(candidateText).height;
                if (pageLines.length > 0 && candidateHeight > maxHeight) {
                    pages.push(pageLines.join("\n"));
                    pageLines = [line];
                } else {
                    pageLines = candidateLines;
                }
            }
            if (pageLines.length > 0 || pages.length === 0) {
                pages.push(pageLines.join("\n"));
            }
            return pages;
        }

        drawHistory() {
            const maxWidth = Math.max(1, this.innerWidth);
            const viewportHeight = this.historyViewportHeight();
            const spacing = (this._layoutMetrics || layoutMetrics()).ui
                .historyEntrySpacing;
            const layouts = state.history.map((entry, index) => {
                if (isSceneDescriptionEntry(entry)) {
                    return this.makeSceneDescriptionEntryLayout(
                        entry,
                        maxWidth,
                        index > 0
                    );
                }
                const displayText = this.makeHistoryEntryText(entry, maxWidth);
                return {
                    entryType: "dialogue",
                    displayText,
                    height: Math.max(1, this.safeTextSize(displayText).height)
                };
            });
            const entriesHeight = layouts.reduce((sum, layout) => {
                return sum + layout.height;
            }, 0);
            const spacingHeight = Math.max(0, layouts.length - 1) * spacing;
            const totalHeight = entriesHeight + spacingHeight;
            // 履歴自体は消さず、最新発言の下端が見える位置まで上へ送ります。
            this._historyScrollY = Math.max(0, totalHeight - viewportHeight);

            let y = -this._historyScrollY;
            for (const layout of layouts) {
                if (y + layout.height > 0 && y < viewportHeight) {
                    if (layout.entryType === "sceneDescription") {
                        this.drawSceneDescriptionEntry(
                            Object.assign({}, layout, { y }),
                            maxWidth
                        );
                    } else {
                        this.drawTextEx(layout.displayText, 0, y, maxWidth);
                    }
                }
                y += layout.height + spacing;
            }
        }

        makeHistoryEntryText(entry, maxWidth) {
            const ui = (this._layoutMetrics || layoutMetrics()).ui;
            const sections = [];
            if (entry.speakerName.trim()) {
                sections.push(this.wrapText(
                    entry.speakerName,
                    maxWidth,
                    ui.nameFontSize
                ));
            }
            if (entry.text || sections.length === 0) {
                sections.push(this.wrapText(
                    entry.text,
                    maxWidth,
                    ui.bodyFontSize
                ));
            }
            return sections.join("\n");
        }

        wrapText(text, maxWidth, initialFontSize, initialColorIndex = 0) {
            const tokens = this.tokenizeText(String(text || ""));
            const style = {
                fontSize: initialFontSize,
                colorIndex: initialColorIndex
            };
            const lines = [];
            const stylePrefix = () => {
                return `\\FS[${style.fontSize}]\\C[${style.colorIndex}]`;
            };
            let line = stylePrefix();
            let lineHasVisibleText = false;

            const pushLine = () => {
                lines.push(line);
                line = stylePrefix();
                lineHasVisibleText = false;
            };

            for (const token of tokens) {
                if (token === "\n") {
                    pushLine();
                    continue;
                }
                const hasWidth = this.tokenHasVisibleWidth(token);
                if (hasWidth && lineHasVisibleText &&
                    this.safeTextWidth(line + token) > maxWidth) {
                    pushLine();
                }
                line += token;
                this.updateWrapStyle(style, token);
                if (hasWidth) {
                    lineHasVisibleText = true;
                }
            }
            lines.push(line);
            return lines.join("\n");
        }

        tokenHasVisibleWidth(token) {
            if (!token.startsWith("\\")) {
                return true;
            }
            if (/^\\(?:C|FS|PX|PY)\[/i.test(token)) {
                return false;
            }
            return token !== "\\{" && token !== "\\}";
        }

        updateWrapStyle(style, token) {
            const uiScale = (this._layoutMetrics || layoutMetrics()).uiScale;
            const maximumFontSize = Math.max(96, Math.round(96 * uiScale));
            const colorMatch = /^\\C\[(\d+)\]$/i.exec(token);
            const fontMatch = /^\\FS\[(\d+)\]$/i.exec(token);
            if (colorMatch) {
                style.colorIndex = Number(colorMatch[1]);
            } else if (fontMatch) {
                style.fontSize = clamp(
                    Number(fontMatch[1]),
                    8,
                    maximumFontSize
                );
            } else if (token === "\\{") {
                style.fontSize = clamp(
                    style.fontSize + 12,
                    8,
                    maximumFontSize
                );
            } else if (token === "\\}") {
                style.fontSize = clamp(
                    style.fontSize - 12,
                    8,
                    maximumFontSize
                );
            }
        }

        tokenizeText(text) {
            const tokens = [];
            let index = 0;
            while (index < text.length) {
                const char = text[index];
                if (char === "\n") {
                    tokens.push("\n");
                    index++;
                    continue;
                }
                if (char === "\\") {
                    const escapeToken = this.readEscapeToken(text, index);
                    if (escapeToken) {
                        tokens.push(escapeToken);
                        index += escapeToken.length;
                        continue;
                    }
                }
                tokens.push(char);
                index++;
            }
            return tokens;
        }

        readEscapeToken(text, index) {
            const rest = text.slice(index);
            const match = /^\\(?:[A-Za-z]+(?:\[[^\]]*\])?|[{}\\])/.exec(rest);
            return match ? match[0] : "";
        }

        safeTextWidth(text) {
            if (!text) {
                return 0;
            }
            try {
                return this.textSizeEx(text).width;
            } catch (error) {
                return this.textWidth(text.replace(/\\[A-Za-z{}\\]+/g, ""));
            }
        }

        safeTextSize(text) {
            try {
                return this.textSizeEx(text);
            } catch (error) {
                return {
                    width: this.safeTextWidth(text),
                    height: this.lineHeight()
                };
            }
        }
    }

    class Sprite_ProjectRFullscreenDialogueLayer extends Sprite {
        initialize() {
            super.initialize();
            this.visible = false;
            this._lastSizeKey = "";
            this.createPictures();
            this.createTextPanel();
            this.createOverlayTextBackdrop();
            this.createTextWindow();
        }

        createPictures() {
            this._leftPictureSprite = this.createPictureSprite();
            this._rightPictureSprite = this.createPictureSprite();
            this.addChild(this._leftPictureSprite);
            this.addChild(this._rightPictureSprite);
        }

        createTextPanel() {
            const bitmap = new Bitmap(1, 1);
            bitmap.fillAll("black");
            this._textPanelSprite = new Sprite(bitmap);
            this._textPanelSprite.anchor.set(0, 0);
            this._textPanelSprite.opacity = settings.textPanelOpacity;
            this.addChild(this._textPanelSprite);
        }

        createOverlayTextBackdrop() {
            let bitmap;
            if (settings.overlayTextBackdropStyle === "gradient") {
                bitmap = new Bitmap(1, 256);
                bitmap.gradientFillRect(
                    0, 0, 1, 128,
                    "rgba(0, 0, 0, 0)",
                    "rgba(0, 0, 0, 1)",
                    true
                );
                bitmap.gradientFillRect(
                    0, 128, 1, 128,
                    "rgba(0, 0, 0, 1)",
                    "rgba(0, 0, 0, 0)",
                    true
                );
            } else {
                bitmap = new Bitmap(1, 1);
                bitmap.fillAll("black");
            }
            this._overlayTextBackdropSprite = new Sprite(bitmap);
            this._overlayTextBackdropSprite.anchor.set(0, 0);
            this._overlayTextBackdropSprite.visible = false;
            this._overlayTextBackdropSprite.opacity =
                settings.overlayTextBackdropOpacity;
            this.addChild(this._overlayTextBackdropSprite);
        }

        createPictureSprite() {
            const sprite = new Sprite();
            sprite.visible = false;
            sprite.opacity = 0;
            sprite._projectRTargetOpacity = 0;
            sprite._projectRFadeStartOpacity = 0;
            sprite._projectRFadeFrames = 0;
            sprite._projectRFadeDuration = 0;
            return sprite;
        }

        createTextWindow() {
            this._textWindow = new Window_ProjectRFullscreenDialogueText(
                new Rectangle(0, 0, 1, 1)
            );
            this.addChild(this._textWindow);
        }

        update() {
            super.update();
            this.visible = state.active;
            this.updatePlacement();
            this.updatePictureFade(this._leftPictureSprite);
            this.updatePictureFade(this._rightPictureSprite);
            if (state.needsPictureRefresh) {
                this.refreshPictures();
                state.needsPictureRefresh = false;
            }
            if (state.needsTextRefresh) {
                this._textWindow.refresh();
                state.needsTextRefresh = false;
            }
        }

        updatePlacement() {
            const metrics = layoutMetrics();
            const rect = metrics.textRect;
            const key = [metrics.key, rect.x, rect.width].join(",");
            if (key === this._lastSizeKey) {
                return;
            }
            this._lastSizeKey = key;
            this.updateTextBackgrounds(metrics);
            this._textWindow.updatePlacement(metrics);
            state.needsPictureRefresh = true;
            state.needsTextRefresh = true;
        }

        updateTextBackgrounds(metrics) {
            const rect = metrics.textRect;
            this._textPanelSprite.x = rect.x;
            this._textPanelSprite.y = rect.y;
            this._textPanelSprite.scale.set(rect.width, rect.height);
            this._textPanelSprite.opacity = settings.textPanelOpacity;
            this._textPanelSprite.visible =
                metrics.displayMode === "historyPanel";

            this.applyOverlayBackdropRect(metrics.backdropRect);
            this.updateOverlayBackdropVisibility(metrics);
        }

        applyOverlayBackdropRect(backdrop) {
            const backdropSprite = this._overlayTextBackdropSprite;
            const bitmap = backdropSprite.bitmap;
            backdropSprite.x = backdrop.x;
            backdropSprite.y = backdrop.y;
            backdropSprite.scale.set(
                backdrop.width / Math.max(1, bitmap.width),
                backdrop.height / Math.max(1, bitmap.height)
            );
            backdropSprite.opacity = settings.overlayTextBackdropOpacity;
        }

        updateOverlayBackdropVisibility(metrics) {
            this._overlayTextBackdropSprite.visible = state.active &&
                metrics.displayMode === "overlayNovel" &&
                settings.overlayTextBackdropEnabled &&
                settings.overlayTextBackdropStyle !== "none";
        }

        setOverlayTextContentBounds(contentTop, contentBottom) {
            const metrics = layoutMetrics();
            if (metrics.displayMode !== "overlayNovel") {
                return;
            }
            const textWindow = this._textWindow;
            const viewportHeight = textWindow.historyViewportHeight();
            const top = clamp(Number(contentTop) || 0, 0, viewportHeight);
            const bottom = clamp(
                Number(contentBottom) || top,
                top,
                viewportHeight
            );
            const padding = metrics.ui.overlayBackdropPadding;
            const backdropTop = Math.max(
                0,
                textWindow.y + textWindow.padding + top - padding
            );
            const backdropBottom = Math.min(
                metrics.height,
                textWindow.y + textWindow.padding + bottom + padding
            );
            this.applyOverlayBackdropRect({
                x: metrics.backdropRect.x,
                y: backdropTop,
                width: metrics.backdropRect.width,
                height: Math.max(1, backdropBottom - backdropTop)
            });
            this.updateOverlayBackdropVisibility(metrics);
        }

        resetOverlayTextContentBounds() {
            const metrics = layoutMetrics();
            this.applyOverlayBackdropRect(metrics.backdropRect);
            this.updateOverlayBackdropVisibility(metrics);
        }

        resetDialogueHistoryState() {
            this._textWindow.resetOverlayHistoryLayout();
            this._overlayTextBackdropSprite.visible = false;
            this._overlayTextBackdropSprite.scale.set(1, 1);
        }

        refreshPictures() {
            this.refreshPicture(
                this._leftPictureSprite,
                state.leftPicture,
                "left"
            );
            this.refreshPicture(
                this._rightPictureSprite,
                state.rightPicture,
                "right"
            );
            this.applyActiveSide();
        }

        refreshPicture(sprite, pictureName, side) {
            if (!pictureName) {
                sprite._projectRPictureName = "";
                sprite.bitmap = null;
                sprite.visible = false;
                this.setPictureOpacity(sprite, 0);
                return;
            }
            if (sprite._projectRPictureName !== pictureName) {
                sprite._projectRPictureName = pictureName;
                sprite.bitmap = ImageManager.loadPicture(pictureName);
                sprite.visible = true;
                sprite.bitmap.addLoadListener(() => {
                    this.applyPictureLayout(sprite, side);
                });
            }
            this.applyPictureLayout(sprite, side);
        }

        applyPictureLayout(sprite, side) {
            const bitmap = sprite.bitmap;
            if (!bitmap || !bitmap.isReady() || bitmap.width <= 0) {
                return;
            }

            const metrics = layoutMetrics();
            if (metrics.displayMode === "overlayNovel") {
                this.applyOverlayPictureLayout(sprite, side, metrics, bitmap);
                return;
            }
            const ui = metrics.ui;
            const position = state.positions[side];
            const baseScale = Math.max(0.01, position.scale / 100);
            const offsetX = Math.round(position.x * metrics.uiScale);
            const offsetY = Math.round(position.y * metrics.uiScale);
            const desiredBottomY = metrics.height - ui.portraitBottomMargin +
                offsetY;
            const bottomY = clamp(
                desiredBottomY,
                Math.min(metrics.height, metrics.portraitTop + 1),
                metrics.height
            );
            const rightEdgeX = clamp(
                metrics.width + offsetX,
                1,
                metrics.width
            );
            const anchorX = side === "right" && !state.rightMirror ? 1 : 0;
            const baseX = side === "right" ? rightEdgeX : clamp(
                offsetX,
                0,
                Math.max(0, metrics.width - 1)
            );
            const halfGap = Math.round(ui.textPortraitGap / 2);
            const leftCenterLimit = Math.max(
                baseX + 1,
                Math.floor(metrics.width / 2) - halfGap
            );
            const rightCenterLimit = Math.min(
                rightEdgeX - 1,
                Math.ceil(metrics.width / 2) + halfGap
            );
            const availableWidth = side === "right" ?
                Math.max(1, rightEdgeX - rightCenterLimit) :
                Math.max(1, leftCenterLimit - baseX);
            // 指定倍率が大きくても、上部テキスト領域へ入らない倍率を上限にします。
            const availableHeight = settings.preventPortraitTextOverlap ?
                Math.max(1, bottomY - metrics.portraitTop) :
                Math.max(1, bottomY);
            const fitScale = Math.min(
                baseScale,
                availableWidth / bitmap.width,
                availableHeight / bitmap.height
            );
            const scaleX = side === "right" && state.rightMirror ?
                -fitScale : fitScale;

            sprite.anchor.set(anchorX, 1);
            sprite.x = baseX;
            sprite.y = bottomY;
            sprite.scale.set(scaleX, fitScale);
            sprite.visible = state.active;
        }

        applyOverlayPictureLayout(sprite, side, metrics, bitmap) {
            const ui = metrics.ui;
            const position = state.positions[side];
            const baseScale = Math.max(0.01, position.scale / 100);
            const desiredScale = baseScale *
                settings.overlayPortraitScaleBoost * metrics.uiScale;
            const offsetX = Math.round(position.x * metrics.uiScale);
            const offsetY = Math.round(position.y * metrics.uiScale);
            const bottomY = clamp(
                metrics.height - ui.overlayPortraitBottomMargin + offsetY,
                1,
                metrics.height
            );
            const desiredX = side === "right" ?
                metrics.width - ui.overlayPortraitSideMargin + offsetX :
                ui.overlayPortraitSideMargin + offsetX;
            const baseX = side === "right" ?
                clamp(desiredX, 1, metrics.width) :
                clamp(desiredX, 0, Math.max(0, metrics.width - 1));
            const otherSide = side === "left" ? "right" : "left";
            const hasOtherPicture = Boolean(state[`${otherSide}Picture`]);
            const widthRate = hasOtherPicture ? 0.56 : 0.9;
            const sideAvailableWidth = side === "right" ?
                baseX : metrics.width - baseX;
            const availableWidth = Math.max(
                1,
                Math.min(metrics.width * widthRate, sideAvailableWidth)
            );
            const availableHeight = Math.max(
                1,
                Math.min(
                    metrics.height * settings.overlayPortraitMaxHeightRate,
                    bottomY
                )
            );
            // ユーザー指定倍率を拡大してから、画面内に収まる倍率へ制限します。
            const fitScale = Math.min(
                desiredScale,
                availableWidth / bitmap.width,
                availableHeight / bitmap.height
            );
            const anchorX = side === "right" && !state.rightMirror ? 1 : 0;
            const scaleX = side === "right" && state.rightMirror ?
                -fitScale : fitScale;

            sprite.anchor.set(anchorX, 1);
            sprite.x = baseX;
            sprite.y = bottomY;
            sprite.scale.set(scaleX, fitScale);
            sprite.visible = state.active;
        }

        applyActiveSide() {
            const leftTarget = this.targetOpacityForSide("left");
            const rightTarget = this.targetOpacityForSide("right");
            this.setPictureOpacity(this._leftPictureSprite, leftTarget);
            this.setPictureOpacity(this._rightPictureSprite, rightTarget);
        }

        targetOpacityForSide(side) {
            if (!state[`${side}Picture`]) {
                return 0;
            }
            if (state.pictureActiveSide === "both") {
                return 255;
            }
            if (state.pictureActiveSide === "none") {
                return settings.inactivePictureOpacity;
            }
            return state.pictureActiveSide === side ?
                255 : settings.inactivePictureOpacity;
        }

        setPictureOpacity(sprite, targetOpacity) {
            const target = clamp(targetOpacity, 0, 255);
            if (sprite._projectRTargetOpacity === target) {
                return;
            }
            sprite._projectRFadeStartOpacity = sprite.opacity;
            sprite._projectRTargetOpacity = target;
            sprite._projectRFadeDuration = settings.pictureFadeFrames;
            sprite._projectRFadeFrames = settings.pictureFadeFrames;
            if (settings.pictureFadeFrames <= 0) {
                sprite.opacity = target;
            }
        }

        updatePictureFade(sprite) {
            if (sprite._projectRFadeFrames <= 0) {
                return;
            }
            sprite._projectRFadeFrames--;
            const duration = Math.max(1, sprite._projectRFadeDuration);
            const progress = 1 - sprite._projectRFadeFrames / duration;
            const start = sprite._projectRFadeStartOpacity;
            const target = sprite._projectRTargetOpacity;
            sprite.opacity = Math.round(start + (target - start) * progress);
        }
    }

    PluginManager.registerCommand(pluginName, "StartDialogue", function(args) {
        const keepOpen = FullscreenDialogue.start(args);
        if (boolArg(args.waitForCompletion, true)) {
            if (keepOpen) {
                const advanceId = FullscreenDialogue.requestAdvanceWait();
                this._projectRFullscreenDialogueAdvanceId = advanceId;
                this.setWaitMode(advanceWaitModeName);
            } else {
                this.setWaitMode(completionWaitModeName);
            }
        }
    });

    PluginManager.registerCommand(pluginName, "AppendDialogue", function(args) {
        const appended = FullscreenDialogue.append(args);
        if (appended && boolArg(args.waitForAdvance, true)) {
            const advanceId = FullscreenDialogue.requestAdvanceWait();
            this._projectRFullscreenDialogueAdvanceId = advanceId;
            this.setWaitMode(advanceWaitModeName);
        }
    });

    PluginManager.registerCommand(pluginName, "ChangeText", function(args) {
        FullscreenDialogue.changeText(args);
    });

    PluginManager.registerCommand(pluginName, "ChangePictures", function(args) {
        FullscreenDialogue.changePictures(args);
    });

    PluginManager.registerCommand(pluginName, "ChangeActiveSide", function(args) {
        FullscreenDialogue.changeActiveSide(args);
    });

    PluginManager.registerCommand(pluginName, "EndDialogue", function() {
        FullscreenDialogue.end();
    });

    PluginManager.registerCommand(pluginName, "SetPicturePosition", function(args) {
        FullscreenDialogue.setPicturePosition(args);
    });

    const _Scene_Map_createDisplayObjects =
        Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        invalidateLayoutCache();
        this._projectRFullscreenDialogueBackground = new ScreenSprite();
        this._projectRFullscreenDialogueBackground.setBlack();
        this._projectRFullscreenDialogueBackground.opacity =
            settings.backOpacity;
        this._projectRFullscreenDialogueBackground.visible = false;
        this._projectRFullscreenDialogueBackground.x = 0;
        this._projectRFullscreenDialogueBackground.y = 0;
        this._projectRFullscreenDialogueBackground.scale.set(1, 1);
        this._projectRFullscreenDialogueBackground.mask = null;
        this.addChild(this._projectRFullscreenDialogueBackground);
        this._projectRFullscreenDialogueLayer =
            new Sprite_ProjectRFullscreenDialogueLayer();
        this.addChild(this._projectRFullscreenDialogueLayer);
        FullscreenDialogue.setLayer(this._projectRFullscreenDialogueLayer);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        FullscreenDialogue.updateInput();
        const background = this._projectRFullscreenDialogueBackground;
        if (background) {
            background.visible = FullscreenDialogue.isActive();
            background.opacity = state.displayMode === "overlayNovel" ?
                settings.overlayScreenDimOpacity : settings.backOpacity;
        }
    };

    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (FullscreenDialogue.isActive()) {
            $gameTemp.clearDestination();
            return;
        }
        _Scene_Map_processMapTouch.call(this);
    };

    const _Scene_Map_isMenuCalled = Scene_Map.prototype.isMenuCalled;
    Scene_Map.prototype.isMenuCalled = function() {
        if (FullscreenDialogue.isActive()) {
            return false;
        }
        return _Scene_Map_isMenuCalled.call(this);
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        FullscreenDialogue.clearLayer(this._projectRFullscreenDialogueLayer);
        FullscreenDialogue.end();
        _Scene_Map_terminate.call(this);
    };

    const _Game_Player_canMove = Game_Player.prototype.canMove;
    Game_Player.prototype.canMove = function() {
        if (FullscreenDialogue.isActive()) {
            return false;
        }
        return _Game_Player_canMove.call(this);
    };

    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        if (this.isTransferring()) {
            FullscreenDialogue.end();
        }
        _Game_Player_performTransfer.call(this);
    };

    const _Game_Temp_reserveCommonEvent =
        Game_Temp.prototype.reserveCommonEvent;
    Game_Temp.prototype.reserveCommonEvent = function(commonEventId) {
        if (FullscreenDialogue.isActive() && attackCommonEventId > 0 &&
            Number(commonEventId) === attackCommonEventId) {
            return;
        }
        _Game_Temp_reserveCommonEvent.call(this, commonEventId);
    };

    const _Game_Interpreter_updateWaitMode =
        Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === completionWaitModeName) {
            const waiting = FullscreenDialogue.isActive();
            if (!waiting) {
                this._waitMode = "";
            }
            return waiting;
        }
        if (this._waitMode === advanceWaitModeName) {
            const advanceId = this._projectRFullscreenDialogueAdvanceId;
            const waiting = FullscreenDialogue.isWaitingForAdvance(advanceId);
            if (!waiting) {
                this._waitMode = "";
                this._projectRFullscreenDialogueAdvanceId = 0;
            }
            return waiting;
        }
        return _Game_Interpreter_updateWaitMode.call(this);
    };

    const _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        FullscreenDialogue.end();
        _DataManager_setupNewGame.call(this);
        invalidateLayoutCache();
    };

    const _DataManager_extractSaveContents =
        DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        FullscreenDialogue.end();
        _DataManager_extractSaveContents.call(this, contents);
        invalidateLayoutCache();
    };
})();
