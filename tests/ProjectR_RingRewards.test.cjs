"use strict";
// Stage 5-B1: ProjectR_RingRewards(通信ランクを満たしたときの指輪の入手 / スキルの固定レベル報酬)。実エンジン(全plugin・本番の読み込み順)。
//   【0】登録: plugins.js・コマンド・API。保存領域は作らない(コードに保存キーが無い)
//   【1】ランク不足: 付与しない・コード -3・完了スイッチは触らない
//   【2】設定不足(ランク変数・必要ランク・指輪ID・結果の変数がランク変数): すべて付与しない(-1 / -2)
//   【3】成功: 4つの神それぞれ。主人公の所持になる・装備・スキル枠・Q には触らない・Hermes は触らない
//   【4】重複: 2回目は何も変えない(コード 2)・ランクが後で下がっても同じ
//   【5】仲間が持っている指輪は取り上げない(-5)
//   【6】戦闘中は付与しない(-4)・戦闘が終われば付与できる
//   【7】スキルの固定レベル: max(いま, 目標)・上限・下げない・繰り返しで増えない・所持フラグ/枚数/ほかのスキルは不変・不正入力
//   【8】結果の書き出し: 変数・完了スイッチ(成功/済みだけ ON・失敗では触らない・ランク変数は守る)
//   【9】保存・読込: 新しい保存領域を作らない・指輪の所有とレベルが往復する・読込後の再実行も冪等
//   【10】Hermes の本編の入手と初期カードは変わらない・実際のプラグインコマンド経路(文字列の引数)
//   【11】スキルのレベルは、その指輪を主人公が持っているときだけ上げられる(未所持・仲間が持っている = -6。何も変えない)・入手後は成功・保存→読込
//   【12】設定の誤り: 指定したのに使えない結果の変数・完了スイッチは、付与・レベル上げの前に拒否(-1)。結果の変数 = ランク変数は、何も変えずにイベントを中断する
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const R = w => w.ctx.ProjectRRingRewards, D = w => w.ctx.ProjectRCardDeck, RL = w => w.ctx.ProjectRRingLoadout, INV = w => w.ctx.ProjectRCardInventory;
const GOD = ["apollo", "janus", "themis", "athena"];
const RANK_VAR = 3, RESULT_VAR = 5, DONE_SWITCH = 7;
const world = () => { const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める"); w.enterMap(4, 12, 25); w.frames(3); return w; };
const setVar = (w, id, v) => w.ctx.$gameVariables.setValue(id, v);
const getVar = (w, id) => w.ctx.$gameVariables.value(id);
const sw = (w, id) => w.ctx.$gameSwitches.value(id);
const acquire = (w, o = {}) => plain(R(w).acquireRing({ ringId: "apollo", rankVariableId: RANK_VAR, requiredRank: 3, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH, ...o }));
const raise = (w, o = {}) => plain(R(w).raiseSkillLevel({ skillId: "janus_reflection", targetLevel: 2, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH, ...o }));
const owner = (w, ring) => D(w).getRingOwner(ring);
const cardEntry = (w, id) => plain(D(w).getPersistentData().cardOwnership[id] || null);
const level = (w, id) => (cardEntry(w, id) || { level: 1 }).level;
const snapshot = w => JSON.stringify(plain({ deck: D(w).getPersistentData(), inv: INV(w).state(), loadout: RL(w).getState() }));
const ALL_SKILLS = w => plain(R(w).validSkillIds());
const silenced = fn => { const orig = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = orig; } };
const callCommand = (w, name, args) => { const i = new w.ctx.Game_Interpreter(); i._eventId = 0; w.ctx.PluginManager.callCommand(i, "ProjectR_RingRewards", name, args); };
// 検証の準備: 主人公に指輪を持たせる(引数なし = 5つ全部)。スキルのレベル上げは、指輪を持っているときだけ成功する
const own = (w, ...rings) => { for (const ring of rings.length ? rings : ["hermes", ...GOD]) assert.equal(D(w).assignRingToPlayer(ring).ok, true, "指輪の準備: " + ring); };

// ---------------------------------------------------------------- 【0】登録 ----------------------------------------------------------------
test("【0】登録: plugins.js に1行・コマンド2つ・API・対象の神は4つ・スキルは25(5つの指輪×5)・保存の領域を作らない", () => {
    const w = world();
    const text = fs.readFileSync(path.join(__dirname, "..", "js", "plugins.js"), "utf8");
    assert.equal((text.match(/"name":"ProjectR_RingRewards"/g) || []).length, 1, "plugins.js に1回だけ登録");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "js", "plugins", "ProjectR_RingRewards.js")));
    assert.deepEqual(plain(R(w).SUPPORTED_RINGS), GOD);
    assert.deepEqual(Object.keys(w.ctx.PluginManager._commands).filter(k => k.startsWith("ProjectR_RingRewards:")).sort(), ["ProjectR_RingRewards:AcquireRing", "ProjectR_RingRewards:RaiseSkillLevel"]);
    assert.deepEqual(plain(R(w).RESULT), { SUCCESS: 1, ALREADY: 2, NOT_CONFIGURED: -1, INVALID: -2, RANK_TOO_LOW: -3, IN_COMBAT: -4, HELD_BY_ALLY: -5, RING_NOT_OWNED: -6, FAILED: -9 });
    assert.equal(new Set(Object.values(plain(R(w).RESULT))).size, Object.keys(plain(R(w).RESULT)).length, "結果コードは重ならない");
    for (const id of ALL_SKILLS(w)) assert.equal(D(w).definitions.card(id).ringId, RL(w).getSkillRing(id), "Core のカードの指輪と、指輪のスキル表が一致: " + id);
    const skills = ALL_SKILLS(w);
    assert.equal(skills.length, 25); assert.equal(new Set(skills).size, 25);
    for (const ring of ["hermes", ...GOD]) assert.deepEqual(plain(RL(w).getRingSkills(ring)), skills.filter(id => RL(w).getSkillRing(id) === ring), ring + " のスキルは変わらない(5つずつ)");
    const src = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", "ProjectR_RingRewards.js"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/_project[A-Za-z]*/.test(code), "コードに保存キー(_projectR...)が無い = 新しい保存領域を作らない");
    assert.ok(!/\beval\b|new Function|require\(/.test(code));
    assert.ok(!/Hendrix|ProjectRFieldCombat|ProjectRSoul/.test(code), "戦闘・SOUL・Hendrix には触れない");
});

// ---------------------------------------------------------------- 【1】ランク不足 ----------------------------------------------------------------
test("【1】ランク不足: 付与しない・コード -3・完了スイッチを触らない・ランクがちょうど必要値なら成功(境界)", () => {
    const w = world(); setVar(w, RANK_VAR, 2); const before = snapshot(w);
    const r = silenced(() => acquire(w));
    assert.equal(r.ok, false); assert.equal(r.code, -3); assert.equal(r.status, "rankTooLow"); assert.equal(r.rank, 2); assert.equal(r.requiredRank, 3);
    assert.equal(owner(w, "apollo"), "unowned"); assert.equal(getVar(w, RESULT_VAR), -3); assert.equal(sw(w, DONE_SWITCH), false, "失敗では完了にしない");
    assert.equal(snapshot(w), before, "保存される状態は何も変わらない");
    setVar(w, RANK_VAR, 3); const ok = acquire(w);
    assert.equal(ok.code, 1); assert.equal(owner(w, "apollo"), "player"); assert.equal(sw(w, DONE_SWITCH), true);
    const w2 = world(); setVar(w2, RANK_VAR, 99); assert.equal(acquire(w2, { requiredRank: 100 }).code, -3, "99 < 100");
    const w3 = world(); setVar(w3, RANK_VAR, "abc"); assert.equal(silenced(() => acquire(w3)).code, -3, "数値でない値は満たさない");
});

// ---------------------------------------------------------------- 【2】設定不足 ----------------------------------------------------------------
test("【2】設定不足は付与しない: 空のコマンド・ランク変数 0/範囲外/不正・必要ランク 0/負/不正・指輪 空/hermes/未知/大文字小文字の揺れ・結果の変数=ランク変数", () => {
    const w = world(); setVar(w, RANK_VAR, 50); const before = snapshot(w);
    const cases = [
        ["引数なし", {}, -2, "invalidRing", true],
        ["指輪が空", { ringId: "" }, -2, "invalidRing"], ["hermes は対象外", { ringId: "hermes" }, -2, "invalidRing"], ["未知の指輪", { ringId: "zeus" }, -2, "invalidRing"],
        ["ランク変数が空", { rankVariableId: "" }, -1, "rankVariableNotConfigured"], ["ランク変数 0", { rankVariableId: 0 }, -1, "rankVariableNotConfigured"],
        ["ランク変数が範囲外(21)", { rankVariableId: 21 }, -1, "rankVariableNotConfigured"], ["ランク変数が負", { rankVariableId: -3 }, -1, "rankVariableNotConfigured"], ["ランク変数が文字", { rankVariableId: "x" }, -1, "rankVariableNotConfigured"], ["ランク変数が小数", { rankVariableId: "3.5" }, -1, "rankVariableNotConfigured"],
        ["必要ランクが空", { requiredRank: "" }, -1, "requiredRankNotConfigured"], ["必要ランク 0", { requiredRank: 0 }, -1, "requiredRankNotConfigured"], ["必要ランクが負", { requiredRank: -1 }, -1, "requiredRankNotConfigured"], ["必要ランクが文字", { requiredRank: "abc" }, -1, "requiredRankNotConfigured"], ["必要ランクが小数", { requiredRank: "2.5" }, -1, "requiredRankNotConfigured"],
        ["結果の変数がランク変数と同じ", { resultVariableId: RANK_VAR }, -1, "resultVariableIsRankVariable"]
    ];
    for (const [label, over, code, status, bare] of cases) {
        const r = silenced(() => bare ? plain(R(w).acquireRing({})) : acquire(w, over));
        assert.equal(r.ok, false, label); assert.equal(r.code, code, label + " " + JSON.stringify(r)); assert.equal(r.status, status, label);
    }
    for (const ring of GOD) assert.equal(owner(w, ring), "unowned", "どれも付与されていない");
    assert.equal(getVar(w, RANK_VAR), 50, "ランク変数は書き換えられない(結果の変数に指定しても)");
    assert.equal(sw(w, DONE_SWITCH), false);
    assert.equal(snapshot(w), before, "保存される状態は何も変わらない");
    // 大文字・空白は受け付ける(ID の揺れ)
    assert.equal(acquire(w, { ringId: " Janus " }).code, 1); assert.equal(owner(w, "janus"), "player");
    // 設定不足は「すでに持っている」より先に判定する(設定ミスのイベントが成功に見えない)
    assert.equal(silenced(() => acquire(w, { ringId: "janus", requiredRank: 0 })).code, -1);
});

// ---------------------------------------------------------------- 【3】成功 ----------------------------------------------------------------
test("【3】成功: Apollo / Janus / Themis / Athena それぞれ主人公の所持になる・5スキルが解放される・自動で装備・スキル枠・Q にしない・Hermes とカードに触らない", () => {
    for (const ring of GOD) {
        const w = world(); setVar(w, RANK_VAR, 5);
        const hermesBefore = owner(w, "hermes"), othersBefore = GOD.filter(g => g !== ring).map(g => owner(w, g));
        const decksBefore = JSON.stringify(plain(D(w).getDeck())), copiesBefore = JSON.stringify(plain(INV(w).state().copies)), cardsBefore = JSON.stringify(plain(D(w).getPersistentData().cardOwnership));
        const r = acquire(w, { ringId: ring, requiredRank: 4 });
        assert.deepEqual([r.ok, r.code, r.status, r.ringId], [true, 1, "granted", ring], ring);
        assert.equal(owner(w, ring), "player"); assert.equal(D(w).hasPlayerRing(ring), true);
        assert.equal(getVar(w, RESULT_VAR), 1); assert.equal(sw(w, DONE_SWITCH), true);
        assert.deepEqual(plain(RL(w).getUnlockedSkills(ring)), plain(RL(w).getRingSkills(ring)), "5スキルが解放される");
        assert.equal(RL(w).isRingEquipped(ring), false, "自動で装備しない");
        assert.deepEqual(plain(RL(w).getEquippedRings()), [], "装備は空のまま");
        assert.equal(RL(w).getUltimate(), null, "Q を選ばない"); assert.equal(D(w).getUltimateRingId(), null, "Core の Ultimate も選ばない");
        for (const slot of plain(RL(w).SLOT_IDS)) assert.equal(RL(w).getSkill(slot), null, "スキル枠に入れない: " + slot);
        assert.equal(owner(w, "hermes"), hermesBefore, "Hermes は変わらない");
        assert.deepEqual(GOD.filter(g => g !== ring).map(g => owner(w, g)), othersBefore, "ほかの指輪は変わらない");
        assert.equal(JSON.stringify(plain(D(w).getDeck())), decksBefore, "デッキは変わらない");
        assert.equal(JSON.stringify(plain(INV(w).state().copies)), copiesBefore, "所持枚数は変わらない");
        assert.equal(JSON.stringify(plain(D(w).getPersistentData().cardOwnership)), cardsBefore, "カードの所持・レベルは変わらない");
    }
});

// ---------------------------------------------------------------- 【4】重複 ----------------------------------------------------------------
test("【4】重複は冪等: 2回目以降はコード 2・何も変えない・ランクが後で下がっても同じ・レベルは現在のまま・完了スイッチは ON のまま", () => {
    const w = world(); setVar(w, RANK_VAR, 3);
    assert.equal(acquire(w, { ringId: "athena" }).code, 1);
    D(w).setCardLevel("athena_aegis", 3);
    const after1 = snapshot(w);
    for (let i = 0; i < 3; i++) { const r = acquire(w, { ringId: "athena" }); assert.deepEqual([r.ok, r.code, r.status], [true, 2, "alreadyOwned"], "繰り返し " + i); }
    assert.equal(snapshot(w), after1, "保存される状態は変わらない");
    setVar(w, RANK_VAR, 0); const r = acquire(w, { ringId: "athena" });
    assert.deepEqual([r.ok, r.code], [true, 2], "ランクが下がっていても、済みは済み");
    assert.equal(sw(w, DONE_SWITCH), true); assert.equal(getVar(w, RESULT_VAR), 2); assert.equal(level(w, "athena_aegis"), 3, "レベルを触らない");
    // 装備した後でも、重複は何も変えない
    assert.equal(RL(w).equipRing("athena").ok, true); const equipped = snapshot(w);
    assert.equal(acquire(w, { ringId: "athena" }).code, 2); assert.equal(snapshot(w), equipped, "装備は外れない");
});

// ---------------------------------------------------------------- 【5】仲間が持っている ----------------------------------------------------------------
test("【5】仲間が持っている指輪は取り上げない(-5): ランクが足りていても・足りていなくても・所有者は変わらない", () => {
    const w = world(); setVar(w, RANK_VAR, 9);
    D(w).getPersistentData();                                                                            // 保存データを用意
    w.ctx.$gameSystem._projectRCardDeckData.ringOwnershipState.themis = "actor:2";                      // 「指輪の受け渡し」で仲間へ渡した状態(定義上の装備可能キャラは空なので、保存データを直接そうする)
    assert.equal(owner(w, "themis"), "actor:2");
    const before = snapshot(w);
    const r = silenced(() => acquire(w, { ringId: "themis" }));
    assert.deepEqual([r.ok, r.code, r.status, r.owner], [false, -5, "heldByAlly", "actor:2"]);
    assert.equal(owner(w, "themis"), "actor:2", "取り上げない"); assert.equal(getVar(w, RESULT_VAR), -5); assert.equal(sw(w, DONE_SWITCH), false);
    setVar(w, RANK_VAR, 0); assert.equal(silenced(() => acquire(w, { ringId: "themis" })).code, -5, "ランク不足でも、仲間が持っていることを先に示す");
    assert.equal(snapshot(w), before, "保存される状態は変わらない");
    assert.equal(w.ctx.$gameSystem._projectRCardDeckData.ringOwnershipState.themis, "actor:2");
    // 返してもらった(unowned)あとは、ランクを満たせば入手できる
    w.ctx.$gameSystem._projectRCardDeckData.ringOwnershipState.themis = "unowned"; setVar(w, RANK_VAR, 3);
    assert.equal(acquire(w, { ringId: "themis" }).code, 1);
});

// ---------------------------------------------------------------- 【6】戦闘中 ----------------------------------------------------------------
test("【6】戦闘中は付与しない(-4): 画面に敵がいる・戦闘中のパーティ・カード戦闘中のどれでも。戦闘が終われば付与できる(失敗は完了にしない)", () => {
    const sources = {
        "画面の戦闘(CombatPresence)": { on: w => { w.ctx.Graphics.frameCount = 100; w.ctx.ProjectRCombatPresence.registerCombatSource("rr-test", () => true); w.ctx.ProjectRCombatPresence.refresh(); assert.equal(w.ctx.ProjectRCombatPresence.isCombatActive(), true); }, off: w => { w.ctx.ProjectRCombatPresence.unregisterCombatSource("rr-test"); w.ctx.Graphics.frameCount += 5000; w.ctx.ProjectRCombatPresence.refresh(); assert.equal(w.ctx.ProjectRCombatPresence.isCombatActive(), false); } },
        "パーティが戦闘中": { on: w => { w.ctx.$gameParty.inBattle = () => true; }, off: w => { delete w.ctx.$gameParty.inBattle; } },
        "カード戦闘中": { on: w => { const h = plain(w.ctx.ProjectRHermesProductionDeck.acquireRing("hermes", { source: "rr-test" })); assert.equal(h.ok, true); const b = D(w).startBattle(); assert.equal(b.ok, true, JSON.stringify(plain(b))); assert.equal(D(w).isBattleActive(), true); }, off: w => { D(w).endBattle(); assert.equal(D(w).isBattleActive(), false); } }
    };
    for (const [label, s] of Object.entries(sources)) {
        const w = world(); setVar(w, RANK_VAR, 9);
        s.on(w);
        const before = snapshot(w);
        const r = silenced(() => acquire(w, { ringId: "janus" }));
        assert.deepEqual([r.ok, r.code, r.status], [false, -4, "inCombat"], label);
        assert.equal(owner(w, "janus"), "unowned", label); assert.equal(getVar(w, RESULT_VAR), -4); assert.equal(sw(w, DONE_SWITCH), false, "失敗は完了にしない: " + label);
        assert.equal(snapshot(w), before, label);
        s.off(w);
        const ok = acquire(w, { ringId: "janus" });
        assert.equal(ok.code, 1, label + " の後は付与できる: " + JSON.stringify(ok)); assert.equal(owner(w, "janus"), "player"); assert.equal(sw(w, DONE_SWITCH), true);
    }
    // Core 自身の拒否(RING_TRANSFER_DURING_BATTLE)も -4 に変換される(事前の判定をすり抜けた場合の保険)
    const w = world(); setVar(w, RANK_VAR, 9);
    const D0 = D(w), orig = D0.assignRingToPlayer;
    D0.assignRingToPlayer = () => ({ ok: false, reasons: [{ code: D0.InvalidReason.RING_TRANSFER_DURING_BATTLE }] });
    assert.equal(silenced(() => acquire(w, { ringId: "athena" })).code, -4); D0.assignRingToPlayer = orig;
    D0.assignRingToPlayer = () => ({ ok: false, reasons: [{ code: "SOMETHING" }] });
    assert.equal(silenced(() => acquire(w, { ringId: "athena" })).code, -9, "そのほかの Core の拒否は -9"); D0.assignRingToPlayer = orig;
});

// ---------------------------------------------------------------- 【7】スキルの固定レベル ----------------------------------------------------------------
test("【7】固定レベル: Lv1→Lv2→Lv3・max(いま, 目標)・下げない・繰り返しで増えない・上限を守る", () => {
    const w = world(); const id = "janus_reflection"; own(w);
    assert.equal(level(w, id), 1, "最初は Lv1");
    let r = raise(w, { targetLevel: 2 }); assert.deepEqual([r.ok, r.code, r.status, r.before, r.level], [true, 1, "raised", 1, 2]); assert.equal(level(w, id), 2);
    for (let i = 0; i < 3; i++) { r = raise(w, { targetLevel: 2 }); assert.deepEqual([r.ok, r.code, r.status, r.level], [true, 2, "unchanged", 2], "繰り返し " + i); assert.equal(level(w, id), 2); }
    r = raise(w, { targetLevel: "3" }); assert.deepEqual([r.code, r.level], [1, 3]); assert.equal(level(w, id), 3);
    r = raise(w, { targetLevel: 2 }); assert.deepEqual([r.code, r.status, r.level], [2, "unchanged", 3], "Lv3 を Lv2 へ下げない"); assert.equal(level(w, id), 3);
    r = raise(w, { targetLevel: 3 }); assert.equal(r.code, 2); assert.equal(level(w, id), 3);
    // いきなり Lv3
    assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 1); assert.equal(level(w, "athena_counter"), 3);
    // カードの最大レベルを守る(最大 2 のカードを Lv3 へ頼んでも Lv2 まで)
    const cards = D(w).definitions.cards;
    const skillId = plain(RL(w).getRingSkills("themis"))[0];
    const base = cards.get(skillId); cards.set(skillId, Object.freeze({ ...base, maxLevel: 2 }));
    r = raise(w, { skillId, targetLevel: 3 }); assert.deepEqual([r.code, r.level, r.cap, r.capped], [1, 2, 2, true]); assert.equal(level(w, skillId), 2);
    r = raise(w, { skillId, targetLevel: 3 }); assert.deepEqual([r.code, r.level], [2, 2], "上限に達したら済み");
    cards.set(skillId, base);
    // 25 スキルすべてで Lv2 → Lv3
    for (const sid of ALL_SKILLS(w)) { assert.equal(raise(w, { skillId: sid, targetLevel: 3 }).ok, true, sid); assert.equal(level(w, sid), 3, sid); }
});
test("【7b】固定レベルは、所持フラグ・所持枚数・ほかのスキル・指輪・デッキ・スキル枠を変えない(変わるのは、そのスキルのレベルだけ)", () => {
    const w = world(); setVar(w, RANK_VAR, 9); own(w, "apollo", "janus", "athena");
    D(w).setCardOwned("apollo_golden_volley", true); D(w).setCardLevel("apollo_golden_volley", 2);               // 別のスキルは別のレベルで持っている
    D(w).setCardOwned("janus_dual_gate", true);                                                                // 所持済みのスキル
    INV(w).grantCopies("janus_dual_gate", 2, { rewardId: "rr-test" });
    const before = plain(D(w).getPersistentData()), copiesBefore = JSON.stringify(plain(INV(w).state().copies)), loadoutBefore = JSON.stringify(plain(RL(w).getState())), ownersBefore = JSON.stringify(GOD.map(g => owner(w, g)));
    const owned = id => D(w).isCardOwned(id), ownedBefore = ALL_SKILLS(w).map(owned);
    for (const [sid, lv] of [["janus_reflection", 2], ["janus_dual_gate", 3], ["athena_aegis", 2]]) assert.equal(raise(w, { skillId: sid, targetLevel: lv }).code, 1, sid);
    const after = plain(D(w).getPersistentData());
    assert.deepEqual(ALL_SKILLS(w).map(owned), ownedBefore, "所持フラグは変わらない");
    for (const sid of ALL_SKILLS(w)) {
        const b = before.cardOwnership[sid], a = after.cardOwnership[sid], target = { janus_reflection: 2, janus_dual_gate: 3, athena_aegis: 2 }[sid];
        if (target) { assert.equal(a.level, target, sid); assert.equal(!!a.owned, !!(b && b.owned), sid + " の所持フラグ"); }
        else assert.deepEqual(a || null, b || null, sid + " ほかのスキルは変わらない");
    }
    assert.equal(after.cardOwnership.apollo_golden_volley.level, 2, "別のスキルは Lv2 のまま");
    assert.equal(JSON.stringify(plain(INV(w).state().copies)), copiesBefore, "所持枚数は変わらない");
    assert.equal(JSON.stringify(plain(RL(w).getState())), loadoutBefore, "指輪の装備・スキル枠・Q は変わらない");
    assert.equal(JSON.stringify(GOD.map(g => owner(w, g))), ownersBefore, "指輪の所有は変わらない");
    assert.deepEqual(after.deckDefinition, before.deckDefinition, "デッキは変わらない");
    assert.deepEqual(after.ultimateSelection, before.ultimateSelection); assert.deepEqual(after.ringOwnershipState, before.ringOwnershipState);
});
test("【7c】固定レベルの入力検証: 不正なスキルID(空・未知・Hermes の旧カード・SOUL・大文字)・不正な目標(未設定・0・1・4・小数・文字)は拒否し、何も変えない。戦闘中は -4", () => {
    const w = world(); own(w, "janus");
    for (const sid of ["", "zeus_bolt", "hermes_swift_movement", "hermes_sword_attack", "soul_slash", "JANUS_REFLECTION", "janus_", "ultimate", null, undefined]) {
        const r = silenced(() => plain(R(w).raiseSkillLevel({ skillId: sid, targetLevel: 2, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH })));
        assert.deepEqual([r.ok, r.code], [false, -2], "skillId=" + JSON.stringify(sid) + " " + JSON.stringify(r));
    }
    // 前後の空白は許す(ID の揺れ)。大文字は別のID扱いで拒否(上の JANUS_REFLECTION)
    assert.equal(raise(w, { skillId: " janus_reflection " }).code, 1);
    for (const lv of ["", 0, 1, 4, 5, -2, "2.5", "abc", null, undefined, NaN, "Lv2"]) {
        const w2 = world(); const b2 = snapshot(w2);
        const r = silenced(() => plain(R(w2).raiseSkillLevel({ skillId: "janus_reflection", targetLevel: lv })));
        assert.deepEqual([r.ok, r.code, r.status], [false, -2, "invalidLevel"], "targetLevel=" + String(lv));
        assert.equal(snapshot(w2), b2, "何も変わらない: " + String(lv));
    }
    assert.equal(level(w, "janus_dual_gate"), 1);
    // 戦闘中は拒否して、何も変えない
    const w3 = world(); own(w3, "janus"); w3.ctx.$gameParty.inBattle = () => true; const b3 = snapshot(w3);
    const rc = silenced(() => raise(w3, {}));
    assert.deepEqual([rc.ok, rc.code, rc.status], [false, -4, "inCombat"]); assert.equal(snapshot(w3), b3); assert.equal(sw(w3, DONE_SWITCH), false);
    delete w3.ctx.$gameParty.inBattle; assert.equal(raise(w3, {}).code, 1, "戦闘が終われば上げられる");
});

// ---------------------------------------------------------------- 【8】結果の書き出し ----------------------------------------------------------------
test("【8】結果の書き出し: 成功・済みは 1/2 とスイッチ ON・失敗は負のコードだけでスイッチを触らない(すでに ON のスイッチも消さない)・使えない番号の指定は拒否", () => {
    const w = world(); setVar(w, RANK_VAR, 1);
    assert.equal(getVar(w, RESULT_VAR), 0, "未実行は 0");
    silenced(() => acquire(w)); assert.equal(getVar(w, RESULT_VAR), -3); assert.equal(sw(w, DONE_SWITCH), false);
    w.ctx.$gameSwitches.setValue(DONE_SWITCH, true);                                                  // 別の経路で ON になっていたスイッチ
    silenced(() => acquire(w)); assert.equal(sw(w, DONE_SWITCH), true, "失敗はスイッチを OFF にしない");
    w.ctx.$gameSwitches.setValue(DONE_SWITCH, false); setVar(w, RANK_VAR, 3);
    acquire(w); assert.deepEqual([getVar(w, RESULT_VAR), sw(w, DONE_SWITCH)], [1, true]);
    w.ctx.$gameSwitches.setValue(DONE_SWITCH, false); acquire(w); assert.deepEqual([getVar(w, RESULT_VAR), sw(w, DONE_SWITCH)], [2, true], "済みでも完了にする");
    // 任意(書かない)
    const w2 = world(); setVar(w2, RANK_VAR, 3); const r = plain(R(w2).acquireRing({ ringId: "apollo", rankVariableId: RANK_VAR, requiredRank: 3 }));
    assert.equal(r.code, 1); assert.equal(getVar(w2, RESULT_VAR), 0); assert.equal(sw(w2, DONE_SWITCH), false);
    // 指定したのに使えない番号は拒否する(例外は出さない・何も変えない)。詳しくは【12】
    const w3 = world(); setVar(w3, RANK_VAR, 3); own(w3, "janus");
    const r3 = silenced(() => plain(R(w3).acquireRing({ ringId: "apollo", rankVariableId: RANK_VAR, requiredRank: 3, resultVariableId: 999, completedSwitchId: -1 }))); assert.equal(r3.code, -1); assert.equal(owner(w3, "apollo"), "unowned");
    assert.equal(silenced(() => plain(R(w3).raiseSkillLevel({ skillId: "janus_reflection", targetLevel: 2, resultVariableId: "x", completedSwitchId: 0 }))).code, -1); assert.equal(level(w3, "janus_reflection"), 1);
    assert.equal(getVar(w3, RANK_VAR), 3, "ランク変数は書き換わらない");
    // スキルのレベルの結果
    const w4 = world(); own(w4, "janus"); raise(w4, { targetLevel: 2 }); assert.deepEqual([getVar(w4, RESULT_VAR), sw(w4, DONE_SWITCH)], [1, true]);
    w4.ctx.$gameSwitches.setValue(DONE_SWITCH, false); raise(w4, { targetLevel: 2 }); assert.deepEqual([getVar(w4, RESULT_VAR), sw(w4, DONE_SWITCH)], [2, true]);
    w4.ctx.$gameSwitches.setValue(DONE_SWITCH, false); silenced(() => raise(w4, { skillId: "nope" })); assert.deepEqual([getVar(w4, RESULT_VAR), sw(w4, DONE_SWITCH)], [-2, false]);
});

// ---------------------------------------------------------------- 【9】保存・読込 ----------------------------------------------------------------
// セーブの system 部分(カードと指輪の状態)を JSON 化して作り直し、同じ世界へ読み込む(本物のセーブ/ロードと同じ経路: makeSaveContents → extractSaveContents)。
const saveSystem = (w, mutate) => { const contents = w.ctx.DataManager.makeSaveContents(); const sys = new w.ctx.Game_System(); const data = JSON.parse(JSON.stringify(plain(contents.system))); if (mutate) mutate(data); Object.assign(sys, data); return { ...contents, system: sys }; };
test("【9】保存・読込: _projectR の保存領域が増えない・指輪の所有とレベルが往復する・読込後の再実行は冪等・古いセーブ(この仕組みが無かった時期)もそのまま動く", () => {
    const w = world(); setVar(w, RANK_VAR, 3);
    const keysBefore = Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort();
    const fresh = saveSystem(w);                                                                         // まだ何も入手していない時点のセーブ(古いセーブの代わり)
    acquire(w, { ringId: "athena" }); acquire(w, { ringId: "janus" }); raise(w, { skillId: "athena_counter", targetLevel: 3 }); raise(w, { skillId: "janus_reflection", targetLevel: 2 });
    const keysAfter = Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort();
    assert.deepEqual(keysAfter, keysBefore, "新しい保存領域は作られない");
    const saved = saveSystem(w);
    const saveText = JSON.stringify(plain(saved.system));
    assert.ok(!/RingRewards|rankVariable|requiredRank/.test(saveText), "セーブに、このプラグインの記録は入らない");
    // 状態を壊してから、セーブを読み込む = セーブの内容へ戻る
    D(w).setRingUnowned("athena"); D(w).setRingUnowned("janus"); D(w).setCardLevel("athena_counter", 1); D(w).setCardLevel("janus_reflection", 1);
    assert.equal(owner(w, "athena"), "unowned");
    w.ctx.DataManager.extractSaveContents(saved);
    assert.equal(owner(w, "athena"), "player"); assert.equal(owner(w, "janus"), "player"); assert.equal(owner(w, "apollo"), "unowned");
    assert.equal(level(w, "athena_counter"), 3); assert.equal(level(w, "janus_reflection"), 2);
    const s2 = snapshot(w);
    assert.equal(acquire(w, { ringId: "athena" }).code, 2); assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 2);
    assert.equal(raise(w, { skillId: "janus_reflection", targetLevel: 2 }).code, 2); assert.equal(snapshot(w), s2, "読込後の再実行は何も変えない");
    assert.equal(acquire(w, { ringId: "themis" }).code, 1, "読込後も、まだ持っていない指輪は入手できる");
    // 古いセーブ: 入手前のセーブ、さらに「カード所持数」「指輪の編成」の領域も無い時期のセーブを読み込んでも、そのまま動く
    w.ctx.DataManager.extractSaveContents(fresh);
    assert.equal(owner(w, "athena"), "unowned"); assert.equal(level(w, "athena_counter"), 1);
    assert.equal(acquire(w, { ringId: "athena" }).code, 1); assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 1);
    const legacy = saveSystem(w, data => { delete data._projectRCardInventory; delete data._projectRRingLoadout; });
    w.ctx.DataManager.extractSaveContents(legacy);
    assert.equal(owner(w, "athena"), "player"); assert.equal(level(w, "athena_counter"), 3, "レベルは古いセーブの形式(cardOwnership)からそのまま読める");
    assert.equal(acquire(w, { ringId: "athena" }).code, 2); assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 2);
    assert.equal(raise(w, { skillId: "athena_spear_circle", targetLevel: 2 }).code, 1);
});

// ---------------------------------------------------------------- 【10】Hermes・実際のコマンド経路 ----------------------------------------------------------------
test("【10】Hermes の本編の入手(初期カード30枚)は変わらない・このプラグインの AcquireRing は hermes を扱わない・実際のプラグインコマンドの経路(引数は文字列)で動く", () => {
    const w = world(); setVar(w, RANK_VAR, 9);
    const r0 = silenced(() => acquire(w, { ringId: "hermes" })); assert.equal(r0.code, -2); assert.equal(owner(w, "hermes"), "unowned");
    const r1 = silenced(() => raise(w, { skillId: "hermes_sweep", targetLevel: 3 })); assert.equal(r1.code, -6, "Hermes の指輪を入手する前は、Hermes のスキルも上げられない"); assert.equal(level(w, "hermes_sweep"), 1);
    const HP = w.ctx.ProjectRHermesProductionDeck;
    const h = plain(HP.acquireRing("hermes", { source: "rr-test" })); assert.equal(h.ok, true); assert.equal(h.acquired, true); assert.equal(h.granted, true, "初回は初期カード30枚を付与");
    assert.equal(owner(w, "hermes"), "player"); assert.equal(plain(INV(w).state().copies.hermes_strength), 10);
    const snapH = JSON.stringify(plain(w.ctx.$gameSystem._projectRHermesProduction));
    acquire(w, { ringId: "apollo", requiredRank: 1 }); assert.equal(raise(w, { skillId: "hermes_sweep", targetLevel: 3 }).code, 1, "入手した後は上げられる"); assert.equal(level(w, "hermes_sweep"), 3);
    assert.equal(JSON.stringify(plain(w.ctx.$gameSystem._projectRHermesProduction)), snapH, "Hermes の付与記録は変わらない");
    assert.equal(plain(INV(w).state().copies.hermes_strength), 10, "Hermes の所持枚数は変わらない");
    // 実際のプラグインコマンド(イベントが呼ぶ形。引数は全部文字列)
    const w2 = world(); setVar(w2, 4, 5);
    callCommand(w2, "AcquireRing", { ringId: "themis", rankVariableId: "4", requiredRank: "5", resultVariableId: "6", completedSwitchId: "8" });
    assert.equal(owner(w2, "themis"), "player"); assert.equal(getVar(w2, 6), 1); assert.equal(sw(w2, 8), true);
    callCommand(w2, "RaiseSkillLevel", { skillId: "themis_" + plain(RL(w2).getRingSkills("themis"))[0].replace(/^themis_/, ""), targetLevel: "3", resultVariableId: "6", completedSwitchId: "9" });
    assert.equal(level(w2, plain(RL(w2).getRingSkills("themis"))[0]), 3); assert.equal(sw(w2, 9), true);
    silenced(() => callCommand(w2, "AcquireRing", { ringId: "", rankVariableId: "0", requiredRank: "0", resultVariableId: "6", completedSwitchId: "10" }));
    assert.equal(getVar(w2, 6), -2); assert.equal(sw(w2, 10), false, "未設定のコマンドは付与も完了もしない");
    silenced(() => callCommand(w2, "RaiseSkillLevel", { skillId: "", targetLevel: "", resultVariableId: "6", completedSwitchId: "11" })); assert.equal(getVar(w2, 6), -2); assert.equal(sw(w2, 11), false);
    // 実際のコマンド経路でも、指輪が無ければ -6(完了にしない)
    silenced(() => callCommand(w2, "RaiseSkillLevel", { skillId: "athena_counter", targetLevel: "3", resultVariableId: "6", completedSwitchId: "12" })); assert.equal(getVar(w2, 6), -6); assert.equal(sw(w2, 12), false); assert.equal(level(w2, "athena_counter"), 1);
    // MenuIntegration の既存コマンド(GrantRing / GrantCard)は従来どおり
    assert.ok(w2.ctx.PluginManager._commands["ProjectR_MenuIntegration:GrantRing"] && w2.ctx.PluginManager._commands["ProjectR_MenuIntegration:GrantCard"], "既存の入手コマンドは残っている");
});

// ---------------------------------------------------------------- 【11】指輪を持っているときだけ上げられる ----------------------------------------------------------------
const ringOf = (w, id) => D(w).definitions.card(id).ringId;
const setOwnerData = (w, ring, value) => { D(w).getPersistentData(); w.ctx.$gameSystem._projectRCardDeckData.ringOwnershipState[ring] = value; };   // 仲間へ渡した状態などを、保存データの所有欄だけで作る
// 拒否されること + 何も変わらないこと(レベル・所持フラグ・所持枚数・指輪・デッキ・編成)+ 完了スイッチは OFF でも ON でもそのまま
const rejected = (w, id, target, expectedOwner, label) => {
    const before = snapshot(w), lv = level(w, id), cardOwned = D(w).isCardOwned(id), copies = INV(w).getOwnedCopies(id);
    for (const preset of [false, true]) {
        w.ctx.$gameSwitches.setValue(DONE_SWITCH, preset); setVar(w, RESULT_VAR, 0);
        const r = silenced(() => raise(w, { skillId: id, targetLevel: target }));
        assert.deepEqual([r.ok, r.code, r.status, r.ringId, r.owner], [false, -6, "ringNotOwned", ringOf(w, id), expectedOwner], `${label} ${id} → Lv${target} ${JSON.stringify(r)}`);
        assert.equal(getVar(w, RESULT_VAR), -6, label); assert.equal(sw(w, DONE_SWITCH), preset, label + ": 完了スイッチは変えない");
    }
    w.ctx.$gameSwitches.setValue(DONE_SWITCH, false);
    assert.equal(level(w, id), lv, label + ": レベル"); assert.equal(D(w).isCardOwned(id), cardOwned, label + ": 所持フラグ"); assert.equal(INV(w).getOwnedCopies(id), copies, label + ": 所持枚数");
    assert.equal(snapshot(w), before, label + ": 保存される状態は何も変わらない");
};
test("【11a】未所持の指輪のスキルは上げられない(-6): 25スキル × Lv2/Lv3・カードを持っていても同じ・別の指輪を持っていても数えない", () => {
    const w = world();
    for (const id of ALL_SKILLS(w)) for (const target of [2, 3]) rejected(w, id, target, "unowned", "未所持");
    // カードの所持・枚数があっても、指輪が無ければ拒否
    D(w).setCardOwned("janus_dual_gate", true); INV(w).grantCopies("janus_dual_gate", 2, { rewardId: "rr-own" });
    rejected(w, "janus_dual_gate", 3, "unowned", "カードは所持・指輪は未所持");
    // 別の指輪を持っていても、その指輪のスキルだけが成功する
    own(w, "apollo");
    for (const id of ALL_SKILLS(w)) {
        if (ringOf(w, id) === "apollo") { assert.equal(raise(w, { skillId: id, targetLevel: 2 }).code, 1, id); assert.equal(level(w, id), 2, id); }
        else rejected(w, id, 2, "unowned", "Apollo だけを所持");
    }
});
test("【11b】仲間が持っている指輪のスキルも上げられない(-6): 目標がいまのレベル以下でも「済み」にしない・保存済みのレベルはそのまま", () => {
    const w = world();
    for (const ring of ["hermes", ...GOD]) {
        const [first, second] = plain(RL(w).getRingSkills(ring));
        D(w).setCardLevel(first, 3); D(w).setCardLevel(second, 2);                                      // すでに保存されているレベル(例: 以前の版で上げた、別の経路で設定した)
        setOwnerData(w, ring, "actor:2"); assert.equal(owner(w, ring), "actor:2");
        for (const id of plain(RL(w).getRingSkills(ring))) for (const target of [2, 3]) rejected(w, id, target, "actor:2", "仲間が所持");
        assert.equal(level(w, first), 3); assert.equal(level(w, second), 2); assert.equal(owner(w, ring), "actor:2", "取り上げない");
        // 未所持に戻っても、保存済みのレベルは変えず、拒否のまま
        setOwnerData(w, ring, "unowned"); rejected(w, first, 2, "unowned", "未所持(保存済み Lv3)"); rejected(w, second, 3, "unowned", "未所持(保存済み Lv2)");
        assert.equal(level(w, first), 3); assert.equal(level(w, second), 2);
    }
});
test("【11c】入手した後は成功する: 拒否 → AcquireRing → 成功・繰り返しは済み・下げない・指輪を手放すと拒否(レベルは保つ)・戻れば済み", () => {
    const w = world(); setVar(w, RANK_VAR, 3);
    rejected(w, "janus_reflection", 2, "unowned", "入手前");
    assert.equal(acquire(w, { ringId: "janus" }).code, 1);
    const step = (target, code, lv) => { w.ctx.$gameSwitches.setValue(DONE_SWITCH, false); const r = raise(w, { targetLevel: target }); assert.deepEqual([r.ok, r.code, r.level], [true, code, lv], `Lv${target}`); assert.equal(level(w, "janus_reflection"), lv); assert.equal(sw(w, DONE_SWITCH), true, "成功・済みは完了 ON"); };
    step(2, 1, 2); step(2, 2, 2); step(2, 2, 2); step(3, 1, 3); step(3, 2, 3); step(2, 2, 3);
    setOwnerData(w, "janus", "actor:2"); rejected(w, "janus_reflection", 3, "actor:2", "仲間へ渡した後"); assert.equal(level(w, "janus_reflection"), 3);
    setOwnerData(w, "janus", "player"); step(3, 2, 3);
    // 以前から保存されていたレベル(未所持の間は変えない)→ 入手後に、そこから引き上げる
    D(w).setCardLevel("themis_" + plain(RL(w).getRingSkills("themis"))[0].slice("themis_".length), 2);
    const th = plain(RL(w).getRingSkills("themis"))[0]; rejected(w, th, 3, "unowned", "保存済み Lv2・未所持"); assert.equal(level(w, th), 2);
    assert.equal(acquire(w, { ringId: "themis" }).code, 1); assert.equal(level(w, th), 2, "指輪の入手はレベルを変えない");
    const r = raise(w, { skillId: th, targetLevel: 3 }); assert.deepEqual([r.code, r.before, r.level], [1, 2, 3]);
});
test("【11d】判定の順: 入力の不正(-2)→ 指輪の所持(-6)→ 戦闘中(-4)→ 済み(2)/ 成功(1)。戦闘中の指輪の入手の拒否も変わらない", () => {
    const w = world();
    assert.equal(silenced(() => raise(w, { targetLevel: 4 })).code, -2, "不正な目標は、未所持でも -2");
    assert.equal(silenced(() => raise(w, { skillId: "zeus_bolt" })).code, -2);
    w.ctx.$gameParty.inBattle = () => true;
    rejected(w, "janus_reflection", 2, "unowned", "未所持 + 戦闘中は -6(戦闘が終わっても変わらない理由を先に示す)");
    setVar(w, RANK_VAR, 9); assert.equal(silenced(() => acquire(w, { ringId: "janus" })).code, -4, "戦闘中の指輪の入手は従来どおり -4");
    delete w.ctx.$gameParty.inBattle; own(w, "janus"); assert.equal(raise(w, { targetLevel: 2 }).code, 1);
    w.ctx.$gameParty.inBattle = () => true;
    const before = snapshot(w);
    assert.equal(silenced(() => raise(w, { targetLevel: 3 })).code, -4, "所持 + 戦闘中は -4");
    assert.equal(silenced(() => raise(w, { targetLevel: 2 })).code, -4, "戦闘中は、目標到達済みでも -4(従来どおり)");
    assert.equal(snapshot(w), before); delete w.ctx.$gameParty.inBattle; assert.equal(raise(w, { targetLevel: 2 }).code, 2);
});
test("【11e】保存・読込: 保存済みのレベルと所有者はそのまま往復し、読込後も所持の確認が効く・入手して上げたレベルも往復する・新しい保存領域は無い", () => {
    const w = world(); setVar(w, RANK_VAR, 3);
    D(w).setCardLevel("janus_reflection", 2);                                                          // 未所持の指輪の、保存済みのレベル
    D(w).setCardLevel("themis_" + plain(RL(w).getRingSkills("themis"))[0].slice("themis_".length), 3); setOwnerData(w, "themis", "actor:2");
    assert.equal(acquire(w, { ringId: "athena" }).code, 1); assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 1);
    const th = plain(RL(w).getRingSkills("themis"))[0];
    const keys = Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort();
    const saved = saveSystem(w), savedCards = JSON.stringify(plain(D(w).getPersistentData()));
    D(w).setCardLevel("janus_reflection", 1); D(w).setCardLevel(th, 1); D(w).setCardLevel("athena_counter", 1); setOwnerData(w, "themis", "player"); D(w).setRingUnowned("athena");
    w.ctx.DataManager.extractSaveContents(saved);
    assert.equal(JSON.stringify(plain(D(w).getPersistentData())), savedCards, "読み込んだだけでは、保存済みのレベルも所有者も書き換えない");
    assert.deepEqual(Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort(), keys, "保存領域は増えない");
    rejected(w, "janus_reflection", 3, "unowned", "読込後・未所持"); assert.equal(level(w, "janus_reflection"), 2);
    rejected(w, th, 3, "actor:2", "読込後・仲間が所持"); assert.equal(level(w, th), 3);
    assert.equal(raise(w, { skillId: "athena_counter", targetLevel: 3 }).code, 2, "読込後・所持している指輪は済み");
    setVar(w, RANK_VAR, 3); assert.equal(acquire(w, { ringId: "janus" }).code, 1); assert.equal(raise(w, { targetLevel: 3 }).code, 1);
    const saved2 = saveSystem(w); D(w).setCardLevel("janus_reflection", 1); w.ctx.DataManager.extractSaveContents(saved2);
    assert.equal(level(w, "janus_reflection"), 3); assert.equal(raise(w, { targetLevel: 3 }).code, 2);
});

// ---------------------------------------------------------------- 【12】設定の誤り ----------------------------------------------------------------
const allVars = w => JSON.stringify(plain(w.ctx.$gameVariables._data));
const allSwitches = w => JSON.stringify(plain(w.ctx.$gameSwitches._data));
const BAD_IDS = [999, 21, -1, "-1", "abc", "2.5", 2.5, "7a", "\\V[1]", true];                       // 指定したのに使えない番号(21 = データベースの数 = 範囲外)
const UNSET = [undefined, null, "", "  ", 0, "0"];                                                   // 指定なし(使わない)
test("【12a】使えない完了スイッチの指定は、付与・レベル上げの前に -1: 指輪もレベルも変えない・どのスイッチも変えない・結果の変数には -1・所持済み/仲間/戦闘中でも同じ", () => {
    const w = world(); setVar(w, RANK_VAR, 9); own(w, "janus"); w.ctx.$gameSwitches.setValue(DONE_SWITCH, true);
    setOwnerData(w, "themis", "actor:2");
    const before = snapshot(w), switches = allSwitches(w);
    for (const bad of BAD_IDS) {
        for (const ring of ["apollo", "janus", "themis"]) {                                           // 未所持 / 所持済み / 仲間が所持
            setVar(w, RESULT_VAR, 0);
            const r = silenced(() => acquire(w, { ringId: ring, completedSwitchId: bad }));
            assert.deepEqual([r.ok, r.code, r.status, !!r.abortEvent], [false, -1, "invalidCompletedSwitch", false], String(bad) + " " + ring);
            assert.equal(getVar(w, RESULT_VAR), -1, "結果の変数が使えるときは -1 を書く");
        }
        for (const id of ["janus_reflection", "apollo_eros_arrow"]) {                                 // 所持している指輪 / 持っていない指輪(-6 より先に -1)
            setVar(w, RESULT_VAR, 0);
            const r = silenced(() => raise(w, { skillId: id, targetLevel: 3, completedSwitchId: bad }));
            assert.deepEqual([r.ok, r.code, r.status], [false, -1, "invalidCompletedSwitch"], String(bad) + " " + id); assert.equal(getVar(w, RESULT_VAR), -1);
        }
        assert.equal(snapshot(w), before, "何も変わらない: " + String(bad)); assert.equal(allSwitches(w), switches, "スイッチは1つも変わらない: " + String(bad));
    }
    w.ctx.$gameParty.inBattle = () => true;
    assert.equal(silenced(() => raise(w, { completedSwitchId: 999 })).code, -1, "戦闘中でも、設定の誤りを先に示す");
    delete w.ctx.$gameParty.inBattle;
    assert.equal(acquire(w, { ringId: "apollo" }).code, 1, "正しい番号なら付与できる"); assert.equal(raise(w, { targetLevel: 3 }).code, 1);
});
test("【12b】使えない結果の変数の指定も、付与・レベル上げの前に -1: 変数は1つも書かない・完了スイッチは触らない(ON も OFF もそのまま)", () => {
    for (const preset of [false, true]) {
        const w = world(); setVar(w, RANK_VAR, 9); own(w, "janus"); w.ctx.$gameSwitches.setValue(DONE_SWITCH, preset);
        const before = snapshot(w), vars = allVars(w);
        for (const bad of BAD_IDS) {
            const a = silenced(() => acquire(w, { resultVariableId: bad }));
            assert.deepEqual([a.ok, a.code, a.status], [false, -1, "invalidResultVariable"], String(bad));
            const l = silenced(() => raise(w, { resultVariableId: bad }));
            assert.deepEqual([l.ok, l.code, l.status], [false, -1, "invalidResultVariable"], String(bad));
            assert.equal(snapshot(w), before, String(bad)); assert.equal(allVars(w), vars, "変数は書かない: " + String(bad)); assert.equal(sw(w, DONE_SWITCH), preset, "完了スイッチは触らない");
        }
        assert.equal(owner(w, "apollo"), "unowned"); assert.equal(level(w, "janus_reflection"), 1);
    }
});
test("【12c】指定なし(未指定・空・0)は従来どおり使える・データベースの最後の番号(20)は有効(境界)", () => {
    for (const none of UNSET) {
        const w = world(); setVar(w, RANK_VAR, 3);
        const vars = allVars(w), switches = allSwitches(w);
        const a = plain(R(w).acquireRing({ ringId: "janus", rankVariableId: RANK_VAR, requiredRank: 3, resultVariableId: none, completedSwitchId: none }));
        assert.equal(a.code, 1, String(none)); assert.equal(owner(w, "janus"), "player");
        const l = plain(R(w).raiseSkillLevel({ skillId: "janus_reflection", targetLevel: 2, resultVariableId: none, completedSwitchId: none }));
        assert.equal(l.code, 1, String(none)); assert.equal(level(w, "janus_reflection"), 2);
        assert.equal(allVars(w), vars, "何も書かない"); assert.equal(allSwitches(w), switches);
    }
    const w = world(); setVar(w, RANK_VAR, 3);
    const a = acquire(w, { resultVariableId: 20, completedSwitchId: 20 });
    assert.equal(a.code, 1); assert.equal(getVar(w, 20), 1); assert.equal(sw(w, 20), true);
});
// 実際のイベント: プラグインコマンド → 「変数 [branchVar] が 1 以上 2 以下(= 成功・済み)ならスイッチ9を ON」→ 後続の命令(スイッチ10を ON)
const runEvent = (w, command, args, branchVar) => {
    w.ctx.$gameSwitches.setValue(9, false); w.ctx.$gameSwitches.setValue(10, false);
    const it = new w.ctx.Game_Interpreter();
    it.setup([
        { code: 357, indent: 0, parameters: ["ProjectR_RingRewards", command, command, args] },
        { code: 111, indent: 0, parameters: [1, branchVar, 0, 1, 1] }, { code: 111, indent: 1, parameters: [1, branchVar, 0, 2, 2] },
        { code: 121, indent: 2, parameters: [9, 9, 0] }, { code: 0, indent: 2, parameters: [] }, { code: 412, indent: 1, parameters: [] },
        { code: 0, indent: 1, parameters: [] }, { code: 412, indent: 0, parameters: [] },
        { code: 121, indent: 0, parameters: [10, 10, 0] }, { code: 0, indent: 0, parameters: [] }
    ], 0);
    for (let i = 0; i < 40 && it.isRunning(); i++) it.update();
    return { successBranch: sw(w, 9), later: sw(w, 10), running: it.isRunning() };
};
const eventArgs = o => ({ ringId: "janus", rankVariableId: "3", requiredRank: "3", resultVariableId: "5", completedSwitchId: "7", ...o });
test("【12d】結果の変数 = ランク変数: 残ったランクの値が 1・2 でも成功の分岐は実行されない(イベントを中断)・付与しない・ランク変数と完了スイッチは変えない", () => {
    const situations = {
        "未所持": () => {}, "所持済み": w => own(w, "janus"), "仲間が所持": w => setOwnerData(w, "janus", "actor:2"), "戦闘中": w => { w.ctx.$gameParty.inBattle = () => true; }
    };
    for (const [label, prepare] of Object.entries(situations)) {
        const w = world(); prepare(w);
        for (const rank of [0, 1, 2, 3, 9]) for (const preset of [false, true]) {
            setVar(w, RANK_VAR, rank); w.ctx.$gameSwitches.setValue(DONE_SWITCH, preset);
            const before = snapshot(w), vars = allVars(w);
            const r = silenced(() => runEvent(w, "AcquireRing", eventArgs({ resultVariableId: "3" }), RANK_VAR));
            assert.deepEqual([r.successBranch, r.later, r.running], [false, false, false], `${label} ランク${rank}: 後ろの命令は実行されない ${JSON.stringify(r)}`);
            assert.equal(snapshot(w), before, label + ": 何も付与しない"); assert.equal(allVars(w), vars, label + ": ランク変数を含め、変数は1つも変わらない"); assert.equal(sw(w, DONE_SWITCH), preset, label + ": 完了スイッチは変えない");
        }
    }
    // ほかの引数が誤っていても、まずこの指定を拒否する(ランク変数を -2 などで上書きしない)
    const w = world(); setVar(w, RANK_VAR, 2);
    for (const over of [{ ringId: "" }, { ringId: "zeus" }, { requiredRank: "0" }, { completedSwitchId: "999" }]) {
        const r = silenced(() => acquire(w, { rankVariableId: RANK_VAR, resultVariableId: RANK_VAR, ...over }));
        assert.deepEqual([r.ok, r.code, r.status, r.abortEvent], [false, -1, "resultVariableIsRankVariable", true], JSON.stringify(over)); assert.equal(getVar(w, RANK_VAR), 2, JSON.stringify(over));
    }
    // 設定を直せば、そのまま成功する
    setVar(w, RANK_VAR, 3); const ok = runEvent(w, "AcquireRing", eventArgs(), RESULT_VAR);
    assert.deepEqual([ok.successBranch, ok.later, getVar(w, RESULT_VAR), owner(w, "janus")], [true, true, 1, "player"]);
});
test("【12e】中断するのは「結果の変数 = ランク変数」だけ: ほかの失敗・成功ではイベントは続き、条件分岐は正しく失敗/成功と読める", () => {
    const w = world(); setVar(w, RANK_VAR, 1);
    const cases = [
        ["ランク不足", "AcquireRing", eventArgs(), false], ["使えない完了スイッチ", "AcquireRing", eventArgs({ completedSwitchId: "999" }), false],
        ["使えない結果の変数", "AcquireRing", eventArgs({ resultVariableId: "999" }), false], ["必要ランク未設定", "AcquireRing", eventArgs({ requiredRank: "0" }), false],
        ["レベル上げ: 指輪が無い", "RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "2", resultVariableId: "5", completedSwitchId: "7" }, false],
        ["レベル上げ: 使えない完了スイッチ", "RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "2", resultVariableId: "5", completedSwitchId: "abc" }, false]
    ];
    for (const [label, command, args, success] of cases) {
        setVar(w, RESULT_VAR, 0);
        const r = silenced(() => runEvent(w, command, args, RESULT_VAR));
        assert.deepEqual([r.successBranch, r.later, r.running], [success, true, false], label + " " + JSON.stringify(r));
    }
    setVar(w, RANK_VAR, 3);
    assert.deepEqual(runEvent(w, "AcquireRing", eventArgs(), RESULT_VAR), { successBranch: true, later: true, running: false });
    assert.deepEqual(runEvent(w, "RaiseSkillLevel", { skillId: "janus_reflection", targetLevel: "2", resultVariableId: "5", completedSwitchId: "7" }, RESULT_VAR), { successBranch: true, later: true, running: false });
});

console.log(`\nall ${passed} passed`);
