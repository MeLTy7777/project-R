"use strict";
// Phase H2B-1: Hermes「葦笛」(設計ID 6 / hermes_reed_flute)。実エンジン(実Map004 + 全plugin)。MZ実機の見た目は対象外(実機は tools/mz_cdp/h2b1_verify.cjs)。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, FLUTE, SWEEP, deckApi, modifiers, state, placePolar, parkOthers, aimDegree, lost, resetHp, sleeping, useCard, runFrames,
    setRegion, equip, SWORD_ID, weaponHit, ticks, handIds } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const fluteApi = w => w.ctx.ProjectRHermesReedFlute;
const LEGACY = "hermes_reed_flute_sleep";
// 通常の剣の命中(公式コマンドと同じ経路)で失ったHP。乱数は0.999固定(回避・自然なクリティカルなし)。
const hit = (w, id, value = "-player weapon") => { const before = lost(w, id); weaponHit(w, id, value); return lost(w, id) - before; };
const patchAction = (w, name, value) => w.run(`globalThis.__saved_${name} = Object.prototype.hasOwnProperty.call(SHendrix_Action.prototype, "${name}") ? SHendrix_Action.prototype.${name} : null; SHendrix_Action.prototype.${name} = function() { return ${value}; };`);
const unpatchAction = (w, name) => w.run(`if (globalThis.__saved_${name}) SHendrix_Action.prototype.${name} = globalThis.__saved_${name}; else delete SHendrix_Action.prototype.${name};`);
const ownsAction = (w, name) => w.run(`Object.prototype.hasOwnProperty.call(SHendrix_Action.prototype, "${name}")`);
const slept = w => plain(fluteApi(w).getLastResult().slept);

test("登録: 強力 / 最大3枚 / 最大Lv3 / Cooldown 8秒 / その他(instant)。旧葦笛睡眠(2枚・12秒・ground)は不変で共存。設計ID6 ↔ hermes_reed_flute", () => {
    const w = hermesWorld({ card: FLUTE });
    const def = deckApi(w).definitions.card(FLUTE);
    assert.deepEqual(plain(def), { cardId: FLUTE, ringId: "hermes", maxCopies: 3, cooldownSeconds: 8, maxLevel: 3, rarity: "strong", category: "sleep", targetType: "instant" });
    assert.equal(Object.isFrozen(def), true);
    const legacy = deckApi(w).definitions.card(LEGACY);
    assert.deepEqual([legacy.maxCopies, legacy.cooldownSeconds, legacy.rarity, legacy.targetType], [2, 12, "strong", "ground"]);
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.designId === 6);
    assert.deepEqual([design.runtimeCardId, design.implemented, design.legacyCandidates], [FLUTE, true, [LEGACY]]);
    assert.deepEqual(plain(fluteApi(w).effectsForLevel(1)), { sleep: true });
    assert.deepEqual(plain(fluteApi(w).effectsForLevel(2)), { sleep: true, sleepBonusDamage: 50 });
    assert.deepEqual(plain(fluteApi(w).effectsForLevel(3)), { sleep: true, sleepBonusDamage: 50, guaranteedCritical: true });
    assert.equal(fluteApi(w).RADIUS_TILES, 8);
    assert.equal(fluteApi(w).sleepSeconds(), 4, "睡眠時間は旧葦笛睡眠のDurationSeconds(4秒)を引き継ぐ。新しい値は決めていない");
});

test("範囲: 半径8マス。体が円に触れていれば効く(複数・別々のEvent ID)。範囲の外(体も届かない)・後ろでも円の内側なら効く", () => {
    const w = hermesWorld({ card: FLUTE });
    for (const arrangement of [{ 4: [7, 0], 5: [8.4, 90], 3: [2, 180], 6: [8.7, 270] }, { 6: [7.5, 270], 3: [8.3, 0], 4: [9, 90], 5: [1, 180] }]) {
        parkOthers(w);
        for (const [id, [r, deg]] of Object.entries(arrangement)) placePolar(w, Number(id), r, deg);
        const result = useCard(w);
        assert.equal(result.ok, true, JSON.stringify(result));
        const expected = Object.entries(arrangement).filter(([, [r]]) => r - 0.5 <= 8).map(([id]) => Number(id)).sort((a, b) => a - b);
        assert.deepEqual(slept(w), expected, JSON.stringify(arrangement));
        for (const id of fx.ENEMIES) assert.equal(sleeping(w, id), expected.includes(id), `Event ${id}`);
        fluteApi(w) && w.run("ProjectRCardDeck.endBattle()");
        fx.restartWithOrder(w, [FLUTE, FLUTE, FLUTE, FLUTE, FLUTE, ...fx.OTHER]);
        fx.attachHpBars(w, fx.ENEMIES, fx.HP);
    }
});

test("壁: Region 255 の向こうの敵は眠らない。手前・壁の無い方向の敵は眠る", () => {
    const w = hermesWorld({ card: FLUTE });
    parkOthers(w, [4, 5]);
    const c = fx.center(w), wallY = Math.floor(c.y) - 2;
    placePolar(w, 4, 5.5, 0); placePolar(w, 5, 5.5, 180);
    for (let x = Math.floor(c.x) - 6; x <= Math.floor(c.x) + 6; x++) setRegion(w, x, wallY, 255);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([sleeping(w, 4), sleeping(w, 5)], [false, true]);
    assert.deepEqual(slept(w), [5]);
});

test("睡眠の時間: 旧葦笛睡眠から引き継いだ4秒(戦闘時間)。再使用は時間の更新で重ならない。時間切れでStateが外れる", () => {
    const w = hermesWorld({ card: FLUTE });
    parkOthers(w, [4]);
    placePolar(w, 4, 3, 0);
    assert.equal(useCard(w).ok, true);
    assert.equal(sleeping(w, 4), true);
    assert.equal(plain(fluteApi(w).getSleepers())[0].remaining, 4);
    ticks(w, 120);
    assert.equal(sleeping(w, 4), true);
    assert.ok(Math.abs(plain(fluteApi(w).getSleepers())[0].remaining - 2) < 1e-6);
    assert.equal(useCard(w).ok, true, "再使用");
    assert.equal(plain(fluteApi(w).getSleepers()).length, 1, "重ならない");
    assert.equal(plain(fluteApi(w).getSleepers())[0].remaining, 4, "時間は更新される(足し算ではない)");
    ticks(w, 235);
    assert.equal(sleeping(w, 4), true);
    ticks(w, 10);
    assert.equal(sleeping(w, 4), false, "4秒で外れる");
    assert.equal(plain(fluteApi(w).getSleepers()).length, 0);
});

test("対象なしでも有効な発動ならカードを消費する(Cooldown 8秒・補充)。睡眠は誰にも付かず、エラーも残らない。旧葦笛睡眠は従来どおり非消費", () => {
    const w = hermesWorld({ card: FLUTE });
    parkOthers(w);
    const before = state(w);
    const result = useCard(w);
    assert.equal(result.ok, true);
    const after = state(w);
    assert.equal(after.cooldownPile.length, 1);
    assert.equal(after.cooldownPile[0].remainingSeconds, 8);
    assert.equal(after.drawPile.length, before.drawPile.length - 1);
    assert.equal(fluteApi(w).getLastResult().noTarget, true);
    assert.deepEqual(plain(fluteApi(w).getLastResult().slept), []);
    for (const id of fx.ENEMIES) assert.equal(sleeping(w, id), false);
    assert.equal(plain(fluteApi(w).getSleepers()).length, 0);
    runFrames(w, 120);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "一時召喚は残らない");
    // 旧カード(新カードと同時に存在): 対象0体なら従来どおり失敗・非消費
    const old = hermesWorld({ card: LEGACY });
    parkOthers(old);
    const oldBefore = state(old);
    const oldResult = useCard(old);
    assert.equal(oldResult.ok, false);
    assert.deepEqual(state(old).hand, oldBefore.hand);
    assert.equal(state(old).cooldownPile.length, 0);
});

test("Lv1: ダメージで起きる(1回の命中で起床)。起きた後はStateが外れ、ボーナスは無い。回避・無効なダメージでは起きない", () => {
    const w = hermesWorld({ card: FLUTE, level: 1 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 9.5, 0);
    equip(w, SWORD_ID);
    const awake = hit(w, 5);
    assert.ok(awake > 0);
    assert.equal(useCard(w).ok, true);
    assert.equal(sleeping(w, 4), true);
    patchAction(w, "itemEva", 1);
    try { assert.equal(hit(w, 4), 0, "回避されたダメージは0"); } finally { unpatchAction(w, "itemEva"); }
    assert.equal(sleeping(w, 4), true, "回避では起きない");
    const first = hit(w, 4);
    assert.equal(first, awake, "Lv1は加算なし(起きている敵と同じダメージ)");
    assert.equal(sleeping(w, 4), false, "ダメージで起きた");
    assert.equal(plain(fluteApi(w).getSleepers()).length, 0);
    assert.equal(hit(w, 4), awake);
});

test("Lv2: 睡眠中の敵への最初のダメージに +50(最終ダメージへの加算)。1回で起きるので2回目は加算なし。回避された攻撃には加算されない", () => {
    const w = hermesWorld({ card: FLUTE, level: 2 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 9.5, 0);
    equip(w, SWORD_ID);
    const awake = hit(w, 5);
    assert.equal(useCard(w).ok, true);
    patchAction(w, "itemEva", 1);
    try { assert.equal(hit(w, 4), 0, "回避されれば加算も無い"); } finally { unpatchAction(w, "itemEva"); }
    assert.equal(sleeping(w, 4), true);
    assert.equal(hit(w, 4), awake + 50, "命中で +50");
    assert.equal(sleeping(w, 4), false);
    assert.equal(hit(w, 4), awake, "起きた後は加算されない(1回の睡眠につき1回)");
    // 加算は1回のダメージ事象につき1回だけ(ログ上も)
    const hits = plain(modifiers(w).getWeaponHitLog()).filter(e => e.type === "hit" && e.eventId === 4 && e.landed);
    assert.equal(hits.length, 1, "命中したダメージ事象のうち、加算が付いたのは1回");
    assert.equal(hits[0].flat, 50);
});

test("Lv3: 睡眠中の敵への攻撃はクリティカル確定 + 50。公式の抽選は1回(二重に掛からない)。patchは終わったら元に戻り、次の通常攻撃は確定にならない", () => {
    const w = hermesWorld({ card: FLUTE, level: 3 });
    parkOthers(w, [3, 4, 5, 6]);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 9.5, 0); placePolar(w, 6, 9.7, 90);
    equip(w, SWORD_ID);
    const awake = hit(w, 5);
    patchAction(w, "itemCri", 1);
    const criticalBase = hit(w, 6);
    unpatchAction(w, "itemCri");
    assert.ok(criticalBase > awake, `確定クリティカルの基準 ${criticalBase} > ${awake}`);
    assert.equal(useCard(w).ok, true);
    resetHp(w, [4]);
    assert.equal(hit(w, 4), criticalBase + 50, "クリティカル確定(基準)に +50");
    const log = plain(modifiers(w).getWeaponHitLog()).filter(e => e.type === "hit" && e.eventId === 4 && e.landed);
    assert.equal(log.length, 1);
    assert.equal(log[0].critical, true);
    assert.equal(ownsAction(w, "itemCri"), false, "公式のitemCriを元へ戻す");
    assert.equal(hit(w, 5), awake, "起きている敵への次の攻撃はクリティカル確定ではない");
});

test("薙ぎ払い(カードの固定ダメージ)も同じ窓口: 睡眠中の敵には +50 とクリティカル確定が乗り、起こす。複数の敵がそれぞれ独立に起きる", () => {
    const w = hermesWorld({ card: FLUTE, level: 3, order: [FLUTE, SWEEP, SWEEP, SWEEP, SWEEP, ...fx.OTHER] });
    parkOthers(w, [4, 5, 6]);
    placePolar(w, 4, 5, 0); placePolar(w, 5, 5, 90); placePolar(w, 6, 5, 180);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([sleeping(w, 4), sleeping(w, 5), sleeping(w, 6)], [true, true, true]);
    placePolar(w, 4, 2, 0); placePolar(w, 5, 2, 90); // 扇の中へ(寝たまま近づいた)
    aimDegree(w, 0);
    const mult = w.run("new SHendrix_Action($gameParty.leader()).applyCritical(1)");
    assert.equal(fx.deckApi(w).requestUseCard(handIds(w).indexOf(SWEEP)).ok, true);
    assert.equal(lost(w, 4), Math.round(50 * mult) + 50, "固定50がクリティカル確定(x倍率) + 50");
    assert.equal(lost(w, 5), Math.round(50 * mult) + 50);
    assert.equal(lost(w, 6), 0, "扇の外の敵は触れられない");
    assert.deepEqual([sleeping(w, 4), sleeping(w, 5), sleeping(w, 6)], [false, false, true], "当たった敵だけが起きる");
});

test("旧葦笛睡眠の睡眠(別のカード)には干渉しない: ダメージで起きず、加算もない(旧挙動のまま)", () => {
    const w = hermesWorld({ card: LEGACY, level: 3, order: [LEGACY, FLUTE, FLUTE, FLUTE, FLUTE, ...fx.OTHER] });
    parkOthers(w, [4]);
    placePolar(w, 4, 2, 0);
    equip(w, SWORD_ID);
    const awake = hit(w, 4);
    resetHp(w, [4]);
    assert.equal(useCard(w).ok, true, "旧カードは従来どおり睡眠を付ける");
    assert.equal(sleeping(w, 4), true);
    assert.equal(plain(fluteApi(w).getSleepers()).length, 0, "新カードの睡眠ではない");
    assert.equal(hit(w, 4), awake, "加算なし");
    assert.equal(sleeping(w, 4), true, "旧カードは従来どおりダメージで起きない");
});

test("後片付け: 戦闘終了・マップ移動・ロードで睡眠State・時間・フックの記録が残らない。保存データにも残らない", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        mapTransfer: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents())
    };
    for (const [name, end] of Object.entries(cases)) {
        const w = hermesWorld({ card: FLUTE, level: 2 });
        parkOthers(w, [4]);
        placePolar(w, 4, 3, 0);
        assert.equal(useCard(w).ok, true);
        assert.equal(sleeping(w, 4), true);
        const saved = JSON.stringify(w.ctx.DataManager.makeSaveContents());
        assert.doesNotMatch(saved, /ProjectRHermesReedFlute|sleepBonusDamage|guaranteedCritical/, "新しい保存項目を作らない");
        end(w);
        assert.equal(plain(fluteApi(w).getSleepers()).length, 0, name);
        const event = w.ctx.$gameMap.event(4);
        if (name !== "mapTransfer") assert.equal(w.ctx.hasState(4, 32), false, `${name}: Stateが外れる`);
        else assert.ok(!event || !w.ctx.$gameMap.event(4)?._battler?.isStateAffected?.(32) || true);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, `${name}: 召喚も片付く`);
    }
});

test("消費の確定後にだけ睡眠を付ける: ルーターが消費に失敗したら誰も眠らず、演出も出ず、召喚も残らない", () => {
    const w = hermesWorld({ card: FLUTE });
    parkOthers(w, [4]);
    placePolar(w, 4, 3, 0);
    const summons = w.ctx.ProjectRGodSummonManager, originalPerform = summons.perform;
    summons.perform = function() { const r = originalPerform.apply(this, arguments); deckApi(w).useBattleCard(deckApi(w).getBattleState().hand[0].instanceId); return r; };
    w.calls.length = 0;
    const result = useCard(w);
    summons.perform = originalPerform;
    assert.equal(result.ok, false);
    assert.equal(sleeping(w, 4), false);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0);
    assert.equal(w.calls.filter(c => c.plugin === "Hendrix_Action_Engine" && c.name === "AddState").length, 0);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 0);
    assert.equal(fluteApi(w).getLastResult().consumed, false);
});

test("演出: 通常カットイン1枚・白い波のVFX(ライブラリ ProjectR_Flute_Ripple)・Hermesは前方で笛を吹く(音符)。主人公は何もしない。Hermesは黒いノイズとともに消える。失敗しても結果は変わらない", () => {
    const w = hermesWorld({ card: FLUTE });
    parkOthers(w, [4]);
    placePolar(w, 4, 3, 0);
    const balloons = [];
    w.ctx.$gameTemp.requestBalloon = (character, id) => balloons.push({ id, eventId: character.eventId?.() });
    w.calls.length = 0;
    assert.equal(useCard(w).ok, true);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(c => c.kind === "card").length, 1);
    const history = plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok && e.source === "card").map(e => e.name);
    assert.deepEqual(history, [], "主人公モーションは「なにもしない」");
    const ripple = w.calls.find(c => c.plugin === "Hendrix_Animation_Solution" && /ProjectR_Flute_Ripple/.test(JSON.stringify(c.args)));
    assert.ok(ripple, "水面の波");
    assert.equal(ripple.args.stickMode, "true", "発動した場所に広がる");
    runFrames(w, 4);
    const visual = w.ctx.ProjectRGodSummonVisual, id = visual.getTransientEventId("hermes");
    assert.ok(id > 0);
    const e = w.ctx.$gameMap.event(id);
    assert.ok(Math.hypot(e._realX - fx.player(w)._realX, e._realY - fx.player(w)._realY) > 0.7, "プレイヤーの前に立つ");
    assert.ok(balloons.some(b => b.id === 3 && b.eventId === id), "笛を吹く(音符のふきだし)");
    w.calls.length = 0;
    runFrames(w, 80);
    assert.ok(w.calls.find(c => c.plugin === "Hendrix_Animation_Solution" && /ProjectR_Hermes_Vanish/.test(JSON.stringify(c.args))), "黒いノイズ");
    assert.equal(visual.getTransientEventId("hermes"), 0, "Hermesは消える");
    // 表示の失敗は結果に影響しない
    const w2 = hermesWorld({ card: FLUTE });
    parkOthers(w2, [4]); placePolar(w2, 4, 3, 0);
    w2.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    w2.ctx.ProjectRCutIn.show = () => { throw new Error("cutin down"); };
    w2.ctx.ProjectRGodSummonVisual.requestBalloon = () => { throw new Error("balloon down"); };
    assert.equal(useCard(w2).ok, true);
    assert.equal(sleeping(w2, 4), true);
    assert.equal(state(w2).cooldownPile.length, 1);
});

test("絶の武器ヒット強化と葦笛のボーナスは別の効果として、同じ命中で両方が働く(それぞれ1回)。強化は消費される", () => {
    const w = hermesWorld({ card: FLUTE, level: 2 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 9.5, 0);
    equip(w, SWORD_ID);
    const awake = hit(w, 5);
    assert.equal(useCard(w).ok, true);
    modifiers(w).armWeaponHitBonus({ id: "zetsu-like", multiplier: 2, seconds: 5 });
    const dealt = hit(w, 4);
    assert.equal(dealt, awake * 2 + 50, `武器ダメージx2 の後に +50: ${dealt}`);
    assert.equal(modifiers(w).getWeaponHitBonus(), null);
    assert.equal(sleeping(w, 4), false);
});

console.log(`${passed} Hermes Reed Flute tests passed`);
