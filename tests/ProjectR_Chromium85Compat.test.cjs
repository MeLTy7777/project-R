"use strict";
// MZ同梱のNW.js(0.48.4 / Chromium 85)で動かないAPIをプラグインが使っていないことを確認する。
// Nodeには存在するため通常のテストでは見逃され、実機でカードが「Object.hasOwn is not a function」で失敗した(葦笛)。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pluginsDir = path.join(__dirname, "..", "js", "plugins");
const files = fs.readdirSync(pluginsDir).filter(name => /^ProjectR_.*\.js$/.test(name));

// Chromium 86以降で追加されたAPI(85では未定義)。
const FORBIDDEN = [
    [/\bObject\.hasOwn\s*\(/, "Object.hasOwn (Chromium 93)。Object.prototype.hasOwnProperty.call を使う"],
    [/\.at\(\s*-?\d/, "Array/String.prototype.at (Chromium 92)"],
    [/\bstructuredClone\s*\(/, "structuredClone (Chromium 98)"],
    [/\.findLast(Index)?\s*\(/, "findLast/findLastIndex (Chromium 97)"],
    [/\.to(Sorted|Reversed|Spliced)\s*\(/, "toSorted/toReversed/toSpliced (Chromium 110)"],
    [/\bObject\.groupBy\s*\(/, "Object.groupBy (Chromium 117)"],
    [/\bArray\.fromAsync\s*\(/, "Array.fromAsync (Chromium 121)"],
    [/\bstatic\s*\{/, "class static block (Chromium 94)"],
    [/new Error\([^)]*\{\s*cause\b/, "Error cause (Chromium 93)"]
];

test("ProjectRプラグインはNW.js 0.48.4(Chromium 85)に無いAPIを使わない", () => {
    assert.ok(files.length > 30, "プラグインを読めている");
    const problems = [];
    for (const name of files) {
        const lines = fs.readFileSync(path.join(pluginsDir, name), "utf8").split(/\r?\n/);
        lines.forEach((line, index) => {
            const code = line.replace(/\/\/.*$/, "");
            for (const [pattern, label] of FORBIDDEN) if (pattern.test(code)) problems.push(`${name}:${index + 1} ${label}`);
        });
    }
    assert.deepEqual(problems, []);
});

test("葦笛はObject.hasOwnを使わず、hasOwnPropertyで検知状態を保存・復元する", () => {
    const source = fs.readFileSync(path.join(pluginsDir, "ProjectR_HermesReedFluteSleep.js"), "utf8");
    assert.doesNotMatch(source, /Object\.hasOwn\s*\(/);
    assert.match(source, /Object\.prototype\.hasOwnProperty\.call/);
});
