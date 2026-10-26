/*:
 * @target MZ
 * @plugindesc v2.0.0 メニュー原画をそのまま表示するProjectR専用メニューの土台。
 * @author ProjectR
 * @orderAfter Hendrix_Keyboard_Gamepad
 * @orderAfter ProjectR_FullscreenDialogue
 * @orderAfter ProjectR_CombatPresence
 * @orderAfter ProjectR_PlayerFacing
 * @orderAfter ProjectR_BattleHUD
 *
 * @param ArtworkFile
 * @text メニュー背景画像
 * @desc img/projectr_ui/menu/内のファイル名（拡張子を含む）。原画を加工せず表示します。
 * @type string
 * @default menu_main.jpg
 *
 * @help
 * ProjectR_MenuHUD.js
 *
 * 原画1枚を使用するメニューの土台です。背景・中央文字・白い斜線は
 * ゲーム側で描き直しません。選択中は原画の文字画素だけを反対色にします。
 * JPEGの文字色を解析して透明Overlayを各Sceneで一度だけ生成します。
 * 以後は7枚の表示切替のみ。背景・手描きの形・クリック範囲を維持します。
 * 右端5枠のみ、ユーザー指定により前回のCodex製パネルを再利用します。
 * 1920×1080で原寸。異なる解像度では縦横共通の倍率で全体を中央配置し、
 * 余白が生じる場合も画像を切り取ったり引き伸ばしたりしません。
 *
 * ESC: 既存menu/cancel入力で開閉
 * ↑↓ / 設定済み移動キー: 7項目を順番に選択
 * Enter（テンキーも可）/ OK: 選択項目を決定
 * マウス: 文字位置をクリックすると選択・決定、右クリックで閉じる
 *
 * SKILL/ULTIMATE/ITEMは MenuHUD.commandScenes に登録されたSceneを開きます（ProjectR_MenuIntegration）。
 * 未登録の間は決定音とselectedCommand更新だけの仮処理です。
 * SAVE/LOAD/SYSTEM/TITLEは標準のScene_Save/Scene_Load/Scene_Options/
 * Scene_GameEndへ接続します。セーブ禁止・イベントテスト中はSAVEを拒否します。
 * キャンセル時は直前の選択項目へ戻ります。ロード成功・タイトル復帰は
 * 標準Sceneの処理に任せ、このプラグインから追加の遷移は行いません。
 * 現在SceneのselectedCommandで最後に決定した項目（小文字）を参照できます。
 * この値は画面内だけで保持し、セーブデータには追加しません。
 *
 * Hendrix設定で外れる物理矢印・Enterはメニューと接続先の画面内だけ補います。
 * 接続先では既存menu入力もキャンセルとして扱います。ボタン割当の入力待ち中は
 * 補助を止め、既存プラグインに任せます。keyMapper/gamepadMapperは変更しません。
 * MapのisMenuCalled/isMenuEnabledと会話中の禁止判定は既存のままです。
 *
 * 将来用の空Container（プレイヤー・神・数値はまだ描画しません）:
 *   scene.overlayLayers.PlayerOverlayLayer
 *     PlayerPortrait / MP / HP / RingLoadout
 *   scene.overlayLayers.GodOverlayLayer
 *     GodPortrait / Ultimate
 *   scene.overlayLayers.SkillOverlayLayer
 *     Q / R / X / C / V（パネルと表示用キー。戦闘キーの割当ではありません）
 *     各枠内のSkillName / SkillImageは将来用の空Containerです。
 *
 * 各ContainerのmenuRegionに親座標系の予定X/Y/幅/高さを保持します。
 * 原画座標の定義はProjectR.MenuHUD.layoutから参照できます。
 * MPは頭部、HPは胸部、指輪は左下の手、神は右側です。
 *
 * 現在の原画menu_main.jpgには右端スキル枠が描かれていないため、
 * この部分だけ前回と同じ形・寸法・位置のパネルをゲーム側で描画します。
 * スキル情報の読取・割当変更・「未設定」表示は行いません。
 * ULTIMATE/LOADは原画ですでに正しい表記のため、文字の重ね描きはしません。
 *
 * BattleHUD/CombatPresence/PlayerFacing/Fインタラクトの設定を変更せず、
 * 通常のScene切替でマップ更新を停止します。原画はImageManagerで共有し、
 * このSceneから共有Bitmapを破棄しません。
 */

(() => {
    "use strict";

    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;
    const parameters = PluginManager.parameters("ProjectR_MenuHUD");
    const artworkFile = String(parameters.ArtworkFile || "menu_main.jpg").trim();
    const artworkUrl = "img/projectr_ui/menu/" + encodeURIComponent(artworkFile);

    // Image 1's painted letter positions, in the original 1920 x 1080 coordinates.
    // The artwork contains the letters; these rectangles never draw text or panels.
    const COMMANDS = Object.freeze([
        Object.freeze({ symbol: "skill", label: "SKILL", x: 522, y: 32, w: 710, h: 194 }),
        Object.freeze({ symbol: "ultimate", label: "ULTIMATE", x: 584, y: 226, w: 630, h: 169 }),
        Object.freeze({ symbol: "item", label: "ITEM", x: 643, y: 395, w: 540, h: 164 }),
        Object.freeze({ symbol: "save", label: "SAVE", x: 695, y: 559, w: 454, h: 177 }),
        Object.freeze({ symbol: "load", label: "LOAD", x: 760, y: 736, w: 371, h: 119 }),
        Object.freeze({ symbol: "system", label: "SYSTEM", x: 787, y: 855, w: 325, h: 126 }),
        Object.freeze({ symbol: "title", label: "TITLE", x: 822, y: 981, w: 280, h: 99 })
    ]);

    const region = (x, y, w, h) => Object.freeze({ x, y, w, h });
    // Player/god anchors follow image 2. They draw no placeholders or data.
    const PLAYER = Object.freeze({
        layer: region(0, 0, 850, 1080),
        PlayerPortrait: region(160, 140, 650, 940),
        MP: region(240, 200, 270, 260),
        HP: region(530, 780, 230, 270),
        RingLoadout: region(0, 700, 320, 380)
    });
    const GOD = Object.freeze({
        layer: region(1120, 0, 800, 1080),
        GodPortrait: region(0, 140, 550, 940),
        Ultimate: region(90, 230, 230, 810)
    });
    const SKILLS = Object.freeze({
        layer: region(1608, 44, 303, 968),
        Q: region(2, 0, 273, 184),
        R: region(20, 196, 273, 184),
        X: region(30, 392, 273, 184),
        C: region(12, 588, 273, 184),
        V: region(0, 784, 273, 184)
    });

    const projectR = window.ProjectR = window.ProjectR || {};
    const MenuHUD = projectR.MenuHUD = projectR.MenuHUD || {};
    MenuHUD.layout = Object.freeze({
        width: BASE_WIDTH, height: BASE_HEIGHT, commands: COMMANDS,
        player: PLAYER, god: GOD, skills: SKILLS
    });

    function emptyRegion(name, bounds) {
        const container = new PIXI.Container();
        container.name = name;
        container.position.set(bounds.x, bounds.y);
        container.menuRegion = bounds;
        return container;
    }

    function futureLayer(name, definition) {
        const layer = emptyRegion(name, definition.layer);
        for (const [childName, bounds] of Object.entries(definition)) {
            if (childName !== "layer") layer.addChild(emptyRegion(childName, bounds));
        }
        return layer;
    }

    class SkillKeyLabel extends Sprite {
        constructor(key) {
            super(new Bitmap(128, 55));
            this.name = "Key";
            this.position.set(40, 52);
            this.bitmap.fontFace = $gameSystem.mainFontFace();
            this.bitmap.fontSize = 40;
            this.bitmap.outlineWidth = 0;
            this.bitmap.textColor = "#59d7ff";
            this.bitmap.drawText(key, 0, 0, 128, 55, "left");
        }

        destroy() {
            const owned = this.bitmap;
            this.bitmap = null;
            super.destroy();
            owned?.destroy();
        }
    }

    function skillOverlayLayer() {
        const layer = emptyRegion("SkillOverlayLayer", SKILLS.layer);
        ["Q", "R", "X", "C", "V"].forEach((key, index) => {
            const slot = emptyRegion(key, SKILLS[key]);
            // Same pentagon, fill, border and top accent as the previous implementation.
            const panel = new PIXI.Graphics();
            panel.name = "Panel";
            panel.lineStyle(2, 0x536980, 1);
            panel.beginFill(index % 2 ? 0x111a29 : 0x172131, 1);
            panel.drawPolygon([26, 0, 273, 20, 273, 171, 38, 184, 0, 98]);
            panel.endFill();
            panel.lineStyle(3, 0xa970e8, 0.75);
            panel.moveTo(26, 0).lineTo(273, 20);
            slot.addChild(panel, new SkillKeyLabel(key),
                emptyRegion("SkillName", region(41, 121, 206, 35)),
                emptyRegion("SkillImage", region(185, 59, 56, 56)));
            layer.addChild(slot);
        });
        return layer;
    }

    class CenterInteractionLayer extends PIXI.Container {
        constructor() {
            super();
            this.name = "CenterInteractionLayer";
            this._targets = COMMANDS.map(command => {
                const target = emptyRegion(command.label + " HitArea", command);
                target.hitArea = new Rectangle(0, 0, command.w, command.h);
                this.addChild(target);
                return target;
            });
        }

        hitIndex(x, y) {
            return this._targets.findIndex(target => target.hitArea.contains(x - target.x, y - target.y));
        }
    }

    // Read only the painted menu region. Hit areas remain independent of glyph bounds.
    const LETTER_SCAN = Object.freeze({ x: 512, y: 24, w: 728, h: 1056 });

    function medianColor(histograms, count) {
        return histograms.map(histogram => {
            let total = 0;
            for (let value = 0; value < 256; value++) {
                total += histogram[value];
                if (total > count / 2) return value;
            }
            return 0;
        });
    }

    function extractSelectionArtwork(artwork) {
        const scan = LETTER_SCAN;
        const canvas = document.createElement("canvas");
        canvas.width = scan.w;
        canvas.height = scan.h;
        const context = canvas.getContext("2d");
        context.drawImage(artwork.image || artwork.canvas,
            scan.x, scan.y, scan.w, scan.h, 0, 0, scan.w, scan.h);
        const pixels = context.getImageData(0, 0, scan.w, scan.h).data;
        const count = scan.w * scan.h;
        const labels = new Int8Array(count);
        const inkHistogram = Array.from({ length: 3 }, () => new Uint32Array(256));
        const paperHistogram = Array.from({ length: 3 }, () => new Uint32Array(256));
        let inkCount = 0;
        let paperCount = 0;

        for (let p = 0; p < count; p++) {
            const offset = p * 4;
            const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
            // Broad cyan range tolerates JPEG variation; pink/purple/white are excluded.
            if (g >= 125 && g - r >= 22 && b - r >= 20) labels[p] = -1;
            // Robust channel medians from the more saturated interiors, not one exact RGB.
            if (g >= 150 && b >= 130 && g - r >= 65 && b - r >= 45) {
                inkHistogram[0][r]++;
                inkHistogram[1][g]++;
                inkHistogram[2][b]++;
                inkCount++;
            }
            if (r - g > 60 && b - g > 35) {
                paperHistogram[0][r]++;
                paperHistogram[1][g]++;
                paperHistogram[2][b]++;
                paperCount++;
            }
        }
        if (!inkCount || !paperCount) return null;
        const normal = medianColor(inkHistogram, inkCount);
        const selected = normal.map(value => 255 - value);
        const paper = medianColor(paperHistogram, paperCount);

        // Whole connected strokes stay together even where adjacent words overlap in Y.
        const queue = new Int32Array(count);
        const fragments = [];
        for (let p = 0; p < count; p++) {
            if (labels[p] !== -1) continue;
            let head = 0, tail = 1, top = scan.h, bottom = 0;
            queue[0] = p;
            labels[p] = -2;
            while (head < tail) {
                const pixel = queue[head++];
                const x = pixel % scan.w;
                const y = Math.floor(pixel / scan.w);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= scan.w || ny < 0 || ny >= scan.h) continue;
                        const neighbor = ny * scan.w + nx;
                        if (labels[neighbor] === -1) {
                            labels[neighbor] = -2;
                            queue[tail++] = neighbor;
                        }
                    }
                }
            }
            const centerY = scan.y + (top + bottom) / 2;
            const index = COMMANDS.findIndex(command => centerY < command.y + command.h);
            const label = index < 0 ? COMMANDS.length : index + 1;
            if (tail < 25) {
                fragments.push({ pixels: queue.slice(0, tail), label });
            } else {
                for (let i = 0; i < tail; i++) labels[queue[i]] = label;
            }
        }

        const nearestLabel = (pixel, radius) => {
            const x = pixel % scan.w, y = Math.floor(pixel / scan.w);
            let best = 0, distance = Infinity;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx, ny = y + dy, d = dx * dx + dy * dy;
                    if (nx < 0 || nx >= scan.w || ny < 0 || ny >= scan.h || d >= distance) continue;
                    const label = labels[ny * scan.w + nx];
                    if (label > 0) {
                        best = label;
                        distance = d;
                    }
                }
            }
            return best;
        };
        // Detached brush flecks follow their nearest substantial stroke.
        for (const fragment of fragments) {
            let label = 0;
            for (const pixel of fragment.pixels) {
                label = nearestLabel(pixel, 4);
                if (label) break;
            }
            for (const pixel of fragment.pixels) labels[pixel] = label || fragment.label;
        }

        const inkVector = normal.map((value, channel) => value - paper[channel]);
        const vectorLength = inkVector.reduce((sum, value) => sum + value * value, 0);
        const coverageAt = offset => inkVector.reduce((sum, value, channel) =>
            sum + (pixels[offset + channel] - paper[channel]) * value, 0) / vectorLength;

        // Recover the JPEG/antialiased fringe only within two pixels of a cyan stroke.
        // Pure background has zero coverage and is never added to the mask.
        const mask = new Uint8Array(count);
        for (let p = 0; p < count; p++) {
            if (labels[p] > 0) {
                mask[p] = labels[p];
                continue;
            }
            const offset = p * 4;
            const coverage = coverageAt(offset);
            if (coverage < 0.12 || coverage > 1.08) continue;
            let error = 0;
            for (let channel = 0; channel < 3; channel++) {
                const difference = pixels[offset + channel] -
                    (paper[channel] + coverage * inkVector[channel]);
                error += difference * difference;
            }
            if (error <= 32 * 32) mask[p] = nearestLabel(p, 2);
        }

        const bounds = COMMANDS.map(() => ({ left: scan.w, top: scan.h, right: -1, bottom: -1 }));
        for (let p = 0; p < count; p++) {
            if (!mask[p]) continue;
            const bound = bounds[mask[p] - 1], x = p % scan.w, y = Math.floor(p / scan.w);
            bound.left = Math.min(bound.left, x);
            bound.top = Math.min(bound.top, y);
            bound.right = Math.max(bound.right, x);
            bound.bottom = Math.max(bound.bottom, y);
        }
        const overlays = bounds.map((bound, index) => {
            if (bound.right < bound.left) return null;
            const area = region(scan.x + bound.left, scan.y + bound.top,
                bound.right - bound.left + 1, bound.bottom - bound.top + 1);
            const bitmap = new Bitmap(area.w, area.h);
            const output = bitmap.context.createImageData(area.w, area.h);
            for (let y = bound.top; y <= bound.bottom; y++) {
                for (let x = bound.left; x <= bound.right; x++) {
                    const p = y * scan.w + x;
                    if (mask[p] !== index + 1) continue;
                    const from = p * 4;
                    const to = ((y - bound.top) * area.w + x - bound.left) * 4;
                    const coverage = Math.max(0, Math.min(1, coverageAt(from)));
                    for (let channel = 0; channel < 3; channel++) {
                        // Keep original JPEG/edge shading while replacing only the ink contribution.
                        output.data[to + channel] = pixels[from + channel] +
                            coverage * (selected[channel] - normal[channel]);
                    }
                    output.data[to + 3] = 255;
                }
            }
            bitmap.context.putImageData(output, 0, 0);
            bitmap.baseTexture.update();
            return { bitmap, area };
        });
        return { overlays, normal, selected };
    }

    class SelectionLayer extends PIXI.Container {
        constructor(artwork) {
            super();
            this.name = "SelectionLayer";
            this._index = 0;
            this._disposed = false;
            this._built = false;
            // Scene-owned cache: one extraction after load, then visibility changes only.
            artwork.addLoadListener(() => {
                if (this._disposed || this._built) return;
                this._built = true;
                const result = extractSelectionArtwork(artwork);
                if (!result) return;
                this.analysis = { normal: result.normal, selected: result.selected, bounds: [] };
                result.overlays.forEach((overlay, index) => {
                    this.analysis.bounds.push(overlay?.area || null);
                    if (!overlay) return;
                    const sprite = new Sprite(overlay.bitmap);
                    sprite.name = "SelectionOverlay_" + COMMANDS[index].label;
                    sprite.position.set(overlay.area.x, overlay.area.y);
                    sprite.menuRegion = overlay.area;
                    sprite.commandIndex = index;
                    this.addChild(sprite);
                });
                this.select(this._index);
            });
        }

        select(index) {
            this._index = index;
            for (const sprite of this.children) sprite.visible = sprite.commandIndex === index;
        }

        destroy(options) {
            if (this._disposed) return;
            this._disposed = true;
            const owned = this.children.map(sprite => sprite.bitmap);
            super.destroy({ ...options, children: true });
            for (const bitmap of owned) bitmap.destroy();
        }
    }

    // Scene-local fallback for physical arrows/Enter removed by Hendrix remapping.
    // ESC uses the existing mapped menu input; Input and Window prototypes stay intact.
    const PHYSICAL_ACTIONS = Object.freeze({
        ArrowUp: "up", ArrowDown: "down", Enter: "ok", NumpadEnter: "ok"
    });

    class MenuPhysicalInput {
        constructor(scene, actions = PHYSICAL_ACTIONS) {
            this._scene = scene;
            this._actions = actions;
            this._keys = new Map();
            this._onDown = this.onKeyDown.bind(this);
            this._onUp = this.onKeyUp.bind(this);
            this._onBlur = this.clear.bind(this);
            document.addEventListener("keydown", this._onDown);
            document.addEventListener("keyup", this._onUp);
            window.addEventListener("blur", this._onBlur);
        }

        onKeyDown(event) {
            const action = this._actions[event.code];
            if (!action || event.repeat || event.isComposing || this._scene._capturingInput ||
                SceneManager._scene !== this._scene || !this._scene.isActive()) return;
            if (!this._keys.has(event.code)) {
                this._keys.set(event.code, { action, frames: -1, down: true });
            }
        }

        onKeyUp(event) {
            const key = this._keys.get(event.code);
            if (key) key.down = false;
        }

        update() {
            for (const [code, key] of this._keys) {
                key.frames++;
                if (!key.down && key.frames > 0) this._keys.delete(code);
            }
        }

        triggered(action, repeat = false) {
            for (const key of this._keys.values()) {
                if (key.action !== action) continue;
                if (key.frames === 0 || (repeat && key.down && key.frames >= Input.keyRepeatWait &&
                    key.frames % Input.keyRepeatInterval === 0)) return true;
            }
            return false;
        }

        clear() {
            this._keys.clear();
        }

        destroy() {
            document.removeEventListener("keydown", this._onDown);
            document.removeEventListener("keyup", this._onUp);
            window.removeEventListener("blur", this._onBlur);
            this.clear();
        }
    }

    // Only a round trip through a standard submenu keeps the current selection.
    // Opening afresh from the map clears this transient, non-save-data state.
    let menuReturnState = null;

    class Scene_ProjectRMenu extends Scene_Base {
        create() {
            super.create();
            this._index = menuReturnState?.index ?? 0;
            this.selectedCommand = menuReturnState?.command ?? null;
            menuReturnState = null;
            this._menuInput = null;
            this._layout = new PIXI.Container();
            this._layout.name = "MenuLayout";
            this.addChild(this._layout);

            this._artwork = new Sprite(ImageManager.loadBitmapFromUrl(artworkUrl));
            this._artwork.name = "MenuArtwork";
            this._layout.addChild(this._artwork);

            const player = futureLayer("PlayerOverlayLayer", PLAYER);
            this._interaction = new CenterInteractionLayer();
            const god = futureLayer("GodOverlayLayer", GOD);
            const skills = skillOverlayLayer();
            this._selection = new SelectionLayer(this._artwork.bitmap);
            this._selection.select(this._index);
            this.overlayLayers = Object.freeze({
                PlayerOverlayLayer: player, GodOverlayLayer: god, SkillOverlayLayer: skills
            });
            this._layout.addChild(player, this._interaction, god, skills, this._selection);
            this.updateLayout();
        }

        updateLayout() {
            if (this._screenWidth === Graphics.width && this._screenHeight === Graphics.height) return;
            this._screenWidth = Graphics.width;
            this._screenHeight = Graphics.height;
            const scale = Math.min(Graphics.width / BASE_WIDTH, Graphics.height / BASE_HEIGHT);
            this._layout.scale.set(scale, scale);
            this._layout.position.set(
                (Graphics.width - BASE_WIDTH * scale) / 2,
                (Graphics.height - BASE_HEIGHT * scale) / 2
            );
        }

        start() {
            super.start();
            this._inputDelay = 6;
            this.releaseMenuInput();
            this._menuInput = new MenuPhysicalInput(this);
        }

        update() {
            super.update();
            this.updateLayout();
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            this._menuInput.update();
            if (this._inputDelay > 0) {
                this._inputDelay--;
                return;
            }
            if (Input.isTriggered("menu") || Input.isTriggered("cancel") || TouchInput.isCancelled()) {
                SoundManager.playCancel();
                this.consumeInput();
                this.popScene();
                return;
            }

            // Physical arrows take precedence if a user later remaps those keys.
            let direction = 0;
            if (this._menuInput.triggered("down", true)) direction = 1;
            else if (this._menuInput.triggered("up", true)) direction = -1;
            else if (Input.isRepeated("down")) direction = 1;
            else if (Input.isRepeated("up")) direction = -1;
            if (direction) this.select((this._index + direction + COMMANDS.length) % COMMANDS.length);

            if (this._menuInput.triggered("ok") || Input.isTriggered("ok")) {
                this.confirm();
                return;
            }
            if (TouchInput.isTriggered()) {
                const scale = this._layout.scale.x;
                const x = (TouchInput.x - this._layout.x) / scale;
                const y = (TouchInput.y - this._layout.y) / scale;
                const index = this._interaction.hitIndex(x, y);
                if (index >= 0) {
                    this.select(index);
                    this.confirm();
                }
            }
        }

        select(index) {
            if (!Number.isInteger(index) || index < 0 || index >= COMMANDS.length || index === this._index) return;
            this._index = index;
            this._selection.select(index);
            SoundManager.playCursor();
        }

        confirm() {
            if (!this.isActive() || SceneManager.isSceneChanging()) return;
            const command = COMMANDS[this._index].symbol;
            this.selectedCommand = command;
            this.consumeInput();
            let nextScene = null;
            switch (command) {
                case "save":
                    // Same conditions as MZ's Window_MenuCommand.isSaveEnabled.
                    if (DataManager.isEventTest() || !$gameSystem.isSaveEnabled()) {
                        SoundManager.playBuzzer();
                        return;
                    }
                    nextScene = Scene_Save;
                    break;
                case "load":
                    nextScene = Scene_Load;
                    break;
                case "system":
                    nextScene = Scene_Options;
                    break;
                case "title":
                    nextScene = Scene_GameEnd;
                    break;
                // SKILL / ULTIMATE / ITEM: ProjectR_MenuIntegration が MenuHUD.commandScenes へ接続する。
            }
            if (!nextScene && MenuHUD.commandScenes && MenuHUD.commandScenes[command]) {
                nextScene = MenuHUD.commandScenes[command];
            }
            SoundManager.playOk();
            if (nextScene) {
                menuReturnState = { index: this._index, command };
                SceneManager.push(nextScene);
            }
        }

        consumeInput() {
            this._menuInput.clear();
            Input.update();
            TouchInput.update();
        }

        releaseMenuInput() {
            this._menuInput?.destroy();
            this._menuInput = null;
        }

        terminate() {
            this.releaseMenuInput();
            super.terminate();
        }

        destroy() {
            this.releaseMenuInput();
            super.destroy();
        }
    }

    window.Scene_ProjectRMenu = Scene_ProjectRMenu;
    MenuHUD.Scene = Scene_ProjectRMenu;
    // 各コマンド(小文字のsymbol)から開くSceneを、他のプラグインが登録するための表。
    MenuHUD.commandScenes = MenuHUD.commandScenes || {};

    const SUBMENU_PHYSICAL_ACTIONS = Object.freeze({
        ...PHYSICAL_ACTIONS, ArrowLeft: "left", ArrowRight: "right"
    });

    function isProjectRSubmenu(scene) {
        return scene instanceof Scene_MenuBase && SceneManager._stack.includes(Scene_ProjectRMenu);
    }

    function releaseSubmenuInput(scene) {
        scene._projectRSubmenuInput?.destroy();
        scene._projectRSubmenuInput = null;
    }

    function supportStandardWindow(window, scene) {
        // Adapt these particular window instances, leaving their UI/handlers/prototypes intact.
        const input = () => scene.isActive() && !scene._capturingInput ?
            scene._projectRSubmenuInput : null;
        const isOkTriggered = window.isOkTriggered;
        window.isOkTriggered = function() {
            return isOkTriggered.call(this) || !!input()?.triggered("ok");
        };
        const isCancelTriggered = window.isCancelTriggered;
        window.isCancelTriggered = function() {
            return isCancelTriggered.call(this) || (!!input() && Input.isTriggered("menu"));
        };
        const processCursorMove = window.processCursorMove;
        window.processCursorMove = function() {
            processCursorMove.call(this);
            const keys = input();
            if (!keys || !this.isCursorMovable()) return;
            const previous = this.index();
            for (const [action, method] of [
                ["down", "cursorDown"], ["up", "cursorUp"],
                ["right", "cursorRight"], ["left", "cursorLeft"]
            ]) {
                // Mapped arrows already handled by MZ must not move the cursor twice.
                if (keys.triggered(action, true) && !Input.isRepeated(action)) {
                    this[method](keys.triggered(action));
                }
            }
            if (this.index() !== previous) this.playCursorSound();
        };
        const updateInputData = window.updateInputData;
        window.updateInputData = function() {
            scene._projectRSubmenuInput?.clear();
            updateInputData.call(this);
        };
    }

    const menuBaseStart = Scene_MenuBase.prototype.start;
    Scene_MenuBase.prototype.start = function() {
        menuBaseStart.call(this);
        if (!isProjectRSubmenu(this)) return;
        releaseSubmenuInput(this);
        this._projectRSubmenuInput = new MenuPhysicalInput(this, SUBMENU_PHYSICAL_ACTIONS);
        for (const child of this._windowLayer.children) {
            if (child instanceof Window_Selectable) supportStandardWindow(child, this);
        }
    };

    const menuBaseUpdate = Scene_MenuBase.prototype.update;
    Scene_MenuBase.prototype.update = function() {
        if (this._capturingInput) this._projectRSubmenuInput?.clear();
        else this._projectRSubmenuInput?.update();
        menuBaseUpdate.call(this);
    };

    const menuBaseTerminate = Scene_MenuBase.prototype.terminate;
    Scene_MenuBase.prototype.terminate = function() {
        releaseSubmenuInput(this);
        menuBaseTerminate.call(this);
    };

    const menuBaseDestroy = Scene_MenuBase.prototype.destroy;
    Scene_MenuBase.prototype.destroy = function() {
        releaseSubmenuInput(this);
        menuBaseDestroy.call(this);
    };

    // Preserve the existing map/menu gate and standard callMenu housekeeping.
    Scene_Map.prototype.callMenu = function() {
        menuReturnState = null;
        SoundManager.playOk();
        SceneManager.push(Scene_ProjectRMenu);
        $gameTemp.clearDestination();
        this._mapNameWindow.hide();
        this._waitCount = 2;
    };
})();
