"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const plugins = configuration.$plugins;
const parameters = plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters;
const realCards = JSON.parse(parameters.CardDefinitions).map(JSON.parse);
const fixtureCards = [3, 2, 1, 3, 2].map((maxCopies, index) => ({
    cardId: `test_only_${index}`, ringId: "hermes", maxCopies, cooldownSeconds: 1,
    targetType: "instant", maxLevel: 3
}));
const cards = [...realCards, ...fixtureCards];
const validDeck = cards.flatMap(card => Array(Number(card.maxCopies)).fill(card.cardId));
const inputSource = read("js/rmmz_core.js");
// MZ InputとKeyboardは実ソースを使用。描画クラスのみVM用の最小stub。
const mzInput = inputSource.slice(inputSource.indexOf("function Input()"), inputSource.indexOf("function TouchInput()"));
// Hotbar全体はエディター・描画依存が大きいため、実際のキー処理関数を無改変で使用。
const hotbarSlotInput = read("js/plugins/Hendrix_Hotbar_Creator.js")
    .match(/Scene_Map\.prototype\.updateSlotInputs = function \(\) \{[\s\S]*?\n    \};/)[0];

function loadGame({ legacyBindings = true, prepare = true, adapter = true, productionDefinitions = false } = {}) {
    const documentListeners = new Map();
    const windowListeners = new Map();
    const listen = (map, name, fn) => map.set(name, [...(map.get(name) || []), fn]);
    const noop = function() {};
    const game = {
        console,
        navigator: { getGamepads: () => [] },
        requestAnimationFrame: noop,
        addEventListener: (name, fn) => listen(windowListeners, name, fn),
        document: {
            activeElement: { tagName: "BODY" }, hasFocus: () => true,
            addEventListener: (name, fn) => listen(documentListeners, name, fn)
        },
        TouchInput: { isTriggered: () => false, isPressed: () => false },
        Scene_MenuBase: function() {}, Window_Selectable: function() {},
        Window_HorzCommand: function() {}, Window_Options: function() {}, Window_Base: function() {},
        ConfigManager: { makeData: () => ({}), applyData: noop },
        Game_System: function() {}, Game_Interpreter: function() {},
        Scene_Map: function() { this._windowLayer = { children: [] }; },
        $gameParty: { inBattle: () => false },
        $gameMessage: { isBusy: () => false },
        $gameMap: { isEventRunning: () => false },
        $gamePlayer: { isTransferring: () => false },
        $gameTemp: { reserved: [], reserveCommonEvent(id) { this.reserved.push(id); } },
        HallInputBlocked: false,
        SceneManager: { isSceneChanging: () => false },
        DataManager: {
            makeSaveContents() { return { system: game.$gameSystem }; },
            extractSaveContents(contents) { game.$gameSystem = contents.system; }
        },
        hotbarInputEnabled: true, _slotData: new Map(), isOnGlobalCooldown: () => false
    };
    game.window = game;
    const keyboardParameters = { ...plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters };
    if (legacyBindings) {
        const buttons = JSON.parse(keyboardParameters["Button Config"]);
        for (let key = 1; key <= 5; key++) buttons.push(JSON.stringify({
            "From Key": String(key), "To Key": String(key), "Common Event ID": String(50 + key),
            Options: "triggered", AllowParallel: "false"
        }));
        keyboardParameters["Button Config"] = JSON.stringify(buttons);
    }
    game.PluginManager = { parameters: name => {
        if (name === "ProjectR_CardDeckCore") return {
            ...parameters, CardDefinitions: JSON.stringify((productionDefinitions ? realCards : cards).map(JSON.stringify))
        };
        if (name === "Hendrix_Keyboard_Gamepad") return keyboardParameters;
        return {};
    } };
    game.Game_System.prototype.initialize = function() { this.existingValue = 42; };
    game.Scene_Map.prototype.isActive = () => true;
    game.Scene_Map.prototype.isBusy = () => false;
    game.Scene_Map.prototype.update = function() {
        this.duringUpdate?.();
        this.updateSlotInputs();
        this.weaponTriggered = game.Input.isTriggered("j");
    };
    const context = vm.createContext(game);
    vm.runInContext(mzInput, context);
    vm.runInContext(hotbarSlotInput, context);
    vm.runInContext(read("js/plugins/Hendrix_Keyboard_Gamepad.js"), context);
    vm.runInContext(read("js/plugins/ProjectR_CardDeckCore.js"), context);
    if (adapter) vm.runInContext(read("js/plugins/ProjectR_CardBattleInput.js"), context);
    game.Input.initialize(); // 実ゲームと同じく、プラグインalias後にDOMハンドラーをbindする。
    game.$gameSystem = new game.Game_System();
    game.$gameSystem.initialize();
    game.SceneManager._scene = new game.Scene_Map();
    game.legacyUses = [];
    game.SceneManager._scene._skillUI = { _slots: new Map() };
    for (let key = 1; key <= 5; key++) {
        game._slotData.set(String(key), { type: "skill", id: key });
        game.SceneManager._scene._skillUI._slots.set(String(key), {
            _config: { Button: String(key) }, _bounceDuration: 0,
            useSlotContents() { game.legacyUses.push(key); }
        });
    }
    if (prepare) {
        const api = game.ProjectRCardDeck;
        api.assignRingToPlayer("hermes");
        api.assignRingToPlayer("apollo");
        cards.forEach(card => api.setCardOwned(card.cardId));
        api.setDeck(validDeck);
    }
    game.emitKey = (type, digit, extra = {}) => {
        const event = {
            code: `Digit${digit}`, keyCode: 48 + digit, key: String(digit), repeat: false,
            target: game.document.activeElement,
            preventDefault() { this.defaultPrevented = true; }, ...extra
        };
        documentListeners.get(type)?.forEach(fn => fn(event));
        return event;
    };
    game.emitWindow = name => windowListeners.get(name)?.forEach(fn => fn());
    game.tick = () => { game.Input.update(); game.SceneManager._scene.update?.(); };
    game.tap = (digit, extra) => { game.emitKey("keydown", digit, extra); game.tick(); game.emitKey("keyup", digit, extra); };
    return game;
}

const api = require(path.join(project, "js/plugins/ProjectR_CardDeckCore.js"));
function routerFixture(targetType = "instant", handler) {
    const definitions = new api.DefinitionRegistry([
        { cardId: "A", ringId: "R", maxCopies: 30, cooldownSeconds: 2, targetType }
    ], [{ ringId: "R", initialOwner: "player" }]);
    const service = new api.CardDeckService(definitions);
    service.setCardOwned("A");
    const session = new api.BattleDeckSession(service, () => 0.5);
    session.start(Array(30).fill("A"));
    return { service, session, router: new api.CardActivationRouter(session, handler ? { [targetType]: handler } : {}) };
}

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

test("adapterはCore/Keyboard/Hotbarより後に1回だけ有効登録されファイル名一致", () => {
    const entries = plugins.filter(p => p.name === "ProjectR_CardBattleInput");
    assert.equal(entries.length, 1);
    assert.equal(entries[0].status, true);
    for (const name of ["ProjectR_CardDeckCore", "Hendrix_Keyboard_Gamepad", "Hendrix_Hotbar_Creator"]) {
        assert.ok(plugins.indexOf(entries[0]) > plugins.findIndex(p => p.name === name));
    }
    assert.ok(fs.existsSync(path.join(project, "js/plugins", `${entries[0].name}.js`)));
});
test("battle inactive中は1～5でもカード使用不可・通常Hotbar/Keyboardは維持", () => {
    const game = loadGame();
    for (let digit = 1; digit <= 5; digit++) {
        assert.equal(game.ProjectRCardDeck.requestUseCard(digit - 1).reason, "battleInactive");
        game.tap(digit);
    }
    assert.equal(game.ProjectRCardDeck.getBattleState(), null);
    assert.deepEqual(game.legacyUses, [1, 2, 3, 4, 5]);
    assert.deepEqual(game.$gameTemp.reserved, [51, 52, 53, 54, 55]);
});
test("startCardBattleは検証・30Instance・シャッフル・5枚ドロー・active化", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    // RNGを固定し、入力のdeck順をそのまま利用していないことも確認。
    vm.runInContext("Math.random = () => 0.5", game);
    const before = deck.getPersistentData();
    assert.equal(deck.startCardBattle().ok, true);
    const state = plain(deck.getBattleState());
    assert.equal(deck.isCardBattleActive(), true);
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length, 25);
    const instances = [...state.drawPile, ...state.hand];
    assert.equal(new Set(instances.map(c => c.instanceId)).size, 30);
    assert.notDeepEqual(instances.map(c => c.cardId), validDeck);
    assert.deepEqual(plain(deck.getPersistentData()), plain(before));
});
test("無効30枚・29枚・本番19枚デッキを開始拒否して理由を返す", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    for (const invalid of [Array(30).fill("unknown"), validDeck.slice(0, 29),
        realCards.flatMap(c => Array(Number(c.maxCopies)).fill(c.cardId))]) {
        const result = deck.startCardBattle(invalid);
        assert.equal(result.ok, false);
        assert.ok(result.reasons.length);
        assert.equal(deck.isCardBattleActive(), false);
        assert.equal(deck.getBattleState(), null);
    }
});
test("Phase 1 startBattleだけではカード入力を有効化しない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startBattle();
    assert.equal(deck.isBattleActive(), true);
    assert.equal(deck.isCardBattleActive(), false);
    assert.equal(deck.requestUseCard(0).reason, "battleInactive");
    const before = plain(deck.getBattleState());
    game.tap(1);
    assert.deepEqual(plain(deck.getBattleState()), before);
    assert.deepEqual(game.legacyUses, [1]);
});
test("1～5がhand[0～4]を即時要求し左クリック不要・旧入力へ二重発火しない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    for (let digit = 1; digit <= 5; digit++) {
        const expected = deck.getBattleState().hand[digit - 1];
        game.tap(digit);
        const result = game.ProjectRCardBattleInput.getLastResult();
        assert.equal(result.reason, "success");
        assert.equal(result.handIndex, digit - 1);
        assert.equal(result.instanceId, expected.instanceId);
    }
    assert.deepEqual(game.legacyUses, []);
    assert.deepEqual(game.$gameTemp.reserved, []);
});
test("同フレームの複数キー押下も各1回、repeat/長押しでは再発動しない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    for (let digit = 1; digit <= 5; digit++) game.emitKey("keydown", digit);
    game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 5);
    game.emitKey("keydown", 1, { repeat: true });
    game.emitKey("keydown", 2); // repeatフラグがない重複イベントも拒否
    game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 5);
    game.emitKey("keyup", 1);
    game.tap(1);
    assert.equal(deck.getBattleState().cooldownPile.length, 6);
});
test("不正handIndexは整数0～4以外を安全拒否", () => {
    const { session, router } = routerFixture();
    const before = session.snapshot();
    for (const index of [-1, 5, 0.5, "0", null, NaN, undefined]) {
        assert.equal(router.requestUseCard(index).reason, "invalidHandIndex");
    }
    assert.deepEqual(session.snapshot(), before);
});
test("空hand slotを安全拒否、カードを消費しない", () => {
    const { session, router } = routerFixture();
    for (let index = 0; index < 30; index++) assert.equal(router.requestUseCard(0).ok, true);
    assert.equal(session.state.hand.length, 0);
    const before = session.snapshot();
    assert.equal(router.requestUseCard(4).reason, "emptyHand");
    assert.deepEqual(session.snapshot(), before);
});
test("空枠でもHotbarへフォールバックしない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    for (let index = 0; index < 30; index++) deck.requestUseCard(0);
    game.tap(5);
    assert.equal(game.ProjectRCardBattleInput.getLastResult().reason, "emptyHand");
    assert.deepEqual(game.legacyUses, []);
    assert.deepEqual(game.$gameTemp.reserved, []);
});
test("4つのtargetTypeが対応handlerに定義・instance・indexを渡す", () => {
    for (const type of ["direction", "ground", "instant", "ally"]) {
        let received;
        const { router, session } = routerFixture(type, context => { received = context; return { ok: true }; });
        const first = session.snapshot().hand[2];
        assert.equal(router.requestUseCard(2).reason, "success");
        assert.equal(received.definition.targetType, type);
        assert.equal(received.instance.instanceId, first.instanceId);
        assert.equal(received.handIndex, 2);
        assert.equal(Object.isFrozen(received), true);
    }
});
test("成功時だけPhase 1 useで消費・Cooldown移動・即時ドロー", () => {
    const { session, router } = routerFixture();
    const first = session.snapshot().hand[0];
    assert.equal(router.requestUseCard(0).ok, true);
    const state = session.snapshot();
    assert.equal(state.hand.length, 5);
    assert.equal(state.drawPile.length, 24);
    assert.equal(state.cooldownPile[0].instance.instanceId, first.instanceId);
    assert.equal(state.cooldownPile[0].remainingSeconds, 2);
    assert.equal(state.hand.some(c => c.instanceId === first.instanceId), false);
});
test("handler false/undefined/例外/Promiseは非消費、失敗理由をUIへ返す", () => {
    for (const handler of [() => ({ ok: false, reason: "spawnFailed" }), () => false,
        () => undefined, () => { throw Error("spawn error"); }, () => Promise.resolve({ ok: true }),
        () => Promise.reject(Error("async rejected"))]) {
        const { session, router } = routerFixture("direction", handler);
        const before = session.snapshot(), result = router.requestUseCard(0);
        assert.equal(result.reason, "activationFailed");
        assert.equal(result.reasons[0].code, "activationFailed");
        assert.deepEqual(session.snapshot(), before);
    }
});
test("handler失敗時の数字入力も旧Hotbar/CEへ漏れない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    for (const type of ["direction", "ground", "instant", "ally"]) {
        deck.registerActivationHandler(type, () => ({ ok: false, reason: "testFailure" }));
    }
    deck.startCardBattle();
    const before = plain(deck.getBattleState());
    game.tap(1);
    assert.equal(game.ProjectRCardBattleInput.getLastResult().reason, "activationFailed");
    assert.deepEqual(plain(deck.getBattleState()), before);
    assert.deepEqual(game.legacyUses, []);
    assert.deepEqual(game.$gameTemp.reserved, []);
});
test("未知targetTypeはinstantに変換せず安全拒否・未指定は従来instant", () => {
    const { session, router } = routerFixture("futureUnknown");
    const before = session.snapshot();
    assert.equal(router.requestUseCard(0).reason, "unsupportedTargetType");
    assert.deepEqual(session.snapshot(), before);
    assert.equal(routerFixture().router.requestUseCard(0).ok, true);
    assert.equal(routerFixture(undefined).service.definitions.card("A").targetType, "instant");
});
test("使用可能判定は最新の所持状態を使用しカード非所持なら非消費", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    const id = deck.getBattleState().hand[0].cardId;
    deck.setCardOwned(id, false);
    const before = plain(deck.getBattleState());
    const result = deck.requestUseCard(0);
    assert.equal(result.reason, "cardUnavailable");
    assert.equal(result.reasons[0].code, "CARD_NOT_OWNED");
    assert.deepEqual(plain(deck.getBattleState()), before);
});
test("handler再入は拒否し消費は一度だけ", () => {
    const { router, session } = routerFixture();
    router.registerHandler("instant", () => {
        assert.equal(router.requestUseCard(0).reason, "activationInProgress");
        return { ok: true };
    });
    assert.equal(router.requestUseCard(0).ok, true);
    assert.equal(session.snapshot().cooldownPile.length, 1);
});
test("handler内の戦闘終了時は消費しない", () => {
    const { router, session } = routerFixture();
    router.registerHandler("instant", () => { session.end(); return { ok: true }; });
    assert.equal(router.requestUseCard(0).reason, "activationFailed");
    assert.equal(session.snapshot(), null);
});
test("Cooldown終了後discardへ、山札再構築にCooldownを含めない", () => {
    const { session, router } = routerFixture();
    for (let i = 0; i < 30; i++) router.requestUseCard(0);
    assert.equal(session.snapshot().hand.length, 0);
    assert.equal(session.drawOne(), null);
    session.updateCooldown(1.9);
    assert.equal(session.snapshot().discardPile.length, 0);
    session.updateCooldown(0.2);
    assert.equal(session.snapshot().discardPile.length, 30);
    assert.equal(session.snapshot().cooldownPile.length, 0);
    assert.ok(session.drawOne());
});
test("操作可能マップでは既存Cooldown APIを60更新/秒で進める", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    deck.requestUseCard(0);
    const seconds = deck.getBattleState().cooldownPile[0].remainingSeconds;
    for (let i = 0; i < Math.ceil(seconds * 60) + 1; i++) game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
    assert.equal(deck.getBattleState().discardPile.length, 1);
});
test("メニュー・非active・busy・Scene遷移・Message/Choice・イベント等では使用しない", () => {
    const blocks = [
        g => { g.SceneManager._scene = {}; },
        g => { g.SceneManager._scene.isActive = () => false; },
        g => { g.SceneManager._scene.isBusy = () => true; },
        g => { g.SceneManager.isSceneChanging = () => true; },
        g => { g.SceneManager._stopped = true; },
        g => { g.$gameMessage.isBusy = () => true; },
        g => { g.$gameMap.isEventRunning = () => true; },
        g => { g.$gamePlayer.isTransferring = () => true; },
        g => { g.ProjectR = { FullscreenDialogue: { isActive: () => true } }; },
        g => { const child = new g.Window_Selectable(); Object.assign(child, {
            active: true, visible: true, isOpen: () => true
        }); g.SceneManager._scene._windowLayer.children.push(child); },
        g => { g.HallInputBlocked = true; }
    ];
    for (const block of blocks) {
        const game = loadGame(), deck = game.ProjectRCardDeck;
        deck.startCardBattle();
        const before = plain(deck.getBattleState());
        block(game);
        assert.equal(game.ProjectRCardBattleInput.canAcceptInput(), false);
        game.tap(1);
        assert.deepEqual(plain(deck.getBattleState()), before);
    }
});
test("編集欄/Consoleフォーカス/IME/修飾キーでは発動もpreventDefaultもしない", () => {
    for (const setup of [
        g => { g.document.hasFocus = () => false; },
        g => { g.document.activeElement = { tagName: "INPUT" }; },
        g => { g.document.activeElement = { tagName: "TEXTAREA" }; },
        g => { g.document.activeElement = { isContentEditable: true }; },
        g => { g.emitWindow("blur"); },
        () => ({ ctrlKey: true }), () => ({ altKey: true }), () => ({ metaKey: true }),
        () => ({ shiftKey: true }), () => ({ isComposing: true }),
        () => ({ target: { tagName: "SELECT" } })
    ]) {
        const game = loadGame(), deck = game.ProjectRCardDeck;
        deck.startCardBattle();
        const before = plain(deck.getBattleState());
        const event = game.emitKey("keydown", 1, setup(game) || {});
        game.tick();
        assert.equal(event.defaultPrevented, undefined);
        assert.deepEqual(plain(deck.getBattleState()), before);
    }
});
test("押下後に会話・Scene切替・フォーカス喪失した場合は予約入力を破棄", () => {
    for (const block of [g => { g.$gameMessage.isBusy = () => true; },
        g => { g.SceneManager.isSceneChanging = () => true; }, g => { g.emitWindow("blur"); }]) {
        const game = loadGame(), deck = game.ProjectRCardDeck;
        deck.startCardBattle();
        game.emitKey("keydown", 1);
        game.SceneManager._scene.duringUpdate = () => block(game);
        game.tick();
        game.SceneManager._scene.duringUpdate = null;
        game.$gameMessage.isBusy = () => false;
        game.SceneManager.isSceneChanging = () => false;
        game.emitWindow("focus");
        game.tick();
        assert.equal(deck.getBattleState().cooldownPile.length, 0);
    }
});
test("battle終了は山札・hand・Cooldown・入力結果・予約を破棄、恒久データを維持", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    const before = plain(deck.getPersistentData());
    deck.startCardBattle();
    game.tap(1);
    game.emitKey("keydown", 2);
    deck.endCardBattle();
    assert.equal(deck.isCardBattleActive(), false);
    assert.equal(deck.getBattleState(), null);
    assert.equal(game.ProjectRCardBattleInput.getLastResult(), null);
    deck.startCardBattle();
    game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
    deck.endCardBattle();
    game.emitKey("keyup", 2);
    game.tap(2);
    assert.deepEqual(game.legacyUses, [2]);
    assert.deepEqual(plain(deck.getPersistentData()), before);
});
test("同フレームの旧battle要求を新battleへ持ち越さない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    game.emitKey("keydown", 1);
    game.SceneManager._scene.duringUpdate = () => { deck.endCardBattle(); deck.startCardBattle(); };
    game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
});
test("handler内で終了・再開始しても残りの同時押下と旧結果を持ち越さない", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    let calls = 0;
    for (const type of ["direction", "ground", "instant", "ally"]) {
        deck.registerActivationHandler(type, () => {
            calls++;
            deck.endCardBattle();
            deck.startCardBattle();
            return { ok: true };
        });
    }
    deck.startCardBattle();
    game.emitKey("keydown", 1);
    game.emitKey("keydown", 2);
    game.tick();
    assert.equal(calls, 1);
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
    assert.equal(game.ProjectRCardBattleInput.getLastResult(), null);
});
test("handler登録は戦闘前・途中・次戦闘でも利用でき、未知種別/非関数は拒否", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    assert.equal(deck.registerActivationHandler("unknown", () => ({ ok: true })), false);
    assert.equal(deck.registerActivationHandler("instant", null), false);
    for (const type of ["direction", "ground", "instant", "ally"]) {
        assert.equal(deck.registerActivationHandler(type, () => ({ ok: false })), true);
    }
    deck.startCardBattle();
    assert.equal(deck.requestUseCard(0).reason, "activationFailed");
    deck.endCardBattle();
    deck.startCardBattle();
    assert.equal(deck.requestUseCard(0).reason, "activationFailed");
    const type = deck.definitions.card(deck.getBattleState().hand[0].cardId).targetType;
    deck.registerActivationHandler(type, () => ({ ok: true }));
    assert.equal(deck.requestUseCard(0).reason, "success");
});
test("通常時keyMapper/Gamepad/武器J入力に回帰なし、戦闘中もJは既存APIへ渡す", () => {
    const withAdapter = loadGame(), baseline = loadGame({ adapter: false });
    assert.deepEqual(plain(withAdapter.Input.keyMapper), plain(baseline.Input.keyMapper));
    assert.deepEqual(plain(withAdapter.Input.gamepadMapper), plain(baseline.Input.gamepadMapper));
    const game = withAdapter;
    game.ProjectRCardDeck.startCardBattle();
    game.emitKey("keydown", 26, { code: "KeyJ", keyCode: 74, key: "j" });
    game.tick();
    assert.equal(game.SceneManager._scene.weaponTriggered, true);
    assert.ok(game.$gameTemp.reserved.includes(1));
    assert.equal(game.ProjectRCardDeck.getBattleState().cooldownPile.length, 0);
});
test("実際の現行設定（数字CE追加なし）でも1～5を使用できテンキーは対象外", () => {
    const game = loadGame({ legacyBindings: false }), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    game.tap(1, { code: "Numpad1", keyCode: 97 });
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
    game.tap(5);
    assert.equal(game.ProjectRCardBattleInput.getLastResult().handIndex, 4);
});
test("数字キーが既存アクションへ再割当されても戦闘中だけカードへ渡し終了後は復帰", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    game.Input.keyMapper[49] = "j";
    game.tap(1);
    assert.equal(game.SceneManager._scene.weaponTriggered, true);
    deck.startCardBattle();
    game.tap(1);
    assert.equal(game.SceneManager._scene.weaponTriggered, false);
    assert.equal(game.ProjectRCardBattleInput.getLastResult().reason, "success");
    deck.endCardBattle();
    game.tap(1);
    assert.equal(game.SceneManager._scene.weaponTriggered, true);
    assert.equal(game.Input.keyMapper[49], "j");
});
test("戦闘終了直後に押しっぱなしのrepeatを旧入力へ漏らさずkeyup後に復帰", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    game.emitKey("keydown", 1);
    game.tick();
    deck.endCardBattle();
    game.emitKey("keydown", 1, { repeat: true });
    game.tick();
    assert.deepEqual(game.legacyUses, []);
    assert.deepEqual(game.$gameTemp.reserved, []);
    game.emitKey("keyup", 1);
    game.tap(1);
    assert.deepEqual(game.legacyUses, [1]);
});
test("フォーカス復帰で予約を持ち越さず、新たな押下は受付を再開", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    deck.startCardBattle();
    game.emitKey("keydown", 1);
    game.emitWindow("blur");
    game.tick();
    game.emitWindow("focus");
    game.emitKey("keydown", 1, { repeat: true });
    game.tick();
    assert.equal(deck.getBattleState().cooldownPile.length, 0);
    game.emitKey("keyup", 1);
    game.tap(1);
    assert.equal(deck.getBattleState().cooldownPile.length, 1);
});
test("戦闘中saveもPhase 1形式だけ、ロード/ニューゲームで一時状態を破棄", () => {
    const game = loadGame(), deck = game.ProjectRCardDeck;
    const before = plain(game.DataManager.makeSaveContents());
    deck.startCardBattle();
    game.tap(1);
    assert.deepEqual(plain(game.DataManager.makeSaveContents()), before);
    assert.equal(before.system._projectRCardDeckData.version, 1);
    assert.deepEqual(Object.keys(before.system._projectRCardDeckData).sort(),
        ["version", "cardOwnership", "ringOwnershipState", "ultimateSelection", "deckDefinition"].sort());
    game.emitKey("keydown", 2);
    game.DataManager.extractSaveContents(plain(before));
    assert.equal(deck.isCardBattleActive(), false);
    assert.equal(deck.getBattleState(), null);
    assert.equal(game.ProjectRCardBattleInput.getLastResult(), null);
    deck.startCardBattle();
    game.$gameSystem = new game.Game_System();
    game.$gameSystem.initialize();
    assert.equal(deck.isCardBattleActive(), false);
    assert.equal(deck.getBattleState(), null);
    assert.equal(game.ProjectRCardBattleInput.getLastResult(), null);
});
test("手動確認書のConsoleコードは本番7定義から実行でき最後に恒久データを復元", () => {
    const game = loadGame({ prepare: false, productionDefinitions: true });
    game.console = { log() {} };
    const before = plain(game.ProjectRCardDeck.getPersistentData());
    const blocks = [...read("docs/ProjectR_CardDeck_Phase2A.md").matchAll(/```js\n([\s\S]*?)```/g)].map(m => m[1]);
    assert.equal(blocks.length, 3);
    vm.runInContext(blocks[0], game);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(game.ProjectRCardDeck.getBattleState().hand.length, 5);
    game.tap(1);
    vm.runInContext(blocks[1], game);
    assert.equal(vm.runInContext("before2a === JSON.stringify(cd2a.getBattleState())", game), true);
    vm.runInContext(blocks[2], game);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(game.ProjectRCardDeck.definitions.cardDefinitions().length, 7);
    assert.deepEqual(plain(game.ProjectRCardDeck.getPersistentData()), before);
});

console.log(`# ${passed} Phase 2A tests passed`);
