/*:
 * @target MZ
 * @plugindesc プレイヤー向けの設定メニューを備えた、RPGツクールMZ用キーボード＆ゲームパッド割り当てプラグインです。
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io
 * 
 * @help
 * バージョン 1.2.5 - PREMIUM VER
 * Discordサポート：https://discord.gg/YKPscqHV8b
 * Patreon：https://www.patreon.com/SangHendrix
 * ----------------------------------------------------------------------------
 * このRPGツクールMZ用プラグインを使用すると、キーボードの任意のキーを
 * ゲームパッドに割り当てることができ、さらにプレイヤーがゲーム内で
 * キー割り当てを変更できるようになります。
 * それだけでなく、Input.isTriggeredで使用するキーの割り当てを変更したり、
 * 1回のボタン入力でコモンイベントを実行したりすることもできます。
 * ----------------------------------------------------------------------------
 * 使用方法
 * ■ RPGツクールのデフォルトボタン一覧：
 * Ok, PageDown, PageUp, Control, Shift, Tab, Escape,
 * Up, Left, Right, Down
 * 
 * ■ マウスボタン一覧：
 * leftclick, rightclick, middleclick, wheelup, wheeldown
 * 
 * ■ キーボードのキー一覧：
 * お使いのキーボードをご確認ください
 * 
 * ■ ゲームパッドのボタン名（Xbox）：
 * A, B, X, Y, LB, RB, LT, RT, Start, Back, LS-Press, RS-Press,
 * Up, Down, Left, Right
 * 
 * ■ ボタンの割り当て方法：
 * 1. 「Menu Name」を設定し、設定メニューに表示するボタン名を指定します。
 * 2. 「Key to bind」：RPGツクールのボタン一覧、またはキーボードの任意の文字キーを指定できます。
 * 3. 「-> Keyboard Key」：キーボードのキーを割り当てます
 *    （複数指定する場合はカンマで区切ります：E, Space, Enter）。
 * 4. 「-> Gamepad Key」：ゲームパッドのボタンを割り当てます
 *    （複数指定する場合はカンマで区切ります：A, X, Y）。
 * 
 * ■ 例1：Menu Name          Interact
 *         Key to bind        Ok
 *         -> Keyboard Key    E, Space, O, rightclick
 *         -> Gamepad Key     A, X, etc.
 *         -> Okの操作は、キーボードではE（メイン）、Space、O、右クリックに変更されます。
 *         -> Okの操作は、ゲームパッドではA（メイン）とXに変更されます。
 *         -> Button Configメニューでは、このボタンは「Interact」と表示されます。
 *         -> プレイヤーが割り当てを変更できるのは最初のキー（E/A）のみで、
 *            2つ目以降のキーは固定されたままです。
 * 
 * ■ 例2：Menu Name          Attack
 *         Key to bind        U（Input.isTriggered('u')で使用するU）
 *         -> Keyboard Key    U, J, leftclick
 *         -> Gamepad Key     X, Y
 *         Common Event       15
 *         -> U、J、または左クリックを入力すると、コモンイベントID 15を実行します。
 *         -> ゲームパッドのXまたはYを押すと、コモンイベントID 15を実行します。
 *         -> Button Configメニューでは、このボタンは「Attack」と表示されます。
 *         -> プレイヤーが割り当てを変更できるのはUとXのみで、
 *            JとYは固定されたままです。
 * 
 * ■ オプション機能：
 * - Common Events：設定した場合、このボタンを入力すると指定したコモンイベントを実行します。
 * - ボタンの入力判定を「Triggered」または「Pressed」から選択できます。
 * - Parallel Modeを有効にすると、他の実行中のイベントに妨げられることなく、
 *   このコモンイベントを実行できます。
 * 
 * ■ ゲーム内のメッセージに現在のボタンを表示する方法
 * 以下の制御文字を使用します：\button[menu name]
 * 
 * ■ 条件分岐で使用する方法：
 * Input.isTriggered('leftclick') | Input.isTriggered('rightclick')
 * Input.isTriggered('m') | Input.isPressed('a')
 * 基本的には、''の中に使用したいキーを指定するだけです。
 * 
 * ■ 補足：
 * コモンイベントを使用する必要はありません。
 * 単純にInput.isTriggered/Press('your key')を使用し、
 * 「your key」に対するキー割り当てを作成することもできます。
 * これは、例2からCommon Event 15の設定を省いた場合と同様です。
 * ----------------------------------------------------------------------------
 * 利用規約
 * このプラグインを正規に入手した場合、クレジット表記なしで
 * 無料・商用を問わずプロジェクトに使用することができます。      
 * ----------------------------------------------------------------------------
 * 
 * @param Show in Option Menu
 * @text Show in Option Menu
 * @type boolean
 * @default true
 * @desc Shows the button config option in the Options menu
 * 
 * @param Option Name
 * @desc The name displayed in the Options menu for player to adjust buttons
 * @default Button Config
 *
 * @param Button Config
 * @type struct<CustomButton>[]
 * @default ["{\"DisplayName\":\"\",\"From Key\":\"Up\",\"To Key\":\"W\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"0\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"\",\"From Key\":\"Left\",\"To Key\":\"A\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"\",\"From Key\":\"Right\",\"To Key\":\"D\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"\",\"From Key\":\"Down\",\"To Key\":\"S\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"Interact\",\"From Key\":\"Ok\",\"To Key\":\"E\",\"Gamepad Key\":\"\",\"Visibility\":\"Show in Button Config\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Icon\":\"0\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"Cancel\",\"From Key\":\"Cancel\",\"To Key\":\"X, B\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}","{\"DisplayName\":\"Menu\",\"From Key\":\"Menu\",\"To Key\":\"Esc, Start\",\"a\":\"\",\"aa\":\"\",\"b\":\"\",\"Common Event ID\":\"\",\"Options\":\"triggered\",\"AllowParallel\":\"false\"}"]
 * 
 * @param DisallowRebindMovementKeys
 * @text Disallow Rebind Movement Keys
 * @type boolean
 * @default true
 * @desc When ON, players cannot rebind the movement keys (Up, Down, Left, Right)
 */
/*~struct~CustomButton:
 * @param DisplayName
 * @text Menu Name
 * @desc The display name for this button (shown in menus)
 * @type string
 * @default Button Name
 * 
 * @param From Key
 * @text Key to bind
 * @desc A letter or an RPG Maker button like PageDown, Up, Left, OK...
 * @type string
 *
 * @param To Key
 * @text -> Keyboard Key
 * @desc Keyboard keys (comma for multiple keys: X, Esc, Space). Only first key to be shown in Button Config menu
 * @type string
 * 
 * @param Gamepad Key
 * @text -> Gamepad Key
 * @desc Gamepad buttons (comma for multiple buttons: A, B, X). Only first key to be shown in Button Config menu
 * @type string
 * 
 * @param Visibility
 * @text Visibility
 * @desc Control where this button appears in configuration menus
 * @type select
 * @option Show in Button Config
 * @value Show in Button Config
 * @option Hide from Button Config
 * @value Hide in Button Config
 * @option Hide from Gamepad Config
 * @value Hide from Gamepad Config
 * @option Hide from Keyboard Config
 * @value Hide from Keyboard Config
 * @default Show in Button Config
 * 
 * @param a
 * @text -------------------
 * @default ------------------
 * @param aa
 * @text ■ OPTIONALS
 * @param b
 * @text -------------------
 * @default ------------------
 * @param Icon
 * @text Menu Icon
 * @desc Icon to display in front of button name
 * @type icon
 * @default 0
 *
 * @param Common Event ID
 * @desc If assigned, this button above will trigger this common event
 * @type common_event
 * @default
 *
 * @param Options
 * @desc Choose whether the common event is triggered on key press or key release
 * @type select
 * @option Triggered
 * @value triggered
 * @option Pressed
 * @value pressed
 * @default triggered
 * 
 * @param AllowParallel
 * @text Run in parallel
 * @type boolean
 * @default false
 * @desc Allows this common event to be triggered even if another is already running
 */

var Imported = Imported || {};
Imported.Hendrix_Keyboard_Gamepad = true;

const GamepadButtons = {
    'A': 0, 'B': 1, 'X': 2, 'Y': 3, 'LB': 4, 'RB': 5, 'LT': 6, 'RT': 7,
    'Back': 8, 'Start': 9, 'LS-Press': 10, 'RS-Press': 11,
    'Up': 12, 'Down': 13, 'Left': 14, 'Right': 15
};

(function () {
    const pluginName = "Hendrix_Keyboard_Gamepad";
    const parameters = PluginManager.parameters(pluginName);
    const disallowRebindMovementKeys = parameters['DisallowRebindMovementKeys'] === 'true';
    const showInOptionMenu = parameters['Show in Option Menu'] === 'true';
    const customButtons = JSON.parse(parameters['Button Config'] || '[]').map(buttonJson => {
        const button = JSON.parse(buttonJson);
        if (button['From Key']) {
            button['From Key'] = button['From Key'].toLowerCase();
        }
        if (!button['Visibility']) {
            button['Visibility'] = 'Show in Button Config';
        }
        return button;
    });
    const pluginDefaultSettings = JSON.parse(JSON.stringify(customButtons));
    const optionName = parameters['Option Name'] || 'Button Config';

    const MOUSE_LEFT = 1000;
    const MOUSE_RIGHT = 1001;
    const MOUSE_MIDDLE = 1002;
    const MOUSE_WHEEL_UP = 1003;
    const MOUSE_WHEEL_DOWN = 1004;

    const triggeredThisFrame = new Set();

    let gamepadType = "xbox";

    const GamepadButtonDisplay = {
        xbox: {
            'A': 'A',
            'B': 'B',
            'X': 'X',
            'Y': 'Y',
            'LB': 'LB',
            'RB': 'RB',
            'Back': 'Back',
            'Start': 'Start',
            'LS-Press': 'LS',
            'RS-Press': 'RS',
            'Up': '↑',
            'Down': '↓',
            'Left': '←',
            'Right': '→',
            'LT': 'LT',
            'RT': 'RT'
        },
        ps: {
            'A': '×',
            'B': '○',
            'X': '□',
            'Y': '△',
            'LB': 'L1',
            'RB': 'R1',
            'Back': 'Share',
            'Start': 'Options',
            'LS-Press': 'L3',
            'RS-Press': 'R3',
            'Up': '↑',
            'Down': '↓',
            'Left': '←',
            'Right': '→',
            'LT': 'L2',
            'RT': 'R2'
        }
    };

    function detectGamepadType() {
        const gamepad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        if (!gamepad) return;
        const id = gamepad.id.toLowerCase();
        gamepadType = (id.includes('054c') || id.includes('playstation') ||
            id.includes('dualshock') || id.includes('dualsense') ||
            id.includes('ps')) ? "ps" : "xbox";
    }

    function getButtonDisplayText(menuName) {
        if (!menuName) return '';

        const buttonConfig = customButtons.find(button =>
            button.DisplayName && button.DisplayName.toLowerCase() === menuName.toLowerCase()
        );

        if (!buttonConfig) return menuName;

        const keyboardKeys = buttonConfig['To Key'] ? buttonConfig['To Key'].split(',').map(k => k.trim()) : [];
        const gamepadKeys = buttonConfig['Gamepad Key'] ? buttonConfig['Gamepad Key'].split(',').map(k => k.trim()) : [];

        const gamepad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
        if (gamepad && gamepad.connected && gamepadKeys.length > 0) {
            detectGamepadType();
            const gamepadKey = gamepadKeys[0];
            return GamepadButtonDisplay[gamepadType] && GamepadButtonDisplay[gamepadType][gamepadKey]
                ? GamepadButtonDisplay[gamepadType][gamepadKey]
                : gamepadKey;
        } else if (keyboardKeys.length > 0) {
            const keyboardKey = keyboardKeys[0];
            return keyboardKey ? keyboardKey.charAt(0).toUpperCase() + keyboardKey.slice(1) : '';
        }

        return menuName;
    }

    var charToKeyCode = {
        'backspace': 8, 'tab': 9, 'enter': 13, 'shift': 16, 'ctrl': 17, 'alt': 18, 'pause': 19, 'capslock': 20,
        'esc': 27, 'space': 32, 'pageup': 33, 'pagedown': 34, 'end': 35, 'home': 36, 'left': 37, 'up': 38,
        'right': 39, 'down': 40, 'insert': 45, 'delete': 46, '0': 48, '1': 49, '2': 50, '3': 51, '4': 52,
        '5': 53, '6': 54, '7': 55, '8': 56, '9': 57, 'a': 65, 'b': 66, 'c': 67, 'd': 68, 'e': 69, 'f': 70,
        'g': 71, 'h': 72, 'i': 73, 'j': 74, 'k': 75, 'l': 76, 'm': 77, 'n': 78, 'o': 79, 'p': 80, 'q': 81,
        'r': 82, 's': 83, 't': 84, 'u': 85, 'v': 86, 'w': 87, 'x': 88, 'y': 89, 'z': 90, 'windows': 91,
        'numpad0': 96, 'numpad1': 97, 'numpad2': 98, 'numpad3': 99, 'numpad4': 100, 'numpad5': 101,
        'numpad6': 102, 'numpad7': 103, 'numpad8': 104, 'numpad9': 105, 'multiply': 106, 'add': 107,
        'subtract': 109, 'decimalpoint': 110, 'divide': 111, 'f1': 112, 'f2': 113, 'f3': 114, 'f4': 115,
        'f5': 116, 'f6': 117, 'f7': 118, 'f8': 119, 'f9': 120, 'f10': 121, 'f11': 122, 'f12': 123,
        'numlock': 144, 'scrolllock': 145, 'semicolon': 186, 'equals': 187, 'comma': 188, 'dash': 189,
        'period': 190, 'forwardslash': 191, 'graveaccent': 192, 'openbracket': 219, 'backslash': 220,
        'closebracket': 221, 'singlequote': 222, 'leftclick': MOUSE_LEFT, 'rightclick': MOUSE_RIGHT,
        'middleclick': MOUSE_MIDDLE, 'wheelup': MOUSE_WHEEL_UP, 'wheeldown': MOUSE_WHEEL_DOWN
    };

    var rightClickDetector = {
        wasClicked: false,
        isPressed: false,

        reset: function () {
            this.wasClicked = false;
        },

        setClicked: function () {
            this.wasClicked = true;
            this.isPressed = true;
        },

        setReleased: function () {
            this.isPressed = false;
        }
    };

    var middleClickDetector = {
        wasClicked: false,
        isPressed: false,
        reset: function () { this.wasClicked = false; },
        setClicked: function () { this.wasClicked = true; this.isPressed = true; },
        setReleased: function () { this.isPressed = false; }
    };

    var wheelUpDetector = {
        wasTriggered: false,
        reset: function () { this.wasTriggered = false; },
        setTriggered: function () { this.wasTriggered = true; }
    };

    var wheelDownDetector = {
        wasTriggered: false,
        reset: function () { this.wasTriggered = false; },
        setTriggered: function () { this.wasTriggered = true; }
    };

    var mouseStates = {
        right: false,
        previousRight: false,
        rightTimestamp: 0
    };

    document.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('mousedown', function (e) {
        if (e.button === 0) {
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_LEFT] = true;
            }
        } else if (e.button === 1) {
            e.preventDefault();
            middleClickDetector.setClicked();
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_MIDDLE] = true;
            }
        } else if (e.button === 2) {
            mouseStates.right = true;
            mouseStates.rightTimestamp = Date.now();
            rightClickDetector.setClicked();
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_RIGHT] = true;
            }
        }
    });

    document.addEventListener('mouseup', function (e) {
        if (e.button === 0) {
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_LEFT] = false;
            }
        } else if (e.button === 1) {
            middleClickDetector.setReleased();
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_MIDDLE] = false;
            }
        } else if (e.button === 2) {
            mouseStates.right = false;
            rightClickDetector.setReleased();
            if (Input && Input._currentState) {
                Input._currentState[MOUSE_RIGHT] = false;
            }
        }
    });

    document.addEventListener('wheel', function (e) {
        if (e.deltaY < 0) {
            wheelUpDetector.setTriggered();
        } else if (e.deltaY > 0) {
            wheelDownDetector.setTriggered();
        }
    }, { passive: true });

    var _Input_clear = Input.clear;
    Input.clear = function () {
        _Input_clear.call(this);
        this._mousePressed = false;
        this._mouseTriggered = false;
    };

    var _Input_update = Input.update;
    Input.update = function () {
        _Input_update.call(this);
        this.updateMouseState();
        if (rightClickDetector.wasClicked) {
            requestAnimationFrame(() => rightClickDetector.reset());
        }
        if (middleClickDetector.wasClicked) {
            requestAnimationFrame(() => middleClickDetector.reset());
        }
        if (wheelUpDetector.wasTriggered) {
            requestAnimationFrame(() => wheelUpDetector.reset());
        }
        if (wheelDownDetector.wasTriggered) {
            requestAnimationFrame(() => wheelDownDetector.reset());
        }
    };

    Input.updateMouseState = function () {
        mouseStates.previousRight = mouseStates.right;
    };

    var _Input_isPressed = Input.isPressed;
    Input.isPressed = function (keyName) {
        if (keyName === 'leftclick') {
            const customButton = customButtons.find(button =>
                button['From Key'] && button['From Key'].toLowerCase() === 'leftclick'
            );

            if (customButton) {
                const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
                for (const key of keyboardKeys) {
                    const normalizedKey = key.toLowerCase();

                    if (normalizedKey === 'leftclick' && TouchInput.isPressed()) {
                        return true;
                    }
                }

                const gamepadKeys = customButton['Gamepad Key'] ? customButton['Gamepad Key'].split(',').map(k => k.trim()) : [];
                for (const gamepadKey of gamepadKeys) {
                    if (gamepadKey && GamepadButtons[gamepadKey] !== undefined) {
                        const gamepadButtonIndex = GamepadButtons[gamepadKey];
                        const mappedFunction = Input.gamepadMapper[gamepadButtonIndex];
                        if (mappedFunction && _Input_isPressed.call(this, mappedFunction)) {
                            return true;
                        }
                    }
                }
            } else {
                if (TouchInput.isPressed()) return true;
            }

            return _Input_isPressed.call(this, 'leftclick');
        }

        if (keyName === 'rightclick') {
            const customButton = customButtons.find(button =>
                button['From Key'] && button['From Key'].toLowerCase() === 'rightclick'
            );

            if (customButton) {
                const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
                for (const key of keyboardKeys) {
                    const normalizedKey = key.toLowerCase();

                    if (normalizedKey === 'rightclick' && mouseStates.right) {
                        return true;
                    }
                }

                const gamepadKeys = customButton['Gamepad Key'] ? customButton['Gamepad Key'].split(',').map(k => k.trim()) : [];
                for (const gamepadKey of gamepadKeys) {
                    if (gamepadKey && GamepadButtons[gamepadKey] !== undefined) {
                        const gamepadButtonIndex = GamepadButtons[gamepadKey];
                        const mappedFunction = Input.gamepadMapper[gamepadButtonIndex];
                        if (mappedFunction && _Input_isPressed.call(this, mappedFunction)) {
                            return true;
                        }
                    }
                }
            } else {
                if (mouseStates.right) return true;
            }

            return _Input_isPressed.call(this, 'rightclick');
        }

        if (keyName === 'middleclick') {
            return middleClickDetector.wasClicked;
        }

        if (keyName === 'wheelup') {
            return wheelUpDetector.wasTriggered;
        }

        if (keyName === 'wheeldown') {
            return wheelDownDetector.wasTriggered;
        }

        const customButton = customButtons.find(button =>
            button['From Key'] && button['From Key'].toLowerCase() === keyName.toLowerCase()
        );

        if (customButton) {
            const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
            for (const key of keyboardKeys) {
                const normalizedKey = key.toLowerCase();
                if (normalizedKey === 'leftclick' && TouchInput.isPressed()) return true;
                if (normalizedKey === 'rightclick' && mouseStates.right) return true;
                if (charToKeyCode[normalizedKey] && this._currentState[charToKeyCode[normalizedKey]]) return true;
            }
        }

        return _Input_isPressed.call(this, keyName);
    };

    var _Input_isTriggered = Input.isTriggered;
    Input.isTriggered = function (keyName) {
        if (keyName === 'leftclick') {
            const customButton = customButtons.find(button =>
                button['From Key'] && button['From Key'].toLowerCase() === 'leftclick'
            );

            if (customButton) {
                const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
                for (const key of keyboardKeys) {
                    const normalizedKey = key.toLowerCase();

                    if (normalizedKey === 'leftclick' && TouchInput.isTriggered()) {
                        return true;
                    }
                }

                const gamepadKeys = customButton['Gamepad Key'] ? customButton['Gamepad Key'].split(',').map(k => k.trim()) : [];
                for (const gamepadKey of gamepadKeys) {
                    if (gamepadKey && GamepadButtons[gamepadKey] !== undefined) {
                        const gamepadButtonIndex = GamepadButtons[gamepadKey];
                        const mappedFunction = Input.gamepadMapper[gamepadButtonIndex];
                        if (mappedFunction && _Input_isTriggered.call(this, mappedFunction)) {
                            return true;
                        }
                    }
                }
            } else {
                if (TouchInput.isTriggered()) return true;
            }

            return _Input_isTriggered.call(this, 'leftclick');
        }

        if (keyName === 'rightclick') {
            const customButton = customButtons.find(button =>
                button['From Key'] && button['From Key'].toLowerCase() === 'rightclick'
            );

            if (customButton) {
                const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
                for (const key of keyboardKeys) {
                    const normalizedKey = key.toLowerCase();

                    if (normalizedKey === 'rightclick' && rightClickDetector.wasClicked) {
                        return true;
                    }
                }

                const gamepadKeys = customButton['Gamepad Key'] ? customButton['Gamepad Key'].split(',').map(k => k.trim()) : [];
                for (const gamepadKey of gamepadKeys) {
                    if (gamepadKey && GamepadButtons[gamepadKey] !== undefined) {
                        const gamepadButtonIndex = GamepadButtons[gamepadKey];
                        const mappedFunction = Input.gamepadMapper[gamepadButtonIndex];
                        if (mappedFunction && _Input_isTriggered.call(this, mappedFunction)) {
                            return true;
                        }
                    }
                }
            } else {
                if (rightClickDetector.wasClicked) return true;
            }

            return _Input_isTriggered.call(this, 'rightclick');
        }

        if (keyName === 'middleclick') {
            return middleClickDetector.wasClicked;
        }

        if (keyName === 'wheelup') {
            return wheelUpDetector.wasTriggered;
        }

        if (keyName === 'wheeldown') {
            return wheelDownDetector.wasTriggered;
        }

        const customButton = customButtons.find(button =>
            button['From Key'] && button['From Key'].toLowerCase() === keyName.toLowerCase()
        );

        if (customButton) {
            const keyboardKeys = customButton['To Key'] ? customButton['To Key'].split(',').map(k => k.trim()) : [];
            for (const key of keyboardKeys) {
                const normalizedKey = key.toLowerCase();
                if (normalizedKey === 'leftclick' && TouchInput.isTriggered()) return true;
                if (normalizedKey === 'rightclick' && rightClickDetector.wasClicked) return true;
                if (charToKeyCode[normalizedKey] && this._currentState[charToKeyCode[normalizedKey]] && !this._previousState[charToKeyCode[normalizedKey]]) return true;
            }
        }

        return _Input_isTriggered.call(this, keyName);
    };

    function getMouseButtonState(button, stateType) {
        if (button === 'left') {
            return stateType === 'triggered' ? TouchInput.isTriggered() : TouchInput.isPressed();
        }

        if (button === 'right') {
            if (stateType === 'triggered') {
                const currentTime = Date.now();
                const threshold = 16;
                return mouseStates.right && (currentTime - mouseStates.rightTimestamp < threshold);
            } else if (stateType === 'pressed') {
                return mouseStates.right;
            }
        }

        return false;
    }

    function remapKeys() {
        const defaultKeyMapper = {
            9: 'tab',       // Tab
            13: 'ok',       // Enter
            16: 'shift',    // Shift
            17: 'control',  // Control
            18: 'control',  // Alt
            27: 'escape',   // Escape
            32: 'space',    // Space
            33: 'pageup',   // Page Up
            34: 'pagedown', // Page Down
            37: 'left',     // Left Arrow
            38: 'up',       // Up Arrow
            39: 'right',    // Right Arrow
            40: 'down',     // Down Arrow
            45: 'escape',   // Insert
            81: 'pageup',   // Q
            87: 'pagedown', // W
            88: 'escape',   // X
            90: 'ok',       // Z
            96: 'escape',   // Numpad 0
            98: 'down',     // Numpad 2
            100: 'left',    // Numpad 4
            102: 'right',   // Numpad 6
            104: 'up',      // Numpad 8
            120: 'debug'    // F9
        };

        const defaultGamepadMapper = {
            0: 'ok',        // A
            1: 'cancel',    // B
            2: 'shift',     // X
            3: 'menu',      // Y
            4: 'pageup',    // LB
            5: 'pagedown',  // RB
            12: 'up',       // D-pad Up
            13: 'down',     // D-pad Down
            14: 'left',     // D-pad Left
            15: 'right'     // D-pad Right
        };

        Input.keyMapper = { ...defaultKeyMapper };
        Input.gamepadMapper = { ...defaultGamepadMapper };

        Input.keyMapper[MOUSE_LEFT] = 'leftclick';
        Input.keyMapper[MOUSE_RIGHT] = 'rightclick';
        Input.keyMapper[MOUSE_MIDDLE] = 'middleclick';
        Input.keyMapper[MOUSE_WHEEL_UP] = 'wheelup';
        Input.keyMapper[MOUSE_WHEEL_DOWN] = 'wheeldown';

        for (const char in charToKeyCode) {
            const keyCode = charToKeyCode[char];
            if (typeof keyCode === 'number' && keyCode !== 120) { // Skip F9 (debug)
                if (!Input.keyMapper[keyCode]) {
                    Input.keyMapper[keyCode] = char.toLowerCase();
                }
            }
        }

        if (customButtons && customButtons.length > 0) {
            customButtons.forEach(function (buttonData) {
                const fromKey = buttonData['From Key'] ? buttonData['From Key'].toLowerCase() : '';
                if (!fromKey) return;

                const keyboardKeys = buttonData['To Key'] ? buttonData['To Key'].split(',').map(k => k.trim()) : [];
                const gamepadKeys = buttonData['Gamepad Key'] ? buttonData['Gamepad Key'].split(',').map(k => k.trim()) : [];

                let targetFunction = fromKey;
                if (fromKey === 'cancel') {
                    targetFunction = 'escape';
                }

                if (targetFunction === 'escape') {
                    for (const keyCode in Input.keyMapper) {
                        if (Input.keyMapper[keyCode] === 'escape') {
                            delete Input.keyMapper[keyCode];
                        }
                    }
                } else {
                    for (const keyCode in Input.keyMapper) {
                        if (Input.keyMapper[keyCode] === targetFunction) {
                            delete Input.keyMapper[keyCode];
                        }
                    }
                }

                for (const buttonIndex in Input.gamepadMapper) {
                    if (Input.gamepadMapper[buttonIndex] === fromKey) {
                        delete Input.gamepadMapper[buttonIndex];
                    }
                }

                keyboardKeys.forEach(function (keyboardKey) {
                    if (keyboardKey) {
                        const normalizedKey = keyboardKey.toLowerCase();
                        if (charToKeyCode[normalizedKey]) {
                            const keyCode = charToKeyCode[normalizedKey];
                            if (keyCode !== 120) {
                                Input.keyMapper[keyCode] = targetFunction;
                            }
                        }
                    }
                });

                gamepadKeys.forEach(function (gamepadKey) {
                    if (gamepadKey) {
                        if (GamepadButtons[gamepadKey] !== undefined) {
                            Input.gamepadMapper[GamepadButtons[gamepadKey]] = targetFunction;
                        }
                        else if (GamepadButtons[gamepadKey.toUpperCase()] !== undefined) {
                            Input.gamepadMapper[GamepadButtons[gamepadKey.toUpperCase()]] = targetFunction;
                        }
                        else {
                            const gpKey = Object.keys(GamepadButtons).find(
                                k => k.toLowerCase() === gamepadKey.toLowerCase()
                            );
                            if (gpKey) {
                                Input.gamepadMapper[GamepadButtons[gpKey]] = targetFunction;
                            }
                        }
                    }
                });
            });
        }

        const defaultDirectionalMap = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
        for (const idx in defaultDirectionalMap) {
            if (!Input.gamepadMapper[idx]) {
                Input.gamepadMapper[idx] = defaultDirectionalMap[idx];
            }
        }
    }

    function checkCustomButtons() {
        if (!customButtons || customButtons.length === 0) return;

        const sceneMap = SceneManager._scene;

        customButtons.forEach(button => {
            const commonEventId = Number(button['Common Event ID']);
            if (!commonEventId) return;

            const option = button['Options'] || 'triggered';
            const allowParallel = button['AllowParallel'] === 'true';

            if (option === 'triggered' && triggeredThisFrame.has(commonEventId)) {
                return;
            }

            const keyboardKeys = button['To Key'] ? button['To Key'].split(',').map(k => k.trim()) : [];
            const gamepadKeys = button['Gamepad Key'] ? button['Gamepad Key'].split(',').map(k => k.trim()) : [];

            let shouldTrigger = false;

            for (const keyboardKey of keyboardKeys) {
                if (keyboardKey) {
                    const normalizedKey = keyboardKey.toLowerCase();
                    const keyActive = normalizedKey === 'leftclick' || normalizedKey === 'rightclick'
                        ? getMouseButtonState(normalizedKey.replace('click', ''), option)
                        : (option === 'triggered' ? Input.isTriggered(normalizedKey) : Input.isPressed(normalizedKey));

                    if (keyActive) {
                        shouldTrigger = true;
                        break;
                    }
                }
            }

            if (!shouldTrigger) {
                for (const gamepadKey of gamepadKeys) {
                    if (gamepadKey) {
                        let gpButtonIndex = GamepadButtons[gamepadKey];
                        if (gpButtonIndex === undefined) {
                            gpButtonIndex = GamepadButtons[gamepadKey.toUpperCase()];
                        }
                        if (gpButtonIndex === undefined) {
                            const gpKey = Object.keys(GamepadButtons).find(
                                k => k.toLowerCase() === gamepadKey.toLowerCase()
                            );
                            if (gpKey) {
                                gpButtonIndex = GamepadButtons[gpKey];
                            }
                        }

                        if (gpButtonIndex !== undefined) {
                            const gpButtonName = Input.gamepadMapper[gpButtonIndex];
                            const buttonActive = gpButtonName &&
                                (option === 'triggered' ? Input.isTriggered(gpButtonName) : Input.isPressed(gpButtonName));
                            if (buttonActive) {
                                shouldTrigger = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (shouldTrigger) {
                if (option === 'triggered') {
                    triggeredThisFrame.add(commonEventId);
                }

                if (allowParallel) {
                    executeCommonEvent(commonEventId);
                } else if (!sceneMap.isEventRunning()) {
                    $gameTemp.reserveCommonEvent(commonEventId);
                }
            }
        });
    }

    function executeCommonEvent(eventId) {
        const commonEvent = $dataCommonEvents[eventId];
        if (commonEvent) {
            const interpreter = new Game_Interpreter();
            interpreter.setup(commonEvent.list);

            if (!$gameTemp._parallelInterpreters) {
                $gameTemp._parallelInterpreters = [];
            }

            $gameTemp._parallelInterpreters.push(interpreter);
        }
    }

    Scene_Map.prototype.isEventRunning = function () {
        return $gameMap.isEventRunning() || $gameMessage.isBusy();
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (this.isActive()) {
            triggeredThisFrame.clear();
            checkCustomButtons();
            if ($gameTemp._parallelInterpreters) {
                $gameTemp._parallelInterpreters = $gameTemp._parallelInterpreters.filter(interpreter => {
                    if (interpreter.isRunning()) {
                        interpreter.update();
                        return true;
                    }
                    return false;
                });
            }
        }
    };

    //=============================================================================
    // Scene_ButtonConfig
    //=============================================================================

    function Scene_ButtonConfig() {
        this.initialize(...arguments);
    }

    Scene_ButtonConfig.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_ButtonConfig.prototype.constructor = Scene_ButtonConfig;

    Scene_ButtonConfig.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
        this._capturingInput = false;
        this._selectedItem = null;
        this._captureCategory = "";
        this._keyListener = null;
        this._isProcessingBinding = false;
    };

    Scene_ButtonConfig.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createCategoryWindow();
        this.createListWindow();
        detectGamepadType();
    };

    Scene_ButtonConfig.prototype.createCategoryWindow = function () {
        const rect = this.categoryWindowRect();
        this._categoryWindow = new Window_ButtonCategory(rect);
        this._categoryWindow.setHandler("keyboard", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("gamepad", this.onCategoryOk.bind(this));
        this._categoryWindow.setHandler("cancel", this.popScene.bind(this));
        this.addWindow(this._categoryWindow);
    };

    Scene_ButtonConfig.prototype.categoryWindowRect = function () {
        const ww = Graphics.boxWidth;
        const wh = this.calcWindowHeight(1, true);
        const wx = 0;
        const wy = this.mainAreaTop();
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ButtonConfig.prototype.createListWindow = function () {
        const rect = this.listWindowRect();
        this._listWindow = new Window_ButtonList(rect);
        this._listWindow.setScene(this);
        this._listWindow.setHandler("ok", this.onButtonSelect.bind(this));
        this._listWindow.setHandler("cancel", this.onListCancel.bind(this));
        this._categoryWindow.setListWindow(this._listWindow);
        this.addWindow(this._listWindow);
    };

    Scene_ButtonConfig.prototype.listWindowRect = function () {
        const ww = Graphics.boxWidth;
        const wh = Graphics.boxHeight - this._categoryWindow.height - this.mainAreaTop();
        const wx = 0;
        const wy = this._categoryWindow.y + this._categoryWindow.height;
        return new Rectangle(wx, wy, ww, wh);
    };

    Scene_ButtonConfig.prototype.onCategoryOk = function () {
        this._listWindow.activate();
        this._listWindow.select(0);
    };

    Scene_ButtonConfig.prototype.onListCancel = function () {
        this._listWindow.deselect();
        this._categoryWindow.activate();
    };

    Scene_ButtonConfig.prototype.onButtonSelect = function () {
        const item = this._listWindow.item();
        if (!item) {
            this._listWindow.activate();
            return;
        }

        if (item.type === 'command' && item.key === 'reset') {
            this.resetToDefaultConfig();
        } else {
            this.beginInputCapture(item);
        }
    };

    Scene_ButtonConfig.prototype.beginInputCapture = function (item) {
        this._selectedItem = item;
        this._listWindow.refresh();
        this._capturingInput = true;
        this._captureCategory = this._categoryWindow.currentSymbol();

        if (this._captureCategory === "gamepad") {
            this._gamepadBindingStarted = false;
            this._gamepadBindingDelay = 0;
            this._previousGamepadState = null;
        }
    };

    Scene_ButtonConfig.prototype.resetToDefaultConfig = function () {
        const freshDefaults = JSON.parse(JSON.stringify(pluginDefaultSettings));
        customButtons.length = 0;
        customButtons.push(...freshDefaults);

        parameters['Button Config'] = JSON.stringify(customButtons);
        Input.keyMapper = {};
        Input.gamepadMapper = {};
        Input.keyMapper[MOUSE_LEFT] = 'leftclick';
        Input.keyMapper[MOUSE_RIGHT] = 'rightclick';
        remapKeys();
        ConfigManager.save();

        this._listWindow.refresh();
        this._listWindow.activate();
    };

    Scene_ButtonConfig.prototype.update = function () {
        Scene_MenuBase.prototype.update.call(this);

        if (this._capturingInput) {
            this.updateInputCapture();
        }
    };

    Scene_ButtonConfig.prototype.updateInputCapture = function () {
        if (this._captureCategory === "keyboard" && Input.isTriggered('cancel')) {
            this.cleanupListeners();
            this.cancelInputCapture();
            return;
        }

        if (this._captureCategory === "keyboard") {
            if (!this._keyListener && !this._mouseListener) {
                this._keyListener = this._onKeyDown.bind(this);
                this._mouseListener = this._onMouseDown.bind(this);
                this._wheelListener = this._onWheel.bind(this);
                document.addEventListener('keydown', this._keyListener);
                document.addEventListener('mousedown', this._mouseListener);
                document.addEventListener('wheel', this._wheelListener);
            }
        } else if (this._captureCategory === "gamepad") {
            if (!this._gamepadBindingStarted) {
                this._gamepadBindingStarted = true;
                this._gamepadBindingDelay = 20;
                return;
            }

            if (this._gamepadBindingDelay > 0) {
                this._gamepadBindingDelay--;
                return;
            }

            const gamepad = navigator.getGamepads ? navigator.getGamepads()[0] : null;
            if (gamepad) {
                if (!this._previousGamepadState) {
                    this._previousGamepadState = Array.from(gamepad.buttons).map(btn => btn.pressed);
                    return;
                }

                for (const buttonName in GamepadButtons) {
                    const buttonIndex = GamepadButtons[buttonName];
                    if (gamepad.buttons[buttonIndex] && gamepad.buttons[buttonIndex].pressed &&
                        !this._previousGamepadState[buttonIndex]) {
                        this.processNewBinding(buttonName);
                        return;
                    }
                }
                this._previousGamepadState = Array.from(gamepad.buttons).map(btn => btn.pressed);
            }
        }
    };

    Scene_ButtonConfig.prototype._onMouseDown = function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        let mouseButton = null;
        if (event.button === 0) {
            mouseButton = 'leftclick';
        } else if (event.button === 1) {
            mouseButton = 'middleclick';
        } else if (event.button === 2) {
            mouseButton = 'rightclick';
        }

        this.cleanupListeners();

        if (mouseButton) {
            setTimeout(() => {
                this.processNewBinding(mouseButton);
            }, 50);
        } else {
            this.cancelInputCapture();
        }
    };

    Scene_ButtonConfig.prototype._onWheel = function (event) {
        const wheelButton = event.deltaY < 0 ? 'wheelup' : 'wheeldown';
        this.cleanupListeners();
        setTimeout(() => {
            this.processNewBinding(wheelButton);
        }, 50);
    };

    Scene_ButtonConfig.prototype._onKeyDown = function (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        let keyName = null;
        for (const key in charToKeyCode) {
            if (charToKeyCode[key] === event.keyCode) {
                keyName = key;
                break;
            }
        }
        this.cleanupListeners();

        if (keyName) {
            setTimeout(() => {
                this.processNewBinding(keyName);
            }, 50);
        } else {
            this.cancelInputCapture();
        }
    };

    Scene_ButtonConfig.prototype.cleanupListeners = function () {
        if (this._keyListener) {
            document.removeEventListener('keydown', this._keyListener);
            this._keyListener = null;
        }
        if (this._mouseListener) {
            document.removeEventListener('mousedown', this._mouseListener);
            this._mouseListener = null;
        }
        if (this._wheelListener) {
            document.removeEventListener('wheel', this._wheelListener);
            this._wheelListener = null;
        }
    };

    Scene_ButtonConfig.prototype.cleanupKeyListener = function () {
        this.cleanupListeners();
    };

    Scene_ButtonConfig.prototype.cancelInputCapture = function () {
        this._capturingInput = false;
        this._isProcessingBinding = false;
        this._selectedItem = null;
        this._gamepadBindingStarted = false;
        this._previousGamepadState = null;
        this.cleanupListeners();
        this._listWindow.refresh();

        setTimeout(() => {
            this._listWindow.activate();
        }, 100);
    };

    Window_ButtonList.prototype.drawCommandItem = function (item, rect) {
        this.changeTextColor(ColorManager.systemColor());
        this.drawText(item.name, rect.x, rect.y, rect.width, 'center');
        this.resetTextColor();
    };

    Window_ButtonList.prototype.drawButtonItem = function (item, rect) {
        const nameWidth = rect.width * 0.4;
        const inputWidth = rect.width * 0.6;
        this.drawText(item.name, rect.x + 4, rect.y, nameWidth - 8);
        const inputText = this.getBindingText(item);
        const isRemapping = this.isItemBeingRemapped(item);
        if (isRemapping) {
            this.changeTextColor(ColorManager.powerUpColor());
        }
        this.drawText(inputText, rect.x + nameWidth, rect.y, inputWidth - 8, 'center');
        this.resetTextColor();
    };

    Window_ButtonList.prototype.isItemBeingRemapped = function (item) {
        return this._scene &&
            this._scene._capturingInput &&
            this._scene._selectedItem &&
            this._scene._selectedItem === item;
    };

    Window_ButtonList.prototype.getBindingText = function (item) {
        if (this._category === "keyboard") {
            return this.formatKeyboardKey(item.keyboard);
        } else {
            let text = this.formatGamepadButton(item.gamepad);
            return text;
        }
    };

    Scene_ButtonConfig.prototype.processNewBinding = function (keyName) {
        if (!keyName || !this._selectedItem || this._isProcessingBinding) return;

        this._isProcessingBinding = true;
        if (disallowRebindMovementKeys) {
            const movementKeys = ['up', 'down', 'left', 'right'];
            if (movementKeys.includes(keyName.toLowerCase())) {
                this._isProcessingBinding = false;
                this._capturingInput = false;
                this._selectedItem = null;
                this._gamepadBindingStarted = false;
                this._previousGamepadState = null;
                this._listWindow.refresh();

                setTimeout(() => {
                    this._listWindow.activate();
                }, 100);
                return;
            }
        }

        const customIndex = this._selectedItem.customIndex;

        if (customIndex !== undefined && customIndex !== null) {
            const customButton = customButtons[customIndex];

            if (customButton) {
                let conflictingButtonIndex = -1;

                if (this._captureCategory === "keyboard") {
                    conflictingButtonIndex = customButtons.findIndex((button, idx) => {
                        if (idx === customIndex) return false;

                        const buttonToKey = button['To Key'] ?
                            button['To Key'].split(',').map(k => k.trim()) : [''];

                        return buttonToKey[0] && buttonToKey[0].toLowerCase() === keyName.toLowerCase();
                    });

                    const existingToKey = customButton['To Key'] ?
                        customButton['To Key'].split(',').map(k => k.trim()) :
                        [''];

                    if (conflictingButtonIndex >= 0) {
                        const conflictingButton = customButtons[conflictingButtonIndex];
                        const conflictingToKey = conflictingButton['To Key'] ?
                            conflictingButton['To Key'].split(',').map(k => k.trim()) :
                            [''];

                        const currentKeyboardMapping = existingToKey[0] || '';

                        existingToKey[0] = keyName;
                        customButton['To Key'] = existingToKey.join(', ');

                        conflictingToKey[0] = currentKeyboardMapping;
                        conflictingButton['To Key'] = conflictingToKey.join(', ');
                    } else {
                        existingToKey[0] = keyName;
                        customButton['To Key'] = existingToKey.join(', ');
                    }

                    this._selectedItem.keyboard = keyName;

                } else { // Gamepad mapping
                    conflictingButtonIndex = customButtons.findIndex((button, idx) => {
                        if (idx === customIndex) return false;

                        const buttonGamepadKey = button['Gamepad Key'] ?
                            button['Gamepad Key'].split(',').map(k => k.trim()) : [''];

                        return buttonGamepadKey[0] && buttonGamepadKey[0].toLowerCase() === keyName.toLowerCase();
                    });

                    const existingGamepadKey = customButton['Gamepad Key'] ?
                        customButton['Gamepad Key'].split(',').map(k => k.trim()) :
                        [''];

                    if (existingGamepadKey.length < 2) {
                        existingGamepadKey[1] = '';
                    }

                    if (conflictingButtonIndex >= 0) {
                        const conflictingButton = customButtons[conflictingButtonIndex];
                        const conflictingGamepadKey = conflictingButton['Gamepad Key'] ?
                            conflictingButton['Gamepad Key'].split(',').map(k => k.trim()) :
                            [''];

                        if (conflictingGamepadKey.length < 2) {
                            conflictingGamepadKey[1] = '';
                        }

                        const currentGamepadMapping = existingGamepadKey[0] || '';
                        existingGamepadKey[0] = keyName;
                        customButton['Gamepad Key'] = existingGamepadKey.join(', ');
                        conflictingGamepadKey[0] = currentGamepadMapping;
                        conflictingButton['Gamepad Key'] = conflictingGamepadKey.join(', ');
                    } else {
                        existingGamepadKey[0] = keyName;
                        customButton['Gamepad Key'] = existingGamepadKey.join(', ');
                    }

                    this._selectedItem.gamepad = keyName;
                }

                parameters['Button Config'] = JSON.stringify(customButtons);
            }
        }

        remapKeys();
        ConfigManager.save();

        this._capturingInput = false;
        this._selectedItem = null;
        this._gamepadBindingStarted = false;
        this._previousGamepadState = null;
        this._listWindow.refresh();

        setTimeout(() => {
            this._isProcessingBinding = false;
            this._listWindow.activate();
            Input.clear();
            mouseStates.previousRight = mouseStates.right;
        }, 200);
    };

    Window_ButtonList.prototype.processCursorMove = function () {
        if (this._scene && this._scene._isProcessingBinding) {
            return;
        }

        Window_Selectable.prototype.processCursorMove.call(this);
    };

    Window_ButtonList.prototype.processHandling = function () {
        if (this._scene && this._scene._isProcessingBinding) {
            return;
        }

        Window_Selectable.prototype.processHandling.call(this);
    };

    //=============================================================================
    // Window_ButtonCategory
    //=============================================================================

    function Window_ButtonCategory() {
        this.initialize(...arguments);
    }

    Window_ButtonCategory.prototype = Object.create(Window_HorzCommand.prototype);
    Window_ButtonCategory.prototype.constructor = Window_ButtonCategory;

    Window_ButtonCategory.prototype.initialize = function (rect) {
        Window_HorzCommand.prototype.initialize.call(this, rect);
    };

    Window_ButtonCategory.prototype.maxCols = function () {
        return 2;
    };

    Window_ButtonCategory.prototype.makeCommandList = function () {
        this.addCommand("Keyboard", "keyboard");
        this.addCommand("Gamepad", "gamepad");
    };

    Window_ButtonCategory.prototype.setListWindow = function (listWindow) {
        this._listWindow = listWindow;
        this.updateList();
    };

    Window_ButtonCategory.prototype.updateList = function () {
        if (this._listWindow) {
            this._listWindow.setCategory(this.currentSymbol());
        }
    };

    Window_ButtonCategory.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        this.updateList();
    };

    //=============================================================================
    // Window_ButtonList
    //=============================================================================

    function Window_ButtonList() {
        this.initialize(...arguments);
    }

    Window_ButtonList.prototype = Object.create(Window_Selectable.prototype);
    Window_ButtonList.prototype.constructor = Window_ButtonList;

    Window_ButtonList.prototype.initialize = function (rect) {
        Window_Selectable.prototype.initialize.call(this, rect);
        this._category = "keyboard";
        this._data = [];
        this._scene = null;
        this.refresh();
    };

    Window_ButtonList.prototype.setScene = function (scene) {
        this._scene = scene;
    };

    Window_ButtonList.prototype.maxItems = function () {
        return this._data.length;
    };

    Window_ButtonList.prototype.item = function () {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    };

    Window_ButtonList.prototype.setCategory = function (category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
        }
    };

    Window_ButtonList.prototype.makeItemList = function () {
        this._data = [];
        const customButtonsList = customButtons
            .map((button, originalIndex) => ({ button, originalIndex }))
            .filter(item => {
                if (item.button['Visibility'] === 'Hide in Button Config') {
                    return false;
                }
                if (this._category === 'keyboard' &&
                    item.button['Visibility'] === 'Hide from Keyboard Config') {
                    return false;
                }
                if (this._category === 'gamepad' &&
                    item.button['Visibility'] === 'Hide from Gamepad Config') {
                    return false;
                }
                return true;
            })
            .map(item => {
                const keyboardKeys = item.button['To Key'] ? item.button['To Key'].split(',').map(k => k.trim()) : [];
                const gamepadKeys = item.button['Gamepad Key'] ? item.button['Gamepad Key'].split(',').map(k => k.trim()) : [];

                return {
                    type: 'custom',
                    key: item.button['From Key'] || '',
                    name: item.button.DisplayName || '',
                    icon: Number(item.button['Icon']) || 0,
                    fromKey: item.button['From Key'] || '',
                    keyboardKeys: keyboardKeys,
                    gamepadKeys: gamepadKeys,
                    customIndex: item.originalIndex,
                    commonEventId: Number(item.button['Common Event ID']) || 0
                };
            });

        this._data = [...customButtonsList, {
            type: 'command',
            key: 'reset',
            name: 'Reset to Default',
            keyboardKeys: [],
            gamepadKeys: [],
            icon: 0
        }];
    };

    Window_ButtonList.prototype.drawItem = function (index) {
        const item = this._data[index];
        if (!item) return;

        const rect = this.itemLineRect(index);

        if (item.type === 'command') {
            this.changeTextColor(ColorManager.systemColor());
            this.drawText(item.name, rect.x, rect.y, rect.width, 'center');
            this.resetTextColor();
            return;
        }

        const nameWidth = rect.width * 0.4;
        const inputWidth = rect.width * 0.6;

        let nameX = rect.x + 4;
        if (item.icon && item.icon > 0) {
            this.drawIcon(item.icon, nameX, rect.y + 2);
            nameX += ImageManager.iconWidth + 15;
        }
        const nameWidthAdjusted = item.icon && item.icon > 0 ?
            nameWidth - (ImageManager.iconWidth + 8) : nameWidth - 8;
        this.drawText(item.name, nameX, rect.y, nameWidthAdjusted);

        let displayText = '';

        if (this._category === "keyboard") {
            const keyboardKeys = item.keyboardKeys || [];
            displayText = keyboardKeys.length > 0 ? this.formatKeyboardKey(keyboardKeys[0]) : '';
        } else {
            const gamepadKeys = item.gamepadKeys || [];
            displayText = gamepadKeys.length > 0 ? this.formatGamepadButton(gamepadKeys[0]) : '';
        }

        const isRemapping = this._scene &&
            this._scene._capturingInput &&
            this._scene._selectedItem &&
            this._scene._selectedItem === item;

        if (isRemapping) {
            this.changeTextColor(ColorManager.powerUpColor());
        }

        this.drawText(displayText, rect.x + nameWidth, rect.y, inputWidth - 8, 'center');
        this.resetTextColor();
    };

    Window_ButtonList.prototype.formatKeyboardKey = function (keyName) {
        if (!keyName) return '';
        const lower = keyName.toLowerCase();
        if (lower === 'leftclick') return 'Left Click';
        if (lower === 'rightclick') return 'Right Click';
        if (lower === 'middleclick') return 'Middle Click';
        if (lower === 'wheelup') return 'Wheel Up';
        if (lower === 'wheeldown') return 'Wheel Down';
        return keyName.charAt(0).toUpperCase() + keyName.slice(1);
    };

    Window_ButtonList.prototype.formatGamepadButton = function (buttonName) {
        if (!buttonName) return '';
        detectGamepadType();
        if (GamepadButtonDisplay[gamepadType] && GamepadButtonDisplay[gamepadType][buttonName]) {
            return GamepadButtonDisplay[gamepadType][buttonName];
        }
        return buttonName;
    };

    Window_ButtonList.prototype.refresh = function () {
        this.makeItemList();
        Window_Selectable.prototype.refresh.call(this);
    };

    //=============================================================================
    // Scene_Menu integration
    //=============================================================================

    const _Window_Options_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function () {
        _Window_Options_makeCommandList.call(this);
        if (showInOptionMenu) {
            this.addCommand(optionName, "buttonConfig");
        }
    };

    const _Window_Options_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function () {
        const index = this.index();
        const symbol = this.commandSymbol(index);
        if (symbol === "buttonConfig") {
            this.playOkSound();
            SceneManager.push(Scene_ButtonConfig);
        } else {
            _Window_Options_processOk.call(this);
        }
    };

    const _Window_Options_statusText = Window_Options.prototype.statusText;
    Window_Options.prototype.statusText = function (index) {
        const symbol = this.commandSymbol(index);
        if (symbol === "buttonConfig") {
            return "";
        } else {
            return _Window_Options_statusText.call(this, index);
        }
    };

    window.Scene_ButtonConfig = Scene_ButtonConfig;
    window.HendrixGamepad = {
        detectGamepadType: function () {
            detectGamepadType();
        },

        getGamepadButtonForAction: function (action) {
            detectGamepadType();
            action = action.toLowerCase();
            for (const buttonCode in Input.gamepadMapper) {
                if (Input.gamepadMapper[buttonCode].toLowerCase() === action) {
                    for (const buttonName in GamepadButtons) {
                        if (GamepadButtons[buttonName] == buttonCode) {
                            if (gamepadType === "ps") {
                                return GamepadButtonDisplay.ps[buttonName] || buttonName;
                            } else {
                                return GamepadButtonDisplay.xbox[buttonName] || buttonName;
                            }
                        }
                    }
                }
            }
            return '';
        },

        getKeyboardKeyForAction: function (action) {
            action = action.toLowerCase();
            for (const keyCode in Input.keyMapper) {
                if (Input.keyMapper[keyCode].toLowerCase() === action) {
                    for (const keyName in charToKeyCode) {
                        if (charToKeyCode[keyName] == keyCode) {
                            return keyName;
                        }
                    }
                }
            }
            return '';
        }
    };

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        const config = _ConfigManager_makeData.call(this);
        const playerOverrides = {};

        customButtons.forEach((currentButton, index) => {
            const originalButton = pluginDefaultSettings[index];
            const fromKey = currentButton['From Key'];

            if (!originalButton || !fromKey) return;

            const keyboardChanged = currentButton['To Key'] !== originalButton['To Key'];
            const gamepadChanged = currentButton['Gamepad Key'] !== originalButton['Gamepad Key'];

            if (keyboardChanged || gamepadChanged) {
                playerOverrides[fromKey] = {
                    keyboard: currentButton['To Key'],
                    gamepad: currentButton['Gamepad Key']
                };
            }
        });

        if (Object.keys(playerOverrides).length > 0) {
            config.buttonOverrides = JSON.stringify(playerOverrides);
        }

        return config;
    };

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _ConfigManager_applyData.call(this, config);

        if (config.buttonOverrides) {
            const freshDefaults = JSON.parse(JSON.stringify(pluginDefaultSettings));
            const playerOverrides = JSON.parse(config.buttonOverrides);

            freshDefaults.forEach((button) => {
                const fromKey = button['From Key'];
                if (playerOverrides[fromKey]) {
                    button['To Key'] = playerOverrides[fromKey].keyboard;
                    button['Gamepad Key'] = playerOverrides[fromKey].gamepad;
                }
            });

            customButtons.length = 0;
            customButtons.push(...freshDefaults);
        }

        parameters['Button Config'] = JSON.stringify(customButtons);
        remapKeys();
    };
    remapKeys();

    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function (text) {
        text = _Window_Base_convertEscapeCharacters.call(this, text);

        // \button[menu name]
        text = text.replace(/\x1b(?:BUTTON|button)\[([^\]]+)\]/gi, function () {
            const menuName = arguments[1];
            return getButtonDisplayText(menuName);
        });

        return text;
    };
})();