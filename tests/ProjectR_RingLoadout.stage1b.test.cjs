"use strict";
// Stage 1B: ProjectR_RingLoadout の旧セーブ移行・読み込み時/変更時の自動修復・所有変更の自動掃除・修復の通知の Node テスト。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map004)で動かす。表示(Window)の見た目は Node では確認しない(実機で確認)。
const assert = require("node:assert/strict");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

const KEY = "_projectRRingLoadout";
const EMPTY = { schema: 1, equipped: [], slots: { lmb: null, shift: null, e: null, x: null, c: null }, ultimate: null };
const slotsOf = (lmb = null, shift = null, e = null, x = null, c = null) => ({ lmb, shift, e, x, c });

function world() {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, 12, 25);
    w.frames(3);
    w.deck = () => w.ctx.ProjectRCardDeck;
    w.rl = () => w.ctx.ProjectRRingLoadout;
    w.sys = () => w.ctx.$gameSystem;
    w.own = (...ids) => { for (const id of ids) assert.equal(w.deck().assignRingToPlayer(id).ok, true, id); };
    w.state = () => plain(w.rl().getState());
    w.raw = () => plain(w.sys()[KEY] === undefined ? null : w.sys()[KEY]);
    w.notice = () => plain(w.rl().getNoticeState());
    // マップ場面は addWindow が無いstubなので、通知のウィンドウを受け取るだけの関数を付ける(表示の見た目は実機で確認)
    w.shownWindows = [];
    w.scene.addWindow = win => { w.shownWindows.push(win); };
    // セーブ → ロードの往復(JsonEx)。ロード中にファイルを書く関数が呼ばれないことも数える。
    w.fileWrites = 0;
    const storage = w.ctx.StorageManager;
    for (const name of ["saveObject", "saveZip"]) {
        const original = storage[name];
        if (typeof original === "function") storage[name] = function() { w.fileWrites++; return original.apply(this, arguments); };
    }
    const dm = w.ctx.DataManager;
    for (const name of ["saveGame", "saveGameWithoutRescue"]) {
        const original = dm[name];
        if (typeof original === "function") dm[name] = function() { w.fileWrites++; return original.apply(this, arguments); };
    }
    w.save = () => w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
    w.load = json => { w.ctx.DataManager.createGameObjects(); w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json)); };
    w.roundTrip = () => { const json = w.save(); w.load(json); return json; };
    // キーを持たない旧セーブのJSON(キーを取り除いて保存したもの)
    w.legacyJson = () => { const saved = w.sys()[KEY]; delete w.sys()[KEY]; const json = w.save(); w.sys()[KEY] = saved; return json; };
    // 保存データを直接書いたセーブ(不正な内容を持つ保存を作る)
    w.jsonWith = raw => { const saved = w.sys()[KEY]; w.sys()[KEY] = raw; const json = w.save(); w.sys()[KEY] = saved; return json; };
    w.afterCombat = () => { w.ctx.Graphics.frameCount = (Number(w.ctx.Graphics.frameCount) || 0) + 600; w.frames(10); };
    w.allowAlly = (actorId, ringId) => {
        const ring = w.deck().definitions.ring(ringId);
        w.deck().definitions.rings.set(ringId, Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
    };
    return w;
}

test("旧セーブの移行: キーが無い旧セーブを読み込むと、空の装備・編成が作られる。指輪の所持・SOULのデータは変わらない。自動装備なし", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.sys()._projectRSoulLoadout = { version: 1, slots: ["hermes_issen", "hermes_sweep", "apollo_oracle", "hermes_veil", "apollo_golden_volley"] };
    const owners = { hermes: w.deck().getRingOwner("hermes"), apollo: w.deck().getRingOwner("apollo") };
    const deckData = JSON.stringify(w.sys()._projectRCardDeckData);
    const soulData = JSON.stringify(w.sys()._projectRSoulLoadout);
    const json = w.legacyJson();
    assert.ok(!json.includes(KEY), "旧セーブにはキーが無い");
    w.load(json);
    assert.deepEqual(w.raw(), EMPTY, "装備なし・5枠すべて空・奥義なしで初期化");
    assert.deepEqual(w.state(), EMPTY);
    assert.deepEqual({ hermes: w.deck().getRingOwner("hermes"), apollo: w.deck().getRingOwner("apollo") }, owners, "指輪の所持は保持");
    assert.equal(JSON.stringify(w.sys()._projectRCardDeckData), deckData, "CardDeckCore の保存データは変わらない");
    assert.equal(JSON.stringify(w.sys()._projectRSoulLoadout), soulData, "SOUL の保存データは変わらない");
    assert.equal(w.rl().getEquippedRings().length, 0, "自動装備しない");
    // 所持している指輪のスキル・奥義は解放済みとして導出される(保存はしない)
    assert.equal(w.rl().getUnlockedSkills("hermes").length, w.rl().getRingSkills("hermes").length);
    assert.ok(w.rl().getUnlockedSkills("hermes").length > 0 && w.rl().getUnlockedSkills("apollo").length > 0);
    assert.equal(w.rl().isUltimateUnlocked("hermes"), true);
    assert.equal(w.rl().isUltimateUnlocked("janus"), false);
    assert.equal(w.notice().queued, 0, "通常の移行では通知しない");
    assert.equal(w.fileWrites, 0, "読み込み中に保存ファイルを書かない");
    // 移行後は装備・編成できる
    assert.equal(w.rl().equipRing("hermes").ok, true);
    assert.equal(w.rl().setSkill("lmb", "hermes_sweep").ok, true);
});

test("一度だけの移行: 繰り返しロードしても初期化し直さず、有効な装備・編成は保たれる。通知もしない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.load(w.legacyJson());
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("shift", "hermes_zetsu"); w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setUltimate("apollo");
    const expected = { schema: 1, equipped: ["hermes", "apollo"], slots: slotsOf("hermes_sweep", "hermes_zetsu", null, "apollo_golden_volley", null), ultimate: "apollo" };
    assert.deepEqual(w.raw(), expected);
    let json = w.save();
    for (let i = 0; i < 4; i++) {
        w.load(json);
        assert.deepEqual(w.raw(), expected, `ロード${i + 1}回目`);
        json = w.save();
    }
    assert.equal(w.notice().queued, 0);
    assert.equal(w.fileWrites, 0);
    // 旧セーブ → 移行 → 装備 → 保存 → ロード: 移行は再実行されない
    w.load(w.legacyJson());
    assert.deepEqual(w.raw(), EMPTY);
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes");
    w.load(w.save());
    assert.deepEqual(w.state().equipped, ["hermes"]);
});

test("新しいゲーム: 最初から空の領域を持ち、通知しない", () => {
    const w = world();
    w.own("hermes");
    w.rl().equipRing("hermes");
    w.ctx.DataManager._globalInfo = []; w.ctx.DataManager.setupNewGame();
    assert.deepEqual(w.raw(), EMPTY);
    assert.equal(w.notice().queued, 0);
});

test("無効なIDの自動修復: 読み込み時に無効な記録だけを取り除き、有効な記録は残す。通知は1回。再ロードでは通知しない", () => {
    const w = world();
    w.own("hermes", "apollo");
    const json = w.jsonWith({ schema: 1, equipped: ["hermes", "ghost", "janus"], slots: slotsOf("hermes_sweep", "ghost_skill", "apollo_golden_volley", "hermes_zetsu", "hermes_slash"), ultimate: "apollo" });
    // hermes: 有効 / ghost: 未知の指輪 / janus: 未所持 / apollo の技: apollo を装備していない / 奥義 apollo: 装備していない
    w.load(json);
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep", null, null, "hermes_zetsu", null), ultimate: null }, "有効な hermes・薙ぎ払い・絶は残る");
    const n = w.notice();
    assert.equal(n.queued, 1, "通知はまとめて1回");
    assert.equal(n.pending !== null || n.shown === 1, true);
    assert.equal(n.text, "装備・編成の無効な設定を自動で修復しました。");
    assert.equal(w.fileWrites, 0, "修復でも保存ファイルは書かない");
    const state = w.state();
    w.load(w.save());
    assert.deepEqual(w.state(), state);
    assert.equal(w.notice().queued, 1, "修復済みのデータを読み込んでも、通知は増えない");
    // 変更の途中で無効な記録があるときも、取り除いたなら通知する(変更自体は通知しない)
    w.sys()[KEY] = { schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep", "ghost_skill"), ultimate: null };
    const before = w.notice().queued;
    assert.equal(w.rl().setSkill("e", "hermes_issen").ok, true);
    assert.deepEqual(w.raw().slots, slotsOf("hermes_sweep", null, "hermes_issen"), "有効なものは残して無効なものだけ取り除く");
    assert.equal(w.notice().queued, before + 1);
});

test("型の不正・壊れたデータ: 例外なしで読み込め、有効な部分だけ残る。取り除く記録が無ければ通知しない", () => {
    const w = world();
    w.own("hermes");
    for (const junk of ["x", 5, [], true]) {
        w.load(w.jsonWith(junk));
        assert.deepEqual(w.raw(), EMPTY, JSON.stringify(junk));
    }
    assert.equal(w.notice().queued, 0, "壊れていても、取り除いた記録が無ければ通知しない");
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes", 5, {}], slots: { lmb: "hermes_sweep", shift: 7, e: {} }, ultimate: 3 }));
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep"), ultimate: null });
    assert.equal(w.notice().queued, 1);
});

test("重複の修復: LMB → Shift → E → X → C の順で最初の1つを残す。先頭が無効なら次の有効なものを残す", () => {
    const w = world();
    w.own("hermes");
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_zetsu", "hermes_sweep", "hermes_zetsu", "hermes_sweep", "hermes_issen"), ultimate: null }));
    assert.deepEqual(w.raw().slots, slotsOf("hermes_zetsu", "hermes_sweep", null, null, "hermes_issen"));
    assert.equal(w.notice().queued, 1);
    // 先頭が無効(未知のID)なら、後ろの有効な重複の1つめが残る
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes"], slots: slotsOf("ghost", "hermes_sweep", "hermes_sweep", null, "hermes_sweep"), ultimate: null }));
    assert.deepEqual(w.raw().slots, slotsOf(null, "hermes_sweep", null, null, null));
    // 重複が無ければ何も変わらず、通知も増えない
    const before = w.notice().queued;
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep", "hermes_zetsu"), ultimate: "hermes" }));
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep", "hermes_zetsu"), ultimate: "hermes" });
    assert.equal(w.notice().queued, before);
    // 変更APIでも重複は作れない(1Aの規則)
    assert.equal(w.rl().setSkill("e", "hermes_sweep").reason, "duplicateSkill");
});

test("通知の条件: 通常の移行・装備・装備解除・編成・所有変更では通知しない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.load(w.legacyJson());
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setUltimate("hermes");
    w.rl().clearSkill("lmb"); w.rl().clearUltimate();
    w.rl().unequipRing("hermes");
    w.allowAlly(2, "apollo");
    assert.equal(w.deck().assignRingToActor("apollo", 2).ok, true);
    assert.equal(w.deck().assignRingToPlayer("apollo").ok, true);
    assert.equal(w.deck().setRingUnowned("apollo").ok, true);
    w.frames(40);
    assert.deepEqual([w.notice().queued, w.notice().shown, w.notice().pending], [0, 0, null]);
});

test("通知の表示: マップ画面にいれば出して保留を空にする(入力は奪わない)。別の画面では保留し、表示できなければ保留のまま残る", () => {
    const w = world();
    w.own("hermes");
    const shown = [];
    const scene = w.scene;
    // 表示できない場面(addWindow が失敗): 保留のまま
    const originalAdd = scene.addWindow;
    scene.addWindow = () => { throw new Error("no layer"); };
    w.load(w.jsonWith({ schema: 1, equipped: ["ghost"], slots: slotsOf(), ultimate: null }));
    assert.equal(w.notice().queued, 1);
    assert.notEqual(w.notice().pending, null, "表示できなければ保留");
    // 表示できる場面: 次の修復と合わせて1回で出す(保留は1つにまとまる)
    scene.addWindow = win => { shown.push(win); };
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes"], slots: slotsOf("ghost_skill"), ultimate: null }));
    const n = w.notice();
    assert.equal(n.queued, 1, "保留中に重なった修復は1つの通知にまとまる");
    assert.equal(n.shown, 1);
    assert.equal(n.pending, null);
    assert.equal(shown.length, 1, "ウィンドウは1つだけ");
    assert.equal(shown[0].active === true, false, "操作を受け付けるウィンドウではない");
    assert.equal(w.ctx.$gameMessage.isBusy(), false, "メッセージウィンドウ(ブロック)は使わない");
    scene.addWindow = originalAdd;
});

test("所有変更の自動掃除: 仲間に渡す・未所持にすると、その場で装備・スキル・奥義が消える。戻しても復元しない。他の指輪は残る", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("shift", "hermes_zetsu"); w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setUltimate("hermes");
    w.allowAlly(2, "hermes");
    assert.equal(w.deck().assignRingToActor("hermes", 2).ok, true);
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["apollo"], slots: slotsOf(null, null, null, "apollo_golden_volley"), ultimate: null }, "reconcile なしで保存データから消える");
    // 主人公へ戻しても復元しない
    assert.equal(w.deck().assignRingToPlayer("hermes").ok, true);
    assert.deepEqual(w.state(), { schema: 1, equipped: ["apollo"], slots: slotsOf(null, null, null, "apollo_golden_volley"), ultimate: null });
    assert.equal(w.rl().isRingEquipped("hermes"), false);
    assert.equal(w.rl().getUnlockedSkills("hermes").length > 0, true, "解放は所持から導出されるので戻る");
    // 選び直せる
    assert.equal(w.rl().equipRing("hermes").ok, true);
    assert.equal(w.rl().getSkill("lmb"), null);
    assert.equal(w.rl().getUltimate(), null);
    // 未所持にした場合も同じ
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setUltimate("hermes");
    assert.equal(w.deck().setRingUnowned("hermes").ok, true);
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["apollo"], slots: slotsOf(null, null, null, "apollo_golden_volley"), ultimate: null });
    w.own("hermes");
    assert.deepEqual(w.state().equipped, ["apollo"], "再入手しても復元しない");
    // 保存・ロードしても同じ
    const state = w.state();
    w.roundTrip();
    assert.deepEqual(w.state(), state);
    assert.equal(w.notice().queued, 0, "所有変更の掃除は通知しない");
});

test("所有変更の掃除の確実さ: 公開APIを通らない変更も定期確認が掃除し、戻す前の取りこぼしも先に掃除する。戦闘中でも行う。失敗した移動は何も変えない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setUltimate("hermes");
    const ownership = () => w.sys()._projectRCardDeckData.ringOwnershipState;
    // 公開APIを通らない所有変更(戦闘中でも): 定期確認が掃除する。通常の編成変更は戦闘中は拒否のまま
    assert.equal(w.ctx.ProjectRCombatPresence.beginCombatEvent("ringLoadout1B"), true);
    ownership().hermes = "unowned";
    assert.equal(w.rl().setSkill("e", "apollo_eros_arrow").reason, "inCombat", "通常の変更は戦闘中は拒否");
    w.frames(16);
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["apollo"], slots: slotsOf(null, null, null, "apollo_golden_volley"), ultimate: null }, "戦闘中でも所有変更の後始末は行う");
    w.ctx.ProjectRCombatPresence.endCombatEvent("ringLoadout1B");
    w.afterCombat();
    // 取りこぼし(掃除前に主人公へ戻す): API が戻す前に掃除する
    w.own("hermes");
    w.rl().equipRing("hermes"); w.rl().setSkill("lmb", "hermes_sweep");
    ownership().hermes = "actor:2";
    assert.equal(w.deck().assignRingToPlayer("hermes").ok, true);
    assert.equal(w.rl().isRingEquipped("hermes"), false);
    assert.equal(w.rl().getSkill("lmb"), null, "戻しても復元しない");
    // 失敗した移動(許可されていない仲間)は、元の結果をそのまま返し、装備を変えない
    w.rl().equipRing("hermes"); w.rl().setSkill("lmb", "hermes_sweep");
    const failed = w.deck().assignRingToActor("hermes", 99);
    assert.equal(failed.ok, false);
    assert.ok(Array.isArray(failed.reasons) && failed.reasons.length > 0);
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    assert.deepEqual(w.state().equipped, ["apollo", "hermes"]);
    // 戦闘中は指輪の移動自体も拒否される(CardDeckCore の既存の規則)ので、装備も変わらない
    assert.equal(w.ctx.ProjectRCombatPresence.beginCombatEvent("ringLoadout1B"), true);
    w.allowAlly(2, "hermes");
    assert.equal(w.deck().assignRingToActor("hermes", 2).ok, false);
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    w.ctx.ProjectRCombatPresence.endCombatEvent("ringLoadout1B");
});

test("保存と復元: 掃除・修復の結果が保存データに入り、保存・ロードで同じ状態に戻る。既存の奥義選択・SOULには触れない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.sys()._projectRSoulLoadout = { version: 1, slots: ["hermes_issen", "hermes_issen", "hermes_issen", "hermes_issen", "hermes_issen"] };
    const soul = JSON.stringify(w.sys()._projectRSoulLoadout);
    w.rl().equipRing("hermes"); w.rl().setSkill("lmb", "hermes_sweep");
    assert.equal(w.deck().setUltimateRing("hermes").ok, true);
    const before = { ultimateRing: w.deck().getUltimateRingId() };
    w.load(w.jsonWith({ schema: 1, equipped: ["hermes", "ghost"], slots: slotsOf("hermes_sweep", "hermes_sweep"), ultimate: null }));
    assert.equal(JSON.stringify(w.sys()._projectRSoulLoadout), soul);
    assert.equal(w.deck().getUltimateRingId(), before.ultimateRing, "CardDeckCore の奥義選択は変わらない");
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes"], slots: slotsOf("hermes_sweep"), ultimate: null });
    const state = w.state();
    w.roundTrip();
    assert.deepEqual(w.state(), state);
    assert.deepEqual(Object.keys(w.raw()).sort(), ["equipped", "schema", "slots", "ultimate"]);
});

console.log(`\n${passed} tests passed`);
