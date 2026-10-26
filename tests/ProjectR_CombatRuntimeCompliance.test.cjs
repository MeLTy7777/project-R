"use strict";
// Phase 5A-RT3: MZ実機で確認された実行時の不具合の回帰テスト。
//   入力(Q/E/X/C/V)・戦闘HUDの条件(明示的な戦闘イベント)・向き・調べる(F)・Reed Flute・
//   神の見える召喚・Ultimateの診断・Hermes剣術の見た目・剣/銃の公式構成。
// 実Plugin(CardBattleInput / CombatPresence / PlayerFacing / BattleHUD / GodSummonVisual /
// UltimateActivation / アリーナ)を本番と同じ順で読み込む。MZ実機・描画は対象外(doubleのみ)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const json = file => JSON.parse(read(file));

function prefixOf(file, exportsList) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + `\nthis.exp = { ${exportsList} };`, f);
    return f.exp;
}
const rt2 = prefixOf("tests/ProjectR_CombatTestArena.rt2.test.cjs", "stack, press, release, pressCard, battle, handIds, hudSlotIds, SEQ, ARENA, CARD_LETTERS");
const { stack, press, release, pressCard, battle, handIds } = rt2;
const SEQ = plain(rt2.SEQ);
const LETTERS = ["Q", "E", "X", "C", "V"];
const plugins = (() => { const c = {}; vm.runInNewContext(read("js/plugins.js"), c); return c.$plugins; })();
const pluginIndex = name => plugins.findIndex(p => p.name === name);

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// =====================================================================
// 1) カードキー Q / E / X / C / V
// =====================================================================
test("Q/E/X/C/V は手札の左から hand[0]〜hand[4] を1回ずつ使う(物理キー→Input→Scene_Map→requestUseCard)", () => {
    for (let i = 0; i < 5; i++) {
        const g = stack(); g.loadMap(); assert.equal(g.arena.startHermes().ok, true); g.run(3);
        const before = handIds(g);
        pressCard(g, i + 1);
        const result = g.ProjectRCardBattleInput.getLastResult();
        assert.equal(result.handIndex, i, `${LETTERS[i]} → slot ${i + 1}`);
        assert.equal(result.cardId, before[i]);
        assert.equal(g.ProjectRCardBattleInput.getDiagnostics().lastCode, `Key${LETTERS[i]}`);
    }
});
test("数字キー 1〜5(Digit/Numpad)はカードを発動しない。手札は不変で入力結果も作られない", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    const before = plain(battle(g));
    for (let n = 1; n <= 5; n++) { press(g, `Digit${n}`, 48 + n); g.run(1); release(g, `Digit${n}`, 48 + n); }
    for (let n = 1; n <= 5; n++) { press(g, `Numpad${n}`, 96 + n); g.run(1); release(g, `Numpad${n}`, 96 + n); }
    assert.deepEqual(plain(battle(g)), before);
    assert.equal(g.ProjectRCardBattleInput.getLastResult(), null);
});
test("押しっぱなしでは毎フレーム再発動しない(repeat・二重keydownを捕捉)。keyupで次の押下が通る", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    press(g, "KeyQ", 81); g.run(1);
    for (let i = 0; i < 5; i++) { press(g, "KeyQ", 81, { repeat: true }); g.run(1); }
    press(g, "KeyQ", 81); g.run(2); // 離さずに再度keydown
    assert.equal(g.ProjectRCardBattleInput.getDiagnostics().accepted, 1);
    release(g, "KeyQ", 81);
    press(g, "KeyQ", 81); g.run(1); release(g, "KeyQ", 81);
    assert.equal(g.ProjectRCardBattleInput.getDiagnostics().accepted, 2);
});
test("カード戦闘の外では Q/E/X/C/V を奪わず元のInputへ渡す(既存の割当は維持)", () => {
    const g = stack(); g.loadMap(); g.run(3);
    assert.equal(g.d.isCardBattleActive(), false);
    press(g, "KeyQ", 81);
    assert.equal(Object.values(g.Input._currentState).some(Boolean), true, "戦闘外は従来のInputへ届く");
    release(g, "KeyQ", 81);
    assert.equal(g.ProjectRCardBattleInput.getDiagnostics().accepted, 0);
});
test("入力を受け付けない理由を診断に残す(イベント実行中はキーを元のInputへ渡し、理由が見える)", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    g.$gameMap.isEventRunning = () => true;
    press(g, "KeyE", 69); g.run(1); release(g, "KeyE", 69);
    const diag = g.ProjectRCardBattleInput.getDiagnostics();
    assert.equal(diag.lastDecision, "passedThrough"); assert.equal(diag.lastReason, "eventRunning");
    assert.equal(g.ProjectRCardBattleInput.getLastResult(), null);
});
test("HUDのスロット表示は左から Q E X C V。1 2 3 4 5 の表示は無い", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    const vmx = g.ProjectRBattleHUD.getViewModel();
    assert.deepEqual(plain(vmx.slots.map(s => s.key)), LETTERS);
    assert.deepEqual(plain(g.ProjectRCardBattleInput.getKeyLabels()), LETTERS);
    assert.equal(/CARD [1-5]/.test(read("js/plugins/ProjectR_BattleHUD.js")), false);
    const lines = g.arena.instructions().flat().join("\n");
    assert.match(lines, /Q E X C V/); assert.equal(/1〜5\s*=|1〜5でカード|1〜5キー/.test(lines), false);
});

// =====================================================================
// 2) 戦闘HUD: 明示的な戦闘イベントだけ
// =====================================================================
test("敵が画面内にいるだけではHUDは出ない(武器用の従来の戦闘状態は真のまま)", () => {
    const g = stack({ playtest: false }); g.loadMap(); g.run(40);
    assert.ok(g.combatDummiesOnScreen().length > 0);
    assert.equal(g.presence(), true);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(g.hud.visible, false);
});
test("カード戦闘が有効なだけではHUDは出ない / 明示的なbeginでHUDが出て、endですぐ消える(猶予なし)", () => {
    const g = stack(); g.loadMap(); g.run(3);
    const cp = g.ProjectRCombatPresence;
    assert.equal(g.arena.startHermes().ok, true);
    assert.equal(g.ProjectRCombatPresence.endCombatEvent("ProjectR_CombatTestArena"), true); g.run(30); // カード戦闘だけを残す
    assert.equal(g.d.isCardBattleActive(), true); assert.equal(g.hud.visible, false);
    assert.equal(cp.beginCombatEvent("boss-1"), true); g.run(2);
    assert.equal(cp.isCombatEventActive(), true); assert.equal(g.hud.visible, true);
    assert.equal(cp.endCombatEvent("boss-1"), true); g.run(1);
    assert.equal(cp.isCombatEventActive(), false); assert.equal(g.hud.visible, false, "HUDは猶予なしで消える");
});
test("戦闘イベントAPI: 不正IDは拒否・同じIDの重複は1つ・複数IDは独立・ロードで持ち越さない", () => {
    const g = stack(); g.loadMap();
    const cp = g.ProjectRCombatPresence;
    for (const bad of ["", null, undefined, 3, {}]) assert.equal(cp.beginCombatEvent(bad), false);
    assert.equal(cp.endCombatEvent("none"), false);
    cp.beginCombatEvent("a"); cp.beginCombatEvent("a"); cp.beginCombatEvent("b");
    assert.deepEqual(plain(cp.getCombatEventSources()), ["a", "b"]);
    cp.endCombatEvent("a"); assert.equal(cp.isCombatEventActive(), true);
    cp.endCombatEvent("b"); assert.equal(cp.isCombatEventActive(), false);
    cp.beginCombatEvent("c");
    g.DataManager.extractSaveContents({ system: g.$gameSystem }); // ロード
    assert.equal(cp.isCombatEventActive(), false);
    assert.doesNotMatch(read("js/plugins/ProjectR_CombatPresence.js"), /mapId\s*===|getMapId/, "特定マップに依存しない");
});
test("アリーナ: enterは戦闘もHUDもダミーも出さない → Startで開始 → Endで消える(敵の画面内判定は使わない)", () => {
    const g = stack(); g.loadMap(); g.run(10);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false); assert.equal(g.hud.visible, false);
    assert.equal(g.arena.startHermes().ok, true); g.run(3);
    assert.deepEqual(plain(g.ProjectRCombatPresence.getCombatEventSources()), ["ProjectR_CombatTestArena"]);
    assert.equal(g.hud.visible, true);
    assert.equal(g.arena.endTest().ok, true); g.run(2);
    assert.equal(g.hud.visible, false); assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), false);
    // ダミーが技術的に残っていても、HUDの状態を左右しない。
    assert.equal(g.fakeEvents.some(e => e.databaseEnemy), true);
});

// =====================================================================
// 3) 向きと「調べる(F)」: MZに近い最小世界で実PlayerFacingを検証
// =====================================================================
function facingWorld() {
    const code = `
        "use strict";
        class Game_CharacterBase {
            constructor() { this._direction = 2; this._directionFix = false; this._realX = 10; this._realY = 10; }
            direction() { return this._direction; }
            isDirectionFixed() { return this._directionFix; }
            setDirection(d) { if (!this.isDirectionFixed() && d) this._direction = d; }
            setDirectionFix(v) { this._directionFix = v; }
        }
        class Game_Character extends Game_CharacterBase {
            // Hendrix: turnToward('mouse or gamepad', force) = マウス方向へ向け、forceなら固定も付ける。
            turnToward(target, force = false) {
                const orig = this.isDirectionFixed();
                if (force && orig) this.setDirectionFix(false);
                if (target === "mouse or gamepad") { this.setDirection($mouseDirection); this.aimCalls = (this.aimCalls || 0) + 1; }
                if (force || orig) this.setDirectionFix(true);
            }
        }
        class Game_Temp { reserveCommonEvent(id) { this.reserved = (this.reserved || []).concat(id); } }
        class Game_Event extends Game_CharacterBase {
            constructor(x, y, o = {}) { super(); this._realX = x; this._realY = y; this._trigger = o.trigger ?? 0; this._erased = false;
                this._transparent = !!o.transparent; this.databaseEnemy = o.enemy ? {} : null; this.priority = o.priority ?? 1; this._list = o.list ?? [1, 2]; }
            isTriggerIn(t) { return t.includes(this._trigger); }
            isNormalPriority() { return this.priority === 1; }
            isTransparent() { return this._transparent; }
            list() { return this._list; }
            eventId() { return this._id; }
            start() { if (this._list.length > 1) this.started = true; }
        }
        class Game_Player extends Game_Character {
            update(sceneActive) {
                // 歩行入力: 固定されていなければ入力方向を向く(MZ標準)。
                if (Input.dir4) this.setDirection(Input.dir4);
                this.frames = (this.frames || 0) + 1;
            }
            performTransfer() {}
            isMoveRouteForcing() { return false; }
            isMoving() { return false; }
            canMove() { return !$gameMap.isEventRunning(); }
            triggerAction() { return this.canMove() && this.triggerButtonAction(); }
            // MZ標準: 決定キー → 正面のEventだけを起動
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
        }
        var $mouseDirection = 8, $legacy = false, $explicit = false, $running = false, $nextId = 1;
        var $gamePlayer = new Game_Player();
        var $gameMap = { _events: [], events() { return this._events; }, isEventRunning: () => $running,
            setupStartingEvent() { return this._events.some(e => e.started); } };
        var $gameMessage = { isBusy: () => false };
        var Input = { _t: false, dir4: 0, dir8: 0, isTriggered(name) { return name === "ok" && this._t; } };
        var window = globalThis;
        window.ProjectRCombatPresence = { isCombatActive: () => $legacy || $explicit, isCombatEventActive: () => $explicit,
            settings: { attackCommonEventId: 1 } };
    `;
    const ctx = vm.createContext({ console });
    vm.runInContext(code, ctx);
    vm.runInContext(read("js/plugins/ProjectR_PlayerFacing.js"), ctx);
    const run = c => vm.runInContext(c, ctx);
    const w = {
        ctx, run,
        put: (x, y, o) => run(`(() => { const e = new Game_Event(${x}, ${y}, ${JSON.stringify(o || {})}); e._id = $nextId++; $gameMap._events.push(e); return e; })()`),
        explicit: v => run(`$explicit = ${v}`), legacy: v => run(`$legacy = ${v}`), mouse: d => run(`$mouseDirection = ${d}`),
        walk: d => run(`Input.dir4 = ${d}`),
        frame: () => run("$gamePlayer.update(true)"),
        // 実機の順序: Game_Player.update(照準・押下の観測) → triggerAction。
        press: () => run("(() => { Input._t = true; $gamePlayer.update(true); const r = $gamePlayer.triggerAction(); Input._t = false; return r; })()"),
        dir: () => run("$gamePlayer.direction()"), fixed: () => run("$gamePlayer.isDirectionFixed()"),
        started: () => run("$gameMap._events.filter(e => e.started).map(e => e._id)"),
        diag: () => plain(run("window.ProjectRPlayerFacing.getDiagnostics()"))
    };
    return w;
}
test("アリーナ入場直後(戦闘外): 歩くと向きが変わる(上下左右)。マウスを向き続けない", () => {
    const w = facingWorld(); w.mouse(6);
    for (const d of [8, 4, 6, 2]) { w.walk(d); w.frame(); assert.equal(w.dir(), d); }
    w.walk(0);
    assert.equal(w.fixed(), false);
    assert.equal(w.run("$gamePlayer.aimCalls || 0"), 0, "戦闘外は毎フレームの照準向きを呼ばない");
});
test("攻撃共通イベントが付けたDirection Fixが戦闘外に残っても、歩くと解放されて向きが変わる", () => {
    const w = facingWorld();
    w.run("$gameTemp = new Game_Temp(); $gameTemp.reserveCommonEvent(1); $gamePlayer.setDirectionFix(true); $gamePlayer.setDirection = Game_CharacterBase.prototype.setDirection;");
    w.run("$gamePlayer._direction = 8");
    w.walk(6); w.frame();
    assert.equal(w.fixed(), false); assert.equal(w.dir(), 6);
    assert.equal(w.diag().lastRelease, "walkingInput");
    // マップイベントが意図して付けたDirection Fixには触れない
    w.run("$gamePlayer.setDirectionFix(true)"); w.walk(4); w.frame();
    assert.equal(w.fixed(), true); assert.equal(w.dir(), 6);
});
test("戦闘イベント開始 → 照準方向へ向く(公式turnToward) → 終了で解放 → 通常の歩行向きに戻る", () => {
    const w = facingWorld(); w.mouse(6);
    w.explicit(true); w.frame();
    assert.equal(w.dir(), 6); assert.equal(w.fixed(), true); assert.equal(w.run("$gamePlayer.aimCalls"), 1);
    w.mouse(4); w.walk(8); w.frame(); // 歩いても、固定中は照準方向
    assert.equal(w.dir(), 4);
    w.explicit(false); w.frame();
    assert.equal(w.fixed(), false, "戦闘終了でDirection Fixを残さない");
    w.mouse(6); w.walk(2); w.frame(); assert.equal(w.dir(), 2);
    assert.equal(w.diag().lastRelease, "combatEventEnded");
});
test("会話中・イベント実行中は照準を向かない / 戦闘外に敵が見えているだけ(legacy)でも常時は照準しない", () => {
    const w = facingWorld(); w.mouse(6); w.explicit(true);
    w.run("$running = true"); w.frame();
    assert.equal(w.run("$gamePlayer.aimCalls || 0"), 0);
    w.run("$running = false"); w.explicit(false); w.legacy(true); w.walk(8); w.frame();
    assert.equal(w.dir(), 8); assert.equal(w.run("$gamePlayer.aimCalls || 0"), 0);
});
test("F: 戦闘外は標準の正面判定のまま(隣でも向きが違えば起動しない・補助は働かない)", () => {
    const w = facingWorld(); w.put(10, 11); w.run("$gamePlayer._direction = 8");
    assert.equal(w.press(), false); assert.deepEqual(plain(w.started()), []);
    w.run("$gamePlayer._direction = 2"); assert.equal(w.press(), true);
});
test("F: 戦闘中も隣の端末を調べられる(照準の向きが別でも)。標準の正面判定が外れても標準のstart()で起動する", () => {
    const w = facingWorld(); const hub = w.put(10, 9);
    w.explicit(true); w.legacy(true); w.mouse(2); w.frame(); // 照準は下、端末は上
    assert.equal(w.dir(), 2); assert.equal(w.fixed(), true);
    assert.equal(w.press(), true); assert.deepEqual(plain(w.started()), [hub._id ?? 1]);
    assert.equal(w.diag().lastOk.outcome === "engine" || /^fallback/.test(w.diag().lastOk.outcome), true);
    // 標準が外す位置(斜め寄り・向きが合わない)でも、通常ルールを満たす隣接イベントなら起動
    const w2 = facingWorld(); w2.put(10.6, 9.4); w2.explicit(true); w2.legacy(true); w2.mouse(4); w2.frame();
    assert.equal(w2.press(), true);
    assert.match(w2.diag().lastOk.outcome, /^(engine|fallback:)/);
});
test("F: 通常のイベント規則を守る(敵・透明・Action Button以外・通常優先度以外・空のイベント・遠い・イベント実行中は起動しない)", () => {
    const w = facingWorld(); w.explicit(true); w.legacy(true); w.mouse(2); w.frame();
    w.put(10, 9, { enemy: true }); w.put(9, 10, { transparent: true }); w.put(11, 10, { trigger: 1 });
    w.put(10, 11, { priority: 0 }); w.put(10, 8, { list: [0] }); w.put(14, 10);
    assert.equal(w.press(), false); assert.deepEqual(plain(w.started()), []);
    const w2 = facingWorld(); w2.put(10, 9); w2.explicit(true); w2.legacy(true); w2.mouse(2); w2.frame();
    w2.run("$running = true"); assert.equal(w2.press(), false); assert.deepEqual(plain(w2.started()), []);
});
test("Q/E/X/C/V と U の入力経路には触れない(PlayerFacingはInput._onKey/Scene_Map/特定マップに依存しない)", () => {
    const src = read("js/plugins/ProjectR_PlayerFacing.js");
    assert.doesNotMatch(src, /Input\._onKey|Scene_Map|\$gameMap\.mapId|mapId\s*===/);
});

// =====================================================================
// 4) Reed Flute(実Hendrix関数checkInRange/checkRange/getCurrentEventHp + 実Game_Enemy + 実GodSummonManager)
// =====================================================================
const reed = prefixOf("tests/ProjectR_HermesReedFluteSleep.test.cjs", "loadGame, CARD, STATE");
test("Reed Flute: V(スロット5)で発動。4タイル以内の3体すべてにSleep(State 32)。診断に内訳が残る", () => {
    const g = reed.loadGame(); g.start();
    const near = [g.addEnemy(1, 1), g.addEnemy(-2, 0), g.addEnemy(0, 3)];
    g.arrange(4, reed.CARD);
    g.tap(5);
    assert.equal(g.ProjectRCardBattleInput.getLastResult().handIndex, 4); assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, true);
    assert.deepEqual(near.map(e => g.sleeping(e)), [true, true, true]);
    const d = plain(g.ProjectRHermesReedFluteSleep.getLastDiagnostic());
    assert.deepEqual([d.ok, d.detail, d.enemies, d.alive, d.inRange, d.applied, d.stateId], [true, "applied", 3, 3, 3, 3, reed.STATE]);
});
test("Reed Flute: 範囲外だけ/敵なし/死亡のみは失敗(カードは非消費)で、診断に理由が残る", () => {
    const cases = [["noEnemyFound", () => {}], ["noEnemyInRange", g => g.addEnemy(9, 9)]];
    for (const [detail, setup] of cases) {
        const g = reed.loadGame(); g.start(); setup(g); g.arrange(4, reed.CARD);
        const shape = s => ({ hand: s.hand.map(c => c.instanceId), draw: s.drawPile.map(c => c.instanceId),
            discard: s.discardPile.map(c => c.instanceId), cooldown: s.cooldownPile.map(c => c.instanceId) });
        const before = shape(plain(g.ProjectRCardDeck.getBattleState()));
        g.tap(5);
        assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, false, detail);
        assert.deepEqual(shape(plain(g.ProjectRCardDeck.getBattleState())), before, "手札・山札・捨て札・Cooldown不変");
        assert.equal(plain(g.ProjectRHermesReedFluteSleep.getLastDiagnostic()).detail, detail);
    }
    const g = reed.loadGame(); g.start(); const e = g.addEnemy(1, 1); g.arrange(4, reed.CARD);
    g.$gameMap.getCurrentEventHp = () => 0; // 死亡
    g.tap(5);
    assert.equal(g.ProjectRCardBattleInput.getLastResult().ok, false);
    assert.equal(plain(g.ProjectRHermesReedFluteSleep.getLastDiagnostic()).detail, "noAliveEnemy");
});
test("Reed Flute: アリーナのダミーは<enemy>タグ付きで生存。Reed Fluteスポット(11,16)から3体とも4タイル以内", () => {
    const map = json("data/Map004.json");
    const dummies = map.events.filter(e => e && /<enemy>/.test(e.note) && /Multi Dummy/.test(e.name));
    assert.equal(dummies.length, 3);
    const spot = vm.runInNewContext("({ x: 11, y: 16 })"), arenaSrc = read("js/plugins/ProjectR_CombatTestArena.js");
    assert.match(arenaSrc, /REED_FLUTE_SPOT = Object\.freeze\(\{ x: 11, y: 16/);
    for (const e of dummies) assert.ok(Math.hypot(e.x - spot.x, e.y - spot.y) <= 4, e.name);
    const hub = map.events[7].pages[0].list;
    assert.ok(hub.some(c => c.code === 357 && c.parameters[1] === "moveToMultiTarget"));
});
test("アリーナ: 「Reed Fluteスポットへ移動」は同じマップ内でlocateだけを行う", () => {
    const g = stack(); g.loadMap();
    const calls = []; g.$gamePlayer.locate = (x, y) => calls.push([x, y]); g.$gamePlayer.setDirection = () => {};
    assert.equal(g.arena.moveToMultiTarget().ok, true); assert.deepEqual(calls, [[11, 16]]);
    g.mapId = 1; assert.equal(g.arena.moveToMultiTarget().reason, "notInArena");
});

// =====================================================================
// 5) 神の見える召喚(表示専用)
// =====================================================================
function visualWorld(parameters = {}) {
    const map2 = json("data/Map002.json");
    const g = { console, JSON, Math, Number, String, Map, Set, Array, Object };
    g.window = g; g.$dataTemplateMap = map2;
    const ctx = vm.createContext(g);
    vm.runInContext(`
        class Game_Event { constructor(id, x, y) { this._eventId = id; this._realX = x; this._realY = y; this._erased = false;
            this._characterName = ""; this._characterIndex = 0; this._direction = 2; }
            eventId() { return this._eventId; } setImage(n, i) { this._characterName = n; this._characterIndex = i; }
            setDirection(d) { this._direction = d; } }
        class Game_Interpreter {}
        class Game_Map { constructor() { this._events = [null]; this.spawned = []; }
            setup() { this._events = [null]; }
            update() {}
            event(id) { return this._events[id]; }
            spawnEvent(tid, x, y) { const id = this._events.length; this._events.push(new Game_Event(id, x, y)); this.spawned.push({ id, tid, x, y }); return id; } }
        var $gameMap = new Game_Map();
        var $gamePlayer = { _realX: 10, _realY: 10 };
        var calls = [];
        var PluginManager = { _params: ${JSON.stringify(parameters)}, parameters(n) { return this._params; },
            _commands: {}, callCommand(i, plugin, name, args) { calls.push({ name, args }); this._commands[plugin + ":" + name]?.(args); } };
        PluginManager._commands["Hendrix_Action_Engine:DestroyEvent"] = args => { const id = Number(args.target); $gameMap._events[id]._erased = true; $gameMap._events[id] = null; };
        var DataManager = { extractSaveContents() {} };
        var $battle = true, $combat = true, $persistent = null, $transients = [];
        window.ProjectRCardDeck = { isCardBattleActive: () => $battle, endBattle() {} };
        window.ProjectRCombatPresence = { isCombatEventActive: () => $combat };
        window.ProjectRGodSummonManager = { getPersistentUltimateSummon: () => $persistent, getActiveSummons: () => $transients };
    `, ctx);
    vm.runInContext(read("js/plugins/ProjectR_GodSummonVisual.js"), ctx);
    const run = c => vm.runInContext(c, ctx);
    return {
        ctx, run,
        frame: (n = 1) => { for (let i = 0; i < n; i++) run("$gameMap.update(true)"); },
        set: (k, v) => run(`${k} = ${JSON.stringify(v)}`),
        visuals: () => plain(run("window.ProjectRGodSummonVisual.getVisuals()")),
        events: () => plain(run("$gameMap._events.filter(Boolean).map(e => ({ id: e._eventId, name: e._characterName, index: e._characterIndex, dir: e._direction }))")),
        calls: () => plain(run("calls"))
    };
}
// Game_Map.updateは自前の関数なので、フック後のupdateが呼ばれるようにする(本番ではGame_Map.prototype.updateを包む)。
test("Map002に公式Prefab『ProjectR God Visual』(<child of: player>・すり抜け・Action Button以外)がある", () => {
    const map2 = json("data/Map002.json"), ev = map2.events[6];
    assert.equal(ev.name, "ProjectR God Visual"); assert.equal(ev.note, "<projectRGodVisual>");
    const page = ev.pages[0];
    assert.equal(page.through, true); assert.equal(page.trigger, 4, "Action Buttonではない(Fキーを奪わない)");
    assert.ok(page.list.some(c => c.code === 108 && c.parameters[0] === "<child of: player>"));
    assert.equal(page.image.characterName, "", "画像はPlugin Parameterから設定する");
    for (let i = 1; i <= 5; i++) assert.equal(map2.events[i].id, i, "既存のPrefabは不変");
});
test("常駐神: 戦闘イベント中に顕現していれば見える。崩壊で消え、復帰で再び現れる。画像はPlugin Parameter", () => {
    const w = visualWorld();
    w.set("$persistent", { godId: "hermes", summonId: 1 }); w.frame(2);
    assert.deepEqual(w.visuals().map(v => [v.kind, v.godId]), [["persistent", "hermes"]]);
    assert.deepEqual(w.events().map(e => [e.name, e.index]), [["!Crystal", 0]], "Hermesの暫定マーカー");
    assert.equal(w.run("$gameMap.spawned[0].tid"), 6, "公式Prefab(テンプレートmap)から生成");
    w.set("$persistent", null); w.frame(2);
    assert.equal(w.visuals().length, 0); assert.equal(w.events().length, 0);
    w.set("$persistent", { godId: "apollo", summonId: 2 }); w.frame(2);
    assert.deepEqual(w.events().map(e => e.name), ["!Flame"], "Apolloの暫定マーカー");
});
test("戦闘イベントが無い間は神は見えない。戦闘イベント開始で現れ、カード戦闘終了で残らない", () => {
    const w = visualWorld(); w.set("$combat", false);
    w.set("$persistent", { godId: "hermes", summonId: 1 }); w.frame(3);
    assert.equal(w.events().length, 0);
    w.set("$combat", true); w.frame(2); assert.equal(w.events().length, 1);
    w.set("$battle", false); w.frame(2); assert.equal(w.events().length, 0, "カード戦闘が無ければ見えない");
});
test("一時召喚(Hermes/Apollo): カード発動で現れ、論理寿命が尽きても一定フレーム見え、その後消える。Event/Spriteが残らない", () => {
    const w = visualWorld({ TransientHoldFrames: "10" });
    w.set("$transients", [{ godId: "hermes", summonId: 5, degree: 90 }, { godId: "apollo", summonId: 6, degree: 180 }]); w.frame(2);
    assert.deepEqual(w.visuals().map(v => [v.kind, v.godId]), [["transient", "hermes"], ["transient", "apollo"]]);
    assert.deepEqual(w.events().map(e => [e.name, e.dir]), [["!Crystal", 6], ["!Flame", 2]], "発動方向を向く(90度=右, 180度=下)");
    w.set("$transients", []); w.frame(5);
    assert.equal(w.events().length, 2, "論理寿命が尽きても少しの間は見える");
    w.frame(8);
    assert.equal(w.events().length, 0); assert.equal(w.visuals().length, 0);
    assert.equal(w.calls().filter(c => c.name === "DestroyEvent").length, 2, "公式DestroyEventで片付ける");
});
test("常駐と一時は別管理: 一時召喚の消滅で常駐神は消えず、常駐が崩壊しても一時召喚は残る", () => {
    const w = visualWorld({ TransientHoldFrames: "3" });
    w.set("$persistent", { godId: "hermes", summonId: 1 });
    w.set("$transients", [{ godId: "hermes", summonId: 5, degree: 0 }]); w.frame(2);
    assert.equal(w.visuals().length, 2);
    w.set("$transients", []); w.frame(6);
    assert.deepEqual(w.visuals().map(v => v.kind), ["persistent"]);
    w.set("$transients", [{ godId: "apollo", summonId: 9, degree: 0 }]); w.set("$persistent", null); w.frame(2);
    assert.deepEqual(w.visuals().map(v => v.kind), ["transient"]);
});
test("見た目の画像だけをPlugin Parameterで差し替えられる(ゲームのコードは不変)。画像不明でも状態は変わらない", () => {
    const w = visualWorld({ HermesCharacterName: "Hermes_Final", HermesCharacterIndex: "3" });
    w.set("$persistent", { godId: "hermes", summonId: 1 }); w.frame(2);
    assert.deepEqual(w.events().map(e => [e.name, e.index]), [["Hermes_Final", 3]]);
    // 表示専用: 状態(Manager)は読むだけで書かない
    assert.doesNotMatch(read("js/plugins/ProjectR_GodSummonVisual.js"), /damagePersistentUltimate|startCardBattle|addUltimateGauge|requestUseCard/);
});
test("Prefabのrefreshで画像が空に戻っても、次のフレームで正しい画像へ戻す", () => {
    const w = visualWorld(); w.set("$persistent", { godId: "hermes", summonId: 1 }); w.frame(2);
    w.run("$gameMap._events[1].setImage('', 0)"); w.frame(1);
    assert.equal(w.events()[0].name, "!Crystal");
});
test("Hermes剣術の見た目: 公式Swing Weaponを神の表示Eventから出す。表示Eventが現れないときはPlayerから振る", () => {
    const w = visualWorld();
    w.set("$transients", [{ godId: "hermes", summonId: 5, degree: 90 }]);
    w.run("window.ProjectRGodSummonVisual.swingWeapon('hermes', 90)");
    w.frame(1);
    const swings = w.calls().filter(c => c.name === "SwingWeapon");
    assert.equal(swings.length, 1); assert.equal(swings[0].args.eventId, "1", "Hermesの表示EventのID");
    assert.equal(swings[0].args.weaponSprite, "Pan");
    const w2 = visualWorld(); // 召喚の表示が無い(戦闘イベント外など)
    w2.run("window.ProjectRGodSummonVisual.swingWeapon('hermes', 0)"); w2.frame(6);
    assert.equal(w2.calls().find(c => c.name === "SwingWeapon").args.eventId, "player");
});
test("Hermes剣術: 既存のDynamic Eventヒットボックス・ダメージ経路は不変で、成功時だけ見た目(Swing Weapon)を呼ぶ", () => {
    const sword = prefixOf("tests/ProjectR_HermesSwordsmanship.test.cjs", "loadGame, CARD");
    const g = sword.loadGame(); g.startWith(sword.CARD);
    const swings = []; g.ProjectRGodSummonVisual = { swingWeapon: (...a) => { swings.push(plain(a)); return true; } };
    assert.equal(g.fire().reason, "success");
    assert.equal(g.commands.filter(c => c.name === "spawnEventHitbox").length, 1, "Dynamic Event(短寿命Hitbox)は従来どおり1回");
    assert.equal(g.swing().isDynamicEvent, true);
    assert.equal(swings.length, 1); assert.equal(swings[0][0], "hermes"); assert.ok(Number.isFinite(swings[0][1]));
    // 見た目の失敗はゲームを止めない
    const g2 = sword.loadGame(); g2.startWith(sword.CARD);
    g2.ProjectRGodSummonVisual = { swingWeapon: () => { throw new Error("visual boom"); } };
    assert.equal(g2.fire().reason, "success");
    assert.equal(g2.commands.filter(c => c.name === "spawnEventHitbox").length, 1);
});

// =====================================================================
// 6) Ultimate: 実U入力 → Activation。診断で失敗理由が見える
// =====================================================================
test("U(実入力)がActivationに届く: Hermes ready → 開始してGauge 0 / Apollo ready → 同様", () => {
    for (const kind of ["hermes", "apollo"]) {
        const g = stack(); g.loadMap(); assert.equal(g.arena.startScenario(kind).ok, true); g.run(3);
        const godId = g.ProjectRGodSummonManager.resolveGodId(kind);
        const started = [];
        g.ProjectRUltimateActivation.registerUltimateHandler(godId, ctx => { started.push(ctx.godId); return { ok: true, started: true }; });
        assert.equal(g.arena.fillGauge().ok, true);
        const diag0 = g.arena.status().diagnostics;
        assert.deepEqual([diag0.gaugeFull, diag0.ultimateReady, kind === "hermes" ? diag0.hermesHandler : diag0.apolloHandler], [true, true, true]);
        press(g, "KeyU", 85); g.run(2); release(g, "KeyU", 85);
        assert.deepEqual(started, [godId]);
        assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 0);
        const diag = g.arena.status().diagnostics;
        assert.equal(diag.lastUltimate.ok, true); assert.equal(diag.ultimateInput.lastDecision, "queued");
        assert.equal(diag.ultimateBinding.active, true);
    }
});
test("U が失敗した理由は診断に残る: gaugeNotFull / noUltimateHandler / persistentUltimateUnavailable / ultimateStartFailed", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    press(g, "KeyU", 85); g.run(2); release(g, "KeyU", 85);
    assert.equal(g.arena.status().diagnostics.lastUltimate.reason, "gaugeNotFull");
    g.arena.fillGauge();
    press(g, "KeyU", 85); g.run(2); release(g, "KeyU", 85);
    let d = g.arena.status().diagnostics;
    assert.equal(d.lastUltimate.reason, "noUltimateHandler"); assert.equal(d.hermesHandler, false, "handler未登録が見える");
    const godId = g.ProjectRGodSummonManager.resolveGodId("hermes");
    g.ProjectRUltimateActivation.registerUltimateHandler(godId, () => ({ ok: false, reason: "mapUnavailable" }));
    press(g, "KeyU", 85); g.run(2); release(g, "KeyU", 85);
    d = g.arena.status().diagnostics;
    assert.deepEqual([d.lastUltimate.reason, d.lastUltimate.handlerReason], ["ultimateStartFailed", "mapUnavailable"]);
    assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 100, "失敗ではGaugeを消費しない");
    g.arena.collapseGod();
    press(g, "KeyU", 85); g.run(2); release(g, "KeyU", 85);
    assert.equal(g.arena.status().diagnostics.lastUltimate.reason, "persistentUltimateUnavailable");
    assert.ok(g.arena.diagnosticLines().some(line => /Ultimate直近: NG persistentUltimateUnavailable/.test(line)));
});
test("U入力の診断: 入力が受付拒否された理由(blocked)も残る。明示的な戦闘イベントでUは無効にならない", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    assert.equal(g.ProjectRCombatPresence.isCombatEventActive(), true);
    g.$gameMap.isEventRunning = () => true;
    press(g, "KeyU", 85); g.run(1); release(g, "KeyU", 85);
    const input = g.arena.status().diagnostics.ultimateInput;
    assert.deepEqual([input.lastDecision, input.lastReason], ["blocked", "eventRunning"]);
});
test("アリーナの状態端末: 要求された診断項目がすべて出る", () => {
    const g = stack(); g.loadMap(); g.arena.startHermes(); g.run(3);
    pressCard(g, 1);
    const d = g.arena.status().diagnostics;
    for (const key of ["combatEventActive", "cardBattleActive", "lastKey", "lastCard", "hand", "counts", "persistentGodId",
        "persistentManifested", "visibleSummonExists", "divineHp", "gauge", "gaugeFull", "ultimateReady", "lastUltimate",
        "hermesHandler", "apolloHandler", "interact", "reedFlute"]) assert.ok(key in d, key);
    const text = g.arena.diagnosticLines().join("\n");
    for (const needle of ["戦闘イベント:yes", "カード戦闘:yes", "Q/E/X/C/V", "直近キー: KeyQ", "手札 [", "顕現:yes", "DivineHP:", "Gauge", "full:", "ready:",
        "Ultimate直近", "handler Hermes:", "Apollo:", "F(調べる)直近", "Reed Flute直近"]) assert.ok(text.includes(needle), needle);
    assert.equal(d.counts.draw + d.counts.discard + d.counts.cooldown + d.hand.length, 30);
});

// =====================================================================
// 7) 剣・銃: 公式構成(データ)の監査
// =====================================================================
const ce = json("data/CommonEvents.json");
const cmds = ce[1].list;
const plugin = (c, name) => c.code === 357 && c.parameters[1] === name;
test("通常の剣(CE1の近接ブランチ): Swing Weapon(見える剣の振り) → 短寿命Dynamic Eventヒットボックス → 衝突 → Database武器ダメージ", () => {
    const swing = cmds.findIndex(c => plugin(c, "SwingWeapon"));
    const hitbox = cmds.findIndex(c => plugin(c, "spawnEventHitbox"));
    const collide = cmds.findIndex(c => c.code === 111 && String(c.parameters[1]).includes("checkCollide(1, '<playerAttack>'"));
    const damage = cmds.findIndex(c => plugin(c, "UpdateEventHp"));
    assert.ok(swing > 0 && hitbox > swing && collide > hitbox && damage > collide, "公式Setup Playerの順序");
    assert.equal(cmds[swing].parameters[3].weaponSprite, "Pan"); assert.equal(cmds[swing].parameters[3].eventId, "player");
    assert.equal(cmds[hitbox].parameters[3].wait, "1", "ヒットボックスの寿命は短い");
    assert.match(cmds[hitbox].parameters[3].notetag, /<playerAttack>/);
    assert.equal(cmds[damage].parameters[3].value, "-player weapon", "ダメージはDatabaseの装備武器から");
    assert.equal(cmds.filter(c => plugin(c, "SwingWeapon")).length, 1, "1回の攻撃で見た目は1回");
    // 古い剣(ロングソード)専用のCE4呼び出しは従来どおり
    assert.ok(cmds.some(c => c.code === 117 && c.parameters[0] === 4));
});
test("銃(CE1の銃ブランチ+Bullet Prefab): 公式の弾薬API・Display Weapon・射撃演出。弾は発射時の照準で1回だけ回転して前進(追尾なし)", () => {
    const text = JSON.stringify(cmds);
    assert.ok(cmds.some(c => plugin(c, "GunAmmoControl") && c.parameters[3].target === "ammo" && c.parameters[3].value === "-1"));
    assert.ok(cmds.some(c => plugin(c, "GunReload")), "公式のリロード");
    assert.match(text, /gunAmmo\(\) > 0/); assert.match(text, /gunAmmoInInventory\(\) > 0/);
    assert.ok(cmds.some(c => c.code === 250 && c.parameters[0].name === "Gun1"), "発射音");
    assert.ok(cmds.some(c => c.code === 212 && c.parameters[1] === 111), "発射の演出アニメーション");
    assert.ok(cmds.some(c => plugin(c, "spawnEvent") && c.parameters[3].eventId === "Bullet"), "Prefabの弾を生成");
    assert.ok(cmds.some(c => plugin(c, "spawnEvent") && c.parameters[3].eventId === "Object: Gun"), "Display Weapon(公式)");
    const map2 = json("data/Map002.json");
    const bullet = map2.events.find(e => e && e.name === "Bullet"), gun = map2.events.find(e => e && e.name === "Object: Gun");
    const scripts = bullet.pages[0].list.find(c => c.code === 205).parameters[1].list.filter(c => c.code === 45).map(c => c.parameters[0]);
    assert.equal(scripts.filter(s => s.startsWith("rotateTo(")).length, 1, "回転は1回だけ");
    assert.equal(scripts.find(s => s.startsWith("rotateTo(")), "rotateTo('mouse or gamepad')");
    assert.ok(scripts.filter(s => s === "moveToPosition('forward')").length >= 3, "前方へ進む");
    assert.ok(scripts.every(s => /^(setMoveSpeed\(|rotateTo\(|moveToPosition\('forward'\))/.test(s)), "追尾する命令を含まない");
    assert.ok(scripts.findIndex(s => s.startsWith("rotateTo(")) < scripts.findIndex(s => s === "moveToPosition('forward')"), "回転してから前進");
    assert.match(JSON.stringify(gun.pages[1].list), /<child of: player>/);
    const handgun = json("data/Weapons.json")[51];
    assert.match(handgun.note, /<capacity: 7>/); assert.match(handgun.note, /<ammo item: 弾薬>/);
});
test("Animation Solutionは導入・有効。使える多コマの攻撃画像は無いのでplayFrames/toFrameは使わない(アセット制限)", () => {
    assert.equal(plugins.find(p => p.name === "Hendrix_Animation_Solution").status, true);
    const sources = ["ProjectR_GodSummonVisual", "ProjectR_HermesSwordsmanship"].map(n => read(`js/plugins/${n}.js`)).join("\n");
    assert.doesNotMatch(sources, /playFrames\(|toFrame\(/);
});

// =====================================================================
// 8) プラグイン順・登録・文書
// =====================================================================
test("プラグインの登録順・ファイル名・状態が正しい(新規GodSummonVisualを含む)", () => {
    const order = ["Hendrix_Action_Engine", "Hendrix_Keyboard_Gamepad", "ProjectR_CombatPresence", "ProjectR_PlayerFacing", "ProjectR_BattleHUD",
        "ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_GodSummonManager", "ProjectR_GodSummonVisual", "ProjectR_UltimateGauge",
        "ProjectR_UltimateActivation", "ProjectR_HermesSwordsmanship", "ProjectR_HermesUltimate", "ProjectR_ApolloUltimate", "ProjectR_CombatTestArena"];
    const indexes = order.map(pluginIndex);
    assert.ok(indexes.every(i => i >= 0), "全て登録済み");
    assert.deepEqual([...indexes].sort((a, b) => a - b), indexes, "依存順");
    assert.equal(plugins.filter(p => p.name === "ProjectR_GodSummonVisual").length, 1);
    for (const p of plugins) {
        if (/^ProjectR_/.test(p.name)) assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${p.name}.js`)), p.name);
    }
    const head = read("js/plugins/ProjectR_GodSummonVisual.js");
    for (const dep of ["Hendrix_Action_Engine", "ProjectR_GodSummonManager", "ProjectR_CombatPresence"]) assert.match(head, new RegExp(`@base ${dep}`));
    const visual = plugins.find(p => p.name === "ProjectR_GodSummonVisual");
    assert.equal(visual.status, true); assert.equal(visual.parameters.HermesCharacterName, "!Crystal");
    // 登録パラメータはPluginの@paramと一致
    for (const key of Object.keys(visual.parameters)) assert.match(head, new RegExp(`@param ${key}\\b`));
});
test("暫定マーカーの画像(!Crystal / !Flame)が実在する。最終の神アートではない", () => {
    for (const name of ["!Crystal", "!Flame", ].map(n => `img/characters/${n}.png`)) assert.ok(fs.existsSync(path.join(__dirname, "..", name)), name);
    assert.ok(fs.existsSync(path.join(__dirname, "..", "img/pictures/Pan.png")), "Swing Weaponの暫定武器画像");
});
test("手動確認の文書がある(24手順・Q/E/X/C/V・Sword/G17の手順を含む)", () => {
    const doc = read("docs/ProjectR_CombatRuntimeCompliance.md");
    assert.match(doc, /ProjectRCombatTestArena\.enter\(\)/);
    for (let n = 1; n <= 24; n++) assert.match(doc, new RegExp(`^${n}\\. `, "m"), `手順${n}`);
    assert.match(doc, /Q.*E.*X.*C.*V/); assert.match(doc, /G17|テストハンドガン/); assert.match(doc, /Sword|剣/);
    assert.match(doc, /!Crystal/); assert.match(doc, /アセット/);
});

console.log(`\n${passed} tests passed`);
