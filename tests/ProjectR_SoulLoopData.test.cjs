"use strict";
// L1: SOUL戦闘のキャラ→デッキのデータ窓口(ProjectR_SoulLoopData・読み取り専用)。実在の出撃可能なキャラと、既存の所持カード・保存30枚デッキだけを返し、何も作らず・書かない。
//   実エンジン(全plugin)をNode VMで動かす。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });
    if (!scene.children.includes(sp)) scene.children.push(sp);
    const player = { _character: ctx.$gamePlayer, renderable: true, visible: true, children: [{ renderable: true, name: "shadow" }, { renderable: true, name: "nameplate" }], x: 0, y: 0, addChild() {}, removeChild() {} };
    const other = { _character: { eventId: () => 99 }, renderable: true, children: [], x: 0, y: 0, addChild() {}, removeChild() {} };
    Object.defineProperty(sp, "_characterSprites", { configurable: true, writable: true, value: [player, other] });
    const extra = { hudLayer: display(), menuButton: display(), hendrixHud: display() };
    scene._projectRBattleHudLayer = extra.hudLayer; scene._menuButton = extra.menuButton;
    scene.hendrixHuds = [{ container: extra.hendrixHud, index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, extra, sp };
    return w.parts;
}
const mapJson = id => read(`data/Map${String(id).padStart(3, "0")}.json`);
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(mapJson(id));
    ctx.DataManager.onLoad(ctx.$dataMap);
    ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
    return id;
}
function world({ size = [1920, 1080], origin = { map: 1, x: 12, y: 20 } } = {}) {
    const w = buildWorld();
    assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(origin.map, origin.x, origin.y); frames(w, 4);
    w.ctx.Graphics._width = size[0]; w.ctx.Graphics._height = size[1];
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.stage = w.ctx.ProjectRSoulStage; w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.hud = w.ctx.ProjectRSoulBattleHUD; w.deck = w.ctx.ProjectRCardDeck; w.bf = w.ctx.ProjectRBossFramework;
    w.at = w.ctx.ProjectRApolloTest; w.prep = w.ctx.ProjectRSoulPrepare; w.input = w.ctx.ProjectRSoulInput; w.dodge = w.ctx.ProjectRSoulBattleDodge;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.phases = []; w.soul.onPhase(e => w.phases.push(`${e.from}>${e.to}`));
    return w;
}
const paused = w => !!w.ctx.$gameMap.eventsPaused;
const stageState = w => plain(w.stage.getState());
// 専用ステージで a16 を準備ループで始める(開始 → 移動 → 到着 → 準備メニューが出るまで)
function a16Prepare(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w);
    frames(w, 8);
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.getPhase(), "prepare", "準備から始まる: " + w.soul.getPhase());
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    return w;
}
// 本物の入力経路: TouchInput の押下 → 1フレーム
const click = (w, sx, sy) => {
    const m = w.stage.isActive() ? w.stage.toStage(sx, sy) : { x: sx, y: sy };
    w.mouse(Math.round(m.x), Math.round(m.y));
    w.ctx.TouchInput._onTrigger(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
    w.ctx.TouchInput._onRelease(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
};
const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const itemsSnapshot = w => JSON.stringify({ items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold, hp: w.ctx.$gameParty.leader().hp, deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null });

// ================================================================ キャラ→デッキのデータ窓口(L1・読み取り専用) ================================================================
const P = w => w.ctx.ProjectRPartyCombat;
const L = w => w.ctx.ProjectRSoulLoopData;
const savedData = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold });
const allyDef = (w, actorId, maxHp = 300) => P(w).registerAlly({ actorId, name: "仲間" + actorId, maxHp, normalAttack: { id: "n" + actorId, range: 1.5, cooldownSeconds: 1 },
    ringSkills: { apollo: [{ id: "s" + actorId, range: 5, cooldownSeconds: 3, target: "enemy" }, { id: "t" + actorId, range: 5, cooldownSeconds: 4, target: "allyLowestHp" }] } });
// 本物のデッキ・指輪・所持が入った世界(a16 の混成30枚デッキ。Playtest専用の一時データ)
function deckWorld() {
    const w = world();
    quietly(() => w.sb.start("a16", { openingHand: ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"] }));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    return w;
}

test("登録: データ窓口は CardDeckCore / CardInventory / PartyCombat / PartyRoster / SoulBattle の後に1回だけ・有効。何も書かない(保存・デッキ・所持・指輪・仲間・戦闘に触れない)", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name), i = names.indexOf("ProjectR_SoulLoopData");
    assert.equal(names.filter(n => n === "ProjectR_SoulLoopData").length, 1);
    assert.equal(plugins[i].status, true);
    for (const before of ["ProjectR_CardDeckCore", "ProjectR_CardInventory", "ProjectR_PartyCombat", "ProjectR_PartyRoster", "ProjectR_SoulBattle"]) assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < i, before);
    const code = read("js/plugins/ProjectR_SoulLoopData.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /setDeck|setCardOwned|setCardLevel|assignRing|setRingUnowned|setUltimateRing|grantCopies|grantBundle|registerAlly|startSession|startCardBattle|startBattle|requestUseCard|\$gameSystem\.\w+\s*=[^=]|\$gameParty\.(gain|lose)|StorageManager|saveGame|UpdateEventHp|Math\.random/,
        "書き込み・戦闘の開始・乱数を持たない");
    assert.doesNotMatch(code, /mana|cost/i, "承認されていないマナコストの数値を持たない");
    assert.doesNotMatch(read("js/plugins/ProjectR_SoulBattleStage.js") + read("js/plugins/ProjectR_SoulBattleHUD.js") + read("js/plugins/ProjectR_SoulBattleInput.js"), /ProjectRSoulLoopData/, "キャラ選択の画面などはまだ無い(窓口を使っていない)");
});

test("読み込んだだけでは何も起きない・製品相当のデータ(仲間0人・指輪は仲間へ渡せない)では候補は主人公だけ。主人公は実在のアクター(リード)", () => {
    const w = world();
    const before = savedData(w);
    const list = plain(L(w).listCandidates());
    assert.deepEqual(list.map(c => c.key), ["player"]);
    assert.deepEqual(plain(L(w).listCharacters()).map(c => c.key), ["player"]);
    const head = list[0];
    assert.deepEqual([head.kind, head.eligible, head.compat, head.deckSource, head.actorId], ["protagonist", true, true, "savedDeck", w.ctx.$gameParty.leader().actorId()]);
    assert.equal(head.name, w.ctx.$dataActors[head.actorId].name, "名前は $dataActors のまま(作らない)");
    assert.equal(w.ctx.ProjectRCardDeck.definitions.ringDefinitions().every(r => r.equipActorIds.length === 0), true, "製品の指輪は仲間へ渡せない定義");
    assert.equal(plain(L(w).getCharacter("ally:2")), null, "候補にいない仲間は null");
    assert.deepEqual(plain(L(w).getDeck("ally:2")), { ok: false, reason: "UNKNOWN_CHARACTER" });
    assert.deepEqual(plain(L(w).getDeck("nobody")), { ok: false, reason: "UNKNOWN_CHARACTER" });
    assert.equal(savedData(w), before, "読み取りだけ(保存データは変わらない)");
});

test("主人公のデッキ = 今の保存済み30枚デッキそのもの(互換経路)。所持枚数・Level・コピー上限・使えるカードは実際のデータ。カードを作り上げない", () => {
    const w = deckWorld();
    const before = savedData(w);
    const core = w.ctx.ProjectRCardDeck, inv = w.ctx.ProjectRCardInventory;
    const head = plain(L(w).getCharacter("player"));
    const saved = plain(core.getDeck());
    assert.equal(saved.length, 30);
    assert.deepEqual(head.deck.cardIds, saved, "実際のデッキ(順番も同じ)");
    assert.deepEqual(plain(L(w).getCompatDeck()).cardIds, saved);
    assert.equal(plain(L(w).getCompatDeck()).valid, core.isDeckValid(saved));
    const d = plain(L(w).getDeck("player"));
    assert.deepEqual([d.ok, d.source, d.compat, d.cardIds.length], [true, "savedDeck", true, 30]);
    const registry = new Set(core.definitions.cardDefinitions().map(c => c.cardId));
    assert.ok(head.pool.length > 0 && head.ringIds.length > 0, "指輪とカードがある");
    for (const card of head.pool) {
        assert.ok(registry.has(card.cardId), card.cardId + " は実在のカード定義");
        assert.equal(card.ownedCopies, inv.getOwnedCopies(card.cardId), "所持枚数は実際のデータ");
        assert.equal(card.maxDeckCopies, inv.getMaxDeckCopies(card.cardId));
        assert.equal(card.deckCopies, saved.filter(id => id === card.cardId).length);
        assert.ok(head.ringIds.includes(card.ringId), "持っている指輪のカードだけ");
        assert.ok(card.ownedCopies > 0, "未所持のカードは候補にしない");
        assert.equal(card.usableByPlayer, core.canUseCard(card.cardId));
    }
    for (const id of new Set(saved)) assert.ok(head.pool.some(c => c.cardId === id) || !core.canUseCard(id), "デッキのカードは、使えるなら候補にある: " + id);
    assert.deepEqual(head.deck.usableCardIds, saved.filter(id => core.canUseCard(id)));
    assert.equal(savedData(w), before);
    // 返した値を書き換えても、元のデータは変わらない
    d.cardIds.push("zzz"); head.deck.cardIds.length = 0; plain(L(w).getPool("player")).length = 0;
    assert.deepEqual(plain(L(w).getCompatDeck()).cardIds, saved);
    assert.equal(w.ctx.ProjectRCardDeck.getDeck().length, 30);
    w.sb.stop?.();
});

test("仲間: 実在のアクター・指輪を持つ・仲間として定義済み の3つをすべて満たすときだけ出撃できる。仲間のカードデッキは無い(NO_CHARACTER_DECK)ので作らない。理由つきで除外", () => {
    const w = deckWorld();
    const core = w.ctx.ProjectRCardDeck;
    const state = w.ctx.$gameSystem._projectRCardDeckData;
    const ring = "apollo";
    assert.ok(allyDef(w, 4).ok && allyDef(w, 5).ok && allyDef(w, 99).ok);
    state.ringOwnershipState[ring] = "actor:4";                                   // 実データの形式(Coreの所持状態)。仲間4が指輪を持つ
    state.ringOwnershipState.athena = "actor:5";                                  // 仲間5も指輪を持つが、定義は後で外す
    P(w).unregisterAlly(5);
    state.ringOwnershipState.janus = "actor:7";                                   // 仲間7: 指輪はあるが仲間の定義が無い
    const candidates = plain(L(w).listCandidates());
    const by = id => candidates.find(c => c.key === id);
    assert.ok(candidates[0].key === "player");
    assert.deepEqual([by("ally:4").eligible, by("ally:4").reasons], [true, []]);
    assert.deepEqual([by("ally:5").eligible, by("ally:5").reasons], [false, ["NO_ALLY_DEFINITION"]]);
    assert.deepEqual([by("ally:7").eligible, by("ally:7").reasons], [false, ["NO_ALLY_DEFINITION"]]);
    assert.deepEqual([by("ally:99").eligible, by("ally:99").reasons.sort()], [false, ["ACTOR_NOT_FOUND", "NO_RING"]]);
    assert.deepEqual(plain(L(w).listCharacters()).map(c => c.key), ["player", "ally:4"]);
    const a = plain(L(w).getCharacter("ally:4"));
    assert.equal(a.name, w.ctx.$dataActors[4].name, "名前は $dataActors のまま");
    assert.deepEqual([a.kind, a.deck, a.deckSource, a.compat, a.deckReason, a.ringIds], ["ally", null, "none", false, "NO_CHARACTER_DECK", [ring]]);
    assert.equal(a.aiSkillCount, 2, "仲間が実際に持っている指輪のAIスキルの数");
    assert.ok(a.pool.length > 0 && a.pool.every(c => c.ringId === ring && c.ownedCopies > 0), "指輪のカード(実在・所持あり)だけ");
    assert.deepEqual(plain(L(w).getDeck("ally:4")), { ok: false, reason: "NO_CHARACTER_DECK" }, "仲間のデッキは作らない");
    const refused = plain(L(w).getDeck("ally:99"));
    assert.deepEqual([refused.ok, refused.reason, [...refused.reasons].sort()], [false, "UNKNOWN_CHARACTER", ["ACTOR_NOT_FOUND", "NO_RING"]], "出撃できない候補のデッキは返さない");
    // 指輪が仲間に渡ると、主人公のその指輪のカードは使えなくなる(既存のルールのまま。デッキは消えない)
    const player = plain(L(w).getCharacter("player"));
    assert.equal(player.ringIds.includes(ring), false);
    assert.equal(player.deck.cardIds.length, 30, "保存デッキは消えない");
    assert.ok(player.deck.usableCardIds.length < 30 && player.deck.usableCardIds.every(id => core.definitions.card(id).ringId !== ring));
    assert.equal(player.pool.every(c => c.ringId !== ring), true);
    // 出撃中かどうかは仲間の戦闘セッションから(読み取りだけ)
    assert.equal(by("ally:4").deployed, false);
    assert.equal(P(w).startSession([4]).ok, true);
    const deployed = plain(L(w).getCharacter("ally:4"));
    assert.deepEqual([deployed.deployed, deployed.down, deployed.hp, deployed.mhp], [true, false, 300, 300]);
    P(w).endSession();
    state.ringOwnershipState[ring] = "player"; state.ringOwnershipState.athena = "unowned"; state.ringOwnershipState.janus = "unowned";
    w.sb.stop?.();
});

test("互換と保存: 窓口の呼び出しは保存データ(デッキ・所持・指輪・アイテム・金)を変えない。既存の30枚デッキでカード戦闘を始められる(SOULの従来の開始経路)", () => {
    const w2 = deckWorld();
    const before = savedData(w2);
    for (const fn of ["listCandidates", "listCharacters", "getCompatDeck", "snapshot"]) L(w2)[fn]();
    for (const key of ["player", "ally:1", "ally:4"]) { L(w2).getCharacter(key); L(w2).getDeck(key); L(w2).getPool(key); }
    assert.equal(savedData(w2), before);
    assert.equal(Object.isFrozen(L(w2)), true);
    const snap = plain(L(w2).snapshot());
    assert.deepEqual(Object.keys(snap).sort(), ["candidates", "compat", "version"]);
    // 互換経路: 保存デッキをそのまま戦闘へ(SOULの a16 も同じデッキを使う)
    const ids = plain(L(w2).getCompatDeck()).cardIds;
    assert.equal(ids.length, 30);
    w2.ctx.ProjectRCardDeck.endCardBattle();
    const started = plain(w2.ctx.ProjectRCardDeck.startCardBattle(ids));
    assert.equal(started.ok, true, JSON.stringify(started));
    assert.equal(plain(w2.ctx.ProjectRCardDeck.getBattleState()).hand.length, 5);
    w2.ctx.ProjectRCardDeck.endCardBattle();
    assert.equal(savedData(w2), before, "戦闘を始めて終えても保存データは同じ");
    w2.sb.stop?.();
});

test("マナコスト確認表: 実在のカード15枚すべてに行があり、推奨コストは1〜10・すべて『未承認(案)』。承認コスト欄は空。コードにも保存データにもコストを入れていない", () => {
    const balance = JSON.parse(read("data/ProjectR_CardBalance.json")).cards;
    const csv = read("docs/ProjectR_SoulMana_CostReview.csv").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
    const header = csv[0].split(",");
    const cost = header.indexOf("推奨マナコスト(案・未承認)"), approved = header.indexOf("承認コスト(ここに記入)"), status = header.indexOf("承認状態");
    assert.ok(cost > 0 && approved > 0 && status > 0);
    const ids = [];
    for (const line of csv.slice(1)) {
        const cells = []; let cur = "", quoted = false;
        for (let i = 0; i < line.length; i++) { const ch = line[i]; if (quoted) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch; } else if (ch === '"') quoted = true; else if (ch === ",") { cells.push(cur); cur = ""; } else cur += ch; }
        cells.push(cur);
        assert.equal(cells.length, header.length, "列数: " + cells[0]);
        assert.ok(Number.isInteger(Number(cells[cost])) && Number(cells[cost]) >= 1 && Number(cells[cost]) <= 10, cells[0] + " のコストは1〜10");
        assert.equal(cells[approved], "", cells[0] + " の承認コストは未記入");
        assert.equal(cells[status], "未承認(案)");
        for (const lv of [7, 8, 9]) assert.ok(cells[lv].length > 0, cells[0] + " のLv" + (lv - 6) + "の効果");
        ids.push(cells[0]);
    }
    assert.deepEqual([...ids].sort(), Object.keys(balance).sort(), "今あるカードすべて(増やしも欠けもしない)");
    const md = read("docs/ProjectR_SoulMana_CostReview.md");
    assert.match(md, /未承認の案/);
    for (const id of ids) assert.ok(md.includes("`" + id + "`"), id);
    for (const file of ["js/plugins/ProjectR_SoulBattle.js", "js/plugins/ProjectR_SoulSkills.js", "js/plugins/ProjectR_SoulLoopData.js", "data/ProjectR_CardBalance.json"]) assert.doesNotMatch(read(file), /manaCost|mana_cost|"mana"/i, file + " にマナコストの数値は無い");
    assert.doesNotMatch(["ProjectR_SoulBattleHUD"].map(n => read(`js/plugins/${n}.js`).split("*/").slice(1).join("*/")).join(String.fromCharCode(10)), /manaCost|mana_cost|costs?\s*[:=]\s*\d/i, "HUD はコストの数値を持たない(承認済みの表は ProjectR_SoulMana だけが持ち、HUD はそこから読む)");
});

console.log(`\n${passed} tests passed`);
