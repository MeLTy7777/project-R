"use strict";
// メインメニューの「SKILL」= 指輪のスキル編成(RingLoadout の LMB / Shift / E / X / C / Q の登録)を、直接開く。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map)で、実Window / 実Escキーを通して動かす。MZの描画・音はstub。
// 実際のメインメニュー(原画)からのキー操作・見た目は → tools/mz_cdp/skill_menu_verify.cjs(実機)。
const assert = require("node:assert/strict");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(1, 5, 5); w.frames(2);
    w.deck = () => w.ctx.ProjectRCardDeck; w.rl = () => w.ctx.ProjectRRingLoadout; w.core = () => w.ctx.ProjectRMenuCore;
    w.own = (...ids) => { for (const id of ids) assert.equal(w.deck().assignRingToPlayer(id).ok, true, id); };
    w.state = () => plain(w.rl().getState());
    Object.assign(w.ctx.Graphics, { boxWidth: 1920, boxHeight: 1080 });
    w.open = (cls = "Scene_ProjectRSkillLoadout") => {
        const scene = new w.ctx[cls](); scene.create(); scene.start(); scene.update(); scene.popped = 0;
        w.ctx.SceneManager.pop = () => { scene.popped++; };
        return scene;
    };
    w.frame = (scene, n = 1) => { for (let i = 0; i < n; i++) { w.ctx.Input.update(); w.ctx.TouchInput.update(); scene.update(); } };
    w.press = (scene, code, keyCode) => { w.keyDown(code, keyCode); w.frame(scene, 2); w.keyUp(code, keyCode); w.frame(scene, 2); };
    return w;
}
const text = (win, redraw) => { const log = [], t = win.drawText, d = win.drawWrapped; win.drawText = function (x) { log.push(String(x)); return t.apply(this, arguments); }; win.drawWrapped = function (x) { log.push(String(x)); return d.apply(this, arguments); }; try { redraw(); } finally { win.drawText = t; win.drawWrapped = d; } return log.join("\n"); };
const chooseSlot = (scene, slot, pred) => {
    const i = scene._slots.items().findIndex(s => s.slot === slot); assert.ok(i >= 0, slot); scene._slots.select(i); scene._slots.processOk();
    const j = scene._choices.items().findIndex(pred); assert.ok(j >= 0, "候補がある"); scene._choices.select(j); scene._choices.processOk();
};
const equipViaTabs = (scene, ringId) => {                                              // 上の項目 →「指輪装備」→ 指輪 → 装備(既存の指輪画面の操作)
    scene._slots.deactivate(); scene._choices.deactivate(); scene._tabs.activate(); scene._tabs.select(0); scene._tabs.processOk();
    scene._rings.select(scene._rings.items().findIndex(e => e.ringId === ringId)); scene._rings.processOk();
    scene._targets.select(scene._targets.items().findIndex(t => t.kind === "equip")); scene._targets.processOk();
};

test("接続: メインメニューの SKILL(MenuHUD.commandScenes.skill)は指輪のスキル編成。重複の SKILL は作らない。デッキ構築の Scene / API は残る", () => {
    const w = world();
    const table = w.ctx.ProjectR.MenuHUD.commandScenes;
    assert.equal(table.skill, w.ctx.Scene_ProjectRSkillLoadout);
    assert.deepEqual([table.ultimate, table.item], [w.ctx.Scene_ProjectRUltimateSelect, w.ctx.Scene_ProjectRInventory], "ULTIMATE・ITEM は変わらない");
    assert.ok(Object.keys(table).filter(k => k === "skill").length === 1, "SKILL の入口は1つ");
    assert.equal(typeof w.ctx.Scene_ProjectRDeckBuilder, "function"); assert.equal(typeof w.ctx.ProjectRMenuIntegration.openDeckBuilder, "function");
    const pushed = []; const push = w.ctx.SceneManager.push; w.ctx.SceneManager.push = s => { pushed.push(s); };
    assert.equal(w.ctx.ProjectRMenuIntegration.openSkillLoadout(), true); w.ctx.SceneManager.push = push;
    assert.equal(pushed[0], w.ctx.Scene_ProjectRSkillLoadout);
    assert.ok(Object.getPrototypeOf(w.ctx.Scene_ProjectRSkillLoadout.prototype) === w.ctx.Scene_ProjectRRings.prototype, "既存の指輪画面を継承(別の編成画面は作らない)");
});

test("直接開く: スキル編成の枠の一覧(LMB / Shift / E / X / C / Q)が開いた状態で始まる。装備した指輪のスキルを登録でき、RingLoadout の保存領域に入る", () => {
    const w = world(); w.own("hermes", "apollo");
    const scene = w.open();
    assert.deepEqual([scene._slots.visible, scene._choices.visible, scene._rings.visible], [true, true, false], "スキル編成の表示");
    assert.deepEqual([scene._slots.active, scene._tabs.active], [true, false], "枠の一覧がすぐ動く(項目の選択を挟まない)");
    assert.deepEqual(plain(scene._slots.items().map(s => s.slot)), ["lmb", "shift", "e", "x", "c", "q"]);
    assert.equal(scene._slots.index(), 0);
    // 何も装備していない: 案内(空の状態)
    assert.match(scene._notice, /登録できるスキル・奥義がありません/); assert.match(scene._notice, /指輪装備/);
    assert.match(text(scene._header, () => scene.refreshHeader()), /登録できるスキル・奥義がありません/);
    scene._slots.select(0); scene._slots.processOk();
    assert.equal(scene._choices.active, false, "候補が無いので候補の一覧は開かない"); assert.match(scene._notice, /登録できるスキルがありません/);
    // 「指輪装備」で装備 → 戻ると候補が出る(既存の指輪装備の操作)
    equipViaTabs(scene, "hermes"); equipViaTabs(scene, "apollo");
    assert.deepEqual(w.state().equipped, ["hermes", "apollo"]);
    scene._tabs.select(1); scene._tabs.processOk();
    chooseSlot(scene, "lmb", c => c.skillId === "hermes_sweep"); chooseSlot(scene, "shift", c => c.skillId === "hermes_zetsu");
    chooseSlot(scene, "e", c => c.skillId === "apollo_eros_arrow"); chooseSlot(scene, "x", c => c.skillId === "hermes_issen"); chooseSlot(scene, "c", c => c.skillId === "apollo_golden_volley");
    chooseSlot(scene, "q", c => c.kind === "ultimate" && c.ringId === "apollo");
    assert.deepEqual(w.state(), { schema: 1, equipped: ["hermes", "apollo"], slots: { lmb: "hermes_sweep", shift: "hermes_zetsu", e: "apollo_eros_arrow", x: "hermes_issen", c: "apollo_golden_volley" }, ultimate: "apollo" });
    assert.deepEqual(plain(w.ctx.$gameSystem._projectRRingLoadout), w.state(), "保存領域(RingLoadout)に入る");
    // 重複の拒否(既存の検証)
    const i = scene._slots.items().findIndex(s => s.slot === "lmb"); scene._slots.select(i); scene._slots.processOk();
    assert.equal(scene._choices.items().find(c => c.skillId === "hermes_zetsu").enabled, false, "ほかの枠で使用中のスキルは選べない");
});

test("戻る操作は従来どおり1つずつ: 枠の一覧 → (Esc)→ 上の項目 → (Esc)→ メインメニュー。上の項目から「指輪装備」(装備・仲間への受け渡し)へ切り替えられる", () => {
    const w = world(); w.own("hermes");
    const scene = w.open();
    w.press(scene, "Escape", 27);
    assert.deepEqual([scene._tabs.active, scene._slots.active, scene.popped], [true, false, 0], "1回目のEscは上の項目へ(閉じない)");
    // 候補の一覧からも1段ずつ
    scene._tabs.select(1); scene._tabs.processOk(); equipViaTabs(scene, "hermes"); scene._tabs.select(1); scene._tabs.processOk();
    scene._slots.select(0); scene._slots.processOk(); assert.equal(scene._choices.active, true);
    w.press(scene, "Escape", 27); assert.deepEqual([scene._choices.active, scene._slots.active], [false, true], "候補 → 枠の一覧");
    w.press(scene, "Escape", 27); assert.equal(scene._tabs.active, true);
    // 上の項目から指輪装備へ(左右で切替・決定)
    scene._tabs.select(0); assert.deepEqual([scene._rings.visible, scene._slots.visible], [true, false]); scene._tabs.processOk(); assert.equal(scene._rings.active, true, "指輪装備・受け渡しが使える");
    w.press(scene, "Escape", 27); assert.equal(scene._tabs.active, true);
    w.press(scene, "Escape", 27); assert.equal(scene.popped, 1, "上の項目でEscするとメインメニューへ戻る(1回だけ)");
});

test("空の状態: 装備中の指輪が無い / 装備中の指輪に登録できるものが無い(Themis だけ)ときは案内が出る。使える指輪を装備して開き直すと出ない", () => {
    const w = world(); w.own("hermes", "themis");
    const s0 = w.open(); assert.match(s0._notice, /登録できるスキル・奥義がありません/);
    assert.equal(w.rl().equipRing("themis").ok, true);
    const s1 = w.open(); assert.match(s1._notice, /登録できるスキル・奥義がありません/, "装備中の指輪が未実装の Themis だけ: 登録できるものなし");
    assert.equal(w.rl().equipRing("hermes").ok, true);
    const s2 = w.open(); assert.equal(s2._notice, "", "使える指輪があれば案内は出ない");
    assert.deepEqual([s2._slots.active, s2._choices.active], [true, false]);
});

test("戦闘中は編集できない: メニューは開けず(Scene_Map の許可・open)、開いた画面でもモデルが拒否して状態は変わらない。戦闘後は編集できる", () => {
    const w = world(); w.own("hermes");
    assert.equal(w.rl().equipRing("hermes").ok, true);
    const scene = w.open(); chooseSlot(scene, "lmb", c => c.skillId === "hermes_sweep");
    const before = w.state();
    assert.equal(w.ctx.ProjectRCombatPresence.beginCombatEvent("skillMenu"), true);
    assert.equal(w.ctx.ProjectRMenuIntegration.isMenuBlocked(), true);
    const pushed = []; const push = w.ctx.SceneManager.push; w.ctx.SceneManager.push = s => { pushed.push(s); };
    assert.equal(w.ctx.ProjectRMenuIntegration.openSkillLoadout(), false, "戦闘中は SKILL を開けない"); w.ctx.SceneManager.push = push; assert.equal(pushed.length, 0);
    assert.equal(w.ctx.SceneManager._scene.isMenuEnabled(), false, "マップのメニュー呼び出しも止まる");
    const locked = w.open(); assert.match(text(locked._header, () => locked.refreshHeader()), /戦闘中は装備・編成を変更できません/);
    chooseSlot(locked, "shift", c => c.skillId === undefined ? false : true);
    assert.match(locked._notice, /戦闘中は変更できません/); assert.deepEqual(w.state(), before, "状態は変わらない");
    w.ctx.ProjectRCombatPresence.endCombatEvent("skillMenu");
    assert.equal(w.ctx.ProjectRMenuIntegration.isMenuBlocked(), false);
    const after = w.open(); chooseSlot(after, "lmb", c => c.kind === "clear"); assert.equal(w.state().slots.lmb, null, "戦闘後は編集できる");
});

test("ほかの経路は変わらない: ULTIMATE 画面の選択・ULTIMATE → Tab → 指輪画面(従来の入口)・RingLoadout の保存・SOUL のデータ", () => {
    const w = world(); w.own("hermes", "apollo");
    assert.equal(w.rl().equipRing("hermes").ok && w.rl().equipRing("apollo").ok, true);
    const soul0 = JSON.stringify(w.ctx.$gameSystem._projectRSoulLoadout ?? null), core0 = JSON.stringify(w.deck().getPersistentData());
    const scene = w.open(); chooseSlot(scene, "q", c => c.kind === "ultimate" && c.ringId === "hermes");
    assert.equal(w.rl().getUltimate(), "hermes"); assert.equal(JSON.stringify(w.deck().getPersistentData()), core0, "ULTIMATE 画面の選択(Core)は変わらない(Q 枠とは別)");
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRSoulLoadout ?? null), soul0, "SOUL のデータは変わらない");
    const ult = new w.ctx.Scene_ProjectRUltimateSelect(); ult.create(); const pushed = []; const push = w.ctx.SceneManager.push; w.ctx.SceneManager.push = s => { pushed.push(s); };
    w.keyDown("Tab", 9); w.ctx.Input.update(); ult.update(); w.keyUp("Tab", 9); w.ctx.SceneManager.push = push;
    assert.equal(pushed.at(-1), w.ctx.Scene_ProjectRRings, "ULTIMATE → Tab → 指輪画面(従来どおり)");
    assert.equal(w.ctx.ProjectRMenuIntegration.openRings(), true);
});

console.log(`\nall ${passed} passed`);
