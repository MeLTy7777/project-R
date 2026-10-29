"use strict";
// Phase H2A: 通常の剣(ProjectR_SwordSystem)。従来は共通イベント1/4が衝突・ダメージの対象を「Event 1」に固定していたため、
// 敵に当たらなかった。実エンジン(実Map004 + 全plugin)で、攻撃入力(共通イベント1の予約)から通して確認する。MZ実機・描画は対象外。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { plain, read, zetsuWorld, aim, deckApi, zetsuApi, modifiers, player, pos, press, lastCard, attachHpBars, hpOf, equip, ZETSU, GUN_ID, SWORD_ID } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const ENEMIES = [2, 3, 4, 5, 6];
const SHORT_SWORD = 1;

// 敵(<enemy>のEvent)に公式のHPバーを付けた世界。剣を装備し、プレイヤーは (px,py) に立つ。
function swordWorld({ px = 11, py = 12, weapon = SWORD_ID, level = 1, order } = {}) {
    const w = zetsuWorld({ level, x: px, y: py, order });
    attachHpBars(w, ENEMIES, 100000);
    equip(w, weapon);
    w.run("globalThis.__random = Math.random; Math.random = () => 0.5;"); // 命中/会心/分散を固定
    w.frames(2);
    return w;
}
const sword = w => w.ctx.ProjectRSwordSystem;
const ev = (w, id) => w.ctx.$gameMap.event(id);
const hpAll = w => Object.fromEntries([1, ...ENEMIES].map(id => [id, hpOf(w, id)]));
const dropped = (before, after) => Object.keys(after).filter(id => after[id] < before[id]).map(Number);
// 攻撃入力(Hendrixがするのと同じ: 共通イベント1を予約)。
const attack = w => { w.ctx.$gameTemp.reserveCommonEvent(1); w.frames(6); };
const pointAt = (w, x, y) => w.mouse(player(w).screenX() + x * 48, player(w).screenY() + y * 48 - 24);
const centerOn = w => player(w).center(player(w)._realX, player(w)._realY);

test("原因: 従来のCE1/CE4は衝突とダメージの対象にEvent 1を直接書いている(データは変更しない)", () => {
    const ce = JSON.parse(read("data/CommonEvents.json"));
    for (const id of [1, 4]) {
        const text = JSON.stringify(ce[id].list);
        assert.match(text, /checkCollide\(1, '<playerAttack>'/, `CE${id}: 衝突判定がEvent 1固定`);
        assert.match(text, /"eventId":"1","value":"-player weapon"/, `CE${id}: ダメージがEvent 1固定`);
    }
    // Map004のEvent 1は敵ではない(DEV Impassable Event)。だから敵に当たらなかった。
    const w = swordWorld();
    assert.equal(/<enemy>/.test(ev(w, 1).event().note), false);
    assert.deepEqual(ENEMIES.map(id => /<enemy>/.test(ev(w, id).event().note)), [true, true, true, true, true]);
});

test("修復: 攻撃入力で、マウスの先にいる敵本人にだけDatabase武器ダメージが入る。Event 1は無傷、旧CEは予約されない", () => {
    for (const weapon of [SHORT_SWORD, SWORD_ID]) {
        const w = swordWorld({ weapon });
        const target = ev(w, 4);
        w.placePlayer(target._realX - 1, target._realY); w.frames(3); centerOn(w);
        pointAt(w, 1, 0); w.frames(1);
        const before = hpAll(w);
        w.ctx.$gameTemp.reserveCommonEvent(1);
        assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0, "旧CE(Event 1固定)は予約されない");
        w.frames(6);
        const after = hpAll(w);
        assert.deepEqual(dropped(before, after), [4], `武器${weapon}: 当たった敵だけ減る`);
        assert.ok(before[4] - after[4] > 0);
        assert.equal(after[1], before[1], "Event 1へのダメージはない");
        assert.equal(sword(w).status().hits, 1);
    }
});

test("任意のEvent IDの敵に当たる(ID 2,3,4,5,6 のどれでも)。IDをハードコードしない", () => {
    for (const id of ENEMIES) {
        const w = swordWorld();
        const target = ev(w, id);
        w.placePlayer(target._realX - 1, target._realY); w.frames(3); centerOn(w);
        pointAt(w, 1, 0); w.frames(1);
        const before = hpAll(w);
        attack(w);
        const after = hpAll(w);
        assert.deepEqual(dropped(before, after), [id], `Event ${id}`);
    }
});

test("マウス方向: 360°へHitboxが回り、狙った側の敵だけに当たる(別の向きの敵・遠い敵は無傷)", () => {
    const w = swordWorld({ px: 6, py: 24 });
    const U = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1], NE: [Math.SQRT1_2, -Math.SQRT1_2] };
    const dirs = [["東", "E", 2], ["西", "W", 3], ["北", "N", 4], ["南", "S", 5], ["北東", "NE", 6]];
    for (const [label, key, id] of dirs) {
        // 狙った向きの敵は1.2tile先、ほかの向きの敵は2.8tile先(Hitboxが届かない)。実在する敵Event(ID違い)を動かして配置する。
        for (const [otherLabel, otherKey, otherId] of dirs) {
            const d = otherKey === key ? 1.2 : 2.8;
            ev(w, otherId).locate(6 + U[otherKey][0] * d, 24 + U[otherKey][1] * d);
        }
        for (const eid of ENEMIES) { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === ev(w, eid)); bar.currentHp = bar.targetHp = 100000; bar.refresh(); }
        w.placePlayer(6, 24); w.frames(2); centerOn(w);
        w.mouse(player(w).screenX() + U[key][0] * 3 * 48, player(w).screenY() + U[key][1] * 3 * 48 - 24);
        w.frames(20); // 前の斬撃のCooldownを待つ
        const before = hpAll(w);
        attack(w);
        assert.deepEqual(dropped(before, hpAll(w)), [id], `${label}を狙う`);
    }
});

test("複数の敵がHitboxに重なれば全員に1回ずつ。同じ斬撃で同じ敵に2回当たらない(Hitboxの寿命が3frameあっても)", () => {
    const w = swordWorld({ px: 11, py: 13 });
    // Event 4(10,15)と5(12,15)の間・北側から、南(下)へ斬る
    w.placePlayer(11, 14); w.frames(3); centerOn(w);
    pointAt(w, 0, 1.4); w.frames(1);
    const before = hpAll(w);
    attack(w);
    const after = hpAll(w);
    assert.deepEqual(dropped(before, after), [4, 5], "重なった2体");
    const d4 = before[4] - after[4], d5 = before[5] - after[5];
    w.frames(10);
    assert.equal(hpAll(w)[4], after[4], "Hitboxが残っている間も繰り返し当たらない");
    assert.equal(sword(w).getActiveHitboxes().length, 0, "寿命が尽きて消える");
    // 次の斬撃(Cooldown後)は、もう一度1回ずつ
    w.frames(20);
    attack(w);
    const again = hpAll(w);
    assert.equal(after[4] - again[4], d4); assert.equal(after[5] - again[5], d5);
});

test("対象が居なくても例外なし。どこにもダメージが入らず、Cooldown中の連打は無視される", () => {
    const w = swordWorld({ px: 6, py: 24 });
    pointAt(w, 3, 0); w.frames(1);
    const before = hpAll(w);
    assert.doesNotThrow(() => attack(w));
    assert.deepEqual(hpAll(w), before);
    assert.equal(sword(w).status().swings, 1);
    assert.equal(sword(w).swing("again").reason, "cooldown", "Cooldown中は斬れない");
    assert.equal(sword(w).status().swings, 1);
    w.frames(20);
    assert.equal(sword(w).swing("later").ok, true);
});

test("入口: 銃の装備中・素手・戦闘外では剣の攻撃は動かない(銃はGunSystem、素手は従来のCE1、戦闘外は他pluginが拒否)", () => {
    // 銃: 剣システムは動かない
    let w = swordWorld({ px: 6, py: 24, weapon: GUN_ID });
    pointAt(w, 3, 0); attack(w);
    assert.equal(sword(w).status().swings, 0, "銃では動かない");
    // 素手: 従来のCE1がそのまま予約される
    w = swordWorld({ px: 6, py: 24 });
    w.ctx.$gameParty.leader().forceChangeEquip(0, null); w.frames(2);
    w.ctx.$gameTemp.reserveCommonEvent(1);
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 1, "素手は従来のCE1");
    assert.equal(sword(w).status().swings, 0);
    // 武器を使えない状態(戦闘外・死亡中など。判定は既存のProjectR_CombatPresence): 旧CEも予約されず、剣も動かない
    w = swordWorld({ px: 6, py: 24 });
    const presence = w.ctx.ProjectRCombatPresence, canUse = presence.canUseWeapon;
    presence.canUseWeapon = () => false;
    w.ctx.$gameTemp.reserveCommonEvent(1); w.frames(3);
    presence.canUseWeapon = canUse;
    assert.equal(w.ctx.$gameTemp._commonEventQueue.length, 0);
    assert.equal(sword(w).status().swings, 0, "使えない状態では斬れない");
});

test("絶: 通常の剣の命中が強化の対象になる。1回だけ・外れでは消費しない・失効する", () => {
    for (const [level, multiplier] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
        const w = swordWorld({ level });
        const target = ev(w, 4);
        const strike = (wait = 20) => {
            w.frames(wait); // 前の斬撃のCooldown(強化の0.8秒=48frame以内に当てたいときは短く)
            w.placePlayer(target._realX - 1, target._realY); w.frames(2); centerOn(w);
            pointAt(w, 1, 0); w.frames(1);
            const h0 = hpOf(w, 4); attack(w); return h0 - hpOf(w, 4);
        };
        const base = strike();
        assert.ok(base > 0);
        // 絶(移動の後、強化が用意される)
        centerOn(w); aim(w, 0, 0); // 行き先なしだと失敗するので、離れた地面へ
        w.placePlayer(6, 24); w.frames(2); centerOn(w); aim(w, 2, 0);
        w.tap("KeyQ", 81);
        assert.equal(lastCard(w).ok, true, JSON.stringify(lastCard(w)));
        assert.equal(modifiers(w).getWeaponHitBonus().multiplier, multiplier);
        // 外れ(対象なし)の斬撃では消費されない
        pointAt(w, 0, -3); attack(w);
        assert.ok(modifiers(w).getWeaponHitBonus(), "外れでは消費しない");
        const boosted = strike(12);
        assert.equal(boosted, Math.round(base * multiplier), `Lv${level}: 剣の命中が x${multiplier}`);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, "1回で消費");
        assert.equal(strike(), base, "次の斬撃は通常ダメージ");
    }
    // 失効
    const w = swordWorld();
    const target = ev(w, 4);
    aim(w, 3, 0); w.tap("KeyQ", 81);
    assert.equal(lastCard(w).ok, true);
    for (let i = 0; i < 60; i++) deckApi(w).updateCooldown(1 / 60);
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "0.8秒で失効");
    w.placePlayer(target._realX - 1, target._realY); w.frames(25); centerOn(w);
    pointAt(w, 1, 0); w.frames(1);
    const h0 = hpOf(w, 4); attack(w);
    const plainHit = h0 - hpOf(w, 4);
    assert.ok(plainHit > 0 && modifiers(w).getWeaponHitLog().filter(e => e.type === "consumed").length === 0, "失効後は通常ダメージ");
});

test("Ultimateゲージの与ダメージ記録(trackDamage)を通る。銃・Hermes剣術は従来どおり別の経路", () => {
    const w = swordWorld();
    const gauge = w.ctx.ProjectRUltimateGauge;
    const calls = [];
    const original = gauge.trackDamage;
    gauge.trackDamage = function(id, context, apply) { calls.push([id, context.source, context.attackId]); return original.apply(this, arguments); };
    const target = ev(w, 4);
    w.placePlayer(target._realX - 1, target._realY); w.frames(3); centerOn(w);
    pointAt(w, 1, 0); w.frames(1); attack(w);
    gauge.trackDamage = original;
    assert.equal(calls.length, 1);
    assert.deepEqual([calls[0][0], calls[0][1]], [4, "damage:sword"]);
    assert.match(calls[0][2], /^sword:\d+$/);
    // タグが別(Hermes剣術・銃弾の後始末に干渉しない)
    const src = read("js/plugins/ProjectR_SwordSystem.js");
    assert.match(src, /<projectRNormalSword>/);
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /projectRHermesSword|projectRGunBullet/);
});

test("後始末: マップ移動・戦闘終了でHitboxが残らない。Chromium 85で使えるAPIだけ(別テストが全ファイルを検査)", () => {
    const w = swordWorld();
    sword(w).swing("t");
    assert.equal(sword(w).getActiveHitboxes().length, 1);
    w.ctx.$gameMap.setup(4);
    assert.equal(sword(w).getActiveHitboxes().length, 0);
    assert.equal(sword(w).status().cooldown, 0);
    const w2 = swordWorld();
    sword(w2).swing("t");
    deckApi(w2).endCardBattle();
    assert.equal(sword(w2).getActiveHitboxes().length, 0);
});

console.log(`${passed} Sword system tests passed`);
