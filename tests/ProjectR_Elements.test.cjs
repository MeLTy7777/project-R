"use strict";
// 属性(Database属性ID)の共通窓口 ProjectR_Elements と、属性倍率が「1ヒットにつき1回だけ」掛かることの検証。実エンジン(実Map004 + 全plugin)。
// 属性表は MZ 標準(System.json elements)。ここでは Database を壊さず、VM上のコピーにだけ特徴を足して試す。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, SWEEP, ISSEN, placePolar, parkOthers, aimDegree, lost, resetHp, useCard, runFrames, equip, SWORD_ID, weaponHit, hpOf, deckApi } = fx;
const fs = require("node:fs");
const path = require("node:path");
const project = path.resolve(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const FIRE = 2, ICE = 3, LIGHT = 8, PHYSICAL = 1;
const TARGET = 4; // 敵Event(<hp: 魔獣> = 敵キャラ5)
const ENEMY_DB = 5;
const rates = { [FIRE]: 2, [ICE]: 0.5, [LIGHT]: 0 };
function giveRates(w, table = rates) {
    const traits = w.ctx.$dataEnemies[ENEMY_DB].traits;
    for (const [id, value] of Object.entries(table)) traits.push(w.run(`({ code: 11, dataId: ${Number(id)}, value: ${value} })`));
}
function setElement(w, card, element, weakness) {
    const api = w.ctx.ProjectRCardBalance;
    assert.equal(api.setOverride(card, "constant", "element", element).ok, true);
    if (weakness !== undefined) assert.equal(api.setOverride(card, "constant", "weaknessMultiplier", weakness).ok, true);
}
function sweepOnce(w, { random = 0.999, radius = 3 } = {}) {
    parkOthers(w, [TARGET]); resetHp(w);
    placePolar(w, TARGET, radius, 0); aimDegree(w, 0);
    w.run(`Math.random = () => ${random};`);
    const result = useCard(w, 0);
    assert.equal(result.ok, true, JSON.stringify(result));
    return lost(w, TARGET);
}
function freshSweep(level = 1) { const w = hermesWorld({ card: SWEEP, level }); giveRates(w); return w; }

test("属性表はMZ標準のまま(物理/炎/氷/雷/水/土/風/光/闇 = ID 1〜9)で、Elementsの窓口がDatabaseから読む", () => {
    const w = freshSweep();
    const el = w.ctx.ProjectRElements;
    assert.deepEqual(plain(el.table()).map(r => r.name), ["無属性", "物理", "炎", "氷", "雷", "水", "土", "風", "光", "闇"]);
    assert.equal(el.idOf("炎"), 2); assert.equal(el.nameOf(8), "光"); assert.equal(el.idOf("存在しない"), -1);
    // Databaseの属性表は作成当初(初回登録コミット)から変わっていない
    const system = JSON.parse(fs.readFileSync(path.join(project, "data/System.json"), "utf8"));
    assert.deepEqual(system.elements, ["", "物理", "炎", "氷", "雷", "水", "土", "風", "光", "闇"]);
});

test("敵の弱点/耐性/無効はMZの属性有効度(特徴 code 11)そのもの。profileが分類する", () => {
    const w = freshSweep();
    const el = w.ctx.ProjectRElements;
    assert.equal(el.rateOf(TARGET, FIRE), 2);
    assert.equal(el.rateOf(TARGET, ICE), 0.5);
    assert.equal(el.rateOf(TARGET, LIGHT), 0);
    assert.equal(el.rateOf(TARGET, PHYSICAL), 1, "特徴が無い属性は等倍");
    assert.equal(el.rateOf(TARGET, 0), 1, "無属性(0)は常に等倍");
    const kinds = Object.fromEntries(plain(el.profile(TARGET)).map(r => [r.name, r.kind]));
    assert.deepEqual([kinds["炎"], kinds["氷"], kinds["光"], kinds["雷"]], ["weak", "resist", "immune", "neutral"]);
    assert.equal(el.classify(-1), "absorb");
});

test("無属性の固定ダメージは従来どおり(薙ぎ払いLv1 = 50)。属性の窓口は何も変えない", () => {
    const w = freshSweep();
    assert.equal(w.ctx.ProjectRCardBalance.constant(SWEEP, "element"), 0);
    assert.equal(sweepOnce(w), 50);
    const log = plain(w.ctx.ProjectRCardModifiers.getWeaponHitLog()).filter(e => e.type === "hit");
    assert.equal(log[log.length - 1].element, 0);
});

test("固定ダメージの属性: 弱点×2=100 / 耐性×0.5=25 / 無効=0 / 等倍(雷)=50。1ヒットに1回だけ", () => {
    for (const [element, expected] of [[FIRE, 100], [ICE, 25], [LIGHT, 0], [4, 50], [0, 50]]) {
        const w = freshSweep();
        setElement(w, SWEEP, element);
        w.ctx.ProjectRElements.setLogging(true);
        assert.equal(sweepOnce(w), expected, `element ${element}`);
        const fixedCalls = plain(w.ctx.ProjectRElements.getLog()).filter(e => e.type === "fixed");
        assert.equal(fixedCalls.length, element > 0 ? 1 : 0, `属性係数の計算は1ヒットにつき1回: ${element}`);
        const log = plain(w.ctx.ProjectRCardModifiers.getWeaponHitLog()).filter(e => e.type === "hit");
        if (element > 0) { assert.equal(log[log.length - 1].element, element); assert.equal(log[log.length - 1].elementRate, w.ctx.ProjectRElements.rateOf(TARGET, element)); }
    }
});

test("計算順: 基礎値 × 属性 → クリティカル(×3) → 先端などの加算。加算には属性もクリティカルも掛からない", () => {
    // 乱数0 = クリティカル。Lv2の先端+50(敵は扇の先端)。弱点: (50×2)×3 + 50 = 350。無属性: 50×3 + 50 = 200
    for (const [element, expected] of [[FIRE, 350], [0, 200], [ICE, 25 * 3 + 50]]) {
        const w = freshSweep(2);
        if (element) setElement(w, SWEEP, element);
        parkOthers(w, [TARGET]); resetHp(w);
        placePolar(w, TARGET, 3.5, 0); aimDegree(w, 0);
        w.run("Math.random = () => 0;");
        assert.equal(useCard(w, 0).ok, true);
        assert.equal(lost(w, TARGET), expected, `element ${element}`);
    }
});

test("Lv3のクリティカル率+50%と属性: 乱数0.6でも(自然な率+0.5で)クリティカル。弱点(×2)→クリティカル(×3)で300", () => {
    const w = freshSweep(3);
    setElement(w, SWEEP, FIRE);
    assert.equal(sweepOnce(w, { random: 0.4, radius: 2 }), 300, "先端の外(半径2): 加算なし");
    const w2 = freshSweep(3);
    setElement(w2, SWEEP, FIRE);
    assert.equal(sweepOnce(w2, { random: 0.999, radius: 2 }), 100, "外れた乱数ではクリティカルなし");
});

test("無効(有効度0)の敵には固定ダメージが0で、加算(先端+50)も入らない", () => {
    const w = freshSweep(2);
    setElement(w, SWEEP, LIGHT);
    parkOthers(w, [TARGET]); resetHp(w);
    placePolar(w, TARGET, 3.5, 0); aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(lost(w, TARGET), 0);
});

test("吸収(負の有効度)は固定ダメージでは無効扱い(0ダメージ。敵のHPは増えない)", () => {
    const w = hermesWorld({ card: SWEEP }); giveRates(w, { [FIRE]: -1 });
    setElement(w, SWEEP, FIRE);
    assert.equal(sweepOnce(w), 0);
});

test("一閃: 直接ダメージ200と分割ダメージの各tickに属性が1回ずつ(複数ヒット)。弱点: 400 + (34+34+32) = 500", () => {
    const run = element => {
        const w = hermesWorld({ card: ISSEN, level: 1 }); giveRates(w);
        if (element) setElement(w, ISSEN, element);
        parkOthers(w, [TARGET]); resetHp(w);
        placePolar(w, TARGET, 4, 0); aimDegree(w, 0);
        w.run("Math.random = () => 0.999;");
        w.ctx.ProjectRElements.setLogging(true);
        assert.equal(useCard(w, 0).ok, true);
        runFrames(w, 60 * 4);
        return { lost: lost(w, TARGET), calls: plain(w.ctx.ProjectRElements.getLog()).filter(e => e.type === "fixed").length };
    };
    assert.deepEqual(run(0), { lost: 250, calls: 0 });
    // 直接200×2=400、分割50を3tick(17/17/16)それぞれ×2して四捨五入 = 34+34+32
    assert.deepEqual(run(FIRE), { lost: 500, calls: 4 });
    // 耐性×0.5: 100 + round(8.5)+round(8.5)+8 = 100+9+9+8
    assert.deepEqual(run(ICE), { lost: 126, calls: 4 });
});

test("通常の武器攻撃: 武器の攻撃時属性(特徴 code 31)がMZの式でちょうど1回だけ効く(炎の剣 × 炎に弱い敵 = 2倍)", () => {
    const w = hermesWorld({ card: SWEEP }); giveRates(w);
    equip(w, SWORD_ID);
    const sword = w.ctx.$dataWeapons[SWORD_ID];
    parkOthers(w, [TARGET]); resetHp(w);
    w.ctx.ProjectRElements.setLogging(true);
    const physical = weaponHit(w, TARGET);
    assert.ok(physical > 0);
    const traits = sword.traits;
    const original = traits.slice();
    // 物理(1)の特徴を外して炎(2)にする(VM上のコピーだけ)
    sword.traits = traits.filter(t => !(t.code === 31)).concat([w.run("({ code: 31, dataId: 2, value: 0 })")]);
    resetHp(w);
    w.ctx.ProjectRElements.clearLog();
    const fire = weaponHit(w, TARGET);
    assert.ok(Math.abs(fire - physical * 2) <= 1, `炎に弱い敵: 物理の2倍(四捨五入の±1まで。2回掛かれば4倍になる): ${physical} → ${fire}`);
    const skillCalls = plain(w.ctx.ProjectRElements.getLog()).filter(e => e.type === "skill");
    assert.ok(skillCalls.length >= 1 && skillCalls.every(e => e.rate === 2), JSON.stringify(skillCalls));
    sword.traits = w.run("[]").concat(original);
});

test("スキルのダメージ(弾・DoT・Ultimate): Databaseスキルの属性IDが有効度に従って1回だけ効く。無属性(0)は等倍", () => {
    const w = hermesWorld({ card: SWEEP }); giveRates(w);
    const event = w.ctx.$gameMap.event(TARGET);
    const interpreter = new w.ctx.Game_Interpreter();
    const damageOf = skillId => { w.run("Math.random = () => 0.999;"); return interpreter.calculateDamageAgainstEvent(event, "skill", skillId); };
    // 病ダメージ(DoT, id 239) と アポロン奥義(Ultimate, id 234) と 黄金の弓矢(236)。いずれもDBでは無属性
    for (const id of [239, 234, 236, 238]) {
        const skill = w.ctx.$dataSkills[id];
        assert.equal(skill.damage.elementId, 0, `製品のスキル${id}は無属性のまま`);
        const neutral = damageOf(id);
        assert.ok(neutral > 0);
        skill.damage.elementId = FIRE;
        const weak = damageOf(id);
        skill.damage.elementId = ICE;
        const resist = damageOf(id);
        skill.damage.elementId = LIGHT;
        const immune = damageOf(id);
        skill.damage.elementId = 0;
        // 最終値は四捨五入(と最小ダメージ1)を通るので±1まで。2回掛かれば4倍・0.25倍になり、この範囲では見逃さない。
        if (id !== 236) { assert.ok(Math.abs(weak - neutral * 2) <= 1, `skill ${id} 弱点 ${neutral}→${weak}`); assert.ok(Math.abs(resist - neutral * 0.5) <= 1, `skill ${id} 耐性 ${neutral}→${resist}`); }
        else { assert.ok(weak > neutral * 1.5 && resist < neutral * 0.75, "分散ありのスキルは範囲で確認"); }
        assert.equal(immune <= 1, true, `skill ${id} 無効(最小ダメージ1)`);
    }
});

test("弱点ダメージ修飾(将来のカード効果用): 弱点のときだけ有効度に掛かる。耐性・等倍・無効は変わらない。スキル経路と固定経路の両方に1回ずつ", () => {
    const w = freshSweep();
    const el = w.ctx.ProjectRElements;
    assert.equal(el.addWeaknessModifier("test.weak", 1.5).ok, true);
    assert.equal(el.adjustRate(2, 1), 3);
    assert.equal(el.adjustRate(0.5, 1), 0.5); assert.equal(el.adjustRate(1, 1), 1); assert.equal(el.adjustRate(0, 1), 0);
    setElement(w, SWEEP, FIRE);
    assert.equal(sweepOnce(w), 150, "固定: 50 × (2×1.5) = 150");
    const interpreter = new w.ctx.Game_Interpreter();
    w.ctx.$dataSkills[239].damage.elementId = FIRE;
    w.run("Math.random = () => 0.999;");
    const modified = interpreter.calculateDamageAgainstEvent(w.ctx.$gameMap.event(TARGET), "skill", 239);
    el.clearWeaknessModifiers();
    const plainWeak = interpreter.calculateDamageAgainstEvent(w.ctx.$gameMap.event(TARGET), "skill", 239);
    w.ctx.$dataSkills[239].damage.elementId = 0;
    const neutral = interpreter.calculateDamageAgainstEvent(w.ctx.$gameMap.event(TARGET), "skill", 239);
    assert.ok(Math.abs(plainWeak - neutral * 2) <= 1);
    assert.ok(Math.abs(modified - neutral * 3) <= 1, `スキル経路も有効度が2→3: ${neutral} → ${modified}`);
    // カードごとの追加倍率(weaknessMultiplier)も同じ式
    const w2 = freshSweep();
    setElement(w2, SWEEP, FIRE, 2);
    assert.equal(sweepOnce(w2), 200, "50 × (2×2)");
    // 戦闘終了で修飾は外れる
    el.addWeaknessModifier("x", 2);
    w.ctx.ProjectRCardDeck.endBattle();
    assert.deepEqual(plain(el.weaknessModifiers()), []);
});

test("撃破の帰属・Ultimateゲージ: 属性で増減した実ダメージがそのまま記録される(HPの差と一致)", () => {
    const w = freshSweep();
    setElement(w, SWEEP, FIRE);
    const dealt = sweepOnce(w);
    assert.equal(dealt, 100);
    const hit = plain(w.ctx.ProjectRCardModifiers.getWeaponHitLog()).filter(e => e.type === "hit").pop();
    assert.equal(hit.dealt, 100, "CardModifiersが読み取った実ダメージ = HPの減り");
});

test("既存データを壊さない: 製品のスキル/武器/敵のDatabaseに属性の変更を加えていない(作成当初と同じ)", () => {
    const { execFileSync } = require("node:child_process");
    const git = args => execFileSync("git", args, { cwd: project, encoding: "utf8", maxBuffer: 1e9 });
    let first;
    try { first = git(["rev-list", "--max-parents=0", "HEAD"]).trim().split(/\r?\n/)[0]; } catch (e) { return; }
    const show = (rev, file) => JSON.parse(git(["show", `${rev}:data/${file}`]));
    const readNow = file => JSON.parse(fs.readFileSync(path.join(project, "data", file), "utf8"));
    const skillsThen = show(first, "Skills.json"), skillsNow = readNow("Skills.json");
    for (let id = 1; id < skillsThen.length; id++) {
        if (!skillsThen[id]) continue;
        assert.equal(skillsNow[id].damage.elementId, skillsThen[id].damage.elementId, `スキル${id}の属性`);
    }
    assert.deepEqual(readNow("Enemies.json"), show(first, "Enemies.json"), "敵の属性有効度(特徴)は作成当初のまま");
    const weaponsThen = show(first, "Weapons.json"), weaponsNow = readNow("Weapons.json");
    for (let id = 1; id < weaponsThen.length; id++) {
        if (weaponsThen[id]) assert.deepEqual(weaponsNow[id].traits, weaponsThen[id].traits, `武器${id}の特徴`);
    }
});

test("Chromium 85で使えない構文を足していない(Elements / CardBalance / Editor)", () => {
    for (const file of ["ProjectR_Elements", "ProjectR_CardBalance", "ProjectR_CardBalanceEditor"]) {
        const source = fs.readFileSync(path.join(project, `js/plugins/${file}.js`), "utf8");
        assert.doesNotMatch(source, /\?\?=|\|\|=|&&=|\.at\(|\(\?<[=!]|\bstructuredClone\b|\.replaceAll\(|Object\.hasOwn\(/, file);
    }
});

console.log(`${passed} Elements tests passed`);
