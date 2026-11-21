"use strict";
// 保護対象ファイルのうち、意図して追加した「小さな窓口」だけを許す差分の確認(保護を外すのではなく、許す変更を厳密に決める)。
//   GodSummonManager(Stage 1E-1): startCardBattle の第2引数 { ultimateRingId }(フィールド戦闘の指輪モードが、Q 枠の指輪をその戦闘だけ渡す追加専用の窓口)。
//     許す変更 = ① 3行の置き換え(指輪IDの取得 / startCardBattle の wrapper の宣言 / 成功時の分岐)② 追加行(コメント・sessionRing・ultimateRingId 関連・診断用の getBattleUltimateRingOverride)。
//     それ以外の行の追加・削除・変更があれば失敗する。
const cp = require("node:child_process");
const path = require("node:path");
const assert = require("node:assert/strict");
const ROOT = path.join(__dirname, "..");

const GOD_SUMMON = "js/plugins/ProjectR_GodSummonManager.js";
const REMOVED_OK = new Set([
    "const ringId = deck.getUltimateRingId?.();",
    "deck.startCardBattle = function() {",
    "if (result?.ok) ensurePersistent(); else clear();"
]);
const ADDED_OK = /sessionRing|ultimateRingId|hasRing|requested|ensurePersistent\(\);|^\} else clear\(\);$|^if \(result\?\.ok\) \{$|function\(cardIds, options\)|^const ringId = /;
const MAX_ADDED = 40;

function assertGodSummonSeamOnly(commit) {
    const out = cp.spawnSync("git", ["diff", "-U0", "--no-color", "--ignore-space-at-eol", commit, "--", GOD_SUMMON], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
    assert.equal(out.status, 0, "git diff が実行できる");
    const added = [], removed = [];
    for (const line of out.stdout.split(/\r?\n/)) {
        if (/^(\+\+\+|---|@@|diff |index )/.test(line)) continue;
        if (line.startsWith("+")) added.push(line.slice(1).trim()); else if (line.startsWith("-")) removed.push(line.slice(1).trim());
    }
    for (const line of removed) assert.ok(REMOVED_OK.has(line), `GodSummonManager: 許していない行の削除・変更: ${line}`);
    for (const line of added) {
        if (line === "" || /^(\*|\/\/|\/\*)/.test(line)) continue;                               // 空行・コメント
        assert.match(line, ADDED_OK, `GodSummonManager: 許していない行の追加: ${line}`);
    }
    assert.ok(added.length <= MAX_ADDED, `GodSummonManager: 追加は小さい(${added.length}行)`);
    if (added.length > 0) assert.ok(added.some(l => /ultimateRingId/.test(l)), "追加があるなら、それは ultimateRingId の窓口");
}

// UltimateActivation(Stage 1E-1): キー入力(U)の受付を止める追加専用の入力ゲート(registerInputGate / unregisterInputGate / inputSuppressed)。
//   許す変更 = 追加だけ(既存の行の削除・変更は無し)。追加行は、コメント・ゲート関連・ゲートの記述に必要な短い定型(閉じ括弧・return・preventDefault)だけ。
const ULTIMATE_ACTIVATION = "js/plugins/ProjectR_UltimateActivation.js";
const GATE_OK = /[gG]ate|inputSuppressed|suppressed/;
const GATE_BOILERPLATE = new Set(["};", "}", "return false;", "return { ok: true, id };", "event.preventDefault?.();"]);
function assertUltimateActivationSeamOnly(commit) {
    const out = cp.spawnSync("git", ["diff", "-U0", "--no-color", "--ignore-space-at-eol", commit, "--", ULTIMATE_ACTIVATION], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
    assert.equal(out.status, 0, "git diff が実行できる");
    const added = [], removed = [];
    for (const line of out.stdout.split(/\r?\n/)) {
        if (/^(\+\+\+|---|@@|diff |index )/.test(line)) continue;
        if (line.startsWith("+")) added.push(line.slice(1).trim()); else if (line.startsWith("-")) removed.push(line.slice(1).trim());
    }
    assert.deepEqual(removed, [], "UltimateActivation: 既存の行は削除・変更しない(追加だけ)");
    for (const line of added) {
        if (line === "" || /^(\*|\/\/|\/\*)/.test(line) || GATE_BOILERPLATE.has(line) || /^return; \/\//.test(line)) continue;
        assert.match(line, GATE_OK, `UltimateActivation: 許していない行の追加: ${line}`);
    }
    assert.ok(added.length <= 45, `UltimateActivation: 追加は小さい(${added.length}行)`);
}

module.exports = { assertGodSummonSeamOnly, assertUltimateActivationSeamOnly, GOD_SUMMON, ULTIMATE_ACTIVATION };
