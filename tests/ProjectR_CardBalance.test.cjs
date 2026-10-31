"use strict";
// カードバランス設定(data/ProjectR_CardBalance.json + ProjectR_CardBalance + Playtest限定エディタ)の検証。実エンジン(実Map004 + 全plugin)。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, SWEEP, ISSEN, VEIL, STRENGTH, PSYCHO, FLUTE, ZETSU, placePolar, parkOthers, aimDegree, lost, resetHp, useCard, runFrames, state, deckApi } = fx;
const { buildWorld } = require("./RealEngineHarness.cjs");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const project = path.resolve(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const balanceOf = w => w.ctx.ProjectRCardBalance;
const CARDS = [ISSEN, PSYCHO, VEIL, STRENGTH, SWEEP, FLUTE, ZETSU];
const TARGET = 4;
const tmpFile = name => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pr-balance-")), name);
const withFs = w => { w.ctx.require = require; return w; };

// 変更前に各カードのコードへ直接書かれていた値(Phase H2C-B4時点)。JSON化で1つも変わっていないことの固定。
const GOLDEN = {
    hermes_zetsu: { 1: { hitMultiplier: 1.5, hitSeconds: 0.8 }, 2: { hitMultiplier: 2, hitSeconds: 0.8 }, 3: { hitMultiplier: 3, hitSeconds: 0.8, speedFactor: 2, speedSeconds: 1 } },
    hermes_sweep: { 1: { damage: 50 }, 2: { damage: 50, tipBonus: 50 }, 3: { damage: 50, tipBonus: 50, criticalChanceBonus: 0.5 } },
    hermes_reed_flute: { 1: { sleep: true }, 2: { sleep: true, sleepBonusDamage: 50 }, 3: { sleep: true, sleepBonusDamage: 50, guaranteedCritical: true } },
    hermes_issen: { 1: { directDamage: 200, splitTotal: 50, splitSeconds: 3 }, 2: { directDamage: 200, splitTotal: 100, splitSeconds: 3 }, 3: { directDamage: 200, splitTotal: 100, splitSeconds: 3, slowFactor: 0.5, slowSeconds: 3 } },
    hermes_strength: { 1: { attackBonus: 0.1 }, 2: { attackBonus: 0.15 }, 3: { attackBonus: 0.15, ignoreDefense: true } },
    hermes_veil: { 1: { concealment: true, radiusTiles: 5, durationSeconds: 5 }, 2: { concealment: true, radiusTiles: 5, durationSeconds: 5, speedBonus: 0.3 }, 3: { concealment: true, radiusTiles: 5, durationSeconds: 5, speedBonus: 0.3, criticalChanceBonus: 0.5 } },
    hermes_psychopomp: { 1: { healAmount: 50, collectRadiusTiles: 5, durationSeconds: 10 }, 2: { healAmount: 100, collectRadiusTiles: 5, durationSeconds: 10 }, 3: { healAmount: 150, collectRadiusTiles: 5, durationSeconds: 10, attackBonus: 0.03, attackBuffSeconds: 3 } }
};
const GOLDEN_CONSTANTS = {
    hermes_sweep: { arcDegrees: 190, radiusTiles: 4, tipTiles: 1 }, hermes_reed_flute: { radiusTiles: 8, sleepSeconds: 4 },
    hermes_issen: { rangeTiles: 11, pathWidthTiles: 1, splitTicks: 3 }
};
const GOLDEN_COOLDOWN = { hermes_issen: 7, hermes_psychopomp: 10, hermes_veil: 10, hermes_strength: 0.1, hermes_sweep: 0.5, hermes_reed_flute: 8, hermes_zetsu: 0.5 };

test("既定値: 7枚のLv1〜3の効果・定数・クールダウンは、JSON化の前にコードへ書かれていた値と1つも変わっていない", () => {
    const w = hermesWorld({ card: SWEEP });
    const api = balanceOf(w);
    assert.equal(api.isReady(), true, JSON.stringify(api.status()));
    assert.deepEqual(plain(api.cardIds()).sort(), CARDS.slice().sort());
    for (const card of CARDS) {
        for (const level of [1, 2, 3]) assert.deepEqual(plain(api.effects(card, level)), GOLDEN[card][level], `${card} Lv${level}`);
        assert.equal(api.cooldownSeconds(card), GOLDEN_COOLDOWN[card], `${card} cooldown`);
        for (const [key, value] of Object.entries(GOLDEN_CONSTANTS[card] || {})) assert.equal(api.constant(card, key), value, `${card}.${key}`);
        // Coreの実行時定義のクールダウンも同じ(JSONが正)
        assert.equal(deckApi(w).definitions.card(card).cooldownSeconds, GOLDEN_COOLDOWN[card]);
    }
    assert.equal(api.constant(SWEEP, "element"), 0); assert.equal(api.constant(ISSEN, "element"), 0);
    assert.equal(api.constant(SWEEP, "weaknessMultiplier"), 1);
});

test("カードのランタイムIDは設計IDと別: JSONの designId がカタログの設計ID↔runtime ID の対応と一致する", () => {
    const w = hermesWorld({ card: SWEEP });
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign());
    const snapshot = balanceOf(w).defaultsSnapshot();
    for (const row of design) {
        const entry = snapshot.cards[row.runtimeCardId];
        assert.ok(entry, row.runtimeCardId);
        assert.equal(entry.designId, row.designId, row.runtimeCardId);
    }
    for (const id of Object.keys(snapshot.cards)) assert.ok(/^hermes_[a-z_]+$/.test(id), "ランタイムIDで書く: " + id);
});

test("累積と置換: Lv2はLv1を残して足す。同じ効果の新しい数値は前の値を置き換える(加算でも乗算でもない)", () => {
    const w = hermesWorld({ card: SWEEP });
    const api = balanceOf(w);
    assert.deepEqual(plain(api.effects(SWEEP, 3)), { damage: 50, tipBonus: 50, criticalChanceBonus: 0.5 });
    assert.equal(api.setOverride(SWEEP, 1, "damage", 80).ok, true);
    assert.equal(api.effects(SWEEP, 1).damage, 80);
    assert.equal(api.effects(SWEEP, 2).damage, 80, "Lv1を変えるとLv2/3に引き継がれる");
    assert.equal(api.effects(SWEEP, 3).damage, 80);
    assert.equal(api.setOverride(SWEEP, 2, "damage", 120).ok, true);
    assert.deepEqual([1, 2, 3].map(l => api.effects(SWEEP, l).damage), [80, 120, 120], "Lv2の新しい値はLv1を置換し、Lv3へ続く(80+120=200ではない)");
    assert.equal(api.setOverride(SWEEP, 3, "damage", 60).ok, true);
    assert.deepEqual([1, 2, 3].map(l => api.effects(SWEEP, l).damage), [80, 120, 60], "Lv3は下げることもできる(置換)");
    api.resetValue(SWEEP, 2, "damage");
    assert.deepEqual([1, 2, 3].map(l => api.effects(SWEEP, l).damage), [80, 80, 60]);
    api.resetAll();
    assert.deepEqual([1, 2, 3].map(l => api.effects(SWEEP, l).damage), [50, 50, 50]);
    assert.ok(Object.isFrozen(api.effects(SWEEP, 1)) && Object.isFrozen(api.levels(SWEEP)));
});

test("検証: 数値・範囲・整数/小数・持続時間・未対応項目・関連値・属性IDを拒否し、拒否したときは何も変えない", () => {
    const w = hermesWorld({ card: SWEEP });
    const api = balanceOf(w);
    const bad = (card, scope, key, value, reason) => {
        const before = JSON.stringify(api.overrides());
        const result = api.setOverride(card, scope, key, value);
        assert.equal(result.ok, false, `${card}.${key}=${String(value)}`);
        assert.equal(result.reason, reason, `${card}.${key}=${String(value)}: ${JSON.stringify(result)}`);
        assert.equal(JSON.stringify(api.overrides()), before, "拒否したら状態は変わらない");
    };
    bad(SWEEP, 1, "damage", "abc", "notANumber"); bad(SWEEP, 1, "damage", "", "notANumber"); bad(SWEEP, 1, "damage", NaN, "notANumber");
    bad(SWEEP, 1, "damage", Infinity, "notANumber"); bad(SWEEP, 1, "damage", null, "notANumber"); bad(SWEEP, 1, "damage", {}, "notANumber");
    bad(SWEEP, 1, "damage", -1, "belowMin"); bad(SWEEP, 1, "damage", 100000, "aboveMax"); bad(SWEEP, 1, "damage", 12.5, "mustBeInteger");
    bad(SWEEP, 3, "criticalChanceBonus", 1.2, "aboveMax"); bad(SWEEP, 3, "criticalChanceBonus", -0.1, "belowMin");
    bad(VEIL, 1, "durationSeconds", 0, "belowMin"); bad(VEIL, 1, "durationSeconds", 121, "aboveMax");
    bad(ISSEN, "constant", "splitTicks", 2.5, "mustBeInteger"); bad(ISSEN, "constant", "splitTicks", 0, "belowMin");
    bad(SWEEP, "cooldown", "cooldownSeconds", 0, "belowMin"); bad(SWEEP, "cooldown", "cooldownSeconds", 601, "aboveMax");
    bad(SWEEP, "constant", "element", 10, "unknownElement"); bad(SWEEP, "constant", "element", 1.5, "mustBeInteger");
    bad(SWEEP, "constant", "tipTiles", 5, "aboveRelated"); bad(SWEEP, "constant", "radiusTiles", 0.9, "belowRelated");
    bad(FLUTE, 1, "sleep", 1, "notEditable"); bad(STRENGTH, 3, "ignoreDefense", 0, "notEditable");
    bad(SWEEP, 1, "projectileCount", 2, "unsupportedField"); bad(SWEEP, 1, "noSuchField", 1, "unknownField");
    bad(SWEEP, 1, "tipBonus", 10, "unsupportedField"); // tipBonusはLv2から
    bad("hermes_nope", 1, "damage", 1, "unknownCard"); bad(SWEEP, 4, "damage", 1, "badScope"); bad(SWEEP, "level", "damage", 1, "badScope");
    // 小数・文字列の数値は正規化して受け入れる
    assert.equal(api.setOverride(VEIL, 1, "durationSeconds", " 7.5 ").value, 7.5);
    assert.equal(api.effects(VEIL, 1).durationSeconds, 7.5);
    assert.equal(api.setOverride(SWEEP, "constant", "element", 2).ok, true);
    assert.equal(api.setOverride(SWEEP, "constant", "tipTiles", 3.5).ok, true, "半径(4)以下なら先端の幅を変えられる");
});

test("リセット: 項目ごと・カードごと・すべて。元と同じ値を入れると上書きは残らない", () => {
    const w = hermesWorld({ card: SWEEP });
    const api = balanceOf(w);
    api.setOverride(SWEEP, 1, "damage", 70); api.setOverride(SWEEP, "cooldown", "cooldownSeconds", 2); api.setOverride(VEIL, 1, "radiusTiles", 9);
    assert.equal(api.overrideCount(), 3);
    assert.equal(deckApi(w).definitions.card(SWEEP).cooldownSeconds, 2, "クールダウンはCoreの実行時定義に反映");
    assert.equal(api.resetValue(SWEEP, "cooldown", "cooldownSeconds").removed, true);
    assert.equal(deckApi(w).definitions.card(SWEEP).cooldownSeconds, 0.5, "リセットで元のクールダウンに戻る");
    assert.equal(api.resetCard(SWEEP).removed, true);
    assert.equal(api.overrideCount(), 1);
    assert.equal(api.setOverride(VEIL, 1, "radiusTiles", 5).ok, true);
    assert.equal(api.overrideCount(), 0, "既定と同じ値は上書きとして残さない");
    assert.equal(api.resetAll().removed, false);
    assert.deepEqual(plain(api.overrides()), {});
});

test("保存と再読み込み(dev): 製品のJSONとは別のファイル。保存→全リセット→読み込みで同じ値に戻り、不正なファイルは全体を拒否する", () => {
    const w = withFs(hermesWorld({ card: SWEEP }));
    const api = balanceOf(w);
    const file = tmpFile("dev.json");
    api.setDevFile(file);
    api.setOverride(SWEEP, 1, "damage", 90); api.setOverride(ISSEN, 2, "splitTotal", 120); api.setOverride(FLUTE, "constant", "sleepSeconds", 6.5); api.setOverride(ZETSU, "cooldown", "cooldownSeconds", 0.8);
    const before = JSON.stringify(api.overrides());
    const saved = api.saveDev();
    assert.equal(saved.ok, true, JSON.stringify(saved)); assert.equal(saved.count, 4);
    const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(onDisk.kind, "ProjectR_CardBalance.dev"); assert.deepEqual(onDisk.overrides, JSON.parse(before));
    api.resetAll();
    assert.equal(api.effects(SWEEP, 1).damage, 50);
    const loaded = api.loadDev();
    assert.equal(loaded.ok, true, JSON.stringify(loaded));
    assert.equal(JSON.stringify(api.overrides()), before);
    assert.equal(api.effects(ISSEN, 3).splitTotal, 120); assert.equal(api.constant(FLUTE, "sleepSeconds"), 6.5);
    assert.equal(deckApi(w).definitions.card(ZETSU).cooldownSeconds, 0.8);
    // 不正なファイルは全体を拒否し、今の上書きを変えない
    const corrupt = { schema: 1, overrides: { [SWEEP]: { constants: {}, levels: { 1: { damage: 12.5 } } }, hermes_nope: {}, [VEIL]: { constants: { radiusTiles: "x" }, levels: {} } } };
    fs.writeFileSync(file, JSON.stringify(corrupt));
    const bad = api.loadDev();
    assert.equal(bad.ok, false); assert.equal(bad.reason, "invalidValues"); assert.ok(bad.problems.length >= 3, JSON.stringify(bad));
    assert.equal(JSON.stringify(api.overrides()), before);
    fs.writeFileSync(file, "{ not json"); assert.equal(api.loadDev().ok, false);
    fs.unlinkSync(file); assert.equal(api.loadDev().reason, "noFile");
    // 製品のdata/ファイル・ワークブックは保存先にできない
    for (const unsafe of [path.join(project, "data", "ProjectR_CardBalance.json"), path.join(os.tmpdir(), "x.xlsx"), path.join(os.tmpdir(), "x.txt")]) {
        api.setDevFile(unsafe);
        assert.equal(api.saveDev().reason, "unsafeDevPath", unsafe);
    }
    assert.equal(fs.existsSync(path.join(os.tmpdir(), "x.xlsx")), false);
});

test("製品の既定値(data/ProjectR_CardBalance.json)とワークブックは、開発用の操作で書き換わらない", () => {
    const file = path.join(project, "data/ProjectR_CardBalance.json");
    const before = fs.readFileSync(file);
    const w = withFs(hermesWorld({ card: SWEEP }));
    const api = balanceOf(w);
    api.setDevFile(tmpFile("dev.json"));
    api.setOverride(SWEEP, 1, "damage", 99); api.saveDev(); api.resetAll(); api.loadDev();
    assert.ok(before.equals(fs.readFileSync(file)), "製品のJSONはバイト単位で不変");
    assert.equal(w.ctx.ProjectRCardBalance.defaultsSnapshot().cards[SWEEP].levels["1"].damage, 50);
});

test("Playtest以外では何も変わらない: 上書き・保存・読み込みは拒否され、エディタは作られず、以前の上書きがあっても既定値が使われる", () => {
    const w = withFs(hermesWorld({ card: SWEEP }));
    const api = balanceOf(w);
    api.setOverride(SWEEP, 1, "damage", 75);
    assert.equal(api.effects(SWEEP, 1).damage, 75);
    w.ctx.Utils.isOptionValid = () => false; // 配布版相当
    assert.equal(api.effects(SWEEP, 1).damage, 50, "配布版では上書きを見ない");
    for (const call of [() => api.setOverride(SWEEP, 1, "damage", 10), () => api.resetAll(), () => api.saveDev(), () => api.loadDev(), () => api.importOverrides({})]) {
        assert.equal(call().reason, "notPlaytest");
    }
    assert.equal(w.ctx.ProjectRCardBalanceEditor.open().reason, "notPlaytest", "Playtestでなければ開かない");
    assert.equal(w.ctx.ProjectRCardBalanceEditor.isOpen(), false);
    // 最初から配布版として読み込むと、エディタは存在しない
    const release = buildWorld({ playtest: false });
    assert.equal(release.ctx.ProjectRCardBalanceEditor, undefined);
    assert.equal(release.ctx.ProjectRCardBalance.isReady(), true);
    assert.equal(release.ctx.ProjectRCardBalance.setOverride(SWEEP, 1, "damage", 1).reason, "notPlaytest");
});

test("発動中の一貫性: ヴェイルの持続中に半径/持続を変えても、その発動は発動時の値のまま。次の発動から新しい値", () => {
    const w = hermesWorld({ card: VEIL, level: 1 });
    const api = balanceOf(w);
    w.run("Math.random = () => 0.999;");
    const first = useCard(w, 0);
    assert.equal(first.ok, true, JSON.stringify(first));
    const veil = () => plain(w.ctx.ProjectRHermesVeil.getActive());
    assert.equal(veil().length, 1);
    assert.equal(veil()[0].effects.radiusTiles, 5);
    api.setOverride(VEIL, 1, "radiusTiles", 9); api.setOverride(VEIL, 1, "durationSeconds", 12);
    assert.equal(veil()[0].effects.radiusTiles, 5, "発動中の効果は変わらない");
    runFrames(w, 30);
    assert.equal(veil()[0].effects.radiusTiles, 5);
    assert.ok(veil()[0].remaining <= 5, "持続も発動時の5秒から数える");
    const second = useCard(w, 0);
    assert.equal(second.ok, true);
    const radii = veil().map(r => r.effects.radiusTiles).sort();
    assert.deepEqual(radii, [5, 9], "次の発動は新しい値");
});

test("発動中の一貫性: 一閃の分割ダメージ中に回数/ダメージを変えても、すでに当たった分は発動時の予定どおり", () => {
    const w = hermesWorld({ card: ISSEN, level: 1 });
    const api = balanceOf(w);
    parkOthers(w, [TARGET]); resetHp(w);
    placePolar(w, TARGET, 4, 0); aimDegree(w, 0);
    w.run("Math.random = () => 0.999;");
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(plain(w.ctx.ProjectRHermesIssen.getActiveSplits()).length >= 1, true);
    api.setOverride(ISSEN, "constant", "splitTicks", 10); api.setOverride(ISSEN, 1, "splitTotal", 500);
    runFrames(w, 60 * 4);
    assert.equal(lost(w, TARGET), 250, "直接200 + 分割50(3回)のまま");
});

test("クールダウンの上書きは次の使用から: 使用中のカードの残り時間は変わらず、新しいクールダウンは次に捨て札へ入るときから", () => {
    const w = hermesWorld({ card: SWEEP, level: 1 });
    const api = balanceOf(w);
    parkOthers(w, [TARGET]); resetHp(w); aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(state(w).cooldownPile[0].remainingSeconds, 0.5);
    api.setOverride(SWEEP, "cooldown", "cooldownSeconds", 3);
    assert.equal(state(w).cooldownPile[0].remainingSeconds, 0.5, "すでにクールダウン中のカードは変わらない");
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual(plain(state(w).cooldownPile.map(c => c.remainingSeconds)).sort((a, b) => a - b), [0.5, 3]);
});

test("バランス設定が使えないとき、7枚はどれも「balanceUnavailable」で失敗し、カードを消費しない", () => {
    for (const card of CARDS) {
        const w = hermesWorld({ card });
        const saved = w.ctx.ProjectRCardBalance;
        w.ctx.ProjectRCardBalance = { isReady: () => false, hasCard: () => false };
        const handBefore = JSON.stringify(plain(state(w).hand.map(c => c.cardId)));
        const result = useCard(w, 0);
        assert.equal(result.ok, false, card);
        assert.equal(JSON.stringify(plain(state(w).hand.map(c => c.cardId))), handBefore, `${card}: 消費されない`);
        assert.equal(state(w).cooldownPile.length, 0, `${card}: クールダウンに入らない`);
        w.ctx.ProjectRCardBalance = saved;
    }
});

test("JSONの検証: 不正な構造・未知の項目・範囲外はisReady=falseで理由が出る(製品のJSONを壊したら気づける)", () => {
    const vm = require("node:vm");
    const source = fs.readFileSync(path.join(project, "js/plugins/ProjectR_CardBalance.js"), "utf8");
    const good = JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8"));
    const load = data => {
        const ctx = vm.createContext({ console: { error() {}, log() {} }, $dataProjectRCardBalance: data, Utils: { isOptionValid: () => true }, PluginManager: { parameters: () => ({}) } });
        vm.runInContext(source, ctx);
        return ctx.ProjectRCardBalance;
    };
    assert.equal(load(good).isReady(), true);
    const clone = () => JSON.parse(JSON.stringify(good));
    const cases = [
        [d => { d.schema = 2; }, "unsupportedSchema"], [d => { delete d.cards; }, "missingCards"], [d => { d.cards.hermes_sweep.levels["1"].damage = -5; }, "belowMin"],
        [d => { d.cards.hermes_sweep.levels["1"].damage = 1.5; }, "mustBeInteger"], [d => { d.cards.hermes_sweep.levels["1"].nope = 1; }, "unknownField"],
        [d => { d.cards.hermes_sweep.levels["4"] = {}; }, "badLevel"], [d => { delete d.cards.hermes_sweep.levels["1"]; }, "missingLevel1"],
        [d => { d.cards.hermes_sweep.cooldownSeconds = "x"; }, "cooldownSeconds"], [d => { d.cards.hermes_veil.levels["1"].concealment = 1; }, "notBoolean"]
    ];
    for (const [mutate, expected] of cases) {
        const data = clone(); mutate(data);
        const api = load(data);
        assert.equal(api.isReady(), false, expected);
        assert.ok(api.status().error.join(",").includes(expected), `${expected}: ${api.status().error}`);
        assert.equal(api.effects("hermes_sweep", 1), null);
    }
});

test("セーブ互換: バランス設定・上書きはセーブデータに入らない(保存内容は上書きの有無で同一)。ロードしても上書きは残る/増えない", () => {
    const w = withFs(hermesWorld({ card: SWEEP }));
    const api = balanceOf(w);
    const snapshot = () => JSON.stringify(w.ctx.DataManager.makeSaveContents());
    const clean = snapshot();
    api.setOverride(SWEEP, 1, "damage", 66); api.setOverride(ISSEN, "constant", "element", 2); api.setOverride(ZETSU, "cooldown", "cooldownSeconds", 1.5);
    assert.equal(snapshot(), clean, "上書きの有無でセーブ内容は変わらない");
    assert.ok(!clean.includes("ProjectRCardBalance") && !clean.includes("hermes_sweep\":{\"constants"), "バランス設定のキーがセーブにない");
    const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    w.ctx.DataManager.createGameObjects();
    w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
    assert.equal(api.overrideCount(), 3, "ロードで開発用の上書きが消えも増えもしない");
    assert.equal(api.effects(SWEEP, 1).damage, 66);
});

test("ハードコードの重複なし: 7枚のプラグインにLvの効果表・数値定数のコピーがなく、すべてProjectRCardBalanceから読む。plugins.jsの順序も正しい", () => {
    for (const card of ["Zetsu", "Sweep", "ReedFlute", "Issen", "Strength", "Veil", "Psychopomp"]) {
        const src = fs.readFileSync(path.join(project, `js/plugins/ProjectR_Hermes${card}.js`), "utf8");
        assert.doesNotMatch(src, /const LEVELS = Object\.freeze\(\[/, `${card}: Lv表のコピーがない`);
        assert.doesNotMatch(src, /resolveLevels\(LEVELS/, card);
        assert.match(src, /ProjectRCardBalance/, card);
        assert.match(src, /balanceUnavailable/, card);
    }
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), config);
    const names = config.$plugins.map(p => p.name);
    const at = n => names.indexOf(n);
    assert.ok(at("ProjectR_CardCatalog") < at("ProjectR_CardBalance"));
    for (const card of ["Zetsu", "Sweep", "ReedFlute", "Issen", "Strength", "Veil", "Psychopomp"]) assert.ok(at("ProjectR_CardBalance") < at(`ProjectR_Hermes${card}`), card);
    for (const name of ["ProjectR_CardBalance", "ProjectR_Elements", "ProjectR_CardBalanceEditor"]) {
        assert.ok(at(name) >= 0, name + " 登録");
        assert.ok(fs.existsSync(path.join(project, `js/plugins/${name}.js`)), name + " ファイル");
    }
    // JSONの項目名はすべてfieldsに定義がある(未定義の数値が紛れていない)
    const data = JSON.parse(fs.readFileSync(path.join(project, "data/ProjectR_CardBalance.json"), "utf8"));
    for (const card of Object.values(data.cards)) {
        for (const key of Object.keys(card.constants)) assert.ok(data.fields[key], key);
        for (const level of Object.values(card.levels)) for (const key of Object.keys(level)) assert.ok(data.fields[key], key);
    }
});

test("エディタの表示モデル: 元の値と現在の値・変更済み・継承・範囲・単位を返し、入力文字列を検証して適用/拒否する(画面を介さない)", () => {
    const w = hermesWorld({ card: SWEEP });
    const editor = w.ctx.ProjectRCardBalanceEditor;
    const rowsOf = (scope = "all") => plain(editor.viewModel(SWEEP, scope).rows);
    const find = (rows, scope, key) => rows.find(r => r.scope === scope && r.key === key);
    let rows = rowsOf();
    assert.deepEqual(rows.filter(r => r.scope === "cooldown").map(r => r.key), ["cooldownSeconds"]);
    assert.deepEqual(rows.filter(r => r.scope === "constant").map(r => r.key), ["arcDegrees", "radiusTiles", "tipTiles", "element", "weaknessMultiplier"]);
    const dmg3 = find(rows, 3, "damage");
    assert.deepEqual([dmg3.original, dmg3.current, dmg3.modified, dmg3.inherited, dmg3.editable, dmg3.min, dmg3.max, dmg3.integer], [50, 50, false, true, true, 0, 99999, true]);
    assert.equal(find(rows, 1, "damage").inherited, false);
    assert.deepEqual(plain(editor.applyEdit(SWEEP, 1, "damage", " 75 ")), { ok: true, value: 75 });
    rows = rowsOf();
    assert.deepEqual([find(rows, 1, "damage").modified, find(rows, 1, "damage").original, find(rows, 1, "damage").current], [true, 50, 75]);
    assert.equal(find(rows, 2, "damage").current, 75, "継承先も新しい値");
    const rejected = editor.applyEdit(SWEEP, 1, "damage", "7.5");
    assert.equal(rejected.ok, false);
    assert.match(editor.explain(rejected), /整数/);
    assert.match(editor.explain(editor.applyEdit(SWEEP, 1, "damage", "100000")), /上限/);
    assert.match(editor.explain(editor.applyEdit(SWEEP, "constant", "element", "99")), /属性/);
    assert.equal(editor.viewModel("hermes_nope"), null);
    assert.deepEqual(plain(editor.viewModel(SWEEP, 2).rows.map(r => r.scope)).filter((v, i, a) => a.indexOf(v) === i), [2]);
    // 画面そのもの(DOM・F6・一時停止)はVMのDOMがstubなので実機CDPで確認する(tools/mz_cdp/balance_verify.cjs)。ここでは開かれていないことだけ。
    assert.equal(editor.isOpen(), false); assert.equal(editor.isPaused(), false);
});

console.log(`${passed} CardBalance tests passed`);
