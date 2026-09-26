/*:
 * @target MZ
 * @plugindesc ドラッグ＆ドロップで画面上にホットバーを作成します
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io
 * 
 * @help
 * バージョン 2.0.7a
 * サポートが必要な場合は、以下よりお問い合わせください：
 * Discord: https://discord.gg/YKPscqHV8b
 * Patreon: https://www.patreon.com/SangHendrix
 * ----------------------------------------------------------------------------
 * このRPGツクールMZ用プラグインを使用すると、ホットバー／クイック使用スロットの
 * UIをリアルタイムで簡単に作成できます。
 * ----------------------------------------------------------------------------
 * 使用方法
 * ----------------------------------------------------------------------------
 * ゲームをテストプレイ > 画面右下のボタンをクリック > 自由に操作してみましょう！
 * まずGridを作成し、そのGridを選択してスロットを作成します。
 * マウスを使ってGridやスロットを画面上の好きな場所にドラッグできます。
 * ----------------------------------------------------------------------------
 * 
 * ■■ スロットパラメータの説明 ■■
 * 
 * - Slot Name:         アイテムやスキルを装備する際にスロット一覧が表示され、
 *                      この名前が一覧に表示されます。
 * - Button Text:       スロット上に表示するテキストです。
 *                      キーボード／ゲームパッドのボタンを表示できます。
 * - Special Behavior:
 *   + Display Equipped Weapon: 装備中の武器をこのスロットに自動的に表示します。
 *   + Display Equipped Shield: 上記と同様に、装備中の盾を表示します。
 *   + Item Slot Only: このスロットにはアイテムのみ設定できます。
 *   + Skill Slot Only: 上記と同様に、スキルのみ設定できます。
 * 
 *   + 例：      Slot Name: Slot 1
 *               Button Text: Q（キーボード）, RB（ゲームパッド）（任意）
 *               Special Behavior: none
 *            -> ゲームパッドが接続されている場合、Button TextにはRBが表示されます。
 * 
 * ■■ アイテム／武器／スキル／防具のメモタグ ■■
 * 
 * <slot text: x, (optional: offset x, y)>   # このアイテムが設定されたスロットにテキストを表示します
 * <slot image: x>                           # pictures/slotUIフォルダ内のカスタム画像を使用します
 * <slot cooldown: seconds, show number?>    # このアイテムのクールダウン時間を設定します
 * <slot disallow>                           # このアイテムをスロットに設定できないようにします
 * 
 * 例：<slot text: haha> または <slot text: haha, 0, -30>
 *     <slot image: Potion>
 *     <slot cooldown: 5> または <slot cooldown: 5, false>（カウントダウンを表示しない）
 * 
 * ----------------------------------------------------------------------------
 * 利用規約
 * ----------------------------------------------------------------------------
 * https://www.rpgmakeractioncombat.com/p/sang-hendrixs-rpg-maker-plugin-terms-of.html
 * ----------------------------------------------------------------------------
 * @command aa
 * @text ---------------------------------
 * 
 * @command ---c
 * @text ■ GENERAL USES
 * 
 * @command aaa
 * @text ---------------------------------
 * 
 * @command HotbarInputStatus
 * @text Hotbar Input Status
 * @desc Allow or disable player hotbar input
  * 
 * @arg Status
 * @type boolean
 * @text Allow Hotbar Input
 * @desc Allow player to use hotbar
 * @default true
 * 
 * @command LockSlot
 * @text Lock/Unlock Slot
 * @desc Lock or unlock a slot to prevent equipping/unequipping items
 * 
 * @arg SlotName
 * @type string
 * @text Slot Name
 * @desc The name of the slot to lock/unlock
 * 
 * @arg Lock
 * @type boolean
 * @text Lock Slot
 * @desc True: Lock. False: Unlock
 * @default true
 * 
 * @command UseSelectedSlot
 * @text Gamepad  | Use Selected Slot
 * @desc Uses whatever item or skill is equipped in the currently selected slot
 * 
 * @command UseSlot
 * @text Keyboard | Use a Slot
 * @desc Uses whatever item or skill is equipped in the specified slot
 * 
 * @arg Name
 * @type text
 * @text Slot Name
 * @desc The name of the slot to use
 * 
 * @command aax
 * @text ---------------------------------
 * 
 * @command ---v
 * @text ■ ONLY FOR MANUAL USES
 * 
 * @command aaax
 * @text ---------------------------------
 * 
 * @command SetSkill
 * @text Push to Slot
 * @desc Put something to a slot. Can be an item, a weapon or a skill.
 * 
 * @arg Name
 * @type text
 * @text Slot Name
 * @desc The name of the slot to set
 * 
 * @arg skillId
 * @type skill
 * @text Skill
 * @desc The skill to set in this slot
 * @default 0
 * 
 * @arg itemId
 * @type item
 * @text Item
 * @desc The item to set in this slot
 * @default 0
 * 
 * @arg weaponId
 * @type weapon
 * @text Weapon
 * @desc The weapon to set in this slot
 * @default 0
 * 
 * @command RemoveFromSlot
 * @text Remove from Slot
 * @desc Removes whatever is in the specified slot
 * 
 * @arg Name
 * @type text
 * @text Slot Name
 * @desc The name of the slot to clear
 * 
 * @command PushNextStuff
 * @text Keyboard |  Push Next Available Item
 * @desc Pushes the next available weapon/shield/item/skill to the specified slot
 * 
 * @arg Name
 * @type text
 * @text Slot Name
 * @desc The name of the slot to push to
 * 
 * @arg Type
 * @type select
 * @option Weapon
 * @option Shield
 * @option Item
 * @option Skill
 * @text Item Type
 * @desc Type of item to push to the slot
 * 
 * @command GamepadPushNextStuff
 * @text Gamepad  |  Push Next Available Item
 * @desc Pushes the next available weapon/shield/item/skill to the currently selected slot
 * 
 * @arg Type
 * @type select
 * @option Weapon
 * @option Shield
 * @option Item
 * @option Skill
 * @text Item Type
 * @desc Type of item to push to the selected slot
 * 
 * @command AllowItemUse
 * @text Allow/Disallow Things Use
 * @desc Control whether specific items, weapons, armors, or skills can be used in the hotbar
 * 
 * @arg TargetType
 * @type select
 * @option Item
 * @value item
 * @option Weapon
 * @value weapon
 * @option Armor
 * @value armor
 * @option Skill
 * @value skill
 * @text Target Type
 * @desc Type of item to allow/disallow
 * @default item
 * 
 * @arg TargetIdName
 * @type text
 * @text Target ID/Name
 * @desc ID or Name of the item, weapon, armor, or skill. Support expressions.
 * @default 1
 * 
 * @arg Status
 * @type boolean
 * @text Allow Use
 * @desc True: Allow use in hotbar. False: Disallow use in hotbar
 * @default true
 * 
 * @param showHotbarButton
 * @text Show Hotbar Button
 * @type boolean
 * @desc Show the button to open the Hotbar visual editor. Turns off automatically on deployment.
 * @default true
 * 
 * @param 5cccccxcxczxczxc
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wcc
 * @text ■ SLOT SETTINGS
 * 
 * @param 6cc
 * @text --------------------------
 * @default --------------------------
 * 
 * @param GamepadCursorImage
 * @text Gamepad Cursor Image
 * @type file
 * @dir img/system
 * @desc Image to use as cursor when using gamepad
 * @default
 * 
 * @param EmptySlotIcon
 * @text Empty Slot Icon
 * @type icon
 * @desc The icon for unoccupied slot in window slot selection.
 * @default 16
 * 
 * @param GamepadUseSlotButton
 * @text Gamepad Use Slot Button
 * @type select
 * @option None
 * @value none
 * @option A
 * @value A
 * @option B
 * @value B
 * @option X
 * @value X
 * @option Y
 * @value Y
 * @option LB
 * @value LB
 * @option RB
 * @value RB
 * @option LT
 * @value LT
 * @option RT
 * @value RT
 * @option Back
 * @value Back
 * @option Start
 * @value Start
 * @desc Gamepad button to use the currently selected slot
 * @default A
 * 
 * @param TouchInput
 * @text Touch Input
 * @type boolean
 * @desc Allow players to touch/click slots to use item from that slot
 * @default false
 * 
 * @param AllowEquipNonUsable
 * @text Equip Non-usable Stuff
 * @type boolean
 * @desc Allow equipping skills/items that are not usable in menu to hotbar slots
 * @default true
 * 
 * @param PartyMembersHotbar
 * @text Party Members Hotbar
 * @parent SlotSettings
 * @type boolean
 * @on Enable
 * @off Disable
 * @desc Allow each party members to have unique hotbar slots for equipping skills.
 * @default true
 * 
 * @param 1z
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1
 * @text ■ VISIBILITY SETTINGS
 * 
 * @param 2zz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param VisibilitySwitch
 * @text UI Visibility Switch
 * @type switch
 * @desc If ON, UI will be visible. If OFF, UI will be hidden. 0 to always ON.
 * @default 0
 * 
 * @param hideWhenOnPlayer
 * @text Hide UI when On Player
 * @type boolean
 * @desc Fade UI when the player is behind it
 * @default true
 * 
 * @param HideUIduringMessage
 * @text Hide UI during Message
 * @type boolean
 * @desc Fade UI when a message window is open
 * @default true
 * 
 * @param ShowZeroQuantity
 * @text Show Zero Quantity
 * @type boolean
 * @desc Show quantity even when it's zero
 * @default false
 * 
 * @param UnequipEmptyItems
 * @text Unequip Empty Items
 * @type boolean
 * @desc Unequip items when their quantity reaches zero
 * @default true
 * 
 * @param 3z
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wz
 * @text ■ TEXT ON SLOT
 * 
 * @param 4zz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param ShowItemQuantity
 * @text Show Item Quantity
 * @type boolean
 * @desc Shows the quantity of items in slots
 * @default true
 * 
 * @param QuantityTextOffsetY
 * @text Quantity Text Height
 * @type number
 * @min -9999
 * @desc Vertical offset for the quantity text
 * @default 0
 * 
 * @param ShowManaCost
 * @text Show Mana Cost
 * @type boolean
 * @desc Show mana/MP cost if the slot is equipped with a skill
 * @default false
 * 
 * @param ManaCostHeight
 * @text Mana Cost Height
 * @type number
 * @min -9999
 * @desc Vertical offset for the mana cost text
 * @default 0
 * 
 * @param 3zxcxewr
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wz23412edsd
 * @text ■ BUTTON ICON REPLACEMENT
 * 
 * @param 4zzxcxbsdf
 * @text --------------------------
 * @default --------------------------
 * 
 * @param IconReplacements
 * @text Icon Replacements
 * @type struct<IconReplacement>[]
 * @desc Replace button text with icons
 * @default []
 * 
 * @param IconMaxSize
 * @text Icon Size
 * @type number
 * @desc Size for button icons
 * @default 24
 * 
 * @param 3zxcqwe123
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wzcv
 * @text ■ WINDOW SETTINGS
 * 
 * @param 4zzdd
 * @text --------------------------
 * @default --------------------------
 * 
 * @param WindowSelectionSize
 * @text Window Size
 * @type string
 * @desc Format: Width, number of commands show by default. This window will show when you assign item/skill to hotbar.
 * @default 400, 8
 * 
 * @param UseNowText
 * @text Use Now Text
 * @type string
 * @desc Text to display for the "Use Now" option in slot selection window
 * @default Use Now
 * 
 * @param EmptySlotText
 * @text Empty Slot Text
 * @type string
 * @desc Text to display for empty slots in slot selection window
 * @default Empty
 * 
 * @param 7xczz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wx
 * @text ■ FONT SETTINGS
 * 
 * @param 8xczz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param FontSettings
 * @text Font Settings
 * @type struct<FontSettings>
 * @desc Font settings for UI text
 */
/*~struct~FontSettings:
 * @param FontFile
 * @text Font File
 * @type string
 * @desc Custom font file (.ttf, .otf) from fonts folder. Leave blank to use default.
 * @default
 * 
 * @param FontSize
 * @text Font Size
 * @type number
 * @desc Font size for UI text. Leave at 0 to use default game setting.
 * @default
 * 
 * @param FontColor
 * @text Font Color
 * @type text
 * @desc Hex color code for text (e.g., #ffffff). Leave blank to use default.
 * @default 
 * 
 * @param OutlineColor
 * @text Font Outline Color
 * @type text
 * @desc Hex color code for text outline (e.g., #000000). Leave blank to use default.
 * @default 
 * 
 * @param TextShadow
 * @text Use Text Shadow
 * @type boolean
 * @desc Use text shadow instead of outline
 * @default false
*/

/*~struct~AdditionalTextDisplay:
 * @param TextToDisplay
 * @text Text to Display
 * @type text
 * @desc Expression to evaluate for text display. Example: $gameVariables.value(1) or 'hello'
 * @default
 * 
 * @param SlotName
 * @text Display at
 * @type text
 * @desc Display at a slot name
 * @default
 * 
 * @param Offset
 * @text Position Offset
 * @type text
 * @desc X,Y offset from default position (format: x, y)
 * @default 0, 0
 * 
 * @param Condition
 * @text Display Condition
 * @type text
 * @desc Condition that must be met to show text. Leave blank to always show.
 * @default
 */
/*~struct~IconReplacement:
 * @param ButtonName
 * @text Button Name
 * @type text
 * @desc The button name to replace with an icon (e.g., "Left Click", "Q", "RB")
 * @default Left Click
 * 
 * @param Icon
 * @text Icon Index
 * @type icon
 * @desc The icon to display instead of the button text
 * @default 1
 */

var Imported = Imported || {};
Imported.Hendrix_Hotbar_Creator = true;

(() => {
    const pluginName = "Hendrix_Hotbar_Creator";
    const parameters = PluginManager.parameters(pluginName);
    const visibilitySwitchId = Number(parameters.VisibilitySwitch || 0);
    const hideUIduringMessage = parameters.HideUIduringMessage === 'true';
    const showItemQuantity = parameters.ShowItemQuantity === 'true';
    const showZeroQuantity = parameters.ShowZeroQuantity === 'true';
    const unequipEmptyItems = parameters.UnequipEmptyItems === 'true';
    const quantityTextOffsetY = Number(parameters.QuantityTextOffsetY || 0);
    const showManaCost = parameters.ShowManaCost === 'true';
    const manaCostHeight = Number(parameters.ManaCostHeight || 0);
    const gamepadCursorImage = parameters.GamepadCursorImage;
    const emptySlotIcon = Number(parameters.EmptySlotIcon || 0);
    const windowSizeStr = parameters.WindowSelectionSize || '400, 500';
    const enableTouchInput = parameters.TouchInput === 'true';
    const useNowText = parameters.UseNowText || 'Use Now';
    const emptySlotText = parameters.EmptySlotText || 'Empty';
    const [windowWidth, visibleCommands] = windowSizeStr.split(',').map(s => Number(s.trim()));
    const iconReplacements = JSON.parse(parameters.IconReplacements || '[]').map(replacement => { const parsed = JSON.parse(replacement); return { buttonName: parsed.ButtonName.toLowerCase(), iconIndex: Number(parsed.Icon || 1) } });
    const iconMaxSize = Number(parameters.IconMaxSize || 24);
    const additionalTextDisplays = JSON.parse(parameters.AdditionalTextDisplays || '[]').map(display => { const parsed = JSON.parse(display); const offset = (parsed.Offset || '0, 0').split(',').map(v => Number(v.trim())); return { textToDisplay: parsed.TextToDisplay, slotName: parsed.SlotName, offsetX: offset[0], offsetY: offset[1], condition: parsed.Condition } });
    const fontSettings = parameters.FontSettings ? JSON.parse(parameters.FontSettings) : {};
    const fontSize = Number(fontSettings.FontSize || 0);
    const fontColor = fontSettings.FontColor || '';
    const outlineColor = fontSettings.OutlineColor || '';
    const useTextShadow = fontSettings.TextShadow === 'true';
    const allowEquipNonUsable = parameters.AllowEquipNonUsable === 'true';
    const partyMembersHotbar = parameters['PartyMembersHotbar'] !== 'false';
    const hideWhenOnPlayer = parameters['hideWhenOnPlayer'] !== 'false';
    const showHotbarButton = parameters['showHotbarButton'] !== 'false';
    const SNAP_THRESHOLD = 5;
    let isHotbarInitializing = false;
    let hotbarInputEnabled = true;
    const _lockedSlots = new Set();
    let gridSettings = [];
    function readUIPositions() {
        if (Utils.isNwjs()) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.mainModule.filename, '..', 'js', 'HotbarConfig.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                return data.positions || {};
            }
        }
        return {};
    }

    function saveHotbarPositions(positions) {
        if (Utils.isNwjs()) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.mainModule.filename, '..', 'js', 'HotbarConfig.json');

            let configData = { grids: [], positions: {} };
            if (fs.existsSync(filePath)) {
                configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }

            configData.positions = positions;

            fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
        }
    }

    function loadPositionsFromFile() {
        if (!Utils.isNwjs()) {
            fetch('js/HotbarConfig.json')
                .then(response => response.json())
                .then(data => {
                    window.$uiPositions = data.positions || {};
                    localStorage.setItem('HendrixHotbarPositions', JSON.stringify(data.positions || {}));
                    if (SceneManager._scene && SceneManager._scene._skillUI) {
                        SceneManager._scene._skillUI._slots.forEach((slot, name) => {
                            if (data.positions && data.positions[name]) {
                                slot.x = data.positions[name].x;
                                slot.y = data.positions[name].y;
                            }
                        });
                    }
                })
        }
    }

    window.$uiPositions = readUIPositions();
    if (!Utils.isNwjs()) {
        setTimeout(loadPositionsFromFile, 500);
    }

    function isItemDisallowed(item) {
        if (!item || !item.note) return false;
        return item.note.includes('<slot disallow>');
    }

    function canUseSlot(slotName) {
        if (!SceneManager._scene._skillUI || $gameMessage.isBusy() || $gameMap.isEventRunning()) return false;
        if (!hotbarInputEnabled) return false;
        const slot = SceneManager._scene._skillUI._slots.get(slotName);
        if (!slot) return false;
        if (slot._bounceDuration > 0) return false;
        const slotData = _slotData.get(slotName);
        if (!slotData) return false;
        if (isOnGlobalCooldown(slotData.type, slotData.id)) return false;
        return true;
    }

    const loadCustomFont = (fontFile) => {
        if (!fontFile) return null;

        const fontFace = fontFile.split('.')[0];
        const fontPath = `fonts/${fontFile}`;

        try {
            if (window.FontFace) {
                const customFont = new FontFace(fontFace, `url('${fontPath}')`);
                customFont.load().then(function (loadedFont) {
                    document.fonts.add(loadedFont);
                }).catch(error => {
                    console.error('Error loading font:', error);
                });
            } else {
                const style = document.createElement('style');
                style.textContent = `
                    @font-face {
                        font-family: '${fontFace}';
                        src: url('${fontPath}');
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (e) {
            console.error('Error loading font:', e);
        }

        return fontFace;
    };

    const customFontFace = loadCustomFont(fontSettings.FontFile);

    const applyFontSettings = (bitmap) => {
        if (fontSize > 0) bitmap.fontSize = fontSize;
        if (Utils.RPGMAKER_NAME === "MV") {
            bitmap.fontFace = customFontFace || 'GameFont';
        } else {
            bitmap.fontFace = customFontFace || $gameSystem.mainFontFace();
        }
        bitmap.smooth = false;
        if (fontColor) {
            bitmap.textColor = fontColor;
        } else {
            if (Utils.RPGMAKER_NAME === "MV") {
                bitmap.textColor = '#ffffff';
            } else {
                bitmap.textColor = ColorManager.normalColor();
            }
        }
        if (useTextShadow) {
            bitmap.outlineWidth = 0;
            bitmap._drawTextShadow = true;
        } else {
            bitmap._drawTextShadow = false;
            bitmap.outlineWidth = 4;
            if (outlineColor) {
                bitmap.outlineColor = outlineColor;
            } else {
                bitmap.outlineColor = 'rgba(0, 0, 0, 0.8)';
            }
        }
    };

    if (!Imported.Hendrix_Keyboard_Gamepad) {
        window.GamepadButtons = {
            'A': 0,
            'B': 1,
            'X': 2,
            'Y': 3,
            'LB': 4,
            'RB': 5,
            'Back': 8,
            'Start': 9,
            'LS-Press': 10,
            'RS-Press': 11,
            'Up': 12,
            'Down': 13,
            'Left': 14,
            'Right': 15,
            'LT': 6,
            'RT': 7
        };
    }

    const charToKeyCode = {
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
        'closebracket': 221, 'singlequote': 222
    };

    const initializeKeyMapping = function () {
        if (Imported.Hendrix_Keyboard_Gamepad) {
            return;
        }

        Input.gamepadMapper = {
            ...Input.gamepadMapper,
            12: 'up',
            13: 'down',
            14: 'left',
            15: 'right'
        };

        const mappedKeys = new Set();

        gridSettings.forEach(grid => {
            grid.Slots.forEach(slot => {
                const slotConfig = typeof slot === 'object' ? slot : JSON.parse(slot);
                if (slotConfig.Button) {
                    const [keyboardBtn, gamepadBtn] = slotConfig.Button.split(',').map(b => b.trim());

                    if (keyboardBtn) {
                        const keyboardBtnLower = keyboardBtn.toLowerCase();
                        if (charToKeyCode.hasOwnProperty(keyboardBtnLower)) {
                            const keyCode = charToKeyCode[keyboardBtnLower];
                            if (!mappedKeys.has(keyCode)) {
                                Input.keyMapper[keyCode] = keyboardBtnLower;
                                mappedKeys.add(keyCode);
                            }
                        }
                    }

                    if (gamepadBtn && GamepadButtons.hasOwnProperty(gamepadBtn)) {
                        const buttonCode = GamepadButtons[gamepadBtn];
                        Input.gamepadMapper[buttonCode] = keyboardBtn.toLowerCase();
                    }
                }
            });
        });
    };

    function extractCooldown(notes) {
        const match = /<slot cooldown:\s*(\d+)(?:\s*,\s*(true|false))?\s*>/i.exec(notes);
        if (!match) return { duration: 0, showTimer: true };

        const duration = parseInt(match[1]);
        const showTimer = match[2] ? match[2].toLowerCase() === 'true' : true;

        return { duration, showTimer };
    }

    function getGlobalCooldownKey(type, id) {
        return `${type}_${id}`;
    }

    function isOnGlobalCooldown(type, id) {
        const key = getGlobalCooldownKey(type, id);
        const remainingFrames = _globalCooldowns.get(key);
        return remainingFrames && remainingFrames > 0;
    }

    function setGlobalCooldown(type, id, duration, showTimer) {
        const key = getGlobalCooldownKey(type, id);
        const frames = Math.floor(duration * 60);
        _globalCooldowns.set(key, frames);

        ALL_AVAILABLE_SLOTS.forEach(slotData => {
            const slot = slotData.slot;
            const data = _slotData.get(slotData.name);
            if (data && data.type === type && data.id === id) {
                _cooldownStates.set(slotData.name, {
                    duration: duration,
                    total: duration,
                    showTimer: showTimer
                });
                SceneManager._scene._skillUI.startCooldown(slotData.name, duration, showTimer);
            }
        });
    }

    function updateGlobalCooldowns() {
        for (const [key, frames] of _globalCooldowns.entries()) {
            if (frames <= 0) {
                _globalCooldowns.delete(key);
            }
        }
    }

    //-----------------------------------------------------------------------------

    const _slotData = new Map();
    const _cooldownStates = new Map();
    const _globalCooldowns = new Map();
    const ALL_AVAILABLE_SLOTS = [];

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function () {
        _Game_System_initialize.call(this);
        this._uiSlotData = {};
        this._slotPositions = {};
    };

    ConfigManager.slotPositions = {};

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        const config = _ConfigManager_makeData.call(this);
        config.slotPositions = this.slotPositions;
        return config;
    };

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _ConfigManager_applyData.call(this, config);
        this.slotPositions = config.slotPositions || {};
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    function Sprite_SkillSlot() {
        this.initialize(...arguments);
    }

    Sprite_SkillSlot.prototype = Object.create(Sprite.prototype);
    Sprite_SkillSlot.prototype.constructor = Sprite_SkillSlot;

    Sprite_SkillSlot.prototype.initialize = function (config) {
        Sprite.prototype.initialize.call(this);
        if (!config.Name || config.Name.trim() === '') {
            if (config.Button) {
                const buttonParts = config.Button.split(',').map(b => b.trim());
                if (buttonParts.length > 1) {
                    config.Name = `Slot ${buttonParts[0]}, Slot ${buttonParts[1]}`;
                } else {
                    config.Name = `Slot ${buttonParts[0]}`;
                }
            } else {
                if (Imported.Hendrix_Localization) {
                    config.Name = Hendrix_Localization(emptySlotText) + " " + Hendrix_Localization("Slot");
                } else {
                    config.Name = emptySlotText + " Slot";
                }
            }
        }

        const nameConfig = config.Name.split(',').map(n => n.trim());
        this._keyboardName = nameConfig[0];

        config.Name = this._keyboardName;
        this._config = config;
        this._skillId = 0;
        this._iconIndex = 0;
        this._itemQuantity = 0;
        this._skillManaCost = 0;
        this._lastItemId = null;
        this._lastItemType = null;
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;

        this._flashDuration = 0;
        this._flashColor = [0, 0, 0, 0];

        this._cooldownContainer = new PIXI.Container();
        this.addChild(this._cooldownContainer);

        this._cooldownDuration = 0;
        this._cooldownTotal = 0;
        this._inCooldown = false;
        this._bounceDuration = 0;

        this._touching = false;
        this._touchHandler = this.handleTouch.bind(this);
        this.on('touchstart', this._touchHandler);
        this.on('click', this._touchHandler);
        this.on('mouseover', this._touchHandler);

        const specialBehavior = this._config.SpecialBehavior || 'none';
        if (
            (specialBehavior === 'none' ||
                specialBehavior === 'item_only' ||
                specialBehavior === 'skill_only') &&
            !ALL_AVAILABLE_SLOTS.some(slot => slot.name === config.Name)
        ) {
            ALL_AVAILABLE_SLOTS.push({
                name: config.Name,
                slot: this,
                specialBehavior: specialBehavior
            });
        }

        this.createBackground();
        this.createIcon();
        this.createButtonText();
        if (showItemQuantity) {
            this.createQuantityText();
        }
        if (showManaCost) {
            this.createManaCostText();
        }

        const slotData = _slotData.get(this._config.Name);
        if (slotData) {
            this._lastItemId = slotData.id;
            this._lastItemType = slotData.type;
        }
        this.createAdditionalTexts();
        this.initializeDrag();
    };

    Sprite_SkillSlot.prototype.initializeDrag = function () {
        this._isDragging = false;
        this._dragOffsetX = 0;
        this._dragOffsetY = 0;
    };

    Sprite_SkillSlot.prototype.getZIndex = function () {
        if (!this.parent) return 0;
        return this.parent.children.indexOf(this);
    };

    Sprite_SkillSlot.prototype.updateDrag = function () {
        if (!SceneManager._scene._isDragMode || !Utils.isOptionValid('test')) return;

        if (currentSelectedGrid !== null) {
            const selGrid = gridSettings[currentSelectedGrid];
            if (selGrid && selGrid.Slots) {
                const slotName = this._config.Name.split(',')[0].trim();
                const belongsToSelected = selGrid.Slots.some(s => s.Name.split(',')[0].trim() === slotName);
                if (!belongsToSelected) return;
            }
        } else {
            return;
        }

        if (!this._isDragging && TouchInput.isTriggered()) {
            const touchX = TouchInput.x;
            const touchY = TouchInput.y;
            const slotRect = new Rectangle(
                this.x - this.width / 2,
                this.y - this.height / 2,
                this.width,
                this.height
            );

            if (touchX >= slotRect.x && touchX <= slotRect.x + slotRect.width &&
                touchY >= slotRect.y && touchY <= slotRect.y + slotRect.height) {

                let topmostSlot = this;
                let highestZ = this.getZIndex();

                if (SceneManager._scene._skillUI) {
                    SceneManager._scene._skillUI._slots.forEach((otherSlot) => {
                        if (otherSlot === this) return;

                        const otherRect = new Rectangle(
                            otherSlot.x - otherSlot.width / 2,
                            otherSlot.y - otherSlot.height / 2,
                            otherSlot.width,
                            otherSlot.height
                        );

                        if (touchX >= otherRect.x && touchX <= otherRect.x + otherRect.width &&
                            touchY >= otherRect.y && touchY <= otherRect.y + otherRect.height) {

                            const otherZ = otherSlot.getZIndex();
                            if (otherZ > highestZ) {
                                topmostSlot = otherSlot;
                                highestZ = otherZ;
                            }
                        }
                    });
                }

                if (topmostSlot !== this) return;

                this._isDragging = true;
                this._dragOffsetX = this.x - touchX;
                this._dragOffsetY = this.y - touchY;
            }
        }

        if (this._isDragging) {
            if (TouchInput.isPressed()) {
                let newX = TouchInput.x + this._dragOffsetX;
                let newY = TouchInput.y + this._dragOffsetY;

                const snapResult = calculateSnapPosition(this, newX, newY);
                newX = snapResult.x;
                newY = snapResult.y;

                this.x = Math.max(this.width / 2, Math.min(Graphics.width - this.width / 2, newX));
                this.y = Math.max(this.height / 2, Math.min(Graphics.height - this.height / 2, newY));
            } else {
                this._isDragging = false;
                SnapIndicatorManager.hideAll();

                if (!window.$uiPositions) window.$uiPositions = {};
                window.$uiPositions[this._config.Name] = {
                    x: this.x,
                    y: this.y
                };
            }
        }
    };

    Scene_Map.prototype.resetSlotPositions = function () {
        if (!this._skillUI) return;

        gridSettings.forEach(grid => {
            const rows = (grid.RowColumn || '1, 1').toString().split(',').map(v => Number(v.trim()));
            const cols = rows.length > 1 ? rows[1] : rows[0];
            const padding = Number(grid.Padding) || 4;
            const defaultPosition = (grid.Position || '0, 0').split(',').map(v => eval(v.trim()));
            const gridX = defaultPosition[0] || 0;
            const gridY = defaultPosition[1] || 0;

            if (this._skillUI._gridBackgrounds) {
                const gridBg = this._skillUI._gridBackgrounds.find(bg => bg._grid === grid);
                if (gridBg) {
                    gridBg.x = gridX;
                    gridBg.y = gridY;
                }
            }

            const firstSlot = this._skillUI._slots.get(grid.Slots[0].Name);
            if (!firstSlot) return;

            const width = firstSlot.width;
            const height = firstSlot.height;
            const gridWidth = (cols - 1) * (width + padding) + width;
            const gridHeight = (rows[0] - 1) * (height + padding) + height;
            const centerX = gridX - (gridWidth / 2) + (width / 2);
            const centerY = gridY - (gridHeight / 2) + (height / 2);

            grid.Slots.forEach((slotConfig, i) => {
                const slot = this._skillUI._slots.get(slotConfig.Name);
                if (slot) {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    slot.x = centerX + (col * width) + (col * padding);
                    slot.y = centerY + (row * height) + (row * padding);
                }
            });
        });

        window.$uiPositions = {};
        saveHotbarPositions({});
    };

    Sprite_SkillSlot.prototype.handleTouch = function () {
        if (SceneManager._scene && SceneManager._scene._skillUI) {
            const ui = SceneManager._scene._skillUI;

            for (let i = 0; i < ui._gamepadGrids.length; i++) {
                const grid = ui._gamepadGrids[i];
                const slotIndex = grid.slots.findIndex(slot => slot.Name === this._config.Name);

                if (slotIndex !== -1) {
                    ui._gamepadCursor._currentGridIndex = i;
                    ui._gamepadCursor._currentSlotIndex = slotIndex;
                    ui.updateCursorTarget();
                    break;
                }
            }
        }
    };

    Sprite_SkillSlot.prototype.useSlotContents = function () {
        if (SceneManager._scene._isDragMode) return;
        if ($gameMessage.isBusy() || $gameMap.isEventRunning()) return;
        if (!hotbarInputEnabled) return;
        if (this._bounceDuration > 0) return;

        const slotData = _slotData.get(this._config.Name);
        if (!slotData) return;

        if (isItemDisallowedByCommand(slotData.type, slotData.id)) {
            return;
        }

        if (isOnGlobalCooldown(slotData.type, slotData.id)) {
            SoundManager.playBuzzer();
            return;
        }

        const actor = $gameParty.leader();
        let success = false;
        let cooldownData = { duration: 0, showTimer: true };

        switch (slotData.type) {
            case 'skill':
                const skill = $dataSkills[slotData.id];
                if (skill) {
                    const mpCost = actor.skillMpCost(skill);
                    if (actor.mp >= mpCost && actor.canUse(skill)) {
                        actor.gainMp(-mpCost);

                        if (skill.scope === 11) {
                            const action = new Game_Action(actor);
                            action.setSkill(slotData.id);
                            action.setTarget(actor.index());
                            action.apply(actor);
                        }

                        if (skill.effects) {
                            const commonEventEffect = skill.effects.find(effect => effect.code === 44);
                            if (commonEventEffect && $gameMap._interpreter) {
                                $gameMap._interpreter.clear();
                                $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                            }
                        }
                        cooldownData = extractCooldown(skill.note);
                        success = true;
                    } else {
                    }
                }
                break;

            case 'item':
                const item = $dataItems[slotData.id];
                if (item && $gameParty.hasItem(item) && actor.canUse(item)) {
                    if (item.effects) {
                        const commonEventEffect = item.effects.find(effect => effect.code === 44);
                        if (commonEventEffect && $gameMap._interpreter) {
                            $gameMap._interpreter.clear();
                            $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                        }
                    }
                    actor.useItem(item);

                    const action = new Game_Action(actor);
                    action.setItemObject(item);
                    action.setTarget(actor.index());
                    action.apply(actor);

                    cooldownData = extractCooldown(item.note);
                    success = true;

                    if (!$gameParty.hasItem(item) && unequipEmptyItems) {
                        this.setSkill(0, 0);
                        _slotData.delete(this._config.Name);
                        saveToSystem();
                    }
                } else {
                }
                break;

            case 'weapon':
                const weapon = $dataWeapons[slotData.id];
                if (weapon) {
                    cooldownData = extractCooldown(weapon.note);
                    success = true;
                }
                break;

            case 'armor':
                const armor = $dataArmors[slotData.id];
                if (armor) {
                    cooldownData = extractCooldown(armor.note);
                    success = true;
                }
                break;
        }

        if (success) {
            $gameParty.members().forEach(member => member.refresh());
            SceneManager._scene._skillUI.flashSlot(this._config.Name);

            if (cooldownData.duration > 0) {
                setGlobalCooldown(slotData.type, slotData.id, cooldownData.duration, cooldownData.showTimer);
            }
        }
    };

    Sprite_SkillSlot.prototype.isPointInside = function (x, y) {
        const slotRect = new Rectangle(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height
        );

        return x >= slotRect.x && x <= slotRect.x + slotRect.width &&
            y >= slotRect.y && y <= slotRect.y + slotRect.height;
    };

    Spriteset_SkillUI.prototype.destroy = function () {
        Sprite.prototype.destroy.call(this);

        this._slots.forEach(slot => {
            slot.off('touchstart', slot._touchHandler);
            slot.off('click', slot._touchHandler);
            slot.off('mouseover', slot._touchHandler);
        });
    };

    Sprite_SkillSlot.prototype.createQuantityText = function () {
        this._quantitySprite = new Sprite();
        this._quantitySprite.bitmap = new Bitmap(96, 32);
        this._quantitySprite.anchor.x = 0.5;
        this._quantitySprite.y = 1;
        this.addChild(this._quantitySprite);

        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            bitmap.addLoadListener(() => this.positionQuantityText());
        } else {
            this.positionQuantityText();
        }
    };

    Sprite_SkillSlot.prototype.positionQuantityText = function () {
        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            this._quantitySprite.y = -bitmap.height / 2 + quantityTextOffsetY;
        } else {
            this._quantitySprite.y += -48 + quantityTextOffsetY;
        }
    };

    Sprite_SkillSlot.prototype.refreshQuantity = function () {
        if (!showItemQuantity) return;

        const data = _slotData.get(this._config.Name);
        if (!data) {
            if (this._quantitySprite) {
                this._quantitySprite.bitmap.clear();
            }
            return;
        }

        let quantity = 0;
        if (data.type === 'item') {
            const item = $dataItems[data.id];
            if (item) {
                quantity = $gameParty.numItems(item);
            }
        }

        if (this._itemQuantity !== quantity) {
            this._itemQuantity = quantity;
            this._quantitySprite.bitmap.clear();
            if (quantity > 0 || showZeroQuantity) {
                applyFontSettings(this._quantitySprite.bitmap);
                this._quantitySprite.bitmap.drawText(quantity.toString(), 0, 0, 96, 32, 'center');
            }
        }
    };

    Sprite_SkillSlot.prototype.createManaCostText = function () {
        this._manaCostSprite = new Sprite();
        this._manaCostSprite.bitmap = new Bitmap(96, 32);
        this._manaCostSprite.anchor.x = 0.5;
        this._manaCostSprite.y = 1;
        this.addChild(this._manaCostSprite);

        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            bitmap.addLoadListener(() => this.positionManaCostText());
        } else {
            this.positionManaCostText();
        }
    };

    Sprite_SkillSlot.prototype.positionManaCostText = function () {
        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            this._manaCostSprite.y = -bitmap.height / 2 + manaCostHeight;
        } else {
            this._manaCostSprite.y += -48 + manaCostHeight;
        }
    };

    Sprite_SkillSlot.prototype.refreshManaCost = function () {
        if (!showManaCost) return;

        const data = _slotData.get(this._config.Name);
        if (!data) {
            if (this._manaCostSprite) {
                this._manaCostSprite.bitmap.clear();
            }
            return;
        }

        let manaCost = 0;
        if (data.type === 'skill') {
            const skill = $dataSkills[data.id];
            if (skill) {
                manaCost = skill.mpCost;
            }
        }

        if (this._skillManaCost !== manaCost) {
            this._skillManaCost = manaCost;
            this._manaCostSprite.bitmap.clear();
            if (manaCost > 0) {
                applyFontSettings(this._manaCostSprite.bitmap);
                this._manaCostSprite.bitmap.drawText(manaCost.toString(), 0, 0, 96, 32, 'center');
            }
        }
    };

    Sprite_SkillSlot.prototype.update = function () {
        this.refreshQuantity();
        this.refreshManaCost();
        this.updateAdditionalTexts();
        this.updateFlash();
        this.updateCooldown();
        this.updateDrag();
    };

    Sprite_SkillSlot.prototype.createButtonText = function () {
        this._buttonSprite = new Sprite();
        this._buttonSprite.bitmap = new Bitmap(128, 32);
        this._buttonSprite.anchor.x = 0.5;
        this._buttonSprite.anchor.y = 0.5;
        this.addChild(this._buttonSprite);
        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            bitmap.addLoadListener(() => this.positionButtonText());
        } else {
            this.positionButtonText();
        }
        this.refreshButtonText();
    };

    Sprite_SkillSlot.prototype.positionButtonText = function () {
        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            this._buttonSprite.y = bitmap.height / 2;
        }
        const offsetY = Number(this._config.TextOffsetY || 0);
        this._buttonSprite.y += offsetY;
    };

    Sprite_SkillSlot.prototype.refreshButtonText = function () {
        if (this._config.Button) {
            const buttons = this._config.Button.split(',').map(b => b.trim());
            const isGamepadMode = navigator.getGamepads && navigator.getGamepads()[0];

            let buttonText = '';

            if (Imported.Hendrix_Keyboard_Gamepad) {
                const slotName = this._config.Name.split(',')[0].trim();
                const actionName = slotName.replace('Slot ', '').toLowerCase();

                if (isGamepadMode) {
                    const keyboardButtonText = buttons[0].toLowerCase();

                    const hasGamepadButton = buttons.length > 1 && buttons[1] && buttons[1].trim() !== '';

                    if (!hasGamepadButton) {
                        if (typeof detectGamepadType === 'function') {
                            detectGamepadType();
                        }

                        if (window.HendrixGamepad && window.HendrixGamepad.getGamepadButtonForAction) {
                            buttonText = window.HendrixGamepad.getGamepadButtonForAction(keyboardButtonText);
                        }

                        if (!buttonText) {
                            buttonText = window.HendrixGamepad.getGamepadButtonForAction(actionName);
                        }
                    } else {
                        if (window.HendrixGamepad && window.HendrixGamepad.getGamepadButtonForAction) {
                            buttonText = window.HendrixGamepad.getGamepadButtonForAction(keyboardButtonText);
                        }

                        if (!buttonText) {
                            buttonText = window.HendrixGamepad.getGamepadButtonForAction(actionName);
                        }

                        if (!buttonText) buttonText = buttons[1];
                    }
                } else {
                    const originalButtonText = buttons[0].toLowerCase();

                    if (window.HendrixGamepad && window.HendrixGamepad.getKeyboardKeyForAction) {
                        buttonText = window.HendrixGamepad.getKeyboardKeyForAction(originalButtonText);
                    }

                    if (!buttonText) {
                        buttonText = window.HendrixGamepad.getKeyboardKeyForAction(actionName);
                    }

                    if (!buttonText) buttonText = buttons[0];
                }
            } else {
                buttonText = isGamepadMode ?
                    (buttons.length > 1 ? buttons[1] : '') :
                    buttons[0];

                if (isGamepadMode && buttons.length > 1) {
                    const gamepadButton = buttons[1];
                    if (GamepadButtons[gamepadButton]) {
                        const buttonCode = GamepadButtons[gamepadButton];
                        Input.gamepadMapper[buttonCode] = buttons[0].toLowerCase();
                    }
                } else {
                    const keyboardButton = buttons[0].toLowerCase();
                    if (charToKeyCode[keyboardButton]) {
                        const keyCode = charToKeyCode[keyboardButton];
                        Input.keyMapper[keyCode] = keyboardButton;
                    }
                }
            }

            const cacheKey = buttonText + '_' + !!isGamepadMode;
            if (this._lastButtonTextCache === cacheKey) return;
            this._lastButtonTextCache = cacheKey;

            const replacement = iconReplacements.find(r =>
                r.buttonName === buttonText.toLowerCase()
            );

            if (replacement) {
                this._buttonSprite.bitmap.clear();

                if (!this._buttonIconSprite) {
                    this._buttonIconSprite = new Sprite();
                    this._buttonIconSprite.bitmap = ImageManager.loadSystem('IconSet');
                    this._buttonIconSprite.anchor.x = 0.5;
                    this._buttonIconSprite.anchor.y = 0.5;
                    this._buttonIconSprite.bitmap.smooth = false;
                    this.addChild(this._buttonIconSprite);

                    if (this._config.BackgroundImage) {
                        const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
                        bitmap.addLoadListener(() => {
                            this._buttonIconSprite.y = bitmap.height / 2;
                            const offsetY = Number(this._config.TextOffsetY || 0);
                            this._buttonIconSprite.y += offsetY;
                        });
                    } else {
                        const offsetY = Number(this._config.TextOffsetY || 0);
                        this._buttonIconSprite.y += offsetY;
                    }
                }

                const iconIndex = replacement.iconIndex;
                const pw = ImageManager.iconWidth;
                const ph = ImageManager.iconHeight;
                const sx = (iconIndex % 16) * pw;
                const sy = Math.floor(iconIndex / 16) * ph;
                this._buttonIconSprite.setFrame(sx, sy, pw, ph);
                this._buttonIconSprite.visible = true;

                const scale = Math.min(iconMaxSize / pw, iconMaxSize / ph);
                this._buttonIconSprite.scale.x = scale;
                this._buttonIconSprite.scale.y = scale;
            } else {
                if (this._buttonIconSprite) {
                    this._buttonIconSprite.visible = false;
                }

                buttonText = buttonText.toUpperCase();
                this._buttonSprite.bitmap.clear();
                applyFontSettings(this._buttonSprite.bitmap);
                this._buttonSprite.bitmap.drawText(buttonText, 0, 0, 128, 32, 'center');
            }
        }
    };

    const extractSlotTextTags = (notesString) => {
        const results = [];
        const regex = /<slot text:\s*(.+?)(?:\s*,\s*(-?\d+)\s*,\s*(-?\d+))?\s*>/g;
        let match;

        while (match = regex.exec(notesString)) {
            results.push({
                text: match[1],
                offsetX: Number(match[2] || 0),
                offsetY: Number(match[3] || 0)
            });
        }

        return results;
    };

    Sprite_SkillSlot.prototype.createAdditionalTexts = function () {
        if (this._additionalTextSprites) {
            for (const sprite of this._additionalTextSprites.values()) {
                if (sprite.parent) {
                    sprite.parent.removeChild(sprite);
                }
            }
        }
        this._additionalTextSprites = new Map();
        let allDisplays = [];

        const parameterDisplays = additionalTextDisplays.filter(display => {
            if (display.slotName === this._config.Name) {
                return true;
            }

            const slotData = _slotData.get(this._config.Name);
            if (!slotData) return false;

            const slotNameLower = display.slotName.toLowerCase();

            if (slotData.type === 'weapon') {
                const weapon = $dataWeapons[slotData.id];
                if (!weapon) return false;

                if (slotNameLower.startsWith('weapon type:')) {
                    const targetType = display.slotName.split(':')[1].trim().toLowerCase();
                    const weaponTypeName = $dataSystem.weaponTypes[weapon.wtypeId].toLowerCase();
                    return weaponTypeName === targetType;
                }

                if (slotNameLower.startsWith('weapon name:')) {
                    const targetName = display.slotName.split(':')[1].trim().toLowerCase();
                    return weapon.name.toLowerCase() === targetName;
                }

                if (slotNameLower.startsWith('weapon id:')) {
                    const targetId = Number(display.slotName.split(':')[1].trim());
                    return weapon.id === targetId;
                }
            }

            if (slotData.type === 'armor') {
                const armor = $dataArmors[slotData.id];
                if (!armor) return false;

                if (slotNameLower.startsWith('armor type:')) {
                    const targetType = display.slotName.split(':')[1].trim().toLowerCase();
                    const armorTypeName = $dataSystem.armorTypes[armor.atypeId].toLowerCase();
                    return armorTypeName === targetType;
                }

                if (slotNameLower.startsWith('equipment type:')) {
                    const targetType = display.slotName.split(':')[1].trim().toLowerCase();
                    const equipTypeName = $dataSystem.equipTypes[armor.etypeId].toLowerCase();
                    return equipTypeName === targetType;
                }

                if (slotNameLower.startsWith('armor name:')) {
                    const targetName = display.slotName.split(':')[1].trim().toLowerCase();
                    return armor.name.toLowerCase() === targetName;
                }

                if (slotNameLower.startsWith('armor id:')) {
                    const targetId = Number(display.slotName.split(':')[1].trim());
                    return armor.id === targetId;
                }
            }

            if (slotData.type === 'skill') {
                const skill = $dataSkills[slotData.id];
                if (!skill) return false;

                if (slotNameLower.startsWith('skill name:')) {
                    const targetName = display.slotName.split(':')[1].trim().toLowerCase();
                    return skill.name.toLowerCase() === targetName;
                }

                if (slotNameLower.startsWith('skill id:')) {
                    const targetId = Number(display.slotName.split(':')[1].trim());
                    return skill.id === targetId;
                }

                if (slotNameLower.startsWith('skill type:')) {
                    const targetType = display.slotName.split(':')[1].trim().toLowerCase();
                    const skillTypeName = $dataSystem.skillTypes[skill.stypeId].toLowerCase();
                    return skillTypeName === targetType;
                }

                if (slotNameLower.startsWith('skill element:')) {
                    const targetElement = display.slotName.split(':')[1].trim().toLowerCase();
                    if (skill.damage && skill.damage.elementId > 0) {
                        const elementName = $dataSystem.elements[skill.damage.elementId].toLowerCase();
                        return elementName === targetElement;
                    }
                    return false;
                }
            }

            if (slotData.type === 'item') {
                const item = $dataItems[slotData.id];
                if (!item) return false;

                if (slotNameLower.startsWith('item name:')) {
                    const targetName = display.slotName.split(':')[1].trim().toLowerCase();
                    return item.name.toLowerCase() === targetName;
                }

                if (slotNameLower.startsWith('item id:')) {
                    const targetId = Number(display.slotName.split(':')[1].trim());
                    return item.id === targetId;
                }
            }

            return false;
        });

        allDisplays = [...parameterDisplays];

        const slotData = _slotData.get(this._config.Name);
        if (slotData) {
            let item;
            switch (slotData.type) {
                case 'weapon':
                    item = $dataWeapons[slotData.id];
                    break;
                case 'skill':
                    item = $dataSkills[slotData.id];
                    break;
                case 'item':
                    item = $dataItems[slotData.id];
                    break;
                case 'armor':
                    item = $dataArmors[slotData.id];
                    break;
            }

            if (item && item.note) {
                const notetagDisplays = extractSlotTextTags(item.note).map(tag => ({
                    textToDisplay: tag.text,
                    slotName: this._config.Name,
                    offsetX: tag.offsetX,
                    offsetY: tag.offsetY
                }));
                allDisplays = [...allDisplays, ...notetagDisplays];
            }
        }

        if (this._config.BackgroundImage) {
            const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
            bitmap.addLoadListener(() => this.positionAdditionalTexts(allDisplays));
        } else {
            this.positionAdditionalTexts(allDisplays);
        }
    };

    Sprite_SkillSlot.prototype.positionAdditionalTexts = function (slotDisplays) {
        for (const display of slotDisplays) {
            const sprite = new Sprite();
            sprite.bitmap = new Bitmap(96, 20);
            sprite.anchor.x = 0.5;

            if (this._config.BackgroundImage) {
                const bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
                sprite.y = -bitmap.height / 2;
            } else {
                sprite.y = -48;
            }

            sprite.x += display.offsetX;
            sprite.y += display.offsetY;

            this.addChild(sprite);
            this._additionalTextSprites.set(display, sprite);
        }
    };

    Sprite_SkillSlot.prototype.updateAdditionalTexts = function () {
        const slotData = _slotData.get(this._config.Name);
        const currentId = slotData ? slotData.id : null;
        const currentType = slotData ? slotData.type : null;

        if (this._lastItemId !== currentId || this._lastItemType !== currentType) {
            this._lastItemId = currentId;
            this._lastItemType = currentType;
            this.createAdditionalTexts();
            return;
        }

        for (const [display, sprite] of this._additionalTextSprites.entries()) {
            let text = display.textToDisplay;
            if (text.includes('$game') || text.includes('eval(')) {
                text = eval(text);
            }

            if (sprite._currentText !== text) {
                sprite._currentText = text;
                sprite.bitmap.clear();
                applyFontSettings(sprite.bitmap);
                sprite.bitmap.drawText(String(text), 0, 0, 96, 20, 'center');
            }
        }
    };

    Sprite_SkillSlot.prototype.createBackground = function () {
        if (this._config.BackgroundImage) {
            this.bitmap = ImageManager.loadSystem(this._config.BackgroundImage);
        } else {
            this.bitmap = new Bitmap(48, 48);
            this.bitmap.fillRect(0, 0, 48, 48, 'rgba(0,0,0,0.5)');
        }
    };

    Sprite_SkillSlot.prototype.createIcon = function () {
        this._iconSprite = new Sprite();
        this._iconSprite.bitmap = ImageManager.loadSystem('IconSet');
        this._iconSprite.anchor.x = 0.5;
        this._iconSprite.anchor.y = 0.5;
        this.addChild(this._iconSprite);
        this._iconSprite.visible = false;

        this._customImageSprite = new Sprite();
        this._customImageSprite.anchor.x = 0.5;
        this._customImageSprite.anchor.y = 0.5;
        this.addChild(this._customImageSprite);
        this._customImageSprite.visible = false;
    };

    Sprite_SkillSlot.prototype.setSkill = function (skillId, iconIndex, quantity = 0) {
        this._skillId = skillId;
        this._iconIndex = iconIndex;

        this._iconSprite.visible = false;
        this._customImageSprite.visible = false;

        if (this._skillId > 0) {
            let item;
            const slotData = _slotData.get(this._config.Name);

            if (slotData) {
                switch (slotData.type) {
                    case 'skill':
                        item = $dataSkills[this._skillId];
                        break;
                    case 'item':
                        item = $dataItems[this._skillId];
                        break;
                    case 'weapon':
                        item = $dataWeapons[this._skillId];
                        break;
                    case 'armor':
                        item = $dataArmors[this._skillId];
                        break;
                }
            }

            if (item) {
                const notedata = item.note.split(/[\r\n]+/);
                let customImage = '';

                for (const line of notedata) {
                    if (line.match(/<slot image:\s*(.+)>/i)) {
                        customImage = RegExp.$1.trim();
                        break;
                    }
                }

                if (customImage) {
                    this._iconSprite.visible = false;
                    this._isUsingCustomImage = true;

                    const bitmap = ImageManager.loadBitmap('img/pictures/slotUI/', customImage);
                    bitmap.addLoadListener(() => {
                        if (!this._customImageSprite || !this.parent) return;

                        if (bitmap.width === 0 || bitmap.height === 0) {
                            this._isUsingCustomImage = false;
                            this._iconSprite.visible = true;
                            this.refreshIcon();
                            return;
                        }

                        this._customImageSprite.bitmap = bitmap;
                        this._customImageSprite.visible = true;
                        this._customImageSprite.scale.x = 1;
                        this._customImageSprite.scale.y = 1;
                    });
                } else {
                    this._customImageSprite.visible = false;
                    this._isUsingCustomImage = false;
                    this._iconSprite.visible = true;
                    this.refreshIcon();
                }

                if (slotData.type === 'item' && showItemQuantity) {
                    this.refreshQuantity(quantity);
                }
            }
        }
    };

    Sprite_SkillSlot.prototype.refreshIcon = function () {
        const pw = 32;
        const ph = 32;
        if (Utils.RPGMAKER_NAME === "MV") {
            const sx = (this._iconIndex % 16) * pw;
            const sy = Math.floor(this._iconIndex / 16) * ph;
            this._iconSprite.setFrame(sx, sy, pw, ph);
        } else {
            const pw = ImageManager.iconWidth;
            const ph = ImageManager.iconHeight;
            const sx = (this._iconIndex % 16) * pw;
            const sy = Math.floor(this._iconIndex / 16) * ph;
            this._iconSprite.setFrame(sx, sy, pw, ph);
        }
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    function Spriteset_SkillUI() {
        this.initialize(...arguments);
    }

    Spriteset_SkillUI.prototype = Object.create(Sprite.prototype);
    Spriteset_SkillUI.prototype.constructor = Spriteset_SkillUI;

    Spriteset_SkillUI.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);
        this._slots = new Map();
        this._fadeOpacity = 255;
        this._playerFadeOpacity = 1;
        this._gamepadGrids = [];
        this.createGrids();
        this.createGamepadCursor();
    };

    Spriteset_SkillUI.prototype.createGamepadCursor = function () {
        this._gamepadCursor = new Sprite();
        if (gamepadCursorImage) {
            this._gamepadCursor.bitmap = ImageManager.loadSystem(gamepadCursorImage);
            this._gamepadCursor.bitmap.addLoadListener(() => {
                this.initializeGamepadCursor();
            });
        } else {
            this._gamepadCursor.bitmap = new Bitmap(48, 48);
            const ctx = this._gamepadCursor.bitmap._context;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 48, 48);
            this.initializeGamepadCursor();
        }
    };

    Spriteset_SkillUI.prototype.initializeGamepadCursor = function () {
        this._gamepadCursor.anchor.x = 0.5;
        this._gamepadCursor.anchor.y = 0.5;
        this._gamepadCursor._targetSlot = null;
        this._gamepadCursor._currentGridIndex = -1;
        this._gamepadCursor._currentSlotIndex = -1;
        this.addChild(this._gamepadCursor);
        this._gamepadCursor.visible = false;

        if (this._gamepadGrids.length > 0) {
            this._gamepadCursor._currentGridIndex = 0;
            this._gamepadCursor._currentSlotIndex = 0;
            this.updateCursorTarget();
        }
    };

    Spriteset_SkillUI.prototype.update = function () {
        Sprite.prototype.update.call(this);

        const isVisible = visibilitySwitchId === 0 || $gameSwitches.value(visibilitySwitchId);
        this.visible = isVisible;

        if (isVisible) {
            if (hideUIduringMessage) {
                this.updateVisibility();
            }
            if (this._gridBackgrounds) {
                this.updateGridDragging();
            }
            this.updatePlayerOverlapFade();
        }
        this.updateGamepadNavigation();
    };

    Spriteset_SkillUI.prototype.updateGridDragging = function () {
        if (!SceneManager._scene._isDragMode || !Utils.isOptionValid('test')) return;

        let slotBeingDragged = false;
        this._slots.forEach(slot => {
            if (slot._isDragging) {
                slotBeingDragged = true;
            }
        });

        if (slotBeingDragged) return;

        this._gridBackgrounds.forEach(background => {
            if (!background._isDragging && TouchInput.isTriggered() && background.visible) {
                const touchX = TouchInput.x;
                const touchY = TouchInput.y;

                let clickingOnSlot = false;
                background._gridSlots = background._gridSlots || [];

                background._gridSlots.forEach(slot => {
                    const slotRect = new Rectangle(
                        slot.x - slot.width / 2,
                        slot.y - slot.height / 2,
                        slot.width,
                        slot.height
                    );

                    if (touchX >= slotRect.x && touchX <= slotRect.x + slotRect.width &&
                        touchY >= slotRect.y && touchY <= slotRect.y + slotRect.height) {
                        clickingOnSlot = true;
                    }
                });

                if (!clickingOnSlot) {
                    const gridRect = new Rectangle(
                        background.x - background.width / 2,
                        background.y - background.height / 2,
                        background.width,
                        background.height
                    );

                    if (touchX >= gridRect.x && touchX <= gridRect.x + gridRect.width &&
                        touchY >= gridRect.y && touchY <= gridRect.y + gridRect.height) {
                        background._isDragging = true;
                        background._dragOffsetX = background.x - touchX;
                        background._dragOffsetY = background.y - touchY;

                        if (!background._gridSlots || background._gridSlots.length === 0) {
                            background._gridSlots = [];
                            if (background._grid && background._grid.Slots) {
                                background._grid.Slots.forEach(slotConfig => {
                                    const slot = this._slots.get(typeof slotConfig === 'string' ? slotConfig : slotConfig.Name);
                                    if (slot) {
                                        background._gridSlots.push(slot);
                                    }
                                });
                            }
                        }

                        background._gridSlots.forEach(slot => {
                            slot._gridOffsetX = slot.x - background.x;
                            slot._gridOffsetY = slot.y - background.y;
                        });
                    }
                }
            }

            if (background._isDragging) {
                if (TouchInput.isPressed()) {
                    let newX = TouchInput.x + background._dragOffsetX;
                    let newY = TouchInput.y + background._dragOffsetY;

                    const gridRect = {
                        width: background.width,
                        height: background.height,
                        left: newX - background.width / 2,
                        right: newX + background.width / 2,
                        top: newY - background.height / 2,
                        bottom: newY + background.height / 2,
                        centerX: newX,
                        centerY: newY
                    };

                    const snapPoints = {
                        x: [0, Graphics.boxWidth / 2, Graphics.boxWidth],
                        y: [0, Graphics.boxHeight / 2, Graphics.boxHeight]
                    };

                    this._gridBackgrounds.forEach(otherBackground => {
                        if (otherBackground === background) return;

                        const otherRect = {
                            left: otherBackground.x - otherBackground.width / 2,
                            right: otherBackground.x + otherBackground.width / 2,
                            top: otherBackground.y - otherBackground.height / 2,
                            bottom: otherBackground.y + otherBackground.height / 2,
                            centerX: otherBackground.x,
                            centerY: otherBackground.y
                        };

                        snapPoints.x.push(otherRect.left, otherRect.right, otherRect.centerX);
                        snapPoints.y.push(otherRect.top, otherRect.bottom, otherRect.centerY);
                    });

                    for (const x of snapPoints.x) {
                        if (Math.abs(gridRect.left - x) < SNAP_THRESHOLD) {
                            newX = x + background.width / 2;
                            SnapIndicatorManager.show('slot_vertical', x);
                            break;
                        }
                        if (Math.abs(gridRect.right - x) < SNAP_THRESHOLD) {
                            newX = x - background.width / 2;
                            SnapIndicatorManager.show('slot_vertical', x);
                            break;
                        }
                        if (Math.abs(gridRect.centerX - x) < SNAP_THRESHOLD) {
                            newX = x;
                            SnapIndicatorManager.show('slot_vertical', x);
                            break;
                        }
                    }

                    for (const y of snapPoints.y) {
                        if (Math.abs(gridRect.top - y) < SNAP_THRESHOLD) {
                            newY = y + background.height / 2;
                            SnapIndicatorManager.show('slot_horizontal', y);
                            break;
                        }
                        if (Math.abs(gridRect.bottom - y) < SNAP_THRESHOLD) {
                            newY = y - background.height / 2;
                            SnapIndicatorManager.show('slot_horizontal', y);
                            break;
                        }
                        if (Math.abs(gridRect.centerY - y) < SNAP_THRESHOLD) {
                            newY = y;
                            SnapIndicatorManager.show('slot_horizontal', y);
                            break;
                        }
                    }

                    background.x = Math.max(background.width / 2,
                        Math.min(Graphics.width - background.width / 2, newX));
                    background.y = Math.max(background.height / 2,
                        Math.min(Graphics.height - background.height / 2, newY));

                    background._gridSlots.forEach(slot => {
                        slot.x = background.x + slot._gridOffsetX;
                        slot.y = background.y + slot._gridOffsetY;
                    });
                } else {
                    background._isDragging = false;
                    SnapIndicatorManager.hideAll();

                    const currentPositions = window.$uiPositions || {};
                    if (background._grid && background._grid.Slots && background._grid.Slots.length > 0) {
                        const firstSlot = background._grid.Slots[0];
                        let gridKey = 'grid_unknown';

                        if (typeof firstSlot === 'string') {
                            gridKey = 'grid_' + firstSlot;
                        } else if (firstSlot.Name) {
                            gridKey = 'grid_' + firstSlot.Name.split(',')[0].trim();
                        }

                        currentPositions[gridKey] = {
                            x: background.x,
                            y: background.y
                        };
                    }

                    background._gridSlots.forEach(slot => {
                        currentPositions[slot._config.Name] = {
                            x: slot.x,
                            y: slot.y
                        };
                    });

                    window.$uiPositions = currentPositions;
                    saveHotbarPositions(currentPositions);
                }
            }
        });
    };

    Spriteset_SkillUI.prototype.updateGamepadNavigation = function () {
        if (this._gamepadGrids.length === 0) {
            this._gamepadCursor.visible = false;
            return;
        }

        const isGamepadConnected = navigator.getGamepads && navigator.getGamepads()[0];
        this._gamepadCursor.visible = !!isGamepadConnected;

        if (!isGamepadConnected) return;

        this._gamepadCursor.visible = true;
        let moveRight, moveLeft, moveDown, moveUp;

        const gamepad = navigator.getGamepads()[0];
        if (Utils.RPGMAKER_NAME === "MV") {
            const isButtonPressed = (index) => {
                if (!gamepad.buttons[index]) return false;
                if (typeof gamepad.buttons[index] === 'object') {
                    return gamepad.buttons[index].pressed;
                }
                return gamepad.buttons[index] === 1;
            };

            moveRight = isButtonPressed(15);
            moveLeft = isButtonPressed(14);
            moveDown = isButtonPressed(13);
            moveUp = isButtonPressed(12);
        } else {
            moveRight = gamepad.buttons[15] && gamepad.buttons[15].pressed;
            moveLeft = gamepad.buttons[14] && gamepad.buttons[14].pressed;
            moveDown = gamepad.buttons[13] && gamepad.buttons[13].pressed;
            moveUp = gamepad.buttons[12] && gamepad.buttons[12].pressed;
        }

        if (!this._lastMoveTime) this._lastMoveTime = 0;
        const currentTime = Date.now();
        if (currentTime - this._lastMoveTime < 200) return;

        const currentGrid = this._gamepadGrids[this._gamepadCursor._currentGridIndex];
        if (!currentGrid) return;

        let newIndex = this._gamepadCursor._currentSlotIndex;
        const cols = currentGrid.cols;

        if (moveRight && newIndex % cols < cols - 1) {
            newIndex++;
            this._lastMoveTime = currentTime;
        } else if (moveLeft && newIndex % cols > 0) {
            newIndex--;
            this._lastMoveTime = currentTime;
        } else if (moveDown && newIndex + cols < currentGrid.slots.length) {
            newIndex += cols;
            this._lastMoveTime = currentTime;
        } else if (moveUp && newIndex - cols >= 0) {
            newIndex -= cols;
            this._lastMoveTime = currentTime;
        }

        if (newIndex !== this._gamepadCursor._currentSlotIndex) {
            this._gamepadCursor._currentSlotIndex = newIndex;
            this.updateCursorTarget();
        }
    };

    const _Game_Player_getInputDirection = Game_Player.prototype.getInputDirection;
    Game_Player.prototype.getInputDirection = function () {
        const gamepad = navigator.getGamepads && navigator.getGamepads()[0];
        if (gamepad) {
            const scene = SceneManager._scene;
            if (scene._skillUI && scene._skillUI._gamepadGrids.length > 0) {
                if (Utils.RPGMAKER_NAME === "MV") {
                    const isButtonPressed = (index) => {
                        if (!gamepad.buttons[index]) return false;
                        if (typeof gamepad.buttons[index] === 'object') {
                            return gamepad.buttons[index].pressed;
                        }
                        return gamepad.buttons[index] === 1;
                    };

                    if (isButtonPressed(12) || isButtonPressed(13) ||
                        isButtonPressed(14) || isButtonPressed(15)) {
                        return 0;  // Block player movement only when using D-pad
                    }
                } else {
                    if ((gamepad.buttons[12] && gamepad.buttons[12].pressed) ||
                        (gamepad.buttons[13] && gamepad.buttons[13].pressed) ||
                        (gamepad.buttons[14] && gamepad.buttons[14].pressed) ||
                        (gamepad.buttons[15] && gamepad.buttons[15].pressed)) {
                        return 0;
                    }
                }
            }
        }
        return _Game_Player_getInputDirection.call(this);
    };

    Spriteset_SkillUI.prototype.updateCursorTarget = function () {
        const currentGrid = this._gamepadGrids[this._gamepadCursor._currentGridIndex];
        if (!currentGrid) return;

        const slotConfig = currentGrid.slots[this._gamepadCursor._currentSlotIndex];
        if (!slotConfig) return;

        const slot = this._slots.get(slotConfig.Name);
        if (slot) {
            this._gamepadCursor._targetSlot = slot;
            this._gamepadCursor.visible = true;
            this._gamepadCursor.x = slot.x;
            this._gamepadCursor.y = slot.y;
        }
    };

    Spriteset_SkillUI.prototype.updateVisibility = function () {
        if ($gameMessage.isBusy()) {
            this._fadeOpacity = Math.max(0, this._fadeOpacity - 30);
        } else {
            this._fadeOpacity = Math.min(255, this._fadeOpacity + 30);
        }
    };

    Spriteset_SkillUI.prototype.isPlayerBehindHotbar = function () {
        if (!hideWhenOnPlayer) return false;
        if (!SceneManager._scene._spriteset) return false;

        const playerSprite = SceneManager._scene._spriteset._characterSprites.find(
            sprite => sprite._character === $gamePlayer
        );
        if (!playerSprite) return false;

        const playerWidth = playerSprite.patternWidth ? playerSprite.patternWidth() : $gameMap.tileWidth();
        const playerHeight = playerSprite.patternHeight ? playerSprite.patternHeight() : $gameMap.tileHeight();

        const playerLeft = $gamePlayer.screenX() - playerWidth / 2;
        const playerRight = $gamePlayer.screenX() + playerWidth / 2;
        const playerTop = $gamePlayer.screenY() - playerHeight;
        const playerBottom = $gamePlayer.screenY();

        if (!this._gridBackgrounds) return false;

        return this._gridBackgrounds.some(bg => {
            const halfW = bg.width / 2;
            const halfH = bg.height / 2;
            const bgLeft = bg.x - halfW;
            const bgRight = bg.x + halfW;
            const bgTop = bg.y - halfH;
            const bgBottom = bg.y + halfH;

            return (
                playerRight > bgLeft &&
                playerLeft < bgRight &&
                playerBottom > bgTop &&
                playerTop < bgBottom
            );
        });
    };

    Spriteset_SkillUI.prototype.updatePlayerOverlapFade = function () {
        if (hideWhenOnPlayer) {
            const target = this.isPlayerBehindHotbar() ? 0.3 : 1.0;
            const step = 0.05;

            if (this._playerFadeOpacity < target) {
                this._playerFadeOpacity = Math.min(target, this._playerFadeOpacity + step);
            } else if (this._playerFadeOpacity > target) {
                this._playerFadeOpacity = Math.max(target, this._playerFadeOpacity - step);
            }
        }

        this.alpha = this._playerFadeOpacity * (this._fadeOpacity / 255);
    };

    Spriteset_SkillUI.prototype.createGrids = function () {
        for (const grid of gridSettings) {
            this.createGridBackground(grid);
            this.createGridSlots(grid);
        }
        this._gamepadGrids = gridSettings.filter(grid => {
            return grid.ControllableViaGamepad === 'true';
        }).map((grid, index) => {
            const slots = grid.Slots;
            const rowCol = (grid.RowColumn || '1, 1').toString();
            let rows = 1, cols = 1;
            if (rowCol.includes(',')) {
                [rows, cols] = rowCol.split(',').map(v => Number(v.trim()));
            } else {
                rows = cols = Number(rowCol.trim());
            }
            return {
                slots,
                rows,
                cols,
                index
            };
        });
    };

    Spriteset_SkillUI.prototype.createGridSlots = function (grid) {
        let rows = 1, cols = 1;
        const rowColConfig = (grid.RowColumn || '1, 1').toString();
        if (rowColConfig.includes(',')) {
            [rows, cols] = rowColConfig.split(',').map(v => Number(v.trim()));
        } else {
            rows = cols = Number(rowColConfig.trim());
        }

        const padding = Number(grid.Padding) || 4;
        let defaultPosition = (grid.Position || '0, 0').split(',').map(v => eval(v.trim()));

        if (!grid.Slots || grid.Slots.length === 0) {
            return;
        }

        const firstSlotKeyboardName = grid.Slots[0].Name.split(',')[0].trim();
        if (window.$uiPositions && window.$uiPositions['grid_' + firstSlotKeyboardName]) {
            defaultPosition = [
                window.$uiPositions['grid_' + firstSlotKeyboardName].x,
                window.$uiPositions['grid_' + firstSlotKeyboardName].y
            ];
        }

        const gridX = defaultPosition[0] || 0;
        const gridY = defaultPosition[1] || 0;

        if (grid.Slots.length === 0) return;

        const firstSlot = new Sprite_SkillSlot(grid.Slots[0], grid.Type);

        firstSlot.bitmap.addLoadListener(() => {
            const slotWidth = firstSlot.bitmap.width;
            const slotHeight = firstSlot.bitmap.height;

            const gridWidth = (cols - 1) * (slotWidth + padding) + slotWidth;
            const gridHeight = (rows - 1) * (slotHeight + padding) + slotHeight;
            const centerX = gridX - (gridWidth / 2) + (slotWidth / 2);
            const centerY = gridY - (gridHeight / 2) + (slotHeight / 2);

            if (window.$uiPositions[firstSlotKeyboardName]) {
                firstSlot.x = window.$uiPositions[firstSlotKeyboardName].x;
                firstSlot.y = window.$uiPositions[firstSlotKeyboardName].y;
            } else {
                firstSlot.x = centerX;
                firstSlot.y = centerY;
            }

            this._slots.set(firstSlotKeyboardName, firstSlot);
            this.addChild(firstSlot);

            for (let i = 1; i < grid.Slots.length; i++) {
                const slotConfig = grid.Slots[i];
                const slot = new Sprite_SkillSlot(slotConfig, grid.Type);

                const slotKeyboardName = slotConfig.Name.split(',')[0].trim();
                if (window.$uiPositions[slotKeyboardName]) {
                    slot.x = window.$uiPositions[slotKeyboardName].x;
                    slot.y = window.$uiPositions[slotKeyboardName].y;
                } else {
                    const row = Math.floor(i / cols);
                    const col = i % cols;
                    slot.x = centerX + (col * slotWidth) + (col * padding);
                    slot.y = centerY + (row * slotHeight) + (row * padding);
                }

                this._slots.set(slotKeyboardName, slot);
                this.addChild(slot);
            }
        });
    };

    Spriteset_SkillUI.prototype.createGridBackground = function (grid) {
        let position;
        if (grid.Slots && grid.Slots.length > 0) {
            const firstSlotKeyboardName = grid.Slots[0].Name.split(',')[0].trim();
            if (window.$uiPositions && window.$uiPositions['grid_' + firstSlotKeyboardName]) {
                position = [
                    window.$uiPositions['grid_' + firstSlotKeyboardName].x,
                    window.$uiPositions['grid_' + firstSlotKeyboardName].y
                ];
            } else {
                position = (grid.Position || '0, 0').split(',').map(v => eval(v.trim()));
            }
        } else {
            position = (grid.Position || '0, 0').split(',').map(v => eval(v.trim()));
        }

        if (grid.BackgroundImage) {
            const background = new Sprite();
            background.bitmap = ImageManager.loadSystem(grid.BackgroundImage);

            background.x = position[0] || 0;
            background.y = position[1] || 0;
            background.anchor.x = 0.5;
            background.anchor.y = 0.5;

            background._isDragging = false;
            background._dragOffsetX = 0;
            background._dragOffsetY = 0;
            background._gridSlots = [];
            background._grid = grid;
            background._isPlaceholder = false;

            this.addChild(background);
            this._gridBackgrounds = this._gridBackgrounds || [];
            this._gridBackgrounds.push(background);
        } else {
            const rowCol = (grid.RowColumn || '2, 5').split(',').map(v => parseInt(v.trim()));
            const rows = rowCol[0] || 2;
            const columns = rowCol.length === 2 ? rowCol[1] : rowCol[0];
            const padding = parseInt(grid.Padding) || 10;
            const slotSize = 64;

            const gridWidth = (columns * slotSize) + ((columns - 1) * padding);
            const gridHeight = (rows * slotSize) + ((rows - 1) * padding);

            const background = new Sprite();
            background.bitmap = new Bitmap(gridWidth + 20, gridHeight + 20);

            const ctx = background.bitmap.context;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
            ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
            ctx.lineWidth = 4;
            ctx.setLineDash([12, 6]);

            ctx.fillRect(0, 0, gridWidth + 20, gridHeight + 20);
            ctx.strokeRect(0, 0, gridWidth + 20, gridHeight + 20);

            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = 'rgba(255, 215, 0, 1.0)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Grid ' + (this._gridBackgrounds ? this._gridBackgrounds.length + 1 : 1),
                (gridWidth + 20) / 2, (gridHeight + 20) / 2);

            background.x = position[0] || 0;
            background.y = position[1] || 0;
            background.anchor.x = 0.5;
            background.anchor.y = 0.5;

            background._isDragging = false;
            background._dragOffsetX = 0;
            background._dragOffsetY = 0;
            background._gridSlots = [];
            background._grid = grid;
            background._isPlaceholder = true;

            background.visible = editorMode;

            this.addChild(background);
            this._gridBackgrounds = this._gridBackgrounds || [];
            this._gridBackgrounds.push(background);
        }
    };

    Spriteset_SkillUI.prototype.createBackground = function () {
        if (gridSettings.BackgroundImage) {
            this._background = new Sprite();
            this._background.bitmap = ImageManager.loadSystem(gridSettings.BackgroundImage);
            this.addChild(this._background);
        }
    };

    Spriteset_SkillUI.prototype.createSlots = function () {
        const rows = parseInt(gridSettings.Rows) || 1;
        const cols = parseInt(gridSettings.Columns) || 4;
        const padding = parseInt(gridSettings.Padding) || 4;

        for (let i = 0; i < slotsConfig.length; i++) {
            const config = slotsConfig[i];
            const slot = new Sprite_SkillSlot(config);
            const row = Math.floor(i / cols);
            const col = i % cols;
            slot.x = col * (40 + padding);
            slot.y = row * (40 + padding);
            this._slots.set(config.Name, slot);
            this.addChild(slot);
        }
    };

    Spriteset_SkillUI.prototype.setSkill = function (slotName, skillId, itemId, weaponId) {
        if (_lockedSlots.has(slotName)) { return; }
        const slot = this._slots.get(slotName);
        if (slot) {
            if (skillId > 0) {
                const skill = $dataSkills[skillId];
                if (skill) {
                    slot.setSkill(skillId, skill.iconIndex);
                    _slotData.set(slot._config.Name, { type: 'skill', id: skillId });
                    syncActorHotbarSkill(slot._config.Name, skillId);
                }
            }
            else if (itemId > 0) {
                const item = $dataItems[itemId];
                if (item) {
                    slot.setSkill(itemId, item.iconIndex);
                    _slotData.set(slot._config.Name, { type: 'item', id: itemId });
                }
            }
            else if (weaponId > 0) {
                const weapon = $dataWeapons[weaponId];
                if (weapon) {
                    slot.setSkill(weaponId, weapon.iconIndex);
                    _slotData.set(slot._config.Name, { type: 'weapon', id: weaponId });
                }
            }
            saveToSystem();
        }
    };

    Spriteset_SkillUI.prototype.refreshSlots = function () {
        for (const [slotName, data] of _slotData.entries()) {
            const slot = this._slots.get(slotName);
            if (slot) {
                switch (data.type) {
                    case 'skill':
                        const skill = $dataSkills[data.id];
                        if (skill) slot.setSkill(data.id, skill.iconIndex);
                        break;
                    case 'item':
                        const item = $dataItems[data.id];
                        if (item) slot.setSkill(data.id, item.iconIndex);
                        break;
                    case 'weapon':
                        const weapon = $dataWeapons[data.id];
                        if (weapon) slot.setSkill(data.id, weapon.iconIndex);
                        break;
                    case 'armor':
                        const armor = $dataArmors[data.id];
                        if (armor) slot.setSkill(data.id, armor.iconIndex);
                        break;
                }
            }
        }
    };

    Spriteset_SkillUI.prototype.refreshSlotsVisual = function () {
        for (const [slotName, data] of _slotData.entries()) {
            const slot = this._slots.get(slotName);
            if (slot && !slot._inCooldown) {
                switch (data.type) {
                    case 'skill':
                        const skill = $dataSkills[data.id];
                        if (skill) slot.setSkill(data.id, skill.iconIndex);
                        break;
                    case 'item':
                        const item = $dataItems[data.id];
                        if (item) slot.setSkill(data.id, item.iconIndex);
                        break;
                    case 'weapon':
                        const weapon = $dataWeapons[data.id];
                        if (weapon) slot.setSkill(data.id, weapon.iconIndex);
                        break;
                    case 'armor':
                        const armor = $dataArmors[data.id];
                        if (armor) slot.setSkill(data.id, armor.iconIndex);
                        break;
                }
            }
        }
    };

    Spriteset_SkillUI.prototype.getEmptySlot = function (type) {
        for (const [name, slot] of this._slots.entries()) {
            if (!_slotData.has(name) && slot._gridType === type) {
                return name;
            }
        }
        return null;
    };

    Spriteset_SkillUI.prototype.refreshSpecialSlots = function () {
        for (const [slotName, slot] of this._slots.entries()) {
            const specialBehavior = slot._config.SpecialBehavior || 'none';
            if (specialBehavior === 'display_weapon') {
                const actor = $gameParty.leader();
                const equipSlot = actor._equips[0];
                const currentData = _slotData.get(slotName);

                if (!equipSlot || equipSlot._itemId === 0) {
                    if (currentData) {
                        slot.setSkill(0, 0);
                        _slotData.delete(slotName);
                    }
                    continue;
                }

                if (currentData && currentData.id === equipSlot._itemId) continue;

                const weapon = $dataWeapons[equipSlot._itemId];
                if (weapon) {
                    slot.setSkill(weapon.id, weapon.iconIndex);
                    _slotData.set(slotName, { type: 'weapon', id: weapon.id });
                }
            }
            else if (specialBehavior === 'display_shield') {
                const actor = $gameParty.leader();
                const equipSlot = actor._equips[1];
                const currentData = _slotData.get(slotName);

                if (!equipSlot || equipSlot._itemId === 0) {
                    if (currentData) {
                        slot.setSkill(0, 0);
                        _slotData.delete(slotName);
                    }
                    continue;
                }

                if (currentData && currentData.id === equipSlot._itemId) continue;

                const shield = equipSlot._dataClass === 'weapon' ?
                    $dataWeapons[equipSlot._itemId] :
                    $dataArmors[equipSlot._itemId];

                if (shield) {
                    slot.setSkill(shield.id, shield.iconIndex);
                    _slotData.set(slotName, {
                        type: equipSlot._dataClass,
                        id: shield.id
                    });
                }
            }
        }
        saveToSystem();
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    const saveToSystem = function () {
        $gameSystem._uiSlotData = {};
        _slotData.forEach((value, key) => {
            $gameSystem._uiSlotData[key] = value;
        });
        $gameSystem._lockedSlots = Array.from(_lockedSlots);
    };

    const syncActorHotbarSkill = function (slotName, skillId) {
        if (!partyMembersHotbar) return;
        const leader = $gameParty.leader();
        const actorId = leader ? leader.actorId() : 0;
        if (!actorId) return;
        if (!$gameSystem._actorHotbarData) $gameSystem._actorHotbarData = {};
        if (!$gameSystem._actorHotbarData[actorId]) $gameSystem._actorHotbarData[actorId] = {};
        if (skillId > 0) {
            $gameSystem._actorHotbarData[actorId][slotName] = { type: 'skill', id: skillId };
        } else {
            delete $gameSystem._actorHotbarData[actorId][slotName];
        }
    };

    if (typeof hxGetOrCreateDock !== 'function') {
        window.hxGetOrCreateDock = function () {
            if (document.getElementById('hx-plugin-dock')) {
                return document.getElementById('hx-plugin-dock');
            }
            const dock = document.createElement('div');
            dock.id = 'hx-plugin-dock';
            dock.style.cssText = `
                position: fixed; bottom: 20px; right: 20px;
                display: flex; flex-direction: column; align-items: center;
                gap: 8px; z-index: 9999;
            `;
            const logo = document.createElement('img');
            logo.id = 'hx-dock-logo';
            logo.style.cssText = `
                width: 56px; height: 56px; border-radius: 50%;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                cursor: default; transition: opacity 0.3s, transform 0.2s;
                object-fit: cover; opacity: 0;
            `;
            logo.src = 'data:image/png;base64,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AhERBv7++fb29A0MAxYUBv7rVf70qfrXR/v58P7pnxwXBvDt4ygeAiQcBf7IMu7AOuPMicq4gtrSuufhz/fz5+i0LiohCi8nFP7UbichEnRjNu7KcurPiu/TkOnPkHhrTN7Iji4gAj4vDCQcCx4YCz0zHLydWe3Kfdi5dO7OiNu+fVtPNP7fl7eicoh4VmdbQe/VmKqXbPjdn5OGaMe/rqVyDSoeBtGXIpRqGW9QE2RIEdWaJodhGM2UJaF0HXpZGC4iCTUnC+rDds6taeW/duC7c+rGetOybvTNgc6uburGfvvViebDfezKg6SLW/vXkuPEherKisSre7qwm+jm4vmmD9yRD7l9DdeWIjIjCNKSIt2bJUk0DNaWJr+HItKWJrB+IP63MOCeK92rUuSzXtKua+7GeurCeu7GflBDK+rGgkY7J/XPierGhu7Kis+xefDOjsiqdsqueurKjta5g92/iPPRlqObjLJ2FoZaE1s9DVI4DHlSEtaSItKOIsqKIfeqK++kKtuVJv2vLeigKdaSJtKSJtuWKtWULMmNKeunM9maMcqOLvauOc2SMNmdO7eENDorE/y+XJd4ROrCfu7Ggu7KjunGi8SmduPBi8qufurKlK1qBioaAtKDDKZmCiAUArd2FhkQA7FyFpNeEtGJG6ltFteNHcaDG7t6GUIrCb9+G7Z2GrJ2Gi4eB69yG9aOIuOZJ9aOJtKOJu7Cfu7GiOrChsqqes+vf6pjBqpmCqZiCqFhCrBrDapmDqZmDq13Mc6qesqqf9TRzaZgBi4aAq9mCqpiCsJxDaNdC7hsDcp3D4ZOCiYWA6ZiDoxTDK5mD6FhD3ZGC2pACsR0FLVtE4ZPDqpnE7pyFyIWB5RkKc6qfpxYC4pOCoZKCpRUDKpiDoJKC4pODk00GYpKBoFGChQLAoZKDioZB0UuFmpGI1k5GmI+Hv76+PPx8AwEAgYCAgcGBv7+/vr6+gICAv///7JXTUoAAAEAdFJOU////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBT9wclAAAACXBIWXMAAAsTAAALEwEAmpwYAACIKUlEQVR4nN29CXxTZfY3fp57k9ybtJTSFBBp6ZK0tFxKoWlE2WRr2VxwqziOC+6jMuNsOuMy4/zUcZwZZ3EbHbdRx5EpjoLK1rKpoGLaQikXWpqkLQ1UhaSltMm9Se59/p/z3HRhFZX5ve/7f8Q2SdP0fu85z9nPeQiF/ydXb9I3/x0O/p9boXP+E42NikX/Myv0zX6R/D9G194LGrrGFu7VAPhDw5tsmb5vQF/+Yfh/aJ2XOuXPKbfGNtY9xt2n71ee89456UDK/z/pOvzgf16ozTn/3iFHgkOOkoPFP9xsmr70ymDa//+wvnRr5W9alP+5SYlQC+jARYktufYq20XPrbrq/z6s531IryI3XIoP33+FtM37zTeRpXlyZHGtsD2mDekYCtCVi3Kpa4hNnwRXzavoOaNPMsH/zsrbHh5SHc18mdMjYIXIXJi7Ye6oYNj5+LUTms/k9y/ylrTHH6hQbPHwOR1AINSV2gWpIXOs8aFKWJf889//30LXn/1apJGqciuh76/dlDL3I5hxf2nhTXNtFN6HpYdhnmvV1+H9z9zFn13728NWTbN2pFojaYyqqZAWgii38glb6bu+gv8bsObF99F3+EtJ5vVbeD4+3/m3rPao5QePwRCTdmRhwbCL4X293EZf//vnp/kIb+Wj3gYCPES6UqGLDO0iyMep0JXr10lK0jjT9Dczu/+PYz2vOqUJHOC2mfxZTRrvcMBYBaD64iaoAo0vDJW0xae5F1N/w6Xw+hOnoG6PIIrvOPYWqdYOGBVJ86daOyC1CwBSEXauf4jFd/k18yqczf9Hsf7st1CyLTXnHK7zIOTP1QurcsGfEQCAzELwOsiY6hbfPn5sbpsS2kvf4Su6HvnjST4kMMJqeei6OM+eRI6cA9YQpLXQ3FCaPzXNnwrBEXy49crZ4aofvPR/DmtejbVkm+2Bz4IH+fIx8/fvhXaAXD9kmv3sx7mO6lx/rv+W6g0+7Vy7ojR0rb2cvHbL8Z8SjYw9+uClQxLXGeka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';
            dock.appendChild(logo);
            document.body.appendChild(dock);

            document.addEventListener('mousemove', (e) => {
                const dockRect = dock.getBoundingClientRect();
                const logoRect = logo.getBoundingClientRect();
                const logoCx = logoRect.left + logoRect.width / 2;
                const logoCy = logoRect.top + logoRect.height / 2;
                const distToLogo = Math.hypot(e.clientX - logoCx, e.clientY - logoCy);
                const insideDock = e.clientX >= dockRect.left - 20 &&
                    e.clientX <= dockRect.right + 20 &&
                    e.clientY >= dockRect.top - 20 &&
                    e.clientY <= dockRect.bottom + 20;
                logo.style.opacity = (distToLogo < 120 || insideDock) ? '1' : '0';
                const showButtons = distToLogo < 60 || insideDock;
                dock.querySelectorAll('div').forEach(b => {
                    b.style.opacity = showButtons ? '1' : '0';
                    b.style.pointerEvents = showButtons ? 'auto' : 'none';
                    b.style.transform = showButtons ? 'translateY(0)' : 'translateY(8px)';
                });
            });
            return dock;
        };

        window.hxAddDockButton = function (id, label, onClick) {
            if (!Utils.isOptionValid('test')) return;
            const dock = hxGetOrCreateDock();
            if (document.getElementById(id)) return;
            const btn = document.createElement('div');
            btn.id = id;
            btn.textContent = label;
            btn.style.cssText = `
                background: #fff; color: #222;
                border: none; border-radius: 20px;
                padding: 6px 14px; font-size: 11px; font-weight: 600;
                font-family: Inter, system-ui, sans-serif;
                cursor: pointer; white-space: nowrap;
                box-shadow: 0 2px 10px rgba(0,0,0,0.25);
                opacity: 0; pointer-events: none;
                transition: opacity 0.2s, transform 0.2s;
                transform: translateY(8px);
            `;
            btn.onclick = onClick;
            dock.insertBefore(btn, dock.firstChild);
        };
    }

    const _Scene_Map_createDisplayObjects_Hotbar = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
        _Scene_Map_createDisplayObjects_Hotbar.call(this);
        if (typeof hxAddDockButton === 'function' && showHotbarButton) {
            hxAddDockButton('hx-btn-hotbar', '⏹️ Hotbar Creator', () => {
                createHotbarVisualEditor();
            });
        }
    };

    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        reloadGridSettings(false);
        this.createSkillUI();
    };

    Scene_Map.prototype.createSkillUI = function () {
        this._skillUI = new Spriteset_SkillUI();
        this.addChild(this._skillUI);
        _slotData.clear();

        if ($gameSystem._uiSlotData) {
            Object.entries($gameSystem._uiSlotData).forEach(([key, value]) => {
                if (value.type === 'item' || value.type === 'weapon' || value.type === 'armor') {
                    _slotData.set(key, value);
                }
            });
        }

        if (partyMembersHotbar) {
            const leader = $gameParty.leader();
            const leaderId = leader ? leader.actorId() : 0;
            const actorData = leaderId && $gameSystem._actorHotbarData
                ? $gameSystem._actorHotbarData[leaderId]
                : null;
            if (actorData) {
                Object.entries(actorData).forEach(([key, value]) => {
                    if (value.type === 'skill') _slotData.set(key, value);
                });
            }
        } else {
            if ($gameSystem._uiSlotData) {
                Object.entries($gameSystem._uiSlotData).forEach(([key, value]) => {
                    if (value.type === 'skill') _slotData.set(key, value);
                });
            }
        }

        this._lastLeaderId = $gameParty.leader() ? $gameParty.leader().actorId() : 0;
        this._skillUI.refreshSlots();

        this._skillUI.refreshSlots();
    };

    Scene_Map.prototype.toggleDragMode = function () {
        if (!Utils.isOptionValid('test')) return;

        this._isDragMode = !this._isDragMode;
        if (!this._isDragMode) {
            SnapIndicatorManager.hideAll();
        }
        if (this._isDragMode) {
            window.$uiPositions = readUIPositions();
        } else {
            const currentPositions = {};

            this._skillUI._slots.forEach((slot, name) => {
                currentPositions[name] = {
                    x: slot.x,
                    y: slot.y
                };
            });

            if (this._skillUI._gridBackgrounds) {
                this._skillUI._gridBackgrounds.forEach(bg => {
                    if (bg._grid.Slots && bg._grid.Slots.length > 0) {
                        const firstSlotKeyboardName = bg._grid.Slots[0].Name.split(',')[0].trim();
                        currentPositions['grid_' + firstSlotKeyboardName] = {
                            x: bg.x,
                            y: bg.y
                        };
                    }
                });
            }

            saveHotbarPositions(currentPositions);
        }
    };

    const _Scene_Map_initialize = Scene_Map.prototype.initialize;
    Scene_Map.prototype.initialize = function () {
        _Scene_Map_initialize.call(this);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function () {
        _Scene_Map_update.call(this);
        if (this._skillUI && enableTouchInput && TouchInput.isTriggered() && !this._isDragMode) {
            const touchX = TouchInput.x;
            const touchY = TouchInput.y;

            this._skillUI._slots.forEach((slot, slotName) => {
                if (slot.isPointInside(touchX, touchY)) {
                    if (slot._bounceDuration > 0) return;
                    slot.useSlotContents();
                }
            });
        }

        if (this._skillUI) {
            this._skillUI.update();
            this._skillUI.refreshSpecialSlots();
            if (Graphics.frameCount % 4 === 0) {
                this._skillUI.refreshSlotsVisual();
            }
            for (const slot of this._skillUI._slots.values()) {
                slot.refreshButtonText();
            }
            for (const [key, frames] of _globalCooldowns.entries()) {
                if (frames > 0) {
                    _globalCooldowns.set(key, frames - 1);
                }
            }
            updateGlobalCooldowns();

            if (partyMembersHotbar) {
                const currentLeaderId = $gameParty.leader() ? $gameParty.leader().actorId() : 0;
                if (currentLeaderId !== this._lastLeaderId) {
                    this._lastLeaderId = currentLeaderId;

                    _slotData.clear();

                    if ($gameSystem._uiSlotData) {
                        Object.entries($gameSystem._uiSlotData).forEach(([key, value]) => {
                            if (value.type === 'item' || value.type === 'weapon' || value.type === 'armor') {
                                _slotData.set(key, value);
                            }
                        });
                    }

                    const actorData = currentLeaderId && $gameSystem._actorHotbarData
                        ? $gameSystem._actorHotbarData[currentLeaderId]
                        : null;
                    if (actorData) {
                        Object.entries(actorData).forEach(([key, value]) => {
                            if (value.type === 'skill') _slotData.set(key, value);
                        });
                    }

                    this._skillUI._slots.forEach((slot, slotName) => {
                        if (!_slotData.has(slotName)) slot.setSkill(0, 0);
                    });

                    this._skillUI.refreshSlots();
                }
            }
        }
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    function Window_SkillSlotSelect() {
        this.initialize(...arguments);
    }

    Window_SkillSlotSelect.prototype = Object.create(Window_Command.prototype);
    Window_SkillSlotSelect.prototype.constructor = Window_SkillSlotSelect;

    Window_SkillSlotSelect.prototype.initialize = function (rect) {
        if (Utils.RPGMAKER_NAME === "MV") {
            Window_Command.prototype.initialize.call(this, rect.x, rect.y);
            this.width = rect.width;
            this.height = rect.height;
        } else {
            Window_Command.prototype.initialize.call(this, rect);
        }
        this._skill = null;
        this.deactivate();
        this.hide();
    };

    Window_SkillSlotSelect.prototype.setSkill = function (skill) {
        this._skill = skill;
        this.refresh();
    };

    Window_SkillSlotSelect.prototype.setActor = function (actor) {
        this._actorId = actor ? actor.actorId() : 0;
    };

    Window_SkillSlotSelect.prototype.getSlotDataForActor = function (slotName) {
        if (this._actorId && this._actorId > 0) {
            const actorData = $gameSystem._actorHotbarData && $gameSystem._actorHotbarData[this._actorId];
            if (actorData) return actorData[slotName] || null;
            return null;
        }
        return _slotData.get(slotName) || null;
    };

    Window_SkillSlotSelect.prototype.makeCommandList = function () {
        if (Imported.Hendrix_Localization) {
            this.addCommand(Hendrix_Localization(useNowText), 'use_now', hotbarInputEnabled);
        } else {
            this.addCommand(useNowText, 'use_now', hotbarInputEnabled);
        }

        const isSkillScene = SceneManager._scene instanceof Scene_Skill;
        const isItemScene = SceneManager._scene instanceof Scene_Item;

        this._availableSlots = ALL_AVAILABLE_SLOTS.filter(slotData => {
            const specialBehavior = slotData.specialBehavior || 'none';
            return specialBehavior === 'none' ||
                (isSkillScene && specialBehavior === 'skill_only') ||
                (isItemScene && specialBehavior === 'item_only');
        });

        this._availableSlots.forEach(slotData => {
            this.addCommand(slotData.name, 'slot', true, slotData.name);
        });
    };

    Window_SkillSlotSelect.prototype.drawItem = function (index) {
        if (Utils.RPGMAKER_NAME === "MV") {
            var rect = this.itemRectForText(index);
            const command = this._list[index];

            if (command.symbol === 'use_now') {
                this.changePaintOpacity(command.enabled);
                this.drawText(command.name, rect.x, rect.y, rect.width, 'center');
                return;
            }

            if (command.symbol === 'separator') {
                this.changePaintOpacity(true);
                this.drawText(command.name, rect.x, rect.y, rect.width, 'center');
                return;
            }

            var slotData = this._availableSlots[index - 1];
            var slot = slotData.slot;
            var data = _slotData.get(slotData.name);

            var iconIndex = emptySlotIcon;
            if (data) {
                var item;
                switch (data.type) {
                    case 'skill':
                        item = $dataSkills[data.id];
                        break;
                    case 'item':
                        item = $dataItems[data.id];
                        break;
                    case 'weapon':
                        item = $dataWeapons[data.id];
                        break;
                    case 'armor':
                        item = $dataArmors[data.id];
                        break;
                }
                if (item) {
                    iconIndex = item.iconIndex;
                }
            }
            this.drawIcon(iconIndex, rect.x, rect.y);

            var displayName;
            if (Imported.Hendrix_Keyboard_Gamepad) {
                const slotName = slot._config.Name.split(',')[0].trim();
                const actionName = slotName.replace('Slot ', '').toLowerCase();
                const isGamepadMode = navigator.getGamepads && navigator.getGamepads()[0];

                let currentButton = '';
                if (isGamepadMode) {
                    for (const buttonName in GamepadButtons) {
                        const buttonCode = GamepadButtons[buttonName];
                        if (Input.gamepadMapper[buttonCode] === actionName) {
                            currentButton = buttonName;
                            break;
                        }
                    }
                } else {
                    for (const keyCode in Input.keyMapper) {
                        if (Input.keyMapper[keyCode] === actionName) {
                            for (const keyName in charToKeyCode) {
                                if (charToKeyCode[keyName] == keyCode) {
                                    currentButton = keyName;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                displayName = currentButton ? `Slot ${currentButton.toUpperCase()}` : slot._keyboardName;
            } else {
                displayName = slot._keyboardName;
            }

            var nameX = rect.x + 40;
            this.changeTextColor(this.normalColor());
            this.drawText(displayName, nameX, rect.y, 120);

            var itemName = emptySlotText;
            if (Imported.Hendrix_Localization) {
                itemName = Hendrix_Localization(emptySlotText);
            }
            if (data && item) {
                itemName = item.name;
                this.changeTextColor(this.textColor(14));
            } else {
                this.changeTextColor(this.normalColor());
            }
            this.drawText(itemName, nameX + 115, rect.y, 200);

        } else {
            let rect = this.itemLineRect(index);
            const command = this._list[index];

            if (command.symbol === 'use_now') {
                this.changePaintOpacity(command.enabled);
                this.drawText(command.name, rect.x, rect.y, rect.width, 'center');
                return;
            }

            if (command.symbol === 'separator') {
                this.changePaintOpacity(true);
                this.drawText(command.name, rect.x, rect.y, rect.width, 'center');
                return;
            }

            const slotData = this._availableSlots[index - 1];
            const slot = slotData.slot;
            const data = this.getSlotDataForActor(slotData.name);
            let iconIndex = emptySlotIcon;
            let itemName = emptySlotText;
            if (Imported.Hendrix_Localization) {
                itemName = Hendrix_Localization(emptySlotText);
            }

            if (data) {
                let item;
                switch (data.type) {
                    case 'skill':
                        item = $dataSkills[data.id];
                        break;
                    case 'item':
                        item = $dataItems[data.id];
                        break;
                    case 'weapon':
                        item = $dataWeapons[data.id];
                        break;
                    case 'armor':
                        item = $dataArmors[data.id];
                        break;
                }
                if (item) {
                    iconIndex = item.iconIndex;
                    itemName = item.name;
                }
            }

            this.drawIcon(iconIndex, rect.x, rect.y);
            const iconPadding = ImageManager.iconWidth + 4;
            const baseX = rect.x + iconPadding;

            let displayName;
            if (Imported.Hendrix_Keyboard_Gamepad) {
                const slotName = slot._config.Name.split(',')[0].trim();
                const actionName = slotName.replace('Slot ', '').toLowerCase();
                const isGamepadMode = navigator.getGamepads && navigator.getGamepads()[0];

                let currentButton = '';
                if (isGamepadMode) {
                    for (const buttonName in GamepadButtons) {
                        const buttonCode = GamepadButtons[buttonName];
                        if (Input.gamepadMapper[buttonCode] === actionName) {
                            currentButton = buttonName;
                            break;
                        }
                    }
                } else {
                    for (const keyCode in Input.keyMapper) {
                        if (Input.keyMapper[keyCode] === actionName) {
                            for (const keyName in charToKeyCode) {
                                if (charToKeyCode[keyName] == keyCode) {
                                    currentButton = keyName;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }

                displayName = currentButton ? `Slot ${currentButton.toUpperCase()}` : slot._keyboardName;
            } else {
                displayName = slot._keyboardName;
            }

            this.drawText(displayName, baseX, rect.y);

            const textX = baseX + this.textWidth(displayName + " ");
            if (data) {
                this.changeTextColor(ColorManager.textColor(14));
                this.drawText(itemName, textX, rect.y);
                this.resetTextColor();
            } else {
                this.drawText(itemName, textX, rect.y);
            }
        }
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    const _Window_SkillList_isCurrentItemEnabled = Window_SkillList.prototype.isCurrentItemEnabled;
    Window_SkillList.prototype.isCurrentItemEnabled = function () {
        if (SceneManager._scene instanceof Scene_Skill) {
            return true;
        }
        return _Window_SkillList_isCurrentItemEnabled.call(this);
    };

    const _Scene_Skill_create = Scene_Skill.prototype.create;
    Scene_Skill.prototype.create = function () {
        _Scene_Skill_create.call(this);
        this.createSlotSelectWindow();
    };

    Scene_Skill.prototype.createSlotSelectWindow = function () {
        const rect = this.slotSelectWindowRect();
        this._slotSelectWindow = new Window_SkillSlotSelect(rect);
        this._slotSelectWindow.setHandler('ok', this.onSlotSelectOk.bind(this));
        this._slotSelectWindow.setHandler('cancel', this.onSlotSelectCancel.bind(this));
        this.addWindow(this._slotSelectWindow);
    };

    Scene_Skill.prototype.slotSelectWindowRect = function () {
        const ww = windowWidth || 400;
        const wh = this.calcWindowHeight(visibleCommands || 6, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    };


    Scene_Skill.prototype.onItemOk = function () {
        this._slotSelectWindow.setActor(this.actor());
        if (!this.item()) {
            SoundManager.playBuzzer();
            this._itemWindow.activate();
            return;
        }

        if (!allowEquipNonUsable && !this.actor().canUse(this.item())) {
            SoundManager.playBuzzer();
            this._itemWindow.activate();
            return;
        }

        this._slotSelectWindow.setSkill(this.item());
        this._slotSelectWindow.show();
        this._slotSelectWindow.activate();
        this._slotSelectWindow.select(0);
        this._itemWindow.deactivate();
        this._slotSelectWindow.refresh();
    };

    Scene_Skill.prototype.onSlotSelectOk = function () {
        if (this._slotSelectWindow.currentSymbol() === 'use_now') {
            const skill = this.item();
            if (this.actor().canUse(skill)) {
                if (this.itemTargetsValid()) {
                    this._slotSelectWindow.hide();
                    this._slotSelectWindow.deactivate();
                    if (Imported.Hendrix_Action_Engine && typeof soloPlayerMenu !== 'undefined' && soloPlayerMenu) {
                        this.determineItem();
                        this.onActorOk();
                        this.onActorCancel();
                        return;
                    }
                    this.determineItem();
                } else {
                    SoundManager.playBuzzer();
                }
            } else {
                SoundManager.playBuzzer();
                this._slotSelectWindow.activate();
            }
            return;
        }

        const item = this.item();
        if (isItemDisallowed(item)) {
            SoundManager.playBuzzer();
            this._itemWindow.deactivate();
            this._slotSelectWindow.activate();
            return;
        }

        const slotName = this._slotSelectWindow.currentExt();
        const skillId = this.item().id;

        if (_lockedSlots.has(slotName)) {
            SoundManager.playBuzzer();
            this._slotSelectWindow.activate();
            return;
        }

        const slot = ALL_AVAILABLE_SLOTS.find(s => s.name === slotName);
        if (slot) {
            if (partyMembersHotbar) {
                const actorId = this._slotSelectWindow._actorId || ($gameParty.leader() ? $gameParty.leader().actorId() : 0);
                const leaderId = $gameParty.leader() ? $gameParty.leader().actorId() : 0;
                if (!$gameSystem._actorHotbarData) $gameSystem._actorHotbarData = {};
                if (!$gameSystem._actorHotbarData[actorId]) $gameSystem._actorHotbarData[actorId] = {};
                $gameSystem._actorHotbarData[actorId][slotName] = { type: 'skill', id: skillId };
                if (actorId === leaderId) {
                    slot.slot.setSkill(skillId, this.item().iconIndex);
                    _slotData.set(slotName, { type: 'skill', id: skillId });
                }
            } else {
                slot.slot.setSkill(skillId, this.item().iconIndex);
                _slotData.set(slotName, { type: 'skill', id: skillId });
            }
            saveToSystem();
        }

        this.onSlotSelectCancel();
        this._itemWindow.activate();
    };

    Scene_Skill.prototype.onSlotSelectCancel = function () {
        this._slotSelectWindow.hide();
        this._slotSelectWindow.deactivate();
        this._itemWindow.activate();
    };

    const _Scene_Item_create = Scene_Item.prototype.create;
    Scene_Item.prototype.create = function () {
        isHotbarInitializing = true;
        _Scene_Item_create.call(this);
        isHotbarInitializing = false;
    };

    Scene_Item.prototype.createSlotSelectWindow = function () {
        const rect = this.slotSelectWindowRect();
        this._slotSelectWindow = new Window_SkillSlotSelect(rect);
        this._slotSelectWindow.setHandler('ok', this.onSlotSelectOk.bind(this));
        this._slotSelectWindow.setHandler('cancel', this.onSlotSelectCancel.bind(this));
        this.addWindow(this._slotSelectWindow);
    };

    Scene_Item.prototype.slotSelectWindowRect = function () {
        const ww = windowWidth || 400;
        const wh = this.calcWindowHeight(visibleCommands || 6, true);
        const wx = (Graphics.boxWidth - ww) / 2;
        const wy = (Graphics.boxHeight - wh) / 2;
        return new Rectangle(wx, wy, ww, wh);
    };

    const _Scene_Item_onItemOk = Scene_Item.prototype.onItemOk;
    Scene_Item.prototype.onItemOk = function () {
        if (isHotbarInitializing) {
            _Scene_Item_onItemOk.call(this);
            return;
        }

        if (!allowEquipNonUsable && !$gameParty.leader().canUse(this.item())) {
            _Scene_Item_onItemOk.call(this);
            return;
        }

        if (!this._slotSelectWindow) {
            this.createSlotSelectWindow();
        }

        if (this._slotSelectWindow) {
            this._slotSelectWindow.setSkill(this.item());
            this._slotSelectWindow.show();
            this._slotSelectWindow.activate();
            this._slotSelectWindow.select(0);
            this._itemWindow.deactivate();
            this._slotSelectWindow.refresh();
        } else {
            _Scene_Item_onItemOk.call(this);
        }
    };

    Scene_Item.prototype.itemTargetsValid = function () {
        const item = this.item();
        if (!item) return false;
        return item.scope === 0 || $gameParty.members().length > 0;
    };

    Scene_Skill.prototype.itemTargetsValid = function () {
        const item = this.item();
        if (!item) return false;
        return item.scope === 0 || this.actor().isSkillWtypeOk(item);
    };

    Scene_Item.prototype.onSlotSelectOk = function () {
        if (this._slotSelectWindow.currentSymbol() === 'use_now') {
            if (this.itemTargetsValid()) {
                this._slotSelectWindow.hide();
                this._slotSelectWindow.deactivate();
                if (Imported.Hendrix_Action_Engine && typeof soloPlayerMenu !== 'undefined' && soloPlayerMenu) {
                    this.determineItem();
                    this.onActorOk();
                    this.onActorCancel();
                    return;
                }
                this.determineItem();
            } else {
                SoundManager.playBuzzer();
            }
            return;
        }

        const item = this.item();
        if (isItemDisallowed(item)) {
            SoundManager.playBuzzer();
            this._itemWindow.activate();
            this._slotSelectWindow.activate();
            return;
        }

        const slotName = this._slotSelectWindow.currentExt();
        const itemId = this.item().id;

        if (_lockedSlots.has(slotName)) {
            SoundManager.playBuzzer();
            this._itemWindow.activate();
            this._slotSelectWindow.activate();
            return;
        }

        const slot = ALL_AVAILABLE_SLOTS.find(s => s.name === slotName);
        if (slot) {
            slot.slot.setSkill(itemId, this.item().iconIndex);
            _slotData.set(slotName, { type: 'item', id: itemId });
            saveToSystem();
        }

        this.onSlotSelectCancel();
        this._itemWindow.activate();
    };

    Scene_Item.prototype.onSlotSelectCancel = function () {
        this._slotSelectWindow.hide();
        this._slotSelectWindow.deactivate();
        this._itemWindow.activate();
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    Sprite_SkillSlot.prototype.startFlash = function () {
        const targetSprite = this._customImageSprite.visible ? this._customImageSprite : this._iconSprite;
        this._flashDuration = 15;
        this._flashColor = [255, 255, 255, 255];
        targetSprite._flashDuration = 15;
    };

    Sprite_SkillSlot.prototype.updateFlash = function () {
        if (this._flashDuration > 0) {
            const targetSprite = this._customImageSprite.visible ? this._customImageSprite : this._iconSprite;
            const d = this._flashDuration--;
            this._flashColor[3] = (d / 15) * 255;
            targetSprite.setBlendColor(this._flashColor);
        }
    };

    Spriteset_SkillUI.prototype.flashSlot = function (slotName) {
        const slot = this._slots.get(slotName);
        if (slot && _slotData.has(slotName)) {
            slot.startFlash();
        }
    };

    Sprite_SkillSlot.prototype.startCooldown = function (seconds, showTimer = false) {
        const targetSprite = this._customImageSprite.visible ? this._customImageSprite : this._iconSprite;
        if (!targetSprite || !targetSprite.bitmap) return;

        const loadListener = () => {
            if (!this.parent) return;

            this._cooldownDuration = seconds;
            this._cooldownTotal = seconds;
            this._inCooldown = true;
            this._showTimer = showTimer;

            if (this._showTimer) {
                if (!this._timerSprite) {
                    this._timerSprite = new Sprite();
                    this._timerSprite.bitmap = new Bitmap(48, 32);
                    this._timerSprite.anchor.x = 0.5;
                    this._timerSprite.anchor.y = 0.5;
                    this.addChild(this._timerSprite);
                }
            }

            _cooldownStates.set(this._config.Name, {
                duration: seconds,
                total: seconds,
                showTimer: showTimer
            });

            this.createCooldownEffect();
        };

        if (targetSprite.bitmap.isReady()) {
            loadListener();
        } else {
            targetSprite.bitmap.addLoadListener(loadListener);
        }
    };

    const _Scene_Map_start = Scene_Map.prototype.start;
    Scene_Map.prototype.start = function () {
        _Scene_Map_start.call(this);
        if (this._skillUI && visibilitySwitchId !== 0) {
            this._skillUI.visible = $gameSwitches.value(visibilitySwitchId);
        }
        if (this._skillUI) {
            for (const [slotName, cooldownData] of _cooldownStates.entries()) {
                const slot = this._skillUI._slots.get(slotName);
                if (slot) {
                    slot._cooldownDuration = cooldownData.duration;
                    slot._cooldownTotal = cooldownData.total;
                    slot._inCooldown = true;
                    slot._showTimer = cooldownData.showTimer;
                    slot.createCooldownEffect();

                    if (cooldownData.showTimer) {
                        slot._timerSprite = new Sprite();
                        slot._timerSprite.bitmap = new Bitmap(48, 32);
                        slot._timerSprite.anchor.x = 0.5;
                        slot._timerSprite.anchor.y = 0.5;
                        slot.addChild(slot._timerSprite);
                    }
                }
            }
        }
        if (this._skillUI && this._skillUI._gamepadGrids.length > 0) {
            this._skillUI.initializeGamepadCursor();
            if (!navigator.getGamepads || !navigator.getGamepads()[0]) {
                this._skillUI._gamepadCursor.visible = false;
            }
        }
    };

    Sprite_SkillSlot.prototype.createCooldownEffect = function () {
        const targetSprite = this._isUsingCustomImage ? this._customImageSprite : this._iconSprite;
        if (!targetSprite || !targetSprite.visible) return;

        this._originalScale = {
            x: targetSprite.scale.x,
            y: targetSprite.scale.y
        };

        const setupCooldown = () => {
            this._grayscaleClone = new PIXI.Sprite(targetSprite.texture);
            this._grayscaleClone.anchor = targetSprite.anchor;
            this._grayscaleClone.scale = targetSprite.scale;
            this._grayscaleClone.x = targetSprite.x;
            this._grayscaleClone.y = targetSprite.y;
            this._grayscaleClone.filters = [new PIXI.filters.ColorMatrixFilter()];
            this._grayscaleClone.filters[0].desaturate();
            this._coloredClone = new PIXI.Sprite(targetSprite.texture);
            this._coloredClone.anchor = targetSprite.anchor;
            this._coloredClone.scale = targetSprite.scale;
            this._coloredClone.x = targetSprite.x;
            this._coloredClone.y = targetSprite.y;
            this._cooldownContainer.removeChildren();
            this._cooldownContainer.addChild(this._grayscaleClone);
            this._cooldownContainer.addChild(this._coloredClone);
            this._colorMask = new PIXI.Graphics();
            this._cooldownContainer.addChild(this._colorMask);
            this._coloredClone.mask = this._colorMask;
            targetSprite.visible = false;
        };

        if (this._isUsingCustomImage && !targetSprite.bitmap.isReady()) {
            targetSprite.bitmap.addLoadListener(setupCooldown);
        } else {
            setupCooldown();
        }
    };

    Sprite_SkillSlot.prototype.cleanupCooldownEffects = function () {
        const targetSprite = this._isUsingCustomImage ? this._customImageSprite : this._iconSprite;

        if (this._grayscaleClone) {
            this._cooldownContainer.removeChild(this._grayscaleClone);
            this._grayscaleClone.destroy();
            this._grayscaleClone = null;
        }

        if (this._coloredClone) {
            this._cooldownContainer.removeChild(this._coloredClone);
            this._coloredClone.destroy();
            this._coloredClone = null;
        }

        if (this._colorMask) {
            this._cooldownContainer.removeChild(this._colorMask);
            this._colorMask.destroy();
            this._colorMask = null;
        }

        targetSprite.visible = true;

        this._cooldownContainer.removeChildren();
    };

    Sprite_SkillSlot.prototype.updateCooldown = function () {
        if (!this._inCooldown && this._bounceDuration === 0) return;

        if (this._inCooldown) {
            const key = getGlobalCooldownKey(this._lastItemType, this._lastItemId);
            const remainingFrames = _globalCooldowns.get(key);

            if (!remainingFrames || remainingFrames <= 0) {
                this._inCooldown = false;
                this._bounceDuration = 20;

                if (this._timerSprite) {
                    this.removeChild(this._timerSprite);
                    this._timerSprite = null;
                }

                _cooldownStates.delete(this._config.Name);
                this.cleanupCooldownEffects();
                return;
            }

            const progress = 1 - (remainingFrames / (this._cooldownTotal * 60));

            if (this._showTimer && this._timerSprite) {
                this._timerSprite.bitmap.clear();
                applyFontSettings(this._timerSprite.bitmap);
                const timeText = Math.ceil(remainingFrames / 60).toString();
                this._timerSprite.bitmap.drawText(timeText, 0, 0, 48, 32, 'center');
            }

            const targetSprite = this._isUsingCustomImage ? this._customImageSprite : this._iconSprite;
            if (targetSprite && this._colorMask) {
                const height = this._isUsingCustomImage ? targetSprite.height * targetSprite.scale.y : targetSprite.height;
                const width = this._isUsingCustomImage ? targetSprite.width * targetSprite.scale.x : targetSprite.width;
                const maskHeight = height * progress;

                this._colorMask.clear();
                this._colorMask.beginFill(0xFFFFFF);

                const x = targetSprite.x - (width * targetSprite.anchor.x);
                const y = targetSprite.y + height - maskHeight - (height * targetSprite.anchor.y);

                this._colorMask.drawRect(x, y, width, maskHeight);
                this._colorMask.endFill();
            }
        }

        if (this._bounceDuration > 0) {
            this._bounceDuration--;
            const bounceProgress = this._bounceDuration / 20;
            const bounceScale = 1 + Math.sin(bounceProgress * Math.PI) * (this._isUsingCustomImage ? 0.3 : 0.3);

            const targetSprite = this._isUsingCustomImage ? this._customImageSprite : this._iconSprite;
            if (targetSprite && this._originalScale) {
                targetSprite.scale.x = this._originalScale.x * bounceScale;
                targetSprite.scale.y = this._originalScale.y * bounceScale;

                if (this._bounceDuration === 0) {
                    targetSprite.scale.x = this._originalScale.x;
                    targetSprite.scale.y = this._originalScale.y;
                    this._originalScale = null;
                }
            }
        }
    };

    Sprite_SkillSlot.prototype.startCooldown = function (seconds, showTimer = false) {
        const data = _slotData.get(this._config.Name);
        if (data) {
            this._lastItemType = data.type;
            this._lastItemId = data.id;
        }

        const targetSprite = this._customImageSprite.visible ? this._customImageSprite : this._iconSprite;
        if (!targetSprite || !targetSprite.bitmap) return;

        const loadListener = () => {
            if (!this.parent) return;

            this._cooldownTotal = seconds;
            this._inCooldown = true;
            this._showTimer = showTimer;

            if (this._showTimer) {
                if (!this._timerSprite) {
                    this._timerSprite = new Sprite();
                    this._timerSprite.bitmap = new Bitmap(48, 32);
                    this._timerSprite.anchor.x = 0.5;
                    this._timerSprite.anchor.y = 0.5;
                    this.addChild(this._timerSprite);
                }
            }

            this.createCooldownEffect();
        };

        if (targetSprite.bitmap.isReady()) {
            loadListener();
        } else {
            targetSprite.bitmap.addLoadListener(loadListener);
        }
    };

    Spriteset_SkillUI.prototype.startCooldown = function (slotName, seconds, showTimer) {
        const slot = this._slots.get(slotName);
        if (slot && _slotData.has(slotName)) {
            slot.startCooldown(seconds, showTimer);
        }
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    function Sprite_GamepadCursor() {
        this.initialize(...arguments);
    }

    Sprite_GamepadCursor.prototype = Object.create(Sprite.prototype);
    Sprite_GamepadCursor.prototype.constructor = Sprite_GamepadCursor;

    Sprite_GamepadCursor.prototype.initialize = function () {
        Sprite.prototype.initialize.call(this);
        this._targetSlot = null;
        this._currentGrid = null;
        this._currentGridIndex = -1;
        this._currentSlotIndex = -1;
        this.createCursor();
    };

    Sprite_GamepadCursor.prototype.createCursor = function () {
        if (gamepadCursorImage) {
            this.bitmap = ImageManager.loadSystem(gamepadCursorImage);
        } else {
            this.bitmap = new Bitmap(40, 40);
            const ctx = this.bitmap._context;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, 38, 38);
        }
        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.visible = false;
    };

    Sprite_GamepadCursor.prototype.update = function () {
        Sprite.prototype.update.call(this);
        if (!this._targetSlot || !navigator.getGamepads || !navigator.getGamepads()[0]) {
            this.visible = false;
            return;
        }
        this.visible = true;
        this.x = this._targetSlot.x;
        this.y = this._targetSlot.y;
    };

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    if (Utils.RPGMAKER_NAME === "MZ") {
        PluginManager.registerCommand(pluginName, "LockSlot", function (args) {
            const slotName = args.SlotName;
            const shouldLock = args.Lock === 'true';

            if (shouldLock) {
                _lockedSlots.add(slotName);
            } else {
                _lockedSlots.delete(slotName);
            }
        });

        PluginManager.registerCommand(pluginName, "HotbarInputStatus", function (args) {
            hotbarInputEnabled = args.Status === 'true';
        });

        PluginManager.registerCommand(pluginName, "SetSkill", function (args) {
            if (SceneManager._scene._skillUI) {
                SceneManager._scene._skillUI.setSkill(
                    args.Name,
                    Number(args.skillId || 0),
                    Number(args.itemId || 0),
                    Number(args.weaponId || 0)
                );
            }
        });

        PluginManager.registerCommand(pluginName, "RemoveFromSlot", function (args) {
            if (SceneManager._scene._skillUI) {
                const slot = SceneManager._scene._skillUI._slots.get(args.Name);
                if (slot) {
                    slot.setSkill(0, 0);
                    _slotData.delete(args.Name);
                    syncActorHotbarSkill(args.Name, 0);
                    saveToSystem();
                }
            }
        });

        PluginManager.registerCommand(pluginName, "UseSlot", function (args) {
            if (!canUseSlot(args.Name)) return;

            const slotData = _slotData.get(args.Name);
            if (!slotData) return;

            const actor = $gameParty.leader();
            let success = false;
            let cooldownData = { duration: 0, showTimer: true };

            switch (slotData.type) {
                case 'skill':
                    const skill = $dataSkills[slotData.id];
                    if (skill) {
                        const mpCost = actor.skillMpCost(skill);
                        if (actor.mp >= mpCost && actor.canUse(skill)) {
                            actor.gainMp(-mpCost);

                            if (skill.scope === 11) {
                                const action = new Game_Action(actor);
                                action.setSkill(slotData.id);
                                action.setTarget(actor.index());
                                action.apply(actor);
                            }

                            if (skill.effects) {
                                const commonEventEffect = skill.effects.find(effect => effect.code === 44);
                                if (commonEventEffect && $gameMap._interpreter) {
                                    $gameMap._interpreter.clear();
                                    $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                }
                            }
                            cooldownData = extractCooldown(skill.note);
                            success = true;
                        }
                    }
                    break;
                case 'item':
                    const item = $dataItems[slotData.id];
                    if (item && $gameParty.hasItem(item) && actor.canUse(item)) {
                        if (item.effects) {
                            const commonEventEffect = item.effects.find(effect => effect.code === 44);
                            if (commonEventEffect && $gameMap._interpreter) {
                                $gameMap._interpreter.clear();
                                $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                            }
                        }
                        actor.useItem(item);

                        const action = new Game_Action(actor);
                        action.setItemObject(item);
                        action.setTarget(actor.index());
                        action.apply(actor);

                        cooldownData = extractCooldown(item.note);
                        success = true;

                        if (!$gameParty.hasItem(item) && unequipEmptyItems) {
                            const slot = SceneManager._scene._skillUI._slots.get(args.Name);
                            if (slot) {
                                slot.setSkill(0, 0);
                                _slotData.delete(args.Name);
                                saveToSystem();
                            }
                        }
                    }
                    break;
                case 'weapon':
                    const weapon = $dataWeapons[slotData.id];
                    if (weapon) {
                        cooldownData = extractCooldown(weapon.note);
                        success = true;
                    }
                    break;
            }

            if (success) {
                $gameParty.members().forEach(member => member.refresh());
                SceneManager._scene._skillUI.flashSlot(args.Name);

                if (cooldownData.duration > 0) {
                    setGlobalCooldown(slotData.type, slotData.id, cooldownData.duration, cooldownData.showTimer);
                }
            }
        });

        PluginManager.registerCommand(pluginName, "UseSelectedSlot", function (args) {
            if (!SceneManager._scene._skillUI || $gameMessage.isBusy() || $gameMap.isEventRunning()) return;

            const ui = SceneManager._scene._skillUI;
            if (!ui._gamepadCursor._targetSlot) return;

            const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
            if (!currentGrid) return;

            const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
            if (!slotConfig) return;

            const slotName = slotConfig.Name;
            const slot = ui._slots.get(slotName);

            if (slot && slot._bounceDuration > 0) return;

            if (!canUseSlot(slotName)) return;

            const slotData = _slotData.get(slotName);
            if (!slotData) return;

            if (isItemDisallowedByCommand(slotData.type, slotData.id)) {
                return;
            }

            const actor = $gameParty.leader();
            let success = false;
            let cooldownData = { duration: 0, showTimer: true };

            switch (slotData.type) {
                case 'skill':
                    const skill = $dataSkills[slotData.id];
                    if (skill) {
                        const mpCost = actor.skillMpCost(skill);
                        if (actor.mp >= mpCost && actor.canUse(skill)) {
                            actor.gainMp(-mpCost);

                            if (skill.scope === 11) {
                                const action = new Game_Action(actor);
                                action.setSkill(slotData.id);
                                action.setTarget(actor.index());
                                action.apply(actor);
                            }

                            if (skill.effects) {
                                const commonEventEffect = skill.effects.find(effect => effect.code === 44);
                                if (commonEventEffect && $gameMap._interpreter) {
                                    $gameMap._interpreter.clear();
                                    $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                }
                            }
                            cooldownData = extractCooldown(skill.note);
                            success = true;
                        }
                    }
                    break;
                case 'item':
                    const item = $dataItems[slotData.id];
                    if (item && $gameParty.hasItem(item) && actor.canUse(item)) {
                        if (item.effects) {
                            const commonEventEffect = item.effects.find(effect => effect.code === 44);
                            if (commonEventEffect && $gameMap._interpreter) {
                                $gameMap._interpreter.clear();
                                $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                            }
                        }
                        actor.useItem(item);

                        const action = new Game_Action(actor);
                        action.setItemObject(item);
                        action.setTarget(actor.index());
                        action.apply(actor);

                        cooldownData = extractCooldown(item.note);
                        success = true;

                        if (!$gameParty.hasItem(item) && unequipEmptyItems) {
                            const slot = SceneManager._scene._skillUI._slots.get(slotName);
                            if (slot) {
                                slot.setSkill(0, 0);
                                _slotData.delete(slotName);
                                saveToSystem();
                            }
                        }
                    }
                    break;
                case 'weapon':
                    const weapon = $dataWeapons[slotData.id];
                    if (weapon) {
                        cooldownData = extractCooldown(weapon.note);
                        success = true;
                    }
                    break;
                case 'armor':
                    const armor = $dataArmors[slotData.id];
                    if (armor) {
                        cooldownData = extractCooldown(armor.note);
                        success = true;
                    }
                    break;
            }

            if (success) {
                $gameParty.members().forEach(member => member.refresh());
                SceneManager._scene._skillUI.flashSlot(slotName);

                if (cooldownData.duration > 0) {
                    setGlobalCooldown(slotData.type, slotData.id, cooldownData.duration, cooldownData.showTimer);
                }
            }
        });

        PluginManager.registerCommand(pluginName, "PushNextStuff", function (args) {
            if (!SceneManager._scene._skillUI) return;

            const slot = SceneManager._scene._skillUI._slots.get(args.Name);
            if (!slot) return;

            const actor = $gameParty.leader();
            if (!actor) return;

            switch (args.Type) {
                case 'Weapon':
                    const currentWeaponId = (_slotData.get(args.Name) ? _slotData.get(args.Name).id : 0);
                    const availableWeapons = $gameParty.weapons().filter(weapon =>
                        actor.canEquip(weapon)
                    );

                    if (availableWeapons.length > 0) {
                        let nextWeapon = null;
                        if (currentWeaponId === 0) {
                            nextWeapon = availableWeapons[0];
                        } else {
                            const currentIndex = availableWeapons.findIndex(w => w.id === currentWeaponId);
                            if (currentIndex !== -1 && currentIndex < availableWeapons.length - 1) {
                                nextWeapon = availableWeapons[currentIndex + 1];
                            } else {
                                nextWeapon = availableWeapons[0];
                            }
                        }

                        if (nextWeapon) {
                            slot.setSkill(nextWeapon.id, nextWeapon.iconIndex);
                            _slotData.set(args.Name, { type: 'weapon', id: nextWeapon.id });

                            actor.changeEquip(0, nextWeapon);
                        }
                    }
                    break;

                case 'Shield':
                    const currentShieldId = (_slotData.get(args.Name) ? _slotData.get(args.Name).id : 0);
                    const availableShields = $gameParty.armors().filter(armor =>
                        armor.atypeId === 1 && actor.canEquip(armor)
                    );

                    if (availableShields.length > 0) {
                        let nextShield = null;
                        if (currentShieldId === 0) {
                            nextShield = availableShields[0];
                        } else {
                            const currentIndex = availableShields.findIndex(s => s.id === currentShieldId);
                            if (currentIndex !== -1 && currentIndex < availableShields.length - 1) {
                                nextShield = availableShields[currentIndex + 1];
                            } else {
                                nextShield = availableShields[0];
                            }
                        }

                        if (nextShield) {
                            slot.setSkill(nextShield.id, nextShield.iconIndex);
                            _slotData.set(args.Name, { type: 'armor', id: nextShield.id });

                            actor.changeEquip(1, nextShield);
                        }
                    }
                    break;

                case 'Item':
                    const currentItemId = (_slotData.get(args.Name) ? _slotData.get(args.Name).id : 0);
                    const availableItems = $gameParty.items().filter(item =>
                        actor.canUse(item)
                    );

                    if (availableItems.length > 0) {
                        let nextItem = null;
                        if (currentItemId === 0) {
                            nextItem = availableItems[0];
                        } else {
                            const currentIndex = availableItems.findIndex(i => i.id === currentItemId);
                            if (currentIndex !== -1 && currentIndex < availableItems.length - 1) {
                                nextItem = availableItems[currentIndex + 1];
                            } else {
                                nextItem = availableItems[0];
                            }
                        }

                        if (nextItem) {
                            slot.setSkill(nextItem.id, nextItem.iconIndex);
                            _slotData.set(args.Name, { type: 'item', id: nextItem.id });
                        }
                    }
                    break;

                case 'Skill':
                    const currentSkillId = (_slotData.get(args.Name) ? _slotData.get(args.Name).id : 0);
                    const availableSkills = actor.skills().filter(skill =>
                        actor.canUse(skill)
                    );

                    if (availableSkills.length > 0) {
                        let nextSkill = null;
                        if (currentSkillId === 0) {
                            nextSkill = availableSkills[0];
                        } else {
                            const currentIndex = availableSkills.findIndex(s => s.id === currentSkillId);
                            if (currentIndex !== -1 && currentIndex < availableSkills.length - 1) {
                                nextSkill = availableSkills[currentIndex + 1];
                            } else {
                                nextSkill = availableSkills[0];
                            }
                        }

                        if (nextSkill) {
                            slot.setSkill(nextSkill.id, nextSkill.iconIndex);
                            _slotData.set(args.Name, { type: 'skill', id: nextSkill.id });
                            syncActorHotbarSkill(args.Name, nextSkill.id);
                        }
                    }
                    break;
            }
            saveToSystem();
        });

        PluginManager.registerCommand(pluginName, "GamepadPushNextStuff", function (args) {
            const scene = SceneManager._scene;
            if (!scene || !scene._skillUI) return;

            const ui = scene._skillUI;
            if (!ui._gamepadCursor._targetSlot) return;

            const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
            if (!currentGrid) return;

            const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
            if (!slotConfig) return;

            const slotName = slotConfig.Name;
            const slot = ui._slots.get(slotName);
            if (!slot) return;

            const actor = $gameParty.leader();
            if (!actor) return;

            switch (args.Type) {
                case 'Weapon':
                    const currentWeaponId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                    const availableWeapons = $gameParty.weapons().filter(weapon =>
                        actor.canEquip(weapon)
                    );

                    if (availableWeapons.length > 0) {
                        let nextWeapon = null;
                        if (currentWeaponId === 0) {
                            nextWeapon = availableWeapons[0];
                        } else {
                            const currentIndex = availableWeapons.findIndex(w => w.id === currentWeaponId);
                            if (currentIndex !== -1 && currentIndex < availableWeapons.length - 1) {
                                nextWeapon = availableWeapons[currentIndex + 1];
                            } else {
                                nextWeapon = availableWeapons[0];
                            }
                        }

                        if (nextWeapon) {
                            slot.setSkill(nextWeapon.id, nextWeapon.iconIndex);
                            _slotData.set(slotName, { type: 'weapon', id: nextWeapon.id });

                            actor.changeEquip(0, nextWeapon);
                        }
                    }
                    break;

                case 'Shield':
                    const currentShieldId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                    const availableShields = $gameParty.armors().filter(armor =>
                        armor.atypeId === 1 && actor.canEquip(armor)
                    );

                    if (availableShields.length > 0) {
                        let nextShield = null;
                        if (currentShieldId === 0) {
                            nextShield = availableShields[0];
                        } else {
                            const currentIndex = availableShields.findIndex(s => s.id === currentShieldId);
                            if (currentIndex !== -1 && currentIndex < availableShields.length - 1) {
                                nextShield = availableShields[currentIndex + 1];
                            } else {
                                nextShield = availableShields[0];
                            }
                        }

                        if (nextShield) {
                            slot.setSkill(nextShield.id, nextShield.iconIndex);
                            _slotData.set(slotName, { type: 'armor', id: nextShield.id });

                            actor.changeEquip(1, nextShield);
                        }
                    }
                    break;

                case 'Item':
                    const currentItemId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                    const availableItems = $gameParty.items().filter(item =>
                        actor.canUse(item)
                    );

                    if (availableItems.length > 0) {
                        let nextItem = null;
                        if (currentItemId === 0) {
                            nextItem = availableItems[0];
                        } else {
                            const currentIndex = availableItems.findIndex(i => i.id === currentItemId);
                            if (currentIndex !== -1 && currentIndex < availableItems.length - 1) {
                                nextItem = availableItems[currentIndex + 1];
                            } else {
                                nextItem = availableItems[0];
                            }
                        }

                        if (nextItem) {
                            slot.setSkill(nextItem.id, nextItem.iconIndex);
                            _slotData.set(slotName, { type: 'item', id: nextItem.id });
                        }
                    }
                    break;

                case 'Skill':
                    const currentSkillId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                    const availableSkills = actor.skills().filter(skill =>
                        actor.canUse(skill)
                    );

                    if (availableSkills.length > 0) {
                        let nextSkill = null;
                        if (currentSkillId === 0) {
                            nextSkill = availableSkills[0];
                        } else {
                            const currentIndex = availableSkills.findIndex(s => s.id === currentSkillId);
                            if (currentIndex !== -1 && currentIndex < availableSkills.length - 1) {
                                nextSkill = availableSkills[currentIndex + 1];
                            } else {
                                nextSkill = availableSkills[0];
                            }
                        }

                        if (nextSkill) {
                            slot.setSkill(nextSkill.id, nextSkill.iconIndex);
                            _slotData.set(slotName, { type: 'skill', id: nextSkill.id });
                            syncActorHotbarSkill(slotName, nextSkill.id);
                        }
                    }
                    break;
            }
            saveToSystem();
        });

        PluginManager.registerCommand(pluginName, "StartCooldownForThing", function (args) {
            var name = args.Name;
            var duration = args.Time === 'notetag' ? null : Number(args.Time);
            var showTimer = args.ShowTimer === 'true';
            var found = false;
            var itemData;

            for (var i = 1; i < $dataItems.length; i++) {
                if ($dataItems[i] && $dataItems[i].name === name) {
                    itemData = duration !== null ? { duration: duration, showTimer: true } : extractCooldown($dataItems[i].note);
                    setGlobalCooldown('item', i, itemData.duration, showTimer);
                    found = true;
                    break;
                }
            }

            if (!found) {
                for (var i = 1; i < $dataSkills.length; i++) {
                    if ($dataSkills[i] && $dataSkills[i].name === name) {
                        itemData = duration !== null ? { duration: duration, showTimer: true } : extractCooldown($dataSkills[i].note);
                        setGlobalCooldown('skill', i, itemData.duration, showTimer);
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                for (var i = 1; i < $dataWeapons.length; i++) {
                    if ($dataWeapons[i] && $dataWeapons[i].name === name) {
                        itemData = duration !== null ? { duration: duration, showTimer: true } : extractCooldown($dataWeapons[i].note);
                        setGlobalCooldown('weapon', i, itemData.duration, showTimer);
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                for (var i = 1; i < $dataArmors.length; i++) {
                    if ($dataArmors[i] && $dataArmors[i].name === name) {
                        itemData = duration !== null ? { duration: duration, showTimer: true } : extractCooldown($dataArmors[i].note);
                        setGlobalCooldown('armor', i, itemData.duration, showTimer);
                        break;
                    }
                }
            }
        });

        PluginManager.registerCommand(pluginName, "AllowItemUse", function (args) {
            const targetType = args.TargetType;
            let targetIdName = args.TargetIdName;
            const allowUse = args.Status === 'true';

            if (targetIdName.startsWith('$game')) {
                targetIdName = eval(targetIdName);
            }

            let database;
            switch (targetType) {
                case 'item':
                    database = $dataItems;
                    break;
                case 'weapon':
                    database = $dataWeapons;
                    break;
                case 'armor':
                    database = $dataArmors;
                    break;
                case 'skill':
                    database = $dataSkills;
                    break;
                default:
                    return;
            }

            let targetItem = null;
            const targetId = Number(targetIdName);

            if (!isNaN(targetId) && targetId > 0) {
                targetItem = database[targetId];
            }

            if (!targetItem && targetIdName) {
                targetItem = database.find(item =>
                    item && item.name.toLowerCase() === String(targetIdName).toLowerCase()
                );
            }

            if (!targetItem) {
                return;
            }

            if (!$gameSystem._disallowedHotbarItems) {
                $gameSystem._disallowedHotbarItems = {};
            }

            const key = `${targetType}_${targetItem.id}`;

            if (allowUse) {
                delete $gameSystem._disallowedHotbarItems[key];
            } else {
                $gameSystem._disallowedHotbarItems[key] = true;
            }
        });
    }

    function isItemDisallowedByCommand(type, id) {
        if (!$gameSystem._disallowedHotbarItems) return false;
        const key = `${type}_${id}`;
        return $gameSystem._disallowedHotbarItems[key] === true;
    }

    //-----------------------------------------------------------------------------
    //-----------------------------------------------------------------------------

    const _Scene_Map_updateScene = Scene_Map.prototype.updateScene;
    Scene_Map.prototype.updateScene = function () {
        _Scene_Map_updateScene.call(this);
        this.updateSlotInputs();
    };

    Scene_Map.prototype.updateSlotInputs = function () {
        if (!this._skillUI || $gameMessage.isBusy() || $gameMap.isEventRunning()) return;
        if (!hotbarInputEnabled) return;

        this._skillUI._slots.forEach((slot, slotName) => {
            if (!slot._config.Button) return;
            if (slot._bounceDuration > 0) return;
            let buttonConfig = slot._config.Button.split(',')[0].trim().toLowerCase();

            if (Input.isTriggered(buttonConfig)) {
                const slotData = _slotData.get(slotName);
                if (!slotData) return;

                if (isOnGlobalCooldown(slotData.type, slotData.id)) return;

                slot.useSlotContents();
            }
        });
    };

    const _Scene_Map_updateGamepadNavigation = Spriteset_SkillUI.prototype.updateGamepadNavigation;
    Spriteset_SkillUI.prototype.updateGamepadNavigation = function () {
        _Scene_Map_updateGamepadNavigation.call(this);
        const isGamepadConnected = navigator.getGamepads && navigator.getGamepads()[0];
        if (!isGamepadConnected) return;
        const gamepad = navigator.getGamepads()[0];
        if (Imported.Hendrix_Keyboard_Gamepad) {
            if (Input.isTriggered('gamepad use slot') && this._gamepadCursor._targetSlot) {
                const currentGrid = this._gamepadGrids[this._gamepadCursor._currentGridIndex];
                if (currentGrid) {
                    const slotConfig = currentGrid.slots[this._gamepadCursor._currentSlotIndex];
                    if (slotConfig) {
                        if (SceneManager._scene) {
                            const interpreter = new Game_Interpreter();
                            if (Utils.RPGMAKER_NAME === "MV") {
                                interpreter.pluginCommand("UseSelectedSlot", []);
                            } else {
                                PluginManager.callCommand(interpreter, pluginName, "UseSelectedSlot", {});
                            }
                        }
                    }
                }
            }
        } else {
            const useButtonIndex = GamepadButtons[parameters.GamepadUseSlotButton];
            if (useButtonIndex !== undefined) {
                let isButtonPressed = false;

                if (Utils.RPGMAKER_NAME === "MV") {
                    if (gamepad.buttons[useButtonIndex]) {
                        if (typeof gamepad.buttons[useButtonIndex] === 'object') {
                            isButtonPressed = gamepad.buttons[useButtonIndex].pressed;
                        } else {
                            isButtonPressed = gamepad.buttons[useButtonIndex] === 1;
                        }
                    }
                } else {
                    isButtonPressed = gamepad.buttons[useButtonIndex] && gamepad.buttons[useButtonIndex].pressed;
                }

                const isNewPress = isButtonPressed && this._lastUseButtonState === false;
                this._lastUseButtonState = isButtonPressed;

                if (isNewPress && this._gamepadCursor._targetSlot) {
                    const currentGrid = this._gamepadGrids[this._gamepadCursor._currentGridIndex];
                    if (currentGrid) {
                        const slotConfig = currentGrid.slots[this._gamepadCursor._currentSlotIndex];
                        if (slotConfig) {
                            if (SceneManager._scene) {
                                const interpreter = new Game_Interpreter();
                                if (Utils.RPGMAKER_NAME === "MV") {
                                    interpreter.pluginCommand("UseSelectedSlot", []);
                                } else {
                                    PluginManager.callCommand(interpreter, pluginName, "UseSelectedSlot", {});
                                }
                            }
                        }
                    }
                }
            }
        }

        this._slots.forEach((slot, slotName) => {
            if (!slot._config.Button || !slot._config.Button.includes(',')) return;

            const gamepadButtonName = slot._config.Button.split(',')[1].trim();
            if (!gamepadButtonName) return;

            const buttonIndex = GamepadButtons[gamepadButtonName];
            if (buttonIndex === undefined) return;

            if (!this._lastGamepadSlotPressed) {
                this._lastGamepadSlotPressed = {};
            }

            let isCurrentlyPressed = false;
            if (Utils.RPGMAKER_NAME === "MV") {
                if (!gamepad.buttons[buttonIndex]) {
                    isCurrentlyPressed = false;
                } else if (typeof gamepad.buttons[buttonIndex] === 'object') {
                    isCurrentlyPressed = gamepad.buttons[buttonIndex].pressed;
                } else {
                    isCurrentlyPressed = gamepad.buttons[buttonIndex] === 1;
                }
            } else {
                isCurrentlyPressed = gamepad.buttons[buttonIndex] && gamepad.buttons[buttonIndex].pressed;
            }
            const wasPreviouslyPressed = this._lastGamepadSlotPressed[slotName] === true;
            const isTriggered = isCurrentlyPressed && !wasPreviouslyPressed;
            this._lastGamepadSlotPressed[slotName] = isCurrentlyPressed;
            if (isTriggered) {
                if (SceneManager._scene) {
                    const interpreter = new Game_Interpreter();
                    if (Utils.RPGMAKER_NAME === "MV") {
                        interpreter.pluginCommand("UseSlot", [slotName]);
                    } else {
                        PluginManager.callCommand(interpreter, pluginName, "UseSlot", { Name: slotName });
                    }
                }
            }
        });
    };

    if (Utils.RPGMAKER_NAME === "MV") {
        const parseSlotName = function (args) {
            if (!args[0] || !args[0].startsWith('[')) {
                return args[0];
            }
            const fullText = args.join(' ');
            const bracketEnd = fullText.indexOf(']');
            if (bracketEnd !== -1) {
                return fullText.substring(1, bracketEnd);
            }
            return args[0];
        };

        const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
        Game_Interpreter.prototype.pluginCommand = function (command, args) {
            _Game_Interpreter_pluginCommand.call(this, command, args);

            switch (command) {
                case 'LockSlot':
                    const lockSlotName = parseSlotName(args);
                    let shouldLockSlot;

                    if (args[0] && args[0].startsWith('[')) {
                        shouldLockSlot = args[2] === 'true';
                    } else {
                        shouldLockSlot = args[1] === 'true';
                    }

                    if (shouldLockSlot) {
                        _lockedSlots.add(lockSlotName);
                    } else {
                        _lockedSlots.delete(lockSlotName);
                    }
                    break;

                case 'HotbarInputStatus':
                    hotbarInputEnabled = args[0] === 'true';
                    break;

                case 'SetToSlot':
                    if (SceneManager._scene._skillUI) {
                        let skillId, itemId, weaponId;

                        if (args[0] && args[0].startsWith('[')) {
                            const fullText = args.join(' ');
                            const bracketEnd = fullText.indexOf(']');

                            if (bracketEnd !== -1) {
                                const afterBracket = fullText.substring(bracketEnd + 1).trim();
                                const remainingArgs = afterBracket.split(/\s+/).filter(arg => arg !== '');

                                skillId = Number(remainingArgs[0] || 0);
                                itemId = Number(remainingArgs[1] || 0);
                                weaponId = Number(remainingArgs[2] || 0);
                            } else {
                                skillId = Number(args[1] || 0);
                                itemId = Number(args[2] || 0);
                                weaponId = Number(args[3] || 0);
                            }
                        } else {
                            skillId = Number(args[1] || 0);
                            itemId = Number(args[2] || 0);
                            weaponId = Number(args[3] || 0);
                        }

                        SceneManager._scene._skillUI.setSkill(
                            parseSlotName(args),
                            skillId,
                            itemId,
                            weaponId
                        );

                        saveToSystem();
                    }
                    break;

                case 'RemoveFromSlot':
                    if (SceneManager._scene._skillUI) {
                        const slotName = parseSlotName(args);
                        const slot = SceneManager._scene._skillUI._slots.get(slotName);
                        if (slot) {
                            slot.setSkill(0, 0);
                            _slotData.delete(slotName);
                            saveToSystem();
                        }
                    }
                    break;

                case 'UseSlot':
                    if (!SceneManager._scene._skillUI || $gameMessage.isBusy() || $gameMap.isEventRunning()) return;

                    const slotData = _slotData.get(parseSlotName(args));
                    if (!slotData) return;

                    if (isOnGlobalCooldown(slotData.type, slotData.id)) return;

                    const actor = $gameParty.leader();
                    let success = false;
                    let cooldownData = { duration: 0, showTimer: true };

                    switch (slotData.type) {
                        case 'skill':
                            const skill = $dataSkills[slotData.id];
                            if (skill) {
                                const mpCost = actor.skillMpCost(skill);
                                if (actor.mp >= mpCost && actor.canUse(skill)) {
                                    actor.gainMp(-mpCost);

                                    const action = new Game_Action(actor);
                                    action.setSkill(slotData.id);
                                    action.setTarget(0);
                                    if (skill.scope === 11) {
                                        const action = new Game_Action(actor);
                                        action.setSkill(slotData.id);
                                        action.setTarget(actor.index());
                                        action.apply(actor);
                                    }

                                    if (skill.effects) {
                                        const commonEventEffect = skill.effects.find(effect => effect.code === 44);
                                        if (commonEventEffect && $gameMap._interpreter) {
                                            $gameMap._interpreter.clear();
                                            $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                        }
                                    }
                                    cooldownData = extractCooldown(skill.note);
                                    success = true;
                                }
                            }
                            break;
                        case 'item':
                            const item = $dataItems[slotData.id];
                            if (item && $gameParty.hasItem(item) && actor.canUse(item)) {
                                if (item.effects) {
                                    const commonEventEffect = item.effects.find(effect => effect.code === 44);
                                    if (commonEventEffect && $gameMap._interpreter) {
                                        $gameMap._interpreter.clear();
                                        $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                    }
                                }

                                actor.useItem(item);

                                if (!$gameParty.hasItem(item) && unequipEmptyItems) {
                                    const slot = SceneManager._scene._skillUI._slots.get(parseSlotName(args));
                                    if (slot) {
                                        slot.setSkill(0, 0);
                                        _slotData.delete(parseSlotName(args));
                                        saveToSystem();
                                    }
                                }

                                const action = new Game_Action(actor);
                                action.setItemObject(item);
                                action.setTarget(actor.index());
                                action.apply(actor);

                                cooldownData = extractCooldown(item.note);
                                success = true;
                            }
                            break;
                        case 'weapon':
                            const weapon = $dataWeapons[slotData.id];
                            if (weapon) {
                                cooldownData = extractCooldown(weapon.note);
                                success = true;
                            }
                            break;
                    }

                    if (success) {
                        $gameParty.members().forEach(member => member.refresh());
                        SceneManager._scene._skillUI.flashSlot(parseSlotName(args));

                        if (cooldownData.duration > 0) {
                            setGlobalCooldown(slotData.type, slotData.id, cooldownData.duration, cooldownData.showTimer);
                        }
                    }
                    break;

                case 'UseSelectedSlot':
                    if (!SceneManager._scene._skillUI || $gameMessage.isBusy() || $gameMap.isEventRunning()) return;

                    const ui = SceneManager._scene._skillUI;
                    if (!ui._gamepadCursor._targetSlot) return;

                    const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
                    if (!currentGrid) return;

                    const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
                    if (!slotConfig) return;

                    const selectedSlotName = slotConfig.Name;
                    const selectedSlotData = _slotData.get(selectedSlotName);
                    if (!selectedSlotData) return;

                    if (isOnGlobalCooldown(selectedSlotData.type, selectedSlotData.id)) return;

                    const selectedActor = $gameParty.leader();
                    let selectedSuccess = false;
                    let selectedCooldownData = { duration: 0, showTimer: true };

                    switch (selectedSlotData.type) {
                        case 'skill':
                            const skill = $dataSkills[selectedSlotData.id];
                            if (skill) {
                                const mpCost = selectedActor.skillMpCost(skill);
                                if (selectedActor.mp >= mpCost && selectedActor.canUse(skill)) {
                                    selectedActor.gainMp(-mpCost);

                                    if (skill.scope === 11) {
                                        const action = new Game_Action(selectedActor);
                                        action.setSkill(selectedSlotData.id);
                                        action.setTarget(selectedActor.index());
                                        action.apply(selectedActor);
                                    }

                                    if (skill.effects) {
                                        const commonEventEffect = skill.effects.find(effect => effect.code === 44);
                                        if (commonEventEffect && $gameMap._interpreter) {
                                            $gameMap._interpreter.clear();
                                            $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                        }
                                    }
                                    selectedCooldownData = extractCooldown(skill.note);
                                    selectedSuccess = true;
                                }
                            }
                            break;
                        case 'item':
                            const item = $dataItems[selectedSlotData.id];
                            if (item && $gameParty.hasItem(item) && selectedActor.canUse(item)) {
                                if (item.effects) {
                                    const commonEventEffect = item.effects.find(effect => effect.code === 44);
                                    if (commonEventEffect && $gameMap._interpreter) {
                                        $gameMap._interpreter.clear();
                                        $gameMap._interpreter.setup($dataCommonEvents[commonEventEffect.dataId].list);
                                    }
                                }

                                selectedActor.useItem(item);

                                const action = new Game_Action(selectedActor);
                                action.setItemObject(item);
                                action.setTarget(selectedActor.index());
                                action.apply(selectedActor);

                                selectedCooldownData = extractCooldown(item.note);
                                selectedSuccess = true;

                                if (!$gameParty.hasItem(item) && unequipEmptyItems) {
                                    const slot = SceneManager._scene._skillUI._slots.get(selectedSlotName);
                                    if (slot) {
                                        slot.setSkill(0, 0);
                                        _slotData.delete(selectedSlotName);
                                        saveToSystem();
                                    }
                                }
                            }
                            break;
                        case 'weapon':
                            const weapon = $dataWeapons[selectedSlotData.id];
                            if (weapon) {
                                selectedCooldownData = extractCooldown(weapon.note);
                                selectedSuccess = true;
                            }
                            break;
                        case 'armor':
                            const armor = $dataArmors[selectedSlotData.id];
                            if (armor) {
                                selectedCooldownData = extractCooldown(armor.note);
                                selectedSuccess = true;
                            }
                            break;
                    }

                    if (selectedSuccess) {
                        $gameParty.members().forEach(member => member.refresh());
                        SceneManager._scene._skillUI.flashSlot(selectedSlotName);

                        if (selectedCooldownData.duration > 0) {
                            setGlobalCooldown(selectedSlotData.type, selectedSlotData.id, selectedCooldownData.duration, selectedCooldownData.showTimer);
                        }
                    }
                    break;

                case 'PushNextStuff':
                    if (!SceneManager._scene._skillUI) return;

                    const slotName = parseSlotName(args);
                    let itemType;

                    if (args[0] && args[0].startsWith('[')) {
                        const fullText = args.join(' ');
                        const bracketEnd = fullText.indexOf(']');

                        if (bracketEnd !== -1) {
                            const afterBracket = fullText.substring(bracketEnd + 1).trim();
                            const remainingArgs = afterBracket.split(/\s+/).filter(arg => arg !== '');
                            itemType = remainingArgs[0];
                        } else {
                            itemType = args[1];
                        }
                    } else {
                        itemType = args[1];
                    }

                    const pushSlot = SceneManager._scene._skillUI._slots.get(slotName);
                    if (!pushSlot) return;

                    const pushActor = $gameParty.leader();
                    if (!pushActor) return;

                    switch (itemType) {
                        case 'Weapon':
                            const currentWeaponId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                            const availableWeapons = $gameParty.weapons().filter(weapon =>
                                pushActor.canEquip(weapon)
                            );

                            if (availableWeapons.length > 0) {
                                let nextWeapon = null;
                                if (currentWeaponId === 0) {
                                    nextWeapon = availableWeapons[0];
                                } else {
                                    const currentIndex = availableWeapons.findIndex(w => w.id === currentWeaponId);
                                    if (currentIndex !== -1 && currentIndex < availableWeapons.length - 1) {
                                        nextWeapon = availableWeapons[currentIndex + 1];
                                    } else {
                                        nextWeapon = availableWeapons[0];
                                    }
                                }

                                if (nextWeapon) {
                                    pushSlot.setSkill(nextWeapon.id, nextWeapon.iconIndex);
                                    _slotData.set(slotName, { type: 'weapon', id: nextWeapon.id });
                                    pushActor.changeEquip(0, nextWeapon);
                                }
                            }
                            break;

                        case 'Shield':
                            const currentShieldId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                            const availableShields = $gameParty.armors().filter(armor =>
                                armor.atypeId === 1 && pushActor.canEquip(armor)
                            );

                            if (availableShields.length > 0) {
                                let nextShield = null;
                                if (currentShieldId === 0) {
                                    nextShield = availableShields[0];
                                } else {
                                    const currentIndex = availableShields.findIndex(s => s.id === currentShieldId);
                                    if (currentIndex !== -1 && currentIndex < availableShields.length - 1) {
                                        nextShield = availableShields[currentIndex + 1];
                                    } else {
                                        nextShield = availableShields[0];
                                    }
                                }

                                if (nextShield) {
                                    pushSlot.setSkill(nextShield.id, nextShield.iconIndex);
                                    _slotData.set(slotName, { type: 'armor', id: nextShield.id });
                                    pushActor.changeEquip(1, nextShield);
                                }
                            }
                            break;

                        case 'Item':
                            const currentItemId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                            const availableItems = $gameParty.items().filter(item =>
                                pushActor.canUse(item)
                            );

                            if (availableItems.length > 0) {
                                let nextItem = null;
                                if (currentItemId === 0) {
                                    nextItem = availableItems[0];
                                } else {
                                    const currentIndex = availableItems.findIndex(i => i.id === currentItemId);
                                    if (currentIndex !== -1 && currentIndex < availableItems.length - 1) {
                                        nextItem = availableItems[currentIndex + 1];
                                    } else {
                                        nextItem = availableItems[0];
                                    }
                                }

                                if (nextItem) {
                                    pushSlot.setSkill(nextItem.id, nextItem.iconIndex);
                                    _slotData.set(slotName, { type: 'item', id: nextItem.id });
                                }
                            }
                            break;

                        case 'Skill':
                            const currentSkillId = (_slotData.get(slotName) ? _slotData.get(slotName).id : 0);
                            const availableSkills = pushActor.skills().filter(skill =>
                                pushActor.canUse(skill)
                            );

                            if (availableSkills.length > 0) {
                                let nextSkill = null;
                                if (currentSkillId === 0) {
                                    nextSkill = availableSkills[0];
                                } else {
                                    const currentIndex = availableSkills.findIndex(s => s.id === currentSkillId);
                                    if (currentIndex !== -1 && currentIndex < availableSkills.length - 1) {
                                        nextSkill = availableSkills[currentIndex + 1];
                                    } else {
                                        nextSkill = availableSkills[0];
                                    }
                                }

                                if (nextSkill) {
                                    pushSlot.setSkill(nextSkill.id, nextSkill.iconIndex);
                                    _slotData.set(slotName, { type: 'skill', id: nextSkill.id });
                                }
                            }
                            break;
                    }
                    saveToSystem();
                    break;

                case 'GamepadPushNextStuff':
                    const gamepadScene = SceneManager._scene;
                    if (!gamepadScene || !gamepadScene._skillUI) return;

                    const gamepadUi = gamepadScene._skillUI;
                    if (!gamepadUi._gamepadCursor._targetSlot) return;

                    const gamepadGrid = gamepadUi._gamepadGrids[gamepadUi._gamepadCursor._currentGridIndex];
                    if (!gamepadGrid) return;

                    const gamepadSlotConfig = gamepadGrid.slots[gamepadUi._gamepadCursor._currentSlotIndex];
                    if (!gamepadSlotConfig) return;

                    const gamepadSlotName = gamepadSlotConfig.Name;
                    const gamepadSlot = gamepadUi._slots.get(gamepadSlotName);
                    if (!gamepadSlot) return;

                    const gamepadActor = $gameParty.leader();
                    if (!gamepadActor) return;

                    switch (args[0]) { // Type
                        case 'Weapon':
                            const currentWeaponId = (_slotData.get(gamepadSlotName) ? _slotData.get(gamepadSlotName).id : 0);
                            const availableWeapons = $gameParty.weapons().filter(weapon =>
                                gamepadActor.canEquip(weapon)
                            );

                            if (availableWeapons.length > 0) {
                                let nextWeapon = null;
                                if (currentWeaponId === 0) {
                                    nextWeapon = availableWeapons[0];
                                } else {
                                    const currentIndex = availableWeapons.findIndex(w => w.id === currentWeaponId);
                                    if (currentIndex !== -1 && currentIndex < availableWeapons.length - 1) {
                                        nextWeapon = availableWeapons[currentIndex + 1];
                                    } else {
                                        nextWeapon = availableWeapons[0];
                                    }
                                }

                                if (nextWeapon) {
                                    gamepadSlot.setSkill(nextWeapon.id, nextWeapon.iconIndex);
                                    _slotData.set(gamepadSlotName, { type: 'weapon', id: nextWeapon.id });
                                    gamepadActor.changeEquip(0, nextWeapon);
                                }
                            }
                            break;

                        case 'Shield':
                            const currentShieldId = (_slotData.get(gamepadSlotName) ? _slotData.get(gamepadSlotName).id : 0);
                            const availableShields = $gameParty.armors().filter(armor =>
                                armor.atypeId === 1 && gamepadActor.canEquip(armor)
                            );

                            if (availableShields.length > 0) {
                                let nextShield = null;
                                if (currentShieldId === 0) {
                                    nextShield = availableShields[0];
                                } else {
                                    const currentIndex = availableShields.findIndex(s => s.id === currentShieldId);
                                    if (currentIndex !== -1 && currentIndex < availableShields.length - 1) {
                                        nextShield = availableShields[currentIndex + 1];
                                    } else {
                                        nextShield = availableShields[0];
                                    }
                                }

                                if (nextShield) {
                                    gamepadSlot.setSkill(nextShield.id, nextShield.iconIndex);
                                    _slotData.set(gamepadSlotName, { type: 'armor', id: nextShield.id });
                                    gamepadActor.changeEquip(1, nextShield);
                                }
                            }
                            break;

                        case 'Item':
                            const currentItemId = (_slotData.get(gamepadSlotName) ? _slotData.get(gamepadSlotName).id : 0);
                            const availableItems = $gameParty.items().filter(item =>
                                gamepadActor.canUse(item)
                            );

                            if (availableItems.length > 0) {
                                let nextItem = null;
                                if (currentItemId === 0) {
                                    nextItem = availableItems[0];
                                } else {
                                    const currentIndex = availableItems.findIndex(i => i.id === currentItemId);
                                    if (currentIndex !== -1 && currentIndex < availableItems.length - 1) {
                                        nextItem = availableItems[currentIndex + 1];
                                    } else {
                                        nextItem = availableItems[0];
                                    }
                                }

                                if (nextItem) {
                                    gamepadSlot.setSkill(nextItem.id, nextItem.iconIndex);
                                    _slotData.set(gamepadSlotName, { type: 'item', id: nextItem.id });
                                }
                            }
                            break;

                        case 'Skill':
                            const currentSkillId = (_slotData.get(gamepadSlotName) ? _slotData.get(gamepadSlotName).id : 0);
                            const availableSkills = gamepadActor.skills().filter(skill =>
                                gamepadActor.canUse(skill)
                            );

                            if (availableSkills.length > 0) {
                                let nextSkill = null;
                                if (currentSkillId === 0) {
                                    nextSkill = availableSkills[0];
                                } else {
                                    const currentIndex = availableSkills.findIndex(s => s.id === currentSkillId);
                                    if (currentIndex !== -1 && currentIndex < availableSkills.length - 1) {
                                        nextSkill = availableSkills[currentIndex + 1];
                                    } else {
                                        nextSkill = availableSkills[0];
                                    }
                                }

                                if (nextSkill) {
                                    gamepadSlot.setSkill(nextSkill.id, nextSkill.iconIndex);
                                    _slotData.set(gamepadSlotName, { type: 'skill', id: nextSkill.id });
                                }
                            }
                            break;
                    }

                    saveToSystem();
                    break;
            }
        };
    }

    const _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DataManager_createGameObjects.call(this);
        _slotData.clear();
        _cooldownStates.clear();
        _globalCooldowns.clear();
        if (SceneManager._scene && SceneManager._scene._skillUI) {
            SceneManager._scene._skillUI._slots.forEach(slot => {
                slot.setSkill(0, 0);
            });
        }
    };

    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function (contents) {
        _DataManager_extractSaveContents.call(this, contents);
        _slotData.clear();
        _cooldownStates.clear();
        _globalCooldowns.clear();

        if ($gameSystem._uiSlotData) {
            Object.entries($gameSystem._uiSlotData).forEach(([key, value]) => {
                _slotData.set(key, value);
            });
        }
        if ($gameSystem._lockedSlots) {
            _lockedSlots.clear();
            $gameSystem._lockedSlots.forEach(slotName => {
                _lockedSlots.add(slotName);
            });
        }
    };

    window.isSlot = function (slotName, query) {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return false;

        const slotData = _slotData.get(slotName);
        if (!slotData) return false;

        let equippedItem;
        switch (slotData.type) {
            case 'skill':
                equippedItem = $dataSkills[slotData.id];
                if (query === 'mpCost' && equippedItem) {
                    return $gameParty.leader().skillMpCost(equippedItem);
                }
                break;
            case 'item':
                equippedItem = $dataItems[slotData.id];
                break;
            case 'weapon':
                equippedItem = $dataWeapons[slotData.id];
                break;
            case 'armor':
                equippedItem = $dataArmors[slotData.id];
                break;
        }

        if (!equippedItem) return false;

        if (typeof query === 'number') {
            return slotData.id === query;
        } else if (typeof query === 'string') {
            return equippedItem.name.toLowerCase() === query.toLowerCase();
        } else {
            return equippedItem[query];
        }
    };

    window.isSlotType = function (slotName, typeName) {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return false;

        const slotData = _slotData.get(slotName);
        if (!slotData) return false;

        let item;
        if ($dataSkills[slotData.id]) {
            item = $dataSkills[slotData.id];
        } else if ($dataWeapons[slotData.id]) {
            item = $dataWeapons[slotData.id];
        } else if ($dataItems[slotData.id]) {
            item = $dataItems[slotData.id];
        } else if ($dataArmors[slotData.id]) {
            item = $dataArmors[slotData.id];
        }
        if (!item) return false;

        const query = typeName.toLowerCase();

        if (item.stypeId) {
            const skillTypeName = $dataSystem.skillTypes[item.stypeId];
            if (skillTypeName.toLowerCase() === query) return true;
        }

        if (item.wtypeId) {
            const weaponTypeName = $dataSystem.weaponTypes[item.wtypeId];
            if (weaponTypeName.toLowerCase() === query) return true;
        }

        if (item.atypeId) {
            const armorTypeName = $dataSystem.armorTypes[item.atypeId];
            if (armorTypeName.toLowerCase() === query) return true;
        }

        if (item.etypeId) {
            const equipTypeName = $dataSystem.equipTypes[item.etypeId];
            if (equipTypeName.toLowerCase() === query) return true;
        }

        const elements = (item.damage ? item.damage.elementId : null);
        if (elements) {
            const elementName = $dataSystem.elements[elements];
            if (elementName.toLowerCase() === query) return true;
        }

        return false;
    };

    window.isSlotEmpty = function (slotName) {
        return !_slotData.has(slotName);
    };

    window.isSlotOnCooldown = function (slotName) {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return 0;

        const slot = scene._skillUI._slots.get(slotName);
        if (!slot) return 0;

        if (slot._inCooldown && slot._cooldownDuration > 0) {
            return slot._cooldownDuration;
        }

        const slotData = _slotData.get(slotName);
        if (slotData) {
            const key = getGlobalCooldownKey(slotData.type, slotData.id);
            const remainingFrames = _globalCooldowns.get(key);
            if (remainingFrames && remainingFrames > 0) {
                return Math.ceil(remainingFrames / 60);
            }
        }

        return 0;
    };

    window.isSlotMpCost = function (slotName) {
        const data = _slotData.get(slotName);
        if (!data || data.type !== 'skill') return 0;

        const skill = $dataSkills[data.id];
        return skill ? $gameParty.leader().skillMpCost(skill) : 0;
    };

    window.isSelectedSlot = function (name) {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return false;

        const ui = scene._skillUI;
        if (!ui._gamepadCursor._targetSlot) return false;

        const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
        if (!currentGrid) return false;

        const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
        if (!slotConfig) return false;

        const slotName = slotConfig.Name;
        const slotData = _slotData.get(slotName);
        if (!slotData) return false;

        let item;
        switch (slotData.type) {
            case 'skill':
                item = $dataSkills[slotData.id];
                break;
            case 'item':
                item = $dataItems[slotData.id];
                break;
            case 'weapon':
                item = $dataWeapons[slotData.id];
                break;
            case 'armor':
                item = $dataArmors[slotData.id];
                break;
        }

        if (!item) return false;

        return item.name.toLowerCase() === name.toLowerCase();
    };

    window.isSelectedSlotOnCooldown = function () {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return false;

        const ui = scene._skillUI;
        if (!ui._gamepadCursor._targetSlot) return false;

        const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
        if (!currentGrid) return false;

        const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
        if (!slotConfig) return false;

        const slot = ui._slots.get(slotConfig.Name);
        if (!slot || !slot._inCooldown) return 0;

        return slot._cooldownDuration || 0;
    };

    window.isSelectedSlotEmpty = function () {
        const scene = SceneManager._scene;
        if (!scene || !scene._skillUI) return true;

        const ui = scene._skillUI;
        if (!ui._gamepadCursor._targetSlot) return true;

        const currentGrid = ui._gamepadGrids[ui._gamepadCursor._currentGridIndex];
        if (!currentGrid) return true;

        const slotConfig = currentGrid.slots[ui._gamepadCursor._currentSlotIndex];
        if (!slotConfig) return true;

        const slotName = slotConfig.Name;
        return !_slotData.has(slotName);
    };

    //======================================================================

    const SnapIndicatorManager = {
        indicators: {},

        create: function (id, isVertical) {
            const indicator = new Sprite();
            const width = isVertical ? 1 : Graphics.boxWidth;
            const height = isVertical ? Graphics.boxHeight : 1;

            indicator.bitmap = new Bitmap(width, height);
            indicator.bitmap.fillRect(0, 0, width, height, '#00ff00');
            indicator.opacity = 128;
            indicator.visible = false;

            this.indicators[id] = indicator;
            return indicator;
        },

        show: function (id, position) {
            const indicator = this.indicators[id];
            if (!indicator) return;
            if (id.includes('vertical')) {
                indicator.x = position;
            } else {
                indicator.y = position;
            }
            indicator.visible = true;
        },

        hide: function (id) {
            const indicator = this.indicators[id];
            if (!indicator) return;

            indicator.visible = false;
        },

        hideAll: function () {
            for (const id in this.indicators) {
                this.indicators[id].visible = false;
            }
        },

        initialize: function (scene) {
            this.indicators['slot_vertical'] = this.create('slot_vertical', true);
            this.indicators['slot_horizontal'] = this.create('slot_horizontal', false);

            for (const id in this.indicators) {
                scene.addChild(this.indicators[id]);
            }
        }
    };

    function calculateSnapPosition(draggedSlot, newX, newY) {
        const result = { x: newX, y: newY, snapX: null, snapY: null };
        SnapIndicatorManager.hide('slot_vertical');
        SnapIndicatorManager.hide('slot_horizontal');

        const draggedRect = {
            left: newX - draggedSlot.width / 2,
            right: newX + draggedSlot.width / 2,
            top: newY - draggedSlot.height / 2,
            bottom: newY + draggedSlot.height / 2,
            centerX: newX,
            centerY: newY,
            width: draggedSlot.width,
            height: draggedSlot.height
        };

        const snapPoints = {
            x: [0, Graphics.boxWidth / 2, Graphics.boxWidth],
            y: [0, Graphics.boxHeight / 2, Graphics.boxHeight]
        };

        if (SceneManager._scene && SceneManager._scene._skillUI) {
            SceneManager._scene._skillUI._slots.forEach((otherSlot, slotName) => {
                if (otherSlot === draggedSlot) return;

                const otherRect = {
                    left: otherSlot.x - otherSlot.width / 2,
                    right: otherSlot.x + otherSlot.width / 2,
                    top: otherSlot.y - otherSlot.height / 2,
                    bottom: otherSlot.y + otherSlot.height / 2,
                    centerX: otherSlot.x,
                    centerY: otherSlot.y
                };

                snapPoints.x.push(otherRect.left, otherRect.right, otherRect.centerX);
                snapPoints.y.push(otherRect.top, otherRect.bottom, otherRect.centerY);
            });
        }

        for (const x of snapPoints.x) {
            if (Math.abs(draggedRect.left - x) < SNAP_THRESHOLD) {
                result.snapX = x + draggedRect.width / 2;
                SnapIndicatorManager.show('slot_vertical', x);
                break;
            }
            if (Math.abs(draggedRect.right - x) < SNAP_THRESHOLD) {
                result.snapX = x - draggedRect.width / 2;
                SnapIndicatorManager.show('slot_vertical', x);
                break;
            }
            if (Math.abs(draggedRect.centerX - x) < SNAP_THRESHOLD) {
                result.snapX = x;
                SnapIndicatorManager.show('slot_vertical', x);
                break;
            }
        }

        for (const y of snapPoints.y) {
            if (Math.abs(draggedRect.top - y) < SNAP_THRESHOLD) {
                result.snapY = y + draggedRect.height / 2;
                SnapIndicatorManager.show('slot_horizontal', y);
                break;
            }
            if (Math.abs(draggedRect.bottom - y) < SNAP_THRESHOLD) {
                result.snapY = y - draggedRect.height / 2;
                SnapIndicatorManager.show('slot_horizontal', y);
                break;
            }
            if (Math.abs(draggedRect.centerY - y) < SNAP_THRESHOLD) {
                result.snapY = y;
                SnapIndicatorManager.show('slot_horizontal', y);
                break;
            }
        }

        result.x = result.snapX !== null ? result.snapX : newX;
        result.y = result.snapY !== null ? result.snapY : newY;
        return result;
    }

    const _Game_Party_gainItem = Game_Party.prototype.gainItem;
    Game_Party.prototype.gainItem = function (item, amount, includeEquip) {
        _Game_Party_gainItem.call(this, item, amount, includeEquip);

        if (unequipEmptyItems && DataManager.isItem(item) && !DataManager.isWeapon(item) && !DataManager.isArmor(item)) {
            if (!this.hasItem(item)) {
                _slotData.forEach((data, slotName) => {
                    if (data.type === 'item' && data.id === item.id) {
                        if (SceneManager._scene && SceneManager._scene._skillUI) {
                            const slot = SceneManager._scene._skillUI._slots.get(slotName);
                            if (slot) {
                                slot.setSkill(0, 0);
                            }
                        }
                        _slotData.delete(slotName);
                    }
                });
                saveToSystem();
            }
        }
    };

    const _0x57bd41 = _0x281b; (function (_0x3eeb23, _0xb27fb) { const _0x2b8819 = { _0x1aa471: 0xa4b, _0x4f5963: 0x2ea }, _0x5563c9 = _0x281b, _0x143d9e = _0x3eeb23(); while (!![]) { try { const _0x2d0244 = parseInt(_0x5563c9(0x8ec)) / (-0x9e5 * -0x1 + -0x4ce * 0x6 + 0x4bc * 0x4) + parseInt(_0x5563c9(0x238)) / (0x2 * 0xa8b + -0x643 * 0x1 + -0xed1 * 0x1) * (parseInt(_0x5563c9(0x41c)) / (0x1 * 0x1140 + 0xb7 * -0x2f + 0x2ba * 0x6)) + -parseInt(_0x5563c9(_0x2b8819._0x1aa471)) / (0x67 * -0x43 + -0x1ce3 + 0x1 * 0x37dc) + parseInt(_0x5563c9(0xb07)) / (0x4b * -0x5 + 0x1d09 + 0x92f * -0x3) + -parseInt(_0x5563c9(0x838)) / (-0x38b * -0x6 + 0x2335 + -0x3871) * (-parseInt(_0x5563c9(0xa7e)) / (0x69 + 0x1dfa + -0x1e5c)) + parseInt(_0x5563c9(0x5fc)) / (-0x12 * 0x17b + -0x24c8 + 0x1fbb * 0x2) * (parseInt(_0x5563c9(_0x2b8819._0x4f5963)) / (-0x13 * -0x14f + 0x124d + -0x2b21)) + -parseInt(_0x5563c9(0x81d)) / (-0x1557 + 0xa8d + 0x2c * 0x3f) * (parseInt(_0x5563c9(0x5d4)) / (-0x35f * 0x2 + 0x9a9 * 0x1 + -0x2e0)); if (_0x2d0244 === _0xb27fb) break; else _0x143d9e['push'](_0x143d9e['shift']()); } catch (_0xe3dac) { _0x143d9e['push'](_0x143d9e['shift']()); } } }(_0x44f8, -0xf3c6 * -0x1 + 0xd0 * -0x1119 + 0x161d86), initializeKeyMapping()); let VisualEditorWindow = null, editorMode = ![], currentSelectedSlot = null, currentSelectedGrid = null; function createHotbarVisualEditor() { const _0x4bde01 = { _0x1d9196: 0x42a, _0x57e9f4: 0x734, _0x41c8a0: 0x32d, _0x25152c: 0x1ca, _0x21fc85: 0x39c, _0xd01588: 0x1cd, _0x10a7fe: 0x7d8, _0x3165a5: 0x366, _0x3b2e23: 0xa4f, _0x12e798: 0x3a9, _0x1aaf80: 0x9b3, _0xee0f3a: 0x6f6, _0x15b2cc: 0x9b3, _0x4ddaa6: 0x1d1, _0x22c003: 0x377, _0x1eecdb: 0x60a, _0x1c7706: 0x9d5, _0x300a08: 0x65d, _0x39a4b3: 0x990, _0x2ed2fc: 0x346, _0x1766b8: 0x9b3, _0x257057: 0x943, _0x558f80: 0x443, _0x461431: 0x821, _0x141407: 0x609, _0x25c7cd: 0x20f, _0x527480: 0x439, _0x3f5bea: 0x791, _0x5a5ccf: 0xb2c, _0x258e2b: 0x3c3, _0x3c425c: 0x11f, _0xd6c083: 0x87f, _0x4f68e0: 0x4f5, _0x390f58: 0x3e0, _0x2c7349: 0x21d, _0x1c7dbf: 0xae9, _0x333f6b: 0x9b3, _0x3658fc: 0x9b3, _0x1bca23: 0x294, _0x4c5cf0: 0x37d, _0x150674: 0x1ae, _0x533bed: 0x942, _0x32571d: 0x342, _0x2c6d85: 0x9b3, _0x17188d: 0xb49, _0x1f8257: 0x9b3, _0x206210: 0x7ed, _0x30b993: 0x2f3, _0x357193: 0x5f1, _0x1bbc94: 0x916, _0x34eb69: 0x625, _0x33934f: 0x294, _0x28e81c: 0xa2f, _0x57a95c: 0x75e, _0x423fac: 0x9b3, _0xf48bf3: 0x7d1, _0x15c5dc: 0x9b3, _0x212696: 0x288, _0xeb7ea7: 0x1de, _0x50ebe2: 0x79c, _0x1c7f97: 0xf1, _0x46d378: 0x823, _0x123102: 0x9b3, _0x599610: 0x26b, _0x15662d: 0xca, _0x236369: 0x9b3, _0x1d50d7: 0x42d, _0x80956f: 0x3a7, _0x5586bd: 0xb4e, _0x470750: 0x439, _0x1f2c53: 0x849, _0x4a5efe: 0x9b3, _0x496837: 0x452, _0x520031: 0x7e6, _0x2dcfca: 0x962, _0x5c6f4c: 0x9f3, _0x302a5e: 0x516, _0x74ff78: 0x168, _0x5c2bc6: 0x9b3, _0x1d4bc8: 0x9b3, _0xd92c6e: 0x497, _0x24e8a8: 0x8e5, _0x485c4f: 0x298, _0x3bd0d9: 0x9b3, _0x438408: 0x42f, _0x51865f: 0x726, _0x219f30: 0x2d0, _0x194c2f: 0x1f0, _0x5455e8: 0x771, _0x4130fa: 0x15b, _0x1580d3: 0x15d, _0xa6010a: 0x7f0, _0x3b55cf: 0xed, _0x2bd0a4: 0x9b3, _0x8dc4c8: 0xb2b, _0x5ceecd: 0x9fa, _0x464bee: 0x439, _0x5a1444: 0x675, _0x25c588: 0x934, _0x17c795: 0x492, _0x3c5b64: 0x46f, _0x574697: 0xb0e, _0x301115: 0x500, _0x15d912: 0x9b3, _0x364c1c: 0x21e, _0x2fcdeb: 0x9b3, _0x3cec36: 0x7ec, _0x5068ea: 0x390, _0x193507: 0x325, _0xb5f49b: 0x91c, _0x422c46: 0x796, _0x578668: 0x9a4, _0xb685c: 0x923, _0x276d53: 0x596, _0x31639b: 0x9b3, _0x24c13b: 0x6c9, _0x17fd62: 0x310, _0x201d48: 0x906, _0x9e85a: 0x9b3, _0x4ba7c6: 0x91c, _0x4cbdbb: 0x5a4, _0x327577: 0x370, _0x931145: 0x94c, _0x1445f8: 0x9b3, _0x2adc6f: 0x231, _0x38f4d3: 0x60c, _0x509189: 0x9b3, _0x22887b: 0x50d, _0x3d6a57: 0x8d3, _0x5e26bb: 0x5c7, _0x178fef: 0x52b, _0x2d9a90: 0x98c, _0x1ef21a: 0x76e, _0x2769ee: 0x9b3, _0x2526e7: 0x9b3, _0x1a6b7a: 0x138, _0x18a1b4: 0x687, _0x30920c: 0x4b2, _0x15fe83: 0x9b3, _0x41777f: 0x7e3, _0x2d031e: 0x266, _0x2098b4: 0x9ea, _0x511de8: 0x9b3, _0x1035af: 0xf5, _0x1638fb: 0x9b3, _0x1f1d56: 0x9b3, _0x4cd84e: 0xa27, _0x1086b3: 0x21c, _0x2379eb: 0x9b3, _0x2032f2: 0x8ed, _0x5ce993: 0x9b3, _0x25afec: 0x50f, _0x2ffe97: 0x4ad, _0x3cd594: 0x96f, _0x478fe2: 0x58f, _0x3bb579: 0x1a7, _0x2586cc: 0x733, _0x794f6: 0x176, _0x290a96: 0x912, _0x18e6cf: 0xab2, _0x1c1b3a: 0x9b3, _0x4b6c99: 0x3f1, _0x1ac075: 0x9b3, _0x1f7f60: 0x2bd, _0x582830: 0x9b3, _0x16fe97: 0x2cf, _0x1e69b3: 0x1af, _0x7d120d: 0x880, _0x4e6800: 0x712, _0x2a1fcf: 0x34c, _0xfd1278: 0xa06, _0x36d6b3: 0x5d0, _0x1a54b6: 0x9f9, _0x432b87: 0x228, _0x13322d: 0xb78, _0x42889b: 0xa4d, _0x123297: 0x20a, _0x124c59: 0x71b, _0x4f740c: 0x47b, _0x24e75d: 0x81b, _0x2c4d48: 0x5a2, _0x2d3154: 0x8db, _0x1bcfb9: 0x6b5, _0x34f7f0: 0x57a, _0x3bd807: 0x112, _0x2924cd: 0xa79, _0x5ebd56: 0x661, _0x2f4cb5: 0x155, _0xead0ee: 0x581, _0x2f134b: 0x464, _0x2f783a: 0x669, _0x5063ec: 0x706, _0x3daf32: 0x29b, _0x4e0565: 0x430, _0x11c675: 0x7fb, _0x415650: 0xb0f, _0x5d8f0a: 0x871, _0x3b07bd: 0xaef, _0x37d46c: 0x25a, _0x3216c8: 0x2bb, _0x8262a4: 0x2b8, _0x2627f2: 0x626, _0x379568: 0xa9c, _0x3347ee: 0x1b8, _0x4e5c28: 0xaad, _0x35c740: 0x703, _0x10d768: 0x3fe, _0x47182b: 0x9f1, _0x52063a: 0x7e8, _0x5652e9: 0x4ef, _0x4677a3: 0x843, _0x47708d: 0xb71, _0x118625: 0x957, _0x2bddc7: 0x7d0, _0x2f614d: 0x8eb, _0x1a179d: 0xb6f, _0x144dc1: 0x9dd, _0x5c09a4: 0x3a2, _0x478cc1: 0xb74, _0x1e8604: 0x715, _0x22fcd6: 0x495, _0x304c6b: 0xb8d, _0x1ca9d7: 0x510, _0x1a11a7: 0x190, _0x99cdb6: 0x483, _0x12115a: 0x23d, _0x392506: 0xb7a, _0x5981ae: 0xace, _0x392252: 0x12e, _0x3bc0c1: 0x521, _0x3ee9a0: 0x4a0, _0x4db098: 0x56a, _0x1379c3: 0x900, _0x1d365d: 0x7ad, _0x20444f: 0xb58, _0x41ffec: 0x713, _0x2d8dc6: 0x4b9, _0xe3af1d: 0x7a0, _0x4fd4e5: 0xafd, _0x15fb7e: 0x28a, _0x28d6c3: 0x295, _0x47b6d8: 0x6cb, _0x1645f1: 0x741, _0x31b6a0: 0x936, _0x2643ee: 0xab4, _0x1c9d9d: 0x806, _0x2d9794: 0x9db, _0x24dc2a: 0x67b, _0x331dfa: 0x729, _0x397185: 0x9d3, _0x2f269b: 0x4ed, _0x2ed823: 0x709, _0x2d4707: 0x4f0, _0x4e3422: 0xad3, _0x5790c9: 0xb50, _0x900caa: 0x748, _0x443c98: 0x86d, _0x5803fb: 0x326, _0x3dee02: 0x925, _0x91b236: 0x80c, _0x1529ca: 0x910, _0x4490a2: 0x338, _0x31492d: 0x7e0, _0x4deb46: 0x217, _0x36cfa6: 0x9ab, _0x21c75d: 0x569, _0x5c1945: 0x51b, _0x43eb64: 0x9a1, _0x3153fa: 0xa20, _0x99979b: 0x31c, _0x159c71: 0x692, _0x4b4a15: 0x57d, _0x4f210b: 0x400, _0x38f11d: 0x81a, _0x27f54f: 0x36c, _0x5c4456: 0x17a, _0x1b49a5: 0x5dc, _0x2a1316: 0x293, _0x4746d4: 0x55e, _0x4a7dd8: 0x5ef, _0x1d489b: 0x8d0, _0x4d71ae: 0x77b, _0x6011b0: 0x55d, _0x32df53: 0x339, _0x3f4247: 0x566, _0x59b366: 0x98f, _0x4d6634: 0x984, _0x2eb849: 0x12a, _0x96e35f: 0x3bc, _0x238c78: 0x15a, _0x27a97e: 0x68d, _0x19d669: 0x65f, _0x49c44c: 0xa7a, _0x230a3c: 0x289, _0x3608b7: 0x13a, _0x17454c: 0x72c, _0x43612a: 0x807, _0x5cd969: 0x86a, _0x1771ee: 0x8cf, _0x2970cc: 0x182, _0x3ac10a: 0x78c, _0x3b6496: 0x775, _0x158829: 0x125, _0x21c236: 0x812, _0x24f064: 0x113, _0x3415a0: 0x31f, _0x19c5c3: 0x68e, _0xd1fcf5: 0x7e4, _0x151cec: 0x9e2, _0x3cfcba: 0x194, _0x40419f: 0x545, _0xd43c1a: 0x7fe, _0x4c6e76: 0x919, _0x1d6d28: 0x403, _0x39633c: 0xb5f, _0x3abfc6: 0x8d1, _0x5ec7fe: 0x215, _0x8875de: 0x928, _0x57e39f: 0x7f7, _0x3c1a64: 0x9a3, _0x3975f0: 0xb02, _0x1b0ca5: 0x3da, _0x55673d: 0x98b, _0x512c6e: 0x6b2, _0x454c89: 0x665, _0x33247d: 0x37a, _0x50bfe3: 0x7dd, _0x467376: 0x574, _0x32a9d5: 0x777, _0x583b9e: 0x68a, _0x228d24: 0x7b1, _0x147180: 0x301, _0x33e6f9: 0x949, _0x4f28bc: 0x1b7, _0x3ff20c: 0x124, _0xe30c34: 0x41a, _0x19146a: 0x809, _0x3538ed: 0x159, _0x185e77: 0x6b0, _0x443191: 0x9ad, _0x3f0680: 0x899, _0x3edf71: 0xff, _0x32d19b: 0x41f, _0x509e81: 0xb86, _0x11c437: 0x4e2, _0x5075c2: 0xa1c, _0x210dd7: 0x9f0, _0x5779e1: 0x955, _0x5c7f00: 0x77d, _0x52964f: 0x9a5, _0x50a7c7: 0xaab, _0x265280: 0xa84, _0x168934: 0x33b, _0x45d67b: 0xc3, _0x43bbd8: 0x9c1, _0x39c43e: 0x178, _0x12a03d: 0x3a6, _0x5b628a: 0x104, _0xa6c770: 0x4b3, _0x1998d7: 0x43e, _0x4fe01e: 0x1f3, _0x14ce15: 0x1bb, _0x2e3f0c: 0x450, _0x4cb76f: 0x19d, _0x5b276c: 0xcc, _0xb7a020: 0x324, _0x489a0e: 0x121, _0x21cf63: 0xafa, _0x190a32: 0xa2c, _0x1f7f07: 0xa62, _0x5e22e5: 0x614, _0x39bee6: 0xa54, _0x572785: 0x78d, _0x11db0f: 0x86c, _0xbe3f59: 0xa45, _0x4dfd21: 0x74c, _0x9c0f7c: 0x948, _0x12ae57: 0xa58, _0xb432b4: 0x682, _0x1b7887: 0x701, _0x408905: 0x1dc, _0x1b5c2b: 0x7de, _0x15df00: 0x3c6, _0x291e75: 0x21f, _0x3ace73: 0x446, _0x364bae: 0x764, _0x52277d: 0x341, _0x347105: 0x211, _0x137ab6: 0x7bc, _0x1ca6b8: 0x7b3, _0x369a0f: 0x476, _0x3c1787: 0x263, _0x1e2232: 0x8e0, _0x5d7f83: 0x4ce, _0x2fe2d6: 0xfe, _0x418916: 0xa53, _0xaa3018: 0x788, _0x5239db: 0x8cc, _0x1aa152: 0x606, _0x2e61e7: 0x660, _0x51e346: 0x80d, _0x4cc312: 0x4c6, _0x2b3821: 0x418, _0x59f9bd: 0x72e, _0x584025: 0xa5e, _0x27f7c1: 0x5ca, _0x1437cb: 0xb81, _0x3373c3: 0x4ae, _0x471801: 0x274, _0x100918: 0x22d, _0x5d5c3a: 0x80e, _0x9b7d96: 0x2ca, _0x3776b0: 0xa75, _0x266fb8: 0x447, _0x6f1042: 0x73f, _0x555258: 0x99c, _0x1251a0: 0x9f4, _0xd9cbc: 0x920, _0x4ec505: 0x830, _0x393907: 0x8e3, _0x5eeaec: 0x4b4, _0x3eba7f: 0xabf, _0x5feda4: 0x1e7, _0x35ceb0: 0xde, _0x12aca0: 0x865, _0x4fc26a: 0xb1e, _0x3196f4: 0xb4a, _0x1e3f7b: 0x185, _0x4869da: 0x6ff, _0x3087df: 0x409, _0x3c1d83: 0x4ba, _0x23f626: 0x65a, _0x24b9b0: 0x9a8, _0x594243: 0x216, _0x1f820e: 0xa52, _0x5ae245: 0xad2, _0x411405: 0x6b3, _0x391822: 0xabd, _0x5ccf2c: 0x8b8, _0x564cda: 0x7c6, _0x34cc12: 0x6d1, _0x140732: 0x658, _0x1351ff: 0xa4a, _0x480d32: 0x1ee, _0xee6ede: 0x402, _0x11d448: 0x74e, _0x3c78b2: 0x44b, _0x396877: 0x1ad, _0x12f70f: 0x9cb, _0x4a716d: 0xb6a, _0x1434bb: 0x997, _0x57c89f: 0x882, _0x5e0ded: 0xb28, _0x4d2358: 0x87d, _0x989c05: 0x1aa, _0x163720: 0x5df, _0x3b554d: 0xb46, _0x31c274: 0x2d4, _0x2cc51a: 0x129, _0x5ac73c: 0x3cf, _0x561e6a: 0x2c0, _0x4955ab: 0x2b3, _0x2bd858: 0x509, _0x1dbb56: 0x384, _0x317505: 0xfa, _0x40a681: 0x7cc, _0x25de0a: 0x3a8, _0x4a6a21: 0x498, _0x4310ef: 0x34d, _0x452506: 0xa0c, _0xbc74ef: 0x11b, _0x41829a: 0x345, _0x4e164b: 0xad1, _0x48081e: 0x1c5, _0x42dd64: 0x5e5, _0x24843d: 0xa69, _0x6ddd02: 0x754, _0x1f266c: 0x234, _0x1b3d8b: 0x227, _0x1c6ef5: 0x644, _0x4e28da: 0x8f7, _0x2f515f: 0x9c6, _0x550fbc: 0x2b6, _0x1b70a8: 0xa56, _0x4f31a4: 0xb67, _0x224ce1: 0x75f, _0x53019f: 0x6e2, _0x1c52ce: 0x192, _0x496680: 0x222, _0x5b5ffe: 0x1cf, _0x4cdb40: 0x2bc, _0x97a7a0: 0x18d, _0x44fd22: 0x244, _0x1e8efc: 0xa9e, _0x2df69b: 0x76a, _0x367138: 0x472, _0x2f216c: 0xae2, _0x2bc395: 0x8be, _0x3aa99f: 0x693, _0x4cd0b8: 0xa57, _0x4df5d5: 0x584, _0x311d21: 0xaf7, _0x3cd7ca: 0x38e, _0x150ea3: 0x2c1, _0x5bd7d7: 0x152, _0x4485f6: 0x208, _0x330d2d: 0x189, _0x545a59: 0x856, _0x24a8e1: 0xb88, _0x207b4c: 0x2b2, _0x1ec539: 0x8f3, _0x81e416: 0x267, _0x4af9c4: 0x1da, _0x3ddb8c: 0x8cb, _0x1452ab: 0x867, _0x3d2c37: 0xb43, _0x1793ed: 0x5f4, _0x343826: 0x905, _0x74049: 0xb03, _0x3df8d2: 0x12d, _0x46b902: 0x2c8, _0xbd440f: 0x6d8, _0x4f3bb1: 0x1c8, _0x4e4ef4: 0x153, _0xc8de64: 0x3c2, _0x136710: 0x3ba, _0x292483: 0x316, _0x138167: 0xafc, _0x4a999e: 0xac5, _0x38914b: 0x4d0, _0xd2a7ed: 0x3b2, _0x131140: 0xa41, _0x99176: 0x83d, _0x3ba5bb: 0x4c3, _0x21abe2: 0x200, _0x4417ca: 0x9c7, _0x18a838: 0x9cf, _0x5d9f01: 0x6f2, _0x26cc7d: 0x39a, _0x3a6a93: 0x88a, _0x4aff5e: 0x5e1, _0x3b971a: 0x2e0, _0x567875: 0x466, _0x11f962: 0x46e, _0x5823b3: 0x8f0, _0x3e9dc8: 0x2cd, _0x2f79a2: 0x2bf, _0x5764e7: 0x311, _0x303e9e: 0x2ae, _0x4102dc: 0xaa6, _0xc292dc: 0x344, _0x34ff14: 0x7ab, _0x142e75: 0xb59, _0x10a873: 0xb29, _0x4c1e43: 0x31d, _0x1d1ade: 0x2de, _0xabb4e9: 0x312, _0x46e34a: 0x4c0, _0x21549e: 0x3ec, _0x4821f0: 0xc7, _0x4c3d9d: 0x628, _0x3b9656: 0x246, _0x422ed3: 0x624, _0x2df43e: 0x73e, _0x167da0: 0x839, _0x36a999: 0x896, _0x3258e2: 0x8ff, _0x2347f8: 0x368, _0x408e1a: 0xd7, _0x34d888: 0x1a1, _0x410e9e: 0x426, _0x1771f8: 0x6ea, _0x102070: 0x196, _0x1e6d0d: 0xb84, _0x588db3: 0x205, _0x1e4702: 0xb60, _0x399f98: 0x355, _0x423e91: 0x73c, _0x51a5a9: 0x627, _0x50477a: 0x6e5, _0xc55757: 0x7b9, _0x5f13e2: 0x52c, _0x4d1fc4: 0x99d, _0x9c7d6: 0x9a0, _0x265e7d: 0x281, _0xe7ffeb: 0x69b, _0x26ac2e: 0x169, _0x32225d: 0xb09, _0x297d69: 0x781, _0x19682e: 0x5e8, _0x2373a4: 0x765, _0x5d2a00: 0x5e6, _0x98eff2: 0x79d, _0x21ca1e: 0x448, _0x3b6187: 0x76b, _0x2e61cd: 0x89c, _0xf34ffc: 0x119, _0x415c9f: 0x88b, _0x3454cd: 0xa1b, _0x1f7a35: 0x5a9, _0x524885: 0x73d, _0x2b458a: 0xa8a, _0x27f43e: 0x90c, _0x172510: 0xb90, _0x257495: 0x62c, _0x1966a4: 0x6e8, _0x208eb8: 0x5d5, _0x3f5035: 0x61c, _0x5388bd: 0x519, _0x4b4fbd: 0x6e0, _0x47cdd: 0x737, _0x285d30: 0xa43, _0x6009a5: 0xab7, _0x33f83f: 0x7c1, _0x581dd9: 0x149, _0x233419: 0x53a, _0x53ee56: 0x1c4, _0x2d42df: 0x976, _0x15f1fb: 0x7cd, _0x26780a: 0x7a2, _0x5292c7: 0x64b, _0x571ed4: 0x56b, _0x47a53c: 0x2ac, _0x5af84f: 0x150, _0x57be2d: 0x685, _0x322883: 0x1ef, _0x1073f7: 0xb6d, _0x13dafd: 0x378, _0x527525: 0x254, _0x4c8b15: 0x36a, _0x3f9387: 0x901, _0x5e0578: 0xb21, _0x12c987: 0x9e5, _0x28ddff: 0x177, _0x78dfe2: 0x58a, _0x237016: 0x26e, _0x332dd4: 0x499, _0x2eba49: 0x8ba, _0x369bc2: 0x7bf, _0x5942f5: 0x385, _0x2696d5: 0xaca, _0x394d38: 0x9c2, _0x44ce85: 0x2ff, _0x477831: 0x48d, _0x32e5f6: 0x511, _0x4a3df4: 0x758, _0x3b81a9: 0x49c, _0x5e8edc: 0xb11, _0x1a2795: 0x359, _0x1954cb: 0x15e, _0x13ffc2: 0x69d, _0x563f7d: 0x723, _0x4e4d5d: 0x2ba, _0x2a8ef7: 0x847, _0x292816: 0x18e, _0x41bded: 0xaaf, _0x206151: 0x4fd, _0xa734ac: 0x319, _0x4b96be: 0x673, _0x8c1ed9: 0x753, _0xe1e7a0: 0x157, _0x5dd659: 0x6b7, _0x5dfc20: 0x9b8, _0x2fd19: 0x5b1, _0xde9641: 0x30f, _0x103854: 0x406, _0x15116b: 0xad8, _0x559f90: 0x6eb, _0x447d8a: 0x95c, _0x398cc2: 0x1f8, _0x532abd: 0x25d, _0x3c5e36: 0x98d, _0x3921d9: 0x3de, _0x37eb47: 0x79f, _0x821e66: 0x3f2, _0x2fdb79: 0xb5d, _0x3fedba: 0xa7b, _0x255161: 0x218, _0x1df963: 0xb7d, _0x8a204d: 0xae4, _0x1cfcc6: 0x74a, _0x152271: 0x8f5, _0x3ab5fd: 0x6bc, _0x43a1a4: 0x156, _0x446a47: 0xb66, _0x8ad0c9: 0xa16, _0x58d9da: 0x8a1, _0x28cab0: 0x72b, _0x34cdd0: 0x6ac, _0x50f866: 0x1c2, _0x18db57: 0x2a4, _0x2af7b4: 0xa78, _0x4fbd61: 0x2fa, _0x320ab2: 0x7af, _0x2e7e09: 0x114, _0x56fba4: 0x6aa, _0x1eb406: 0x374, _0x34917e: 0x695, _0x3d5b02: 0x924, _0x2c081a: 0x707, _0x2bf7bf: 0x5c4, _0x193ef0: 0x31b, _0x498ced: 0x22f, _0x61a5e3: 0x5cd, _0x5ef5aa: 0x6a2, _0x42b8a3: 0x431, _0x533fff: 0x985, _0x4201da: 0xb38, _0x3a041c: 0x610, _0xb3b26f: 0x4c5, _0x5318dc: 0x245, _0x4e9e61: 0x43c, _0x2cfc8a: 0x3ea, _0x4b1ad5: 0xb0c, _0x8702ff: 0x6c6, _0x28632b: 0x3d4, _0x5059c6: 0x41e, _0x265ea0: 0xada, _0x316c77: 0x956, _0x1dd898: 0xa10, _0x2d53ca: 0x257, _0x1b31b4: 0x1db, _0x5271fd: 0x4b6, _0x48aac4: 0x70a, _0x358247: 0x3c1, _0xcc3e3d: 0xc4, _0x30160d: 0x17d, _0x12ef25: 0x64f, _0x4f1c57: 0x4a1, _0x35b072: 0x493, _0x1b32b9: 0x58e, _0x94fe2c: 0x305, _0x576dfd: 0x3ae, _0x31a70f: 0x351, _0x2e511b: 0x979, _0x619450: 0x5c2, _0x1ab66b: 0x98e, _0x40562c: 0x73b, _0x377fc4: 0x813, _0x317b85: 0x361, _0x591dea: 0xb2f, _0x1cf403: 0x727, _0xb8f0ad: 0x799, _0x1a4283: 0xb73, _0x2d4f33: 0x5de, _0x15b3d1: 0xab1, _0x234c31: 0x932, _0x5528b6: 0x6a1, _0x275f7c: 0x436, _0x25b7d8: 0x269, _0x1530bb: 0x22a, _0x35e890: 0x210, _0x5a7975: 0x433, _0x4bbc72: 0x5d1, _0xfb2529: 0x8ee, _0x504f05: 0x4e4, _0xaf011b: 0x6b4, _0x3ff07b: 0x28d, _0x36cf12: 0x4f8, _0x68e2f8: 0x4e7, _0x2271ed: 0x6a9, _0x51dcce: 0x3a0, _0x2dd23b: 0x375, _0x1a785d: 0xba, _0x791933: 0xb3f, _0x4e6494: 0x20e, _0x1bf868: 0x44a, _0xe191f7: 0x116, _0x2346ae: 0x413, _0x34b525: 0x4af, _0x542c9b: 0x3c4, _0x5966a5: 0x313, _0x35d5fd: 0x221, _0x4f2018: 0x677, _0x7ffe4d: 0x69c, _0x11a005: 0x398, _0x542e40: 0x2af, _0x5b5e8b: 0x364, _0x4912e8: 0x19e, _0x70c08c: 0x5be, _0x31b41d: 0xa50, _0x47612f: 0x3d1, _0x51c593: 0xa38, _0x414a9d: 0xa7f, _0x17435b: 0x473, _0x341e88: 0x850, _0x5c738: 0x5cc, _0x35f3d0: 0x829, _0x452f63: 0x469, _0x16e4c7: 0xd2, _0x39126a: 0x287, _0x10c256: 0x841, _0x5afa14: 0x2b0, _0x567a9e: 0x2a7, _0x18dfd1: 0x845, _0x2ae976: 0x3f9, _0x2d2f4a: 0x77a, _0x283c89: 0x903, _0x3da498: 0xb18, _0x43988a: 0xe9, _0xae2e37: 0x52d, _0x5b2de2: 0x597, _0x4613be: 0x64e, _0x11a8ab: 0x937, _0x432448: 0x9ef, _0x15a30e: 0x59c, _0x2e9879: 0x16c, _0x1fd088: 0x898, _0x1595bf: 0x694, _0x5326c1: 0x640, _0x57d6b0: 0x802, _0x3e7e2c: 0xaf1, _0x57f47d: 0x4a9, _0x3d6621: 0x973, _0x59710f: 0x953, _0x4ea8de: 0x16e, _0x542b98: 0x558, _0x49827b: 0x6d4, _0x2ef710: 0x10c, _0x381a6e: 0xa02, _0x5aca69: 0xb31, _0x41a049: 0x71e, _0x45a5e7: 0x350, _0x4ad7f9: 0x6c4, _0x480f6f: 0xac1, _0x52cab1: 0x7ce, _0x4cdaa7: 0x85c, _0x16004d: 0x667, _0x5816f3: 0x6e6, _0x1d4a97: 0x3b9, _0xb036d2: 0x6f1, _0x706a23: 0x9a2, _0x675421: 0x9e3, _0x9ccbf8: 0x565, _0x3e9c9f: 0xae0, _0x1d169f: 0x531, _0x4b517c: 0xb5b, _0x459fb5: 0x145, _0x58da5f: 0x5d6, _0x2060aa: 0x834, _0x2d20d5: 0x94e, _0x32d751: 0x5b8, _0x29ed9e: 0x88f, _0x457dba: 0x4ac, _0x1388ac: 0xc6, _0x253c75: 0xa03, _0x5d2705: 0x8e6, _0x3d64d3: 0x6a5, _0x5687f4: 0x37b, _0x1a9c4b: 0x978, _0xed5071: 0x837, _0x57f47e: 0xaeb, _0x3e351e: 0x4ea, _0x2a3885: 0xaf3, _0x5a79e1: 0x808, _0x4b0671: 0x6a6, _0x9d238a: 0x92e, _0x45a9b8: 0xc0, _0x3037e9: 0x3fc, _0x32877c: 0x4f1, _0x5ce057: 0xb3a, _0x3594ff: 0x40e, _0x4b8f88: 0x49f, _0x5be04a: 0x938, _0x1e20c2: 0x29d, _0x36943a: 0x1a0, _0x35d6a1: 0x573, _0x112ed0: 0x365, _0x6f21da: 0x523, _0x381d42: 0xa34, _0x1ce2ec: 0xa1e, _0x200ba4: 0xa5b, _0xc52177: 0x382, _0x43c784: 0x241, _0x4e76e8: 0x223, _0x288bd9: 0x8cd, _0x146b54: 0x4fb, _0x55faf6: 0x994, _0x1a3497: 0x78f, _0x1c7555: 0x317, _0xc6bc48: 0xb82, _0x398c5c: 0xa98, _0x215602: 0x684, _0xf617f3: 0x1e6, _0x551724: 0x458, _0x3ddfbf: 0x534, _0xe5f219: 0x296, _0x4732fc: 0x423, _0x33b1b2: 0xa68, _0x131dd8: 0x526, _0x481d8a: 0x870, _0x201a14: 0x599, _0x5e2886: 0x386, _0x20eefd: 0x136, _0x4b8893: 0x26c, _0x203726: 0x300, _0x5ed4d8: 0x674, _0x37c3c6: 0xaf8, _0x45dda6: 0x354, _0x1d7b8e: 0x6f0, _0x286de7: 0xb17, _0x308cee: 0x158, _0x34a5f0: 0x544, _0x29e5e1: 0x552, _0x451c4b: 0x63e, _0x8ae89f: 0x8bd, _0x1de7ee: 0xa92, _0x46ab02: 0x572, _0x5c704c: 0xab8, _0x2579c6: 0x1d6, _0x101d71: 0x139, _0x3d8d42: 0x854, _0x352afd: 0x4b0, _0x57c7cb: 0x945, _0x14df58: 0x64a, _0x28e5bb: 0xb41, _0x543679: 0x7be, _0x3a15b0: 0x3d7, _0x1693c7: 0x8a0, _0x1d6c3e: 0x93e, _0x5438bc: 0x6d2, _0x406e7e: 0x550, _0x1bbaa3: 0x921, _0x409015: 0xd0, _0x30f6d1: 0x6a4, _0x54aadd: 0x8c7, _0x50c6bd: 0x67a, _0x20aaf0: 0xa90, _0x1bf0c4: 0x6e9, _0x54729a: 0xb6c, _0x4892c4: 0x6bd, _0x7a5fe0: 0x135, _0x5f5adb: 0x2d6, _0x3e1a0c: 0x7ba, _0x2023f6: 0x556, _0x2da9da: 0x96e, _0x1e8cb7: 0x696, _0x5747e4: 0x1d8, _0x576bfc: 0x3e8, _0x4d244b: 0x4ec, _0x214ea0: 0x652, _0xfbe63f: 0x8e1, _0x2287a9: 0xa19, _0x3e2e60: 0x6f5, _0x27e499: 0x759, _0x2e0d7d: 0x1f7, _0xa72ae6: 0x2cc, _0x365170: 0x998, _0x46ff15: 0xac9, _0xf6f91e: 0x479, _0x59b43c: 0x6b6, _0x38645a: 0x171, _0x54aa48: 0x760, _0x9ac313: 0xb5e, _0x312b2d: 0x767, _0x50d919: 0xa09, _0xea4765: 0x857, _0x4e737d: 0x533, _0x491aaf: 0x6d3, _0x4f3734: 0xf7, _0x2c9b28: 0x8ac, _0x3aae9e: 0x14c, _0x1e1681: 0x3d8, _0x1bbf8d: 0xb37, _0x5b7353: 0x11a, _0x36c275: 0x714, _0x4f2b5d: 0xa67, _0x5217ff: 0x6d7, _0x27236b: 0x5a3, _0x5071ff: 0x9b3, _0xa50d87: 0x8a8, _0x39efc3: 0x9b3, _0x1203c6: 0x9b3, _0xf8bbe7: 0x9b3, _0x277895: 0x739, _0x58ee79: 0x97b, _0x23a9ef: 0x9b3, _0x42a848: 0xadd, _0x24edc4: 0x4fa, _0x3885a5: 0x9a6, _0x31c3c1: 0x9b3, _0x23aa1c: 0x8bf, _0x1df239: 0x9b3, _0x3ad983: 0x14e, _0x5d821b: 0x6d5, _0x548039: 0x618, _0x2fc508: 0x9b3, _0x1f499a: 0xb4c, _0x269221: 0x8e7, _0x4e9909: 0x26a, _0x1a1fee: 0x576, _0x36e832: 0x9b3, _0x1e2cdb: 0x76f, _0x37a1b3: 0x71c, _0x19bcd1: 0x9b3, _0x490e31: 0x5b5, _0x3c32d3: 0x373, _0x12f889: 0x362, _0x439ed8: 0xe3, _0x42ca9d: 0x9b5, _0x417b74: 0x25b, _0x247fdd: 0x9b3, _0x1e1c37: 0x30c, _0x15e6fc: 0x798, _0x1e734d: 0x793, _0x26c543: 0x637, _0x2b5b77: 0x562, _0x4308ed: 0x9b3, _0x1bcfb6: 0x9b3, _0x3a37a1: 0x4a8, _0x5ddeb7: 0x9b3, _0x377720: 0x1c6, _0x32189f: 0x3d0, _0x105d66: 0x270, _0x5ead7e: 0x167, _0x2d5abb: 0x8f4, _0x51cc13: 0x9b3, _0x258df6: 0x9b3, _0x4d0dd7: 0x9b3, _0x211655: 0x9b3, _0x20795f: 0xa74, _0x5e8bac: 0x12b, _0x2c98f2: 0x9b3, _0x28ef29: 0x8ad, _0x536303: 0x7c2, _0x1974db: 0x294, _0x29e040: 0x645, _0x1d49b2: 0x5db, _0x7dbb95: 0x47c, _0x98c3e5: 0x40f, _0x135df6: 0xb4b, _0x47d106: 0xa2b, _0x44e94c: 0x64c, _0x15dcad: 0x2b7, _0x35fb35: 0x9b3, _0xdc8b5f: 0x643, _0x4d46ab: 0x9b3, _0x317153: 0x78a, _0x6c4a3c: 0xa8f, _0x446398: 0x103, _0x5d09cb: 0x432, _0x5102d4: 0x8a6, _0x15bc1b: 0xb06, _0x3d4958: 0x9b3, _0x193f1f: 0x9b3, _0x46b986: 0xa2b, _0x543e9e: 0x6ba, _0x516a6b: 0xac6, _0xece5ba: 0x9b3, _0x2f147e: 0xa31, _0x22d82c: 0x98a, _0x43566b: 0x820, _0x58a710: 0xa3c, _0x11fe93: 0xa11, _0x21a39f: 0x89d, _0xace42f: 0x8fe, _0x21693e: 0xae7, _0x5da6d8: 0x9b3, _0x112197: 0x294, _0x5ae0b8: 0x9b3, _0xba64c: 0x437, _0x2c1787: 0x941, _0x12a12e: 0x9b3, _0x49178d: 0xa12, _0x302f7f: 0x32e, _0x40e574: 0x594, _0x2cf44d: 0x4c4, _0x26fb92: 0xb22, _0x3b9103: 0xa13, _0x50cb1b: 0x8ac, _0x4e5f54: 0x1fb, _0x4119ac: 0xaaa, _0x585638: 0x728, _0x1e199d: 0xad7, _0x1ca48b: 0x251, _0x1d4438: 0x9b3, _0x234734: 0x9b3, _0x4cdc6a: 0x9b3, _0x2e04bd: 0x40b, _0x53350a: 0x9b3, _0x502113: 0x290, _0x7022f0: 0x881, _0x2f2f24: 0x801, _0x54a03f: 0x94a, _0x4c4666: 0x1f6, _0x2ceb16: 0x174, _0x19b3e1: 0x54d, _0x83dfff: 0x66c, _0x1da83a: 0x9b3, _0x30f644: 0xae5, _0x38eb48: 0xf9, _0x287b9f: 0x7b5, _0x159cd3: 0x9b3, _0x20c008: 0x9d4, _0x21db19: 0x9b3, _0x847ae4: 0x174, _0x3c7e0c: 0x93f, _0x4fb2db: 0x9b3, _0x13b862: 0x1a8, _0x49d804: 0x240, _0x3023ab: 0x2ee, _0x484b63: 0x8a7, _0x42b303: 0x294, _0x416428: 0x9b3, _0x57df94: 0x7a1, _0x2f4cde: 0x9b3, _0x2699a5: 0x9b3, _0x29e485: 0x7c9, _0x28b516: 0xa32, _0x183290: 0x9b3, _0x1d15f7: 0x9b3, _0x47b956: 0x294, _0x37ac73: 0xa97, _0x5cdac8: 0x69a, _0x18529b: 0x6dc, _0x52e6d5: 0x927, _0x54815e: 0x757, _0x42a39e: 0x9f8, _0x2b2eee: 0x9b3, _0x22eca1: 0x99a, _0x34fe5e: 0x2ce, _0x48d17b: 0x719, _0x5db1e9: 0xb01, _0x3d8eef: 0x294, _0x1ce2e3: 0x17e, _0xd76b93: 0x191, _0x5acd1d: 0x5dd, _0x458ef9: 0x9b3, _0x4e3f34: 0x404, _0x55e6c4: 0x99f, _0x270e2d: 0x5bc, _0x2cad40: 0x90a, _0x5bcc7a: 0x417, _0x58b318: 0x5fd, _0x5d1c4c: 0x4d7, _0x4566a8: 0x57b, _0x4e9691: 0x58d, _0x35f346: 0x9b3, _0x228253: 0x1a3, _0x2dd39: 0x7f2, _0x148f34: 0x80f, _0x2af7e1: 0xab3, _0x3b02c4: 0x278, _0x3f9713: 0x79e, _0x3d9f26: 0x66a, _0x1084d7: 0xb75, _0x34b99e: 0x915, _0x30d67f: 0x14a, _0x244b02: 0x1eb, _0x51b868: 0x9b3, _0xa1464b: 0x160, _0x183e6b: 0x465, _0x4402df: 0x9b3, _0x3fd67f: 0x5d3, _0x5080ca: 0x4d4, _0x18b48e: 0x9b3, _0x58f9b6: 0x9b3, _0x55a59b: 0x193, _0x253a09: 0x9b3, _0x1f8275: 0x9b3, _0x2eb6d8: 0x9b3, _0x5a1f22: 0x884, _0x55f45d: 0x12c, _0x59a273: 0x9b3, _0x203502: 0xa4e, _0x20561a: 0x334, _0x264c57: 0x56c, _0x51bf12: 0x590, _0x2749a1: 0x5b0, _0x596acd: 0x35e, _0x315cb8: 0x26d, _0x36735a: 0x9b3, _0x4222b4: 0x9b3, _0x4f5cfc: 0x9b3, _0x373765: 0x750, _0x363e36: 0x9b3, _0x3acd68: 0x28e, _0x542ccf: 0x9b3, _0x3f324d: 0x2d3, _0x40a5cb: 0x9b3, _0x25aa68: 0xa0a, _0x3dd890: 0x9b3, _0x2789c9: 0x9b3, _0x3d5baf: 0x9b3, _0x375229: 0x789, _0x138964: 0xb14, _0x29adbe: 0x9f6, _0x590ed7: 0x7b0, _0x1a4873: 0x4a2, _0x3d33ed: 0x9b3, _0x1e5936: 0x557, _0x17d434: 0x9b3, _0x4d2070: 0x13d, _0x5094f4: 0x9b3, _0x2d1648: 0x4a3, _0x1aa1cb: 0x80b, _0x19b6a8: 0x926, _0x3d33b0: 0x9b3, _0x2d7c20: 0x236, _0x5d3ba9: 0x9b3, _0x4fba6c: 0x9b3, _0x542fca: 0x9fb, _0x5b62da: 0x5fb, _0x515ba2: 0x496, _0x596b45: 0xa1d, _0x25ace4: 0x35e, _0x78edb5: 0x6ce, _0x118fde: 0x680, _0x298360: 0x9b3, _0x4fb57f: 0x3c0, _0x4c73a8: 0x9b3, _0x9c5a5: 0xb32, _0xe58d29: 0x6a3, _0x53dcaa: 0x60f, _0x6d9fc3: 0x7f9, _0x168e9f: 0x608, _0x34db0e: 0x399, _0x5e4c01: 0xd3, _0x46c28b: 0x33a, _0xe5e311: 0x9b3, _0x52bbbb: 0x9b3, _0x51f9c7: 0x9b3, _0x1e72a5: 0x9d1, _0x5bd9be: 0x9fc, _0x4c08ea: 0x9e6, _0x1543a3: 0x8a2, _0x331e49: 0x536, _0x81f757: 0x420, _0x1b041c: 0x6ad, _0x4815e2: 0x8a6, _0x503289: 0x9b3, _0xa3a652: 0x9e1, _0x3a3ef9: 0x749, _0x22619c: 0x982, _0x4e0887: 0x85e, _0x3cff46: 0xb70, _0x5e19dc: 0x6dd, _0x4297fe: 0x127, _0x449c3f: 0x45c, _0x309dcc: 0x302, _0x45bb31: 0x8ab, _0x5e8a40: 0x7e5, _0x1c29b0: 0x16b, _0x12cb90: 0x1be, _0xe87ea6: 0x9b3, _0x51ef11: 0xac6, _0x1600d0: 0x2f8, _0x475cd4: 0x891, _0x756ab2: 0x619, _0x53c091: 0xad9, _0x43f091: 0xb10, _0x2b1a33: 0x467, _0x55af78: 0x4cf, _0x4e342e: 0x1ea, _0x2572e7: 0x91a, _0x858078: 0x5b3, _0x6d483e: 0x9bc, _0xf3e7d4: 0x87c, _0x16b3a8: 0x84e, _0x3e6942: 0x43f, _0x26bfcf: 0x559, _0x2778ad: 0xf3, _0xca0682: 0x2b5, _0x38780f: 0x9b3, _0x5d750d: 0x4fc, _0x43ed62: 0x1ac, _0xb41ae8: 0x9b3, _0x10ce29: 0x9b3, _0x5d9414: 0x1ed, _0x5e4abb: 0x9b3, _0x5e9ef9: 0x7b8, _0x278910: 0x474, _0x3e215c: 0x294, _0x3f1ea8: 0x9b3, _0x39c6eb: 0x629, _0x47ce9b: 0x607, _0x1a3b1d: 0x92d, _0xe2f879: 0x60c, _0x669e1f: 0x65c, _0x410ac9: 0x330, _0x18731c: 0x9b3, _0x4d526a: 0x9b3, _0x178886: 0x5ba, _0x598fdd: 0x40a, _0x269f19: 0x967, _0x88e100: 0x9b3, _0x9d9af7: 0xb35, _0x338117: 0x78b, _0x4a22d3: 0x4d6, _0x389a48: 0xb56, _0x1f0a28: 0x735, _0x2b1ee2: 0x111, _0xfeaefe: 0xb20, _0x2cfeb6: 0x9b3, _0xb89aa2: 0x9b3, _0x2aba9e: 0x247, _0x315e6a: 0x993, _0x5ebbb1: 0x432, _0x31ffb0: 0xaa9, _0x2ae0d0: 0x615, _0x45d82e: 0xb8b, _0x31b4d5: 0xa1a, _0xada5d1: 0xb91, _0x4897d9: 0x9b3, _0x2cb19e: 0x1a4, _0xdb5421: 0x592, _0x51564f: 0xade, _0x5327f5: 0x895, _0x8dc5c9: 0x9b3, _0x1486bb: 0x5da, _0x1479a9: 0xb12, _0x4534d1: 0x5f1, _0x8d5728: 0x5fa, _0x6ac74: 0x328, _0x19cbc3: 0xb64, _0x2f0008: 0x86b, _0x16687f: 0xf2, _0x48de6f: 0x2dc, _0x3094d4: 0x742, _0xd393d5: 0x181, _0x324606: 0x1a2, _0x2ab0d3: 0x895, _0x5cbd25: 0xa3b, _0x59b9f1: 0x5ce, _0x1ade0b: 0x525, _0x10b9f3: 0x9b3, _0x1f287b: 0x969, _0x171747: 0x9b3, _0x45c320: 0x9b3, _0x2c54bf: 0x8d7, _0x204446: 0x3e7, _0x1b763a: 0x9b3, _0x3b3fee: 0x195, _0x12f8b0: 0x62e, _0x5dbe78: 0x66d, _0x23db23: 0x3b8, _0x27327f: 0x549, _0x37d6bb: 0xa36, _0x5bfc85: 0x5e2, _0x5be22e: 0x106, _0x2ea35e: 0xa2b, _0x5e6382: 0x800, _0x322762: 0x439, _0x45192b: 0x1e1, _0x430ea5: 0x617, _0x19cd6a: 0x895, _0x1620e0: 0x965, _0x5b309f: 0x559, _0x423229: 0x615, _0xbc536: 0x647, _0x4bd7a3: 0xb16, _0xf421d5: 0x9b3, _0x3b461f: 0x9b3, _0x32c465: 0x83c, _0x55c7c4: 0x35a, _0xa9924c: 0x1d3, _0x3ed286: 0xac0, _0x4b4c8e: 0x453, _0x96df54: 0x3f5, _0xea5b6a: 0x721, _0x52dc9c: 0x27c, _0xa04153: 0x9b3, _0x1f02cc: 0x22b, _0x5117fb: 0x6c2, _0x4af1fa: 0x563, _0x5d6b43: 0x92c, _0x27d9b7: 0xc9, _0x660b1: 0x9b3, _0x32769b: 0x7eb, _0x1261c8: 0x15c, _0x8636b7: 0x9b3, _0x3da4ef: 0x75c, _0x56b1e5: 0x7df, _0x4cbbe3: 0x9b3, _0x47664e: 0x908, _0x2b08f3: 0x336, _0x4b8992: 0x9b3, _0x1e0c63: 0xfd, _0xccd2be: 0x38f, _0x522881: 0xd5, _0x5e22a2: 0x9b3, _0x56cb4e: 0x7c3, _0x56fa8c: 0x9b3, _0x1bbd10: 0x10f, _0x23d27e: 0x689, _0x485b70: 0x7f1, _0x2f7ad6: 0x59a, _0x283596: 0x895, _0x1c7d87: 0x5af, _0xcd386c: 0x5ae, _0x29a317: 0x422, _0x149014: 0x8b5, _0x46370e: 0xb53, _0xebed5: 0xa87, _0x12eada: 0xb47, _0xb01a6: 0x9d7, _0x2cb2fc: 0x9b3, _0x246b31: 0x593, _0x57c5b0: 0x63b, _0xb88f99: 0xa65, _0x28add6: 0x9b3, _0x5d2db0: 0x9b3, _0x342b88: 0x14f, _0x4a4bf5: 0x851, _0x1ef00e: 0x4cc, _0x3b9771: 0x2f7, _0x16a13e: 0x740, _0x338178: 0xac6, _0x243b85: 0x9b3, _0x1bffea: 0xb30, _0x15c2b6: 0x82f, _0x3f864b: 0x9b3, _0x40e9ee: 0xa60, _0x23f6b9: 0x722, _0x14e9cb: 0x9b3, _0x193f16: 0x9b3, _0x4a4827: 0x480, _0x277f66: 0x126, _0x1b73b1: 0x7aa, _0x60e73e: 0x337, _0x4e81f2: 0x2f9, _0x44ee70: 0x207, _0x18ebfe: 0x77e, _0x255b98: 0xa1f, _0x11efc8: 0x621, _0x5a41d1: 0x8fb, _0x1971c4: 0x9b3, _0x512bfc: 0xb6e, _0x2561fa: 0x253, _0x5356cd: 0x9b3, _0x25ff80: 0x333, _0x57b551: 0x9b3, _0x2bca5c: 0x654, _0x3d3a93: 0x79a, _0x55ca98: 0x9b3, _0x1d305b: 0x9b3, _0x2f67b9: 0x9b3, _0x24862a: 0x360, _0x59aa9f: 0x46b, _0x123e2a: 0x91d, _0x1b95f7: 0x18a, _0x5d8d22: 0x429, _0x44791b: 0x5bd }, _0x2b8b6b = { _0x6237c5: 0x9d8 }, _0x564fa4 = { _0x3a8ab3: 0x4be }, _0x26d371 = { _0x1dc7af: 0x9c0, _0x1270b5: 0x242, _0x341f86: 0x242 }, _0x2787a5 = _0x281b; if (VisualEditorWindow && !VisualEditorWindow['closed']) { if ('LHqZG' !== 'PTrmv') { VisualEditorWindow[_0x2787a5(0x42a)](); return; } else { _0x3d38c2[_0x2787a5(_0x4bde01._0x1d9196)](); return; } } enableEditorMode(), VisualEditorWindow = window[_0x2787a5(_0x4bde01._0x57e9f4)](_0x2787a5(_0x4bde01._0x41c8a0) + 'k', _0x2787a5(0xbb), 'width=900,' + _0x2787a5(_0x4bde01._0x25152c)); if (VisualEditorWindow) { if ('UtjQX' !== _0x2787a5(0x45e)) { VisualEditorWindow[_0x2787a5(_0x4bde01._0x21fc85)]['write']('\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20<head>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20<tit' + _0x2787a5(0x74b) + 'Builder</t' + _0x2787a5(0x3f6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<style>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '*\x20{\x20box-si' + 'zing:\x20bord' + 'er-box;\x20}\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xd01588) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20m' + 'argin-top:' + _0x2787a5(_0x4bde01._0x10a7fe) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20:ro' + _0x2787a5(_0x4bde01._0x3165a5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3b2e23) + '-bg:\x20#1e3a' + '2f;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xd6) + 'surface:\x20#' + '1f1f1f;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20--surfac' + 'e-2:\x20#2929' + '29;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20--' + _0x2787a5(0xa5f) + _0x2787a5(_0x4bde01._0x12e798) + _0x2787a5(_0x4bde01._0x1aaf80) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xee0f3a) + ':\x20#e8e8e8;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20--tex' + 't-muted:\x20#' + 'a9a9a9;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15b2cc) + '\x20\x20--text-f' + _0x2787a5(0x664) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1aaf80) + '\x20\x20\x20\x20\x20\x20--ac' + 'cent:\x20#ff9' + _0x2787a5(_0x4bde01._0x4ddaa6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa4f) + _0x2787a5(_0x4bde01._0x22c003) + 'ft:\x20rgba(2' + _0x2787a5(0x524) + _0x2787a5(_0x4bde01._0x1eecdb) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '--shadow:\x20' + _0x2787a5(0x6c5) + '\x20rgba(0,0,' + '0,0.4);\x0a\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20--shadow' + '-sm:\x200\x201px' + '\x204px\x20rgba(' + _0x2787a5(_0x4bde01._0x1c7706) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20--ra' + 'dius:\x2014px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20--ra' + _0x2787a5(0x95a) + _0x2787a5(_0x4bde01._0x300a08) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20--' + 'mono:\x20\x27Int' + 'er\x27,\x20syste' + 'm-ui,\x20sans' + '-serif;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + (_0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xaa7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20font-fa' + 'mily:\x20var(' + '--mono);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15b2cc) + _0x2787a5(_0x4bde01._0x39a4b3) + _0x2787a5(0x528) + _0x2787a5(0x27b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'color:\x20var' + '(--text);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20min-he' + 'ight:\x20100v' + 'h;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20pad' + 'ding:\x2020px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20marg' + 'in:\x200;\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xc8) + _0x2787a5(_0x4bde01._0x2ed2fc) + _0x2787a5(_0x4bde01._0x1766b8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20-webkit-' + 'font-smoot' + 'hing:\x20anti' + 'aliased;\x0a\x20' + _0x2787a5(_0x4bde01._0x15b2cc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x827) + 'ore\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'content:\x20\x27' + _0x2787a5(0x525) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5bb) + 'ition:\x20fix' + 'ed;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20to' + 'p:\x200;\x20left' + _0x2787a5(0x792) + ':\x200;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x783) + _0x2787a5(0x702) + 'h;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x389) + _0x2787a5(0x656) + 'lor:\x20#0d22' + '18;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ba' + 'ckground-i' + _0x2787a5(_0x4bde01._0x257057) + _0x2787a5(0x2ad) + _0x2787a5(_0x4bde01._0x558f80) + '#061209\x2025' + '%,\x20transpa' + 'rent\x2025%),' + '\x20linear-gr' + _0x2787a5(_0x4bde01._0x461431) + 'deg,\x20#0612' + '09\x2025%,\x20tr' + 'ansparent\x20' + '25%),\x20line' + _0x2787a5(0x2ad) + 't(45deg,\x20#' + _0x2787a5(0x367) + _0x2787a5(0x6b9) + 'ent\x2025%),\x20' + _0x2787a5(_0x4bde01._0x141407) + 'dient(315d' + _0x2787a5(_0x4bde01._0x25c7cd) + _0x2787a5(0x9cc) + '2218\x2025%);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20backg' + 'round-posi' + 'tion:\x2039px' + '\x200,\x2039px\x200' + ',\x200\x200,\x200\x200' + _0x2787a5(_0x4bde01._0x527480)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20back' + 'ground-siz' + 'e:\x2039px\x2039' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ba' + 'ckground-r' + 'epeat:\x20rep' + 'eat;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20o' + 'pacity:\x200.' + '25;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3f5bea) + _0x2787a5(0x833) + '-image:\x20li' + 'near-gradi' + _0x2787a5(0xb04) + 'tom,\x20black' + _0x2787a5(0x8a9) + 'parent\x2030%' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20mas' + _0x2787a5(_0x4bde01._0x5a5ccf) + 'inear-grad' + 'ient(to\x20bo' + _0x2787a5(0x303) + _0x2787a5(_0x4bde01._0x258e2b) + 'sparent\x2030' + '%);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x383) + 'inter-even' + _0x2787a5(_0x4bde01._0x3c425c) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20z-inde' + 'x:\x200;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + _0x2787a5(_0x4bde01._0xd6c083) + _0x2787a5(0x705) + 'r\x20{\x20width:' + _0x2787a5(0x3bb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa7d) + 'dy::-webki' + 't-scrollba' + 'r-track\x20{\x20' + 'background' + ':\x20transpar' + _0x2787a5(0x120) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20bod' + 'y::-webkit' + '-scrollbar' + '-thumb\x20{\x20b' + 'ackground:' + '\x20#444;\x20bor' + 'der-radius' + ':\x203px;\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x7d3) + ',\x20h1,\x20.hin' + 't,\x20.main-c' + 'ontent\x20{\x20p' + 'osition:\x20r' + 'elative;\x20z' + _0x2787a5(_0x4bde01._0x4f68e0) + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1766b8) + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x390f58) + 'iner\x20{\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20backgrou' + 'nd:\x20var(--' + _0x2787a5(0xed) + _0x2787a5(0x439) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20max-' + _0x2787a5(_0x4bde01._0x2c7349) + '0px;\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1aaf80) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20m' + 'argin:\x200\x20a' + _0x2787a5(0x68c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1c7dbf) + 'order-radi') + ('us:\x2020px;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x333f6b) + '\x20\x20\x20\x20paddin' + 'g:\x2018px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20box-sha' + 'dow:\x20var(-' + _0x2787a5(0x4f6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3658fc) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20.header' + _0x2787a5(0x432) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20pos' + _0x2787a5(0x9dc) + _0x2787a5(0xa77) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20text-alig' + _0x2787a5(0x579) + _0x2787a5(_0x4bde01._0x1bca23) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4c5cf0) + _0x2787a5(0x5bf) + _0x2787a5(0x143) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20h' + '1\x20{\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x594) + 'ext-align:' + _0x2787a5(_0x4bde01._0x150674) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20font-si' + 'ze:\x2020px;\x0a' + _0x2787a5(_0x4bde01._0x3658fc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x90f) + 'eight:\x20600' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x533bed) + 'r:\x20var(--t' + _0x2787a5(0xa40) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'letter-spa' + _0x2787a5(_0x4bde01._0x32571d) + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20ma' + 'rgin-botto' + _0x2787a5(0xad4) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x294) + _0x2787a5(_0x4bde01._0x2c6d85) + '\x20.credit\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20text-' + _0x2787a5(_0x4bde01._0x17188d) + _0x2787a5(0x1df) + _0x2787a5(_0x4bde01._0x1f8257) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4ad) + _0x2787a5(0x53b) + _0x2787a5(_0x4bde01._0x206210) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'font-size:' + '\x2011px;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x666) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20colo' + 'r:\x20var(--a' + 'ccent);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20text-dec' + 'oration:\x20n' + _0x2787a5(0x683)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20.' + 'credit\x20a:h' + 'over\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x30b993) + 'ration:\x20un' + 'derline;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x357193) + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20.hint\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-s' + _0x2787a5(_0x4bde01._0x1bbc94) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1f8257) + _0x2787a5(_0x4bde01._0x34eb69) + ':\x20var(--te' + _0x2787a5(0x90e) + _0x2787a5(_0x4bde01._0x33934f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x37d) + _0x2787a5(0x5bf) + _0x2787a5(_0x4bde01._0x28e81c) + _0x2787a5(_0x4bde01._0x1f8257) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'padding:\x208' + 'px\x2014px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20backgro' + 'und:\x20var(-' + _0x2787a5(0x691) + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20borde' + 'r-radius:\x20' + 'var(--radi' + 'us-sm);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20text-ali' + _0x2787a5(_0x4bde01._0x57a95c) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20box-' + 'shadow:\x20va' + _0x2787a5(0x214) + _0x2787a5(0x168) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xae8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x492) + 'toolbar\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x423fac) + _0x2787a5(_0x4bde01._0xf48bf3) + 'y:\x20flex;\x0a\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20gap:\x2010' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15c5dc) + '\x20\x20\x20\x20\x20\x20\x20\x20ma' + 'rgin-botto' + 'm:\x2015px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20justify' + '-content:\x20' + 'center;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20flex-wra' + _0x2787a5(_0x4bde01._0x212696) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20positio' + 'n:\x20relativ' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xabe) + 'ndex:\x201;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xeb7ea7)) + (_0x2787a5(_0x4bde01._0x50ebe2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x423fac) + '\x20border:\x20n' + 'one;\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20b' + 'order-radi' + 'us:\x20var(--' + 'radius-sm)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20curs' + _0x2787a5(_0x4bde01._0x1c7f97) + 'r;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fon' + _0x2787a5(0x96d) + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x46d378) + 'nt-weight:' + _0x2787a5(0x4aa) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'font-famil' + 'y:\x20var(--m' + 'ono);\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x123102) + _0x2787a5(0x9b3) + 'padding:\x208' + _0x2787a5(_0x4bde01._0x599610) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15c5dc) + _0x2787a5(0x37c) + _0x2787a5(0x738) + 'ty\x200.15s;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15662d) + 'ound:\x20var(' + '--accent);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20color' + ':\x20#fff;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20.toolbar-' + 'btn:hover\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20opac' + 'ity:\x200.85;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x333f6b) + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x236369) + _0x2787a5(0x690) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20.toolb' + 'ar-btn.act' + 'ive\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d50d7) + ':\x20var(--ac' + _0x2787a5(_0x4bde01._0x80956f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20color:\x20#f' + 'ff;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20op' + _0x2787a5(_0x4bde01._0x5586bd) + _0x2787a5(_0x4bde01._0x470750) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x95b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1f2c53) + '-content\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20displ' + _0x2787a5(0x561) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20gap:\x201' + '5px;\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4a5efe) + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20.s' + 'idebar\x20{\x0a\x20' + _0x2787a5(_0x4bde01._0x423fac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20width:\x20' + _0x2787a5(_0x4bde01._0x496837) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x520031) + _0x2787a5(_0x4bde01._0x2dcfca) + _0x2787a5(0x902) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x298) + _0x2787a5(0x5c0) + 'r(--radius' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20pad' + _0x2787a5(_0x4bde01._0x5c6f4c) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20box-' + _0x2787a5(_0x4bde01._0x302a5e) + _0x2787a5(0x214) + _0x2787a5(_0x4bde01._0x74ff78) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20.' + 'content-pa' + _0x2787a5(0xabb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'flex:\x201;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x990) + 'und:\x20var(-' + '-surface);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20borde' + 'r-radius:\x20' + 'var(--radi' + _0x2787a5(0x335) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2dd) + _0x2787a5(0x963) + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'x-shadow:\x20' + 'var(--shad' + 'ow-sm);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x32f) + _0x2787a5(_0x4bde01._0x423fac) + _0x2787a5(_0x4bde01._0x15c5dc) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa8e) + 'header\x20h3\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20marg' + 'in:\x200\x200\x2012' + 'px\x200;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5c2bc6) + _0x2787a5(0x4ad) + '(--text-mu' + _0x2787a5(_0x4bde01._0x206210) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x41b) + _0x2787a5(0xa94) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15b2cc) + _0x2787a5(0x9f2) + 'ht:\x20600;\x0a\x20' + _0x2787a5(_0x4bde01._0x1d4bc8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20letter-' + 'spacing:\x200' + '.8px;\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xd92c6e) + _0x2787a5(_0x4bde01._0x24e8a8) + 'rcase;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20text-alig' + 'n:\x20left;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x485c4f)) + ('bottom:\x201p' + 'x\x20solid\x20va' + _0x2787a5(0x30b) + 'e-3);\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'padding-bo' + 'ttom:\x2010px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3bd0d9) + '\x20\x20\x20\x20\x20.scro' + 'llable-lis' + 't\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ma' + 'x-height:\x20' + '500px;\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20overflow-' + _0x2787a5(0x1fe) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x1aaf80) + '\x20\x20\x20overflo' + _0x2787a5(_0x4bde01._0x438408) + 'n;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x266) + 'ding-right' + ':\x205px;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '.scrollabl' + _0x2787a5(0xcd) + _0x2787a5(0x2ef) + 'llbar\x20{\x20wi' + 'dth:\x204px;\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x51865f) + 'ble-list::' + '-webkit-sc' + _0x2787a5(_0x4bde01._0x219f30) + _0x2787a5(_0x4bde01._0x194c2f) + _0x2787a5(_0x4bde01._0x5455e8) + 'ansparent;' + _0x2787a5(0x442) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20.scroll' + 'able-list:' + _0x2787a5(0x1d4) + 'crollbar-t' + 'humb\x20{\x20bac' + _0x2787a5(0xadf) + _0x2787a5(_0x4bde01._0x4130fa) + 'r-radius:\x20' + _0x2787a5(_0x4bde01._0x1580d3) + _0x2787a5(_0x4bde01._0x123102) + _0x2787a5(_0x4bde01._0xa6010a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20.l' + 'ist-item\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20displ' + 'ay:\x20flex;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20align-' + _0x2787a5(0x3ad) + 'ter;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20m' + _0x2787a5(0x23a) + _0x2787a5(0x28c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20padding' + _0x2787a5(0xa4c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20backgrou' + 'nd:\x20var(--' + _0x2787a5(_0x4bde01._0x3b55cf) + _0x2787a5(0x439) + _0x2787a5(_0x4bde01._0x2bd0a4) + '\x20\x20\x20\x20\x20\x20bord' + 'er:\x201.5px\x20' + 'solid\x20var(' + '--surface-' + '3);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + _0x2787a5(0x538) + _0x2787a5(_0x4bde01._0x8dc4c8) + _0x2787a5(_0x4bde01._0x5ceecd)) + ('\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x93d) + 'r:\x20pointer' + _0x2787a5(_0x4bde01._0x464bee) + _0x2787a5(_0x4bde01._0x236369) + '\x20\x20\x20\x20\x20\x20tran' + _0x2787a5(_0x4bde01._0x5a1444) + _0x2787a5(0x30a) + '\x200.15s,\x20ba' + 'ckground\x200' + _0x2787a5(_0x4bde01._0x25c588) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x17c795) + 'list-item:' + 'hover\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x3c5b64) + 'olor:\x20var(' + '--accent);' + _0x2787a5(0x294) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x574697) + 'round:\x20var' + '(--surface' + _0x2787a5(_0x4bde01._0x301115) + _0x2787a5(_0x4bde01._0x15d912) + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20.l' + 'ist-item.a' + 'ctive\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x46f) + _0x2787a5(0x502) + '--accent);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20backg' + _0x2787a5(_0x4bde01._0x364c1c) + '(--surface' + '-3);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x2fcdeb) + '\x20\x20\x20\x20\x20\x20\x20\x20.l' + 'ist-item-n' + 'ame\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'flex:\x201;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20color:\x20' + _0x2787a5(_0x4bde01._0x3cec36) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fon' + 't-size:\x2011' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4a5efe) + '\x20\x20\x20\x20\x20\x20\x20\x20fo' + 'nt-weight:' + '\x20600;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5068ea) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x17c795) + 'delete-slo' + 't-btn\x20{\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x2bd0a4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20width:\x202' + '2px;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20h' + 'eight:\x2022p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20bac' + 'kground:\x20#' + '3a1a1a;\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x193507) + 'e05050;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x93a) + '1px\x20solid\x20') + ('#555;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xb5f49b) + _0x2787a5(0x66e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x422c46) + ':\x20pointer;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20font-' + _0x2787a5(_0x4bde01._0x578668) + _0x2787a5(_0x4bde01._0xb685c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fon' + 't-size:\x2011' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20tr' + 'ansition:\x20' + 'background' + _0x2787a5(_0x4bde01._0x276d53) + _0x2787a5(_0x4bde01._0x31639b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x24c13b) + '\x20flex;\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20align-ite' + 'ms:\x20center' + _0x2787a5(0x439) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x17fd62) + 'ify-conten' + _0x2787a5(_0x4bde01._0x201d48) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20margi' + 'n-left:\x208p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4e0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x1d2) + _0x2787a5(0x7c0) + 'tn:hover\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20backg' + 'round:\x20#4a' + '2020;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5068ea) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20.' + 'add-slot-b' + 'tn\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20w' + 'idth:\x2022px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20heig' + 'ht:\x2022px;\x0a' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20backgr' + 'ound:\x20var(' + '--surface-' + '3);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'lor:\x20var(-' + '-text);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x9e85a) + _0x2787a5(0x93a) + '1px\x20solid\x20' + '#555;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4ba7c6) + 'ius:\x2050%;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20cursor' + ':\x20pointer;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4cbdbb) + 'weight:\x2070' + '0;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x327577) + _0x2787a5(0x804) + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20tr' + _0x2787a5(_0x4bde01._0x931145)) + ('opacity\x200.' + '15s;\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x9e85a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + 'isplay:\x20fl' + 'ex;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1445f8) + _0x2787a5(0xb20) + 'ign-items:' + '\x20center;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20justify' + '-content:\x20' + 'center;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa80) + '\x200;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x314) + _0x2787a5(0x9b9) + 'ranslateY(' + '-2px);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '.add-slot-' + _0x2787a5(_0x4bde01._0x2adc6f) + _0x2787a5(_0x4bde01._0x38f4d3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20opac' + 'ity:\x200.85;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x690) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20.field' + '-group\x20{\x0a\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x509189) + '\x20\x20\x20display' + _0x2787a5(_0x4bde01._0x22887b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x31639b) + '\x20\x20grid-tem' + 'plate-colu' + _0x2787a5(_0x4bde01._0x3d6a57) + _0x2787a5(0x8d8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2e9) + _0x2787a5(0x2fc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20margin-' + 'bottom:\x2012' + _0x2787a5(_0x4bde01._0x300a08) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5e26bb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x178fef) + _0x2787a5(_0x4bde01._0x2d9a90) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'background' + ':\x20transpar' + 'ent;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + 'adding:\x200;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1ef21a) + 'r:\x20none;\x0a\x20' + _0x2787a5(_0x4bde01._0x2769ee) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20margin-' + _0x2787a5(0x457) + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x6c1) + _0x2787a5(_0x4bde01._0x2526e7) + '\x20\x20\x20\x20\x20\x20.fie' + 'ld.full-wi' + 'dth\x20{\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5a8) + _0x2787a5(0x866) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1a6b7a) + '\x20label\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20display' + _0x2787a5(_0x4bde01._0x18a1b4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x30920c) + 'bottom:\x203p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fon' + 't-weight:\x20' + '500;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20f' + 'ont-size:\x20' + _0x2787a5(0x512) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'color:\x20var' + '(--text-mu' + 'ted);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x711) + 'cing:\x200.3p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x6c1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20.fie' + 'ld\x20input,\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '.field\x20sel' + 'ect\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x15fe83) + 'width:\x20100' + _0x2787a5(_0x4bde01._0x41777f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2d031e) + 'ding:\x205px\x20' + '9px\x20!impor' + 'tant;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'border:\x201.' + '5px\x20solid\x20' + '#444\x20!impo' + 'rtant;\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x2fcdeb) + '\x20border-ra' + _0x2787a5(_0x4bde01._0x2098b4) + '--radius-s' + 'm)\x20!import' + 'ant;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20b' + 'ackground:' + '\x20#353434\x20!' + 'important;' + _0x2787a5(_0x4bde01._0x1bca23) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20color' + _0x2787a5(0x612) + _0x2787a5(0x958) + _0x2787a5(0x32a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x41b) + '\x2011px\x20!imp' + 'ortant;\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x511de8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x27f) + 'ily:\x20var(-' + _0x2787a5(_0x4bde01._0x1035af) + 'portant;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa8b) + 'dow:\x20inset' + '\x200\x201px\x203px' + '\x20rgba(0,0,' + '0,0.2)\x20!im' + 'portant;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1638fb) + '\x20\x20\x20transit' + 'ion:\x20borde' + 'r-color\x200.' + '15s;\x0a\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9ee) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x1f1d56) + '\x20\x20\x20\x20\x20\x20\x20\x20.f' + _0x2787a5(_0x4bde01._0x4cd84e) + ':focus,\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20.f' + _0x2787a5(_0x4bde01._0x1086b3) + _0x2787a5(0xa6f) + _0x2787a5(_0x4bde01._0x2379eb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20outlin' + 'e:\x20none\x20!i' + 'mportant;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20border' + '-color:\x20va' + 'r(--accent' + ')\x20!importa' + 'nt;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'x-shadow:\x20' + 'inset\x200\x201p' + 'x\x203px\x20rgba' + '(0,0,0,0.0' + _0x2787a5(0x91e) + '3px\x20var(--' + _0x2787a5(0x8fd) + 't)\x20!import' + 'ant;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20.e' + 'mpty-state' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20tex' + 't-align:\x20c' + _0x2787a5(_0x4bde01._0x2032f2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5ce993) + _0x2787a5(0xe4) + _0x2787a5(_0x4bde01._0x25afec) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2ffe97) + _0x2787a5(_0x4bde01._0x3cd594) + _0x2787a5(0x9ec) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x41b) + '\x2013px;\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2f1) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '.info-box\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20font' + '-size:\x2011p' + _0x2787a5(0x3f1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20col' + _0x2787a5(_0x4bde01._0x478fe2) + 'text-muted' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20pad' + 'ding:\x208px\x20' + '14px;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'background' + _0x2787a5(_0x4bde01._0x3bb579) + 'rface);\x0a\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20border-r' + 'adius:\x20var' + _0x2787a5(0x440) + 'sm);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1c7dbf) + _0x2787a5(0x999) + _0x2787a5(0x642) + 'dow-sm);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20margin-') + ('bottom:\x2015' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20li' + 'ne-height:' + '\x201.5;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4fe) + _0x2787a5(_0x4bde01._0x2586cc) + 'r(--surfac' + _0x2787a5(_0x4bde01._0x794f6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xae8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20.' + 'save-butto' + 'n\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ba' + _0x2787a5(_0x4bde01._0x290a96) + 'var(--acce' + _0x2787a5(_0x4bde01._0x18e6cf) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'olor:\x20#fff' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bord' + 'er:\x20none;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1c1b3a) + '\x20\x20\x20\x20paddin' + 'g:\x207px\x2016p' + _0x2787a5(_0x4bde01._0x4b6c99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fon' + 't-size:\x2011' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1ac075) + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'rder-radiu' + _0x2787a5(_0x4bde01._0x1f7f60) + _0x2787a5(_0x4bde01._0x15fe83) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20cursor:' + '\x20pointer;\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-w' + 'eight:\x20500' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x582830) + '\x20\x20\x20\x20\x20\x20font' + '-family:\x20v' + 'ar(--mono)' + _0x2787a5(_0x4bde01._0x527480) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20tran' + _0x2787a5(_0x4bde01._0x16fe97) + 'acity\x200.15' + 's;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20.save' + '-button:ho' + 'ver\x20{\x20opac' + _0x2787a5(0xb42) + '\x20}\x0a</style' + _0x2787a5(_0x4bde01._0x1e69b3) + '\x20\x20\x20\x20</head' + _0x2787a5(_0x4bde01._0x1e69b3) + '\x20\x20\x20\x20<body>' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20<di' + 'v\x20class=\x22h' + 'eader\x22\x20sty' + 'le=\x22margin' + _0x2787a5(0x6ed) + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x7d120d) + 'iv\x20style=\x22' + 'display:\x20f' + 'lex;\x20align' + '-items:\x20ce' + 'nter;\x20just' + 'ify-conten' + 't:\x20center;' + '\x20gap:\x2015px' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20<img' + _0x2787a5(0x357) + ':image/png' + ';base64,iV') + (_0x2787a5(0x69f) + 'AAANSUhEUg' + 'AAAOsAAAEu' + 'CAMAAABYhh' + 'VUAAAKOmlD' + _0x2787a5(_0x4bde01._0x4e6800) + _0x2787a5(0x230) + 'LTIuMQAASI' + 'mdU2dUU+kW' + 'Pffe9EJLiI' + _0x2787a5(_0x4bde01._0x2a1fcf) + _0x2787a5(_0x4bde01._0xfd1278) + _0x2787a5(0x110) + 'VHBEEZGmCD' + 'Io4ICjIyBj' + _0x2787a5(0xaf9) + 'KIqOPgKDYs' + 'b0XXGn2z5r' + '03b/aPb+21' + 'v3Pu/c7Z5w' + _0x2787a5(_0x4bde01._0x36d6b3) + 'BSBLLJNG+n' + 'uz4xMS2cR+' + 'QIEMBLAH4P' + 'FzJKFRftEA' + 'AIG+XHZOpL' + '83fAEC8PKa' + _0x2787a5(0x3b7) + _0x2787a5(0x118) + _0x2787a5(_0x4bde01._0x1a54b6) + 'jDB0AKACAz' + 'TyZR6OMAwJ' + _0x2787a5(0x85d) + '8QmJAKiGgq' + 'd+5lafYj5z' + _0x2787a5(_0x4bde01._0x432b87) + 'jizRJBlkDB' + 'ewBgXa5cKA' + _0x2787a5(0xb80) + 'zAPArgCAUa' + 'Y8SwSAvVbk' + 'Zgl5OQA4mk' + 'KXCflpADg7' + 'AKBJoyO5AL' + 'gZACRa6ld8' + _0x2787a5(_0x4bde01._0x13322d) + 'TFzZYskopS' + _0x2787a5(0x52a) + '7FhcMOEOZl' + 'CmUy63AeP4' + _0x2787a5(_0x4bde01._0x42889b) + 'nngRwOeaP0' + 'FN0Vt2oC/X' + _0x2787a5(_0x4bde01._0x123297) + _0x2787a5(_0x4bde01._0x124c59) + _0x2787a5(0x6c7) + '+eIay+L9pf' + _0x2787a5(_0x4bde01._0x4f740c) + 'BNX7T5lQAd' + 'awA0bn3RjH' + 'YCKBcAtF/4' + _0x2787a5(_0x4bde01._0x24e75d) + _0x2787a5(_0x4bde01._0x2c4d48) + 'jUjIt1E09A' + '/8z4C/ga/+' + 'Z6P43B/tYf' + 'sIU3jyTBlb' + _0x2787a5(_0x4bde01._0x2d3154) + _0x2787a5(0x11c) + 'n4f4Hyf+9T' + _0x2787a5(0xb39) + _0x2787a5(0x631) + 'E4lc3NFgtE' + _0x2787a5(0x309) + 'cT/2Han/B5' + 'rgGA0fABmP' + _0x2787a5(_0x4bde01._0x1bcfb9) + _0x2787a5(_0x4bde01._0x34f7f0) + 'Ph+h++hZBj' + 'QbF5cXqjn+' + _0x2787a5(0x717) + _0x2787a5(0x260) + 'ncyGg2Xy7N' + '/XynWEvAAw' + 'WUgQmaoAuG' + 'YAbW4ADO4A' + 'ae4AtBEAbR' + 'kABzgQ9pkA' + 'VSyIOlsAoK' + 'oRg2wVaogl' + _0x2787a5(0x332) + _0x2787a5(_0x4bde01._0x3bd807) + _0x2787a5(0x7c5) + _0x2787a5(_0x4bde01._0x2924cd) + 'QhInSEgWgi' + _0x2787a5(0x986) + _0x2787a5(0x583) + _0x2787a5(0x6a7) + _0x2787a5(0x7cb) + _0x2787a5(_0x4bde01._0x5ebd56)) + ('fIIeQEchYZ' + 'QG4iQ8gY8j' + 'vyFsVQGspE' + _0x2787a5(_0x4bde01._0x2f4cb5) + '5oMBqNzkFT' + _0x2787a5(0x3aa) + _0x2787a5(0x356) + 'PYGeR6+ig+' + _0x2787a5(_0x4bde01._0xead0ee) + 'MH3MGuNgXC' + 'wMS8RSMCm2' + _0x2787a5(0x9bb) + 'Xrwnqxy9gg' + _0x2787a5(0x83a) + 'g2zhrnhgvA' + 'xeD4uAW45b' + 'gNuCrcHlw7' + 'rgd3GTeEG8' + 'd9wNPx2nhL' + 'vCs+EB+PT8' + 'Xn4Qvx5fhG' + '/EH8KfxV/A' + 'j+JYFAYBFM' + 'Cc6EAEICIZ' + _0x2787a5(_0x4bde01._0x2f134b) + 'RjhOGCAMEy' + 'aIRKIm0ZLo' + 'Tgwj8ogyYi' + 'GxkriXeIx4' + _0x2787a5(0x19f) + 'RIDiQ/UiJJ' + 'TMonlZOaSU' + _0x2787a5(0x3b6) + 'CtmY7EoOIw' + 'vIi8gl5AZy' + _0x2787a5(_0x4bde01._0x2f783a) + _0x2787a5(0x165) + 'dMoqSgWllX' + _0x2787a5(_0x4bde01._0x5063ec) + 'GlBdqBFUEX' + 'UltYK6j3qG' + _0x2787a5(_0x4bde01._0x3daf32) + 'C4tCSanLaR' + _0x2787a5(0xb3e) + 'xOp5vQPemJ' + 'dBl9I72Jfp' + 'J+j/5aiaFk' + 'oxSoJFBaoV' + 'St1K50Semp' + 'MlnZWNlLea' + _0x2787a5(0x952) + _0x2787a5(0x212) + 'S4KjyV5SrV' + 'KodUrqtMqD' + _0x2787a5(_0x4bde01._0x4e0565) + _0x2787a5(0x7dc) + 'hGVDNR81UT' + 'qBWo7VI7qT' + 'bMwBiGDC6D' + _0x2787a5(0x1f9) + 'wwCUxTZiAz' + _0x2787a5(_0x4bde01._0x11c675) + _0x2787a5(_0x4bde01._0x415650) + 'vlC9Wv2I+i' + _0x2787a5(_0x4bde01._0x5d8f0a) + 'rBLWftY11t' + _0x2787a5(_0x4bde01._0x3b07bd) + 'rJ/SOuXSlF' + 'caUzU8NYQa' + 'RRptGlc13m' + 'qyNX01MzQ3' + _0x2787a5(_0x4bde01._0x37d46c) + _0x2787a5(0x3f7) + _0x2787a5(_0x4bde01._0x3216c8) + 'tU/tSiqfun' + _0x2787a5(_0x4bde01._0x8262a4) + 'WXaO/S7tOe' + _0x2787a5(_0x4bde01._0x2627f2) + 'TqnNR5osvS' + '9dRN1y3TPa' + 'o7psfQm6kn' + '0ivTO6b3iK' + '3O9mJnsivY' + 'PexxfW39AH' + '25fp1+v/6k' + 'galBjEG+QZ' + 'vBXUOKIccw' + _0x2787a5(0x3f0) + 'jPKNRoqVGL' + '0S1jsjHHOM' + '14m3Gv8SsT' + 'U5M4k7UmHS' + 'YPTTVMA00X' + 'm7aY3jGjm3' + 'mYLTCrN7ti' + 'TjDnmGeYbz' + _0x2787a5(_0x4bde01._0x379568) + _0x2787a5(_0x4bde01._0x3347ee) + '0sRZbbLQes' + _0x2787a5(_0x4bde01._0x4e5c28)) + (_0x2787a5(_0x4bde01._0x35c740) + '6xbrIRuWTY' + _0x2787a5(0x36e) + 'I9tE2822vb' + _0x2787a5(0x7e9) + '7G7bq9kH2e' + 'fbd9n/7mDh' + 'wHeodrgyjT' + _0x2787a5(_0x4bde01._0x10d768) + 'nk23nC6cvm' + 'P6DUeGY6jj' + 'Wsdux/dOzk' + '5Sp1anMWcj' + _0x2787a5(_0x4bde01._0x47182b) + 'YnnLOBc8YF' + '7+LtssLlsM' + 'sbVydXmet+' + '19/crN0y3J' + 'rdHs4wnSGc' + _0x2787a5(_0x4bde01._0x52063a) + _0x2787a5(_0x4bde01._0x5652e9) + 'eebOmYMe+h' + '48j3qP+56G' + 'ngLPRs9RL3' + 'OvdK+9Xk+9' + _0x2787a5(0xa2d) + 'Fducu4x30w' + 'H3+fIp9+Xz' + 'XfGN8q33t+' + 'Bn6pfi1+4/' + '6O/kv8jwfg' + _0x2787a5(0x18b) + 'QJ5Ac2BY4H' + 'OQctC+oJpg' + _0x2787a5(0x1ba) + 'CJGGdIWioU' + _0x2787a5(_0x4bde01._0x4677a3) + 'JZ7VEQZhgW' + _0x2787a5(0x3cb) + _0x2787a5(0xb19) + 'Ed8SDSPnJp' + 'ZG8UI2peVH' + _0x2787a5(_0x4bde01._0x47708d) + '2zFmMfKY7l' + _0x2787a5(0xa9a) + _0x2787a5(0x7b2) + _0x2787a5(0x4c7) + 'iBI6E4mJsY' + 'mNiROzfWdv' + 'nT2S5JhUmH' + _0x2787a5(_0x4bde01._0x118625) + _0x2787a5(0xac8) + 'zlebx5B5Lx' + _0x2787a5(0x34e) + 'G8et7E/MD5' + 'NfPH+Vz+Nv' + '5jgaegTDAm' + 'dBeWCkdT3F' + 'NKUx6muqdu' + _0x2787a5(0xa6c) + 'si4oqqRM/S' + _0x2787a5(0x9bd) + 'XszviYGZfZ' + 'lkXKSs46JF' + 'YTZ4h7snWz' + 'F2YPSCwlhZ' + 'LBBa4Lti4Y' + 'lwZLG3OQnD' + _0x2787a5(_0x4bde01._0x2bddc7) + 'k5vJ18iHcm' + _0x2787a5(_0x4bde01._0x2f614d) + 'O7BQdaF4Yd' + '8ii0XrF40u' + _0x2787a5(_0x4bde01._0x1a179d) + '6S7qX6S1ct' + 'HVrmtaxuOb' + 'J8/vLuFYYr' + _0x2787a5(0x4ca) + _0x2787a5(0xb00) + _0x2787a5(_0x4bde01._0x144dc1) + _0x2787a5(_0x4bde01._0x5c09a4) + 'eI3/mpZCpU' + _0x2787a5(0x77c) + '1+HWidb1r5' + _0x2787a5(0x931) + _0x2787a5(_0x4bde01._0x478cc1) + 'cb+BvOfWP/' + 'TcU3HzembO' + 'wvcSrZsYmw' + 'Sbzp2maPzX' + 'tKVUsXlw5v' + 'Cd3SXsYuKy' + _0x2787a5(_0x4bde01._0x1e8604) + '08trt1G2yb' + 'cNVoRUdFYa' + _0x2787a5(0x243) + 'W12ru6rUa7' + _0x2787a5(_0x4bde01._0x22fcd6) + _0x2787a5(_0x4bde01._0x304c6b) + 'La59u1O080') + (_0x2787a5(0x6b1) + '+S7CrtxdDx' + 'piG3q/5Xzb' + _0x2787a5(_0x4bde01._0x1ca9d7) + 'd49+CeyD09' + _0x2787a5(_0x4bde01._0x1a11a7) + 'UtaIu8ZWxv' + _0x2787a5(_0x4bde01._0x99cdb6) + 'lq3VrXxmor' + '3gf75PsefZ' + '/8/bX9wfu7' + 'D3AOtP5g/E' + 'PNQcbBonak' + _0x2787a5(0x8c8) + 'BnQufAoaBD' + '3V1uXQd/tP' + _0x2787a5(0x4a5) + '1I+UHKUcLT' + _0x2787a5(0x31a) + _0x2787a5(0x7a7) + _0x2787a5(_0x4bde01._0x12115a) + _0x2787a5(0x69e) + _0x2787a5(_0x4bde01._0x392506) + _0x2787a5(_0x4bde01._0x5981ae) + '7revbQOc65' + 'jvNO59v7HP' + 'sO/uT408F+' + 'p/72C84XOi' + '+6XOwamDFw' + _0x2787a5(_0x4bde01._0x392252) + '6fvhJ45fzV' + _0x2787a5(0x271) + 'E96frgDcGN' + 'hzczbz67lX' + 'tr8vbKO/g7' + 'RXdV7pbf07' + '5X/7P5z22D' + 'ToNHhnyG+u' + '5H3b89zB9+' + '/EvOL+9GCh' + _0x2787a5(0xda) + _0x2787a5(0x940) + _0x2787a5(_0x4bde01._0x3bc0c1) + _0x2787a5(0x1f2) + 'eap2ZPf/jN' + '87e+8fjxkW' + _0x2787a5(_0x4bde01._0x3ee9a0) + _0x2787a5(_0x4bde01._0x4db098) + '+ET9x7mfVy' + '8lXRa83Xe9' + _0x2787a5(_0x4bde01._0x1379c3) + 'Opn3jviu4r' + '35+64PwR/u' + 'fMz6+PFfA5' + 'jz/DT+dQEA' + 'AAMAUExURQ' + 'AAAP///ykc' + _0x2787a5(0x539) + 'IGBggKCgIG' + 'AgYLBAYGAh' + 'ERBv7++fb2' + '9A0MAxYUBv' + '7rVf70qfrX' + 'R/v58P7pnx' + _0x2787a5(_0x4bde01._0x1d365d) + 'AiQcBf7IMu' + _0x2787a5(0x62b) + 'gtrSuufhz/' + 'fz5+i0Lioh' + 'Ci8nFP7Ubi' + 'chEnRjNu7K' + 'curPiu/TkO' + 'nPkHhrTN7I' + _0x2787a5(_0x4bde01._0x20444f) + 'QcCx4YCz0z' + _0x2787a5(0x9df) + 'i5dO7OiNu+' + _0x2787a5(_0x4bde01._0x41ffec) + 'eicoh4Vmdb' + 'Qe/VmKqXbP' + _0x2787a5(0x184) + 'rqVyDSoeBt' + 'GXIpRqGW9Q' + 'E2RIEdWaJo' + 'dhGM2UJaF0' + 'HXpZGC4iCT' + _0x2787a5(0xb9) + _0x2787a5(0x67c) + 'rGetOybvTN' + _0x2787a5(0x541) + 'vViebDfezK' + _0x2787a5(0x732) + 'PEherKisSr' + 'e7qwm+jm4v' + 'mmD9yRD7l9' + _0x2787a5(0x47f) + 'KSIt2bJUk0' + 'DNaWJr+HIt' + _0x2787a5(_0x4bde01._0x2d8dc6) + 'MOCeK92rUu') + ('SzXtKua+7G' + _0x2787a5(_0x4bde01._0xe3af1d) + _0x2787a5(0x47a) + 'J/XPierGhu' + _0x2787a5(0x657) + _0x2787a5(_0x4bde01._0x4fd4e5) + _0x2787a5(_0x4bde01._0x15fb7e) + 'iPPRlqObjL' + _0x2787a5(0x53d) + 'DVI4DHlSEt' + 'aSItKOIsqK' + _0x2787a5(_0x4bde01._0x28d6c3) + 'uVJv2vLeig' + 'KdaSJtKSJt' + _0x2787a5(0x886) + _0x2787a5(0x233) + 'qOLvauOc2S' + 'MNmdO7eEND' + _0x2787a5(0x47e) + 'ROrCfu7Ggu' + '7KjunGi8Sm' + 'duPBi8qufu' + 'rKlK1qBioa' + _0x2787a5(0xa89) + 'AUArd2FhkQ' + 'A7FyFpNeEt' + 'GJG6ltFteN' + 'HcaDG7t6GU' + 'IrCb9+G7Z2' + 'GrJ2Gi4eB6' + '9yG9aOIuOZ' + 'J9aOJtKOJu' + '7Cfu7GiOrC' + 'hsqqes+vf6' + _0x2787a5(0x5ad) + 'CqFhCrBrDa' + 'pmDqZmDq13' + 'Mc6qesqqf9' + _0x2787a5(_0x4bde01._0x47b6d8) + 'Aq9mCqpiCs' + 'JxDaNdC7hs' + 'Dcp3D4ZOCi' + _0x2787a5(_0x4bde01._0x1645f1) + 'DK5mD6FhD3' + _0x2787a5(_0x4bde01._0x31b6a0) + 'FLVtE4ZPDq' + _0x2787a5(0x9c5) + 'B5RkKc6qfp' + _0x2787a5(0x8e8) + _0x2787a5(0x76d) + 'JKC4pODk00' + _0x2787a5(0x97a) + 'QLAoZKDioZ' + 'B0UuFmpGI1' + 'k5GmI+Hv76' + '+PPx8AwEAg' + 'YCAgcGBv7+' + '/vr6+gICAv' + '///7JXTUoA' + 'AAEAdFJOU/' + '//////////' + _0x2787a5(0xab4) + _0x2787a5(0xab4) + _0x2787a5(0xab4) + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + _0x2787a5(0xab4) + '//////////' + '//////////' + '//////////' + '//////////' + _0x2787a5(_0x4bde01._0x2643ee) + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + '//////////' + _0x2787a5(0x518) + _0x2787a5(_0x4bde01._0x1c9d9d) + _0x2787a5(_0x4bde01._0x2d9794) + 'sTAAALEwEA' + _0x2787a5(0x6c8) + _0x2787a5(_0x4bde01._0x24dc2a) + 'CXxTZfY3fp') + ('57k9ybtJTS' + _0x2787a5(0x42b) + _0x2787a5(_0x4bde01._0x331dfa) + '2VxwqziOC+' + '6jMuNsOuMy' + '4/zUcZwZZ3' + _0x2787a5(_0x4bde01._0x397185) + 'joLK1rKpoG' + _0x2787a5(_0x4bde01._0x2f269b) + 'LQ1UhaSltM' + _0x2787a5(_0x4bde01._0x2ed823) + _0x2787a5(0x59e) + _0x2787a5(0x3c9) + 'fu85z9nPeQ' + 'iF/ydXb9I3' + '/x0O/p9boX' + 'P+E42NikX/' + _0x2787a5(_0x4bde01._0x2d4707) + '9G194LGrrG' + 'Fu7VAPhDw5' + 'tsmb5vQF/+' + 'Yfh/aJ2XOu' + _0x2787a5(0x622) + 'xt2n71ee89' + '456UDK/z/p' + 'Ovzgf16ozT' + _0x2787a5(0x82b) + 'koPFP9xsmr' + '70ymDa//+w' + 'vnRr5W9alP' + '+5SYlQC+jA' + _0x2787a5(_0x4bde01._0x4e3422) + _0x2787a5(0x249) + _0x2787a5(0xa29) + 'oP33+FtM37' + 'zTeRpXlyZH' + 'GtsD2mDekY' + _0x2787a5(_0x4bde01._0x5790c9) + 'hNnwRXzavo' + 'OaNPMsH/zs' + _0x2787a5(_0x4bde01._0x900caa) + 'mdMjYIXIXJ' + 'i7Ye6oYNj5' + '+LUTms/k9y' + _0x2787a5(0x1ab) + 'bPHwOR1AIN' + _0x2787a5(_0x4bde01._0x443c98) + _0x2787a5(_0x4bde01._0x5803fb) + '//30LXn/1a' + 'pJGqciuh76' + _0x2787a5(_0x4bde01._0x3dee02) + 'f2nhTXNtFN' + _0x2787a5(0x4a7) + '1+H9z9zFn1' + '3728NWTbN2' + _0x2787a5(0x13e) + 'AWgii38glb' + '6bu+gv8bsO' + 'bF99F3+EtJ' + '5vVbeD4+3/' + 'm3rPao5QeP' + 'wRCTdmRhwb' + 'CL4X293EZf' + _0x2787a5(_0x4bde01._0x91b236) + 'Wj3gYCPES6' + _0x2787a5(0x323) + 'ep0JXr10lK' + '0jjT9Dczu/' + _0x2787a5(0x20c) + 'HOC2mfxZTR' + 'rvcMBYBaD6' + '4iaoAo0vDJ' + 'W0xae5F1N/' + 'w6Xw+hOnoG' + _0x2787a5(_0x4bde01._0x1529ca) + 'qdYOGBVJ86' + _0x2787a5(0x4dd) + 'EXauf4jFd/' + 'k18yqczf9H' + 'sf7st1CyLT' + 'XnHK7zIOTP' + _0x2787a5(0x5c9) + 'CAzELwOsiY' + '6hbfPn5sbp' + 'sS2kvf4Su6' + 'HvnjST4kMM' + _0x2787a5(0x62f) + _0x2787a5(0x8c9) + 'XQ3FCaPzXN' + 'nwrBEXy49c' + 'rZ4aofvPR/' + 'DmtejbVkm+' + '2Bz4IH+fIx' + '8/fvhXaAXD' + '9kmv3sx7mO' + '6lx/rv+W6g' + _0x2787a5(_0x4bde01._0x4490a2) + 'rb2cvHbL8Z' + '8SjYw9+uCl' + 'QxLXGekaZR') + (_0x2787a5(_0x4bde01._0x31492d) + _0x2787a5(_0x4bde01._0x4deb46) + 'ev+D9lD0/Y' + '0/K+/NisTx' + _0x2787a5(_0x4bde01._0x36cfa6) + 'b3t74gf+ck' + 'QKfl+uPxPg' + 'pfy8+e8WN/' + _0x2787a5(0x1ec) + _0x2787a5(_0x4bde01._0x21c75d) + 'PizU1mUCMA' + 'XaOsiDE1lf' + '0wDSAVIJcz' + 'iUpNdMXlc6' + _0x2787a5(0xa64) + 'uyYng+6+jR' + 'Czn9Ey1+Fj' + 'FMUnuQ5fjG' + 'HPdVRDZkF1' + '+d6tu8fHuJ' + '9eubehwuEd' + '+JjYyltK/m' + '4y+Jcta6QD' + '8eFKa6Gpwb' + 'wQIzBolltr' + _0x2787a5(_0x4bde01._0x5c1945) + 'tYAyPu/Fv4' + 'Avvu26QqJC' + 'GDmKBrmYEY' + 'V27iUVk1AG' + _0x2787a5(0x1e3) + _0x2787a5(_0x4bde01._0x43eb64) + 'd546y/JbYq' + 'AHSMgo7cSC' + 'TxrAsZGZFq' + '9jR/UlK4tW' + 'LmD+e/eMIm' + '+C/zcC/91P' + '/yL6WOzL+O' + '25uZ6UdWzQ' + 'QzZEJmLoAv' + '8abyTPBDbm' + '4m5EI1QDlY' + '+Pl/VTrihb' + 'dXSH8k97K3' + 'xCpvrnw6fg' + 'xnjvJHulAG' + 'p0FaPx/bIQ' + 'S9GuQ0fHzv' + _0x2787a5(_0x4bde01._0x3153fa) + 'XW9ty60YUN' + 'kA/gwOc+Hz' + 'jAATn51bng' + _0x2787a5(0x914) + _0x2787a5(_0x4bde01._0x99979b) + '3n3nDt19uK' + _0x2787a5(0x894) + 'h3ScM/DJHb' + 'khFEeJZ4yq' + 'fQ/TQlwsqT' + 'Q6fekl45r/' + _0x2787a5(_0x4bde01._0x159c71) + _0x2787a5(0x992) + '4MhQgOx2iC' + '9r1tf7HI4s' + _0x2787a5(0x743) + '7fwIocnOvP' + 'bMcnuRDdtj' + 'tpyZNd+YHL' + 'blim3XOZ7X' + 'jOi6T5EWwX' + 'Q9wFGtiPxI' + 'HHV1KDqUdf' + _0x2787a5(0xaa8) + '9LPPxSbOxP' + _0x2787a5(_0x4bde01._0x4b4a15) + _0x2787a5(_0x4bde01._0x4f210b) + 'zezpUXZUvc' + '0V5OeLL67P' + _0x2787a5(0x13f) + _0x2787a5(_0x4bde01._0x38f11d) + '3M0ZueAPZL' + '2rvDx10leT' + _0x2787a5(0x7e7) + 'xgRwf71hUx' + _0x2787a5(0x434) + 'QNBbsG0KWB' + _0x2787a5(0x639) + '4Wiv936HoE' + _0x2787a5(_0x4bde01._0x27f54f) + 'f66JZl+wgA' + 'UJj792YTFy' + 'PxaPeVW2m2' + 'qeaQY2Fzrj' + '/X0WhIqz6F' + _0x2787a5(_0x4bde01._0x5c4456) + '6znt75wUW/' + '/UQSBn96R2' + 'rXqH7RZEim' + _0x2787a5(_0x4bde01._0x1b49a5)) + (_0x2787a5(0x688) + 'TVs06b+OtW' + 'fIiOcucVud' + 'm28hayx70S' + _0x2787a5(_0x4bde01._0x2a1316) + _0x2787a5(_0x4bde01._0x4746d4) + _0x2787a5(_0x4bde01._0x4a7dd8) + _0x2787a5(0x327) + '7Mdsg11A/b' + 'vriTc/0Z+9' + _0x2787a5(_0x4bde01._0x1d489b) + 'NsgT8Qo7Rk' + 'Hf10haCLEZ' + 'xgSkItTUIA' + '+aHSCt2R7k' + 'hwybdPSaV8' + '0H0/7LWP8z' + 't6Pw55/QJo' + 'cDbnsJcp1e' + _0x2787a5(0x7c7) + _0x2787a5(_0x4bde01._0x4d71ae) + _0x2787a5(0x225) + _0x2787a5(_0x4bde01._0x6011b0) + 'GN2DWzcTtT' + _0x2787a5(_0x4bde01._0x32df53) + 'X3l32YPxqH' + 'XgL1gjwFg5' + _0x2787a5(_0x4bde01._0x3f4247) + 'AH+dSu1KA9' + _0x2787a5(0xe0) + 'FddBIj6mxi' + _0x2787a5(_0x4bde01._0x59b366) + 'FuW7g2UE6h' + _0x2787a5(0x5a1) + 'jKfP7Mtva9' + 'wx/8oH7hhr' + 'lr0lrU8jGB' + '8ioo80HMHA' + 'OUTf26N9ef' + 'sW23dLTmB5' + 'UHvoweI2o6' + 'qF1HwYTQup' + 'hBjMKYkRf3' + 'LA92lQgTTF' + 'ctuPJ4u+Is' + _0x2787a5(0x3a1) + '1/vbPV4Qcw' + 'LHzDAC6rzm' + _0x2787a5(0x8d5) + 'me1ZG3xjc9' + _0x2787a5(_0x4bde01._0x4d6634) + 'MSsAfTyceD' + 'uTy0jaWy47' + '5+I/vLXM+9' + 'ylhjDWAeon' + 'AUTBFKZ9MQ' + _0x2787a5(_0x4bde01._0x2eb849) + 'qnAkzqdCV9' + _0x2787a5(0x1b0) + '/+q4SNTZw7' + 'ri5s8LCzv4' + _0x2787a5(_0x4bde01._0x96e35f) + _0x2787a5(_0x4bde01._0x238c78) + _0x2787a5(0x4eb) + 'qy8OXPOu6q' + _0x2787a5(0x2e3) + _0x2787a5(_0x4bde01._0x27a97e) + '8jsVSfdNmE' + 'h3FHPRhqmg' + 'd9q57uVwpQ' + 'rEnNZsN0SU' + _0x2787a5(0x3ff) + 'fGQ+oRLVkP' + 'VJwHW46l7F' + 'mLmTp/P+H8' + 'zf47JwWgE6' + _0x2787a5(_0x4bde01._0x19d669) + _0x2787a5(_0x4bde01._0x49c44c) + _0x2787a5(_0x4bde01._0x230a3c) + 'jtjLm7ePMR' + '2dvq8lfd6j' + 'dL4vt9OfnN' + _0x2787a5(_0x4bde01._0x3608b7) + 'VTdAJ/7G+f' + 'PIjpUvHG39' + 'uzCFpidzNg' + 'dPuSQSN4/l' + '53oXxbtjyV' + '2KCMq5XcOC' + 'pKs3YrfZgt' + 'HUjM5cKx2t' + '0ZSRK5yj6x' + '7+b+jXCbVV' + 'S2+W7+ATFp' + 'rfsEozMwHa' + _0x2787a5(_0x4bde01._0x17454c) + '26dmTjmDkX' + 'ch3cn6atNX' + _0x2787a5(0x50a) + _0x2787a5(_0x4bde01._0x43612a)) + ('Ad/NVoTAJA' + 'O+ytmr+s6e' + _0x2787a5(0xb7e) + _0x2787a5(_0x4bde01._0x5cd969) + _0x2787a5(_0x4bde01._0x1771ee) + '95MIpGoQTP' + 'UPDeLb0Wjm' + 'U4PNWijU1f' + 'yVqXfxL7Y4' + 'unL+CzwcGL' + 'JhrtT7V2+/' + _0x2787a5(_0x4bde01._0x2970cc) + _0x2787a5(0x36d) + 'y/e+WHjb4w' + 's32LjDh281' + 'OB3lMNvZ/W' + _0x2787a5(_0x4bde01._0x3ac10a) + 'XhHopWYNQm' + 'kAIbSAifbq' + _0x2787a5(0x235) + _0x2787a5(0x320) + _0x2787a5(0x9da) + 'VQ9lfMWk3P' + 'OtYeiz/35g' + '9uD6AJX5V4' + _0x2787a5(0x425) + 'QA/n75A+W4' + 'SyHrBQfpvg' + _0x2787a5(_0x4bde01._0x3b6496) + 'yn78XfYQv+' + _0x2787a5(0x672) + '21GzFhoRp5' + '1pIRgmKoff' + 'e+DmH3GmoC' + _0x2787a5(_0x4bde01._0x158829) + 'hyDwqfUZ9r' + 'RQEFKIxVr6' + _0x2787a5(_0x4bde01._0x21c236) + _0x2787a5(0xa05) + 'A2AvunB4mc' + 'iTPsbBZZCJ' + 'WhPZE6C9DM' + 'CRC5C5Nxfd' + _0x2787a5(_0x4bde01._0x24f064) + 'ssI/MWvJSV' + '2y/B2tF+BM' + _0x2787a5(0x1ff) + 'BX8buftKS4' + 'xP+yqEUNNI' + 'B0m/5IN/7N' + 'c77XHgCdh5' + '5OG8rnqwp0' + 'IxpPmDdug2' + _0x2787a5(0x6cd) + 'nrKEkulu8I' + _0x2787a5(_0x4bde01._0x3415a0) + 'fXm5vb8kZn' + 'ZcYy0W2rBj' + 'MzfzPRKMJV' + '7c/NbDf7o+' + '257eCtvmVJ' + 'Y68VplcVbF' + 'gfRTlcxhC3' + 'A2TmMicJXr' + 'w9f9/UHSN3' + 'jyA6nwZpoR' + 'FpoVAakBF5' + _0x2787a5(_0x4bde01._0x19c5c3) + '+VDwZTwa4F' + 'IXUWQDDYBR' + 'hR5QFobIgP' + 'zju7PBzire' + 'cFym97rs0H' + '4Oi+yumnAH' + 'mPQVoTaDws' + 'C3PtmWZHdW' + _0x2787a5(_0x4bde01._0xd1fcf5) + 'MYxM+A2TOB' + 'ecz/qc3DR9' + '27xnbm/DME' + _0x2787a5(_0x4bde01._0x151cec) + _0x2787a5(0x55c) + '+aWQshXUPo' + _0x2787a5(_0x4bde01._0x3cfcba) + 'czBs5rRgZG' + _0x2787a5(0x951) + '1Ln1m+/94X' + 'zipd+ankUq' + '3qITl/XF4+' + 'Fd6Lvl7z+u' + 'uKIFyQn19Q' + _0x2787a5(0x736) + 'RqAF8ZQFmu' + 'A/wFuQ5zDK' + 'mMqrY91+Gv' + 'uutt76zPPp' + _0x2787a5(_0x4bde01._0x40419f) + _0x2787a5(_0x4bde01._0xd43c1a) + _0x2787a5(_0x4bde01._0x4c6e76) + 'xXpo9/28zg') + ('OkpYVGo4zi' + 'kitj9bSnCy' + 'DI8832YNAO' + 'vF3rEnDTBu' + '28HbrhXtoR' + 'OKt0jfBwYe' + 'PY7uTDf7iE' + _0x2787a5(_0x4bde01._0x1d6d28) + 'CsABHn441r' + '0rP8e/jyMe' + 'yvllWzCBOz' + _0x2787a5(_0x4bde01._0x39633c) + 'b4punbuKZb' + _0x2787a5(0x966) + _0x2787a5(0xa5c) + 'M/RLfwvcoT' + 'SUxiiS9chk' + _0x2787a5(_0x4bde01._0x3abfc6) + 'YEnxsK8rn+' + _0x2787a5(_0x4bde01._0x5ec7fe) + _0x2787a5(_0x4bde01._0x8875de) + 'q1aNITd/VL' + '91x1wK9jFp' + 'i3/66rStr3' + '4vf+wGdL6e' + 'H/bQzo3rek' + 'cV1L+0TgfI' + _0x2787a5(0x1e9) + _0x2787a5(_0x4bde01._0x57e39f) + _0x2787a5(_0x4bde01._0x3c1a64) + 'JLGgEw+/25' + 'EIPcXMDwDe' + 'Tme6syry4O' + _0x2787a5(0x32c) + 'F8HOKSz9Gm' + '8D32QJfdrg' + _0x2787a5(_0x4bde01._0x3975f0) + 'zechTwvm5h' + '3h7DxgzPLs' + '0fU/zzgWXB' + 'yxvv9Khs+i' + 'FuiQsymar+' + _0x2787a5(_0x4bde01._0x1b0ca5) + 'PUnBcFW5jY' + '4bwXUe5G/X' + 'LOj6QC44qv' + _0x2787a5(0x475) + _0x2787a5(_0x4bde01._0x55673d) + _0x2787a5(_0x4bde01._0x512c6e) + 'z42RwuxNq7' + 'f9YMWShwkJ' + 'pTHpg4SdRH' + 'f2kl7N3qWx' + '7co0D9iDwG' + 'u4Y7nkZXub' + 'hp5FrBetnb' + 'FyVMqybXSW' + _0x2787a5(_0x4bde01._0x454c89) + _0x2787a5(_0x4bde01._0x33247d) + 'M20l0/xPjn' + 'pDXwxjz9HN' + _0x2787a5(_0x4bde01._0x50bfe3) + '3ETw2Vm+uo' + 'Lvvp3ZUX6d' + _0x2787a5(_0x4bde01._0x467376) + _0x2787a5(_0x4bde01._0x32a9d5) + _0x2787a5(0x7d6) + 'zYcAYEQcQj' + 'AMHlwV+pgj' + 'YBWCdrUHzS' + _0x2787a5(_0x4bde01._0x583b9e) + 'qvJ86T+qPY' + _0x2787a5(0x676) + 'm/IdnD6xhg' + 'iKiC+yr4qo' + 'iCDt4uJg69' + '0c+/Lh697Q' + 'F9vvwCTALQ' + 'FEkPDPE44N' + _0x2787a5(_0x4bde01._0x228d24) + _0x2787a5(0x5aa) + 'vczA5lZe7d' + 'xHTc5fNV72' + '+Wc2M4kbGx' + 'b0V5+gO1S9' + 'm9EVHXfmsw' + _0x2787a5(0x5eb) + 'C7fuDXefJa' + _0x2787a5(_0x4bde01._0x147180) + 'Do4QEiECgC' + 'wBNBYgVkVU' + _0x2787a5(_0x4bde01._0x33e6f9) + 'U7oNnc0u7v' + _0x2787a5(_0x4bde01._0x4f28bc) + _0x2787a5(0x44e) + 'RccZDZmuyX' + _0x2787a5(_0x4bde01._0x3ff20c) + '9aPb2xhfMx' + '42hJMjC9po' + 'zhewDHZy1F') + (_0x2787a5(_0x4bde01._0xe30c34) + 'Zw4mC0FK7G' + _0x2787a5(0x255) + 'UAJ8any4FF' + 'p+1dnBuujj' + 'OLmg3KSbVC' + '9IANCYjbSU' + 'HeDDZ4rYmA' + _0x2787a5(_0x4bde01._0x19146a) + _0x2787a5(_0x4bde01._0x3538ed) + 'f0iq4Fjg/4' + 'W2nC9zMcXC' + 'SrA6rRRL6r' + 'epq+1Xv7WK' + _0x2787a5(0x276) + _0x2787a5(0x7e1) + _0x2787a5(_0x4bde01._0x185e77) + _0x2787a5(_0x4bde01._0x443191) + 'QLJCxEPjUI' + _0x2787a5(_0x4bde01._0x3f0680) + _0x2787a5(_0x4bde01._0x3edf71) + 'xo/j112/kO' + 'NNiiBJCjRC' + 'TiuAAg6fiF' + 'CBQIEoggLQ' + _0x2787a5(0xb77) + 'YCywVVlw7p' + _0x2787a5(0x8b6) + _0x2787a5(0xac4) + '1WVMw/gAqs' + 'x/Whf6AKaN' + _0x2787a5(0x9d2) + '9c/AYYL2/a' + 'Qy50jNz86h' + 'AIDQ+FAOKg' + '7YzCCj4WxO' + 'hpDKHa0aUF' + 'DFPgS3FoMI' + 'KP35WuKxYP' + 'nTkLdMHg2c' + 'Fr8HPk6sQq' + _0x2787a5(0x87a) + _0x2787a5(0x836) + 'WRYG0QgP4x' + _0x2787a5(_0x4bde01._0x32d19b) + '6fCxKToLNW' + _0x2787a5(0xb0a) + 'AAWZBIUxk0' + '9pEEoLpVHx' + 'sjfk5BGH7J' + 'DWjKwbKGah' + _0x2787a5(_0x4bde01._0x509e81) + '34x5FbzgJd' + '/3Np6gW5nO' + '5VC0BUZGUA' + _0x2787a5(0x756) + 'DK+KARlIaG' + _0x2787a5(_0x4bde01._0x11c437) + 'r1fyiP6n7B' + 'm1Hmh0yW8y' + 'hj9hGi3XjX' + 'suZP9OlB02' + _0x2787a5(0x55b) + '/tystvkEfQ' + _0x2787a5(_0x4bde01._0x5075c2) + _0x2787a5(_0x4bde01._0x210dd7) + 'I/m3T5WIWH' + 'oJ8FJoq7gl' + '1aF9Tbg2ng' + 't8Ny083fg+' + _0x2787a5(0x146) + _0x2787a5(0x3f4) + 'AF3A4xgQ3A' + '50DJVADAOB' + 'n/d6gqQIGC' + 'wCOxfVzOgu' + '8tnDy0am+s' + 'qP2FLPRpkF' + 'erIddc5kdm' + _0x2787a5(0xb2d) + 'Ui+qOfzMnF' + '++AHsDS1GT' + 'ZXteO+DyNP' + 'T7oZNNyvIe' + 'ChMAoPQCqG' + '1Nh/baCBph' + 'YHYTOFI9x+' + _0x2787a5(_0x4bde01._0x5779e1) + 'N3WtMPr1qy' + _0x2787a5(_0x4bde01._0x5c7f00) + _0x2787a5(0x9d9) + 'KjRqUiO+rI' + _0x2787a5(0x147) + '1hyKb1GB55' + 'qbP+VfvbJY' + 'bMqfZTHiUC' + 'zIlAihQtlP' + _0x2787a5(0x1b6) + _0x2787a5(0x89e) + '+xAqLa/O96') + ('/76Adv3X8T' + _0x2787a5(0x744) + 'OwVT1iP0Kt' + 'Pah6UMMGMs' + _0x2787a5(0x488) + _0x2787a5(_0x4bde01._0x52964f) + '9YVmiD8B7y' + '5fjbo5yxO1' + 'WvQ2wsUEBE' + 'eKhZixoApF' + 'oUw4YCAkVM' + '7Fx8PqGO85' + _0x2787a5(_0x4bde01._0x50a7c7) + 'eKdmAUd1rs' + _0x2787a5(_0x4bde01._0x265280) + 'jBw6bctB5U' + '/M88/TnfvK' + 'oLoM2jOry2' + 'yrj/523t7G' + _0x2787a5(0xa86) + '3hht4eBoPP' + 'bUZ7Apjx1J' + _0x2787a5(0x407) + 'OdYj1nl7h3' + '8oKmApCren' + 'X+fgEILClE' + 'xjAchFelED' + _0x2787a5(0x394) + 'FHiK0F0Fgg' + 'cQ0KKW0AUH' + 'naGn++21Y6' + 'tIE3ABmZ6F' + 'wAjCfnOp/t' + 'HoZg5wNkWf' + 'bNbyqvLgOo' + _0x2787a5(_0x4bde01._0x168934) + 'O/SghBSzFN' + 'j0yy/CO7Jx' + 'XRtWUYqieQ' + 'haksbejwCV' + 'sWtHx7rNHI' + _0x2787a5(0xee) + 's8z113YVkM' + _0x2787a5(0x774) + 'AAObcxm31D' + 'lSNCI2SLIK' + 'HMQl4HlQKh' + 'pLTO9k7Ovz' + 'pSfr724J1j' + 'WaCq3/lx+A' + 'Ccz5rotC1j' + '195qdvqcWd' + 'UovKoZbaHN' + _0x2787a5(_0x4bde01._0x45d67b) + 'YtNDoSGkZu' + _0x2787a5(_0x4bde01._0x43bbd8) + 'cDxejwoNEY' + _0x2787a5(_0x4bde01._0x39c43e) + 'xr2RQm+bYV' + _0x2787a5(0x3cd) + 'hdr33oM7td' + _0x2787a5(_0x4bde01._0x12a03d) + 'oQfSiHCkSf' + 'yugqigAF2a' + 'IhnhXRCwpQ' + 'Igo+ocalLF' + _0x2787a5(_0x4bde01._0x5b628a) + _0x2787a5(_0x4bde01._0xa6c770) + 'MsGe2v9vvB' + _0x2787a5(0x507) + 'OaS5xZCDGx' + _0x2787a5(0x844) + 'OmEB3SEKqe' + 'sRueBOjqCg' + 'ZRFM9i6bvG' + 'IHTZwRIur4' + 'RvjTWpfNwK' + 'EhFxRypAr3' + '307jcq99VV' + 'CooKIMooNA' + 'UFaekDRZaE' + 'PtGsSKCqIi' + 'O+hEJapApI' + 'irArNrFBuH' + '6atf3Dm7tf' + 'YPElfztGVZ' + 'ny8furfh+9' + _0x2787a5(0x9e4) + 'uQpBiuYGSt' + 'TqrSF7iejf' + 'xaC0EojQB/' + _0x2787a5(0xa24) + '201DxoDqba' + 'IVgcwH27HF' + 'KLvzXWo2/v' + '/Q+JiCAiay' + 'JYd0XvGG4J' + 'iIIks2SqIo' + 'uoZiRFdCig' + 'gCgqigRipS') + ('gIDLd5r0AF' + _0x2787a5(_0x4bde01._0x1998d7) + 'zCxNwbpp/b' + '/VuL9KJeno' + 'Ewkb5mjMcB' + 'bMxrKv8EdI' + 'evlalfqK6u' + 'RtBlK4mTS7' + 'qk8p2wnUfF' + 'Q4dMluKv8i' + 'O0NB6CITvY' + 'u4K8XS3GzM' + '5+kzr46r/Z' + 'fiUjRnyGDI' + 'vsyEQsuXKd' + 'cGFZTADZwU' + 'Sw8bIhjhR0' + 'BoyliKCaKC' + 'Vtiuni1Xq8' + _0x2787a5(0x2fb) + 'PFDtLc/lF7' + _0x2787a5(_0x4bde01._0x4fe01e) + _0x2787a5(0x577) + 'p3y08gXtsp' + 'Vl1WWQtBIp' + _0x2787a5(_0x4bde01._0x14ce15) + '47+h9uaoQn' + _0x2787a5(_0x4bde01._0x2e3f0c) + _0x2787a5(0xf0) + 'PzOIYXjocP' + 'EIy7el66Ku' + '0k+3VPxLBy' + 'tuRCQUfWN4' + _0x2787a5(0x904) + 'NEF4CIhFdA' + 'TEBVFCBazN' + 'zUsm59dHHj' + 'TTPf7ZDXr2' + _0x2787a5(0x633) + 'i4/lzpw86u' + '0tvQc20aym' + 'QbUUfsgqd0' + 'DZJzOvBP7d' + 'MmTglUw8FZ' + 'DM6pXxrZHQ' + _0x2787a5(0xbf) + 'l5mk99hdgh' + _0x2787a5(_0x4bde01._0x4cb76f) + _0x2787a5(0x794) + '8G2xrvzeKO' + _0x2787a5(_0x4bde01._0x5b276c) + '0CJ1rY/m11' + 'bFcI+KkGPR' + _0x2787a5(0x38d) + 'Z+WWkExUfi' + '5uZNaz79p2' + _0x2787a5(0x343) + _0x2787a5(0x170) + '/bfLVTAaA6' + 'v+BCSP/cnm' + _0x2787a5(0x8b4) + 'F5bjKGvxgR' + 'Pe3jptBeGR' + 'gcvKyqoXV+' + 'HPysqrFyxQ' + _0x2787a5(0xe6) + _0x2787a5(0xb4f) + 'vSuND0Kw2G' + _0x2787a5(0x1c1) + '3f30a9+Wh8' + '/bemdl+7Qp' + 'Lynv3VX4Pm' + _0x2787a5(0x93c) + _0x2787a5(_0x4bde01._0xb7a020) + _0x2787a5(0x6e4) + 'dkFszBF0rb' + 'VJfHPUGxXp' + _0x2787a5(0x459) + 'U3bJnZNEqd' + 'Vxa37Gben6' + _0x2787a5(0xb5a) + 'XGvxZrHkY8' + 'G+/1zBfFaf' + _0x2787a5(_0x4bde01._0x489a0e) + 'ZMJpkYaQFg' + '05yrtky+9y' + 'aW96BwQfbn' + '37/bghG2oL' + _0x2787a5(0x45f) + 'YcJBNCW/Fd' + _0x2787a5(0x7f3) + _0x2787a5(0x686) + 'Xbl2C96oZH' + _0x2787a5(0x4e8) + '1S0kiY+YBK' + 'FXAPqyaib5' + _0x2787a5(0x460) + '+GJ5NKGIFc' + 'uSmsLdhxdl' + 'OWhcUKmo8r') + (_0x2787a5(_0x4bde01._0x21cf63) + _0x2787a5(0x2d8) + 'qAOmOFTaSg' + _0x2787a5(0x468) + _0x2787a5(0x250) + _0x2787a5(_0x4bde01._0x190a32) + 'e+VgwYfOK/' + 'eO+Jq96qoR' + 'hRxMIuMBI6' + _0x2787a5(_0x4bde01._0x1f7f07) + _0x2787a5(0xb1b) + 'FgccbfFtff' + 'XO0hXMLLJq' + 'zu4L5usU3H' + _0x2787a5(0x2f5) + 'yQ7Eqoiqa9' + _0x2787a5(_0x4bde01._0x5e22e5) + _0x2787a5(_0x4bde01._0x39bee6) + 'ryd+T6msKV' + 'o2bOmlQrgE' + 'LAQtd/2m6b' + 'es8+B0ATvq' + 'G1HJgJXNbm' + _0x2787a5(0x8b9) + 'Mw2jK9UwYb' + '5/7uxluQsC' + _0x2787a5(0x35b) + 'OcSExSJoIq' + 'Y1Q14H33rj' + 'QfO33K/tb7' + 'Q7sywxnsRy' + 'c6fCc7BIIa' + _0x2787a5(_0x4bde01._0x572785) + _0x2787a5(_0x4bde01._0x11db0f) + 'KIkgISIx8Z' + 'b65c/5dP/2' + 'm1zff6V/BW' + _0x2787a5(0x2d9) + 'pij2Nsytro' + _0x2787a5(0xe8) + 'fdhvC2neCD' + 'pnKgtCwrKw' + 'tQIrVn3bZo' + 'G/ieN7WhX4' + 'gvVTFt69zU' + 'srik5WicZe' + '0Oz41cejSo' + 'd2qQGjOZIN' + _0x2787a5(_0x4bde01._0xbe3f59) + 'jFZ/K6xb5z' + '7rKFFERaHk' + 'srIX7/rXoS' + 'sijFWTIl8Q' + _0x2787a5(0x3e2) + _0x2787a5(_0x4bde01._0x4dfd21) + _0x2787a5(_0x4bde01._0x9c0f7c) + _0x2787a5(0x3e9) + '/SjMvD8ad8' + 'ki+Gg85nhx' + _0x2787a5(_0x4bde01._0x12ae57) + _0x2787a5(0x832) + '4W9Zd62ZEY' + _0x2787a5(_0x4bde01._0xb432b4) + 'w2Kf/kL+nS' + 'tWUB6jMSNu' + 'qfRdc817Kc' + _0x2787a5(_0x4bde01._0x1b7887) + _0x2787a5(_0x4bde01._0x408905) + 'h5/UY83GtO' + 'nT6PY3a8Kk' + _0x2787a5(0x54c) + 'NapYbf0rF5' + 'bUmMZruwMZ' + _0x2787a5(_0x4bde01._0x1b5c2b) + 'qufS3mTUnc' + 'uKTXrQnOPW' + 'ERuGdV4ZY5' + 'C2kMXLWiwp' + 'Hmgx8dHncN' + 'yWNOTTUALW' + 'fsWsXDiou2' + 'ls1dX15dkA' + _0x2787a5(_0x4bde01._0x15df00) + '/9M7svQVin' + 'Fxaqq9wQUf' + '71TiPfYgb+' + _0x2787a5(0x3eb) + 'oOv5q1JyiW' + 'HlC1AZK7vK' + '9i+4CkSFRu' + _0x2787a5(_0x4bde01._0x291e75) + 'PsPy7kazu1' + 'FUTDvl9e1V' + 'S4dw7v+sEI' + _0x2787a5(0x8d9) + _0x2787a5(_0x4bde01._0x3ace73) + 'b5VDJJz59z' + 'TWrt83l8fl' + _0x2787a5(_0x4bde01._0x364bae) + 'hk6yYeuUFW') + ('3zoKwRgJRV' + 'V5dDGWTR89' + 'v/sr1H52E0' + 'wJHfFa67zl' + '4kmoZj0qor' + 'CLydXw62yd' + '+SrtH0X5hR' + 't6CmUUSIkp' + 'YVz99VWgmg' + 'uEIrdu1zaK' + 'W7SmpjDzzd' + _0x2787a5(_0x4bde01._0x52277d) + 'dFSk9N074/' + 'Hxn39M3X5u' + _0x2787a5(_0x4bde01._0x347105) + '6GNdwwsX5D' + 'aVt2dWDaQn' + '2nzr9Bmf39' + 'ZIGMGZSC6r' + 'AvPqbecaxp' + 'O9Z4oLbtLv' + 'De5Qj2KQGL' + 'RAFg3eeGCw' + '1fQN6JpH4h' + 'v5BtXQJ6Ii' + _0x2787a5(0x8c3) + _0x2787a5(0x1f1) + _0x2787a5(_0x4bde01._0x137ab6) + '1/04Zo5ZYX' + 'Uksf27PCek' + 'qaJhYVvMtg' + _0x2787a5(_0x4bde01._0x1ca6b8) + _0x2787a5(_0x4bde01._0x369a0f) + '9Y+FRiBVUF' + _0x2787a5(0x37f) + 'dzvgvOdN+b' + _0x2787a5(_0x4bde01._0x3c1787) + 'hY4sthAIDQ' + _0x2787a5(_0x4bde01._0x1e2232) + 'd00Sh8RH5K' + 'Zq9ozkrJv5' + _0x2787a5(0x6fb) + _0x2787a5(_0x4bde01._0x5d7f83) + 'WSwpdri7Dj' + 'k1K8DBHwHs' + _0x2787a5(0xa81) + '2/cvnWsaGU' + _0x2787a5(_0x4bde01._0x2fe2d6) + 'QsX2rbXU1U' + _0x2787a5(_0x4bde01._0x418916) + 'Ipoy7+qZdv' + 'K4MCFE9Aqp' + _0x2787a5(_0x4bde01._0xaa3018) + _0x2787a5(0x5a0) + 'JtnNuzTXpO' + 'w+qJt1ovfQ' + 'SGVqycXvRX' + 'iHiDdrDr4a' + 'NNe74l1q3W' + 'uWQx2rki05' + 'KNUNtAF01T' + '0i+OkI1jd/' + _0x2787a5(_0x4bde01._0x5239db) + 'wZixtruWek' + _0x2787a5(_0x4bde01._0x1aa152) + 'rsrCt3fKLg' + 'AnyJQKtRMW' + 'Thlavm4331' + 'adWQ1QBQVl' + _0x2787a5(_0x4bde01._0x2e61e7) + 'cTqELZDPil' + 'rLqcLLJZPy' + _0x2787a5(0x108) + '7876ZyB9KM' + 'cDD/82pU77' + 'dj1meXLqBY' + 'samD2ELo2E' + 'hiA/Xr/bCy' + '5p5zRvRc12' + 'N2+Kz/r86T' + _0x2787a5(_0x4bde01._0x51e346) + 'AlCgEbAsXw' + 'lwzhcAzLJg' + 'b6H0feeRnF' + '0xn8SsSrHW' + 'pZHM9ulmmo' + '9bEgiav1BV' + _0x2787a5(0x203) + 'LIKZRVL15Z' + _0x2787a5(0x530) + 'LeIVSItFlg' + '1R8Bhg4/eN' + 'n3ozu6oxqf' + '/uftDVd9O7' + 'rOBvWyCT5t' + 'AoZARRBrCf' + _0x2787a5(0x6be) + 'kHp1Xj13jb' + _0x2787a5(0x77f) + 'fW5IJFSzLA') + ('iDQBXtzYor' + _0x2787a5(0x6bb) + _0x2787a5(0x555) + 'iEFcwl/05W' + 'eNpgpwKujy' + 'C7WmhdecW/' + 'MmIflAystZ' + 'OQGLLs6+Ww' + _0x2787a5(_0x4bde01._0x4cc312) + '4l5anZnp5M' + _0x2787a5(_0x4bde01._0x2b3821) + _0x2787a5(0x824) + _0x2787a5(0xeb) + '/hAU3g/fDu' + 'sq+B9lR3yD' + _0x2787a5(_0x4bde01._0x59f9bd) + 'GDm3573rI5' + 'Sc3FLXT1WL' + 'e2mdlG1Kjw' + 'ZZEIRQRCQK' + _0x2787a5(_0x4bde01._0x584025) + 'Pa87XFtbW7' + 's//Gyh78Fx' + 'yzQD7e/Hbv' + 'LpdQr4REFU' + _0x2787a5(0x381) + '8qr6+trLq9' + 'mlZVQVk5vF' + _0x2787a5(0x9ed) + 'NPvFaiCZ70' + 'J5WRU0AQ9W' + 'P+mg9N2PE9' + '7bH52Xr7/m' + _0x2787a5(_0x4bde01._0x27f7c1) + _0x2787a5(0x24d) + _0x2787a5(_0x4bde01._0x1437cb) + _0x2787a5(_0x4bde01._0x3373c3) + 'QbtsftGSej' + 'Blxxs4c3Cd' + _0x2787a5(_0x4bde01._0x471801) + _0x2787a5(0xb54) + 'wqrJUy5wu9' + _0x2787a5(_0x4bde01._0x100918) + _0x2787a5(0x6e7) + 'aLejnA2EaR' + _0x2787a5(0x49b) + 'nhn4fzvVU0' + 's6y8HLVs9a' + '3l5eubN2y9' + 'qKolC5VOOe' + 'a5qgub7rxs' + 'y6pee3fPB/' + _0x2787a5(0x983) + _0x2787a5(_0x4bde01._0x5d5c3a) + 'vW1IZN8xat' + _0x2787a5(_0x4bde01._0x9b7d96) + _0x2787a5(_0x4bde01._0x3776b0) + 'MTLsghr8Vl' + _0x2787a5(0x9be) + '0Wup4eyxTw' + _0x2787a5(0x96a) + 'O6/elqNr+X' + '1/rZnfx+38' + 'ypROvDwFsq' + _0x2787a5(_0x4bde01._0x266fb8) + 'VVRKiqh6L6' + 'a3PLd46qLZ' + '66EcA+Coaa' + _0x2787a5(_0x4bde01._0x6f1042) + _0x2787a5(_0x4bde01._0x555258) + _0x2787a5(_0x4bde01._0x1251a0) + 'UohM6h5cZj' + 'nxAVh2/Yld' + 'omeIlTdPM6' + _0x2787a5(_0x4bde01._0xd9cbc) + _0x2787a5(0x3fb) + 'ctoW3ZFMxN' + 'B99MO8Qiqg' + 'ZQ5frePeNW' + 'Wscs2zTPTP' + _0x2787a5(0x3ac) + 'auKo5m/z9A' + '7RJ68AoIs+' + 'f3dXHFzo9c' + 'qKq863OPr0' + _0x2787a5(0x9a9) + 'oIRcvYMCuq' + 'yzatn462Ii' + 'lL+Dywed1H' + 'mRc9Sh9+51' + 'iP5uTrDHlY' + '2elYt4AUJ6' + _0x2787a5(_0x4bde01._0x4ec505) + _0x2787a5(0x2b4) + 'I4qSCSAvdS' + 'VCkoja76eF' + _0x2787a5(0xb45) + 'J8Iic1NRvC' + 'YGiohQJRpT' + 'i3TH3J8/cO') + ('Q5z0IKkKQ9' + 'yRFSJ8tynU' + 'rq6Lhd+o9+' + 'eXPmnnWbmU' + 'nMzF9AzUP/' + 's3Xa5raxrM' + 'AYoKC6Wqe+' + 'v3xg4i9/fj' + 'GcLax5lj8+' + 'M35WTgPLuB' + _0x2787a5(_0x4bde01._0x393907) + 'VChgkooXAH' + _0x2787a5(0x463) + 'LaJtqnA51v' + 'a0Nz380Pet' + '88ymomiBDD' + '5REpVGEBtl' + 'cEOd1xTjLF' + 'NvfA4WAV2s' + '6lopE95U8A' + 'KoZpFOOC+8' + '8sNqOhbKqw' + 'BzdNVlZQBz' + _0x2787a5(_0x4bde01._0x5eeaec) + 'E1ukAFc+a/' + _0x2787a5(_0x4bde01._0x3eba7f) + _0x2787a5(_0x4bde01._0x5feda4) + '7RBXsGguEX' + _0x2787a5(_0x4bde01._0x35ceb0) + 'rGKUVMEF8U' + 'mWRze9u9ZZ' + _0x2787a5(_0x4bde01._0x12aca0) + 'UFSy4QcvS9' + 'BGQKIFYotS' + 'BinFz2ecQS' + 'B4CJK7z+N7' + 'V7lnGXD5ll' + 'aqCiqmK81e' + _0x2787a5(_0x4bde01._0x4fc26a) + '+f2mcbStCm' + _0x2787a5(_0x4bde01._0x3196f4) + _0x2787a5(_0x4bde01._0x1e3f7b) + 'CNSbGyzDay' + 'xgbPPmehzW' + 'cN6+VTv7ww' + 'qgsYw+/LZw' + _0x2787a5(0x70c) + 'kQwiC6bRWt' + '4yd9mypkj3' + '9sKHz5saXz' + _0x2787a5(0x29a) + _0x2787a5(_0x4bde01._0x4869da) + _0x2787a5(_0x4bde01._0x3087df) + 'vPOnt3+wyf' + 'rqJ3s0FyB/' + _0x2787a5(0x8c6) + 'S3rj/wEHjH' + _0x2787a5(0x2b9) + _0x2787a5(_0x4bde01._0x3c1d83) + 'fCQqql1OK6' + 'Y9G1wHj1el' + '3wHr+b9ZmE' + 'Fwl+ITRUIS' + _0x2787a5(0x265) + _0x2787a5(0x513) + _0x2787a5(_0x4bde01._0x23f626) + 'BJnDpv9s9i' + _0x2787a5(_0x4bde01._0x24b9b0) + _0x2787a5(_0x4bde01._0x594243) + '8fdlIitCLH' + '/uZd3Pac+c' + 'k4cRegqqBC' + 'oReIsVFF5/' + _0x2787a5(0xbc) + 'fKXHSoBidx' + _0x2787a5(0x78e) + 'sjWTj2TVho' + '+eNZw9prvT' + _0x2787a5(_0x4bde01._0x1f820e) + _0x2787a5(0x4bd) + _0x2787a5(0xa28) + 'JCk+EcS9Ju' + 'f8RXu84Nxn' + _0x2787a5(_0x4bde01._0x5ae245) + _0x2787a5(_0x4bde01._0x411405) + 'H2LyqZIXXH' + 'Kppo2evPke' + _0x2787a5(0x59d) + 'BAVVXTkmVd' + 'o6+s9KxbXc' + 'WC/ixFV1ad' + 'lZW/ZtozbW' + 'UsqloNZXO8' + 'Vy2w6T+Fs4' + 'b1fLg1a/Hn' + _0x2787a5(_0x4bde01._0x391822) + 'asxmXTB/6d' + 'mMqR0W6sZF' + 'kOh0o4/7Ls' + '2SZJRaYE0V') + (_0x2787a5(0x67f) + 'SE5FwDsm8h' + 'VUdSi1Dt2r' + '54197Unjc1' + '2M4vj5wEXA' + 'oke5m9/+cC' + _0x2787a5(_0x4bde01._0x5ccf2c) + _0x2787a5(0xb25) + 'UYMMbI+Vbb' + _0x2787a5(0x2fe) + 'W0F9SKHiwU' + 'aFQUqMUaCA' + _0x2787a5(_0x4bde01._0x564cda) + 'xECTKCERRe' + _0x2787a5(0x74f) + 'UBVEggkd5H' + '0qgigTxsSA' + 'qStZpCLxge' + 'ygumNT5krW' + _0x2787a5(_0x4bde01._0x34cc12) + 'IIgFFPsPCT' + 'l0a+4rzosl' + _0x2787a5(0x4e9) + '7pqZz0Fbb1' + 'mZUYJO6ai/' + 'wFnDmlfRPo' + _0x2787a5(0x9b6) + _0x2787a5(_0x4bde01._0x140732) + 'Rczid2MSpa' + 'BflTcFpWb7' + 'guHjXipriL' + 'E8lmFrxhex' + '2gVtQ0IkEF' + 'vr9Ez3Onwq' + 'Z6RVS8oiKr' + 'LhnUJoyqWj' + '3cXTOgaQ3X' + 'H6B4sbzsPq' + _0x2787a5(0x776) + _0x2787a5(0xa47) + 'xh3Q6vkQkA' + _0x2787a5(0x5f5) + 'jhImgcB7xb' + _0x2787a5(_0x4bde01._0x1351ff) + 'TAp6hc86a5' + 'Dl0QAUpkgj' + 'ypuBSf4gYF' + _0x2787a5(_0x4bde01._0x480d32) + '3rdVV665D5' + _0x2787a5(_0x4bde01._0xee6ede) + 'AFKvCT6xIG' + 'plwDUf6Oo+' + '9ta9zcBsjF' + 'UH0rwK3Vc+' + '7muRCLM6LU' + _0x2787a5(0x6d6) + 'tL+GU4bOIb' + _0x2787a5(_0x4bde01._0x11d448) + 'xAZLoDRLgU' + 'pgB6tbKEeT' + 'oFFEl0md5N' + 'WThBQGaXKw' + 'TFBwqRxQrR' + 'Q0S3YSjXKa' + 'A4Ypq/rqhC' + _0x2787a5(_0x4bde01._0x3c78b2) + _0x2787a5(0x5f3) + 'lBJFGL+X/X' + 'lrbLdnaXjD' + 'bFKGvizLTL' + 'aXQfOdWxZu' + '2MTeUAZzl7' + '0Az5wNrHm3' + _0x2787a5(0x414) + 'v8uN0kcBk5' + 'KdQdjBW5J+' + 'ETUJFihhoB' + _0x2787a5(0xa22) + 'SDApcoKTK4' + 'WLYdZNlVon' + 'iM7J5AZFF0' + '5UGVykONpP' + 'hUGaKWrNoG' + 'sYG4oMRJ3B' + 'TkGGgglUKN' + 'PJG/L/PAKm' + _0x2787a5(_0x4bde01._0x396877) + 'wuKzKoxF7S' + 'svPxtYm7sW' + '/+ahUXc5Yr' + _0x2787a5(0xf6) + 'RY2KC3PF6K' + _0x2787a5(_0x4bde01._0x12f70f) + 'RRVbXWIjdd' + _0x2787a5(_0x4bde01._0x4a716d) + 'uRbNBZBBdI' + 'OEtU2yTxRd' + 'MnKq1wFSLT' + _0x2787a5(_0x4bde01._0x1434bb) + 'ohIIu8ehqK') + ('OyIFPwuFwS' + _0x2787a5(_0x4bde01._0x57c89f) + _0x2787a5(0x5ee) + 'oifQQpbvzi' + '3JSNgyUl1G' + '89CnPgtYYW' + _0x2787a5(_0x4bde01._0x5e0ded) + '/i2yeVMd5X' + _0x2787a5(0x947) + 'EGWATcCBqD' + _0x2787a5(0xb08) + 'Fks5r6px8U' + 'aoAC+jtALL' + _0x2787a5(_0x4bde01._0x4d2358) + _0x2787a5(0x49d) + 'OInAX3cQWS' + 'CqqAIojVSF' + 'ElAUmXhdcp' + '2sQVgipe7S' + 'GlnRlOvfWz' + 'Hbx8JMRjYH' + '5vj4mSHniy' + 'xlV7VvldV2' + 'ZljJ1/p0PU' + '7Xv6r+Uds0' + _0x2787a5(0x31e) + 'unMKk+XiKD' + 'WrKriTy/fn' + 'cc3A2srAkN' + 'QSH2aAU3Ni' + '4o4Pa40L+V' + _0x2787a5(_0x4bde01._0x989c05) + 'WsYFQWK4Rb' + _0x2787a5(_0x4bde01._0x163720) + 'WvQ1SI1+Gq' + 'Q4GmEEHhnL' + _0x2787a5(0x2ed) + _0x2787a5(0x5e9) + _0x2787a5(_0x4bde01._0x3b554d) + '43oduHlz2P' + _0x2787a5(_0x4bde01._0x31c274) + 'WaArACSX3v' + 'jYfSvbq3K/' + 't/exTzzvdq' + 'zf0FpXzO2M' + 'jxfkYmf5Od' + '6JotujuqBA' + 'cWNshm452m' + '6JUwVEHWqx' + 'Sq+2VgGvqB' + 'BBRH5QBFmR' + 'XSrmvIj5U6' + '/gYtELQXC4' + 'JZ/gEGXwCn' + 'UyoSDSZEn2' + '1EgyrQHTpH' + _0x2787a5(_0x4bde01._0x2cc51a) + '0d6vrr4Vqp' + 'zz+ZkE22qr' + _0x2787a5(_0x4bde01._0x5ac73c) + 'dUCKNmXfjY' + '/pX7/5E7HR' + _0x2787a5(0x950) + _0x2787a5(_0x4bde01._0x561e6a) + '3KH8V2Q4NI' + _0x2787a5(_0x4bde01._0x4955ab) + 'o4qzObiiJB' + _0x2787a5(_0x4bde01._0x2bd858) + _0x2787a5(0x65e) + 'hCXEKVPJB+' + _0x2787a5(0x6f8) + 'qpIi8Hkqna' + _0x2787a5(_0x4bde01._0x1dbb56) + 'aaRHBkmS3T' + _0x2787a5(_0x4bde01._0x317505) + 'yVte3ohGcR' + 'lAeRbwW4gD' + '241Q91C684' + 'ywkq+PS/DK' + '9CYe7MOIdn' + _0x2787a5(_0x4bde01._0x40a681) + 'kVjX6Et5Pz' + _0x2787a5(0x29f) + 'Has/BID4+H' + _0x2787a5(_0x4bde01._0x25de0a) + 'IFSv1F+6pi' + 'BT+5zIwwRK' + 'ZPlq+f77LT' + 'qakURgkQ0C' + 'glSHVr6rjp' + 'q1iXpYdkPY' + _0x2787a5(_0x4bde01._0x4a6a21) + '3ciFnlrG6N' + _0x2787a5(_0x4bde01._0x4310ef) + 'ttDD4OPP1h' + _0x2787a5(0x35d) + _0x2787a5(0x1cb) + 'L5oxLfzqL2' + 'yuktzLxn9Q' + _0x2787a5(0x805)) + (_0x2787a5(_0x4bde01._0x452506) + _0x2787a5(_0x4bde01._0xbc74ef) + 'BLfigAXcJU' + _0x2787a5(0x5ea) + 'AJ+F6BciDV' + 'y7NaOBNVZV' + 'GQRVa5SJU6' + _0x2787a5(0x885) + 'hHljwUamqg' + 'poZIzpU1Wk' + 'EV+uysgA2e' + 'a0uHw1ntZe' + _0x2787a5(_0x4bde01._0x41829a) + 'CmeCVT4Mvn' + 'ZT29z5c/c0' + 'NjenR54Kh3' + '8xfA8UPjM9' + '9/mtl6HqEb' + 'FYDegTr4Tv' + _0x2787a5(0xaff) + 'dFIqogenwu' + _0x2787a5(0x3af) + _0x2787a5(_0x4bde01._0x4e164b) + 'PIo6sXDKW1' + 'oxUKekVICP' + 'UBBEAg5QBC' + 'C0BMAquWWI' + 'yFAKboiR4p' + _0x2787a5(_0x4bde01._0x48081e) + _0x2787a5(_0x4bde01._0x42dd64) + 'lcnVlVVQCk' + 'c+LZwgpgcg' + 'BkQzzbMWsu' + 'DxAGeKo1Gw' + _0x2787a5(_0x4bde01._0x24843d) + 'w9KVnEqc7n' + '7s0UMjc86N' + 'b/L+kepc3C' + _0x2787a5(_0x4bde01._0x6ddd02) + 'WnY2SLJCHO' + _0x2787a5(0xb52) + 'QOl4ICKtdV' + 'dKTiCKItMS' + '0U1kGXx1aA' + _0x2787a5(0x397) + 'qcz9ZMb7j7' + '4fqGJQmc++' + _0x2787a5(0x451) + 'qYzxbWBUKm' + 'LzseyM7UWo' + 'Ss8hkR+IUt' + 'nG2DVlv2C+' + 'lbJzQwDlaK' + 'KOHmLTBZLn' + 'r+g989srzS' + _0x2787a5(0x226) + 'jHj5eW1BCH' + _0x2787a5(_0x4bde01._0x1f266c) + 'iuWpESj1yh' + 'QWT1Ti8Qcb' + 'mzUgCvCBVQ' + 'p3igYonXAV' + 'CILWoej+SR' + 'pUiNOxo9f2' + 'lkzr47B1qH' + 'y528TsbMqy' + _0x2787a5(0xa5d) + 'qlOsM8jnSK' + _0x2787a5(_0x4bde01._0x1b3d8b) + 'pKXlXCs8tQ' + 'ehZu+Zkzmn' + 'vFZQMUDhA1' + 'GJm2bNrH44' + 'K0LeWzx++5' + _0x2787a5(_0x4bde01._0x1c6ef5) + 'c7o3nwPT1T' + 'UNhDLvzu2R' + _0x2787a5(0x393) + _0x2787a5(_0x4bde01._0x4e28da) + 'waGinyiqQi' + '0BnxMAatyS' + _0x2787a5(_0x4bde01._0x2f515f) + 'le/NaYwzNI' + _0x2787a5(_0x4bde01._0x550fbc) + 'C3v5hy/9wy' + _0x2787a5(_0x4bde01._0x1b70a8) + _0x2787a5(0xb27) + _0x2787a5(_0x4bde01._0x4f31a4) + _0x2787a5(0x520) + '27hVI50TvC' + 'D4FHChuKVx' + 'fb/T6Zp94S' + _0x2787a5(_0x4bde01._0x224ce1) + 'dMNja95f/j' + 'eyPr7OW1dK' + 'cReDSmqY24' + 'uxZQ2sP0LL' + 'fwmQEqzNdK' + 'PHS2UXXeI0' + 'us+tNVSGGl') + ('LqAWuyFt3/' + '3pe6FzBIUV' + 'Zd1ggrNyET' + 't8Gt+VPOFC' + _0x2787a5(0x376) + _0x2787a5(_0x4bde01._0x53019f) + _0x2787a5(0x331) + _0x2787a5(_0x4bde01._0x1c52ce) + 'iGpcBMo4BL' + 'Vgi3btP5jb' + _0x2787a5(_0x4bde01._0x496680) + _0x2787a5(_0x4bde01._0x5b5ffe) + _0x2787a5(0x6f9) + '3MJdhXEgE+' + 'thQp0AWtOn' + 'D2+4YrciSn' + 'VoNgHeAW+F' + 'rAogV9SaC2' + 'OatQYLOiUZ' + 'JHxUtPafXT' + 'NmFzQZKYBq' + 'KNu04fxPfo' + 'eaatmHacyz' + 'Pxs8PHZlxf' + _0x2787a5(0x7a9) + _0x2787a5(_0x4bde01._0x4cdb40) + '9TNlgzdwEF' + 'V613iS4rIK' + _0x2787a5(0x769) + 'uS1f2dNna9' + _0x2787a5(_0x4bde01._0x97a7a0) + 'y6TvcbVbab' + _0x2787a5(_0x4bde01._0x44fd22) + _0x2787a5(_0x4bde01._0x1e8efc) + _0x2787a5(0x7d9) + _0x2787a5(0x261) + 'LZWQlOxaXU' + 'ili6RsAqgb' + _0x2787a5(0x94b) + '/zNsN2VnQV' + 'V5GTp21eWO' + 'v8Xvnzt747' + 'rl2MJ3lnj4' + 'nfVvfzHSnA' + 'mt2e2t7Tcf' + _0x2787a5(_0x4bde01._0x2df69b) + '61efy8CY1U' + 'Fh2eOsUlyk' + 'AdUEIADjta' + '9Zy5vTmxZv' + _0x2787a5(_0x4bde01._0x367138) + '3LRj5WFXyY' + 'pZi6G2fPsj' + '79zy+seRdZ' + 'vXbWzecHiK' + 'TmPgVIEsJ5' + 'gRqQPB6QRS' + _0x2787a5(0x3a5) + 'a2ESkMpZKH' + 'gGD6/oZ3qz' + 'ZhPBGgsQrK' + 'qJfO1JzgzM' + _0x2787a5(_0x4bde01._0x2f216c) + 'yDx9H7dWyj' + 'a1Ap/pP3xu' + '6pO2cWD716' + 'ybgMPKZwwQ' + 'yeAEcCuVcB' + '8MY2MlHFk5' + 'S8d8n6pDnJ' + 'v/cMOMCxes' + 'gzvCra8VPu' + 'MaOTH58Be/' + 'W7PF89G7O9' + 'qXR9R1Gi2h' + '4CyVYYkPiw' + 'hAEMhyopCI' + _0x2787a5(_0x4bde01._0x2bc395) + 'hrKPUA0TKX' + _0x2787a5(_0x4bde01._0x3aa99f) + '4NVXlmONLc' + _0x2787a5(0x85a) + 'cB6xpo/h+6' + 'c+yPmzIyIb' + 's9e0zj+bnr' + _0x2787a5(0x7b6) + '2slhREWZFL' + 'qLgcKngtGp' + _0x2787a5(0x455) + _0x2787a5(_0x4bde01._0x4cd0b8) + _0x2787a5(_0x4bde01._0x4df5d5) + _0x2787a5(0x478) + 'nPm/7Oa9aX' + 'C+H2Q088uM' + _0x2787a5(_0x4bde01._0x311d21) + 'NQ6MxoAqeS' + 'UwY0TA7ZYl' + _0x2787a5(_0x4bde01._0x3cd7ca) + 'Z74sVvbbA0' + 'bWjra2Yv9+') + ('pbUp3Z+y4L' + _0x2787a5(_0x4bde01._0x150ea3) + _0x2787a5(_0x4bde01._0x5bd7d7) + _0x2787a5(0xa6b) + _0x2787a5(_0x4bde01._0x4485f6) + 'PKKVYseG4g' + _0x2787a5(0xb92) + '92TPj7BSFF' + 'drthFDBtIS' + _0x2787a5(_0x4bde01._0x330d2d) + _0x2787a5(0xa73) + 'S20XzSvfcN' + _0x2787a5(0x831) + '+n8yqhpBBa' + _0x2787a5(_0x4bde01._0x545a59) + 'PSiZ5FKoAX' + 'CHTfLjh++f' + 'OGZjHgqxi/' + _0x2787a5(_0x4bde01._0x24a8e1) + _0x2787a5(0x698) + 'bgu2O96J15' + 'TqG5qmtMkZ' + _0x2787a5(0x419) + 'dc/ISbMn1W' + 'L7hlQpSdhf' + _0x2787a5(_0x4bde01._0x207b4c) + '5YUr0UWvnM' + '1uxWbgxGzL' + 'OBO7D7oZ+N' + _0x2787a5(_0x4bde01._0x1ec539) + 'wVtu0Zt3Lq' + '0aGBlNbrTJ' + 'DFkTgICqFo' + 'OFICXmdJpZ' + _0x2787a5(_0x4bde01._0x81e416) + _0x2787a5(0x5b7) + 'wzN5Yvorlx' + 'gAPReWPj4y' + _0x2787a5(_0x4bde01._0x4af9c4) + _0x2787a5(0x186) + '48/K7ZWuic' + _0x2787a5(0xbe) + 'ZX/9Ys3fip' + _0x2787a5(0x9e8) + 'FUqdLRKAMQ' + 'bM8gIHhVuh' + 'VqYD9mDLP3' + 'g47mR3Zrq7' + '/ZcvE4jJ0D' + '/A5s4exRFs' + 'cXtDfW630n' + 'h9fiAlXcXq' + _0x2787a5(_0x4bde01._0x3ddb8c) + 'SYm7Xtc8IK' + _0x2787a5(0xac2) + '6rZG1ejNVV' + 'NiW698/vn3' + 'v1z1zNrG+w' + 'FiT30e6fIY' + 'OXX+m2LN+1' + 'k4dHso/LPe' + 'vL5A4q2z/T' + _0x2787a5(0xb8f) + '+SPovm1Plt' + _0x2787a5(_0x4bde01._0x1452ab) + _0x2787a5(0x1fc) + _0x2787a5(_0x4bde01._0x3d2c37) + 'x2qbR5mVNS' + 'abQ9T7OQDf' + 'HQKA7Slb2G' + 'bbA622J3N2' + _0x2787a5(_0x4bde01._0x1793ed) + 'YcK6Hgg+Uo' + _0x2787a5(_0x4bde01._0x343826) + 'tF8HyPR2sj' + 'LKPtLXk8bg' + 'DZUwO+Hwjr' + _0x2787a5(_0x4bde01._0x74049) + '9+/uFrO+/4' + 'vW5+TrNesO' + _0x2787a5(0x4cd) + 'U47+6lKA9F' + _0x2787a5(0x972) + 'aqUNVnCNBx' + 'th1sc8V3PR' + 'k6kA0rX7Ha' + 'BRUcUkI5r9' + 'rjqhz0NVgY' + 'q08e/nN88Z' + 'g6zbmo1fkY' + _0x2787a5(_0x4bde01._0x3df8d2) + 'cXvG7Xn+jm' + 'zbOn1q4/Qt' + 'eZ5HbDGBhW' + 'R8FbICRFAB' + _0x2787a5(0x45b) + _0x2787a5(0x387) + _0x2787a5(_0x4bde01._0x46b902) + '8/+ePdl7z3' + '8DlmjY8Jb4') + ('J11a8h/byH' + _0x2787a5(_0x4bde01._0xbd440f) + _0x2787a5(_0x4bde01._0x4f3bb1) + 'Pn37rnuTsq' + 'a/Antc+QQo' + 'eToWC/9j1A' + 'dNmfFNAFbT' + 'qi8eIx9lCQ' + '7Ni3FBn4SR' + 'JOLFwCAGnF' + 'hQSQTqhS/s' + 'BmGzW7Nb9+' + 'vZkA2kZUTh' + 'zbAnOwy/Q6' + 'iFjRd8PHb7' + 'yMCVu1nCB6' + 'RaIoIqO6Gk' + '0iWguoXCCF' + 'DkYaz/RdvJ' + 'WiOJ0b01F1' + 'mTXs65ezeG' + 'YkxLxjzNfV' + _0x2787a5(0x7ae) + 'qHmBgUXL7u' + 'vpmueNZrr2' + 'f2hkUbFI/c' + 'OOzzZGnmZd' + _0x2787a5(0x36b) + 'zTFePiwMUF' + 'wJoQZhYyu1' + 'AAtQRfYI35' + _0x2787a5(0x438) + '/tMaQSimJu' + 'DLSSXdGmH2' + 'B0fs+ceRUX' + '7Jurtx1qYQ' + 'YminlBdgIG' + _0x2787a5(0x286) + 'NTYWxXaU1p' + 'DUg2jzvM5L' + _0x2787a5(0x5b6) + 'BSePw8krmj' + _0x2787a5(_0x4bde01._0x4e4ef4) + _0x2787a5(_0x4bde01._0xc8de64) + _0x2787a5(0xae6) + 'z9u28rXXrb' + 'qxfRMBV44q' + _0x2787a5(_0x4bde01._0x136710) + 'L5+iuyCOFR' + '4iLXgUtm5W' + 'sIlAJDqbhq' + 'fRIoxLx605' + 'Af/W1qfj9W' + '1Lb7W/Xorr' + '0/sP2w58q3' + '/7rnwuxXCj' + _0x2787a5(_0x4bde01._0x292483) + 'CuASjLxgGR' + 'vD7XW4aov5' + '7YB1bDKU1k' + _0x2787a5(0xa3a) + _0x2787a5(_0x4bde01._0x138167) + 'vwZNUnL93d' + _0x2787a5(0x411) + '37zxArqTxy' + 'zQmCCjFz2p' + 'IagP2RKy+N' + 'kuLPjeYy7P' + '/ra9ZQML9h' + _0x2787a5(0xa66) + _0x2787a5(_0x4bde01._0x4a999e) + 'tHJj2tlfzm' + '7Nhv0bhdFN' + '+21Dzzkn1j' + _0x2787a5(0x6ef) + _0x2787a5(0x68b) + 'f7nKhwgPqc' + 'uGtN2ljNFg' + 'YZ3GGwRlDD' + 'QvHTG0ZeUR' + _0x2787a5(0x14d) + _0x2787a5(_0x4bde01._0x38914b) + 'Ec9Zh5OvfR' + '14AlDGt01X' + 'OrKSLVj5fL' + 'aINPPgTQJU' + 'x15ESJgC2P' + _0x2787a5(0x63c) + 'OrsrIuBfuZ' + 'FeRpfs3roy' + 'cJkK0zHdsn' + _0x2787a5(_0x4bde01._0xd2a7ed) + '7zy9lE3yBt' + _0x2787a5(0xaec) + _0x2787a5(0xab9) + _0x2787a5(0x421) + 'VH3+WGsI3W' + 'uD0ggc0zWd' + 'n1UPZPOIoQ' + 'mbQ1CAvkP9') + ('u6bvmncaEx' + _0x2787a5(_0x4bde01._0x131140) + 'g1zzvzfVh+' + 'ufUEpAm03H' + _0x2787a5(0x10a) + 'AtZ4oBdWut' + 'xBSlcUgCIW' + 'eUDELDLBDC' + _0x2787a5(_0x4bde01._0x99176) + _0x2787a5(_0x4bde01._0x3ba5bb) + 'OJbd6Nzk3g' + 'mNkKzS3Sri' + 'PlCyiPMlh2' + 'sp3qpKLqra' + 'jDPyfITjre' + 'gkFEj2RDqG' + _0x2787a5(_0x4bde01._0x21abe2) + _0x2787a5(0x1b5) + 'EBOH75yqo7' + 'cJYdW9O2nR' + '4sQaznPP2P' + _0x2787a5(0x1d5) + 'YIZuKxDhjb' + _0x2787a5(_0x4bde01._0x4417ca) + 'xB1sNqNM5h' + _0x2787a5(0x8fc) + _0x2787a5(_0x4bde01._0x18a838) + 'SLFyeLopuz' + 'W7XWM2hLF7' + 'cefyaws+FB' + _0x2787a5(0xa88) + 'v4KNwgrBYe' + 'lI2BJZzQPc' + _0x2787a5(_0x4bde01._0x5d9f01) + 'umJzjKM+ZN' + _0x2787a5(0x40d) + _0x2787a5(0x8ca) + _0x2787a5(_0x4bde01._0x26cc7d) + 'P57tctAMth' + 'SVQkCQF1PH' + 'G5q7aH4hNu' + '0ko+F0EGSS' + 'FecLigVkTK' + _0x2787a5(0x396) + _0x2787a5(_0x4bde01._0x3a6a93) + '0psWxDgdt6' + _0x2787a5(_0x4bde01._0x4aff5e) + _0x2787a5(0x780) + 'LrK6pQUiui' + 'svI5mTT2Sa' + 'Didt0Fbhqx' + _0x2787a5(_0x4bde01._0x3b971a) + _0x2787a5(_0x4bde01._0x567875) + 'yLvm3QXQyK' + 'Qx6Hv+eXjO' + '5r7IWoycjy' + 'U0cCqw7Pqi' + '1heWGE+XLw' + 'EG90SDSofz' + 'D6XvuGwORF' + 'twx6LlICBG' + 'CYVSpUPEsH' + 'dCExET8VUe' + 'VmfGWhzTAl' + _0x2787a5(_0x4bde01._0x11f962) + '/bJDCLToi2' + 'aZYs1Lljsw' + _0x2787a5(0x8d2) + 'UEVZCgzuuk' + 'E2Ia2sLsz0' + 'pgjZjea70y' + '3qc8KWdaSY' + _0x2787a5(_0x4bde01._0x5823b3) + '7YODiiWuq2' + '84DVYTAFzw' + '0XyGEgCWoL' + '22JIpZRh04' + 'nRvYwZz+GX' + 'X+4P078lxe' + '1C+JMpEGSc' + _0x2787a5(_0x4bde01._0x3e9dc8) + _0x2787a5(0x7a8) + 'a7sgRIH5G/' + 'dV9+Vo5/zP' + '7M9tz2KhDK' + _0x2787a5(0x585) + 'Mg6eD2CQoh' + 'KiUsZ0mQsH' + 'UILlvBujZm' + '7oPNAzCx/v' + 'dvUeRYhEu4' + 'D85dbhtqGs' + _0x2787a5(0xcf) + _0x2787a5(_0x4bde01._0x2f79a2) + 'ad2qRAuubt' + 'KX8/QdQEdW' + _0x2787a5(0x449) + '0peZZYeESO' + 'xPTDQpIipb' + 'EGUHU5EO8D') + (_0x2787a5(_0x4bde01._0x5764e7) + 'rEnRulOxDb' + 'j+0pb6n9wK' + _0x2787a5(0x64d) + 'WFMUWUaAoQ' + 'L25OZwnUeQ' + 'EK8nXBUxqR' + 'ES3YPJItJt' + _0x2787a5(0x92a) + _0x2787a5(_0x4bde01._0x303e9e) + 'DiRUA0IO9+' + '0lGEhlMfGz' + _0x2787a5(0x2f4) + 'N8+8tg/mwF' + _0x2787a5(_0x4bde01._0x4102dc) + 'AGYE1qkTtJ' + _0x2787a5(0x405) + '1EmxbJQwo9' + 'FVCUv0SgcS' + _0x2787a5(0x4dc) + 'aI3j0phXWO' + 'RPUGgJl8Xt' + '6EWiZrmbsq' + _0x2787a5(0x7cf) + _0x2787a5(0x99b) + 'kDCgHJaZJQ' + 'EvLo4hpXiN' + 'mt/99HD6jK' + 'lbpnN/Pjx3' + _0x2787a5(_0x4bde01._0xc292dc) + 'bx4Mue3HLo' + _0x2787a5(0x879) + '9b0k/U4wDD' + 'Eohi+ZZhWv' + 'zos4ZFs/Y5' + _0x2787a5(_0x4bde01._0x34ff14) + _0x2787a5(0xa6d) + 'YDqWNTijQZ' + 'WdvKuxPf7F' + 'rxYnmmS6vj' + 'dl0zyTruHY' + 'AqmyotbnQK' + _0x2787a5(0x811) + _0x2787a5(_0x4bde01._0x142e75) + _0x2787a5(0x1cc) + _0x2787a5(0x3a4) + _0x2787a5(0x61a) + 'Pv5yV0zn9f' + 'cqU25IaFiD' + _0x2787a5(0x40c) + 'G2mCw/holP' + _0x2787a5(_0x4bde01._0x10a873) + '8Hm561YvSb' + 'WYhURLtdME' + 'ZpsPAmKK46' + _0x2787a5(_0x4bde01._0x4c1e43) + _0x2787a5(0x4c2) + _0x2787a5(_0x4bde01._0x1d1ade) + 'oKNA8zn/EX' + 'FKQqyicv4g' + 'XwOvddEbPU' + 'IFQ383KgBt' + 'zexGYl763u' + '5jYRzqKHrX' + 'vWbgxUmnn9' + 'vU+PzjiGrr' + 'F6tmVPBpbt' + 'xvB1xlj5wV' + _0x2787a5(_0x4bde01._0xabb4e9) + _0x2787a5(_0x4bde01._0x46e34a) + _0x2787a5(_0x4bde01._0x21549e) + 'yYdOiuwSFB' + _0x2787a5(0x6d9) + 'lnXhSwAloh' + _0x2787a5(0x751) + '8+bNE+bmlO' + 'haDRUURVlu' + 'zGhQlEoF1I' + 'oSNIVLmcsh' + 'eJ1CviIQzB' + 'm5wxAGqYZI' + _0x2787a5(_0x4bde01._0x4821f0) + '07925Oipu2' + 'U2tN/h3RWy' + '0I6HAXHFNC' + _0x2787a5(0x5c5) + 'zDumKBbwBa' + '4tEJJF4CiB' + 'iiv9jDuvIV' + 'WWLWRC0QB8' + 'b/aoE6FJnl' + '7FxsHoGsst' + 'Ev8biuaZp5' + _0x2787a5(_0x4bde01._0x4c3d9d) + _0x2787a5(0x3ca) + _0x2787a5(0x24a) + _0x2787a5(_0x4bde01._0x3b9656) + 'E7RxPOY1bD' + 'bWGG2TqA1q' + 'GI000vDpyL') + (_0x2787a5(_0x4bde01._0x422ed3) + 'MdNlsUac7J' + 'kO/mM7P2MP' + _0x2787a5(0x668) + 'RqW8lQGtx6' + _0x2787a5(_0x4bde01._0x2df43e) + 'RJPs+m9yAL' + _0x2787a5(_0x4bde01._0x167da0) + _0x2787a5(_0x4bde01._0x36a999) + '6RWKIigUcD' + 'NTQgXJib+i' + 'stFHXlGUJF' + '+D5KkTPUsc' + _0x2787a5(0x27e) + 'KvQOPmXRCu' + 'KQ17sHLG7Y' + 'Ea1LRII0ra' + '3ijUXt9aPN' + '4bJhhzU58v' + '38VD9PCG2c' + 'derpnmvXBy' + 'wiZs/3deYF' + 'rnWIxLTnx+' + 'dduOS+diq7' + _0x2787a5(0x6fc) + '29F0VAUFhR' + _0x2787a5(_0x4bde01._0x3258e2) + _0x2787a5(_0x4bde01._0x2347f8) + 'hg2GQKFLsC' + 'yEsaimrQjs' + 'b3CyiYTYUx' + 'ATxu8LgNSc' + 'w+onpiDOTx' + 'q7eY5dfh+n' + _0x2787a5(_0x4bde01._0x408e1a) + 'Mc5ZItWmUT' + '+77LOvjktJ' + 'xk6heAztOe' + '0KuOcEUp4E' + 'KoSHv5ej4x' + 'UIgPWzVPaB' + 'wgqUVFXBmS' + 'ESSiVZAVlm' + 'EQdMt1EfVn' + 'phlEHG4jy3' + 'T5QIEYCUKE' + 'VQo9aAlyig' + '1Mkl2GVm0m' + _0x2787a5(0xa6e) + _0x2787a5(_0x4bde01._0x34d888) + '6JAZh23wxL' + '9hSN/8eej+' + _0x2787a5(_0x4bde01._0x410e9e) + _0x2787a5(_0x4bde01._0x1771f8) + '6ffTU/7Jpx' + 'Gv/1SNqMay' + '8/toPyZOvq' + '8Po/mvGjE2' + _0x2787a5(0x485) + 'iFl5+BycrE' + _0x2787a5(_0x4bde01._0x102070) + 'SFHZgZRMeI' + 'AEDUPjCcpw' + _0x2787a5(0x1e0) + 'hEAE1hGaMS' + '4Pa4QTW37R' + 'q/csNti3Sb' + 'Lq/bMPcukR' + _0x2787a5(_0x4bde01._0x1e6d0d) + 'p+1POOvHrA' + 'z+ZI57wira' + 'AL9403L87h' + 'x4bDyILlln' + _0x2787a5(0x8b3) + 'xkgCWNCkFj' + 'yYe7VsQqZ3' + 'ArkkSdCvjU' + 'uLm5ZeO6dR' + 'tbmuMxgYAT' + _0x2787a5(0x201) + 'zgFRyyVKLA' + _0x2787a5(0x16d) + 'LTCxNUmydS' + _0x2787a5(0x26f) + _0x2787a5(_0x4bde01._0x588db3) + 'to+8iOjbPY' + _0x2787a5(0x6f4) + '8Lj3LD9K+h' + '2LgRVrXXoa' + _0x2787a5(0xb62) + '9hT6Vn33S8' + _0x2787a5(_0x4bde01._0x1e4702) + _0x2787a5(0x62d) + 'hhj7xy3KfH' + 'fUra5dzc1f' + _0x2787a5(0x17f) + _0x2787a5(_0x4bde01._0x399f98) + _0x2787a5(0x4b1) + 'zAWCva+qLS' + _0x2787a5(0xb68)) + (_0x2787a5(_0x4bde01._0x423e91) + _0x2787a5(_0x4bde01._0x51a5a9) + _0x2787a5(0x535) + 'Q0Vm8Lg9bl' + 'rjjjY88eqP' + 'T3aITNIPnj' + 'yRsAZd8+Aq' + _0x2787a5(0x790) + _0x2787a5(_0x4bde01._0x50477a) + 'rUr9mNSJoB' + 'IVBAnL2QVH' + 'gYAgKkChqn' + 'FdgiITgVga' + '1j6/cXf+xZ' + 'ntdxV+sW1b' + 's89cgezgZK' + _0x2787a5(_0x4bde01._0xc55757) + _0x2787a5(_0x4bde01._0x5f13e2) + _0x2787a5(0x292) + _0x2787a5(_0x4bde01._0x4d1fc4) + _0x2787a5(_0x4bde01._0x9c7d6) + '8wGp97hLgZ' + 'e5NvBAqccN' + _0x2787a5(0x1c0) + 'BhVAOrd/tJ' + 'lKyBdZjl3I' + _0x2787a5(0x548) + '6CDSJh4Whc' + 'OHp5RHBQAv' + _0x2787a5(0x92b) + 'qOSkmUZZeI' + 'AlVF/91JZd' + _0x2787a5(0x259) + '//eTn71o5c' + _0x2787a5(0x2b1) + 'XlqFrOKWpo' + _0x2787a5(_0x4bde01._0x265e7d) + _0x2787a5(0x6ab) + _0x2787a5(0x8b1) + 'LNJUavNI4X' + 'hjapyXJA8j' + _0x2787a5(0xa30) + 'ilptjH1pST' + '1oXENuWeio' + _0x2787a5(0xb1c) + _0x2787a5(0x873) + 'tf8GmCp68O' + '/2L+nIWmiB' + 'FqwcqH5ZKM' + _0x2787a5(0xc1) + _0x2787a5(_0x4bde01._0xe7ffeb) + 'aP5Ld7FPJv' + 'x6EhM27pzZ' + _0x2787a5(0x279) + 'uYp4vT5kQZ' + 'o2tSJQYN91' + 'wStWI1kIRq' + _0x2787a5(0xa37) + '1kg+jqSxry' + 'GXRXbGZwl8' + '7y7e6wqeGJ' + 'o5mnOAep5o' + _0x2787a5(0x7f4) + 'ZyGs2Tiy0P' + 'bv6EmlcdRy' + 'ddi2Zu6CCb' + _0x2787a5(_0x4bde01._0x26ac2e) + 'KmpFVKxFHn' + 'RcjVmtshGn' + _0x2787a5(_0x4bde01._0x32225d) + '7xO/h1pH7/' + 'qutuzmbOHN' + 'un6Nnj7cE4' + 'lYAhWC02Xt' + 'PYvShFS6G0' + 'BlC7srLaGp' + 'DMH8w37Syt' + 'KYVe4S+ee4' + 'vNaCpLsov8' + 'fuWF3iOnKP' + _0x2787a5(0x2be) + '/pVA9AkLF3' + 'S/0XbxO9ET' + _0x2787a5(0x13b) + _0x2787a5(0x782) + 'kJezhgVRqj' + _0x2787a5(0x22e) + _0x2787a5(_0x4bde01._0x297d69) + 'JsvIsKXkH4' + 'XNmtx+7NW/' + 'THG7rbTC58' + 't0y9skJRUD' + 'nALaMeAsIr' + '2kRtlw3AKk' + 's1VLKV1ril' + 'sARyjbtUqg' + 'GQhVZzDCJQ' + _0x2787a5(0x875) + 'iPRKVSqxTf' + 'WWu7/FRQIT') + ('/r+B1r0PVn' + 'Tz4qaNZ49R' + 'bzihsuOqEr' + _0x2787a5(_0x4bde01._0x19682e) + 'kTtgm1AmYg' + 'jU4FF2JjCt' + 'XoqhKhMcfI' + 'fjhRIqO6Ra' + _0x2787a5(_0x4bde01._0x2373a4) + 'th4tn4dczC' + 'wujERKqlfC' + '7C1GJkxjWe' + _0x2787a5(_0x4bde01._0x5d2a00) + _0x2787a5(0x3a3) + _0x2787a5(_0x4bde01._0x98eff2) + _0x2787a5(0x9e0) + 'CVeCQr0OeW' + 'wk/8p6zjmr' + _0x2787a5(_0x4bde01._0x21ca1e) + 'CCy3mBqiZT' + 'fOKD/ku7h/' + 'u14AyyEahX' + _0x2787a5(0x17c) + 'G62laPsY1e' + _0x2787a5(0x83f) + 'gShKmBtRcr' + 'wVKKIqvMip' + _0x2787a5(0x959) + 'obG3Ppcu40' + 'OEg0SQIBW5' + 'kqBU+FLDhU' + 'UXKoFKjAg4' + _0x2787a5(_0x4bde01._0x3b6187) + _0x2787a5(_0x4bde01._0x2e61cd) + 'pBAren1iRF' + '3KXYZvGpA4' + 'uBPKW2SKxu' + _0x2787a5(_0x4bde01._0xf34ffc) + 'k9jrB9cf+Z' + _0x2787a5(_0x4bde01._0x415c9f) + 'cXb75+nOP8' + 'JXh2iyUKlu' + 'XwbvgjgVyQ' + 'W8CxQAtrZG' + _0x2787a5(0x122) + 'G+2DlpPb40' + 'NJi9PXkGjQ' + _0x2787a5(0x206) + 'KI8WTthjtz' + _0x2787a5(_0x4bde01._0x3454cd) + 'vUdy93uD1i' + '0XJJvjyqWS' + _0x2787a5(_0x4bde01._0x1f7a35) + 'TEw2sUQzFk' + 'zUlNag0Jr0' + '59kTzKiL3F' + _0x2787a5(_0x4bde01._0x524885) + '1nQSwm6DYw' + _0x2787a5(_0x4bde01._0x2b458a) + _0x2787a5(_0x4bde01._0x27f43e) + 'exyYeG20Z9' + 'gS2lK8/paP' + 'v1DeT+QN6E' + 'WpQ5iU6bvn' + _0x2787a5(0x79b) + _0x2787a5(_0x4bde01._0x172510) + _0x2787a5(0xa2e) + _0x2787a5(0x508) + _0x2787a5(_0x4bde01._0x257495) + _0x2787a5(_0x4bde01._0x1966a4) + _0x2787a5(0x179) + _0x2787a5(_0x4bde01._0x208eb8) + _0x2787a5(0x7ef) + _0x2787a5(_0x4bde01._0x3f5035) + _0x2787a5(0xaed) + _0x2787a5(0x909) + 'yIl55sRQrb' + 'jgGbwLqiAg' + 'uBUYnuoK37' + _0x2787a5(_0x4bde01._0x5388bd) + _0x2787a5(_0x4bde01._0x4b4fbd) + _0x2787a5(0x444) + 'gkilTnZYkl' + _0x2787a5(0x2c6) + 'BDTth0KqPW' + 'nWkVn6TFNn' + 'M52tyK2/JI' + 'nFtnnWlS0T' + _0x2787a5(0x8a3) + 'S7LsIJREWZ' + 'ifFUiA2zO5' + 'h6WtYJIGlg' + 'jqIKQv27CT' + _0x2787a5(0x96c) + 'j7xaP6Y/5n' + _0x2787a5(_0x4bde01._0x47cdd) + 'Sm3jWYzDkL' + 'fnDBfa4f/i' + 'JUe3fl7U1T' + '3FnzHBYTlR') + ('WfQGRFhf+A' + _0x2787a5(0x3fa) + _0x2787a5(0x441) + 'LIPkU6goib' + 'XYDEtkqCji' + _0x2787a5(_0x4bde01._0x285d30) + '/VOkzMi+kg' + 'YJzGkPOC06' + _0x2787a5(0x2f2) + 'yRRsYaRqKQ' + 'YldDSJIyDF' + _0x2787a5(0x3b0) + 'NxS9qkSQRM' + 'ph4oLaVui3' + 'bv9stvOS3U' + 'WCxn0EFZA3' + 'TN81ZucvTl' + _0x2787a5(_0x4bde01._0x6009a5) + 'eFA5jVPgZw' + _0x2787a5(0xa2a) + '6YpXI3sJyk' + '8UM2f5blPU' + _0x2787a5(_0x4bde01._0x33f83f) + _0x2787a5(_0x4bde01._0x581dd9) + 'dbVFxnihML' + 'e78sYQ6npQ' + 'AT8ahgSVwb' + 'K3hY/hEdHI' + 'O6uD0nvjB1' + 'vAlVLUiWuB' + 'CxxE0mTGhJ' + 'Nrpn3fbghZ' + '+dlqoQgyLs' + 'VesnbF+uOT' + 'Z0JmNiWWos' + 'aCxQ+XE3wM' + '/as8jEep7N' + 'ZZWXrOifro' + 'tFPokGfSab' + 'mAsAEvrpoJ' + _0x2787a5(0x352) + '8FiC6i3Kbw' + 'VSneXkFXOM' + _0x2787a5(_0x4bde01._0x233419) + 'wmCIhq6c7C' + '2C62KQ0WBk' + _0x2787a5(0x48c) + '+Uspjt4diN' + _0x2787a5(0x9d0) + 'YvO4IWza9f' + 't266jjnfQT' + 'wNYvHMzEfZ' + _0x2787a5(_0x4bde01._0x53ee56) + 'B1yhSEAtH0' + 'w+WJW1L14z' + _0x2787a5(_0x4bde01._0x2d42df) + _0x2787a5(0xb0b) + 'ZJCLHGyGNI' + _0x2787a5(0x803) + 'Y1sVfOjxOU' + 'Svm/fWHFl4' + 'cMLen8R5II' + '2iChguF0Vw' + 'CIKsYrUbvr' + 'MBdHDbwhGk' + 'Zak7LEkAmi' + 'xJQHuPULBa' + '3QAWrWHjy/' + '9aua0hagEp' + 'zJno469ane' + 'rXlUibi8fM' + 'GKR2+rC2WD' + _0x2787a5(_0x4bde01._0x15f1fb) + _0x2787a5(0x81f) + 'J4CnDseSUA' + _0x2787a5(0xb55) + 'qFIns6GsQK' + 'VPbYNdmICt' + _0x2787a5(0xaf6) + 'qAPHYjh0+n' + 'FvavaYWsdu' + 'SVWopHpZyN' + _0x2787a5(_0x4bde01._0x26780a) + 'JDi8SozXwm' + 'DFsi0WkZBt' + 'UOO2gkSfHX' + 'p9fYzGS5P1' + 'vz7wtvOv+5' + 'P+Z7cYt+gN' + '4vW2i8tajo' + '2pnXQVsPzz' + 'cVj3dHV8hW' + 'OUUDIia6vb' + 'YDZBQxB/iH' + 'DZyO8C/KEP' + 'YykC9kYaTh' + 'yLrRUIGF9B' + 'o4r6jAGtoC' + 'h15l1VviNT' + 'HGYqSDL2QA') + (_0x2787a5(_0x4bde01._0x5292c7) + _0x2787a5(0xa18) + 'tOkePB5qkB' + 'uTSC+8UtQe' + 'lkD9qODmHE' + 'Rz6d642aRP' + 'iFrv3PdvXf' + 'PZS2Fx19xT' + 'vXaB78GsK+' + _0x2787a5(_0x4bde01._0x571ed4) + 'uHnZ+4FBD0' + 'nCFPxcYj1M' + 'bEbGgRcFop' + 'gLjEkWiSZF' + '3r+BJKZHRf' + 'lksukF2OWh' + 'FZG1tbyfpt' + 'vXfPw0+tNW' + '6J4vXiN1VV' + 'lvgISASjpw' + 'pohREZNykW' + 'ltbgJ3lqtk' + _0x2787a5(_0x4bde01._0x47a53c) + _0x2787a5(0x752) + 'EL7ufI9vQv' + 'XtjXlH30pm' + 'TrXDyB6GtX' + 'b4Y8wMT9WJ' + 'u7OqKN9cZj' + 'bA10XvPlej' + 'RRQUMTN/Em' + 'HCMMDdi0kZ' + 'iibPQp+zA+' + _0x2787a5(0x553) + 'HCS5FFUV/9' + _0x2787a5(0x258) + _0x2787a5(0x340) + 'rqAUGhxegg' + 'kEWEKEJh7c' + 'kiRjQsMjlc' + 'qeUgncbgni' + _0x2787a5(0xaa2) + 'bgGuijsAvm' + 'j79Uvath3Q' + '1geWrVB2fU' + 'zxD7y8DI/Q' + 'GsI8tSt/sx' + _0x2787a5(_0x4bde01._0x5af84f) + _0x2787a5(0x648) + 'HCCMVNEMlk' + _0x2787a5(_0x4bde01._0x57be2d) + 'woVdN0Bl5g' + '6IuJfRv3OA' + _0x2787a5(0x761) + _0x2787a5(_0x4bde01._0x322883) + _0x2787a5(_0x4bde01._0x1073f7) + 'CTJV4BZBl0' + 'AcYRLYyxCJ' + 'xEYquRpIgM' + 'YY9NAsInPQ' + 'KR58ken4ze' + 'FwX+C2Fn/u' + _0x2787a5(_0x4bde01._0x13dafd) + 'Fu9+/Sp2QT' + '9h+7EeblvY' + _0x2787a5(_0x4bde01._0x527525) + 'UFIp3gSN8t' + _0x2787a5(_0x4bde01._0x4c8b15) + 'blWaif9b4i' + _0x2787a5(_0x4bde01._0x3f9387) + _0x2787a5(_0x4bde01._0x5e0578) + 'c+LBDcSsV2' + _0x2787a5(_0x4bde01._0x12c987) + _0x2787a5(0x6ca) + 'a8OCNFEmWV' + 'OGkNSjKnVA' + _0x2787a5(0x9b1) + 'sdgD8+c9Fv' + _0x2787a5(_0x4bde01._0x28ddff) + 'utUBkvoM6o' + '761vP++mci' + '16+8Df51Rq' + '1WZrjoJHSF' + 'w4XCP/e01C' + 'Xaz6G2YMKX' + 'B+MEByHgOG' + 'gj2JUQoQSn' + 'KSuygvfMQI' + 'sVg6oieRXV' + 'gVX7UEviZP' + 'WH8fe+Z9I9' + 'klzHioNw4K' + 'BDZk6C4vUK' + _0x2787a5(_0x4bde01._0x78dfe2) + 'rjMCgooQSm' + 'IJVamZCWJb' + _0x2787a5(0xa42) + 'aeT7+etwRK' + 'kGmfyoqLpk' + '527nzFetOb') + (_0x2787a5(0xa9d) + _0x2787a5(0x91b) + _0x2787a5(_0x4bde01._0x237016) + _0x2787a5(_0x4bde01._0x332dd4) + 'EQLUhWCYcs' + '4SaV8RU3+E' + _0x2787a5(0x349) + 'wYmRM0y/EQ' + _0x2787a5(0x2aa) + _0x2787a5(0x862) + 'QyalQ2T1t0' + 'OHDaNDglK4' + 'A1rmH4ED1W' + 'qcYGkRrs6J' + 'DBRtrBtayL' + 'H/dLK3/Nqo' + '5PMSnKt34w' + _0x2787a5(0x3db) + 'JzBk2zP816' + 'ZYCJB5VFHM' + '7+OTyyJq4R' + _0x2787a5(0x570) + 'btkBWsDWC0' + _0x2787a5(0x2a9) + 'kgof3Q2KA4' + 'QZRkIrmwEk' + 'Bwy4qsgsxx' + _0x2787a5(_0x4bde01._0x2eba49) + 'JOd1kCiFGU' + _0x2787a5(_0x4bde01._0x369bc2) + 'LGsIQXKneD' + _0x2787a5(0x9c3) + 'k87P7h1lXi' + _0x2787a5(0xa93) + _0x2787a5(_0x4bde01._0x5942f5) + '56xLjVx0x4' + _0x2787a5(_0x4bde01._0x2696d5) + '+RmoV1wDTD' + 'y4BGTc8oIj' + _0x2787a5(0x537) + 'eoK2/uR9wS' + 'nA6Nw15Y1N' + 'DwXiUcoSyC' + _0x2787a5(_0x4bde01._0x394d38) + 'BSEoP5pMEh' + 'Sl5VMtGNj/' + 'SWlC3QQZFk' + 'UBpEGSdTSA' + 'pO7BUEChXe' + 'BqaUsGC44G' + _0x2787a5(_0x4bde01._0x44ce85) + 'DRIrAw8jR8' + 'NeXniZl2RO' + 'Ny/TTFfy+6' + 'VxIOg8NYMN' + 'kuKXpV90Rj' + 'wMZt+Mk2F1' + 'BXoiHR7fu6' + 'Ax23cXnXdO' + 'NaodFn9wGn' + _0x2787a5(_0x4bde01._0x477831) + 'rSzLCEUEWU' + 'VHHdsHGf0t' + '+uo/rObKby' + 'jUccALGtCy' + 'g5Js7H7FmK' + 'oiirUONHzR' + _0x2787a5(0x23c) + 'HuMKpYGWoo' + '2occfQLuqc' + _0x2787a5(0x7a5) + _0x2787a5(_0x4bde01._0x32e5f6) + '/xpR4pEt0J' + 'N7HxG1+/3u' + 'g9Divj58+h' + 'Y7ytfYvPu8' + _0x2787a5(0x755) + 'gONoAEMnAB' + _0x2787a5(0x598) + 'Bio4q4oVZA' + _0x2787a5(0x34a) + _0x2787a5(0x7ff) + _0x2787a5(0xa3e) + _0x2787a5(0x6e3) + _0x2787a5(0x6f7) + 'qnKFQmQBLo' + '1sd9skpCWA' + 'XOqRJKhxIz' + 'fvpcJ4HqxS' + 'uMYNumbLcg' + 'D8vNg6G7ZH' + '3DLAZhh1zK' + _0x2787a5(0x299) + 'fyxdh/8FzK' + _0x2787a5(0x37e) + 'xvAB6L/nXS' + 'Y3GryLmBQZ' + 'G2UAJEP+Av' + _0x2787a5(0x94f) + 'CJyKD6J09f') + (_0x2787a5(_0x4bde01._0x4a3df4) + _0x2787a5(0xabc) + 's15F5QvCiB' + 'qaJ4ZdXrLZ' + 'FkAk4tn1XC' + 'YRAcFY3Rau' + _0x2787a5(_0x4bde01._0x3b81a9) + 'EuuJMAXEb0' + '72/Hnduvob' + _0x2787a5(0x9ce) + 'x266wzwwp/' + '6ZuwNQjrox' + 'NjYG7OSG3/' + '1L/LojY2An' + _0x2787a5(_0x4bde01._0x5e8edc) + 'HYmCpt04K0' + 'CWCDSCa7ev' + 'AgcHOryK5P' + 'MKIniBjNVb' + _0x2787a5(_0x4bde01._0x1a2795) + 'E8f0uWBcUp' + 'M7vL55DFJT' + '7R7RAJSE5B' + _0x2787a5(0x45d) + 'XdgLMkkKoG' + 'EwN4LPzLvH' + _0x2787a5(_0x4bde01._0x1954cb) + '6k//ESmbT1' + '2dzffEsIlF' + _0x2787a5(0x54e) + '7zxKxj/Vck' + '8dgGNLti2f' + _0x2787a5(_0x4bde01._0x13ffc2) + _0x2787a5(_0x4bde01._0x563f7d) + '0C04uDPFNW' + _0x2787a5(_0x4bde01._0x4e4d5d) + 'YCz3PN3u1H' + 'khwzHBNqAW' + 'NrxLtkeaJo' + 'pqISt0KtDx' + 'w+JzZ9YmF5' + 'HTWPi2LVS6' + _0x2787a5(_0x4bde01._0x2a8ef7) + 'TE9vh19Kca' + 'w1gBrJotP3' + _0x2787a5(_0x4bde01._0x292816) + 'u6ZtsuyTBJ' + '+/u/HvnTGR' + 'K2AD12nEBq' + 'HMaCX37NDv' + 'yNQU7a53BZ' + 'djav7xX90V' + 'm89nG8IFOI' + 'ExKHFs0IAS' + 'YKhhN+OhUx' + 'iKSadPA3/+' + 'BKfVRxGZ1Y' + 'aVQsQgWWkO' + 'INMprXMfMu' + 'YaDJ6ZWKlj' + 'vAjGFhCWPC' + _0x2787a5(_0x4bde01._0x41bded) + 'Zy+Ol34Nrb' + 'TTUSDl7g49' + 'Fn/pOUMfzv' + 'm/4C4Wtalg' + 'nEA6WUKncJ' + 'gw7zO916eL' + 'PRvzOAdcaT' + 'LJ6KMmnqRx' + 'bbBZT8WLkS' + 'n6rptuFLtu' + 'X45lJWGT5Q' + 'jMhqMIEVIw' + _0x2787a5(0x58c) + _0x2787a5(_0x4bde01._0x206151) + 'i0ZITZWC7a' + _0x2787a5(0x852) + _0x2787a5(_0x4bde01._0xa734ac) + _0x2787a5(_0x4bde01._0x4b96be) + 'kDysIvEpj5' + _0x2787a5(0xb8e) + _0x2787a5(0x60b) + 'QMp58VrFzN' + '/X8rLtwUKh' + 'BqBI/u3r9/' + _0x2787a5(_0x4bde01._0x8c1ed9) + _0x2787a5(_0x4bde01._0xe1e7a0) + 'Ms++onQU0/' + 'nLk4qy2rra' + 'rngADWN169' + 'YFNBLqVkYv' + '3EGoz2E6oQ' + 'b0WtG3SyA0' + 'zeUf9++Mpo' + '5vi8PBLTsa' + 'BLqjSYXvFV' + 'AIujQgueVo' + _0x2787a5(0x5d7) + _0x2787a5(_0x4bde01._0x5dd659)) + ('KbYkQUg+As' + 'tGT+3uEL3e' + 'cPY3msSfG1' + 'f5+Zo7e2ja' + 'sdn0FqdqTd' + 'O16XJW7v44' + 'f7yqS/bsVe' + 'vf04rJM/Hu' + 'wljc70R87P' + 'gopVECNcI3' + _0x2787a5(0xb72) + '53DOLG8+Bc' + _0x2787a5(0x33e) + _0x2787a5(0x4d2) + 'VaZ6nlJjK+' + 'jhUoYn0xRq' + _0x2787a5(_0x4bde01._0x5dfc20) + _0x2787a5(0x4c1) + 'FKGFQGDtyA' + _0x2787a5(0x97c) + 'g3/Pbg9OCv' + 'xm9Cjg5zz2' + '7InkkJJfPX' + _0x2787a5(_0x4bde01._0x2fd19) + _0x2787a5(_0x4bde01._0xde9641) + 'VQ+cdJ2/nW' + _0x2787a5(_0x4bde01._0x103854) + 'gXHXmn/2B8' + '6SUePQgNOy' + 'YX8Bx31xKL' + 'x7t/WW19pa' + 'uPiP10ZNTW' + _0x2787a5(0x8c0) + 'Ko+q1tRlm7' + _0x2787a5(_0x4bde01._0x15116b) + 'A2NgIFiuJz' + _0x2787a5(_0x4bde01._0x559f90) + _0x2787a5(0xb7f) + _0x2787a5(0x8f6) + 'G4MvjIct+t' + 'PbX4ef1w3/' + 'UsIoLPf0O5' + 'mz9AUA69YS' + 'AotXDp+8bc' + '0C8Lj0kvfP' + _0x2787a5(0x379) + '/EalRpAuvw' + 'sceUugE8/O' + 'vxN+m84sP5' + 'WioV4lCd59' + _0x2787a5(_0x4bde01._0x447d8a) + '3W0w5ZOvyL' + 'PXRQR1iP2W' + 'j3IddFKtwE' + _0x2787a5(0x6c3) + 'PiwVx9Eaie' + 'i4k/pQYIEJ' + 'xmIO0iiwNL' + 'IaiNkdFuNP' + _0x2787a5(_0x4bde01._0x398cc2) + '+boDQiS9ye' + 'Xz3StOC+qG' + 'XWfFZ7Ry+9' + _0x2787a5(0xa61) + _0x2787a5(0x3e3) + 'NpsxgNavXw' + _0x2787a5(_0x4bde01._0x532abd) + '2r2uZYKvwi' + _0x2787a5(0x17b) + _0x2787a5(_0x4bde01._0x3c5e36) + _0x2787a5(_0x4bde01._0x3921d9) + '3bv/vrs9DE' + 'PG/2rO1PnC' + 'vHyT+d9UES' + 'kGAX0qZn7U' + _0x2787a5(0x4a4) + 'UsKVF9kte3' + _0x2787a5(0x102) + _0x2787a5(_0x4bde01._0x37eb47) + 'bglLhsMShM' + _0x2787a5(0x663) + 'jd+pud1Els' + _0x2787a5(0x2da) + _0x2787a5(_0x4bde01._0x821e66) + 'IV1+zRIBLf' + 'GbYWwpmtKu' + 'NbP12Lao8L' + '4MSK9o6csC' + 'BqDfefZgWK' + _0x2787a5(0x6df) + _0x2787a5(_0x4bde01._0x2fdb79) + _0x2787a5(_0x4bde01._0x3fedba) + _0x2787a5(0xa76) + 'RTWY5WHKhb' + _0x2787a5(_0x4bde01._0x255161) + 'qagDQS2pdB' + 'AcgRLZJfXp' + '1DBg6QDmly' + _0x2787a5(_0x4bde01._0x1df963) + _0x2787a5(0xb4d)) + ('phbu/9c0db' + 'KjkAPfUJRl' + 'h4KGfC4zuY' + 'cJp7hkwcc2' + 'G5uNbfY2Y7' + _0x2787a5(0x529) + _0x2787a5(_0x4bde01._0x8a204d) + 'KsoxlwwOrb' + 'ghG+/RPJhL' + 'YGJ9bKL8bz' + _0x2787a5(0x363) + 'bEAPQHGxwl' + 'p07AUJfQNJ' + _0x2787a5(_0x4bde01._0x1cfcc6) + 'nPMVbTLZia' + _0x2787a5(_0x4bde01._0x152271) + 'BIEZkcj/91' + '5VUHrddryv' + 'i1mL6QIrYY' + 'hTtX9dGPcf' + _0x2787a5(0x4f3) + 'cdyeVYMPFD' + '/dMp/PvvXx' + '8HDTCbcoMB' + _0x2787a5(0x52e) + _0x2787a5(_0x4bde01._0x3ab5fd) + _0x2787a5(0x1a9) + 'rutms6411f' + 'BQq+CeRuGL' + '2SukFHHjQE' + '9Q5AocBio7' + 'vIoCzloQHU' + '5R8IkX52m7' + 'PBiQlcPYpI' + '2Jc1LqlmRF' + 'e9qT2zljsq' + 'bA+juxT0CW' + 'KSkWFdjF6a' + _0x2787a5(0x63a) + 'ugY7+QVw/R' + 'm6OjFTP1Zk' + '4ebsE93Bg+' + '/BjsbaHEFS' + '0ECUJAeIki' + _0x2787a5(_0x4bde01._0x43a1a4) + _0x2787a5(0xa14) + _0x2787a5(_0x4bde01._0x446a47) + _0x2787a5(0x97e) + _0x2787a5(_0x4bde01._0x8ad0c9) + 'iJL5PKrBxQ' + _0x2787a5(0x1b1) + 'U5YMxxw8xM' + 'MV7Xrh7ZcP' + 'P2giClhG27' + '/0gBXcWvRv' + 'lmqYfyUHXM' + 'X8dYDjLcax' + 'uoVSKb7kRu' + 'FMN2w2fuH7' + '6Jp6j3FU/e' + _0x2787a5(_0x4bde01._0x58d9da) + 'RUmURYX1g0' + _0x2787a5(_0x4bde01._0x28cab0) + 'hMPMvUZaR8' + _0x2787a5(0x213) + _0x2787a5(0x60d) + 'mlFJpdqqKo' + 'ohuItgO0Aj' + _0x2787a5(_0x4bde01._0x34cdd0) + _0x2787a5(0x3ee) + _0x2787a5(_0x4bde01._0x50f866) + '5c6WjAwAaV' + 'FcRt/OA/w5' + 'FoB1c/525a' + 'Vz1gES9ucA' + _0x2787a5(_0x4bde01._0x18db57) + 'o9w+lj9ww/' + 'hof/epLY8j' + '9nHn5j/a4C' + _0x2787a5(0x4d3) + _0x2787a5(_0x4bde01._0x2af7b4) + _0x2787a5(_0x4bde01._0x4fbd61) + 'qlE2du1eD+' + 'rEUD0a3WEN' + _0x2787a5(_0x4bde01._0x320ab2) + 'iFTZ6aJa4c' + _0x2787a5(_0x4bde01._0x2e7e09) + 'khfwuEtrwu' + 'CeyIm71t7w' + _0x2787a5(0x9d6) + _0x2787a5(0x54f) + '9wAIX3T7Ad' + 'atm5NgYKjf' + _0x2787a5(_0x4bde01._0x56fba4) + _0x2787a5(_0x4bde01._0x1eb406) + _0x2787a5(_0x4bde01._0x34917e) + _0x2787a5(_0x4bde01._0x3d5b02) + _0x2787a5(_0x4bde01._0x2c081a) + _0x2787a5(0xdc) + 'jqoRRCfzN2') + (_0x2787a5(_0x4bde01._0x2bf7bf) + 'nFQMQ0CNl1' + 'LVaTZza7YU' + 'mls4M2j/Ge' + _0x2787a5(0x57e) + _0x2787a5(0x9ff) + 'lcTH/m+cfL' + '2y+58PpN2Q' + _0x2787a5(0x3cc) + _0x2787a5(0x38a) + 'G5yLoJpPCT' + _0x2787a5(0x38c) + 'ThLp1ecWZ0' + _0x2787a5(0x603) + _0x2787a5(0x148) + 'yLSUud8SRE' + _0x2787a5(0x4da) + 'IEVU6ggoPu' + 'YCsFgqGu2S' + _0x2787a5(0xb13) + 'S4a0yErOtY' + 'YlXiOcp4Lj' + 'w2aow8YaEW' + _0x2787a5(0xa9f) + 'a2ftby6jvw' + 'YEFWNEPDGg' + '1YmLFHghqo' + 'kSjEx/D/dq' + '1LSOB1MP/I' + _0x2787a5(_0x4bde01._0x193ef0) + 'GejK9HnXuG' + '5n8qfkHdca' + 'I1PLBG+99b' + 'ep2jeDl6Yh' + 'IOTku4sEYx' + 'CBGw6BKrMI' + '20Ku5aRSxa' + _0x2787a5(_0x4bde01._0x498ced) + 'qWOfO1IlIz' + _0x2787a5(_0x4bde01._0x61a5e3) + _0x2787a5(_0x4bde01._0x5ef5aa) + _0x2787a5(_0x4bde01._0x42b8a3) + 'vCJoo0tURh' + _0x2787a5(_0x4bde01._0x533fff) + 'G/7n6cf21V' + 'n/k6P7/3wJ' + 'ys1zlTTAaY' + 'GNf1IwMOy2' + 'nX+cJHA3Q9' + 'xVyYGCx94+' + '2l12FVkoCR' + 'MBGz6SJOHM' + 'MaYZ8DKuq8' + _0x2787a5(_0x4bde01._0x4201da) + 'q1GP9vcLhq' + _0x2787a5(0x2a5) + _0x2787a5(0x649) + 'N7jDpRRrW2' + 'ombxc1DfR4' + 'I62uhQjMc4' + '0rCjTN8DOa' + 'Zvih+jZUru' + 'jx1JRCyayN' + 'c8f+wbian8' + 'Qhrf2qWNUC' + 'hAomnhaPOE' + _0x2787a5(_0x4bde01._0x3a041c) + 'frpKqacyQW' + 'I3vhLOnOpY' + 'LEeMXjnWye' + _0x2787a5(_0x4bde01._0xb3b26f) + 'G735WPWDpY' + 'gsyusQ1ZIG' + '8sFXu2HuD0' + 'HXWBIIvTbs' + _0x2787a5(0x580) + 'tqrv7pDTcf' + 'BpJx3RpnIK' + 'd19MBfHL/7' + '/oO4L6yAwS' + _0x2787a5(_0x4bde01._0x5318dc) + 'n/wpdCY1cu' + 'P++kbKC+YY' + _0x2787a5(0x33c) + '/65OSXfeyK' + 'zcLyH4INtA' + 'AzZrGgxMlW' + _0x2787a5(0x470) + 'lYCVOErIy1' + '3KxhE4xKYV' + 'G+xoNdZ6zS' + 'B1uwgQgxsn' + 'HM3+GDOOFw' + _0x2787a5(_0x4bde01._0x4e9e61) + _0x2787a5(0xa72) + '+O688lFd8P' + '6rX/FKtjmq' + '951LDZAbiH' + _0x2787a5(0xa83) + _0x2787a5(_0x4bde01._0x2cfc8a)) + ('46VwAKOt8w' + _0x2787a5(0x81c) + 'R4T4zr0kLv' + _0x2787a5(0x988) + 'OJd36UGTsl' + '4z/QfHn3lk' + 'ySbxRKsG5G' + _0x2787a5(0x778) + 'rg+Bwk2aGI' + _0x2787a5(0xb48) + '9vmr4Oxl8d' + _0x2787a5(_0x4bde01._0x4b1ad5) + 'h5nlN1md80' + 'q3iN7+6l8S' + 'PldNXs+1eV' + 'ciMtcU0DC0' + 'TZSc3sZMUD' + 'elE1uDGuyA' + _0x2787a5(_0x4bde01._0x8702ff) + 'OXTZna0Aw7' + '2mfdZ/EDQ4' + '0Sna6aLTDw' + '5OJp9ymb8f' + 'HKArTNt06k' + _0x2787a5(0x7fa) + 'GxbpWNvNDv' + 'FVsL4Ue6YE' + 'NnaprxAG+7' + _0x2787a5(_0x4bde01._0x28632b) + '2HV1MY1y/K' + 'hfzgK+gry1' + _0x2787a5(0x8b7) + _0x2787a5(0xaf2) + 'uHd/Wd17IF' + 'vfb7AuEhT3' + 'Kv4PHaUzhm' + _0x2787a5(_0x4bde01._0x5059c6) + _0x2787a5(0xd9) + _0x2787a5(_0x4bde01._0x265ea0) + 'WIhs+A3chI' + 'mHJzaeCdjp' + '2MyewDp8TV' + '+w6aQrc/Sn' + _0x2787a5(_0x4bde01._0x316c77) + 'KxAt4lYy8k' + _0x2787a5(0xad5) + _0x2787a5(0x61f) + 'punh/Pue+A' + _0x2787a5(_0x4bde01._0x1dd898) + 'r+cBmKcZGe' + _0x2787a5(_0x4bde01._0x2d53ca) + '7Yes/VlxyA' + '3gQagDHIy7' + 'de0rX9Kavs' + 'CiIbK5+PM/' + 'vrsnar0oVy' + _0x2787a5(_0x4bde01._0x1b31b4) + '4shFTy/IPX' + '09F1uxevcg' + 'un7/DTjdii' + '19CdK1C/Jy' + 'wYxSiXXScV' + 'gpivFCSqjP' + _0x2787a5(0x746) + _0x2787a5(0x3c5) + _0x2787a5(0x840) + _0x2787a5(0x1fa) + 'O38JTwuxcw' + '/kxAM5UTDF' + _0x2787a5(0x671) + 'uU+3EmheTi' + 'xgrVup3pa6' + _0x2787a5(_0x4bde01._0x5271fd) + 'miVxnBbnrK' + 'zKgJUYl8Y/' + _0x2787a5(_0x4bde01._0x48aac4) + _0x2787a5(_0x4bde01._0x358247) + '6RVVbFR6fX' + _0x2787a5(0x44c) + '9BQSc4hYNZ' + 'YIRTu5OKwV' + 'SHsbvDp3w1' + '2wZSYU7i20' + '7f8QfrsKfg' + 'nVjcBl7kkG' + 'yFO5ODCYuH' + 'L9lgw/HoGK' + _0x2787a5(_0x4bde01._0xcc3e3d) + 'C6pgbi40xR' + 'AYudGF2xMc' + 'kjWamm8SRq' + _0x2787a5(0x8e9) + 'jEvvrp82eQ' + 'sLtuMNbwse' + 'VsJ2IdeiT7' + '6ie7MuGazI' + '7mcsomxLHF' + _0x2787a5(_0x4bde01._0x30160d) + _0x2787a5(_0x4bde01._0x12ef25) + 'Pdf3S46WLH') + ('2PBG1ZOuHG' + 'GCzav3L3xw' + 'dx7gEngX0O' + 'UJrHfk9oou' + 'aYFON3sQLx' + 'vgpFxsvGtD' + 'mMj7OpE6U1' + _0x2787a5(_0x4bde01._0x4f1c57) + 'rgB6/0wbLJ' + '1p/NOtWKgX' + 'l6bAukx1/7' + 'n3PMaoGe44' + _0x2787a5(_0x4bde01._0x35b072) + 'KMRyV4VBuH' + 'TBM713rGyU' + 'Auey0zEBuD' + 'HGsbWJlcBl' + 'PDbY16LHIX' + 'e/lt8O57ZD' + '3AS77h7RoZ' + 'bUCVq8CAfp' + 'JYaHGMIIx+' + 'AkilETfQMg' + 'cfITh88gnB' + 'iL2wZhPcMj' + '+Ubn/Guk/T' + 'Ckw8vLSpkM' + _0x2787a5(0x3ed) + _0x2787a5(_0x4bde01._0x1b32b9) + 'T2hj2kiOUU' + _0x2787a5(0x4bb) + 'GfvH4BnjJt' + '2MwwUMNyTg' + _0x2787a5(_0x4bde01._0x94fe2c) + _0x2787a5(0x2ec) + _0x2787a5(0x917) + _0x2787a5(0x83b) + 'XrvM9vXx/6' + 'TwN8cKkJl9' + '6KLX9gFsWH' + _0x2787a5(0xb36) + 'hfd/NspZ88' + 'jcO7A+6OQI' + 'jYX708BrMc' + 'TRgUxzi5Oy' + _0x2787a5(0x7f6) + _0x2787a5(0x4e3) + '+PwYCB6juU' + 'HGBnbcpWzA' + 'BjZAYxdERI' + _0x2787a5(0xb26) + _0x2787a5(_0x4bde01._0x576dfd) + 'cl5czZEI/P' + '2JCx+JnyLS' + 'bT3I0tvYdS' + 'Jm56/+3agu' + 'MxJmDiGcy5' + _0x2787a5(_0x4bde01._0x31a70f) + '6n2mf3xC2+' + 'ggq9iU2FAY' + 'q6W9PUCRoz' + '0lhKNFEfI7' + 'vDNhrBl7Ef' + _0x2787a5(_0x4bde01._0x2e511b) + 'CQb4UVl+2I' + _0x2787a5(_0x4bde01._0x619450) + 'kMMPQImCFW' + '9Ai83TM4nt' + '4Pl21aZifg' + 't1y/RUdBZW' + _0x2787a5(0x1d9) + _0x2787a5(_0x4bde01._0x1ab66b) + 'wws2Ep1AdQ' + 'ADj+EnephN' + '0rSF3mLaFh' + 'jUrW7YFCWP' + _0x2787a5(_0x4bde01._0x40562c) + _0x2787a5(_0x4bde01._0x377fc4) + 'wGMNt6re3t' + _0x2787a5(_0x4bde01._0x317b85) + 'MqQGN/tDk3' + 'F/cks/nAj3' + 'ANoNhE4M+N' + 'xv2WA8TiwN' + 'Zs6DvzMQ6f' + _0x2787a5(_0x4bde01._0x591dea) + '12GRKnc0lj' + 'bGVTchRsmG' + 'vHSgqokcHt' + '9pRi54MkRa' + 'QwSHst94e7' + _0x2787a5(_0x4bde01._0x1cf403) + _0x2787a5(_0x4bde01._0xb8f0ad) + 'ZZsGzyTEr4' + 'Gxb48iTj9a' + _0x2787a5(0x2cb) + 'CQy6jWCvG+' + _0x2787a5(0x5a6) + _0x2787a5(0xaac) + 'xmceIA5+j5') + ('lXQbaxUjs3' + 'uGUPjpym2O' + 'GBBWay27TT' + 'lvZkztddXe' + 'ZgrLd9V6zC' + '29CWk82Q5R' + 'pmPJIRQ6/4' + 'JYqcHGWvWA' + '5YLQQyV+Oo' + 'GBP2gWXjv9' + 'Hb06cIXlbF' + 'iUeGen2Ueo' + 'mT0riyt8nC' + 'T8CZprI7LG' + 'HFF4MtlWI3' + _0x2787a5(_0x4bde01._0x1a4283) + 'WMFjjNWjAY' + '63de/BoA60' + 'cJX8VYBhkT' + 'KsiPMiiKFC' + _0x2787a5(0x7f5) + '4g+zWwFa42' + 'vSvyc0Ob0+' + 'oOB1OqnTyY' + '4kJARInN/D' + _0x2787a5(0xa15) + 'RakCEC2Msi' + 'YUOlbLk7Oc' + '2TcfqLi8Fg' + _0x2787a5(_0x4bde01._0x2d4f33) + '9x1NzLs3Ns' + 'KCUSkrW/Mc' + '/YrXGL6YCV' + 'z7NCDl2Dfz' + 'Ybd6qJna8U' + 'j39VvFRIAa' + _0x2787a5(0x412) + '/O4Fr9cbj1' + 'tbuO0Topih' + 'xNpiG3a0yZ' + 'JblmWks0Lu' + 'Seqq+JrL/9' + 'FgrD8+w/Te' + _0x2787a5(0x2e1) + 'KtB/rM3Qyw' + _0x2787a5(_0x4bde01._0x15b3d1) + _0x2787a5(_0x4bde01._0x234c31) + 'AXBQdd/aO+' + 'UadbWH0jpn' + 'nQPnEoCPIo' + _0x2787a5(_0x4bde01._0x5528b6) + 'vM/cZJnAy9' + 'iSJYfD2OXB' + '5lixOQCm8c' + 'LiJ08Syh+0' + 'zD8ejDXru9' + 'J1ltXW2WYC' + 'k074jgMmJp' + 'AgypSN6cAB' + _0x2787a5(0x66b) + 'O0ssckMg5M' + 'XuDKbCyaqn' + 'Y4vYRgKQ14' + 'fSiGK0AghD' + _0x2787a5(0x14b) + '+T1N5skTmD' + '1sC0uSGwuh' + _0x2787a5(0x7bd) + 'dv209fnZg1' + 'fACr5PyOdI' + '35I5DuQ4Ll' + 'gEYsB6yk4w' + _0x2787a5(_0x4bde01._0x275f7c) + _0x2787a5(_0x4bde01._0x25b7d8) + _0x2787a5(0x48f) + _0x2787a5(0x43d) + '+TAnVSUB1O' + 'h1eiddgC7A' + 'OcJORzgqTG' + _0x2787a5(_0x4bde01._0x1530bb) + _0x2787a5(_0x4bde01._0x35e890) + '37L84Ktndt' + 'x72qtzYjAc' + 'D0bHw3W/G1' + _0x2787a5(0x730) + 'sh05Goyx0r' + 'y8bJJHCKxd' + 'naOxAZgMWy' + 'Lwx0GrblgR' + '+prh34OOXn' + 'CCyyviTvVR' + _0x2787a5(0x41d) + 'GEUIGVfoI8' + _0x2787a5(_0x4bde01._0x5a7975) + 'SsarNiZgv/' + _0x2787a5(0x1e5) + 'ePTlc7TRJ/' + '07g9a78rD1' + '+0YZWDYWUq' + 'BFq1HE0z5W') + ('iahjIIRVFi' + _0x2787a5(0x82c) + 'MOGuZdI6xW' + 'CPHSygrV6x' + _0x2787a5(_0x4bde01._0x4bbc72) + 'jM3iywn1Vi' + 'JwpUKW1Ljg' + 'Fdc2WSWAGk' + 'meNMlixWLN' + 'sMwVVSyzjj' + 'zNxZnWtp1B' + 'LPxMV/qzXO' + 'evz2eYcEYg' + _0x2787a5(0x19c) + _0x2787a5(0x471) + 'xk0AcVN2a9' + 'wUT6opv8Pr' + 'xxZYQWUjA9' + 'loXqDgc3ox' + _0x2787a5(_0x4bde01._0xfb2529) + 'ed1yloTcJo' + 'Dsanpesp3Z' + 'C67fz2Ds0C' + 'fAR4uvv3FS' + '+fqpsbAGLT' + 'MRbeFx8uP9' + 'MisFN82Oxq' + _0x2787a5(0x907) + _0x2787a5(_0x4bde01._0x504f05) + '4MXnqHdMxw' + 'wI48LNpVPs' + '1jXZOD0Vpw' + _0x2787a5(0x66f) + 'RKoTZGdJJT' + _0x2787a5(_0x4bde01._0xaf011b) + _0x2787a5(_0x4bde01._0x3ff07b) + 'egJSVd7IA0' + 'XqPw6egA2m' + 'TcnscOXrjr' + '1Jd3358H0X' + 'X+2u+G9cJN' + _0x2787a5(0x45a) + _0x2787a5(0xa49) + 'i5qA0xe+Zz' + _0x2787a5(_0x4bde01._0x36cf12) + 'BJQNDESKEu' + 'rDhiz07bCB' + 'h1W+cc3Z2r' + 'h0mg3BbjwM' + _0x2787a5(_0x4bde01._0x68e2f8) + _0x2787a5(_0x4bde01._0x2271ed) + 'Juq3jN90zN' + 'CqY9eCdYOw' + _0x2787a5(0xa3d) + '8mXzqDnuvE' + 'ubSDayIHvJ' + 'hBK3FDMq1b' + 'XFOF1U4cZ8' + 'qic9hFkhiS' + 'yMrH2QArCs' + 'TanBeR0vUc' + 'xIkMbg8CL4' + _0x2787a5(0xa55) + 'naNgs+u1Ym' + 'n8q6cOKaYH' + 'j7ER+5J+32' + _0x2787a5(_0x4bde01._0x51dcce) + 'WtFGGBC2TA' + _0x2787a5(0x4d1) + 'zCVov33ftX' + 'cIqyugkgLx' + _0x2787a5(_0x4bde01._0x2dd23b) + 'aplOAQAy/F' + _0x2787a5(_0x4bde01._0x1a785d) + '4iVzJ8vMcE' + 'kM5IE0gN22' + _0x2787a5(0x7e2) + 'MEWZZbuFa5' + 'izzJZ/qstb' + 'x7720XV4+R' + 'kWvJ18PfxL' + 'uHAfK+g9Zo' + 'Piw2NI28/a' + 'mavJvFnqBi' + 'xmY6yLg8IZ' + '5+KiQMa24v' + 'wUSWuNLVLP' + 'zYGWQPGRON' + _0x2787a5(0x489) + 'S7FY5zDoHE' + _0x2787a5(0x9ac) + 'F64eeXJ3Lb' + 'b0TXY1iZ7J' + '5tbvonRi3S' + 'uZ/mDjSw2o' + _0x2787a5(0x4f2) + '5/Y58HB9sn' + '/mQKbEBwDi' + 'jxCgJAnVTh' + 'RTPYMPlXq2') + ('odFTlt3k9L' + 'p6a0tEBGME' + '6DAFoAECpS' + _0x2787a5(_0x4bde01._0x791933) + 'ZJYViHNs10' + _0x2787a5(0xce) + 'J/dqBubfLH' + _0x2787a5(0xd8) + '31WnJMN/WT' + 'rp9+xy1Ox5' + '9kroWy2SiU' + 'sENfrkDfHA' + '193Kpsi7KZ' + '8IIvL2diID' + _0x2787a5(_0x4bde01._0x4e6494) + 'IEvDzcp2LN' + '6VtDTcsuav' + 'IM0UHEr0iY' + 'VbTh6hiE3H' + 'btr+urXh4e' + '8ANTYaKvwb' + 'TMZd7RsSfu' + 'xb2KbNBoTK' + 'Cdvzl02FDq' + _0x2787a5(_0x4bde01._0x1bf868) + 'k3qhQvRWeL' + _0x2787a5(_0x4bde01._0xe191f7) + _0x2787a5(_0x4bde01._0x2346ae) + 'OKAeypSPDR' + 'GnZPBwLARA' + '1J1gToHNYZ' + 'GzYs9FVKiB' + _0x2787a5(0x659) + 'PrPR+N+H9d' + 'DHZ1grdLI1' + _0x2787a5(0x8b2) + 'tx3zestTWb' + _0x2787a5(0x835) + 'FTza4H1/fs' + 'ratVZF+vAF' + '4UQ4iPlyU2' + 'lVfyem2B+L' + '3XT0o60mIn' + _0x2787a5(_0x4bde01._0x34b525) + 'E7NPLFWRDg' + '7RDgm7SvTM' + 'PQAOxMSyMA' + 'I25KW/yHQX' + 'ncgZXOppwO' + 'yOFLzrRW6M' + 'QVy7c5yv5+' + 'LjMfDFPJ4G' + _0x2787a5(_0x4bde01._0x542c9b) + 'D23/zL2fzC' + 'ua2voFOKlA' + _0x2787a5(_0x4bde01._0x5966a5) + _0x2787a5(0x9eb) + 'R0AKlAuvN6' + 'X4u818EOxB' + 'nkeoTK5kBC' + 'GrLahBhqYG' + 'Rrdl9ASRs0' + 'N4aht+OXzL' + 'KQhbaHzr36' + '/w6we+LRNn' + '/knK/fczYw' + 'ZtVk5PWE79' + _0x2787a5(_0x4bde01._0x35d5fd) + _0x2787a5(0x46c) + 'mQBGLk4MHc' + _0x2787a5(_0x4bde01._0x4f2018) + 'oh77F2HSty' + '/ZMnYoYRuX' + 'PebbMgC4XI' + 'vSmUYB8Auh' + '3OT9+sl27M' + 'PPsbZ1Rle8' + 'O8O/vYLNui' + _0x2787a5(0x3b4) + 'JGErc8UTI6' + 'X7qNyKgYq9' + _0x2787a5(_0x4bde01._0x7ffe4d) + 'SzPpmuqcCH' + _0x2787a5(_0x4bde01._0x11a005) + 'IBW/l5pUJ3' + _0x2787a5(0x256) + 'yCGMgL2hOE' + '0ew8ZpICGh' + _0x2787a5(_0x4bde01._0x542e40) + 'CdEJIfLVLc' + _0x2787a5(_0x4bde01._0x5b5e8b) + 'jqsLz2r+ln' + _0x2787a5(_0x4bde01._0x4912e8) + _0x2787a5(_0x4bde01._0x70c08c) + '6oqc9Uyvyq' + _0x2787a5(0x532) + _0x2787a5(_0x4bde01._0x31b41d) + 'J14JDX8vr4' + _0x2787a5(_0x4bde01._0x47612f) + 'BTIosdcPCi') + ('XZg3RIRIPk' + 'HgCaMIVyLR' + '3DgIRgGAkN' + 'I4Qbn1534t' + _0x2787a5(0x5ec) + _0x2787a5(0x369) + _0x2787a5(_0x4bde01._0x51c593) + _0x2787a5(_0x4bde01._0x414a9d) + 'wbwtkEcdiu' + '3jBlfsf7co' + _0x2787a5(_0x4bde01._0x17435b) + 'dDiRqsQYzS' + 'WIeYunTU46' + '1GJitAR7Rs' + 'AEwVnGE7aC' + 'AD0agMAH+A' + 'P1lEUov0KS' + 'htKQZiREYy' + '/zcPcJF1if' + 'OFB1UBzxg2' + _0x2787a5(0x29e) + 'ZpuycSNgCP' + 'Q46ctsfgwp' + 'NZReO7SlVX' + _0x2787a5(0x710) + _0x2787a5(0x53f) + _0x2787a5(_0x4bde01._0x341e88) + '+7p7IA5tdt' + _0x2787a5(_0x4bde01._0x5c738) + 'o7jJDIcNNS' + '8fjM/SMjLy' + _0x2787a5(_0x4bde01._0x35f3d0) + 'JaKA2Qj0NQ' + '2LrqJyfUsn' + '0wYzBW5mYt' + '/1aWU+ZLYs' + 'U4NYYiiNlJ' + _0x2787a5(0x318) + 'lx3MA6l32w' + '+IdTIJ3IQC' + 'qJFyoFr1PF' + _0x2787a5(_0x4bde01._0x452f63) + 'y1CyZPSvq4' + 'm11PYByDFk' + 'eI9gCY8gAC' + 'eNQ8LjoEgD' + 'QDH9hM7DxA' + 'EiekpYUAQm' + 'kQGjaM2K5a' + 'pqUdf4ls7l' + 'Z/LxIyyYy2' + 'MyqfOX6VVt' + _0x2787a5(_0x4bde01._0x16e4c7) + 'j7WWBp7F95' + _0x2787a5(_0x4bde01._0x39126a) + _0x2787a5(0x933) + 'aCjQEqWJsv' + 'UcPTW9sz+i' + 'UvK+vEHVpf' + 'ENECGSh9+b' + 'ZiZjJhhzMa' + _0x2787a5(0x878) + 'KCtBCkUZNO' + _0x2787a5(_0x4bde01._0x10c256) + 'a+7TqIhz/6' + _0x2787a5(0x522) + 'jbWvtmh+nY' + 'XWqEXBKOK8' + _0x2787a5(0x1f5) + 'AxxeICVeAr' + 'US6030skJV' + _0x2787a5(0x1a6) + 'yPaYYdoKtP' + 'BfJ2oHYIZv' + _0x2787a5(_0x4bde01._0x5afa14) + _0x2787a5(_0x4bde01._0x567a9e) + '3SAsCjvwek' + '+xAxpSETh7' + 'huzyFYApHj' + _0x2787a5(0x872) + _0x2787a5(0x23b) + 'jfa9c82S6q' + 'l9Ye9jCMuh' + _0x2787a5(0x2c7) + _0x2787a5(_0x4bde01._0x18dfd1) + 'S76wYQfPGW' + 'nNcJzLXFMU' + 'vCjG+iwPww' + 'hGQidHtAAj' + 'amL1uTrse6' + '7pUFpoGBao' + 'cNH6zDGX3f' + '2EMd7qxMlG' + 'CboiS8w4ea' + _0x2787a5(0x82e) + 'd/VchMo2Z4' + 'K8BonxWCSI' + 'Z29feOfU1s' + '1qnUyQmE5Q' + 'wYmnKhIHDj') + (_0x2787a5(_0x4bde01._0x2ae976) + _0x2787a5(_0x4bde01._0x2d2f4a) + 'nAtwIEeDyI' + '1biq+oA90M' + 'MsJvRbUdcC' + _0x2787a5(_0x4bde01._0x283c89) + 'hxBj5AWieQ' + 'ENGil76/Pw' + 'lmHieclL75' + 'N4Pk8N7aMz' + 'r1eNCyXQ2j' + _0x2787a5(_0x4bde01._0x3da498) + 'RQszAbou9j' + 's+N7PimdPK' + _0x2787a5(_0x4bde01._0x43988a) + 'S6jXW0GIQI' + 'nXq7ni8xa5' + _0x2787a5(_0x4bde01._0xae2e37) + '0lAPXdoI0G' + 'yOg/dZunGV' + 'mHZwUQOGh5' + 'gWIKuRk8hX' + 'SW7eEhox6S' + _0x2787a5(0x918) + _0x2787a5(0x358) + _0x2787a5(0x151) + 'shI0v2DdaE' + 'R6sy7YdJtN' + 'WIb+vAmbIH' + '4hEIeu8DN0' + 'wRvlDx9NpK' + '1C1eyUtwpA' + 'QGRMnVWvf0' + _0x2787a5(0x779) + 'wvD4fto/OQ' + 'UPk8zpm1o7' + 'bn7UkENGjO' + _0x2787a5(0x229) + 'Gog9LtwTyg' + _0x2787a5(_0x4bde01._0x5b2de2) + 'doGHPwtRr4' + 'hLQ3HrsTB0' + 'D1zW9iG9b1' + '6TfasNM2WP' + _0x2787a5(_0x4bde01._0x4613be) + 'cSvzYHv6BT' + 'l4G1AI4QHF' + 'JXXeijrsn5' + 'SdPiHzqnAc' + 'kmLCDz+2/P' + 'Od+6x+ILyW' + '14yb0B5k4h' + _0x2787a5(_0x4bde01._0x11a8ab) + _0x2787a5(_0x4bde01._0x432448) + _0x2787a5(_0x4bde01._0x15a30e) + _0x2787a5(_0x4bde01._0x2e9879) + '5KAwjZ9frv' + _0x2787a5(_0x4bde01._0x1fd088) + 'BKk/pOdOs/' + _0x2787a5(_0x4bde01._0x1595bf) + _0x2787a5(_0x4bde01._0x5326c1) + '+Y0zT66o4i' + 'bIPLhz3hSh' + 'lR1ijC95gc' + _0x2787a5(_0x4bde01._0x57d6b0) + 'KJhZqL3Q8p' + 'Zqe6sw+ZAO' + 'vWhjBjL6I6' + 'p4yCJhBj4r' + 'k7EHmXNHCd' + 'gPEyaw2Dvx' + 'NjiAdqYhEw' + 'Mceu+Jq/52' + _0x2787a5(0x4e5) + _0x2787a5(_0x4bde01._0x3e7e2c) + _0x2787a5(_0x4bde01._0x57f47d) + '2zLf06xlgc' + _0x2787a5(_0x4bde01._0x3d6621) + 'GTKdYmFROu' + 'Jci/FU5BpJ' + _0x2787a5(_0x4bde01._0x59710f) + '8XVmnPObV+' + _0x2787a5(_0x4bde01._0x4ea8de) + 'ehSh2jNAgw' + 'DqGgCNBtKx' + 'QYUNgQd6GC' + _0x2787a5(0x716) + 'ELRDAE/ogG' + 'BqcoCCGVBW' + 'UYARd1p/9t' + '6Hg68y5hiY' + _0x2787a5(0x6f3) + '9oxdID/ivu' + '65xtSoSUjJ' + 'XNgc4yyJcA' + 'V3/xD4a2vu' + _0x2787a5(_0x4bde01._0x542b98) + 'qANF8hGR54' + 'pbLueHFj4w' + 'rXJfoO6SOH') + ('fkqJzQIUcA' + _0x2787a5(0x8dd) + 'kZQdCO2CEA' + _0x2787a5(0xdd) + 'R4wkMyymIC' + _0x2787a5(0x6c0) + '81jDB3PcRF' + 'LnXNPabMxT' + _0x2787a5(0x33f) + _0x2787a5(_0x4bde01._0x49827b) + _0x2787a5(_0x4bde01._0x2ef710) + _0x2787a5(0x2a6) + '4ssMYUGDt1' + 'VIfXWVFbiU' + 'grqAgllNQV' + 'cHGfumK289' + 'Lp7/rC9t5D' + 'xIIERSMCyT' + 'oUAANoYIeM' + _0x2787a5(0x9e7) + _0x2787a5(0x2a3) + 'MVVjh8kEDa' + 'XEvqSamEmM' + 'sliD+0zWY0' + 'ITNUwKa8ed' + 'T/eNzIlhQ3' + 'ds+J/DGdmG' + 'Tz7o1umczi' + _0x2787a5(_0x4bde01._0x381a6e) + '3Q04Xg+PJ8' + _0x2787a5(0xaa5) + 'hyFl+lPJhw' + _0x2787a5(0xab5) + _0x2787a5(_0x4bde01._0x5aca69) + '3WQl6z8VM+' + _0x2787a5(0x2e2) + 'p7meZxGtoS' + '0JmG4vjBec' + _0x2787a5(_0x4bde01._0x41a049) + 'LD4eYLjt0N' + _0x2787a5(_0x4bde01._0x45a5e7) + 'sPTHz+KZe8' + _0x2787a5(_0x4bde01._0x4ad7f9) + _0x2787a5(0x372) + 'EDD9jD5BMO' + _0x2787a5(0x13c) + _0x2787a5(_0x4bde01._0x480f6f) + '/eU+jInrZo' + 'uZSHnN/T/l' + '48R+GP1WAz' + 'zfltUfJMZ3' + 'JY2yKMzLSc' + _0x2787a5(_0x4bde01._0x52cab1) + _0x2787a5(0x9b2) + _0x2787a5(_0x4bde01._0x4cdaa7) + 'TKDGxmztuH' + 'Lcs3P0Pqjx' + _0x2787a5(_0x4bde01._0x16004d) + 'aXThH8KjhV' + '1evF8fA+cJ' + 'mLN6lzN25I' + '+mDHkMvUpp' + '4jkJbCJCt+' + 'BdAGWYDMGu' + 'yHGsC4bpAI' + _0x2787a5(_0x4bde01._0x5816f3) + 'P6BMbC+wCg' + _0x2787a5(_0x4bde01._0x1d4a97) + 'ef2xXrd9hi' + 'l/VbJSepg2' + 'k8E8euaKe/' + 'cEnTdJ2JWz' + 'SSmN6JIuJs' + '0OPcwbIpQp' + 'PqRc/UIeEV' + _0x2787a5(0xb6b) + _0x2787a5(_0x4bde01._0xb036d2) + _0x2787a5(0xacc) + '1dQKEb6o3r' + _0x2787a5(0x100) + _0x2787a5(_0x4bde01._0x706a23) + 'MaKkAUSGLi' + 'xAEL0+AgFm' + 'OGGsGEKdQL' + '8iSe6xW/rn' + 'Z5sbh58cK6' + 'N0Uv3Xg324' + _0x2787a5(0x5e7) + 'hgkJX0ZHMc' + 'gAkRt8bBFH' + _0x2787a5(0x307) + '3hKieMl47t' + _0x2787a5(_0x4bde01._0x675421) + _0x2787a5(0xb7c) + _0x2787a5(0x888) + 'HWnE5JGm4X' + _0x2787a5(0x7da) + _0x2787a5(0x54a) + _0x2787a5(0x785) + 'qJ9wjbbb8J') + ('2dhqFIhhHK' + _0x2787a5(0x887) + 'gW5OCzM1le' + _0x2787a5(0xa3f) + 'Pkwo7ZibvU' + 'ZzJl79cTTw' + '66prbioCNC' + _0x2787a5(0xa08) + _0x2787a5(_0x4bde01._0x9ccbf8) + 'tDvhVhk7zn' + _0x2787a5(0x616) + '+AqGlgyBFM' + _0x2787a5(_0x4bde01._0x3e9c9f) + _0x2787a5(0x504) + 'sDgVAa/geg' + 'RybtvyCBIX' + 'bsjM/BPIyv' + _0x2787a5(0x30e) + 'nbFsrujttM' + 'RtxhoGFLB8' + _0x2787a5(0x10d) + '0SvWAnGZY+' + 'v/8Mkfh1Xs' + _0x2787a5(_0x4bde01._0x1d169f) + '9qwGdAgAUE' + _0x2787a5(0x109) + '0jJHYQIItn' + _0x2787a5(_0x4bde01._0x4b517c) + 'BLB4IFAcPc' + 'Y6dI9uetOz' + 'FIzKCG+LSe' + 'sSiPcd0UGQ' + 'z1xLq1/S2n' + _0x2787a5(0xab0) + '9sXyIs2v8Z' + _0x2787a5(_0x4bde01._0x459fb5) + 'aiKINXBeW8' + 'q0316p/WPE' + 'eSd92igt6L' + 'VO02dGMbQA' + 'aGPfFxHAEi' + 'r7IzZ9FCMu' + _0x2787a5(0x4bf) + _0x2787a5(_0x4bde01._0x58da5f) + _0x2787a5(0x981) + 'E8KoY0NAo+' + _0x2787a5(0x1ce) + 'wimxDg/ETw' + 'c2M23VtsIk' + 'BzENUjUJe0' + _0x2787a5(_0x4bde01._0x2060aa) + 'YNVJQHCKtQ' + '3hPzzy7LB7' + _0x2787a5(0x85b) + 'A862B/tq1P' + _0x2787a5(_0x4bde01._0x2d20d5) + 'R3pCGWegKg' + 'GeC0oRDA4H' + 'APzcAfs19i' + '7wZITlEBQq' + 'E0g7ZpoNVr' + 'cCuDEAn85d' + _0x2787a5(_0x4bde01._0x32d751) + 'Toz0QOa18a' + _0x2787a5(_0x4bde01._0x29ed9e) + 'hVkIDeKNU2' + '4W1sk49cap' + _0x2787a5(_0x4bde01._0x457dba) + 'zV8E/Fqovd' + 'UIw2HbtMA9' + _0x2787a5(0x18c) + _0x2787a5(_0x4bde01._0x1388ac) + _0x2787a5(0x18f) + _0x2787a5(_0x4bde01._0x253c75) + 'gijQCY0tKQ' + _0x2787a5(0x6ae) + _0x2787a5(0x971) + '7dpjZmifWH' + 't5CG3uU6zY' + _0x2787a5(0x968) + 'sF9gm6WgxW' + _0x2787a5(_0x4bde01._0x5d2705) + 'nNZkFfk1mP' + 'frh0yPUPfK' + 'jweu+eIEAw' + _0x2787a5(_0x4bde01._0x3d64d3) + 'Egifkuhr1g' + _0x2787a5(_0x4bde01._0x5687f4) + '8ngZ3J6jwe' + _0x2787a5(0xbd) + 'mWjAYyJDPW' + 'wDd2QtxI6Z' + _0x2787a5(_0x4bde01._0x1a9c4b) + 'IglYEzcqMO' + 'O053B/jaGY' + _0x2787a5(0x863) + 'd2K+S2UYN3' + 'jQIe4/+DNw' + 'ztwGkvXidP' + 'N9SptqOV7s') + (_0x2787a5(0x75b) + 'NZn5xzIy9i' + 'ATvINPzTvJ' + 'CXrsAEkeNH' + 'tagmEHFiUp' + 'R8CkwfBkMw' + _0x2787a5(0xa07) + 'gHhuPOBsMZ' + '9q5v2xK3Cq' + _0x2787a5(_0x4bde01._0xed5071) + _0x2787a5(0x123) + _0x2787a5(0x39d) + 'ztH3QN7QBJ' + '8UKFeYP3g+' + 'c02DXmyyN4' + 'tGgcuuEAAE' + 'nMKrcHIYhZ' + '1b4rQSZlj+' + '2GVdEX6qfs' + 'rExUvM08Uj' + 'KAHk4izUOg' + _0x2787a5(_0x4bde01._0x57f47e) + 'gtDUgaDEMO' + 'Bl6rjwozAa' + '47breegJX9' + _0x2787a5(_0x4bde01._0x3e351e) + _0x2787a5(_0x4bde01._0x2a3885) + '/o31uY290N' + 'qaUDgmyObi' + _0x2787a5(_0x4bde01._0x5a79e1) + 'p5lobVt76V' + 'eeMD69W9Pe' + _0x2787a5(0x935) + '0P+MR1Hu4m' + 'Uz44GpHJTF' + _0x2787a5(0x527) + _0x2787a5(_0x4bde01._0x4b0671) + _0x2787a5(_0x4bde01._0x9d238a) + _0x2787a5(_0x4bde01._0x45a9b8) + 'IS3ESIreOv' + '7GEovabI61' + 'HLdbT05X+d' + 'DJXbsjv66U' + _0x2787a5(0x388) + 'lbaAiextpn' + 'oGS3Rk0whs' + 'yF91UJZy9E' + 'Nkga7FlsOp' + _0x2787a5(_0x4bde01._0x3037e9) + '2AMslwh2YM' + 'GyAF/MzjXt' + _0x2787a5(_0x4bde01._0x32877c) + 'LZfUg/dFTx' + _0x2787a5(0x220) + 'ZXKCqcfgw0' + 'PPQQSiVE2s' + 'mqIoGn/KpI' + 'rJ7vGyl3qv' + _0x2787a5(0x75d) + _0x2787a5(0x51c) + 'P7WLjmmQx7' + _0x2787a5(_0x4bde01._0x5ce057) + _0x2787a5(_0x4bde01._0x3594ff) + _0x2787a5(_0x4bde01._0x4b8f88) + _0x2787a5(0x2d7) + _0x2787a5(0x8dc) + 'E27DF/ui2j' + _0x2787a5(_0x4bde01._0x5be04a) + 'hyMura2AoY' + 'b2KfnNyTNM' + 'IcJwgU/yFd' + 'QzAMHvzg6Z' + '+Nxqq8Yw8L' + 'OnkN/PbpJ9' + 'Ox7neu+YU3' + _0x2787a5(0x490) + 'HRs/G2xHWm' + 'awDijWlTW2' + 'XpPJe++s1/' + 'pUQacoYcYc' + 'ymJSeELQ8p' + _0x2787a5(_0x4bde01._0x1e20c2) + 'mo+BIjLaZU' + _0x2787a5(_0x4bde01._0x36943a) + 'izgm7Gzkbx' + 'EtbBBPu8BG' + 'ZWJSwJjP1j' + 'ej0NCHeZdm' + _0x2787a5(0x8aa) + 'Ne7E5BMabQ' + 'AyfvvrIefn' + 'v1Zwe0PKZU' + 'PPGQOt+FYT' + 'Y2R0A+jFIE' + 'h8/Y41m2zn' + 'QrMSRyPpsB' + _0x2787a5(0x1d7) + '79ugGXbkNm' + 'bzG3uX6c2+' + 'ZexRw4sL9k') + ('AXYts8cLKG' + 'xrwcdqW9eh' + 'xCoRDWS6SF' + 'OvGqR4S0+v' + 'B9eMb0yc+A' + _0x2787a5(_0x4bde01._0x35d6a1) + 'VcUnfHPl/Z' + 'to5o4VNTLS' + 'yoz143MhkH' + '5w1tkXFU4M' + _0x2787a5(0x5e4) + 'Bz+ZGBEVdE' + 'r7KZiaUKVg' + '6lcyzNkxQB' + _0x2787a5(0x9f5) + 'uOUa7vTRGm' + 'rWvhuSYYcU' + _0x2787a5(0x3b3) + 'WFQhAyZFPo' + _0x2787a5(0x929) + _0x2787a5(0x46d) + _0x2787a5(0x51f) + 'DdytQZ3pnt' + 'rOADI9+J7A' + 'uf4xTgmp1r' + _0x2787a5(0x80a) + _0x2787a5(0x678) + 'jIUgjylVlD' + 'hBCLCNjKEj' + 'hpnymPywo1' + 'KBWRlM49ih' + 'm70nkCBxFm' + '5YdF4HHKMg' + _0x2787a5(0x76c) + 'Gk0TQUx8MA' + '0joI3f72CQ' + 'fjnEw29YWK' + '1eMLioel/J' + '77U9uBysW/' + _0x2787a5(_0x4bde01._0x112ed0) + 'iPgXOB0ikd' + 'oDe/7R17dJ' + 'faOXRP3/1n' + _0x2787a5(0x7ac) + _0x2787a5(0xa71) + 'jpVYxm+iJ8' + 'eKBgIZiX9s' + _0x2787a5(0x90d) + _0x2787a5(_0x4bde01._0x6f21da) + '7YbBldH++P' + 'cxxIKTr4/8' + 'jx33SlKE+z' + _0x2787a5(0xa44) + 'm0zo1rQOdu' + 'hynEKR7vvd' + '8zO0FnU46e' + '674AALrrAL' + 'Zk4MmgvBYD' + _0x2787a5(0x36f) + 'C7DggvGulA' + 'QQtj2NeGEw' + 'w9gOfJYdMi' + 'jjdyRRN9Dp' + 'o4aFvgoNSw' + 'sNE01Y94Pm' + 'P9HKGdQT1s' + _0x2787a5(_0x4bde01._0x381d42) + 'HdmnYxu2lq' + '+/cqx6VDfM' + '/UQjRhx3q3' + '1Ea331G1U3' + 'pa36sqcZr8' + '/OsCUccOSV' + _0x2787a5(_0x4bde01._0x1ce2ec) + 'wetmbhDi3o' + 'gTxjp4YykD' + 'UDedDdlsjD' + 'BhEXDSCLa1' + _0x2787a5(0x391) + 'hvHOtLQ0LJ' + 'gIsTDAMIyd' + 'fu/cARhfh9' + 'V41+3NA4lQ' + _0x2787a5(_0x4bde01._0x200ba4) + _0x2787a5(_0x4bde01._0xc52177) + 'oqZEJREjrg' + 'R69Yef33LV' + _0x2787a5(0xa04) + 'uOGRcWNKRt' + '4gWM3yc+kw' + 'doxtvRA+A3' + 'bksQ5TNkNP' + _0x2787a5(0x2fd) + 'A+PsTQAaeu' + '7QZViYSbni' + _0x2787a5(0x353) + 'RYGpDQMLg0' + 'Nu1kHHy6Hr' + 'Ph2x89Rsn6' + 't68s/cebRa') + (_0x2787a5(_0x4bde01._0x43c784) + 'iumNbFidPu' + _0x2787a5(0x297) + _0x2787a5(_0x4bde01._0x4e76e8) + 'sCFYrByfa+' + 'eVhoF9v5PB' + _0x2787a5(0x5a5) + 'zakgpCNadp' + '8zADPpiNiI' + _0x2787a5(_0x4bde01._0x288bd9) + 'qyUwzFhjCC' + 'CECGPBfmaC' + _0x2787a5(_0x4bde01._0x146b54) + 'pv/XY2WOLL' + 'x6bBXQ9jHh' + 'thTpsGrYS4' + _0x2787a5(0x275) + 'rfRt++qWa3' + _0x2787a5(_0x4bde01._0x55faf6) + 'wAbfFhsJVC' + _0x2787a5(_0x4bde01._0x1a3497) + _0x2787a5(0x810) + _0x2787a5(_0x4bde01._0x1c7555) + 'SWfkVym66i' + _0x2787a5(_0x4bde01._0xc6bc48) + 'QLxPnCaPEd' + 'W0YSFUryHQ' + 'yA81kjYM4H' + 'uTpdOdYXxy' + _0x2787a5(0x164) + 'r73rqfV49J' + '1Av0t4hlQ3' + 'xs9Ij1ty9L' + 'V/0Yuhl9GB' + 'l4FDT1hoQp' + _0x2787a5(0xa0e) + 'crVIKUjF4o' + _0x2787a5(0xaf0) + _0x2787a5(0x1c9) + _0x2787a5(_0x4bde01._0x398c5c) + 'CQhJ25OGyp' + 'PVychjrTII' + '0F/C/4GHWK' + _0x2787a5(_0x4bde01._0x215602) + _0x2787a5(_0x4bde01._0xf617f3) + _0x2787a5(_0x4bde01._0x551724) + 'h47ok5SC5w' + 'UzLH3TH+L6' + _0x2787a5(_0x4bde01._0x3ddfbf) + _0x2787a5(_0x4bde01._0xe5f219) + 'MqiB+I5Gck' + 'ytPsKpakJb' + 'Cw0D8zCo23' + 'GmXFA4UTGP' + 'DHRA7WhaMg' + _0x2787a5(0x2a2) + 'pXZH1TrIaS' + 'DV45MP4n/H' + '5RofPwNNtA' + 'STtqV4xOLK' + _0x2787a5(0x237) + _0x2787a5(_0x4bde01._0x4732fc) + 'J8cwNRCkrW' + 'viTq4JUIlA' + 'Xwl/L2JWho' + 'hCkSWQx7MF' + _0x2787a5(_0x4bde01._0x33b1b2) + _0x2787a5(_0x4bde01._0x131dd8) + _0x2787a5(0x24f) + 'RG76Y5quvf' + 'w2c29Oepb8' + _0x2787a5(_0x4bde01._0x481d8a) + 'vNp9htFZCS' + 'WiYOqt7vo/' + 'D+7c37bdCl' + '9HxVnIgTIg' + _0x2787a5(0xdf) + _0x2787a5(_0x4bde01._0x201a14) + 'SWO9KND3TD' + 'ZmLoHFQqho' + _0x2787a5(_0x4bde01._0x5e2886) + 'R0cNh6mHBK' + _0x2787a5(0x321) + 'mhbqxO0KIe' + '2pCT30e5NP' + 'DRVOLYfZ+9' + 'fd1Kdlh+7c' + _0x2787a5(_0x4bde01._0x20eefd) + 'XY+Kedz7iO' + 'buPIkIEfJK' + 'NlhN65YU5o' + 'TH9oTOwabi' + 'quFKRfcQCS' + 'MvIAUjKM6l' + _0x2787a5(0x4b8) + _0x2787a5(_0x4bde01._0x4b8893) + 'ACwWIKSUkW' + 'jaSFCFrD+J' + 'O0o0nWvfcd' + 'OeVmhdPwcN') + (_0x2787a5(0x128) + 'R3unl8eMCZ' + 'KGaWiUBYP2' + 'eubnYtJOpe' + 'vEjNvgzKLx' + '9EAG7uP+xS' + _0x2787a5(0xaa3) + '0f2+Xx5kPw' + 'ZYgQR7EBht' + _0x2787a5(0x105) + 'qGkMbHHt6r' + _0x2787a5(_0x4bde01._0x203726) + 'Z+o3Y804mx' + 'yZWFw9dEDN' + 'zGV6MseP+2' + 'OftWitco8U' + _0x2787a5(0x197) + 'U95uqI5iRs' + _0x2787a5(_0x4bde01._0x5ed4d8) + 'M74sRizdWF' + _0x2787a5(0xa26) + 'WEYipMSuAt' + '/J3p2BM9YM' + 'aZXB54g0jY' + 'bSQqSTeelp' + 'IY3vPqycDi' + 'qcrl+d/c4M' + _0x2787a5(0x8f8) + 'UnlbGRVH2B' + _0x2787a5(_0x4bde01._0x37c3c6) + '/8kKLqSBgP' + 'AYI+CN9oJG' + 'dQ8aM1FEhE' + 'tROfzSiHXS' + 'hYdsczYAcA' + '8tqwWGJPPw' + '+zIAwL+Pft' + 'fuM5l4UymC' + 'D3YvxlWAiG' + _0x2787a5(0x30d) + 'oqnLY335BP' + '7Q8DmJPVK/' + _0x2787a5(_0x4bde01._0x45dda6) + 'y9PFP+T+UO' + 'KboDNln+Be' + _0x2787a5(0xadc) + 'yUPRBEkiYs' + 'ir6VsPdZGQ' + 'BDkoEWIybb' + 'cf/iXQrYMz' + 'ICxp7vSYBn' + 'YzGB6maVMG' + 'cuLYRpZjIs' + _0x2787a5(_0x4bde01._0x1d7b8e) + _0x2787a5(_0x4bde01._0x286de7) + _0x2787a5(_0x4bde01._0x308cee) + _0x2787a5(_0x4bde01._0x34a5f0) + '2TD6cgdvk/' + _0x2787a5(0x7c8) + 'ecWgYQqmhI' + 'NDUCazZQ+i' + 'XwMwixlSeQ' + 'lJwM7uQD2M' + 'NwlrgQ0qsj' + _0x2787a5(_0x4bde01._0x29e5e1) + 'xC+jB0IVeO' + '/oEIcWwngL' + _0x2787a5(0x23f) + 'ycmnpaqPA1' + _0x2787a5(_0x4bde01._0x451c4b) + '+570E6xcRs' + 'YAvbr6wKms' + 'uGNYcnvxU+' + _0x2787a5(_0x4bde01._0x8ae89f) + 'ip3Uyd9PRT' + _0x2787a5(0xa00) + 'gQmln9CgBO' + _0x2787a5(_0x4bde01._0x1de7ee) + 'EKFRiSm61u' + '3JWMiFgGE4' + 'CMONrGbOvm' + _0x2787a5(_0x4bde01._0x46ab02) + _0x2787a5(_0x4bde01._0x5c704c) + '3eCU/gs+xT' + _0x2787a5(0x4df) + 'Uwt8B9HuNh' + 'rH0DLM5iH8' + '96P1Y9LsnI' + '7pJh6CaViP' + 'xJwwtnqMRw' + _0x2787a5(0x84d) + 'R/WJhSp9Kf' + 'QA8itGV/Dn' + _0x2787a5(0x8bc) + _0x2787a5(_0x4bde01._0x2579c6) + 'HFqIq5j6Rq' + 'UpnQgUUCax' + _0x2787a5(_0x4bde01._0x101d71) + 'IxpWemc4zF' + 'WGd4TU+FkM') + (_0x2787a5(0x28b) + 'E3Ctc575+8' + '01VO/ur2Q5' + '1jTitX47qM' + '9KMt7DayfJ' + 'aPQtI7eMXB' + _0x2787a5(_0x4bde01._0x3d8d42) + _0x2787a5(0xa95) + 'HWQTeH3jsD' + _0x2787a5(0x5ff) + 'Q1HPesCrEl' + 'xvZqK0tqGK' + _0x2787a5(0x977) + '9AjaSl0Y6O' + _0x2787a5(0x613) + '9n9IP1QM+7' + 'eBlndMmq6v' + 'oB8XY2iW7c' + 'kIJrQ2Cjv0' + _0x2787a5(_0x4bde01._0x352afd) + 'eSKEQxSor7' + 'NXTvrjOACl' + '/Pw8bvy1i0' + '028W4rds4F' + '4reHLVkIuM' + _0x2787a5(_0x4bde01._0x57c7cb) + 'OghjYRSQLm' + _0x2787a5(0x720) + _0x2787a5(0x38b) + 'GKXo055GN0' + '7/vUL3VuOB' + 'x89HERUgGU' + 'BH5HIKoL0E' + _0x2787a5(_0x4bde01._0x14df58) + '6f8YszgApf' + 'y8N9bJz++P' + _0x2787a5(_0x4bde01._0x28e5bb) + 'dEfmDlVHr7' + 'SPVft5mAe0' + 'h4wWKeaHG7' + 'lU7Ri7qd//' + _0x2787a5(0x773) + '6IY8q/2btT' + 'jiSP4jRsjk' + 'QeRqM/lAaf' + 'vBtaeyZQ4U' + _0x2787a5(_0x4bde01._0x543679) + _0x2787a5(_0x4bde01._0x3a15b0) + '55PxzW4nxL' + '6TT3QYUknt' + _0x2787a5(0xaf5) + 'J4j+psbCKi' + _0x2787a5(0xa8c) + 'grJSOyPJw2' + '54cSI2Y+9J' + _0x2787a5(0xae3) + 'ILYHXBERhp' + 'iVMgw1jcxW' + 'hWib8bPDOo' + 'cEZymH2K5G' + '/LKOsPyMcB' + 'zMNbKsO5+t' + 'AYCk+29xCd' + 'FkhGwhUzMz' + _0x2787a5(0x679) + 'SCkkmsRYXD' + _0x2787a5(_0x4bde01._0x1693c7) + _0x2787a5(_0x4bde01._0x1d6c3e) + 'fjw4Q/6wGo' + 'n4WbwsROxz' + _0x2787a5(_0x4bde01._0x5438bc) + '5WevOzOocC' + 'Y8nGDjN3/U' + 'Uh4fQwEyW1' + 'A85bw6am/K' + 'kruPDjbaA8' + 'WDKwsHSeZk' + _0x2787a5(0x4d8) + 'jbj5feKUeY' + _0x2787a5(_0x4bde01._0x406e7e) + 'xe0eTeYWlH' + 'UpCBmfRlQv' + 'jTf6xOPUOo' + 'cIZYjdonOq' + _0x2787a5(_0x4bde01._0x1bbaa3) + 'yYdP39L8Je' + 'k+YeMNvvKE' + _0x2787a5(_0x4bde01._0x409015) + _0x2787a5(_0x4bde01._0x30f6d1) + _0x2787a5(0xec) + _0x2787a5(0x50c) + _0x2787a5(0x395) + 'RGfnSmUOFM' + 'sSYEZHpO33' + 'SeTCTrfRf3' + _0x2787a5(_0x4bde01._0x54aadd) + 'BgAiZAcmN/' + 'Tm4gRIO1Wo' + _0x2787a5(0xaf4) + 'lrVnoD/bZP') + (_0x2787a5(0xf4) + 'LLNJRYkE2P' + 'fMgvzWcn2j' + 'MQr8TKDCGc' + '/lMj7t8D1s' + 'mheSaGGk0n' + 'ILUDMrg+xL' + '/vc15bKda0' + _0x2787a5(_0x4bde01._0x50c6bd) + _0x2787a5(_0x4bde01._0x20aaf0) + 'BhaXSjYsHQ' + 'voby12CK9O' + _0x2787a5(0x770) + _0x2787a5(_0x4bde01._0x1bf0c4) + 'sT6AxR0ok/' + 'fPEuZeMlZw' + '4VzpiuA877' + 'D9Zg2nVb3i' + 'epS+7uSdSm' + _0x2787a5(_0x4bde01._0x54729a) + 'FE3KnfbErp' + _0x2787a5(0x540) + _0x2787a5(0x980) + 'wRWBjLxmSI' + 'JRFhUrQIxL' + '7kwzxcjqwI' + '8v+ejMkcI3' + 'mrdmfGbbVX' + 'lYOJt+8zvx' + _0x2787a5(_0x4bde01._0x4892c4) + 'XRz89tyIcs' + _0x2787a5(_0x4bde01._0x7a5fe0) + 'KmMGGNcWej' + _0x2787a5(0x428) + 'mdFkCQ0FHn' + 'EANqCmRDM3' + 'A9IzmFpqWl' + 'kU7szOlMC8' + 'XJFX/MT/1G' + _0x2787a5(0x5cb) + _0x2787a5(0x1b2) + 'ekelfhRf4F' + 'nHeH/lg8HO' + 'Gei71CfQdx' + _0x2787a5(0x892) + 'CdiDEBuUd8' + 'WIFEAyX4B6' + 'FAh3fxQNlE' + 'ByoBvr2Ljk' + 'sWKcFR3SNK' + 'CUpEGa6dIp' + '27H24xtAhW' + '82Ry+xaS9t' + 'Axithgt0nB' + 'JgGL0HMD/F' + 'SKQy744Nl8' + 'xgNWeMeizr' + _0x2787a5(_0x4bde01._0x5f5adb) + _0x2787a5(0x4f4) + 'rSeIRWspRr' + 'YzmNGYkcwD' + 'HZOVYcLjY7' + 'E+IISxwxCs' + 'vuyrh85Y13' + 'yb/YqL8dqb' + '8M8hq22uPy' + 'm9uPsGb7+U' + '7oT2ZO01A7' + '92kkoQtgJG' + 'FTgqopSRzY' + 'ltPcRU1H74' + 'qBE3R47Jwz' + '5twIg3YCtO' + 'KC20lFuf8O' + _0x2787a5(_0x4bde01._0x3e1a0c) + 'rXMpvPQS1K' + '19hgTTHCc4' + 'dawhYZCmGV' + 'R/Zg8mLA97' + 'MBHiN+5RCj' + 'k66+0xhtpm' + _0x2787a5(_0x4bde01._0x2023f6) + _0x2787a5(0x9b7) + 'xkSFbzMLMv' + 'H58gfbOMy8' + 'o3mIlnp3AP' + '+8Hep5eyJT' + 'xwBZN0NKIh' + 'uH/D2o1A4p' + 'jfMjUC41G3' + 'cQS7gCR/Sg' + 'VsIxSZAMwH' + 'FjRYVAJ2DU' + 'EKHC6EufX/' + 'utoMI3p+uA' + '3/XIx3/oUw' + 'uDf9iXaj3G' + 'ABpg4gG/Zl' + _0x2787a5(_0x4bde01._0x2da9da) + 'GPs/FzOozI') + ('CwxuOdgFZh' + 'mkHbew48MO' + 'Vb8O+3nfHZ' + _0x2787a5(0x7ee) + 'TekEF2HnPf' + '7CU71GN5N/' + 'NJ0YsNomQ2' + 'pDGGYVjYME' + 'FkVmaQgp64' + 'HTJI9EiJUM' + 'EZjEGTc61q' + _0x2787a5(0x8bb) + _0x2787a5(0x8e4) + 'Ub8pVPg2dB' + '1E2qW/aRtE' + 'rbzmAUshuc' + 'fIX/WVkw6Y' + 'xQM+LR83cn' + 'kDzgNwSfsv' + '3afoWKk29E' + 'jySLFjWCcS' + 'lG1V+tI6vU' + _0x2787a5(_0x4bde01._0x1e8cb7) + '3dp3U1/9+D' + 'XjkAh2tc1M' + 'gWInEfPDWG' + _0x2787a5(_0x4bde01._0x5747e4) + 'WwjaWWaclT' + 'skdiwzIbpw' + 'gya9d+m8SK' + _0x2787a5(_0x4bde01._0x576bfc) + _0x2787a5(0x51a) + 'SQ9cerh/aL' + _0x2787a5(0x551) + 'dI++a1j3z8' + _0x2787a5(_0x4bde01._0x4d244b) + 'zZ63HuB1YQ' + _0x2787a5(0x3e1) + 'A9rIZfFxhN' + 'DE2DlE7hyL' + 'mZ2+M97RmB' + 'jKReBx9H/w' + _0x2787a5(0x2d1) + 'Vt+RRt8GKX' + 'wHrP1ou+Dp' + 'j//SH3rRmL' + _0x2787a5(_0x4bde01._0x214ea0) + 'TAipY0zlRG' + 'I1weDY3Mo2' + 'LemawT+8mM' + 'XTknqHjVKM' + _0x2787a5(_0x4bde01._0xfbe63f) + 'TwnbAORntD' + 'G8PAWpEHSW' + _0x2787a5(_0x4bde01._0x2287a9) + '7C1ZGnPHWd' + '69z2c3dmwS' + 't//K8x9hba' + 'aUDBseZwEL' + '7Fq++ywghe' + '+IdVDY75Zf' + 'oetltPzVY2' + '3ZIMgDhYfM' + 'SEr0KmNPMr' + '4/0XYEQIa+' + '+4R24OARag' + '8m8edAPJEz' + 'j18d+vOU/g' + _0x2787a5(_0x4bde01._0x3e2e60) + 'B6NdevCerL' + '7EaZ9y5duK' + '6zOMO4B4+t' + _0x2787a5(0x46a) + _0x2787a5(0x4bc) + '6nv7j4KPBa' + _0x2787a5(0x204) + _0x2787a5(_0x4bde01._0x27e499) + 'd0UK3x3rIL' + _0x2787a5(_0x4bde01._0x2e0d7d) + _0x2787a5(0x589) + 't6+rj7GDLz' + 'cWIwMknRyo' + '8qjdEjmHHk' + 'jPLnlJ+13n' + 'z1wBlr3wkp' + _0x2787a5(_0x4bde01._0xa72ae6) + '78TcweDIw2' + 'Yzu5lmilT8' + _0x2787a5(0x8fa) + _0x2787a5(_0x4bde01._0x365170) + 'Kz6bM4MQeT' + _0x2787a5(_0x4bde01._0x46ff15) + '5wXunEndee' + _0x2787a5(0x825) + _0x2787a5(0x5c3) + 'mrSxilAWK+' + _0x2787a5(_0x4bde01._0xf6f91e) + 'NSWG2iSiSq' + 'nv3n3u/Zfx' + 'QUCooRF3H1') + (_0x2787a5(0x546) + _0x2787a5(_0x4bde01._0x59b43c) + '58UU5O7unz' + 'X5iBlBzBHr' + 'q+UiUWcUlE' + _0x2787a5(0x604) + '6a/kS8l6dZ' + 'ZvVnrVO/3w' + 'hnFSicTazH' + 'sPIM+POaGw' + '4eHM6DxloT' + 'GG2PydSxX2' + 'jDuRnsX5TM' + _0x2787a5(_0x4bde01._0x38645a) + _0x2787a5(0x59f) + 'VbFnBymcVa' + _0x2787a5(_0x4bde01._0x54aa48) + _0x2787a5(0x5e3) + 'RKNoCi2VDF' + _0x2787a5(_0x4bde01._0x9ac313) + 'x5VfiXw7dA' + _0x2787a5(0x8f2) + 'SzBRTOOtZj' + _0x2787a5(_0x4bde01._0x312b2d) + 'cn/LIIEffj' + 'w9IzPk4S00' + _0x2787a5(0x95d) + 'FWDaQ6th4r' + 'E1omcRKZx9' + 'rCfABahtvB' + 'aW8n+a+Eso' + 'wqfom0XACs' + 'Ngp/Hexy9t' + _0x2787a5(_0x4bde01._0x50d919) + _0x2787a5(_0x4bde01._0xea4765) + _0x2787a5(_0x4bde01._0x4e737d) + 'quCdkfASZL' + 'V1wFnXBt19' + 'Rtn8CASfTf' + _0x2787a5(0x33d) + '3rzeNI+F/H' + '+d/G+jV4/1' + 'dx/m9gPXPE' + _0x2787a5(_0x4bde01._0x491aaf) + 'bEOjnk/z7I' + 'xPr/AL1nlZ' + _0x2787a5(0x494) + _0x2787a5(0xad0) + 'CC\x22\x20alt=\x22L' + _0x2787a5(0x48a) + '=\x22width:\x205' + '0px;\x20heigh' + _0x2787a5(_0x4bde01._0x4f3734) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x2787a5(_0x4bde01._0x2c9b28) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<h1' + '\x20style=\x22ma' + 'rgin:\x200;\x22>' + _0x2787a5(0xe7) + 'tbar\x20Build' + 'er</h1>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '<p\x20class=\x22' + 'credit\x22>©\x20' + '2026\x20by\x20Sa' + _0x2787a5(_0x4bde01._0x3aae9e) + '\x20-\x20<a\x20href' + '=\x22https://' + 'sanghendri' + 'x.itch.io\x22' + '>sanghendr' + _0x2787a5(0x7b4) + _0x2787a5(_0x4bde01._0x1e1681) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20</d' + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20</' + 'div>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20</div>\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + 'class=\x22con' + 'tainer\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'div\x20class=' + _0x2787a5(_0x4bde01._0x1bbf8d) + _0x2787a5(_0x4bde01._0x5b7353) + 'y:\x20flex;\x20a' + 'lign-items' + ':\x20center;\x20') + (_0x2787a5(0x795) + _0x2787a5(_0x4bde01._0x36c275) + 'ce-between' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + _0x2787a5(_0x4bde01._0x4f2b5d) + 'display:\x20f' + 'lex;\x20gap:\x20' + '5px;\x20align' + '-items:\x20ce' + 'nter;\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20<but' + _0x2787a5(0x71c) + '\x22save-butt' + _0x2787a5(_0x4bde01._0x5217ff) + 'k=\x22window.' + 'open(\x27http' + 's://sanghe' + 'ndrix.itch' + _0x2787a5(0x3bd) + '-creator-r' + 'pg-maker-m' + _0x2787a5(_0x4bde01._0x27236b) + 'n\x27,\x20\x27_blan' + 'k\x27)\x22\x20title' + '=\x22Video\x20Tu' + _0x2787a5(0xb5c) + _0x2787a5(0x187) + 'ground:\x20#f' + 'f0000;\x20pad' + _0x2787a5(0x7ea) + '10px;\x22>▶\x20T' + 'utorials</' + 'button>\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x5071ff) + _0x2787a5(_0x4bde01._0x2bd0a4) + '\x20\x20\x20\x20\x20\x20<but' + 'ton\x20class=' + '\x22save-butt' + 'on\x22\x20onclic' + 'k=\x22window.' + _0x2787a5(0x272) + _0x2787a5(0xea) + _0x2787a5(0xb2a) + 'te/YKPscqH' + 'V8b\x27,\x20\x27_bl' + 'ank\x27)\x22\x20tit' + 'le=\x22Discor' + _0x2787a5(0x60e) + _0x2787a5(0x42d) + ':\x20#5865F2;' + _0x2787a5(0xe4) + '6px\x2010px;\x22' + '>Discord\x20S' + _0x2787a5(_0x4bde01._0xa50d87) + 'tton>\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x39efc3) + _0x2787a5(_0x4bde01._0x1203c6) + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20<div\x20styl' + 'e=\x22text-al' + 'ign:\x20right' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xf8bbe7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20Click\x20an' + 'd\x20drag\x20you' + 'r\x20slot\x20sho' + 'wn\x20in-game' + _0x2787a5(0x861) + _0x2787a5(_0x4bde01._0x277895) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x198) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20</div>\x0a\x0a\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x2787a5(0x5c6) + _0x2787a5(_0x4bde01._0x58ee79) + 'style=\x22dis' + _0x2787a5(0x2e5) + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x23a9ef) + _0x2787a5(0x3ce) + _0x2787a5(_0x4bde01._0x42a848) + 'for\x20now\x20-\x20' + 'functional' + _0x2787a5(0xdb) + 'or\x20future\x20' + _0x2787a5(_0x4bde01._0x24edc4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<button\x20') + ('class=\x22too' + _0x2787a5(_0x4bde01._0x3885a5) + 'onclick=\x22r' + 'esetPositi' + _0x2787a5(0x371) + 'le=\x22Reset\x20' + 'all\x20slots\x20' + 'to\x20default' + '\x20positions' + '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20↺\x20Reset\x20P' + 'ositions\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x31c3c1) + _0x2787a5(_0x4bde01._0x23aa1c) + 'n>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20</div>\x0a' + _0x2787a5(0x294) + _0x2787a5(_0x4bde01._0x1df239) + '\x20<div\x20clas' + _0x2787a5(0x7a3) + _0x2787a5(0x5b4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<div\x20cla' + 'ss=\x22sideba' + 'r\x22>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3ad983) + 'ss=\x22sectio' + _0x2787a5(_0x4bde01._0x5d821b) + 'style=\x22dis' + 'play:\x20flex' + _0x2787a5(0x9f7) + _0x2787a5(0x3be) + 'r;\x20justify' + '-content:\x20' + 'space-betw' + 'een;\x22>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'h3\x20style=\x22' + 'margin:\x200;' + '\x22>Hotbar\x20G' + _0x2787a5(0xacd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<button\x20' + 'class=\x22add' + '-slot-btn\x22' + '\x20onclick=\x22' + 'createNewG' + 'rid()\x22\x20tit' + _0x2787a5(_0x4bde01._0x548039) + '\x20a\x20new\x20gri' + 'd\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x2fc508) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '+\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20</butt' + 'on>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<di' + 'v\x20id=\x22grid' + 'sList\x22\x20cla' + 'ss=\x22scroll' + 'able-list\x22' + '></div>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0xf8bbe7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + _0x2787a5(_0x4bde01._0x1f499a) + 'tion-heade' + 'r\x22\x20style=\x22' + 'display:\x20f' + 'lex;\x20align' + '-items:\x20ce' + 'nter;\x20just' + _0x2787a5(_0x4bde01._0x269221) + 't:\x20space-b' + _0x2787a5(_0x4bde01._0x4e9909) + _0x2787a5(0x2df) + '20px;\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x3bf) + _0x2787a5(_0x4bde01._0x1a1fee) + ';\x22>Slots</' + 'h3>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x36e832) + _0x2787a5(_0x4bde01._0x1df239) + _0x2787a5(_0x4bde01._0x1e2cdb) + _0x2787a5(_0x4bde01._0x37a1b3) + '\x22add-slot-' + 'btn\x22\x20oncli' + 'ck=\x22instan' + _0x2787a5(0x4ee) + 't()\x22\x20title' + _0x2787a5(0x89b) + '\x20new\x20slot\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20+\x0a' + _0x2787a5(_0x4bde01._0x19bcd1) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20</button' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + _0x2787a5(0x39f) + _0x2787a5(0x784) + _0x2787a5(0xa96) + _0x2787a5(_0x4bde01._0x490e31) + _0x2787a5(_0x4bde01._0x3c32d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<div\x20cla' + 'ss=\x22conten' + 't-panel\x22>\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x880) + 'iv\x20id=\x22slo' + _0x2787a5(_0x4bde01._0x12f889) + 'style=\x22dis' + 'play:\x20none' + ';\x20margin-b' + _0x2787a5(_0x4bde01._0x439ed8) + 'x;\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<h3' + '\x20style=\x22ma' + 'rgin-top:\x20' + '0;\x20margin-' + 'bottom:\x2010' + 'px;\x22>Previ' + _0x2787a5(_0x4bde01._0x42ca9d) + _0x2787a5(_0x4bde01._0x1638fb) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '<div\x20id=\x22p' + 'reviewCont' + 'ainer\x22\x20sty' + _0x2787a5(_0x4bde01._0x417b74) + _0x2787a5(_0x4bde01._0x247fdd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20display:\x20' + 'flex;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20align-it' + 'ems:\x20cente' + _0x2787a5(_0x4bde01._0x1e1c37) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20j' + 'ustify-con' + 'tent:\x20cent' + 'er;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x42d) + _0x2787a5(_0x4bde01._0x15e6fc) + '0,\x200,\x200.3)' + _0x2787a5(_0x4bde01._0x527480) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'rder:\x202px\x20' + 'solid\x20rgba') + ('(255,\x20215,' + '\x200,\x200.3);\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bord' + 'er-radius:' + _0x2787a5(0x392) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20padding:' + _0x2787a5(0x2eb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xab6) + _0x2787a5(_0x4bde01._0x1e734d) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x22>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20<div\x20id' + '=\x22previewS' + _0x2787a5(_0x4bde01._0x26c543) + '=\x22\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x347) + _0x2787a5(_0x4bde01._0x2b5b77) + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4308ed) + _0x2787a5(_0x4bde01._0x1bcfb6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20display' + _0x2787a5(_0x4bde01._0x3a37a1) + 'lock;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x22>\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<img\x20' + 'id=\x22previe' + 'wBg\x22\x20style' + '=\x22display:' + _0x2787a5(0x638) + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5ddeb7) + '\x20<div\x20id=\x22' + 'previewTex' + 't\x22\x20style=\x22' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x247fdd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x377720) + _0x2787a5(_0x4bde01._0x32189f) + 'ute;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + 'op:\x2050%;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x6de) + _0x2787a5(_0x4bde01._0x105d66) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20tr' + 'ansform:\x20t' + _0x2787a5(0x83e) + _0x2787a5(_0x4bde01._0x5ead7e) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20colo' + 'r:\x20white;\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2d5abb) + 'ize:\x2018px;' + _0x2787a5(_0x4bde01._0x33934f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5a4) + 'weight:\x20bo' + 'ld;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x31639b) + '\x20\x20\x20\x20\x20\x20\x20\x20te' + 'xt-shadow:' + '\x202px\x202px\x204' + 'px\x20rgba(0,' + '0,0,0.8);\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x51cc13) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20white-' + _0x2787a5(0x2f0) + 'rap;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x258df6) + '\x20\x20\x20\x20\x20\x22></d' + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2fcdeb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + '/div>\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4d0dd7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20</div>' + _0x2787a5(0x294) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x2787a5(0x6d0) + 'margin-top' + ':\x200;\x22>Slot' + '\x20Propertie' + _0x2787a5(0x602) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + 'id=\x22proper' + 'tiesPanel\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c' + 'lass=\x22empt' + 'y-state\x22>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20Sele' + 'ct\x20a\x20slot\x20' + 'to\x20view\x20it' + 's\x20properti' + 'es\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x211655) + '\x20\x20\x20\x20\x20</div' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20</div>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x20795f) + 'div>\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20</div>\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<scri' + 'pt>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x2a1) + 'rrentGrid\x20' + '=\x20null;\x0a\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x868) + 't\x20currentS' + 'lot\x20=\x20null' + ';\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x3df) + 'n\x20selectGr' + _0x2787a5(0x564) + _0x2787a5(0x60c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20curr' + 'entGrid\x20=\x20' + _0x2787a5(_0x4bde01._0x5e8bac) + _0x2787a5(_0x4bde01._0x5c2bc6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20currentSl' + 'ot\x20=\x20null;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x2c98f2) + 'document.q' + 'uerySelect' + 'orAll(\x27#gr' + 'idsList\x20.l' + 'ist-item\x27)' + '.forEach(i' + 'tem\x20=>\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x28ef29) + 'm.classLis' + 't.remove(\x27' + 'active\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20});\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20el' + 'ement\x20=\x20do' + 'cument.get' + _0x2787a5(0x348) + 'd(\x27grid_\x27\x20' + _0x2787a5(0x670) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20if\x20(el' + _0x2787a5(0x991) + _0x2787a5(_0x4bde01._0x536303) + 'List.add(\x27' + _0x2787a5(0x697) + _0x2787a5(_0x4bde01._0x1974db) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(w' + 'indow.open' + 'er\x20&&\x20wind' + 'ow.opener.' + 'loadGridSl' + _0x2787a5(_0x4bde01._0x29e040) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d49b2) + 'w.opener.l' + _0x2787a5(0x420) + 'ts(index);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x7dbb95) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x98c3e5) + _0x2787a5(0x133) + '&&\x20window.' + _0x2787a5(0x3f8) + 'hlightGrid' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20window.o' + _0x2787a5(_0x4bde01._0x135df6) + 'lightGrid(' + 'index);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x47d106) + 'f\x20(window.' + 'opener\x20&&\x20' + 'window.ope' + 'ner.desele' + 'ctAllSlots' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20window.o' + _0x2787a5(_0x4bde01._0x44e94c) + _0x2787a5(_0x4bde01._0x15dcad) + 'ts();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20sho' + _0x2787a5(0x681) + 'index);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x2787a5(_0x4bde01._0x33934f) + _0x2787a5(_0x4bde01._0x4d0dd7) + '\x20function\x20' + 'selectSlot' + '(slotName)') + ('\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x35fb35) + '\x20\x20\x20\x20\x20\x20\x20cur' + _0x2787a5(_0x4bde01._0xdc8b5f) + '\x20slotName;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4d46ab) + _0x2787a5(0x9b3) + _0x2787a5(0x21a) + _0x2787a5(_0x4bde01._0x317153) + 'orAll(\x27#sl' + 'otsList\x20.l' + 'ist-item\x27)' + '.forEach(i' + 'tem\x20=>\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x28ef29) + 'm.classLis' + _0x2787a5(0x96b) + _0x2787a5(0x697) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20});\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20el' + 'ement\x20=\x20do' + 'cument.get' + 'ElementByI' + 'd(\x27slot_\x27\x20' + '+\x20slotName' + '.replace(/' + '[^a-zA-Z0-' + _0x2787a5(_0x4bde01._0x6c4a3c) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(element)\x20' + 'element.cl' + _0x2787a5(_0x4bde01._0x446398) + 'd(\x27active\x27' + _0x2787a5(0x27c) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(window.o' + 'pener\x20&&\x20w' + 'indow.open' + 'er.selectS' + 'lotInGame)' + _0x2787a5(_0x4bde01._0x5d09cb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x964) + 'ener.selec' + 'tSlotInGam' + _0x2787a5(0x9bf) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20showSl' + 'otProperti' + 'es(slotNam' + _0x2787a5(_0x4bde01._0x5102d4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fun' + 'ction\x20show' + 'GridInfo(i' + 'ndex)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x435) + 'nel\x20=\x20docu' + _0x2787a5(_0x4bde01._0x15bc1b) + 'ementById(' + '\x27propertie' + 'sPanel\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3d4958) + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x193f1f) + _0x2787a5(_0x4bde01._0x46b986) + 'f\x20(window.' + 'opener\x20&&\x20' + 'window.ope' + 'ner.getGri' + _0x2787a5(0x285) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x543e9e) + 'st\x20info\x20=\x20' + _0x2787a5(_0x4bde01._0x516a6b) + 'ner.getGri' + 'dInfo(inde') + ('x);\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xece5ba) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20if\x20(info' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20pane' + _0x2787a5(0xb8a) + 'L\x20=\x20`\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3ad983) + _0x2787a5(0x4c9) + 'group\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + _0x2787a5(0x27a) + '-width\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20<label\x20' + 'style=\x22dis' + _0x2787a5(_0x4bde01._0x2f147e) + ';\x20align-it' + 'ems:\x20cente' + _0x2787a5(_0x4bde01._0x22d82c) + '\x20pointer;\x22' + _0x2787a5(_0x4bde01._0x1e69b3) + _0x2787a5(_0x4bde01._0x4d46ab) + _0x2787a5(_0x4bde01._0x1bcfb6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '<input\x20typ' + 'e=\x22checkbo' + 'x\x22\x20id=\x22gri' + _0x2787a5(0x8af) + _0x2787a5(_0x4bde01._0x43566b) + _0x2787a5(0x995) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20${' + 'info.gamep' + _0x2787a5(0x44f) + 'able\x20?\x20\x27ch' + 'ecked\x27\x20:\x20\x27' + _0x2787a5(_0x4bde01._0x58a710) + _0x2787a5(_0x4bde01._0x511de8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20on' + _0x2787a5(_0x4bde01._0x11fe93) + 'dateGridGa' + 'mepadContr' + 'ollable(th' + 'is.checked' + ')\x22\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20st' + _0x2787a5(0x816) + 'n-right:\x208' + 'px;\x20width:' + _0x2787a5(_0x4bde01._0x21a39f) + 'ght:\x2018px;' + _0x2787a5(0x725) + 'ointer;\x22>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20<s' + 'pan>Gamepa' + 'd\x20Controll' + _0x2787a5(_0x4bde01._0xace42f) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xece5ba) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20</la' + _0x2787a5(0x881) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x21693e) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20</') + ('div>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20<hr\x20style' + '=\x22border:\x20' + _0x2787a5(0x699) + 'er-top:\x201p' + 'x\x20solid\x20rg' + 'ba(255,255' + ',255,0.1);' + '\x20margin:\x202' + '0px\x200;\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x5da6d8) + _0x2787a5(0x131) + _0x2787a5(0xb87) + _0x2787a5(0xef) + 'px\x200;\x22>Gri' + _0x2787a5(0x8da) + _0x2787a5(0xa6a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2c6d85) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c' + _0x2787a5(0x922) + 'd-group\x22>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5c2bc6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '<div\x20class' + '=\x22field\x20fu' + 'll-width\x22>' + _0x2787a5(_0x4bde01._0x112197) + _0x2787a5(_0x4bde01._0x5ae0b8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<labe' + 'l>Backgrou' + _0x2787a5(_0x4bde01._0xba64c) + 'label>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1ac075) + _0x2787a5(_0x4bde01._0x2379eb) + '\x20<div\x20styl' + 'e=\x22display' + ':\x20flex;\x20ga' + 'p:\x205px;\x22>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x163) + 'nput\x20type=' + '\x22text\x22\x20id=' + '\x22gridBackg' + _0x2787a5(_0x4bde01._0x2c1787) + '\x22\x20value=\x22$' + '{info.back' + 'groundImag' + 'e\x20||\x20\x27\x27}\x22\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x12a12e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x5da6d8) + '\x20\x20\x20\x20\x20\x20plac' + 'eholder=\x22I' + 'mage\x20filen' + 'ame\x20(witho' + 'ut\x20extensi' + _0x2787a5(0xb3c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'onchange=\x22' + _0x2787a5(_0x4bde01._0x49178d) + 'Background' + _0x2787a5(0x132) + '.value)\x22\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20style=' + '\x22flex:\x201;\x22' + _0x2787a5(0x1af) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(0xaae) + 'ass=\x22toolb' + _0x2787a5(_0x4bde01._0x302f7f)) + ('click=\x22sel' + 'ectGridBac' + 'kgroundIma' + 'ge()\x22\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20style=\x22' + 'padding:\x205' + 'px\x2015px;\x20m' + 'in-width:\x20' + 'auto;\x22>\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '📁\x20Browse\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20</b' + 'utton>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<butt' + 'on\x20class=\x22' + 'toolbar-bt' + 'n\x22\x20onclick' + '=\x22removeGr' + 'idBackgrou' + 'ndImage()\x22' + _0x2787a5(0x12c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20st' + 'yle=\x22paddi' + 'ng:\x205px\x2015' + 'px;\x20min-wi' + 'dth:\x20auto;' + '\x20backgroun' + 'd:\x20#d32f2f' + ';\x22\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x40e574) + 'itle=\x22Remo' + 've\x20backgro' + _0x2787a5(_0x4bde01._0x2cf44d) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20✕\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x26fb92) + _0x2787a5(_0x4bde01._0x3b9103) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20</' + _0x2787a5(_0x4bde01._0x50cb1b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x2787a5(_0x4bde01._0x4e5f54) + '\x22margin-to' + _0x2787a5(_0x4bde01._0x4119ac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20<b' + _0x2787a5(0x224) + 's=\x22toolbar' + '-btn\x22\x20oncl' + 'ick=\x22reset' + _0x2787a5(0x1e8) + 'oundPositi' + _0x2787a5(_0x4bde01._0x585638) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4d46ab) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20style=\x22') + ('width:\x20100' + '%;\x20padding' + ':\x208px;\x22\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x12a12e) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20title=' + _0x2787a5(0x2c2) + _0x2787a5(0x6a0) + 's\x22>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x630) + _0x2787a5(_0x4bde01._0x1e199d) + _0x2787a5(_0x4bde01._0x1ca48b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x509189) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20</butt' + _0x2787a5(_0x4bde01._0x3b9103) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5da6d8) + _0x2787a5(0x9b3) + _0x2787a5(0xa74) + _0x2787a5(0x8ac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'input\x20type' + '=\x22file\x22\x20id' + '=\x22gridBgIm' + 'ageFileInp' + 'ut\x22\x20accept' + '=\x22.png\x22\x20\x0a\x20' + _0x2787a5(_0x4bde01._0x1d4438) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x234734) + _0x2787a5(0x9b3) + 'style=\x22dis' + 'play:\x20none' + ';\x22\x20onchang' + _0x2787a5(0x2c9) + 'ridBackgro' + 'undImageFi' + 'le(this)\x22>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4cdc6a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x889) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + _0x2787a5(0x6ec) + _0x2787a5(0x930) + 'le=\x22flex:\x20' + _0x2787a5(_0x4bde01._0x2e04bd) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x53350a) + _0x2787a5(0xb2e) + 'label>Posi' + _0x2787a5(_0x4bde01._0x502113) + _0x2787a5(_0x4bde01._0x7022f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'input\x20type' + '=\x22number\x22\x20' + 'id=\x22gridPo' + 'sX\x22\x20value=' + '\x22${info.po' + 'sitionX\x20||' + '\x200}\x22\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1df239) + _0x2787a5(0x9fd) + 'hange=\x22upd' + _0x2787a5(_0x4bde01._0x2f2f24) + _0x2787a5(_0x4bde01._0x54a03f) + _0x2787a5(_0x4bde01._0x4c4666) + 'e)\x22>\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20</div' + _0x2787a5(_0x4bde01._0x1e69b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<div\x20cla' + 'ss=\x22field\x22' + '\x20style=\x22fl' + 'ex:\x201;\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2ceb16) + 'Position\x20Y' + _0x2787a5(0x9b0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x7ca) + 'type=\x22numb' + 'er\x22\x20id=\x22gr' + 'idPosY\x22\x20va' + 'lue=\x22${inf' + 'o.position' + _0x2787a5(0x415) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20onchange=' + '\x22updateGri' + 'dPosition(' + '\x27y\x27,\x20this.' + _0x2787a5(_0x4bde01._0x19b3e1) + _0x2787a5(_0x4bde01._0x234734) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + '/div>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x83dfff) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1da83a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<hr\x20s' + 'tyle=\x22bord' + 'er:\x20none;\x20' + 'border-top' + _0x2787a5(_0x4bde01._0x30f644) + 'd\x20rgba(255' + ',255,255,0' + '.1);\x20margi' + 'n:\x2020px\x200;' + '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xb2e) + 'h3\x20style=\x22' + 'margin:\x200\x20' + _0x2787a5(_0x4bde01._0x38eb48) + '>Grid\x20Arra' + 'ngement</h' + '3>\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'div\x20class=' + _0x2787a5(_0x4bde01._0x287b9f) + 'up\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + 'class=\x22fie' + 'ld\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'label>Rows' + '</label>\x0a\x20' + _0x2787a5(_0x4bde01._0x159cd3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20<input\x20' + 'type=\x22numb' + _0x2787a5(_0x4bde01._0x20c008) + _0x2787a5(0x15f) + 'lue=\x22${inf' + 'o.rows\x20||\x20' + '2}\x22\x20min=\x221' + '\x22\x20max=\x2220\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x21db19) + _0x2787a5(0x9b3) + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0xb2e) + _0x2787a5(0x5c6) + '\x22field\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x847ae4) + _0x2787a5(_0x4bde01._0x3c7e0c) + 'abel>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4fb2db) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x13b862) + 'e=\x22number\x22' + '\x20id=\x22gridC' + _0x2787a5(_0x4bde01._0x49d804) + 'lue=\x22${inf' + 'o.columns\x20' + '||\x205}\x22\x20min' + '=\x221\x22\x20max=\x22' + '20\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20</div' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<div\x20cla' + _0x2787a5(0x503) + _0x2787a5(_0x4bde01._0x3023ab) + '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<la' + _0x2787a5(_0x4bde01._0x484b63) + 'g</label>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1da83a) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x15d912) + '\x20\x20\x20\x20<input' + '\x20type=\x22num' + 'ber\x22\x20id=\x22g' + _0x2787a5(0x88e) + '\x22\x20value=\x22$' + _0x2787a5(0x252) + 'ing\x20||\x2010}' + '\x22\x20min=\x220\x22\x20' + 'max=\x22100\x22>' + _0x2787a5(_0x4bde01._0x42b303) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x416428) + '\x20</div>\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + _0x2787a5(0x27a) + _0x2787a5(_0x4bde01._0x57df94) + _0x2787a5(_0x4bde01._0x5ae0b8) + _0x2787a5(_0x4bde01._0x2f4cde) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2699a5) + '\x20\x20\x20<button' + _0x2787a5(_0x4bde01._0x29e485) + 'olbar-btn\x22' + '\x20onclick=\x22' + 'arrangeGri' + _0x2787a5(0xe5) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x926) + 'width:\x20100' + '%;\x20padding' + _0x2787a5(0x766) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x51cc13) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20Ar' + 'range\x20Slot' + _0x2787a5(_0x4bde01._0x28b516) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xb22) + 'on>\x0a\x20\x20\x20\x20\x20\x20') + (_0x2787a5(_0x4bde01._0x183290) + _0x2787a5(_0x4bde01._0x1d15f7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x198) + _0x2787a5(_0x4bde01._0x47b956) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x37ac73) + _0x2787a5(_0x4bde01._0x5cdac8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x50b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x47c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20fu' + 'nction\x20upd' + 'atePreview' + _0x2787a5(0x97d) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20preview' + _0x2787a5(_0x4bde01._0x18529b) + _0x2787a5(0x6bf) + 'ElementByI' + 'd(\x27slotPre' + _0x2787a5(_0x4bde01._0x52e6d5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20pr' + 'eviewBg\x20=\x20' + 'document.g' + 'etElementB' + 'yId(\x27previ' + _0x2787a5(_0x4bde01._0x54815e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20pr' + 'eviewText\x20' + '=\x20document' + '.getElemen' + _0x2787a5(0x6cf) + 'viewText\x27)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20previewS' + 'lot\x20=\x20docu' + 'ment.getEl' + 'ementById(' + _0x2787a5(0x57f) + 'ot\x27);\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x42a39e) + 'window.ope' + _0x2787a5(0xa0d) + _0x2787a5(0x7fc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xa6010a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2b2eee) + _0x2787a5(0x482) + 'llConfig\x20=' + '\x20window.op' + 'ener.getFu' + 'llSlotConf' + _0x2787a5(_0x4bde01._0x22eca1) + 'w.opener.g' + 'etFullSlot' + 'Config(slo' + _0x2787a5(_0x4bde01._0x34fe5e) + 'ull;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(!f' + 'ullConfig)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20previewPa' + _0x2787a5(_0x4bde01._0x48d17b) + 'display\x20=\x20' + '\x27none\x27;\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20retu' + 'rn;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(0x654) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2dd) + 'reviewPane' + _0x2787a5(0x8e2) + 'splay\x20=\x20\x27b' + 'lock\x27;\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x9e85a) + _0x2787a5(0x9b3) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20cons' + 't\x20offsetY\x20' + '=\x20parseInt' + '(fullConfi' + _0x2787a5(0x48e) + _0x2787a5(_0x4bde01._0x5db1e9) + _0x2787a5(_0x4bde01._0x3d8eef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x7d2) + 'nfig.Backg' + 'roundImage' + _0x2787a5(_0x4bde01._0x1ce2e3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x236369) + _0x2787a5(_0x4bde01._0xd76b93) + _0x2787a5(0xa70) + 'mg/system/' + '\x27\x20+\x20fullCo' + _0x2787a5(_0x4bde01._0x5acd1d) + 'roundImage' + '\x20+\x20\x27.png\x27;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2dd) + 'reviewBg.s' + 'tyle.displ' + _0x2787a5(0x304) + 'k\x27;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20previewB' + _0x2787a5(0x9ae) + '\x20function(' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20prev' + _0x2787a5(0x199) + _0x2787a5(0x51e) + '=\x20this.wid' + 'th\x20+\x20\x27px\x27;' + _0x2787a5(0x294) + _0x2787a5(_0x4bde01._0x458ef9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x57b) + _0x2787a5(0x277) + '.height\x20=\x20' + 'this.heigh' + 't\x20+\x20\x27px\x27;\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20textY\x20=\x20t' + 'his.height' + _0x2787a5(_0x4bde01._0x4e3f34) + _0x2787a5(0xb7b) + _0x2787a5(_0x4bde01._0x55e6c4) + '\x20offset\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + 'previewTex' + 't.style.to' + 'p\x20=\x20textY\x20' + _0x2787a5(0x70b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'previewTex' + 't.style.le' + _0x2787a5(0x960) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20previe' + _0x2787a5(_0x4bde01._0x270e2d) + _0x2787a5(0x846) + 'm\x20=\x20\x27trans' + 'late(-50%,') + ('\x20-50%)\x27;\x20\x20' + _0x2787a5(_0x4bde01._0x2cad40) + 'to\x20center\x20' + _0x2787a5(_0x4bde01._0x5bcc7a) + 'prite\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20};\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x20else\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x58b318) + _0x2787a5(0x84b) + 'yle.displa' + 'y\x20=\x20\x27none\x27' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'previewSlo' + _0x2787a5(0xd4) + 'dth\x20=\x20\x2748p' + 'x\x27;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4d46ab) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20previewS' + 'lot.style.' + 'height\x20=\x20\x27' + '48px\x27;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d15f7) + '\x20\x20\x20\x20const\x20' + 'textY\x20=\x2024' + '\x20+\x20offsetY' + ';\x20\x20//\x20Cent' + 'er\x20of\x2048px' + _0x2787a5(_0x4bde01._0x5d1c4c) + 'fset\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2699a5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4566a8) + _0x2787a5(0x53c) + _0x2787a5(0x67e) + 'tY\x20+\x20\x27px\x27;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + 'reviewText' + '.style.lef' + _0x2787a5(_0x4bde01._0x4e9691) + _0x2787a5(_0x4bde01._0x1974db) + _0x2787a5(_0x4bde01._0x35f346) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + _0x2787a5(_0x4bde01._0x228253) + '.style.tra' + 'nsform\x20=\x20\x27' + _0x2787a5(0x6fd) + _0x2787a5(_0x4bde01._0x2dd39) + ')\x27;\x20\x20//\x20-5' + '0%\x20Y\x20to\x20ce' + 'nter\x20the\x20t' + _0x2787a5(_0x4bde01._0x148f34) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x36e832) + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20cons' + 't\x20buttons\x20' + '=\x20fullConf' + 'ig.Button.' + 'split(\x27,\x27)' + _0x2787a5(0xfc) + 'b.trim());' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2f4cde) + _0x2787a5(_0x4bde01._0x2af7e1) + _0x2787a5(_0x4bde01._0x3b02c4) + 'tContent\x20=' + '\x20buttons[0' + ']\x20||\x20\x27\x27;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5f1) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20function' + '\x20showSlotP' + 'roperties(' + 'slotName)\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20cons' + 't\x20panel\x20=\x20' + 'document.g') + ('etElementB' + _0x2787a5(0x3d5) + _0x2787a5(0x611) + _0x2787a5(_0x4bde01._0x3f9713) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20if\x20(win' + _0x2787a5(_0x4bde01._0x3d9f26) + '\x20&&\x20window' + _0x2787a5(_0x4bde01._0x1084d7) + 'tSlotPrope' + _0x2787a5(_0x4bde01._0x34b99e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20props\x20=' + '\x20window.op' + 'ener.getSl' + 'otProperti' + 'es(slotNam' + 'e);\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(0x5d8) + 's)\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20fullCon' + 'fig\x20=\x20wind' + _0x2787a5(_0x4bde01._0x30d67f) + _0x2787a5(_0x4bde01._0x244b02) + 'tConfig\x20?\x20' + _0x2787a5(0xac6) + 'ner.getFul' + 'lSlotConfi' + 'g(slotName' + ')\x20:\x20null;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x51b868) + _0x2787a5(0x3d2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20const' + '\x20names\x20=\x20f' + 'ullConfig\x20' + _0x2787a5(_0x4bde01._0xa1464b) + 'ig.Name.sp' + 'lit(\x27,\x27).m' + 'ap(n\x20=>\x20n.' + 'trim())\x20:\x20' + _0x2787a5(_0x4bde01._0x183e6b) + _0x2787a5(0x56e) + _0x2787a5(_0x4bde01._0x1c1b3a) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20button' + 's\x20=\x20fullCo' + 'nfig\x20?\x20ful' + 'lConfig.Bu' + 'tton.split' + '(\x27,\x27).map(' + 'b\x20=>\x20b.tri' + 'm())\x20:\x20[pr' + 'ops.button' + 'Text,\x20\x27\x27];' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20pane' + 'l.dataset.' + 'originalSl' + 'otName\x20=\x20s' + 'lotName;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4402df) + '\x20panel.dat' + _0x2787a5(_0x4bde01._0x3fd67f) + 'ntSlotName' + '\x20=\x20slotNam' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20pa' + 'nel.innerH' + 'TML\x20=\x20`\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c') + ('lass=\x22fiel' + _0x2787a5(_0x4bde01._0x5080ca) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x18b48e) + _0x2787a5(_0x4bde01._0x58f9b6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x481) + _0x2787a5(_0x4bde01._0x55a59b) + 'll-width\x22>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x253a09) + _0x2787a5(_0x4bde01._0x2379eb) + '\x20\x20\x20\x20\x20<labe' + 'l>Slot\x20Nam' + 'e</label>\x0a' + _0x2787a5(_0x4bde01._0x1f8275) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2eb6d8) + '\x20\x20\x20\x20<input' + _0x2787a5(_0x4bde01._0x5a1f22) + 't\x22\x20id=\x22slo' + 'tNameKb\x22\x20v' + 'alue=\x22${na' + _0x2787a5(0x264) + _0x2787a5(0x797) + _0x2787a5(_0x4bde01._0x55f45d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20onchang' + 'e=\x22updateS' + 'lotPropert' + 'ySafe(\x27nam' + 'eKb\x27,\x20this' + '.value)\x22>\x0a' + _0x2787a5(_0x4bde01._0x59a273) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '</div>\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d4438) + _0x2787a5(_0x4bde01._0x4d46ab) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x203502) + _0x2787a5(_0x4bde01._0x20561a) + 'ield\x20full-' + 'width\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20<label>T' + 'ext\x20Shown\x20' + _0x2787a5(0x4d5) + 'eyboard)</' + 'label>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x51d) + _0x2787a5(_0x4bde01._0x264c57) + 'id=\x22slotBu' + 'ttonKb\x22\x20va' + 'lue=\x22${but' + 'tons[0]\x20||' + '\x20\x27\x27}\x22\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20on' + 'change=\x22up' + 'dateSlotPr' + 'opertySafe' + _0x2787a5(_0x4bde01._0x51bf12) + _0x2787a5(_0x4bde01._0x2749a1) + _0x2787a5(_0x4bde01._0x596acd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5ce993) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20</d' + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3bd0d9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c' + _0x2787a5(0x922) + 'd\x20full-wid' + 'th\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'label>Text' + '\x20Shown\x20on\x20' + 'Slot\x20(Game') + ('pad)\x20-\x20Opt' + _0x2787a5(0x477) + _0x2787a5(0xa9b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<i' + _0x2787a5(0x8b0) + _0x2787a5(0x55a) + _0x2787a5(_0x4bde01._0x315cb8) + _0x2787a5(0x974) + '=\x22${button' + _0x2787a5(0x101) + _0x2787a5(0x5fb) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20place' + 'holder=\x22Le' + 'ave\x20empty\x20' + 'if\x20not\x20usi' + 'ng\x20gamepad' + '\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20onchang' + _0x2787a5(0x4e6) + _0x2787a5(0xa99) + 'ySafe(\x27but' + 'tonGp\x27,\x20th' + 'is.value)\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x36735a) + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'div\x20class=' + _0x2787a5(0x620) + _0x2787a5(_0x4bde01._0x5ae0b8) + _0x2787a5(_0x4bde01._0x4222b4) + _0x2787a5(_0x4bde01._0x4f5cfc) + _0x2787a5(0x9b3) + _0x2787a5(0x174) + 'Position\x20X' + '</label>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20<input\x20' + _0x2787a5(0x9de) + _0x2787a5(0x8d6) + 'sX\x22\x20value=' + '\x22${Math.ro' + _0x2787a5(_0x4bde01._0x373765) + 'x\x20||\x200)}\x22\x20' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x363e36) + _0x2787a5(0x16f) + _0x2787a5(0x989) + 'otPosition' + '(\x27x\x27,\x20pars' + _0x2787a5(0x996) + _0x2787a5(_0x4bde01._0x3acd68) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x234734) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<di' + 'v\x20class=\x22f' + 'ield\x22>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x542ccf) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20<label>Po' + _0x2787a5(_0x4bde01._0x3f324d) + _0x2787a5(0xc2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x35f346) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x40a5cb) + '\x20<input\x20ty' + 'pe=\x22number' + '\x22\x20id=\x22posY' + '\x22\x20value=\x22$') + ('{Math.roun' + 'd(props.y\x20' + _0x2787a5(_0x4bde01._0x25aa68) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x19bcd1) + _0x2787a5(_0x4bde01._0x3dd890) + 'onchange=\x22' + 'updateSlot' + 'Position(\x27' + 'y\x27,\x20parseI' + 'nt(this.va' + 'lue))\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2789c9) + '\x20\x20\x20\x20\x20\x20\x20\x20</' + 'div>\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2fcdeb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x25f) + 'class=\x22fie' + 'ld\x20full-wi' + _0x2787a5(0x2e4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3d5baf) + _0x2787a5(0x9b3) + '<label>Bac' + _0x2787a5(0x410) + 'age</label' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x375229) + '\x20style=\x22di' + 'splay:\x20fle' + 'x;\x20gap:\x205p' + _0x2787a5(_0x4bde01._0x138964) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20<input\x20' + 'type=\x22text' + '\x22\x20id=\x22slot' + 'BgImage\x22\x20v' + 'alue=\x22${fu' + _0x2787a5(0x6e1) + '\x20fullConfi' + 'g.Backgrou' + 'ndImage\x20:\x20' + '\x27\x27}\x22\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20placehold' + _0x2787a5(_0x4bde01._0x29adbe) + 'filename\x20(' + 'without\x20ex' + _0x2787a5(0xe2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20oncha' + _0x2787a5(0xa1d) + 'eSlotPrope' + 'rtySafe(\x27b' + 'ackgroundI' + 'mage\x27,\x20thi' + 's.value)\x22\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20style' + _0x2787a5(_0x4bde01._0x590ed7) + '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20<button\x20c' + _0x2787a5(0x49e) + _0x2787a5(0x487) + 'nclick=\x22se' + 'lectBackgr' + 'oundImage(' + _0x2787a5(_0x4bde01._0x1a4873) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3d33ed) + 'style=\x22pad' + 'ding:\x205px\x20' + _0x2787a5(0xa85) + 'width:\x20aut' + _0x2787a5(0x486) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20📁\x20B' + 'rowse\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20</butt' + 'on>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<button\x20' + 'class=\x22too' + 'lbar-btn\x22\x20' + 'onclick=\x22r' + _0x2787a5(_0x4bde01._0x1e5936) + _0x2787a5(0x6a8) + 'mage()\x22\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x17d434) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4d2070) + '=\x22padding:' + _0x2787a5(0xb0d) + '\x20min-width' + ':\x20auto;\x20ba' + 'ckground:\x20' + '#d32f2f;\x22\x0a' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20titl' + 'e=\x22Remove\x20' + 'background' + '\x20image\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x62a) + _0x2787a5(_0x4bde01._0x5094f4) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20</button>' + _0x2787a5(0x294) + _0x2787a5(_0x4bde01._0x19bcd1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20</div' + _0x2787a5(0x1af) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20<inp' + 'ut\x20type=\x22f' + 'ile\x22\x20id=\x22b' + 'gImageFile' + _0x2787a5(_0x4bde01._0x2d1648) + _0x2787a5(_0x4bde01._0x1aa1cb) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x19b6a8) + 'display:\x20n' + 'one;\x22\x20onch' + 'ange=\x22hand' + 'leBackgrou' + 'ndImageFil' + 'e(this)\x22>\x0a' + _0x2787a5(_0x4bde01._0x3d33b0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2d7c20) + _0x2787a5(_0x4bde01._0x5d3ba9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<di' + 'v\x20class=\x22f' + 'ield\x22>\x0a\x20\x20\x20') + (_0x2787a5(_0x4bde01._0x15fe83) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4fba6c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20<label>Bu' + 'tton\x20Text\x20' + 'Offset\x20Y</' + 'label>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x193f1f) + _0x2787a5(0x9b3) + _0x2787a5(0x51d) + 'pe=\x22number' + '\x22\x20id=\x22slot' + 'TextOffset' + '\x22\x20value=\x22$' + '{fullConfi' + 'g\x20?\x20fullCo' + _0x2787a5(_0x4bde01._0x542fca) + _0x2787a5(0x219) + _0x2787a5(_0x4bde01._0x5b62da) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x515ba2) + _0x2787a5(_0x4bde01._0x596b45) + _0x2787a5(0x35f) + 'rtySafe(\x27t' + 'extOffsetY' + _0x2787a5(0x5b0) + _0x2787a5(_0x4bde01._0x25ace4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20</d' + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c' + 'lass=\x22fiel' + _0x2787a5(0xb3b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<l' + _0x2787a5(0x6db) + _0x2787a5(_0x4bde01._0x78edb5) + _0x2787a5(_0x4bde01._0x118fde) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x298360) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20<selec' + 't\x20id=\x22slot' + 'SpecialBeh' + _0x2787a5(_0x4bde01._0x4fb57f) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4c73a8) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x501) + 'updateSlot' + 'PropertySa' + 'fe(\x27specia' + _0x2787a5(0x9ca) + ',\x20this.val' + 'ue)\x22>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20<optio' + 'n\x20value=\x22n' + _0x2787a5(0x63f) + 'ullConfig\x20' + '||\x20fullCon' + _0x2787a5(0x3c8) + _0x2787a5(0x91f) + '===\x20\x27none\x27' + ')\x20?\x20\x27selec' + _0x2787a5(_0x4bde01._0x9c5a5) + _0x2787a5(0x636) + _0x2787a5(0x23e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20<option' + '\x20value=\x22di' + 'splay_weap' + 'on\x22\x20${(ful' + _0x2787a5(0x25e) + _0x2787a5(0x6cc) + 'g.SpecialB' + 'ehavior\x20==' + _0x2787a5(0x82a)) + ('_weapon\x27)\x20' + _0x2787a5(0xaa4) + 'd\x27\x20:\x20\x27\x27}>D' + 'isplay\x20Equ' + 'ipped\x20Weap' + 'on</option' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '<option\x20va' + 'lue=\x22displ' + _0x2787a5(0x6b8) + '\x20${(fullCo' + 'nfig\x20&&\x20fu' + 'llConfig.S' + 'pecialBeha' + 'vior\x20===\x20\x27' + _0x2787a5(_0x4bde01._0xe58d29) + 'ield\x27)\x20?\x20\x27' + 'selected\x27\x20' + _0x2787a5(0xa21) + 'lay\x20Equipp' + 'ed\x20Shield<' + _0x2787a5(0x180) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<op' + 'tion\x20value' + '=\x22item_onl' + 'y\x22\x20${(full' + _0x2787a5(0x747) + 'fullConfig' + _0x2787a5(_0x4bde01._0x53dcaa) + _0x2787a5(_0x4bde01._0x6d9fc3) + '\x20\x27item_onl' + 'y\x27)\x20?\x20\x27sel' + _0x2787a5(_0x4bde01._0x168e9f) + _0x2787a5(_0x4bde01._0x34db0e) + _0x2787a5(0x57c) + _0x2787a5(_0x4bde01._0x5e4c01) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20<opti' + 'on\x20value=\x22' + 'skill_only' + '\x22\x20${(fullC' + _0x2787a5(0x9b4) + 'ullConfig.' + _0x2787a5(0x890) + _0x2787a5(_0x4bde01._0x46c28b) + '\x27skill_onl' + 'y\x27)\x20?\x20\x27sel' + 'ected\x27\x20:\x20\x27' + _0x2787a5(0x48b) + _0x2787a5(0x9cd) + 'option>\x0a\x20\x20' + _0x2787a5(_0x4bde01._0xe5e311) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x52bbbb) + '\x20\x20</select' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4402df) + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1766b8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xae7) + _0x2787a5(0x1af) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20`;\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x253a09) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2699a5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20updatePr' + 'eview(slot' + 'Name);\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x51f9c7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4e0) + _0x2787a5(_0x4bde01._0x35f346) + '\x20\x20\x20\x20\x20\x20func' + _0x2787a5(0x731)) + ('eSlotPrope' + 'rtySafe(pr' + 'operty,\x20va' + 'lue)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20pan' + 'el\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + _0x2787a5(0x315) + 'Panel\x27);\x0a\x20' + _0x2787a5(_0x4bde01._0x5ddeb7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20c' + 'urrentName' + '\x20=\x20panel.d' + 'ataset.cur' + 'rentSlotNa' + 'me;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xae8) + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20if\x20(win' + 'dow.opener' + '\x20&&\x20window' + _0x2787a5(0x161) + 'dateSlotPr' + 'operty)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x144) + 'nst\x20result' + '\x20=\x20window.' + 'opener.upd' + 'ateSlotPro' + 'perty(curr' + _0x2787a5(_0x4bde01._0x1e72a5) + 'urrentName' + ',\x20property' + ',\x20value);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(property\x20' + '===\x20\x27nameK' + _0x2787a5(0x5d9) + 'lt\x20&&\x20resu' + 'lt.newName' + _0x2787a5(0x17e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20pane' + 'l.dataset.' + 'currentSlo' + _0x2787a5(_0x4bde01._0x5bd9be) + 'sult.newNa' + _0x2787a5(_0x4bde01._0x4c08ea) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20curr' + 'entSlot\x20=\x20' + _0x2787a5(0x454) + _0x2787a5(0x5ed) + _0x2787a5(_0x4bde01._0x1543a3) + 'ent\x20slot\x20r' + 'eference\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x55f45d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(wi' + 'ndow.opene' + _0x2787a5(_0x4bde01._0x331e49) + 'w.opener.l' + _0x2787a5(_0x4bde01._0x81f757) + 'ts)\x20{\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x211655) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1b041c) + 'pener.load' + 'GridSlots(' + 'currentGri' + _0x2787a5(0xaba) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20updateP' + 'review(res' + 'ult.newNam' + _0x2787a5(_0x4bde01._0x4815e2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x20else\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x503289) + '\x20\x20\x20updateP' + 'review(cur' + 'rentName);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9ee) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xa3a652) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'function\x20u' + 'pdateSlotP' + 'osition(ax' + 'is,\x20value)' + _0x2787a5(0x432) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3a3ef9) + _0x2787a5(0x542) + _0x2787a5(0x970) + 'ndow.opene' + 'r.updateSl' + 'otPosition' + _0x2787a5(_0x4bde01._0x22619c) + 'tSlot)\x20{\x0a\x20' + _0x2787a5(_0x4bde01._0x1df239) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x800) + 'dow.opener' + '.updateSlo' + 'tPosition(' + _0x2787a5(_0x4bde01._0x4e0887) + 't,\x20axis,\x20v' + _0x2787a5(_0x4bde01._0x3cff46) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20func' + _0x2787a5(_0x4bde01._0x5e19dc) + 'ntCreateSl' + _0x2787a5(0xb65) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4297fe) + _0x2787a5(0x8c5) + _0x2787a5(_0x4bde01._0x449c3f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20ale' + _0x2787a5(_0x4bde01._0x309dcc) + '\x20select\x20a\x20' + 'grid\x20first' + '!\x27);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x6fe) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x7dbb95) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20ex' + _0x2787a5(_0x4bde01._0x45bb31) + 's\x20=\x20docume' + 'nt.querySe' + 'lectorAll(' + '\x27#slotsLis' + _0x2787a5(_0x4bde01._0x5e8a40) + 'em\x27).lengt' + 'h;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x543e9e) + 'st\x20slotNum' + 'ber\x20=\x20exis' + _0x2787a5(_0x4bde01._0x1c29b0) + '+\x201;\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20slot' + 'Config\x20=\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x322) + 'ame:\x20\x27New\x20' + 'Slot\x20\x27\x20+\x20s') + ('lotNumber,' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20b' + 'utton:\x20\x27Ke' + 'y\x27\x20+\x20slotN' + 'umber,\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20x:\x2040' + '0,\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x12cb90) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20bac' + 'kgroundIma' + 'ge:\x20\x27\x27,\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20text' + 'OffsetY:\x200' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xe87ea6) + _0x2787a5(0x9b3) + 'specialBeh' + 'avior:\x20\x27no' + 'ne\x27\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20};' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x2787a5(_0x4bde01._0x51ef11) + _0x2787a5(0x2e8) + 'dow.opener' + '.createNew' + 'Slot)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20wind' + _0x2787a5(0x14a) + _0x2787a5(_0x4bde01._0x1600d0) + 'lot(curren' + 'tGrid,\x20slo' + _0x2787a5(_0x4bde01._0x475cd4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x5c7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20f' + 'unction\x20se' + 'lectBackgr' + 'oundImage(' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x144) + _0x2787a5(0x2d5) + 'put\x20=\x20docu' + 'ment.getEl' + _0x2787a5(_0x4bde01._0x756ab2) + _0x2787a5(_0x4bde01._0x53c091) + 'leInput\x27);' + _0x2787a5(_0x4bde01._0x1974db) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(f' + _0x2787a5(0xb8c) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'fileInput.' + _0x2787a5(0x330) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x43f091) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x2b1a33) + 'nction\x20han' + 'dleBackgro' + _0x2787a5(0x273) + 'le(input)\x20' + _0x2787a5(_0x4bde01._0x38f4d3) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x55af78) + '!input.fil' + 'es\x20||\x20!inp' + 'ut.files[0' + _0x2787a5(_0x4bde01._0x4e342e) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + _0x2787a5(_0x4bde01._0x2572e7) + 'nput.files' + _0x2787a5(_0x4bde01._0x858078) + _0x2787a5(0x9b3)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20reade' + _0x2787a5(0x5f6) + _0x2787a5(_0x4bde01._0x6d483e) + _0x2787a5(_0x4bde01._0xf3e7d4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20rea' + 'der.onload' + '\x20=\x20functio' + 'n(e)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x2787a5(_0x4bde01._0x16b3a8) + '=\x20e.target' + '.result;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20fileNam' + _0x2787a5(0x591) + 'ame;\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x3e6942) + 'ndow.opene' + _0x2787a5(0x536) + 'w.opener.c' + 'opyBackgro' + 'undImage)\x20' + _0x2787a5(_0x4bde01._0x38f4d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x26bfcf) + '.opener.co' + 'pyBackgrou' + 'ndImage(fi' + 'leData,\x20fi' + 'leName,\x20fu' + _0x2787a5(_0x4bde01._0x2778ad) + 'cess,\x20imag' + 'eNameWitho' + 'utExt)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4ab) + 'uccess)\x20{\x0a' + _0x2787a5(_0x4bde01._0x1f8275) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20bgIm' + _0x2787a5(0x506) + _0x2787a5(_0x4bde01._0xca0682) + 'getElement' + _0x2787a5(0x9c9) + 'BgImage\x27);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x38780f) + _0x2787a5(0x175) + _0x2787a5(0x183) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20bgIma' + _0x2787a5(0x6af) + 'lue\x20=\x20imag' + _0x2787a5(0x8c1) + 'utExt;\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1df239) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x5d750d) + 'tPropertyS' + 'afe(\x27backg' + 'roundImage' + '\x27,\x20imageNa' + 'meWithoutE' + 'xt);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x72d) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x43ed62) + 'ailed\x20to\x20c' + 'opy\x20backgr' + _0x2787a5(0x1bc)) + (_0x2787a5(0x897) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xb41ae8) + _0x2787a5(0x9b3) + _0x2787a5(0xb85) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x10ce29) + '});\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x40a5cb) + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1aaf80) + '\x20\x20\x20\x20\x20\x20\x20\x20};' + _0x2787a5(0xaa9) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20read' + _0x2787a5(_0x4bde01._0x5d9414) + 'ataURL(fil' + 'e);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + _0x2787a5(_0x4bde01._0x5e4abb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x93b) + _0x2787a5(_0x4bde01._0x5e9ef9) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20functi' + _0x2787a5(0x55f) + 'GridSlots(' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(currentG' + 'rid\x20===\x20nu' + 'll)\x20{\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20alert(' + _0x2787a5(0x1b4) + 'lect\x20a\x20gri' + _0x2787a5(0x56f) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'return;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20rows\x20' + '=\x20parseInt' + '(document.' + 'getElement' + 'ById(\x27grid' + 'Rows\x27).val' + 'ue)\x20||\x202;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20const\x20' + 'columns\x20=\x20' + 'parseInt(d' + 'ocument.ge' + 'tElementBy' + _0x2787a5(_0x4bde01._0x278910) + 'lumns\x27).va' + 'lue)\x20||\x205;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20padding\x20=' + '\x20parseInt(' + 'document.g' + 'etElementB' + 'yId(\x27gridP' + 'adding\x27).v' + 'alue)\x20||\x201' + _0x2787a5(0x1c3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(window.o' + 'pener\x20&&\x20w' + 'indow.open' + _0x2787a5(0x6ee) + 'GridSlots)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20window.op' + 'ener.arran' + _0x2787a5(0xaa0) + 's(currentG' + 'rid,\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1df239) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20r') + ('ows:\x20rows,' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20columns' + ':\x20columns,' + _0x2787a5(_0x4bde01._0x3e215c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x35f346) + '\x20\x20\x20padding' + ':\x20padding\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20})' + _0x2787a5(0x439) + _0x2787a5(_0x4bde01._0x3f1ea8) + _0x2787a5(0xb85) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20function\x20' + 'selectGrid' + _0x2787a5(_0x4bde01._0x39c6eb) + 'Image()\x20{\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + _0x2787a5(_0x4bde01._0x47ce9b) + '=\x20document' + '.getElemen' + 'tById(\x27gri' + _0x2787a5(_0x4bde01._0x1a3b1d) + _0x2787a5(0x4f9) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(f' + 'ileInput)\x20' + _0x2787a5(_0x4bde01._0xe2f879) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x669e1f) + _0x2787a5(_0x4bde01._0x410ac9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20fu' + 'nction\x20han' + 'dleGridBac' + _0x2787a5(0x575) + 'geFile(inp' + 'ut)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x18731c) + 'if\x20(!input' + '.files\x20||\x20' + '!input.fil' + _0x2787a5(0x70e) + 'urn;\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2fc508) + _0x2787a5(0x2d2) + '\x20=\x20input.f' + 'iles[0];\x0a\x20' + _0x2787a5(_0x4bde01._0x1bcfb6) + _0x2787a5(_0x4bde01._0x4d526a) + _0x2787a5(_0x4bde01._0x178886) + _0x2787a5(0x6da) + 'w\x20FileRead' + 'er();\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20reader.on' + 'load\x20=\x20fun' + _0x2787a5(0xb34) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x234734) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20fileD' + 'ata\x20=\x20e.ta' + 'rget.resul' + 't;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20const\x20fil' + 'eName\x20=\x20fi' + 'le.name;\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(window.o' + _0x2787a5(_0x4bde01._0x598fdd) + 'indow.open' + 'er.copyBac' + _0x2787a5(0x575) + _0x2787a5(_0x4bde01._0x269f19) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + (_0x2787a5(_0x4bde01._0x88e100) + '\x20\x20\x20\x20\x20\x20\x20\x20wi' + 'ndow.opene' + 'r.copyBack' + _0x2787a5(0xad6) + 'e(fileData' + _0x2787a5(_0x4bde01._0x9d9af7) + ',\x20function' + '(success,\x20' + _0x2787a5(_0x4bde01._0x338117) + _0x2787a5(_0x4bde01._0x4a22d3) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x52bbbb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(success' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x961) + 'bgImageInp' + 'ut\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + _0x2787a5(_0x4bde01._0x389a48) + 'oundImage\x27' + _0x2787a5(0x895) + _0x2787a5(_0x4bde01._0x5ddeb7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(bgI' + 'mageInput)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x3dd) + 'mageInput.' + _0x2787a5(0x3dc) + 'ageNameWit' + _0x2787a5(_0x4bde01._0x1f0a28) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x7a4) + 'ridBackgro' + _0x2787a5(0xa0b) + 'mageNameWi' + _0x2787a5(0x5ab) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5f1) + _0x2787a5(_0x4bde01._0x2b1ee2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0xfeaefe) + 'ert(\x27Faile' + _0x2787a5(0x634) + 'background' + '\x20image\x20fil' + 'e.\x27);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x5b2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x2787a5(_0x4bde01._0x38780f) + _0x2787a5(_0x4bde01._0x4fba6c) + '\x20\x20\x20\x20};\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2cfeb6) + '\x20\x20reader.r' + 'eadAsDataU' + 'RL(file);\x0a' + _0x2787a5(_0x4bde01._0xb89aa2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x911) + _0x2787a5(_0x4bde01._0x2aba9e) + _0x2787a5(0x439) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20funct' + 'ion\x20update' + _0x2787a5(0x1e8) + 'oundImage(' + _0x2787a5(_0x4bde01._0x315e6a)) + (_0x2787a5(_0x4bde01._0x5ebbb1) + _0x2787a5(_0x4bde01._0x36e832) + '\x20\x20\x20\x20\x20\x20\x20if\x20' + _0x2787a5(0x600) + _0x2787a5(0x708) + _0x2787a5(0x1f4) + _0x2787a5(_0x4bde01._0x31ffb0) + _0x2787a5(0x9b3) + _0x2787a5(0x4cf) + _0x2787a5(_0x4bde01._0x51ef11) + 'ner\x20&&\x20win' + 'dow.opener' + _0x2787a5(_0x4bde01._0x2ae0d0) + 'dBackgroun' + _0x2787a5(_0x4bde01._0x45d82e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x31b4d5) + 'ndow.opene' + _0x2787a5(_0x4bde01._0xada5d1) + 'idBackgrou' + 'ndImage(cu' + 'rrentGrid,' + '\x20imageName' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1bcfb6) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x2787a5(_0x4bde01._0x1d15f7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + _0x2787a5(0xaa9) + _0x2787a5(_0x4bde01._0x4897d9) + '\x20\x20function' + _0x2787a5(_0x4bde01._0x2cb19e) + 'dBackgroun' + 'dImage()\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(c' + 'urrentGrid' + '\x20===\x20null)' + '\x20return;\x0a\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x961) + _0x2787a5(_0x4bde01._0xdb5421) + 'ut\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + 'gridBackgr' + _0x2787a5(_0x4bde01._0x51564f) + _0x2787a5(_0x4bde01._0x5327f5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(bgImageIn' + 'put)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20bgIma' + 'geInput.va' + 'lue\x20=\x20\x27\x27;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20up' + 'dateGridBa' + 'ckgroundIm' + 'age(\x27\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x47c) + _0x2787a5(_0x4bde01._0x8dc5c9) + '\x20\x20\x20\x20\x20\x20\x20\x20fu' + 'nction\x20upd' + 'ateGridPos' + _0x2787a5(0x491) + ',\x20value)\x20{' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(c' + 'urrentGrid' + _0x2787a5(_0x4bde01._0x1486bb) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xb51) + 'ease\x20selec' + 't\x20a\x20grid\x20f' + 'irst!\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20ret' + _0x2787a5(_0x4bde01._0x1479a9) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4534d1) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20numValue' + '\x20=\x20parseFl') + ('oat(value)' + _0x2787a5(_0x4bde01._0x8d5728) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(windo' + 'w.opener\x20&' + '&\x20window.o' + _0x2787a5(0x95f) + _0x2787a5(0x188) + 'tion)\x20{\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20wind' + 'ow.opener.' + 'updateGrid' + 'Position(c' + 'urrentGrid' + _0x2787a5(_0x4bde01._0x6ac74) + _0x2787a5(0x5fe) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x7dbb95) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20fu' + 'nction\x20res' + 'etGridBack' + 'groundPosi' + _0x2787a5(0x35c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(cur' + _0x2787a5(_0x4bde01._0x19cbc3) + '==\x20null)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20a' + 'lert(\x27Plea' + 'se\x20select\x20' + 'a\x20grid\x20fir' + 'st!\x27);\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20retur' + 'n;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(wi' + 'ndow.opene' + _0x2787a5(0x536) + _0x2787a5(0x9ba) + _0x2787a5(_0x4bde01._0x2f0008) + 'ckgroundPo' + _0x2787a5(_0x4bde01._0x16687f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20wi' + 'ndow.opene' + 'r.resetGri' + 'dBackgroun' + _0x2787a5(_0x4bde01._0x48de6f) + 'currentGri' + 'd);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20functio' + 'n\x20updateGr' + 'idGamepadC' + 'ontrollabl' + 'e(isContro' + 'llable)\x20{\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(cu' + 'rrentGrid\x20' + _0x2787a5(0xa48) + 'return;\x0a\x0a\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20if\x20(win' + 'dow.opener' + '\x20&&\x20window' + '.opener.up' + _0x2787a5(_0x4bde01._0x3094d4) + _0x2787a5(_0x4bde01._0xd393d5) + 'ollable)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20w' + 'indow.open' + _0x2787a5(0x5f9) + 'ridGamepad' + 'Controllab') + (_0x2787a5(_0x4bde01._0x324606) + 'Grid,\x20isCo' + 'ntrollable' + _0x2787a5(_0x4bde01._0x2ab0d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5cbd25) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4534d1) + _0x2787a5(0xaa9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x965) + '\x20removeSlo' + _0x2787a5(_0x4bde01._0x59b9f1) + 'dImage()\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20bgImageIn' + _0x2787a5(0xa82) + 'ment.getEl' + 'ementById(' + '\x27slotBgIma' + _0x2787a5(0xa35) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + 'if\x20(bgImag' + 'eInput)\x20{\x0a' + _0x2787a5(_0x4bde01._0x3bd0d9) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20bg' + 'ImageInput' + '.value\x20=\x20\x27' + _0x2787a5(_0x4bde01._0x1ade0b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4fc) + 'tPropertyS' + 'afe(\x27backg' + _0x2787a5(_0x4bde01._0x2c1787) + _0x2787a5(0x268) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x95b) + _0x2787a5(_0x4bde01._0x10b9f3) + '\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20fun' + 'ction\x20dele' + 'teSlot(slo' + 'tName)\x20{\x0a\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(cur' + 'rentGrid\x20=' + '==\x20null)\x20{' + _0x2787a5(0x294) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x763) + 'lert(\x27No\x20g' + _0x2787a5(_0x4bde01._0x1f287b) + 'ed!\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x171747) + '\x20\x20\x20\x20\x20retur' + 'n;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x45c320) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(wi' + 'ndow.opene' + 'r\x20&&\x20windo' + 'w.opener.d' + 'eleteSlot)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x964) + 'ener.delet' + 'eSlot(curr' + 'entGrid,\x20s' + _0x2787a5(_0x4bde01._0x2c54bf) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x204446) + 'unction\x20cr' + 'eateNewGri' + 'd()\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1b763a) + 'if\x20(window' + '.opener\x20&&' + _0x2787a5(0x964) + _0x2787a5(0xa7c) + _0x2787a5(_0x4bde01._0x3b3fee) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'window.ope' + _0x2787a5(0x401) + 'NewGrid();' + _0x2787a5(_0x4bde01._0x3e215c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'function\x20d' + 'eleteGrid(' + _0x2787a5(_0x4bde01._0x12f8b0) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(window.op' + 'ener\x20&&\x20wi' + _0x2787a5(_0x4bde01._0x5dbe78) + 'r.deleteGr' + 'id)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20window' + _0x2787a5(_0x4bde01._0x23db23) + 'leteGrid(g' + 'ridIndex);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4d0dd7) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x27327f) + 'resetPosit' + 'ions()\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(con' + 'firm(\x27Rese' + _0x2787a5(_0x4bde01._0x37d6bb) + _0x2787a5(_0x4bde01._0x5bfc85) + '\x20to\x20defaul' + 't?\x20This\x20ca' + _0x2787a5(0x4ff) + _0x2787a5(_0x4bde01._0x5be22e) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2ea35e) + 'f\x20(window.' + 'opener\x20&&\x20' + 'window.ope' + 'ner.resetA' + 'llPosition' + 's)\x20{\x0a\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x416428) + _0x2787a5(_0x4bde01._0x5e6382) + _0x2787a5(0x66a) + '.resetAllP' + _0x2787a5(0x484) + _0x2787a5(_0x4bde01._0x322762) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20alert(' + '\x27Positions' + _0x2787a5(_0x4bde01._0x45192b) + _0x2787a5(0x842) + _0x2787a5(_0x4bde01._0x430ea5) + _0x2787a5(_0x4bde01._0x19cd6a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1620e0) + '\x20updateGri' + 'dButton(is' + 'Active)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20functio' + 'n\x20updateSn' + 'apButton(i' + 'sActive)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5c2bc6) + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5b309f) + _0x2787a5(_0x4bde01._0x423229)) + ('dsList\x20=\x20f' + _0x2787a5(_0x4bde01._0xbc536) + 'ids)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20lis' + 't\x20=\x20docume' + 'nt.getElem' + _0x2787a5(0xb89) + 'ridsList\x27)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x2787a5(_0x4bde01._0x4bd7a3) + 'grids.leng' + 'th\x20===\x200)\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xf421d5) + _0x2787a5(0x883) + 'HTML\x20=\x20\x27<d' + 'iv\x20class=\x22' + 'empty-stat' + 'e\x22>No\x20grid' + 's\x20configur' + 'ed\x20in\x20plug' + _0x2787a5(0x22c) + 'ers</div>\x27' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3b461f) + 'return;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + _0x2787a5(0x7d4) + _0x2787a5(_0x4bde01._0x32c465) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x3fd) + 'forEach((g' + 'rid,\x20index' + _0x2787a5(_0x4bde01._0x55c7c4) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20item\x20=\x20do' + 'cument.cre' + 'ateElement' + '(\x27div\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20ite' + _0x2787a5(_0x4bde01._0xa9924c) + 'e\x20=\x20\x27list-' + _0x2787a5(0x975) + 'ndex\x20===\x20c' + _0x2787a5(_0x4bde01._0x3ed286) + '\x20?\x20\x27\x20activ' + _0x2787a5(_0x4bde01._0x4b4c8e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x96df54) + _0x2787a5(0xadb) + 'rid_\x27\x20+\x20in' + _0x2787a5(0x16a) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x248) + _0x2787a5(_0x4bde01._0xea5b6a) + '\x20=>\x20select' + 'Grid(index' + _0x2787a5(_0x4bde01._0x52dc9c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20const\x20na' + 'me\x20=\x20docum' + 'ent.create' + 'Element(\x27d' + 'iv\x27);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xa04153) + _0x2787a5(_0x4bde01._0x1f02cc) + _0x2787a5(0xa46) + '\x20\x27list-ite' + 'm-name\x27;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20nam' + 'e.textCont' + 'ent\x20=\x20`Gri' + 'd\x20#${index' + _0x2787a5(0x140) + 'rid.slotCo' + _0x2787a5(_0x4bde01._0x5117fb) + ')`;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20name.sty' + 'le.flex\x20=\x20' + '\x271\x27;\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'deleteBtn\x20' + _0x2787a5(0x12f) + '.createEle' + 'ment(\x27butt' + 'on\x27);\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x4cb) + 'Btn.textCo' + 'ntent\x20=\x20\x27✕' + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20deleteBtn' + _0x2787a5(_0x4bde01._0x4af1fa) + _0x2787a5(_0x4bde01._0x5d6b43) + '-slot-btn\x27' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + 'deleteBtn.' + _0x2787a5(_0x4bde01._0x27d9b7) + 'elete\x20this' + _0x2787a5(0x5e0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20dele' + 'teBtn.oncl' + 'ick\x20=\x20(e)\x20' + '=>\x20{\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x660b1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x704) + _0x2787a5(_0x4bde01._0x32769b) + _0x2787a5(_0x4bde01._0x1261c8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x8636b7) + 'deleteGrid' + _0x2787a5(_0x4bde01._0x3da4ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x50e) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2ea35e) + _0x2787a5(_0x4bde01._0x56b1e5) + _0x2787a5(0x858) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4cbbe3) + _0x2787a5(0x9b3) + '\x20item.appe' + 'ndChild(de' + 'leteBtn);\x0a' + _0x2787a5(_0x4bde01._0x10ce29) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20li' + 'st.appendC' + _0x2787a5(_0x4bde01._0x47664e) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20});\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '};\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20window' + _0x2787a5(0x306) + _0x2787a5(0x90b) + 'unction(sl' + _0x2787a5(0x645) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20const\x20lis' + 't\x20=\x20docume' + 'nt.getElem' + 'entById(\x27s' + 'lotsList\x27)' + _0x2787a5(0x439) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x55af78) + 'currentGri' + 'd\x20===\x20null' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1203c6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20list.inn' + _0x2787a5(_0x4bde01._0x2b08f3) + '<div\x20class' + '=\x22empty-st' + _0x2787a5(0x84f) + 't\x20a\x20grid\x20f' + _0x2787a5(0x587) + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x24e) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4b8992) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + _0x2787a5(_0x4bde01._0x1e0c63) + '||\x20slots.l' + 'ength\x20===\x20' + '0)\x20{\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d4bc8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20list.in' + 'nerHTML\x20=\x20' + _0x2787a5(_0x4bde01._0xccd2be) + _0x2787a5(_0x4bde01._0x522881) + 'tate\x22>No\x20s' + 'lots\x20in\x20th' + 'is\x20grid</d' + 'iv>\x27;\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5e22a2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x56cb4e) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x56fa8c) + '\x20\x20\x20list.in' + _0x2787a5(0x762) + '\x27\x27;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1bbd10) + 'ots.forEac' + 'h(slot\x20=>\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + 'const\x20item' + _0x2787a5(_0x4bde01._0x23d27e) + _0x2787a5(0x11e) + 'ement(\x27div' + '\x27);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20sa' + 'feId\x20=\x20slo' + 't.name.rep' + 'lace(/[^a-' + 'zA-Z0-9]/g' + ',\x20\x27_\x27);\x0a\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x485b70) + _0x2787a5(0x563) + '\x20=\x20\x27list-i' + 'tem\x27\x20+\x20(sl' + 'ot.name\x20==' + '=\x20currentS' + 'lot\x20?\x20\x27\x20ac' + _0x2787a5(_0x4bde01._0x2f7ad6) + _0x2787a5(_0x4bde01._0x283596) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1c7d87) + '\x20\x27slot_\x27\x20+' + '\x20safeId;\x0a\x20' + _0x2787a5(_0x4bde01._0x8636b7) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20ite' + 'm.onclick\x20' + '=\x20()\x20=>\x20se' + 'lectSlot(s' + _0x2787a5(0x7b7) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0xcd386c) + '\x20=\x20documen' + 't.createEl' + _0x2787a5(0x7db) + '\x27);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x29a317) + 'ssName\x20=\x20\x27' + _0x2787a5(_0x4bde01._0x149014) + _0x2787a5(_0x4bde01._0x46370e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20name.' + 'textConten' + 't\x20=\x20slot.n' + _0x2787a5(0x86f) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20name.st' + 'yle.flex\x20=') + (_0x2787a5(0x29c) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20deleteBtn' + '\x20=\x20documen' + 't.createEl' + _0x2787a5(0x605) + _0x2787a5(0xb23) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4a5efe) + '\x20\x20\x20\x20\x20delet' + 'eBtn.textC' + _0x2787a5(0x8f1) + '✕\x27;\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20deleteBt' + _0x2787a5(_0x4bde01._0xebed5) + 'e\x20=\x20\x27delet' + 'e-slot-btn' + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x4b8992) + _0x2787a5(_0x4bde01._0x12eada) + '.title\x20=\x20\x27' + 'Delete\x20thi' + 's\x20slot\x27;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20del' + 'eteBtn.onc' + 'lick\x20=\x20(e)' + '\x20=>\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x859) + 'stopPropag' + _0x2787a5(_0x4bde01._0xb01a6) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x2cb2fc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20deleteSlo' + 't(slot.nam' + 'e);\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20};\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20item.a' + _0x2787a5(0x67d) + '(name);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x485b70) + '.appendChi' + _0x2787a5(_0x4bde01._0x246b31) + 'tn);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20list.ap' + _0x2787a5(_0x4bde01._0x57c5b0) + _0x2787a5(0x568) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20});\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20};\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x7c4) + _0x2787a5(_0x4bde01._0xb88f99) + _0x2787a5(0xb79) + 'tionFields' + '\x20=\x20functio' + 'n(slotName' + ',\x20x,\x20y)\x20{\x0a' + _0x2787a5(_0x4bde01._0x28add6) + _0x2787a5(_0x4bde01._0x5d2db0) + '\x20\x20\x20\x20if\x20(sl' + _0x2787a5(_0x4bde01._0x342b88) + _0x2787a5(0x85f) + 'ot)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'posXInput\x20' + '=\x20document' + _0x2787a5(0x87e) + _0x2787a5(_0x4bde01._0x4a4bf5) + _0x2787a5(0xb33) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20const\x20p' + 'osYInput\x20=' + '\x20document.' + _0x2787a5(0x134) + _0x2787a5(_0x4bde01._0x1ef00e) + _0x2787a5(_0x4bde01._0x3f9713) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + (_0x2787a5(0x9b3) + '\x20\x20if\x20(posX' + _0x2787a5(_0x4bde01._0x3b9771) + _0x2787a5(0x8c2) + 'ue\x20=\x20Math.' + 'round(x);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(posYInpu' + 't)\x20posYInp' + 'ut.value\x20=' + '\x20Math.roun' + 'd(y);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20};\x0a\x0a\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20wind' + _0x2787a5(_0x4bde01._0x16a13e) + 'lotFromGam' + 'e\x20=\x20functi' + _0x2787a5(0x71a) + 'e)\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xa2b) + 'f\x20(window.' + 'opener\x20&&\x20' + _0x2787a5(_0x4bde01._0x338178) + _0x2787a5(0xb76) + 'idForSlot)' + _0x2787a5(_0x4bde01._0x5d09cb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20gri' + _0x2787a5(0xf8) + 'indow.open' + _0x2787a5(0x7fd) + 'dForSlot(s' + 'lotName);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(gridInde' + 'x\x20!==\x20null' + '\x20&&\x20gridIn' + _0x2787a5(0xb3d) + 'rrentGrid)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x509189) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20selec' + 'tGrid(grid' + 'Index);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4897d9) + _0x2787a5(0x5f7) + 'Slot\x20=\x20slo' + 'tName;\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x243b85) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20docu' + 'ment.query' + _0x2787a5(_0x4bde01._0x1bffea) + 'l(\x27#slotsL' + 'ist\x20.list-' + _0x2787a5(0x517) + _0x2787a5(0x586) + '=>\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20item.cl' + 'assList.re' + _0x2787a5(_0x4bde01._0x15c2b6) + 've\x27);\x0a\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3f864b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '});\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x144) + 'nst\x20elemen' + 't\x20=\x20docume' + 'nt.getElem' + _0x2787a5(_0x4bde01._0x40e9ee) + 'lot_\x27\x20+\x20sl' + 'otName.rep' + 'lace(/[^a-' + 'zA-Z0-9]/g') + (_0x2787a5(_0x4bde01._0x23f6b9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20if\x20(ele' + 'ment)\x20{\x0a\x20\x20' + _0x2787a5(_0x4bde01._0x14e9cb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20elem' + _0x2787a5(0x560) + 'ist.add(\x27a' + 'ctive\x27);\x0a\x20' + _0x2787a5(_0x4bde01._0x193f16) + _0x2787a5(_0x4bde01._0x243b85) + _0x2787a5(0x47d) + 'ment.scrol' + 'lIntoView(' + '{\x20behavior' + _0x2787a5(_0x4bde01._0x4a4827) + ',\x20block:\x20\x27' + 'nearest\x27\x20}' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20showSl' + 'otProperti' + 'es(slotNam' + _0x2787a5(_0x4bde01._0x4815e2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20};\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xb61) + 'cument.add' + 'EventListe' + _0x2787a5(0x4f7) + 'ntentLoade' + 'd\x27,\x20functi' + _0x2787a5(0x86e) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x2b5) + 'addEventLi' + 'stener(\x27wh' + _0x2787a5(0x543) + _0x2787a5(_0x4bde01._0x277f66) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1b73b1) + '\x20(e.target' + _0x2787a5(_0x4bde01._0x60e73e) + _0x2787a5(_0x4bde01._0x4e81f2) + _0x2787a5(_0x4bde01._0x38f4d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20e.prev' + _0x2787a5(_0x4bde01._0x44ee70) + _0x2787a5(0x848) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20input' + _0x2787a5(_0x4bde01._0x18ebfe) + _0x2787a5(_0x4bde01._0x255b98) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20step\x20=\x20pa' + 'rseFloat(i' + 'nput.step)' + '\x20||\x201;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x2787a5(0x72a) + 'ntValue\x20=\x20' + 'parseFloat' + _0x2787a5(0x772) + 'ue)\x20||\x200;\x0a' + _0x2787a5(0x9b3) + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x1d15f7) + '\x20\x20\x20\x20\x20if\x20(e' + _0x2787a5(_0x4bde01._0x11efc8) + _0x2787a5(_0x4bde01._0x5a41d1) + _0x2787a5(_0x4bde01._0x1971c4) + _0x2787a5(0x9b3) + _0x2787a5(_0x4bde01._0x31639b) + _0x2787a5(0x662) + _0x2787a5(_0x4bde01._0x512bfc) + 'ntValue\x20+\x20' + 'step;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + (_0x2787a5(_0x4bde01._0x2561fa) + 'else\x20{\x0a\x20\x20\x20' + _0x2787a5(_0x4bde01._0x5356cd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20input.v' + _0x2787a5(0x913) + _0x2787a5(0x7d7) + '-\x20step;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x25ff80) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x57b551) + _0x2787a5(_0x4bde01._0x2bca5c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(input.min' + _0x2787a5(0x25c) + '\x20parseFloa' + 't(input.va' + _0x2787a5(0x5c8) + _0x2787a5(0x822) + 'put.min))\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x3d33b0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20in' + 'put.value\x20' + _0x2787a5(_0x4bde01._0x3d3a93) + 'n;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9ee) + _0x2787a5(_0x4bde01._0x3bd0d9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + _0x2787a5(0xb83) + 'ax\x20!==\x20\x27\x27\x20' + _0x2787a5(0x8f9) + 'oat(input.' + 'value)\x20>\x20p' + 'arseFloat(' + 'input.max)' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2bd0a4) + _0x2787a5(_0x4bde01._0x38780f) + _0x2787a5(0x9b3) + 'input.valu' + 'e\x20=\x20input.' + 'max;\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x55ca98) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x2787a5(_0x4bde01._0x1d305b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x2f67b9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x911) + _0x2787a5(_0x4bde01._0x24862a) + _0x2787a5(0x70d) + 'ent(\x27chang' + 'e\x27,\x20{\x20bubb' + _0x2787a5(0x4c8) + '}));\x0a\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x4402df) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0xb10) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + _0x2787a5(_0x4bde01._0x59aa9f) + 'e:\x20false\x20}' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(0x9b3) + '\x20\x20\x20});\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x2787a5(_0x4bde01._0x123e2a) + 't>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20</bod' + 'y>\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20')), VisualEditorWindow['document'][_0x2787a5(_0x4bde01._0x1b95f7)](), window[_0x2787a5(_0x4bde01._0x5d8d22) + _0x2787a5(_0x4bde01._0x44791b) + 's'] = function (_0x34335d) { const _0x23a9a6 = _0x2787a5; saveHotbarPositions(_0x34335d); if (VisualEditorWindow && !VisualEditorWindow[_0x23a9a6(_0x26d371._0x1dc7af)] && _0x34335d) for (const _0x4b429a in _0x34335d) { const _0x55185e = _0x34335d[_0x4b429a]; _0x55185e && VisualEditorWindow['updateSlot' + 'PositionFi' + _0x23a9a6(_0x26d371._0x1270b5)] && VisualEditorWindow['updateSlot' + _0x23a9a6(0xb44) + _0x23a9a6(_0x26d371._0x341f86)](_0x4b429a, _0x55185e['x'], _0x55185e['y']); } }, setTimeout(() => { const _0xc52637 = _0x2787a5; 'ngXGA' !== 'ngXGA' ? _0x4d60cd[_0xc52637(_0x564fa4._0x3a8ab3) + 'w'] && (_0x2cd5b4['removeChil' + 'd'](_0x16cd61['_editorGlo' + 'w']), _0x53d1ca[_0xc52637(0x4be) + 'w'] = null) : updateEditorLists(); }, -0xe4b * 0x2 + 0x3cc + 0x192e); const _0xf50c21 = setInterval(() => { if ('KCqis' !== 'KCqis') return; else VisualEditorWindow && VisualEditorWindow['closed'] && (clearInterval(_0xf50c21), clearInterval(_0x4046ea), disableEditorMode()); }, -0x22d9 * -0x1 + 0x1 * 0x1003 + -0x30e8); let _0x5bc192 = SceneManager['_scene']; const _0x4046ea = setInterval(() => { const _0x2eb48b = { _0x296bf2: 0x427, _0x1906e7: 0xb1d, _0x156d7d: 0x853, _0x5c34a5: 0x5b9, _0x24ecd2: 0x1e4 }, _0x53c4c2 = _0x2787a5; if ('ynUSi' === _0x53c4c2(0xb05)) { const _0x266e7c = _0x3870dd['pageToCanv' + _0x53c4c2(_0x2b8b6b._0x6237c5)](_0x19c387['pageX']), _0x5ad1b2 = _0x4f118d['pageToCanv' + 'asY'](_0x2e8d9a['pageY']), _0x1fbafb = {}; _0x1fbafb['x'] = _0x266e7c, _0x1fbafb['y'] = _0x5ad1b2, _0x44069d = _0x1fbafb, _0x53b2ae = _0x5dd614[_0x53c4c2(0x9c4)](); } else { if (VisualEditorWindow && !VisualEditorWindow['closed']) { if (SceneManager['_scene'] !== _0x5bc192) { _0x5bc192 = SceneManager['_scene']; const _0x16469e = (_0x441354 = -0xd2e + 0x1 * -0x188b + 0x25b9) => { const _0x3ccb58 = { _0x3c6a63: 0x700, _0x1f919f: 0x890, _0xfc8854: 0x3e5, _0x14884d: 0x53e, _0x4a5a0a: 0xb69, _0x6421a3: 0x9e9, _0x230155: 0xa39 }, _0x90b823 = { _0x44c6ae: 0x5ac }, _0x191fef = _0x53c4c2; if (_0x441354 > 0x736 * 0x1 + 0x20a3 * -0x1 + 0x197c) return; if (editorMode && SceneManager['_scene'] && SceneManager['_scene']['_skillUI']) { SceneManager['_scene']['_skillUI'][_0x191fef(_0x2eb48b._0x296bf2) + _0x191fef(0x853)] && SceneManager[_0x191fef(_0x2eb48b._0x1906e7)]['_skillUI']['_gridBackg' + _0x191fef(_0x2eb48b._0x156d7d)]['forEach'](_0x44bc6f => { const _0x17a0ff = _0x191fef; _0x44bc6f['_isPlaceho' + _0x17a0ff(_0x90b823._0x44c6ae)] && (_0x44bc6f['visible'] = !![]); }); SceneManager['_scene']['toggleDrag' + _0x191fef(_0x2eb48b._0x5c34a5)] && !SceneManager['_scene'][_0x191fef(0x10b) + 'e'] && SceneManager['_scene']['toggleDrag' + 'Mode'](); if (window['saveHotbar' + 'UIPosition' + 's']) { if (_0x191fef(0x71d) === _0x191fef(_0x2eb48b._0x24ecd2)) { const _0x40f88b = _0x1f08b3['Name']['split'](',')[-0x5c * 0x31 + 0x1cef + -0xb53]['trim'](); return _0x40f88b === _0x2533f6; } else window['saveHotbar' + 'UIPosition' + 's'] = function (_0x49a5a2) { const _0x3d16f3 = _0x191fef; if ('ogrhr' !== _0x3d16f3(0x8d4)) _0x5d64ce[_0x3d16f3(_0x3ccb58._0x3c6a63)][_0x3d16f3(_0x3ccb58._0x1f919f) + 'avior'] = _0x1bb4fb; else { saveHotbarPositions(_0x49a5a2); if (VisualEditorWindow && !VisualEditorWindow['closed'] && _0x49a5a2) { if ('qSKOy' === 'uJRtR') { _0xe23e80['updateEdit' + 'orLists'](); const _0xd386f1 = _0x35c821['document']['getElement' + _0x3d16f3(_0x3ccb58._0xfc8854)]('properties' + _0x3d16f3(_0x3ccb58._0x14884d)); _0xd386f1 && (_0xd386f1[_0x3d16f3(_0x3ccb58._0x4a5a0a)] = '<div\x20class' + '=\x22empty-st' + 'ate\x22>Grid\x20' + 'deleted.\x20S' + _0x3d16f3(_0x3ccb58._0x6421a3) + _0x3d16f3(_0x3ccb58._0x230155) + 'o\x20edit.</d' + 'iv>'); const _0x419f91 = _0x34f672['document']['getElement' + 'ById']('slotPrevie' + 'w'); _0x419f91 && (_0x419f91[_0x3d16f3(0x8ce)][_0x3d16f3(0x4db)] = 'none'); } else for (const _0xa7f387 in _0x49a5a2) { const _0x3dae84 = _0x49a5a2[_0xa7f387]; _0x3dae84 && VisualEditorWindow['updateSlot' + 'PositionFi' + _0x3d16f3(0x242)] && ('wJvoS' === 'wJvoS' ? VisualEditorWindow[_0x3d16f3(0x2c3) + 'PositionFi' + 'elds'](_0xa7f387, _0x3dae84['x'], _0x3dae84['y']) : delete _0x2d8fd9['positions'][_0x32f6be]); } } } }; } } else { if (_0x191fef(0x515) === 'iioiJ') { const _0x4cc8b8 = _0x3e5e57[_0x191fef(0xb1d)]['_skillUI']['_slots'][_0x191fef(0x416)](_0x41967b); _0x4cc8b8 && (_0x4cc8b8['parent'] && _0x4cc8b8['parent']['removeChil' + 'd'](_0x4cc8b8), _0x41d3f3['_scene']['_skillUI']['_slots'][_0x191fef(0xac7)](_0x46a22b)); } else setTimeout(() => _0x16469e(_0x441354 + (-0x11e0 + 0x29 * 0x1c + -0x7f * -0x1b)), 0x1179 + 0xa2e * -0x1 + -0x5d * 0x13); } }; _0x16469e(); } } } }, 0x76d + 0x2107 + 0x58 * -0x70); } else return; } } function enableEditorMode() { const _0x3683c6 = { _0x5cf3cd: 0x70f }, _0x270ee7 = { _0x480ec1: 0x2c4, _0x595b64: 0x329, _0x3caf95: 0x860, _0x5d46b1: 0xb1d, _0xa58c32: 0x427, _0x346214: 0xb1d, _0x1ef31f: 0x461 }, _0x3a199e = _0x281b; editorMode = !![], ConfigManager[_0x3a199e(_0x3683c6._0x5cf3cd)] = !![]; SceneManager['_scene'] && SceneManager['_scene']['_skillUI'] && SceneManager['_scene']['_skillUI']['_gridBackg' + 'rounds'] && SceneManager['_scene']['_skillUI']['_gridBackg' + 'rounds']['forEach'](_0x175799 => { const _0xdb0b3d = _0x3a199e; 'YrYIJ' === 'eZlVf' ? _0x2115c6(() => _0x2e7e34(_0x2887a6 + (0x347 * 0x3 + -0x2 * 0x957 + 0x8da)), -0x54e + -0x1fdd * -0x1 + -0x13f * 0x15) : _0x175799['_isPlaceho' + 'lder'] && (_0x175799[_0xdb0b3d(0x42c)] = ![]); }); const _0x1d10ec = (_0x5db9be = -0x77 * -0x3d + 0x1d85 + -0x73c * 0x8) => { const _0xcc03ec = { _0x47fc05: 0x283 }, _0x43f466 = _0x3a199e; if (_0x5db9be > 0x1e18 + -0x4b9 * -0x2 + -0x2780) { if (_0x43f466(_0x270ee7._0x480ec1) === 'HsyEB') { console['error'](_0x43f466(_0x270ee7._0x595b64) + 'itor]\x20Fail' + _0x43f466(_0x270ee7._0x3caf95) + 'le\x20drag\x20mo' + 'de\x20after\x20m' + 'ultiple\x20at' + 'tempts'); return; } else return; } if (SceneManager['_scene'] && SceneManager['_scene']['_skillUI'] && SceneManager['_scene']['toggleDrag' + 'Mode']) { if ('GOTEW' === 'GOTEW') !SceneManager[_0x43f466(_0x270ee7._0x5d46b1)][_0x43f466(0x10b) + 'e'] && SceneManager['_scene']['toggleDrag' + 'Mode'](), SceneManager['_scene']['_skillUI'][_0x43f466(_0x270ee7._0xa58c32) + 'rounds'] && ('kOUlu' !== 'pkAHA' ? SceneManager[_0x43f466(_0x270ee7._0x346214)]['_skillUI']['_gridBackg' + _0x43f466(0x853)]['forEach'](_0x5318df => { const _0x43fa4e = _0x43f466; 'aALEF' !== _0x43fa4e(0x92f) ? _0x5318df['_isPlaceho' + _0x43fa4e(0x5ac)] && (_0x5318df['visible'] = !![]) : _0x5b9197('Error\x20arra' + _0x43fa4e(_0xcc03ec._0x47fc05) + 's:\x20' + _0x1a4f13['message']); }) : _0x19cbe5['splice'](-0x2 * -0x8ef + -0x12f1 + 0x1 * 0x114, 0xf * -0x141 + 0x724 + 0x3e4 * 0x3)); else { if (_0x3a34a9['Slots']) for (const _0x5ae45d of _0x1d3a99['Slots']) { const _0x1a06a6 = (_0x5ae45d['Name'] || '')[_0x43f466(0x282)](','); if (_0x1a06a6[-0x1 * -0x1a05 + 0x1541 + -0x2f46]['trim']() === _0x2791ae) return _0x5ae45d; } } } else { if ('IEiBj' === 'IEiBj') setTimeout(() => _0x1d10ec(_0x5db9be + (-0x12d0 + 0x14b1 * -0x1 + 0xd * 0x30a)), -0x61 * -0x2b + -0x121a + 0x1 * 0x233); else { if (!_0x29df4c['isNwjs']()) return null; const _0x3ca94f = _0x79dbf7('path'); return _0x3ca94f['dirname'](_0x3ed044[_0x43f466(_0x270ee7._0x1ef31f)]['filename']); } } }; _0x1d10ec(); } function disableEditorMode() { const _0x1892b4 = { _0x413f55: 0x74d, _0x5689e8: 0x5b9 }, _0xbbab83 = { _0x703c19: 0x5ac }, _0x508383 = _0x281b; editorMode = ![], ConfigManager[_0x508383(0x70f)] = ![], currentSelectedGrid = null, SceneManager['_scene'] && SceneManager['_scene']['_skillUI'] && SceneManager['_scene']['_skillUI']['_gridBackg' + 'rounds'] && SceneManager[_0x508383(0xb1d)]['_skillUI']['_gridBackg' + 'rounds']['forEach'](_0x5e0ca3 => { const _0xce525a = _0x508383; _0x5e0ca3['_isPlaceho' + _0xce525a(_0xbbab83._0x703c19)] && (_0x5e0ca3['visible'] = ![]); }), window['deselectAl' + _0x508383(0x3d3)] && window['deselectAl' + 'lSlots'](), window[_0x508383(0x74d) + _0x508383(0x75a)] && (window['_gridHighl' + 'ightSprite']['parent'] && window[_0x508383(_0x1892b4._0x413f55) + 'ightSprite']['parent']['removeChil' + 'd'](window['_gridHighl' + 'ightSprite']), window['_gridHighl' + 'ightSprite'] = null), SceneManager['_scene'] && SceneManager['_scene']['toggleDrag' + _0x508383(_0x1892b4._0x5689e8)] && (SceneManager['_scene']['_isDragMod' + 'e'] && (_0x508383(0x3ef) === 'iVyNu' ? SceneManager['_scene']['toggleDrag' + 'Mode']() : delete _0x1fe8b9['$uiPositio' + 'ns'][_0x241d36])); } window[_0x57bd41(0x54b) + 'ots'] = function (_0x181b78) { const _0x200adc = { _0xd3988e: 0x3d6, _0x43dc14: 0x505, _0x2390fc: 0x629, _0x28100f: 0x635, _0x171dbc: 0xa91 }, _0x8721ef = { _0x9c9a42: 0x2db }, _0x2580f7 = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager['_scene']['_skillUI']) return; let _0xb6c179 = []; if (Utils['isNwjs']()) { if (_0x2580f7(_0x200adc._0xd3988e) !== 'tNFOq') { const _0x2edc91 = _0x379f95[_0x2580f7(_0x200adc._0x43dc14)](_0x292c52['_config'][_0x2580f7(_0x200adc._0x2390fc) + 'Image']); _0x56f12c[_0x2580f7(_0x200adc._0x28100f) + _0x2580f7(_0x200adc._0x171dbc)]['y'] = _0x2edc91['height'] / (-0x989 * -0x1 + 0x263e + 0x2fc5 * -0x1); } else try { if (_0x2580f7(0x653) !== 'Uqjff') { const _0x22dcc1 = require('fs'), _0x35408d = getConfigPath(); if (_0x22dcc1['existsSync'](_0x35408d)) { const _0x524fae = loadConfigFile(); _0xb6c179 = _0x524fae[_0x2580f7(0x72f)] || []; } } else _0x41f088['selectSlot' + 'FromGame'](_0x598805); } catch (_0x33deac) { console['error']('Error\x20load' + _0x2580f7(0x1bd) + _0x2580f7(0x20d), _0x33deac); } } else { } if (!_0xb6c179 || _0x181b78 >= _0xb6c179['length']) { if (_0x2580f7(0x745) !== 'lhPBX') { VisualEditorWindow && !VisualEditorWindow['closed'] && VisualEditorWindow['updateSlot' + _0x2580f7(0x39e)]([]); return; } else { _0x41d393['error']('[Visual\x20Ed' + 'itor]\x20Slot' + '\x20not\x20found' + ':', _0x2f056a); return; } } const _0x22aa88 = _0xb6c179[_0x181b78], _0x2f2927 = _0x22aa88['Slots'] ? _0x22aa88['Slots']['map'](_0x1e6240 => { const _0x98fc06 = _0x2580f7; if ('fZyEu' !== _0x98fc06(0x408)) _0x45a713['updateSlot' + 'PositionFi' + 'elds'](_0x1922c7, _0xff6ad7['x'], _0x4a6065['y']); else { const _0x256158 = (_0x1e6240[_0x98fc06(0x61e)] || '')['split'](','), _0x39342a = (_0x1e6240[_0x98fc06(_0x8721ef._0x9c9a42)] || '')['split'](','); return { 'name': _0x256158[0xd * -0x6d + 0x25ac + -0x1 * 0x2023]['trim'](), 'buttonText': _0x39342a[-0xc1 * -0x1 + 0x29 + -0xea]['trim']() }; } }) : []; currentSelectedGrid = _0x181b78, VisualEditorWindow && !VisualEditorWindow['closed'] && VisualEditorWindow['updateSlot' + 'sList'](_0x2f2927); }, window['getGridInf' + 'o'] = function (_0x5a51b0) { const _0x2cb3a5 = { _0x24fae1: 0x291, _0x2c4cf1: 0x117, _0xc773cf: 0x2a8, _0x3ac93a: 0x154, _0x55ccbf: 0x787, _0x2b2fd3: 0x718, _0x2d193c: 0x1d0 }, _0x1839ae = _0x57bd41; let _0x3d9b16 = []; if (Utils['isNwjs']()) try { if ('aiIah' !== _0x1839ae(_0x2cb3a5._0x24fae1)) { const _0x4d2944 = require('fs'), _0x4468c8 = getConfigPath(); if (_0x4d2944['existsSync'](_0x4468c8)) { const _0x90b467 = loadConfigFile(); _0x3d9b16 = _0x90b467['grids'] || []; } } else _0x7519cf['positions'][_0x1c55a6] = _0x3a2107['positions'][_0x2f793f], delete _0x14467f[_0x1839ae(_0x2cb3a5._0x2c4cf1)][_0x57dce1], _0x496fbe(_0x4f2f0a); } catch (_0xcc5b93) { console['error'](_0x1839ae(0x262) + _0x1839ae(_0x2cb3a5._0xc773cf) + 'nfo:', _0xcc5b93); } else { } if (!_0x3d9b16 || _0x5a51b0 >= _0x3d9b16['length']) return null; const _0x19c0ce = _0x3d9b16[_0x5a51b0], _0x2ee322 = (_0x19c0ce[_0x1839ae(_0x2cb3a5._0x3ac93a)] || '2,\x205')['split'](',')['map'](_0x403308 => parseInt(_0x403308[_0x1839ae(0xcb)]())), _0x522480 = _0x2ee322[-0x2 * 0x619 + -0x31 * -0x6d + -0x8ab] || -0x19e2 + -0x128c + 0x2c70, _0x30fbdc = _0x2ee322[_0x1839ae(0x8ef)] === 0x210f + 0x7 * -0x505 + 0x216 ? _0x2ee322[0x229e + -0x12d + -0x2170] : _0x2ee322[-0x21ee + 0x1523 * 0x1 + 0xccb], _0x343cfe = parseInt(_0x19c0ce[_0x1839ae(0x2f6)]) || -0x1 * -0xaa0 + 0xcc3 + -0x1759, _0x55500c = _0x522480 + '×' + _0x30fbdc; let _0x38e210 = -0x1 * 0x228d + -0xdab + 0x3038, _0x49fef6 = 0x110e + 0x1ebf + -0x2fcd; if (_0x19c0ce['Slots'] && _0x19c0ce['Slots']['length'] > -0x2 * -0x63a + 0x17 * -0x108 + -0x2d1 * -0x4) { const _0x2e1d20 = _0x19c0ce['Slots'][0x886 + 0x1a05 + -0x228b]['Name']['split'](',')[-0xc57 + -0xc8f + 0x18e6][_0x1839ae(0xcb)](), _0x298b36 = 'grid_' + _0x2e1d20; if (window['$uiPositio' + 'ns'] && window['$uiPositio' + 'ns'][_0x298b36]) _0x38e210 = window[_0x1839ae(_0x2cb3a5._0x55ccbf) + 'ns'][_0x298b36]['x'], _0x49fef6 = window['$uiPositio' + 'ns'][_0x298b36]['y']; else { const _0x144bcf = (_0x19c0ce['Position'] || '0,\x200')[_0x1839ae(0x282)](',')['map'](_0x2c8139 => eval(_0x2c8139['trim']())); _0x38e210 = _0x144bcf[-0x1a57 + -0x1c49 + 0x36a0] || 0x1a9c + -0x1fb5 + 0x519, _0x49fef6 = _0x144bcf[-0x23d5 * -0x1 + -0x2 * 0xed2 + -0x630] || 0xec9 + 0x2624 + 0x31d * -0x11; } } const _0x2a1481 = {}; return _0x2a1481['slotCount'] = _0x19c0ce['Slots'] ? _0x19c0ce['Slots']['length'] : 0x52 * -0x1 + -0x17 * 0xa1 + 0xec9, _0x2a1481[_0x1839ae(0x43b)] = _0x55500c, _0x2a1481['rows'] = _0x522480, _0x2a1481['columns'] = _0x30fbdc, _0x2a1481['padding'] = _0x343cfe, _0x2a1481[_0x1839ae(0xa17) + 'trollable'] = _0x19c0ce['Controllab' + 'leViaGamep' + 'ad'] === _0x1839ae(_0x2cb3a5._0x2b2fd3), _0x2a1481['background' + _0x1839ae(0x724)] = _0x19c0ce[_0x1839ae(0x629) + 'Image'] || '', _0x2a1481['positionX'] = _0x38e210, _0x2a1481[_0x1839ae(_0x2cb3a5._0x2d193c)] = _0x49fef6, _0x2a1481; }, window['getSlotPro' + 'perties'] = function (_0x4bfff8) { const _0x4f8bad = { _0x58e94e: 0x242, _0x5659f1: 0xb24, _0x1424cc: 0xa23 }, _0x354b25 = _0x57bd41; if (!SceneManager[_0x354b25(0xb1d)] || !SceneManager['_scene']['_skillUI']) return null; const _0x37ade3 = SceneManager['_scene']['_skillUI']['_slots']['get'](_0x4bfff8); if (!_0x37ade3) return null; let _0x3035cf = '', _0x1490ee = []; if (Utils['isNwjs']()) try { const _0x45023d = require('fs'), _0x40a42b = getConfigPath(); if (_0x45023d['existsSync'](_0x40a42b)) { const _0x13afc8 = loadConfigFile(); _0x1490ee = _0x13afc8['grids'] || []; } } catch (_0x5ebdf4) { if (_0x354b25(0x646) === _0x354b25(0x4d9)) { const _0x26b0d7 = _0x103c86[_0x3faa95]; _0x26b0d7 && _0x6c1f0d['updateSlot' + 'PositionFi' + _0x354b25(0x242)] && _0x542bb3['updateSlot' + _0x354b25(0xb44) + _0x354b25(_0x4f8bad._0x58e94e)](_0x4a7187, _0x26b0d7['x'], _0x26b0d7['y']); } else console['error']('Error\x20load' + _0x354b25(_0x4f8bad._0x5659f1) + 'roperties:', _0x5ebdf4); } else { } for (const _0x2eb6b0 of _0x1490ee) { if (_0x2eb6b0[_0x354b25(_0x4f8bad._0x1424cc)]) for (const _0xe14341 of _0x2eb6b0['Slots']) { const _0x5db58d = (_0xe14341['Name'] || '')['split'](','); if (_0x5db58d[-0x252e * 0x1 + 0x1e4c * 0x1 + 0x1 * 0x6e2][_0x354b25(0xcb)]() === _0x4bfff8) { if ('Dqxds' === _0x354b25(0x514)) { const _0x4fafca = (_0xe14341['Button'] || '')['split'](','); _0x3035cf = _0x4fafca[0x1a00 + 0x2f * -0x43 + 0xa7 * -0x15]['trim'](); break; } else return; } } if (_0x3035cf) break; } const _0x1d8655 = {}; return _0x1d8655['x'] = _0x37ade3['x'], _0x1d8655['y'] = _0x37ade3['y'], _0x1d8655['buttonText'] = _0x3035cf, _0x1d8655; }, window['getFullSlo' + 'tConfig'] = function (_0x3c099f) { const _0x18894a = { _0x49eccd: 0xb1a, _0x20744a: 0xacb, _0x2ba141: 0x571, _0xee9195: 0xa33 }, _0x4911dc = _0x57bd41; if (!Utils['isNwjs']()) return null; try { if ('tpbQk' !== 'tpbQk') _0x1352b2[_0x4911dc(0x864)][_0x4911dc(_0x18894a._0x49eccd) + 'd'](_0x3c5b5e); else { const _0x225a2d = require('fs'), _0x5eea46 = getConfigPath(); if (_0x225a2d[_0x4911dc(_0x18894a._0x20744a)](_0x5eea46)) { const _0x38368b = loadConfigFile(), _0x226999 = _0x38368b['grids'] || []; for (const _0x611c28 of _0x226999) { if (_0x611c28['Slots']) for (const _0xcb9861 of _0x611c28['Slots']) { const _0x39449a = (_0xcb9861['Name'] || '')['split'](','); if (_0x39449a[0x26c0 + 0x1607 + -0x1 * 0x3cc7]['trim']() === _0x3c099f) return _0xcb9861; } } } } } catch (_0x585bc6) { console['error'](_0x4911dc(_0x18894a._0x2ba141) + _0x4911dc(_0x18894a._0xee9195) + 'lot\x20config' + ':', _0x585bc6); } return null; }, window['updateSlot' + 'Property'] = function (_0xdd595a, _0x1afc44, _0x473d4e, _0x5d95e5) { const _0x2227d4 = { _0x318463: 0x65b, _0x37d7cb: 0x8ae, _0x265922: 0xa8d, _0x2483dc: 0xa01, _0x19e974: 0x61e, _0x2e5e4b: 0x1e2, _0x3ce7c1: 0x724, _0x3512d2: 0x115, _0x5d2706: 0xac7, _0x344be2: 0xb1d, _0x4a1885: 0x88d, _0x210600: 0x874, _0x51ef92: 0x4a6, _0x5b735e: 0x20b, _0x48a981: 0xacf, _0x334373: 0x71f }, _0x549648 = _0x57bd41; if (!Utils['isNwjs']()) return alert('Editing\x20sl' + 'ots\x20only\x20w' + _0x549648(0x9fe) + '.js\x20(test\x20' + 'mode\x20in\x20de' + 'sktop)'), null; try { const _0x3f2a60 = require('fs'), _0x1edfdc = getConfigPath(); if (!_0x3f2a60['existsSync'](_0x1edfdc)) return alert('Config\x20fil' + _0x549648(_0x2227d4._0x318463) + 'd!'), null; const _0x7bdfd6 = loadConfigFile(), _0x2efb10 = _0x7bdfd6['grids'][_0xdd595a]; if (!_0x2efb10 || !_0x2efb10['Slots']) return alert(_0x549648(0x554) + _0x549648(0x142) + _0x549648(_0x2227d4._0x37d7cb)), null; const _0x14399e = _0x2efb10[_0x549648(0xa23)]['findIndex'](_0x38c864 => { const _0x52ea02 = _0x38c864['Name']['split'](',')[0xc1 * -0x14 + 0x1377 + 0x463 * -0x1]['trim'](); return _0x52ea02 === _0x1afc44; }); if (_0x14399e === -(-0x317 * -0x2 + -0x156 * -0x5 + -0xcdb)) return console['error'](_0x549648(_0x2227d4._0x265922) + 'ound:', _0x1afc44), alert('Slot\x20not\x20f' + 'ound:\x20' + _0x1afc44 + (_0x549648(_0x2227d4._0x2483dc) + '\x20will\x20relo' + 'ad.')), SceneManager['goto'](SceneManager[_0x549648(0xb1d)]['constructo' + 'r']), null; const _0xc84e34 = _0x2efb10['Slots'][_0x14399e]; let _0x313e00 = _0xc84e34[_0x549648(_0x2227d4._0x19e974)]['split'](',')[-0xfae + -0x1 * 0x1193 + 0x2141]['trim'](), _0x11c1ad = _0x313e00; switch (_0x473d4e) { case _0x549648(_0x2227d4._0x2e5e4b): const _0x47af03 = _0xc84e34['Name']['split'](',')[_0x549648(0xa0f)](_0x1f556f => _0x1f556f['trim']()); _0x47af03[-0x135 * -0x7 + 0xd97 * 0x2 + 0x1 * -0x23a1] = _0x5d95e5, _0xc84e34['Name'] = _0x47af03['join'](',\x20'), _0x11c1ad = _0x5d95e5; break; case 'buttonKb': const _0x3b4157 = _0xc84e34['Button']['split'](',')['map'](_0xdf08a3 => _0xdf08a3['trim']()); _0x3b4157[-0x1 * 0x897 + 0x109 * -0x7 + 0xfd6] = _0x5d95e5, _0xc84e34['Button'] = _0x3b4157['join'](',\x20'); break; case 'buttonGp': const _0x8c4e70 = _0xc84e34[_0x549648(0x2db)][_0x549648(0x282)](',')['map'](_0x3080e0 => _0x3080e0['trim']()); if (_0x5d95e5) _0x8c4e70[0x20b * 0x7 + -0x251e * 0x1 + 0x16d2] = _0x5d95e5; else _0x8c4e70[_0x549648(0x8ef)] > -0x24 * 0xb8 + 0x870 + 0x1171 && _0x8c4e70[_0x549648(0xc5)](-0xb * 0x279 + 0x1b29 + -0x1 * -0xb, 0x5 * 0x58 + -0x14 * 0x16e + 0x1ae1); _0xc84e34[_0x549648(0x2db)] = _0x8c4e70['join'](',\x20'); break; case 'background' + _0x549648(_0x2227d4._0x3ce7c1): _0xc84e34['Background' + 'Image'] = _0x5d95e5; break; case 'textOffset' + 'Y': _0xc84e34['TextOffset' + 'Y'] = _0x5d95e5['toString'](); break; case 'specialBeh' + 'avior': _0xc84e34[_0x549648(0x890) + 'avior'] = _0x5d95e5; break; }saveConfigFile(_0x7bdfd6); if (_0x473d4e === _0x549648(0x1e2) && _0x313e00 !== _0x11c1ad) { !_0x7bdfd6['positions'] && (_0x7bdfd6['positions'] = {}); _0x7bdfd6[_0x549648(0x117)][_0x313e00] && (_0x7bdfd6['positions'][_0x11c1ad] = _0x7bdfd6['positions'][_0x313e00], delete _0x7bdfd6['positions'][_0x313e00], saveConfigFile(_0x7bdfd6)); if (window[_0x549648(0x787) + 'ns'] && window['$uiPositio' + 'ns'][_0x313e00]) { if ('PQFaE' !== _0x549648(0x5c1)) return _0xd1fb07('Editing\x20sl' + 'ots\x20only\x20w' + 'orks\x20in\x20NW' + _0x549648(0x94d) + 'mode\x20in\x20de' + _0x549648(0x28f)), null; else window['$uiPositio' + 'ns'][_0x11c1ad] = window['$uiPositio' + 'ns'][_0x313e00], delete window['$uiPositio' + 'ns'][_0x313e00]; } const _0x1f09d7 = _slotData['get'](_0x313e00); _0x1f09d7 && (_slotData[_0x549648(_0x2227d4._0x3512d2)](_0x11c1ad, _0x1f09d7), _slotData[_0x549648(_0x2227d4._0x5d2706)](_0x313e00)); if (SceneManager['_scene'] && SceneManager[_0x549648(_0x2227d4._0x344be2)]['_skillUI']) { if ('MuQyI' !== 'MuQyI') _0x3813e1['bitmap'] = _0xe326c1[_0x549648(0x505)](_0x357ef9); else { const _0x54ee77 = SceneManager['_scene']['_skillUI'][_0x549648(0x95e)]['get'](_0x313e00); _0x54ee77 && (_0x54ee77['_config'][_0x549648(_0x2227d4._0x19e974)] = _0x11c1ad, _0x54ee77['_keyboardN' + 'ame'] = _0x11c1ad, SceneManager['_scene']['_skillUI']['_slots'][_0x549648(_0x2227d4._0x5d2706)](_0x313e00), SceneManager['_scene']['_skillUI']['_slots'][_0x549648(0x115)](_0x11c1ad, _0x54ee77), _0x54ee77['refreshBut' + _0x549648(_0x2227d4._0x4a1885)] && ('aTOxD' !== _0x549648(_0x2227d4._0x210600) ? _0x172fde(_0x4ac17d) : _0x54ee77['refreshBut' + _0x549648(0x88d)]()), VisualEditorWindow && !VisualEditorWindow['closed'] && (VisualEditorWindow[_0x549648(_0x2227d4._0x51ef92) + 'FromGame'] && VisualEditorWindow[_0x549648(0x4a6) + _0x549648(_0x2227d4._0x5b735e)](_0x11c1ad))); } } } const _0x3daf06 = _0x473d4e === 'nameKb' && _0x313e00 !== _0x11c1ad ? _0x11c1ad : _0x1afc44; if (_0x473d4e === _0x549648(0x595) || _0x473d4e === 'buttonGp') _0x549648(0x73a) === _0x549648(0x424) ? _0x35667d[_0x549648(0x4a6) + 'FromGame'] && _0x983d47['selectSlot' + 'FromGame'](_0x4b5c07) : updateSlotButtonText(_0x3daf06); else { if (_0x473d4e === _0x549648(_0x2227d4._0x48a981) + 'Y') updateSlotTextOffset(_0x3daf06, parseInt(_0x5d95e5) || 0x88b + -0x1049 + 0x7be); else { if (_0x473d4e === 'background' + 'Image') { if (_0x549648(0x869) === _0x549648(0xa25)) return !![]; else updateSlotBackgroundImage(_0x3daf06, _0x5d95e5); } else _0x473d4e === 'specialBeh' + 'avior' && updateSlotSpecialBehavior(_0x3daf06, _0x5d95e5); } } const _0x28d9cf = {}; _0x28d9cf['newName'] = _0x11c1ad; const _0x28efb2 = {}; return _0x28efb2['newName'] = _0x313e00, _0x473d4e === 'nameKb' ? _0x28d9cf : _0x28efb2; } catch (_0x3a323a) { return console[_0x549648(0x27d)]('Error\x20upda' + 'ting\x20slot\x20' + 'property:', _0x3a323a), alert('Error\x20upda' + 'ting\x20prope' + 'rty:\x20' + _0x3a323a[_0x549648(_0x2227d4._0x334373)]), null; } }; function updateSlotTextOffset(_0x4c1d6f, _0x2cccf7) { const _0x1648b8 = { _0x39bbef: 0x946, _0x256c2a: 0x7a6, _0x275dd0: 0x635, _0x8ef8fc: 0x700, _0x199fd2: 0xa23, _0x139dfc: 0x787, _0x3dd431: 0x629, _0x5e120a: 0xa91, _0x1f6b42: 0x3ab, _0x312a52: 0x635 }, _0x35bd84 = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager['_scene'][_0x35bd84(0x19a)]) return; const _0x4202ca = SceneManager['_scene']['_skillUI']['_slots'][_0x35bd84(0x416)](_0x4c1d6f); if (!_0x4202ca) return; if (_0x4202ca['_buttonSpr' + _0x35bd84(0x946)]) { if ('vdQIi' === _0x35bd84(0x7bb)) { if (_0xefc888['_buttonSpr' + _0x35bd84(_0x1648b8._0x39bbef)]) { const _0x36b22e = _0x2807de(_0x873351['_config']['TextOffset' + 'Y'] || -0x1 * -0x3e5 + 0x195b * -0x1 + 0x1576); _0x365124['_buttonSpr' + 'ite']['y'] = _0xec544[_0x35bd84(_0x1648b8._0x256c2a)]['height'] / (0x4 * 0x2ce + 0xafb * 0x3 + -0x2c27) + _0x36b22e; } } else { if (_0x4202ca[_0x35bd84(0x700)] && _0x4202ca['_config']['Background' + 'Image']) { const _0x48a760 = ImageManager[_0x35bd84(0x505)](_0x4202ca['_config']['Background' + 'Image']); _0x4202ca[_0x35bd84(0x819) + 'ite']['y'] = _0x48a760['height'] / (-0x15a0 + -0x14b + 0x1 * 0x16ed); } else { if ('sfNty' === 'Cmacc') return; else _0x4202ca['_buttonSpr' + _0x35bd84(0x946)]['y'] = 0xa25 + 0x1 * -0x1139 + 0x714; } _0x4202ca['_buttonSpr' + 'ite']['y'] += _0x2cccf7; } } if (_0x4202ca[_0x35bd84(_0x1648b8._0x275dd0) + 'nSprite']) { if (_0x4202ca['_config'] && _0x4202ca[_0x35bd84(_0x1648b8._0x8ef8fc)]['Background' + _0x35bd84(0x724)]) { if ('OrUTC' !== _0x35bd84(0x19b)) { const _0x5c35f9 = _0x30c072[_0x35bd84(_0x1648b8._0x199fd2)][-0x106d + 0x1 * 0x149f + -0x6 * 0xb3]['Name']['split'](',')[-0x1 * -0x1528 + 0x17d5 * -0x1 + 0x2ad]['trim'](); _0x3cebb4[_0x35bd84(0x787) + 'ns'] && _0x349ab9['$uiPositio' + 'ns'][_0x5c35f9] && (_0x58d7d9['x'] = _0x537d71[_0x35bd84(_0x1648b8._0x139dfc) + 'ns'][_0x5c35f9]['x'], _0x4ca04e['y'] = _0x17c47e['$uiPositio' + 'ns'][_0x5c35f9]['y']); } else { const _0x420a02 = ImageManager['loadSystem'](_0x4202ca[_0x35bd84(0x700)][_0x35bd84(_0x1648b8._0x3dd431) + 'Image']); _0x4202ca[_0x35bd84(0x635) + _0x35bd84(_0x1648b8._0x5e120a)]['y'] = _0x420a02[_0x35bd84(_0x1648b8._0x1f6b42)] / (-0x4 * -0x25f + 0x23f7 + -0x2d71 * 0x1); } } else _0x4202ca[_0x35bd84(_0x1648b8._0x312a52) + 'nSprite']['y'] = 0x1 * -0xbb7 + 0x1cc9 + -0xbe * 0x17; _0x4202ca['_buttonIco' + 'nSprite']['y'] += _0x2cccf7; } } function updateSlotButtonText(_0x2de12d) { const _0x2dc7bf = { _0x1d8031: 0xb1d, _0x121b98: 0xa23, _0x47507d: 0x2db, _0x1fa47a: 0x700, _0x55a5b6: 0x61e, _0x33e6fe: 0x814 }, _0x4cd667 = _0x57bd41; if (!SceneManager[_0x4cd667(_0x2dc7bf._0x1d8031)] || !SceneManager[_0x4cd667(0xb1d)]['_skillUI']) return; const _0x2ebce6 = SceneManager['_scene']['_skillUI']['_slots']['get'](_0x2de12d); if (!_0x2ebce6) return; if (Utils['isNwjs']()) try { if (_0x4cd667(0x8de) !== 'JteHA') { const _0x575443 = require('fs'), _0x120f57 = getConfigPath(); if (_0x575443['existsSync'](_0x120f57)) { const _0x36af69 = loadConfigFile(), _0x2d7590 = _0x36af69['grids'] || []; for (const _0x17fd87 of _0x2d7590) { if (_0x17fd87[_0x4cd667(_0x2dc7bf._0x121b98)]) for (const _0x327350 of _0x17fd87['Slots']) { const _0x31dbe2 = _0x327350[_0x4cd667(0x61e)]['split'](',')[0x82e + 0xf0f + -0x173d]['trim'](); if (_0x31dbe2 === _0x2de12d) { _0x2ebce6['_config']['Button'] = _0x327350[_0x4cd667(_0x2dc7bf._0x47507d)], _0x2ebce6[_0x4cd667(_0x2dc7bf._0x1fa47a)][_0x4cd667(_0x2dc7bf._0x55a5b6)] = _0x327350['Name']; _0x2ebce6['refreshBut' + 'tonText'] && _0x2ebce6[_0x4cd667(_0x2dc7bf._0x33e6fe) + 'tonText'](); return; } } } } } else { const _0x512bed = (_0x125f5c['Name'] || '')['split'](','); if (_0x512bed[-0xc4d + 0x257 + 0x9f6]['trim']() === _0x4c4f61) return _0x3faa9d; } } catch (_0x121237) { console['error']('Error\x20upda' + 'ting\x20butto' + 'n\x20text:', _0x121237); } } function updateSlotBackgroundImage(_0x4ab641, _0x393250) { const _0x7bfcf1 = { _0x209e6c: 0x588, _0x509e92: 0x27d, _0x3ed1d3: 0x43a, _0x220c13: 0xb1d, _0x579434: 0x280, _0x58bd78: 0x27d, _0x667dc5: 0x445, _0x57fb39: 0x209, _0x4bd07f: 0xcb }, _0x36772a = _0x57bd41; if (!SceneManager[_0x36772a(0xb1d)] || !SceneManager['_scene']['_skillUI']) { if (_0x36772a(0xb63) !== 'xXDnc') _0xe90a7a = new _0x3161cc(_0x5b76fb), _0x43fee8['x'] = _0x56b5b0['x'], _0x436498['y'] = _0x38ae07['y'], _0x3ffe68['_slots']['set'](_0x363b3a, _0x154252), _0x3b221b[_0x36772a(_0x7bfcf1._0x209e6c)](_0x227376); else { console[_0x36772a(_0x7bfcf1._0x509e92)]('[Visual\x20Ed' + 'itor]\x20Scen' + _0x36772a(0x173) + _0x36772a(_0x7bfcf1._0x3ed1d3) + 'ilable'); return; } } const _0x1e55ed = SceneManager[_0x36772a(_0x7bfcf1._0x220c13)]['_skillUI'][_0x36772a(0x95e)]['get'](_0x4ab641); if (!_0x1e55ed) { if ('aUbnS' === _0x36772a(_0x7bfcf1._0x579434)) { console[_0x36772a(_0x7bfcf1._0x58bd78)](_0x36772a(0x329) + _0x36772a(_0x7bfcf1._0x667dc5) + _0x36772a(_0x7bfcf1._0x57fb39) + ':', _0x4ab641); return; } else _0x211961['_isPlaceho' + 'lder'] && (_0x215c8b['visible'] = !![]); } _0x1e55ed['_config'] && (_0x1e55ed[_0x36772a(0x700)]['Background' + 'Image'] = _0x393250); if (_0x393250 && _0x393250[_0x36772a(_0x7bfcf1._0x4bd07f)]() !== '') _0x1e55ed['bitmap'] = ImageManager[_0x36772a(0x505)](_0x393250), _0x1e55ed[_0x36772a(0x7a6)]['addLoadLis' + 'tener'](() => { const _0xdee6e7 = _0x36772a; if (_0x1e55ed['_buttonSpr' + _0xdee6e7(0x946)]) { const _0x5e9ece = Number(_0x1e55ed['_config']['TextOffset' + 'Y'] || -0x71 * -0x25 + 0x5e6 * -0x1 + -0xa6f); _0x1e55ed['_buttonSpr' + 'ite']['y'] = _0x1e55ed[_0xdee6e7(0x7a6)]['height'] / (-0x1517 + 0x1b93 + -0x67a) + _0x5e9ece; } }); else { _0x1e55ed[_0x36772a(0x7a6)] = new Bitmap(0x3f9 * -0x3 + -0x1d * 0x128 + -0x7 * -0x685, -0xc08 + 0x5 * 0x4bd + -0x21 * 0x59), _0x1e55ed['bitmap']['fillRect'](-0x1349 * 0x2 + 0xb * 0x14b + 0x1859, -0x251e + -0x1 * -0x1445 + 0x10d9, 0x17 * -0xfb + -0xc33 + 0x22f0, -0x621 * -0x5 + -0x94d + -0xa94 * 0x2, 'rgba(0,0,0' + ',0.5)'); if (_0x1e55ed['_buttonSpr' + 'ite']) { const _0x298bd9 = Number(_0x1e55ed[_0x36772a(0x700)]['TextOffset' + 'Y'] || -0x1 * -0x1837 + -0xa67 + 0xdd0 * -0x1); _0x1e55ed['_buttonSpr' + _0x36772a(0x946)]['y'] = 0x1ba3 + -0x10 * 0x181 + -0x131 * 0x3 + _0x298bd9; } } } function updateSlotSpecialBehavior(_0x2538a1, _0x2e1258) { const _0x1dc0b9 = { _0x3f86ab: 0x700, _0x3ae8d3: 0x700 }, _0x155e1e = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager[_0x155e1e(0xb1d)]['_skillUI']) return; const _0x93dc45 = SceneManager['_scene']['_skillUI'][_0x155e1e(0x95e)][_0x155e1e(0x416)](_0x2538a1); if (!_0x93dc45) return; _0x93dc45[_0x155e1e(_0x1dc0b9._0x3f86ab)] && (_0x93dc45[_0x155e1e(_0x1dc0b9._0x3ae8d3)]['SpecialBeh' + 'avior'] = _0x2e1258); if (_0x93dc45['refresh']) { if ('oSnAQ' !== _0x155e1e(0x826)) _0x93dc45['refresh'](); else { const _0x3a7d01 = _0x714073['_gridBackg' + _0x155e1e(0x853)][_0x1c953f]; _0x3a7d01['x'] = _0x56bf61, _0x3a7d01['y'] = _0x3a4ce1; } } } window['updateSlot' + 'Position'] = function (_0x4e554f, _0x21b5dd, _0x4b2b9e) { const _0x401f66 = { _0xf724d4: 0x19a, _0x34d0e5: 0x855 }, _0x38b052 = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager[_0x38b052(0xb1d)][_0x38b052(_0x401f66._0xf724d4)]) return; const _0x1d7fec = SceneManager['_scene']['_skillUI']['_slots'][_0x38b052(0x416)](_0x4e554f); if (!_0x1d7fec) return; if (_0x21b5dd === 'x') _0x1d7fec['x'] = _0x4b2b9e; else _0x21b5dd === 'y' && (_0x38b052(_0x401f66._0x34d0e5) === _0x38b052(0x3e4) ? _0x271687[_0x38b052(0x2c3) + _0x38b052(0x39e)](_0x14c3eb) : _0x1d7fec['y'] = _0x4b2b9e); saveSlotPosition(_0x4e554f, _0x1d7fec['x'], _0x1d7fec['y']); }, window['selectSlot' + 'InGame'] = function (_0x1f1622) { const _0x5b215d = { _0x2da694: 0x3ab, _0x47f150: 0x11d, _0x214610: 0x7f8, _0xf49f40: 0x4be, _0x1946a2: 0x4be, _0x296f42: 0x1a5 }, _0x2bb94c = _0x57bd41; if (!SceneManager[_0x2bb94c(0xb1d)] || !SceneManager['_scene']['_skillUI']) return; currentSelectedSlot = _0x1f1622, SceneManager['_scene'][_0x2bb94c(0x19a)]['_slots']['forEach']((_0x129035, _0x37875f) => { const _0x48a25e = _0x2bb94c; _0x129035['_editorGlo' + 'w'] && (_0x129035['removeChil' + 'd'](_0x129035[_0x48a25e(0x4be) + 'w']), _0x129035['_editorGlo' + 'w'] = null); if (_0x37875f === _0x1f1622) { _0x129035['_editorGlo' + 'w'] = new Sprite(); const _0x17099f = new Bitmap(_0x129035['width'] + (-0xa67 * 0x3 + -0x817 * 0x3 + 0xd * 0x446) || -0x19ef + 0x4f * 0x29 + 0xd9c, _0x129035['height'] + (0xca9 + -0x144f + 0x56 * 0x17) || 0xa * -0x372 + -0xf1d + -0x31e5 * -0x1), _0x106d53 = _0x17099f[_0x48a25e(0x89a)], _0x599bb2 = _0x17099f['width'], _0x116a62 = _0x17099f[_0x48a25e(_0x5b215d._0x2da694)]; for (let _0x52f4c8 = 0x1 * -0x25c9 + -0x849 + -0x1 * -0x2e12; _0x52f4c8 < 0x26f5 + 0x1921 + -0x4011; _0x52f4c8++) { const _0x17497a = 0x13ad + 0x175 * 0xc + -0x2529 + 0.3 - _0x52f4c8 * (-0x13e3 + 0x25b3 * 0x1 + -0x11d0 + 0.05), _0x5b32b8 = _0x52f4c8 * (-0x1aaf + -0x11c1 + 0x2c73); _0x106d53[_0x48a25e(0x130) + 'e'] = _0x48a25e(0x87b) + _0x48a25e(_0x5b215d._0x47f150) + _0x17497a + ')', _0x106d53['lineWidth'] = 0x175 + -0x186a + 0xa8 * 0x23, _0x106d53[_0x48a25e(_0x5b215d._0x214610)](_0x5b32b8, _0x5b32b8, _0x599bb2 - _0x5b32b8 * (-0x244 * 0x5 + 0x1 * -0x127 + 0x1 * 0xc7d), _0x116a62 - _0x5b32b8 * (-0x19b7 + 0x6ed + -0x2 * -0x966)); } _0x129035['_editorGlo' + 'w']['bitmap'] = _0x17099f, _0x129035['_editorGlo' + 'w']['anchor']['x'] = -0x2482 + 0x58f * 0x6 + 0x328 + 0.5, _0x129035[_0x48a25e(_0x5b215d._0xf49f40) + 'w'][_0x48a25e(0x786)]['y'] = 0x18fa + 0x147f + -0x2d79 + 0.5, _0x129035[_0x48a25e(_0x5b215d._0x1946a2) + 'w']['x'] = -0x577 + -0x22ae + -0x2b * -0xef, _0x129035['_editorGlo' + 'w']['y'] = -0x4 * 0x3a1 + 0xb27 + -0x29 * -0x15, _0x129035[_0x48a25e(_0x5b215d._0x296f42)](_0x129035['_editorGlo' + 'w'], 0x20fe + 0xf44 * -0x1 + -0x11ba); } }); }, window['deselectAl' + 'lSlots'] = function () { const _0xc8f676 = { _0x4779bb: 0x4be }, _0x49e636 = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager[_0x49e636(0xb1d)]['_skillUI']) return; currentSelectedSlot = null, SceneManager['_scene']['_skillUI']['_slots']['forEach']((_0x412378, _0x43bc7d) => { const _0x3cad1c = _0x49e636; if ('QoppM' === _0x3cad1c(0x42e)) _0x412378[_0x3cad1c(_0xc8f676._0x4779bb) + 'w'] && ('uUAtT' !== 'uUAtT' ? _0x5c3010['_isPlaceho' + 'lder'] && (_0x3f91ca['visible'] = ![]) : (_0x412378['removeChil' + 'd'](_0x412378['_editorGlo' + 'w']), _0x412378['_editorGlo' + 'w'] = null)); else return; }); }, window['forceEnabl' + _0x57bd41(0x641)] = function () { const _0x304c8a = { _0x58b6f7: 0xb1d, _0x262b84: 0x58b, _0x3d7209: 0xac3, _0x423b2f: 0x32b, _0xdfdaf6: 0x5b9 }, _0x49c30b = _0x57bd41; if (!SceneManager[_0x49c30b(_0x304c8a._0x58b6f7)] || !SceneManager['_scene']['_skillUI']) { if ('NFdAn' === _0x49c30b(_0x304c8a._0x262b84)) _0x39a855['bitmap'] = _0x3eb5b4['loadSystem'](_0x18cbc9), _0x30c744['bitmap']['addLoadLis' + 'tener'](() => { const _0x262ab5 = _0x49c30b; if (_0x133f3c['_buttonSpr' + 'ite']) { const _0x35ed1e = _0xb248be(_0x4f3da0['_config']['TextOffset' + 'Y'] || 0x2192 + -0x19f * -0x5 + 0xe3 * -0x2f); _0x589dd7['_buttonSpr' + _0x262ab5(0x946)]['y'] = _0x4ef144['bitmap']['height'] / (-0xf48 + 0xace + 0x47c) + _0x35ed1e; } }); else return console['error']('[Visual\x20Ed' + _0x49c30b(0x3c7) + _0x49c30b(_0x304c8a._0x3d7209) + 'UI\x20not\x20rea' + 'dy'), ![]; } if (!SceneManager[_0x49c30b(_0x304c8a._0x58b6f7)][_0x49c30b(0x2ab) + 'Mode']) return console['error']('[Visual\x20Ed' + 'itor]\x20togg' + 'leDragMode' + _0x49c30b(_0x304c8a._0x423b2f) + 'able'), ![]; if (SceneManager['_scene']['_isDragMod' + 'e']) { if ('nhics' !== 'nhics') { const _0x553bef = _0x4687af(); if (!_0x553bef || !_0x553bef['grids']) return; const _0x47208e = _0x553bef['grids'][_0x4b1433]; if (!_0x47208e) return; _0x47208e[_0x49c30b(0x8df) + _0x49c30b(0x876) + 'ad'] = _0x34573b ? 'true' : 'false', _0x2d088c(_0x553bef); } else return !![]; } return SceneManager['_scene']['toggleDrag' + _0x49c30b(_0x304c8a._0xdfdaf6)](), !![]; }, window[_0x57bd41(0xe1) + 'rid'] = function (_0x1e6361) { const _0x5adae9 = { _0x36280e: 0x853 }, _0x27bd69 = { _0x13a8de: 0x582 }, _0x2870dc = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager['_scene']['_skillUI']) return; const _0x1e194b = SceneManager['_scene']['_skillUI'][_0x2870dc(0x427) + _0x2870dc(_0x5adae9._0x36280e)]; if (!_0x1e194b) return; _0x1e194b['forEach']((_0x59cbc7, _0x1305b3) => { const _0x87ad48 = _0x2870dc; _0x59cbc7[_0x87ad48(_0x27bd69._0x13a8de) + 'lder'] && (_0x59cbc7['visible'] = _0x1305b3 === _0x1e6361); }); }, window['updateEdit' + 'orLists'] = function () { const _0x45ae20 = { _0x507f3e: 0x107, _0x354877: 0xacb, _0x2ba61c: 0x72f, _0x2f4468: 0x6fa, _0x1b9a4c: 0x54b }, _0x34cbc7 = _0x57bd41; if (!VisualEditorWindow || VisualEditorWindow['closed']) return; let _0x2c47cd = []; if (Utils['isNwjs']()) { if (_0x34cbc7(0x2e7) !== _0x34cbc7(_0x45ae20._0x507f3e)) try { const _0x1760ef = require('fs'), _0x2cc376 = getConfigPath(); if (_0x1760ef[_0x34cbc7(_0x45ae20._0x354877)](_0x2cc376)) { const _0x41c7a7 = loadConfigFile(); _0x2c47cd = _0x41c7a7[_0x34cbc7(_0x45ae20._0x2ba61c)] || []; } } catch (_0x47b2dd) { console[_0x34cbc7(0x27d)]('Error\x20upda' + 'ting\x20edito' + _0x34cbc7(_0x45ae20._0x2f4468), _0x47b2dd); } else _0x19121a['_config']['Background' + 'Image'] = _0x4f8c7a; } const _0x1955e7 = _0x2c47cd['map'](_0x105f8c => ({ 'slotCount': _0x105f8c['Slots'] ? _0x105f8c['Slots']['length'] : 0x2463 + 0x114d + -0x35b0 })); VisualEditorWindow['updateGrid' + _0x34cbc7(0x39e)](_0x1955e7), currentSelectedGrid !== null && window[_0x34cbc7(_0x45ae20._0x1b9a4c) + 'ots'](currentSelectedGrid); }, window[_0x57bd41(0x2c5) + _0x57bd41(0x567)] = function (_0xd9cebc) { const _0x59e032 = { _0x55db7a: 0x8ef, _0x5a8ca0: 0xa23, _0x5891f3: 0x61b }, _0x1a26f3 = _0x57bd41; let _0x1843bd = []; if (Utils['isNwjs']()) try { const _0x53f597 = require('fs'), _0x5c826f = getConfigPath(); if (_0x53f597[_0x1a26f3(0xacb)](_0x5c826f)) { const _0x557059 = loadConfigFile(); _0x1843bd = _0x557059['grids'] || []; } } catch (_0x42b0a4) { return console['error'](_0x1a26f3(0x456) + 'ing\x20grid\x20f' + 'or\x20slot:', _0x42b0a4), null; } for (let _0x51285d = 0x2133 + -0x677 * -0x6 + -0x1 * 0x47fd; _0x51285d < _0x1843bd[_0x1a26f3(_0x59e032._0x55db7a)]; _0x51285d++) { const _0x6f8ff = _0x1843bd[_0x51285d]; if (_0x6f8ff['Slots']) { if ('AZdUg' === 'apTOJ') _0x26dd4c && _0x44007c['closed'] && (_0x131d77(_0x4a1cb1), _0x263bcd(_0x166073), _0xd42f64()); else for (const _0x229168 of _0x6f8ff[_0x1a26f3(_0x59e032._0x5a8ca0)]) { if ('PakTn' === _0x1a26f3(_0x59e032._0x5891f3)) { const _0x8e2c04 = _0x229168['Name']['split'](',')[-0x1546 + 0xadf + 0x1 * 0xa67]['trim'](); if (_0x8e2c04 === _0xd9cebc) return _0x51285d; } else { const _0x4975a8 = _0x3b2c3d[_0x575c5f]; if (_0x4975a8['Slots']) for (const _0x1cf20f of _0x4975a8['Slots']) { const _0x15e4ec = _0x1cf20f['Name']['split'](',')[-0x1684 + -0x8 * 0x45f + -0xd * -0x46c]['trim'](); if (_0x15e4ec === _0x15166f) return _0x83e784; } } } } } return null; }, window['copyBackgr' + 'oundImage'] = function (_0x4dde0a, _0x5a02db, _0x2b2b48) { const _0x108337 = { _0x4a794d: 0x56d, _0x851dd6: 0x5cf, _0x413e69: 0x9c8, _0x274018: 0x817 }, _0x5b8b8e = _0x57bd41; try { const _0x1e7e26 = require('fs'), _0x46bf11 = require('path'), _0x3109e4 = getProjectRoot(), _0x562785 = _0x46bf11[_0x5b8b8e(_0x108337._0x4a794d)](_0x3109e4, _0x5b8b8e(_0x108337._0x851dd6), _0x5b8b8e(0x284)); if (!_0x1e7e26['existsSync'](_0x562785)) { const _0x1654d0 = {}; _0x1654d0['recursive'] = !![], _0x1e7e26[_0x5b8b8e(0x24b)](_0x562785, _0x1654d0); } const _0x5a214a = _0x5a02db['replace'](/\.[^/.]+$/, ''), _0x1dd0a5 = _0x46bf11['extname'](_0x5a02db)[_0x5b8b8e(0x987) + 'e'](), _0x3060df = _0x46bf11['join'](_0x562785, _0x5a02db), _0x5df3a8 = _0x4dde0a['replace'](/^data:image\/\w+;base64,/, ''), _0x2ae00a = Buffer[_0x5b8b8e(0x380)](_0x5df3a8, _0x5b8b8e(_0x108337._0x413e69)); _0x1e7e26['writeFileS' + _0x5b8b8e(_0x108337._0x274018)](_0x3060df, _0x2ae00a), _0x2b2b48(!![], _0x5a214a); } catch (_0x43aa1d) { console[_0x5b8b8e(0x27d)]('Error\x20copy' + 'ing\x20backgr' + 'ound\x20image' + ':', _0x43aa1d), _0x2b2b48(![], null); } }, window['arrangeGri' + _0x57bd41(0xfb)] = function (_0x16e4f7, _0x3276e7) { const _0x5c53d4 = { _0x18e1df: 0xa23, _0x169e42: 0xa0f, _0xe0cd58: 0x8ef, _0x2d48ec: 0xa59, _0x32cd24: 0x623, _0x24da62: 0x787, _0x47b7e0: 0xaa1, _0x1d3545: 0x82d, _0x1dcc5d: 0x65b, _0x1981e6: 0xe1, _0x309930: 0xb1d, _0x150dd0: 0x582, _0x5a7ec7: 0x2ab, _0x5104d8: 0x3b5, _0x1e0da0: 0x7f8, _0x1c1deb: 0x39b, _0xa1226f: 0x87b, _0x5e3ac3: 0x632, _0x2ce9b4: 0x5f0, _0x20408b: 0x61e, _0x3af02b: 0x117, _0x2a0176: 0x1fd, _0xc4606e: 0x63d, _0x7c5b91: 0xb1f, _0xa916ad: 0x81e }, _0x44dbe5 = _0x57bd41; try { const _0x4a0893 = loadConfigFile(); if (!_0x4a0893) return; const _0x1912d1 = _0x4a0893['grids'][_0x16e4f7]; if (!_0x1912d1 || !_0x1912d1['Slots']) return; const _0x5d5a9f = _0x1912d1['Slots']['map'](_0x448a84 => _0x448a84['Name']['split'](',')[0x35f * 0x3 + -0x3d8 + -0x645]['trim']()), _0x46bd63 = -0x1fa9 * -0x1 + -0x1790 + -0x7d9, _0x3099ef = _0x3276e7['padding'] || -0x9db * 0x3 + 0x321 + -0x1 * -0x1a7a, _0x271efb = _0x3276e7[_0x44dbe5(0x68f)] || -0x18b + -0x20b6 + 0x2246, _0x24f8f8 = _0x3276e7['rows'] || 0x2641 * 0x1 + 0x1113 + -0x3752; _0x1912d1['RowColumn'] = _0x24f8f8 + ',\x20' + _0x271efb, _0x1912d1['Padding'] = _0x3099ef['toString'](); const _0xb5dbdb = (_0x46bd63 + _0x3099ef) * _0x271efb - _0x3099ef, _0x2a1504 = (_0x46bd63 + _0x3099ef) * _0x24f8f8 - _0x3099ef; let _0x2ac03d = -0x1 * 0x227 + -0x43 * 0x32 + -0x53 * -0x2f, _0x6f968d = -0x1344 + -0x1 * 0x20d5 + -0x3419 * -0x1; if (_0x1912d1['Slots']['length'] > -0x1679 + -0x1fe4 + 0x365d) { if ('GRaNb' !== _0x44dbe5(0x99e)) { const _0x2827f2 = _0x1912d1[_0x44dbe5(_0x5c53d4._0x18e1df)][-0xf55 + 0x1cf * 0x5 + 0x7 * 0xe6]['Name']['split'](',')[-0x4 * 0x472 + -0x13 * 0xef + 0x2385]['trim'](), _0x1b41ad = 'grid_' + _0x2827f2; if (window['$uiPositio' + 'ns'] && window['$uiPositio' + 'ns'][_0x1b41ad]) _0x2ac03d = window['$uiPositio' + 'ns'][_0x1b41ad]['x'], _0x6f968d = window['$uiPositio' + 'ns'][_0x1b41ad]['y']; else { if (_0x4a0893['positions'] && _0x4a0893['positions'][_0x1b41ad]) _0x2ac03d = _0x4a0893['positions'][_0x1b41ad]['x'], _0x6f968d = _0x4a0893[_0x44dbe5(0x117)][_0x1b41ad]['y']; else { if (_0x44dbe5(0x1b9) === 'TlwVL') _0x592ff2 = _0xbc241e['$uiPositio' + 'ns'][_0x4b926f]['x'], _0x49ffad = _0x208159['$uiPositio' + 'ns'][_0x57d75d]['y']; else { const _0x1ed3c3 = (_0x1912d1['Position'] || '0,\x200')['split'](',')[_0x44dbe5(_0x5c53d4._0x169e42)](_0x591e49 => eval(_0x591e49['trim']())); _0x2ac03d = _0x1ed3c3[0x546 + -0xb * 0x79 + -0x1 * 0x13] || Graphics['boxWidth'] / (-0x1af6 + -0xd64 + 0x285c), _0x6f968d = _0x1ed3c3[0x21e + -0x54 * 0x5e + -0x5bf * -0x5] || Graphics['boxHeight'] / (0x1 * -0x525 + 0x5 * -0x496 + -0x1 * -0x1c15); } } } } else return; } const _0x51c8e4 = Math['round'](_0x2ac03d - _0xb5dbdb / (-0x21e + -0x14 * 0x1ab + -0x2 * -0x11be) + _0x46bd63 / (-0xf85 + 0x16 * -0xda + 0x2243)), _0x240cd9 = Math['round'](_0x6f968d - _0x2a1504 / (0x89b + 0x4 * 0x841 + -0x299d * 0x1) + _0x46bd63 / (-0x1 * 0x25c6 + -0x1 * 0x265c + 0x4c24)); !_0x4a0893['positions'] && (_0x4a0893['positions'] = {}); let _0xcc78ee = -0x104b * -0x2 + -0xcd3 + -0x13c3, _0x18979c = 0x2507 + -0x211b + -0x3ec; for (let _0x2de4eb = 0x1dd * -0xb + -0x5a5 * -0x5 + -0x7ba; _0x2de4eb < _0x5d5a9f[_0x44dbe5(_0x5c53d4._0xe0cd58)]; _0x2de4eb++) { if (_0x44dbe5(_0x5c53d4._0x2d48ec) === _0x44dbe5(_0x5c53d4._0x32cd24)) { const _0xb60f04 = {}; _0xb60f04['x'] = 0x0, _0xb60f04['y'] = 0x0, _0x5dc9a6['positions'][_0x3697a0] = _0xb60f04; } else { const _0x35d583 = _0x5d5a9f[_0x2de4eb], _0x500ccd = _0x51c8e4 + _0x18979c * (_0x46bd63 + _0x3099ef), _0x45afe9 = _0x240cd9 + _0xcc78ee * (_0x46bd63 + _0x3099ef), _0x5534fe = {}; _0x5534fe['x'] = _0x500ccd, _0x5534fe['y'] = _0x45afe9, _0x4a0893['positions'][_0x35d583] = _0x5534fe; if (window['$uiPositio' + 'ns']) { const _0x569cef = {}; _0x569cef['x'] = _0x500ccd, _0x569cef['y'] = _0x45afe9, window[_0x44dbe5(_0x5c53d4._0x24da62) + 'ns'][_0x35d583] = _0x569cef; } if (SceneManager['_scene'] && SceneManager['_scene'][_0x44dbe5(0x19a)]) { if ('SWJel' === 'SWJel') { const _0x716deb = SceneManager['_scene'][_0x44dbe5(0x19a)]['_slots']['get'](_0x35d583); if (_0x716deb) { if (_0x44dbe5(_0x5c53d4._0x47b7e0) !== _0x44dbe5(_0x5c53d4._0x1d3545)) _0x716deb['x'] = _0x500ccd, _0x716deb['y'] = _0x45afe9; else return _0x4d72fb(_0x44dbe5(0x202) + _0x44dbe5(_0x5c53d4._0x1dcc5d) + 'd!'), null; } } else _0x348b4c[_0x44dbe5(0x117)] = {}; } _0x18979c++, _0x18979c >= _0x271efb && (_0x18979c = 0x25eb + 0x2708 + -0x4cf3 * 0x1, _0xcc78ee++); } } saveConfigFile(_0x4a0893); window[_0x44dbe5(0xe1) + 'rid'] && window[_0x44dbe5(_0x5c53d4._0x1981e6) + 'rid'](_0x16e4f7); gridSettings[_0x16e4f7] = _0x4a0893['grids'][_0x16e4f7]; if (SceneManager['_scene'] && SceneManager[_0x44dbe5(_0x5c53d4._0x309930)]['_skillUI']) { if (_0x44dbe5(0x5a7) !== 'yntEy') { const _0x4b2345 = SceneManager['_scene']['_skillUI'][_0x44dbe5(0x427) + 'rounds']; if (_0x4b2345 && _0x4b2345[_0x16e4f7]) { const _0x19c68f = _0x4b2345[_0x16e4f7]; _0x19c68f['_grid'] = _0x4a0893['grids'][_0x16e4f7]; if (_0x19c68f[_0x44dbe5(_0x5c53d4._0x150dd0) + _0x44dbe5(0x5ac)]) { if ('AFjEX' !== 'AFjEX') _0x90ee5f['_scene'][_0x44dbe5(_0x5c53d4._0x5a7ec7) + 'Mode'](); else { const _0x5aac20 = _0x271efb * _0x46bd63 + (_0x271efb - (-0x1 * -0x9c1 + -0x861 + -0x15f * 0x1)) * _0x3099ef, _0x1d593c = _0x24f8f8 * _0x46bd63 + (_0x24f8f8 - (-0x226c + -0x13e4 + 0x3651)) * _0x3099ef, _0x54b9bd = new Bitmap(_0x5aac20 + (0x4 * 0x9a1 + 0x1 * 0x86d + -0x5d * 0x81), _0x1d593c + (-0x1b4f * -0x1 + 0x33e * 0x2 + -0x21b7)), _0x3f3703 = _0x54b9bd[_0x44dbe5(0x89a)]; _0x3f3703['strokeStyl' + 'e'] = _0x44dbe5(0x87b) + '215,\x200,\x200.' + '9)', _0x3f3703['fillStyle'] = _0x44dbe5(0x87b) + _0x44dbe5(_0x5c53d4._0x5104d8) + '25)', _0x3f3703['lineWidth'] = -0x670 + -0x190d + 0x1f81, _0x3f3703['setLineDas' + 'h']([0x2025 + 0xab6 + -0x2acf, 0x61 * 0x43 + -0x21f7 + 0x89a]), _0x3f3703['fillRect'](-0x20f1 + 0x2eb * -0xb + 0x410a, -0x118a * 0x1 + -0x2 * 0x64d + 0x1e24, _0x5aac20 + (0x590 + -0xe72 + -0x47b * -0x2), _0x1d593c + (0x2cc + 0x2587 * 0x1 + -0x283f * 0x1)), _0x3f3703[_0x44dbe5(_0x5c53d4._0x1e0da0)](-0xc2 + 0x191 * -0x14 + 0x2 * 0x100b, 0x1456 + -0x8a6 + -0xbb0, _0x5aac20 + (0x8 * -0x115 + -0xbd2 + 0x148e), _0x1d593c + (0x1983 + 0x2 * 0x68 + -0x1 * 0x1a3f)), _0x3f3703['font'] = 'bold\x2020px\x20' + 'Arial', _0x3f3703[_0x44dbe5(_0x5c53d4._0x1c1deb)] = _0x44dbe5(_0x5c53d4._0xa1226f) + '215,\x200,\x201.' + '0)', _0x3f3703[_0x44dbe5(_0x5c53d4._0x5e3ac3)] = 'center', _0x3f3703['textBaseli' + 'ne'] = _0x44dbe5(0x84a), _0x3f3703['fillText'](_0x44dbe5(_0x5c53d4._0x2ce9b4) + (_0x16e4f7 + (-0x6e6 + 0xbd7 + -0x4f0)), (_0x5aac20 + (0x18c3 + -0x1 * 0x1bb + -0x16f4)) / (0x2578 + 0x193e + -0x2 * 0x1f5a), (_0x1d593c + (-0xd2d * -0x2 + -0xfd8 + -0xa6e)) / (0x43 * -0x23 + -0x89 * -0x3d + 0x2 * -0xbbd)), _0x19c68f['visible'] = ![], _0x19c68f['bitmap'] = _0x54b9bd, _0x19c68f['visible'] = !![]; } } } } else { const _0x638da3 = _0x3e2c92[_0x44dbe5(_0x5c53d4._0x20408b)]['split'](',')[0x14b1 * 0x1 + -0x5 * 0x29f + 0x1 * -0x796]['trim'](); if (_0x59d5e9['positions'][_0x638da3]) _0x396b38['push'](_0x5020a0[_0x44dbe5(_0x5c53d4._0x3af02b)][_0x638da3]); else _0x2c857f[_0x44dbe5(_0x5c53d4._0x24da62) + 'ns'] && _0x54ad74[_0x44dbe5(0x787) + 'ns'][_0x638da3] && _0x99f485['push'](_0x4beb00['$uiPositio' + 'ns'][_0x638da3]); } } if (VisualEditorWindow && !VisualEditorWindow['closed']) { if ('SkzVJ' === 'SkzVJ') window['updateEdit' + _0x44dbe5(0x61d)](); else { const _0x1d922e = _0x1b5184['pageToCanv' + 'asX'](_0x5e0081[_0x44dbe5(_0x5c53d4._0x2a0176)]), _0x789737 = _0x150bbe['pageToCanv' + _0x44dbe5(_0x5c53d4._0xc4606e)](_0xed8fd2[_0x44dbe5(_0x5c53d4._0x7c5b91)]), _0x1738a1 = _0x376de3['now']() - _0x5f0647, _0x5c0bd2 = _0x1d922e - _0x40da4d['x'], _0x418103 = _0x789737 - _0x15a3be['y'], _0x495765 = _0x30c1fb['sqrt'](_0x5c0bd2 * _0x5c0bd2 + _0x418103 * _0x418103); _0x495765 < _0x35a4ec && _0x1738a1 < -0x5c4 + 0x9a9 * -0x1 + 0x5cb * 0x3 && _0x27f13d(_0x1d922e, _0x789737), _0x5f3024 = null; } } } catch (_0x551f40) { alert('Error\x20arra' + 'nging\x20slot' + _0x44dbe5(_0x5c53d4._0xa916ad) + _0x551f40['message']); } }, window[_0x57bd41(0xa12) + 'Background' + 'Image'] = function (_0x3f7519, _0x1563d5) { const _0x2409ef = { _0x31ff34: 0xb1d, _0x2c2815: 0x19a, _0x29b7f6: 0x853, _0x4cb2f6: 0x864, _0x34ca29: 0x787, _0x4662eb: 0x787, _0x5aa7b7: 0x427 }, _0x1e5d25 = _0x57bd41; try { if (_0x1e5d25(0x2e6) !== 'kAIQX') { const _0x507a00 = loadConfigFile(); if (!_0x507a00) return; const _0x18540f = _0x507a00[_0x1e5d25(0x72f)][_0x3f7519]; if (!_0x18540f) return; _0x18540f['Background' + 'Image'] = _0x1563d5, saveConfigFile(_0x507a00); if (SceneManager['_scene'] && SceneManager['_scene'][_0x1e5d25(0x19a)]) { const _0x44955d = SceneManager[_0x1e5d25(_0x2409ef._0x31ff34)][_0x1e5d25(_0x2409ef._0x2c2815)]; if (_0x44955d['_gridBackg' + 'rounds'] && _0x44955d['_gridBackg' + _0x1e5d25(0x853)][_0x3f7519]) { const _0x36b8e9 = _0x44955d['_gridBackg' + _0x1e5d25(_0x2409ef._0x29b7f6)][_0x3f7519]; _0x1563d5 ? _0x36b8e9[_0x1e5d25(0x7a6)] = ImageManager['loadSystem'](_0x1563d5) : 'lJPpU' !== _0x1e5d25(0x24c) ? _0x385459['parent']['removeChil' + 'd'](_0x301634) : (_0x36b8e9[_0x1e5d25(_0x2409ef._0x4cb2f6)] && _0x36b8e9['parent']['removeChil' + 'd'](_0x36b8e9), _0x36b8e9[_0x1e5d25(0x7a6)] && (_0x36b8e9['bitmap'] = null), delete _0x44955d['_gridBackg' + _0x1e5d25(_0x2409ef._0x29b7f6)][_0x3f7519]); } else { if (_0x1563d5) { const _0x427bd7 = new Sprite(); _0x427bd7['bitmap'] = ImageManager['loadSystem'](_0x1563d5); if (_0x18540f['Slots'] && _0x18540f['Slots']['length'] > -0xe53 + -0x1222 + -0x4a3 * -0x7) { const _0x5e7540 = _0x18540f[_0x1e5d25(0xa23)][-0x2487 + -0x6b0 + -0x1e1 * -0x17]['Name']['split'](',')[0x70 * 0x3e + -0x1c7b + 0x15b]['trim'](); window[_0x1e5d25(_0x2409ef._0x34ca29) + 'ns'] && window['$uiPositio' + 'ns'][_0x5e7540] && (_0x427bd7['x'] = window[_0x1e5d25(0x787) + 'ns'][_0x5e7540]['x'], _0x427bd7['y'] = window[_0x1e5d25(_0x2409ef._0x4662eb) + 'ns'][_0x5e7540]['y']); } _0x427bd7['anchor']['x'] = 0xcc2 * 0x2 + -0xdff * -0x2 + -0x11d6 * 0x3 + 0.5, _0x427bd7['anchor']['y'] = -0x4da + -0x2d * -0x1 + 0x4ad + 0.5, _0x44955d['addChildAt'](_0x427bd7, -0x1f39 + 0x1 * 0xda7 + 0x8c9 * 0x2), !_0x44955d[_0x1e5d25(_0x2409ef._0x5aa7b7) + 'rounds'] && (_0x44955d['_gridBackg' + 'rounds'] = []), _0x44955d['_gridBackg' + 'rounds'][_0x3f7519] = _0x427bd7; } } } } else return; } catch (_0x2d1503) { alert('Error\x20upda' + 'ting\x20backg' + 'round:\x20' + _0x2d1503['message']); } }, window['resetGridB' + 'ackgroundP' + 'osition'] = function (_0x3c048d) { const _0x3d67cd = { _0x1bd263: 0x427 }, _0x3b3fae = { _0xa1d42a: 0x61e }, _0x43a344 = _0x57bd41; try { if ('FGOpm' !== 'qmwWq') { const _0x2759b2 = loadConfigFile(); if (!_0x2759b2) return; const _0x182571 = _0x2759b2['grids'][_0x3c048d]; if (!_0x182571 || !_0x182571['Slots'] || _0x182571[_0x43a344(0xa23)]['length'] === 0x1 * -0x25eb + 0x1f7 * 0x1 + 0xc * 0x2ff) return; !_0x2759b2['positions'] && (_0x2759b2['positions'] = {}); const _0x1febcc = []; _0x182571['Slots']['forEach'](_0x39da77 => { const _0x52ef95 = _0x43a344, _0x3027c3 = _0x39da77[_0x52ef95(_0x3b3fae._0xa1d42a)]['split'](',')[-0x66c * 0x5 + 0xed0 + 0x52 * 0x36]['trim'](); if (_0x2759b2['positions'][_0x3027c3]) _0x1febcc['push'](_0x2759b2['positions'][_0x3027c3]); else window['$uiPositio' + 'ns'] && window['$uiPositio' + 'ns'][_0x3027c3] && _0x1febcc['push'](window['$uiPositio' + 'ns'][_0x3027c3]); }); if (_0x1febcc['length'] === 0x2fb * -0x9 + 0x7e5 + -0x12ee * -0x1) return; let _0x50c750 = 0x190e + 0x113 * -0xb + -0xd3d * 0x1, _0x2438fa = -0x110b * -0x1 + 0x1 * -0xd15 + -0x4e * 0xd; _0x1febcc['forEach'](_0x18eed3 => { _0x50c750 += _0x18eed3['x'], _0x2438fa += _0x18eed3['y']; }); const _0x2c370c = Math['round'](_0x50c750 / _0x1febcc['length']), _0x43b597 = Math[_0x43a344(0x88c)](_0x2438fa / _0x1febcc['length']), _0x3dd10e = 'grid_' + _0x182571[_0x43a344(0xa23)][0x715 + 0x1 * 0x7b5 + 0x1 * -0xeca]['Name']['split'](',')[0x256b + 0x47f * 0x8 + -0x4963 * 0x1]['trim'](), _0x34f0d6 = {}; _0x34f0d6['x'] = _0x2c370c, _0x34f0d6['y'] = _0x43b597, _0x2759b2[_0x43a344(0x117)][_0x3dd10e] = _0x34f0d6, saveConfigFile(_0x2759b2); if (window['$uiPositio' + 'ns']) { const _0x38d439 = {}; _0x38d439['x'] = _0x2c370c, _0x38d439['y'] = _0x43b597, window['$uiPositio' + 'ns'][_0x3dd10e] = _0x38d439; } if (SceneManager['_scene'] && SceneManager['_scene']['_skillUI']) { const _0x221c4a = SceneManager[_0x43a344(0xb1d)]['_skillUI']; if (_0x221c4a[_0x43a344(_0x3d67cd._0x1bd263) + 'rounds'] && _0x221c4a['_gridBackg' + 'rounds'][_0x3c048d]) { const _0x477976 = _0x221c4a['_gridBackg' + 'rounds'][_0x3c048d]; _0x477976['x'] = _0x2c370c, _0x477976['y'] = _0x43b597; } } if (VisualEditorWindow && !VisualEditorWindow['closed']) { if ('IlFeJ' === 'IlFeJ') { const _0xa93e86 = VisualEditorWindow[_0x43a344(0x39c)]['getElement' + 'ById']('gridPosX'), _0x3ea670 = VisualEditorWindow['document']['getElement' + 'ById']('gridPosY'); if (_0xa93e86) _0xa93e86['value'] = _0x2c370c; if (_0x3ea670) _0x3ea670[_0x43a344(0x10e)] = _0x43b597; } else for (const _0x2e6fac in _0x2c895a) { const _0x304d99 = _0x51bdde[_0x2e6fac]; _0x304d99 && _0x3e6f02['updateSlot' + 'PositionFi' + 'elds'] && _0x19e951['updateSlot' + 'PositionFi' + 'elds'](_0x2e6fac, _0x304d99['x'], _0x304d99['y']); } } } else _0x3f8926[_0x43a344(0x27d)]('Error\x20dele' + _0x43a344(0x1b3), _0xddafb4), _0x201371('Error\x20dele' + 'ting\x20grid:' + '\x20' + _0x56c952[_0x43a344(0x71f)]); } catch (_0x56176d) { alert('Error\x20rese' + _0x43a344(0x828) + 'tion:\x20' + _0x56176d['message']); } }, window['updateGrid' + 'Position'] = function (_0x2227ff, _0x1f7bbc, _0x2d040e) { const _0x515a1e = { _0x207fbc: 0x3d9, _0x2b874d: 0xa23, _0x5c94e2: 0x117, _0x315caa: 0xaea, _0x50f6a0: 0xa23, _0x2f1194: 0xafe, _0x3480e9: 0xb57, _0x49d7cc: 0x787, _0x160710: 0x944, _0x12ed19: 0x61d, _0x274d47: 0x853, _0x1a1db1: 0x232, _0x367715: 0x9c0, _0x172ac7: 0xb1a }, _0x221657 = _0x57bd41; try { const _0x26a786 = loadConfigFile(); if (!_0x26a786) { if ('QCFmj' === _0x221657(_0x515a1e._0x207fbc)) { const _0xda7e34 = _0x170649[_0x221657(0x61e)][_0x221657(0x282)](',')[0x1 * -0x201 + -0x497 + -0x1 * -0x698][_0x221657(0xcb)](); return _0xda7e34 === _0x25adea; } else return; } const _0x546a16 = _0x26a786['grids'][_0x2227ff]; if (!_0x546a16 || !_0x546a16[_0x221657(_0x515a1e._0x2b874d)] || _0x546a16['Slots']['length'] === 0x1339 + -0x13e9 * 0x1 + 0xb0) return; !_0x26a786[_0x221657(_0x515a1e._0x5c94e2)] && (_0x26a786['positions'] = {}); const _0x2c262e = _0x221657(_0x515a1e._0x315caa) + _0x546a16[_0x221657(_0x515a1e._0x50f6a0)][-0x4e5 + 0x24a1 + -0x1fbc][_0x221657(0x61e)]['split'](',')[-0x3 * 0xa04 + -0x1403 + -0xa03 * -0x5]['trim'](); if (!_0x26a786['positions'][_0x2c262e]) { const _0x141d88 = {}; _0x141d88['x'] = 0x0, _0x141d88['y'] = 0x0, _0x26a786['positions'][_0x2c262e] = _0x141d88; } if (_0x1f7bbc === 'x') 'xbsPM' === _0x221657(_0x515a1e._0x2f1194) ? _0x39a5a5['error'](_0x221657(_0x515a1e._0x3480e9) + 'ting\x20slot:', _0x532bdf) : _0x26a786[_0x221657(_0x515a1e._0x5c94e2)][_0x2c262e]['x'] = _0x2d040e; else _0x1f7bbc === 'y' && (_0x26a786[_0x221657(_0x515a1e._0x5c94e2)][_0x2c262e]['y'] = _0x2d040e); saveConfigFile(_0x26a786); if (window[_0x221657(0x787) + 'ns']) { if (!window[_0x221657(0x787) + 'ns'][_0x2c262e]) { if (_0x221657(0x34b) === _0x221657(0x5f8)) _0xc91807['removeChil' + 'd'](_0x5589a2['_editorGlo' + 'w']), _0x30822f['_editorGlo' + 'w'] = null; else { const _0x4ef209 = {}; _0x4ef209['x'] = 0x0, _0x4ef209['y'] = 0x0, window[_0x221657(_0x515a1e._0x49d7cc) + 'ns'][_0x2c262e] = _0x4ef209; } } if (_0x1f7bbc === 'x') window['$uiPositio' + 'ns'][_0x2c262e]['x'] = _0x2d040e; else _0x1f7bbc === 'y' && (window['$uiPositio' + 'ns'][_0x2c262e]['y'] = _0x2d040e); } if (SceneManager[_0x221657(0xb1d)] && SceneManager['_scene'][_0x221657(0x19a)]) { const _0x1fea4d = SceneManager[_0x221657(0xb1d)][_0x221657(0x19a)]; if (_0x1fea4d['_gridBackg' + 'rounds'] && _0x1fea4d['_gridBackg' + 'rounds'][_0x2227ff]) { if ('UBfOI' === _0x221657(_0x515a1e._0x160710)) _0x5ed001['updateEdit' + _0x221657(_0x515a1e._0x12ed19)](); else { const _0xae30b7 = _0x1fea4d['_gridBackg' + _0x221657(_0x515a1e._0x274d47)][_0x2227ff]; if (_0x1f7bbc === 'x') _0xae30b7['x'] = _0x2d040e; else _0x1f7bbc === 'y' && (_0x221657(0x172) === _0x221657(_0x515a1e._0x1a1db1) ? _0x101d8b['push'](_0x59ffdc['$uiPositio' + 'ns'][_0x917674]) : _0xae30b7['y'] = _0x2d040e); } } } if (VisualEditorWindow && !VisualEditorWindow[_0x221657(_0x515a1e._0x367715)]) { const _0x3ced85 = VisualEditorWindow['document']['getElement' + _0x221657(0x3e5)]('gridPosX'), _0x36cf47 = VisualEditorWindow[_0x221657(0x39c)][_0x221657(0x134) + 'ById']('gridPosY'); _0x3ced85 && _0x1f7bbc === 'x' && ('sYGUg' !== 'sYGUg' ? _0x1a6974['parent'][_0x221657(_0x515a1e._0x172ac7) + 'd'](_0x168816) : _0x3ced85['value'] = _0x2d040e), _0x36cf47 && _0x1f7bbc === 'y' && (_0x36cf47['value'] = _0x2d040e); } } catch (_0x2c910d) { alert('Error\x20upda' + 'ting\x20grid\x20' + 'position:\x20' + _0x2c910d[_0x221657(0x71f)]); } }, window['deleteSlot'] = function (_0x472f84, _0x115a03) { const _0x3e5180 = { _0x21c4f5: 0x655, _0x1002d9: 0xb1d, _0x1d0d19: 0xcb }, _0xd8e62 = _0x57bd41; try { const _0x8a99a2 = loadConfigFile(); if (!_0x8a99a2) return; const _0x52cd2c = _0x8a99a2['grids'][_0x472f84]; if (!_0x52cd2c || !_0x52cd2c[_0xd8e62(0xa23)]) return; const _0x2d29e5 = _0x52cd2c['Slots']['findIndex'](_0x347bf3 => { const _0xac9a00 = _0x347bf3['Name']['split'](',')[-0x1b * -0xd7 + -0x5 * -0x64d + -0x362e]['trim'](); return _0xac9a00 === _0x115a03; }); if (_0x2d29e5 === -(0x281 + 0x403 + 0x1 * -0x683)) return; _0x52cd2c[_0xd8e62(0xa23)]['splice'](_0x2d29e5, -0x3 * 0xc58 + -0xe9c + -0xd * -0x3f9); if (_0x8a99a2['positions'] && _0x8a99a2['positions'][_0x115a03]) { if ('CDZpl' !== 'CDZpl') { _0x599520['_config'] = _0x324183, _0x2370df['x'] = _0x409305['x'], _0x48cd85['y'] = _0x1dd921['y']; if (_0x4ac769['createBack' + _0xd8e62(_0x3e5180._0x21c4f5)]) _0x3d258a['createBack' + 'ground'](); if (_0x3273a2[_0xd8e62(0x3f3) + 'ttonText']) _0x304a95['positionBu' + 'ttonText'](); if (_0x28adf0['refreshBut' + 'tonText']) _0x3cb76a['refreshBut' + _0xd8e62(0x88d)](); } else delete _0x8a99a2['positions'][_0x115a03]; } saveConfigFile(_0x8a99a2); window[_0xd8e62(0x787) + 'ns'] && window['$uiPositio' + 'ns'][_0x115a03] && ('euCUp' !== 'euCUp' ? delete _0x1d6e30['positions'][_0x34f30c] : delete window['$uiPositio' + 'ns'][_0x115a03]); _slotData && _slotData['has'](_0x115a03) && _slotData[_0xd8e62(0xac7)](_0x115a03); if (SceneManager[_0xd8e62(_0x3e5180._0x1002d9)] && SceneManager['_scene']['_skillUI']) { const _0x3f7f9b = SceneManager['_scene']['_skillUI']['_slots']['get'](_0x115a03); _0x3f7f9b && (_0x3f7f9b['parent'] && _0x3f7f9b['parent']['removeChil' + 'd'](_0x3f7f9b), SceneManager['_scene']['_skillUI']['_slots'][_0xd8e62(0xac7)](_0x115a03)); } if (VisualEditorWindow && !VisualEditorWindow['closed']) { if ('HwegD' !== 'UsZex') window['loadGridSl' + 'ots'](_0x472f84); else { const _0x2507d1 = _0x1f61cf['Name'][_0xd8e62(0x282)](',')[0x21cb + -0x8e1 * 0x1 + -0xc75 * 0x2][_0xd8e62(_0x3e5180._0x1d0d19)](); if (_0x2507d1 === _0x392863) return _0x4b5f08; } } } catch (_0x34b871) { console['error']('Error\x20dele' + 'ting\x20slot:', _0x34b871); } }, window['createNewG' + 'rid'] = function () { const _0x5ce06e = { _0x253379: 0x8a5, _0x170203: 0xaee, _0x40d251: 0x876, _0x49d4d5: 0x9c0 }, _0x2dbc06 = _0x57bd41; if (!Utils[_0x2dbc06(_0x5ce06e._0x253379)]()) return; try { const _0x3bd651 = loadConfigFile(); if (!_0x3bd651) { if ('xyLxI' !== _0x2dbc06(_0x5ce06e._0x170203)) _0x58f343[-0x577 + 0x24bf + -0x3 * 0xa6d] = _0x4a13f9; else return; } const _0x3b2c49 = {}; _0x3b2c49['Slots'] = [], _0x3b2c49['Controllab' + _0x2dbc06(_0x5ce06e._0x40d251) + 'ad'] = 'true', _0x3b2c49[_0x2dbc06(0x629) + 'Image'] = ''; const _0x43044c = _0x3b2c49; _0x3bd651['grids']['push'](_0x43044c), saveConfigFile(_0x3bd651), VisualEditorWindow && !VisualEditorWindow[_0x2dbc06(_0x5ce06e._0x49d4d5)] && window[_0x2dbc06(0x651) + 'orLists'](); } catch (_0x5a2b85) { console['error'](_0x2dbc06(0x893) + 'ting\x20grid:', _0x5a2b85); } }, window[_0x57bd41(0xae1)] = function (_0x572e15) { const _0x178c0d = { _0xb25427: 0x141, _0x404619: 0x815, _0x4f6d0d: 0x427, _0xc4db14: 0x72f, _0x2f2d68: 0xa23, _0x415da4: 0x72f, _0x15e9d8: 0x8ef, _0x4e5d8d: 0x117, _0x5ca209: 0x59b, _0x31454b: 0x19a, _0x187389: 0xb1d, _0x399e3f: 0x19a, _0xda83fd: 0x651, _0x1908b1: 0x134, _0x576843: 0x1c7, _0x1d22e6: 0x3e6, _0x2468bb: 0x5d2, _0x402b01: 0x547, _0x4441b4: 0x4a6, _0x435fa5: 0x20b, _0x329733: 0xb57, _0x56cf8d: 0x71f }, _0x36a718 = { _0x124934: 0x864 }, _0x3fae0 = { _0x14745b: 0x1dd, _0x1dce84: 0x939, _0x436758: 0xac7, _0x525c66: 0x21b, _0x1536c0: 0x7f8, _0x4fb733: 0x308, _0x5ced1d: 0x954, _0x17ee6a: 0x632, _0x48544e: 0x7a6 }, _0x1ce68a = { _0x30b321: 0x27d }, _0xdb05b5 = _0x57bd41; if (!Utils['isNwjs']()) return; try { if ('xmeiz' === _0xdb05b5(_0x178c0d._0xb25427)) { const _0x3d1da7 = loadConfigFile(); if (!_0x3d1da7) { if (_0xdb05b5(_0x178c0d._0x404619) === 'VTMzm') { alert('Config\x20fil' + 'e\x20not\x20foun' + 'd!'); return; } else { const _0x4e1bc1 = { _0x334506: 0x5ac }; _0x5aa135['_scene']['_skillUI'][_0xdb05b5(_0x178c0d._0x4f6d0d) + 'rounds'][_0xdb05b5(0x59b)](_0x5da6a8 => { const _0x5f7397 = _0xdb05b5; _0x5da6a8['_isPlaceho' + _0x5f7397(_0x4e1bc1._0x334506)] && (_0x5da6a8['visible'] = ![]); }); } } const _0x2c6c76 = _0x3d1da7[_0xdb05b5(_0x178c0d._0xc4db14)][_0x572e15]; if (!_0x2c6c76) { alert('Grid\x20not\x20f' + 'ound!'); return; } const _0x19999a = _0x2c6c76['Slots'] ? _0x2c6c76[_0xdb05b5(_0x178c0d._0x2f2d68)]['map'](_0x368be6 => _0x368be6['Name']['split'](',')[-0x20c + 0x1e5c + 0x1 * -0x1c50][_0xdb05b5(0xcb)]()) : []; _0x3d1da7[_0xdb05b5(_0x178c0d._0x415da4)]['splice'](_0x572e15, -0x135 * 0x9 + -0x15ae + 0x208c); if (_0x3d1da7['positions'] && _0x19999a[_0xdb05b5(_0x178c0d._0x15e9d8)] > -0x18cc + -0x1be7 + 0x34b3) { _0x19999a[_0xdb05b5(0x59b)](_0x26f9d7 => { const _0x39e1eb = _0xdb05b5; _0x3d1da7['positions'][_0x26f9d7] && ('hhcaQ' === 'hhcaQ' ? delete _0x3d1da7['positions'][_0x26f9d7] : _0x2cf55f[_0x39e1eb(_0x1ce68a._0x30b321)]('Error\x20crea' + 'ting\x20grid:', _0xeaaf72)); }); if (_0x19999a['length'] > -0x130d + -0x1e72 + 0x317f * 0x1) { if ('FsjYo' === 'JymdC') _0x5a4ebb['delete'](_0x163baf); else { const _0x288276 = 'grid_' + _0x19999a[0x1660 + -0x1 * 0x20a9 + -0xa49 * -0x1]; _0x3d1da7['positions'][_0x288276] && delete _0x3d1da7[_0xdb05b5(_0x178c0d._0x4e5d8d)][_0x288276]; } } } saveConfigFile(_0x3d1da7), _0x19999a[_0xdb05b5(0x59b)](_0x30147c => { const _0xe0031e = _0xdb05b5; if (window['$uiPositio' + 'ns'] && window['$uiPositio' + 'ns'][_0x30147c]) { if (_0xe0031e(_0x3fae0._0x14745b) === 'IXaOr') delete window['$uiPositio' + 'ns'][_0x30147c]; else { const _0x59e594 = {}; _0x59e594['x'] = _0x42505f, _0x59e594['y'] = _0x3f11fd, _0x3890b9[_0xe0031e(0x787) + 'ns'][_0x31c65f] = _0x59e594; } } if (_slotData && _slotData[_0xe0031e(0x34f)](_0x30147c)) { if (_0xe0031e(_0x3fae0._0x1dce84) === 'sfcut') _slotData[_0xe0031e(_0x3fae0._0x436758)](_0x30147c); else { const _0x2ccebf = _0x98925d * _0xa19c29 + (_0x191295 - (-0x5 * 0x6b3 + -0x124d + 0x33cd)) * _0x30eea6, _0x57665b = _0x4439fc * _0x88891a + (_0x452a9b - (0xe78 * -0x1 + 0x74b + 0x72e)) * _0xce2c9a, _0x3150ab = new _0x184cf2(_0x2ccebf + (0xa67 + -0x1fe3 + 0x1590), _0x57665b + (-0x1b7b + 0x1225 + -0xf1 * -0xa)), _0x59ee6e = _0x3150ab[_0xe0031e(0x89a)]; _0x59ee6e['strokeStyl' + 'e'] = 'rgba(255,\x20' + '215,\x200,\x200.' + '9)', _0x59ee6e['fillStyle'] = 'rgba(255,\x20' + '215,\x200,\x200.' + '25)', _0x59ee6e['lineWidth'] = -0x13cb + 0x289 + 0x1146, _0x59ee6e[_0xe0031e(_0x3fae0._0x525c66) + 'h']([0x1680 + 0x55a * 0x3 + 0x2682 * -0x1, 0x5f2 * 0x4 + 0x34 + -0x17f6 * 0x1]), _0x59ee6e['fillRect'](-0x3 + -0x496 * 0x1 + 0x1 * 0x499, 0x1b7c + 0x7e2 + -0x235e, _0x2ccebf + (-0x1ece + -0x34e * -0x6 + -0x2 * -0x587), _0x57665b + (0x2 * -0x88f + 0x2 * -0xdb2 + 0x36e * 0xd)), _0x59ee6e[_0xe0031e(_0x3fae0._0x1536c0)](-0x4d * 0x7 + 0x7c4 + -0x5a9, -0x26cc + 0x6bb * 0x3 + 0x129b, _0x2ccebf + (-0x540 + -0x1e3c + 0x2390), _0x57665b + (-0x1 * 0x2263 + -0x10 * -0x129 + 0x17 * 0xb1)), _0x59ee6e[_0xe0031e(_0x3fae0._0x4fb733)] = 'bold\x2020px\x20' + 'Arial', _0x59ee6e['fillStyle'] = 'rgba(255,\x20' + _0xe0031e(_0x3fae0._0x5ced1d) + '0)', _0x59ee6e[_0xe0031e(_0x3fae0._0x17ee6a)] = 'center', _0x59ee6e['textBaseli' + 'ne'] = 'middle', _0x59ee6e['fillText']('Grid\x20' + (_0x220f20 + (0x1059 + -0x1cc3 + 0x11 * 0xbb)), (_0x2ccebf + (0x262b + -0x2b * -0xca + -0x4805)) / (-0x15b1 + 0x169d + 0x12 * -0xd), (_0x57665b + (-0x9 * -0x326 + -0x1 * 0xa1e + -0x1224 * 0x1)) / (-0x137 * 0x2 + 0x221e + -0x1fae)), _0x52e0e4[_0xe0031e(0x42c)] = ![], _0x510889[_0xe0031e(_0x3fae0._0x48544e)] = _0x3150ab, _0x13a049['visible'] = !![]; } } }); if (SceneManager['_scene'] && SceneManager['_scene']['_skillUI']) { _0x19999a[_0xdb05b5(_0x178c0d._0x5ca209)](_0x1b827d => { const _0x2556bd = _0xdb05b5, _0x54f607 = SceneManager['_scene']['_skillUI']['_slots']['get'](_0x1b827d); _0x54f607 && (_0x54f607[_0x2556bd(_0x36a718._0x124934)] && _0x54f607[_0x2556bd(_0x36a718._0x124934)]['removeChil' + 'd'](_0x54f607), SceneManager['_scene']['_skillUI']['_slots']['delete'](_0x1b827d)); }); if (SceneManager['_scene'][_0xdb05b5(_0x178c0d._0x31454b)][_0xdb05b5(0x427) + 'rounds'] && SceneManager[_0xdb05b5(_0x178c0d._0x187389)]['_skillUI'][_0xdb05b5(_0x178c0d._0x4f6d0d) + 'rounds'][_0x572e15]) { const _0x40c2a0 = SceneManager['_scene'][_0xdb05b5(0x19a)]['_gridBackg' + 'rounds'][_0x572e15]; if (_0x40c2a0 && _0x40c2a0[_0xdb05b5(0x864)]) { if ('fBVan' === 'fBVan') _0x40c2a0['parent']['removeChil' + 'd'](_0x40c2a0); else return; } delete SceneManager['_scene'][_0xdb05b5(_0x178c0d._0x399e3f)]['_gridBackg' + 'rounds'][_0x572e15]; } } if (VisualEditorWindow && !VisualEditorWindow['closed']) { window[_0xdb05b5(_0x178c0d._0xda83fd) + 'orLists'](); const _0x145711 = VisualEditorWindow['document'][_0xdb05b5(_0x178c0d._0x1908b1) + 'ById']('properties' + 'Panel'); if (_0x145711) { if (_0xdb05b5(_0x178c0d._0x576843) !== 'suSkH') try { const _0x56c7ea = _0x52a0ab('fs'), _0x134597 = _0x4ce33d(); if (_0x56c7ea['existsSync'](_0x134597)) { const _0x928957 = _0x13119f(); _0x2af797 = _0x928957[_0xdb05b5(_0x178c0d._0x415da4)] || []; } } catch (_0x47fff1) { _0x1d9853['error']('Error\x20upda' + 'ting\x20edito' + 'r\x20lists:', _0x47fff1); } else _0x145711['innerHTML'] = '<div\x20class' + '=\x22empty-st' + 'ate\x22>Grid\x20' + 'deleted.\x20S' + _0xdb05b5(0x9e9) + 'her\x20grid\x20t' + _0xdb05b5(_0x178c0d._0x1d22e6) + 'iv>'; } const _0xa38139 = VisualEditorWindow['document'][_0xdb05b5(0x134) + 'ById']('slotPrevie' + 'w'); _0xa38139 && (_0xa38139['style']['display'] = _0xdb05b5(_0x178c0d._0x2468bb)); } } else _0x39c06b['positions'] = {}; } catch (_0x47fb04) { if (_0xdb05b5(_0x178c0d._0x402b01) === 'QAcuv') { if (!_0x211efe[_0xdb05b5(_0x178c0d._0x187389)] || !_0x237733['_scene']['_skillUI']) return ![]; for (const [_0x35c587, _0x8e5c2e] of _0x3fada5[_0xdb05b5(0xb1d)]['_skillUI']['_slots']) { const _0x4ec8fd = _0x8e5c2e['width'] || 0x11e2 + -0x24f9 + 0x1 * 0x1357, _0x4315f0 = _0x8e5c2e['height'] || 0x1375 + 0xc2f + -0x7 * 0x47c; if (_0x4bc8a8 >= _0x8e5c2e['x'] - _0x4ec8fd / (-0x161c + -0x143 * 0x2 + 0x18a4) && _0x25229e <= _0x8e5c2e['x'] + _0x4ec8fd / (-0x165a + -0x1a35 + -0x1 * -0x3091) && _0x3d8113 >= _0x8e5c2e['y'] - _0x4315f0 / (0x15a4 + -0x1 * 0x21c3 + -0x1 * -0xc21) && _0x2b0642 <= _0x8e5c2e['y'] + _0x4315f0 / (-0x423 + 0x518 + -0xf3)) return _0x14a2f4 = _0x35c587, _0x30ea01[_0xdb05b5(_0x178c0d._0x4441b4) + 'InGame'](_0x35c587), _0x450846 && !_0x6afa46['closed'] && _0x65ba10['selectSlot' + _0xdb05b5(_0x178c0d._0x435fa5)](_0x35c587), !![]; } return ![]; } else console['error'](_0xdb05b5(_0x178c0d._0x329733) + 'ting\x20grid:', _0x47fb04), alert(_0xdb05b5(0xb57) + 'ting\x20grid:' + '\x20' + _0x47fb04[_0xdb05b5(_0x178c0d._0x56cf8d)]); } }, window['updateGrid' + _0x57bd41(0x7d5) + 'trollable'] = function (_0x15a0af, _0x5766ee) { const _0x1e117f = { _0xf5210b: 0x601 }, _0x169c29 = _0x57bd41; if (!Utils[_0x169c29(0x8a5)]()) { if ('ioaiI' === 'EntWK') _0x489a13(_0x46e1d6, _0x3fa3fb(_0x7b23e4) || -0x2 * 0x985 + -0x11 * -0x22d + 0x1 * -0x11f3); else return; } try { if ('Zsbdm' !== 'adIVg') { const _0x2e1682 = loadConfigFile(); if (!_0x2e1682 || !_0x2e1682[_0x169c29(0x72f)]) return; const _0x5ba31d = _0x2e1682['grids'][_0x15a0af]; if (!_0x5ba31d) return; _0x5ba31d['Controllab' + 'leViaGamep' + 'ad'] = _0x5766ee ? _0x169c29(0x718) : _0x169c29(0x768), saveConfigFile(_0x2e1682); } else _0xa63506['loadGridSl' + _0x169c29(_0x1e117f._0xf5210b)](_0x36658f); } catch (_0x28d653) { } }, window[_0x57bd41(0x4b7) + _0x57bd41(0x8c4)] = function () { const _0x2b6018 = { _0x234820: 0x787 }, _0x3bd511 = _0x57bd41; if (!window[_0x3bd511(_0x2b6018._0x234820) + 'ns']) return; window['$uiPositio' + 'ns'] = {}, saveHotbarPositions({}), SceneManager['goto'](SceneManager['_scene']['constructo' + 'r']); }, window['createNewS' + _0x57bd41(0xb40)] = function (_0x103c08, _0x112f83) { const _0x58d250 = { _0x1c3c6b: 0x72f, _0x398ad0: 0xa51, _0x2d680f: 0xacf, _0x216112: 0x4e1, _0x447f7e: 0x416, _0x4cf8d9: 0x115, _0x5c39ee: 0x853, _0x315660: 0x427, _0x3f3d46: 0x651 }, _0x4b8328 = { _0x5ecbde: 0xcb }, _0x3b0887 = _0x57bd41; try { if ('GREqa' === _0x3b0887(0xafb)) { const _0x382fd9 = loadConfigFile(); if (!_0x382fd9 || !_0x382fd9[_0x3b0887(0x72f)][_0x103c08]) { if ('HalOM' !== 'HalOM') _0x1c27a9[_0x3b0887(0x2a0)](_0x4a902d[_0x3b0887(0x117)][_0x375ef7]); else { alert('Invalid\x20gr' + 'id\x20index!'); return; } } const _0x5c780c = _0x112f83['name']['split'](',')[-0x17c0 + 0x8 * -0x3b4 + 0x3560]['trim'](), _0x36cbb9 = _0x382fd9[_0x3b0887(_0x58d250._0x1c3c6b)][_0x103c08]; if (!_0x36cbb9[_0x3b0887(0xa23)]) _0x36cbb9['Slots'] = []; const _0x1858eb = _0x36cbb9['Slots'][_0x3b0887(_0x58d250._0x398ad0)](_0x2aa96d => { const _0x3e6d24 = _0x3b0887; if (_0x3e6d24(0x44d) !== _0x3e6d24(0x84c)) { const _0xd314ca = _0x2aa96d['Name']['split'](',')[0x1 * 0x10c9 + 0x1 * 0xbf6 + -0x1cbf][_0x3e6d24(_0x4b8328._0x5ecbde)](); return _0xd314ca === _0x5c780c; } else _0x48bc92['positions'] = {}; }), _0x36b4dd = { 'Name': _0x112f83['name'], 'BackgroundImage': _0x112f83['background' + 'Image'] || '', 'Button': _0x112f83[_0x3b0887(0x4b5)], 'TextOffsetY': _0x112f83[_0x3b0887(_0x58d250._0x2d680f) + 'Y']['toString'](), 'SpecialBehavior': _0x112f83['specialBeh' + _0x3b0887(0xa63)] }; _0x1858eb >= -0x1 * -0x12c6 + 0x6 * 0x649 + 0x4b5 * -0xc ? _0x36cbb9['Slots'][_0x1858eb] = _0x36b4dd : _0x36cbb9['Slots'][_0x3b0887(0x2a0)](_0x36b4dd); !_0x382fd9[_0x3b0887(0x117)] && (_0x382fd9[_0x3b0887(0x117)] = {}); const _0x80965a = {}; _0x80965a['x'] = _0x112f83['x'], _0x80965a['y'] = _0x112f83['y'], _0x382fd9[_0x3b0887(0x117)][_0x5c780c] = _0x80965a, saveConfigFile(_0x382fd9); !window['$uiPositio' + 'ns'] && (_0x3b0887(_0x58d250._0x216112) === 'OUsDY' ? _0x4911fe(() => _0x587af8(_0xdc26b0 + (-0xd11 + -0x1 * -0x213e + -0x142c)), 0x2695 + -0x6e3 * -0x5 + -0x48a0) : window['$uiPositio' + 'ns'] = {}); const _0x3cdcda = {}; _0x3cdcda['x'] = _0x112f83['x'], _0x3cdcda['y'] = _0x112f83['y'], window[_0x3b0887(0x787) + 'ns'][_0x5c780c] = _0x3cdcda; if (SceneManager['_scene'] && SceneManager['_scene']['_skillUI']) { const _0x450489 = SceneManager[_0x3b0887(0xb1d)]['_skillUI']; let _0xd1daca = _0x450489['_slots'][_0x3b0887(_0x58d250._0x447f7e)](_0x5c780c); if (!_0xd1daca) { if ('grrLl' !== 'BMPpr') _0xd1daca = new Sprite_SkillSlot(_0x36b4dd), _0xd1daca['x'] = _0x112f83['x'], _0xd1daca['y'] = _0x112f83['y'], _0x450489['_slots'][_0x3b0887(_0x58d250._0x4cf8d9)](_0x5c780c, _0xd1daca), _0x450489['addChild'](_0xd1daca); else return; } else { _0xd1daca[_0x3b0887(0x700)] = _0x36b4dd, _0xd1daca['x'] = _0x112f83['x'], _0xd1daca['y'] = _0x112f83['y']; if (_0xd1daca['createBack' + _0x3b0887(0x655)]) _0xd1daca['createBack' + 'ground'](); if (_0xd1daca['positionBu' + 'ttonText']) _0xd1daca['positionBu' + 'ttonText'](); if (_0xd1daca['refreshBut' + 'tonText']) _0xd1daca['refreshBut' + 'tonText'](); } if (_0x450489[_0x3b0887(0x427) + _0x3b0887(_0x58d250._0x5c39ee)] && _0x450489['_gridBackg' + 'rounds'][_0x103c08]) { const _0x47932f = _0x450489[_0x3b0887(_0x58d250._0x315660) + _0x3b0887(_0x58d250._0x5c39ee)][_0x103c08]; _0x47932f['_grid'] = _0x382fd9['grids'][_0x103c08], _0x47932f['_gridSlots'] = []; } } VisualEditorWindow && !VisualEditorWindow['closed'] && window[_0x3b0887(_0x58d250._0x3f3d46) + 'orLists'](); } else _0xf16e47['visible'] = _0x13cc55 === _0x193844; } catch (_0x183a2) { console[_0x3b0887(0x27d)]('Error\x20crea' + 'ting\x20slot:', _0x183a2); } }; function _0x281b(_0x5a048d, _0x4a8694) { _0x5a048d = _0x5a048d - (-0x1 * 0x1175 + -0x1de3 + -0x6b * -0x73); const _0xc0543d = _0x44f8(); let _0x248329 = _0xc0543d[_0x5a048d]; return _0x248329; } function saveSlotPosition(_0x240305, _0x5ef04d, _0xaeb5cd) { const _0x3f0aaf = _0x57bd41; !window[_0x3f0aaf(0x787) + 'ns'] && (window['$uiPositio' + 'ns'] = {}); const _0x5df224 = {}; _0x5df224['x'] = _0x5ef04d, _0x5df224['y'] = _0xaeb5cd, window['$uiPositio' + 'ns'][_0x240305] = _0x5df224, window['saveHotbar' + 'UIPosition' + 's'] && window['saveHotbar' + 'Positions'](window['$uiPositio' + 'ns']); } let clickStartPos = null, clickStartTime = 0x1295 + 0x17 * 0x7b + -0x1da2; const DRAG_THRESHOLD = 0xa71 * -0x2 + 0x1 * -0x260f + -0x1d7b * -0x2, _TouchInput_onMouseDown_VisualEditor = TouchInput['_onMouseDo' + 'wn']; TouchInput['_onMouseDo' + 'wn'] = function (_0x26fe19) { const _0x59f8ff = { _0x509a21: 0x49a, _0x3e8424: 0x9aa, _0x82b09d: 0x1fd, _0x3ca769: 0x52f }, _0x1f151b = _0x57bd41; if (editorMode && SceneManager['_scene'] instanceof Scene_Map) { if (_0x1f151b(_0x59f8ff._0x509a21) !== 'gMbNP') { const _0x1cda0b = _0x9f76b8(_0x35c323['_config']['TextOffset' + 'Y'] || -0x1 * 0x15de + 0x623 + 0xfbb); _0x1d9033['_buttonSpr' + 'ite']['y'] = _0x45034b['bitmap']['height'] / (0x2225 + -0x74 * 0x8 + -0x49 * 0x6b) + _0x1cda0b; } else { const _0x3484d4 = Graphics[_0x1f151b(_0x59f8ff._0x3e8424) + 'asX'](_0x26fe19[_0x1f151b(_0x59f8ff._0x82b09d)]), _0x303265 = Graphics['pageToCanv' + 'asY'](_0x26fe19['pageY']), _0x172b81 = {}; _0x172b81['x'] = _0x3484d4, _0x172b81['y'] = _0x303265, clickStartPos = _0x172b81, clickStartTime = Date['now'](); } } _TouchInput_onMouseDown_VisualEditor[_0x1f151b(_0x59f8ff._0x3ca769)](this, _0x26fe19); }; const _TouchInput_onMouseUp_VisualEditor = TouchInput['_onMouseUp']; function _0x44f8() { const _0x2ec5cc = ['CP8xghARHl', 'removeChil', 'thXbjFNHls', 'cjtjnypLXr', '_scene', 'sC2A3cD++7', 'pageY', '\x20\x20\x20\x20\x20\x20\x20\x20al', 'cACVzpBGwq', '\x20\x20\x20\x20</butt', 'ton\x27);\x0a\x20\x20\x20', 'ing\x20slot\x20p', 'GUrSdI1ugs', 'aJ3I2H2Wb8', '7+Lf+GhQ7a', 'i+DBUu3yMf', 'AIyILVEL96', 'd.com/invi', 's:\x20var(--r', 'k-image:\x20l', '9Xubb23cuu', '\x20\x20\x20\x20\x20\x20\x20\x20\x20<', 'uIZuUAkFZx', 'SelectorAl', 'PD5sMs6OIX', 'ted\x27\x20:\x20\x27\x27}', 'X\x27);\x0a\x20\x20\x20\x20\x20', 'ction(e)\x20{', ',\x20fileName', 'o4HZ+3b5hr', '\x22hint\x22\x20sty', 'EpvEW1KL1X', 'usIoUpQqlQ', 'VsJ15fCMTX', 'd\x22>\x0a\x20\x20\x20\x20\x20\x20', 'on)\x22\x0a\x20\x20\x20\x20\x20', 'dex\x20!==\x20cu', 'tpt2nHaT9p', 'p5coFE8TGN', 'lot', 'umY7uxs/1y', 'ity:\x200.85;', 'CJIq2QKwQ9', 'PositionFi', 'zN3Ufrnr34', 'oqQ+fuxVth', '\x20deleteBtn', 'iiTVYtWSSY', 'align:\x20cen', 'V1O96I6moY', 'pener.high', 'class=\x22sec', 'Y108fmdqNQ', 'acity:\x200.7', '9P/XzFX/S4', 'CtCVi3Kpa4', '\x20alert(\x27Pl', 'pyKFEIuIXl', 'name\x27;\x0a\x20\x20\x20', '4a4uyF0P66', '66NrFH2igt', 'gridBackgr', 'Error\x20dele', 'ji4gAj4vDC', 'NbiptLG73B', 'XK9E4E5i/L', 'm5HnMVJKM3', 'torials\x22\x20s', 'xRAaZvnLOF', 'djYdg9dICv', 'GfrpBn5Kqx', '+FtrEYs2ob', '\x20\x20\x20\x20\x20\x20\x20\x20do', 'usZ8M13wRh', 'xXDnc', 'rentGrid\x20=', 'ot()\x20{\x0a\x20\x20\x20', 'WGbIvFEERw', 'mp2dCRCfDw', 'WqAKqreAOT', 'innerHTML', 'Y1b100h+4C', 'Xm3es17d9s', '9DFuv1c+QM', 'qlgA7611iS', 'ue\x20=\x20curre', '9lv87RLcEv', 'alue);\x0a\x20\x20\x20', 'PUy2jv6JLo', 'Hs+0wBa9I5', 'pSR5FK7I0m', '0bliu+Ly4n', '.opener.ge', 'ner.findGr', 'UCCV8nF9bP', '/ldcJlwoUx', 'teSlotPosi', '86c9rv9Mle', ';\x20\x20//\x20Bott', 'zh0Xq0e6er', 'XOsuqtVy95', 'fjXp7x1h4t', 'YhkBDNmoZN', 'DAQgCgMFck', 'XJeZwbzRRs', 'iakYeRbzOA', 'f\x20(input.m', 'LwlNa4PRML', '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20', 'CkAi5zUPsU', 'tyle=\x22marg', 'ZmEfqLuKWs', 'entById(\x27g', 'l.innerHTM', 'dImage)\x20{\x0a', 'ileInput)\x20', 'd2eO5ordWp', 'P9x98T/TbD', 'F+9/yx/g/D', 'OMaUzYOUKt', 'r.updateGr', 'OJmcLYt1Ba', 'UnC+rDds6t', 'w3ZEmy9Sft', '_blank', 'Z3jTM1wh6h', 'N2oxBIJADV', 'O9e2f1Nhz+', '93p0nk+DEL', 'Rj3NjFWo/G', 'ljvTOFKlpL', 'label>\x0a\x20\x20\x20', '3/j6pssbrG', 'L5jaMiz8Pr', 'splice', 'g53RMzfkD2', 'EgXQmJW0Yu', '\x20font-size', 'title\x20=\x20\x27D', '\x20\x20\x20\x20backgr', 'trim', 'e0zUOdV73J', 'e-list::-w', '7+2xvpt1/G', 'OjINHIOeBO', 'q57YchjIHt', 'sqrt', 'seeOXCXLZL', 'ption>\x0a\x20\x20\x20', 't.style.wi', 's=\x22empty-s', '\x20\x20\x20\x20\x20\x20\x20\x20--', 'Ez7tR3uMEz', 'Z9SgdvKV4V', 'Rd+1cbvOK/', '7QH5SP6o02', 'ity\x20kept\x20f', 'opzkRgnncD', 'dgqE1RfxGk', 'VQ0YKyejWT', 'KMybPP6bUz', 'mBcKJQ+Rr7', 'highlightG', 'tension)\x22\x0a', 'ottom:\x2020p', '\x20padding:\x20', 'dSlots()\x22\x20', 'rM1H4xoGiw', 'Hendrix\x20Ho', 'DosKINAonX', 'KjpIBCBXvF', 's://discor', 'ufLil6SRyZ', 'bo7Zz4nbY3', 'surface-2)', 'YtsbVvwlQi', 'in:\x200\x200\x2010', '6gGLZDV9ss', 'or:\x20pointe', 'sition)\x20{\x0a', 'nction(suc', 'iGLBDDqrf4', '-mono)\x20!im', '4YjcXGQ52I', 't:\x20auto;\x22>', 'dIndex\x20=\x20w', '0\x2010px\x200;\x22', 'UAStyyNDyk', 'dSlots', '.map(b\x20=>\x20', 'f\x20(!slots\x20', '0tI9134tUi', 'Ttf3zprMjh', '5nnjOwpZfG', 's[1]\x20||\x20\x27\x27', 'xFnn9PoaJU', 'assList.ad', 'ry0LndT7YX', 'ykLWDWHdMB', 'done!\x27))\x20{', 'FPTZT', 'EUtQ7AQ3hd', '8SOQZRN6B8', 'mH4OkKKbNs', '_isDragMod', 'qZOzYwmx3J', '6AWjq1BR1L', 'value', '\x20\x20\x20\x20\x20\x20\x20\x20sl', 'ChhBgSsBdE', '\x20else\x20{\x0a\x20\x20', 'AYfhBJyG83', 'Hv5Pd3rpJ1', 'Sx4V0YBHaz', 'set', 'FRFMcumwON', 'positions', 'bD/wdVvkQq', '8yV/PDVUyC', 'le=\x22displa', '+uRTXCutUw', 'rOkfD4Qrb1', '215,\x200,\x20', 't.createEl', 'ts:\x20none;\x0a', 'ent;\x20}\x0a\x20\x20\x20', '4+kZayrm0P', 'ApHaNKCUUM', '3Mkb2fbG5u', 'Wuq3LqM7fe', 'kOND0Idvxn', 'tion(e)\x20{\x0a', '\x20if\x20(curre', '+WdX1mkG/6', 'nvbdtY2FZF', 'YDYIoZ0vyp', 'index;\x0a\x20\x20\x20', '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'vbWlo//ume', '9JLHpROXfS', '=\x20document', 'strokeStyl', '\x20\x20\x20\x20\x20<h3\x20s', 'Image(this', 'ow.opener\x20', 'getElement', '8kkAMMEoMM', 'Wzi65TiXgE', 'catch', '\x20\x20\x20\x20.field', 'sMToH29dd/', '4J0JnZllv6', 'xDHaGhe3fb', 'MyC+ZnFTZM', '\x20\x20\x20\x20\x20style', 'pFojaYyqqZ', '8lUDFPghxs', '\x20+\x201}\x20(${g', 'xmeiz', 'ots\x20not\x20fo', '15px;\x0a\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20co', 'rcCNxtIAVD', '+KtWzhSxfP', 'iNfSUbiqjS', 'DqSd/UmWTr', 'T8yRB0detV', 'ow.opener.', 'pxrIhDzmkU', 'ng\x20Hendrix', 'TDkeGIFRAx', '\x20\x20<div\x20cla', 'otName\x20===', 'EtaoKI2Nio', 'YK8zzjc4Fu', 'Tgzr2fdaWn', 'kO7239h7bo', 'RowColumn', 'dVAT1BbloF', 'ADVUSvKnkF', 'GYz1haX9nk', 'eHV6LP2RTK', 'Udps3pf1rz', 'A97lepjury', '444;\x20borde', 'tion();\x0a\x20\x20', '2px;\x20}\x0a\x20\x20\x20', 'q7yYb3ADyl', 'idRows\x22\x20va', '?\x20fullConf', '.opener.up', 'writeFileS', '\x20\x20\x20\x20\x20\x20\x20\x20<i', 'sLD/mBn65l', 'GlmFLcKdGU', 'onfig.json', '50%,\x20-50%)', '-sm);\x0a\x20\x20\x20\x20', 'txH3ENTJj6', 'dex;\x0a\x20\x20\x20\x20\x20', 'tingSlots\x20', 'Yn3o8FAamL', 'Epk6fSpQhY', '9vWJfde0g+', '\x20\x20onchange', 'e/n2T2c3rn', 'ilo20x76Zg', 'KqTkC', 'e\x20or\x20skill', '\x20\x20\x20<label>', '\x20if\x20(bgIma', 'e-3);\x0a\x20\x20\x20\x20', 'ETbfSiH8dv', 'HGKa8dxrH3', '4dUEGQr3lL', 'aywUYbdcNq', 'fK0CKqZm1e', 'eu7oW//ewe', 'wmuE+Bu5L/', ')\x20{\x0a\x20\x20\x20\x20\x20\x20', 'rt0+N/PVu4', '/option>\x0a\x20', 'mepadContr', 'ZOn7Ae49Zt', 'geInput)\x20{', 'jdn5OGaMe/', 'M3fbzG6aBV', 'wk//zK5U+8', 'tyle=\x22back', 'teGridPosi', 'fOIf4V/8Dt', 'close', 'A4IDNgdcD9', '/AdwNt4oVu', 'ptz10CdJX2', 'X69/glx5zV', '8HCHRDMe5i', 'Tc5NTc3azS', '\x20\x20previewB', '9sPfAWyZvS', '=\x22field\x20fu', 'tuqRIn5fSD', 'eNewGrid)\x20', 'wCx2cwB5zw', 'Q0FI1CjO4z', '\x20\x20\x20\x20</div>', 'iewSlot.st', '_skillUI', 'OrUTC', '9E1aw3ly0A', 'FZM6qdCssR', 'TN6Pr7TQvb', 'iThCfE2ikv', 'Db1qZNGR0v', 'k8NuG8g2GS', 'le(current', 'reviewText', '\x20removeGri', 'addChildAt', 'URV8kXlJro', ':\x20var(--su', '<input\x20typ', 'sDReVromaT', 'QAaViqzYCy', '/ylrTHH6hQ', '\x20\x20alert(\x27F', 'yYZYvpVSdF', '\x20center;\x0a\x20', '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'KRYcMyxGve', 'U67HKXerDh', '3Ql00A+yfd', 'ting\x20grid:', '\x27Please\x20se', '3TdB6xM/jJ', 'xXNnbi1/Zj', 'XFWe6rB09/', 'WVRbXLBELZ', 'Myhev', 'VHBVcF3w+x', 'W00LM2376n', 'ound\x20image', 'ing\x20grid\x20s', '\x20y:\x20300,\x0a\x20', '[Hotbar]\x20F', 'NdDDfdr+yK', '7X7HxQSzUd', 'XRIvrQ49ut', '0;\x0a\x0a\x20\x20\x20\x20\x20\x20', 'HuxUc4gpkf', 'utM7hyI/+K', '\x20\x20\x20\x20\x20posit', 'suSkH', 'zY2NT/6N7H', '5N6FPDusfs', 'height=700', 'ylcxd7m/3X', '7kYFSt4AGQ', '\x20p\x20{\x0a\x20\x20\x20\x20\x20', '/B/oRX18Kw', 'V91dCuG9ER', 'positionY', '800;\x0a\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20.del', 'm.classNam', ':-webkit-s', 'fwMsX8IRBD', 'wtECR2KE4G', '2zUwnXDNDm', '0pQ6cZ8W1G', 'qf2Q4a4LgN', 'L3Tv9sz4id', '+GmFHmhYp9', 'HrRHnR88Pc', 'IXaOr', '\x20\x20.toolbar', 'ter;\x20\x0a\x20\x20\x20\x20', 'NREWjk0M2y', '\x20reset!\x20Th', 'nameKb', 'TwL2hJKeZd', 'TXFsG', 'l8CtmJ6p/f', 'ocXAZzjR0c', '+sYZ3d9UHq', 'GridBackgr', '9BlBGH+ZPx', '])\x20return;', 'getFullSlo', 'i16Y/dRORh', 'er.readAsD', 'hZqM5ocIPs', 'WK+naJXFkh', 'ack\x20{\x20back', 'QR58T/DPl5', 'Hk8+KfxV9d', '6gUkPhvay4', 'l)\x20return;', 'T5r8beObW1', '\x20this.valu', 'Qz3nvqRi1w', 'b3958fX+6C', 'z1jNaGCcYo', 'zmy8sK/wPz', 'div\x20style=', 'kdZJItaaCC', 'pageX', 'y:\x20auto;\x0a\x20', 'Cb47f8Z0Hz', 'CNmE0LR/5K', 'y4IrvIqC9V', 'Config\x20fil', 'DpToHy1scr', 'UjhPY6UBtP', 's8QKkWyzJZ', 'muOu9WfAtj', 'entDefault', 'P/PjbyUUrZ', '\x20not\x20found', 'yd7Fycnawc', 'FromGame', '+PYz2vOqUJ', 'lots:', 'u4JwMpyaR3', 'eg,\x20#06120', 'cbNnb3+TYY', 'qCVFciq8DT', 'F5SfqJBVTF', 'U2Qny9SBAU', 'r(--shadow', 'OGHmsWaPmm', 'aQMfzNPkQW', 'ip5UZLv0uf', 'JQhSxJtZjv', 'ffsetY\x20:\x200', 'document.q', 'setLineDas', 'ield\x20selec', 'width:\x20122', 'round:\x20var', '+6sW0ngbwC', 'vLYABPmeJH', 'hiJ+iZviQn', 'x9WHfyoSZC', 'mOuhfQjtCQ', 'utton\x20clas', 'eHjhO1dupU', 'FFHXtfzxvR', '31ANmtrQDZ', 'TwUXZIkFAK', 'qGe7bHPG4S', 'eX7vDs42gQ', '\x20\x20\x20\x20name.c', 'in\x20paramet', '3uxedVwfZw', 'SaepeDG6UJ', 'zgp5TGTC4/', 'lFQzYxOTY2', 'btn:hover\x20', 'glhri', 'KeunM9maMc', 'rCyh6J0LIk', 'r+Y/oVuHMi', '</div>\x0a\x20\x20\x20', 'wu+cd+YUdE', '2fcuYJh', 'then', 'argin-bott', '8HU8+0B2Rg', '5wdTo2A1As', 'w9r/v2yfiT', 'ion>\x0a\x20\x20\x20\x20\x20', '/s8gd8Inv5', 'olumns\x22\x20va', 'HZjGA6mJjf', 'elds', 'VW6qfFeVVn', 'xjrCtjzewN', 'aOzj63cgxP', 'BKllcIxAWq', 'value\x20=\x20\x27\x27', '\x20\x20\x20item.on', 'XPrbrq/z6s', 'XQ63z1tXK4', 'mkdirSync', 'lJPpU', '3fEuv+1I+e', '\x20return;\x0a\x20', 'AaRkJplDDh', 'c14YatLsjE', 'ition\x0a\x20\x20\x20\x20', '{info.padd', '\x20\x20\x20\x20\x20\x20\x20\x20}\x20', 'tc2nF+FhCw', 'nNyMTIu/Yg', 'SyQdyYnBKh', 't6Y35nupLJ', 'Kcy2mOrYQF', 'f6xoa5jyy4', 'a3Zo3tXCaV', 'le=\x22\x0a\x20\x20\x20\x20\x20', '\x20!==\x20\x27\x27\x20&&', '/1nZ/dt17u', 'lConfig\x20&&', '\x20\x20\x20\x20\x20<div\x20', 'LVEcOaLUT3', 'VdMlHlB8zh', 'Error\x20load', 'hhGVSA8nKH', 'mes[0]\x20||\x20', 'GoHgH11IJE', '\x20\x20\x20\x20\x20\x20\x20pad', 'OCzRkTwpig', '\x27,\x20\x27\x27);\x0a\x20\x20', 'dU3jshlz63', 'etween;\x20ma', 'px\x2016px;\x0a\x20', 'sTAa+9P1WB', '\x22slotButto', '5trUYQTAtG', 'Y2OmsFuSqR', '0%;\x0a\x20\x20\x20\x20\x20\x20', 'WVcHrsVcu3', 'open(\x27http', 'undImageFi', 'gTJBUObbRa', 'bhbzRQxdMX', '+B09jdmsmZ', 'Slot.style', 'ewText.tex', 'MXcRhyYuxh', 'field\x20full', '-bg);\x0a\x20\x20\x20\x20', ');\x0a\x0a\x20\x20\x20\x20\x20\x20', 'error', 'VESCSrUq1F', '\x20\x20font-fam', 'aUbnS', 'KM5S8lkiBg', 'split', 'nging\x20slot', 'system', 'dInfo)\x20{\x0a\x20', '3iolhZTU4V', 'KyqdCBcTL0', 'p:\x20wrap;\x0a\x20', '2Z6Z3QCck7', 'rKjta5g92/', 'Peit3I7Adx', 'om:\x208px;\x0a\x20', 'NTteFC7uOQ', 'value))\x22>\x0a', 'sktop)', 'tion\x20X</la', 'QcdKk', 'Ssn445NZTw', 'JsGtsE4LNE', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20', 'IfeqK++kKt', 'rF98wJ4kCw', 'JA9arXXFf9', '\x20\x20\x20border-', 'HVp14xdgYK', 'h77EQT7zSi', 'OkR9Q1OjWd', '\x20\x271\x27;\x0a\x0a\x20\x20\x20', 'EExo2HQUqw', '8H9fvbqkrb', 'fjwQVzY6zw', 'push', '\x20\x20\x20\x20let\x20cu', 'HnPfTVzof1', 'bfRTDqksyu', 'HecCECtwvB', 'iaiTDzZtSl', 'gstQrBgzBQ', 'cUE+GQBVKs', 'ing\x20grid\x20i', 'ZnFdtBPwVi', 'tZ4zmS5MuL', 'toggleDrag', 'MNWPTL+c2f', 'ar-gradien', 'zSYTvHq96f', 'NYXrVzWIig', 'TEISNANYDU', 'G6irferG5g', 'hsLY5wSBRh', 'ZQV8DSD5Cl', 'S6NYK1LRCa', '\x20document.', 'PktIYrQps+', 'lectAllSlo', '3tJGtS20I7', '0uoy9NKrmD', 'oGYwNMHKQl', 'OqX1ZCpzqt', 'Z+SeH3SAbc', 's:\x2020px;\x0a\x20', 'iZ/PnxWA0e', 'P9yP5o2ah9', 'ft34Ohq/ru', 'w1FDln132U', '\x22Center\x20gr', 'updateSlot', 'HsyEB', 'findGridFo', 'B4s4+TCUCI', 'IQWQuYYRFe', 'YICuFCIW/a', 'e=\x22handleG', '/eRGh1kpYT', 'vLkJ0vrBdI', 'nA2sxwSwlx', 'GqECcoIsoV', 'tName)\x20:\x20n', 'sition:\x20op', 'rollbar-tr', '1Y6hH+p9X+', 'const\x20file', 'sition\x20Y</', 'UFHt0pvHzT', 'nst\x20fileIn', 'bBQSIPiMrv', 'baU/BqE6ES', 'P3/mfdI8rw', 'oDRxYyml1L', 'xPj03PJT/u', 'Button', 'dPosition(', '\x20\x20\x20\x20\x20\x20\x20\x20\x20p', 'zI+dWQQmyQ', 'rgin-top:\x20', 'QRhs4JGA2/', 'KRcF+KhZ17', 't7nfdmRGYy', 'YgRlP0ZngO', 'dth\x22>\x0a\x20\x20\x20\x20', 'play:\x20none', 'jUBQG', 'PQJLC', 'ner\x20&&\x20win', '\x20\x20\x20\x20\x20\x20\x20\x20ga', '36BwmQvu', '\x2020px;\x0a\x20\x20\x20', 'm0CSrO5hpo', 'JkozWSjUZM', 'full-width', 'ebkit-scro', 'space:\x20now', '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a', 'nI6h7syjeT', '\x20text-deco', '92GmFMKMAr', 'VXpLyqC2hC', 'Padding', 'Input)\x20pos', 'createNewS', '\x27number\x27)\x20', 'DGZEoOQKCk', 'KMqhDS2pQm', 'p:\x2010px;\x0a\x20', 'OQgYWWRu4f', 'k+1/PHtYfy', 'Jtl+SukTD6', 'PHI6rNwpoS', 'y9cRj12gt5', 'rt(\x27Please', 'ttom,\x20blac', 'ay\x20=\x20\x27bloc', 'mvpFBCdWgQ', '.updateSlo', 'BNtTZ5wUGd', 'font', 'MlG2mC0S/y', 'rder-color', 'r(--surfac', 'r;\x0a\x20\x20\x20\x20\x20\x20\x20', 'WT44gIeTnR', 'HYpcd3qkse', 'ExWyx+46GT', '\x20\x20\x20\x20\x20\x20just', 'l5qN7XCl2P', 'AZeGMtWbJk', '3V6ngvEWjK', '\x20\x20\x20\x20\x20\x20\x20\x20tr', 'properties', '+9LY80SlId', 'qRgYwg8mEQ', '2box+T3bUK', 'R3g1whK+bC', 'j68djiYxPH', 'sGG/5c6JR3', 'Jq43turDDr', 'VlUoKYQSkw', 'qmNx2Saa7y', 'lAcgs3p0nl', '/HKgDKYQ3s', 'AYX0h28lhb', '\x20\x20\x20\x20\x20\x20\x20\x20\x20n', 'UqGLDO0iyM', 'S0kDKEB432', '\x20\x20color:\x20#', '8aFKWJf889', '6ZjLgz/TDP', ',\x20axis,\x20nu', '[Visual\x20Ed', 'tant;\x0a\x20\x20\x20\x20', '\x20not\x20avail', 'jFzh0eIsv4', 'about:blan', 'ar-btn\x22\x20on', '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a', 'click();\x0a\x20', 'x5dZh3IUDY', 'pogCZohf3Q', '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'v\x20class=\x22f', 'us);\x0a\x20\x20\x20\x20\x20', 'erHTML\x20=\x20\x27', '.type\x20===\x20', '0+7Vy7ojR0', 'H4YfX44N63', 'avior\x20===\x20', 'Yl830Xd/fd', '1iZKpqe3ds', 'xPnfxHoKvH', 'IXof9X3KBR', 'wIUj9WpPJH', '4ZKnyKKKF6', 'mMXrLS1ko9', 'cing:\x20-0.3', 'f772/cC8tg', 'MeU18t77UP', '0AjUfg3DNB', ':\x2013px;\x0a\x20\x20', '\x20\x20\x20positio', 'ElementByI', 'RFrvDIiuQV', 'FVZOR8FMdE', 'VQPRY', 'CU0HtVIIBI', '7Vin7/aLPr', 'yXHJzcnveG', 'has', 'fWJeKyjave', '/n6sCfwHnD', 'YY4XqWGPA6', 'IXRaUSbRvW', 'JajLa+vnwr', 'afY5oDGtIa', 'hWoPXoXrQd', '\x20src=\x22data', 'rRzAuW5h+r', 'mz9pNZVJuT', ')\x20=>\x20{\x0a\x20\x20\x20', 'FIo3DNXo1f', 'tion()\x20{\x0a\x20', 'xJR0tuhqh/', 'lue)\x22>\x0a\x20\x20\x20', 'eSlotPrope', 'dispatchEv', 'NrPZHMbWSX', 'tPreview\x22\x20', 'wISUaT0VXp', 'ldJ9mKsXWH', '/MeFusko+e', 'ot\x20{\x0a\x20\x20\x20\x20\x20', '061209\x2025%', 'qmrYrjYCF6', '2FpbIvH2jd', 'W9lkZOy9R0', 'gntLVTqLfv', 'pv5m7qR0U1', 'n3vcj2prFB', 'hNvk2HzVNb', 'fq3IR4QWdc', '\x20\x20\x20\x20\x20\x20\x20fon', 'ons()\x22\x20tit', 'mw6WTrH6sc', '/div>\x0a\x20\x20\x20\x20', 'ib/ydn6MP+', 'Ejxd0gdQwY', 'v5ep2Tt2fl', '-accent-so', 'fk+k+fvnk4', 'P20kfNCa7z', 'axxQ2gUQBT', '4AxiUioZcB', '\x20\x20\x20transit', '\x20\x20\x20\x20\x20margi', '25qV9s2/su', '1dVYWuzb7Z', 'from', 'FSEKC655f8', '58QeMYkSXi', '\x20\x20\x20\x20\x20\x20\x20\x20po', 'i3aYUCTvAV', '+b/FZhwwUA', 'XFngUy8E3s', 'J2d5htWCiN', 'L/zxBdD6YV', '\x20\x20\x20\x20\x20\x20\x20bac', 'pR4ruKPx0d', 'En85jINQIs', 'TOiM7ed5d0', '9moySiEFRE', '2e0GqcZW43', '\x27<div\x20clas', '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20', 'pCkNvRCmMl', '\x208px;\x0a\x20\x20\x20\x20', 'RVUEyVcrAP', 'I7AkI00Vke', 'NFYbzdJyV4', 'ABQtR0nF9o', '2HwW0DdwRo', 'AEKdSqkXBA', '\x27}>Item\x20Sl', 'ZJJPB5Yg1i', 'fillStyle', 'document', 'JtnZSMwETA', 'sList', 'id=\x22slotsL', '5lXACvZ2aY', 'Yj1ve1Phz2', 'vdVaBTsLJg', 'hm4b2k3os3', 'DhpIwRxfvR', '6wZQeA2ou0', 'mKECRVJAgB', 'cent);\x0a\x20\x20\x20', 'l3FIxH5BJG', '\x20#494949;\x0a', '0QXoYrQA3Y', 'height', 'WJ9TwLzCii', 'items:\x20cen', 'mkW+DVaImY', 'UXFheanoXb', 'n26g1lIKUB', 'path', 'o/bzVeL0Vr', 'vBcp5BCkpa', 'R32o/PNUx+', '215,\x200,\x200.', 'dJl0ijpEmy', '4gS4bB0Qzm', '.opener.de', 'BwB3qwHVBF', 'liW9e8EVTl', '\x206px;\x20}\x0a\x20\x20', 'WwK5x1hJ+I', '.io/hotbar', 'ems:\x20cente', '<h3\x20style=', 'avior\x22\x20\x0a\x20\x20', '7/pn8OxvrK', 'QEk6zuiI1f', 'k\x200%,\x20tran', 'A925jDCwkn', 'h8+xu/Hv5R', 'lVpAydAMj3', 'itor]\x20Scen', 'fig.Specia', '/7f8Q2SdP0', 'JIHFQGKPW5', 'Fbwu6Gm4Yv', 'q6gh0tt1VL', '1ggooFBY8d', '\x20\x20\x20\x20\x20\x20\x20\x20<!', 'UceS6ONnTe', 'ion:\x20absol', '/NHzEG+iZt', '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20', 'lSlots', 'AtdMLjc353', 'yId(\x27prope', 'tNFOq', 'A+cbkzCXUD', '</a></p>\x0a\x20', 'xNrZI', 'W1QCuQ6fSt', '/d4F1GaR7i', 'value\x20=\x20im', '\x20\x20\x20\x20\x20\x20\x20bgI', '4bP+/lcOT9', '\x20\x20\x20functio', '\x20\x20\x20\x20.conta', 'DLRoMGkdKG', 'DkCrHZ/jYF', 'Zv3ukyHAMr', 'ztyLi', 'ById', 'o\x20edit.</d', '\x20\x20\x20\x20\x20\x20\x20\x20\x20f', 'zbngzkyJCR', 'zpx9m3KLU+', '3qEwcBPGm9', 'zYIbbjRNM3', 'qdxcQMMjhE', 'veRvNU/f3G', 'uWWZuiUPSI', 'iVyNu', 'xbDMsNtw3E', 'x;\x0a\x20\x20\x20\x20\x20\x20\x20', 'CnetZx80H6', 'positionBu', 'm154eWOJQw', '\x20\x20\x20\x20\x20\x20\x20\x20it', 'itle>\x0a\x20\x20\x20\x20', 'loRWjlae3Q', 'opener.hig', 'EtCMTnzZgK', 'LEiKQ2HNsA', '8LYsMRcdFF', 'JBM7BXnJUq', '\x20\x20\x20\x20grids.', '7Nb9qKaZ3T', 'ZkfnPYhGRZ', 'Sep2lasqZN', 'ner.create', 'ZUoX3bZqDB', 'kjAAbJiL/w', '\x20+\x20offsetY', '+X/BujhqzQ', 'E19W/X+QMj', 'XKqfcNNiW+', 'fZyEu', 'CIqiwClfjM', 'pener\x20&&\x20w', '1;\x22>\x0a\x20\x20\x20\x20\x20', 'sKm3//l0WC', 'IME9C5rp7U', 'wQ/8o1tQNb', '\x20\x20if\x20(wind', 'kground\x20Im', 'Pncru9jY7P', 'iAEh91GhEE', 'CybnmKi/Ow', 'rljxs97KmQ', 'Y\x20||\x200}\x22\x20\x0a', 'get', 'the\x20text\x20s', 'XLo//WBJW/', 'w/JluqWss7', 'A8aUAsBdrk', 'font-size:', '2398413zYRyVw', 'F1pJXgGrFT', 'G1P6sRwTCP', 'uYn37rvb68', 'oadGridSlo', 'LEqMxkRJnT', '\x20\x20name.cla', 'sdZlQEo3g8', 'AikBm', 'LbPduPIEYo', 'ri7jCFnbt3', '_gridBackg', 'mDQRJk8koV', 'saveHotbar', 'focus', 'FBBp6ZK0tF', 'visible', 'background', 'QoppM', 'w-x:\x20hidde', 'JU7VXDVLNU', '+pB40Apjhz', '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20', 'gRf21TfxE1', '6JoKSOFUO3', '\x20\x20const\x20pa', 'Auq5VcsoxY', 'nd\x20Image</', '0q7Wlveljj', ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'UI\x20not\x20ava', 'layout', 'Y+F7C0UOon', '5vb8a9WvFK', 'yplFtKpA/H', '\x20\x20\x20\x20if\x20(wi', '(--radius-', '5sOcJcP8iC', '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20', 't(135deg,\x20', 'q3m5GANncQ', 'itor]\x20Slot', '9o7cuJqcJ9', 'li5gzfOIxT', 'bv0LGENej6', 'EA8CAC6zTn', 'cTIarOWgCn', 'WMLskji5tL', 'jUa3/P58Zg', 'tUMtD', 'Jvv4Qhf7Of', 'adControll', 'Xvn9Vat2hY', '3kc5zWlsQC', '280px;\x0a\x20\x20\x20', 'e\x27\x20:\x20\x27\x27);\x0a', 'result.new', '27CFAbZwLo', 'Error\x20find', 'bottom:\x208p', 'VJz+0VsLnt', 'pBBsozpGwV', 'pPirWQxMP9', '1YxXkh1mbe', '\x20null)\x20{\x0a\x20', 'kiplxYscrI', 'lKcOK', '0+A90dCNo1', 'z2+0OjOVLo', 'mainModule', '_grid', 'bR+Y/rvqs0', '2whLCBsJ3Q', '[slotName,', '3QHeN3T0AM', '\x20\x20\x20\x20\x20\x20\x20\x20fu', 'sWz/M/qMbX', 'kDdrffF6AX', 'KnlAQyUsyD', ',\x20{\x20passiv', 'vaxUOF1bhR', 'Sop+rjkDaf', 'iHjs5gKwCX', '\x20\x20border-c', '7LFfv33x4l', 'pxZ3+ZWTa0', 'LrP8wpnnbE', 'nP53QSAIdT', 'Id(\x27gridCo', 'utSENB3fpC', '2SdWrq/p+v', 'ional</lab', '0fqL1nHZT1', 'qzFgccg0AG', 'BDK+rGgkY7', 'xWXXA3AmAL', '\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20', '\x20\x20\x20\x20\x20\x20\x20ele', 'orE/y+XJd4', 'DdeWIjIjCN', ':\x20\x27smooth\x27', '<div\x20class', '\x20\x20const\x20fu', '0t6L3/l819', 'ositions()', '0p6MwhOja7', 'o;\x22>\x0a\x20\x20\x20\x20\x20', 'bar-btn\x22\x20o', 'CeFkrrgPab', 'JTg0DC9k0K', 'ogo\x22\x20style', '\x27}>Skill\x20S', 'me3CMDTLJc', 'X9CrM2xAKk', 'g.TextOffs', '30HHPA+Ntc', '8+M/25/MNw', 'ition(axis', '\x20\x20\x20\x20\x20\x20\x20\x20\x20.', 'UKqByrjV/d', 'Oecg7oAAAA', 'Zn3Nq+2C7Z', '\x20\x20\x20\x20\x20oncha', 'text-trans', 'CjWlENt9l2', 'BmC8hBRUFN', 'gMbNP', 'ogiiBLov65', 'WxSUX0sfhE', 'XGJKRSAUqd', 'lass=\x22tool', '2PXm/ZtTjl', 'fSZx9/3/Bc', 'k7R7wgHHKa', ')\x22\x20\x0a\x20\x20\x20\x20\x20\x20', 'Input\x22\x20acc', 'RglEh2HdOF', 'lx92H9w9VH', 'selectSlot', '6HpYdhnmvV', ':\x20inline-b', 'mHj0S6/Enc', '\x20600;\x0a\x20\x20\x20\x20', '\x20\x20\x20\x20\x20if\x20(s', '8rFNGx99lt', 'color:\x20var', 'AAiyyBQIt1', 'YGfIgkCAJw', '2DWg4VxLRy', 'WBxClLjlmC', '\x20\x20\x20margin-', 'PfdslEUscm', 'NnG68owPZX', 'button', 'PLm02XsMSe', 'resetAllPo', '6NJpwd6P+q', 'KWJrB+IP63', 'Sid265aN/+', 'R/8tWnRQEC', 'LSxeC2Qmm8', 'AWFDKz7e5f', '_editorGlo', 'RVWzIAn4xm', 'CcA78M5yHQ', 'eMHhA6eAkW', '6Non8qvwno', 'n38I2UwYM/', 'und\x20image\x22', 'zCup5aH9Y5', 'TfM2hSQFX7', 'bxy+LPJ2gl', 'les:\x20true\x20', 'ss=\x22field-', 'ClaMrPRfuW', '\x20\x20\x20\x20delete', 'ById(\x27posY', 'l/zgwsGcTD', 'NagDLTUFVE', '\x20\x20\x20\x20\x20\x20if\x20(', 'kFUfTl6Z18', 'TFs9kz4yV8', '2N/saMlc1a', '9N0wgujDuh', 'd-group\x22>\x0a', 'on\x20Slot\x20(K', 'ithoutExt)', '\x20slot\x20+\x20of', 'pbXP5WY8OZ', 'kCTGo', 'mqFbONHCIK', 'display', 'F0GYyN4D3K', 'daOyC1CwBS', 'stringify', 'qj+RLhIbsq', '\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20', 'qihvS', 'f/NktvX+qQ', '8V+31xWAqY', 'b/kc2ARLDM', '8zE657r9/Y', 'e=\x22updateS', 'pSuex5EYdK', 'p+Sr4F5+db', 'YxV66q2jl7', '7WQ0vU6ybN', 'pg2+uzeELq', 'FxSp+KSPjm', 'LaQikXWpqk', 'tCreateSlo', 'de5z44kz0z', 'Myv0zX6R/D', 'l8SGpiFsl+', '2ThkGR+iQO', 'F8W/IIzVU7', '6IY79VHIAe', '-index:\x201;', '-shadow);\x0a', 'ner(\x27DOMCo', 'qYvlTdAFju', 'leInput\x27);', 'use\x20-->\x0a\x20\x20', 'g0jMQXvjJo', '\x20updateSlo', '+YJ+EcXxEl', 'border:\x201p', 'nnot\x20be\x20un', '-2);\x0a\x20\x20\x20\x20\x20', 'onchange=\x22', 'olor:\x20var(', 'ss=\x22field\x20', '2HmxCYsjj4', 'loadSystem', 'ageInput\x20=', 'e1ec/2BGk1', 'uz/wHEmKjJ', '7aLIIIsikS', '1pnRFZO67n', '\x20\x20\x20\x20\x20\x20`;\x0a\x20', 'wRRbsJba3O', ':\x20grid;\x0a\x20\x20', '\x20\x20\x20\x20\x20\x20\x20};\x0a', '40px;\x0a\x20\x20\x20\x20', '1KjVWNz4fr', '7cahe2B5zK', '10px;\x0a\x20\x20\x20\x20', 'y/AigU7wQl', 'Dqxds', 'wbqxf', 'shadow:\x20va', 'item\x27).for', '/////////w', 'vF+abK7wRz', 'eKAuq+YPkb', 'Z9xw2k1L/k', 'fPqWf5t/lx', '\x20<input\x20ty', 'yle.width\x20', 'KJ64sFCwr+', 'C/CI9rhfA4', 'zio9mPRh5L', '7ZmdLHrsen', 'qjXBrG/Dp0', '55,152,0,0', '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20', 'yUeJ8TNKHB', 'QaABu4aXoa', 'und:\x20var(-', 'PlZlzuiyLf', '02RsM74529', '\x20\x20\x20\x20\x20\x20\x20.fi', '1UpwCj4QC2', 'oG1o4RAbPz', '9W+/QJjUQu', 'call', 'VtCu3+n6y7', 'OkcZq3dTY3', 'pVSdZfWrOC', 'g/VkeFmU6t', 'YjA9qjL3XI', 'Ed3oLGcWHR', 'r\x20&&\x20windo', 'n6xuGQ+NqG', 'rder-radiu', 'BAICBgIGCg', 'cT0LZTgxRo', '(--text-mu', 'Text.style', 'J2FoZaE1s9', 'Panel', '+tgB10w6gw', 'F9uDfvGYcQ', 'gc6uburGfv', '(window.op', 'eel\x27,\x20func', 'o7uHicQ6BM', 'q+xvmC7qyG', 'B+Mgjod0cK', 'skRWG', 'WZH/VeHx0g', '\x20function\x20', 'C4BSKWAnR4', 'loadGridSl', 'zYuW5XeHp4', 'value)\x22>\x0a\x20', '5qWqRJPI1y', 'c8Q8OuMRj+', 'b58w9k3IFe', '328BFb4lXQ', '/ZjILrgBFg', 'rFaAA4PkMm', 'Grid\x20or\x20sl', 'XW1DjH/fDN', 'UNlhaEzHML', 'emoveSlotB', '8tKYESTBdR', '\x20\x20\x20\x20window', '\x22text\x22\x20id=', 'anD8r8uVW5', 'PFj/oZg2/t', '5/U/l8r6P6', 'wdR1JMMSI+', 'on\x20arrange', 'ent.classL', 'ay:\x20flex;\x0a', 'n:\x20relativ', '.className', 'id(index)\x20', '6mdO2dvJrx', '9Qg1iIqgNb', 'rSlot', 'item);\x0a\x20\x20\x20', 'sdxjPyX6vj', '8/nuF9NfdE', 'm3USrFCa6l', 'pe=\x22text\x22\x20', 'join', '\x20\x27\x27];\x0a\x20\x20\x20\x20', 'd\x20first!\x27)', 'kHC6OaWX7f', 'Error\x20gett', 'JYsCTSPDQi', 'OgHsTY+eiP', 'tM0buqBvwd', 'kgroundIma', '\x22margin:\x200', '0Ac3/s1Emr', 'ptor', 'n:\x20center;', '+wDHoAKWtE', '\x20\x20\x20preview', 'ot\x20Only</o', 'Z/VYUm6M92', '+MIVJbKYDH', '\x27previewSl', 'K7JqXBTAEn', 'hjdAIDjIqx', '_isPlaceho', 'xkJuKLhCCR', 'Z9gZBtHGTf', 'Mp9Ss++eS6', 'Each(item\x20', 'irst</div>', 'addChild', 'gufKKgiTGw', 'UOJQZZGqkg', 'UgHrq', 'qUkqr4zsNQ', 't\x20=\x20\x2750%\x27;', '6NbLh41foF', 'or:\x20var(--', '(\x27buttonKb', 'e\x20=\x20file.n', 'bgImageInp', 'ld(deleteB', '\x20\x20\x20\x20\x20\x20\x20\x20\x20t', 'buttonKb', '\x200.15s;\x0a\x20\x20', 'YI8Dn8UUbm', 'W+JcYoNRmH', 'bxOA7zo2yI', 'tive\x27\x20:\x20\x27\x27', 'forEach', 'uNzWrvastg', 'bESRFUV0Ua', '3HRhFZX5ve', 'jabpq284VB', '4wUsMsHkJs', '2iBXroNUGW', 'KJq61tXl6e', 'v-mz-plugi', '\x20\x20\x20\x20\x20font-', 'bWNkQQZs4B', 'sYLA5Rwsnd', 'jyTcu', 'grid-colum', 'NyacSGqpNZ', 'f1yJd3MheW', 'thoutExt);', 'lder', 'pjBqpmCqZi', 'const\x20name', '\x20item.id\x20=', '\x27,\x20this.va', '64TC4U1JL3', '\x20\x20\x20\x20\x20\x20});\x0a', '[0];\x0a\x20\x20\x20\x20\x20', 'ntent\x22>\x0a\x20\x20', 'le-list\x22><', 'El/mwVtyhy', 'dIMngVSWLP', 'RYGROHy05n', 'Mode', '\x20\x20\x20const\x20r', '\x20\x20\x20\x20\x20\x20\x20pos', 'wText.styl', 'UIPosition', 'mao5XgJnw/', 'n-bottom:\x20', 'radius:\x20va', 'PQFaE', 'GWKx4Yfzoc', 't14Gf6b3SM', 'ux78wLitPH', 'YC6dPPwUzi', 'div\x20class=', '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20', 'lue)\x20<\x20par', '1QurcsGfEQ', 'gyIp73Pv28', 'UOEbzZYzFO', 'AgaMrSAJpB', 'OYJJA9auwB', 'tBackgroun', 'img', 'DQAkJE4mxU', 'XBQeqctVii', 'none', 'aset.curre', '44TZkDfq', 'UgVVUIvDhr', 'U9/KYnRm9y', 'flxrLTiyVr', '\x20\x20if\x20(prop', 'b\x27\x20&&\x20resu', '\x20===\x20null)', '\x20\x20\x20\x20\x20windo', 'oN0QUhAEe1', 'nfig.Backg', 'rD86s2qhUy', 'r12igohKWA', '\x20grid\x27;\x0a\x20\x20', 'thMuHaH/8w', '\x20positions', 'L/4XjAwMgG', 'aZRyvXf3mk', 'qzzr1q0Lf9', 'Iag/wY6/ew', '/p3C89flmF', 'ImpZ0utYcM', 'DT8nUxfF0W', 'E2EVa8vdtS', 'fz/BiG6kqN', 'iUWB56Odqg', 'Name;\x20//\x20U', '0Tpr//+Drm', 'Huy9ekR49+', 'Grid\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20}', 'ng\x20config:', 'hiInVDrarK', 'OODuA7Pzfl', 'OcyAaDTSx3', 'r\x20=\x20new\x20Fi', '\x20\x20\x20current', 'miDVq', 'er.updateG', '\x20||\x200;\x0a\x20\x20\x20', '}\x22\x20\x0a\x20\x20\x20\x20\x20\x20', '2250520JunMxn', '\x20\x20\x20\x20\x20\x20\x20\x20pr', 'mValue);\x0a\x20', 'R/ifnqzwtX', '(currentGr', 'ots', 's</h3>\x0a\x20\x20\x20', 'Nb/B6hP75H', 'WTAwSpJNe2', 'ement(\x27but', '9GU0IIOfYB', 'fileInput\x20', 'ected\x27\x20:\x20\x27', 'linear-gra', '.15);\x0a\x20\x20\x20\x20', '2yJJdGzNDw', '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'UmHEkYuAEt', 'd\x22\x20style=\x22', '.SpecialBe', 'lF7cmW6Y2s', 'rtiesPanel', ':\x20var(--te', 'oXT+yS0S4M', 'eEx51vQe9w', '.updateGri', '6i74IvJXJx', 'l\x20reload.\x27', 'le=\x22Create', 'ementById(', 'VIXZO5l9P3', 'PakTn', 'wxaFQ5lro8', 'orLists', 'Name', 'UEazpspAd9', '\x22field\x22>\x0a\x20', '.deltaY\x20<\x20', 'XPKbfGNtY9', 'tNIwC', 'vgqWwu7AYC', '\x20\x20\x20\x20\x20color', '0NHV8deR6F', 'sBFb45N+t/', '3z5TDdapSq', 'Background', '\x20✕\x0a\x20\x20\x20\x20\x20\x20\x20', '7AOuPMicq4', '+Zm5O8M+f5', 'GEnpiXz2H1', 'gridIndex)', 'Jqeei6OM+e', '\x20\x20\x20\x20\x20\x20Rese', 'zBeyY0XCPJ', 'textAlign', '+h5qtVr1yw', 'd\x20to\x20copy\x20', '_buttonIco', '>None</opt', 'lot\x22\x20style', '\x20none;\x22\x20/>', 'yWL78TWV42', 'DDLDDoSp09', 'pendChild(', 'GIdwe8TGbE', 'asY', 'MxcMsMmz51', 'one\x22\x20${(!f', 'Xasev7b6v6', 'eDragMode', '\x20var(--sha', 'rentSlot\x20=', 'ujTLsmj1rP', 'ots)\x20{\x0a\x20\x20\x20', 'PGEsr', 'unction(gr', 'l6gQCOHHMQ', '9J4nwMmxNk', 'aZ2oXQFCIx', 'iSShTBJSMP', 'pener.dese', 'b/8tFxOmWL', 'XJ3gvE/gjS', 'Yfilhh7O5/', 'constructo', 'updateEdit', 'Jk2Q02xsQe', 'xZZwx', '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20', 'ground', 'kground-co', '7Kis+xefDO', 'gxIGBFCBNu', '7+YV3XNSe9', '2qK8Ky53X7', 'e\x20not\x20foun', 'fileInput.', 'px;\x0a\x20\x20\x20\x20\x20\x20', 'VFpIriUKBW', '+5s991HtoN', 'ZQxtVvnWKb', 'KVKF1CFNyP', '\x20input.val', '3Rhu2vVrwR', 'aint:\x20#555', 'OY55vyKA+q', '.credit\x20a\x20', 'vo/C6EM7mH', 'Hneix7FY/5', 'F/kCeYQ8SV', 'dow.opener', 'YrXkZeuQib', '\x20\x20</div>\x0a\x20', 'ndow.opene', 'ius:\x2050%;\x0a', '9DRR0Og0TT', '+\x20index);\x0a', '2ebEN5m4KH', 'GmzfPcvGr8', 'mIV4JBt4Sg', 'lkDDpAV2Ib', 'sition:\x20bo', 'tYX7oKMsm9', 'ZfpwTogbyc', 'GlY840haEw', 'Fgry8I8JDC', '/YwwKO7DcS', 'lEQVR4nN29', 'aeW/duC7c+', 'ppendChild', '.top\x20=\x20tex', 'fbIIOYo0i1', 'r</label>\x0a', 'wGridInfo(', '37XkTeZT9D', 'one;\x20\x0a\x20\x20\x20\x20', 'GnAvPAXUk+', 'Unh/W/ihh5', '837TZnV4aS', ':\x20block;\x0a\x20', 'dST4owwTb5', '\x20=\x20documen', 'Y7GhL2w/ko', 'JDp4HT6QcO', 'uto;\x0a\x20\x20\x20\x20\x20', 'FF+LnRl7RR', '0y97b+QRPi', 'columns', '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20', '-surface);', '97Aegc9+Lh', 'hqsxIo4MXF', '74pVm445ff', '9dBgrBe9cT', '8mfWOiwree', 'active\x27);\x0a', '+kfcq70fYa', 'none;\x20bord', 'iv>\x0a\x20\x20\x20\x20\x20\x20', 'g4j28J2n8i', 'O1w3D93Q6s', '7wqAc7ciZq', 'V3oievpPBZ', 'BORw0KGgoA', 'id\x20to\x20slot', 'kpBnqc4N3d', 'aaUbqg8foe', 'display_sh', 'yQ0b9YSRPz', 'CzefkYjCYz', 'G9hBfE3sWe', 'SAKSjKQiYk', 'ackgroundI', 'cQATrsn/I7', 'I4YzOOIByz', 'UhIZrEQr5m', '28ywaeCMvI', '\x20\x20window.o', 'ssPSQqEQns', 'geInput.va', '3yi0eHGpbx', 'adf117vUl9', 'N1BH1Sudzr', '0sXlHCPkxl', 'iIFwezeSWt', 'NsQOUCE7Bf', 'ZwvrsXBTlx', '1IzFEdhyBL', 'ay_shield\x22', ',\x20transpar', '\x20\x20\x20\x20\x20\x20\x20con', 'xgUerOnt9f', 'wDmNMp5i5a', 'e9DDTqRqDI', 'rktVCQJ/fc', 'cument.get', 'AQ0g2JPRzX', '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20', 'unt}\x20slots', 'qoE3WnmJqk', 'caSxh9yGmP', '0\x202px\x2012px', 'q65MJdU7dd', 'CYW3n9nziE', 'mpwYAACIKU', '\x20\x20display:', 'LtHlEz0OqR', 'TRzaZgBi4a', '\x20fullConfi', 'xaJH114PZx', 'al\x20Behavio', 'tById(\x27pre', 'h3\x20style=\x22', 'VyWrCrhE6n', 'aK1HCF0mj8', '/02UwNb/Dt', 'tcepplOvXF', 'n-header\x22\x20', 'am6x6h1nBe', 'on\x22\x20onclic', 'rM4WqK+7/Q', 'kEB2oLNt+g', 'eader\x20=\x20ne', 'abel>Speci', 'Panel\x20=\x20do', 'tion\x20insta', '\x20\x20\x20left:\x205', 'axelsD9s4f', 'Pgo7bt15mm', 'llConfig\x20?', 'jo2zAvFMbH', 'qDikl4iiSg', 'hrDPcxSiGm', '45lr59D9+1', 'zNjH8i4tQ8', '4fs5yyjayN', 'BTGvxKrDKY', 'jGnwWdZDCi', 'EbgkPgIOdR', 'twND6a0T5J', 'iv\x20class=\x22', '-top:\x2015px', 'er.arrange', 'Ima8v85UMe', 'RMKB1cedH3', 'jSkb/alq0m', 'owkmrgEo/v', '4HQM1kIm+c', '47YRYPSPka', 'O5vj1U+I5Y', '\x20\x20\x20\x20--text', 'WRqCLOQ6pz', 'LEWWoLrfNR', 'rvcJ6X4TfT', 'r\x20lists:', 'MfDtsIrhyf', 'qKIsbwWWW0', 'translate(', '\x20\x20\x20return;', 'NVBrhBdBqX', '_config', 'OD0Ds0zoPd', 'eight:\x2050v', 'vr1jRrL+tc', '\x20\x20\x20\x20\x20\x20\x20e.s', 't-scrollba', 'KKcofynEql', 'IhBnEY4bkB', 'id\x20===\x20nul', 'm9Se59/p/z', 'WN59bDvdKS', '+\x20\x27px\x27;\x0a\x20\x20', 'hoQY1r3Ujx', 'ent(new\x20Ev', 'es[0])\x20ret', 'alwaysRun', 'VU1DqdJeiR', 'letter-spa', 'Q1BzUkdCIE', 'fVtPNP7fl7', 'ntent:\x20spa', 'p7sXXe1rPl', 'AYBJ4kw2EC', 'f+Ez5t878D', 'true', 'nel.style.', 'on(slotNam', 'b+q0b918u/', 'ton\x20class=', 'Wrsxt', 'tinScfkTjo', 'message', 'eJvYC0alg6', 'click\x20=\x20()', ',\x20\x27_\x27));\x0a\x20', 'soZTOvENJn', 'Image', '\x20cursor:\x20p', '\x20\x20.scrolla', 'rv7a0onD+K', 'on()\x22\x20\x0a\x20\x20\x20', 'xKoWlE2WRr', 'onst\x20curre', 'gS1ohL3kqH', 'cyGzvaysHT', '\x20\x20\x20}\x20else\x20', 'njB1fZinEU', 'grids', 'IACAHNZlIU', 'tion\x20updat', 'g6SLW/vXku', 'x\x20solid\x20va', 'open', 'houtExt;\x0a\x20', 'sED75MXVm9', 'smM549scyD', 'ion:\x20opaci', '\x20position\x0a', 'IjvTM', 'fBlwOjQ07L', 'iArg1DK8nu', 'SjLyy9OGMg', '3BpE4ejKvX', 'vLoI08f/5H', 'ow.selectS', 'YWA6ZiDoxT', 'dateGridGa', 'MPvLoBo3ba', 'atm00DAwuS', 'LqkSz', 'Cd6rd9Lm9n', 'Config\x20&&\x20', 'rbHh5SHc18', '\x20\x20\x20\x20\x20\x20\x20if\x20', 'rqijPnDUOa', 'le>Hotbar\x20', 'oUNStREam+', '_gridHighl', 'FJHKoqIo2c', 'JVSNPvCkwy', 'und(props.', 'A3m8flzBFM', '5IphWzz/45', 'RXmJ5+1TB2', 'UBccrg47Ba', 'RoeIlPJLlF', 'qIxQG0FR+q', 'ewBg\x27);\x0a\x20\x20', 'rHjtx6/SJa', 'PTat/rbOD9', 'ightSprite', 'Moe03xlG70', '(index);\x0a\x20', '2a2LGTTzp1', 'gn:\x20center', 'Mrtxyomrwi', 'zHwoXhhwo/', 'Xu0JppjHRH', 'nerHTML\x20=\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20a', 'VVAaoYAlWM', 'bD4XqSynMb', ':\x2012px;\x22>\x0a', '0QK8uWj1hq', 'false', 'p1XolVdfJL', 'HvskhPc8Hx', 'ZhFwBPqc3D', 'sgkkj+BRLA', 'CpRUDKpiDo', '\x20\x20\x20\x20\x20borde', '\x20\x20\x20\x20\x20\x20<but', 'Q2lVFhMyoq', 'ground:\x20tr', '(input.val', 'wdXvwWA9Kd', 'KPTJXVUoal', 'g+cK1FIWWY', 'ApW6Zu8DEf', 'FqDK1UzOJp', 'LK9TBSz/8E', '0bQzRRue9M', 'H3fzuEMz7C', 'r1dp9vGXW8', 'Jp4fW1bmtr', '9MAcKHmLB6', '\x20=\x20e.targe', 'pX4QmA9drv', 'PWWX+piFj6', 'UgIr04iiqE', 'RmbvmEWhlU', '\x20\x20\x20\x20\x20\x20\x20\x20\x20h', 'ist\x22\x20class', 'wnWdRw2nMD', 'anchor', '$uiPositio', 'nxMGbRNk6f', '\x20\x20\x20\x20\x20\x20<div', 'uerySelect', 'imageNameW', '+PvjR26h9u', 'IiUq6wiyOC', '6G0kGwqMEF', 'Y7kb2RKslB', '6wvh66MJAi', '\x20\x20\x20\x20\x20\x20\x20\x20-w', ':\x200;\x20right', 'ght:\x20100px', 'QAHx7zx9JV', 'justify-co', '\x20\x20\x20\x20cursor', 'slotName}\x22', ':\x20rgba(0,\x20', 'Xv6s4sgn6a', '=\x20input.mi', 'meqsDa6ly1', '-btn\x20{\x0a\x20\x20\x20', 'vcur6jtAZK', '\x27);\x0a\x20\x20\x20\x20\x20\x20', '2QMVNuxTEo', 'eurCeu7Gfl', '-width\x22>\x0a\x20', '8Yqy0B8Sqq', 's=\x22main-co', '\x20\x20\x20updateG', 'O6Y+vOOMwG', 'bitmap', 'JcefnEg9Md', 'nwS+ilqvk2', 'n7xvDAt2KQ', '\x20\x20\x20\x20\x20\x20\x20\x20if', 'wFULqCkASI', 'wZXBvhuiiv', 'wXBvDt4yge', 'oWn2yd2WIG', 'HrqDNr2ruU', '=\x22flex:\x201;', '89Kdz4JwHr', 'cT5xpXGD8b', 'KzEBeGUQBG', 'ix.itch.io', '\x22field-gro', 'Rt2wxjEXtF', 'lot.name);', 'alue\x20=\x20\x27\x27;', 'W4tQ1OfOCV', 'C+AVT4plj7', 'DoXKH', 'sGOfTp/q+o', 'cGyhJCt04m', 'xkE/uMw1N2', 'JCoKGAZXZO', 'ete-slot-b', 'SFlHpEFlRi', 'ment.class', '\x20\x20\x20\x20return', '\x20\x20\x20\x20\x20\x20\x20\x20\x20w', 'ARrsJtGIQR', 'KA5uuzOkV+', 'hsQPmfM2OR', 'fu39XZ052o', '\x20class=\x22to', '\x20\x20\x20<input\x20', 'SOLEVWI8VI', 'iHjZac74O9', 'Z9QPBPg+zT', 'M7ob/658OD', '4KwG/I5WFx', 'k5nTKmTCLr', '\x20\x20\x20\x20displa', 'if\x20(fullCo', '.container', 'ist.innerH', 'GamepadCon', '7rfewHbzVY', 'rentValue\x20', '\x200;\x0a\x20\x20\x20\x20\x20\x20', '7su6+U1fNo', 'eUGsEAGr+G', 'ement(\x27div', 'N6g2q55Vfa', 'uxfMR63k8A', 'rp0aOnfKef', 'tem.append', 'A1FVnYeAB6', 'BdDGP7fJP3', 'Rrp3lYZ0rn', '%;\x0a\x20\x20\x20\x20\x20\x20\x20', 'LX5vpzY+25', 't\x20.list-it', '\x20backgroun', 'biiKbC8KDF', '0TBj2N3Ane', 'Yf7BztMu0a', 'ding:\x206px\x20', 'topPropaga', 'var(--text', 'ted);\x0a\x20\x20\x20\x20', 'V72cW3lPX3', 'HEBBLyMDP+', '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20', '\x20\x20\x20\x20\x20\x20item', '-50%,\x20-50%', 'YVSyqbDjRn', 'oTxJOBNZw0', 'VkXg76Vxy0', 'luk45Fh3f6', 'clFG7PXL8f', 'strokeRect', 'havior\x20===', '0eyx72ceae', 'nVnM/I7Zzx', 'n;\x0a\x20\x20\x20\x20\x20\x20\x20', 'er.findGri', '3Nxq5G+AMs', 'MzdFPF/ZLl', '\x20\x20\x20\x20\x20\x20\x20win', 'ateGridPos', '16p3hYZiC3', 'iCk00ek0Go', 't-size:\x2014', 'vv3jv3Tl6A', 'BT9wclAAAA', 'J3lOP3P4yq', 'wO1Nn2rFSb', '0ggrxkheY0', 'n3pj5uf3jz', 'ept=\x22.png\x22', '//vnp/kIb+', '3vwF8/FIl4', 'eX9OaHut9d', 'ext\x20sprite', 'bXMKgjYUCf', 'lkWBKUGU+l', 'bOctZ5mHe4', 'w1zfk2+ENW', 'refreshBut', 'VTMzm', 'yle=\x22margi', 'ync', 'dirname', '_buttonSpr', 'ieCdWQC7Fc', 'qh6WYl7SZD', '5tZm4TXSYD', '8342890ZMRiKM', 's:\x20', 'QAxLF1gIDy', 'ntrollable', 'adient(225', 'seFloat(in', '\x20\x20\x20\x20\x20\x20\x20\x20fo', 'BDD3CnDol6', 'JaRwdrAORt', 'uFhCC', '\x20body::bef', 'tting\x20posi', 'aQaA3q2kdU', '=\x20\x27display', 'n/3iFHgkOO', '7mJiIpmBkw', 'dSEgr', 'L4dCtzt/8a', 'move(\x27acti', 'IqBlSQJMCQ', 'ePvHmEuuoo', 'N4GNdFHw4y', 'ebkit-mask', 'I/ABD/Kh1N', 'fXYfZGYFe9', 'FDAnTm/t78', 'WEzs+vC2HK', '1722804WVBMYK', 'sqI0wHC2hB', '9gR7gyPgGD', 'DMqsKGdo7O', 'TML\x20=\x20\x27\x27;\x0a', 'sKY/dO36uR', 'ranslate(-', '6uWszue0H1', '+jOGkTIXJU', '9Vf/fOD4Vp', 'e\x20game\x20wil', 'GhW0LvzDKe', 'qiFrVsHU2U', 'cq4wwCNjEe', 'e.transfor', 'L2kHUz4OaV', '();\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20.main', 'middle', 'eviewBg.st', 'iNaQv', 'EI2EczHs9I', '\x20fileData\x20', 'ate\x22>Selec', 'AVAW7BtElJ', 'tById(\x27pos', 'aNbHXC1GLh', 'rounds', '0oHhR1SXxQ', 'VSPRa', '/TlK9rYPO4', 'vABj37QOG/', 'Child(name', '\x20\x20\x20\x20\x20\x20\x20\x20e.', 'xtUQ+BXb3m', 'G4aqVr13z8', 'aIYzAcarvs', 'yfoeAoTsGl', 'currentSlo', '\x20currentSl', 'ed\x20to\x20enab', '\x20to\x20adjust', 'AZUlrwKyT6', 'fmCSfMHeHE', 'parent', '6Cyu+WMk6d', 'n:\x201\x20/\x20-1;', '+xsDD2PlUU', '\x20\x20\x20\x20\x20\x20\x20\x20le', 'NNzCZ', '+SjRlI5Dmq', 'esetGridBa', 'KO4q2vur/Q', 'SV2gWpIXOs', 'on()\x20{\x0a\x20\x20\x20', 'ame;\x0a\x20\x20\x20\x20\x20', 'KWUTy9vJ2/', 'ALY5mwAlmZ', 'zNNY33Yd3E', 'Fi5Yjvx7DA', 'aTOxD', 'U7NXu/vV83', 'leViaGamep', '/js/', 'UAmnfug5cR', 'VGAR67i9Cy', 'ArpL3zjt7l', 'rgba(255,\x20', ';\x0a\x0a\x20\x20\x20\x20\x20\x20\x20', '1Vqs6ZIrVE', '.getElemen', 'dy::-webki', '\x20\x20\x20\x20\x20\x20\x20\x20<d', 'bel>\x0a\x20\x20\x20\x20\x20', 'Dzaw1gCUhk', 'list.inner', '\x20type=\x22tex', 'LxWJWIuh7Y', 'uWKtWULMmN', 'a0K/AqzZOH', 'sBtAy8eA2I', '\x20</div>\x0a\x20\x20', 'MIRfWrP404', 'BflEBc60+g', 'round', 'tonText', 'ridPadding', 'mYPjckQNww', 'SpecialBeh', 'tConfig);\x0a', 'vuQLDPy8tI', 'Error\x20crea', 'QOpGak6gOL', ');\x0a\x20\x20\x20\x20\x20\x20\x20', 'hdTkVUVBmz', '\x20file.\x27);\x0a', '/3PWhdg9N7', 'wGsJzPZoyo', 'context', '=\x22Create\x20a', 'Ymogo/si20', '\x2018px;\x20hei', '7brLn+rPmt', 'ertyDescri', 'DImhT6AGHK', 'DVvgrCBPsD', 'pdate\x20curr', 'NSKc4ANQY0', 'filename', 'isNwjs', 'e);\x0a\x20\x20\x20\x20\x20\x20', 'bel>Paddin', 'upport</bu', '\x200%,\x20trans', 'O2f/D07FNg', 'istingSlot', 'div>\x0a\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20ite', 'und!', 'dGamepadCo', 'nput\x20type=', 'W2U8HtKcUv', 'ap2/a7FjDB', 'S/0YVJRAik', 'utGpuVlYlh', 'list-item-', '+HBV3oLnX8', '/5K/9b6xHa', '3XRquNiAxq', 'axoNBxY1lg', 'EPkkmF9EYg', 'vDMNraRhLG', 'jZh1HCS6WD', 'StFoB7sd0x', 'Ta7xSBD2yJ', '\x20\x20\x20</butto', 'MbvdAaJbNb', 'eNameWitho', 'XInput.val', '6bqzYinU6E', 'sitions', 'ntGrid\x20===', 'yyqmvECLmq', 'DDkmht8njB', 'fVH7eEdax2', 'RI6cA9YQpL', '8iGQf6LjdW', 'wl8booOKHO', 'ETv1ePfxSW', 'BOPjON5bFp', 'style', 'YRky1r//K8', 'detM3373uO', 'daeidzPBhL', 'rEQxc+VFAU', 'mns:\x201fr\x201', 'ogrhr', 'zPbMddmQnt', 'er\x22\x20id=\x22po', 'lotName);\x0a', 'fr;\x0a\x20\x20\x20\x20\x20\x20', '+naP+i9C97', 'd\x20Backgrou', '0Td+dma2XM', 'Q8z2G0oYSj', 'TPYMIEEUuO', 'AFbGV', 'Controllab', 'MYeWPhFeW/', '+mfUM/d8Z6', 'l.style.di', 'n7EDeurGq7', 'AYvyJz9cIE', 'form:\x20uppe', 'ZpGTzCQYHW', 'ify-conten', 'xYC4pOCoZK', 'vIK1Xm5KPO', 'center', 'fmVue+zovN', '597525geExXk', 'enter;\x0a\x20\x20\x20', 'Hy+oFGeMUF', 'length', 'A6C3WkLf1b', 'ontent\x20=\x20\x27', '/ecfwKLBmd', '2/P872zhXz', '\x20\x20\x20\x20font-s', 'AtntDltlkD', '84Ayoi9UCp', 'hzJJXKDuoE', 'E7bdxHL+oK', '&&\x20parseFl', 'SS+t113LKJ', '0)\x20{\x0a\x20\x20\x20\x20\x20', 'i4pTkCswxi', 'accent-sof', 'able</span', 'MbZSQzpYQD', '5w3vS+jXs7', 'aSWgktEGi/', 'urface);\x0a\x20', 'ZFDsagTICN', 'RwAxSQg1R+', 'laizjoC31E', 't:\x20center;', 'uP/jMcawPD', 'hild(item)', 'DXMCvCI/Hh', '//\x20-50%\x20Y\x20', 'tsList\x20=\x20f', 'T4IJ+q5m7+', 'pXTzbUWQZo', 'xt-muted);', '\x20\x20\x20\x20font-w', '6PIIrvOPYW', '\x20\x20\x20\x20input.', 'ckground:\x20', 'alue\x20=\x20cur', 'Z7RMkDpB2L', 'rties)\x20{\x0a\x20', 'ize:\x2011px;', 'dcByUxJm/Q', 'jZwD7leSvP', 'hFVs4EiNK5', 't\x20file\x20=\x20i', '8Eb4yvWjOI', 'border-rad', '\x20\x20\x20</scrip', '4),\x200\x200\x200\x20', 'lBehavior\x20', '+70xEzQg2J', '5nxv5EBzpH', 'lass=\x22fiel', '0;\x0a\x20\x20\x20\x20\x20\x20\x20', 'KR1lTa8clq', '/dlDL3I5hx', '\x20\x20\x20style=\x22', 'view\x27);\x0a\x20\x20', 'aMv/Oqs0nX', 'q1Gw5C54/U', '11UZ8lS877', 'FUR0ugQAtw', '\x20=\x20\x27delete', 'dBgImageFi', '8hkgoIeL78', 'HeEnd', 'field\x22\x20sty', '+2vnL9hyJB', 'N4sqQGGJjQ', 'VEsq2ZEF2L', '.15s;\x0a\x20\x20\x20\x20', '0ZeOHUhCyX', 'ZGC2pACsR0', 'j3aGBctyF6', 'P87EXB/j7R', 'sfcut', '\x20\x20border:\x20', '\x20\x20\x20input.v', 'cYCKBcsf0B', '\x20\x20\x20\x20\x20curso', 'PLkvKtWfYU', 'Columns</l', 'PXR4eHjMb+', 'roundImage', '\x20\x20\x20\x20\x20\x20colo', 'mage:\x20line', 'nKHor', 'ugANIB09Ni', 'ite', 'RqLpVZ9Y5X', 'bumQ89zeFT', '3CsKVIygKK', 'ition(\x27x\x27,', 'XG7ZEBCwXm', 'ansition:\x20', '.js\x20(test\x20', 'HuH3DBS+MB', 'Yuo2RFKDi3', '7e/ulvP1yx', '6aT22NFWxC', '7yYuVy5QPK', 'QSdRfPlU3J', '215,\x200,\x201.', 'y9Hi78TDve', 'Xec81J6nT9', 'RtjumchXPO', 'xt)\x20!impor', 'okhVRW6EHB', 'dius-sm:\x208', '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20', 'WFmnBUxR1M', '7sQUg56Hs6', '_slots', 'pener.upda', 'ft\x20=\x20\x2750%\x27', '\x20\x20\x20\x20const\x20', 'd:\x20var(--s', 'adding:\x2014', '\x20window.op', '\x20\x20function', 'LBiAwp2aoC', 'ge)\x20{\x0a\x20\x20\x20\x20', 'w56SignPno', 'rid\x20select', 'eq3/MBHEqK', 't.remove(\x27', 'wLKd3RKzqW', 't-size:\x2011', 'bziT0cGXZN', '(--text-fa', 'ener\x20&&\x20wi', 'D2/jo2sais', 'cBlraDjb7/', 'HkiHDMyt2f', 'nGp\x22\x20value', 'item\x27\x20+\x20(i', 'sdGHkKSGxM', 'Ipwxc9fPMD', 'BQ2rBhIZJW', 'gNv7+Mtn4g', 'GYpKBoFGCh', '\x22toolbar\x22\x20', 'VWo2rATHva', '(slotName)', 'LBeF5YSdV+', 'InGame', 'r2YIrWM7Q7', 'QD381gd5kI', '\x20&&\x20curren', 'KCxIU2W15/', 'viYbBljX3G', '/Np/vsPqpF', 'eogxYok4IB', 'toLowerCas', 'mZyeEnsMQx', '=\x22updateSl', 'r;\x20cursor:', 'Fe7azxrL5z', 'eld\x20{\x0a\x20\x20\x20\x20', 'ztyF4Svc0x', 'Y2V/csPQDg', '7TX7cyMX79', '\x20\x20\x20backgro', 'ement)\x20ele', '5Ubvso80AM', 'imageName)', '4MqGoSYQYU', '\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20', 'eInt(this.', 'fnywJdKVFB', 'nTpQeJnE/X', 'ox-shadow:', 'ig\x20?\x20windo', 'EjmOhpvEiz', '3HzfrUzHoj', 'Hkm2gdvNUI', 'pBnpz', 'om\x20of\x20bg\x20+', 'NNltxg47v+', 'b/EV2S19l1', 'AyAmq4lwlN', '1e1a8jFMp+', 'weight:\x2070', '91u+C9ajw9', 'lbar-btn\x22\x20', 'Mxcht', 'E2OfA1D8tV', 'Z/9YPO77s6', 'pageToCanv', 'uKF82fH3hp', 'Zo56j4ZwWu', 'iK/snhvDO1', 'g.onload\x20=', 'AHNOz', '</label>\x0a\x20', 'laNGo1HHSw', 'qmyThidsYU', '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20', 'onfig\x20&&\x20f', 'ew</h3>\x0a\x20\x20', 'cISiuaQ1jG', 'ShtNWvHKz/', 'AYi1OCRcIq', 'ansform:\x20t', 'w.opener.r', 'HCvCyrF6rB', 'leReader()', 'A9Jr019lhG', 'Xmq9i5aZvt', 'e(slotName', 'closed', 'Cn+OKtZIPg', 'IItSAYgol7', 'zMbyUjSZZB', 'now', 'pnE7pyFyIW', 'lYShFGrcHi', 'ee7aafOIxq', 'base64', 'ById(\x27slot', 'lBehavior\x27', '1rM0HTKN4A', '9\x2025%,\x20#0d', 'lot\x20Only</', '39iA1mQpwM', '87mS3VsPrT', 'pfs+EL9Ye8', 'entGrid,\x20c', '27DOibcC3Z', 'EbHbdRx5Ep', 'er\x22\x20id=\x22gr', '0,0,0,0.3)', '8MGD98+chK', 'ation();\x0a\x20', 'asX', 'zKUAhFscSW', 'XW1QjBsYIE', 'CXBIWXMAAA', 'ition:\x20rel', '7fJL81+sjl', 'type=\x22numb', 'HLydWe3Kfd', 'ayaH5ZaLxL', '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a', 'XfBu/btLn+', '8bdn16jXbB', '+pMZ057ZBP', '8Lpv+kzCWI', 'me;\x0a\x20\x20\x20\x20\x20\x20', 'QIB5cenBQA', 'Z84lZWNrBR', 'elect\x20anot', 'dius:\x20var(', 'o7fB6n4sXB', 'int);\x0a\x20\x20\x20\x20', 'hVlXXbmpnd', '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20', '8ZTsHrAHkx', 'OH04unZpQC', '52TnGufrHC', '\x20font-weig', 'ding:\x2014px', 'iu4tZtHX7f', 'oGQoaWYlDO', 'er=\x22Image\x20', ';\x20align-it', '\x20\x20\x20\x20\x20if\x20(!', 'A0DCAWCaQJ', 'adius-sm);', 'nfig.TextO', 'tName\x20=\x20re', '\x20\x20\x20\x20\x20\x20\x20onc', 'orks\x20in\x20NW', 'Lcs1bgkgIo', 'zuiXAmi2B2', '.\x20The\x20page', 'TVwdIpQqtK', '3KYZxpszjM', 'X4b0xBmOII', 'eUOGZ/cHsg', 'Cb1Ir6ISkw', 'YSYVinIZvS', 'XTiUzBKnVb', 'fGv1PSO++s', '||\x200)}\x22\x20\x0a\x20', 'undImage(i', 'JuUwVkEMZT', 'ner)\x20retur', 'qIeURE8xsj', 'map', 'SyaO2W6eHX', 'change=\x22up', 'updateGrid', 'on>\x0a\x20\x20\x20\x20\x20\x20', 'AV1aPA+JnV', 'aRMm44EOxt', 'aQQWwEJ5uc', 'gamepadCon', 'KAr1OkiJLI', 'Wa3jfPhTnc', '\x20\x20\x20\x20\x20\x20\x20\x20wi', 'NExBgiQ7wY', 'igtPe154ZY', 'nge=\x22updat', '5oQeDaJxxA', 't;\x0a\x20\x20\x20\x20\x20\x20\x20', 'outR9P0v0n', ':\x20\x27\x27}>Disp', 'Ik/YtfrLKZ', 'Slots', 'L7yzPD2qgR', 'xGmLs', 'cIFJjCYXHG', 'ield\x20input', 'ePF0WPC2WV', '531IryI3XI', 'clbfcLW+YZ', '\x20\x20\x20\x20\x20\x20\x20\x20\x20i', 'f8jP+f5/12', '7byl3ge9X3', 'ECNEppXbIE', '14px;\x0a\x20\x20\x20\x20', '1RjN7akBD0', 'play:\x20flex', 's\x20to\x20Grid\x0a', 'ing\x20full\x20s', 'mwsvtx6Nzj', 'ge\x27);\x0a\x20\x20\x20\x20', 't\x20all\x20slot', 'ldmbgOEma4', 'c57VdM3HKu', 'her\x20grid\x20t', 'g2lMFx+cEh', '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20', '\x27}\x0a\x20\x20\x20\x20\x20\x20\x20', 'gt2Ylflt10', 'gwMSoITIpX', 'J+1rewWmbJ', 'ext);\x0a\x20\x20\x20\x20', '88O/+RouJo', '3mY95nK3pg', 'yXxHfB83/u', 'T3z5XcuW+V', 'gM9mbrkXd5', 'lassName\x20=', 'Hq2cbNiw4e', '===\x20null)\x20', 'jBD9i3Pjuf', 'FBVRrFQgWx', '2224344ifwzXM', ':\x2010px;\x0a\x20\x20', 'MnFbC52VkS', '\x20\x20\x20\x20\x20\x20\x20<di', '\x20\x20\x20\x20\x20\x20\x20\x20\x20-', 'fFQRJV4hjl', 'findIndex', 'xuKY4YAUIQ', '2SFjdKZ2wo', 'KF0eRbY2/h', 'alCIXOYd0p', 'eDFnOJzh4r', 'Y84dE8ug/s', 'MX30ddo8Fr', 'Wksgf', 'ig.json', 'XIR7oeP317', 'kTYebZgUfr', '4vb4xB13FJ', 'u4YuiDvXuf', 'surface-3:', 'entById(\x27s', '4VXOFLNq5E', '9L3fdk77/N', 'avior', 'P/Z+gaGrJS', 'indow.upda', 'dB8pLkycu+', 'iv\x20style=\x22', 'DQF01LNrIc', 'D2ZF25Y9dE', 'nd</h3>\x0a\x20\x20', '9M7DOQqZ+7', 'SR1L80grT3', 'msgKtyCY4f', 'IaeMDjAQ/I', 't:focus\x20{\x0a', 'g.src\x20=\x20\x27i', 'X/mD0PDrYi', 'gaoMI/N1Of', '3McOs49vWP', '\x20\x20\x20\x20\x20\x20\x20\x20</', 'EyaC0oapBq', 'HUV4FlBQqI', 'ative;\x0a\x20\x20\x20', 'BVFb2KIi1h', 'eAzj8BImEQ', '3ZndkNmW3A', 'g+wmaQxMqi', 'ener.creat', '\x20\x20\x20\x20\x20\x20\x20\x20bo', '21QNltCI', 'jvfLoONgEa', '\x20\x20padding:', 'WWJx7FrffS', 'put\x20=\x20docu', 'bcljwsjPYm', 'MIriV2761X', '15px;\x20min-', 'aBDjEwB63Y', 'n.classNam', '4zT6oVZASC', 'AtKDDKZmCi', 'ibwBqNLJm9', '\x20\x20\x20box-sha', 'iVKXaioL5F', 'Slot\x20not\x20f', '\x20.section-', '9]/g,\x20\x27_\x27)', 'lH2VW+i6ZY', 'nSprite', 'vLID1GMWLm', '/wQT3avEC5', '\x2010px;\x0a\x20\x20\x20', 'cjjXooBhK6', '=\x22scrollab', '\x20\x20\x20\x20\x20\x20\x20</d', 'lKFe7RrjYc', 'lotPropert', 'jl2KTYpthX', 'el>\x0a\x20\x20\x20\x20\x20\x20', 'e/aIFaOFqk', 'EzAus7ESsP', 'Fr01r56LEW', '9OM8IOkcxP', 'geGridSlot', 'Dfilc', 'DZcXSrbbIx', 'r5k7qPsQcT', '?\x20\x27selecte', 'Ov9ZRbM/sv', 'oOS5YviYpg', '\x20body\x20{\x20\x0a\x20', 'rKx4/6ujyf', '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'p:\x205px;\x22>\x0a', '37RDukTO49', 'rq9AIWuwpO', '8FYuVmKreq', '<button\x20cl', 'lGD8kJlOtG', 'Z+Lsamllsb', '9MsnMB04wP', 'nt);\x0a\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20previ', '//////////', 'g19ZkHCVlk', '\x20\x20\x20min-hei', 'ndXAmDbfNp', 'iWMK6WBjDi', 'iaULRckiqd', 'd);\x0a\x20\x20\x20\x20\x20\x20', 'nel\x20{\x0a\x20\x20\x20\x20', '6wUQVVEG2Y', 'bl9foYAXc+', '\x20\x20\x20\x20\x20\x20\x20z-i', 'tCBislRcsu', 'urrentGrid', 'iKmqsiHHeE', 'ND7IEa4sb9', 'e\x20or\x20Skill', 'rw50JZGVOk', 'tiD2QLQ7PH', 'window.ope', 'delete', 'ztWamzn3yD', 'RlhVCKWZ7j', 'SG2PZw0kV0', 'existsSync', '6UczuIA92A', 'rids</h3>\x0a', 'r95jZ9zPHD', 'textOffset', 'AElFTkSuQm', 'LcJSqyWIRI', '3g21GPl3uV', 'RYktufYq20', 'm:\x202px;\x0a\x20\x20', 'q9tC0czYlN', 'groundImag', 't\x20Grid\x20Pos', 'SF+kRPLQF3', '\x27bgImageFi', 'Nrw0eHvBWn', 'em.id\x20=\x20\x27g', 'RhV7PINZSa', '--\x20Hidden\x20', 'oundImage\x27', 'kground:\x20#', 'jCLY3hJzQi', 'deleteGrid', 'm1fsKfJayR', 'BFoNiBQy0A', 'Q5dVHBHCqD', ':\x201px\x20soli', '9q7ddSlhhY', '\x20\x20\x20\x20\x20</div', '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20b', 'grid_', '10TQ0QFTZy', 'g9mLYl5Jwo', 'jA4AZd5biY', 'xyLxI', 'spOlO8pgin', 'hjxUJHkQQ8', 'fXHZN/3ftN', '7rsFES7vjZ', 'lPTrX9xqdy', 'b6TelGKmOR', 'nuePsCmoYa', 'YBWAesgE+R', 'lv4kTBW+Ok', 'l3jiX1bnI+', 'RRQLg2LvAz', 'B+W4d14oOZ', 'GREqa', '0y7iKOLk8Q', 'jsiqdsqueu', 'zncNk', 'arfG/RwvjB', 'cVZVXGqp/y', 'etY)\x20||\x200;', 'LkBaAZIDVk', '3dU7l1qtmV', 'ent(to\x20bot', 'mVMHU', 'ment.getEl', '5554620gqPMQF', 'QKikihoFbK', 'UE2cyixB96', '2unzkJWZQj', 'AI7GZ2AOD0', 'g5jNPFHDA7', '\x205px\x2015px;', '\x20\x20\x20\x20\x20backg', 'xXV1Ofrh6r', '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20', 'Hy/8bDYZBb', 'urn;\x0a\x20\x20\x20\x20\x20', 'oogVtT6Wdn', 'x;\x22>\x0a\x20\x20\x20\x20\x20', 'configurab', '!grids\x20||\x20', 'n8Ov0cAsOk', 'crpn02zDGO']; _0x44f8 = function () { return _0x2ec5cc; }; return _0x44f8(); } TouchInput['_onMouseUp'] = function (_0x1d8790) { const _0x4cf841 = { _0x473474: 0x9d8, _0x11840c: 0x9aa }, _0x2e8e1f = _0x57bd41; if (editorMode && SceneManager['_scene'] instanceof Scene_Map && clickStartPos) { const _0x2e47cf = Graphics['pageToCanv' + _0x2e8e1f(_0x4cf841._0x473474)](_0x1d8790['pageX']), _0x59012b = Graphics[_0x2e8e1f(_0x4cf841._0x11840c) + 'asY'](_0x1d8790[_0x2e8e1f(0xb1f)]), _0x1bf84b = Date[_0x2e8e1f(0x9c4)]() - clickStartTime, _0x12926f = _0x2e47cf - clickStartPos['x'], _0x43d7dc = _0x59012b - clickStartPos['y'], _0xef52e5 = Math[_0x2e8e1f(0xd1)](_0x12926f * _0x12926f + _0x43d7dc * _0x43d7dc); _0xef52e5 < DRAG_THRESHOLD && _0x1bf84b < -0x19 * -0x1 + -0xa * 0x130 + -0x2bf * -0x5 && trySelectSlotAtPosition(_0x2e47cf, _0x59012b), clickStartPos = null; } _TouchInput_onMouseUp_VisualEditor['call'](this, _0x1d8790); }; function trySelectSlotAtPosition(_0x14b232, _0x160cb3) { const _0x511d12 = { _0x370ecf: 0xb1d, _0x17dd63: 0x3ab, _0x270c0b: 0x97f, _0x4bb2e5: 0x19a, _0x36adf2: 0x853, _0x550d97: 0x462, _0x42ce20: 0x8ea }, _0x2fe9d2 = _0x57bd41; if (!SceneManager['_scene'] || !SceneManager[_0x2fe9d2(0xb1d)]['_skillUI']) return ![]; for (const [_0x512233, _0x2c79ee] of SceneManager[_0x2fe9d2(_0x511d12._0x370ecf)]['_skillUI']['_slots']) { const _0x43e853 = _0x2c79ee['width'] || -0x19 * -0x45 + 0x1 * 0x1d46 + -0x23c3, _0x581228 = _0x2c79ee[_0x2fe9d2(_0x511d12._0x17dd63)] || 0x145a + -0x1be1 + 0xb5 * 0xb; if (_0x14b232 >= _0x2c79ee['x'] - _0x43e853 / (-0x3 * 0x7c3 + 0x94f * -0x1 + 0x209a) && _0x14b232 <= _0x2c79ee['x'] + _0x43e853 / (-0x24c7 + -0x2217 + 0x46e0) && _0x160cb3 >= _0x2c79ee['y'] - _0x581228 / (-0xdf8 + -0xd3c * -0x1 + 0xa * 0x13) && _0x160cb3 <= _0x2c79ee['y'] + _0x581228 / (-0x19 * 0xa5 + -0x1d52 + 0x1 * 0x2d71)) { if (_0x2fe9d2(0x9af) === 'AHNOz') return currentSelectedSlot = _0x512233, window['selectSlot' + _0x2fe9d2(_0x511d12._0x270c0b)](_0x512233), VisualEditorWindow && !VisualEditorWindow['closed'] && VisualEditorWindow['selectSlot' + 'FromGame'](_0x512233), !![]; else { const _0x8bd955 = _0x4d3d5f['_scene'][_0x2fe9d2(_0x511d12._0x4bb2e5)]['_gridBackg' + _0x2fe9d2(_0x511d12._0x36adf2)]; if (_0x8bd955 && _0x8bd955[_0x43ef61]) { const _0x216def = _0x8bd955[_0x2cda09]; _0x216def[_0x2fe9d2(_0x511d12._0x550d97)] = _0x5b39c5['grids'][_0x5ae303]; if (_0x216def['_isPlaceho' + 'lder']) { const _0x2cb35f = _0x5eaadb * _0x5bfcea + (_0x22db12 - (0x237f + -0x13a5 * -0x1 + -0x3723)) * _0x3ef170, _0x34f6f3 = _0x220aba * _0x2be3c5 + (_0x2c1745 - (-0x1e1 + 0x125e * -0x2 + 0x269e)) * _0xff06ac, _0x10d497 = new _0x37a3be(_0x2cb35f + (0x2690 + 0x55a + -0x16a * 0x1f), _0x34f6f3 + (0x20c5 + 0x1 * 0x237b + -0x442c)), _0x572f29 = _0x10d497['context']; _0x572f29['strokeStyl' + 'e'] = 'rgba(255,\x20' + '215,\x200,\x200.' + '9)', _0x572f29['fillStyle'] = 'rgba(255,\x20' + '215,\x200,\x200.' + '25)', _0x572f29['lineWidth'] = -0x1bdd + 0xb76 + 0x106b, _0x572f29[_0x2fe9d2(0x21b) + 'h']([-0x5f * 0x2d + -0x1 * -0x21fa + 0x191 * -0xb, -0x4bf + -0xb05 + 0xfca]), _0x572f29['fillRect'](0xa * -0x36e + -0x2 * -0x100 + 0x204c, 0x427 * 0x1 + -0x3a * -0x11 + -0x801, _0x2cb35f + (-0x5fe + 0x1ee1 + -0x18cf), _0x34f6f3 + (-0x304 * -0x8 + 0xadd + 0x3 * -0xba3)), _0x572f29['strokeRect'](-0x1 * 0x16c7 + 0x12e1 + -0x3e6 * -0x1, -0x26d3 * -0x1 + -0x1a7f + -0x41c * 0x3, _0x2cb35f + (0x1 * -0xece + 0xeec * -0x1 + 0x1dce), _0x34f6f3 + (0x1 * 0x21d7 + 0x1885 + -0x3a48)), _0x572f29['font'] = 'bold\x2020px\x20' + 'Arial', _0x572f29['fillStyle'] = _0x2fe9d2(0x87b) + '215,\x200,\x201.' + '0)', _0x572f29[_0x2fe9d2(0x632)] = _0x2fe9d2(_0x511d12._0x42ce20), _0x572f29['textBaseli' + 'ne'] = 'middle', _0x572f29['fillText']('Grid\x20' + (_0x1bffdc + (-0x1d70 + 0xf59 + 0xe18)), (_0x2cb35f + (-0xe9 * -0x23 + 0x237d + -0x4344)) / (-0xff0 + -0x7e9 + 0x17db), (_0x34f6f3 + (0x5 * 0x246 + 0x24f * 0xc + -0x26fe)) / (0x1167 + 0xb09 * -0x1 + -0x32e * 0x2)), _0x216def['visible'] = ![], _0x216def['bitmap'] = _0x10d497, _0x216def[_0x2fe9d2(0x42c)] = !![]; } } } } } return ![]; } if (Object['getOwnProp' + _0x57bd41(0x89f) + _0x57bd41(0x578)](document, 'hasFocus')?.[_0x57bd41(0xb15) + 'le'] !== ![]) { const originalHasFocus = document['hasFocus']['bind'](document); Object['defineProp' + 'erty'](document, 'hasFocus', { 'value': function () { return ConfigManager['alwaysRun'] || originalHasFocus(); }, 'writable': ![], 'configurable': !![] }); } function getConfigPath() { const _0x3ff729 = { _0xb1ff85: 0x56d }, _0x40fb2c = _0x57bd41; if (!Utils[_0x40fb2c(0x8a5)]()) return null; const _0x449ed9 = require(_0x40fb2c(0x3b1)), _0x1793b8 = _0x449ed9['dirname'](process['mainModule']['filename']) + '/js/'; return _0x449ed9[_0x40fb2c(_0x3ff729._0xb1ff85)](_0x1793b8, 'HotbarConf' + _0x40fb2c(0xa5a)); } function getProjectRoot() { const _0x23dcaf = { _0x1d8282: 0x8a4 }, _0x2612d7 = _0x57bd41; if (!Utils['isNwjs']()) return null; const _0xd6eba4 = require('path'); return _0xd6eba4['dirname'](process['mainModule'][_0x2612d7(_0x23dcaf._0x1d8282)]); } function getJsPath() { const _0x1f5f77 = { _0x1f44dc: 0x8a5, _0x36aa16: 0x818, _0x4504ab: 0x8a4, _0x10c270: 0x877 }, _0x5a01a7 = _0x57bd41; if (!Utils[_0x5a01a7(_0x1f5f77._0x1f44dc)]()) return null; const _0x5860b6 = require('path'); return _0x5860b6[_0x5a01a7(_0x1f5f77._0x36aa16)](process[_0x5a01a7(0x461)][_0x5a01a7(_0x1f5f77._0x4504ab)]) + _0x5a01a7(_0x1f5f77._0x10c270); } function loadConfigFile() { const _0x568b2e = { _0x52869c: 0x5f2 }, _0x1e8caf = _0x57bd41; if (!Utils['isNwjs']()) return null; const _0x171640 = require('fs'), _0x204d46 = getConfigPath(); try { if (_0x171640['existsSync'](_0x204d46)) return JSON['parse'](_0x171640['readFileSy' + 'nc'](_0x204d46, 'utf8')); } catch (_0x456bf2) { console['error']('[Hotbar]\x20E' + 'rror\x20loadi' + _0x1e8caf(_0x568b2e._0x52869c), _0x456bf2); } const _0x35a137 = {}; return _0x35a137['grids'] = [], _0x35a137['positions'] = {}, _0x35a137; } function saveConfigFile(_0x3d18e5) { const _0x39292b = { _0xfb2cb3: 0x162, _0x13660d: 0x817, _0x16045c: 0x19a }, _0x825b1a = _0x57bd41; if (!Utils['isNwjs']()) return ![]; const _0x3798a0 = require('fs'), _0x3c049a = getConfigPath(); try { if ('WXCXb' !== 'ByMJd') return _0x3798a0[_0x825b1a(_0x39292b._0xfb2cb3) + _0x825b1a(_0x39292b._0x13660d)](_0x3c049a, JSON[_0x825b1a(0x4de)](_0x3d18e5, null, -0x2 * 0xb7b + 0x1d1d * 0x1 + 0x625 * -0x1), 'utf8'), !![]; else { const _0x58e4a2 = _0x307c91['_scene'][_0x825b1a(_0x39292b._0x16045c)]; if (_0x58e4a2[_0x825b1a(0x427) + 'rounds'] && _0x58e4a2[_0x825b1a(0x427) + 'rounds'][_0xd1a1e1]) { const _0x197dc1 = _0x58e4a2['_gridBackg' + 'rounds'][_0x169723]; _0x197dc1['x'] = _0x2e993b, _0x197dc1['y'] = _0x27a2a5; } } } catch (_0x9d7f10) { return console[_0x825b1a(0x27d)]('[Hotbar]\x20E' + 'rror\x20savin' + 'g\x20config:', _0x9d7f10), ![]; } } function reloadGridSettings(_0x303da1 = ![]) { const _0x5b15e0 = { _0x121a87: 0x166, _0x57ff5f: 0x239 }, _0x5e18d2 = { _0x2df1c1: 0x1bf }, _0x18e12b = { _0xfd47a1: 0xb1d, _0x21d504: 0x19a, _0x45654e: 0x9a7, _0x8421f3: 0x282 }, _0x4a405a = _0x57bd41; if (Utils['isNwjs']()) { const _0x1f7443 = loadConfigFile(); if (_0x1f7443) return gridSettings = _0x1f7443['grids'] || [], !![]; } else return fetch('js/HotbarC' + _0x4a405a(_0x5b15e0._0x121a87))['then'](_0x1d003f => _0x1d003f['json']())[_0x4a405a(_0x5b15e0._0x57ff5f)](_0x13e115 => { const _0x52ac01 = _0x4a405a; gridSettings = _0x13e115[_0x52ac01(0x72f)] || []; if (_0x303da1 && SceneManager['_scene'] && SceneManager[_0x52ac01(_0x18e12b._0xfd47a1)][_0x52ac01(_0x18e12b._0x21d504)]) { if (_0x52ac01(_0x18e12b._0x45654e) === 'Mxcht') SceneManager['goto'](SceneManager['_scene'][_0x52ac01(0x650) + 'r']); else for (const _0x4fd408 of _0x38d09d[_0x52ac01(0xa23)]) { const _0x2fca7a = (_0x4fd408['Name'] || '')[_0x52ac01(_0x18e12b._0x8421f3)](','); if (_0x2fca7a[-0x1d3e * 0x1 + -0xa8d + 0x27cb * 0x1]['trim']() === _0x465db4) return _0x4fd408; } } })[_0x4a405a(0x137)](_0x1ca945 => { const _0x4673de = _0x4a405a; console['error'](_0x4673de(_0x5e18d2._0x2df1c1) + 'ailed\x20to\x20l' + 'oad\x20Hotbar' + 'Config.jso' + 'n:', _0x1ca945); }), !![]; return ![]; } reloadGridSettings(![]);
})();