"use strict";
// 実エンジン読み込みハーネス(MZは起動しない)。
//   本物の rmmz_core/managers/objects/scenes/sprites/windows、DotMoveSystem、Hendrix_Action_Engine、
//   js/plugins.js に有効登録された全プラグインを本番と同じ順でNode VMに読み込み、実Map(Map004)で動かす。
//   PIXI / DOM / 音 / 画像だけをstubにする。従来のfixtureテストは「Hendrixの関数だけ抜き出して偽の世界で動かす」
//   方式だったが、これは Input → Scene_Map.update → Game_Player.update → 実Hendrix の本番経路をそのまま通す。
// 対象外: 画面描画・Windowの見た目・音・Sprite。マウスは TouchInput._x/_y を直接設定して模擬する。
//   MZ実機の見た目や操作感は docs/ProjectR_FullSpec_ManualVerification.md で手動確認する。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");

// PIXIはclass extendsできる呼び出し可能なstubにする。メソッドは既知のコンテナ操作だけを許可し、
// 未知のプロパティはundefinedにして「存在しない物を存在すると誤認」しないようにする。
const PIXI_METHODS = new Set(["addChild", "addChildAt", "removeChild", "removeChildAt", "removeChildren", "destroy", "on", "off", "once",
    "emit", "removeAllListeners", "setTransform", "getBounds", "getLocalBounds", "toLocal", "toGlobal", "updateTransform", "render",
    "setParent", "sortChildren", "calculateBounds", "containerUpdateTransform", "getChildIndex", "setChildIndex", "swapChildren",
    "getChildAt", "renderCanvas", "setBlendColor", "setSize", "resize", "clear", "beginFill", "endFill", "drawRect", "drawRoundedRect",
    "drawCircle", "drawPolygon", "lineStyle", "moveTo", "lineTo", "arc", "setFrame", "setMask", "updateBase", "dispose", "update"]);
function pixiStub(name) {
    // PIXI.DisplayObject/Container/Sprite/Filter が持つ基本の欄だけ。描画はしない。
    const point = () => ({ x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; } });
    const cls = function() {
        this.uniforms = {}; this.children = []; this.parent = null; this.visible = true; this.alpha = 1; this.rotation = 0;
        this.x = 0; this.y = 0; this.scale = Object.assign(point(), { x: 1, y: 1 }); this.anchor = point(); this.position = point();
        this.pivot = point(); this.skew = point(); this.filters = null; this.mask = null;
        this._texture = { frame: null, baseTexture: { width: 0, height: 0, valid: true }, orig: {}, trim: null, updateUvs: noop };
        this.texture = this._texture;
        this.worldTransform = { applyInverse: p => ({ x: p.x - this.x, y: p.y - this.y }) };
    };
    // 子の追加・削除は実際に children を更新する(Windowの _backSprite.children[0] などを実Coreが参照する)。
    const container = {
        addChild(...items) { for (const child of items) { child.parent?.removeChild?.(child); this.children.push(child); child.parent = this; } return items[0]; },
        addChildAt(child, index) { child.parent?.removeChild?.(child); this.children.splice(index, 0, child); child.parent = this; return child; },
        removeChild(...items) { for (const child of items) { const i = this.children.indexOf(child); if (i >= 0) { this.children.splice(i, 1); child.parent = null; } } return items[0]; },
        removeChildren() { const removed = this.children.splice(0); removed.forEach(child => { child.parent = null; }); return removed; },
        getChildIndex(child) { return this.children.indexOf(child); },
        destroy() { this.parent?.removeChild?.(this); }
    };
    cls.prototype = new Proxy(container, {
        get(target, prop, receiver) {
            if (prop in target) return Reflect.get(target, prop, receiver);
            return typeof prop === "symbol" || !PIXI_METHODS.has(prop) ? undefined : function() { return undefined; };
        }
    });
    Object.defineProperty(cls, "name", { value: name });
    return new Proxy(cls, {
        get(target, prop, receiver) {
            if (prop in target) return Reflect.get(target, prop, receiver);
            if (typeof prop === "symbol") return undefined;
            target[prop] = pixiStub(name + "." + String(prop));
            return target[prop];
        },
        set(target, prop, value) { target[prop] = value; return true; }
    });
}

const noop = () => {};
// Canvas 2D: 描画は何もしない。文字幅だけ返す(Window_Base.textWidth など実Windowが使う)。
const context2d = () => new Proxy({ measureText: text => ({ width: String(text).length * 14 }), createLinearGradient: () => ({ addColorStop: noop }),
    getImageData: () => ({ data: [0, 0, 0, 0] }), canvas: {} },
    { get: (target, prop) => (prop in target ? target[prop] : noop), set: (target, prop, value) => { target[prop] = value; return true; } });
function createContext() {
    const ctx = { console, setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop };
    ctx.XMLHttpRequest = class { open() {} send() {} overrideMimeType() {} setRequestHeader() {} };
    ctx.fetch = () => new Promise(() => {});
    let clock = 0;
    ctx.performance = { now: () => (clock += 16.67) };
    ctx.window = ctx.global = ctx.globalThis = ctx;
    const element = () => new Proxy({ style: {}, classList: { add: noop, remove: noop }, appendChild: noop, addEventListener: noop,
        getContext: context2d, setAttribute: noop, children: [], width: 0, height: 0 },
        { get: (target, prop) => (prop in target ? target[prop] : () => undefined), set: (target, prop, value) => { target[prop] = value; return true; } });
    ctx.document = { createElement: element, body: element(), documentElement: element(), getElementById: element, addEventListener: noop,
        hasFocus: () => true, activeElement: null, fonts: { add: noop, load: () => Promise.resolve() } };
    ctx.navigator = { userAgent: "node", getGamepads: () => [null, null, null, null], platform: "Win32" };
    ctx.location = { href: "file:///x", search: "", pathname: "/" };
    ctx.addEventListener = ctx.removeEventListener = noop;
    ctx.requestAnimationFrame = () => 0;
    ctx.cancelAnimationFrame = noop;
    ctx.Image = class {};
    ctx.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
    vm.createContext(ctx);
    ctx.PIXI = pixiStub("PIXI");
    // 値型は本物と同じ形の最小実装(MZ CoreがRectangle/Pointを PIXI.X.call(this, ...) で継承する)。
    ctx.PIXI.Rectangle = vm.runInContext(`(function Rectangle(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; })`, ctx);
    vm.runInContext(`PIXI.Rectangle.prototype.clone = function() { return new PIXI.Rectangle(this.x, this.y, this.width, this.height); };
        PIXI.Rectangle.prototype.contains = function(x, y) { return x >= this.x && x < this.x + this.width && y >= this.y && y < this.y + this.height; };
        PIXI.Rectangle.prototype.copyFrom = function(r) { this.x = r.x; this.y = r.y; this.width = r.width; this.height = r.height; return this; };`, ctx);
    ctx.PIXI.Point = vm.runInContext(`(function Point(x = 0, y = 0) { this.x = x; this.y = y; })`, ctx);
    vm.runInContext(`PIXI.Point.prototype.set = function(x = 0, y = x) { this.x = x; this.y = y; };
        PIXI.Point.prototype.copyFrom = function(p) { this.x = p.x; this.y = p.y; return this; };
        PIXI.Point.prototype.equals = function(p) { return this.x === p.x && this.y === p.y; };`, ctx);
    ctx.Effekseer = ctx.effekseer = new Proxy({}, { get: () => () => ({}) });
    ctx.localforage = {};
    ctx.pako = {};
    return vm.createContext(ctx);
}

// options.playtest: Utils.isOptionValid("test") の値(既定 true。アリーナ関連pluginはPlaytestでのみ有効)
function buildWorld({ playtest = true } = {}) {
    const ctx = createContext();
    const run = (code, filename) => vm.runInContext(code, ctx, { filename });
    for (const file of ["js/rmmz_core.js", "js/rmmz_managers.js", "js/rmmz_objects.js", "js/rmmz_scenes.js", "js/rmmz_sprites.js", "js/rmmz_windows.js"]) {
        run(read(file), file);
    }
    ctx.Utils.isOptionValid = name => playtest && name === "test";
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const parse = run("(text) => JSON.parse(text)"); // データはVM側のArray/Objectで作る(Array#cloneなどMZ拡張のため)
    const failures = [];
    ctx.$dataProjectRCardBalance = parse(read("data/ProjectR_CardBalance.json")); // 本番ではProjectR_CardBalanceがfsで読む。VMにはrequireが無いので注入する。
    ctx.$plugins = config.$plugins;
    for (const plugin of config.$plugins) ctx.PluginManager._parameters[plugin.name.toLowerCase()] = plugin.parameters;
    const loaded = [];
    for (const plugin of config.$plugins) {
        if (!plugin.status) continue;
        try { run(read(`js/plugins/${plugin.name}.js`), plugin.name + ".js"); loaded.push(plugin.name); }
        catch (error) { failures.push({ plugin: plugin.name, error: String(error.stack).split("\n").slice(0, 3).join(" | ") }); }
    }
    const data = name => parse(read(`data/${name}.json`));
    for (const [variable, file] of [["$dataSystem", "System"], ["$dataStates", "States"], ["$dataEnemies", "Enemies"], ["$dataActors", "Actors"],
        ["$dataClasses", "Classes"], ["$dataSkills", "Skills"], ["$dataItems", "Items"], ["$dataWeapons", "Weapons"], ["$dataArmors", "Armors"],
        ["$dataCommonEvents", "CommonEvents"], ["$dataTroops", "Troops"], ["$dataMapInfos", "MapInfos"], ["$dataAnimations", "Animations"],
        ["$dataTilesets", "Tilesets"]]) ctx[variable] = data(file);
    // Spriteの生成だけは描画資源が要るので軽いstubにする(Hendrixのspawnが作る)。ゲームロジックには関与しない。
    ctx.RealSprite_Character = ctx.Sprite_Character;
    run("Sprite_Character = class { constructor(c) { this._character = c; this.children = []; this.x = 0; this.y = 0; } update() {} setHue() {} destroy() {} };");
    const mapData = id => parse(read(`data/Map${String(id).padStart(3, "0")}.json`));

    const world = { ctx, run, failures, loaded, scene: null };
    world.enterMap = (mapId, x, y) => {
        if (!ctx.DataManager.isDatabaseLoaded()) throw new Error("database not loaded");
        ctx.Graphics._width = 816; ctx.Graphics._height = 624; ctx.Graphics._defaultScale = 1;
        ctx.ColorManager._windowskin = { getPixel: () => "#ffffff", isReady: () => true };
        ctx.Input.initialize(); ctx.TouchInput.initialize();
        ctx.DataManager.createGameObjects();
        ctx.$gameParty.setupStartingMembers();
        ctx.$dataMap = mapData(mapId);
        ctx.DataManager.onLoad(ctx.$dataMap);
        if (!ctx.$dataTemplateMap) { // Hendrixの templateMapId(=2)。Apollo奥義の矢などの雛形Event
            ctx.$dataTemplateMap = mapData(2);
            ctx.DataManager.onLoad(ctx.$dataTemplateMap);
        }
        ctx.$gameMap.setup(mapId);
        ctx.$gamePlayer.locate(x, y);
        ctx.$gamePlayer.refresh();
        ctx.$gamePlayer.center(x, y);
        // DotMoveSystem は Scene_Map.start でこれらを初期化する
        ctx.$gameTemp.initCharacterTempDatas();
        ctx.$gameMap.initMapCharactersCache();
        ctx.$gamePlayer.setupCollideTriggerEventIds();
        world.scene = makeScene();
        return world.scene;
    };
    // 実Scene_Map.prototypeを使い、Window/Spritesetだけstubにした場面。update()は本番のScene_Map.update(全plugin連鎖)。
    const makeScene = () => {
        const scene = Object.create(ctx.Scene_Map.prototype);
        const windowStub = () => ({ isClosing: () => false, isOpen: () => false, isClosed: () => true, close: noop, open: noop, update: noop,
            active: false, visible: false, isOpenAndActive: () => false });
        const spriteset = new Proxy({ update: noop, children: [], _eventHpBars: [], _characterSprites: [], _tilemap: { addChild: noop, removeChild: noop, children: [] } },
            { get: (target, prop) => (prop in target ? target[prop] : typeof prop === "symbol" || String(prop).startsWith("_") || prop === "then" ? undefined : noop) });
        Object.assign(scene, { children: [], _active: true, _started: true, _fadeDuration: 0, _windowLayer: { children: [] },
            _messageWindow: windowStub(), _scrollTextWindow: windowStub(), _mapNameWindow: windowStub(), _spriteset: spriteset,
            _colorFilter: { setBlendColor: noop, setColorTone: noop, setBrightness: noop, setHue: noop }, menuCalling: false, hendrixHuds: [],
            _waitCount: 0, _encounterEffectDuration: 0, _mapLoaded: true, _transfer: false, _touchCount: 0 });
        scene.isBusy = () => false;
        ctx.SceneManager._scene = scene;
        return scene;
    };
    // 1フレーム = SceneManager.updateInputData相当(Input/TouchInput) + Scene_Map.update
    world.frames = count => { for (let i = 0; i < count; i++) { ctx.Input.update(); ctx.TouchInput.update(); world.scene.update(); } };
    const keyEvent = (code, keyCode, extra = {}) => ({ code, keyCode, repeat: false, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
        isComposing: false, defaultPrevented: false, target: null, preventDefault() { this.defaultPrevented = true; }, ...extra });
    world.keyDown = (code, keyCode, extra) => { const event = keyEvent(code, keyCode, extra); ctx.Input._onKeyDown(event); return event; };
    world.keyUp = (code, keyCode) => ctx.Input._onKeyUp(keyEvent(code, keyCode));
    // 物理キーの押下 → 2フレーム → 離す → 2フレーム
    world.tap = (code, keyCode) => { world.keyDown(code, keyCode); world.frames(2); world.keyUp(code, keyCode); world.frames(2); };
    world.mouse = (x, y) => { ctx.TouchInput._x = x; ctx.TouchInput._y = y; };
    world.placePlayer = (x, y) => {
        const player = ctx.$gamePlayer;
        player.locate(x, y);
        player._realX = x; player._realY = y; player._x = Math.round(x); player._y = Math.round(y);
        player.center(x, y);
    };
    // 開いているメッセージ・実行中のイベントを閉じる(F検証の繰り返し用)
    world.closeEvents = () => {
        for (let i = 0; i < 60 && (ctx.$gameMessage.isBusy() || ctx.$gameMap.isEventRunning() || ctx.$gameMap.isAnyEventStarting()); i++) {
            ctx.$gameMessage.clear();
            ctx.$gameMap._interpreter.clear();
            for (const event of ctx.$gameMap._events) event?.unlock?.();
            world.frames(1);
        }
    };
    return world;
}
const plain = value => JSON.parse(JSON.stringify(value));
module.exports = { buildWorld, plain, read, project };
