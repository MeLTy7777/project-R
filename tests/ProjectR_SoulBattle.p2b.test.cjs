"use strict";
// SOUL戦闘 P2-B: 移動カードの安全。SOULの間、category が "movement" のカード(Hermes絶・高速移動)は発動を受け付けず、
//   カード・Cooldown・手札・絶の予備動作(予約)に何も起こさない。遅れて移動する経路(予約・待ち行列)も作らせない。
//   発動済みの矢・DoTは止めない。SOULが終われば通常のAction Combatと同じに戻る。既存のカード/Hendrixは変更していない。
// 実エンジン(Map004 + 全plugin + 実Hendrix/DotMove)。MZは起動しない。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { cardWorld, player, plain, aimDegree, center, parkOthers, attachHpBars, barHp, HP, handIds, deckApi, OTHER } = fx;

let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const HOME = { x: 30, y: 40 };
const ZETSU = "hermes_zetsu", SWIFT = "hermes_swift_movement", ARROW = "apollo_golden_arrow";

// 壁の無い広い床。手札は order の先頭から(指定がなければ card を5枚)。
function world(card, { order = null, owned = [] } = {}) {
    const w = cardWorld(card, { x: HOME.x, y: HOME.y, bigMap: { width: 60, height: 60 }, order, owned });
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
const pos = w => ({ x: player(w)._realX, y: player(w)._realY });
const dist = (a, b) => +Math.hypot(a.x - b.x, a.y - b.y).toFixed(3);
const deckState = w => plain(deckApi(w).getBattleState());
const instances = w => plain(deckApi(w).getBattleState().hand.map(h => h.instanceId));
const beginSoul = (w, options = {}) => {
    const c = center(w);
    const heart = options.heart === false ? false : { centerX: c.x, centerY: c.y - 5, pattern: "static" };
    const result = w.soul.start({ attackSeconds: 600, defenseSeconds: 600, ...options, heart });
    assert.equal(result.ok, true, JSON.stringify(result));
    const id = w.soul.getState().heart.eventId;
    if (id) attachHpBars(w, [id], HP);
    return id;
};
const cast = (w, card, degree = 0, tiles = 5) => { aimDegree(w, degree, tiles); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(card)))); };
const zetsuPending = w => w.ctx.ProjectRHermesZetsu.isTeleportPending();

test("カード定義: 移動(category=movement)のカードは絶と高速移動だけ。SOULはこの分類で遮断する(カード名の列挙ではない)", () => {
    const w = world(ZETSU);
    const catalog = w.ctx.ProjectRCardCatalog, d = deckApi(w);
    const ids = new Set();
    for (const god of ["apollo", "hermes"]) for (const row of plain(catalog.godDesign(god))) if (row.runtimeCardId) ids.add(row.runtimeCardId);
    for (const id of OTHER) ids.add(id);
    const movement = [...ids].filter(id => d.definitions.card(id)?.category === "movement").sort();
    assert.deepEqual(movement, [SWIFT, ZETSU].sort());
    assert.ok(ids.size >= 20, "確認した定義の数 " + ids.size);
});

test("発動: SOUL中(攻撃・防御とも)の絶・高速移動は受け付けず、プレイヤーは動かず、手札・Cooldown・消費・予約・演出の状態が何も変わらない", () => {
    for (const card of [ZETSU, SWIFT]) {
        for (const phase of ["attack", "defense"]) {
            const w = world(card);
            w.ctx.ProjectRHermesZetsu.setWindupFrames(12);
            beginSoul(w, { heart: false, firstPhase: phase });
            const before = deckState(w), at = pos(w), last = w.ctx.ProjectRHermesZetsu.getLastResult();
            w.calls.length = 0;
            const result = cast(w, card, 0, 5);
            assert.equal(result.ok, false);
            assert.equal(result.reason, phase === "defense" ? "soulDefense" : "soulMovementBlocked", `${card}/${phase}`);
            assert.deepEqual(deckState(w), before, `${card}/${phase} 手札・Cooldownなど戦闘の状態は不変`);
            frames(w, 60);
            assert.equal(dist(pos(w), at), 0, `${card}/${phase} プレイヤーは動かない`);
            assert.equal(zetsuPending(w), false, `${card}/${phase} 予備動作(予約)は作られない`);
            assert.deepEqual(plain(w.ctx.ProjectRHermesZetsu.getLastResult()), last, `${card}/${phase} 絶の処理に入っていない`);
            assert.equal(w.calls.filter(c => ["SpawnEvent", "UpdateEventHp"].includes(c.name)).length, 0, `${card}/${phase}`);
            w.soul.end("test");
            noErrors(w);
        }
    }
});

test("実際のキー入力(Q)でも同じ: 攻撃ターンの絶・高速移動は押しても何も起きない。遮断した数は movement に数える", () => {
    for (const card of [ZETSU, SWIFT]) {
        const w = world(card);
        w.ctx.ProjectRHermesZetsu.setWindupFrames(12);
        beginSoul(w, { heart: false });
        const before = deckState(w), at = pos(w);
        aimDegree(w, 0, 5);
        w.tap("KeyQ", 81); frames(w, 60);
        assert.equal(plain(w.ctx.ProjectRCardBattleInput.getLastResult()).reason, "soulMovementBlocked", card);
        assert.deepEqual(deckState(w).hand, before.hand, card);
        assert.equal(dist(pos(w), at), 0, card);
        assert.equal(w.soul.getBlockedCounts().movement, 1, card);
        assert.equal(w.soul.getBlockedCounts().card, 0, card + " 防御の遮断とは別に数える");
        w.soul.end("test");
        noErrors(w);
    }
});

test("待ち行列: SOUL開始の直前に押した絶(待ち行列に入っている要求)は、開始後の最初の処理で遮断され、遅れて移動しない", () => {
    const w = world(ZETSU);
    w.ctx.ProjectRHermesZetsu.setWindupFrames(12);
    const before = deckState(w), at = pos(w);
    aimDegree(w, 0, 5);
    w.keyDown("KeyQ", 81);                 // SOULはまだ無い。CardBattleInputが受け付けて待ち行列に入る
    beginSoul(w, { heart: false });        // 次のフレームの処理の前にSOULが始まる
    frames(w, 1);
    w.keyUp("KeyQ", 81); frames(w, 60);
    assert.equal(plain(w.ctx.ProjectRCardBattleInput.getLastResult()).reason, "soulMovementBlocked");
    assert.deepEqual(deckState(w).hand, before.hand, "消費されない");
    assert.equal(dist(pos(w), at), 0, "遅れて移動しない");
    assert.equal(zetsuPending(w), false);
    w.soul.end("test");
    noErrors(w);
});

test("遅延実行: 絶の予備動作(予約)が走っている間はSOULを始めない(movementPending)。予備動作が終わって移動した後に始められる。断っても何も変わらない", () => {
    const w = world(ZETSU);
    w.ctx.ProjectRHermesZetsu.setWindupFrames(20);
    aimDegree(w, 0, 5);
    const at = pos(w);
    const first = plain(deckApi(w).requestUseCard(0));
    assert.equal(first.reason, "pending");
    assert.equal(zetsuPending(w), true);
    const sources = plain(w.ctx.ProjectRCombatSession.sources());
    const refused = w.soul.start({ heart: false });
    assert.deepEqual([refused.ok, refused.reason], [false, "movementPending"]);
    assert.equal(w.soul.getPhase(), "idle");
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()), sources, "セッションも移動停止も始まらない");
    assert.equal(w.run("playerMovementDisabled"), false);
    frames(w, 30);                         // 予備動作が終わり、通常どおり移動して消費する
    assert.equal(zetsuPending(w), false);
    assert.ok(dist(pos(w), at) >= 2, "SOULの外では通常どおり移動する");
    const started = w.soul.start({ heart: false });
    assert.equal(started.ok, true, JSON.stringify(started));
    w.soul.end("test");
    noErrors(w);
});

test("フェーズ境界: 攻撃ターンの最後に絶・高速移動を押しても、防御に入ってからも次の攻撃ターンでもプレイヤーは動かない。カードも消費されない", () => {
    for (const card of [ZETSU, SWIFT]) {
        const w = world(card);
        w.ctx.ProjectRHermesZetsu.setWindupFrames(12);
        const c = center(w);
        assert.equal(w.soul.start({ attackSeconds: 1, defenseSeconds: 1, heart: false }).ok, true);
        while (w.soul.getState().framesLeft > 2) w.frames(1);
        const before = instances(w), at = pos(w);
        cast(w, card);
        frames(w, 2);
        assert.equal(w.soul.getPhase(), "defense");
        const seen = [];
        for (let i = 0; i < 240; i++) { w.frames(1); seen.push(dist(pos(w), at)); if (i === 30) cast(w, card); }
        assert.equal(Math.max(...seen), 0, `${card} 防御中も次の攻撃ターンでも動かない`);
        assert.ok(w.soul.getState().round >= 2, "次のラウンドにも入った");
        assert.deepEqual(instances(w), before, `${card} カードは消費されない`);
        assert.ok(w.soul.getBlockedCounts().movement >= 1);
        void c;
        w.soul.end("test");
        noErrors(w);
    }
});

test("発動済みは残す: 移動カードを遮断していても、直前に発射した矢・連射・DoTは防御に入ってから当たり続け、確定(消費)も1回ずつ行われる", () => {
    const order = ["apollo_golden_volley", "apollo_plague_attack", "apollo_eros_arrow", ZETSU, SWIFT, ...OTHER];
    const w = world("apollo_golden_volley", { order, owned: [ZETSU, SWIFT, "apollo_plague_attack", "apollo_eros_arrow"] });
    w.ctx.ProjectRHermesZetsu.setWindupFrames(12);
    const id = beginSoul(w, { attackSeconds: 1, defenseSeconds: 600 });
    while (w.soul.getState().framesLeft > 6) w.frames(1);
    const before = instances(w), at = pos(w);
    w.calls.length = 0;
    const results = {};
    for (const card of ["apollo_golden_volley", "apollo_plague_attack", "apollo_eros_arrow"]) { results[card] = cast(w, card); w.frames(1); }
    assert.notEqual(w.soul.getPhase(), "defense", "まだ攻撃ターン内で発射した");
    for (const card of [ZETSU, SWIFT]) assert.equal(cast(w, card).reason, "soulMovementBlocked", card + " 攻撃ターン内でも遮断");
    frames(w, 3);
    assert.equal(w.soul.getPhase(), "defense", "防御に入った");
    const atFlip = HP - barHp(w, id);
    frames(w, 400);
    const hits = w.calls.filter(c => c.name === "UpdateEventHp" && String(c.args.eventId) === String(id)).length;
    const now = instances(w);
    assert.ok(HP - barHp(w, id) > atFlip, "防御に入った後も当たる");
    assert.ok(hits >= 12, "矢1 + 連射10 + DoTの複数回 " + hits);   // volley 1 + eros 10 + plague 2以上
    assert.equal(before.filter(x => !now.includes(x)).length, 3, "発射した3枚だけが消費され、絶・高速移動は手札に残る");
    assert.equal(dist(pos(w), at), 0, "プレイヤーは動かない");
    assert.equal(w.soul.getBlockedCounts().card, 0, "発動済みの予約は防御で遮断されない");
    assert.ok(w.soul.getBlockedCounts().movement >= 2);
    w.soul.end("test");
    noErrors(w);
});

test("通常戦闘の復元: SOULの前も、終了後(攻撃・防御のどちらで終えても)も、絶・高速移動は通常のAction Combatどおり移動し、1枚消費される。遮断の数は増えない", () => {
    for (const card of [ZETSU, SWIFT]) {
        const use = w => {
            w.ctx.ProjectRHermesZetsu.setWindupFrames(0);
            const before = instances(w), at = pos(w);
            const result = cast(w, card, 0, 5);
            frames(w, 20);
            return { result, moved: dist(pos(w), at), consumed: before.filter(x => !instances(w).includes(x)).length };
        };
        const w = world(card);
        const baseline = use(w);
        assert.ok(baseline.moved >= 2 && baseline.consumed === 1, `${card} SOULの前 ` + JSON.stringify(baseline));
        for (const phase of ["attack", "defense"]) {
            const w2 = world(card);
            beginSoul(w2, { heart: false, firstPhase: phase });
            frames(w2, 5);
            assert.equal(cast(w2, card).ok, false);
            w2.soul.end("test");
            const counts = plain(w2.soul.getBlockedCounts());
            const after = use(w2);
            assert.ok(after.moved >= 2 && after.consumed === 1, `${card} ${phase}で終えた後 ` + JSON.stringify(after));
            assert.equal(after.moved, baseline.moved, `${card} 移動量はSOULの前と同じ`);
            assert.deepEqual(plain(w2.soul.getBlockedCounts()), counts, "終了後は遮断の数が増えない");
            assert.equal(w2.run("playerMovementDisabled"), false);
            noErrors(w2);
        }
    }
});

test("通常戦闘: SOULを一度も始めなければ、遮断は素通し(movement 0)。絶の予約・確定も従来どおり", () => {
    const w = world(ZETSU);
    w.ctx.ProjectRHermesZetsu.setWindupFrames(10);
    const at = pos(w), before = instances(w);
    assert.equal(cast(w, ZETSU, 0, 5).reason, "pending");
    assert.equal(zetsuPending(w), true);
    frames(w, 20);
    assert.equal(zetsuPending(w), false);
    assert.ok(dist(pos(w), at) >= 2);
    assert.equal(before.filter(x => !instances(w).includes(x)).length, 1);
    assert.equal(w.soul.getBlockedCounts().movement, 0);
});

console.log(`\n${passed} tests passed`);
