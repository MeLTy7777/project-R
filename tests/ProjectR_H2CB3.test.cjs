"use strict";
// Phase H2C-B3: Hermes本番の安定化。 (1) 初期付与の「加算」と「補充」の差を読み取り専用で示すプレビューと、現在の挙動(加算)の固定
//   (2) 旧セーブ移行の説明(確認済み / 推定の最小値 / 未知ID / 未解放でデッキにある / デッキの問題) と開発者向けレポート
//   (3) 旧カードと新カードの区別(共存・削除なし) (4) 実機スクリプトの台帳(tools/mz_cdp/scripts.json)
// H2C-B4でユーザーが承認し、初期セットの付与は「補充(top-up)」に変更した(通常の付与は加算のまま)。下の付与方針のテストはその後の挙動を固定している。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const root = path.join(__dirname, "..");
const STARTER = { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 };
const LEGACY_IDS = ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.mouse(700, 300);
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.inv = () => w.ctx.ProjectRCardInventory;
    w.prod = () => w.ctx.ProjectRHermesProductionDeck;
    w.menu = () => w.ctx.ProjectRMenuCore;
    w.state = () => plain(w.inv().state());
    w.snapshot = () => plain({ inv: w.inv().state(), core: w.deck().getPersistentData(), prod: w.prod().state(), deck: w.deck().getDeck() });
    w.loadLegacy = mutate => {
        const parsed = w.ctx.JsonEx.parse(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()));
        delete parsed.system._projectRCardInventory;
        if (mutate) mutate(parsed.system);
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(parsed);
    };
    w.allowAlly = actorId => {
        const ring = w.deck().definitions.ring("hermes");
        w.deck().definitions.rings.set("hermes", Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
    };
    return w;
}
const codes = list => plain(list).map(r => r.code);

// ---------------- (1) 付与方針の監査 ----------------
test("初期付与のプレビューは読み取り専用: 所持・Core・付与記録・デッキを一切変えない。実際の方針は補充で、参考に加算との差も示す(ストレングス2枚 → 補充10枚 / 加算なら12枚)", () => {
    const w = world();
    w.inv().grantCopies("hermes_strength", 2, { source: "earlier" });
    const before = w.snapshot();
    const p = plain(w.prod().previewStarterGrant());
    assert.deepEqual(w.snapshot(), before, "プレビューで何も変わらない");
    assert.equal(p.mutated, false);
    assert.equal(p.policyInEffect, "topUp");
    assert.equal(p.willGrantOnNextAcquisition, true);
    const strength = p.preview.rows.find(r => r.cardId === "hermes_strength");
    assert.deepEqual([strength.current, strength.target, strength.additive.grant, strength.additive.after, strength.topUp.grant, strength.topUp.after, strength.differs], [2, 10, 10, 12, 8, 10, true]);
    assert.deepEqual([strength.additive.deckLimit, strength.topUp.deckLimit], [10, 10], "デッキに入る最大はどちらも上限10");
    const issen = p.preview.rows.find(r => r.cardId === "hermes_issen");
    assert.deepEqual([issen.current, issen.additive.grant, issen.topUp.grant, issen.differs], [0, 3, 3, false], "持っていないカードは同じ結果");
    assert.deepEqual(p.preview.totals, { additive: 30, topUp: 28, effective: 28 });
    assert.equal(p.totalGrant, 28);
    assert.equal(strength.grant, 8, "実際に使う方針(補充)の付与枚数");
});

test("実際の挙動(補充 H2C-B4): 事前に2枚あれば不足分の8枚だけ加わり10枚になる。報酬記録があるので2回目は増えない", () => {
    const w = world();
    w.inv().grantCopies("hermes_strength", 2, { source: "earlier" });
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(w.inv().getOwnedCopies("hermes_strength"), 10, "補充");
    assert.equal(w.inv().getOwnedCopies("hermes_issen"), 3);
    const before = w.snapshot();
    for (const call of [() => w.prod().acquireRing("hermes"), () => w.prod().grantStarter({ explicit: true }), () => w.inv().grantBundle("hermes.ring.starter", STARTER)]) call();
    assert.deepEqual(w.snapshot(), before, "報酬記録が二重付与を防ぐ");
    const p = plain(w.prod().previewStarterGrant());
    assert.equal(p.rewardRecorded, true);
    assert.equal(p.willGrantOnNextAcquisition, false);
    assert.equal(p.preview.alreadyGranted, true);
});

test("検証済みの付与記録がある旧セーブでは、移行で報酬記録が作られ、以後の取得は付与されない(プレビューもそう示す)", () => {
    const w = world();
    w.prod().acquireRing("hermes", { source: "test" });
    w.loadLegacy();
    const p = plain(w.prod().previewStarterGrant());
    assert.equal(p.preview.alreadyGranted, true);
    assert.equal(p.willGrantOnNextAcquisition, false);
    assert.equal(w.state().rewards["hermes.ring.starter"].migrated, true);
});

test("プレビューは保存領域が無い状態でも領域を作らない(読み取りで保存が変わらない)", () => {
    const w = world();
    delete w.ctx.$gameSystem._projectRCardInventory;
    assert.equal(w.ctx.$gameSystem._projectRCardInventory, undefined);
    w.prod().previewStarterGrant();
    w.inv().summary();
    w.inv().report();
    assert.equal(w.ctx.$gameSystem._projectRCardInventory, undefined, "プレビュー・要約・レポートは領域を作らない");
});

test("不正な目標のプレビューは問題として返す(未知のカード・0・小数)", () => {
    const w = world();
    const p = plain(w.inv().previewGrant("x", { no_such: 1, hermes_issen: 0, hermes_sweep: 1.5, hermes_zetsu: 5 }));
    assert.deepEqual(p.problems.map(x => x.code).sort(), ["INVALID_CARD_ID", "INVALID_COPIES", "INVALID_COPIES"]);
    assert.equal(p.rows.length, 1);
});

// ---------------- (2) 移行の説明 ----------------
test("新しいゲーム: 旧セーブ由来の説明は出ない(lines空)。付与された枚数は確認済み", () => {
    const w = world();
    w.prod().acquireRing("hermes", { source: "test" });
    const s = plain(w.inv().summary());
    assert.equal(s.fromLegacy, false);
    assert.deepEqual(s.lines, []);
    assert.equal(s.confirmed.length, 7);
    assert.deepEqual(s.inferred, []);
});

test("旧セーブ(旧デッキ・未解放カード・未知ID): 4つを区別して説明し、推定を確認済みと言わない", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    for (const id of ["hermes_sword_attack", "hermes_swift_movement"]) d.setCardOwned(id, true);
    d.setDeck(["hermes_sword_attack", "hermes_sword_attack", "hermes_swift_movement", "hermes_zetsu", "ghost_card"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; system._projectRCardDeckData.cardOwnership.ghost_card = { owned: true, level: 3 }; });
    const s = plain(w.inv().summary());
    assert.equal(s.fromLegacy, true);
    assert.deepEqual(s.confirmed, [], "確認済みは無い");
    assert.deepEqual(s.inferred.sort(), ["hermes_swift_movement", "hermes_sword_attack"]);
    assert.deepEqual(s.unknownCardIds, ["ghost_card"]);
    assert.deepEqual(s.lockedInDeck, ["hermes_zetsu"]);
    assert.ok(s.deckProblems.size >= 1 && s.deckProblems.ownership >= 1 && s.deckProblems.unknownCard === 1);
    assert.equal(s.lines.length, 3);
    const text = s.lines.join("\n");
    assert.match(text, /定義の無いカードID：ghost_card/);
    assert.match(text, /未解放のままデッキにあるカード：.*解放はされません/);
    assert.match(text, /2種の所持枚数は推定の最小値です（実際の過去の所持数ではありません）/);
    assert.doesNotMatch(text, /確認済み|正確|実際に持っていた/, "推定を確かな枚数として述べない");
});

test("付与記録(30枚)で確認できた旧セーブは『確認済み』。推定の最小値と混ぜない。移行後に実際に付与しても推定は『確認済み』に昇格しない", () => {
    const w = world();
    w.deck().assignRingToPlayer("apollo");
    w.deck().setCardOwned("apollo_golden_arrow", true);
    w.deck().setDeck(["apollo_golden_arrow"]);
    w.prod().acquireRing("hermes", { source: "test" });
    w.loadLegacy();
    let s = plain(w.inv().summary());
    assert.equal(s.confirmed.length, 7);
    assert.deepEqual(s.inferred, ["apollo_golden_arrow"]);
    w.inv().grantCopies("apollo_golden_arrow", 2, { source: "reward" });
    s = plain(w.inv().summary());
    assert.deepEqual(s.inferred, ["apollo_golden_arrow"], "推定を含む枚数のまま");
});

test("デッキの問題の内訳: 指輪を譲渡すると ring のみ(所持の問題ではない)、所持を超えると ownership", () => {
    const w = world();
    w.prod().acquireRing("hermes", { source: "test" });
    assert.deepEqual(plain(w.inv().summary()).deckProblems, { size: 0, ownership: 0, ring: 0, maxCopies: 0, unknownCard: 0 });
    w.allowAlly(4);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).ok, true);
    const ring = plain(w.inv().summary()).deckProblems;
    assert.deepEqual([ring.ring, ring.ownership], [30, 0]);
    assert.equal(w.menu().rings.returnToPlayer("hermes").ok, true);
    w.deck().setDeck(w.deck().getDeck().concat(["hermes_issen"]));
    const own = plain(w.inv().summary()).deckProblems;
    assert.equal(own.ownership, 1);
    assert.equal(own.size, 1);
});

test("開発者向けレポートは読めて、何も変更しない。カードごとの所持/デッキ/上限/区分と診断を含む", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_sword_attack", true);
    d.setDeck(["hermes_sword_attack", "ghost_card"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    const before = w.snapshot();
    const text = w.inv().report();
    assert.deepEqual(w.snapshot(), before);
    assert.equal(typeof text, "string");
    assert.match(text, /\[CardInventory\] schema=1 source=legacy/);
    assert.match(text, /hermes_sword_attack .*owned=1 deck=1 max=3 limit=1 inferred basis=reconstructedMinimum/);
    assert.match(text, /ghost_card \(未知のID\) deck=1/);
    assert.match(text, /\[info\] RECONSTRUCTED_MINIMUM hermes_sword_attack/);
    assert.match(text, /\[warning\] UNKNOWN_CARD_IN_DECK ghost_card/);
});

test("Deck Builder: 説明の素材(lines)は旧セーブから移行したときだけ出て、画面は先頭の1文をヘッダー3行目に描く(描画自体は実機で確認)", () => {
    // 新しいゲーム: 説明なし(モデル側のlinesが空であることで保証。描画にも出ない)
    const fresh = world();
    fresh.prod().acquireRing("hermes", { source: "test" });
    assert.deepEqual(plain(fresh.inv().summary()).lines, []);
    // 旧セーブ: linesあり。ヘッダーのレンダラーが同じ文を描く
    const w = world();
    w.deck().assignRingToPlayer("hermes");
    w.deck().setCardOwned("hermes_sword_attack", true);
    w.deck().setDeck(["hermes_sword_attack"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    const lines = plain(w.inv().summary()).lines;
    assert.equal(lines.length, 1);
    const source = fs.readFileSync(path.join(root, "js/plugins/ProjectR_DeckBuilder.js"), "utf8");
    assert.match(source, /ProjectRCardInventory\?\.summary\?\.\(\)/, "DeckBuilderは要約を参照する");
    assert.match(source, /migration\.lines\[0\]/);
});

// ---------------- (3) 旧カードと新カード ----------------
test("旧カードと新カードの監査: 新7枚 + 旧7枚(Hermes4・Apollo3)が共存。新規入手で旧カードの所持・Levelは変わらず、削除も置換もされない", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("apollo");
    for (const id of LEGACY_IDS) { w.inv().grantCopies(id, d.definitions.card(id).maxCopies, { source: "legacy" }); d.setCardLevel(id, 2); }
    const legacyBefore = Object.fromEntries(LEGACY_IDS.map(id => [id, [w.inv().getOwnedCopies(id), plain(d.getPersistentData()).cardOwnership[id].level]]));
    w.prod().acquireRing("hermes", { source: "test" });
    const legacyAfter = Object.fromEntries(LEGACY_IDS.map(id => [id, [w.inv().getOwnedCopies(id), plain(d.getPersistentData()).cardOwnership[id].level]]));
    assert.deepEqual(legacyAfter, legacyBefore);
    const g = plain(w.prod().cardGenerations());
    assert.equal(g.cards.filter(c => c.generation === "new").length, 7);
    assert.deepEqual(g.cards.filter(c => c.generation === "legacy").map(c => c.cardId).sort(), [...LEGACY_IDS].sort());
    assert.equal(g.cards.filter(c => c.generation === "other").length, 0);
    assert.deepEqual(g.duplicateNames, [], "表示名が完全に同じカードは無い");
    assert.equal(g.confusablePairs.length, 3);
    for (const pair of g.confusablePairs) { assert.ok(pair.legacyName && pair.newName && pair.legacyName !== pair.newName, pair.legacy); assert.ok(d.definitions.card(pair.legacy), "旧カードの定義は残る"); }
});

test("新しいHermes入手は新7枚だけを付与し、旧Hermesカードを付与しない", () => {
    const w = world();
    w.prod().acquireRing("hermes", { source: "test" });
    for (const id of LEGACY_IDS) assert.equal(w.inv().getOwnedCopies(id), 0, id);
    for (const id of Object.keys(STARTER)) assert.equal(w.inv().getOwnedCopies(id), STARTER[id], id);
});

// ---------------- (4) 実機スクリプトの台帳 ----------------
test("tools/mz_cdp/scripts.json: ディレクトリのスクリプトがすべて1回ずつ載り、載っているものはすべて存在する。古い前提が残っていない", () => {
    const dir = path.join(root, "tools/mz_cdp");
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "scripts.json"), "utf8"));
    const listed = manifest.scripts.map(s => s.file);
    assert.equal(new Set(listed).size, listed.length, "重複なし");
    const actual = fs.readdirSync(dir).filter(f => /\.(cjs|ps1)$/.test(f)).sort();
    assert.deepEqual([...listed].sort(), actual);
    for (const entry of manifest.scripts) {
        assert.ok(["support", "verify", "os-input", "diagnostic"].includes(entry.kind), entry.file);
        assert.ok(["maintained", "legacy"].includes(entry.status), entry.file);
        if (entry.status === "legacy") assert.ok(entry.supersededBy && entry.reason, entry.file + " は置き換え先と理由が必要");
        if (entry.kind === "verify" || entry.kind === "os-input") assert.ok(Number.isInteger(entry.expectedChecks) && entry.expectedChecks > 0, entry.file);
    }
    const verify = fs.readFileSync(path.join(dir, "verify.cjs"), "utf8");
    assert.doesNotMatch(verify, /cardDefinitions\(\)\.length === 8/, "カード定義がちょうど8件という古い前提");
    assert.match(verify, /settleLast/, "絶の結果が確定するまで待つ");
    assert.match(verify, /_globalInfo/, "起動直後のグローバル情報の競合を避ける");
    for (const wall of ["Region 255", "CombatWall", "VisionWall", "通行不能な地形", "通行不能Event"]) assert.match(verify, new RegExp(wall), "壁・地形の安全検証が残っている: " + wall);
});

test("ヴェイル診断スクリプトは判定条件を変えず、固定の待ち時間で失敗を隠さない", () => {
    const h3a = fs.readFileSync(path.join(root, "tools/mz_cdp/h3a_verify.cjs"), "utf8");
    assert.match(h3a, /R4pre/);
    assert.match(h3a, /hidden0\.checkRange === false && hidden0\.detected === false && re\.detected === true/, "R4aの判定条件は同じ");
    assert.match(h3a, /stillMoved < 0\.05 && carry < 1\.5/, "R4bの判定条件は同じ");
    const diag = fs.readFileSync(path.join(root, "tools/mz_cdp/h3a_veil_diag.cjs"), "utf8");
    assert.match(diag, /分類/);
});

test("Chromium 85で使えない構文を、今回触ったプラグインに使っていない", () => {
    for (const file of ["ProjectR_CardInventory.js", "ProjectR_HermesProductionDeck.js", "ProjectR_DeckBuilder.js"]) {
        const source = fs.readFileSync(path.join(root, "js/plugins", file), "utf8");
        for (const [pattern, name] of [[/\?\?=|\|\|=|&&=/, "論理代入"], [/\.at\(/, "Array.at"], [/replaceAll\(/, "replaceAll"], [/Object\.hasOwn\(/, "Object.hasOwn"], [/structuredClone\(/, "structuredClone"]]) {
            assert.doesNotMatch(source, pattern, file + " " + name);
        }
    }
});

console.log(`\n${passed} tests passed`);
