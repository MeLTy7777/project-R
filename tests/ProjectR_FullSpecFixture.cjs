"use strict";
// 全仕様パス用の共通fixture: 実Plugin(CardDeckCore / MenuCore / MenuUI / 各Scene / PartyCombat / CombatSession /
// BossFramework / 追加HUD など)を本番と同じ順でVMに読み込む。MZのWindow/Scene/Inputは最小のstub(描画しない)。
// MZ実機の見た目・操作感は対象外(docs/ProjectR_FullSpec_ManualVerification.md で手動確認)。
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const plugins = configuration.$plugins;
const pluginParameters = name => plugins.find(p => p.name === name)?.parameters || {};
const productionCards = JSON.parse(pluginParameters("ProjectR_CardDeckCore").CardDefinitions).map(JSON.parse);
const productionRings = JSON.parse(pluginParameters("ProjectR_CardDeckCore").RingDefinitions).map(JSON.parse);

const FILES = {
    partyCombat: "ProjectR_PartyCombat", menuCore: "ProjectR_MenuCore", menuUI: "ProjectR_MenuUI",
    deckBuilder: "ProjectR_DeckBuilder", ultimateSelect: "ProjectR_UltimateSelect", ringParty: "ProjectR_RingParty",
    inventory: "ProjectR_Inventory", menuIntegration: "ProjectR_MenuIntegration",
    combatSession: "ProjectR_CombatSession", bossFramework: "ProjectR_BossFramework", extrasHud: "ProjectR_CombatExtrasHUD"
};

// 最小のMZ stub。ES classで実Pluginが `class X extends Window_Base` できる形にする。
function installMz(game) {
    class Rectangle { constructor(x = 0, y = 0, width = 0, height = 0) { Object.assign(this, { x, y, width, height }); } }
    class Contents {
        constructor() { this.log = []; this.fontSize = 22; }
        clear() { this.log = []; }
    }
    class Window_Base {
        constructor(...args) { this.initialize(...args); }
        initialize(rect) {
            Object.assign(this, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
            this.contents = new Contents();
            this.active = false;
            this.visible = true;
            this.paintOpacity = 255;
        }
        get innerWidth() { return this.width - 24; }
        lineHeight() { return 36; }
        textWidth(text) { return String(text).length * 14; }
        drawText(text, x, y, width, align) { this.contents.log.push(String(text)); }
        drawIcon(index) { this.contents.log.push(`icon:${index}`); }
        changeTextColor() {}
        resetTextColor() {}
        resetFontSettings() {}
        changePaintOpacity(enabled) { this.paintOpacity = enabled ? 255 : 160; }
        show() { this.visible = true; }
        hide() { this.visible = false; }
        update() {}
        text() { return this.contents.log.join("\n"); }
    }
    class Window_Selectable extends Window_Base {
        initialize(rect) {
            super.initialize(rect);
            this._index = -1;
            this._handlers = {};
        }
        setHandler(symbol, fn) { this._handlers[symbol] = fn; }
        isHandled(symbol) { return !!this._handlers[symbol]; }
        callHandler(symbol) { if (this.isHandled(symbol)) this._handlers[symbol](); }
        index() { return this._index; }
        select(index) { this._index = index; }
        deselect() { this.select(-1); }
        activate() { this.active = true; }
        deactivate() { this.active = false; }
        maxItems() { return 0; }
        maxCols() { return 1; }
        itemHeight() { return 36; }
        isCurrentItemEnabled() { return true; }
        itemLineRect(index) { return new Rectangle(0, index * 36, this.innerWidth, 36); }
        drawAllItems() { for (let i = 0; i < this.maxItems(); i++) this.drawItem(i); }
        refresh() { this.contents.clear(); this.drawAllItems(); }
        // 実MZのprocessOk相当(決定音の判定だけ)。
        ok() { if (this.active && this.isCurrentItemEnabled()) this.callHandler("ok"); else game.sounds.push("playBuzzer"); }
        cancel() { if (this.active) this.callHandler("cancel"); }
    }
    class Scene_Base {
        constructor() { this._windowLayer = { children: [] }; this.popped = false; this._active = true; }
        create() {}
        calcWindowHeight(lines) { return lines * 36 + 24; }
        addWindow(window_) { this._windowLayer.children.push(window_); }
        update() { for (const w of this._windowLayer.children) w.update(); }
        popScene() { this.popped = true; game.SceneManager._popped.push(this); }
    }
    class Scene_MenuBase extends Scene_Base {
        mainAreaTop() { return 0; }
        mainAreaHeight() { return game.Graphics.boxHeight; }
    }
    const colors = ["normalColor", "systemColor", "crisisColor", "deathColor", "powerUpColor"];
    Object.assign(game, {
        Rectangle, Window_Base, Window_Selectable, Scene_Base, Scene_MenuBase,
        Graphics: { boxWidth: 1280, boxHeight: 720, width: 1280, height: 720, frameCount: 0 },
        ColorManager: Object.fromEntries(colors.map(name => [name, () => name])),
        SoundManager: new Proxy({}, { get: (_t, name) => () => game.sounds.push(String(name)) }),
        TextManager: { param: index => ["最大HP", "最大MP", "攻撃力", "防御力", "魔力", "魔法防御", "敏捷性", "運"][index] },
        SceneManager: { _popped: [], _pushed: [], push(sceneClass) { this._pushed.push(sceneClass); }, _stack: [], isSceneChanging: () => false },
        Input: { triggered: new Set(), isTriggered(name) { return this.triggered.has(name); } },
        sounds: []
    });
}

// deckFixture:true は製品カードのコピー上限を5にして、30枚デッキを作れるようにする(DEV fixture。製品データは変えない)。
function createGame({ equipActorIds = {}, ultimateHandlers = ["hermes", "apollo"], combatPresence = true, deckFixture = false } = {}) {
    const game = { console };
    game.window = game;
    installMz(game);
    const commands = {};
    const hooks = [];
    // Core定義: 実の製品定義。指輪の装備可能Actorだけfixtureで上書きできる(製品は全て空)。
    const rings = productionRings.map(ring => ({ ...ring, equipActorIds: JSON.stringify(equipActorIds[ring.ringId] || []) }));
    game.PluginManager = {
        parameters: name => name === "ProjectR_CardDeckCore"
            ? { CardDefinitions: deckFixture
                ? JSON.stringify(productionCards.map(c => JSON.stringify({ ...c, maxCopies: "5" })))
                : pluginParameters(name).CardDefinitions, RingDefinitions: JSON.stringify(rings.map(JSON.stringify)) }
            : {},
        registerCommand(plugin, name, fn) { commands[`${plugin}:${name}`] = fn; },
        _commands: commands
    };
    game.Game_System = function() { this.initialize(); };
    game.Game_System.prototype.initialize = function() {};
    game.Game_Map = function() {};
    game.Game_Map.prototype.update = function() {};
    game.Game_Map.prototype.setup = function() {};
    game.Scene_Map = function() {};
    game.Scene_Map.prototype.isMenuEnabled = function() { return true; };
    game.DataManager = {
        extractSaveContents(contents) { game.$gameSystem = contents.system; },
        setupNewGame() {},
        isWeapon: item => !!item && item.etypeId === 1 && item.wtypeId !== undefined,
        isArmor: item => !!item && item.atypeId !== undefined
    };
    game.$gameParty = {
        inBattle: () => false, _items: [], _weapons: [], _armors: [], _members: [],
        items() { return this._items; }, weapons() { return this._weapons; }, armors() { return this._armors; },
        numItems(item) { return item.count || 1; }, members() { return this._members; }, allMembers() { return this._members; },
        leader() { return this._members[0] || null; }, canUse: () => true
    };
    game.$gameMessage = { lines: [], add(line) { this.lines.push(line); } };
    game.$gameSwitches = { values: {}, setValue(id, v) { this.values[id] = v; } };
    game.$dataSkills = [];
    game.$dataWeapons = [];
    game.$gameActors = { actor: id => ({ name: () => `Actor${id}` }) };
    game.$dataActors = [];
    vm.createContext(game);
    const load = file => vm.runInContext(read(`js/plugins/${file}.js`), game, { filename: file });

    load("ProjectR_CardDeckCore");
    game.$gameSystem = new game.Game_System();
    game.$gameSystem._projectRCardDeckData = undefined;
    game.ProjectRCardDeck.getPersistentData(); // $gameSystemに初期データを作る
    // 戦闘外の境界: 本番のCombatPresenceは別テストで実機相当に検証済み。ここは明示的な戦闘イベントの管理だけを再現する。
    const sources = new Set();
    if (combatPresence) {
        game.ProjectRCombatPresence = {
            beginCombatEvent: id => (typeof id === "string" && id ? (sources.add(id), true) : false),
            endCombatEvent: id => sources.delete(id),
            clearCombatEvents: () => { const had = sources.size > 0; sources.clear(); return had; },
            isCombatEventActive: () => sources.size > 0, isCombatActive: () => sources.size > 0
        };
    }
    game.ProjectRUltimateActivation = { hasUltimateHandler: god => ultimateHandlers.includes(god) };
    game.ProjectRUltimateGodDamageBridge = {
        calls: [], createAttackId: prefix => `${prefix}-${++game.ProjectRUltimateGodDamageBridge.serial}`, serial: 0,
        damagePersistentUltimateInArea(options) { this.calls.push({ kind: "area", ...options }); return { ok: true, damage: options.amount }; },
        damagePersistentUltimateFromGlobalAttack(options) { this.calls.push({ kind: "global", ...options }); return { ok: true, damage: options.amount }; }
    };
    for (const key of ["partyCombat", "menuCore", "menuUI", "deckBuilder", "ultimateSelect", "ringParty", "inventory", "combatSession", "bossFramework"]) {
        load(FILES[key]);
    }
    game.ProjectR = { MenuHUD: { commandScenes: {} } };
    load(FILES.menuIntegration);
    game.fixture = { commands, sources, plugins: FILES, load, hooks };
    game.press = name => { game.Input.triggered = new Set([name]); };
    game.releaseKeys = () => { game.Input.triggered = new Set(); };
    return game;
}

// 全製品カード(7種)を所持させる + 指輪をプレイヤーへ。
function giveEverything(game, { rings = ["hermes", "apollo"], cards = productionCards.map(c => c.cardId) } = {}) {
    const deck = game.ProjectRCardDeck;
    rings.forEach(ring => deck.assignRingToPlayer(ring));
    cards.forEach(card => deck.setCardOwned(card, true));
}

// deckFixtureで作れる有効な30枚デッキ(製品の7種を4～5枚ずつ)。
function validDeck() {
    const list = [];
    for (let i = 0; list.length < 30; i++) list.push(productionCards[i % productionCards.length].cardId);
    return list;
}

module.exports = { createGame, giveEverything, validDeck, plain, read, project, plugins, productionCards, productionRings, pluginParameters };
