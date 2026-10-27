"use strict";
// FullSpec Runtime Certification: 実エンジン(実rmmz_* + DotMoveSystem + Hendrix_Action_Engine + 全ProjectR plugin)を
// 本番のplugin順で読み込み、実Map004(Combat Test Arena)で次の4つの経路を物理キーから通して確認する。
//   Reed Flute / Lyre Calm / F(調べる) / U(Ultimate)。ほかにQ/E/X/C/V・手札の補充・メニュー禁止・戦闘セッション。
// これは「MZ実機で確認済み」ではない。描画・音・実マウスは対象外(tests/RealEngineHarness.cjs の説明を参照)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const KEYS = { Q: ["KeyQ", 81], E: ["KeyE", 69], X: ["KeyX", 88], C: ["KeyC", 67], V: ["KeyV", 86], F: ["KeyF", 70], U: ["KeyU", 85] };
const SLOT_KEYS = ["Q", "E", "X", "C", "V"];
const REED = "hermes_reed_flute_sleep", LYRE = "apollo_lyre_calm", SLEEP = 32, CALM = 34;
const REED_SPOT = { x: 11, y: 16 }; // 3体のダミー(Event 4,5,6)の中央。Event 2,3は遠い。
const DUMMIES_NEAR = [4, 5, 6], DUMMIES_FAR = [2, 3];

function arena(god = "hermes", { x = REED_SPOT.x, y = REED_SPOT.y, mouse = [700, 300] } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(...mouse);
    const started = w.ctx.ProjectRCombatTestArena.startScenario(god);
    assert.equal(started.ok, true, JSON.stringify(started));
    w.frames(2);
    return w;
}
const deckApi = w => w.ctx.ProjectRCardDeck;
const hand = w => plain(deckApi(w).getBattleState().hand.map(card => card.cardId));
const press = (w, key) => w.tap(...KEYS[key]);
const lastCard = w => plain(w.ctx.ProjectRCardBattleInput.getLastResult());
const sleepingEvents = w => plain(w.ctx.$gameMap.events().filter(e => e.databaseEnemy && w.ctx.ProjectRHermesReedFluteSleep.isEventSleeping(e.eventId())).map(e => e.eventId()));
const enemyBattler = (w, id) => w.ctx.SgetBattlerForH(w.ctx.$gameMap.event(id));

// 指定した引き順で戦闘を開始し直す(アリーナと同じ: 山札は末尾から引くのでシャッフルを止めて逆順で渡す)。
function restartWithOrder(w, order) {
    const d = deckApi(w);
    d.endCardBattle();
    const sequence = Array.from({ length: 30 }, (_, i) => order[i % order.length]);
    const originals = new Map();
    for (const id of new Set(sequence)) {
        const card = d.definitions.cards.get(id);
        originals.set(id, card);
        d.definitions.cards.set(id, Object.freeze({ ...card, maxCopies: 30 }));
    }
    w.run("globalThis.__random = Math.random; Math.random = () => 1 - Number.EPSILON;");
    const result = d.startCardBattle([...sequence].reverse());
    w.run("Math.random = globalThis.__random;");
    for (const [id, card] of originals) d.definitions.cards.set(id, card);
    assert.equal(result.ok, true, JSON.stringify(result));
    return sequence;
}
const ORDER_OTHER = ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack", "hermes_swift_movement", "hermes_perception_obscure"];
const withCardAt = (slot, cardId) => { const order = [...ORDER_OTHER]; order.splice(slot, 0, cardId); return order.slice(0, 5); };

test("本番のplugin順で全pluginが実エンジンに読み込める(Hendrix/DotMove/ProjectR全て)。", () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    for (const name of ["DotMoveSystem", "Hendrix_Action_Engine", "Hendrix_Keyboard_Gamepad", "ProjectR_CardDeckCore", "ProjectR_CardBattleInput",
        "ProjectR_HermesReedFluteSleep", "ProjectR_ApolloLyreCalm", "ProjectR_PlayerFacing", "ProjectR_UltimateActivation", "ProjectR_CombatSession",
        "ProjectR_CombatTestArena", "ProjectR_CombatTestArenaFullSpec", "ProjectR_VisionOcclusion", "ProjectR_CombatOcclusion"]) {
        assert.ok(w.loaded.includes(name), name);
    }
    const map = w.enterMap(4, REED_SPOT.x, REED_SPOT.y) && w.ctx.$gameMap;
    assert.equal(map.mapId(), 4);
    // 入力設定: 決定=F(Hendrix Button Config)、Uは他の操作に使われていない
    assert.equal(w.ctx.Input.keyMapper[70], "ok");
    assert.equal(w.ctx.ProjectRUltimateActivation.getInputBinding().active, true);
});

test("Reed Flute: 物理キーV → Input → Scene_Map → requestUseCard → 実Hendrix(findTargets/checkRange/AddState)。3体がSleep(State 32)", () => {
    const w = arena();
    const before = deckApi(w).getBattleState();
    assert.deepEqual(hand(w), ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack", "hermes_swift_movement", REED]);
    // 実Map004のダミーはHendrixに敵として認識され、HP生存・Battlerを持つ
    for (const id of [...DUMMIES_NEAR, ...DUMMIES_FAR]) {
        const event = w.ctx.$gameMap.event(id);
        assert.ok(event.databaseEnemy, `Event ${id} は敵として登録される`);
        assert.ok(w.ctx.$gameMap.getCurrentEventHp(id) > 0);
        assert.ok(enemyBattler(w, id)?.isAlive());
    }
    assert.equal(w.ctx.findTargets("<enemy>").length, 5);
    press(w, "V");
    const result = lastCard(w);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.cardId, REED);
    assert.deepEqual(sleepingEvents(w), DUMMIES_NEAR);
    for (const id of DUMMIES_NEAR) assert.equal(enemyBattler(w, id).isStateAffected(SLEEP), true);
    for (const id of DUMMIES_FAR) assert.equal(enemyBattler(w, id).isStateAffected(SLEEP), false);
    const diag = w.ctx.ProjectRHermesReedFluteSleep.getLastDiagnostic();
    assert.deepEqual([diag.enemies, diag.alive, diag.inRange, diag.applied, diag.stateId], [5, 5, 3, 3, SLEEP]);
    // 成功時: 札を使い切り、12秒Cooldown、すぐ補充(左詰め+右端に新札)
    const after = deckApi(w).getBattleState();
    assert.equal(after.hand.length, 5);
    assert.equal(after.drawPile.length, before.drawPile.length - 1);
    const cooling = after.cooldownPile.find(c => c.instance.instanceId === result.instanceId);
    assert.ok(cooling && cooling.remainingSeconds > 11.9 && cooling.remainingSeconds <= 12);
    assert.deepEqual(hand(w).slice(0, 4), ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack", "hermes_swift_movement"]);
    assert.notEqual(after.hand[4].instanceId, result.instanceId);
    assert.ok(w.ctx.ProjectRGodSummonManager.getActiveSummons().some(s => s.godId === "hermes" && s.cardId === REED), "Hermesが一時召喚される");
});

test("Reed Flute: 4秒で睡眠が解除される(Stateが敵Battlerから外れる)。再使用で時間が更新され重ならない", () => {
    const w = arena();
    press(w, "V");
    assert.deepEqual(sleepingEvents(w), DUMMIES_NEAR);
    w.frames(200); // 約3.3秒 + 入力2フレーム分
    assert.deepEqual(sleepingEvents(w), DUMMIES_NEAR, "4秒未満では眠ったまま");
    w.frames(60);
    assert.deepEqual(sleepingEvents(w), [], "4秒を超えたら解除");
    for (const id of DUMMIES_NEAR) assert.equal(enemyBattler(w, id).isStateAffected(SLEEP), false);
});

test("Reed Flute: 範囲内に敵がいなければ失敗し、札も手札も山札も変わらない(非消費)", () => {
    const w = arena("hermes", { x: 25, y: 26 }); // アリーナ入口: ダミーから遠い
    const before = plain(deckApi(w).getBattleState());
    press(w, "V");
    const result = lastCard(w);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "activationFailed");
    assert.equal(result.detail, "noSleepTargetApplied");
    assert.equal(w.ctx.ProjectRHermesReedFluteSleep.getLastDiagnostic().detail, "noEnemyInRange");
    assert.deepEqual(plain(deckApi(w).getBattleState()).hand, before.hand);
    assert.equal(deckApi(w).getBattleState().cooldownPile.length, 0);
    assert.deepEqual(sleepingEvents(w), []);
});

test("Reed Flute: 手札のどのスロット(Q/E/X/C/V)にあっても、そのキーで発動する", () => {
    SLOT_KEYS.forEach((key, slot) => {
        const w = arena();
        restartWithOrder(w, withCardAt(slot, REED));
        assert.equal(hand(w)[slot], REED, `スロット${slot + 1}に葦笛`);
        press(w, key);
        const result = lastCard(w);
        assert.equal(result.ok, true, `${key}: ${JSON.stringify(result)}`);
        assert.equal(result.cardId, REED);
        assert.equal(result.handIndex, slot);
        assert.deepEqual(sleepingEvents(w), DUMMIES_NEAR, key);
    });
});

test("Q/E/X/C/V: 5つの物理キーがそれぞれ手札の左から1〜5枚目を使う。使った札は取り除かれ右端に補充される", () => {
    SLOT_KEYS.forEach((key, slot) => {
        const w = arena();
        const before = hand(w);
        press(w, key);
        const result = lastCard(w);
        assert.equal(result.handIndex, slot, key);
        assert.equal(result.cardId, before[slot], key);
        assert.equal(result.ok, true, `${key}: ${JSON.stringify(result)}`);
        assert.equal(hand(w).length, 5);
        assert.deepEqual(hand(w).slice(0, 4), before.filter((_, i) => i !== slot), `${key}: 左詰め`);
    });
});

test("Lyre Calm: 物理キー → ally handler → Apollo一時召喚 → 主人公にState 34。睡眠を解除し、再付与を防ぐ", () => {
    const w = arena("apollo");
    restartWithOrder(w, withCardAt(4, LYRE));
    const { ctx } = w;
    const leader = ctx.$gameParty.leader();
    // 睡眠にさせておく(公式AddState)
    const interpreter = new ctx.Game_Interpreter();
    ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "AddState", { target: "player", stateId: String(SLEEP) });
    assert.equal(leader.isStateAffected(SLEEP), true, "睡眠にできる");
    const before = deckApi(w).getBattleState();
    press(w, "V");
    const result = lastCard(w);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.cardId, LYRE);
    assert.equal(result.targetType, "ally");
    assert.equal(leader.isStateAffected(CALM), true, "精神安定が付く");
    assert.equal(leader.isStateAffected(SLEEP), false, "睡眠が解除される");
    assert.equal(ctx.ProjectRApolloLyreCalm.isPlayerCalm(), true);
    assert.ok(ctx.ProjectRApolloLyreCalm.getRemainingSeconds() > 5.5 && ctx.ProjectRApolloLyreCalm.getRemainingSeconds() <= 6);
    assert.ok(ctx.ProjectRGodSummonManager.getActiveSummons().some(s => s.godId === "apollo" && s.cardId === LYRE), "Apolloが一時召喚される");
    const after = deckApi(w).getBattleState();
    assert.equal(after.hand.length, 5);
    assert.equal(after.drawPile.length, before.drawPile.length - 1);
    assert.ok(after.cooldownPile.some(c => c.instance.instanceId === result.instanceId && c.remainingSeconds > 9.9), "Cooldown 10秒");
    // 精神安定中は睡眠を防ぐ
    ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "AddState", { target: "player", stateId: String(SLEEP) });
    assert.equal(leader.isStateAffected(SLEEP), false, "精神安定中は睡眠を受けない");
    // 6秒で終了
    w.frames(380);
    assert.equal(ctx.ProjectRApolloLyreCalm.isPlayerCalm(), false);
    assert.equal(leader.isStateAffected(CALM), false);
});

test("Lyre Calm: 戦闘の外(カード戦闘なし)では失敗して何も起きない", () => {
    const w = buildWorld();
    w.enterMap(4, REED_SPOT.x, REED_SPOT.y);
    w.frames(2);
    assert.deepEqual(plain(w.ctx.ProjectRApolloLyreCalm.activate({ definition: { cardId: LYRE, ringId: "apollo" } })), { ok: false, reason: "calmStateUnavailable" });
    assert.equal(w.ctx.$gameParty.leader().isStateAffected(CALM), false);
});

// ---- F(調べる) ----
const TERMINAL = { id: 12, x: 9, y: 31 }; // 周囲に別の端末が無い(x方向は2タイル間隔)。上(下向き)・下(上向き)から調べる
const MOUSE_SPOTS = [[0, 0], [800, 0], [0, 600], [800, 600], [408, 330], [500, 330], [300, 330], [408, 100], [408, 500]];
function pressF(w) {
    w.closeEvents();
    w.keyDown(...KEYS.F); w.frames(1); w.keyUp(...KEYS.F); w.frames(3);
    return { running: w.ctx.$gameMap.isEventRunning() || w.ctx.$gameMessage.isBusy(), eventId: w.ctx.$gameMap._interpreter.eventId(),
        outcome: w.ctx.ProjectRPlayerFacing.getDiagnostics().lastOk?.outcome };
}

test("F: 物理キーF → 'ok' → Game_Player → 標準のAction Button判定。戦闘外は向きが合ったときだけ起動する", () => {
    const w = buildWorld();
    w.enterMap(4, TERMINAL.x, TERMINAL.y - 1);
    w.frames(3);
    w.ctx.$gamePlayer.setDirection(2);
    assert.equal(w.ctx.Input.keyMapper[70], "ok", "物理F(70)の記号はok");
    const hit = pressF(w);
    assert.equal(hit.running, true); assert.equal(hit.eventId, TERMINAL.id);
    const w2 = buildWorld();
    w2.enterMap(4, TERMINAL.x, TERMINAL.y - 1);
    w2.frames(3);
    w2.ctx.$gamePlayer.setDirection(8); // 端末と反対向き
    const miss = pressF(w2);
    assert.equal(miss.running, false, "戦闘外は標準どおり、向きが違えば起動しない");
});

test("F: 戦闘セッション中でも、マウスの位置に関係なく正面の端末を調べられる(上から・下から)", () => {
    for (const [fromY, facing] of [[TERMINAL.y - 1, 2], [TERMINAL.y + 1, 8]]) {
        for (const mouse of MOUSE_SPOTS) {
            const w = arena("hermes", { x: TERMINAL.x, y: fromY, mouse });
            w.placePlayer(TERMINAL.x, fromY);
            w.frames(2);
            const result = pressF(w);
            assert.equal(result.running, true, `y=${fromY} mouse=${mouse} ${result.outcome}`);
            assert.equal(result.eventId, TERMINAL.id, `y=${fromY} mouse=${mouse}`);
            assert.match(result.outcome, /^engine/);
            assert.ok(facing);
        }
    }
});

test("F: 起動は標準判定だけ。start()で無理に起動せず、標準が外す位置(横にずれすぎ)では戦闘中も起動しない", () => {
    for (const offset of [0.7, -0.7, 0.9]) {
        const w = arena("hermes", { x: TERMINAL.x + offset, y: TERMINAL.y - 1 });
        w.placePlayer(TERMINAL.x + offset, TERMINAL.y - 1);
        w.frames(2);
        const inCombat = pressF(w);
        const outside = buildWorld();
        outside.enterMap(4, TERMINAL.x + offset, TERMINAL.y - 1);
        outside.frames(3);
        outside.placePlayer(TERMINAL.x + offset, TERMINAL.y - 1);
        outside.ctx.$gamePlayer.setDirection(2);
        const normal = pressF(outside);
        assert.equal(inCombat.running, normal.running, `offset ${offset}: 戦闘中と戦闘外が同じ結果`);
        assert.equal(inCombat.running, false);
    }
    assert.doesNotMatch(read("js/plugins/ProjectR_PlayerFacing.js"), /[A-Za-z_]\.start\(\)/);
});

test("F: 敵・弾・透明・優先度違いのイベントは起動しない(向きの補助にも使わない)。終了後は照準の向きに戻る", () => {
    const w = arena("hermes", { x: 10, y: 14, mouse: [700, 300] }); // ダミーEvent4(10,15)のすぐ上
    const dummy = w.ctx.$gameMap.event(4);
    dummy._trigger = 0; // 万一Action Buttonでも、敵は補助の対象にならない
    w.placePlayer(10, 14);
    w.ctx.$gamePlayer.setDirection(8);
    w.frames(1);
    w.ctx.$gamePlayer._directionFix = false; w.ctx.$gamePlayer.setDirection(8); w.ctx.$gamePlayer._directionFix = true;
    // 補助が敵へ向けないこと: 向きを敵と逆にして押しても敵は起動しない
    w.closeEvents();
    w.keyDown(...KEYS.F); w.frames(1); w.keyUp(...KEYS.F); w.frames(2);
    assert.notEqual(w.ctx.$gameMap._interpreter.eventId(), 4, "敵イベントは調べられない");
    // 透明・別優先度のイベント(Event 12を加工)
    // 照準は端末と反対(上)を向いている。補助が働けば端末へ向けるが、透明なものは対象外
    const w2 = arena("hermes", { x: TERMINAL.x, y: TERMINAL.y - 1, mouse: [408, 0] });
    const terminal = w2.ctx.$gameMap.event(TERMINAL.id);
    terminal.setTransparent(true);
    w2.placePlayer(TERMINAL.x, TERMINAL.y - 1);
    w2.frames(2);
    assert.equal(w2.ctx.$gamePlayer.direction(), 8, "照準は上");
    assert.equal(pressF(w2).running, false, "透明な端末は補助の対象外");
    terminal.setTransparent(false);
    terminal._priorityType = 0; // 「通常キャラの下」: 正面判定の対象外(同じ位置に立ったときだけ)
    assert.equal(pressF(w2).running, false, "優先度が違うイベントは正面からは起動しない");
    // 起動後、イベントが終わると照準の向きが戻る
    const w3 = arena("hermes", { x: TERMINAL.x, y: TERMINAL.y - 1, mouse: [800, 330] });
    w3.placePlayer(TERMINAL.x, TERMINAL.y - 1);
    w3.frames(2);
    assert.equal(pressF(w3).running, true);
    w3.closeEvents();
    w3.frames(3);
    assert.equal(w3.ctx.$gamePlayer.direction(), 6, "終了後はマウス(右)の向きに戻る");
});

// ---- U(Ultimate) ----
test("U(Hermes): 物理キーU → Gauge 100→0 → 6連斬(HitboxとVFXの角度が一致)。その後もカードが使える", () => {
    const w = arena("hermes");
    const { ctx } = w;
    assert.equal(ctx.ProjectRUltimateActivation.hasUltimateHandler("hermes"), true);
    ctx.ProjectRCombatTestArena.fillGauge();
    w.frames(1);
    assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 100);
    press(w, "U");
    const activation = plain(ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
    assert.equal(activation.ok, true, JSON.stringify(activation));
    assert.equal(activation.started, true); assert.equal(activation.godId, "hermes");
    assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 0);
    assert.equal(plain(ctx.ProjectRUltimateActivation.getInputDiagnostics()).lastDecision, "queued");
    const degrees = [];
    for (let frame = 0; frame < 120; frame++) {
        w.frames(1);
        ctx.ProjectRWeaponPresentation._poll();
        const state = ctx.ProjectRHermesUltimate.getHermesUltimateState();
        if (state && !degrees.length) degrees.push(...state.slashDegrees);
    }
    assert.equal(degrees.length, 6);
    const norm = d => Math.round((((d % 360) + 360) % 360) * 1000) / 1000;
    const drawn = plain(ctx.ProjectRWeaponPresentation.effects()).filter(e => e.kind === "slash").map(e => norm(e.degree));
    assert.deepEqual(drawn, degrees.map(norm), "表示される6本の斬撃は、ダメージHitboxと同じ角度・同じ順");
    assert.equal(ctx.ProjectRHermesUltimate.isHermesUltimateActive(), false, "シーケンスは終了");
    ctx.ProjectRWeaponPresentation.clear();
    // 奥義の後も通常カードが使える
    press(w, "Q");
    assert.equal(lastCard(w).ok, true);
});

test("U(Apollo): Gauge 100→0 → 矢7本(扇状の角度)を発射。その後もカードが使える", () => {
    const w = arena("apollo");
    const { ctx } = w;
    assert.equal(ctx.ProjectRUltimateActivation.hasUltimateHandler("apollo"), true);
    ctx.ProjectRCombatTestArena.fillGauge();
    w.frames(1);
    press(w, "U");
    const activation = plain(ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
    assert.equal(activation.ok, true, JSON.stringify(activation));
    assert.equal(activation.godId, "apollo");
    assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 0);
    let peak = null;
    for (let frame = 0; frame < 90; frame++) {
        w.frames(1);
        const state = ctx.ProjectRApolloUltimate.getApolloUltimateState();
        if (state) peak = plain(state);
    }
    assert.equal(peak.launchedArrows, 7); assert.equal(peak.failedArrows, 0);
    const base = peak.baseDegree;
    const offsets = peak.arrowDegrees.map(d => Math.round((((d - base) % 360) + 540) % 360 - 180));
    assert.deepEqual(offsets, [0, 10, -10, 20, -20, 30, -30], "扇状に10度ずつ");
    press(w, "Q");
    assert.equal(lastCard(w).ok, true);
});

test("U: Gaugeが満タンでなければ何も起きずGaugeは変わらない / 神が崩壊中は発動せずGaugeを消費しない", () => {
    const w = arena("hermes");
    const { ctx } = w;
    ctx.ProjectRUltimateGauge.addUltimateGauge(25, "test");
    press(w, "U");
    let result = plain(ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
    assert.equal(result.reason, "gaugeNotFull"); assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 25);
    ctx.ProjectRCombatTestArena.fillGauge();
    ctx.ProjectRGodSummonManager.damagePersistentUltimate(100, "test");
    press(w, "U");
    result = plain(ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
    assert.equal(result.reason, "persistentUltimateUnavailable"); assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 100);
    // 崩壊しても通常カードは使える
    press(w, "Q");
    assert.equal(lastCard(w).ok, true);
});

// ---- 戦闘セッション・メニュー・見た目・診断 ----
test("戦闘セッション: DEVボス戦の開始で戦闘イベント/カード戦闘/神/Gaugeがそろって立ち上がり、終了ですべて片付く。戦闘中はメニューが開かない", () => {
    const w = buildWorld();
    w.enterMap(4, REED_SPOT.x, REED_SPOT.y);
    w.frames(3);
    const { ctx } = w;
    const scene = w.scene;
    assert.equal(scene.isMenuEnabled(), true, "戦闘前はメニューを開ける");
    const started = ctx.ProjectRCombatTestArenaFullSpec.startBossTest();
    assert.equal(started.ok, true, JSON.stringify(started));
    w.frames(3);
    assert.equal(ctx.ProjectRCombatSession.isActive(), true);
    assert.equal(ctx.ProjectRCombatPresence.isCombatEventActive(), true);
    assert.equal(deckApi(w).isCardBattleActive(), true);
    assert.equal(ctx.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), true);
    assert.equal(ctx.ProjectRUltimateGauge.hasUltimateGaugeState(), true);
    assert.equal(scene.isMenuEnabled(), false, "戦闘中はメニュー禁止");
    // Escを押してもメニューは開かない
    w.keyDown("Escape", 27); w.frames(2); w.keyUp("Escape", 27); w.frames(2);
    assert.equal(ctx.SceneManager._scene, scene);
    ctx.ProjectRCombatTestArenaFullSpec.restoreReal();
    w.frames(2);
    assert.equal(ctx.ProjectRCombatSession.isActive(), false);
    assert.equal(ctx.ProjectRCombatPresence.isCombatEventActive(), false);
    assert.equal(deckApi(w).isCardBattleActive(), false);
    assert.equal(ctx.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), false);
    assert.equal(ctx.ProjectRUltimateGauge.hasUltimateGaugeState(), false);
    assert.deepEqual(plain(ctx.ProjectRGodSummonManager.getActiveSummons()), []);
    assert.equal(scene.isMenuEnabled(), true);
});

test("状態の見た目: 葦笛で眠った敵にZzz、リラの精神安定にプレイヤーの音符のふきだし(読むだけ・状態は変えない)", () => {
    const w = arena("hermes");
    const { ctx } = w;
    const balloons = [];
    const original = ctx.$gameTemp.requestBalloon;
    ctx.$gameTemp.requestBalloon = function(target, id) { balloons.push([target === ctx.$gamePlayer ? "player" : target.eventId(), id]); return original.apply(this, arguments); };
    press(w, "V");
    ctx.ProjectRWeaponPresentation._pollStates();
    assert.deepEqual(balloons.filter(b => b[1] === 10).map(b => b[0]).sort(), DUMMIES_NEAR, "眠った3体だけZzz");
    balloons.length = 0;
    ctx.ProjectRWeaponPresentation._pollStates();
    assert.equal(balloons.length, 0, "毎フレームは出さない");
    assert.deepEqual(sleepingEvents(w), DUMMIES_NEAR, "表示のために状態は変えない");
    const w2 = arena("apollo");
    restartWithOrder(w2, withCardAt(4, LYRE));
    const seen = [];
    const request = w2.ctx.$gameTemp.requestBalloon;
    w2.ctx.$gameTemp.requestBalloon = function(target, id) { seen.push([target === w2.ctx.$gamePlayer ? "player" : target.eventId(), id]); return request.apply(this, arguments); };
    press(w2, "V");
    w2.ctx.ProjectRWeaponPresentation._pollStates();
    assert.deepEqual(plain(seen), [["player", 3]]);
});

test("状態の見た目: 病(State 33)の敵に汗のふきだしを1秒ごとに出す(MZ実機でDiseaseに表示が無かった。状態は読むだけ)", () => {
    const w = arena("hermes");
    const { ctx } = w;
    const balloons = [];
    const original = ctx.$gameTemp.requestBalloon;
    ctx.$gameTemp.requestBalloon = function(target, id) { balloons.push([target === ctx.$gamePlayer ? "player" : target.eventId(), id]); return original.apply(this, arguments); };
    const diseased = new Set([4]);
    const real = ctx.ProjectRApolloDiseaseAttack.isEventDiseased;
    ctx.ProjectRApolloDiseaseAttack.isEventDiseased = id => diseased.has(id);
    ctx.ProjectRWeaponPresentation._pollStates();
    assert.deepEqual(plain(balloons.filter(b => b[1] === 6)), [[4, 6]], "病の敵だけに汗");
    balloons.length = 0;
    for (let i = 0; i < 59; i++) ctx.ProjectRWeaponPresentation._pollStates();
    assert.equal(balloons.length, 0, "1秒(60frame)未満は出さない");
    ctx.ProjectRWeaponPresentation._pollStates();
    assert.deepEqual(plain(balloons.filter(b => b[1] === 6)), [[4, 6]], "60frameごとに1回");
    diseased.clear();
    balloons.length = 0;
    ctx.ProjectRWeaponPresentation._pollStates();
    assert.equal(balloons.length, 0, "病が切れたら出さない");
    ctx.ProjectRApolloDiseaseAttack.isEventDiseased = real;
});

test("アリーナ診断端末: 依頼された実値(セッション/手札/直近キー/葦笛/Lyre/F/Gauge/U/handler)を短い行で出す", () => {
    const w = arena("hermes");
    const { ctx } = w;
    press(w, "V");
    w.closeEvents();
    w.placePlayer(TERMINAL.x, TERMINAL.y - 1);
    w.frames(1);
    pressF(w);
    // 端末のメッセージが開いたままだとUは受け付けられない(診断に blocked:messageBusy と出る)
    assert.match(ctx.ProjectRCombatTestArenaFullSpec.certificationLines().join("\n"), /U: 物理入力0回/);
    w.closeEvents();
    ctx.ProjectRCombatTestArena.fillGauge();
    press(w, "U");
    const text = ctx.ProjectRCombatTestArenaFullSpec.certificationLines().join("\n");
    assert.match(text, /戦闘セッション:/);
    assert.match(text, /手札\[/);
    assert.match(text, /直近キー:KeyV accepted/); // カードキー(Q/E/X/C/V)の直近。Uは下のU行
    assert.match(text, /葦笛: 候補5 生存5 範囲内3 付与3/);
    assert.match(text, /Lyre: /);
    assert.match(text, /F: 物理入力1回/);
    assert.match(text, /起動イベントID:/);
    assert.match(text, /Gauge 0\/100/);
    assert.match(text, /Ultimate選択:hermes/);
    assert.match(text, /handler Hermes:yes Apollo:yes/);
    assert.match(text, /U: 物理入力1回/);
    assert.match(text, /結果:OK started/);
});

console.log(`\n${passed} tests passed`);
