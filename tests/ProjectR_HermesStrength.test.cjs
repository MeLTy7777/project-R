"use strict";
// Phase H2B-2: Hermes「ストレングス」(設計ID 4 / hermes_strength)。実エンジン(実Map004 + 全plugin)。MZ実機の見た目・G17は tools/mz_cdp/h2b2_verify.cjs。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, STRENGTH, ZETSU, deckApi, modifiers, state, placePolar, parkOthers, aimDegree, lost, resetHp, useCard, runFrames, equip, SWORD_ID,
    ticks, handIds, player, countCommands } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesStrength;
const leader = w => w.ctx.$gameParty.leader();
const enemy = (w, id) => w.ctx.SgetBattlerForH ? w.run(`SgetBattlerForH($gameMap.event(${id}))`) : null;
// 導入版Hendrixの武器ダメージ式(攻撃: a.atk * 4 - b.def * 2, 分散20%)を、乱数0.999(分散が最大側)で独立に計算する。
//   Game_Action.applyVariance: amp = floor(|d| * variance / 100); d + (randomInt(amp+1) + randomInt(amp+1) - amp) = d + amp。
const expectedDamage = (w, id, multiplier, bypass) => {
    const atk = leader(w).atk * multiplier, def = bypass ? 0 : enemy(w, id).def;
    const raw = atk * 4 - def * 2;
    return Math.round(raw + Math.floor(Math.abs(raw) * 20 / 100));
};
// 通常の武器攻撃(剣/銃が呼ぶのと同じ公式コマンド)。attackIdを渡すと同じ攻撃動作として扱う。乱数は0.999固定。
const hit = (w, id, attackId = null) => {
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
    const args = { eventId: String(id), value: "-player weapon", exceedMaxHealth: "false" };
    if (attackId !== null) args.projectRAttackId = attackId;
    const before = lost(w, id);
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", args);
    return lost(w, id) - before;
};
const stack = (w, n) => { for (let i = 0; i < n; i++) assert.equal(useCard(w).ok, true); };
const evade = (w, on) => w.run(on ? `globalThis.__ev = Object.prototype.hasOwnProperty.call(SHendrix_Action.prototype, "itemEva") ? SHendrix_Action.prototype.itemEva : null; SHendrix_Action.prototype.itemEva = function() { return 1; };`
    : `if (globalThis.__ev) SHendrix_Action.prototype.itemEva = globalThis.__ev; else delete SHendrix_Action.prototype.itemEva;`);

test("登録: 特殊 / 最大10枚 / 最大Lv3 / Cooldown 0.1秒 / Buff(instant)。設計ID4 ↔ hermes_strength。累積レベル: 10% → 15%(置換)→ 15% + 防御無視", () => {
    const w = hermesWorld({ card: STRENGTH });
    assert.deepEqual(plain(deckApi(w).definitions.card(STRENGTH)), { cardId: STRENGTH, ringId: "hermes", maxCopies: 10, cooldownSeconds: 0.1, maxLevel: 3, rarity: "special", category: "buff", targetType: "instant" });
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.designId === 4);
    assert.deepEqual([design.runtimeCardId, design.implemented, design.classification, design.maxCopies], [STRENGTH, true, "special", 10]);
    assert.deepEqual(plain(api(w).effectsForLevel(1)), { attackBonus: 0.10 });
    assert.deepEqual(plain(api(w).effectsForLevel(2)), { attackBonus: 0.15 }, "Lv2は10%を15%へ置換(足さない・掛けない)");
    assert.deepEqual(plain(api(w).effectsForLevel(3)), { attackBonus: 0.15, ignoreDefense: true });
    const fresh = require("./RealEngineHarness.cjs").buildWorld();
    fresh.enterMap(4, 12, 25);
    assert.equal(deckApi(fresh).isCardOwned(STRENGTH), false, "既定は未所持");
});

test("重ね掛けの計算は1か所(既定は加算の暫定): 1+Σp。上限なし(25回でも1+2.5)", () => {
    const w = hermesWorld({ card: STRENGTH });
    assert.equal(api(w).stackingMode(), "additive");
    assert.equal(api(w).combine([]), 1);
    assert.ok(Math.abs(api(w).combine([0.1]) - 1.1) < 1e-12);
    assert.ok(Math.abs(api(w).combine([0.1, 0.1, 0.1]) - 1.3) < 1e-12);
    assert.ok(Math.abs(api(w).combine(Array(25).fill(0.15)) - (1 + 25 * 0.15)) < 1e-9, "最大重複数なし");
});

test("使用: 1枚消費・補充・Cooldown 0.1秒。対象が無くても成功。何回でも重ねられる(Lv別の値を記録)", () => {
    for (const [level, value] of [[1, 0.10], [2, 0.15], [3, 0.15]]) {
        const w = hermesWorld({ card: STRENGTH, level });
        parkOthers(w);
        const before = state(w);
        assert.equal(useCard(w).ok, true);
        const after = state(w);
        assert.equal(after.cooldownPile.length, 1);
        assert.equal(after.cooldownPile[0].remainingSeconds, 0.1);
        assert.equal(after.drawPile.length, before.drawPile.length - 1, "補充");
        assert.deepEqual(plain(api(w).getPending()).values, [value], `Lv${level}`);
        assert.equal(api(w).getPending().ignoreDefense, level === 3);
    }
    const w = hermesWorld({ card: STRENGTH, level: 1 });
    stack(w, 5);
    assert.equal(api(w).getPending().stacks, 5);
    assert.ok(Math.abs(api(w).getPending().multiplier - 1.5) < 1e-12);
    // Cooldown 0.1秒: 6frame = 0.1秒(浮動小数の誤差で残りが1e-17になるため、Coreの仕様どおり7frame目で山へ戻る)
    assert.equal(state(w).cooldownPile.length, 5);
    ticks(w, 5);
    assert.equal(state(w).cooldownPile.length, 5, "0.1秒の手前ではまだCooldown中");
    ticks(w, 2);
    assert.equal(state(w).cooldownPile.length, 0, "0.1秒でCooldown終了");
    assert.equal(state(w).discardPile.length, 5);
});

test("「攻撃力」を上げる(最終ダメージの倍率ではない): 武器スキル式 a.atk*4 - b.def*2 の a.atk が増える。基礎ATK・装備は変えない", () => {
    const w = hermesWorld({ card: STRENGTH, level: 2 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 1.3, 90); placePolar(w, 5, 1.3, 270);
    equip(w, SWORD_ID);
    const atk0 = leader(w).atk, def4 = enemy(w, 4).def, paramBefore = plain(leader(w)._paramPlus);
    const base = hit(w, 5);
    assert.equal(base, expectedDamage(w, 5, 1, false), "基準は独立に計算した式と一致");
    stack(w, 3); // Lv2: 15% x 3 = +45%
    const boosted = hit(w, 4);
    assert.equal(boosted, expectedDamage(w, 4, 1.45, false), "攻撃力x1.45 を式に通した値");
    assert.notEqual(boosted, Math.round(base * 1.45), "最終ダメージの単純な倍率ではない(防御を引いた後の差が増える)");
    assert.ok(boosted > base * 1.45, "防御を引いた後の差が増えるので倍率以上");
    // 永続的な変更なし
    assert.equal(leader(w).atk, atk0);
    assert.equal(enemy(w, 4).def, def4);
    assert.deepEqual(plain(leader(w)._paramPlus), paramBefore);
    assert.equal(Object.prototype.hasOwnProperty.call(leader(w), "param"), false, "paramの一時差し替えは残らない");
    assert.equal(Object.prototype.hasOwnProperty.call(enemy(w, 4), "param"), false);
    assert.equal(w.run("$dataWeapons[2].params[2]"), 12, "Databaseの武器は不変");
});

test("Lv3: 防御を無視する(防御の項だけ。回避・無効・クリティカルには触れない)。Lv2は防御を引く", () => {
    const w = hermesWorld({ card: STRENGTH, level: 3 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 1.3, 90); placePolar(w, 5, 1.3, 270);
    equip(w, SWORD_ID);
    stack(w, 2); // 15% x 2 = 1.3、防御無視
    const lv3 = hit(w, 4);
    assert.equal(lv3, expectedDamage(w, 4, 1.3, true), "b.def を 0 として計算");
    assert.ok(lv3 > expectedDamage(w, 4, 1.3, false), "防御を引かない分だけ大きい");
    assert.equal(enemy(w, 4).def, 20, "敵の防御は永続的に変わらない");
    // 回避は防御無視でも成立する(無敵・回避を無視しない)。外れなので蓄えは消費されない
    stack(w, 2);
    evade(w, true);
    try { assert.equal(hit(w, 5), 0, "回避されれば0"); } finally { evade(w, false); }
    assert.equal(api(w).getPending().stacks, 2, "外れは消費しない");
    // Lv2は防御を引く
    fx.deckApi(w).setCardLevel(STRENGTH, 2);
    const w2 = hermesWorld({ card: STRENGTH, level: 2 });
    parkOthers(w2, [4]); placePolar(w2, 4, 1.3, 90); equip(w2, SWORD_ID);
    stack(w2, 2);
    assert.equal(hit(w2, 4), expectedDamage(w2, 4, 1.3, false));
});

test("次の通常武器攻撃が蓄えを一度にすべて消費する。2回目は通常。カードを引く・他のカードを使う・時間が経つだけでは消費しない", () => {
    const w = hermesWorld({ card: STRENGTH, level: 1, order: [STRENGTH, STRENGTH, STRENGTH, "hermes_swift_movement", "hermes_perception_obscure", ...fx.OTHER] });
    parkOthers(w, [4]);
    placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    const base = hit(w, 4);
    resetHp(w, [4]);
    stack(w, 3);
    // 他のカード(高速移動)を使う・時間が経つ・メニュー相当の停止を挟んでも蓄えは残る
    const other = plain(deckApi(w).requestUseCard(handIds(w).indexOf("hermes_swift_movement")));
    assert.equal(other.ok, true);
    ticks(w, 600); runFrames(w, 30);
    assert.equal(api(w).getPending().stacks, 3, "無関係な出来事では消費しない(期限もない)");
    const boosted = hit(w, 4);
    assert.equal(boosted, expectedDamage(w, 4, 1.3, false));
    assert.equal(api(w).getPending(), null, "全部まとめて消費");
    assert.equal(api(w).getLastAttack().stacks, 3);
    resetHp(w, [4]);
    assert.equal(hit(w, 4), base, "次の攻撃は通常");
});

test("外れ・失敗した攻撃では消費しない。回避の後の命中で初めて消費する。敵以外・ダメージ0は消費しない", () => {
    const w = hermesWorld({ card: STRENGTH, level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    stack(w, 2);
    evade(w, true);
    try { assert.equal(hit(w, 4), 0); } finally { evade(w, false); }
    assert.equal(api(w).getPending().stacks, 2);
    assert.equal(api(w).getLastAttack(), null, "確定していない");
    // 固定ダメージ(攻撃力を使わない)は対象外で消費しない
    const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "4", value: "-30", exceedMaxHealth: "false" });
    assert.equal(api(w).getPending().stacks, 2, "攻撃力を使わない数値のダメージには乗らず、消費もしない");
    assert.equal(hit(w, 4), expectedDamage(w, 4, 1.2, false));
    assert.equal(api(w).getPending(), null);
});

test("複数の敵に当たる1回の攻撃(同じ攻撃動作ID): 全員に同じ強化がかかり、消費は1度だけ。別の攻撃動作には残らない", () => {
    const w = hermesWorld({ card: STRENGTH, level: 1, order: Array(10).fill(STRENGTH) });
    parkOthers(w, [3, 4, 5]);
    placePolar(w, 3, 1.3, 90); placePolar(w, 4, 1.3, 270); placePolar(w, 5, 1.3, 0);
    equip(w, SWORD_ID);
    stack(w, 4);
    const expected = expectedDamage(w, 3, 1.4, false);
    assert.equal(hit(w, 3, "sword:7"), expected);
    assert.equal(hit(w, 4, "sword:7"), expectedDamage(w, 4, 1.4, false), "同じ攻撃動作の2体目にも同じ強化");
    assert.equal(hit(w, 5, "sword:7"), expectedDamage(w, 5, 1.4, false), "3体目にも");
    assert.equal(api(w).getPending(), null, "蓄えは1度だけ消費された");
    assert.equal(api(w).getLastAttack().serial, 1, "確定は1回");
    const next = hit(w, 3, "sword:8");
    assert.equal(next, expectedDamage(w, 3, 1, false), "別の攻撃動作は強化されない");
    // 実際の剣の1振り(SwordSystem)で2体に当たる
    resetHp(w, [3, 4]); stack(w, 2);
    parkOthers(w, [3, 4]);
    placePolar(w, 3, 1.0, 0); fx.placeEnemy(w, 4, fx.center(w).x + 0.5, fx.center(w).y - 1.0);
    fx.placeEnemy(w, 3, fx.center(w).x - 0.5, fx.center(w).y - 1.0);
    aimDegree(w, 0);
    const swings = w.ctx.ProjectRSwordSystem.status().swings;
    assert.equal(w.ctx.ProjectRSwordSystem.swing("test").ok, true);
    runFrames(w, 6);
    assert.equal(w.ctx.ProjectRSwordSystem.status().swings, swings + 1);
    const l3 = lost(w, 3), l4 = lost(w, 4);
    assert.ok(l3 > 0 && l4 > 0, `剣の1振りが2体に当たる ${l3} ${l4}`);
    assert.equal(l3, expectedDamage(w, 3, 1.2, false), "2回蓄えたLv1 = x1.2");
    assert.equal(l4, expectedDamage(w, 4, 1.2, false));
    assert.equal(api(w).getPending(), null);
});

test("絶との併用: ストレングスで上げた武器ダメージに絶の倍率がかかる。どちらも1回だけ消費。ダメージの二重適用なし", () => {
    const w = hermesWorld({ card: STRENGTH, level: 3 });
    parkOthers(w, [4]);
    placePolar(w, 4, 1.3, 90);
    equip(w, SWORD_ID);
    stack(w, 2);
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 2, seconds: 5, source: ZETSU });
    w.calls.length = 0;
    const dealt = hit(w, 4, "sword:1");
    assert.equal(dealt, Math.round(expectedDamage(w, 4, 1.3, true) * 2), "(攻撃力x1.3・防御無視の武器ダメージ) x 絶2.0");
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 1, "ダメージの適用は1回だけ(二重適用なし)");
    assert.equal(api(w).getPending(), null, "ストレングスは消費");
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "絶も消費");
    const log = plain(modifiers(w).getWeaponHitLog());
    assert.equal(log.filter(e => e.type === "consumed").length, 1, "絶の消費は1回");
    // 片方だけ有効でも失われない
    resetHp(w, [4]);
    stack(w, 1);
    assert.equal(hit(w, 4), expectedDamage(w, 4, 1.15, true), "絶が無ければストレングスだけ");
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 3, seconds: 5, source: ZETSU });
    resetHp(w, [4]);
    assert.equal(hit(w, 4), Math.round(expectedDamage(w, 4, 1, false) * 3), "ストレングスが無ければ絶だけ");
    // 外れた攻撃はどちらも失わない
    stack(w, 1);
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 3, seconds: 5, source: ZETSU });
    evade(w, true);
    try { assert.equal(hit(w, 4), 0); } finally { evade(w, false); }
    assert.equal(api(w).getPending().stacks, 1);
    assert.ok(modifiers(w).getWeaponHitBonus(), "絶も残る");
});

test("演出: 通常カットイン1枚・ガッツポーズ・魔法陣と黄金の光のVFX・Hermesは後ろに現れ、黒いノイズとともに消える。演出が失敗しても蓄えは変わらない", () => {
    const w = hermesWorld({ card: STRENGTH, level: 1 });
    parkOthers(w);
    w.calls.length = 0;
    assert.equal(useCard(w).ok, true);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(c => c.kind === "card").length, 1);
    assert.ok(plain(w.ctx.ProjectRCharacterPresentation.history()).some(e => e.ok && e.name === "FistPump"), "ガッツポーズ");
    const vfx = w.calls.filter(c => c.plugin === "Hendrix_Animation_Solution").map(c => JSON.stringify(c.args));
    assert.ok(vfx.some(v => /ProjectR_Strength_Circle/.test(v)), "魔法陣");
    assert.ok(vfx.some(v => /ProjectR_Strength_Light/.test(v)), "黄金の光");
    runFrames(w, 4);
    const id = w.ctx.ProjectRGodSummonVisual.getTransientEventId("hermes");
    assert.ok(id > 0);
    const e = w.ctx.$gameMap.event(id);
    assert.ok(Math.abs(e._realX - player(w)._realX) < 0.3 && e._realY - player(w)._realY < 0, `主人公の真後ろ(上)に立つ ${e._realX - player(w)._realX},${e._realY - player(w)._realY}`);
    w.calls.length = 0;
    runFrames(w, 80);
    assert.ok(w.calls.some(c => c.plugin === "Hendrix_Animation_Solution" && /ProjectR_Hermes_Vanish/.test(JSON.stringify(c.args))), "黒いノイズ");
    assert.equal(w.ctx.ProjectRGodSummonVisual.getTransientEventId("hermes"), 0, "Hermesが消える");
    assert.equal(api(w).getPending().stacks, 1, "表示が終わっても蓄えは残る(使われるまで)");
    // 表示の失敗
    const w2 = hermesWorld({ card: STRENGTH });
    parkOthers(w2);
    w2.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    w2.ctx.ProjectRCutIn.show = () => { throw new Error("cutin down"); };
    assert.equal(useCard(w2).ok, true);
    assert.equal(api(w2).getPending().stacks, 1);
    assert.equal(state(w2).cooldownPile.length, 1);
});

test("ルーターが消費に失敗したら、蓄えも演出も残らない(召喚も片付く)", () => {
    const w = hermesWorld({ card: STRENGTH });
    parkOthers(w);
    const summons = w.ctx.ProjectRGodSummonManager, original = summons.perform;
    summons.perform = function() { const r = original.apply(this, arguments); deckApi(w).useBattleCard(deckApi(w).getBattleState().hand[0].instanceId); return r; };
    const result = useCard(w);
    summons.perform = original;
    assert.equal(result.ok, false);
    assert.equal(api(w).getPending(), null);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0);
    assert.equal(api(w).getLastResult().consumed, false);
});

test("後片付け: 戦闘終了・マップ移動・ロード・死亡で蓄えが消える(保存データにも入らない)。Hit hookの一時差し替えは残らない", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        mapTransfer: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents()),
        death: w => { w.ctx.ProjectR.PlayerDeath.isDead = () => true; runFrames(w, 2); }
    };
    for (const [name, end] of Object.entries(cases)) {
        const w = hermesWorld({ card: STRENGTH, level: 3 });
        stack(w, 3);
        assert.ok(api(w).getPending());
        const saved = JSON.stringify(w.ctx.DataManager.makeSaveContents());
        assert.doesNotMatch(saved, /ProjectRHermesStrength|attackBonus|ignoreDefense/, "保存しない");
        end(w);
        assert.equal(api(w).getPending(), null, name);
        assert.equal(Object.prototype.hasOwnProperty.call(leader(w) || {}, "param"), false, `${name}: paramの差し替えなし`);
    }
});

console.log(`${passed} Hermes Strength tests passed`);
void SWORD_ID;
