"use strict";
// Phase H2C-B2: カードの実際の所持コピー数(OwnedCopies)・デッキ内の枚数・コピー上限と、旧セーブの安全な移行。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map004)で動かす。MZの描画・音はstub。
// 実機(NW.js)での確認は tools/mz_cdp/h2cb2_verify.cjs。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const crypto = require("node:crypto");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const root = path.join(__dirname, "..");

const STARTER = [
    ["hermes_issen", 3], ["hermes_psychopomp", 3], ["hermes_veil", 3], ["hermes_strength", 10],
    ["hermes_sweep", 3], ["hermes_reed_flute", 3], ["hermes_zetsu", 5]
];
const IDS = STARTER.map(row => row[0]);
const LEGACY = ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack"];
const APOLLO = ["apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];

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
    w.grantRing = (ringId = "hermes") => w.cmd("ProjectR_MenuIntegration", "GrantRing", { ringId });
    w.acquire = () => w.cmd("ProjectR_HermesProductionDeck", "AcquireHermesRing");
    w.copies = id => w.inv().getOwnedCopies(id);
    w.total = () => plain(w.inv().diagnostics()).totalCopies;
    w.state = () => plain(w.inv().state());
    w.deckIds = () => plain(w.deck().getDeck());
    w.roundTrip = () => {
        const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
        return json;
    };
    // 旧セーブ(所持枚数の領域が無い保存)として読み込む。mutateは保存内容(Game_System)を書き換えて「旧い形」にする。
    w.loadLegacy = mutate => {
        const parsed = w.ctx.JsonEx.parse(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()));
        delete parsed.system._projectRCardInventory;
        if (mutate) mutate(parsed.system);
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(parsed);
    };
    w.afterCombat = () => { w.ctx.Graphics.frameCount = (Number(w.ctx.Graphics.frameCount) || 0) + 120; w.frames(10); };
    w.allowAlly = actorId => {
        const ring = w.deck().definitions.ring("hermes");
        w.deck().definitions.rings.set("hermes", Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
    };
    return w;
}
const codes = list => plain(list).map(r => r.code);

// ---------------- 物理所持の基本ルール ----------------
test("デッキに入れられる最大 = min(所持枚数, コピー上限)。ストレングス(上限10)で 0/1/5/10/15", () => {
    for (const [owned, expectDeck] of [[0, 0], [1, 1], [5, 5], [10, 10], [15, 10]]) {
        const w = world();
        const d = w.deck(), core = w.menu();
        d.assignRingToPlayer("hermes");
        if (owned > 0) assert.equal(w.inv().grantCopies("hermes_strength", owned, { source: "test" }).ok, true);
        assert.equal(w.copies("hermes_strength"), owned);
        assert.equal(w.inv().getMaxDeckCopies("hermes_strength"), 10);
        assert.equal(w.inv().getDeckLimit("hermes_strength"), expectDeck, `所持${owned}`);
        let added = 0, last = null;
        for (let i = 0; i < 16; i++) { last = core.deck.add("hermes_strength"); if (last.ok) added++; }
        assert.equal(added, expectDeck, `所持${owned}: 追加できた枚数`);
        assert.equal(w.copies("hermes_strength"), owned, "デッキ編集は所持を変えない(余った枚数も保存されたまま)");
        if (owned === 0) assert.equal(last.reason, "CARD_NOT_OWNED");
        else assert.equal(last.reason, owned >= 10 ? "MAX_COPIES_EXCEEDED" : "CARD_COPIES_EXCEEDS_OWNED");
    }
});

test("6枚目の拒否: 所持5枚のストレングスは5枚まで。理由は日本語で出て、もう1枚入手すると追加できる", () => {
    const w = world();
    const core = w.menu();
    w.deck().assignRingToPlayer("hermes");
    w.inv().grantCopies("hermes_strength", 5, { source: "test" });
    for (let i = 0; i < 5; i++) assert.equal(core.deck.add("hermes_strength").ok, true);
    const sixth = core.deck.add("hermes_strength");
    assert.equal(sixth.ok, false);
    assert.equal(sixth.reason, "CARD_COPIES_EXCEEDS_OWNED");
    assert.match(sixth.message, /所持枚数を超えています：ストレングス（所持5枚・デッキ6枚）/);
    const detail = plain(w.inv().canAddToDeck("hermes_strength"));
    assert.equal(detail.ok, false);
    assert.deepEqual(detail.reasons.map(r => [r.code, r.owned, r.actual, r.maximum]), [["CARD_COPIES_EXCEEDS_OWNED", 5, 6, 5]]);
    w.inv().grantCopies("hermes_strength", 1, { source: "test" });
    assert.equal(core.deck.add("hermes_strength").ok, true, "もう1枚入手すると入る");
    assert.equal(w.inv().getDeckCopies("hermes_strength"), 6);
});

test("デッキの追加・削除・全消去は所持枚数を変えない。外したカードは消えない", () => {
    const w = world();
    const core = w.menu();
    w.grantRing(); w.acquire();
    const before = w.state().copies;
    core.deck.clear();
    assert.deepEqual(w.state().copies, before);
    for (let i = 0; i < 4; i++) core.deck.add("hermes_strength");
    for (let i = 0; i < 2; i++) core.deck.remove("hermes_strength");
    assert.deepEqual(w.state().copies, before);
    assert.equal(w.copies("hermes_strength"), 10);
});

test("不正な数量は付与できず、状態が変わらない(0・負・小数・NaN・文字列・未知のカード)", () => {
    const w = world();
    const before = w.state();
    for (const bad of [0, -1, 1.5, NaN, Infinity, "3", null, undefined, {}, 1000]) {
        const r = plain(w.inv().grantCopies("hermes_strength", bad, { source: "test" }));
        assert.equal(r.ok, false, String(bad));
    }
    assert.equal(plain(w.inv().grantCopies("no_such_card", 1)).reason, "INVALID_CARD_ID");
    assert.deepEqual(w.state(), before);
    // 一括付与は原子的: 1つでも不正なら何も変わらない
    const bundle = plain(w.inv().grantBundle("r1", { hermes_strength: 2, hermes_issen: 0 }, { source: "test" }));
    assert.equal(bundle.ok, false);
    assert.deepEqual(w.state(), before);
});

// ---------------- 付与API ----------------
test("報酬IDつきの付与は一度だけ。別の報酬IDは別に加算。IDなし(ショップ購入)は毎回加算", () => {
    const w = world();
    const inv = w.inv();
    const a = plain(inv.grantCopies("hermes_issen", 2, { rewardId: "boss.1", source: "boss" }));
    assert.deepEqual([a.ok, a.granted, a.copies], [true, true, 2]);
    const again = plain(inv.grantCopies("hermes_issen", 2, { rewardId: "boss.1", source: "boss" }));
    assert.deepEqual([again.ok, again.granted, again.reason], [true, false, "alreadyGranted"]);
    assert.equal(w.copies("hermes_issen"), 2);
    assert.equal(plain(inv.grantCopies("hermes_issen", 1, { rewardId: "boss.2" })).granted, true);
    assert.equal(w.copies("hermes_issen"), 3);
    for (let i = 0; i < 3; i++) assert.equal(plain(inv.grantCopies("hermes_issen", 1, { source: "shop" })).granted, true);
    assert.equal(w.copies("hermes_issen"), 6, "報酬IDなしは購入のたびに増える");
    assert.equal(inv.hasReward("boss.1"), true);
    assert.equal(inv.hasReward("shop"), false);
    // 報酬IDも保存される(ロード後も二重付与されない)
    w.roundTrip();
    assert.equal(w.inv().hasReward("boss.2"), true);
    assert.equal(plain(w.inv().grantCopies("hermes_issen", 5, { rewardId: "boss.2" })).granted, false);
    assert.equal(w.copies("hermes_issen"), 6);
    // プラグインコマンド
    w.cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "hermes_sweep", copies: "2", rewardId: "npc.a" });
    w.cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "hermes_sweep", copies: "2", rewardId: "npc.a" });
    w.cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "hermes_sweep", copies: "1", rewardId: "" });
    w.cmd("ProjectR_CardInventory", "GrantCardCopies", { cardId: "hermes_sweep", copies: "1", rewardId: "" });
    assert.equal(w.copies("hermes_sweep"), 4);
});

test("旧来の「解放だけ」(setCardOwned・GrantCard)は枚数を増やさない: 最小1枚。何度呼んでも増えない。解除しても枚数は残る", () => {
    const w = world();
    const d = w.deck();
    assert.equal(w.copies("hermes_sweep"), 0);
    for (let i = 0; i < 4; i++) d.setCardOwned("hermes_sweep", true);
    w.cmd("ProjectR_MenuIntegration", "GrantCard", { cardId: "hermes_sweep" });
    w.cmd("ProjectR_MenuIntegration", "GrantCard", { cardId: "hermes_sweep", level: "2" });
    assert.equal(w.copies("hermes_sweep"), 1);
    w.inv().grantCopies("hermes_sweep", 2, { source: "test" });
    d.setCardOwned("hermes_sweep", true);
    assert.equal(w.copies("hermes_sweep"), 3, "解放のやり直しで枚数は変わらない");
    d.setCardOwned("hermes_sweep", false);
    assert.equal(w.copies("hermes_sweep"), 3, "未解放にしても枚数は消えない");
    assert.equal(plain(w.inv().diagnostics()).cards.find(c => c.cardId === "hermes_sweep").basis, "legacyUnlockOnly");
});

// ---------------- Hermesの初期30枚 ----------------
test("新しいゲームから AcquireHermesRing: ちょうど 3/3/3/10/3/3/5(合計30)・デッキ30枚・有効・Levelは1", () => {
    const w = world();
    w.ctx.DataManager._globalInfo = [];
    w.ctx.DataManager.setupNewGame();
    w.frames(2);
    assert.equal(w.total(), 0);
    assert.equal(w.deck().getRingOwner("hermes"), "unowned");
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(w.prod().hasGranted(), true);
    for (const [id, n] of STARTER) assert.equal(w.copies(id), n, id);
    assert.equal(w.total(), 30);
    assert.equal(w.deckIds().length, 30);
    assert.equal(w.deck().isDeckValid(), true, JSON.stringify(plain(w.deck().getDeckInvalidReasons())));
    assert.deepEqual(plain(w.inv().validateDeck()), []);
    const persistent = plain(w.deck().getPersistentData());
    for (const id of IDS) assert.deepEqual(persistent.cardOwnership[id], { owned: true, level: 1 }, id);
    assert.ok(w.inv().hasReward("hermes.ring.starter"));
    assert.equal(w.state().rewards["hermes.ring.starter"].total, 30);
});

test("既存のプラグインコマンド「指輪を主人公に入手させる」(GrantRing)でも、初回だけ同じ30枚。2回目は増えない", () => {
    const w = world();
    assert.equal(w.total(), 0);
    w.grantRing();
    for (const [id, n] of STARTER) assert.equal(w.copies(id), n, id);
    assert.equal(w.total(), 30);
    w.grantRing(); w.acquire();
    assert.equal(w.total(), 30);
});

test("再入手・ロード・指輪の譲渡と返却・別経路の再入手でも、物理コピーは増えない", () => {
    const w = world();
    const got = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(got.granted, true);
    const snapshot = w.state().copies;
    assert.equal(w.total(), 30);
    for (let i = 0; i < 3; i++) { w.acquire(); w.grantRing(); w.prod().acquireRing("hermes"); }
    w.roundTrip(); w.roundTrip();
    assert.deepEqual(w.state().copies, snapshot);
    w.allowAlly(4);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).ok, true);
    assert.equal(w.menu().rings.returnToPlayer("hermes").ok, true);
    w.acquire();
    assert.deepEqual(w.state().copies, snapshot);
    assert.equal(plain(w.prod().grantStarter({ explicit: true })).reason, "alreadyGranted");
    assert.deepEqual(w.state().copies, snapshot);
});

test("すでに独立して持っているコピーは減らさず、重ならない: 事前に持っていたストレングス2枚の上に初期10枚が加わる(12枚)。カードLevelは保たれる", () => {
    const w = world();
    w.inv().grantCopies("hermes_strength", 2, { source: "earlier" });
    w.deck().setCardLevel("hermes_strength", 2);
    w.deck().setRingUnowned("hermes");
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(w.copies("hermes_strength"), 12);
    assert.equal(w.copies("hermes_issen"), 3);
    assert.equal(r.copiesBefore.hermes_strength, 2);
    assert.equal(plain(w.deck().getPersistentData()).cardOwnership.hermes_strength.level, 2, "Levelは下げない");
    assert.equal(w.deck().getDeck().length, 30);
    assert.equal(w.deck().isDeckValid(), true);
});

test("既存のカスタムデッキは上書きしない。空のデッキだけ30枚で初期化する", () => {
    const w = world();
    w.inv().grantCopies("hermes_issen", 1, { source: "earlier" });
    w.deck().setDeck(["hermes_issen"]);
    w.deck().setRingUnowned("hermes");
    const r = plain(w.prod().acquireRing("hermes", { source: "test" }));
    assert.equal(r.granted, true);
    assert.equal(r.deckInitialized, false);
    assert.deepEqual(w.deckIds(), ["hermes_issen"]);
});

test("リングの譲渡でカードは無効になるが所持は消えない。返すと有効に戻り、コピーは増えない", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    const before = w.state().copies;
    w.allowAlly(4);
    assert.equal(w.menu().rings.transferToActor("hermes", 4).ok, true);
    assert.deepEqual(w.state().copies, before);
    const reasons = codes(w.deck().getDeckInvalidReasons());
    assert.equal(reasons.length, 30);
    assert.ok(reasons.every(c => c === "REQUIRED_RING_NOT_OWNED"), "所持枚数の理由は出ない(枚数は足りている)");
    assert.equal(w.deckIds().length, 30, "デッキは削除されない");
    assert.equal(w.menu().rings.returnToPlayer("hermes").ok, true);
    assert.deepEqual(w.state().copies, before);
    assert.equal(w.deck().isDeckValid(), true);
});

test("Hermes・Apolloが混在: Apolloは別に実コピーを持つ。Hermesの30枚には影響しない", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    w.deck().assignRingToPlayer("apollo");
    for (const id of APOLLO) w.inv().grantCopies(id, w.deck().definitions.card(id).maxCopies, { source: "test" });
    assert.equal(w.total(), 30 + 3 + 2 + 3);
    for (const [id, n] of STARTER) assert.equal(w.copies(id), n);
    const core = w.menu();
    for (let i = 0; i < 5; i++) core.deck.remove("hermes_strength");
    for (let i = 0; i < 3; i++) core.deck.remove("hermes_zetsu");
    for (const id of ["apollo_golden_arrow", "apollo_golden_arrow", "apollo_golden_arrow", "apollo_plague_attack", "apollo_plague_attack",
        "apollo_lyre_calm", "apollo_lyre_calm", "apollo_lyre_calm"]) assert.equal(core.deck.add(id).ok, true, id);
    assert.equal(w.deck().isDeckValid(), true);
    assert.equal(core.deck.add("apollo_lyre_calm").ok, false);
});

// ---------------- 戦闘・Level ----------------
test("戦闘でカードを使っても物理所持は減らない。山札・手札・捨て札は戦闘中だけの状態", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    const before = w.state();
    const started = plain(w.deck().startCardBattle());
    assert.equal(started.ok, true, JSON.stringify(started));
    let used = 0;
    // 手札は乱数で決まり、方向・位置が必要なカードはこのテストでは発動に失敗する。使えたカードが3枚になるまで(最大60回)試す。
    const usedIds = [];
    for (let i = 0; i < 60 && used < 3; i++) {
        const hand = plain(w.deck().getBattleState()).hand;
        const r = plain(w.deck().requestUseCard(i % 5));
        if (r.ok) { used++; usedIds.push(hand[i % 5].cardId); }
        w.deck().updateCooldown(20);
    }
    assert.ok(used >= 1, "少なくとも1枚は使えた: " + JSON.stringify(usedIds));
    assert.deepEqual(w.state().copies, before.copies);
    assert.deepEqual(w.state().rewards, before.rewards);
    w.deck().endCardBattle();
    assert.deepEqual(w.state().copies, before.copies);
    assert.equal(w.deckIds().length, 30);
});

test("カードLevelは種類ごとに共通: 複数枚持っていてもLevelは1つ。強化しても所持枚数は変わらない", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    const before = w.state().copies;
    for (const level of [2, 3, 1, 3]) {
        assert.equal(w.deck().setCardLevel("hermes_strength", level).ok, true);
        assert.deepEqual(w.state().copies, before);
        assert.equal(plain(w.deck().getPersistentData()).cardOwnership.hermes_strength.level, level);
    }
    assert.equal(plain(w.menu().deck.collection()).find(e => e.cardId === "hermes_strength").level, 3);
});

// ---------------- 保存・ロード ----------------
test("セーブ→ロードで、所持枚数・報酬記録・デッキ・Levelがそのまま戻る。ロードを繰り返しても増えない", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    w.inv().grantCopies("hermes_issen", 4, { rewardId: "boss.x" });
    w.deck().setCardLevel("hermes_zetsu", 3);
    const before = { inv: w.state(), deck: w.deckIds(), core: plain(w.deck().getPersistentData()) };
    for (let i = 0; i < 3; i++) w.roundTrip();
    assert.deepEqual(w.state(), before.inv);
    assert.deepEqual(w.deckIds(), before.deck);
    assert.deepEqual(plain(w.deck().getPersistentData()), before.core);
    assert.equal(before.inv.schema, 1);
});

// ---------------- 旧セーブの移行 ----------------
test("旧セーブ: 解放済みでデッキに無いカードは最小1枚。デッキの無いカードは増やさない", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    for (const id of ["hermes_sword_attack", "hermes_swift_movement"]) d.setCardOwned(id, true);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    assert.equal(w.copies("hermes_sword_attack"), 1);
    assert.equal(w.copies("hermes_swift_movement"), 1);
    assert.equal(w.copies("hermes_zetsu"), 0, "未解放のカードは0のまま");
    const s = w.state();
    assert.equal(s.legacy.source, "legacy");
    assert.equal(s.legacy.reconstructed.hermes_sword_attack.basis, "reconstructedMinimum");
    assert.ok(codes(s.legacy.diagnostics).includes("RECONSTRUCTED_MINIMUM"));
});

test("旧セーブ: 複数枚のデッキは max(1, デッキ内の枚数) 枚以上になり、旧デッキが有効のまま残る。並びも保たれる", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes"); d.assignRingToPlayer("apollo");
    const legacy = [["hermes_swift_movement", 3], ["hermes_reed_flute_sleep", 2], ["hermes_perception_obscure", 3], ["hermes_sword_attack", 3],
        ["apollo_golden_arrow", 3], ["apollo_plague_attack", 2], ["apollo_lyre_calm", 3]];
    const ids = [];
    for (const [id, n] of legacy) { d.setCardOwned(id, true); d.setCardLevel(id, 2); for (let i = 0; i < n; i++) ids.push(id); }
    d.setDeck(ids);
    const beforeDeck = w.deckIds();
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    for (const [id, n] of legacy) { assert.equal(w.copies(id), n, id); assert.equal(plain(w.deck().getPersistentData()).cardOwnership[id].level, 2); }
    assert.deepEqual(w.deckIds(), beforeDeck, "旧デッキは削除・並べ替え・切り詰めをしない");
    assert.deepEqual(plain(w.inv().validateDeck()), [], "所持枚数の検証は満たす");
    assert.deepEqual(codes(w.deck().getDeckInvalidReasons()), ["INVALID_DECK_SIZE"], "19枚=従来どおり30枚に足りないだけ");
    for (const id of IDS) assert.equal(w.copies(id), 0, "新Hermesのカードは付与しない");
});

test("旧セーブ: H2C-Aの付与記録が確認できれば、その7種30枚が所持枚数になる(指輪だけでは付与しない)", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    const deckBefore = w.deckIds();
    w.loadLegacy();
    for (const [id, n] of STARTER) assert.equal(w.copies(id), n, id);
    assert.equal(w.total(), 30);
    assert.deepEqual(w.deckIds(), deckBefore);
    assert.equal(w.deck().isDeckValid(), true);
    const s = w.state();
    assert.equal(s.legacy.reconstructed.hermes_zetsu.basis, "verifiedGrant");
    assert.ok(codes(s.legacy.diagnostics).includes("VERIFIED_GRANT_USED"));
    assert.equal(s.rewards["hermes.ring.starter"].migrated, true);
    assert.equal(plain(w.prod().acquireRing("hermes")).granted, false);
    assert.equal(plain(w.prod().grantStarter({ explicit: true })).reason, "alreadyGranted");
    assert.equal(w.total(), 30, "再取得しても増えない");
    // 付与記録を持たない旧セーブ(指輪だけ): 付与しない
    const v = world();
    v.deck().assignRingToPlayer("hermes");
    v.loadLegacy();
    assert.equal(v.total(), 0);
    assert.ok(codes(v.state().legacy.diagnostics).includes("RING_WITHOUT_GRANT_RECORD"));
    assert.equal(v.prod().hasGranted(), false);
});

test("旧セーブ: 付与記録が壊れている・30枚でない場合は使わない(推定の最小値にする)", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    w.loadLegacy(system => { system._projectRHermesProduction.rings.hermes.cards.hermes_strength = 3; });
    assert.ok(codes(w.state().legacy.diagnostics).includes("GRANT_RECORD_UNVERIFIED"));
    assert.equal(w.copies("hermes_strength"), 10, "デッキ内の枚数(10)を下回らない");
    assert.equal(w.copies("hermes_issen"), 3, "デッキ内の枚数");
    assert.equal(w.state().legacy.reconstructed.hermes_issen.basis, "reconstructedMinimum");
});

test("旧セーブ: 未解放なのにデッキにあるカードは、デッキを残し所持0のまま診断に出す(勝手に解放しない)", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_sword_attack", true);
    d.setDeck(["hermes_sword_attack", "hermes_zetsu", "hermes_zetsu"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    assert.deepEqual(w.deckIds(), ["hermes_sword_attack", "hermes_zetsu", "hermes_zetsu"]);
    assert.equal(w.copies("hermes_zetsu"), 0);
    assert.equal(w.deck().isCardOwned("hermes_zetsu"), false, "解放されない");
    const diag = plain(w.state().legacy.diagnostics).find(x => x.code === "LOCKED_CARD_IN_DECK");
    assert.equal(diag.cardId, "hermes_zetsu");
    assert.equal(diag.deckCopies, 2);
    const reasons = codes(w.deck().getDeckInvalidReasons());
    assert.ok(reasons.includes("CARD_NOT_OWNED"));
    assert.ok(reasons.includes("CARD_COPIES_EXCEEDS_OWNED"));
});

test("旧セーブ: 未知のカードIDはデッキと所持記録の両方を残し、診断に出す。メタデータは作らない", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_sword_attack", true);
    d.setDeck(["hermes_sword_attack", "ghost_card", "ghost_card"]);
    w.loadLegacy(system => {
        delete system._projectRHermesProduction;
        system._projectRCardDeckData.cardOwnership.ghost_card = { owned: true, level: 2, extra: "keep" };
    });
    assert.deepEqual(w.deckIds(), ["hermes_sword_attack", "ghost_card", "ghost_card"]);
    const s = w.state();
    assert.deepEqual(s.legacy.unknownOwnership.ghost_card, { owned: true, level: 2, extra: "keep" });
    assert.ok(codes(s.legacy.diagnostics).includes("UNKNOWN_CARD_IN_DECK"));
    assert.ok(codes(s.legacy.diagnostics).includes("UNKNOWN_OWNERSHIP_PRESERVED"));
    assert.equal(w.copies("ghost_card"), 0);
    assert.equal(w.deck().definitions.card("ghost_card"), null, "定義を作らない");
    // 次のセーブ/ロードでも残る
    w.roundTrip();
    assert.deepEqual(w.state().legacy.unknownOwnership.ghost_card, { owned: true, level: 2, extra: "keep" });
    assert.deepEqual(w.deckIds(), ["hermes_sword_attack", "ghost_card", "ghost_card"]);
});

test("移行は一度だけ(冪等): 同じ旧セーブを何度ロードしても、ロード→セーブを繰り返しても結果は同じ。確認済みの枚数は壊れない", () => {
    const w = world();
    const d = w.deck();
    d.assignRingToPlayer("hermes");
    d.setCardOwned("hermes_sword_attack", true);
    d.setDeck(["hermes_sword_attack", "hermes_sword_attack"]);
    w.loadLegacy(system => { delete system._projectRHermesProduction; });
    const once = w.state();
    assert.equal(w.copies("hermes_sword_attack"), 2);
    for (let i = 0; i < 4; i++) w.roundTrip();
    assert.deepEqual(w.state(), once);
    w.inv().grantCopies("hermes_sword_attack", 5, { source: "test" });
    const granted = w.copies("hermes_sword_attack");
    w.roundTrip();
    assert.equal(w.copies("hermes_sword_attack"), granted, "移行後に増やした枚数は、再ロードで推定値に戻らない");
});

test("不正な枚数(負・小数・NaN)が保存に入っていても、取り除いて元の値を残し、診断に出す", () => {
    const w = world();
    w.inv().grantCopies("hermes_issen", 3, { source: "test" });
    w.roundTrip();
    const parsed = w.ctx.JsonEx.parse(w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents()));
    parsed.system._projectRCardInventory.copies.hermes_sweep = -2;
    parsed.system._projectRCardInventory.copies.hermes_veil = 1.5;
    parsed.system._projectRCardInventory.copies.hermes_zetsu = "9";
    w.ctx.DataManager.createGameObjects();
    w.ctx.DataManager.extractSaveContents(parsed);
    for (const id of ["hermes_sweep", "hermes_veil", "hermes_zetsu"]) assert.equal(w.copies(id), 0, id);
    assert.equal(w.copies("hermes_issen"), 3);
    const s = w.state();
    assert.deepEqual(s.legacy.invalid, { hermes_sweep: -2, hermes_veil: 1.5, hermes_zetsu: "9" });
    assert.equal(codes(s.legacy.diagnostics).filter(c => c === "INVALID_COPIES_REMOVED").length, 3);
    w.roundTrip();
    assert.equal(codes(w.state().legacy.diagnostics).filter(c => c === "INVALID_COPIES_REMOVED").length, 3, "診断が増え続けない");
});

test("DEV固定デッキ(アリーナ)の間だけ所持枚数の検証を外し、終了時に保存領域を元へ戻す", () => {
    const w = world();
    w.deck().assignRingToPlayer("hermes");
    w.inv().grantCopies("hermes_issen", 1, { source: "test" });
    const before = w.state();
    w.inv().beginFixture();
    w.deck().setCardOwned("hermes_sweep", true);
    assert.equal(codes(w.deck().getDeckInvalidReasons(["hermes_issen", "hermes_issen"])).includes("CARD_COPIES_EXCEEDS_OWNED"), false);
    w.inv().endFixture();
    assert.deepEqual(w.state(), before);
    assert.equal(codes(w.deck().getDeckInvalidReasons(["hermes_issen", "hermes_issen"])).includes("CARD_COPIES_EXCEEDS_OWNED"), true);
});

test("診断は読み取り専用: 内訳(所持/デッキ/上限/根拠)を返し、状態を変えない", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    const before = w.state();
    const report = plain(w.inv().diagnostics());
    const strength = report.cards.find(c => c.cardId === "hermes_strength");
    assert.deepEqual([strength.ownedCopies, strength.deckCopies, strength.maxDeckCopies, strength.deckLimit, strength.unlocked], [10, 10, 10, 10, true]);
    assert.equal(report.totalCopies, 30);
    assert.deepEqual(plain(w.inv().deckReport()).filter(r => !r.ok), []);
    assert.deepEqual(w.state(), before);
});

// ---------------- 画面(モデル) ----------------
test("デッキ構築のモデル: 一覧の各カードが 所持/デッキ/上限 を持つ。表示文字列の素材が揃っている", () => {
    const w = world();
    w.deck().setRingUnowned("hermes");
    w.prod().acquireRing("hermes", { source: "test" });
    w.menu().deck.clear();
    const core = w.menu();
    for (let i = 0; i < 5; i++) core.deck.add("hermes_strength");
    const entries = plain(core.deck.collection());
    const strength = entries.find(e => e.cardId === "hermes_strength");
    assert.deepEqual([strength.info.name, strength.ownedCopies, strength.copiesInDeck, strength.maxCopies, strength.deckLimit], ["ストレングス", 10, 5, 10, 10]);
    assert.equal(entries.length >= 7, true);
});

// ---------------- 互換・保護 ----------------
test("Chromium 85で使えない構文を、新しいプラグインに使っていない", () => {
    const source = fs.readFileSync(path.join(root, "js/plugins/ProjectR_CardInventory.js"), "utf8");
    for (const [pattern, name] of [[/\?\?=|\|\|=|&&=/, "論理代入"], [/\.at\(/, "Array.at"], [/replaceAll\(/, "replaceAll"], [/Object\.hasOwn\(/, "Object.hasOwn"],
        [/structuredClone\(/, "structuredClone"], [/#[A-Za-z_]+\s*[=;(]/, "private field"], [/static\s*\{/, "static block"], [/\bawait\s+import\(/, "dynamic import"]]) {
        assert.doesNotMatch(source, pattern, name);
    }
});

test("CardDeckCore・CardCatalog・Occlusion・SaveLoadGuard・Hendrix・rmmz_objects/managers・DotMoveは、このPhaseで変更していない", () => {
    const out = cp.execFileSync("git", ["diff", "--name-only", "HEAD", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_VisionOcclusion.js",
        "js/plugins/ProjectR_CombatOcclusion.js", "js/plugins/ProjectR_SaveLoadGuard.js", "js/plugins/ProjectR_CardCatalog.js", "js/rmmz_objects.js", "js/rmmz_managers.js",
        "js/plugins/DotMoveSystem.js"], { cwd: root, encoding: "utf8" }).trim();
    assert.equal(out, "");
    const hendrix = cp.execFileSync("git", ["diff", "--name-only", "HEAD", "--", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/Hendrix_TemplateEvent.js"],
        { cwd: root, encoding: "utf8" }).trim();
    assert.equal(hendrix, "");
});

test("設計の正本(ワークブック)が読める環境では、SHA-256が一致し、初期コピー(3/3/3/10/3/3/5)がカタログと一致する", () => {
    const book = "C:/Users/hmats/Documents/RMMZ/_ProjectR_DesignSources/ProjectR_CardManagement_Template(3).xlsx";
    if (fs.existsSync(book)) {
        assert.equal(crypto.createHash("sha256").update(fs.readFileSync(book)).digest("hex"),
            "babd70c70f3ce0f52f622c4464835eacb4df3d305ecc48a53e84b627505dd32c");
    }
    const w = world();
    assert.deepEqual(plain(w.prod().starterSet().map(c => [c.cardId, c.copies])), STARTER.map(row => [row[0], row[1]]));
    assert.equal(w.prod().starterTotal(), 30);
    assert.deepEqual(plain(w.prod().starterProblems()), []);
});

console.log(`\n${passed} tests passed`);
