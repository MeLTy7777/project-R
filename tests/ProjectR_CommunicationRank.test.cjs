"use strict";
// Stage 5-B2: ProjectR_CommunicationRank(通信ランクをゲーム変数で管理)。実エンジン(全plugin・本番の読み込み順)。
// 登録表は、世界の中の PluginManager.setParameters で差し替える(plugins.js は書き換えない)。キー(test_...)はテスト専用で、実在の人物名ではない。
//   【0】登録: plugins.js(登録表は空)・コマンド・保存領域を作らない・指輪やスキルに触れない
//   【1】登録表の検証: 空・読めない・キー/変数/上限の欠けや誤り・重複。誤りが1つでもあれば全体を停止し、何も変えない
//   【2】読み取り: 出力の変数・失敗は -1・ランクは変えない
//   【3】引き上げ: max(いま, 指定)・下げない・繰り返しで増えない・上限と下限・不正な入力
//   【4】保存されている値が不正なときは上書きしない
//   【5】重なりの防止(登録した全ランク変数)と、使えない出力先。重なりは、実際のイベントを中断する
//   【6】保存・読込: ゲーム変数だけで往復・新しい保存領域なし・以前のセーブもそのまま
//   【7】RingRewards との連携: 通信ランクの変数で指輪を入手・ランクを上げただけでは何も付与しない・スキルは専用のイベントだけ・結果の変数の重なり
//   【8】登録の誤り(fail closed): 4つのコマンドと API は、変数・スイッチ・指輪・スキルを何も変えず、残った成功の値でイベントを続けない・直せば元どおり
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const PLUGIN = "ProjectR_CommunicationRank";
const CR = w => w.ctx.ProjectRCommunicationRank, RR = w => w.ctx.ProjectRRingRewards, D = w => w.ctx.ProjectRCardDeck, RL = w => w.ctx.ProjectRRingLoadout;
const GOD = ["apollo", "janus", "themis", "athena"];
// テスト専用の登録: キー・変数・上限
const A = { Key: "test_a", VariableId: "3", MaxRank: "5" }, B = { Key: "test_b", VariableId: "4", MaxRank: "3" }, C = { Key: "test_npc", VariableId: "12", MaxRank: "10" };
const RESULT_VAR = 5, OUTPUT_VAR = 6, DONE_SWITCH = 7;
const tableText = rows => JSON.stringify(rows.map(row => (typeof row === "string" ? row : JSON.stringify(row))));
const configureRaw = (w, text) => w.ctx.PluginManager.setParameters(PLUGIN, { Characters: text });
const configure = (w, rows) => configureRaw(w, tableText(rows));
const world = (rows = [A, B, C]) => { const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める"); w.enterMap(4, 12, 25); w.frames(3); if (rows) configure(w, rows); return w; };
const setVar = (w, id, v) => w.ctx.$gameVariables.setValue(id, v);
const getVar = (w, id) => w.ctx.$gameVariables.value(id);
const sw = (w, id) => w.ctx.$gameSwitches.value(id);
const allVars = w => JSON.stringify(plain(w.ctx.$gameVariables._data));
const allSwitches = w => JSON.stringify(plain(w.ctx.$gameSwitches._data));
const cardState = w => JSON.stringify(plain({ deck: D(w).getPersistentData(), loadout: RL(w).getState() }));
const raise = (w, o = {}) => plain(CR(w).raiseRankToMinimum({ characterKey: "test_a", minimumRank: 2, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH, ...o }));
const read = (w, o = {}) => plain(CR(w).readRank({ characterKey: "test_a", outputVariableId: OUTPUT_VAR, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH, ...o }));
const silenced = fn => { const orig = console.warn; console.warn = () => {}; try { return fn(); } finally { console.warn = orig; } };
const callCommand = (w, plugin, name, args) => { const i = new w.ctx.Game_Interpreter(); i._eventId = 0; w.ctx.PluginManager.callCommand(i, plugin, name, args); };
// 実際のイベント: プラグインコマンド → 「変数 [branchVar] が 1 以上 2 以下(= 成功・済み)ならスイッチ9を ON」→ 後続の命令(スイッチ10を ON)
const runEvent = (w, plugin, command, args, branchVar) => {
    w.ctx.$gameSwitches.setValue(9, false); w.ctx.$gameSwitches.setValue(10, false);
    const it = new w.ctx.Game_Interpreter();
    it.setup([
        { code: 357, indent: 0, parameters: [plugin, command, command, args] },
        { code: 111, indent: 0, parameters: [1, branchVar, 0, 1, 1] }, { code: 111, indent: 1, parameters: [1, branchVar, 0, 2, 2] },
        { code: 121, indent: 2, parameters: [9, 9, 0] }, { code: 0, indent: 2, parameters: [] }, { code: 412, indent: 1, parameters: [] },
        { code: 0, indent: 1, parameters: [] }, { code: 412, indent: 0, parameters: [] },
        { code: 121, indent: 0, parameters: [10, 10, 0] }, { code: 0, indent: 0, parameters: [] }
    ], 0);
    for (let i = 0; i < 40 && it.isRunning(); i++) it.update();
    return { successBranch: sw(w, 9), later: sw(w, 10), running: it.isRunning() };
};
const raiseArgs = o => ({ characterKey: "test_a", minimumRank: "2", resultVariableId: "5", completedSwitchId: "7", ...o });
const readArgs = o => ({ characterKey: "test_a", outputVariableId: "6", resultVariableId: "5", completedSwitchId: "7", ...o });

// ---------------------------------------------------------------- 【0】登録 ----------------------------------------------------------------
test("【0】登録: plugins.js に1行(登録表は空 = 人物も値も決めていない)・コマンド2つ・API・コードは指輪/スキル/保存領域に触れない", () => {
    const w = world(null);
    const text = fs.readFileSync(path.join(__dirname, "..", "js", "plugins.js"), "utf8");
    assert.equal((text.match(/"name":"ProjectR_CommunicationRank"/g) || []).length, 1);
    const line = text.split(/\r?\n/).find(l => l.includes('"name":"ProjectR_CommunicationRank"'));
    assert.ok(line.includes('"parameters":{"Characters":"[]"}'), "出荷する登録表は空");
    assert.ok(text.indexOf('"name":"ProjectR_CommunicationRank"') < text.indexOf('"name":"ProjectR_RingRewards"'));
    assert.deepEqual(plain(CR(w).entries()), []); assert.deepEqual(plain(CR(w).rankVariableIds()), []); assert.deepEqual(plain(CR(w).problems()), []);
    assert.deepEqual(Object.keys(w.ctx.PluginManager._commands).filter(k => k.startsWith(PLUGIN + ":")).sort(), [PLUGIN + ":RaiseRankToMinimum", PLUGIN + ":ReadRank"]);
    assert.deepEqual(plain(CR(w).RESULT), { SUCCESS: 1, ALREADY: 2, NOT_CONFIGURED: -1, INVALID: -2, BAD_RANK_VALUE: -7, FAILED: -9 });
    const src = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", PLUGIN + ".js"), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/_project[A-Za-z]*/.test(code), "独自の保存キーが無い");
    assert.ok(!/ProjectRCardDeck|ProjectRRingRewards|ProjectRRingLoadout|assignRing|setCardLevel|acquireRing|raiseSkillLevel/.test(code), "指輪・スキルには触れない(自動で付与しない)");
    assert.ok(!/\beval\b|new Function|require\(/.test(code));
    // 出荷の状態(登録が空)では、どのキーも使えない
    setVar(w, 3, 4); const before = allVars(w);
    const r = silenced(() => raise(w, { resultVariableId: 0, completedSwitchId: 0 })); assert.deepEqual([r.ok, r.code, r.status], [false, -1, "unknownCharacter"]);
    assert.equal(allVars(w), before);
});

// ---------------------------------------------------------------- 【1】登録表の検証 ----------------------------------------------------------------
test("【1】登録表: 正しい登録は使える・読めない表や欠け/誤りの登録は理由つきで、全体を停止する(何も書かない)・空の登録は誤りではない", () => {
    const w = world();
    assert.deepEqual(plain(CR(w).entries()).map(e => [e.key, e.variableId, e.maxRank, e.valid]), [["test_a", 3, 5, true], ["test_b", 4, 3, true], ["test_npc", 12, 10, true]]);
    assert.deepEqual(plain(CR(w).rankVariableIds()), [3, 4, 12]); assert.deepEqual(plain(CR(w).problems()), []);
    // 停止している間は、結果の変数・出力の変数・スイッチ・ランクのどれも書かない(残っている値のまま)
    const stopped = (label, over = {}) => {
        setVar(w, RESULT_VAR, 1); setVar(w, OUTPUT_VAR, 2);
        const vars = allVars(w), switches = allSwitches(w);
        for (const r of [silenced(() => raise(w, { minimumRank: 1, ...over })), silenced(() => read(w, over))]) assert.deepEqual([r.ok, r.code, r.status, r.abortEvent, r.configurationInvalid], [false, -1, "rankConfigurationInvalid", true, true], label);
        assert.equal(allVars(w), vars, label); assert.equal(allSwitches(w), switches, label);
    };
    const bad = [
        ["キーが空", { Key: "  ", VariableId: "3", MaxRank: "5" }, "missingKey"], ["変数が未設定", { Key: "k", VariableId: "0", MaxRank: "5" }, "invalidVariableId"],
        ["変数が範囲外", { Key: "k", VariableId: "21", MaxRank: "5" }, "invalidVariableId"], ["変数が負", { Key: "k", VariableId: "-3", MaxRank: "5" }, "invalidVariableId"],
        ["変数が文字", { Key: "k", VariableId: "abc", MaxRank: "5" }, "invalidVariableId"], ["上限が未設定", { Key: "k", VariableId: "3", MaxRank: "0" }, "invalidMaxRank"],
        ["上限が空", { Key: "k", VariableId: "3", MaxRank: "" }, "invalidMaxRank"], ["上限が負", { Key: "k", VariableId: "3", MaxRank: "-1" }, "invalidMaxRank"],
        ["上限が小数", { Key: "k", VariableId: "3", MaxRank: "2.5" }, "invalidMaxRank"], ["項目が無い", { Key: "k" }, "invalidVariableId"],
        ["キーが文字列でない", { Key: { name: "k" }, VariableId: "3", MaxRank: "5" }, "missingKey"]
    ];
    for (const [label, row, reason] of bad) {
        configure(w, [row, B]);                                                                         // 正しい登録(test_b)が一緒でも、全体を停止する
        const e = plain(CR(w).entries())[0];
        assert.equal(e.valid, false, label); assert.ok(e.reasons.includes(reason), label + " " + JSON.stringify(e.reasons)); assert.equal(plain(CR(w).problems()).length, 1);
        stopped(label, { characterKey: "test_b" });
        assert.equal(silenced(() => plain(CR(w).getRank("test_b"))).status, "rankConfigurationInvalid", label);
    }
    // 重複: 同じキー / 同じ変数は、重なった登録を両方とも誤りにする。無関係の正しい登録も止まる
    configure(w, [A, { Key: "test_a", VariableId: "8", MaxRank: "2" }, B]);
    assert.deepEqual(plain(CR(w).entries()).map(e => e.valid), [false, false, true]); assert.deepEqual(plain(CR(w).problems()).map(p => p.reasons), [["duplicateKey"], ["duplicateKey"]]);
    stopped("キーの重複"); stopped("キーの重複(無関係のキー)", { characterKey: "test_b" });
    configure(w, [A, { Key: "test_other", VariableId: "3", MaxRank: "2" }, C]);
    assert.deepEqual(plain(CR(w).entries()).map(e => e.valid), [false, false, true]); assert.deepEqual(plain(CR(w).problems()).map(p => p.reasons), [["duplicateVariableId"], ["duplicateVariableId"]]);
    stopped("変数の重複", { characterKey: "test_npc" });
    // 読めない表(JSON でない・配列でない・設定が文字列でない)・読めない行(壊れた JSON・配列・null・数値・空の行)
    for (const text of ["abc", "{}", "5", "\"x\"", "null", "[", tableText([A]).slice(0, -1)]) { configureRaw(w, text); assert.equal(plain(CR(w).entries()).length, 0, text); assert.deepEqual(plain(CR(w).problems())[0].reasons, ["tableNotReadable"], text); stopped(text); }
    for (const value of [null, 0, false, [], [""], [JSON.stringify(A)], { 0: A }]) { configureRaw(w, value); assert.deepEqual(plain(CR(w).problems())[0].reasons, ["tableNotReadable"], "文字列でない: " + JSON.stringify(value)); stopped("文字列でない: " + JSON.stringify(value)); }
    for (const item of ["{broken", "[1]", "null", "5", "", "\"x\""]) {
        configure(w, [item, B]);
        assert.deepEqual(plain(CR(w).entries()).map(e => [e.valid, e.reasons[0] || ""]), [[false, "unreadableEntry"], [true, ""]], item);
        stopped("読めない行 " + JSON.stringify(item), { characterKey: "test_b" });
    }
    // 空の登録は誤りではない(従来どおり: 未登録のキーとして -1。結果の変数に書き、イベントは中断しない)
    for (const text of ["[]", " [] ", "", undefined]) {
        if (text === undefined) w.ctx.PluginManager.setParameters(PLUGIN, {}); else configureRaw(w, text);
        assert.deepEqual([plain(CR(w).entries()), plain(CR(w).problems())], [[], []], String(text));
        setVar(w, RESULT_VAR, 0); const r = silenced(() => raise(w)); assert.deepEqual([r.code, r.status, !!r.abortEvent], [-1, "unknownCharacter", false], String(text)); assert.equal(getVar(w, RESULT_VAR), -1);
    }
    // キーは大文字小文字を区別し、前後の空白は無視する。日本語のキーも使える
    configure(w, [{ Key: " test_a ", VariableId: "3", MaxRank: "5" }, { Key: "テスト用キー", VariableId: "4", MaxRank: "2" }]);
    assert.equal(raise(w, { characterKey: "test_a  ", minimumRank: 1 }).code, 1); assert.equal(silenced(() => raise(w, { characterKey: "TEST_A" })).status, "unknownCharacter");
    assert.equal(raise(w, { characterKey: "テスト用キー", minimumRank: 2 }).code, 1);
});

// ---------------------------------------------------------------- 【2】読み取り ----------------------------------------------------------------
test("【2】読み取り: 出力の変数にランクが入る(最初は 0)・ランクは変えない・失敗は出力に -1(前の値を残さない)・コマンドは出力の変数が必須", () => {
    const w = world();
    let r = read(w); assert.deepEqual([r.ok, r.code, r.status, r.rank, r.maxRank], [true, 1, "read", 0, 5]);
    assert.deepEqual([getVar(w, OUTPUT_VAR), getVar(w, RESULT_VAR), sw(w, DONE_SWITCH), getVar(w, 3)], [0, 1, true, 0]);
    setVar(w, 3, 4); setVar(w, 4, 2);
    assert.equal(read(w).rank, 4); assert.equal(getVar(w, OUTPUT_VAR), 4);
    assert.equal(read(w, { characterKey: "test_b" }).rank, 2); assert.equal(getVar(w, OUTPUT_VAR), 2);
    assert.deepEqual([getVar(w, 3), getVar(w, 4)], [4, 2], "読み取りはランクを変えない");
    // 失敗: 出力には -1(前に読んだ別のキャラクターの値が残らない)
    for (const [label, over, code, status] of [["未登録のキー", { characterKey: "nobody" }, -1, "unknownCharacter"], ["キーが空", { characterKey: "" }, -2, "missingCharacterKey"], ["使えない完了スイッチ", { completedSwitchId: 999 }, -1, "invalidCompletedSwitch"], ["使えない結果の変数", { resultVariableId: 999 }, -1, "invalidResultVariable"]]) {
        setVar(w, OUTPUT_VAR, 4); w.ctx.$gameSwitches.setValue(DONE_SWITCH, false);
        const f = silenced(() => read(w, over)); assert.deepEqual([f.ok, f.code, f.status], [false, code, status], label);
        assert.equal(getVar(w, OUTPUT_VAR), -1, label + ": 出力は -1"); assert.equal(sw(w, DONE_SWITCH), false, label);
    }
    // 出力の指定の誤り
    const vars = allVars(w);
    assert.equal(silenced(() => read(w, { outputVariableId: 999, resultVariableId: 0 })).status, "invalidOutputVariable"); assert.equal(allVars(w), vars);
    const same = silenced(() => read(w, { outputVariableId: 5, resultVariableId: 5 })); assert.deepEqual([same.code, same.status, !!same.abortEvent], [-1, "outputVariableIsResultVariable", false]); assert.equal(getVar(w, 5), -1);
    // API は出力の変数なしでも読める。コマンドは必須
    const api = plain(CR(w).readRank({ characterKey: "test_a" })); assert.deepEqual([api.code, api.rank], [1, 4]);
    assert.deepEqual([plain(CR(w).getRank("test_a")).rank, plain(CR(w).getRank("nobody")).code], [4, -1]);
    setVar(w, 5, 0); silenced(() => callCommand(w, PLUGIN, "ReadRank", readArgs({ outputVariableId: "0" }))); assert.equal(getVar(w, 5), -1, "コマンドで出力が未指定なら -1");
    callCommand(w, PLUGIN, "ReadRank", readArgs()); assert.deepEqual([getVar(w, 5), getVar(w, 6)], [1, 4]);
});

// ---------------------------------------------------------------- 【3】引き上げ ----------------------------------------------------------------
test("【3】引き上げ: max(いま, 指定)・下げない・繰り返しで増えない・キャラクターごとの上限まで・ほかの変数は変えない", () => {
    const w = world();
    const step = (min, code, rank) => { w.ctx.$gameSwitches.setValue(DONE_SWITCH, false); const r = raise(w, { minimumRank: min }); assert.deepEqual([r.ok, r.code, r.rank], [true, code, rank], "min " + min); assert.deepEqual([getVar(w, 3), getVar(w, RESULT_VAR), sw(w, DONE_SWITCH)], [rank, code, true]); };
    step(2, 1, 2); step(2, 2, 2); step(2, 2, 2); step(1, 2, 2); step("3", 1, 3); step(2, 2, 3); step(5, 1, 5); step(5, 2, 5); step(1, 2, 5);
    assert.deepEqual([getVar(w, 4), getVar(w, 12)], [0, 0], "ほかのキャラクターは変わらない");
    assert.equal(raise(w, { characterKey: "test_b", minimumRank: 3 }).code, 1); assert.equal(raise(w, { characterKey: "test_npc", minimumRank: 10 }).code, 1);
    assert.deepEqual([getVar(w, 3), getVar(w, 4), getVar(w, 12)], [5, 3, 10]);
    // 上限より大きい値が入っている(直接の書き換えや、後で上限を下げた)ときも下げない
    setVar(w, 4, 8); const r = raise(w, { characterKey: "test_b", minimumRank: 3 }); assert.deepEqual([r.code, r.rank], [2, 8]); assert.equal(getVar(w, 4), 8);
    // 上限の設定を変えると、受け付ける範囲も変わる
    const w2 = world([{ Key: "test_a", VariableId: "3", MaxRank: "2" }]);
    assert.equal(silenced(() => raise(w2, { minimumRank: 3 })).code, -2); configure(w2, [{ Key: "test_a", VariableId: "3", MaxRank: "30" }]);
    assert.equal(raise(w2, { minimumRank: 30 }).code, 1); assert.equal(getVar(w2, 3), 30);
});
test("【3b】引き上げの不正な指定: 未設定(0・空)は -1・上限超え/負/小数/文字は -2・何も変えない", () => {
    const w = world(); setVar(w, 3, 1);
    for (const [min, code, status] of [[undefined, -1, "minimumRankNotConfigured"], [0, -1, "minimumRankNotConfigured"], ["0", -1, "minimumRankNotConfigured"], ["", -1, "minimumRankNotConfigured"], [6, -2, "invalidMinimumRank"], [99, -2, "invalidMinimumRank"], [-1, -2, "invalidMinimumRank"], [2.5, -2, "invalidMinimumRank"], ["abc", -2, "invalidMinimumRank"], ["\\V[1]", -2, "invalidMinimumRank"], [true, -2, "invalidMinimumRank"]]) {
        w.ctx.$gameSwitches.setValue(DONE_SWITCH, false);
        const r = silenced(() => raise(w, { minimumRank: min }));
        assert.deepEqual([r.ok, r.code, r.status], [false, code, status], "min=" + String(min));
        assert.equal(getVar(w, 3), 1); assert.equal(getVar(w, RESULT_VAR), code); assert.equal(sw(w, DONE_SWITCH), false);
    }
    assert.equal(silenced(() => raise(w, { characterKey: "" })).code, -2); assert.equal(silenced(() => raise(w, { characterKey: undefined })).code, -2);
});

// ---------------------------------------------------------------- 【4】不正な保存値 ----------------------------------------------------------------
test("【4】ランクの変数に 0 以上の整数でない値があるときは -7(読み取りも引き上げも上書きしない)・null や未使用は 0", () => {
    const w = world();
    for (const bad of [-1, "3", "abc", true, 1.5, [2], { r: 1 }, NaN]) {
        w.ctx.$gameVariables._data[3] = bad;
        if (!w.ctx.$gameVariables.value(3)) continue;                                                  // NaN は MZ の value() で 0 になる
        const r = silenced(() => raise(w, { minimumRank: 2 }));
        assert.deepEqual([r.ok, r.code, r.status], [false, -7, "invalidStoredRank"], String(bad)); assert.strictEqual(w.ctx.$gameVariables._data[3], bad, "上書きしない: " + String(bad));
        const f = silenced(() => read(w)); assert.equal(f.code, -7); assert.equal(getVar(w, OUTPUT_VAR), -1);
    }
    for (const empty of [undefined, null, 0, ""]) { w.ctx.$gameVariables._data[3] = empty; assert.equal(read(w).rank, 0, String(empty)); }
    assert.equal(raise(w, { minimumRank: 1 }).code, 1); assert.equal(getVar(w, 3), 1);
});

// ---------------------------------------------------------------- 【5】重なりの防止 ----------------------------------------------------------------
test("【5a】結果の変数が、登録したどのランク変数でも -1: 何も変えない・完了スイッチも触らない(読み取り・引き上げ)", () => {
    const w = world([A, B, C, { Key: "test_d", VariableId: "15", MaxRank: "9" }]);
    setVar(w, 3, 1); setVar(w, 4, 2); setVar(w, 12, 1); setVar(w, 15, 2);
    for (const rankVar of [3, 4, 12, 15]) for (const preset of [false, true]) {
        w.ctx.$gameSwitches.setValue(DONE_SWITCH, preset); const vars = allVars(w);
        const up = silenced(() => raise(w, { minimumRank: 3, resultVariableId: rankVar }));
        assert.deepEqual([up.ok, up.code, up.status, up.abortEvent], [false, -1, "resultVariableIsRankVariable", true], "raise " + rankVar); assert.equal(allVars(w), vars);
        const rd = silenced(() => read(w, { resultVariableId: rankVar, outputVariableId: 0 }));
        assert.deepEqual([rd.code, rd.status, rd.abortEvent], [-1, "resultVariableIsRankVariable", true], "read " + rankVar); assert.equal(allVars(w), vars);
        const out = silenced(() => read(w, { outputVariableId: rankVar, resultVariableId: 0 }));
        assert.deepEqual([out.code, out.status, out.abortEvent], [-1, "outputVariableIsRankVariable", true], "output " + rankVar); assert.equal(allVars(w), vars, "ランク変数には、読み取り先としても書かない");
        assert.equal(sw(w, DONE_SWITCH), preset);
    }
});
test("【5b】重なりは実際のイベントを中断する(残ったランク 1・2 を成功と読まない)・ほかの失敗では中断しない", () => {
    const w = world();
    for (const rank of [1, 2]) for (const [label, command, args, branchVar] of [
        ["引き上げ: 結果 = 自分のランク変数", "RaiseRankToMinimum", raiseArgs({ resultVariableId: "3", minimumRank: "5" }), 3],
        ["引き上げ: 結果 = 別のキャラクターのランク変数", "RaiseRankToMinimum", raiseArgs({ resultVariableId: "4" }), 4],
        ["読み取り: 結果 = ランク変数", "ReadRank", readArgs({ resultVariableId: "4" }), 4],
        ["読み取り: 出力 = ランク変数", "ReadRank", readArgs({ outputVariableId: "4", resultVariableId: "0" }), 4]
    ]) {
        setVar(w, 3, rank); setVar(w, 4, rank); setVar(w, OUTPUT_VAR, 2);
        const r = silenced(() => runEvent(w, PLUGIN, command, args, branchVar));
        assert.deepEqual([r.successBranch, r.later, r.running], [false, false, false], `${label} ランク${rank} ${JSON.stringify(r)}`); assert.deepEqual([getVar(w, 3), getVar(w, 4), getVar(w, 12)], [rank, rank, 0], label + ": ランク変数は変わらない");
        // 読み取りの拒否で出力先がランク用でないときは -1(前に読んだ値を残さない)。引き上げは出力先を持たない
        assert.equal(getVar(w, OUTPUT_VAR), label === "読み取り: 結果 = ランク変数" ? -1 : 2, label + ": 出力の変数");
    }
    setVar(w, 3, 0);
    for (const [label, command, args] of [["未登録のキー", "RaiseRankToMinimum", raiseArgs({ characterKey: "nobody" })], ["上限超え", "RaiseRankToMinimum", raiseArgs({ minimumRank: "9" })], ["使えないスイッチ", "ReadRank", readArgs({ completedSwitchId: "999" })]]) {
        const r = silenced(() => runEvent(w, PLUGIN, command, args, RESULT_VAR)); assert.deepEqual([r.successBranch, r.later], [false, true], label);
    }
    assert.deepEqual(runEvent(w, PLUGIN, "RaiseRankToMinimum", raiseArgs(), RESULT_VAR), { successBranch: true, later: true, running: false });
    assert.deepEqual(runEvent(w, PLUGIN, "RaiseRankToMinimum", raiseArgs(), RESULT_VAR), { successBranch: true, later: true, running: false }, "重複したイベント(済み)も成功として続く");
    assert.equal(getVar(w, 3), 2);
});
test("【5c】使えない番号の出力先は、ランクを変える前に拒否する・指定なし(未指定・空・0)は使える", () => {
    const w = world();
    for (const bad of [999, 21, -1, "abc", "2.5"]) {
        const vars = allVars(w), switches = allSwitches(w);
        const a = silenced(() => raise(w, { completedSwitchId: bad, resultVariableId: 0 })); assert.deepEqual([a.code, a.status], [-1, "invalidCompletedSwitch"], String(bad));
        const b = silenced(() => raise(w, { resultVariableId: bad })); assert.deepEqual([b.code, b.status], [-1, "invalidResultVariable"], String(bad));
        assert.equal(getVar(w, 3), 0, "ランクは上がらない"); assert.equal(allVars(w), vars); assert.equal(allSwitches(w), switches);
    }
    for (const none of [undefined, null, "", 0, "0"]) {
        const w2 = world(); const switches = allSwitches(w2);
        assert.equal(plain(CR(w2).raiseRankToMinimum({ characterKey: "test_a", minimumRank: 1, resultVariableId: none, completedSwitchId: none })).code, 1, String(none));
        assert.equal(getVar(w2, 3), 1); assert.equal(getVar(w2, RESULT_VAR), 0, "結果は書かない"); assert.equal(allSwitches(w2), switches);
    }
});

// ---------------------------------------------------------------- 【6】保存・読込 ----------------------------------------------------------------
// セーブの system と variables を JSON 化して作り直し、同じ世界へ読み込む(makeSaveContents → extractSaveContents)
const saveContents = w => {
    const c = w.ctx.DataManager.makeSaveContents();
    const system = new w.ctx.Game_System(); Object.assign(system, JSON.parse(JSON.stringify(plain(c.system))));
    const variables = new w.ctx.Game_Variables(); variables._data = JSON.parse(JSON.stringify(plain(c.variables._data)));
    return { ...c, system, variables };
};
test("【6】保存・読込: ランクはゲーム変数としてそのまま往復・新しい保存領域は無い・読込後の再実行は冪等・以前のセーブ(ランクが 0)もそのまま使える", () => {
    const w = world();
    const keys = Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort(), contentKeys = Object.keys(w.ctx.DataManager.makeSaveContents()).sort();
    const old = saveContents(w);                                                                        // ランクをまだ使っていない時点のセーブ
    raise(w, { minimumRank: 4 }); raise(w, { characterKey: "test_npc", minimumRank: 7 });
    assert.deepEqual(Object.keys(w.ctx.$gameSystem).filter(k => /^_projectR/.test(k)).sort(), keys, "_projectR の保存領域は増えない");
    assert.deepEqual(Object.keys(w.ctx.DataManager.makeSaveContents()).sort(), contentKeys, "セーブの項目は増えない");
    const saved = saveContents(w);
    assert.ok(!/CommunicationRank|test_a|test_npc|MaxRank/.test(JSON.stringify(plain({ s: saved.system, v: saved.variables._data }))), "登録表はセーブに入らない");
    setVar(w, 3, 0); setVar(w, 12, 0);
    w.ctx.DataManager.extractSaveContents(saved);
    assert.deepEqual([getVar(w, 3), getVar(w, 12)], [4, 7]); assert.equal(plain(CR(w).getRank("test_a")).rank, 4);
    assert.equal(raise(w, { minimumRank: 4 }).code, 2); assert.equal(raise(w, { minimumRank: 2 }).code, 2); assert.equal(getVar(w, 3), 4);
    w.ctx.DataManager.extractSaveContents(old);
    assert.equal(plain(CR(w).getRank("test_a")).rank, 0, "以前のセーブは、ランク 0 から"); assert.equal(raise(w, { minimumRank: 2 }).code, 1); assert.equal(getVar(w, 3), 2);
    // 以前から変数を直接ランクとして使っていたセーブも、その値のまま読める
    setVar(w, 4, 3); const direct = saveContents(w); setVar(w, 4, 0); w.ctx.DataManager.extractSaveContents(direct); assert.equal(plain(CR(w).getRank("test_b")).rank, 3);
});

// ---------------------------------------------------------------- 【7】RingRewards との連携 ----------------------------------------------------------------
const ownerOf = w => ["hermes", ...GOD].map(r => D(w).getRingOwner(r));
const acquire = (w, o) => plain(RR(w).acquireRing({ ringId: "janus", rankVariableId: 3, requiredRank: 3, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH, ...o }));
test("【7a】ランクを上げただけでは何も付与しない・指輪は決まったイベント(AcquireRing)だけ・スキルは専用のイベント(RaiseSkillLevel)だけ", () => {
    const w = world(); const before = cardState(w);
    for (const [key, max] of [["test_a", 5], ["test_b", 3], ["test_npc", 10]]) for (let n = 1; n <= max; n++) { assert.equal(raise(w, { characterKey: key, minimumRank: n }).code, 1); }
    for (let i = 0; i < 5; i++) w.frames(1);
    assert.equal(cardState(w), before, "指輪の所有・装備・スキル枠・Q・カードのレベルは、どれも変わらない");
    assert.deepEqual(ownerOf(w), ["unowned", "unowned", "unowned", "unowned", "unowned"]);
    // イベントが呼んだ指輪だけが付与される(必要ランクは、そのキャラクターの変数で判定)
    assert.equal(acquire(w).code, 1); assert.deepEqual(ownerOf(w), ["unowned", "unowned", "player", "unowned", "unowned"]);
    const levels = JSON.stringify(plain(D(w).getPersistentData().cardOwnership));
    raise(w, { characterKey: "test_a", minimumRank: 5 }); assert.equal(JSON.stringify(plain(D(w).getPersistentData().cardOwnership)), levels, "ランクではスキルは上がらない");
    assert.equal(plain(RR(w).raiseSkillLevel({ skillId: "janus_reflection", targetLevel: 2 })).code, 1);
    // ランク不足のキャラクターの指輪は付与されない。Hermes は RingRewards の対象外(本編の入手のまま)
    const w2 = world(); raise(w2, { characterKey: "test_b", minimumRank: 2 });
    assert.equal(silenced(() => acquire(w2, { ringId: "athena", rankVariableId: 4 })).code, -3);
    assert.equal(silenced(() => acquire(w2, { ringId: "hermes", rankVariableId: 4, requiredRank: 1 })).code, -2);
    assert.equal(plain(w2.ctx.ProjectRHermesProductionDeck.acquireRing("hermes", { source: "cr-test" })).granted, true);
});
test("【7b】RingRewards の結果の変数が、登録したどのランク変数でも -1(指輪の入手・レベル上げ): 付与もレベル上げもせず、ランクを守り、イベントを中断する", () => {
    const w = world(); D(w).assignRingToPlayer("apollo"); setVar(w, 3, 5);
    for (const rankVar of [3, 4, 12]) for (const rank of [1, 2]) {
        setVar(w, rankVar === 3 ? 4 : rankVar, rank); const vars = allVars(w), state = cardState(w);
        w.ctx.$gameSwitches.setValue(DONE_SWITCH, false);
        const a = silenced(() => acquire(w, { resultVariableId: rankVar }));
        assert.deepEqual([a.code, a.status, a.abortEvent], [-1, "resultVariableIsRankVariable", true], "acquire " + rankVar);
        const l = silenced(() => plain(RR(w).raiseSkillLevel({ skillId: "apollo_eros_arrow", targetLevel: 3, resultVariableId: rankVar, completedSwitchId: DONE_SWITCH })));
        assert.deepEqual([l.code, l.status, l.abortEvent], [-1, "resultVariableIsRankVariable", true], "raise " + rankVar);
        for (const [command, args] of [["AcquireRing", { ringId: "janus", rankVariableId: "3", requiredRank: "3", resultVariableId: String(rankVar), completedSwitchId: "7" }], ["RaiseSkillLevel", { skillId: "apollo_eros_arrow", targetLevel: "3", resultVariableId: String(rankVar), completedSwitchId: "7" }]]) {
            const r = silenced(() => runEvent(w, "ProjectR_RingRewards", command, args, rankVar));
            assert.deepEqual([r.successBranch, r.later, r.running], [false, false, false], `${command} ${rankVar} ランク${rank} ${JSON.stringify(r)}`);
        }
        assert.equal(allVars(w), vars, "ランク変数は変わらない"); assert.equal(cardState(w), state, "指輪もレベルも変わらない"); assert.equal(sw(w, DONE_SWITCH), false);
    }
    // 登録していない変数を結果にすれば、これまでどおり(報酬の意味は変わらない)
    assert.equal(acquire(w).code, 1); assert.equal(plain(RR(w).raiseSkillLevel({ skillId: "apollo_eros_arrow", targetLevel: 2, resultVariableId: RESULT_VAR })).code, 1);
    assert.equal(getVar(w, RESULT_VAR), 1);
});
test("【7c】通信ランクの登録が空・プラグインが無い場合、RingRewards はこれまでと同じ動き", () => {
    for (const mode of ["empty", "absent"]) {
        const w = world([]);
        if (mode === "absent") w.ctx.ProjectRCommunicationRank = undefined;
        D(w).assignRingToPlayer("apollo"); setVar(w, 3, 3);
        // レベル上げの結果の変数は、登録が無ければランク用かどうか分からないので、そのまま書く(従来どおり)
        assert.equal(plain(RR(w).raiseSkillLevel({ skillId: "apollo_eros_arrow", targetLevel: 2, resultVariableId: 4 })).code, 1, mode); assert.equal(getVar(w, 4), 1);
        // 指輪の入手の「自分のランク変数」との重なりは、従来どおり拒否
        const a = silenced(() => acquire(w, { resultVariableId: 3 })); assert.deepEqual([a.code, a.abortEvent], [-1, true], mode); assert.equal(getVar(w, 3), 3);
        assert.equal(acquire(w).code, 1, mode);
    }
});

// ---------------------------------------------------------------- 【8】登録の誤り(fail closed) ----------------------------------------------------------------
const row = o => JSON.stringify({ ...A, ...o });
const BROKEN = [
    ["表が壊れた JSON", "abc"], ["表が途中で切れている", tableText([A, B]).slice(0, -2)], ["表が配列でない", "{}"], ["設定が文字列でない", [JSON.stringify(A)]],
    ["1行だけ壊れた JSON(その行の変数は分からない)", JSON.stringify(["{broken", JSON.stringify(B)])], ["行が配列", JSON.stringify(["[3]", JSON.stringify(B)])],
    ["変数番号の書き方が違う(3.0)", JSON.stringify([row({ VariableId: "3.0" }), JSON.stringify(B)])], ["変数が未設定の行が残っている", JSON.stringify([JSON.stringify(A), row({ Key: "test_new", VariableId: "0", MaxRank: "0" })])],
    ["上限だけ誤り", JSON.stringify([row({ MaxRank: "x" }), JSON.stringify(B)])], ["キーの重複", JSON.stringify([JSON.stringify(A), row({ VariableId: "8" })])], ["変数の重複", JSON.stringify([JSON.stringify(A), row({ Key: "test_c" })])]
];
const prepareRewards = () => {
    const w = world(); D(w).assignRingToPlayer("apollo"); D(w).assignRingToPlayer("hermes"); setVar(w, 3, 5); setVar(w, 4, 1); setVar(w, 12, 2);
    return w;
};
test("【8a】登録の誤り: すべての API は -1(rankConfigurationInvalid・abortEvent)で、どの出力先を指定しても、変数・スイッチ・指輪・スキルは何も変わらない", () => {
    const w = prepareRewards();
    let calls = 0;
    for (const [label, text] of BROKEN) {
        configureRaw(w, text);
        for (const preset of [false, true]) for (const target of [undefined, 0, 3, 4, 5, 6, 8, 12, 999, "3.0"]) {
            setVar(w, RESULT_VAR, 1); setVar(w, OUTPUT_VAR, 2); w.ctx.$gameSwitches.setValue(DONE_SWITCH, preset);
            const vars = allVars(w), switches = allSwitches(w), state = cardState(w);
            const out = { resultVariableId: target, completedSwitchId: DONE_SWITCH };
            const results = silenced(() => [
                CR(w).raiseRankToMinimum({ characterKey: "test_b", minimumRank: 3, ...out }),
                CR(w).readRank({ characterKey: "test_b", outputVariableId: target, ...out }),
                CR(w).readRank({ characterKey: "test_b", outputVariableId: target, resultVariableId: RESULT_VAR, completedSwitchId: DONE_SWITCH }),
                CR(w).getRank("test_b"),
                RR(w).acquireRing({ ringId: "janus", rankVariableId: 3, requiredRank: 3, ...out }),
                RR(w).acquireRing({ ringId: "apollo", rankVariableId: 3, requiredRank: 3, ...out }),
                RR(w).raiseSkillLevel({ skillId: "apollo_eros_arrow", targetLevel: 3, ...out }),
                RR(w).raiseSkillLevel({ skillId: "hermes_issen", targetLevel: 3, ...out })
            ]).map(plain);
            for (const r of results) { calls++; assert.deepEqual([r.ok, r.code, r.status, r.abortEvent, r.configurationInvalid], [false, -1, "rankConfigurationInvalid", true, true], label + " " + String(target)); assert.ok(r.problems.length >= 1, label); }
            assert.equal(allVars(w), vars, label + " 変数 " + String(target)); assert.equal(allSwitches(w), switches, label + " スイッチ"); assert.equal(cardState(w), state, label + " 指輪・スキル");
        }
    }
    assert.equal(calls, BROKEN.length * 2 * 10 * 8);
});
const eventCommands = () => [
    [PLUGIN, "RaiseRankToMinimum", raiseArgs({ characterKey: "test_b", minimumRank: "3" })], [PLUGIN, "ReadRank", readArgs({ characterKey: "test_b" })],
    ["ProjectR_RingRewards", "AcquireRing", { ringId: "janus", rankVariableId: "3", requiredRank: "3", resultVariableId: "5", completedSwitchId: "7" }],
    ["ProjectR_RingRewards", "RaiseSkillLevel", { skillId: "apollo_eros_arrow", targetLevel: "3", resultVariableId: "5", completedSwitchId: "7" }]
];
test("【8b】登録の誤り: 4つのプラグインコマンドは実際のイベントを中断する(前に残った成功の値 1・2 を読んで先へ進まない)・何も変えない", () => {
    const w = prepareRewards();
    for (const [label, text] of BROKEN) {
        configureRaw(w, text);
        for (const stale of [1, 2]) for (const [plugin, command, args] of eventCommands()) {
            setVar(w, RESULT_VAR, stale); setVar(w, OUTPUT_VAR, stale); w.ctx.$gameSwitches.setValue(DONE_SWITCH, false);
            const vars = allVars(w), state = cardState(w);
            const r = silenced(() => runEvent(w, plugin, command, args, RESULT_VAR));
            assert.deepEqual(r, { successBranch: false, later: false, running: false }, `${label} ${command} 残り${stale}`);
            assert.equal(allVars(w), vars, label + " " + command); assert.equal(cardState(w), state, label + " " + command); assert.equal(sw(w, DONE_SWITCH), false);
        }
    }
});
test("【8c】登録を直せば同じコマンドが成功し、壊せばまた止まる・空の登録とプラグイン無しでは RingRewards は従来どおり", () => {
    const w = prepareRewards();
    configureRaw(w, "abc"); assert.equal(silenced(() => plain(RR(w).acquireRing({ ringId: "janus", rankVariableId: 3, requiredRank: 3 }))).status, "rankConfigurationInvalid");
    configure(w, [A, B, C]);
    const [up, rd, ac, lv] = eventCommands();
    for (const [plugin, command, args] of [[up[0], up[1], up[2]], [rd[0], rd[1], rd[2]], ac, lv]) assert.deepEqual(runEvent(w, plugin, command, args, RESULT_VAR), { successBranch: true, later: true, running: false }, command);
    assert.deepEqual([getVar(w, 4), getVar(w, OUTPUT_VAR), D(w).getRingOwner("janus"), D(w).getPersistentData().cardOwnership.apollo_eros_arrow.level], [3, 3, "player", 3]);
    // 正しい登録での結果コードは従来どおり
    setVar(w, 4, 0);
    assert.equal(silenced(() => acquire(w, { ringId: "athena", rankVariableId: 4 })).code, -3); assert.equal(silenced(() => plain(RR(w).raiseSkillLevel({ skillId: "themis_" + "none", targetLevel: 2 }))).code, -2);
    assert.equal(silenced(() => raise(w, { characterKey: "nobody" })).status, "unknownCharacter"); assert.equal(silenced(() => raise(w, { minimumRank: 9 })).code, -2);
    configure(w, [A, A]); assert.equal(silenced(() => acquire(w, { ringId: "athena" })).status, "rankConfigurationInvalid"); assert.equal(D(w).getRingOwner("athena"), "unowned");
    for (const mode of ["empty", "absent"]) {
        const w2 = prepareRewards(); configure(w2, []); if (mode === "absent") w2.ctx.ProjectRCommunicationRank = undefined;
        for (const [plugin, command, args] of [ac, lv]) assert.deepEqual(runEvent(w2, plugin, command, args, RESULT_VAR), { successBranch: true, later: true, running: false }, mode + " " + command);
    }
});
test("【8d】読込順の注記: 2つのプラグインの @base / @orderAfter は plugins.js の並びと合っていて、HermesProductionDeck の指定は無い", () => {
    const list = fs.readFileSync(path.join(__dirname, "..", "js", "plugins.js"), "utf8").match(/"name":"[^"]+"/g).map(s => s.slice(8, -1));
    for (const name of [PLUGIN, "ProjectR_RingRewards"]) {
        const source = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", name + ".js"), "utf8");
        for (const m of source.matchAll(/@(?:base|orderAfter) (\S+)/g)) { assert.ok(list.indexOf(m[1]) >= 0, name + " " + m[1]); assert.ok(list.indexOf(m[1]) < list.indexOf(name), name + " は " + m[1] + " より後"); }
        if (name === "ProjectR_RingRewards") { assert.ok(!/HermesProductionDeck/.test(source), "HermesProductionDeck への依存は無い"); }
    }
});

console.log(`\nall ${passed} passed`);
