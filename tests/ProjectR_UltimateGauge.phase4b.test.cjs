"use strict";
// Phase 4B: Ultimateゲージの加算元（カード使用・支援・与ダメージ・重要回避API）。
// Hermes(Golden Arrow/剣術)・Disease・Lyreの実Action Engine fixtureとManager・Bridge・Gaugeの実ソースを再利用する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function fixtureLoader(file, factory) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + `\nthis.createGame = ${factory};`, f);
    return f.createGame;
}
const loadHermes = fixtureLoader("tests/ProjectR_HermesSwordsmanship.test.cjs", "loadGame");
const loadDisease = fixtureLoader("tests/ProjectR_ApolloDiseaseAttack.test.cjs", "loadGame");
const loadLyre = (() => {
    const text = read("tests/ProjectR_ApolloLyreCalm.test.cjs"), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", f);
    return f.createGame;
})();
const GAUGE_FILE = "js/plugins/ProjectR_UltimateGauge.js", GAUGE = "ProjectR_UltimateGauge";
const ARROW = "apollo_golden_arrow", SWORD = "hermes_sword_attack", LYRE = "apollo_lyre_calm";
const gauge = g => g.ProjectRUltimateGauge, deck = g => g.ProjectRCardDeck, mgr = g => g.ProjectRGodSummonManager;
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message || ""} ${actual} !== ${expected}`);
const battleTime = (g, frames = 1) => {
    const scene = g.SceneManager._scene;
    for (let i = 0; i < frames; i++) { g.Graphics.frameCount++; scene.update(); }
};
const collapse = g => assert.equal(mgr(g).damagePersistentUltimate(100000).collapsed, true);
// 本番と同じ順（Manager → Gauge → カード）に近づけるため、Gaugeはfixtureの戦闘開始前に読み込む。
function addGauge(g, params = {}, ring = "apollo") {
    const previous = g.PluginManager.parameters;
    g.PluginManager.parameters = name => name === GAUGE ? params : previous(name);
    vm.runInContext(read(GAUGE_FILE), g);
    if (ring) assert.equal(deck(g).setUltimateRing(ring).ok, true);
    return g;
}
const hermes = (params, ring) => addGauge(loadHermes(), params, ring);
const lost = enemy => 200 - enemy.bar.currentHp; // fixtureの敵HPバーは200から開始。
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// ---- 設定 ----
test("暫定値の既定: CardUse=2 / SupportBonus=2 / DamageRate=0.0025 / PerHitCap=1.5 / ImportantDodge=5（すべてParameterで設定可能）", () => {
    assert.deepEqual(plain(gauge(hermes({})).getGainConfig()), { cardUseGain: 2, supportBonusGain: 2, damageGainRate: 0.0025,
        damageGainPerHitCap: 1.5, importantDodgeGain: 5 });
    const custom = hermes({ CardUseGain: "3.5", SupportBonusGain: "1", DamageGainRate: "0.01", DamageGainPerHitCap: "4", ImportantDodgeGain: "10" });
    assert.deepEqual(plain(gauge(custom).getGainConfig()), { cardUseGain: 3.5, supportBonusGain: 1, damageGainRate: 0.01, damageGainPerHitCap: 4, importantDodgeGain: 10 });
});
test("不正なParameter（負・NaN・Infinity・空・文字列・未指定）は既定値へ戻り、0は『その加算元を無効』", () => {
    for (const bad of ["-1", "abc", "", " ", "NaN", "Infinity", "-Infinity", undefined]) {
        const g = hermes({ CardUseGain: bad, SupportBonusGain: bad, DamageGainRate: bad, DamageGainPerHitCap: bad, ImportantDodgeGain: bad });
        assert.deepEqual(plain(gauge(g).getGainConfig()), { cardUseGain: 2, supportBonusGain: 2, damageGainRate: 0.0025,
            damageGainPerHitCap: 1.5, importantDodgeGain: 5 }, String(bad));
    }
    const off = hermes({ CardUseGain: "0", DamageGainRate: "0", ImportantDodgeGain: "0" });
    off.startWith(ARROW);
    assert.equal(off.fire().reason, "success"); assert.equal(gauge(off).getUltimateGauge(), 0);
    assert.equal(gauge(off).getGainStats().last.reason, "zeroGain");
    assert.equal(gauge(off).recordDamageDealt(1000, { attackId: "a", targetId: 1 }).reason, "zeroGain");
    assert.equal(gauge(off).recordImportantDodge("d").reason, "zeroGain");
    assert.equal(gauge(off).getUltimateGaugeGainCount(), 0);
});

// ---- カード使用 ----
test("成功したカード使用でCardUseGainを1回。gainIdはcard:<instanceId>:<n>。useBattleCard等の低レベル消費は加算しない", () => {
    const g = hermes(); g.startWith(ARROW);
    assert.equal(gauge(g).getUltimateGauge(), 0); // startWithはuseBattleCardで手札を回すだけ（発動ではない）
    const id = deck(g).getBattleState().hand[0].instanceId;
    const result = g.fire();
    assert.equal(result.reason, "success"); assert.equal(result.instanceId, id);
    assert.equal(gauge(g).getUltimateGauge(), 2);
    assert.equal(gauge(g).hasUltimateGaugeGainId(`card:${id}:1`), true);
    assert.deepEqual(plain(gauge(g).getGainStats().totals), { card: 2, support: 0, damage: 0, dodge: 0 });
    assert.deepEqual(plain(gauge(g).getGainStats().last), { category: "card", ok: true, reason: "added", requested: 2, gained: 2, source: "card", gainId: `card:${id}:1` });
    assert.equal(g.fire().ok, true); assert.equal(gauge(g).getUltimateGauge(), 4); // 次の発動は別のカード
});
test("失敗した発動・未消費では加算しない（手札も不変）", () => {
    const g = hermes(); g.startWith(ARROW);
    const handBefore = plain(deck(g).getBattleState());
    g.$dataSkills = []; // ダメージSkillが無く発動失敗
    const failed = g.fire();
    assert.deepEqual(plain([failed.ok, failed.reason]), [false, "activationFailed"]);
    assert.deepEqual(plain(deck(g).getBattleState()), handBefore);
    for (const index of [-1, 5, 99, 1.5, NaN]) assert.equal(deck(g).requestUseCard(index).ok, false);
    g.$gameSystem._projectRCardDeckData.ringOwnershipState.apollo = "unowned"; // 指輪を失ったカードは使用不可 → 未消費
    const unavailable = deck(g).requestUseCard(0);
    assert.deepEqual(plain([unavailable.ok, unavailable.reason]), [false, "cardUnavailable"]);
    assert.equal(gauge(g).getUltimateGauge(), 0); assert.equal(gauge(g).getUltimateGaugeGainCount(), 0);
    assert.equal(gauge(g).getGainStats().last, null);
    deck(g).endBattle(); assert.equal(deck(g).requestUseCard(0).reason, "battleInactive");
});
test("同じ発動結果を二重に処理しても1回だけ。同じinstanceの再使用（冷却後）は別gainIdで加算する", () => {
    const g = hermes(); g.startWith(ARROW);
    const result = g.fire();
    assert.equal(gauge(g).getUltimateGauge(), 2);
    for (const again of [result, { ...result }, JSON.parse(JSON.stringify(result))].slice(0, 2)) {
        assert.equal(gauge(g).recordCardUse(again).reason, "duplicateActivation");
    }
    assert.equal(gauge(g).getUltimateGauge(), 2);
    const synthetic = n => ({ ok: true, reason: "success", instanceId: "card-77", cardId: ARROW, state: { n } });
    assert.equal(gauge(g).recordCardUse(synthetic(1)).gained, 2);
    assert.equal(gauge(g).recordCardUse(synthetic(2)).gained, 2); // 別の発動（同じinstance）
    assert.equal(gauge(g).hasUltimateGaugeGainId("card:card-77:1"), true); assert.equal(gauge(g).hasUltimateGaugeGainId("card:card-77:2"), true);
    assert.equal(gauge(g).getUltimateGauge(), 6);
});
test("ゲージ側の不正入力・内部例外でも例外を投げない。ゲージが無くてもカード発動は成功する", () => {
    const g = hermes(); g.startWith(ARROW);
    for (const bad of [null, undefined, 0, "x", [], {}, { ok: true }, { ok: false, reason: "success" }, { ok: true, reason: "success" },
        { ok: true, reason: "success", instanceId: {} }, { get ok() { throw Error("boom"); } }]) {
        assert.doesNotThrow(() => gauge(g).recordCardUse(bad));
        assert.equal(gauge(g).recordCardUse(bad).ok, false);
    }
    assert.equal(gauge(g).getUltimateGauge(), 0);
    const noGauge = hermes({}, null); noGauge.startWith(ARROW); // Ultimate未選択 → ゲージ状態なし
    assert.equal(gauge(noGauge).hasUltimateGaugeState(), false);
    assert.equal(noGauge.fire().reason, "success");
    assert.equal(gauge(noGauge).getUltimateGauge(), 0); assert.equal(gauge(noGauge).getUltimateGaugeGainCount(), 0);
    assert.equal(gauge(noGauge).recordCardUse({ ok: true, reason: "success", instanceId: "c1", cardId: ARROW, state: {} }).reason, "noUltimateGauge");
});
test("崩壊中でもカード使用は加算する。満タンでは溢れず、カード発動も通常どおり成功しgainIdを消費しない", () => {
    const g = hermes(); g.startWith(ARROW); collapse(g);
    assert.equal(g.fire().reason, "success"); assert.equal(gauge(g).getUltimateGauge(), 2);
    assert.equal(gauge(g).isUltimateReady(), false);
    gauge(g).addUltimateGauge(98, "fill");
    assert.deepEqual(plain([gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]), [true, false]);
    const id = deck(g).getBattleState().hand[0].instanceId;
    assert.equal(g.fire().reason, "success"); // 満タンでも発動は成功
    assert.equal(gauge(g).getUltimateGauge(), 100);
    assert.equal(gauge(g).hasUltimateGaugeGainId(`card:${id}:1`), false); // gaugeFullではgainIdを使わない
    battleTime(g, 900); assert.equal(gauge(g).isUltimateReady(), true); // 復帰でready
});

// ---- 支援 ----
test("supportカテゴリのカードは CardUseGain + SupportBonusGain（Lyre実カード）。attackカードにはボーナスなし", () => {
    const g = addGauge(loadLyre());
    g.start(); const card = g.arrange(0, LYRE);
    assert.equal(deck(g).definitions.card(LYRE).category, "support");
    const result = deck(g).requestUseCard(0);
    assert.equal(result.ok, true); assert.equal(result.cardId, LYRE);
    near(gauge(g).getUltimateGauge(), 4);
    assert.deepEqual(plain(gauge(g).getGainStats().totals), { card: 2, support: 2, damage: 0, dodge: 0 });
    assert.equal(gauge(g).hasUltimateGaugeGainId(`card:${card.instanceId}:1`), true);
    assert.equal(gauge(g).hasUltimateGaugeGainId(`support:${card.instanceId}:1`), true);
    const a = hermes(); a.startWith(ARROW); a.fire();
    assert.deepEqual(plain(gauge(a).getGainStats().totals), { card: 2, support: 0, damage: 0, dodge: 0 }); // attack
});
test("ボーナスはカード名でなくcategoryで決まる。重複処理で二重にならず、失敗した支援は0", () => {
    const g = hermes(); g.startWith(ARROW);
    const definitions = deck(g).definitions.cards;
    definitions.set("hermes_swift_movement", Object.freeze({ ...definitions.get("hermes_swift_movement"), category: "support" }));
    definitions.set(LYRE, Object.freeze({ ...definitions.get(LYRE), category: "normal" }));
    const use = (cardId, n) => ({ ok: true, reason: "success", instanceId: `card-${n}`, cardId, state: { n } });
    const swift = gauge(g).recordCardUse(use("hermes_swift_movement", 50));
    assert.deepEqual(plain([swift.gained, swift.support.gained]), [4, 2]);
    const lyre = gauge(g).recordCardUse(use(LYRE, 51));
    assert.deepEqual(plain([lyre.gained, lyre.support]), [2, null]);
    const duplicate = use("hermes_swift_movement", 52); gauge(g).recordCardUse(duplicate);
    near(gauge(g).getUltimateGauge(), 10);
    assert.equal(gauge(g).recordCardUse(duplicate).reason, "duplicateActivation"); near(gauge(g).getUltimateGauge(), 10);
    // 失敗した支援（State未定義）: カード未消費で加算0
    const lyreGame = addGauge(loadLyre()); lyreGame.start(); lyreGame.arrange(0, LYRE);
    lyreGame.$dataStates = [];
    const before = plain(deck(lyreGame).getBattleState());
    assert.equal(deck(lyreGame).requestUseCard(0).ok, false);
    assert.deepEqual(plain(deck(lyreGame).getBattleState()), before);
    assert.equal(gauge(lyreGame).getUltimateGauge(), 0); assert.equal(gauge(lyreGame).getGainStats().last, null);
    // 崩壊中の支援成功も両方加算
    const c = addGauge(loadLyre()); c.start(); c.arrange(0, LYRE); collapse(c);
    assert.equal(deck(c).requestUseCard(0).ok, true); near(gauge(c).getUltimateGauge(), 4);
});

// ---- 与ダメージ（共通ヘルパ） ----
test("recordDamageDealt: 実ダメージ×0.0025、1回1.5で頭打ち、小数も可（100→0.25 / 400→1.0 / 1000→1.5）", () => {
    const g = hermes(); g.startWith(ARROW);
    const hit = (damage, id) => gauge(g).recordDamageDealt(damage, { attackId: "t", targetId: id });
    const r100 = hit(100, 1); near(r100.gained, 0.25); assert.equal(r100.capped, false); near(r100.rawGain, 0.25);
    near(hit(400, 2).gained, 1.0);
    const r1000 = hit(1000, 3);
    assert.deepEqual(plain([r1000.gained, r1000.capped, r1000.rawGain, r1000.gain, r1000.actualDamage]), [1.5, true, 2.5, 1.5, 1000]);
    near(hit(7, 4).gained, 0.0175); near(hit(0.5, 5).gained, 0.00125);
    near(gauge(g).getUltimateGauge(), 0.25 + 1 + 1.5 + 0.0175 + 0.00125);
    assert.deepEqual(plain(gauge(g).getGainStats().totals).damage.toFixed(5), "2.76875");
    near(hit(600, 6).gained, 1.5); near(hit(601, 7).gained, 1.5); // ちょうどcapと超過
    // 設定変更でも動く
    const tuned = hermes({ DamageGainRate: "0.01", DamageGainPerHitCap: "0.5" });
    tuned.startWith(ARROW);
    near(gauge(tuned).recordDamageDealt(30, { attackId: "x", targetId: 1 }).gained, 0.3);
    near(gauge(tuned).recordDamageDealt(50, { attackId: "x", targetId: 2 }).gained, 0.5);
    near(gauge(tuned).recordDamageDealt(51, { attackId: "x", targetId: 3 }).gained, 0.5);
});
test("0・負・NaN・Infinity・文字列など無効な実ダメージは加算せず、gainIdも使わない", () => {
    const g = hermes(); g.startWith(ARROW);
    for (const bad of [0, -5, NaN, Infinity, -Infinity, "100", null, undefined, {}, true]) {
        const r = gauge(g).recordDamageDealt(bad, { attackId: "a", targetId: 1 });
        assert.deepEqual(plain([r.ok, r.reason, r.gained]), [false, "invalidDamage", 0], String(bad));
    }
    assert.equal(gauge(g).getUltimateGauge(), 0); assert.equal(gauge(g).getUltimateGaugeGainCount(), 0);
});
test("同じダメージイベント（attack×target）は1回だけ。別ターゲット・別tickは別々に加算。識別子が無ければ直接加算", () => {
    const g = hermes(); g.startWith(ARROW);
    const hit = (ctx, dmg = 100) => gauge(g).recordDamageDealt(dmg, ctx);
    near(hit({ attackId: "slash-1", targetId: 11 }).gained, 0.25);
    for (let i = 0; i < 5; i++) assert.equal(hit({ attackId: "slash-1", targetId: 11 }).reason, "duplicateGain");
    near(hit({ attackId: "slash-1", targetId: 12 }).gained, 0.25); // 同じ斬撃・別の敵
    near(hit({ attackId: "slash-2", targetId: 11 }).gained, 0.25); // 別の斬撃・同じ敵
    near(hit({ attackId: "dot-1", targetId: 11, tickId: 1 }).gained, 0.25);
    near(hit({ attackId: "dot-1", targetId: 11, tickId: 2 }).gained, 0.25);
    assert.equal(hit({ attackId: "dot-1", targetId: 11, tickId: 2 }).reason, "duplicateGain");
    assert.equal(hit({ damageId: "custom-9" }).ok, true); assert.equal(hit({ damageId: "custom-9" }).reason, "duplicateGain");
    assert.equal(hit({}).ok, true); assert.equal(hit({}).ok, true); // gainId無しは呼び出し側の責任
    assert.equal(hit({ attackId: "a", targetId: 1, tickId: {} }).gainId, null);
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:slash-1:11"), true);
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:dot-1:11:2"), true);
    const state = hit(undefined); assert.equal(state.ok, true); // contextなしでも例外なし
});
test("ゲージ状態が無いと安全に失敗（例外なし・状態を作らない）。満タンでは溢れずgainIdを消費しない", () => {
    const none = hermes({}, null); none.startWith(ARROW);
    const r = gauge(none).recordDamageDealt(1000, { attackId: "a", targetId: 1 });
    assert.deepEqual(plain([r.ok, r.reason, r.gained]), [false, "noUltimateGauge", 0]);
    assert.equal(gauge(none).recordImportantDodge("d").reason, "noUltimateGauge");
    const g = hermes(); g.startWith(ARROW); gauge(g).addUltimateGauge(99.99, "fill");
    const last = gauge(g).recordDamageDealt(1000, { attackId: "a", targetId: 1 });
    assert.equal(last.ok, true); near(last.gained, 0.01); assert.equal(gauge(g).getUltimateGauge(), 100);
    const full = gauge(g).recordDamageDealt(1000, { attackId: "a", targetId: 2 });
    assert.deepEqual(plain([full.ok, full.reason, full.gained]), [false, "gaugeFull", 0]);
    assert.equal(gauge(g).hasUltimateGaugeGainId("damage:a:2"), false);
    assert.equal(gauge(g).consumeUltimateGauge().ok, true);
    assert.equal(gauge(g).recordDamageDealt(1000, { attackId: "a", targetId: 2 }).ok, true); // 消費後は同じイベントも加算できる
});

// ---- 与ダメージ（実Action Engine経路） ----
test("Golden Arrow: 実際に減ったHPからゲージ加算。1発1Hitで二重加算なし。ダメージ自体はゲージ有無で同一", () => {
    const g = hermes(); g.startWith(ARROW); g.fire();
    const enemy = g.addEnemy(101); g.collideWith(enemy);
    const hp = lost(enemy); assert.ok(hp > 0);
    const expected = Math.min(hp * 0.0025, 1.5);
    near(gauge(g).getUltimateGauge(), 2 + expected);
    near(gauge(g).getGainStats().totals.damage, expected);
    assert.equal(gauge(g).getUltimateGaugeGainCount(), 2); // card + damage
    g.tick(30); near(gauge(g).getUltimateGauge(), 2 + expected); // 同じ衝突フレームの再処理なし
    const plainGame = hermes({}, null); plainGame.startWith(ARROW); plainGame.fire();
    const e2 = plainGame.addEnemy(101); plainGame.collideWith(e2);
    assert.equal(lost(e2), hp); // ダメージ量は同じ
});
test("オーバーキル: 敵HPが20なら実ダメージ20。倒れた敵・HP0の敵からは加算しない", () => {
    const g = hermes(); g.startWith(ARROW); g.fire();
    const enemy = g.addEnemy(101); enemy.bar.currentHp = 20; enemy.bar.targetHp = 20;
    g.collideWith(enemy);
    assert.equal(enemy.bar.currentHp, 0);
    near(gauge(g).getGainStats().totals.damage, 20 * 0.0025); // 20であってスキル計算値ではない
    // 既にHP0の敵には矢が当たっても加算しない（既存の生存判定でHitしない）
    const h = hermes(); h.startWith(ARROW); h.fire();
    const corpse = h.addEnemy(102, 25, 25); corpse.bar.currentHp = 0;
    h.collideWith(corpse);
    assert.equal(corpse.bar.currentHp, 0); assert.equal(h.hpCommands().length, 0);
    assert.equal(gauge(h).getGainStats().totals.damage, 0);
    const intact = g.addEnemy(103, 30, 30); // HPが減っていない対象は加算なし
    assert.equal(gauge(g).recordEventHpLoss(103, 0, { attackId: "z" }).reason, "invalidDamage"); // 既に倒れている対象
    assert.equal(gauge(g).recordEventHpLoss(103, intact.bar.currentHp, { attackId: "z2" }).reason, "invalidDamage");
    assert.equal(gauge(g).recordEventHpLoss(404, 50, { attackId: "z3" }).ok, true); // 倒されて消えた敵＝HP0。消える直前の実HP50分だけ
});
test("Hermes剣術: 1回の斬撃で複数の敵に当たると、敵ごとに別々に加算（各1回）", () => {
    const g = hermes(); g.startWith(SWORD); g.fire();
    const first = g.hitEnemy(1);
    const swing = g.swing(); const second = g.addEnemy(102, swing._realX, swing._realY + 0.5);
    g.tick(1);
    assert.ok(lost(first) > 0 && lost(second) > 0);
    const each = Math.min(lost(first) * 0.0025, 1.5) + Math.min(lost(second) * 0.0025, 1.5);
    near(gauge(g).getGainStats().totals.damage, each);
    assert.equal(gauge(g).getUltimateGaugeGainCount(), 3); // card + 2 targets
    g.tick(5); near(gauge(g).getGainStats().totals.damage, each);
});
test("崩壊中もダメージ加算が働く。ゲージが埋まってもfull=true/ready=falseで、復帰でready", () => {
    const g = hermes(); g.startWith(ARROW); g.fire(); collapse(g);
    gauge(g).addUltimateGauge(97, "fill");
    const enemy = g.addEnemy(101); g.collideWith(enemy);
    assert.equal(gauge(g).getUltimateGauge() > 99, true);
    gauge(g).addUltimateGauge(100, "fill2");
    assert.deepEqual(plain([gauge(g).getUltimateGauge(), gauge(g).isUltimateGaugeFull(), gauge(g).isUltimateReady()]), [100, true, false]);
    battleTime(g, 900); assert.equal(gauge(g).isUltimateReady(), true);
});
test("ゲージが無い/エラーでも攻撃は成立。trackDamageはapplyの戻り値・例外を変えない", () => {
    const g = hermes(); g.startWith(ARROW); g.fire();
    const enemy = g.addEnemy(101);
    assert.equal(gauge(g).trackDamage(101, { attackId: "x" }, () => 42), 42);
    assert.throws(() => gauge(g).trackDamage(101, { attackId: "x" }, () => { enemy.bar.currentHp -= 10; throw Error("apply failed"); }), /apply failed/);
    near(gauge(g).getGainStats().totals.damage, 10 * 0.0025); // 例外でも減ったHPは記録される
    assert.equal(gauge(g).trackDamage(404, { attackId: "y" }, () => "gone"), "gone");
    const none = hermes({}, null); none.startWith(ARROW); none.fire();
    const e = none.addEnemy(101); none.collideWith(e); assert.ok(lost(e) > 0);
    assert.equal(gauge(none).getUltimateGauge(), 0);
});

// ---- Disease ----
test("Disease: 初撃とDoTの各tickが別々に実ダメージで加算。DoTにカード使用ゲージはなく、重ねがけは別付与として扱う", () => {
    const g = addGauge(loadDisease());
    g.begin();
    assert.equal(deck(g).requestUseCard(0).ok, true); near(gauge(g).getUltimateGauge(), 2);
    const enemy = g.enemy(101); g.hit(enemy);
    const initial = lost(enemy); assert.ok(initial > 0);
    const first = Math.min(initial * 0.0025, 1.5);
    near(gauge(g).getGainStats().totals.damage, first);
    assert.equal(g.diseased(enemy), true);
    let total = first;
    for (let tick = 1; tick <= 6; tick++) {
        const before = enemy.bar.currentHp; g.time(1);
        const delta = before - enemy.bar.currentHp; assert.ok(delta > 0, `tick ${tick}`);
        total += Math.min(delta * 0.0025, 1.5);
        near(gauge(g).getGainStats().totals.damage, total, `tick ${tick}`);
    }
    assert.equal(gauge(g).getGainStats().totals.card, 2); // DoTでカード加算なし
    assert.equal(gauge(g).getUltimateGaugeGainCount(), 1 + 1 + 6); // card + 初撃 + 6tick
    const ids = ["damage:plague:1:101", "damage:disease:1:101:1", "damage:disease:1:101:6"];
    for (const id of ids) assert.equal(gauge(g).hasUltimateGaugeGainId(id), true, id);
    g.time(10); near(gauge(g).getGainStats().totals.damage, total); // DoT終了後は増えない
});
test("DoTは最後のHPまでしか加算しない（倒した後は加算なし）。再付与は新しいidで加算", () => {
    const g = addGauge(loadDisease()); g.begin(); deck(g).requestUseCard(0);
    const enemy = g.enemy(101); g.hit(enemy);
    const afterHit = gauge(g).getGainStats().totals.damage;
    enemy.bar.currentHp = 5; enemy.bar.targetHp = 5; // 残り5。DoTは15なので実ダメージは5
    g.time(1);
    assert.equal(enemy.bar.currentHp, 0);
    near(gauge(g).getGainStats().totals.damage - afterHit, 5 * 0.0025);
    g.time(5); near(gauge(g).getGainStats().totals.damage - afterHit, 5 * 0.0025); // 倒れた敵への以降のtickなし
    // 再付与: 新しい弾の初撃 + 新付与のtick（idが衝突しない）
    const g2 = addGauge(loadDisease()); g2.begin(); deck(g2).requestUseCard(0);
    const target = g2.enemy(101); g2.hit(target); g2.time(1);
    deck(g2).updateCooldown(20); // カードを引き直し
    g2.arrange(); deck(g2).requestUseCard(0); g2.hit(target); g2.time(1);
    assert.equal(gauge(g2).hasUltimateGaugeGainId("damage:disease:1:101:1"), true);
    assert.equal(gauge(g2).hasUltimateGaugeGainId("damage:disease:2:101:1"), true);
});

// ---- 重要回避 ----
test("重要回避: 実ゲームの回避システムは無い。recordImportantDodge(dodgeId)が設定量を1回加算し、重複・無効IDは加算しない", () => {
    const g = hermes(); g.startWith(ARROW);
    const r = gauge(g).recordImportantDodge("dodge-1", "test");
    assert.deepEqual(plain([r.ok, r.gained, r.gainId, r.source]), [true, 5, "dodge:dodge-1", "test"]);
    assert.equal(gauge(g).recordImportantDodge("dodge-1").reason, "duplicateGain"); near(gauge(g).getUltimateGauge(), 5);
    near(gauge(g).recordImportantDodge(7).gained, 5); assert.equal(gauge(g).recordImportantDodge("7").reason, "duplicateGain");
    for (const bad of [undefined, null, "", NaN, {}, true]) assert.equal(gauge(g).recordImportantDodge(bad).reason, "invalidDodgeId");
    assert.deepEqual(plain(gauge(g).getGainStats().totals), { card: 0, support: 0, damage: 0, dodge: 10 });
    collapse(g); near(gauge(g).recordImportantDodge("d3").gained, 5); // 崩壊中も加算
    // 実ゲームのどこからも呼ばれない（敵の攻撃が外れただけでは加算しない）
    for (const file of fs.readdirSync(path.join(__dirname, "..", "js/plugins")).filter(f => /^ProjectR_.*\.js$/.test(f) && f !== "ProjectR_UltimateGauge.js")) {
        assert.equal(/recordImportantDodge/.test(read(`js/plugins/${file}`)), false, file);
    }
});

// ---- ライフサイクル ----
test("自動加算なし: 時間経過・Divine HPダメージ・崩壊・復帰・ドロー・手札回しでは増えない（診断も0のまま）", () => {
    const g = hermes(); g.startWith(ARROW);
    battleTime(g, 600); mgr(g).damagePersistentUltimate(30); collapse(g); battleTime(g, 900);
    deck(g).updateCooldown(100);
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.deepEqual(plain(gauge(g).getGainStats()), { totals: { card: 0, support: 0, damage: 0, dodge: 0 }, last: null });
});
test("戦闘終了・マップ移動・onMapLoaded・ロードで診断とgainId・使用回数が消え、次の戦闘は0から。ゲージは保存されない", () => {
    for (const how of ["end", "setup", "mapLoaded", "load"]) {
        const g = hermes(); g.startWith(ARROW); g.fire();
        const enemy = g.addEnemy(101); g.collideWith(enemy);
        assert.ok(gauge(g).getUltimateGauge() > 2);
        const serialized = JSON.stringify(g.DataManager.makeSaveContents());
        assert.equal(/ultimateGauge|gainId|damage:arrow|card:card/i.test(serialized), false);
        if (how === "end") deck(g).endCardBattle();
        else if (how === "setup") g.$gameMap.setup(2);
        else if (how === "mapLoaded") g.SceneManager._scene.onMapLoaded();
        else g.DataManager.extractSaveContents(g.DataManager.makeSaveContents());
        assert.deepEqual(plain([gauge(g).hasUltimateGaugeState(), gauge(g).getUltimateGauge(), gauge(g).getUltimateGaugeGainCount()]), [false, 0, 0], how);
        assert.deepEqual(plain(gauge(g).getGainStats()), { totals: { card: 0, support: 0, damage: 0, dodge: 0 }, last: null }, how);
        assert.equal(gauge(g).recordImportantDodge("x").reason, "noUltimateGauge", how);
    }
    const g = hermes(); g.startWith(ARROW); g.fire(); const used = deck(g).getBattleState().hand[0].instanceId;
    deck(g).endCardBattle(); deck(g).startCardBattle();
    assert.equal(gauge(g).getUltimateGauge(), 0);
    assert.equal(gauge(g).recordCardUse({ ok: true, reason: "success", instanceId: used, cardId: ARROW, state: {} }).ok, true);
    assert.equal(gauge(g).hasUltimateGaugeGainId(`card:${used}:1`), true); // 使用回数は新しい戦闘で1から
});
test("Phase 4Aとの整合: 満タン→消費→再加算。Divine HP・Damage Bridgeに触れない", () => {
    const g = hermes(); g.startWith(ARROW);
    gauge(g).addUltimateGauge(98, "fill");
    g.fire(); assert.equal(gauge(g).isUltimateGaugeFull(), true); assert.equal(gauge(g).isUltimateReady(), true);
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), 100);
    const hp = mgr(g).getPersistentUltimateDivineHp();
    assert.equal(gauge(g).consumeUltimateGauge().ok, true);
    assert.equal(gauge(g).getUltimateGauge(), 0);
    g.fire(); near(gauge(g).getUltimateGauge(), 2); // 消費後も加算元は有効
    assert.equal(mgr(g).getPersistentUltimateDivineHp(), hp);
    for (const file of ["ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge", "ProjectR_CardDeckCore", "ProjectR_CardBattleInput"]) {
        assert.equal(/UltimateGauge|recordDamageDealt/.test(read(`js/plugins/${file}.js`).replace(/\/\*:[\s\S]*?\*\//, "")), false, file);
    }
});
test("配線: 3つの攻撃pluginはtrackDamageを任意に呼ぶだけで、加算式・addUltimateGaugeを持たない。登録パラメータは既定と一致", () => {
    for (const file of ["ProjectR_ApolloGoldenArrow", "ProjectR_HermesSwordsmanship", "ProjectR_ApolloDiseaseAttack"]) {
        const text = read(`js/plugins/${file}.js`);
        assert.equal(/trackDamage/.test(text), true, file);
        assert.equal(/addUltimateGauge|recordDamageDealt|DamageGainRate|DamageGainPerHitCap/.test(text), false, file);
    }
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const params = c.$plugins.find(p => p.name === GAUGE).parameters;
    const source = read(GAUGE_FILE);
    for (const name of Object.keys(params)) assert.equal(new RegExp(`@param ${name}\\b`).test(source), true, name);
    assert.deepEqual(plain(gauge(hermes(params)).getGainConfig()), plain(gauge(hermes({})).getGainConfig())); // 登録値＝既定値
    assert.equal(c.$plugins.filter(p => p.name === GAUGE).length, 1);
    assert.equal(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${GAUGE}.js`)), true);
});
