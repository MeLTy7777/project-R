"use strict";
// Stage 1A: ProjectR_RingLoadout(指輪の装備・スキル編成の保存領域と操作API)の Node テスト。
// 実エンジン(本物のrmmz_*.js + js/plugins.js の全プラグインを本番順 + 実Map004)で動かす。MZの描画・音はstub。メニュー・FieldCombat・奥義実行との接続はまだ無い。
const assert = require("node:assert/strict");
const { buildWorld, plain, read } = require("./RealEngineHarness.cjs");
const { TEMP_RING, addTempRing } = require("./ProjectR_TempRing.cjs");

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

const KEY = "_projectRRingLoadout";
const SLOTS = ["lmb", "shift", "e", "x", "c"];
// 承認済みの通常5スキル(SKILL_SETS)。順序も表のとおり。
const HERMES = ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_reed_flute", "hermes_strength"]; // 薙ぎ払い・絶・一閃・葦笛・ストレングス
const APOLLO = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_plague_rain"]; // 黄金の矢・エロスの矢・竪琴・月桂冠・疫病の矢
// 実装済みだが承認済みの5スキルに入らない既存カード(新ロードアウトでは解放も登録もできない)と、旧カード
const EXCLUDED = ["hermes_psychopomp", "hermes_veil", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"];

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
    // セーブ → ロードの往復(JsonEx。ファイルは作らない)。
    w.roundTrip = () => {
        const json = w.ctx.JsonEx.stringify(w.ctx.DataManager.makeSaveContents());
        w.ctx.DataManager.createGameObjects();
        w.ctx.DataManager.extractSaveContents(w.ctx.JsonEx.parse(json));
        return json;
    };
    w.allowAlly = (actorId, ringId) => {
        const ring = w.deck().definitions.ring(ringId);
        w.deck().definitions.rings.set(ringId, Object.freeze({ ...ring, equipActorIds: Object.freeze([actorId]) }));
    };
    return w;
}
const EMPTY = { schema: 1, equipped: [], slots: { lmb: null, shift: null, e: null, x: null, c: null }, ultimate: null };

test("登録: plugins.js に1回だけ・有効・CardDeckCore と CardCatalog の後。APIは凍結されている", () => {
    const cfg = {}; require("node:vm").runInNewContext(read("js/plugins.js"), cfg);
    const names = cfg.$plugins.map(p => p.name), i = names.indexOf("ProjectR_RingLoadout");
    assert.equal(names.filter(n => n === "ProjectR_RingLoadout").length, 1);
    assert.equal(cfg.$plugins[i].status, true);
    assert.ok(i > names.indexOf("ProjectR_CardDeckCore") && i > names.indexOf("ProjectR_CardCatalog"));
    const w = world();
    assert.ok(Object.isFrozen(w.rl()));
    assert.deepEqual(plain(w.rl().SLOT_IDS), SLOTS);
    assert.equal(w.rl().ULTIMATE_SLOT, "q");
    assert.equal(w.rl().KEY, KEY);
});

test("初期値: 新しいゲームは空の装備・編成。読み取りは何も書き込まない。旧セーブ(キー無し)でも読み取りで例外なし", () => {
    const w = world();
    assert.deepEqual(w.raw(), EMPTY, "新しいゲームは最初から空の領域を持つ(Stage 1B)");
    assert.deepEqual(w.state(), EMPTY);
    assert.deepEqual(plain(w.rl().getEquippedRings()), []);
    assert.equal(w.rl().getSkill("lmb"), null);
    assert.equal(w.rl().getUltimate(), null);
    assert.equal(w.rl().findSlotOfSkill("hermes_sweep"), null);
    assert.equal(w.rl().isRingEquipped("hermes"), false);
    // 旧セーブ相当(キー無し): 読み取りは例外なし・キーを作らない
    delete w.sys()[KEY];
    assert.deepEqual(w.state(), EMPTY);
    assert.equal(w.rl().getSkill("lmb"), null);
    assert.equal(w.sys()[KEY], undefined, "読み取りでキーを作らない");
    // 変更の失敗でもキーは作られない
    assert.equal(w.rl().equipRing("hermes").ok, false);
    assert.equal(w.sys()[KEY], undefined);
    // キー無しのセーブを保存 → ロードすると、ロード直後に空の領域が作られる(旧セーブの移行。詳細は Stage 1B のテスト)
    const json = w.roundTrip();
    assert.ok(!json.includes(KEY));
    assert.deepEqual(w.raw(), EMPTY);
});

test("入手・解放: 入手しても自動装備されない。所持から解放済みのスキル・奥義を導出する(保存しない)", () => {
    const w = world(); const temp = addTempRing(w);          // Stage 4: 5つの指輪はすべて実装済み。「表に無い指輪」は、この世界だけの一時の指輪
    assert.deepEqual(plain(w.rl().getUnlockedSkills("hermes")), []);
    assert.equal(w.rl().isUltimateUnlocked("hermes"), false);
    w.own("hermes");
    assert.deepEqual(w.state(), EMPTY, "自動装備なし・自動登録なし");
    assert.deepEqual(w.raw(), EMPTY);
    assert.deepEqual(plain(w.rl().getUnlockedSkills("hermes")), HERMES, "Hermes: 承認済みの5スキルだけ(薙ぎ払い・絶・一閃・葦笛・ストレングス)");
    assert.ok(w.rl().getRingSkills("hermes").includes("hermes_sweep") && w.rl().getRingSkills("hermes").includes("hermes_zetsu"));
    assert.equal(w.rl().isUltimateUnlocked("hermes"), true);
    assert.deepEqual(plain(w.rl().getUnlockedSkills("apollo")), [], "未所持の指輪は解放されない");
    assert.deepEqual(plain(w.rl().getRingSkills("apollo")), APOLLO);
    for (const ring of [temp.ringId]) assert.deepEqual(plain(w.rl().getRingSkills(ring)), [], `${ring}: 表に無い・実装済みスキルなし(IDを作らない)`);
    assert.equal(w.rl().isSkillUnlocked("hermes_issen"), true);
    assert.equal(w.rl().isSkillUnlocked("apollo_oracle"), false);
    assert.equal(w.rl().getSkillRing("hermes_zetsu"), "hermes");
    assert.equal(w.rl().getSkillRing("hermes_slash"), null, "SOUL専用など、設計にないIDは対象外");
    assert.deepEqual(w.raw(), EMPTY, "解放状態は保存されない");
});

test("装備の制限: 主人公が所持する指輪だけ。数の上限なし。重ねて装備しても変わらない", () => {
    const w = world();
    let r = w.rl().equipRing("hermes");
    assert.deepEqual([r.ok, r.reason, r.changed], [false, "ringNotOwned", false], "未所持");
    r = w.rl().equipRing("nope");
    assert.deepEqual([r.ok, r.reason], [false, "invalidRingId"]);
    r = w.rl().equipRing("");
    assert.deepEqual([r.ok, r.reason], [false, "invalidRingId"]);
    w.own("hermes");
    r = w.rl().equipRing("hermes");
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "changed", true]);
    assert.deepEqual(plain(w.rl().getEquippedRings()), ["hermes"]);
    assert.deepEqual(w.state().slots, EMPTY.slots, "装備してもスキルは自動登録されない");
    assert.equal(w.state().ultimate, null);
    r = w.rl().equipRing("hermes");
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "unchanged", false]);
    // 仲間所持は装備できない
    w.allowAlly(2, "apollo");
    assert.equal(w.deck().assignRingToActor("apollo", 2).ok, true);
    r = w.rl().equipRing("apollo");
    assert.deepEqual([r.ok, r.reason], [false, "ringNotOwned"]);
    // 5指輪すべてを所持・装備できる(上限なし)
    w.deck().setRingUnowned("apollo");
    w.own("apollo", "janus", "themis", "athena");          // 実装済みの5つの指輪
    for (const id of ["apollo", "janus", "themis", "athena"]) assert.equal(w.rl().equipRing(id).ok, true, id);
    assert.deepEqual(plain(w.rl().getEquippedRings()), ["hermes", "apollo", "janus", "themis", "athena"]);
    assert.equal(w.rl().isRingEquipped("athena"), true);
});

test("スキル登録: 装備中の指輪のスキルだけ。5枠(LMB/Shift/E/X/C)・空欄可。奥義は装備中の指輪の1つ", () => {
    const w = world();
    w.own("hermes", "apollo");
    let r = w.rl().setSkill("lmb", "hermes_sweep");
    assert.deepEqual([r.ok, r.reason], [false, "ringNotEquipped"], "所持だけでは登録できない");
    assert.equal(w.rl().equipRing("hermes").ok, true);
    r = w.rl().setSkill("lmb", "hermes_sweep");
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "changed", true]);
    assert.equal(w.rl().setSkill("shift", "hermes_zetsu").ok, true);
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    assert.equal(w.rl().findSlotOfSkill("hermes_zetsu"), "shift");
    r = w.rl().setSkill("x", "apollo_golden_volley");
    assert.deepEqual([r.ok, r.reason], [false, "ringNotEquipped"], "装備していない指輪(所持はしている)");
    r = w.rl().setSkill("x", "hermes_slash");
    assert.deepEqual([r.ok, r.reason], [false, "invalidSkillId"], "設計にないID");
    r = w.rl().setSkill("x", "no_such");
    assert.deepEqual([r.ok, r.reason], [false, "invalidSkillId"]);
    r = w.rl().setSkill("x", "");
    assert.deepEqual([r.ok, r.reason], [false, "invalidSkillId"]);
    for (const bad of ["q", "LMB", "", null, undefined, "rmb"]) assert.deepEqual([w.rl().setSkill(bad, "hermes_issen").ok, w.rl().setSkill(bad, "hermes_issen").reason], [false, "invalidSlot"], String(bad));
    // 他の指輪を装備すれば登録できる
    assert.equal(w.rl().equipRing("apollo").ok, true);
    assert.equal(w.rl().setSkill("x", "apollo_golden_volley").ok, true);
    assert.deepEqual(plain(w.rl().getSlots()), { lmb: "hermes_sweep", shift: "hermes_zetsu", e: null, x: "apollo_golden_volley", c: null });
    // 空欄にできる
    r = w.rl().clearSkill("shift");
    assert.deepEqual([r.ok, r.changed], [true, true]);
    assert.equal(w.rl().clearSkill("shift").changed, false);
    assert.equal(w.rl().clearSkill("zz").reason, "invalidSlot");
    assert.equal(w.rl().getSkill("shift"), null);
    // 奥義
    r = w.rl().setUltimate("janus");
    assert.deepEqual([r.ok, r.reason], [false, "ringNotOwned"]);
    w.own("janus");
    r = w.rl().setUltimate("janus");
    assert.deepEqual([r.ok, r.reason], [false, "ringNotEquipped"]);
    r = w.rl().setUltimate("nope");
    assert.deepEqual([r.ok, r.reason], [false, "invalidRingId"]);
    assert.equal(w.rl().setUltimate("apollo").ok, true);
    assert.equal(w.rl().getUltimate(), "apollo");
    assert.equal(w.rl().setUltimate("apollo").changed, false);
    assert.equal(w.rl().setUltimate("hermes").ok, true, "奥義枠は1つ。置き換わる");
    assert.equal(w.rl().getUltimate(), "hermes");
    assert.equal(w.rl().clearUltimate().changed, true);
    assert.equal(w.rl().clearUltimate().changed, false);
    assert.equal(w.rl().getUltimate(), null);
    // 未解放(指輪を所持していない)のスキルは登録できない: 装備だけが記録に残る状態を作って確認
    w.deck().setRingUnowned("apollo");
    assert.equal(w.rl().setSkill("c", "apollo_plague_rain").ok, false);
});

test("許可リスト: 解放・登録・読み込み時の検証が同じ5スキルの表に従う。表に無い指輪・既存カードは許可しない", () => {
    const w = world(); const temp = addTempRing(w);          // Stage 4: 5つの指輪はすべて実装済み。「表に無い指輪」は、この世界だけの一時の指輪
    const cat = plain(w.ctx.ProjectRCardCatalog.designs());
    const idOf = name => { const rows = cat.filter(r => r.name === name && r.implemented); assert.equal(rows.length, 1, name); return rows[0].runtimeCardId; };
    // 表の名前 → 実際のID(カタログ・CardDeckCore由来)。名前の対応を直接確認する
    assert.deepEqual(["薙ぎ払い", "絶", "一閃", "葦笛", "ストレングス"].map(idOf), HERMES);
    assert.deepEqual(["黄金の矢", "エロスの矢", "竪琴", "月桂冠", "疫病の矢"].map(idOf), APOLLO);
    for (const id of HERMES.concat(APOLLO)) { assert.ok(w.deck().definitions.card(id), id); }
    assert.deepEqual([w.rl().getSkillSetSource("hermes"), w.rl().getSkillSetSource("apollo")], ["approvedSet", "approvedSet"]);
    for (const ring of [temp.ringId]) assert.equal(w.rl().getSkillSetSource(ring), "none", ring);
    assert.equal(w.rl().getSkillSetSource("athena"), "approvedSet", "Athena は Stage 4 で表に載った");
    // 表に無いカードは、所持・装備していても解放されず、登録できない
    w.own("hermes", "apollo", "janus", "themis", "athena", temp.ringId);
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    assert.deepEqual(plain(w.rl().getUnlockedSkills("hermes")), HERMES);
    assert.deepEqual(plain(w.rl().getUnlockedSkills("apollo")), APOLLO);
    for (const ring of [temp.ringId]) {
        assert.deepEqual(plain(w.rl().getUnlockedSkills(ring)), [], ring);
        assert.equal(w.rl().isRingOwned(ring), true);
    }
    for (const id of EXCLUDED) {
        assert.equal(w.rl().isSkillUnlocked(id), false, id);
        assert.equal(w.rl().getSkillRing(id), null, id);
        const r = w.rl().setSkill("lmb", id);
        assert.deepEqual([r.ok, r.changed], [false, false], id);
    }
    for (const id of HERMES.concat(APOLLO)) { assert.equal(w.rl().isSkillUnlocked(id), true, id); assert.equal(w.rl().setSkill("lmb", id).ok, true, id); }
    w.rl().clearSkill("lmb");
    // 読み込み時の検証も同じ表: 表に無いカードの記録だけが取り除かれる
    w.sys()[KEY] = { schema: 1, equipped: ["hermes", "apollo"], slots: { lmb: "hermes_psychopomp", shift: "hermes_zetsu", e: "apollo_oracle", x: "apollo_golden_arrow", c: "apollo_plague_rain" }, ultimate: "hermes" };
    w.roundTrip();
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes", "apollo"], slots: { lmb: null, shift: "hermes_zetsu", e: null, x: null, c: "apollo_plague_rain" }, ultimate: "hermes" });
});

test("重複禁止: 同じスキルは2枠に登録できない。同じ枠への再登録は変化なし。枠を置き換えれば元のスキルは空く", () => {
    const w = world();
    w.own("hermes");
    w.rl().equipRing("hermes");
    assert.equal(w.rl().setSkill("lmb", "hermes_sweep").ok, true);
    let r = w.rl().setSkill("e", "hermes_sweep");
    assert.deepEqual([r.ok, r.reason, r.slot], [false, "duplicateSkill", "lmb"]);
    assert.equal(w.rl().getSkill("e"), null);
    r = w.rl().setSkill("lmb", "hermes_sweep");
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "unchanged", false]);
    r = w.rl().setSkill("lmb", "hermes_issen");
    assert.deepEqual([r.ok, r.changed], [true, true], "枠の置き換え");
    assert.equal(w.rl().setSkill("e", "hermes_sweep").ok, true, "外れたスキルは別の枠に登録できる");
    assert.deepEqual(plain(w.rl().getSlots()), { lmb: "hermes_issen", shift: null, e: "hermes_sweep", x: null, c: null });
    // 5枠すべてを別々のスキルで埋められる
    for (const [slot, id] of [["shift", "hermes_zetsu"], ["x", "hermes_strength"], ["c", "hermes_reed_flute"]]) assert.equal(w.rl().setSkill(slot, id).ok, true, id);
    const used = Object.values(plain(w.rl().getSlots()));
    assert.equal(new Set(used).size, 5);
});

test("装備解除: その指輪のスキル・奥義の登録を解除する。他の指輪は残る。再装備しても復元しない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("shift", "hermes_zetsu");
    w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setSkill("c", "apollo_plague_rain");
    w.rl().setUltimate("hermes");
    let r = w.rl().unequipRing("hermes");
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "changed", true]);
    assert.deepEqual(plain(w.rl().getEquippedRings()), ["apollo"]);
    assert.deepEqual(plain(w.rl().getSlots()), { lmb: null, shift: null, e: null, x: "apollo_golden_volley", c: "apollo_plague_rain" });
    assert.equal(w.rl().getUltimate(), null, "奥義の登録も解除");
    assert.deepEqual(w.raw().slots, { lmb: null, shift: null, e: null, x: "apollo_golden_volley", c: "apollo_plague_rain" }, "保存データも解除されている");
    // 再装備しても復元しない
    assert.equal(w.rl().equipRing("hermes").ok, true);
    assert.deepEqual(plain(w.rl().getSlots()), { lmb: null, shift: null, e: null, x: "apollo_golden_volley", c: "apollo_plague_rain" });
    assert.equal(w.rl().getUltimate(), null);
    // 装備していない指輪の解除は変化なし。不正なIDは失敗
    assert.deepEqual([w.rl().unequipRing("janus").ok, w.rl().unequipRing("janus").changed], [true, false]);
    assert.equal(w.rl().unequipRing("nope").reason, "invalidRingId");
    // 奥義が別の指輪なら残る
    w.rl().setUltimate("apollo");
    w.rl().unequipRing("hermes");
    assert.equal(w.rl().getUltimate(), "apollo");
});

test("戦闘中ロック: 戦闘イベント・カード戦闘・通常戦闘の間は、装備・編成の変更をすべて拒否する(状態は変わらない)", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes");
    w.rl().setSkill("lmb", "hermes_sweep");
    w.rl().setUltimate("hermes");
    const before = JSON.stringify(w.raw());
    const attempts = () => [
        w.rl().equipRing("apollo"), w.rl().unequipRing("hermes"), w.rl().setSkill("e", "hermes_issen"), w.rl().clearSkill("lmb"),
        w.rl().setUltimate("hermes"), w.rl().clearUltimate(), w.rl().reconcile()
    ];
    const expectLocked = reason => {
        assert.equal(w.rl().isLocked(), true);
        assert.equal(w.rl().getLockReason(), reason);
        for (const r of attempts()) assert.deepEqual([r.ok, r.reason, r.changed, r.lockReason], [false, "inCombat", false, reason]);
        assert.equal(JSON.stringify(w.raw()), before, "保存データは変わらない");
        assert.equal(w.rl().getSkill("lmb"), "hermes_sweep", "取得はロック中もできる");
    };
    // 戦闘イベント
    assert.equal(w.ctx.ProjectRCombatPresence.beginCombatEvent("ringLoadoutTest"), true);
    expectLocked("combatEvent");
    assert.ok(w.ctx.ProjectRCombatPresence.endCombatEvent("ringLoadoutTest"));
    assert.equal(w.rl().isLocked(), false);
    // カード戦闘(FieldCombat が使う固定アビリティの戦闘)
    assert.notEqual(w.deck().FIXED_BATTLE, undefined);
    assert.equal(w.deck().startCardBattle(w.deck().FIXED_BATTLE).ok, true);
    expectLocked("cardBattle");
    w.deck().endCardBattle();
    assert.equal(w.rl().isLocked(), false);
    // 通常戦闘
    const original = w.ctx.$gameParty.inBattle;
    w.ctx.$gameParty.inBattle = () => true;
    expectLocked("battle");
    w.ctx.$gameParty.inBattle = original;
    // 解除後は変更できる
    assert.equal(w.rl().setSkill("e", "hermes_issen").ok, true);
});

test("保存データの往復: 装備・編成だけを独立したキーに保存し、JsonEx の保存・ロードで同じ状態に戻る。解放状態は保存しない", () => {
    const w = world();
    w.own("hermes", "apollo");
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo");
    w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setSkill("x", "apollo_golden_volley"); w.rl().setUltimate("apollo");
    const expected = w.state();
    assert.deepEqual(expected, { schema: 1, equipped: ["hermes", "apollo"], slots: { lmb: "hermes_sweep", shift: null, e: null, x: "apollo_golden_volley", c: null }, ultimate: "apollo" });
    assert.deepEqual(w.raw(), expected, "保存データの形");
    assert.deepEqual(Object.keys(w.raw()).sort(), ["equipped", "schema", "slots", "ultimate"], "解放状態などの重複保存なし");
    const json = w.roundTrip();
    assert.ok(json.includes(KEY));
    assert.deepEqual(w.state(), expected, "ロード後も同じ");
    assert.equal(w.rl().getSkill("lmb"), "hermes_sweep");
    // ロード後も操作できる
    assert.equal(w.rl().setSkill("e", "hermes_issen").ok, true);
    // 保存 → 新しいゲーム: 空に戻る
    w.ctx.DataManager._globalInfo = []; w.ctx.DataManager.setupNewGame();
    assert.deepEqual(w.state(), EMPTY);
});

test("取得APIと変更APIの分離: 取得は凍結コピー。外から保存データを書き換えられない。保存データの手書き変更は有効な内容だけが見える", () => {
    const w = world();
    w.own("hermes");
    w.rl().equipRing("hermes"); w.rl().setSkill("lmb", "hermes_sweep");
    const state = w.rl().getState();
    assert.ok(Object.isFrozen(state) && Object.isFrozen(state.equipped) && Object.isFrozen(state.slots));
    assert.throws(() => { state.equipped.push("apollo"); }, { name: "TypeError" });
    assert.throws(() => { state.slots.lmb = "x"; }, { name: "TypeError" });
    const slots = w.rl().getSlots(); assert.throws(() => { slots.e = "hermes_issen"; }, { name: "TypeError" });
    const rings = w.rl().getEquippedRings(); assert.throws(() => { rings.push("apollo"); }, { name: "TypeError" });
    const list = w.rl().getUnlockedSkills("hermes"); list.pop(); list.push("zzz");
    assert.deepEqual(plain(w.rl().getUnlockedSkills("hermes")), HERMES, "コピーを変えても本体は変わらない");
    assert.deepEqual(plain(w.rl().getRingSkills("hermes")), HERMES);
    assert.equal(w.rl().getState().slots.lmb, "hermes_sweep");
    for (const name of ["VERSION", "equipRing"]) assert.throws(() => { w.rl()[name] = null; }, { name: "TypeError" });
    // 戻り値のstateも凍結
    assert.ok(Object.isFrozen(w.rl().setSkill("e", "hermes_issen").state));
});

test("不正・古い保存データ: 例外なしで、有効な内容だけが見える。読み取りは書き込まない。reconcile が明示的に取り除く", () => {
    const w = world();
    for (const junk of [null, undefined, "x", 5, [], true, { schema: 1 }, { equipped: "hermes", slots: "x" }, { equipped: [null, 5, {}], slots: { lmb: 5, shift: {} }, ultimate: 3 }]) {
        w.sys()[KEY] = junk;
        assert.deepEqual(w.state(), EMPTY, JSON.stringify(junk));
        assert.equal(w.rl().getSkill("lmb"), null);
        assert.equal(w.rl().getUltimate(), null);
    }
    // 有効なIDと無効なIDが混ざる: 所持している指輪の有効な記録だけが残る
    w.own("hermes");
    w.sys()[KEY] = { schema: 1, equipped: ["hermes", "apollo", "hermes", "ghost"], slots: { lmb: "hermes_sweep", shift: "apollo_oracle", e: "ghost_skill", x: "hermes_sweep", c: "hermes_zetsu" }, ultimate: "apollo" };
    const rawBefore = JSON.stringify(w.sys()[KEY]);
    assert.deepEqual(w.state(), { schema: 1, equipped: ["hermes"], slots: { lmb: "hermes_sweep", shift: null, e: null, x: null, c: "hermes_zetsu" }, ultimate: null });
    assert.equal(JSON.stringify(w.sys()[KEY]), rawBefore, "取得では保存データを書き換えない");
    const r = w.rl().reconcile();
    assert.deepEqual([r.ok, r.reason, r.changed], [true, "changed", true]);
    assert.deepEqual(plain(r.removed), { rings: ["apollo"], slots: ["shift", "e", "x"], ultimate: true });
    assert.deepEqual(w.raw(), { schema: 1, equipped: ["hermes"], slots: { lmb: "hermes_sweep", shift: null, e: null, x: null, c: "hermes_zetsu" }, ultimate: null });
    assert.deepEqual([w.rl().reconcile().ok, w.rl().reconcile().changed], [true, false], "2回目は何もしない");
    // キーが無ければ reconcile は何も作らない
    delete w.sys()[KEY];
    assert.deepEqual([w.rl().reconcile().ok, w.rl().reconcile().changed], [true, false]);
    assert.equal(w.sys()[KEY], undefined);
});

test("所持を失った指輪: 仲間に渡すと(手動の reconcile なしに)その場で装備・登録が消える。戻しても復元しない", () => {
    const w = world();
    w.own("hermes");
    w.rl().equipRing("hermes"); w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setUltimate("hermes");
    w.allowAlly(2, "hermes");
    assert.equal(w.deck().assignRingToActor("hermes", 2).ok, true);
    assert.deepEqual(w.state(), EMPTY, "主人公が持たない指輪の装備・登録は見えない");
    assert.deepEqual(w.raw(), EMPTY, "保存データからも消えている(Stage 1B の自動掃除)");
    assert.equal(w.rl().isUltimateUnlocked("hermes"), false);
    assert.equal(w.rl().getUnlockedSkills("hermes").length, 0);
    assert.equal(w.rl().reconcile().changed, false, "手動の reconcile は不要(すでに掃除済み)");
    assert.equal(w.deck().assignRingToPlayer("hermes").ok, true);
    assert.deepEqual(w.state(), EMPTY, "戻しても復元されない");
    assert.equal(w.rl().getUnlockedSkills("hermes").length, 5, "解放は所持から導出されるので戻る");
});

test("既存データへの影響なし: CardDeckCore の保存データ・SOUL の保存領域・既存の指輪の所持を、装備・編成の操作で変更しない", () => {
    const w = world();
    w.own("hermes", "apollo");
    const deckBefore = JSON.stringify(w.sys()._projectRCardDeckData);
    const soulBefore = w.sys()._projectRSoulLoadout;
    const ultimateBefore = w.deck().getUltimateRingId();
    w.rl().equipRing("hermes"); w.rl().equipRing("apollo"); w.rl().setSkill("lmb", "hermes_sweep"); w.rl().setUltimate("apollo");
    w.rl().unequipRing("apollo"); w.rl().reconcile();
    assert.equal(JSON.stringify(w.sys()._projectRCardDeckData), deckBefore);
    assert.equal(w.sys()._projectRSoulLoadout, soulBefore);
    assert.equal(w.deck().getUltimateRingId(), ultimateBefore, "既存の奥義選択(ultimateSelection)には触れない");
    assert.equal(w.deck().getRingOwner("hermes"), "player");
    assert.equal(w.deck().getRingOwner("apollo"), "player");
});

console.log(`\n${passed} tests passed`);
