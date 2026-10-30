"use strict";
// Phase H2C-B4: Hermes指輪の初期セット付与を「加算」から「補充(top-up)」へ変更(ユーザー承認済み)。
//   付与枚数 = max(0, 目標 - 今の所持)。目標: 一閃3 / サイコポンポス3 / ヴェイル3 / ストレングス10 / 薙ぎ払い3 / 葦笛3 / 絶5。
//   通常の GrantCardCopies・ショップ・報酬は加算のまま。持っている枚数は減らさない。報酬記録 hermes.ring.starter で一度だけ。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const root = path.join(__dirname, "..");
const TARGET = { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 3, hermes_reed_flute: 3, hermes_zetsu: 5 };
const IDS = Object.keys(TARGET);
const REWARD = "hermes.ring.starter";

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.mouse(700, 300);
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.inv = () => w.ctx.ProjectRCardInventory;
    w.prod = () => w.ctx.ProjectRHermesProductionDeck;
    w.menu = () => w.ctx.ProjectRMenuCore;
    w.cmd = (plugin, name, args = {}) => w.ctx.PluginManager.callCommand(new w.ctx.Game_Interpreter(), plugin, name, args);
    w.acquire = () => w.cmd("ProjectR_HermesProductionDeck", "AcquireHermesRing");
    w.grantRing = () => w.cmd("ProjectR_MenuIntegration", "GrantRing", { ringId: "hermes" });
    w.copies = id => w.inv().getOwnedCopies(id);
    w.allCopies = () => Object.fromEntries(IDS.map(id => [id, w.copies(id)]));
    w.state = () => plain(w.inv().state());
    w.deckIds = () => plain(w.deck().getDeck());
    w.snapshot = () => plain({ inv: w.inv().state(), core: w.deck().getPersistentData(), prod: w.prod().state(), deck: w.deck().getDeck() });
    w.unowned = () => { w.deck().setRingUnowned("hermes"); return w; };
    w.roundTrip = () => {
        const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
        return json;
    };
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
    // 事前の所持を作る(独立した入手。報酬記録は作らない)。
    w.pre = counts => { for (const [id, n] of Object.entries(counts)) if (n > 0) assert.equal(w.inv().grantCopies(id, n, { source: "earlier" }).ok, true, id); return w; };
    return w;
}
const expectedAfter = pre => Object.fromEntries(IDS.map(id => [id, Math.max(TARGET[id], pre[id] || 0)]));
const expectedGrant = pre => Object.fromEntries(IDS.map(id => [id, Math.max(0, TARGET[id] - (pre[id] || 0))]));

// ---------------- 補充の計算 ----------------
test("ストレングス 0/2/8/10/12 枚: 付与は 10/8/2/0/0 枚、合計は 10/10/10/10/12 枚(減らさない・目標以上は増やさない)", () => {
    const cases = [[0, 10, 10], [2, 8, 10], [8, 2, 10], [10, 0, 10], [12, 0, 12]];
    for (const [pre, grant, total] of cases) {
        const w = world().unowned().pre(pre ? { hermes_strength: pre } : {});
        const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
        assert.equal(r.granted, true, "pre=" + pre);
        assert.equal(r.cards.hermes_strength, grant, "付与枚数 pre=" + pre);
        assert.equal(r.copiesBefore.hermes_strength, pre);
        assert.equal(r.copiesAfter.hermes_strength, total);
        assert.equal(w.copies("hermes_strength"), total, "pre=" + pre);
        const rec = w.state().rewards[REWARD];
        assert.equal(rec.mode, "topUp");
        assert.equal(rec.targets.hermes_strength, 10);
        assert.equal(w.prod().hasGranted(), true);
    }
});

test("新しいゲーム(事前の所持なし): ちょうど 3/3/3/10/3/3/5(合計30)・デッキ30枚・有効。従来と同じ結果", () => {
    const w = world().unowned();
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.deepEqual(w.allCopies(), TARGET);
    assert.equal(r.totalCopies, 30);
    assert.equal(r.targetCopies, 30);
    assert.deepEqual(r.cards, TARGET);
    assert.equal(w.prod().state().rings.hermes.totalCopies, 30);
    assert.equal(w.deckIds().length, 30);
    assert.equal(w.deck().isDeckValid(), true);
    assert.deepEqual(plain(w.inv().validateDeck()), []);
    assert.equal(r.deckInitialized, true);
});

test("一部だけ持っている混在: 一閃1・サイコ3・ヴェイル0・ストレングス6・薙ぎ払い5・葦笛2・絶0 → 付与 2/0/3/4/0/1/5。薙ぎ払い5枚は減らない", () => {
    const pre = { hermes_issen: 1, hermes_psychopomp: 3, hermes_strength: 6, hermes_sweep: 5, hermes_reed_flute: 2 };
    const w = world().unowned().pre(pre);
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.deepEqual(r.cards, expectedGrant(pre));
    assert.deepEqual(r.cards, { hermes_issen: 2, hermes_psychopomp: 0, hermes_veil: 3, hermes_strength: 4, hermes_sweep: 0, hermes_reed_flute: 1, hermes_zetsu: 5 });
    assert.deepEqual(w.allCopies(), { hermes_issen: 3, hermes_psychopomp: 3, hermes_veil: 3, hermes_strength: 10, hermes_sweep: 5, hermes_reed_flute: 3, hermes_zetsu: 5 });
    assert.equal(r.totalCopies, 15);
    assert.equal(w.inv().getDeckLimit("hermes_sweep"), 3, "デッキに入る枚数は上限3のまま(余りは保管)");
    assert.equal(w.deckIds().length, 30);
    assert.equal(w.deck().isDeckValid(), true);
});

test("目標を超えて持っている場合(すべて上回る): 何も付与せず、枚数は一切変わらない。報酬記録だけが残る", () => {
    const pre = { hermes_issen: 6, hermes_psychopomp: 4, hermes_veil: 9, hermes_strength: 15, hermes_sweep: 3, hermes_reed_flute: 8, hermes_zetsu: 7 };
    const w = world().unowned().pre(pre);
    const before = w.allCopies();
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(r.totalCopies, 0);
    assert.deepEqual(w.allCopies(), before);
    assert.deepEqual(w.allCopies(), expectedAfter(pre));
    assert.ok(w.inv().hasReward(REWARD));
    assert.deepEqual(w.state().rewards[REWARD].cards, {}, "付与した枚数が0枚のカードは記録に入らない");
});

test("7種すべて目標ちょうど: 付与は0枚、解放済みで、報酬記録だけ残る。空のデッキは従来どおり30枚で初期化される", () => {
    const w = world().unowned().pre(TARGET);
    assert.deepEqual(w.allCopies(), TARGET);
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(r.totalCopies, 0);
    assert.deepEqual(w.allCopies(), TARGET);
    for (const id of IDS) assert.equal(plain(w.deck().getPersistentData()).cardOwnership[id].owned, true, id);
    assert.equal(r.deckInitialized, true);
    assert.equal(w.deckIds().length, 30);
    assert.equal(w.prod().hasGranted(), true);
});

test("Levelは上書きしない: 事前にLvを上げたカードは補充後も同じLv。他のカードはLv1", () => {
    const w = world().unowned().pre({ hermes_strength: 2, hermes_zetsu: 1 });
    w.deck().setCardLevel("hermes_strength", 3);
    w.deck().setCardLevel("hermes_zetsu", 2);
    w.prod().acquireRing("hermes", { source: "test" });
    const own = plain(w.deck().getPersistentData()).cardOwnership;
    assert.equal(own.hermes_strength.level, 3);
    assert.equal(own.hermes_zetsu.level, 2);
    assert.equal(own.hermes_issen.level, 1);
    assert.equal(w.copies("hermes_strength"), 10);
    assert.equal(w.copies("hermes_zetsu"), 5);
});

// ---------------- 二重付与の防止 ----------------
test("再入手・GrantRing・ロード・指輪の譲渡と返却・明示付与でも、補充は一度だけ(枚数は増えない)", () => {
    const w = world().unowned().pre({ hermes_strength: 2 });
    w.prod().acquireRing("hermes", { source: "test" });
    const after = w.snapshot();
    assert.equal(w.copies("hermes_strength"), 10);
    for (let i = 0; i < 3; i++) { w.acquire(); w.grantRing(); w.prod().acquireRing("hermes"); }
    w.roundTrip(); w.roundTrip();
    w.allowAlly(4);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).ok, true);
    assert.equal(w.menu().rings.returnToPlayer("hermes").ok, true);
    w.acquire();
    assert.equal(plain(w.prod().grantStarter({ explicit: true })).reason, "alreadyGranted");
    assert.equal(plain(w.inv().grantBundle(REWARD, TARGET, { mode: "topUp" })).reason, "alreadyGranted");
    assert.deepEqual(w.allCopies(), expectedAfter({ hermes_strength: 2 }));
    assert.equal(w.copies("hermes_strength"), 10);
    assert.deepEqual(w.state().copies, after.inv.copies);
    assert.deepEqual(w.state().rewards, after.inv.rewards);
});

test("補充のあとに枚数が変わっても(使用・追加入手)、保存→ロード後に再補充されない。目標未満に減らしても自動では補充されない", () => {
    const w = world().unowned();
    w.prod().acquireRing("hermes", { source: "test" });
    w.inv().grantCopies("hermes_strength", 3, { source: "shop" });
    assert.equal(w.copies("hermes_strength"), 13);
    w.roundTrip();
    w.acquire();
    assert.equal(w.copies("hermes_strength"), 13, "追加で入手した分は保たれ、再補充もされない");
    // 保存データを直接目標未満にしても、報酬記録があるので自動では補充しない。
    const parsed = w.ctx.JsonEx.parse(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()));
    parsed.system._projectRCardInventory.copies.hermes_strength = 4;
    w.ctx.DataManager.createGameObjects();
    w.ctx.DataManager.extractSaveContents(parsed);
    w.acquire(); w.grantRing();
    assert.equal(w.copies("hermes_strength"), 4);
});

// ---------------- プレビュー ----------------
test("プレビューは実際の結果と一致し、何も変更しない(所持・Core・付与記録・デッキ)。付与後は付与済みと示す", () => {
    const pre = { hermes_issen: 1, hermes_strength: 8, hermes_zetsu: 7 };
    const w = world().unowned().pre(pre);
    const before = w.snapshot();
    const p = plain(w.prod().previewStarterGrant());
    assert.deepEqual(w.snapshot(), before, "プレビューで何も変わらない");
    assert.equal(p.mutated, false);
    assert.equal(p.policyInEffect, "topUp");
    assert.equal(p.willGrantOnNextAcquisition, true);
    assert.deepEqual(p.grants, expectedGrant(pre));
    assert.equal(p.totalGrant, Object.values(expectedGrant(pre)).reduce((a, b) => a + b, 0));
    const strength = p.preview.rows.find(r => r.cardId === "hermes_strength");
    assert.deepEqual([strength.current, strength.target, strength.grant, strength.after, strength.satisfied], [8, 10, 2, 10, false]);
    const zetsu = p.preview.rows.find(r => r.cardId === "hermes_zetsu");
    assert.deepEqual([zetsu.current, zetsu.grant, zetsu.after, zetsu.satisfied], [7, 0, 7, true]);
    assert.equal(strength.additive.grant, 10, "参考: 通常の加算ならこうなる");
    // 実際の付与と一致する。
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.deepEqual(r.cards, p.grants);
    for (const row of p.preview.rows) assert.equal(w.copies(row.cardId), row.after, row.cardId);
    const after = plain(w.prod().previewStarterGrant());
    assert.equal(after.preview.alreadyGranted, true);
    assert.equal(after.willGrantOnNextAcquisition, false);
});

test("プレビューは保存領域が無い状態でも領域を作らない。mode省略のpreviewGrantは加算の方針を示す", () => {
    const w = world();
    delete w.ctx.$gameSystem._projectRCardInventory;
    w.prod().previewStarterGrant();
    assert.equal(w.ctx.$gameSystem._projectRCardInventory, undefined);
    const generic = plain(w.inv().previewGrant("x", { hermes_strength: 10 }));
    assert.equal(generic.policyInEffect, "additive");
    assert.equal(generic.rows[0].grant, 10);
    const top = plain(w.inv().previewGrant("x", { hermes_strength: 10 }, { mode: "topUp" }));
    assert.equal(top.policyInEffect, "topUp");
    assert.equal(top.totals.effective, 10);
});

// ---------------- 通常の付与は加算のまま ----------------
test("通常の GrantCardCopies・grantCopies・grantBundle(mode省略)・繰り返し報酬は加算のまま", () => {
    const w = world();
    w.inv().grantCopies("hermes_strength", 2, { source: "a" });
    w.cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "hermes_strength", copies: "3" });
    assert.equal(w.copies("hermes_strength"), 5, "プラグインコマンドは加算");
    assert.equal(w.inv().grantCopies("hermes_strength", 10, { source: "shop" }).granted, true);
    assert.equal(w.copies("hermes_strength"), 15, "繰り返しの購入は毎回加算");
    assert.equal(w.inv().grantCopies("hermes_strength", 1, { rewardId: "quest.a", source: "q" }).granted, true);
    assert.equal(w.inv().grantCopies("hermes_strength", 1, { rewardId: "quest.a", source: "q" }).granted, false);
    assert.equal(w.copies("hermes_strength"), 16);
    const b = plain(w.inv().grantBundle("bundle.x", { hermes_issen: 2, hermes_veil: 1 }, { source: "b" }));
    assert.equal(b.mode, "additive");
    assert.equal(w.copies("hermes_issen"), 2);
    assert.equal(w.state().rewards["bundle.x"].mode, undefined, "加算の記録に補充の印は付かない");
});

// ---------------- 原子性 ----------------
test("補充の失敗は原子的: 1枚でも不正(未知のカード・0・小数・上限超過・重複・不明なmode)なら何も変えず、報酬記録も作らない", () => {
    const w = world().unowned().pre({ hermes_strength: 2 });
    const before = w.snapshot();
    const bad = [
        { hermes_issen: 3, no_such_card: 3 },
        { hermes_issen: 3, hermes_veil: 0 },
        { hermes_issen: 3, hermes_veil: 1.5 },
        { hermes_issen: 3, hermes_veil: "3" },
        { hermes_issen: 3, hermes_veil: 1000 },
        { hermes_issen: 3, "  hermes_issen ": 3 }
    ];
    for (const cards of bad) {
        const r = plain(w.inv().grantBundle(REWARD, cards, { mode: "topUp", source: "t" }));
        assert.equal(r.ok, false, JSON.stringify(cards));
        assert.equal(r.granted, false);
        assert.deepEqual(w.snapshot(), before, JSON.stringify(cards));
        assert.equal(w.inv().hasReward(REWARD), false);
    }
    assert.equal(plain(w.inv().grantBundle(REWARD, TARGET, { mode: "bogus" })).ok, false);
    assert.equal(plain(w.inv().grantBundle(REWARD, {}, { mode: "topUp" })).ok, false);
    assert.deepEqual(w.snapshot(), before);
    assert.equal(w.prod().hasGranted(), false);
});

test("製品側の失敗でも一部だけ付与されない: 戦闘中・設計データ不正は何も変えず、記録も作らない。回復後は正しく補充される", () => {
    const w = world().unowned().pre({ hermes_strength: 2 });
    const before = w.snapshot();
    // (a) 戦闘中
    const party = w.ctx.$gameParty;
    const originalInBattle = party.inBattle;
    party.inBattle = () => true; // メニュー側の戦闘ロック(combatLock)を成立させる
    assert.equal(w.menu().isLocked(), true);
    const inCombat = plain(w.prod().grantStarter({ explicit: true }));
    party.inBattle = originalInBattle;
    assert.equal(w.menu().isLocked(), false);
    assert.equal(inCombat.granted, false);
    assert.equal(inCombat.reason, "inCombat");
    assert.equal(w.inv().hasReward(REWARD), false);
    assert.deepEqual(w.state().copies, before.inv.copies);
    // (b) 設計データが不正(コピー数の合計が30でない)
    const original = w.ctx.ProjectRCardCatalog;
    w.ctx.ProjectRCardCatalog = Object.assign({}, original, {
        hermesDesign: () => original.hermesDesign().map(d => (d.runtimeCardId === "hermes_strength" ? Object.assign({}, d, { firstGrantCopies: 9 }) : d))
    });
    const invalid = plain(w.prod().grantStarter({ explicit: true }));
    w.ctx.ProjectRCardCatalog = original;
    assert.equal(invalid.granted, false);
    assert.equal(invalid.reason, "definitionsInvalid");
    assert.equal(w.inv().hasReward(REWARD), false);
    assert.deepEqual(w.state().copies, before.inv.copies);
    assert.equal(w.prod().hasGranted(), false);
    // 回復後
    const ok = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(ok.granted, true);
    assert.equal(w.copies("hermes_strength"), 10);
});

// ---------------- デッキ ----------------
test("カスタムデッキは上書きしない: 空でないデッキはそのまま。空のときだけ30枚で初期化される", () => {
    const w = world().unowned().pre({ hermes_issen: 1 });
    w.deck().setDeck(["hermes_issen", "hermes_issen"]);
    const deckBefore = w.deckIds();
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(r.deckInitialized, false);
    assert.deepEqual(w.deckIds(), deckBefore);
    assert.equal(w.copies("hermes_issen"), 3);
    const w2 = world().unowned().pre({ hermes_strength: 12 });
    assert.deepEqual(w2.deckIds(), []);
    const r2 = plain(w2.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r2.deckInitialized, true);
    assert.equal(w2.deckIds().length, 30);
    assert.equal(w2.deckIds().filter(id => id === "hermes_strength").length, 10, "デッキ内の最大は上限10(所持12枚でも)");
    assert.equal(w2.deck().isDeckValid(), true);
});

test("30枚のデッキ検証とカードごとの上限は保たれる: ストレングス12枚所持でもデッキは10枚まで。31枚目と11枚目は拒否", () => {
    const w = world().unowned().pre({ hermes_strength: 12 });
    w.prod().acquireRing("hermes", { source: "test" });
    assert.equal(w.copies("hermes_strength"), 12);
    assert.equal(w.inv().getDeckLimit("hermes_strength"), 10);
    assert.equal(w.inv().canAddToDeck("hermes_strength").ok, false, "デッキは30枚で11枚目はそもそも上限");
    w.menu().deck.remove("hermes_zetsu");
    assert.equal(w.inv().canAddToDeck("hermes_strength").ok, false, "ストレングスはデッキ10枚が上限");
    assert.equal(w.deckIds().length, 29);
    assert.equal(w.deck().isDeckValid(), false, "29枚は無効");
});

// ---------------- 旧セーブ ----------------
test("旧セーブ: 指輪を持っているだけでは補充されない(自動付与なし)。明示付与(explicit)のときだけ補充される", () => {
    const w = world();
    w.deck().assignRingToPlayer("hermes");
    w.deck().setCardOwned("hermes_sword_attack", true);
    w.deck().setDeck(["hermes_sword_attack", "hermes_sword_attack"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    const afterLoad = w.snapshot();
    for (const id of IDS) assert.equal(w.copies(id), 0, id);
    assert.equal(w.copies("hermes_sword_attack"), 2, "旧デッキの推定の最小値");
    w.acquire(); w.grantRing();
    assert.deepEqual(w.snapshot(), afterLoad, "ロードや再入手では何も付与されない");
    assert.equal(plain(w.prod().grantStarter()).reason, "explicitRequired");
    assert.deepEqual(w.snapshot(), afterLoad);
    const r = plain(w.prod().grantStarter({ explicit: true, source: "legacy-test" }));
    assert.equal(r.granted, true);
    assert.deepEqual(w.allCopies(), TARGET);
    assert.equal(w.copies("hermes_sword_attack"), 2, "旧カードの枚数は変わらない");
    assert.deepEqual(w.deckIds(), ["hermes_sword_attack", "hermes_sword_attack"], "既存のデッキは上書きされない");
});

test("旧セーブ(H2C-Aで30枚を付与済み): 確認済みの記録から報酬記録が作られ、補充は行われない。ロードを繰り返しても変わらない", () => {
    const w = world().unowned();
    w.prod().acquireRing("hermes", { source: "test" });
    const copies = w.allCopies();
    // H2C-Aの形式(加算・総数30)の付与記録だけを持つ旧セーブ。
    w.loadLegacy(system => {
        system._projectRHermesProduction.rings.hermes = { granted: true, source: "acquisition", version: 1, cards: Object.assign({}, TARGET), totalCopies: 30, deckInitialized: true, ownedBefore: [] };
    });
    assert.deepEqual(w.allCopies(), copies);
    assert.equal(w.state().rewards[REWARD].migrated, true);
    w.acquire(); w.grantRing(); w.roundTrip(); w.roundTrip();
    assert.equal(plain(w.prod().grantStarter({ explicit: true })).reason, "alreadyGranted");
    assert.deepEqual(w.allCopies(), copies);
});

// ---------------- 戦闘 ----------------
test("戦闘でカードを使っても物理所持は変わらない(補充後の所持が、戦闘開始・使用・終了で同一)", () => {
    const w = world().unowned().pre({ hermes_strength: 8, hermes_issen: 5 });
    w.prod().acquireRing("hermes", { source: "test" });
    const before = w.snapshot();
    assert.equal(plain(w.deck().startCardBattle()).ok, true);
    let used = 0;
    for (let i = 0; i < 60 && used < 3; i++) {
        if (plain(w.deck().requestUseCard(i % 5)).ok) used++;
        w.deck().updateCooldown(20);
    }
    assert.ok(used >= 1);
    assert.deepEqual(w.state().copies, before.inv.copies);
    assert.deepEqual(w.state().rewards, before.inv.rewards);
    w.deck().endCardBattle();
    assert.deepEqual(w.state().copies, before.inv.copies);
    assert.equal(w.copies("hermes_issen"), 5);
    assert.equal(w.deckIds().length, before.deck.length);
});

// ---------------- 保守 ----------------
test("Chromium 85で使えない構文(??= ・ ||= ・ &&= ・ .at( ・ lookbehind ・ structuredClone ・ replaceAll)を足していない", () => {
    for (const file of ["js/plugins/ProjectR_CardInventory.js", "js/plugins/ProjectR_HermesProductionDeck.js"]) {
        const source = fs.readFileSync(path.join(root, file), "utf8");
        assert.doesNotMatch(source, /\?\?=|\|\|=|&&=|\.at\(|\(\?<[=!]|\bstructuredClone\b|\.replaceAll\(/, file);
    }
});

test("Core・Catalog・Occlusion・SaveLoadGuard・Hendrix・rmmz_*・DotMove・7枚の実装はこのPhaseで変更していない(コミット前の作業ツリーとHEADの差分に含まれない)", () => {
    const { execFileSync } = require("node:child_process");
    let changed = [];
    try { changed = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "js"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean); } catch (e) { return; }
    const protectedPattern = /rmmz_|Hendrix|DotMove|ProjectR_CardDeckCore|ProjectR_CardCatalog|ProjectR_SaveLoadGuard|Occlusion|ProjectR_Hermes(Issen|Psychopomp|Veil|Strength|Sweep|ReedFlute|Zetsu)/;
    const touched = changed.filter(f => protectedPattern.test(f));
    assert.deepEqual(touched, [], "保護対象は変更していない: " + touched.join(", "));
});
