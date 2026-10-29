"use strict";
// Phase H2B-2: Hermes「一閃」(設計ID 1 / hermes_issen)。実エンジン(実Map004 + 全plugin)。MZ実機の見た目・敵の実移動は tools/mz_cdp/h2b2_verify.cjs。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, ISSEN, ZETSU, STRENGTH, deckApi, modifiers, state, placePolar, placeEnemy, parkOthers, aimDegree, lost, resetHp, useCard, runFrames,
    setRegion, player, pos, countCommands, center } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesIssen;
const second = w => { for (let i = 0; i < 60; i++) deckApi(w).updateCooldown(1 / 60); };
const event = (w, id) => w.ctx.$gameMap.event(id);
const speed = (w, id) => modifiers(w).characterSpeedFactor(event(w, id));
const splitsOf = w => plain(api(w).getActiveSplits());
const damageCalls = (w, id) => w.calls.filter(c => c.plugin === "Hendrix_Action_Engine" && c.name === "UpdateEventHp" && String(c.args.eventId) === String(id));

test("登録: 強力 / 最大3枚 / 最大Lv3 / Cooldown 7秒 / Direction。設計ID1 ↔ hermes_issen。累積レベル: 分割 50 → 100(置換)→ 100 + 移動速度-50%", () => {
    const w = hermesWorld({ card: ISSEN });
    assert.deepEqual(plain(deckApi(w).definitions.card(ISSEN)), { cardId: ISSEN, ringId: "hermes", maxCopies: 3, cooldownSeconds: 7, maxLevel: 3, rarity: "strong", category: "attack", targetType: "direction" });
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.designId === 1);
    assert.deepEqual([design.runtimeCardId, design.implemented], [ISSEN, true]);
    assert.deepEqual(plain(api(w).effectsForLevel(1)), { directDamage: 200, splitTotal: 50, splitSeconds: 3 });
    assert.deepEqual(plain(api(w).effectsForLevel(2)), { directDamage: 200, splitTotal: 100, splitSeconds: 3 }, "50を100へ置換(150にしない)");
    assert.deepEqual(plain(api(w).effectsForLevel(3)), { directDamage: 200, splitTotal: 100, splitSeconds: 3, slowFactor: 0.5, slowSeconds: 3 });
    assert.equal(api(w).RANGE_TILES, 11);
    const fresh = require("./RealEngineHarness.cjs").buildWorld(); fresh.enterMap(4, 12, 25);
    assert.equal(deckApi(fresh).isCardOwned(ISSEN), false, "既定は未所持");
});

test("分割ダメージの配分: 合計は必ず保存される(端数は先の回へ)。50→17,17,16 / 100→34,33,33。毎回100ではない", () => {
    const w = hermesWorld({ card: ISSEN });
    assert.deepEqual(plain(api(w).splitSchedule(50, 3)), [17, 17, 16]);
    assert.deepEqual(plain(api(w).splitSchedule(100, 3)), [34, 33, 33]);
    for (const total of [0, 1, 2, 50, 99, 100, 101, 1000]) for (const ticks of [1, 2, 3, 7, 10, 30]) {
        const schedule = plain(api(w).splitSchedule(total, ticks));
        assert.equal(schedule.length, ticks);
        assert.equal(schedule.reduce((a, b) => a + b, 0), total, `${total}/${ticks}`);
        assert.ok(Math.max(...schedule) - Math.min(...schedule) <= 1);
    }
});

test("マウス角の固定・一直線: 発動時の向きの経路上の敵だけに当たる。経路の幅の外・後ろには当たらない。斜めも可", () => {
    const w = hermesWorld({ card: ISSEN });
    parkOthers(w, [4, 5, 6]);
    placePolar(w, 4, 4, 0); placePolar(w, 5, 4, 90); placePolar(w, 6, 4, 180);
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5), lost(w, 6)], [200, 0, 0]);
    assert.equal(api(w).getLastResult().degree, 0);
    resetHp(w);
    aimDegree(w, 90);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5), lost(w, 6)], [0, 200, 0]);
    // 斜め(右上45度): 経路の上の敵に当たり、経路の幅から外れた敵には当たらない
    resetHp(w);
    placePolar(w, 4, 3, 45); placePolar(w, 5, 3, 45 + 30); // 30度ずれ = 横に約1.5マス(経路の半幅0.5 + 斜めの体の半径0.71を超える)
    aimDegree(w, 45);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [200, 0]);
    assert.ok(Math.abs(api(w).getLastResult().degree - 45) < 1e-6);
});

test("射程11マス: 体が11マスの内側に触れれば当たり、外なら当たらない。壁(Region 255)の手前で止まり、向こうの敵には届かない", () => {
    const w = hermesWorld({ card: ISSEN });
    parkOthers(w, [4, 5]);
    placePolar(w, 4, 10.9, 0); placePolar(w, 5, 11.7, 0);
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [200, 0], "10.9マス先は届き、11.7マス先(体の端が11.2)は届かない");
    assert.equal(api(w).getLastResult().length, 11);
    resetHp(w);
    const c = center(w), wallY = Math.floor(c.y) - 6;
    for (let x = Math.floor(c.x) - 2; x <= Math.floor(c.x) + 2; x++) setRegion(w, x, wallY, 255);
    placePolar(w, 4, 3, 0); placePolar(w, 5, 9, 0); // 4は壁の手前、5は壁の向こう
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 4), lost(w, 5)], [200, 0], "壁の向こうには当たらない");
    assert.ok(api(w).getLastResult().length < 6.1, `経路は壁の手前まで ${api(w).getLastResult().length}`);
});

test("直接ダメージ: 防御を無視して固定200・クリティカルなし・1発動1敵1回。複数の敵(別々のEvent ID)に当たる。主人公は動かない", () => {
    const w = hermesWorld({ card: ISSEN, random: 0.0 }); // 乱数0.0 = 自然なクリティカルが出る条件。それでも200のまま
    parkOthers(w, [3, 4, 5]);
    placePolar(w, 3, 2, 0); placePolar(w, 4, 5, 0); placePolar(w, 5, 8, 0);
    const start = pos(w);
    assert.equal(w.run("SgetBattlerForH($gameMap.event(4)).def"), 20, "敵には防御がある");
    aimDegree(w, 0);
    w.calls.length = 0;
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 3), lost(w, 4), lost(w, 5)], [200, 200, 200]);
    for (const id of [3, 4, 5]) assert.equal(damageCalls(w, id).length, 1, `Event ${id}への直接ダメージは1回`);
    assert.deepEqual(pos(w), start, "プレイヤーはテレポートしない");
    assert.deepEqual(plain(api(w).getLastResult().hits).map(h => h.eventId), [3, 4, 5], "手前の敵から順に");
    // Event IDを入れ替えても同じ(固定IDなし)
    resetHp(w); parkOthers(w, [5, 6]);
    placePolar(w, 6, 3, 0); placePolar(w, 5, 6, 0);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual([lost(w, 5), lost(w, 6)], [200, 200]);
});

test("分割ダメージ: Lv1 は3秒で合計50(17/34/50)、Lv2 は合計100(34/67/100)。直接の200とは別。3秒後は止まり、状態が残らない", () => {
    for (const [level, total, marks] of [[1, 50, [17, 34, 50]], [2, 100, [34, 67, 100]]]) {
        const w = hermesWorld({ card: ISSEN, level });
        parkOthers(w, [4]); placePolar(w, 4, 4, 0);
        aimDegree(w, 0);
        assert.equal(useCard(w).ok, true);
        assert.equal(lost(w, 4), 200);
        assert.equal(splitsOf(w).length, 1);
        assert.deepEqual(splitsOf(w)[0].ticks.reduce((a, b) => a + b, 0), total);
        for (let s = 1; s <= 3; s++) { second(w); assert.equal(lost(w, 4), 200 + marks[s - 1], `Lv${level} ${s}秒後`); }
        second(w); second(w);
        assert.equal(lost(w, 4), 200 + total, "3秒より後は増えない(合計が保存される)");
        assert.equal(splitsOf(w).length, 0, "期限で状態が消える");
        assert.equal(speed(w, 4), 1);
    }
});

test("Lv3: 分割100に加えて移動速度-50%を3秒。他の移動係数は保たれ、期限で自分の係数だけが外れて元に戻る。distancePerFrameが実際に半分になる", () => {
    const w = hermesWorld({ card: ISSEN, level: 3 });
    parkOthers(w, [4, 5]); placePolar(w, 4, 4, 0); placePolar(w, 5, 7, 0);
    const e4 = event(w, 4), e5 = event(w, 5);
    const base4 = e4.distancePerFrame(), base5 = e5.distancePerFrame();
    modifiers(w).setCharacterSpeedFactor(e4, "other-effect", 0.8);
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    assert.ok(Math.abs(e4.distancePerFrame() - base4 * 0.8 * 0.5) < 1e-12, "他の係数 x 0.8 と 一閃 x 0.5 の積");
    assert.ok(Math.abs(e5.distancePerFrame() - base5 * 0.5) < 1e-12, "敵5も半分");
    assert.equal(plain(w.ctx.$gamePlayer.distancePerFrame()) > 0, true);
    second(w); second(w);
    assert.ok(Math.abs(e4.distancePerFrame() - base4 * 0.4) < 1e-12, "2秒後もまだ低下");
    second(w);
    assert.ok(Math.abs(e4.distancePerFrame() - base4 * 0.8) < 1e-12, "3秒で一閃の分だけ外れ、他の係数は残る");
    assert.ok(Math.abs(e5.distancePerFrame() - base5) < 1e-12, "敵5は元の速度");
    assert.equal(lost(w, 4), 200 + 100);
    // 実際に動かしたときの移動距離(MZのDotMove移動)も半分になる
    const m1 = hermesWorld({ card: ISSEN, level: 3 }); parkOthers(m1, [4]); placePolar(m1, 4, 4, 0);
    const walk = (w2, id) => { const e = event(w2, id); e.setThrough(true); e.setMoveSpeed(4); const x0 = e._realX; for (let i = 0; i < 20; i++) { e.moveStraight(6); e.update(); } return e._realX - x0; };
    const free = walk(m1, 4);
    const m2 = hermesWorld({ card: ISSEN, level: 3 }); parkOthers(m2, [4]); placePolar(m2, 4, 4, 0);
    aimDegree(m2, 0); assert.equal(useCard(m2).ok, true);
    const slowed = walk(m2, 4);
    assert.ok(free > 0 && Math.abs(slowed / free - 0.5) < 0.1, `実際の移動距離が約半分 ${slowed} / ${free}`);
});

test("再命中は置換(重ならない・合計が増えない): 1秒後に再度当てると残りを捨てて新しい3秒を最初から。速度係数も二重にならない", () => {
    const w = hermesWorld({ card: ISSEN, level: 3 });
    parkOthers(w, [4]); placePolar(w, 4, 4, 0);
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    second(w);
    assert.equal(lost(w, 4), 200 + 34);
    assert.equal(useCard(w).ok, true);
    assert.equal(lost(w, 4), 400 + 34, "直接ダメージは別の発動なのでもう一度200");
    assert.equal(splitsOf(w).length, 1, "分割の予定は1つ(置換)");
    assert.equal(splitsOf(w)[0].elapsed, 0, "最初から");
    assert.ok(Math.abs(speed(w, 4) - 0.5) < 1e-12, "速度係数は0.5のまま(0.25にならない)");
    for (let i = 0; i < 3; i++) second(w);
    assert.equal(lost(w, 4), 400 + 34 + 100, "新しい合計100だけが加わる");
});

test("対象が死ぬ・消える・戦闘が終わる・マップ移動・ロード・主人公の死亡: 残りのダメージは与えず、速度係数も戻る", () => {
    // 分割の途中で死ぬ(直接200で瀕死 → 最初のtickで倒れる)
    const w = hermesWorld({ card: ISSEN, level: 3 });
    parkOthers(w, [4]); placePolar(w, 4, 4, 0);
    const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === event(w, 4));
    bar.currentHp = bar.targetHp = 220; bar.refresh();
    aimDegree(w, 0);
    w.calls.length = 0;
    assert.equal(useCard(w).ok, true);
    assert.equal(bar.currentHp, 20);
    second(w);
    assert.equal(bar.currentHp, 0, "最初のtick(34)で20が0以下になり倒れる");
    void bar;
    const afterDeath = damageCalls(w, 4).length;
    for (let i = 0; i < 3; i++) second(w);
    assert.equal(damageCalls(w, 4).length, afterDeath, "倒れた後はダメージを与えない");
    assert.equal(splitsOf(w).length, 0);
    assert.equal(speed(w, 4), 1);
    // イベントが消える
    const w2 = hermesWorld({ card: ISSEN, level: 3 });
    parkOthers(w2, [4]); placePolar(w2, 4, 4, 0); aimDegree(w2, 0);
    assert.equal(useCard(w2).ok, true);
    event(w2, 4).erase();
    second(w2);
    assert.equal(splitsOf(w2).length, 0, "消えた敵の分割は終わる");
    // 戦闘終了・マップ移動・ロード・死亡
    const cases = {
        battleEnd: x => deckApi(x).endCardBattle(),
        mapTransfer: x => x.ctx.$gameMap.setup(4),
        load: x => x.ctx.DataManager.extractSaveContents(x.ctx.DataManager.makeSaveContents()),
        death: x => { x.ctx.ProjectR.PlayerDeath.isDead = () => true; runFrames(x, 2); }
    };
    for (const [name, end] of Object.entries(cases)) {
        const x = hermesWorld({ card: ISSEN, level: 3 });
        parkOthers(x, [4]); placePolar(x, 4, 4, 0); aimDegree(x, 0);
        assert.equal(useCard(x).ok, true);
        assert.equal(splitsOf(x).length, 1);
        const saved = JSON.stringify(x.ctx.DataManager.makeSaveContents());
        assert.doesNotMatch(saved, /ProjectRHermesIssen|splitTotal|tickAmounts|slowRemaining/, "保存しない");
        const ev = event(x, 4);
        end(x);
        assert.equal(splitsOf(x).length, 0, name);
        assert.equal(modifiers(x).characterSpeedFactor(ev), 1, `${name}: 速度係数が戻る`);
    }
});

test("外れてもカードは消費される(Cooldown 7秒・補充)。無効な発動(マウスがプレイヤーの位置)は非消費。ハンドラは1回、ルーター失敗ではダメージなし", () => {
    const w = hermesWorld({ card: ISSEN });
    parkOthers(w);
    const before = state(w);
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    const after = state(w);
    assert.equal(after.cooldownPile.length, 1);
    assert.equal(after.cooldownPile[0].remainingSeconds, 7);
    assert.equal(after.drawPile.length, before.drawPile.length - 1);
    assert.equal(api(w).getLastResult().targets, 0);
    assert.equal(splitsOf(w).length, 0);
    fx.aim(w, 0, 0);
    const mid = state(w);
    assert.equal(useCard(w).ok, false);
    assert.deepEqual(state(w).hand, mid.hand);
    assert.equal(state(w).cooldownPile.length, 1);
    // ルーターが消費に失敗
    const w2 = hermesWorld({ card: ISSEN });
    parkOthers(w2, [4]); placePolar(w2, 4, 4, 0); aimDegree(w2, 0);
    const summons = w2.ctx.ProjectRGodSummonManager, original = summons.perform;
    summons.perform = function() { const r = original.apply(this, arguments); deckApi(w2).useBattleCard(deckApi(w2).getBattleState().hand[0].instanceId); return r; };
    const failed = useCard(w2);
    summons.perform = original;
    assert.equal(failed.ok, false);
    assert.equal(lost(w2, 4), 0);
    assert.equal(splitsOf(w2).length, 0);
    assert.equal(w2.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0);
});

test("他の強化との関係: 一閃は固定ダメージなので絶の武器強化・ストレングスを消費しない。葦笛の睡眠は直接ダメージで起き、+50が乗る", () => {
    const w = hermesWorld({ card: ISSEN, level: 1, order: [ISSEN, STRENGTH, "hermes_reed_flute", ISSEN, ISSEN, ...fx.OTHER] });
    parkOthers(w, [4]); placePolar(w, 4, 4, 0);
    modifiers(w).armWeaponHitBonus({ id: ZETSU, multiplier: 3, seconds: 5, source: ZETSU });
    assert.equal(plain(deckApi(w).requestUseCard(1)).ok, true); // ストレングス
    aimDegree(w, 0);
    assert.equal(useCard(w).ok, true);
    assert.equal(lost(w, 4), 200, "x3にもストレングスにもならない");
    assert.ok(modifiers(w).getWeaponHitBonus(), "絶の強化は消費されない");
    assert.equal(w.ctx.ProjectRHermesStrength.getPending().stacks, 1, "ストレングスも消費されない");
});

test("演出: 通常カットイン・腕を振り払う動作・白と黒のVFX(経路の向き・長さに合わせて)・Hermesが前方へ駆ける(表示だけ)・黒いノイズで消える。孤立したHitbox・VFX・Eventが残らない", () => {
    const w = hermesWorld({ card: ISSEN });
    parkOthers(w);
    const eventsBefore = w.ctx.$gameMap.events().filter(Boolean).length;
    aimDegree(w, 90);
    w.calls.length = 0;
    assert.equal(useCard(w).ok, true);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(c => c.kind === "card").length, 1);
    assert.ok(plain(w.ctx.ProjectRCharacterPresentation.history()).some(e => e.ok && e.name === "ArmSweep"));
    const vfx = w.calls.filter(c => c.plugin === "Hendrix_Animation_Solution");
    const trail = vfx.find(c => /hermes_issen\.trail/.test(JSON.stringify(c.args))), lightning = vfx.find(c => /hermes_issen\.lightning/.test(JSON.stringify(c.args)));
    assert.ok(trail && lightning, "軌跡と雷");
    assert.equal(JSON.parse(trail.args.transformSettings).rotation, "90", "経路の向き(右)へ回す");
    const pos0 = JSON.parse(trail.args.positionSettings);
    assert.ok(Math.abs(Number(pos0.offsetX) - 5.5 * 48) < 1.5 && Math.abs(Number(pos0.offsetY) - -24) < 1.5, `経路の中央(5.5マス先) ${pos0.offsetX},${pos0.offsetY}`);
    runFrames(w, 3);
    const id = w.ctx.ProjectRGodSummonVisual.getTransientEventId("hermes"), e = w.ctx.$gameMap.event(id);
    const x1 = e._realX;
    runFrames(w, 6);
    assert.ok(e._realX > x1 + 3, `Hermesが前方へ駆ける(表示) ${x1} → ${e._realX}`);
    assert.ok(Math.abs(player(w)._realX - pos(w).x) < 1e-9);
    w.calls.length = 0;
    runFrames(w, 90);
    assert.ok(w.calls.some(c => c.plugin === "Hendrix_Animation_Solution" && /ProjectR_Hermes_Vanish/.test(JSON.stringify(c.args))), "黒いノイズ");
    assert.equal(w.ctx.ProjectRGodSummonVisual.getTransientEventId("hermes"), 0);
    assert.equal(w.ctx.$gameMap.events().filter(Boolean).length, eventsBefore, "Event(Hitbox・VFX用)が増えたままにならない");
    // 失敗しても結果は変わらない
    const w2 = hermesWorld({ card: ISSEN });
    parkOthers(w2, [4]); placePolar(w2, 4, 4, 0);
    w2.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    w2.ctx.ProjectRGodSummonVisual.dash = () => { throw new Error("dash down"); };
    aimDegree(w2, 0);
    assert.equal(useCard(w2).ok, true);
    assert.equal(lost(w2, 4), 200);
    assert.equal(splitsOf(w2).length, 1);
});

console.log(`${passed} Hermes Issen tests passed`);
void countCommands; void placeEnemy; void resetHp;
