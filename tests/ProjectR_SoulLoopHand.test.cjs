"use strict";
// L3: 準備の手札(ProjectR_SoulLoopHand)。10枚ドロー・5枚選択・Q/W/E/R/T割り当て・固定手札(D4〜D6)。実エンジン(全plugin)をNode VMで動かす。
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


// a16 を専用ステージで始める(prepare: true なら準備から、false なら従来の攻撃から)
const CASTS = ["apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "hermes_issen", "apollo_gigas_slayer"];
function startA16(w, { prepare, hand = CASTS } = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, ...(prepare ? {} : {}) })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    assert.equal(w.soul.getPhase(), prepare ? "prepare" : "attack");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}

// ================================================================ 準備の手札(L3: 10枚ドロー・5枚選択・割り当て・固定手札) ================================================================
const H = w => w.ctx.ProjectRSoulHand;
const D = w => w.ctx.ProjectRCardDeck;
const savedData = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold });
const seeded = (w, seed) => w.run(`globalThis.__seed = ${seed}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };`);
const count = ids => { const m = {}; for (const id of ids) m[id] = (m[id] || 0) + 1; return m; };
const deckIds = w => plain(D(w).getDeck());
const battle = w => plain(D(w).getBattleState());
const handIds = w => battle(w).hand.map(c => c.cardId);
const key = (w, type, code) => { const e = { type, code, keyCode: code.charCodeAt(3), repeat: false, ctrlKey: false, altKey: false, metaKey: false, shiftKey: false, preventDefault() {}, stopPropagation() {} }; return type === "keydown" ? w.ctx.Input._onKeyDown(e) : w.ctx.Input._onKeyUp(e); };
// 条件に合う引きが出るまで、準備のまま引き直す(テスト用。force)
function drawUntil(w, pred, max = 30000) {
    if (!w.__seeded) { seeded(w, 12345); w.__seeded = true; }
    for (let i = 0; i < max; i++) {
        const r = plain(H(w).draw("player", { force: true }));
        assert.equal(r.ok, true, JSON.stringify(r));
        if (pred(r.drawn)) return r;
    }
    throw new Error("条件に合う引きが出なかった");
}
const pickFrom = (w, r, cardIds) => { const used = new Set(); return cardIds.map(id => { const c = r.drawn.find(d => d.cardId === id && !used.has(d.instanceId)); used.add(c.instanceId); return c.instanceId; }); };
function prepareHand(w, picks) { for (const id of picks) assert.equal(plain(H(w).toggle(id)).ok, true); assert.equal(plain(H(w).assignDefault()).ok, true); }
const SIMPLE = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];      // 先頭2枚は発動が同期で成功するカード(残りは予約型)

test("登録: 準備の手札は CardDeckCore / SoulBattle / SoulSkills / SoulLoopData の後に1回だけ。カード戦闘を作り直さない・セーブを書かない。準備画面(Prepare)は手札の後", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name), i = names.indexOf("ProjectR_SoulLoopHand");
    assert.equal(names.filter(n => n === "ProjectR_SoulLoopHand").length, 1);
    assert.equal(plugins[i].status, true);
    for (const before of ["ProjectR_CardDeckCore", "ProjectR_SoulBattle", "ProjectR_SoulSkills", "ProjectR_SoulLoopData"]) assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < i, before);
    assert.ok(names.indexOf("ProjectR_SoulBattlePrepare") > i, "準備画面は手札の後");
    const code = read("js/plugins/ProjectR_SoulLoopHand.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /startCardBattle|endCardBattle|startBattle|setDeck|setCardOwned|setCardLevel|assignRing|grantCopies|\$gameSystem\.\w+\s*=[^=]|\$gameParty\.(gain|lose)|StorageManager|saveGame|UpdateEventHp/, "戦闘を作り直さず・保存・所持・デッキを書かない");
    assert.doesNotMatch(code, /manaCost|mana_cost|"mana"/i, "マナはまだ無い");
    assert.doesNotMatch(read("js/plugins/ProjectR_CardDeckCore.js") + "", /soulFixed|_soulFixed/, "Coreは変更していない");
});

test("D4 引く: 準備のたびに実際のデッキ(保存済み30枚)から、重複なしの10枚(実体)を引く。同じ準備では引き直さない。準備以外・仲間(デッキ無し)・不明なキャラは拒否", () => {
    const w = a16Prepare(world());
    const saved = deckIds(w), before = savedData(w);
    assert.equal(plain(H(w).draw("ally:2")).reason, "unknownCharacter");
    const r = plain(H(w).draw("player"));
    assert.deepEqual([r.ok, r.reused, r.deckSize, r.remaining, r.drawn.length, r.characterKey], [true, false, 30, 20, 10, "player"]);
    assert.equal(new Set(r.drawn.map(c => c.instanceId)).size, 10, "実体は重複しない(戻さずに引く)");
    assert.deepEqual(r.drawn.map(c => c.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const deckCount = count(saved), drawnCount = count(r.drawn.map(c => c.cardId));
    for (const [id, n] of Object.entries(drawnCount)) assert.ok(deckCount[id] >= n, `${id} は実際のデッキの枚数(${deckCount[id]})を超えない`);
    const again = plain(H(w).draw("player"));
    assert.deepEqual([again.ok, again.reused, again.serial], [true, true, r.serial], "同じ準備では引き直さない");
    assert.deepEqual(again.drawn.map(c => c.instanceId), r.drawn.map(c => c.instanceId));
    assert.equal(plain(H(w).draw("player", { force: true })).serial, r.serial + 1, "force は新しいシャッフル(テスト用)");
    assert.equal(savedData(w), before, "引いてもカードの所持・デッキ・セーブは変わらない");
    // 準備以外では引けない
    w.soul.beginAttack();
    assert.equal(plain(H(w).draw("player")).reason, "notPreparing");
    assert.equal(plain(H(w).commit()).reason, "notPreparing");
    w.soul.end("t");
});

test("D4 毎回シャッフルし直す: 乱数を使って並べ替える(引きは乱数で変わる)。同じ乱数なら同じ並び。全30枚のどの位置からも引ける", () => {
    const w = a16Prepare(world());
    seeded(w, 1); const a = plain(H(w).draw("player", { force: true })).drawn.map(c => c.cardId);
    seeded(w, 1); const a2 = plain(H(w).draw("player", { force: true })).drawn.map(c => c.cardId);
    seeded(w, 2); const b = plain(H(w).draw("player", { force: true })).drawn.map(c => c.cardId);
    assert.deepEqual(a, a2, "同じ乱数は同じ並び(Math.random 以外に隠れた状態が無い)");
    assert.notDeepEqual(a, b, "乱数が違えば引きも違う");
    const seen = new Set();
    seeded(w, 7);
    for (let i = 0; i < 200; i++) for (const c of plain(H(w).draw("player", { force: true })).drawn) seen.add(c.cardId);
    assert.deepEqual([...seen].sort(), [...new Set(deckIds(w))].sort(), "200回の引きで、デッキのすべての種類のカードが出る(一部だけから引いていない)");
    w.soul.end("t");
});

test("D5 選ぶ: ちょうど5枚。6枚目は拒否(選択は変わらない)。もう一度で外せる。引いていない実体は選べない。5枚未満では割り当てに進めない。選んだ順が Q/W/E/R/T の初期の割り当て", () => {
    const w = a16Prepare(world());
    const r = plain(H(w).draw("player"));
    const ids = r.drawn.map(c => c.instanceId);
    assert.equal(plain(H(w).toggle("soul-999-1")).reason, "notDrawn");
    assert.equal(plain(H(w).assignDefault()).reason, "needFive");
    for (let i = 0; i < 5; i++) { const t = plain(H(w).toggle(ids[i])); assert.deepEqual([t.ok, t.count], [true, i + 1]); }
    const full = plain(H(w).toggle(ids[5]));
    assert.deepEqual([full.ok, full.reason, full.count], [false, "selectionFull", 5], "6枚目は拒否");
    assert.deepEqual(plain(H(w).getState().selected), ids.slice(0, 5), "選択は変わらない");
    const off = plain(H(w).toggle(ids[2]));
    assert.deepEqual([off.ok, off.removed, off.count], [true, true, 4], "もう一度で外れる");
    assert.equal(plain(H(w).assignDefault()).reason, "needFive", "4枚では進めない");
    assert.equal(plain(H(w).toggle(ids[7])).ok, true);
    const a = plain(H(w).assignDefault());
    assert.deepEqual(a.slots, [ids[0], ids[1], ids[3], ids[4], ids[7]], "選んだ順(外して付け直した順)が Q/W/E/R/T");
    assert.equal(plain(H(w).swapSlots(0, 4)).slots[0], ids[7]);
    assert.equal(plain(H(w).swapSlots(0, 9)).reason, "invalidSlot");
    assert.equal(plain(H(w).getState()).slots.length, 5);
    assert.equal(plain(H(w).toggle(ids[7])).removed, true);
    assert.deepEqual(plain(H(w).getState()).slots, [], "割り当て後に選択を変えると割り当ては破棄される(選び直してから割り当て直す)");
    w.soul.end("t");
});

test("重複: 同じカードの別の実体を2枚引いたら、別々の1枚として選べる。5枠に同じカードが2つ入り、デッキの枚数・所持は変わらない", () => {
    const w = a16Prepare(world());
    const saved = deckIds(w), before = savedData(w);
    const r = drawUntil(w, drawn => { const c = count(drawn.map(d => d.cardId)); return Object.values(c).some(n => n >= 2); });
    const dupId = Object.entries(count(r.drawn.map(d => d.cardId))).find(([, n]) => n >= 2)[0];
    const dups = r.drawn.filter(c => c.cardId === dupId);
    assert.ok(dups.length >= 2 && new Set(dups.map(d => d.instanceId)).size === dups.length, "同じカードの別の実体");
    const others = r.drawn.filter(c => c.cardId !== dupId).slice(0, 3);
    prepareHand(w, [dups[0].instanceId, others[0].instanceId, dups[1].instanceId, others[1].instanceId, others[2].instanceId]);
    const c = plain(H(w).commit());
    assert.equal(c.ok, true, JSON.stringify(c));
    assert.equal(c.slots.filter(id => id === dupId).length, 2, "同じカードが2枠");
    const b = battle(w);
    assert.deepEqual(b.hand.map(x => x.cardId), c.slots);
    assert.equal(new Set(b.hand.map(x => x.instanceId)).size, 5, "手札の実体は5つとも別");
    assert.deepEqual(count([...b.hand, ...b.drawPile, ...b.discardPile].map(x => x.cardId)), count(saved), "手札+山札は実際のデッキとちょうど同じ枚数(増減なし)");
    assert.equal(savedData(w), before);
    w.soul.end("t");
});

test("確定: いまのカード戦闘の手札が選んだ5枚(割り当ての順)に入れ替わり、残り25枚は山札。戦闘は作り直さない(同じセッション・常駐の神・ゲージはそのまま)。5枚未満・割り当て前は拒否", () => {
    const w = a16Prepare(world());
    const r = drawUntil(w, drawn => SIMPLE.every(id => drawn.some(d => d.cardId === id)));
    const picks = pickFrom(w, r, SIMPLE);
    assert.equal(plain(H(w).commit()).reason, "notAssigned", "割り当て前は拒否");
    const gods = JSON.stringify(plain(w.ctx.ProjectRGodSummonManager?.getActiveSummons?.() ?? []));
    const gauge = JSON.stringify(plain(w.ctx.ProjectRUltimateGauge?.getState?.() ?? null));
    const activeBefore = D(w).isCardBattleActive();
    prepareHand(w, picks);
    assert.equal(plain(H(w).swapSlots(0, 1)).ok, true); assert.equal(plain(H(w).swapSlots(0, 1)).ok, true);
    const c = plain(H(w).commit());
    assert.equal(c.ok, true, JSON.stringify(c));
    assert.deepEqual(handIds(w), SIMPLE, "手札 = 割り当ての順");
    const b = battle(w);
    assert.deepEqual([b.hand.length, b.drawPile.length, b.discardPile.length, b.cooldownPile.length], [5, 25, 0, 0]);
    assert.deepEqual([b.soulFixed.uses, b.soulFixed.slotCooldowns], [0, undefined], "枠ごとのクールダウンは無い(マナ制)");
    assert.equal(H(w).isFixed(), true);
    assert.equal(D(w).isCardBattleActive(), activeBefore, "戦闘は続いている(作り直していない)");
    assert.equal(JSON.stringify(plain(w.ctx.ProjectRGodSummonManager?.getActiveSummons?.() ?? [])), gods, "常駐の神は変わらない");
    assert.equal(JSON.stringify(plain(w.ctx.ProjectRUltimateGauge?.getState?.() ?? null)), gauge, "ゲージは変わらない");
    // 引きの途中の選択が確定の前に変わっても、確定は割り当てた5枚だけ
    assert.equal(plain(H(w).getState()).committed, true);
    w.soul.end("t");
});

test("D6 固定手札(マナ制): ATTACK の間、使ったカードは手札に残り(消費されない)・山札から補充されない・Coreのクールダウンの山へ入らない。使うたびに承認済みコストだけマナを引き、足りなければ拒否。クールダウンでは止まらない", () => {
    const w = a16Prepare(world());
    const r = drawUntil(w, drawn => SIMPLE.every(id => drawn.some(d => d.cardId === id)));
    prepareHand(w, pickFrom(w, r, SIMPLE));
    assert.equal(plain(H(w).commit()).ok, true);
    w.soul.beginAttack(); frames(w, 2);
    const before = battle(w), inv = savedData(w);
    const mana = () => plain(w.ctx.ProjectRSoulMana.getState());
    const sweepCost = w.ctx.ProjectRSoulMana.costOf("hermes_sweep"), issenCost = w.ctx.ProjectRSoulMana.costOf("hermes_issen");
    assert.deepEqual([sweepCost, issenCost], [4, 6], "承認済みD8: a16 のカードは Lv3 なので 薙ぎ払い Lv3 = 4・一閃 Lv3 = 6");
    const m0 = mana().current;
    const first = plain(D(w).requestUseCard(0));
    assert.equal(first.ok, true, JSON.stringify(first));
    frames(w, 3);
    const b = battle(w);
    assert.deepEqual(b.hand.map(x => x.instanceId), before.hand.map(x => x.instanceId), "手札は同じ実体のまま(使っても外れない・入れ替わらない)");
    assert.deepEqual([b.drawPile.length, b.discardPile.length, b.cooldownPile.length], [25, 0, 0], "山札・捨て札・Coreのクールダウンの山は動かない");
    assert.equal(mana().spent, sweepCost, "コストをちょうど1回引いた");
    assert.ok(Math.abs(mana().current - (m0 - sweepCost)) < 0.2, "マナが減った: " + mana().current);
    // クールダウンは無い: 続けて同じ枠を使える(マナが足りる限り)
    const again = plain(D(w).requestUseCard(0));
    assert.equal(again.ok, true, "同じ枠をすぐまた使える(クールダウンではなくマナで制限): " + JSON.stringify(again));
    assert.equal(mana().spent, sweepCost * 2);
    assert.equal(plain(H(w).getState().stats).fixedUses, 2);
    // マナ不足は拒否: 何も消費せず・何も起きない
    w.ctx.ProjectRSoulMana.devSet(1);
    const spent = mana().spent, handBefore = JSON.stringify(battle(w).hand);
    const low = plain(D(w).requestUseCard(1));
    assert.deepEqual([low.ok, low.reason], [false, "insufficientMana"], JSON.stringify(low));
    assert.equal(mana().spent, spent, "拒否では何も引かない");
    assert.equal(JSON.stringify(battle(w).hand), handBefore);
    assert.equal(plain(H(w).getState().stats).manaBlocked, 1);
    w.ctx.ProjectRSoulMana.devSet(10);
    assert.equal(plain(D(w).requestUseCard(1)).ok, true, "足りれば使える");
    assert.equal(mana().spent, sweepCost * 2 + issenCost);
    assert.deepEqual(handIds(w), SIMPLE, "5枠は崩れない");
    assert.equal(savedData(w), inv, "使っても所持枚数・デッキは変わらない");
    // 従来の自動ドロー・手札の入れ替え(Coreの公開API useBattleCard)も、固定手札は崩さない。消費の確定なのでマナはコスト分だけ引く
    w.ctx.ProjectRSoulMana.devSet(10);
    const hand0 = battle(w).hand.map(x => x.instanceId), s0 = mana().spent;
    assert.equal(plain(D(w).useBattleCard(hand0[2])).ok, true);
    assert.deepEqual(battle(w).hand.map(x => x.instanceId), hand0, "useBattleCard でも補充・入れ替えは起きない");
    assert.equal(battle(w).drawPile.length, 25);
    assert.equal(mana().spent - s0, w.ctx.ProjectRSoulMana.costOf("apollo_golden_volley"), "確定の1回だけ引く");
    // DEFENSE・PREPARE の間も5枠は崩れない(使用は遮断され、マナは動かない)
    w.soul.skipPhase();
    frames(w, 30);
    assert.deepEqual(battle(w).hand.map(x => x.instanceId), hand0);
    assert.equal(plain(D(w).requestUseCard(0)).reason, "soulDefense");
    w.soul.skipPhase();
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(plain(D(w).requestUseCard(0)).reason, "soulPrepare");
    w.soul.end("t");
});

test("固定手札の入力: 実キー Q/W/E/R/T は、割り当てた枠(左から)のカードを使う。マナが足りない枠のキーは断る。準備中は引き続き使えない。従来の経路(prepare なし)は今までどおり使うと手札が入れ替わる", () => {
    const w = a16Prepare(world());
    const r = drawUntil(w, drawn => SIMPLE.every(id => drawn.some(d => d.cardId === id)));
    prepareHand(w, pickFrom(w, r, SIMPLE));
    assert.equal(plain(H(w).commit()).ok, true);
    const statsBefore = plain(w.input.getStats()).swallowedPrepare;
    key(w, "keydown", "KeyW"); key(w, "keyup", "KeyW"); frames(w, 2);
    assert.equal(plain(w.input.getStats()).swallowedPrepare, statsBefore + 1, "準備中は使えない");
    assert.equal(plain(w.ctx.ProjectRSoulMana.getState()).spent, 0, "準備中は何も消費しない");
    w.soul.beginAttack(); frames(w, 2);
    key(w, "keydown", "KeyW"); frames(w, 2); key(w, "keyup", "KeyW"); frames(w, 12);
    assert.equal(plain(w.ctx.ProjectRSoulMana.getState()).lastSpend.cardId, SIMPLE[1], "W = 2番目の枠のカード(一閃)のコストを引いた");
    assert.equal(plain(w.ctx.ProjectRSoulMana.getState()).spent, w.ctx.ProjectRSoulMana.costOf(SIMPLE[1]));
    assert.deepEqual(handIds(w), SIMPLE);
    w.soul.end("t");
    // 従来の経路(prepare なし)は変わらない: 使うとカードは手札から外れ、新しいカードが引かれる
    const w2 = startA16(world(), { prepare: false, hand: SIMPLE });
    const before = battle(w2);
    assert.equal(plain(D(w2).requestUseCard(0)).ok !== undefined, true);
    frames(w2, 3);
    const after = battle(w2);
    assert.equal(after.soulFixed, undefined, "従来の経路に固定手札は無い");
    assert.ok(after.cooldownPile.length === 1 || after.hand[0].instanceId !== before.hand[0].instanceId, "従来どおり使うと手札が入れ替わる/クールダウンの山へ");
    w2.soul.end("t");
});

test("D5 次の準備で30枚を混ぜ直す: 前の引き・選択は捨て、新しいシャッフル(別の番号)で10枚を引く。前の5枠は次の確定まで装備のまま。選ばれなかったカードも山札に戻り、デッキ・所持は変わらない", () => {
    const w = a16Prepare(world());
    const saved = deckIds(w), before = savedData(w);
    seeded(w, 11);
    const r1 = plain(H(w).draw("player"));
    prepareHand(w, r1.drawn.slice(0, 5).map(c => c.instanceId));
    assert.equal(plain(H(w).commit()).ok, true);
    const hand1 = handIds(w);
    w.soul.beginAttack(); frames(w, 5);
    w.soul.skipPhase(); w.soul.skipPhase();                                   // → 次の PREPARE
    assert.equal(w.soul.getPhase(), "prepare");
    const st = plain(H(w).getState());
    assert.deepEqual([st.drawn.length, st.selected.length, st.slots.length, st.committed], [0, 0, 0, false], "前の引き・選択・割り当ては捨てる");
    assert.deepEqual(handIds(w), hand1, "前の5枠は次の確定まで装備のまま");
    const r2 = plain(H(w).draw("player"));
    assert.equal(r2.serial, r1.serial + 1, "新しいシャッフル");
    assert.deepEqual([r2.deckSize, r2.remaining, r2.drawn.length], [30, 20, 10], "30枚全部を混ぜ直して10枚");
    assert.notDeepEqual(r2.drawn.map(c => c.cardId), r1.drawn.map(c => c.cardId), "別の引き");
    assert.notDeepEqual(r2.drawn.map(c => c.instanceId), r1.drawn.map(c => c.instanceId));
    // 前のラウンドで選ばなかった/使ったカードも、次のラウンドの引きに入りうる(デッキ全体から引く)
    const all = new Set();
    for (let i = 0; i < 120; i++) for (const c of plain(H(w).draw("player", { force: true })).drawn) all.add(c.cardId);
    for (const id of hand1) assert.ok(all.has(id), id + " も次の引きに入る");
    assert.deepEqual(deckIds(w), saved, "デッキは変わらない");
    assert.equal(savedData(w), before, "所持・保存は変わらない");
    prepareHand(w, plain(H(w).draw("player", { force: true })).drawn.slice(0, 5).map(c => c.instanceId));
    assert.equal(plain(H(w).commit()).ok, true);
    w.soul.end("t");
});

test("復元: SOULが終わると固定を解き、準備の状態を捨てる(手札5枚・山札25枚のまま通常の規則へ戻る)。保存データは変わらない", () => {
    const w0 = world(), before = savedData(w0);
    const w = a16Prepare(w0);
    const r = plain(H(w).draw("player"));
    prepareHand(w, r.drawn.slice(0, 5).map(c => c.instanceId));
    assert.equal(plain(H(w).commit()).ok, true);
    assert.equal(H(w).isFixed(), true);
    w.soul.beginAttack(); frames(w, 3);
    // カード戦闘が SOUL の後も続く場合(通常のマップ戦闘中に始まった SOUL など)を模擬: SOUL の終了でカード戦闘を終えさせない
    const realEnd = D(w).endCardBattle;
    D(w).endCardBattle = function() {};
    try { assert.equal(w.soul.end("test"), true); } finally { D(w).endCardBattle = realEnd; }
    assert.equal(D(w).isCardBattleActive(), true, "カード戦闘は続いている");
    assert.equal(H(w).isFixed(), false, "固定は解ける(戦闘が続いていても)");
    const cont = battle(w);
    assert.equal(cont.soulFixed, undefined, "通常の戦闘の規則へ戻る");
    assert.deepEqual([cont.hand.length, cont.drawPile.length, cont.cooldownPile.length], [5, 25, 0]);
    const used = plain(D(w).useBattleCard(cont.hand[0].instanceId));
    assert.equal(used.ok, true);
    assert.equal(battle(w).drawPile.length, 24, "固定が解けたので、使うと従来どおり山札から補充される");
    D(w).endCardBattle();
    const st = plain(H(w).getState());
    assert.deepEqual([st.drawn.length, st.selected.length, st.slots.length, st.committed, st.fixed], [0, 0, 0, false, false]);
    const live = D(w).isCardBattleActive() ? battle(w) : null;
    if (live) { assert.equal(live.soulFixed, undefined); assert.equal(live.hand.length, 5); }
    frames(w, 6);
    if (stageState(w).state !== "idle") { arrive(w); frames(w, 8); }
    assert.equal(stageState(w).state, "idle");
    w.sb.stop?.();
    assert.equal(savedData(w), before, "デッキ・所持・インベントリは開始前と同じ");
});

console.log(`\n${passed} tests passed`);
