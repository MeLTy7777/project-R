"use strict";
// Stage 1C: 「指輪」メニュー(Scene_ProjectRRings)の「指輪装備」「スキル編成」の Node テスト。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map)で、実Window_Selectable / Window_Base を通して動かす。MZの描画・音はstub。
// 対象外: 実際の描画ピクセル・マウス座標。見た目と操作感は実機(RPGツクールMZ)で手動確認する。FieldCombatへの接続はStage 1D。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

const ROOT = path.resolve(__dirname, "..");
const KEY = "_projectRRingLoadout";
const HERMES = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"]; // 薙ぎ払い・絶・一閃・葦笛・ストレングス
const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"]; // 黄金の矢・エロスの矢・竪琴・月桂冠・疫病の矢
const SLOT_ORDER = ["lmb", "shift", "e", "x", "c", "q"];

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(1, 5, 5);
    w.frames(2);
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.rl = () => w.ctx.ProjectRRingLoadout;
    w.core = () => w.ctx.ProjectRMenuCore;
    w.own = (...ids) => { for (const id of ids) assert.equal(w.deck().assignRingToPlayer(id).ok, true, id); };
    w.state = () => plain(w.rl().getState());
    w.allowAlly = (actorId, ...ringIds) => {
        for (const ringId of ringIds) {
            const ring = w.deck().definitions.ring(ringId);
            w.deck().definitions.rings.set(ringId, Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
        }
    };
    // 実機の画面サイズ(data/System.json: 1920x1080)。テスト環境のGraphicsには無いので設定する(無いと窓の大きさが0になる)。
    Object.assign(w.ctx.Graphics, { boxWidth: 1920, boxHeight: 1080 });
    w.open = () => {
        const scene = new w.ctx.Scene_ProjectRRings();
        scene.create();
        scene.start();
        scene.update();
        scene.popped = 0;
        w.ctx.SceneManager.pop = () => { scene.popped++; };
        return scene;
    };
    w.frame = (scene, n = 1) => { for (let i = 0; i < n; i++) { w.ctx.Input.update(); w.ctx.TouchInput.update(); scene.update(); } };
    w.press = (scene, code, keyCode) => { w.keyDown(code, keyCode); w.frame(scene, 2); w.keyUp(code, keyCode); w.frame(scene, 2); };
    return w;
}
const EMPTY_SLOTS = { lmb: null, shift: null, e: null, x: null, c: null };
const slotsOf = (overrides = {}) => ({ ...EMPTY_SLOTS, ...overrides });

// ---- 画面操作の補助(実Windowのselect / processOk / processCancel を通す) ----
const ringIndex = (scene, id) => { const i = scene._rings.items().findIndex(e => e.ringId === id); assert.ok(i >= 0, `一覧に ${id} がある`); return i; };
// 実際の操作順: 項目で決定して(その側の一覧が動く)から、一覧で選ぶ。ほかの窓は動いていない状態にそろえる。
function enterMode(scene, mode) {
    for (const win of [scene._rings, scene._targets, scene._slots, scene._choices]) win.deactivate();
    scene._tabs.activate();
    scene._tabs.select(mode);
    scene._tabs.processOk();
}
function chooseRingAction(scene, ringId, kind) {
    enterMode(scene, 0);
    scene._rings.select(ringIndex(scene, ringId));
    scene._rings.processOk();                                                    // 操作の一覧を開く
    const index = scene._targets.items().findIndex(t => t.kind === kind);
    assert.ok(index >= 0, `${ringId}: 操作 ${kind} がある`);
    scene._targets.select(index);
    scene._targets.processOk();
}
function openSlot(scene, slot) {
    enterMode(scene, 1);
    const index = scene._slots.items().findIndex(s => s.slot === slot);
    assert.ok(index >= 0, slot);
    scene._slots.select(index);
    scene._slots.processOk();                                                    // 候補の一覧を開く(候補が無ければ開かない)
}
function chooseChoice(scene, predicate) {
    const index = scene._choices.items().findIndex(predicate);
    assert.ok(index >= 0, "候補がある");
    scene._choices.select(index);
    scene._choices.processOk();
}
const assignViaScene = (scene, slot, skillOrRing) => {
    openSlot(scene, slot);
    chooseChoice(scene, c => c.skillId === skillOrRing || (c.kind === "ultimate" && c.ringId === skillOrRing));
};
const clearViaScene = (scene, slot) => { openSlot(scene, slot); chooseChoice(scene, c => c.kind === "clear"); };
const equipViaScene = (scene, ringId) => chooseRingAction(scene, ringId, "equip");
// 描画した文字を集める(実Window_BaseのdrawTextを差し替えて記録。描画そのものは確認しない)
function captureDraw(win, redraw) {
    const log = [];
    const original = win.drawText;
    win.drawText = function(text) { log.push(String(text)); return original.apply(this, arguments); };
    redraw();
    win.drawText = original;
    return log;
}

test("メニュー構造: 既存の指輪画面に「指輪装備」「スキル編成」の2項目。最初は項目の選択。左右で切替・決定で入る・Escで1段ずつ戻る", () => {
    const w = world();
    const scene = w.open();
    assert.ok(scene instanceof w.ctx.Scene_MenuBase);
    // レイアウト: すべての窓が画面内に収まり、一覧に行が出る高さがある(ヘッダー・項目・一覧・説明帯・操作説明帯が縦に重ならない)
    for (const win of [scene._header, scene._tabs, scene._rings, scene._targets, scene._slots, scene._choices, scene._detail, scene._hintWindow]) {
        assert.ok(win.width > 0 && win.height > 0 && win.x >= 0 && win.y >= 0 && win.x + win.width <= 1920 && win.y + win.height <= 1080, "画面内: " + win.constructor.name);
    }
    assert.ok(scene._rings.maxPageRows() >= 6 && scene._slots.maxPageRows() >= 6, "一覧に6行以上出る");
    const bottoms = [scene._header, scene._tabs, scene._rings, scene._detail, scene._hintWindow].map(win => [win.y, win.y + win.height]);
    for (let i = 1; i < bottoms.length; i++) assert.ok(bottoms[i][0] >= bottoms[i - 1][1], "縦に重ならない: " + i);
    assert.deepEqual(plain(scene._tabs._labels), ["指輪装備", "スキル編成"]);
    assert.equal(scene._tabs.active, true, "最初に動くのは項目の選択");
    assert.equal(scene._rings.active, false);
    assert.deepEqual([scene._rings.visible, scene._targets.visible, scene._slots.visible, scene._choices.visible], [true, true, false, false], "指輪装備が表示される");
    // 左右(=項目の選択)で、表示が切り替わる
    scene._tabs.select(1);
    assert.deepEqual([scene._rings.visible, scene._targets.visible, scene._slots.visible, scene._choices.visible], [false, false, true, true]);
    scene._tabs.select(0);
    assert.deepEqual([scene._rings.visible, scene._slots.visible], [true, false]);
    // 決定で入る → Escで項目へ戻る → もう一度Escで画面を閉じる(1回だけ)
    scene._tabs.processOk();
    assert.deepEqual([scene._tabs.active, scene._rings.active], [false, true]);
    w.press(scene, "Escape", 27);
    assert.deepEqual([scene._tabs.active, scene._rings.active, scene.popped], [true, false, 0], "指輪一覧のEscは項目へ戻る(閉じない)");
    scene._tabs.select(1);
    scene._tabs.processOk();
    assert.equal(scene._slots.active, true);
    w.press(scene, "Escape", 27);
    assert.deepEqual([scene._tabs.active, scene._slots.active, scene.popped], [true, false, 0]);
    w.press(scene, "Escape", 27);
    assert.equal(scene.popped, 1, "項目の段階のEscで画面を閉じる(1回だけ)");
});

test("メニュー接続: ULTIMATE画面のTab近道・openRings は従来どおり同じ画面を開く。他のメニュー画面は変わらない", () => {
    const w = world();
    assert.equal(typeof w.ctx.ProjectRMenuIntegration.openRings, "function");
    assert.equal(w.ctx.ProjectRMenuIntegration.openRings(), true);
    assert.equal(w.ctx.SceneManager._stack.length >= 0, true);
    const ultimate = new w.ctx.Scene_ProjectRUltimateSelect();
    ultimate.create();
    const pushed = [];
    const push = w.ctx.SceneManager.push;
    w.ctx.SceneManager.push = scene => { pushed.push(scene); };
    w.keyDown("Tab", 9); w.ctx.Input.update(); ultimate.update(); w.keyUp("Tab", 9);
    w.ctx.SceneManager.push = push;
    assert.equal(pushed.at(-1), w.ctx.Scene_ProjectRRings, "ULTIMATE → Tab → 指輪");
    const table = w.ctx.ProjectR.MenuHUD.commandScenes;
    assert.deepEqual([table.skill, table.ultimate, table.item], [w.ctx.Scene_ProjectRSkillLoadout, w.ctx.Scene_ProjectRUltimateSelect, w.ctx.Scene_ProjectRInventory], "SKILL は指輪のスキル編成を直接開く(旧: デッキ構築)");
});

test("指輪装備: 「所持」と「主人公の装備」を別々に表示する。入手しても自動装備・自動登録されない", () => {
    const w = world();
    w.own("hermes", "apollo");
    assert.deepEqual(w.state(), { schema: 1, equipped: [], slots: EMPTY_SLOTS, ultimate: null }, "入手しただけでは装備も登録もされない");
    const scene = w.open();
    const entries = plain(scene._rings.items());
    const by = id => entries.find(e => e.ringId === id);
    assert.deepEqual([by("hermes").ownedByPlayer, by("hermes").equipped], [true, false], "所持しているが未装備");
    assert.deepEqual([by("janus").ownedByPlayer, by("janus").equipped], [false, false]);
    const text = () => captureDraw(scene._rings, () => scene._rings.refresh());
    let drawn = text();
    assert.ok(drawn.includes("所持：主人公") && drawn.includes("装備：未装備"), "所持と装備が別の文字で出る: " + drawn.join(" / "));
    assert.ok(drawn.includes("所持：未所持") && drawn.includes("装備：―"), "持っていない指輪は装備できない(―): " + drawn.join(" / "));
    equipViaScene(scene, "hermes");
    assert.deepEqual(w.state().equipped, ["hermes"]);
    assert.deepEqual(w.state().slots, EMPTY_SLOTS, "装備してもスキルは自動登録されない");
    assert.equal(w.state().ultimate, null);
    drawn = text();
    assert.ok(drawn.includes("装備：装備中") && drawn.includes("装備：未装備"), "hermes=装備中 / apollo=未装備");
    assert.match(scene._info, /自動では登録されません/);
    assert.equal(scene._notice, "");
    // 詳細パネル: 所持・装備・登録中
    scene._rings.select(ringIndex(scene, "hermes"));
    assert.match(scene.equipDetailLines().join("\n"), /所持：主人公　装備：装備中[\s\S]*登録中：なし/);
});

test("指輪装備: 主人公は指輪をいくつでも装備できる(上限なし)。外す操作に切り替わり、外すと未装備に戻る", () => {
    const w = world();
    const rings = ["hermes", "apollo", "janus", "themis", "athena"];
    w.own(...rings);
    const scene = w.open();
    for (const id of rings) equipViaScene(scene, id);
    assert.deepEqual(w.state().equipped, rings, "5つすべて装備できる");
    scene._rings.select(ringIndex(scene, "janus"));
    scene.refreshTargets();
    assert.equal(scene._targets.items()[0].label, "主人公の装備を外す");
    chooseRingAction(scene, "janus", "equip");
    assert.deepEqual(w.state().equipped, ["hermes", "apollo", "themis", "athena"]);
    assert.equal(w.core().loadout.rings().find(e => e.ringId === "janus").ownedByPlayer, true, "外しても所持は変わらない");
    // 未所持の指輪には操作が出ない
    w.deck().setRingUnowned("themis");
    scene.refreshAll();
    scene._rings.select(ringIndex(scene, "themis"));
    scene._rings.processOk();
    assert.match(scene._notice, /移せる相手がいません/);
    assert.deepEqual(w.state().equipped, ["hermes", "apollo", "athena"], "未所持になった指輪の装備は自動で外れる");
});

test("仲間への受け渡しも同じ流れ: 装備を外す・仲間に渡すと登録を解除。主人公へ戻しても装備・登録は復元しない。既存の制限は変わらない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.allowAlly(4, "hermes", "apollo");
    const scene = w.open();
    equipViaScene(scene, "hermes"); equipViaScene(scene, "apollo");
    assignViaScene(scene, "lmb", "hermes_sweep");
    assignViaScene(scene, "shift", "hermes_zetsu");
    assignViaScene(scene, "x", "apollo_golden_volley");
    assignViaScene(scene, "q", "hermes");
    assert.deepEqual(w.state(), { schema: 1, equipped: ["hermes", "apollo"], slots: slotsOf({ lmb: "hermes_sweep", shift: "hermes_zetsu", x: "apollo_golden_volley" }), ultimate: "hermes" });
    // 受け渡しの操作は従来どおり同じ一覧に並ぶ
    scene._tabs.select(0);
    scene._rings.select(ringIndex(scene, "hermes"));
    scene.refreshTargets();
    assert.deepEqual(plain(scene._targets.items().map(t => t.kind)), ["equip", "actor"]);
    chooseRingAction(scene, "hermes", "actor");
    assert.equal(w.deck().getRingOwner("hermes"), "actor:4");
    assert.deepEqual(w.state(), { schema: 1, equipped: ["apollo"], slots: slotsOf({ x: "apollo_golden_volley" }), ultimate: null }, "渡した指輪の装備・スキル・奥義が消え、他の指輪は残る");
    assert.match(scene._info, /解除/);
    assert.match(scene._info, /薙ぎ払い/);
    // 1人1つまでの制限は従来どおり
    scene._rings.select(ringIndex(scene, "apollo"));
    scene.refreshTargets();
    const apolloToActor = scene._targets.items().find(t => t.kind === "actor");
    assert.equal(apolloToActor.enabled, false);
    chooseRingAction(scene, "apollo", "actor");
    assert.match(scene._notice, /1人1つ/);
    assert.equal(w.deck().getRingOwner("apollo"), "player");
    // 主人公へ戻す: 所持は戻るが、装備も登録も自動では戻らない
    scene._rings.select(ringIndex(scene, "hermes"));
    scene.refreshTargets();
    assert.equal(scene._targets.items()[0].kind, "player");
    assert.match(scene._targets.items()[0].label, /未装備で戻ります/);
    chooseRingAction(scene, "hermes", "player");
    assert.equal(w.deck().getRingOwner("hermes"), "player");
    assert.deepEqual(w.state(), { schema: 1, equipped: ["apollo"], slots: slotsOf({ x: "apollo_golden_volley" }), ultimate: null }, "戻しても復元しない");
    equipViaScene(scene, "hermes");
    assert.deepEqual(w.state().slots, slotsOf({ x: "apollo_golden_volley" }), "再装備しても登録は復元しない");
    assert.equal(w.state().ultimate, null);
});

test("スキル編成: 6枠(LMB/Shift/E/X/C/Q)。枠→候補の順に選び、装備中の指輪の承認済みスキルだけが候補に出る", () => {
    const w = world();
    w.own("hermes", "apollo");
    const scene = w.open();
    assert.deepEqual(plain(scene._slots.items().map(s => s.slot)), SLOT_ORDER);
    assert.deepEqual(plain(scene._slots.items().map(s => s.key)), ["LMB", "Shift", "E", "X", "C", "Q"]);
    // 何も装備していない間は、候補が無く、枠を開けない
    openSlot(scene, "lmb");
    assert.equal(scene._choices.active, false);
    assert.match(scene._notice, /指輪装備/);
    assert.deepEqual(plain(w.core().loadout.choices("lmb").map(c => c.kind)), ["clear"]);
    // hermes だけ装備: 候補は承認済みの5スキル(表の順)。サイコポンポス・ヴェイルなど表に無いものと、未装備のapolloは出ない
    equipViaScene(scene, "hermes");
    const choices = plain(w.core().loadout.choices("lmb"));
    assert.deepEqual(choices.map(c => c.kind), ["clear", "skill", "skill", "skill", "skill", "skill"]);
    assert.deepEqual(choices.filter(c => c.kind === "skill").map(c => c.skillId), HERMES);
    assert.deepEqual(choices.filter(c => c.kind === "skill").map(c => c.name), ["薙ぎ払い", "絶", "一閃", "葦笛", "ストレングス"], "日本語名");
    assert.ok(!choices.some(c => ["hermes_psychopomp", "hermes_veil"].includes(c.skillId) || APOLLO.includes(c.skillId)));
    // apollo も装備すると、承認済みの5スキルが加わる(10種のみ)
    equipViaScene(scene, "apollo");
    assert.deepEqual(plain(w.core().loadout.choices("e").filter(c => c.kind === "skill").map(c => c.skillId)), HERMES.concat(APOLLO));
    // 画面から登録: 枠 → 候補。登録後は枠の一覧へ戻る
    openSlot(scene, "lmb");
    assert.equal(scene._choices.active, true);
    assert.equal(scene._choices.index(), 1, "誤って空欄にしないよう、最初の候補にカーソルを置く");
    chooseChoice(scene, c => c.skillId === "hermes_sweep");
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    assert.deepEqual([scene._slots.active, scene._choices.active], [true, false]);
    assert.match(scene._info, /LMB枠に「薙ぎ払い」を登録しました/);
    // 枠の一覧の描画: 登録内容が出る
    const drawn = captureDraw(scene._slots, () => scene._slots.refresh());
    assert.ok(drawn.includes("薙ぎ払い") && drawn.includes("（空欄）"), drawn.join(" / "));
    // Escで1段ずつ戻る
    openSlot(scene, "shift");
    assert.equal(scene._choices.active, true);
    w.press(scene, "Escape", 27);
    assert.deepEqual([scene._choices.active, scene._slots.active, scene.popped], [false, true, 0]);
    assert.equal(w.rl().getSkill("shift"), null, "キャンセルでは何も登録されない");
});

test("スキル編成: 枠を空欄にできる。登録中の項目にカーソルが置かれる。空欄のときの「空欄にする」は変更なし", () => {
    const w = world();
    w.own("hermes");
    const scene = w.open();
    equipViaScene(scene, "hermes");
    assignViaScene(scene, "e", "hermes_issen");
    assert.equal(w.rl().getSkill("e"), "hermes_issen");
    openSlot(scene, "e");
    assert.equal(scene._choices.items()[scene._choices.index()].skillId, "hermes_issen", "登録中の項目にカーソル");
    assert.equal(scene._choices.items().find(c => c.skillId === "hermes_issen").selected, true);
    chooseChoice(scene, c => c.kind === "clear");
    assert.equal(w.rl().getSkill("e"), null);
    assert.match(scene._info, /E枠を空欄にしました/);
    clearViaScene(scene, "e");
    assert.equal(w.rl().getSkill("e"), null);
    assert.match(scene._info, /変更はありません/);
    // 他の枠は変わらない
    assignViaScene(scene, "lmb", "hermes_sweep");
    clearViaScene(scene, "e");
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
});

test("重複の拒否: 同じスキルは2つの枠に登録できない(候補は灰色・画面もモデルもAPIも拒否)。同じ枠への再登録は変更なし", () => {
    const w = world();
    w.own("hermes");
    const scene = w.open();
    equipViaScene(scene, "hermes");
    assignViaScene(scene, "lmb", "hermes_sweep");
    // 画面: 他の枠で使用中の候補は enabled:false で、使用中の枠名が出る。決定しても登録されない
    openSlot(scene, "shift");
    const sweep = scene._choices.items().find(c => c.skillId === "hermes_sweep");
    assert.deepEqual([sweep.enabled, sweep.usedByKey], [false, "LMB"]);
    assert.ok(captureDraw(scene._choices, () => scene._choices.refresh()).includes("LMB枠で使用中"));
    chooseChoice(scene, c => c.skillId === "hermes_sweep");
    assert.equal(w.rl().getSkill("shift"), null);
    assert.match(scene._notice, /LMB枠に登録されています/);
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    // モデルとAPIも直接の呼び出しを拒否する
    const model = w.core().loadout.assign("shift", { kind: "skill", skillId: "hermes_sweep" });
    assert.deepEqual([model.ok, model.reason, model.changed], [false, "duplicateSkill", false]);
    assert.match(model.message, /LMB枠に登録されています/);
    const api = w.rl().setSkill("e", "hermes_sweep");
    assert.deepEqual([api.ok, api.reason, api.slot], [false, "duplicateSkill", "lmb"]);
    assert.deepEqual(w.state().slots, slotsOf({ lmb: "hermes_sweep" }));
    // 同じ枠への再登録は変更なし(重複ではない)
    assert.deepEqual(plain(w.core().loadout.assign("lmb", { kind: "skill", skillId: "hermes_sweep" })), { ok: true, reason: null, message: "", changed: false });
    // 使っていたスキルを空ければ、別の枠に登録できる
    clearViaScene(scene, "lmb");
    assignViaScene(scene, "shift", "hermes_sweep");
    assert.deepEqual(w.state().slots, slotsOf({ shift: "hermes_sweep" }));
});

test("Q枠(奥義): 装備中で奥義が実装済みの指輪ごとに1つ。選び直すと置き換わり、空欄にできる。未実装・未装備の指輪は出ない", () => {
    const w = world();
    w.own("hermes", "apollo", "themis");
    const scene = w.open();
    for (const id of ["hermes", "apollo", "themis"]) equipViaScene(scene, id);
    const choices = plain(w.core().loadout.choices("q"));
    assert.deepEqual(choices.map(c => c.kind), ["clear", "ultimate", "ultimate"]);
    assert.deepEqual(choices.filter(c => c.kind === "ultimate").map(c => c.ringId), ["hermes", "apollo"], "themis は奥義が未実装なので出ない");
    assert.deepEqual(choices.filter(c => c.kind === "ultimate").map(c => c.name), ["ヘルメースの奥義", "アポロンの奥義"]);
    assignViaScene(scene, "q", "apollo");
    assert.equal(w.rl().getUltimate(), "apollo");
    assert.match(scene._info, /Q枠に「アポロンの奥義」を登録しました/);
    assignViaScene(scene, "q", "hermes");
    assert.equal(w.rl().getUltimate(), "hermes", "1つだけ: 置き換わる");
    // 通常スキルは奥義に影響しない。Q枠に通常スキルは登録できない
    assignViaScene(scene, "lmb", "hermes_sweep");
    assert.equal(w.rl().getUltimate(), "hermes");
    assert.deepEqual(plain(w.core().loadout.assign("q", { kind: "skill", skillId: "hermes_issen" })).ok, false);
    assert.deepEqual(plain(w.core().loadout.assign("q", { kind: "ultimate", ringId: "themis" })).reason, "ULTIMATE_NOT_IMPLEMENTED");
    assert.equal(w.rl().getUltimate(), "hermes");
    clearViaScene(scene, "q");
    assert.equal(w.rl().getUltimate(), null);
    // 装備を外した指輪の奥義は候補に出ない
    equipViaScene(scene, "apollo");        // apolloを外す
    assert.deepEqual(plain(w.core().loadout.choices("q").filter(c => c.kind === "ultimate").map(c => c.ringId)), ["hermes"]);
    // 奥義が登録できる指輪が無いときは、枠を開けない
    equipViaScene(scene, "hermes");        // hermesを外す
    assert.deepEqual(w.state().equipped, ["themis"]);
    openSlot(scene, "q");
    assert.equal(scene._choices.active, false);
    assert.match(scene._notice, /登録できる奥義がありません/);
});

test("装備を外す: その指輪のスキル・奥義の登録だけが消える(他の指輪は残る)。再装備しても自動復元しない。画面に解除内容が出る", () => {
    const w = world();
    w.own("hermes", "apollo");
    const scene = w.open();
    equipViaScene(scene, "hermes"); equipViaScene(scene, "apollo");
    assignViaScene(scene, "lmb", "hermes_sweep");
    assignViaScene(scene, "shift", "apollo_golden_volley");
    assignViaScene(scene, "c", "hermes_strength");
    assignViaScene(scene, "q", "hermes");
    equipViaScene(scene, "hermes");        // 外す
    assert.deepEqual(w.state(), { schema: 1, equipped: ["apollo"], slots: slotsOf({ shift: "apollo_golden_volley" }), ultimate: null });
    assert.match(scene._info, /装備を外しました/);
    assert.match(scene._info, /薙ぎ払い\/LMB/);
    assert.match(scene._info, /ストレングス\/C/);
    assert.match(scene._info, /奥義/);
    equipViaScene(scene, "hermes");        // 再装備
    assert.deepEqual(w.state(), { schema: 1, equipped: ["apollo", "hermes"], slots: slotsOf({ shift: "apollo_golden_volley" }), ultimate: null }, "再装備しても復元しない");
    // 何も登録していない指輪を外しても、解除の説明は出ない
    equipViaScene(scene, "hermes");
    assert.doesNotMatch(scene._info, /登録していた/);
});

test("戦闘中は変更できない: 画面操作・モデル・RingLoadout API(直接呼び出し)のすべてが拒否し、状態は変わらない", () => {
    const w = world();
    w.own("hermes", "apollo");
    const scene = w.open();
    equipViaScene(scene, "hermes");
    assignViaScene(scene, "lmb", "hermes_sweep");
    assignViaScene(scene, "q", "hermes");
    const before = w.state();
    const deckBefore = JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData);
    assert.equal(w.ctx.ProjectRCombatPresence.beginCombatEvent("menu1C"), true);
    // 画面
    equipViaScene(scene, "apollo");
    assert.match(scene._notice, /戦闘中は変更できません/);
    chooseRingAction(scene, "hermes", "equip");
    assert.match(scene._notice, /戦闘中は変更できません/);
    assignViaScene(scene, "shift", "hermes_zetsu");
    assert.match(scene._notice, /戦闘中は変更できません/);
    clearViaScene(scene, "lmb");
    assert.match(scene._notice, /戦闘中は変更できません/);
    assert.ok(captureDraw(scene._header, () => scene.refreshHeader()).includes("戦闘中は装備・編成を変更できません。"));
    // モデル
    const model = w.core().loadout;
    for (const result of [model.equip("apollo"), model.unequip("hermes"), model.assign("e", { kind: "skill", skillId: "hermes_issen" }), model.assign("q", { kind: "clear" })]) {
        assert.deepEqual([result.ok, result.reason], [false, "inCombat"]);
    }
    // RingLoadout API の直接呼び出し
    const api = w.rl();
    for (const result of [api.equipRing("apollo"), api.unequipRing("hermes"), api.setSkill("e", "hermes_issen"), api.clearSkill("lmb"), api.setUltimate("hermes"), api.clearUltimate()]) {
        assert.deepEqual([result.ok, result.reason], [false, "inCombat"]);
    }
    // 受け渡しも従来どおり拒否
    w.allowAlly(4, "hermes");
    assert.equal(w.core().rings.transferToActor("hermes", 4).reason, "inCombat");
    assert.deepEqual(w.state(), before, "状態は変わらない");
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData), deckBefore);
    w.ctx.ProjectRCombatPresence.endCombatEvent("menu1C");
});

test("保存・既存データ: 画面操作の結果はRingLoadoutの保存領域に入り、保存→ロードで同じ状態に戻る。CardDeckCore・SOULのデータには触れない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.ctx.$gameSystem._projectRSoulLoadout = { version: 1, slots: ["hermes_issen", "hermes_sweep"] };
    const soul = JSON.stringify(w.ctx.$gameSystem._projectRSoulLoadout);
    const ultimateBefore = w.deck().getUltimateRingId();
    const scene = w.open();
    equipViaScene(scene, "hermes"); equipViaScene(scene, "apollo");
    const deckDataAfterEquip = JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData);
    assignViaScene(scene, "lmb", "hermes_sweep");
    assignViaScene(scene, "x", "apollo_plague_rain");
    assignViaScene(scene, "q", "apollo");
    const expected = { schema: 1, equipped: ["hermes", "apollo"], slots: slotsOf({ lmb: "hermes_sweep", x: "apollo_plague_rain" }), ultimate: "apollo" };
    assert.deepEqual(plain(w.ctx.$gameSystem[KEY]), expected, "保存領域に入っている");
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRCardDeckData), deckDataAfterEquip, "スキル・奥義の編成はCardDeckCoreの保存データを変えない");
    assert.equal(JSON.stringify(w.ctx.$gameSystem._projectRSoulLoadout), soul, "SOULの保存領域は変わらない");
    assert.equal(w.deck().getUltimateRingId(), ultimateBefore, "既存の奥義選択(CardDeckCore)は、Q枠の編成では変わらない");
    // 保存 → ロード
    const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    w.ctx.DataManager.createGameObjects();
    w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
    assert.deepEqual(w.state(), expected, "ロード後も同じ");
    const scene2 = w.open();
    assert.deepEqual(plain(scene2._slots.items().map(s => s.name)), ["薙ぎ払い", "", "", "疫病の矢", "", "アポロンの奥義"], "画面にも反映される");
    assert.equal(scene2._rings.items().filter(e => e.equipped).length, 2);
    // 画面コードは保存データを直接書き換えない(RingLoadout・MenuCoreのAPI経由だけ)
    for (const file of ["js/plugins/ProjectR_RingParty.js", "js/plugins/ProjectR_MenuCore.js"]) {
        const source = fs.readFileSync(path.join(ROOT, file), "utf8");
        assert.ok(!source.includes("_projectRRingLoadout"), file + " は保存領域のキーを直接扱わない");
        assert.ok(!/\$gameSystem\s*\[/.test(source) && !/\$gameSystem\._projectR\w+\s*=[^=]/.test(source), file + " は$gameSystemへ書き込まない");
    }
});

test("既存機能への影響なし: RingLoadoutが無ければ従来の指輪画面(受け渡しのみ)。奥義(Q)はまだRingLoadoutに接続しない(FieldCombatの通常スキルは Stage 1D-1)", () => {
    const w = world();
    w.own("hermes");
    w.allowAlly(4, "hermes");
    w.run("delete window.ProjectRRingLoadout");                                  // RingLoadoutが読み込まれていない環境を再現(VM内で削除)
    const scene = w.open();
    assert.equal(scene._hub, false);
    assert.equal(scene._tabs, undefined);
    assert.equal(scene._rings.active, true, "従来どおり指輪一覧が最初から動く");
    scene._rings.select(ringIndex(scene, "hermes"));
    scene._rings.processOk();
    assert.deepEqual(plain(scene._targets.items().map(t => t.kind)), ["actor"], "装備の操作は出ず、受け渡しだけ");
    scene._targets.select(0); scene._targets.processOk();
    assert.equal(w.deck().getRingOwner("hermes"), "actor:4");
    w.press(scene, "Escape", 27);
    assert.equal(scene.popped, 1, "従来どおり一覧のEscで画面を閉じる");
    assert.equal(w.core().loadout.available(), false);
    // 奥義実行・CardDeckCore・SOUL はRingLoadoutを参照しない(奥義の接続は Stage 1E)。FieldCombat は Stage 1D-1 で通常スキル5枠だけ接続した(tests/ProjectR_FieldCombat.loadout.test.cjs)
    for (const file of ["js/plugins/ProjectR_UltimateActivation.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_SoulLoadout.js"].filter(f => fs.existsSync(path.join(ROOT, f)))) {      // SoulLoadout は SOUL 側のプラグイン。無い環境(まだコミットされていない)でも通す。ある環境では従来どおり RingLoadout を参照しないことを確かめる
        assert.ok(!/RingLoadout/.test(fs.readFileSync(path.join(ROOT, file), "utf8")), file + " はRingLoadoutに接続していない");
    }
});

console.log(`\n${passed} tests passed`);
