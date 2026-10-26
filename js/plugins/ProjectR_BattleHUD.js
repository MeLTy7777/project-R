/*:
 * @target MZ
 * @plugindesc v1.0.0 FHD基準のProjectR専用アクション戦闘HUDを表示します。
 * @author ProjectR
 * @orderAfter Hendrix_Hotbar_Creator
 * @orderAfter ProjectR_FullscreenDialogue
 * @orderAfter ProjectR_CombatPresence
 *
 * @param DebugPreview
 * @text 開発用プレビュー
 * @desc 実データの代わりに、HUD全体を確認できるダミー値を表示します。本番ではOFFにしてください。
 * @type boolean
 * @on ON
 * @off OFF
 * @default false
 *
 * @param VisibilitySwitchId
 * @text 表示許可スイッチ
 * @desc 0ならProjectRBattleHUD.show()/hide()で制御します。1以上なら、そのスイッチがONの時だけ表示します。
 * @type switch
 * @default 0
 *
 * @param HideDuringMessages
 * @text メッセージ中は隠す
 * @desc 通常メッセージおよびProjectR全画面会話の表示中にHUDを隠します。
 * @type boolean
 * @on 隠す
 * @off 隠さない
 * @default true
 *
 * @param UltimateVariableId
 * @text Ultimate現在値の変数
 * @desc 0なら変数とは接続しません。ProjectRBattleHUD.setUltimate(value, max)でも設定できます。
 * @type variable
 * @default 0
 *
 * @param UltimateMaxVariableId
 * @text Ultimate最大値の変数
 * @desc 0なら最大値100を使います。
 * @type variable
 * @default 0
 *
 * @param AssetFolder
 * @text 差し替え画像フォルダ
 * @desc 後から専用PNGを置くフォルダです。末尾の/を含めてください。
 * @type string
 * @default img/projectr_ui/battle/
 *
 * @param GodLabel
 * @text 指輪の神の初期表示名
 * @desc 指輪の神データが接続されるまで表示する名前です。
 * @type string
 * @default GOD
 *
 * @command ShowHUD
 * @text Battle HUDを表示
 * @desc Battle HUDを表示状態にします。
 *
 * @command HideHUD
 * @text Battle HUDを非表示
 * @desc Battle HUDを非表示状態にします。
 *
 * @command ToggleHUD
 * @text Battle HUD表示切替
 * @desc Battle HUDの表示と非表示を切り替えます。
 *
 * @command SetUltimate
 * @text Ultimate値を設定
 * @desc HUD用Ultimateの現在値と最大値を設定します。
 *
 * @arg value
 * @text 現在値
 * @type number
 * @min 0
 * @default 0
 *
 * @arg max
 * @text 最大値
 * @type number
 * @min 1
 * @default 100
 *
 * @command SelectSkill
 * @text 選択中スキルを設定
 * @desc HUDで選択表示するスキル番号を設定します。0で選択解除、1～5で選択します。
 *
 * @arg index
 * @text スキル番号
 * @type number
 * @min 0
 * @max 5
 * @default 0
 *
 * @command SetGodDisplay
 * @text 指輪の神表示を設定
 * @desc 表示名と、専用フォルダ内の画像ファイル名を設定します。画像名は拡張子なしです。
 *
 * @arg label
 * @text 表示名
 * @type string
 * @default GOD
 *
 * @arg iconName
 * @text 画像ファイル名
 * @type string
 * @default
 *
 * @help
 * ProjectR_BattleHUD.js
 *
 * Scene_Map上に、1920×1080を基準とするProjectR専用戦闘HUDを
 * 表示します。実際の画面サイズに合わせ、X/Yを個別に拡大縮小します。
 *
 * 公開API:
 *   ProjectRBattleHUD.show()
 *   ProjectRBattleHUD.hide()
 *   ProjectRBattleHUD.toggle()
 *   ProjectRBattleHUD.setUltimate(value, max)
 *   ProjectRBattleHUD.selectSkill(index) // 0～4、-1で解除
 *   ProjectRBattleHUD.setGodDisplay(label, iconName)
 *   ProjectRBattleHUD.setGodImage(imageName)
 *   ProjectRBattleHUD.loadBitmap(filename)
 *
 * アクター・武器・スキルのメモ欄に、次のタグを設定できます。
 *   <BattleHudImage:player_yuki>
 * 画像は、プラグインパラメータ「画像フォルダ」で指定した場所から読み込みます。
 * タグには拡張子「.png」を書いても書かなくても構いません。
 *
 * Ultimateのゲーム仕様はこのプラグインでは追加しません。変数または
 * setUltimateを通して、確定済みのゲーム側データを接続してください。
 * Q/R/X/C/VおよびUltimateのRは表示だけで、入力処理は追加しません。
 *
 * ---- Phase 5A: カード戦闘HUD（薄い表示アダプタ） ----
 * ProjectRCardDeck.isCardBattleActive() の間だけ、次の表示に切り替わります。
 * HUDは状態を持たず、毎回 実行中のAPIから読むだけです（セーブ項目は追加しません）。
 *   ・5枠 = 手札 hand[0..4]。キー表示は 1～5（入力処理は ProjectR_CardBattleInput のまま）。
 *     名前/アイコンは、Skillのnote <ProjectRCard: cardId>、無ければ内蔵の既定名から解決します。
 *     使用不可（所持・指輪条件）のカードは暗く表示。空き枠は「—」。
 *   ・山札/捨て札/Cooldown山の枚数（CardDeckの戦闘状態から読むだけ）。
 *   ・Divine HP / 崩壊 / 復帰残り秒: ProjectRGodSummonManager から読むだけ。
 *   ・Ultimate Gauge: ProjectRUltimateGauge から読むだけ。
 *       満タンでない=通常 / 満タン＋神が顕現中=READY（キー表示）/
 *       満タン＋神が崩壊中=GAUGE FULL / UNAVAILABLE（キーを押せるようには見せない）。
 *   ・Ultimateキー表示: ProjectRUltimateActivation.getInputBinding() の設定値。
 *   ・Hermes/Apollo Ultimate実行中は ULTIMATE ACTIVE。
 *   ・Ultimate神が無い戦闘では、Ultimate区画とDivine HP区画を隠します（偽の0/100は出しません）。
 * カード戦闘以外では従来のHotbar（Q/R/X/C/V）とUltimate表示のままです。
 *
 * 差し替え口（実行時のみ・セーブしません。将来の画像もここから）:
 *   ProjectRBattleHUD.setCardPresentation(cardId, { name, iconIndex, imageName })
 *   ProjectRBattleHUD.setGodPresentation(godId, { name, imageName })
 *   ProjectRBattleHUD.getViewModel()   // HUDが今描いている値（Console確認用）
 */

(() => {
    "use strict";

    const pluginName = "ProjectR_BattleHUD";
    const parameters = PluginManager.parameters(pluginName);
    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;
    const FOOTER_TOP = 650;
    const SKILL_KEYS = ["Q", "R", "X", "C", "V"];
    // Phase 5A: カード戦闘中は同じ5枠が手札hand[0..4]になり、キー表示は1～5になる。
    const CARD_KEYS = ["1", "2", "3", "4", "5"];
    const SKILL_COUNT = SKILL_KEYS.length;
    const SKILL_SLOT_WIDTH = 172;
    const SKILL_SLOT_HEIGHT = 140;
    const SKILL_SLOT_SKEW = 46;
    const SKILL_SLOT_GAP = 18;
    const SKILL_HUD_Y = 915;

    const COLORS = Object.freeze({
        footer: 0x03070c,
        panel: 0x0d1622,
        panelAlt: 0x142234,
        panelLine: 0x5f728c,
        muted: 0x7e8ba0,
        text: 0xdce6f4,
        cyan: 0x59d7ff,
        cyanDark: 0x123a4a,
        gold: 0xf4c650,
        goldDark: 0x392c0d,
        red: 0xef5965,
        green: 0x53c58a,
        purple: 0xa970e8,
        black: 0x000000,
        white: 0xffffff
    });

    const debugPreview = String(parameters.DebugPreview || "false") === "true";
    const visibilitySwitchId = Math.max(0, Number(parameters.VisibilitySwitchId || 0));
    const hideDuringMessages = String(parameters.HideDuringMessages || "true") === "true";
    const ultimateVariableId = Math.max(0, Number(parameters.UltimateVariableId || 0));
    const ultimateMaxVariableId = Math.max(0, Number(parameters.UltimateMaxVariableId || 0));
    const initialGodLabel = String(parameters.GodLabel || "GOD");
    const configuredAssetFolder = String(parameters.AssetFolder || "img/projectr_ui/battle/");
    const assetFolder = configuredAssetFolder.endsWith("/") ?
        configuredAssetFolder : `${configuredAssetFolder}/`;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const finiteNumber = (value, fallback = 0) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };
    const roundDisplayNumber = value => Math.round(finiteNumber(value, 0));
    const rgbaHex = color => `#${Number(color).toString(16).padStart(6, "0")}`;

    class ProjectRBattleHUDImageResolver {
        constructor() {
            this._cache = new Map();
        }

        static normalizeImageName(value) {
            let name = String(value || "").trim().replace(/\.png$/i, "");
            name = name.replace(/\\/g, "/");
            if (!name || name.startsWith("/") || /^[A-Za-z]:/.test(name)) return "";
            const parts = name.split("/");
            if (parts.some(part => !part || part === "." || part === "..")) return "";
            return parts.join("/");
        }

        static imageNameFromDatabaseObject(dataObject) {
            if (!dataObject) return "";
            const meta = dataObject.meta;
            if (meta && typeof meta === "object") {
                const key = Object.keys(meta).find(
                    name => name.toLowerCase() === "battlehudimage"
                );
                if (key && typeof meta[key] === "string") {
                    const metaName = this.normalizeImageName(meta[key]);
                    if (metaName) return metaName;
                }
            }
            const match = String(dataObject.note || "").match(
                /<BattleHudImage\s*:\s*([^<>]+?)\s*>/i
            );
            return this.normalizeImageName(match ? match[1] : "");
        }

        playerImageName(data) {
            const actors = typeof $dataActors !== "undefined" ? $dataActors : null;
            const actorId = Math.max(0, Math.trunc(finiteNumber(data?.actorId, 0)));
            return ProjectRBattleHUDImageResolver.imageNameFromDatabaseObject(
                actors?.[actorId]
            );
        }

        godImageName(iconName) {
            return ProjectRBattleHUDImageResolver.normalizeImageName(iconName);
        }

        weaponImageName(data) {
            const weapons = typeof $dataWeapons !== "undefined" ? $dataWeapons : null;
            const weaponId = Math.max(0, Math.trunc(finiteNumber(data?.weaponId, 0)));
            return ProjectRBattleHUDImageResolver.imageNameFromDatabaseObject(
                weapons?.[weaponId]
            );
        }

        skillImageName(data) {
            const skills = typeof $dataSkills !== "undefined" ? $dataSkills : null;
            const skillId = Math.max(0, Math.trunc(finiteNumber(data?.skillId, 0)));
            return ProjectRBattleHUDImageResolver.imageNameFromDatabaseObject(
                skills?.[skillId]
            );
        }

        loadBattleImage(imageName, listener) {
            const name = ProjectRBattleHUDImageResolver.normalizeImageName(imageName);
            const callback = typeof listener === "function" ? listener : () => {};
            if (!name) {
                callback(null);
                return null;
            }

            const cached = this._cache.get(name);
            if (cached) {
                if (cached.status === "loading") {
                    cached.listeners.push(callback);
                } else {
                    callback(cached.bitmap);
                }
                return cached.bitmap;
            }

            const entry = {
                status: "loading",
                bitmap: null,
                listeners: [callback]
            };
            this._cache.set(name, entry);
            const localExists = this.localFileExists(name);
            if (localExists === true) {
                this.startBitmapLoad(name, entry);
            } else if (localExists === false) {
                this.finishLoad(entry, null);
            } else {
                this.preflightBrowserImage(name, entry);
            }
            return entry.bitmap;
        }

        localFileExists(name) {
            if (typeof Utils === "undefined" || typeof Utils.isNwjs !== "function" ||
                !Utils.isNwjs() || typeof require !== "function" ||
                typeof process !== "object") {
                return null;
            }
            try {
                const mainFilename = process.mainModule?.filename;
                if (!mainFilename) return null;
                const fs = require("fs");
                const path = require("path");
                const basePath = path.dirname(mainFilename);
                const folderPath = path.resolve(basePath, assetFolder);
                const filePath = path.resolve(folderPath, `${name}.png`);
                if (!filePath.startsWith(`${folderPath}${path.sep}`)) return false;
                return fs.existsSync(filePath) || fs.existsSync(`${filePath}_`);
            } catch (error) {
                return null;
            }
        }

        preflightBrowserImage(name, entry) {
            const encodedName = typeof Utils !== "undefined" &&
                typeof Utils.encodeURI === "function" ? Utils.encodeURI(name) : encodeURI(name);
            const url = `${assetFolder}${encodedName}.png`;
            const encrypted = typeof Utils !== "undefined" &&
                typeof Utils.hasEncryptedImages === "function" && Utils.hasEncryptedImages();
            if (!encrypted && typeof Image === "function") {
                const image = new Image();
                image.onload = () => this.startBitmapLoad(name, entry);
                image.onerror = () => this.finishLoad(entry, null);
                image.src = url;
            } else if (typeof fetch === "function") {
                fetch(encrypted ? `${url}_` : url, { cache: "force-cache" })
                    .then(response => {
                        if (response.ok) {
                            this.startBitmapLoad(name, entry);
                        } else {
                            this.finishLoad(entry, null);
                        }
                    })
                    .catch(() => this.finishLoad(entry, null));
            } else {
                this.finishLoad(entry, null);
            }
        }

        startBitmapLoad(name, entry) {
            if (entry.status !== "loading") return;
            try {
                const bitmap = ImageManager.loadBitmap(assetFolder, name);
                this.finishLoad(entry, bitmap);
            } catch (error) {
                this.finishLoad(entry, null);
            }
        }

        finishLoad(entry, bitmap) {
            if (entry.status !== "loading") return;
            entry.bitmap = bitmap || null;
            entry.status = bitmap ? "ready" : "missing";
            const listeners = entry.listeners.splice(0);
            for (const listener of listeners) listener(entry.bitmap);
        }
    }

    const projectR = window.ProjectR = window.ProjectR || {};
    const BattleHUD = projectR.BattleHUD = projectR.BattleHUD || {};
    window.ProjectRBattleHUD = BattleHUD;

    const makeDefaultState = () => ({
        visible: true,
        selectedSkillIndex: -1,
        ultimateValue: 0,
        ultimateMax: 100,
        ultimateAvailable: false,
        godLabel: initialGodLabel,
        godIconName: ""
    });

    const volatileState = makeDefaultState();

    const ensureStateShape = state => {
        if (typeof state.visible !== "boolean") state.visible = true;
        if (!Number.isInteger(state.selectedSkillIndex)) state.selectedSkillIndex = -1;
        if (!Number.isFinite(Number(state.ultimateValue))) state.ultimateValue = 0;
        if (!(Number(state.ultimateMax) > 0)) state.ultimateMax = 100;
        if (typeof state.ultimateAvailable !== "boolean") state.ultimateAvailable = false;
        if (typeof state.godLabel !== "string") state.godLabel = initialGodLabel;
        if (typeof state.godIconName !== "string") state.godIconName = "";
        return state;
    };

    const battleHudState = () => {
        if (typeof $gameSystem === "undefined" || !$gameSystem) {
            return ensureStateShape(volatileState);
        }
        if (!$gameSystem._projectRBattleHUDState) {
            $gameSystem._projectRBattleHUDState = makeDefaultState();
        }
        return ensureStateShape($gameSystem._projectRBattleHUDState);
    };

    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._projectRBattleHUDState = makeDefaultState();
    };

    BattleHUD.show = function() {
        battleHudState().visible = true;
    };

    BattleHUD.hide = function() {
        battleHudState().visible = false;
    };

    BattleHUD.toggle = function() {
        const state = battleHudState();
        state.visible = !state.visible;
        return state.visible;
    };

    BattleHUD.isShown = function() {
        return battleHudState().visible;
    };

    BattleHUD.setUltimate = function(value, max = 100) {
        const state = battleHudState();
        state.ultimateMax = Math.max(1, finiteNumber(max, 100));
        state.ultimateValue = clamp(finiteNumber(value, 0), 0, state.ultimateMax);
        state.ultimateAvailable = true;
    };

    BattleHUD.clearUltimate = function() {
        const state = battleHudState();
        state.ultimateValue = 0;
        state.ultimateMax = 100;
        state.ultimateAvailable = false;
    };

    BattleHUD.selectSkill = function(index) {
        const parsed = Math.trunc(finiteNumber(index, -1));
        battleHudState().selectedSkillIndex = parsed >= 0 && parsed < SKILL_COUNT ?
            parsed : -1;
    };

    BattleHUD.setGodDisplay = function(label, iconName = "") {
        const state = battleHudState();
        state.godLabel = String(label || initialGodLabel);
        state.godIconName = String(iconName || "");
    };

    BattleHUD.setGodImage = function(imageName) {
        battleHudState().godIconName = String(imageName || "");
    };

    BattleHUD.loadBitmap = function(filename) {
        return ImageManager.loadBitmap(assetFolder, String(filename || ""));
    };

    // ---- Phase 5A: 表示名・アイコンの差し替え口（実行時のみ。セーブしない） ----
    // CardDeckCoreのカード定義には名前もアイコンも無いので、HUD側で次の順に解決する:
    //   setCardPresentation > Skillのnote <ProjectRCard: cardId> > 下の既定 > cardIdから生成
    const CARD_PRESENTATION_DEFAULTS = Object.freeze({
        hermes_swift_movement: Object.freeze({ name: "高速移動" }),
        hermes_reed_flute_sleep: Object.freeze({ name: "葦笛睡眠" }),
        hermes_perception_obscure: Object.freeze({ name: "認識阻害" }),
        hermes_sword_attack: Object.freeze({ name: "ヘルメース剣術" }),
        apollo_golden_arrow: Object.freeze({ name: "黄金の弓矢" }),
        apollo_plague_attack: Object.freeze({ name: "アポロン病攻撃" }),
        apollo_lyre_calm: Object.freeze({ name: "リラの支援" })
    });
    const GOD_PRESENTATION_DEFAULTS = Object.freeze({
        apollo: Object.freeze({ name: "APOLLO" }),
        hermes: Object.freeze({ name: "HERMES" }),
        janus: Object.freeze({ name: "JANUS" }),
        themis: Object.freeze({ name: "THEMIS" }),
        athena: Object.freeze({ name: "ATHENA" })
    });
    const cardPresentationOverrides = new Map();
    const godPresentationOverrides = new Map();
    const skillCardIndexCache = new WeakMap();

    const sanitizePresentation = source => {
        const result = {};
        if (source && typeof source.name === "string" && source.name) result.name = source.name;
        if (source && Number.isFinite(Number(source.iconIndex))) {
            result.iconIndex = Math.max(0, Math.trunc(Number(source.iconIndex)));
        }
        if (source && typeof source.imageName === "string") result.imageName = source.imageName;
        return result;
    };

    BattleHUD.setCardPresentation = function(cardId, presentation) {
        const id = String(cardId || "");
        if (!id) return false;
        cardPresentationOverrides.set(id, sanitizePresentation(presentation));
        return true;
    };

    BattleHUD.clearCardPresentation = function(cardId) {
        return cardPresentationOverrides.delete(String(cardId || ""));
    };

    BattleHUD.setGodPresentation = function(godId, presentation) {
        const id = String(godId || "");
        if (!id) return false;
        godPresentationOverrides.set(id, sanitizePresentation(presentation));
        return true;
    };

    BattleHUD.clearGodPresentation = function(godId) {
        return godPresentationOverrides.delete(String(godId || ""));
    };

    // Skillのnote <ProjectRCard: cardId> を持つSkillを、$dataSkills配列ごとに一度だけ索引化する。
    const skillForCard = cardId => {
        if (typeof $dataSkills === "undefined" || !Array.isArray($dataSkills)) return null;
        let index = skillCardIndexCache.get($dataSkills);
        if (!index) {
            index = new Map();
            for (const skill of $dataSkills) {
                const match = skill && String(skill.note || "").match(/<ProjectRCard\s*:\s*([^<>\s]+)\s*>/);
                if (match && !index.has(match[1])) index.set(match[1], skill);
            }
            skillCardIndexCache.set($dataSkills, index);
        }
        return index.get(cardId) || null;
    };

    const humanizeId = id => String(id || "").replace(/^[a-z0-9]+_/i, "").replace(/_/g, " ").toUpperCase();

    const resolveCardPresentation = cardId => {
        const override = cardPresentationOverrides.get(cardId) || {};
        const skill = skillForCard(cardId);
        const fallback = CARD_PRESENTATION_DEFAULTS[cardId] || {};
        return {
            name: override.name || skill?.name || fallback.name || humanizeId(cardId) || "CARD",
            iconIndex: override.iconIndex ?? skill?.iconIndex ?? fallback.iconIndex ?? 0,
            imageName: override.imageName || "",
            skillId: skill?.id || 0
        };
    };

    const resolveGodPresentation = godId => {
        const override = godPresentationOverrides.get(godId) || {};
        const fallback = GOD_PRESENTATION_DEFAULTS[godId] || {};
        return {
            name: override.name || fallback.name || String(godId || "").toUpperCase() || initialGodLabel,
            imageName: override.imageName || ""
        };
    };

    // 実数をそのまま見せる。整数なら小数なし、そうでなければ小数1桁。
    const formatNumber = value => {
        const number = finiteNumber(value, 0);
        return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
    };

    PluginManager.registerCommand(pluginName, "ShowHUD", () => BattleHUD.show());
    PluginManager.registerCommand(pluginName, "HideHUD", () => BattleHUD.hide());
    PluginManager.registerCommand(pluginName, "ToggleHUD", () => BattleHUD.toggle());
    PluginManager.registerCommand(pluginName, "SetUltimate", args => {
        BattleHUD.setUltimate(args.value, args.max);
    });
    PluginManager.registerCommand(pluginName, "SelectSkill", args => {
        const displayedIndex = Math.trunc(finiteNumber(args.index, 0));
        BattleHUD.selectSkill(displayedIndex > 0 ? displayedIndex - 1 : -1);
    });
    PluginManager.registerCommand(pluginName, "SetGodDisplay", args => {
        BattleHUD.setGodDisplay(args.label, args.iconName);
    });

    const mainFontFace = () => {
        if (typeof $gameSystem !== "undefined" && $gameSystem &&
            typeof $gameSystem.mainFontFace === "function") {
            return $gameSystem.mainFontFace();
        }
        return "sans-serif";
    };

    class Sprite_ProjectRText extends Sprite {
        initialize(width, height, options = {}) {
            super.initialize(new Bitmap(width, height));
            this._options = Object.assign({
                fontSize: 22,
                color: rgbaHex(COLORS.text),
                align: "left",
                bold: false,
                outlineColor: "rgba(0, 0, 0, 0.75)",
                outlineWidth: 4
            }, options);
            this._signature = "";
        }

        setText(text, overrides = {}) {
            const options = Object.assign({}, this._options, overrides);
            const normalizedText = String(text ?? "");
            const signature = JSON.stringify([normalizedText, options]);
            if (signature === this._signature) return;
            this._signature = signature;

            const bitmap = this.bitmap;
            bitmap.clear();
            bitmap.fontFace = mainFontFace();
            bitmap.fontSize = options.fontSize;
            bitmap.fontBold = !!options.bold;
            bitmap.textColor = options.color;
            bitmap.outlineColor = options.outlineColor;
            bitmap.outlineWidth = options.outlineWidth;
            bitmap.drawText(
                normalizedText,
                0,
                0,
                bitmap.width,
                bitmap.height,
                options.align
            );
        }
    }

    class Sprite_ProjectRIcon extends Sprite {
        initialize(size = 48) {
            super.initialize(ImageManager.loadSystem("IconSet"));
            this.anchor.set(0.5, 0.5);
            this._displaySize = size;
            this._iconIndex = -1;
            const iconWidth = ImageManager.iconWidth || 32;
            const iconHeight = ImageManager.iconHeight || 32;
            this.scale.set(size / iconWidth, size / iconHeight);
            this.setIconIndex(0);
        }

        setIconIndex(iconIndex) {
            const index = Math.max(0, Math.trunc(finiteNumber(iconIndex, 0)));
            if (index === this._iconIndex) return;
            this._iconIndex = index;
            const width = ImageManager.iconWidth || 32;
            const height = ImageManager.iconHeight || 32;
            const columns = 16;
            this.setFrame(index % columns * width, Math.floor(index / columns) * height, width, height);
        }
    }

    const drawClosedPolygon = (graphics, points, fillColor, fillAlpha, lineColor, lineWidth = 0, lineAlpha = 1) => {
        graphics.lineStyle(lineWidth, lineColor, lineAlpha);
        graphics.beginFill(fillColor, fillAlpha);
        graphics.drawPolygon(points);
        graphics.endFill();
    };

    const halfCirclePoints = (centerX, centerY, radius, startAngle, endAngle, segments = 24) => {
        const points = [];
        for (let index = 0; index <= segments; index++) {
            const ratio = index / segments;
            const angle = startAngle + (endAngle - startAngle) * ratio;
            points.push(centerX + Math.cos(angle) * radius);
            points.push(centerY + Math.sin(angle) * radius);
        }
        return points;
    };

    const ellipsePoint = (centerX, centerY, radiusX, radiusY, startAngle, endAngle, progress) => {
        const angle = startAngle + (endAngle - startAngle) * progress;
        return {
            x: centerX + Math.cos(angle) * radiusX,
            y: centerY + Math.sin(angle) * radiusY,
            angle
        };
    };

    const drawEllipseSegment = (graphics, centerX, centerY, radiusX, radiusY, startAngle, endAngle, progress, steps = 72) => {
        const clampedProgress = clamp(progress, 0, 1);
        const segmentCount = Math.max(1, Math.ceil(steps * clampedProgress));
        const first = ellipsePoint(centerX, centerY, radiusX, radiusY, startAngle, endAngle, 0);
        graphics.moveTo(first.x, first.y);
        for (let index = 1; index <= segmentCount; index++) {
            const point = ellipsePoint(
                centerX,
                centerY,
                radiusX,
                radiusY,
                startAngle,
                endAngle,
                clampedProgress * index / segmentCount
            );
            graphics.lineTo(point.x, point.y);
        }
    };

    const fitBattleImage = (
        sprite,
        bitmap,
        targetWidth,
        targetHeight,
        fitMode,
        isCurrent,
        onApplied
    ) => {
        if (!bitmap) return;
        bitmap.addLoadListener(() => {
            if (!isCurrent() || !bitmap.width || !bitmap.height) return;
            sprite.bitmap = bitmap;
            sprite.setFrame(0, 0, bitmap.width, bitmap.height);
            const calculateScale = fitMode === "cover" ? Math.max : Math.min;
            const scale = calculateScale(
                targetWidth / bitmap.width,
                targetHeight / bitmap.height
            );
            sprite.scale.set(scale, scale);
            sprite.visible = true;
            if (typeof onApplied === "function") onApplied();
        });
    };

    class ProjectRBattleHUDDataAdapter {
        constructor(scene) {
            this._scene = scene;
            this._cooldownTrackers = new Map();
        }

        actor() {
            if (typeof $gameParty === "undefined" || !$gameParty) return null;
            return $gameParty.leader();
        }

        player() {
            const actor = this.actor();
            if (debugPreview) {
                return {
                    actorId: actor && typeof actor.actorId === "function" ? actor.actorId() : 0,
                    name: actor ? actor.name() : "PLAYER",
                    hp: 850,
                    maxHp: 1000,
                    faceName: actor ? actor.faceName() : "",
                    faceIndex: actor ? actor.faceIndex() : 0
                };
            }
            return {
                actorId: actor && typeof actor.actorId === "function" ? actor.actorId() : 0,
                name: actor ? actor.name() : "PLAYER",
                hp: actor ? actor.hp : 0,
                maxHp: actor ? Math.max(1, actor.mhp) : 1,
                faceName: actor ? actor.faceName() : "",
                faceIndex: actor ? actor.faceIndex() : 0
            };
        }

        // ---- Phase 5A: 実行中システムの読み取り専用ビュー。HUDは状態を所有しない ----
        // プラグイン読込順がCardDeckCoreより前なので、APIは毎回window経由で遅延参照する。
        api(name) {
            const target = window[name];
            return target && typeof target === "object" ? target : null;
        }

        cardBattleActive() {
            try {
                return !!this.api("ProjectRCardDeck")?.isCardBattleActive?.();
            } catch (error) {
                return false;
            }
        }

        // getBattleState()は深いコピーを返すので、同一frame内では一度だけ呼ぶ。
        battleSnapshot() {
            if (!this.cardBattleActive()) {
                this._snapshot = null;
                return null;
            }
            const frame = typeof Graphics !== "undefined" ? Graphics.frameCount : undefined;
            if (this._snapshot && frame !== undefined && this._snapshotFrame === frame) {
                return this._snapshot;
            }
            let snapshot = null;
            try {
                snapshot = this.api("ProjectRCardDeck").getBattleState() || null;
            } catch (error) {
                snapshot = null;
            }
            this._snapshot = snapshot;
            this._snapshotFrame = frame;
            return snapshot;
        }

        invalidate() {
            this._snapshot = null;
            this._snapshotFrame = undefined;
            this._usableCache = null;
        }

        // 所持・指輪条件による「使用不可」。Core側のcanUseCardを15frameに1回だけ引く。
        cardUsable(cardId) {
            const deck = this.api("ProjectRCardDeck");
            if (!deck || typeof deck.canUseCard !== "function") return true;
            const frame = typeof Graphics !== "undefined" ? Graphics.frameCount : undefined;
            let cache = this._usableCache;
            if (!cache || frame === undefined || frame - cache.frame >= 15 || frame < cache.frame) {
                cache = this._usableCache = { frame, values: new Map() };
            }
            if (!cache.values.has(cardId)) {
                let usable = true;
                try {
                    usable = !!deck.canUseCard(cardId);
                } catch (error) {
                    usable = false;
                }
                cache.values.set(cardId, usable);
            }
            return cache.values.get(cardId);
        }

        cardHand() {
            const hand = this.battleSnapshot()?.hand || [];
            return CARD_KEYS.map((key, index) => {
                const card = hand[index];
                if (!card) {
                    return {
                        mode: "card", key, cardId: "", instanceId: "", skillId: 0, name: "",
                        iconIndex: 0, imageName: "", available: false, disabled: true,
                        selected: false, cooldown: { active: false, remaining: 0, total: 0 }
                    };
                }
                const presentation = resolveCardPresentation(card.cardId);
                return {
                    mode: "card", key, cardId: card.cardId, instanceId: card.instanceId,
                    skillId: presentation.skillId, name: presentation.name,
                    iconIndex: presentation.iconIndex, imageName: presentation.imageName,
                    available: true, disabled: !this.cardUsable(card.cardId), selected: false,
                    // 手札のカードはCooldown中にならない（使用後は即補充され、使ったカードはCooldown山へ移る）。
                    cooldown: { active: false, remaining: 0, total: 0 }
                };
            });
        }

        cardCounts() {
            const state = this.battleSnapshot();
            if (!state) return null;
            return {
                draw: state.drawPile?.length || 0,
                discard: state.discardPile?.length || 0,
                cooldown: state.cooldownPile?.length || 0
            };
        }

        divine() {
            if (!this.cardBattleActive()) return null;
            const manager = this.api("ProjectRGodSummonManager");
            if (!manager || !manager.hasPersistentUltimateBattleState?.()) return null;
            const info = manager.getPersistentUltimateBattleState?.();
            if (!info) return null;
            const presentation = resolveGodPresentation(info.godId);
            const maxHp = Math.max(0, finiteNumber(info.maxDivineHp, 0));
            const hp = clamp(finiteNumber(info.divineHp, 0), 0, maxHp);
            return {
                godId: info.godId,
                name: presentation.name,
                imageName: presentation.imageName,
                status: info.status,
                collapsed: info.status === "collapsed",
                hp,
                maxHp,
                rate: maxHp > 0 ? hp / maxHp : 0,
                recoverySeconds: Math.max(0, finiteNumber(info.recoveryRemainingSeconds, 0))
            };
        }

        ultimateExecuting() {
            try {
                return !!(this.api("ProjectRHermesUltimate")?.isHermesUltimateActive?.() ||
                    this.api("ProjectRApolloUltimate")?.isApolloUltimateActive?.());
            } catch (error) {
                return false;
            }
        }

        // Ultimateの表示用ビュー。full（満タン）とready（満タンかつ神が顕現中）は別状態。
        cardUltimate() {
            const gauge = this.api("ProjectRUltimateGauge");
            if (!gauge || !gauge.hasUltimateGaugeState?.()) {
                return {
                    mode: "card", available: false, state: "none", value: 0, max: 0, progress: 0,
                    full: false, ready: false, key: "", keyActive: false, executing: false
                };
            }
            const value = Math.max(0, finiteNumber(gauge.getUltimateGauge(), 0));
            const max = Math.max(0, finiteNumber(gauge.getUltimateGaugeMax(), 0));
            const full = !!gauge.isUltimateGaugeFull();
            const ready = !!gauge.isUltimateReady();
            const binding = this.api("ProjectRUltimateActivation")?.getInputBinding?.() || null;
            return {
                mode: "card",
                available: true,
                state: ready ? "ready" : full ? "fullUnavailable" : "charging",
                value,
                max,
                progress: max > 0 ? clamp(value / max, 0, 1) : 0,
                full,
                ready,
                key: binding && binding.key ? String(binding.key) : "",
                keyActive: !!binding && binding.active !== false,
                executing: this.ultimateExecuting()
            };
        }

        god() {
            if (this.cardBattleActive()) {
                const manager = this.api("ProjectRGodSummonManager");
                const godId = manager?.hasPersistentUltimateBattleState?.() ?
                    manager.getPersistentUltimateGodId?.() : null;
                if (godId) {
                    const presentation = resolveGodPresentation(godId);
                    return {
                        label: presentation.name,
                        iconName: presentation.imageName,
                        available: !!presentation.imageName
                    };
                }
            }
            const state = battleHudState();
            return {
                label: state.godLabel || initialGodLabel,
                iconName: state.godIconName || "",
                available: !!state.godIconName
            };
        }

        hotbarAssignment(slotName) {
            const actor = this.actor();
            const actorId = actor && typeof actor.actorId === "function" ? actor.actorId() : 0;
            const actorAssignments = actorId && $gameSystem?._actorHotbarData?.[actorId];
            if (actorAssignments?.[slotName]) return actorAssignments[slotName];
            return $gameSystem?._uiSlotData?.[slotName] || null;
        }

        cooldownFor(slotName, slot) {
            if (!slot || !slot._inCooldown) {
                this._cooldownTrackers.delete(slotName);
                return { active: false, remaining: 0, total: 0 };
            }

            const total = Math.max(0, finiteNumber(slot._cooldownTotal || slot._cooldownDuration, 0));
            const totalFrames = Math.max(1, Math.round(total * 60));
            let tracker = this._cooldownTrackers.get(slotName);
            if (!tracker || tracker.slot !== slot || tracker.totalFrames !== totalFrames ||
                Graphics.frameCount < tracker.startedAt) {
                tracker = {
                    slot,
                    totalFrames,
                    startedAt: Graphics.frameCount
                };
                this._cooldownTrackers.set(slotName, tracker);
            }
            const elapsedFrames = Math.max(0, Graphics.frameCount - tracker.startedAt);
            const remainingFrames = Math.max(0, tracker.totalFrames - elapsedFrames);
            return {
                active: true,
                remaining: remainingFrames / 60,
                total
            };
        }

        hotbarSkills() {
            const result = [];
            const hotbar = this._scene?._skillUI;
            if (!(hotbar?._slots instanceof Map) || hotbar._slots.size === 0) return result;
            const actor = this.actor();
            const selectedTarget = hotbar._gamepadCursor?._targetSlot || null;

            for (const [slotName, slot] of hotbar._slots.entries()) {
                if (result.length >= SKILL_COUNT) break;
                const assignment = this.hotbarAssignment(slotName);
                const skill = assignment?.type === "skill" ? $dataSkills?.[assignment.id] : null;
                const cooldown = this.cooldownFor(slotName, slot);
                result.push({
                    slotName,
                    skillId: skill?.id || 0,
                    name: skill?.name || "",
                    iconIndex: skill?.iconIndex || 0,
                    available: !!skill,
                    disabled: !skill || (actor && typeof actor.canUse === "function" && !actor.canUse(skill)),
                    selectedByHotbar: selectedTarget === slot,
                    cooldown
                });
            }
            return result;
        }

        skills() {
            if (debugPreview) {
                return SKILL_KEYS.map((key, index) => ({
                    key,
                    skillId: 0,
                    name: `SKILL ${index + 1}`,
                    iconIndex: 64 + index,
                    available: true,
                    disabled: false,
                    selected: index === 2,
                    cooldown: { active: false, remaining: 0, total: 0 }
                }));
            }

            // カード戦闘中は5枠が手札hand[0..4]。それ以外は従来のHendrix Hotbar表示。
            if (this.cardBattleActive()) return this.cardHand();

            const state = battleHudState();
            const skills = this.hotbarSkills();
            return SKILL_KEYS.map((key, index) => {
                const skill = skills[index] || {
                    skillId: 0,
                    name: "",
                    iconIndex: 0,
                    available: false,
                    disabled: true,
                    selectedByHotbar: false,
                    cooldown: { active: false, remaining: 0, total: 0 }
                };
                return Object.assign({}, skill, {
                    key,
                    selected: state.selectedSkillIndex === index ||
                        (state.selectedSkillIndex < 0 && !!skill.selectedByHotbar)
                });
            });
        }

        ultimate() {
            if (debugPreview) {
                return { mode: "legacy", value: 72, max: 100, progress: 0.72, available: true };
            }

            // カード戦闘中はProjectR_UltimateGaugeが唯一の情報源。変数/手動値は使わない。
            if (this.cardBattleActive()) return this.cardUltimate();

            let value;
            let max;
            let available = false;
            if (ultimateVariableId > 0 && typeof $gameVariables !== "undefined" && $gameVariables) {
                value = finiteNumber($gameVariables.value(ultimateVariableId), 0);
                max = ultimateMaxVariableId > 0 ?
                    finiteNumber($gameVariables.value(ultimateMaxVariableId), 100) : 100;
                available = true;
            } else {
                const state = battleHudState();
                value = finiteNumber(state.ultimateValue, 0);
                max = finiteNumber(state.ultimateMax, 100);
                available = !!state.ultimateAvailable;
            }
            max = Math.max(1, max);
            value = clamp(value, 0, max);
            return { mode: "legacy", value, max, progress: value / max, available };
        }

        weapon() {
            if (debugPreview) {
                const previewWeapon = $dataWeapons?.[51] || null;
                return {
                    weaponId: previewWeapon?.id || 0,
                    name: previewWeapon?.name || "SIDEARM",
                    iconIndex: previewWeapon?.iconIndex || 104,
                    isGun: true,
                    currentAmmo: 30,
                    reserveAmmo: 120,
                    capacity: 30
                };
            }

            const actor = this.actor();
            const weapon = actor?.equips?.().find(item => item && DataManager.isWeapon(item)) || null;
            const result = {
                weaponId: weapon?.id || 0,
                name: weapon?.name || "NO WEAPON",
                iconIndex: weapon?.iconIndex || 0,
                isGun: false,
                currentAmmo: 0,
                reserveAmmo: 0,
                capacity: 0
            };
            if (!weapon || !$gameSystem || typeof $gameSystem.getGunData !== "function" ||
                !$gameSystem._gunData) {
                return result;
            }

            const gunData = $gameSystem.getGunData(weapon.id);
            if (!gunData) return result;
            result.isGun = true;
            result.currentAmmo = Math.max(0, finiteNumber(gunData.currentAmmo, 0));
            result.capacity = Math.max(0, finiteNumber(gunData.maxCapacity, 0));
            result.reserveAmmo = gunData.ammoItem && $gameParty ?
                Math.max(0, $gameParty.numItems(gunData.ammoItem)) : 0;
            return result;
        }

        statuses() {
            if (debugPreview) {
                return [
                    { label: "ATK↑", kind: "buff", iconIndex: 0 },
                    { label: "SPD↑", kind: "buff", iconIndex: 0 },
                    { label: "BLEED", kind: "debuff", iconIndex: 0 },
                    { label: "SLOW", kind: "state", iconIndex: 0 }
                ];
            }

            const actor = this.actor();
            if (!actor) return [];
            const result = [];
            const buffs = Array.isArray(actor._buffs) ? actor._buffs : [];
            for (let paramId = 0; paramId < buffs.length && result.length < 4; paramId++) {
                const level = finiteNumber(buffs[paramId], 0);
                if (level === 0) continue;
                result.push({
                    label: `${TextManager.param(paramId)}${level > 0 ? "↑" : "↓"}`,
                    kind: level > 0 ? "buff" : "debuff",
                    iconIndex: typeof actor.buffIconIndex === "function" ?
                        actor.buffIconIndex(level, paramId) : 0
                });
            }

            const states = typeof actor.states === "function" ? actor.states() : [];
            for (const state of states) {
                if (!state || !state.name || result.length >= 4) continue;
                const typeMatch = String(state.note || "").match(
                    /<ProjectRBattleHUDType:\s*(buff|debuff|state)\s*>/i
                );
                result.push({
                    label: state.name,
                    kind: typeMatch ? typeMatch[1].toLowerCase() : "state",
                    iconIndex: state.iconIndex || 0
                });
            }
            return result;
        }

        playerScreenPosition() {
            if (typeof $gamePlayer === "undefined" || !$gamePlayer) return null;
            return { x: $gamePlayer.screenX(), y: $gamePlayer.screenY() };
        }

        shouldShow() {
            if (!battleHudState().visible) return false;
            // カード戦闘中は敵の画面内判定に関係なく表示する。それ以外は従来のCombatPresenceに従う。
            const combatPresence = window.ProjectRCombatPresence;
            if (!this.cardBattleActive() && combatPresence &&
                typeof combatPresence.isCombatActive === "function" &&
                !combatPresence.isCombatActive()) {
                return false;
            }
            if (visibilitySwitchId > 0 && (!$gameSwitches || !$gameSwitches.value(visibilitySwitchId))) {
                return false;
            }
            const dialogue = projectR.FullscreenDialogue;
            if (dialogue && typeof dialogue.isActive === "function" && dialogue.isActive()) {
                return false;
            }
            if (hideDuringMessages && typeof $gameMessage !== "undefined" &&
                $gameMessage && $gameMessage.isBusy()) {
                return false;
            }
            return true;
        }
    }

    class Sprite_ProjectRPlayerHUD extends Sprite {
        initialize(adapter, imageResolver) {
            super.initialize();
            this._adapter = adapter;
            this._imageResolver = imageResolver;
            this._lastSignature = "";
            this._lastFaceSignature = "";
            this._lastGodIconName = null;
            this._faceRequestKey = "";
            this._godRequestKey = "";
            this.x = 36;
            this.y = 805;
            this.createBackground();
            this.createPortraits();
            this.createTexts();
        }

        createBackground() {
            this._panelGraphics = new PIXI.Graphics();
            drawClosedPolygon(
                this._panelGraphics,
                [82, 65, 260, 65, 286, 92, 252, 152, 82, 152],
                COLORS.panel,
                0.92,
                COLORS.panelLine,
                2,
                0.75
            );
            this.addChild(this._panelGraphics);

            this._halvesGraphics = new PIXI.Graphics();
            drawClosedPolygon(
                this._halvesGraphics,
                halfCirclePoints(94, 100, 72, Math.PI * 0.75, Math.PI * 1.75),
                0x203249,
                1,
                COLORS.panelLine,
                0
            );
            drawClosedPolygon(
                this._halvesGraphics,
                halfCirclePoints(94, 100, 72, Math.PI * 1.75, Math.PI * 2.75),
                0x282313,
                1,
                COLORS.panelLine,
                0
            );
            this.addChild(this._halvesGraphics);

            this._ringGraphics = new PIXI.Graphics();
            this.addChild(this._ringGraphics);

            this._dividerGraphics = new PIXI.Graphics();
            this._dividerGraphics.lineStyle(4, COLORS.gold, 1);
            this._dividerGraphics.moveTo(38, 156);
            this._dividerGraphics.lineTo(150, 44);
            this.addChild(this._dividerGraphics);
        }

        createPortraits() {
            this._faceSprite = new Sprite();
            this._faceSprite.anchor.set(0.5, 0.5);
            this._faceSprite.x = 94;
            this._faceSprite.y = 100;
            this._faceMask = new PIXI.Graphics();
            this._faceMask.beginFill(COLORS.white, 1);
            this._faceMask.drawPolygon(
                halfCirclePoints(94, 100, 70, Math.PI * 0.75, Math.PI * 1.75)
            );
            this._faceMask.endFill();
            this.addChild(this._faceSprite);
            this.addChild(this._faceMask);
            this._faceSprite.mask = this._faceMask;

            this._godSprite = new Sprite();
            this._godSprite.anchor.set(0.5, 0.5);
            this._godSprite.x = 94;
            this._godSprite.y = 100;
            this._godMask = new PIXI.Graphics();
            this._godMask.beginFill(COLORS.white, 1);
            this._godMask.drawPolygon(
                halfCirclePoints(94, 100, 70, Math.PI * 1.75, Math.PI * 2.75)
            );
            this._godMask.endFill();
            this.addChild(this._godSprite);
            this.addChild(this._godMask);
            this._godSprite.mask = this._godMask;

            this._portraitFrameGraphics = new PIXI.Graphics();
            this._portraitFrameGraphics.lineStyle(4, COLORS.gold, 1);
            this._portraitFrameGraphics.moveTo(38, 156);
            this._portraitFrameGraphics.lineTo(150, 44);
            this.addChild(this._portraitFrameGraphics);
        }

        createTexts() {
            this._playerLabel = new Sprite_ProjectRText(94, 34, {
                fontSize: 22,
                bold: true,
                align: "center"
            });
            this._playerLabel.x = 20;
            this._playerLabel.y = 42;
            this._playerLabel.setText("PLAYER");
            this.addChild(this._playerLabel);

            this._godLabel = new Sprite_ProjectRText(90, 32, {
                fontSize: 20,
                bold: true,
                color: rgbaHex(COLORS.gold),
                align: "center"
            });
            this._godLabel.x = 77;
            this._godLabel.y = 117;
            this.addChild(this._godLabel);

            this._nameText = new Sprite_ProjectRText(160, 32, {
                fontSize: 20,
                bold: true
            });
            this._nameText.x = 176;
            this._nameText.y = 68;
            this.addChild(this._nameText);

            this._hpCurrentText = new Sprite_ProjectRText(150, 46, {
                fontSize: 34,
                bold: true
            });
            this._hpCurrentText.x = 176;
            this._hpCurrentText.y = 91;
            this.addChild(this._hpCurrentText);

            this._hpMaxText = new Sprite_ProjectRText(150, 30, {
                fontSize: 16,
                color: rgbaHex(COLORS.muted)
            });
            this._hpMaxText.x = 176;
            this._hpMaxText.y = 128;
            this.addChild(this._hpMaxText);
        }

        refreshFace(data, imageName) {
            const signature = JSON.stringify([
                data.actorId,
                imageName,
                data.faceName,
                data.faceIndex
            ]);
            if (signature === this._lastFaceSignature) return;
            this._lastFaceSignature = signature;
            this._faceRequestKey = signature;
            this.applyFaceFallback(data);
            if (!imageName) return;
            this._imageResolver.loadBattleImage(imageName, bitmap => {
                if (!bitmap || this._faceRequestKey !== signature) return;
                fitBattleImage(
                    this._faceSprite,
                    bitmap,
                    144,
                    144,
                    "cover",
                    () => this._faceRequestKey === signature
                );
            });
        }

        applyFaceFallback(data) {
            if (!data.faceName) {
                this._faceSprite.visible = false;
                this._faceSprite.bitmap = null;
                return;
            }
            const bitmap = ImageManager.loadFace(data.faceName);
            this._faceSprite.bitmap = bitmap;
            this._faceSprite.visible = true;
            const faceWidth = ImageManager.faceWidth || 144;
            const faceHeight = ImageManager.faceHeight || 144;
            const index = Math.max(0, Math.trunc(data.faceIndex));
            this._faceSprite.setFrame(
                index % 4 * faceWidth,
                Math.floor(index / 4) * faceHeight,
                faceWidth,
                faceHeight
            );
            this._faceSprite.scale.set(144 / faceWidth, 144 / faceHeight);
        }

        refreshGod(data, imageName) {
            this._godLabel.setText(data.label || initialGodLabel);
            if (imageName === this._lastGodIconName) return;
            this._lastGodIconName = imageName;
            this._godRequestKey = imageName;
            this._godSprite.visible = false;
            this._godSprite.bitmap = null;
            if (!imageName) return;
            this._imageResolver.loadBattleImage(imageName, bitmap => {
                if (!bitmap || this._godRequestKey !== imageName) return;
                fitBattleImage(
                    this._godSprite,
                    bitmap,
                    144,
                    144,
                    "cover",
                    () => this._godRequestKey === imageName
                );
            });
        }

        refreshRing(hp, maxHp) {
            const progress = clamp(maxHp > 0 ? hp / maxHp : 0, 0, 1);
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + Math.PI * 2 * progress;
            this._ringGraphics.clear();
            this._ringGraphics.lineStyle(16, 0x344257, 1);
            this._ringGraphics.arc(94, 100, 82, 0, Math.PI * 2);
            if (progress > 0) {
                this._ringGraphics.lineStyle(16, COLORS.red, 1);
                this._ringGraphics.arc(94, 100, 82, startAngle, endAngle);
                const endpoint = {
                    x: 94 + Math.cos(endAngle) * 82,
                    y: 100 + Math.sin(endAngle) * 82
                };
                this._ringGraphics.beginFill(COLORS.red, 1);
                this._ringGraphics.drawCircle(endpoint.x, endpoint.y, 8);
                this._ringGraphics.endFill();
            }
            this._ringGraphics.lineStyle(3, 0xa9bdd6, 1);
            this._ringGraphics.arc(94, 100, 72, 0, Math.PI * 2);
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const player = this._adapter.player();
            const god = this._adapter.god();
            const playerImageName = this._imageResolver.playerImageName(player);
            const godImageName = this._imageResolver.godImageName(god.iconName);
            const signature = JSON.stringify([
                player.actorId,
                player.name,
                player.hp,
                player.maxHp,
                player.faceName,
                player.faceIndex,
                playerImageName,
                god.label,
                godImageName
            ]);
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            const hp = clamp(finiteNumber(player.hp, 0), 0, Math.max(1, player.maxHp));
            const maxHp = Math.max(1, finiteNumber(player.maxHp, 1));
            this.refreshFace(player, playerImageName);
            this.refreshGod(god, godImageName);
            this.refreshRing(hp, maxHp);
            this._nameText.setText(player.name || "PLAYER");
            this._hpCurrentText.setText(roundDisplayNumber(hp));
            this._hpMaxText.setText(`/ ${roundDisplayNumber(maxHp)} HP`);
        }
    }

    class Sprite_ProjectRSkillSlot extends Sprite {
        initialize(index, key, adapter, imageResolver) {
            super.initialize();
            this._index = index;
            this._key = key;
            this._adapter = adapter;
            this._imageResolver = imageResolver;
            this._lastSignature = "";
            this._lastImageSignature = "";
            this._imageRequestKey = "";
            this._usingBattleImage = false;
            this._imageDisplayAllowed = false;
            this._shape = new PIXI.Graphics();
            this.addChild(this._shape);

            this._battleImageSprite = new Sprite();
            this._battleImageSprite.anchor.set(0.5, 0.5);
            this._battleImageSprite.x = 90;
            this._battleImageSprite.y = 56;
            this._battleImageSprite.visible = false;
            this._battleImageMask = new PIXI.Graphics();
            this._battleImageMask.beginFill(COLORS.white, 1);
            this._battleImageMask.drawPolygon([48, 24, 150, 24, 132, 88, 30, 88]);
            this._battleImageMask.endFill();
            this.addChild(this._battleImageSprite);
            this.addChild(this._battleImageMask);
            this._battleImageSprite.mask = this._battleImageMask;

            this._icon = new Sprite_ProjectRIcon(64);
            this._icon.x = SKILL_SLOT_WIDTH / 2;
            this._icon.y = 56;
            this.addChild(this._icon);

            this._slotText = new Sprite_ProjectRText(SKILL_SLOT_WIDTH, 28, {
                fontSize: 18,
                bold: true,
                align: "center"
            });
            this._slotText.y = 88;
            this._slotText.setText(`SKILL ${index + 1}`);
            this.addChild(this._slotText);

            this._nameText = new Sprite_ProjectRText(SKILL_SLOT_WIDTH - 16, 24, {
                fontSize: 16,
                color: rgbaHex(COLORS.muted),
                align: "center"
            });
            this._nameText.x = 8;
            this._nameText.y = 114;
            this.addChild(this._nameText);

            this._keyText = new Sprite_ProjectRText(52, 38, {
                fontSize: 25,
                bold: true,
                align: "center"
            });
            this._keyText.x = (SKILL_SLOT_WIDTH - 52) / 2;
            this._keyText.y = -15;
            this._keyText.setText(key);
            this.addChild(this._keyText);

            this._cooldownText = new Sprite_ProjectRText(100, 58, {
                fontSize: 34,
                bold: true,
                align: "center"
            });
            this._cooldownText.x = (SKILL_SLOT_WIDTH - 100) / 2;
            this._cooldownText.y = 27;
            this.addChild(this._cooldownText);
        }

        redraw(data, imageName) {
            const selected = !!data.selected;
            const cooldown = !!data.cooldown?.active;
            const disabled = !!data.disabled;
            const border = selected ? COLORS.cyan : COLORS.panelLine;
            const fill = selected ? COLORS.cyanDark : COLORS.panel;
            const points = [
                SKILL_SLOT_SKEW,
                0,
                SKILL_SLOT_WIDTH,
                0,
                SKILL_SLOT_WIDTH - SKILL_SLOT_SKEW,
                SKILL_SLOT_HEIGHT,
                0,
                SKILL_SLOT_HEIGHT
            ];

            this._shape.clear();
            if (selected) {
                drawClosedPolygon(this._shape, points, COLORS.cyan, 0.08, COLORS.cyan, 8, 0.16);
            }
            drawClosedPolygon(this._shape, points, fill, disabled ? 0.48 : 0.96, border, selected ? 4 : 3, 1);
            this._shape.lineStyle(2, selected ? COLORS.cyan : 0x2d4055, 0.9);
            this._shape.moveTo(57, 10);
            this._shape.lineTo(123, SKILL_SLOT_HEIGHT - 10);

            this._shape.lineStyle(2, selected ? COLORS.cyan : 0x9eb2cb, 1);
            this._shape.beginFill(0x09111b, 1);
            this._shape.drawRoundedRect((SKILL_SLOT_WIDTH - 54) / 2, -14, 54, 38, 8);
            this._shape.endFill();

            if (cooldown) {
                drawClosedPolygon(this._shape, points, COLORS.black, 0.72, border, 2, 0.8);
            }

            this._imageDisplayAllowed = !!data.available && !cooldown;
            this.refreshImage(data, imageName);
            this._nameText.setText(data.name || "—", {
                color: selected ? rgbaHex(COLORS.cyan) : rgbaHex(COLORS.muted)
            });
            this._slotText.setText(
                `${data.mode === "card" ? "CARD" : "SKILL"} ${this._index + 1}`,
                { color: selected ? rgbaHex(COLORS.cyan) : rgbaHex(COLORS.text) }
            );
            // カード戦闘中は1～5、それ以外はHotbarの従来キー。
            this._keyText.setText(data.key || this._key);
            if (cooldown) {
                this._cooldownText.setText(Math.max(0, Math.ceil(data.cooldown.remaining)));
            } else {
                this._cooldownText.setText("");
            }
        }

        refreshImage(data, imageName) {
            const signature = JSON.stringify([
                data.skillId,
                imageName,
                data.iconIndex
            ]);
            if (signature !== this._lastImageSignature) {
                this._lastImageSignature = signature;
                this._imageRequestKey = signature;
                this._usingBattleImage = false;
                this._battleImageSprite.visible = false;
                this._battleImageSprite.bitmap = null;
                this._icon.setIconIndex(data.iconIndex || 0);
                if (imageName) {
                    this._imageResolver.loadBattleImage(imageName, bitmap => {
                        if (!bitmap || this._imageRequestKey !== signature) return;
                        fitBattleImage(
                            this._battleImageSprite,
                            bitmap,
                            118,
                            64,
                            "contain",
                            () => this._imageRequestKey === signature,
                            () => {
                                this._usingBattleImage = true;
                                this.updateImageVisibility();
                            }
                        );
                    });
                }
            }
            this.updateImageVisibility();
        }

        updateImageVisibility() {
            this._battleImageSprite.visible =
                this._imageDisplayAllowed && this._usingBattleImage;
            this._icon.visible =
                this._imageDisplayAllowed && !this._usingBattleImage;
        }

        setData(data) {
            const imageName = data.imageName || this._imageResolver.skillImageName(data);
            const signature = JSON.stringify([
                data.mode,
                data.key,
                data.cardId,
                data.instanceId,
                data.skillId,
                data.name,
                data.iconIndex,
                imageName,
                data.available,
                data.disabled,
                data.selected,
                !!data.cooldown?.active,
                data.cooldown?.active ? Math.ceil(data.cooldown.remaining) : 0
            ]);
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            this.redraw(data, imageName);
        }
    }

    class Sprite_ProjectRSkillHUD extends Sprite {
        initialize(adapter, imageResolver) {
            super.initialize();
            this._adapter = adapter;
            this._imageResolver = imageResolver;
            this._slots = [];
            const totalWidth = SKILL_SLOT_WIDTH * SKILL_COUNT +
                SKILL_SLOT_GAP * (SKILL_COUNT - 1);
            const startX = (BASE_WIDTH - totalWidth) / 2;
            const stepX = SKILL_SLOT_WIDTH + SKILL_SLOT_GAP;
            for (let index = 0; index < SKILL_COUNT; index++) {
                const slot = new Sprite_ProjectRSkillSlot(
                    index,
                    SKILL_KEYS[index],
                    adapter,
                    imageResolver
                );
                slot.x = startX + stepX * index;
                slot.y = SKILL_HUD_Y;
                this._slots.push(slot);
                this.addChild(slot);
            }
        }

        // 戦闘終了・表示切替で古い描画を残さない（次のsetDataで必ず描き直す）。
        reset() {
            for (const slot of this._slots) slot._lastSignature = "";
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const data = this._adapter.skills();
            for (let index = 0; index < this._slots.length; index++) {
                this._slots[index].setData(data[index]);
            }
        }
    }

    // 山札/捨て札/Cooldown山の枚数。値はCardDeckの戦闘状態から毎回読むだけで、HUDは数えない。
    class Sprite_ProjectRCardCountsHUD extends Sprite {
        initialize(adapter) {
            super.initialize();
            this._adapter = adapter;
            this._lastSignature = "";
            const totalWidth = SKILL_SLOT_WIDTH * SKILL_COUNT +
                SKILL_SLOT_GAP * (SKILL_COUNT - 1);
            const width = 460;
            this.x = (BASE_WIDTH + totalWidth) / 2 - width;
            this.y = SKILL_HUD_Y - 46;
            this._text = new Sprite_ProjectRText(width, 28, {
                fontSize: 18,
                bold: true,
                color: rgbaHex(COLORS.muted),
                align: "right"
            });
            this.addChild(this._text);
            this.visible = false;
        }

        reset() {
            this._lastSignature = "";
            this.visible = false;
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const counts = this._adapter.cardCounts();
            this.visible = !!counts;
            if (!counts) return;
            const signature = `${counts.draw}|${counts.discard}|${counts.cooldown}`;
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            this._text.setText(
                `DRAW ${counts.draw}   DISCARD ${counts.discard}   COOLDOWN ${counts.cooldown}`
            );
        }
    }

    // 常駐Ultimate神のDivine HPと崩壊/復帰。値と復帰タイマーはGodSummonManagerのものを読むだけ。
    class Sprite_ProjectRDivineHUD extends Sprite {
        initialize(adapter) {
            super.initialize();
            this._adapter = adapter;
            this._lastSignature = "";
            this.x = 36;
            this.y = 738;
            this._panel = new PIXI.Graphics();
            drawClosedPolygon(
                this._panel,
                [0, 0, 330, 0, 330, 64, 0, 64],
                COLORS.panel,
                0.92,
                COLORS.panelLine,
                2,
                0.75
            );
            this.addChild(this._panel);
            this._bar = new PIXI.Graphics();
            this.addChild(this._bar);
            this._nameText = new Sprite_ProjectRText(150, 28, {
                fontSize: 20,
                bold: true,
                color: rgbaHex(COLORS.gold)
            });
            this._nameText.x = 10;
            this._nameText.y = 3;
            this.addChild(this._nameText);
            this._hpText = new Sprite_ProjectRText(170, 28, {
                fontSize: 18,
                bold: true,
                align: "right"
            });
            this._hpText.x = 150;
            this._hpText.y = 5;
            this.addChild(this._hpText);
            this._statusText = new Sprite_ProjectRText(310, 22, {
                fontSize: 16,
                bold: true,
                align: "left"
            });
            this._statusText.x = 10;
            this._statusText.y = 42;
            this.addChild(this._statusText);
            this.visible = false;
        }

        reset() {
            this._lastSignature = "";
            this.visible = false;
        }

        redraw(data) {
            const color = data.collapsed ? COLORS.red : COLORS.green;
            this._bar.clear();
            this._bar.lineStyle(2, data.collapsed ? COLORS.red : COLORS.panelLine, 0.9);
            this._bar.beginFill(0x09111b, 1);
            this._bar.drawRect(10, 32, 310, 11);
            this._bar.endFill();
            if (data.rate > 0) {
                this._bar.lineStyle(0);
                this._bar.beginFill(color, 1);
                this._bar.drawRect(11, 33, 308 * clamp(data.rate, 0, 1), 9);
                this._bar.endFill();
            }
            this._nameText.setText(data.name);
            this._hpText.setText(
                `DIVINE HP ${formatNumber(data.hp)} / ${formatNumber(data.maxHp)}`,
                { color: data.collapsed ? rgbaHex(COLORS.red) : rgbaHex(COLORS.text) }
            );
            this._statusText.setText(
                data.collapsed ?
                    `COLLAPSED  RECOVERING ${(Math.ceil(data.recoverySeconds * 10 - 1e-9) / 10).toFixed(1)}s` :
                    "ACTIVE",
                { color: data.collapsed ? rgbaHex(COLORS.red) : rgbaHex(COLORS.green) }
            );
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const data = this._adapter.divine();
            this.visible = !!data;
            if (!data) return;
            const signature = JSON.stringify([
                data.godId,
                data.name,
                data.collapsed,
                data.hp,
                data.maxHp,
                Math.ceil(data.recoverySeconds * 10 - 1e-9)
            ]);
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            this.redraw(data);
        }
    }

    class Sprite_ProjectRUltimateHUD extends Sprite {
        initialize(adapter) {
            super.initialize();
            this._adapter = adapter;
            this._lastSignature = "";
            this._centerX = 960;
            this._centerY = 70;
            this._radiusX = 355;
            this._radiusY = 66;
            this._startAngle = Math.PI * 0.92;
            this._endAngle = Math.PI * 0.08;
            this.createBaseGauge();
            this.createTexts();
        }

        createBaseGauge() {
            this._baseGraphics = new PIXI.Graphics();
            this._baseGraphics.lineStyle(26, 0x273548, 1);
            drawEllipseSegment(
                this._baseGraphics,
                this._centerX,
                this._centerY,
                this._radiusX,
                this._radiusY,
                this._startAngle,
                this._endAngle,
                1
            );
            this._baseGraphics.lineStyle(3, 0x647890, 0.9);
            drawEllipseSegment(
                this._baseGraphics,
                this._centerX,
                this._centerY,
                this._radiusX,
                this._radiusY,
                this._startAngle,
                this._endAngle,
                1
            );

            for (let index = 0; index <= 10; index++) {
                const progress = index / 10;
                const point = ellipsePoint(
                    this._centerX,
                    this._centerY,
                    this._radiusX,
                    this._radiusY,
                    this._startAngle,
                    this._endAngle,
                    progress
                );
                const dx = point.x - this._centerX;
                const dy = point.y - this._centerY;
                const length = Math.max(1, Math.hypot(dx, dy));
                const tickLength = index % 5 === 0 ? 22 : 15;
                this._baseGraphics.lineStyle(index % 5 === 0 ? 4 : 3, 0x73859b, 1);
                this._baseGraphics.moveTo(point.x, point.y);
                this._baseGraphics.lineTo(
                    point.x - dx / length * tickLength,
                    point.y - dy / length * tickLength
                );
            }
            this.addChild(this._baseGraphics);

            this._valueGraphics = new PIXI.Graphics();
            this.addChild(this._valueGraphics);

            this._keyGraphics = new PIXI.Graphics();
            this._keyGraphics.lineStyle(3, COLORS.gold, 1);
            this._keyGraphics.beginFill(COLORS.goldDark, 0.9);
            this._keyGraphics.drawRoundedRect(812, 64, 52, 42, 10);
            this._keyGraphics.endFill();
            this.addChild(this._keyGraphics);
        }

        createTexts() {
            this._titleText = new Sprite_ProjectRText(240, 38, {
                fontSize: 20,
                bold: true,
                color: rgbaHex(COLORS.gold),
                align: "right"
            });
            this._titleText.x = 700;
            this._titleText.y = 24;
            this._titleText.setText("ULTIMATE");
            this.addChild(this._titleText);

            this._valueText = new Sprite_ProjectRText(200, 46, {
                fontSize: 32,
                bold: true,
                color: rgbaHex(COLORS.gold),
                align: "left"
            });
            this._valueText.x = 980;
            this._valueText.y = 20;
            this.addChild(this._valueText);

            this._keyText = new Sprite_ProjectRText(52, 42, {
                fontSize: 26,
                bold: true,
                color: rgbaHex(COLORS.gold),
                align: "center"
            });
            this._keyText.x = 812;
            this._keyText.y = 64;
            this._keyText.setText("R");
            this.addChild(this._keyText);
        }

        // 状態別の配色/文言。ready（満タン＋神が顕現中）とfullUnavailable（満タンだが神が崩壊中）は別物。
        stylesFor(data) {
            if (data.mode !== "card") {
                return {
                    color: COLORS.gold, title: "ULTIMATE", keyText: "R", keyAlpha: 1, glow: false,
                    value: data.available ? `${Math.round(clamp(data.progress, 0, 1) * 100)}%` : "--%",
                    valueColor: data.available ? rgbaHex(COLORS.gold) : rgbaHex(COLORS.muted)
                };
            }
            const keyText = data.keyActive && data.key ? data.key : "—";
            const value = `${formatNumber(data.value)}/${formatNumber(data.max)}`;
            if (data.executing) {
                return { color: COLORS.cyan, title: "ULTIMATE ACTIVE", keyText, keyAlpha: 0.35, glow: false,
                    value, valueColor: rgbaHex(COLORS.cyan) };
            }
            if (data.state === "ready") {
                return { color: 0xfff0a8, title: `${keyText} - ULTIMATE`, keyText, keyAlpha: data.keyActive ? 1 : 0.35,
                    glow: true, value, valueColor: rgbaHex(0xfff0a8) };
            }
            if (data.state === "fullUnavailable") {
                return { color: COLORS.purple, title: "GAUGE FULL / UNAVAILABLE", keyText, keyAlpha: 0.35,
                    glow: false, value, valueColor: rgbaHex(COLORS.purple) };
            }
            return { color: COLORS.gold, title: "ULTIMATE", keyText, keyAlpha: 0.6, glow: false,
                value, valueColor: rgbaHex(COLORS.gold) };
        }

        redrawGauge(data) {
            const style = this.stylesFor(data);
            const progress = clamp(data.progress, 0, 1);
            const endpoint = ellipsePoint(
                this._centerX,
                this._centerY,
                this._radiusX,
                this._radiusY,
                this._startAngle,
                this._endAngle,
                progress
            );
            this._valueGraphics.clear();
            if (progress > 0 && style.glow) {
                this._valueGraphics.lineStyle(30, style.color, 0.25);
                drawEllipseSegment(
                    this._valueGraphics,
                    this._centerX,
                    this._centerY,
                    this._radiusX,
                    this._radiusY,
                    this._startAngle,
                    this._endAngle,
                    progress
                );
            }
            if (progress > 0) {
                this._valueGraphics.lineStyle(18, style.color, 1);
                drawEllipseSegment(
                    this._valueGraphics,
                    this._centerX,
                    this._centerY,
                    this._radiusX,
                    this._radiusY,
                    this._startAngle,
                    this._endAngle,
                    progress
                );
            }

            this._valueGraphics.lineStyle(10, 0x2f2208, 0.9);
            this._valueGraphics.moveTo(this._centerX, this._centerY);
            this._valueGraphics.lineTo(endpoint.x, endpoint.y);
            this._valueGraphics.lineStyle(5, style.color, 1);
            this._valueGraphics.moveTo(this._centerX, this._centerY);
            this._valueGraphics.lineTo(endpoint.x, endpoint.y);

            this._valueGraphics.beginFill(style.color, 1);
            this._valueGraphics.drawCircle(endpoint.x, endpoint.y, 10);
            this._valueGraphics.endFill();
            this._valueGraphics.lineStyle(6, style.color, 1);
            this._valueGraphics.beginFill(COLORS.panel, 1);
            this._valueGraphics.drawCircle(this._centerX, this._centerY, 15);
            this._valueGraphics.endFill();

            this._valueText.setText(style.value, { color: style.valueColor });
            this._titleText.setText(style.title, { color: rgbaHex(style.color) });
            this._keyText.setText(style.keyText);
            this._keyText.alpha = style.keyAlpha;
            this._keyGraphics.alpha = style.keyAlpha;
        }

        reset() {
            this._lastSignature = "";
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const data = this._adapter.ultimate();
            // カード戦闘中に有効なUltimate（ゲージ状態）が無いときは、偽の0/100を出さず区画ごと隠す。
            this.visible = data.mode !== "card" || data.available;
            if (!this.visible) {
                this._lastSignature = "";
                return;
            }
            const signature = JSON.stringify([
                data.mode,
                Math.round(data.progress * 1000),
                data.available,
                data.state,
                data.value,
                data.max,
                data.key,
                data.keyActive,
                data.executing
            ]);
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            this.redrawGauge(data);
        }
    }

    class Sprite_ProjectRWeaponHUD extends Sprite {
        initialize(adapter, imageResolver) {
            super.initialize();
            this._adapter = adapter;
            this._imageResolver = imageResolver;
            this._lastSignature = "";
            this._lastImageSignature = "";
            this._imageRequestKey = "";
            this._usingBattleImage = false;
            this.x = 1540;
            this.y = 805;
            this.createGraphics();
            this.createTexts();
        }

        createGraphics() {
            this._graphics = new PIXI.Graphics();
            drawClosedPolygon(
                this._graphics,
                [0, 112, 38, 72, 176, 72, 230, 55, 230, 155, 176, 155, 25, 155],
                COLORS.panel,
                0.92,
                COLORS.panelLine,
                2,
                0.75
            );
            drawClosedPolygon(
                this._graphics,
                halfCirclePoints(230, 100, 74, Math.PI * 0.75, Math.PI * 1.75),
                0x203249,
                1,
                COLORS.panelLine,
                0
            );
            drawClosedPolygon(
                this._graphics,
                halfCirclePoints(230, 100, 74, Math.PI * 1.75, Math.PI * 2.75),
                0x282313,
                1,
                COLORS.panelLine,
                0
            );
            this._graphics.lineStyle(4, 0xa9bdd6, 1);
            this._graphics.drawCircle(230, 100, 76);
            this._graphics.lineStyle(4, COLORS.gold, 1);
            this._graphics.moveTo(174, 156);
            this._graphics.lineTo(286, 44);
            this.addChild(this._graphics);

            this._battleImageSprite = new Sprite();
            this._battleImageSprite.anchor.set(0.5, 0.5);
            this._battleImageSprite.x = 230;
            this._battleImageSprite.y = 100;
            this._battleImageSprite.visible = false;
            this._battleImageMask = new PIXI.Graphics();
            this._battleImageMask.beginFill(COLORS.white, 1);
            this._battleImageMask.drawPolygon(
                halfCirclePoints(230, 100, 70, Math.PI * 0.75, Math.PI * 1.75)
            );
            this._battleImageMask.endFill();
            this.addChild(this._battleImageSprite);
            this.addChild(this._battleImageMask);
            this._battleImageSprite.mask = this._battleImageMask;

            this._icon = new Sprite_ProjectRIcon(60);
            this._icon.x = 205;
            this._icon.y = 75;
            this.addChild(this._icon);

            this._imageFrameGraphics = new PIXI.Graphics();
            this._imageFrameGraphics.lineStyle(4, 0xa9bdd6, 1);
            this._imageFrameGraphics.drawCircle(230, 100, 76);
            this._imageFrameGraphics.lineStyle(4, COLORS.gold, 1);
            this._imageFrameGraphics.moveTo(174, 156);
            this._imageFrameGraphics.lineTo(286, 44);
            this.addChild(this._imageFrameGraphics);
        }

        createTexts() {
            this._titleText = new Sprite_ProjectRText(128, 34, {
                fontSize: 21,
                bold: true,
                align: "center"
            });
            this._titleText.x = 166;
            this._titleText.y = 40;
            this._titleText.setText("WEAPON");
            this.addChild(this._titleText);

            this._nameText = new Sprite_ProjectRText(175, 32, {
                fontSize: 18,
                bold: true,
                align: "right"
            });
            this._nameText.x = 0;
            this._nameText.y = 90;
            this.addChild(this._nameText);

            this._ammoText = new Sprite_ProjectRText(56, 42, {
                fontSize: 34,
                bold: true,
                color: rgbaHex(COLORS.gold),
                align: "center"
            });
            this._ammoText.x = 236;
            this._ammoText.y = 96;
            this.addChild(this._ammoText);

            this._reserveText = new Sprite_ProjectRText(60, 24, {
                fontSize: 18,
                color: rgbaHex(COLORS.muted),
                align: "center"
            });
            this._reserveText.x = 216;
            this._reserveText.y = 136;
            this.addChild(this._reserveText);
        }

        refreshImage(data, imageName) {
            const signature = JSON.stringify([
                data.weaponId,
                imageName,
                data.iconIndex
            ]);
            if (signature === this._lastImageSignature) return;
            this._lastImageSignature = signature;
            this._imageRequestKey = signature;
            this._usingBattleImage = false;
            this._battleImageSprite.visible = false;
            this._battleImageSprite.bitmap = null;
            this._icon.setIconIndex(data.iconIndex || 0);
            this._icon.visible = !!data.iconIndex;
            if (!imageName) return;
            this._imageResolver.loadBattleImage(imageName, bitmap => {
                if (!bitmap || this._imageRequestKey !== signature) return;
                fitBattleImage(
                    this._battleImageSprite,
                    bitmap,
                    140,
                    140,
                    "cover",
                    () => this._imageRequestKey === signature,
                    () => {
                        this._usingBattleImage = true;
                        this._icon.visible = false;
                    }
                );
            });
        }

        update() {
            super.update();
            if (Graphics.frameCount % 4 !== 0) return;
            const data = this._adapter.weapon();
            const imageName = this._imageResolver.weaponImageName(data);
            const signature = JSON.stringify([data, imageName]);
            if (signature === this._lastSignature) return;
            this._lastSignature = signature;
            this.refreshImage(data, imageName);
            this._nameText.setText(data.name || "NO WEAPON");
            this._ammoText.setText(data.isGun ? roundDisplayNumber(data.currentAmmo) : "—");
            this._reserveText.setText(data.isGun ? `/ ${roundDisplayNumber(data.reserveAmmo)}` : "MELEE");
        }
    }

    class Sprite_ProjectRStatusItem extends Sprite {
        initialize() {
            super.initialize();
            this._graphics = new PIXI.Graphics();
            this.addChild(this._graphics);
            this._icon = new Sprite_ProjectRIcon(22);
            this._icon.x = 17;
            this._icon.y = 21;
            this.addChild(this._icon);
            this._text = new Sprite_ProjectRText(78, 42, {
                fontSize: 14,
                bold: true,
                align: "center",
                outlineWidth: 3
            });
            this.addChild(this._text);
            this._signature = "";
        }

        setData(data) {
            if (!data) {
                this.visible = false;
                return;
            }
            this.visible = true;
            const signature = JSON.stringify(data);
            if (signature === this._signature) return;
            this._signature = signature;
            const color = data.kind === "buff" ? COLORS.green :
                data.kind === "debuff" ? COLORS.red : COLORS.purple;
            this._graphics.clear();
            this._graphics.lineStyle(2, color, 1);
            this._graphics.beginFill(0x09111b, 0.94);
            this._graphics.drawRoundedRect(0, 0, 78, 42, 8);
            this._graphics.endFill();
            this._icon.setIconIndex(data.iconIndex || 0);
            this._icon.visible = !!data.iconIndex;
            this._text.x = data.iconIndex ? 22 : 0;
            this._text.bitmap.resize(data.iconIndex ? 56 : 78, 42);
            this._text._signature = "";
            this._text.setText(data.label, { color: rgbaHex(color) });
        }
    }

    class Sprite_ProjectRStatusHUD extends Sprite {
        initialize(adapter) {
            super.initialize();
            this._adapter = adapter;
            this._items = [];
            this._visibleCount = 0;
            for (let index = 0; index < 4; index++) {
                const item = new Sprite_ProjectRStatusItem();
                item.x = index * 86;
                this._items.push(item);
                this.addChild(item);
            }
        }

        updateData() {
            const statuses = this._adapter.statuses().slice(0, 4);
            this._visibleCount = statuses.length;
            for (let index = 0; index < this._items.length; index++) {
                this._items[index].setData(statuses[index] || null);
            }
            this.visible = statuses.length > 0;
        }

        updatePosition() {
            if (!this.visible) return;
            const position = this._adapter.playerScreenPosition();
            if (!position) {
                this.visible = false;
                return;
            }
            const scaleX = Math.max(0.0001, Graphics.width / BASE_WIDTH);
            const scaleY = Math.max(0.0001, Graphics.height / BASE_HEIGHT);
            const width = this._visibleCount * 78 + Math.max(0, this._visibleCount - 1) * 8;
            const baseX = position.x / scaleX;
            const baseY = position.y / scaleY;
            this.x = clamp(baseX - width / 2, 12, BASE_WIDTH - width - 12);
            this.y = clamp(baseY + 22, 12, FOOTER_TOP - 54);
        }

        update() {
            super.update();
            if (Graphics.frameCount % 6 === 0) this.updateData();
            this.updatePosition();
        }
    }

    class ProjectRBattleHUDManager extends Sprite {
        initialize(scene) {
            super.initialize();
            this._scene = scene;
            this._adapter = new ProjectRBattleHUDDataAdapter(scene);
            this._imageResolver = new ProjectRBattleHUDImageResolver();
            this._lastScaleX = 0;
            this._lastScaleY = 0;
            this._ultimateHUD = new Sprite_ProjectRUltimateHUD(this._adapter);
            this._skillHUD = new Sprite_ProjectRSkillHUD(this._adapter, this._imageResolver);
            this._playerHUD = new Sprite_ProjectRPlayerHUD(this._adapter, this._imageResolver);
            this._weaponHUD = new Sprite_ProjectRWeaponHUD(this._adapter, this._imageResolver);
            this._statusHUD = new Sprite_ProjectRStatusHUD(this._adapter);
            this._countsHUD = new Sprite_ProjectRCardCountsHUD(this._adapter);
            this._divineHUD = new Sprite_ProjectRDivineHUD(this._adapter);
            this._cardWasActive = false;
            this.addChild(this._ultimateHUD);
            this.addChild(this._skillHUD);
            this.addChild(this._countsHUD);
            this.addChild(this._divineHUD);
            this.addChild(this._playerHUD);
            this.addChild(this._weaponHUD);
            this.addChild(this._statusHUD);
            this.updateScale();
        }

        updateScale() {
            const scaleX = Graphics.width / BASE_WIDTH;
            const scaleY = Graphics.height / BASE_HEIGHT;
            if (scaleX === this._lastScaleX && scaleY === this._lastScaleY) return;
            this._lastScaleX = scaleX;
            this._lastScaleY = scaleY;
            this.scale.set(scaleX, scaleY);
        }

        // カード戦闘が終わった瞬間に、カード/神/Ultimate区画の古い描画と共有snapshotを捨てる。
        // 次に戦闘が始まれば、実行中のシステムから全て描き直される。
        resetBattleSections() {
            this._adapter.invalidate();
            this._skillHUD.reset();
            this._countsHUD.reset();
            this._divineHUD.reset();
            this._ultimateHUD.reset();
        }

        update() {
            this.updateScale();
            const cardActive = this._adapter.cardBattleActive();
            if (cardActive !== this._cardWasActive) {
                this._cardWasActive = cardActive;
                this.resetBattleSections();
            }
            this.visible = this._adapter.shouldShow();
            if (this.visible) super.update();
        }
    }

    BattleHUD.ImageResolver = ProjectRBattleHUDImageResolver;
    BattleHUD.DataAdapter = ProjectRBattleHUDDataAdapter;
    BattleHUD.Manager = ProjectRBattleHUDManager;
    BattleHUD.debugPreview = debugPreview;

    // Console確認用: HUDが今描こうとしている値（実システムから読んだコピー。保存しない）。
    BattleHUD.getViewModel = function() {
        const adapter = BattleHUD._manager?._adapter || new ProjectRBattleHUDDataAdapter(null);
        const cardBattleActive = adapter.cardBattleActive();
        return JSON.parse(JSON.stringify({
            visible: adapter.shouldShow(),
            cardBattleActive,
            slots: adapter.skills(),
            counts: adapter.cardCounts(),
            ultimate: adapter.ultimate(),
            divine: adapter.divine()
        }));
    };

    const _Scene_Map_createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
    Scene_Map.prototype.createDisplayObjects = function() {
        _Scene_Map_createDisplayObjects.call(this);
        this.createProjectRBattleHUD();
    };

    Scene_Map.prototype.createProjectRBattleHUD = function() {
        if (this._projectRBattleHudLayer) return;
        const layer = new ProjectRBattleHUDManager(this);
        this._projectRBattleHudLayer = layer;

        const dialogueBackground = this._projectRFullscreenDialogueBackground;
        const dialogueIndex = dialogueBackground ? this.children.indexOf(dialogueBackground) : -1;
        if (dialogueIndex >= 0) {
            this.addChildAt(layer, dialogueIndex);
        } else {
            this.addChild(layer);
        }
        BattleHUD._manager = layer;
    };

    const _Scene_Map_terminate = Scene_Map.prototype.terminate;
    Scene_Map.prototype.terminate = function() {
        if (BattleHUD._manager === this._projectRBattleHudLayer) {
            BattleHUD._manager = null;
        }
        _Scene_Map_terminate.call(this);
    };
})();
