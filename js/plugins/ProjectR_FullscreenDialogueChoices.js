/*:
 * @target MZ
 * @plugindesc v1.0.0 全画面会話の上に金色に発光する専用選択肢を表示します。
 * @author ProjectR
 * @base ProjectR_FullscreenDialogue
 * @orderAfter ProjectR_FullscreenDialogue
 *
 * @param ChoiceGoldColor
 * @text 金色
 * @type string
 * @default #FFD76A
 *
 * @param ChoiceBrightGoldColor
 * @text 明るい金色
 * @type string
 * @default #FFF3B0
 *
 * @param ChoiceDarkGoldColor
 * @text 暗い金色
 * @type string
 * @default #9A6718
 *
 * @param ChoiceSelectedTextColor
 * @text 選択中の文字色
 * @type string
 * @default #FFF4C2
 *
 * @param ChoiceNormalTextColor
 * @text 通常の文字色
 * @type string
 * @default #FFFFFF
 *
 * @param ChoiceDisabledTextColor
 * @text 選択不可の文字色
 * @type string
 * @default #777777
 *
 * @param ChoiceBackgroundOpacity
 * @text 項目背景の透明度
 * @type number
 * @min 0
 * @max 255
 * @default 180
 *
 * @param ChoiceGlowOpacity
 * @text 発光の透明度
 * @type number
 * @min 0
 * @max 255
 * @default 180
 *
 * @param ChoiceGlowLayers
 * @text 発光枠の重なり数
 * @type number
 * @min 1
 * @max 5
 * @default 3
 *
 * @param ChoiceGlowPulseFrames
 * @text 発光の明滅時間
 * @desc 1回の明滅に使用するフレーム数です。
 * @type number
 * @min 1
 * @default 90
 *
 * @param ChoiceGlowPulseMinimum
 * @text 明滅の最小倍率
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 0.65
 *
 * @param ChoiceGlowPulseMaximum
 * @text 明滅の最大倍率
 * @type number
 * @decimals 2
 * @min 0
 * @max 1
 * @default 1.00
 *
 * @param ChoiceItemHeight
 * @text 選択肢1件の高さ
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 24
 * @default 56
 *
 * @param ChoiceItemSpacing
 * @text 選択肢同士の間隔
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 0
 * @default 10
 *
 * @param ChoiceFontSize
 * @text 選択肢の文字サイズ
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 8
 * @default 26
 *
 * @param ChoiceWindowWidth
 * @text 選択肢領域の幅
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 120
 * @default 680
 *
 * @param ChoiceWindowMaxHeightRate
 * @text 選択肢UIの最大高さ（％）
 * @desc 画面高さに対する最大割合です。
 * @type number
 * @min 20
 * @max 100
 * @default 80
 *
 * @param ChoiceWindowPosition
 * @text 横方向の表示位置
 * @type select
 * @option 左
 * @value left
 * @option 中央
 * @value center
 * @option 右
 * @value right
 * @default center
 *
 * @param ChoiceWindowYOffset
 * @text 上下位置の調整
 * @desc 正の値で下、負の値で上へ移動します。
 * @type number
 * @min -9999
 * @default 0
 *
 * @param ChoiceScreenDimOpacity
 * @text 選択中の追加暗転
 * @type number
 * @min 0
 * @max 255
 * @default 80
 *
 * @param ChoiceBlurFilterEnabled
 * @text BlurFilterを使用
 * @desc 通常はOFFを推奨します。OFFでも重ねた枠で発光します。
 * @type boolean
 * @on 使用する
 * @off 使用しない
 * @default false
 *
 * @param ChoiceHelpEnabled
 * @text 補足説明欄を使用
 * @type boolean
 * @on 使用する
 * @off 使用しない
 * @default true
 *
 * @param ChoiceHelpHeight
 * @text 補足説明欄の高さ
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 36
 * @default 100
 *
 * @param ChoiceHelpFontSize
 * @text 補足説明の文字サイズ
 * @desc 816x624を基準にした値です。
 * @type number
 * @min 8
 * @default 20
 *
 * @param ChoiceCursorSe
 * @text カーソル移動音
 * @type struct<ChoiceSe>
 * @default {"name":"","volume":"90","pitch":"100","pan":"0"}
 *
 * @param ChoiceConfirmSe
 * @text 決定音
 * @type struct<ChoiceSe>
 * @default {"name":"","volume":"90","pitch":"100","pan":"0"}
 *
 * @param ChoiceCancelSe
 * @text キャンセル音
 * @type struct<ChoiceSe>
 * @default {"name":"","volume":"90","pitch":"100","pan":"0"}
 *
 * @param ChoiceDisabledSe
 * @text 選択不可時の音
 * @type struct<ChoiceSe>
 * @default {"name":"","volume":"90","pitch":"100","pan":"0"}
 *
 * @command ShowDialogueChoices
 * @text 全画面会話用選択肢を表示
 * @desc 表示中の全画面会話を閉じず、その手前に専用選択肢を表示します。
 *
 * @arg choices
 * @text 選択肢
 * @type struct<ChoiceOption>[]
 * @default []
 *
 * @arg resultVariableId
 * @text 結果を保存する変数
 * @desc 0の場合は保存しません。
 * @type variable
 * @default 0
 *
 * @arg resultTextVariableId
 * @text 本文を保存する変数
 * @desc 自動番号を除いた選択肢本文を保存します。0の場合は保存しません。
 * @type variable
 * @default 0
 *
 * @arg cancelMode
 * @text キャンセル方法
 * @type select
 * @option キャンセル禁止
 * @value disabled
 * @option キャンセル値を返す
 * @value returnValue
 * @default disabled
 *
 * @arg cancelValue
 * @text キャンセル時の値
 * @type number
 * @min -99999999
 * @max 99999999
 * @default 0
 *
 * @arg defaultIndex
 * @text 最初に選ぶ位置
 * @desc 条件判定後に表示された一覧を1から数えます。
 * @type number
 * @min 1
 * @max 99
 * @default 1
 *
 * @arg numberingEnabled
 * @text 番号を自動表示
 * @type boolean
 * @on 表示する
 * @off 表示しない
 * @default true
 *
 * @arg numberDelimiter
 * @text 番号と本文の区切り
 * @type string
 * @default ：
 *
 * @arg columnCount
 * @text 列数
 * @type select
 * @option 1列
 * @value 1
 * @option 2列
 * @value 2
 * @default 1
 *
 * @arg visibleRows
 * @text 希望する最大表示行数
 * @desc 画面に収まらない場合は自動的に減ります。2列でも行数です。
 * @type number
 * @min 1
 * @max 99
 * @default 8
 *
 * @arg waitForSelection
 * @text 選択完了まで待つ
 * @type boolean
 * @on 待つ
 * @off 待たない
 * @default true
 *
 * @help
 * ProjectR_FullscreenDialogueChoices.js
 *
 * ProjectR_FullscreenDialogueの全画面会話を表示したまま、
 * 金色に発光する専用選択肢を手前へ表示します。
 *
 * プラグイン管理では必ず次の順番にしてください。
 * 1. ProjectR_FullscreenDialogue
 * 2. ProjectR_FullscreenDialogueChoices
 *
 * 選択結果は変数へ保存し、その直後の「条件分岐」で使用します。
 * このプラグインは標準の「選択肢の表示」を変更しません。
 */

/*~struct~ChoiceOption:
 * @param text
 * @text 選択肢本文
 * @type multiline_string
 * @default 選択肢
 *
 * @param resultValue
 * @text 選択結果の値
 * @desc 0の場合は、条件判定後の表示順（1始まり）を使用します。
 * @type number
 * @min -99999999
 * @max 99999999
 * @default 0
 *
 * @param helpText
 * @text 補足説明
 * @type multiline_string
 * @default
 *
 * @param iconIndex
 * @text アイコン番号
 * @type icon
 * @default 0
 *
 * @param visibleCondition
 * @text 表示条件
 * @type select
 * @option 常に表示
 * @value always
 * @option スイッチがON
 * @value switchOn
 * @option スイッチがOFF
 * @value switchOff
 * @option 変数を比較
 * @value variable
 * @default always
 *
 * @param visibleSwitchId
 * @text 表示条件のスイッチ
 * @type switch
 * @default 0
 *
 * @param visibleVariableId
 * @text 表示条件の変数
 * @type variable
 * @default 0
 *
 * @param visibleVariableOperator
 * @text 表示条件の比較方法
 * @type select
 * @option 等しい
 * @value equal
 * @option 等しくない
 * @value notEqual
 * @option より大きい
 * @value greater
 * @option 以上
 * @value greaterOrEqual
 * @option より小さい
 * @value less
 * @option 以下
 * @value lessOrEqual
 * @default equal
 *
 * @param visibleVariableValue
 * @text 表示条件の比較値
 * @type number
 * @min -99999999
 * @max 99999999
 * @default 0
 *
 * @param enabledCondition
 * @text 選択可能条件
 * @type select
 * @option 常に選択可能
 * @value always
 * @option スイッチがON
 * @value switchOn
 * @option スイッチがOFF
 * @value switchOff
 * @option 変数を比較
 * @value variable
 * @default always
 *
 * @param enabledSwitchId
 * @text 選択可能条件のスイッチ
 * @type switch
 * @default 0
 *
 * @param enabledVariableId
 * @text 選択可能条件の変数
 * @type variable
 * @default 0
 *
 * @param enabledVariableOperator
 * @text 選択可能条件の比較方法
 * @type select
 * @option 等しい
 * @value equal
 * @option 等しくない
 * @value notEqual
 * @option より大きい
 * @value greater
 * @option 以上
 * @value greaterOrEqual
 * @option より小さい
 * @value less
 * @option 以下
 * @value lessOrEqual
 * @default equal
 *
 * @param enabledVariableValue
 * @text 選択可能条件の比較値
 * @type number
 * @min -99999999
 * @max 99999999
 * @default 0
 */

/*~struct~ChoiceSe:
 * @param name
 * @text 効果音
 * @desc 空欄の場合はRPGツクールMZの標準音を使用します。
 * @type file
 * @dir audio/se/
 * @default
 *
 * @param volume
 * @text 音量
 * @type number
 * @min 0
 * @max 100
 * @default 90
 *
 * @param pitch
 * @text ピッチ
 * @type number
 * @min 50
 * @max 150
 * @default 100
 *
 * @param pan
 * @text 位相
 * @type number
 * @min -100
 * @max 100
 * @default 0
 */

(() => {
    "use strict";

    const pluginName = "ProjectR_FullscreenDialogueChoices";
    const waitModeName = "projectRFullscreenDialogueChoices";
    const parameters = PluginManager.parameters(pluginName);
    const dialogueParameters = PluginManager.parameters(
        "ProjectR_FullscreenDialogue"
    );
    const projectR = window.ProjectR = window.ProjectR || {};
    const FullscreenDialogue = projectR.FullscreenDialogue;

    const clamp = (value, minimum, maximum) => {
        return Math.max(minimum, Math.min(maximum, value));
    };

    const numberValue = (value, defaultValue, minimum, maximum) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return defaultValue;
        }
        return clamp(parsed, minimum, maximum);
    };

    const numberParam = (name, defaultValue, minimum, maximum) => {
        return numberValue(
            parameters[name],
            defaultValue,
            minimum,
            maximum
        );
    };

    const boolValue = (value, defaultValue = false) => {
        if (value === undefined || value === "") {
            return defaultValue;
        }
        return String(value).toLowerCase() === "true";
    };

    const stringParam = (name, defaultValue) => {
        return parameters[name] === undefined ?
            defaultValue : String(parameters[name]);
    };

    const choiceValue = (value, choices, defaultValue) => {
        const normalized = String(value || "");
        return choices.includes(normalized) ? normalized : defaultValue;
    };

    const parseJson = (value, fallback) => {
        if (typeof value !== "string") {
            return value === undefined ? fallback : value;
        }
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    };

    const normalizeHexColor = (value, defaultValue) => {
        const text = String(value || "").trim();
        return /^#[0-9a-f]{6}$/i.test(text) ? text : defaultValue;
    };

    const colorWithAlpha = (color, alpha) => {
        const normalized = normalizeHexColor(color, "#FFFFFF");
        const red = Number.parseInt(normalized.slice(1, 3), 16);
        const green = Number.parseInt(normalized.slice(3, 5), 16);
        const blue = Number.parseInt(normalized.slice(5, 7), 16);
        return `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`;
    };

    const parseSe = name => {
        const data = parseJson(parameters[name], {}) || {};
        return {
            name: String(data.name || "").trim(),
            volume: Math.round(numberValue(data.volume, 90, 0, 100)),
            pitch: Math.round(numberValue(data.pitch, 100, 50, 150)),
            pan: Math.round(numberValue(data.pan, 0, -100, 100))
        };
    };

    const settings = {
        goldColor: normalizeHexColor(
            stringParam("ChoiceGoldColor", "#FFD76A"),
            "#FFD76A"
        ),
        brightGoldColor: normalizeHexColor(
            stringParam("ChoiceBrightGoldColor", "#FFF3B0"),
            "#FFF3B0"
        ),
        darkGoldColor: normalizeHexColor(
            stringParam("ChoiceDarkGoldColor", "#9A6718"),
            "#9A6718"
        ),
        selectedTextColor: normalizeHexColor(
            stringParam("ChoiceSelectedTextColor", "#FFF4C2"),
            "#FFF4C2"
        ),
        normalTextColor: normalizeHexColor(
            stringParam("ChoiceNormalTextColor", "#FFFFFF"),
            "#FFFFFF"
        ),
        disabledTextColor: normalizeHexColor(
            stringParam("ChoiceDisabledTextColor", "#777777"),
            "#777777"
        ),
        backgroundOpacity: Math.round(numberParam(
            "ChoiceBackgroundOpacity", 180, 0, 255
        )),
        glowOpacity: Math.round(numberParam(
            "ChoiceGlowOpacity", 180, 0, 255
        )),
        glowLayers: Math.round(numberParam("ChoiceGlowLayers", 3, 1, 5)),
        glowPulseFrames: Math.round(numberParam(
            "ChoiceGlowPulseFrames", 90, 1, 9999
        )),
        glowPulseMinimum: numberParam(
            "ChoiceGlowPulseMinimum", 0.65, 0, 1
        ),
        glowPulseMaximum: numberParam(
            "ChoiceGlowPulseMaximum", 1, 0, 1
        ),
        itemHeight: numberParam("ChoiceItemHeight", 56, 24, 9999),
        itemSpacing: numberParam("ChoiceItemSpacing", 10, 0, 9999),
        fontSize: numberParam("ChoiceFontSize", 26, 8, 999),
        windowWidth: numberParam("ChoiceWindowWidth", 680, 120, 99999),
        windowMaxHeightRate: numberParam(
            "ChoiceWindowMaxHeightRate", 80, 20, 100
        ),
        windowPosition: choiceValue(
            parameters.ChoiceWindowPosition,
            ["left", "center", "right"],
            "center"
        ),
        windowYOffset: numberParam(
            "ChoiceWindowYOffset", 0, -9999, 9999
        ),
        screenDimOpacity: Math.round(numberParam(
            "ChoiceScreenDimOpacity", 80, 0, 255
        )),
        blurFilterEnabled: boolValue(
            parameters.ChoiceBlurFilterEnabled,
            false
        ),
        helpEnabled: boolValue(parameters.ChoiceHelpEnabled, true),
        helpHeight: numberParam("ChoiceHelpHeight", 100, 36, 9999),
        helpFontSize: numberParam("ChoiceHelpFontSize", 20, 8, 999),
        cursorSe: parseSe("ChoiceCursorSe"),
        confirmSe: parseSe("ChoiceConfirmSe"),
        cancelSe: parseSe("ChoiceCancelSe"),
        disabledSe: parseSe("ChoiceDisabledSe")
    };

    const dialogueScaleSettings = {
        enabled: boolValue(dialogueParameters.AutoUiScale, true),
        baseWidth: numberValue(
            dialogueParameters.BaseScreenWidth,
            816,
            1,
            99999
        ),
        baseHeight: numberValue(
            dialogueParameters.BaseScreenHeight,
            624,
            1,
            99999
        ),
        minimum: numberValue(
            dialogueParameters.MinimumUiScale,
            1,
            0.1,
            10
        ),
        maximum: numberValue(
            dialogueParameters.MaximumUiScale,
            1.75,
            0.1,
            10
        )
    };

    const screenSize = () => {
        const app = Graphics.app;
        const rendererScreen = app && app.renderer && app.renderer.screen;
        const rendererWidth = rendererScreen ? Number(rendererScreen.width) : 0;
        const rendererHeight = rendererScreen ? Number(rendererScreen.height) : 0;
        return {
            width: Math.ceil(Math.max(
                Number(Graphics.width) || 0,
                rendererWidth || 0,
                1
            )),
            height: Math.ceil(Math.max(
                Number(Graphics.height) || 0,
                rendererHeight || 0,
                1
            ))
        };
    };

    const uiScaleForSize = (width, height) => {
        if (!dialogueScaleSettings.enabled) {
            return 1;
        }
        const minimum = Math.min(
            dialogueScaleSettings.minimum,
            dialogueScaleSettings.maximum
        );
        const maximum = Math.max(
            dialogueScaleSettings.minimum,
            dialogueScaleSettings.maximum
        );
        return clamp(Math.min(
            width / dialogueScaleSettings.baseWidth,
            height / dialogueScaleSettings.baseHeight
        ), minimum, maximum);
    };

    const scaledPixel = (value, uiScale, minimum = 0) => {
        return Math.max(minimum, Math.round(value * uiScale));
    };

    const isRawGamepadButtonPressed = buttonIndex => {
        if (typeof navigator === "undefined" || !navigator.getGamepads) {
            return false;
        }
        try {
            const gamepads = navigator.getGamepads();
            return Array.from(gamepads || []).some(gamepad => {
                const button = gamepad && gamepad.buttons &&
                    gamepad.buttons[buttonIndex];
                return Boolean(button &&
                    (button.pressed || button.value > 0.5));
            });
        } catch (error) {
            return false;
        }
    };

    const directChoiceKeyState = {
        listenerInstalled: false,
        okTriggered: false,
        cancelTriggered: false
    };

    const isDirectChoiceOkKey = event => {
        const code = String(event.code || "");
        const key = String(event.key || "");
        const keyCode = Number(event.keyCode);
        return code === "Enter" || code === "NumpadEnter" ||
            code === "Space" || code === "KeyZ" ||
            key === "Enter" || key === " " || key === "Spacebar" ||
            key.toLowerCase() === "z" ||
            keyCode === 13 || keyCode === 32 || keyCode === 90;
    };

    const isDirectChoiceCancelKey = event => {
        const code = String(event.code || "");
        const key = String(event.key || "");
        return code === "Escape" || key === "Escape" ||
            Number(event.keyCode) === 27;
    };

    const clearDirectChoiceKeyTriggers = () => {
        directChoiceKeyState.okTriggered = false;
        directChoiceKeyState.cancelTriggered = false;
    };

    const onDirectChoiceKeyDown = event => {
        if (event.repeat) {
            return;
        }
        const okTriggered = isDirectChoiceOkKey(event);
        const cancelTriggered = isDirectChoiceCancelKey(event);
        if (!okTriggered && !cancelTriggered) {
            return;
        }
        if (okTriggered) {
            directChoiceKeyState.okTriggered = true;
        } else {
            directChoiceKeyState.cancelTriggered = true;
        }
        if (typeof event.preventDefault === "function") {
            event.preventDefault();
        }
    };

    const startDirectChoiceKeyListener = () => {
        clearDirectChoiceKeyTriggers();
        if (!directChoiceKeyState.listenerInstalled &&
            typeof document !== "undefined") {
            document.addEventListener("keydown", onDirectChoiceKeyDown);
            directChoiceKeyState.listenerInstalled = true;
        }
    };

    const stopDirectChoiceKeyListener = () => {
        if (directChoiceKeyState.listenerInstalled &&
            typeof document !== "undefined") {
            document.removeEventListener("keydown", onDirectChoiceKeyDown);
        }
        directChoiceKeyState.listenerInstalled = false;
        clearDirectChoiceKeyTriggers();
    };

    const consumeDirectChoiceOk = () => {
        const triggered = directChoiceKeyState.okTriggered;
        directChoiceKeyState.okTriggered = false;
        return triggered;
    };

    const consumeDirectChoiceCancel = () => {
        const triggered = directChoiceKeyState.cancelTriggered;
        directChoiceKeyState.cancelTriggered = false;
        return triggered;
    };

    const textArg = value => String(value || "").replace(/\\n/g, "\n");
    const conditionTypes = ["always", "switchOn", "switchOff", "variable"];
    const comparisonOperators = [
        "equal",
        "notEqual",
        "greater",
        "greaterOrEqual",
        "less",
        "lessOrEqual"
    ];

    const compareNumbers = (left, operator, right) => {
        switch (operator) {
            case "notEqual":
                return left !== right;
            case "greater":
                return left > right;
            case "greaterOrEqual":
                return left >= right;
            case "less":
                return left < right;
            case "lessOrEqual":
                return left <= right;
            default:
                return left === right;
        }
    };

    const evaluateCondition = (option, prefix) => {
        const type = choiceValue(
            option[`${prefix}Condition`],
            conditionTypes,
            "always"
        );
        if (type === "always") {
            return true;
        }
        if (type === "switchOn" || type === "switchOff") {
            const switchId = Math.max(
                0,
                Math.round(Number(option[`${prefix}SwitchId`]) || 0)
            );
            const switchValue = typeof $gameSwitches !== "undefined" &&
                $gameSwitches && typeof $gameSwitches.value === "function" ?
                Boolean($gameSwitches.value(switchId)) : false;
            return type === "switchOn" ? switchValue : !switchValue;
        }
        const variableId = Math.max(
            0,
            Math.round(Number(option[`${prefix}VariableId`]) || 0)
        );
        const variableValue = typeof $gameVariables !== "undefined" &&
            $gameVariables && typeof $gameVariables.value === "function" ?
            Number($gameVariables.value(variableId)) : 0;
        const comparisonValue = Number(option[`${prefix}VariableValue`]);
        const operator = choiceValue(
            option[`${prefix}VariableOperator`],
            comparisonOperators,
            "equal"
        );
        return compareNumbers(
            Number.isFinite(variableValue) ? variableValue : 0,
            operator,
            Number.isFinite(comparisonValue) ? comparisonValue : 0
        );
    };

    const parseChoices = rawChoices => {
        const parsed = parseJson(rawChoices, []);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.slice(0, 99).map((rawOption, sourceIndex) => {
            const option = parseJson(rawOption, {}) || {};
            const parsedResultValue = Number(option.resultValue);
            return {
                sourceIndex,
                text: textArg(option.text),
                resultValue: Number.isFinite(parsedResultValue) ?
                    parsedResultValue : 0,
                helpText: textArg(option.helpText),
                iconIndex: Math.max(
                    0,
                    Math.round(Number(option.iconIndex) || 0)
                ),
                visible: evaluateCondition(option, "visible"),
                enabled: evaluateCondition(option, "enabled")
            };
        }).filter(option => option.visible).map((option, index) => {
            option.displayNumber = index + 1;
            option.resolvedResultValue = option.resultValue === 0 ?
                option.displayNumber : option.resultValue;
            return option;
        });
    };

    const parseCommandConfig = args => {
        return {
            resultVariableId: Math.max(
                0,
                Math.round(Number(args.resultVariableId) || 0)
            ),
            resultTextVariableId: Math.max(
                0,
                Math.round(Number(args.resultTextVariableId) || 0)
            ),
            cancelMode: choiceValue(
                args.cancelMode,
                ["disabled", "returnValue"],
                "disabled"
            ),
            cancelValue: Number.isFinite(Number(args.cancelValue)) ?
                Number(args.cancelValue) : 0,
            defaultIndex: Math.max(
                1,
                Math.round(Number(args.defaultIndex) || 1)
            ),
            numberingEnabled: boolValue(args.numberingEnabled, true),
            numberDelimiter: args.numberDelimiter === undefined ?
                "：" : String(args.numberDelimiter),
            columnCount: clamp(
                Math.round(Number(args.columnCount) || 1),
                1,
                2
            ),
            visibleRows: clamp(
                Math.round(Number(args.visibleRows) || 8),
                1,
                99
            ),
            waitForSelection: boolValue(args.waitForSelection, true)
        };
    };

    const playConfiguredSe = (se, standardSound) => {
        if (se.name && typeof AudioManager !== "undefined" && AudioManager) {
            AudioManager.playSe(se);
        } else if (typeof standardSound === "function") {
            standardSound();
        }
    };

    const readEscapeToken = (text, index) => {
        const match = /^\\(?:[A-Za-z]+(?:\[[^\]]*\])?|[{}\\])/.exec(
            text.slice(index)
        );
        return match ? match[0] : "";
    };

    const tokenizeText = text => {
        const tokens = [];
        let index = 0;
        while (index < text.length) {
            if (text[index] === "\n") {
                tokens.push("\n");
                index++;
            } else if (text[index] === "\\") {
                const escapeToken = readEscapeToken(text, index);
                if (escapeToken) {
                    tokens.push(escapeToken);
                    index += escapeToken.length;
                } else {
                    tokens.push(text[index++]);
                }
            } else {
                tokens.push(text[index++]);
            }
        }
        return tokens;
    };

    const tokenHasVisibleWidth = token => {
        if (!token.startsWith("\\")) {
            return true;
        }
        if (/^\\(?:C|FS|PX|PY)\[/i.test(token)) {
            return false;
        }
        return token !== "\\{" && token !== "\\}";
    };

    const updateTextStyle = (style, token, maximumFontSize) => {
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
            style.fontSize = clamp(style.fontSize + 12, 8, maximumFontSize);
        } else if (token === "\\}") {
            style.fontSize = clamp(style.fontSize - 12, 8, maximumFontSize);
        }
    };

    const safeTextWidth = (window, text) => {
        if (!text) {
            return 0;
        }
        try {
            return window.textSizeEx(text).width;
        } catch (error) {
            return window.textWidth(String(text).replace(/\\[^\s]*/g, ""));
        }
    };

    const wrapTextEx = (window, text, maxWidth, initialFontSize) => {
        const tokens = tokenizeText(String(text || ""));
        const style = { fontSize: initialFontSize, colorIndex: 0 };
        const maximumFontSize = Math.max(96, initialFontSize * 4);
        const stylePrefix = () => {
            return `\\FS[${style.fontSize}]\\C[${style.colorIndex}]`;
        };
        const lines = [];
        let line = stylePrefix();
        let hasVisibleText = false;
        const pushLine = () => {
            lines.push(line);
            line = stylePrefix();
            hasVisibleText = false;
        };
        for (const token of tokens) {
            if (token === "\n") {
                pushLine();
                continue;
            }
            const hasWidth = tokenHasVisibleWidth(token);
            if (hasWidth && hasVisibleText &&
                safeTextWidth(window, line + token) > maxWidth) {
                pushLine();
            }
            line += token;
            updateTextStyle(style, token, maximumFontSize);
            if (hasWidth) {
                hasVisibleText = true;
            }
        }
        lines.push(line);
        return lines.join("\n");
    };

    const truncateTextEx = (window, text, maxWidth) => {
        const source = String(text || "");
        if (!source.includes("\n") && safeTextWidth(window, source) <= maxWidth) {
            return source;
        }
        const ellipsis = "…";
        let result = "";
        for (const token of tokenizeText(source)) {
            if (token === "\n") {
                break;
            }
            const candidate = result + token;
            if (tokenHasVisibleWidth(token) &&
                safeTextWidth(window, candidate + ellipsis) > maxWidth) {
                break;
            }
            result = candidate;
        }
        return result + ellipsis;
    };

    const layoutMeasurements = (height, uiScale, hasHelp) => {
        const padding = scaledPixel(12, uiScale, 4);
        const screenMargin = scaledPixel(24, uiScale, 4);
        const itemHeight = scaledPixel(settings.itemHeight, uiScale, 24);
        const itemSpacing = scaledPixel(settings.itemSpacing, uiScale);
        const rowPitch = itemHeight + itemSpacing;
        const helpFontSize = scaledPixel(settings.helpFontSize, uiScale, 8);
        const helpGap = scaledPixel(10, uiScale, 2);
        const requestedHelpHeight = scaledPixel(
            settings.helpHeight,
            uiScale,
            36
        );
        const availableHeight = Math.max(1, height - screenMargin * 2);
        const minimumListHeight = itemHeight + padding * 2;
        const maximumHelpHeight = Math.max(
            0,
            availableHeight - minimumListHeight - helpGap
        );
        const helpHeight = hasHelp ?
            Math.min(requestedHelpHeight, maximumHelpHeight) : 0;
        const usesHelpArea = hasHelp &&
            helpHeight >= helpFontSize + padding * 2;
        const helpAreaHeight = usesHelpArea ? helpHeight + helpGap : 0;
        const listMaximumHeight = Math.max(
            minimumListHeight,
            Math.min(
                Math.round(height * settings.windowMaxHeightRate / 100),
                availableHeight - helpAreaHeight
            )
        );
        return {
            padding,
            screenMargin,
            itemHeight,
            itemSpacing,
            rowPitch,
            helpFontSize,
            helpGap,
            helpHeight,
            usesHelpArea,
            helpAreaHeight,
            availableHeight,
            listMaximumHeight
        };
    };

    const fittingUiScale = (width, height, totalRows, config, hasHelp) => {
        const preferredScale = uiScaleForSize(width, height);
        const desiredRows = Math.max(
            1,
            Math.min(config.visibleRows, totalRows)
        );
        const rowsThatFit = scale => {
            const measured = layoutMeasurements(height, scale, hasHelp);
            return Math.max(1, Math.floor(
                (measured.listMaximumHeight - measured.padding * 2 +
                    measured.itemSpacing) / measured.rowPitch
            ));
        };
        if (rowsThatFit(preferredScale) >= desiredRows) {
            return preferredScale;
        }

        // 低解像度では基準倍率より小さくして文字を詰め込みません。
        const lowerScale = preferredScale >= 1 ? 1 : preferredScale;
        if (rowsThatFit(lowerScale) < desiredRows) {
            return lowerScale;
        }
        let lower = lowerScale;
        let upper = preferredScale;
        for (let index = 0; index < 16; index++) {
            const middle = (lower + upper) / 2;
            if (rowsThatFit(middle) >= desiredRows) {
                lower = middle;
            } else {
                upper = middle;
            }
        }
        return lower;
    };

    const makeLayout = (entries, config) => {
        const { width, height } = screenSize();
        const totalRows = Math.max(
            1,
            Math.ceil(entries.length / config.columnCount)
        );
        const hasHelp = settings.helpEnabled &&
            entries.some(entry => Boolean(entry.helpText.trim()));
        const preferredUiScale = uiScaleForSize(width, height);
        const uiScale = fittingUiScale(
            width,
            height,
            totalRows,
            config,
            hasHelp
        );
        const measured = layoutMeasurements(height, uiScale, hasHelp);
        const {
            padding,
            screenMargin,
            itemHeight,
            itemSpacing,
            rowPitch,
            helpFontSize,
            helpGap,
            helpHeight,
            usesHelpArea,
            helpAreaHeight,
            availableHeight,
            listMaximumHeight
        } = measured;
        const fontSize = scaledPixel(settings.fontSize, uiScale, 8);
        const columnSpacing = scaledPixel(10, uiScale);
        const rowsThatFit = Math.max(
            1,
            Math.floor(
                (listMaximumHeight - padding * 2 + itemSpacing) / rowPitch
            )
        );
        const visibleRows = Math.max(
            1,
            Math.min(config.visibleRows, totalRows, rowsThatFit)
        );
        const listHeight = visibleRows * rowPitch - itemSpacing + padding * 2;
        const combinedHeight = listHeight + helpAreaHeight;
        const windowWidth = Math.max(
            120,
            Math.min(
                scaledPixel(settings.windowWidth, uiScale, 120),
                width - screenMargin * 2
            )
        );
        let x;
        if (settings.windowPosition === "left") {
            x = screenMargin;
        } else if (settings.windowPosition === "right") {
            x = width - screenMargin - windowWidth;
        } else {
            x = Math.round((width - windowWidth) / 2);
        }
        const requestedY = Math.round((height - combinedHeight) / 2) +
            scaledPixel(settings.windowYOffset, uiScale);
        const y = clamp(
            requestedY,
            screenMargin,
            Math.max(screenMargin, height - screenMargin - combinedHeight)
        );
        const scrollbarWidth = scaledPixel(10, uiScale, 6);
        const hasScrollbar = totalRows > visibleRows;
        const glowMargin = scaledPixel(
            5 + settings.glowLayers * 2,
            uiScale,
            4
        );
        return {
            key: [
                width,
                height,
                entries.length,
                config.columnCount,
                config.visibleRows,
                usesHelpArea,
                uiScale.toFixed(4)
            ].join(","),
            width,
            height,
            preferredUiScale,
            uiScale,
            padding,
            screenMargin,
            itemHeight,
            itemSpacing,
            rowPitch,
            columnSpacing,
            fontSize,
            helpFontSize,
            visibleRows,
            totalRows,
            availableHeight,
            listMaximumHeight,
            listHeight,
            helpHeight: usesHelpArea ? helpHeight : 0,
            combinedHeight,
            hasScrollbar,
            scrollbarWidth,
            scrollbarInset: hasScrollbar ?
                scrollbarWidth + glowMargin +
                    scaledPixel(4, uiScale, 2) : 0,
            listRect: new Rectangle(x, y, windowWidth, listHeight),
            helpRect: new Rectangle(
                x,
                y + listHeight + helpGap,
                windowWidth,
                usesHelpArea ? helpHeight : 1
            ),
            usesHelpArea,
            glowMargin,
            borderWidth: scaledPixel(1, uiScale, 1),
            scrollbarRect: new Rectangle(
                x + windowWidth - padding - scrollbarWidth,
                y + padding,
                scrollbarWidth,
                Math.max(1, listHeight - padding * 2)
            )
        };
    };

    class Sprite_ProjectRGoldChoiceCursor extends Sprite {
        initialize() {
            super.initialize(new Bitmap(1, 1));
            this.anchor.set(0.5, 0.5);
            this._rectWidth = 0;
            this._rectHeight = 0;
            this._margin = 0;
            this._enabled = true;
            this._pulseOffset = 0;
            this.visible = false;
        }

        configure(width, height, layout) {
            const roundedWidth = Math.max(1, Math.round(width));
            const roundedHeight = Math.max(1, Math.round(height));
            const margin = layout.glowMargin;
            if (roundedWidth === this._rectWidth &&
                roundedHeight === this._rectHeight &&
                margin === this._margin) {
                return;
            }
            this._rectWidth = roundedWidth;
            this._rectHeight = roundedHeight;
            this._margin = margin;
            this.bitmap.resize(
                roundedWidth + margin * 2,
                roundedHeight + margin * 2
            );
            this.redraw(layout);
            this.setupBlurFilter(layout.uiScale);
        }

        redraw(layout) {
            const bitmap = this.bitmap;
            const margin = this._margin;
            const width = this._rectWidth;
            const height = this._rectHeight;
            bitmap.clear();
            bitmap.paintOpacity = 255;
            bitmap.gradientFillRect(
                margin,
                margin,
                width,
                height,
                colorWithAlpha(settings.darkGoldColor, 0.30),
                colorWithAlpha(settings.goldColor, 0.16),
                false
            );
            for (let layer = 0; layer < settings.glowLayers; layer++) {
                const outward = settings.glowLayers - layer;
                const inset = Math.max(0, margin - outward * layout.borderWidth * 2);
                const alpha = 0.12 + layer * 0.10;
                bitmap.strokeRect(
                    inset,
                    inset,
                    bitmap.width - inset * 2,
                    bitmap.height - inset * 2,
                    colorWithAlpha(settings.goldColor, alpha)
                );
            }
            for (let line = 0; line < layout.borderWidth + 1; line++) {
                bitmap.strokeRect(
                    margin + line,
                    margin + line,
                    Math.max(1, width - line * 2),
                    Math.max(1, height - line * 2),
                    line === 0 ?
                        settings.brightGoldColor : settings.goldColor
                );
            }
        }

        setupBlurFilter(uiScale) {
            this.filters = null;
            if (!settings.blurFilterEnabled || typeof PIXI === "undefined" ||
                !PIXI.filters || !PIXI.filters.BlurFilter) {
                return;
            }
            try {
                const blurFilter = new PIXI.filters.BlurFilter();
                blurFilter.blur = Math.max(1, Math.round(2 * uiScale));
                blurFilter.quality = 1;
                this.filters = [blurFilter];
            } catch (error) {
                this.filters = null;
            }
        }

        setItemRect(rect, enabled) {
            this._enabled = enabled;
            this.x = rect.x + rect.width / 2;
            this.y = rect.y + rect.height / 2;
            this.visible = rect.width > 0 && rect.height > 0;
        }

        hideCursor() {
            this.visible = false;
        }

        update() {
            super.update();
            if (!this.visible) {
                return;
            }
            const minimum = Math.min(
                settings.glowPulseMinimum,
                settings.glowPulseMaximum
            );
            const maximum = Math.max(
                settings.glowPulseMinimum,
                settings.glowPulseMaximum
            );
            this._pulseOffset = (this._pulseOffset + 1) %
                settings.glowPulseFrames;
            const wave = (Math.sin(
                this._pulseOffset / settings.glowPulseFrames * Math.PI * 2
            ) + 1) / 2;
            const pulse = minimum + (maximum - minimum) * wave;
            const enabledRate = this._enabled ? 1 : 0.45;
            this.opacity = Math.round(
                settings.glowOpacity * pulse * enabledRate
            );
            const scale = this._enabled ? 1 + wave * 0.006 : 1;
            this.scale.set(scale, scale);
        }
    }

    class Window_ProjectRDialogueChoiceHelp extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 0;
            this.backOpacity = 0;
            this._layout = null;
            this._text = "";
            this._drawingTextColor = "";
            this.hide();
        }

        applyLayout(rect, layout) {
            this._layout = layout;
            this.move(rect.x, rect.y, rect.width, rect.height);
            this.padding = layout.padding;
            this.createContents();
            this.refresh();
        }

        resetFontSettings() {
            super.resetFontSettings();
            if (!this.contents) {
                return;
            }
            const layout = this._layout;
            this.contents.fontSize = layout ? layout.helpFontSize : 20;
            this.contents.textColor = this._drawingTextColor ||
                settings.normalTextColor;
            this.contents.outlineColor = "rgba(0, 0, 0, 0.9)";
            this.contents.outlineWidth = layout ?
                Math.max(2, layout.borderWidth * 2) : 4;
        }

        setText(text) {
            const nextText = String(text || "");
            if (this._text !== nextText) {
                this._text = nextText;
                this.refresh();
            }
            if (this._layout && this._layout.usesHelpArea) {
                this.show();
                this.openness = 255;
            } else {
                this.hide();
            }
        }

        refresh() {
            if (!this.contents || !this.contentsBack) {
                return;
            }
            this.contents.clear();
            this.contentsBack.clear();
            if (!this._layout || !this._layout.usesHelpArea) {
                return;
            }
            this.contentsBack.fillRect(
                0,
                0,
                this.innerWidth,
                this.innerHeight,
                `rgba(3, 6, 14, ${settings.backgroundOpacity / 255})`
            );
            this.contentsBack.fillRect(
                0,
                0,
                this.innerWidth,
                this._layout.borderWidth,
                settings.goldColor
            );
            if (!this._text.trim()) {
                return;
            }
            this._drawingTextColor = settings.normalTextColor;
            const wrapped = wrapTextEx(
                this,
                this._text,
                Math.max(1, this.innerWidth),
                this._layout.helpFontSize
            );
            this.drawTextEx(wrapped, 0, 0, this.innerWidth);
            this._drawingTextColor = "";
        }
    }

    class Window_ProjectRDialogueChoices extends Window_Selectable {
        initialize(rect) {
            super.initialize(rect);
            this.opacity = 0;
            this.backOpacity = 0;
            this._entries = [];
            this._config = null;
            this._layout = null;
            this._inputLockFrames = 0;
            this._drawingTextColor = "";
            this._pressedIndex = -1;
            this._rawGamepadOkPressed = false;
            this._rawGamepadCancelPressed = false;
            this._goldCursor = new Sprite_ProjectRGoldChoiceCursor();
            const contentsIndex = this._clientArea.getChildIndex(
                this._contentsSprite
            );
            this._clientArea.addChildAt(
                this._goldCursor,
                Math.max(0, contentsIndex)
            );
            this._cursorSprite.visible = false;
            this.hide();
            this.openness = 0;
        }

        setChoiceData(entries, config) {
            this._entries = entries;
            this._config = config;
        }

        applyLayout(rect, layout) {
            const oldIndex = this.index();
            const oldTopRow = this.topRow();
            this._layout = layout;
            this.move(rect.x, rect.y, rect.width, rect.height);
            this.padding = layout.padding;
            this.createContents();
            const sampleRect = this.maxItems() > 0 ?
                this.itemRect(0) : new Rectangle(
                    0,
                    0,
                    this.innerWidth,
                    layout.itemHeight
                );
            this._goldCursor.configure(
                sampleRect.width,
                sampleRect.height,
                layout
            );
            this.refresh();
            if (this.maxItems() > 0) {
                this.forceSelect(clamp(oldIndex, 0, this.maxItems() - 1));
                this.setTopRow(clamp(oldTopRow, 0, this.maxTopRow()));
                this.ensureCursorVisible(false);
            }
        }

        startSelection(defaultIndex) {
            this._inputLockFrames = 8;
            this._pressedIndex = -1;
            this._rawGamepadOkPressed = isRawGamepadButtonPressed(0);
            this._rawGamepadCancelPressed = isRawGamepadButtonPressed(1);
            this.show();
            this.openness = 255;
            const index = clamp(defaultIndex - 1, 0, this.maxItems() - 1);
            this.forceSelect(index);
            this.activate();
        }

        stopSelection() {
            this._inputLockFrames = 0;
            this._pressedIndex = -1;
            this._rawGamepadOkPressed = false;
            this._rawGamepadCancelPressed = false;
            this.clearScrollStatus();
            this.scrollTo(0, 0);
            this.deactivate();
            this.deselect();
            this.hide();
            this.openness = 0;
            this._goldCursor.hideCursor();
        }

        maxCols() {
            return this._config ? this._config.columnCount : 1;
        }

        maxItems() {
            return this._entries.length;
        }

        itemHeight() {
            return this._layout ? this._layout.rowPitch : 56;
        }

        overallHeight() {
            if (!this._layout) {
                return super.overallHeight();
            }
            return Math.max(
                this._layout.itemHeight,
                this.maxRows() * this._layout.rowPitch -
                    this._layout.itemSpacing
            );
        }

        maxPageRows() {
            return this._layout ?
                this._layout.visibleRows : super.maxPageRows();
        }

        itemWidth() {
            if (!this._layout) {
                return super.itemWidth();
            }
            const columns = Math.max(1, this.maxCols());
            const gaps = Math.max(0, columns - 1) *
                this._layout.columnSpacing;
            const availableWidth = Math.max(
                1,
                this.innerWidth - this._layout.scrollbarInset
            );
            return Math.max(1, Math.floor((availableWidth - gaps) / columns));
        }

        itemRect(index) {
            if (!this._layout) {
                return super.itemRect(index);
            }
            const columns = Math.max(1, this.maxCols());
            const column = index % columns;
            const row = Math.floor(index / columns);
            const width = this.itemWidth();
            return new Rectangle(
                column * (width + this._layout.columnSpacing) -
                    this.scrollBaseX(),
                row * this._layout.rowPitch - this.scrollBaseY(),
                width,
                this._layout.itemHeight
            );
        }

        rowSpacing() {
            return this._layout ? this._layout.itemSpacing : 10;
        }

        colSpacing() {
            return this._layout ? this._layout.columnSpacing : 10;
        }

        ensureCursorVisible(smooth) {
            if (!this._layout || this.index() < 0) {
                super.ensureCursorVisible(smooth);
                return;
            }
            const row = Math.floor(this.index() / this.maxCols());
            const itemTop = row * this._layout.rowPitch;
            const itemBottom = itemTop + this._layout.itemHeight;
            const scrollY = this.scrollY();
            const scrollMinimum = itemBottom - this.innerHeight;
            if (scrollY > itemTop) {
                if (smooth) {
                    this.smoothScrollTo(0, itemTop);
                } else {
                    this.scrollTo(0, itemTop);
                }
            } else if (scrollY < scrollMinimum) {
                if (smooth) {
                    this.smoothScrollTo(0, scrollMinimum);
                } else {
                    this.scrollTo(0, scrollMinimum);
                }
            }
        }

        lineHeight() {
            return this._layout ?
                this._layout.fontSize + scaledPixel(8, this._layout.uiScale) :
                36;
        }

        resetFontSettings() {
            super.resetFontSettings();
            if (!this.contents) {
                return;
            }
            this.contents.fontSize = this._layout ?
                this._layout.fontSize : 26;
            this.contents.textColor = this._drawingTextColor ||
                settings.normalTextColor;
            this.contents.outlineColor = "rgba(0, 0, 0, 0.95)";
            this.contents.outlineWidth = this._layout ?
                Math.max(2, this._layout.borderWidth * 2) : 4;
        }

        drawItemBackground(index) {
            const rect = this.itemRect(index);
            const borderWidth = this._layout ? this._layout.borderWidth : 1;
            this.contentsBack.fillRect(
                rect.x,
                rect.y,
                rect.width,
                rect.height,
                `rgba(3, 7, 18, ${settings.backgroundOpacity / 255})`
            );
            for (let line = 0; line < borderWidth; line++) {
                this.contentsBack.strokeRect(
                    rect.x + line,
                    rect.y + line,
                    Math.max(1, rect.width - line * 2),
                    Math.max(1, rect.height - line * 2),
                    colorWithAlpha(settings.goldColor, 0.34)
                );
            }
        }

        drawItem(index) {
            const entry = this._entries[index];
            if (!entry || !this._layout) {
                return;
            }
            const rect = this.itemRectWithPadding(index);
            let displayText = "";
            if (entry.iconIndex > 0) {
                displayText += `\\I[${entry.iconIndex}] `;
            }
            if (this._config.numberingEnabled) {
                displayText += `${entry.displayNumber}${this._config.numberDelimiter}`;
            }
            displayText += entry.text;
            const selected = this.index() === index;
            this._drawingTextColor = entry.enabled ?
                (selected ? settings.selectedTextColor :
                    settings.normalTextColor) : settings.disabledTextColor;
            const fittedText = truncateTextEx(
                this,
                displayText,
                Math.max(1, rect.width)
            );
            let textHeight = this.lineHeight();
            try {
                textHeight = this.textSizeEx(fittedText).height;
            } catch (error) {
                textHeight = this.lineHeight();
            }
            const y = rect.y + Math.max(
                0,
                Math.round((rect.height - textHeight) / 2)
            );
            this.drawTextEx(fittedText, rect.x, y, rect.width);
            this._drawingTextColor = "";
        }

        select(index) {
            const previousIndex = this.index();
            super.select(index);
            if (this.contents && previousIndex !== index) {
                this.redrawItem(previousIndex);
                this.redrawItem(index);
            }
            this.updateGoldCursor();
        }

        refreshCursor() {
            this.setCursorRect(0, 0, 0, 0);
            this.updateGoldCursor();
        }

        updateGoldCursor() {
            if (!this._goldCursor || !this._layout || this.index() < 0 ||
                this.index() >= this.maxItems()) {
                if (this._goldCursor) {
                    this._goldCursor.hideCursor();
                }
                return;
            }
            const entry = this._entries[this.index()];
            this._goldCursor.setItemRect(
                this.itemRect(this.index()),
                Boolean(entry && entry.enabled)
            );
        }

        isCurrentItemEnabled() {
            const entry = this._entries[this.index()];
            return Boolean(entry && entry.enabled);
        }

        isCancelEnabled() {
            return Boolean(this._config &&
                this._config.cancelMode === "returnValue" &&
                super.isCancelEnabled());
        }

        updateHelp() {
            const entry = this._entries[this.index()];
            if (this._helpWindow) {
                this._helpWindow.setText(entry ? entry.helpText : "");
            }
        }

        playCursorSound() {
            playConfiguredSe(settings.cursorSe, () => SoundManager.playCursor());
        }

        playOkSound() {
            playConfiguredSe(settings.confirmSe, () => SoundManager.playOk());
        }

        playBuzzerSound() {
            playConfiguredSe(
                settings.disabledSe,
                () => SoundManager.playBuzzer()
            );
        }

        processCancel() {
            playConfiguredSe(settings.cancelSe, () => SoundManager.playCancel());
            this.updateInputData();
            this.deactivate();
            this.callCancelHandler();
        }

        processCursorMove() {
            if (this._inputLockFrames > 0) {
                return;
            }
            const previousIndex = this.index();
            if (Input.isTriggered("projectRChoiceHome")) {
                this.smoothSelect(0);
            } else if (Input.isTriggered("projectRChoiceEnd")) {
                this.smoothSelect(Math.max(0, this.maxItems() - 1));
            } else {
                super.processCursorMove();
                return;
            }
            if (previousIndex !== this.index()) {
                this.playCursorSound();
            }
        }

        cursorRight(wrap) {
            if (this.maxCols() !== 2) {
                super.cursorRight(wrap);
                return;
            }
            const index = this.index();
            if (index >= 0 && index % 2 === 0 &&
                index + 1 < this.maxItems()) {
                this.smoothSelect(index + 1);
            }
        }

        cursorLeft(wrap) {
            if (this.maxCols() !== 2) {
                super.cursorLeft(wrap);
                return;
            }
            const index = this.index();
            if (index >= 0 && index % 2 === 1) {
                this.smoothSelect(index - 1);
            }
        }

        processHandling() {
            const directOkTriggered = consumeDirectChoiceOk();
            const directCancelTriggered = consumeDirectChoiceCancel();
            const rawOkPressed = isRawGamepadButtonPressed(0);
            const rawCancelPressed = isRawGamepadButtonPressed(1);
            const rawOkTriggered = rawOkPressed &&
                !this._rawGamepadOkPressed;
            const rawCancelTriggered = rawCancelPressed &&
                !this._rawGamepadCancelPressed;
            this._rawGamepadOkPressed = rawOkPressed;
            this._rawGamepadCancelPressed = rawCancelPressed;
            if (this._inputLockFrames > 0 || !this.isOpenAndActive()) {
                return;
            }
            // Hendrix側で標準割り当てが外れていても決定とキャンセルを補完します。
            if (directOkTriggered && this.isOkEnabled()) {
                this.processOk();
            } else if (rawOkTriggered && this.isOkEnabled()) {
                this.processOk();
            } else if (directCancelTriggered && this.isCancelEnabled()) {
                this.processCancel();
            } else if (rawCancelTriggered && this.isCancelEnabled()) {
                this.processCancel();
            } else {
                super.processHandling();
            }
        }

        processTouch() {
            if (this._inputLockFrames > 0 || !this.isOpenAndActive()) {
                return;
            }
            if (TouchInput.isHovered()) {
                this.selectTouchedIndex(false);
            }
            if (TouchInput.isTriggered()) {
                this._pressedIndex = this.hitIndex();
                this.selectTouchedIndex(true);
            }
            if (TouchInput.isClicked()) {
                const hitIndex = this.hitIndex();
                if (hitIndex >= 0 &&
                    (this._pressedIndex < 0 || hitIndex === this._pressedIndex)) {
                    if (this.index() !== hitIndex) {
                        this.select(hitIndex);
                        this.playCursorSound();
                    }
                    this.processOk();
                }
                this._pressedIndex = -1;
            } else if (TouchInput.isCancelled() && this.isCancelEnabled()) {
                this.processCancel();
            }
        }

        processWheelScroll() {
            if (this._inputLockFrames > 0 || !this.isOpenAndActive() ||
                !this.isTouchedInsideFrame()) {
                return;
            }
            const previousIndex = this.index();
            if (TouchInput.wheelY >= 20) {
                this.cursorDown(false);
            } else if (TouchInput.wheelY <= -20) {
                this.cursorUp(false);
            }
            if (previousIndex !== this.index()) {
                this.playCursorSound();
            }
        }

        selectTouchedIndex(playSound) {
            const hitIndex = this.hitIndex();
            if (hitIndex >= 0 && hitIndex !== this.index()) {
                this.select(hitIndex);
                if (playSound) {
                    this.playCursorSound();
                }
            }
        }

        onTouchScrollEnd() {
            super.onTouchScrollEnd();
            if (!this._layout || this.index() < 0) {
                return;
            }
            const columns = this.maxCols();
            const currentRow = Math.floor(this.index() / columns);
            const currentColumn = this.index() % columns;
            const firstVisibleRow = this.topRow();
            const lastVisibleRow = Math.min(
                this.maxRows() - 1,
                firstVisibleRow + this.maxPageRows() - 1
            );
            const visibleRow = clamp(
                currentRow,
                firstVisibleRow,
                lastVisibleRow
            );
            if (visibleRow !== currentRow) {
                const visibleIndex = Math.min(
                    visibleRow * columns + currentColumn,
                    this.maxItems() - 1
                );
                this.select(visibleIndex);
            }
            this.ensureCursorVisible(false);
        }

        updateArrows() {
            this.downArrowVisible = false;
            this.upArrowVisible = false;
        }

        update() {
            if (this._inputLockFrames > 0) {
                this._inputLockFrames--;
            }
            super.update();
            this.updateGoldCursor();
        }
    }

    class Sprite_ProjectRDialogueChoiceScrollBar extends Sprite {
        initialize() {
            super.initialize();
            this._trackSprite = new Sprite(new Bitmap(1, 1));
            this._thumbSprite = new Sprite(new Bitmap(1, 1));
            this._upArrowSprite = new Sprite(new Bitmap(1, 1));
            this._downArrowSprite = new Sprite(new Bitmap(1, 1));
            this.addChild(this._trackSprite);
            this.addChild(this._thumbSprite);
            this.addChild(this._upArrowSprite);
            this.addChild(this._downArrowSprite);
            this._window = null;
            this._totalRows = 1;
            this._visibleRows = 1;
            this._arrowHeight = 1;
            this._trackHeight = 1;
            this._thumbHeight = 1;
            this.visible = false;
        }

        configure(rect, layout, choiceWindow) {
            this._window = choiceWindow;
            this._totalRows = layout.totalRows;
            this._visibleRows = layout.visibleRows;
            this.visible = this._totalRows > this._visibleRows;
            if (!this.visible) {
                return;
            }
            this.opacity = 255;
            this.move(rect.x, rect.y);
            const width = Math.max(1, Math.round(rect.width));
            const height = Math.max(1, Math.round(rect.height));
            this._arrowHeight = Math.min(
                Math.max(width + scaledPixel(2, layout.uiScale), width),
                Math.floor(height / 3)
            );
            this._trackHeight = Math.max(1, height - this._arrowHeight * 2);
            this._thumbHeight = clamp(
                Math.round(
                    this._trackHeight * this._visibleRows / this._totalRows
                ),
                Math.min(this._trackHeight, scaledPixel(20, layout.uiScale, 8)),
                this._trackHeight
            );
            this.resizeSpriteBitmap(this._trackSprite, width, height);
            this.resizeSpriteBitmap(
                this._thumbSprite,
                width,
                this._thumbHeight
            );
            this.resizeSpriteBitmap(
                this._upArrowSprite,
                width,
                this._arrowHeight
            );
            this.resizeSpriteBitmap(
                this._downArrowSprite,
                width,
                this._arrowHeight
            );
            this.drawParts(width, height, layout);
            this._upArrowSprite.y = 0;
            this._downArrowSprite.y = height - this._arrowHeight;
            this.updateFromWindow();
        }

        resizeSpriteBitmap(sprite, width, height) {
            const bitmap = sprite.bitmap;
            const bitmapWidth = Math.max(1, Math.round(width));
            const bitmapHeight = Math.max(1, Math.round(height));
            bitmap.resize(bitmapWidth, bitmapHeight);
            bitmap.clear();
            // MZのSpriteはBitmap拡大後も古い1x1フレームを保持するため更新します。
            sprite.setFrame(0, 0, bitmapWidth, bitmapHeight);
            sprite.opacity = 255;
            sprite.visible = true;
        }

        drawParts(width, height, layout) {
            const track = this._trackSprite.bitmap;
            track.fillRect(
                0,
                this._arrowHeight,
                width,
                this._trackHeight,
                "rgba(0, 0, 0, 0.55)"
            );
            const thumb = this._thumbSprite.bitmap;
            thumb.gradientFillRect(
                0,
                0,
                width,
                this._thumbHeight,
                settings.darkGoldColor,
                settings.brightGoldColor,
                false
            );
            thumb.strokeRect(
                0,
                0,
                width,
                this._thumbHeight,
                settings.goldColor
            );
            this.drawArrow(this._upArrowSprite.bitmap, "▲", layout);
            this.drawArrow(this._downArrowSprite.bitmap, "▼", layout);
        }

        drawArrow(bitmap, text, layout) {
            bitmap.fontFace = $gameSystem.mainFontFace();
            bitmap.fontSize = Math.max(8, scaledPixel(10, layout.uiScale, 8));
            bitmap.textColor = settings.goldColor;
            bitmap.outlineColor = "rgba(0, 0, 0, 0.9)";
            bitmap.outlineWidth = Math.max(2, layout.borderWidth * 2);
            bitmap.drawText(text, 0, 0, bitmap.width, bitmap.height, "center");
        }

        updateFromWindow() {
            if (!this.visible || !this._window) {
                return;
            }
            const topRow = this._window.topRow();
            const maximumTopRow = Math.max(
                1,
                this._totalRows - this._visibleRows
            );
            const travel = Math.max(0, this._trackHeight - this._thumbHeight);
            this._thumbSprite.y = this._arrowHeight + Math.round(
                travel * topRow / maximumTopRow
            );
            this._upArrowSprite.visible = topRow > 0;
            this._downArrowSprite.visible = topRow < maximumTopRow;
        }

        update() {
            super.update();
            this.updateFromWindow();
        }
    }

    class Sprite_ProjectRDialogueChoiceLayer extends Sprite {
        initialize() {
            super.initialize();
            this._dimSprite = new ScreenSprite();
            this._dimSprite.setBlack();
            this._dimSprite.opacity = settings.screenDimOpacity;
            this._choiceWindow = new Window_ProjectRDialogueChoices(
                new Rectangle(0, 0, 1, 1)
            );
            this._helpWindow = new Window_ProjectRDialogueChoiceHelp(
                new Rectangle(0, 0, 1, 1)
            );
            this._scrollBar = new Sprite_ProjectRDialogueChoiceScrollBar();
            this.addChild(this._dimSprite);
            this.addChild(this._choiceWindow);
            this.addChild(this._scrollBar);
            this.addChild(this._helpWindow);
            this._choiceWindow.setHelpWindow(this._helpWindow);
            this._choiceWindow.setHandler("ok", this.onChoiceOk.bind(this));
            this._choiceWindow.setHandler(
                "cancel",
                this.onChoiceCancel.bind(this)
            );
            this._entries = [];
            this._config = null;
            this._layoutKey = "";
            this.visible = false;
        }

        showChoices(entries, config) {
            this._entries = entries;
            this._config = config;
            this._choiceWindow.setChoiceData(entries, config);
            this._layoutKey = "";
            this.visible = true;
            this._dimSprite.visible = true;
            this._dimSprite.opacity = settings.screenDimOpacity;
            this.updatePlacement(true);
            this._choiceWindow.startSelection(config.defaultIndex);
        }

        hideChoices() {
            this._choiceWindow.stopSelection();
            this._helpWindow.setText("");
            this._helpWindow.hide();
            this._scrollBar.visible = false;
            this._dimSprite.visible = false;
            this.visible = false;
            this._entries = [];
            this._config = null;
            this._layoutKey = "";
        }

        updatePlacement(force = false) {
            if (!this._config || this._entries.length === 0) {
                return;
            }
            const layout = makeLayout(this._entries, this._config);
            if (!force && layout.key === this._layoutKey) {
                return;
            }
            this._layoutKey = layout.key;
            this._choiceWindow.applyLayout(layout.listRect, layout);
            this._helpWindow.applyLayout(layout.helpRect, layout);
            this._choiceWindow.updateHelp();
            this._scrollBar.configure(
                layout.scrollbarRect,
                layout,
                this._choiceWindow
            );
        }

        onChoiceOk() {
            ProjectRDialogueChoiceManager.select(this._choiceWindow.index());
        }

        onChoiceCancel() {
            ProjectRDialogueChoiceManager.cancel();
        }

        update() {
            super.update();
            if (this.visible) {
                this.updatePlacement(false);
            }
        }
    }

    const ProjectRDialogueChoiceManager = {
        _layer: null,
        _active: false,
        _entries: [],
        _config: null,
        _ownerInterpreter: null,
        _waitForSelection: false,
        _sessionId: 0,
        _postInputLockFrames: 0,

        setLayer(layer) {
            this._layer = layer;
            if (this._active && layer) {
                layer.showChoices(this._entries, this._config);
            }
        },

        clearLayer(layer) {
            if (!layer || this._layer === layer) {
                this._layer = null;
            }
        },

        isActive() {
            return this._active;
        },

        isOwnedBy(interpreter) {
            return this._active && this._ownerInterpreter === interpreter;
        },

        blocksDialogueAdvance() {
            return this._active || this._postInputLockFrames > 0;
        },

        show(args, interpreter) {
            if (this._active) {
                this.abort(true);
            }
            const config = parseCommandConfig(args || {});
            const entries = parseChoices(args ? args.choices : []);
            if (!FullscreenDialogue ||
                typeof FullscreenDialogue.isActive !== "function" ||
                !FullscreenDialogue.isActive()) {
                this.writeCancelResult(config);
                console.warn(
                    `${pluginName}: 全画面会話が表示されていないため、` +
                    "選択肢を開始しませんでした。"
                );
                return false;
            }
            if (!this._layer || entries.length === 0 ||
                !entries.some(entry => entry.enabled)) {
                this.writeCancelResult(config);
                return false;
            }
            this._entries = entries;
            this._config = config;
            this._ownerInterpreter = interpreter || null;
            this._waitForSelection = config.waitForSelection;
            this._sessionId++;
            this._active = true;
            this._postInputLockFrames = 0;
            startDirectChoiceKeyListener();
            this._layer.showChoices(entries, config);
            return true;
        },

        select(index) {
            if (!this._active) {
                return;
            }
            const entry = this._entries[index];
            if (!entry || !entry.enabled) {
                return;
            }
            this.writeVariable(
                this._config.resultVariableId,
                entry.resolvedResultValue
            );
            this.writeVariable(
                this._config.resultTextVariableId,
                entry.text
            );
            this.closeInternal();
        },

        cancel() {
            if (!this._active || this._config.cancelMode !== "returnValue") {
                return;
            }
            this.writeCancelResult(this._config);
            this.closeInternal();
        },

        abort(writeCancelResult) {
            if (!this._active) {
                stopDirectChoiceKeyListener();
                return;
            }
            if (writeCancelResult && this._config) {
                this.writeCancelResult(this._config);
            }
            this.closeInternal();
        },

        closeInternal() {
            stopDirectChoiceKeyListener();
            if (this._layer) {
                this._layer.hideChoices();
            }
            this._active = false;
            this._entries = [];
            this._config = null;
            this._ownerInterpreter = null;
            this._waitForSelection = false;
            this._postInputLockFrames = 6;
        },

        writeCancelResult(config) {
            this.writeVariable(config.resultVariableId, config.cancelValue);
            this.writeVariable(config.resultTextVariableId, "");
        },

        writeVariable(variableId, value) {
            if (variableId > 0 && typeof $gameVariables !== "undefined" &&
                $gameVariables && typeof $gameVariables.setValue === "function") {
                $gameVariables.setValue(variableId, value);
            }
        },

        isWaiting(sessionId) {
            return this._active && Number(sessionId) === this._sessionId;
        },

        update() {
            if (this._postInputLockFrames > 0) {
                this._postInputLockFrames--;
            }
            if (!this._active) {
                return;
            }
            if (!FullscreenDialogue || !FullscreenDialogue.isActive()) {
                this.abort(true);
                return;
            }
            if (this._ownerInterpreter &&
                typeof this._ownerInterpreter.isRunning === "function" &&
                !this._ownerInterpreter.isRunning()) {
                this.abort(true);
            }
        }
    };

    projectR.FullscreenDialogueChoices = ProjectRDialogueChoiceManager;
    ProjectRDialogueChoiceManager.Window_ProjectRDialogueChoices =
        Window_ProjectRDialogueChoices;
    ProjectRDialogueChoiceManager.Window_ProjectRDialogueChoiceHelp =
        Window_ProjectRDialogueChoiceHelp;
    ProjectRDialogueChoiceManager.Sprite_ProjectRGoldChoiceCursor =
        Sprite_ProjectRGoldChoiceCursor;

    if (Input.keyMapper[36] === undefined) {
        Input.keyMapper[36] = "projectRChoiceHome";
    }
    if (Input.keyMapper[35] === undefined) {
        Input.keyMapper[35] = "projectRChoiceEnd";
    }

    PluginManager.registerCommand(pluginName, "ShowDialogueChoices", function(args) {
        const shown = ProjectRDialogueChoiceManager.show(args, this);
        if (shown && boolValue(args.waitForSelection, true)) {
            this._projectRDialogueChoiceSessionId =
                ProjectRDialogueChoiceManager._sessionId;
            this.setWaitMode(waitModeName);
        }
    });

    const _Scene_Map_createDisplayObjects =
        Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this._projectRDialogueChoiceLayer =
            new Sprite_ProjectRDialogueChoiceLayer();
        this.addChild(this._projectRDialogueChoiceLayer);
        ProjectRDialogueChoiceManager.setLayer(
            this._projectRDialogueChoiceLayer
        );
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);
        ProjectRDialogueChoiceManager.update();
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        ProjectRDialogueChoiceManager.abort(true);
        ProjectRDialogueChoiceManager.clearLayer(
            this._projectRDialogueChoiceLayer
        );
        _Scene_Map_terminate.call(this);
    };

    const _Game_Interpreter_updateWaitMode =
        Game_Interpreter.prototype.updateWaitMode;
    Game_Interpreter.prototype.updateWaitMode = function() {
        if (this._waitMode === waitModeName) {
            const waiting = ProjectRDialogueChoiceManager.isWaiting(
                this._projectRDialogueChoiceSessionId
            );
            if (!waiting) {
                this._waitMode = "";
                this._projectRDialogueChoiceSessionId = 0;
            }
            return waiting;
        }
        return _Game_Interpreter_updateWaitMode.call(this);
    };

    const _Game_Interpreter_clear = Game_Interpreter.prototype.clear;
    Game_Interpreter.prototype.clear = function() {
        if (ProjectRDialogueChoiceManager.isOwnedBy(this)) {
            ProjectRDialogueChoiceManager.abort(true);
        }
        _Game_Interpreter_clear.call(this);
    };

    const _Game_Interpreter_terminate = Game_Interpreter.prototype.terminate;
    Game_Interpreter.prototype.terminate = function() {
        if (ProjectRDialogueChoiceManager.isOwnedBy(this)) {
            ProjectRDialogueChoiceManager.abort(true);
        }
        _Game_Interpreter_terminate.call(this);
    };

    const _DataManager_setupNewGame = DataManager.setupNewGame;
    DataManager.setupNewGame = function() {
        ProjectRDialogueChoiceManager.abort(true);
        _DataManager_setupNewGame.call(this);
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        ProjectRDialogueChoiceManager.abort(true);
        _DataManager_extractSaveContents.call(this, contents);
    };

    if (FullscreenDialogue) {
        const _FullscreenDialogue_advance = FullscreenDialogue.advance;
        FullscreenDialogue.advance = function() {
            if (ProjectRDialogueChoiceManager.blocksDialogueAdvance()) {
                return;
            }
            return _FullscreenDialogue_advance.apply(this, arguments);
        };

        const _FullscreenDialogue_end = FullscreenDialogue.end;
        FullscreenDialogue.end = function() {
            ProjectRDialogueChoiceManager.abort(true);
            return _FullscreenDialogue_end.apply(this, arguments);
        };
    }
})();
