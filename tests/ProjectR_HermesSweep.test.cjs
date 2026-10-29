"use strict";
// Phase H2B-1: Hermes「薙ぎ払い」(設計ID 5 / hermes_sweep)。実エンジン(実Map004 + 全plugin)。MZ実機の見た目は対象外(実機は tools/mz_cdp/h2b1_verify.cjs)。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, SWEEP, deckApi, modifiers, state, center, placePolar, placeEnemy, parkOthers, aimDegree, lost, resetHp, useCard,
    countCommands, runFrames, player, setRegion, addWallEvent, equip, SWORD_ID, weaponHit, hpOf } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const sweepApi = w => w.ctx.ProjectRHermesSweep;
const randomIs = (w, value) => w.run(`globalThis.__random = globalThis.__random || Math.random; Math.random = () => ${value};`);
const randomRestore = w => w.run("Math.random = globalThis.__random || Math.random;");
const tinyAt = (c, r, degree) => { const p = { x: c.x + Math.sin(degree * Math.PI / 180) * r, y: c.y - Math.cos(degree * Math.PI / 180) * r }; const e = 0.01;
    return [{ x: p.x - e, y: p.y - e }, { x: p.x + e, y: p.y - e }, { x: p.x + e, y: p.y + e }, { x: p.x - e, y: p.y + e }]; };

test("登録: 通常 / 最大3枚 / 最大Lv3 / Cooldown 0.5秒 / Direction。旧Hermes剣術は変わらず共存。設計ID5 ↔ hermes_sweep", () => {
    const w = hermesWorld({ card: SWEEP });
    const def = deckApi(w).definitions.card(SWEEP);
    assert.deepEqual(plain(def), { cardId: SWEEP, ringId: "hermes", maxCopies: 3, cooldownSeconds: 0.5, maxLevel: 3, rarity: "normal", category: "attack", targetType: "direction" });
    assert.equal(Object.isFrozen(def), true);
    const legacy = deckApi(w).definitions.card("hermes_sword_attack");
    assert.deepEqual([legacy.maxCopies, legacy.cooldownSeconds, legacy.rarity, legacy.targetType], [3, 3, "normal", "direction"], "旧カードは不変");
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.designId === 5);
    assert.deepEqual([design.runtimeCardId, design.implemented, design.legacyCandidates], [SWEEP, true, ["hermes_sword_attack"]]);
    // 既定は未所持(本番の所持データに影響しない)
    const fresh = require("./RealEngineHarness.cjs").buildWorld();
    fresh.enterMap(4, 12, 25);
    assert.equal(deckApi(fresh).isCardOwned(SWEEP), false);
});

test("累積レベル: Lv1 50ダメージ → Lv2 先端+50を足す → Lv3 クリティカル率+50%を足す(同じ効果の数値は置換)", () => {
    const w = hermesWorld({ card: SWEEP });
    assert.deepEqual(plain(sweepApi(w).effectsForLevel(1)), { damage: 50 });
    assert.deepEqual(plain(sweepApi(w).effectsForLevel(2)), { damage: 50, tipBonus: 50 });
    assert.deepEqual(plain(sweepApi(w).effectsForLevel(3)), { damage: 50, tipBonus: 50, criticalChanceBonus: 0.5 });
    assert.equal(sweepApi(w).ARC_DEGREES, 190);
    assert.equal(sweepApi(w).RADIUS_TILES, 4);
});

test("扇の境界(実際の幾何): 中心角190度・半径4マス。95度の内外・半径4の内外・先端1マス(半径3)の内外を細かい矩形で判定", () => {
    const w = hermesWorld({ card: SWEEP });
    const c = center(w), touches = (r, deg, aim = 0) => sweepApi(w).geometry.touches(c, aim, tinyAt(c, r, deg), true);
    for (const deg of [0, 45, -45, 90, -90, 94, -94]) assert.equal(touches(3.5, deg).hit, true, `${deg}度は扇の中`);
    for (const deg of [96, -96, 120, 180]) assert.equal(touches(3.5, deg).hit, false, `${deg}度は扇の外`);
    assert.equal(touches(3.97, 0).hit, true, "半径4の内側");
    assert.equal(touches(4.03, 0).hit, false, "半径4の外側");
    assert.equal(touches(3.03, 0).tip, true, "先端1マス(半径3以上)");
    assert.equal(touches(2.97, 0).tip, false, "先端の手前");
    assert.equal(touches(2.97, 0).hit, true, "手前でも扇の中には当たる");
    // 向きを変えても同じ形(4方向の近似ではない)
    assert.equal(touches(3.5, 22.5 + 94, 22.5).hit, true);
    assert.equal(touches(3.5, 22.5 + 96, 22.5).hit, false);
    assert.equal(touches(3.5, 180 + 22.5, 22.5).hit, false, "真後ろは外");
    // 中心(プレイヤー自身の位置)を含む矩形は扇に含まれる。真後ろのすぐ後ろの小さな矩形は外
    assert.equal(touches(0, 0).hit, true);
    assert.equal(touches(0.1, 180).hit, false);
});

test("Lv1: 扇の中の複数の敵(別々のEvent ID)に50ダメージを1回ずつ。扇の外(後ろ・遠い)には当たらない", () => {
    const w = hermesWorld({ card: SWEEP });
    const arrangements = [
        { 4: [3, 0], 5: [3, 80], 6: [3, -80], 3: [3, 180] },
        { 6: [3, 0], 3: [2, 90], 4: [3.5, -90], 5: [5, 0] } // Event IDの役割を入れ替え。5は遠すぎる(半径4の外)
    ];
    for (const arrangement of arrangements) {
        parkOthers(w); resetHp(w);
        for (const [id, [r, deg]] of Object.entries(arrangement)) placePolar(w, Number(id), r, deg);
        aimDegree(w, 0);
        w.calls.length = 0;
        const result = useCard(w, 0);
        assert.equal(result.ok, true, JSON.stringify(result));
        for (const [id, [r, deg]] of Object.entries(arrangement)) {
            const inside = r <= 3.6 && Math.abs(((deg + 180) % 360 + 360) % 360 - 180) <= 90;
            assert.equal(lost(w, Number(id)), inside ? 50 : 0, `Event ${id} (r=${r}, ${deg}度)`);
        }
        const updates = countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp");
        assert.equal(updates.length, Object.values(arrangement).filter(([r, deg]) => r <= 3.6 && Math.abs(deg) <= 90).length, "各敵への適用は1回ずつ");
        assert.equal(new Set(updates.map(u => u.args.eventId)).size, updates.length, "同じ敵に2回当てない");
    }
});

test("マウス角の固定: 4方向以外(斜め・22.5度)にも当たり、向きを変えれば当たる敵が変わる。結果に角度が残る", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3, 45); placePolar(w, 5, 3, 225);
    aimDegree(w, 45);
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [50, 0]);
    assert.equal(sweepApi(w).getLastResult().degree, 45);
    resetHp(w);
    aimDegree(w, 225);
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [0, 50]);
    assert.ok(Math.abs(sweepApi(w).getLastResult().degree - 225) < 1e-6);
    // 発動後にマウスを動かしても、すでに決まった結果は変わらない(命中は発動の瞬間のスナップショット)
    resetHp(w);
    aimDegree(w, 45);
    assert.equal(useCard(w, 0).ok, true);
    aimDegree(w, 225); runFrames(w, 5);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [50, 0], "後から動かしても追加の命中はない");
    // 22.5度を向いたとき、112.5度(+90度)の敵は扇の端の内側
    resetHp(w); placePolar(w, 4, 3, 112.5); placePolar(w, 5, 3, 22.5 + 130);
    aimDegree(w, 22.5);
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [50, 0]);
});

test("壁: Region 255(VisionWall)と<CombatWall>のEventの向こうの敵には当たらない。手前の敵・壁が無ければ当たる", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4, 5]);
    const c = center(w), wallY = Math.floor(c.y) - 2; // 真上2マス先の行
    placePolar(w, 4, 3.4, 0); placePolar(w, 5, 1.2, 0);
    aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [50, 50], "壁が無ければどちらも当たる");
    resetHp(w);
    for (let x = Math.floor(c.x) - 3; x <= Math.floor(c.x) + 3; x++) setRegion(w, x, wallY, 255);
    assert.equal(useCard(w, 1).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [0, 50], "Region 255の向こうは当たらない・手前は当たる");
    for (let x = Math.floor(c.x) - 3; x <= Math.floor(c.x) + 3; x++) setRegion(w, x, wallY, 0);
    resetHp(w);
    for (let x = Math.floor(c.x) - 3; x <= Math.floor(c.x) + 3; x++) addWallEvent(w, "CombatWall", x, wallY);
    assert.equal(useCard(w, 2).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [0, 50], "<CombatWall>の向こうは当たらない");
});

test("有効な発動で敵に当たらなくてもカードは消費される(Cooldown・補充)。無効な発動(マウスがプレイヤーの位置)は非消費", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w);
    const before = state(w);
    aimDegree(w, 0);
    const result = useCard(w, 0);
    assert.equal(result.ok, true);
    const after = state(w);
    assert.equal(after.cooldownPile.length, 1, "Cooldownに入る");
    assert.equal(after.cooldownPile[0].remainingSeconds, 0.5);
    assert.equal(after.drawPile.length, before.drawPile.length - 1, "補充される");
    assert.equal(sweepApi(w).getLastResult().targets, 0);
    assert.equal(sweepApi(w).getLastResult().consumed, true);
    for (const id of [3, 4, 5, 6]) assert.equal(lost(w, id), 0);
    // 無効: マウスがプレイヤーの足元と同じ(方向が決まらない)
    const mid = state(w);
    fx.aim(w, 0, 0);
    const invalid = useCard(w, 1);
    assert.equal(invalid.ok, false);
    assert.deepEqual(state(w).hand, mid.hand, "手札は変わらない");
    assert.equal(state(w).cooldownPile.length, 1, "Cooldownにも入らない");
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 1, "失敗した発動の召喚は残らない(先の1回分だけ)");
    assert.equal(sweepApi(w).getLastResult().consumed, true, "診断は直近の有効な結果のまま");
});

test("Lv2: 先端1マスに体が触れた敵だけ +50(合計100)。先端に届かない敵は50のまま。Lv1では先端でも50", () => {
    const w = hermesWorld({ card: SWEEP, level: 2 });
    parkOthers(w, [4, 5, 6]);
    placePolar(w, 4, 3.5, 0); placePolar(w, 5, 2.0, 30); placePolar(w, 6, 3.6, 60);
    aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5), lost(w, 6)], [100, 50, 100]);
    const hits = plain(sweepApi(w).getLastResult().hits);
    assert.deepEqual(hits.map(h => [h.eventId, h.tip, h.tipBonus]), [[4, true, 50], [5, false, 0], [6, true, 50]]);
    // 体が先端に「触れる」だけで足りる(中心は半径2.6でも、体の端が半径3に届けば先端)
    resetHp(w); placePolar(w, 5, 2.6, 0);
    assert.equal(useCard(w, 1).ok, true);
    assert.equal(lost(w, 5), 100);
    resetHp(w); placePolar(w, 5, 2.4, 0);
    assert.equal(useCard(w, 2).ok, true);
    assert.equal(lost(w, 5), 50, "体の端が半径3に届かない");
    // Lv1
    fx.deckApi(w).setCardLevel(SWEEP, 1);
    resetHp(w); placePolar(w, 4, 3.5, 0);
    assert.equal(useCard(w, 3).ok, true);
    assert.equal(lost(w, 4), 50, "Lv1に先端ボーナスは無い");
});

test("Lv3: クリティカル発生率が +50%(加算)。自然な率 n に対し、乱数 < n+0.5 でクリティカル(倍率は公式のcritDmgMultiplier)。Lv2先端+50は後から加算", () => {
    const w = hermesWorld({ card: SWEEP, level: 3 });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3.5, 0); placePolar(w, 5, 1.5, 20);
    const natural = modifiers(w).naturalCriticalChance(4);
    const mult = w.run("new SHendrix_Action($gameParty.leader()).applyCritical(1)");
    assert.ok(mult > 1, `公式のクリティカル倍率 ${mult}`);
    aimDegree(w, 0);
    const cases = [[0.0, true], [natural + 0.499, true], [natural + 0.5, false], [0.999, false]];
    let slot = 0;
    for (const [value, crit] of cases) {
        resetHp(w);
        randomIs(w, value);
        try { assert.equal(useCard(w, slot++).ok, true); } finally { randomRestore(w); }
        // 先端(4)は 基礎50 → クリティカルなら50*mult、さらに先端+50(クリティカル後に加算)。先端でない(5)は 50 または 50*mult
        assert.equal(lost(w, 4), (crit ? Math.round(50 * mult) : 50) + 50, `乱数${value}: 先端`);
        assert.equal(lost(w, 5), crit ? Math.round(50 * mult) : 50, `乱数${value}: 先端以外`);
    }
    // Lv2では乱数 0.0 でもクリティカルにならない(自然な率が0なら)
    if (natural === 0) {
        fx.deckApi(w).setCardLevel(SWEEP, 2);
        resetHp(w); randomIs(w, 0.0);
        try { assert.equal(useCard(w, slot++).ok, true); } finally { randomRestore(w); }
        assert.equal(lost(w, 5), 50, "Lv2はクリティカルしない");
    }
});

test("絶の強化は薙ぎ払い(固定ダメージ)に乗らず、消費もされない。通常の剣の命中は従来どおり強化を消費する", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 1.3, 180);
    modifiers(w).armWeaponHitBonus({ id: "test", multiplier: 3, seconds: 5 });
    aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(lost(w, 4), 50, "固定の50のまま(x3にならない)");
    assert.equal(modifiers(w).getWeaponHitBonus().multiplier, 3, "強化は消費されない");
    equip(w, SWORD_ID);
    const dealt = weaponHit(w, 5);
    assert.ok(dealt > 0);
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "剣の命中で消費");
    void hpOf;
});

test("演出: 通常カットイン1枚・腕を振り払う動作(ArmSweep)・杖の残像VFX(扇の向きへ回転)・Hermesは前方に現れ、黒いノイズとともに消える。主人公・Hermesの表示は後で片付く", () => {
    const w = hermesWorld({ card: SWEEP, level: 1 });
    parkOthers(w);
    aimDegree(w, 90, 3);
    w.calls.length = 0;
    const result = useCard(w, 0);
    assert.equal(result.ok, true);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(c => c.kind === "card").length, 1, "通常カットインは1枚");
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive())[0].godId, "hermes");
    const history = plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok).map(e => e.name);
    assert.ok(history.includes("ArmSweep"), "腕を前に振り払う動作");
    const vfx = w.calls.filter(c => c.plugin === "Hendrix_Animation_Solution");
    const staff = vfx.find(c => /hermes_sweep\.staff/.test(JSON.stringify(c.args)));
    assert.ok(staff, "杖の残像のVFXが出る");
    assert.equal(JSON.parse(staff.args.transformSettings).rotation, "90", "発動時のマウス方向(右=90度)へ回して再生");
    assert.equal(JSON.parse(staff.args.spritesheetSettings).spritesheetFile, "Animation/ProjectR_Sweep_Staff");
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().filter(s => s.cardId === SWEEP).length, 1, "Hermesが現れる");
    runFrames(w, 4);
    const visual = w.ctx.ProjectRGodSummonVisual, id = visual.getTransientEventId("hermes");
    assert.ok(id > 0, "Hermesの表示Event");
    const e = w.ctx.$gameMap.event(id);
    assert.ok(e._realX - player(w)._realX > 0.7 && Math.abs(e._realY - player(w)._realY) < 0.6, `前方(右)に立つ x:${e._realX - player(w)._realX} y:${e._realY - player(w)._realY}`);
    // 黒いノイズ: 表示が終わる少し前にHermesの位置へ重なり、その後にHermesが消える
    w.calls.length = 0;
    runFrames(w, 80);
    const vanish = w.calls.find(c => c.plugin === "Hendrix_Animation_Solution" && /ProjectR_Hermes_Vanish/.test(JSON.stringify(c.args)));
    assert.ok(vanish, "消失のノイズ");
    assert.equal(String(vanish.args.eventId), String(id), "Hermesの表示Eventに重ねる");
    assert.equal(visual.getTransientEventId("hermes"), 0, "最後にHermesは消える");
});

test("演出が失敗しても、消費・ダメージ・Cooldownは変わらない(VFX・カットインが例外を投げても)", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4]);
    placePolar(w, 4, 2, 0);
    w.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    w.ctx.ProjectRCutIn.show = () => { throw new Error("cutin down"); };
    w.ctx.ProjectRGodSummonVisual.swingWeapon = () => { throw new Error("swing down"); };
    aimDegree(w, 0);
    const before = state(w);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(lost(w, 4), 50);
    assert.equal(state(w).cooldownPile.length, 1);
    assert.equal(state(w).drawPile.length, before.drawPile.length - 1);
});

test("ルーターが消費に失敗したときは、ダメージも演出も出ない(召喚も片付く)", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4]);
    placePolar(w, 4, 2, 0);
    const summons = w.ctx.ProjectRGodSummonManager, originalPerform = summons.perform;
    summons.perform = function() { const r = originalPerform.apply(this, arguments); deckApi(w).useBattleCard(deckApi(w).getBattleState().hand[0].instanceId); return r; };
    aimDegree(w, 0);
    w.calls.length = 0;
    const result = useCard(w, 0);
    summons.perform = originalPerform;
    assert.equal(result.ok, false);
    assert.equal(lost(w, 4), 0, "ダメージなし");
    assert.equal(countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").length, 0);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚を片付ける");
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 0);
    assert.equal(sweepApi(w).getLastResult().consumed, false);
});

test("同じ敵に同じ発動でダメージは1回。別の発動(別の手札)は別の発動として当たる。発動数だけ手札が減りCooldownが積まれる", () => {
    const w = hermesWorld({ card: SWEEP });
    parkOthers(w, [4]);
    placePolar(w, 4, 2, 0);
    aimDegree(w, 0);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(lost(w, 4), 50);
    assert.equal(useCard(w, 0).ok, true);
    assert.equal(lost(w, 4), 100, "別の発動だから2回目の50");
    assert.equal(state(w).cooldownPile.length, 2);
});

test("通常の剣・Hermes旧剣術・G17には介入しない(旧カードの定義・handlerはそのまま)", () => {
    const w = hermesWorld({ card: "hermes_sword_attack", level: 1 });
    assert.equal(w.ctx.ProjectRHermesSwordsmanship !== undefined, true);
    parkOthers(w, [4]);
    placePolar(w, 4, 1.3, 0);
    aimDegree(w, 0);
    const result = useCard(w, 0);
    assert.equal(result.ok, true, "旧剣術は従来どおり発動する");
    assert.equal(sweepApi(w).getLastResult(), null, "薙ぎ払いは動かない");
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 1);
    runFrames(w, 3);
    assert.ok(lost(w, 4) > 0, "旧剣術のHitboxが当たる");
});

console.log(`${passed} Hermes Sweep tests passed`);
