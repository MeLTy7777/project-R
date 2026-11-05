"use strict";
// I2: Apollo A16 + Hermes + SOUL P3-B の統合。Sandbox の "a16" シナリオ(Playtest専用)と、SOULコントローラの追加オプション(endOnHeartDefeat / endOnCardBattleEnd)の検証。
//   本物の混成30枚デッキ(ProjectRApolloTest) + SOULのハートをBossFrameworkのボスにする。標的はハートだけ。撃破・外部終了・失敗のどれでも、後始末は1回だけで全て元に戻る。
// 実エンジン(Map004 + 全plugin)。MZは起動しない。実機の確認は tools/mz_cdp/soul_a16_verify.cjs。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, cardWorld, plain, aimDegree, center, attachHpBars, barHp, parkOthers, deckApi, handIds, equip, SWORD_ID } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const BOSS_ID = "dev_boss_soul";
const FULL_HAND = ["apollo_eros_arrow", "hermes_issen", "apollo_golden_volley", "hermes_sweep", "apollo_gigas_slayer"];

function arenaWorld() {
    const w = buildWorld();
    assert.equal(w.failures.length, 0);
    w.enterMap(4, 25, 26); frames(w, 5);
    w.run("Math.random = () => 0.999;");
    const calls = []; const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { calls.push({ name, args }); return original.apply(this, arguments); };
    w.calls = calls;
    w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.dodge = w.ctx.ProjectRSoulBattleDodge; w.poc = w.ctx.ProjectRSoulBattlePoC;
    w.at = w.ctx.ProjectRApolloTest; w.bf = w.ctx.ProjectRBossFramework; w.deck = w.ctx.ProjectRCardDeck;
    w.ends = [];
    w.soul.onEnd(e => w.ends.push(plain(e).reason));
    return w;
}
const enemies = w => w.ctx.$gameMap.events().filter(e => e && !e.isSpawnEvent && e.event()?.note?.includes("<enemy>")).map(e => [e.eventId(), e._realX, e._realY]);
// 全体の状態(開始前後・失敗後の比較用)
const snapshot = w => JSON.stringify({
    deckData: w.ctx.$gameSystem._projectRCardDeckData ?? null, inventory: w.ctx.$gameSystem._projectRCardInventory ?? null,
    sources: plain(w.ctx.ProjectRCombatSession.sources()), cardBattle: w.deck.isCardBattleActive(), dirty: w.at.isDirty(), soul: w.soul.getPhase(), poc: w.poc.isActive(),
    boss: w.bf.getState()?.bossId ?? null, dodge: [w.dodge.isActive(), w.dodge.isArmed()], enemies: enemies(w), weapon: w.ctx.$gameParty.leader().equips()[0]?.id ?? 0,
    ammo: w.ctx.$gameParty.numItems(w.ctx.$dataItems[31]), movement: w.run("playerMovementDisabled"), save: w.ctx.$gameSystem.isSaveEnabled(),
    definitions: [...w.deck.definitions.cards.entries()].map(([id, def]) => [id, def.maxCopies, def.cooldownSeconds, def.maxLevel])
});
const start = (w, options) => quietly(() => plain(w.sb.start("a16", options)));
const heartId = w => w.soul.getState().heart.eventId;
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp",
    { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
const stateOfPile = w => plain(w.deck.getBattleState()).cooldownPile.length;
const hits = (w, id) => w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
// a16を始めてHPバーを付ける(描画なしのハーネス用。本番はEventHpBarが同じ役目)
function a16World(options = { openingHand: FULL_HAND }) {
    const w = arenaWorld();
    const before = snapshot(w);
    const result = start(w, options);
    assert.equal(result.ok, true, JSON.stringify(result));
    frames(w, 4);
    attachHpBars(w, [heartId(w)], result.maxHp);
    w.before = before; w.start = result;
    return w;
}
const aimAtHeart = w => { const c = w.ctx.$gamePlayer.centerPositionPoint(), h = w.poc.getState().hitCenter; aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y)); };
const cast = (w, card) => { const index = handIds(w).indexOf(card); assert.ok(index >= 0, card + " が手札にある"); aimAtHeart(w); return plain(w.deck.requestUseCard(index)); };

// ---------------------------------------------------------------- 登録・データ ----------------------------------------------------------------
test("登録とデータ: Sandbox は ApolloTest / BossFramework の後ろ。dev_boss は SOULのボスのIDを指す(A16の dev_boss_a16 とは別)。保護されたファイルは変更なし", () => {
    const config = {};
    vm.runInNewContext(read("js/plugins.js"), config);
    const names = config.$plugins.map(p => p.name);
    const index = names.indexOf("ProjectR_SoulBattleSandbox");
    for (const dependency of ["ProjectR_CombatTestArenaApollo", "ProjectR_BossFramework", "ProjectR_SoulBattleAIData", "ProjectR_SoulBattleDodge", "ProjectR_CombatTestArenaBoss"]) {
        assert.ok(names.indexOf(dependency) >= 0 && names.indexOf(dependency) < index, dependency + " より後");
    }
    const header = read("js/plugins/ProjectR_SoulBattleSandbox.js").split("*/")[0];
    for (const base of ["ProjectR_CombatTestArenaApollo", "ProjectR_BossFramework"]) assert.match(header, new RegExp("@base " + base));
    const w = arenaWorld();
    const def = plain(w.dodge.getBoss("dev_boss"));
    assert.equal(def.frameworkBossId, BOSS_ID);
    assert.notEqual(def.frameworkBossId, "dev_boss_a16");
    assert.notEqual(def.frameworkBossId, "dev_arena_boss");
    assert.deepEqual([...w.sb.SCENARIOS].slice(-1), ["a16"]);
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_CombatTestArenaBoss.js", "js/plugins/ProjectR_CombatTestArenaApollo.js", "js/plugins/ProjectR_CombatTestArena.js",
        "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_CardInventory.js", "js/plugins/ProjectR_CombatSession.js", "js/plugins/ProjectR_EnemyAttack.js", "data/Skills.json", "data/Enemies.json", "data/Weapons.json"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
    const code = read("js/plugins/ProjectR_SoulBattleSandbox.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|\.damage\(|setHp|saveGame|StorageManager|_saveEnabled/, "戦闘ロジック・ダメージ・セーブは持たない");
});

test("未対応の手がかり(CUES): Lv3のビーム・エロスのビーム片・疫病のネズミは「未対応」と明記され、AIの観測対象に入っていない。成功扱いにしない", () => {
    const w = arenaWorld();
    const cues = plain(w.dodge.CUES);
    for (const key of ["beamLv3", "erosBeamFragment", "plagueRat", "sweep", "issen", "windup"]) assert.equal(cues[key].supported, false, key);
    assert.deepEqual([...w.dodge.UNSUPPORTED_TAGS].sort(), ["<projectRErosBeam>", "<projectRPlagueRat>"]);
    for (const tag of w.dodge.UNSUPPORTED_TAGS) {
        assert.ok(!w.dodge.THREAT_TAGS.includes(tag) && !w.dodge.MELEE_TAGS.includes(tag) && !w.dodge.HOMING_TAGS.includes(tag), tag + " は観測しない");
    }
    // 実際のタグが現実のプラグインに存在する(記載が空想でない)
    assert.match(read("js/plugins/ProjectR_ApolloErosArrow.js"), /BEAM_TAG = "<projectRErosBeam>"/);
    assert.match(read("js/plugins/ProjectR_ApolloPlagueRain.js"), /RAT_TAG = "<projectRPlagueRat>"/);
});

// ---------------------------------------------------------------- 開始 ----------------------------------------------------------------
test("開始: 指輪2つ・全カード所持は一時付与、本物の混成30枚デッキ(検証つき)の手札5枚、SOULのハートがBossFrameworkのボス、回避AIはdev_boss、ダミーは全て遠く", () => {
    const w = a16World();
    const r = w.start;
    assert.deepEqual([r.scenario, r.level, r.deck, r.deckSize, r.bossId], ["a16", 3, "mixed", 30, BOSS_ID]);
    assert.deepEqual(r.hand, FULL_HAND, "指定した最初の手札");
    assert.deepEqual(handIds(w), FULL_HAND);
    const info = plain(w.at.deckInfo());
    assert.equal(info.size, 30); assert.equal(info.valid, true, JSON.stringify(info.reasons)); assert.deepEqual(info.inventoryReasons, []);
    assert.deepEqual(info.rings, { apollo: "player", hermes: "player" });
    assert.ok(Object.keys(info.counts).some(id => id.startsWith("apollo_")) && Object.keys(info.counts).some(id => id.startsWith("hermes_")), "Apollo と Hermes の混成");
    for (const [id, count] of Object.entries(info.counts)) assert.ok(count <= w.deck.definitions.card(id).maxCopies, id + " はコピー上限内");
    for (const id of Object.keys(info.counts)) assert.equal(w.deck.getPersistentData().cardOwnership[id].level, 3, id + " は指定のLevel");
    assert.equal(w.at.isDirty(), true, "一時データの控えがある");
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).sort(), ["boss:" + BOSS_ID, "soul_battle"]);
    const bfs = plain(w.bf.getState());
    assert.deepEqual([bfs.bossId, bfs.hp, bfs.maxHp, bfs.phaseIndex, bfs.phaseCount], [BOSS_ID, 1000, 1000, 0, 3]);
    assert.equal(w.soul.getState().endOnHeartDefeat, true);
    assert.equal(w.soul.getState().endOnCardBattleEnd, true);
    assert.equal(w.soul.getState().lockedPlayer, true);
    assert.equal(w.dodge.getState().boss, "dev_boss");
    assert.equal(w.dodge.getState().phase, "base");
    assert.equal(w.run("playerMovementDisabled"), true);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false);
    // ダミー(A16のイベント3の体を含む)は全て遠く。ボスは動かず攻撃しない(ProjectRBossTest は動いていない)
    const player = w.ctx.$gamePlayer.centerPositionPoint();
    for (const [id, x, y] of enemies(w)) assert.ok(Math.hypot(x - player.x, y - player.y) > 25, `敵${id}は遠く`);
    assert.equal(w.ctx.ProjectRBossTest.getState(), null);
    const status = quietly(() => plain(w.sb.status()));
    assert.equal(status.a16.deckSize, 30);
    assert.deepEqual(status.a16.hand, FULL_HAND);
    assert.deepEqual([status.a16.boss.hp, status.a16.boss.phase], [1000, "phase1"]);
    quietly(() => w.sb.stop());
    assert.equal(snapshot(w), w.before, "stop() で開始前と同じ");
});

test("開始のオプション: deck=apollo はApolloの指輪だけ、Levelは指定どおり、手札の指定が無ければ本物のシャッフル。不正なオプションは何も変えずに断る", () => {
    const w = arenaWorld();
    const before = snapshot(w);
    for (const bad of [{ level: 0 }, { level: 4 }, { level: 1.5 }, { deck: "nonsense" }, { openingHand: "x" }, { openingHand: [1, 2] }, { openingHand: ["a", "b", "c", "d", "e", "f"] }, { weapon: "bogus" }]) {
        const r = start(w, bad);
        assert.equal(r.ok, false, JSON.stringify(bad));
        assert.equal(snapshot(w), before, "断っても何も変わらない " + JSON.stringify(bad));
    }
    const r = start(w, { deck: "apollo", level: 1 });
    assert.equal(r.ok, true, JSON.stringify(r));
    const info = plain(w.at.deckInfo());
    assert.deepEqual([info.size, info.valid], [30, true]);
    assert.ok(Object.keys(info.counts).every(id => id.startsWith("apollo_")), "Apolloのカードだけ");
    assert.equal(info.rings.apollo, "player");
    // Hermesの指輪は、既存のアリーナ開始(startScenario)が渡す。デッキはApolloだけで、終了時に所持ごと元へ戻る(下の snapshot 比較)。
    for (const id of Object.keys(info.counts)) assert.equal(w.deck.getPersistentData().cardOwnership[id].level, 1);
    assert.equal(r.hand.length, 5);
    quietly(() => w.sb.stop());
    assert.equal(snapshot(w), before);
    const h = start(w, { deck: "hermes", level: 2 });
    assert.equal(h.ok, true, JSON.stringify(h));
    assert.ok(Object.keys(plain(w.at.deckInfo()).counts).every(id => id.startsWith("hermes_")));
    quietly(() => w.sb.stop());
    assert.equal(snapshot(w), before);
});

// ---------------------------------------------------------------- 競合 ----------------------------------------------------------------
test("競合の拒否: A16のボス戦・別のボス戦・別のSOUL・P0のハート・ApolloTestの一時データ・別のカード戦闘が動いていれば、何も変えずに理由つきで断る。解消すれば開始できる", () => {
    let w = arenaWorld();
    // 指輪の移動は CombatPresence(画面内の敵)が戦闘中と見ている間は拒否されるため、ケースごとに新しい世界で調べる
    const expectRefused = (reason, setup, teardown) => {
        w = arenaWorld();
        setup();
        const before = snapshot(w);
        const r = start(w, {});
        assert.deepEqual([r.ok, r.reason], [false, reason], JSON.stringify(r));
        assert.ok(r.hint, "理由の説明がある");
        assert.equal(snapshot(w), before, reason + ": 何も変わらない");
        teardown();
    };
    expectRefused("bossTestActive", () => assert.equal(plain(w.ctx.ProjectRBossTest.start({ deck: "mixed", level: 2, autoAttack: false })).ok, true), () => assert.equal(plain(w.ctx.ProjectRBossTest.end()).ok, true));
    assert.equal(w.at.isDirty(), false);
    const c = { x: 25.5, y: 26.5 };
    expectRefused("soulActive", () => assert.equal(w.soul.start({ heart: { centerX: c.x, centerY: c.y - 8, pattern: "static" } }).ok, true), () => w.soul.end("t"));
    expectRefused("pocActive", () => assert.equal(w.poc.start({ centerX: c.x, centerY: c.y - 8, pattern: "static" }).ok, true), () => w.poc.end("t"));
    expectRefused("apolloTestDirty", () => assert.equal(plain(w.at.grantRing("apollo")).ok, true), () => assert.equal(plain(w.at.reset()).restored, true));
    expectRefused("cardBattleActive", () => assert.equal(plain(w.ctx.ProjectRCombatTestArena.startScenario("apollo")).ok, true), () => w.ctx.ProjectRCombatTestArena.endTest());
    // 別のボス戦(BossFramework)
    expectRefused("bossActive", () => { w.bf.registerBoss({ bossId: "other_boss", name: "x", maxHp: 100, phases: [] }); assert.equal(plain(w.at.grantRing("apollo")).ok, true); assert.equal(plain(w.at.grantRing("hermes")).ok, true); w.at.unlock(3, ["apollo", "hermes"]); plain(w.at.buildMixedDeck()); assert.equal(w.bf.start("other_boss", {}).ok, true); },
        () => { w.bf.end("t"); assert.equal(plain(w.at.reset()).restored, true); });
    w = arenaWorld();
    const ok = start(w, { openingHand: FULL_HAND });
    assert.equal(ok.ok, true, "解消すれば開始できる " + JSON.stringify(ok));
    // a16が動いている間に A16のボス戦(既存のDEV機能)を始めると、A16側が指輪の移動を断って自分の一時データを戻す。
    // その戻し(ApolloTest.reset)がカード戦闘を終わらせるので、a16 は「外部終了」として1回だけ片づく(中途半端な状態は残らない)。
    const clean = JSON.parse(snapshot(arenaWorld()));
    const boss = plain(w.ctx.ProjectRBossTest.start({ deck: "mixed", level: 2, autoAttack: false }));
    assert.equal(boss.ok, false);
    frames(w, 6);
    assert.equal(w.ends.length, 1, "a16のSOULは1回だけ終わる " + JSON.stringify(w.ends));
    assert.equal(w.soul.isActive(), false);
    assert.equal(w.bf.getState(), null);
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), []);
    assert.equal(w.deck.isCardBattleActive(), false);
    assert.equal(w.ctx.ProjectRBossTest.getState(), null);
    const after = JSON.parse(snapshot(w));
    assert.deepEqual([after.deckData, after.inventory, after.weapon, after.movement, after.save], [clean.deckData, clean.inventory, clean.weapon, clean.movement, clean.save], "デッキ・所持・武器・操作・セーブ許可は元");
    quietly(() => w.sb.stop());
    w = arenaWorld();
    assert.equal(start(w, { openingHand: FULL_HAND }).ok, true);
    // 動いている a16 へ二重に start("a16"): 前の分を片づけてから始め直すが、戦闘中判定(CombatPresence)が残る間は指輪を動かせず、安全に断る(何も残らない)。
    const again = start(w, { level: 2, openingHand: FULL_HAND });
    assert.equal(again.ok === true || again.reason === "ringFailed", true, JSON.stringify(again));
    if (again.ok) assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).sort(), ["boss:" + BOSS_ID, "soul_battle"], "セッションは重複しない");
    else { assert.equal(w.at.isDirty(), false); assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), []); }
    quietly(() => w.sb.stop());
    assert.equal(w.at.isDirty(), false);
});

// ---------------------------------------------------------------- 30枚デッキ・手札・消費・標的 ----------------------------------------------------------------
test("手札5枚と消費: 絶(移動カード)は消費なしで拒否、ほかは1枚ずつ消費。防御ターンは全て拒否。指輪の移動は戦闘中は拒否。カード定義・コピー上限・Cooldownは変わらない", () => {
    const w = a16World({ openingHand: ["hermes_zetsu", "hermes_issen", "apollo_eros_arrow", "hermes_sweep", "apollo_golden_volley"] });
    const hand = handIds(w);
    assert.deepEqual(hand, ["hermes_zetsu", "hermes_issen", "apollo_eros_arrow", "hermes_sweep", "apollo_golden_volley"]);
    const definitions = JSON.stringify([...w.deck.definitions.cards.entries()]);
    const pile0 = stateOfPile(w);
    const zetsu = cast(w, "hermes_zetsu");
    assert.equal(zetsu.reason, "soulMovementBlocked");
    assert.deepEqual([stateOfPile(w), handIds(w)], [pile0, hand], "移動カードは消費もCooldownも動かさない");
    const issen = cast(w, "hermes_issen");
    assert.equal(issen.ok, true, JSON.stringify(issen));
    assert.equal(stateOfPile(w), pile0 + 1, "Issenは1枚消費");
    frames(w, 60);
    // 防御ターン: 全て拒否・消費なし
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "defense");
    const pile1 = stateOfPile(w), hand1 = handIds(w);
    for (const card of hand1) assert.equal(plain(w.deck.requestUseCard(hand1.indexOf(card))).reason, "soulDefense", card);
    assert.deepEqual([stateOfPile(w), handIds(w)], [pile1, hand1]);
    // 指輪は戦闘中は動かせない
    const ring = w.ctx.ProjectRCardCatalog.godStatus("apollo").ringId;
    assert.deepEqual(plain(w.deck.assignRingToPlayer(ring)).reasons?.map(r => r.code), ["RING_TRANSFER_DURING_BATTLE"]);
    assert.equal(JSON.stringify([...w.deck.definitions.cards.entries()]), definitions, "カード定義(コピー上限・Cooldown・Level上限)は変わらない");
    quietly(() => w.sb.stop());
    assert.equal(snapshot(w), w.before);
});

test("標的はハートだけ: 追尾・範囲・近接のどの攻撃も、ハート以外の<enemy>(アリーナのダミー・A16のイベント3)へ当たらない。ダメージは従来の値(一閃Lv3=300・4回)", () => {
    const w = a16World({ openingHand: ["hermes_issen", "apollo_eros_arrow", "hermes_sweep", "apollo_golden_volley", "apollo_gigas_slayer"] });
    const id = heartId(w);
    w.calls.length = 0;
    const issen = cast(w, "hermes_issen");
    assert.equal(issen.ok, true);
    frames(w, 220);
    assert.deepEqual([1000 - barHp(w, id), hits(w, id)], [300, 4], "一閃Lv3の従来の値");
    w.calls.length = 0;
    cast(w, "apollo_eros_arrow"); frames(w, 20); cast(w, "apollo_golden_volley"); frames(w, 240);
    const hitIds = new Set(w.calls.filter(c => c.name === "UpdateEventHp").map(c => String(c.args.eventId)));
    assert.ok(hitIds.has(String(id)), "ハートには当たる");
    assert.deepEqual([...hitIds].filter(x => x !== String(id) && x !== "0"), [], "ほかの敵・イベントには当たらない");
    quietly(() => w.sb.stop());
});

test("防御ターンの入力遮断は a16 でも維持される: 奥義・ホットバー・攻撃ボタンの遮断の数が増え、新しい攻撃が出ない", () => {
    const w = a16World();
    w.soul.skipPhase();
    const before = plain(w.soul.getBlockedCounts());
    w.ctx.$gameTemp.reserveCommonEvent(1); frames(w, 3);
    const hand = handIds(w);
    plain(w.deck.requestUseCard(0));
    assert.equal(plain(w.deck.getBattleState()).hand.map(h => h.cardId).join(), hand.join());
    const after = plain(w.soul.getBlockedCounts());
    assert.ok(after.card > before.card && after.attackEvent > before.attackEvent);
    assert.equal(w.ctx.ProjectRCardBattleInput.getBlockedReason({ code: "KeyU" }), "soulDefense");
    quietly(() => w.sb.stop());
});

// ---------------------------------------------------------------- フェーズ・勝利 ----------------------------------------------------------------
test("BossFrameworkとの連動: ハートのHPの割合でフェーズが進み(66%以下・33%以下)、HUDの状態と回避AI(dev_boss)のフェーズが一致する。AIの設定がフェーズで切り替わる", () => {
    const w = a16World();
    const id = heartId(w);
    assert.equal(w.dodge.getState().config.moveSpeed, 11, "基本の速さ");
    hurt(w, id, 400); frames(w, 4);
    assert.deepEqual([plain(w.bf.getState()).phase.id, w.dodge.getState().phase, w.dodge.getState().config.moveSpeed], ["phase2", "phase2", 13]);
    hurt(w, id, 350); frames(w, 4);
    const hud = plain(w.bf.getHudState());
    assert.deepEqual([plain(w.bf.getState()).phase.id, w.dodge.getState().phase, hud.hp, hud.ratio, w.dodge.getState().config.dodgeDistance], ["phase3", "enrage", 250, 0.25, 2.6]);
    assert.equal(w.soul.getPhase() === "attack" || w.soul.getPhase() === "defense", true, "撃破前はSOULが続く");
    const status = quietly(() => plain(w.sb.status()));
    assert.deepEqual([status.a16.boss.hp, status.a16.boss.phase, status.dodge.boss, status.dodge.phase], [250, "phase3", "dev_boss", "enrage"]);
    quietly(() => w.sb.stop());
});

test("勝利: ハートのHPが0になると reason=victory でSOULが1回だけ終わり、BossFramework・回避AI・ダミー・武器・弾薬・デッキ・指輪・所持が全て元に戻る。stop() は二重に片づけない", () => {
    const w = a16World({ openingHand: FULL_HAND, weapon: "gun" });
    assert.equal(w.ctx.$gameParty.leader().equips()[0].id, 51, "武器を銃に替えている");
    const id = heartId(w);
    hurt(w, id, 400); frames(w, 3);
    hurt(w, id, 350); frames(w, 3);
    assert.equal(w.soul.isActive(), true);
    hurt(w, id, 400); frames(w, 6);
    assert.deepEqual(w.ends, ["victory"], "終了は1回だけ");
    assert.equal(w.soul.getLog().filter(e => e.type === "end").length, 1);
    const after = JSON.parse(snapshot(w)), before = JSON.parse(w.before);
    assert.deepEqual(after, before, "開始前と完全に同じ(デッキ・所持・セッション・ダミー・武器・弾薬・移動・セーブ許可・カード定義)");
    assert.equal(w.bf.getState(), null);
    assert.deepEqual([w.dodge.isActive(), w.dodge.isArmed(), w.sb.decoyCount()], [false, false, 0]);
    frames(w, 30);
    assert.equal(JSON.stringify(JSON.parse(snapshot(w))), JSON.stringify(before), "その後も何も復活しない");
    const stopped = quietly(() => plain(w.sb.stop()));
    assert.equal(stopped.ok, true);
    assert.equal(stopped.steps.length, 1, "stop()は退出だけ(二重の片づけをしない) " + JSON.stringify(stopped.steps));
    assert.equal(quietly(() => plain(w.sb.stop())).ok, true, "二度目のstop()も安全");
});

test("勝利(Eventが撃破で消えた場合): ハートのEventが消えても victory として1回だけ片づく", () => {
    const w = a16World();
    w.ctx.$gameMap.event(heartId(w)).erase(); frames(w, 6);
    assert.deepEqual(w.ends, ["victory"]);
    assert.deepEqual(JSON.parse(snapshot(w)), JSON.parse(w.before));
    quietly(() => w.sb.stop());
});

// ---------------------------------------------------------------- 外部終了 ----------------------------------------------------------------
test("外部からの終了: カード戦闘の終了(cardBattleEnded)・戦闘セッションの一括終了(combatEnded)・マップ読み直し(mapSetup)・プレイヤー死亡(playerDead)のどれでも、1回だけ片づいて全て元に戻る", () => {
    const cases = {
        cardBattleEnded: w => { w.deck.endCardBattle(); frames(w, 4); },
        combatEnded: w => { w.ctx.ProjectRCombatSession.endAll("external"); frames(w, 4); },
        mapSetup: w => { w.ctx.$gameMap.setup(4); frames(w, 4); },
        playerDead: w => { const leader = w.ctx.$gameParty.leader(); leader._hp = 0; try { frames(w, 3); } finally { leader._hp = Math.max(1, leader.mhp); } }
    };
    for (const [reason, trigger] of Object.entries(cases)) {
        const w = a16World({ openingHand: FULL_HAND, weapon: "sword" });
        trigger(w);
        assert.equal(w.ends.length, 1, reason + ": 終了は1回 " + JSON.stringify(w.ends));
        assert.equal(w.ends[0], reason, reason);
        const after = JSON.parse(snapshot(w)), before = JSON.parse(w.before);
        if (reason === "mapSetup") { delete after.enemies; delete before.enemies; }        // マップを読み直すと敵Eventは新品になる
        assert.deepEqual(after, before, reason + ": 開始前と同じ");
        assert.equal(w.bf.getState(), null, reason);
        frames(w, 20);
        assert.equal(w.soul.isActive(), false, reason);
        assert.equal(quietly(() => plain(w.sb.stop())).ok, true);
    }
});

test("SOULコントローラの追加オプション: 既定では無効(従来どおりHP0でも続く・カード戦闘が終わっても続く)。真偽値以外は断る。ハート無しでは撃破条件を持たない", () => {
    const w = cardWorld("apollo_golden_arrow", { x: 30, y: 40, bigMap: { width: 60, height: 60 } });
    parkOthers(w, []); frames(w, 150);
    const soul = w.ctx.ProjectRSoulBattle, c = center(w);
    const heart = { centerX: c.x, centerY: c.y - 8, pattern: "static" };
    for (const bad of [{ endOnHeartDefeat: "yes" }, { endOnCardBattleEnd: 1 }, { endOnHeartDefeat: null }]) {
        const r = soul.start({ heart, ...bad });
        assert.equal(r.ok, false, JSON.stringify(bad));
        assert.match(r.reason, /^invalidOption:/);
        assert.equal(soul.getPhase(), "idle");
    }
    // 既定(無効)
    assert.equal(soul.start({ attackSeconds: 600, heart }).ok, true);
    const id = soul.getState().heart.eventId; attachHpBars(w, [id], 1000);
    assert.deepEqual([soul.getState().endOnHeartDefeat, soul.getState().endOnCardBattleEnd], [false, false]);
    hurt(w, id, 1000); frames(w, 6);
    assert.equal(soul.isActive(), true, "既定ではHP0でも続く");
    w.ctx.ProjectRCardDeck.endCardBattle(); frames(w, 6);
    assert.equal(soul.isActive(), true, "既定ではカード戦闘が終わっても続く");
    soul.end("t");
    // ハート無しでは撃破条件は無効
    assert.equal(soul.start({ attackSeconds: 600, heart: false, endOnHeartDefeat: true }).ok, true);
    assert.equal(soul.getState().endOnHeartDefeat, false);
    soul.end("t");
});

// ---------------------------------------------------------------- 失敗・中断のロールバック ----------------------------------------------------------------
test("開始の途中で失敗しても全て元に戻る: ボスの開始失敗・回避AIの設定失敗(武器を銃に替えた後)・ボスの登録で例外。ゲームの状態は開始前と同じで、(新しく入り直せば)再び開始できる", () => {
    // 失敗の後の同じ場所では戦闘中判定(CombatPresence)が残り指輪を動かせないため、ケースごとに新しい世界で調べる
    {
        const w = arenaWorld(), before = snapshot(w), original = w.bf.start;
        try {
            w.bf.start = () => ({ ok: false, reason: "stub" });
            const r = start(w, { openingHand: FULL_HAND, weapon: "gun" });
            assert.deepEqual([r.ok, r.reason], [false, "bossStartFailed"], JSON.stringify(r));
            assert.ok(r.rolledBack.length >= 3, "巻き戻した内容が報告される");
            assert.equal(snapshot(w), before, "ボス開始の失敗: 武器・デッキ・指輪・セッション・ダミー全て元");
        } finally { w.bf.start = original; }
        assert.ok(w.ends.length <= 1 && !w.soul.isActive(), "SOULが始まっていたなら1回だけ終わっている " + JSON.stringify(w.ends));
    }
    {
        const w = arenaWorld(), before = snapshot(w);
        const r = start(w, { weapon: "gun", dodge: { reactionFrames: -5 } });
        assert.deepEqual([r.ok, r.reason], [false, "dodgeArmFailed"], JSON.stringify(r));
        assert.equal(snapshot(w), before, "回避AIの設定失敗(武器を替えた後)も元");
        assert.equal(w.ctx.$gameParty.leader().equips()[0]?.id ?? 0, JSON.parse(before).weapon);
    }
    {
        const w = arenaWorld(), before = snapshot(w), original = w.bf.registerBoss;
        try {
            w.bf.registerBoss = () => { throw new Error("boom"); };
            const r = start(w, { openingHand: FULL_HAND });
            assert.deepEqual([r.ok, r.reason], [false, "exception"], JSON.stringify(r));
            assert.equal(snapshot(w), before, "例外でも元");
        } finally { w.bf.registerBoss = original; }
    }
    {
        const w = arenaWorld(), before = snapshot(w);
        const ok = start(w, { openingHand: FULL_HAND });
        assert.equal(ok.ok, true, "失敗が無ければ開始できる " + JSON.stringify(ok));
        quietly(() => w.sb.stop());
        assert.equal(snapshot(w), before);
    }
});

test("切り替え: a16 の途中から別のシナリオ(7枚の固定デッキ)へ変えると、a16の一時データは先に戻り、デッキ・指輪・所持が混ざらない。stop() で開始前に戻る", () => {
    for (const other of ["dodge", "melee5", "boss"]) {
        const w = arenaWorld();
        const before = snapshot(w);
        assert.equal(start(w, { openingHand: FULL_HAND }).ok, true);
        assert.equal(plain(w.at.deckInfo()).size, 30);
        const result = quietly(() => plain(w.sb.start(other)));
        assert.equal(result.ok, true, other + " " + JSON.stringify(result));
        frames(w, 5);
        assert.equal(w.at.isDirty(), false, other + ": a16の一時データは先に戻される");
        assert.equal(w.bf.getState(), null, other + ": ボスは終わっている");
        assert.equal(w.ends[0], "sandbox:switch", other + ": 前のSOULは1回だけ片づく " + JSON.stringify(w.ends));
        quietly(() => w.sb.stop());
        assert.equal(snapshot(w), before, other);
    }
});

// ---------------------------------------------------------------- 未対応の手がかり(実際) ----------------------------------------------------------------
test("未対応の手がかりは予知しない: エロスLv3のビーム片と疫病のネズミは存在するが、AIの脅威に入らない。Lv3のビームはAIが気づく前に当たり、気づいた脅威は0", () => {
    const seenTags = (card, level) => {
        const w = cardWorld(card, { x: 30, y: 40, bigMap: { width: 60, height: 60 }, level });
        parkOthers(w, []); frames(w, 150);
        const soul = w.ctx.ProjectRSoulBattle, dodge = w.ctx.ProjectRSoulBattleDodge, c = center(w);
        dodge.arm({ profile: "evasive" });
        soul.start({ attackSeconds: 600, heart: { centerX: c.x, centerY: c.y - 9, pattern: "static" } });
        const id = soul.getState().heart.eventId; attachHpBars(w, [id], 100000);
        frames(w, 3);
        aimAtHeartOf(w);
        const r = fx.fireCard(w, card);
        const events = new Set(), ai = new Set();
        let existed = false;
        for (let i = 0; i < 240; i++) {
            w.frames(1);
            for (const e of w.ctx.$gameMap.events()) { if (!e || e._erased) continue; const note = e.event?.()?.note || ""; for (const t of dodge.UNSUPPORTED_TAGS) if (note.includes(t)) { existed = true; events.add(t); } }
            for (const t of dodge.getState().threats) ai.add(t.tag);
        }
        const stats = plain(dodge.getStats());
        return { r: r.reason || r.ok, existed, events: [...events], ai: [...ai], loss: 100000 - barHp(w, id), noticed: stats.noticed };
    };
    function aimAtHeartOf(w) { const c = center(w), h = w.ctx.ProjectRSoulBattlePoC.getState().hitCenter; aimDegree(w, Math.atan2(h.x - c.x, c.y - h.y) * 180 / Math.PI, Math.hypot(h.x - c.x, c.y - h.y)); }
    const eros = seenTags("apollo_eros_arrow", 3), rain = seenTags("apollo_plague_rain", 3), gigas = seenTags("apollo_gigas_slayer", 3);
    assert.equal(eros.existed, true, "エロスLv3のビーム片は実在する " + JSON.stringify(eros));
    assert.ok(eros.events.includes("<projectRErosBeam>") && !eros.ai.includes("<projectRErosBeam>"), "AIは見ない");
    assert.equal(rain.existed, true, "疫病のネズミは実在する " + JSON.stringify(rain));
    assert.ok(rain.events.includes("<projectRPlagueRat>") && !rain.ai.includes("<projectRPlagueRat>"), "AIは見ない");
    assert.ok(gigas.loss > 1000, "Lv3のビームは当たる " + JSON.stringify(gigas));
    assert.equal(gigas.noticed, 0, "ビームには気づいていない(予知しない)");
    assert.deepEqual(gigas.ai, []);
});

console.log(`\n${passed} tests passed`);
