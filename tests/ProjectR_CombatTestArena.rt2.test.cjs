"use strict";
// Phase 5A-RT2: MZ実機で見つかった3つの不具合の回帰テスト。
//   1) 戦闘HUDの表示条件（実際の戦闘イベント = ProjectRCombatPresence だけ）
//   2) 戦闘中も決定キーでマップのEventを調べられること
//   3) カード使用後の補充（実Coreの状態とHUDの両方）
// 実Core・実CardBattleInput・実Activation・実CombatPresence・実BattleHUD・実アリーナ補助pluginを
// 本番と同じ順で読み込み、Input → Scene_Map.update → requestUseCard のMZに近い経路で検証する。
// Sprite/描画/MZ実機は対象外（記録用のdoubleのみ）。
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

// 既存テストの先頭部(読み込み関数・表示double)だけを取り出して再利用する。
function prefixOf(file, exportsList) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + `\nthis.exp = { ${exportsList} };`, f);
    return f.exp;
}
const arenaH = prefixOf("tests/ProjectR_CombatTestArena.test.cjs", "load, SEQUENCE, ARENA, ROOM, arenaMap");
const hudH = prefixOf("tests/ProjectR_BattleHUD.phase5a.test.cjs", "installUi, text");
const { ARENA } = arenaH;
const SEQ = plain(arenaH.SEQUENCE), arenaMap = plain(arenaH.arenaMap);
const PRESENCE = "js/plugins/ProjectR_CombatPresence.js", HUD = "js/plugins/ProjectR_BattleHUD.js";
const FACING = "js/plugins/ProjectR_PlayerFacing.js";

// ---------- アリーナ実マップのEventから作る擬似Game_Event ----------
// 画面は本番設定の1920x1080。プレイヤーを画面中央に置くMZのスクロールと同じ座標系。
class FakeEvent {
    constructor(g, data) {
        this.g = g; this.data = data; this._eventId = data.id; this._erased = false; this._transparent = false;
        this.databaseEnemy = /<enemy>/.test(data.note || "") ? { id: 1 } : null;
        this.x = data.x; this.y = data.y;
    }
    event() { return this.data; }
    eventId() { return this._eventId; }
    isTransparent() { return this._transparent; }
    setTransparent(value) { this._transparent = !!value; }
    screenX() { return (this.x - this.g.$gamePlayer.x) * 48 + 960 + 24; }
    screenY() { return (this.y - this.g.$gamePlayer.y) * 48 + 540 + 48; }
    onScreen() {
        const x = this.screenX(), y = this.screenY();
        return x + 24 >= 0 && x - 24 <= 1920 && y >= 0 && y - 48 <= 1080;
    }
}

// 本番の並び(CardDeckCore → CardBattleInput → … → CombatPresence → BattleHUD → Arena)に合わせた積み上げ。
function stack({ hud = true, playtest = true } = {}) {
    const g = arenaH.load({ playtest, beforePlugin: g => {
        vm.runInContext("class Game_Followers { initialize() {} show() {} hide() {} refresh() {} }\n" +
            "class Game_Temp { reserveCommonEvent() {} }", g);
        if (hud) hudH.installUi(g);
        delete g.ProjectRCombatPresence; // installUiの仮CombatPresenceを外し、実物を使う
        vm.runInContext(read(PRESENCE), g);
        if (hud) {
            vm.runInContext(read(HUD), g);
            g.scene = g.SceneManager._scene;
            g.scene.createProjectRBattleHUD();
            g.hud = g.scene._projectRBattleHudLayer;
        }
    } });
    g.scene = g.SceneManager._scene;
    g.Graphics.width = 1920; g.Graphics.height = 1080;
    g.mapId = ARENA;
    g.$gamePlayer.x = 25; g.$gamePlayer.y = 26;
    // 実マップ(Map004)の全Event。<enemy>はHendrix同様のdatabaseEnemyを持つ。
    g.fakeEvents = arenaMap.events.filter(Boolean).map(data => new FakeEvent(g, data));
    g.$gameMap._events = [null];
    for (const event of g.fakeEvents) g.$gameMap._events[event._eventId] = event;
    const liveEvents = () => g.$gameMap._events.filter(Boolean); // 動的に生成される弾・Hitboxも含む
    g.$gameMap.events = liveEvents;
    g.$gameMap.getCurrentEventHp = () => 1000;
    g.dummies = g.fakeEvents.filter(event => event.databaseEnemy);
    // 実MZのSprite_Character相当(画面座標は擬似Eventから読む)。CombatPresenceはこのspritesetを優先して画面内判定する。
    g.scene._spriteset = g.scene._spriteset || {};
    g.scene._spriteset._characterSprites = g.fakeEvents.map(event => ({
        _character: event, width: 48, height: 48, anchor: { x: 0.5, y: 1 }, isEmptyCharacter: () => false,
        get x() { return event.screenX(); }, get y() { return event.screenY(); }
    }));
    // マップ読込(Game_Map.setup → Scene_Map.start)をMZと同じ順で行う。
    g.loadMap = () => {
        // 実MZではGame_Map.setupの中でEventが作られる。擬似Eventも同じ時点で参照できるようにする。
        g.$gameMap.events = () => g.fakeEvents;
        g.Game_Map.prototype.setup.call(g.$gameMap, ARENA);
        g.$gameMap.events = liveEvents;
        g.$gameMap._events = [null];
        for (const event of g.fakeEvents) g.$gameMap._events[event._eventId] = event;
        g.scene.start();
    };
    g.run = (frames = 1) => {
        for (let i = 0; i < frames; i++) {
            g.Graphics.frameCount++;
            g.scene.update();
            g.$gameMap.update(true);
            g.hud?.update();
        }
    };
    g.presence = () => g.ProjectRCombatPresence.isCombatActive();
    g.combatDummiesOnScreen = () => g.dummies.filter(e => e.onScreen() && !e.isTransparent());
    return g;
}
const press = (g, code, keyCode, extra = {}) => g.Input._onKeyDown({ code, keyCode, repeat: false, target: g.document.activeElement, preventDefault() {}, ...extra });
const release = (g, code, keyCode) => g.Input._onKeyUp({ code, keyCode, target: g.document.activeElement, preventDefault() {} });
const CARD_LETTERS = ["Q", "E", "X", "C", "V"];
const pressCard = (g, n) => { const l = CARD_LETTERS[n - 1]; press(g, `Key${l}`, l.charCodeAt(0)); g.run(1); release(g, `Key${l}`, l.charCodeAt(0)); };
const battle = g => g.d.getBattleState();
const handIds = g => battle(g).hand.map(c => c.cardId);
const counts = g => ({ draw: battle(g).drawPile.length, discard: battle(g).discardPile.length, cooldown: battle(g).cooldownPile.length });
const hudSlotIds = g => g.ProjectRBattleHUD.getViewModel().slots.map(s => s.cardId);
const hudCounts = g => hudH.text(g.hud._countsHUD._text);

let passed = 0;
function test(name, body) {
    if (process.env.CONTINUE) {
        try { body(); console.log(`ok ${++passed} - ${name}`); } catch (e) { console.log(`FAIL - ${name}: ${String(e.message).split(String.fromCharCode(10))[0]}`); }
        return;
    }
    body(); console.log(`ok ${++passed} - ${name}`);
}
test("原因の再現条件: アリーナの出現位置から、1920x1080の画面にダミーが入る（Eventが居るだけで戦闘扱いになる配置）", () => {
    const g = stack();
    assert.ok(g.dummies.length >= 5);
    assert.ok(g.dummies.some(e => e.onScreen()), "出現位置の画面内に敵ダミーがある");
});
test("アリーナに入っただけではHUDは出ない: ダミーは戦闘が始まるまで現れず、戦闘判定にも入らない", () => {
    const g = stack(); g.loadMap(); g.run(60);
    assert.equal(g.d.isCardBattleActive(), false);
    assert.ok(g.dummies.every(e => e.isTransparent()), "ダミーはテスト前は非表示");
    assert.equal(g.combatDummiesOnScreen().length, 0);
    assert.equal(g.presence(), false);
    assert.equal(g.hud.visible, false);
    assert.equal(g.ProjectRBattleHUD.getViewModel().visible, false);
});
test("マップ読込の直後(最初の戦闘判定より前)からダミーは非表示で、HUDが一瞬出ることもない", () => {
    const g = stack();
    g.$gameMap.events = () => g.fakeEvents;
    g.Game_Map.prototype.setup.call(g.$gameMap, ARENA);
    g.$gameMap.events = () => g.$gameMap._events.filter(Boolean);
    assert.ok(g.dummies.every(e => e.isTransparent()));
    g.scene.start();
    assert.equal(g.presence(), false);
    g.hud.update();
    assert.equal(g.hud.visible, false);
});
test("カード戦闘(CardDeck)が有効なだけではHUDは出ない: 実際の戦闘イベントが無ければ非表示のまま", () => {
    const g = stack(); g.mapId = 1; g.fakeEvents = []; g.$gameMap._events = [null]; // 敵のいない普通のマップ
    g.scene.start(); g.run(10);
    assert.equal(g.arena.startHermes().ok, true); g.run(5);
    assert.equal(g.hud.visible, true, "テスト戦闘(宣言された戦闘イベント)の間は表示");
    // 戦闘イベントの宣言だけを外す: 敵もおらず、CardDeckだけが有効な状態。
    assert.equal(g.ProjectRCombatPresence.endCombatEvent("ProjectR_CombatTestArena"), true);
    g.run(60);
    assert.equal(g.d.isCardBattleActive(), true);
    assert.equal(g.presence(), false);
    assert.equal(g.hud.visible, false);
    const vm5 = g.ProjectRBattleHUD.getViewModel();
    assert.equal(vm5.cardBattleActive, true); assert.equal(vm5.visible, false);
});
test("画面内に生存敵が居れば従来どおり戦闘扱い（本番の規則は不変）。透明な敵・画面外の敵・死んだ敵は数えない", () => {
    const g = stack({ playtest: false }); g.loadMap();
    const tank = g.dummies.find(e => e.data.name === "DEV Tank Dummy");
    assert.equal(tank.onScreen(), true);
    // RT3: 敵が画面内にいるだけでは戦闘HUDは出ない(HUDは明示的な戦闘イベントだけ)。武器の使用可否は従来どおり。
    g.run(30); assert.equal(g.presence(), true); assert.equal(g.hud.visible, false);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    tank.setTransparent(true); for (const e of g.dummies) e.setTransparent(true);
    g.run(40); assert.equal(g.presence(), false); assert.equal(g.hud.visible, false);
    for (const e of g.dummies) e.setTransparent(false);
    g.$gamePlayer.y = 34; g.$gamePlayer.x = 3; // 敵が全員画面外
    assert.ok(g.dummies.every(e => !e.onScreen()));
    g.run(40); assert.equal(g.presence(), false);
    g.$gamePlayer.x = 25; g.$gamePlayer.y = 26; g.run(5); assert.equal(g.presence(), true);
    g.$gameMap.getCurrentEventHp = () => 0; g.run(40); assert.equal(g.presence(), false);
});
test("Hermesテスト開始で戦闘イベントが始まりHUDが出る。ダミーが現れ、研究室など画面外へ移動しても出続ける", () => {
    const g = stack(); g.loadMap(); g.run(10);
    assert.equal(g.hud.visible, false);
    assert.equal(g.arena.startHermes().ok, true);
    g.run(5);
    assert.ok(g.dummies.every(e => !e.isTransparent()), "テスト中はダミーが現れる");
    assert.equal(g.presence(), true);
    assert.equal(g.hud.visible, true);
    const vm5 = g.ProjectRBattleHUD.getViewModel();
    assert.equal(vm5.visible, true); assert.equal(vm5.cardBattleActive, true);
    assert.deepEqual(plain(hudSlotIds(g)), SEQ.slice(0, 5));
    // 研究室へ移動: ダミーは全員画面外だが、テスト戦闘は続くのでHUD(Divine/Gauge)は出続ける。
    g.$gamePlayer.x = 10; g.$gamePlayer.y = 34;
    assert.ok(g.dummies.every(e => !e.onScreen()));
    g.run(60);
    assert.equal(g.presence(), true); assert.equal(g.hud.visible, true);
    assert.equal(g.hud._divineHUD.visible, true);
});
test("Apolloテストでも同様。戦闘終了(End Card Battle)でHUDは消え、ダミーも再び消える", () => {
    const g = stack(); g.loadMap();
    assert.equal(g.arena.startApollo().ok, true); g.run(10);
    assert.equal(g.hud.visible, true);
    assert.equal(g.arena.endTest().ok, true);
    g.run(40); // 通常の戦闘終了猶予(24フレーム)を過ぎる
    assert.equal(g.d.isCardBattleActive(), false);
    assert.equal(g.presence(), false);
    assert.equal(g.hud.visible, false);
    assert.ok(g.dummies.every(e => e.isTransparent()));
});
test("F8などで直接endCardBattleしても、戦闘イベントの宣言は残らずHUDが消える", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(10);
    assert.equal(g.hud.visible, true);
    g.d.endCardBattle(); g.run(40);
    assert.equal(g.presence(), false); assert.equal(g.hud.visible, false);
    assert.ok(g.dummies.every(e => e.isTransparent()));
});
test("リセット: 戦闘を終えてマップを読み直し、読み直し後に同じシナリオで再開すると再びHUDが出る", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(10);
    assert.equal(g.arena.resetScenario().ok, true);
    g.run(40); assert.equal(g.hud.visible, false);
    g.loadMap(); // Scene_Map.startのフックがシナリオを再開する
    g.run(5);
    assert.equal(g.d.isCardBattleActive(), true);
    assert.equal(g.hud.visible, true);
    assert.ok(g.dummies.every(e => !e.isTransparent()));
});
test("マップ移動(DEV部屋)では、現仕様どおりカード戦闘は続き、戦闘イベントの宣言も戦闘が続く間は保たれる", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(5);
    g.mapId = 5; g.$gameMap._events = [null];
    g.Game_Map.prototype.setup.call(g.$gameMap, 5); g.scene.start(); g.run(5);
    assert.equal(g.d.isCardBattleActive(), true);
    assert.equal(g.presence(), true);
});
test("Playtestでない配布版: アリーナ由来の戦闘宣言もダミー操作も無く、本番の規則だけが残る", () => {
    const g = stack({ playtest: false });
    assert.equal(g.ProjectRCombatTestArena, undefined);
    assert.equal(typeof g.ProjectRCombatPresence.registerCombatSource, "function");
    g.loadMap(); g.run(60);
    assert.ok(g.dummies.every(e => !e.isTransparent()), "配布版ではダミーに触れない");
});

// ---- CombatPresence: 戦闘イベント登録口の単体 ----
test("CombatPresence.registerCombatSource: 判定は毎回問い合わせ、例外・不正な登録は戦闘扱いにしない", () => {
    const g = stack({ hud: false, playtest: false }); g.mapId = 1; g.$gameMap._events = [null];
    const cp = g.ProjectRCombatPresence;
    g.scene.start(); g.run(5); assert.equal(cp.isCombatActive(), false);
    assert.equal(cp.registerCombatSource("", () => true), false);
    assert.equal(cp.registerCombatSource("x", true), false);
    let on = true;
    assert.equal(cp.registerCombatSource("x", () => on), true);
    g.run(5); assert.equal(cp.isCombatActive(), true); assert.equal(cp.canUseWeapon(), true);
    on = false; g.run(10); assert.equal(cp.isCombatActive(), true, "終了猶予の間は戦闘のまま");
    g.run(30); assert.equal(cp.isCombatActive(), false);
    cp.registerCombatSource("boom", () => { throw new Error("x"); });
    g.run(30); assert.equal(cp.isCombatActive(), false);
    on = true; cp.registerCombatSource("x", () => on); g.run(5); assert.equal(cp.isCombatActive(), true);
    assert.equal(cp.unregisterCombatSource("x"), true); g.run(40); assert.equal(cp.isCombatActive(), false);
    assert.equal(cp.unregisterCombatSource("x"), false);
});

// =====================================================================
// 2) 戦闘中の「調べる」
// =====================================================================
test("カード戦闘の入力層は決定キー(Enter/Z/F)を横取りしない。1～5だけが捕捉され、会話中は1～5も元のInputへ渡る", () => {
    const g = stack({ hud: false });
    g.arena.startHermes();
    assert.equal(g.d.isCardBattleActive(), true);
    for (const [code, keyCode, name] of [["Enter", 13, "ok"], ["KeyZ", 90, "ok"], ["KeyF", 70, "f"]]) {
        g.Input.clear();
        press(g, code, keyCode);
        assert.equal(g.Input._currentState[name], true, `${code}は戦闘中も元のInputへ届く`);
        release(g, code, keyCode);
    }
    // 1～5は戦闘中はカードへ(元のInputには届かない)。
    g.Input.clear(); press(g, "KeyQ", 81); assert.equal(Object.values(g.Input._currentState).some(Boolean), false);
    release(g, "KeyQ", 81);
    // 会話中(メッセージ表示中)は1～5もカードに取られず、元のInputへ渡る。
    g.$gameMessage.isBusy = () => true;
    assert.equal(g.ProjectRCardBattleInput.canAcceptInput(), false);
    g.Input.clear(); press(g, "KeyF", 70); assert.equal(g.Input._currentState.f, true);
});
test("Ultimateキー(U)は戦闘中も従来どおり要求になり、決定キー(F)の入力と干渉しない", () => {
    const g = stack({ hud: false });
    g.arena.startHermes(); g.arena.fillGauge();
    const before = g.ProjectRUltimateActivation.getLastUltimateActivationResult()?.serial ?? 0;
    press(g, "KeyF", 70); assert.equal(g.Input._currentState.f, true);
    press(g, "KeyU", 85); g.run(1); release(g, "KeyU", 85);
    const last = g.ProjectRUltimateActivation.getLastUltimateActivationResult();
    assert.ok(last && last.serial > before, "Uの要求が処理される");
    assert.equal(g.Input._currentState.u, undefined, "Uは決定キー側へ漏れない");
});

// MZに近い最小のGame_Player: Hendrixの照準(戦闘中は向きをマウス方向に固定)→ MZ標準のtriggerAction。
function interactionWorld({ withFacing }) {
    const code = `
        "use strict";
        class Game_CharacterBase {
            constructor() { this._direction = 2; this._directionFix = false; this._realX = 10; this._realY = 10; }
            direction() { return this._direction; }
            isDirectionFixed() { return this._directionFix; }
            setDirection(d) { if (!this.isDirectionFixed() && d) this._direction = d; }
            setDirectionFix(v) { this._directionFix = v; }
        }
        class Game_Character extends Game_CharacterBase { turnToward() {} }
        class Game_Temp { reserveCommonEvent() {} }
        class Game_Player extends Game_Character {
            update() {}
            performTransfer() {}
            isMoveRouteForcing() { return false; }
            isMoving() { return false; }
            canMove() { return !$gameMap.isEventRunning(); }
            // MZ標準: 決定キー → 正面のEventを起動
            triggerAction() { return this.canMove() && this.triggerButtonAction(); }
            triggerButtonAction() {
                if (Input.isTriggered("ok")) { this.checkEventTriggerThere([0, 1, 2]); return $gameMap.setupStartingEvent(); }
                return false;
            }
            checkEventTriggerThere(triggers) {
                const d = this._direction, dx = d === 6 ? 1 : d === 4 ? -1 : 0, dy = d === 2 ? 1 : d === 8 ? -1 : 0;
                for (const e of $gameMap.events()) {
                    if (e._erased || !triggers.includes(e._trigger) || !e.isNormalPriority()) continue;
                    if (Math.abs(e._realX - (this._realX + dx)) < 0.5 && Math.abs(e._realY - (this._realY + dy)) < 0.5) e.started = true;
                }
            }
            // Hendrixの戦闘中の照準: 向きをマウス方向へ向けて固定する
            aimAtMouse() { this.turnToward("mouse or gamepad"); this.setDirectionFix(true); }
            updateFrame() { this.aimAtMouse(); return this.triggerAction(); }
        }
        // 戦闘外の照準は通常の向き更新に任せ、固定しない(PlayerFacingが抑止する)。
        Game_Character.prototype.turnToward = function(target) { if (target === "mouse or gamepad") this._direction = $mouseDirection; };
        class Game_Event extends Game_CharacterBase {
            constructor(x, y, o = {}) { super(); this._realX = x; this._realY = y; this._trigger = o.trigger ?? 0; this._erased = false;
                this._transparent = !!o.transparent; this.databaseEnemy = o.enemy ? {} : null; this.priority = o.priority ?? 1; this._list = o.list ?? [1, 2]; }
            isTriggerIn(t) { return t.includes(this._trigger); }
            isNormalPriority() { return this.priority === 1; }
            isTransparent() { return this._transparent; }
            list() { return this._list; }
            eventId() { return this._id ?? 0; }
        }
        var $mouseDirection = 8, $combat = false;
        var $gamePlayer = new Game_Player();
        var $gameMap = { _events: [], events() { return this._events; }, isEventRunning: () => false,
            setupStartingEvent() { return this._events.some(e => e.started); } };
        var Input = { _t: false, dir4: 0, dir8: 0, isTriggered(name) { return name === "ok" && this._t; } };
        var $gameMessage = { isBusy: () => false };
        var window = globalThis;
        window.ProjectRCombatPresence = { isCombatActive: () => $combat, isCombatEventActive: () => $combat, settings: { attackCommonEventId: 1 } };
    `;
    const ctx = vm.createContext({ console });
    vm.runInContext(code, ctx);
    if (withFacing) vm.runInContext(read(FACING), ctx);
    const w = {
        ctx,
        put: (x, y, o) => vm.runInContext(`(() => { const e = new Game_Event(${x}, ${y}, ${JSON.stringify(o || {})}); $gameMap._events.push(e); return e; })()`, ctx),
        combat: value => vm.runInContext(`$combat = ${value}`, ctx),
        mouse: d => vm.runInContext(`$mouseDirection = ${d}`, ctx),
        interact: () => vm.runInContext(`(() => { Input._t = true; const r = $gamePlayer.updateFrame(); Input._t = false; return r; })()`, ctx),
        facing: () => vm.runInContext("$gamePlayer.direction()", ctx),
        fixed: () => vm.runInContext("$gamePlayer.isDirectionFixed()", ctx)
    };
    return w;
}
test("不具合の再現: 戦闘中は向きが照準に固定され、マウスが別方向だと隣の端末を調べられない（修正前の挙動）", () => {
    const w = interactionWorld({ withFacing: false });
    const terminal = w.put(11, 10); // 右隣
    w.combat(true); w.mouse(8);     // 戦闘中、マウスは上
    assert.equal(w.interact(), false);
    assert.equal(terminal.started, undefined);
});
test("修正後: 戦闘中でも決定キーで隣の端末を調べられる（マウスが別方向でも）", () => {
    const w = interactionWorld({ withFacing: true });
    const terminal = w.put(11, 10);
    w.combat(true); w.mouse(8);
    assert.equal(w.interact(), true);
    assert.equal(terminal.started, true);
    assert.equal(w.fixed(), true, "照準の向き固定は元に戻る");
});
test("上下左右どの隣の端末も調べられ、最も近いものが選ばれる", () => {
    for (const [x, y] of [[11, 10], [9, 10], [10, 11], [10, 9]]) {
        const w = interactionWorld({ withFacing: true });
        const far = w.put(x * 1 + (x - 10) * 0.9, y + (y - 10) * 0.9); // 少し遠い
        const near = w.put(x, y);
        w.combat(true); w.mouse(x === 11 ? 4 : 6);
        assert.equal(w.interact(), true);
        assert.equal(near.started, true); assert.notEqual(far.started, true);
    }
});
test("戦闘外は従来どおり（向きを変えない）、近くに端末が無ければ照準の向きのまま", () => {
    const w = interactionWorld({ withFacing: true });
    const terminal = w.put(11, 10);
    w.combat(false); w.mouse(8);
    w.interact(); assert.equal(terminal.started, undefined, "戦闘外はこの補助を使わない");
    const w2 = interactionWorld({ withFacing: true });
    w2.put(20, 20); w2.combat(true); w2.mouse(8);
    assert.equal(w2.interact(), false); assert.equal(w2.facing(), 8);
});
test("対象外: 敵・透明・決定ボタン以外・優先度が通常でない・実行内容が空・消去済みのEvent", () => {
    const w = interactionWorld({ withFacing: true });
    const events = [w.put(11, 10, { enemy: true }), w.put(9, 10, { transparent: true }), w.put(10, 11, { trigger: 1 }),
        w.put(10, 9, { priority: 0 }), w.put(11, 11, { list: [0] })];
    const erased = w.put(9, 9); vm.runInContext("$gameMap._events[$gameMap._events.length - 1]._erased = true", w.ctx);
    w.combat(true); w.mouse(8);
    assert.equal(w.interact(), false);
    assert.equal(w.facing(), 8);
    for (const e of [...events, erased]) assert.equal(e.started, undefined);
});
test("実装の範囲: 決定キーを押した瞬間だけ動作し、歩行・カード・Ultimateの入力経路には触れない", () => {
    const src = read(FACING);
    assert.match(src, /Game_Player\.prototype\.triggerButtonAction/);
    assert.doesNotMatch(src, /Input\._onKey|Scene_Map|\$gameMap\.mapId|mapId\s*===/, "入力層・Scene・特定マップに依存しない");
    // (CardBattleInput / UltimateActivation は RT3 で Q/E/X/C/V・診断を足した。F=決定キーを横取りしないことは別テストで確認)
    assert.doesNotMatch(read("js/plugins/ProjectR_CardBattleInput.js"), /isTriggered\("ok"\)|keyMapper\[/);
});

// =====================================================================
// 3) 補充(replacement draw)
// =====================================================================
test("Coreの状態: 物理1キー→Input→Scene_Map.update→requestUseCard→消費・Cooldown・即補充（Golden Arrow）", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(5);
    assert.deepEqual(plain(handIds(g)), SEQ.slice(0, 5));
    assert.deepEqual(plain(counts(g)), { draw: 25, discard: 0, cooldown: 0 });
    const usedInstance = battle(g).hand[0].instanceId;
    pressCard(g, 1);
    const last = g.ProjectRCardBattleInput.getLastResult();
    assert.equal(last.reason, "success"); assert.equal(last.handIndex, 0); assert.equal(last.cardId, SEQ[0]);
    assert.equal(battle(g).hand.length, 5, "手札は5枚に戻る");
    assert.deepEqual(plain(handIds(g)), SEQ.slice(1, 6), "使ったカードは手札から抜け、補充は末尾(スロット5)へ");
    assert.deepEqual(plain(counts(g)), { draw: 24, discard: 0, cooldown: 1 });
    const cooling = battle(g).cooldownPile[0];
    assert.equal(cooling.instance.instanceId, usedInstance); assert.equal(cooling.instance.cardId, SEQ[0]);
    assert.equal(battle(g).hand.some(c => c.instanceId === usedInstance), false);
});
test("HUDも実Coreの状態をそのまま読む: スロット・DRAW・COOLDOWNが使用直後に更新される", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(8);
    assert.deepEqual(plain(hudSlotIds(g)), SEQ.slice(0, 5));
    assert.match(hudCounts(g), /DRAW 25\s+DISCARD 0\s+COOLDOWN 0/);
    const namesBefore = g.hud._skillHUD._slots.map(s => hudH.text(s._nameText));
    pressCard(g, 1); g.run(8);
    assert.deepEqual(plain(hudSlotIds(g)), SEQ.slice(1, 6));
    assert.match(hudCounts(g), /DRAW 24\s+DISCARD 0\s+COOLDOWN 1/);
    const namesAfter = g.hud._skillHUD._slots.map(s => hudH.text(s._nameText));
    assert.deepEqual(namesAfter.slice(0, 4), namesBefore.slice(1), "スロット1には元のスロット2のカードが入る");
    assert.notEqual(namesAfter[0], namesBefore[0]);
    assert.ok(namesAfter[4] && namesAfter[4] !== "");
});
test("連続して使っても毎回1枚ずつ補充され、手札5枚・DRAW減少・COOLDOWN増加・カードの重複なし", () => {
    const g = stack(); g.loadMap(); g.arena.startApollo(); g.run(5);
    let draw = 25, cooldown = 0, expectedNext = 5;
    for (const key of [1, 3, 5, 2, 4, 1]) {
        const before = handIds(g);
        pressCard(g, key); g.run(4);
        draw -= 1; cooldown += 1;
        assert.equal(g.ProjectRCardBattleInput.getLastResult().reason, "success");
        const after = handIds(g);
        assert.equal(after.length, 5);
        const expected = [...before]; expected.splice(key - 1, 1); expected.push(SEQ[expectedNext++ % 7]);
        assert.deepEqual(plain(after), expected);
        assert.deepEqual(plain(counts(g)), { draw, discard: 0, cooldown });
        assert.deepEqual(plain(hudSlotIds(g)), expected);
        const ids = [...battle(g).hand.map(c => c.instanceId), ...battle(g).cooldownPile.map(e => e.instance.instanceId),
            ...battle(g).drawPile.map(c => c.instanceId), ...battle(g).discardPile.map(c => c.instanceId)];
        assert.equal(new Set(ids).size, 30, "30枚の実体が増減しない");
    }
});
test("クールダウン完了後は捨て札へ移り、山札が尽きても循環して引き続ける", () => {
    const g = stack({ hud: false }); g.loadMap(); g.arena.startHermes(); g.run(5);
    for (let i = 0; i < 30; i++) {
        pressCard(g, 1); g.run(2);
        assert.equal(battle(g).hand.length, 5, `${i + 1}回目でも手札は5枚`);
        g.d.updateCooldown(60); // 全Cooldownを完了させる
    }
    assert.equal(counts(g).draw + counts(g).discard + counts(g).cooldown + 5, 30);
});
test("発動に失敗した入力では、手札・山札・Cooldown・HUDは何も変わらず補充もしない", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(8);
    g.d.registerActivationHandler("direction", () => ({ ok: false, reason: "testRejected" }));
    const handBefore = plain(battle(g).hand), stateBefore = plain(battle(g)), hudBefore = plain(hudSlotIds(g));
    pressCard(g, 1); g.run(8);
    const last = g.ProjectRCardBattleInput.getLastResult();
    assert.equal(last.ok, false); assert.equal(last.reason, "activationFailed");
    assert.deepEqual(plain(battle(g).hand), handBefore);
    assert.deepEqual(plain(battle(g)), stateBefore);
    assert.deepEqual(plain(hudSlotIds(g)), hudBefore);
    assert.match(hudCounts(g), /DRAW 25\s+DISCARD 0\s+COOLDOWN 0/);
    // 失敗の理由は状態表示から確認できる(F8不要)。
    assert.match(g.arena.statusLines().join("\n"), /直近のカード入力: 失敗 activationFailed \(testRejected\)/);
    // 空き枠・範囲外のスロットでも補充しない。
    g.d.registerActivationHandler("direction", () => ({ ok: true }));
    pressCard(g, 1); g.run(2);
    assert.equal(g.ProjectRCardBattleInput.getLastResult().reason, "success");
});
test("アリーナの戦闘用デッキは30枚の実体を持ち、初期手札の後に十分な山札が残る", () => {
    const g = stack({ hud: false }); g.arena.startHermes();
    const s = battle(g);
    assert.equal(s.hand.length + s.drawPile.length + s.discardPile.length + s.cooldownPile.length, 30);
    assert.equal(s.drawPile.length, 25);
    assert.deepEqual(plain(s.hand.map(c => c.cardId)), SEQ.slice(0, 5));
    // 山札の次の引き順: Lyre Calm → Obscure → 以降も7枚の実カードを巡回
    assert.deepEqual(plain([...s.drawPile].reverse().slice(0, 4).map(c => c.cardId)), [SEQ[5], SEQ[6], SEQ[0], SEQ[1]]);
});

// =====================================================================
// 4) 起動と操作盤
// =====================================================================
test("enter(): マップ移動の予約だけ。戦闘もダミーの出現もHUDも起こさない", () => {
    const g = stack(); g.mapId = 1;
    const result = g.arena.enter();
    assert.equal(result.ok, true);
    assert.equal(g.d.isCardBattleActive(), false);
    assert.deepEqual(plain(g.transfers.at(-1).slice(0, 4)), [4, 25, 26, 8]);
    g.mapId = ARENA; g.loadMap(); g.run(60); // 予約された移動の完了後(アリーナ到着)
    assert.equal(g.d.isCardBattleActive(), false);
    assert.equal(g.presence(), false);
    assert.equal(g.hud.visible, false);
});
test("操作盤(Control Hub)の選択肢は戦闘中も呼べる: Reset/End/Instructions/Exit/Closeが揃い、戦闘中に使うと正しく動く", () => {
    const hub = arenaMap.events.filter(Boolean).find(e => e.name === "DEV Control Hub");
    const labels = hub.pages[0].list.filter(c => c.code === 102).flatMap(c => c.parameters[0]);
    for (const label of ["Reset Current Test", "End Card Battle", "Show Test Instructions", "Exit Arena", "Close"]) {
        assert.ok(labels.includes(label), label);
    }
    // 戦闘開始後にもう一度操作盤の各コマンドを実行する。
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(5);
    assert.ok(g.command("showStatus").length > 0);
    assert.ok(g.command("showInstructions").length > 0);
    g.command("gaugeAdd25"); assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 25);
    g.command("divineAreaHit"); g.command("divineGlobalHit");
    assert.equal(g.d.isCardBattleActive(), true, "研究室の端末は戦闘を終わらせない");
    g.PluginManager.callCommand({ setWaitMode() {} }, "ProjectR_CombatTestArena", "resetTest", {});
    assert.equal(g.d.isCardBattleActive(), false);
    g.loadMap(); g.run(3); assert.equal(g.d.isCardBattleActive(), true);
    g.command("endTest"); assert.equal(g.d.isCardBattleActive(), false);
    g.arena.startHermes();
    g.PluginManager.callCommand({ setWaitMode() {} }, "ProjectR_CombatTestArena", "exitArena", {});
    assert.equal(g.d.isCardBattleActive(), false);
});

// =====================================================================
// 5) 回帰: 数値・既存システムは変えていない
// =====================================================================
test("カード定義・Cooldown・Divine・Gauge・Ultimate・本番検証・Playtestガードは不変（ソースの差分で確認）", () => {
    // (RT3で意図して変えたCardBattleInput/UltimateActivation/HermesReedFluteSleep/HermesSwordsmanshipは除く)
    const unchanged = ["ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateGauge",
        "ProjectR_UltimateGodDamageBridge", "ProjectR_HermesUltimate", "ProjectR_ApolloUltimate",
        "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack", "ProjectR_ApolloLyreCalm", "ProjectR_HermesRecognitionObscure",
        "ProjectR_HermesSwiftMovement",
        "Hendrix_Action_Engine", "Hendrix_Keyboard_Gamepad", "Hendrix_Hotbar_Creator", "DotMoveSystem"].map(n => `js/plugins/${n}.js`);
    const result = cp.spawnSync("git", ["diff", "--quiet", "72c386a", "--", ...unchanged, "data/Skills.json", "data/States.json"],
        { cwd: path.join(__dirname, "..") });
    assert.equal(result.status, 0);
    const params = {}; vm.runInNewContext(read("js/plugins.js"), params);
    const before = cp.execFileSync("git", ["show", "72c386a:js/plugins.js"], { encoding: "utf8", cwd: path.join(__dirname, "..") });
    const plainLines = text => text.split(/\r?\n/).filter(l => /"ProjectR_(CardDeckCore|BattleHUD)"/.test(l));
    assert.deepEqual(plainLines(read("js/plugins.js")), plainLines(before), "プラグイン登録・パラメータは変えていない");
});
test("HUDの変更は表示条件の1か所だけ（Phase 5Aの表示内容・Divine/Gauge/Ultimate表示は不変）", () => {
    const source = read(HUD);
    const body = source.slice(source.indexOf("shouldShow() {"), source.indexOf("shouldShow() {") + 1500);
    assert.doesNotMatch(body, /cardBattleActive\(\)/, "カード戦闘が有効なだけでは強制表示しない");
    assert.match(body, /isCombatEventActive/, "明示的な戦闘イベントだけを見る");
});

console.log(`\n${passed} tests passed`);
