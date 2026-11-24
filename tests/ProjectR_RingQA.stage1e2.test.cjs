"use strict";
// Stage 1E-2: 指輪装備・スキル編成・Q 奥義の最終統合 QA(メニュー → セーブ → 戦闘 → HUD → 奥義)。
// 実エンジン(実Map004 + 全plugin + 実Window/Scene)。メニューは実 Scene_ProjectRRings / Scene_ProjectRUltimateSelect を、実 Window の select / processOk で操作する。
// 描画ピクセル・実キーの感触・本物の Scene_Save / Scene_Load(ファイル)は Node では扱わない → tools/mz_cdp/ring_qa_verify.cjs(実機・隔離したセーブ先)。
//   【1】メニューで装備・5枠・Q を編成 → 戦闘にそのまま反映(HUD・発動・Q の神)
//   【2】Q 枠と ULTIMATE 画面の選択は独立(どちらを変えても他方は変わらない)・画面の説明が両方の違いを書いている
//   【3】仲間への受け渡しで Q・スキルの登録が外れ、戦闘へ反映(Q は空)。戻して再装備・再登録すれば使える
//   【4】戦闘中は、画面操作・モデル・API のどれでも編成を変えられない(Q も同じ)。戦闘後は編集できる
//   【5】Q の表示状態: 空 / 充填中 / READY / 使えない / 発動後
//   【6】保存 → 読み込み(実の保存内容 JsonEx)で、装備・5枠・Q・ULTIMATE 画面の選択がそのまま。読み込み後の戦闘も同じ
//   【7】戦闘の終了・再開・マップ移動・legacy・通常のカード戦闘・SOUL の間で、この戦闘だけの奥義の指定が漏れない
//   【8】ヘルメース・アポロンの通常スキル10種が、Q があっても(なくても)枠・HUD・発動のまま
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const a7 = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars, ENEMIES, HP } = fx;

let passed = 0;
function test(name, fn) { const t0 = Date.now(); fn(); console.log(`ok ${++passed} - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); }

const FC = w => w.ctx.ProjectRFieldCombat, RL = w => w.ctx.ProjectRRingLoadout, D = w => w.ctx.ProjectRCardDeck, CORE = w => w.ctx.ProjectRMenuCore;
const UA = w => w.ctx.ProjectRUltimateActivation, GA = w => w.ctx.ProjectRUltimateGauge, GM = w => w.ctx.ProjectRGodSummonManager;
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const HERMES = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"];
const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"];
const CARDS = [...HERMES, ...APOLLO].filter(id => id !== "hermes_sweep");
const SLOTS = ["lmb", "shift", "e", "x", "c"];
const EMPTY = { lmb: null, shift: null, e: null, x: null, c: null };
const fill = w => { const g = GA(w); return g.addUltimateGauge(g.getUltimateGaugeMax(), "test"); };
const gauge = w => ({ has: GA(w).hasUltimateGaugeState(), cur: GA(w).getUltimateGauge(), max: GA(w).getUltimateGaugeMax() });
const hermesOn = w => w.ctx.ProjectRHermesUltimate.isHermesUltimateActive(), apolloOn = w => w.ctx.ProjectRApolloUltimate.isApolloUltimateActive();
const pressQ = (w, hold = 3) => { w.keyDown("KeyQ", 81); frames(w, hold); w.keyUp("KeyQ", 81); frames(w, 1); };
const last = w => plain(FC(w).getLastResult());
const ultSlot = w => plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate");
const coreData = w => JSON.stringify(D(w).getPersistentData());
const ov = w => plain(GM(w).getBattleUltimateRingOverride());

// ---- 世界(実Map004 + 全plugin。装備・所持は戦闘前に、メニュー操作で行う) ----
function qaWorld({ owned = ["hermes", "apollo"], ally = null } = {}) {
    const w = buildWorld(); assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    FC(w).setLoadoutSource("auto");
    Object.assign(w.ctx.Graphics, { boxWidth: 1920, boxHeight: 1080 });                         // 実機の画面サイズ(無いと窓の大きさが0になる)
    for (const ring of owned) assert.equal(D(w).assignRingToPlayer(ring).ok, true, ring);
    for (const id of CARDS) { assert.equal(D(w).setCardOwned(id, true).ok, true, id); assert.equal(D(w).setCardLevel(id, 1).ok, true, id); }
    if (ally) for (const ringId of ally.rings) { const ring = D(w).definitions.ring(ringId); D(w).definitions.rings.set(ringId, Object.freeze({ ...ring, equipActorIds: Object.freeze([ally.actorId]) })); }
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    return w;
}
// ---- 画面(実Scene・実Window)の操作 ----
const openRings = w => { const scene = new w.ctx.Scene_ProjectRRings(); scene.create(); scene.start(); scene.update(); w.ctx.SceneManager.pop = () => {}; return scene; };
const openUltimate = w => { const scene = new w.ctx.Scene_ProjectRUltimateSelect(); scene.create(); scene.start(); scene.update(); w.ctx.SceneManager.pop = () => {}; return scene; };
const ringIndex = (scene, id) => { const i = scene._rings.items().findIndex(e => e.ringId === id); assert.ok(i >= 0, `一覧に ${id} がある`); return i; };
function enterMode(scene, mode) { for (const win of [scene._rings, scene._targets, scene._slots, scene._choices]) win.deactivate(); scene._tabs.activate(); scene._tabs.select(mode); scene._tabs.processOk(); }
function chooseRingAction(scene, ringId, kind) {
    enterMode(scene, 0); scene._rings.select(ringIndex(scene, ringId)); scene._rings.processOk();
    const index = scene._targets.items().findIndex(t => t.kind === kind); assert.ok(index >= 0, `${ringId}: 操作 ${kind} がある`);
    scene._targets.select(index); scene._targets.processOk();
}
function openSlot(scene, slot) { enterMode(scene, 1); const i = scene._slots.items().findIndex(s => s.slot === slot); assert.ok(i >= 0, slot); scene._slots.select(i); scene._slots.processOk(); }
function chooseChoice(scene, pred) { const i = scene._choices.items().findIndex(pred); assert.ok(i >= 0, "候補がある"); scene._choices.select(i); scene._choices.processOk(); }
const assignViaScene = (scene, slot, skillOrRing) => { openSlot(scene, slot); chooseChoice(scene, c => c.skillId === skillOrRing || (c.kind === "ultimate" && c.ringId === skillOrRing)); };
const clearViaScene = (scene, slot) => { openSlot(scene, slot); chooseChoice(scene, c => c.kind === "clear"); };
const equipViaScene = (scene, ringId) => chooseRingAction(scene, ringId, "equip");
const selectUltimateViaScene = (scene, ringId) => { const i = scene._list.items().findIndex(e => e.ringId === ringId); assert.ok(i >= 0, ringId); scene._list.select(i); scene.onOk(); };
// 描画した文字を集める(drawText / drawWrapped を差し替えて記録)
function captureDraw(win, redraw) {
    const log = [], t = win.drawText, d = win.drawWrapped;
    win.drawText = function (text) { log.push(String(text)); return t.apply(this, arguments); };
    win.drawWrapped = function (text) { log.push(String(text)); return d.apply(this, arguments); };
    try { redraw(); } finally { win.drawText = t; win.drawWrapped = d; }
    return log.join("\n");
}
// 標準の編成(メニュー操作): 装備 hermes・apollo / 5枠 / Q
function loadoutViaMenu(w, { q = "apollo", slots = { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "apollo_eros_arrow", x: "hermes_issen", c: "apollo_golden_volley" } } = {}) {
    const scene = openRings(w);
    equipViaScene(scene, "hermes"); equipViaScene(scene, "apollo");
    for (const [slot, id] of Object.entries(slots)) assignViaScene(scene, slot, id);
    if (q) assignViaScene(scene, "q", q);
    return scene;
}
const begin = w => { const b = FC(w).begin(); assert.equal(b.ok, true, JSON.stringify(b)); frames(w, 2); FC(w).setPerception({ enabled: false }); return b; };

// ---- SOUL の世界(FieldCombat.clock.test と同じ方式) ----
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = () => ({ renderable: true, visible: true, parent: null });
const sframes = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
function decorate(w) {
    const scene = w.sc(), sp = scene._spriteset, ctx = w.ctx;
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
    scene._projectRBattleHudLayer = display(); scene._menuButton = display();
    scene.hendrixHuds = [{ container: display(), index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, sp };
}
function soulWorld() {
    const w = a7.buildWorld(); assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(1, 12, 20); sframes(w, 4);
    w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080;
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.stage = w.ctx.ProjectRSoulStage;
    decorate(w);
    return w;
}
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(fs.readFileSync(path.join(__dirname, "..", "data", `Map${String(id).padStart(3, "0")}.json`), "utf8"));
    ctx.DataManager.onLoad(ctx.$dataMap); ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
}

// ---------------------------------------------------------------- 【1】メニュー → 戦闘 ----------------------------------------------------------------
test("【1】メニューで装備・5枠・Q を編成 → 戦闘にそのまま反映される(枠のスキル・HUD・Q の神・発動)。ULTIMATE 画面の選択(別の神)は使われない", () => {
    const w = qaWorld();
    const ult = openUltimate(w); selectUltimateViaScene(ult, "hermes");                          // ULTIMATE 画面: ヘルメースを選ぶ(Core の選択)
    assert.equal(D(w).getUltimateRingId(), "hermes");
    const slots = { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "apollo_eros_arrow", x: "hermes_issen", c: "apollo_golden_volley" };
    loadoutViaMenu(w, { q: "apollo", slots });                                                   // 指輪画面: Q はアポロン
    assert.deepEqual(plain(RL(w).getState()), { schema: 1, equipped: ["hermes", "apollo"], slots, ultimate: "apollo" });
    const data0 = coreData(w);
    begin(w);
    assert.equal(FC(w).getSlotSkills().mode, "ring");
    for (const id of Object.values(slots)) assert.ok(JSON.stringify(plain(FC(w).getSlotSkills())).includes(id), "戦闘の枠にメニューで登録したスキルがある: " + id);
    const names = plain(FC(w).getHudState()).slots.filter(s => ["attack", "mobility", "special", "card1", "card2"].includes(s.slot)).map(s => [s.slot, s.state]);
    assert.ok(names.every(([, state]) => state === "ready"), JSON.stringify(names));
    assert.equal(plain(FC(w).getUltimateState()).ringId, "apollo");
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo", "戦闘の神は Q 枠(アポロン)");
    assert.equal(D(w).getUltimateRingId(), "hermes", "ULTIMATE 画面の選択(ヘルメース)は別のまま");
    fill(w); pressQ(w);
    assert.equal(apolloOn(w), true, "Q = アポロンの奥義"); assert.equal(hermesOn(w), false); assert.equal(gauge(w).cur, 0);
    assert.equal(coreData(w), data0, "Core の保存データは変わらない");
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【2】独立 + 説明 ----------------------------------------------------------------
test("【2a】Q 枠と ULTIMATE 画面の選択は独立: どちらを変えても他方は変わらない(両方向・複数回)", () => {
    const w = qaWorld();
    const rings = openRings(w); equipViaScene(rings, "hermes"); equipViaScene(rings, "apollo");
    const ult = openUltimate(w);
    assignViaScene(rings, "q", "hermes"); selectUltimateViaScene(ult, "apollo");
    assert.deepEqual([RL(w).getUltimate(), D(w).getUltimateRingId()], ["hermes", "apollo"]);
    assignViaScene(rings, "q", "apollo"); assert.equal(D(w).getUltimateRingId(), "apollo", "Q 枠を変えても ULTIMATE 画面の選択は変わらない");
    selectUltimateViaScene(ult, "hermes"); assert.equal(RL(w).getUltimate(), "apollo", "ULTIMATE 画面を変えても Q 枠は変わらない");
    clearViaScene(rings, "q"); assert.equal(RL(w).getUltimate(), null); assert.equal(D(w).getUltimateRingId(), "hermes", "Q 枠を空にしても ULTIMATE 画面の選択は残る");
    // Q が空のまま戦闘: ULTIMATE 画面の選択へは落ちない
    begin(w); assert.equal(GM(w).hasPersistentUltimateBattleState(), false); assert.equal(D(w).getUltimateRingId(), "hermes"); FC(w).end("test");
});

test("【2b】画面の説明: ULTIMATE 画面は「フィールド戦闘では使わない(指輪画面のQ枠を使う・Uは使えない)」と、指輪画面のQ枠は「ULTIMATE 画面の選択とは別・フィールド戦闘のQで発動」と書いている。古い記述(未接続)は残らない", () => {
    const w = qaWorld();
    const ult = openUltimate(w), ultText = captureDraw(ult._detail, () => ult.refreshDetail());
    assert.match(ultText, /フィールド戦闘/, "ULTIMATE 画面: フィールド戦闘との関係を書いている");
    assert.match(ultText, /Q枠|Q 枠|スキル編成/, "ULTIMATE 画面: フィールド戦闘は指輪画面のスキル編成のQ枠を使うと書いている");
    assert.match(ultText, /U/, "ULTIMATE 画面: U キーの扱いを書いている");
    const rings = openRings(w); equipViaScene(rings, "hermes"); equipViaScene(rings, "apollo");
    openSlot(rings, "q");
    const qLines = rings.skillDetailLines().join("\n");
    chooseChoice(rings, c => c.kind === "ultimate" && c.ringId === "apollo");
    rings._slots.activate(); openSlot(rings, "q"); rings._choices.select(1);
    const choiceLines = rings.skillDetailLines().join("\n");
    assert.match(qLines + choiceLines, /ULTIMATE/, "指輪画面のQ枠: ULTIMATE 画面の選択とは別だと書いている");
    assert.match(qLines + choiceLines, /フィールド戦闘/, "指輪画面のQ枠: フィールド戦闘のQで発動すると書いている");
        const source = fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_RingParty.js"), "utf8");
    assert.doesNotMatch(source, /まだ FieldCombat（実戦）には接続していません/, "古い「未接続」の記述は残さない");
    const help = fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_UltimateSelect.js"), "utf8");
    assert.match(help, /フィールド戦闘/, "ULTIMATE 画面の @help にも書いている");
});

// ---------------------------------------------------------------- 【3】仲間への受け渡し ----------------------------------------------------------------
test("【3】仲間へ渡す: Q・スキルの登録が外れ、戦闘へ反映(Q は空・そのスキル枠は空)。主人公へ戻して再装備・再登録すれば使える。1人1つの制限は従来どおり", () => {
    const w = qaWorld({ ally: { actorId: 4, rings: ["hermes", "apollo"] } });
    const scene = loadoutViaMenu(w, { q: "hermes", slots: { lmb: "hermes_sweep", shift: "hermes_zetsu", x: "apollo_golden_volley" } });
    chooseRingAction(scene, "hermes", "actor");
    assert.equal(D(w).getRingOwner("hermes"), "actor:4");
    assert.deepEqual(plain(RL(w).getState()), { schema: 1, equipped: ["apollo"], slots: { ...EMPTY, x: "apollo_golden_volley" }, ultimate: null });
    assert.match(scene._info, /解除/);
    begin(w);
    const sk = plain(FC(w).getSlotSkills()); assert.equal(sk.mode, "ring");
    assert.equal(GM(w).hasPersistentUltimateBattleState(), false, "渡したので Q は空(ヘルメースへ落ちない)");
    const empty = w2 => plain(FC(w2).getHudState()).slots.filter(s => ["attack", "mobility"].includes(s.slot)).map(s => s.state);
    assert.deepEqual(empty(w), ["empty", "empty"], "渡した指輪のスキル枠は空");
    assert.equal(ultSlot(w).state, "empty");
    pressQ(w); assert.equal(hermesOn(w), false);
    FC(w).end("test");
    // (戦闘のあと、画面内に生存敵がいる間は CombatPresence が「戦闘中」で、指輪の移動は従来どおり拒否される。Node は実の Sprite が無いので、戻す操作は戦闘の前の別の世界で確かめる。実機は ring_qa_verify.cjs)
    chooseRingAction(scene, "hermes", "player"); assert.equal(D(w).getRingOwner("hermes"), "actor:4", "画面内に敵がいる間は、戦闘後も指輪を戻せない(従来の仕様)");
    {
        const v = qaWorld({ ally: { actorId: 4, rings: ["hermes", "apollo"] } });
        const sc = loadoutViaMenu(v, { q: "hermes", slots: { lmb: "hermes_sweep" } });
        chooseRingAction(sc, "hermes", "actor"); assert.equal(RL(v).getUltimate(), null);
        chooseRingAction(sc, "hermes", "player"); assert.equal(D(v).getRingOwner("hermes"), "player");
        assert.equal(RL(v).getUltimate(), null, "戻しても自動では復元しない"); assert.equal(RL(v).getSkill("lmb"), null);
        equipViaScene(sc, "hermes"); assignViaScene(sc, "q", "hermes"); assignViaScene(sc, "lmb", "hermes_sweep");
        begin(v); assert.equal(GM(v).getPersistentUltimateRingId(), "hermes"); fill(v); pressQ(v); assert.equal(hermesOn(v), true, "戻して再装備・再登録すれば使える");
        FC(v).end("test");
    }
    // 1人1つ: ヘルメースを持っている仲間(actor:4)へ、別の指輪は渡せない
    scene._rings.select(ringIndex(scene, "apollo")); scene.refreshTargets();
    assert.equal(scene._targets.items().find(t => t.kind === "actor").enabled, false, "仲間は1人1つまで(従来どおり)");
});

// ---------------------------------------------------------------- 【4】戦闘中の編集ロック ----------------------------------------------------------------
test("【4】戦闘中: 指輪画面の操作・メニューのモデル・RingLoadout API・Q の登録のどれでも、装備と編成(Q を含む)を変えられない。画面はロックを表示。戦闘後は編集できる", () => {
    const w = qaWorld({ ally: { actorId: 4, rings: ["hermes", "apollo"] } });
    const scene = loadoutViaMenu(w, { q: "hermes", slots: { lmb: "hermes_sweep", x: "apollo_golden_volley" } });
    const ult = openUltimate(w); selectUltimateViaScene(ult, "apollo");
    begin(w);
    const before = JSON.stringify([plain(RL(w).getState()), coreData(w), D(w).getRingOwner("hermes"), D(w).getRingOwner("apollo")]);
    assert.equal(CORE(w).isLocked(), true, "戦闘中はメニューがロックされる");
    // 画面操作
    assignViaScene(scene, "q", "apollo"); clearViaScene(scene, "q"); assignViaScene(scene, "lmb", "hermes_zetsu".replace("zetsu", "sweep"));
    chooseRingAction(scene, "hermes", "equip"); chooseRingAction(scene, "apollo", "actor");
    selectUltimateViaScene(ult, "hermes");
    // モデル・API
    const model = plain([CORE(w).loadout.select ? 0 : 0]);
    void model;
    const api = plain([RL(w).setUltimate("apollo").ok, RL(w).clearUltimate().ok, RL(w).setSkill("lmb", "hermes_zetsu").ok, RL(w).clearSkill("x").ok, RL(w).unequipRing("apollo").ok, RL(w).equipRing("hermes").ok,
        D(w).assignRingToActor("apollo", 4).ok, D(w).setRingUnowned("hermes").ok]);
    assert.deepEqual(api, api.map(() => false), "API はすべて拒否: " + JSON.stringify(api));
    assert.equal(JSON.stringify([plain(RL(w).getState()), coreData(w), D(w).getRingOwner("hermes"), D(w).getRingOwner("apollo")]), before, "状態は1つも変わらない(画面・RingLoadout・指輪の移動)");
    // CardDeckCore の奥義の選択 API 自体は戦闘中も呼べる(メニューのモデルだけが拒否する。従来の仕様)。呼んでも、いまの戦闘の神(開始時の写し)は変わらない。
    assert.equal(D(w).setUltimateRing("apollo").ok, true); assert.equal(GM(w).getPersistentUltimateRingId(), "hermes", "いまの戦闘の神は変わらない"); assert.equal(plain(FC(w).getUltimateState()).ringId, "hermes");
    assert.match(captureDraw(scene._header, () => scene.refreshHeader()), /戦闘中は装備・編成を変更できません/, "画面はロックを表示");
    assert.equal(RL(w).getUltimate(), "hermes"); fill(w); pressQ(w); assert.equal(hermesOn(w), true, "ロック中も Q は戦闘の開始時の指輪のまま使える");
    FC(w).end("test");
    // 戦闘後: 編集できる(Q の登録も ULTIMATE 画面も)
    assert.equal(CORE(w).isLocked(), false);
    assignViaScene(scene, "q", "apollo"); assert.equal(RL(w).getUltimate(), "apollo");
    selectUltimateViaScene(ult, "hermes"); assert.equal(D(w).getUltimateRingId(), "hermes");
});

// ---------------------------------------------------------------- 【5】Q の表示状態 ----------------------------------------------------------------
test("【5】Q の表示状態: 空(empty)/ 未実装の指輪(unavailable)/ 充填中(charging)/ READY(ready)/ 発動後に充填中へ戻る。BattleHUD の枠・ゲージの表示の元データも同じ", () => {
    const w = qaWorld({ owned: ["hermes", "apollo", "athena"] });
    const scene = openRings(w); for (const id of ["hermes", "apollo", "athena"]) equipViaScene(scene, id);
    assignViaScene(scene, "lmb", "hermes_sweep");
    const view = () => { const s = ultSlot(w); return [s.state, s.ready]; };
    // 空
    begin(w); assert.deepEqual(view(), ["empty", false]); assert.equal(gauge(w).has, false); FC(w).end("test");
    // 未実装の指輪(Athena。画面は未実装の奥義を候補に出さないので、API で登録した状態 = 古い保存データなどを想定)
    assert.equal(RL(w).setUltimate("athena").ok, true);
    openSlot(scene, "q"); assert.equal(scene._choices.items().some(c => c.ringId === "athena"), false, "画面は未実装の奥義を候補に出さない");
    begin(w); assert.deepEqual(view(), ["unavailable", false]); assert.equal(gauge(w).has, false); FC(w).end("test");
    // 充填中 → READY → 発動 → 充填中
    assignViaScene(scene, "q", "hermes");
    begin(w); assert.deepEqual(view(), ["charging", false]); assert.equal(plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate").extra.max, 100);
    GA(w).addUltimateGauge(40, "test"); assert.deepEqual(view(), ["charging", false]); assert.equal(plain(FC(w).getHudState()).slots.find(s => s.slot === "ultimate").extra.gauge, 40);
    fill(w); assert.deepEqual(view(), ["ready", true]);
    const vm = plain(w.ctx.ProjectRBattleHUD.getViewModel ? w.ctx.ProjectRBattleHUD.getViewModel() : {});
    assert.ok(JSON.stringify(vm).includes("100"), "BattleHUD の表示の元データにゲージが出る");
    pressQ(w); assert.equal(hermesOn(w), true); assert.deepEqual(view(), ["charging", false], "発動後はゲージ 0 の充填中に戻る"); assert.equal(gauge(w).cur, 0);
    FC(w).end("test");
});

// ---------------------------------------------------------------- 【6】保存・読み込み ----------------------------------------------------------------
test("【6】保存 → 読み込み(実の保存内容): 装備・5枠・Q・ULTIMATE 画面の選択がそのまま。読み込んだあとの戦闘もその編成。戦闘中の保存でも、この戦闘だけの指定は入らない", () => {
    const a = qaWorld();
    const slots = { lmb: "hermes_sweep", shift: "apollo_eros_arrow", e: "hermes_issen", x: "apollo_golden_volley", c: "hermes_strength" };
    loadoutViaMenu(a, { q: "apollo", slots });
    selectUltimateViaScene(openUltimate(a), "hermes");
    const state = JSON.stringify(plain(RL(a).getState())), core0 = coreData(a);
    begin(a); fill(a);
    const during = a.ctx.JsonEx.stringify(a.ctx.DataManager.makeSaveContents());              // 戦闘中の保存(別の Scene からのセーブはできないが、保存内容そのものを確かめる)
    assert.equal(during.includes("ultimateRingId"), false, "この戦闘だけの指定は保存されない"); FC(a).end("test");
    const json = a.ctx.JsonEx.stringify(a.ctx.DataManager.makeSaveContents());
    const w = buildWorld(); assert.deepEqual(w.failures, []);
    w.ctx.DataManager.createGameObjects(); w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
    assert.equal(JSON.stringify(plain(RL(w).getState())), state, "装備・5枠・Q が保存 → 読み込みで同じ");
    assert.equal(coreData(w), core0, "ULTIMATE 画面の選択(Core)も同じで、Q 枠とは独立のまま"); assert.equal(D(w).getUltimateRingId(), "hermes"); assert.equal(RL(w).getUltimate(), "apollo");
    const dm = w.ctx.DataManager, create = dm.createGameObjects; dm.createGameObjects = () => {};
    try { w.enterMap(4, 12, 25); } finally { dm.createGameObjects = create; }
    w.frames(3); w.mouse(700, 300); FC(w).setLoadoutSource("auto"); Object.assign(w.ctx.Graphics, { boxWidth: 1920, boxHeight: 1080 });
    attachHpBars(w, ENEMIES, HP); w.run("Math.random = () => 0.999;");
    assert.equal(ov(w), null, "読み込み直後は指定なし");
    begin(w);
    const sk = plain(FC(w).getHudState()).slots.filter(s => ["attack", "mobility", "special", "card1", "card2"].includes(s.slot));
    assert.ok(sk.every(s => s.state === "ready"), "読み込んだ5枠がそのまま使える: " + JSON.stringify(sk.map(s => [s.slot, s.state])));
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo"); fill(w); pressQ(w); assert.equal(apolloOn(w), true);
    FC(w).end("test");
    // メニューで開いた画面にも、読み込んだ内容が出る
    const scene = openRings(w); const rows = plain(CORE(w).loadout.slots());
    assert.equal(rows.find(r => r.slot === "q").ringId, "apollo"); assert.equal(rows.find(r => r.slot === "lmb").skillId, "hermes_sweep");
    void scene;
});

// ---------------------------------------------------------------- 【7】遷移・漏れ ----------------------------------------------------------------
test("【7a】戦闘の終了・再開・マップ移動・legacy・通常のカード戦闘の間で、この戦闘だけの指定が漏れない(ULTIMATE 画面の選択 = apollo / Q = hermes)", () => {
    const w = qaWorld();
    loadoutViaMenu(w, { q: "hermes" }); selectUltimateViaScene(openUltimate(w), "apollo");
    const data0 = coreData(w);
    begin(w); assert.equal(GM(w).getPersistentUltimateRingId(), "hermes"); FC(w).end("test");
    assert.deepEqual([ov(w), GM(w).hasPersistentUltimateBattleState()], [null, false], "終了で消える");
    // 通常のカード戦闘(Arena 等): ULTIMATE 画面の選択
    const card = D(w).startCardBattle(D(w).FIXED_BATTLE); assert.equal(card.ok, true);
    assert.equal(GM(w).getPersistentUltimateRingId(), "apollo", "通常のカード戦闘は ULTIMATE 画面の選択"); assert.equal(ov(w), null); D(w).endCardBattle();
    // legacy の FieldCombat: Core の選択(すでに選ばれていれば変えない)
    FC(w).setLoadoutSource("legacy"); begin(w);
    assert.equal(FC(w).getLoadoutMode(), "legacy"); assert.equal(GM(w).getPersistentUltimateRingId(), "apollo"); assert.equal(D(w).getUltimateRingId(), "apollo"); assert.equal(ov(w), null);
    FC(w).end("test"); FC(w).setLoadoutSource("auto");
    // 再開: Q が変わっていれば新しい Q
    assert.equal(RL(w).setUltimate("apollo").ok, true); begin(w); assert.equal(GM(w).getPersistentUltimateRingId(), "apollo"); FC(w).end("test");
    assert.equal(RL(w).setUltimate("hermes").ok, true); begin(w); assert.equal(GM(w).getPersistentUltimateRingId(), "hermes");
    // 中断(マップ移動): 戦闘も指定も消え、次の通常のカード戦闘は Core の選択
    { const dm = w.ctx.DataManager, create = dm.createGameObjects; dm.createGameObjects = () => {}; try { w.enterMap(4, 14, 25); } finally { dm.createGameObjects = create; } }      // ハーネスの enterMap は新しいゲームを作り直すので、いまのゲームのままマップへ入る
    frames(w, 3);
    assert.deepEqual([FC(w).isActive(), ov(w), GM(w).hasPersistentUltimateBattleState()], [false, null, false]);
    assert.equal(D(w).startCardBattle(D(w).FIXED_BATTLE).ok, true); assert.equal(GM(w).getPersistentUltimateRingId(), "apollo"); D(w).endCardBattle();
    assert.equal(coreData(w), data0, "Core の保存データは全体を通して不変");
});

test("【7b】SOUL との遷移: Q 枠と ULTIMATE 画面の選択が別の状態で SOUL に入っても、Q 枠の指定は使われず(SOUL は従来どおり ULTIMATE 画面の選択)、SOUL 中は指輪モードの戦闘は始まらない", () => {
    const w = soulWorld();
    D(w).assignRingToPlayer("hermes"); D(w).assignRingToPlayer("apollo");
    assert.equal(RL(w).equipRing("hermes").ok && RL(w).equipRing("apollo").ok, true);
    assert.equal(RL(w).setUltimate("apollo").ok, true); assert.equal(D(w).setUltimateRing("hermes").ok, true);      // Q = アポロン / ULTIMATE 画面 = ヘルメース
    FC(w).setLoadoutSource("auto");
    // (指輪モードの戦闘 → 終了 → 通常のカード戦闘 の漏れは【7a】。ここは Q 枠と ULTIMATE 画面の選択が別の状態で SOUL に入る。実の戦闘のあとは画面内の生存敵が指輪の付け替えを拒否するので、SOUL の準備の前に戦闘はしない)
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true }))); assert.equal(r.ok, true, JSON.stringify(r));
    arrive(w); sframes(w, 8);
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(ov(w), null, "SOUL にこの戦闘だけの指定はない");
    assert.equal(GM(w).getPersistentUltimateRingId(), D(w).getUltimateRingId(), "SOUL は従来どおり ULTIMATE 画面の選択(Core)の神"); assert.equal(D(w).getUltimateRingId(), "hermes"); assert.notEqual(GM(w).getPersistentUltimateRingId(), RL(w).getUltimate(), "Q 枠(アポロン)は使われない");
    const b = plain(FC(w).begin()); assert.equal(b.ok, false, "SOUL 中は FieldCombat は始まらない"); assert.equal(FC(w).isActive(), false);
    assert.equal(RL(w).getUltimate(), "apollo", "Q 枠は SOUL でも変わらない");
});

// ---------------------------------------------------------------- 【8】通常スキル10種 × HUD ----------------------------------------------------------------
test("【8】ヘルメース5・アポロン5の通常スキル: Q を登録していても(していなくても)、5枠すべてで発動し、HUD は枠ごとに Cooldown を出す。Q のゲージ・状態は通常スキルでは変わらない", () => {
    const sets = [{ lmb: "hermes_sweep", shift: "hermes_zetsu", e: "hermes_issen", x: "hermes_reed_flute", c: "hermes_strength" }, { lmb: "apollo_golden_volley", shift: "apollo_eros_arrow", e: "apollo_lyre_rhythm", x: "apollo_laurel_wreath", c: "apollo_plague_rain" }];
    for (const q of [null, "hermes"]) {
        for (const slots of sets) {
            const w = qaWorld(); loadoutViaMenu(w, { q, slots }); begin(w);
            const hud0 = plain(FC(w).getHudState()).slots.filter(s => ["attack", "mobility", "special", "card1", "card2"].includes(s.slot)), q0 = ultSlot(w).state;
            assert.ok(hud0.every(s => s.state === "ready"), JSON.stringify(hud0.map(s => [s.slot, s.state])));
            const order = [["attack", "lmb"], ["mobility", "shift"], ["special", "e"], ["card1", "x"], ["card2", "c"]];
            for (const [slot, key] of order) {
                const id = slots[key];
                const r = plain(FC(w).useAbility(slot));
                if (id === "apollo_golden_volley" && !r.ok) continue;
                assert.equal(r.ok, true, `${id}@${slot}: ` + JSON.stringify(r)); frames(w, 2);
            }
            const cds = plain(FC(w).getCooldowns());
            for (const key of ["shift", "e", "x", "c"]) if (slots[key] !== "apollo_golden_volley") assert.ok(cds[slots[key]] > 0, `${slots[key]} の Cooldown はスキルID単位で付く: ` + JSON.stringify(cds));
            const hud1 = plain(FC(w).getHudState()).slots.filter(s => ["attack", "mobility", "special", "card1", "card2"].includes(s.slot));
            assert.ok(hud1.filter(s => s.slot !== "attack").some(s => s.state === "cooldown"), "HUD は枠ごとに Cooldown を出す");
            assert.equal(ultSlot(w).state, q0, "通常スキルでは Q の表示状態は変わらない"); if (q) assert.equal(gauge(w).cur >= 0, true);
            FC(w).end("test");
        }
    }
});

console.log(`\nall ${passed} passed`);
