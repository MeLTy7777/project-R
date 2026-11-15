"use strict";
// リアルタイム・フィールド戦闘(ProjectR_FieldCombat)の Node テスト。実ソースの ProjectR_CardDeckCore と ProjectR_FieldCombat を読み込み、
// それ以外(戦闘セッション・敵の予約・HUD・Input・マップ)は最小の stub にする。実機の確認は tools/mz_cdp/field_combat_verify.cjs。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8").replace(/\r\n/g, "\n");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const plugins = configuration.$plugins;
const deckParameters = plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters;
const fieldParameters = plugins.find(p => p.name === "ProjectR_FieldCombat").parameters;
const realCards = JSON.parse(deckParameters.CardDefinitions).map(JSON.parse);
// 実行時に CardCatalog が追加する新しいカード(一閃・絶)の代わり。固定アビリティは所持・指輪に依らないことも確かめる(どれも所持していない)。
const extraCards = [
    { cardId: "hermes_issen", ringId: "hermes", maxCopies: 3, cooldownSeconds: 7, targetType: "direction", maxLevel: 3 },
    { cardId: "hermes_zetsu", ringId: "hermes", maxCopies: 5, cooldownSeconds: 0.5, targetType: "ground", maxLevel: 3 },
    { cardId: "test_filler", ringId: "hermes", maxCopies: 3, cooldownSeconds: 1, targetType: "instant", maxLevel: 3 }       // 通常の戦闘の30枚デッキを作るための穴埋め
];
const cards = [...realCards, ...extraCards];

function loadGame({ playtest = false, soulMode, withField = true, dev = true, tag = true } = {}) {
    const noop = function() {};
    const game = {
        console, window: null, addEventListener: noop, document: { activeElement: { tagName: "BODY" }, hasFocus: () => true, addEventListener: noop },
        Utils: { isOptionValid: name => name === "test" && playtest },
        Game_System: function() {}, DataManager: { makeSaveContents: () => ({}), extractSaveContents: noop, setupNewGame: noop },
        Scene_Map: function() { this._spriteset = {}; },
        SceneManager: { isSceneChanging: () => false },
        $gameParty: { inBattle: () => false }, $gameMessage: { isBusy: () => false }, $gameTemp: { clearDestination: noop, reserved: [], reserveCommonEvent(id) { this.reserved.push(id); } },
        blocked: null, passedDown: [], passedUp: [], touchCalls: [], transfers: [], eventRunning: false, commands: new Map(), saves: 0,
        $dataMapInfos: [null, { id: 1 }, { id: 2 }, { id: 3 }], $dataSystem: { variables: new Array(60).fill("") }, $dataMap: { note: tag ? "<fieldBattleMap>" : "" }
    };
    game.window = game;
    game.Scene_Map.prototype.update = function() { game.updates = (game.updates || 0) + 1; };
    game.Scene_Map.prototype.createDisplayObjects = noop;
    game.Input = {
        dir4: 0,
        _onKeyDown(event) { game.passedDown.push(event.code); }, _onKeyUp(event) { game.passedUp.push(event.code); }, clear: noop
    };
    // マップ・主人公・敵
    const events = new Map();
    const hp = new Map();
    game.$gameMap = {
        _id: 1, mapId: () => game.$gameMap._id,
        event: id => events.get(id) || null, events: () => [...events.values()], getCurrentEventHp: id => hp.get(id) ?? 0,
        isEventRunning: () => game.eventRunning, tileWidth: () => 48, tileHeight: () => 48, adjustX: x => x, adjustY: y => y
    };
    game.Game_Map = function() {};
    game.Game_Map.prototype.setup = function(id) { game.$gameMap._id = id; events.clear(); hp.clear(); };
    game.$gameVariables = { data: {}, setValue(id, v) { this.data[id] = v; }, value(id) { return this.data[id] || 0; } };
    game.Game_System.prototype.isSaveEnabled = function() { return true; };
    game.Scene_Save = function() {}; game.Scene_Save.prototype.executeSave = function() { game.saves++; };
    game.addEnemy = (id, x, y, life = 100, note = "") => {
        const e = { _realX: x, _realY: y, _erased: false, databaseEnemy: true, eventId: () => id, isTransparent: () => false, dotMoveToPlayer() { this.moved = (this.moved || 0) + 1; }, event: () => ({ note }), page: () => ({ list: [] }) };
        e._interpreter = { parallel: true };
        events.set(id, e); hp.set(id, life); return e;
    };
    game.setEnemyHp = (id, value) => hp.set(id, value);
    game.$gamePlayer = {
        _realX: 10.4, _realY: 10.2, x: 10, y: 10, _dir: 6, direction() { return this._dir; }, setDirection(d) { this._dir = d; }, center() {},
        reserveTransfer(mapId, x, y, d, fade) { game.transfers.push({ mapId, x, y, d, fade }); game.transferring = true; },
        canMove: () => true, isTransferring: () => !!game.transferring, centerPositionPoint: () => ({ x: game.$gamePlayer._realX + 0.5, y: game.$gamePlayer._realY + 0.5 }),
        checkEventTriggerTouchFront(d) { game.touchCalls.push(d); }
    };
    // アイテム
    const potion = { id: 7, name: "ポーション", itypeId: 1, iconIndex: 176, effects: [{ code: 11, dataId: 0, value1: 0, value2: 500 }] };
    let potionCount = 3;
    const actor = { hp: 100, mhp: 544, canUse: () => true, useItem() { potionCount--; }, refresh: noop };
    game.$dataItems = [null, null, null, null, null, null, null, potion];
    game.$gameParty.leader = () => actor;
    game.$gameParty.items = () => (potionCount > 0 ? [potion] : []);
    game.$gameParty.hasItem = item => item === potion && potionCount > 0;
    game.$gameParty.numItems = item => (item === potion ? potionCount : 0);
    game.Game_Action = function() {};
    game.Game_Action.prototype.setItemObject = noop;
    game.Game_Action.prototype.testApply = () => actor.hp < actor.mhp;
    game.Game_Action.prototype.apply = () => { actor.hp = Math.min(actor.mhp, actor.hp + 500); };
    game.actor = actor; game.potionCount = () => potionCount;
    // 既存のProjectRの窓口(stub)
    const sessionSources = new Set(); const endListeners = [];
    game.ProjectRCombatSession = {
        begin(id) { if (game.sessionReject) return { ok: false, reason: "combatEventRejected" }; sessionSources.add(id); return { ok: true }; },
        end(id, reason) { if (!sessionSources.delete(id)) return false; endListeners.forEach(fn => fn({ sourceId: id, reason })); return true; },
        onEnd(fn) { endListeners.push(fn); return () => {}; }, isActive: () => sessionSources.size > 0
    };
    game.endSession = reason => game.ProjectRCombatSession.end("field_combat", reason);
    game.ProjectRCombatPresence = { isCombatEventActive: () => sessionSources.size > 0 };
    game.ProjectRCardBattleInput = { getBlockedReason: () => game.blocked, cancelPress: () => game.cancelledPress === true };
    game.attackLog = [];
    game.ProjectREnemyAttack = {
        schedule(spec) { const id = (game.attackLog.length + 1); game.attackLog.push({ id, ...spec }); game.pendingAttack = { id, eventId: spec.eventId, state: "pending", windup: spec.windupFrames, framesLeft: spec.windupFrames, area: { x: 0, y: 0, width: 1, height: 1 } }; return { ok: true, id }; },
        get: id => (game.pendingAttack && game.pendingAttack.id === id ? game.pendingAttack : null), getOutcome: id => (game.attackOutcome && game.attackOutcome.id === id ? game.attackOutcome : null),
        list: () => (game.pendingAttack ? [game.pendingAttack] : []), interrupt: () => { game.pendingAttack = null; }
    };
    game.ultimateResult = { ok: false, reason: "gaugeNotFull" };
    game.ProjectRUltimateActivation = { requestUltimateActivation: source => ({ ...game.ultimateResult, source }), getInputBinding: () => ({ key: "U", active: true }) };
    game.gauge = { current: 0, max: 100 };
    game.ProjectRUltimateGauge = { getUltimateGauge: () => game.gauge.current, getUltimateGaugeMax: () => game.gauge.max };
    game.ProjectRBattleHUD = {
        DataAdapter: class { skills() { return ["original"]; } cardCounts() { return { draw: 1 }; } },
        getCardPresentation: cardId => ({ name: cardId, iconIndex: 11, imageName: "" })
    };
    game.PluginManager = { registerCommand: (p, n, f) => game.commands.set(n, f), parameters: name => (name === "ProjectR_CardDeckCore" ? { ...deckParameters, CardDefinitions: JSON.stringify(cards.map(JSON.stringify)) }
        : name === "ProjectR_FieldCombat" ? { ...fieldParameters, ...(soulMode ? { SoulMode: soulMode } : {}) } : {}) };
    const context = vm.createContext(game);
    vm.runInContext(read("js/plugins/ProjectR_CardDeckCore.js"), context);
    game.Game_System.prototype.initialize = function() {};
    game.$gameSystem = new game.Game_System(); game.$gameSystem.initialize();
    game.SceneManager._scene = new game.Scene_Map();
    // カードの発動handler(実際の一閃・絶の代わり): 呼ばれた context を記録する。絶は「予約」(pending)を返す
    const deck = game.ProjectRCardDeck;
    game.handlerCalls = [];
    deck.registerActivationHandler("direction", ctx => { game.handlerCalls.push(ctx.definition.cardId); return game.directionResult || { ok: true }; });
    deck.registerActivationHandler("ground", ctx => { game.handlerCalls.push(ctx.definition.cardId); return { ok: true }; });
    if (withField) vm.runInContext(read("js/plugins/ProjectR_FieldCombat.js"), context);
    if (withField && dev) game.ProjectRFieldCombat.setDevAllowOutsideEncounter(true);          // 部品のテストは探索マップでも戦闘を始められる(DEV)。エンカウンターのテストは dev=false
    // 実行待ちの移動(reserveTransfer)を実行する: マップを組み直し、主人公を移動先へ置く
    game.arrive = () => {
        const t = game.transfers.shift();
        if (!t) return null;
        new game.Game_Map().setup(t.mapId);
        game.$gamePlayer.x = t.x; game.$gamePlayer.y = t.y; game.$gamePlayer._realX = t.x; game.$gamePlayer._realY = t.y; game.$gamePlayer._dir = t.d || game.$gamePlayer._dir;
        game.transferring = false;
        return t;
    };
    game.frame = (n = 1) => { for (let i = 0; i < n; i++) game.SceneManager._scene.update(); };
    game.key = (code, extra = {}) => { const event = { code, keyCode: 0, repeat: false, preventDefault() { this.defaultPrevented = true; }, ...extra }; game.Input._onKeyDown(event); return event; };
    game.keyUp = code => game.Input._onKeyUp({ code });
    return game;
}

test("固定戦闘(CardDeckCore は変更しない): 固定戦闘は山札・手札の検証なしで始まり、固定アビリティは使っても手札から消えない(所持・指輪に依らない)", () => {
    const game = loadGame();
    const deck = game.ProjectRCardDeck;
    assert.equal(deck.startCardBattle().ok, false, "従来の戦闘は、デッキが不正なら始まらない(動作は変わらない)");
    assert.equal(deck.isCardBattleActive(), false);
    assert.equal(deck.useFixedCard("hermes_issen").ok, false, "戦闘が無いと使えない");
    const started = deck.startCardBattle(deck.FIXED_BATTLE);
    assert.equal(started.ok, true);
    assert.equal(deck.isCardBattleActive(), true);
    assert.deepEqual(plain(deck.getBattleState()), { drawPile: [], hand: [], discardPile: [], cooldownPile: [] });
    assert.equal(deck.isCardOwned("hermes_issen"), false, "どのカードも所持していない");
    const first = deck.useFixedCard("hermes_issen");
    assert.equal(first.ok, true, JSON.stringify(first));
    assert.deepEqual(game.handlerCalls, ["hermes_issen"]);
    const state = plain(deck.getBattleState());
    assert.equal(state.hand.length, 1); assert.equal(state.hand[0].cardId, "hermes_issen");
    assert.equal(state.cooldownPile.length, 0, "Cooldown山へは行かない"); assert.equal(state.drawPile.length + state.discardPile.length, 0, "ドローしない");
    assert.equal(deck.useFixedCard("hermes_issen").ok, true, "何度でも使える(Cooldownは呼び出し側)");
    assert.equal(plain(deck.getBattleState()).hand.length, 1, "同じ固定アビリティは手札に1枚だけ");
    assert.equal(deck.useFixedCard("hermes_zetsu").ok, true);
    assert.equal(plain(deck.getBattleState()).hand.length, 2);
    const unknown = deck.useFixedCard("no_such_card");
    assert.equal(unknown.ok, false);
    game.directionResult = { ok: false, reason: "noTarget" };
    assert.equal(deck.useFixedCard("hermes_issen").ok, false, "handlerが失敗なら失敗(手札は変わらない)");
    deck.endCardBattle();
    assert.equal(deck.useFixedCard("hermes_issen").ok, false, "戦闘が終われば使えない");
});

test("固定戦闘: 通常の戦闘では useFixedCard は使えない(従来の手札の戦闘を変えない)", () => {
    const game = loadGame();
    const deck = game.ProjectRCardDeck;
    const all = cards.flatMap(card => Array(Number(card.maxCopies)).fill(card.cardId));
    deck.assignRingToPlayer("hermes"); deck.assignRingToPlayer("apollo");
    cards.forEach(card => deck.setCardOwned(card.cardId));
    assert.equal(deck.setDeck(all).ok, true);
    const started = deck.startCardBattle();
    assert.equal(started.ok, true, JSON.stringify(started));
    assert.equal(plain(deck.getBattleState()).hand.length, 5);
    assert.equal(deck.useFixedCard("hermes_issen").ok, false, "通常の戦闘では固定アビリティを使えない");
    deck.endCardBattle();
});

test("FieldCombat: begin/end は固定戦闘と戦闘イベントを開始・終了し、すでにカード戦闘があれば始めない", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    assert.equal(fc.isActive(), false);
    const began = plain(fc.begin());
    assert.equal(began.ok, true, JSON.stringify(began));
    assert.equal(fc.isActive(), true);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), true);
    assert.equal(game.ProjectRCombatPresence.isCombatEventActive(), true);
    assert.equal(plain(fc.begin()).reason, "alreadyActive");
    assert.equal(fc.end("test"), true);
    assert.equal(fc.isActive(), false);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false, "固定戦闘も終わる");
    assert.equal(game.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(fc.end(), false);
    game.ProjectRCardDeck.startCardBattle(game.ProjectRCardDeck.FIXED_BATTLE);      // 他の経路が持つカード戦闘
    assert.equal(plain(fc.begin()).reason, "cardBattleActive");
    game.ProjectRCardDeck.endCardBattle();
    game.sessionReject = true;
    assert.equal(plain(fc.begin()).reason, "combatEventRejected");
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false, "戦闘イベントを断られたら固定戦闘も残さない");
    game.sessionReject = false;
    game.SceneManager._scene = {};                                                      // マップのSceneでない
    assert.equal(plain(fc.begin()).reason, "mapUnavailable");
});

test("FieldCombat: マップ移動・ロード(CombatSession.endAll)や外からのカード戦闘の入れ替えで、こちらも終わる", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    fc.begin(); game.endSession("transfer");
    assert.equal(fc.isActive(), false, "CombatSessionが終われば終わる");
    fc.begin(); assert.equal(fc.isActive(), true);
    game.ProjectRCardDeck.endCardBattle(); game.frame(2);
    assert.equal(fc.isActive(), false, "カード戦闘が外から終えられたら、次のフレームで終わる");
});

test("FieldCombat: 固定アビリティの割り当て(Q 一閃 7秒 / Space 絶 3秒 / E 奥義 / R 消耗品 8秒 / C キャンセル)と、Cooldownは成功したときだけ始まる", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    const loadout = plain(fc.getLoadout());
    assert.deepEqual(["special", "mobility", "ultimate", "consumable", "cancel"].map(s => [loadout[s].key, loadout[s].cardId || loadout[s].kind]),
        [["Q", "hermes_issen"], ["Space", "hermes_zetsu"], ["E", "ultimate"], ["R", "item"], ["C", "cancel"]]);
    assert.equal(loadout.attack.key, "LMB"); assert.equal(loadout.attack.kind, "engine", "通常攻撃は既存の基本攻撃(Hendrix共通イベント)のまま");
    assert.equal(plain(fc.useAbility("special")).reason, "inactive", "戦闘外では使えない");
    fc.begin();
    const q = plain(fc.useAbility("special"));
    assert.equal(q.ok, true); assert.equal(q.cardId, "hermes_issen");
    assert.equal(plain(fc.getCooldowns()).special, 7);
    assert.equal(plain(fc.useAbility("special")).reason, "cooldown");
    assert.equal(game.handlerCalls.length, 1, "Cooldown中はカード効果を呼ばない");
    game.directionResult = { ok: false, reason: "noTarget" };
    game.frame(60 * 7 + 5);
    assert.equal(plain(fc.getCooldowns()).special, 0, "1フレーム 1/60秒ずつ進む");
    const failed = plain(fc.useAbility("special"));
    assert.equal(failed.ok, false); assert.equal(failed.reason, "abilityFailed");
    assert.equal(plain(fc.getCooldowns()).special, 0, "失敗(使えなかった)ならCooldownは始まらない");
    const z = plain(fc.useAbility("mobility"));
    assert.equal(z.ok, true); assert.equal(plain(fc.getCooldowns()).mobility, 3);
    assert.equal(plain(fc.useAbility("cancel")).ok, true);
    assert.equal(plain(fc.useAbility("attack")).reason, "invalidSlot", "通常攻撃はこのPluginが発動しない(既存の入力)");
});

test("FieldCombat: 絶の「予約(pending)」は成功として扱い、Cooldownを始める", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    const deck = game.ProjectRCardDeck;
    const base = deck.requestUseCard;
    deck.requestUseCard = function(index) {
        const card = deck.getBattleState().hand[index];
        if (card && card.cardId === "hermes_zetsu") return { ok: false, reason: "pending", pending: true, detail: "zetsuReserved" };
        return base.apply(this, arguments);
    };
    fc.begin();
    const z = plain(fc.useAbility("mobility"));
    assert.equal(z.ok, true); assert.equal(z.pending, true);
    assert.equal(plain(fc.getCooldowns()).mobility, 3);
});

test("FieldCombat: 奥義(E)はゲージが満タンでなければ発動せず、満タンなら Ultimate の窓口を呼ぶ(Cooldownは持たない)", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    fc.begin();
    const no = plain(fc.useAbility("ultimate")); assert.equal(no.ok, false); assert.equal(no.reason, "gaugeNotFull");
    game.ultimateResult = { ok: true, godId: "hermes", started: true };
    const yes = plain(fc.useAbility("ultimate")); assert.equal(yes.ok, true); assert.equal(yes.godId, "hermes");
    assert.equal(plain(fc.getCooldowns()).ultimate, 0);
    // HUDの奥義のキーもEにそろう
    assert.equal(plain(game.ProjectRUltimateActivation.getInputBinding()).key, "E");
    fc.end(); assert.equal(plain(game.ProjectRUltimateActivation.getInputBinding()).key, "U", "戦闘外はUのまま");
});

test("FieldCombat: 消耗品(R)は効果があるときだけ1個使い、満タンなら消費しない。Cooldown 8秒", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    fc.begin();
    game.actor.hp = game.actor.mhp;
    const full = plain(fc.useAbility("consumable")); assert.equal(full.ok, false); assert.equal(full.reason, "noEffect"); assert.equal(game.potionCount(), 3);
    assert.equal(plain(fc.getCooldowns()).consumable, 0);
    game.actor.hp = 100;
    const used = plain(fc.useAbility("consumable")); assert.equal(used.ok, true); assert.equal(used.itemId, 7);
    assert.equal(game.potionCount(), 2); assert.ok(game.actor.hp > 100);
    assert.equal(plain(fc.getCooldowns()).consumable, 8);
    assert.equal(plain(fc.useAbility("consumable")).reason, "cooldown");
    game.frame(60 * 8 + 3); game.actor.hp = 50;
    game.potionCount = () => 0;                                                           // 在庫なし(下の pick は $gameParty を見る)
    game.$gameParty.items = () => []; game.$gameParty.hasItem = () => false;
    assert.equal(plain(fc.useAbility("consumable")).reason, "noItem");
});

test("FieldCombat: Q/E/R/C/Space を戦闘中だけ受け取る(押しっぱなしは1回)。戦闘外・メニュー/会話中・修飾キーでは元のInputへ渡す。WASD等は常に元のまま", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    game.key("KeyQ"); game.key("Space");
    assert.deepEqual(game.passedDown, ["KeyQ", "Space"], "戦闘外は元のInputへ渡す(奪わない)");
    assert.equal(game.updates || 0, 0);
    fc.begin();
    const e = game.key("KeyQ");
    assert.equal(e.defaultPrevented, true, "戦闘中は受け取る");
    game.key("KeyQ", { repeat: true }); game.key("KeyQ");
    game.frame(1);
    assert.equal(game.handlerCalls.filter(c => c === "hermes_issen").length, 1, "押しっぱなし(リピート)は1回だけ発動");
    game.keyUp("KeyQ"); assert.deepEqual(game.passedUp, [], "受け取ったキーのkeyUpも元へ渡さない");
    game.key("KeyW"); game.key("KeyA"); game.key("KeyF"); game.key("KeyJ");
    assert.deepEqual(game.passedDown.slice(2), ["KeyW", "KeyA", "KeyF", "KeyJ"], "移動・F・Jは奪わない");
    game.blocked = "messageBusy"; game.key("Space");
    assert.equal(game.passedDown.at(-1), "Space", "メッセージ中は元のInputへ");
    game.blocked = null; game.key("KeyE", { shiftKey: true });
    assert.equal(game.passedDown.at(-1), "KeyE", "修飾キーつきは元のInputへ");
    const before = game.passedDown.length;
    game.key("KeyR"); game.key("KeyC");
    assert.equal(game.passedDown.length, before, "R/Cも戦闘中は受け取る");
    game.frame(1);
    const log = plain(fc.getLog()).filter(entry => entry.type === "cast" || entry.type === "cancel");
    assert.ok(log.some(l => l.slot === "consumable") && log.some(l => l.type === "cancel"));
    // 受け付けられない間(メニュー等)は、溜めた入力を捨てて進めない
    fc.end(); game.key("KeyQ");
    assert.equal(game.passedDown.at(-1), "KeyQ", "戦闘が終われば元へ");
});

test("FieldCombat: メニュー・会話中はCooldownが進まず、溜まった入力も発動しない", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    fc.begin(); fc.useAbility("special");
    game.blocked = "messageBusy"; game.frame(120);
    assert.equal(plain(fc.getCooldowns()).special, 7, "止まる");
    game.blocked = null; game.frame(60);
    assert.ok(Math.abs(plain(fc.getCooldowns()).special - 6) < 0.05);
});

test("FieldCombat: 戦闘中、移動キーを押しているのに進めなかったとき、押している方向の前方の接触イベントを調べる(マウス向きの固定で扉が開かない対策)", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    game.Input.dir4 = 8; game.frame(3);
    assert.deepEqual(game.touchCalls, [], "戦闘外では何もしない");
    fc.begin(); game.frame(1);
    game.Input.dir4 = 8; game.frame(2);
    assert.ok(game.touchCalls.length >= 1 && game.touchCalls.every(d => d === 8), JSON.stringify(game.touchCalls));
    const n = game.touchCalls.length;
    game.$gamePlayer._realY -= 0.1; game.frame(1);
    assert.equal(game.touchCalls.length, n, "進めているときは調べない");
    game.Input.dir4 = 0; game.frame(3);
    assert.equal(game.touchCalls.length, n, "キーを押していなければ調べない");
});

test("探索マップ: 近くに生きている敵がいても、戦闘は始まらない。エンカウンター中でなければ begin() も断る(DEVの許可を除く)", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    game.addEnemy(6, 11, 10);
    game.frame(120);
    assert.equal(fc.isActive(), false, "近くの敵だけでは始まらない(自動の戦闘開始は廃止)");
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false);
    assert.equal(plain(fc.begin()).reason, "encounterRequired");
    assert.equal(fc.isCombatAllowed(), false);
    assert.equal(plain(fc.getEncounterState()).state, "idle");
    game.key("KeyQ"); game.key("KeyE"); game.key("KeyR"); game.key("KeyC"); game.key("Space");
    assert.deepEqual(game.passedDown, ["KeyQ", "KeyE", "KeyR", "KeyC", "Space"], "戦闘外の入力は元のInputへ(移動・NPC・メニューを邪魔しない)");
    assert.equal(plain(fc.useAbility("special")).reason, "inactive");
    fc.setDevAllowOutsideEncounter(true);
    assert.equal(plain(fc.begin()).ok, true, "DEVの許可があれば手動で始められる");
    game.setEnemyHp(6, 0); game.frame(60 * 6);
    assert.equal(fc.isActive(), true, "手動(DEV)の戦闘は、敵がいなくなっても自動では終わらない");
});

test("敵の視界: 距離・視野角・壁/閉じた扉。見えている間だけ追う・攻撃する。見失うとすぐ止まる(位置を覚えない)。見えるようになれば、また追う", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    // 視線の判定は ProjectR_CombatOcclusion(stub: 壁を差し替えられる)
    let wall = false; const losCalls = [];
    game.ProjectR = game.ProjectR || {};
    game.ProjectR.CombatOcclusion = { hasLineOfSight: (from, to, o) => { losCalls.push({ from, to, o }); return !wall; } };
    const enemy = game.addEnemy(3, 10.4, 4.2);                      // プレイヤー(10.4, 10.2)の北 6 tile
    enemy._direction = 2; enemy.direction = function() { return this._direction; }; enemy.setDirection = function(d) { this._direction = d; };
    fc.begin();
    assert.deepEqual(plain(fc.getPerception()), { enabled: true, sightTiles: 10, fovDegrees: 140 }, "既定: 有効・10 tile・140°");
    assert.equal(plain(fc.attachEnemy(3)).ok, true);
    game.frame(3);
    assert.ok(enemy.moved >= 3, "見えている(距離内・視野角内・視線あり)ので追う");
    assert.deepEqual(plain(fc.getEnemyPerception(3)).aware, true);
    assert.equal(enemy.direction(), 2, "プレイヤーの方(南)を向く");
    assert.equal(losCalls[0].o.mode, "vision", "視線の判定は vision モード(壁と、<VisionWall> の扉。戦闘の壁ではない)");
    assert.deepEqual(plain(losCalls[0].o.ignoreEventIds), [3]);
    // 壁・閉じた扉で視線が切れる → すぐ止まる(追跡の目標は持たない)
    wall = true; const moved = enemy.moved; game.frame(5);
    assert.equal(enemy.moved, moved, "見失った瞬間から、動かない");
    let p = plain(fc.getEnemyPerception(3)); assert.equal(p.aware, false); assert.equal(p.reason, "blocked"); assert.equal(p.losses, 1);
    game.$gamePlayer._realX = 3; game.$gamePlayer._realY = 12; game.frame(10);
    assert.equal(enemy.moved, moved, "見失っている間は、プレイヤーがどこへ動いても、動かない・向きも変えない(位置を覚えない・探さない)");
    assert.equal(enemy.direction(), 2);
    // 視線が戻る → また見つけて追う
    wall = false; game.$gamePlayer._realX = 10.4; game.$gamePlayer._realY = 10.2; game.frame(3);
    assert.ok(enemy.moved > moved, "視線が戻ると、また追う"); p = plain(fc.getEnemyPerception(3)); assert.equal(p.aware, true); assert.equal(p.acquired, 2);
    // 距離
    fc.setPerception({ sightTiles: 3 }); const m1 = enemy.moved; game.frame(3);
    p = plain(fc.getEnemyPerception(3)); assert.equal(p.reason, "range"); assert.equal(enemy.moved, m1, "距離の外(6 > 3)は追わない");
    fc.setPerception({ sightTiles: 10 });
    // 視野角: 見つける瞬間だけ。背を向けている敵は、視線が通っていても見つけない
    enemy._realX = 10.4; enemy._realY = 4.2; enemy._direction = 8; game.frame(3);
    p = plain(fc.getEnemyPerception(3)); assert.equal(p.aware, false, "見失った(距離の外)あとなので、視野角を見る");
    const m2 = enemy.moved; game.frame(3);
    p = plain(fc.getEnemyPerception(3)); assert.equal(p.reason, enemy.direction() === 8 ? "fov" : "seen");
    assert.equal(enemy.moved, m2, "北向き(プレイヤーは南)= 視野角 140° の外。見つけない");
    enemy._direction = 2; game.frame(2); assert.equal(plain(fc.getEnemyPerception(3)).aware, true, "向きが合えば見つける");
    enemy._direction = 8; game.frame(2); assert.equal(plain(fc.getEnemyPerception(3)).aware, true, "見つけたあとは、向きを変えても追う(プレイヤーの方を向き直す)"); assert.equal(enemy.direction(), 2);
    // 敵ごとの設定は、全体の設定より優先(タグ sight / fov・attachEnemy のオプション)
    fc.detachEnemy(3); fc.attachEnemy(3, { sightTiles: 12, fovDegrees: 360 }); fc.setPerception({ sightTiles: 2, fovDegrees: 30 });
    p = plain(fc.getEnemyPerception(3)); assert.deepEqual([p.sightTiles, p.fovDegrees], [12, 360]);
    fc.resetPerception(); assert.deepEqual(plain(fc.getPerception()), { enabled: true, sightTiles: 10, fovDegrees: 140 });
});

test("敵の視界: 攻撃は見えているときだけ・EnemyPerception=false は従来どおり(壁越しでも追う)・霧(FogOfWar)とは無関係・CombatOcclusion がなければ視線は通る", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    let wall = true;
    game.ProjectR = game.ProjectR || {};
    game.ProjectR.CombatOcclusion = { hasLineOfSight: () => !wall };
    game.ProjectR.FogOfWar = { isEventVisible: () => false, isPointVisible: () => false, getTileState: () => "unexplored" };     // 霧は「何も見えない」と答える
    const enemy = game.addEnemy(3, 10.4, 9.2);                      // プレイヤーのすぐ北(距離 1)
    enemy._direction = 2; enemy.direction = function() { return this._direction; }; enemy.setDirection = function(d) { this._direction = d; };
    fc.begin(); fc.attachEnemy(3, { windupFrames: 20, cooldownFrames: 30 });
    game.frame(5);
    assert.equal(game.attackLog.length, 0, "壁(閉じた扉)越しは、届く距離でも攻撃しない(見えていない)");
    wall = false; game.frame(2);
    assert.equal(game.attackLog.length, 1, "見えれば、従来どおり予約する(霧が何も見えないと答えても)");
    // 従来(EnemyPerception=false)
    fc.end("t"); fc.begin();
    const e2 = game.addEnemy(4, 10.4, 5.2); e2._direction = 8; e2.direction = function() { return this._direction; };
    fc.attachEnemy(4, { aggroTiles: 10 }); wall = true; fc.setPerception({ enabled: false }); game.frame(4);
    assert.ok(e2.moved >= 4, "視界を切ると、壁越し・背を向けていても、距離内なら追う(従来)");
    assert.equal(plain(fc.getEnemyPerception(4)).aware, false, "気づいている状態の管理は使わない");
    fc.resetPerception();
    // CombatOcclusion がなければ(stub)視線は通るものとして扱う(距離・視野角だけ)
    delete game.ProjectR.CombatOcclusion;
    e2._direction = 2; game.frame(2); const q = plain(fc.getEnemyPerception(4)); assert.equal(q.canSeeNow, true);
    // 敵の視界の判定が FogOfWar を使わないこと(ソース)
    const src = fs.readFileSync(path.join(project, "js/plugins/ProjectR_FieldCombat.js"), "utf8");
    const body = src.slice(src.indexOf("const perceive = "), src.indexOf("const getEnemyPerception"));
    assert.ok(body.includes("hasLineOfSight") && !/fog\(|FogOfWar|isEventVisible|isPointVisible/.test(body), "敵の視界は CombatOcclusion だけ(プレイヤーの霧とは無関係)");
});

test("敵の視界: <fieldEnemy: sight=, fov=> と AttachFieldEnemy の引数・パラメータの既定", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    game.addEnemy(7, 5, 5, 100, "<hp: A>\n<enemy>\n<fieldEnemy: sight=6, fov=90>");
    game.addEnemy(8, 6, 5, 100, "<hp: A>\n<enemy>\n<fieldEnemy: aggro=7>");                     // 旧名 aggro は距離として使う
    game.addEnemy(9, 7, 5, 100, "<hp: A>\n<enemy>\n<fieldEnemy>");
    fc.begin(); game.frame(1);
    const read = id => plain(fc.getEnemyPerception(id));
    const src = fs.readFileSync(path.join(project, "js/plugins/ProjectR_FieldCombat.js"), "utf8");
    assert.match(src, /key === "sight"\) o\.sightTiles = Number\(v\)/); assert.match(src, /key === "fov"\) o\.fovDegrees = Number\(v\)/);
    // 実際に付けて読む
    fc.attachEnemy(7, { sightTiles: 6, fovDegrees: 90 }); fc.attachEnemy(8, { aggroTiles: 7 }); fc.attachEnemy(9);
    assert.deepEqual([read(7).sightTiles, read(7).fovDegrees], [6, 90]);
    assert.deepEqual([read(8).sightTiles, read(8).fovDegrees], [7, 140], "aggro は視界の距離にもなる");
    assert.deepEqual([read(9).sightTiles, read(9).fovDegrees], [10, 140], "省略はパラメータの既定");
    assert.match(src, /@param EnemyPerception[\s\S]*@default true/); assert.match(src, /@param EnemySightTiles[\s\S]*@default 10/); assert.match(src, /@param EnemyFovDegrees[\s\S]*@default 140/);
    assert.match(src, /@arg sightTiles/); assert.match(src, /@arg fovDegrees/);
});

test("FieldCombat: 敵の行動 = 近づく → 範囲に入ったら予約(溜め=予兆)→ 実行後にCooldown。元の並列ページの攻撃は止める。溜めの間は動かない", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    const enemy = game.addEnemy(3, 14, 10);
    fc.begin();
    assert.equal(plain(fc.attachEnemy(99)).reason, "eventMissing");
    assert.equal(plain(fc.attachEnemy(3, { windupFrames: 30, cooldownFrames: 50 })).ok, true);
    assert.equal(enemy._interpreter, null, "元の並列ページの攻撃(二重攻撃)を止める");
    game.frame(5);
    assert.ok(enemy.moved >= 1, "離れていれば近づく");
    assert.equal(game.attackLog.length, 0, "範囲の外では攻撃しない");
    enemy._realX = 10.8; enemy._realY = 10; game.frame(2);
    assert.equal(game.attackLog.length, 1, "範囲に入ったら予約する");
    assert.equal(game.attackLog[0].kind, "melee"); assert.equal(game.attackLog[0].windupFrames, 30);
    const moved = enemy.moved; game.frame(5);
    assert.equal(enemy.moved, moved, "溜めの間は動かない");
    assert.equal(plain(fc.getHudState()).telegraphs, 1, "溜めの間、予兆の記録がある");
    game.pendingAttack = null; game.attackOutcome = { id: 1, state: "fired" }; game.frame(2);
    assert.equal(plain(fc.getState()).enemies[0].attacks, 1);
    game.frame(5); assert.equal(game.attackLog.length, 1, "Cooldownの間は再び予約しない");
    game.frame(60); assert.equal(game.attackLog.length, 2, "Cooldownが明けたらまた予約する");
    game.setEnemyHp(3, 0); game.frame(3);
    assert.deepEqual(plain(fc.listEnemies()), [], "倒れた敵の行動は外れる");
});

test("FieldCombat: BattleHUDの5枠は、戦闘中だけ固定アビリティ(Q/Space/E/R/C)を返し、DRAW/DISCARD表示は出さない。戦闘外は元のまま", () => {
    const game = loadGame();
    const fc = game.ProjectRFieldCombat;
    const adapter = new game.ProjectRBattleHUD.DataAdapter();
    assert.deepEqual(plain(adapter.skills()), ["original"]); assert.deepEqual(plain(adapter.cardCounts()), { draw: 1 });
    fc.begin();
    const slots = plain(adapter.skills());
    assert.deepEqual(slots.map(s => s.key), ["Q", "Space", "E", "R", "C"]);
    assert.deepEqual(slots.map(s => s.name).slice(0, 2), ["一閃", "絶"]);
    assert.ok(slots.every(s => s.mode === "field"));
    assert.equal(adapter.cardCounts(), null);
    fc.useAbility("special");
    const after = plain(adapter.skills());
    assert.equal(after[0].cooldown.active, true); assert.equal(after[0].cooldown.total, 7); assert.equal(after[0].disabled, true);
    assert.equal(after[1].disabled, false, "使えるスロットは有効");
    game.gauge.current = 100; assert.equal(plain(adapter.skills())[2].disabled, false, "ゲージが満タンなら奥義が有効");
    fc.end(); assert.deepEqual(plain(adapter.skills()), ["original"]);
});

test("FieldCombat: SOUL戦闘の開始許可 = off(既定)は常に断る / dev は Playtest のときだけ / on は許す。コードは消さない", () => {
    for (const [mode, playtest, expected] of [["off", true, false], ["off", false, false], ["dev", true, true], ["dev", false, false], ["on", false, true]]) {
        const game = loadGame({ soulMode: mode, playtest });
        assert.equal(game.ProjectRFieldCombat.isSoulAllowed(), expected, `${mode} playtest=${playtest}`);
    }
    const game = loadGame();
    assert.equal(game.ProjectRFieldCombat.getSoulMode(), "off", "plugins.js の既定は off(通常のプレイではSOUL戦闘を始めない)");
    assert.equal(game.ProjectRFieldCombat.isSoulAllowed(), false);
    assert.equal(game.ProjectRFieldCombat.setSoulMode("bad"), false); assert.equal(game.ProjectRFieldCombat.getSoulMode(), "off");
    assert.equal(game.ProjectRFieldCombat.setSoulMode("on"), true); assert.equal(game.ProjectRFieldCombat.isSoulAllowed(), true);
    // 入口のガード: FieldCombat が無ければ従来どおり(テストの世界・古い構成を壊さない)。あれば断る。SOUL本体は残っている。
    const encounter = read("js/plugins/ProjectR_SoulEncounter.js"), entry = read("js/plugins/ProjectR_SoulTestEntry.js");
    assert.match(encounter, /root\.ProjectRFieldCombat && typeof root\.ProjectRFieldCombat\.isSoulAllowed === "function" && root\.ProjectRFieldCombat\.isSoulAllowed\(\) === false/);
    assert.match(encounter, /reason: "soulDisabled"/);
    assert.match(entry, /fieldCombat\.isSoulAllowed\(\) === false && \$gameMap\.mapId\(\) !== config\.mapId/, "テストマップへ入る入口だけ止め、元の場所へ戻るのは止めない");
    // SoulEncounter は常にある。SoulRush などの SOUL 開発のプラグインは、まだコミットされていない構成(クリーンなチェックアウト)では登録もファイルも無いので、plugins.js に登録されているものだけ「残っている」を確かめる
    const registered = new Set(plugins.map(p => p.name));
    for (const file of ["ProjectR_SoulBattle", "ProjectR_SoulRush", "ProjectR_SoulSlash", "ProjectR_SoulLoadout", "ProjectR_SoulEncounter"]) if (file === "ProjectR_SoulEncounter" || registered.has(file)) assert.ok(fs.existsSync(path.join(project, "js/plugins", file + ".js")), file + " は残っている");
});

test("登録: FieldCombat は既存の入力・敵・HUD・SOUL の後に読み込まれ、既定は SOUL off / 自動開始 / 固定アビリティのCooldown。Chromium 85 の構文", () => {
    const names = plugins.map(p => p.name);
    const at = name => names.indexOf(name);
    assert.ok(at("ProjectR_FieldCombat") > 0 && plugins[at("ProjectR_FieldCombat")].status === true);
    for (const dep of ["ProjectR_CardDeckCore", "ProjectR_CombatSession", "ProjectR_CombatPresence", "ProjectR_CardBattleInput", "ProjectR_UltimateActivation", "ProjectR_HermesZetsu", "ProjectR_HermesIssen", "ProjectR_EnemyAttack", "ProjectR_BattleHUD", "ProjectR_SoulEncounter", "ProjectR_SoulDevBoss"]) {
        if (dep === "ProjectR_SoulDevBoss" && at(dep) < 0) continue;      // SOUL 開発の DEV 用プラグイン(未コミットの構成では登録が無い)。登録されているなら、FieldCombat はその後
        assert.ok(at(dep) >= 0 && at(dep) < at("ProjectR_FieldCombat"), dep + " より後");
    }
    assert.deepEqual(plain(fieldParameters), { SoulMode: "off", EnforceEncounterOnly: "true", RequireBattleMapTag: "true", DevAllowOutsideEncounter: "false", SpecialCooldown: "7", MobilityCooldown: "3", ConsumableCooldown: "8", ConsumableItemId: "0" });
    assert.ok(fs.existsSync(path.join(project, "js/plugins/ProjectR_FieldCombat.js")));
    const src = read("js/plugins/ProjectR_FieldCombat.js").replace(/\/\*[\s\S]*?\*\//, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/\?\?=|\|\|=|&&=|#\w+\s*[;=(]|\.at\(|replaceAll\(/.test(src), "Chromium 85 で使えない構文(??= ||= #private .at replaceAll)を使わない");
    new vm.Script(read("js/plugins/ProjectR_FieldCombat.js"));
});

// ---------------------------------------------------------------- 戦争の霧(ProjectR_FogOfWar)との連携 ----------------------------------------------------------------
function withFog(game) {
    const hidden = new Set();
    game.ProjectR = game.ProjectR || {};
    game.ProjectR.FogOfWar = { isEventVisible: e => !e || !hidden.has(e.eventId()) };
    return hidden;
}

test("霧: 隠れた敵のAIは止まらず、見えるかどうかは戦闘の開始・終了に関係しない(戦闘はエンカウンターだけが決める)", () => {
    const game = loadGame({ dev: false });
    const hidden = withFog(game), fc = game.ProjectRFieldCombat;
    game.addEnemy(6, 14, 10); hidden.add(6);
    game.frame(30);
    assert.equal(fc.isActive(), false, "隠れた敵でも見えている敵でも、探索マップでは始まらない");
    hidden.delete(6); game.frame(30);
    assert.equal(fc.isActive(), false);
});

test("霧: 予兆(赤い範囲)・見えている敵の一覧・HUDの予兆数は、隠れた敵をもらさない。敵のAIは戦闘外でも・隠れていても止まらない", () => {
    const game = loadGame();
    const hidden = withFog(game), fc = game.ProjectRFieldCombat;
    const enemy = game.addEnemy(3, 14, 10);

    assert.equal(plain(fc.attachEnemy(3, { windupFrames: 30, cooldownFrames: 50 })).ok, true);
    hidden.add(3);
    game.frame(5);
    assert.ok(enemy.moved >= 1, "戦闘外でも、隠れていても、追いかける(AIは止まらない)");
    enemy._realX = 10.8; enemy._realY = 10; game.frame(2);
    assert.equal(game.attackLog.length, 1, "隠れていても予約(溜め → 攻撃)は続く");
    fc.begin();
    assert.equal(plain(fc.getHudState()).telegraphs, 0, "隠れた敵の予兆は数えない・描かない");
    assert.deepEqual(plain(fc.getVisibleEnemies()), []);
    hidden.delete(3);
    assert.equal(plain(fc.getHudState()).telegraphs, 1, "見えれば予兆が出る");
    assert.deepEqual(plain(fc.getVisibleEnemies()), [3]);
    assert.deepEqual(plain(fc.listEnemies()), [3], "敵の行動自体は見え方に関係なく続く");
    // 霧が無い(未読み込み)ときは、従来どおり全部見える
    delete game.ProjectR.FogOfWar; assert.equal(plain(fc.getHudState()).telegraphs, 1); assert.deepEqual(plain(fc.getVisibleEnemies()), [3]);
});

// ---------------------------------------------------------------- エンカウンター(戦闘マップ) ----------------------------------------------------------------
const BATTLE = 2;
const startArgs = (extra = {}) => ({ encounterId: "t1", battleMapId: String(BATTLE), spawnX: "5", spawnY: "6", direction: "8", resultVariableId: "22", victoryCommonEventId: "9", otherCommonEventId: "10", ...extra });
const FIGHTER = "<hp: ゴブリン>\n<enemy>\n<fieldEnemy>";
// 探索マップ(Map1)で開始 → 戦闘マップ(Map2)へ移動 → 敵を置く(戦闘マップの敵は、マップを組み直すたびに作り直す)
function enterBattle(game, { enemies = [[31, 8, 6, FIGHTER]] } = {}) {
    const fc = game.ProjectRFieldCombat;
    game.commands.get("StartFieldEncounter")(startArgs());
    assert.equal(game.transfers.length, 1);
    game.arrive();
    for (const [id, x, y, note] of enemies) game.addEnemy(id, x, y, 100, note);
    game.frame(5);
    return fc;
}

test("エンカウンター: 開始で元のマップ・位置・向きを記録し、戦闘マップへ移動する。戦闘は、戦闘マップの準備が終わってから始まる", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    game.$gamePlayer._realX = 10.4; game.$gamePlayer._realY = 10.2; game.$gamePlayer.x = 10; game.$gamePlayer.y = 10; game.$gamePlayer._dir = 6;
    game.commands.get("StartFieldEncounter")(startArgs());
    let st = plain(fc.getEncounterState());
    assert.equal(st.state, "entering");
    assert.deepEqual(st.origin, { mapId: 1, x: 10, y: 10, realX: 10.4, realY: 10.2, direction: 6 }, "移動の前に、元のマップ・位置・向き(実座標も)を記録");
    assert.deepEqual(plain(game.transfers[0]), { mapId: 2, x: 5, y: 6, d: 8, fade: 0 });
    assert.equal(st.saveBlocked, true, "エンカウンター中はセーブできない");
    assert.equal(game.$gameVariables.value(22), 0, "戦闘中の結果の変数は 0");
    game.frame(30);
    assert.equal(fc.isActive(), false, "移動が実行されるまで(元のマップにいる間)は戦闘を始めない");
    game.arrive();
    game.addEnemy(31, 8, 6, 100, "<hp: ゴブリン>\n<enemy>\n<fieldEnemy: windup=20, cooldown=30>");
    game.eventRunning = true; game.frame(30);
    assert.equal(fc.isActive(), false, "到着時のイベントが動いている間は始めない");
    game.eventRunning = false; game.frame(2);
    assert.equal(fc.isActive(), false, "準備が終わって数フレーム待つ");
    game.frame(3);
    st = plain(fc.getEncounterState());
    assert.equal(st.state, "fighting"); assert.equal(fc.isActive(), true); assert.equal(fc.isCombatAllowed(), true);
    assert.deepEqual(st.enemies, [31], "<fieldEnemy> のイベントに、敵の行動がつく");
    assert.equal(plain(fc.getState()).enemies[0].eventId, 31);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), true); assert.equal(game.ProjectRCombatPresence.isCombatEventActive(), true);
    assert.equal(plain(fc.useAbility("special")).ok, true, "アビリティが使える");
});

test("エンカウンター: 敵を全員倒すと勝利。結果は1回だけ。戦闘を片づけ、元のマップ・位置・向きへ戻り、変数・コモンイベントを処理する", () => {
    const game = loadGame({ dev: false });
    game.$gamePlayer._realX = 10.4; game.$gamePlayer._realY = 10.2;
    const fc = enterBattle(game, { enemies: [[31, 8, 6, FIGHTER], [32, 9, 6, FIGHTER]] });
    const results = []; fc.onEncounterResult(r => results.push(plain(r)));
    game.frame(5);
    assert.equal(plain(fc.getEncounterState()).state, "fighting");
    const origin = plain(fc.getEncounterState()).origin;
    game.setEnemyHp(31, 0); game.frame(30);
    assert.equal(plain(fc.getEncounterState()).state, "fighting", "全員ではないので続く");
    game.setEnemyHp(32, 0); game.frame(30);
    assert.equal(plain(fc.getEncounterState()).state, "leaving", "全員倒したら勝利 → 戻る");
    assert.equal(fc.isActive(), false, "戦闘は片づく(アビリティ・敵の行動・HUDが止まる)");
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false); assert.equal(game.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.deepEqual(plain(fc.listEnemies()), []);
    assert.deepEqual(plain(game.transfers[0]), { mapId: 1, x: origin.x, y: origin.y, d: origin.direction, fade: 0 }, "元のマップ・位置・向きへ戻る移動を予約");
    assert.equal(game.$gameVariables.value(22), 0, "結果は、戻ってから");
    assert.equal(game.$gameTemp.reserved.length, 0);
    game.frame(10);
    assert.equal(plain(fc.getEncounterState()).state, "leaving", "戻る移動が実行されるまで待つ");
    game.arrive();
    game.$gamePlayer._dir = 2;                                                                    // 移動のあとの向きが違っていても、元の向きへ戻す
    game.frame(2);
    assert.equal(plain(fc.getEncounterState()).state, "idle");
    assert.deepEqual([game.$gamePlayer._realX, game.$gamePlayer._realY, game.$gamePlayer.direction()], [10.4, 10.2, 6], "元の位置(実座標)・向きへ戻る");
    assert.equal(game.$gameVariables.value(22), 1, "結果の変数 = 勝利(1)");
    assert.deepEqual(plain(game.$gameTemp.reserved), [9], "勝利のコモンイベントを1回だけ");
    assert.equal(results.length, 1); assert.equal(results[0].result, "victory");
    game.frame(120);
    assert.deepEqual(plain(game.$gameTemp.reserved), [9], "二重に処理しない");
    assert.equal(plain(fc.getEncounterState()).saveBlocked, false, "セーブ禁止が解ける");
    assert.equal(fc.isActive(), false); assert.equal(fc.isCombatAllowed(), false, "探索マップでは戦闘が無効に戻る");
    assert.equal(plain(fc.begin()).reason, "encounterRequired");
});

test("エンカウンター: 敗北(HP 0)は自動では戻らない。戦闘は片づき、結果=敗北を1回だけ。セーブ禁止は続き、ロードで初期状態へ戻る", () => {
    const game = loadGame({ dev: false });
    game.ProjectR = { PlayerDeath: { isDead: () => game.dead === true } };
    const fc = enterBattle(game);
    game.frame(5);
    assert.equal(fc.isActive(), true);
    const results = []; fc.onEncounterResult(r => results.push(plain(r)));
    game.dead = true; game.frame(3);
    const st = plain(fc.getEncounterState());
    assert.equal(st.state, "defeat"); assert.equal(fc.isActive(), false, "戦闘は片づく");
    assert.equal(game.transfers.length, 0, "自動では元のマップへ戻らない");
    assert.equal(game.$gameVariables.value(22), 2, "結果の変数 = 敗北(2)");
    assert.equal(st.saveBlocked, true); assert.equal(game.$gameSystem.isSaveEnabled(), false, "セーブできない");
    const scene = new game.Scene_Save(); scene.executeSave(); assert.equal(game.saves, 0, "Scene_Save も保存しない");
    game.frame(120);
    assert.equal(results.length, 1, "結果は1回だけ"); assert.equal(plain(fc.getEncounterState()).state, "defeat");
    assert.equal(fc.isCombatAllowed(), false); assert.equal(plain(fc.useAbility("special")).reason, "inactive");
    // ロード(= extractSaveContents): すべて初期状態
    game.dead = false;
    game.DataManager.extractSaveContents({ system: game.$gameSystem });
    assert.equal(plain(fc.getEncounterState()).state, "idle"); assert.equal(game.$gameSystem.isSaveEnabled(), true);
    assert.equal(fc.isCombatAllowed(), false);
});

test("エンカウンター: 中断・撤退・特別な終わり方(CompleteFieldEncounter)は戦闘マップから元のマップへ戻る。まだ移動していない(armed)なら取り消すだけ", () => {
    const game = loadGame({ dev: false });
    const fc = enterBattle(game);
    game.frame(5);
    game.commands.get("AbortFieldEncounter")();
    assert.equal(plain(fc.getEncounterState()).state, "leaving"); assert.equal(fc.isActive(), false);
    game.arrive(); game.frame(2);
    assert.equal(plain(fc.getEncounterState()).state, "idle"); assert.equal(game.$gameVariables.value(22), 3, "結果 = 中断(3)");
    assert.deepEqual(plain(game.$gameTemp.reserved), [10], "中断のコモンイベント");
    // 撤退(CompleteFieldEncounter other)
    const g2 = loadGame({ dev: false }); const fc2 = enterBattle(g2); g2.frame(5);
    g2.commands.get("CompleteFieldEncounter")({ result: "other" });
    g2.arrive(); g2.frame(2);
    assert.equal(g2.$gameVariables.value(22), 3); assert.equal(fc2.isActive(), false);
    // 勝利の指定(ボス戦などの特別な終わり方): 敵が1体もいなくても、勝手には終わらない
    const g3 = loadGame({ dev: false }); const fc3 = enterBattle(g3, { enemies: [] }); g3.frame(5);
    assert.equal(plain(fc3.getEncounterState()).state, "fighting");
    g3.frame(60); assert.equal(plain(fc3.getEncounterState()).state, "fighting");
    g3.commands.get("CompleteFieldEncounter")({ result: "victory" }); g3.arrive(); g3.frame(2);
    assert.equal(g3.$gameVariables.value(22), 1);
    // 戦闘マップへ移動する前(armed): 取り消すだけ(移動しない・結果=中断)
    const g4 = loadGame({ dev: false });
    assert.equal(plain(g4.ProjectRFieldCombat.startEncounter({ resultVariableId: 22 })).ok, true);
    assert.equal(plain(g4.ProjectRFieldCombat.getEncounterState()).state, "armed");
    assert.equal(g4.ProjectRFieldCombat.abortEncounter("t"), true);
    assert.equal(plain(g4.ProjectRFieldCombat.getEncounterState()).state, "idle"); assert.equal(g4.transfers.length, 0);
    assert.equal(g4.$gameVariables.value(22), 3);
});

test("エンカウンター: TransferToBattleMap(開始と移動を分ける)・不正な指定と二重開始の拒否・戦闘マップの印(<fieldBattleMap>)の確認", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    assert.equal(plain(fc.transferToBattleMap({ battleMapId: 2 })).reason, "notArmed", "開始前は移動できない");
    assert.equal(plain(fc.startEncounter({ battleMapId: 99 })).reason, "unknownBattleMap");
    assert.equal(plain(fc.startEncounter({ battleMapId: 1 })).reason, "battleMapIsCurrentMap", "いまのマップは戦闘マップにできない");
    assert.equal(plain(fc.startEncounter({ resultVariableId: 999 })).reason, "invalidResultVariable");
    assert.equal(plain(fc.getEncounterState()).state, "idle", "断ったら何も変えない");
    assert.equal(game.transfers.length, 0);
    game.commands.get("StartFieldEncounter")({ encounterId: "split", battleMapId: "0", resultVariableId: "22" });
    assert.equal(plain(fc.getEncounterState()).state, "armed", "戦闘マップを指定しなければ armed で待つ");
    assert.equal(plain(fc.startEncounter({ battleMapId: 2 })).reason, "encounterActive", "二重の開始は断る");
    game.commands.get("TransferToBattleMap")({ battleMapId: "2", spawnX: "3", spawnY: "4", direction: "4" });
    assert.deepEqual(plain(game.transfers[0]), { mapId: 2, x: 3, y: 4, d: 4, fade: 0 });
    game.arrive(); game.frame(8);
    assert.equal(plain(fc.getEncounterState()).state, "fighting");
    // 印の無いマップは戦闘マップとして使わない(戦闘を始めず、元へ戻る)
    const bad = loadGame({ dev: false, tag: false });
    bad.commands.get("StartFieldEncounter")(startArgs()); bad.arrive(); bad.frame(8);
    assert.equal(bad.ProjectRFieldCombat.isActive(), false, "印の無いマップでは戦闘を始めない");
    assert.equal(plain(bad.ProjectRFieldCombat.getEncounterState()).state, "leaving"); assert.equal(bad.transfers.length, 1);
    bad.arrive(); bad.frame(2); assert.equal(bad.$gameVariables.value(22), 3);
});

test("エンカウンター: 想定外のマップ移動・外からの戦闘の終了・ロード・ニューゲームで、戦闘が探索マップに残らない。3回繰り返しても毎回きれい", () => {
    const game = loadGame({ dev: false });
    const fc = enterBattle(game); game.frame(5);
    assert.equal(fc.isActive(), true);
    new game.Game_Map().setup(3);                                                                  // 想定外(戦闘マップでも元のマップでもない)
    game.frame(2);
    assert.equal(plain(fc.getEncounterState()).state, "idle"); assert.equal(fc.isActive(), false);
    assert.equal(game.ProjectRCardDeck.isCardBattleActive(), false); assert.equal(game.$gameSystem.isSaveEnabled(), true);
    assert.equal(game.$gameVariables.value(22), 3, "結果 = 中断を1回だけ");
    assert.equal(fc.isCombatAllowed(), false);
    // 戦闘が外から終えられた(CombatSession.endAll など)ら、戻って片づく
    const g2 = loadGame({ dev: false }); const fc2 = enterBattle(g2); g2.frame(5);
    g2.endSession("external"); g2.frame(3);
    assert.equal(plain(fc2.getEncounterState()).state, "leaving"); assert.equal(fc2.isActive(), false);
    // 移動の途中(entering)にロード / ニューゲーム
    const g3 = loadGame({ dev: false });
    g3.commands.get("StartFieldEncounter")(startArgs());
    g3.DataManager.extractSaveContents({ system: g3.$gameSystem });
    assert.equal(plain(g3.ProjectRFieldCombat.getEncounterState()).state, "idle"); g3.transferring = false;
    g3.frame(60); assert.equal(g3.ProjectRFieldCombat.isActive(), false);
    g3.commands.get("StartFieldEncounter")(startArgs()); g3.DataManager.setupNewGame();
    assert.equal(plain(g3.ProjectRFieldCombat.getEncounterState()).state, "idle");
    // 繰り返し: 3回続けても、毎回きれいに始まり・終わる
    const g4 = loadGame({ dev: false }); const fc4 = g4.ProjectRFieldCombat;
    for (let i = 1; i <= 3; i++) {
        g4.commands.get("StartFieldEncounter")(startArgs()); g4.arrive();
        g4.addEnemy(31, 8, 6, 100, FIGHTER); g4.frame(6);
        assert.equal(plain(fc4.getEncounterState()).state, "fighting", "回 " + i);
        assert.equal(plain(fc4.useAbility("special")).ok, true); g4.setEnemyHp(31, 0); g4.frame(30);
        g4.arrive(); g4.frame(3);
        assert.equal(plain(fc4.getEncounterState()).state, "idle");
        assert.equal(fc4.isActive(), false); assert.equal(fc4.isCombatAllowed(), false); assert.equal(g4.$gameSystem.isSaveEnabled(), true);
        assert.equal(g4.ProjectRCardDeck.isCardBattleActive(), false);
    }
    assert.equal(g4.$gameVariables.value(22), 1);
    assert.equal(plain(fc4.getEncounterState()).serial, 3);
});

test("エンカウンター: 戦闘マップの敵は、イベントのメモ・注釈の <fieldEnemy: ...> と AttachFieldEnemy コマンドで設定する(F8不要)。印の無いイベントは敵にならない", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    game.commands.get("StartFieldEncounter")(startArgs()); game.arrive();
    game.addEnemy(31, 8, 6, 100, "<hp: A>\n<enemy>\n<fieldEnemy: windup=20, cooldown=33, reach=1.5, aggro=7, chase=0>");
    game.addEnemy(32, 9, 6, 100, "<hp: A>\n<enemy>");                                          // 印なし
    const withComment = game.addEnemy(33, 10, 6, 100, "<hp: A>\n<enemy>"); withComment.page = () => ({ list: [{ code: 108, parameters: ["<fieldEnemy>"] }, { code: 408, parameters: ["(注釈)"] }] });
    game.addEnemy(34, 11, 6, 100, "<hp: A>\n<enemy>");
    game.commands.get("AttachFieldEnemy").call({ eventId: () => 34 }, { eventId: "0", windupFrames: "50", cooldownFrames: "70", reach: "1.4" });      // 準備が終わる前のコマンドは、準備が終わってから有効
    assert.deepEqual(plain(fc.listEnemies()), [], "戦闘マップの準備が終わるまで、敵の行動はつかない");
    game.frame(8);
    assert.deepEqual(plain(fc.getEncounterState()).enemies.sort(), [31, 33, 34]);
    const rows = Object.fromEntries(plain(fc.getState()).enemies.map(e => [e.eventId, e]));
    assert.ok(rows[31] && rows[33] && rows[34] && !rows[32], "印の無いイベントは敵にならない");
    // 数値の反映: <fieldEnemy: ...> の値で攻撃の予約が作られる
    const e31 = game.$gameMap.event(31); e31._realX = 5.8; e31._realY = 6.2; game.frame(2);
    assert.equal(game.attackLog.at(-1).windupFrames, 20, "windup=20"); assert.ok(game.attackLog.at(-1).reach >= 1.5 - 1e-9);
    // 戦闘中に追加(AttachFieldEnemy)
    game.addEnemy(35, 12, 6, 100, "<hp: A>\n<enemy>");
    game.commands.get("AttachFieldEnemy").call({ eventId: () => 35 }, { eventId: "35" });
    assert.ok(plain(fc.getEncounterState()).enemies.includes(35));
});

test("探索マップでは基本攻撃(武器)も使えない: canUseWeapon はエンカウンター中・既存の戦闘・DEVの許可だけ通す", () => {
    let onScreen = true;
    const game = loadGame({ dev: false, withField: false });
    game.ProjectRCombatPresence.canUseWeapon = () => onScreen;                                   // 本物は「画面内に敵がいれば true」
    vm.runInContext(read("js/plugins/ProjectR_FieldCombat.js"), vm.createContext(game));
    game.Game_System.prototype.isSaveEnabled = game.Game_System.prototype.isSaveEnabled || function() { return true; };
    const fc = game.ProjectRFieldCombat, gate = game.ProjectRCombatPresence;
    assert.equal(gate.canUseWeapon(), false, "探索マップでは、画面内に敵がいても使えない");
    fc.setDevAllowOutsideEncounter(true); assert.equal(gate.canUseWeapon(), true, "DEVの許可");
    fc.setDevAllowOutsideEncounter(false); assert.equal(gate.canUseWeapon(), false);
    game.ProjectRCardDeck.startCardBattle(game.ProjectRCardDeck.FIXED_BATTLE); assert.equal(gate.canUseWeapon(), true, "既存の戦闘(アリーナ・SOUL等のカード戦闘)は通す");
    game.ProjectRCardDeck.endCardBattle(); assert.equal(gate.canUseWeapon(), false);
    onScreen = false; assert.equal(gate.canUseWeapon(), false, "元が false なら false のまま");
    onScreen = true;
    game.commands.get("StartFieldEncounter")(startArgs()); game.arrive(); game.frame(8);
    assert.equal(gate.canUseWeapon(), true, "エンカウンター中");
    game.commands.get("AbortFieldEncounter")(); game.arrive(); game.frame(3);
    assert.equal(gate.canUseWeapon(), false, "終われば、探索マップでは使えない");
    assert.equal(fc.isCombatAllowed(), false);
});

test("プラグインコマンド: 5つ(開始・戦闘マップへ移動・終える・敵の行動をつける・中断)が登録され、ヘッダーに @command がある", () => {
    const game = loadGame({ dev: false });
    assert.deepEqual([...game.commands.keys()].sort(), ["AbortFieldEncounter", "AttachFieldEnemy", "CompleteFieldEncounter", "StartFieldEncounter", "TransferToBattleMap"]);
    const src = read("js/plugins/ProjectR_FieldCombat.js");
    for (const name of ["StartFieldEncounter", "TransferToBattleMap", "CompleteFieldEncounter", "AttachFieldEnemy", "AbortFieldEncounter"]) assert.match(src, new RegExp("@command " + name));
});

// ---------------------------------------------------------------- Stage 3: 統合の安定化 ----------------------------------------------------------------
test("探索マップでは「戦闘中」の判定(isCombatActive)も、エンカウンター・既存の戦闘・DEVの許可以外は false(画面内に敵がいるだけでは、指輪の受け渡しの禁止・主人公のマウス向きが働かない)", () => {
    let onScreen = true;
    const game = loadGame({ dev: false, withField: false });
    game.ProjectRCombatPresence.canUseWeapon = () => onScreen;
    game.ProjectRCombatPresence.isCombatActive = () => onScreen;                                  // 本物は「画面内に生きている敵がいれば true」
    vm.runInContext(read("js/plugins/ProjectR_FieldCombat.js"), vm.createContext(game));
    const fc = game.ProjectRFieldCombat, p = game.ProjectRCombatPresence;
    assert.equal(p.isCombatActive(), false, "探索マップ: 画面内に敵がいても戦闘中ではない(AcquireHermesRing が断られない)");
    fc.setDevAllowOutsideEncounter(true); assert.equal(p.isCombatActive(), true); fc.setDevAllowOutsideEncounter(false);
    game.ProjectRCardDeck.startCardBattle(game.ProjectRCardDeck.FIXED_BATTLE); assert.equal(p.isCombatActive(), true, "既存の戦闘(カード戦闘)中は、従来どおり戦闘中");
    game.ProjectRCardDeck.endCardBattle(); assert.equal(p.isCombatActive(), false);
    game.commands.get("StartFieldEncounter")(startArgs()); game.arrive(); game.frame(8);
    assert.equal(p.isCombatActive(), true, "エンカウンター中は戦闘中(指輪の受け渡しは断る)");
    game.commands.get("AbortFieldEncounter")(); game.arrive(); game.frame(3);
    assert.equal(p.isCombatActive(), false, "終われば、探索マップでは戦闘中ではない");
    onScreen = false; assert.equal(p.isCombatActive(), false, "元が false なら false のまま");
    // 指輪の受け渡し(CardDeckCore)の禁止は、この判定を使う
    const src = read("js/plugins/ProjectR_CardDeckCore.js");
    assert.match(src, /root\.ProjectRCombatPresence\?\.isCombatActive\?\.\(\)/);
    assert.match(src, /RING_TRANSFER_DURING_BATTLE/);
});

test("エンカウンターの開始で、戦闘マップのセルフスイッチ(扉の開閉・仕掛け)を初期状態へ戻す。ほかのマップのセルフスイッチは触らない", () => {
    const game = loadGame({ dev: false });
    game.$gameSelfSwitches = { _data: { "2,5,A": true, "2,7,B": true, "1,5,A": true, "22,5,A": true } };
    game.commands.get("StartFieldEncounter")(startArgs());
    assert.deepEqual(plain(game.$gameSelfSwitches._data), { "1,5,A": true, "22,5,A": true }, "戦闘マップ(2)の分だけ消える(1・22 は残る)");
    game.arrive(); game.frame(8);
    assert.equal(plain(game.ProjectRFieldCombat.getEncounterState()).state, "fighting");
});

test("DEV のデータ: Map008(戦闘マップ)・扉・敵・Map001 の入口イベント・MapInfos。扉の開いたページに視界の印(<VisionWall>)の文字が入っていない", () => {
    const m8 = JSON.parse(read("data/Map008.json")), m1 = JSON.parse(read("data/Map001.json")), infos = JSON.parse(read("data/MapInfos.json")), sys = JSON.parse(read("data/System.json"));
    assert.equal(m8.note, "<fieldBattleMap>"); assert.deepEqual([m8.width, m8.height, m8.tilesetId], [17, 13, 4]);
    assert.ok(infos[8] && infos[8].name === "DEV_FieldBattle");
    const enemies = m8.events.filter(e => e && /<fieldEnemy/i.test(e.note));
    assert.equal(enemies.length, 3); for (const e of enemies) assert.ok(/<enemy>/.test(e.note) && /<hp: /.test(e.note), e.name + ": Hendrix の敵の印");
    // 壁(y=7): x=8 以外は Region 255。扉は (8,7) だけ
    const w = m8.width, h = m8.height, region = (x, y) => m8.data[(5 * h + y) * w + x];
    for (let x = 1; x <= 15; x++) assert.equal(region(x, 7), x === 8 ? 0 : 255, "x=" + x);
    // 外周(通行不能の壁)も Region 255: Region 0 のままだと、視線が内側の壁の端をかすめて外周の壁へ抜け、壁のマスが斜めに欠けて見える
    let ring = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x === 0 || y === 0 || x === w - 1 || y === h - 1) { ring++; assert.equal(region(x, y), 255, "外周 " + x + "," + y); }
    assert.equal(ring, 56);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (y !== 7) assert.equal(region(x, y), 0, "内側の床は Region 0 のまま " + x + "," + y);
    const door = m8.events.find(e => e && e.name === "DEV 扉(視界)");
    assert.deepEqual([door.x, door.y], [8, 7]);
    const text = page => page.list.filter(c => c.code === 108 || c.code === 408).map(c => c.parameters[0]).join("\n");
    assert.match(text(door.pages[0]), /<VisionWall>/, "閉じた扉は視線を遮る");
    assert.doesNotMatch(text(door.pages[1]), /<VisionWall>/i, "開いた扉(2ページ目)のコメントに、印の文字を入れない(入れると、開いても視線を遮ったままになる)");
    assert.equal(door.pages[1].conditions.selfSwitchValid, true);
    assert.deepEqual([door.pages[1].through, door.pages[1].priorityType], [true, 1], "開いた扉: 通り抜け可能・優先度1(優先度0だと、前に立って F では閉められない)");
    // 出現位置 (8,9) は壁の南・敵はすべて壁の北
    for (const e of enemies) assert.ok(e.y < 7, e.name);
    // Map001 の入口(24,21): 変数9(1〜20)・ヘルメースの指輪・エンカウンターの開始
    const entry = m1.events[8];
    assert.deepEqual([entry.id, entry.x, entry.y], [8, 24, 21]);
    const cmds = entry.pages[0].list.filter(c => c.code === 357).map(c => c.parameters);
    assert.deepEqual(cmds.map(c => c[1]), ["AcquireHermesRing", "StartFieldEncounter"]);
    const args = cmds[1][3];
    assert.deepEqual([args.battleMapId, args.spawnX, args.spawnY, args.resultVariableId], ["8", "8", "9", "9"]);
    assert.ok(Number(args.resultVariableId) < sys.variables.length, "結果の変数はこのプロジェクトの変数の範囲内(1〜20)");
    assert.ok(entry.pages[1].conditions.variableValid && entry.pages[1].conditions.variableId === 9);
});

// ---------------------------------------------------------------- Stage 3 手動Playtestで見つかった不具合の修正 ----------------------------------------------------------------
test("倒された敵(HP 0)は、すぐに通り抜け可能になる(戸口で倒れて道をふさがない)。生きている敵・倒されていない敵・攻撃・勝利の判定は変わらない", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    game.commands.get("StartFieldEncounter")(startArgs()); game.arrive();
    const a = game.addEnemy(31, 8, 6, 100, FIGHTER), b = game.addEnemy(32, 9, 6, 100, FIGHTER), other = game.addEnemy(40, 3, 6, 100, "<hp: X>\n<enemy>");      // other: <fieldEnemy> なし
    for (const e of [a, b, other]) { e._through = false; e._priorityType = 1; e.setThrough = function(v) { this._through = v; }; e.setPriorityType = function(v) { this._priorityType = v; }; }
    game.frame(8);
    assert.equal(plain(fc.getEncounterState()).state, "fighting");
    assert.deepEqual([a._through, b._through, a._priorityType], [false, false, 1], "生きている敵は、通れない(従来どおり)");
    game.setEnemyHp(31, 0); game.frame(1);
    assert.equal(a._through, true, "倒された敵は、次のフレームまでに通り抜け可能(Hendrix は 0 でも消さない)");
    assert.equal(a._priorityType, 0, "プレイヤーより下に描かれる優先度");
    assert.equal(b._through, false, "生きている敵は変わらない"); assert.equal(b._priorityType, 1);
    assert.equal(other._through, false, "印のない(エンカウンターの敵でない)イベントには触らない");
    assert.equal(a._erased, false, "消さない(倒れた絵・ドロップなど、ほかの仕組みはそのまま)");
    assert.equal(plain(fc.getEncounterState()).state, "fighting", "全員ではないので続く(勝利の判定は従来どおり)");
    const downs = () => plain(fc.getLog()).filter(l => l.type === "enemyDown").length;
    game.frame(30); assert.equal(downs(), 1, "1体につき1回だけ処理する");
    // 勝利: 全員倒すと従来どおり勝利。戻る前に、倒れた敵はすべて通り抜け可能
    game.setEnemyHp(32, 0); game.frame(30);
    assert.equal(b._through, true);
    assert.equal(plain(fc.getEncounterState()).state, "leaving", "勝利の判定は変わらない");
    assert.equal(downs(), 2);
});

test("倒された敵は、攻撃の予約も止まる(戸口で倒れた敵が、倒れたあとに攻撃しない)。繰り返しのエンカウンターでは、新しい敵(通り抜け不可)から始まる", () => {
    const game = loadGame({ dev: false });
    const fc = game.ProjectRFieldCombat;
    const run = () => {
        game.commands.get("StartFieldEncounter")(startArgs()); game.arrive();
        const e = game.addEnemy(31, 5.8, 6.2, 100, "<hp: A>\n<enemy>\n<fieldEnemy: windup=20, cooldown=30>");
        e._through = false; e._priorityType = 1; e.setThrough = function(v) { this._through = v; }; e.setPriorityType = function(v) { this._priorityType = v; };
        game.frame(8);
        return e;
    };
    const first = run();
    game.frame(3);
    assert.ok(game.attackLog.length >= 1, "近くにいれば、攻撃を予約する");
    game.setEnemyHp(31, 0); game.frame(2);
    assert.equal(game.pendingAttack, null, "倒されたら、溜め中の攻撃も取り消す");
    assert.equal(first._through, true);
    const attacks = game.attackLog.length; game.frame(60);
    assert.equal(game.attackLog.length, attacks, "倒れたあとは、新しい攻撃を予約しない");
    game.arrive(); game.frame(3);
    assert.equal(plain(fc.getEncounterState()).state, "idle");
    const second = run();
    assert.equal(second._through, false, "2回目の敵は新しいイベント(通り抜け不可・生きている)");
    assert.equal(plain(fc.getEncounterState()).state, "fighting");
});

// ====================================================================== Stage 4: 敵の経路探索 ======================================================================
// 地図の文字: '.' 通れる / '#' 通れない(視界は遮らない: 柱・家具・低い壁) / 'R' 通れない + 視界を遮る(Region 255 の壁)。
// DotMove の代わりに、体 1x1 を格子と他のイベントへ当てる簡易の移動(x と y を別々に動かす=壁に沿って滑る)を使う。
function navWorld(game, rows) {
    const H = rows.length, W = rows[0].length, m = game.$gameMap;
    const cell = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? "#" : rows[y][x]);
    m.width = () => W; m.height = () => H; m.isLoopHorizontal = () => false; m.isLoopVertical = () => false;
    m.isPassable = (x, y) => cell(x, y) === ".";
    game.visionBlock = false; game.navCalls = 0;
    const doors = [];
    game.ProjectR = game.ProjectR || {};
    game.ProjectR.CombatOcclusion = {
        hasLineOfSight(from, to) {
            if (game.visionBlock) return false;
            const n = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.05) || 1;
            for (let i = 0; i <= n; i++) {
                const x = from.x + (to.x - from.x) * i / n, y = from.y + (to.y - from.y) * i / n;
                if (cell(Math.floor(x), Math.floor(y)) === "R") return false;
                for (const d of doors) if (!d.open && Math.floor(x) === d._realX && Math.floor(y) === d._realY) return false;
            }
            return true;
        }
    };
    const body = (e, x, y) => {                                        // 体 (x, y)-(x+1, y+1) が、通れない所・通れない他のイベントに重なるか
        for (let cy = Math.floor(y + 1e-6); cy <= Math.floor(y + 1 - 1e-6); cy++) for (let cx = Math.floor(x + 1e-6); cx <= Math.floor(x + 1 - 1e-6); cx++) if (cell(cx, cy) !== ".") return true;
        for (const o of m.events()) { if (o === e || o._erased || o.isThrough()) continue; if (Math.abs(o._realX - x) < 1 - 1e-6 && Math.abs(o._realY - y) < 1 - 1e-6) return true; }
        return false;
    };
    const dress = e => {
        Object.assign(e, { _pageIndex: 0, _direction: 2, width: () => 1, height: () => 1, centerRealX() { return this._realX + 0.5; }, centerRealY() { return this._realY + 0.5; }, distancePerFrame: () => 0.07,
            isThrough() { return !!this._through; }, isNormalPriority: () => true, direction() { return this._direction; }, setDirection(d) { this._direction = d; }, calls: 0 });
        e.dotMoveByDeg = function(deg) {
            this.calls++; game.navCalls++;
            const r = deg * Math.PI / 180, dx = Math.sin(r) * 0.07, dy = -Math.cos(r) * 0.07;
            if (!body(this, this._realX + dx, this._realY)) this._realX += dx;
            if (!body(this, this._realX, this._realY + dy)) this._realY += dy;
        };
        e.dotMoveToPlayer = function() { const p = game.$gamePlayer; this.dotMoveByDeg(Math.atan2(p._realY - this._realY, p._realX - this._realX) * 180 / Math.PI + 90); };
        return e;
    };
    game.addNavEnemy = (id, x, y, note = "") => dress(game.addEnemy(id, x, y, 100, note));
    game.addDoor = (id, x, y, open = false) => {                       // 閉じている間は通れず視線を遮る。開くと through
        const d = dress(game.addEnemy(id, x, y, 100, ""));
        d.open = open; Object.defineProperty(d, "_through", { get: () => d.open, set() {} }); d.dotMoveByDeg = () => {}; d.dotMoveToPlayer = () => {};
        doors.push(d); return d;
    };
    game.setPlayer = (x, y) => { const p = game.$gamePlayer; p._realX = x; p._realY = y; p.x = Math.floor(x); p.y = Math.floor(y); };
    game.dist = e => Math.hypot(game.$gamePlayer._realX - e._realX, game.$gamePlayer._realY - e._realY);
    return { W, H, cell };
}
const NAV_SIGHT = { sightTiles: 20, fovDegrees: 360 };

test("経路探索: 見えているのにまっすぐ進めない(視界を遮らない柱の向こう)とき、柱をよけて追いつき、攻撃する。従来(経路探索なし)は柱の前で止まり続ける", () => {
    const rows = ["............", "............", "....##......", "....##......", "............", "............"];
    const run = enabled => {
        const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
        const e = game.addNavEnemy(3, 4.5, 0);                                  // 柱(4..5, 2..3)のちょうど北。プレイヤーは柱の南
        game.setPlayer(4.5, 4.5); fc.begin(); fc.attachEnemy(3, NAV_SIGHT); fc.setPathfinding(enabled);
        const modes = new Set();
        for (let i = 0; i < 700 && game.attackLog.length === 0; i++) { game.frame(1); modes.add(plain(fc.getEnemyNav(3)).mode); }
        return { game, fc, e, modes };
    };
    const on = run(true);
    assert.ok(on.game.attackLog.length >= 1, "柱をよけて近づき、攻撃を予約する");
    assert.ok(on.modes.has("path") && on.modes.has("direct"), "まっすぐ進めないときは経路、進めるときはまっすぐ: " + [...on.modes]);
    assert.ok(on.game.dist(on.e) <= 1.2 + 1e-6);
    const off = run(false);
    assert.equal(off.game.attackLog.length, 0, "従来のまっすぐの追跡は、柱に押しつけたまま届かない");
    assert.ok(off.game.dist(off.e) > 2, "柱の前で止まっている: " + off.game.dist(off.e));
    assert.equal(plain(off.fc.getEnemyNav(3)).mode, "idle", "切ると経路は使わない");
    assert.equal(off.fc.getNavStats().searches, 0);
});

test("経路探索: 曲がりくねった細い通路(壁の角)でも、壁に引っかからずにプレイヤーまで進む。斜めの角またぎ・通れない所の通過はしない", () => {
    const rows = ["#######", "#.....#", "#####.#", "#.....#", "#.#####", "#.....#", "#######"];
    const game = loadGame(); const fc = game.ProjectRFieldCombat; const w = navWorld(game, rows);
    const e = game.addNavEnemy(3, 1, 1); game.setPlayer(1, 5);
    fc.begin(); fc.attachEnemy(3, NAV_SIGHT);
    const path = plain(fc.findNavPath({ x: 1, y: 1 }, { x: 1, y: 5 }));
    assert.ok(path && path[0].x === 1 && path[0].y === 1 && path.at(-1).x === 1 && path.at(-1).y === 5, JSON.stringify(path));
    assert.equal(path.length, 13, "1幅の通路をたどる最短(東→南→西→南→東の 13 マス)");
    path.forEach((t, i) => { assert.equal(w.cell(t.x, t.y), ".", "通れるマスだけを通る"); if (i) { const a = path[i - 1]; assert.ok(Math.abs(a.x - t.x) + Math.abs(a.y - t.y) === 1, "細い通路では斜めに進まない(角をまたがない)"); } });
    for (let i = 0; i < 1500 && game.attackLog.length === 0; i++) { game.frame(1); assert.equal(w.cell(Math.floor(e._realX + 0.5), Math.floor(e._realY + 0.5)), ".", "壁の中へ入らない"); }
    assert.ok(game.attackLog.length >= 1, "プレイヤーに届いて攻撃する: dist=" + game.dist(e).toFixed(2) + " " + JSON.stringify(plain(fc.getEnemyNav(3))).slice(0, 200));
    assert.equal(fc.getNavStats().stuck, 0, "止まり続けない(壁に引っかからない)");
    assert.equal(fc.getNavStats().errors, 0, String(fc.getNavStats().lastError));
});

test("経路探索: 開けた場所の斜めの経路は、角をまたがない(となりの2マスが通れるときだけ斜め)。折れ線は、まっすぐ行ける最も遠い角だけを結ぶ", () => {
    const rows = ["..........", "..........", "....####..", "....####..", "..........", ".........."];
    const game = loadGame(); const fc = game.ProjectRFieldCombat; const w = navWorld(game, rows);
    const e = game.addNavEnemy(3, 1, 0); game.setPlayer(8.5, 5);
    fc.begin(); fc.attachEnemy(3, NAV_SIGHT); game.frame(2);
    const nav = plain(fc.getEnemyNav(3));
    assert.equal(nav.mode, "path");
    assert.ok(nav.waypoints.length <= 4, "折れ線は少ない(角だけ): " + JSON.stringify(nav.waypoints));
    const path = plain(fc.findNavPath({ x: 1, y: 0 }, { x: 8, y: 5 }));
    path.forEach((t, i) => { assert.equal(w.cell(t.x, t.y), "."); if (i) { const a = path[i - 1]; if (a.x !== t.x && a.y !== t.y) { assert.equal(w.cell(a.x, t.y), "."); assert.equal(w.cell(t.x, a.y), "."); } } });
    assert.ok(path.length <= 10, "遠回りしない: " + path.length);
    assert.equal(fc.findNavPath({ x: 99, y: 99 }, { x: 8, y: 5 }) !== undefined, true, "範囲の外は端へ丸める(例外を出さない)");
});

test("経路探索: 経路がない(囲まれている)ときは、いちばん近づけるマスまで行って待つ。壁に押しつけず、探し直しは 30 フレームあける(毎フレーム探さない)", () => {
    const rows = ["........", ".######.", ".#....#.", ".#....#.", ".######.", "........"];
    const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
    const e = game.addNavEnemy(3, 0, 0); game.setPlayer(3, 2);
    fc.begin(); fc.attachEnemy(3, NAV_SIGHT);
    assert.equal(fc.findNavPath({ x: 0, y: 0 }, { x: 3, y: 2 }), null, "囲まれた所へは、届く経路がない");
    const part = plain(fc.findNavPath({ x: 0, y: 0 }, { x: 3, y: 2 }, { allowPartial: true }));
    assert.deepEqual([part.at(-1).x, part.at(-1).y], [3, 0], "(許せば)いちばん近づけるマスまで: " + JSON.stringify(part));
    game.frame(200);
    const s1 = fc.getNavStats(), nav = plain(fc.getEnemyNav(3));
    assert.ok(Math.abs(e._realX - 3) < 0.3 && e._realY < 0.3, "近づける所(3,0)まで行って待つ: " + e._realX.toFixed(2) + "," + e._realY.toFixed(2));
    assert.equal(nav.mode, "path"); assert.equal(nav.pathLength, 0, "着いたあとは経路を持たない");
    const at = { x: e._realX, y: e._realY }; game.frame(120);
    assert.ok(Math.hypot(e._realX - at.x, e._realY - at.y) < 0.01, "待っている間は動かない(壁に押しつけて動き続けない)");
    const s2 = fc.getNavStats();
    assert.ok(s2.searches - s1.searches <= 5, "待っている間の探し直しは約30フレームごと(120フレームで 5 回以内): " + (s2.searches - s1.searches));
    assert.ok(s2.searches <= 14, "探索の回数が増え続けない: " + s2.searches);
    assert.equal(s2.errors, 0, String(s2.lastError));
});

test("経路探索: 見失った瞬間に経路を捨てて止まる。隠れている間にプレイヤーがどこへ動いても動かず、最後に見た位置へも向かわない。見えれば探し直す", () => {
    const rows = ["............", "............", "....##......", "....##......", "............", "............"];
    const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
    const e = game.addNavEnemy(3, 4.5, 0); game.setPlayer(4.5, 4.5);
    fc.begin(); fc.attachEnemy(3, NAV_SIGHT);
    game.frame(25);
    let nav = plain(fc.getEnemyNav(3)); assert.equal(nav.mode, "path"); assert.ok(nav.pathLength > 0, "柱をよける経路を持つ: " + JSON.stringify(nav).slice(0, 160));
    const plans = nav.plans;
    game.visionBlock = true; game.frame(1);                                  // 視線が切れた
    const stop = { x: e._realX, y: e._realY }, calls = e.calls;
    nav = plain(fc.getEnemyNav(3)); assert.equal(nav.mode, "idle"); assert.equal(nav.pathLength, 0, "経路を捨てる");
    for (const p of [[10, 5], [0, 5], [10, 0], [1, 1], [4.5, 4.5]]) { game.setPlayer(p[0], p[1]); game.frame(30); }
    assert.equal(e._realX, stop.x); assert.equal(e._realY, stop.y); assert.equal(e.calls, calls, "隠れている間は、動かす命令を1回も出さない(最後に見た位置を追わない)");
    assert.equal(plain(fc.getEnemyNav(3)).pathLength, 0);
    game.setPlayer(4.5, 4.5); game.visionBlock = false; game.frame(5);       // また見えた
    nav = plain(fc.getEnemyNav(3)); assert.ok(nav.mode === "path" || nav.mode === "direct"); assert.ok(e.calls > calls, "見えれば、また追う");
    game.frame(30); assert.ok(plain(fc.getEnemyNav(3)).plans > plans, "見えるようになったので、いまのプレイヤーの位置へ探し直した");
    assert.equal(fc.getNavStats().lostSight, 1);
    assert.equal(plain(fc.getEnemyPerception(3)).losses, 1, "視界の判定は従来どおり(失った回数 1)");
});

test("経路探索: 閉じた扉は壁(通れない・視線を遮る)。見えない間は動かず、開けると見えて、戸口を通ってプレイヤーへ届く", () => {
    const rows = ["RRRR.RRRR", "RRRR.RRRR", "RRRR.RRRR", "RRRR.RRRR", "RRRR.RRRR"];     // 縦の通路(幅 1)。扉は (4,1)
    const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
    const door = game.addDoor(9, 4, 1, false);
    const e = game.addNavEnemy(3, 4, 0); game.setPlayer(4, 4);
    fc.begin(); fc.attachEnemy(3, NAV_SIGHT); game.frame(2);
    assert.equal(plain(fc.getEnemyPerception(3)).canSeeNow, false, "閉じた扉の向こうは見えない");
    const stop = { x: e._realX, y: e._realY }; game.frame(60);
    assert.equal(e._realX, stop.x); assert.equal(e._realY, stop.y); assert.equal(e.calls, 0); assert.equal(plain(fc.getEnemyNav(3)).mode, "idle", "扉が閉じている間は、追わない・経路もない");
    door.open = true; game.frame(2);
    assert.equal(plain(fc.getEnemyPerception(3)).canSeeNow, true, "開けば見える");
    for (let i = 0; i < 400 && game.attackLog.length === 0; i++) game.frame(1);
    assert.ok(game.attackLog.length >= 1, "開いた扉を通って追いつく: dist=" + game.dist(e).toFixed(2));
    assert.ok(e._realY > 1.5, "戸口(4,1)を通り抜けた");
    // 閉じると、その場で止まる
    const g2 = loadGame(); const fc2 = g2.ProjectRFieldCombat; navWorld(g2, rows); const d2 = g2.addDoor(9, 4, 1, true);
    const e2 = g2.addNavEnemy(3, 4, 0); g2.setPlayer(4, 4); fc2.begin(); fc2.attachEnemy(3, NAV_SIGHT); g2.frame(20);
    assert.ok(e2.calls > 0 && e2._realY > 0.5, "開いていれば進む");
    d2.open = false; g2.frame(1); const at = e2._realY, calls = e2.calls; g2.frame(30);
    assert.equal(e2._realY, at); assert.equal(e2.calls, calls, "扉を閉じると、すぐ止まる");
});

test("経路探索: 探索は敵ごとに 12 フレーム以上あけ、全体で 1 フレーム 3 回まで。プレイヤーが動き続けても探索回数が増え続けない。敵が多くても全員が進む", () => {
    const rows = Array.from({ length: 14 }, (_, y) => (y === 6 || y === 7 ? "..####....####.." : "................"));
    const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
    const enemies = [];
    for (let i = 0; i < 12; i++) enemies.push(game.addNavEnemy(10 + i, 1 + (i % 6) * 2, i < 6 ? 0 : 1 + (i % 2)));
    game.setPlayer(7.5, 12); fc.begin();
    for (const e of enemies) fc.attachEnemy(e.eventId(), { ...NAV_SIGHT, reach: 0.6 });
    fc.resetNavStats(); const frames = 240;
    for (let i = 0; i < frames; i++) { if (i % 5 === 0) game.setPlayer(6 + (Math.sin(i / 20) * 3), 12 - (i % 3) * 0.2); game.frame(1); }
    const s = fc.getNavStats();
    assert.ok(s.maxFrameSearches <= 3, "1フレームの探索は 3 回まで: " + s.maxFrameSearches);
    assert.ok(s.searches <= enemies.length * (frames / 12 + 3), "探索回数は敵ごとに 12 フレームに 1 回まで: " + s.searches);
    assert.ok(enemies.every(e => e.calls > 0), "全員が動く");
    assert.equal(s.errors, 0, String(s.lastError));
    assert.ok(s.searchMs / Math.max(1, s.searches) < 2, "探索 1 回の平均 < 2ms: " + (s.searchMs / Math.max(1, s.searches)).toFixed(3));
});

test("経路探索: 味方の敵が通路をふさいで止まったら、しばらくよける経路にして回り込む。幅1の通路でふさがれたままなら、押しつけずに待つ。敵同士は重ならない", () => {
    // 幅 2 の通路: 止まっている味方(chase=0)の前でふさがれたら、となりの列へ回り込む
    const rows2 = ["##########", "#........#", "#........#", "##########"];
    const g = loadGame(); const fc = g.ProjectRFieldCombat; navWorld(g, rows2);
    const still = g.addNavEnemy(3, 4, 1), mover = g.addNavEnemy(4, 1, 1); g.setPlayer(7.5, 1);
    fc.begin(); fc.attachEnemy(3, { ...NAV_SIGHT, chase: false, reach: 0.6 }); fc.attachEnemy(4, { ...NAV_SIGHT, reach: 0.6 });
    for (let i = 0; i < 700 && g.attackLog.length === 0; i++) { g.frame(1); assert.ok(Math.abs(still._realX - mover._realX) >= 1 - 1e-6 || Math.abs(still._realY - mover._realY) >= 1 - 1e-6, "敵同士が重ならない"); }
    assert.ok(plain(fc.getEnemyNav(4)).stuckCount >= 1, "ふさがれて止まったことを検出した");
    assert.ok(g.attackLog.some(a => a.eventId === 4), "味方をよけて回り込み、プレイヤーに届く: dist=" + g.dist(mover).toFixed(2));
    assert.ok(g.dist(mover) < 1.2 + 1e-6);
    // 幅 1 の通路: よける道がない → 待つ(押しつけ続けない・探索を増やし続けない)
    const rows1 = ["##########", "#........#", "##########"];
    const h = loadGame(); const hc = h.ProjectRFieldCombat; navWorld(h, rows1);
    const wall = h.addNavEnemy(3, 4, 1), blocked = h.addNavEnemy(4, 1, 1); h.setPlayer(7.5, 1);
    hc.begin(); hc.attachEnemy(3, { ...NAV_SIGHT, chase: false, reach: 0.6 }); hc.attachEnemy(4, { ...NAV_SIGHT, reach: 0.6 });
    h.frame(300);
    const nav = plain(hc.getEnemyNav(4)), s = hc.getNavStats();
    assert.ok(blocked._realX <= 3 + 1e-6, "味方の手前で待つ");
    assert.ok(nav.stuckCount >= 1 && nav.stuckCount <= 8, "止まり検出の回数が増え続けない: " + nav.stuckCount);
    assert.ok(s.searches <= 10, "待っている間も探索を繰り返さない: " + s.searches);
    assert.equal(s.errors, 0, String(s.lastError));
});

test("経路探索: 攻撃の溜め・Cooldown・攻撃の予約は従来どおり(溜め中は動かない・経路を持たない)。chase=0 は動かず、path=0 は従来のまっすぐ", () => {
    const rows = ["............", "............", "....##......", "....##......", "............"];
    const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
    const e = game.addNavEnemy(3, 4.5, 0); game.setPlayer(4.5, 4.5);
    fc.begin(); fc.attachEnemy(3, { ...NAV_SIGHT, windupFrames: 30, cooldownFrames: 50 });
    for (let i = 0; i < 600 && game.attackLog.length === 0; i++) game.frame(1);
    assert.equal(game.attackLog.length, 1); assert.equal(game.attackLog[0].windupFrames, 30);
    const at = { x: e._realX, y: e._realY }, calls = e.calls; game.frame(20);
    assert.equal(e.calls, calls, "溜めの間は動かない"); assert.deepEqual([e._realX, e._realY], [at.x, at.y]);
    assert.equal(plain(fc.getEnemyNav(3)).pathLength, 0, "溜めの間は経路を持たない");
    const g2 = loadGame(); const fc2 = g2.ProjectRFieldCombat; navWorld(g2, rows);
    const still = g2.addNavEnemy(5, 4.5, 0), straight = g2.addNavEnemy(6, 4.5, 1); g2.setPlayer(4.5, 4.5);
    fc2.begin(); fc2.attachEnemy(5, { ...NAV_SIGHT, chase: false }); fc2.attachEnemy(6, { ...NAV_SIGHT, pathfinding: false });
    g2.frame(60);
    assert.equal(still.calls, 0, "chase=0 は動かない");
    assert.equal(plain(fc2.getEnemyNav(6)).mode, "idle"); assert.equal(fc2.getNavStats().searches, 0, "path=0 は経路を探さない");
    assert.ok(straight.calls > 0, "path=0 でも従来のまっすぐは追う");
    const src = read("js/plugins/ProjectR_FieldCombat.js");
    assert.match(src, /key === "path"\) o\.pathfinding = !\(v === "0"/, "<fieldEnemy: path=0> を読む");
});

test("経路探索: 使うのは、エンカウンター中・敵の視界が有効・ループしないマス・体が 1 マス以下の敵だけ。それ以外は従来のまっすぐの追跡(dotMoveToPlayer)", () => {
    const rows = ["............", "............", "....##......", "....##......", "............"];
    const setup = tweak => {
        const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, rows);
        const e = game.addNavEnemy(3, 4.5, 0); game.setPlayer(4.5, 4.5); tweak(game, e, fc);
        fc.begin(); fc.attachEnemy(3, NAV_SIGHT); game.frame(30);
        return { game, e, fc, nav: plain(fc.getEnemyNav(3)), stats: fc.getNavStats() };
    };
    const base = setup(() => {}); assert.ok(base.stats.searches >= 1 && base.nav.usable === true, "基準: 柱の前では探索する");
    const noPerception = setup((g, e, fc) => fc.setPerception({ enabled: false })); assert.equal(noPerception.stats.searches, 0, "視界が無効(従来): 経路探索は使わない"); assert.ok(noPerception.stats.legacyFrames > 0);
    const loop = setup(g => { g.$gameMap.isLoopHorizontal = () => true; }); assert.equal(loop.stats.searches, 0, "ループマップは使わない");
    const big = setup((g, e) => { e.width = () => 1.5; }); assert.equal(big.stats.searches, 0, "体が 1 マスより大きい敵は使わない");
    const plain1 = setup((g, e) => { delete e.dotMoveByDeg; }); assert.equal(plain1.stats.searches, 0, "DotMove のない(部品)の敵は従来のまま");
    const game = loadGame(); navWorld(game, rows); game.addNavEnemy(3, 4.5, 0); game.setPlayer(4.5, 4.5);
    game.ProjectRFieldCombat.attachEnemy(3, NAV_SIGHT);                           // begin() の前: エンカウンター(戦闘)中ではない
    game.frame(30); assert.equal(game.ProjectRFieldCombat.getNavStats().searches, 0, "戦闘が始まっていなければ使わない");
    const off = setup((g, e, fc) => fc.setPathfinding(false)); assert.equal(off.stats.searches, 0, "setPathfinding(false) は従来のまっすぐ");
});

test("経路探索: ソースの規則 — 見失ったら経路を捨てる・最後に見た位置を保持しない・視界(perceive)と CombatOcclusion には手を入れない・DotMove の本体を書き換えない", () => {
    const src = read("js/plugins/ProjectR_FieldCombat.js");
    const nav = src.slice(src.indexOf("敵の経路探索(Stage 4"), src.indexOf("const updateEnemies"));
    assert.ok(nav.length > 3000);
    assert.doesNotMatch(nav, /lastKnown|lastSeen|lastPlayer|memory|remember/i, "最後に見た位置を覚えない");
    assert.match(src, /b\.sees = sees;\s*\n\s*if \(!sees\) navLose\(b\);/, "見失った(sees=false)フレームに、必ず経路を捨てる");
    assert.match(src, /chaseStepSafe\(e, b, p\)/); assert.match(src, /if \(b\.chase && sees && !playerDead\(\) && dist > b\.reach \* 0\.8 && dist <= \(cfg\.perception \? b\.sightTiles : b\.aggroTiles\)\)/, "追う条件は従来のまま");
    assert.match(src.slice(src.indexOf("const perceive = "), src.indexOf("const getEnemyPerception")), /o\.hasLineOfSight\(c, p, \{ mode: "vision", ignoreEventIds: \[e\.eventId\(\)\] \}\)/, "視界の判定は従来のまま");
    assert.doesNotMatch(nav, /Game_Character\.prototype|Game_Event\.prototype|DotMoveSystem\./, "DotMove・Game_* を書き換えない");
    assert.doesNotMatch(nav, /\.locate\(|\.setPosition\(|\.setPositionPoint\(/, "位置を直接書き換えない(DotMove の移動だけ)");
    assert.match(src, /@param EnemyPathfinding[\s\S]*?@default true/);
    assert.ok(read("docs/ProjectR_FieldCombat.md").includes("経路探索"), "docs に経路探索の節がある");
});

test("DEV のデータ(Stage 4): Map008 の南の部屋に、通れないが視線を遮らない柱(2x2)がある。扉・出現位置・撤退の NPC への道・敵の配置は変わらない", () => {
    const m8 = JSON.parse(read("data/Map008.json")), tiles = JSON.parse(read("data/Tilesets.json")), flags = tiles[m8.tilesetId].flags;
    const w = m8.width, h = m8.height, at = (x, y, z) => m8.data[(z * h + y) * w + x], region = (x, y) => at(x, y, 5);
    const blocked = (x, y) => { for (let z = 3; z >= 0; z--) { const f = flags[at(x, y, z)] || 0; if (f & 0x10) continue; return (f & 0x0f) === 0x0f; } return false; };
    const pillar = [[11, 9], [12, 9], [11, 10], [12, 10]];
    for (const [x, y] of pillar) { assert.equal(blocked(x, y), true, "柱は通れない " + x + "," + y); assert.equal(region(x, y), 0, "柱は視線を遮らない(Region 0)"); assert.equal(at(x, y, 0), at(3, 7, 0), "既存の壁のタイルを使う"); }
    // 通れないマスは、外周・壁(y=7)・柱だけ(それ以外の床は通れる)
    const wall = new Set(pillar.map(p => p.join(",")));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ring = x === 0 || y === 0 || x === w - 1 || y === h - 1, row7 = y === 7 && x !== 8; assert.equal(blocked(x, y), ring || row7 || wall.has(x + "," + y), x + "," + y); }
    // 出現位置(8,9)から、撤退の NPC(8,11)の前(8,10)・扉の前(8,8)へ行ける。柱の東側(13,10)へは、南の列(y=11)か北の列(y=8)を回って行ける
    const open = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1 && !blocked(x, y);
    const reach = (sx, sy) => { const seen = new Set([sx + "," + sy]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + "," + ny; if (open(nx, ny) && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } } } return seen; };
    const south = reach(8, 9);
    for (const k of ["8,10", "8,11", "8,8", "8,7", "13,10", "13,9", "10,11", "10,8"]) assert.ok(south.has(k), "到達できる " + k);
    const door = m8.events.find(e => e && e.name === "DEV 扉(視界)"), retreat = m8.events.find(e => e && e.name === "DEV 撤退(中断)");
    assert.deepEqual([door.x, door.y, retreat.x, retreat.y], [8, 7, 8, 11]);
    for (const e of m8.events.filter(e => e && /<fieldEnemy/i.test(e.note))) assert.ok(e.y < 7, e.name + " は壁の北");
    for (const e of m8.events.filter(Boolean)) assert.ok(!wall.has(e.x + "," + e.y), e.name + " は柱の上にいない");
});

// ====================================================================== Stage 4b: 出入口の渋滞 ======================================================================
// 扉口(4,4)で南北の部屋がつながる地図。'R' は壁(視線を遮る)。プレイヤーの移動(Hendrix の _playerPassThroughEvents を見る)を、簡易に再現する。
const GAP_ROWS = ["RRRRRRRRR", "R.......R", "R.......R", "R.......R", "RRRR.RRRR", "R.......R", "R.......R", "R.......R", "RRRRRRRRR"];
function playerSim(game, w) {
    const p = game.$gamePlayer, m = game.$gameMap;
    p.width = () => 1; p.height = () => 1;
    const passList = () => (game.$gameSystem._playerPassThroughEvents || []);
    const blocked = (x, y) => {
        for (let cy = Math.floor(y + 1e-6); cy <= Math.floor(y + 1 - 1e-6); cy++) for (let cx = Math.floor(x + 1e-6); cx <= Math.floor(x + 1 - 1e-6); cx++) if (w.cell(cx, cy) !== ".") return true;
        for (const o of m.events()) { if (o._erased || o.isThrough() || passList().includes(o.eventId())) continue; if (Math.abs(o._realX - x) < 1 - 1e-6 && Math.abs(o._realY - y) < 1 - 1e-6) return true; }
        return false;
    };
    // 1フレーム: 押している向き(dx, dy)へ動こうとして、動けた分だけ動く(x と y を別々に)。その後に 1 フレーム進める
    game.press = (dx, dy, dir4, frames) => {
        for (let i = 0; i < frames; i++) {
            game.Input.dir4 = dir4; const nx = p._realX + dx * 0.07, ny = p._realY + dy * 0.07;
            if (!blocked(nx, p._realY)) p._realX = nx; if (!blocked(p._realX, ny)) p._realY = ny;
            p.x = Math.floor(p._realX + 0.5); p.y = Math.floor(p._realY + 0.5);
            game.frame(1);
        }
        game.Input.dir4 = 0;
    };
    game.passList = passList;
}

test("渋滞(1): 倒した敵は、動いている最中でも、すぐ(次のフレームまでに)通り抜けられる。DotMove の「移動が終わってから」の予約を待たない・経路探索の写しも捨てる", () => {
    const game = loadGame(); const fc = game.ProjectRFieldCombat; const w = navWorld(game, GAP_ROWS);
    const dead = game.addNavEnemy(1, 4, 5), other = game.addNavEnemy(2, 4, 2);
    // DotMove と同じ: 動いている間の setThrough は、予約だけして、すぐには変えない
    dead.setThrough = function(v) { this._setThroughReserve = v; }; dead._moving = true; dead.setPriorityType = function(v) { this._priorityType = v; };
    game.setPlayer(4, 7); fc.begin(); fc.attachEnemy(1, { ...NAV_SIGHT, chase: false }); fc.attachEnemy(2, { ...NAV_SIGHT, chase: false });
    game.frame(3); assert.equal(dead.isThrough(), false);
    game.setEnemyHp(1, 0); game.frame(1);
    assert.equal(dead._through, true, "予約を待たずに、すぐ通り抜け可能");
    assert.equal(dead._setThroughReserve, undefined, "予約も消す");
    assert.equal(dead._priorityType, 0);
    assert.deepEqual(plain(fc.listEnemies()), [2], "敵の一覧から外れる");
    // 倒れた敵のいたマス(4,5)を、通れる経路として使える
    assert.ok(fc.findNavPath({ x: 4, y: 2 }, { x: 4, y: 7 }), "扉口の先の倒れた敵は、経路をふさがない");
    // 倒れた敵を通り抜けて、プレイヤーが扉口から南へ行ける
    playerSim(game, w); game.setPlayer(4, 3.0); game.press(0, 1, 2, 80);
    assert.ok(game.$gamePlayer._realY > 6, "死体の上を通れる: y=" + game.$gamePlayer._realY.toFixed(2));
});

test("渋滞(2): 見失って扉口に立っている敵は、道を空ける(追わない・プレイヤーの位置を使わない)。扉口に並んでも、全員が固まったまま扉口をふさぎ続けない・重ならない", () => {
    const run = (px, py) => {
        const game = loadGame(); const fc = game.ProjectRFieldCombat; navWorld(game, GAP_ROWS);
        const es = [game.addNavEnemy(1, 4, 4), game.addNavEnemy(2, 4, 3), game.addNavEnemy(3, 4, 2)];      // 扉口に 1 体・その北に 2 体(縦に並ぶ)
        game.setPlayer(px, py); fc.begin(); for (const e of es) fc.attachEnemy(e.eventId(), { ...NAV_SIGHT, windupFrames: 36, cooldownFrames: 90 });
        game.visionBlock = true;                                                      // プレイヤーが扉の正面の線を外れた(全員、見失う)
        let minGap = 9; const moves = [];
        for (let i = 0; i < 240; i++) { game.frame(1); for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) minGap = Math.min(minGap, Math.max(Math.abs(es[a]._realX - es[b]._realX), Math.abs(es[a]._realY - es[b]._realY))); }
        return { game, fc, es, minGap, final: es.map(e => [+e._realX.toFixed(2), +e._realY.toFixed(2)]), st: fc.getNavStats() };
    };
    const a = run(1, 6), b = run(7, 7), c = run(7, 1);
    for (const r of [a, b, c]) {
        assert.ok(r.st.yields >= 1, "扉口の敵が道を空けた");
        assert.ok(r.es.every(e => !(Math.floor(e._realY + 0.5) === 4 && Math.floor(e._realX + 0.5) === 4)), "扉口(4,4)に誰も立っていない: " + JSON.stringify(r.final));
        assert.ok(r.minGap >= 0.98, "敵同士が重ならない(間隔 " + r.minGap.toFixed(2) + ")");
        assert.equal(r.st.errors, 0, String(r.st.lastError));
    }
    // プレイヤーの位置は使わない: 見失っている間の動きは、プレイヤーがどこにいても同じ
    assert.deepEqual(a.final, b.final); assert.deepEqual(a.final, c.final);
    // 見失っているので、追ってはいない(経路はない)
    assert.ok(a.es.every(e => plain(a.fc.getEnemyNav(e.eventId())).pathLength === 0));
    // 見えれば、追う(従来どおり)
    a.game.visionBlock = false; const before = a.es.map(e => e.calls); a.game.frame(30);
    assert.ok(a.es.some((e, i) => e.calls > before[i]), "見えるようになれば、また追う");
});

test("渋滞(3): 扉口で前後を敵にはさまれて進めないとき(24フレーム)だけ、行く手の敵をプレイヤーが通り抜けられる。離れると戻す。壁・扉は通れないまま。終わり・倒れる・外れるで必ず戻す", () => {
    const game = loadGame(); const fc = game.ProjectRFieldCombat; const w = navWorld(game, GAP_ROWS); playerSim(game, w);
    const north = game.addNavEnemy(1, 4, 3), south = game.addNavEnemy(2, 4, 5);
    game.$gameSystem._playerPassThroughEvents = [77];                              // もとからある別のイベント(戻すときに残す)
    game.setPlayer(4, 4); fc.begin();
    for (const id of [1, 2]) fc.attachEnemy(id, { ...NAV_SIGHT, windupFrames: 3000, cooldownFrames: 3000 });
    game.frame(3);
    game.press(0, 1, 2, 20); assert.ok(Math.abs(game.$gamePlayer._realY - 4) < 0.01, "20 フレームでは、まだ通り抜けない(従来どおり、はさまれて動けない)"); assert.deepEqual(plain(fc.getSoftPass()), []);
    game.press(0, 1, 2, 12);
    assert.deepEqual(plain(fc.getSoftPass()), [2], "24 フレーム進めなかったので、押している向き(南)の敵だけ"); assert.ok(game.passList().includes(2) && game.passList().includes(77));
    assert.ok(!game.passList().includes(1), "北の敵は対象ではない");
    game.press(0, 1, 2, 60);
    assert.ok(game.$gamePlayer._realY > 5.9, "南の敵を通り抜けて、扉口の外へ出た: y=" + game.$gamePlayer._realY.toFixed(2));
    game.frame(25);
    assert.deepEqual(plain(fc.getSoftPass()), [], "体が重ならなくなったら戻す"); assert.deepEqual(game.passList(), [77], "もとからあるイベントは残す");
    // 壁は通れない(通り抜けは敵だけ)
    const y = game.$gamePlayer._realY; game.press(1, 0, 6, 200); assert.ok(game.$gamePlayer._realX < 8.01, "壁は通れない"); game.press(0, 1, 2, 5);
    // 終わると、必ず戻す
    game.setPlayer(4, 4); north._realY = 3; south._realY = 5; game.press(0, 1, 2, 40);
    assert.ok(fc.getSoftPass().length >= 1, "もう一度、はさまれた");
    fc.end(); assert.deepEqual(plain(fc.getSoftPass()), []); assert.deepEqual(game.passList(), [77], "戦闘が終わると戻す(セーブに残さない)");
    // 倒れたら戻す
    fc.begin(); fc.attachEnemy(1, { ...NAV_SIGHT, windupFrames: 3000 }); fc.attachEnemy(2, { ...NAV_SIGHT, windupFrames: 3000 }); game.setPlayer(4, 4); north._realY = 3; south._realY = 5; game.frame(3); game.press(0, 1, 2, 40);
    assert.deepEqual(plain(fc.getSoftPass()), [2]); game.setEnemyHp(2, 0); game.frame(2);
    assert.deepEqual(plain(fc.getSoftPass()), [], "倒れたら戻す"); assert.ok(!game.passList().includes(2));
    fc.end();
});

test("渋滞(3b): 広い所で1体に当たっているだけ・壁で止まっているだけ・ChokeSoftCollision=false・DEV でない通常の移動では、通り抜けを使わない", () => {
    const OPEN = ["RRRRRRRRR", "R.......R", "R.......R", "R.......R", "R.......R", "R.......R", "RRRRRRRRR"];
    const g1 = loadGame(); const f1 = g1.ProjectRFieldCombat; const w1 = navWorld(g1, OPEN); playerSim(g1, w1);
    g1.addNavEnemy(1, 4, 3); g1.setPlayer(4, 1.9); f1.begin(); f1.attachEnemy(1, { ...NAV_SIGHT, windupFrames: 3000, cooldownFrames: 3000 }); g1.frame(3);
    g1.press(0, 1, 2, 60); assert.deepEqual(plain(f1.getSoftPass()), [], "広い所で 1 体に当たっているだけ: 使わない");
    // 壁で止まっている(敵のせいではない)
    const g2 = loadGame(); const f2 = g2.ProjectRFieldCombat; const w2 = navWorld(g2, GAP_ROWS); playerSim(g2, w2);
    g2.addNavEnemy(1, 4, 6); g2.setPlayer(1, 1); f2.begin(); f2.attachEnemy(1, { ...NAV_SIGHT, windupFrames: 3000, cooldownFrames: 3000 }); g2.frame(3);
    g2.press(-1, 0, 4, 60); assert.deepEqual(plain(f2.getSoftPass()), [], "壁で止まっているだけ: 使わない");
    // 切る
    const g3 = loadGame(); const f3 = g3.ProjectRFieldCombat; const w3 = navWorld(g3, GAP_ROWS); playerSim(g3, w3);
    g3.addNavEnemy(1, 4, 3); g3.addNavEnemy(2, 4, 5); g3.setPlayer(4, 4); f3.begin();
    for (const id of [1, 2]) f3.attachEnemy(id, { ...NAV_SIGHT, windupFrames: 3000, cooldownFrames: 3000 });
    f3.setSoftCollision(false); g3.frame(3); g3.press(0, 1, 2, 80);
    assert.deepEqual(plain(f3.getSoftPass()), []); assert.ok(Math.abs(g3.$gamePlayer._realY - 4) < 0.01, "切ると、従来どおり動けない");
    assert.equal(f3.setSoftCollision(true), true);
    // ソース: Hendrix の既存の仕組みだけを使い、DotMove・Game_Player を書き換えない・攻撃の当たり判定(_through)は触らない
    const src = read("js/plugins/ProjectR_FieldCombat.js"); const part = src.slice(src.indexOf("出入口の渋滞(Stage 4b)"), src.indexOf("    const updateEnemies = () => {"));
    assert.match(part, /_playerPassThroughEvents/); assert.doesNotMatch(part, /Game_Player\.prototype|Game_Event\.prototype|Game_CharacterBase\.prototype|DotMoveSystem\./);
    assert.doesNotMatch(part, /\._through\s*=/, "ソフト衝突は、敵の _through(攻撃の当たり判定にも関わる)を変えない");
});

test("渋滞(4): 2〜3体が扉口へ押し寄せても、重ならず・全員がやがて(攻撃できる所へ)出てくる・倒しても勝利の判定は変わらない。繰り返しても状態が残らない", () => {
    const game = loadGame({ dev: false }); const fc = game.ProjectRFieldCombat; const w = navWorld(game, GAP_ROWS);
    const es = [game.addNavEnemy(1, 4, 3), game.addNavEnemy(2, 4, 2), game.addNavEnemy(3, 4, 1)];
    game.setPlayer(4, 6.5); fc.begin(); for (const e of es) fc.attachEnemy(e.eventId(), { ...NAV_SIGHT, reach: 0.8, windupFrames: 20, cooldownFrames: 40 });
    let minGap = 9;
    for (let i = 0; i < 900; i++) { game.frame(1); for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) minGap = Math.min(minGap, Math.max(Math.abs(es[a]._realX - es[b]._realX), Math.abs(es[a]._realY - es[b]._realY))); }
    assert.ok(minGap >= 0.98, "重ならない: " + minGap.toFixed(2));
    assert.ok(es[0]._realY > 4.5 && es[1]._realY > 4.5, "前の 2 体は扉口を通って南の部屋へ出た: " + es.map(e => e._realY.toFixed(1)).join(","));
    assert.ok(game.attackLog.some(a => a.eventId === 1), "先頭は攻撃を予約する(後ろの敵は、前の敵の後ろで順番を待つ)");
    const st = fc.getNavStats(); assert.equal(st.errors, 0, String(st.lastError));
    // 前の敵を倒すと、順番に詰めて、最後の 1 体も出てきて攻撃する(扉口の死体が道をふさがない)
    const attacks = game.attackLog.length;
    game.setEnemyHp(1, 0); game.frame(2); assert.equal(es[0]._through, true, "倒れた敵はすぐ通れる");
    game.setEnemyHp(2, 0); game.frame(200);
    assert.ok(es[2]._realY > 4.5, "最後の 1 体も、死体の上を通って出てくる: y=" + es[2]._realY.toFixed(2));
    assert.ok(game.attackLog.some(a => a.eventId === 3), "最後の 1 体が攻撃を予約する");
    for (const e of es) { game.setEnemyHp(e.eventId(), 0); game.frame(2); assert.equal(e._through, true, "倒れた敵はすぐ通れる"); }
    assert.deepEqual(plain(fc.listEnemies()), [], "全員倒したので、一覧は空(勝利の判定は従来どおり。敵が残らない)");
    assert.deepEqual(plain(fc.getSoftPass()), []);
    fc.end(); fc.resetNavStats();
    // 繰り返し: 新しい敵で、また同じ
    const g2 = loadGame({ dev: false }); const f2 = g2.ProjectRFieldCombat; navWorld(g2, GAP_ROWS);
    for (let round = 0; round < 2; round++) {
        const e = g2.addNavEnemy(10 + round, 4, 3); g2.setPlayer(4, 6.5); f2.begin(); f2.attachEnemy(10 + round, { ...NAV_SIGHT, reach: 0.8, windupFrames: 20 });
        g2.frame(300); assert.ok(e._realY > 4.5, "ラウンド " + round + ": 扉口を通って出てくる"); f2.end();
        assert.deepEqual(plain(f2.getSoftPass()), []);
    }
});
