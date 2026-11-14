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
