/*:
 * @target MZ
 * @plugindesc Create Hotbar on the screen using drag-n-drop
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io
 * 
 * @help
 * Version 2.0.4
 * For support, please reach out:
 * Discord: https://discord.gg/YKPscqHV8b
 * Patreon: https://www.patreon.com/SangHendrix
 * ----------------------------------------------------------------------------
 * This RPG Maker MZ plugin helps you easily create a hotbar/quick-use slot UI
 * in realtime
 * ----------------------------------------------------------------------------
 * HOW TO USE
 * ----------------------------------------------------------------------------
 * Playtest game > Press Shift to open Realtime Hotbar Creator > Play around!
 * Create a Grid first, then select that grid and create slots. Use your mouse
 * to drag grid or slots anywhere on screen.
 * ----------------------------------------------------------------------------
 * 
 * ■■ SLOTS PARAMETER EXPLAINATION ■■
 * 
 * - Slot Name:         When equipping an item or a skill, it'll
 *                      display a list of slot and this name will appear on the list
 * - Button Text:       A text to display on the slot, can be a keyboard/gamepad button
 * - Special Behavior:  
 *   + Display Equipped Weapon: This slot will automatically display equipped weapon
 *   + Display Equipped Shield: Same but for shield
 *   + Item Slot Only: This slot will only avaiable for Items
 *   + Skill Slot Only: Same but for Skills
 * 
 *   + Example:  Slot Name: Slot 1
 *               Button Text: Q (keyboard), RB (gamepad) (optional)
 *               Special Behavior: none
 *            -> When gamepad is connected, Button Text shows RB
 * 
 * ■■ ITEM/WEAPON/SKILL/ARMOR NOTETAG ■■
 * 
 * <slot text: x, (optional: offset x, y)>   # Display a text on a slot that contains this item
 * <slot image: x>                           # Use custom image from folder pictures/slotUI
 * <slot cooldown: seconds, show number?>    # Set cooldown for this item
 * <slot disallow>                           # Disallow the item to be equipped to any slot
 * 
 * Example: <slot text: haha> or <slot text: haha, 0, -30>
 *          <slot image: Potion>
 *          <slot cooldown: 5> or <slot cooldown: 5, false> (not showing countdown)
 * 
 * ----------------------------------------------------------------------------
 * TERMS OF USE
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
 * @param 5cc
 * @text --------------------------
 * @default --------------------------
 * 
 * @param visualEditorButton
 * @text Hotbar Creator Button
 * @type select
 * @option Shift
 * @value shift
 * @option Control
 * @value control
 * @option Page Up
 * @value pageup
 * @option Page Down
 * @value pagedown
 * @desc Press this button to create and design your hotbar in realtime
 * @default shift
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
 * @param HideUIduringMessage
 * @text Hide UI during Message
 * @type boolean
 * @desc If true, UI will fade out when a message window is open
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
/*:ja
 * @target MZ
 * @plugindesc ドラッグ＆ドロップで画面上にホットバーを作成します
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io/
 * 
 * @help
 * Version 2.0.4
 * サポートについては以下までご連絡ください：
 * Discord: https://discord.gg/YKPscqHV8b
 * Patreon: https://www.patreon.com/SangHendrix
 * ----------------------------------------------------------------------------
 * このRPGツクールMZ用プラグインは、ホットバー／クイック使用スロットのUIを
 * リアルタイムで簡単に作成できるようにします
 * ----------------------------------------------------------------------------
 * 使い方
 * ----------------------------------------------------------------------------
 * テストプレイを開始 > Shiftキーを押してRealtime Hotbar Creatorを開く > 実際に操作してみてください！
 * まずグリッドを作成し、そのグリッドを選択してスロットを作成します。
 * マウスを使ってグリッドやスロットを画面上の任意の位置にドラッグできます。 * 
 * ----------------------------------------------------------------------------
 * 
 * ■■ スロットパラメータ説明 ■■
 *
 * - Slot Name（スロット名）：
 *   スロットの名称です。
 *   アイテムやスキルを装備する際、スロット一覧にこの名前が表示されます。
 *
 * - Button Text（ボタン表示テキスト）：
 *   スロット上に表示するテキストです。
 *   キーボードやゲームパッドのボタン名を表示できます。
 *
 * - Special Behavior（特殊動作）：
 *   + Display Equipped Weapon：
 *     現在装備中の武器を自動表示します。
 *   + Display Equipped Shield：
 *     現在装備中の盾を自動表示します。
 *   + Item Slot Only：
 *     このスロットはアイテム専用になります。
 *   + Skill Slot Only：
 *     このスロットはスキル専用になります。
 *
 * + 例：スロット名：Slot 1
 * ボタン表示：Q（キーボード）、RB（ゲームパッド）（任意）
 * 特殊動作：なし
 * → ゲームパッドが接続されている場合、ボタン表示はRBになります
 * 
 * ■■ アイテム／武器／スキル／防具 メモタグ ■■
 *
 * <slot text: x, (任意: offset x, y)>
 *   # このアイテムが入っているスロット上にテキストを表示します。
 *
 * <slot image: x>
 *   # pictures/slotUI フォルダ内のカスタム画像を使用します。
 *
 * <slot cooldown: 秒数, カウント表示する？>
 *   # このアイテムにクールダウンを設定します。
 *
 * <slot disallow>
 *   # このアイテムをどのスロットにも装備できないようにします。
 *
 * 例：
 *   <slot text: haha>
 *   <slot text: haha, 0, -30>
 *
 *   <slot image: Potion>
 *
 *   <slot cooldown: 5>
 *   <slot cooldown: 5, false>  （カウントダウンを表示しない）
 * 
 * ----------------------------------------------------------------------------
 * TERMS OF USE
 * https://www.rpgmakeractioncombat.com/p/sang-hendrixs-rpg-maker-plugin-terms-of.html
 * ----------------------------------------------------------------------------
 * @command aa
 * @text ---------------------------------
 * 
 * @command ---c
 * @text ■ 共通機能
 * 
 * @command aaa
 * @text ---------------------------------
 * 
 * @command HotbarInputStatus
 * @text ホットバー入力の有効/無効
 * @desc プレイヤーのホットバー入力を許可または無効にします
 *
 * @arg Status
 * @type boolean
 * @text ホットバー入力を許可
 * @desc プレイヤーがホットバーを使用できるようにします
 * @default true
 *
 * @command LockSlot
 * @text スロットのロック/解除
 * @desc スロットをロックまたは解除して、装備や解除を防ぎます
 *
 * @arg SlotName
 * @type string
 * @text スロット名
 * @desc ロック/解除するスロットの名前
 *
 * @arg Lock
 * @type boolean
 * @text スロットをロック
 * @desc true: ロックする / false: ロック解除
 * @default true
 * 
 * @command UseSelectedSlot
 * @text ゲームパッド | 選択中のスロットを使用
 * @desc 現在選択されているスロットに装備されているアイテムまたはスキルを使用します
 *
 * @command UseSlot
 * @text キーボード | 指定スロットを使用
 * @desc 指定したスロットに装備されているアイテムまたはスキルを使用します
 *
 * @arg Name
 * @type text
 * @text スロット名
 * @desc 使用するスロットの名前
 * 
 * @command aax
 * @text ---------------------------------
 * 
 * @command ---v
 * @text ■ 手動使用専用
 * 
 * @command aaax
 * @text ---------------------------------
 * 
 * @command SetSkill
 * @text スロットに設定
 * @desc スロットにアイテム・武器・スキルを設定します。
 * 
 * @arg Name
 * @type text
 * @text スロット名
 * @desc 設定するスロットの名前です
 * 
 * @arg skillId
 * @type skill
 * @text スキル
 * @desc このスロットに設定するスキルです
 * @default 0
 * 
 * @arg itemId
 * @type item
 * @text アイテム
 * @desc このスロットに設定するアイテムです
 * @default 0
 * 
 * @arg weaponId
 * @type weapon
 * @text 武器
 * @desc このスロットに設定する武器です
 * @default 0
 * 
 * @command RemoveFromSlot
 * @text スロットから削除
 * @desc 指定したスロットの中身を削除します
 * 
 * @arg Name
 * @type text
 * @text スロット名
 * @desc クリアするスロットの名前です
 * 
 * @command PushNextStuff
 * @text キーボード | 次の利用可能アイテムを設定
 * @desc 指定したスロットに、次に利用可能な武器／盾／アイテム／スキルを設定します
 * 
 * @arg Name
 * @type text
 * @text スロット名
 * @desc 設定先のスロット名です
 * 
 * @arg Type
 * @type select
 * @option Weapon
 * @option Shield
 * @option Item
 * @option Skill
 * @text アイテムタイプ
 * @desc スロットに設定するアイテムの種類です
 * 
 * @command GamepadPushNextStuff
 * @text ゲームパッド | 次の利用可能アイテムを設定
 * @desc 現在選択中のスロットに、次に利用可能な武器／盾／アイテム／スキルを設定します
 * 
 * @arg Type
 * @type select
 * @option Weapon
 * @option Shield
 * @option Item
 * @option Skill
 * @text アイテムタイプ
 * @desc 選択中のスロットに設定するアイテムの種類です
 * 
 * @command AllowItemUse
 * @text アイテム使用の許可／禁止
 * @desc 特定のアイテム、武器、防具、スキルをホットバーで使用できるかを制御します
 *
 * @arg TargetType
 * @type select
 * @option アイテム
 * @value item
 * @option 武器
 * @value weapon
 * @option 防具
 * @value armor
 * @option スキル
 * @value skill
 * @text 対象タイプ
 * @desc 使用の許可／禁止を設定する対象の種類
 * @default item
 *
 * @arg TargetIdName
 * @type text
 * @text 対象ID／名前
 * @desc アイテム、武器、防具、スキルのIDまたは名前を指定します。式にも対応します
 * @default 1
 *
 * @arg Status
 * @type boolean
 * @text 使用を許可
 * @desc true: ホットバーで使用可能 / false: ホットバーで使用不可
 * @default true
 * 
 * @param 5cc
 * @text --------------------------
 * @default --------------------------
 * 
 * @param visualEditorButton
 * @text ホットバー作成ボタン
 * @type select
 * @option Shift
 * @value shift
 * @option Control
 * @value control
 * @option Page Up
 * @value pageup
 * @option Page Down
 * @value pagedown
 * @desc このボタンを押すと、リアルタイムでホットバーの作成とデザインを行えます
 * @default shift
 * 
 * @param 5cccccxcxczxczxc
 * @text --------------------------
 * @default -------------------------- * 
 * @param deszco1wcc
 * @text ■ スロット設定
 * 
 * @param 6cc
 * @text --------------------------
 * @default --------------------------
 * 
 * @param SlotSetups
 * @text ホットバー設定
 * @type struct<GridConfig>[]
 * @desc スロットを含む複数のグリッドレイアウトを作成します
 * 
 * @param GamepadCursorImage
 * @text ゲームパッドカーソル画像
 * @type file
 * @dir img/system
 * @desc ゲームパッド使用時にカーソルとして表示する画像です
 * @default
 * 
 * @param EmptySlotIcon
 * @text 空スロットアイコン
 * @type icon
 * @desc スロット選択ウィンドウで未使用スロットに表示されるアイコンです。
 * @default 16
 * 
 * @param GamepadUseSlotButton
 * @text ゲームパッド使用ボタン
 * @type select
 * @option なし
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
 * @desc 現在選択中のスロットを使用するゲームパッドボタンを指定します
 * @default A
 * 
 * @param TouchInput
 * @text タッチ入力
 * @type boolean
 * @desc スロットをタッチ／クリックして、そのスロットのアイテムを使用できるようにします
 * @default false
 * 
 * @param AllowEquipNonUsable
 * @text 使用不可アイテムの装備許可
 * @type boolean
 * @desc メニューで使用できないスキル／アイテムもホットバーに装備できるようにします
 * @default true
 * 
 * @param PartyMembersHotbar
 * @text パーティメンバーホットバー
 * @parent SlotSettings
 * @type boolean
 * @on 有効
 * @off 無効
 * @desc 各パーティメンバーごとに、スキル装備用の個別ホットバースロットを持たせるかを設定します
 * @default true
 *
 * @param 1z
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1
 * @text ■ 表示設定
 * 
 * @param 2zz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param VisibilitySwitch
 * @text UI表示スイッチ
 * @type switch
 * @desc ONのときUIが表示されます。OFFのときUIは非表示になります。0を指定すると常に表示されます。
 * @default 0
 * 
 * @param HideUIduringMessage
 * @text メッセージ表示中はUIを隠す
 * @type boolean
 * @desc trueの場合、メッセージウィンドウ表示中にUIがフェードアウトします
 * @default true
 * 
 * @param ShowZeroQuantity
 * @text 数量0を表示
 * @type boolean
 * @desc 数量が0の場合でも表示します
 * @default false
 * 
 * @param UnequipEmptyItems
 * @text 数量0で装備解除
 * @type boolean
 * @desc 所持数が0になったアイテムをスロットから自動で解除します
 * @default true
 * 
 * @param 3z
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wz
 * @text ■ スロット上のテキスト
 * 
 * @param 4zz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param ShowItemQuantity
 * @text アイテム所持数を表示
 * @type boolean
 * @desc スロット内にアイテムの所持数を表示します
 * @default true
 * 
 * @param QuantityTextOffsetY
 * @text 所持数テキストの高さ
 * @type number
 * @min -9999
 * @desc 所持数テキストの縦方向オフセット
 * @default 0
 *
 * @param ShowManaCost
 * @text マナコスト表示
 * @type boolean
 * @desc スロットにスキルが装備されている場合、マナ／MPコストを表示します
 * @default false
 *
 * @param ManaCostHeight
 * @text マナコストの高さ
 * @type number
 * @min -9999
 * @desc マナコストテキストの縦方向オフセット
 * @default 0
 * 
 * @param 3zxcxewr
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wz23412edsd
 * @text ■ ボタンアイコン置き換え
 * 
 * @param 4zzxcxbsdf
 * @text --------------------------
 * @default --------------------------
 * 
 * @param IconReplacements
 * @text アイコン置き換え設定
 * @type struct<IconReplacement>[]
 * @desc ボタンテキストをアイコンに置き換えます
 * @default []
 * 
 * @param IconMaxSize
 * @text アイコンサイズ
 * @type number
 * @desc ボタンアイコンのサイズです
 * @default 24
 * 
 * @param 3zxcqwe123
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wzcv
 * @text ■ ウィンドウ設定
 * 
 * @param 4zzdd
 * @text --------------------------
 * @default --------------------------
 * 
 * @param WindowSelectionSize
 * @text ウィンドウサイズ
 * @type string
 * @desc 形式：横幅, デフォルトで表示するコマンド数。このウィンドウはアイテム／スキルをホットバーに割り当てる際に表示されます。
 * @default 400, 8
 * 
 * @param UseNowText
 * @text 「今すぐ使用」テキスト
 * @type string
 * @desc スロット選択ウィンドウ内の「今すぐ使用」オプションに表示されるテキスト
 * @default Use Now
 * 
 * @param EmptySlotText
 * @text 空スロットテキスト
 * @type string
 * @desc スロット選択ウィンドウで空のスロットに表示されるテキスト
 * @default Empty
 * 
 * @param 7xczz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param deszco1wx
 * @text ■ フォント設定
 * 
 * @param 8xczz
 * @text --------------------------
 * @default --------------------------
 * 
 * @param FontSettings
 * @text フォント設定
 * @type struct<FontSettings>
 * @desc UIテキストのフォント設定
 * 
 */
/*~struct~FontSettings:ja
 * @param FontFile
 * @text フォントファイル
 * @type string
 * @desc fontsフォルダ内のカスタムフォントファイル（.ttf / .otf）。空欄の場合はデフォルトフォントを使用します。
 * @default
 * 
 * @param FontSize
 * @text フォントサイズ
 * @type number
 * @desc UIテキストのフォントサイズ。0の場合はゲームのデフォルト設定を使用します。
 * @default 0
 * 
 * @param FontColor
 * @text フォントカラー
 * @type text
 * @desc テキストの16進カラーコード（例：#ffffff）。空欄の場合はデフォルトを使用します。
 * @default
 * 
 * @param OutlineColor
 * @text アウトラインカラー
 * @type text
 * @desc テキスト縁取りの16進カラーコード（例：#000000）。空欄の場合はデフォルトを使用します。
 * @default
 * 
 * @param TextShadow
 * @text テキストシャドウを使用
 * @type boolean
 * @desc アウトラインの代わりにテキストシャドウを使用します。
 * @default false
*/

/*~struct~AdditionalTextDisplay:ja
 * @param TextToDisplay
 * @text 表示テキスト
 * @type text
 * @desc 表示するテキストの評価式。例：$gameVariables.value(1) や 'hello'
 * @default
 * 
 * @param SlotName
 * @text 表示先スロット
 * @type text
 * @desc 表示するスロット名を指定します。
 * @default
 * 
 * @param Offset
 * @text 位置オフセット
 * @type text
 * @desc 既定位置からのX,Yオフセット（形式：x, y）
 * @default 0, 0
 * 
 * @param Condition
 * @text 表示条件
 * @type text
 * @desc テキストを表示するための条件式。空欄の場合は常に表示されます。
 * @default */
/*~struct~IconReplacement:ja
 * @param ButtonName
 * @text ボタン名
 * @type text
 * @desc アイコンに置き換えるボタン名（例："Left Click", "Q", "RB"）
 * @default Left Click
 * 
 * @param Icon
 * @text アイコンインデックス
 * @type icon
 * @desc ボタンテキストの代わりに表示するアイコン
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
    const visualEditorButton = parameters['visualEditorButton'] || 'shift';
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
            if (!background._isDragging && TouchInput.isTriggered()) {
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
        this.opacity = this._fadeOpacity;
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
        }
        if (Input.isTriggered(visualEditorButton) && Utils.isOptionValid('test')) {
            createHotbarVisualEditor();
            return;
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

    initializeKeyMapping();
const _0x57035c=_0x2bab;(function(_0x110ea7,_0x321a12){const _0x1f5b87=_0x2bab,_0x99bfa1=_0x110ea7();while(!![]){try{const _0x4f2f00=-parseInt(_0x1f5b87(0x200))/0x1+parseInt(_0x1f5b87(0x27d))/0x2*(parseInt(_0x1f5b87(0x23d))/0x3)+-parseInt(_0x1f5b87(0x28d))/0x4+parseInt(_0x1f5b87(0x243))/0x5+parseInt(_0x1f5b87(0x1ac))/0x6+parseInt(_0x1f5b87(0x1d2))/0x7+parseInt(_0x1f5b87(0x1a2))/0x8;if(_0x4f2f00===_0x321a12)break;else _0x99bfa1['push'](_0x99bfa1['shift']());}catch(_0x4db63a){_0x99bfa1['push'](_0x99bfa1['shift']());}}}(_0x58b3,0xdf13f));let VisualEditorWindow=null,editorMode=![],currentSelectedSlot=null,currentSelectedGrid=null;function createHotbarVisualEditor(){const _0x28577a=_0x2bab;if(VisualEditorWindow&&!VisualEditorWindow[_0x28577a(0x270)]){VisualEditorWindow[_0x28577a(0x22f)]();return;}enableEditorMode(),VisualEditorWindow=window[_0x28577a(0x1f3)](_0x28577a(0x1e8),_0x28577a(0x22d),_0x28577a(0x1df));if(VisualEditorWindow){VisualEditorWindow[_0x28577a(0x25d)][_0x28577a(0x27b)](_0x28577a(0x29a)),VisualEditorWindow[_0x28577a(0x25d)][_0x28577a(0x1ce)](),window[_0x28577a(0x1a0)]=function(_0x2773ed){const _0x4622c4=_0x28577a;saveHotbarPositions(_0x2773ed);if(VisualEditorWindow&&!VisualEditorWindow[_0x4622c4(0x270)]&&_0x2773ed)for(const _0x5cebdb in _0x2773ed){const _0x4a1211=_0x2773ed[_0x5cebdb];_0x4a1211&&VisualEditorWindow[_0x4622c4(0x233)]&&(_0x4622c4(0x278)!=='Yzofg'?VisualEditorWindow['updateSlotPositionFields'](_0x5cebdb,_0x4a1211['x'],_0x4a1211['y']):_0x18b425['refresh']());}},setTimeout(()=>{const _0x88ec65=_0x28577a;if(_0x88ec65(0x1a1)!==_0x88ec65(0x1a1)){const _0x37dea3=_0x25ce15();if(!_0x37dea3||!_0x37dea3['grids'])return;const _0x113832=_0x37dea3[_0x88ec65(0x203)][_0x4a8eef];if(!_0x113832)return;_0x113832['ControllableViaGamepad']=_0x21ded1?_0x88ec65(0x253):_0x88ec65(0x19f),_0x3c8545(_0x37dea3);}else updateEditorLists();},0x64);const _0x2ddc4c=setInterval(()=>{const _0x2380f5=_0x28577a;VisualEditorWindow&&VisualEditorWindow[_0x2380f5(0x270)]&&(clearInterval(_0x2ddc4c),clearInterval(_0x4c1855),disableEditorMode());},0x1f4);let _0x5b9ecc=SceneManager[_0x28577a(0x262)];const _0x4c1855=setInterval(()=>{const _0xcf5bd0=_0x28577a;if(_0xcf5bd0(0x271)==='VNqcd')_0x5ca934[_0xcf5bd0(0x1ec)](_0xcf5bd0(0x27e),_0x3f98a8);else{if(VisualEditorWindow&&!VisualEditorWindow['closed']){if(SceneManager[_0xcf5bd0(0x262)]!==_0x5b9ecc){if('rZNMi'===_0xcf5bd0(0x27f)){_0x5b9ecc=SceneManager[_0xcf5bd0(0x262)];const _0x358390=(_0xc68f04=0x0)=>{const _0x24e0ae=_0xcf5bd0;if(_0xc68f04>0xf)return;if(editorMode&&SceneManager[_0x24e0ae(0x262)]&&SceneManager[_0x24e0ae(0x262)][_0x24e0ae(0x18f)]){if(SceneManager[_0x24e0ae(0x262)][_0x24e0ae(0x18f)]['_gridBackgrounds']){if(_0x24e0ae(0x1a7)!==_0x24e0ae(0x1a7)){_0x1e3db7[_0x24e0ae(0x1ec)](_0x24e0ae(0x1c0));return;}else SceneManager[_0x24e0ae(0x262)][_0x24e0ae(0x18f)][_0x24e0ae(0x1c3)][_0x24e0ae(0x216)](_0x3dc75e=>{const _0x247f84=_0x24e0ae;if(_0x3dc75e[_0x247f84(0x1e0)]){if(_0x247f84(0x1a9)!=='jXZiz')_0x3dc75e['visible']=!![];else return _0x1b4ce6[_0x247f84(0x294)](_0x65c378[_0x247f84(0x2b3)](_0x4e43a2,_0x247f84(0x26e)));}});}SceneManager[_0x24e0ae(0x262)][_0x24e0ae(0x211)]&&!SceneManager[_0x24e0ae(0x262)][_0x24e0ae(0x21e)]&&SceneManager['_scene'][_0x24e0ae(0x211)](),window[_0x24e0ae(0x1a0)]&&(window[_0x24e0ae(0x1a0)]=function(_0x58463b){const _0x4e5c1b=_0x24e0ae;saveHotbarPositions(_0x58463b);if(VisualEditorWindow&&!VisualEditorWindow[_0x4e5c1b(0x270)]&&_0x58463b){if(_0x4e5c1b(0x1d5)===_0x4e5c1b(0x1d5))for(const _0x3ec24f in _0x58463b){const _0x4d5997=_0x58463b[_0x3ec24f];_0x4d5997&&VisualEditorWindow[_0x4e5c1b(0x233)]&&(_0x4e5c1b(0x257)!==_0x4e5c1b(0x1f6)?VisualEditorWindow[_0x4e5c1b(0x233)](_0x3ec24f,_0x4d5997['x'],_0x4d5997['y']):_0x5cac91['error'](_0x4e5c1b(0x25f),_0x29058d));}else{const _0xf19f11=_0x2b0636[_0x4e5c1b(0x262)][_0x4e5c1b(0x18f)][_0x4e5c1b(0x28c)][_0x4e5c1b(0x1a6)](_0x137bc7);_0xf19f11&&(_0xf19f11[_0x4e5c1b(0x285)]&&_0xf19f11[_0x4e5c1b(0x285)]['removeChild'](_0xf19f11),_0x42bdc7['_scene']['_skillUI']['_slots']['delete'](_0x59064a));}}});}else setTimeout(()=>_0x358390(_0xc68f04+0x1),0x64);};_0x358390();}else _0x21d9ab[_0xcf5bd0(0x285)]['removeChild'](_0x52ca75);}}}},0x1f4);}}function enableEditorMode(){const _0x5bcce0=_0x2bab;editorMode=!![],ConfigManager['alwaysRun']=!![];SceneManager[_0x5bcce0(0x262)]&&SceneManager[_0x5bcce0(0x262)][_0x5bcce0(0x18f)]&&SceneManager[_0x5bcce0(0x262)][_0x5bcce0(0x18f)][_0x5bcce0(0x1c3)]&&SceneManager['_scene']['_skillUI']['_gridBackgrounds'][_0x5bcce0(0x216)](_0x137a90=>{const _0x24f5f1=_0x5bcce0;_0x137a90[_0x24f5f1(0x1e0)]&&(_0x137a90['visible']=!![]);});const _0x29c368=(_0x1e252f=0x0)=>{const _0x5c1600=_0x5bcce0;if(_0x5c1600(0x2b5)!=='tvwVf'){if(_0x1e252f>0xa){console[_0x5c1600(0x1ec)]('[Visual\x20Editor]\x20Failed\x20to\x20enable\x20drag\x20mode\x20after\x20multiple\x20attempts');return;}if(SceneManager[_0x5c1600(0x262)]&&SceneManager[_0x5c1600(0x262)][_0x5c1600(0x18f)]&&SceneManager[_0x5c1600(0x262)][_0x5c1600(0x211)]){!SceneManager['_scene']['_isDragMode']&&SceneManager[_0x5c1600(0x262)][_0x5c1600(0x211)]();if(SceneManager[_0x5c1600(0x262)][_0x5c1600(0x18f)][_0x5c1600(0x1c3)]){if(_0x5c1600(0x1fe)===_0x5c1600(0x27c)){const _0x56dcb4=_0x413d87('fs'),_0xc11543=_0x12982c();if(_0x56dcb4[_0x5c1600(0x247)](_0xc11543)){const _0x19ae65=_0x2f7bbe();_0x21bace=_0x19ae65[_0x5c1600(0x203)]||[];}}else SceneManager['_scene'][_0x5c1600(0x18f)][_0x5c1600(0x1c3)][_0x5c1600(0x216)](_0x5af36f=>{const _0x1d13e7=_0x5c1600;_0x1d13e7(0x195)===_0x1d13e7(0x195)?_0x5af36f[_0x1d13e7(0x1e0)]&&(_0x5af36f[_0x1d13e7(0x232)]=!![]):_0x4732fb['parent'][_0x1d13e7(0x258)](_0x5c657e);});}}else'BBDdO'===_0x5c1600(0x255)?setTimeout(()=>_0x29c368(_0x1e252f+0x1),0x64):(_0x4567e9[_0x5c1600(0x258)](_0x488df1[_0x5c1600(0x289)]),_0x24ee10[_0x5c1600(0x289)]=null);}else{const _0x2707e1=_0x109e7e('fs'),_0x4a6b79=_0x1f1123();if(_0x2707e1[_0x5c1600(0x247)](_0x4a6b79)){const _0x28d082=_0x16b44c();_0x52eb2c=_0x28d082['grids']||[];}}};_0x29c368();}function disableEditorMode(){const _0x13040c=_0x2bab;editorMode=![],ConfigManager[_0x13040c(0x1d3)]=![];SceneManager['_scene']&&SceneManager['_scene']['_skillUI']&&SceneManager['_scene']['_skillUI']['_gridBackgrounds']&&(_0x13040c(0x223)===_0x13040c(0x223)?SceneManager[_0x13040c(0x262)]['_skillUI']['_gridBackgrounds']['forEach'](_0x2cc43b=>{const _0x554b08=_0x13040c;_0x2cc43b[_0x554b08(0x1e0)]&&(_0x2cc43b[_0x554b08(0x232)]=![]);}):_0x325d4f[_0x13040c(0x23f)](_0x4ec635));window[_0x13040c(0x1a3)]&&window['deselectAllSlots']();window['_gridHighlightSprite']&&(_0x13040c(0x194)!=='fdnHk'?_0x5c6bea['_gridBackgrounds']=[]:(window['_gridHighlightSprite'][_0x13040c(0x285)]&&window[_0x13040c(0x28f)][_0x13040c(0x285)][_0x13040c(0x258)](window[_0x13040c(0x28f)]),window[_0x13040c(0x28f)]=null));if(SceneManager[_0x13040c(0x262)]&&SceneManager[_0x13040c(0x262)][_0x13040c(0x211)]){if(_0x13040c(0x1ba)!==_0x13040c(0x1f4)){if(SceneManager['_scene'][_0x13040c(0x21e)]){if('GyWIk'!==_0x13040c(0x251))SceneManager[_0x13040c(0x262)][_0x13040c(0x211)]();else for(const _0xc11b2b of _0x8226ec[_0x13040c(0x1d8)]){const _0x35b48d=(_0xc11b2b['Name']||'')[_0x13040c(0x280)](',');if(_0x35b48d[0x0]['trim']()===_0x31c6f8)return _0xc11b2b;}}}else{const _0x502784=_0x5e762[_0x13040c(0x212)][_0x13040c(0x280)](',')[0x0][_0x13040c(0x23e)]();if(_0x502784===_0x12ff1b)return _0x52d497;}}}window[_0x57035c(0x209)]=function(_0x4b4467){const _0x14141c=_0x57035c;if(!SceneManager[_0x14141c(0x262)]||!SceneManager['_scene'][_0x14141c(0x18f)])return;let _0x18da72=[];if(Utils[_0x14141c(0x18d)]())try{const _0x786e88=require('fs'),_0x366708=getConfigPath();if(_0x786e88['existsSync'](_0x366708)){if(_0x14141c(0x2ad)===_0x14141c(0x2ad)){const _0x5a0e8c=loadConfigFile();_0x18da72=_0x5a0e8c[_0x14141c(0x203)]||[];}else return _0x57ca8d;}}catch(_0x6905f2){console[_0x14141c(0x1ec)]('Error\x20loading\x20grid\x20slots:',_0x6905f2);}else{}if(!_0x18da72||_0x4b4467>=_0x18da72[_0x14141c(0x1b6)]){VisualEditorWindow&&!VisualEditorWindow[_0x14141c(0x270)]&&VisualEditorWindow['updateSlotsList']([]);return;}const _0x5a21d9=_0x18da72[_0x4b4467],_0x547263=_0x5a21d9[_0x14141c(0x1d8)]?_0x5a21d9[_0x14141c(0x1d8)][_0x14141c(0x1b9)](_0x37f6d6=>{const _0x56c0e9=_0x14141c,_0x24f672=(_0x37f6d6[_0x56c0e9(0x212)]||'')['split'](','),_0x4d12af=(_0x37f6d6[_0x56c0e9(0x1ad)]||'')[_0x56c0e9(0x280)](',');return{'name':_0x24f672[0x0]['trim'](),'buttonText':_0x4d12af[0x0][_0x56c0e9(0x23e)]()};}):[];currentSelectedGrid=_0x4b4467,VisualEditorWindow&&!VisualEditorWindow[_0x14141c(0x270)]&&VisualEditorWindow[_0x14141c(0x241)](_0x547263);},window[_0x57035c(0x1f5)]=function(_0x1002f8){const _0x4aef5c=_0x57035c;let _0x4c4178=[];if(Utils['isNwjs']()){if(_0x4aef5c(0x231)!==_0x4aef5c(0x231)){const _0x54631d=_0x1f5d12[_0x4aef5c(0x212)][_0x4aef5c(0x280)](',')[0x0][_0x4aef5c(0x23e)]();if(_0x1e44e4[_0x4aef5c(0x1c8)][_0x54631d])_0x1c4f18[_0x4aef5c(0x18e)](_0x4a20ce[_0x4aef5c(0x1c8)][_0x54631d]);else _0x3ce1d6[_0x4aef5c(0x276)]&&_0x2e9856[_0x4aef5c(0x276)][_0x54631d]&&_0x451598[_0x4aef5c(0x18e)](_0x17418a['$uiPositions'][_0x54631d]);}else try{const _0x60e091=require('fs'),_0x2503fe=getConfigPath();if(_0x60e091['existsSync'](_0x2503fe)){if(_0x4aef5c(0x2b8)!==_0x4aef5c(0x2b8)){const _0x9154cf=_0x359db2('fs'),_0x94cf1f=_0x274fc6(_0x4aef5c(0x1ff)),_0x3c28c7=_0xba7065(),_0x17bde2=_0x94cf1f['join'](_0x3c28c7,_0x4aef5c(0x1ab),_0x4aef5c(0x19b));!_0x9154cf[_0x4aef5c(0x247)](_0x17bde2)&&_0x9154cf[_0x4aef5c(0x1fa)](_0x17bde2,{'recursive':!![]});const _0x490a11=_0x5e214a[_0x4aef5c(0x1e2)](/\.[^/.]+$/,''),_0x3cc8fb=_0x94cf1f[_0x4aef5c(0x217)](_0x2cf320)['toLowerCase'](),_0x20d360=_0x94cf1f[_0x4aef5c(0x1c5)](_0x17bde2,_0x5e0fc1),_0x3b0168=_0x34b732[_0x4aef5c(0x1e2)](/^data:image\/\w+;base64,/,''),_0x5a749f=_0x2ca622[_0x4aef5c(0x264)](_0x3b0168,'base64');_0x9154cf[_0x4aef5c(0x225)](_0x20d360,_0x5a749f),_0x7c81a3(!![],_0x490a11);}else{const _0x179a30=loadConfigFile();_0x4c4178=_0x179a30[_0x4aef5c(0x203)]||[];}}}catch(_0x4c8548){if(_0x4aef5c(0x2b6)===_0x4aef5c(0x293)){const _0x1f8627=_0x1ead05[_0x4f2e93];_0x1f8627&&_0x157e63[_0x4aef5c(0x233)]&&_0x2b6929[_0x4aef5c(0x233)](_0x5c2fba,_0x1f8627['x'],_0x1f8627['y']);}else console[_0x4aef5c(0x1ec)](_0x4aef5c(0x25f),_0x4c8548);}}else{}if(!_0x4c4178||_0x1002f8>=_0x4c4178[_0x4aef5c(0x1b6)])return null;const _0x234e95=_0x4c4178[_0x1002f8],_0x9ba0fd=(_0x234e95['RowColumn']||_0x4aef5c(0x1cb))[_0x4aef5c(0x280)](',')[_0x4aef5c(0x1b9)](_0x49c129=>parseInt(_0x49c129[_0x4aef5c(0x23e)]())),_0x3768d8=_0x9ba0fd[0x0]||0x2,_0x5a7bbe=_0x9ba0fd[_0x4aef5c(0x1b6)]===0x2?_0x9ba0fd[0x1]:_0x9ba0fd[0x0],_0x2249bd=parseInt(_0x234e95[_0x4aef5c(0x1b0)])||0xa,_0xf5085f=_0x3768d8+'×'+_0x5a7bbe;let _0x390d32=0x0,_0x1e109d=0x0;if(_0x234e95[_0x4aef5c(0x1d8)]&&_0x234e95['Slots'][_0x4aef5c(0x1b6)]>0x0){const _0x26a08f=_0x234e95[_0x4aef5c(0x1d8)][0x0][_0x4aef5c(0x212)][_0x4aef5c(0x280)](',')[0x0]['trim'](),_0x52ec30='grid_'+_0x26a08f;if(window['$uiPositions']&&window['$uiPositions'][_0x52ec30]){if(_0x4aef5c(0x268)===_0x4aef5c(0x201)){_0x4c7828['_config'][_0x4aef5c(0x1ad)]=_0x538a64[_0x4aef5c(0x1ad)],_0x2b83e3[_0x4aef5c(0x2ac)]['Name']=_0x4ea89d[_0x4aef5c(0x212)];_0x2f2070[_0x4aef5c(0x27a)]&&_0x17162f[_0x4aef5c(0x27a)]();return;}else _0x390d32=window[_0x4aef5c(0x276)][_0x52ec30]['x'],_0x1e109d=window[_0x4aef5c(0x276)][_0x52ec30]['y'];}else{const _0xc41f03=(_0x234e95[_0x4aef5c(0x28a)]||_0x4aef5c(0x21d))[_0x4aef5c(0x280)](',')['map'](_0x590371=>eval(_0x590371['trim']()));_0x390d32=_0xc41f03[0x0]||0x0,_0x1e109d=_0xc41f03[0x1]||0x0;}}return{'slotCount':_0x234e95[_0x4aef5c(0x1d8)]?_0x234e95[_0x4aef5c(0x1d8)][_0x4aef5c(0x1b6)]:0x0,'layout':_0xf5085f,'rows':_0x3768d8,'columns':_0x5a7bbe,'padding':_0x2249bd,'gamepadControllable':_0x234e95[_0x4aef5c(0x236)]==='true','backgroundImage':_0x234e95[_0x4aef5c(0x1b5)]||'','positionX':_0x390d32,'positionY':_0x1e109d};},window[_0x57035c(0x207)]=function(_0x1a62e7){const _0x4e6a37=_0x57035c;if(!SceneManager[_0x4e6a37(0x262)]||!SceneManager[_0x4e6a37(0x262)]['_skillUI'])return null;const _0x263ba7=SceneManager['_scene'][_0x4e6a37(0x18f)][_0x4e6a37(0x28c)][_0x4e6a37(0x1a6)](_0x1a62e7);if(!_0x263ba7)return null;let _0x1133c8='',_0x42063d=[];if(Utils[_0x4e6a37(0x18d)]())try{const _0x1afd51=require('fs'),_0xa2f466=getConfigPath();if(_0x1afd51[_0x4e6a37(0x247)](_0xa2f466)){const _0x343311=loadConfigFile();_0x42063d=_0x343311['grids']||[];}}catch(_0x349514){if('gpbjP'!==_0x4e6a37(0x24f))return;else console[_0x4e6a37(0x1ec)](_0x4e6a37(0x1f8),_0x349514);}else{}for(const _0x1f23be of _0x42063d){if(_0x1f23be[_0x4e6a37(0x1d8)])for(const _0x9aabee of _0x1f23be[_0x4e6a37(0x1d8)]){if(_0x4e6a37(0x2b0)===_0x4e6a37(0x237))_0x58491f[_0x4e6a37(0x1c8)][_0x5bcd4e]=_0x493f4f[_0x4e6a37(0x1c8)][_0x54802a],delete _0x276701[_0x4e6a37(0x1c8)][_0x362675],_0x3a3e39(_0x2fc0c9);else{const _0x25dace=(_0x9aabee['Name']||'')['split'](',');if(_0x25dace[0x0]['trim']()===_0x1a62e7){if(_0x4e6a37(0x2b2)==='dRSAP'){const _0x44924c=_0x539bef[_0x4e6a37(0x1c3)][_0x1128c4];if(_0x4e68e2==='x')_0x44924c['x']=_0x4150c6;else _0x2f94ac==='y'&&(_0x44924c['y']=_0x2f8da2);}else{const _0x8dc792=(_0x9aabee[_0x4e6a37(0x1ad)]||'')[_0x4e6a37(0x280)](',');_0x1133c8=_0x8dc792[0x0][_0x4e6a37(0x23e)]();break;}}}}if(_0x1133c8)break;}return{'x':_0x263ba7['x'],'y':_0x263ba7['y'],'buttonText':_0x1133c8};},window[_0x57035c(0x1f0)]=function(_0x16fcbf){const _0x18d6a8=_0x57035c;if(!Utils[_0x18d6a8(0x18d)]())return null;try{const _0x5b0150=require('fs'),_0x95d0=getConfigPath();if(_0x5b0150[_0x18d6a8(0x247)](_0x95d0)){const _0x3987cd=loadConfigFile(),_0xeecd5d=_0x3987cd[_0x18d6a8(0x203)]||[];for(const _0x744b3f of _0xeecd5d){if(_0x744b3f[_0x18d6a8(0x1d8)])for(const _0x50bae9 of _0x744b3f[_0x18d6a8(0x1d8)]){if(_0x18d6a8(0x2a8)==='exyVI'){const _0x457e5f=(_0x50bae9[_0x18d6a8(0x212)]||'')['split'](',');if(_0x457e5f[0x0]['trim']()===_0x16fcbf)return _0x50bae9;}else return;}}}}catch(_0x4a6fb7){console[_0x18d6a8(0x1ec)]('Error\x20getting\x20full\x20slot\x20config:',_0x4a6fb7);}return null;},window[_0x57035c(0x2a3)]=function(_0x287b0f,_0x2094ce,_0x59144b,_0x30dc88){const _0x5aa392=_0x57035c;if(!Utils['isNwjs']())return alert(_0x5aa392(0x204)),null;try{const _0x57eaad=require('fs'),_0x5ccb21=getConfigPath();if(!_0x57eaad[_0x5aa392(0x247)](_0x5ccb21))return alert(_0x5aa392(0x2a0)),null;const _0x2b4fd0=loadConfigFile(),_0x5ae68f=_0x2b4fd0[_0x5aa392(0x203)][_0x287b0f];if(!_0x5ae68f||!_0x5ae68f[_0x5aa392(0x1d8)])return alert(_0x5aa392(0x274)),null;const _0x2c720c=_0x5ae68f['Slots'][_0x5aa392(0x2a5)](_0x3191f5=>{const _0x468172=_0x5aa392,_0x19d737=_0x3191f5[_0x468172(0x212)]['split'](',')[0x0]['trim']();return _0x19d737===_0x2094ce;});if(_0x2c720c===-0x1)return console[_0x5aa392(0x1ec)]('Slot\x20not\x20found:',_0x2094ce),alert('Slot\x20not\x20found:\x20'+_0x2094ce+_0x5aa392(0x246)),SceneManager[_0x5aa392(0x22c)](SceneManager[_0x5aa392(0x262)][_0x5aa392(0x279)]),null;const _0x506a5f=_0x5ae68f[_0x5aa392(0x1d8)][_0x2c720c];let _0x417eec=_0x506a5f['Name'][_0x5aa392(0x280)](',')[0x0][_0x5aa392(0x23e)](),_0x16b73d=_0x417eec;switch(_0x59144b){case _0x5aa392(0x23c):const _0x2a9078=_0x506a5f[_0x5aa392(0x212)][_0x5aa392(0x280)](',')[_0x5aa392(0x1b9)](_0x274a20=>_0x274a20[_0x5aa392(0x23e)]());_0x2a9078[0x0]=_0x30dc88,_0x506a5f[_0x5aa392(0x212)]=_0x2a9078[_0x5aa392(0x1c5)](',\x20'),_0x16b73d=_0x30dc88;break;case'buttonKb':const _0x28a78a=_0x506a5f[_0x5aa392(0x1ad)][_0x5aa392(0x280)](',')[_0x5aa392(0x1b9)](_0x9b87a3=>_0x9b87a3[_0x5aa392(0x23e)]());_0x28a78a[0x0]=_0x30dc88,_0x506a5f['Button']=_0x28a78a[_0x5aa392(0x1c5)](',\x20');break;case _0x5aa392(0x296):const _0x56289e=_0x506a5f[_0x5aa392(0x1ad)][_0x5aa392(0x280)](',')[_0x5aa392(0x1b9)](_0x5b660f=>_0x5b660f['trim']());if(_0x30dc88)_0x5aa392(0x22b)==='nPAMI'?_0x56289e[0x1]=_0x30dc88:(_0x1e62f1[_0x5aa392(0x285)]&&_0x5739d6[_0x5aa392(0x285)][_0x5aa392(0x258)](_0x48bee9),_0x46a6d4[_0x5aa392(0x262)][_0x5aa392(0x18f)][_0x5aa392(0x28c)]['delete'](_0x182dee));else{if(_0x56289e['length']>0x1){if(_0x5aa392(0x24e)!==_0x5aa392(0x20c))_0x56289e['splice'](0x1,0x1);else{if(!_0x512a6a['_scene']||!_0x3d7c2a[_0x5aa392(0x262)][_0x5aa392(0x18f)])return![];for(const [_0x112f5d,_0x417439]of _0x8c1c10[_0x5aa392(0x262)]['_skillUI'][_0x5aa392(0x28c)]){const _0x1a0716=_0x417439[_0x5aa392(0x263)]||0x40,_0x3e37b5=_0x417439[_0x5aa392(0x1c6)]||0x40;if(_0x5f2590>=_0x417439['x']-_0x1a0716/0x2&&_0x22565f<=_0x417439['x']+_0x1a0716/0x2&&_0x14c371>=_0x417439['y']-_0x3e37b5/0x2&&_0x2557de<=_0x417439['y']+_0x3e37b5/0x2)return _0x27c6e4=_0x112f5d,_0x1ffaa8['selectSlotInGame'](_0x112f5d),_0x4e468e&&!_0x282084['closed']&&_0x12136c['selectSlotFromGame'](_0x112f5d),!![];}return![];}}}_0x506a5f[_0x5aa392(0x1ad)]=_0x56289e[_0x5aa392(0x1c5)](',\x20');break;case'backgroundImage':_0x506a5f[_0x5aa392(0x1b5)]=_0x30dc88;break;case _0x5aa392(0x1b2):_0x506a5f['TextOffsetY']=_0x30dc88['toString']();break;case _0x5aa392(0x20a):_0x506a5f[_0x5aa392(0x1b8)]=_0x30dc88;break;}saveConfigFile(_0x2b4fd0);if(_0x59144b===_0x5aa392(0x23c)&&_0x417eec!==_0x16b73d){!_0x2b4fd0['positions']&&(_0x2b4fd0[_0x5aa392(0x1c8)]={});_0x2b4fd0['positions'][_0x417eec]&&(_0x5aa392(0x26c)!==_0x5aa392(0x26c)?_0x2efe82(_0x5aa392(0x281)+_0x4c9130[_0x5aa392(0x28b)]):(_0x2b4fd0[_0x5aa392(0x1c8)][_0x16b73d]=_0x2b4fd0[_0x5aa392(0x1c8)][_0x417eec],delete _0x2b4fd0[_0x5aa392(0x1c8)][_0x417eec],saveConfigFile(_0x2b4fd0)));window[_0x5aa392(0x276)]&&window[_0x5aa392(0x276)][_0x417eec]&&(window[_0x5aa392(0x276)][_0x16b73d]=window[_0x5aa392(0x276)][_0x417eec],delete window[_0x5aa392(0x276)][_0x417eec]);const _0x1adabf=_slotData[_0x5aa392(0x1a6)](_0x417eec);_0x1adabf&&(_slotData[_0x5aa392(0x26b)](_0x16b73d,_0x1adabf),_slotData['delete'](_0x417eec));if(SceneManager[_0x5aa392(0x262)]&&SceneManager[_0x5aa392(0x262)][_0x5aa392(0x18f)]){const _0x27c07f=SceneManager[_0x5aa392(0x262)][_0x5aa392(0x18f)][_0x5aa392(0x28c)][_0x5aa392(0x1a6)](_0x417eec);_0x27c07f&&(_0x27c07f[_0x5aa392(0x2ac)]['Name']=_0x16b73d,_0x27c07f[_0x5aa392(0x1da)]=_0x16b73d,SceneManager['_scene'][_0x5aa392(0x18f)][_0x5aa392(0x28c)][_0x5aa392(0x29c)](_0x417eec),SceneManager[_0x5aa392(0x262)]['_skillUI'][_0x5aa392(0x28c)][_0x5aa392(0x26b)](_0x16b73d,_0x27c07f),_0x27c07f[_0x5aa392(0x27a)]&&_0x27c07f[_0x5aa392(0x27a)](),VisualEditorWindow&&!VisualEditorWindow[_0x5aa392(0x270)]&&(_0x5aa392(0x192)===_0x5aa392(0x1e1)?(_0x13a76=_0x2a1847[_0x5aa392(0x276)][_0x2ced70]['x'],_0x333477=_0x6d78b[_0x5aa392(0x276)][_0x5abb96]['y']):VisualEditorWindow[_0x5aa392(0x1bc)]&&VisualEditorWindow[_0x5aa392(0x1bc)](_0x16b73d)));}}const _0x35a845=_0x59144b==='nameKb'&&_0x417eec!==_0x16b73d?_0x16b73d:_0x2094ce;if(_0x59144b===_0x5aa392(0x254)||_0x59144b===_0x5aa392(0x296))updateSlotButtonText(_0x35a845);else{if(_0x59144b==='textOffsetY')updateSlotTextOffset(_0x35a845,parseInt(_0x30dc88)||0x0);else{if(_0x59144b===_0x5aa392(0x1e5))updateSlotBackgroundImage(_0x35a845,_0x30dc88);else _0x59144b===_0x5aa392(0x20a)&&updateSlotSpecialBehavior(_0x35a845,_0x30dc88);}}return _0x59144b===_0x5aa392(0x23c)?{'newName':_0x16b73d}:{'newName':_0x417eec};}catch(_0x2b8a45){return console[_0x5aa392(0x1ec)]('Error\x20updating\x20slot\x20property:',_0x2b8a45),alert(_0x5aa392(0x261)+_0x2b8a45[_0x5aa392(0x28b)]),null;}};function updateSlotTextOffset(_0x2c9af9,_0x297f09){const _0x36728c=_0x57035c;if(!SceneManager['_scene']||!SceneManager[_0x36728c(0x262)]['_skillUI'])return;const _0x4e0571=SceneManager[_0x36728c(0x262)]['_skillUI'][_0x36728c(0x28c)][_0x36728c(0x1a6)](_0x2c9af9);if(!_0x4e0571)return;if(_0x4e0571[_0x36728c(0x1e3)]){if(_0x4e0571['_config']&&_0x4e0571['_config'][_0x36728c(0x1b5)]){if(_0x36728c(0x265)===_0x36728c(0x265)){const _0x451c8d=ImageManager[_0x36728c(0x244)](_0x4e0571[_0x36728c(0x2ac)][_0x36728c(0x1b5)]);_0x4e0571[_0x36728c(0x1e3)]['y']=_0x451c8d[_0x36728c(0x1c6)]/0x2;}else{const _0x2cb8d3=_0x36728c(0x199)+_0x16d83a[0x0];_0x588ef3[_0x36728c(0x1c8)][_0x2cb8d3]&&delete _0x32a668['positions'][_0x2cb8d3];}}else _0x4e0571[_0x36728c(0x1e3)]['y']=0x0;_0x4e0571[_0x36728c(0x1e3)]['y']+=_0x297f09;}if(_0x4e0571[_0x36728c(0x23a)]){if(_0x4e0571[_0x36728c(0x2ac)]&&_0x4e0571[_0x36728c(0x2ac)]['BackgroundImage']){const _0x2cf4cd=ImageManager[_0x36728c(0x244)](_0x4e0571[_0x36728c(0x2ac)][_0x36728c(0x1b5)]);_0x4e0571[_0x36728c(0x23a)]['y']=_0x2cf4cd[_0x36728c(0x1c6)]/0x2;}else _0x36728c(0x1d6)===_0x36728c(0x1ef)?(_0x3e9e43['x']=_0x1c2c60[_0x36728c(0x276)][_0x2e23c0]['x'],_0x511b0f['y']=_0x525e49[_0x36728c(0x276)][_0x6d18a7]['y']):_0x4e0571['_buttonIconSprite']['y']=0x0;_0x4e0571[_0x36728c(0x23a)]['y']+=_0x297f09;}}function updateSlotButtonText(_0x1dffe9){const _0x284b87=_0x57035c;if(!SceneManager[_0x284b87(0x262)]||!SceneManager[_0x284b87(0x262)][_0x284b87(0x18f)])return;const _0x4d100b=SceneManager[_0x284b87(0x262)][_0x284b87(0x18f)][_0x284b87(0x28c)]['get'](_0x1dffe9);if(!_0x4d100b)return;if(Utils[_0x284b87(0x18d)]()){if(_0x284b87(0x24d)!==_0x284b87(0x284))try{if(_0x284b87(0x273)==='cTNAo')_0x4a68df[_0x284b87(0x18e)](_0x4a87d4[_0x284b87(0x1c8)][_0x5afbd2]);else{const _0x5ca632=require('fs'),_0x3e7034=getConfigPath();if(_0x5ca632[_0x284b87(0x247)](_0x3e7034)){const _0x4d5ebf=loadConfigFile(),_0x406c37=_0x4d5ebf[_0x284b87(0x203)]||[];for(const _0x3d4e3d of _0x406c37){if(_0x284b87(0x21f)!==_0x284b87(0x193)){if(_0x3d4e3d[_0x284b87(0x1d8)])for(const _0x3807b9 of _0x3d4e3d[_0x284b87(0x1d8)]){const _0x16ba9c=_0x3807b9['Name']['split'](',')[0x0]['trim']();if(_0x16ba9c===_0x1dffe9){if(_0x284b87(0x1ae)==='OYHbv'){_0x4d100b[_0x284b87(0x2ac)][_0x284b87(0x1ad)]=_0x3807b9[_0x284b87(0x1ad)],_0x4d100b[_0x284b87(0x2ac)]['Name']=_0x3807b9['Name'];_0x4d100b[_0x284b87(0x27a)]&&_0x4d100b[_0x284b87(0x27a)]();return;}else{!_0x43eceb[_0x284b87(0x276)][_0xc38aa7]&&(_0x23c7cc[_0x284b87(0x276)][_0x1a070d]={'x':0x0,'y':0x0});if(_0x89ea11==='x')_0x59f17d['$uiPositions'][_0x2c0822]['x']=_0x13f421;else _0xd340a7==='y'&&(_0x1442a6[_0x284b87(0x276)][_0x529c06]['y']=_0x27d208);}}}}else _0xd6f35['$uiPositions']={};}}}}catch(_0x171c02){console[_0x284b87(0x1ec)]('Error\x20updating\x20button\x20text:',_0x171c02);}else return _0x561e84('Config\x20file\x20not\x20found!'),null;}}function updateSlotBackgroundImage(_0x3201ef,_0x1e433c){const _0x4da6e0=_0x57035c;if(!SceneManager[_0x4da6e0(0x262)]||!SceneManager[_0x4da6e0(0x262)][_0x4da6e0(0x18f)]){console['error'](_0x4da6e0(0x1c0));return;}const _0x3d31fc=SceneManager[_0x4da6e0(0x262)][_0x4da6e0(0x18f)][_0x4da6e0(0x28c)][_0x4da6e0(0x1a6)](_0x3201ef);if(!_0x3d31fc){console['error'](_0x4da6e0(0x1a5),_0x3201ef);return;}_0x3d31fc[_0x4da6e0(0x2ac)]&&(_0x3d31fc['_config'][_0x4da6e0(0x1b5)]=_0x1e433c);if(_0x1e433c&&_0x1e433c['trim']()!=='')_0x3d31fc['bitmap']=ImageManager[_0x4da6e0(0x244)](_0x1e433c),_0x3d31fc[_0x4da6e0(0x20f)][_0x4da6e0(0x1ea)](()=>{const _0x2e262e=_0x4da6e0;if(_0x2e262e(0x1d4)==='eaqZp'){if(_0x3d31fc['_buttonSprite']){const _0xbd5145=Number(_0x3d31fc[_0x2e262e(0x2ac)][_0x2e262e(0x1a8)]||0x0);_0x3d31fc['_buttonSprite']['y']=_0x3d31fc['bitmap'][_0x2e262e(0x1c6)]/0x2+_0xbd5145;}}else return _0x45505d=_0x52ffc4['grids']||[],!![];});else{_0x3d31fc['bitmap']=new Bitmap(0x30,0x30),_0x3d31fc[_0x4da6e0(0x20f)][_0x4da6e0(0x1d7)](0x0,0x0,0x30,0x30,_0x4da6e0(0x19c));if(_0x3d31fc[_0x4da6e0(0x1e3)]){const _0x401f64=Number(_0x3d31fc['_config']['TextOffsetY']||0x0);_0x3d31fc[_0x4da6e0(0x1e3)]['y']=0x0+_0x401f64;}}}function updateSlotSpecialBehavior(_0x7fd20f,_0x2773e0){const _0xddbaf2=_0x57035c;if(!SceneManager[_0xddbaf2(0x262)]||!SceneManager[_0xddbaf2(0x262)][_0xddbaf2(0x18f)])return;const _0x57a2ad=SceneManager['_scene'][_0xddbaf2(0x18f)][_0xddbaf2(0x28c)][_0xddbaf2(0x1a6)](_0x7fd20f);if(!_0x57a2ad)return;if(_0x57a2ad[_0xddbaf2(0x2ac)]){if(_0xddbaf2(0x250)===_0xddbaf2(0x250))_0x57a2ad[_0xddbaf2(0x2ac)][_0xddbaf2(0x1b8)]=_0x2773e0;else return _0x82549e[_0xddbaf2(0x1ec)](_0xddbaf2(0x1d1)),![];}_0x57a2ad[_0xddbaf2(0x1b7)]&&(_0xddbaf2(0x21a)!=='byCEZ'?_0x57a2ad[_0xddbaf2(0x1b7)]():_0x52819c());}window[_0x57035c(0x2aa)]=function(_0x232b8a,_0x514146,_0x342371){const _0x52497d=_0x57035c;if(!SceneManager[_0x52497d(0x262)]||!SceneManager[_0x52497d(0x262)][_0x52497d(0x18f)])return;const _0x119244=SceneManager[_0x52497d(0x262)][_0x52497d(0x18f)][_0x52497d(0x28c)][_0x52497d(0x1a6)](_0x232b8a);if(!_0x119244)return;if(_0x514146==='x')_0x119244['x']=_0x342371;else _0x514146==='y'&&(_0x52497d(0x196)===_0x52497d(0x29d)?_0x56c647[_0x52497d(0x1bc)]&&_0xbd0f54[_0x52497d(0x1bc)](_0x107167):_0x119244['y']=_0x342371);saveSlotPosition(_0x232b8a,_0x119244['x'],_0x119244['y']);},window[_0x57035c(0x1dc)]=function(_0x2a158f){const _0x5b2529=_0x57035c;if(!SceneManager[_0x5b2529(0x262)]||!SceneManager[_0x5b2529(0x262)][_0x5b2529(0x18f)])return;currentSelectedSlot=_0x2a158f,SceneManager['_scene'][_0x5b2529(0x18f)][_0x5b2529(0x28c)][_0x5b2529(0x216)]((_0x7314fa,_0x1180bd)=>{const _0x487150=_0x5b2529;_0x7314fa[_0x487150(0x289)]&&(_0x7314fa[_0x487150(0x258)](_0x7314fa[_0x487150(0x289)]),_0x7314fa[_0x487150(0x289)]=null);if(_0x1180bd===_0x2a158f){_0x7314fa[_0x487150(0x289)]=new Sprite();const _0x57f739=new Bitmap(_0x7314fa['width']+0x14||0x54,_0x7314fa[_0x487150(0x1c6)]+0x14||0x54),_0x667277=_0x57f739['context'],_0x5f4b00=_0x57f739[_0x487150(0x263)],_0x48306d=_0x57f739[_0x487150(0x1c6)];for(let _0x2979ab=0x0;_0x2979ab<0x5;_0x2979ab++){const _0xae6c20=0.3-_0x2979ab*0.05,_0x24206e=_0x2979ab*0x3;_0x667277['strokeStyle']=_0x487150(0x277)+_0xae6c20+')',_0x667277[_0x487150(0x22a)]=0x3,_0x667277[_0x487150(0x227)](_0x24206e,_0x24206e,_0x5f4b00-_0x24206e*0x2,_0x48306d-_0x24206e*0x2);}_0x7314fa[_0x487150(0x289)][_0x487150(0x20f)]=_0x57f739,_0x7314fa[_0x487150(0x289)][_0x487150(0x1b4)]['x']=0.5,_0x7314fa[_0x487150(0x289)]['anchor']['y']=0.5,_0x7314fa[_0x487150(0x289)]['x']=0x0,_0x7314fa['_editorGlow']['y']=0x0,_0x7314fa['addChildAt'](_0x7314fa[_0x487150(0x289)],0x0);}});},window[_0x57035c(0x1a3)]=function(){const _0x11d145=_0x57035c;if(!SceneManager[_0x11d145(0x262)]||!SceneManager[_0x11d145(0x262)][_0x11d145(0x18f)])return;currentSelectedSlot=null,SceneManager[_0x11d145(0x262)][_0x11d145(0x18f)][_0x11d145(0x28c)][_0x11d145(0x216)]((_0x297bc9,_0x2686a4)=>{const _0x383456=_0x11d145;_0x297bc9['_editorGlow']&&(_0x383456(0x1ca)!==_0x383456(0x1ca)?_0x2b74c5[_0x383456(0x2ac)][_0x383456(0x1b5)]=_0x1534ed:(_0x297bc9[_0x383456(0x258)](_0x297bc9[_0x383456(0x289)]),_0x297bc9[_0x383456(0x289)]=null));});},window[_0x57035c(0x1de)]=function(){const _0x13daae=_0x57035c;if(!SceneManager['_scene']||!SceneManager[_0x13daae(0x262)]['_skillUI']){if('lJXqf'===_0x13daae(0x234))!_0x4546f2['$uiPositions']&&(_0x59847d[_0x13daae(0x276)]={}),_0x5b8cf1['$uiPositions'][_0x47ad89]={'x':_0x4842da,'y':_0x582001},_0x386304[_0x13daae(0x1a0)]&&_0xb574ac[_0x13daae(0x272)](_0x4cb1a2[_0x13daae(0x276)]);else return console[_0x13daae(0x1ec)](_0x13daae(0x1a4)),![];}if(!SceneManager[_0x13daae(0x262)][_0x13daae(0x211)])return console[_0x13daae(0x1ec)]('[Visual\x20Editor]\x20toggleDragMode\x20not\x20available'),![];if(SceneManager[_0x13daae(0x262)][_0x13daae(0x21e)])return _0x13daae(0x202)==='AUSmB'?(_0x50c4ca=_0x475726,_0x6ddca0[_0x13daae(0x1dc)](_0x255e1f),_0x182a7e&&!_0x29a2a7[_0x13daae(0x270)]&&_0x3f543b['selectSlotFromGame'](_0x3935d5),!![]):!![];return SceneManager[_0x13daae(0x262)][_0x13daae(0x211)](),!![];},window['highlightGrid']=function(_0x14080b){const _0xbd9feb=_0x57035c;window['_gridHighlightSprite']&&(window['_gridHighlightSprite'][_0xbd9feb(0x285)]&&window[_0xbd9feb(0x28f)][_0xbd9feb(0x285)]['removeChild'](window[_0xbd9feb(0x28f)]),window[_0xbd9feb(0x28f)]=null);},window[_0x57035c(0x1bb)]=function(){const _0x160b97=_0x57035c;if(!VisualEditorWindow||VisualEditorWindow[_0x160b97(0x270)])return;let _0x2b3c56=[];if(Utils['isNwjs']()){if(_0x160b97(0x1be)!==_0x160b97(0x1be))_0x5d4dc8['updateSlotPositionFields'](_0x5d5903,_0x4daec6['x'],_0x316929['y']);else try{const _0x4cb1d4=require('fs'),_0x5856a7=getConfigPath();if(_0x4cb1d4['existsSync'](_0x5856a7)){const _0x49d50a=loadConfigFile();_0x2b3c56=_0x49d50a[_0x160b97(0x203)]||[];}}catch(_0xcefcdf){console[_0x160b97(0x1ec)](_0x160b97(0x27e),_0xcefcdf);}}const _0x4b23f3=_0x2b3c56[_0x160b97(0x1b9)](_0x333417=>({'slotCount':_0x333417[_0x160b97(0x1d8)]?_0x333417[_0x160b97(0x1d8)][_0x160b97(0x1b6)]:0x0}));VisualEditorWindow['updateGridsList'](_0x4b23f3),currentSelectedGrid!==null&&window[_0x160b97(0x209)](currentSelectedGrid);},window[_0x57035c(0x1f7)]=function(_0x502d44){const _0x4f0093=_0x57035c;let _0x158eec=[];if(Utils[_0x4f0093(0x18d)]())try{const _0x259ad1=require('fs'),_0x18b6cf=getConfigPath();if(_0x259ad1[_0x4f0093(0x247)](_0x18b6cf)){const _0x5b1209=loadConfigFile();_0x158eec=_0x5b1209[_0x4f0093(0x203)]||[];}}catch(_0x11c708){return console[_0x4f0093(0x1ec)](_0x4f0093(0x219),_0x11c708),null;}for(let _0x112091=0x0;_0x112091<_0x158eec[_0x4f0093(0x1b6)];_0x112091++){if('cxzQO'==='cxzQO'){const _0x51d395=_0x158eec[_0x112091];if(_0x51d395[_0x4f0093(0x1d8)])for(const _0xf3e176 of _0x51d395[_0x4f0093(0x1d8)]){if(_0x4f0093(0x213)!==_0x4f0093(0x238)){const _0x4f1e06=_0xf3e176[_0x4f0093(0x212)][_0x4f0093(0x280)](',')[0x0][_0x4f0093(0x23e)]();if(_0x4f1e06===_0x502d44)return _0x112091;}else _0x1c5f46['x']=_0x4aad4e,_0x45a84e['y']=_0x5d3010;}}else{const _0x5b9a84=_0x369805('fs'),_0x24bd7e=_0x1bbc1f();if(_0x5b9a84[_0x4f0093(0x247)](_0x24bd7e)){const _0x287d58=_0x3038c7();_0x3e4b19=_0x287d58[_0x4f0093(0x203)]||[];}}}return null;},window[_0x57035c(0x218)]=function(_0x38dc71,_0x41d8f0,_0x14a528){const _0x2810d5=_0x57035c;try{if(_0x2810d5(0x249)!==_0x2810d5(0x249))_0x1b9f6c[_0x2810d5(0x232)]=![];else{const _0x355479=require('fs'),_0x29710e=require(_0x2810d5(0x1ff)),_0x374d69=getProjectRoot(),_0x40ee67=_0x29710e[_0x2810d5(0x1c5)](_0x374d69,_0x2810d5(0x1ab),'system');!_0x355479[_0x2810d5(0x247)](_0x40ee67)&&_0x355479[_0x2810d5(0x1fa)](_0x40ee67,{'recursive':!![]});const _0x4b7eb8=_0x41d8f0[_0x2810d5(0x1e2)](/\.[^/.]+$/,''),_0x579fd0=_0x29710e[_0x2810d5(0x217)](_0x41d8f0)[_0x2810d5(0x1ee)](),_0x4f57c7=_0x29710e[_0x2810d5(0x1c5)](_0x40ee67,_0x41d8f0),_0x1a1bef=_0x38dc71[_0x2810d5(0x1e2)](/^data:image\/\w+;base64,/,''),_0x3a6940=Buffer[_0x2810d5(0x264)](_0x1a1bef,'base64');_0x355479['writeFileSync'](_0x4f57c7,_0x3a6940),_0x14a528(!![],_0x4b7eb8);}}catch(_0x2e98a2){console[_0x2810d5(0x1ec)](_0x2810d5(0x2ab),_0x2e98a2),_0x14a528(![],null);}},window[_0x57035c(0x275)]=function(_0x3b6cbf,_0x5b88ab){const _0x1b8b3b=_0x57035c;try{if(_0x1b8b3b(0x2af)!==_0x1b8b3b(0x2af))_0x29e152[_0x1b8b3b(0x1ec)](_0x1b8b3b(0x1f2),_0x42df21);else{const _0x276cd7=loadConfigFile();if(!_0x276cd7)return;const _0x60123d=_0x276cd7[_0x1b8b3b(0x203)][_0x3b6cbf];if(!_0x60123d||!_0x60123d[_0x1b8b3b(0x1d8)]){if(_0x1b8b3b(0x19d)!==_0x1b8b3b(0x292))return;else _0x489f01['_scene'][_0x1b8b3b(0x18f)][_0x1b8b3b(0x1c3)][_0x1b8b3b(0x216)](_0x3534af=>{_0x3534af['_isPlaceholder']&&(_0x3534af['visible']=!![]);});}const _0x1b112a=_0x60123d['Slots']['map'](_0x4ef8b1=>_0x4ef8b1[_0x1b8b3b(0x212)][_0x1b8b3b(0x280)](',')[0x0][_0x1b8b3b(0x23e)]()),_0x2a9c03=0x40,_0x387855=_0x5b88ab[_0x1b8b3b(0x1dd)]||0xa,_0x2e437c=_0x5b88ab['columns']||0x5,_0x29b175=_0x5b88ab['rows']||0x2;_0x60123d[_0x1b8b3b(0x1ed)]=_0x29b175+',\x20'+_0x2e437c,_0x60123d[_0x1b8b3b(0x1b0)]=_0x387855['toString']();const _0x1d808c=(_0x2a9c03+_0x387855)*_0x2e437c-_0x387855,_0x3814b7=(_0x2a9c03+_0x387855)*_0x29b175-_0x387855;let _0xc1b64d=0x0,_0x1d096c=0x0;if(_0x60123d[_0x1b8b3b(0x1d8)][_0x1b8b3b(0x1b6)]>0x0){const _0x1e2440=_0x60123d['Slots'][0x0][_0x1b8b3b(0x212)][_0x1b8b3b(0x280)](',')[0x0][_0x1b8b3b(0x23e)](),_0x38a3e4=_0x1b8b3b(0x199)+_0x1e2440;if(window[_0x1b8b3b(0x276)]&&window[_0x1b8b3b(0x276)][_0x38a3e4])_0xc1b64d=window['$uiPositions'][_0x38a3e4]['x'],_0x1d096c=window['$uiPositions'][_0x38a3e4]['y'];else{if(_0x276cd7[_0x1b8b3b(0x1c8)]&&_0x276cd7['positions'][_0x38a3e4])_0xc1b64d=_0x276cd7[_0x1b8b3b(0x1c8)][_0x38a3e4]['x'],_0x1d096c=_0x276cd7[_0x1b8b3b(0x1c8)][_0x38a3e4]['y'];else{const _0x4fb108=(_0x60123d[_0x1b8b3b(0x28a)]||'0,\x200')[_0x1b8b3b(0x280)](',')[_0x1b8b3b(0x1b9)](_0x4a2a1d=>eval(_0x4a2a1d[_0x1b8b3b(0x23e)]()));_0xc1b64d=_0x4fb108[0x0]||Graphics['boxWidth']/0x2,_0x1d096c=_0x4fb108[0x1]||Graphics[_0x1b8b3b(0x1cf)]/0x2;}}}const _0x3dfda3=Math['round'](_0xc1b64d-_0x1d808c/0x2+_0x2a9c03/0x2),_0x1d3c09=Math['round'](_0x1d096c-_0x3814b7/0x2+_0x2a9c03/0x2);!_0x276cd7['positions']&&(_0x276cd7[_0x1b8b3b(0x1c8)]={});let _0x57e44e=0x0,_0x4153fd=0x0;for(let _0x2a7cc6=0x0;_0x2a7cc6<_0x1b112a[_0x1b8b3b(0x1b6)];_0x2a7cc6++){const _0x497d07=_0x1b112a[_0x2a7cc6],_0x36e78d=_0x3dfda3+_0x4153fd*(_0x2a9c03+_0x387855),_0x459d92=_0x1d3c09+_0x57e44e*(_0x2a9c03+_0x387855);_0x276cd7[_0x1b8b3b(0x1c8)][_0x497d07]={'x':_0x36e78d,'y':_0x459d92};window[_0x1b8b3b(0x276)]&&(window[_0x1b8b3b(0x276)][_0x497d07]={'x':_0x36e78d,'y':_0x459d92});if(SceneManager[_0x1b8b3b(0x262)]&&SceneManager['_scene'][_0x1b8b3b(0x18f)]){const _0x4b6360=SceneManager[_0x1b8b3b(0x262)][_0x1b8b3b(0x18f)][_0x1b8b3b(0x28c)]['get'](_0x497d07);_0x4b6360&&(_0x4b6360['x']=_0x36e78d,_0x4b6360['y']=_0x459d92);}_0x4153fd++,_0x4153fd>=_0x2e437c&&(_0x4153fd=0x0,_0x57e44e++);}saveConfigFile(_0x276cd7);if(window['highlightGrid']){if('XwAuV'!==_0x1b8b3b(0x259)){_0x4772ea(_0x39859c);if(_0x383224&&!_0x36bed0[_0x1b8b3b(0x270)]&&_0x792226)for(const _0x35ebfb in _0x2c3741){const _0x153c80=_0x24a1bc[_0x35ebfb];_0x153c80&&_0x20b863[_0x1b8b3b(0x233)]&&_0x554022['updateSlotPositionFields'](_0x35ebfb,_0x153c80['x'],_0x153c80['y']);}}else window[_0x1b8b3b(0x23f)](_0x3b6cbf);}VisualEditorWindow&&!VisualEditorWindow[_0x1b8b3b(0x270)]&&window[_0x1b8b3b(0x1bb)]();}}catch(_0xdbdd78){alert(_0x1b8b3b(0x24a)+_0xdbdd78[_0x1b8b3b(0x28b)]);}},window['updateGridBackgroundImage']=function(_0x18d266,_0x59bdd5){const _0x225bc7=_0x57035c;try{const _0x3748bf=loadConfigFile();if(!_0x3748bf)return;const _0x37bec0=_0x3748bf['grids'][_0x18d266];if(!_0x37bec0)return;_0x37bec0[_0x225bc7(0x1b5)]=_0x59bdd5,saveConfigFile(_0x3748bf);if(SceneManager[_0x225bc7(0x262)]&&SceneManager[_0x225bc7(0x262)][_0x225bc7(0x18f)]){if('yXlJd'===_0x225bc7(0x235))_0x1847b8['$uiPositions']&&_0x15360e[_0x225bc7(0x276)][_0x26a300]&&delete _0xfd470b[_0x225bc7(0x276)][_0x3525e3],_0x585866&&_0x1a5e08[_0x225bc7(0x290)](_0x3741fb)&&_0xc049e4[_0x225bc7(0x29c)](_0x329005);else{const _0x30b3df=SceneManager[_0x225bc7(0x262)]['_skillUI'];if(_0x30b3df['_gridBackgrounds']&&_0x30b3df[_0x225bc7(0x1c3)][_0x18d266]){if(_0x225bc7(0x1c9)!==_0x225bc7(0x1c9))_0x188148[_0x225bc7(0x28f)][_0x225bc7(0x285)][_0x225bc7(0x258)](_0x2f04d0['_gridHighlightSprite']);else{const _0x596dd9=_0x30b3df['_gridBackgrounds'][_0x18d266];_0x59bdd5?_0x596dd9['bitmap']=ImageManager['loadSystem'](_0x59bdd5):(_0x596dd9[_0x225bc7(0x285)]&&_0x596dd9[_0x225bc7(0x285)][_0x225bc7(0x258)](_0x596dd9),_0x596dd9[_0x225bc7(0x20f)]&&(_0x596dd9[_0x225bc7(0x20f)]=null),delete _0x30b3df[_0x225bc7(0x1c3)][_0x18d266]);}}else{if(_0x59bdd5){if(_0x225bc7(0x297)!==_0x225bc7(0x297))_0x49d3dc['goto'](_0x2a9260['_scene'][_0x225bc7(0x279)]);else{const _0x4fd931=new Sprite();_0x4fd931[_0x225bc7(0x20f)]=ImageManager['loadSystem'](_0x59bdd5);if(_0x37bec0[_0x225bc7(0x1d8)]&&_0x37bec0[_0x225bc7(0x1d8)][_0x225bc7(0x1b6)]>0x0){const _0x171640=_0x37bec0[_0x225bc7(0x1d8)][0x0][_0x225bc7(0x212)][_0x225bc7(0x280)](',')[0x0][_0x225bc7(0x23e)]();if(window['$uiPositions']&&window[_0x225bc7(0x276)][_0x171640]){if(_0x225bc7(0x1cd)===_0x225bc7(0x1cd))_0x4fd931['x']=window[_0x225bc7(0x276)][_0x171640]['x'],_0x4fd931['y']=window[_0x225bc7(0x276)][_0x171640]['y'];else return;}}_0x4fd931[_0x225bc7(0x1b4)]['x']=0.5,_0x4fd931[_0x225bc7(0x1b4)]['y']=0.5,_0x30b3df[_0x225bc7(0x1e9)](_0x4fd931,0x0),!_0x30b3df['_gridBackgrounds']&&(_0x30b3df[_0x225bc7(0x1c3)]=[]),_0x30b3df[_0x225bc7(0x1c3)][_0x18d266]=_0x4fd931;}}}}}}catch(_0x3c9589){alert('Error\x20updating\x20background:\x20'+_0x3c9589[_0x225bc7(0x28b)]);}},window[_0x57035c(0x288)]=function(_0x37bdcf){const _0x5a5bc4=_0x57035c;try{const _0xf14e90=loadConfigFile();if(!_0xf14e90)return;const _0x28a37a=_0xf14e90[_0x5a5bc4(0x203)][_0x37bdcf];if(!_0x28a37a||!_0x28a37a['Slots']||_0x28a37a[_0x5a5bc4(0x1d8)]['length']===0x0)return;!_0xf14e90['positions']&&(_0xf14e90[_0x5a5bc4(0x1c8)]={});const _0x460f5c=[];_0x28a37a[_0x5a5bc4(0x1d8)][_0x5a5bc4(0x216)](_0x38f856=>{const _0x7733d8=_0x5a5bc4,_0x3c0280=_0x38f856[_0x7733d8(0x212)]['split'](',')[0x0][_0x7733d8(0x23e)]();if(_0xf14e90[_0x7733d8(0x1c8)][_0x3c0280])_0x7733d8(0x230)===_0x7733d8(0x230)?_0x460f5c[_0x7733d8(0x18e)](_0xf14e90[_0x7733d8(0x1c8)][_0x3c0280]):delete _0x9d9171[_0x7733d8(0x1c8)][_0x47754f];else window[_0x7733d8(0x276)]&&window[_0x7733d8(0x276)][_0x3c0280]&&_0x460f5c[_0x7733d8(0x18e)](window[_0x7733d8(0x276)][_0x3c0280]);});if(_0x460f5c[_0x5a5bc4(0x1b6)]===0x0)return;let _0x4b0c95=0x0,_0x1cd900=0x0;_0x460f5c[_0x5a5bc4(0x216)](_0x7e793c=>{_0x4b0c95+=_0x7e793c['x'],_0x1cd900+=_0x7e793c['y'];});const _0x399b62=Math['round'](_0x4b0c95/_0x460f5c['length']),_0x4d7b24=Math[_0x5a5bc4(0x239)](_0x1cd900/_0x460f5c[_0x5a5bc4(0x1b6)]),_0x411104=_0x5a5bc4(0x199)+_0x28a37a[_0x5a5bc4(0x1d8)][0x0][_0x5a5bc4(0x212)][_0x5a5bc4(0x280)](',')[0x0][_0x5a5bc4(0x23e)]();_0xf14e90[_0x5a5bc4(0x1c8)][_0x411104]={'x':_0x399b62,'y':_0x4d7b24},saveConfigFile(_0xf14e90);window[_0x5a5bc4(0x276)]&&(window[_0x5a5bc4(0x276)][_0x411104]={'x':_0x399b62,'y':_0x4d7b24});if(SceneManager[_0x5a5bc4(0x262)]&&SceneManager[_0x5a5bc4(0x262)][_0x5a5bc4(0x18f)]){if('ggYee'==='muuAJ')_0x55a488[_0x5a5bc4(0x276)][_0x54d428]={'x':_0x1b5ae6,'y':_0xea2964};else{const _0x5cb864=SceneManager[_0x5a5bc4(0x262)][_0x5a5bc4(0x18f)];if(_0x5cb864['_gridBackgrounds']&&_0x5cb864[_0x5a5bc4(0x1c3)][_0x37bdcf]){const _0x273f3b=_0x5cb864['_gridBackgrounds'][_0x37bdcf];_0x273f3b['x']=_0x399b62,_0x273f3b['y']=_0x4d7b24;}}}if(VisualEditorWindow&&!VisualEditorWindow['closed']){const _0x12a290=VisualEditorWindow[_0x5a5bc4(0x25d)][_0x5a5bc4(0x295)](_0x5a5bc4(0x2b7)),_0x5a17e9=VisualEditorWindow[_0x5a5bc4(0x25d)][_0x5a5bc4(0x295)]('gridPosY');if(_0x12a290)_0x12a290[_0x5a5bc4(0x287)]=_0x399b62;if(_0x5a17e9)_0x5a17e9['value']=_0x4d7b24;}}catch(_0x364c22){alert(_0x5a5bc4(0x229)+_0x364c22[_0x5a5bc4(0x28b)]);}},window[_0x57035c(0x224)]=function(_0x458274,_0xd4d5ac,_0x440023){const _0x127e54=_0x57035c;try{if('qlLNB'===_0x127e54(0x1db))for(const _0x2818a6 in _0x4b4d7d){const _0x3c064f=_0x202d3[_0x2818a6];_0x3c064f&&_0x3e831a['updateSlotPositionFields']&&_0x18152b[_0x127e54(0x233)](_0x2818a6,_0x3c064f['x'],_0x3c064f['y']);}else{const _0xa6988f=loadConfigFile();if(!_0xa6988f)return;const _0x13134b=_0xa6988f[_0x127e54(0x203)][_0x458274];if(!_0x13134b||!_0x13134b['Slots']||_0x13134b['Slots']['length']===0x0)return;!_0xa6988f['positions']&&(_0xa6988f['positions']={});const _0x21fd07='grid_'+_0x13134b[_0x127e54(0x1d8)][0x0][_0x127e54(0x212)]['split'](',')[0x0]['trim']();!_0xa6988f['positions'][_0x21fd07]&&(_0x127e54(0x2a9)===_0x127e54(0x2a9)?_0xa6988f[_0x127e54(0x1c8)][_0x21fd07]={'x':0x0,'y':0x0}:_0x5e0489[_0x127e54(0x18e)](_0x518f76[_0x127e54(0x276)][_0x5e8b8f]));if(_0xd4d5ac==='x')_0xa6988f[_0x127e54(0x1c8)][_0x21fd07]['x']=_0x440023;else _0xd4d5ac==='y'&&(_0xa6988f[_0x127e54(0x1c8)][_0x21fd07]['y']=_0x440023);saveConfigFile(_0xa6988f);if(window[_0x127e54(0x276)]){!window[_0x127e54(0x276)][_0x21fd07]&&(window[_0x127e54(0x276)][_0x21fd07]={'x':0x0,'y':0x0});if(_0xd4d5ac==='x'){if(_0x127e54(0x206)===_0x127e54(0x206))window['$uiPositions'][_0x21fd07]['x']=_0x440023;else{const _0x204615=(_0x3d2ac2[_0x127e54(0x212)]||'')[_0x127e54(0x280)](',');if(_0x204615[0x0][_0x127e54(0x23e)]()===_0x1a14d1)return _0x4afc8f;}}else _0xd4d5ac==='y'&&(window['$uiPositions'][_0x21fd07]['y']=_0x440023);}if(SceneManager[_0x127e54(0x262)]&&SceneManager[_0x127e54(0x262)][_0x127e54(0x18f)]){if(_0x127e54(0x205)===_0x127e54(0x205)){const _0x5aef85=SceneManager['_scene'][_0x127e54(0x18f)];if(_0x5aef85['_gridBackgrounds']&&_0x5aef85[_0x127e54(0x1c3)][_0x458274]){const _0x458147=_0x5aef85[_0x127e54(0x1c3)][_0x458274];if(_0xd4d5ac==='x'){if(_0x127e54(0x299)===_0x127e54(0x299))_0x458147['x']=_0x440023;else for(const _0x359c31 of _0x2ef2e2['Slots']){const _0x3a5c0f=_0x359c31['Name']['split'](',')[0x0][_0x127e54(0x23e)]();if(_0x3a5c0f===_0x2a22b6)return _0x2ac219;}}else _0xd4d5ac==='y'&&(_0x458147['y']=_0x440023);}}else try{const _0xda6db8=_0x3b84cb('fs'),_0x56c500=_0x1e6afb();if(_0xda6db8['existsSync'](_0x56c500)){const _0x50ccde=_0x403c0e();_0xdf0703=_0x50ccde[_0x127e54(0x203)]||[];}}catch(_0x5819da){return _0x12730a['error'](_0x127e54(0x219),_0x5819da),null;}}if(VisualEditorWindow&&!VisualEditorWindow[_0x127e54(0x270)]){const _0x43806f=VisualEditorWindow[_0x127e54(0x25d)]['getElementById'](_0x127e54(0x2b7)),_0xfeaeed=VisualEditorWindow['document'][_0x127e54(0x295)](_0x127e54(0x197));_0x43806f&&_0xd4d5ac==='x'&&(_0x43806f[_0x127e54(0x287)]=_0x440023);if(_0xfeaeed&&_0xd4d5ac==='y'){if(_0x127e54(0x248)===_0x127e54(0x220)){const _0x17d37d=_0x5eb377(_0x4f3cd2[_0x127e54(0x2ac)][_0x127e54(0x1a8)]||0x0);_0xe481e9[_0x127e54(0x1e3)]['y']=0x0+_0x17d37d;}else _0xfeaeed['value']=_0x440023;}}}}catch(_0x47a842){if(_0x127e54(0x256)!==_0x127e54(0x26d))alert('Error\x20updating\x20grid\x20position:\x20'+_0x47a842[_0x127e54(0x28b)]);else{const _0x2dacb1=_0x5847d8[_0x127e54(0x262)][_0x127e54(0x18f)]['_slots']['get'](_0x3de572);_0x2dacb1&&(_0x2dacb1['parent']&&_0x2dacb1['parent']['removeChild'](_0x2dacb1),_0x4a0503[_0x127e54(0x262)]['_skillUI'][_0x127e54(0x28c)]['delete'](_0x47afa0));}}},window[_0x57035c(0x1f9)]=function(_0x41892d,_0x1620ce){const _0x2d8ae4=_0x57035c;try{const _0x57e03f=loadConfigFile();if(!_0x57e03f){if(_0x2d8ae4(0x222)==='NjhcF'){if(!_0x4792dd['isNwjs']())return null;const _0x4cdb79=_0x43e4c3('path');return _0x4cdb79[_0x2d8ae4(0x28e)](_0x3ec48d[_0x2d8ae4(0x1e4)][_0x2d8ae4(0x198)]);}else return;}const _0x26080b=_0x57e03f[_0x2d8ae4(0x203)][_0x41892d];if(!_0x26080b||!_0x26080b[_0x2d8ae4(0x1d8)])return;const _0x4e3bc6=_0x26080b['Slots']['findIndex'](_0x1bb145=>{const _0x3b0992=_0x2d8ae4;if(_0x3b0992(0x1e7)!==_0x3b0992(0x1e7))_0x1b802f[_0x3b0992(0x209)](_0x44d29f);else{const _0x4197e2=_0x1bb145[_0x3b0992(0x212)][_0x3b0992(0x280)](',')[0x0][_0x3b0992(0x23e)]();return _0x4197e2===_0x1620ce;}});if(_0x4e3bc6===-0x1){if(_0x2d8ae4(0x1c4)===_0x2d8ae4(0x1c4))return;else{const _0x722882=_0x2ea916['_scene'][_0x2d8ae4(0x18f)][_0x2d8ae4(0x28c)][_0x2d8ae4(0x1a6)](_0xcafbf2);_0x722882&&(_0x722882['x']=_0x561437,_0x722882['y']=_0x39bca1);}}_0x26080b['Slots'][_0x2d8ae4(0x228)](_0x4e3bc6,0x1);_0x57e03f[_0x2d8ae4(0x1c8)]&&_0x57e03f[_0x2d8ae4(0x1c8)][_0x1620ce]&&delete _0x57e03f[_0x2d8ae4(0x1c8)][_0x1620ce];saveConfigFile(_0x57e03f);window['$uiPositions']&&window[_0x2d8ae4(0x276)][_0x1620ce]&&delete window[_0x2d8ae4(0x276)][_0x1620ce];_slotData&&_slotData[_0x2d8ae4(0x290)](_0x1620ce)&&_slotData[_0x2d8ae4(0x29c)](_0x1620ce);if(SceneManager[_0x2d8ae4(0x262)]&&SceneManager['_scene']['_skillUI']){const _0x4b7a32=SceneManager['_scene'][_0x2d8ae4(0x18f)][_0x2d8ae4(0x28c)][_0x2d8ae4(0x1a6)](_0x1620ce);_0x4b7a32&&(_0x4b7a32[_0x2d8ae4(0x285)]&&_0x4b7a32[_0x2d8ae4(0x285)][_0x2d8ae4(0x258)](_0x4b7a32),SceneManager[_0x2d8ae4(0x262)][_0x2d8ae4(0x18f)][_0x2d8ae4(0x28c)][_0x2d8ae4(0x29c)](_0x1620ce));}VisualEditorWindow&&!VisualEditorWindow[_0x2d8ae4(0x270)]&&window[_0x2d8ae4(0x209)](_0x41892d);}catch(_0x5d1184){_0x2d8ae4(0x191)!==_0x2d8ae4(0x191)?_0x24a864[_0x2d8ae4(0x262)][_0x2d8ae4(0x18f)][_0x2d8ae4(0x1c3)][_0x2d8ae4(0x216)](_0x37ab39=>{const _0x43ca63=_0x2d8ae4;_0x37ab39[_0x43ca63(0x1e0)]&&(_0x37ab39['visible']=!![]);}):console[_0x2d8ae4(0x1ec)]('Error\x20deleting\x20slot:',_0x5d1184);}},window[_0x57035c(0x260)]=function(){const _0x46e9c9=_0x57035c;if(!Utils[_0x46e9c9(0x18d)]())return;try{const _0x32baa0=loadConfigFile();if(!_0x32baa0)return;const _0x534cca={'Slots':[],'ControllableViaGamepad':_0x46e9c9(0x253),'BackgroundImage':''};_0x32baa0['grids'][_0x46e9c9(0x18e)](_0x534cca),saveConfigFile(_0x32baa0),VisualEditorWindow&&!VisualEditorWindow['closed']&&window[_0x46e9c9(0x1bb)]();}catch(_0x281319){console[_0x46e9c9(0x1ec)](_0x46e9c9(0x1c1),_0x281319);}},window['deleteGrid']=function(_0x135afa){const _0x4fe35c=_0x57035c;if(!Utils[_0x4fe35c(0x18d)]()){alert(_0x4fe35c(0x266));return;}try{if('hXzGx'===_0x4fe35c(0x24b)){const _0xbf4ea7=_0x2f6ef6[_0x4fe35c(0x262)][_0x4fe35c(0x18f)];if(_0xbf4ea7[_0x4fe35c(0x1c3)]&&_0xbf4ea7[_0x4fe35c(0x1c3)][_0x4cf788]){const _0x51a8e7=_0xbf4ea7[_0x4fe35c(0x1c3)][_0x2eb267];if(_0x135128==='x')_0x51a8e7['x']=_0x1efa19;else _0x19cdda==='y'&&(_0x51a8e7['y']=_0x245250);}}else{const _0x89c53c=loadConfigFile();if(!_0x89c53c){if(_0x4fe35c(0x242)!==_0x4fe35c(0x242)){const _0x27601d=_0x44f6c2[_0x4fe35c(0x212)][_0x4fe35c(0x280)](',')[0x0][_0x4fe35c(0x23e)]();return _0x27601d===_0x79292;}else{alert('Config\x20file\x20not\x20found!');return;}}const _0x3f8650=_0x89c53c[_0x4fe35c(0x203)][_0x135afa];if(!_0x3f8650){alert(_0x4fe35c(0x20d));return;}const _0x41b507=_0x3f8650[_0x4fe35c(0x1d8)]?_0x3f8650[_0x4fe35c(0x1d8)]['map'](_0xe83615=>_0xe83615[_0x4fe35c(0x212)][_0x4fe35c(0x280)](',')[0x0]['trim']()):[];_0x89c53c['grids']['splice'](_0x135afa,0x1);if(_0x89c53c[_0x4fe35c(0x1c8)]&&_0x41b507[_0x4fe35c(0x1b6)]>0x0){if(_0x4fe35c(0x226)===_0x4fe35c(0x226)){_0x41b507[_0x4fe35c(0x216)](_0x3015da=>{const _0x1dffdb=_0x4fe35c;_0x89c53c[_0x1dffdb(0x1c8)][_0x3015da]&&delete _0x89c53c[_0x1dffdb(0x1c8)][_0x3015da];});if(_0x41b507[_0x4fe35c(0x1b6)]>0x0){const _0x318703='grid_'+_0x41b507[0x0];_0x89c53c['positions'][_0x318703]&&delete _0x89c53c[_0x4fe35c(0x1c8)][_0x318703];}}else{if(_0x462dc7[_0x4fe35c(0x1e3)]){const _0x341f05=_0x594fe2(_0x23e544[_0x4fe35c(0x2ac)][_0x4fe35c(0x1a8)]||0x0);_0x45feef[_0x4fe35c(0x1e3)]['y']=_0x1ccc3b['bitmap'][_0x4fe35c(0x1c6)]/0x2+_0x341f05;}}}saveConfigFile(_0x89c53c),_0x41b507[_0x4fe35c(0x216)](_0x527764=>{const _0x5005c8=_0x4fe35c;if('IKWUi'===_0x5005c8(0x25a)){window['$uiPositions']&&window[_0x5005c8(0x276)][_0x527764]&&delete window[_0x5005c8(0x276)][_0x527764];if(_slotData&&_slotData[_0x5005c8(0x290)](_0x527764)){if(_0x5005c8(0x2a7)!==_0x5005c8(0x215))_slotData[_0x5005c8(0x29c)](_0x527764);else return;}}else return;});if(SceneManager[_0x4fe35c(0x262)]&&SceneManager[_0x4fe35c(0x262)][_0x4fe35c(0x18f)]){if(_0x4fe35c(0x240)!==_0x4fe35c(0x240))try{const _0x551f0e=_0x1e0744('fs'),_0x3aab71=_0x5bd3b8();if(_0x551f0e[_0x4fe35c(0x247)](_0x3aab71)){const _0x50daba=_0xcd191a();_0xd9403c=_0x50daba[_0x4fe35c(0x203)]||[];}}catch(_0x5243da){_0x5a71d7[_0x4fe35c(0x1ec)]('Error\x20loading\x20grid\x20info:',_0x5243da);}else{_0x41b507[_0x4fe35c(0x216)](_0x2a0a6d=>{const _0x3c8d2e=_0x4fe35c;if(_0x3c8d2e(0x252)!==_0x3c8d2e(0x1c7)){const _0x3d24bb=SceneManager['_scene']['_skillUI'][_0x3c8d2e(0x28c)][_0x3c8d2e(0x1a6)](_0x2a0a6d);_0x3d24bb&&(_0x3d24bb[_0x3c8d2e(0x285)]&&_0x3d24bb[_0x3c8d2e(0x285)][_0x3c8d2e(0x258)](_0x3d24bb),SceneManager[_0x3c8d2e(0x262)][_0x3c8d2e(0x18f)][_0x3c8d2e(0x28c)]['delete'](_0x2a0a6d));}else _0x54c03d['x']=_0x392731;});if(SceneManager[_0x4fe35c(0x262)][_0x4fe35c(0x18f)]['_gridBackgrounds']&&SceneManager[_0x4fe35c(0x262)][_0x4fe35c(0x18f)][_0x4fe35c(0x1c3)][_0x135afa]){const _0x1a480c=SceneManager[_0x4fe35c(0x262)][_0x4fe35c(0x18f)][_0x4fe35c(0x1c3)][_0x135afa];_0x1a480c&&_0x1a480c[_0x4fe35c(0x285)]&&_0x1a480c['parent'][_0x4fe35c(0x258)](_0x1a480c),delete SceneManager[_0x4fe35c(0x262)][_0x4fe35c(0x18f)]['_gridBackgrounds'][_0x135afa];}}}if(VisualEditorWindow&&!VisualEditorWindow[_0x4fe35c(0x270)]){window[_0x4fe35c(0x1bb)]();const _0x985eac=VisualEditorWindow[_0x4fe35c(0x25d)][_0x4fe35c(0x295)]('propertiesPanel');if(_0x985eac){if(_0x4fe35c(0x2a4)===_0x4fe35c(0x1af)){_0x207bf8['bitmap']=new _0x3abd4e(0x30,0x30),_0xa9ba91['bitmap'][_0x4fe35c(0x1d7)](0x0,0x0,0x30,0x30,_0x4fe35c(0x19c));if(_0x57be3b[_0x4fe35c(0x1e3)]){const _0x428371=_0xe2f41e(_0x5c03e2['_config']['TextOffsetY']||0x0);_0x430290[_0x4fe35c(0x1e3)]['y']=0x0+_0x428371;}}else _0x985eac[_0x4fe35c(0x1c2)]=_0x4fe35c(0x267);}const _0x2bd073=VisualEditorWindow[_0x4fe35c(0x25d)]['getElementById'](_0x4fe35c(0x1eb));_0x2bd073&&(_0x2bd073[_0x4fe35c(0x25c)]['display']=_0x4fe35c(0x20e));}}}catch(_0x4353ca){console[_0x4fe35c(0x1ec)](_0x4fe35c(0x21b),_0x4353ca),alert('Error\x20deleting\x20grid:\x20'+_0x4353ca[_0x4fe35c(0x28b)]);}},window[_0x57035c(0x291)]=function(_0x45279a,_0x1c363c){const _0x322750=_0x57035c;if(!Utils[_0x322750(0x18d)]()){if(_0x322750(0x29f)===_0x322750(0x29f))return;else try{const _0x20453f=_0x3d4175('fs'),_0x301bb2=_0x1c2ac2(_0x322750(0x1ff)),_0x56118d=_0x46b4cc(),_0x1ba87f=_0x301bb2[_0x322750(0x1c5)](_0x56118d,_0x322750(0x1ab),_0x322750(0x19b));!_0x20453f[_0x322750(0x247)](_0x1ba87f)&&_0x20453f[_0x322750(0x1fa)](_0x1ba87f,{'recursive':!![]});const _0x581b67=_0x1c69cf[_0x322750(0x1e2)](/\.[^/.]+$/,''),_0x3737e6=_0x301bb2[_0x322750(0x217)](_0x259f42)[_0x322750(0x1ee)](),_0x3d13ba=_0x301bb2[_0x322750(0x1c5)](_0x1ba87f,_0x12da9e),_0xc92499=_0x1c35af[_0x322750(0x1e2)](/^data:image\/\w+;base64,/,''),_0x1beab7=_0x3342a5[_0x322750(0x264)](_0xc92499,_0x322750(0x298));_0x20453f[_0x322750(0x225)](_0x3d13ba,_0x1beab7),_0x51730d(!![],_0x581b67);}catch(_0x38d269){_0x946076['error'](_0x322750(0x2ab),_0x38d269),_0x16648a(![],null);}}try{const _0x413ab7=loadConfigFile();if(!_0x413ab7||!_0x413ab7[_0x322750(0x203)]){if(_0x322750(0x19a)===_0x322750(0x19a))return;else _0xb75aee['error'](_0x322750(0x2ab),_0x5ca6c8),_0x370bce(![],null);}const _0x1246c5=_0x413ab7[_0x322750(0x203)][_0x45279a];if(!_0x1246c5)return;_0x1246c5[_0x322750(0x236)]=_0x1c363c?_0x322750(0x253):_0x322750(0x19f),saveConfigFile(_0x413ab7);}catch(_0x377fdc){}},window['resetAllPositions']=function(){const _0x586574=_0x57035c;if(!window[_0x586574(0x276)])return;window['$uiPositions']={},saveHotbarPositions({}),SceneManager[_0x586574(0x22c)](SceneManager[_0x586574(0x262)]['constructor']);},window['createNewSlot']=function(_0xae88ed,_0x27b7ba){const _0x2908ca=_0x57035c;try{if(_0x2908ca(0x210)===_0x2908ca(0x210)){const _0x396d66=loadConfigFile();if(!_0x396d66||!_0x396d66[_0x2908ca(0x203)][_0xae88ed]){alert(_0x2908ca(0x22e));return;}const _0x4ebeef=_0x27b7ba['name'][_0x2908ca(0x280)](',')[0x0][_0x2908ca(0x23e)](),_0x3bbc69=_0x396d66[_0x2908ca(0x203)][_0xae88ed];if(!_0x3bbc69[_0x2908ca(0x1d8)])_0x3bbc69[_0x2908ca(0x1d8)]=[];const _0xc5cc8d=_0x3bbc69['Slots'][_0x2908ca(0x2a5)](_0x275a37=>{const _0x3d8b47=_0x2908ca;if(_0x3d8b47(0x29b)===_0x3d8b47(0x1fd))return;else{const _0x74b17f=_0x275a37[_0x3d8b47(0x212)][_0x3d8b47(0x280)](',')[0x0][_0x3d8b47(0x23e)]();return _0x74b17f===_0x4ebeef;}}),_0x2ba719={'Name':_0x27b7ba[_0x2908ca(0x190)],'BackgroundImage':_0x27b7ba[_0x2908ca(0x1e5)]||'','Button':_0x27b7ba['button'],'TextOffsetY':_0x27b7ba['textOffsetY'][_0x2908ca(0x2ae)](),'SpecialBehavior':_0x27b7ba['specialBehavior']};_0xc5cc8d>=0x0?_0x3bbc69[_0x2908ca(0x1d8)][_0xc5cc8d]=_0x2ba719:_0x3bbc69[_0x2908ca(0x1d8)][_0x2908ca(0x18e)](_0x2ba719);!_0x396d66[_0x2908ca(0x1c8)]&&(_0x396d66[_0x2908ca(0x1c8)]={});_0x396d66['positions'][_0x4ebeef]={'x':_0x27b7ba['x'],'y':_0x27b7ba['y']},saveConfigFile(_0x396d66);if(!window[_0x2908ca(0x276)]){if(_0x2908ca(0x1fb)==='xyBJJ'){const _0x987895=_0x811025[_0x2908ca(0x25d)][_0x2908ca(0x295)](_0x2908ca(0x2b7)),_0x5dbb26=_0x5b3f6c[_0x2908ca(0x25d)]['getElementById'](_0x2908ca(0x197));if(_0x987895)_0x987895[_0x2908ca(0x287)]=_0x3e66b8;if(_0x5dbb26)_0x5dbb26['value']=_0x339d0c;}else window[_0x2908ca(0x276)]={};}window[_0x2908ca(0x276)][_0x4ebeef]={'x':_0x27b7ba['x'],'y':_0x27b7ba['y']};if(SceneManager[_0x2908ca(0x262)]&&SceneManager[_0x2908ca(0x262)][_0x2908ca(0x18f)]){const _0xe71bb5=SceneManager['_scene'][_0x2908ca(0x18f)];let _0x325622=_0xe71bb5['_slots'][_0x2908ca(0x1a6)](_0x4ebeef);if(!_0x325622)_0x325622=new Sprite_SkillSlot(_0x2ba719),_0x325622['x']=_0x27b7ba['x'],_0x325622['y']=_0x27b7ba['y'],_0xe71bb5['_slots'][_0x2908ca(0x26b)](_0x4ebeef,_0x325622),_0xe71bb5[_0x2908ca(0x1d9)](_0x325622);else{_0x325622['_config']=_0x2ba719,_0x325622['x']=_0x27b7ba['x'],_0x325622['y']=_0x27b7ba['y'];if(_0x325622[_0x2908ca(0x1b3)])_0x325622[_0x2908ca(0x1b3)]();if(_0x325622['positionButtonText'])_0x325622['positionButtonText']();if(_0x325622[_0x2908ca(0x27a)])_0x325622[_0x2908ca(0x27a)]();}if(_0xe71bb5['_gridBackgrounds']&&_0xe71bb5['_gridBackgrounds'][_0xae88ed]){const _0x1a6e93=_0xe71bb5['_gridBackgrounds'][_0xae88ed];_0x1a6e93[_0x2908ca(0x208)]=_0x396d66[_0x2908ca(0x203)][_0xae88ed],_0x1a6e93[_0x2908ca(0x24c)]=[];}}VisualEditorWindow&&!VisualEditorWindow[_0x2908ca(0x270)]&&window['updateEditorLists']();}else _0x3509a0[_0x2908ca(0x1e0)]&&(_0x1026c9['visible']=![]);}catch(_0x3bfb91){console[_0x2908ca(0x1ec)](_0x2908ca(0x1f1),_0x3bfb91);}};function saveSlotPosition(_0xb329e8,_0x361573,_0x38940a){const _0x37d350=_0x57035c;!window[_0x37d350(0x276)]&&(_0x37d350(0x1bf)===_0x37d350(0x2a6)?_0x541f04[0x1]=_0x3d60fb:window[_0x37d350(0x276)]={}),window[_0x37d350(0x276)][_0xb329e8]={'x':_0x361573,'y':_0x38940a},window['saveUIPositions']&&('Cgurv'!==_0x37d350(0x23b)?_0xfc5b5[_0x37d350(0x241)](_0xd522b4):window['saveHotbarPositions'](window[_0x37d350(0x276)]));}let clickStartPos=null,clickStartTime=0x0;const DRAG_THRESHOLD=0x5,_TouchInput_onMouseDown_VisualEditor=TouchInput[_0x57035c(0x1aa)];TouchInput['_onMouseDown']=function(_0x1f9561){const _0x105487=_0x57035c;if(editorMode&&SceneManager[_0x105487(0x262)]instanceof Scene_Map){if(_0x105487(0x26f)===_0x105487(0x283))_0xe2c9c3[_0x105487(0x1bb)]();else{const _0x51dff0=Graphics[_0x105487(0x1cc)](_0x1f9561[_0x105487(0x286)]),_0x232e11=Graphics[_0x105487(0x25e)](_0x1f9561['pageY']);clickStartPos={'x':_0x51dff0,'y':_0x232e11},clickStartTime=Date[_0x105487(0x21c)]();}}_TouchInput_onMouseDown_VisualEditor[_0x105487(0x25b)](this,_0x1f9561);};const _TouchInput_onMouseUp_VisualEditor=TouchInput[_0x57035c(0x2b4)];TouchInput['_onMouseUp']=function(_0x1870f6){const _0x4991ca=_0x57035c;if(editorMode&&SceneManager[_0x4991ca(0x262)]instanceof Scene_Map&&clickStartPos){const _0x24919e=Graphics[_0x4991ca(0x1cc)](_0x1870f6['pageX']),_0x3de5a0=Graphics[_0x4991ca(0x25e)](_0x1870f6[_0x4991ca(0x1e6)]),_0x3796ab=Date[_0x4991ca(0x21c)]()-clickStartTime,_0x470223=_0x24919e-clickStartPos['x'],_0x44a9a8=_0x3de5a0-clickStartPos['y'],_0x3924e1=Math[_0x4991ca(0x2a2)](_0x470223*_0x470223+_0x44a9a8*_0x44a9a8);_0x3924e1<DRAG_THRESHOLD&&_0x3796ab<0x1f4&&trySelectSlotAtPosition(_0x24919e,_0x3de5a0),clickStartPos=null;}_TouchInput_onMouseUp_VisualEditor[_0x4991ca(0x25b)](this,_0x1870f6);};function trySelectSlotAtPosition(_0x15cb44,_0xc7b23e){const _0x43d80f=_0x57035c;if(!SceneManager['_scene']||!SceneManager[_0x43d80f(0x262)][_0x43d80f(0x18f)])return![];for(const [_0xe0e860,_0x1bdff5]of SceneManager['_scene'][_0x43d80f(0x18f)][_0x43d80f(0x28c)]){const _0x3e349f=_0x1bdff5[_0x43d80f(0x263)]||0x40,_0x8af27d=_0x1bdff5[_0x43d80f(0x1c6)]||0x40;if(_0x15cb44>=_0x1bdff5['x']-_0x3e349f/0x2&&_0x15cb44<=_0x1bdff5['x']+_0x3e349f/0x2&&_0xc7b23e>=_0x1bdff5['y']-_0x8af27d/0x2&&_0xc7b23e<=_0x1bdff5['y']+_0x8af27d/0x2)return currentSelectedSlot=_0xe0e860,window[_0x43d80f(0x1dc)](_0xe0e860),VisualEditorWindow&&!VisualEditorWindow['closed']&&VisualEditorWindow[_0x43d80f(0x1bc)](_0xe0e860),!![];}return![];}function _0x58b3(){const _0x5434e5=['RowColumn','toLowerCase','pPLCf','getFullSlotConfig','Error\x20creating\x20slot:','[Hotbar]\x20Failed\x20to\x20load\x20HotbarConfig.json:','open','XyTin','getGridInfo','KDEtX','findGridForSlot','Error\x20loading\x20slot\x20properties:','deleteSlot','mkdirSync','xsszl','[Hotbar]\x20Error\x20saving\x20config:','RzqXT','EUNFs','path','1190934Bdjwno','PZniF','dVHrc','grids','Editing\x20slots\x20only\x20works\x20in\x20NW.js\x20(test\x20mode\x20in\x20desktop)','QYVkY','YCguY','getSlotProperties','_grid','loadGridSlots','specialBehavior','stringify','VMgEl','Grid\x20not\x20found!','none','bitmap','oFcWv','toggleDragMode','Name','YeIQH','UAVzm','BZgon','forEach','extname','copyBackgroundImage','Error\x20finding\x20grid\x20for\x20slot:','VJdoq','Error\x20deleting\x20grid:','now','0,\x200','_isDragMode','YMxHu','gPIDY','/js/','PRUXs','iuwzp','updateGridPosition','writeFileSync','yobgL','strokeRect','splice','Error\x20resetting\x20position:\x20','lineWidth','nPAMI','goto','_blank','Invalid\x20grid\x20index!','focus','xNfDv','XGLlY','visible','updateSlotPositionFields','VCzbV','Etivl','ControllableViaGamepad','RiJgb','BNfST','round','_buttonIconSprite','Cgurv','nameKb','18bNjAzV','trim','highlightGrid','yiChN','updateSlotsList','uGJsN','769335OYiDli','loadSystem','then','.\x20The\x20page\x20will\x20reload.','existsSync','crQcv','jGOCm','Error\x20arranging\x20slots:\x20','SWyBI','_gridSlots','oxnqH','znXja','gpbjP','gMPJC','qtJYM','eTewq','true','buttonKb','BBDdO','mxZCE','uDJAK','removeChild','XwAuV','IKWUi','call','style','document','pageToCanvasY','Error\x20loading\x20grid\x20info:','createNewGrid','Error\x20updating\x20property:\x20','_scene','width','from','AFIbb','Deleting\x20grids\x20only\x20works\x20in\x20NW.js\x20mode','<div\x20class=\x22empty-state\x22>Grid\x20deleted.\x20Select\x20another\x20grid\x20to\x20edit.</div>','STouS','js/HotbarConfig.json','bind','set','MFvwQ','VmQHY','utf8','XolAs','closed','TZkdt','saveHotbarPositions','msMmF','Grid\x20or\x20slots\x20not\x20found!','arrangeGridSlots','$uiPositions','rgba(255,\x20215,\x200,\x20','iObse','constructor','refreshButtonText','write','Arrfg','332276REIAsl','Error\x20updating\x20editor\x20lists:','rZNMi','split','Error\x20updating\x20grid\x20position:\x20','getOwnPropertyDescriptor','zjVfH','VRHOw','parent','pageX','value','resetGridBackgroundPosition','_editorGlow','Position','message','_slots','1679860CwafwK','dirname','_gridHighlightSprite','has','updateGridGamepadControllable','vlScb','PTAtz','parse','getElementById','buttonGp','lghWm','base64','zkuKX','\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<head>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<title>Hotbar\x20Builder</title>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<style>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20*\x20{\x20box-sizing:\x20border-box;\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20p\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-top:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20body\x20{\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-family:\x20Arial,\x20sans-serif;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2015px;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20linear-gradient(135deg,\x20rgba(0,\x200,\x200,\x201),\x20#6a4ba2ff);\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20white;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20min-height:\x20100vh;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20overflow-y:\x20auto;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20body::-webkit-scrollbar\x20{\x20width:\x208px;\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20body::-webkit-scrollbar-track\x20{\x20background:\x20rgba(255,\x20255,\x20255,\x200.1);\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20body::-webkit-scrollbar-thumb\x20{\x20background:\x20rgba(255,\x20255,\x20255,\x200.3);\x20border-radius:\x204px;\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.container\x20{\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(0,\x200,\x200,\x200.1);\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2015px;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2015px;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20backdrop-filter:\x20blur(10px);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20max-width:\x201200px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x20auto;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20h1\x20{\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2028px;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-family:\x20\x22Palatino\x20Linotype\x22,\x20\x22Book\x20Antiqua\x22,\x20Georgia,\x20serif;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x200\x2010px\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.credit\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2014px;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#999999ff;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.credit\x20a\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-decoration:\x20none;\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20yellow;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.hint\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2013px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#FFD700;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-top:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20215,\x200,\x200.1);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x201px\x20solid\x20rgba(255,\x20215,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.toolbar\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex-wrap:\x20wrap;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.toolbar-btn\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#2196F3;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20white;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px\x2018px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2014px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20cursor:\x20pointer;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transition:\x20all\x200.3s\x20ease;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20500;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.toolbar-btn:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#1976D2;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20translateY(-2px);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x204px\x208px\x20rgba(0,0,0,0.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.toolbar-btn.active\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#FF5722;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.main-content\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.sidebar\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20280px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.05);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.content-panel\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex:\x201;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.05);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.section-header\x20h3\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin:\x200\x200\x2015px\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2018px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#FFD700;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding-bottom:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.scrollable-list\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20max-height:\x20300px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20overflow-y:\x20auto;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20overflow-x:\x20hidden;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding-right:\x205px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.scrollable-list::-webkit-scrollbar\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.scrollable-list::-webkit-scrollbar-track\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(0,\x200,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x206px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.scrollable-list::-webkit-scrollbar-thumb\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(100,\x20100,\x20100,\x200.6);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x206px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x202px\x20solid\x20rgba(0,\x200,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.scrollable-list::-webkit-scrollbar-thumb:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(150,\x20150,\x20150,\x200.8);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.list-item\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.1);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x205px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20cursor:\x20pointer;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transition:\x20all\x200.3s\x20ease;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x202px\x20solid\x20transparent;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.list-item:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.15);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20translateX(4px);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.list-item.active\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(100,\x20149,\x20237,\x200.4);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-color:\x20rgba(255,\x20215,\x200,\x200.6);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20box-shadow:\x200\x200\x2010px\x20rgba(255,\x20215,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.list-item-name\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20flex:\x201;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2014px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.delete-slot-btn\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#d32f2f;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20white;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x204px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20cursor:\x20pointer;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transition:\x20all\x200.2s\x20ease;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-left:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.delete-slot-btn:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#b71c1c;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20scale(1.1);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.add-slot-btn\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x2020px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20height:\x2020px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x2050%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#4CAF50;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20white;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2016px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20cursor:\x20pointer;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transition:\x20all\x200.2s\x20ease;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20line-height:\x201;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.add-slot-btn:hover\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20#45a049;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20scale(1.15);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field-group\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20grid;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20grid-template-columns:\x201fr\x201fr;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20gap:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.1);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2010px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x201px\x20solid\x20rgba(255,\x20255,\x20255,\x200.2);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field.full-width\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20grid-column:\x201\x20/\x20-1;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20label\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20block;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x205px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#FFD700;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20input,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20select\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20width:\x20100%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x20none;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x204px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(255,\x20255,\x20255,\x200.9);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#333;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2013px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20input:focus,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.field\x20select:focus\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20outline:\x202px\x20solid\x20#FFD700;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.empty-state\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-align:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2040px\x2020px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20#999;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2014px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-style:\x20italic;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20.info-box\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(33,\x20150,\x20243,\x200.2);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x201px\x20solid\x20rgba(33,\x20150,\x20243,\x200.4);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2012px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20margin-bottom:\x2015px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2013px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20line-height:\x201.5;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</style>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</head>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<body>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22container\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22header\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20style=\x22display:\x20flex;\x20align-items:\x20center;\x20justify-content:\x20center;\x20gap:\x2015px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<img\x20src=\x22data:image/png;base64,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AhERBv7++fb29A0MAxYUBv7rVf70qfrXR/v58P7pnxwXBvDt4ygeAiQcBf7IMu7AOuPMicq4gtrSuufhz/fz5+i0LiohCi8nFP7UbichEnRjNu7KcurPiu/TkOnPkHhrTN7Iji4gAj4vDCQcCx4YCz0zHLydWe3Kfdi5dO7OiNu+fVtPNP7fl7eicoh4VmdbQe/VmKqXbPjdn5OGaMe/rqVyDSoeBtGXIpRqGW9QE2RIEdWaJodhGM2UJaF0HXpZGC4iCTUnC+rDds6taeW/duC7c+rGetOybvTNgc6uburGfvvViebDfezKg6SLW/vXkuPEherKisSre7qwm+jm4vmmD9yRD7l9DdeWIjIjCNKSIt2bJUk0DNaWJr+HItKWJrB+IP63MOCeK92rUuSzXtKua+7GeurCeu7GflBDK+rGgkY7J/XPierGhu7Kis+xefDOjsiqdsqueurKjta5g92/iPPRlqObjLJ2FoZaE1s9DVI4DHlSEtaSItKOIsqKIfeqK++kKtuVJv2vLeigKdaSJtKSJtuWKtWULMmNKeunM9maMcqOLvauOc2SMNmdO7eENDorE/y+XJd4ROrCfu7Ggu7KjunGi8SmduPBi8qufurKlK1qBioaAtKDDKZmCiAUArd2FhkQA7FyFpNeEtGJG6ltFteNHcaDG7t6GUIrCb9+G7Z2GrJ2Gi4eB69yG9aOIuOZJ9aOJtKOJu7Cfu7GiOrChsqqes+vf6pjBqpmCqZiCqFhCrBrDapmDqZmDq13Mc6qesqqf9TRzaZgBi4aAq9mCqpiCsJxDaNdC7hsDcp3D4ZOCiYWA6ZiDoxTDK5mD6FhD3ZGC2pACsR0FLVtE4ZPDqpnE7pyFyIWB5RkKc6qfpxYC4pOCoZKCpRUDKpiDoJKC4pODk00GYpKBoFGChQLAoZKDioZB0UuFmpGI1k5GmI+Hv76+PPx8AwEAgYCAgcGBv7+/vr6+gICAv///7JXTUoAAAEAdFJOU////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBT9wclAAAACXBIWXMAAAsTAAALEwEAmpwYAACIKUlEQVR4nN29CXxTZfY3fp57k9ybtJTSFBBp6ZK0tFxKoWlE2WRr2VxwqziOC+6jMuNsOuMy4/zUcZwZZ3EbHbdRx5EpjoLK1rKpoGLaQikXWpqkLQ1UhaSltMm9Se59/p/z3HRhFZX5ve/7f8Q2SdP0fu85z9nPeQiF/ydXb9I3/x0O/p9boXP+E42NikX/Myv0zX6R/D9G194LGrrGFu7VAPhDw5tsmb5vQF/+Yfh/aJ2XOuXPKbfGNtY9xt2n71ee89456UDK/z/pOvzgf16ozTn/3iFHgkOOkoPFP9xsmr70ymDa//+wvnRr5W9alP+5SYlQC+jARYktufYq20XPrbrq/z6s531IryI3XIoP33+FtM37zTeRpXlyZHGtsD2mDekYCtCVi3Kpa4hNnwRXzavoOaNPMsH/zsrbHh5SHc18mdMjYIXIXJi7Ye6oYNj5+LUTms/k9y/ylrTHH6hQbPHwOR1AINSV2gWpIXOs8aFKWJf889//30LXn/1apJGqciuh76/dlDL3I5hxf2nhTXNtFN6HpYdhnmvV1+H9z9zFn13728NWTbN2pFojaYyqqZAWgii38glb6bu+gv8bsObF99F3+EtJ5vVbeD4+3/m3rPao5QePwRCTdmRhwbCL4X293EZf//vnp/kIb+Wj3gYCPES6UqGLDO0iyMep0JXr10lK0jjT9Dczu/+PYz2vOqUJHOC2mfxZTRrvcMBYBaD64iaoAo0vDJW0xae5F1N/w6Xw+hOnoG6PIIrvOPYWqdYOGBVJ86daOyC1CwBSEXauf4jFd/k18yqczf9Hsf7st1CyLTXnHK7zIOTP1QurcsGfEQCAzELwOsiY6hbfPn5sbpsS2kvf4Su6HvnjST4kMMJqeei6OM+eRI6cA9YQpLXQ3FCaPzXNnwrBEXy49crZ4aofvPR/DmtejbVkm+2Bz4IH+fIx8/fvhXaAXD9kmv3sx7mO6lx/rv+W6g0+7Vy7ojR0rb2cvHbL8Z8SjYw9+uClQxLXGeka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\x22\x20alt=\x22Logo\x22\x20style=\x22width:\x2050px;\x20height:\x20auto;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h1\x20style=\x22margin:\x200;\x22>Realtime\x20Hotbar\x20Builder</h1>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<p\x20class=\x22credit\x22>©\x202026\x20by\x20Sang\x20Hendrix\x20-\x20<a\x20href=\x22https://sanghendrix.itch.io\x22>sanghendrix.itch.io</a></p>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22hint\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Click\x20and\x20drag\x20your\x20slot\x20shown\x20in-game\x20to\x20adjust\x20position\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22toolbar\x22\x20style=\x22display:\x20none;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<!--\x20Hidden\x20for\x20now\x20-\x20functionality\x20kept\x20for\x20future\x20use\x20-->\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22resetPositions()\x22\x20title=\x22Reset\x20all\x20slots\x20to\x20default\x20positions\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20↺\x20Reset\x20Positions\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22main-content\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22sidebar\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22section-header\x22\x20style=\x22display:\x20flex;\x20align-items:\x20center;\x20justify-content:\x20space-between;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h3\x20style=\x22margin:\x200;\x22>⏹️\x20Hotbar\x20Grids</h3>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22add-slot-btn\x22\x20onclick=\x22createNewGrid()\x22\x20title=\x22Create\x20a\x20new\x20grid\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20+\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22gridsList\x22\x20class=\x22scrollable-list\x22></div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22section-header\x22\x20style=\x22display:\x20flex;\x20align-items:\x20center;\x20justify-content:\x20space-between;\x20margin-top:\x2020px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h3\x20style=\x22margin:\x200;\x22>🟡\x20Slots</h3>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22add-slot-btn\x22\x20onclick=\x22instantCreateSlot()\x22\x20title=\x22Create\x20a\x20new\x20slot\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20+\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22slotsList\x22\x20class=\x22scrollable-list\x22></div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22content-panel\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22slotPreview\x22\x20style=\x22display:\x20none;\x20margin-bottom:\x2020px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h3\x20style=\x22color:\x20#FFD700;\x20margin-top:\x200;\x20margin-bottom:\x2010px;\x22>Preview</h3>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22previewContainer\x22\x20style=\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20flex;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20align-items:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20justify-content:\x20center;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20background:\x20rgba(0,\x200,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border:\x202px\x20solid\x20rgba(255,\x20215,\x200,\x200.3);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20border-radius:\x208px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x2020px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20min-height:\x20100px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22previewSlot\x22\x20style=\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20position:\x20relative;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20display:\x20inline-block;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<img\x20id=\x22previewBg\x22\x20style=\x22display:\x20none;\x22\x20/>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22previewText\x22\x20style=\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20position:\x20absolute;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20top:\x2050%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20left:\x2050%;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20transform:\x20translate(-50%,\x20-50%);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20color:\x20white;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-size:\x2018px;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20font-weight:\x20bold;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20text-shadow:\x202px\x202px\x204px\x20rgba(0,0,0,0.8);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20white-space:\x20nowrap;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x22></div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h3\x20style=\x22color:\x20#FFD700;\x20margin-top:\x200;\x22>Slot\x20Properties</h3>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20id=\x22propertiesPanel\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22empty-state\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Select\x20a\x20slot\x20to\x20view\x20its\x20properties\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<script>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20let\x20currentGrid\x20=\x20null;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20let\x20currentSlot\x20=\x20null;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20selectGrid(index)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20currentGrid\x20=\x20index;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20currentSlot\x20=\x20null;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.querySelectorAll(\x27#gridsList\x20.list-item\x27).forEach(item\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.classList.remove(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20element\x20=\x20document.getElementById(\x27grid_\x27\x20+\x20index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(element)\x20element.classList.add(\x27active\x27);\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.loadGridSlots)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.loadGridSlots(index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.highlightGrid)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.highlightGrid(index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.deselectAllSlots)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.deselectAllSlots();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20showGridInfo(index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20selectSlot(slotName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20currentSlot\x20=\x20slotName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.querySelectorAll(\x27#slotsList\x20.list-item\x27).forEach(item\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.classList.remove(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20element\x20=\x20document.getElementById(\x27slot_\x27\x20+\x20slotName.replace(/[^a-zA-Z0-9]/g,\x20\x27_\x27));\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(element)\x20element.classList.add(\x27active\x27);\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.selectSlotInGame)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.selectSlotInGame(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20showSlotProperties(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20showGridInfo(index)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20panel\x20=\x20document.getElementById(\x27propertiesPanel\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.getGridInfo)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20info\x20=\x20window.opener.getGridInfo(index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(info)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20panel.innerHTML\x20=\x20`\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field-group\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label\x20style=\x22display:\x20flex;\x20align-items:\x20center;\x20cursor:\x20pointer;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22checkbox\x22\x20id=\x22gridGamepadControllable\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20${info.gamepadControllable\x20?\x20\x27checked\x27\x20:\x20\x27\x27}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateGridGamepadControllable(this.checked)\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22margin-right:\x208px;\x20width:\x2018px;\x20height:\x2018px;\x20cursor:\x20pointer;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<span>Gamepad\x20Controllable</span>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<hr\x20style=\x22border:\x20none;\x20border-top:\x201px\x20solid\x20rgba(255,255,255,0.1);\x20margin:\x2020px\x200;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h4\x20style=\x22color:\x20#FFD700;\x20margin:\x200\x200\x2010px\x200;\x22>Grid\x20Background</h4>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field-group\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Background\x20Image</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20style=\x22display:\x20flex;\x20gap:\x205px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22text\x22\x20id=\x22gridBackgroundImage\x22\x20value=\x22${info.backgroundImage\x20||\x20\x27\x27}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Image\x20filename\x20(without\x20extension)\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateGridBackgroundImage(this.value)\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22flex:\x201;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22selectGridBackgroundImage()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22padding:\x205px\x2015px;\x20min-width:\x20auto;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20📁\x20Browse\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22removeGridBackgroundImage()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22padding:\x205px\x2015px;\x20min-width:\x20auto;\x20background:\x20#d32f2f;\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20title=\x22Remove\x20background\x20image\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20✕\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20style=\x22margin-top:\x205px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22resetGridBackgroundPosition()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22width:\x20100%;\x20padding:\x208px;\x20background:\x20#2196F3;\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20title=\x22Center\x20grid\x20to\x20slots\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Reset\x20Grid\x20Position\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22file\x22\x20id=\x22gridBgImageFileInput\x22\x20accept=\x22.png\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22display:\x20none;\x22\x20onchange=\x22handleGridBackgroundImageFile(this)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22\x20style=\x22flex:\x201;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Position\x20X</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22gridPosX\x22\x20value=\x22${info.positionX\x20||\x200}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateGridPosition(\x27x\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22\x20style=\x22flex:\x201;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Position\x20Y</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22gridPosY\x22\x20value=\x22${info.positionY\x20||\x200}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateGridPosition(\x27y\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<hr\x20style=\x22border:\x20none;\x20border-top:\x201px\x20solid\x20rgba(255,255,255,0.1);\x20margin:\x2020px\x200;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<h4\x20style=\x22color:\x20#FFD700;\x20margin:\x200\x200\x2010px\x200;\x22>Grid\x20Arrangement</h4>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field-group\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Rows</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22gridRows\x22\x20value=\x22${info.rows\x20||\x202}\x22\x20min=\x221\x22\x20max=\x2220\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Columns</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22gridColumns\x22\x20value=\x22${info.columns\x20||\x205}\x22\x20min=\x221\x22\x20max=\x2220\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Padding</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22gridPadding\x22\x20value=\x22${info.padding\x20||\x2010}\x22\x20min=\x220\x22\x20max=\x22100\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22arrangeGridSlots()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22width:\x20100%;\x20background:\x20#4CAF50;\x20padding:\x2012px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20Arrange\x20Slots\x20to\x20Grid\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20`;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updatePreview(slotName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20previewPanel\x20=\x20document.getElementById(\x27slotPreview\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20previewBg\x20=\x20document.getElementById(\x27previewBg\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20previewText\x20=\x20document.getElementById(\x27previewText\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20previewSlot\x20=\x20document.getElementById(\x27previewSlot\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!window.opener)\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fullConfig\x20=\x20window.opener.getFullSlotConfig\x20?\x20window.opener.getFullSlotConfig(slotName)\x20:\x20null;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!fullConfig)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewPanel.style.display\x20=\x20\x27none\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewPanel.style.display\x20=\x20\x27block\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20offsetY\x20=\x20parseInt(fullConfig.TextOffsetY)\x20||\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(fullConfig.BackgroundImage)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewBg.src\x20=\x20\x27img/system/\x27\x20+\x20fullConfig.BackgroundImage\x20+\x20\x27.png\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewBg.style.display\x20=\x20\x27block\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewBg.onload\x20=\x20function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewSlot.style.width\x20=\x20this.width\x20+\x20\x27px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewSlot.style.height\x20=\x20this.height\x20+\x20\x27px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20textY\x20=\x20this.height\x20+\x20offsetY;\x20\x20//\x20Bottom\x20of\x20bg\x20+\x20offset\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.top\x20=\x20textY\x20+\x20\x27px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.left\x20=\x20\x2750%\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.transform\x20=\x20\x27translate(-50%,\x20-50%)\x27;\x20\x20//\x20-50%\x20Y\x20to\x20center\x20the\x20text\x20sprite\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewBg.style.display\x20=\x20\x27none\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewSlot.style.width\x20=\x20\x2748px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewSlot.style.height\x20=\x20\x2748px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20textY\x20=\x2024\x20+\x20offsetY;\x20\x20//\x20Center\x20of\x2048px\x20slot\x20+\x20offset\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.top\x20=\x20textY\x20+\x20\x27px\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.left\x20=\x20\x2750%\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.style.transform\x20=\x20\x27translate(-50%,\x20-50%)\x27;\x20\x20//\x20-50%\x20Y\x20to\x20center\x20the\x20text\x20sprite\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20buttons\x20=\x20fullConfig.Button.split(\x27,\x27).map(b\x20=>\x20b.trim());\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20previewText.textContent\x20=\x20buttons[0]\x20||\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20showSlotProperties(slotName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20panel\x20=\x20document.getElementById(\x27propertiesPanel\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.getSlotProperties)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20props\x20=\x20window.opener.getSlotProperties(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(props)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fullConfig\x20=\x20window.opener.getFullSlotConfig\x20?\x20window.opener.getFullSlotConfig(slotName)\x20:\x20null;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20names\x20=\x20fullConfig\x20?\x20fullConfig.Name.split(\x27,\x27).map(n\x20=>\x20n.trim())\x20:\x20[slotName,\x20\x27\x27];\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20buttons\x20=\x20fullConfig\x20?\x20fullConfig.Button.split(\x27,\x27).map(b\x20=>\x20b.trim())\x20:\x20[props.buttonText,\x20\x27\x27];\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20panel.dataset.originalSlotName\x20=\x20slotName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20panel.dataset.currentSlotName\x20=\x20slotName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20panel.innerHTML\x20=\x20`\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field-group\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Slot\x20Name</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22text\x22\x20id=\x22slotNameKb\x22\x20value=\x22${names[0]\x20||\x20slotName}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27nameKb\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Text\x20Shown\x20on\x20Slot\x20(Keyboard)</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22text\x22\x20id=\x22slotButtonKb\x22\x20value=\x22${buttons[0]\x20||\x20\x27\x27}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27buttonKb\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Text\x20Shown\x20on\x20Slot\x20(Gamepad)\x20-\x20Optional</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22text\x22\x20id=\x22slotButtonGp\x22\x20value=\x22${buttons[1]\x20||\x20\x27\x27}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Leave\x20empty\x20if\x20not\x20using\x20gamepad\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27buttonGp\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Position\x20X</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22posX\x22\x20value=\x22${Math.round(props.x\x20||\x200)}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPosition(\x27x\x27,\x20parseInt(this.value))\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Position\x20Y</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22posY\x22\x20value=\x22${Math.round(props.y\x20||\x200)}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPosition(\x27y\x27,\x20parseInt(this.value))\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x20full-width\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Background\x20Image</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20style=\x22display:\x20flex;\x20gap:\x205px;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22text\x22\x20id=\x22slotBgImage\x22\x20value=\x22${fullConfig\x20?\x20fullConfig.BackgroundImage\x20:\x20\x27\x27}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20placeholder=\x22Image\x20filename\x20(without\x20extension)\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27backgroundImage\x27,\x20this.value)\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22flex:\x201;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22selectBackgroundImage()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22padding:\x205px\x2015px;\x20min-width:\x20auto;\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20📁\x20Browse\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<button\x20class=\x22toolbar-btn\x22\x20onclick=\x22removeSlotBackgroundImage()\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22padding:\x205px\x2015px;\x20min-width:\x20auto;\x20background:\x20#d32f2f;\x22\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20title=\x22Remove\x20background\x20image\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20✕\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</button>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22file\x22\x20id=\x22bgImageFileInput\x22\x20accept=\x22.png\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20style=\x22display:\x20none;\x22\x20onchange=\x22handleBackgroundImageFile(this)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Button\x20Text\x20Offset\x20Y</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<input\x20type=\x22number\x22\x20id=\x22slotTextOffset\x22\x20value=\x22${fullConfig\x20?\x20fullConfig.TextOffsetY\x20:\x200}\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27textOffsetY\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class=\x22field\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<label>Special\x20Behavior</label>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<select\x20id=\x22slotSpecialBehavior\x22\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20onchange=\x22updateSlotPropertySafe(\x27specialBehavior\x27,\x20this.value)\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<option\x20value=\x22none\x22\x20${(!fullConfig\x20||\x20fullConfig.SpecialBehavior\x20===\x20\x27none\x27)\x20?\x20\x27selected\x27\x20:\x20\x27\x27}>None</option>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<option\x20value=\x22display_weapon\x22\x20${(fullConfig\x20&&\x20fullConfig.SpecialBehavior\x20===\x20\x27display_weapon\x27)\x20?\x20\x27selected\x27\x20:\x20\x27\x27}>Display\x20Equipped\x20Weapon</option>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<option\x20value=\x22display_shield\x22\x20${(fullConfig\x20&&\x20fullConfig.SpecialBehavior\x20===\x20\x27display_shield\x27)\x20?\x20\x27selected\x27\x20:\x20\x27\x27}>Display\x20Equipped\x20Shield</option>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<option\x20value=\x22item_only\x22\x20${(fullConfig\x20&&\x20fullConfig.SpecialBehavior\x20===\x20\x27item_only\x27)\x20?\x20\x27selected\x27\x20:\x20\x27\x27}>Item\x20Slot\x20Only</option>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<option\x20value=\x22skill_only\x22\x20${(fullConfig\x20&&\x20fullConfig.SpecialBehavior\x20===\x20\x27skill_only\x27)\x20?\x20\x27selected\x27\x20:\x20\x27\x27}>Skill\x20Slot\x20Only</option>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</select>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20`;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updatePreview(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateSlotPropertySafe(property,\x20value)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20panel\x20=\x20document.getElementById(\x27propertiesPanel\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20currentName\x20=\x20panel.dataset.currentSlotName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.updateSlotProperty)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20result\x20=\x20window.opener.updateSlotProperty(currentGrid,\x20currentName,\x20property,\x20value);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(property\x20===\x20\x27nameKb\x27\x20&&\x20result\x20&&\x20result.newName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20panel.dataset.currentSlotName\x20=\x20result.newName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20currentSlot\x20=\x20result.newName;\x20//\x20Update\x20current\x20slot\x20reference\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.loadGridSlots)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.loadGridSlots(currentGrid);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updatePreview(result.newName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updatePreview(currentName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateSlotPosition(axis,\x20value)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.updateSlotPosition\x20&&\x20currentSlot)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.updateSlotPosition(currentSlot,\x20axis,\x20value);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20instantCreateSlot()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Please\x20select\x20a\x20grid\x20first!\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20existingSlots\x20=\x20document.querySelectorAll(\x27#slotsList\x20.list-item\x27).length;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20slotNumber\x20=\x20existingSlots\x20+\x201;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20slotConfig\x20=\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name:\x20\x27New\x20Slot\x20\x27\x20+\x20slotNumber,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20button:\x20\x27Key\x27\x20+\x20slotNumber,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20x:\x20400,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20y:\x20300,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20backgroundImage:\x20\x27\x27,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20textOffsetY:\x200,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20specialBehavior:\x20\x27none\x27\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.createNewSlot)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.createNewSlot(currentGrid,\x20slotConfig);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20selectBackgroundImage()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileInput\x20=\x20document.getElementById(\x27bgImageFileInput\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(fileInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20fileInput.click();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20handleBackgroundImageFile(input)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!input.files\x20||\x20!input.files[0])\x20return;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20file\x20=\x20input.files[0];\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20reader\x20=\x20new\x20FileReader();\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20reader.onload\x20=\x20function(e)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileData\x20=\x20e.target.result;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileName\x20=\x20file.name;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.copyBackgroundImage)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.copyBackgroundImage(fileData,\x20fileName,\x20function(success,\x20imageNameWithoutExt)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(success)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20bgImageInput\x20=\x20document.getElementById(\x27slotBgImage\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(bgImageInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20bgImageInput.value\x20=\x20imageNameWithoutExt;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateSlotPropertySafe(\x27backgroundImage\x27,\x20imageNameWithoutExt);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Failed\x20to\x20copy\x20background\x20image\x20file.\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20reader.readAsDataURL(file);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20arrangeGridSlots()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Please\x20select\x20a\x20grid\x20first!\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20rows\x20=\x20parseInt(document.getElementById(\x27gridRows\x27).value)\x20||\x202;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20columns\x20=\x20parseInt(document.getElementById(\x27gridColumns\x27).value)\x20||\x205;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20padding\x20=\x20parseInt(document.getElementById(\x27gridPadding\x27).value)\x20||\x2010;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.arrangeGridSlots)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.arrangeGridSlots(currentGrid,\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20rows:\x20rows,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20columns:\x20columns,\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20padding:\x20padding\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20selectGridBackgroundImage()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileInput\x20=\x20document.getElementById(\x27gridBgImageFileInput\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(fileInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20fileInput.click();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20handleGridBackgroundImageFile(input)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!input.files\x20||\x20!input.files[0])\x20return;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20file\x20=\x20input.files[0];\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20reader\x20=\x20new\x20FileReader();\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20reader.onload\x20=\x20function(e)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileData\x20=\x20e.target.result;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20fileName\x20=\x20file.name;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.copyBackgroundImage)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.copyBackgroundImage(fileData,\x20fileName,\x20function(success,\x20imageNameWithoutExt)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(success)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20bgImageInput\x20=\x20document.getElementById(\x27gridBackgroundImage\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(bgImageInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20bgImageInput.value\x20=\x20imageNameWithoutExt;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateGridBackgroundImage(imageNameWithoutExt);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Failed\x20to\x20copy\x20background\x20image\x20file.\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20reader.readAsDataURL(file);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateGridBackgroundImage(imageName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20return;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.updateGridBackgroundImage)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.updateGridBackgroundImage(currentGrid,\x20imageName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20removeGridBackgroundImage()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20return;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20bgImageInput\x20=\x20document.getElementById(\x27gridBackgroundImage\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(bgImageInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20bgImageInput.value\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateGridBackgroundImage(\x27\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateGridPosition(axis,\x20value)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Please\x20select\x20a\x20grid\x20first!\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20numValue\x20=\x20parseFloat(value)\x20||\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.updateGridPosition)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.updateGridPosition(currentGrid,\x20axis,\x20numValue);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20resetGridBackgroundPosition()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Please\x20select\x20a\x20grid\x20first!\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.resetGridBackgroundPosition)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.resetGridBackgroundPosition(currentGrid);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateGridGamepadControllable(isControllable)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20return;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.updateGridGamepadControllable)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.updateGridGamepadControllable(currentGrid,\x20isControllable);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20removeSlotBackgroundImage()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20bgImageInput\x20=\x20document.getElementById(\x27slotBgImage\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(bgImageInput)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20bgImageInput.value\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateSlotPropertySafe(\x27backgroundImage\x27,\x20\x27\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20deleteSlot(slotName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27No\x20grid\x20selected!\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.deleteSlot)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.deleteSlot(currentGrid,\x20slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20createNewGrid()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.createNewGrid)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.createNewGrid();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20deleteGrid(gridIndex)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.deleteGrid)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.deleteGrid(gridIndex);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20resetPositions()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(confirm(\x27Reset\x20all\x20slot\x20positions\x20to\x20default?\x20This\x20cannot\x20be\x20undone!\x27))\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.resetAllPositions)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.opener.resetAllPositions();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20alert(\x27Positions\x20reset!\x20The\x20game\x20will\x20reload.\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateGridButton(isActive)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateSnapButton(isActive)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.updateGridsList\x20=\x20function(grids)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20list\x20=\x20document.getElementById(\x27gridsList\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!grids\x20||\x20grids.length\x20===\x200)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.innerHTML\x20=\x20\x27<div\x20class=\x22empty-state\x22>No\x20grids\x20configured\x20in\x20plugin\x20parameters</div>\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.innerHTML\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20grids.forEach((grid,\x20index)\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20item\x20=\x20document.createElement(\x27div\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.className\x20=\x20\x27list-item\x27\x20+\x20(index\x20===\x20currentGrid\x20?\x20\x27\x20active\x27\x20:\x20\x27\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.id\x20=\x20\x27grid_\x27\x20+\x20index;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.onclick\x20=\x20()\x20=>\x20selectGrid(index);\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20name\x20=\x20document.createElement(\x27div\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.className\x20=\x20\x27list-item-name\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.textContent\x20=\x20`Grid\x20#${index\x20+\x201}\x20(${grid.slotCount}\x20slots)`;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.style.flex\x20=\x20\x271\x27;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20deleteBtn\x20=\x20document.createElement(\x27button\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.textContent\x20=\x20\x27✕\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.className\x20=\x20\x27delete-slot-btn\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.title\x20=\x20\x27Delete\x20this\x20grid\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.onclick\x20=\x20(e)\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20e.stopPropagation();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteGrid(index);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.appendChild(name);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.appendChild(deleteBtn);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.appendChild(item);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.updateSlotsList\x20=\x20function(slots)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20list\x20=\x20document.getElementById(\x27slotsList\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(currentGrid\x20===\x20null)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.innerHTML\x20=\x20\x27<div\x20class=\x22empty-state\x22>Select\x20a\x20grid\x20first</div>\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(!slots\x20||\x20slots.length\x20===\x200)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.innerHTML\x20=\x20\x27<div\x20class=\x22empty-state\x22>No\x20slots\x20in\x20this\x20grid</div>\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20return;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.innerHTML\x20=\x20\x27\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20slots.forEach(slot\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20item\x20=\x20document.createElement(\x27div\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20safeId\x20=\x20slot.name.replace(/[^a-zA-Z0-9]/g,\x20\x27_\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.className\x20=\x20\x27list-item\x27\x20+\x20(slot.name\x20===\x20currentSlot\x20?\x20\x27\x20active\x27\x20:\x20\x27\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.id\x20=\x20\x27slot_\x27\x20+\x20safeId;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.onclick\x20=\x20()\x20=>\x20selectSlot(slot.name);\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20name\x20=\x20document.createElement(\x27div\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.className\x20=\x20\x27list-item-name\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.textContent\x20=\x20slot.name;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20name.style.flex\x20=\x20\x271\x27;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20deleteBtn\x20=\x20document.createElement(\x27button\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.textContent\x20=\x20\x27✕\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.className\x20=\x20\x27delete-slot-btn\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.title\x20=\x20\x27Delete\x20this\x20slot\x27;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteBtn.onclick\x20=\x20(e)\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20e.stopPropagation();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20deleteSlot(slot.name);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.appendChild(name);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.appendChild(deleteBtn);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20list.appendChild(item);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.updateSlotPositionFields\x20=\x20function(slotName,\x20x,\x20y)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(slotName\x20===\x20currentSlot)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20posXInput\x20=\x20document.getElementById(\x27posX\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20posYInput\x20=\x20document.getElementById(\x27posY\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(posXInput)\x20posXInput.value\x20=\x20Math.round(x);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(posYInput)\x20posYInput.value\x20=\x20Math.round(y);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20window.selectSlotFromGame\x20=\x20function(slotName)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(window.opener\x20&&\x20window.opener.findGridForSlot)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20gridIndex\x20=\x20window.opener.findGridForSlot(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(gridIndex\x20!==\x20null\x20&&\x20gridIndex\x20!==\x20currentGrid)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20selectGrid(gridIndex);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20currentSlot\x20=\x20slotName;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.querySelectorAll(\x27#slotsList\x20.list-item\x27).forEach(item\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20item.classList.remove(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20element\x20=\x20document.getElementById(\x27slot_\x27\x20+\x20slotName.replace(/[^a-zA-Z0-9]/g,\x20\x27_\x27));\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(element)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20element.classList.add(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20element.scrollIntoView({\x20behavior:\x20\x27smooth\x27,\x20block:\x20\x27nearest\x27\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20showSlotProperties(slotName);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.addEventListener(\x27DOMContentLoaded\x27,\x20function()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.addEventListener(\x27wheel\x27,\x20function(e)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(e.target.type\x20===\x20\x27number\x27)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20e.preventDefault();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20input\x20=\x20e.target;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20step\x20=\x20parseFloat(input.step)\x20||\x201;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20currentValue\x20=\x20parseFloat(input.value)\x20||\x200;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(e.deltaY\x20<\x200)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20currentValue\x20+\x20step;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20currentValue\x20-\x20step;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(input.min\x20!==\x20\x27\x27\x20&&\x20parseFloat(input.value)\x20<\x20parseFloat(input.min))\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20input.min;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(input.max\x20!==\x20\x27\x27\x20&&\x20parseFloat(input.value)\x20>\x20parseFloat(input.max))\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.value\x20=\x20input.max;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20input.dispatchEvent(new\x20Event(\x27change\x27,\x20{\x20bubbles:\x20true\x20}));\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20},\x20{\x20passive:\x20false\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</script>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20</body>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20','ADJZe','delete','pBckf','configurable','YRSZM','Config\x20file\x20not\x20found!','HotbarConfig.json','sqrt','updateSlotProperty','CejBt','findIndex','UlZVs','BOrfE','exyVI','YBTtx','updateSlotPosition','Error\x20copying\x20background\x20image:','_config','piPGa','toString','lYPvL','FOSsP','VchMg','SasvH','readFileSync','_onMouseUp','fgBie','HhFWv','gridPosX','OagrS','isNwjs','push','_skillUI','name','Sxzvl','yrKaw','LEtRo','fdnHk','zSTiG','lNazP','gridPosY','filename','grid_','mWaAj','system','rgba(0,0,0,0.5)','tztmR','catch','false','saveUIPositions','RsBPP','734776nguTgD','deselectAllSlots','[Visual\x20Editor]\x20Scene\x20or\x20SkillUI\x20not\x20ready','[Visual\x20Editor]\x20Slot\x20not\x20found:','get','ORaKm','TextOffsetY','CppUv','_onMouseDown','img','4379670qKtqQa','Button','OYHbv','oNiLy','Padding','json','textOffsetY','createBackground','anchor','BackgroundImage','length','refresh','SpecialBehavior','map','qhhwu','updateEditorLists','selectSlotFromGame','[Hotbar]\x20Error\x20loading\x20config:','AYcBV','rQcRQ','[Visual\x20Editor]\x20Scene\x20or\x20skillUI\x20not\x20available','Error\x20creating\x20grid:','innerHTML','_gridBackgrounds','HKBxA','join','height','UMlZK','positions','XDAgL','PTNmu','2,\x205','pageToCanvasX','hiwJK','close','boxHeight','QePXw','[Visual\x20Editor]\x20toggleDragMode\x20not\x20available','3864973RRwNny','alwaysRun','eaqZp','HcuuA','xdxSf','fillRect','Slots','addChild','_keyboardName','snUaR','selectSlotInGame','padding','forceEnableDragMode','width=900,height=700','_isPlaceholder','hrjxP','replace','_buttonSprite','mainModule','backgroundImage','pageY','cIhqT','about:blank','addChildAt','addLoadListener','slotPreview','error'];_0x58b3=function(){return _0x5434e5;};return _0x58b3();}if(Object[_0x57035c(0x282)](document,'hasFocus')?.[_0x57035c(0x29e)]!==![]){const originalHasFocus=document['hasFocus'][_0x57035c(0x26a)](document);Object['defineProperty'](document,'hasFocus',{'value':function(){const _0x23db1d=_0x57035c;return ConfigManager[_0x23db1d(0x1d3)]||originalHasFocus();},'writable':![],'configurable':!![]});}function getConfigPath(){const _0x4288b0=_0x57035c;if(!Utils[_0x4288b0(0x18d)]())return null;const _0x423f5d=require(_0x4288b0(0x1ff)),_0x69c374=_0x423f5d['dirname'](process['mainModule'][_0x4288b0(0x198)])+_0x4288b0(0x221);return _0x423f5d[_0x4288b0(0x1c5)](_0x69c374,_0x4288b0(0x2a1));}function getProjectRoot(){const _0x340bbd=_0x57035c;if(!Utils['isNwjs']())return null;const _0x171259=require(_0x340bbd(0x1ff));return _0x171259[_0x340bbd(0x28e)](process['mainModule'][_0x340bbd(0x198)]);}function getJsPath(){const _0x2912c5=_0x57035c;if(!Utils[_0x2912c5(0x18d)]())return null;const _0x40a403=require(_0x2912c5(0x1ff));return _0x40a403['dirname'](process[_0x2912c5(0x1e4)]['filename'])+_0x2912c5(0x221);}function _0x2bab(_0x22899d,_0x5a90fd){_0x22899d=_0x22899d-0x18d;const _0x58b3fc=_0x58b3();let _0x2bab6a=_0x58b3fc[_0x22899d];return _0x2bab6a;}function loadConfigFile(){const _0x3f277d=_0x57035c;if(!Utils['isNwjs']())return null;const _0x59b996=require('fs'),_0x7e7f6d=getConfigPath();try{if(_0x59b996[_0x3f277d(0x247)](_0x7e7f6d))return JSON['parse'](_0x59b996[_0x3f277d(0x2b3)](_0x7e7f6d,_0x3f277d(0x26e)));}catch(_0x4f294c){console[_0x3f277d(0x1ec)](_0x3f277d(0x1bd),_0x4f294c);}return{'grids':[],'positions':{}};}function saveConfigFile(_0x12f03a){const _0x140427=_0x57035c;if(!Utils['isNwjs']())return![];const _0x260195=require('fs'),_0x5a8d69=getConfigPath();try{return _0x260195[_0x140427(0x225)](_0x5a8d69,JSON[_0x140427(0x20b)](_0x12f03a,null,0x2),'utf8'),!![];}catch(_0x5c8968){return console[_0x140427(0x1ec)](_0x140427(0x1fc),_0x5c8968),![];}}function reloadGridSettings(_0x200c72=![]){const _0x205481=_0x57035c;if(Utils[_0x205481(0x18d)]()){const _0x164850=loadConfigFile();if(_0x164850)return gridSettings=_0x164850[_0x205481(0x203)]||[],!![];}else return fetch(_0x205481(0x269))['then'](_0x4e221f=>_0x4e221f[_0x205481(0x1b1)]())[_0x205481(0x245)](_0x2eb0c3=>{const _0x5991f3=_0x205481;'UAVzm'!==_0x5991f3(0x214)?_0x2ae3ae[_0x5991f3(0x287)]=_0x51e284:(gridSettings=_0x2eb0c3[_0x5991f3(0x203)]||[],_0x200c72&&SceneManager[_0x5991f3(0x262)]&&SceneManager[_0x5991f3(0x262)][_0x5991f3(0x18f)]&&SceneManager['goto'](SceneManager[_0x5991f3(0x262)][_0x5991f3(0x279)]));})[_0x205481(0x19e)](_0x30f968=>{const _0x4a1003=_0x205481;_0x4a1003(0x1d0)!==_0x4a1003(0x2b1)?console['error']('[Hotbar]\x20Failed\x20to\x20load\x20HotbarConfig.json:',_0x30f968):_0x4b0e1a[_0x4a1003(0x289)]&&(_0x15b54e['removeChild'](_0x52b68a[_0x4a1003(0x289)]),_0x326a15['_editorGlow']=null);}),!![];return![];}reloadGridSettings(![]);
})();