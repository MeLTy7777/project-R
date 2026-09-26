/*:
 * @target MZ
 * @plugindesc RPGツクールに多彩なアニメーション機能を追加します。あらゆるゲーム制作に役立つアニメーションプラグインです
 * @author Sang Hendrix
 * @url https://sanghendrix.itch.io
 *
 * @help
 * Verion 2.0.7
 * ----------------------------------------------------------------------------
 *このRPGツクールMZ用プラグインは、現代的なゲームエンジンの 
 * アニメーション機能をRPGツクールに追加します。 
 * 待機／歩行／走行アニメーション、キャラクター用カスタムアニメーション、 
 * スプライトシートのフレーム数無制限対応、8方向スプライト、1行スプライトシート、 
 * マップ上でのVFX表示、VFXビルダーなど、さまざまな機能を搭載しています。   　  
 * ----------------------------------------------------------------------------
 * 移動ルートで使用できるスクリプト
 * | toFrame(x) |
 * キャラクター画像をフレームxに設定します（1から始まります）
 *
 * | playFrames(first frame, last frame, speed) |
 *  例：playFrames(1, 6, 3)
 *  フレーム1～6を再生します。各フレームで3フレーム分待機します（「ウェイト」コマンドと同様です）。
 *  速度の値が小さいほど、アニメーションは速くなります。
 * ----------------------------------------------------------------------------
 * 使用方法（重要：使用前にお読みください）
 * ----------------------------------------------------------------------------
 * 動画チュートリアル：https://www.youtube.com/watch?v=nC0W4g6SZzQ
 * ---------------------------------
 * ■ VFX DESIGNERを開く
 * ---------------------------------
 * ゲームを起動し、プラグインパラメータで割り当てたVFX Designerボタンを押してください。
 * 
 * ■ DESIGNERで作成したVFXを再生する
 * ---------------------------------
 * プラグインコマンド「Show VFX in Library」を使用します。
 * 
 * ■ スプライトシートを使用してマップ上でVFXを再生する
 * ---------------------------------
 * 1. プラグインコマンド「Show VFX」を使用します。
 * 2. スプライトシートファイルを選択し、そのファイルの
 * Row（行数）とColumn（列数）を設定します。
 *
 * ■ 複数の個別画像を使用してマップ上でVFXを再生する
 * ---------------------------------
 * 1. プラグインコマンド「Show VFX」を使用します。 
 * 2. 使用するファイルをpictures/framesフォルダ内に配置します。 
 * 3. 使用するフレーム数を設定します。
 *
 * ■ キャラクターアニメーションを再生する
 * （クワを振る、踊る、眠る、攻撃するなど）
 * ---------------------------------
 * 1. $hero_sleeping_f8.png のような名前のキャラクター画像を用意します。
 *    この場合、主人公が眠っているアニメーションが8フレームあることを意味します。
 * 2. キャラクター画像を $hero_sleeping_f8.png に変更します。
 * 3. 移動ルートコマンド内で、以下のスクリプトを使用します：
 *    playFrames(1, 8, 3)
 *    これにより、フレーム1～8が再生され、各フレームの待機時間は
 *    3フレームになります。
 *    $gamePlayer.playFrames(1,8,3) のようにスクリプトから呼び出すこともできます。
 *
 * ■ キャラクターのフレーム番号を変更する
 * ---------------------------------
 * 1. 上記の手順1と2を行います。
 * 2. 以下のスクリプトを実行します：toFrame(x)
 *    xには、キャラクターに表示させたいフレーム番号を指定します。
 *
 * ■ 1行スプライトシートを使用する
 * ---------------------------------
 * スプライトシートのファイル名を filename_fx.png の形式にします。
 * 例：Ice_f4.png
 * この場合、スプライトシートが4フレームで構成されていることを意味します。
 *
 * ■ 1行スプライトシートを左右反転する
 * ---------------------------------
 * 「Turn Left」を実行すると通常表示（反転なし）、
 * 「Turn Right」を実行すると左右反転表示になります。
 *
 * ■ キャラクターの待機／歩行／走行アニメーションを設定する
 * ---------------------------------
 * 1. 以下のような名前のファイルを用意します：
 * $hero_Walk.png または $hero_Walk_fx.png（x = フレーム数）
 * $hero_Idle.png または $hero_Idle_fx.png
 * $hero_Run.png または $hero_Run_fx.png
 * 2. Walk、Idle、Runというキーワードは、プラグインパラメータから
 *    別の名称に変更することもできます。
 *    例えば、WalkをMovingなどに変更できます。
 *
 * ■ イベントごとに待機／歩行／走行アニメーションの速度を設定する
 * ---------------------------------
 * イベントに以下のコメントを追加します：
 * <frame idle speed: 5> -> アニメーションの各フレームで5フレーム待機
 * <frame walk speed: x>
 * <frame run speed: x>
 * この設定は、プラグインパラメータの「Global Frame Speed」設定より
 * 優先されます。
 *
 * ■ 8方向スプライトを設定する
 * ---------------------------------
 * 1. 以下のような名前のファイルを用意します：
 * $Hero_8dir.png または $Hero_Idle_8dir.png または $Hero_Idle_8dir_f6.png
 * 2. 8方向スプライトシートは、以下の順番で配置する必要があります：
 * 下（2）（方向はテンキーの数字を参考にしてください）
 * 左下（1）
 * 右下（3）
 * 左（4）
 * 右（6）
 * 上（8）
 * 左上（7）
 * 右上（9）
 *
 * RPGツクール標準の順番：
 * 下（2）
 * 左（4）
 * 右（6）
 * 上（8）
 *
 * キャラクターが特定の方向を向いているか確認するには、
 * 条件分岐で以下を使用します：
 * checkDirection('player'/eventId, テンキーの方向番号)
 *
 * キャラクターが現在向いている方向を取得するには、
 * 以下のスクリプトを使用します：
 * getDirection('player'/eventId)
 *
 * ----------------------------------------------------------------------------
 * プリロード
 * ----------------------------------------------------------------------------
 * プリロード機能を使用している場合、キャッシュサイズを確認するには
 * コンソールで以下のコマンドを実行します：
 * PermanentImageCache.logDetailedCacheStatus();
 *
 * ファイルの画像サイズ（縦・横の寸法）が大きいほど、
 * 消費するメモリ容量（MB）も大きくなります。
 * このキャッシュは、ゲームをスムーズに動作させ、
 * キャラクター画像を変更した際のちらつきを防止するため、
 * メモリを消費する代わりに削除されることはありません。
 *
 * PCでは8GB以上のRAMを搭載している環境が一般的ですが、
 * モバイル端末では必ずしもそうではないため、
 * メモリ使用量には注意してください。
 *
 * まとめると、重要な素材をサブフォルダにまとめ、
 * そのサブフォルダをプリロードすることをおすすめします
 * （特にモバイル向けの最適化に効果的です）。
 * ----------------------------------------------------------------------------
 * サポートについては、Discordをご利用ください：
 * https://x.com/sanghendrix96
 * Discord：https://discord.gg/YKPscqHV8b   　* ----------------------------------------------------------------------------
 *
 * @param -----------s--s---s--2342-----
 * @text -----------------------
 * @default ---------------------
 * 
 * @param showDockButton
 * @text Show VFX Designer Button
 * @type boolean
 * @default true
 * @desc Show the VFX Designer button on the dock (test mode only)
 * 
 * @param -----------s--s---s-------
 * @text -----------------------
 * @default ---------------------
 *
 * @param PRELOAD
 *
 * @param -------------s--s--------
 * @text -----------------------
 * @default ---------------------
 *
 * @param Enable Preload
 * @text Enable Preload System
 * @desc Preload images. Improve performance and fix blinking issues when changing sprites (RPG Maker problem).
 * @type boolean
 * @default true
 *
 * @param Preload Folders
 * @text Image Preload Settings
 * @type struct<PreloadFolderList>
 * @desc Folders to preload. Only support preloading characters and pictures folder.
 * @default {"folders":"[\"img/pictures/Animation\",\"img/pictures/frames\",\"img/characters\"]"}
 *
 * @param -----------s--s----------
 * @text -----------------------
 * @default ---------------------
 *
 * @param BASIC SETTINGS
 *
 * @param -------------s----------
 * @text -----------------------
 * @default ---------------------
 *
 * @param Frame Keyword
 * @text Frame Keyword
 * @desc Keyword in character filename to identify frame count. Default is 'f' (e.g., _f8 means 8 frames)
 * @type string
 * @default f
 *
 * @param Frame Speed
 * @text Global Frame Speed
 * @default 1.1
 * @desc For files with extended frames (filename_fx). The higher the number, the quicker the character frames play
 *
 * @param Player Frame Modifier
 * @text Player Frame Speed
 * @type struct<PlayerFrameModifier>
 * @desc Frame speeds for player in different states. Leave empty to use Global Frame Speed
 * @default {"idleSpeed":"","walkSpeed":"","runSpeed":""}
 *
 * @param Nearest
 * @text Render Animation in Nearest
 * @desc True is best for pixel art, False is rendered for other type of arts
 * @type boolean
 * @default true
 *
 * @param -----------------------
 * @text -----------------------
 * @default ---------------------
 *
 * @param IDLE/MOVE GRAPHIC
 *
 * @param -----------------z------
 * @text -----------------------
 * @default ---------------------
 *
 * @param Enable Switch
 * @desc The feature is ON by default. To have more control over it, assign to a switch.
 * @type switch
 *
 * @param Animation Keywords
 * @text Animation Keywords
 * @type struct<AnimKeywords>
 * @desc Configure the keywords used to identify different animation states
 * @default {"walkName":"Walk","idleName":"Idle","runName":"Run"}
 *
 * @command showAnimationFromLibrary
 * @text Show VFX from Library
 * @desc Play a saved animation from the library
 *
 * @arg animationName
 * @text Animation Name
 * @desc Name of the animation saved in the library
 * @type string
 * @default
 *
 * @arg eventId
 * @text Target to Display
 * @desc The target to show the animation on. Support: eventID | player | this | eventID front | player front | this front
 * @type string
 * @default this
 *
 * @arg loopCount
 * @text Loop Count
 * @desc Number of times the animation should loop. Write "infinite" to loop forever
 * @type string
 * @default 1
 *
 * @arg stickMode
 * @text Stick Mode
 * @desc Animation to stay fixed at initial position instead of following the target
 * @type boolean
 * @default false
 *
 * @command showAnimatedPicture
 * @text Show VFX
 * @desc Displays an animation on an event or the player.
 *
 * @arg note
 * @text Note
 * @desc Does nothing. It's just a note incase you need it
 * @type string
 * @default
 *
 * @arg fps
 * @text FPS
 * @desc Speed of the animation in frames per second.
 * @type number
 * @min 1
 * @default 60
 *
 * @arg loopCount
 * @text Loop Count
 * @desc Number of times the animation should loop. Write "infinite" to loop forever.
 * @type string
 * @default 1
 *
 * @arg -----------------
 * @text ------------------
 * @type string
 * @default ------------------
 *
 * @arg animationSettings
 * @text Use Seperated Frames
 * @type struct<AnimationSettings>
 * @desc Display animation using seperate frame files. Leave empty if use Spritesheet.
 * @default
 *
 * @arg spritesheetSettings
 * @text Use Spritesheet
 * @type struct<SpritesheetSettings>
 * @desc Display animation using a spritesheet files. Leave empty if use Seperated Frames.
 * @default
 *
 * @arg ------------------
 * @text ------------------
 * @type string
 * @default ------------------
 *
 * @arg positionSettings
 * @text Position Settings
 * @type struct<PositionSettings>
 * @desc Settings for positioning the animation on events.
 * @default
 *
 * @arg visualSettings
 * @text Visual Settings
 * @type struct<VisualSettings>
 * @desc Visual properties like scale, opacity, and blend mode.
 * @default
 *
 * @arg transformSettings
 * @text Transform Settings
 * @type struct<FlipSettings>
 * @desc Settings for randomize property like rotating, mirror.
 * @default
 *
 * @arg bloomSettings
 * @text Bloom Settings
 * @type struct<BloomSettings>
 * @desc Settings for the bloom post-processing effect.
 * @default
 *
 * @arg soundSettings
 * @text Sound Settings
 * @type struct<SoundSettings>
 * @desc Settings for frame-specific sound effects. Most of the time you won't use this.
 * @default
 *
 * @command removeAnimation
 * @text Remove VFX
 * @desc Removes all VFX from a specific event or character.
 *
 * @arg eventId
 * @text Event ID
 * @desc The event ID to remove animations from. Use  this  for current event. Use  player  for game player.
 * @type string
 * @default this
 *
 * @arg notetag
 * @text Note/Name
 * @desc If specified, only removes VFX with this note/name. Leave empty to remove all VFX.
 * @type string
 * @default
 *
 * @arg effect
 * @text Removal Effect
 * @desc Apply an effect while removing the animation.
 * @type select
 * @option None
 * @value none
 * @option Fade Out
 * @value fadeOut
 * @option Scale Out
 * @value scaleOut
 * @default none
 *
 * @arg duration
 * @text Effect Duration
 * @desc How long the removal effect should take in frames (60 frames = ~1s). Empty = instant.
 * @type number
 * @default
 *
 * @command frameSpeedModifier
 * @text Frame Speed Modifier
 * @desc Modify the animation frame speed multiplier during gameplay
 *
 * @arg speedValue
 * @text Speed Value
 * @desc New frame speed modifier value. Higher = faster animations
 * @type number
 * @decimals 2
 * @min 0.1
 * @default 1.1
 */
/*~struct~AnimationSettings:
 * @param baseFilename
 * @text Base Filename
 * @desc The base filename of the frames (e.g., 'Windy_').
 * @type string
 *
 * @param frameCount
 * @text Frame Count
 * @desc The amount of frames (e.g., if 40 then the plugin will understand there are files Windy_1, Windy_2,... Windy_40).
 * @type number
 * @min 1
 * @default 1
 */
/*~struct~SpritesheetSettings:
 * @param spritesheetFile
 * @text Spritesheet File
 * @desc Select spritesheet file
 * @type file
 * @dir img/pictures/
 * @default
 *
 * @param row
 * @text Number of Rows
 * @desc Number of rows in spritesheet.
 * @type number
 * @min 1
 * @default 1
 *
 * @param column
 * @text Number of Columns
 * @desc Number of columns in spritesheet.
 * @type number
 * @min 1
 * @default 1
 *
 * @param frameRange
 * @text Only Play Range
 * @desc Play only specific frame range (e.g. "1-15" plays frames 1 to 15). Leave empty to play all frames.
 * @type string
 * @default
 */

/*~struct~PositionSettings:
 * @param eventId
 * @text Event to Display
 * @desc Support: eventID | player | this | <notetag> | eventID front | player front | this front
 * @type string
 * @default this
 *
 * @param offsetX
 * @text Offset X
 * @desc Horizontal offset for the animation relative to the target's position.
 * @type number
 * @default 0
 * @min -9999
 *
 * @param offsetY
 * @text Offset Y
 * @desc Vertical offset for the animation relative to the target's position.
 * @type number
 * @default 0
 * @min -9999
 *
 * @param zIndex
 * @text Z-Index Layer
 * @desc 0-3: Below characters. 4-8: above characters. 9: above everything. Use  auto  to use event's z-index.
 * @type string
 * @default auto
 *
 * @param origin
 * @text Origin Point
 * @desc Sets the origin point of the animation.
 * @type select
 * @option Center
 * @value center
 * @option Top Middle
 * @value top
 * @option Bottom Center
 * @value bottom
 * @default center
 *
 * @param stickMode
 * @text Stick Mode
 * @desc If true, animation will stay fixed at initial position instead of following the target.
 * @type boolean
 * @default false
 */

/*~struct~VisualSettings:
 * @param scalePercent
 * @text Scale Percentage
 * @desc Scale of the animation in percentage.
 * @type number
 * @default 100
 * @min 0
 * @max 999
 *
 * @param opacity
 * @text Opacity
 * @desc Opacity of the animation (0-255).
 * @type number
 * @default 255
 * @min 0
 * @max 255
 *
 * @param hue
 * @text Hue
 * @desc Hue adjustment for the animation (-180 to 180).
 * @type number
 * @min -180
 * @max 180
 * @default 0
 *
 * @param blendMode
 * @text Blend Mode
 * @desc Blend mode for the animation.
 * @type select
 * @option Normal
 * @value Normal
 * @option Screen
 * @value Screen
 * @option Add
 * @value Add
 * @option Multiply
 * @value Multiply
 * @default Normal
 *
 * @param playInReverse
 * @text Play in Reverse
 * @desc If true, the animation will play backwards from end to start.
 * @type boolean
 * @default false
 */

/*~struct~FlipSettings:
 * @param flip
 * @text Flip X
 * @desc If true, the animation will be mirrored horizontally.
 * @type boolean
 * @default false
 *
 * @param flipY
 * @text Flip Y
 * @desc If true, the animation will be mirrored vertically.
 * @type boolean
 * @default false
 *
 * @param randomFlipX
 * @text Random Flip X
 * @desc If true, the animation will be randomly mirrored horizontally.
 * @type boolean
 * @default false
 *
 * @param randomFlipY
 * @text Random Flip Y
 * @desc If true, the animation will be randomly mirrored vertically.
 * @type boolean
 * @default false
 *
 * @param rotation
 * @text Rotation
 * @desc Rotation of the animation in degrees.
 * @type number
 * @default 0
 *
 * @param randomRotation
 * @text Random Rotation
 * @desc Applies random rotation to the animation
 * @type boolean
 * @default false
 *
 * @param ralkdfhowiyrmdf
 * @text ---------------------
 * @param xcvsf23
 * @text ANIMATION
 * @param asdasczxc
 * @text ---------------------
 *
 * @param openingAnimation
 * @text Opening Animation
 * @desc Apply an effect when the animation starts playing
 * @type select
 * @option None
 * @value none
 * @option Fade In
 * @value fadeIn
 * @option Scale In
 * @value scaleIn
 * @option Scale In - Width Only
 * @value scaleInWidth
 * @option Scale In - Height Only
 * @value scaleInHeight
 * @default none
 *
 * @param endingAnimation
 * @text Ending Animation
 * @desc Apply an effect when the animation is about to end (will start at the end of first loop)
 * @type select
 * @option None
 * @value none
 * @option Fade Out
 * @value fadeOut
 * @option Scale Out
 * @value scaleOut
 * @default none
 *
 * @param animationDuration
 * @text Animation Duration
 * @desc Duration for both opening and ending animation in frames (60 frames = ~1s)
 * @type number
 * @default 30
 */

/*~struct~BloomSettings:
 * @param bloomEffect
 * @text Bloom Effect
 * @desc Apply a bloom effect to the animation.
 * @type boolean
 * @default false
 *
 * @param blurAmount
 * @text Blur Amount
 * @desc Amount of blur. Control how far the blur spread.
 * @type number
 * @min 1
 * @default 15
 *
 * @param intensity
 * @text Intensity
 * @desc Intensity of the bloom effect.
 * @type number
 * @min 0
 * @default 255
 *
 * @param tintColor
 * @text Tint Color
 * @desc Tint color (hex code). Leave default if don't know what to do.
 * @type text
 * @default #FFFFFF
 */

/*~struct~SoundSettings:
 * @param sfxSettings
 * @text SFX Settings
 * @type struct<SFXSetting>[]
 * @desc Settings for playing sound effects at specific frames.
 * @default []
 */
/*~struct~SFXSetting:
 * @param frame
 * @text Frame Number
 * @type number
 * @desc The frame number at which the sound effect will play.
 * @default 1
 * @min 1
 *
 * @param sfxFile
 * @text SFX File
 * @type file
 * @dir audio/se
 * @desc The sound effect file to play.
 *
 * @param volume
 * @text Volume
 * @type number
 * @desc Volume of the sound effect (0-100).
 * @default 90
 * @min 0
 * @max 100
 *
 * @param pitch
 * @text Pitch
 * @type number
 * @desc Pitch of the sound effect (50-150).
 * @default 100
 * @min 50
 * @max 150
 */
/*~struct~PreloadFolderList:
 * @param folders
 * @text Folders to Preload
 * @type string[]
 * @desc e.g. img/characters or img/pictures or img/pictures/frames (must have if use Show Animation seperate files method)
 * @default []
 */
/*~struct~AnimKeywords:
 * @param walkName
 * @text Walk Animation Keyword
 * @type text
 * @desc Keyword in character filename to identify walking animation
 * @default Walk
 *
 * @param idleName
 * @text Idle Animation Keyword
 * @type text
 * @desc Keyword in character filename to identify idle animation
 * @default Idle
 *
 * @param runName
 * @text Run Animation Keyword
 * @type text
 * @desc Keyword in character filename to identify running animation
 * @default Run
 */
/*~struct~PlayerFrameModifier:
 * @param idleSpeed
 * @text Idle Animation Speed
 * @type number
 * @decimals 2
 * @desc Leave empty to use Global Frame Speed
 * @default
 *
 * @param walkSpeed
 * @text Walk Animation Speed
 * @type number
 * @decimals 2
 * @desc Leave empty to use Global Frame Speed
 * @default
 *
 * @param runSpeed
 * @text Run Animation Speed
 * @type number
 * @decimals 2
 * @desc Leave empty to use Global Frame Speed
 * @default
 */

var Imported = Imported || {};
Imported.Hendrix_Animation_Solution = true;

var detectedIdleGraphic = null;
var detectedWalkGraphic = null;
var detectedRunGraphic = null;

(function () {
  const pluginName = "Hendrix_Animation_Solution";
  const parameters = PluginManager.parameters(pluginName);
  const showDockButton = parameters["showDockButton"] !== "false";
  const isNearest = parameters["Nearest"] === "true";
  const enableSwitch = Number(parameters["Enable Switch"] || 0);
  const enablePreload = parameters["Enable Preload"] === "true";
  const frameKeyword = parameters["Frame Keyword"] || "f";
  const preloadSettings = parameters["Preload Folders"]
    ? JSON.parse(parameters["Preload Folders"])
    : { folders: [] };
  const animKeywordsParam = parameters["Animation Keywords"]
    ? JSON.parse(parameters["Animation Keywords"])
    : { walkName: "Walk", idleName: "Idle", runName: "Run" };
  const playerFrameModifierParam = parameters["Player Frame Modifier"]
    ? JSON.parse(parameters["Player Frame Modifier"])
    : { idleSpeed: "", walkSpeed: "", runSpeed: "" };
  let PLAYER_IDLE_SPEED = playerFrameModifierParam.idleSpeed
    ? Number(playerFrameModifierParam.idleSpeed)
    : null;
  let PLAYER_WALK_SPEED = playerFrameModifierParam.walkSpeed
    ? Number(playerFrameModifierParam.walkSpeed)
    : null;
  let PLAYER_RUN_SPEED = playerFrameModifierParam.runSpeed
    ? Number(playerFrameModifierParam.runSpeed)
    : null;
  let IDLE_KEYWORD = animKeywordsParam.idleName || "";
  let WALK_KEYWORD = animKeywordsParam.walkName || "";
  let RUN_KEYWORD = animKeywordsParam.runName || "";
  let preloadFolders = [];
  let sharedBloomFilter = null;
  let bloomFilterUsers = 0;

  const BLEND_MODES = {
    Screen: PIXI.BLEND_MODES.SCREEN,
    Add: PIXI.BLEND_MODES.ADD,
    Multiply: PIXI.BLEND_MODES.MULTIPLY,
    Normal: PIXI.BLEND_MODES.NORMAL,
  };

  const FRONT_DIRECTION_OFFSETS = {
    1: { dx: -1, dy: 1 },
    2: { dx: 0, dy: 1 },
    3: { dx: 1, dy: 1 },
    4: { dx: -1, dy: 0 },
    6: { dx: 1, dy: 0 },
    7: { dx: -1, dy: -1 },
    8: { dx: 0, dy: -1 },
    9: { dx: 1, dy: -1 },
  };

  function parseFrontTarget(rawEventId) {
    const eventId = String(rawEventId || "").trim();
    const match = eventId.match(/^(.*?)\s+front$/i);
    if (match) {
      return { eventId: match[1].trim(), showInFront: true };
    }
    return { eventId, showInFront: false };
  }

  function getFrontOffset(target) {
    const dir = FRONT_DIRECTION_OFFSETS[target.direction()] || FRONT_DIRECTION_OFFSETS[2];
    return {
      x: ($gameMap.tileWidth() / 2) * dir.dx,
      y: ($gameMap.tileHeight() / 2) * dir.dy,
    };
  }

  try {
    preloadFolders = JSON.parse(preloadSettings.folders || "[]");
  } catch (e) {
    console.error("Error parsing preload folders:", e);
    preloadFolders = [];
  }

  class PermanentImageCache {
    static _permanentCache = {};
    static _preloadedPaths = new Set();
    static _loadingStatus = {
      total: 0,
      loaded: 0,
      failed: 0,
    };

    static load(folder, filename) {
      if (!filename) {
        return ImageManager._emptyBitmap;
      }

      filename = filename.replace(/\\/g, "/");
      const url = this._makePath(folder, filename);

      if (!enablePreload) {
        return ImageManager.loadBitmap(folder, filename);
      }

      if (!this._permanentCache[url]) {
        this._loadingStatus.total++;
        const bitmap = Bitmap.load(url);

        bitmap.addLoadListener(() => {
          if (bitmap.isError()) {
            this._loadingStatus.failed++;
            //if (Utils.isOptionValid('test')) {
            //    console.warn(`Failed to load image: ${url}`);
            //}
            // Remove from cache if failed
            delete this._permanentCache[url];
            this._preloadedPaths.delete(url);
          } else {
            this._loadingStatus.loaded++;
            //if (Utils.isOptionValid('test')) {
            //    console.log(`Loaded image: ${url}`);
            //}
          }
          this._updateLoadingProgress();
        });

        //if (Utils.isOptionValid('test')) {
        //    console.log(`Adding to cache: ${url}`);
        //}

        this._permanentCache[url] = bitmap;
        this._preloadedPaths.add(url);
      } else {
        //if (Utils.isOptionValid('test')) {
        //    console.log(`Serving from cache: ${url}`);
        //}
      }

      return this._permanentCache[url];
    }

    static _makePath(folder, filename) {
      return folder + Utils.encodeURI(filename) + ".png";
    }

    static isPreloaded(folder, filename) {
      const url = this._makePath(folder, filename);
      return this._preloadedPaths.has(url);
    }

    static _updateLoadingProgress() {
      const total = this._loadingStatus.total;
      const loaded = this._loadingStatus.loaded;
      const failed = this._loadingStatus.failed;
      const progress = (((loaded + failed) / total) * 100).toFixed(1);

      if (Utils.isOptionValid("test")) {
        console.log(
          `Preload progress: ${progress}% (${loaded} loaded, ${failed} failed, ${total} total)`
        );
      }

      if (loaded + failed === total) {
        console.log(
          `Preload complete! Successfully loaded ${loaded}/${total} images.`
        );
        if (failed > 0) {
          console.warn(`Failed to load ${failed} images.`);
        }
      }
    }

    static getLoadingStatus() {
      return { ...this._loadingStatus };
    }

    static cleanInvalidImages() {
      for (const url in this._permanentCache) {
        const bitmap = this._permanentCache[url];
        if (bitmap.isError()) {
          delete this._permanentCache[url];
          this._preloadedPaths.delete(url);
          console.warn(`Removed invalid image from permanent cache: ${url}`);
        }
      }
    }

    static getDetailedCacheInfo() {
      const details = {
        totalMemoryMB: 0,
        files: [],
        summary: {
          totalFiles: 0,
          bySize: {
            huge: { count: 0, size: 0 }, // > 16MB
            large: { count: 0, size: 0 }, // 4-16MB
            medium: { count: 0, size: 0 }, // 1-4MB
            small: { count: 0, size: 0 }, // < 1MB
          },
        },
      };

      for (const url in this._permanentCache) {
        const bitmap = this._permanentCache[url];
        if (bitmap && bitmap.baseTexture) {
          const width = bitmap.width;
          const height = bitmap.height;
          const memoryMB = (width * height * 4) / (1024 * 1024);

          details.totalMemoryMB += memoryMB;

          const fileInfo = {
            url: url,
            dimensions: `${width}x${height}`,
            memoryMB: memoryMB.toFixed(2),
          };
          details.files.push(fileInfo);

          if (memoryMB > 16) {
            details.summary.bySize.huge.count++;
            details.summary.bySize.huge.size += memoryMB;
          } else if (memoryMB > 4) {
            details.summary.bySize.large.count++;
            details.summary.bySize.large.size += memoryMB;
          } else if (memoryMB > 1) {
            details.summary.bySize.medium.count++;
            details.summary.bySize.medium.size += memoryMB;
          } else {
            details.summary.bySize.small.count++;
            details.summary.bySize.small.size += memoryMB;
          }
        }
      }

      details.summary.totalFiles = details.files.length;
      details.files.sort(
        (a, b) => parseFloat(b.memoryMB) - parseFloat(a.memoryMB)
      );

      return details;
    }

    static logDetailedCacheStatus() {
      const details = this.getDetailedCacheInfo();
      console.log(`=== Cache Analysis ===`);
      console.log(`Total Memory Usage: ${details.totalMemoryMB.toFixed(2)} MB`);
      console.log(`Total Files: ${details.summary.totalFiles}`);

      console.log("\n=== Size Categories ===");
      console.log(
        "Huge (>16MB):",
        `${details.summary.bySize.huge.count} files, ` +
        `${details.summary.bySize.huge.size.toFixed(2)} MB`
      );
      console.log(
        "Large (4-16MB):",
        `${details.summary.bySize.large.count} files, ` +
        `${details.summary.bySize.large.size.toFixed(2)} MB`
      );
      console.log(
        "Medium (1-4MB):",
        `${details.summary.bySize.medium.count} files, ` +
        `${details.summary.bySize.medium.size.toFixed(2)} MB`
      );
      console.log(
        "Small (<1MB):",
        `${details.summary.bySize.small.count} files, ` +
        `${details.summary.bySize.small.size.toFixed(2)} MB`
      );

      console.log("\n=== Top 10 Largest Files ===");
      details.files.slice(0, 10).forEach((file) => {
        console.log(`${file.url}: ${file.dimensions} - ${file.memoryMB} MB`);
      });
    }
  }

  class ImagePreloader {
    static async generateManifest() {
      if (!Utils.isNwjs()) {
        console.warn(
          "Manifest can't be generated on mobile. It'll load the generated file from Windows tho."
        );
        return;
      }

      const fs = require("fs");
      const path = require("path");
      const manifest = {};

      const getAllFiles = (dirPath, arrayOfFiles = []) => {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
          const fullPath = path.join(dirPath, file);
          if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
          } else {
            if (file.toLowerCase().match(/\.(png|jpg|webp)$/)) {
              const relativePath = path.relative(process.cwd(), fullPath);
              arrayOfFiles.push(relativePath);
            }
          }
        });

        return arrayOfFiles;
      };

      for (const folderPath of preloadFolders) {
        const basePath = path.join(process.cwd(), folderPath);

        try {
          if (!fs.existsSync(basePath)) {
            console.warn(`Folder not found: ${basePath}`);
            continue;
          }

          const files = getAllFiles(basePath);
          manifest[folderPath] = files.map((file) => {
            const relativePath = path.relative(folderPath, file);
            return relativePath.replace(/\.[^/.]+$/, "");
          });
        } catch (error) {
          console.error(`Error processing folder ${folderPath}:`, error);
        }
      }

      // Save manifest
      try {
        const manifestPath = path.join(process.cwd(), "manifest.json");
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log("Manifest generated successfully at: " + manifestPath);
      } catch (error) {
        console.error("Error saving manifest:", error);
      }
    }

    static async preloadFolder(folderPath) {
      if (Utils.isNwjs()) {
        const fs = require("fs");
        const path = require("path");
        const base = path.join(process.cwd(), folderPath);

        const getAllFiles = (dirPath, arrayOfFiles = []) => {
          const files = fs.readdirSync(dirPath);

          files.forEach((file) => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
              arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
              if (file.toLowerCase().match(/\.(png|jpg|webp)$/)) {
                arrayOfFiles.push(path.relative(base, fullPath));
              }
            }
          });

          return arrayOfFiles;
        };

        try {
          if (!fs.existsSync(base)) {
            console.warn(`Folder not found: ${base}`);
            return;
          }

          const files = getAllFiles(base);
          for (const file of files) {
            const filename = file.replace(/\.[^/.]+$/, "");
            if (!PermanentImageCache.isPreloaded(folderPath + "/", filename)) {
              PermanentImageCache.load(folderPath + "/", filename);
            }
          }
        } catch (error) {
          console.error(`Error preloading folder ${folderPath}:`, error);
        }
      } else {
        try {
          const response = await fetch("manifest.json");
          const manifest = await response.json();

          console.log("=== Manifest.json successfully loaded! ===");
          //console.log('Manifest content:', JSON.stringify(manifest, null, 2));

          const folderFiles = manifest[folderPath] || [];

          for (const filename of folderFiles) {
            if (!PermanentImageCache.isPreloaded(folderPath + "/", filename)) {
              PermanentImageCache.load(folderPath + "/", filename);
            }
          }
        } catch (error) {
          console.error(`Error loading manifest or preloading files:`, error);
        }
      }
    }

    static preloadAllConfiguredFolders() {
      for (const folder of preloadFolders) {
        this.preloadFolder(folder);
      }
    }
  }

  const _ImageManager_loadPicture = ImageManager.loadPicture;
  ImageManager.loadPicture = function (filename) {
    if (enablePreload) {
      if (!filename) return ImageManager._emptyBitmap;
      const folder = filename.split("/")[0];
      if (preloadFolders.includes(folder)) {
        return PermanentImageCache.load("img/pictures/", filename);
      }
    }
    return _ImageManager_loadPicture.call(this, filename);
  };

  // Basically just override ImageManager loadPicture and Character. Preload from other folder doesn't do anything.
  const _ImageManager_loadCharacter = ImageManager.loadCharacter;
  ImageManager.loadCharacter = function (filename) {
    if (enablePreload && preloadFolders.includes("img/characters")) {
      if (!filename) return ImageManager._emptyBitmap;
      return PermanentImageCache.load("img/characters/", filename);
    }
    return _ImageManager_loadCharacter.call(this, filename);
  };

  const _Scene_Boot_loadSystemImages = Scene_Boot.prototype.loadSystemImages;
  Scene_Boot.prototype.loadSystemImages = function () {
    _Scene_Boot_loadSystemImages.call(this);
    if (enablePreload) {
      ImagePreloader.preloadAllConfiguredFolders();
      ImagePreloader.generateManifest();
      if (Utils.isOptionValid("test")) {
        console.log("Starting image preload...");
      }
    }
  };

  const _Scene_Boot_isReady = Scene_Boot.prototype.isReady;
  Scene_Boot.prototype.isReady = function () {
    if (enablePreload) {
      // Check preload status
      const status = PermanentImageCache.getLoadingStatus();
      if (status.total > 0 && status.loaded + status.failed < status.total) {
        return false;
      }
    }
    return _Scene_Boot_isReady.call(this);
  };

  PluginManager.registerCommand(
    pluginName,
    "showAnimationFromLibrary",
    function (args) {
      const animationName = args.animationName;
      const loopCount =
        args.loopCount && args.loopCount.toLowerCase() === "infinite"
          ? Infinity
          : Number(args.loopCount || 1);
      const stickMode = String(args.stickMode) === "true";

      const parsedTarget = parseFrontTarget(args.eventId || "this");
      let eventId = parsedTarget.eventId || "this";
      const showInFront = parsedTarget.showInFront;

      let targetEventId = eventId;

      if (eventId.toLowerCase() === "this") {
        targetEventId = this.eventId();
      } else if (eventId.toLowerCase() === "player") {
        targetEventId = "player";
      } else {
        targetEventId = Number(eventId);
      }

      getAnimationFromLibrary(animationName).then((animData) => {
        if (!animData) {
          return;
        }

        let target;
        if (targetEventId === "player") {
          target = $gamePlayer;
        } else {
          target = $gameMap.event(targetEventId);
        }

        if (!target) return;

        let frontOffsetX = 0;
        let frontOffsetY = 0;
        if (showInFront) {
          const front = getFrontOffset(target);
          frontOffsetX = front.x;
          frontOffsetY = front.y;
        }

        const bitmap = enablePreload
          ? PermanentImageCache.load("img/pictures/", animData.spritesheetFile)
          : ImageManager.loadPicture(animData.spritesheetFile);

        bitmap.addLoadListener(() => {
          const allFrames = AnimatedPictureManager.createSpritesheetFrames(
            bitmap,
            animData.rows,
            animData.columns
          );

          let zIndex;
          if (animData.zIndex === "auto") {
            const targetSprite =
              SceneManager._scene._spriteset.findCharacterSprite(target);
            zIndex = targetSprite ? targetSprite.z : 3;
          } else {
            zIndex = Number(animData.zIndex);
          }

          const blendMode = BLEND_MODES[animData.blendMode] || PIXI.BLEND_MODES.NORMAL;

          const rotation = animData.randomRotation
            ? Math.random() * 360
            : (animData.rotation || 0);

          const animatedPicture = new AnimatedPicture(
            allFrames,
            animData.fps || 60,
            target,
            loopCount,
            (animData.offsetX || 0) + frontOffsetX,
            (animData.offsetY || 0) + frontOffsetY,
            [],
            animData.scale || 100,
            animData.opacity || 255,
            animData.flip || false,
            animData.flipY || false,
            animData.randomFlipX || false,
            animData.randomFlipY || false,
            rotation,
            blendMode,
            zIndex,
            animData.bloomEffect || false,
            animData.blurAmount || 15,
            animData.tintColor || "#FFFFFF",
            animData.intensity || 255,
            animData.hue || 0,
            () => AnimatedPictureManager.decrementAnimationCount(targetEventId),
            bitmap,
            stickMode,
            "library_" + animationName,
            animData.playInReverse || false,
            "center",
            animData.openingAnimation || "none",
            animData.animationDuration || 30,
            animData.endingAnimation || "none"
          );

          if (SceneManager._scene instanceof Scene_Map) {
            SceneManager._scene.addAnimatedPicture(animatedPicture);
            AnimatedPictureManager.addAnimatedPicture(animatedPicture);
          }
        });
      });
    }
  );

  PluginManager.registerCommand(
    pluginName,
    "showAnimatedPicture",
    function (args) {
      const animation = JSON.parse(
        args.animationSettings || '{"baseFilename":"","frameCount":1}'
      );
      const spritesheet = JSON.parse(
        args.spritesheetSettings ||
        '{"spritesheetFile":"","row":1,"column":1,"frameRange":""}'
      );
      const position = JSON.parse(
        args.positionSettings ||
        '{"eventId":"0","offsetX":0,"offsetY":0,"zIndex":8,"origin":"center","stickMode":false}'
      );
      const visual = JSON.parse(
        args.visualSettings ||
        '{"scalePercent":100,"opacity":255,"hue":0,"blendMode":"Normal","playInReverse":false}'
      );
      const transform = JSON.parse(
        args.transformSettings ||
        '{"flip":false,"flipY":false,"randomFlipX":false,"randomFlipY":false,"rotation":0,"randomRotation":false,"openingAnimation":"none","endingAnimation":"none","animationDuration":30}'
      );
      const bloom = JSON.parse(
        args.bloomSettings ||
        '{"bloomEffect":false,"blurAmount":15,"intensity":255,"tintColor":"#FFFFFF"}'
      );
      const sound = JSON.parse(args.soundSettings || '{"sfxSettings":[]}');

      if (typeof sound.sfxSettings === 'string') {
        sound.sfxSettings = JSON.parse(sound.sfxSettings);
      }

      if (Array.isArray(sound.sfxSettings)) {
        sound.sfxSettings = sound.sfxSettings.map(sfx => {
          if (typeof sfx === 'string') {
            return JSON.parse(sfx);
          }
          return sfx;
        });
      }

      const note = args.note || "";
      let loopCount;
      if (args.loopCount && args.loopCount.toLowerCase() === "infinite") {
        loopCount = Infinity;
      } else {
        loopCount = Number(args.loopCount || 1);
      }

      let frames = [];
      let bitmap = null;

      if (enablePreload) {
        if (!spritesheet.spritesheetFile) {
          const baseFilename = String(animation.baseFilename);
          const frameCount = Number(animation.frameCount);
          for (let i = 1; i <= frameCount; i++) {
            frames.push(
              PermanentImageCache.load(
                "img/pictures/",
                `frames/${baseFilename}${i}`
              )
            );
          }
        } else {
          bitmap = PermanentImageCache.load(
            "img/pictures/",
            spritesheet.spritesheetFile
          );
        }
      } else {
        if (!spritesheet.spritesheetFile) {
          const baseFilename = String(animation.baseFilename);
          const frameCount = Number(animation.frameCount);
          for (let i = 1; i <= frameCount; i++) {
            frames.push(ImageManager.loadPicture(`frames/${baseFilename}${i}`));
          }
        } else {
          bitmap = ImageManager.loadPicture(spritesheet.spritesheetFile);
        }
      }

      const parsedPositionTarget = parseFrontTarget(position.eventId);
      let eventId = parsedPositionTarget.eventId || "0";
      const showInFront = parsedPositionTarget.showInFront;
      let targets = [];
      if (eventId.startsWith("<") && eventId.endsWith(">")) {
        const notetag = eventId.slice(1, -1);

        const events = $gameMap.events();
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          if (event && event.event()) {
            const eventData = event.event();
            if (eventData.note && eventData.note.includes(`<${notetag}>`)) {
              targets.push(event);
            }
          }
        }

        if (targets.length === 0) {
          return;
        }
      } else if (eventId === "0" || eventId.toLowerCase() === "this") {
        eventId = this.eventId();
        targets.push($gameMap.event(eventId));
      } else if (eventId.toLowerCase() === "player") {
        eventId = "player";
        targets.push($gamePlayer);
      } else {
        eventId = Number(eventId);
        if (!$gameMap.event(eventId)) {
          return;
        }
        targets.push($gameMap.event(eventId));
      }

      let zIndex = position.zIndex;
      if (zIndex === "auto" && targets.length > 0) {
        // Get the z-index from the target event/player
        const target = targets[0];
        if (target instanceof Game_Event || target instanceof Game_Player) {
          zIndex = target.screenZ();
        } else {
          zIndex = 3;
        }
      } else {
        zIndex = Number(position.zIndex);
      }

      const commonParams = {
        fps: Number(args.fps || 60),
        loopCount: loopCount,
        offsetX: Number(position.offsetX),
        offsetY: Number(position.offsetY),
        stickMode: String(position.stickMode) === "true",
        scalePercent: Number(visual.scalePercent),
        opacity: Number(visual.opacity),
        flip: String(transform.flip) === "true",
        flipY: String(transform.flipY) === "true",
        randomFlipX: String(transform.randomFlipX) === "true",
        randomFlipY: String(transform.randomFlipY) === "true",
        rotation:
          transform.randomRotation === "true"
            ? Math.random() * 360
            : Number(transform.rotation),
        blendMode: BLEND_MODES[visual.blendMode] || PIXI.BLEND_MODES.NORMAL,
        zIndex: zIndex,
        bloomEffect: String(bloom.bloomEffect) === "true",
        blurAmount: Number(bloom.blurAmount),
        tintColor: bloom.tintColor,
        intensity: Number(bloom.intensity),
        hue: Number(visual.hue),
        playInReverse: String(visual.playInReverse) === "true",
        sfxSettings: Array.isArray(sound.sfxSettings) ? sound.sfxSettings : [],
        origin: position.origin || "center",
        openingAnimation: transform.openingAnimation || "none",
        endingAnimation: transform.endingAnimation || "none",
        animationDuration: Number(transform.animationDuration || 30),
        frameRange: spritesheet.frameRange || "",
      };

      const handleAnimation = (frames) => {
        targets.forEach((target) => {
          const animatedPicture = new AnimatedPicture(
            frames,
            commonParams.fps,
            target,
            commonParams.loopCount,
            commonParams.offsetX,
            commonParams.offsetY,
            commonParams.sfxSettings,
            commonParams.scalePercent,
            commonParams.opacity,
            commonParams.flip,
            commonParams.flipY,
            commonParams.randomFlipX,
            commonParams.randomFlipY,
            commonParams.rotation,
            commonParams.blendMode,
            commonParams.zIndex,
            commonParams.bloomEffect,
            commonParams.blurAmount,
            commonParams.tintColor,
            commonParams.intensity,
            commonParams.hue,
            () => AnimatedPictureManager.decrementAnimationCount(eventId),
            bitmap,
            commonParams.stickMode,
            note,
            commonParams.playInReverse,
            commonParams.origin,
            commonParams.openingAnimation,
            commonParams.animationDuration,
            commonParams.endingAnimation
          );

          if (SceneManager._scene instanceof Scene_Map) {
            SceneManager._scene.addAnimatedPicture(animatedPicture);
            AnimatedPictureManager.addAnimatedPicture(animatedPicture);
          }
        });
      };

      const isSpriteTrulyReady = (callback) => {
        const spriteset = SceneManager._scene && SceneManager._scene._spriteset;

        if (!spriteset) {
          setTimeout(() => isSpriteTrulyReady(callback), 16);
          return;
        }

        const allSpritesReady = targets.every((target) => {
          const sprite = spriteset.findCharacterSprite(target);
          return sprite && sprite.bitmap && sprite.bitmap.isReady();
        });

        if (allSpritesReady) {
          callback();
        } else {
          setTimeout(() => isSpriteTrulyReady(callback), 16);
        }
      };

      if (spritesheet.spritesheetFile) {
        bitmap.addLoadListener(() => {
          let allFrames = AnimatedPictureManager.createSpritesheetFrames(
            bitmap,
            Number(spritesheet.row),
            Number(spritesheet.column)
          );

          if (
            commonParams.frameRange &&
            commonParams.frameRange.trim() !== ""
          ) {
            const rangeMatch = commonParams.frameRange.match(/^(\d+)-(\d+)$/);
            if (rangeMatch) {
              const startFrame = Number(rangeMatch[1]);
              const endFrame = Number(rangeMatch[2]);

              if (
                startFrame >= 1 &&
                endFrame >= startFrame &&
                endFrame <= allFrames.length
              ) {
                allFrames = allFrames.slice(startFrame - 1, endFrame);
              }
            }
          }

          isSpriteTrulyReady(() => handleAnimation(allFrames));
        });
      } else {
        isSpriteTrulyReady(() => handleAnimation(frames));
      }
    }
  );

  PluginManager.registerCommand(pluginName, "removeAnimation", function (args) {
    let targetEventId;

    if (args.eventId.toLowerCase() === "this") {
      targetEventId = this._eventId;
    } else if (args.eventId.toLowerCase() === "player") {
      targetEventId = $gamePlayer;
    } else {
      targetEventId = Number(args.eventId);
    }

    const animationsToRemove = AnimatedPictureManager._animatedPictures.filter(
      (pic) => {
        const targetMatches =
          pic.target ===
          (targetEventId === $gamePlayer
            ? $gamePlayer
            : $gameMap.event(targetEventId));

        if (args.notetag) {
          const exactMatch = pic.note === args.notetag;
          const libraryMatch = pic.note === "library_" + args.notetag;
          return targetMatches && (exactMatch || libraryMatch);
        }

        return targetMatches;
      }
    );

    if (
      args.effect &&
      args.effect !== "none" &&
      args.duration &&
      Number(args.duration) > 0
    ) {
      const duration = Math.max(1, Number(args.duration));

      if (args.effect === "fadeOut") {
        animationsToRemove.forEach((animation) => {
          animation.applyFadeOut(duration);
        });
      } else if (args.effect === "scaleOut") {
        animationsToRemove.forEach((animation) => {
          animation.applyScaleOut(duration);
        });
      }
    } else {
      animationsToRemove.forEach((animation) => {
        animation.dispose();
      });
    }
  });

  class AnimatedPicture {
    constructor(
      frames,
      fps,
      target,
      loopCount = 1,
      offsetX = 0,
      offsetY = 0,
      sfxSettings = [],
      scalePercent = 100,
      opacity = 255,
      flip = false,
      flipY = false,
      randomFlipX = false,
      randomFlipY = false,
      rotation = 0,
      blendMode = PIXI.BLEND_MODES.NORMAL,
      zIndex = 8,
      bloomEffect = false,
      blurAmount = 4,
      tintColor = "#FFFFFF",
      intensity = 0.5,
      hue = 0,
      onCompletion,
      bitmap = null,
      stickMode = false,
      note = "",
      playInReverse = false,
      origin = "center",
      openingAnimation = "none",
      animationDuration = 30,
      endingAnimation = "none"
    ) {
      this.sprite = new Sprite();
      this.setOrigin(origin);
      if (this.sprite.texture && isNearest) {
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
      }

      this.openingAnimation = openingAnimation;
      this.endingAnimation = endingAnimation;
      this.animationDuration = Math.max(1, animationDuration);
      this.openingElapsed = 0;
      this.isPlayingOpeningAnimation = openingAnimation !== "none";
      this.isPlayingEndingAnimation = false;

      if (this.isPlayingOpeningAnimation) {
        if (openingAnimation === "fadeIn") {
          this.originalOpacity = opacity;
          opacity = 0;
        } else if (openingAnimation === "scaleIn") {
          this.originalScalePercent = scalePercent;
          scalePercent = 1;
        } else if (openingAnimation === "scaleInWidth") {
          this.originalScalePercent = scalePercent;
          scalePercent = 1;
        } else if (openingAnimation === "scaleInHeight") {
          this.originalScalePercent = scalePercent;
          scalePercent = 1;
        }
      }

      // Store the current character name/index for change detection
      if (this.target) {
        this._lastCharacterName = this.target._characterName;
        this._lastCharacterIndex = this.target._characterIndex;
      }

      this.frames = frames;
      this.fps = fps;
      this.currentFrameIndex = playInReverse ? this.frames.length - 1 : 0;
      this.frameTime = 1000 / fps;
      this.elapsedTime = 0;
      this.completedLoops = 0;
      this.loopCount = loopCount;
      this.playInReverse = playInReverse;
      this.note = note;

      this.target = target;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.lastKnownX = null;
      this.lastKnownY = null;
      this.stickMode = stickMode;

      this.updateTargetSprite();
      const sprite = this.targetSprite;

      if (sprite && sprite.bitmap && sprite.bitmap.isReady()) {
        this.initialSpriteWidth = sprite.width;
        this.initialSpriteHeight = sprite.height;
      } else {
        this.initialSpriteWidth = $gameMap.tileWidth();
        this.initialSpriteHeight = $gameMap.tileHeight();
      }

      this.bitmap = bitmap;
      this.flip = randomFlipX ? Math.random() < 0.5 : flip;
      this.flipY = randomFlipY ? Math.random() < 0.5 : flipY;
      this.rotation = rotation * (Math.PI / 180);
      this.sprite.blendMode = blendMode;
      this._z = zIndex;
      this.zIndex = zIndex;
      this.sfxSettings = sfxSettings;
      this.onCompletion = onCompletion;

      this.bloomEffect = bloomEffect;
      this.blurAmount = blurAmount;
      this.tintColor = tintColor;
      this.intensity = intensity;
      this.hue = hue;

      if (this.bloomEffect) {
        this.createBloomSprite();
      }

      this.applyOpacity(opacity);
      this.applyScale(scalePercent);
      this.applyRotation();
      this.applyHueEffect();
      this.updateFrame();
      this.updatePosition();
    }

    easeInOutQuad(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    setOrigin(origin) {
      switch (origin) {
        case "top":
          this.sprite.anchor.set(0.5, 0);
          break;
        case "bottom":
          this.sprite.anchor.set(0.5, 1.0);
          break;
        case "center":
        default:
          this.sprite.anchor.set(0.5, 0.5);
          break;
      }

      if (this.bloomSprite) {
        this.bloomSprite.anchor = this.sprite.anchor;
      }
    }

    applyHueEffect() {
      if (this.hue !== 0) {
        this.hueFilter = new PIXI.filters.ColorMatrixFilter();
        this.hueFilter.hue(this.hue);
        this.hueFilter.blendMode = this.sprite.blendMode;

        this.sprite.filters = this.sprite.filters || [];
        this.sprite.filters.push(this.hueFilter);

        if (this.bloomSprite) {
          this.bloomHueFilter = new PIXI.filters.ColorMatrixFilter();
          this.bloomHueFilter.hue(this.hue);
          this.bloomHueFilter.blendMode = this.bloomSprite.blendMode;

          this.bloomSprite.filters = this.bloomSprite.filters || [];
          this.bloomSprite.filters.push(this.bloomHueFilter);
        }
      }
    }

    applyFadeOut(duration) {
      this.isFadingOut = true;
      this.fadeOutDuration = duration;
      this.fadeOutElapsed = 0;
      this.originalOpacity = this.sprite.opacity;
    }

    applyScaleOut(duration) {
      this.isScalingOut = true;
      this.scaleOutDuration = duration;
      this.scaleOutElapsed = 0;
      this.originalScaleX = this.sprite.scale.x;
      this.originalScaleY = this.sprite.scale.y;
    }

    easeOutQuad(t) {
      return t * (2 - t);
    }

    createBloomSprite() {
      if (!this.bloomSprite) {
        this.bloomSprite = new Sprite();
      }
      this.bloomSprite.anchor = this.sprite.anchor;
      this.bloomSprite.blendMode = PIXI.BLEND_MODES.SCREEN;

      if (!sharedBloomFilter) {
        sharedBloomFilter = new PIXI.filters.BlurFilter(this.blurAmount);
      } else {
        if (Math.abs(sharedBloomFilter.blur - this.blurAmount) > 0.5) {
          sharedBloomFilter.blur = this.blurAmount;
        }
      }

      bloomFilterUsers++;

      this.bloomSprite.filters = [sharedBloomFilter];

      const color = PIXI.utils.string2hex(this.tintColor);
      this.bloomSprite.tint = color;
      this.bloomSprite.alpha = this.intensity / 255;
      this.bloomSprite.z = this.sprite.z + 1;

      if (this.bitmap) {
        this.bloomSprite.bitmap = this.bitmap;
        if (this.frames && this.frames[this.currentFrameIndex]) {
          const frame = this.frames[this.currentFrameIndex];
          if (typeof frame === "object" && "x" in frame) {
            this.bloomSprite.setFrame(
              frame.x,
              frame.y,
              frame.width,
              frame.height
            );
          }
        }
      }
    }

    removeBloomSprite() {
      if (this.bloomSprite && this.bloomSprite.parent) {
        this.bloomSprite.parent.removeChild(this.bloomSprite);
        if (bloomFilterUsers > 0) {
          bloomFilterUsers--;
        }
        if (bloomFilterUsers === 0 && sharedBloomFilter) {
          sharedBloomFilter.destroy();
          sharedBloomFilter = null;
        }
      }
      this.bloomSprite = null;
    }

    applyOpacity(opacity) {
      this.sprite.opacity = opacity;
    }

    applyScale(scalePercent) {
      const scale = scalePercent / 100;
      this.sprite.scale.set(
        this.flip ? -scale : scale,
        this.flipY ? -scale : scale
      );
    }

    applyRotation() {
      this.sprite.rotation = this.rotation;
    }

    updateFrame() {
      if (
        this.frames &&
        this.frames.length > 0 &&
        this.currentFrameIndex < this.frames.length
      ) {
        const frame = this.frames[this.currentFrameIndex];

        if (this.bitmap) {
          this.sprite.bitmap = this.bitmap;
          if (
            this.sprite.bitmap &&
            this.sprite.bitmap.baseTexture &&
            isNearest
          ) {
            this.sprite.bitmap.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
          }
          this.sprite.setFrame(frame.x, frame.y, frame.width, frame.height);
          if (this.bloomEffect && this.bloomSprite) {
            this.bloomSprite.bitmap = this.bitmap;
            if (
              this.bloomSprite.bitmap &&
              this.bloomSprite.bitmap.baseTexture &&
              isNearest
            ) {
              this.bloomSprite.bitmap.baseTexture.scaleMode =
                PIXI.SCALE_MODES.NEAREST;
            }
            this.bloomSprite.setFrame(
              frame.x,
              frame.y,
              frame.width,
              frame.height
            );
          }
        } else {
          this.sprite.bitmap = frame;
          if (
            this.sprite.bitmap &&
            this.sprite.bitmap.baseTexture &&
            isNearest
          ) {
            this.sprite.bitmap.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
          }
          if (this.bloomEffect && this.bloomSprite) {
            this.bloomSprite.bitmap = frame;
            if (
              this.bloomSprite.bitmap &&
              this.bloomSprite.bitmap.baseTexture &&
              isNearest
            ) {
              this.bloomSprite.bitmap.baseTexture.scaleMode =
                PIXI.SCALE_MODES.NEAREST;
            }
          }
        }

        if (this.bloomEffect && this.bloomSprite) {
          this.bloomSprite.alpha = this.intensity / 255;
        }
      }

      for (const sfx of this.sfxSettings) {
        if (Number(sfx.frame) === this.currentFrameIndex + 1) {
          AudioManager.playSe({
            name: sfx.sfxFile,
            volume: Number(sfx.volume),
            pitch: Number(sfx.pitch),
          });
        }
      }
    }

    updatePosition() {
      if (
        this.initialSpriteWidth === $gameMap.tileWidth() &&
        this.initialSpriteHeight === $gameMap.tileHeight()
      ) {
        this.updateTargetSprite();
        const sprite = this.targetSprite;
        if (sprite && sprite.bitmap && sprite.bitmap.isReady()) {
          this.initialSpriteWidth = sprite.width;
          this.initialSpriteHeight = sprite.height;
        }
      }
      if (
        this.target &&
        (this.target._characterName !== this._lastCharacterName ||
          this.target._characterIndex !== this._lastCharacterIndex)
      ) {
        this.updateTargetSprite();
        this._lastCharacterName = this.target._characterName;
        this._lastCharacterIndex = this.target._characterIndex;
      }

      if (this.stickMode) {
        if (this.lastKnownX === null || this.lastKnownY === null) {
          const screenX = this.target.screenX();
          const screenY = this.target.screenY();
          const sprite = this.targetSprite;

          let initialX, initialY;

          let spriteOffsetX = 0;
          let spriteOffsetY = 0;
          if (sprite) {
            spriteOffsetX = sprite.x - screenX;
            spriteOffsetY = sprite.y - screenY;
          }

          if (
            Imported.Hendrix_Action_Engine &&
            sprite &&
            sprite.rotation !== 0
          ) {
            initialX = screenX + spriteOffsetX + this.offsetX;
            initialY = screenY + spriteOffsetY + this.offsetY;
          } else {
            if (sprite && (sprite.scale.x !== 1 || sprite.scale.y !== 1)) {
              const actualWidth = sprite.width * Math.abs(sprite.scale.x);
              const actualHeight = sprite.height * Math.abs(sprite.scale.y);

              const adjustedOffsetX =
                this.offsetX * (actualWidth / this.initialSpriteWidth);
              const adjustedOffsetY =
                this.offsetY * (actualHeight / this.initialSpriteHeight);

              initialX = screenX + spriteOffsetX + adjustedOffsetX;
              initialY =
                screenY + spriteOffsetY - actualHeight / 2 + adjustedOffsetY;
            } else {
              initialX = screenX + spriteOffsetX + this.offsetX * 2;
              initialY =
                screenY +
                spriteOffsetY -
                this.initialSpriteHeight / 2 +
                this.offsetY * 2;
            }
          }

          const mapDisplayX = $gameMap.displayX() * $gameMap.tileWidth();
          const mapDisplayY = $gameMap.displayY() * $gameMap.tileHeight();

          this.lastKnownX = initialX + mapDisplayX - $gameMap.tileWidth() / 2;
          this.lastKnownY = initialY + mapDisplayY - $gameMap.tileHeight() / 2;
        }

        const mapDisplayX = $gameMap.displayX() * $gameMap.tileWidth();
        const mapDisplayY = $gameMap.displayY() * $gameMap.tileHeight();
        const displayX =
          this.lastKnownX - mapDisplayX + $gameMap.tileWidth() / 2;
        const displayY =
          this.lastKnownY - mapDisplayY + $gameMap.tileHeight() / 2;

        this.sprite.x = Math.round(displayX);
        this.sprite.y = Math.round(displayY);

        if (Imported.Hendrix_Action_Engine) {
          const sprite = this.targetSprite;
          if (sprite && this.target.customRotationPoint) {
            this.sprite.rotation = this.rotation + sprite.rotation;
          }
        }

        if (this.bloomEffect && this.bloomSprite) {
          if (
            this.bloomSprite.x !== this.sprite.x ||
            this.bloomSprite.y !== this.sprite.y ||
            this.bloomSprite.rotation !== this.sprite.rotation
          ) {
            this.bloomSprite.x = this.sprite.x;
            this.bloomSprite.y = this.sprite.y;
            this.bloomSprite.scale.set(
              this.sprite.scale.x,
              this.sprite.scale.y
            );
            this.bloomSprite.rotation = this.sprite.rotation;
          }
        }
        return;
      }

      if (this.target) {
        const screenX = this.target.screenX();
        const screenY = this.target.screenY();
        const sprite = this.targetSprite;

        let newX, newY;

        let spriteOffsetX = 0;
        let spriteOffsetY = 0;
        if (sprite) {
          spriteOffsetX = sprite.x - screenX;
          spriteOffsetY = sprite.y - screenY;
        }

        if (Imported.Hendrix_Action_Engine && sprite && this.target.customRotationPoint) {
          newX = screenX + spriteOffsetX + this.offsetX;
          newY = screenY + spriteOffsetY + this.offsetY;
        } else {
          if (sprite && (sprite.scale.x !== 1 || sprite.scale.y !== 1)) {
            const actualWidth = sprite.width * Math.abs(sprite.scale.x);
            const actualHeight = sprite.height * Math.abs(sprite.scale.y);

            const adjustedOffsetX =
              this.offsetX * (actualWidth / this.initialSpriteWidth);
            const adjustedOffsetY =
              this.offsetY * (actualHeight / this.initialSpriteHeight);

            newX = screenX + spriteOffsetX + adjustedOffsetX;
            newY = screenY + spriteOffsetY - actualHeight / 2 + adjustedOffsetY;
          } else {
            newX = screenX + spriteOffsetX + this.offsetX * 2;
            newY =
              screenY +
              spriteOffsetY -
              this.initialSpriteHeight / 2 +
              this.offsetY * 2;
          }
        }

        if (Imported.Hendrix_Action_Engine && sprite && this.target.customRotationPoint) {
          const cos = Math.cos(sprite.rotation);
          const sin = Math.sin(sprite.rotation);
          const rotatedOffsetX = this.offsetX * cos - this.offsetY * sin;
          const rotatedOffsetY = this.offsetX * sin + this.offsetY * cos;

          newX = screenX + spriteOffsetX + rotatedOffsetX;
          newY = screenY + spriteOffsetY + rotatedOffsetY;

          this.sprite.rotation = this.rotation + sprite.rotation;
        } else {
          this.sprite.rotation = this.rotation;
        }

        if (
          Math.abs(this.sprite.x - newX) > 1 ||
          Math.abs(this.sprite.y - newY) > 1
        ) {
          this.sprite.x = newX;
          this.sprite.y = newY;
          this.lastKnownX = newX;
          this.lastKnownY = newY;
        }
      }

      if (this.bloomEffect && this.bloomSprite) {
        if (
          this.bloomSprite.x !== this.sprite.x ||
          this.bloomSprite.y !== this.sprite.y ||
          this.bloomSprite.rotation !== this.sprite.rotation
        ) {
          this.bloomSprite.x = this.sprite.x;
          this.bloomSprite.y = this.sprite.y;
          this.bloomSprite.scale = this.sprite.scale;
          this.bloomSprite.rotation = this.sprite.rotation;
        }
      }
    }

    updateTargetSprite() {
      if (SceneManager._scene instanceof Scene_Map && this.target) {
        this.targetSprite = SceneManager._scene._spriteset.findCharacterSprite(
          this.target
        );
        if (!this.targetSprite && this.target._characterName) {
        }
      } else {
        this.targetSprite = null;
      }
    }

    checkTargetValidity() {
      if (this.target === $gamePlayer) return true;
      if (!this.target) return false;
      return !!$gameMap.event(this.target._eventId);
    }

    update(deltaTime) {
      if (!this.isValid()) return;
      // Opening animation effects
      if (this.isPlayingOpeningAnimation) {
        this.openingElapsed += 1;
        const progress = Math.min(
          1.0,
          this.openingElapsed / this.animationDuration
        );
        const easedProgress = this.easeInOutQuad(progress);

        if (this.openingAnimation === "fadeIn") {
          const newOpacity = this.originalOpacity * easedProgress;
          this.sprite.opacity = Math.round(newOpacity);

          if (this.bloomSprite) {
            this.bloomSprite.opacity = Math.round(newOpacity);
          }
        } else if (this.openingAnimation === "scaleIn") {
          const targetScale = this.originalScalePercent / 100;
          const currentScale = targetScale * easedProgress;

          this.sprite.scale.x = this.flip ? -currentScale : currentScale;
          this.sprite.scale.y = this.flipY ? -currentScale : currentScale;

          if (this.bloomSprite) {
            this.bloomSprite.scale.x = this.sprite.scale.x;
            this.bloomSprite.scale.y = this.sprite.scale.y;
          }
        } else if (this.openingAnimation === "scaleInWidth") {
          const targetScale = this.originalScalePercent / 100;
          const currentScaleX = targetScale * easedProgress;
          const currentScaleY = targetScale;

          this.sprite.scale.x = this.flip ? -currentScaleX : currentScaleX;
          this.sprite.scale.y = this.flipY ? -currentScaleY : currentScaleY;

          if (this.bloomSprite) {
            this.bloomSprite.scale.x = this.sprite.scale.x;
            this.bloomSprite.scale.y = this.sprite.scale.y;
          }
        } else if (this.openingAnimation === "scaleInHeight") {
          const targetScale = this.originalScalePercent / 100;
          const currentScaleX = targetScale;
          const currentScaleY = targetScale * easedProgress;

          this.sprite.scale.x = this.flip ? -currentScaleX : currentScaleX;
          this.sprite.scale.y = this.flipY ? -currentScaleY : currentScaleY;

          if (this.bloomSprite) {
            this.bloomSprite.scale.x = this.sprite.scale.x;
            this.bloomSprite.scale.y = this.sprite.scale.y;
          }
        }

        if (progress >= 1.0) {
          this.isPlayingOpeningAnimation = false;
          if (this.openingAnimation === "fadeIn") {
            this.applyOpacity(this.originalOpacity);
          } else if (
            this.openingAnimation === "scaleIn" ||
            this.openingAnimation === "scaleInWidth" ||
            this.openingAnimation === "scaleInHeight"
          ) {
            this.applyScale(this.originalScalePercent);
          }
        }
      }

      // Ending animation
      if (
        !this.isPlayingEndingAnimation &&
        this.endingAnimation !== "none" &&
        this.loopCount !== Infinity
      ) {
        const totalFrames = this.frames.length;
        const currentFrame = this.playInReverse
          ? totalFrames - this.currentFrameIndex - 1
          : this.currentFrameIndex;
        const framesLeft = this.playInReverse
          ? currentFrame + 1
          : totalFrames - currentFrame;

        const framesPerSecond = 1000 / this.frameTime;
        const animationDurationInFrames = Math.ceil(
          this.animationDuration * (framesPerSecond / 60)
        );

        const isFirstLoop = this.completedLoops === 0;
        const isNearEnd = framesLeft <= animationDurationInFrames;

        if (isFirstLoop && isNearEnd) {
          this.isPlayingEndingAnimation = true;

          this.loopCount = 1;

          if (this.endingAnimation === "fadeOut") {
            this.applyFadeOut(this.animationDuration);
          } else if (this.endingAnimation === "scaleOut") {
            this.applyScaleOut(this.animationDuration);
          }
        }
      }

      // Fade out effect
      if (this.isFadingOut) {
        this.fadeOutElapsed += 1;
        const progress = this.fadeOutElapsed / this.fadeOutDuration;

        if (progress >= 1.0) {
          this.dispose();
          if (this.onCompletion) this.onCompletion();
          return;
        }

        const newOpacity = this.originalOpacity * (1 - progress);
        this.sprite.opacity = Math.round(newOpacity);

        if (this.bloomSprite) {
          this.bloomSprite.opacity = Math.round(newOpacity);
        }
      }

      // Scale out effect
      if (this.isScalingOut) {
        this.scaleOutElapsed += 1;
        const progress = this.scaleOutElapsed / this.scaleOutDuration;

        if (progress >= 1.0) {
          this.dispose();
          if (this.onCompletion) this.onCompletion();
          return;
        }

        // Easing to make the animation smoother
        const easedProgress = this.easeOutQuad(progress);
        const scaleFactor = 1 - easedProgress;

        // Scale
        const newScaleX = this.originalScaleX * scaleFactor;
        const newScaleY = this.originalScaleY * scaleFactor;
        this.sprite.scale.x =
          this.originalScaleX < 0 ? -Math.abs(newScaleX) : Math.abs(newScaleX);
        this.sprite.scale.y =
          this.originalScaleY < 0 ? -Math.abs(newScaleY) : Math.abs(newScaleY);

        if (this.bloomSprite) {
          this.bloomSprite.scale.x = this.sprite.scale.x;
          this.bloomSprite.scale.y = this.sprite.scale.y;
        }
      }

      this.elapsedTime += deltaTime;

      while (this.elapsedTime >= this.frameTime) {
        if (this.playInReverse) {
          this.currentFrameIndex--;
          if (this.currentFrameIndex < 0) {
            this.completedLoops++;
            if (
              this.loopCount !== Infinity &&
              this.completedLoops >= this.loopCount
            ) {
              this.dispose();
              if (this.onCompletion) this.onCompletion();
              return;
            }
            this.currentFrameIndex = this.frames.length - 1;
          }
        } else {
          this.currentFrameIndex++;
          if (this.currentFrameIndex >= this.frames.length) {
            this.completedLoops++;
            if (
              this.loopCount !== Infinity &&
              this.completedLoops >= this.loopCount
            ) {
              this.dispose();
              if (this.onCompletion) this.onCompletion();
              return;
            }
            this.currentFrameIndex = 0;
          }
        }
        this.elapsedTime -= this.frameTime;
        this.updateFrame();
      }

      if (this.shouldUpdatePosition()) {
        this.updatePosition();
      }
    }

    isValid() {
      if (!this.sprite || !this.sprite.parent || !this.checkTargetValidity()) {
        this.dispose();
        return false;
      }
      return true;
    }

    shouldUpdatePosition() {
      if (!this.lastKnownX || !this.lastKnownY) return true;
      const dx = this.target.screenX() - this.lastKnownX;
      const dy = this.target.screenY() - this.lastKnownY;
      return Math.abs(dx) > 1 || Math.abs(dy) > 1;
    }

    dispose() {
      if (this.sprite?.parent) {
        this.sprite.parent.removeChild(this.sprite);
        this.sprite.destroy();
      }

      if (this.bloomSprite?.parent) {
        this.bloomSprite.parent.removeChild(this.bloomSprite);
        this.bloomSprite.destroy();
      }

      if (this.hueFilter) {
        this.hueFilter.destroy();
        this.hueFilter = null;
      }

      if (this.bloomHueFilter) {
        this.bloomHueFilter.destroy();
        this.bloomHueFilter = null;
      }

      AnimatedPictureManager.removeAnimatedPicture(this);
    }
  }

  Spriteset_Map.prototype.findCharacterSprite = function (character) {
    return (
      this._characterSprites.find(
        (sprite) => sprite._character === character
      ) || null
    );
  };

  Scene_Map.prototype.addAnimatedPicture = function (animatedPicture) {
    const spritesetMap = this._spriteset;
    if (!spritesetMap) return;

    let container = spritesetMap._tilemap;
    if (!container) return;

    if (AnimatedPictureManager._batchingEnabled && animatedPicture.sprite) {
      const existingBatch =
        AnimatedPictureManager._findSimilarBatch(animatedPicture);
      if (existingBatch && existingBatch.length > 0) {
        const refSprite = existingBatch[0].sprite;
        const refIndex = container.children.indexOf(refSprite);

        if (refIndex >= 0) {
          animatedPicture.sprite.z = animatedPicture.zIndex;
          container.addChildAt(animatedPicture.sprite, refIndex + 1);

          if (animatedPicture.bloomEffect && animatedPicture.bloomSprite) {
            animatedPicture.bloomSprite.z = animatedPicture.zIndex + 1;
            container.addChildAt(animatedPicture.bloomSprite, refIndex + 2);
          }
          return;
        }
      }
    }

    if (animatedPicture.sprite) {
      animatedPicture.sprite.z = animatedPicture.zIndex;
      container.addChild(animatedPicture.sprite);
    }

    if (animatedPicture.bloomEffect && animatedPicture.bloomSprite) {
      animatedPicture.bloomSprite.z = animatedPicture.zIndex + 1;
      container.addChild(animatedPicture.bloomSprite);
    }
  };

  class AnimatedPictureManager {
    static _animationCountByEventId = new Map();
    static _animatedPicturesByEventId = new Map();
    static _animatedPictures = [];
    static _lastUpdateTime = 0;
    static _batchingEnabled = true;
    static _batchesByTexture = new Map();
    static _backupAnimations = [];
    static _batchUpdateCounter = 0;
    static _debugStats = {
      totalBatches: 0,
      totalAnimations: 0,
      batchSizes: {},
      batchByTexture: {},
      drawCallsSaved: 0,
      lastUpdateTime: 0,
      updateTimes: [],
    };

    static _collectDebugStats() {
      this._debugStats.totalBatches = 0;
      this._debugStats.totalAnimations = this._animatedPictures.length;
      this._debugStats.batchSizes = {};
      this._debugStats.batchByTexture = {};
      this._debugStats.drawCallsSaved = 0;
      for (const [batchKey, pictures] of this._batchesByTexture.entries()) {
        this._debugStats.totalBatches++;
        const size = pictures.length;
        this._debugStats.batchSizes[size] =
          (this._debugStats.batchSizes[size] || 0) + 1;
        const textureId = batchKey.split("_").slice(1).join("_");
        this._debugStats.batchByTexture[textureId] =
          (this._debugStats.batchByTexture[textureId] || 0) + size;
        if (size > 1) {
          this._debugStats.drawCallsSaved += size - 1;
        }
      }

      const currentTime = performance.now();
      if (this._debugStats.lastUpdateTime > 0) {
        const updateTime = currentTime - this._debugStats.lastUpdateTime;
        this._debugStats.updateTimes.push(updateTime);
        if (this._debugStats.updateTimes.length > 60) {
          this._debugStats.updateTimes.shift();
        }
      }
      this._debugStats.lastUpdateTime = currentTime;
    }

    static showDebugOverlay() {
      if (!this._debugOverlay) {
        this._debugOverlay = new PIXI.Container();
        this._debugText = new PIXI.Text("Batch Debug", {
          fontFamily: "Arial",
          fontSize: 14,
          fill: 0xffffff,
          stroke: 0x000000,
          strokeThickness: 4,
          align: "left",
        });
        this._debugOverlay.addChild(this._debugText);
        if (SceneManager._scene) {
          SceneManager._scene.addChild(this._debugOverlay);
        }
      }

      if (this._debugText) {
        const avgUpdateTime =
          this._debugStats.updateTimes.length > 0
            ? this._debugStats.updateTimes.reduce((a, b) => a + b, 0) /
            this._debugStats.updateTimes.length
            : 0;

        let batchSizesText = "";
        for (const [size, count] of Object.entries(
          this._debugStats.batchSizes
        ).sort((a, b) => a[0] - b[0])) {
          batchSizesText += `\n  Size ${size}: ${count} batches`;
        }

        this._debugText.text = `Batch Debug:
                Animations: ${this._debugStats.totalAnimations}
                Batches: ${this._debugStats.totalBatches}
                Draw Calls Saved: ${this._debugStats.drawCallsSaved}
                Update Time: ${avgUpdateTime.toFixed(2)}ms
                Batch Sizes: ${batchSizesText}`;
        this._debugText.x = Graphics.width - this._debugText.width - 10;
        this._debugText.y = 10;
      }
    }

    static toggleBatchVisualization() {
      this._visualizeBatches = !this._visualizeBatches;

      if (this._visualizeBatches) {
        this._highlightBatches();
      } else {
        this._removeBatchHighlights();
      }

      return this._visualizeBatches;
    }

    static _highlightBatches() {
      this._removeBatchHighlights();
      const colors = [
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff,
      ];
      let colorIndex = 0;
      for (const [batchKey, pictures] of this._batchesByTexture.entries()) {
        if (pictures.length <= 1) continue;

        const batchColor = colors[colorIndex % colors.length];
        colorIndex++;

        for (const picture of pictures) {
          if (picture.sprite && picture.sprite.parent) {
            const highlight = new PIXI.Graphics();
            highlight.lineStyle(2, batchColor, 1);
            highlight.drawRect(
              -5,
              -5,
              picture.sprite.width + 10,
              picture.sprite.height + 10
            );
            highlight._isBatchHighlight = true;
            picture.sprite.parent.addChild(highlight);
            highlight.x = picture.sprite.x - picture.sprite.width / 2;
            highlight.y = picture.sprite.y - picture.sprite.height / 2;
          }
        }
      }
    }

    static _removeBatchHighlights() {
      if (
        !SceneManager._scene ||
        !SceneManager._scene._spriteset ||
        !SceneManager._scene._spriteset._tilemap
      ) {
        return;
      }
      const container = SceneManager._scene._spriteset._tilemap;
      for (let i = container.children.length - 1; i >= 0; i--) {
        const child = container.children[i];
        if (child && child._isBatchHighlight) {
          container.removeChild(child);
        }
      }
    }

    static registerDebugCommands() {
      if (Utils.isNwjs()) {
        window.showBatchStats = () => {
          console.log("===== Batch System Statistics =====");
          console.log(`Total Animations: ${this._debugStats.totalAnimations}`);
          console.log(`Total Batches: ${this._debugStats.totalBatches}`);
          console.log(`Draw Calls Saved: ${this._debugStats.drawCallsSaved}`);

          const efficiency =
            this._debugStats.totalAnimations > 0
              ? (
                (this._debugStats.drawCallsSaved /
                  this._debugStats.totalAnimations) *
                100
              ).toFixed(2)
              : 0;
          console.log(`Batching Efficiency: ${efficiency}%`);

          console.log("\nBatch Size Distribution:");
          for (const [size, count] of Object.entries(
            this._debugStats.batchSizes
          ).sort((a, b) => Number(a[0]) - Number(b[0]))) {
            console.log(`  Size ${size}: ${count} batches`);
          }

          console.log("\nUpdate Performance:");
          const avgUpdateTime =
            this._debugStats.updateTimes.length > 0
              ? this._debugStats.updateTimes.reduce((a, b) => a + b, 0) /
              this._debugStats.updateTimes.length
              : 0;
          console.log(`  Average Update Time: ${avgUpdateTime.toFixed(2)}ms`);

          return "Stats printed to console";
        };

        window.toggleBatchDebug = () => {
          this._showDebugOverlay = !this._showDebugOverlay;
          return `Batch debug overlay: ${this._showDebugOverlay ? "ON" : "OFF"
            }`;
        };

        window.toggleBatchVisualization = () => {
          const isOn = this.toggleBatchVisualization();
          return `Batch visualization: ${isOn ? "ON" : "OFF"}`;
        };
      }
    }
    static prepareBatches() {
      this._batchesByTexture.clear();
      const sortedPictures = [...this._animatedPictures].sort(
        (a, b) => a.zIndex - b.zIndex
      );
      let currentZ = null;
      let currentGroup = [];

      for (const picture of sortedPictures) {
        if (!picture.sprite || !picture.sprite.bitmap) continue;
        if (currentZ === null) {
          currentZ = picture.zIndex;
          currentGroup = [picture];
        } else if (picture.zIndex === currentZ) {
          currentGroup.push(picture);
        } else {
          this._createBatchesForGroup(currentGroup);
          currentZ = picture.zIndex;
          currentGroup = [picture];
        }
      }
      if (currentGroup.length > 0) {
        this._createBatchesForGroup(currentGroup);
      }
    }

    static _createBatchesForGroup(pictureGroup) {
      const textureGroups = new Map();

      for (const picture of pictureGroup) {
        if (!picture.sprite || !picture.sprite.bitmap) continue;
        const textureId =
          picture.sprite.bitmap._url || picture.sprite.bitmap._baseTexture.uid;
        const blendMode = picture.sprite.blendMode;
        const key = `${textureId}_${blendMode}`;
        if (!textureGroups.has(key)) {
          textureGroups.set(key, []);
        }
        textureGroups.get(key).push(picture);
      }

      for (const [textureKey, pictures] of textureGroups.entries()) {
        if (pictures.length <= 1) continue;
        const z = pictures[0].zIndex;
        const batchKey = `${z}_${textureKey}`;
        this._batchesByTexture.set(batchKey, pictures);
      }
    }

    static optimizeRendering() {
      if (!this._batchingEnabled) return;
      const startTime = performance.now();
      if (this._batchUpdateCounter++ % 10 === 0) {
        this.prepareBatches();
      }
      const scene = SceneManager._scene;
      if (!scene || !scene._spriteset || !scene._spriteset._tilemap) return;
      const container = scene._spriteset._tilemap;
      this._forceZSort(container);
      for (const [batchKey, pictures] of this._batchesByTexture.entries()) {
        if (pictures.length <= 1) continue;
        const z = parseInt(batchKey.split("_")[0]);
        this._optimizeBatchSafely(pictures, z, container);
      }

      //this._collectDebugStats();
      //if (this._showDebugOverlay) {
      //    this.showDebugOverlay();
      //}
      //this.toggleBatchVisualization();
      //const endTime = performance.now();
      //this._debugStats.lastUpdateDuration = endTime - startTime;
    }

    static initDebugSystem() {
      this._showDebugOverlay = false;
      this._visualizeBatches = false;
      this.registerDebugCommands();
    }

    static _forceZSort(container) {
      if (!container || !container.children || !container.children.length)
        return;
      const indexedChildren = container.children.map((child, index) => ({
        sprite: child,
        z: child ? child.z || 0 : 0,
        originalIndex: index,
      }));
      indexedChildren.sort((a, b) => a.z - b.z);
      container.children = indexedChildren.map((item) => item.sprite);
      container._needsSorting = false;
    }

    static _optimizeBatchSafely(pictures, zIndex, container) {
      const zLayerSprites = [];
      const zLayerIndices = [];

      for (let i = 0; i < container.children.length; i++) {
        const sprite = container.children[i];
        if (sprite && (sprite.z || 0) === zIndex) {
          zLayerSprites.push(sprite);
          zLayerIndices.push(i);
        }
      }

      if (zLayerSprites.length <= 1) return;
      const batchSprites = pictures
        .map((p) => p.sprite)
        .filter((s) => zLayerSprites.includes(s));
      if (batchSprites.length <= 1) return;
      const zLayerMap = new Map();
      zLayerSprites.forEach((sprite, idx) => {
        zLayerMap.set(sprite, zLayerIndices[idx]);
      });
      const firstBatchSpriteIndex = Math.min(
        ...batchSprites.map((s) => zLayerSprites.indexOf(s))
      );
      if (firstBatchSpriteIndex >= 0) {
        let insertIndex = firstBatchSpriteIndex;

        for (const batchSprite of batchSprites) {
          const currentIndex = zLayerSprites.indexOf(batchSprite);
          if (currentIndex !== insertIndex && currentIndex > -1) {
            zLayerSprites.splice(currentIndex, 1);
            zLayerSprites.splice(insertIndex, 0, batchSprite);
            const containerIndex = zLayerMap.get(batchSprite);
            const targetIndex = zLayerIndices[insertIndex];
            if (containerIndex !== targetIndex) {
              const tempSprite = container.children[targetIndex];
              container.children[targetIndex] = batchSprite;
              container.children[containerIndex] = tempSprite;
              zLayerMap.set(tempSprite, containerIndex);
              zLayerMap.set(batchSprite, targetIndex);
            }
          }
          insertIndex++;
        }
      }
    }

    static _findSimilarBatch(picture) {
      if (!picture.sprite || !picture.sprite.bitmap) return null;
      const textureId =
        picture.sprite.bitmap._url || picture.sprite.bitmap._baseTexture.uid;
      const blendMode = picture.sprite.blendMode;
      const z = picture.zIndex;
      const batchKey = `${z}_${textureId}_${blendMode}`;
      return this._batchesByTexture.get(batchKey);
    }

    static showAnimatedPicture(
      eventId,
      frames,
      fps,
      target,
      loopCount,
      offsetX,
      offsetY,
      sfxSettings,
      scalePercent,
      opacity,
      flip,
      flipY,
      randomFlipX,
      randomFlipY,
      rotation,
      blendMode,
      zIndex,
      bloomEffect,
      blurAmount,
      tintColor,
      intensity,
      hue,
      stickmode,
      note,
      playInReverse = false
    ) {
      const origin = "center";

      const alwaysPlaySFX =
        PluginManager.parameters(pluginName)["alwaysPlaySFX"] === "true";
      loopCount = Math.max(1, loopCount);
      let animationCount = this._animationCountByEventId.get(eventId) || 0;

      if (alwaysPlaySFX) {
        sfxSettings.forEach((sfx) => {
          AudioManager.playSe({
            name: sfx.sfxFile,
            volume: sfx.volume,
            pitch: sfx.pitch,
          });
        });
      }

      const animatedPicture = new AnimatedPicture(
        frames,
        fps,
        target,
        loopCount,
        offsetX,
        offsetY,
        sfxSettings,
        scalePercent,
        opacity,
        flip,
        flipY,
        randomFlipX,
        randomFlipY,
        rotation,
        blendMode,
        zIndex,
        bloomEffect,
        blurAmount,
        tintColor,
        intensity,
        hue,
        stickmode,
        () => this.decrementAnimationCount(eventId),
        null,
        note,
        playInReverse,
        origin
      );

      if (!animatedPicture.checkTargetValidity()) {
        animatedPicture.dispose();
        return;
      }

      if (SceneManager._scene instanceof Scene_Map) {
        SceneManager._scene.addAnimatedPicture(animatedPicture);
      }

      this.addAnimatedPicture(animatedPicture);
      this._animationCountByEventId.set(eventId, animationCount + 1);
      this._animatedPicturesByEventId.set(eventId, animatedPicture);
    }

    static createSpritesheetFrames(bitmap, rows, columns) {
      const frameWidth = Math.floor(bitmap.width / columns);
      const frameHeight = Math.floor(bitmap.height / rows);
      const frames = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const x = col * frameWidth;
          const y = row * frameHeight;
          frames.push({ x, y, width: frameWidth, height: frameHeight });
        }
      }
      return frames;
    }

    static decrementAnimationCount(eventId) {
      let animationCount = this._animationCountByEventId.get(eventId) || 0;
      if (animationCount > 0) {
        this._animationCountByEventId.set(eventId, animationCount - 1);
      }
    }

    static addAnimatedPicture(animatedPicture) {
      this._animatedPictures.push(animatedPicture);
      const scene = SceneManager._scene;
      if (scene instanceof Scene_Map) {
        scene.addAnimatedPicture(animatedPicture);
        scene._spriteset._needsSorting = true;
      }
    }

    static removeAnimatedPicture(animatedPicture) {
      const index = this._animatedPictures.indexOf(animatedPicture);
      if (index !== -1) {
        this._animatedPictures[index] =
          this._animatedPictures[this._animatedPictures.length - 1];
        this._animatedPictures.pop();
        const scene = SceneManager._scene;
        if (scene instanceof Scene_Map) {
          scene._spriteset._needsSorting = true;
        }
      }
      if (sharedBloomFilter && this._animatedPictures.length === 0) {
        sharedBloomFilter.destroy();
        sharedBloomFilter = null;
      }
    }

    static removeAllAnimatedPictures() {
      this._animatedPictures.forEach((picture) => picture.dispose());
      this._animatedPictures = [];
      this._animationCountByEventId.clear();
      this._animatedPicturesByEventId.clear();
      bloomFilterUsers = 0;
      if (sharedBloomFilter) {
        sharedBloomFilter.destroy();
        sharedBloomFilter = null;
      }
    }

    static update(currentTime) {
      if (this._lastUpdateTime === 0) {
        this._lastUpdateTime = currentTime;
        return;
      }

      const deltaTime = currentTime - this._lastUpdateTime;
      this._lastUpdateTime = currentTime;
      this.optimizeRendering();

      for (const animatedPicture of this._animatedPictures) {
        animatedPicture.update(deltaTime);
      }
    }
  }

  const _sScene_Map_updateH = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function () {
    AnimatedPictureManager.update(performance.now());
    _sScene_Map_updateH.call(this);
  };

  const _TouchInput_onMouseDown_AnimEditor = TouchInput._onMouseDown;
  TouchInput._onMouseDown = function (event) {
    if (SceneManager._scene instanceof Scene_Map && editorPreviewMode) {
      const x = Graphics.pageToCanvasX(event.pageX);
      const y = Graphics.pageToCanvasY(event.pageY);
      handleCharacterClick(x, y);
      return;
    }

    _TouchInput_onMouseDown_AnimEditor.call(this, event);
  };

  const _Scene_Map_terminate = Scene_Map.prototype.terminate;
  Scene_Map.prototype.terminate = function () {
    const nextScene = SceneManager._nextScene;
    const isGoingToMenu = nextScene && nextScene instanceof Scene_MenuBase;

    if (isGoingToMenu) {
      AnimatedPictureManager._backupAnimations =
        AnimatedPictureManager._animatedPictures.map((pic) => {
          return {
            frames: pic.frames,
            fps: pic.fps,
            target: pic.target,
            loopCount: pic.loopCount,
            offsetX: pic.offsetX,
            offsetY: pic.offsetY,
            sfxSettings: pic.sfxSettings,
            bitmap: pic.bitmap,
            stickMode: pic.stickMode,
            note: pic.note,
            playInReverse: pic.playInReverse,
            flip: pic.flip,
            flipY: pic.flipY,
            rotation: pic.rotation,
            zIndex: pic.zIndex,
            _z: pic._z,
            bloomEffect: pic.bloomEffect,
            blurAmount: pic.blurAmount,
            tintColor: pic.tintColor,
            intensity: pic.intensity,
            hue: pic.hue,
            spriteOpacity: pic.sprite.opacity,
            spriteScaleX: pic.sprite.scale.x,
            spriteScaleY: pic.sprite.scale.y,
            spriteBlendMode: pic.sprite.blendMode,
            spriteAnchorX: pic.sprite.anchor.x,
            spriteAnchorY: pic.sprite.anchor.y,
            currentFrameIndex: pic.currentFrameIndex,
            elapsedTime: pic.elapsedTime,
            completedLoops: pic.completedLoops,
            frameTime: pic.frameTime,
            lastKnownX: pic.lastKnownX,
            lastKnownY: pic.lastKnownY,
            initialSpriteWidth: pic.initialSpriteWidth,
            initialSpriteHeight: pic.initialSpriteHeight,
            openingAnimation: pic.openingAnimation,
            endingAnimation: pic.endingAnimation,
            animationDuration: pic.animationDuration,
            isPlayingOpeningAnimation: pic.isPlayingOpeningAnimation,
            openingElapsed: pic.openingElapsed,
            originalOpacity: pic.originalOpacity,
            originalScalePercent: pic.originalScalePercent,
            isPlayingEndingAnimation: pic.isPlayingEndingAnimation,
            isFadingOut: pic.isFadingOut,
            fadeOutDuration: pic.fadeOutDuration,
            fadeOutElapsed: pic.fadeOutElapsed,
            isScalingOut: pic.isScalingOut,
            scaleOutDuration: pic.scaleOutDuration,
            scaleOutElapsed: pic.scaleOutElapsed,
            originalScaleX: pic.originalScaleX,
            originalScaleY: pic.originalScaleY,
            _lastCharacterName: pic._lastCharacterName,
            _lastCharacterIndex: pic._lastCharacterIndex,
          };
        });
    } else {
      AnimatedPictureManager.removeAllAnimatedPictures();
    }

    _Scene_Map_terminate.call(this);
  };

  const _Scene_Map_createDisplayObjects =
    Scene_Map.prototype.createDisplayObjects;
  Scene_Map.prototype.createDisplayObjects = function () {
    if (
      AnimatedPictureManager._backupAnimations &&
      AnimatedPictureManager._backupAnimations.length > 0
    ) {
      const backups = AnimatedPictureManager._backupAnimations;
      AnimatedPictureManager._backupAnimations = [];

      _Scene_Map_createDisplayObjects.call(this);

      for (const backup of backups) {
        if (
          !backup.target ||
          (backup.target !== $gamePlayer &&
            !$gameMap.event(backup.target._eventId))
        ) {
          continue;
        }

        const animatedPicture = new AnimatedPicture(
          backup.frames,
          backup.fps,
          backup.target,
          backup.loopCount,
          backup.offsetX,
          backup.offsetY,
          backup.sfxSettings,
          Math.abs(backup.spriteScaleX) * 100,
          backup.spriteOpacity,
          backup.flip,
          backup.flipY,
          false,
          false,
          backup.rotation * (180 / Math.PI),
          backup.spriteBlendMode,
          backup.zIndex,
          backup.bloomEffect,
          backup.blurAmount,
          backup.tintColor,
          backup.intensity,
          backup.hue,
          () =>
            AnimatedPictureManager.decrementAnimationCount(
              backup.target === $gamePlayer ? "player" : backup.target._eventId
            ),
          backup.bitmap,
          backup.stickMode,
          backup.note,
          backup.playInReverse,
          backup.spriteAnchorY === 0
            ? "top"
            : backup.spriteAnchorY === 1
              ? "bottom"
              : "center",
          "none",
          30,
          "none"
        );

        animatedPicture.currentFrameIndex = backup.currentFrameIndex;
        animatedPicture.elapsedTime = backup.elapsedTime;
        animatedPicture.completedLoops = backup.completedLoops;
        animatedPicture.frameTime = backup.frameTime;
        animatedPicture.lastKnownX = backup.lastKnownX;
        animatedPicture.lastKnownY = backup.lastKnownY;
        animatedPicture.initialSpriteWidth = backup.initialSpriteWidth;
        animatedPicture.initialSpriteHeight = backup.initialSpriteHeight;
        animatedPicture._z = backup._z;
        animatedPicture.openingAnimation = backup.openingAnimation;
        animatedPicture.endingAnimation = backup.endingAnimation;
        animatedPicture.animationDuration = backup.animationDuration;
        animatedPicture.isPlayingOpeningAnimation =
          backup.isPlayingOpeningAnimation;
        animatedPicture.openingElapsed = backup.openingElapsed;
        animatedPicture.originalOpacity = backup.originalOpacity;
        animatedPicture.originalScalePercent = backup.originalScalePercent;
        animatedPicture.isPlayingEndingAnimation =
          backup.isPlayingEndingAnimation;
        animatedPicture.isFadingOut = backup.isFadingOut;
        animatedPicture.fadeOutDuration = backup.fadeOutDuration;
        animatedPicture.fadeOutElapsed = backup.fadeOutElapsed;
        animatedPicture.isScalingOut = backup.isScalingOut;
        animatedPicture.scaleOutDuration = backup.scaleOutDuration;
        animatedPicture.scaleOutElapsed = backup.scaleOutElapsed;
        animatedPicture.originalScaleX = backup.originalScaleX;
        animatedPicture.originalScaleY = backup.originalScaleY;
        animatedPicture._lastCharacterName = backup._lastCharacterName;
        animatedPicture._lastCharacterIndex = backup._lastCharacterIndex;

        animatedPicture.updateFrame();
        this.addAnimatedPicture(animatedPicture);
        AnimatedPictureManager.addAnimatedPicture(animatedPicture);
      }
    } else {
      _Scene_Map_createDisplayObjects.call(this);
    }
  };

  window.AnimatedPictureManager = AnimatedPictureManager;

  // ================================================================
  // EVENT/PLAYER ACTION SYSTEM
  // ================================================================

  Game_Character.prototype.toFrame = function (pattern) {
    togglePatternReset.call(this, true);
    this._originalPattern = this._pattern = pattern - 1;
    this._patternUpdated = true;
    this._stepAnime = false;
  };

  Game_Character.prototype.playFrames = function (start, end, wait, offsetX = 0, offsetY = 0) {
    this._isPlayingFrames = true;
    this._frameWait = wait;
    this._frameCount = 0;
    this._endFrame = end - 1;
    this._startFrame = start - 1;
    this._isReverse = start > end;
    this._playFramesOffsetX = offsetX;
    this._playFramesOffsetY = offsetY;
    this.toFrame(start);
  };

  window.togglePatternReset = function (disable, eventId = null) {
    const char = eventId ? $gameMap.event(eventId) : $gamePlayer;
    char._disablePatternReset = disable;
    if (!disable) char._patternUpdated = false;
  };

  const _GameBase_initMembers = Game_CharacterBase.prototype.initMembers;
  Game_CharacterBase.prototype.initMembers = function () {
    _GameBase_initMembers.call(this);
    this._frames = 3;
    this._columnIndex = 1;
    this._hxSig = 0x5348;
    this._frameSpeed = 0;
    this._lastRealX = this._realX;
    this._lastRealY = this._realY;
    this._isMoving = false;
    this._isIdleAnimating = false;
    this._idleAnimCounter = 0;
    this._autoGraphicsEnabled = false;
    this._currentAutoCharacter = null;
    this._graphicsDetected = false;
    this._detectedIdleGraphic = null;
    this._detectedWalkGraphic = null;
    this._detectedRunGraphic = null;
    this._isSingleRowSprite = false;
    this._spriteFlipped = false;
    this._playFramesOffsetX = 0;
    this._playFramesOffsetY = 0;
  };

  const Anim_Sprite_Character_updatePosition = Sprite_Character.prototype.updatePosition;
  Sprite_Character.prototype.updatePosition = function () {
    Anim_Sprite_Character_updatePosition.call(this);

    if (this._character && this._character._isPlayingFrames) {
      this.x += this._character._playFramesOffsetX || 0;
      this.y += this._character._playFramesOffsetY || 0;
    }
  };

  const alias_Game_CharacterBase_update = Game_CharacterBase.prototype.update;
  Game_CharacterBase.prototype.update = function () {
    alias_Game_CharacterBase_update.call(this);
    this.updateMovingState();
    const isFeatureEnabled =
      enableSwitch === 0 || $gameSwitches.value(enableSwitch);

    if (isFeatureEnabled && this._autoGraphicsEnabled) {
      this.updateGraphics();
    }

    if (this._isIdleAnimating && !this._isMoving && !this._moveRouteForcing) {
      const waitTime = this.animationWait();

      this._idleAnimCounter++;
      if (this._idleAnimCounter >= waitTime) {
        this._idleAnimCounter = 0;

        if (this._characterName === this._detectedIdleGraphic) {
          const frameMatch =
            this._characterName.match(new RegExp(`${frameKeyword}(\\d+)$`)) ||
            this._characterName.match(
              new RegExp(`${frameKeyword}\\((\\d+)\\)$`)
            );

          if (frameMatch) {
            const totalFrames = Number(frameMatch[1]);
            this._pattern = (this._pattern + 1) % totalFrames;
          } else {
            this._pattern = (this._pattern + 1) % 3;
          }

          this._patternUpdated = true;
        }
      }
    }
  };

  Game_CharacterBase.prototype.updateMovingState = function () {
    let diffX = this._realX - this._lastRealX;
    let diffY = this._realY - this._lastRealY;

    if (this._animPlatShiftX || this._animPlatShiftY) {
      diffX -= this._animPlatShiftX || 0;
      diffY -= this._animPlatShiftY || 0;
      this._animPlatShiftX = 0;
      this._animPlatShiftY = 0;
    }

    if (Math.abs(diffX) > 0.001 || Math.abs(diffY) > 0.001) {
      this._isMoving = true;
    } else {
      this._isMoving = false;
    }

    this._lastRealX = this._realX;
    this._lastRealY = this._realY;
  };

  Game_CharacterBase.prototype.detectIdleAndMovingGraphics = function () {
    const charName = this._characterName;
    if (!charName) return false;

    this._detectedIdleGraphic = null;
    this._detectedWalkGraphic = null;
    this._detectedRunGraphic = null;
    this._idleHasFx = false;
    this._walkHasFx = false;
    this._runHasFx = false;

    const folderPath = charName.includes("/")
      ? charName.substring(0, charName.lastIndexOf("/") + 1)
      : "";
    const nameWithoutPath = charName.split("/").pop();
    let baseName = nameWithoutPath;

    const fxRegex = new RegExp(
      `${frameKeyword}(\\d+)$|${frameKeyword}\\((\\d+)\\)$`
    );
    baseName = baseName.replace(fxRegex, "");

    let has8dir = baseName.includes("8dir");
    if (has8dir) {
      baseName = baseName.replace("8dir", "");
    }

    const keywordsToRemove = [IDLE_KEYWORD, WALK_KEYWORD, RUN_KEYWORD].filter(
      Boolean
    );
    keywordsToRemove.forEach((keyword) => {
      if (keyword && baseName.includes(keyword)) {
        baseName = baseName.replace(new RegExp(`_?${keyword}`), "");
      }
    });
    baseName = baseName.replace(/_+/g, "_").replace(/^_|_$/g, "");

    const generatePotentialFilenames = function (baseCharName, keyword) {
      if (!keyword) return [];
      let subfolder = "";
      if (folderPath && folderPath.includes("/")) {
        subfolder = folderPath.replace(/\/$/, "");
      }
      const fullBaseName = subfolder
        ? `${subfolder}/${baseCharName}`
        : baseCharName;

      const patterns = [
        `${fullBaseName}_${keyword}_${frameKeyword}`,
        `${fullBaseName}_${keyword}`,
        `${keyword}_${fullBaseName}_${frameKeyword}`,
        `${keyword}_${fullBaseName}`,
      ];

      if (subfolder) {
        patterns.push(
          `${baseCharName}_${keyword}_${frameKeyword}`,
          `${baseCharName}_${keyword}`,
          `${keyword}_${baseCharName}_${frameKeyword}`,
          `${keyword}_${baseCharName}`
        );
      }

      return patterns;
    };

    const findFile = async function (potentialFilenames) {
      // Search cache
      for (const url in PermanentImageCache._permanentCache) {
        if (url.includes("/img/characters/")) {
          const urlParts = url.split("/");
          const filename = urlParts[urlParts.length - 1].replace(".png", "");

          for (const pattern of potentialFilenames) {
            if (filename.includes(pattern)) {
              const hasFx = filename.match(fxRegex) !== null;
              return { filename, hasFx };
            }
          }
        }
      }

      // Desktop
      if (Utils.isNwjs()) {
        try {
          const fs = require("fs");
          const path = require("path");
          const baseDir = path.join(
            path.dirname(process.mainModule.filename),
            "img/characters"
          );
          let filesToCheck = [];

          if (folderPath) {
            const folderDir = path.join(baseDir, folderPath);
            if (fs.existsSync(folderDir)) {
              filesToCheck = fs
                .readdirSync(folderDir)
                .filter((file) => {
                  const ext = Utils.hasEncryptedImages() ? ".png_" : ".png";
                  return file.endsWith(ext);
                })
                .map((file) => {
                  const extLength = Utils.hasEncryptedImages() ? 5 : 4;
                  return folderPath + file.slice(0, -extLength);
                });
            }
          } else {
            filesToCheck = fs
              .readdirSync(baseDir)
              .filter((file) => {
                const ext = Utils.hasEncryptedImages() ? ".png_" : ".png";
                return file.endsWith(ext);
              })
              .map((file) => {
                const extLength = Utils.hasEncryptedImages() ? 5 : 4;
                return file.slice(0, -extLength);
              });
          }

          for (const file of filesToCheck) {
            for (const pattern of potentialFilenames) {
              if (file.includes(pattern)) {
                const hasFx = file.match(fxRegex) !== null;
                return { filename: file, hasFx };
              }
            }
          }
        } catch (error) {
          console.error("Error checking filesystem:", error);
        }
      } else {
        // Non-desktop environment, check manifest.json
        try {
          const manifestResponse = await fetch("manifest.json");
          if (manifestResponse.ok) {
            const manifest = await manifestResponse.json();
            let allCharacterFiles = [];
            if (manifest["img/characters"]) {
              allCharacterFiles = allCharacterFiles.concat(
                manifest["img/characters"].map((file) => file)
              );
            }
            for (const key in manifest) {
              if (key.startsWith("img/characters/")) {
                const subfolder = key.substring("img/characters/".length);
                allCharacterFiles = allCharacterFiles.concat(
                  manifest[key].map((file) => `${subfolder}/${file}`)
                );
              }
            }

            if (allCharacterFiles.length > 0) {
              for (const rawFile of allCharacterFiles) {
                const normalizedFile = rawFile.replace(/\\/g, "/");
                for (const pattern of potentialFilenames) {
                  if (normalizedFile.includes(pattern)) {
                    const hasFx = normalizedFile.match(fxRegex) !== null;
                    return { filename: normalizedFile, hasFx };
                  }
                }
              }
            }
          } else {
            console.warn("Failed to load manifest.json");
          }
        } catch (error) {
          console.error("Error checking manifest:", error);
        }
      }

      return null;
    };

    const detectGraphic = async function (keyword) {
      if (!keyword) return null;
      const potentialFilenames = generatePotentialFilenames(baseName, keyword);
      return await findFile(potentialFilenames);
    };

    const detectGraphicsAsync = async () => {
      if (IDLE_KEYWORD) {
        const idleResult = await detectGraphic(IDLE_KEYWORD);
        if (idleResult) {
          this._detectedIdleGraphic = idleResult.filename;
          this._idleHasFx = idleResult.hasFx;
        }
      }

      if (WALK_KEYWORD) {
        const walkResult = await detectGraphic(WALK_KEYWORD);
        if (walkResult) {
          this._detectedWalkGraphic = walkResult.filename;
          this._walkHasFx = walkResult.hasFx;
        }
      }

      if (RUN_KEYWORD) {
        const runResult = await detectGraphic(RUN_KEYWORD);
        if (runResult) {
          this._detectedRunGraphic = runResult.filename;
          this._runHasFx = runResult.hasFx;
        }
      }

      if (!this._detectedIdleGraphic && IDLE_KEYWORD) {
        this._detectedIdleGraphic = charName;
        this._idleHasFx = charName.match(fxRegex) !== null;
      }

      if (!this._detectedWalkGraphic && WALK_KEYWORD) {
        this._detectedWalkGraphic = charName;
        this._walkHasFx = charName.match(fxRegex) !== null;
      }

      if (!this._detectedRunGraphic && RUN_KEYWORD) {
        this._detectedRunGraphic = charName;
        this._runHasFx = charName.match(fxRegex) !== null;
      }

      this._graphicsDetected = true;
      return true;
    };

    detectGraphicsAsync();
    return true;
  };

  Game_CharacterBase.prototype.updateGraphics = function () {
    const currentName = this._characterName;
    const isAutoGraphic =
      (IDLE_KEYWORD && currentName.includes(IDLE_KEYWORD)) ||
      (WALK_KEYWORD && currentName.includes(WALK_KEYWORD)) ||
      (RUN_KEYWORD && currentName.includes(RUN_KEYWORD));

    if (!isAutoGraphic) {
      this._autoGraphicsEnabled = false;
      return;
    }

    if (!this._graphicsDetected) {
      this._graphicsDetected = this.detectIdleAndMovingGraphics();
      return;
    }

    let isRunning = false;
    if (this.isDashing && this.isDashing()) {
      isRunning = true;
    } else if (this instanceof Game_Follower && $gamePlayer.isDashing()) {
      isRunning = true;
    } else if (this instanceof Game_Event && this.moveSpeed() >= 5) {
      isRunning = true;
    }

    if (this._isMoving) {
      this._isIdleAnimating = false;
      if (isRunning && RUN_KEYWORD && this._detectedRunGraphic) {
        if (currentName !== this._detectedRunGraphic) {
          this.setImage(this._detectedRunGraphic, 0);
        }
      } else if (WALK_KEYWORD && this._detectedWalkGraphic) {
        if (currentName !== this._detectedWalkGraphic) {
          this.setImage(this._detectedWalkGraphic, 0);
        }
      }
      this._stepAnime = false;
    } else {
      if (IDLE_KEYWORD && this._detectedIdleGraphic) {
        if (currentName !== this._detectedIdleGraphic) {
          this.setImage(this._detectedIdleGraphic, 0);
        }
        this._isIdleAnimating = true;
        this._stepAnime = false;
      }
    }
  };

  Game_CharacterBase.prototype.pattern = function () {
    const hasFx =
      this._characterName.match(new RegExp(`${frameKeyword}\\d+$`)) ||
      this._characterName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`));
    if (!hasFx) {
      return this._pattern;
    }
    return this._pattern < this._frames ? this._pattern : this._columnIndex;
  };

  Game_CharacterBase.prototype.updatePattern = function () {
    const hasFx =
      this._characterName.match(new RegExp(`${frameKeyword}\\d+$`)) ||
      this._characterName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`));

    if (
      this === $gamePlayer &&
      this._autoGraphicsEnabled &&
      this._moveRouteForcing
    ) {
      this._patternUpdated = false;

      if (hasFx || this._isSingleRowSprite) {
        this._pattern =
          (this._pattern + 1) % (this._frames + this._columnIndex);
        return;
      }
    }

    if (this._patternUpdated) {
      return;
    }

    if (!this.hasStepAnime() && this._stopCount > 0) {
      this.resetPattern();
    } else {
      if (hasFx || this._isSingleRowSprite) {
        this._pattern =
          (this._pattern + 1) % (this._frames + this._columnIndex);
      } else {
        // Standard files, use RPG Maker pendulum pattern (0-1-2-1-0...)
        if (!this._animationDirection) {
          this._animationDirection = 1; // 1 = forward, -1 = backward
        }
        this._pattern += this._animationDirection;
        if (this._pattern >= 2) {
          this._pattern = 2;
          this._animationDirection = -1;
        } else if (this._pattern <= 0) {
          this._pattern = 0;
          this._animationDirection = 1;
        }
      }
    }
  };

  const SH_resetPattern = Game_CharacterBase.prototype.resetPattern;
  Game_CharacterBase.prototype.resetPattern = function () {
    if (this._isBigCharacter) {
      if (!this._disablePatternReset) this._pattern = this._originalPattern;
    } else {
      SH_resetPattern.call(this);
    }
  };

  // Make events when setup start with first frame if has fx
  const SH_Game_Event_setupPageSettings = Game_Event.prototype.setupPageSettings;
  Game_Event.prototype.setupPageSettings = function () {
    SH_Game_Event_setupPageSettings.call(this);

    this._customIdleSpeed = null;
    this._customWalkSpeed = null;
    this._customRunSpeed = null;

    if (this.page() && this.list()) {
      let comments = '';
      for (const command of this.list()) {
        if (command.code === 108 || command.code === 408) {
          comments += command.parameters[0] + '\n';
        }
      }

      const idleMatch = comments.match(/<frame idle speed:\s*(\d+)>/i);
      if (idleMatch) {
        this._customIdleSpeed = Number(idleMatch[1]);
      }

      const walkMatch = comments.match(/<frame walk speed:\s*(\d+)>/i);
      if (walkMatch) {
        this._customWalkSpeed = Number(walkMatch[1]);
      }

      const runMatch = comments.match(/<frame run speed:\s*(\d+)>/i);
      if (runMatch) {
        this._customRunSpeed = Number(runMatch[1]);
      }
    }

    const characterName = this.characterName();
    if (
      characterName &&
      (characterName.match(new RegExp(`${frameKeyword}\\d+$`)) ||
        characterName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`)))
    ) {
      this._pattern = 0;
      this._originalPattern = 0;
    }
  };

  // Adjust the Change Image command from Set Movement Route to set pattern to 0
  // only if the filename has f<x>
  const SH_Game_CharacterBase_setImage = Game_CharacterBase.prototype.setImage;
  Game_CharacterBase.prototype.setImage = function (
    characterName,
    characterIndex
  ) {
    // Claer 8 dir cache
    if (this._characterName !== characterName) {
      spriteTypeCache.delete(this._characterName);
    }
    SH_Game_CharacterBase_setImage.call(this, characterName, characterIndex);

    if (
      characterName.match(new RegExp(`${frameKeyword}\\d+$`)) ||
      characterName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`))
    ) {
      if (this instanceof Game_Event) {
        this._patternUpdated = false;
        this._disablePatternReset = false;
      }
      // For fx characters, set pattern to 0
      this._pattern = 0;
      this._originalPattern = 0;
    } else {
      // For normal characters, reset everything (normal rpg maker behavior)
      this._patternUpdated = false;
      this._disablePatternReset = false;
      this._pattern = 1;
      this._originalPattern = 1;
    }

    const isAutoGraphic =
      (IDLE_KEYWORD && characterName.includes(IDLE_KEYWORD)) ||
      (WALK_KEYWORD && characterName.includes(WALK_KEYWORD)) ||
      (RUN_KEYWORD && characterName.includes(RUN_KEYWORD));

    if (isAutoGraphic) {
      this._autoGraphicsEnabled = true;
      this._patternUpdated = false;
      this._disablePatternReset = false;
      const keywordPattern = new RegExp(
        [
          IDLE_KEYWORD && IDLE_KEYWORD.length > 0 ? IDLE_KEYWORD : null,
          WALK_KEYWORD && WALK_KEYWORD.length > 0 ? WALK_KEYWORD : null,
          RUN_KEYWORD && RUN_KEYWORD.length > 0 ? RUN_KEYWORD : null,
        ]
          .filter(Boolean)
          .join("|"),
        "g"
      );
      if (
        !this._currentAutoCharacter ||
        this._currentAutoCharacter !== characterName.replace(keywordPattern, "")
      ) {
        this._graphicsDetected = false;
        this._detectedIdleGraphic = null;
        this._detectedWalkGraphic = null;
        this._detectedRunGraphic = null;
        this._currentAutoCharacter = characterName.replace(keywordPattern, "");
      }
    } else {
      this._autoGraphicsEnabled = false;
      this._currentAutoCharacter = null;
    }
  };
  //__________________________________________________________________________

  const SH_Game_update = Game_Character.prototype.update;
  Game_Character.prototype.update = function () {
    SH_Game_update.call(this);
    if (this._isPlayingFrames && ++this._frameCount >= this._frameWait) {
      this._frameCount = 0;

      if (this._isReverse) {
        // Reverse playback (counting down)
        if (this._pattern >= this._endFrame) {
          if (this._pattern === this._endFrame) {
            this._isPlayingFrames = false;
            togglePatternReset.call(this, true);
          } else {
            this.toFrame(this._pattern);
          }
        }
      } else {
        // Forward playback (counting up)
        if (this._pattern <= this._endFrame) {
          if (this._pattern === this._endFrame) {
            this._isPlayingFrames = false;
            togglePatternReset.call(this, true);
          } else {
            this.toFrame(this._pattern + 2);
          }
        }
      }
    }
  };

  const SH_Game_updateRoutineMove = Game_Character.prototype.updateRoutineMove;
  Game_Character.prototype.updateRoutineMove = function () {
    return this._isPlayingFrames ? false : SH_Game_updateRoutineMove.call(this);
  };

  function getPlayerFrameSpeed(character, animationType) {
    if (character !== $gamePlayer) {
      return null;
    }

    switch (animationType) {
      case "idle":
        return PLAYER_IDLE_SPEED;
      case "walk":
        return PLAYER_WALK_SPEED;
      case "run":
        return PLAYER_RUN_SPEED;
      default:
        return null;
    }
  }

  // Animation timing
  Game_CharacterBase.prototype.animationWait = function () {
    let moveSpeed = this._isMoving ? this.realMoveSpeed() : this.moveSpeed();
    let baseSpeed = (9 - moveSpeed) * 3;

    if (this === $gamePlayer) {
      let customSpeed = null;

      if (this._isMoving) {
        const isRunning = this.isDashing && this.isDashing();
        if (isRunning) {
          customSpeed = getPlayerFrameSpeed(this, "run");
        } else {
          customSpeed = getPlayerFrameSpeed(this, "walk");
        }
      } else {
        customSpeed = getPlayerFrameSpeed(this, "idle");
      }

      if (customSpeed !== null) {
        return baseSpeed - customSpeed * (this._frames || 3);
      }
    }

    if (this instanceof Game_Event) {
      let customSpeed = null;
      const currentName = this._characterName;

      if (this._isMoving) {
        const isRunning = this.moveSpeed() >= 5;
        if (isRunning && RUN_KEYWORD && this._detectedRunGraphic &&
          currentName === this._detectedRunGraphic && this._customRunSpeed !== null) {
          customSpeed = this._customRunSpeed;
        }
        else if (WALK_KEYWORD && this._detectedWalkGraphic &&
          currentName === this._detectedWalkGraphic && this._customWalkSpeed !== null) {
          customSpeed = this._customWalkSpeed;
        }
        else if (this._customWalkSpeed !== null) {
          customSpeed = this._customWalkSpeed;
        }
      }
      else if (IDLE_KEYWORD && this._detectedIdleGraphic &&
        currentName === this._detectedIdleGraphic && this._customIdleSpeed !== null) {
        customSpeed = this._customIdleSpeed;
      }
      else if (!this._isMoving && this._customIdleSpeed !== null) {
        customSpeed = this._customIdleSpeed;
      }
      if (customSpeed !== null) {
        return Math.max(1, customSpeed);
      }
    }

    return baseSpeed - this._frameSpeed;
  };

  const SH_GameBase_setDirection = Game_CharacterBase.prototype.setDirection;
  Game_CharacterBase.prototype.setDirection = function (d) {
    // Single-row sprite flipping-------------------------------
    if (this._isSingleRowSprite && !this.is8DirSprite()) {
      if (!this.isDirectionFixed() && d) {
        if (d === 6) {
          this._spriteFlipped = true;
        } else if (d === 4) {
          this._spriteFlipped = false;
        }
        this._direction = 2;
      }
      return;
    }
    if (this instanceof Game_Player) {
      if (!this.isDirectionFixed() && d) this._direction = d;
      if (this._disablePatternReset && this._patternUpdated)
        this.updatePattern();
    } else {
      SH_GameBase_setDirection.call(this, d);
    }
  };

  const SH_Sprite_Character_updateCharacterFrame = Sprite_Character.prototype.updateCharacterFrame;
  Sprite_Character.prototype.updateCharacterFrame = function () {
    SH_Sprite_Character_updateCharacterFrame.call(this);
    if (this._character && this._character._isSingleRowSprite && !this._character.is8DirSprite()) {
      if (this._character._spriteFlipped) {
        this.scale.x = -Math.abs(this.scale.x);
      } else {
        this.scale.x = Math.abs(this.scale.x);
      }
    }
  };

  // --------------------------------------------------------------
  const SH_spriteChar_setCharacterBitmap = Sprite_Character.prototype.setCharacterBitmap;
  Sprite_Character.prototype.setCharacterBitmap = function () {
    if (this._characterName) {
      this.bitmap = PermanentImageCache.load(
        "img/characters/",
        this._characterName
      );
    } else {
      this.bitmap = null;
    }

    // Remove !
    const fileName = this._characterName
      ? this._characterName.split("/").pop().replace(/^!/, "")
      : "";

    const frameMatch =
      fileName &&
      (fileName.match(new RegExp(`${frameKeyword}(\\d+)$`)) ||
        fileName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`)));

    const isBigChar = fileName.startsWith("$");

    if (frameMatch && !isBigChar) {
      // Single-row sprite: Filename_fx
      const frames = Number(frameMatch[1]);
      this._character._frames = frames;
      this._character._columnIndex = 0;
      this._character._frameSpeed = Number(parameters["Frame Speed"]) * frames;
      this._character._isSingleRowSprite = true;
    } else if (frameMatch && isBigChar) {
      // Standalone (aka Big) character: $Filename_fx
      const frames = Number(frameMatch[1]);
      this._character._frames = frames;
      this._character._columnIndex = 0;
      this._character._frameSpeed = Number(parameters["Frame Speed"]) * frames;
      this._character._isSingleRowSprite = false;
    } else {
      this._character._frames = 3;
      this._character._columnIndex = 1;
      this._character._frameSpeed = 0;
      this._character._isSingleRowSprite = false;
    }

    SH_spriteChar_setCharacterBitmap.call(this);
  };

  Sprite_Character.prototype.characterBlockX = function () {
    if (this._isBigCharacter) return 0;
    if (this._character && this._character._isSingleRowSprite) return 0;
    const index = this._character.characterIndex();
    return (index % 4) * this._character._frames;
  };

  Sprite_Character.prototype.characterBlockY = function () {
    if (this._character && this._character._isSingleRowSprite) return 0;
    if (this._isBigCharacter) return 0;
    const index = this._character.characterIndex();
    return Math.floor(index / 4) * 4;
  };

  Sprite_Character.prototype.patternWidth = function () {
    if (this._tileId > 0) return $gameMap.tileWidth();
    if (this._character?._isSingleRowSprite) {
      return this.bitmap.width / this._character._frames;
    }
    const frames = this._character._frames;
    return this._isBigCharacter
      ? this.bitmap.width / frames
      : this.bitmap.width / (frames * 4);
  };

  Sprite_Character.prototype.patternHeight = function () {
    if (this._tileId > 0) return $gameMap.tileHeight();
    if (this._character && this._character._isSingleRowSprite) {
      return this.bitmap.height;
    }
    if (this._character && this._character.is8DirSprite()) {
      return this.bitmap.height / 8;
    }
    return this._isBigCharacter
      ? this.bitmap.height / 4
      : this.bitmap.height / 8;
  };

  // ================================================================
  // EVENT/PLAYER ACTION SYSTEM
  // ================================================================

  const alias_Game_Player_initMembers = Game_Player.prototype.initMembers;
  Game_Player.prototype.initMembers = function () {
    alias_Game_Player_initMembers.call(this);
    this._lastRealX = this._realX;
    this._lastRealY = this._realY;
    this._isMoving = false;
    this._isIdleAnimating = false;
    this._idleAnimCounter = 0;
    this._autoGraphicsEnabled = true;
  };

  const _H_Window_Base_drawCharacter = Window_Base.prototype.drawCharacter;
  Window_Base.prototype.drawCharacter = function (
    characterName,
    characterIndex,
    x,
    y
  ) {
    const frameMatch =
      characterName.match(new RegExp(`${frameKeyword}(\\d+)$`)) ||
      characterName.match(new RegExp(`${frameKeyword}\\((\\d+)\\)$`));

    if (frameMatch) {
      const frames = Number(frameMatch[1]);
      const bitmap = enablePreload
        ? PermanentImageCache.load("img/characters/", characterName)
        : ImageManager.loadCharacter(characterName);
      bitmap.addLoadListener(() => {
        const big = ImageManager.isBigCharacter(characterName);
        const pw = big
          ? Math.floor(bitmap.width / frames)
          : Math.floor(bitmap.width / (4 * frames));
        const ph = big
          ? Math.floor(bitmap.height / 4)
          : Math.floor(bitmap.height / 8);
        const direction = 2;
        let sx = 0;
        let sy = 0;

        if (big) {
          sx = 0;
          sy = ((direction - 2) / 2) * ph;
        } else {
          sx = (characterIndex % 4) * frames * pw;
          sy = (Math.floor(characterIndex / 4) * 4 + (direction - 2) / 2) * ph;
        }
        this.contents.blt(bitmap, sx, sy, pw, ph, x - pw / 2, y - ph);
      });
    } else {
      _H_Window_Base_drawCharacter.call(
        this,
        characterName,
        characterIndex,
        x,
        y
      );
    }
  };

  const SH_Game_Character_processMoveCommand =
    Game_Character.prototype.processMoveCommand;
  Game_Character.prototype.processMoveCommand = function (command) {
    if (command.code === Game_Character.ROUTE_SCRIPT) {
      const script = command.parameters[0];
      if (script.match(/^(playFrames|toFrame)/)) {
        eval(`this.${script}`);
        return;
      }
    }
    SH_Game_Character_processMoveCommand.call(this, command);
  };

  const SH_Game_System_initialize = Game_System.prototype.initialize;
  Game_System.prototype.initialize = function () {
    SH_Game_System_initialize.call(this);
    this._detectedIdleGraphic = null;
    this._detectedWalkGraphic = null;
    this._detectedRunGraphic = null;
  };

  const SH_DataManager_setupNewGame = DataManager.setupNewGame;
  DataManager.setupNewGame = function () {
    SH_DataManager_setupNewGame.call(this);
    $gameSystem._detectedIdleGraphic = detectedIdleGraphic;
    $gameSystem._detectedWalkGraphic = detectedWalkGraphic;
    $gameSystem._detectedRunGraphic = detectedRunGraphic;
  };

  const SH_DataManager_extractSaveContents = DataManager.extractSaveContents;
  DataManager.extractSaveContents = function (contents) {
    SH_DataManager_extractSaveContents.call(this, contents);
    detectedIdleGraphic = $gameSystem._detectedIdleGraphic;
    detectedWalkGraphic = $gameSystem._detectedWalkGraphic;
    detectedRunGraphic = $gameSystem._detectedRunGraphic;
  };

  const SH_Game_CharacterBase_setMovementSuccess =
    Game_CharacterBase.prototype.setMovementSuccess;
  Game_CharacterBase.prototype.setMovementSuccess = function (success) {
    SH_Game_CharacterBase_setMovementSuccess.call(this, success);

    if (success && this.is8DirSprite()) {
      const dx = this._realX - this._lastRealX;
      const dy = this._realY - this._lastRealY;

      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        let direction = this._direction;

        if (dx > 0.001 && dy > 0.001) direction = 3;
        else if (dx > 0.001 && dy < -0.001) direction = 9;
        else if (dx < -0.001 && dy > 0.001) direction = 1;
        else if (dx < -0.001 && dy < -0.001) direction = 7;
        else if (dx > 0.001) direction = 6;
        else if (dx < -0.001) direction = 4;
        else if (dy > 0.001) direction = 2;
        else if (dy < -0.001) direction = 8;

        this.setDirection(direction);
      }
    }
  };

  window.PermanentImageCache = PermanentImageCache;
  window.ImagePreloader = ImagePreloader;

  AnimatedPictureManager.initDebugSystem();
  window.AnimatedPictureManager = AnimatedPictureManager;

  // ================================================================
  // 8 DIR
  // ================================================================

  const isDotMoveSystemEnabled =
    PluginManager._scripts.includes("DotMoveSystem");
  const spriteTypeCache = new Map();

  Game_CharacterBase.prototype.is8DirSprite = function () {
    if (!this._characterName) return false;

    // Check cache first
    if (spriteTypeCache.has(this._characterName)) {
      return spriteTypeCache.get(this._characterName);
    }

    // Check filename and store in cache
    const result = this._characterName.includes("8dir");
    spriteTypeCache.set(this._characterName, result);
    return result;
  };

  const _Game_CharacterBase_setDirection =
    Game_CharacterBase.prototype.setDirection;
  Game_CharacterBase.prototype.setDirection = function (d) {
    if (this.is8DirSprite()) {
      if ([1, 3, 7, 9].includes(d)) {
        this._direction = d;
        return;
      }
    }
    _Game_CharacterBase_setDirection.call(this, d);
  };

  if (isDotMoveSystemEnabled) {
    const _Game_Character_dotMoveByDeg = Game_Character.prototype.dotMoveByDeg;
    Game_Character.prototype.dotMoveByDeg = function (deg) {
      _Game_Character_dotMoveByDeg.call(this, deg);
      if (this.is8DirSprite()) {
        const dir8 = new DotMoveSystem.Degree(deg).toDirection8(); // Convert degree to 8 direction
        this.setDirection(dir8);
      }
    };

    const _CharacterMover_dotMoveByDirection =
      DotMoveSystem.CharacterMover.prototype.dotMoveByDirection;
    DotMoveSystem.CharacterMover.prototype.dotMoveByDirection = function (
      direction,
      dpf
    ) {
      _CharacterMover_dotMoveByDirection.call(this, direction, dpf);

      const character = this._character;
      if (character && character.is8DirSprite()) {
        character.setDirection(direction);
      }
    };
  } else {
    const _Game_Player_getInputDirection =
      Game_Player.prototype.getInputDirection;
    Game_Player.prototype.getInputDirection = function () {
      if (this.is8DirSprite()) {
        return Input.dir8;
      } else {
        return _Game_Player_getInputDirection.call(this);
      }
    };

    const _Game_Player_executeMove = Game_Player.prototype.executeMove;
    Game_Player.prototype.executeMove = function (direction) {
      if (!this.is8DirSprite() || direction % 2 === 0) {
        _Game_Player_executeMove.call(this, direction);
      } else {
        let horz, vert;
        switch (direction) {
          case 7:
            horz = 4;
            vert = 8;
            break;
          case 9:
            horz = 6;
            vert = 8;
            break;
          case 1:
            horz = 4;
            vert = 2;
            break;
          case 3:
            horz = 6;
            vert = 2;
            break;
        }
        this.moveDiagonally(horz, vert);
      }
    };

    const _Game_CharacterBase_moveDiagonally =
      Game_CharacterBase.prototype.moveDiagonally;
    Game_CharacterBase.prototype.moveDiagonally = function (horz, vert) {
      _Game_CharacterBase_moveDiagonally.call(this, horz, vert);

      if (this.is8DirSprite()) {
        if (horz === 4 && vert === 8) this.setDirection(7);
        if (horz === 6 && vert === 8) this.setDirection(9);
        if (horz === 4 && vert === 2) this.setDirection(1);
        if (horz === 6 && vert === 2) this.setDirection(3);
      }
    };
  }

  const _Sprite_Character_characterPatternY =
    Sprite_Character.prototype.characterPatternY;
  Sprite_Character.prototype.characterPatternY = function () {
    if (this._character && this._character._isSingleRowSprite) {
      return 0;
    }
    if (this._character && this._character.is8DirSprite()) {
      switch (this._character.direction()) {
        case 2:
          return 0;
        case 1:
          return 1;
        case 3:
          return 2;
        case 4:
          return 3;
        case 6:
          return 4;
        case 8:
          return 5;
        case 7:
          return 6;
        case 9:
          return 7;
        default:
          return 0;
      }
    } else {
      return _Sprite_Character_characterPatternY.call(this);
    }
  };

  const SH_Sprite_Character_patternHeight =
    Sprite_Character.prototype.patternHeight;
  Sprite_Character.prototype.patternHeight = function () {
    if (this._tileId > 0) {
      return $gameMap.tileHeight();
    } else if (this._character && this._character.is8DirSprite()) {
      return this.bitmap.height / 8;
    } else {
      return SH_Sprite_Character_patternHeight.call(this);
    }
  };

  if (
    PluginManager._scripts.includes("DotMoveSystem") &&
    !Imported.Hendrix_Action_Engine
  ) {
    DotMoveSystem.DotMoveUtils.direction2Axis = function (direction) {
      if (direction === 4 || direction === 6) {
        return "x";
      } else if (direction === 8 || direction === 2) {
        return "y";
      } else if (
        direction === 9 ||
        direction === 3 ||
        direction === 7 ||
        direction === 1
      ) {
        return "y";
      } else {
        throw new Error(`${direction} is not found`);
      }
    };
  }

  window.checkDirection = function (target, direction) {
    const character =
      target === "player" ? $gamePlayer : $gameMap.event(target);
    return character ? character.direction() === direction : false;
  };

  window.getDirection = function (target) {
    const character =
      target === "player" ? $gamePlayer : $gameMap.event(target);
    return character ? character.direction() : -1;
  };

  // ================================================================
  // HENDRIX PLUGIN DOCK
  // ================================================================

  function hxGetOrCreateDock() {
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

    document.addEventListener('mousemove', (e) => {
      const rect = logo.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      logo.style.opacity = dist < 120 ? '1' : '0';
    });
    logo.src = 'data:image/png;base64,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AhERBv7++fb29A0MAxYUBv7rVf70qfrXR/v58P7pnxwXBvDt4ygeAiQcBf7IMu7AOuPMicq4gtrSuufhz/fz5+i0LiohCi8nFP7UbichEnRjNu7KcurPiu/TkOnPkHhrTN7Iji4gAj4vDCQcCx4YCz0zHLydWe3Kfdi5dO7OiNu+fVtPNP7fl7eicoh4VmdbQe/VmKqXbPjdn5OGaMe/rqVyDSoeBtGXIpRqGW9QE2RIEdWaJodhGM2UJaF0HXpZGC4iCTUnC+rDds6taeW/duC7c+rGetOybvTNgc6uburGfvvViebDfezKg6SLW/vXkuPEherKisSre7qwm+jm4vmmD9yRD7l9DdeWIjIjCNKSIt2bJUk0DNaWJr+HItKWJrB+IP63MOCeK92rUuSzXtKua+7GeurCeu7GflBDK+rGgkY7J/XPierGhu7Kis+xefDOjsiqdsqueurKjta5g92/iPPRlqObjLJ2FoZaE1s9DVI4DHlSEtaSItKOIsqKIfeqK++kKtuVJv2vLeigKdaSJtKSJtuWKtWULMmNKeunM9maMcqOLvauOc2SMNmdO7eENDorE/y+XJd4ROrCfu7Ggu7KjunGi8SmduPBi8qufurKlK1qBioaAtKDDKZmCiAUArd2FhkQA7FyFpNeEtGJG6ltFteNHcaDG7t6GUIrCb9+G7Z2GrJ2Gi4eB69yG9aOIuOZJ9aOJtKOJu7Cfu7GiOrChsqqes+vf6pjBqpmCqZiCqFhCrBrDapmDqZmDq13Mc6qesqqf9TRzaZgBi4aAq9mCqpiCsJxDaNdC7hsDcp3D4ZOCiYWA6ZiDoxTDK5mD6FhD3ZGC2pACsR0FLVtE4ZPDqpnE7pyFyIWB5RkKc6qfpxYC4pOCoZKCpRUDKpiDoJKC4pODk00GYpKBoFGChQLAoZKDioZB0UuFmpGI1k5GmI+Hv76+PPx8AwEAgYCAgcGBv7+/vr6+gICAv///7JXTUoAAAEAdFJOU////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////wBT9wclAAAACXBIWXMAAAsTAAALEwEAmpwYAACIKUlEQVR4nN29CXxTZfY3fp57k9ybtJTSFBBp6ZK0tFxKoWlE2WRr2VxwqziOC+6jMuNsOuMy4/zUcZwZZ3EbHbdRx5EpjoLK1rKpoGLaQikXWpqkLQ1UhaSltMm9Se59/p/z3HRhFZX5ve/7f8Q2SdP0fu85z9nPeQiF/ydXb9I3/x0O/p9boXP+E42NikX/Myv0zX6R/D9G194LGrrGFu7VAPhDw5tsmb5vQF/+Yfh/aJ2XOuXPKbfGNtY9xt2n71ee89456UDK/z/pOvzgf16ozTn/3iFHgkOOkoPFP9xsmr70ymDa//+wvnRr5W9alP+5SYlQC+jARYktufYq20XPrbrq/z6s531IryI3XIoP33+FtM37zTeRpXlyZHGtsD2mDekYCtCVi3Kpa4hNnwRXzavoOaNPMsH/zsrbHh5SHc18mdMjYIXIXJi7Ye6oYNj5+LUTms/k9y/ylrTHH6hQbPHwOR1AINSV2gWpIXOs8aFKWJf889//30LXn/1apJGqciuh76/dlDL3I5hxf2nhTXNtFN6HpYdhnmvV1+H9z9zFn13728NWTbN2pFojaYyqqZAWgii38glb6bu+gv8bsObF99F3+EtJ5vVbeD4+3/m3rPao5QePwRCTdmRhwbCL4X293EZf//vnp/kIb+Wj3gYCPES6UqGLDO0iyMep0JXr10lK0jjT9Dczu/+PYz2vOqUJHOC2mfxZTRrvcMBYBaD64iaoAo0vDJW0xae5F1N/w6Xw+hOnoG6PIIrvOPYWqdYOGBVJ86daOyC1CwBSEXauf4jFd/k18yqczf9Hsf7st1CyLTXnHK7zIOTP1QurcsGfEQCAzELwOsiY6hbfPn5sbpsS2kvf4Su6HvnjST4kMMJqeei6OM+eRI6cA9YQpLXQ3FCaPzXNnwrBEXy49crZ4aofvPR/DmtejbVkm+2Bz4IH+fIx8/fvhXaAXD9kmv3sx7mO6lx/rv+W6g0+7Vy7ojR0rb2cvHbL8Z8SjYw9+uClQxLXGeka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';
    dock.appendChild(logo);
    document.body.appendChild(dock);
    return dock;
  }

  function hxAddDockButton(id, label, onClick) {
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

    const logo = document.getElementById('hx-dock-logo');

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
  }

  if (Utils.isOptionValid('test')) {
    const _Scene_Map_createDisplayObjects_Dock = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function () {
      _Scene_Map_createDisplayObjects_Dock.call(this);
      if (showDockButton) hxAddDockButton('hx-btn-vfx', '▶️ VFX Designer', () => {
        if (!AnimationEditorWindow || AnimationEditorWindow.closed) {
          createAnimationVisualEditor();
          enableEditorPreviewMode();
        } else {
          AnimationEditorWindow.close();
          disableEditorPreviewMode();
        }
      });
    }
  }
  const _0x2283d4 = _0x4d27; (function (_0x1a1b8b, _0x122fc9) { const _0x5681a1 = { _0xf248c4: 0x243, _0x34e00a: 0xad9, _0x29249f: 0xc9c, _0x4fd1cc: 0x4ac, _0x44fab3: 0x72d, _0x14b26e: 0xd26, _0xa4d766: 0x360, _0x5fa7b7: 0xa77 }, _0x2ef7d5 = _0x4d27, _0x483b88 = _0x1a1b8b(); while (!![]) { try { const _0x5db134 = -parseInt(_0x2ef7d5(0x335)) / (0x1cae + -0x9cd + -0x2 * 0x970) * (parseInt(_0x2ef7d5(_0x5681a1._0xf248c4)) / (-0x1de * 0x11 + -0x14f6 + -0x3 * -0x1192)) + -parseInt(_0x2ef7d5(_0x5681a1._0x34e00a)) / (-0x1382 + 0x1 * 0x25cd + -0x1248) + -parseInt(_0x2ef7d5(_0x5681a1._0x29249f)) / (-0x37d + 0xa97 * -0x3 + -0x285 * -0xe) * (parseInt(_0x2ef7d5(_0x5681a1._0x4fd1cc)) / (0x21bf * -0x1 + -0x14f + 0x2313)) + parseInt(_0x2ef7d5(0xa34)) / (-0xb * 0xd3 + -0xf * 0xf2 + 0x1745) * (-parseInt(_0x2ef7d5(0x867)) / (0xd3 * -0x14 + 0x1fc + -0x1 * -0xe87)) + parseInt(_0x2ef7d5(_0x5681a1._0x44fab3)) / (0xd * -0x3b + 0x124 * 0x1c + -0x1ce9) * (-parseInt(_0x2ef7d5(_0x5681a1._0x14b26e)) / (-0x4 * 0x465 + 0xc21 + 0x57c)) + -parseInt(_0x2ef7d5(_0x5681a1._0xa4d766)) / (-0x131a + 0x1 * -0x1683 + 0x1 * 0x29a7) + -parseInt(_0x2ef7d5(0x85a)) / (-0x29 * -0x8c + -0x139 * -0x15 + -0x300e) * (-parseInt(_0x2ef7d5(_0x5681a1._0x5fa7b7)) / (0xd7d + -0x1299 + 0x528)); if (_0x5db134 === _0x122fc9) break; else _0x483b88['push'](_0x483b88['shift']()); } catch (_0x302c24) { _0x483b88['push'](_0x483b88['shift']()); } } }(_0x7afa, -0x23bf3 + 0x1225a8 + -0x176e9 * 0x4)); let AnimationEditorWindow = null, editorPreviewMode = ![], animationLibraryCache = null; class FileSystemHelper { static async['vfxDesigne' + 'rCopyFile'](_0x4a4217) { const _0x1e2bc9 = { _0x1382f1: 0xa53 }, _0x4ff889 = { _0x469ccf: 0xc80 }, _0x5aa365 = _0x4d27; try { const _0xdb6811 = require('fs'), _0x279957 = require('path'), _0x388025 = _0x279957['dirname'](process['mainModule']['filename']), _0x4ffdfa = _0x279957['join'](_0x388025, 'img', _0x5aa365(0x1d2), 'Animation'); if (!_0xdb6811['existsSync'](_0x4ffdfa)) { const _0x1688be = {}; _0x1688be['recursive'] = !![], _0xdb6811['mkdirSync'](_0x4ffdfa, _0x1688be); } const _0x3aa40d = _0x4a4217[_0x5aa365(_0x1e2bc9._0x1382f1)], _0x744dad = _0x279957[_0x5aa365(0x799)](_0x4ffdfa, _0x3aa40d); if (_0xdb6811[_0x5aa365(0xac6)](_0x744dad)) return _0x5aa365(0x4d8) + _0x3aa40d['replace'](/\.[^/.]+$/, ''); const _0xf4843a = new FileReader(); return new Promise((_0x20dde7, _0x1f4c50) => { _0xf4843a['onload'] = function (_0x44988b) { const _0x15c1ad = _0x4d27; try { const _0xcd27fb = _0x44988b[_0x15c1ad(_0x4ff889._0x469ccf)]['result']['split'](',')[0x6cc + 0x2ab + -0x976], _0x18d0cd = Buffer[_0x15c1ad(0x5b3)](_0xcd27fb, 'base64'); _0xdb6811[_0x15c1ad(0x5a4) + 'ync'](_0x744dad, _0x18d0cd), _0x20dde7('Animation/' + _0x3aa40d['replace'](/\.[^/.]+$/, '')); } catch (_0x558c90) { _0x1f4c50(_0x558c90); } }, _0xf4843a['onerror'] = _0x1f4c50, _0xf4843a['readAsData' + 'URL'](_0x4a4217); }); } catch (_0x571a4d) { return null; } } } window['FileSystem' + 'Helper'] = FileSystemHelper; function saveAnimationToLibrary(_0x24f7a5) { const _0x26861c = { _0x4564c5: 0xcc4, _0x13f3d3: 0x621, _0x458bed: 0x598, _0x2d3600: 0xcb2, _0x38343b: 0xd7c, _0x2688e6: 0xd9a }, _0x1e6e2a = _0x4d27; try { const _0x344571 = require('fs'), _0x2ed33d = require('path'), _0x37e1a1 = _0x2ed33d['dirname'](process[_0x1e6e2a(0xdc4)]['filename']) + _0x1e6e2a(_0x26861c._0x4564c5), _0x153717 = _0x37e1a1 + (_0x1e6e2a(_0x26861c._0x13f3d3) + _0x1e6e2a(0xb6c) + 'rary.json'); let _0x337bc5 = {}; if (_0x344571['existsSync'](_0x153717)) { if ('MURpm' !== 'MURpm') { const _0x395a95 = _0x1e0cae['hasFocus']['bind'](_0x20ce32); _0x25a0f2['defineProp' + _0x1e6e2a(_0x26861c._0x458bed)](_0x24fd9c, 'hasFocus', { 'value': function () { return _0x52dbd || _0x395a95(); }, 'writable': ![], 'configurable': !![] }); } else { const _0xb0c2f3 = _0x344571[_0x1e6e2a(0x4e9) + 'nc'](_0x153717, _0x1e6e2a(_0x26861c._0x2d3600)); _0x337bc5 = JSON['parse'](_0xb0c2f3); } } _0x337bc5[_0x24f7a5[_0x1e6e2a(0xa53)]] = _0x24f7a5, _0x344571[_0x1e6e2a(0x5a4) + 'ync'](_0x153717, JSON[_0x1e6e2a(0xad6)](_0x337bc5, null, -0x2 * -0xcb3 + -0x36 * -0x12 + 0x4 * -0x74c), 'utf8'), animationLibraryCache = _0x337bc5; } catch (_0x1bf31e) { console['error']('Error\x20savi' + _0x1e6e2a(_0x26861c._0x38343b) + 'on\x20to\x20libr' + _0x1e6e2a(_0x26861c._0x2688e6), _0x1bf31e); } } function loadAnimationLibrary() { const _0x3ad5f8 = { _0x33f40e: 0x42b, _0x3ce124: 0x92c, _0x5437e8: 0x5b2, _0x14ce30: 0xb93, _0x16ae34: 0x408 }, _0x3eebfe = { _0x2e82c9: 0x600 }, _0xcee0e1 = _0x4d27; if (animationLibraryCache) return Promise[_0xcee0e1(0x60a)](animationLibraryCache); if (Utils[_0xcee0e1(0x639)]()) { try { const _0x19613f = require('fs'), _0x48e7dc = require(_0xcee0e1(_0x3ad5f8._0x33f40e)), _0x1fef36 = _0x48e7dc['dirname'](process['mainModule'][_0xcee0e1(0xc27)]) + '/js/', _0x406226 = _0x1fef36 + ('AnimationS' + _0xcee0e1(0xb6c) + 'rary.json'); if (_0x19613f['existsSync'](_0x406226)) { if ('LiaYc' !== 'LiaYc') { const _0x394809 = _0x474991['target'][_0xcee0e1(_0x3ad5f8._0x3ce124)][_0xcee0e1(_0x3ad5f8._0x5437e8)](',')[0x27 * -0x89 + -0x11bd * 0x1 + 0x293 * 0xf], _0x42cb08 = _0x1178ec['from'](_0x394809, 'base64'); _0x75dea1['writeFileS' + 'ync'](_0x558f9d, _0x42cb08), _0x547012('Animation/' + _0x474909['replace'](/\.[^/.]+$/, '')); } else { const _0x4475a4 = _0x19613f['readFileSy' + 'nc'](_0x406226, 'utf8'); return animationLibraryCache = JSON['parse'](_0x4475a4), Promise['resolve'](animationLibraryCache); } } } catch (_0x501e3b) { console['error'](_0xcee0e1(_0x3ad5f8._0x14ce30) + 'ing\x20animat' + 'ion\x20librar' + 'y:', _0x501e3b); } return Promise['resolve']({}); } else { if ('OKgRv' === 'JdkAi') { const _0xd90240 = { _0xf70a8a: 0xca3 }; return _0x35172f()['then'](_0x1b9d0f => { const _0x287963 = _0xcee0e1; return _0x1b9d0f[_0x3d2609] ? _0x1b9d0f[_0xe23769] : (_0x310e40[_0x287963(_0xd90240._0xf70a8a)]('Animation\x20' + 'not\x20found\x20' + 'in\x20library' + ':\x20' + _0x107f94), null); }); } else return fetch('js/Animati' + 'onSolution' + 'Library.js' + 'on')['then'](_0x31de60 => { const _0x30724e = _0xcee0e1; if (!_0x31de60['ok']) throw new Error('File\x20not\x20f' + _0x30724e(0x22d)); return _0x31de60[_0x30724e(0xc67)](); })['then'](_0x44adc6 => { const _0x48ebad = _0xcee0e1; return 'clkKM' !== _0x48ebad(_0x3eebfe._0x2e82c9) ? _0x3bb81b[_0x261188] ? _0x5aa39b[_0x4f2e57] : (_0x2c5c7d['warn']('Animation\x20' + _0x48ebad(0x52b) + 'in\x20library' + ':\x20' + _0x3e7c5a), null) : (animationLibraryCache = _0x44adc6, _0x44adc6); })[_0xcee0e1(_0x3ad5f8._0x16ae34)](_0xdf69ec => { const _0x2be9c2 = _0xcee0e1; if ('XYFcz' === 'tAneJ') _0x1d3e0f = !![], _0x11be8b = null, _0x208592(!![]); else return console['warn']('Animation\x20' + 'library\x20no' + 't\x20found\x20or' + _0x2be9c2(0x507) + 'ding:', _0xdf69ec), {}; }); } } function getAnimationFromLibrary(_0x3f28b0) { return loadAnimationLibrary()['then'](_0xd1a164 => { const _0x2f712e = _0x4d27; if (_0xd1a164[_0x3f28b0]) { if ('IMsJz' !== 'IMsJz') return; else return _0xd1a164[_0x3f28b0]; } else return console['warn'](_0x2f712e(0x713) + _0x2f712e(0x52b) + 'in\x20library' + ':\x20' + _0x3f28b0), null; }); } function _0x7afa() { const _0xa2a37e = ['IitCLH/uZd', 'lue)\x20||\x200;', 'dvKV4V31Wn', 'TYpthXcT5x', 'nst\x20ctx\x20=\x20', 'tmh+nYXWqE', '4HlQKhpLTO', 'tePreview(', '\x20else\x20{\x0a\x20\x20', '65aN/+fCQq', 'mData.colu', 'uzOkV+xECT', 'bFidPuJA9a', 'oYAlWMhk6y', 'EdWaJodhGM', 'PJItJt11UZ', 'priteRealH', 'PiwMUFwJoQ', 'viewCtx\x20=\x20', '\x20\x20\x20\x20curren', 'TNt06k0eyx', '\x20\x20const\x20sp', '\x20\x20\x20\x20\x20-webk', 'BJCjRCTiuA', 'Fb4lXQdI++', 'aQgp64HTJI', '\x20/\x20255:\x0a\x20\x20', 'ue\x20=\x20animD', 'height', 'dGMbQAaGPf', 'animData.c', 'QwEyW1A85b', 'H58Be/W7PF', 't(\x27canvas\x27', 'ass=\x22libra', 'mWZHdWLX5v', '\x20\x20requestA', 'ion()\x20{\x0a\x20\x20', '\x20const\x20mod', 'margin:\x200;', 'seUp);\x0a\x0a\x20\x20', '\x20\x20\x20\x20<div\x20c', 'rUzHojiu4t', '7+qZdvK4MC', '/4GHWKGnAv', 'height);\x0a\x20', 'eteBtn\x20=\x20d', '54504GAbkil', 'qIhz/67Zmd', '60\x22\x0a\x20\x20\x20\x20on', 'nc0u7vXFWe', 'LHrsenjbWv', 'smj1rPc7o3', 'floor', 'UXXeI0us+t', '|\x20\x27none\x27;\x0a', '\x20\x20\x20\x20\x20margi', 'oJpPCTTOiM', 'Ddi0kZiibP', 'SdCvjUuLm5', 'd\x20#fff;\x0a\x20\x20', '\x20\x20\x20\x20\x20\x20let\x20', 'd8Inv5ycmn', 'en2UeomT0r', 'x;\x20backgro', 'mchXPOztWa', 'PA+JnVWGbI', 'onBottomY\x20', '/\x20animatio', '-spacing:\x20', 'ALrrALZk4M', 'QAtrZGApHa', 'UAZzl70Az5', 'a1j3z8FxSp', 'C5VOOea5qg', 'BhIZJWIglY', 'el>\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20curs', '\x20>=\x2010)\x20{\x0a', 'uxs/1ydEfm', 'SZAMwHFjRY', 'effectiveS', 'iner.clien', 'anvas,\x20ani', '\x20\x20\x20\x20\x20\x20\x20\x20cu', 'nBuujjOLmg', 'IndexInput', 'eet\x27)\x20{\x0a\x20\x20', '&&\x20tintCol', 'nput\x20type=', '\x20const\x20del', '/dt17u2r2u', 'l02FDqcTIa', 'eInput\x27)?.', '\x20\x20\x20\x20\x20\x20scal', 'nLayer(sca', 'aw2DvxNjiA', 't\x20easedPro', 'dFKtwEqoE3', 'put\x20type=\x22', 'KyjavesPTH', '\x20=\x20functio', 'nter;\x20user', 'i\x20+\x201]\x20=\x20g', 'Yjh0+nFvav', 'ZhYyu1AAtQ', 'width\x20=\x20fr', 'utImageDat', 'z5saXzh77E', 'const\x20d\x20=\x20', 're(animDat', 'ne</option', '\x20\x20\x20\x20let\x20ra', 'rameWidth\x20', 'eegJX97WQ0', 'faint:\x20#55', 'ck\x20{\x20backg', 'lVVQCkc+LZ', 'ccent);\x0a\x20\x20', 'K9UwYb5/7u', 'gress++;\x0a\x20', 'ndomFlipY\x20', 'WpfNwKEhFx', '\x20\x20\x20\x20\x20\x20\x20if\x20', 'ge:\x20linear', 'rp82eQsLtu', '\x20\x20\x20\x20};\x0a\x0a\x20\x20', 'ffsetY\x20=\x20(', '\x20\x20\x20\x20\x20\x20\x20.co', 'ugkgLxEjxd', '63cgxPn/wp', '\x20\x20\x20\x20\x20\x20\x20<in', 'onst\x20charX', 'ng\x20animati', '\x20&&\x20animat', 'margin-top', 'vUZaR8U2Qn', 'OybvTNgc6u', 'QHGxwlp07A', 'fEsIlF5qWq', 'bm/DMEXfBu', 'rary\x20{\x0a\x20\x20\x20', 'LPzLvHq7yY', 'leDisplay(', '_spriteset', 'W//eweG62l', 'f\x20(!curren', '\x20\x20\x20\x20\x20ctx.g', 'q5XcOCpKs3', 'bxO9ETxDHa', '2Tiy0Pbv6E', 'et\x20r2,\x20g2,', '\x20\x20\x20\x20\x20\x20.clo', 'BubfLHZ9Sg', 'Ao0vDJW0xa', 'jdmsmZBdDG', 'XsYuKyp7sX', 'abel\x20style', 'R5mVNSabQ9', 'ck\x20on\x20an\x20e', 'GMIIx+Akil', 'pacing:\x200.', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20', 'ary:', 't\x20type=\x22ch', 'TTHCc4dawh', 'alue)\x20||\x202', 'C5NxfdHv5P', '.className', 'E8ug/sZ9gZ', 'w29YWK1eML', 'KHmLB6zKUA', 'opSRzYltPc', 'hSQFX74l5a', '\x22number\x22\x20i', 'yrjV/dKMRy', '\x200;\x0a\x20\x20\x20\x20\x20\x20', 'meOffsetY\x20', 'RbUdcCZFDs', 'ABmZ6FwAjC', 'bQOc65jvNO', 'ent\x22>\x0a\x20\x20\x20\x20', '\x20\x20\x20\x20\x20drawC', 'ield\x22>\x0a\x20\x20\x20', 'cNNiW+OdYj', 'false;\x0a\x20\x20\x20', 'e=\x22auto\x22\x20s', '()\x22>\x0a\x20\x20\x20\x20\x20', 'FihhoBIk/Y', '\x20\x20\x20\x20\x20\x20\x20\x20dr', '=\x20bloomCtx', 'window.ope', 'lzN25I+mDH', '\x22blendMode', '\x20const\x20fil', 'nt;\x0a\x20\x20\x20\x20\x20\x20', 'Z4rYmA0ggr', 'ale\x20=\x20pars', 'yomrwidMNj', 'ion\x20=\x20anim', 't;\x0a\x20\x20\x20\x20\x20\x20\x20', 'iHCkSfyugq', 'function(e', 'UccOSV5oQe', 'HmhYp94shF', 'mainModule', 'TTUALWfsWs', 'RP3/1nwZXB', 'glx5zVu6Zt', 'vf4Su6Hvnj', 'Y\x20=\x20charY\x20', 'vDp3w12wZS', ',\x20black\x200%', '\x20\x20\x20\x20let\x20r\x20', 'iz/35g9uD6', 'agOffsetY\x20', 'border-rad', 'Bp7F95Kyqd', 'agTICNhxBj', 'Qpbvzi3JSN', 'VYMPFD/dMp', 'autoSaveTi', '37bdCl9HxV', '02xsQeTAip', 'M4MQeTRlhV', '5skTmD1sC0', 'oVuHMi/HKg', '\x20\x20\x20\x20\x20\x20\x20cas', 'x;\x20}\x0a\x20\x20\x20\x20\x20', 'RgkQ0CglSH', '\x20charX\x20+\x20(', 's-sm)\x20!imp', 'alFrames\x20=', 'esqqf9TRza', 'pener.load', '1lIKUBNxS9', 'ating\x20=\x20tr', 'F2HnPf7CU7', 'chRsmGvHSg', 'JSepg2k8E8', 'heet)\x20{\x0a\x20\x20', 'ACSX3vjYfS', '9Dczu/+PYz', 'nC6cvmP6DU', 'Xx5kPwZYgQ', 'd=\x22columnI', 'field\x20inpu', 'body>\x0a<div', 'G8g2GS6JAZ', 'newOffsetY', 'DesignerCo', 'Img.onload', 'Y0XCPJE4lc', 'erticalChe', 'on)\x20{\x0a\x20\x20\x20\x20', 'i3Kpa4hNnw', '/nN88Zg6zb', 'YeuUFW3zoK', 'nFrame\x20=\x20(', ':\x204px;\x0a\x20\x20\x20', '76Vxy04g+z', 'rnhgvAxeD4', '5,\x200.03);\x20', '=>\x20{\x0a\x20\x20\x20\x20\x20', '\x20===\x20\x27scal', '\x20pointer-e', 's\x20=\x20parseI', 'Sh9+51iP5u', 'kji5tLhiIn', 'container\x22', 'WULMmNKeun', '-text)\x20!im', 'ight;\x0a\x20\x20\x20\x20', 'nim)\x20{\x0a\x20\x20\x20', 'zOlMC8XJFX', 'v>\x0a\x20\x20\x20\x20<di', '2NFWxC1Ln1', 'hyopCITa7x', 'iew()\x22>\x0a\x20\x20', 'RLtdMEZpsP', 'mypkj39sKH', '2),\x0a\x20\x20\x20\x20\x20\x20', 'bottom:\x200;', 'bgxGzLOBO7', 'sE4LNEwdR1', '=\x22updatePr', 'tx.clearRe', '\x20blendMode', 'amllsb9sXy', 'vzfVh+ufUE', 'randomCoun', '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20', 'cIxAWqE7Rx', 'round\x20=\x20pr', 't\x20hue2rgb\x20', 'DKYQ3sXW1Q', 'gc0zWdn1UP', '2k1L/ktYAy', 'I3sJyk8UM2', 'by6jvwYEFW', 'er.removeA', 'xDgdt6thMu', '7WhaMgHnPf', 'l5pUJ3SyQd', 'qziOC+6jMu', 'GgxMlW7LFf', '{\x20backgrou', '\x27)?.value\x20', 'a7FjDBtx3z', 'IA5+j5lXQb', 'nVWvf00bQz', '\x206;\x0a\x20\x20\x20\x20\x20\x20', 'B0detVdbVF', '\x20\x20border-r', '\x20let\x20h,\x20s,', '(\x27rotation', 'er-radius:', 'UlK4tWLmD+', 'YonXAVCILW', '(2\x20-\x20max\x20-', '255,\x20255,\x20', 'mBqiZTfOKD', 'ElementByI', 'x.save();\x0a', '\x20\x20\x20\x20\x20\x20\x20\x20\x20l', '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20', '\x20data[i]\x20=', 'tXInput\x27).', '\x20/\x20255);\x0a\x20', 'p6zjmrbv0L', 'tVIIBICb1I', 'Lkycu+tiD2', 'UIvDhrHEBB', 'DZAbiHbclj', 'GIFRAxkFUf', 'fr\x201fr;\x20ga', 'domRotatio', '\x20\x20);\x0a\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20w', 'atePreview', '2nVb3iepS+', '\x20\x20\x20\x20\x20\x20isAn', 'TOwabiquFK', 'oH7hhrlr0l', 'rPriority)', 'OHy05nToz0', 'STeelpIY3v', '<p\x20class=\x22', 'd3MheWvczA', 'nvas\x20id=\x22p', '\x20character', 'vas.height', 'dProgress;', 'UA69YSAotX', '+\x20blur\x20+\x20\x27', '|\x201,\x0a\x20\x20\x20\x20\x20', ':\x20var(--ra', 'sList.remo', 'Hgqxi/ZmEf', 'lQGtx63BpE', 'aoGe44UKqB', 'j2prFBy/e+', 'fFeVVnW12r', 'nInput\x22\x20on', 'C96oZHp+Sr', '=\x20document', 'FjWCcSlG1V', 'ype=\x22color', 'q,\x20h\x20+\x201/3', 'yyjayNaLej', 'H29dd/IxpW', 'sCmoYaJ4j+', '!important', '#4a2020;\x20}', '6OMAwJyfoe', 'pictures', '(\x27libraryM', 'vx5fhG/EH8', '\x20const\x20fin', 'ntById(\x27ra', 'MRcdFFctoW', 'h2>Animati', 'qbDjRn837T', 'fxL7Y4unL+', '72ceaeGxbp', 'fsetX\x20=\x20pa', 'eTileWidth', 'd\x200.15s;\x0a\x20', 'ppXbIEuz/w', '\x20\x20\x20\x20\x200,\x200,', 'gkSfHXp9fY', 'rrentRando', 'imageData\x20', 'nding\x20Anim', '\x20const\x20cha', '++qWa34MqG', 'lYZ0rnMEWZ', 'iiWuq284DV', 'seUp()\x20{\x0a\x20', '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20', 'Height\x20=\x20c', 'gICqFoOFIC', 'ns\x20=\x20{};\x0a\x0a', 'ZfFxhNDE2D', 'pAV2IbM74s', 'asScale\x20=\x20', 'maoAuGYAbW', '\x20\x20ctx.draw', '\x20let\x20charC', '\x20frameWidt', 'ePfxSWwZix', 'lwwOrbghG+', 'der-radius', 't1ovfQSGVq', 'rwKyT6Qyal', 'BqE6ESQ8z2', '(\x27zIndexIn', '8nF9bPYCyw', 'ferG5gXlqF', '\x20\x20\x20\x20\x20color', 'l6SRyZ/hAU', 'Xtc8IKND7I', '=\x20randomRo', 'CT6xIGplwD', 'vPQS1K19hg', 'GRVH2Bl3ji', 'document', '\x20\x20\x20\x20\x20\x20\x20\x20--', 'PRhqmgd9q5', 'PSO++svABj', 'IKSUkWjaSF', 'unB4mciTPs', 'lScale\x20=\x20s', 'uPULBa3QAW', 't\x22>Scale\x20O', 'ight:\x20char', 'hyYuxhuYp4', '\x20\x20\x20\x20</labe', 'eY);\x0a\x20\x20\x20\x20\x20', 'syry4OjFzh', '2)\x20+\x20offse', 'vRA+A3bksQ', '\x20#FFD700;\x22', '\x20\x20\x20\x20\x20.cont', 'm7ePMR2dvq', 'rOifrotFPo', 'OFKlpLg4j2', 'wVaoglpogC', 'aracterImg', 's+u1Ymn8q6', 'j5wEXAoke5', 'tEBGME6DAF', 'TthjtzNExB', 'yK2/JInFtn', 'N0Bl5g6IuJ', 'iXaj3GABpg', 'zrRW6MQVy7', 'AEMnABW+Jc', 'Y9LsnI7pJh', '\x20\x20\x20const\x20c', 'ath.min(co', 'nimationNa', 'ap:\x206px;\x0a\x20', 'C1CwBSEXau', 'o0tURh/Np/', 'haracterSp', 'ound', '\x20-drawWidt', 'yyJq4RkHC6', 'iXw7dA/ecf', 'e:\x2010px;\x0a\x20', 'X\x20?\x20random', 'pjDzzdmMXr', '\x20\x20const\x20re', '\x20600;\x0a\x20\x20\x20\x20', 'Bn5Kqxb4pu', 'meInput\x20=\x20', 'rQnOPWERuG', 'onst\x20blurr', 'KtZIPgcDxe', 'WpIXOs8aFK', '78GsK+m3US', 'JhBj4rk7EH', 'eurGq7VChg', '\x27opacityIn', 'm7SvTMPQAO', 'WzVPaBwgqU', 'PI\x20/\x20180);', '1264RaMJLt', 't\x20canvasOf', 'ZKDioZB0Uu', 'lement(\x27di', '9AzUP/s3Xa', 'X,\x20animY);', 'ecked\x20||\x20f', 'oTaDwsC3Pt', 'UQOGh5gWIK', 'hd+o9+eXPm', 'ted);\x20font', 'ver\x20.libra', 'ry().then(', '+\x204)\x20/\x206;\x0a', 'error', '9dGPcfF8W/', '8TNKHBAaRk', 'canvas', '\x20r;\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20text-tr', '5)</label>', 'er-box;\x20ma', 'O7SlVXVU1D', '\x20\x20\x20\x20</div>', 'ZfWrOCfFQR', 'm9/+cC3XRq', 'vOdN+bhhGV', '55/QJocDbn', 'lendMode\x20|', 'eRbzOAQLxP', 'IB09NiOghj', 'Siqfun3tJG', 'XoXrQdPYGe', 'JbKYDHLcs1', 'YdoKtPBfJ2', 'rl;\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20cons', 'RW6EHBobG3', 'h\x20=\x20(h\x20+\x20h', '=\x20l\x20<\x200.5\x20', 'MknRyo8qjd', 'Rhx3q31Ea3', 'Ms6OIX3WQl', '2Saa7yunMK', 'eMeizrbBQS', 'OwpZfGAyAm', ':\x20var(--ac', '+xefDOjsiq', 'previewCan', 'teAutoSave', 'MjC9pozhew', '==\x200\x20&&\x20an', '\x20\x20\x20\x20\x20\x20--ac', 'indow.open', '7H7FmKoiir', 'BUxR1M3W0w', 'rawHeight\x20', '\x20\x20\x20</div>\x0a', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20c', '\x20\x20\x20\x20\x20\x20char', '7E/MD5NfPH', 'KND3TDZmLo', '3x3rILQz3n', '\x20\x20\x20\x20\x20if\x20(a', '//////////', '\x20\x20\x20\x20\x20\x20\x20\x20\x20<', '91HtoN3Znd', 'awWidth\x20=\x20', 'fTyceDuTy0', 'BPu8BGZWJS', '2kZUThzbAn', 'ameWidth;\x0a', 'blur\x20*\x202,\x20', 'MP4n/H5Rof', '2t7TcfHvsk', 't\x20=\x20frameH', '\x20\x20\x20\x20\x20\x20\x20con', 'ityInput\x22\x20', 'RX18Kwwimx', '\x20\x20\x20\x20\x20\x20temp', 'Mjc86Nb/L+', '\x20if\x20(animD', 'ox:hover\x20{', 'n\x20(frames)', 'rC9t5DxIIE', 'q1BR1L0SvW', 'e\x20||\x20\x27Norm', 'mSHniyxlV7', 'UXZUvc0V5O', '255,\x200.03)', 'j2TVho+eNZ', '3g/fDusq+B', 'crollbar\x20{', 'grid\x20{\x0a\x20\x20\x20', 'acterImg,\x20', ',\x20-finalWi', 'ow.opener\x20', 'ion:\x20fixed', 'cterImg\x20&&', 'a78rD1+0YZ', '\x20\x20\x20\x20\x20\x20<but', 'y0am+sqP2F', 'me];\x0a\x20\x20\x20\x20\x0a', 'r(--mono);', '/cebRaHZjG', 'ZFs/Y5wFUL', 'tintColorI', 'e+Z9I9klzH', 'IhjhR0Boyl', 'ale;\x0a\x20\x20\x20\x20\x20', 'reak;\x0a\x20\x20\x20\x20', 'TrNesOl/zg', 'Ofrh6rvlC9', 'adius:\x208px', 'wH27HFKLvz', 'WijU1fyVqX', 'one\x27,\x0a\x20\x20\x20\x20', 'xt-muted);', 'Abou9js+N7', 'oLbtLvDe5Q', 'animData.b', 'jjnfQTwNYv', 'saveTarget', 'oQtgJGFTgq', 'JO6ai/wFnD', 'mwAlmZrBLW', '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20', 'c1DfR4I62u', 'esheet.hei', 'lip\x20Horizo', 'eDG6UJUgIr', 'CFnbt3Ebgk', 'gipe7SGlnR', 'mBn65lr73r', 'R3uMEzMc5Z', 'dding:\x2040p', 'CjFz2pIagP', '.createEle', 'PAXUk+ocXA', '\x20\x20characte', '/u3r9/RXmJ', '3Q2KA4QZRk', '?.value.tr', 'eInput\x27).v', 'LM5iH896P1', 'rseInt(doc', 'ter\x20=\x200;\x0a\x20', 'dEventList', '+jtALL1Vqs', 'tton>\x0a\x20\x20\x20\x20', 'sIrhyfNagD', 'feeRnF0xn8', 'f8Z0HzBX8b', '\x20\x20if\x20(!cha', 'or)\x20{\x0a\x20\x20\x20\x20', '4gf+ckQKfl', '\x20%\x20totalFr', '4i9/fjGcLa', '(animNameI', '=\x22saveTarg', '\x20\x20\x20justify', '\x20\x20\x20outline', '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20', '81+sjlvdVa', 'ctx.drawIm', 'X3cQWSCqqA', 'imationInp', '4vjBectinS', 'tVr1ywi4/l', 'tion\x20||\x20\x27n', 'n462IilL+D', 'ht\x20=\x20frame', '2zljsqbA+j', '/\x20(max\x20+\x20m', 'about:blan', 'r-color\x200.', 'on>\x0a\x20\x20\x20\x20\x20\x20', 'vEHVpfENEC', 'BolltrZ9xw', 'Zza7YUmls4', 'e154ZYOH04', '*\x20frameWid', 'nt)\x20!impor', '2S19l1d546', 'MmnqRxbbBZ', 'aGGk0nILUD', '\x20rotation:', 'ch.io\x22>san', 'max\x20=\x20Math', 'yyEahXeu7o', '\x20\x20drawHeig', 'tionDurati', 'RIRIPkHgCa', 'd(\x27randomF', 'left', 'weI2o6qF1H', 'previewBgC', '8RU3+ERFrv', 'Frame\x20/\x20co', '\x20\x20\x20\x20\x20\x20\x20sca', 'VZAVlmEQdM', 'dAgAUE8SOQ', '1UzOJp7rfe', 'PmehzWcN6+', 'YaKvwbTMZd', 'hFelEDI7Ak', '18EOxBnkeo', 'jDuvIVWWLW', 'nimData.ra', '|\x20\x27#FFFFFF', 'A3AmALBNX7', 'nkZXubhp5F', 'n\x20Settings', 'ventListen', 'ght', '\x27\x20+\x20blurAm', 'JFSzLAiDQB', 'wgpgcgBkQz', 'hasFocus', '};\x0a\x20\x20\x20\x20\x20\x20\x20', '=\x22Black\x20ba', '\x20\x20box-shad', 'await\x20wind', 'qhpBBa/TlK', '.checked\x20|', 'xUmnn9vU+P', 'UjUJe0I/AB', 'f\x20(t\x20<\x202/3', 'eview()\x22\x0a\x20', 'Width,\x20row', 'pUPEsHdCEx', 'ovedCount\x20', 'uSYYcUvBcp', '9px\x200,\x200\x200', 'ENTJj6KmpF', 'RII0ra3ijU', '.width\x20=\x20M', '\x20\x20\x20\x20\x20\x20\x20\x20he', 'JplDDhRG76', 'MYkSXioqZE', 'iYSbniIXRa', 'gqQIGCwCOx', '1233icdtjx', '\x0a</div>\x0a\x0a\x20', 'city\x20=\x20opa', '\x2030,\x0a\x20\x20\x20\x20\x20', 'w3W/G1IACA', 'createElem', 'PF/ZLlgwMS', '/\x20255:\x0a\x20\x20\x20', '7Gben6XK9E', 'DC9k0KS7FY', 'eview()\x22>\x0a', 'aracterSpr', 'max(200px,', '\x20\x20\x20\x20\x20docum', 'yqC2hCyQ7E', 'brkXd5jFZ/', 'k49cap8rFN', '\x20\x20\x20\x20\x20let\x20f', '\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20', '\x20\x20\x20}\x20else\x20', ').length;\x0a', 'X);\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20<o', '\x20\x20font-wei', 'kXWpqkLQ1U', 'XfYQv+Gmzf', 'RKsG5GLK9T', 'r;\x0a\x20\x20\x20\x20\x20\x20\x20', 'N/PVu4afY5', 'R1SXxQcjjX', 'x/D/dq1LSO', 'aeCdjp2Mye', '();\x0a\x20\x20\x20\x20\x20\x20', 'ter;\x20curso', 'ertyDescri', 'zontal)\x20{\x0a', '\x20\x20\x20\x20\x20curre', 'kCBxFm5YdF', 'ET8VUeVmfG', '17vUl9+S7C', 'wLqiAguBUY', '(q\x20-\x20p)\x20*\x20', 'mg.width\x20/', '594750paUYxT', 'gJl8Xt6EWi', 't:\x2040px;\x0a\x20', '\x20\x20\x20\x20\x20\x20\x20\x20fo', '65YU5oTH9o', '\x20\x20\x20\x20\x20\x20\x20\x20st', 'yId(\x27scale', '\x20\x20\x20\x20\x20\x20\x20\x20})', 'oONgEawbwt', 'ndow.opene', 'eA2ou0a2ES', ':\x2020px;\x0a\x20\x20', 'xOPUOocIZY', 'data\x20=\x20ima', 'N3T0AMyLvm', 'oFOKlA3V6n', 'frame\x20+\x201)', 'h;\x20i\x20+=\x204)', 'as.height\x20', 'or:\x20var(--', '+9Xk+97byl', '.file-box\x20', 'HeAW+FrAog', '),\x20linear-', 'rjOACl/Pw8', 'mg.src\x20=\x20d', '\x20=\x20frameWi', 'eup\x27,\x20onCa', 't\x20characte', 'GhxeggkEWE', '\x20\x20\x20\x20if\x20(s\x20', '5,\x20tintG\x20=', 'option>\x0a\x20\x20', '\x20\x20\x20\x20case\x20g', 'LXn/1apJGq', ',\x20frameHei', 'rameTime\x20>', '1LljswrEQx', '/0wbLJ1p/N', 'm71t7w8MGD', 'ion\x20=\x20docu', '\x20\x20\x20font-fa', 'q+2C7Zd2eO', 'in=\x220\x22\x20max', 'nxWA0e/pVA', 'ztddXeZgrL', 'nload\x20=\x20fu', 'kCiFGUJCoK', 'kExUfi5uZN', '\x20\x20\x20\x20\x20\x20<spa', '5c6JR3GejK', 'JdKVFBohII', 'I2peVHPUy2', 'joC31EtF8H', 'prite', 'FCSqjPCd6r', 'fyoSZCV91d', '\x20\x20select\x20o', 'RCyayNc8f+', 'eLL67P8lUD', 'onst\x20opaci', 'ield\x22\x20styl', 'layInRever', 'ata.random', 'oSaveField', 'PyX6vjPizU', 'se;\x0a\x20\x20\x20\x20\x0a\x20', 'IojVSFElAU', 'VGEBtlcEOd', '\x20\x20let\x20disp', '\x20\x20\x20\x20\x20\x20</di', 'GQr3lLUgVV', 'X\x20?\x20-1\x20:\x201', '6JpH4hv5Bt', '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20', 'n6TFNnM52t', '1ecWZ0Nb/B', '5XeHp4NapY', '.opener.Im', '*\x20previewS', 'dFJOU/////', 'AXHFNCYC6d', 'mzn3yDzleb', 'uzTXpOw+qJ', '\x20\x20\x20\x20\x20const', '\x20rows\x20*\x20co', 'vePath);}\x0a', 'NqNM5hi4pT', 'ld\x22>\x0a\x20<div', '1tXl6ejUjI', 'X9wfu7D3AO', 'inalScale;', 'ac74O9kVjX', 'ocument.ge', 'HBHCqDKsox', '7pbf075X/7', 'Y\x20=\x20charCe', 'bVt76VeeMD', 'teBtn.titl', 'ght;\x0a\x20\x20\x20\x20\x20', 'h.pow(-2\x20*', 'oPQCqG1Nh/', '+JnyLSbT3I', '0DAwuSOwVT', 'fsf7conP53', 'BUZGUAqIxQ', 's/nAj3ANoN', 'ne;\x22>\x0a\x20\x20\x20\x20', '6q2jl77pqZ', '\x20\x20\x20let\x20dra', 'y/JbYqAHSM', 'Only</opti', 'CLToi2aZYs', 'KTr4/8jx33', 'input[type', 'M/d8Z6Twnb', 'put[type=\x22', 'gRrWS', 'ary:\x27,\x20err', '\x27:\x20\x27screen', 'to;\x20margin', 'Q/6wGon4Wb', 'LOnOpYLEeM', '/X+QMjgXHX', 'rtxdDxpiG3', 'eyZQ4UxkE/', 'FPghxsieCd', '\x20\x20\x20\x20\x20\x20func', 'n>Play\x20in\x20', '\x20\x20\x20\x20\x20\x20\x20fps', '1/p0PU7Xv6', 'zzgWXByxvv', '1kIm+c9oxd', 't+OXzLKQhb', '\x20\x20\x20\x20\x20\x20\x20\x20\x20s', '(blurCanva', 'C84XOi+6XO', '\x20\x20\x20<label>', 'QXvjJopv/X', 'nput.value', '4PwR/ufMz6', 'lor\x200.15s,', 'yM7UWoSs8h', 'if\x20(relati', 'jH/fDNiEFc', 'e++s1/pUQa', 'lor:\x20var(-', 'DPy8tICdiD', 'TQAaeu7QZV', 'iewCanvas.', 'iv\x20class=\x22', 'value\x20=\x20an', 'Xt9aPN4bJh', '4BnjJt2Mww', 'ransition:', 'a95f/jeyPr', 'style.disp', '0Og0TTRKoT', 'x6/SJa6wUQ', '\x20.header\x20{', 'K8/paPv1De', 'AVIJcziUpN', '\x20\x20\x20\x20\x20\x20\x20dat', 'lue=\x2230\x22\x20m', 'idth:\x20100%', 'tById(\x27lib', '+4FBD0nCFP', '6EufX/utoM', 'catch', '\x20=\x20newOffs', 'reateEleme', 'SbMn1WL7hl', 'nput\x27).val', '2vVrwRjd+p', 'WvHKz/xkSF', 'eclL75N4Pk', '(currentTi', '\x20\x20\x20data[i\x20', '\x20\x20\x20\x20\x20\x20\x20\x20if', 'CBsJ3QRjhO', 'ctiveScale', 's=\x22field\x22>', 'd=\x22opacity', 'gvEWjKo7fB', '\x20\x20\x20\x20}\x20else', 'max=\x22180\x22\x0a', 'tY;\x0a\x20\x20\x20\x20\x20\x20', 'r:\x20pointer', 'uKwDo', 'ragOffsetX', 'x.getImage', 'uoXCCFDkYa', '5wSBRh5YUr', '1nHZT1nPm/', '\x20\x20\x20\x20\x20\x20\x20\x20.f', 'Id(\x27offset', 'LJNG+nuz4x', 'pXzO2Mjxfk', '30skJVURV8', '+iwPwwhGQi', '=\x20Math.flo', 'r56LEW7su6', '7leSvPrRzA', 'path', 'nput)\x20{\x0a\x20\x20', '8iTj9avLkJ', 'QpSdhfhsLY', '6h5cZjnxAV', 'XgGrFTGEUI', 'VQGspEdVAT', '59D9+1rUr9', 'iv\x20style=\x22', 'EcS9Juf8RX', '+piFj6LrK6', '\x20tempBitma', '-button:ho', 'nNameInput', 'f\x20(t\x20<\x200)\x20', 'ionToLibra', 'openingAni', 'Y0NAo+/B/o', 'uQ5zDKmMqr', 'oggle-btn\x20', 'weDIw2Yzu5', '=\x22number\x22\x20', '=\x20animData', 'qWGPA68FiC', 'oFBY8dhdr3', '/select>\x0a\x20', '\x20#444\x20!imp', '\x27\x27;\x0a\x20\x20\x20\x20\x0a\x20', '\x20\x20\x20\x20\x20});\x0a\x0a', '\x20/\x20255;\x0a\x20\x20', 'ation)\x20{\x0a\x20', '\x20\x20\x20margin-', '\x22checkbox\x22', 'h88gnBiL2w', 'rY/m11bFcI', 'me\x20-\x20lastF', 'eviewOffse', 'FR3SNKCUpE', 'xTZiAznVnM', 'FlipY\x20?\x20-1', 'EAGr+GC4BS', '\x20\x20\x20\x20border', 'pY\x20=\x20false', 'caleInWidt', 'ion:\x20absol', 'IpQqtK3Q04', '\x20\x20input[ty', '/\x20columns;', 'l4UymCD3Yv', 'Xe1rPl08tr', '\x20function\x20', 'ale\x20*\x20ease', 'ox\x22\x20onchan', 'bled\x20=\x20fal', 'BLAH4PFzJK', '=\x20flipVert', 'XLBELZ0sRZ', 'kGfSabmAsA', 'rPRfuWcVZV', 'W46l7FmLmT', 'YU7i207f8Q', 'rame\x20/\x20ani', '\x20-finalHei', 'a]\x20of\x20Obje', '2ljNFgYZ3G', 'xjz9HNuxfM', 'LXk8bgDZUw', 'j4KPBaUjhP', 'vabI61HLdb', 'ent', 'on:\x20backgr', '=\x2210\x22\x20max=', 'tTime;\x0a\x20\x20\x20', 'class=\x22sec', 'KBbwBa4tEJ', 'JHkQQ85N6F', 'ZRN6B80jJH', 'h7snWzF2YP', 'yId(\x27offse', 'ugE8/OvxN+', 'tesheet,\x0a\x20', '/div>\x0a\x20\x20\x20\x20', '209\x2025%,\x20t', 'on\x20Duratio', 'ndex;\x0a\x20\x20\x20\x20', 'otbnQKlkWB', '\x20=\x20animDat', 'file);\x0a\x20\x20\x20', 'nimData.pl', 'tion\x20Speed', '4a4LgNY2V/', 'AFc+a/tCBi', 'lLjlmCzAWC', '\x20\x20function', '\x20\x20const\x20sc', 'YrciSnVoNg', 't-transfor', 'eJZ4yqfQ/T', 'nput\x27)?.va', 'sKXkH4XNmt', '\x20\x20\x20\x20\x20\x20font', 'BoFGChQLAo', 'Zo5ZYXUksf', '/Pue+ASyaO', 'configurab', '.classList', 't\x27)?.value', 'F/ui2jP87E', '\x20\x20\x20\x20\x20final', 'TK5kBCGrLa', '10ZNTWMbvd', '+ZZhWvzos4', '9y5duK6zOM', '\x20\x20\x20\x20\x20\x20\x20\x20//', '083fg++KtW', 'z/r86T3vwF', 'u4aXoaG9hB', ';\x20updatePr', 'inalFlipX\x20', 'Nd+YHLblim', '\x20\x20\x20\x20\x20\x20\x20.bg', 'xlWAiGWT44', '\x20\x20\x20\x20\x20</lab', '\x20\x20\x20\x20\x20\x20if\x20(', 'JtGIQReAzj', 'V/qzXOevz2', 'text-muted', '\x20.bg-toggl', 'Bloom)\x20=>\x20', '2563445Xrtsdn', 'kvXidPN9Sp', 'dXb9I3/x0O', 'eWPj4yL3Tv', 'DNXo1fOcSE', 'n-right:\x208', 'ay.textCon', '\x0a\x20\x20\x20\x20\x20\x20<se', 'UkdCIElFQz', 'seInt(docu', 'XVUoalAAOb', '\x20\x20\x20box-sha', 'tintR)\x20/\x202', 'h2tc1MgWIn', 'BymcVazHwo', 'QdQEdWEA8C', 'fOD4Vpa+7T', 'PwtRr4hLQ3', 'rse\x20=\x20docu', 'ont-size:\x20', 'gmyObiwO1N', 'EL9Ye8YvO4', 'gAnim)\x20{\x0a\x20', '/ku7h/u14A', 'wDsm8hVUdS', '\x20\x20\x20updateH', 'ext);\x20font', 'EXy49crZ4a', 'Y\x20=\x20easedP', '\x20\x20currentS', '9UyvyqpVSd', 'JoyqWj3cXT', '8Syh+0zD8e', 'Reverse</s', '\x20\x20\x20\x20\x20\x20\x20\x20\x20}', 'onst\x20grid\x20', 'ing:\x2014px;', 'ft;\x0a\x20\x20\x20\x20\x20\x20', 'etYInput\x27)', 'r\x20/\x20255)\x20/', 'dal)\x20{\x0a\x20\x20\x20', 'Pu/Fv4Avvu', 'hYZiC3KJhZ', 'ype=\x22numbe', 'Animation/', 'Miz8PrC6pg', '\x20(error)\x20{', '9jCMuhIQWQ', '|\x20\x27Normal\x27', '0;\x0a\x20\x20\x20\x20\x20\x20\x20', 'qfUZ9rRQEF', 'baCBphYHYT', 'vent)\x20{\x0a\x20\x20', '93uD1i0XJJ', '\x20\x20\x20\x20\x20\x20\x20\x20<l', 'EqzNdKPHS2', '</span>\x0a\x20\x20', 't\x20drawHeig', 'lOvfWzHbx8', 'efZgWKaxel', '89zB9+/EvO', 'readFileSy', 'rface-2);\x0a', 'FNAFbTqi8e', 'width', 'qNLJm9T4IJ', '7uVwpQrEnN', 'UBzxg28H9f', 'if\x20(applyB', 'rOnt9fXW1D', 'nt.getElem', ')\x20||\x200;\x0a\x20\x20', 'yer</optio', '469anerXlU', 'ener.Image', '5QvCiBqaJ4', 'on\x20*\x20Math.', '2rgb(p,\x20q,', 'b918u/CYW3', '1qBioaAtKD', '\x20\x20\x20\x20\x20\x20\x20\x20<i', 'ata.hue\x20||', '<!--\x20LEFT\x20', 'currentX\x20=', 'rVB2fUzxD7', '\x20\x20ctx.tran', '78TDveN3Wt', 'ians\x20/\x20(2\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20f', '\x20\x20align-it', 'OaWX7fbtkB', '\x20error\x20loa', 'onName\x20=\x20d', '\x20\x20animateP', 'awHeight\x20/', 'tfrLKZSDAp', ':\x20document', 'GyzDayxgbP', 'c2BY4HOQct', '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'cc3Z2rh0mg', ')\x22\x0a\x20\x20\x20\x20\x20\x20\x20', 'animY\x20=\x20sc', 'd:\x20#555;\x20}', ':\x202px\x20soli', '3/l819lq3V', 'VFXBmSESSi', 'saveAnimat', '\x20h\x20+=\x201;\x0a\x20', 'iXeIx4iThC', 'qfV49J1Av0', 'ick=\x22close', '=\x20(e)\x20=>\x20{', 'let\x20dragSt', 'e;\x0a\x20\x20\x20\x20\x20\x20\x20', 'imationDur', 'ows;\x0a\x20\x20\x20\x20\x20', 'v>\x0a\x0a\x20\x20\x20\x20<d', '\x20\x20\x20\x20docume', 'dWDaQn2nzr', ':\x20parseInt', 'FBn4SRJOLF', 'from\x20libra', 'IqvMipokhV', '71ee89456U', 'emc4zFWGd4', 'WGsI3WuD0g', 'not\x20found\x20', 'OQqZ+7P/Pj', 'XmyyN4tGgc', 'btP5jbx9WH', 'ox\x27)?.chec', 'BIJADVmWjA', 'ottom:\x200;\x20', 'ction\x20disp', '\x20\x20\x20\x20\x20bloom', 'imation\x20==', '\x20const\x20scr', ':\x208px;\x22>\x0a\x20', 'terY\x20=\x20can', 'WH0jpnnQPn', 'jwoNEYHGKa', 'img\x20=\x20new\x20', 'layLibrary', 'SpJNe26a/k', 'kfASZLV1wF', '\x20min\x20=\x20Mat', '\x20\x20\x20\x20delete', 'O+Hwjr3dU7', '+Mk2F1BXoi', 'oothingEna', 'hter\x27,\x0a\x20\x20\x20', '4lCd59WFmn', 'lementById', 'kKKbNsAtZ4', 'P5pMEhSl5V', 'Vlv2C+lbJz', 'document.g', 'NEPDGg1YmL', 'ementById(', 'M4kbGxb0V5', 'on\x20=\x200;\x0a\x20\x20', 'urredCanva', 'PDVUyCk9jr', 'qL8dqb8M8h', 'ed\x20||\x20fals', 'ius:\x20var(-', 'div\x20style=', 'POY1bDbWGG', 'mpCtx\x20=\x20te', '\x20\x20\x20\x20const\x20', 'ZJnAy9iSJY', 'nt(hex.sub', 'WQxMP9jBD9', '.fps;\x0a\x20\x20\x20\x20', '5W9alP+5SY', 'Library)\x20{', 'Da6ly1OMaU', 'Radians\x20/\x20', 'QGDtyAVWo2', 'UrQIxL7kwz', 'qLi8FgrD86', '\x20offsetX;\x0a', 'FZO67nJ3lO', 'nst\x20hueRad', 'width:\x20aut', 'bbLQes8FYu', 'OBNVZVGQRV', 'vE/gjScSvz', 'nd:\x20#444;\x20', 'WNz4frd49+', '\x22]\x20{\x0a\x20\x20\x20\x20\x20', 'P9xsmr70ym', 'eviewScale', 'ertical\x20=\x20', 'fW39AH25fp', 'rary.json', 'fyUHXMX8dY', '\x20\x20\x20padding', 'eet,\x0a\x20\x20\x20\x20\x20', 'ta.fps\x20+\x20\x27', 'endingAnim', '\x20\x20\x20\x20\x20blurC', 'bGZwl87y7e', 'jDXru9J1lt', 't\x20effectiv', 'YB8Auh3OT9', '\x20\x20finalOpa', 'igRipSgIDL', 'Vn3bZoG/ie', '\x20\x20\x20\x20\x20\x20\x20\x20br', '+QVw/Rm6Oj', 'dragOffset', '\x20\x20\x20\x20\x20<butt', 'oVZASCv4KN', 'finalFlipY', 'let\x20finalF', 'ion\x20startL', '8hGR54pbLu', 's97KmQv8uN', '=\x20g2\x20=\x20b2\x20', 'Vhk7zn6i74', 'ZaE1s9DVI4', 'grid;\x20grid', 'DjbaA8WDKw', 'IWza9ft266', 'oDGtIaWBxC', 'ysgA2ea0uH', 'indow.setC', '\x20\x20\x20\x20font-s', 'UMMGMsCeFk', 'tkqCjiyXxH', 'z2KhDKMp9S', '04iiqEJsvI', 'Scale\x20=\x20sc', 'ackground:', 'erty', '\x20\x20let\x20fina', 'xH5BJGIFSv', '4S+ee4vNaC', 'y8eA2IHWnE', 'fQjtCQsCFY', '\x27offsetYIn', 't\x22\x20accept=', 'stFrameTim', '\x20\x20\x20\x20\x20\x20\x20ctx', '4rzoslYxV6', 'ryAnimatio', 'writeFileS', 'adius:\x204px', 'tion>\x0a\x20\x20\x20\x20', 'rtical)\x20{\x0a', 'Sl0Y6OoXT+', '97rs0H4Oi+', 'cXnXdONaod', 'IqO6Gk0iWg', 'et\x20isPlayi', 'RCfzN2ux78', 'go7cSCTxrA', 'adding:\x200;', '\x20<label>Op', 'wNb/DtbEOj', 'split', 'from', 'var(--acce', 'X\x20=\x20(animD', '3jGjm3mYLT', 'px;\x20cursor', 'rogress\x20*\x20', 'Manager)\x20{', 'JZzQPcowkm', 'nuoK37vF+a', '2QArCsTanB', '9VHIAerSeI', 'ameHeight,', 'Mode</labe', 'MiiKFCVkXg', '\x20-\x20q;\x0a\x20\x20\x20\x20', '\x20\x20blendMod', 'fZinEUGDm3', 'FlipX)\x20ran', 'QtxI6ZBQ2r', 'w-canvas-c', 'yBQIt1Qbts', 'ZOy9R0blWa', 'ypSPDRGnZP', 'N5m4KHuU+3', 'inalRotati', 'sPdZGQBDko', 'h9yGmPmw6W', '\x20Y-sorting', 'SLJCHOpyKF', '?\x20l\x20*\x20(1\x20+', '112/kONNii', '/SMjLyaQaA', 'yingOpenin', 'let\x20ending', 'R1Hu4mUz44', 'eviewBgCol', 'QZKYBqKNu0', 'ntent\x20{\x0a\x20\x20', '\x20:\x20rotatio', 'iPMlh2sp3q', '.save-butt', 'YvorlxgAPR', 'Twvm5h3h7D', 'gAnim\x20=\x20fa', '7uP+xSr5k7', 'xkheY0Udps', '\x20\x20\x20\x20\x20\x20docu', 'r:\x20var(--t', 'Oiwree3dp3', '6hP75HDqSd', '4Ue6YENnap', 'range\x22]\x20{\x0a', 'Input\x27)?.v', 'as\x20=\x20docum', 'OF1bhRmQBG', '/h3RWy0I6H', 'transition', 'eYP3g+c02D', 'qNzkFT0QXo', 'kR+IUtnG2D', 'cVN2a9wUT6', '/btLn+PFj/', 'h:\x20400px;\x0a', '-accent);\x20', 'fAoaBD3V1u', '0XV4+RkWvJ', 'eet\x20&&\x20ani', 'RVJAgBoQfS', 'LYt1Ba92TP', 'HlB8zhLZWQ', 'H+p9X+Vt+R', 'tG)\x20/\x20255;', 'B0IVeO/oEI', 'des[blendM', 'aveField\x27)', 'yPUPfKjweu', 'nimation\x20=', 'clkKM', 'ion\x20=\x20\x27scr', '0xhtpmUNlh', 'hg4/eNn3oz', 'kcj/915VUH', 'anvas,\x20blu', '/\x202;\x0a\x20\x20\x20\x20\x20', '(document.', 'cent);\x20col', 'lue=\x221\x22>1\x20', 'resolve', 'E0gN22Rrp3', '\x20\x20\x20\x20backgr', 'AWyZvSiGpc', 'rame\x20+\x201)\x20', 'r:\x20var(--a', 'select:\x20no', 'em2B+L3XT0', 'gvfMQIsVg6', 'VSyzjjzNxZ', 'kJJfPX64TC', 'domFlipVer', 'oRDA4HAPzc', 'QiS9yeXz3S', 'dlh+7cWzi6', 'fect</span', 'UvHG39uzCF', 'Int(docume', '\x20\x20\x20\x20if\x20(!a', 'qmK81esC2A', 'rBtayLH/dL', 'ving\x20targe', '\x20\x20\x20\x20\x20\x20\x20\x20le', 'AnimationS', 'bg-toggle-', '\x20if\x20(sprit', 'charX,\x20cha', '\x20\x20.column\x20', 'x;\x20color:\x20', '=\x20false;\x0a\x20', '\x20\x20\x20if\x20(win', 'bel>Blur\x20A', 'ize:\x2011px;', 'Tc3azSUtaI', '\x20\x20\x20if\x20(aut', 'bZgUfrM/RL', 'e\x20=\x20null;\x0a', 'rotationDi', '\x2015px;\x0a\x20\x20\x20', 'Width\x20=\x20dr', '::-webkit-', 'dow-sm:\x200\x20', 'z/RdvJWiOJ', 'Qrc/SnXec8', 'I1kIRqldmb', 'ems:\x20cente', 'pidzNgdPuS', 'isNwjs', 'eight\x20=\x20an', '7h7RoZbUCV', 'gooQSmIJVa', 'C2Qmm86nv7', 'a(imageDat', 'First)\x20{\x0a\x20', '\x20\x20\x20\x20ctx.gl', 'editorOffs', '\x20playInRev', 'put\x27).valu', '\x20\x20<div\x20cla', 'JBlkDBewBg', 'FlipX\x20=\x20cu', '\x20\x20\x20setInte', 'rAmountInp', 'ction\x20onCa', 'KUGU+lNbip', 'kE22qrUceS', 'size:\x2039px', '1RfxGkR4wk', 'Yl5JwoiaUL', 'blendModeI', 'Data.scale', '2vOqUJHOC2', 'library-it', '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20', 'dius:\x2020px', '<button\x20id', 'lFrames\x20-\x20', 'VVlw7p+HBV', 'd9Lm9nh8+x', '\x20\x20\x20let\x20r\x20=', 'lEoF1IoSNI', '30e5NPDRVO', 'xzi5Oyluk4', 'EYs2obGEnp', 'VMA00Xm7aY', 'eight:\x20500', 'i1Dt2r5419', '4H1/fsratV', 'tle\x22>Bloom', 'JwWgE6+5s9', '1iP0KtPah6', '\x20}\x20else\x20{\x0a', 'pCount\x20===', '\x20\x20color:\x20v', 'd\x20+\x204)\x20/\x206', 'qctViijM3i', 'R63k8A3ETw', 'KhMcfIfjhR', 'ner.saveAn', 'mfxZTRrvcM', 'l>Offset\x20X', 'vas\x20=\x20null', 'library[an', 'yId(\x27tintC', '4JUIlAXwl/', 'XauOc', '</label>\x0a\x20', 's;\x0a\x20\x20\x20\x20\x20\x20\x20', 'mn-layout\x20', 'ntensityIn', 'CCGVBWUYAR', '/RwvjBdFIq', 'whUzMzFgry', '\x20\x20\x20display', 'yx/g/D+SPo', 'tX;\x0a\x20\x20\x20\x20\x20\x20', '\x20\x20\x20const\x20a', '>\x0a\x20\x20\x20\x20</di', 'Ag6fiFCBQI', '\x20\x20\x20\x20\x20\x20\x20\x20<t', 'zloQHU5R8I', 'eu+YU38+M/', '\x20font-weig', 'x7mfVy8lXR', 'xjEXtF2slh', 'Canvas.hei', 'onQU0/nLk4', 'Rotation:\x20', 'sheet)\x20ret', 'RiBVUF1dVY', 'Remove\x20All', 'as.width\x20-', 'Box\x27);\x0a\x20\x20\x20', '\x20+\x20drawHei', 'ouseMove(e', 'ht\x20=\x2048;\x0a\x20', 'M/qMbXc14Y', 'anMWcj52Tn', 'item-name\x27', '-radius-sm', 'lue\x20=\x20name', 'Ez0OqRa8OC', '\x20255,\x20tint', 'g);\x0a\x20\x20\x20\x20\x20\x20', 's\x20*\x20animDa', '0tt1VLpR4r', 'dth\x20=\x20180;', 'HFQqhoXFng', 'talCheckbo', 'rWidth\x20=\x20a', 'yId(\x27anima', '\x20let\x20chara', 'erse:\x20docu', 'vHbL8Z8SjY', '\x20?\x20-1\x20:\x201)', '!isAnimati', 'Q2SdP0fu85', '\x20\x20\x20\x20\x20<labe', 'yumnAHmPQV', 'nA2EaRogii', 'alse;\x0a\x20\x20\x20\x20', 'f\x20(window.', 'Ss46JFYTZ4', '+e8WN/i16Y', 'urrentRand', 'vbqkrbZpuy', 'ag0Jr059kT', '\x20\x20\x20font-si', 'FK7I0mWMFj', 'tx.fillSty', '\x20center;\x20c', '\x20\x20\x20break;\x0a', 'Q0fHzvoutR', 'ent.create', 'le);\x0a\x20\x20\x20\x20\x20', 'ld\x22>\x0a\x20\x20\x20\x20\x20', '9lD0/Y0/K+', 'aH4hNu0ko+', 'otationChe', 'n8R5II2iCh', 'lock\x27;\x0a\x20\x20\x20', 'andomFlipV', 'XBTAEntqrv', '\x20if\x20(endin', 'accent);\x20o', 'xkRJnTVH3+', 'WkLf1b7YOD', '9++Mpo5vi8', 'nhaPOElF7c', 'Y91+Gvuutt', 'l;\x0a\x20\x20\x20\x20\x20\x20\x20', '7+6l8SPldN', 'hgVRqjSaep', 'dius:\x20var(', 'USbRvWRYGp', '\x20false;\x0a\x20\x20', 'dVwfZw4fs5', 'tileWidth', 'gOx2iC9r1t', '\x20+\x20charWid', 'K4mTS7qk8p', 'JFBaoVSt1K', '\x20\x20\x20\x20previe', 'else\x20{\x0a\x20\x20\x20', 'unTU461GJi', 'zL2fzCua2v', 'ight:\x20600;', 'ght\x20=\x20fram', '\x20\x20\x20<span>F', 'MNvvKEq57Y', '\x20--surface', 'abel>Inten', '55;\x0a\x20\x20\x20\x20\x20\x20', 'Lh697QF9vv', '\x20\x20<input\x20t', '-size:\x2011p', 'O1dupU5/U/', ';\x22>\x0a\x20\x20\x20\x20\x20\x20', '8HB9sn/mQK', 'onData);\x0a\x20', 'ation\x20||\x200', '\x20name:\x20ani', 'VIEsJ5gRqQ', 'center;\x20cu', 'NQjroxNjYG', 'AakBF50y97', 'NiZgv/l8Ct', 'hdPwcN+WdX', 'ge=\x22update', 'U8NYQaRRpt', 'form</p>\x0a\x0a', '\x20\x20\x20\x20<butto', 'gaDEMOBl6r', 'on\x20selectS', 'ent(\x27div\x27)', '8AoIs+f3dX', 'ppjHRHWK+n', 'Kz7e5fePF0', 'tCwrKwtQIr', 'le=\x22color:', 'UbiqjS1hyK', 'pssbrGYtND', 'nalRotatio', '\x20#3a1a1a;\x0a', 'ment.getEl', '\x27\x20+\x20animDa', 'rentSprite', '7DayfJaPQt', 'zFetObEzAu', 'd(\x27offsetY', 'e)\x20||\x200;\x0a\x20', 't\x20editorOf', '_character', 'AJSE5Bkipl', 'v7b6v6+Y0z', '\x20\x20Click\x20to', 'lass=\x22fiel', 'cLW+YZ6YpX', '\x20\x20\x20\x20\x20z-ind', '\x20\x20\x20\x20\x20--sha', 'ount\x20+\x20\x27px', '50%;\x20trans', '523t7GaBDj', '\x20align-ite', 'ype', 'Animation\x20', '.bg-toggle', 'EfPDWG0pQ6', '\x20\x20\x20\x20\x20\x20\x20\x20\x20i', 'nR88Pch5/U', 'kzCXUD55Px', 'h19Kcaw1gB', 'zCQYHWnNZk', 'HXfmswfz/B', 'Y804mxyZWF', '31G1U3pa36', 'jyTBlb0Td+', 'ZucvTlndXA', '\x20-finalWid', '8px\x2016px;\x20', 'ixlSeQlJwM', '\x20\x20\x20\x20\x20\x20\x20.fi', '08BrMcTRgU', '\x20\x20\x20\x20break;', 'n:\x20relativ', 'IjLaZUDb1q', '\x20\x20r2\x20=\x20g2\x20', 'CrhE6nIIgF', 'mpZCpUJp4f', '/span>\x0a\x20\x20\x20', 'YHv6BTl4G1', '456XRAKiu', 'acterSprit', '\x20#000;\x20}\x0a\x20', 'Is2v8ZrcCN', 'ezeSWtNTte', '9vXx/6TwN8', 'EQZhgWFbwu', '\x20<script>\x0a', 'tzt/8ad/Vc', '(%)</label', 'AvFMbHx5dZ', 'const\x20fina', 'label\x20styl', 'xLTnx+dduO', '\x20\x20\x20\x20\x20<inpu', '/alq0m6Ucz', 'OlsAoKoRg2', 'McawPDb/kc', '\x20\x20\x20\x20\x20\x20\x20\x20g\x20', '</h2>\x0a\x20\x20\x20\x20', 'one;\x22>\x0a\x20\x20\x20', '12nEBqHMaC', 'frameHeigh', 'pKLqrajDPy', 'ftY11tspOl', '5QBFmRXSrm', 'Xa5cKADAQg', 'bioCNCXTiU', 'deleteAnim', 'lex;\x20align', 'lid\x20var(--', 'jbVkm+2Bz4', 'h8RH5KZq9o', 'e:\x20documen', '\x27Please\x20lo', 'IA5tdtAgaM', 'se;\x0a\x0a\x20\x20\x20\x20\x20', 'QJjUQuwDmN', 'border:\x20no', 'aYwzNIPktI', ')\x20{\x0a\x20\x20\x20\x20\x20\x20', '<input\x20typ', 'h,\x0a\x20\x20\x20\x20\x20\x20\x20', 'Cjvwek+xAx', '\x20\x20img.onlo', 'iYGZfZlkXK', 'ppendChild', 'ue)\x20||\x2060,', 'color:\x20var', '\x20\x20deleteBt', 'c4gpkfB1yh', 'mEuuoo+n8y', 'qRxQrRQ0S3', 'DjAQ/Ik8Nu', '1LNrIcyUeJ', 'XcWvRvlmqY', 'tx.scale(f', 'MtlWI3pSR5', '\x20\x20\x20\x20\x20input', 'select\x20id=', 'Sprites', ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20', '9HD6jKlbpn', 'EojQB/L7yz', '\x20border-st', 'ield\x22>\x0a\x20\x20<', 'id=\x22bgTogg', 'CG+LSesSiP', 'nName])\x20{\x0a', 'ar(--accen', 'jgMmJpAgyp', 'o2sais7dpj', 'abel>Anima', '=\x22flipVert', 'Ymf5Od6Jot', 'u84Nxn3g21', 'x+46GTVQ+c', 'ear-gradie', 'Dgc3oxHy+o', '6T+qPYtYX7', 'rval(anima', 'pAm03HmH4O', 'e\x20In\x20-\x20Hei', 'rawCharact', '\x20\x20\x20\x20\x20\x20\x20\x20\x20b', 'tionNameIn', 'NsOuMy4/zU', 'ageManager', 'Ci2VDFdjYd', 'VsHU2UOmEB', 'ew\x20bring\x20t', 'KqZm1eztyF', 'in);\x0a\x20\x20\x20\x20\x20', ')\x20return\x20p', 'tent\x20=\x20hue', 'WWRu4fA+Ps', '\x20\x20\x20\x20style=', 'x3/oUwuDf9', 'f\x20(s\x20===\x200', 'pqe3ds/65O', 'EzcqMOO053', 'animationF', 'J/7G+fPIjp', '\x20position:', '\x27flipHoriz', 'H9w9VH1I+U', 'ite\x20=\x20null', 'mationProg', 'join', '\x20\x20\x20\x20<style', '6gW5nO5VC0', 'MOEOZlCmUy', 'preview-bg', 'KN9cZjbA10', ':\x20none;\x0a\x20\x20', '+KSPjmzZ63', 'getSprites', '\x20\x20\x20\x20\x20\x20tint', 'yId(\x27flipH', 'sGrYS4bhbz', 'FhCWPClGD8', 'w:\x200\x200\x200\x203', '\x20=\x20l\x20>\x200.5', 'hkwcc2G5uN', 'TcsuavIM0U', '60)\x20*\x2060))', 'hnyG+u5H3b', 'movedCount', '9EiJUMEZjE', ')\x20*\x20360;\x0a\x20', 'ew()\x22\x0a\x20\x20\x20\x20', 'rGgkY7J/XP', 'XOYd0pnaNg', 'QYUkntnueP', 'xBmOIIuOGR', 'tx.getImag', '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20', 'P5z22DToNH', 'd(\x27zIndexI', 'PgtYYWi+DB', 'wOeaP0FN0V', 'jaWy475+I/', 'hE4M+Nxv2W', '0B5k4hj3aG', '\x20\x20</div>\x0a\x20', 'ata.tintCo', 'Frxhex2gVt', '2maPzXtKVU', 'kHCVlkPD5s', ':\x2010px;\x0a\x20\x20', 'domCounter', '\x20\x20finalSca', 'leX\x20=\x201;\x0a\x20', 'library-co', 'BG+99bep2j', 'X8IRBDYIZu', 'ap\x20&&\x20temp', '8Hkqnai3aY', 'ibi8fMGKR2', '2w58q3/7rn', 'Oqs0nXq1aN', 'VYBhkTKsiP', 'x\x22\x20onchang', 'Q0CNl1LVaT', '\x20\x20\x20\x20\x20\x20fina', '7uQD2MNwlr', 'y9vJ2/vNp9', 'vm4331adWQ', 'bn3RjHYCKB', 'ant;\x0a\x20\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a', 'ibrary', '\x20top:\x200;\x20l', 'nvas.paren', 't+8zvxe9DD', 'realWidth,', 'ottom:\x203px', '\x20randomRot', 'ource-over', 't!\x27);\x0a\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20mi', 'A4PkMmHCS5', '4WtalgnEA6', 'b6n9wKb/8t', 'var(--text', '9Oepb8KWUT', 'mY\x20=\x20animY', 'nterY\x20+\x20pr', '\x20\x20\x20\x20\x20\x20upda', 'd.style.di', '5,\x20255,\x2025', '\x20\x20\x20\x20\x20\x20\x20\x20sa', 'abel>Z-Ind', 'em:hover\x20{', 'sNM2WPXJ3g', 'TBW+OkNQ6M', '2bJUk0DNaW', ')\x20h\x20+=\x201;\x0a', 'utoSaveChe', 'n71o5cG6ir', '\x20\x20\x20style=\x22', 'st\x20blendMo', 'epeat(auto', 'PHZlxfn7xv', 'QWUjA9loXq', '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20', '\x20finalOpac', 'In</option', '1r//K895MI', '\x20+\x201]\x20=\x20g;', 'bg9OCvxm9C', 'ayout\x22>\x0a\x20\x20', 'columnInpu', 's8cLKGxrwc', 'kooXAHbR+Y', ');\x0a\x20\x20\x20\x20\x20\x20\x20', 'LwOsiY6hbf', '\x20\x20overflow', 'QpIipbEGUH', 'nimation:\x20', '3pf1rzf0iq', '-y:\x20auto;\x0a', 'setX\x20*\x202;\x0a', 'play\x27);\x0a\x20\x20', 'c20aymQbUU', 'PN3u1Hkhwz', '\x20\x20\x20\x20\x20rando', 'wbpp/b/VuL', ');\x20cursor:', 'face-3);\x0a\x20', 'Z0mQsHUILl', 'iD8B7y5fjb', 'xcYj1MbEbG', 'symar+W1QC', 'JCt04mdv20', 'auto;\x20marg', 'G2YMKXB+ME', 'AmKK46VlUo', '7xX90Vm89n', 'top:\x2016px;', 'DGt01XOrKS', '\x20\x20\x20\x20\x20.prev', '3f72CQfjnE', 'o1HHSwsdgD', '7zo2yISWO9', '\x27reverseCh', '\x20\x20\x20\x20\x20\x20text', 'eet.width\x20', 'D9iDwGu4Y7', 'eight:\x20aut', 'MgC4XIvSmU', '\x20\x20const\x20te', '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'cF3w+xCJGG', ',\x20previewC', '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20', 'dhnmvV1+H9', 'idth)\x20/\x202;', 'imrQjsb3Cy', 'FTP1Zk4ebs', '5ordWpLa59', 'HJaZJQEvLo', 'yB6GtXb4Y8', 'lse;\x0a\x20\x20\x20\x20\x20', 'ayInRevers', '4q2z/TF+9/', 'NdmICtYBWA', 'tive\x20=\x20btn', 'n\x20=\x20animDa', 'fdr+yKBhVA', 'lveljj/tMa', 'tion\x20anima', 'charX\x20=\x20(p', 'one\x27;\x0a\x20\x20\x20\x20', '+sl27MPPsb', 'hPc8Hx61ef', 'ogress\x20<\x200', '\x20t\x20-=\x201;\x0a\x20', 'Id(\x27fileIn', 'bvy1i0028W', 'IdeiT76ie7', 'ub7rxsy6pe', 'ogress;\x0a\x20\x20', 'ionFrame\x20=', 'value=\x22non', 'v>\x0a\x20\x20\x20\x20\x20\x20<', 'jqSxryGXRX', '5WHKhbJQhS', '7qR0U1f66J', 'ked\x20=\x20anim', 'AKiGgqd+5l', '\x20\x20\x20\x20data[i', 'i38glb6bu+', 's2qhUy9x1N', ':\x2011px;\x20fo', 'kdFuNPb395', 'arDrawHeig', 'eScaleX\x20=\x20', '.getElemen', '\x20document.', 'ciq8DT6GNd', '1738rvUjmr', 'L9hyJB0bli', 'ingAnimati', 'SJgC2PGIdw', 'HrAHkxuNzW', '\x20\x20\x20\x20\x20\x20\x20\x20\x20p', '3SEKqesRue', 'uftKS4xP+y', '2iSiSqnv3n', 'a,\x200,\x200);\x0a', '\x20\x20\x20<div\x20cl', '3uEL3ecPY3', 'WNlLea7yYu', '8592157ptNewF', '!isPlaying', 'tn\x27).forEa', 'isplay:\x20fl', 'wLitPHnFQM', 'fB83/u/VOk', '\x20\x20const\x20ch', 'wsjPYm3qEw', 'Kv8EdIevla', '\x20\x20\x20\x20\x20\x20back', 'y\x20=\x20opacit', 'teFileDisp', 'Z5wUGd3hKi', '(--surface', 'Id(\x27animat', 'AZIDVkzech', 'htWCiNYICu', '\x20\x20\x20\x20drawFr', '5wNkWfbNby', 'nvasMouseD', 'm6WgxWZpGT', 'getElement', 'BCdWgQm0CS', 'hidsYUaIYz', '\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20', 'scrollbar-', 'l1qtmV9+/u', 'el>Animati', '\x20charCente', 'turDDr3n3n', '\x20||\x200;\x0a\x0a\x20\x20', 'ground:\x20#f', 'zWcn2jMQr8', 'r;\x20margin-', 'place(\x27#\x27,', 'sHGf0t+uo/', 'change=\x22up', '\x20\x20</style>', '>VFX\x20Previ', 'ltaY);\x0a\x20\x20\x20', '4xtAhW82Ry', 'tbyfptvXfP', 'PO77s6oIRc', 'tYm7sW/+ah', '\x20fileBox\x20=', 'r(--surfac', '\x20var(--tex', '\x20#111;\x0a\x20\x20\x20', 'x1hJ+IA97l', 'aEzHMLShtN', '5TNkNPOQgY', 'eHFj4wrXJf', 'jea70y3qc8', 'KoxF7SsvPx', 'TIu/YgUAJ8', '.offsetY\x20*', 'class=\x22fie', 'ukTO49eKdm', 'IjIjCNKSIt', 'aws+FB4zT6', '\x20\x20font-siz', 'q1JyiWHlC1', '<option\x20va', 'hild(item)', 'pyFile(fil', ':\x20var(--te', 'nxWCSIZ29f', 'haracterLa', 'r\x22\x20id=\x22blu', 'entById(\x27o', 'e)\x20return;', '\x20\x20\x20\x20\x20\x20\x20</d', '\x20\x20\x20const\x20d', 'Fs0IASYKhh', 'Zu6CCbtxH3', '_scene', 'bKC+YY1iZK', 'rxAG+7AtdM', 'ePreview()', 'imationToL', 'W/Xorr0/sP', 'ght:\x2044px;', '\x20item.clas', '0zEBuDHGsb', '\x20\x20\x20\x20\x20\x20\x20<sp', '\x20\x20\x20\x20switch', 't\x20type=\x22ra', 'CFrD+JO0o0', 'jDh281OB3l', 'ary(name,\x20', 'nGi8SmduPB', '358H0XX+2u', 'shed\x20#555;', 'box\x27)?.che', 'AC6rzmzPbM', '\x20if\x20(max\x20=', 'ntal</span', 'zBKnVb6mdO', 'T6AGHKPLkv', 'lt3k9Lp6a0', 'str(0,\x202),', 'F9NfdE+ET9', '\x20offsetX\x20=', 'v1c+QMFE3K', '\x20color:\x20va', 'kbox\x22\x20onch', 'PimdPKKjpI', 'ant;\x20font-', 'D4ZOCiYWA6', 'columns:\x201', '\x20input[typ', '\x20\x20height:\x20', '8I8JDCSCkk', '\x20h\x20=\x20((g\x20/', 'ITd/VL91x1', 'jBsYIEVQ9l', 'SQg1R+NEF4', 'jInrZouZSH', '\x20\x20\x20<img\x20sr', '152,0,0.15', 'CNBtKxQYUN', '2qWNUChAom', 'yyNDykyVte', 'if\x20(h\x20<\x200)', '\x20\x20\x20if\x20(ran', 'rRect(0,\x200', 'peningAnim', '8q33t+Bn6p', '\x20tempCtx.p', 'FLNq5EZv3u', 'v33ftXcIqy', 'dow:\x20var(-', '2fdaWn9M7D', 'KfxV9deap2', 'rSprite\x20=\x20', 'xm+iJ8eKBg', '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20', 'e=\x22none\x22\x20s', 'gIeTnRoqnL', 'viTvVRF1pJ', '\x20font-size', 'ntColor\x20=\x20', 'onst\x20row\x20=', '/+3aguMxJm', '\x20\x20.bg-togg', 'beObW1Axxe', '\x20Target\x20Sp', '\x20\x20\x20\x20g\x20=\x20g2', 'Goyx0ry8bJ', 'h41foFT2hj', 'eGY6jjWsdu', 'rgin-top:\x20', '-text:\x20#e8', 'canvas.get', '20px;\x20colo', '\x20=\x20Math.mi', 'oZg2/t+aWQ', 'yicv4gXwOv', '\x20=\x20((b\x20/\x202', 'ation\x20=\x20tr', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20}', 'Y5quvfw2c2', ':\x20l\x20+\x20s\x20-\x20', 'bHPG4SGog9', 'r2\x20=\x20hue2r', 'ipY\x20?\x20rand', 'le\x20=\x20previ', 'window.onl', '\x0a\x20\x20\x20\x20<div\x20', 'ibraryAnim', 'R5osvS9dRN', 'qP+56GngLP', 'isPlayingO', '\x22autoSaveF', '\x22>2\x20-\x20Back', 'useDown);\x0a', 's0zoPdHrRH', '>\x0a\x0a\x20\x20\x20\x20\x20\x20<', '33Yd3E8HU8', 'on(event)\x20', '0rX7HaBRUc', 'zIlhQ3ds+J', 'jod0cKZwvr', '16LHIXe/lt', 'Ljh++fOGZj', '0\x22\x20onchang', 'overflow:\x20', 'taUrl;\x0a\x20\x20\x20', '000\x27,\x20\x27bgT', 'rite\x20=\x20fun', 'q96qoRhRxM', 'animData.o', 'bg-toggle\x22', 'XrF40u9lv8', 'BCBXvFS6jX', '(\x27randomRo', 'Dg/ETwc2M2', 'result', 'transparen', 'vzMQ6fuIZu', '>\x0a\x0a\x20\x20\x20\x20<di', 'alue)\x20||\x201', 'qODmHERz6d', 'onst\x20charH', 'align:\x20cen', 'IyyYy2Myqf', 'cterSprite', 'er-color:\x20', '4xoGiw9P/X', 'nt(offsetX', 'K3/Nqo5PMS', '.3);\x0a\x20\x20\x20\x20\x20', 'heckbox\x22]\x20', 'zQIUcATPYM', 'L2w/koqvJ8', 'GH+ZPxclFG', 'pointer;\x0a\x20', '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20', '\x20.containe', '\x20\x20drawPrev', 'lumns);\x0a\x20\x20', '9N2PE97bH5', '\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20', '/\x20255;\x0a\x20\x20\x20', 'LXT1WLe2md', 'en\x27;\x0a\x20\x20\x20\x20\x20', 'kepc3CUBcc', 'WYzDkLfnDB', 'MsH/zsrbHh', 'hen((libra', '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20', 'e=\x22display', '=\x20s\x20=\x200;\x0a\x20', 'wpnnbE3LRj', 'OYo0i1SE5F', '2Lao8L4MSK', 'fGNtY9xt2n', 'true;\x0a\x20\x20\x20\x20', 'canvas\x27);\x0a', '\x20\x20\x20fileInp', '8VrFzN/X8r', 'nWtp1BLPxM', 'vYLNuiR32o', '\x20r\x20=\x20(r\x20*\x20', 'fW630nh9fi', '89srzSFFHX', '\x20\x20\x20const\x20r', 'asedProgre', '59/p/z3HRh', 'eHeight\x0a\x20\x20', 'CQ0FHnEANq', 'DSoeBtGXIp', '8+w/TeKRcF', 'Bloom)\x20{\x0a\x20', '\x20\x20\x20\x20}\x20:\x20nu', 'ntById(\x27hu', 'J8tynUrq6L', 'W7Nb9+vZkA', 'W4aov57YB1', 'siteOperat', 'ction\x20draw', '1ejNVVNiW6', 'f71hUx6JoK', '2jNAgwDqGg', 'finalOpaci', 'mBtRcrwVKK', '=\x200;\x0a\x20\x20\x20\x20\x20', 'gradient(1', '\x20||\x2048;\x0a\x20\x20', 'IqO6RabD4X', '\x20\x20\x20\x20\x20\x20\x20fun', '4QcvS9BGQK', 'Data.colum', 'rgin-botto', 'ame\x20%\x20colu', 'mC0S/ycT/2', 'W1L14zsdGH', 'mDdug2xaJH', 'AquWWIyFAK', 'F3+EtJ5vVb', 'wWA9Kd6IY8', 'splay\x22\x20sty', 'a\x20href=\x22ht', 'w\x20=\x20docume', 'alse,\x0a\x20\x20\x20\x20', 'veToLibrar', 'ID/ivu65xt', 'RnyGDIvsyE', '\x20\x20\x20\x20\x20<div\x20', '39h7boQEk6', 'checked\x20||', '\x20\x20\x20\x20\x20\x20\x20\x20as', '+i9C979o7c', 'save-butto', 'IKkKQ9yRFS', '\x20\x20\x20\x20\x20\x20\x20\x20it', 'R0nF9oMIRf', '=\x22display:', 'accent);\x0a\x20', 'sdcPCiXZg3', '|\x20false,\x0a\x20', '\x20\x20let\x20b\x20=\x20', '\x20\x20\x20\x20\x20\x20\x20\x20pa', 'und:\x20rgba(', 'Data.opaci', '-shadow-sm', '8OxvrK6RVV', 'TADZwUSw8b', 'ModeInput\x27', 'qsgsxxEPkk', 'ut\x27).value', 'rationInpu', 'gap:\x2010px;', '4),\x200\x200\x200\x20', '4px;\x0a\x20\x20\x20\x20\x20', '79cTTw66pr', 'ddmQntme1Z', 'C2neCDpnKg', 'brary()\x22>S', 'v33x4llYCV', '7Xn+jmzbOn', '\x20\x20gap:\x2010p', 'ibraryPrev', 'giQ7wYvUdy', 'vrIefnv1Zw', '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20', 'SgWllXKKco', 'setY\x20=\x20par', 'witch\x20(max', 'cale;\x0a\x20\x20\x20\x20', '5JhUmHRtju', 'jLxmSIJRFh', '1mQpwMx266', 'ationFromL', 'QTW37Rq/cs', '()\x20<\x200.5;\x0a', '+8UtQelkD9', 'tKpA/HzCxN', 'e);\x0a\x20\x20\x20\x20\x20\x20', 'dth\x20*\x20fina', 'qLuKWs+kfc', 'X6S1ctHVrm', 'rsor:\x20poin', 'urrentSpri', 'y-item-pre', 'aDjb7/aqUN', 'EoggLQUCCV', 'ion\x20value=', 'zuiyLfQ5dV', 'wsROxzaK1H', 'ndT7YXPfds', 'ndChild(ca', 'viewCtx.fi', 'XS3GzM5+kz', '\x20=\x20charact', 'LG8+BcIXof', 'etY:\x20Math.', '\x20\x20\x20\x20<optio', 'ELQXC4JZ/g', ':\x20flex;\x20al', 'AACIKUlEQV', '3mTUncuKTX', '\x20border:\x201', 'ass=\x22field', 'canvas\x20=\x20d', 'MAatySlYSh', 'entById(\x27b', 'heckbox\x27)?', 'cked\x20||\x20fa', '7VI7qTbMwB', '2);\x0a\x20\x20\x20\x20\x20\x20', '82pU77dj1m', 'eInput\x20=\x20d', 'WHjb4ws32L', '9HnXuG5n8q', '\x20r\x20/\x20255:\x0a', '=\x22300\x22\x20onc', 'csGfEQCAzE', 'uyFt3/3pe6', 't-decorati', 'O5l9P3Pv5y', 'e\x20=\x20animDa', 'mationName', 'teWidth\x20=\x20', 'EYCUKEVQo9', '\x20=\x20(previe', 'th\x20/\x202,\x20-f', 'ions).leng', '6hiE3Hbtr+', '\x20\x20\x20\x20if\x20(ra', 'a6GpwbwQIz', 'ary', 'tion()\x20{\x0a\x20', '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20', '\x20\x20\x20\x20s\x20=\x20l\x20', 't();\x0a\x20\x20\x20\x20\x20', 'wuxNq7f9YM', 'QImCFW9Ai8', 'AJX5V4LbPd', 'ltFteNHcaD', 'ionValue\x20+', '+hOnoG6PII', '\x20\x20\x20\x20\x20\x20\x20\x20\x20-', 'Gi3XjXsuZP', ':\x20none;\x20}\x0a', 'SwAlohA3m8', '\x200);\x0a\x20\x20\x20\x20\x20', 'wHbzVYzYcA', 'div>\x0a\x20\x20\x20\x20<', 'zpw86u0tvQ', '\x20255;\x0a\x20\x20\x20\x20', 'mF9EYgJOd1', 'In\x22>Scale\x20', 'WPWDpYgsyu', 'wWidth\x20=\x20f', 'kbox\x27).che', 'xlj5wVAZeG', 'YYL2/aQy50', 'L6yAwSaOzj', ';\x20border-r', 'WJlcBlPDbY', '\x20\x0a\x20\x20\x20\x20if\x20(', '6\x20*\x20t;\x0a\x20\x20\x20', 'ur\x20*\x204;\x0a\x20\x20', '0a3WENHrqD', 'GwqMEFsjWT', 'tGV/DnjZh1', 'tSpriteshe', '.flipY\x20||\x20', 'J8vMcEkM5I', 'INAonXfdhv', '5IaFiDsKm3', 'M1wh6hfKXH', 'cZwZZ3EbHb', '\x20backgroun', 'Z5mHe4eUOG', 'y\x20*\x20easedP', 'ZnFTZMiKmq', 'LrgBFgxC+j', 'AqzZOHgW5O', '4Ktndtx72q', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20<', 'gUtm5WsIlA', '_image', '(--text);\x20', 'reviewCanv', 'se\x20?\x20(tota', 'ozpGwVU3bJ', '==\x20\x27scaleI', '\x20\x20\x20\x20\x20\x20\x20pre', 'RQxdMXrfRt', 'r;\x20user-se', 'alue=\x220\x22\x20m', 'vr2LjksWKc', 'ibrary\x20&&\x20', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x0a', 'inIZvSgHhu', 'p:\x206px;\x20ri', 'div\x20class=', 'WithYSorti', 'pointer;\x20u', '6OCBlqa', '5bKda0/Yww', 'dJ2/nWE19W', 'F1gIDyJ4Cn', 'mRotation\x20', 'vaysHT26dm', 'qy2rrarngA', 'ao5QePwRCT', 'SEgWgieogx', 'C/9j1AdNmf', 'CAvkP9u6bv', 'eYQ8SVGlmF', 'Y\x20=\x20e.clie', '\x20\x20\x20let\x20isA', 's);\x0a\x20\x20\x20\x20\x20\x20', 'item-previ', 'f6V/BWoDRx', '\x20*\x20scale;\x0a', '/5E7HR7e/u', 'tn\x20{\x20posit', 'Z9YmF5HTWP', '7+ATFprfsE', 'icTazHsPIM', 'wCanvas.ad', 'div>\x0a\x20\x20\x20\x20\x20', '>✕\x20Close</', 'Knc0ljbGVT', 'q8CAfpJYaH', '\x20255,\x0a\x20\x20\x20\x20', 'fu7Ggu7Kju', 'zMi+kgYJzG', 'name', '3Dm7tfYPEl', 'TKDCGc/lMj', 'X37NDvyNQU', 'tById(\x27ran', 'ent.getEle', '\x20\x20\x20\x20\x20\x20\x20pad', '\x22>\x0a\x20\x20\x20\x20\x20\x20<', 'CBcTL0VEsq', 'hover\x20{\x20te', 'H7dWyja1Ap', 'Input.addE', '/lg8HOGei7', '\x20\x20\x20width:\x20', 'own(e)\x20{\x0a\x20', 'vAmbIH4hEI', '\x20box-shado', 'gl5AZyF/kC', 'HzqnAckmLC', 'etElementB', 't\x20scaleY\x20=', 'eWidth,\x0a\x20\x20', 'qybXSWOY55', 'xt);\x0a\x20\x20\x20\x20\x20', 'div>\x0a</div', 'eKo1GwD2ZF', 'qdCssRQAHx', 'important;', 'QEchYZQG4i', '*\x20progress', 'qkSQRMph4o', 'CHeZdmO2f/', 't9OfnN4J0J', 'ace-3);\x0a\x20\x20', '/dRORhsdxj', ')\x20{\x0a\x20\x20\x20\x20co', '347328MvgDAc', '/\x202\x20-\x20(blu', '\x20\x20\x20\x20\x20\x20\x20cha', '75wUW//UQS', '1J6nT9KxAt', 'imData.cha', 'ZtozbWUsql', 'animData.r', '/FqovdUIw2', '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20', 'st\x20autoSav', 'n\x20=\x20blendM', 'boiR4putM7', 'splay\x20=\x20\x27n', '\x20\x20\x20\x20\x20displ', 'Error\x20remo', 'PUCRoz0lhK', '7BtElJ+7p7', '\x20\x20\x20\x20\x20\x20\x20\x20op', 'MIEVIwqUkq', 'ainer\x20{\x0a\x20\x20', 'lBzBHrq+Ui', 'ni1Xq8KMqh', 'b23cuuUi+q', 'RckiqdLEqM', '\x20\x20\x20if\x20(off', 'x.rotate(f', 'OX6VVtseeO', 'CfwHnD6n2m', 'dKZ2woIpoy', 't)\x20/\x202;\x0a\x20\x20', '>\x0a\x20\x20</div>', 'e\x20animatio', '0PDrYijpVY', '\x20\x20\x20.remove', 'alse);\x0a\x20\x20\x20', 'l8r6P6GN2D', '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20', 'Hue:\x20<span', 'z2E6oQb0Wt', 'TjmDkXch3c', 'mData.flip', 'FPsPCTl0a+', 'q/2btTjiSP', 'lyBloom)\x20{', '7zx9JV8G2x', 'j2RDqGCNmE', 'd:\x20#353434', '2HQUqwmo+B', 'terSpriteH', '/8eej+ri7j', 'e/jyMeyvll', '\x20rows\x20=\x20pa', 'IIEffjw9Iz', 'ry-item:ho', 'acterFirst', 'yUtwpAQGRM', 'n>Random\x20F', '.getImageD', 'd\x20||\x20false', 'fzvVU0s6y8', 'mCp68O/2L+', 'tkeaJopqIS', '\x20?\x20d\x20/\x20(2\x20', 'eHvBWnWIhs', '4kw2ECELRD', 'ntSpritesh', 'Tl6Z18Ec9Z', 'Input\x22\x20val', 'hgSVwbK3hY', '>=\x205;\x0a\x0a\x20\x20\x20', 'o;\x22>\x0a\x20\x20\x20\x20\x20', 'sHLG7YEa1L', '3I7AdxE3Ct', '\x20\x20window.o', '\x20=\x20img;\x0a\x20\x20', '\x20false,\x0a\x20\x20', '\x20\x20ctx.glob', '\x20?\x20l\x20*\x20(1\x20', 'existsSync', 'TrDHlY2elY', 'O+DyNPT7oZ', 'Canvas.wid', 'n6pDnJv/cM', 'AZgMWyLwx0', '</option>\x0a', '0IdvxnhyDw', 'FRftEAAIG+', 'tch.io</a>', '0b01F1mTXs', 'XQJ6Ii6bqz', 'OBc8YF7+Lt', '\x20\x20\x20\x20\x20\x20\x20\x20bo', 'hL3kqHhMPM', '\x20\x20if\x20(!cur', 'stringify', 'VFX\x20Design', 'ent\x20=\x20file', '2970384UZeKSx', 'xg47v+8wGp', 'a.characte', 'dding:\x2012p', 'v5ej4xUIgP', ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20', '73Pv283fEu', 'iv>\x0a\x20\x20\x20\x20<d', 'xsvGtDmMj7', 'head>\x0a\x20\x20\x20\x20', 'x\x27)?.check', 'xR0ok/fPEu', 'nimData.fl', 'alHeight\x20=', 'B5VFHM7+OT', 'BID4+Hl3FI', '\x20\x20\x20\x20\x20\x20g2\x20=', 'ZmDq13Mc6q', 'Yl7SZDKJq6', 'QyUsyDLSxe', '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20', 'PreviewBg(', '>\x0a\x20\x20\x20\x20\x20\x20<s', '\x20/\x20180;\x0a\x20\x20', 'YVjYMEFkVm', 'x\x20solid\x20va', 'eCdYOwgt2Y', 'eCount\x20===', '\x22\x20onchange', '2k3os3vcur', 't.keys(lib', '&&\x20window.', 'PINZSayUPR', 'd=\x22scaleIn', 'OR1AINSV2g', 'edz7iObuPI', '\x20\x20if\x20(wind', 'city\x20*\x20eas', '\x20\x20\x20\x20blurCa', '\x20\x20\x20\x20\x20\x20\x20\x20\x20d', 'qczf9Hsf7s', '8dxrH3xr2R', 'xSbOxPZ/VY', 'FU5BpJQSdR', '<\x201/2)\x20ret', 'onst\x20charY', '6jMSNuqfRd', 'skpCWAXOqR', 'wYTQuphBjM', 'WhzTAliHjs', 'T+QN6EWpQ5', '\x20\x20padding:', 'ierGhu7Kis', '\x20\x20\x20\x20\x20\x20\x20\x20on', 'up3pa6PLm0', '5deg,\x20#061', '6rStr34vf+', 'GekaZRA1FV', '\x200,\x0a\x20\x20\x20\x20\x20\x20', 'DrawHeight', '<label>Loa', 'ropagation', '5AWieQENGi', '0Zt3Lq0aGB', 'bK7wRzPgo7', 'ss=\x22librar', '0utYcMkTtg', 'veField\x20=\x20', '+xaS9tAxit', '\x20data.leng', 'QMMjhEyYdO', 'RypAr3307j', 'ccg0AGNSWG', '=\x20\x27blur(\x27\x20', '\x20(openingA', '\x20padding:\x20', 'kYuAEtmlFJ', 'bel>Blend\x20', 'F9kte3xFnn', 'eG20Z9gS2l', 'wzIbpwgya9', 'ArqTxyzQmC', 'xHL+oKUnlb', 'fVzOgu8tnD', 'shlz6330HH', 'ecked\x20=\x20an', 'NKCUUMG+2D', 'ooOKHOSYm7', '9tyIcs8kkA', 'N1md80q3iN', 'vgzKLx9EAG', ':\x2011px;\x0a\x20\x20', '0W2rBjMzfz', 'ess\x20=\x20endi', '\x20data[i];\x0a', 'JQ+Rr7FddB', ':\x20var(--su', ';\x20align-it', 'put\x27)?.val', 'nst\x20hue\x20=\x20', 'abel[style', 'e+LRNn/knK', 'animData);', 'eader\x20p\x20{\x20', '\x20border-ra', 'Width,\x0a\x20\x20\x20', 'lue\x20||\x20\x27au', '1U4cZ8qic9', 'color:\x20#e0', 'grdLI1ap2/', 'frnr34J8Ii', '4OPP1hxJR0', 'mTT2SaDidt', 'ata.charac', 'RaYE0VfbII', 'y()\x20{\x0a\x20\x20\x20\x20', 'umbLcgD8vN', '\x20if\x20(isPla', 'KhIHDjEtCM', '\x20\x20\x20\x20\x20\x20<opt', 'brary)\x20{\x0a\x20', '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20', 'utoSaveEna', '\x20\x20\x20\x20\x20borde', 'nbuKZbLBiA', 'const\x20reve', 'Y\x20||\x20false', 'WQtBIpW00L', '+ywghe+IdV', '\x209px;\x0a\x20\x20\x20\x20', '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20', '5dfh+nEz7t', 'TargetSpri', 'addLoadLis', '6wqeGJo5mn', 'ckground:\x20', 'X9KavsCiIb', '-3);\x0a\x20\x20\x20\x20\x20', 'id;\x0a\x20\x20\x20\x20\x20\x20', 'ZhwwUA56xL', 'ction(data', 'sole.error', 'BQfpvgg+cK', 'yd9PRTzuiX', '/FRQIT/r+B', 'AsInPQKR58', '6JIuJs0OPc', 'olutionLib', '\x20charDrawW', '\x20\x27x\x27\x20+\x20ani', 'te.height;', 'DdlsjDBhEX', 'h\x20<\x200)\x20h\x20+', 'leteBtn.cl', 'wFrame\x20=\x20(', 'rDds6taeW/', 'ibrary-mod', '0vrBdICQy6', 'xoDqbaIVgc', 'G3SyA0zeUf', '\x20\x20\x20\x20\x20\x20\x20.bt', 'Y83GtOnT6P', 'ZfY3fp57k9', '0,\x20preview', 'reviewFram', '\x20\x20\x20\x20\x20\x20r\x20=\x20', 't.getEleme', 'Aj4vDCQcCx', '\x20(randomUp', 'ry(animati', 'eateElemen', 'onLoopCoun', 'u+Ly4ncb+B', 'hem\x20to\x20the', 'R47Jwz5twI', 'M9maMcqOLv', 'S6/Enc2zLf', 'fuxVth43od', 'cument.get', 'span>Enabl', '=\x22Multiply', 'eld\x22>\x0a\x20\x20<d', 'jv6JLo2zFm', '\x20-\x20min;\x0a\x20\x20', 'onCheckbox', 'tAF01T0i+O', 'Error\x20load', 'qZIXXHKppo', 'kWyzJZto+8', 'nsX5TMilo2', '1TrIaSDV45', 'vrs9DEPG/2', 'FIhhHKa0K/', 'ckground\x22\x20', 'muqcCHAEKd', 'yVcrAPhzJJ', 'QGaXKwTFBw', 'lipVertica', 'ibrary().t', '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20', 'ip\x20||\x20fals', '\x20\x20\x20\x20\x20\x20\x20\x27Sc', 'cEUp4EKoSH', 'x;\x22>\x0a\x20\x20\x20\x20\x20', 'ObiiJB7aLI', '\x20\x20justify-', 'en1iRF3KXY', 'pect-ratio', '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.', 'p:\x208px;\x22>\x0a', 'olor:\x20var(', '\x20\x20\x20\x20\x20\x20\x20\x20\x20c', 'PabMxTwIUj', 'el\x20style=\x22', 'value\x20||\x200', 'REWZFLqLgc', 'sInput\x27).v', '\x20block;\x20}\x0a', '80HMHAOUTf', 'blurCtx\x20=\x20', 'kz4yV8zCVo', '=\x22file\x22\x20id', 'cenBQAbfRT', 'PQgNOyYX8B', 'Ey1+FjFMUn', '744Nl8xgNW', 'zX6R/D9G19', ':\x205px\x200\x200\x20', 'utoSaveFie', 'QSAIdTdDiR', '\x20#aaa;\x20mar', 'YoYRuXPebb', 'datePrevie', '\x20transitio', '=\x20min)\x20{\x0a\x20', 'ocnOvPbMcn', 'terSpriteT', '94949;\x0a\x20\x20\x20', 'IPiMrv6IY7', '=\x20hue2rgb(', 'gDHIy7de0r', 'AyZFPoq1Gw', 'onst\x20rando', 'eckbox\x27).c', 'd\x20Spritesh', 'kulu8IlAcg', 'ue=\x22255\x22\x20m', '\x20\x20\x20\x20\x20\x20\x20cur', 'x;\x0a\x20\x20\x20\x20\x20\x20\x20', 'eft:\x200;\x20ri', 'ht:\x20600;\x0a\x20', 'EiECgCwBNB', '\x20=\x200;\x20i\x20<\x20', 'X\x20=\x20parseI', '8UPjM99/mt', 'j0kvfPP20k', 'bcpWzABjZA', '9/28zgOkpY', 'fztGVZny8f', 'vFnqBixmY6', 'tton\x20oncli', '\x20\x20if\x20(curr', '\x20\x20\x20\x20paddin', 'yqoXV+HPys', 'nst\x20animNa', 'NLti2f7wqA', 'MGkdKGA9rI', 'uYYRFecq4w', 'tqOV7sMoe0', '(0,0,0,0.4', 'rce-over\x27,', '\x20previewCa', 'f\x20(applyBl', 'mData.bloo', '-right:\x208p', 'write', 'c1NRvCYGio', 'EBuUd8WIFE', '\x20\x20\x20\x20\x20align', 'Owy/Q6iFjR', 'bWBUKmLzse', 'ption\x20valu', 'Ot+FYTY2R0', 'wKLBmdSzBR', 'BMo4BLVgi3', 'otation\x20?\x20', 'reen\x27:\x20\x27sc', '8gXtspVl1W', 'kDRZaEPtGs', 'r9cbj1tbuO', 'MyxGve/+q4', 'A+6OQIjYX7', 'drAORtt14G', '1GN5N/NJ0Y', 'evpPBZ86c9', 'alAlpha\x20=\x20', 'jFNHlsFgcc', '\x20\x20\x20\x20};\x0a\x20\x20\x20', 'Math.PI\x20/\x20', 'cal\x20=\x20docu', 'w3ly0ApxZ3', 'IOkcxPa2ft', '()\x20{\x0a\x20\x20\x20\x20\x20', 'RfcQCSMvIA', 'nzt747rl2M', '\x20\x20\x20\x20\x20\x20\x20\x20.h', 'Y6UBtPPTat', '\x20\x20\x20\x20\x20\x20\x20\x20co', '\x20\x20\x20\x20\x20\x20\x20\x20\x20o', '+Bu5L/Yfil', '\x20\x20\x20\x20\x20\x20padd', '\x20100)\x20*\x200.', '\x20\x20\x20\x20\x20curso', '?\x20scaleY\x20:', 'Eb6o3r5nnj', 'hadow);\x0a\x20\x20', 'PgKDYsb0XX', 'Jh4WhcOHp5', 'ew()\x20{\x0a\x20\x20\x20', 'NrFBuH6atf', 'K+g9ZoPiw2', 'tes-button', '\x20bloomCanv', '9N074/Hxn3', 'onst\x20frame', 'OsUlykAdUE', 'egqqBCoReI', 'wHeight\x20/\x20', 'stener(\x27mo', 'VmKreqvr1j', 'Qv27CTwLKd', 'Hn441r0rP8', '\x20\x20\x20\x20isAnim', 'AUpkgjypuB', 'filename', 'o\x27,\x0a\x20\x20\x20\x20\x20\x20', '+trLq9mlZV', 'lign-items', '\x200)\x20{\x0a\x20\x20\x20\x20', 'nt(documen', 's.getConte', 'd-template', 'x-shadow:\x20', 'dqW9ehxCoR', 'label>Colu', 'wgHHKargB6', 'put\x20=\x20docu', 'imating\x20=\x20', 'sK8rn+OGHm', 'RHBQAvFUR0', 'lass=\x22bg-t', 'ItWmUT+77L', 'tx.filter\x20', 'MPcukRLwlN', 'const\x20fram', '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20', 'iew()\x20{\x0a\x20\x20', 'rv+W6g0+7V', 'Xrd9hil/Vb', 'Yl763u5jYR', 'rogress;\x0a\x20', '=\x22randomFl', 'mentById(\x27', 'tWidth\x20-\x204', 'pv9s9iE2Of', '3oLnX8rw50', 'splay:\x20fle', 'bitmap', 'ht\x20+\x20(blur', 'ct:focus\x20{', '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20', 'ollbar-tra', '\x20\x20\x20\x20\x20previ', 'YYkPiwhAEM', '\x20displayFr', 'GANncQgkil', '\x20class=\x22fi', 'Ct2R7khwyb', 'q55VfahGVD', 'D7oZ+N2/P8', 'Img.comple', 'ng)\x20{\x0a\x20\x20\x20\x20', 'SoBidx6G0k', '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20', '\x20=\x20(canvas', 'w1ntZe0AjU', 'UONHzR5wdT', '\x20=\x200;\x0a\x20\x20\x20\x20', 'elect\x20=\x20do', 'xjzNfVoWn2', 'teAnimatio', '5uf3jzGlY8', 'tes()\x22>\x0a\x20\x20', '\x20\x20const\x20fp', 'pe=\x22number', 'pQYIEJxmIO', 'return;\x0a\x20\x20', '/6)\x20return', 'json', 'ument.getE', 'y\x20header-h', 'kit-scroll', '8px;\x0a\x20\x20\x20\x20\x20', 'ry(name);\x0a', '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a', '\x20let\x20g\x20=\x20d', '10w6gwAVAW', 'zLXFMUvCjG', '<div\x20style', 'FxHAEir7Iz', 'ckbox\x27).ch', 'ZPf/jN87e+', '\x27);\x0a\x20\x20\x20\x20\x20\x20', 'omxLHFwmuE', 'tElementBy', '\x20\x20\x20\x20<p\x20sty', '\x20*\x20(finalO', 'Canvas.par', 'HHy6HrPh2x', '\x22field\x22>\x0a\x20', 'th\x20=\x20conta', 'add(\x27activ', 't\x20sprites\x20', 'target', '\x20\x20document', 'itco8UQ0FI', 'ortant;\x0a\x20\x20', '\x20border-co', '\x27rotationI', 'alue)\x20||\x200', '+gO1S9m9EV', '\x27scaleInHe', 'r-bottom:\x20', 'G0FR+qDK+K', 'ICRFAB1YxX', '\x20\x20\x20\x20\x20\x20\x20\x20do', 'lue\x20||\x200;\x0a', 'WJf889//30', '\x20\x20\x20\x20\x20\x20\x20\x20</', 'Display)\x20{', 'lute;\x0a\x20\x20\x20\x20', '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a', 'background', 'lue)\x20||\x2025', '\x20\x20letter-s', 'Bf7IMu7AOu', 'n+rPmt+xAq', 'bDf7o+257e', 'ationDurat', '0LR/5K3TdB', 'FORM\x20SETTI', '4Eazktx', 'mes\x20-\x201\x20-\x20', 'Input\x22\x20onc', '\x20\x20\x20\x20\x20\x20asyn', 'Value\x20+\x20\x27°', 'JWGT5QjMhq', '/pP3xu6pO2', 'warn', 'SBD2yJhrKP', ':hover\x20{\x20b', 'pWYNQmkAIb', 'Q5lro8jA4A', 'iOjbPY47YR', '\x20\x20\x20\x20\x20\x20\x20r2\x20', '--radius-s', '7XCl2PrEnR', 'Ty/IPX09F1', '1VviNTHGYq', 'ter;\x20user-', '.drawImage', 'th\x20=\x20frame', 'GZSC6rAvPq', 'utf8', 'id=\x22bloomC', 'EWIybbcf/i', 'XdGmH2B0fs', '\x22\x20onclick=', 'eHeight;\x0a\x20', 'ync', 'kCswxi87mS', 'Y88eqPT3aI', 'ground</op', 'z+KZe8caSx', 'lect\x20id=\x22z', 'LOQ6pzqnKF', 'MB04wPN4sq', 'tSt/sxEtao', '\x20\x20const\x20cu', ':\x20space-be', 'luKv8iO0NB', '/js/', 'loTcJoDsan', 'Glc13mqyNX', 'tzYjAcD0bH', 'gv8bsObF99', 'cked\x20=\x20ani', 'xluQsCFIo3', 'mationFrom', '\x20(framesLe', 'pyFyIWB5Rk', 'v8jwfgA4ID', 'Hgg+Uolaiz', 'U5EO8Dl5qN', '\x20\x20const\x20co', 'us:\x206px;\x0a\x20', 'parseInt(d', '</script>\x0a', 'v>\x0a\x20\x20\x20\x20\x20\x20\x20', 'haCLEZxgSk', '==\x20\x27fadeOu', 's\x20=\x20hue\x20*\x20', 'acing:\x200.8', 'S/bsVevf04', '\x20\x20updateRa', 'a.spritesh', 'fwvcoTSUxi', '8owPZXE1uk', '\x20\x20\x20\x20\x20\x20<lab', 'HoGsstEv8b', 'ufYq20XPrb', 'eInt(docum', 'nYeAB6ip5U', '\x20\x20\x20};\x0a\x20\x20\x20\x20', 'rface-3);\x0a', 'RIH5G/dV9+', 'tant;\x0a\x20\x20\x20\x20', 'F7iejfxaC0', 'sXlw5vCd3S', '</div>\x0a\x0a<d', 'H3GmoCkOND', '22J3N2OODu', '+vOU/gO5vj', '\x20\x20\x20\x20let\x20an', 'PcvGr821Gz', 'select>\x0a\x20\x20', 'etBounding', 'WzcTtTH4Yf', 'lRotation\x20', 'wCAGnFhQSQ', 't\x27)\x20{\x0a\x20\x20\x20\x20', 'OCRcIqeMHh']; _0x7afa = function () { return _0xa2a37e; }; return _0x7afa(); } function createAnimationVisualEditor() { const _0x100b98 = { _0x2cdf94: 0x2f1, _0x17d614: 0xbec, _0x4a65c0: 0xae2, _0x4a942b: 0x681, _0x250608: 0x79a, _0x29ebbf: 0x5af, _0x567050: 0x6dc, _0x3ba730: 0x9f9, _0x4d12b7: 0x206, _0x14d8d9: 0xd99, _0x16e542: 0xd6a, _0x11d68b: 0x804, _0x56d718: 0x633, _0x5b1bed: 0x8ef, _0x448a3b: 0x699, _0x27f560: 0x28f, _0x3db255: 0x8ef, _0x4c4246: 0xbd2, _0x47afc4: 0x92d, _0x48afd2: 0x377, _0x2b37a3: 0x47d, _0x241703: 0x32c, _0x5d153b: 0x781, _0x4eca67: 0x64c, _0x580122: 0xa89, _0x30cc3d: 0xd0d, _0x564e48: 0xd73, _0x4314a6: 0xddb, _0x1f5618: 0x676, _0x59cb9f: 0xa8b, _0x5a4cb4: 0x654, _0x5930c1: 0xbdf, _0x18d166: 0xc14, _0x2b1162: 0xbd1, _0x9b2541: 0x907, _0x59efeb: 0x829, _0x27c73e: 0xb5b, _0x1f7ea6: 0xe33, _0xcdb40b: 0x4b7, _0x2c272d: 0x998, _0x5c9003: 0xa42, _0x22e21a: 0x4d0, _0x2de35f: 0x76a, _0x45cd59: 0xb60, _0x3875f9: 0x8ef, _0x35a808: 0x8ef, _0x150642: 0xd98, _0x20725b: 0x812, _0x209972: 0x7d7, _0x26716a: 0xbd3, _0x2bdaa2: 0xcd9, _0xa84262: 0x51e, _0x2dfc6d: 0xa74, _0x5e07b9: 0x8ef, _0x295c5e: 0x235, _0x1d765f: 0x874, _0x5ac209: 0xb62, _0x2e9f8e: 0xdcf, _0x36e416: 0x811, _0xb16bcf: 0x721, _0x5612b3: 0x5eb, _0x2f05e8: 0xb79, _0x49491b: 0x726, _0x4c82e3: 0x4bf, _0x2bd27c: 0xd3c, _0x4edd8c: 0xc0a, _0x8c6bab: 0xb40, _0x49b10e: 0x6e1, _0x49952f: 0x9e2, _0x9fd318: 0x50f, _0x2fa3f4: 0xa5c, _0x3ffb2c: 0xa47, _0x3bde0d: 0x70f, _0xb23e93: 0xb54, _0x147fa2: 0x5f1, _0x58fa2d: 0x98a, _0x50fd3e: 0xba8, _0x2e8391: 0x806, _0x514379: 0x79d, _0x5d6532: 0x8ef, _0x2187aa: 0x229, _0x25ec48: 0x8f7, _0xd28a90: 0x5a5, _0x54b87f: 0xd33, _0x80c55: 0x74b, _0x25aa75: 0x714, _0x3084c7: 0x597, _0x4605d5: 0x4a3, _0x27498e: 0x895, _0x244a9b: 0x8d2, _0x39af90: 0x1cf, _0x17064d: 0xe06, _0x5a27fd: 0x459, _0x5b221a: 0xade, _0x1e4c86: 0xa19, _0xdfcb37: 0x1cf, _0x1930c4: 0xd99, _0x45c142: 0x8a3, _0x59d621: 0xb0c, _0x44cbb5: 0xbc2, _0x78ed93: 0x767, _0x436461: 0x936, _0x4012ae: 0x2f9, _0x4f4517: 0xc2f, _0xb99f10: 0x1ca, _0x534ed6: 0x56b, _0x356c51: 0x9d1, _0x51f09a: 0x445, _0x1cd622: 0xc83, _0x3861f4: 0xd44, _0x1ff1fe: 0x350, _0xca2b43: 0xc6d, _0x457216: 0x7e5, _0x11d51f: 0x531, _0x448e8f: 0x5e6, _0x184c04: 0xdfa, _0xfc68c5: 0x8ef, _0x38d8a8: 0x7d6, _0x574d2a: 0x92d, _0x338db8: 0xbd1, _0x1d55b5: 0xded, _0x588b5c: 0x79f, _0x4f7472: 0x373, _0x3ae48d: 0x695, _0x448882: 0xc11, _0x28795a: 0x62a, _0x6c04d: 0x6d8, _0x243fbd: 0x389, _0x1102e3: 0xb24, _0x25c59c: 0xc6b, _0x3f0183: 0x5db, _0x11f7f9: 0x437, _0x52e0ea: 0x9f0, _0x5edfe7: 0xbef, _0x5f4cf7: 0x2f2, _0x6dc26d: 0x295, _0x1b82e7: 0xa23, _0x4fbeb: 0xe3c, _0x1e3dea: 0x9fb, _0x29642c: 0x70c, _0x5c36ca: 0x8ef, _0x36df11: 0xb75, _0x51b057: 0x7c6, _0x42c454: 0x572, _0x57f139: 0x36b, _0x4c2a35: 0x8ef, _0x14b99b: 0x320, _0x1aa59e: 0xcc2, _0x1584e8: 0xa99, _0x56169e: 0xce5, _0x1456e1: 0x667, _0x3ebde4: 0xcaa, _0x4fed0e: 0x513, _0x86a15d: 0xd84, _0x3281d2: 0x8ef, _0xe2ead5: 0xc0f, _0x19966f: 0x9a1, _0x2cae4c: 0x1f7, _0x56b0ff: 0x93f, _0x23256b: 0xb34, _0x172fff: 0xd8f, _0x2f18ee: 0xca5, _0x300f4d: 0xa80, _0x2e53e5: 0xb63, _0x23380b: 0x341, _0x138d35: 0x99f, _0x33f03a: 0x81c, _0xe0041c: 0xaf2, _0x362718: 0x3fa, _0x328915: 0xc84, _0x1d4696: 0xa19, _0x19d77d: 0x1de, _0x17cb52: 0x5f2, _0x27e55a: 0xb39, _0x29d60a: 0xa43, _0x10b76d: 0x896, _0x3cff47: 0x921, _0x418ed7: 0xc91, _0x291ddc: 0xa30, _0x51bb22: 0xbac, _0x51fbfb: 0xb45, _0x3aadb5: 0xaad, _0x4d9f73: 0x652, _0x14100f: 0x1d0, _0x268df5: 0x8cf, _0x7d84f7: 0x853, _0x2c3e13: 0x24d, _0x22f263: 0x2ca, _0x29b836: 0x626, _0x11827f: 0x4bf, _0x26c525: 0x88c, _0x287225: 0xdee, _0x2834f2: 0xb3a, _0x2b57a5: 0x8dd, _0x2a35e4: 0x4b4, _0x5dadb0: 0xc15, _0x2d3afa: 0x461, _0x37cd58: 0xace, _0x810e26: 0x84f, _0x3a8422: 0x7b9, _0x5f250f: 0x4fa, _0x35d63b: 0xaeb, _0x36e4a9: 0x3b9, _0x62025f: 0x1f1, _0x1576f1: 0x21a, _0x15c815: 0xa6f, _0x2cc8c4: 0xdfc, _0x1abbde: 0x1d4, _0x111021: 0x413, _0x2bea37: 0xa64, _0x1e0abc: 0x9ad, _0x547420: 0x6d3, _0x278b5f: 0x866, _0x281364: 0xc53, _0x28c858: 0x2b3, _0xee0274: 0x2c0, _0x5be986: 0x745, _0x4b39d2: 0x6ef, _0xf797fb: 0x262, _0x30e3f5: 0xc22, _0x364282: 0x693, _0x119651: 0x912, _0x3af5c9: 0x374, _0x17ea32: 0x8e6, _0x3970f8: 0x733, _0x52f891: 0x75a, _0x5da3fe: 0x928, _0x173820: 0x9bc, _0x8eaace: 0x465, _0x16f66a: 0x72a, _0x174a99: 0xb85, _0x3713f3: 0x7c0, _0x2a16ce: 0xd93, _0x3a23da: 0x45c, _0x78af33: 0x56a, _0x5e6f1a: 0x5f3, _0x18e14f: 0x796, _0x266b1: 0xdab, _0x2179bf: 0x7b6, _0x106571: 0x7ab, _0xb4e978: 0x8ec, _0x2ccf26: 0xc74, _0x48d8c1: 0x8cc, _0x136f65: 0x3ec, _0x4df6f4: 0xc96, _0x3f457c: 0xb80, _0x15950e: 0xb74, _0x5733cd: 0xd80, _0x11baff: 0x7b0, _0x30f214: 0x272, _0x186d4b: 0x58a, _0x413024: 0xe05, _0x14c1c0: 0xb88, _0x328435: 0xa51, _0x2e4d75: 0x8c1, _0x3eb9b9: 0xccd, _0x17da64: 0x245, _0x1d2c74: 0x283, _0x564c6e: 0x283, _0x51cc52: 0x283, _0x4ac747: 0x283, _0x26635a: 0xa18, _0x1fe890: 0x4ae, _0x51467f: 0xbbb, _0x5e5244: 0x953, _0x52ecc6: 0x55b, _0x52d78b: 0xce1, _0x526f68: 0xdf6, _0x504e11: 0xafb, _0x52df5b: 0x23b, _0x474095: 0xc8e, _0x37b09c: 0x382, _0x51e0b6: 0x851, _0x175a7e: 0x97e, _0x30ad43: 0xa3b, _0x53caef: 0xde9, _0xe9f38c: 0x651, _0x22dbb9: 0x9f8, _0x45bc2f: 0x22a, _0x13a011: 0xb01, _0x2768d7: 0xdc8, _0x283688: 0xc3e, _0x1711d5: 0x6ba, _0x4e67de: 0x2de, _0x479452: 0x6ad, _0x251cc1: 0x3a1, _0x2f9b93: 0x401, _0x16b793: 0xbb9, _0x55987a: 0x2f5, _0x52f457: 0xe20, _0x334ee8: 0x3ce, _0x18703c: 0x5ae, _0x2da79a: 0x6b6, _0x5ee82d: 0x48c, _0x226004: 0xbc4, _0x17749a: 0x4a2, _0x18c0e6: 0xb03, _0x179294: 0x29b, _0x26e78b: 0x39b, _0x3466f4: 0xa7a, _0x349860: 0xe13, _0x2f6113: 0xcd6, _0x152d09: 0x25e, _0x98bbe: 0x6e2, _0x15aa5b: 0xa9b, _0x4abcc9: 0x1b2, _0x123a3a: 0x306, _0x3bc3c1: 0x9a3, _0x1f31af: 0x287, _0x4486c6: 0xbfb, _0x466858: 0x4ee, _0x1a24ed: 0x466, _0x5cf09f: 0x793, _0x68d197: 0x61a, _0x138387: 0xa49, _0x14e9d6: 0x7fd, _0x26814d: 0x1da, _0x4c27d7: 0x1c4, _0x258ca8: 0x8bf, _0x232f42: 0xca6, _0xf7cd47: 0xdd9, _0x8b8886: 0xe1e, _0xbd703c: 0x8da, _0x4f82ad: 0xdcd, _0xa4d230: 0xb67, _0x361cde: 0xcef, _0x32623b: 0xceb, _0x487bc: 0x4de, _0xef0efb: 0xd9e, _0x356604: 0xbce, _0x39ecd1: 0xb35, _0x3ae155: 0xc98, _0x4f49a0: 0x5a9, _0x4e34b2: 0x6a8, _0x4eb1fc: 0xd83, _0x2022da: 0x903, _0x589ed8: 0xbda, _0x3906d1: 0xc24, _0x793e49: 0x62d, _0x17d4e6: 0x8d9, _0x37ff5c: 0xb11, _0x3b5e8e: 0x5dd, _0x1c4ec5: 0x816, _0x22c944: 0x9f3, _0x5def4d: 0xa69, _0xd8a9c5: 0x66a, _0xe252f4: 0x30d, _0x160bc6: 0x77c, _0x4454d9: 0xd29, _0x56ad40: 0xd4c, _0x3dffb2: 0x5e0, _0x11d70f: 0xd92, _0xe7fd04: 0xd0e, _0xa3ab5b: 0x680, _0x4225ab: 0xc46, _0xc1aa6: 0xa08, _0x70a6b1: 0x3c9, _0x17c980: 0xc8a, _0x830444: 0x2f7, _0x520fee: 0x49d, _0x4d239c: 0x334, _0x3d9cb6: 0xa8e, _0x3f126b: 0xac8, _0x1f7967: 0x502, _0x4850ce: 0x3c7, _0x1ad3fa: 0x664, _0x117921: 0x8a0, _0x8c3032: 0xdaf, _0x10bceb: 0x4b6, _0x1f62b4: 0xcfd, _0x4c34e8: 0x6fb, _0xdb44a2: 0x539, _0x434484: 0xb02, _0x4bee86: 0x443, _0x3a76a5: 0x9c5, _0x233820: 0x786, _0x2dff35: 0x860, _0x2b0d09: 0xbf9, _0x5b6275: 0xc18, _0x21bd35: 0xbdb, _0x145bf4: 0xb77, _0x1f8f60: 0x2b5, _0x1c0c50: 0x810, _0x3868a7: 0x86f, _0x1c945c: 0x99a, _0x2ae62c: 0xb58, _0x1124bc: 0x2eb, _0x12a399: 0x80d, _0x17153c: 0xaa4, _0xaad792: 0x44d, _0x1f8db4: 0xbe0, _0x51e71f: 0x937, _0x744af8: 0x33d, _0x4d8939: 0x1d9, _0x3d26b3: 0xc01, _0x31a36a: 0xcca, _0x3727b3: 0x4b0, _0x596f5b: 0x6f8, _0x487ae9: 0x344, _0x499526: 0xb07, _0x44663b: 0x917, _0x441ca9: 0x717, _0x1cf61f: 0x3ad, _0x122759: 0x9d0, _0x5b0bf6: 0x238, _0x1f805e: 0xdc5, _0xba68d4: 0xdf8, _0x3a5829: 0xad1, _0x14de9a: 0x25d, _0x4d91f8: 0x74d, _0x3b5bfe: 0x2d9, _0x147016: 0xd22, _0x102d5d: 0xb92, _0x475d84: 0x7d4, _0x550a6f: 0x9da, _0xb93c4e: 0x49e, _0x163e8e: 0x31b, _0x134101: 0x4f1, _0x33aa40: 0x1ff, _0x59a53e: 0x5c3, _0x39f279: 0xc29, _0x171614: 0x944, _0x20b102: 0x5c7, _0xbe47f8: 0x6ce, _0x2431ef: 0x1cc, _0x11dfeb: 0xd41, _0x4ec3ef: 0x846, _0x4d7e3f: 0xd21, _0x399d34: 0x42f, _0x32f24a: 0x891, _0x3cb306: 0x2ed, _0xa3c9eb: 0xac7, _0x5b7783: 0x98d, _0x5ea37a: 0x967, _0x23d84a: 0x24c, _0x5e7476: 0x247, _0x373740: 0x23e, _0xd0c77e: 0x803, _0x3e2025: 0xcde, _0x42c5bf: 0x486, _0x29793e: 0x61d, _0x2f02f5: 0xd63, _0x1701a0: 0xd00, _0x27ce8b: 0xc45, _0x8c105b: 0xc1f, _0x19b73e: 0xc57, _0x3e410c: 0xa10, _0x2b72ff: 0x6f7, _0x33a3c9: 0x434, _0x3d69fd: 0x778, _0x39e82a: 0xb94, _0x48d9d4: 0xa7d, _0x57454a: 0xb4b, _0xfcb420: 0x4c4, _0x55c1da: 0x660, _0x357593: 0x7bf, _0x19b029: 0x202, _0x1a40d3: 0xb9d, _0x1dae28: 0x587, _0x22ca45: 0x892, _0x17ca43: 0x2d7, _0x3282aa: 0x3a3, _0x48d57b: 0x3e2, _0x2a1142: 0x777, _0x569ca7: 0x746, _0x2d494f: 0x7ca, _0x44f1e0: 0x8e1, _0x511f74: 0x3bc, _0x276f5e: 0xae8, _0x306a74: 0xb48, _0x580661: 0x567, _0x2a7b55: 0x58f, _0x5e13b4: 0x97d, _0x2ce8dd: 0xd6c, _0x106d9a: 0x31c, _0xa827c8: 0xbf1, _0x4b895d: 0x3ee, _0x15d550: 0x548, _0x19dbed: 0x9d4, _0x169ecc: 0x754, _0x4de645: 0x4e3, _0x152b95: 0xd2d, _0x2e3588: 0x9e1, _0x5f2bb9: 0x737, _0x5c8168: 0x60d, _0x33ba07: 0x52e, _0x82ec41: 0x376, _0x2f2929: 0x429, _0x3dda52: 0xc09, _0x69a9b3: 0x950, _0x46990c: 0x36a, _0x4e697a: 0xa5d, _0x596d81: 0xaca, _0x7ef204: 0xd17, _0x2f8ce7: 0xca4, _0x465828: 0xda0, _0x3f6507: 0x421, _0x5ef510: 0x7f0, _0xf70033: 0x8eb, _0x151443: 0x760, _0x3d58f2: 0x91f, _0x5f318d: 0x1c1, _0x46e9aa: 0x9bb, _0x3de8a2: 0x40b, _0x17cd49: 0x420, _0x27df3e: 0xb18, _0xa5cb0d: 0x1ec, _0x1538f2: 0x95b, _0x30360a: 0x96c, _0x49a2b1: 0x67c, _0x3aed18: 0xd95, _0x4b380f: 0xcec, _0x31981c: 0x395, _0x270c24: 0x881, _0x14ce5d: 0x91b, _0x31eebc: 0xdf7, _0x4046a1: 0xc8b, _0x300f88: 0x877, _0x3c3ab5: 0x4eb, _0x1a7ca7: 0xcf4, _0x4e8f17: 0x968, _0x476492: 0x5ab, _0x365ea6: 0x41f, _0x35d709: 0x634, _0x4d71ff: 0xad0, _0x25adb4: 0x83b, _0x401dd3: 0xa21, _0x2bcdd3: 0x7cc, _0x51c4ca: 0x969, _0x554c7d: 0xe45, _0x1be4e7: 0x85d, _0x178a34: 0x64e, _0x3f7391: 0x6c3, _0x540777: 0x52a, _0x1b45bc: 0xe1f, _0x49f10c: 0xa3e, _0x120c1e: 0xe18, _0x808612: 0x546, _0x4e9c24: 0x5da, _0xd681d5: 0x8a2, _0x5c8757: 0x582, _0x4b07c3: 0x5ba, _0x23434d: 0x6bb, _0x38d438: 0x98f, _0x2bfd75: 0xe24, _0x4b1c48: 0x435, _0x41a4cb: 0xb49, _0x14eaa5: 0x3d0, _0x35d689: 0x385, _0x47c355: 0x6c4, _0xaecf95: 0xce6, _0x3de9f7: 0x832, _0x43ea8a: 0x2ac, _0x5315cc: 0x9fc, _0x256dc3: 0x5ea, _0x426d31: 0x312, _0x450954: 0xce0, _0x4780b7: 0xe1b, _0x1fba73: 0x554, _0x420b8d: 0x1c2, _0x18add2: 0xabf, _0x4eb264: 0x2c9, _0x3f42b5: 0xba3, _0x222b16: 0xadd, _0x1848b3: 0x241, _0x502e6e: 0x30b, _0xc9bfff: 0x9e7, _0x50f2d4: 0x9b5, _0x207ae1: 0xc3a, _0x13cc09: 0xb95, _0x3ca537: 0x65d, _0x136578: 0x351, _0x3f8313: 0x58e, _0x1869f8: 0x487, _0x548ffd: 0xcba, _0x529d6b: 0x432, _0x92d069: 0xada, _0x1cf6b0: 0xc16, _0x5eaf74: 0x7f4, _0x2db3b0: 0x577, _0x4b9793: 0xb5f, _0x15dfdb: 0xd8d, _0x115529: 0x38c, _0x114ddc: 0x2c5, _0x127ef1: 0x595, _0x342e62: 0xb69, _0x23f398: 0xb1b, _0x30841d: 0xaf6, _0x5d48d4: 0xe38, _0x30dceb: 0x4c3, _0x568602: 0x300, _0x352add: 0xd88, _0x5bec55: 0x527, _0x1108c6: 0x268, _0x9068f6: 0xb2f, _0x1fe6c1: 0xb0b, _0x486903: 0x55d, _0x9f427: 0x1df, _0x3861bc: 0x35d, _0x1330af: 0xb19, _0x2bef1f: 0xc50, _0x3a68e8: 0x593, _0x2ebd92: 0x86c, _0x5d8461: 0xa52, _0x46c5fc: 0xde2, _0xf7b2ec: 0xa71, _0x2591c2: 0xe2f, _0x21a888: 0x218, _0x504f1f: 0x442, _0x481c0b: 0x58d, _0x22fefa: 0x75f, _0x55c018: 0x6bd, _0x4a6079: 0x7cb, _0x11e638: 0xa37, _0x521281: 0xd5f, _0x32e931: 0x1e1, _0x527671: 0x9b7, _0x12ad33: 0x931, _0x8e4c4b: 0x406, _0x1559f4: 0x815, _0x5f56df: 0x833, _0x50eb15: 0xd31, _0x172b18: 0x7e2, _0x593bbd: 0x6f6, _0x1f0b6a: 0x819, _0x55c4d1: 0x63c, _0x987977: 0x702, _0x170b15: 0x1f9, _0x480a50: 0x61e, _0x551134: 0x939, _0x272e2c: 0xae7, _0x4f8abb: 0x22f, _0x1c31ff: 0x506, _0x2ceb6a: 0x2d0, _0x26d104: 0x99c, _0x1dc066: 0xa02, _0x378824: 0x38f, _0x13e1c3: 0x547, _0x1d9880: 0x88a, _0x407aee: 0xc5b, _0x2629c7: 0x224, _0x302eea: 0x33b, _0x401cb8: 0xb08, _0x20998f: 0x3fe, _0x281187: 0x9b3, _0x226827: 0x707, _0x5af33a: 0xd85, _0x3e07e9: 0x80e, _0x58ccd1: 0xa48, _0x1a8eab: 0x719, _0x49de40: 0xa56, _0x3aab45: 0x81b, _0x76800d: 0x2fb, _0x506260: 0xa8a, _0x5e94ac: 0x957, _0x1640cc: 0x688, _0x25d108: 0xa3a, _0x4117d1: 0x865, _0x30ed92: 0x9ca, _0x5ada19: 0x614, _0x10fb47: 0xa36, _0x333578: 0x3db, _0x416252: 0xbb8, _0x2f4c8d: 0x499, _0x2e0044: 0x8e8, _0x3f2b28: 0xd52, _0x5b1653: 0x788, _0x211efc: 0x40d, _0x35877e: 0x4e7, _0x32b62c: 0x84c, _0x98a607: 0x7a8, _0xb96740: 0x9c3, _0x442a82: 0xd81, _0x4b0fc7: 0x604, _0x3e82ec: 0xdd3, _0x4e9426: 0xd39, _0x1f087c: 0x571, _0x844f5e: 0xd7f, _0x10216a: 0xa0f, _0x1020d2: 0x387, _0x1088c3: 0x7d0, _0x23f15c: 0x2f6, _0x39d272: 0x264, _0x1e863a: 0x69b, _0xc46a90: 0x5e4, _0x1ac451: 0xc06, _0x3ef594: 0x54a, _0x547fc1: 0x9dd, _0xb8f2e6: 0x7c7, _0x2d2ab2: 0x22b, _0x37ef53: 0x39a, _0x287afd: 0x8e0, _0x457589: 0xa09, _0x25f26d: 0xd79, _0x5cfe7e: 0xe28, _0x7622d: 0x86e, _0x42fac8: 0x34f, _0x5e4e05: 0xb32, _0x11d4d0: 0xd0b, _0xbe9cae: 0x5e5, _0x26c370: 0x8b4, _0x5a2e3f: 0xab7, _0xbb2826: 0xb61, _0xaba8fb: 0xdc3, _0x1dc4ca: 0xcac, _0x3d6553: 0x658, _0x4cea37: 0x5ca, _0x497f05: 0xdca, _0x3b2303: 0x467, _0x4c412c: 0x4d9, _0x265631: 0xd74, _0x350e6f: 0xc76, _0x578a5f: 0xae1, _0x45ba45: 0x8ba, _0x4d2bfc: 0x91e, _0x3676d6: 0xa4f, _0x5879a2: 0xd97, _0x3b852e: 0x44c, _0x25cf23: 0x8fc, _0x4a5c04: 0x3f9, _0x591fdd: 0x732, _0x14c98b: 0x65c, _0x40c5de: 0x3c6, _0x42d0be: 0xa93, _0x358cf8: 0xa87, _0x3f4741: 0x92e, _0x53f51f: 0xe2c, _0x56a7c5: 0x38d, _0xefc666: 0xd36, _0x17ad93: 0x766, _0x394064: 0x6b2, _0x152480: 0x7ce, _0x3088ee: 0xdfb, _0x29974e: 0xbfa, _0x25039e: 0x963, _0x5f2413: 0xcbf, _0x4f9960: 0x538, _0x4f8d0c: 0x557, _0x30bfb0: 0x817, _0x217a04: 0xcc7, _0x42098a: 0x8fb, _0x47d9e8: 0x8f2, _0xbd297a: 0x6ec, _0x2c2f66: 0x2a6, _0x20702d: 0x669, _0x1e8a47: 0x613, _0x1619cf: 0x4a8, _0x4b137f: 0xc05, _0xb5bf44: 0x7f9, _0x1defbd: 0x77b, _0x4d1d90: 0x3fd, _0x1569bb: 0x8c2, _0x3fa5e9: 0x510, _0xcc47a6: 0xb44, _0x3c9e0d: 0x7b1, _0x483b56: 0xbb5, _0x477162: 0x5f4, _0x250935: 0xc19, _0x178a7d: 0x33e, _0x129c2e: 0x6e4, _0x9395e: 0x8ca, _0x3fe1bd: 0x21e, _0xd61bbf: 0xd90, _0x305d11: 0xcf9, _0x2445e6: 0x30f, _0x3f5a61: 0xd53, _0x46069d: 0xb46, _0x2c298b: 0xe2b, _0x18f987: 0x240, _0x5de690: 0x6d7, _0x304f79: 0x417, _0x4a8376: 0x498, _0x3ce335: 0x3e5, _0x1dc10e: 0xb3e, _0x24957e: 0x57a, _0x2e7cba: 0x83f, _0x5426df: 0x959, _0x3086b3: 0xb9b, _0x2892c9: 0x4ca, _0x4e8f19: 0x368, _0x4259ad: 0x6d6, _0x4f6cdb: 0x4ef, _0x3b2cc4: 0x259, _0x123f35: 0x5d2, _0x277812: 0xdd0, _0x2a586a: 0xa5b, _0x539426: 0x2f4, _0x2a7953: 0x4bc, _0x5c4548: 0xd27, _0x184bd4: 0xd2a, _0x462f33: 0xcfc, _0x2330bb: 0x426, _0x26864a: 0x758, _0x35a693: 0x919, _0x4689e0: 0xbe4, _0x283b33: 0xc70, _0x23c6f6: 0x735, _0x4e3638: 0x8a9, _0x332385: 0xb4f, _0x53e525: 0x929, _0x14d617: 0x42a, _0x5e265d: 0xa62, _0x4c8f8d: 0xe2d, _0x5da04c: 0x90a, _0x322223: 0x4bd, _0x38a804: 0x85e, _0x119227: 0x23d, _0x26b12f: 0xb04, _0x313487: 0x96e, _0x4deb67: 0x8df, _0x1a642b: 0xab8, _0x4d1c88: 0x89a, _0x12c88a: 0x297, _0x299208: 0xbb7, _0x1c2f22: 0x91c, _0x48dd03: 0x26d, _0x53b01e: 0x2ea, _0x5dbe9d: 0xd5b, _0x22b3ee: 0x5cd, _0x227b16: 0xa1c, _0xf513be: 0xde6, _0x53deb6: 0xb6b, _0x247533: 0x59c, _0x48457: 0xb99, _0x28bcef: 0xa1e, _0xdc1390: 0x9a2, _0x56322a: 0x589, _0x1d23fd: 0x477, _0x2a71f5: 0xe17, _0x214703: 0xd14, _0x4b12aa: 0xc72, _0x310ac5: 0x43c, _0xe4c0ca: 0x291, _0x2871cc: 0x616, _0x21cfe6: 0x71a, _0x14b36e: 0xd42, _0x5e9587: 0x791, _0x51a790: 0x4ad, _0x32bfb5: 0x5ec, _0x5eb3b0: 0x52d, _0x418b63: 0x6f2, _0x2dcb91: 0x3c1, _0xf89f59: 0x5d5, _0x2f3fdc: 0x46f, _0x9aa050: 0x496, _0x15fdd8: 0x683, _0x3c7a3f: 0xaa7, _0x4784dc: 0x727, _0x5e5846: 0x288, _0x39dd3d: 0xa72, _0xcc89b3: 0x9ab, _0x74c58f: 0x32b, _0x3fd915: 0x35a, _0x11d2d5: 0x81f, _0x4f75df: 0x26c, _0x4643d6: 0xb70, _0x1d3a0a: 0x214, _0x4c876b: 0x6cc, _0x1499bc: 0x59d, _0x48a1c5: 0x7a4, _0x5c23c6: 0xa29, _0x3aa1c6: 0x1e6, _0x101f8e: 0x260, _0x11a487: 0x2c8, _0x1b3be7: 0x51a, _0x17e4af: 0x2cd, _0x57852a: 0x331, _0x4fcd9a: 0x908, _0x11945b: 0x7e6, _0xb2d462: 0x821, _0x3a4c24: 0x280, _0x5ad87c: 0x69d, _0x3cd48c: 0x65b, _0xa082c9: 0x364, _0x57040d: 0x1b1, _0x15c0b5: 0xc08, _0x3ce68b: 0x8be, _0x1621fb: 0x6ed, _0x396074: 0xb33, _0x3b72e7: 0x71c, _0x8a925e: 0x204, _0x15a1a8: 0xaf9, _0x3ca623: 0x5cc, _0x171aca: 0x722, _0x628f37: 0x7d2, _0x887315: 0x5fb, _0x529a1f: 0x2d3, _0x4e522c: 0x1cd, _0x1d1d68: 0xac0, _0x6318b0: 0x352, _0x43df97: 0x378, _0x3290b7: 0x844, _0x4ae75e: 0x261, _0x3f3cd4: 0xd46, _0x2fc7b9: 0xaa2, _0x3e330c: 0x3dd, _0x306540: 0x718, _0x249f4f: 0x1ce, _0xe0fa6: 0x67a, _0x1541fd: 0x8c9, _0x3a5aa2: 0x9c4, _0x174f0c: 0xd16, _0x20be2d: 0x58c, _0x533aff: 0x36c, _0x19823e: 0x887, _0x3e9541: 0xa55, _0x2bf650: 0x1af, _0x414d0c: 0x9b2, _0x291c62: 0x961, _0x5b42fa: 0xe09, _0x296bc8: 0x3f3, _0x4ec18c: 0x88f, _0x595137: 0xb1d, _0x308e9c: 0xbba, _0x255397: 0xbc7, _0x512070: 0x5bd, _0x1f8827: 0x2be, _0x2d605a: 0xda3, _0x1ef894: 0x602, _0x3e0248: 0x40e, _0x2cfd4c: 0x78e, _0x2db2a6: 0x222, _0x14294b: 0xbfe, _0x14389d: 0xaf1, _0x14a468: 0x5e3, _0x44a05f: 0x4b9, _0x118fd4: 0x715, _0x20c7c6: 0x7a0, _0x337589: 0xbe3, _0x5a1243: 0x1ee, _0x1f4861: 0xdd6, _0x301b99: 0x3d3, _0x5e6138: 0xb59, _0x5786f2: 0xced, _0x57b269: 0x49b, _0x3ec4f5: 0x46e, _0xbc80: 0x26b, _0x5e060c: 0x43f, _0x4db193: 0xdd7, _0x4fa862: 0xb21, _0x23bf6c: 0x91d, _0x4e7108: 0xa4a, _0x4ed0e3: 0x208, _0x57058a: 0x53d, _0x27e89c: 0x5b1, _0x4767cb: 0xad7, _0x1c60ec: 0x2fe, _0x21eaf5: 0xbdd, _0xdb3e2b: 0x2d8, _0x2be183: 0xcea, _0x90825c: 0x438, _0x1fedbb: 0xb15, _0x4298ad: 0xbcd, _0x515373: 0xbb6, _0x3fa34b: 0x59f, _0x1bf4d0: 0x92f, _0x350157: 0x8d4, _0xa842b2: 0xbaa, _0x366502: 0x4d7, _0x4fee27: 0xe0a, _0x2c05f7: 0xda5, _0x45dbc2: 0x920, _0x3d0997: 0xa96, _0x3595a2: 0x336, _0x19d73a: 0x9d2, _0x2233f6: 0xa5a, _0x5c7125: 0xd9b, _0x2d0a88: 0x818, _0x2eefab: 0x72b, _0x572117: 0x74a, _0x496031: 0x6e0, _0x11a334: 0xc7c, _0x19248f: 0x581, _0x54368a: 0x98c, _0x573039: 0x644, _0x3b1310: 0x5c6, _0x582c18: 0x1b8, _0x1f6e43: 0xa24, _0x3fa9e3: 0x7fa, _0x1a0d12: 0x655, _0x37754e: 0x31f, _0x18ff4b: 0x923, _0x57bc0d: 0x76f, _0x4987b8: 0xc37, _0x38cc6a: 0x43e, _0x14ac01: 0xc93, _0x14fc76: 0xcb6, _0xac9c2d: 0x7eb, _0xaf03a2: 0x6e9, _0x1fb50c: 0xcae, _0x50fbed: 0xd50, _0x3e1bee: 0x391, _0x228190: 0xd94, _0x2b2c4d: 0x6e9, _0x3f6372: 0x3cb, _0x1d6066: 0x8c7, _0x506401: 0x987, _0x1ae37c: 0x6b9, _0x51b4d0: 0x356, _0x4441ca: 0x327, _0x1b92ca: 0xab0, _0x147b92: 0x7fa, _0x1b2bbe: 0x86a, _0x60a487: 0xd99, _0x5d0c5d: 0x4b1, _0x39f7b4: 0xd50, _0x3cb252: 0x78d, _0xc6d4c2: 0xbeb, _0x526053: 0x8bb, _0x320422: 0xd20, _0x44be70: 0x6f9, _0x2fb522: 0x4e4, _0x5b809f: 0xa33, _0x48ac87: 0x511, _0x10067c: 0xaef, _0x22fff7: 0xd28, _0x19a163: 0x4a0, _0x1e323c: 0xe37, _0x222dc1: 0x474, _0x1348d5: 0xaf5, _0x1f9563: 0x849, _0x239018: 0xa03, _0x24b63c: 0x9cc, _0x385a3c: 0x456, _0xecea8e: 0x3cf, _0x4f9a1b: 0x1e4, _0x4058a1: 0x88b, _0x4b36da: 0xbc1, _0x5afad3: 0xd66, _0x16ff34: 0xcdf, _0x1e1092: 0x47e, _0x1d48ec: 0x284, _0x403703: 0x440, _0x545abf: 0x403, _0x50c3ec: 0x9df, _0xcda924: 0xdb2, _0x293ce5: 0xbbf, _0x269d05: 0xc63, _0x557c69: 0x521, _0x1e933d: 0x990, _0x565c44: 0xc2e, _0xa3b8b6: 0xafa, _0x148b3b: 0xa4c, _0x362595: 0x5b0, _0x3b9948: 0xabb, _0x580190: 0xbcf, _0x29be4c: 0x419, _0x5ddadc: 0xb0e, _0x286ec7: 0xb26, _0x579489: 0xc9e, _0xc73e6e: 0x7ed, _0x24dbc9: 0x4b3, _0x4e2acc: 0xe14, _0x212db1: 0xdb1, _0x2a3734: 0x7fa, _0x33445f: 0x609, _0x121c66: 0xcbb, _0xd12c18: 0x5a6, _0xa18f2: 0xb50, _0x5d1f7f: 0x9c2, _0x4309ec: 0x4f4, _0x15f4fe: 0x444, _0x49f123: 0x27c, _0x357085: 0x90f, _0x37a372: 0x3b8, _0x294059: 0xb8e, _0x5a2b75: 0x536, _0x8deae6: 0x66e, _0x179767: 0x756, _0x18bd06: 0xa2b, _0x31174a: 0xd7e, _0x19c36f: 0xd37, _0x52e40a: 0x2b4, _0x596e51: 0x1b6, _0x206a06: 0x739, _0x536427: 0xd5d, _0x91548d: 0x7af, _0x2a4947: 0x365, _0x3f9605: 0x918, _0x5298e6: 0xaf5, _0x1ed3f4: 0x3a6, _0x843827: 0x6dd, _0x54e746: 0x257, _0x31f270: 0xe0d, _0x23986f: 0xcdf, _0x34000e: 0xcfe, _0x423cef: 0x7f5, _0x518cc2: 0xdac, _0x3cbf7f: 0xb1a, _0x4ee18e: 0xa20, _0x12692f: 0x740, _0x397d69: 0x6e3, _0x1a903d: 0xb5d, _0x59ce8b: 0x2a7, _0x2d9947: 0x47c, _0x38955b: 0x27c, _0x2d90ab: 0x5a0, _0x42607d: 0xa41, _0x220ef1: 0x6cd, _0x17c395: 0x37c, _0x2d2a5f: 0xc5c, _0x35cb01: 0x1dd, _0x1d88b0: 0x691, _0xfb2ef: 0x51d, _0x1a1313: 0xd34, _0x63d204: 0x8ef, _0x4ed897: 0x5d4, _0x33efcc: 0x5ac, _0x3b69d0: 0x8ef, _0x366555: 0xaee, _0x188f51: 0x267, _0x415790: 0x838, _0x109e2f: 0x494, _0xd54ccb: 0x8ef, _0x435689: 0x869, _0x20aaee: 0x4ce, _0x2c9ba0: 0xbe8, _0x3f205b: 0xe1c, _0x2c50ac: 0x755, _0x411776: 0x48d, _0x14180e: 0xc8d, _0x108441: 0x87f, _0x6058ef: 0x412, _0x292397: 0xb81, _0x269e24: 0x69e, _0xafc9a6: 0xdf4, _0x48d6a0: 0xe47, _0xe6fb0b: 0x358, _0x4de104: 0x418, _0x51ccec: 0x627, _0x2b2402: 0x8ef, _0x285849: 0x8ef, _0x534f5d: 0x8ef, _0x170559: 0x1e2, _0x268dcd: 0x9b6, _0x37aff9: 0x8ef, _0x364639: 0x8ef, _0x5caad5: 0x348, _0x1945cd: 0x8ef, _0x347d6b: 0x2e5, _0x27bc83: 0x90e, _0x1928a7: 0x5e8, _0x271ee8: 0xa58, _0x1eb9d8: 0xd09, _0x438068: 0x273, _0x424a0b: 0x460, _0x48ea71: 0xc7a, _0xc4bdc2: 0x8ef, _0x25bc4f: 0xd49, _0x21d94f: 0x227, _0x20d95c: 0xc21, _0x319216: 0x9b9, _0x245be0: 0xd1f, _0xe57c64: 0x237, _0x19d2a9: 0x2e1, _0x1e3fca: 0xd99, _0x8dce09: 0x649, _0x176729: 0xa61, _0x489ebc: 0x76a, _0x378fcc: 0x95d, _0x32fca2: 0xd99, _0x3bc754: 0x8ef, _0x4f5ff9: 0x82c, _0x4f10e8: 0x28f, _0x3c3e25: 0x703, _0x376527: 0x41d, _0x4768ef: 0x4f3, _0x6a6a97: 0x885, _0x272630: 0x8ef, _0x346e7e: 0x690, _0x479688: 0x8ef, _0x45ba88: 0x4d1, _0x334b12: 0x8ef, _0x361b9a: 0x88e, _0x35991e: 0x8ef, _0x15b9c3: 0x8ef, _0x1803cc: 0x67d, _0x505001: 0xdf5, _0x211c54: 0xbd6, _0x1416d7: 0x76a, _0xabee7d: 0xd1c, _0xddfc3b: 0x8ed, _0x3bc971: 0x8ef, _0xaf1e77: 0x8ef, _0x45e576: 0xbc5, _0x2f485e: 0x973, _0x399b0f: 0x2ce, _0x4e423d: 0x8ef, _0x48d2fe: 0xe39, _0x559d3f: 0x8ef, _0x1dd59f: 0xc4b, _0x54957f: 0x6a5, _0x8f1af1: 0x8ef, _0x398f01: 0x6f3, _0x49bf92: 0xc07, _0x153e02: 0xdb9, _0x340fbe: 0x9db, _0x3d562f: 0x3bd, _0xc94023: 0x956, _0x531c26: 0x8ef, _0x5eb4e8: 0x3b6, _0x8a810c: 0x940, _0x43f7c1: 0x53a, _0x4f4d00: 0x38e, _0x157efd: 0x8ef, _0x5600c3: 0xc34, _0xa1143e: 0x3b4, _0x3e8fcd: 0x858, _0xe94e09: 0xad8, _0x15d733: 0x556, _0x5df8bb: 0x44e, _0x525440: 0x384, _0x3e8426: 0x942, _0x8946f6: 0x347, _0x1e56b3: 0x8ef, _0x3ddca1: 0xb7d, _0x217420: 0xc43, _0x2a8046: 0xc0c, _0x299a18: 0x7b7, _0x39bb35: 0x48d, _0x57af53: 0xb43, _0x4f1127: 0xc4d, _0x4bc671: 0x8e4, _0x362eb2: 0x82b, _0x5a087f: 0x687, _0x2b100c: 0x6b3, _0x463241: 0xa28, _0x1aada1: 0x9c7, _0x48c626: 0xb7c, _0x2cfaa6: 0xac9, _0x31b411: 0x665, _0x31c8d6: 0xabd, _0xc0ed2d: 0xdad, _0x290cf7: 0x8aa, _0x4d8889: 0xdb4, _0x533d17: 0xd56, _0x3c4cac: 0x6b8, _0x5da3d8: 0x780, _0x229740: 0x50f, _0x5b55af: 0xd99, _0x414170: 0x700, _0x31942b: 0x8ef, _0x5a4560: 0xe3b, _0x486e46: 0xaab, _0x4f7639: 0x8ef, _0x301f38: 0xc43, _0x18088a: 0x9ae, _0x229377: 0x8ef, _0x5690f8: 0x8ef, _0x103549: 0xbac, _0x55d4a4: 0x2c3, _0x1d2e44: 0x8ef, _0x4caa04: 0x4e5, _0x13612c: 0x2ee, _0xd94836: 0x27b, _0x40680f: 0xc20, _0x4cbe56: 0xa9c, _0x5e6ba1: 0x1f0, _0x2b0177: 0xda8, _0x5dc72c: 0x2b0, _0x42a593: 0x7e7, _0x31ddb5: 0x5ce, _0x323ca5: 0x5f5, _0xbf1295: 0x8ef, _0x53ac05: 0x8ef, _0x5c3161: 0x8ef, _0x1336f6: 0x804, _0x2f3cb7: 0x8aa, _0x52b058: 0x8ad, _0x338c1b: 0xd99, _0x3d0ec4: 0xb14, _0x5dd46f: 0x9c9, _0x2c80ef: 0x82e, _0x59b3c0: 0x9e8, _0x849343: 0xb13, _0x4f9ba9: 0x72e, _0x4d0591: 0x8ef, _0x19241c: 0x930, _0x6a883d: 0x8ef, _0x24d0a3: 0x549, _0x2fc476: 0x479, _0x4d9df0: 0x48d, _0x1bfbf6: 0x39c, _0x1d99c4: 0xb3c, _0x4b9ee3: 0x7f6, _0x57288c: 0x64f, _0x37d6c0: 0x834, _0x5363ba: 0x6bf, _0xb8314a: 0x549, _0x1dfaca: 0xa66, _0x931eb6: 0xe32, _0x11e29b: 0xab2, _0x7b2df5: 0x76a, _0x1cee80: 0x4be, _0xf2d8f1: 0xd9d, _0x3ada6c: 0x388, _0x3b121a: 0x54b, _0x4aeeb3: 0x2e9, _0x22c3cf: 0xe2a, _0x5c559c: 0x61b, _0x416ef3: 0x99e, _0x4ed05a: 0x45a, _0x114ce2: 0x1eb, _0x153767: 0x9be, _0x4bacc4: 0xddf, _0x54ee18: 0x3b5, _0x22d6db: 0x913, _0x4e9992: 0x848, _0x347718: 0x276, _0xa59d32: 0xc2b, _0x23ba8c: 0x755, _0xb6d6c8: 0x85c, _0x5665cb: 0x43b, _0x554514: 0x798, _0x438157: 0x834, _0x50d8cc: 0x8ef, _0x440199: 0x8ef, _0x4126f1: 0x8ef, _0xc66be9: 0xb5b, _0x788570: 0x8ef, _0x1d2c25: 0xd34, _0x1b46c4: 0x20b, _0x4eaa2b: 0x8ef, _0x39fd49: 0x620, _0x4dd10f: 0x4c2, _0x5a05f0: 0x653, _0x4c1116: 0x504, _0x3ea81e: 0xa1b, _0x599500: 0xb23, _0x14bdcd: 0xa27, _0x487100: 0x8ef, _0xf223d8: 0x847, _0x80b25c: 0xd55, _0x508c5a: 0xd99, _0x11fdaa: 0x7c5, _0x1997f2: 0xa70, _0x24ff46: 0x3c4, _0x5b6e85: 0x5ff, _0x4c12cc: 0xcd7, _0x2e26df: 0x76a, _0x38cdef: 0x418, _0xe77bd4: 0xdff, _0x3a67bb: 0x497, _0x2c4d83: 0x596, _0x2e35ea: 0x1bb, _0x538fe0: 0x8ef, _0x2051df: 0x3a5, _0x34c0c1: 0xc9d, _0x1c1716: 0xcc1, _0x176c66: 0xc4f, _0x4408e0: 0x979, _0x25a277: 0x226, _0x5efb23: 0x428, _0x345811: 0x943, _0x2d2ccc: 0x37a, _0x371ce3: 0x9ba, _0x490e3e: 0x286, _0x594841: 0x68d, _0x44538b: 0xb6d, _0x1e14c8: 0xddd, _0x4f98d7: 0x562, _0x4ff1b8: 0x4ab, _0x438bf5: 0xc79, _0x2b8069: 0x8ef, _0x28c503: 0xac4, _0x38bec7: 0x96f, _0x169f3f: 0x8ef, _0x429ff8: 0x8ef, _0x14214a: 0xd99, _0x303f16: 0xbf7, _0x38cd42: 0xd99, _0xbffd0b: 0xc58, _0x94ada6: 0x640, _0x2829de: 0x7df, _0x271014: 0xc92, _0x248aed: 0x201, _0x420cbc: 0x6ae, _0x99e6f6: 0xa91, _0x5acea4: 0x8ef, _0x4a007d: 0x8ef, _0x9ad9ba: 0x584, _0x648d99: 0x6c8, _0x2a4bb6: 0x462, _0x3b8710: 0x9ec, _0x17a2e0: 0x5a7, _0x12428e: 0x7d1, _0x490301: 0x579, _0xe2e511: 0x3a8, _0xdd36a7: 0x8e5, _0x172431: 0xc88, _0x32ca9c: 0xc12, _0x450319: 0x8ef, _0x25bd9b: 0xd48, _0xf19d91: 0x211, _0x3d8870: 0x955, _0x83ca19: 0x8ef, _0x13949e: 0xcb0, _0x5eef34: 0x828, _0xb604b: 0x8ef, _0x13f0d6: 0x1e0, _0x558799: 0x8ef, _0x2f8fe4: 0x698, _0x3b7bed: 0xd4f, _0x2a65b4: 0x267, _0x13dd3f: 0x7a2, _0x50a235: 0x8cb, _0x408b2a: 0x8ef, _0x53523: 0xc3c, _0x3ff314: 0x28f, _0x238720: 0x371, _0x17dd2a: 0xb5b, _0x2bf278: 0x659, _0x536c7f: 0x8ef, _0x5a9070: 0x53e, _0x17095c: 0xda7, _0x3efd7a: 0x8ef, _0x334ed4: 0x8ef, _0x2e44ed: 0x8ef, _0x501a32: 0x8d8, _0x43808c: 0x8ef, _0x26f392: 0x33c, _0x1695d0: 0x8ef, _0x332e86: 0x8ef, _0x1ee109: 0x8ef, _0xf1d83c: 0x8ef, _0x17d1b6: 0x8ef, _0x1cc1f5: 0xd99, _0x3cda86: 0x8ef, _0x3b1e48: 0x269, _0x4e0219: 0xb71, _0x1ad0ee: 0x37e, _0x53f0e0: 0x588, _0x3e0a94: 0x8ef, _0x38cd45: 0x439, _0x35d7a5: 0x842, _0x5651d6: 0xc66, _0x5c06f8: 0x326, _0x19b819: 0x8ef, _0x4218dc: 0x8ef, _0x1b6b51: 0x1cb, _0x253302: 0x4f9, _0x4afe3c: 0x8ef, _0x36eddf: 0x8ef, _0x5ab5f0: 0xa01, _0xb0551c: 0xa9c, _0x479354: 0x8ef, _0x34abaa: 0xbe9, _0x5a1365: 0x95a, _0x49c6d7: 0x6de, _0x586b4d: 0x73f, _0x49348f: 0xe3d, _0x11cd18: 0x255, _0x5843d3: 0x9ac, _0x54729a: 0x8ef, _0x17cf4b: 0x54e, _0x481fd8: 0xc75, _0x38de46: 0x31a, _0x5eddb5: 0x70e, _0x1c60bc: 0x8ef, _0x2b1506: 0xe10, _0x18ecf2: 0x8ef, _0x26e8f0: 0x2e7, _0x147234: 0xd99, _0x2e190b: 0x573, _0x348afd: 0x8ef, _0x378338: 0x8ef, _0x302da9: 0x878, _0x239962: 0xdf9, _0x38d931: 0x60e, _0x3f58a2: 0x8ef, _0xe26f2f: 0x8ef, _0x59f77f: 0x68e, _0x26d6c0: 0xd4e, _0x19fca6: 0x74f, _0x3b3b6e: 0x705, _0x1396e5: 0x1dc, _0x279c36: 0x28f, _0x1ba2ee: 0xb8b, _0x5e7103: 0x6e7, _0x241fed: 0x9e5, _0x4561bb: 0xcd3, _0x4fd3c5: 0xc77, _0x12ddae: 0x3e1, _0x33a546: 0x524, _0x4ba881: 0x607, _0x59200a: 0x75c, _0x36c0b6: 0x8ef, _0x3414b3: 0x54b, _0x5cf639: 0x5c2, _0x2addfd: 0x74e, _0x336844: 0x299, _0x484ff1: 0x642, _0x5d9412: 0x7a3, _0x1c8f2c: 0x50c, _0x35ae95: 0x323, _0x2d2b50: 0x993, _0x475363: 0x80f, _0x3da58d: 0x304, _0x3a41fb: 0x69e, _0x145d28: 0x8ef, _0x168330: 0x7de, _0x16a2fe: 0x92a, _0x4a5fba: 0x8ef, _0x2cabda: 0x9d5, _0x1e0ba6: 0x314, _0x478adb: 0xc28, _0x5c7550: 0x641, _0x280a32: 0x330, _0x1580bb: 0x20e, _0x3eb7cb: 0x8b6, _0x34263e: 0x517, _0x1d56ae: 0xb82, _0x4cb5f6: 0x7b5, _0x37bbfa: 0x1ed, _0x29479e: 0x1d3, _0x520588: 0xc7e, _0x1269aa: 0x2a3, _0x2d1ffd: 0x804, _0x4404d1: 0xb00, _0x160dcf: 0x4da, _0x248e7e: 0xb66, _0x1ff6c7: 0x858, _0x267e93: 0xb93, _0x3dae46: 0xd1d, _0x561702: 0x1c0, _0xd8a7f4: 0x532, _0x513dfc: 0x4cf, _0x560e9a: 0x1c8, _0x68876d: 0x405, _0x11d811: 0x446, _0x2ccb2a: 0xd51, _0x1bb5f1: 0xd25, _0x561b24: 0xb72, _0x513c1b: 0xe1a, _0x2a55dc: 0x3c2, _0x39c3cb: 0xa97, _0x20638d: 0x75e, _0x154348: 0xb16, _0x18f777: 0xc5f, _0x280a47: 0xb3f, _0x32963c: 0x246, _0x35f19c: 0xd9f, _0x2c9b87: 0x2c1, _0x557d20: 0x69c, _0x5053be: 0x27d, _0x3b0243: 0x694, _0x4947c7: 0x76a, _0x47e3bf: 0xb6e, _0x431694: 0x6ff, _0x4850db: 0x574, _0x4e3531: 0x8a6, _0xe7c637: 0xd4a, _0x1a9b1e: 0x228, _0x191be9: 0x2a9, _0x14dba5: 0xb51, _0x170421: 0x585, _0x519bc0: 0x9a9, _0x5dfd74: 0xa76, _0x3c434a: 0x900, _0x8e030a: 0x21b, _0x40f790: 0xadb, _0x340bb2: 0x35f, _0x2843cd: 0x520, _0x34c0fb: 0xc10, _0x474e30: 0xa05, _0x4ded47: 0x6aa, _0x137293: 0xe19, _0x2fd7c1: 0x8e3, _0x86042c: 0xd45, _0x20ff12: 0x971, _0x54f3fa: 0x412, _0x34e889: 0x1f3, _0x371a12: 0x1b9, _0x5e08d6: 0x86d, _0x3de545: 0x1e5, _0x57101f: 0x69f, _0x209582: 0x63a, _0x325840: 0xa7c, _0x51a6eb: 0xd7b, _0x2de905: 0xc59, _0x506bf7: 0x606, _0x5063da: 0x1e5, _0x5186ac: 0x372, _0x34277c: 0x1f2, _0x132069: 0x624, _0x5b75af: 0x82c, _0x4a8037: 0x883, _0x1c19e3: 0x6d1, _0x48108a: 0x8ef, _0x17b99e: 0x656, _0x34c8f8: 0xcd1, _0x63ed2c: 0x468, _0x6fba5d: 0xd01, _0x4af705: 0x5b5, _0x3b0b9c: 0x44f, _0x2b594d: 0x1d5, _0x341a42: 0x7fb, _0xcbb2b0: 0x997, _0x8a99d0: 0xd99, _0x4e5b3c: 0xd12, _0x7d245e: 0xe3f, _0x9ae2ef: 0xd8a, _0x538e12: 0x96a, _0x371c82: 0x248, _0x5f21e8: 0xd99, _0x59ad66: 0xdbe, _0x3f71d8: 0x5cb, _0x9076eb: 0x232, _0x1e0242: 0xba1, _0x16f81b: 0xb57, _0x39b78e: 0x533, _0xcc6c72: 0xac9, _0x36eaa2: 0x743, _0x50bf4a: 0xd72, _0x213214: 0x8ef, _0x2ae632: 0xdb5, _0x5b9075: 0xcd8, _0x1507ee: 0xc03, _0x1e0a5e: 0x8ef, _0xab610d: 0xbac, _0x33a61a: 0x8ef, _0x4338df: 0xe31, _0x1ecbe9: 0xaed, _0x338cee: 0x8c6, _0x53953b: 0x94f, _0x3d584d: 0xd99, _0x812c1c: 0x9af, _0x1cd76e: 0x8ef, _0x182cf0: 0x76a, _0xceba87: 0x8ef, _0x582876: 0x8ef, _0x75eba3: 0x503, _0x3203d1: 0x8ef, _0x30103b: 0x8ef, _0x5e427e: 0x8ef, _0x4bd922: 0xce4, _0x3a8f9a: 0xae9, _0x5dfb5a: 0xd5e, _0x536adc: 0x8ef, _0x597047: 0x63e, _0x49b17a: 0x863, _0x1a6d7a: 0x8ef, _0x4caccd: 0xaff, _0x30db32: 0x28e, _0xa65e4a: 0x8ef, _0x3f855c: 0x576, _0x3a1a01: 0x9d9, _0x521942: 0x5a1, _0x30f139: 0x3e7, _0x395f9e: 0xe3a, _0x3ea713: 0xc00, _0x592eb6: 0x3d7, _0x59f3fa: 0x543, _0x2f8737: 0xa82, _0x15d064: 0x839, _0xafde4f: 0xbf6, _0x205e5e: 0x6e6, _0x546c8f: 0xc58, _0x4d6776: 0x738, _0x3bc1fe: 0x765, _0x2c045d: 0x4a1, _0x44f8d8: 0x583, _0x3e3168: 0x6a4, _0x5ecdca: 0xb83, _0x5a4dbd: 0xd18, _0x4f9e74: 0xd61, _0xb4b7e7: 0x28a, _0xc79e8d: 0x3b4, _0x16c504: 0x292, _0x426959: 0x1f4, _0x386013: 0x8af, _0xa39b49: 0x564, _0x257ab9: 0x8ef, _0x25e640: 0xdcc, _0x5e8818: 0x8ef, _0x52622c: 0x620, _0x415164: 0xb90, _0x391402: 0x2f0, _0x5642ad: 0x789, _0x27c8b3: 0xdda, _0x22a5f7: 0x8ef, _0x1c773e: 0x250, _0x4c34af: 0x8ef, _0x4a8f89: 0x518, _0x351a98: 0x8ef, _0x41448d: 0x9f0, _0x3c5c4a: 0x8ef, _0x2c3ec4: 0x8ef, _0x2756d1: 0x78a, _0xb13cc: 0x8ef, _0x30825b: 0x8ef, _0x4ad04d: 0x26a, _0x5de449: 0x5c1, _0x27402a: 0x8ef, _0x4021ca: 0x90b, _0x34a685: 0x94d, _0x54a744: 0x8e7, _0xd5c8da: 0xd62, _0x432046: 0x863, _0x946dcf: 0x328, _0x1e06b4: 0x370, _0x3bb710: 0x2df, _0xf4b097: 0x647, _0x5a23a6: 0x77d, _0x542292: 0xa0c, _0x4e8ffc: 0xdb6, _0x260eb5: 0x436, _0x3ffb17: 0x3ae, _0x130418: 0x266, _0x4afc1c: 0xac2, _0x32d3f6: 0x5e1, _0x3b9995: 0x55a, _0x4e8166: 0x5e1, _0xea4c08: 0x966, _0x188eec: 0x99b, _0x3b6d67: 0x25f, _0x139f0f: 0x822, _0x157ef7: 0x8ef, _0x38de5d: 0x54b, _0x29d643: 0x795, _0x4ebf47: 0xb9e, _0x357965: 0x8ef, _0x15fce8: 0x857, _0x2bde14: 0x8ef, _0x4bf1f5: 0xa7e, _0x1f63f9: 0xc8c, _0x47cf9c: 0x6bc, _0x3a3549: 0xc73, _0x539638: 0x5e1, _0x24977a: 0x2ec, _0x3b3527: 0x3f7, _0x19d56: 0x5e1, _0x196c24: 0xa06, _0xee4d50: 0xcc9, _0x14ba21: 0x481, _0x47385d: 0x677, _0x442492: 0x643, _0x53a854: 0x8ef, _0x56e0c4: 0x342, _0x5319c8: 0x2ad, _0x2c88fc: 0x7be, _0x4db07b: 0x47f, _0x2d4135: 0xe3e, _0x3464cd: 0x441, _0x20f222: 0x4c5, _0x52370b: 0x7e9, _0x3e7929: 0x274, _0x23dede: 0x72e, _0xfebafe: 0xb4a, _0x59be9e: 0x8ef, _0x8041b: 0x8ef, _0x1c1015: 0xdf2, _0x5cd7a4: 0x340, _0x10ee45: 0xa79, _0x2b566e: 0x8ef, _0x12dfcd: 0x922, _0x28c292: 0x8ef, _0xbdac15: 0x8ef, _0xf895a5: 0xba0, _0x2a07b1: 0xc25, _0x6a2527: 0x8ef, _0x3754b4: 0x8ef, _0x224381: 0xd65, _0x14ca06: 0x8ef, _0x2527ef: 0x91a, _0x4e4c85: 0x447, _0x3bbc7b: 0x8ef, _0x33fb22: 0xd0c, _0x1f20ac: 0x349, _0x5a2277: 0x623, _0x2b140b: 0xaf4, _0x52aeaa: 0x8ef, _0x1a5c80: 0xb52, _0x1998b2: 0x32a, _0xd6cfbf: 0x8ef, _0x4a8ca2: 0x1ad, _0x1df575: 0x278, _0x2bd977: 0xb7f, _0x22b378: 0x8ef, _0x488bf5: 0x8ef, _0x542c2e: 0xc17, _0x27aa4d: 0xb1c, _0x308af4: 0x61c, _0x2c7a76: 0x3fc, _0x4f0168: 0xb53, _0x24d048: 0x8ef, _0x249942: 0x67e, _0x5eddad: 0x2d1, _0x299e1c: 0xde1, _0x9b47ec: 0x8ef, _0x4085db: 0xac1, _0x41fe74: 0xb9f, _0x54214d: 0x94c, _0x356d14: 0xa2d, _0x5c4a40: 0x670, _0x54537b: 0xdd4, _0x41c0cd: 0x8ef, _0x27fac9: 0xaed, _0x426802: 0x8ef, _0x58a681: 0x7ec, _0x2b213f: 0x367, _0x4bcae2: 0xd99, _0x20afd8: 0x3bd, _0x4e8c08: 0x875, _0x163827: 0x8ef, _0x1ecd14: 0x8ef, _0xc034c1: 0x62c, _0x57028f: 0xc65, _0x2e8c34: 0x716, _0x20a971: 0xdfe, _0x3bf24b: 0x716, _0x2a18f2: 0x771, _0x373a34: 0x8ef, _0x298e26: 0x7ea, _0x221bc7: 0xcd4, _0xf61ad9: 0xc8f }, _0x41fced = _0x4d27; if (AnimationEditorWindow && !AnimationEditorWindow['closed']) { AnimationEditorWindow['focus'](); return; } AnimationEditorWindow = window['open'](_0x41fced(_0x100b98._0x2cdf94) + 'k', '_blank', 'width=1000' + ',height=84' + '6'); if (AnimationEditorWindow) { if ('HlOJA' === 'ilzJe') return _0x930db1 = _0x2e718d, _0x15d1eb; else { AnimationEditorWindow[_0x41fced(0x205)][_0x41fced(_0x100b98._0x17d614)]('\x0a\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x41fced(_0x100b98._0x4a65c0) + _0x41fced(_0x100b98._0x4a942b) + 'itle>VFX\x20B' + 'uilder\x20Edi' + 'tor</title' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x250608) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '*\x20{\x20box-si' + 'zing:\x20bord' + _0x41fced(0x258) + 'rgin:\x200;\x20p' + _0x41fced(_0x100b98._0x29ebbf) + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20:root\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20--bg:\x20#1' + 'e3a2f;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20-' + '-surface:\x20' + '#1f1f1f;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x567050) + '-2:\x20#29292' + '9;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20--sur' + 'face-3:\x20#4' + _0x41fced(0xbc6) + _0x41fced(_0x100b98._0x3ba730) + _0x41fced(0x8ff) + 'e8e8;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4d12b7) + _0x41fced(0x4a9) + ':\x20#a9a9a9;' + _0x41fced(_0x100b98._0x14d8d9) + '\x20\x20\x20--text-' + _0x41fced(_0x100b98._0x16e542) + '5;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20--acc' + 'ent:\x20#ff98' + '00;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x277) + 'cent-soft:' + '\x20rgba(255,' + _0x41fced(0x8de) + _0x41fced(_0x100b98._0x11d68b) + '\x20\x20\x20\x20\x20--sha' + 'dow:\x200\x202px' + '\x2012px\x20rgba' + _0x41fced(0xbe6) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x70d) + _0x41fced(_0x100b98._0x56d718) + '1px\x204px\x20rg' + 'ba(0,0,0,0' + _0x41fced(0x93a) + '\x20\x20\x20\x20\x20\x20\x20--r' + 'adius:\x2014p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20--rad' + 'ius-sm:\x208p' + _0x41fced(0xbd1) + '\x20\x20\x20\x20\x20--mon' + 'o:\x20\x27Inter\x27' + ',\x20system-u' + 'i,\x20sans-se' + 'rif;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20body\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20font-fa' + 'mily:\x20var(' + '--mono);\x0a\x20' + _0x41fced(_0x100b98._0x5b1bed) + '\x20backgroun' + 'd:\x20var(--b' + _0x41fced(_0x100b98._0x448a3b) + '\x20\x20\x20\x20\x20\x20colo' + _0x41fced(0x5e2) + 'ext);\x0a\x20\x20\x20\x20' + _0x41fced(0x7e1) + 'n-height:\x20' + '100vh;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + 'adding:\x2020' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20font' + '-size:\x2013p' + _0x41fced(0xbd1) + '\x20\x20\x20\x20\x20-webk' + 'it-font-sm' + 'oothing:\x20a' + 'ntialiased' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'body::befo' + 're\x20{\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x27f560) + 'tent:\x20\x27\x27;\x0a' + (_0x41fced(_0x100b98._0x3db255) + '\x20\x20position' + ':\x20fixed;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(0x7d9) + _0x41fced(_0x100b98._0x4c4246) + 'ght:\x200;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'height:\x2050' + 'vh;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x870) + 'ground-col' + 'or:\x20#0d221' + '8;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20backg' + 'round-imag' + 'e:\x20linear-' + _0x41fced(0x972) + '35deg,\x20#06' + '1209\x2025%,\x20' + _0x41fced(_0x100b98._0x47afc4) + 't\x2025%),\x20li' + 'near-gradi' + 'ent(225deg' + ',\x20#061209\x20' + '25%,\x20trans' + 'parent\x2025%' + _0x41fced(_0x100b98._0x48afd2) + 'gradient(4' + _0x41fced(0xb10) + _0x41fced(_0x100b98._0x2b37a3) + 'ransparent' + '\x2025%),\x20lin' + _0x41fced(0x77a) + 'nt(315deg,' + '\x20#061209\x202' + '5%,\x20#0d221' + '8\x2025%);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'background' + '-position:' + '\x2039px\x200,\x203' + _0x41fced(_0x100b98._0x241703) + ',\x200\x200;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x5d153b) + 'ackground-' + _0x41fced(_0x100b98._0x4eca67) + '\x2039px;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x5d153b) + 'ackground-' + 'repeat:\x20re' + 'peat;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x580122) + 'acity:\x200.2' + '5;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x30cc3d) + 'it-mask-im' + 'age:\x20linea' + 'r-gradient' + '(to\x20bottom' + _0x41fced(0xdcb) + ',\x20transpar' + 'ent\x2030%);\x0a' + _0x41fced(_0x100b98._0x3db255) + '\x20\x20mask-ima' + _0x41fced(_0x100b98._0x564e48) + '-gradient(' + 'to\x20bottom,' + '\x20black\x200%,' + '\x20transpare' + 'nt\x2030%);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xe00) + 'vents:\x20non' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20z-ind' + 'ex:\x200;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20body:' + ':-webkit-s' + 'crollbar\x20{' + '\x20width:\x206p' + _0x41fced(_0x100b98._0x4314a6) + '\x20\x20\x20body::-' + 'webkit-scr' + _0x41fced(0xc4c) + _0x41fced(0xd6b) + 'round:\x20tra' + 'nsparent;\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'body::-web' + _0x41fced(0xc6a) + 'bar-thumb\x20' + _0x41fced(0xe29) + _0x41fced(0x569) + 'border-rad' + 'ius:\x203px;\x20' + _0x41fced(0xa80) + _0x41fced(0x941) + 'r,\x20h1,\x20.in') + ('fo-text,\x20.' + 'three-colu' + _0x41fced(_0x100b98._0x1f5618) + '{\x20position' + ':\x20relative' + ';\x20z-index:' + '\x201;\x20}\x0a\x0a\x20\x20\x20' + _0x41fced(0x216) + _0x41fced(_0x100b98._0x59cb9f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'background' + ':\x20var(--su' + _0x41fced(0x4ea) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20max-widt' + 'h:\x201220px;' + _0x41fced(_0x100b98._0x14d8d9) + '\x20\x20\x20margin:' + '\x200\x20auto;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20border-ra' + _0x41fced(_0x100b98._0x5a4cb4) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5930c1) + 'g:\x2018px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa63) + 'w:\x20var(--s' + _0x41fced(_0x100b98._0x18d166) + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20h1\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20text-a' + 'lign:\x20cent' + 'er;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x48f) + '-size:\x2015p' + _0x41fced(_0x100b98._0x2b1162) + '\x20\x20\x20\x20\x20font-' + 'weight:\x2060' + '0;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20color' + ':\x20var(--te' + _0x41fced(0xa6a) + '\x20\x20\x20\x20\x20\x20\x20let' + 'ter-spacin' + 'g:\x20-0.3px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20margin-' + _0x41fced(0xe11) + _0x41fced(_0x100b98._0x9b2541) + _0x41fced(_0x100b98._0x59efeb) + '.info-text' + _0x41fced(_0x100b98._0x27c73e) + '\x20\x20\x20\x20\x20font-' + 'size:\x2011px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20color:' + '\x20var(--tex' + 't-muted);\x0a' + _0x41fced(_0x100b98._0x5b1bed) + '\x20\x20margin-b' + 'ottom:\x2014p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20paddi' + 'ng:\x208px\x2014' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20back' + 'ground:\x20va' + 'r(--surfac' + _0x41fced(0x9b9) + '\x20\x20\x20\x20\x20\x20bord' + _0x41fced(_0x100b98._0x1f7ea6) + '\x20var(--rad' + 'ius-sm);\x0a\x20' + _0x41fced(_0x100b98._0x3db255) + '\x20text-alig' + 'n:\x20center;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xcdb40b) + _0x41fced(0x8ea) + _0x41fced(_0x100b98._0x2c272d) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xe3c) + '\x20\x20.three-c' + 'olumn-layo' + 'ut\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20dis' + 'play:\x20grid' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20grid-t' + 'emplate-co' + 'lumns:\x201fr' + '\x202fr\x201fr;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x9a8) + _0x41fced(_0x100b98._0x2b1162) + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x625) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20backgr' + 'ound:\x20var(' + '--surface)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20border' + '-radius:\x20v' + 'ar(--radiu' + _0x41fced(_0x100b98._0x5c9003) + '\x20\x20\x20\x20\x20\x20padd' + _0x41fced(_0x100b98._0x22e21a) + _0x41fced(_0x100b98._0x14d8d9) + '\x20\x20\x20max-hei' + 'ght:\x20700px' + _0x41fced(_0x100b98._0x2de35f) + '\x20\x20\x20\x20overfl' + 'ow-y:\x20auto' + _0x41fced(0x76a) + '\x20\x20\x20\x20box-sh' + 'adow:\x20var(' + '--shadow-s' + 'm);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20.column:' + ':-webkit-s' + _0x41fced(0x29f) + '\x20width:\x204p' + 'x;\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20.column' + _0x41fced(0x632) + 'scrollbar-' + 'track\x20{\x20ba' + 'ckground:\x20' + _0x41fced(_0x100b98._0x47afc4) + 't;\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20.column' + '::-webkit-' + _0x41fced(0x880) + 'thumb\x20{\x20ba' + _0x41fced(_0x100b98._0x45cd59) + '#444;\x20bord' + _0x41fced(_0x100b98._0x1f7ea6) + '\x202px;\x20}\x0a\x0a\x20' + _0x41fced(0xd77) + 'lumn\x20h3\x20{\x0a' + _0x41fced(_0x100b98._0x3875f9) + '\x20\x20margin-b' + 'ottom:\x2012p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x1fe) + _0x41fced(0x8a8) + _0x41fced(0x2b8) + _0x41fced(0xd99) + _0x41fced(0x6b1) + 'ze:\x2010px;\x0a' + _0x41fced(_0x100b98._0x35a808) + _0x41fced(0x34c) + 'ght:\x20600;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc95) + _0x41fced(_0x100b98._0x150642) + '8px;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20tex' + _0x41fced(0x48b) + 'm:\x20upperca' + 'se;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x823) + '-align:\x20le' + 'ft;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bord' + 'er-bottom:' + '\x201px\x20solid' + '\x20var(--sur' + _0x41fced(_0x100b98._0x20725b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20padding-b' + 'ottom:\x2010p' + _0x41fced(0xbd1) + _0x41fced(0xd2f) + 'n-top:\x200;\x0a' + _0x41fced(_0x100b98._0x209972) + _0x41fced(0xba9) + 'column\x20h4\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20color:' + '\x20var(--tex' + 't-muted);\x0a' + _0x41fced(_0x100b98._0x5b1bed) + '\x20\x20font-siz' + _0x41fced(0x231) + _0x41fced(_0x100b98._0x3db255) + _0x41fced(0x684) + _0x41fced(_0x100b98._0x26716a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20letter-sp' + _0x41fced(_0x100b98._0x2bdaa2) + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x823) + '-transform' + ':\x20uppercas' + _0x41fced(_0x100b98._0xa84262)) + ('\x20\x20\x20\x20\x20borde' + _0x41fced(0xc89) + '1px\x20solid\x20' + 'var(--surf' + _0x41fced(_0x100b98._0x2dfc6d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'padding-bo' + 'ttom:\x206px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20margin:' + '\x200\x200\x2010px\x20' + _0x41fced(0x4dd) + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20.section' + '-title\x20{\x0a\x20' + _0x41fced(_0x100b98._0x5e07b9) + '\x20color:\x20va' + 'r(--text-m' + 'uted);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20f' + 'ont-size:\x20' + '10px;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20fo' + 'nt-weight:' + _0x41fced(_0x100b98._0x295c5e) + '\x20\x20\x20\x20\x20\x20\x20\x20le' + 'tter-spaci' + 'ng:\x200.8px;' + _0x41fced(0xd99) + _0x41fced(0x256) + 'ansform:\x20u' + 'ppercase;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20border-b' + 'ottom:\x201px' + '\x20solid\x20var' + _0x41fced(_0x100b98._0x1d765f) + _0x41fced(_0x100b98._0x5ac209) + _0x41fced(0xa59) + 'ding-botto' + 'm:\x208px;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'margin:\x200\x20' + '0\x2012px\x200;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + 'btn\x20{\x20bord' + 'er:\x20none;\x20' + _0x41fced(_0x100b98._0x2e9f8e) + _0x41fced(0x552) + '-radius-sm' + _0x41fced(_0x100b98._0x36e416) + '\x20pointer;\x20' + 'font-size:' + '\x2011px;\x20fon' + 't-weight:\x20' + '600;\x20font-' + 'family:\x20va' + 'r(--mono);' + '\x20padding:\x20' + _0x41fced(_0x100b98._0xb16bcf) + _0x41fced(_0x100b98._0x5612b3) + ':\x20opacity\x20' + '0.15s;\x20}\x0a\x20' + _0x41fced(_0x100b98._0x2f05e8) + 'n:hover\x20{\x20' + 'opacity:\x200' + '.85;\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20.btn-' + 'primary\x20{\x20' + 'background' + ':\x20var(--ac' + _0x41fced(0x608) + 'or:\x20#fff;\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3ff) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20positio' + _0x41fced(_0x100b98._0x49491b) + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20text-' + _0x41fced(0x933) + 'ter;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20mar' + 'gin-bottom' + ':\x2015px;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20.hea' + 'der\x20h1\x20{\x20f' + _0x41fced(_0x100b98._0x4c82e3) + _0x41fced(0x901) + 'r:\x20var(--t' + _0x41fced(0x4c6) + '-weight:\x206' + '00;\x20letter' + _0x41fced(_0x100b98._0x2bd27c) + '-0.3px;\x20ma' + _0x41fced(0x978) + 'm:\x202px;\x20}\x0a' + _0x41fced(_0x100b98._0x4edd8c)) + (_0x41fced(_0x100b98._0x8c6bab) + 'color:\x20var' + '(--text-mu' + 'ted);\x20font' + _0x41fced(_0x100b98._0x49b10e) + 'x;\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20.header' + '\x20a\x20{\x20color' + _0x41fced(0x271) + 'cent);\x20tex' + _0x41fced(_0x100b98._0x49952f) + 'on:\x20none;\x20' + _0x41fced(_0x100b98._0x9fd318) + '.header\x20a:' + _0x41fced(_0x100b98._0x2fa3f4) + 'xt-decorat' + 'ion:\x20under' + 'line;\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20.hea' + 'der-help-b' + _0x41fced(_0x100b98._0x3ffb2c) + _0x41fced(0x457) + 'ute;\x20right' + ':\x200;\x20top:\x20' + _0x41fced(_0x100b98._0x3bde0d) + 'form:\x20tran' + 'slateY(-50' + '%);\x20}\x0a\x0a\x20\x20\x20' + _0x41fced(0x81e) + 'iew-canvas' + '-container' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20backg' + 'round:\x20#11' + '1;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xb23e93) + 'r:\x201.5px\x20s' + 'olid\x20#333;' + _0x41fced(0xd99) + '\x20\x20\x20border-' + 'radius:\x20va' + 'r(--radius' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa85) + 'ay:\x20flex;\x0a' + _0x41fced(0x8ef) + _0x41fced(0x505) + 'ems:\x20cente' + 'r;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20justi' + 'fy-content' + ':\x20center;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20min-widt' + _0x41fced(_0x100b98._0x147fa2) + _0x41fced(_0x100b98._0x5e07b9) + '\x20\x20min-heig' + 'ht:\x20350px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa60) + '100%;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x58fa2d) + _0x41fced(_0x100b98._0x50fd3e) + ':\x2016/9;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'position:\x20' + 'relative;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2e8391) + ':\x20hidden;\x0a' + _0x41fced(0x7d7) + _0x41fced(0xba9) + _0x41fced(_0x100b98._0x514379) + '-toggle\x20{\x0a' + _0x41fced(_0x100b98._0x5d6532) + '\x20\x20position' + ':\x20absolute' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20top:\x201' + '0px;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20rig' + 'ht:\x2010px;\x0a' + _0x41fced(0x8ef) + '\x20\x20display:' + '\x20flex;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20g' + _0x41fced(_0x100b98._0x2187aa) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20z-index:\x20' + '10;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x25ec48) + 'le-btn\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20width:\x2020' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20heig' + 'ht:\x2020px;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xe30)) + (_0x41fced(_0x100b98._0xd28a90) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20border' + _0x41fced(0x514) + _0x41fced(_0x100b98._0x54b87f) + _0x41fced(0x8ef) + 'cursor:\x20po' + 'inter;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + _0x41fced(_0x100b98._0x29ebbf) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20box-sha' + 'dow:\x200\x201px' + '\x203px\x20rgba(' + '0,\x200,\x200,\x200' + '.5);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20.bg-tog' + 'gle-btn:ho' + 'ver\x20{\x20opac' + 'ity:\x200.85;' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x4aa) + 'e-btn.acti' + 've\x20{\x20outli' + 'ne:\x202px\x20so' + _0x41fced(_0x100b98._0x80c55) + _0x41fced(0x6c2) + 'utline-off' + 'set:\x202px;\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x25aa75) + '-black\x20{\x20b' + _0x41fced(_0x100b98._0x3084c7) + _0x41fced(0x72f) + _0x41fced(_0x100b98._0x4605d5) + '-toggle-wh' + 'ite\x20{\x20back' + _0x41fced(0x886) + 'ff;\x20}\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20selec' + 't\x20{\x20color:' + _0x41fced(_0x100b98._0x27498e) + 't)\x20!import' + _0x41fced(_0x100b98._0x244a9b) + 'family:\x20va' + 'r(--mono)\x20' + _0x41fced(_0x100b98._0x39af90) + ';\x20}\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x399) + 'ption\x20{\x20co' + _0x41fced(0x3f2) + _0x41fced(_0x100b98._0x17064d) + 'portant;\x20b' + 'ackground:' + '\x20#2a2a2a\x20!' + 'important;' + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5a27fd) + 'pe=\x22text\x22]' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'input[type' + '=\x22number\x22]' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3d2) + '=\x22search\x22]' + _0x41fced(_0x100b98._0x5b221a) + 'select:not' + '([style*=\x22' + 'display:\x20n' + 'one\x22])\x20{\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x1e4c86) + 'd:\x20#353434' + '\x20!importan' + 't;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20borde' + 'r:\x201.5px\x20s' + 'olid\x20#444\x20' + _0x41fced(_0x100b98._0xdfcb37) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x454) + '-radius:\x20v' + 'ar(--radiu' + _0x41fced(0xdde) + 'ortant;\x0a\x20\x20' + _0x41fced(_0x100b98._0x3875f9) + _0x41fced(0x75d) + '(--text)\x20!' + 'important;' + _0x41fced(_0x100b98._0x1930c4) + '\x20\x20\x20font-fa' + 'mily:\x20var(' + '--mono)\x20!i' + 'mportant;\x0a' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x45c142) + 'e:\x2011px\x20!i' + 'mportant;\x0a' + _0x41fced(_0x100b98._0x5d6532)) + (_0x41fced(_0x100b98._0x59d621) + '\x205px\x209px\x20!' + _0x41fced(0xa6e) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xcdb40b) + 'dow:\x20inset' + '\x200\x201px\x203px' + '\x20rgba(0,0,' + '0,0.2)\x20!im' + 'portant;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x44cbb5) + 'n:\x20border-' + 'color\x200.15' + 's;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8d5) + 'e=\x22text\x22]:' + 'focus,\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x78ed93) + '[type=\x22num' + 'ber\x22]:focu' + 's,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20select:fo' + 'cus\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ou' + 'tline:\x20non' + 'e\x20!importa' + 'nt;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bord' + _0x41fced(_0x100b98._0x436461) + _0x41fced(0x5b4) + _0x41fced(_0x100b98._0x4012ae) + 'tant;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + _0x41fced(_0x100b98._0x4f4517) + 'inset\x200\x201p' + 'x\x203px\x20rgba' + '(0,0,0,0.0' + _0x41fced(0x9a0) + '3px\x20var(--' + 'accent-sof' + 't)\x20!import' + 'ant;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20input[t' + _0x41fced(_0x100b98._0xb99f10) + _0x41fced(_0x100b98._0x534ed6) + '\x20\x20\x20\x20\x20\x20\x20bac' + 'kground:\x20#' + '2a2a2a\x20!im' + 'portant;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x356c51) + '.5px\x20solid' + _0x41fced(_0x100b98._0x51f09a) + _0x41fced(_0x100b98._0x1cd622) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'border-rad' + 'ius:\x20var(-' + _0x41fced(0x695) + ')\x20!importa' + _0x41fced(0xdba) + _0x41fced(_0x100b98._0x3861f4) + 'or:\x20pointe' + _0x41fced(_0x100b98._0x1ff1fe) + '\x20\x20\x20\x20\x20heigh' + _0x41fced(0x362) + _0x41fced(_0x100b98._0xca2b43) + _0x41fced(0x422) + 'ield\x20{\x20mar' + 'gin-bottom' + ':\x208px;\x20}\x0a\x20' + _0x41fced(0x723) + 'eld\x20label\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20displa' + 'y:\x20block;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20margin-b' + _0x41fced(0x7dd) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-w' + _0x41fced(0x65f) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-s' + 'ize:\x2010px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20color:\x20' + _0x41fced(_0x100b98._0x457216) + '-muted);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20letter-sp' + 'acing:\x200.3' + 'px;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc3c) + '\x20\x20.field\x20l' + _0x41fced(0xb3d) + '*=\x22flex\x22]\x20' + '{\x20margin-b') + (_0x41fced(_0x100b98._0x11d51f) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '.field\x20inp' + 'ut[type=\x22c' + _0x41fced(0x93b) + '{\x20width:\x20a' + 'uto;\x20curso' + 'r:\x20pointer' + ';\x20accent-c' + 'olor:\x20var(' + '--accent);' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20.field\x20in' + _0x41fced(0x3d4) + _0x41fced(_0x100b98._0x448e8f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb0c) + '\x200;\x20height' + _0x41fced(_0x100b98._0x184c04) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20a' + 'ccent-colo' + _0x41fced(0x60f) + _0x41fced(0xd6d) + _0x41fced(_0x100b98._0xfc68c5) + _0x41fced(0x753) + 'ne\x20!import' + _0x41fced(_0x100b98._0x38d8a8) + '\x20\x20\x20\x20\x20\x20\x20box' + '-shadow:\x20n' + 'one\x20!impor' + _0x41fced(0xce7) + '\x20\x20\x20\x20\x20\x20\x20\x20ba' + 'ckground:\x20' + _0x41fced(_0x100b98._0x574d2a) + 't\x20!importa' + 'nt;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20marg' + 'in-top:\x206p' + _0x41fced(_0x100b98._0x338db8) + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20.field\x20in' + 'put,\x20.fiel' + 'd\x20select\x20{' + _0x41fced(_0x100b98._0x14d8d9) + '\x20\x20\x20width:\x20' + '100%;\x0a\x20\x20\x20\x20' + _0x41fced(0x995) + 'dding:\x205px' + _0x41fced(0xb5a) + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'rder:\x201.5p' + 'x\x20solid\x20#4' + '44;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bord' + _0x41fced(0xe33) + '\x20var(--rad' + 'ius-sm);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20backgroun' + _0x41fced(0xaa6) + _0x41fced(0x76a) + '\x20\x20\x20\x20color:' + '\x20var(--tex' + 't);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20font' + '-size:\x2011p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20font-' + 'family:\x20va' + _0x41fced(0x2aa) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + _0x41fced(_0x100b98._0x1d55b5) + 't:focus,\x20.' + 'field\x20sele' + _0x41fced(0xc4a) + _0x41fced(0xd99) + _0x41fced(0x2e4) + _0x41fced(_0x100b98._0x588b5c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'border-col' + _0x41fced(_0x100b98._0x4f7472) + _0x41fced(0x991) + _0x41fced(0x8ef) + '\x20box-shado' + _0x41fced(0x7a6) + 'px\x20var(--a' + 'ccent-soft' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20.field\x20bu' + 'tton\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20w' + _0x41fced(0x404) + _0x41fced(0x76a) + _0x41fced(0x454) + _0x41fced(_0x100b98._0x588b5c) + _0x41fced(_0x100b98._0x5d6532) + 'border-rad' + 'ius:\x20var(-') + (_0x41fced(_0x100b98._0x3ae48d) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x448882) + 'r:\x20pointer' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x591) + _0x41fced(_0x100b98._0x28795a) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20font-we' + _0x41fced(_0x100b98._0x6c04d) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x243fbd) + 'mily:\x20var(' + '--mono);\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x1102e3) + _0x41fced(_0x100b98._0x25c59c) + '\x20\x20\x20\x20\x20\x20\x20tra' + 'nsition:\x20o' + 'pacity\x200.1' + '5s;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20.field\x20b' + 'utton:hove' + 'r\x20{\x20opacit' + 'y:\x200.85;\x20}' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3f0183) + 'on\x20{\x20backg' + 'round:\x20var' + '(--accent)' + ';\x20color:\x20#' + 'fff;\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20.save' + _0x41fced(_0x100b98._0x11f7f9) + 'ver\x20{\x20back' + 'ground:\x20#e' + '68900;\x20opa' + 'city:\x201;\x20}' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x375) + _0x41fced(_0x100b98._0x52e0ea) + '\x20\x20\x20\x20width:' + '\x20100%;\x0a\x20\x20\x20' + _0x41fced(0x85f) + 'adding:\x2010' + 'px\x2012px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20backgroun' + 'd:\x20#353434' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x454) + ':\x201.5px\x20da' + _0x41fced(0x8c3) + _0x41fced(0xd99) + '\x20\x20\x20border-' + 'radius:\x20va' + 'r(--radius' + '-sm);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20di' + 'splay:\x20fle' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5edfe7) + '-items:\x20ce' + 'nter;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ju' + 'stify-cont' + 'ent:\x20cente' + 'r;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20curso' + 'r:\x20pointer' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-s' + 'ize:\x2011px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20color:\x20' + 'var(--text' + '-muted);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20text-alig' + 'n:\x20center;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20min-hei' + _0x41fced(0x8b8) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20transit' + 'ion:\x20borde' + _0x41fced(_0x100b98._0x5f4cf7) + '15s;\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x7b5) + '\x20\x20\x20.file-b' + _0x41fced(_0x100b98._0x6dc26d) + _0x41fced(0xc84) + 'lor:\x20var(-' + '-accent);\x20' + 'color:\x20var' + _0x41fced(_0x100b98._0x1b82e7) + _0x41fced(_0x100b98._0x9fd318) + '.file-box.' + 'has-file\x20{') + (_0x41fced(0x76d) + 'yle:\x20solid' + ';\x20border-c' + _0x41fced(0xbab) + '--accent);' + '\x20color:\x20va' + 'r(--accent' + ');\x20font-we' + 'ight:\x20600;' + _0x41fced(_0x100b98._0x4fbeb) + _0x41fced(_0x100b98._0x5a27fd) + 'pe=\x22file\x22]' + '\x20{\x20display' + _0x41fced(_0x100b98._0x1e3dea) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + 'library-mo' + 'dal\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20di' + 'splay:\x20non' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20posit' + _0x41fced(0x2a4) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20top:\x200' + ';\x20left:\x200;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20width:\x20' + '100vw;\x20hei' + 'ght:\x20100vh' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x60c) + 'ound:\x20rgba' + '(0,0,0,0.8' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x29642c) + 'ex:\x201000;\x0a' + _0x41fced(_0x100b98._0x5c36ca) + '\x20\x20overflow' + _0x41fced(0x80a) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20.l' + _0x41fced(_0x100b98._0x36df11) + 'al.active\x20' + '{\x20display:' + _0x41fced(0xbb2) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + _0x41fced(_0x100b98._0x51b057) + _0x41fced(0x5d8) + _0x41fced(_0x100b98._0x3db255) + 'background' + ':\x20var(--su' + 'rface-2);\x0a' + _0x41fced(0x8ef) + '\x20\x20margin:\x20' + '50px\x20auto;' + _0x41fced(_0x100b98._0x1930c4) + _0x41fced(_0x100b98._0x42c454) + _0x41fced(_0x100b98._0x57f139) + _0x41fced(_0x100b98._0x4c2a35) + 'border-rad' + 'ius:\x20var(-' + '-radius);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20max-widt' + 'h:\x20900px;\x0a' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x14b99b) + 'ow:\x20var(--' + 'shadow);\x0a\x20' + _0x41fced(0xc6d) + '\x20\x20\x20\x20\x20\x20\x20\x20.l' + 'ibrary-hea' + 'der\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20di' + _0x41fced(0xc47) + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20justi' + 'fy-content' + _0x41fced(_0x100b98._0x1aa59e) + 'tween;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20a' + _0x41fced(0xc2a) + ':\x20center;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20margin-b' + 'ottom:\x2020p' + 'x;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20paddi' + 'ng-bottom:' + _0x41fced(0x630) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20b' + 'order-bott' + 'om:\x201px\x20so' + 'lid\x20var(--' + 'surface-3)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x50f) + '.library-h' + 'eader\x20h2\x20{' + '\x20margin:\x200') + (';\x20color:\x20v' + _0x41fced(0x772) + 't);\x20font-s' + 'ize:\x2014px;' + _0x41fced(0x684) + 'ht:\x20600;\x20l' + 'etter-spac' + 'ing:\x200.5px' + ';\x20}\x0a\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1584e8) + '-sprites-b' + 'utton\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'background' + ':\x20var(--su' + _0x41fced(_0x100b98._0x56169e) + _0x41fced(_0x100b98._0x4c2a35) + _0x41fced(_0x100b98._0x1456e1) + 'ar(--text)' + _0x41fced(_0x100b98._0x2de35f) + _0x41fced(0x454) + ':\x20none;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'padding:\x207' + 'px\x2014px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb41) + _0x41fced(0x6cb) + _0x41fced(_0x100b98._0x3ebde4) + 'm);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20curs' + 'or:\x20pointe' + 'r;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20font-' + 'size:\x2011px' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-w' + 'eight:\x20600' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20font-f' + 'amily:\x20var' + '(--mono);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20transiti' + _0x41fced(0x471) + 'ound\x200.15s' + _0x41fced(_0x100b98._0x2de35f) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '.remove-sp' + 'rites-butt' + 'on:hover\x20{' + _0x41fced(_0x100b98._0x1e4c86) + _0x41fced(_0x100b98._0x4fed0e) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '.close-lib' + _0x41fced(_0x100b98._0x86a15d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20b' + 'ackground:' + _0x41fced(0x6fd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20color:\x20#' + 'e05050;\x0a\x20\x20' + _0x41fced(_0x100b98._0x3281d2) + 'border:\x20no' + 'ne;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xe2ead5) + 'ing:\x207px\x201' + _0x41fced(_0x100b98._0x19966f) + '\x20\x20\x20\x20\x20\x20\x20bor' + _0x41fced(_0x100b98._0x2cae4c) + _0x41fced(0x1bf) + 'dius-sm);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20cursor:\x20' + _0x41fced(_0x100b98._0x56b0ff) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20font-size' + _0x41fced(_0x100b98._0x23256b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'font-weigh' + 't:\x20600;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'font-famil' + 'y:\x20var(--m' + 'ono);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20tr' + 'ansition:\x20' + 'background' + '\x200.15s;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + _0x41fced(_0x100b98._0x172fff) + 'se-library' + _0x41fced(_0x100b98._0x2f18ee) + 'ackground:' + '\x20#4a2020;\x20' + _0x41fced(_0x100b98._0x300f4d) + '\x20.library-' + _0x41fced(0x2a0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + 'isplay:\x20gr') + (_0x41fced(_0x100b98._0x2e53e5) + '\x20\x20\x20\x20\x20\x20grid' + '-template-' + 'columns:\x20r' + _0x41fced(0x7f7) + '-fill,\x20min' + _0x41fced(_0x100b98._0x23380b) + '\x201fr));\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x138d35) + _0x41fced(0xd99) + _0x41fced(0x44a) + _0x41fced(_0x100b98._0x33f03a) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '.library-i' + 'tem\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ba' + 'ckground:\x20' + 'var(--surf' + 'ace);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bo' + 'rder:\x201.5p' + _0x41fced(_0x100b98._0xe0041c) + _0x41fced(0x894) + 'e-3);\x0a\x20\x20\x20\x20' + _0x41fced(0xad3) + 'rder-radiu' + 's:\x20var(--r' + 'adius-sm);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x42c454) + _0x41fced(0x7c2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'cursor:\x20po' + 'inter;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + _0x41fced(_0x100b98._0x362718) + _0x41fced(_0x100b98._0x328915) + _0x41fced(0x3ed) + _0x41fced(_0x100b98._0x1d4696) + _0x41fced(_0x100b98._0x19d77d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x794) + '\x20relative;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + 'library-it' + _0x41fced(0x7ee) + '\x20border-co' + 'lor:\x20var(-' + _0x41fced(_0x100b98._0x17cb52) + 'background' + _0x41fced(_0x100b98._0x27e55a) + 'rface-2);\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20.library-' + _0x41fced(_0x100b98._0x29d60a) + 'ew\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20wid' + 'th:\x20100%;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8d6) + '120px;\x0a\x20\x20\x20' + _0x41fced(0x781) + 'ackground:' + _0x41fced(_0x100b98._0x10b76d) + _0x41fced(_0x100b98._0x5d153b) + 'order-radi' + _0x41fced(0xcd2) + _0x41fced(_0x100b98._0x3281d2) + '\x20margin-bo' + 'ttom:\x208px;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x67b) + ':\x20flex;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'align-item' + 's:\x20center;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x2e3) + '-content:\x20' + 'center;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3cff47) + 'hidden;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20.lib' + 'rary-item-' + 'preview\x20ca' + 'nvas\x20{\x20ima' + 'ge-renderi' + 'ng:\x20pixela' + 'ted;\x20max-w' + 'idth:\x20100%' + ';\x20max-heig' + 'ht:\x20100%;\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20.library-' + 'item-delet') + ('e\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20posi' + 'tion:\x20abso' + _0x41fced(_0x100b98._0x418ed7) + '\x20\x20\x20\x20\x20\x20\x20\x20to' + _0x41fced(_0x100b98._0x291ddc) + 'ght:\x206px;\x0a' + _0x41fced(0x8ef) + '\x20\x20width:\x202' + '2px;\x20heigh' + 't:\x2022px;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20backgroun' + 'd:\x20#3a1a1a' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20border' + ':\x201px\x20soli' + 'd\x20#555;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'border-rad' + 'ius:\x2050%;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20display:' + '\x20flex;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20a' + 'lign-items' + ':\x20center;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xba6) + 'content:\x20c' + 'enter;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x51bb22) + 'ursor:\x20poi' + 'nter;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20op' + 'acity:\x200;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20transiti' + 'on:\x20opacit' + 'y\x200.15s;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8f3) + _0x41fced(_0x100b98._0x23256b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x51fbfb) + '5050;\x0a\x20\x20\x20\x20' + _0x41fced(0x363) + 'nt-weight:' + '\x20700;\x0a\x20\x20\x20\x20' + _0x41fced(0x9ac) + '\x20\x20\x20\x20.libra' + _0x41fced(_0x100b98._0x3aadb5) + _0x41fced(0x24e) + 'ry-item-de' + 'lete\x20{\x20opa' + 'city:\x201;\x20}' + _0x41fced(0xba9) + _0x41fced(_0x100b98._0x4d9f73) + 'em-delete:' + 'hover\x20{\x20ba' + _0x41fced(0xb60) + _0x41fced(_0x100b98._0x14100f) + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '.library-i' + 'tem-name\x20{' + _0x41fced(_0x100b98._0x268df5) + 'r(--text);' + '\x20font-size' + _0x41fced(_0x100b98._0x7d84f7) + 'nt-weight:' + '\x20600;\x20text' + '-align:\x20ce' + 'nter;\x20word' + '-wrap:\x20bre' + 'ak-word;\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20.' + 'library-it' + 'em-info\x20{\x20' + 'color:\x20var' + '(--text-mu' + _0x41fced(_0x100b98._0x2c3e13) + '-size:\x2010p' + 'x;\x20text-al' + 'ign:\x20cente' + _0x41fced(0x888) + 'top:\x203px;\x20' + _0x41fced(_0x100b98._0x300f4d) + '\x20.library-' + 'empty\x20{\x20te' + 'xt-align:\x20' + 'center;\x20pa' + _0x41fced(_0x100b98._0x22f263) + _0x41fced(_0x100b98._0x29b836) + 'var(--text' + '-faint);\x20f' + _0x41fced(_0x100b98._0x11827f) + '13px;\x20}\x0a\x20\x20' + _0x41fced(_0x100b98._0x26c525) + '\x0a</head>\x0a<' + _0x41fced(_0x100b98._0x287225)) + ('\x20class=\x22he' + 'ader\x22>\x0a\x20\x20\x20' + _0x41fced(0x987) + 'style=\x22dis' + 'play:\x20flex' + _0x41fced(_0x100b98._0x2834f2) + _0x41fced(0x637) + 'r;\x20justify' + '-content:\x20' + 'center;\x20ga' + 'p:\x2015px;\x22>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2b57a5) + 'c=data:ima' + 'ge/png;bas' + 'e64,iVBORw' + '0KGgoAAAAN' + 'SUhEUgAAAO' + 'sAAAEuCAMA' + 'AABYhhVUAA' + 'AKOmlDQ1Bz' + _0x41fced(_0x100b98._0x2a35e4) + 'YxOTY2LTIu' + 'MQAASImdU2' + 'dUU+kWPffe' + '9EJLiICU0H' + _0x41fced(0xe41) + 'r6ISkwChhB' + 'gSsBdEVHBE' + 'EZGmCDIo4I' + 'CjIyBjRRQL' + 'g2LvAzKIqO' + _0x41fced(_0x100b98._0x5dadb0) + 'Gn2z5r03b/' + 'aPb+21v3Pu' + '/c7Z5wDQAk' + 'JE4mxUBSBL' + _0x41fced(0x424) + 'MS2cR+QIEM' + _0x41fced(_0x100b98._0x2d3afa) + _0x41fced(_0x100b98._0x37cd58) + 'XHZOpL83fA' + 'EC8PKa4gS4' + 'bB0QzmbD/w' + 'dVvkQqA0DC' + 'AWCaQJjDB0' + 'AKACAzTyZR' + _0x41fced(0x1d1) + 'AoTsGl8QmJ' + _0x41fced(_0x100b98._0x810e26) + 'afYj5zTwUX' + 'ZIkFAKjizR' + _0x41fced(0x645) + _0x41fced(0x747) + 'CgMFckzAPA' + 'rgCAUaY8Sw' + 'SAvVbkZgl5' + 'OQA4mkKXCf' + 'lpADg7AKBJ' + 'oyO5ALgZAC' + 'Ra6ld8/ldc' + 'JlwoUxTFzZ' + 'YskopS02Rs' + 'M745297Fhc' + _0x41fced(0x79c) + '63AeP4MnFb' + 'C52VkSnngR' + _0x41fced(_0x100b98._0x3a8422) + 't2oC/Xyd7F' + 'ycnawcb+q0' + _0x41fced(_0x100b98._0x5f250f) + 'n9nziE+eIa' + 'y+L9pfxWXX' + _0x41fced(0x315) + 'T5lQAdawA0' + _0x41fced(0x7d5) + 'cAtF/4qh6W' + _0x41fced(_0x100b98._0x35d63b) + _0x41fced(_0x100b98._0x36e4a9) + 't1E09A/8z4' + 'C/ga/+Z6P4' + '3B/tYfsIU3' + _0x41fced(0x71e) + 'dma2XMrOkf' + 'D4Qrb1n4f4' + 'Hyf+9TusIo' + 'UpQqlQzBey' + _0x41fced(0xdf3) + '3NFgtEMlG2' + _0x41fced(0x97a) + 'Han/B5rgGA' + '0fABmPNsQO' + 'UCE7Bf+wDH' + 'oAKWtEPh+h' + '++hZBjQbF5' + 'cXqjn+f+Ez' + '5t878DLVEc' + 'OaLUT3ncyG' + 'g2Xy7N/Xyn' + 'WEvAAwWUgQ') + (_0x41fced(_0x100b98._0x62025f) + '4ADO4Aae4A' + 'tBEAbRkABz' + 'gQ9pkAVSyI' + _0x41fced(0x73d) + _0x41fced(_0x100b98._0x1576f1) + 'Zohf3QAYfh' + 'BJyG83ARrs' + _0x41fced(0x4a7) + '8BImEQQhIn' + _0x41fced(0xa3c) + 'Yok4IBxkJu' + 'KLhCCRSAKS' + 'jKQiYkSOLE' + 'VWI8VIKVKF' + '1CFNyPfIIe' + _0x41fced(_0x100b98._0x15c815) + 'Q8gY8jvyFs' + _0x41fced(0x431) + '1BbloF5oMB' + _0x41fced(0x5ed) + 'YrQA3YhWoP' + _0x41fced(0x263) + 'R6+ig+hjdA' + 'IDjIqxMH3M' + 'GuNgXCwMS8' + 'RSMCm2HCvC' + 'yrF6rBXrwn' + 'qxy9gg9gR7' + 'gyPgGDg2zh' + _0x41fced(_0x100b98._0x2cc8c4) + 'uAW45bgNuC' + 'rcHlw7rgd3' + 'GTeEG8d9wN' + 'Px2nhLvCs+' + 'EB+PT8Xn4Q' + _0x41fced(_0x100b98._0x1abbde) + 'KfxV/Aj+JY' + 'FAYBFMCc6E' + 'AEICIZ2whL' + _0x41fced(_0x100b98._0x111021) + 'GCAMEyaIRK' + 'Im0ZLoTgwj' + '8ogyYiGxkr' + _0x41fced(0x519) + 'fE2ikvRIDi' + 'Q/UiJJTMon' + 'lZOaSUdJl0' + 'ijpEmyCtmY' + '7EoOIwvIi8' + _0x41fced(_0x100b98._0x2bea37) + _0x41fced(0xa3f) + 'LcKdGUdMoq' + _0x41fced(_0x100b98._0x1e0abc) + 'fynEqlGlBd' + 'qBFUEXUltY' + 'K6j3qGOkR9' + 'Q1OjWdC4tC' + 'SanLaRtpt2' + 'nHaT9pxOp5' + 'vQPemJdBl9' + 'I72JfpJ+j/' + '5aiaFkoxSo' + _0x41fced(_0x100b98._0x547420) + '50SempMlnZ' + _0x41fced(_0x100b98._0x278b5f) + 'Vy5QPKF5Sf' + 'qJBVTFS4Kj' + 'yV5SrVKodU' + 'rqtMqDJU7V' + 'XDVLNUN6g2' + _0x41fced(_0x100b98._0x281364) + 'NR81UTqBWo' + _0x41fced(0x9d8) + 'iGDC6Dz1jN' + 'aGCcYowwCU' + _0x41fced(0x451) + '/I7ZzxxXV1' + _0x41fced(_0x100b98._0x28c858) + 'Wv2I+iALY5' + _0x41fced(_0x100b98._0xee0274) + _0x41fced(_0x100b98._0x5be986) + 'O8pginrJ/S' + 'OuXSlFcaUz' + _0x41fced(_0x100b98._0x4b39d2) + _0x41fced(0xcc6) + '01MzQ3a3Zo' + '3tXCaVloRW' + 'jlae3QOqX1' + 'ZCpzqttU/t' + _0x41fced(_0x100b98._0xf797fb) + 'tS20I7WXaO' + '/S7tOe0NHV' + '8deR6FTqnN' + _0x41fced(0x911) + '1y3TPao7ps' + 'fQm6kn0ivT' + 'O6b3iK3O9m' + 'JnsivYPexx' + _0x41fced(0x56f)) + ('1+v/6kgalB' + 'jEG+QZvBXU' + 'OKIccwxbDM' + 'sNtw3EjPKN' + 'RoqVGL0S1j' + 'sjHHOM14m3' + 'Gv8SsTU5M4' + 'k7UmHSYPTT' + _0x41fced(0x65e) + _0x41fced(0x5b6) + 'CrN7tiTjDn' + 'mGeYbze/aI' + 'FaOFqkWVRb' + _0x41fced(0x463) + _0x41fced(0x566) + _0x41fced(_0x100b98._0x30e3f5) + 'RrL+tc6xbr' + 'IRuWTYhNvk' + '2HzVNbI9tE' + '2822vbYf7B' + 'ztMu0a7G7b' + 'q9kH2efbd9' + 'n/7mDhwHeo' + 'drgyjT7Nb9' + 'qKaZ3Tnk23' + _0x41fced(0xdea) + _0x41fced(0x8fd) + 'x/dOzk5Sp1' + _0x41fced(_0x100b98._0x364282) + 'GufrHCYnnL' + _0x41fced(0xad2) + 'ssLlsMsbVy' + 'dXmet+19/c' + 'rN0y3JrdHs' + '4wnSGc0TBj' + '2N3Anede5z' + '44kz0zeebO' + 'mYMe+h48j3' + _0x41fced(_0x100b98._0x119651) + 'Rs9RL3OvdK' + _0x41fced(_0x100b98._0x3af5c9) + '3ge9X3Fduc' + 'u4x30wH3+f' + 'Ip9+XzXfGN' + _0x41fced(_0x100b98._0x17ea32) + 'fi1+4/6O/k' + _0x41fced(0xcce) + 'NgdcD9QJ5A' + _0x41fced(0x50e) + 'C+oJpgVHBV' + _0x41fced(0x82a) + 'dIWioUGhW0' + 'LvzDKeJZ7V' + _0x41fced(_0x100b98._0x3970f8) + '6Gm4YvCP8x' + 'ghARHlEd8S' + 'DSPnJpZG8U' + _0x41fced(0x394) + _0x41fced(0xb8f) + 'MfKY7ljl2K' + _0x41fced(0xcfa) + 'pXGD8bbxy+' + 'LPJ2gliBI6' + 'E4mJsYmNiR' + 'OzfWdvnT2S' + _0x41fced(0x9b1) + _0x41fced(0xd38) + _0x41fced(0x3b2) + 'x5B5LxyXHJ' + 'zcnveGG8et' + _0x41fced(0x27f) + '+Vz+Nv5jga' + 'egTDAmdBeW' + 'CkdT3FNKUx' + '6muqduSR1L' + '80grT3si4o' + 'qqRM/SA9Jr' + '019lhGXszv' + _0x41fced(_0x100b98._0x52f891) + _0x41fced(0x6ac) + _0x41fced(0x478) + 'SCwlhZLBBa' + '4Lti4YlwZL' + 'G3OQnDk5nT' + 'KmTCLrk5vJ' + '18iHcmfmVu' + 'e+zovNO7BQ' + 'daF4Yd8ii0' + _0x41fced(_0x100b98._0x5da3fe) + '7RLcEv6S7q' + _0x41fced(_0x100b98._0x173820) + 'taxuObJ8/v' + 'LuFYYrClaM' + _0x41fced(_0x100b98._0x8eaace) + 'XGqp/y7fJL' + _0x41fced(0x2e6) + 'BTsLJgeI3/' + _0x41fced(_0x100b98._0x16f66a) + 'W1bmtr1+HW' + 'idb1r5+2vn') + (_0x41fced(0x85b) + _0x41fced(_0x100b98._0x174a99) + 'vOfWP/TcU3' + 'HzembOwvcS' + 'rZsYmwSbzp' + _0x41fced(_0x100b98._0x3713f3) + _0x41fced(0xce9) + _0x41fced(_0x100b98._0x2a16ce) + _0x41fced(_0x100b98._0x3a23da) + 't1G2ybcNVo' + 'RUdFYaVW6q' + _0x41fced(0x1c5) + 'u6rUa7Zn3N' + _0x41fced(0x38a) + _0x41fced(0x831) + 'u1O080adf1' + _0x41fced(0x35c) + _0x41fced(0x3dc) + 'q/5Xzb1KjV' + _0x41fced(_0x100b98._0x78af33) + 'CeyD09Tc5N' + _0x41fced(0x62b) + 'u8ZWxv0t6L' + _0x41fced(0x515) + 'rXxmor3gf7' + '5PsefZ/8/b' + _0x41fced(0x3ba) + 'tP5g/EPNQc' + 'bBonakfVH7' + 'eEdax2BnQu' + _0x41fced(_0x100b98._0x5e6f1a) + 'XQd/tPlx92' + _0x41fced(_0x100b98._0x18e14f) + 'HKUcLTj68d' + 'jiYxPHJcef' + 'nEg9Mdw9r/' + 'v2yfiTV3oi' + _0x41fced(0xbff) + 'rv9Mler95j' + 'Z9zPHD7rev' + _0x41fced(_0x100b98._0x266b1) + '59v7HPsO/u' + 'T408F+p/72' + _0x41fced(0x3e8) + 'wamDFw9JLH' + 'pROXfS6fvh' + 'J45fzVWVcH' + 'rsVcu3E96f' + 'rgDcGNhzcz' + 'bz67lXtr8v' + 'bKO/g7RXdV' + _0x41fced(0x3bf) + _0x41fced(_0x100b98._0x2179bf) + _0x41fced(_0x100b98._0x106571) + _0x41fced(0x4e8) + 'L+9GCh7QH5' + 'SP6o02PXR4' + 'eHjMb+zio9' + 'mPRh5LHk8+' + _0x41fced(_0x100b98._0xb4e978) + _0x41fced(_0x100b98._0x2ccf26) + '8fjxkWfSZx' + '9/3/Bc8/nu' + _0x41fced(_0x100b98._0x48d8c1) + _0x41fced(0x685) + 'a83Xe95w3v' + 'S+jXs7Opn3' + 'jviu4r35+6' + _0x41fced(_0x100b98._0x136f65) + '+PFfA5jz/D' + 'T+dQEAAAMA' + 'UExURQAAAP' + '///ykcBAIC' + 'BgIGCgIGBg' + 'gKCgIGAgYL' + 'BAYGAhERBv' + '7++fb29A0M' + 'AxYUBv7rVf' + '70qfrXR/v5' + '8P7pnxwXBv' + 'Dt4ygeAiQc' + _0x41fced(_0x100b98._0x4df6f4) + 'PMicq4gtrS' + 'uufhz/fz5+' + 'i0LiohCi8n' + 'FP7UbichEn' + 'RjNu7KcurP' + 'iu/TkOnPkH' + 'hrTN7Iji4g' + _0x41fced(_0x100b98._0x3f457c) + '4YCz0zHLyd' + 'We3Kfdi5dO' + '7OiNu+fVtP' + 'NP7fl7eico' + 'h4VmdbQe/V' + 'mKqXbPjdn5' + 'OGaMe/rqVy' + _0x41fced(0x962) + 'RqGW9QE2RI' + _0x41fced(0xd05)) + ('2UJaF0HXpZ' + 'GC4iCTUnC+' + _0x41fced(_0x100b98._0x15950e) + 'duC7c+rGet' + _0x41fced(_0x100b98._0x5733cd) + 'burGfvvVie' + 'bDfezKg6SL' + 'W/vXkuPEhe' + 'rKisSre7qw' + 'm+jm4vmmD9' + 'yRD7l9DdeW' + _0x41fced(0x8a1) + _0x41fced(0x7f1) + 'Jr+HItKWJr' + 'B+IP63MOCe' + 'K92rUuSzXt' + 'Kua+7GeurC' + 'eu7GflBDK+' + _0x41fced(_0x100b98._0x11baff) + _0x41fced(0xb0d) + _0x41fced(_0x100b98._0x30f214) + 'dsqueurKjt' + 'a5g92/iPPR' + 'lqObjLJ2Fo' + _0x41fced(_0x100b98._0x186d4b) + 'DHlSEtaSIt' + 'KOIsqKIfeq' + 'K++kKtuVJv' + '2vLeigKdaS' + 'JtKSJtuWKt' + _0x41fced(_0x100b98._0x413024) + _0x41fced(_0x100b98._0x14c1c0) + 'auOc2SMNmd' + 'O7eENDorE/' + 'y+XJd4ROrC' + _0x41fced(_0x100b98._0x328435) + _0x41fced(_0x100b98._0x2e4d75) + 'i8qufurKlK' + _0x41fced(0x4fb) + 'DKZmCiAUAr' + 'd2FhkQA7Fy' + 'FpNeEtGJG6' + _0x41fced(0x9f6) + 'G7t6GUIrCb' + '9+G7Z2GrJ2' + 'Gi4eB69yG9' + 'aOIuOZJ9aO' + 'JtKOJu7Cfu' + '7GiOrChsqq' + 'es+vf6pjBq' + 'pmCqZiCqFh' + 'CrBrDapmDq' + _0x41fced(0xaea) + _0x41fced(0xde0) + 'ZgBi4aAq9m' + 'CqpiCsJxDa' + 'NdC7hsDcp3' + _0x41fced(0x8d3) + 'ZiDoxTDK5m' + 'D6FhD3ZGC2' + 'pACsR0FLVt' + 'E4ZPDqpnE7' + _0x41fced(_0x100b98._0x3eb9b9) + 'Kc6qfpxYC4' + 'pOCoZKCpRU' + 'DKpiDoJKC4' + 'pODk00GYpK' + _0x41fced(0x490) + _0x41fced(_0x100b98._0x17da64) + 'FmpGI1k5Gm' + 'I+Hv76+PPx' + '8AwEAgYCAg' + 'cGBv7+/vr6' + '+gICAv///7' + 'JXTUoAAAEA' + _0x41fced(0x3b0) + '//////////' + _0x41fced(_0x100b98._0x1d2c74) + '//////////' + '//////////' + '//////////' + '//////////' + _0x41fced(_0x100b98._0x1d2c74) + '//////////' + _0x41fced(0x283) + _0x41fced(_0x100b98._0x564c6e) + '//////////' + _0x41fced(_0x100b98._0x1d2c74) + '//////////' + '//////////' + _0x41fced(0x283) + '//////////' + '//////////' + _0x41fced(_0x100b98._0x51cc52) + '//////////' + '//////////' + '//////////' + _0x41fced(_0x100b98._0x4ac747) + '//////////' + _0x41fced(_0x100b98._0x564c6e)) + ('//////////' + _0x41fced(0x283) + '//////////' + '//////////' + '//////////' + _0x41fced(_0x100b98._0x51cc52) + _0x41fced(0x283) + '//////////' + '//////////' + '/////wBT9w' + 'clAAAACXBI' + 'WXMAAAsTAA' + 'ALEwEAmpwY' + _0x41fced(0x9cf) + 'R4nN29CXxT' + _0x41fced(0xb7b) + 'ybtJTSFBBp' + '6ZK0tFxKoW' + 'lE2WRr2Vxw' + _0x41fced(0xe27) + _0x41fced(0x783) + _0x41fced(_0x100b98._0x26635a) + 'dRx5EpjoLK' + '1rKpoGLaQi' + _0x41fced(0x34d) + 'haSltMm9Se' + _0x41fced(0x95f) + 'FZX5ve/7f8' + _0x41fced(0x6a6) + 'z9nPeQiF/y' + _0x41fced(_0x100b98._0x1fe890) + '/p9boXP+E4' + '2NikX/Myv0' + _0x41fced(_0x100b98._0x51467f) + '4LGrrGFu7V' + 'APhDw5tsmb' + '5vQF/+Yfh/' + 'aJ2XOuXPKb' + _0x41fced(_0x100b98._0x5e5244) + _0x41fced(0x528) + 'DK/z/pOvzg' + 'f16ozTn/3i' + 'FHgkOOkoPF' + _0x41fced(0x56c) + 'Da//+wvnRr' + _0x41fced(_0x100b98._0x52ecc6) + 'lQC+jARYkt' + _0x41fced(_0x100b98._0x52d78b) + 'rq/z6s531I' + 'ryI3XIoP33' + '+FtM37zTeR' + 'pXlyZHGtsD' + '2mDekYCtCV' + _0x41fced(_0x100b98._0x526f68) + 'RXzavoOaNP' + _0x41fced(0x94b) + '5SHc18mdMj' + 'YIXIXJi7Ye' + '6oYNj5+LUT' + 'ms/k9y/ylr' + 'THH6hQbPHw' + _0x41fced(_0x100b98._0x504e11) + _0x41fced(_0x100b98._0x52df5b) + _0x41fced(_0x100b98._0x474095) + _0x41fced(_0x100b98._0x37b09c) + 'ciuh76/dlD' + 'L3I5hxf2nh' + 'TXNtFN6HpY' + _0x41fced(0x82d) + 'z9zFn13728' + 'NWTbN2pFoj' + 'aYyqqZAWgi' + _0x41fced(_0x100b98._0x51e0b6) + _0x41fced(0xcc8) + _0x41fced(_0x100b98._0x175a7e) + 'eD4+3/m3rP' + _0x41fced(_0x100b98._0x30ad43) + 'dmRhwbCL4X' + '293EZf//vn' + 'p/kIb+Wj3g' + 'YCPES6UqGL' + 'DO0iyMep0J' + 'Xr10lK0jjT' + _0x41fced(_0x100b98._0x53caef) + _0x41fced(_0x100b98._0xe9f38c) + _0x41fced(0x66d) + 'BYBaD64iao' + _0x41fced(0xd91) + 'e5F1N/w6Xw' + _0x41fced(_0x100b98._0x22dbb9) + 'rvOPYWqdYO' + 'GBVJ86daOy' + _0x41fced(_0x100b98._0x45bc2f) + 'f4jFd/k18y' + _0x41fced(_0x100b98._0x13a011) + 't1CyLTXnHK' + '7zIOTP1Qur' + _0x41fced(0x9e0) + _0x41fced(0x805) + 'Pn5sbpsS2k') + (_0x41fced(_0x100b98._0x2768d7) + 'ST4kMMJqee' + 'i6OM+eRI6c' + 'A9YQpLXQ3F' + 'CaPzXNnwrB' + _0x41fced(0x4c7) + 'ofvPR/Dmte' + _0x41fced(0x74c) + 'IH+fIx8/fv' + 'hXaAXD9kmv' + '3sx7mO6lx/' + _0x41fced(_0x100b98._0x283688) + 'y7ojR0rb2c' + _0x41fced(0x6a3) + 'w9+uClQxLX' + _0x41fced(0xb12) + _0x41fced(0xce3) + 'ZLv0ufev+D' + _0x41fced(_0x100b98._0x1711d5) + '/NisTxuKF8' + '2fH3hpb3t7' + _0x41fced(_0x100b98._0x4e67de) + '+uPxPgpfy8' + _0x41fced(_0x100b98._0x479452) + _0x41fced(0xa75) + _0x41fced(_0x100b98._0x251cc1) + '1mUCMAXaOs' + 'iDE1lf0wDS' + _0x41fced(_0x100b98._0x2f9b93) + 'dMXlc6P/Z+' + 'gaGrJSuyYn' + 'g+6+jRCzn9' + _0x41fced(_0x100b98._0x16b793) + 'uQ5fjGHPdV' + 'RDZkF1+d6t' + 'u8fHuJ9eub' + 'ehwuEd+JjY' + 'yltK/m4y+J' + 'cta6QD8eFK' + _0x41fced(0x9ed) + _0x41fced(_0x100b98._0x55987a) + _0x41fced(_0x100b98._0x52f457) + _0x41fced(0x4d5) + '26QqJCGDmK' + 'BrmYEYV27i' + 'UVk1AGTwL2' + 'hJKeZdb/EV' + _0x41fced(0x2fa) + _0x41fced(_0x100b98._0x334ee8) + _0x41fced(_0x100b98._0x18703c) + 'sZGZFq9jR/' + _0x41fced(0xe34) + 'e/eMIm+C/z' + 'cC/91P/yL6' + 'WOzL+O25uZ' + '6UdWzQQzZE' + 'JmLoAv8aby' + 'TPBDbm4m5E' + 'I1QDlY+Pl/' + 'VTrihbdXSH' + '8k97K3xCpv' + 'rnw6fgxnjv' + 'JHulAGp0Fa' + 'Px/bIQS9Gu' + _0x41fced(_0x100b98._0x2da79a) + '9P0v0nXW9t' + 'y60YUNkA/g' + 'wOc+HzjAAT' + 'n51bngZ7RM' + 'kDpB2LJq43' + _0x41fced(0x884) + 'Dt19uKQOpG' + 'ak6gOLh3Sc' + 'M/DJHbkhFE' + _0x41fced(_0x100b98._0x5ee82d) + 'QlwsqTQ6fe' + 'kl45r/97Ae' + 'gc9+Lh5Ubv' + 'so80AM4MhQ' + _0x41fced(0x6d0) + 'f7HI4sMPvL' + 'oBo3ba7fwI' + _0x41fced(_0x100b98._0x226004) + 'uRDdtjtpyZ' + _0x41fced(_0x100b98._0x17749a) + '3XOZ7XjOi6' + 'T5EWwXQ9wF' + 'GtiPxIHHV1' + 'KDqUdfrKx4' + '/6ujyf9LPP' + _0x41fced(_0x100b98._0x18c0e6) + 'Um6M92Sep2' + 'lasqZNzezp' + _0x41fced(_0x100b98._0x179294) + _0x41fced(_0x100b98._0x26e78b) + _0x41fced(0x3de) + 'WQC7Fc3M0Z' + 'ueAPZL2rvD' + 'x10leTbiiK' + 'bC8KDFxgRw') + (_0x41fced(0x96d) + 'SOFUO3QNBb' + 'sG0KWByWL7' + '8TWV424Wiv' + '936HoEpv5m' + _0x41fced(0x84d) + 'Zl+wgAUJj7' + '92YTFyPxaP' + 'eVW2m2qeaQ' + 'Y2Fzrj/X0W' + 'hIqz6FaywU' + 'YbdcNq6znt' + _0x41fced(_0x100b98._0x3466f4) + 'Bn96R2rXqH' + '7RZEimoN0Q' + 'UhAEe1dST4' + 'owwTb5TVs0' + '6b+OtWfIiO' + 'cucVudm28h' + 'ayx70SJsGt' + _0x41fced(_0x100b98._0x349860) + 'JMMSI+Huy9' + 'ekR49+6ZjL' + 'gz/TDP7Mds' + 'g11A/bvriT' + 'c/0Z+9detM' + '3373uONsgT' + '8Qo7RkHf10' + _0x41fced(_0x100b98._0x2f6113) + 'ItTUIA+aHS' + _0x41fced(0xc52) + 'dPSaV80H0/' + '7LWP8zt6Pw' + _0x41fced(_0x100b98._0x152d09) + 'sJcp1ehsQP' + 'mfM2ORr1dp' + '9vGXW8eHjh' + _0x41fced(_0x100b98._0x98bbe) + _0x41fced(_0x100b98._0x15aa5b) + _0x41fced(0xcf2) + 'X44N63X3l3' + '2YPxqHXgL1' + 'gjwFg59Qg1' + 'iIqgNbAH+d' + 'Su1KA9mBcK' + _0x41fced(0xb38) + 'Ij6mxi7TX7' + 'cyMX79FuW7' + 'g2UE6h2iBX' + 'roNUGWjKfP' + '7Mtva9wx/8' + _0x41fced(_0x100b98._0x4abcc9) + 'rU8jGB8ioo' + _0x41fced(0xbb3) + '26N9efsW23' + 'dLTmB5UHvo' + _0x41fced(_0x100b98._0x123a3a) + _0x41fced(0xb09) + 'KYkRf3LA92' + 'lQgTTFctuP' + 'J4u+IsYj1v' + 'e1Phz21/vb' + 'PV4QcwLHzD' + _0x41fced(0x8c5) + _0x41fced(_0x100b98._0x3bc3c1) + 'G3xjc9viYb' + 'BljX3GMSsA' + _0x41fced(_0x100b98._0x1f31af) + _0x41fced(0x7ba) + 'vLXM+9ylhj' + 'DWAeonAUTB' + 'FKZ9MQYDYI' + 'oZ0vypqnAk' + 'zqdCV9KRYc' + _0x41fced(_0x100b98._0x4486c6) + 'SNTZw7ri5s' + '8LCzv4WwK5' + _0x41fced(0x897) + 'epjurypg2+' + 'uzeELqqy8O' + 'XPOu6qYgRl' + 'P0ZngOFF+L' + 'nRl7RR8jsV' + 'SfdNmEh3FH' + _0x41fced(0x207) + _0x41fced(_0x100b98._0x466858) + 'ZsN0SUZkfn' + 'PYhGRZfGQ+' + 'oRLVkPVJwH' + _0x41fced(_0x100b98._0x1a24ed) + 'p/P+H8zf47' + _0x41fced(0x663) + _0x41fced(0x285) + 'kNmW3A2Z6Z' + '3QCck7jtjL' + _0x41fced(0x217) + '8lfd6jdL4v' + _0x41fced(0xa73) + 'nZllv6VTdA' + _0x41fced(_0x100b98._0x5cf09f)) + (_0x41fced(_0x100b98._0x68d197) + _0x41fced(0x638) + 'QSN4/l53oX' + 'xbtjyV2KCM' + _0x41fced(0xd8b) + 'YrfZgtHUjM' + '5cKx2t0ZSR' + 'K5yj6x7+b+' + 'jXCbVVS2+W' + _0x41fced(_0x100b98._0x138387) + 'ozMwHacyGz' + _0x41fced(0xa39) + _0x41fced(0xa9f) + 'n6atNX1pnR' + _0x41fced(0x563) + 'P3P4yqAd/N' + 'VoTAJAO+yt' + 'mr+s6efjXp' + '7x1h4t+SjR' + 'lI5DmqYRky' + _0x41fced(_0x100b98._0x14e9d6) + 'pGoQTPUPDe' + 'Lb0WjmU4PN' + _0x41fced(0x2b6) + _0x41fced(_0x100b98._0x26814d) + 'CzwcGLJhrt' + 'T7V2+/ZOn7' + 'Ae49Ztn3vc' + _0x41fced(_0x100b98._0x4c27d7) + _0x41fced(0x9dc) + _0x41fced(_0x100b98._0x258ca8) + 'MNvZ/W+Pvj' + 'R26h9uXhHo' + _0x41fced(_0x100b98._0x232f42) + 'SAifbqr+Y/' + _0x41fced(_0x100b98._0xf7cd47) + _0x41fced(_0x100b98._0x8b8886) + _0x41fced(_0x100b98._0xbd703c) + 'fMWk3POtYe' + _0x41fced(_0x100b98._0x4f82ad) + _0x41fced(0x9f5) + 'uPIEYoQA/n' + '75A+W4SyHr' + _0x41fced(_0x100b98._0xa4d230) + '1FIWWYyn78' + _0x41fced(0x34e) + _0x41fced(_0x100b98._0x361cde) + 'FhoRp51pIR' + 'gmKoffe+Dm' + _0x41fced(_0x100b98._0x32623b) + _0x41fced(0xacd) + _0x41fced(_0x100b98._0x487bc) + 'KIxVr6bOct' + _0x41fced(0xa1a) + 'Z/cHsgA2Av' + _0x41fced(0x20a) + 'bBZZCJWhPZ' + 'E6C9DMCRC5' + _0x41fced(_0x100b98._0xef0efb) + 'd3rpJ1ssI/' + 'MWvJSV2y/B' + '2tF+BMCb47' + _0x41fced(0x2db) + _0x41fced(0x861) + 'qEUNNIB0m/' + '5IN/7Nc77X' + 'HgCdh55OG8' + 'rnqwp0IxpP' + _0x41fced(0x97c) + '114PZxnrKE' + _0x41fced(_0x100b98._0x356604) + 's3p0nlfXm5' + 'vb8kZnZcYy' + _0x41fced(_0x100b98._0x39ecd1) + 'PRKMJV7c/N' + _0x41fced(_0x100b98._0x3ae155) + 'CtvmVJY68V' + 'plcVbFgfRT' + 'lcxhC3A2Tm' + 'MicJXrw9f9' + '/UHSN3jyA6' + 'nwZpoRFpoV' + _0x41fced(0x6eb) + 'b+QRPi+VDw' + 'ZTwa4FIXUW' + 'QDDYBRhR5Q' + 'FobIgPzju7' + 'PBzirecFym' + _0x41fced(_0x100b98._0x4f49a0) + _0x41fced(_0x100b98._0x4e34b2) + _0x41fced(0x24a) + _0x41fced(0xd1a) + 'pzY+25MYxM' + '+A2TOBecz/' + 'qc3DR927xn' + _0x41fced(_0x100b98._0x4eb1fc) + _0x41fced(0x5f0) + _0x41fced(_0x100b98._0x2022da) + 'shXUPotuqR' + 'In5fSDczBs') + ('5rRgZG6aT2' + _0x41fced(0xe0b) + 'm+/94Xzipd' + '+ankUq3qIT' + 'l/XF4+Fd6L' + 'vl7z+uuKIF' + 'yQn19QsED7' + '5MXVm9RqAF' + '8ZQFmuA/wF' + _0x41fced(0x43d) + _0x41fced(0x6c7) + '76zPPpq+xv' + 'mC7qyG3Nxq' + '5G+AMshFVs' + '4EiNK5xXpo' + _0x41fced(_0x100b98._0x589ed8) + 'VGo4zikitj' + '9bSnCyDI88' + '32YNAOvF3r' + 'EnDTBu28Hb' + 'rhXtoROKt0' + 'jfBwYePY7u' + 'TDf7iEkjAA' + 'bJiL/wCsAB' + _0x41fced(_0x100b98._0x3906d1) + _0x41fced(0xaaa) + 'WzCBOzGfrp' + _0x41fced(0x236) + _0x41fced(0xb55) + 'wp2aoCkTYe' + _0x41fced(_0x100b98._0x793e49) + _0x41fced(0xcdd) + 'iS9chkdaei' + 'dzPBhLYEnx' + _0x41fced(0xc35) + 'sWaPmmaMv/' + _0x41fced(0x7cd) + _0x41fced(_0x100b98._0x17d4e6) + 'wK9jFpi3/6' + _0x41fced(_0x100b98._0x37ff5c) + 'wGdL6eH/bQ' + 'zo3rekcV1L' + '+0TgfI9BlB' + _0x41fced(0x93e) + '7PXL8f1e1a' + '8jFMp+JLGg' + 'Ew+/25EIPc' + 'XMDwDeTme6' + _0x41fced(0x212) + '0eIsv4F8HO' + 'KSz9Gm8D32' + 'QJfdrgLkBa' + _0x41fced(0x876) + _0x41fced(_0x100b98._0x3b5e8e) + 'xgzPLs0fU/' + _0x41fced(0x3e3) + '9Khs+iFuiQ' + _0x41fced(_0x100b98._0x1c4ec5) + 'uQ6fStPUnB' + 'cFW5jY4bwX' + 'Ue5G/XLOj6' + 'QC44qvutSE' + 'NB3fpCFe7a' + 'zxrL5zN1BH' + '1Sudzrz42R' + _0x41fced(_0x100b98._0x22c944) + 'WShwkJpTHp' + 'g4SdRHf2kl' + '7N3qWx7co0' + _0x41fced(0x825) + _0x41fced(0x316) + 'rBetnbFyVM' + _0x41fced(_0x100b98._0x5def4d) + 'vyKA+qaxxQ' + '2gUQBTM20l' + '0/xPjnpDXw' + _0x41fced(0x46c) + _0x41fced(_0x100b98._0xd8a9c5) + '2Vm+uoLvvp' + '3ZUX6dtM0b' + 'uqBvwdFqDK' + _0x41fced(_0x100b98._0xe252f4) + _0x41fced(0x9fe) + 'YEQcQjAMHl' + 'wV+pgjYBWC' + 'drUHzSY7Gh' + _0x41fced(0x93d) + _0x41fced(_0x100b98._0x160bc6) + 'oKMsm9m/Id' + 'nD6xhgiKiC' + '+yr4qoiCDt' + '4uJg690c+/' + _0x41fced(0x6df) + 'wCTALQFEkP' + 'DPE44N89Kd' + 'z4JwHrf1yJ' + _0x41fced(0x1b7) + '5lZe7dxHTc' + '5fNV72+Wc2' + _0x41fced(0x54c)) + (_0x41fced(0xc87) + _0x41fced(0x71b) + 'iG6kqNC7fu' + 'DXefJay9cR' + 'j12gt5Do4Q' + _0x41fced(0xbd4) + 'YgVkVU3CsK' + 'VIygKKU7oN' + _0x41fced(_0x100b98._0x4454d9) + '6rB09/Jvv4' + 'Qhf7OfRccZ' + 'DZmuyXWuq3' + 'LqM7fe9aPb' + '2xhfMx42hJ' + _0x41fced(0x275) + 'DHZy1FA8aU' + 'AsBdrkZw4m' + 'C0FK7GnNyM' + _0x41fced(0x89d) + 'any4FFp+1d' + _0x41fced(_0x100b98._0x56ad40) + '3KSbVC9IAN' + 'CYjbSUHeDD' + _0x41fced(0xdbb) + _0x41fced(_0x100b98._0x3dffb2) + _0x41fced(0x809) + '4Fjg/4W2nC' + '9zMcXCSrA6' + 'rRRL6repq+' + '1Xv7WK+B09' + _0x41fced(_0x100b98._0x11d70f) + 'P7fJP33yi0' + 'eHGpbxiK/s' + 'nhvDO1QLJC' + 'xEPjUIwGsJ' + 'zPZoyoTtf3' + 'zprMjhxo/j' + _0x41fced(0x5d1) + _0x41fced(_0x100b98._0xe7fd04) + _0x41fced(_0x100b98._0xa3ab5b) + _0x41fced(0x9c1) + _0x41fced(0x1fc) + _0x41fced(0x657) + _0x41fced(_0x100b98._0x4225ab) + 'JZGVOk1WVM' + 'w/gAqsx/Wh' + 'f6AKaN27DO' + 'ibcC3Z9c/A' + _0x41fced(_0x100b98._0xc1aa6) + 'jNz86hAIDQ' + '+FAOKg7YzC' + 'Cj4WxOhpDK' + 'Ha0aUFDFPg' + 'S3FoMIKP35' + 'WuKxYPnTkL' + 'dMHg2cFr8H' + 'Pk6sQqArpL' + '3zjt7lFDAn' + 'Tm/t78WRYG' + '0QgP4xuYn3' + '7rvb686fCx' + 'KToLNW2unz' + 'kJWZQjAAWZ' + 'BIUxk09pEE' + 'oLpVHxsjfk' + '5BGH7JDWjK' + 'wbKGahCkAi' + '5zUPsU34x5' + 'FbzgJd/3Np' + _0x41fced(0x79b) + _0x41fced(_0x100b98._0x70a6b1) + _0x41fced(_0x100b98._0x17c980) + 'ARlIaGf/Nk' + 'tvX+qQr1fy' + 'iP6n7Bm1Hm' + 'h0yW8yhj9h' + _0x41fced(0x9fa) + '9OlB02anD8' + 'r8uVW5/tys' + 'tvkEfQigtP' + _0x41fced(_0x100b98._0x830444) + 'unZpQCI/m3' + 'T5WIWHoJ8F' + 'Joq7gl1aF9' + 'Tbg2ngt8Ny' + _0x41fced(_0x100b98._0x520fee) + 'zhSxfPm154' + 'eWOJQwAF3A' + '4xgQ3A50DJ' + 'VADAOBn/d6' + _0x41fced(_0x100b98._0x4d239c) + _0x41fced(0xb2c) + _0x41fced(0x2a8) + 'LPRpkFerId' + 'dc5kdm9Xub' + _0x41fced(_0x100b98._0x3d9cb6) + 'OfzMnF++AH' + 'sDS1GTZXte' + _0x41fced(_0x100b98._0x3f126b) + 'NNyvIeChMA') + (_0x41fced(0x3c5) + _0x41fced(0x4df) + 'OFI9x+y9Hi' + _0x41fced(_0x100b98._0x1f7967) + 'MPr1qy9MAc' + _0x41fced(0xda2) + 'hFscSWKjRq' + 'UiO+rIiNfS' + _0x41fced(0x6fa) + 'b1GB55qbP+' + 'VfvbJYbMqf' + 'ZTHiUCzIlA' + 'ihQtlPxXNn' + 'bi1/Zj7brL' + _0x41fced(0xc97) + 'La/O96/76A' + 'dv3X8Tatm0' + _0x41fced(_0x100b98._0x4850ce) + _0x41fced(_0x100b98._0x1ad3fa) + _0x41fced(0x592) + 'rrgPab91u+' + 'C9ajw99YVm' + _0x41fced(0x814) + 'o5yxO1WvQ2' + 'wsUEBEeKhZ' + 'ixoApFoUw4' + 'YCAkVM7Fx8' + 'PqGO8537RD' + _0x41fced(_0x100b98._0x117921) + 'AUd1rsMIri' + 'V2761XjBw6' + 'bctB5U/M88' + '/TnfvKoLoM' + '2jOry2yrj/' + _0x41fced(0x710) + 'EwB63Y3hht' + '4eBoPPbUZ7' + 'Apjx1JXKqf' + _0x41fced(_0x100b98._0x8c3032) + '1nl7h38oKm' + 'ApCrenX+fg' + 'EILClExjAc' + _0x41fced(0x310) + 'I00VkeFHiK' + '0F0FggcQ0K' + 'KW0AUHnaGn' + '++21Y6tIE3' + _0x41fced(0xdaa) + 'fnOp/tHoZg' + _0x41fced(0x879) + 'qvLgOoYl83' + '0Xd/fdO/Sg' + 'hBSzFNj0yy' + '/CO7JxXRtW' + 'UYqieQhaks' + 'bejwCVsWtH' + 'x7rNHIYtsb' + 'VvwlQis8z1' + '13YVkMKPTJ' + _0x41fced(_0x100b98._0x10bceb) + 'cxm31DlSNC' + 'I2SLIKHMQl' + _0x41fced(_0x100b98._0x1f62b4) + '9k7OvzpSfr' + '724J1jWaCq' + '3/lx+ACcz5' + 'rotC1j195q' + 'dvqcWdUovK' + 'oZbaHN3/j6' + _0x41fced(_0x100b98._0x4c34e8) + 'oSGkZuCn+O' + _0x41fced(0x23a) + _0x41fced(_0x100b98._0xdb44a2) + _0x41fced(_0x100b98._0x434484) + 'Qm+bYV1ggo' + _0x41fced(_0x100b98._0x4bee86) + '3oM7tdmKEC' + _0x41fced(0x5f6) + _0x41fced(0xdc0) + 'igAF2aIhnh' + 'XRCwpQIgo+' + 'ocalLFry0L' + _0x41fced(_0x100b98._0x3a76a5) + 'lEUscmMsGe' + '2v9vvBe1ec' + '/2BGk1OaS5' + 'xZCDGxqiFr' + _0x41fced(_0x100b98._0x233820) + _0x41fced(_0x100b98._0x2dff35) + 'BOjqCgZRFM' + '9i6bvGIHTZ' + 'wRIur4RvjT' + _0x41fced(0xd71) + _0x41fced(0xb20) + 'cq99VVCooK' + 'IMooNAUFae' + _0x41fced(_0x100b98._0x2b0d09) + 'SKCqIiO+hE' + 'JapApIirAr' + _0x41fced(_0x100b98._0x5b6275)) + (_0x41fced(0xa54) + _0x41fced(_0x100b98._0x21bd35) + 'urfh+9+pMZ' + '057ZBPuQpB' + 'iuYGStTqrS' + _0x41fced(0xce8) + _0x41fced(0x76c) + 'PD2qgR201D' + _0x41fced(_0x100b98._0x145bf4) + _0x41fced(_0x100b98._0x1f8f60) + 'XWo2/v/Q+J' + 'iCAiayJYd0' + 'XvGG4JiIIk' + 's2SqIouoZi' + 'RFdCiggCgq' + _0x41fced(0x57c) + 'd5r0AFyplF' + _0x41fced(0x9b8) + _0x41fced(_0x100b98._0x1c0c50) + '9KJenoEwkb' + '5mjMcBbMxr' + _0x41fced(_0x100b98._0x3868a7) + 'lfqK6uRtBl' + _0x41fced(0x6d2) + '2wnUfFQ4dM' + _0x41fced(0xcc3) + '6CITvYu4K8' + _0x41fced(0x9c8) + 'r46r/ZfiUj' + _0x41fced(0x986) + 'QsuXKdcGFZ' + _0x41fced(_0x100b98._0x1c945c) + _0x41fced(0x2af) + 'iKCaKCVtiu' + _0x41fced(0xa8d) + 'DS2pQmPFDt' + 'Lc/lF76gUk' + 'Phvay40Ac3' + '/s1Emrp3y0' + _0x41fced(0xbf8) + _0x41fced(_0x100b98._0x2ae62c) + 'M2376n47+h' + '9uaoQnXvn9' + 'Vat2hY6gGL' + 'ZDV9ssPzOI' + 'YXjocPEIy7' + 'el66Ku0k+3' + 'VPxLBytuRC' + 'QUfWN4RwAx' + _0x41fced(0x8db) + 'CIhFdATEBV' + 'FCBazNzUsm' + '59dHHjTTPf' + '7ZDXr2+h5q' + _0x41fced(_0x100b98._0x1124bc) + _0x41fced(0xa00) + _0x41fced(_0x100b98._0x12a399) + 'fsgqd0DZJz' + 'OvBP7dMmTg' + 'lUw8FZDM6p' + 'XxrZHQ93p0' + 'nk+DELl5mk' + '99hdghFZM6' + _0x41fced(0xa6d) + _0x41fced(_0x100b98._0x17153c) + 'rvzeKOe0zU' + 'OdV73J0CJ1' + _0x41fced(_0x100b98._0xaad792) + '+KkGPR9moy' + 'SiEFREZ+WW' + _0x41fced(0x390) + 'az79p2f772' + '/cC8tge/n2' + 'T2c3rn/bfL' + 'VTAaA6v+BC' + 'SP/cnmutGp' + 'uVlYlhF5bj' + 'KGvxgRPe3j' + 'ptBeGRgcvK' + _0x41fced(_0x100b98._0x1f8db4) + 'qrFyxQrM1H' + _0x41fced(_0x100b98._0x51e71f) + 'zFX/S4vSuN' + 'D0Kw2G7X7H' + 'xQSzUd3f30' + 'a9+Wh8/bem' + 'dl+7QpLynv' + '3VX4PmcYCK' + 'Bcsf0BS0kD' + 'KEB432hrDP' + 'cxSiGmdkFs' + 'zBF0rbVJfH' + 'PUGxXppBBs' + _0x41fced(0xa26) + 'nZNEqdVxa3' + _0x41fced(_0x100b98._0x744af8) + '4E5i/LXGvx' + 'ZrHkY8G+/1' + 'zBfFaf4+kZ' + 'ayrm0PZMJp') + ('kYaQFg05yr' + 'tky+9yaW96' + 'BwQfbn37/b' + 'ghG2oL0+A9' + '0dCNo1YcJB' + 'NCW/FdYVSy' + _0x41fced(_0x100b98._0x4d8939) + 'ZnV4aSXbl2' + _0x41fced(0x1c7) + '4F5+db1S0k' + 'iY+YBKFXAP' + 'qyaib5z2+0' + 'OjOVLo+GJ5' + 'NKGIFcuSms' + 'LdhxdlOWhc' + 'UKmo8rB+W4' + 'd14oOZP3/m' + 'fdI8rwqAOm' + 'OFTaSgsWz/' + _0x41fced(0x692) + 'atLsjEf8jP' + '+f5/12e+Vg' + 'wYfOK/eO+J' + _0x41fced(0x925) + 'IuMBI69L3f' + 'dk77/NthXb' + _0x41fced(_0x100b98._0x3d26b3) + 'bfFtffXO0h' + 'XMLLJqzu4L' + '5usU3HVXpL' + _0x41fced(0x343) + 'qoiqa9eEx5' + '1vQe9wKF0e' + 'RbY2/hryd+' + 'T6msKVo2bO' + 'mlQrgELAQt' + 'd/2m6bes8+' + 'B0ATvqG1HJ' + 'gJXNbmaxoN' + 'BxY1lgMw2j' + _0x41fced(0xd6e) + _0x41fced(_0x100b98._0x31a36a) + _0x41fced(_0x100b98._0x3727b3) + 'xSJoIqY1Q1' + '4H33rjQfO3' + '3K/tb7Q7sy' + 'wxnsRyc6fC' + 'c7BIIaIiUq' + '6wiyOCKO4q' + '2vur/QKIkg' + 'ISIx8Zb65c' + '/5dP/2m1zf' + _0x41fced(0xa44) + 'Yyml1Lpij2' + 'NsytroDosK' + _0x41fced(0xa15) + _0x41fced(0x9a4) + _0x41fced(_0x100b98._0x596f5b) + _0x41fced(0x57d) + 'N7WhX4gvVT' + 'Ft69zUsrik' + '5WicZe0Oz4' + '1cejSod2qQ' + 'GjOZINgM9m' + _0x41fced(_0x100b98._0x487ae9) + 'K6xb5z7rKF' + 'FERaHksrIX' + '7/rXoSsijF' + 'WTIl8QDkCr' + 'HZ/jYFoUNS' + 'tREam+bumQ' + '89zeFTzpx9' + 'm3KLU+/SjM' + 'vD8ad8ki+G' + 'g85nhxMX30' + 'ddo8FrN4GN' + 'dFHw4y4W9Z' + 'd62ZEY37Xk' + 'TeZT9Dw2Kf' + '/kL+nStWUB' + _0x41fced(_0x100b98._0x499526) + 'c817KcOD0D' + _0x41fced(_0x100b98._0x44663b) + _0x41fced(_0x100b98._0x441ca9) + _0x41fced(0xb7a) + 'Y3a8KkzYuW' + _0x41fced(_0x100b98._0x1cf61f) + 'bf0rF5bUmM' + 'ZruwMZrp0a' + 'OnfKefqufS' + _0x41fced(_0x100b98._0x122759) + _0x41fced(_0x100b98._0x5b0bf6) + 'dV4ZY5C2kM' + 'XLWiwpHmgx' + '8dHncNyWNO' + _0x41fced(_0x100b98._0x1f805e) + 'XDiou2ls1d' + 'X15dkAlVpA' + 'ydAMj3/9M7' + 'svQVinFxaq') + ('q9wQUf71Ti' + 'PfYgb+zYIb' + 'bjRNM3oOv5' + _0x41fced(0x8a4) + 'AZK7vK9i+4' + 'CkSFRu+6sW' + '0ngbwCPsPy' + '7kazu1FUTD' + 'vl9e1VS4dw' + '7v+sEI+naP' + _0x41fced(0x98b) + 'uJqcJ9b5VD' + 'JJz59zTWrt' + '83l8flVVAa' + _0x41fced(0xd04) + _0x41fced(_0x100b98._0xba68d4) + 'wRgJRVV5dD' + 'GWTR89v/sr' + '1H52E0wJHf' + 'Fa67zl4kmo' + 'Zj0qorCLyd' + 'Xw62yd+Srt' + 'H0X5hRt6Cm' + 'UUSIkpYVz9' + '9VWgmguEIr' + 'du1zaKW7Sm' + _0x41fced(0x233) + 'LS1ko9dFSk' + _0x41fced(0xc1c) + '9M3X5uqCVF' + _0x41fced(0x859) + 'wwsX5DaVt2' + _0x41fced(0x523) + '9Bmf39ZIGM' + _0x41fced(0xcb1) + 'becaxpO9Z4' + _0x41fced(0x2ba) + 'j2KQGLRAFg' + '3eeGCw1fQN' + _0x41fced(0x3a9) + _0x41fced(_0x100b98._0x3a5829) + 'YinU6EQR58' + 'T/DPl5sGOf' + 'Tp/q+o1/04' + _0x41fced(0x491) + '27PCekqaJh' + 'YVvMtgKzEB' + 'eGUQBG2SdW' + 'rq/p+v9Y+F' + _0x41fced(0x68b) + 'Wuzb7Zdzvg' + _0x41fced(_0x100b98._0x14de9a) + 'SA8nKHhY4s' + 'thAIDQMYeW' + 'PhFeW/d00S' + _0x41fced(_0x100b98._0x4d91f8) + 'zkrJv5MfDt' + _0x41fced(_0x100b98._0x3b5bfe) + 'LTUFVEWSwp' + 'dri7Djk1K8' + 'DBHwHsWWJx' + '7FrffS2/cv' + 'nWsaGU0tI9' + '134tUiQsX2' + 'rbXU1U2SFj' + _0x41fced(0xa94) + _0x41fced(_0x100b98._0x147016) + 'FE9AqpnxMG' + 'bRNk6f4wUs' + 'MsHkJsJtnN' + _0x41fced(0x3b3) + _0x41fced(0x1f8) + 'ycXvRXiHiD' + 'drDr4aNNe7' + '4l1q3WuWQx' + '2rki05KNUN' + _0x41fced(_0x100b98._0x102d5d) + 'kI1jd/ETv1' + _0x41fced(0x1f5) + 'truWek9GU0' + 'IIOfYBrsrC' + 't3fKLgAnyJ' + 'QKtRMWThla' + _0x41fced(_0x100b98._0x475d84) + '1QBQVlZQxt' + 'VvnWKbcTqE' + 'LZDPilrLqc' + 'LLJZPyEUtQ' + '7AQ3hd7876' + 'ZyB9KMcDD/' + _0x41fced(_0x100b98._0x550a6f) + 'eXLqBYsamD' + '2ELo2EhiA/' + 'Xr/bCy5p5z' + 'RvRc12N2+K' + _0x41fced(_0x100b98._0xb93c4e) + '8/FIl4AlCg' + 'EbAsXwlwzh' + 'cAzLJgb6H0' + _0x41fced(0x2da)) + ('SsSrHWpZHM' + '9ulmmo9bEg' + 'iav1BVDpTo' + 'Hy1scrLIKZ' + 'RVL15ZVtCu' + '3+n6y7LeIV' + 'SItFlg1R8B' + _0x41fced(0x603) + 'u6oxqf/uft' + 'DVd9O7rOBv' + 'WyCT5tAoZA' + 'RRBrCfrktV' + 'CQJ/fckHp1' + 'Xj13jbpX4Q' + 'mA9drvfW5I' + _0x41fced(_0x100b98._0x163e8e) + 'XtzYorxgUe' + _0x41fced(_0x100b98._0x134101) + _0x41fced(0x3f0) + 'wl/05WeNpg' + 'pwKujyC7Wm' + 'hdecW/MmIf' + 'lAystZOQGL' + 'Ls6+WwTfM2' + _0x41fced(0xda4) + 'nZnp5MXLo/' + '/WBJW/BDD3' + 'CnDol6ufLi' + _0x41fced(_0x100b98._0x33aa40) + _0x41fced(0x29e) + '9lR3yDnjB1' + _0x41fced(_0x100b98._0x59a53e) + '573rI5Sc3F' + _0x41fced(0x947) + 'lG1KjwZZEI' + 'RQRCQKu4Yu' + 'iDvXufPa87' + 'XFtbW7s//G' + 'yh78FxyzQD' + '7e/HbvLpdQ' + 'r4REFUFSEK' + 'C655f88qr6' + _0x41fced(_0x100b98._0x39f279) + 'QVk5vFhVlX' + 'XbmpndNPvF' + 'aiCZ70J5WR' + 'U0AQ9WP+mg' + _0x41fced(_0x100b98._0x171614) + '2Xr7/mgyIp' + _0x41fced(0xadf) + 'v+1I+eXJeZ' + 'wbzRRsAAiy' + _0x41fced(_0x100b98._0x20b102) + 'ftGSejBlxx' + 's4c3CdgTJB' + 'UObbRa4a4u' + 'yF0P66wqrJ' + 'Uy5wu93uxe' + _0x41fced(_0x100b98._0xbe47f8) + _0x41fced(_0x100b98._0x2431ef) + _0x41fced(0x6a9) + 'BLov65nhn4' + _0x41fced(0xab3) + 'HLVs9a3l5e' + 'ubN2y9qKol' + _0x41fced(_0x100b98._0x11dfeb) + _0x41fced(_0x100b98._0x4ec3ef) + 'e3fPB/KCxI' + 'U2W15/eX9O' + 'aHut9dvW1I' + 'ZN8xat/eRG' + 'h1kpYTEyaC' + '0oapBqMTLs' + 'ghr8VlXmq9' + 'i5aZvt0Wup' + '4eyxTweq3/' + 'MBHEqKO6/e' + 'lqNr+X1/rZ' + 'nfx+38ypRO' + 'vDwFsqli5g' + 'zfOIxTVVRK' + 'iqh6L6a3PL' + 'd46qLZ66Ec' + 'A+CoaavLoI' + '08f/5H3Hzf' + _0x41fced(_0x100b98._0x4d7e3f) + 'ZtHX7fUohM' + _0x41fced(_0x100b98._0x399d34) + 'h2/YldomeI' + 'lTdPM6+70x' + 'EzQg2J8LYs' + _0x41fced(0x1d7) + '3ZFMxNB99M' + 'O8QiqgZQ5f' + 'rePeNWWscs' + '2zTPTPWJ9T' + 'wLzCiiauKo' + '5m/z9A7RJ6' + _0x41fced(0x6f5) + 'HFzo9cqKq8') + ('63OPr0Z/9Y' + _0x41fced(_0x100b98._0x32f24a) + 'vYMCuqyzat' + _0x41fced(_0x100b98._0x3cb306) + 'ywed1HmRc9' + _0x41fced(0xe02) + _0x41fced(_0x100b98._0xa3c9eb) + 't4AUJ6IqBl' + 'SQJMCQS6NY' + 'K1LRCaI4qS' + 'CSAvdSVCko' + 'ja76eFzN3U' + _0x41fced(0xb47) + _0x41fced(0xbed) + 'hQJRpTi3TH' + '3J8/cOQ5z0' + _0x41fced(_0x100b98._0x5b7783) + _0x41fced(_0x100b98._0x5ea37a) + _0x41fced(_0x100b98._0x23d84a) + 'nnWbmUnMzF' + _0x41fced(_0x100b98._0x5e7476) + '5raxrMAYoK' + 'C6Wqe+v3xg' + _0x41fced(0x2e0) + 'x5lj8+M35W' + 'TgPLuBn7ED' + _0x41fced(_0x100b98._0x373740) + _0x41fced(_0x100b98._0xd0c77e) + '/rvqs0LaJt' + 'qnA51va0Nz' + '380Pet88ym' + 'omiBDD5REp' + _0x41fced(0x3a4) + '1xTjLFNvfA' + '4WAV2s6lop' + 'E95U8AKoZp' + 'FOOC+88sNq' + 'OhbKqwBzdN' + 'VlZQBzNnG6' + _0x41fced(_0x100b98._0x3e2025) + _0x41fced(_0x100b98._0x42c5bf) + 'slRcsu+sYZ' + '3d9UHq7RBX' + 'sGguEXVQ0Y' + 'KyejWTrGKU' + 'VMEF8UmWRz' + 'e9u9ZZ6Cyu' + '+WMk6dUFSy' + _0x41fced(0x976) + 'IFYotSBinF' + 'z2ecQSB4CJ' + 'K7z+N7V7ln' + 'GXD5llaqCi' + _0x41fced(_0x100b98._0x29793e) + '3cD++7+f2m' + 'cbStCmV1O9' + '6I6moYM3fb' + 'zG6aBVCNSb' + _0x41fced(0x50d) + _0x41fced(0x30e) + 'VTv7wwqgsY' + 'w+/LZwhoQY' + '1r3UjxkQwi' + 'C6bRWt4yd9' + _0x41fced(0xe0f) + _0x41fced(_0x100b98._0x2f02f5) + 'QT7zSiNVBr' + 'hBdBqXCIqi' + 'wClfjMvPOn' + 't3+wyfrqJ3' + 's0FyB/yyqm' + 'vECLmqS3rj' + '/wEHjH0uoy' + '9NKrmDSid2' + _0x41fced(_0x100b98._0x1701a0) + 'ql1OK6Y9G1' + 'wHj1el3wHr' + '+b9ZmEFwl+' + 'ITRUISGoHg' + 'H11IJEy/Ai' + 'gU7wQl2qK8' + 'Ky53X7BJnD' + _0x41fced(_0x100b98._0x27ce8b) + 'A1D8tVaQMf' + 'zNPkQW8fdl' + _0x41fced(0xcf7) + '3Pac+ck4cR' + _0x41fced(_0x100b98._0x8c105b) + 'sVFF5/Z3jT' + _0x41fced(0xa17) + _0x41fced(_0x100b98._0x19b73e) + _0x41fced(_0x100b98._0x3e410c) + _0x41fced(0x29d) + 'w9prvTxuKY' + '4YAUIQAWFD' + _0x41fced(_0x100b98._0x2b72ff) + 'WPC2WVJCk+' + _0x41fced(_0x100b98._0x33a3c9) + _0x41fced(_0x100b98._0x3d69fd) + 'GPl3uV0sXl') + ('HCPkxlH2Ly' + _0x41fced(_0x100b98._0x39e82a) + '2evPkebESR' + 'FUV0UaBAVV' + 'XTkmVdo6+s' + '9KxbXcWC/i' + 'xFV1adlZW/' + _0x41fced(_0x100b98._0x48d9d4) + 'oNZXO8Vy2w' + '6T+Fs4b1fL' + 'g1a/Hnbl9f' + 'oYAXc+asxm' + 'XTB/6dmMqR' + '0W6sZFkOh0' + 'o4/7Ls2SZJ' + _0x41fced(_0x100b98._0x57454a) + _0x41fced(0x951) + _0x41fced(_0x100b98._0xfcb420) + _0x41fced(_0x100b98._0x55c1da) + '7Unjc12M4v' + _0x41fced(0x21d) + _0x41fced(0x25c) + 'uNiAxqGUrS' + 'dI1ugsUYMM' + 'bI+Vbbk+1/' + 'PHtYfyW0F9' + 'SKHiwUaFQU' + 'qMUaCAKA5u' + _0x41fced(0xd02) + 'KCERReJVSN' + 'PvCkwyUBVE' + 'ggkd5H0qgi' + 'gTxsSAqStZ' + 'pCLxgeygum' + 'NT5krWVyWr' + _0x41fced(0x729) + _0x41fced(0xaa1) + _0x41fced(0x5a2) + _0x41fced(0x3cc) + 'z0Fbb1mZUY' + _0x41fced(0x2bf) + 'mlfRPocISi' + 'uaQ1jGgxIG' + 'BFCBNuRczi' + 'd2MSpaBflT' + 'cFpWb7guHj' + 'XipriLE8lm' + _0x41fced(_0x100b98._0x357593) + 'Q0IkEFvr9E' + 'z3OnwqZ6RV' + 'S8oiKrLhnU' + _0x41fced(0x4cb) + 'OgaQ3XH6B4' + 'sbzsPqApW6' + 'Zu8DEfHq2c' + 'bNiw4exh3Q' + '6vkQkAOcyA' + 'aDTSx3jhIm' + 'gcB7xbFBVR' + 'rFQgWxTAp6' + 'hc86a5Dl0Q' + _0x41fced(0xc26) + 'Sf4gYFhZqM' + '5ocIPs3rdV' + 'V665D5ZUoX' + '3bZqDBAFKv' + _0x41fced(_0x100b98._0x19b029) + 'Uf6Oo+9ta9' + 'zcBsjFUH0r' + 'wK3Vc+7muR' + 'CLM6LUam6x' + '6h1nBetL+G' + 'U4bOIbFJHK' + 'oqIo2cxAZL' + 'oDRLgUpgB6' + 'tbKEeToFFE' + 'l0md5NWThB' + _0x41fced(_0x100b98._0x1a40d3) + _0x41fced(0x761) + 'YSjXKaA4Yp' + 'q/rqhCWMLs' + _0x41fced(0xe03) + 'VDrarKlBJF' + 'GL+X/XlrbL' + 'dnaXjDbFKG' + 'vizLTLaXQf' + 'OdWxZu2MTe' + _0x41fced(0xd3f) + 'wNrHm3rljx' + _0x41fced(_0x100b98._0x1dae28) + '0kcBk5KdQd' + 'jBW5J+ETUJ' + _0x41fced(0xdb3) + _0x41fced(0x50b) + 'coKTK4WLYd' + 'ZNlVoniM7J' + '5AZFF05UGV' + 'ykONpPhUGa' + 'KWrNoGsYG4' + 'oMRJ3BTkGG') + ('gglUKNPJG/' + 'L/PAKmyYZY' + 'vpVSdFwuKz' + _0x41fced(0x89c) + _0x41fced(_0x100b98._0x22ca45) + 'UXc5Yr4Yjc' + 'XGQ52IRY2K' + 'C3PF6K1rM0' + 'HTKN4ARRVb' + 'XWIjddY1b1' + '00h+4CuRbN' + 'BZBBdIOEtU' + '2yTxRdMnKq' + '1wFSLTfnyw' + _0x41fced(0x393) + 'u8ehqKOyIF' + 'PwuFwSDzaw' + '1gCUhk0Tpr' + '//+DrmoifQ' + _0x41fced(0xdd2) + 'gyUl1G89Cn' + _0x41fced(0x7b8) + 'Uu3yMf/i2y' + 'eVMd5XRqLp' + 'VZ9Y5XEGWA' + 'TcCBqDQKik' + 'ihoFbKFks5' + 'r6px8UaoAC' + _0x41fced(_0x100b98._0x17ca43) + '6ZIrVEXGJK' + 'RSAUqdOInA' + _0x41fced(0x2e8) + _0x41fced(_0x100b98._0x3282aa) + 'mXhdcp2sQV' + _0x41fced(0x2c7) + _0x41fced(0x4e6) + 'JMRjYH5vj4' + _0x41fced(0x29a) + 'VvldV2ZljJ' + _0x41fced(_0x100b98._0x48d57b) + 'r+Uds0qmNx' + _0x41fced(0x26e) + 'k+XiKDWrKr' + 'iTy/fncc3A' + '2srAkNQSH2' + 'aAU3Ni4o4P' + 'a40L+VQAaV' + 'iqzYCyWsYF' + 'QWK4Rbr12i' + 'gohKWAWvQ1' + 'SI1+GqQ4Gm' + 'EEHhnLJkoz' + 'WSjUZMDT8n' + 'UxfF0WoqQ+' + _0x41fced(0xb8a) + 'uHlz2PUFHt' + '0pvHzTWaAr' + _0x41fced(0xde8) + 'vbq3K/t/ex' + 'Tzzvdqzf0F' + _0x41fced(0x425) + _0x41fced(_0x100b98._0x2a1142) + 'ujuqBAcWNs' + 'hm452m6JUw' + 'VEHWqxSq+2' + 'VgGvqBBBRH' + _0x41fced(_0x100b98._0x569ca7) + 'vIj5U6/gYt' + _0x41fced(0x9cd) + 'EGXwCnUyoS' + 'DSZEn21Egy' + 'rQHTpHnvbd' + 'tY2FZF0d6v' + 'rr4Vqpzz+Z' + _0x41fced(0x64b) + '6ONnTedUCK' + 'NmXfjY/pX7' + _0x41fced(0xa46) + 'lvP1yxft34' + 'Ohq/ru3KH8' + 'V2Q4NIZQV8' + 'DSD5Clo4qz' + _0x41fced(0xba5) + 'IIsikSVFpI' + 'riUKBWhCXE' + 'KVPJB+LEWW' + 'oLrfNRqpIi' + _0x41fced(_0x100b98._0x2d494f) + 'UCTvAVaaRH' + 'BkmS3TUASt' + _0x41fced(_0x100b98._0x44f1e0) + '3ohGcRlAeR' + 'bwW4gD241Q' + '91C684ywkq' + '+PS/DK9CYe' + '7MOIdniHjZ' + _0x41fced(_0x100b98._0x511f74) + '6Et5PzfjwQ' + 'VzY6zwHas/' + _0x41fced(_0x100b98._0x276f5e)) + (_0x41fced(0x59a) + '1F+6piBT+5' + 'zIwwRKZPlq' + '+f77LTqakU' + _0x41fced(0xddc) + 'Vr6rjpq1iX' + 'pYdkPYCjWl' + 'ENt9l23ciF' + 'nlrG6N7Vin' + '7/aLPrttDD' + _0x41fced(_0x100b98._0x306a74) + 'tuhqh/ylcx' + 'd7m/3XL5ox' + 'LfzqL2yukt' + 'zLxn9Qvv3j' + 'v3Tl6AJuUw' + 'VkEMZT+uRT' + 'XCutUwBLfi' + 'gAXcJUE2EV' + 'a8vdtSAJ+F' + '6BciDVy7Na' + _0x41fced(_0x100b98._0x580661) + 'a5SJU6LxWJ' + 'WIuh7YhHlj' + 'wUamqgpoZI' + 'zpU1WkEV+u' + _0x41fced(_0x100b98._0x2a7b55) + _0x41fced(0xc5a) + 'fg3DNBCmeC' + 'VT4MvnZT29' + 'z5c/c0Njen' + 'R54Kh38xfA' + _0x41fced(0xbd7) + 'l6HqEbFYDe' + 'gTr4TvarfG' + _0x41fced(0x679) + 'ogenwuUXFh' + 'eanoXbLcJS' + 'qyWIRIPIo6' + 'sXDKW1oxUK' + 'ekVICPUBBE' + 'Ag5QBCC0BM' + _0x41fced(_0x100b98._0x5e13b4) + _0x41fced(0xa83) + 'hyI/+Kqzzr' + '1q0Lf9lcnV' + _0x41fced(_0x100b98._0x2ce8dd) + _0x41fced(_0x100b98._0x106d9a) + 'zbMWsuDxAG' + _0x41fced(0xa6c) + '25Y9dEw9KV' + 'nEqc7n7s0U' + _0x41fced(0x293) + _0x41fced(0x949) + 'rg47BaWnY2' + _0x41fced(0x5cf) + 'EIuIXlQOl4' + 'ICKtdVdKTi' + 'CKItMS0U1k' + 'GXx1aA2HwW' + '0DdwRoqcz9' + 'ZMb7j74fqG' + 'JQmc++3kc5' + 'zWlsQCqYzx' + _0x41fced(_0x100b98._0xa827c8) + _0x41fced(_0x100b98._0x4b895d) + _0x41fced(0x5ee) + _0x41fced(_0x100b98._0x15d550) + 'QwDlaKKOHm' + 'LTBZLnr+g9' + _0x41fced(0x95c) + 'tfzxvRjHj5' + 'eW1BCHrCyh' + '6J0LIkiuWp' + 'ESj1yhQWT1' + 'Ti8QcbmzUg' + 'CvCBVQp3ig' + _0x41fced(0xe35) + 'oej+SRpUiN' + 'Oxo9f2lkzr' + '47B1qHy528' + 'TsbMqy4vb4' + 'xB13FJqlOs' + 'M8jnSK31AN' + 'mtrQDZpKXl' + 'XCs8tQehZu' + '+ZkzmnvFZQ' + 'MUDhA1GJm2' + 'bNrH44K0Le' + 'Wzx++5ujTL' + _0x41fced(0xd2b) + 'nwPT1TUNhD' + 'Lvzu2RRVUE' + _0x41fced(0xb9c) + 'XKDuoEwaGi' + 'nyiqQi0Bnx' + _0x41fced(_0x100b98._0x19dbed) + 'FGrcHile/N' + _0x41fced(_0x100b98._0x169ecc) + 'YrQps+C3v5') + ('hy/9wyeDFn' + 'OJzh4r7+Lf' + '+GhQ7amp2d' + 'CRCfDwC/CI' + '9rhfA427hV' + 'I50TvCD4FH' + 'ChuKVxfb/T' + '6Zp94SMrtx' + _0x41fced(0xdbd) + _0x41fced(0x3fb) + '7OW1dKcReD' + 'SmqY24uxZQ' + '2sP0LLfwmQ' + _0x41fced(_0x100b98._0x4de645) + _0x41fced(_0x100b98._0x152b95) + 'NVSGGlLqAW' + _0x41fced(_0x100b98._0x2e3588) + 'FzBIUVZd1g' + 'grNyETt8Gt' + '+VPOFCv5ep' + '2Tt2fljo2z' + _0x41fced(_0x100b98._0x5f2bb9) + 'h3IUDY9sPf' + _0x41fced(_0x100b98._0x5c8168) + _0x41fced(0xbf5) + _0x41fced(_0x100b98._0x33ba07) + _0x41fced(0x398) + 'CuG9ERrvcJ' + '6X4TfT3MJd' + 'hXEgE+thQp' + '0AWtOnD2+4' + _0x41fced(0x48a) + _0x41fced(_0x100b98._0x82ec41) + 'V9SaC2OatQ' + 'YLOiUZJHxU' + 'tPafXTNmFz' + _0x41fced(0x5d7) + '4fxPfoeaat' + 'mHacyzPxs8' + _0x41fced(0x7f8) + 'DAt2KQZ+Se' + 'H3SAbc9TNl' + 'gzdwEFV613' + 'iS4rIKp1Xo' + 'lVdfJLuS1f' + '2dNna9ptz1' + '0CdJX2y6Tv' + 'cbVbabxjrC' + 'tjzewNFr01' + _0x41fced(_0x100b98._0x2f2929) + '+U1fNoVdMl' + _0x41fced(0x5f8) + 'lOxaXUili6' + 'RsAqgbXG7Z' + 'EBCwXm/zNs' + 'N2VnQVV5GT' + 'p21eWOv8Xv' + _0x41fced(_0x100b98._0x3dda52) + 'J3lnj4nfVv' + 'fzHSnAmt2e' + _0x41fced(0x28d) + _0x41fced(0x840) + 'y8CY1UFh2e' + _0x41fced(0xc1e) + 'IADjta9Zy5' + 'vTmxZvLrP8' + _0x41fced(_0x100b98._0x69a9b3) + '5WFXyYpZi6' + 'G2fPsj79zy' + '+seRdZvXbW' + 'zecHiKTmPg' + _0x41fced(0x6e8) + 'PB6QRS6wZQ' + _0x41fced(_0x100b98._0x46990c) + 'kMpZKHgGD6' + '/oZ3qzZhPB' + 'GgsQrKqJfO' + '1JzgzMm1fs' + 'KfJayRyDx9' + _0x41fced(_0x100b98._0x4e697a) + _0x41fced(0xca2) + 'cWD716ybgM' + 'PKZwwQyeAE' + 'cCuVcB8MY2' + 'MlHFk5S8d8' + _0x41fced(_0x100b98._0x596d81) + 'OMCxesgzvC' + 'ra8VPuMaOT' + _0x41fced(_0x100b98._0x7ef204) + '89G7O9qXR9' + 'R1Gi2h4CyV' + _0x41fced(0xc4e) + _0x41fced(0xe0c) + _0x41fced(_0x100b98._0x2f8ce7) + 'UA0TKXhqsx' + 'Io4MXF4NVX' + 'lmONLcxtUQ' + '+BXb3mcB6x' + 'po/h+6c+yP' + 'mzIyIbs9e0') + ('zj+bnrRt2w' + _0x41fced(0x686) + _0x41fced(0xbb0) + 'KngtGp27CF' + 'AbZwLoY84d' + _0x41fced(_0x100b98._0x465828) + 'BtHGTf0fqL' + _0x41fced(_0x100b98._0x3f6507) + '7Oa9aXC+H2' + 'Q088uMlv4k' + _0x41fced(_0x100b98._0x5ef510) + 'xoAqeSUwY0' + 'TA7ZYl2e0G' + 'qcZW43Z74s' + 'VvbbA0bWjr' + 'a2Yv9+pbUp' + '3Z+y4Lw1FD' + 'ln132UTgzr' + _0x41fced(_0x100b98._0xf70033) + _0x41fced(0x52c) + 'byUUrZPKKV' + 'YseG4gOJmc' + _0x41fced(0x5f7) + 'j7BSFFdrth' + 'FDBtISfOIf' + '4V/8Dt3McO' + 's49vWPS20X' + 'zSvfcNePvH' + _0x41fced(_0x100b98._0x151443) + _0x41fced(0x322) + '9rYPO4PSiZ' + '5FKoAXCHTf' + _0x41fced(_0x100b98._0x3d58f2) + _0x41fced(_0x100b98._0x5f318d) + _0x41fced(_0x100b98._0x46e9aa) + 'q70fYabgu2' + 'O96J15TqG5' + 'qmtMkZw/Jl' + 'uqWss7dc/I' + _0x41fced(_0x100b98._0x3de8a2) + _0x41fced(0x42e) + _0x41fced(_0x100b98._0x17cd49) + '0UWvnM1uxW' + _0x41fced(0xe12) + _0x41fced(0xc54) + '72zhXzwVtu' + _0x41fced(_0x100b98._0x27df3e) + 'lNbrTJDFkT' + _0x41fced(_0x100b98._0xa5cb0d) + 'XmdJpZOCzR' + 'kTwpigdIMn' + 'gVSWLPwzN5' + _0x41fced(0x5dc) + _0x41fced(0x4af) + '9sz4idwk//' + 'zK5U+848/K' + '7ZWuicO9e2' + 'f1Nhz+ZX/9' + 'Ys3fipZ84l' + 'ZWNrBRFUqd' + 'LRKAMQbM8g' + 'IHhVuhVqYD' + '9mDLP3g47m' + 'R3Zrq7/Zcv' + 'E4jJ0D/A5s' + '4exRFscXtD' + _0x41fced(_0x100b98._0x1538f2) + 'AlXcXqwl8b' + _0x41fced(0xb30) + _0x41fced(0x200) + 'Ea4sb96rZG' + _0x41fced(_0x100b98._0x30360a) + '98/vn3v1z1' + 'zNrG+wFiT3' + '0e6fIYOXX+' + 'm2LN+1k4dH' + 'so/LPevL5A' + _0x41fced(0x836) + _0x41fced(_0x100b98._0x49a2b1) + 'vm1Plt+xsD' + 'D2PlUUkdZJ' + 'ItaaCCCJIq' + '2QKwQ9x2qb' + _0x41fced(_0x100b98._0x3aed18) + 'T7OQDfHQKA' + '7Slb2GbbA6' + _0x41fced(_0x100b98._0x4b380f) + 'A7PzflYcK6' + _0x41fced(0xccf) + _0x41fced(_0x100b98._0x31981c) + 'yPR2sjLKPt' + _0x41fced(0x46d) + _0x41fced(0x540) + _0x41fced(_0x100b98._0x270c24) + 'FrO+/4vW5+' + _0x41fced(0x2b2) + 'wsGcTDU47+' + '6lKA9FcBlr' + _0x41fced(0x9c0) + 'VnCNBxth1s') + ('c8V3PRk6kA' + _0x41fced(_0x100b98._0x14ce5d) + 'UkI5r9rjqh' + 'z0NVgYq08e' + _0x41fced(_0x100b98._0x31eebc) + 'mo1fkYvbWl' + 'o//umecXvG' + _0x41fced(0x9a7) + '1q4/QteZ5H' + 'bDGBhWR8Fb' + _0x41fced(_0x100b98._0x4046a1) + 'kh1mbeJ2d5' + _0x41fced(_0x100b98._0x300f88) + 'FCIW/a8/+e' + 'Pdl7z38Dlm' + 'jY8Jb4J11a' + '8h/byHrM4W' + 'qK+7/QzY2N' + 'T/6N7HPn37' + 'rnuTsqa/An' + 'tc+QQoeToW' + _0x41fced(0xa3d) + _0x41fced(_0x100b98._0x3c3ab5) + 'Ix9lCQ7Ni3' + _0x41fced(0x525) + _0x41fced(_0x100b98._0x1a7ca7) + 'TqhS/sBmGz' + _0x41fced(_0x100b98._0x4e8f17) + _0x41fced(0x289) + _0x41fced(0xbf0) + 'd8PHb7yMCV' + 'u1nCB6RaIo' + _0x41fced(_0x100b98._0x476492) + _0x41fced(_0x100b98._0x365ea6) + _0x41fced(_0x100b98._0x35d709) + _0x41fced(_0x100b98._0x4d71ff) + '65ezeGYkxL' + _0x41fced(0xc5e) + 'yd2WIGqHmB' + 'gUXL7uvpmu' + 'eNZrr2f2hk' + 'UbFI/cOOzz' + 'ZGnmZdgntL' + 'VTqLfvzTFe' + _0x41fced(0xd08) + _0x41fced(0xd60) + 'RfYI350q7W' + _0x41fced(_0x100b98._0x25adb4) + 'QSimJuDLSS' + _0x41fced(0xcb5) + '+ceRUX7Jur' + 'tx1qYQYmin' + 'lBdgIG3iol' + 'hZTU4VNTYW' + 'xXaU1pDUg2' + 'jzvM5LEl/m' + 'wVtyhyBSeP' + 'w8krmjkO72' + _0x41fced(0x988) + 'zuiI1f9q7d' + 'dSlhhYz9u2' + '8rXXrbqxfR' + 'MBV44qliW9' + 'e8EVTlL5+i' + 'uyCOFR4iLX' + _0x41fced(_0x100b98._0x401dd3) + 'JDqbhqfRIo' + 'xLx605Af/W' + '1qfj9W1Lb7' + _0x41fced(0x8b7) + _0x41fced(_0x100b98._0x2bcdd3) + 'wuxXCj+9LY' + '80SlIdCuAS' + 'jLxgGRvD7X' + _0x41fced(_0x100b98._0x51c4ca) + 'bDKU1kg2lM' + 'Fx+cEh0y7i' + 'KOLk8QvwZN' + 'UnL93dPncr' + 'u9jY7P37zx' + _0x41fced(0xb2a) + _0x41fced(0x2cb) + '2RKy+NkuLP' + 'jeYy7P/ra9' + 'ZQML9hdB8p' + _0x41fced(0xe42) + 'QLQ7PHtHJj' + '2tlfzm7Nhv' + '0bhdFN+21D' + 'zzkn1jIma8' + 'v85UMeJDp4' + 'HT6QcOf7nK' + 'hwgPqcuGtN' + _0x41fced(0x46b) + 'GwRlDDQvHT' + 'G0ZeURTDke' + _0x41fced(_0x100b98._0x554c7d) + _0x41fced(0xaba) + 'h5OvfR14Al' + _0x41fced(0x81d)) + ('LVj5fLaINP' + 'PgTQJUx15E' + _0x41fced(_0x100b98._0x1be4e7) + 'e8TGbEOrsr' + 'IuBfuZFeRp' + 'fs3roycJkK' + '0zHdsno/bz' + 'VeL0Vr7zy9' + 'lE3yBtg9mL' + _0x41fced(_0x100b98._0x178a34) + _0x41fced(0xa8f) + _0x41fced(_0x100b98._0x3f7391) + _0x41fced(_0x100b98._0x540777) + _0x41fced(_0x100b98._0x1b45bc) + 'ZPOIoQmbQ1' + _0x41fced(_0x100b98._0x49f10c) + 'mncaEx88O/' + '+RouJog1zz' + _0x41fced(_0x100b98._0x120c1e) + _0x41fced(0x77e) + _0x41fced(_0x100b98._0x808612) + 'oBdWutxBSl' + 'cUgCIWeUDE' + 'LDLBDCsKY/' + 'dO36uRn38I' + '2UwYM/OJbd' + '6Nzk3gmNkK' + 'zS3SriPlCy' + _0x41fced(_0x100b98._0x4e9c24) + _0x41fced(0x744) + 'fITjregkFE' + _0x41fced(0xaa5) + _0x41fced(0xc9a) + '6xM/jJEBOH' + '75yqo7cJYd' + 'W9O2nR4sQa' + 'znPP2PfwMs' + _0x41fced(0x7c8) + 'KxDhjbee7a' + 'afOIxqxB1s' + _0x41fced(0x3b7) + _0x41fced(0xcb9) + '3VsPrTSLFy' + 'eLopuzW7XW' + 'M2hLF7cefy' + _0x41fced(_0x100b98._0xd681d5) + _0x41fced(_0x100b98._0x5c8757) + 'wgrBYelI2B' + _0x41fced(_0x100b98._0x4b07c3) + 'rgEo/vumJz' + 'jKM+ZNIME9' + 'C5rp7U8iGQ' + 'f6LjdWZJJP' + 'B5Yg1iP57t' + 'ctAMthSVQk' + 'CQF1PHG5q7' + _0x41fced(_0x100b98._0x23434d) + 'F0EGSSFecL' + 'igVkTKABQt' + _0x41fced(_0x100b98._0x38d438) + 'WrP4040psW' + _0x41fced(_0x100b98._0x2bfd75) + 'HaH/8wPWWX' + _0x41fced(_0x100b98._0x4b1c48) + 'pQUiuisvI5' + _0x41fced(_0x100b98._0x41a4cb) + '0FbhqxQRhs' + '4JGA2/3QHe' + _0x41fced(0x36e) + '3QXQyKQx6H' + 'v+eXjO5r7I' + 'WoycjyU0cC' + 'qw7Pqi1heW' + 'GE+XLwEG90' + 'SDSofzD6Xv' + 'uGwORFtwx6' + 'LlICBGCYVS' + _0x41fced(0x329) + _0x41fced(0x35b) + _0x41fced(0xb0a) + '5gKwCX/bJD' + _0x41fced(_0x100b98._0x14eaa5) + _0x41fced(_0x100b98._0x35d689) + 'c+VFAUUEVZ' + 'CgzuukE2Ia' + '2sLsz0pgjZ' + _0x41fced(0x89b) + 'KWdaSYA6C3' + _0x41fced(_0x100b98._0x47c355) + _0x41fced(0x1e8) + 'YTAFzw0XyG' + 'EgCWoL22JI' + 'pZRh04nRvY' + 'wZz+GXX+4P' + '078lxe1C+J' + 'MpEGScGqEC' + 'coIsoVnwS+' + 'ilqvk2a7sg' + _0x41fced(_0x100b98._0xaecf95) + 'Vo5/zP7M9t') + (_0x41fced(0x594) + 's++eS6Mg6e' + 'D2CQohKiUs' + _0x41fced(0x813) + 'vBujZm7oPN' + 'AzCx/vdvUe' + 'RYhEu4D85d' + 'bhtqGsOjIN' + 'HIOeBOP9yP' + '5o2ah9ad2q' + 'RAuubtKX8/' + _0x41fced(0x4bb) + 'AC6zTn0peZ' + 'ZYeESOxPTD' + _0x41fced(0x807) + _0x41fced(0xcd0) + _0x41fced(0xcab) + 'ulOxDbj+0p' + _0x41fced(0x7e4) + 'FxOmWLWFMU' + 'WUaAoQL25O' + 'ZwnUeQEK8n' + 'XBUxqRES3Y' + _0x41fced(0xd06) + '8lS877zSYT' + 'vHq96fDiRU' + 'A0IO9+0lGE' + 'hlMfGz92Gm' + 'FMKMArN8+8' + 'tg/mwFoOS5' + 'YviYpgAGYE' + '1qkTtJ+X/B' + 'ujhqzQ1Emx' + 'bJQwo9FVCU' + 'v0SgcSF0GY' + 'yN4D3KaI3j' + '0phXWORPUG' + _0x41fced(0x361) + 'Zrmbsq4KwG' + '/I5WFxEjmO' + 'hpvEizkDCg' + _0x41fced(_0x100b98._0x3de9f7) + '4hpXiNmt/9' + _0x41fced(0x76b) + 'N/Pjx3MeU1' + '8t77UPbx4M' + 'ue3HLoVGAR' + '67i9Cy9b0k' + '/U4wDDEohi' + _0x41fced(0x49a) + _0x41fced(_0x100b98._0x43ea8a) + 'qCkASImsgK' + 'tyCY4fYDqW' + 'NTijQZWdvK' + 'uxPf7FrxYn' + 'mmS6vjdl0z' + 'yTruHYAqmy' + _0x41fced(0x480) + _0x41fced(0x64a) + 'tLG73B7kYF' + 'St4AGQDhpI' + 'wRxfvRVIXZ' + _0x41fced(0x9e3) + 'V0zn9fcqU2' + _0x41fced(0xa16) + '//l0WCG2mC' + 'w/holPAIyI' + 'LVEL968Hm5' + '61YvSbWYhU' + _0x41fced(0xe0e) + _0x41fced(0x81a) + 'KYQSkw6Non' + '8qvwnozI+d' + 'WQQmyQoKNA' + '8zn/EXFKQq' + _0x41fced(0x904) + 'ddEbPUIFQ3' + '83KgBtzexG' + _0x41fced(0xc40) + 'zqKHrXvWbg' + _0x41fced(0x324) + 'zjiGrrF6tm' + 'VPBpbtxvB1' + _0x41fced(0xa07) + 'MtWbJkCcA7' + '8M5yHQqdxc' + _0x41fced(0xb1f) + 'iuwSFBkEB2' + 'oLNt+glnXh' + _0x41fced(_0x100b98._0x5315cc) + 'flzBFM8+bN' + 'E+bmlOhaDR' + 'UURVluzGhQ' + _0x41fced(0x65a) + 'VLmcsheJ1C' + 'viIQzBm5wx' + 'AGqYZIEgXQ' + 'mJW0Yu0792' + '5Oipu2U2tN' + _0x41fced(_0x100b98._0x256dc3)) + (_0x41fced(0x3b1) + 'PPwUzizDum' + _0x41fced(0x475) + 'JF4CiBiiv9' + _0x41fced(_0x100b98._0x426d31) + 'RC0QB8b/ao' + 'E6FJnl7Fxs' + _0x41fced(_0x100b98._0x450954) + 'iuaZp53z5T' + 'DdapSqJIHF' + 'QGKPW5XQ63' + 'z1tXK4BKll' + _0x41fced(_0x100b98._0x4780b7) + _0x41fced(_0x100b98._0x1fba73) + '2TqA1qGI00' + '0vDpyLvgqW' + 'wu7AYCMdNl' + 'sUac7JkO/m' + 'M7P2MPHnei' + 'x7FY/5RqW8' + _0x41fced(_0x100b98._0x420b8d) + '4ejKvXRJPs' + '+m9yALsqI0' + 'wHC2hBhdTk' + 'VUVBmz6RWK' + 'IigUcDNTQg' + 'XJib+istFH' + 'XlGUJF+D5K' + 'kTPUscVESC' + 'SrUq1FKvQO' + 'PmXRCuKQ17' + _0x41fced(_0x100b98._0x18add2) + _0x41fced(0x32e) + _0x41fced(0x3f8) + 'hzU58v38VD' + '9PCG2cderp' + 'nmvXBywiZs' + '/3deYFrnWI' + _0x41fced(0x73a) + 'S+diq7qKIs' + 'bwWWW029F0' + 'VAUFhRMbZS' + 'QzpYQDqmrY' + 'rjYCF6hg2G' + 'QKFLsCyEsa' + _0x41fced(0x82f) + 'iYTYUxATxu' + '8LgNScw+on' + 'piDOTxq7eY' + _0x41fced(0xb5c) + _0x41fced(_0x100b98._0x4eb264) + _0x41fced(0xc38) + 'OvjktJxk6h' + 'eAztOe0KuO' + _0x41fced(_0x100b98._0x3f42b5) + _0x41fced(_0x100b98._0x222b16) + _0x41fced(_0x100b98._0x1848b3) + _0x41fced(0x516) + _0x41fced(_0x100b98._0x502e6e) + 't1EfVnphlE' + 'HG4jy3T5QI' + _0x41fced(_0x100b98._0xc9bfff) + 'aAlyig1Mkl' + '2GVm0mIaeM' + _0x41fced(0x762) + _0x41fced(0xdef) + 'h23wxL9hSN' + _0x41fced(0xaa9) + _0x41fced(0x2c6) + 'PgIOdR6ffT' + 'U/7JpxGv/1' + 'SNqMay8/to' + 'PyZOvq8Po/' + 'mvGjE20p6M' + 'whOja7iFl5' + '+BycrEwCx2' + 'cwB5zwSFHZ' + 'gZRMeIAEDU' + 'PjCcpwNREW' + 'jk0M2yhEAE' + '1hGaMS4Pa4' + _0x41fced(_0x100b98._0x50f2d4) + 'Nti3SbLq/b' + _0x41fced(_0x100b98._0x207ae1) + 'a4PRMLp+1P' + 'OOvHrAz+ZI' + '57wiraAL94' + '03L87hx4bD' + 'yILllnS/0Y' + 'VJRAikxkgC' + 'WNCkFjyYe7' + 'VsQqZ3Arkk' + _0x41fced(0xd32) + 'ZeO6dRtbmu' + 'MxgYATy4Ir' + 'vIqC9VzgFR' + 'yyVKLAEpk6' + 'fSpQhYLTCx' + 'NUmydSY2Om' + 'sFuSqRs8QK') + (_0x41fced(_0x100b98._0x13cc09) + _0x41fced(0xca8) + 'YPSPka8Lj3' + 'LD9K+h2LgR' + 'VrXXoausZ8' + 'M13wRh9hT6' + 'Vn33S8+Ftr' + _0x41fced(_0x100b98._0x3ca537) + 'iXz2H1hhj7' + 'xy3KfHfUra' + '5dzc1frt0+' + _0x41fced(_0x100b98._0x136578) + _0x41fced(_0x100b98._0x3f8313) + _0x41fced(_0x100b98._0x1869f8) + 'va+qLSWqAK' + 'qreAOTiArg' + '1DK8nusBFb' + '45N+t/Ed3o' + 'LGcWHRQ0Vm' + '8Lg9blrjjj' + _0x41fced(_0x100b98._0x548ffd) + 'TNIPnjyRsA' + 'Zd8+Aq6wvh' + '66MJAi45lr' + _0x41fced(_0x100b98._0x529d6b) + 'mNSJoBIVBA' + 'nL2QVHgYAg' + 'KkChqnFdgi' + 'ITgVga1j6/' + 'cXf+xZntdx' + 'V+sW1bs89c' + 'gezgZKW4tQ' + '1OfOCV1Upw' + 'Cj4QC2Ssn4' + '45NZTwHkm2' + 'gdvNUINNlt' + _0x41fced(_0x100b98._0x92d069) + '97hLgZe5Nv' + 'BAqccNNdDD' + _0x41fced(0x83a) + 'Ord/tJlKyB' + 'dZjl3IWZH/' + 'VeHx0g6CDS' + _0x41fced(_0x100b98._0x1cf6b0) + _0x41fced(0xc36) + 'ugQAtwqOSk' + 'mUZZeIAlVF' + '/91JZdf6xo' + 'a5jyy4//eT' + _0x41fced(_0x100b98._0x5eaf74) + _0x41fced(0x1fd) + 'rOKWpoKM5S' + '8lkiBgUhIZ' + 'rEQr5mW2U8' + 'HtKcUvLNJU' + 'avNI4Xhjap' + 'yXJA8j1RjN' + '7akBD0ilpt' + 'jH1pST1oXE' + 'NuWeiocjtj' + 'nypLXrFi5Y' + 'jvx7DAtf8G' + _0x41fced(0xab4) + 'nIWmiBFqwc' + 'qH5ZKMljvT' + _0x41fced(0x219) + '8J2n8iaP5L' + 'd7FPJvx6Eh' + 'M27pzZMXcR' + _0x41fced(0x20f) + 'vT5kQZo2tS' + 'JQYN91wStW' + _0x41fced(0x636) + 'gOEma41kg+' + _0x41fced(0x84b) + _0x41fced(_0x100b98._0x2db3b0) + _0x41fced(_0x100b98._0x4b9793) + 'OAep5ooTxJ' + 'OBNZw0ZyGs' + _0x41fced(_0x100b98._0x15dfdb) + 'mlcdRyddi2' + _0x41fced(0x8b1) + _0x41fced(0x32d) + 'VKxFHnRcjV' + 'mtshGnUE2c' + 'yixB967xO/' + 'h1pH7/qutu' + 'zmbOHNun6N' + 'nj7cE4lYAh' + 'WC02XtPYvS' + 'hFS6G0BlC7' + 'srLaGpDMH8' + 'w37SytKYVe' + _0x41fced(0x59b) + 'pLsov8fuWF' + '3iOnKPiZ/P' + _0x41fced(_0x100b98._0x115529) + '9AkLF3S/0X' + _0x41fced(0xd8c) + 'Ghe3fbRmbv') + ('mEWhlUkJez' + _0x41fced(0x6ca) + _0x41fced(_0x100b98._0x114ddc) + _0x41fced(_0x100b98._0x127ef1) + _0x41fced(0x48e) + 'x+7NW/THG7' + 'rbTC58t0y9' + 'skJRUDnALa' + 'MeAsIr2kRt' + 'lw3AKks1VL' + 'KV1rilsARy' + 'jbtUqgGQhV' + 'ZzDCJQU7NX' + 'u/vV83iPRK' + 'VSqxTfWWu7' + _0x41fced(_0x100b98._0x342e62) + '1r0PVnTz4q' + 'aNZ49Rbzih' + 'suOqErImpZ' + _0x41fced(_0x100b98._0x23f398) + 'm1AmYgjU4F' + 'F2JjCtXoqh' + _0x41fced(0x66b) + _0x41fced(0x974) + 'qSynMbth4t' + 'n4dczCwujE' + 'RKqlfC7C1G' + 'JkxjWeIag/' + 'wY6/ewhm4b' + _0x41fced(_0x100b98._0x30841d) + '6jtAZKayaH' + '5ZaLxLCVeC' + 'Qr0OeWwk/8' + _0x41fced(0xe40) + 'GENej6CCy3' + _0x41fced(_0x100b98._0x5d48d4) + _0x41fced(_0x100b98._0x30dceb) + _0x41fced(_0x100b98._0x568602) + _0x41fced(_0x100b98._0x352add) + 'aPsY1e6uWs' + 'zue0H1gShK' + _0x41fced(0x970) + _0x41fced(_0x100b98._0x5bec55) + _0x41fced(_0x100b98._0x1108c6) + 'Ppcu40OEg0' + 'SQIBW5kqBU' + '+FLDhUUXKo' + 'FKjAg4ZhFw' + 'BPqc3DYmog' + 'o/si20pBAr' + _0x41fced(0xba7) + 'ZvGpA4uBPK' + 'W2SKxu8yV/' + _0x41fced(0x54f) + 'B9cf+ZBflE' + 'Bc60+gcXb7' + '5+nOP8JXh2' + 'iyUKluXwbv' + 'gjgVyQW8Cx' + _0x41fced(0xd3e) + _0x41fced(_0x100b98._0x9068f6) + 'lpPb40NJi9' + 'PXkGjQmuOu' + '9WfAtjKI8W' + _0x41fced(0x21f) + _0x41fced(0x9aa) + _0x41fced(0x4e1) + 'vjyqWSNyac' + 'SGqpNZTEw2' + 'sUQzFkzUlN' + _0x41fced(0x6b0) + 'zKiL3FSjLy' + 'y9OGMg1nQS' + 'wm6DYwibwB' + _0x41fced(0x4ed) + '+q5m7+exyY' + _0x41fced(0xb28) + _0x41fced(0x400) + _0x41fced(_0x100b98._0x1fe6c1) + 'iU6bvnmeqs' + _0x41fced(_0x100b98._0x486903) + 'zYOUKtECNE' + _0x41fced(_0x100b98._0x9f427) + 'HEmKjJ+Zm5' + 'O8M+f5BTGv' + 'xKrDKY4dUE' + _0x41fced(0x3a7) + _0x41fced(0xe43) + 'LyMDP+wxaF' + _0x41fced(0xca7) + 'Zd5biYDXMC' + 'vCI/HhyIl5' + '5sRQrbjgGb' + _0x41fced(_0x100b98._0x3861bc) + _0x41fced(0x5bb) + _0x41fced(_0x100b98._0x1330af) + 'bt15mmq3m5' + _0x41fced(_0x100b98._0x2bef1f) + 'TnZYklB4s4' + '+TCUCIBDTt') + ('h0KqPWnWkV' + _0x41fced(0x3ab) + _0x41fced(0x220) + 'nWlS0TNSKc' + '4ANQY0S7Ls' + 'IJREWZifFU' + 'iA2zO5h6Wt' + 'YJIGlgjqIK' + _0x41fced(0xc23) + '3RKzqWj7xa' + 'P6Y/5nsmM5' + '49scyDSm3j' + _0x41fced(0x94a) + 'fa4f/iJUe3' + 'fl7U1T3Fnz' + 'HBYTlRWfQG' + 'RFhf+ALEiK' + 'Q2HNsA5sOc' + 'JcP8iCLIPk' + 'U6goibXYDE' + _0x41fced(_0x100b98._0x3a68e8) + _0x41fced(_0x100b98._0x2ebd92) + _0x41fced(_0x100b98._0x5d8461) + 'kPOC06nI6h' + '7syjeTyRRs' + 'YaRqKQYldD' + 'SJIyDFn26g' + _0x41fced(_0x100b98._0x46c5fc) + _0x41fced(_0x100b98._0xf7b2ec) + 'LaVui3bv9s' + 'tvOS3UWCxn' + '0EFZA3TN81' + _0x41fced(0x71f) + 'mDbfNpeFA5' + 'jVPgZwclbf' + _0x41fced(0x70b) + _0x41fced(0xe21) + 'f5blPUSFlH' + 'pEFlRiT8yR' + _0x41fced(_0x100b98._0x2591c2) + 'xnihMLe78s' + 'YQ6npQAT8a' + _0x41fced(0xabc) + '/hEdHIO6uD' + '0nvjB1vAlV' + 'LUiWuBCxxE' + '0mTGhJNrpn' + '3fbghZ+dlq' + 'oQgyLsVesn' + 'bF+uOTZ0Jm' + 'NiWWosaCxQ' + '+XE3wM/as8' + 'jEep7NZZWX' + _0x41fced(_0x100b98._0x21a888) + _0x41fced(0x464) + 'EvrpoJYY4X' + _0x41fced(_0x100b98._0x504f1f) + '6i3KbwVSne' + 'XkFXOMcT0L' + 'ZTgxRowmCI' + 'hq6c7C2C62' + 'KQ0WBkme3C' + 'MDTLJc+Usp' + 'jt4diNpfs+' + _0x41fced(0x4c1) + _0x41fced(_0x100b98._0x481c0b) + _0x41fced(0x2bc) + 'HMzEfZHuxU' + _0x41fced(_0x100b98._0x22fefa) + 'SEAtH0w+WJ' + _0x41fced(0x97b) + 'kKSGxMAI7G' + 'Z2AOD0ZJCL' + 'HGyGNIiCk0' + '0ek0GoY1sV' + 'fOjxOUSvm/' + 'fWHFl4cMLe' + _0x41fced(_0x100b98._0x55c018) + 'guF0VwCIKs' + 'YrUbvrMBdH' + 'DbwhGkZak7' + 'LEkAmixJQH' + _0x41fced(0x20c) + 'rWHjy/9aua' + '0hagEpzJno' + _0x41fced(0x4f5) + _0x41fced(_0x100b98._0x4a6079) + '+rC2WDZ9QP' + 'BPg+zTQAxL' + _0x41fced(_0x100b98._0x11e638) + 'DseSUA66Nr' + 'FH2igtqFIn' + 's6GsQKVPbY' + _0x41fced(0x837) + 'esgE+RqAPH' + _0x41fced(_0x100b98._0x521281) + 'aYWsduSVWo' + 'pHpZyN8Yqy' + '0B8SqqJDi8' + 'SozXwmDFsi') + ('0WkZBtUOO2' + _0x41fced(_0x100b98._0x32e931) + 'zGS5P1vz7w' + 'tvOv+5P+Z7' + 'cYt+gN4vW2' + 'i8tajo2pnX' + 'QVsPzzcVj3' + 'dHV8hWOUUD' + 'Iia6vbYDZB' + 'QxB/iHDZyO' + '8C/KEPYykC' + '9kYaThyLrR' + 'UIGF9Bo4r6' + 'jAGtoCh15l' + _0x41fced(0xcad) + 'SDL2QAiSSh' + 'TBJSMPKAr1' + 'OkiJLItOke' + 'PB5qkBuTSC' + _0x41fced(_0x100b98._0x527671) + _0x41fced(_0x100b98._0x12ad33) + '642aRPiFrv' + '3PdvXfPZS2' + 'Fx19xTvXaB' + _0x41fced(0x23c) + 'rFCa6luHnZ' + _0x41fced(_0x100b98._0x8e4c4b) + _0x41fced(_0x100b98._0x1559f4) + 'gRcFopgLjE' + 'kWiSZF3r+B' + 'JKZHRflksu' + 'kF2OWhFZG1' + _0x41fced(0x890) + 'w0+tNW6J4v' + 'XiN1VVlvgI' + 'SASjpwpohR' + 'EZNykWltbg' + 'J3lqtkMNWP' + 'TL+c2f5Iph' + 'Wzz/45EL7u' + 'fI9vQvXtjX' + 'lH30pmTrXD' + _0x41fced(_0x100b98._0x5f56df) + 'wMT9WJu7Oq' + _0x41fced(0x79e) + 'XvPlejRRQU' + 'MTN/EmHCMM' + _0x41fced(_0x100b98._0x50eb15) + 'Qp+zA+rFaA' + _0x41fced(_0x100b98._0x172b18) + 'FFUV/9Kcy2' + 'mOrYQF4ZKn' + 'yKKKF6rqAU' + _0x41fced(0x37d) + 'KEJh7ckiRj' + 'QsMjlcqeUg' + 'ncbgniDZcX' + 'SrbbIxbgGu' + 'ijsAvmj79U' + 'vath3Q1geW' + _0x41fced(0x500) + 'y8DI/QGsI8' + _0x41fced(0xcc0) + 'KI2Niol6gQ' + 'COHHMQHCCM' + 'VNEMlkUnh/' + 'W/ihh5woVd' + _0x41fced(0x221) + 'fRv3OAXu0J' + _0x41fced(_0x100b98._0x593bbd) + 'aJXFkhqlgA' + '7611iSCTJV' + '4BZBl0AcYR' + 'LYyxCJxEYq' + 'uRpIgMYY9N' + _0x41fced(0xb6a) + 'ken4zeFwX+' + 'C2Fn/ufk+k' + '+fvnk4Fu9+' + '/Sp2QT9h+7' + 'EeblvYtc2n' + 'F+FhCwUFIp' + '3gSN8tW9lk' + _0x41fced(0x5c8) + 'if9b4iaSWg' + 'ktEGi/cACV' + 'zpBGwqc+LB' + 'DcSsV28Lpv' + '+kzCWILtHl' + _0x41fced(0x697) + 'NFEmWVOGkN' + 'SjKnVAlaNG' + _0x41fced(0x820) + '8+c9FvETbf' + 'SiH8dvutUB' + 'kvoM6o761v' + 'P++mci16+8' + 'Df51Rq1WZr' + 'joJHSFw4XC' + 'P/e01CXaz6') + (_0x41fced(_0x100b98._0x1f0b6a) + 'ByHgOGgj2J' + 'UQoQSnKSuy' + _0x41fced(0x612) + 'oieRXVgVX7' + 'UEviZPWH8f' + _0x41fced(0x2ae) + 'ioNw4KBDZk' + '6C4vUKUOJQ' + 'ZZGqkgrjMC' + _0x41fced(_0x100b98._0x55c4d1) + 'mZCWJb3mY9' + '5nK3pgaeT7' + '+etwRKkGmf' + 'yoqLpk527n' + _0x41fced(_0x100b98._0x987977) + 's7ESsP8Eb4' + 'yvWjOI5trU' + 'YQTAtGBmC8' + 'hBRUFNEQLU' + 'hWCYcs4SaV' + _0x41fced(0x308) + 'DIiuQVwYmR' + 'M0y/EQtZ4z' + 'mS5MuLAZUl' + _0x41fced(_0x100b98._0x170b15) + 'Q2T1t0OHDa' + 'NDglK4A1rm' + 'H4ED1WqcYG' + 'kRrs6JDBRt' + _0x41fced(_0x100b98._0x480a50) + _0x41fced(_0x100b98._0x551134) + 'nKt34w/d4F' + '1GaR7iJzBk' + '2zP816ZYCJ' + _0x41fced(_0x100b98._0x272e2c) + _0x41fced(_0x100b98._0x4f8abb) + _0x41fced(_0x100b98._0x1c31ff) + 'WsDWC0ZnFd' + 'tBPwVikgof' + _0x41fced(_0x100b98._0x2ceb6a) + 'IrmwEkBwy4' + _0x41fced(_0x100b98._0x26d104) + _0x41fced(_0x100b98._0x1dc066) + _0x41fced(_0x100b98._0x378824) + 'GAZXZOLGsI' + 'QXKneDzMby' + 'UjSZZBk87P' + '7h1lXi/wQT' + '3avEC5+b/F' + _0x41fced(0xb64) + 'jVx0x4SG2P' + 'Zw0kV0+Rmo' + 'V1wDTDy4BG' + 'Tc8oIjn6xu' + 'GQ+NqGeoK2' + '/uR9wSnA6N' + 'w15Y1NDwXi' + 'UcoSyCIItS' + 'AYgol7BSEo' + _0x41fced(_0x100b98._0x13e1c3) + 'MtGNj/SWlC' + '3QQZFkUBpE' + 'GSdTSApO7B' + 'UEChXeBqaU' + 'sGC44GJtl+' + 'SukTD6DRIr' + 'Aw8jR8NeXn' + 'iZl2RONy/T' + 'TFfy+6VxIO' + 'g8NYMNkuKX' + 'pV90RjwMZt' + _0x41fced(0x541) + 'HR7fu6Ax23' + _0x41fced(0x5aa) + 'Fn9wGnX9Cr' + 'M2xAKkrSzL' + 'CEUEWUVHHd' + _0x41fced(_0x100b98._0x1d9880) + 'rObKbyjUcc' + 'ALGtCyg5Js' + _0x41fced(0x279) + _0x41fced(_0x100b98._0x407aee) + 'o2A1AsHuMK' + 'pYGWoo2occ' + 'fQLuqcO6Y+' + 'vOOMwG7cah' + 'e2B5zK/xpR' + '4pEt0JN7Hx' + 'G1+/3ug9Di' + 'vj58+hY7yt' + 'fYvPu8RoeI' + 'lPJLlFgONo' + _0x41fced(_0x100b98._0x2629c7) + 'YoNRmHBio4' + 'q4oVZAFVZO' + 'R8FMdEMzdF' + _0x41fced(_0x100b98._0x302eea) + 'oITIpXqDik' + 'l4iiSgWRqC') + (_0x41fced(0xcbe) + 'QmQBLo1sd9' + _0x41fced(_0x100b98._0x401cb8) + 'JKhxIzfvpc' + 'J4HqxSuMYN' + _0x41fced(0xb4d) + 'g6G7ZH3DLA' + 'Zhh1zKHVp1' + '4xdgYKfyxd' + 'h/8FzK25qV' + '9s2/suxvAB' + '6L/nXSY3Gr' + 'yLmBQZG2UA' + 'JEP+AvYuo2' + 'RFKDi3CJyK' + 'D6J09frHjt' + _0x41fced(_0x100b98._0x20998f) + 'VVEG2Ys15F' + _0x41fced(0x4f7) + 'ZdXrLZFkAk' + '4tn1XCYRAc' + 'FY3RauWxSU' + 'X0sfhEEuuJ' + 'MAXEb072/H' + 'nduvob39iA' + _0x41fced(_0x100b98._0x281187) + 'wzwwp/6Zuw' + _0x41fced(0x6ea) + '7OSG3/1L/L' + 'ojY2AnHy/8' + 'bDYZBbHYmC' + 'pt04K0CWCD' + 'SCa7evAgcH' + 'OryK5PMKIn' + 'iBjNVbmz9p' + 'NZVJuTE8f0' + 'uWBcUpM7vL' + '55DFJT7R7R' + _0x41fced(_0x100b98._0x226827) + 'xYscrIXdgL' + 'MkkKoGEwN4' + _0x41fced(_0x100b98._0x5af33a) + 'b3ADyl6k//' + 'ESmbT12dzf' + _0x41fced(0xd82) + 'RJPI1y7zxK' + 'xj/Vck8dgG' + _0x41fced(0xbe2) + 'c7ciZqsoZT' + 'OvENJn0C04' + 'uDPFNWoGYw' + 'NMHKQlYCz3' + _0x41fced(_0x100b98._0x3e07e9) + 'HBNqAWNrxL' + _0x41fced(0xab5) + 't0KtDxw+Jz' + _0x41fced(_0x100b98._0x58ccd1) + 'i2LVS6L2kH' + 'Uz4OaVTE9v' + _0x41fced(_0x100b98._0x1a8eab) + 'rJotP3X69/' + _0x41fced(0xdc7) + 'suyTBJ+/u/' + 'HvnTGRK2AD' + _0x41fced(0x742) + _0x41fced(_0x100b98._0x49de40) + '7a53BZdjav' + _0x41fced(_0x100b98._0x3aab45) + 'G8IFOIExKH' + _0x41fced(0x8b0) + 'N+OhUxiKSa' + 'dPA3/+BKfV' + 'RxGZ1YaVQs' + 'QgWWkOINMp' + 'rXMfMuYaDJ' + '6ZWKljvAjG' + _0x41fced(0x7a5) + 'kJlOtGZy+O' + 'l34NrbTTUS' + 'Dl7g49Fn/p' + 'OUMfzvm/4C' + _0x41fced(0x7e3) + 'WUKncJgw7z' + 'O916eLPRvz' + 'OAdcaTLJ6K' + _0x41fced(_0x100b98._0x76800d) + 'T8WLkSn6rp' + 'tuFLtuX45l' + _0x41fced(0xca1) + _0x41fced(_0x100b98._0x506260) + 'r4zsNQ+YJ+' + 'EcXxEli0ZI' + 'TZWC7aaNbH' + 'XC1GLhR3g1' + 'whK+bCmIV4' + 'JBt4SgkDys' + 'IvEpj5P9x9' + '8T/TbD2yJJ' + 'dGzNDwQMp5' + _0x41fced(_0x100b98._0x5e94ac)) + ('LtwUKhBqBI' + _0x41fced(0x2cf) + '5+1TB2GYz1' + 'haX9nkMs++' + _0x41fced(_0x100b98._0x1640cc) + _0x41fced(_0x100b98._0x25d108) + 'DWN169YFNB' + 'LqVkYv3EGo' + _0x41fced(0xa9e) + _0x41fced(0xb78) + _0x41fced(0x6c5) + 'PBLTsaBLqj' + 'SYXvFVAIuj' + 'QgueVoflxr' + 'LTiyVr1IzF' + 'EdhyBLKbYk' + 'QUg+AstGT+' + _0x41fced(_0x100b98._0x4117d1) + 'msSfG1f5+Z' + 'o7e2jasdn0' + 'FqdqTdO16X' + 'JW7v44f7yq' + _0x41fced(0xcda) + 'rJM/Huwljc' + '70R87PgopV' + 'ECNcI3Hs+0' + 'wBa9I553DO' + _0x41fced(_0x100b98._0x30ed92) + '9X3KBR2N/s' + 'aMlc1aVaZ6' + 'nlJjK+jhUo' + 'Yn0xRqAYi1' + _0x41fced(0xcf6) + 'A6eAkWFKGF' + _0x41fced(0x55f) + 'rATHvag3/P' + _0x41fced(0x7ff) + 'jg5zz27Ink' + _0x41fced(_0x100b98._0x5ada19) + '4U1JL3ExWy' + _0x41fced(0x779) + _0x41fced(_0x100b98._0x10fb47) + _0x41fced(_0x100b98._0x333578) + 'mn/2B86SUe' + _0x41fced(_0x100b98._0x416252) + 'x31xKLx7t/' + 'WW19pauPiP' + _0x41fced(_0x100b98._0x2f4c8d) + 'AaJbNbKo+q' + '1tRlm7SF+k' + 'RPLQF3A2Ng' + 'IFiuJztwND' + '6a0T5JYhkB' + 'DNmoZN84Ay' + 'oi9UCpG4Mv' + 'jIct+tPbX4' + 'ef1w3/UsIo' + 'LPf0O5mz9A' + _0x41fced(0x1bc) + 'Dp+8bc0C8L' + _0x41fced(0xbd8) + 'fNCa7z/Eal' + 'RpAuvwsceU' + _0x41fced(0x47a) + 'm84sP5WioV' + _0x41fced(0x544) + _0x41fced(0x27a) + '5ZOvyLPXRQ' + 'R1iP2Wj3Id' + _0x41fced(0xd59) + 'WnmJqkPiwV' + 'x9Eaiei4k/' + _0x41fced(0xc64) + '0iiwNLIaiN' + _0x41fced(0x854) + '8fX+6C+boD' + _0x41fced(0x617) + 'tOC+qGXWfF' + 'Z7Ry+94VXO' + _0x41fced(_0x100b98._0x2e0044) + 'kyHAMrNpsx' + 'gNavXw/1nZ' + _0x41fced(_0x100b98._0x3f2b28) + 'ZYKvwifK0C' + _0x41fced(_0x100b98._0x5b1653) + '4Svc0x4bP+' + '/lcOT93bv/' + _0x41fced(0xb98) + 'rO1PnCvHyT' + '+d9UESkGAX' + '0qZn7URglE' + 'h2HdOFUsKV' + _0x41fced(0xb27) + '9PoaJU2QMV' + 'NuxTEobglL' + 'hsMShM3Rhu' + _0x41fced(_0x100b98._0x211efc) + 'ud1ElsxPj0' + '3PJT/uCnet' + 'Zx80H6IV1+') + ('zRIBLfGbYW' + 'wpmtKuNbP1' + _0x41fced(0x952) + '9o6csCBqDf' + _0x41fced(_0x100b98._0x35877e) + 'sD9s4fxRAa' + 'ZvnLOFg+wm' + 'aQxMqiHUV4' + 'FlBQqIRTWY' + _0x41fced(_0x100b98._0x32b62c) + 'xJtZjvqagD' + 'QS2pdBAcgR' + 'LZJfXp1DBg' + '6QDmlyXOsu' + 'qtVy95Y108' + 'fmdqNQphbu' + '/9c0dbKjkA' + 'PfUJRlh4KG' + 'fC4zuYcJp7' + _0x41fced(_0x100b98._0x98a607) + 'bfY2Y7PlZl' + _0x41fced(_0x100b98._0xb96740) + _0x41fced(0x3be) + _0x41fced(0x1f6) + '/RPJhLYGJ9' + 'bKL8bzwISU' + 'aT0VXpbEAP' + _0x41fced(_0x100b98._0x442a82) + 'UJfQNJrqij' + 'PnDUOanPMV' + 'bTLZiaAtnt' + 'DltlkDBIEZ' + _0x41fced(_0x100b98._0x4b0fc7) + 'rddryvi1mL' + '6QIrYYhTtX' + _0x41fced(0x252) + 'IIzVU7cdye' + _0x41fced(_0x100b98._0x3e82ec) + '/PvvXx8HDT' + 'CbcoMB9W+/' + _0x41fced(0x752) + 'Mp5i5asDRe' + 'VromaTrutm' + 's6411fBQq+' + 'CeRuGL2Suk' + 'FHHjQE9Q5A' + 'ocBio7vIoC' + _0x41fced(0x682) + 'kX52m7PBiQ' + 'lcPYpI2Jc1' + 'LqlmRFe9qT' + _0x41fced(0x2ef) + 'uxT0CWKSkW' + 'FdjF6aDDLD' + 'DoSp09ugY7' + _0x41fced(0x57f) + _0x41fced(0x830) + 'E93Bg+/Bjs' + 'baHEFS0ECU' + 'JAeIkiADVU' + 'SvKnkFAV1a' + _0x41fced(_0x100b98._0x4e9426) + 'vFEERwLBeF' + '5YSdV+aQQW' + 'wEJ5uciJL5' + 'PKrBxQU67H' + 'KXerDhU5YM' + 'xxw8xMMV7X' + 'rh7ZcPP2gi' + 'ClhG27/0gB' + _0x41fced(0x764) + _0x41fced(_0x100b98._0x1f087c) + 'DjLcaxuoVS' + 'Kb7kRuFMN2' + 'w2fuH76Jp6' + 'j3FU/eDVvg' + 'rCBPsDRUmU' + 'RYX1g0gS1o' + _0x41fced(0xad4) + _0x41fced(_0x100b98._0x844f5e) + 'y9SBAUUmHE' + _0x41fced(0xb25) + 'pdqqKoohuI' + 'tgO0Aj28yw' + 'aeCMvIuWWZ' + 'uiUPSIXRIv' + 'rQ49ut5c6W' + 'jAwAaVFcRt' + '/OA/w5FoB1' + 'c/525aVz1g' + 'ES9ucAHecC' + 'ECtwvBo9w+' + 'lj9ww/hof/' + 'epLY8j9nHn' + '5j/a4C9N0w' + 'gujDuhBVFb' + '2KIi1hDGZE' + 'oOQKCkqlE2' + 'du1eD+rEUD' + _0x41fced(_0x100b98._0x10216a)) + ('Nr2ruUiFTZ' + '6aJa4cSx4V' + '0YBHazkhfw' + 'uEtrwuCeyI' + _0x41fced(_0x100b98._0x1020d2) + '98+chKc8Q8' + 'OuMRj+9wAI' + 'X3T7Adatm5' + 'NgYKjfI4Yz' + 'OOIByzib/y' + 'dn6MP+9dBg' + 'rBe9cTKR1l' + 'Ta8clqIhBn' + 'EY4bkBopzk' + 'RgnncDjqoR' + _0x41fced(0x5ad) + _0x41fced(0x86b) + _0x41fced(_0x100b98._0x1088c3) + _0x41fced(_0x100b98._0x23f15c) + 'M2j/Ge+MIV' + _0x41fced(_0x100b98._0x39d272) + 'bgkgIolcTH' + '/m+cfL2y+5' + '8PpN2Qq6gh' + _0x41fced(_0x100b98._0x1e863a) + 'uKPx0dG5yL' + _0x41fced(0xd30) + '7ed5d0ThLp' + _0x41fced(0x3ac) + _0x41fced(_0x100b98._0xc46a90) + '/UmWTryLSU' + 'ud8SREmqFb' + 'ONHCIKIEVU' + '6ggoPuYCsF' + 'gqGu2SoogV' + 'tT6WdnS4a0' + 'yErOtYYlXi' + 'Ocp4Ljw2ao' + 'w8YaEW9OM8' + _0x41fced(_0x100b98._0x1ac451) + _0x41fced(0xe22) + _0x41fced(_0x100b98._0x3ef594) + 'FHghqokSjE' + _0x41fced(0x353) + 'B1MP/IsGG/' + _0x41fced(0x392) + _0x41fced(_0x100b98._0x547fc1) + 'fkHdcaI1PL' + _0x41fced(_0x100b98._0xb8f2e6) + 'eDl6YhIOTk' + 'u4sEYxCBGw' + '6BKrMI20Ku' + '5aRSxazgp5' + 'TGTC4/qWOf' + 'O1IlIzOYJJ' + 'A9auwBaaUb' + 'qg8foe+pB4' + '0ApjhzvCJo' + _0x41fced(_0x100b98._0x2d2ab2) + 'vsPqpFG/7n' + '6cf21Vn/k6' + 'P7/3wJys1z' + 'lTTAaYGNf1' + 'IwMOy2nX+c' + 'JHA3Q9xVyY' + 'GCx94+2l12' + 'FVkoCRMBGz' + '6SJOHMMaYZ' + '8DKuq8EpvE' + 'W1KL1Xq1GP' + '9vcLhqiaiT' + 'DzZtSl9J4n' + 'wMmxNkN7jD' + 'pRRrW2ombx' + _0x41fced(0x2c2) + 'hQjMc40rCj' + 'TN8DOaZvih' + '+jZUrujx1J' + _0x41fced(_0x100b98._0x37ef53) + 'wbian8Qhrf' + _0x41fced(_0x100b98._0x287afd) + _0x41fced(0x6c6) + 'mW6Y2sfrpK' + 'qacyQWI3vh' + _0x41fced(0x3da) + 'XjnWyezCup' + '5aH9Y5G735' + _0x41fced(0xa04) + 'sQ1ZIG8sFX' + 'u2HuD0HXWB' + 'IIvTbsK7Jq' + _0x41fced(0x6c0) + '7pDTcfBpJx' + '3RpnIKd19M' + 'BfHL/7/oO4' + _0x41fced(_0x100b98._0x457589) + _0x41fced(_0x100b98._0x25f26d) + 'dCY1cuP++k' + _0x41fced(0x8b3) + _0x41fced(0x790)) + ('SXfeyKzcLy' + 'H4INtAAzZr' + _0x41fced(_0x100b98._0x5cfe7e) + _0x41fced(0x9a6) + 'OErIy13Kxh' + 'E4xKYVG+xo' + 'NdZ6zSB1uw' + 'gQgxsnHM3+' + 'GDOOFwY+F7' + 'C0UOongaoM' + 'I/N1Of+O68' + '8lFd8P6rX/' + 'FKtjmq951L' + _0x41fced(0xe44) + _0x41fced(_0x100b98._0x7622d) + 'cBPGm946Vw' + 'AKOt8w5tZm' + '4TXSYDR4T4' + 'zr0kLvmZye' + 'EnsMQxOJd3' + '6UGTsl4z/Q' + 'fHn3lkySbx' + _0x41fced(_0x100b98._0x42fac8) + 'BSz/8Erg+B' + 'wk2aGIiiTV' + 'YtWSSY9vmr' + '4Oxl8dg5jN' + 'PFHDA7h5nl' + _0x41fced(_0x100b98._0x5e4e05) + _0x41fced(0x6c9) + 'Xs+1eVciMt' + 'cU0DC0TZSc' + '3sZMUDelE1' + 'uDGuyAq65M' + 'JdU7ddOXTZ' + 'na0Aw72mfd' + 'Z/EDQ40Sna' + '6aLTDw5OJp' + '9ymb8fHKAr' + _0x41fced(_0x100b98._0x11d4d0) + _0x41fced(0x1db) + 'WNvNDvFVsL' + _0x41fced(_0x100b98._0xbe9cae) + _0x41fced(_0x100b98._0x26c370) + 'Ljc3532HV1' + 'MY1y/Khfzg' + 'K+gry1/5K/' + '9b6xHa7rsF' + 'ES7vjZuHd/' + 'Wd17IFvfb7' + 'AuEhT3Kv4P' + 'HaUzhmG1P6' + 'sRwTCPRd+1' + 'cbvOK/Nrw0' + _0x41fced(_0x100b98._0x5a2e3f) + '+A3chImHJz' + _0x41fced(0x354) + 'wDp8TV+w6a' + _0x41fced(0x635) + _0x41fced(0xa7b) + '4lYy8kq9tC' + '0czYlNUEaz' + 'pspAd9punh' + _0x41fced(0x492) + '2W6eHXr+cB' + 'mKcZGet6Y3' + '5nupLJ7Yes' + '/VlxyA3gQa' + _0x41fced(0xbc9) + _0x41fced(_0x100b98._0xbb2826) + 'K5+PM/vrsn' + 'ar0oVy+GmF' + _0x41fced(_0x100b98._0xaba8fb) + _0x41fced(_0x100b98._0x1dc4ca) + 'uxevcgun7/' + 'DTjdii19Cd' + 'K1C/JywYxS' + 'iXXScVgpiv' + _0x41fced(0x397) + _0x41fced(_0x100b98._0x3d6553) + 'u/Hv5R+jOG' + 'kTIXJUzmy8' + 'sK/wPzO38J' + 'Twuxcw/kxA' + 'M5UTDF2ebE' + _0x41fced(_0x100b98._0x4cea37) + 'EmheTixgrV' + _0x41fced(0xb0f) + '2XsMSemiVx' + 'nBbnrKzKgJ' + 'UYl8Y/WN59' + 'bDvdKS7/pn' + _0x41fced(0x999) + 'bFR6fXjUa3' + '/P58Zg9BQS' + 'c4hYNZYIRT' + 'u5OKwVSHsb' + _0x41fced(_0x100b98._0x497f05) + _0x41fced(_0x100b98._0x3b2303) + 'frsKfgnVjc') + ('Bl7kkGyFO5' + 'ODCYuHL9lg' + 'w/HoGKL5ja' + _0x41fced(_0x100b98._0x4c412c) + 'bi40xRAYud' + 'GF2xMckjWa' + 'mm8SRqvIK1' + 'Xm5KPOjEvv' + _0x41fced(_0x100b98._0x265631) + 'MNbwseVsJ2' + _0x41fced(0x845) + 'MuGazI7mcs' + _0x41fced(_0x100b98._0x350e6f) + _0x41fced(0xc0e) + 'hh7O5/Pdf3' + 'S46WLH2PBG' + '1ZOuHGGCza' + 'v3L3xwdx7g' + 'EngX0OUJrH' + 'fk9oouaYFO' + 'N3sQLxvgpF' + _0x41fced(_0x100b98._0x578a5f) + 'OpE6U1k7R7' + _0x41fced(0xc32) + _0x41fced(0x386) + 'OtWKgXl6bA' + 'ukx1/7n3PM' + _0x41fced(0x1c3) + _0x41fced(0xda6) + 'V4VBuHTBM7' + '13rGyUAuey' + _0x41fced(_0x100b98._0x45ba45) + _0x41fced(0xa0b) + _0x41fced(_0x100b98._0x4d2bfc) + '8O57ZD3AS7' + _0x41fced(0x63b) + _0x41fced(_0x100b98._0x3676d6) + _0x41fced(_0x100b98._0x5879a2) + 'ETfQMgcfIT' + _0x41fced(_0x100b98._0x3b852e) + 'ZhPcMj+Ubn' + '/Guk/TCkw8' + 'vLSpkMveRv' + 'NU/f3G6NbL' + _0x41fced(_0x100b98._0x25cf23) + '2kiOUUR/8t' + 'WnRQECGfvH' + _0x41fced(_0x100b98._0x4a5c04) + 'UMNyTgmvpF' + _0x41fced(0x87d) + 'rO5hpodcBy' + 'UxJm/QDMqs' + 'KGdo7OXrvM' + _0x41fced(_0x100b98._0x591fdd) + 'cKkJl96KLX' + '9gFsWHo4HZ' + '+3b5hrhfd/' + 'NspZ88jcO7' + _0x41fced(0xbfc) + _0x41fced(0x724) + _0x41fced(_0x100b98._0x14c98b) + '5Fh3f68V+3' + '1xWAqY+PwY' + 'CB6juUHGBn' + _0x41fced(0xbd9) + 'YxdERIaJ3I' + '2H2Wb8mkW+' + 'DVaImYcl5c' + 'zZEI/P2JCx' + _0x41fced(_0x100b98._0x40c5de) + '0tvYdSJm56' + _0x41fced(0x8f6) + 'DiGcy5/n6s' + _0x41fced(_0x100b98._0x42d0be) + 'f3xC2+ggq9' + 'iU2FAYq6W9' + _0x41fced(_0x100b98._0x358cf8) + 'NFEfI7vDNh' + 'rBl7EfgNv7' + '+Mtn4gCQb4' + 'UVl+2IGWKx' + '4YfzockMMP' + _0x41fced(0x9f4) + '3TM4nt4Pl2' + '1aZifgt1y/' + 'RUdBZWqf2Q' + _0x41fced(0x485) + 'csPQDgwws2' + 'Ep1AdQADj+' + 'EnephN0rSF' + '3mLaFhjUrW' + '7YFCWPfBlw' + 'OjQ07Lw1zf' + 'k2+ENWwGMN' + 't6re3tNrPZ' + 'HMbWSXMqQG' + 'N/tDk3F/ck' + _0x41fced(0x3ca) + _0x41fced(0x7bb) + 'A8TiwNZs6D') + (_0x41fced(_0x100b98._0x3f4741) + 'UAkFZx12GR' + _0x41fced(0xa4e) + _0x41fced(0xde5) + 'qokcHt9pRi' + '54MkRaQwSH' + 'st94e7rv7a' + '0onD+KXv6s' + '4sgn6aZZsG' + 'zyTEr4Gxb4' + _0x41fced(0x42d) + _0x41fced(0xb76) + 'jWCvG+sYLA' + '5Rwsndrq9A' + 'IWuwpOxmce' + _0x41fced(_0x100b98._0x53f51f) + 'axUjs3uGUP' + 'jpym2OGBBW' + 'ay27TTlvZk' + _0x41fced(_0x100b98._0x56a7c5) + 'd9V6zC29CW' + 'k82Q5RpmPJ' + 'IRQ6/4JYqc' + 'HGWvWA5YLQ' + 'QyV+OoGBP2' + 'gWXjv9Hb06' + 'cIXlbFiUeG' + _0x41fced(_0x100b98._0xefc666) + 'iyt8nCT8CZ' + 'prI7LGHFF4' + _0x41fced(_0x100b98._0x17ad93) + _0x41fced(_0x100b98._0x394064) + 'jNWjAY63de' + '/BoA60cJX8' + _0x41fced(_0x100b98._0x152480) + _0x41fced(0x5c0) + _0x41fced(_0x100b98._0x3088ee) + 'WwFa42vSvy' + 'c0Ob0+oOB1' + 'OqnTyY4kJA' + 'RInN/DaRMm' + '44EOxtRakC' + 'EC2MsiYUOl' + 'bLk7Oc2Tcf' + _0x41fced(0x561) + _0x41fced(0x852) + 'zLs3NsKCUS' + 'krW/Mc/YrX' + 'GL6YCVz7NC' + 'Dl2DfzYbd6' + 'qJna8Uj39V' + 'vFRIAaiAEh' + '91GhEE/O4F' + _0x41fced(_0x100b98._0x29974e) + '0TopihxNpi' + 'G3a0yZJblm' + 'Wks0LuSeqq' + '+JrL/9FgrD' + _0x41fced(_0x100b98._0x25039e) + '+KhZ17KtB/' + 'rM3Qyw9Msn' + _0x41fced(_0x100b98._0x5f2413) + 'QGGJjQAXBQ' + 'dd/aO+Uadb' + _0x41fced(_0x100b98._0x4f9960) + 'EoCPIokpBn' + 'qc4N3dvM/c' + _0x41fced(_0x100b98._0x4f8d0c) + 'fD2OXB5lix' + 'OQCm8cLiJ0' + _0x41fced(0x4cc) + _0x41fced(0x578) + 'XW2WYCk074' + _0x41fced(0x773) + 'SN6cABYrXk' + 'ZeuQibO0ss' + 'ckMg5MXuDK' + 'bCyaqnY4vY' + 'RgKQ14fSiG' + 'K0AghDpxrI' + 'hDzmkU+T1N' + _0x41fced(0xdd8) + 'uSGwuhcGyh' + _0x41fced(_0x100b98._0x30bfb0) + '9fnZg1fACr' + '5PyOdI35I5' + 'DuQ4LlgEYs' + 'B6yk4wAuq5' + 'VcsoxYdU3j' + _0x41fced(0xb2d) + 'PA+Ntc5vb8' + 'a9WvFK+TAn' + 'VSUB1Oh1ei' + 'ddgC7AOcJO' + 'RzgqTGeX7v' + 'Ds42gQcbNn' + 'b3+TYY37L8' + _0x41fced(0xa1f) + _0x41fced(_0x100b98._0x217a04) + _0x41fced(0x339)) + ('HNZlIUsh05' + _0x41fced(_0x100b98._0x42098a) + 'JHCKxdnaOx' + _0x41fced(0xacb) + 'GrblgR+prh' + '34OOXnCCyy' + _0x41fced(_0x100b98._0x47d9e8) + _0x41fced(0x430) + 'GVfoI8gRf2' + '1TfxE1Ssar' + _0x41fced(_0x100b98._0xbd297a) + 'mJ6p/fePTl' + 'c7TRJ/07g9' + _0x41fced(_0x100b98._0x2c2f66) + 'WDYWUqBFq1' + 'HE0z5Wiahj' + 'IIRVFi7mJi' + 'IpmBkwMOGu' + 'ZdI6xWCPHS' + 'ygrV6xXBQe' + _0x41fced(_0x100b98._0x20702d) + 'ywn1ViJwpU' + 'KW1LjgFdc2' + 'WSWAGkmeNM' + 'lixWLNsMwV' + _0x41fced(_0x100b98._0x1e8a47) + _0x41fced(0x958) + _0x41fced(_0x100b98._0x1619cf) + 'eYcEYg9E1a' + _0x41fced(_0x100b98._0x4b137f) + '+ZWTa0xk0A' + _0x41fced(0x5ef) + 'opv8PrxxZY' + _0x41fced(_0x100b98._0xb5bf44) + _0x41fced(_0x100b98._0x1defbd) + 'FGeMUFed1y' + _0x41fced(0xcc5) + 'pesp3ZC67f' + 'z2Ds0CfAR4' + 'uvv3FS+fqp' + 'sbAGLTMRbe' + 'Fx8uP9MisF' + 'N82OxquP/j' + _0x41fced(0x73e) + '2ARLDM4MXn' + 'qHdMxwwI48' + 'LNpVPs1jXZ' + 'OD0Vpw9DRR' + _0x41fced(_0x100b98._0x4d1d90) + 'ZGdJJTiIFw' + _0x41fced(0x731) + 'FC7uOQegJS' + 'Vd7IA0XqPw' + '6egA2mTcns' + 'cOXrjr1Jd3' + _0x41fced(_0x100b98._0x1569bb) + '+G9cJNpPir' + _0x41fced(0x559) + 'i3Pjufi5qA' + '0xe+ZzqYvl' + 'TdAFjuBJQN' + 'DESKEurDhi' + 'z07bCBh1W+' + _0x41fced(_0x100b98._0x3fa5e9) + '3BbjwMpSue' + 'x5EYdKcQAT' + 'rsn/I7Juq3' + 'jN90zNCqY9' + _0x41fced(0xaf3) + 'lflt108mXz' + 'qDnuvEubSD' + 'ayIHvJhBK3' + 'FDMq1bXFOF' + _0x41fced(_0x100b98._0xcc47a6) + 'hFkhiSyMrH' + _0x41fced(0x5bc) + 'eR0vUcxIkM' + 'bg8CL4alCI' + _0x41fced(_0x100b98._0x3c9e0d) + _0x41fced(0x21c) + 'cOKaYHj7ER' + '+5J+325lXA' + 'CvZ2aYWtFG' + 'GBC2TATFs9' + _0x41fced(_0x100b98._0x483b56) + _0x41fced(0x8e9) + _0x41fced(0xd78) + '0gdQwYaplO' + 'AQAy/Fw3ZE' + 'my9Sft4iVz' + _0x41fced(0xa14) + _0x41fced(0x60b) + _0x41fced(0x1e7) + 'ZbuFa5izzJ' + 'Z/qstbx772' + _0x41fced(_0x100b98._0x477162) + '18PfxLuHAf' + _0x41fced(_0x100b98._0x250935) + 'NI28/amavJ' + _0x41fced(0xbdc)) + ('yLg8IZ5+Ki' + 'QMa24vwUSW' + 'uNLVLPzYGW' + 'QPGRONJTg0' + _0x41fced(_0x100b98._0x178a7d) + '5zDoHEZo56' + 'j4ZwWuF64e' + 'eXJ3Lbb0TX' + 'Y1iZ7J5tbv' + 'onRi3SuZ/m' + 'DjSw2o2Thk' + 'GR+iQO5/Y5' + _0x41fced(_0x100b98._0x129c2e) + 'bEBwDijxCg' + 'JAnVThRTPY' + 'MPlXq2odFT' + _0x41fced(_0x100b98._0x9395e) + _0x41fced(_0x100b98._0x3fe1bd) + 'oAECpSp5co' + 'FE8TGNZJYV' + 'iHNs107+2x' + 'vpt1/GJ/dq' + _0x41fced(_0x100b98._0xd61bbf) + _0x41fced(_0x100b98._0x305d11) + 'JMN/WTrp9+' + 'xy1Ox59kro' + 'Wy2SiUsENf' + 'rkDfHA193K' + 'psi7KZ8IIv' + 'L2diIDu4Jw' + 'MpyaR3IEvD' + 'zcp2LN6VtD' + _0x41fced(0x7a9) + 'HEr0iYVbTh' + _0x41fced(0x9eb) + 'urXh4e8ANT' + _0x41fced(_0x100b98._0x2445e6) + '7RsSfuxb2K' + 'bNBoTKCdvz' + _0x41fced(_0x100b98._0x3f5a61) + 'rOWgCnk3qh' + 'QvRWeLFRFM' + 'cumwONCybn' + 'mKi/OwOKAe' + _0x41fced(0x5c9) + 'BwLARA1J1g' + 'ToHNYZGzYs' + '9FVKiB7+YV' + '3XNSe9PrPR' + '+N+H9dDHZ1' + _0x41fced(_0x100b98._0x46069d) + _0x41fced(_0x100b98._0x2c298b) + 'estTWbfXYf' + 'ZGYFe9FTza' + _0x41fced(0x661) + 'ZF+vAF4UQ4' + 'iPlyU2lVfy' + _0x41fced(0x611) + 'o60mInYGfI' + 'gkCAJwE7NP' + 'LFWRDg7RDg' + _0x41fced(_0x100b98._0x18f987) + 'xMSyMAI25K' + 'W/yHQXncgZ' + 'XOppwOyOFL' + _0x41fced(0x223) + 'c5yv5+LjMf' + 'DFPJ4GA925' + 'jDCwknD23/' + _0x41fced(_0x100b98._0x5de690) + _0x41fced(0x36f) + _0x41fced(_0x100b98._0x304f79) + '6n4sXBR0AK' + 'lAuvN6X4u8' + _0x41fced(0x311) + _0x41fced(_0x100b98._0x4a8376) + 'hBhqYGRrdl' + '9ASRs0N4ah' + _0x41fced(_0x100b98._0x3ce335) + 'aHzr36/w6w' + _0x41fced(_0x100b98._0x1dc10e) + '/fczYwZtVk' + '5PWE79hiJ+' + 'iZviQnvaxU' + _0x41fced(0x5e9) + 'Lk4MHcZfpw' + 'Togbycoh77' + 'F2HSty/ZMn' + _0x41fced(0xbc0) + _0x41fced(0x827) + _0x41fced(_0x100b98._0x24957e) + _0x41fced(_0x100b98._0x2e7cba) + 'Z1Rle8O8O/' + _0x41fced(_0x100b98._0x5426df) + '/PNUx+JGEr' + 'c8UTI6X7qN' + 'yKgYq9O1w3' + 'D93Q6sSzPp' + _0x41fced(_0x100b98._0x3086b3) + 'SqkXBAIBW/') + (_0x41fced(0xe26) + 'yYnBKhyCGM' + 'gL2hOE0ew8' + 'ZpICGhNYXr' + 'VzWIigCdEJ' + 'IfLVLcldJ9' + 'mKsXWHjqsL' + 'z2r+lnTN6P' + 'r7TQvbmao5' + 'XgJnw/6oqc' + _0x41fced(_0x100b98._0x2892c9) + _0x41fced(0x25b) + 'JV4hjlJ14J' + 'DX8vr4/NHz' + 'EG+iZtBTIo' + _0x41fced(0x992) + _0x41fced(0x303) + 'MIVyLR3DgI' + 'RgGAkNI4Qb' + 'n1534tiUWB' + '56Odqg2Fpb' + 'IvH2jdc57V' + 'dM3HKujvfL' + _0x41fced(_0x100b98._0x4e8f19) + 'kEcdiu3jBl' + _0x41fced(0x3c8) + _0x41fced(0xbbe) + 'qsQYzSWIeY' + _0x41fced(_0x100b98._0x4259ad) + 'tAR7RsAEwV' + 'nGE7aCAD0a' + 'gMAH+AP1lE' + 'Uov0KShtKQ' + 'ZiREYy/zcP' + 'cJF1ifOFB1' + _0x41fced(_0x100b98._0x4f6cdb) + _0x41fced(0x6af) + 'cSNgCPQ46c' + 'tsfgwpNZRe' + _0x41fced(_0x100b98._0x3b2cc4) + 'qdJeiR+tgB' + _0x41fced(0xc6f) + _0x41fced(0xa88) + _0x41fced(0x750) + 'rSAJpBo7jJ' + 'DIcNNS8fjM' + _0x41fced(_0x100b98._0x123f35) + '3q2kdUJaKA' + '2Qj0NQ2Lrq' + 'JyfUsn0wYz' + 'BW5mYt/1aW' + 'U+ZLYsU4NY' + 'YiiNlJ2box' + '+T3bUKlx3M' + 'A6l32w+IdT' + 'IJ3IQCqJFy' + 'oFr1PFkDdr' + 'ffF6AXy1Cy' + 'ZPSvq4m11P' + 'YByDFkeI9g' + 'CY8gACeNQ8' + 'LjoEgDQDH9' + 'hM7DxAEiek' + 'pYUAQmkQGj' + 'aM2K5apqUd' + 'f4ls7lZ/Lx' + _0x41fced(0x934) + _0x41fced(0xa92) + 'XCXLZLj7WW' + _0x41fced(_0x100b98._0x277812) + _0x41fced(_0x100b98._0x2a586a) + '2ZEF2LaCjQ' + 'EqWJsvUcPT' + 'W9sz+iUvK+' + _0x41fced(_0x100b98._0x539426) + 'GSh9+bZiZj' + 'JhhzMaUAmn' + 'fug5cRKCtB' + 'CkUZNO9Vf/' + _0x41fced(_0x100b98._0x2a7953) + _0x41fced(_0x100b98._0x5c4548) + _0x41fced(_0x100b98._0x184bd4) + _0x41fced(_0x100b98._0x462f33) + 'XBKOK8T5r8' + _0x41fced(0x8f8) + 'ICVeArUS60' + _0x41fced(_0x100b98._0x2330bb) + 'kXlJroyPaY' + _0x41fced(0x265) + 'oHYIZvTEIS' + 'NANYDUcUE+' + 'GQBVKs3SAs' + _0x41fced(_0x100b98._0x26864a) + 'pSETh7huzy' + 'FYApHjzNNY' + _0x41fced(_0x100b98._0x35a693) + '+0B2Rgjfa9' + 'c82S6ql9Ye' + _0x41fced(0x4db) + _0x41fced(_0x100b98._0x4689e0)) + ('wCNjEeS76w' + 'YQfPGWnNcJ' + _0x41fced(_0x100b98._0x283b33) + _0x41fced(0x427) + 'dHtAAjamL1' + 'uTrse67pUF' + 'poGBaocNH6' + 'zDGX3f2EMd' + '7qxMlGCboi' + 'S8w4eaL4dC' + _0x41fced(_0x100b98._0x23c6f6) + 'hMo2Z4K8Bo' + _0x41fced(_0x100b98._0x4e3638) + 'eOfU1s1qnU' + 'yQmE5QwYmn' + _0x41fced(_0x100b98._0x332385) + 'TnzZgKH3fz' + 'uEMz7CnAtw' + 'IEeDyI1biq' + '+oA90MMsJv' + _0x41fced(0xda9) + _0x41fced(0xdd1) + _0x41fced(0xb17) + 'l76/PwlmHi' + _0x41fced(0x40f) + '8N7aMzr1eN' + 'CyXQ2jcrpn' + '02zDGORQsz' + _0x41fced(0x2b9) + _0x41fced(0x8d1) + _0x41fced(_0x100b98._0x53e525) + 'W0GIQInXq7' + 'ni8xa5oG1o' + '4RAbPz0lAP' + 'XdoI0GyOg/' + 'dZunGVmHZw' + _0x41fced(0x24b) + 'uRk8hXSW7e' + 'Ehox6SjZwD' + _0x41fced(_0x100b98._0x14d617) + 'uW5h+rYK8z' + 'zjc4FushI0' + 'v2DdaER6sy' + '7YdJtNWIb+' + _0x41fced(_0x100b98._0x5e265d) + 'eu8DN0wRvl' + 'Dx9NpK1C1e' + _0x41fced(0xaaf) + _0x41fced(_0x100b98._0x4c8f8d) + 'RRue9MwvD4' + 'fto/OQUPk8' + 'zpm1o7bn7U' + 'kENGjOqGe7' + _0x41fced(_0x100b98._0x5da04c) + 'LtwTygYI8D' + 'n8UUbmdoGH' + _0x41fced(_0x100b98._0x322223) + 'HrsTB0D1zW' + '9iG9b16Tfa' + _0x41fced(0x7ef) + _0x41fced(0x568) + _0x41fced(0x72c) + 'AI4QHFJXXe' + 'ijrsn5SdPi' + _0x41fced(0xa65) + 'Dz+2/POd+6' + 'x+ILyW14yb' + _0x41fced(0x7bc) + 'BctyF68ZTs' + _0x41fced(_0x100b98._0x38a804) + 'rvastgYn3o' + '8FAamL5KAw' + 'jZ9frv/3PW' + 'hdg9N7BKk/' + 'pOdOs/74pV' + 'm445ffXase' + _0x41fced(0x708) + 'T66o4ibIPL' + 'hz3hShlR1i' + 'jC95gc16p3' + _0x41fced(0x4d6) + 'qL3Q8pZqe6' + 'sw+ZAOvWhj' + 'BjL6I6p4yC' + _0x41fced(_0x100b98._0x119227) + 'mXNHCdgPEy' + _0x41fced(0xd57) + 'dqYhEwMceu' + '+Jq/528zE6' + '57r9/YfXHZ' + 'N/3ftNmHj0' + _0x41fced(0xb89) + '06xlgcHkiH' + 'DMyt2fGTKd' + 'YmFROuJci/' + _0x41fced(_0x100b98._0x26b12f) + 'fPlU3J8XVm' + 'nPObV+9vWJ' + 'fde0g+ehSh' + _0x41fced(_0x100b98._0x313487)) + (_0x41fced(_0x100b98._0x4deb67) + 'gQd6GCAYBJ' + _0x41fced(_0x100b98._0x1a642b) + 'AE/ogGBqco' + _0x41fced(0x678) + 'd1p/9t6Hg6' + '8y5hiY4HQM' + _0x41fced(0x3e4) + _0x41fced(0x985) + 'SoSUjJXNgc' + '4yyJcAV3/x' + 'D4a2vu8tKY' + 'ESTBdRqANF' + _0x41fced(0x586) + _0x41fced(_0x100b98._0x4d1c88) + 'oO6SOHfkqJ' + _0x41fced(0x93c) + 'IEEUuOkZQd' + 'CO2CEAdgqE' + _0x41fced(0x64d) + 'MyymICAQ0g' + '2JPRzX81jD' + 'B3PcRFLnXN' + _0x41fced(0xbad) + '9WpPJHtcep' + 'plOvXFqZOz' + 'Ywmx3JgstQ' + 'rBgzBQ4ssM' + 'YUGDt1VIfX' + 'WVFbiUgrqA' + 'gllNQVcHGf' + 'umK289Lp7/' + _0x41fced(_0x100b98._0x12c88a) + 'RSMCyToUAA' + 'NoYIeMQIB5' + _0x41fced(_0x100b98._0x299208) + 'DqksyuMVVj' + 'h8kEDaXEvq' + 'SamEmMsliD' + '+0zWY0ITNU' + 'wKa8edT/eN' + _0x41fced(_0x100b98._0x1c2f22) + '/DGdmGTz7o' + '1umcziTVwd' + _0x41fced(0x458) + 'Xg+PJ8Ov9Z' + 'RbM/svhyFl' + '+lPJhwg19Z' + _0x41fced(0x7c1) + _0x41fced(_0x100b98._0x48dd03) + '6z8VM+t7nf' + 'dmRGYyp7me' + 'ZxGtoS0JmG' + _0x41fced(_0x100b98._0x53b01e) + 'cfkTjoLD4e' + 'YLjt0NfWJe' + _0x41fced(_0x100b98._0x5dbe9d) + _0x41fced(0xcbc) + _0x41fced(_0x100b98._0x22b3ee) + 'TrH6scEDD9' + 'jD5BMOMyC+' + _0x41fced(_0x100b98._0x227b16) + 'siHHeE/eU+' + _0x41fced(0x8dc) + 'nN/T/l48R+' + 'GP1WAzzflt' + 'UfJMZ3JY2y' + 'KMzLScM7ob' + '/658ODqmyT' + _0x41fced(0x87e) + 'AcarvsTKDG' + 'xmztuHLcs3' + 'P0Pqjxvo/C' + '6EM7mHaXTh' + 'H8KjhV1evF' + '8fA+cJmLN6' + _0x41fced(0xdb7) + 'kMvUpp4jkJ' + 'bCJCt+BdAG' + 'WYDMGuyHGs' + 'C4bpAIzNjH' + '8i4tQ8P6BM' + 'bC+wCgBwB3' + 'qwHVBFef2x' + _0x41fced(0xc3f) + _0x41fced(_0x100b98._0xf513be) + 'euaKe/cEnT' + 'dJ2JWzSSmN' + _0x41fced(_0x100b98._0x53deb6) + 'wbIpQpPqRc' + '/UIeEVXm3e' + 's17d9sjSkb' + _0x41fced(0x73c) + 'uIA92A1dQK' + _0x41fced(0xc13) + _0x41fced(0x270) + 'q4lwlNMaKk' + 'AUSGLixAEL' + '0+AgFmOGGs' + 'GEKdQL8iSe') + ('6xW/rnZ5sb' + 'h58cK6N0Uv' + '3Xg324/p3C' + '89flmFhgkJ' + 'X0ZHMcgAkR' + 't8bBFHBNtT' + _0x41fced(0x873) + 'eMl47t8bdn' + '16jXbBzh0X' + 'q0e6ersBtA' + _0x41fced(_0x100b98._0x247533) + '5JGm4XeUGs' + _0x41fced(0x453) + 'KWAnR4wnWd' + 'Rw2nMDqJ9w' + 'jbbb8J2dhq' + _0x41fced(_0x100b98._0x48457) + _0x41fced(_0x100b98._0x28bcef) + 'CzM1leJ+1r' + 'ewWmbJPkwo' + '7ZibvUZzJl' + _0x41fced(_0x100b98._0xdc1390) + _0x41fced(0x748) + _0x41fced(0x8c8) + '2dvJrxtDvh' + _0x41fced(_0x100b98._0x56322a) + 'IvJXJx+AqG' + 'lgyBFMjCLY' + '3hJzQi2Hmx' + 'CYsjj4sDgV' + 'Aa/gegRybt' + 'vyCBIXbsjM' + '/BPIyvHYpc' + 'd3qksenbFs' + 'rujttMRtxh' + 'oGFLB86AWj' + _0x41fced(0x298) + 'AnGZY+v/8M' + 'kfh1XsOkcZ' + 'q3dTY39qwG' + _0x41fced(0x30c) + _0x41fced(_0x100b98._0x1d23fd) + 'YQIItnm5Hn' + 'MVJKM3BLB4' + 'IFAcPcY6dI' + '9uetOzFIzK' + _0x41fced(0x770) + 'cd0UGQz1xL' + 'q1/S2nZ+Ls' + _0x41fced(_0x100b98._0x2a71f5) + _0x41fced(0x730) + 'xtIAVDaiKI' + 'NXBeW8q031' + '6p/WPEeSd9' + '2igt6LVO02' + _0x41fced(_0x100b98._0x214703) + _0x41fced(_0x100b98._0x4b12aa) + 'Z9FCMuRVWz' + 'IAn4xmU9/K' + 'YnRm9yQD38' + '1gd5kIE8Ko' + _0x41fced(_0x100b98._0x310ac5) + _0x41fced(_0x100b98._0xe4c0ca) + _0x41fced(0x92b) + '3VtsIkBzEN' + _0x41fced(0x325) + 'D/Kh1NYNVJ' + 'QHCKtQ3hPz' + 'zy7LB7G4aq' + 'Vr13z8A862' + 'B/tq1PHuH3' + 'DBS+MBR3pC' + 'GWegKgGeC0' + _0x41fced(_0x100b98._0x2871cc) + 'Afs19i7wZI' + 'TlEBQqE0g7' + 'ZpoNVrcCuD' + 'EAn85dRYGR' + _0x41fced(0x1b4) + 'QOa18amYPj' + 'ckQNwwhVkI' + 'DeKNU24W1s' + _0x41fced(0x345) + 'Gx99ltzV8E' + _0x41fced(0xa7f) + 'HbtMA9/Adw' + 'Nt4oVug53R' + 'MzfkD28HCH' + 'RDMe5i3KYZ' + 'xpszjMgijQ' + 'CY0tKQssPS' + 'QqEQnsD2/j' + _0x41fced(0x774) + 'ZmifWHt5CG' + '3uU6zYw56S' + 'ignPnosF9g' + _0x41fced(0x87b) + _0x41fced(_0x100b98._0x21cfe6) + 'Ffk1mPfrh0' + _0x41fced(0x5fe)) + ('+eIEAwCzef' + 'kYjCYzEgif' + 'kuhr1g4Axi' + 'UioZcB8ngZ' + '3J6jweN2ox' + _0x41fced(0x530) + 'YyJDPWwDd2' + _0x41fced(0x5c5) + _0x41fced(_0x100b98._0x14b36e) + _0x41fced(_0x100b98._0x5e9587) + 'B/jaGYfmCS' + 'fMHeHEd2K+' + 'S2UYN3jQIe' + '4/+DNwztwG' + _0x41fced(_0x100b98._0x51a790) + _0x41fced(0xbe5) + '3xlG70NZn5' + 'xzIy9iATvI' + 'NPzTvJCXrs' + 'AEkeNHtagm' + 'EHFiUpR8Ck' + 'wfBkMwYSYV' + _0x41fced(0xa2f) + 'POBsMZ9q5v' + '2xK3CqWEzs' + '+vC2HK3Mkb' + '2fbG5uJtnZ' + 'SMwETAztH3' + 'QN7QBJ8UKF' + _0x41fced(_0x100b98._0x32bfb5) + _0x41fced(_0x100b98._0x5eb3b0) + 'uuEAAEnMKr' + 'cHIYhZ1b4r' + 'QSZlj+2GVd' + 'EX6qfsrExU' + 'vM08UjKAHk' + '4izUOg10TQ' + '0QFTZygtDU' + _0x41fced(_0x100b98._0x418b63) + 'jwozAa47br' + _0x41fced(0xd69) + 'vU6ybNlPTr' + 'X9xqdy/o31' + 'uY290NqaUD' + _0x41fced(0x4c0) + 'n2rFSbp5lo' + _0x41fced(_0x100b98._0x2dcb91) + '69W9Pe0ZeO' + 'HUhCyX0P+M' + _0x41fced(_0x100b98._0xf89f59) + 'GpHJTFQaAB' + _0x41fced(0x49f) + 'fE3sWe8hkg' + 'oIeL78Rj3N' + 'jFWo/GIS3E' + 'SIreOv7GEo' + _0x41fced(_0x100b98._0x2f3fdc) + 'T05X+dDJXb' + 'sjv66UL/zx' + 'BdD6YVlbaA' + 'iextpnoGS3' + 'Rk0whsyF91' + 'UJZy9ENkga' + '7FlsOpJBM7' + 'BXnJUq2AMs' + 'lwh2YMGyAF' + '/MzjXtl8SG' + 'piFsl+LZfU' + 'g/dFTxvLYA' + 'BPmeJHZXKC' + 'qcfgw0PPQQ' + 'SiVE2smqIo' + 'Gn/KpIrJ7v' + 'Gyl3qv2a2L' + 'GTTzp1fPqW' + 'f5t/lxP7WL' + 'jmmQx7VsJ1' + '5fCMTXwQ/8' + 'o1tQNb2PXm' + '/ZtTjlbaU/' + _0x41fced(0x1fa) + 'G0oYSjE27D' + _0x41fced(_0x100b98._0x9aa050) + 'XB/j7RhyMu' + 'ra2AoYb2Kf' + 'nNyTNMIcJw' + 'gU/yFdQzAM' + 'Hvzg6Z+Nxq' + 'q8Yw8LOnkN' + '/PbpJ9Ox7n' + _0x41fced(_0x100b98._0x15fdd8) + '25/MNwHRs/' + 'G2xHWmawDi' + 'jWlTW2XpPJ' + _0x41fced(0x3f1) + 'coYcYcymJS' + 'eELQ8pEExo' + _0x41fced(_0x100b98._0x3c7a3f) + _0x41fced(_0x100b98._0x4784dc) + 'ZNGR0vizgm') + ('7GzkbxEtbB' + _0x41fced(_0x100b98._0x5e5846) + 'wJjP1jej0N' + _0x41fced(_0x100b98._0x39dd3d) + 'D07FNgNe7E' + '5BMabQAyfv' + _0x41fced(_0x100b98._0xcc89b3) + 'e0PKZUPPGQ' + _0x41fced(0xbf3) + 'A+jFIEh8/Y' + '41m2znQrMS' + 'RyPpsB2zUw' + 'nXDNDm79ug' + 'GXbkNmbzG3' + 'uX6c2+ZexR' + 'w4sL9kAXYt' + _0x41fced(0x802) + _0x41fced(0xc30) + 'DWS6SFOvGq' + 'R4S0+vB9eM' + 'b0yc+AOgHs' + 'TY+eiPVcUn' + 'fHPl/Zto5o' + '4VNTLSyoz1' + '43MhkH5w1t' + 'kXFU4MaZRy' + 'vXf3mkBz+Z' + 'GBEVdEr7KZ' + 'iaUKVg6lcy' + 'zNkxQBoGQo' + 'aWYlDOuOUa' + '7vTRGmrWvh' + _0x41fced(_0x100b98._0x74c58f) + '5BCkpaWFQh' + _0x41fced(0xbca) + '5C54/USop+' + 'rjkDafKJ64' + 'sFCwr+Ddyt' + 'QZ3pntrOAD' + 'I9+J7Auf4x' + 'Tgmp1rn3pj' + _0x41fced(0xc60) + '40haEwjIUg' + 'jylVlDhBCL' + 'CNjKEjhpny' + 'mPywo1KBWR' + 'lM49ihm70n' + _0x41fced(_0x100b98._0x3fd915) + '4HHKMgsgkk' + 'j+BRLAGk0T' + 'QUx8MA0joI' + _0x41fced(_0x100b98._0x11d2d5) + _0x41fced(0xda1) + 'ioel/J77U9' + 'uBysW//MeF' + 'usko+eiPgX' + 'OB0ikdoDe/' + '7R17dJfaOX' + _0x41fced(0xdc6) + 'vhuiivX/mD' + _0x41fced(0xa98) + _0x41fced(0x8ee) + 'IZiX9spXTz' + 'bUWQZoqjXB' + 'rG/Dp07YbB' + 'ldH++PcxxI' + _0x41fced(0x3d1) + 'SlKE+zT3z5' + 'XcuW+Vm0zo' + '1rQOduhynE' + 'KR7vvd8zO0' + 'FnU46e674A' + _0x41fced(0xd3d) + 'mgvBYDfq3I' + 'R4QWdcC7Dg' + 'gvGulAQQtj' + '2NeGEww9gO' + 'fJYdMijjdy' + 'RRN9Dpo4aF' + 'vgoNSwsNE0' + '1Y94PmP9HK' + 'GdQT1smwsv' + 'tx6NzjHdmn' + 'Yxu2lq+/cq' + 'x6VDfM/UQj' + _0x41fced(_0x100b98._0x4f75df) + _0x41fced(0x71d) + 'sqcZr8/OsC' + _0x41fced(0xdc2) + 'DaJxxAwetm' + 'bhDi3ogTxj' + 'p4YykDUDed' + _0x41fced(_0x100b98._0x4643d6) + 'DSCLa1pCkN' + 'vRCmMlhvHO' + 'tLQ0LJgIsT' + 'DAMIydfu/c' + 'ARhfh9V41+' + '3NA4lQXIR7' + 'oeP31758Qe') + (_0x41fced(0x332) + 'JREjrgR69Y' + 'ef33LVX4b0' + _0x41fced(0x7b3) + 'cWNKRt4gWM' + '3yc+kwdoxt' + _0x41fced(_0x100b98._0x1d3a0a) + _0x41fced(0x899) + _0x41fced(0x78c) + _0x41fced(0x3f4) + _0x41fced(0x333) + _0x41fced(_0x100b98._0x4c876b) + 'DQMLg0Nu1k' + _0x41fced(0xc7b) + '89Rsn6t68s' + _0x41fced(0x2ab) + 'A6mJjfiumN' + _0x41fced(0xd03) + 'rXXFf9mOuh' + _0x41fced(_0x100b98._0x1499bc) + 'rByfa+eVho' + 'F9v5PBbWNk' + 'QQZs4Bzakg' + 'pCNadp8zAD' + 'PpiNiIBOPj' + 'ON5bFpqyUw' + 'zFhjCCCECG' + 'PBfmaCg0jM' + _0x41fced(0x3ea) + 'Y2WOLLx6bB' + 'XQ9jHhthTp' + _0x41fced(_0x100b98._0x48a1c5) + _0x41fced(_0x100b98._0x5c23c6) + _0x41fced(_0x100b98._0x3aa1c6) + 'oSYQYUwAbf' + 'FhsJVCY7kb' + '2RKslBbXMK' + 'gjYUCfqRgY' + 'wg8mEQSWfk' + 'Vym66iiakY' + _0x41fced(_0x100b98._0x101f8e) + 'nCaPEdW0YS' + 'FUryHQyA81' + 'kjYM4HuTpd' + 'OdYXxysLD/' + _0x41fced(_0x100b98._0x11a487) + _0x41fced(_0x100b98._0x1b3be7) + 't4hlQ3xs9I' + 'j1ty9LV/0Y' + 'uhl9GBl4FD' + 'T1hoQpqIeU' + 'RE8xsjcrVI' + 'KUjF4ohjxU' + _0x41fced(0x476) + 'PDusfslKFe' + '7RrjYcCQhJ' + '25OGypPVyc' + 'hjrTII0F/C' + _0x41fced(0xd23) + _0x41fced(_0x100b98._0x17e4af) + 'ZzjR0cVJz+' + '0VsLnth47o' + 'k5SC5wUzLH' + '3TH+L6YjA9' + 'qjL3XIrF98' + 'wJ4kCwMqiB' + '+I5GckytPs' + 'KpakJbCw0D' + '8zCo23GmXF' + 'A4UTGPDHRA' + _0x41fced(0xe25) + 'TVzof1pXZH' + _0x41fced(0xb97) + _0x41fced(0x28c) + 'PwNNtASTtq' + 'V4xOLKwu+c' + 'd+YUdEsdZl' + 'QEo3g8J8cw' + 'NRCkrWviTq' + _0x41fced(0x672) + 'L2JWhohCkS' + 'WQx7MFDQF0' + _0x41fced(0x763) + _0x41fced(0x253) + _0x41fced(_0x100b98._0x57852a) + _0x41fced(_0x100b98._0x4fcd9a) + _0x41fced(_0x100b98._0x11945b) + _0x41fced(0x7d3) + 'htFZCSWiYO' + 'qt7vo/D+7c' + _0x41fced(0xdd5) + 'nIgTIgKMyb' + 'PP6bUzbxOA' + _0x41fced(_0x100b98._0xb2d462) + _0x41fced(_0x100b98._0x3a4c24) + _0x41fced(_0x100b98._0x5ad87c) + 'Uy8E3sR0cN' + 'h6mHBKAYX0' + 'h28lhbmhbq' + 'xO0KIe2pCT') + (_0x41fced(_0x100b98._0x3cd48c) + 'LYfZ+9fd1K' + _0x41fced(0x618) + '5TiXgEXY+K' + _0x41fced(0xafc) + 'kIEfJKNlhN' + _0x41fced(_0x100b98._0xa082c9) + _0x41fced(_0x100b98._0x57040d) + _0x41fced(_0x100b98._0x15c0b5) + 'UjKM6l6NJp' + 'wd6P+qsTAa' + '+9P1WBACwW' + _0x41fced(0x209) + _0x41fced(_0x100b98._0x3ce68b) + 'nWvfcdOeVm' + _0x41fced(_0x100b98._0x1621fb) + '1mkG/6R3un' + 'l8eMCZKGaW' + 'iUBYP2eubn' + 'YtJOpevEjN' + _0x41fced(_0x100b98._0x396074) + _0x41fced(0x5df) + 'qPsQcT0f2+' + _0x41fced(0xdeb) + 'R7EBhtykLW' + 'DWHdMBqGkM' + 'bHHt6rPHI6' + 'rNwpoSZ+o3' + _0x41fced(_0x100b98._0x3b72e7) + 'w9dEDNzGV6' + 'MseP+2OftW' + _0x41fced(0xc82) + '1CjO4zU95u' + 'qI5iRslkDD' + _0x41fced(0x1ef) + 'RizdWFcIFJ' + 'jCYXHGWEYi' + 'pMSuAt/J3p' + '2BM9YMaZXB' + '54g0jYbSQq' + _0x41fced(0x1b5) + 'PqycDiqcrl' + '+d/c4ME7bd' + _0x41fced(0xb2b) + _0x41fced(_0x100b98._0x8a925e) + 'X1bnI+/8kK' + 'LqSBgPAYI+' + 'CN9oJGdQ8a' + 'M1FEhEtROf' + 'zSiHXShYds' + 'czYAcA8tqw' + 'WGJPPw+zIA' + 'wL+PftfuM5' + _0x41fced(0x45b) + _0x41fced(0x4a4) + _0x41fced(0x8f1) + 'Y335BP7Q8D' + 'mJPVK/JajL' + 'a+vnwry9PF' + 'P+T+UOKboD' + 'Nln+BeRhV7' + _0x41fced(_0x100b98._0x15a1a8) + 'BEkiYsir6V' + _0x41fced(_0x100b98._0x3ca623) + _0x41fced(0xcb4) + 'XQrYMzICxp' + '7vSYBnYzGB' + '6maVMGcuLY' + 'RpZjIsRMKB' + '1cedH3n8Ov' + '0cAsOkeHV6' + 'LP2RTKo7uH' + 'icQ6BM2TD6' + 'cgdvk/fu39' + 'XZ052oecWg' + 'YQqmhINDUC' + 'azZQ+iXwMw' + _0x41fced(_0x100b98._0x171aca) + _0x41fced(_0x100b98._0x628f37) + 'gQ0qsj/ZjI' + _0x41fced(0xa1d) + _0x41fced(_0x100b98._0x887315) + 'cWwngL/s8g' + _0x41fced(0xd35) + 'paqPA1MxcM' + 'sMmz51+570' + 'E6xcRsYAvb' + 'r6wKmsuGNY' + 'cnvxU+StFo' + 'B7sd0xip3U' + _0x41fced(0xb68) + 'Ami2B2gQml' + 'n9CgBOvLID' + '1GMWLmEKFR' + 'iSm61u3JWM' + 'iFgGE4CMON' + 'rGbOvmJYsC' + 'TSPDQiiWMK' + '6WBjDi3eCU' + '/gs+xTqj+R') + ('LhIbsqUwt8' + 'B9HuNhrH0D' + _0x41fced(_0x100b98._0x529a1f) + _0x41fced(0x225) + '6CaViPxJww' + 'tnqMRwEI2E' + 'czHs9IR/WJ' + 'hSp9KfQA8i' + _0x41fced(0xa11) + 'HCS6WDwtEC' + 'R2KE4GHFqI' + 'q5j6RqUpnQ' + 'gUUCaxsMTo' + _0x41fced(_0x100b98._0x4e522c) + _0x41fced(0x529) + 'TU+FkMPeit' + _0x41fced(_0x100b98._0x1d1d68) + 'c575+801VO' + '/ur2Q51jTi' + 'tX47qM9KMt' + _0x41fced(0x701) + 'I7eMXB0oHh' + _0x41fced(_0x100b98._0x6318b0) + 'ooBhK6HWQT' + 'eH3jsDR/if' + 'nqzwtXQ1HP' + 'esCrElxvZq' + 'K0tqGKIpwx' + 'c9fPMD9Aja' + _0x41fced(0x5a8) + 'yS0S4M9n9I' + 'P1QM+7eBln' + 'dMmq6voB8X' + 'Y2iW7ckIJr' + 'Q2Cjv02DWg' + '4VxLRyeSKE' + 'QxSor7NXTv' + _0x41fced(_0x100b98._0x43df97) + _0x41fced(_0x100b98._0x3290b7) + '4rds4F4reH' + 'LVkIuMugAN' + _0x41fced(_0x100b98._0x4ae75e) + 'YRSQLmeJvY' + 'C0alg6En85' + 'jINQIsGKXo' + '055GN07/vU' + 'L3VuOBx89H' + 'ERUgGUBH5H' + 'IKoL0EaZ2o' + 'XQFCIx6f8Y' + 'szgApfy8N9' + 'bJz++PumY7' + _0x41fced(_0x100b98._0x3f3cd4) + 'DlVHr7SPVf' + 't5mAe0h4wW' + 'KeaHG7lU7R' + 'i7qd//wdXv' + _0x41fced(0x97f) + _0x41fced(_0x100b98._0x2fc7b9) + '4jRsjkQeRq' + 'M/lAafvBta' + _0x41fced(_0x100b98._0x3e330c) + 'uMw1N2A+cb' + _0x41fced(_0x100b98._0x306540) + 'zW4nxL6TT3' + _0x41fced(0x7b2) + _0x41fced(_0x100b98._0x249f4f) + 'psbCKiiVKX' + 'aioL5FgrJS' + 'OyPJw254cS' + 'I2Y+9JBFoN' + 'iBQy0AILYH' + 'XBERhpiVMg' + 'w1jcxWhWib' + '8bPDOocEZy' + 'mH2K5G/LKO' + 'sPyMcBzMNb' + 'KsO5+tAYCk' + '+29xCdFkhG' + _0x41fced(_0x100b98._0xe0fa6) + _0x41fced(0x8d7) + 'msRYXDDImh' + _0x41fced(_0x100b98._0x1541fd) + 'KtWfYUfjw4' + _0x41fced(0x3d9) + _0x41fced(_0x100b98._0x3a5aa2) + 'CF0mj85Wev' + 'OzOocCY8nG' + 'DjN3/UUh4f' + _0x41fced(_0x100b98._0x174f0c) + 'w6am/KkruP' + _0x41fced(_0x100b98._0x20be2d) + 'sHSeZkpbXP' + '5WY8OZjbj5' + 'feKUeYb58w' + '9k3IFexe0e' + 'TeYWlHUpCB' + 'mfRlQvjTf6' + _0x41fced(_0x100b98._0x533aff) + 'jdonOq5nxv') + ('5EBzpHyYdP' + '39L8Jek+Ye' + _0x41fced(0x6db) + 'chjIHtyQ0b' + '9YSRPzbo7Z' + 'z4nbY3wRRb' + 'sJba3ONFYb' + 'zdJyV4RGfn' + 'SmUOFMsSYE' + 'ZHpO33SeTC' + 'TrfRf3DDkm' + 'ht8njBBgAi' + 'ZAcmN/Tm4g' + 'RIO1Wob6Te' + 'lGKmORlrVn' + 'oD/bZPiGLB' + 'DDqrf4LLNJ' + 'RYkE2PfMgv' + _0x41fced(_0x100b98._0x19823e) + _0x41fced(_0x100b98._0x3e9541) + '7t8D1smheS' + _0x41fced(0x2fc) + 'Mrg+xL/vc1' + _0x41fced(0xa35) + 'KO7DcSlH2V' + 'W+i6ZYBhaX' + 'SjYsHQvoby' + '12CK9OQ2lV' + 'FhMyoqjGnw' + 'WdZDCisT6A' + _0x41fced(0xae4) + 'ZeMlZw4Vzp' + 'iuA877D9Zg' + _0x41fced(_0x100b98._0x2bf650) + '7uSdSm9DFu' + _0x41fced(0x8ce) + 'nfbErpF9uD' + 'fvGYcQr2YI' + 'rWM7Q7wRWB' + _0x41fced(_0x100b98._0x414d0c) + _0x41fced(0x560) + 'xcjqwI8v+e' + 'jMkcI3mrdm' + 'fGbbVXlYOJ' + _0x41fced(0x7db) + 'TqRqDIXRz8' + _0x41fced(0xb31) + 'MMEoMMKmMG' + 'GNcWejmDQR' + 'Jk8koVmdFk' + _0x41fced(_0x100b98._0x291c62) + 'CmRDM3A9Iz' + 'mFpqWlkU7s' + _0x41fced(_0x100b98._0x5b42fa) + '/MT/1GUOEb' + 'zZYzFO3Ql0' + '0A+yfdekel' + 'fhRf4FnHeH' + _0x41fced(0xa5f) + '1CfQdxvuQL' + _0x41fced(_0x100b98._0x296bc8) + _0x41fced(0xbee) + 'AyX4B6FAh3' + 'fxQNlEByoB' + _0x41fced(0xa2c) + _0x41fced(0x450) + 'Ga6dIp27H2' + _0x41fced(_0x100b98._0x4ec18c) + _0x41fced(_0x100b98._0x595137) + 'hgt0nBJgGL' + '0HMD/FSKQy' + _0x41fced(_0x100b98._0x308e9c) + _0x41fced(0x26f) + _0x41fced(_0x100b98._0x255397) + _0x41fced(_0x100b98._0x512070) + 'RWspRrYzmN' + 'GYkcwDHZOV' + 'YcLjY7E+II' + 'SxwxCsvuyr' + 'h85Y13yb/Y' + _0x41fced(0x550) + 'q22uPym9uP' + 'sGb7+U7oT2' + 'ZO01A792kk' + _0x41fced(_0x100b98._0x1f8827) + _0x41fced(_0x100b98._0x2d605a) + 'RU1H74qBE3' + _0x41fced(0xb87) + 'g3YCtOKC20' + 'lFuf8OC+AV' + 'T4plj7rXMp' + _0x41fced(0x203) + _0x41fced(0xd9c) + 'YZCmGVR/Zg' + '8mLA97MBHi' + 'N+5RCjk66+' + _0x41fced(_0x100b98._0x1ef894) + _0x41fced(0x898) + _0x41fced(_0x100b98._0x3e0248) + 'bzMLMvH58g') + ('fbOMy8o3mI' + 'lnp3AP+8He' + 'p5eyJTxwBZ' + 'N0NKIhuH/D' + '2o1A4pjfMj' + 'UC41G3cQS7' + 'gCR/SgVsIx' + _0x41fced(0xd47) + 'VAJ2DUEKHC' + _0x41fced(0x407) + 'I3p+uA3/XI' + _0x41fced(_0x100b98._0x2cfd4c) + _0x41fced(_0x100b98._0x2db2a6) + '4gG/ZlbziT' + '0cGXZNGPs/' + 'FzOozICwxu' + 'OdgFZhmkHb' + 'ew48MOVb8O' + '+3nfHZV72c' + 'W3lPX3TekE' + _0x41fced(0xde4) + _0x41fced(_0x100b98._0x14294b) + 'sNomQ2pDGG' + _0x41fced(_0x100b98._0x14389d) + _0x41fced(0xd10) + _0x41fced(0x7ad) + 'GTc61qvDMN' + 'raRhLGAYvy' + 'Jz9cIEUb8p' + 'VPg2dB1E2q' + 'W/aRtErbzm' + 'AUshucfIX/' + 'WVkw6YxQM+' + 'LR83cnkDzg' + 'NwSfsv3afo' + 'WKk29EjySL' + _0x41fced(0x1c9) + '+tI6vU8mfW' + _0x41fced(_0x100b98._0x14a468) + 'U1/9+DXjkA' + _0x41fced(_0x100b98._0x44a05f) + _0x41fced(_0x100b98._0x118fd4) + 'cZ8W1GWwja' + 'WWaclTskdi' + _0x41fced(0xb29) + 'd+m8SKzbng' + 'zkyJCReKAu' + 'q+YPkbSQ9c' + 'erh/aL328B' + _0x41fced(0xd0f) + _0x41fced(0xd40) + _0x41fced(_0x100b98._0x20c7c6) + 'HuB1YQDLRo' + _0x41fced(_0x100b98._0x337589) + _0x41fced(_0x100b98._0x5a1243) + 'lE7hyLmZ2+' + 'M97RmBjKRe' + 'Bx9H/w1Y6h' + _0x41fced(0x5f9) + 'Rt8GKXwHrP' + '1ou+Dpj//S' + 'H3rRmLJk2Q' + _0x41fced(_0x100b98._0x1f4861) + 'Y0zlRGI1we' + 'DY3Mo2Lema' + 'wT+8mMXTkn' + 'qHjVKM+mfU' + _0x41fced(_0x100b98._0x301b99) + 'AORntDG8PA' + 'WpEHSWWa3j' + 'fPhTnc7C1Z' + 'GnPHWd69z2' + 'c3dmwSt//K' + '8x9hbaaUDB' + 'seZwEL7Fq+' + _0x41fced(_0x100b98._0x5e6138) + 'DY75Zfoetl' + 'tPzVY23ZIM' + 'gDhYfMSEr0' + 'KmNPMr4/0X' + 'YEQIa++4R2' + '4OARag8m8e' + 'dAPJEzj18d' + _0x41fced(_0x100b98._0x5786f2) + '1U+I5YB6Nd' + 'evCerL7EaZ' + _0x41fced(_0x100b98._0x57b269) + 'O4B4+tKnlA' + _0x41fced(0xaec) + _0x41fced(0x63d) + _0x41fced(_0x100b98._0x3ec4f5) + _0x41fced(0xc0b) + '/rbOD9d0UK' + _0x41fced(0x281) + 'vqRi1wgufK' + 'KgiTGwt6+r' + 'j7GDLzcWIw' + _0x41fced(_0x100b98._0xbc80) + 'EjmHHkjPLn' + 'lJ+13nz1wB') + ('lr3wkpnA2s' + 'xwSwlx78Tc' + _0x41fced(_0x100b98._0x5e060c) + 'lmilT8SS+t' + '113LKJnTpQ' + 'eJnE/XKz6b' + _0x41fced(_0x100b98._0x4db193) + 'CKWZ7j5wXu' + 'nEndeeJaRw' + _0x41fced(0xbfd) + 'f6b3SMmrSx' + 'ilAWK+qzFg' + _0x41fced(_0x100b98._0x4fa862) + _0x41fced(0x862) + '3u/ZfxQUCo' + 'oRF3H1B+Mg' + _0x41fced(_0x100b98._0x23bf6c) + 'sXBTlx58UU' + '5O7unzX5iB' + _0x41fced(0xa8c) + 'UWcUlEWTAw' + _0x41fced(0x53c) + 'S8l6dZZvVn' + 'rVO/3whnFS' + _0x41fced(_0x100b98._0x4e7108) + '+POaGw4eHM' + '6DxloTGG2P' + 'ydSxX2jDuR' + _0x41fced(0xb96) + '0x76Zgjabp' + 'q284VBVbFn' + _0x41fced(0x4ba) + 'Xhhwo/L/4X' + 'jAwMgGRKNo' + _0x41fced(0x785) + 'g9dICvx5Vf' + _0x41fced(0x230) + _0x41fced(0xbf4) + 'TOOtZj0QK8' + 'uWj1hqcn/L' + _0x41fced(0xaac) + 'Pk4S007sQU' + 'g56Hs6FWDa' + 'Q6th4rE1om' + 'cRKZx9rCfA' + 'BahtvBaW8n' + '+a+Esowqfo' + 'm0XACsNgp/' + 'Hexy9tfGv1' + _0x41fced(_0x100b98._0x4ed0e3) + '37QOG/g/Vk' + 'eFmU6tquCd' + _0x41fced(_0x100b98._0x57058a) + 'nXBt19Rtn8' + 'CASfTfxPnf' + 'xHoKvH3rze' + 'NI+F/H+d/G' + '+jV4/1dx/m' + '9gPXPE/02U' + _0x41fced(_0x100b98._0x27e89c) + 'nk/z7IxPr/' + 'AL1nlZOecg' + '7oAAAAAElF' + 'TkSuQmCC\x20s' + 'tyle=\x22widt' + 'h:\x2050px;\x20h' + _0x41fced(0x826) + _0x41fced(0xabe) + '\x20\x20\x20\x20\x20\x20\x20<di' + _0x41fced(0xcd5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + 'h1\x20style=\x22' + _0x41fced(0xd1e) + '\x22>Hendrix\x20' + _0x41fced(_0x100b98._0x4767cb) + 'er</h1>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc78) + 'le=\x22margin' + _0x41fced(0xbbc) + '0;\x22>©\x202026' + '\x20by\x20Sang\x20H' + 'endrix\x20-\x20<' + _0x41fced(0x981) + 'tps://sang' + 'hendrix.it' + _0x41fced(_0x100b98._0x1c60ec) + 'ghendrix.i' + _0x41fced(0xacf) + '</p>\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ae) + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20<bu' + _0x41fced(_0x100b98._0x21eaf5) + 'ck=\x22openLi' + 'brary()\x22\x20c' + 'lass=\x22btn\x20' + 'btn-primar' + _0x41fced(0xc69)) + ('elp-btn\x22>A' + 'nimation\x20L' + 'ibrary</bu' + _0x41fced(_0x100b98._0xdb3e2b) + _0x41fced(_0x100b98._0x2be183) + 'iv\x20class=\x22' + _0x41fced(0xe04) + '>\x0a\x20\x20\x20\x20<div' + '>\x0a\x0a\x20\x20\x20\x20<di' + 'v\x20class=\x22i' + 'nfo-text\x22>' + '\x0a\x20\x20\x20\x20\x20\x20Cli' + _0x41fced(0xd96) + 'vent/playe' + 'r\x20to\x20previ' + _0x41fced(0x787) + _0x41fced(0xb86) + '\x20editor\x20as' + '\x20Target\x0a\x20\x20' + '\x20\x20</div>\x0a\x0a' + '\x20\x20\x20\x20<div\x20c' + 'lass=\x22thre' + 'e-column-l' + _0x41fced(0x800) + _0x41fced(0x4fe) + 'COLUMN\x20-->' + '\x0a\x20\x20<div\x20cl' + 'ass=\x22colum' + 'n\x22>\x0a\x20\x20\x20\x20<h' + '3>Basic\x20Se' + 'ttings</h3' + '>\x0a\x0a\x20\x20\x20\x20<di' + 'v\x20class=\x22f' + 'ield\x22>\x0a\x20\x20\x20' + '\x20\x20\x20<label>' + 'Animation\x20' + 'Name</labe' + 'l>\x0a\x20\x20\x20\x20\x20\x20<' + 'input\x20type' + '=\x22text\x22\x20id' + '=\x22animatio' + _0x41fced(_0x100b98._0x90825c) + '\x22\x20placehol' + 'der=\x22Enter' + '\x20animation' + '\x20name\x22>\x0a\x20\x20' + '\x20\x20</div>\x0a\x0a' + _0x41fced(0xd20) + 'lass=\x22fiel' + 'd\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1fedbb) + _0x41fced(_0x100b98._0x4298ad) + 'eet</label' + '>\x0a\x20\x20\x20\x20\x20\x20<d' + _0x41fced(0x3f6) + 'file-box\x22\x20' + 'id=\x22fileBo' + 'x\x22\x20onclick' + '=\x22selectSp' + 'ritesheet(' + ')\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x709) + '\x20select\x20sp' + 'ritesheet\x0a' + '\x20\x20\x20\x20\x20\x20</di' + 'v>\x0a\x20\x20\x20\x20\x20\x20<' + 'input\x20type' + _0x41fced(_0x100b98._0x515373) + '=\x22fileInpu' + _0x41fced(_0x100b98._0x3fa34b) + '\x22image/*\x22>' + '\x0a\x20\x20\x20\x20</div' + _0x41fced(_0x100b98._0x1bf4d0) + 'v\x20class=\x22f' + _0x41fced(0x76e) + _0x41fced(0x553) + '\x22display:\x20' + _0x41fced(0x58b) + '-template-' + _0x41fced(_0x100b98._0x350157) + _0x41fced(0xe46) + _0x41fced(_0x100b98._0xa842b2) + '\x20\x20\x20\x20<div>\x0a' + '\x20\x20\x20\x20\x20\x20<lab' + 'el>Rows</l' + 'abel>\x0a\x20\x20\x20\x20' + '\x20\x20<input\x20t' + _0x41fced(_0x100b98._0x366502) + 'r\x22\x20id=\x22row' + 'Input\x22\x20val' + 'ue=\x221\x22\x20min' + '=\x221\x22\x20max=\x22' + '20\x22\x20onchan' + _0x41fced(0x6ee) + 'Preview()\x22' + '>\x0a\x20\x20\x20\x20</di' + _0x41fced(_0x100b98._0x4fee27) + _0x41fced(0x84a) + _0x41fced(0xc31) + 'mns</label') + ('>\x0a\x20\x20\x20\x20\x20\x20<i' + 'nput\x20type=' + _0x41fced(_0x100b98._0x2c05f7) + _0x41fced(0xdec) + 'nput\x22\x20valu' + 'e=\x221\x22\x20min=' + '\x221\x22\x20max=\x222' + _0x41fced(_0x100b98._0x45dbc2) + 'e=\x22updateP' + 'review()\x22>' + '\x0a\x20\x20\x20\x20</div' + _0x41fced(_0x100b98._0x3d0997) + _0x41fced(_0x100b98._0x3595a2) + _0x41fced(0x864) + _0x41fced(_0x100b98._0x19d73a) + _0x41fced(_0x100b98._0x2233f6) + 'label\x20styl' + _0x41fced(0x94e) + _0x41fced(0x9ce) + 'ign-items:' + '\x20center;\x20c' + 'ursor:\x20poi' + 'nter;\x20user' + '-select:\x20n' + _0x41fced(0x741) + '\x20\x20\x20\x20\x20<inpu' + _0x41fced(_0x100b98._0x5c7125) + 'eckbox\x22\x20id' + _0x41fced(0x2e2) + 'etSpriteCh' + 'eckbox\x22\x20ch' + 'ecked\x20styl' + 'e=\x22width:\x20' + _0x41fced(_0x100b98._0x2d0a88) + 'in-right:\x20' + '8px;\x22>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20<span' + '>Save\x20targ' + 'et\x20sprite<' + _0x41fced(_0x100b98._0x2eefab) + '\x20\x20\x20</label' + _0x41fced(0x67f) + _0x41fced(0x521) + 'iv\x20class=\x22' + 'field\x22\x20id=' + _0x41fced(0x914) + _0x41fced(0x39d) + 'e=\x22display' + ':\x20none;\x22>\x0a' + '\x20\x20\x20\x20\x20\x20<lab' + _0x41fced(0xbae) + 'display:\x20f' + _0x41fced(_0x100b98._0x572117) + '-items:\x20ce' + 'nter;\x20curs' + 'or:\x20pointe' + _0x41fced(0xa2a) + 'lect:\x20none' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x496031) + 'ype=\x22check' + 'box\x22\x20id=\x22a' + 'utoSaveChe' + 'ckbox\x22\x20sty' + 'le=\x22width:' + '\x20auto;\x20mar' + 'gin-right:' + '\x208px;\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20<spa' + 'n>Auto\x20Sav' + 'e\x20&\x20Update' + '</span>\x0a\x20\x20' + _0x41fced(0x210) + 'l>\x0a\x20\x20\x20\x20</d' + 'iv>\x0a\x0a\x20\x20\x20\x20<' + _0x41fced(0xa31) + _0x41fced(_0x100b98._0x11a334) + _0x41fced(_0x100b98._0x19248f) + 'on\x20class=\x22' + _0x41fced(_0x100b98._0x54368a) + 'n\x22\x20onclick' + '=\x22saveToLi' + _0x41fced(0x9a5) + 'ave\x20to\x20Lib' + 'rary</butt' + 'on>\x0a\x20\x20\x20\x20</' + 'div>\x0a\x20\x20</d' + 'iv>\x0a\x0a\x20\x20<!-' + '-\x20CENTER\x20C' + 'OLUMN\x20-->\x0a' + '\x20\x20<div\x20cla' + 'ss=\x22column' + '\x22>\x0a\x20\x20\x20\x20<h3' + _0x41fced(0x88d) + 'ew</h3>\x0a\x20\x20' + _0x41fced(_0x100b98._0x573039) + 'ss=\x22previe' + _0x41fced(_0x100b98._0x3b1310) + 'ontainer\x22>' + '\x0a\x20\x20\x20\x20\x20\x20<ca') + (_0x41fced(_0x100b98._0x582c18) + _0x41fced(_0x100b98._0x1f6e43) + 'as\x22></canv' + 'as>\x0a\x20\x20\x20\x20\x20\x20' + '<div\x20class' + '=\x22preview-' + _0x41fced(0x927) + _0x41fced(_0x100b98._0x3fa9e3) + _0x41fced(_0x100b98._0x1a0d12) + '=\x22bgToggle' + 'Black\x22\x20cla' + 'ss=\x22bg-tog' + 'gle-btn\x20bg' + '-toggle-bl' + 'ack\x22\x20title' + _0x41fced(_0x100b98._0x37754e) + _0x41fced(0xb9a) + 'onclick=\x22t' + 'ogglePrevi' + 'ewBg(\x27#000' + _0x41fced(_0x100b98._0x18ff4b) + 'oggleBlack' + '\x27)\x22></butt' + _0x41fced(0x2f3) + '\x20\x20<button\x20' + _0x41fced(_0x100b98._0x57bc0d) + 'leWhite\x22\x20c' + _0x41fced(_0x100b98._0x4987b8) + _0x41fced(_0x100b98._0x38cc6a) + _0x41fced(0x622) + 'white\x22\x20tit' + 'le=\x22White\x20' + _0x41fced(_0x100b98._0x14ac01) + _0x41fced(_0x100b98._0x14fc76) + '\x22togglePre' + 'viewBg(\x27#f' + 'fffff\x27,\x20\x27b' + 'gToggleWhi' + 'te\x27)\x22></bu' + 'tton>\x0a\x20\x20\x20\x20' + '\x20\x20</div>\x0a\x20' + _0x41fced(0x27c) + '\x20\x20\x20\x20<div\x20s' + 'tyle=\x22marg' + 'in-top:\x2015' + 'px;\x20displa' + 'y:\x20grid;\x20g' + 'rid-templa' + 'te-columns' + ':\x201fr\x201fr;' + '\x20gap:\x2010px' + _0x41fced(0x6e3) + '<!--\x20TRANS' + _0x41fced(0xc9b) + 'NGS\x20-->\x0a\x20\x20' + '\x20\x20\x20\x20<div\x20s' + 'tyle=\x22padd' + 'ing:\x2012px;' + '\x20backgroun' + 'd:\x20rgba(25' + _0x41fced(_0x100b98._0xac9c2d) + _0x41fced(0xdfd) + 'border-rad' + 'ius:\x208px;\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '<p\x20class=\x22' + 'section-ti' + 'tle\x22>Trans' + _0x41fced(0x6f0) + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + 'field\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<l' + _0x41fced(0xd94) + '=\x22display:' + '\x20flex;\x20ali' + 'gn-items:\x20' + _0x41fced(_0x100b98._0xaf03a2) + 'rsor:\x20poin' + _0x41fced(_0x100b98._0x1fb50c) + 'select:\x20no' + 'ne;\x22>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<i' + _0x41fced(_0x100b98._0x50fbed) + _0x41fced(0x44b) + '\x20id=\x22rever' + 'seCheckbox' + '\x22\x20onchange' + '=\x22updatePr' + 'eview()\x22\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20style=\x22' + _0x41fced(0x565) + 'o;\x20margin-' + 'right:\x208px' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3e1bee) + _0x41fced(0x3e0) + _0x41fced(0x4cd) + 'pan>\x0a\x20\x20\x20\x20\x20') + (_0x41fced(0x4a5) + 'el>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20</div>\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + 'field\x22>\x0a\x20\x20' + _0x41fced(0x4e2) + _0x41fced(_0x100b98._0x228190) + _0x41fced(0x990) + '\x20flex;\x20ali' + 'gn-items:\x20' + _0x41fced(_0x100b98._0x2b2c4d) + _0x41fced(0x9bd) + 'ter;\x20user-' + _0x41fced(0x610) + _0x41fced(_0x100b98._0x3f6372) + _0x41fced(0x4fc) + 'nput\x20type=' + '\x22checkbox\x22' + '\x20id=\x22flipH' + 'orizontalC' + 'heckbox\x22\x20o' + 'nchange=\x22u' + 'pdatePrevi' + 'ew()\x22\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'style=\x22wid' + 'th:\x20auto;\x20' + 'margin-rig' + 'ht:\x208px;\x22>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x6da) + _0x41fced(0x2c4) + _0x41fced(_0x100b98._0x1d6066) + _0x41fced(_0x100b98._0x3fa9e3) + '\x20\x20</label>' + _0x41fced(0xa20) + '/div>\x0a\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x506401) + 'class=\x22fie' + _0x41fced(_0x100b98._0x1ae37c) + _0x41fced(0x6a7) + 'l\x20style=\x22d' + 'isplay:\x20fl' + 'ex;\x20align-' + 'items:\x20cen' + _0x41fced(_0x100b98._0x51b4d0) + _0x41fced(0x41b) + ';\x20user-sel' + 'ect:\x20none;' + '\x22>\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x73b) + 't\x20type=\x22ch' + 'eckbox\x22\x20id' + _0x41fced(0xc42) + 'ipHorizont' + 'alCheckbox' + '\x22\x20onchange' + '=\x22updatePr' + _0x41fced(_0x100b98._0x4441ca) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20style=\x22' + _0x41fced(0x565) + 'o;\x20margin-' + 'right:\x208px' + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x391) + _0x41fced(_0x100b98._0x1b92ca) + 'lip\x20Horizo' + 'ntal</span' + _0x41fced(_0x100b98._0x147b92) + '\x20\x20</label>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20<' + '/div>\x0a\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20<div\x20' + _0x41fced(0x89f) + 'ld\x22>\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x6a7) + 'l\x20style=\x22d' + _0x41fced(_0x100b98._0x1b2bbe) + 'ex;\x20align-' + 'items:\x20cen' + 'ter;\x20curso' + _0x41fced(0x41b) + ';\x20user-sel' + 'ect:\x20none;' + _0x41fced(0x1ea) + '\x20\x20\x20\x20\x20<inpu' + 't\x20type=\x22ch' + 'eckbox\x22\x20id' + _0x41fced(0x776) + 'icalCheckb' + _0x41fced(0x45f) + _0x41fced(0x6ee) + 'Preview()\x22' + _0x41fced(_0x100b98._0x60a487) + '\x20\x20\x20\x20\x20style' + '=\x22width:\x20a' + 'uto;\x20margi' + _0x41fced(_0x100b98._0x5d0c5d)) + ('px;\x22>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<s' + 'pan>Flip\x20V' + 'ertical</s' + 'pan>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20</lab' + 'el>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20</div>\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + 'field\x22>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<l' + 'abel\x20style' + '=\x22display:' + '\x20flex;\x20ali' + 'gn-items:\x20' + _0x41fced(_0x100b98._0xaf03a2) + 'rsor:\x20poin' + 'ter;\x20user-' + 'select:\x20no' + 'ne;\x22>\x0a\x20\x20\x20\x20' + _0x41fced(0x4fc) + _0x41fced(_0x100b98._0x39f7b4) + _0x41fced(0x44b) + '\x20id=\x22rando' + 'mFlipVerti' + 'calCheckbo' + _0x41fced(0x7cf) + 'e=\x22updateP' + 'review()\x22\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3cb252) + '\x22width:\x20au' + _0x41fced(0x3d8) + _0x41fced(_0x100b98._0xc6d4c2) + _0x41fced(0xba4) + _0x41fced(_0x100b98._0x526053) + 'an>Random\x20' + 'Flip\x20Verti' + 'cal</span>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20</label>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20</' + 'div>\x0a\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x320422) + 'lass=\x22fiel' + 'd\x22>\x0a\x20\x20<lab' + 'el\x20style=\x22' + 'display:\x20f' + 'lex;\x20justi' + 'fy-content' + _0x41fced(0xcc2) + 'tween;\x20ali' + 'gn-items:\x20' + 'center;\x22>\x0a' + '\x20\x20\x20\x20<span>' + _0x41fced(0x689) + '<span\x20id=\x22' + _0x41fced(0x62f) + 'splay\x22\x20sty' + _0x41fced(_0x100b98._0x44be70) + _0x41fced(0x215) + '>0°</span>' + _0x41fced(_0x100b98._0x2fb522) + '\x20\x20<label\x20s' + 'tyle=\x22disp' + 'lay:\x20flex;' + _0x41fced(0x711) + 'ms:\x20center' + ';\x20cursor:\x20' + _0x41fced(_0x100b98._0x5b809f) + 'ser-select' + ':\x20none;\x20ma' + 'rgin:\x200;\x20f' + 'ont-weight' + ':\x20normal;\x20' + 'font-size:' + '\x2011px;\x22>\x0a\x20' + '\x20\x20\x20\x20\x20<inpu' + 't\x20type=\x22ch' + 'eckbox\x22\x20id' + '=\x22randomRo' + 'tationChec' + _0x41fced(0x8d0) + 'ange=\x22upda' + _0x41fced(0xcfe) + _0x41fced(_0x100b98._0x48ac87) + '\x20style=\x22wi' + 'dth:\x20auto;' + '\x20margin-ri' + 'ght:\x204px;\x22' + _0x41fced(_0x100b98._0x10067c) + 'pan>Random' + 'ize</span>' + '\x0a\x20\x20\x20\x20</lab' + 'el>\x0a\x20\x20</la' + 'bel>\x0a\x20\x20<in' + _0x41fced(0xd5a) + 'range\x22\x20id=' + '\x22rotationI') + ('nput\x22\x20valu' + 'e=\x220\x22\x20min=' + '\x220\x22\x20max=\x223' + _0x41fced(_0x100b98._0x22fff7) + 'input=\x22upd' + 'ateRotatio' + 'nDisplay()' + _0x41fced(_0x100b98._0x19a163) + 'eview()\x22>\x0a' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20</div>\x0a' + '\x0a\x20\x20\x20\x20\x20\x20<!-' + '-\x20ANIMATIO' + 'N\x20SETTINGS' + '\x20-->\x0a\x20\x20\x20\x20\x20' + '\x20<div\x20styl' + 'e=\x22padding' + ':\x2012px;\x20ba' + _0x41fced(0xb60) + 'rgba(255,\x20' + _0x41fced(_0x100b98._0x1e323c) + '0.03);\x20bor' + 'der-radius' + ':\x208px;\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20<p\x20' + _0x41fced(_0x100b98._0x222dc1) + 'tion-title' + '\x22>Animatio' + _0x41fced(0x317) + '</p>\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20<div\x20c' + _0x41fced(0x70a) + 'd\x22>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<label' + '>Opening\x20A' + 'nimation</' + 'label>\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20<se' + 'lect\x20id=\x22o' + 'peningAnim' + 'ationInput' + _0x41fced(_0x100b98._0x1348d5) + _0x41fced(0xe14) + 'eview()\x22>\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<option\x20' + _0x41fced(_0x100b98._0x1f9563) + 'e\x22\x20selecte' + 'd>None</op' + 'tion>\x0a\x20\x20\x20\x20' + _0x41fced(0x34b) + 'ption\x20valu' + 'e=\x22fadeIn\x22' + '>Fade\x20In</' + _0x41fced(0x380) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '<option\x20va' + 'lue=\x22scale' + _0x41fced(_0x100b98._0x239018) + _0x41fced(0x7fc) + _0x41fced(0x7fa) + _0x41fced(_0x100b98._0x24b63c) + 'n\x20value=\x22s' + _0x41fced(_0x100b98._0x385a3c) + 'h\x22>Scale\x20I' + 'n\x20-\x20Width\x20' + _0x41fced(_0x100b98._0xecea8e) + 'on>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20<opt' + 'ion\x20value=' + '\x22scaleInHe' + 'ight\x22>Scal' + _0x41fced(0x77f) + 'ght\x20Only</' + 'option>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20</' + _0x41fced(0xcf0) + '\x20\x20\x20\x20\x20\x20</di' + 'v>\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20<div\x20cla' + 'ss=\x22field\x22' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20<label>E' + _0x41fced(_0x100b98._0x4f9a1b) + 'ation</lab' + _0x41fced(0xd43) + '\x20\x20\x20\x20<selec' + 't\x20id=\x22endi' + 'ngAnimatio' + _0x41fced(0x1c6) + _0x41fced(_0x100b98._0x4058a1) + _0x41fced(_0x100b98._0x4b36da) + 'w()\x22>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<o' + _0x41fced(0xbf2) + _0x41fced(0x8f0) + 'elected>No' + _0x41fced(_0x100b98._0x5afad3) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20<optio') + ('n\x20value=\x22f' + 'adeOut\x22>Fa' + 'de\x20Out</op' + _0x41fced(0x5a6) + '\x20\x20\x20\x20\x20\x20\x20\x20<o' + 'ption\x20valu' + 'e=\x22scaleOu' + _0x41fced(0x20d) + 'ut</option' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20</select' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20<div' + _0x41fced(0xc51) + 'eld\x22>\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x16ff34) + _0x41fced(0x882) + _0x41fced(_0x100b98._0x1e1092) + _0x41fced(0x296) + '</label>\x0a\x20' + _0x41fced(_0x100b98._0x1d48ec) + 'input\x20type' + _0x41fced(_0x100b98._0x403703) + 'id=\x22animat' + 'ionDuratio' + 'nInput\x22\x20va' + _0x41fced(_0x100b98._0x545abf) + 'in=\x221\x22\x20max' + _0x41fced(_0x100b98._0x50c3ec) + 'hange=\x22upd' + 'atePreview' + _0x41fced(_0x100b98._0xcda924) + '\x20\x20\x20\x20\x20<div\x20' + 'style=\x22fon' + 't-size:\x2010' + 'px;\x20color:' + _0x41fced(_0x100b98._0x293ce5) + 'gin-top:\x202' + 'px;\x22>60\x20fr' + 'ames\x20≈\x201\x20s' + 'econd</div' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '</div>\x0a\x20\x20\x20' + '\x20\x20\x20</div>\x0a' + '\x20\x20\x20\x20</div>' + '\x0a\x20\x20</div>\x0a' + '\x0a\x20\x20<!--\x20RI' + 'GHT\x20COLUMN' + '\x20-->\x0a\x20\x20<di' + 'v\x20class=\x22c' + 'olumn\x22>\x0a\x20\x20' + '\x20\x20<h3>Visu' + 'al\x20Setting' + 's</h3>\x0a\x0a\x20\x20' + _0x41fced(0x644) + 'ss=\x22field\x22' + '>\x0a\x20\x20\x20\x20\x20\x20<l' + _0x41fced(0x775) + _0x41fced(0x484) + '\x20(FPS)</la' + 'bel>\x0a\x20\x20\x20\x20\x20' + '\x20<input\x20ty' + _0x41fced(_0x100b98._0x269d05) + '\x22\x20id=\x22fpsI' + 'nput\x22\x20valu' + 'e=\x2260\x22\x20min' + '=\x221\x22\x20max=\x22' + '60\x22\x20onchan' + _0x41fced(0x6ee) + 'Preview()\x22' + '>\x0a\x20\x20\x20\x20</di' + _0x41fced(_0x100b98._0x557c69) + 'iv\x20class=\x22' + 'field\x22>\x0a\x20\x20' + _0x41fced(0xc71) + _0x41fced(_0x100b98._0x1e933d) + '\x20grid;\x20gri' + _0x41fced(_0x100b98._0x565c44) + '-columns:\x20' + '1fr\x201fr;\x20g' + 'ap:\x208px;\x22>' + '\x0a\x20\x20\x20\x20<div>' + '\x0a\x20\x20\x20\x20\x20\x20<la' + 'bel>Scale\x20' + _0x41fced(0x736) + '>\x0a\x20\x20\x20\x20\x20\x20<i' + 'nput\x20type=' + '\x22number\x22\x20i' + _0x41fced(_0x100b98._0xa3b8b6) + 'put\x22\x20value' + '=\x22100\x22\x20min' + _0x41fced(0x472) + '\x22500\x22\x20onch' + 'ange=\x22upda' + _0x41fced(0xcfe) + ')\x22>\x0a\x20\x20\x20\x20</' + _0x41fced(0x9ff) + _0x41fced(_0x100b98._0x148b3b) + _0x41fced(_0x100b98._0x362595)) + ('acity\x20(0-2' + '55)</label' + '>\x0a\x20\x20\x20\x20\x20\x20<i' + 'nput\x20type=' + '\x22number\x22\x20i' + _0x41fced(0x416) + _0x41fced(_0x100b98._0x3b9948) + _0x41fced(_0x100b98._0x580190) + _0x41fced(0x38b) + '=\x22255\x22\x20onc' + 'hange=\x22upd' + 'atePreview' + '()\x22>\x0a\x20\x20\x20\x20<' + '/div>\x0a\x20\x20</' + _0x41fced(0xa6b) + '>\x0a\x0a\x20\x20\x20\x20<di' + 'v\x20class=\x22f' + _0x41fced(0xdae) + _0x41fced(0x3e9) + _0x41fced(0xa9d) + '\x20id=\x22hueDi' + _0x41fced(0x980) + 'le=\x22color:' + '\x20#FFD700;\x22' + '>0°</span>' + _0x41fced(0x674) + '\x20\x20\x20\x20\x20<inpu' + _0x41fced(0x8bd) + 'nge\x22\x20id=\x22h' + 'ueInput\x22\x20v' + _0x41fced(0xa2b) + 'in=\x22-180\x22\x20' + _0x41fced(_0x100b98._0x29be4c) + _0x41fced(_0x100b98._0x5ddadc) + 'input=\x22upd' + 'ateHueDisp' + 'lay();\x20upd' + 'atePreview' + '()\x22>\x0a\x20\x20\x20\x20<' + '/div>\x0a\x0a\x20\x20\x20' + '\x20<div\x20clas' + _0x41fced(0x415) + '\x0a\x20\x20\x20\x20\x20\x20<la' + _0x41fced(_0x100b98._0x286ec7) + _0x41fced(0x5bf) + 'l>\x0a\x20\x20\x20\x20\x20\x20<' + _0x41fced(0x768) + _0x41fced(0xdb8) + _0x41fced(_0x100b98._0x579489) + 'hange=\x22upd' + _0x41fced(0x1ae) + '()\x22>\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20<option' + '\x20value=\x22No' + 'rmal\x22\x20sele' + 'cted>Norma' + 'l</option>' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20<' + 'option\x20val' + 'ue=\x22Screen' + '\x22>Screen</' + _0x41fced(0x380) + '\x20\x20\x20\x20\x20\x20<opt' + 'ion\x20value=' + '\x22Add\x22>Add<' + '/option>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20<op' + 'tion\x20value' + _0x41fced(0xb8d) + '\x22>Multiply' + _0x41fced(0xacc) + '\x20\x20\x20\x20\x20\x20</se' + 'lect>\x0a\x20\x20\x20\x20' + '</div>\x0a\x0a\x20\x20' + '\x20\x20<div\x20cla' + 'ss=\x22field\x22' + '>\x0a\x20\x20\x20\x20\x20\x20<l' + _0x41fced(_0x100b98._0xc73e6e) + 'ex</label>' + _0x41fced(_0x100b98._0x24dbc9) + _0x41fced(0xcbd) + _0x41fced(0xd4d) + '\x22\x20onchange' + _0x41fced(_0x100b98._0x4e2acc) + 'eview()\x22>\x0a' + _0x41fced(0x34b) + 'ption\x20valu' + _0x41fced(_0x100b98._0x212db1) + 'elected>Au' + 'to</option' + _0x41fced(_0x100b98._0x2a3734) + _0x41fced(0x8a5) + _0x41fced(_0x100b98._0x33445f) + '-\x20Far\x20Back' + 'ground</op' + 'tion>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20<optio' + 'n\x20value=\x222' + _0x41fced(0x915) + _0x41fced(_0x100b98._0x121c66)) + (_0x41fced(_0x100b98._0xd12c18) + '\x20\x20\x20\x20<optio' + 'n\x20value=\x223' + '\x22>3\x20-\x20Behi' + 'nd\x20Tiles</' + _0x41fced(0x380) + _0x41fced(_0x100b98._0xa18f2) + 'ion\x20value=' + '\x224\x22>4\x20-\x20Be' + 'low\x20Charac' + 'ters</opti' + 'on>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20<option\x20' + 'value=\x225\x22>' + '5\x20-\x20Same\x20a' + 's\x20Characte' + 'rs</option' + _0x41fced(_0x100b98._0x147b92) + '<option\x20va' + 'lue=\x226\x22>6\x20' + '-\x20Above\x20Ch' + 'aracters</' + 'option>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20<opt' + _0x41fced(_0x100b98._0x5d1f7f) + '\x227\x22>7\x20-\x20Ab' + 'ove\x20Everyt' + 'hing</opti' + 'on>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20<option\x20' + 'value=\x228\x22>' + '8\x20-\x20Top\x20La' + _0x41fced(_0x100b98._0x4309ec) + 'n>\x0a\x20\x20\x20\x20\x20\x20<' + _0x41fced(_0x100b98._0x15f4fe) + _0x41fced(_0x100b98._0x49f123) + _0x41fced(_0x100b98._0x357085) + 'class=\x22fie' + _0x41fced(_0x100b98._0x37a372) + '\x20class=\x22fi' + _0x41fced(_0x100b98._0x294059) + 'iv\x20style=\x22' + 'display:\x20g' + 'rid;\x20grid-' + 'template-c' + 'olumns:\x201f' + 'r\x201fr;\x20gap' + _0x41fced(_0x100b98._0x5a2b75) + '\x20\x20\x20<div>\x0a\x20' + '\x20\x20\x20\x20\x20<labe' + _0x41fced(_0x100b98._0x8deae6) + '</label>\x0a\x20' + '\x20\x20\x20\x20\x20<inpu' + 't\x20type=\x22nu' + 'mber\x22\x20id=\x22' + 'offsetXInp' + 'ut\x22\x20value=' + '\x220\x22\x20min=\x22-' + '999\x22\x20max=\x22' + '999\x22\x20oncha' + 'nge=\x22updat' + _0x41fced(0x8b5) + '\x22>\x0a\x20\x20\x20\x20</d' + _0x41fced(0xae0) + 'iv>\x0a\x20\x20\x20\x20\x20\x20' + '<label>Off' + 'set\x20Y</lab' + 'el>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x179767) + 'e=\x22number\x22' + '\x20id=\x22offse' + 'tYInput\x22\x20v' + _0x41fced(_0x100b98._0x18bd06) + 'in=\x22-999\x22\x20' + 'max=\x22999\x22\x20' + 'onchange=\x22' + 'updatePrev' + 'iew()\x22>\x0a\x20\x20' + '\x20\x20</div>\x0a\x20' + '\x20</div>\x0a</' + 'div>\x0a\x0a\x20\x20\x20\x20' + '<!--\x20BLOOM' + '\x20SETTINGS\x20' + '-->\x0a\x20\x20\x20\x20<d' + _0x41fced(0x433) + _0x41fced(_0x100b98._0x31174a) + ':\x2015px;\x20pa' + _0x41fced(0xadc) + _0x41fced(_0x100b98._0x19c36f) + _0x41fced(0x996) + _0x41fced(0xe37) + _0x41fced(0x29c) + _0x41fced(0xa0a) + _0x41fced(_0x100b98._0x52e40a) + ';\x22>\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x596e51) + 'section-ti' + _0x41fced(0x662) + '\x20Settings<' + '/p>\x0a\x0a\x20\x20\x20\x20\x20') + ('\x20<div\x20clas' + 's=\x22field\x22>' + _0x41fced(0xa20) + _0x41fced(_0x100b98._0x206a06) + 'e=\x22display' + ':\x20flex;\x20al' + 'ign-items:' + _0x41fced(0x6b4) + 'ursor:\x20poi' + _0x41fced(_0x100b98._0x536427) + '-select:\x20n' + _0x41fced(0x741) + _0x41fced(0xd7a) + _0x41fced(0xd5a) + 'checkbox\x22\x20' + _0x41fced(0xcb3) + 'heckbox\x22\x20o' + 'nchange=\x22u' + 'pdatePrevi' + _0x41fced(_0x100b98._0x91548d) + _0x41fced(_0x100b98._0x2a4947) + 'yle=\x22width' + ':\x20auto;\x20ma' + 'rgin-right' + _0x41fced(_0x100b98._0x5a2b75) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20<' + _0x41fced(0xb8c) + 'e\x20Bloom\x20Ef' + _0x41fced(0x619) + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '</label>\x0a\x20' + '\x20\x20\x20\x20\x20</div' + _0x41fced(_0x100b98._0x3f9605) + 'div\x20class=' + '\x22field\x22>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20<la' + _0x41fced(0x629) + 'mount</lab' + 'el>\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20<input\x20t' + 'ype=\x22numbe' + _0x41fced(0x8ab) + 'rAmountInp' + 'ut\x22\x20value=' + '\x2215\x22\x20min=\x22' + '1\x22\x20max=\x2250' + _0x41fced(_0x100b98._0x5298e6) + '=\x22updatePr' + _0x41fced(0x33f) + _0x41fced(_0x100b98._0x1ed3f4) + 'v>\x0a\x0a\x20\x20\x20\x20\x20\x20' + '<div\x20class' + '=\x22field\x22>\x0a' + _0x41fced(0x4e2) + _0x41fced(_0x100b98._0x843827) + 'sity\x20(0-25' + _0x41fced(_0x100b98._0x54e746) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20<' + 'input\x20type' + '=\x22number\x22\x20' + 'id=\x22intens' + _0x41fced(0x290) + 'value=\x22255' + '\x22\x20min=\x220\x22\x20' + 'max=\x22255\x22\x20' + 'onchange=\x22' + 'updatePrev' + _0x41fced(_0x100b98._0x31f270) + _0x41fced(0x25a) + '\x0a\x0a\x20\x20\x20\x20\x20\x20<d' + 'iv\x20class=\x22' + 'field\x22>\x0a\x20\x20' + _0x41fced(_0x100b98._0x23986f) + 'el>Tint\x20Co' + 'lor</label' + '>\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '<input\x20typ' + 'e=\x22color\x22\x20' + 'id=\x22tintCo' + 'lorInput\x22\x20' + 'value=\x22#FF' + 'FFFF\x22\x20onch' + 'ange=\x22upda' + _0x41fced(_0x100b98._0x34000e) + ')\x22\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x423cef) + 'height:\x2040' + _0x41fced(0x5b7) + ':\x20pointer;' + '\x22>\x0a\x20\x20\x20\x20\x20\x20<' + '/div>\x0a\x20\x20\x20\x20' + '</div>\x0a\x20\x20<' + '/div>\x0a</di' + 'v>\x0a\x0a\x20\x20<div' + '\x20id=\x22libra' + 'ryModal\x22\x20c' + 'lass=\x22libr' + 'ary-modal\x22' + '>\x0a\x20\x20\x20\x20<div' + '\x20class=\x22li') + ('brary-cont' + _0x41fced(_0x100b98._0x518cc2) + '\x20\x20<div\x20cla' + _0x41fced(_0x100b98._0x3cbf7f) + 'y-header\x22>' + _0x41fced(_0x100b98._0x4ee18e) + _0x41fced(0x1d8) + 'on\x20Library' + _0x41fced(_0x100b98._0x12692f) + '\x20\x20\x20\x20<div\x20s' + 'tyle=\x22disp' + 'lay:\x20flex;' + '\x20gap:\x2010px' + _0x41fced(_0x100b98._0x397d69) + _0x41fced(0x6f1) + 'n\x20class=\x22r' + 'emove-spri' + _0x41fced(0xc1a) + '\x22\x20onclick=' + '\x22removeAll' + _0x41fced(_0x100b98._0x1a903d) + _0x41fced(0xc61) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x68c) + _0x41fced(0x8f9) + 'rites\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20<d' + 'iv\x20style=\x22' + 'font-size:' + '\x2010px;\x20fon' + 't-weight:\x20' + 'normal;\x20ma' + _0x41fced(0x8fe) + '2px;\x22>Help' + '\x20reduce\x20an' + 'imation\x20se' + 'ttings\x20fil' + 'e\x20size\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x1d48ec) + '/div>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20</bu' + 'tton>\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x59ce8b) + 'ton\x20class=' + '\x22close-lib' + 'rary\x22\x20oncl' + _0x41fced(0x51b) + 'Library()\x22' + _0x41fced(0xa4d) + 'button>\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20</di' + 'v>\x0a\x20\x20\x20\x20\x20\x20<' + _0x41fced(_0x100b98._0x2d9947) + '\x20\x20<div\x20id=' + '\x22libraryGr' + 'id\x22\x20class=' + '\x22library-g' + 'rid\x22>\x0a\x20\x20\x20\x20' + _0x41fced(0x7bd) + _0x41fced(_0x100b98._0x38955b) + '\x20\x20</div>\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x734) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20let\x20' + 'previewCan' + _0x41fced(0x66f) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20le' + 't\x20previewC' + 'tx\x20=\x20null;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20let' + '\x20currentSp' + 'ritesheet\x20' + '=\x20null;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xcee) + 'imationFra' + 'me\x20=\x200;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20la' + _0x41fced(_0x100b98._0x2d90ab) + 'e\x20=\x200;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x42607d) + 'nimating\x20=' + _0x41fced(_0x100b98._0x220ef1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20ch' + 'aracterSpr' + _0x41fced(0x797) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20le' + _0x41fced(_0x100b98._0x17c395) + 'rSpriteWid' + 'th\x20=\x200;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20ch' + _0x41fced(0x340)) + ('iteHeight\x20' + '=\x200;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20let\x20chara' + 'cterSprite' + 'RealWidth\x20' + '=\x200;\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x6a1) + _0x41fced(0x935) + 'RealHeight' + _0x41fced(_0x100b98._0x2d2a5f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20let\x20char' + _0x41fced(0x72e) + _0x41fced(_0x100b98._0x35cb01) + '\x20=\x2048;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20let\x20cha' + 'racterSpri' + 'teTileHeig' + _0x41fced(_0x100b98._0x1d88b0) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20let\x20i' + 'sDraggingA' + 'nimation\x20=' + '\x20false;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20dr' + 'agStartX\x20=' + _0x41fced(0xda7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xfb2ef) + 'artY\x20=\x200;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1a1313) + 'dragOffset' + 'X\x20=\x200;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x63d204) + _0x41fced(0x3cd) + 'gOffsetY\x20=' + '\x200;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'let\x20curren' + 'tRandomFli' + _0x41fced(0x455) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x620) + 't\x20currentR' + 'andomRotat' + 'ion\x20=\x200;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20let\x20r' + 'andomUpdat' + 'eCounter\x20=' + _0x41fced(0xda7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'let\x20openin' + 'gAnimation' + 'Progress\x20=' + '\x200;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4ed897) + 'AnimationP' + 'rogress\x20=\x20' + '0;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + _0x41fced(_0x100b98._0x33efcc) + 'ngOpeningA' + 'nim\x20=\x20fals' + _0x41fced(_0x100b98._0xa84262) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + 'et\x20isPlayi' + 'ngEndingAn' + 'im\x20=\x20false' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20le' + 't\x20animatio' + 'nLoopCount' + '\x20=\x200;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3b69d0) + '\x20\x20let\x20auto' + 'SaveTimeou' + 't\x20=\x20null;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20let\x20' + _0x41fced(0x307) + 'olor\x20=\x20\x27#1' + '11111\x27;\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20funct' + 'ion\x20toggle' + _0x41fced(_0x100b98._0x366555) + 'color,\x20btn' + 'Id)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x188f51) + 't\x20btn\x20=\x20do' + 'cument.get' + 'ElementByI') + ('d(btnId);\x0a' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + 'const\x20isAc' + _0x41fced(_0x100b98._0x415790) + _0x41fced(_0x100b98._0x109e2f) + '.contains(' + '\x27active\x27);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xd54ccb) + '\x20document.' + 'querySelec' + 'torAll(\x27.b' + 'g-toggle-b' + _0x41fced(_0x100b98._0x435689) + 'ch((b)\x20=>\x20' + 'b.classLis' + 't.remove(\x27' + 'active\x27));' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(isAct' + 'ive)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20previewBg' + 'Color\x20=\x20\x27#' + '111111\x27;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x20aaee) + _0x41fced(0xcff) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20previewB' + 'gColor\x20=\x20c' + 'olor;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'btn.classL' + 'ist.add(\x27a' + 'ctive\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2c9ba0) + _0x41fced(0x7da) + 'tElement.s' + 'tyle.backg' + _0x41fced(_0x100b98._0x3f205b) + _0x41fced(0x5d6) + 'or;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x504) + 'unction\x20up' + 'dateRotati' + 'onDisplay(' + _0x41fced(_0x100b98._0x2c50ac) + _0x41fced(0x8ef) + '\x20\x20\x20\x20const\x20' + 'rotationVa' + 'lue\x20=\x20docu' + 'ment.getEl' + _0x41fced(0x54b) + _0x41fced(0xc85) + _0x41fced(_0x100b98._0x411776) + _0x41fced(_0x100b98._0x14180e) + _0x41fced(_0x100b98._0x3875f9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20rota' + 'tionDispla' + 'y\x20=\x20docume' + 'nt.getElem' + 'entById(\x27r' + 'otationDis' + _0x41fced(0x80c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(rotation' + _0x41fced(0xc90) + _0x41fced(_0x100b98._0x14d8d9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20rotat' + 'ionDisplay' + '.textConte' + 'nt\x20=\x20rotat' + _0x41fced(0x9f7) + '\x20\x27°\x27;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x108441) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20functio' + 'n\x20updateRa' + 'ndomValues' + '()\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20rando') + ('mUpdateCou' + 'nter++;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x6058ef) + _0x41fced(_0x100b98._0x292397) + 'dateCounte' + 'r\x20>=\x2010)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20rando' + 'mUpdateCou' + 'nter\x20=\x200;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0xbcb) + 'mFlipHoriz' + 'ontal\x20=\x20do' + 'cument.get' + 'ElementByI' + _0x41fced(0x304) + 'lipHorizon' + _0x41fced(_0x100b98._0x269e24) + 'x\x27)?.check' + 'ed\x20||\x20fals' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20randomF' + 'lipVertica' + 'l\x20=\x20docume' + 'nt.getElem' + 'entById(\x27r' + 'andomFlipV' + _0x41fced(_0x100b98._0xafc9a6) + 'ckbox\x27)?.c' + 'hecked\x20||\x20' + 'false;\x0a\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20ran' + _0x41fced(_0x100b98._0x48d6a0) + 'n\x20=\x20docume' + 'nt.getElem' + 'entById(\x27r' + 'andomRotat' + 'ionCheckbo' + 'x\x27)?.check' + 'ed\x20||\x20fals' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5d6532) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(_0x100b98._0x5c36ca) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20if\x20(rand' + 'omFlipHori' + _0x41fced(_0x100b98._0xe6fb0b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20cu' + 'rrentRando' + 'mFlipX\x20=\x20M' + 'ath.random' + _0x41fced(0x9b6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4de104) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20currentRa' + 'ndomFlipX\x20' + _0x41fced(_0x100b98._0x51ccec) + _0x41fced(_0x100b98._0x2b2402) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x285849) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(ra' + 'ndomFlipVe' + 'rtical)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x534f5d) + _0x41fced(0xd4b) + _0x41fced(_0x100b98._0x170559) + 'mFlipY\x20=\x20M' + 'ath.random' + _0x41fced(_0x100b98._0x268dcd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x20else' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x37aff9) + '\x20currentRa' + _0x41fced(0xd70)) + ('=\x20false;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x364639) + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5c36ca) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(ra' + 'ndomRotati' + 'on)\x20{\x0a\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xd0a) + 'tRandomRot' + 'ation\x20=\x20Ma' + 'th.random(' + _0x41fced(0x7ae) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5b1bed) + _0x41fced(_0x100b98._0x5caad5) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1945cd) + 'currentRan' + 'domRotatio' + 'n\x20=\x200;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x347d6b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x27bc83) + 'oad\x20=\x20func' + _0x41fced(0x9ef) + _0x41fced(_0x100b98._0x285849) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20p' + 'reviewCanv' + _0x41fced(_0x100b98._0x1928a7) + _0x41fced(_0x100b98._0x271ee8) + 'mentById(\x27' + 'previewCan' + 'vas\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20pre' + _0x41fced(_0x100b98._0x1eb9d8) + _0x41fced(_0x100b98._0x438068) + 'vas.getCon' + 'text(\x272d\x27)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20previewC' + 'tx.imageSm' + 'oothingEna' + _0x41fced(_0x100b98._0x424a0b) + 'se;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20container' + '\x20=\x20preview' + _0x41fced(_0x100b98._0x48ea71) + 'entElement' + _0x41fced(_0x100b98._0x2de35f) + _0x41fced(_0x100b98._0xc4bdc2) + '\x20\x20const\x20co' + 'ntainerWid' + _0x41fced(0xc7d) + _0x41fced(_0x100b98._0x25bc4f) + _0x41fced(0xc44) + '0;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x226) + 'ontainerHe' + 'ight\x20=\x20con' + 'tainer.cli' + 'entHeight\x20' + '-\x2040;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20pre' + 'viewCanvas' + _0x41fced(0x32f) + _0x41fced(_0x100b98._0x21d94f) + 'ntainerWid' + 'th,\x20400);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'previewCan' + 'vas.height' + '\x20=\x20Math.mi' + 'n(containe' + 'rHeight,\x203' + '00);\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef)) + ('\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20prev' + 'iewCanvas.' + 'addEventLi' + _0x41fced(_0x100b98._0x20d95c) + 'usedown\x27,\x20' + 'onCanvasMo' + _0x41fced(0x916) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'previewCan' + 'vas.addEve' + 'ntListener' + '(\x27mousemov' + 'e\x27,\x20onCanv' + 'asMouseMov' + _0x41fced(_0x100b98._0x319216) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x6d4) + 'wCanvas.ad' + 'dEventList' + 'ener(\x27mous' + _0x41fced(0x37b) + 'nvasMouseU' + 'p);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x6d4) + _0x41fced(0xa4b) + _0x41fced(0x2d6) + 'ener(\x27mous' + 'eleave\x27,\x20o' + 'nCanvasMou' + _0x41fced(_0x100b98._0x245be0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + _0x41fced(0xbe1) + _0x41fced(_0x100b98._0xe57c64) + 'document.g' + 'etElementB' + _0x41fced(0x6a0) + _0x41fced(0x782) + 'put\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + _0x41fced(_0x100b98._0x19d2a9) + _0x41fced(0x42c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20animName' + _0x41fced(0xa5e) + _0x41fced(0x318) + 'er(\x27input\x27' + ',\x20updateAu' + 'toSaveVisi' + 'bility);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + _0x41fced(_0x100b98._0x1e3fca) + '\x20\x20\x20\x20\x20\x20\x20};\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x975) + _0x41fced(_0x100b98._0x8dce09) + _0x41fced(0x87a) + _0x41fced(_0x100b98._0x176729) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + _0x41fced(0xd89) + _0x41fced(0xa12) + 'et)\x20return' + _0x41fced(_0x100b98._0x489ebc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x378fcc) + 'ect\x20=\x20prev' + _0x41fced(0x3f5) + 'getBoundin' + 'gClientRec' + _0x41fced(0x9f2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20dragS' + 'tartX\x20=\x20e.' + 'clientX\x20-\x20' + 'rect.left;' + _0x41fced(_0x100b98._0x32fca2) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20dragStart' + _0x41fced(0xa40) + 'ntY\x20-\x20rect' + '.top;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20isDr' + 'aggingAnim' + _0x41fced(0x906) + 'ue;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3bc754) + _0x41fced(_0x100b98._0x4f5ff9) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20const') + ('\x20offsetXIn' + _0x41fced(0xc33) + _0x41fced(0x6fe) + _0x41fced(0x54b) + '\x27offsetXIn' + 'put\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4f10e8) + 'st\x20offsetY' + 'Input\x20=\x20do' + 'cument.get' + 'ElementByI' + _0x41fced(_0x100b98._0x3c3e25) + 'Input\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + _0x41fced(_0x100b98._0x376527) + '\x20=\x20parseIn' + 't(offsetXI' + 'nput.value' + _0x41fced(_0x100b98._0x4768ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20dr' + _0x41fced(0xdce) + '=\x20parseInt' + '(offsetYIn' + 'put.value)' + _0x41fced(_0x100b98._0x6a6a97) + _0x41fced(_0x100b98._0x272630) + '\x20\x20\x20\x20\x20\x20\x20\x20tr' + 'iggerAutoS' + 'ave();\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x5e07b9) + '\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x488) + '\x20onCanvasM' + _0x41fced(_0x100b98._0x346e7e) + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(!i' + 'sDraggingA' + 'nimation\x20|' + '|\x20!current' + 'Spriteshee' + 't)\x20return;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x234) + 'ct\x20=\x20previ' + 'ewCanvas.g' + _0x41fced(0xcf1) + 'ClientRect' + '();\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x479688) + _0x41fced(0x556) + _0x41fced(0x4ff) + '\x20e.clientX' + '\x20-\x20rect.le' + _0x41fced(_0x100b98._0x45ba88) + _0x41fced(_0x100b98._0x272630) + '\x20\x20\x20\x20const\x20' + 'currentY\x20=' + '\x20e.clientY' + '\x20-\x20rect.to' + 'p;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'deltaX\x20=\x20c' + 'urrentX\x20-\x20' + 'dragStartX' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20const\x20de' + 'ltaY\x20=\x20cur' + 'rentY\x20-\x20dr' + 'agStartY;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x334b12) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20new' + 'OffsetX\x20=\x20' + 'dragOffset' + 'X\x20+\x20Math.r' + 'ound(delta' + _0x41fced(0x34a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + _0x41fced(0xdf0) + '\x20=\x20dragOff' + 'setY\x20+\x20Mat' + 'h.round(de' + _0x41fced(_0x100b98._0x361b9a) + _0x41fced(_0x100b98._0x35991e) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20offset' + 'XInput\x20=\x20d' + _0x41fced(0x3bd) + 'tElementBy' + _0x41fced(0x423) + 'XInput\x27);\x0a' + _0x41fced(_0x100b98._0x15b9c3) + _0x41fced(_0x100b98._0x3b69d0) + 'const\x20offs' + 'etYInput\x20=' + '\x20document.' + 'getElement' + 'ById(\x27offs' + _0x41fced(0x4d2) + _0x41fced(_0x100b98._0x489ebc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb52) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa90) + 'setXInput)' + '\x20offsetXIn' + 'put.value\x20' + '=\x20newOffse' + _0x41fced(_0x100b98._0x1803cc) + _0x41fced(_0x100b98._0x35a808) + '\x20\x20\x20\x20if\x20(of' + 'fsetYInput' + ')\x20offsetYI' + _0x41fced(0x3eb) + _0x41fced(0x409) + 'etY;\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'function\x20o' + 'nCanvasMou' + _0x41fced(0x1e9) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(isDragg' + 'ingAnimati' + _0x41fced(_0x100b98._0x505001) + _0x41fced(0x8ef) + _0x41fced(0x8ef) + 'isDragging' + 'Animation\x20' + '=\x20false;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20offset' + 'XInput\x20=\x20d' + 'ocument.ge' + 'tElementBy' + 'Id(\x27offset' + 'XInput\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20const\x20' + 'offsetYInp' + 'ut\x20=\x20docum' + _0x41fced(0xa58) + _0x41fced(0xc43) + 'offsetYInp' + 'ut\x27);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x580) + _0x41fced(_0x100b98._0x211c54) + _0x41fced(0x938) + 'Input.valu' + 'e)\x20||\x200;\x0a\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20dragOff' + 'setY\x20=\x20par' + 'seInt(offs' + 'etYInput.v' + _0x41fced(0xc86) + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20w' + _0x41fced(0x590) + 'haracterSp' + _0x41fced(0x924) + _0x41fced(0xb65) + 'Url,\x20width' + ',\x20height,\x20' + _0x41fced(0x7dc) + '\x20realHeigh' + 't,\x20tileWid' + 'th,\x20tileHe' + 'ight,\x20char') + ('acterPrior' + 'ity)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20img\x20=\x20n' + 'ew\x20Image()' + _0x41fced(_0x100b98._0x1416d7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20img.onlo' + 'ad\x20=\x20funct' + _0x41fced(_0x100b98._0xabee7d) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20characte' + _0x41fced(_0x100b98._0xddfc3b) + 'img;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0x22c) + 'riteWidth\x20' + '=\x20width;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3bc971) + '\x20\x20\x20charact' + 'erSpriteHe' + 'ight\x20=\x20hei' + _0x41fced(0x3c3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'haracterSp' + 'riteRealWi' + 'dth\x20=\x20real' + 'Width\x20||\x20w' + 'idth;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'characterS' + _0x41fced(0xd07) + 'eight\x20=\x20re' + 'alHeight\x20|' + '|\x20height;\x0a' + _0x41fced(_0x100b98._0xaf1e77) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20charac' + _0x41fced(_0x100b98._0x45e576) + 'ileWidth\x20=' + '\x20tileWidth' + _0x41fced(_0x100b98._0x2f485e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x399b0f) + 'rSpriteTil' + 'eHeight\x20=\x20' + 'tileHeight' + '\x20||\x2048;\x0a\x20\x20' + _0x41fced(_0x100b98._0x4e423d) + _0x41fced(0x8ef) + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xaf1e77) + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20zIndexS' + _0x41fced(0xc5d) + 'cument.get' + _0x41fced(_0x100b98._0x48d2fe) + 'd(\x27zIndexI' + 'nput\x27);\x0a\x20\x20' + _0x41fced(_0x100b98._0x5b1bed) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20if\x20(zInd' + 'exSelect\x20&' + '&\x20characte' + _0x41fced(0x1b3) + _0x41fced(0xb5b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20zIndexSel' + 'ect.value\x20' + '=\x20characte' + 'rPriority;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x559d3f) + _0x41fced(_0x100b98._0x1dd59f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x41fced(_0x100b98._0x54957f) + 'ng)\x20{\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x8f1af1) + _0x41fced(_0x100b98._0x3bc754) + _0x41fced(0xc25) + 'ating\x20=\x20tr' + 'ue;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x509) + 'review();\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20};\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + _0x41fced(0x379) + 'ataUrl;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xd75) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20functi' + _0x41fced(_0x100b98._0x398f01) + 'pritesheet' + _0x41fced(_0x100b98._0x49bf92) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x153e02) + _0x41fced(_0x100b98._0x340fbe) + _0x41fced(_0x100b98._0x3d562f) + 'tElementBy' + _0x41fced(0x843) + 'put\x27);\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x3bc754) + _0x41fced(_0x100b98._0xc94023) + 'ut.onchang' + 'e\x20=\x20async\x20' + _0x41fced(0xdc1) + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'if\x20(e.targ' + 'et.files\x20&' + '&\x20e.target' + '.files[0])' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x51bb22) + 'onst\x20file\x20' + '=\x20e.target' + '.files[0];' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(window.o' + 'pener\x20&&\x20w' + 'indow.open' + 'er.FileSys' + 'temHelper)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20relat' + 'ivePath\x20=\x20' + _0x41fced(0x321) + 'ow.opener.' + 'FileSystem' + 'Helper.vfx' + _0x41fced(0xdf1) + _0x41fced(0x8a7) + _0x41fced(0x9b9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3ef) + 'vePath)\x20{\x0a' + _0x41fced(_0x100b98._0x531c26) + '\x20\x20\x20\x20\x20\x20upda' + _0x41fced(0x872) + 'lay(relati' + _0x41fced(_0x100b98._0x5eb4e8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x8a810c) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20const' + '\x20reader\x20=\x20' + 'new\x20FileRe' + 'ader();\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20reader' + '.onload\x20=\x20' + 'function(e' + _0x41fced(0x4e0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x556) + _0x41fced(_0x100b98._0x43f7c1) + 'Image();\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20img.o' + _0x41fced(_0x100b98._0x4f4d00) + 'nction()\x20{' + _0x41fced(0xd99) + _0x41fced(0xbd0) + 'rentSprite' + 'sheet\x20=\x20im' + 'g;\x0a\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'if\x20(!isAni' + 'mating)\x20{\x0a' + _0x41fced(_0x100b98._0x157efd) + _0x41fced(0x1b0) + _0x41fced(_0x100b98._0x5600c3) + _0x41fced(0x954) + _0x41fced(_0x100b98._0x559d3f) + '\x20\x20animateP' + 'review();\x0a' + _0x41fced(_0x100b98._0x2b2402) + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20') + (_0x41fced(0x8ef) + '\x20\x20\x20\x20};\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20img.src' + '\x20=\x20event.t' + 'arget.resu' + 'lt;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x31e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20r' + 'eader.read' + 'AsDataURL(' + _0x41fced(0x482) + _0x41fced(0x8ef) + _0x41fced(0x7b5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20};\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3281d2) + 'fileInput.' + 'click();\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'function\x20u' + 'pdateFileD' + 'isplay(fil' + 'eName)\x20{\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0xa1143e) + '\x20fileBox\x20=' + _0x41fced(_0x100b98._0x3e8fcd) + 'getElement' + 'ById(\x27file' + 'Box\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(fil' + 'eBox)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20fileBo' + 'x.textCont' + _0x41fced(_0x100b98._0xe94e09) + 'Name;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20fileBox.' + 'classList.' + 'add(\x27has-f' + 'ile\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3bc971) + 'function\x20a' + 'nimatePrev' + _0x41fced(0xc3d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x15d733) + 'currentTim' + 'e\x20=\x20Date.n' + 'ow();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc62) + 's\x20=\x20parseI' + 'nt(documen' + _0x41fced(0xb7f) + 'ntById(\x27fp' + _0x41fced(0xbb1) + 'alue)\x20||\x201' + '0;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xbac) + 'onst\x20frame' + 'Delay\x20=\x2010' + '00\x20/\x20fps;\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + _0x41fced(0x410) + _0x41fced(_0x100b98._0x5df8bb) + _0x41fced(_0x100b98._0x525440) + '=\x20frameDel' + 'ay)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3e8426) + 'iewFrame()' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20la' + 'stFrameTim' + 'e\x20=\x20curren' + _0x41fced(0x473) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x8946f6) + _0x41fced(_0x100b98._0x1e56b3) + _0x41fced(0xd1b) + 'nimationFr' + 'ame(animat' + 'ePreview);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20func' + 'tion\x20drawP' + _0x41fced(_0x100b98._0x3ddca1) + 'e()\x20{\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xaf1e77) + _0x41fced(0x489) + _0x41fced(0xdbc) + 'eInt(docum' + 'ent.getEle' + _0x41fced(_0x100b98._0x217420) + 'scaleInput' + '\x27).value)\x20' + '/\x20100\x20||\x201' + _0x41fced(0x76a) + _0x41fced(_0x100b98._0x2a8046) + 'nst\x20zIndex' + 'Value\x20=\x20do' + 'cument.get' + _0x41fced(0xe39) + _0x41fced(_0x100b98._0x299a18) + _0x41fced(_0x100b98._0x39bb35) + _0x41fced(_0x100b98._0x57af53) + 'to\x27;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20zIn' + 'dex\x20=\x20zInd' + 'exValue\x20==' + '=\x20\x27auto\x27\x20?' + '\x205\x20:\x20parse' + 'Int(zIndex' + 'Value);\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4f1127) + 'ewCtx.clea' + _0x41fced(_0x100b98._0x4bc671) + _0x41fced(_0x100b98._0x362eb2) + 'anvas.widt' + 'h,\x20preview' + _0x41fced(_0x100b98._0x5a087f) + 'ght);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20previewC' + _0x41fced(_0x100b98._0x2b100c) + _0x41fced(0x90d) + 'ewBgColor;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x463241) + _0x41fced(_0x100b98._0x1aada1) + 'llRect(0,\x20' + _0x41fced(_0x100b98._0x48c626) + _0x41fced(_0x100b98._0x2cfaa6) + 'th,\x20previe' + 'wCanvas.he' + 'ight);\x0a\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(zI' + 'ndex\x20===\x205' + _0x41fced(_0x100b98._0x2c50ac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'drawWithYS' + 'orting(sca' + 'le);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x31b411) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20drawChar' + _0x41fced(0xaae) + '\x20=\x20zIndex\x20' + _0x41fced(_0x100b98._0x31c8d6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(dra' + 'wCharacter' + _0x41fced(0x63f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xc0ed2d) + _0x41fced(_0x100b98._0x290cf7) + 'yer(scale)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4d8889) + 'awAnimatio' + _0x41fced(_0x100b98._0x533d17) + _0x41fced(_0x100b98._0x3c4cac) + _0x41fced(0x8ef) + _0x41fced(0x665) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20draw' + 'AnimationL' + 'ayer(scale' + _0x41fced(_0x100b98._0x11d68b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + _0x41fced(_0x100b98._0x5da3d8) + 'erLayer(sc' + 'ale);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc3c) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x229740) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x41fced(_0x100b98._0x5b55af)) + ('\x20\x20\x20\x20\x20\x20\x20fun' + 'ction\x20draw' + _0x41fced(0xa32) + 'ng(scale)\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x2dc) + 'racterSpri' + 'te\x20&&\x20!cur' + _0x41fced(_0x100b98._0x414170) + _0x41fced(0x68a) + 'urn;\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x31942b) + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x267) + 't\x20charDraw' + 'Height\x20=\x20c' + 'haracterSp' + 'riteHeight' + _0x41fced(0xa45) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'const\x20char' + 'Y\x20=\x20(previ' + 'ewCanvas.h' + 'eight\x20-\x20ch' + _0x41fced(0x855) + 'ht)\x20/\x202;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20chara' + 'cterBottom' + _0x41fced(0xdc9) + '+\x20charDraw' + 'Height;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x5a4560) + 'et\x20animati' + _0x41fced(0xd3a) + '=\x200;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(c' + 'urrentSpri' + 'tesheet)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(_0x100b98._0x486e46) + 'rseInt(doc' + 'ument.getE' + 'lementById' + '(\x27rowInput' + '\x27).value)\x20' + '||\x201;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4f7639) + _0x41fced(0x8ef) + 'const\x20colu' + 'mns\x20=\x20pars' + 'eInt(docum' + 'ent.getEle' + _0x41fced(_0x100b98._0x301f38) + 'columnInpu' + 't\x27).value)' + '\x20||\x201;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20const\x20off' + _0x41fced(_0x100b98._0x18088a) + 'seInt(docu' + 'ment.getEl' + _0x41fced(0x54b) + _0x41fced(0x59e) + 'put\x27)?.val' + 'ue)\x20||\x200;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x229377) + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5690f8) + _0x41fced(_0x100b98._0x103549) + _0x41fced(0xc1d) + 'Width\x20=\x20cu' + 'rrentSprit' + 'esheet.wid' + 'th\x20/\x20colum' + 'ns;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2a8046) + 'nst\x20frameH' + 'eight\x20=\x20cu' + 'rrentSprit' + _0x41fced(_0x100b98._0x55d4a4) + 'ght\x20/\x20rows' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1d2e44) + _0x41fced(0x267) + _0x41fced(_0x100b98._0x4caa04) + _0x41fced(_0x100b98._0x13612c)) + ('Height\x20*\x20s' + _0x41fced(0x9b0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20charDrawW' + 'idth\x20=\x20cha' + 'racterSpri' + 'teWidth\x20*\x20' + 'scale;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x535) + 'eenY\x20=\x20cha' + 'rY\x20+\x20charD' + _0x41fced(_0x100b98._0xd94836) + '-\x20(charDra' + _0x41fced(_0x100b98._0x40680f) + '2);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4cbe56) + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20\x20const\x20g' + 'ameOffsetY' + '\x20=\x20offsetY' + '\x20*\x202;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20canv' + _0x41fced(_0x100b98._0x5e6ba1) + 'charDrawWi' + 'dth\x20/\x20char' + 'acterSprit' + 'eRealWidth' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x35991e) + _0x41fced(_0x100b98._0x188f51) + _0x41fced(0x244) + 'fsetY\x20=\x20ga' + _0x41fced(_0x100b98._0x2b0177) + '*\x20canvasSc' + _0x41fced(_0x100b98._0x5dc72c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x556) + _0x41fced(0x512) + 'reenY\x20-\x20(d' + 'rawHeight\x20' + '/\x202)\x20+\x20can' + 'vasOffsetY' + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20anim' + 'ationBotto' + _0x41fced(_0x100b98._0x42a593) + _0x41fced(0x68f) + 'ght;\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0xc4b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x49c) + _0x41fced(_0x100b98._0x31ddb5) + _0x41fced(_0x100b98._0x1e3fca) + _0x41fced(_0x100b98._0x1e56b3) + '\x20if\x20(curre' + 'ntSpritesh' + _0x41fced(_0x100b98._0x323ca5) + 'mationBott' + 'omY\x20<\x20char' + 'acterBotto' + 'mY)\x20{\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xbf1295) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'drawAnimat' + 'ionLayer(s' + 'cale);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20drawChara' + 'cterLayer(' + 'scale);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x20' + _0x41fced(0x6d5) + _0x41fced(_0x100b98._0x53ac05) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20drawChara' + 'cterLayer(' + 'scale);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xbde) + 'entSprites') + (_0x41fced(0xde7) + _0x41fced(_0x100b98._0x5c3161) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20draw' + 'AnimationL' + 'ayer(scale' + _0x41fced(_0x100b98._0x1336f6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3aa) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x20aaee) + _0x41fced(0xd99) + _0x41fced(0xc6d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3df) + 'tion\x20drawC' + _0x41fced(_0x100b98._0x2f3cb7) + 'yer(scale)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(!char' + 'acterSprit' + _0x41fced(_0x100b98._0x52b058) + _0x41fced(_0x100b98._0x338c1b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20charDr' + _0x41fced(0x286) + 'characterS' + 'priteWidth' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20char' + _0x41fced(_0x100b98._0x3d0ec4) + _0x41fced(_0x100b98._0x5dd46f) + 'erSpriteHe' + _0x41fced(0xe07) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + _0x41fced(0x83d) + 'reviewCanv' + 'as.width\x20-' + '\x20charDrawW' + _0x41fced(_0x100b98._0x2c80ef) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20charY' + _0x41fced(_0x100b98._0x59b3c0) + 'wCanvas.he' + 'ight\x20-\x20cha' + 'rDrawHeigh' + 't)\x20/\x202;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc4d) + 'ewCtx.draw' + 'Image(\x0a\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'haracterSp' + 'rite,\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x200,' + _0x41fced(_0x100b98._0x849343) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20char' + _0x41fced(_0x100b98._0x4f9ba9) + 'eWidth,\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'characterS' + 'priteHeigh' + 't,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20charX' + ',\x20charY,\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20charDrawW' + 'idth,\x0a\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20ch' + 'arDrawHeig' + 'ht\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x975) + _0x41fced(0x96b) + 'AnimationL' + 'ayer(scale' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4d0591) + _0x41fced(0xad5) + 'rentSprite' + 'sheet)\x20ret' + 'urn;\x0a\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xcdb) + 'ndomValues' + '();\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20row' + _0x41fced(0xe01) + _0x41fced(0xc2c) + 't.getEleme' + 'ntById(\x27ro' + 'wInput\x27).v' + _0x41fced(_0x100b98._0x19241c) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x6a883d) + 'const\x20colu' + 'mns\x20=\x20pars' + _0x41fced(0xce2) + 'ent.getEle' + 'mentById(\x27' + _0x41fced(0x801) + 't\x27).value)' + '\x20||\x201;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(0x8cd) + '\x20parseInt(' + _0x41fced(_0x100b98._0x24d0a3) + 'etElementB' + _0x41fced(_0x100b98._0x2fc476) + 'tXInput\x27)?' + '.value)\x20||' + '\x200;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5d6532) + '\x20\x20const\x20of' + 'fsetY\x20=\x20pa' + 'rseInt(doc' + 'ument.getE' + 'lementById' + '(\x27offsetYI' + _0x41fced(_0x100b98._0x4d9df0) + _0x41fced(0xcf8) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(_0x100b98._0x1bfbf6) + 'ty\x20=\x20parse' + 'Int(docume' + 'nt.getElem' + _0x41fced(0x8ac) + 'pacityInpu' + 't\x27)?.value' + ')\x20||\x20255;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + _0x41fced(_0x100b98._0x1d99c4) + _0x41fced(0xcd3) + 'ocument.ge' + 'tElementBy' + 'Id(\x27hueInp' + 'ut\x27)?.valu' + _0x41fced(0x704) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + _0x41fced(_0x100b98._0x4b9ee3) + 'de\x20=\x20docum' + _0x41fced(0xa58) + _0x41fced(_0x100b98._0x301f38) + _0x41fced(_0x100b98._0x57288c) + 'nput\x27)?.va' + 'lue\x20||\x20\x27No' + 'rmal\x27;\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x3b4) + '\x20flipHoriz' + 'ontal\x20=\x20do' + 'cument.get' + _0x41fced(0xe39) + 'd(\x27flipHor' + 'izontalChe' + 'ckbox\x27)?.c' + 'hecked\x20||\x20' + 'false;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20flipVerti' + _0x41fced(0xc04) + 'ment.getEl' + 'ementById(' + '\x27flipVerti' + 'calCheckbo' + 'x\x27)?.check' + _0x41fced(0x551) + _0x41fced(0x51e) + _0x41fced(_0x100b98._0xaf1e77) + '\x20const\x20ran' + 'domFlipHor' + 'izontal\x20=\x20') + ('document.g' + 'etElementB' + 'yId(\x27rando' + 'mFlipHoriz' + 'ontalCheck' + _0x41fced(0x8c4) + _0x41fced(0x9d7) + _0x41fced(_0x100b98._0x37d6c0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20r' + _0x41fced(_0x100b98._0x5363ba) + _0x41fced(0x56e) + _0x41fced(_0x100b98._0xb8314a) + _0x41fced(_0x100b98._0x1dfaca) + 'yId(\x27rando' + 'mFlipVerti' + 'calCheckbo' + _0x41fced(0xae3) + 'ed\x20||\x20fals' + _0x41fced(0x51e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20rot' + 'ation\x20=\x20pa' + 'rseInt(doc' + 'ument.getE' + 'lementById' + _0x41fced(_0x100b98._0x931eb6) + _0x41fced(0x5e7) + 'alue)\x20||\x200' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20rand' + 'omRotation' + '\x20=\x20documen' + 't.getEleme' + _0x41fced(0x1d6) + 'ndomRotati' + _0x41fced(0xb91) + '\x27)?.checke' + _0x41fced(_0x100b98._0x11e29b) + _0x41fced(_0x100b98._0x7b2df5) + _0x41fced(_0x100b98._0x3db255) + _0x41fced(0xb56) + _0x41fced(_0x100b98._0x1cee80) + _0x41fced(0x6fe) + _0x41fced(0x54b) + '\x27reverseCh' + 'eckbox\x27)?.' + _0x41fced(0x989) + '\x20false;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20bloomEna' + 'bled\x20=\x20doc' + 'ument.getE' + _0x41fced(0x545) + '(\x27bloomChe' + 'ckbox\x27)?.c' + 'hecked\x20||\x20' + 'false;\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x3b4) + '\x20blurAmoun' + 't\x20=\x20parseI' + 'nt(documen' + 't.getEleme' + 'ntById(\x27bl' + 'urAmountIn' + _0x41fced(0xb3b) + 'ue)\x20||\x2015;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20inten' + 'sity\x20=\x20par' + _0x41fced(0x4b5) + _0x41fced(0x6fe) + 'ementById(' + '\x27intensity' + 'Input\x27)?.v' + _0x41fced(_0x100b98._0xf2d8f1) + _0x41fced(0x6de) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20ti' + _0x41fced(0x8f4) + 'document.g' + 'etElementB' + _0x41fced(0x671) + 'olorInput\x27' + ')?.value\x20|' + '|\x20\x27#FFFFFF' + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20ope' + 'ningAnimat' + _0x41fced(_0x100b98._0x3ada6c) + 'ment.getEl' + _0x41fced(_0x100b98._0x3b121a) + '\x27openingAn' + _0x41fced(_0x100b98._0x4aeeb3) + 'ut\x27)?.valu') + ('e\x20||\x20\x27none' + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20end' + 'ingAnimati' + 'on\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + _0x41fced(0x575) + 'ationInput' + _0x41fced(_0x100b98._0x22c3cf) + '||\x20\x27none\x27;' + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20anima' + 'tionDurati' + 'on\x20=\x20parse' + _0x41fced(_0x100b98._0x5c559c) + 'nt.getElem' + 'entById(\x27a' + 'nimationDu' + _0x41fced(_0x100b98._0x416ef3) + _0x41fced(0x495) + ')\x20||\x2030;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20frameWid' + 'th\x20=\x20curre' + 'ntSpritesh' + _0x41fced(0x824) + _0x41fced(_0x100b98._0x4ed05a) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20frame' + _0x41fced(_0x100b98._0x114ce2) + _0x41fced(_0x100b98._0x153767) + 'tesheet.he' + 'ight\x20/\x20row' + _0x41fced(0x675) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20tot' + _0x41fced(_0x100b98._0x4bacc4) + _0x41fced(_0x100b98._0x54ee18) + 'lumns;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(op' + 'eningAnima' + 'tion\x20!==\x20\x27' + 'none\x27\x20&&\x20!' + _0x41fced(_0x100b98._0x22d6db) + 'peningAnim' + _0x41fced(0xd7d) + _0x41fced(_0x100b98._0x4e9992) + _0x41fced(_0x100b98._0x347718) + 'imationLoo' + _0x41fced(0x666) + _0x41fced(_0x100b98._0xa59d32) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20is' + 'PlayingOpe' + 'ningAnim\x20=' + '\x20true;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc0d) + 'peningAnim' + 'ationProgr' + 'ess\x20=\x200;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x41fced(_0x100b98._0x479688) + _0x41fced(0xc58) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + 'isPlayingO' + 'peningAnim' + _0x41fced(_0x100b98._0x23ba8c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20open' + _0x41fced(_0x100b98._0xb6d6c8) + 'onProgress' + '++;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x4a6) + _0x41fced(_0x100b98._0x5665cb) + _0x41fced(_0x100b98._0x554514) + 'ress\x20>=\x20an' + _0x41fced(0x51f) + _0x41fced(0x449) + _0x41fced(_0x100b98._0xaf1e77) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20isPla' + 'yingOpenin' + _0x41fced(0x5de) + _0x41fced(_0x100b98._0x438157) + _0x41fced(_0x100b98._0x50d8cc) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20') + (_0x41fced(_0x100b98._0x440199) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x41fced(_0x100b98._0x4126f1) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x41fced(0x575) + 'ation\x20!==\x20' + '\x27none\x27\x20&&\x20' + _0x41fced(0x868) + 'EndingAnim' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20framesLe' + 'ft\x20=\x20rever' + 'se\x20?\x20anima' + 'tionFrame\x20' + '+\x201\x20:\x20tota' + 'lFrames\x20-\x20' + 'animationF' + 'rame;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + _0x41fced(0xccc) + 'ft\x20<=\x20anim' + _0x41fced(0xc99) + 'ion\x20/\x20(100' + '0\x20/\x20(parse' + 'Int(docume' + 'nt.getElem' + 'entById(\x27f' + 'psInput\x27).' + 'value)\x20||\x20' + _0x41fced(0x7aa) + _0x41fced(_0x100b98._0xc66be9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'sPlayingEn' + 'dingAnim\x20=' + '\x20true;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20endingA' + 'nimationPr' + 'ogress\x20=\x200' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x9ac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x82c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(isP' + 'layingEndi' + 'ngAnim)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20endingAn' + 'imationPro' + _0x41fced(0xd6f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x41fced(_0x100b98._0x788570) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1d2c25) + _0x41fced(0x96f) + 'ty\x20=\x20opaci' + 'ty;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x599) + _0x41fced(_0x100b98._0x1b46c4) + 'cale;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20sc' + 'aleX\x20=\x201;\x0a' + _0x41fced(_0x100b98._0x4eaa2b) + _0x41fced(_0x100b98._0x39fd49) + _0x41fced(0xa67) + '\x201;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb4e) + _0x41fced(0x5d3) + _0x41fced(_0x100b98._0x4dd10f) + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20const\x20pro' + 'gress\x20=\x20op' + 'eningAnima' + 'tionProgre' + 'ss\x20/\x20anima' + 'tionDurati' + 'on;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x188f51) + _0x41fced(0xd58)) + ('gress\x20=\x20pr' + _0x41fced(0x841) + '.5\x20?\x202\x20*\x20p' + _0x41fced(0x5b8) + 'progress\x20:' + '\x201\x20-\x20Math.' + 'pow(-2\x20*\x20p' + 'rogress\x20+\x20' + '2,\x202)\x20/\x202;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5a05f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + 'openingAni' + 'mation\x20===' + '\x20\x27fadeIn\x27)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4c1116) + 'inalOpacit' + _0x41fced(0x871) + _0x41fced(_0x100b98._0x3ea81e) + 'rogress;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x20else\x20if' + _0x41fced(_0x100b98._0x599500) + _0x41fced(0x5ff) + _0x41fced(_0x100b98._0x14bdcd) + 'n\x27)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x487100) + _0x41fced(0x7c4) + 'le\x20=\x20scale' + '\x20*\x20easedPr' + _0x41fced(_0x100b98._0xf223d8) + _0x41fced(_0x100b98._0x5c36ca) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x20else\x20if\x20' + '(openingAn' + _0x41fced(0x534) + '=\x20\x27scaleIn' + 'Width\x27)\x20{\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x80b25c) + 'eX\x20=\x20eased' + 'Progress;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0xd55) + 'eY\x20=\x201;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x20else\x20if\x20' + '(openingAn' + _0x41fced(0x534) + '=\x20\x27scaleIn' + 'Height\x27)\x20{' + _0x41fced(_0x100b98._0x508c5a) + _0x41fced(_0x100b98._0x3bc971) + '\x20\x20\x20\x20\x20\x20\x20sca' + _0x41fced(_0x100b98._0x11fdaa) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3db255) + '\x20\x20\x20\x20\x20scale' + _0x41fced(0x4c8) + _0x41fced(0xc41) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x347d6b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x440199) + 'if\x20(isPlay' + 'ingEndingA' + _0x41fced(0xe08) + _0x41fced(_0x100b98._0x3875f9) + _0x41fced(0xbac) + 'onst\x20progr' + _0x41fced(0xb36) + 'ngAnimatio' + 'nProgress\x20' + _0x41fced(0xd3b) + 'nDuration;' + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20e' + _0x41fced(0x95e) + 'ss\x20=\x201\x20-\x20(' + 'progress\x20<' + '\x200.5\x20?\x202\x20*' + '\x20progress\x20' + _0x41fced(_0x100b98._0x1997f2) + '\x20:\x201\x20-\x20Mat' + _0x41fced(_0x100b98._0x24ff46) + '\x20progress\x20') + ('+\x202,\x202)\x20/\x20' + '2);\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x334b12) + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0xbf1295) + _0x41fced(0x716) + 'f\x20(endingA' + _0x41fced(_0x100b98._0x5b6e85) + _0x41fced(_0x100b98._0x4c12cc) + _0x41fced(0xcf5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x57b) + _0x41fced(0x337) + _0x41fced(0xafe) + 'edProgress' + _0x41fced(_0x100b98._0x2e26df) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x38cdef) + _0x41fced(0x6c1) + 'gAnimation' + _0x41fced(_0x100b98._0xe77bd4) + 'eOut\x27)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x3a67bb) + _0x41fced(_0x100b98._0x2c4d83) + _0x41fced(0x45e) + _0x41fced(_0x100b98._0x2e35ea) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x7b5) + _0x41fced(_0x100b98._0x538fe0) + _0x41fced(0x7b5) + _0x41fced(_0x100b98._0xc4bdc2) + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x2051df) + 'layFrame\x20=' + '\x20reverse\x20?' + '\x20(totalFra' + _0x41fced(_0x100b98._0x34c0c1) + 'animationF' + 'rame)\x20:\x20an' + 'imationFra' + 'me;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1c1716) + 'rrentCol\x20=' + _0x41fced(_0x100b98._0x176c66) + _0x41fced(_0x100b98._0x4408e0) + 'mns;\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x25a277) + 'urrentRow\x20' + _0x41fced(_0x100b98._0x5efb23) + 'or(display' + _0x41fced(0x309) + _0x41fced(_0x100b98._0x345811) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20drawWidth' + _0x41fced(_0x100b98._0x2d2ccc) + _0x41fced(_0x100b98._0x371ce3) + 'lScale;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x267) + _0x41fced(0x4e5) + 'ht\x20=\x20frame' + 'Height\x20*\x20f' + _0x41fced(0x3bb) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20charDr' + _0x41fced(_0x100b98._0x490e3e) + 'characterS' + 'priteWidth' + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20char' + 'DrawHeight' + '\x20=\x20charact' + 'erSpriteHe' + 'ight;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'charX\x20=\x20(p' + _0x41fced(0xa24) + _0x41fced(_0x100b98._0x594841) + _0x41fced(_0x100b98._0x44538b) + 'idth)\x20/\x202;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0xb06) + '\x20=\x20(previe' + 'wCanvas.he') + ('ight\x20-\x20cha' + 'rDrawHeigh' + _0x41fced(0xa95) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x3875f9) + '\x20\x20\x20\x20\x20const' + '\x20centerX\x20=' + _0x41fced(_0x100b98._0x1e14c8) + 'charDrawWi' + 'dth\x20/\x202)\x20+' + _0x41fced(_0x100b98._0x4f98d7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20center' + 'Y\x20=\x20charY\x20' + '+\x20(charDra' + _0x41fced(0xc20) + _0x41fced(0x213) + _0x41fced(0x41a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20dra' + _0x41fced(0xb73) + 'ctx,\x20apply' + _0x41fced(_0x100b98._0x4ff1b8) + _0x41fced(0x9f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20ctx.sa' + 've();\x0a\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4cbe56) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(apply' + _0x41fced(0x964) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20ctx.g' + 'lobalAlpha' + '\x20=\x20(intens' + 'ity\x20/\x20255)' + _0x41fced(_0x100b98._0x438bf5) + 'pacity\x20/\x202' + '55);\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2b8069) + '\x20\x20\x20\x20\x20\x20\x20}\x20e' + 'lse\x20{\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xfc68c5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x28c503) + _0x41fced(0xc00) + _0x41fced(_0x100b98._0x38bec7) + 'ty\x20/\x20255;\x0a' + _0x41fced(_0x100b98._0x169f3f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x429ff8) + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20blend' + 'Modes\x20=\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x27Nor' + 'mal\x27:\x20\x27sou' + _0x41fced(0xbe7) + _0x41fced(_0x100b98._0x14214a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xba2) + _0x41fced(_0x100b98._0x303f16) + 'reen\x27,\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20\x20\x27Add\x27:\x20' + '\x27lighter\x27,' + _0x41fced(_0x100b98._0x38cd42) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x27Mu' + 'ltiply\x27:\x20\x27' + 'multiply\x27\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20};\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xbffd0b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x4f0) + 'loom)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x94ada6) + 'obalCompos' + 'iteOperati' + 'on\x20=\x20\x27scre' + _0x41fced(0x948) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20}\x20e' + 'lse\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xac4) + 'alComposit' + 'eOperation' + '\x20=\x20blendMo' + _0x41fced(0x5fc) + 'ode]\x20||\x20\x27s' + _0x41fced(_0x100b98._0x2829de) + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x271014) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x501) + 'slate(cent' + 'erX,\x20cente' + 'rY);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20fina' + _0x41fced(0xcf3) + _0x41fced(_0x100b98._0x248aed) + 'tation\x20?\x20c' + _0x41fced(_0x100b98._0x420cbc) + 'omRotation' + _0x41fced(0x5d9) + 'n;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4c2a35) + '\x20\x20\x20\x20\x20if\x20(f' + 'inalRotati' + 'on\x20!==\x200)\x20' + _0x41fced(0x9f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ct' + _0x41fced(_0x100b98._0x99e6f6) + 'inalRotati' + _0x41fced(0x4f8) + 'PI\x20/\x20180);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5acea4) + _0x41fced(0x7b5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(_0x100b98._0x4a007d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x9ad9ba) + 'lipX\x20=\x20fli' + 'pHorizonta' + _0x41fced(_0x100b98._0x648d99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20let\x20f' + 'inalFlipY\x20' + _0x41fced(_0x100b98._0x2a4bb6) + 'ical;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(rando' + 'mFlipHoriz' + 'ontal)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x497) + _0x41fced(0x646) + 'rrentRando' + 'mFlipX;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x3b8710) + 'ndomFlipVe' + _0x41fced(_0x100b98._0x17a2e0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x12428e) + 'lFlipY\x20=\x20c' + 'urrentRand' + 'omFlipY;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20le' + _0x41fced(_0x100b98._0x490301) + _0x41fced(0x856) + '(finalFlip' + _0x41fced(_0x100b98._0xe2e511) + ')\x20*\x20(openi' + 'ngAnimatio') + ('n\x20===\x20\x27sca' + 'leInWidth\x27' + '\x20&&\x20isPlay' + 'ingOpening' + 'Anim\x20?\x20sca' + 'leX\x20:\x201);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20let\x20effe' + _0x41fced(0x414) + 'Y\x20=\x20(final' + _0x41fced(0x452) + '\x20:\x201)\x20*\x20(o' + _0x41fced(_0x100b98._0xdd36a7) + 'ation\x20===\x20' + _0x41fced(_0x100b98._0x172431) + 'ight\x27\x20&&\x20i' + 'sPlayingOp' + 'eningAnim\x20' + _0x41fced(_0x100b98._0x32ca9c) + '\x201);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xbffd0b) + _0x41fced(_0x100b98._0x450319) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'ctx.scale(' + _0x41fced(_0x100b98._0x25bd9b) + 'caleX,\x20eff' + 'ectiveScal' + _0x41fced(_0x100b98._0xf19d91) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'if\x20(hue\x20!=' + '=\x200\x20||\x20app' + _0x41fced(0xaa3) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20tempCan' + 'vas\x20=\x20docu' + 'ment.creat' + 'eElement(\x27' + _0x41fced(_0x100b98._0x3d8870) + _0x41fced(_0x100b98._0x83ca19) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20temp' + 'Canvas.wid' + _0x41fced(_0x100b98._0x13949e) + 'Width;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20tempCan' + 'vas.height' + '\x20=\x20frameHe' + 'ight;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5eef34) + _0x41fced(0x555) + 'mpCanvas.g' + 'etContext(' + '\x272d\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x653) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'tempCtx.dr' + 'awImage(\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x103549) + 'urrentSpri' + _0x41fced(0x47b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'urrentCol\x20' + _0x41fced(0x2f8) + 'th,\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20curren' + 'tRow\x20*\x20fra' + 'meHeight,\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'frameWidth' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xbf1295) + _0x41fced(_0x100b98._0xb604b) + '\x20\x20frameHei' + 'ght,\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x13f0d6) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20frameWidt' + _0x41fced(0x757) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20frameHe' + 'ight\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20);\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20imageDa' + 'ta\x20=\x20tempC' + _0x41fced(0x7b4) + 'eData(0,\x200' + ',\x20frameWid' + 'th,\x20frameH' + 'eight);\x0a\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + _0x41fced(0x36d) + 'geData.dat' + 'a;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(_0x100b98._0x558799) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20let\x20' + 'tintR\x20=\x2025' + _0x41fced(0x37f) + _0x41fced(_0x100b98._0x2f8fe4) + 'B\x20=\x20255;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x282) + 'pplyBloom\x20' + _0x41fced(_0x100b98._0x3b7bed) + _0x41fced(0x2dd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2a65b4) + 't\x20hex\x20=\x20ti' + 'ntColor.re' + _0x41fced(0x889) + '\x20\x27\x27);\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x53ac05) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x13dd3f) + 'R\x20=\x20parseI' + 'nt(hex.sub' + _0x41fced(_0x100b98._0x50a235) + '\x2016);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20tint' + 'G\x20=\x20parseI' + _0x41fced(0x558) + 'str(2,\x202),' + '\x2016);\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x408b2a) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20tint' + 'B\x20=\x20parseI' + 'nt(hex.sub' + 'str(4,\x202),' + '\x2016);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x53523) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3ff314) + 'st\x20hueRadi' + 'ans\x20=\x20hue\x20' + '*\x20Math.PI\x20' + '/\x20180;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'for\x20(let\x20i' + _0x41fced(0xbd5) + 'data.lengt' + _0x41fced(_0x100b98._0x238720) + _0x41fced(_0x100b98._0x17dd2a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x2bf278) + _0x41fced(0xb37) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'let\x20g\x20=\x20da' + 'ta[i\x20+\x201];' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20let\x20b\x20=\x20d' + 'ata[i\x20+\x202]' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20if\x20(hue' + '\x20!==\x200)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x536c7f) + _0x41fced(0x556) + 'max\x20=\x20Math' + '.max(r,\x20g,' + '\x20b)\x20/\x20255;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(_0x100b98._0x5a9070) + 'h.min(r,\x20g' + ',\x20b)\x20/\x20255' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20let\x20' + 'h,\x20s,\x20l\x20=\x20' + '(max\x20+\x20min' + ')\x20/\x202;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + 'max\x20===\x20mi' + 'n)\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xfc68c5) + '\x20\x20\x20h\x20=\x20s\x20=' + _0x41fced(_0x100b98._0x17095c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x20' + 'else\x20{\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x788570) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20d\x20=\x20max\x20-' + '\x20min;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x15b9c3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x9f1) + '>\x200.5\x20?\x20d\x20' + '/\x20(2\x20-\x20max' + '\x20-\x20min)\x20:\x20' + 'd\x20/\x20(max\x20+' + '\x20min);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3efd7a) + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x334ed4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20switch' + '\x20(max)\x20{\x0a\x20' + _0x41fced(_0x100b98._0x1945cd) + _0x41fced(_0x100b98._0x2e44ed) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20case\x20r\x20/\x20' + '255:\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x501a32) + '\x20255\x20-\x20b\x20/' + '\x20255)\x20/\x20d\x20' + '+\x20(g\x20<\x20b\x20?' + '\x206\x20:\x200))\x20/' + _0x41fced(0xe2e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x531c26) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'break;\x0a\x20\x20\x20') + (_0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'ase\x20g\x20/\x2025' + '5:\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20h' + '\x20=\x20((b\x20/\x202' + '55\x20-\x20r\x20/\x202' + '55)\x20/\x20d\x20+\x20' + '2)\x20/\x206;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x725) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x43808c) + _0x41fced(_0x100b98._0x63d204) + _0x41fced(0x8ef) + '\x20\x20\x20case\x20b\x20' + _0x41fced(_0x100b98._0x26f392) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1695d0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20h\x20=\x20((r' + '\x20/\x20255\x20-\x20g' + '\x20/\x20255)\x20/\x20' + _0x41fced(0x668) + _0x41fced(0x76a) + _0x41fced(_0x100b98._0x332e86) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1ee109) + '\x20\x20\x20\x20\x20\x20\x20\x20br' + 'eak;\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xf1d83c) + _0x41fced(_0x100b98._0x5d6532) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x7b5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x17d1b6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + _0x41fced(_0x100b98._0x1cc1f5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3cda86) + _0x41fced(_0x100b98._0x3b1e48) + 'ueRadians\x20' + '/\x20(2\x20*\x20Mat' + 'h.PI))\x20%\x201' + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x41fced(_0x100b98._0x4e0219) + '=\x201;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20r2' + ',\x20g2,\x20b2;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1ad0ee) + '===\x200)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xca9) + _0x41fced(_0x100b98._0x53f0e0) + '=\x20l;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x20else\x20{\x0a\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x267) + 't\x20hue2rgb\x20' + '=\x20(p,\x20q,\x20t' + ')\x20=>\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3e0a94) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x716) + _0x41fced(_0x100b98._0x38cd45) + 't\x20+=\x201;\x0a\x20\x20' + _0x41fced(0x8ef)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'if\x20(t\x20>\x201)' + _0x41fced(_0x100b98._0x35d7a5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4eaa2b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(t\x20<\x201' + _0x41fced(_0x100b98._0x5651d6) + '\x20p\x20+\x20(q\x20-\x20' + 'p)\x20*\x206\x20*\x20t' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(t\x20' + _0x41fced(0xb05) + 'urn\x20q;\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x53ac05) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x716) + _0x41fced(_0x100b98._0x5c06f8) + ')\x20return\x20p' + '\x20+\x20(q\x20-\x20p)' + '\x20*\x20(2/3\x20-\x20' + 't)\x20*\x206;\x0a\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4d0591) + _0x41fced(0x8ef) + 'return\x20p;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20};' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x19b819) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20q\x20=\x20l\x20' + '<\x200.5\x20?\x20l\x20' + '*\x20(1\x20+\x20s)\x20' + _0x41fced(0x909) + 'l\x20*\x20s;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xa1143e) + '\x20p\x20=\x202\x20*\x20l' + _0x41fced(0x5c1) + _0x41fced(_0x100b98._0x4218dc) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20r2\x20=\x20h' + 'ue2rgb(p,\x20' + _0x41fced(_0x100b98._0x1b6b51) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4126f1) + '\x20g2\x20=\x20hue2' + 'rgb(p,\x20q,\x20' + 'h);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20b2\x20=\x20hue' + _0x41fced(_0x100b98._0x253302) + '\x20h\x20-\x201/3);' + _0x41fced(_0x100b98._0x1930c4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2b8069) + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x4afe3c) + _0x41fced(_0x100b98._0x36eddf) + _0x41fced(0x8ef) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb7e) + 'r2\x20*\x20255;\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1d2e44) + _0x41fced(0x8fa) + '\x20*\x20255;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20b\x20=\x20b2\x20*' + _0x41fced(_0x100b98._0x5ab5f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1d2e44) + _0x41fced(_0x100b98._0xb0551c) + _0x41fced(_0x100b98._0x5d6532) + _0x41fced(_0x100b98._0x479354) + _0x41fced(0x716) + _0x41fced(_0x100b98._0x34abaa) + 'oom)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5a1365) + _0x41fced(0x4b8) + _0x41fced(_0x100b98._0x49c6d7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x586b4d) + '=\x20(g\x20*\x20tin' + _0x41fced(0x5fa) + _0x41fced(_0x100b98._0x338c1b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20b\x20=\x20(' + 'b\x20*\x20tintB)' + '\x20/\x20255;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x49348f) + _0x41fced(_0x100b98._0x11cd18) + _0x41fced(_0x100b98._0x1945cd) + _0x41fced(0x8ef) + _0x41fced(0x850) + _0x41fced(0x7fe) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20data[i\x20+\x20' + '2]\x20=\x20b;\x0a\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x5843d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb52) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + 'empCtx.put' + 'ImageData(' + 'imageData,' + '\x200,\x200);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3cda86) + _0x41fced(0x8ef) + '\x20if\x20(apply' + _0x41fced(0x964) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0x239) + 'edCanvas\x20=' + '\x20document.' + 'createElem' + 'ent(\x27canva' + 's\x27);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x54729a) + '\x20\x20\x20\x20\x20blurr' + 'edCanvas.w' + 'idth\x20=\x20fra' + 'meWidth\x20+\x20' + '(blurAmoun' + 't\x20*\x204);\x0a\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20bl' + _0x41fced(_0x100b98._0x17cf4b) + 's.height\x20=' + '\x20frameHeig' + 'ht\x20+\x20(blur' + 'Amount\x20*\x204' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20const\x20b' + 'lurredCtx\x20' + '=\x20blurredC' + 'anvas.getC' + 'ontext(\x272d' + _0x41fced(_0x100b98._0x481fd8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20blurre' + 'dCtx.filte' + 'r\x20=\x20\x27blur(' + _0x41fced(_0x100b98._0x38de46) + _0x41fced(_0x100b98._0x5eddb5) + ')\x27;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20blurre' + 'dCtx.drawI' + 'mage(tempC' + _0x41fced(0x605) + 'rAmount\x20*\x20' + '2,\x20blurAmo' + 'unt\x20*\x202);\x0a' + _0x41fced(_0x100b98._0x5acea4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20ctx.drawI' + 'mage(\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1c60bc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'blurredCan' + 'vas,\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x9f9) + 'drawWidth\x20' + '/\x202\x20-\x20(blu' + 'rAmount\x20*\x20' + '2),\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20-d' + 'rawHeight\x20' + _0x41fced(0xa78) + 'rAmount\x20*\x20' + _0x41fced(_0x100b98._0x2b1506) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xdb4) + 'awWidth\x20+\x20' + '(blurAmoun' + 't\x20*\x204),\x0a\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x18ecf2) + _0x41fced(0x301) + _0x41fced(0xc49) + 'Amount\x20*\x204' + ')\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3b69d0) + '\x20\x20);\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x53ac05) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x20else\x20{\x0a' + _0x41fced(_0x100b98._0x364639) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x26e8f0) + 'age(\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + 'empCanvas,' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20-draw' + 'Width\x20/\x202,' + _0x41fced(_0x100b98._0x147234) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20-draw' + 'Height\x20/\x202' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5d6532) + '\x20\x20\x20\x20\x20\x20draw' + _0x41fced(0xb42) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20drawHeigh' + 't\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x229377) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xe48) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x347d6b) + _0x41fced(_0x100b98._0x63d204) + '\x20\x20\x20\x20\x20}\x20els' + 'e\x20{\x0a\x20\x20\x20\x20\x20\x20') + (_0x41fced(_0x100b98._0x332e86) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'ctx.drawIm' + 'age(\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x359) + 'ntSpritesh' + _0x41fced(_0x100b98._0x2e190b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xc4bdc2) + '\x20\x20\x20\x20\x20curre' + 'ntCol\x20*\x20fr' + 'ameWidth,\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'currentRow' + '\x20*\x20frameHe' + 'ight,\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20fram' + _0x41fced(0xa68) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2b2402) + '\x20\x20\x20\x20\x20\x20\x20\x20fr' + 'ameHeight,' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x22e) + 'h\x20/\x202,\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x348afd) + '\x20\x20\x20\x20\x20\x20\x20-dr' + _0x41fced(0x50a) + '\x202,\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20drawWi' + 'dth,\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20drawH' + 'eight\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x378338) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20ctx.re' + 'store();\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20};\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(bloomEnab' + 'led)\x20{draw' + 'Frame(prev' + 'iewCtx,\x20tr' + 'ue);}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x302da9) + 'ame(previe' + 'wCtx,\x20fals' + 'e);\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x534f5d) + '\x20\x20animatio' + _0x41fced(_0x100b98._0x239962) + _0x41fced(0x792) + _0x41fced(_0x100b98._0x38d931) + '%\x20totalFra' + 'mes;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20if\x20(ani' + 'mationFram' + 'e\x20===\x200)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20animati' + _0x41fced(0xb84) + 't++;\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3f58a2) + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20fu' + 'nction\x20sav' + 'eToLibrary' + '()\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20ani' + 'mationName') + ('\x20=\x20documen' + 't.getEleme' + 'ntById(\x27an' + 'imationNam' + _0x41fced(0xd54) + 'value.trim' + '();\x0a\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x37aff9) + '\x20if\x20(!anim' + 'ationName)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20a' + 'lert(\x27Plea' + 'se\x20enter\x20a' + 'n\x20animatio' + 'n\x20name!\x27);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20ret' + 'urn;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xe26f2f) + 'if\x20(!curre' + _0x41fced(0xab9) + 'eet)\x20{\x0a\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20alert(\x27' + 'Please\x20loa' + 'd\x20a\x20sprite' + 'sheet\x20firs' + _0x41fced(0x7e0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20return;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(0x893) + '\x20document.' + _0x41fced(0x87c) + 'ById(\x27file' + _0x41fced(_0x100b98._0x59f77f) + _0x41fced(_0x100b98._0x18ecf2) + '\x20\x20\x20const\x20f' + 'ileName\x20=\x20' + 'fileBox.te' + 'xtContent;' + '\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(fileName' + '\x20===\x20\x27Clic' + 'k\x20to\x20selec' + 't\x20spritesh' + _0x41fced(_0x100b98._0x26d6c0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20alert(' + _0x41fced(_0x100b98._0x19fca6) + 'ad\x20a\x20sprit' + 'esheet\x20fir' + 'st!\x27);\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x4eaa2b) + '\x20\x20\x20return;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20cons' + _0x41fced(_0x100b98._0x3b3b6e) + _0x41fced(_0x100b98._0x1396e5) + _0x41fced(0x2d4) + 'ument.getE' + 'lementById' + '(\x27offsetXI' + 'nput\x27)?.va' + 'lue)\x20||\x200;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x279c36) + 'st\x20editorO' + 'ffsetY\x20=\x20p' + 'arseInt(do' + _0x41fced(_0x100b98._0x1ba2ee) + 'ElementByI' + 'd(\x27offsetY' + _0x41fced(0x5e7) + 'alue)\x20||\x200' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20co' + 'nst\x20saveTa' + 'rgetSprite' + '\x20=\x20documen' + 't.getEleme' + 'ntById(\x27sa' + 'veTargetSp' + 'riteCheckb' + 'ox\x27)?.chec' + 'ked\x20||\x20fal' + _0x41fced(0x751) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20ani' + 'mationData' + '\x20=\x20{\x0a\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5e7103) + _0x41fced(_0x100b98._0x241fed) + _0x41fced(_0x100b98._0x5b221a) + '\x20\x20\x20\x20\x20\x20\x20\x20sp' + 'ritesheetF' + 'ile:\x20fileN' + 'ame,\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1695d0) + '\x20rows:\x20par' + 'seInt(docu' + 'ment.getEl' + _0x41fced(0x54b) + '\x27rowInput\x27' + ').value)\x20|' + _0x41fced(0x1be) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20columns:\x20' + _0x41fced(_0x100b98._0x4561bb) + _0x41fced(0x3bd) + _0x41fced(_0x100b98._0x4fd3c5) + 'Id(\x27column' + 'Input\x27).va' + 'lue)\x20||\x201,' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x12ddae) + _0x41fced(_0x100b98._0x33a546) + _0x41fced(_0x100b98._0x4ba881) + 'getElement' + 'ById(\x27fpsI' + _0x41fced(0x40c) + _0x41fced(_0x100b98._0x59200a) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x30a) + 'le:\x20parseI' + 'nt(documen' + 't.getEleme' + 'ntById(\x27sc' + 'aleInput\x27)' + '.value)\x20||' + '\x20100,\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x36c0b6) + '\x20\x20opacity:' + '\x20parseInt(' + _0x41fced(0x549) + 'etElementB' + 'yId(\x27opaci' + 'tyInput\x27)?' + '.value)\x20||' + _0x41fced(0xa50) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20hue:\x20par' + 'seInt(docu' + 'ment.getEl' + _0x41fced(_0x100b98._0x3414b3) + '\x27hueInput\x27' + ')?.value)\x20' + '||\x200,\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5cf639) + _0x41fced(_0x100b98._0x2addfd) + 't.getEleme' + 'ntById(\x27bl' + 'endModeInp' + 'ut\x27)?.valu' + _0x41fced(_0x100b98._0x336844) + 'al\x27,\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x484ff1) + _0x41fced(0x6a2) + 'ment.getEl' + 'ementById(' + '\x27reverseCh' + 'eckbox\x27)?.' + 'checked\x20||' + _0x41fced(0xac3) + _0x41fced(_0x100b98._0x4e423d) + '\x20\x20\x20\x20flip:\x20' + 'document.g' + _0x41fced(0xa66) + _0x41fced(_0x100b98._0x5d9412) + 'orizontalC' + 'heckbox\x27)?' + '.checked\x20|' + _0x41fced(0x993) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20flipY' + _0x41fced(_0x100b98._0x1c8f2c) + '.getElemen' + 'tById(\x27fli' + 'pVerticalC' + _0x41fced(0x9d6) + _0x41fced(_0x100b98._0x35ae95) + _0x41fced(_0x100b98._0x2d2b50) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x475363) + 'mFlipX:\x20do' + _0x41fced(0xb8b) + _0x41fced(0xe39) + _0x41fced(_0x100b98._0x3da58d)) + ('lipHorizon' + _0x41fced(_0x100b98._0x3a41fb) + 'x\x27)?.check' + 'ed\x20||\x20fals' + 'e,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20r' + 'andomFlipY' + ':\x20document' + '.getElemen' + _0x41fced(0xa57) + 'domFlipVer' + 'ticalCheck' + 'box\x27)?.che' + 'cked\x20||\x20fa' + 'lse,\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x145d28) + _0x41fced(0x2fd) + '\x20parseInt(' + 'document.g' + 'etElementB' + 'yId(\x27rotat' + 'ionInput\x27)' + '?.value)\x20|' + '|\x200,\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3e0a94) + _0x41fced(_0x100b98._0x168330) + 'ation:\x20doc' + 'ument.getE' + 'lementById' + _0x41fced(_0x100b98._0x16a2fe) + 'tationChec' + 'kbox\x27)?.ch' + _0x41fced(0x249) + _0x41fced(0x983) + _0x41fced(0x8ef) + '\x20\x20openingA' + 'nimation:\x20' + 'document.g' + 'etElementB' + 'yId(\x27openi' + 'ngAnimatio' + 'nInput\x27)?.' + 'value\x20||\x20\x27' + 'none\x27,\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x4a5fba) + '\x20\x20\x20endingA' + _0x41fced(0x808) + 'document.g' + _0x41fced(0xa66) + 'yId(\x27endin' + 'gAnimation' + 'Input\x27)?.v' + 'alue\x20||\x20\x27n' + _0x41fced(0x2b7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20animatio' + 'nDuration:' + '\x20parseInt(' + 'document.g' + _0x41fced(0xa66) + 'yId(\x27anima' + _0x41fced(0x302) + 'onInput\x27)?' + '.value)\x20||' + _0x41fced(0x338) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20bloomEffe' + 'ct:\x20docume' + 'nt.getElem' + _0x41fced(_0x100b98._0x2cabda) + 'loomCheckb' + _0x41fced(0x52f) + 'ked\x20||\x20fal' + 'se,\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1d2e44) + 'blurAmount' + ':\x20parseInt' + '(document.' + 'getElement' + 'ById(\x27blur' + 'AmountInpu' + 't\x27)?.value' + ')\x20||\x2015,\x0a\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20inten' + 'sity:\x20pars' + 'eInt(docum' + 'ent.getEle' + 'mentById(\x27' + 'intensityI' + _0x41fced(0x48d) + _0x41fced(0xc94) + '5,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + 'intColor:\x20' + _0x41fced(0x549) + _0x41fced(_0x100b98._0x1dfaca) + 'yId(\x27tintC' + 'olorInput\x27' + ')?.value\x20|') + (_0x41fced(_0x100b98._0x1e0ba6) + '\x27,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20z' + 'Index:\x20doc' + _0x41fced(0xc68) + 'lementById' + _0x41fced(0x1fb) + 'put\x27)?.val' + 'ue\x20||\x20\x27aut' + _0x41fced(_0x100b98._0x478adb) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'offsetX:\x20M' + 'ath.round(' + _0x41fced(_0x100b98._0x5c7550) + 'etX\x20/\x202),\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20offs' + _0x41fced(0x9cb) + 'round(edit' + 'orOffsetY\x20' + '/\x202),\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20characte' + 'rSprite:\x20(' + _0x41fced(0x2bd) + 'Sprite\x20&&\x20' + 'characterS' + 'prite)\x20?\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x402) + 'aUrl:\x20char' + 'acterSprit' + 'e.src,\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20width:\x20' + 'characterS' + 'priteWidth' + ',\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x280a32) + _0x41fced(_0x100b98._0x1580bb) + 'acterSprit' + _0x41fced(0x960) + _0x41fced(_0x100b98._0x2b2402) + _0x41fced(0x965) + 'll\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + ';\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(window.' + 'opener\x20&&\x20' + 'window.ope' + _0x41fced(0x66c) + _0x41fced(_0x100b98._0x3eb7cb) + 'ibrary)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20wind' + 'ow.opener.' + _0x41fced(_0x100b98._0x34263e) + 'ionToLibra' + _0x41fced(_0x100b98._0x1d56ae) + _0x41fced(0x6e5) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4cb5f6) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20let\x20libra' + _0x41fced(0x5a3) + _0x41fced(_0x100b98._0x37bbfa) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc9f) + 'c\x20function' + '\x20openLibra' + 'ry()\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20m' + 'odal\x20=\x20doc' + 'ument.getE' + 'lementById' + _0x41fced(_0x100b98._0x29479e) + 'odal\x27);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20modal.' + 'classList.' + _0x41fced(_0x100b98._0x520588) + 'e\x27);\x0a\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xafd) + _0x41fced(_0x100b98._0x1269aa) + _0x41fced(0xaf8) + 'opener.loa' + 'dAnimation' + _0x41fced(0x55c) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20try' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xe3b) + 'ibraryAnim' + 'ations\x20=\x20a' + 'wait\x20windo') + ('w.opener.l' + 'oadAnimati' + 'onLibrary(' + _0x41fced(_0x100b98._0x2d1ffd) + _0x41fced(_0x100b98._0x4404d1) + 'isplayLibr' + 'ary();\x0a\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20}\x20catch' + _0x41fced(_0x100b98._0x160dcf) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + _0x41fced(_0x100b98._0x248e7e) + '(\x27Error\x20lo' + 'ading\x20libr' + _0x41fced(0x3d6) + 'or);\x0a\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x1ff6c7) + _0x41fced(0x87c) + 'ById(\x27libr' + 'aryGrid\x27).' + 'innerHTML\x20' + '=\x20\x27<div\x20cl' + _0x41fced(0xd19) + 'ry-empty\x22>' + _0x41fced(_0x100b98._0x267e93) + 'ing\x20librar' + 'y</div>\x27;\x0a' + _0x41fced(_0x100b98._0x4a007d) + '\x20\x20\x20\x20\x20\x20}}}\x0a' + '\x0afunction\x20' + 'closeLibra' + 'ry()\x20{\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x3dae46) + 'al\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + 'libraryMod' + 'al\x27);\x0a\x20\x20\x20\x20' + 'modal.clas' + _0x41fced(_0x100b98._0x561702) + 've(\x27active' + '\x27);\x0a}\x0a\x0afun' + _0x41fced(_0x100b98._0xd8a7f4) + _0x41fced(0x53b) + '()\x20{\x0a\x20\x20\x20\x20c' + _0x41fced(_0x100b98._0x513dfc) + _0x41fced(_0x100b98._0x560e9a) + '.getElemen' + _0x41fced(_0x100b98._0x68876d) + 'raryGrid\x27)' + ';\x0a\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20if\x20(Objec' + _0x41fced(0xaf7) + 'raryAnimat' + _0x41fced(0x9ea) + 'th\x20===\x200)\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'return;\x0a\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20grid.in' + 'nerHTML\x20=\x20' + _0x41fced(_0x100b98._0x11d811) + '\x20\x20\x20for\x20(co' + 'nst\x20[name,' + '\x20animData]' + '\x20of\x20Object' + '.entries(l' + _0x41fced(0x910) + 'ations))\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20item\x20' + '=\x20document' + _0x41fced(0x2cc) + 'ment(\x27div\x27' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8b9) + 'sName\x20=\x20\x27l' + 'ibrary-ite' + 'm\x27;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0xb52) + _0x41fced(_0x100b98._0x2ccb2a) + _0x41fced(_0x100b98._0x1bb5f1) + 'ocument.cr' + 'eateElemen' + 't(\x27div\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20de' + _0x41fced(_0x100b98._0x561b24) + 'assName\x20=\x20' + '\x27library-i' + 'tem-delete' + _0x41fced(_0x100b98._0x513c1b) + '\x20deleteBtn' + '.innerHTML' + '\x20=\x20\x27✕\x27;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20dele' + _0x41fced(_0x100b98._0x2a55dc) + 'e\x20=\x20\x27Delet' + _0x41fced(_0x100b98._0x39c3cb)) + ('n\x27;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x20638d) + 'n.onclick\x20' + _0x41fced(0x51c) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20e.stopP' + _0x41fced(_0x100b98._0x154348) + '();\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20dele' + _0x41fced(_0x100b98._0x18f777) + 'nFromLibra' + _0x41fced(0xc6c) + '\x20\x20\x20\x20\x20\x20\x20\x20};' + _0x41fced(0xa2e) + _0x41fced(0x98e) + 'em.onclick' + '\x20=\x20()\x20=>\x20l' + 'oadAnimati' + 'onFromLibr' + _0x41fced(0x8c0) + _0x41fced(_0x100b98._0x280a47) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(_0x100b98._0x2a8046) + 'nst\x20previe' + _0x41fced(0x982) + 'nt.createE' + _0x41fced(_0x100b98._0x32963c) + 'v\x27);\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20preview' + _0x41fced(_0x100b98._0x35f19c) + '\x20=\x20\x27librar' + _0x41fced(0x9bf) + 'view\x27;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x2c9b87) + _0x41fced(0x556) + _0x41fced(0x9d3) + 'ocument.cr' + 'eateElemen' + 't(\x27canvas\x27' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20canvas.wi' + _0x41fced(_0x100b98._0x557d20) + _0x41fced(_0x100b98._0x5053be) + 'anvas.heig' + 'ht\x20=\x20100;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20pr' + 'eview.appe' + _0x41fced(0x9c6) + 'nvas);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'itemName\x20=' + _0x41fced(_0x100b98._0x1ff6c7) + 'createElem' + _0x41fced(0x6f4) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'itemName.c' + 'lassName\x20=' + '\x20\x27library-' + _0x41fced(_0x100b98._0x3b0243) + _0x41fced(_0x100b98._0x4947c7) + 'itemName.t' + 'extContent' + '\x20=\x20name;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20itemInfo' + '\x20=\x20documen' + 't.createEl' + 'ement(\x27div' + _0x41fced(0xc75) + '\x20\x20itemInfo' + '.className' + '\x20=\x20\x27librar' + 'y-item-inf' + 'o\x27;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20itemInfo' + '.textConte' + 'nt\x20=\x20animD' + 'ata.rows\x20+' + _0x41fced(_0x100b98._0x47e3bf) + 'mData.colu' + 'mns\x20+\x20\x27\x20|\x20' + _0x41fced(_0x100b98._0x431694) + _0x41fced(_0x100b98._0x4850db) + '\x20FPS\x27;\x0a\x20\x20\x20' + _0x41fced(0x2c1) + '\x20\x20\x20\x20item.a' + _0x41fced(0x75b) + '(deleteBtn' + _0x41fced(_0x100b98._0x2d1ffd) + '\x20item.appe' + 'ndChild(pr' + 'eview);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20item' + '.appendChi' + 'ld(itemNam' + _0x41fced(0x9b9) + '\x20\x20item.app' + 'endChild(i') + ('temInfo);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20gr' + 'id.appendC' + _0x41fced(_0x100b98._0x4e3531) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20s' + 'tartLibrar' + 'yPreview(c' + _0x41fced(_0x100b98._0xe7c637) + 'mData);\x0a\x20\x20' + '\x20\x20}\x0a}\x0a\x0afun' + 'ction\x20dele' + 'teAnimatio' + 'nFromLibra' + 'ry(animati' + 'onName)\x20{\x0a' + _0x41fced(0x53f) + '\x20libraryAn' + 'imations[a' + _0x41fced(_0x100b98._0x1a9b1e) + _0x41fced(_0x100b98._0x191be9) + '\x20\x20\x20\x20if\x20(wi' + _0x41fced(0x369) + 'r\x20&&\x20windo' + 'w.opener.d' + 'eleteAnima' + 'tionFromLi' + _0x41fced(_0x100b98._0x14dba5) + '\x20\x20\x20\x20\x20\x20\x20win' + 'dow.opener' + '.deleteAni' + _0x41fced(0xccb) + 'Library(an' + 'imationNam' + 'e);\x0a\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20displa' + 'yLibrary()' + ';\x0a}\x0a\x0afunct' + _0x41fced(_0x100b98._0x170421) + _0x41fced(_0x100b98._0x519bc0) + 'iew(canvas' + ',\x20animData' + _0x41fced(_0x100b98._0x5dfd74) + _0x41fced(0xcfb) + _0x41fced(_0x100b98._0x3c434a) + 'Context(\x272' + 'd\x27);\x0a\x20\x20\x20\x20c' + 'tx.imageSm' + _0x41fced(0x542) + 'bled\x20=\x20fal' + _0x41fced(0x3a2) + '\x20\x20\x20let\x20cha' + 'racterImg\x20' + '=\x20null;\x0a\x20\x20' + '\x20\x20if\x20(anim' + 'Data.chara' + 'cterSprite' + '\x20&&\x20animDa' + 'ta.charact' + 'erSprite.d' + 'ataUrl)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20ch' + _0x41fced(_0x100b98._0x8e030a) + '\x20=\x20new\x20Ima' + 'ge();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20charac' + 'terImg.src' + _0x41fced(0x481) + _0x41fced(_0x100b98._0x40f790) + 'rSprite.da' + 'taUrl;\x0a\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20const\x20im' + 'g\x20=\x20new\x20Im' + 'age();\x0a\x20\x20\x20' + '\x20img.onloa' + 'd\x20=\x20functi' + 'on()\x20{\x0a\x20\x20\x20' + _0x41fced(0x346) + 'rame\x20=\x200;\x0a' + _0x41fced(_0x100b98._0x2a8046) + 'nst\x20totalF' + 'rames\x20=\x20an' + 'imData.row' + _0x41fced(0x69a) + 'ta.columns' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc3b) + 'eWidth\x20=\x20i' + _0x41fced(_0x100b98._0x340bb2) + '\x20animData.' + 'columns;\x0a\x20' + _0x41fced(_0x100b98._0x27f560) + 'st\x20frameHe' + 'ight\x20=\x20img' + '.height\x20/\x20' + _0x41fced(0xa7e) + _0x41fced(_0x100b98._0x2843cd) + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20pr') + (_0x41fced(0x56d) + '\x20=\x20(animDa' + 'ta.scale\x20/' + _0x41fced(_0x100b98._0x34c0fb) + '6;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20dra' + _0x41fced(_0x100b98._0x474e30) + _0x41fced(0xd68) + _0x41fced(0x3af) + _0x41fced(0x9b0) + '\x20\x20\x20\x20const\x20' + 'drawHeight' + '\x20=\x20frameHe' + 'ight\x20*\x20pre' + 'viewScale;' + _0x41fced(0xa2e) + _0x41fced(_0x100b98._0x39fd49) + 't\x20randomFl' + 'ipX\x20=\x20fals' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20let\x20rando' + 'mFlipY\x20=\x20f' + _0x41fced(_0x100b98._0x4ded47) + _0x41fced(0xd67) + 'ndomRotati' + _0x41fced(0x54d) + '\x20\x20\x20\x20\x20\x20let\x20' + _0x41fced(_0x100b98._0x137293) + _0x41fced(0x2d5) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(0x3df) + _0x41fced(0x83c) + 'te()\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0xe15) + 'ct(0,\x200,\x20c' + 'anvas.widt' + 'h,\x20canvas.' + _0x41fced(0xd24) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20random' + 'Counter++;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2fd7c1) + _0x41fced(0x7c3) + _0x41fced(_0x100b98._0x86042c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20rand' + 'omCounter\x20' + _0x41fced(_0x100b98._0x20ff12) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x294) + _0x41fced(0x39f) + _0x41fced(0x5c4) + 'domFlipX\x20=' + '\x20Math.rand' + 'om()\x20<\x200.5' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x54f3fa) + '\x20(animData' + '.randomFli' + 'pY)\x20random' + 'FlipY\x20=\x20Ma' + 'th.random(' + ')\x20<\x200.5;\x0a\x20' + _0x41fced(_0x100b98._0x4a5fba) + '\x20\x20\x20\x20\x20if\x20(a' + _0x41fced(0x313) + 'ndomRotati' + 'on)\x20random' + 'Rotation\x20=' + '\x20Math.rand' + 'om()\x20*\x20360' + _0x41fced(0x76a) + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + _0x41fced(0xa9c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x34e889) + 'enterX\x20=\x20c' + 'anvas.widt' + 'h\x20/\x202;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + 'et\x20charCen' + _0x41fced(0x537) + _0x41fced(0x1ba) + '\x20/\x202;\x0a\x20\x20\x20\x20' + _0x41fced(0xa9c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(chara' + _0x41fced(0x2a5) + _0x41fced(_0x100b98._0x371a12) + _0x41fced(0xc55) + 'te)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5e08d6) + 'arScale\x20=\x20' + '0.6;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3de545)) + (_0x41fced(_0x100b98._0x57101f) + 'nimData.ch' + 'aracterSpr' + 'ite.width\x20' + '*\x20charScal' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0x932) + _0x41fced(_0x100b98._0x209582) + _0x41fced(_0x100b98._0x325840) + 'racterSpri' + 'te.height\x20' + '*\x20charScal' + 'e;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xbac) + _0x41fced(_0x100b98._0x51a6eb) + _0x41fced(_0x100b98._0x2de905) + '.width\x20-\x20c' + 'harWidth)\x20' + _0x41fced(_0x100b98._0x506bf7) + _0x41fced(_0x100b98._0xf1d83c) + _0x41fced(_0x100b98._0x5063da) + 'rY\x20=\x20(canv' + _0x41fced(_0x100b98._0x5186ac) + '-\x20charHeig' + 'ht)\x20/\x202;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x34277c) + 'Image(char' + _0x41fced(0x2a1) + _0x41fced(_0x100b98._0x132069) + 'rY,\x20charWi' + 'dth,\x20charH' + 'eight);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5b75af) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4a8037) + 'rX\x20=\x20charX' + _0x41fced(_0x100b98._0x1c19e3) + 'th\x20/\x202;\x0a\x20\x20' + _0x41fced(_0x100b98._0x48108a) + '\x20\x20\x20\x20charCe' + 'nterY\x20=\x20ch' + 'arY\x20+\x20char' + 'Height\x20/\x202' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x9ac) + _0x41fced(0xa9c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20let\x20displ' + 'ayFrame\x20=\x20' + 'animData.p' + _0x41fced(0x39e) + _0x41fced(0xa25) + _0x41fced(_0x100b98._0x17b99e) + '1\x20-\x20frame)' + '\x20:\x20frame;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x34c8f8) + 'l\x20=\x20displa' + 'yFrame\x20%\x20a' + 'nimData.co' + 'lumns;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(0x8f5) + '\x20Math.floo' + 'r(displayF' + _0x41fced(_0x100b98._0x63ed2c) + _0x41fced(_0x100b98._0x6fba5d) + 'mns);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + _0x41fced(_0x100b98._0x169f3f) + '\x20const\x20pre' + 'viewOffset' + _0x41fced(_0x100b98._0x4af705) + 'ata.offset' + 'X\x20*\x202)\x20*\x200' + '.6;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20previewO' + _0x41fced(0xd76) + _0x41fced(0x926) + 'ffsetY\x20*\x202' + ')\x20*\x200.6;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'animX\x20=\x20ch' + 'arCenterX\x20' + '+\x20previewO' + 'ffsetX;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20anim' + _0x41fced(0x3c0) + _0x41fced(0x7e8) + _0x41fced(_0x100b98._0x3b0b9c) + 'tY;\x0a\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20final' + _0x41fced(0x631) + 'awWidth;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x2b594d) + _0x41fced(0xae6) + '\x20drawHeigh' + _0x41fced(0xdbf) + _0x41fced(0x3b4) + _0x41fced(_0x100b98._0x341a42) + 'ity\x20=\x20anim' + _0x41fced(_0x100b98._0xcbb2b0) + 'ty\x20||\x20255;' + _0x41fced(_0x100b98._0x8a99d0) + '\x20\x20\x20const\x20h' + _0x41fced(_0x100b98._0x4e5b3c) + _0x41fced(0x4fd) + '\x200;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(animDat' + 'a.bloomEff' + 'ect)\x20{\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20ctx.sav' + 'e();\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20ctx.globa' + 'lAlpha\x20=\x20(' + '(animData.' + 'intensity\x20' + '||\x20255)\x20/\x20' + '255)\x20*\x20(fi' + 'nalOpacity' + _0x41fced(_0x100b98._0x7d245e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x9ae2ef) + 'lobalCompo' + _0x41fced(_0x100b98._0x538e12) + _0x41fced(0x601) + 'een\x27;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20ctx.tran' + 'slate(anim' + _0x41fced(_0x100b98._0x371c82) + _0x41fced(_0x100b98._0x5f21e8) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'finalRotat' + _0x41fced(_0x100b98._0x59ad66) + 'Data.rando' + _0x41fced(0xa38) + '?\x20randomRo' + 'tation\x20:\x20(' + 'animData.r' + 'otation\x20||' + _0x41fced(0x9fd) + _0x41fced(0x8ef) + '\x20if\x20(final' + 'Rotation\x20!' + '==\x200)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ct' + 'x.rotate(f' + _0x41fced(_0x100b98._0x3f71d8) + _0x41fced(0x4f8) + 'PI\x20/\x20180);' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20fi' + 'nalFlipX\x20=' + '\x20animData.' + 'randomFlip' + _0x41fced(_0x100b98._0x9076eb) + 'FlipX\x20:\x20(a' + _0x41fced(0xae5) + _0x41fced(_0x100b98._0x1e0242) + 'e);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20fina' + 'lFlipY\x20=\x20a' + 'nimData.ra' + 'ndomFlipY\x20' + '?\x20randomFl' + 'ipY\x20:\x20(ani' + 'mData.flip' + _0x41fced(_0x100b98._0x16f81b) + _0x41fced(0x804) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'tx.scale(f' + 'inalFlipX\x20' + '?\x20-1\x20:\x201,\x20' + 'finalFlipY' + '\x20?\x20-1\x20:\x201)') + (_0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(0xc1b) + 'as\x20=\x20docum' + _0x41fced(0x6b7) + 'Element(\x27c' + 'anvas\x27);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x39b78e) + _0x41fced(_0x100b98._0xcc6c72) + 'th\x20=\x20frame' + 'Width;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20bloomCa' + 'nvas.heigh' + 't\x20=\x20frameH' + 'eight;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20b' + 'loomCtx\x20=\x20' + 'bloomCanva' + _0x41fced(0xc2d) + 'xt(\x272d\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20bloo' + 'mCtx.drawI' + 'mage(img,\x20' + 'col\x20*\x20fram' + 'eWidth,\x20ro' + 'w\x20*\x20frameH' + 'eight,\x20fra' + 'meWidth,\x20f' + 'rameHeight' + ',\x200,\x200,\x20fr' + 'ameWidth,\x20' + _0x41fced(_0x100b98._0x36eaa2) + 't);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xd99) + _0x41fced(_0x100b98._0x50bf4a) + '(hue\x20!==\x200' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x213214) + '\x20\x20\x20\x20const\x20' + _0x41fced(0x1e3) + _0x41fced(_0x100b98._0x2ae632) + _0x41fced(0xab1) + 'ata(0,\x200,\x20' + 'frameWidth' + _0x41fced(0x383) + 'ght);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20data\x20=\x20i' + 'mageData.d' + 'ata;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + '\x20hueRadian' + _0x41fced(_0x100b98._0x5b9075) + _0x41fced(_0x100b98._0x1507ee) + '180;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x2c1) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20for\x20' + '(let\x20i\x20=\x200' + ';\x20i\x20<\x20data' + '.length;\x20i' + '\x20+=\x204)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x659) + '\x20data[i];\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20let\x20g\x20' + '=\x20data[i\x20+' + '\x201];\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + 'et\x20b\x20=\x20dat' + 'a[i\x20+\x202];\x0a' + _0x41fced(_0x100b98._0x1e0a5e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xab610d) + 'onst\x20max\x20=' + '\x20Math.max(' + 'r,\x20g,\x20b)\x20/' + '\x20255;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'const\x20min\x20' + '=\x20Math.min' + '(r,\x20g,\x20b)\x20' + _0x41fced(0x946)) + (_0x41fced(_0x100b98._0x33a61a) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4338df) + '\x20l\x20=\x20(max\x20' + '+\x20min)\x20/\x202' + _0x41fced(_0x100b98._0x7b2df5) + _0x41fced(_0x100b98._0x83ca19) + _0x41fced(_0x100b98._0x1ecbe9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x19b819) + _0x41fced(_0x100b98._0x338cee) + '==\x20min)\x20{\x0a' + _0x41fced(_0x100b98._0x35a808) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20h\x20' + _0x41fced(_0x100b98._0x53953b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x20else\x20' + _0x41fced(_0x100b98._0x52e0ea) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xd64) + 'max\x20-\x20min;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20s' + _0x41fced(0x7a7) + _0x41fced(0xab6) + '-\x20max\x20-\x20mi' + 'n)\x20:\x20d\x20/\x20(' + 'max\x20+\x20min)' + _0x41fced(0x76a) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3d584d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x3e6) + _0x41fced(_0x100b98._0x812c1c) + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x1cd76e) + '\x20\x20\x20\x20\x20\x20case' + _0x41fced(0x9de) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20h\x20=\x20' + '((g\x20/\x20255\x20' + '-\x20b\x20/\x20255)' + '\x20/\x20d\x20+\x20(g\x20' + '<\x20b\x20?\x206\x20:\x20' + '0))\x20/\x206;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20break' + _0x41fced(_0x100b98._0x182cf0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x381) + _0x41fced(0xd11) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20h\x20=\x20((' + 'b\x20/\x20255\x20-\x20' + _0x41fced(0x4d3) + '\x20d\x20+\x202)\x20/\x20' + '6;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xceba87) + _0x41fced(_0x100b98._0x348afd) + _0x41fced(0x781) + _0x41fced(0x2b1) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ca' + 'se\x20b\x20/\x20255' + ':\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20h\x20' + '=\x20((r\x20/\x2025' + '5\x20-\x20g\x20/\x2025' + '5)\x20/\x20d\x20+\x204' + ')\x20/\x206;\x0a\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x582876) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x6b5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4a007d) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20h\x20=\x20(' + 'h\x20+\x20hueRad' + _0x41fced(_0x100b98._0x75eba3) + '*\x20Math.PI)' + ')\x20%\x201;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(h\x20<\x200' + _0x41fced(0x7f2) + _0x41fced(_0x100b98._0x3203d1) + _0x41fced(_0x100b98._0x30103b) + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20l' + _0x41fced(0xd8e) + '\x20b2;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + _0x41fced(0x78f) + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x728) + '=\x20b2\x20=\x20l;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x418) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5e427e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20hue' + '2rgb\x20=\x20(p,' + '\x20q,\x20t)\x20=>\x20' + _0x41fced(0x9f0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20if\x20(t\x20' + '<\x200)\x20t\x20+=\x20' + '1;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(t' + '\x20>\x201)\x20t\x20-=' + '\x201;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + 't\x20<\x201/6)\x20r' + 'eturn\x20p\x20+\x20' + _0x41fced(0x35e) + _0x41fced(0xa0d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(t\x20<\x201/2' + ')\x20return\x20q' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20if\x20(t\x20' + '<\x202/3)\x20ret' + 'urn\x20p\x20+\x20(q' + '\x20-\x20p)\x20*\x20(2' + '/3\x20-\x20t)\x20*\x20' + '6;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20retur' + 'n\x20p;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4bd922) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20const\x20q' + '\x20=\x20l\x20<\x200.5' + _0x41fced(0xac5) + '+\x20s)\x20:\x20l\x20+' + '\x20s\x20-\x20l\x20*\x20s' + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'const\x20p\x20=\x20' + '2\x20*\x20l\x20-\x20q;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20r' + '2\x20=\x20hue2rg' + 'b(p,\x20q,\x20h\x20' + '+\x201/3);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3a8f9a) + '\x20hue2rgb(p' + ',\x20q,\x20h);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20b2\x20' + _0x41fced(0xbc8) + 'p,\x20q,\x20h\x20-\x20' + '1/3);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x50f) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x479688) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20data[i]\x20=' + '\x20r2\x20*\x20255;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20data[' + _0x41fced(_0x100b98._0x5dfb5a) + '2\x20*\x20255;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x411) + '+\x202]\x20=\x20b2\x20' + '*\x20255;\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x4eaa2b) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + _0x41fced(_0x100b98._0x536adc) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + 'bloomCtx.p' + 'utImageDat' + _0x41fced(_0x100b98._0x597047) + _0x41fced(_0x100b98._0x49b17a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20blu' + 'rCanvas\x20=\x20' + 'document.c' + _0x41fced(0x40a) + 'nt(\x27canvas' + '\x27);\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1a6d7a) + 'const\x20blur' + _0x41fced(0x481) + 'a.blurAmou' + 'nt\x20||\x2015;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20blur' + _0x41fced(0xac9) + 'th\x20=\x20frame' + 'Width\x20+\x20bl' + 'ur\x20*\x204;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4caccd) + 'nvas.heigh' + _0x41fced(_0x100b98._0x30db32) + 'eight\x20+\x20bl' + _0x41fced(0xa0e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + _0x41fced(0xbb4) + 'blurCanvas' + '.getContex' + 't(\x272d\x27);\x0a\x20' + _0x41fced(_0x100b98._0xa65e4a) + _0x41fced(_0x100b98._0x3f855c) + _0x41fced(0xc39) + _0x41fced(0xb22) + _0x41fced(0x1bd) + 'px)\x27;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20blurCtx.' + 'drawImage(' + 'bloomCanva' + 's,\x20blur\x20*\x20' + '2,\x20blur\x20*\x20' + _0x41fced(_0x100b98._0x3a1a01) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x521942) + _0x41fced(0xcaf) + _0x41fced(_0x100b98._0x30f139) + 's,\x20-finalW' + 'idth\x20/\x202\x20-' + '\x20blur\x20*\x202,' + _0x41fced(0x469) + 'ght\x20/\x202\x20-\x20' + _0x41fced(0x28b) + 'finalWidth' + '\x20+\x20blur\x20*\x20' + '4,\x20finalHe' + 'ight\x20+\x20blu' + 'r\x20*\x204);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20ctx.re' + 'store();\x0a\x20' + _0x41fced(_0x100b98._0x3bc754)) + ('\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x2c1) + '\x20\x20\x20\x20\x20\x20\x20\x20ct' + _0x41fced(_0x100b98._0x395f9e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20ctx.glob' + _0x41fced(_0x100b98._0x3ea713) + 'finalOpaci' + 'ty\x20/\x20255;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20const' + _0x41fced(0xe16) + 's\x20=\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x27Normal\x27' + ':\x20\x27source-' + 'over\x27,\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x27Screen' + _0x41fced(_0x100b98._0x592eb6) + '\x27,\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x27' + 'Add\x27:\x20\x27lig' + _0x41fced(_0x100b98._0x59f3fa) + _0x41fced(0x8ef) + '\x20\x20\x20\x27Multip' + 'ly\x27:\x20\x27mult' + 'iply\x27\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20};' + _0x41fced(_0x100b98._0x38cd42) + '\x20\x20\x20ctx.glo' + 'balComposi' + 'teOperatio' + _0x41fced(_0x100b98._0x2f8737) + 'odes[animD' + 'ata.blendM' + 'ode]\x20||\x20\x27s' + 'ource-over' + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2c9b87) + '\x20\x20\x20\x20\x20\x20\x20\x20ct' + 'x.translat' + 'e(animX,\x20a' + 'nimY);\x0a\x20\x20\x20' + _0x41fced(0xc92) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20fi' + _0x41fced(0x6fc) + _0x41fced(_0x100b98._0x15d064) + 'ta.randomR' + _0x41fced(_0x100b98._0xafde4f) + 'randomRota' + 'tion\x20:\x20(an' + 'imData.rot' + _0x41fced(_0x100b98._0x205e5e) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(f' + 'inalRotati' + 'on\x20!==\x200)\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20ct' + 'x.rotate(f' + 'inalRotati' + 'on\x20*\x20Math.' + _0x41fced(0x242) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x546c8f) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4d6776) + 'lFlipX\x20=\x20a' + 'nimData.ra' + 'ndomFlipX\x20' + '?\x20randomFl' + 'ipX\x20:\x20(ani' + _0x41fced(0xaa0) + '\x20||\x20false)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20const\x20' + 'finalFlipY' + '\x20=\x20animDat' + 'a.randomFl' + _0x41fced(0x90c) + 'omFlipY\x20:\x20' + '(animData.' + 'flipY\x20||\x20f' + _0x41fced(0xa9a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + _0x41fced(_0x100b98._0x3bc1fe) + _0x41fced(_0x100b98._0x2c045d) + '?\x20-1\x20:\x201,\x20' + _0x41fced(_0x100b98._0x44f8d8) + _0x41fced(_0x100b98._0x3e3168) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20if\x20' + '(hue\x20!==\x200' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('const\x20temp' + 'Canvas\x20=\x20d' + 'ocument.cr' + _0x41fced(_0x100b98._0x5ecdca) + _0x41fced(_0x100b98._0x5a4dbd) + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20t' + 'empCanvas.' + _0x41fced(_0x100b98._0x4f9e74) + _0x41fced(_0x100b98._0xb4b7e7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20temp' + 'Canvas.hei' + _0x41fced(0x6d9) + _0x41fced(0xcb7) + _0x41fced(_0x100b98._0x3203d1) + _0x41fced(_0x100b98._0xc79e8d) + '\x20tempCtx\x20=' + '\x20tempCanva' + 's.getConte' + 'xt(\x272d\x27);\x0a' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x16c504) + 'Ctx.drawIm' + 'age(img,\x20c' + 'ol\x20*\x20frame' + 'Width,\x20row' + '\x20*\x20frameHe' + 'ight,\x20fram' + 'eWidth,\x20fr' + 'ameHeight,' + '\x200,\x200,\x20fra' + 'meWidth,\x20f' + 'rameHeight' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc92) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20imageDat' + 'a\x20=\x20tempCt' + _0x41fced(0x41e) + 'Data(0,\x200,' + _0x41fced(_0x100b98._0x426959) + 'h,\x20frameHe' + 'ight);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x386013) + 'ata\x20=\x20imag' + 'eData.data' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc0c) + _0x41fced(_0x100b98._0xa39b49) + 'ians\x20=\x20hue' + '\x20*\x20Math.PI' + _0x41fced(0xaf0) + _0x41fced(_0x100b98._0x257ab9) + _0x41fced(0x82c) + _0x41fced(0x8ef) + '\x20for\x20(let\x20' + 'i\x20=\x200;\x20i\x20<' + _0x41fced(0xb1e) + 'th;\x20i\x20+=\x204' + ')\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x25e640) + '=\x20data[i];' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc6e) + 'ata[i\x20+\x201]' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x994) + 'data[i\x20+\x202' + '];\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x556) + _0x41fced(0x2ff) + '.max(r,\x20g,' + '\x20b)\x20/\x20255;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20const\x20min' + _0x41fced(0x902) + 'n(r,\x20g,\x20b)' + _0x41fced(0x448) + _0x41fced(_0x100b98._0x5e8818) + _0x41fced(_0x100b98._0x52622c) + 't\x20h,\x20s,\x20l\x20' + '=\x20(max\x20+\x20m' + 'in)\x20/\x202;\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(0xc92) + _0x41fced(_0x100b98._0x1a6d7a) + _0x41fced(_0x100b98._0x4f7639) + 'if\x20(max\x20==' + _0x41fced(0xbc3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20h\x20=\x20s\x20=' + _0x41fced(0xda7) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4de104) + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20d\x20=\x20max' + _0x41fced(_0x100b98._0x415164) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20s\x20=\x20l\x20>\x20' + '0.5\x20?\x20d\x20/\x20' + _0x41fced(0xe36) + '\x20min)\x20:\x20d\x20' + _0x41fced(_0x100b98._0x391402) + _0x41fced(_0x100b98._0x5642ad) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8bc) + '\x20(max)\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x27c8b3) + 'e\x20r\x20/\x20255:' + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20h\x20=\x20((g' + '\x20/\x20255\x20-\x20b' + '\x20/\x20255)\x20/\x20' + 'd\x20+\x20(g\x20<\x20b' + '\x20?\x206\x20:\x200))' + '\x20/\x206;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x57e) + 'eak;\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x30103b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20case\x20g\x20' + '/\x20255:\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x22a5f7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20h' + _0x41fced(0x905) + '55\x20-\x20r\x20/\x202' + '55)\x20/\x20d\x20+\x20' + '2)\x20/\x206;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x15b9c3) + 'break;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20case\x20' + 'b\x20/\x20255:\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20h\x20=\x20((r\x20/' + '\x20255\x20-\x20g\x20/' + '\x20255)\x20/\x20d\x20' + _0x41fced(_0x100b98._0x1c773e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x4c34af) + '\x20\x20break;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x7b5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(_0x100b98._0x408b2a) + '\x20\x20\x20\x20\x20\x20\x20\x20h\x20' + '=\x20(h\x20+\x20hue' + _0x41fced(0x55e) + '(2\x20*\x20Math.' + 'PI))\x20%\x201;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4c34af) + _0x41fced(0x8e2) + _0x41fced(_0x100b98._0x4a8f89) + _0x41fced(_0x100b98._0x351a98) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x0a' + _0x41fced(_0x100b98._0x3b69d0) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'let\x20r2,\x20g2' + ',\x20b2;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x4a6) + 's\x20===\x200)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20r2\x20=\x20') + ('g2\x20=\x20b2\x20=\x20' + _0x41fced(0x6c8) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x348) + _0x41fced(_0x100b98._0x41448d) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + _0x41fced(0xe1d) + '=\x20(p,\x20q,\x20t' + ')\x20=>\x20{\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0x3c5c4a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(t' + '\x20<\x200)\x20t\x20+=' + '\x201;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2c3ec4) + _0x41fced(0x8ef) + '\x20\x20if\x20(t\x20>\x20' + '1)\x20t\x20-=\x201;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(t\x20<\x201/6' + _0x41fced(_0x100b98._0x2756d1) + '\x20+\x20(q\x20-\x20p)' + '\x20*\x206\x20*\x20t;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(t\x20<\x201/2)' + '\x20return\x20q;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'f\x20(t\x20<\x202/3' + _0x41fced(_0x100b98._0x2756d1) + '\x20+\x20(q\x20-\x20p)' + '\x20*\x20(2/3\x20-\x20' + 't)\x20*\x206;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20retu' + 'rn\x20p;\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xb13cc) + _0x41fced(0x8ef) + '};\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(_0x100b98._0x30825b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20q\x20' + _0x41fced(_0x100b98._0x4ad04d) + _0x41fced(0x5d0) + '\x20s)\x20:\x20l\x20+\x20' + 's\x20-\x20l\x20*\x20s;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5e8818) + '\x20\x20\x20\x20\x20const' + '\x20p\x20=\x202\x20*\x20l' + _0x41fced(_0x100b98._0x5de449) + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x27402a) + _0x41fced(_0x100b98._0x4021ca) + 'gb(p,\x20q,\x20h' + '\x20+\x201/3);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20g2\x20=\x20hu' + 'e2rgb(p,\x20q' + ',\x20h);\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'b2\x20=\x20hue2r' + 'gb(p,\x20q,\x20h' + '\x20-\x201/3);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20data[i]\x20' + '=\x20r2\x20*\x20255' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20data[i\x20+' + '\x201]\x20=\x20g2\x20*' + '\x20255;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20data' + '[i\x20+\x202]\x20=\x20' + 'b2\x20*\x20255;\x0a' + _0x41fced(_0x100b98._0x8f1af1) + _0x41fced(_0x100b98._0x34a685) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x54a744) + _0x41fced(_0x100b98._0xd5c8da) + _0x41fced(_0x100b98._0x597047)) + (_0x41fced(_0x100b98._0x432046) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20ctx.' + 'drawImage(' + 'tempCanvas' + _0x41fced(0x2a2) + 'dth\x20/\x202,\x20-' + 'finalHeigh' + 't\x20/\x202,\x20fin' + 'alWidth,\x20f' + 'inalHeight' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20}\x20els' + 'e\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x2e7) + 'age(img,\x20c' + 'ol\x20*\x20frame' + _0x41fced(_0x100b98._0x946dcf) + '\x20*\x20frameHe' + 'ight,\x20fram' + 'eWidth,\x20fr' + _0x41fced(0x5be) + _0x41fced(0x720) + _0x41fced(0x9e9) + 'inalHeight' + '\x20/\x202,\x20fina' + 'lWidth,\x20fi' + 'nalHeight)' + _0x41fced(_0x100b98._0x4947c7) + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + _0x41fced(_0x100b98._0x15b9c3) + '\x20ctx.resto' + 're();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20frame\x20=\x20(' + _0x41fced(_0x100b98._0x1e06b4) + _0x41fced(_0x100b98._0x3bb710) + 'ames;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xf4b097) + _0x41fced(_0x100b98._0x5a23a6) + 'te,\x201000\x20/' + '\x20Math.min(' + 'animData.f' + 'ps,\x2030));\x0a' + _0x41fced(0xc02) + _0x41fced(_0x100b98._0x542292) + _0x41fced(_0x100b98._0x4e8ffc) + 'ner\x20&&\x20win' + 'dow.opener' + '.ImageMana' + 'ger)\x20{\x0a\x20\x20\x20' + _0x41fced(0x3b4) + _0x41fced(_0x100b98._0x260eb5) + 'p\x20=\x20window' + _0x41fced(_0x100b98._0x3ffb17) + 'ageManager' + '.loadPictu' + 're(animDat' + 'a.spritesh' + 'eetFile);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20if' + '\x20(tempBitm' + _0x41fced(0x7c9) + 'Bitmap._ur' + 'l)\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20img' + '.src\x20=\x20tem' + 'pBitmap._u' + _0x41fced(_0x100b98._0x130418) + '\x20\x20}\x0a\x20\x20\x20\x20}\x0a' + '}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20f' + 'unction\x20lo' + 'adAnimatio' + 'nFromLibra' + 'ry(name,\x20a' + 'nimData)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20closeLibr' + 'ary();\x0a\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20img\x20=\x20n' + 'ew\x20Image()' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x759) + 'ad\x20=\x20funct' + 'ion()\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x4c9) + 'pritesheet' + _0x41fced(_0x100b98._0x4afc1c)) + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20document' + '.getElemen' + 'tById(\x27ani' + 'mationName' + 'Input\x27).va' + _0x41fced(0x696) + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x32d3f6) + 'ment.getEl' + 'ementById(' + '\x27rowInput\x27' + ').value\x20=\x20' + 'animData.r' + 'ows;\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + 'ocument.ge' + 'tElementBy' + 'Id(\x27column' + 'Input\x27).va' + 'lue\x20=\x20anim' + _0x41fced(0x977) + 'ns;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20do' + 'cument.get' + 'ElementByI' + 'd(\x27fpsInpu' + 't\x27).value\x20' + '=\x20animData' + _0x41fced(_0x100b98._0x3b9995) + _0x41fced(_0x100b98._0x63d204) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'document.g' + _0x41fced(0xa66) + _0x41fced(0x366) + 'Input\x27).va' + 'lue\x20=\x20anim' + _0x41fced(0x650) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4e8166) + 'ment.getEl' + 'ementById(' + _0x41fced(0x23f) + 'put\x27).valu' + 'e\x20=\x20animDa' + 'ta.opacity' + '\x20||\x20255;\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20documen' + _0x41fced(0xb7f) + _0x41fced(_0x100b98._0xea4c08) + _0x41fced(0x2d2) + 'alue\x20=\x20ani' + 'mData.hue\x20' + '||\x200;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'document.g' + 'etElementB' + 'yId(\x27blend' + _0x41fced(_0x100b98._0x188eec) + ').value\x20=\x20' + _0x41fced(0x2bb) + _0x41fced(_0x100b98._0x3b6d67) + _0x41fced(0x4dc) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20docu' + 'ment.getEl' + 'ementById(' + _0x41fced(_0x100b98._0x139f0f) + _0x41fced(0xbcc) + 'hecked\x20=\x20a' + _0x41fced(0x483) + _0x41fced(0x835) + 'e\x20||\x20false' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x157ef7) + '\x20\x20\x20\x20\x20\x20docu' + _0x41fced(0x6fe) + _0x41fced(_0x100b98._0x38de5d) + _0x41fced(_0x100b98._0x29d643) + 'ontalCheck' + 'box\x27).chec' + 'ked\x20=\x20anim' + 'Data.flip\x20' + '||\x20false;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x558799) + _0x41fced(0x522) + 'nt.getElem' + 'entById(\x27f' + _0x41fced(_0x100b98._0x4ebf47) + 'lCheckbox\x27') + (').checked\x20' + '=\x20animData' + _0x41fced(0xa13) + 'false;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x357965) + '\x20document.' + _0x41fced(0x87c) + 'ById(\x27rand' + 'omFlipHori' + 'zontalChec' + 'kbox\x27).che' + 'cked\x20=\x20ani' + 'mData.rand' + 'omFlipX\x20||' + '\x20false;\x0a\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x538fe0) + _0x41fced(0xc81) + _0x41fced(_0x100b98._0x15fce8) + 'tById(\x27ran' + _0x41fced(0x615) + 'ticalCheck' + 'box\x27).chec' + _0x41fced(0x84e) + 'Data.rando' + 'mFlipY\x20||\x20' + _0x41fced(0xdb0) + _0x41fced(_0x100b98._0x2bde14) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20document.' + 'getElement' + 'ById(\x27rota' + 'tionInput\x27' + ').value\x20=\x20' + _0x41fced(_0x100b98._0x4bf1f5) + 'otation\x20||' + _0x41fced(0xda7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1f63f9) + 'cument.get' + 'ElementByI' + 'd(\x27randomR' + _0x41fced(_0x100b98._0x47cf9c) + _0x41fced(_0x100b98._0x3a3549) + _0x41fced(0xb2e) + 'imData.ran' + 'domRotatio' + 'n\x20||\x20false' + _0x41fced(_0x100b98._0x2e26df) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x539638) + 'ment.getEl' + 'ementById(' + '\x27openingAn' + 'imationInp' + 'ut\x27).value' + '\x20=\x20animDat' + 'a.openingA' + 'nimation\x20|' + _0x41fced(0xd2e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x522) + 'nt.getElem' + 'entById(\x27e' + 'ndingAnima' + 'tionInput\x27' + ').value\x20=\x20' + 'animData.e' + 'ndingAnima' + _0x41fced(_0x100b98._0x24977a) + _0x41fced(0x83e) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'document.g' + 'etElementB' + 'yId(\x27anima' + _0x41fced(0x302) + 'onInput\x27).' + _0x41fced(_0x100b98._0x3b3527) + 'imData.ani' + 'mationDura' + 'tion\x20||\x2030' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x19d56) + _0x41fced(0x6fe) + 'ementById(' + '\x27bloomChec' + _0x41fced(_0x100b98._0x196c24) + _0x41fced(_0x100b98._0xee4d50) + _0x41fced(0xbea) + 'mEffect\x20||' + '\x20false;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc81) + '.getElemen' + 'tById(\x27blu') + (_0x41fced(0x648) + _0x41fced(0x99d) + _0x41fced(_0x100b98._0x14ba21) + 'a.blurAmou' + 'nt\x20||\x2015;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20docume' + _0x41fced(0x4f2) + 'entById(\x27i' + _0x41fced(_0x100b98._0x47385d) + _0x41fced(_0x100b98._0x442492) + _0x41fced(0x9e4) + 'ta.intensi' + 'ty\x20||\x20255;' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x53a854) + _0x41fced(_0x100b98._0x56e0c4) + 'ent.getEle' + 'mentById(\x27' + _0x41fced(_0x100b98._0x5319c8) + _0x41fced(0x40c) + 'ue\x20=\x20animD' + _0x41fced(_0x100b98._0x2c88fc) + 'lor\x20||\x20\x27#F' + 'FFFFF\x27;\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20document' + '.getElemen' + 'tById(\x27zIn' + 'dexInput\x27)' + '.value\x20=\x20a' + 'nimData.zI' + _0x41fced(_0x100b98._0x4db07b) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x83ca19) + _0x41fced(0x549) + 'etElementB' + 'yId(\x27offse' + _0x41fced(_0x100b98._0x2d4135) + 'value\x20=\x20an' + 'imData.off' + _0x41fced(0x80b) + _0x41fced(_0x100b98._0x558799) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20docume' + 'nt.getElem' + 'entById(\x27o' + 'ffsetYInpu' + 't\x27).value\x20' + _0x41fced(_0x100b98._0x3464cd) + _0x41fced(0x89e) + '\x202;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa9c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x20f222) + 'ueDisplay(' + ');\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xbf1295) + '\x20\x20\x20\x20\x20\x20\x20upd' + 'ateRotatio' + 'nDisplay()' + _0x41fced(0x76a) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x52370b) + _0x41fced(_0x100b98._0x3e7929) + 'Visibility' + _0x41fced(0x355) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20if\x20(ani' + 'mData.char' + _0x41fced(_0x100b98._0x23dede) + 'e\x20&&\x20animD' + _0x41fced(_0x100b98._0xfebafe) + 'terSprite.' + 'dataUrl)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x59be9e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20c' + 'onst\x20charI' + 'mg\x20=\x20new\x20I' + 'mage();\x0a\x20\x20' + _0x41fced(_0x100b98._0x378338) + _0x41fced(_0x100b98._0x8041b) + _0x41fced(0x27e) + _0x41fced(_0x100b98._0x1c1015) + _0x41fced(0xd5c) + 'n()\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20ch' + _0x41fced(_0x100b98._0x5cd7a4) + 'ite\x20=\x20char' + 'Img;\x0a\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x10ee45) + 'racterSpri' + _0x41fced(0x9e6) + _0x41fced(0xd15) + 'haracterSp' + 'rite.width' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20charac' + _0x41fced(0xaa8) + 'eight\x20=\x20an' + 'imData.cha' + 'racterSpri' + _0x41fced(0xb6f) + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x41fced(0x6a5) + _0x41fced(0xc56) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20isAnimat' + 'ing\x20=\x20true' + _0x41fced(_0x100b98._0x1416d7) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20an' + 'imatePrevi' + 'ew();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + _0x41fced(_0x100b98._0x2b566e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20};' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(_0x100b98._0x103549) + 'harImg.src' + '\x20=\x20animDat' + 'a.characte' + 'rSprite.da' + _0x41fced(_0x100b98._0x12dfcd) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x534f5d) + '\x20\x20\x20\x20\x20\x20\x20\x0a\x20\x20' + _0x41fced(_0x100b98._0x28c292) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20updateFi' + _0x41fced(0xd86) + 'animData.s' + 'pritesheet' + 'File);\x0a\x20\x20\x20' + _0x41fced(_0x100b98._0xbdac15) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xf895a5) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + '!isAnimati' + 'ng)\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2a07b1) + _0x41fced(0xde3) + 'ue;\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20animateP' + 'review();\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20};\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(0xc92) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x6a2527) + 'if\x20(window' + '.opener\x20&&' + '\x20window.op' + _0x41fced(0x4f6) + _0x41fced(0x5b9) + _0x41fced(0xd99) + _0x41fced(_0x100b98._0x3754b4) + '\x20\x20\x20\x20\x20const' + _0x41fced(0x436) + 'p\x20=\x20window' + '.opener.Im' + _0x41fced(0x784)) + ('.loadPictu' + _0x41fced(_0x100b98._0x224381) + _0x41fced(0xcdc) + 'eetFile);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x14ca06) + '\x20\x20\x20\x20if\x20(te' + 'mpBitmap\x20&' + '&\x20tempBitm' + 'ap._url)\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20i' + 'mg.src\x20=\x20t' + 'empBitmap.' + '_url;\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xa80) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20d' + 'ocument.ad' + _0x41fced(0x2d6) + 'ener(\x27clic' + 'k\x27,\x20functi' + _0x41fced(_0x100b98._0x2527ef) + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20const\x20mo' + 'dal\x20=\x20docu' + 'ment.getEl' + 'ementById(' + '\x27libraryMo' + 'dal\x27);\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x50bf4a) + '(event.tar' + 'get\x20===\x20mo' + _0x41fced(0x4d4) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20closeLibr' + 'ary();\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4e4c85) + _0x41fced(_0x100b98._0x3bbc7b) + '\x20\x20\x20\x20\x20\x20func' + 'tion\x20remov' + 'eAllTarget' + 'Sprites()\x20' + '{\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x33fb22) + 'riteCount\x20' + '=\x20Object.v' + 'alues(libr' + 'aryAnimati' + 'ons).filte' + 'r(anim\x20=>\x20' + 'anim.chara' + 'cterSprite' + _0x41fced(_0x100b98._0x1f20ac) + _0x41fced(0x8ef) + _0x41fced(0x8ef) + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5a2277) + _0x41fced(_0x100b98._0x2b140b) + '\x200)\x20return' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x52aeaa) + _0x41fced(_0x100b98._0x1a5c80) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20let\x20rem' + _0x41fced(_0x100b98._0x1998b2) + _0x41fced(0x971) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20for\x20(' + 'const\x20[nam' + 'e,\x20animDat' + _0x41fced(0x46a) + 'ct.entries' + '(libraryAn' + 'imations))' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x50bf4a) + '(animData.' + 'characterS' + 'prite)\x20{\x0a\x20' + _0x41fced(0x8ef) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20ani' + 'mData.char' + _0x41fced(_0x100b98._0x4f9ba9)) + (_0x41fced(0x62e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xd6cfbf) + '\x20\x20\x20\x20\x20\x20\x20\x20re' + _0x41fced(0x7ac) + '++;\x0a\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x169f3f) + '\x20\x20\x20\x20\x20\x20\x20\x20}\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x50f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + _0x41fced(0x628) + 'dow.opener' + '\x20&&\x20window' + '.opener.re' + 'moveAllTar' + _0x41fced(0x7a1) + 'FromLibrar' + 'y)\x20{\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4a8ca2) + _0x41fced(_0x100b98._0x1df575) + _0x41fced(0xe23) + 'llTargetSp' + 'ritesFromL' + 'ibrary();\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x378338) + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20display' + 'Library();' + _0x41fced(0xd99) + '\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20func' + 'tion\x20updat' + 'eHueDispla' + _0x41fced(0xb4c) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20cons' + 't\x20hueValue' + '\x20=\x20documen' + _0x41fced(_0x100b98._0x2bd977) + 'ntById(\x27hu' + _0x41fced(0xd54) + _0x41fced(0xbaf) + _0x41fced(0x76a) + _0x41fced(_0x100b98._0x4f7639) + '\x20\x20const\x20hu' + 'eDisplay\x20=' + _0x41fced(0x858) + 'getElement' + 'ById(\x27hueD' + 'isplay\x27);\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x22b378) + 'if\x20(hueDis' + 'play)\x20{\x0a\x20\x20' + _0x41fced(_0x100b98._0x37aff9) + _0x41fced(_0x100b98._0x488bf5) + '\x20\x20hueDispl' + _0x41fced(0x4b2) + _0x41fced(0x78b) + _0x41fced(0xca0) + '\x27;\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20}\x0a\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x4fbeb) + _0x41fced(0x8ef) + 'function\x20u' + 'pdatePrevi' + _0x41fced(_0x100b98._0x542c2e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20tri' + 'ggerAutoSa' + 've();\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x945) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x45d) + 'triggerAut' + 'oSave()\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xc0c) + 'nst\x20autoSa' + _0x41fced(_0x100b98._0x27aa4d) + 'document.g' + 'etElementB' + 'yId(\x27autoS' + _0x41fced(0x5fd) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + 'const\x20auto') + ('SaveEnable' + 'd\x20=\x20docume' + 'nt.getElem' + 'entById(\x27a' + _0x41fced(0x7f3) + 'ckbox\x27)?.c' + 'hecked\x20||\x20' + 'false;\x0a\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x308af4) + _0x41fced(0xbbd) + 'ld\x20||\x20auto' + 'SaveField.' + _0x41fced(_0x100b98._0x2c7a76) + 'lay\x20===\x20\x27n' + 'one\x27\x20||\x20!a' + _0x41fced(_0x100b98._0x4f0168) + 'bled)\x20retu' + 'rn;\x0a\x0a\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x24d048) + _0x41fced(_0x100b98._0x249942) + 'nimationNa' + 'me\x20=\x20docum' + 'ent.getEle' + 'mentById(\x27' + 'animationN' + 'ameInput\x27)' + _0x41fced(_0x100b98._0x5eddad) + 'im();\x0a\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xc4bdc2) + '\x20\x20\x20\x20if\x20(!a' + _0x41fced(0x228) + 'me)\x20return' + ';\x0a\x0a\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20if\x20(windo' + 'w.opener\x20&' + '&\x20window.o' + _0x41fced(_0x100b98._0x299e1c) + 'AnimationL' + 'ibrary)\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x9b47ec) + _0x41fced(_0x100b98._0x4085db) + 'pener.load' + 'AnimationL' + _0x41fced(_0x100b98._0x41fe74) + _0x41fced(_0x100b98._0x54214d) + 'ry)\x20=>\x20{\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20if\x20(l' + _0x41fced(_0x100b98._0x356d14) + _0x41fced(_0x100b98._0x5c4a40) + 'imationNam' + 'e])\x20{\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20if\x20(' + _0x41fced(_0x100b98._0x54537b) + 'meout)\x20{\x0a\x20' + _0x41fced(_0x100b98._0x41c0cd) + _0x41fced(0x8ef) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20clearTi' + 'meout(auto' + 'SaveTimeou' + 't);\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x9ac) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x27fac9) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x426802) + '\x20\x20\x20\x20\x20\x20\x20aut' + 'oSaveTimeo' + 'ut\x20=\x20setTi' + 'meout(()\x20=' + '>\x20{\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x58a681) + _0x41fced(0x984) + 'y(true);\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20}' + ',\x20100);\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0x8ef) + '\x20\x20\x20\x20}\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2b213f) + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0xfc68c5) + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20') + ('\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20functio' + 'n\x20updateAu' + 'toSaveVisi' + 'bility()\x20{' + '\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20con' + _0x41fced(0xa81) + 'eField\x20=\x20d' + _0x41fced(0x3bd) + 'tElementBy' + 'Id(\x27autoSa' + 'veField\x27);' + _0x41fced(_0x100b98._0x4bcae2) + '\x20\x20\x20\x20\x20\x20\x20con' + 'st\x20animati' + _0x41fced(0x508) + _0x41fced(_0x100b98._0x20afd8) + 'tElementBy' + _0x41fced(_0x100b98._0x4e8c08) + 'ionNameInp' + 'ut\x27)?.valu' + 'e.trim();\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(0xaed) + _0x41fced(_0x100b98._0x163827) + '\x20\x20\x20if\x20(!an' + 'imationNam' + 'e\x20||\x20!auto' + 'SaveField)' + '\x20{\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x1ecd14) + _0x41fced(_0x100b98._0xc034c1) + _0x41fced(0x3a0) + ')\x20autoSave' + 'Field.styl' + 'e.display\x20' + '=\x20\x27none\x27;\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x57028f) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x5843d3) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x0a\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x2e8c34) + _0x41fced(0x6ab) + 'opener\x20&&\x20' + 'window.ope' + 'ner.loadAn' + 'imationLib' + 'rary)\x20{\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20wi' + 'ndow.opene' + 'r.loadAnim' + 'ationLibra' + _0x41fced(0x24f) + '(library)\x20' + _0x41fced(_0x100b98._0x20a971) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x3bf24b) + 'f\x20(library' + '\x20&&\x20librar' + 'y[animatio' + _0x41fced(_0x100b98._0x2a18f2) + _0x41fced(_0x100b98._0x373a34) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20au' + 'toSaveFiel' + 'd.style.di' + 'splay\x20=\x20\x27b' + _0x41fced(0x6be) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20}\x20else\x20{\x0a' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20au' + 'toSaveFiel' + _0x41fced(_0x100b98._0x298e26) + _0x41fced(0xa84) + _0x41fced(0x83e) + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '}\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20});\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + '\x20\x20}\x0a\x20\x20\x20\x20\x20\x20' + '\x20\x20\x20\x20\x20\x20}\x0a\x20\x20' + '\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20' + _0x41fced(_0x100b98._0x221bc7) + _0x41fced(_0x100b98._0xf61ad9) + 'body>\x0a\x20\x20\x20\x20' + '\x20\x20\x20\x20')), AnimationEditorWindow['document']['close'](); const _0x1daab0 = setInterval(() => { AnimationEditorWindow && AnimationEditorWindow['closed'] && (clearInterval(_0x1daab0), disableEditorPreviewMode()); }, -0x2 * -0xfad + -0x1cf9 * -0x1 + -0x33 * 0x125); } } } function _0x4d27(_0x52f3a4, _0x294eb5) { _0x52f3a4 = _0x52f3a4 - (0x102b + 0x1 * -0x260b + 0x178d); const _0xcd601c = _0x7afa(); let _0x53b763 = _0xcd601c[_0x52f3a4]; return _0x53b763; } function enableEditorPreviewMode() { editorPreviewMode = !![], selectedCharacterForPreview = null, hxSetAlwaysRun(!![]); } function disableEditorPreviewMode() { editorPreviewMode = ![], selectedCharacterForPreview = null, hxSetAlwaysRun(![]); } function handleCharacterClick(_0x530f95, _0x5b8131) { const _0x3a28f8 = { _0x3a8706: 0x8b2, _0x3a3e05: 0x769, _0x2f50cf: 0xc48, _0x1f73db: 0x673, _0x26126c: 0x3d5, _0x20da93: 0x61f, _0x504bdd: 0x526 }, _0x35f25e = _0x4d27; if (!editorPreviewMode || !SceneManager[_0x35f25e(_0x3a28f8._0x3a8706)]['_spriteset']) return; const _0x5b81c8 = getCharacterAtPosition(_0x530f95, _0x5b8131); if (_0x5b81c8) { selectedCharacterForPreview = _0x5b81c8; if (AnimationEditorWindow && !AnimationEditorWindow['closed']) { const _0x5789a5 = SceneManager['_scene']['_spriteset'][_0x35f25e(0x706) + _0x35f25e(_0x3a28f8._0x3a3e05)]['find'](_0x2e7ea1 => _0x2e7ea1['_character'] === _0x5b81c8); if (_0x5789a5 && _0x5789a5['bitmap'] && _0x5789a5['bitmap']['isReady']()) sendCharacterSpriteToEditor(_0x5789a5, _0x5b81c8); else _0x5789a5 && _0x5789a5[_0x35f25e(_0x3a28f8._0x2f50cf)] && (_0x35f25e(_0x3a28f8._0x1f73db) === _0x35f25e(_0x3a28f8._0x26126c) ? _0xa1c1ed['error'](_0x35f25e(0xa86) + _0x35f25e(_0x3a28f8._0x20da93) + 't\x20sprites\x20' + _0x35f25e(_0x3a28f8._0x504bdd) + 'ry:', _0x3a55fa) : _0x5789a5[_0x35f25e(0xc48)][_0x35f25e(0xb5e) + 'tener'](() => { sendCharacterSpriteToEditor(_0x5789a5, _0x5b81c8); })); } } } function deleteAnimationFromLibrary(_0x3fb928) { const _0x35bfb1 = { _0x403601: 0xcb2, _0x280dd0: 0x251 }, _0x2400a1 = _0x4d27; if (!Utils['isNwjs']()) return; try { const _0x28d2a8 = require('fs'), _0x305861 = require('path'), _0x42434f = _0x305861['dirname'](process['mainModule']['filename']) + _0x2400a1(0xcc4), _0x30d238 = _0x42434f + (_0x2400a1(0x621) + 'olutionLib' + 'rary.json'); if (_0x28d2a8['existsSync'](_0x30d238)) { if ('SyyTA' !== 'SyyTA') return 'Animation/' + _0x4fef53['replace'](/\.[^/.]+$/, ''); else { const _0x4c9310 = _0x28d2a8['readFileSy' + 'nc'](_0x30d238, _0x2400a1(_0x35bfb1._0x403601)); let _0x3bff50 = JSON['parse'](_0x4c9310); _0x3bff50[_0x3fb928] ? (delete _0x3bff50[_0x3fb928], _0x28d2a8['writeFileS' + _0x2400a1(0xcb8)](_0x30d238, JSON['stringify'](_0x3bff50, null, -0x52 * -0xc + -0x11 * 0x133 + 0x1 * 0x108d), _0x2400a1(0xcb2)), animationLibraryCache = _0x3bff50) : console['warn']('Animation\x20' + _0x2400a1(0x52b) + 'in\x20library' + ':\x20' + _0x3fb928); } } } catch (_0x1196d1) { console[_0x2400a1(_0x35bfb1._0x280dd0)]('Error\x20dele' + 'ting\x20anima' + 'tion\x20from\x20' + 'library:', _0x1196d1); } } function removeAllTargetSpritesFromLibrary() { const _0x51d8c9 = { _0x1b3b6b: 0x570, _0x125d99: 0x4e9, _0x1c8de3: 0x396 }, _0x37914a = _0x4d27; if (!Utils['isNwjs']()) return; try { const _0x12e06e = require('fs'), _0x2cf857 = require('path'), _0x29aa28 = _0x2cf857['dirname'](process[_0x37914a(0xdc4)]['filename']) + '/js/', _0x1e41ff = _0x29aa28 + ('AnimationS' + 'olutionLib' + _0x37914a(_0x51d8c9._0x1b3b6b)); if (_0x12e06e['existsSync'](_0x1e41ff)) { const _0x1d7ed6 = _0x12e06e[_0x37914a(_0x51d8c9._0x125d99) + 'nc'](_0x1e41ff, 'utf8'); let _0x3a1b62 = JSON['parse'](_0x1d7ed6), _0x1fe5b2 = 0x1 * -0xfee + 0x34b * -0x3 + -0x1 * -0x19cf; for (const _0x40a41e in _0x3a1b62) { _0x3a1b62[_0x40a41e]['characterS' + _0x37914a(_0x51d8c9._0x1c8de3)] && (_0x3a1b62[_0x40a41e]['characterS' + 'prite'] = null, _0x1fe5b2++); } _0x12e06e['writeFileS' + _0x37914a(0xcb8)](_0x1e41ff, JSON['stringify'](_0x3a1b62, null, -0xc5d * -0x1 + 0xc70 + -0x18cb * 0x1), 'utf8'), animationLibraryCache = _0x3a1b62; } } catch (_0x292168) { console[_0x37914a(0x251)](_0x37914a(0xa86) + 'ving\x20targe' + _0x37914a(0xc7f) + _0x37914a(0x526) + 'ry:', _0x292168); } } window['removeAllT' + 'argetSprit' + 'esFromLibr' + 'ary'] = removeAllTargetSpritesFromLibrary; function sendCharacterSpriteToEditor(_0x669489, _0x49c461) { const _0x2f9349 = { _0x588925: 0x254, _0x31df02: 0x319, _0x1fae52: 0x6cf, _0x530d17: 0x712, _0x5ce1e7: 0xd2c, _0x345991: 0x33a }, _0x3cbcec = _0x4d27; if (!_0x669489 || !_0x669489[_0x3cbcec(0xc48)] || !AnimationEditorWindow) return; const _0x260759 = _0x669489['bitmap'], _0xa3ade2 = document['createElem' + 'ent'](_0x3cbcec(_0x2f9349._0x588925)), _0x1a6786 = _0xa3ade2['getContext']('2d'), _0x4a9c42 = _0x669489['patternWid' + 'th'](), _0x30ad7c = _0x669489['patternHei' + _0x3cbcec(_0x2f9349._0x31df02)](), _0x1a4ab2 = _0x4a9c42, _0x52b0c9 = _0x30ad7c, _0x40579e = $gameMap[_0x3cbcec(_0x2f9349._0x1fae52)](), _0xe9b528 = $gameMap['tileHeight'](); let _0x5843ad = -0x8 * -0x286 + 0x1483 + -0x28b2; if (_0x49c461['_priorityT' + _0x3cbcec(_0x2f9349._0x530d17)] !== undefined) switch (_0x49c461['_priorityT' + 'ype']) { case 0xb1c + 0x1425 + -0x1f41: _0x5843ad = -0x150d + 0xf49 + 0x5c8; break; case 0x1c5a + -0x2a * 0x73 + -0x97b: _0x5843ad = 0x986 + -0x1869 + 0x9 * 0x1a8; break; case 0xa + 0x1241 * 0x2 + -0x248a: _0x5843ad = 0x2b * 0x7a + 0x2164 + -0x35dc; break; default: _0x5843ad = -0xf2e + 0x13e7 * -0x1 + 0x1 * 0x231a; break; } else _0x5843ad = -0x1a49 * 0x1 + 0x2693 + -0x15d * 0x9; let _0x13dbe2, _0x599011; if (_0x669489['_isBigChar' + 'acter']) _0x13dbe2 = 0x1215 + -0x795 + -0x70 * 0x18, _0x599011 = 0x1172 + -0xe * -0x7c + -0x183a; else { const _0x524906 = _0x49c461['_character' + 'Index'] || 0x1 * 0xd33 + 0x16a * -0x7 + 0xd * -0x41, _0x35595e = _0x49c461['_frames'] || -0xed7 * 0x2 + 0x1a9c + -0x1 * -0x315, _0xa3b011 = _0x524906 % (-0x16a6 * -0x1 + 0xa23 + -0x20c5) * _0x35595e, _0x4c82f9 = Math[_0x3cbcec(_0x2f9349._0x5ce1e7)](_0x524906 / (-0xb8d + 0x15ff + -0xa6e)) * (0x29c * -0x1 + -0x261c + 0x28bc); _0x13dbe2 = _0xa3b011 * _0x4a9c42, _0x599011 = _0x4c82f9 * _0x30ad7c; } _0xa3ade2['width'] = _0x4a9c42, _0xa3ade2[_0x3cbcec(0xd13)] = _0x30ad7c; const _0x48a555 = document[_0x3cbcec(_0x2f9349._0x345991) + _0x3cbcec(0x470)]('canvas'), _0x2cefa2 = _0x48a555['getContext']('2d'); _0x48a555['width'] = _0x260759['width'], _0x48a555['height'] = _0x260759['height'], _0x2cefa2['drawImage'](_0x260759['_canvas'] || _0x260759[_0x3cbcec(0xa22)], 0x872 + 0xe * -0x13d + 0x8e4, -0x852 * 0x1 + -0x13db + 0x1 * 0x1c2d), _0x1a6786['drawImage'](_0x48a555, _0x13dbe2, _0x599011, _0x4a9c42, _0x30ad7c, 0x1a6e + 0x51b + -0x1b * 0x12b, -0xc1e + 0x1 * 0xf29 + 0x13 * -0x29, _0x4a9c42, _0x30ad7c); const _0x4d5e43 = _0xa3ade2['toDataURL'](); AnimationEditorWindow && !AnimationEditorWindow['closed'] && AnimationEditorWindow['setCharact' + 'erSprite'](_0x4d5e43, _0x4a9c42, _0x30ad7c, _0x1a4ab2, _0x52b0c9, _0x40579e, _0xe9b528, _0x5843ad); } function getCharacterAtPosition(_0x3e3287, _0x3e3117) { const _0x424b5f = { _0x880aa1: 0x4ec }, _0x2ae813 = _0x4d27; if (!SceneManager['_scene'] || !SceneManager['_scene'][_0x2ae813(0xd87)]) return null; const _0x357465 = SceneManager['_scene']['_spriteset']['_character' + _0x2ae813(0x769)]; for (let _0x3112e2 = _0x357465['length'] - (0x202 * 0xa + -0x19b + -0x4 * 0x49e); _0x3112e2 >= 0x49 * -0x64 + -0x47b + 0x20ff; _0x3112e2--) { const _0x46da10 = _0x357465[_0x3112e2]; if (!_0x46da10[_0x2ae813(0x706)]) continue; const _0x1d65cc = {}; _0x1d65cc['left'] = _0x46da10['x'] - _0x46da10['width'] / (0xf44 + 0x47c + 0x13 * -0x10a), _0x1d65cc['right'] = _0x46da10['x'] + _0x46da10[_0x2ae813(_0x424b5f._0x880aa1)] / (-0xd12 + 0x47b * -0x1 + 0x118f), _0x1d65cc['top'] = _0x46da10['y'] - _0x46da10[_0x2ae813(0xd13)], _0x1d65cc['bottom'] = _0x46da10['y']; const _0x3d365e = _0x1d65cc; if (_0x3e3287 >= _0x3d365e[_0x2ae813(0x305)] && _0x3e3287 <= _0x3d365e['right'] && _0x3e3117 >= _0x3d365e['top'] && _0x3e3117 <= _0x3d365e['bottom']) { if ('uKwDo' === _0x2ae813(0x41c)) return _0x46da10['_character']; else { const _0x6ec929 = _0x4b5c8c['readFileSy' + 'nc'](_0x779b98, 'utf8'); return _0x2c9103 = _0x580901['parse'](_0x6ec929), _0x2b1bfb[_0x2ae813(0x60a)](_0x562f3d); } } } return null; } let _hxAlwaysRun = ![]; function hxSetAlwaysRun(_0x344d2f) { _hxAlwaysRun = _0x344d2f; } if (Object['getOwnProp' + _0x2283d4(0x357) + 'ptor'](document, _0x2283d4(0x31d))?.[_0x2283d4(0x493) + 'le'] !== ![]) { const _hxOriginalHasFocus = document['hasFocus']['bind'](document); Object['defineProp' + 'erty'](document, 'hasFocus', { 'value': function () { return _hxAlwaysRun || _hxOriginalHasFocus(); }, 'writable': ![], 'configurable': !![] }); } window['getAnimati' + 'onFromLibr' + _0x2283d4(0x9ee)] = getAnimationFromLibrary, window['saveAnimat' + _0x2283d4(0x43a) + 'ry'] = saveAnimationToLibrary, window['loadAnimat' + 'ionLibrary'] = loadAnimationLibrary, window[_0x2283d4(0x749) + _0x2283d4(0x9b4) + _0x2283d4(0x7d8)] = deleteAnimationFromLibrary;
})();