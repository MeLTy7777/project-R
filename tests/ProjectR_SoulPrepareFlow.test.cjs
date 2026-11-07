"use strict";
// L2: 準備画面の流れ(ProjectR_SoulBattlePrepare): 「攻撃」→ キャラ選択 → 10枚から5枚 → Q/W/E/R/T 割り当て → ATTACK。実際のクリック(TouchInput)で進める。実エンジン(全plugin)をNode VMで動かす。
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

// ================================================================ 準備画面の流れ(L2: 攻撃 → キャラ選択 → 10枚から5枚 → 割り当て → ATTACK) ================================================================
const P = w => w.ctx.ProjectRSoulPrepare;
const Hd = w => w.ctx.ProjectRSoulHand;
const Dk = w => w.ctx.ProjectRCardDeck;
const itemsOf = w => plain(P(w).getState()).items;
const byId = (w, id) => plain(P(w).getLayout()).buttons.find(b => b.id === id);
const clickId = (w, id) => { const b = byId(w, id); assert.ok(b, "画面に " + id + " がある: " + JSON.stringify(itemsOf(w).map(i => i.id))); const c = center(b); click(w, c.x, c.y); };
const picked = w => itemsOf(w).filter(i => i.kind === "card" && i.picked);
const cardItems = w => itemsOf(w).filter(i => i.kind === "card");
const handCardIds = w => plain(Dk(w).getBattleState()).hand.map(c => c.cardId);
const savedState = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, items: w.ctx.$gameParty._items });
const ready = () => { const w = a16Prepare(world()); frames(w, P(w).OPEN_GUARD_FRAMES + 4); return w; };
const seeded = (w, seed) => w.run(`globalThis.__seed = ${seed}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };`);
const toSelect = w => { clickId(w, "attack"); assert.equal(P(w).getScreen(), "character"); clickId(w, "char:player"); assert.equal(P(w).getScreen(), "select"); };

test("登録: 準備画面は手札・データ窓口・SoulBattle の後に1回だけ。画面は ATTACK までのデータの読み書きを自分で持たない(手札=SoulLoopHand・データ=SoulLoopData・状態=SoulBattle)", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name), i = names.indexOf("ProjectR_SoulBattlePrepare");
    assert.equal(names.filter(n => n === "ProjectR_SoulBattlePrepare").length, 1);
    for (const before of ["ProjectR_SoulBattle", "ProjectR_SoulBattleInput", "ProjectR_SoulBattleStage", "ProjectR_SoulBattleHUD", "ProjectR_SoulLoopData", "ProjectR_SoulLoopHand"]) assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < i, before);
    const code = read("js/plugins/ProjectR_SoulBattlePrepare.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /requestUseCard|startCardBattle|endCardBattle|setDeck|setCardOwned|\$gameSystem\.\w+\s*=[^=]|\$gameParty\.(gain|lose)|UpdateEventHp|Math\.random|manaCost/, "カード・デッキ・所持・アイテム・乱数に触れない(Handが持つ)");
});

test("流れ1: 「攻撃」→ キャラ選択。出撃できる実在のキャラだけ(今は主人公のリードだけ)。仮のキャラ・デッキは出ない。まだ ATTACK ではない", () => {
    const w = ready();
    assert.equal(P(w).getScreen(), "menu");
    clickId(w, "attack");
    assert.equal(P(w).getScreen(), "character");
    assert.equal(w.soul.getPhase(), "prepare");
    const chars = itemsOf(w).filter(i => i.kind === "char");
    assert.deepEqual(chars.map(c => c.id), ["char:player"], "候補は実在の出撃可能キャラだけ");
    assert.equal(chars[0].label, w.ctx.$dataActors[w.ctx.$gameParty.leader().actorId()].name, "名前は実在のアクター");
    assert.match(chars[0].sub, /30枚/);
    assert.equal(chars[0].enabled, true);
    assert.ok(itemsOf(w).some(i => i.id === "back"));
    assert.equal(plain(Hd(w).getState()).drawn.length, 0, "キャラを選ぶまで引かない");
    w.soul.end("t");
});

test("流れ2: キャラを選ぶと、そのキャラの実デッキを毎回シャッフルして10枚を引く。シャッフルと引いた結果・カード名(日本語)・引いた順・選択 0/5 が見える", () => {
    const w = ready();
    seeded(w, 5);
    toSelect(w);
    const st = plain(P(w).getState());
    assert.match(st.subtitle, /山札30枚をシャッフル/);
    assert.match(st.subtitle, /10枚を引きました/);
    assert.match(st.subtitle, /残り20枚/);
    assert.match(st.subtitle, /#1/, "シャッフルの番号");
    assert.equal(st.right, "選択 0/5");
    const cards = cardItems(w);
    assert.equal(cards.length, 10);
    assert.deepEqual(cards.map(c => c.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "引いた順");
    const hs = plain(Hd(w).getState());
    for (const [i, c] of cards.entries()) { assert.ok(/[^\u0000-\u007f]/.test(c.label), "日本語のカード名: " + c.label); assert.notEqual(c.label, hs.drawn[i].cardId); }
    assert.equal(itemsOf(w).find(i => i.id === "next").enabled, false, "5枚選ぶまで次へ進めない");
    const dupCounts = {}; for (const c of hs.drawn) dupCounts[c.cardId] = (dupCounts[c.cardId] || 0) + 1;
    for (const c of cards) { const id = hs.drawn[c.order - 1].cardId; assert.equal(c.dup, dupCounts[id], "同じカードの枚数の表示"); }
    w.soul.end("t");
});

test("流れ3: カードをクリックで選ぶ(選択 n/5・選んだ順に Q/W/E/R/T の番号)。6枚目は拒否して理由を出す。選択済みをもう一度クリックで外れる。5枚未満では「次へ」が効かない", () => {
    const w = ready();
    toSelect(w);
    const ids = plain(Hd(w).getState()).drawn.map(c => c.instanceId);
    for (const n of [0, 3, 5, 8, 9]) clickId(w, "card:" + ids[n]);
    assert.equal(plain(P(w).getState()).right, "選択 5/5");
    assert.deepEqual(picked(w).map(c => [c.order, c.slot]).sort((a, b) => a[0] - b[0]), [[1, "Q"], [4, "W"], [6, "E"], [9, "R"], [10, "T"]], "選んだ順に Q/W/E/R/T");
    clickId(w, "card:" + ids[1]);
    assert.equal(plain(Hd(w).getState()).selected.length, 5, "6枚目は選べない");
    assert.match(plain(P(w).getState()).notice, /5枚まで/);
    assert.equal(itemsOf(w).find(i => i.id === "card:" + ids[1]).picked, false);
    clickId(w, "card:" + ids[5]);                                                // 外す
    assert.equal(plain(P(w).getState()).right, "選択 4/5");
    assert.deepEqual(picked(w).sort((a, b) => a.order - b.order).map(c => c.slot), ["Q", "W", "E", "R"]);
    assert.equal(itemsOf(w).find(i => i.id === "next").enabled, false);
    clickId(w, "next");
    assert.equal(P(w).getScreen(), "select", "4枚では進めない");
    clickId(w, "clear");
    assert.equal(plain(P(w).getState()).right, "選択 0/5", "選び直す");
    for (const n of [2, 4, 6, 7, 1]) clickId(w, "card:" + ids[n]);
    clickId(w, "next");
    assert.equal(P(w).getScreen(), "assign");
    w.soul.end("t");
});

test("流れ4: 5枠の割り当て。初期は選んだ順で Q/W/E/R/T。スロットを2つ続けて選ぶと入れ替わる。同じスロットをもう一度で選択解除。カード名と枠のキーが見える", () => {
    const w = ready();
    toSelect(w);
    const hs0 = plain(Hd(w).getState()), ids = hs0.drawn.map(c => c.instanceId);
    const order = [4, 1, 7, 2, 9];
    for (const n of order) clickId(w, "card:" + ids[n]);
    clickId(w, "next");
    const slots = () => itemsOf(w).filter(i => i.kind === "slot");
    assert.deepEqual(slots().map(s => s.key), ["Q", "W", "E", "R", "T"]);
    assert.deepEqual(plain(Hd(w).getState()).slots, order.map(n => ids[n]), "初期の割り当ては選んだ順");
    for (const s of slots()) assert.ok(/[^\u0000-\u007f]/.test(s.label), "スロットにカード名: " + s.label);
    clickId(w, "slot:0"); assert.equal(plain(P(w).getState()).held, 0, "1つ目を選択中");
    clickId(w, "slot:3");
    assert.deepEqual(plain(Hd(w).getState()).slots, [ids[2], ids[1], ids[7], ids[4], ids[9]].map((x, i) => [ids[order[3]], ids[order[1]], ids[order[2]], ids[order[0]], ids[order[4]]][i]), "0番と3番が入れ替わった");
    assert.equal(plain(P(w).getState()).held, null);
    clickId(w, "slot:1"); clickId(w, "slot:1");
    assert.equal(plain(P(w).getState()).held, null, "同じスロットをもう一度で解除");
    assert.deepEqual(plain(Hd(w).getState()).slots, [ids[order[3]], ids[order[1]], ids[order[2]], ids[order[0]], ids[order[4]]], "入れ替わっていない");
    assert.equal(P(w).getScreen(), "assign");
    assert.equal(w.soul.getPhase(), "prepare");
    w.soul.end("t");
});

test("流れ5: 戻る。割り当て → 選択(選択は残る)→ キャラ選択 → メニュー。同じ準備ではキャラを選び直しても引き直さない(同じ10枚・同じシャッフル番号)", () => {
    const w = ready();
    toSelect(w);
    const hs = plain(Hd(w).getState());
    for (const c of hs.drawn.slice(0, 5)) clickId(w, "card:" + c.instanceId);
    clickId(w, "next"); assert.equal(P(w).getScreen(), "assign");
    clickId(w, "back"); assert.equal(P(w).getScreen(), "select");
    assert.equal(plain(P(w).getState()).right, "選択 5/5", "選択は残る");
    clickId(w, "back"); assert.equal(P(w).getScreen(), "character");
    clickId(w, "char:player");
    assert.equal(P(w).getScreen(), "select");
    assert.match(plain(P(w).getState()).notice, /引き直しません/);
    const again = plain(Hd(w).getState());
    assert.deepEqual([again.serial, again.drawn.map(c => c.instanceId)], [hs.serial, hs.drawn.map(c => c.instanceId)], "引き直さない(やり直しで良い引きを狙えない)");
    clickId(w, "back"); clickId(w, "back");
    assert.equal(P(w).getScreen(), "menu");
    assert.equal(w.soul.getPhase(), "prepare");
    w.soul.end("t");
});

test("流れ6: 「決定」で ATTACK が始まり、5枠はちょうど割り当てた順のカード(固定・消費されない)。決定のクリックは通常攻撃にならない。保存・所持は変わらない", () => {
    const w = ready();
    const before = savedState(w);
    const allowed = plain(w.input.getStats()).attacksAllowed;
    seeded(w, 21);
    toSelect(w);
    const hs = plain(Hd(w).getState());
    for (const n of [6, 0, 9, 3, 1]) clickId(w, "card:" + hs.drawn[n].instanceId);
    clickId(w, "next");
    clickId(w, "slot:0"); clickId(w, "slot:4");                                  // Q と T を入れ替える
    const wanted = plain(Hd(w).getState()).slotCards.map(c => c.cardId);
    assert.equal(w.soul.getPhase(), "prepare", "決定までは ATTACK ではない");
    clickId(w, "confirm");
    assert.equal(w.soul.getPhase(), "attack");
    assert.deepEqual(handCardIds(w), wanted, "Q/W/E/R/T = 割り当てた順");
    assert.equal(Hd(w).isFixed(), true);
    assert.equal(plain(w.input.getStats()).attacksAllowed, allowed, "決定のクリックは通常攻撃として通っていない");
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0);
    frames(w, 3);
    assert.equal(P(w).isOpen(), false, "ATTACK では画面を閉じる");
    assert.equal(savedState(w), before, "デッキ・所持・インベントリは変わらない");
    w.soul.end("t");
});

test("右クリックで戻る(メニューでは何もしない)。「アイテム」は未実装のまま(流れに入らない・何も消費しない)", () => {
    const w = ready();
    const rc = () => { const c = center(plain(P(w).getLayout()).panel ? { x: plain(P(w).getLayout()).panel.x, y: plain(P(w).getLayout()).panel.y, w: 40, h: 40 } : { x: 0, y: 0, w: 1, h: 1 }); const m = w.stage.toStage(c.x, c.y); w.mouse(Math.round(m.x), Math.round(m.y)); w.ctx.TouchInput._onCancel(Math.round(m.x), Math.round(m.y)); frames(w, 1); w.ctx.TouchInput._onRelease?.(0, 0); frames(w, 1); };
    rc(); assert.equal(P(w).getScreen(), "menu", "メニューでの右クリックは何もしない");
    const before = savedState(w);
    clickId(w, "item");
    assert.equal(P(w).getScreen(), "menu", "アイテムは流れに入らない");
    assert.match(plain(P(w).getState()).notice, /未実装/);
    assert.equal(savedState(w), before);
    assert.deepEqual(plain(P(w).choose("item")).reason, "notImplemented");
    clickId(w, "attack"); assert.equal(P(w).getScreen(), "character");
    rc(); assert.equal(P(w).getScreen(), "menu", "右クリックで戻る");
    clickId(w, "attack"); clickId(w, "char:player");
    rc(); assert.equal(P(w).getScreen(), "character");
    w.soul.end("t");
});

test("毎ラウンドの準備: 防御の後の準備はメニューに戻り、前の引き・選択は捨てる。新しいシャッフルで10枚を引き直す(30枚全部から)。前の5枠は次に決定するまで装備のまま", () => {
    const w = ready();
    seeded(w, 33);
    toSelect(w);
    const hs1 = plain(Hd(w).getState());
    for (const c of hs1.drawn.slice(0, 5)) clickId(w, "card:" + c.instanceId);
    clickId(w, "next"); clickId(w, "confirm");
    const hand1 = handCardIds(w);
    assert.equal(w.soul.getPhase(), "attack");
    w.soul.skipPhase(); w.soul.skipPhase(); frames(w, P(w).OPEN_GUARD_FRAMES + 4);
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(P(w).getScreen(), "menu", "メニューに戻る");
    assert.equal(P(w).getState().stats.opened, 2);
    assert.deepEqual(handCardIds(w), hand1, "前の5枠は装備のまま");
    toSelect(w);
    const hs2 = plain(Hd(w).getState());
    assert.equal(hs2.serial, hs1.serial + 1, "新しいシャッフル");
    assert.equal(hs2.selected.length, 0, "選択は空から");
    assert.equal(plain(P(w).getState()).right, "選択 0/5");
    assert.notDeepEqual(hs2.drawn.map(c => c.instanceId), hs1.drawn.map(c => c.instanceId));
    assert.deepEqual(hs2.drawn.map(c => c.order), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const c of hs2.drawn.slice(5, 10)) clickId(w, "card:" + c.instanceId);
    clickId(w, "next"); clickId(w, "confirm");
    assert.deepEqual(handCardIds(w), hs2.drawn.slice(5, 10).map(c => c.cardId), "2ラウンド目は新しく選んだ5枚");
    w.soul.end("t");
});

test("実在しないキャラ・デッキを作らない: 指輪を持つ仲間でもカードのデッキが無ければキャラ選択に並んでも選べない(理由を表示)。選んでも引かず、主人公だけが選べる", () => {
    const w = ready();
    const P2 = w.ctx.ProjectRPartyCombat, state = w.ctx.$gameSystem._projectRCardDeckData;
    assert.ok(P2.registerAlly({ actorId: 4, name: "仲間4", maxHp: 300, normalAttack: { id: "n4", range: 1.5, cooldownSeconds: 1 }, ringSkills: { janus: [{ id: "s4", range: 5, cooldownSeconds: 3, target: "enemy" }] } }).ok);
    state.ringOwnershipState.janus = "actor:4";                                    // デッキに入っていない指輪を仲間が持つ(主人公のデッキは有効なまま)
    clickId(w, "attack");
    const chars = itemsOf(w).filter(i => i.kind === "char");
    assert.deepEqual(chars.map(c => [c.id, c.enabled]), [["char:player", true], ["char:ally:4", false]]);
    assert.match(chars[1].sub, /カードのデッキがありません/);
    const serial = plain(Hd(w).getState()).serial;
    clickId(w, "char:ally:4");
    assert.equal(P(w).getScreen(), "character", "デッキの無いキャラは選べない");
    assert.equal(plain(Hd(w).getState()).serial, serial, "引いていない");
    assert.equal(plain(P(w).chooseCharacter("ally:4")).reason, "NO_CHARACTER_DECK");
    assert.match(plain(P(w).getState()).notice, /デッキがありません/);
    clickId(w, "char:player");
    assert.equal(P(w).getScreen(), "select");
    state.ringOwnershipState.janus = "unowned";
    w.soul.end("t");
});

console.log(`\n${passed} tests passed`);
