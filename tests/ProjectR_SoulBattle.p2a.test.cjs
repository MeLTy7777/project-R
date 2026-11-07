"use strict";
// SOUL戦闘 P2-A 調査: 既存の攻撃(弾・連射・範囲・近接・銃・DoT・補助・移動・奥義)を、SOULの敵ハート(P0のGame_Event)へ撃って、
//   対象の取り方・当たり判定・ダメージ・射程・資源の消費・フェーズ移行を確かめる「調査の記録」テスト。新しい戦闘機能は実装していない。
// 実エンジン(Map004 + 全plugin + 実Hendrix/DotMove)。MZは起動しない。カードの数値バランスには依存せず、構造(呼び出し回数・届く/届かない・消費1回)を固定する。
// 結果の一覧(ダメージ/呼び出し/消費/移動)は "info" 行として出力する。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { cardWorld, player, plain, aimDegree, fireCard, center, parkOthers, attachHpBars, barHp, HP, handIds, deckApi, equip, SWORD_ID, GUN_ID, setRegion } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const info = (label, value) => console.log(`info ${label}: ${typeof value === "string" ? value : JSON.stringify(value)}`);

// 壁の無い広い床(射程の制限を壁と切り分ける)。プレイヤーは (30,40)。
const HOME = { x: 30, y: 40 };
function world(card, { god = null, level = 1 } = {}) {
    const w = cardWorld(card, { x: HOME.x, y: HOME.y, bigMap: { width: 60, height: 60 }, level, balance: god ? (world2 => { const r = deckApi(world2).setUltimateRing(god); assert.equal(r.ok, true, JSON.stringify(r)); }) : null });
    parkOthers(w, []);
    for (let i = 0; i < 150; i++) w.frames(1);
    w.soul = w.ctx.ProjectRSoulBattle;
    return w;
}
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const noErrors = w => {
    const bad = [...w.soul.getLog(), ...w.ctx.ProjectRSoulBattlePoC.getLog()].filter(e => /error|Error/.test(e.type));
    assert.deepEqual(bad, [], JSON.stringify(bad));
};
const instances = w => plain(deckApi(w).getBattleState().hand.map(h => h.instanceId));

// ハートを出して1回撃ち、結果を測る。fire(): 撃つ処理。dx: ハートの横ずれ。walls: 実行時の壁を置く関数。
function trial(w, { dist, dx = 0, fire, frameCount = 240 }) {
    w.placePlayer(HOME.x, HOME.y); frames(w, 3);
    const c = center(w);
    const started = w.soul.start({ attackSeconds: 600, defenseSeconds: 600, heart: { centerX: c.x + dx, centerY: c.y - dist, pattern: "static" } });
    assert.equal(started.ok, true, JSON.stringify(started));
    const id = w.soul.getState().heart.eventId;
    attachHpBars(w, [id], HP);
    const before = instances(w), ammo0 = typeof w.ctx.gunAmmo === "function" ? w.ctx.gunAmmo() : null;
    w.calls.length = 0;
    const p0 = { x: player(w)._realX, y: player(w)._realY };
    const res = fire(id);
    let first = -1;
    for (let i = 1; i <= frameCount; i++) { w.frames(1); if (first < 0 && barHp(w, id) !== HP) first = i; }
    const now = instances(w), p1 = { x: player(w)._realX, y: player(w)._realY };
    const result = {
        res: res ? { ok: res.ok, reason: res.reason } : null, loss: HP - barHp(w, id), first,
        calls: w.calls.filter(x => x.name === "UpdateEventHp" && String(x.args.eventId) === String(id)).length,
        consumed: before.filter(x => !now.includes(x)).length, moved: +Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(2),
        ammoUsed: ammo0 === null ? null : ammo0 - w.ctx.gunAmmo(), phase: w.soul.getPhase(), movementLocked: w.run("playerMovementDisabled")
    };
    w.soul.end("trial");
    frames(w, 30);
    return result;
}
const up = (w, card, dist, options = {}) => trial(w, { dist, ...options, fire: () => { aimDegree(w, 0, dist); return fireCard(w, card); } });

// ---------------------------------------------------------------- 共通の契約 ----------------------------------------------------------------
test("対象の取り方: 攻撃pluginは <enemy> の注釈を持つEventを敵とみなす。SOULの敵ハート(P0)はその注釈を持つので、同じ経路で標的になる", () => {
    const files = ["ApolloGoldenArrow", "ApolloGoldenVolley", "ApolloErosArrow", "ApolloGigasSlayer", "ApolloPlagueRain", "ApolloDiseaseAttack", "ApolloUltimate",
        "HermesIssen", "HermesSweep", "HermesSwordsmanship", "HermesUltimate", "GunSystem", "SwordSystem"];
    for (const name of files) assert.match(read(`js/plugins/ProjectR_${name}.js`), /<enemy>/, name + " は <enemy> で敵を判定する");
    assert.match(read("js/plugins/ProjectR_SoulBattlePoC.js"), /"<enemy>"/, "ハートは <enemy> を持つ");
    // どの攻撃もTargetEligibility等の「敵の種類」の絞り込みを持たない(<enemy> と HP が標的の条件)
    for (const name of files) assert.doesNotMatch(read(`js/plugins/ProjectR_${name}.js`), /TargetEligibility/, name);
});

// ---------------------------------------------------------------- 直接再利用できる攻撃 ----------------------------------------------------------------
const DIRECT = [
    // [カード, 期待する UpdateEventHp の回数(ハートへ), 説明]
    ["apollo_golden_arrow", 1, "単発の矢(Dynamic Hitbox + checkCollide)"],
    ["apollo_plague_attack", 2, "病の矢 + 実時間DoT(1回以上のDoTが続く)"],
    ["apollo_golden_volley", 1, "矢の同時発射(Lv1)"],
    ["apollo_eros_arrow", 10, "連射(Lv1は10本・追尾)"],
    ["apollo_gigas_slayer", 1, "太い矢(オートチャージ)"],
    ["apollo_plague_rain", 1, "壁を越える着弾"],
    ["hermes_issen", 2, "一直線の居合 + 出血(DoT)"]
];
test("直接再利用: 矢・連射・DoT・着弾・居合は、ハートに当たりダメージが既存パイプライン(UpdateEventHp)を通る。カードは1枚だけ消費され、フェーズは変わらない", () => {
    for (const [card, expectedCalls, label] of DIRECT) {
        const w = world(card);
        const r = up(w, card, 5);
        info(card, { label, ...r });
        assert.ok(r.loss > 0, card + " ハートが傷つく");
        if (card === "apollo_golden_arrow") assert.equal(r.loss, 46);
        if (expectedCalls === 1 || card === "apollo_eros_arrow") assert.equal(r.calls, expectedCalls, card + " UpdateEventHpの回数");
        else assert.ok(r.calls >= expectedCalls, card + " DoTで複数回");
        assert.equal(r.consumed, 1, card + " カードは1枚だけ消費");
        assert.equal(r.phase, "attack", card);
        assert.equal(r.moved, 0, card + " プレイヤーは動かない");
        assert.equal(r.movementLocked, true, card + " 移動の停止は維持");
        noErrors(w);
    }
});

test("射程: 矢・銃・居合・太い矢・連射は10マス先のハートにも届く(広い床)。ハートは通常の敵と同じ距離で当たる", () => {
    for (const card of ["apollo_golden_arrow", "apollo_golden_volley", "apollo_gigas_slayer", "hermes_issen"]) {
        const w = world(card);
        for (const dist of [3, 10]) assert.ok(up(w, card, dist).loss > 0, `${card} ${dist}マス`);
    }
});

// ---------------------------------------------------------------- 近接・銃・奥義 ----------------------------------------------------------------
test("近接の射程: 調査時は剣カード約1.5マス・通常の剣約2マス・薙ぎ払い約4マスまでしか届かなかった。P2-C(ProjectR_SoulBattleMelee)で、SOUL中は上限(8マス)まで届く。元の射程の確認は ProjectR_SoulBattleMelee.test.cjs", () => {
    const w = world("hermes_sword_attack");
    const reach = {};
    for (const dist of [1.5, 2.5]) reach["swordCard" + dist] = up(w, "hermes_sword_attack", dist, { frameCount: 60 }).loss > 0;
    equip(w, SWORD_ID); frames(w, 3);
    for (const dist of [2, 3]) reach["sword" + dist] = trial(w, { dist, frameCount: 40, fire: () => { aimDegree(w, 0, dist); w.attackClick(); return null; } }).loss > 0;
    info("近接の届く範囲", reach);
    assert.deepEqual(reach, { "swordCard1.5": true, "swordCard2.5": true, sword2: true, sword3: true }, "P2-Cの延長で届く");
    const sweep = world("hermes_sweep");
    assert.ok(up(sweep, "hermes_sweep", 3, { frameCount: 40 }).loss > 0, "薙ぎ払いは3マスで当たる");
    assert.ok(up(sweep, "hermes_sweep", 6, { frameCount: 40 }).loss > 0, "薙ぎ払いは6マスでも(起点の一時ずらしで)当たる");
    noErrors(w);
});

test("銃: 攻撃ボタン(CE1)で撃った弾が10マス先のハートに当たり、弾薬は1発だけ減る。照準を外すと当たらないが弾薬は減る", () => {
    const w = world("hermes_sword_attack");
    equip(w, GUN_ID); frames(w, 3);
    const shoot = (dist, dx, aimDx) => trial(w, { dist, dx, frameCount: 120, fire: () => {
        const degree = Math.atan2(aimDx, dist) * 180 / Math.PI; aimDegree(w, degree, Math.hypot(aimDx, dist)); w.attackClick(); return null; } });
    const hit = shoot(10, 0, 0), miss = shoot(6, 2, 0);
    info("銃", { hit, miss });
    assert.ok(hit.loss > 0 && hit.calls === 1 && hit.ammoUsed === 1);
    assert.equal(miss.loss, 0);
    assert.equal(miss.ammoUsed, 1, "外しても弾薬は消費される(既存の挙動)");
    assert.equal(shoot(6, 2, 2).loss > 0, true, "横にずれたハートも照準を合わせれば当たる");
    noErrors(w);
});

test("奥義: Apolloの奥義(扇状の矢)は3/6/10マスのハートに当たる。Hermesの奥義(全方位の斬撃)は調査時は約2マスまでだった(P2-Cの延長でSOUL中は6マス先にも届く)", () => {
    const apollo = world("apollo_golden_arrow", { god: "apollo" });
    const fireUltimate = (w, dist) => () => {
        w.ctx.ProjectRUltimateGauge.addUltimateGauge(1000, "p2a"); aimDegree(w, 0, dist);
        const result = w.ctx.ProjectRUltimateActivation.requestUltimateActivation("api");
        assert.equal(result.ok, true, JSON.stringify(result));
        return result;
    };
    for (const dist of [3, 10]) assert.ok(trial(apollo, { dist, fire: fireUltimate(apollo, dist) }).loss > 0, `Apollo奥義 ${dist}マス`);
    const hermes = world("apollo_golden_arrow", { god: "hermes" });
    const reach = {};
    for (const dist of [1.5, 3, 6]) reach[dist] = trial(hermes, { dist, fire: fireUltimate(hermes, dist) }).loss > 0;
    info("Hermes奥義の届く範囲", reach);
    assert.deepEqual(reach, { "1.5": true, "3": true, "6": true }, "P2-Cの延長で届く(調査時は約2マスまで)");
    noErrors(apollo);
});

// ---------------------------------------------------------------- 対象の取り方・壁 ----------------------------------------------------------------
test("照準: 矢・着弾・居合はマウス方向で決まる(外すと当たらない)。連射(エロス)はハートへ追尾するので照準が外れても当たる", () => {
    const aimed = (w, card, dx, dist, wrong) => {
        const degree = wrong ? 0 : Math.atan2(dx, dist) * 180 / Math.PI;
        return trial(w, { dist, dx, fire: () => { aimDegree(w, degree, Math.hypot(dx, dist)); return fireCard(w, card); } });
    };
    const table = {};
    for (const card of ["apollo_golden_arrow", "apollo_plague_rain", "hermes_issen", "apollo_eros_arrow"]) {
        const w = world(card);
        table[card] = { aimed: aimed(w, card, 3, 4, false).loss > 0, wrong: aimed(w, card, 3, 4, true).loss > 0 };
        noErrors(w);
    }
    info("斜めのハート(照準を合わせた/外した)", table);
    assert.deepEqual(table, {
        apollo_golden_arrow: { aimed: true, wrong: false }, apollo_plague_rain: { aimed: true, wrong: false },
        hermes_issen: { aimed: true, wrong: false }, apollo_eros_arrow: { aimed: true, wrong: true }
    });
});

test("壁: 居合・矢の同時発射・太い矢・薙ぎ払い(CombatOcclusion)は壁(Region 255)に遮られる。着弾(疫病の矢)は壁を越える。SOULの枠には壁を置かないこと", () => {
    const result = {};
    for (const card of ["hermes_issen", "apollo_golden_volley", "apollo_gigas_slayer", "apollo_plague_rain"]) {
        const w = world(card);
        const open = up(w, card, 5).loss > 0;
        for (let x = HOME.x - 3; x <= HOME.x + 3; x++) setRegion(w, x, HOME.y - 3, 255);   // プレイヤーとハートの間に壁
        const walled = up(w, card, 5).loss > 0;
        result[card] = { open, walled };
        noErrors(w);
    }
    info("壁の有無(open/walled)", result);
    assert.deepEqual(result, {
        hermes_issen: { open: true, walled: false }, apollo_golden_volley: { open: true, walled: false },
        apollo_gigas_slayer: { open: true, walled: false }, apollo_plague_rain: { open: true, walled: true }
    });
});

// ---------------------------------------------------------------- 補助・移動 ----------------------------------------------------------------
const UTILITY = ["apollo_hyacinthus", "apollo_laurel_wreath", "apollo_lyre_rhythm", "apollo_oracle", "hermes_strength", "hermes_psychopomp", "hermes_perception_obscure", "hermes_reed_flute", "hermes_veil"];
test("補助カード: ハートへダメージを与えず(UpdateEventHp 0回)、エラーもなく発動できる。効果は味方・状態・敵AI向けで、SOULでは防御側(P2-B以降)の意味づけが必要", () => {
    const table = {};
    for (const card of UTILITY) {
        const w = world(card);
        const r = up(w, card, 3, { frameCount: 120 });
        table[card] = { ok: r.res.ok, loss: r.loss, calls: r.calls, consumed: r.consumed, moved: r.moved };
        assert.equal(r.res.ok, true, card + " " + JSON.stringify(r.res));
        assert.equal(r.loss, 0, card);
        assert.equal(r.calls, 0, card);
        assert.equal(r.moved, 0, card);
        noErrors(w);
    }
    info("補助カード", table);
});

test("移動カード: 絶・高速移動は、SOULの間は発動を受け付けない(P2-Bで遮断。調査時はSOULの移動停止中でもプレイヤーが動いていた)。詳細は ProjectR_SoulBattle.p2b.test.cjs", () => {
    const table = {};
    for (const card of ["hermes_swift_movement"]) {                                      // 絶は SOUL専用の構え(ProjectR_SoulSkills)として使える。遮断が残るのは高速移動(ProjectR_SoulBattleSkills の新しいテストで絶を確認)
        const w = world(card);
        const r = up(w, card, 5, { frameCount: 120 });
        table[card] = { reason: r.res.reason, moved: r.moved, consumed: r.consumed };
        assert.equal(r.res.reason, "soulMovementBlocked", card);
        assert.equal(r.moved, 0, card + " プレイヤーは動かない");
        assert.equal(r.consumed, 0, card + " 消費しない");
    }
    info("移動カード", table);
});

// ---------------------------------------------------------------- フェーズ移行 ----------------------------------------------------------------
// 攻撃ターンの最後のフレームに撃つ。防御へ移った後の挙動(確定・ダメージ・移動)を見る。
function castAtFlip(card, options = {}) {
    const w = world(card);
    if (options.windup) w.ctx.ProjectRHermesZetsu.setWindupFrames(options.windup);
    const c = center(w);
    const started = w.soul.start({ attackSeconds: 1, defenseSeconds: 600, heart: { centerX: c.x, centerY: c.y - 5, pattern: "static" } });
    assert.equal(started.ok, true, JSON.stringify(started));
    const id = w.soul.getState().heart.eventId;
    attachHpBars(w, [id], HP);
    while (w.soul.getState().framesLeft > 2) w.frames(1);
    const before = instances(w), p0 = { x: player(w)._realX, y: player(w)._realY };
    w.calls.length = 0;
    aimDegree(w, 0, 5);
    const res = fireCard(w, card);
    frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense", "撃った直後に防御へ移る");
    const atFlip = { loss: HP - barHp(w, id), consumed: before.filter(x => !instances(w).includes(x)).length };
    frames(w, 300);
    const now = instances(w), p1 = { x: player(w)._realX, y: player(w)._realY };
    const after = {
        res: { ok: res.ok, reason: res.reason }, atFlip, loss: HP - barHp(w, id), consumed: before.filter(x => !now.includes(x)).length,
        calls: w.calls.filter(x => x.name === "UpdateEventHp" && String(x.args.eventId) === String(id)).length, moved: +Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(2), blocked: plain(w.soul.getBlockedCounts())
    };
    noErrors(w);
    w.soul.end("test");
    return after;
}
test("フェーズ移行: 攻撃ターンの最後に発射した矢・連射・太い矢・着弾は、防御ターンに入ってから当たって確定する(カード消費・ダメージとも1回。遮断されない)", () => {
    for (const [card, calls] of [["apollo_golden_volley", 1], ["apollo_eros_arrow", 10], ["apollo_gigas_slayer", 1], ["apollo_plague_rain", 1]]) {
        const r = castAtFlip(card);
        info("移行直前の発射 " + card, r);
        assert.equal(r.res.reason, "pending", card + " 予約(確定待ち)として受け付けられている");
        assert.equal(r.atFlip.loss, 0, card + " 防御に入った時点ではまだ当たっていない");
        assert.ok(r.loss > 0, card + " 防御中に当たる");
        assert.equal(r.calls, calls, card);
        assert.equal(r.consumed, 1, card + " 確定でカードを1枚消費");
        assert.equal(r.blocked.card, 0, card + " 発動済みの予約は遮断されない");
    }
});
test("フェーズ移行: DoT(病の矢・居合の出血)は防御ターンの間も続く。発動済みの継続ダメージは止まらない", () => {
    for (const card of ["apollo_plague_attack", "hermes_issen"]) {
        const r = castAtFlip(card);
        info("移行直前の発射 " + card, r);
        assert.ok(r.calls >= 2, card + " 防御中にもtickが入る " + r.calls);
        assert.ok(r.loss > r.atFlip.loss, card);
        assert.equal(r.consumed, 1, card);
    }
});
test("フェーズ移行: 絶(瞬間移動)は、攻撃ターンの最後でも受け付けず、防御に入ってもプレイヤーは動かない(調査時は防御中に5マス動いていた。P2-Bで遮断)", () => {
    const r = castAtFlip("hermes_swift_movement", { windup: 12 });          // 絶は SOUL専用の構えとして使える。移動の遮断が残るのは高速移動
    info("移行直前の発射 hermes_swift_movement", r);
    assert.equal(r.res.reason, "soulMovementBlocked");
    assert.equal(r.moved, 0, "防御中も動かない");
    assert.equal(r.consumed, 0);
    assert.equal(r.blocked.movement, 1);
});


