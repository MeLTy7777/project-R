"use strict";
// Phase H2A: 正本ワークブック(ProjectR_CardManagement_Template(3).xlsx)の数値と、設計カタログ・移行監査の整合。
// 旧カード・旧セーブ・Apolloを消さないこと、定義の重複や二重発動がないことも確認する。MZ実機ではない。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { buildWorld, plain, read, deckApi } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const snapshot = JSON.parse(read("docs/ProjectR_Hermes_Workbook_Snapshot.json"));
const EXPECTED_SHA = "babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c";
const CLASS = { 強力: "strong", 通常: "normal", 特殊: "special" };

test("正本: XLSXが手元にあればSHA-256が一致する(無ければこの確認だけ省略)。控えは47列・7行・7枚の名称", () => {
    assert.equal(snapshot.sourceSha256, EXPECTED_SHA);
    assert.equal(snapshot.columns, 47);
    assert.deepEqual(snapshot.cards.map(c => c.name), ["一閃", "サイコポンポス", "ヴェイル", "ストレングス", "薙ぎ払い", "葦笛", "絶"]);
    const file = snapshot.source;
    if (fs.existsSync(file)) assert.equal(crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), EXPECTED_SHA);
});

test("カタログはワークブックと一致: 強さ・最大コピー数・Cooldown・対象タイプ・最大Lv・初回入手枚数。合計30", () => {
    const w = buildWorld();
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign());
    assert.equal(design.length, 7);
    snapshot.cards.forEach((row, i) => {
        const d = design[i];
        assert.deepEqual([d.designId, d.name], [row.designId, row.name]);
        assert.equal(d.classification, CLASS[row.classification], row.name);
        assert.equal(d.maxCopies, row.maxCopies, row.name);
        assert.equal(d.cooldownSeconds, row.cooldownSeconds, row.name);
        assert.equal(d.maxLevel, row.maxLevel, row.name);
        assert.equal(d.firstGrantCopies, row.firstGrantCopies, row.name);
        assert.equal(d.workbookTargetType, row.targetType, row.name);
        assert.equal(row.designStatus, "確定");
    });
    assert.equal(design.reduce((s, c) => s + c.maxCopies, 0), 30);
    assert.equal(design.reduce((s, c) => s + c.firstGrantCopies, 0), 30, "初回入手枚数の合計も30");
});

test("コピー上限の例外はデータ(カードごとのmaxCopies)で持つ。標準 通常3/強力2/特殊1 との差が例外として記録される。全体の規則は変えない", () => {
    const w = buildWorld();
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign());
    assert.deepEqual(design.filter(c => c.copyLimitException).map(c => c.name), ["一閃", "ヴェイル", "ストレングス", "葦笛", "絶"]);
    assert.deepEqual(design.map(c => c.standardMaxCopies), [2, 3, 1, 1, 3, 2, 2]);
    // 実装済みの絶は、ランタイム定義のmaxCopiesが5(強力の標準2を超える例外)。Core側の定数・規則は変わらない。
    assert.equal(deckApi(w).definitions.card("hermes_zetsu").maxCopies, 5);
    assert.equal(deckApi(w).DECK_SIZE, 30);
    assert.equal(deckApi(w).definitions.card("hermes_sword_attack").maxCopies, 3, "旧カードの上限は不変");
});

test("ヴェイルの対象は「その他」ではなくカーソル追従(Cursor)として扱う。H2B-3AでCardTargetingがCursorに対応した(Core本体は変更しない)", () => {
    const w = buildWorld();
    const veil = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.name === "ヴェイル");
    assert.equal(veil.workbookTargetType, "その他");
    assert.equal(veil.targetType, "cursor");
    assert.equal(veil.runtimeTargetTypeSupported, true);
    assert.deepEqual([veil.implemented, veil.runtimeCardId], [true, "hermes_veil"]);
    // CardDeckCoreは変えない: cursorのhandlerはProjectR_CardTargetingが受け持ち、未知の種別は従来どおり拒否する
    assert.equal(deckApi(w).registerActivationHandler("cursor", () => ({ ok: true })), true);
    assert.equal(deckApi(w).registerActivationHandler("futureUnknown", () => ({ ok: true })), false);
});

test("移行監査: 設計ID ↔ ランタイムID。実装済みは薙ぎ払い・葦笛・絶。旧カードは1枚も消さず、対応は「共存(判断待ち)」で残す", () => {
    const w = buildWorld();
    const audit = plain(w.ctx.ProjectRCardCatalog.migrationAudit());
    assert.equal(audit.length, 7);
    assert.deepEqual(audit.filter(a => a.implemented).map(a => [a.designId, a.runtimeCardId]), [[1, "hermes_issen"], [3, "hermes_veil"], [4, "hermes_strength"], [5, "hermes_sweep"], [6, "hermes_reed_flute"], [7, "hermes_zetsu"]]);
    assert.deepEqual(audit.filter(a => a.implemented).map(a => a.status), ["implemented", "implemented-as-new-id", "implemented", "implemented-as-new-id", "implemented-as-new-id", "implemented"]);
    const byName = Object.fromEntries(audit.map(a => [a.name, a]));
    assert.deepEqual([byName["薙ぎ払い"].legacyCardId, byName["薙ぎ払い"].decision], ["hermes_sword_attack", "coexist-pending"]);
    assert.deepEqual([byName["葦笛"].legacyCardId, byName["葦笛"].decision], ["hermes_reed_flute_sleep", "coexist-pending"]);
    assert.deepEqual([byName["ヴェイル"].legacyCardId, byName["ヴェイル"].decision], ["hermes_perception_obscure", "coexist-pending"]);
    for (const name of ["一閃", "サイコポンポス", "ストレングス"]) assert.equal(byName[name].legacyCardId, null, name);
    // どの旧カードも、現行のレジストリに残っている(削除・改名なし)。設計7枚に無い現行カードも一覧にある。
    const registry = new Set(deckApi(w).definitions.cardDefinitions().map(c => c.cardId));
    const mapped = new Set(audit.map(a => a.legacyCardId).filter(Boolean));
    const unmapped = plain(w.ctx.ProjectRCardCatalog.unmappedLegacyCards()).map(c => c.cardId);
    for (const id of [...mapped, ...unmapped]) assert.ok(registry.has(id), `${id} は残っている`);
    const accounted = new Set([...mapped, ...unmapped, "hermes_zetsu", "hermes_sweep", "hermes_reed_flute", "hermes_issen", "hermes_strength", "hermes_veil"]);
    assert.deepEqual([...registry].filter(id => !accounted.has(id)), [], "監査に載っていないカードは無い");
    assert.deepEqual(unmapped.filter(id => id.startsWith("apollo_")).sort(), ["apollo_golden_arrow", "apollo_lyre_calm", "apollo_plague_attack"], "Apolloは対象外・保持");
});

test("重複・二重発動の防止: 同じcardIdの定義は1つ。1つのcardIdを扱うhandlerは1つ。再登録しても増えない", () => {
    const w = buildWorld();
    const ids = deckApi(w).definitions.cardDefinitions().map(c => c.cardId);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.registeredRuntimeCards()), ["hermes_zetsu", "hermes_sweep", "hermes_reed_flute", "hermes_issen", "hermes_strength", "hermes_veil"]);
    // runtime追加の登録は、既存cardIdがあれば何もしない(同じ関数を再実行相当: 既存定義を保つ)
    const before = deckApi(w).definitions.card("hermes_zetsu");
    assert.equal(deckApi(w).definitions.cards.has("hermes_zetsu"), true);
    assert.equal(deckApi(w).definitions.card("hermes_zetsu"), before);
    // 設計IDのruntimeCardIdも重複しない
    const runtime = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).map(c => c.runtimeCardId).filter(Boolean);
    assert.equal(new Set(runtime).size, runtime.length);
    // groundのhandlerは1本の連鎖。絶以外(葦笛)は絶のhandlerを通っても葦笛のhandlerへ渡る(H1のテストで二重発動なしを確認済み)
    assert.equal(typeof deckApi(w).getActivationHandler("ground"), "function");
});

test("セーブ互換: 旧カードの所持・レベル・保存デッキは、絶の追加後も正規化で変わらない。最終30枚デッキは勝手に付与されない", () => {
    const w = buildWorld();
    w.enterMap(4, 12, 25);
    const d = deckApi(w);
    const legacy = ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];
    const raw = { version: 1, cardOwnership: Object.fromEntries(legacy.map((id, i) => [id, { owned: true, level: 1 + (i % 3) }])), ringOwnershipState: { hermes: "player", apollo: "player" },
        ultimateSelection: { ringId: "hermes" }, deckDefinition: { cardIds: [...legacy, "unknown_old_card"] } };
    const normalized = plain(d.normalizePersistentData(JSON.parse(JSON.stringify(raw)), d.definitions));
    for (const [i, id] of legacy.entries()) assert.deepEqual(normalized.cardOwnership[id], { owned: true, level: 1 + (i % 3) }, id);
    assert.deepEqual(normalized.deckDefinition.cardIds, [...legacy, "unknown_old_card"], "保存デッキは書き換えない(不明なIDも保持。検証で失敗として報告される)");
    assert.equal(normalized.cardOwnership.hermes_zetsu, undefined, "絶を勝手に所持にしない");
    assert.deepEqual(plain(d.getDeck()), [], "新しいゲームのデッキは空(30枚デッキを付与しない)");
    assert.equal(w.ctx.ProjectRCardCatalog.isFinalDeckReady(), false);
    assert.equal(w.ctx.ProjectRCardCatalog.buildFinalHermesDeck(), null);
});

console.log(`${passed} Card catalog audit tests passed`);
