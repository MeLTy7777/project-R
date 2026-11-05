"use strict";
// SOUL戦闘 P1 コントローラ(ProjectR_SoulBattle)の検証。実エンジン(Map004 + 全plugin + 実Hendrix/DotMove)で、
//   1. idle / attack / defense / cleanup の状態と、フェーズ時間の設定・自動遷移・ラウンド完了
//   2. 攻撃ターンでは既存のカード・剣・銃がそのまま働く(ダメージはPoC/通常の敵と同じ)
//   3. 防御ターンではカード(キー・API)・剣・銃・必殺技の受付・待ち行列・長押しを遮断し、資源を消費しない
//   4. 移動の停止、セーブ禁止(保存値は書き換えない)、終了・マップ移動・戦闘の外部終了・場面移動からの復元
//   5. CombatSessionの所有の重複なし・PoCとの競合なし・繰り返し開始/終了で何も残らない
// を確かめる。MZは起動しない。js/plugins.js への登録は済んでいるが、start() を呼ぶまで何もしない(オプトイン)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { cardWorld, player, plain, aimDegree, fireCard, center, placeEnemy, parkOthers, attachHpBars, barHp, resetHp, HP, deckApi, handIds, equip, SWORD_ID, GUN_ID } = fx;

const project = path.join(__dirname, "..");
const PLUGIN_FILE = "js/plugins/ProjectR_SoulBattle.js";
const ARROW = "apollo_golden_arrow";
// ホットバーの画面(Spriteset_SkillUI)はこのハーネスでは作られないので、スロットのprototypeの遮断(hotbarSlot)だけは未取り付けのまま。
const GATES_NO_HOTBAR_UI = { card: true, attackEvent: true, attackInterpreter: true, ultimate: true, ultimateGauge: true, hotbarCommands: true, hotbarSlot: false, saveFlag: true, saveExecute: true, scene: true };
const NO_BLOCKS = { card: 0, movement: 0, attackEvent: 0, ultimate: 0, hotbar: 0, save: 0 };
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const read = file => fs.readFileSync(path.join(project, file), "utf8");

function soulWorld() {
    const w = cardWorld(ARROW, { x: 12, y: 25 });
    parkOthers(w, []);
    frames(w, 150); // アリーナ開始直後の一時的な演出用Event(自然に消えるもの)を落ち着かせてから、開始前の状態を取る
    w.soul = w.ctx.ProjectRSoulBattle;
    w.poc = w.ctx.ProjectRSoulBattlePoC;
    return w;
}
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const calls = (w, name) => w.calls.filter(c => c.name === name);
const aboveCenter = (w, tiles) => { const c = center(w); return { centerX: c.x, centerY: c.y - tiles }; };
// コントローラを始める。heart:false ならハートなし。ハートがあればHPバー(描画なしのハーネス用)を付ける。
function begin(w, options = {}) {
    const heart = options.heart === false ? false : { ...aboveCenter(w, 5), pattern: "static", ...(options.heart || {}) };
    const result = w.soul.start({ attackSeconds: 30, defenseSeconds: 30, ...options, heart });
    assert.equal(result.ok, true, JSON.stringify(result));
    const id = w.soul.getState().heart.eventId;
    if (id) attachHpBars(w, [id], HP);
    return id;
}
const isGone = (w, id) => { const e = w.ctx.$gameMap.event(id); return !e || e._erased === true; };
const snapshot = w => ({
    templates: w.ctx.$dataTemplateMap.events.length,
    spawned: w.ctx.$gameMap.events().filter(e => e && e.isSpawnEvent && !e._erased).map(e => e.eventId()).sort((a, b) => a - b),
    hpVars: Object.keys(w.ctx.$gameVariables._data).filter(k => /_HP$/.test(k)).sort(),
    movementDisabled: w.run("playerMovementDisabled"),
    sources: plain(w.ctx.ProjectRCombatSession.sources()),
    cardBattle: deckApi(w).isCardBattleActive(),
    saveEnabled: w.ctx.$gameSystem.isSaveEnabled(),
    rawSave: w.ctx.$gameSystem._saveEnabled,
    soul: w.soul.getPhase(),
    poc: w.poc.isActive(),
    queue: plain(w.ctx.$gameTemp._commonEventQueue),
    pressSessions: plain(w.ctx.ProjectRCardBattleInput.getPressSessions()).length
});
const noErrors = w => {
    const bad = [...w.soul.getLog(), ...w.poc.getLog()].filter(e => /error|Error/.test(e.type));
    assert.deepEqual(bad, [], JSON.stringify(bad));
};
const keyHold = (w, code, keyCode, count) => {
    const before = { x: player(w)._realX, y: player(w)._realY };
    w.keyDown(code, keyCode); frames(w, count); w.keyUp(code, keyCode); frames(w, 2);
    return { dx: player(w)._realX - before.x, dy: player(w)._realY - before.y };
};
// 1発撃って、HPが変わるまでのframe数を返す(変わらなければ -1)。
function runUntilHit(w, readHp, count = 90) {
    const before = readHp();
    for (let i = 1; i <= count; i++) { w.frames(1); if (readHp() !== before) return i; }
    return -1;
}
const shoot = (w, degree, tiles) => { aimDegree(w, degree, tiles); const result = fireCard(w, ARROW); return result; };
// 通常の敵(ダミー)に1発撃ったときの基準ダメージ。
function dummyDamage(w) {
    w.placePlayer(12, 25); frames(w, 2);
    const c = center(w);
    placeEnemy(w, 4, c.x, c.y - 5); resetHp(w, [4]);
    const result = shoot(w, 0, 5); assert.equal(result.ok, true, JSON.stringify(result));
    assert.ok(runUntilHit(w, () => barHp(w, 4)) > 0);
    const damage = HP - barHp(w, 4);
    parkOthers(w, []);
    frames(w, 5);
    return damage;
}

// ---------------------------------------------------------------- 登録・オプトイン・保護 ----------------------------------------------------------------
test("登録: js/plugins.js に1回だけ・有効・依存の後ろ(PoCの後)。登録名とファイル名が一致し、既定値の通り。読み込んだだけでは何も起きない(オプトイン)", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name), index = names.indexOf("ProjectR_SoulBattle");
    assert.ok(index >= 0 && names.lastIndexOf("ProjectR_SoulBattle") === index, "1回だけ登録");
    assert.equal(config.$plugins[index].status, true);
    assert.deepEqual(plain(config.$plugins[index].parameters), { AttackSeconds: "8", DefenseSeconds: "5", Rounds: "0", ShowLabel: "true" });
    assert.ok(fs.existsSync(path.join(project, PLUGIN_FILE)), "登録名とファイル名が一致");
    const header = read(PLUGIN_FILE).split("*/")[0];
    const bases = [...header.matchAll(/@base\s+(\S+)/g)].map(m => m[1]);
    assert.deepEqual(bases, ["Hendrix_Action_Engine", "ProjectR_CombatSession", "ProjectR_SoulBattlePoC"]);
    const after = [...header.matchAll(/@orderAfter\s+(\S+)/g)].map(m => m[1]);
    for (const dependency of [...bases, ...after]) {
        assert.ok(names.indexOf(dependency) >= 0 && names.indexOf(dependency) < index, dependency + " より後");
    }
    const w = soulWorld();
    assert.equal(w.failures.length, 0);
    assert.equal(w.soul.getPhase(), "idle");
    assert.equal(w.soul.isActive(), false);
    assert.deepEqual(plain(w.soul.gates()), GATES_NO_HOTBAR_UI, "遮断はすべて取り付いている");
    assert.deepEqual(plain(w.soul.getBlockedCounts()), NO_BLOCKS);
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).filter(s => s === "soul_battle"), []);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true, "待機中はセーブの許可に何も影響しない");
    assert.equal(w.soul.getLog().length, 0);
});

test("安全: ダメージ・HP・保存値・ファイル・セーブの書き込みを持たない。保護された既存ファイルは変更されていない", () => {
    const code = read(PLUGIN_FILE).split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|setHp|\.gainHp|\.hp\s*=|getCurrentEventHp/, "ダメージ・HPは扱わない(既存パイプラインのまま)");
    assert.doesNotMatch(code, /saveGame|StorageManager|writeFile|localStorage|disableSave|enableSave|_saveEnabled\s*=/, "保存値・ファイル・セーブへ書かない");
    assert.doesNotMatch(code, /\$gameSystem\.\w+\s*=|\$gameSystem\._\w+\s*=/, "$gameSystem(セーブ対象)へ書かない");
    assert.doesNotMatch(code, /fs\.|require\(/, "ファイルを扱わない");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    const protectedFiles = ["js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_CardBattleInput.js",
        "js/plugins/ProjectR_CombatSession.js", "js/plugins/ProjectR_CombatPresence.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_GunSystem.js",
        "js/plugins/ProjectR_SwordSystem.js", "js/plugins/ProjectR_UltimateActivation.js", "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/rmmz_scenes.js", "js/rmmz_objects.js",
        "data/Skills.json", "data/Weapons.json", "data/Map002.json", "data/Map004.json"];
    for (const file of protectedFiles) assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
});

// ---------------------------------------------------------------- 状態とフェーズ遷移 ----------------------------------------------------------------
test("状態: idle → attack → defense → attack…。時間はフレーム(1/60秒)で数え、設定した秒数ちょうどで自動遷移する。フックには from/to/round/reason が渡る", () => {
    const w = soulWorld();
    const events = [];
    const off = w.soul.onPhase(e => events.push(plain(e)));
    assert.deepEqual(plain(w.soul.STATES), ["idle", "attack", "defense", "cleanup"]);
    begin(w, { attackSeconds: 1, defenseSeconds: 0.5, heart: false });
    assert.deepEqual(events, [{ from: "idle", to: "attack", round: 1, reason: "start" }]);
    let s = w.soul.getState();
    assert.deepEqual([s.state, s.phase, s.framesLeft, s.totalFrames, s.round], ["attack", "attack", 60, 60, 1]);
    frames(w, 59);
    assert.equal(w.soul.getPhase(), "attack", "59フレーム後はまだ攻撃");
    frames(w, 1);
    assert.equal(w.soul.getPhase(), "defense", "60フレームで防御へ");
    s = w.soul.getState();
    assert.deepEqual([s.framesLeft, s.totalFrames], [30, 30]);
    frames(w, 29); assert.equal(w.soul.getPhase(), "defense");
    frames(w, 1); assert.equal(w.soul.getPhase(), "attack", "30フレームで攻撃へ戻る");
    assert.equal(w.soul.getState().round, 2);
    assert.deepEqual(events.slice(1).map(e => [e.from, e.to, e.round, e.reason]), [["attack", "defense", 1, "timer"], ["defense", "attack", 2, "timer"]]);
    off();
    frames(w, 70);
    assert.equal(events.length, 3, "登録解除したフックは呼ばれない");
    w.soul.end("test");
    assert.equal(w.soul.getPhase(), "idle");
});

test("時間設定: 開始時の指定・実行中の setDurations(次のフェーズから有効)・skipPhase・最初を防御にする。不正な値は何も始めない", () => {
    const w = soulWorld(), before = snapshot(w);
    begin(w, { attackSeconds: 0.5, defenseSeconds: 0.5, heart: false, firstPhase: "defense" });
    assert.equal(w.soul.getPhase(), "defense", "firstPhase=defense");
    assert.deepEqual(plain(w.soul.setDurations({ attackSeconds: 2, defenseSeconds: 1 })), { ok: true, attackSeconds: 2, defenseSeconds: 1 });
    frames(w, 30);
    assert.equal(w.soul.getPhase(), "attack");
    assert.equal(w.soul.getState().totalFrames, 120, "変更した攻撃の長さ(2秒)");
    assert.equal(w.soul.skipPhase(), true);
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(w.soul.getState().totalFrames, 60);
    w.soul.end("test");
    assert.equal(w.soul.skipPhase(), false, "動作中でなければ何もしない");
    assert.equal(w.soul.setDurations({ attackSeconds: "abc" }).ok, false);
    assert.equal(w.soul.setDurations({ attackSeconds: 0 }).ok, false);
    assert.equal(w.soul.getState().attackSeconds, 2, "不正な指定では変わらない");
    w.soul.setDurations({ attackSeconds: 8, defenseSeconds: 5 });
    for (const bad of [{ attackSeconds: 0 }, { attackSeconds: -1 }, { attackSeconds: "abc" }, { defenseSeconds: 601 }, { rounds: 1.5 }, { rounds: -1 }, { firstPhase: "idle" }, { firstPhase: "cleanup" }]) {
        const result = w.soul.start({ heart: false, ...bad });
        assert.equal(result.ok, false, JSON.stringify(bad));
        assert.deepEqual(snapshot(w), before, "失敗した開始は何も残さない " + JSON.stringify(bad));
    }
    noErrors(w);
});

test("ラウンド: 攻撃+防御を1ラウンドとして、指定回数で自動的に終了して元に戻る(終了フックに reason と回数)", () => {
    const w = soulWorld(), before = snapshot(w);
    const ended = [];
    w.soul.onEnd(e => ended.push(plain(e)));
    begin(w, { attackSeconds: 0.5, defenseSeconds: 0.5, rounds: 2, heart: false });
    frames(w, 119); assert.equal(w.soul.isActive(), true, "2ラウンド(120フレーム)の手前");
    frames(w, 1);
    assert.equal(w.soul.isActive(), false);
    assert.deepEqual(ended, [{ reason: "completed", rounds: 2 }]);
    assert.deepEqual(snapshot(w), before);
    // 防御から始めた1ラウンドも、防御→攻撃で完了する
    begin(w, { attackSeconds: 0.5, defenseSeconds: 0.5, rounds: 1, firstPhase: "defense", heart: false });
    frames(w, 30); assert.equal(w.soul.getPhase(), "attack");
    frames(w, 30); assert.equal(w.soul.getPhase(), "idle");
    assert.deepEqual(snapshot(w), before);
    noErrors(w);
});

test("時間停止: メニュー等でシーンが止まる・公式の時間停止・会話の表示中は進まない", () => {
    const w = soulWorld();
    begin(w, { attackSeconds: 5, heart: false });
    frames(w, 10);
    const left = w.soul.getState().framesLeft;
    w.ctx.$gameMap.eventsPaused = true; frames(w, 20); w.ctx.$gameMap.eventsPaused = false;
    assert.equal(w.soul.getState().framesLeft, left, "eventsPausedの間は進まない");
    w.ctx.$gameMessage.add("テスト"); frames(w, 20);
    assert.equal(w.soul.getState().framesLeft, left, "会話の表示中は進まない");
    w.ctx.$gameMessage.clear();
    frames(w, 5);
    assert.equal(w.soul.getState().framesLeft, left - 5, "再開後は進む");
    w.soul.end("test");
});

// ---------------------------------------------------------------- 攻撃ターン: 既存の攻撃がそのまま ----------------------------------------------------------------
test("攻撃ターン: 黄金の矢が敵ハートに当たり、ダメージは通常の敵と同じ量を既存パイプラインで1回だけ。防御・攻撃の切り替えで資源は変わらない", () => {
    const w = soulWorld();
    const baseline = dummyDamage(w);
    assert.ok(baseline > 0);
    w.placePlayer(12, 25); frames(w, 2);
    const id = begin(w);
    assert.equal(w.soul.getPhase(), "attack");
    w.calls.length = 0;
    const result = shoot(w, 0, 5);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.ok(runUntilHit(w, () => barHp(w, id)) > 0, "矢がハートに当たる");
    assert.equal(HP - barHp(w, id), baseline, "ダメージは通常の敵と同じ");
    assert.equal(calls(w, "UpdateEventHp").filter(c => String(c.args.eventId) === String(id)).length, 1, "ハートへのUpdateEventHpは1回だけ");
    frames(w, 30);
    assert.equal(HP - barHp(w, id), baseline, "その後もダメージは増えない");
    assert.deepEqual(plain(w.soul.getBlockedCounts()), NO_BLOCKS, "攻撃ターンでは何も遮断しない");
    w.soul.end("test");
    noErrors(w);
});

test("攻撃ターン: 剣と銃(攻撃ボタン=共通イベント1)も既存のまま働く", () => {
    let w = soulWorld();
    equip(w, SWORD_ID); w.frames(3);
    begin(w, { heart: false });
    const swings = w.ctx.ProjectRSwordSystem.status().swings;
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 6);
    assert.equal(w.ctx.ProjectRSwordSystem.status().swings, swings + 1, "剣が振れる");
    w.soul.end("test");
    w = soulWorld();
    equip(w, GUN_ID); w.frames(3);
    begin(w, { heart: false });
    const shots = w.ctx.ProjectRGunSystem.status().shots;
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 6);
    assert.equal(w.ctx.ProjectRGunSystem.status().shots, shots + 1, "銃が撃てる");
    w.soul.end("test");
    noErrors(w);
});

// ---------------------------------------------------------------- 防御ターン: 攻撃入力の遮断 ----------------------------------------------------------------
test("防御ターン: カード(API・Qキー)を遮断し、手札・Cooldown・ダメージ・弾の生成に何も起きない。攻撃へ戻ると使える", () => {
    const w = soulWorld();
    const id = begin(w, { firstPhase: "defense" });
    assert.equal(w.soul.getPhase(), "defense");
    const hand = handIds(w), pile = plain(deckApi(w).getBattleState().cooldownPile);
    w.calls.length = 0;
    aimDegree(w, 0, 5);
    const api = plain(deckApi(w).requestUseCard(0));
    assert.deepEqual([api.ok, api.reason], [false, "soulDefense"]);
    assert.deepEqual(api.reasons, [{ code: "soulDefense" }]);
    // 実際のキー入力(押す→離す)も同じ。CardBattleInputは受け付けて、requestUseCardで遮断される。
    w.tap("KeyQ", 81); frames(w, 3);
    const last = plain(w.ctx.ProjectRCardBattleInput.getLastResult());
    assert.deepEqual([last.ok, last.reason], [false, "soulDefense"]);
    assert.deepEqual(handIds(w), hand, "手札は減らない");
    assert.deepEqual(plain(deckApi(w).getBattleState().cooldownPile), pile, "Cooldownに入らない");
    assert.equal(calls(w, "UpdateEventHp").length, 0, "ダメージの呼び出しなし");
    assert.equal(calls(w, "SpawnEvent").length, 0, "弾・矢のEventも生成されない");
    assert.equal(barHp(w, id), HP, "ハートは無傷");
    assert.ok(w.soul.getBlockedCounts().card >= 2);
    // 攻撃ターンへ戻ると、同じ操作がまた通る
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "attack");
    aimDegree(w, 0, 5);
    const again = fireCard(w, ARROW);
    assert.equal(again.ok, true, JSON.stringify(again));
    assert.equal(plain(deckApi(w).getBattleState().cooldownPile).length, pile.length + 1, "攻撃ターンではカードが消費されCooldownに入る(手札は補充される)");
    w.soul.end("test");
    noErrors(w);
});

test("防御ターン: 剣・銃(攻撃ボタン)・素手の攻撃を遮断し、弾薬も減らない。Jキーでも同じ", () => {
    let w = soulWorld();
    equip(w, SWORD_ID); w.frames(3);
    begin(w, { heart: false, firstPhase: "defense" });
    const swings = w.ctx.ProjectRSwordSystem.status().swings;
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 6);
    assert.equal(w.ctx.ProjectRSwordSystem.status().swings, swings, "剣は振れない");
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0, "旧CE1も予約されない");
    w.soul.end("test");
    w = soulWorld();
    equip(w, GUN_ID); w.frames(3);
    begin(w, { heart: false, firstPhase: "defense" });
    const before = plain(w.ctx.ProjectRGunSystem.status());
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 6);
    w.tap("KeyJ", 74); frames(w, 4);
    const after = plain(w.ctx.ProjectRGunSystem.status());
    assert.equal(after.shots, before.shots, "銃は撃てない");
    assert.equal(after.ammo, before.ammo, "弾薬は減らない");
    assert.ok(w.soul.getBlockedCounts().attackEvent >= 1);
    w.soul.skipPhase();
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 6);
    assert.equal(w.ctx.ProjectRGunSystem.status().shots, before.shots + 1, "攻撃ターンに戻れば撃てる");
    w.soul.end("test");
    w = soulWorld();
    w.ctx.$gameParty.leader().forceChangeEquip(0, null); w.frames(3);
    begin(w, { heart: false, firstPhase: "defense" });
    w.ctx.$gameTemp.reserveCommonEvent(1);
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0, "素手の攻撃(共通イベント1)も予約されない");
    w.soul.end("test");
    noErrors(w);
});

test("防御ターン: 必殺技の新しい発動を止める(キー押下時の受付判定 + 待ち行列の処理時のゲージ判定)。canAcceptInput は止めない(発動済みの奥義が固まるため)。攻撃ターンでは元の判定のまま", () => {
    const w = soulWorld();
    const input = w.ctx.ProjectRCardBattleInput, gauge = w.ctx.ProjectRUltimateGauge;
    begin(w, { heart: false });
    const attackReason = input.getBlockedReason({});
    const attackAccept = input.canAcceptInput({});
    assert.notEqual(attackReason, "soulDefense");
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(input.getBlockedReason({ code: "KeyU" }), "soulDefense", "キー押下の受付は断る");
    assert.ok(w.soul.getBlockedCounts().ultimate >= 1);
    assert.equal(input.canAcceptInput({}), attackAccept, "発動済みの奥義の進行判定には使われるので変えない");
    gauge.addUltimateGauge(1000, "test");
    assert.equal(gauge.isUltimateGaugeFull(), false, "防御中はゲージ満タンの判定を偽にして新規発動を断る");
    const gaugeBefore = gauge.getUltimateGauge();
    const attempt = plain(w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api"));
    assert.deepEqual([attempt.ok, attempt.reason], [false, "gaugeNotFull"]);
    assert.equal(gauge.getUltimateGauge(), gaugeBefore, "ゲージは消費されず、蓄積した値も変わらない");
    w.soul.skipPhase();
    assert.equal(input.getBlockedReason({}), attackReason, "攻撃に戻ると元の判定");
    assert.equal(gauge.isUltimateGaugeFull(), true, "攻撃に戻れば満タンのまま");
    w.soul.end("test");
});

test("待ち行列: 攻撃の最後のフレームに押したキーも、防御に入った後の処理で遮断される。待っていた共通イベント1は防御に入るとき取り除かれる", () => {
    const w = soulWorld();
    begin(w, { attackSeconds: 1, defenseSeconds: 5, heart: false });
    const hand = handIds(w);
    while (w.soul.getState().framesLeft > 1) w.frames(1);
    assert.equal(w.soul.getPhase(), "attack");
    aimDegree(w, 0, 5);
    w.keyDown("KeyQ", 81);                   // 攻撃ターンの最後のフレームで受け付けられ、待ち行列に入る
    w.frames(1);                             // このフレームで防御へ移り、その後に待ち行列が処理される
    assert.equal(w.soul.getPhase(), "defense");
    w.keyUp("KeyQ", 81); frames(w, 2);
    assert.deepEqual(handIds(w), hand, "境界フレームの要求は遮断側に倒す(カードは消費されない)");
    assert.equal(plain(w.ctx.ProjectRCardBattleInput.getLastResult()).reason, "soulDefense");
    // 待っていた攻撃用の共通イベントは、防御に入ったとき取り除く
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "attack");
    w.ctx.$gameTemp._commonEventQueue.push(1, 7);
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "defense");
    assert.deepEqual(plain(w.ctx.$gameTemp._commonEventQueue), [7], "攻撃CEだけ取り除く(他は残す)");
    assert.equal(w.soul.getLog().filter(e => e.type === "phase").slice(-1)[0].cleared.queuedEvents, 1);
    w.ctx.$gameTemp._commonEventQueue.length = 0;
    w.soul.end("test");
    noErrors(w);
});

test("長押し中のカード(押下プロファイル)は防御に入ると取り消され、防御中に始まった長押しも次のフレームで取り消される。発動しない", () => {
    const w = soulWorld();
    const input = w.ctx.ProjectRCardBattleInput;
    const log = [];
    assert.equal(input.registerPressProfile(ARROW, { holdSeconds: 1, fireOn: "release", onCancel: s => log.push(["cancel", s.reason]), onRelease: s => log.push(["release", s.variant]) }).ok, true);
    try {
        begin(w, { heart: false });
        const hand = handIds(w);
        w.keyDown("KeyQ", 81); frames(w, 3);
        assert.equal(plain(input.getPressSessions()).length, 1, "攻撃ターンでは長押しが始まる");
        w.soul.skipPhase();
        assert.equal(plain(input.getPressSessions()).length, 0, "防御に入ると取り消される");
        assert.deepEqual(log.slice(-1), [["cancel", "soulDefense"]]);
        w.keyUp("KeyQ", 81); frames(w, 3);
        w.keyDown("KeyE", 69); frames(w, 2); w.keyUp("KeyE", 69); frames(w, 2);   // 防御中の押下
        w.keyDown("KeyQ", 81); frames(w, 2);
        assert.equal(plain(input.getPressSessions()).length, 0, "防御中に始まった長押しも残らない");
        w.keyUp("KeyQ", 81); frames(w, 3);
        assert.deepEqual(handIds(w), hand, "カードは消費されない");
        w.soul.end("test");
    } finally { input.unregisterPressProfile(ARROW); }
    noErrors(w);
});

// ---------------------------------------------------------------- 移動・セーブ ----------------------------------------------------------------
test("移動: 戦闘中(攻撃・防御とも)はWASDで動けない。終了すると戻る。元から止まっていた場合は止めも戻しもしない", () => {
    const w = soulWorld();
    assert.ok(keyHold(w, "KeyD", 68, 20).dx > 0.3, "開始前は動ける");
    w.placePlayer(12, 25); frames(w, 2);
    begin(w, { heart: false, attackSeconds: 5, defenseSeconds: 5 });
    assert.equal(w.soul.getState().lockedPlayer, true);
    const attackMove = keyHold(w, "KeyD", 68, 20);
    assert.deepEqual([attackMove.dx, attackMove.dy], [0, 0], "攻撃ターンは動けない");
    w.soul.skipPhase();
    const defenseMove = keyHold(w, "KeyD", 68, 20);
    assert.deepEqual([defenseMove.dx, defenseMove.dy], [0, 0], "防御ターンも動けない");
    w.soul.end("test");
    assert.equal(w.run("playerMovementDisabled"), false);
    assert.ok(keyHold(w, "KeyD", 68, 20).dx > 0.3, "終了後は動ける");
    // 元から止まっていた場合
    const command = allow => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "ControlPlayerMovement", { allowMovement: allow });
    command("false");
    w.calls.length = 0;
    begin(w, { heart: false });
    assert.equal(w.soul.getState().lockedPlayer, false);
    w.soul.end("test");
    assert.equal(calls(w, "ControlPlayerMovement").length, 0);
    assert.equal(w.run("playerMovementDisabled"), true, "元の状態(停止)のまま");
    command("true");
});

test("セーブ禁止: 戦闘中は isSaveEnabled が false・保存値(_saveEnabled)は書き換えない・保存の実行も止まる。終了後は元の許可(許可/禁止どちらも)に戻る", () => {
    for (const previous of [true, false]) {
        const w = soulWorld();
        if (!previous) w.ctx.$gameSystem.disableSave();
        const raw = w.ctx.$gameSystem._saveEnabled;
        begin(w, { heart: false, attackSeconds: 5, defenseSeconds: 5 });
        assert.equal(w.soul.getState().saveBefore, previous, "開始前の許可を記録");
        for (const phase of ["attack", "defense"]) {
            assert.equal(w.soul.getPhase(), phase);
            assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false, phase + ": セーブ不可");
            assert.equal(w.ctx.$gameSystem._saveEnabled, raw, phase + ": セーブ対象の保存値は書き換えない");
            assert.equal(w.soul.getState().saveEnabled, false);
            // 保存の実行(イベントの「セーブ画面を開く」経由など、isSaveEnabledを見ない経路)
            const fake = { failed: 0, succeeded: 0, onSaveFailure() { this.failed++; }, onSaveSuccess() { this.succeeded++; } };
            let saved = 0;
            const saveGame = w.ctx.DataManager.saveGame;
            w.ctx.DataManager.saveGame = () => { saved++; return Promise.resolve(); };
            try { w.ctx.Scene_Save.prototype.executeSave.call(fake, 3); } finally { w.ctx.DataManager.saveGame = saveGame; }
            assert.equal(saved, 0, phase + ": 保存は実行されない");
            assert.equal(fake.failed, 1);
            w.soul.skipPhase();
        }
        assert.ok(w.soul.getBlockedCounts().save >= 2);
        w.soul.end("test");
        assert.equal(w.ctx.$gameSystem.isSaveEnabled(), previous, "終了後は開始前の許可に戻る");
        assert.equal(w.ctx.$gameSystem._saveEnabled, raw);
        // 終了後は保存の実行が素通しになる(コントローラが邪魔をしない)
        const fake = { failed: 0, onSaveFailure() { this.failed++; }, onSaveSuccess() {} };
        let saved = 0;
        const original = { saveGame: w.ctx.DataManager.saveGame, before: w.ctx.$gameSystem.onBeforeSave, id: w.ctx.$gameSystem._savefileId };
        w.ctx.DataManager.saveGame = () => { saved++; return Promise.resolve(); };
        w.ctx.$gameSystem.onBeforeSave = () => {};
        try { w.ctx.Scene_Save.prototype.executeSave.call(fake, 3); } finally {
            w.ctx.DataManager.saveGame = original.saveGame; delete w.ctx.$gameSystem.onBeforeSave; w.ctx.$gameSystem._savefileId = original.id;
        }
        assert.equal(saved, 1, "終了後は既存の保存処理がそのまま働く");
        noErrors(w);
    }
});

// ---------------------------------------------------------------- 復元 ----------------------------------------------------------------
// どの終了経路でも、開始前と同じ状態に戻る(ハートのEvent・雛形・HP変数・移動・戦闘セッション・セーブ許可・表示・フェーズ)。
const EXITS = {
    end: w => w.soul.end("test"),
    command: w => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), "ProjectR_SoulBattle", "EndSoulBattle", {}),
    endAll: w => w.ctx.ProjectRCombatSession.endAll("external"),
    sessionEnd: w => w.ctx.ProjectRCombatSession.end("soul_battle", "external"),
    heartGone: w => { w.ctx.$gameMap.event(w.soul.getState().heart.eventId).erase(); frames(w, 2); },
    mapSetup: w => w.ctx.$gameMap.setup(4),
    sceneChange: w => { w.ctx.SceneManager.goto(class FakeScene {}); w.ctx.SceneManager._nextScene = null; },
    loadSave: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents()),
    completed: w => frames(w, 400)
};
const GLOBAL_EXITS = ["endAll", "mapSetup", "loadSave"];
const ownedFields = snap => ({
    templates: snap.templates, movementDisabled: snap.movementDisabled, saveEnabled: snap.saveEnabled, rawSave: snap.rawSave, soul: snap.soul, poc: snap.poc,
    queue: snap.queue, pressSessions: snap.pressSessions, sources: snap.sources.filter(s => !/^soul_/.test(s)), heartHp: snap.hpVars.filter(k => /Event(?!2_|3_|4_|5_|6_)\d+_HP/.test(k))
});
test("復元: 終了・コマンド・戦闘の一括終了/個別終了・ハートの消滅・マップ読み直し・場面移動・ロード・ラウンド完了、どの経路でも攻撃/防御のどちらの最中でも開始前に戻る", () => {
    for (const phase of ["attack", "defense"]) {
        for (const [name, exit] of Object.entries(EXITS)) {
            const w = soulWorld(), before = snapshot(w);
            const ended = [];
            w.soul.onEnd(e => ended.push(plain(e).reason));
            begin(w, { attackSeconds: name === "completed" ? 1 : 30, defenseSeconds: name === "completed" ? 1 : 30, rounds: name === "completed" ? 1 : 0, firstPhase: phase });
            frames(w, 5);
            const mid = snapshot(w);
            assert.deepEqual(mid.sources.filter(s => !before.sources.includes(s)), ["soul_battle"], name);
            assert.equal(mid.saveEnabled, false, name);
            assert.equal(mid.movementDisabled, true, name);
            exit(w);
            const label = `${name}/${phase}`;
            assert.equal(w.soul.getPhase(), "idle", label);
            assert.equal(w.soul.isActive(), false, label);
            assert.equal(ended.length, 1, label + " 終了フックは1回だけ " + ended);
            // endAll・マップ読み直し・ロードは、アリーナ自身の戦闘表示や生成Eventまで片づける既存の仕様。その場合はコントローラが持つ項目だけを比べる。
            // loadSave: 読み込むセーブ内容(ここでは終了前に作った写し)で変数が置き換わるため、ハートのHP変数は比べない(実際は戦闘中にセーブ自体ができない)。
            const compare = GLOBAL_EXITS.includes(name) ? (name === "loadSave" ? snap => ({ ...ownedFields(snap), heartHp: [] }) : ownedFields) : snap => snap;
            assert.deepEqual(compare(snapshot(w)), compare(before), label);
            assert.equal(w.poc.isActive(), false, label);
            frames(w, 20);
            assert.deepEqual(compare(snapshot(w)), compare(before), label + " 終了後に何も復活・増殖しない");
            assert.equal(w.soul.getState().active, false, label);
            noErrors(w);
        }
    }
});

test("中断: プレイヤーが死亡したら終了して元に戻る(移動停止・セッション・セーブ禁止を残さない)", () => {
    const w = soulWorld(), before = snapshot(w);
    const ended = [];
    w.soul.onEnd(e => ended.push(plain(e).reason));
    begin(w, { heart: false });
    frames(w, 3);
    const leader = w.ctx.$gameParty.leader(), hp = leader.hp;
    try {
        leader._hp = 0;
        assert.equal(w.ctx.ProjectR.PlayerDeath.isDead(), true);
        frames(w, 1);
    } finally { leader._hp = hp; }
    assert.deepEqual(ended, ["playerDead"]);
    assert.deepEqual(snapshot(w), before);
    noErrors(w);
});

test("復元: 防御中に終わっても攻撃入力がすぐ通る。見た目(フェーズ表示)も外れる", () => {
    const w = soulWorld();
    const added = [], removed = [];
    const spriteset = w.ctx.SceneManager._scene._spriteset;
    spriteset.addChild = sprite => { added.push(sprite); sprite.parent = spriteset; };
    spriteset.removeChild = sprite => { removed.push(sprite); sprite.parent = null; };
    begin(w, { firstPhase: "defense", heart: false });
    frames(w, 3);
    const label = added.find(s => s._projectRSoulBattleLabel);
    assert.ok(label, "フェーズ表示が付く");
    assert.match(w.soul.getState().label.text, /^defense:/);
    w.soul.skipPhase(); frames(w, 2);
    assert.match(w.soul.getState().label.text, /^attack:/, "フェーズ表示が更新される");
    w.soul.skipPhase();
    w.soul.end("test");
    assert.ok(removed.includes(label), "終了で外れる");
    assert.equal(w.soul.getState().active, false);
    aimDegree(w, 0, 5);
    const result = fireCard(w, ARROW);
    assert.equal(result.ok, true, "終了後は防御中でもカードが使える " + JSON.stringify(result));
    noErrors(w);
});

test("通常戦闘の復元: 繰り返し開始/終了(攻撃/防御のどちらで終えても)の後も、矢のダメージ・移動・状態がコントローラ前と同じで、何も残らない", () => {
    const w = soulWorld();
    const baseline = dummyDamage(w);
    frames(w, 150); // 計測で撃った矢の一時Eventが消えてから、開始前の状態を取る
    const before = snapshot(w);
    const hookCalls = [];
    w.soul.onPhase(e => hookCalls.push(e.to));
    for (let i = 0; i < 12; i++) {
        begin(w, { heart: i % 3 !== 0 ? undefined : false, attackSeconds: 2, defenseSeconds: 2 });
        frames(w, 3);
        if (i % 2) w.soul.skipPhase();
        frames(w, 2);
        assert.equal(w.soul.end("loop" + i), true);
        assert.equal(w.soul.end("again"), false, "二重終了は何もしない");
        assert.deepEqual(snapshot(w), before, "周回" + i);
    }
    frames(w, 30);
    assert.deepEqual(snapshot(w), before);
    assert.deepEqual(plain(w.soul.gates()), GATES_NO_HOTBAR_UI);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true);
    assert.ok(keyHold(w, "KeyD", 68, 20).dx > 0.3, "移動が戻っている");
    w.placePlayer(12, 25); frames(w, 2);
    assert.equal(dummyDamage(w), baseline, "矢のダメージはコントローラ前と同じ");
    assert.ok(hookCalls.length >= 12);
    noErrors(w);
});

// ---------------------------------------------------------------- 所有の重複・PoCとの競合 ----------------------------------------------------------------
test("CombatSession: 所有は1回だけ(soul_battle)。ハートはPoCに任せるがセッションは所有させない。アリーナなど別の経路が始めたカード戦闘は終了後も続く", () => {
    const w = soulWorld();
    const before = snapshot(w);
    begin(w);
    const mid = plain(w.ctx.ProjectRCombatSession.sources());
    assert.equal(mid.filter(s => s === "soul_battle").length, 1);
    assert.ok(!mid.includes("soul_poc"), "PoCのセッションは始まらない");
    assert.deepEqual(plain(w.poc.getState()).ownsSession, false);
    assert.equal(plain(w.poc.getState()).lockedPlayer, false, "移動の停止はコントローラが持つ");
    assert.equal(w.soul.getState().ownsSession, true);
    assert.equal(deckApi(w).isCardBattleActive(), true);
    w.soul.end("test");
    assert.equal(deckApi(w).isCardBattleActive(), before.cardBattle, "カード戦闘の開始者(アリーナ)が終えるまで続く");
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), before.sources);
    noErrors(w);
});

test("競合: 動作中の二重開始・PoC動作中の開始・コントローラ動作中のPoC単独開始・既存の同名セッションは断る。断った側は何も壊さない", () => {
    const w = soulWorld();
    // PoCが動作中ならコントローラは始まらない
    const poc = w.poc.start({ ...aboveCenter(w, 5), pattern: "static" });
    assert.equal(poc.ok, true);
    const before = snapshot(w);
    assert.equal(w.soul.start({ heart: false }).reason, "pocActive");
    assert.deepEqual(snapshot(w), before, "断っても何も変わらない");
    w.poc.end("test");
    // コントローラ動作中はPoC単独の開始を断る
    begin(w);
    const running = snapshot(w);
    assert.equal(w.soul.start({ heart: false }).reason, "alreadyActive");
    assert.equal(w.poc.start({ ...aboveCenter(w, 3), pattern: "static" }).reason, "soulBattleActive");
    assert.deepEqual(snapshot(w), running, "断っても何も変わらない");
    w.soul.end("test");
    // 終われば、PoC単独の開始も元どおり使える
    const again = w.poc.start({ ...aboveCenter(w, 5), pattern: "static" });
    assert.equal(again.ok, true, JSON.stringify(again));
    w.poc.end("test");
    // 別の経路が同名のセッションを持っている場合は採用せず、断る(所有の重複を避ける)
    const cleanBefore = snapshot(w);
    assert.equal(w.ctx.ProjectRCombatSession.begin("soul_battle", { requireValidDeck: false }).ok, true);
    const foreign = snapshot(w);
    const result = w.soul.start({ heart: false });
    assert.equal(result.ok, false);
    assert.match(result.reason, /^combatRejected:alreadyActive/);
    assert.deepEqual(snapshot(w), foreign, "他者のセッションを終えない・変えない");
    assert.equal(w.ctx.ProjectRCombatSession.end("soul_battle", "foreign"), true);
    assert.deepEqual(snapshot(w), cleanBefore);
    noErrors(w);
});

test("開始に失敗したときの巻き戻し: ハートの開始が失敗(不正な動き)した場合も、マップ以外の場面でも、セッション・移動・表示が残らない", () => {
    const w = soulWorld(), before = snapshot(w);
    // ハートの開始が失敗する(不正な動き)。セッションと移動の停止まで済んでいても巻き戻る。
    const result = w.soul.start({ heart: { pattern: "zigzag" } });
    assert.equal(result.ok, false);
    assert.match(result.reason, /^heartFailed:invalidPattern/);
    assert.deepEqual(snapshot(w), before);
    assert.equal(w.soul.getPhase(), "idle");
    // マップ以外の場面
    const scene = w.ctx.SceneManager._scene;
    w.ctx.SceneManager._scene = {};
    try { assert.equal(w.soul.start({ heart: false }).reason, "mapUnavailable"); } finally { w.ctx.SceneManager._scene = scene; }
    assert.deepEqual(snapshot(w), before);
    noErrors(w);
});

test("プラグインコマンド(オプトイン入口): StartSoulBattle / EndSoulBattle で始まり、戻る。ハートなし指定・空欄は既定値", () => {
    const w = soulWorld(), before = snapshot(w);
    const run = (name, args) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), "ProjectR_SoulBattle", name, args);
    run("StartSoulBattle", { attackSeconds: "3", defenseSeconds: "2", rounds: "", firstPhase: "attack", heart: "false", pattern: "patrol", rangeX: "3", rangeY: "0", speed: "2" });
    const state = plain(w.soul.getState());
    assert.deepEqual([state.active, state.phase, state.totalFrames, state.heart.expected], [true, "attack", 180, false]);
    run("EndSoulBattle", {});
    assert.deepEqual(snapshot(w), before);
    run("StartSoulBattle", { attackSeconds: "", defenseSeconds: "", rounds: "", firstPhase: "defense", heart: "true", pattern: "static", rangeX: "3", rangeY: "0", speed: "2" });
    const second = plain(w.soul.getState());
    assert.deepEqual([second.phase, second.totalFrames, second.heart.expected, second.heart.owned], ["defense", 300, true, true], "空欄は既定(防御5秒)・ハートも出る");
    run("EndSoulBattle", {});
    assert.deepEqual(snapshot(w), before);
    noErrors(w);
});

test("PoC単体は従来どおり: コントローラが待機中なら単独で開始でき、PoC自身の戦闘セッション・移動停止も従来どおり", () => {
    const w = soulWorld(), before = snapshot(w);
    const result = w.poc.start({ ...aboveCenter(w, 5), pattern: "static" });
    assert.equal(result.ok, true);
    assert.ok(plain(w.ctx.ProjectRCombatSession.sources()).includes("soul_poc"));
    assert.equal(w.run("playerMovementDisabled"), true);
    assert.equal(w.soul.getPhase(), "idle", "PoC単体ではコントローラは動かない");
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true, "PoC単体ではセーブ禁止にならない(従来どおり)");
    w.poc.end("test");
    assert.deepEqual(snapshot(w), before);
});

// ---------------------------------------------------------------- 迂回路の点検(ホットバー・並列の共通イベント・発動済みの攻撃・神・setupNewGame) ----------------------------------------------------------------
// Hendrix Hotbar の画面(Spriteset_SkillUI / Sprite_SkillSlot)は、このハーネスでは作られず、クラスも外から見えない。
// そこで「useSlotContents を持つスロットが画面にある」形の代用品を置き、SOUL側の遮断(prototypeを包む処理・UseSlot系コマンド)の動きを確かめる。
// Hotbar本体の経路は、ソースを読んで確認した(Scene_Map.updateSlotInputs / タッチ → slot.useSlotContents、ゲームパッド → UseSlot / UseSelectedSlot)。
const CE_ITEM = 9001, PLAIN_ITEM = 9002;
function fakeHotbar(w) {
    const used = [];
    const quiet = { get: (target, prop) => (prop in target ? target[prop] : typeof prop === "symbol" || String(prop).startsWith("_") || prop === "then" ? undefined : () => undefined) };
    class FakeSlot { constructor(name) { this._config = { Name: name }; return new Proxy(this, quiet); } useSlotContents() { used.push(this._config.Name); } }
    const names = ["1", "2", "3", "4"];
    const slots = new Map(names.map(name => [name, new FakeSlot(name)]));
    const scene = w.ctx.SceneManager._scene;
    const ui = { _slots: slots, _gamepadGrids: [{ slots: names.map(Name => ({ Name })) }], _gamepadCursor: { _currentGridIndex: 0, _currentSlotIndex: 0 } };
    // Hendrixの毎フレーム更新が呼ぶ未知のメソッドは何もしない(ハーネスのSpritesetと同じ方式)
    scene._skillUI = new Proxy(ui, { get: (target, prop) => (prop in target ? target[prop] : typeof prop === "symbol" || String(prop).startsWith("_") || prop === "then" ? undefined : () => undefined) });
    w.ctx.$dataItems[CE_ITEM] = { id: CE_ITEM, effects: [{ code: 44, dataId: 1, value1: 1, value2: 0 }] };
    w.ctx.$dataItems[PLAIN_ITEM] = { id: PLAIN_ITEM, effects: [{ code: 11, dataId: 0, value1: 0, value2: 100 }] };
    w.ctx.$gameSystem._uiSlotData = { 1: { type: "skill", id: 7 }, 2: { type: "item", id: CE_ITEM }, 3: { type: "item", id: PLAIN_ITEM }, 4: { type: "weapon", id: SWORD_ID } };
    return {
        used, slots, scene,
        press: name => slots.get(name).useSlotContents(),
        command: (cmd, args) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), "Hendrix_Hotbar_Creator", cmd, args),
        cleanup: () => { delete w.ctx.$dataItems[CE_ITEM]; delete w.ctx.$dataItems[PLAIN_ITEM]; delete w.ctx.$gameSystem._uiSlotData; delete scene._skillUI; }
    };
}

test("ホットバー: 防御ではスキルと共通イベント付きアイテムのスロットを遮断(キー・マウス経路 useSlotContents)。普通のアイテム・武器スロットと攻撃ターンは通常どおり", () => {
    const w = soulWorld();
    const hotbar = fakeHotbar(w);
    try {
        begin(w, { heart: false });
        assert.equal(plain(w.soul.gates()).hotbarSlot, true, "画面にあるスロットのprototypeを包んだ");
        for (const name of ["1", "2", "3", "4"]) hotbar.press(name);
        assert.deepEqual(hotbar.used, ["1", "2", "3", "4"], "攻撃ターンは全スロットが通る");
        hotbar.used.length = 0;
        w.soul.skipPhase();
        assert.equal(w.soul.getPhase(), "defense");
        for (const name of ["1", "2", "3", "4"]) hotbar.press(name);
        assert.deepEqual(hotbar.used, ["3", "4"], "防御ではスキル(1)とCE付きアイテム(2)が止まり、普通のアイテム(3)と武器(4)は通る");
        assert.equal(w.soul.getBlockedCounts().hotbar, 2);
        w.soul.skipPhase();
        hotbar.used.length = 0;
        hotbar.press("1");
        assert.deepEqual(hotbar.used, ["1"], "攻撃に戻ると通る");
        w.soul.skipPhase();
        w.soul.end("test");
        hotbar.used.length = 0;
        hotbar.press("1");
        assert.deepEqual(hotbar.used, ["1"], "終了後は通常どおり(包みは素通し)");
        noErrors(w);
    } finally { hotbar.cleanup(); }
});

test("ホットバー: 戦闘の開始後に画面ができた場合も、次のフレームで遮断が付く", () => {
    const w = soulWorld();
    begin(w, { heart: false, firstPhase: "defense" });
    assert.equal(plain(w.soul.gates()).hotbarSlot, false);
    const hotbar = fakeHotbar(w);
    try {
        hotbar.press("1");
        assert.deepEqual(hotbar.used, ["1"], "まだ包んでいない(次のフレームまで)");
        frames(w, 1);
        assert.equal(plain(w.soul.gates()).hotbarSlot, true);
        hotbar.used.length = 0;
        hotbar.press("1"); hotbar.press("3");
        assert.deepEqual(hotbar.used, ["3"]);
        w.soul.end("test");
    } finally { hotbar.cleanup(); }
});

test("ホットバー: ゲームパッド経路(UseSlot / UseSelectedSlot)も、防御ではスキルを遮断する。選択中のスロットが分からないときも安全側に止める", () => {
    const w = soulWorld();
    const hotbar = fakeHotbar(w);
    try {
        begin(w, { heart: false });
        hotbar.command("UseSlot", { Name: "1" });
        hotbar.command("UseSelectedSlot", {});
        assert.equal(w.soul.getBlockedCounts().hotbar, 0, "攻撃ターンは遮断しない");
        w.soul.skipPhase();
        hotbar.command("UseSlot", { Name: "1" });
        hotbar.command("UseSlot", { Name: "2" });
        hotbar.command("UseSlot", { Name: "3" });
        assert.equal(w.soul.getBlockedCounts().hotbar, 2, "スキルとCE付きアイテムだけ遮断");
        hotbar.scene._skillUI._gamepadCursor._currentSlotIndex = 0;   // 選択中=スロット1(スキル)
        hotbar.command("UseSelectedSlot", {});
        assert.equal(w.soul.getBlockedCounts().hotbar, 3);
        hotbar.scene._skillUI._gamepadCursor._currentSlotIndex = 2;   // 選択中=スロット3(普通のアイテム)
        hotbar.command("UseSelectedSlot", {});
        assert.equal(w.soul.getBlockedCounts().hotbar, 3, "普通のアイテムは止めない");
        hotbar.scene._skillUI._gamepadGrids = [];                      // 選択中のスロットが分からない
        hotbar.command("UseSelectedSlot", {});
        assert.equal(w.soul.getBlockedCounts().hotbar, 4, "不明なときは止める");
        w.soul.end("test");
        noErrors(w);
    } finally { hotbar.cleanup(); }
});

test("攻撃用共通イベント(CE1)の直接実行(並列割り当て・インタープリタ直接)も防御では動かない。他の共通イベントと攻撃ターンは通常どおり", () => {
    const w = soulWorld();
    const ce1 = w.ctx.$dataCommonEvents[1].list, ce2 = w.ctx.$dataCommonEvents[2].list;
    const run = list => { const interpreter = new w.ctx.Game_Interpreter(); interpreter.setup(list); return interpreter.isRunning(); };
    begin(w, { heart: false });
    assert.equal(run(ce1), true, "攻撃ターンは動く");
    w.soul.skipPhase();
    assert.equal(run(ce1), false, "防御では動かない");
    const mapInterpreter = w.ctx.$gameMap._interpreter;
    mapInterpreter.clear(); mapInterpreter.setup(ce1);
    assert.equal(mapInterpreter.isRunning(), false, "マップのインタープリタ経由も同じ");
    assert.equal(run(ce2), true, "攻撃以外の共通イベントは動く");
    assert.ok(w.soul.getBlockedCounts().attackEvent >= 2);
    w.soul.end("test");
    assert.equal(run(ce1), true, "終了後は動く");
});

test("発動済みの攻撃は残す: 攻撃の最後に撃った矢は防御に入っても当たり(ダメージは通常と同じ・1回)、防御中の新しい発射だけが遮断される", () => {
    const w = soulWorld();
    const baseline = dummyDamage(w);
    frames(w, 150);
    w.placePlayer(12, 25); frames(w, 2);
    const id = begin(w, { attackSeconds: 1, defenseSeconds: 30 });
    while (w.soul.getState().framesLeft > 3) w.frames(1);
    w.calls.length = 0;
    const result = shoot(w, 0, 5);
    assert.equal(result.ok, true, JSON.stringify(result));
    w.frames(1);
    w.frames(1);
    w.frames(1);
    assert.equal(w.soul.getPhase(), "defense", "矢が飛んでいる間に防御へ移る");
    assert.equal(barHp(w, id), HP, "防御に入った時点では、まだ当たっていない");
    const blockedBefore = plain(w.soul.getBlockedCounts());
    // 防御中の新しい発射は遮断
    aimDegree(w, 0, 5);
    const second = plain(deckApi(w).requestUseCard(0));
    assert.equal(second.reason, "soulDefense");
    // すでに撃った矢は当たる
    assert.ok(runUntilHit(w, () => barHp(w, id)) > 0, "発動済みの矢は防御中でも当たる");
    assert.equal(HP - barHp(w, id), baseline, "ダメージは通常と同じ");
    frames(w, 30);
    assert.equal(HP - barHp(w, id), baseline, "追加のダメージはない");
    assert.equal(calls(w, "UpdateEventHp").filter(c => String(c.args.eventId) === String(id)).length, 1, "ハートへのUpdateEventHpは1回だけ");
    assert.equal(w.soul.getBlockedCounts().card, blockedBefore.card + 1, "遮断されたのは防御中の新しい発射の1回だけ");
    w.soul.end("test");
    noErrors(w);
});

test("神の自動攻撃: 召喚/常駐の神(GodSummonManager・Visual)は自分から攻撃しない(ダメージ・当たり判定を呼ばない)ので、遮断の対象は無い", () => {
    for (const file of ["js/plugins/ProjectR_GodSummonManager.js", "js/plugins/ProjectR_GodSummonVisual.js"]) {
        const code = read(file).split("*/").slice(1).join("*/");
        assert.doesNotMatch(code, /UpdateEventHp|checkCollide|UpdateEnemyHp|\.gainHp\(/, file + " は敵へダメージを与えない");
    }
});

test("setupNewGame: 攻撃/防御のどちらの最中でも、ニューゲームで元に戻る(ハート・移動・セッション・セーブ禁止・表示)。終了フックは1回、遮断は素通し", () => {
    for (const phase of ["attack", "defense"]) {
        const w = soulWorld();
        w.ctx.DataManager._globalInfo = [];
        const templates = w.ctx.$dataTemplateMap.events.length;
        const ended = [];
        w.soul.onEnd(e => ended.push(plain(e).reason));
        const id = begin(w, { firstPhase: phase });
        frames(w, 5);
        assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false);
        assert.equal(w.run("playerMovementDisabled"), true);
        w.ctx.DataManager.setupNewGame();
        const label = phase;
        assert.deepEqual(ended, ["setupNewGame"], label);
        assert.equal(w.soul.getPhase(), "idle", label);
        assert.equal(w.soul.getState().active, false, label);
        assert.equal(w.poc.isActive(), false, label);
        assert.equal(w.run("playerMovementDisabled"), false, label + " 移動が戻る");
        assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true, label + " 新しいゲームのセーブは許可");
        assert.equal(w.ctx.$dataTemplateMap.events.length, templates, label + " 雛形が戻る");
        assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).filter(s => /^soul_/.test(s)), [], label);
        assert.equal(w.ctx.$gameVariables._data["Map4_Event" + id + "_HP"], undefined, label + " ハートのHP変数が残らない");
        // 遮断は素通し: ニューゲーム後のカード要求は「戦闘外」の既存の理由で返り、soulDefenseにならない
        assert.notEqual(plain(w.ctx.ProjectRCardDeck.requestUseCard(0)).reason, "soulDefense", label);
        assert.equal(w.ctx.Game_Interpreter && (() => { const i = new w.ctx.Game_Interpreter(); i.setup(w.ctx.$dataCommonEvents[1].list); return i.isRunning(); })(), true, label + " 攻撃CEも通る");
        frames(w, 20);
        assert.equal(w.soul.getState().active, false, label + " 再開しない");
        noErrors(w);
    }
});

test("発動済みの奥義は防御に入っても最後まで進む(Apollo: 7本の矢 / Hermes: 6連斬撃)。防御中に新しい奥義は始められず、ゲージも消費されない", () => {
    for (const [god, total, key] of [["apollo", 7, "launchedArrows"], ["hermes", 6, "spawnedSlashes"]]) {
        const w = cardWorld(ARROW, { x: 30, y: 40, bigMap: { width: 60, height: 60 }, balance: x => assert.equal(deckApi(x).setUltimateRing(god).ok, true) });
        parkOthers(w, []); frames(w, 150);
        w.soul = w.ctx.ProjectRSoulBattle;
        assert.equal(w.soul.start({ attackSeconds: 1, defenseSeconds: 600, heart: false }).ok, true);
        while (w.soul.getState().framesLeft > 2) w.frames(1);
        const state = () => plain(god === "apollo" ? w.ctx.ProjectRApolloUltimate.getApolloUltimateState() : w.ctx.ProjectRHermesUltimate.getHermesUltimateState());
        w.ctx.ProjectRUltimateGauge.addUltimateGauge(1000, "test"); aimDegree(w, 0, 5);
        const started = w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api");
        assert.equal(started.ok, true, JSON.stringify(started));
        frames(w, 2);
        assert.equal(w.soul.getPhase(), "defense", god + " 防御に入った");
        let most = 0;
        for (let i = 0; i < 150; i++) { w.frames(1); const now = state(); if (now && now[key] > most) most = now[key]; }
        assert.equal(most, total, god + " 防御の間も全部の矢/斬撃が出る");
        assert.equal(state(), null, god + " 奥義は完了して終わる");
        // 防御中の新しい奥義: 受け付けず、ゲージも消費しない
        w.ctx.ProjectRUltimateGauge.addUltimateGauge(1000, "test");
        const gauge = w.ctx.ProjectRUltimateGauge.getUltimateGauge();
        const again = plain(w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api"));
        assert.deepEqual([again.ok, again.reason], [false, "gaugeNotFull"], god);
        assert.equal(w.ctx.ProjectRUltimateGauge.getUltimateGauge(), gauge, god + " ゲージは消費されない");
        w.soul.end("test");
        assert.equal(w.ctx.ProjectRUltimateGauge.isUltimateGaugeFull(), true, god + " 終了後は満タン判定が元に戻る");
        assert.equal(plain(w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api")).ok, true, god + " 終了後は通常どおり発動できる");
    }
});

console.log(`\n${passed} tests passed`);
