"use strict";
// Phase H2B-1: 絶の取引の修復。「実際に移動できると確定してから」カードを消費する。実エンジン(実Map004 + 全plugin)。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, ZETSU, deckApi, zetsuApi, modifiers, state, pos, aim, setRegion, addWallEvent, player, runFrames, equip, SWORD_ID, GUN_ID,
    weaponHit, lost, resetHp, placePolar, parkOthers, near } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const WINDUP = 8;
const world = (options = {}) => hermesWorld({ card: ZETSU, windup: WINDUP, ...options });
const gauge = w => w.ctx.ProjectRUltimateGauge.getUltimateGauge();
const press = (w, index = 0) => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(index)); };
const snapshot = w => { const s = state(w); return { hand: s.hand.map(c => c.instanceId), draw: s.drawPile.map(c => c.instanceId), discard: s.discardPile.map(c => c.instanceId), cooldown: s.cooldownPile.length, gauge: gauge(w) }; };

test("予約は消費ではない: 手札・山札・捨て札・Cooldown・ゲージは変わらず、予備動作(8frame)の間に腕クロス・Hermes・ノイズ・カットインが始まる", () => {
    const w = world();
    const before = snapshot(w), start = pos(w);
    aim(w, 5, 0);
    const result = press(w);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "pending");
    assert.equal(result.pending, true);
    assert.deepEqual(snapshot(w), before, "山・手札・Cooldown・ゲージは何も変わらない");
    assert.equal(zetsuApi(w).isTeleportPending(), true);
    assert.deepEqual(plain(zetsuApi(w).getLastResult()).consumed, false);
    assert.ok(plain(w.ctx.ProjectRCharacterPresentation.history()).some(e => e.ok && e.name === "CrossArms"));
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 1);
    assert.deepEqual(pos(w), start, "まだ動かない");
    runFrames(w, WINDUP - 1);
    assert.deepEqual(snapshot(w), before, "確定の1frame前もまだ未消費");
});

test("確定は1回だけ: 予備動作の後に、着地を再検証してから 消費・Cooldown・補充・ゲージ・移動・強化 が1度ずつ起きる", () => {
    for (const level of [1, 2, 3]) {
        const w = world({ level });
        const before = snapshot(w), start = pos(w);
        aim(w, 5, 0);
        press(w);
        runFrames(w, WINDUP + 4);
        const after = snapshot(w);
        assert.equal(after.cooldown, 1, "Cooldownは1枚");
        assert.equal(after.draw.length, before.draw.length - 1, "補充は1枚");
        assert.equal(after.hand.length, 5);
        assert.ok(after.gauge > before.gauge, "Ultimateゲージはカード使用として1回加算");
        const gain = after.gauge - before.gauge;
        near(pos(w).x, start.x + 5, 0.05, `Lv${level}`);
        assert.equal(modifiers(w).getWeaponHitBonus().multiplier, [1.5, 2.0, 3.0][level - 1]);
        assert.equal(modifiers(w).getMoveSpeedModifiers().length, level === 3 ? 1 : 0);
        assert.equal(zetsuApi(w).getLastResult().consumed, true);
        assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 1, "カットインは予約時の1枚のまま(確定で重ねない)");
        runFrames(w, 120);
        assert.equal(snapshot(w).gauge - before.gauge, gain, "その後もゲージは増えない(二重加算なし)");
        assert.equal(zetsuApi(w).isTeleportPending(), false);
    }
});

test("予備動作中に移動先が使えなくなった(壁が現れた・目的地に着いてしまった)場合: 何も消費せず中止。強化・速度・到着の演出なし", () => {
    const cases = {
        wallAppears: (w, start) => { for (let y = Math.floor(start.y) - 2; y <= Math.floor(start.y) + 2; y++) setRegion(w, Math.floor(start.x) + 1, y, 255); },
        wallEventAppears: (w, start) => { for (let y = Math.floor(start.y) - 2; y <= Math.floor(start.y) + 2; y++) addWallEvent(w, "CombatWall", Math.floor(start.x) + 1, y); },
        walkedToDestination: (w, start) => { player(w).setPosition(start.x + 4.95, start.y); }
    };
    for (const [name, change] of Object.entries(cases)) {
        const w = world({ level: 3 });
        const before = snapshot(w), start = pos(w);
        w.calls.length = 0;
        aim(w, 5, 0);
        press(w);
        change(w, start);
        const mid = pos(w);
        runFrames(w, WINDUP + 4);
        assert.equal(zetsuApi(w).isTeleportPending(), false, name);
        const last = plain(zetsuApi(w).getLastResult());
        assert.equal(last.aborted, true, name);
        assert.equal(last.consumed, false, name);
        assert.deepEqual(snapshot(w), before, `${name}: 手札・山札・Cooldown・ゲージはそのまま`);
        assert.deepEqual(pos(w), mid, `${name}: 動かない`);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, `${name}: 強化なし`);
        assert.equal(modifiers(w).moveSpeedFactor(), 1, `${name}: 速度係数なし`);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, `${name}: 召喚なし`);
        assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 0, `${name}: カットインも片付く`);
        assert.equal(w.ctx.ProjectRCharacterPresentation.isActive("CrossArms"), false, `${name}: 腕クロスも解く`);
        assert.equal(w.calls.filter(c => c.plugin === "Hendrix_Animation_Solution" && /Arrival/.test(JSON.stringify(c.args))).length, 0, `${name}: 到着のノイズなし`);
        // 中止の後は、同じカードをもう一度使える(予約が残らない)
        for (let y = 0; y < w.ctx.$dataMap.height; y++) for (let x = 0; x < w.ctx.$dataMap.width; x++) if (name === "wallAppears") setRegion(w, x, y, 0);
        const again = press(w);
        assert.ok(again.pending || again.ok === false, `${name}: 再度の予約を受け付ける(あるいは壁で拒否)`);
    }
});

test("複数の入力: 同じフレームに何度押しても予約は1つ。2回目以降は「teleportPending」で非消費。確定でちょうど1枚だけ消費", () => {
    const w = world();
    const before = snapshot(w);
    aim(w, 5, 0);
    const results = [press(w, 0), press(w, 0), press(w, 1), press(w, 2)];
    assert.equal(results[0].reason, "pending");
    for (const r of results.slice(1)) { assert.equal(r.ok, false); assert.equal(r.detail, "teleportPending"); }
    assert.deepEqual(snapshot(w), before);
    runFrames(w, WINDUP + 2);
    const after = snapshot(w);
    assert.equal(after.cooldown, 1);
    assert.equal(after.draw.length, before.draw.length - 1);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length <= 1, true, "召喚は1つ");
    assert.equal(modifiers(w).getMoveSpeedModifiers().length, 0);
});

test("予備動作の間も、他のカードは普通に使える(入力ロックなし)。確定の時にそのカードが手札の別の位置にあっても正しい1枚を消費する", () => {
    const w = world({ order: [ZETSU, "hermes_swift_movement", ZETSU, ZETSU, ZETSU, ...fx.OTHER] });
    aim(w, 5, 0);
    assert.equal(press(w, 0).reason, "pending");
    const other = press(w, 1); // 手札1 = 高速移動(別カード)。予約中でも通常どおり消費される
    assert.equal(other.ok, true, JSON.stringify(other));
    assert.equal(other.cardId, "hermes_swift_movement");
    const mid = state(w);
    assert.equal(mid.cooldownPile.length, 1, "高速移動の分だけ");
    runFrames(w, WINDUP + 2);
    const after = state(w);
    assert.equal(after.cooldownPile.length, 2, "絶が確定して2枚目");
    assert.ok(after.cooldownPile.some(e => e.instance.cardId === ZETSU));
    assert.equal(zetsuApi(w).getLastResult().consumed, true);
});

test("中断: 戦闘終了・マップ移動・ロード・死亡・操作不能(メッセージ中)で、予約は消費なしで片付く(後から移動も強化もしない)", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        mapTransfer: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents()),
        death: w => { w.ctx.ProjectR.PlayerDeath.isDead = () => true; },
        messageBusy: w => { w.ctx.$gameMessage.add("busy"); }
    };
    for (const [name, interrupt] of Object.entries(cases)) {
        const w = world({ level: 3 });
        const before = snapshot(w), start = pos(w);
        aim(w, 5, 0);
        press(w);
        assert.equal(zetsuApi(w).isTeleportPending(), true, name);
        interrupt(w);
        runFrames(w, WINDUP + 6);
        assert.equal(zetsuApi(w).isTeleportPending(), false, `${name}: 予約なし`);
        assert.equal(zetsuApi(w).getLastResult().consumed, false, `${name}: 消費なし`);
        assert.deepEqual(pos(w), start, `${name}: 動かない`);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, name);
        assert.equal(modifiers(w).moveSpeedFactor(), 1, name);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, name);
        if (name === "messageBusy" || name === "death") assert.deepEqual(snapshot(w), before, `${name}: 山・手札・Cooldown・ゲージはそのまま`);
    }
});

test("強化のタイミングと消費: 確定(移動)の瞬間から0.8秒。最初の通常の剣/銃の命中で1回だけ消費され、外れ・時間切れでは消費されない。G17と剣の両方", () => {
    for (const weapon of [SWORD_ID, GUN_ID]) {
        const w = world({ level: 2, order: [ZETSU, ZETSU, ZETSU, ZETSU, ZETSU, ...fx.OTHER], bars: [4, 5] });
        equip(w, weapon);
        parkOthers(w, [4, 5]);
        placePolar(w, 4, 6.5, 0); placePolar(w, 5, 7.5, 90);
        aim(w, 4, 0);
        press(w);
        runFrames(w, WINDUP - 1);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, "予備動作の間は強化なし(移動が確定していない)");
        runFrames(w, 2);
        const bonus = modifiers(w).getWeaponHitBonus();
        assert.ok(bonus && bonus.multiplier === 2.0, "移動の瞬間に強化が始まる");
        assert.ok(bonus.remaining > 0.75 && bonus.remaining <= 0.8, `残り ${bonus.remaining}`);
        const base = (() => { const probe = hermesWorld({ card: ZETSU, bars: [4], random: 0.999 }); equip(probe, weapon); parkOthers(probe, [4]); placePolar(probe, 4, 6.5, 0);
            const before = lost(probe, 4); weaponHit(probe, 4); return lost(probe, 4) - before; })();
        assert.ok(base > 0);
        const before4 = lost(w, 4);
        weaponHit(w, 4);
        assert.equal(lost(w, 4) - before4, base * 2, `武器${weapon}: 命中で x2.0`);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, "1回で消費");
        const before5 = lost(w, 5);
        weaponHit(w, 5);
        assert.equal(lost(w, 5) - before5, base, "2回目は強化なし");
    }
    // 時間切れ
    const w = world({ level: 1 });
    aim(w, 5, 0); press(w); runFrames(w, WINDUP + 2);
    assert.ok(modifiers(w).getWeaponHitBonus());
    runFrames(w, 60);
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "0.8秒で消える");
    void resetHp;
});

test("承認済みの値は変わらない: Cooldown 0.5秒・最大5枚・強力・Lv1 x1.5 / Lv2 x2.0 / Lv3 x3.0 + 速度x2.0を1秒", () => {
    const w = world({ level: 3 });
    const def = plain(deckApi(w).definitions.card(ZETSU));
    assert.deepEqual([def.cooldownSeconds, def.maxCopies, def.rarity, def.maxLevel], [0.5, 5, "strong", 3]);
    assert.deepEqual(plain(zetsuApi(w).effectsForLevel(1)), { hitMultiplier: 1.5, hitSeconds: 0.8 });
    assert.deepEqual(plain(zetsuApi(w).effectsForLevel(2)), { hitMultiplier: 2.0, hitSeconds: 0.8 });
    assert.deepEqual(plain(zetsuApi(w).effectsForLevel(3)), { hitMultiplier: 3.0, hitSeconds: 0.8, speedFactor: 2.0, speedSeconds: 1.0 });
    assert.equal(zetsuApi(w).getWindupFrames(), WINDUP);
    aim(w, 5, 0); press(w); runFrames(w, WINDUP + 2);
    assert.equal(snapshot(w).cooldown, 1);
    assert.equal(plain(state(w).cooldownPile)[0].remainingSeconds <= 0.5, true);
});

console.log(`${passed} Hermes Zetsu H2B-1 tests passed`);
