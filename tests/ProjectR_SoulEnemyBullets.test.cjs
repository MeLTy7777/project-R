"use strict";
// I4-B1〜B4: SOUL の敵の弾(ProjectR_SoulEnemyBullets)。DEFENSE だけで出る・動く・描かれる・片づく(B1)。ハートとの当たり判定・HPダメージ・重複なし・有界(B2)。狙い撃ち・扇・放射波とボスのフェーズに合わせた選択・避けられること(B3)。実エンジン(全plugin)をNode VMで動かす。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });
    if (!scene.children.includes(sp)) scene.children.push(sp);
    const player = { _character: ctx.$gamePlayer, renderable: true, visible: true, children: [{ renderable: true, name: "shadow" }, { renderable: true, name: "nameplate" }], x: 0, y: 0, addChild() {}, removeChild() {} };
    const other = { _character: { eventId: () => 99 }, renderable: true, children: [], x: 0, y: 0, addChild() {}, removeChild() {} };
    Object.defineProperty(sp, "_characterSprites", { configurable: true, writable: true, value: [player, other] });
    const extra = { hudLayer: display(), menuButton: display(), hendrixHud: display() };
    scene._projectRBattleHudLayer = extra.hudLayer; scene._menuButton = extra.menuButton;
    scene.hendrixHuds = [{ container: extra.hendrixHud, index: 0, x: 0, y: 0, updateHUD() {}, updateDrag() {}, evaluateX: () => 0, evaluateY: () => 0 }];
    w.parts = { player, other, extra, sp };
    return w.parts;
}
const mapJson = id => read(`data/Map${String(id).padStart(3, "0")}.json`);
function arrive(w) {
    const ctx = w.ctx, id = ctx.$gamePlayer.newMapId();
    ctx.$dataMap = w.run("(text) => JSON.parse(text)")(mapJson(id));
    ctx.DataManager.onLoad(ctx.$dataMap);
    ctx.$gamePlayer.performTransfer();
    ctx.$gameTemp.initCharacterTempDatas(); ctx.$gameMap.initMapCharactersCache(); ctx.$gamePlayer.setupCollideTriggerEventIds();
    decorate(w);
    return id;
}
function world({ size = [1920, 1080], origin = { map: 1, x: 12, y: 20 } } = {}) {
    const w = buildWorld();
    assert.equal(w.failures.length, 0, JSON.stringify(w.failures));
    w.enterMap(origin.map, origin.x, origin.y); frames(w, 4);
    w.ctx.Graphics._width = size[0]; w.ctx.Graphics._height = size[1];
    w.run("Math.random = () => 0.999;");
    w.sc = () => w.ctx.SceneManager._scene;
    w.stage = w.ctx.ProjectRSoulStage; w.sb = w.ctx.ProjectRSoulSandbox; w.soul = w.ctx.ProjectRSoulBattle; w.hud = w.ctx.ProjectRSoulBattleHUD; w.deck = w.ctx.ProjectRCardDeck; w.bf = w.ctx.ProjectRBossFramework;
    w.at = w.ctx.ProjectRApolloTest; w.prep = w.ctx.ProjectRSoulPrepare; w.input = w.ctx.ProjectRSoulInput; w.dodge = w.ctx.ProjectRSoulBattleDodge;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.phases = []; w.soul.onPhase(e => w.phases.push(`${e.from}>${e.to}`));
    return w;
}
const paused = w => !!w.ctx.$gameMap.eventsPaused;
const stageState = w => plain(w.stage.getState());
// 専用ステージで a16 を準備ループで始める(開始 → 移動 → 到着 → 準備メニューが出るまで)
function a16Prepare(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true, bossAttacks: false, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w);
    frames(w, 8);
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.getPhase(), "prepare", "準備から始まる: " + w.soul.getPhase());
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    return w;
}
// 本物の入力経路: TouchInput の押下 → 1フレーム
const click = (w, sx, sy) => {
    const m = w.stage.isActive() ? w.stage.toStage(sx, sy) : { x: sx, y: sy };
    w.mouse(Math.round(m.x), Math.round(m.y));
    w.ctx.TouchInput._onTrigger(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
    w.ctx.TouchInput._onRelease(Math.round(m.x), Math.round(m.y));
    frames(w, 1);
};
const center = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const itemsSnapshot = w => JSON.stringify({ items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold, hp: w.ctx.$gameParty.leader().hp, deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null });

// ================================================================ マナコスト(L4-B: 承認済みD8コストによる判定と消費) ================================================================
const M = w => w.ctx.ProjectRSoulMana;
const H = w => w.ctx.ProjectRSoulHand;
const D = w => w.ctx.ProjectRCardDeck;
const ms = w => plain(M(w).getState());
const set = (w, v) => { const r = plain(M(w).devSet(v)); assert.equal(r.ok, true, JSON.stringify(r)); };
const savedData = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, items: w.ctx.$gameParty._items, gold: w.ctx.$gameParty._gold });
const seeded = (w, seed) => w.run(`globalThis.__seed = ${seed}; Math.random = function() { __seed = (__seed * 1103515245 + 12345) % 2147483648; return __seed / 2147483648; };`);
const battle = w => plain(D(w).getBattleState());
function startA16(w, { prepare = true, hand = ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"], extra = {} } = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, bossAttacks: false, ...extra })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}
// 指定のカードを含む5枠で ATTACK を始める(同じ準備で、テスト用に再シャッフルして条件に合う引きを選ぶ)
function equip(w, cardIds, filler = 5) {
    seeded(w, 4711);
    let drawn = null;
    for (let i = 0; i < 40000 && !drawn; i++) { const r = plain(H(w).draw("player", { force: true })); if (cardIds.every(id => r.drawn.some(c => c.cardId === id))) drawn = r.drawn; }
    assert.ok(drawn, "必要なカードを含む引き: " + cardIds.join());
    const used = new Set(), picks = [];
    for (const id of cardIds) { const c = drawn.find(d => d.cardId === id && !used.has(d.instanceId)); used.add(c.instanceId); picks.push(c.instanceId); }
    for (const c of drawn) { if (picks.length >= filler) break; if (!used.has(c.instanceId)) { used.add(c.instanceId); picks.push(c.instanceId); } }
    for (const id of picks) assert.equal(plain(H(w).toggle(id)).ok, true);
    assert.equal(plain(H(w).assignDefault()).ok, true);
    assert.equal(plain(H(w).commit()).ok, true);
    assert.equal(w.soul.beginAttack(), true);
    frames(w, 2);
    return w;
}
const slotOf = (w, cardId) => battle(w).hand.findIndex(c => c.cardId === cardId);
const use = (w, cardId) => plain(D(w).requestUseCard(slotOf(w, cardId)));

// ================================================================ ストレングスの後始末と、SOUL の一時的なスキル強化の漏れ(L4-B 最終) ================================================================
const S = w => w.ctx.ProjectRHermesStrength;
const heartPos = w => plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
const aimHeart = w => { const h = heartPos(w); w.mouse(Math.round(h.x * 48), Math.round(h.y * 48)); frames(w, 2); };
const heartHp = w => plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp;
const castStrength = w => { set(w, 10); return use(w, "hermes_strength"); };
const pending = w => plain(S(w).getPending());

// ---- tests ----
const E = w => w.ctx.ProjectRSoulEnemyBullets;
const es = w => plain(E(w).getState());
const bullets = w => plain(E(w).getBullets());
const toPhase = (w, phase) => { for (let i = 0; i < 6 && w.soul.getPhase() !== phase; i++) { w.soul.skipPhase(); frames(w, 2); } assert.equal(w.soul.getPhase(), phase); };
const ebWorld = (extra = {}) => { const w = startA16(world(), { extra: { weapon: "sword", attackSeconds: 30, defenseSeconds: 12, ...extra } }); E(w).setConfig({ collision: false }); return w; };    // I4-B1 のテストは当たり判定を切る(B2 のテストが入れる)
const layerChildren = w => { const tm = w.ctx.SceneManager._scene._spriteset._tilemap; const layer = tm.children.find(c => c && c._projectRSoulEnemyBullets); return layer ? layer.children.length : 0; };
const mouseAt = (w, u, v) => { const box = plain(w.stage.getBattleBox()); w.mouse(Math.round(box.x + u * box.w), Math.round(box.y + v * box.h)); frames(w, 2); };

test("既定では無効: DEFENSE に入っても何も出ない。ATTACK / PREPARE / 無効の間は fire() が拒否される", () => {
    const w = ebWorld();
    assert.equal(E(w).isEnabled(), false);
    assert.equal(plain(E(w).fire("dev_fan")).reason, "notDefense", "PREPARE");
    toPhase(w, "attack");
    assert.equal(plain(E(w).fire("dev_fan")).reason, "notDefense", "ATTACK");
    toPhase(w, "defense"); frames(w, 120);
    assert.equal(es(w).stats.spawned, 0, "無効のままなら出ない");
    assert.equal(bullets(w).length, 0);
    assert.equal(plain(E(w).fire("nope")).reason, "unknownPattern");
    assert.equal(plain(E(w).enable({ pattern: "nope" })).reason, "unknownPattern");
    w.soul.end("t");
});

test("DEFENSE だけで出る: 警告(約60フレーム)→1回目の弾→2回目の弾。ATTACK / PREPARE の間は弾も警告も無い。弾の持ち主はすべて enemy で、マップの Event は増えない", () => {
    const w = ebWorld();
    assert.equal(plain(E(w).enable({ pattern: "dev_fan" })).ok, true);
    const eventsBefore = w.ctx.$gameMap.events().length;
    frames(w, 30); assert.equal(es(w).stats.spawned, 0, "PREPARE");
    toPhase(w, "attack"); frames(w, 120);
    assert.deepEqual([es(w).live, es(w).telegraphs, es(w).stats.spawned], [0, 0, 0], "ATTACK: 無い");
    toPhase(w, "defense"); mouseAt(w, 0.5, 0.8);
    frames(w, 10);
    assert.equal(es(w).telegraphs, 7, "警告の線が7本");
    assert.equal(bullets(w).length, 0, "警告の間は弾が出ない");
    assert.ok(plain(E(w).getTelegraphs()).every(t => t.hasSprite), "警告の絵がある");
    assert.ok(plain(w.ctx.ProjectRCutIn.getActive()).some(e => e.owner === "enemy"), "敵のカットイン(右上)が出る");
    frames(w, 55);
    assert.equal(es(w).stats.spawned, 7, "警告のあとに1回目の7発");
    assert.equal(es(w).telegraphs, 7, "2回目のために警告は残る");
    frames(w, 40);
    assert.equal(es(w).stats.spawned, 14, "2回目の7発");
    assert.equal(es(w).telegraphs, 0, "最後の弾を撃ったら警告は消える");
    assert.ok(bullets(w).every(b => b.owner === "enemy" && b.hasSprite));
    assert.equal(w.ctx.$gameMap.events().length, eventsBefore, "マップの Event ではない");
    w.soul.end("t");
});

test("軌跡: 弾は直線を一定の速さで進む。警告の向きと弾道は一致し、中心の弾は警告時のプレイヤーのハートの方向。扇の間に避けられる隙間がある", () => {
    const w = ebWorld();
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    mouseAt(w, 0.5, 0.9); toPhase(w, "defense"); mouseAt(w, 0.5, 0.9); frames(w, 3);
    const tele = plain(E(w).getTelegraphs()), angles = tele.map(t => t.angle);
    assert.equal(angles.length, 7);
    const spread = (angles[6] - angles[0]) * 180 / Math.PI;
    assert.ok(Math.abs(spread - 90) < 1e-6, "扇の開き 90度: " + spread);
    const center = angles[3], origin = tele[3].origin;
    const heart = plain(w.stage.getPlayerHeart()), r = E(w).rect();
    const hx = (heart.x - r.screen.x) / r.screen.w, hy = (heart.y - r.screen.y) / r.screen.w;
    const toHeart = Math.atan2(hy - origin.y, hx - origin.x);
    assert.ok(Math.abs(center - toHeart) < 0.02, `中心の弾は警告時のハートの方向: ${center} / ${toHeart}`);
    for (let i = 0; i < 120 && es(w).stats.spawned < 7; i++) frames(w, 1);
    const first = bullets(w);
    assert.equal(first.length, 7);
    assert.ok(first.every(b => b.age === 1), "撃ったフレームに1歩進む");
    const sorted = first.slice().sort((a, b) => Math.atan2(a.vy, a.vx) - Math.atan2(b.vy, b.vx));
    sorted.forEach((b, i) => assert.ok(Math.abs(Math.atan2(b.vy, b.vx) - angles[i]) < 1e-9, "弾道 = 警告の線"));
    const speed = Math.hypot(sorted[0].vx, sorted[0].vy) * 60;
    assert.ok(Math.abs(speed - 0.3) < 1e-9, "速さ 0.3 幅/秒: " + speed);
    // 直線: 5フレーム後の位置 = 元の位置 + 速度 x 5
    const before = bullets(w).find(b => b.id === sorted[2].id); frames(w, 5);
    const after = bullets(w).find(b => b.id === before.id);
    assert.ok(Math.abs(after.x - (before.x + before.vx * 5)) < 1e-9 && Math.abs(after.y - (before.y + before.vy * 5)) < 1e-9);
    // 隣の弾の間隔(出る位置から 0.4 幅の所で): 弾の直径 + ハートの直径(いまの画面の大きさでの半径 0.014 幅)の1.5倍より広い = ハートが通れる
    const gapAngle = (angles[1] - angles[0]), gap = 2 * 0.4 * Math.sin(gapAngle / 2), need = 1.5 * 2 * (E(w).UNIT.bulletRadius + heart.radius / E(w).rect().screen.w);
    assert.ok(gap > need, `隙間 ${gap} > 必要な幅 ${need}`);
    w.soul.end("t");
});

test("範囲: 弾は戦闘エリアの中で生まれ、外へ完全に出たら消える。描く位置は毎フレーム戦闘エリアから計算され、解像度が変わっても割合が同じ", () => {
    const w = ebWorld();
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    toPhase(w, "defense"); mouseAt(w, 0.5, 0.6);
    const asp = E(w).UNIT.height, rad = E(w).UNIT.bulletRadius;
    let sawRemoved = false;
    for (let i = 0; i < 260 && w.soul.getPhase() === "defense"; i++) {
        frames(w, 1);
        for (const b of bullets(w)) {
            assert.ok(b.x + rad > 0 && b.x - rad < 1 && b.y + rad > 0 && b.y - rad < asp, `範囲外の弾が残っている ${b.x},${b.y}`);
            if (b.age === 1) assert.ok(b.x - rad >= -0.01 && b.x + rad <= 1.01 && b.y + rad <= asp, "生まれた直後は戦闘エリアの中(上の縁)");
        }
        if (es(w).stats.removedBounds > 0) sawRemoved = true;
    }
    assert.ok(sawRemoved, "外へ出た弾が消えた");
    // 解像度: 同じ弾の割合は変わらず、描く位置は (srcX + x*srcW) になる
    toPhase(w, "prepare"); toPhase(w, "attack"); toPhase(w, "defense"); mouseAt(w, 0.5, 0.6); frames(w, 70);
    const sample = bullets(w)[0]; assert.ok(sample, "弾がある");
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [2560, 1440], [1000, 700]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 1);
        const r = E(w).rect(), v = plain(w.stage.getViewport());
        const now = bullets(w).find(b => b.id === sample.id) || bullets(w)[0];
        const sprite = w.ctx.SceneManager._scene._spriteset._tilemap.children.find(c => c && c._projectRSoulEnemyBullets).children.find(c => Math.abs(c.x - Math.round(r.x + now.x * r.w)) <= 1 && Math.abs(c.y - Math.round(r.y + now.y * r.w)) <= 1);
        assert.ok(sprite, `${gw}x${gh}: 弾の絵が戦闘エリアの同じ割合にある`);
        const screen = plain(E(w).toScreen(now));
        assert.ok(screen.x >= v.x && screen.x <= v.x + v.w && screen.y >= v.y - 1 && screen.y <= v.y + v.h, `${gw}x${gh}: 画面の戦闘エリアの中 ${screen.x},${screen.y}`);
        assert.ok(Math.abs((screen.x - v.x) / v.w - now.x) < 1e-9, "画面でも割合は同じ");
        assert.equal(Math.round(r.w), v.srcW);
    }
    w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080;
    w.soul.end("t");
});

test("片づけ: DEFENSE の終わり(時間切れ・skip)・中断・マップ移動・SOUL の終了で、弾・警告・絵が残らない。ATTACK の終わりでは消さない(弾は DEFENSE にしか無い)", () => {
    const exits = {
        "時間切れ": w => { frames(w, 12 * 60 + 5); },
        "skipPhase": w => { w.soul.skipPhase(); frames(w, 2); },
        "SOUL の終了(abort)": w => { w.soul.end("abort"); frames(w, 2); },
        "マップ移動": w => { quietly(() => w.ctx.$gameMap.setup(w.ctx.$gameMap.mapId())); frames(w, 2); }
    };
    for (const [name, exit] of Object.entries(exits)) {
        const w = ebWorld({ defenseSeconds: 12 });
        E(w).enable({ pattern: "dev_fan", cutIn: false });
        toPhase(w, "defense"); mouseAt(w, 0.5, 0.6); frames(w, 70);
        assert.ok(bullets(w).length > 0, name + ": 弾がある");
        assert.ok(layerChildren(w) > 0);
        exit(w);
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], name + ": 何も残らない");
        assert.equal(layerChildren(w), 0, name + ": 絵が残らない");
        if (w.soul.getState().active) w.soul.end("t");
    }
    // 持ち主の分離: player の片づけでは消えず、enemy の片づけで消える。ATTACK の終わりの片づけ(player だけ)は弾に触れない
    const w = ebWorld();
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    toPhase(w, "defense"); mouseAt(w, 0.5, 0.6); frames(w, 70);
    const n = bullets(w).length; assert.ok(n > 0);
    const pc = w.ctx.ProjectRSoulPhaseCleanup;
    assert.equal(plain(pc.sweepNow("t-player", { owners: ["player"] })).cleaned, 0);
    assert.equal(bullets(w).length, n, "player の片づけでは消えない");
    assert.deepEqual(plain(pc.getTags("player")).filter(t => /SoulEnemy|EnemyBullet/.test(t)), [], "敵の弾の印は player の印に無い");
    const res = plain(pc.sweepNow("t-enemy", { owners: ["enemy"] }));
    assert.ok(res.cleaned >= n, "enemy の片づけで消える: " + res.cleaned);
    assert.equal(bullets(w).length, 0);
    w.soul.end("t");
    // DEFENSE の頭では消えない: ATTACK → DEFENSE の境目の片づけ(player だけ)のあとに弾幕が始まる
    const w2 = ebWorld();
    E(w2).enable({ pattern: "dev_fan", cutIn: false });
    toPhase(w2, "defense"); mouseAt(w2, 0.5, 0.6); frames(w2, 120);
    assert.ok(es(w2).stats.spawned > 0 && es(w2).stats.clearReasons.outsideDefense === undefined, "ATTACK の終わりで消えていない");
    w2.soul.end("t");
});

test("一時停止: $gameMap.eventsPaused の間は弾も警告の時計も進まず、再開すると続きから(飛び・遅れ・二重の発射なし)", () => {
    const w = ebWorld();
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    toPhase(w, "defense"); mouseAt(w, 0.5, 0.6); frames(w, 70);
    const snap = { bullets: bullets(w), runner: es(w).runner, spawned: es(w).stats.spawned };
    w.ctx.$gameMap.eventsPaused = true;
    frames(w, 90);
    assert.deepEqual(bullets(w).map(b => [b.id, b.x, b.y, b.age]), snap.bullets.map(b => [b.id, b.x, b.y, b.age]), "停止中は動かない");
    assert.equal(es(w).runner.age, snap.runner.age, "時計も進まない");
    assert.equal(es(w).stats.spawned, snap.spawned, "停止中に発射しない");
    assert.ok(es(w).stats.pausedTicks >= 90);
    w.ctx.$gameMap.eventsPaused = false;
    frames(w, 10);
    assert.equal(es(w).runner.age, snap.runner.age + 10, "再開すると続きから");
    const b0 = snap.bullets[snap.bullets.length - 1], b1 = bullets(w).find(b => b.id === b0.id);
    if (b1) assert.ok(Math.abs(b1.x - (b0.x + b0.vx * 10)) < 1e-9 && b1.age === b0.age + 10, "弾も10フレーム分だけ進む");
    w.soul.end("t");
});

test("繰り返しのラウンド: DEFENSE ごとに新しい弾幕が始まり、ラウンドの間(PREPARE / ATTACK)には何も残らない。3ラウンド同じ結果", () => {
    const w = ebWorld({ defenseSeconds: 4 });
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    const results = [];
    for (let round = 1; round <= 3; round++) {
        toPhase(w, "attack");
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], `ラウンド${round} ATTACK: 無い`);
        toPhase(w, "defense"); mouseAt(w, 0.5, 0.7);
        const spawned0 = es(w).stats.spawned;
        frames(w, 200);
        results.push(es(w).stats.spawned - spawned0);
        toPhase(w, "prepare");
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], `ラウンド${round} PREPARE: 残らない`);
        assert.equal(layerChildren(w), 0);
    }
    assert.deepEqual(results, [14, 14, 14], "毎ラウンド 7発 x 2回");
    assert.equal(es(w).stats.patterns, 3);
    w.soul.end("t");
});

test("無効にすると何も出ず、通常のマップ・従来の SOUL(prepare なし)でも残らない(ステージが無ければ出ない)", () => {
    const w = ebWorld();
    E(w).enable({ pattern: "dev_fan" });
    assert.equal(plain(E(w).disable()), true);
    toPhase(w, "attack"); toPhase(w, "defense"); frames(w, 100);
    assert.equal(es(w).stats.spawned, 0);
    w.soul.end("t");
    const normal = world();
    assert.deepEqual(plain(E(normal).fire("dev_fan")), { ok: false, reason: "stageInactive" }, "通常のマップでは出ない");
    assert.equal(E(normal).getBullets().length, 0);
    assert.equal(E(normal).rect(), null);
    const legacy = startA16(world(), { prepare: false, extra: { weapon: "sword" } });
    E(legacy).enable({ pattern: "dev_fan" });
    for (let i = 0; i < 4 && legacy.soul.getPhase() !== "defense"; i++) { legacy.soul.skipPhase(); frames(legacy, 2); }
    frames(legacy, 70);
    legacy.soul.end("t"); frames(legacy, 2);
    assert.equal(es(legacy).live, 0, "終わったら残らない");
});

// ================================================================ I4-B2: 当たり判定・HPダメージ ================================================================
const hpOf = w => w.ctx.$gameParty.leader().hp;
const heartAt = (w, u, v) => { mouseAt(w, u, v); frames(w, 2); return plain(E(w).getHeartCircle()); };
const hitWorld = (extra = {}) => { const w = ebWorld({ defenseSeconds: 60, ...extra }); E(w).setConfig({ collision: true, damage: 25 }); mouseAt(w, 0.5, 0.7); toPhase(w, "defense"); mouseAt(w, 0.5, 0.7); frames(w, 3); return w; };
// 動かない弾を、ハートから(dx, dy)(幅単位)の所に置く
const placeStill = (w, heart, dx, dy, extra = {}) => plain(E(w).devSpawn({ x: heart.x + dx, y: heart.y + dy, vx: 0, vy: 0, ...extra }));
const spyUpdatePlayerHp = w => { const calls = []; const pm = w.ctx.PluginManager, orig = pm.callCommand; pm.callCommand = function(interp, plugin, name, args) { if (name === "UpdatePlayerHp") calls.push(String(args && args.value)); return orig.apply(this, arguments); }; return { calls, restore: () => { pm.callCommand = orig; } }; };

test("当たり: 弾がハートの当たり円に触れると、その弾は消えて主人公のHPが DEV のダメージぶん1回だけ減る。外れた弾は何も起こさない。ダメージは既存のプレイヤーHPの窓口(UpdatePlayerHp)を通る", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle()), spy = spyUpdatePlayerHp(w);
    const hp0 = hpOf(w);
    const miss = placeStill(w, heart, 0.15, 0), hit = placeStill(w, heart, 0, 0);
    assert.ok(miss.ok && hit.ok);
    frames(w, 1);
    assert.equal(hpOf(w), hp0 - 25, "1回だけ25");
    assert.deepEqual(spy.calls, ["-25"], "既存のHP窓口を1回だけ通る");
    assert.deepEqual(plain(E(w).getBullets()).map(b => b.id), [miss.id], "当たった弾は消え、外れた弾は残る");
    assert.equal(es(w).stats.hits, 1);
    const rec = plain(E(w).getHits())[0];
    assert.deepEqual([rec.bulletId, rec.dealt, rec.before, rec.after, rec.reason], [hit.id, 25, hp0, hp0 - 25, "ok"]);
    assert.equal(plain(w.hud.getViewModel()).player.hp, hp0 - 25, "HUD のHPが更新される");
    frames(w, 30);
    assert.equal(hpOf(w), hp0 - 25, "外れた弾は何もしない");
    spy.restore(); w.soul.end("t");
});

test("当たり判定の大きさ: 判定は装飾の絵ではなく、ハートの小さな当たり円(見た目の半径 x hitRadiusScale)と弾の円。円の縁の内側は当たり、外側は外れ。DEV 設定で変えられる", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle()), cfg = plain(E(w).getConfig());
    assert.ok(Math.abs(heart.r - heart.visualR * cfg.hitRadiusScale) < 1e-12, "当たり円 = 見た目の半径 x 0.5");
    const br = E(w).UNIT.bulletRadius, reach = br * cfg.bulletHitScale + heart.r;
    const trial = (offset) => { const hp0 = hpOf(w); const p = placeStill(w, heart, offset, 0); frames(w, 1); const hit = hpOf(w) < hp0; plain(E(w).clear("t")); return hit; };
    assert.equal(trial(reach - 0.0005), true, "円の縁の内側 = 当たり");
    assert.equal(trial(reach + 0.0005), false, "円の縁の外側 = 外れ");
    assert.equal(trial(br + heart.visualR * 0.9), false, "ハートの見た目の内側でも、当たり円の外なら外れ(装飾の大きさは判定ではない)");
    E(w).setConfig({ hitRadiusScale: 1 });
    const heart2 = plain(E(w).getHeartCircle());
    const hp0 = hpOf(w); placeStill(w, heart2, br + heart2.visualR * 0.9, 0); frames(w, 1);
    assert.ok(hpOf(w) < hp0, "DEV の hitRadiusScale を 1 にすると見た目の半径まで当たる");
    w.soul.end("t");
});

test("すり抜けない: 速い弾でも、1フレームで進んだ線分がハートの当たり円を通れば当たる", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle());
    const hp0 = hpOf(w);
    E(w).devSpawn({ x: heart.x - 0.1, y: heart.y, vx: 0.2, vy: 0 });          // 1フレームで 0.2 進む(円を飛び越える)
    frames(w, 1);
    assert.equal(hpOf(w), hp0 - 25);
    w.soul.end("t");
});

test("同時の弾: 同じフレームに複数の弾が当たれば、弾ごとに別々のダメージ(無敵なし・BT-049)。連続するフレームの弾も、抑えられずに当たる", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle()), hp0 = hpOf(w);
    E(w).devSpawn({ x: heart.x, y: heart.y }); E(w).devSpawn({ x: heart.x + 0.004, y: heart.y }); E(w).devSpawn({ x: heart.x - 0.004, y: heart.y });
    frames(w, 1);
    assert.equal(hpOf(w), hp0 - 75, "3発 x 25");
    assert.equal(es(w).stats.hits, 3);
    assert.equal(bullets(w).length, 0);
    // 連続するフレーム: 1フレーム目の弾の直後に2フレーム目の弾が当たる(被弾後の無敵時間なし)
    E(w).devSpawn({ x: heart.x, y: heart.y - 0.03, vx: 0, vy: 0.01 }); E(w).devSpawn({ x: heart.x, y: heart.y - 0.06, vx: 0, vy: 0.01 });
    frames(w, 6);
    assert.equal(hpOf(w), hp0 - 125, "連続の2発もどちらも当たる");
    const frames2 = plain(E(w).getHits()).slice(-2).map(h => h.frame);
    assert.ok(frames2[1] > frames2[0], "別のフレームで当たった: " + frames2);
    w.soul.end("t");
});

test("同じ弾の重複ダメージなし: 当たった弾はその場で消える。ハートに重なり続ける弾(ゆっくり)でも1回だけ。消えた弾は二度と当たらない", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle()), hp0 = hpOf(w);
    E(w).devSpawn({ x: heart.x - 0.03, y: heart.y, vx: 0.0005, vy: 0 });      // とてもゆっくり(重なっている時間が長い)
    frames(w, 120);
    assert.equal(hpOf(w), hp0 - 25, "1発 = 1回");
    assert.equal(es(w).stats.hits, 1);
    assert.equal(bullets(w).length, 0, "当たった弾は残らない");
    w.soul.end("t");
});

test("HP は有界: 下限(floorHp = 1)より下がらず、戦闘不能・PlayerDeath・ゲームオーバーは起きない。下限での被弾は dealt 0 として数える", () => {
    const w = hitWorld();
    const actor = w.ctx.$gameParty.leader(), heart = plain(E(w).getHeartCircle());
    E(w).setConfig({ damage: 1000000 });
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 2);
    assert.equal(actor.hp, 1, "下限 1");
    assert.equal(actor.isDead(), false);
    assert.equal(w.ctx.ProjectR.PlayerDeath.isDead(), false);
    assert.equal(plain(E(w).getHits())[0].dealt, actor.mhp - 1);
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 2);
    assert.equal(actor.hp, 1);
    assert.equal(plain(E(w).getHits()).slice(-1)[0].reason, "atFloor");
    assert.equal(es(w).stats.hitsAtFloor, 1);
    assert.equal(w.ctx.SceneManager._scene.constructor.name === "Scene_Gameover", false, "ゲームオーバーにならない");
    assert.equal(w.soul.getState().active, true, "SOUL は続く(敗北の経路は無い)");
    // 下限は DEV 設定で変えられる
    actor.setHp(actor.mhp); E(w).setConfig({ damage: 30, floorHp: 100 });
    for (let i = 0; i < 40; i++) E(w).devSpawn({ x: heart.x, y: heart.y });
    frames(w, 2);
    assert.equal(actor.hp, 100);
    w.soul.end("t");
});

test("DEFENSE だけ: 弾は DEFENSE にしか無く、PREPARE / ATTACK では HP は変わらない。通常のマップ・ステージ外では devSpawn も当たらない", () => {
    const w = ebWorld({ defenseSeconds: 60 }); E(w).setConfig({ collision: true });
    const hp0 = hpOf(w);
    assert.equal(plain(E(w).devSpawn({ x: 0.5, y: 0.3 })).reason, "notDefense", "PREPARE");
    toPhase(w, "attack"); frames(w, 10);
    assert.equal(plain(E(w).devSpawn({ x: 0.5, y: 0.3 })).reason, "notDefense", "ATTACK");
    assert.equal(hpOf(w), hp0);
    toPhase(w, "defense"); mouseAt(w, 0.5, 0.7); frames(w, 3);
    const heart = plain(E(w).getHeartCircle());
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 1);
    assert.equal(hpOf(w), hp0 - 25);
    toPhase(w, "prepare"); frames(w, 20);
    assert.equal(hpOf(w), hp0 - 25, "DEFENSE を出たあとは変わらない");
    w.soul.end("t");
    const normal = world();
    assert.equal(plain(E(normal).devSpawn({ x: 0.5, y: 0.5 })).reason, "stageInactive");
    assert.equal(E(normal).getHeartCircle(), null);
});

test("一時停止: eventsPaused の間は当たり判定も進まず(重なっていても被弾しない)、再開すると続きから1回だけ当たる", () => {
    const w = hitWorld();
    const heart = plain(E(w).getHeartCircle()), hp0 = hpOf(w);
    w.ctx.$gameMap.eventsPaused = true;
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 60);
    assert.equal(hpOf(w), hp0, "停止中は当たらない");
    assert.equal(bullets(w).length, 1);
    w.ctx.$gameMap.eventsPaused = false; frames(w, 1);
    assert.equal(hpOf(w), hp0 - 25, "再開すると1回だけ");
    assert.equal(bullets(w).length, 0);
    w.soul.end("t");
});

test("解像度: 解像度を変えても、ハートの当たり円は画面のハートの位置に追従し、同じ割合のずれで同じ当たり / 外れになる", () => {
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [2560, 1440], [1000, 700]]) {
        const w = hitWorld();
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 2); mouseAt(w, 0.3, 0.6); frames(w, 2);
        const heart = plain(E(w).getHeartCircle()), r = E(w).rect(), scr = plain(w.stage.getPlayerHeart());
        assert.ok(Math.abs((scr.x - r.screen.x) / r.screen.w - heart.x) < 1e-9 && Math.abs((scr.y - r.screen.y) / r.screen.w - heart.y) < 1e-9, `${gw}x${gh}: 当たり円の中心 = 画面のハートの位置`);
        const reach = E(w).UNIT.bulletRadius + heart.r, hp0 = hpOf(w);
        placeStill(w, heart, 0, reach - 0.0005); frames(w, 1);
        assert.equal(hpOf(w), hp0 - 25, `${gw}x${gh}: 内側は当たり`);
        placeStill(w, heart, 0, reach + 0.0005); frames(w, 1);
        assert.equal(hpOf(w), hp0 - 25, `${gw}x${gh}: 外側は外れ`);
        w.soul.end("t");
    }
});

test("見た目の反応: 被弾した位置に赤い輪(約24フレームで消える)と効果音。DEFENSE の終わり・abort で残らない。feedback を切れば出ない", () => {
    const w = hitWorld();
    let se = 0; const orig = w.ctx.SoundManager.playActorDamage; w.ctx.SoundManager.playActorDamage = function() { se++; return orig && orig.apply(this, arguments); };
    const heart = plain(E(w).getHeartCircle());
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 2);
    assert.equal(plain(E(w).getFeedback()).length, 1, "輪が出る");
    assert.equal(se, 1, "効果音");
    assert.ok(layerChildren(w) >= 1);
    frames(w, 30);
    assert.equal(plain(E(w).getFeedback()).length, 0, "約24フレームで消える");
    E(w).devSpawn({ x: heart.x, y: heart.y }); frames(w, 2);
    assert.equal(plain(E(w).getFeedback()).length, 1);
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(plain(E(w).getFeedback()).length, 0, "DEFENSE の終わりで残らない");
    assert.equal(layerChildren(w), 0);
    const w2 = hitWorld(); E(w2).setConfig({ feedback: false });
    const h2 = plain(E(w2).getHeartCircle()); E(w2).devSpawn({ x: h2.x, y: h2.y }); frames(w2, 2);
    assert.equal(plain(E(w2).getFeedback()).length, 0, "feedback を切ると出ない");
    const w3 = hitWorld(); const h3 = plain(E(w3).getHeartCircle()); E(w3).devSpawn({ x: h3.x, y: h3.y }); frames(w3, 2);
    w3.soul.end("abort"); frames(w3, 2);
    assert.equal(plain(E(w3).getFeedback()).length, 0, "abort で残らない");
    w.soul.end("t"); w2.soul.end("t");
});

test("DEV の弾幕との組み合わせ: 警告 → 扇の弾が当たると、当たった弾だけ消えて、他の弾は飛び続ける。警告と弾道は変わらない。ヒットしないよう避ければ HP は変わらない", () => {
    const w = ebWorld({ defenseSeconds: 60 });
    E(w).setConfig({ collision: true, damage: 10 });
    E(w).enable({ pattern: "dev_fan", cutIn: false });
    mouseAt(w, 0.5, 0.9); toPhase(w, "defense"); mouseAt(w, 0.5, 0.9); frames(w, 3);
    const tele = plain(E(w).getTelegraphs()), hp0 = hpOf(w);
    assert.equal(tele.length, 7);
    for (let i = 0; i < 400 && es(w).running; i++) frames(w, 1);
    const hits = es(w).stats.hits;
    assert.ok(hits >= 1, "中心の弾はハートに当たる: " + hits);
    assert.equal(hp0 - hpOf(w), hits * 10, "HP の減りは当たった弾の数 x 10");
    assert.ok(es(w).stats.spawned - hits >= 7, "他の弾は消えずに飛んだ");
    w.soul.end("t");
    // 避ける: 警告のあとにハートを扇の隙間(外側)へ動かす → 当たらない
    const w2 = ebWorld({ defenseSeconds: 60 });
    E(w2).setConfig({ collision: true, damage: 10 });
    E(w2).enable({ pattern: "dev_fan", cutIn: false });
    mouseAt(w2, 0.5, 0.9); toPhase(w2, "defense"); mouseAt(w2, 0.5, 0.9); frames(w2, 3);
    const hpA = hpOf(w2); mouseAt(w2, 0.566, 0.9); frames(w2, 2);              // 扇の隣り合う弾(15度)の間(中心の弾と隣の弾の真ん中)へ
    for (let i = 0; i < 400 && es(w2).running; i++) frames(w2, 1);
    assert.equal(es(w2).stats.hits, 0, "扇の隙間へ避ければ当たらない");
    assert.equal(hpOf(w2), hpA);
    w2.soul.end("t");
});

// ================================================================ I4-B3: ボスの弾幕(狙い撃ち・扇・放射波)とフェーズに合わせた選択 ================================================================
const BOSS_ID = "dev_boss_soul";
const MIN_WARN = 24;
const REF_SPEED = 0.5;            // 「避けられる」の基準: ハートが戦闘エリアの幅の半分を1秒で動く速さ(マウスなら楽に出せる、控えめな想定)
const DEG = Math.PI / 180;
const mouseTo = (w, cx, cy) => { const box = plain(w.stage.getBattleBox()), m = plain(w.stage.toStage(box.x + cx * box.w, box.y + cy * box.w)); w.mouse(Math.round(m.x), Math.round(m.y)); };     // 戦闘エリアの幅単位(x: 0〜1, y: 0〜9/16)の画面位置へ(画面 → ステージ座標に直して TouchInput へ)。フレームは進めない
const heartTo = (w, u, v) => { mouseTo(w, u, v * 9 / 16); frames(w, 2); };       // 戦闘エリアに対する割合(横 0〜1, 縦 0〜1)で本物のハートを動かす
const gitDiffers = file => { try { cp.execFileSync("git", ["diff", "--quiet", "HEAD", "--", file], { cwd: project }); return false; } catch (error) { return error.status === 1; } };
const defWorld = (extra = {}, { collision = false } = {}) => {
    const w = ebWorld({ defenseSeconds: 60, ...extra });
    E(w).setConfig({ collision, damage: 25 });
    heartTo(w, 0.5, 0.5); toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 3);
    return w;
};
const planEntries = w => { const out = []; plain(E(w).DEFAULT_PLAN).phases.forEach((ph, pi) => ph.rotation.forEach((e, ei) => out.push({ phase: pi, entry: ei, pattern: e.pattern, options: e.options || {} }))); return out; };
// 表の1項目を、本物の選択(pickPattern)と同じ補正(警告は最低24フレーム)で解決する
const resolveEntry = (w, e) => {
    assert.equal(plain(E(w).registerPlan(BOSS_ID, { phases: [{ id: "t", rotation: [{ pattern: e.pattern, options: e.options }] }] })).ok, true);
    const pick = plain(E(w).pickPattern()); E(w).unregisterPlan(BOSS_ID);
    return pick;
};
const record = (w, pattern, options = {}, { maxFrames = 400 } = {}) => {
    const res = plain(E(w).fire(pattern, { cutIn: false, ...options }));
    assert.equal(res.ok, true, JSON.stringify(res));
    const rec = { res, tele0: plain(E(w).getTelegraphs()), frames: [], tele: [] };
    for (let i = 0; i < maxFrames && es(w).running; i++) { frames(w, 1); rec.frames.push(bullets(w)); rec.tele.push(plain(E(w).getTelegraphs())); }
    assert.equal(es(w).running, false, pattern + ": 弾幕が終わる");
    return rec;
};
const spawnsOf = rec => { const seen = new Set(), out = []; rec.frames.forEach((fr, f) => { const fresh = fr.filter(b => !seen.has(b.id)); fresh.forEach(b => seen.add(b.id)); if (fresh.length) out.push({ age: f + 1, bullets: fresh }); }); return out; };
const angleOf = b => Math.atan2(b.vy, b.vx);
const segDist = (ax, ay, bx, by, px, py) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0; return Math.hypot(ax + dx * t - px, ay + dy * t - py); };

// ---- 避けられるかの探索(厳密な到達可能性): 戦闘エリアを格子にして、3フレームごとに隣へ動ける(REF_SPEED)ハートが、弾(線分)に一度も触れずに最後まで生き残れる経路があるか ----
function solveDodge(rec, { start, speed = REF_SPEED, grid = 64, margin = 0.008, heartHit = 0.007, hop = 3 }) {
    const nx = grid, ny = Math.round(grid * 9 / 16), cell = 1 / grid, N = nx * ny;
    const cx = i => (i % nx + 0.5) * cell, cy = i => (Math.floor(i / nx) + 0.5) * cell, lo = 0.014;
    const allowed = new Uint8Array(N); for (let i = 0; i < N; i++) allowed[i] = cx(i) >= lo && cx(i) <= 1 - lo && cy(i) >= lo && cy(i) <= 9 / 16 - lo ? 1 : 0;
    const radius = speed * hop / 60 / cell, R = Math.floor(radius), offs = [];
    for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) if (di * di + dj * dj <= radius * radius + 1e-9) offs.push([di, dj]);
    const hops = Math.ceil(rec.frames.length / hop) + 1;
    let cache = null, cacheHop = -1;
    const safe = (h, idx) => {
        if (cacheHop !== h) { cache = new Int8Array(N); cacheHop = h; }
        if (cache[idx] !== 0) return cache[idx] > 0;
        let ok = true;
        for (let f = h * hop; ok && f < Math.min(rec.frames.length, (h + 1) * hop); f++) for (const b of rec.frames[f]) if (segDist(b.x - b.vx, b.y - b.vy, b.x, b.y, cx(idx), cy(idx)) <= b.r + heartHit + margin) { ok = false; break; }
        cache[idx] = ok ? 1 : -1; return ok;
    };
    const startI = Math.min(nx - 1, Math.floor(start.x / cell)) + nx * Math.min(ny - 1, Math.floor(start.y / cell));
    let cur = new Map([[startI, -1]]); const parents = [cur];
    for (let h = 1; h < hops; h++) {
        const next = new Map();
        for (const idx of cur.keys()) {
            const ci = idx % nx, cj = Math.floor(idx / nx);
            for (const [di, dj] of offs) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const k = i + j * nx; if (next.has(k) || !allowed[k] || !safe(h, k)) continue; next.set(k, idx); }
        }
        parents.push(next); cur = next;
        if (!cur.size) return { ok: false, failedHop: h, hops };
    }
    let idx = cur.keys().next().value; const path = new Array(hops);
    for (let h = hops - 1; h >= 0; h--) { path[h] = { x: cx(idx), y: cy(idx) }; idx = parents[h].get(idx); }
    return { ok: true, path, hop, hops };
}
// 探索の経路を、実エンジンのハート(マウス)でそのままなぞる
function replay(w, sol, total, lag = 0) {
    for (let f = 0; f < total; f++) { const h = Math.min(sol.path.length - 1, Math.floor(Math.max(0, f - lag) / sol.hop)); mouseTo(w, sol.path[h].x, sol.path[h].y); frames(w, 1); }
}
// 狙い撃ち用の避け方: 警告の線・飛んでいる弾の進路(直線)からの距離が十分大きい「目的地」を近くから選び(その場・近く・遠くの 24 方向)、そこへ 1 フレームに基準の速さぶんだけ向かう。壁際や複数の線に挟まれたときは、開けた所へ出る。
function sidestep(w, { speed = REF_SPEED, cap = 0.09 } = {}) {
    const heart = plain(E(w).getHeartCircle());
    const rays = [];
    for (const t of plain(E(w).getTelegraphs())) rays.push({ ox: t.origin.x, oy: t.origin.y, dx: Math.cos(t.angle), dy: Math.sin(t.angle) });
    for (const b of bullets(w)) { const sp = Math.hypot(b.vx, b.vy); if (sp > 0) rays.push({ ox: b.x, oy: b.y, dx: b.vx / sp, dy: b.vy / sp }); }
    const clearanceAt = (x, y) => { let c = cap; for (const ray of rays) { const ex = x - ray.ox, ey = y - ray.oy, along = ex * ray.dx + ey * ray.dy; if (along < -0.03) continue; c = Math.min(c, Math.abs(ex * -ray.dy + ey * ray.dx)); } return c; };
    const here = clearanceAt(heart.x, heart.y);
    if (here >= cap) { mouseTo(w, heart.x, heart.y); return; }
    let best = { x: heart.x, y: heart.y, score: here };
    for (const dist of [0.02, 0.05, 0.1, 0.18, 0.3]) for (let k = 0; k < 24; k++) {
        const x = Math.max(0.016, Math.min(0.984, heart.x + Math.cos(k * Math.PI / 12) * dist)), y = Math.max(0.016, Math.min(9 / 16 - 0.016, heart.y + Math.sin(k * Math.PI / 12) * dist));
        const score = clearanceAt(x, y) - 0.1 * Math.hypot(x - heart.x, y - heart.y);
        if (score > best.score + 1e-9) best = { x, y, score };
    }
    const dx = best.x - heart.x, dy = best.y - heart.y, len = Math.hypot(dx, dy), step = Math.min(len, speed / 60);
    mouseTo(w, len > 0 ? heart.x + dx / len * step : heart.x, len > 0 ? heart.y + dy / len * step : heart.y);
}

test("B3 3種の弾幕: 警告の線が先に出てから弾が出る。出す時刻・数・向き・速さが設定どおりで、弾道は警告の線と一致し、最後はすべて消える", () => {
    const expected = {
        dev_fan: { ages: [60, 100], counts: [7, 7], speed: 0.3, kind: "fan" },
        dev_aimed: { ages: [40, 76, 112], counts: [1, 1, 1], speed: 0.42, kind: "aimed" },
        dev_radial: { ages: [50, 88, 126], counts: [13, 12, 13], speed: 0.34, kind: "radial" }
    };
    for (const [name, exp] of Object.entries(expected)) {
        const w = defWorld();
        const rec = record(w, name);
        assert.equal(rec.res.kind, exp.kind);
        const spawns = spawnsOf(rec);
        assert.deepEqual(spawns.map(s => s.age), exp.ages, name + ": 出す時刻");
        assert.deepEqual(spawns.map(s => s.bullets.length), exp.counts, name + ": 数");
        const first = exp.ages[0] - 1;
        assert.ok(first + 1 >= MIN_WARN, name + ": 警告は " + MIN_WARN + " フレーム以上");
        assert.ok(rec.tele0.length > 0 && rec.tele.slice(0, first).every(t => t.length > 0), name + ": 最初の弾が出るまで、警告の線が出続ける");
        assert.ok(rec.frames.slice(0, first).every(fr => fr.length === 0), name + ": 警告の間は弾が無い(危険なものが無い)");
        assert.ok(rec.tele[0].every(t => t.hasSprite && t.pattern === name), name + ": 警告の絵がある");
        // 弾道 = 警告の線(出る直前のフレームの警告のどれかと同じ向き)、速さ = 設定
        for (const s of spawns) {
            const before = s.age >= 2 ? rec.tele[s.age - 2] : rec.tele0;
            for (const b of s.bullets) {
                assert.ok(before.some(t => Math.abs(t.angle - angleOf(b)) < 1e-9), `${name}: ${s.age} フレームの弾道は警告の線と一致`);
                assert.ok(Math.abs(Math.hypot(b.vx, b.vy) * 60 - exp.speed) < 1e-9, name + ": 速さ");
                assert.equal(b.owner, "enemy");
            }
        }
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running, es(w).stats.patterns], [0, 0, false, 1], name + ": 最後は何も残らない");
        assert.equal(layerChildren(w), 0, name + ": 絵が残らない");
        w.soul.end("t");
    }
    // 放射波: 下向きの半円(168°)を14°刻み。1・3波目は同じ向き、2波目はその間(半分ずれ)。波ごとの警告は撃つ34フレーム前から
    const w = defWorld(), rec = record(w, "dev_radial"), sp = spawnsOf(rec);
    const degs = s => s.bullets.map(b => angleOf(b) / DEG).sort((a, b) => a - b);
    const w0 = degs(sp[0]), w1 = degs(sp[1]), w2 = degs(sp[2]);
    w0.forEach((d, i) => assert.ok(Math.abs(d - (6 + 14 * i)) < 1e-6, "1波目 " + i + ": " + d));
    w1.forEach((d, i) => assert.ok(Math.abs(d - (13 + 14 * i)) < 1e-6, "2波目 " + i + ": " + d));
    assert.deepEqual(w2.map(d => +d.toFixed(6)), w0.map(d => +d.toFixed(6)), "3波目は1波目と同じ向き");
    assert.deepEqual([rec.tele0.length, rec.tele[48].length, rec.tele[49].length, rec.tele[52].length, rec.tele[53].length, rec.tele[86].length, rec.tele[87].length, rec.tele[90].length, rec.tele[91].length], [13, 13, 0, 0, 12, 12, 0, 0, 13], "波ごとの警告は撃つ 34 フレーム前に出て、撃ったら消える");
    w.soul.end("t");
    // 設定(options)が効く: 速さ・発数・間隔・警告の長さ・本数・開き
    const wo = defWorld(), ro = record(wo, "dev_aimed", { speed: 0.6, shots: 2, shotGap: 20, warnFrames: 30 }), so = spawnsOf(ro);
    assert.deepEqual(so.map(s => s.age), [30, 50], "狙い撃ち: 発数 2・間隔 20・警告 30");
    assert.ok(so.every(s => Math.abs(Math.hypot(s.bullets[0].vx, s.bullets[0].vy) * 60 - 0.6) < 1e-9), "狙い撃ち: 速さ 0.6");
    wo.soul.end("t");
    const wr = defWorld(), rr = record(wr, "dev_radial", { count: 5, arcDeg: 120, waves: 2, waveGap: 30, warnFrames: 35, waveWarn: 28, speed: 0.4 }), sr = spawnsOf(rr);
    assert.deepEqual(sr.map(s => [s.age, s.bullets.length]), [[35, 5], [65, 4]], "放射波: 2波・5本(2波目は4本)・警告 35・間隔 30");
    assert.deepEqual(sr[0].bullets.map(b => Math.round(angleOf(b) / DEG)).sort((a, b) => a - b), [30, 60, 90, 120, 150], "放射波: 開き 120°");
    assert.deepEqual(sr[1].bullets.map(b => Math.round(angleOf(b) / DEG)).sort((a, b) => a - b), [45, 75, 105, 135]);
    assert.ok(sr.every(s => s.bullets.every(b => Math.abs(Math.hypot(b.vx, b.vy) * 60 - 0.4) < 1e-9)), "放射波: 速さ 0.4");
    assert.deepEqual([rr.tele0.length, rr.tele[35].length, rr.tele[36].length], [5, 0, 4], "放射波: 2波目の警告は撃つ 28 フレーム前(65 − 28 = 37 フレーム目)に出る");
    wr.soul.end("t");
    // 狙い撃ち: 1発ごとに、その瞬間のハートへ。次の弾の警告は前の弾が出る前に始まる(36フレーム間隔)
    const wa = defWorld(); heartTo(wa, 0.5, 0.5);
    plain(E(wa).fire("dev_aimed", { cutIn: false }));
    const a0 = plain(E(wa).getTelegraphs()); assert.equal(a0.length, 1);
    frames(wa, 10); heartTo(wa, 0.2, 0.5);                                 // 1発目の警告の途中で動いても、1発目の向きは動かない(警告の開始で固定)
    assert.ok(Math.abs(plain(E(wa).getTelegraphs()).find(t => t.id === a0[0].id).angle - a0[0].angle) < 1e-12, "警告の向きは固定");
    frames(wa, 26);                                                        // 2発目の警告は 36 フレーム目に始まる(1発目は 40 フレーム目に撃つ前)
    const t1 = plain(E(wa).getTelegraphs()).filter(t => t.id !== a0[0].id);
    assert.ok(t1.length >= 1, "2発目の警告が前の弾の前に始まっている");
    const h = plain(E(wa).getHeartCircle());
    const o = t1[0].origin, expect1 = Math.max(Math.PI / 6, Math.min(Math.PI * 5 / 6, Math.atan2(h.y - o.y, h.x - o.x)));
    assert.ok(Math.abs(t1[0].angle - expect1) < 0.05, `2発目は警告の開始のハートへ向く: ${t1[0].angle} / ${expect1}`);
    wa.soul.end("t");
});

test("B3 避けられる隙間の基準と長さ: 隣り合う弾の向きの間隔は、出る位置から 0.28 幅の所でハートが余裕をもって通れる広さ。どの弾幕も最後の弾を撃ってから1秒以上、標準の4秒の DEFENSE の中で飛べる", () => {
    const w = defWorld();
    const entries = planEntries(w);
    assert.ok(entries.length >= 6);
    const reach = 0.011 + 0.014 * 0.5, visualDiameter = 2 * 0.014;
    for (const e of entries) {
        const pick = resolveEntry(w, e);
        assert.ok(pick.options.warnFrames >= MIN_WARN, e.pattern + ": 警告は最低 " + MIN_WARN + " フレーム: " + pick.options.warnFrames);
        if (pick.options.waveWarn !== undefined) assert.ok(pick.options.waveWarn >= MIN_WARN);
        const rec = record(w, pick.pattern, pick.options);
        const lastFire = spawnsOf(rec).pop().age;
        assert.ok(lastFire + 60 <= 235 && rec.frames.length <= 260, `${e.pattern}(フェーズ${e.phase + 1}-${e.entry}): 最後の弾を撃ってから少なくとも1秒は飛べる(撃つのは ${lastFire} フレーム目。全体 ${rec.frames.length})`);      // 4秒の DEFENSE(240フレーム)に収まる。端で飛び残った弾は DEFENSE の終わりに片づく
        if (rec.res.kind !== "aimed") {
            for (const s of spawnsOf(rec)) {
                const a = s.bullets.map(angleOf).sort((p, q) => p - q);
                for (let i = 1; i < a.length; i++) assert.ok(0.28 * (a[i] - a[i - 1]) - 2 * reach >= visualDiameter - 1e-9, `${e.pattern}(フェーズ${e.phase + 1}-${e.entry}): 0.28 幅の所で隣の弾との隙間 ${(0.28 * (a[i] - a[i - 1]) - 2 * reach).toFixed(4)} がハートの直径以上`);
            }
        }
    }
    w.soul.end("t");
});

test("B3 避けられる: 扇・放射波は、探索で『ハートを基準の速さで動かせば一度も当たらない経路』が見つかり、その経路を実エンジンのハートでなぞると HP は変わらない。動かなければ当たる(本物の脅威)", () => {
    const w0 = defWorld();
    const entries = planEntries(w0).filter(e => e.pattern !== "dev_aimed");
    w0.soul.end("t");
    assert.ok(entries.length >= 3);
    let solved = 0;
    for (const e of entries) {
        const probe = defWorld(); const pick = resolveEntry(probe, e);
        const start = plain(E(probe).getHeartCircle());
        const rec = record(probe, pick.pattern, pick.options); probe.soul.end("t");
        const sol = solveDodge(rec, { start });
        assert.equal(sol.ok, true, `${e.pattern}(フェーズ${e.phase + 1}-${e.entry}): 避けられる経路がある(失敗 hop ${sol.failedHop}/${sol.hops})`);
        // 実エンジンでなぞる(当たり判定あり)
        const run = defWorld({}, { collision: true }), hp0 = hpOf(run);
        assert.equal(plain(E(run).fire(pick.pattern, { cutIn: false, ...pick.options })).ok, true);
        replay(run, sol, rec.frames.length);
        assert.equal(es(run).stats.hits, 0, `${e.pattern}(フェーズ${e.phase + 1}-${e.entry}): なぞると一度も当たらない`);
        assert.equal(hpOf(run), hp0);
        run.soul.end("t");
        // 動かなければ当たる
        const idle = defWorld({}, { collision: true }), hpI = hpOf(idle);
        assert.equal(plain(E(idle).fire(pick.pattern, { cutIn: false, ...pick.options })).ok, true);
        frames(idle, rec.frames.length);
        assert.ok(es(idle).stats.hits >= 1, `${e.pattern}(フェーズ${e.phase + 1}-${e.entry}): 動かなければ当たる`);
        assert.equal(hpOf(idle), hpI - 25 * es(idle).stats.hits);
        idle.soul.end("t");
        solved++;
    }
    assert.equal(solved, entries.length);
    // 探索の器自体の確認: 探索が常に成功するわけではない。全面を覆う弾幕(5フレーム目から)は避けられず、弾が無ければ避けられ、ハートの周りだけ空いていれば避けられる
    const grid = (skip) => { const out = []; for (let x = 0; x <= 1.0001; x += 0.02) for (let y = 0; y <= 9 / 16 + 0.0001; y += 0.02) if (!skip || Math.hypot(x - 0.5, y - 0.3) > 0.1) out.push({ x, y, vx: 0, vy: 0, r: 0.011 }); return out; };
    const timeline = bs => ({ frames: Array.from({ length: 30 }, (_, f) => (f >= 5 ? bs : [])) });
    assert.equal(solveDodge(timeline(grid(false)), { start: { x: 0.5, y: 0.3 } }).ok, false, "全面を覆われたら避けられない");
    assert.equal(solveDodge(timeline([]), { start: { x: 0.5, y: 0.3 } }).ok, true, "弾が無ければ避けられる");
    assert.equal(solveDodge(timeline(grid(true)), { start: { x: 0.5, y: 0.3 } }).ok, true, "周りが空いていればその場で避けられる");
    assert.equal(solveDodge(timeline(grid(true)), { start: { x: 0.5, y: 0.3 }, speed: 0 }).ok, true);
    assert.equal(solveDodge(timeline(grid(true)), { start: { x: 0.9, y: 0.1 } }).ok, false, "空きから遠い所にいて、速さの範囲でそこへ行けなければ避けられない");
});

test("B3 狙い撃ちを避ける: 警告の線・弾の進路から離れる単純な動きで、どの位置から始めても(出る位置のすぐ下でも、端でも)当たらない。動かなければ当たる。3フェーズ分の設定すべて", () => {
    const w0 = defWorld();
    const entries = planEntries(w0).filter(e => e.pattern === "dev_aimed");
    w0.soul.end("t");
    assert.equal(entries.length, 3);
    const starts = [[0.5, 0.28], [0.5, 0.5], [0.05, 0.5], [0.95, 0.1], [0.5, 0.1], [0.3, 0.05], [0.7, 0.4]];
    for (const e of entries) {
        for (const [sx, sy] of starts) {
            const w = defWorld({}, { collision: true }); const pick = resolveEntry(w, e);
            mouseTo(w, sx, sy); frames(w, 2);
            const hp0 = hpOf(w);
            assert.equal(plain(E(w).fire(pick.pattern, { cutIn: false, ...pick.options })).ok, true);
            for (let i = 0; i < 400 && es(w).running; i++) { sidestep(w); frames(w, 1); }
            assert.equal(es(w).running, false);
            assert.equal(es(w).stats.hits, 0, `フェーズ${e.phase + 1}の狙い撃ち(${pick.options.shots || 3}発) 開始(${sx},${sy}): 当たらない`);
            assert.equal(hpOf(w), hp0);
            w.soul.end("t");
        }
        const idle = defWorld({}, { collision: true }); const pick = resolveEntry(idle, e);
        assert.equal(plain(E(idle).fire(pick.pattern, { cutIn: false, ...pick.options })).ok, true);
        for (let i = 0; i < 400 && es(idle).running; i++) frames(idle, 1);
        assert.ok(es(idle).stats.hits >= 1, "動かなければ当たる");
        idle.soul.end("t");
    }
});

test("B3 フェーズに合わせた選択: BossFramework のフェーズごとに表の弾幕が選ばれ、同じフェーズでは DEFENSE ごとに巡回、フェーズが変わると先頭へ。BossFramework は読み取りだけ", () => {
    const w = ebWorld({ defenseSeconds: 4 });
    assert.equal(plain(E(w).enableBoss({ cutIn: false })).ok, true);
    const bf = w.bf, max = plain(bf.getState()).maxHp;
    assert.ok(max > 0 && plain(bf.getState()).phaseIndex === 0);
    const round = () => { toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 6); const st = es(w); const pick = st.lastPick; const tele = st.telegraphs, cfgWaves = st.runner && st.runner.waves; const name = st.runner && st.runner.name; toPhase(w, "prepare"); return { pick, tele, waves: cfgWaves, name }; };
    const seq = [];
    seq.push(round(), round());                                         // フェーズ1(第一形態)
    bf.setHp(max * 0.6);                                                // → フェーズ2
    assert.equal(plain(bf.getState()).phaseIndex, 1);
    seq.push(round(), round(), round());
    bf.setHp(max * 0.3);                                                // → フェーズ3
    assert.equal(plain(bf.getState()).phaseIndex, 2);
    seq.push(round(), round(), round(), round());
    const names = seq.map(r => r.pick && r.pick.pattern);
    assert.deepEqual(names, ["dev_aimed", "dev_aimed", "dev_fan", "dev_aimed", "dev_fan", "dev_radial", "dev_fan", "dev_aimed", "dev_radial"]);
    assert.deepEqual(seq.map(r => r.name), names, "実際に走った弾幕も選ばれたもの");
    assert.deepEqual(seq.map(r => r.pick.phaseIndex), [0, 0, 1, 1, 1, 2, 2, 2, 2]);
    assert.deepEqual(seq.map(r => r.pick.phaseId), ["phase1", "phase1", "phase2", "phase2", "phase2", "phase3", "phase3", "phase3", "phase3"]);
    assert.deepEqual(seq.map(r => r.pick.entryIndex), [0, 0, 0, 1, 0, 0, 1, 2, 0], "同じフェーズの中は巡回、フェーズが変わると先頭");
    assert.deepEqual(seq.map(r => r.tele), [1, 1, 7, 1, 7, 13, 9, 1, 13], "警告の本数(狙い 1 / 扇 7・9 / 放射 13)");
    assert.equal(seq[3].pick.options.shots, 4); assert.equal(seq[7].pick.options.shots, 5); assert.equal(seq[6].pick.options.count, 9);
    assert.ok(seq.every(r => r.pick.bossActive && r.pick.bossId === BOSS_ID && r.pick.options.warnFrames >= MIN_WARN));
    assert.ok(seq.every(r => r.pick.bossPhaseIndex === r.pick.phaseIndex), "BossFramework の phaseIndex を読んだ値");
    const events = es(w).bossPhaseEvents;
    assert.deepEqual(events.map(e => [e.from, e.to, e.phaseId]), [[0, 1, "phase2"], [1, 2, "phase3"]], "onPhase を受けた記録");
    assert.equal(es(w).stats.picks, 9);
    w.soul.end("t");
    // 一気に2段飛ぶ(第三形態へ): 先頭の放射波
    const wj = ebWorld({ defenseSeconds: 4 });
    E(wj).enableBoss({ cutIn: false });
    wj.bf.setHp(plain(wj.bf.getState()).maxHp * 0.1);
    assert.equal(plain(wj.bf.getState()).phaseIndex, 2);
    toPhase(wj, "defense"); heartTo(wj, 0.5, 0.5); frames(wj, 6);
    assert.equal(es(wj).runner.name, "dev_radial");
    assert.deepEqual(es(wj).bossPhaseEvents.map(e => [e.from, e.to]), [[0, 1], [1, 2]]);
    wj.soul.end("t");
    // BossFramework 自体は変えていない(読み取りだけ): ファイルは HEAD と同じ
    for (const f of ["js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_SoulBattleStage.js", "js/plugins/ProjectR_SoulBattleHUD.js", "js/plugins/ProjectR_SoulBattleDodge.js", "js/plugins/ProjectR_SoulBattleInput.js", "js/plugins/ProjectR_CutIn.js", "js/plugins/ProjectR_SoulMana.js", "js/plugins/ProjectR_SoulLoopHand.js", "js/plugins/ProjectR_DamageModifiers.js"]) assert.equal(gitDiffers(f), false, f + " は変更していない");
});

test("B3 フェーズの境目と例外: 弾幕の途中でフェーズが変わってもいまの弾幕はそのまま終わり、次の DEFENSE から新しい表。ボスが無ければ第一形態の表、表より先のフェーズは最後の表、独自の表は登録できる", () => {
    const w = ebWorld({ defenseSeconds: 60 });
    E(w).enableBoss({ cutIn: false });
    toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 20);
    const before = es(w), idsBefore = plain(E(w).getTelegraphs()).map(t => t.id);
    assert.equal(before.runner.name, "dev_aimed");
    w.bf.setHp(plain(w.bf.getState()).maxHp * 0.6);                      // 弾幕の途中でフェーズ2へ
    frames(w, 1);
    const mid = es(w);
    assert.equal(mid.runner.name, "dev_aimed", "いまの弾幕は変わらない");
    assert.equal(mid.lastPick.pattern, "dev_aimed");
    assert.equal(mid.bossPhaseEvents[0].runnerActive, true);
    assert.ok(plain(E(w).getTelegraphs()).map(t => t.id).includes(idsBefore[0]), "警告も続く");
    for (let i = 0; i < 400 && es(w).running; i++) frames(w, 1);
    assert.equal(es(w).stats.spawned, 3, "狙い撃ち 3発のまま(扇には切り替わらない)");
    assert.equal(es(w).stats.patterns, 1);
    toPhase(w, "prepare"); toPhase(w, "attack"); toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 6);
    assert.equal(es(w).runner.name, "dev_fan", "次の DEFENSE から新しいフェーズの表");
    // ボスが無い(BossFramework が無い)ときは第一形態の表
    const saved = w.ctx.ProjectRBossFramework;
    w.ctx.ProjectRBossFramework = undefined;
    const noBoss = plain(E(w).pickPattern());
    assert.deepEqual([noBoss.bossActive, noBoss.phaseIndex, noBoss.pattern, noBoss.bossId], [false, 0, "dev_aimed", ""]);
    // 表より先のフェーズ番号 → 最後の表
    w.ctx.ProjectRBossFramework = { getState: () => ({ bossId: "other", phaseIndex: 7, phase: { id: "phase8" } }), onPhase: () => () => {} };
    const far = plain(E(w).pickPattern());
    assert.deepEqual([far.phaseIndex, far.bossPhaseIndex, far.phaseId, far.bossId], [2, 7, "phase3", "other"]);
    w.ctx.ProjectRBossFramework = saved;
    // 独自の表(ボスごと)。不正な表は拒否
    assert.deepEqual(plain(E(w).registerPlan(BOSS_ID, { phases: [{ id: "x", rotation: [{ pattern: "nope" }] }] })), { ok: false, reason: "invalidPlan" });
    assert.deepEqual(plain(E(w).registerPlan(BOSS_ID, { phases: [] })), { ok: false, reason: "invalidPlan" });
    assert.deepEqual(plain(E(w).registerPlan("", { phases: [{ id: "x", rotation: [{ pattern: "dev_fan" }] }] })), { ok: false, reason: "invalidBossId" });
    assert.equal(plain(E(w).registerPlan(BOSS_ID, { phases: [{ id: "x", rotation: [{ pattern: "dev_radial", options: { waves: 1, count: 5, warnFrames: 3 } }] }] })).ok, true);
    const custom = plain(E(w).pickPattern());
    assert.deepEqual([custom.pattern, custom.phaseId, custom.options.waves, custom.options.count, custom.options.warnFrames], ["dev_radial", "x", 1, 5, MIN_WARN], "警告は最低 " + MIN_WARN + " に補正される");
    assert.deepEqual(plain(E(w).getPlan(BOSS_ID)).phases[0].rotation[0].options, { waves: 1, count: 5, warnFrames: 3 }, "登録した表はそのまま読める");
    E(w).unregisterPlan(BOSS_ID);
    assert.equal(plain(E(w).pickPattern()).phaseId, "phase2");
    w.soul.end("t");
});

test("B3 二重に予約しない: 1回の DEFENSE で自動に始める弾幕は1つ。enable / enableBoss を何度呼んでも、終わった後に呼び直しても、手動の fire が走っていても増えない。DEFENSE ごとに1つ", () => {
    const w = ebWorld({ defenseSeconds: 60 });
    E(w).enableBoss({ cutIn: false }); E(w).enableBoss({ cutIn: false });
    toPhase(w, "defense"); heartTo(w, 0.5, 0.5);
    E(w).enableBoss({ cutIn: false });                                   // 始まる前にも
    frames(w, 6);
    assert.deepEqual([es(w).stats.patterns, es(w).stats.picks, es(w).defenseSerial, es(w).autoStartedFor], [1, 1, 1, 1]);
    assert.equal(plain(E(w).fire("dev_fan", { cutIn: false })).reason, "patternRunning", "走っている間の fire は拒否");
    for (let i = 0; i < 400 && es(w).running; i++) frames(w, 1);
    assert.equal(es(w).stats.spawned, 3);
    E(w).enableBoss({ cutIn: false }); E(w).enable({ pattern: "dev_fan", cutIn: false }); E(w).enable({ pattern: "dev_fan", cutIn: false });
    frames(w, 120);
    assert.deepEqual([es(w).stats.patterns, es(w).stats.spawned, es(w).running], [1, 3, false], "終わったあとに呼び直しても、同じ DEFENSE では始まらない");
    E(w).enableBoss({ cutIn: false });
    toPhase(w, "prepare"); toPhase(w, "attack"); toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 6);
    assert.deepEqual([es(w).stats.patterns, es(w).defenseSerial, es(w).autoStartedFor], [2, 2, 2], "次の DEFENSE で1つ");
    assert.notEqual(es(w).lastPick, null);
    toPhase(w, "prepare"); E(w).disable(); toPhase(w, "attack"); toPhase(w, "defense"); frames(w, 60);
    assert.equal(es(w).stats.patterns, 2, "無効にすれば始まらない");
    w.soul.end("t"); frames(w, 2);
    assert.deepEqual([es(w).defenseSerial, es(w).autoStartedFor, es(w).lastPick], [0, -1, null], "SOUL の終了で DEFENSE の通し番号・予約・選択の記録が戻る");
    // 手動の fire が走っているところへ自動開始が来ても、二重にならない(自動は拒否され、その DEFENSE は予約済みにならない)
    const w2 = ebWorld({ defenseSeconds: 60 });
    toPhase(w2, "defense"); heartTo(w2, 0.5, 0.5);
    assert.equal(plain(E(w2).fire("dev_aimed", { cutIn: false })).ok, true);
    E(w2).enableBoss({ cutIn: false }); frames(w2, 6);
    assert.equal(es(w2).stats.patterns, 1, "手動の弾幕が走っていれば、自動は重ねない");
    w2.soul.end("t");
});

test("B3 実際のHP: 弾幕の弾が動かないハートに当たると、既存のHP窓口を通って弾ごとに 25 ずつ減る。無敵時間は無く(BT-049)、近い所で複数の弾が同時に当たれば全部入る。下限 1 で止まり、敗北・ゲームオーバーにはならない(D13 未承認)", () => {
    for (const name of ["dev_fan", "dev_aimed", "dev_radial"]) {
        const w = defWorld({}, { collision: true }), hp0 = hpOf(w), spy = spyUpdatePlayerHp(w);
        record(w, name);
        const hits = es(w).stats.hits;
        assert.ok(hits >= 1, name + ": 動かないハートに当たる");
        assert.equal(hp0 - hpOf(w), hits * 25, name + ": 当たった弾の数 x 25");
        assert.deepEqual(spy.calls, Array(hits).fill("-25"), name + ": 既存のHP窓口を弾ごとに1回");
        assert.equal(plain(E(w).getHits()).length, hits);
        assert.ok(plain(E(w).getHits()).every(h => h.reason === "ok" && h.dealt === 25));
        spy.restore(); w.soul.end("t");
    }
    // BT-049: 近い所(出る位置の真下 0.064)では、放射波の隣り合う弾が同じ頃に全部当たる。無敵で抑えられず、弾ごとに25
    const w = defWorld({}, { collision: true }); mouseTo(w, 0.5, 0.075); frames(w, 2);
    const hp0 = hpOf(w), spy = spyUpdatePlayerHp(w);
    plain(E(w).fire("dev_radial", { cutIn: false, waves: 1 })); for (let i = 0; i < 160 && es(w).running; i++) frames(w, 1);
    const hits = plain(E(w).getHits());
    assert.ok(hits.length >= 3, "隣り合う3発以上が当たる: " + hits.length);
    assert.ok(Math.max(...hits.map(h => h.frame)) - Math.min(...hits.map(h => h.frame)) <= 2, "ほぼ同じフレームに当たっても全部入る(無敵なし)");
    assert.equal(hp0 - hpOf(w), hits.length * 25);
    assert.deepEqual(spy.calls, Array(hits.length).fill("-25"));
    spy.restore(); w.soul.end("t");
    // 有界: 巨大なダメージでも下限 1。3フェーズ分の弾幕を全部受けても、戦闘不能・PlayerDeath・ゲームオーバーにならず SOUL は続く
    const wb = ebWorld({ defenseSeconds: 4 });
    E(wb).setConfig({ collision: true, damage: 1000000, floorHp: 1 }); E(wb).enableBoss({ cutIn: false });
    for (let ph = 0; ph < 3; ph++) {
        if (ph > 0) wb.bf.setHp(plain(wb.bf.getState()).maxHp * (ph === 1 ? 0.6 : 0.3));
        toPhase(wb, "defense"); heartTo(wb, 0.5, 0.5); frames(wb, 230);
        assert.equal(hpOf(wb), 1, "フェーズ" + (ph + 1) + ": HP は下限 1");
        assert.equal(wb.ctx.$gameParty.leader().isDead(), false);
        assert.equal(wb.ctx.ProjectR.PlayerDeath.isDead(), false);
        assert.equal(wb.ctx.$gameParty.isAllDead(), false);
        assert.equal(wb.soul.isActive(), true);
        assert.equal(wb.ctx.SceneManager._scene.constructor.name, "Scene_Map");
        toPhase(wb, "prepare");
    }
    assert.ok(es(wb).stats.hitsAtFloor >= 1, "下限での被弾は dealt 0 として数える");
    wb.soul.end("t");
    // DEFENSE 以外では動かない: PREPARE / ATTACK の間は弾も無く、HP も変わらない
    const wd = ebWorld({ defenseSeconds: 60 });
    E(wd).setConfig({ collision: true }); E(wd).enableBoss({ cutIn: false });
    const hpD = hpOf(wd); frames(wd, 200); toPhase(wd, "attack"); frames(wd, 200);
    assert.deepEqual([hpOf(wd), es(wd).stats.spawned, es(wd).stats.hits], [hpD, 0, 0]);
    wd.soul.end("t");
});

test("B3 一時停止と再開: 停止中は警告の時計も弾も進まず、再開すると止めなかった場合と同じ結果になる(狙い撃ち・放射波・扇)", () => {
    const snap = w => JSON.stringify({ b: bullets(w).map(b => [b.id, b.x, b.y, b.age]), t: plain(E(w).getTelegraphs()).map(t => [t.id, t.angle, t.fireIn]), r: es(w).runner });
    for (const name of ["dev_aimed", "dev_radial", "dev_fan"]) {
        const c = defWorld(); plain(E(c).fire(name, { cutIn: false })); frames(c, 45); const c45 = snap(c); frames(c, 60); const c105 = snap(c);
        const p = defWorld(); plain(E(p).fire(name, { cutIn: false })); frames(p, 45);
        assert.equal(snap(p), c45, name + ": 停止前までは同じ");
        const spawned45 = es(p).stats.spawned;
        p.ctx.$gameMap.eventsPaused = true; frames(p, 70);
        assert.equal(snap(p), c45, name + ": 停止中は何も進まない");
        assert.ok(es(p).stats.pausedTicks >= 70);
        assert.equal(es(p).stats.spawned, spawned45, name + ": 停止中に発射しない");
        p.ctx.$gameMap.eventsPaused = false; frames(p, 60);
        assert.equal(snap(p), c105, name + ": 再開すると止めなかった場合と同じ(遅れ・二重の発射なし)");
        assert.equal(es(p).stats.spawned, es(c).stats.spawned);
        c.soul.end("t"); p.soul.end("t");
    }
});

test("B3 片づけ: DEFENSE の終わり・abort・SOUL の終了・マップ移動・敵の片づけで、3種とも弾・警告・絵が残らず、終わったあとに古い弾幕の続きが撃たれない。次の DEFENSE は最初から", () => {
    const exits = {
        "skipPhase": w => { w.soul.skipPhase(); frames(w, 2); },
        "時間切れ": w => { frames(w, 12 * 60 + 5); },
        "abort": w => { w.soul.end("abort"); frames(w, 2); },
        "マップ移動": w => { quietly(() => w.ctx.$gameMap.setup(w.ctx.$gameMap.mapId())); frames(w, 2); },
        "敵の片づけ": w => { w.ctx.ProjectRSoulPhaseCleanup.sweepNow("t", { owners: ["enemy"] }); frames(w, 1); }
    };
    for (const name of ["dev_aimed", "dev_radial", "dev_fan"]) {
        for (const [exitName, exit] of Object.entries(exits)) {
            const w = ebWorld({ defenseSeconds: 12 });
            E(w).setConfig({ collision: true }); E(w).enable({ pattern: name, cutIn: false });
            toPhase(w, "defense"); heartTo(w, 0.5, 0.6); frames(w, name === "dev_aimed" ? 50 : 70);       // 警告も弾もある途中
            assert.ok(es(w).running && (bullets(w).length > 0 || es(w).telegraphs > 0) && layerChildren(w) > 0, `${name}/${exitName}: 途中`);
            exit(w);
            assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], `${name}/${exitName}: 何も残らない`);
            assert.equal(layerChildren(w), 0, `${name}/${exitName}: 絵が残らない`);
            if (w.soul.isActive() && w.soul.getPhase() !== "defense") {
                const hp = hpOf(w), spawnedAfter = es(w).stats.spawned;
                frames(w, 250);                                            // PREPARE / ATTACK の間も、古い弾幕の続きは撃たれない
                assert.equal(es(w).stats.spawned, spawnedAfter, `${name}/${exitName}: 出ない`);
                assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false]);
                assert.equal(hpOf(w), hp, `${name}/${exitName}: HP は変わらない`);
            } else if (w.soul.isActive()) {
                frames(w, 30);                                             // 同じ DEFENSE の中で片づけたあと、同じ弾幕が再開されない(二重の予約なし)
                assert.deepEqual([es(w).live, es(w).running, es(w).stats.patterns], [0, false, 1], `${name}/${exitName}: 再開しない`);
            }
            if (w.soul.isActive()) w.soul.end("t");
        }
    }
    // 次の DEFENSE は最初から(古い時刻表を引き継がない)
    const w = ebWorld({ defenseSeconds: 12 });
    E(w).enableBoss({ cutIn: false });
    toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 60);
    const age1 = es(w).runner.age, spawned1 = es(w).stats.spawned; assert.ok(age1 >= 50 && spawned1 === 1, "1発目は撃った: " + spawned1);
    toPhase(w, "prepare"); toPhase(w, "attack"); toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 6);
    assert.ok(es(w).runner.age <= 12 && es(w).stats.patterns === 2, "新しい弾幕は最初から: " + es(w).runner.age);
    assert.equal(es(w).stats.spawned, spawned1, "古い弾幕の続き(2発目)は撃たれない");
    w.soul.end("t");
});

test("B3 解像度: 3種の弾幕は解像度が変わっても戦闘エリアの同じ割合にあり、はみ出さない。右上の敵のカットインは、どの解像度でも戦闘エリアの外(右)・画面の中・上半分にある。弾幕ごとに1回出る", () => {
    for (const name of ["dev_aimed", "dev_radial", "dev_fan"]) {
        const w = defWorld();
        const traj = [];
        for (const [gw, gh] of [[1920, 1080], [1280, 720], [2560, 1440], [1000, 700]]) {
            w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 2); heartTo(w, 0.5, 0.5);
            E(w).clear("t"); frames(w, 1);
            const rec = record(w, name);
            traj.push(rec.frames.map(fr => fr.map(b => [b.x, b.y])));
            const v = plain(w.stage.getViewport()), asp = E(w).UNIT.height, rad = E(w).UNIT.bulletRadius;
            for (const fr of rec.frames) for (const b of fr) {
                assert.ok(b.x + rad > 0 && b.x - rad < 1 && b.y + rad > 0 && b.y - rad < asp, `${name} ${gw}x${gh}: 戦闘エリアの外の弾が残っていない`);
                const s = plain(E(w).toScreen(b));
                assert.ok(s.x >= v.x - rad * v.w && s.x <= v.x + v.w + rad * v.w && s.y >= v.y - rad * v.w - 1 && s.y <= v.y + v.h + rad * v.w, `${name} ${gw}x${gh}: 画面の戦闘エリアの周り`);
            }
        }
        for (let k = 1; k < traj.length; k++) {
            assert.equal(traj[k].length, traj[0].length, name + ": 同じ長さ");
            traj[k].forEach((fr, f) => { assert.equal(fr.length, traj[0][f].length); fr.forEach((p, i) => { assert.ok(Math.abs(p[0] - traj[0][f][i][0]) < 0.004 && Math.abs(p[1] - traj[0][f][i][1]) < 0.004, `${name}: 解像度が変わっても弾の割合は同じ`); }); });
        }
        w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080;
        w.soul.end("t");
    }
    // カットインの置き場(ステージの純粋な計算): 戦闘エリアの外(右)・画面の中・上
    const w = defWorld();
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [816, 624], [1024, 768], [2560, 1080], [1600, 900], [3840, 2160]]) {
        const vp = plain(w.stage.computeViewport(gw, gh)), rects = plain(w.stage.computeCutInRects(vp));
        assert.ok(rects.enemy.x >= vp.x + vp.w, `${gw}x${gh}: 敵のカットインは戦闘エリアの右の外 ${rects.enemy.x} >= ${vp.x + vp.w}`);
        assert.ok(rects.enemy.x + rects.enemy.w <= gw && rects.enemy.y >= 0 && rects.enemy.y + rects.enemy.h <= vp.y + vp.h / 2, `${gw}x${gh}: 画面の中・上半分`);
        assert.ok(rects.ally.x + rects.ally.w <= vp.x, `${gw}x${gh}: 味方は左の外`);
    }
    // 弾幕ごとにカットインが1回(owner: enemy)
    for (const name of ["dev_aimed", "dev_radial", "dev_fan"]) {
        const wc = defWorld(); wc.ctx.ProjectRCutIn.clear();
        plain(E(wc).fire(name)); frames(wc, 2);
        assert.equal(plain(wc.ctx.ProjectRCutIn.getActive()).filter(e => e.owner === "enemy").length, 1, name + ": 敵のカットイン");
        for (let i = 0; i < 400 && es(wc).running; i++) frames(wc, 1);
        assert.equal(es(wc).stats.cutIns, 1, name + ": 弾幕ごとに1回(狙い撃ちの3発でも1回)");
        wc.soul.end("t");
    }
});

test("B3 PREPARE・ATTACK・マナ・カード・敵ハートは変えない: ボスの弾幕(当たり判定なし)を動かしても、同じ操作での PREPARE → ATTACK → DEFENSE → PREPARE の状態が、弾幕なしと同じ", () => {
    const run = bullets => {
        const w = ebWorld({ defenseSeconds: 4, attackSeconds: 8 });
        if (bullets) E(w).enableBoss({ cutIn: false });
        const snaps = [];
        const snap = () => snaps.push(JSON.stringify({ mana: ms(w), hand: battle(w).hand.map(c => c.cardId), deck: battle(w).deck && battle(w).deck.length, soul: plain(w.soul.getState()).phase, heart: plain(w.ctx.ProjectRSoulBattlePoC.getState()), hp: hpOf(w), poc: heartHp(w) }));
        snap(); toPhase(w, "attack"); frames(w, 90); snap();
        toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 200); snap();
        toPhase(w, "prepare"); frames(w, 5); snap();
        const spawned = es(w).stats.spawned; w.soul.end("t");
        return { snaps, spawned };
    };
    const a = run(false), b = run(true);
    assert.equal(a.spawned, 0); assert.ok(b.spawned >= 3, "弾幕は実際に出ている");
    assert.deepEqual(b.snaps, a.snaps, "マナ・手札・敵ハート(PoC)・HP・フェーズは弾幕の有無で同じ");
});


// ================================================================ I4-B3b: ATTACK / DEFENSE の秒数・ボスの弾幕の自動有効化・出現位置での弾ごとの被弾 ================================================================
// A16(Sandbox)を、bossAttacks も秒数も指定せずに始める(既定のまま)
function paceStart(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}
const soulSecs = w => { const st = plain(w.soul.getState()); return [st.attackSeconds, st.defenseSeconds]; };

test("秒数の既定: 準備ループ(prepare:true)は ATTACK 8秒 / DEFENSE 6秒(DEV の暫定値)。従来の攻撃⇄防御は変わらない(SoulBattle 8 / 5、a16 の従来 20 / 4)。明示指定・setDurations は常に優先", () => {
    // SoulBattle 単体の既定
    const w0 = world();
    assert.deepEqual(plain(w0.soul.getDefaults()), { legacy: { attackSeconds: 8, defenseSeconds: 5 }, prepare: { attackSeconds: 8, defenseSeconds: 6 }, explicit: { attack: false, defense: false } });
    // 従来(prepare なし)の a16 は 20 / 4 のまま。準備ループの a16 は 8 / 6(ATTACK は 20 → 8 に短く、DEFENSE は 4 → 6 に長く)
    const legacy = paceStart(world(), { prepare: false });
    assert.deepEqual(soulSecs(legacy), [20, 4], "従来の a16 は変えない");
    legacy.sb.stop(); frames(legacy, 4);
    const w = paceStart(world(), { prepare: true });
    assert.deepEqual(soulSecs(w), [8, 6], "準備ループの既定");
    assert.ok(8 < 20 && 6 > 4 && 6 > 5, "ATTACK は a16 の従来より短く、DEFENSE は従来(a16 4 / SoulBattle 5)より長い");
    assert.equal(w.soul.getState().prepare, true);
    w.sb.stop(); frames(w, 4);
    // 明示指定は常に優先(前の DEV コマンドの 600 / 30 も、片方だけの指定も)
    const e1 = paceStart(world(), { prepare: true, attackSeconds: 600, defenseSeconds: 30 });
    assert.deepEqual(soulSecs(e1), [600, 30]); e1.sb.stop(); frames(e1, 4);
    const e2 = paceStart(world(), { prepare: true, attackSeconds: 3 });
    assert.deepEqual(soulSecs(e2), [3, 6], "ATTACK だけ指定すれば DEFENSE は準備ループの既定"); e2.sb.stop(); frames(e2, 4);
    const e3 = paceStart(world(), { prepare: true, defenseSeconds: 2.5 });
    assert.deepEqual(soulSecs(e3), [8, 2.5]); e3.sb.stop(); frames(e3, 4);
    // setDurations で設定した値は、準備ループの既定より優先される(従来どおり: 次の開始と、動作中のものに効く)
    const s1 = world();
    assert.equal(plain(s1.soul.setDurations({ defenseSeconds: 2 })).ok, true);
    assert.deepEqual(plain(s1.soul.getDefaults()).prepare, { attackSeconds: 8, defenseSeconds: 2 });
    paceStart(s1, { prepare: true });
    assert.deepEqual(soulSecs(s1), [8, 2], "setDurations が優先");
    assert.equal(plain(s1.soul.setDurations({ defenseSeconds: 7 })).ok, true);
    assert.equal(soulSecs(s1)[1], 7, "動作中にも効く");
    s1.sb.stop(); frames(s1, 4);
    // SoulBattle 単体の start: 従来 8 / 5、準備ループ 8 / 6、明示が優先
    const d = world();
    assert.equal(plain(d.soul.start({ heart: false })).ok, true); assert.deepEqual(soulSecs(d), [8, 5]); d.soul.end("t"); frames(d, 2);
    assert.equal(plain(d.soul.start({ heart: false, prepare: true })).ok, true); assert.deepEqual(soulSecs(d), [8, 6]); d.soul.end("t"); frames(d, 2);
    assert.equal(plain(d.soul.start({ heart: false, prepare: true, attackSeconds: 1, defenseSeconds: 1 })).ok, true); assert.deepEqual(soulSecs(d), [1, 1]); d.soul.end("t"); frames(d, 2);
    assert.equal(plain(d.soul.start({ heart: false, attackSeconds: 4 })).ok, true); assert.deepEqual(soulSecs(d), [4, 5]); d.soul.end("t");
    assert.equal(plain(d.soul.start({ heart: false, prepare: true, attackSeconds: 0 })).reason, "invalidAttackSeconds", "不正な指定は従来どおり断る");
    // SoulBattle.js 以外の「秒数の窓口」(HUD などが読む getState)は、いまのフェーズの長さをそのまま返す
    const h = paceStart(world(), { prepare: true });
    h.soul.beginAttack(); frames(h, 2);
    const st = plain(h.soul.getState());
    assert.ok(Math.abs(st.totalFrames - 480) <= 1 && st.phase === "attack", "ATTACK は 480 フレーム: " + st.totalFrames);
    h.sb.stop();
});

test("フェーズ遷移と、DEFENSE で既存の弾幕を最後まで出し切る: PREPARE →(攻撃)→ ATTACK 480f → DEFENSE 360f → PREPARE。3フェーズの全6弾幕が DEFENSE の中で終わり、DEFENSE の終わりに片づけが要らない(途中の打ち切りなし)。空き時間を実測", () => {
    const w = paceStart(world(), { prepare: true });
    E(w).setConfig({ collision: false });
    assert.equal(E(w).isEnabled(), true, "F8 のコマンド無しで有効");
    const names = [], idle = [], cleanedBefore = [];
    const rounds = [[0, "dev_aimed"], [0.6, "dev_fan"], [null, "dev_aimed"], [0.3, "dev_radial"], [null, "dev_fan"], [null, "dev_aimed"]];
    const frameOf = (ph, limit) => { let n = 0; while (w.soul.getPhase() === ph && n < limit) { frames(w, 1); n++; } return n; };
    for (const [ratio, expected] of rounds) {
        if (ratio !== null && ratio > 0) w.bf.setHp(plain(w.bf.getState()).maxHp * ratio);
        assert.equal(w.soul.getPhase(), "prepare");
        frames(w, 30); assert.equal(es(w).stats.spawned === undefined, false);
        const spawnedBefore = es(w).stats.spawned;
        assert.equal(w.soul.beginAttack(), true);
        const attackFrames = frameOf("attack", 700);
        assert.ok(Math.abs(attackFrames - 480) <= 2, `ATTACK は約 8 秒(480f): ${attackFrames}`);
        assert.equal(w.soul.getPhase(), "defense");
        assert.equal(es(w).stats.spawned, spawnedBefore, "ATTACK の間は弾が出ない");
        // DEFENSE: 毎フレーム見て、弾幕が終わったフレーム・DEFENSE の終わる直前の状態を記録
        let n = 0, doneAt = null, name = null, lastLive = null;
        while (w.soul.getPhase() === "defense" && n < 500) {
            frames(w, 1); n++;
            const st = es(w);
            if (st.runner) name = st.runner.name;
            if (name && !st.running && doneAt === null) doneAt = n;
            if (w.soul.getPhase() === "defense") lastLive = st.live + st.telegraphs;
        }
        assert.ok(Math.abs(n - 360) <= 2, `DEFENSE は約 6 秒(360f): ${n}`);
        assert.equal(name, expected, "フェーズに合う弾幕が自動で始まる(F8 のコマンド無し)");
        assert.ok(doneAt !== null && doneAt < n - 20, `${name}: DEFENSE が終わる前に弾幕が終わる(終了 ${doneAt} / DEFENSE ${n})`);
        assert.equal(lastLive, 0, `${name}: DEFENSE の終わる直前に弾も警告も残っていない(途中の打ち切りなし)`);
        assert.equal(w.soul.getPhase(), "prepare");
        names.push(name); idle.push(n - doneAt);
        frames(w, 2);
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], "PREPARE には何も残らない");
    }
    assert.deepEqual(names, rounds.map(r => r[1]));
    console.log("IDLE(DEFENSE 360f のうち弾幕が終わってからの空き): " + names.map((nm, i) => `${nm}=${idle[i]}f(${(idle[i] / 60).toFixed(1)}s)`).join(" / "));
    assert.ok(idle.every(v => v >= 20), "どの弾幕も、終わってから少なくとも 20f の余裕がある");
    assert.equal(es(w).stats.cleared, 0, "ここまで一度も『弾を打ち切る片づけ』が働いていない");
    w.sb.stop();
});

test("A16 はボスの弾幕を自動で有効にする(F8 のコマンド無し)。bossAttacks:false で出さない。不正な指定は何も変えずに断る。stop() で自動開始も解除する", () => {
    for (const prepare of [true, false]) {
        const w = paceStart(world(), { prepare });
        assert.equal(E(w).isEnabled(), true, `prepare:${prepare}: 自動で有効`);
        assert.equal(es(w).mode, "boss");
        toPhase(w, "attack"); toPhase(w, "defense"); heartTo(w, 0.5, 0.5); frames(w, 8);
        assert.equal(es(w).runner && es(w).runner.name, "dev_aimed", `prepare:${prepare}: 第一形態の弾幕が自動で始まる`);
        assert.equal(es(w).lastPick.phaseId, "phase1");
        w.sb.stop(); frames(w, 4);
        assert.deepEqual([E(w).isEnabled(), es(w).live, es(w).telegraphs, es(w).running], [false, 0, 0, false], `prepare:${prepare}: stop() で解除・片づけ`);
    }
    const off = paceStart(world(), { prepare: true, bossAttacks: false });
    assert.equal(E(off).isEnabled(), false);
    toPhase(off, "attack"); toPhase(off, "defense"); frames(off, 120);
    assert.equal(es(off).stats.spawned, 0, "bossAttacks:false なら出ない");
    off.sb.stop();
    const bad = world(), before = JSON.stringify([bad.ctx.$gameMap.mapId(), bad.ctx.$gamePlayer.x, bad.ctx.$gamePlayer.y]);
    assert.equal(quietly(() => plain(bad.sb.start("a16", { bossAttacks: "yes" }))).ok, false);
    assert.equal(JSON.stringify([bad.ctx.$gameMap.mapId(), bad.ctx.$gamePlayer.x, bad.ctx.$gamePlayer.y]), before, "断ったら何も変えない");
    assert.equal(E(bad).isEnabled(), false);
});

// ---- 出現位置での弾ごとの被弾 ----
const spawnWorld = () => {
    const w = paceStart(world(), { prepare: true, attackSeconds: 600, defenseSeconds: 120, bossAttacks: false });
    E(w).setConfig({ collision: true, damage: 25, floorHp: 1 });
    toPhase(w, "attack"); toPhase(w, "defense"); heartTo(w, 0.5, 0.5);
    return w;
};
// 弾幕を始め、警告の間にハートを弾の出る位置(敵の胸の真下の上の縁)へ動かす。始めたあとの返り値(出る位置)を返す。
const camp = (w, name, options = {}) => {
    const res = plain(E(w).fire(name, { cutIn: false, ...options }));
    assert.equal(res.ok, true, JSON.stringify(res));
    mouseTo(w, res.origin.x, 0.0141); frames(w, 2);
    const heart = plain(E(w).getHeartCircle());
    assert.ok(Math.hypot(heart.x - res.origin.x, heart.y - res.origin.y) < 0.005, "ハートは出る位置にいる: " + JSON.stringify([heart.x - res.origin.x, heart.y - res.origin.y]));
    return res;
};
const finish = (w, max = 400) => { for (let i = 0; i < max && es(w).running; i++) frames(w, 1); frames(w, 3); };

test("出現位置の被弾: 弾の出る位置にハートがいると、重なった弾はすべて、弾ごとに自分のダメージを与える(同じフレームでも。上限・まとめ・無敵なし)。放射波 13 発 / 扇 7 発 x 2 波 / 狙い 3 発", () => {
    const cases = [["dev_radial", { waves: 1 }, 13, 13], ["dev_fan", {}, 14, 14], ["dev_aimed", {}, 3, 3]];
    for (const [name, options, expectHits, expectCalls] of cases) {
        const w = spawnWorld(), hp0 = hpOf(w), spy = spyUpdatePlayerHp(w);
        camp(w, name, options); finish(w);
        const hits = plain(E(w).getHits()), st = es(w);
        assert.equal(st.stats.hits, expectHits, `${name}: 重なった弾はすべて当たる`);
        assert.equal(new Set(hits.map(h => h.bulletId)).size, hits.length, `${name}: 弾ごとに1回(同じ弾は二度当たらない)`);
        assert.equal(spy.calls.length, expectCalls, `${name}: 既存のHP窓口を弾ごとに1回`);
        assert.ok(spy.calls.every(c => c === "-25"));
        assert.equal(hp0 - hpOf(w), expectHits * 25, `${name}: HP は弾の数 x 25(上限・まとめなし)`);
        assert.equal(hits.every(h => h.dealt === 25 && h.reason === "ok"), true);
        if (name !== "dev_aimed") { const byFrame = {}; for (const h of hits) byFrame[h.frame] = (byFrame[h.frame] || 0) + 1; assert.ok(Math.max(...Object.values(byFrame)) >= 7, `${name}: 同じフレームに ${JSON.stringify(byFrame)}`); }
        const idsBefore = hits.map(h => h.bulletId); frames(w, 120);
        assert.equal(es(w).stats.hits, expectHits, `${name}: そのあとは増えない`);
        assert.ok(plain(E(w).getBullets()).every(b => !idsBefore.includes(b.id)), "当たった弾は残らない");
        spy.restore(); w.soul.end("t");
    }
    // 同じ位置に重なった弾を一度に 5 発 / 40 発: まとめない・上限なし。40 発は HP の下限(1)で止まり、残りは dealt 0 で数える
    const w = spawnWorld(), hp0 = hpOf(w), spy = spyUpdatePlayerHp(w);
    const heart = plain(E(w).getHeartCircle());
    for (let i = 0; i < 5; i++) assert.equal(plain(E(w).devSpawn({ x: heart.x, y: heart.y, vx: 0, vy: 0 })).ok, true);
    frames(w, 1);
    assert.deepEqual([es(w).stats.hits, hp0 - hpOf(w), spy.calls.length], [5, 125, 5], "完全に重なった5発も5回");
    for (let i = 0; i < 40; i++) E(w).devSpawn({ x: heart.x, y: heart.y, vx: 0, vy: 0 });
    frames(w, 1);
    const st = es(w);
    assert.equal(st.stats.hits, 45, "40発も全部、弾ごとに数える");
    assert.equal(hpOf(w), 1, "HP の下限 1(D13 が承認されるまでの暫定)");
    assert.equal(hp0 - 1, st.stats.hpLost, "失ったHP = 実際に減った分");
    assert.equal(st.stats.hitsAtFloor, 45 - 5 - 17, "下限に着いてからの被弾は dealt 0");
    assert.equal(w.ctx.$gameParty.leader().isDead(), false);
    assert.equal(plain(E(w).getHits()).filter(h => h.reason === "atFloor").every(h => h.dealt === 0), true);
    assert.deepEqual(plain(E(w).getBullets()), [], "全部消えた");
    spy.restore(); w.soul.end("t");
});

test("出現位置の被弾: 被ダメージ倍率(DamageModifiers)は弾ごとに掛かる。HP の下限 1 は弾ごとに守られる。出現位置から離れていれば当たらない(境界)", () => {
    // 被ダメージ倍率 0.4(25 → 10): 放射波 13 発 = 130
    const w = spawnWorld(), hp0 = hpOf(w);
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.add({ id: "t-dmg", kind: "damageTaken", target: "player", value: 0.4 })).ok, true);
    camp(w, "dev_radial", { waves: 1 }); finish(w);
    assert.equal(es(w).stats.hits, 13);
    assert.equal(hp0 - hpOf(w), 13 * 10, "倍率は弾ごとに1回(13 x 10)");
    assert.ok(plain(E(w).getHits()).every(h => h.dealt === 10));
    w.ctx.ProjectRDamageModifiers.remove("t-dmg"); w.soul.end("t");
    // 下限 1: HP が少ないときの同時被弾。1発目 25、2発目 25(→10)、3発目 9(→1)、残りは 0。倍率 2 でも下限を割らない
    for (const factor of [1, 2]) {
        const v = spawnWorld(); v.ctx.$gameParty.leader().setHp(60);
        if (factor !== 1) v.ctx.ProjectRDamageModifiers.add({ id: "t-x2", kind: "damageTaken", target: "player", value: factor });
        camp(v, "dev_radial", { waves: 1 }); finish(v);
        assert.equal(es(v).stats.hits, 13, `倍率${factor}: 13発すべて数える`);
        // 倍率 2 のときは、残り 1 の余地(1 x 2 = 2 > 余地)を削れないので 2 で止まる(下限 1 は割らない。従来どおり)
        assert.ok(factor === 1 ? hpOf(v) === 1 : hpOf(v) >= 1 && hpOf(v) <= factor, `倍率${factor}: 下限 1 を割らない(${hpOf(v)})`);
        assert.equal(v.ctx.$gameParty.leader().isDead(), false);
        assert.equal(v.ctx.ProjectR.PlayerDeath.isDead(), false);
        assert.equal(plain(E(v).getHits()).reduce((a, h) => a + h.dealt, 0), 60 - hpOf(v), `倍率${factor}: 実際に減った分 = 60 - 残りHP`);
        v.soul.end("t");
    }
    // 境界: 出る位置(の真下の上の縁)に止まった弾が、ハートの当たり円(0.018)の内側なら当たり、外側なら外れる
    const b = spawnWorld(); const hpB = hpOf(b);
    const res = plain(E(b).fire("dev_aimed", { cutIn: false })); E(b).clear("t");
    mouseTo(b, res.origin.x, 0.0141); frames(b, 2);
    const hc = plain(E(b).getHeartCircle());
    assert.equal(plain(E(b).devSpawn({ x: hc.x + 0.022, y: hc.y, vx: 0, vy: 0 })).ok, true); frames(b, 2);
    assert.equal(es(b).stats.hits, 0, "0.022 離れていれば当たらない");
    assert.equal(plain(E(b).devSpawn({ x: hc.x + 0.014, y: hc.y, vx: 0, vy: 0 })).ok, true); frames(b, 1);
    assert.equal(es(b).stats.hits, 1, "0.014 なら当たる");
    assert.equal(hpOf(b), hpB - 25);
    b.soul.end("t");
});


// ================================================================ I4-B4: ボスの弾幕の配分(DEFENSE の長さに合わせて波・発の間隔だけを広げる) ================================================================
// 6秒の DEFENSE(360f)での、全6弾幕の「出す時刻(弾幕の開始からのフレーム)と数」。配分後(新)と、配分なし(旧 = DEFENSE が短いとき・単体の fire と同じ)
const SCHED_NEW = [
    ["dev_aimed", [[40, 1], [135, 1], [230, 1]]],
    ["dev_fan", [[60, 7], [190, 7]]],
    ["dev_aimed", [[40, 1], [106, 1], [172, 1], [238, 1]]],
    ["dev_radial", [[50, 13], [125, 12], [200, 13]]],
    ["dev_fan", [[60, 9], [193, 9]]],
    ["dev_aimed", [[34, 1], [87, 1], [140, 1], [193, 1], [246, 1]]]
];
const SCHED_OLD = [
    ["dev_aimed", [[40, 1], [76, 1], [112, 1]]],
    ["dev_fan", [[60, 7], [100, 7]]],
    ["dev_aimed", [[40, 1], [70, 1], [100, 1], [130, 1]]],
    ["dev_radial", [[50, 13], [88, 12], [126, 13]]],
    ["dev_fan", [[60, 9], [100, 9]]],
    ["dev_aimed", [[34, 1], [60, 1], [86, 1], [112, 1], [138, 1]]]
];
const SPEEDS = [0.42, 0.3, 0.46, 0.34, 0.3, 0.5];                                     // 速さは変えない(幅/秒)
const ROUND_PHASES = [null, 0.6, null, 0.3, null, null];                              // 各ラウンドの前に BossFramework を進める割合(null = そのまま)
// PREPARE から始めて DEFENSE の終わり(PREPARE に戻る)まで 1 ラウンドを自然に進める。exitAt があれば、DEFENSE のそのフレームで skipPhase する。
function defenseRound(w, { exitAt = null, heartAt = null } = {}) {
    frames(w, 20);
    assert.equal(w.soul.getPhase(), "prepare");
    assert.equal(w.soul.beginAttack(), true);
    for (let g = 0; w.soul.getPhase() === "attack" && g < 700; g++) frames(w, 1);
    assert.equal(w.soul.getPhase(), "defense");
    if (heartAt) mouseTo(w, heartAt[0], heartAt[1]);
    const out = { name: null, waves: null, fires: [], speeds: [], teleBeforeFire: [], doneAt: null, n: 0, lastLive: 0, active: 0, pace: null, gaps: 0, exited: false, spawned0: es(w).stats.spawned };
    const seen = new Set(); let last = out.spawned0, prevTele = 0, quiet = 0;
    while (w.soul.getPhase() === "defense" && out.n < 500) {
        if (exitAt !== null && out.n === exitAt) { w.soul.skipPhase(); frames(w, 1); out.exited = true; break; }
        frames(w, 1); out.n++;
        const st = es(w);
        if (st.runner) { out.name = st.runner.name; out.waves = st.runner.waves; out.pace = st.runner.pace; }
        const fresh = bullets(w).filter(b => !seen.has(b.id)); fresh.forEach(b => seen.add(b.id));
        if (st.stats.spawned > last) { out.fires.push([st.runner ? st.runner.age : null, st.stats.spawned - last]); out.teleBeforeFire.push(prevTele); out.speeds.push(+(Math.hypot(fresh[0].vx, fresh[0].vy) * 60).toFixed(6)); last = st.stats.spawned; }
        const act = st.running || st.live > 0 || st.telegraphs > 0;
        if (act) { out.active++; quiet = 0; } else if (out.name && out.doneAt === null) { quiet++; out.gaps = Math.max(out.gaps, quiet); }
        if (out.name && !st.running && out.doneAt === null) out.doneAt = out.n;
        if (w.soul.getPhase() === "defense") out.lastLive = st.live + st.telegraphs;
        prevTele = st.telegraphs;
    }
    if (!out.exited) out.idle = out.n - out.doneAt;
    return out;
}
const fires = o => o.fires.map(f => [f[0], f[1]]);

test("配分: 準備ループの DEFENSE 6秒で、全6弾幕の波・発の間隔だけが広がる。数・速さ・警告の長さ・向きは変わらず、弾幕が終わってから DEFENSE の終わりまでの空きは 1.7〜2.7秒 → 0.4〜0.8秒", () => {
    const w = paceStart(world(), { prepare: true });
    E(w).setConfig({ collision: false });
    const idle = [], names = [];
    ROUND_PHASES.forEach((ratio, i) => {
        if (ratio) w.bf.setHp(plain(w.bf.getState()).maxHp * ratio);
        const o = defenseRound(w), [name, sched] = SCHED_NEW[i];
        assert.equal(o.name, name, `ラウンド${i + 1}: フェーズに合う弾幕`);
        assert.ok(Math.abs(o.n - 360) <= 2, "DEFENSE は 360f: " + o.n);
        assert.deepEqual(fires(o), sched, `ラウンド${i + 1}(${name}): 出す時刻と数(配分後)`);
        // 変えないもの: 弾の数・速さ・最初の警告(= 最初の弾までのフレーム数)
        assert.deepEqual(o.fires.map(f => f[1]), SCHED_OLD[i][1].map(f => f[1]), "数は同じ");
        assert.equal(o.fires[0][0], SCHED_OLD[i][1][0][0], "最初の警告の長さは同じ");
        assert.ok(o.speeds.every(sp => Math.abs(sp - SPEEDS[i]) < 1e-9), `速さは同じ(${SPEEDS[i]}): ${o.speeds}`);
        // 波・発の間隔は広がるだけ(狭めない)。配分の記録
        assert.ok(o.pace && o.pace.gapAfter >= o.pace.gapBefore && o.pace.gapAfter > o.pace.gapBefore, `間隔が広がる ${JSON.stringify(o.pace)}`);
        // 最後の弾まで出し切り、弾が戦闘エリアを出るまでに DEFENSE の終わる前の余白がある(打ち切りなし)。余白は短い(0.4〜0.8秒)
        assert.equal(o.lastLive, 0, "DEFENSE の終わる直前に弾も警告も残らない");
        assert.ok(o.idle >= 20 && o.idle <= 60, `${name}: 終わってからの空き ${o.idle}f(0.33〜1.0秒)`);
        // 警告は各弾の前に出ている。弾幕のあいだ、弾か警告が途切れない(最長の途切れ 12f 以下)
        assert.ok(o.teleBeforeFire.every(t => t > 0), "どの弾の直前にも警告の線がある: " + o.teleBeforeFire);
        assert.ok(o.gaps <= 12, `弾も警告も無い途切れが ${o.gaps}f`);
        assert.ok(o.active >= o.doneAt - 2, "弾幕のあいだ、ずっと動きがある");
        idle.push(o.idle); names.push(name);
        frames(w, 2);
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false]);
    });
    console.log("IDLE(配分後・DEFENSE 360f のうち弾幕が終わってからの空き): " + names.map((n, i) => `${n}=${idle[i]}f(${(idle[i] / 60).toFixed(2)}s)`).join(" / "));
    assert.equal(es(w).stats.cleared, 0, "打ち切りの片づけは一度も働かない");
    assert.deepEqual(plain(E(w).getConfig()), { collision: false, damage: 25, hitRadiusScale: 0.5, bulletHitScale: 1, floorHp: 1, feedback: true }, "ダメージ・当たり円・下限は変えない");
    assert.equal(E(w).UNIT.bulletRadius, 0.011);
    w.sb.stop();
});

test("配分の範囲: DEFENSE が短ければ従来どおり(間隔を狭めない)。配分を切る・単体の fire は従来の間隔。長い DEFENSE でも 6秒ぶんに収める。従来の a16(20/4)も従来どおり", () => {
    // 4秒の DEFENSE(準備ループ・秒数を明示): 全6弾幕が従来の時刻表のまま
    const w4 = paceStart(world(), { prepare: true, defenseSeconds: 4 });
    E(w4).setConfig({ collision: false });
    ROUND_PHASES.forEach((ratio, i) => {
        if (ratio) w4.bf.setHp(plain(w4.bf.getState()).maxHp * ratio);
        const o = defenseRound(w4);
        assert.equal(o.name, SCHED_OLD[i][0]);
        assert.deepEqual(fires(o), SCHED_OLD[i][1].filter(f => f[0] <= o.n), `4秒 ラウンド${i + 1}: 従来の時刻表`);
        assert.equal(o.pace.gapAfter, o.pace.gapBefore, "狭めも広げもしない");
    });
    w4.sb.stop(); frames(w4, 4);
    // 従来の a16(prepare なし・20 / 4): 従来の時刻表(DEFENSE 4秒)
    const wl = paceStart(world(), { prepare: false });
    toPhase(wl, "attack"); toPhase(wl, "defense"); heartTo(wl, 0.5, 0.5); frames(wl, 8);
    assert.deepEqual([es(wl).runner.name, es(wl).runner.pace.gapAfter, es(wl).runner.pace.gapBefore], ["dev_aimed", 36, 36], "従来の a16 の第一形態の弾幕は従来の間隔");
    wl.sb.stop(); frames(wl, 4);
    // 配分を切る(6秒)
    const wo = paceStart(world(), { prepare: true });
    E(wo).setConfig({ collision: false }); E(wo).enableBoss({ pace: false });
    const oo = defenseRound(wo);
    assert.deepEqual(fires(oo), SCHED_OLD[0][1], "enableBoss({pace:false}) は従来の間隔");
    assert.equal(oo.pace, null);
    wo.sb.stop(); frames(wo, 4);
    // 単体の fire / 既定のパターンは従来の間隔(pace を付けたときだけ配分)
    const wf = defWorld();
    const plainRun = record(wf, "dev_aimed"), plainSp = spawnsOf(plainRun).map(s => s.age);
    assert.deepEqual(plainSp, [40, 76, 112], "fire の既定は従来");
    wf.soul.end("t");
    const wp = defWorld();
    const paced = record(wp, "dev_aimed", { pace: true }), pacedSp = spawnsOf(paced).map(s => s.age);
    assert.ok(pacedSp.length === 3 && pacedSp[0] === 40 && pacedSp[1] - pacedSp[0] > 36, "pace:true で広がる: " + pacedSp);
    wp.soul.end("t");
    // 60秒の DEFENSE(明示): 配分に使う長さは上限(336f)まで。6秒のときと 2f 以内で同じ
    const wb = paceStart(world(), { prepare: true, attackSeconds: 8, defenseSeconds: 60 });
    E(wb).setConfig({ collision: false });
    const ob = defenseRound(wb);
    assert.ok(Math.abs(ob.pace.gapAfter - 95) <= 2 && ob.pace.budget === E(wb).PACE.maxFrames, "上限で頭打ち: " + JSON.stringify(ob.pace));
    wb.sb.stop();
});

test("配分後も避けられる: 扇・放射波は探索で『一度も当たらない経路』があり(基準の速さ 0.5 / 0.35 / 0.25 幅/秒)、実エンジンでなぞると HP が変わらない。狙い撃ちは開始位置 7 通り x 2 つの速さで当たらない。動かなければ当たる。離れた所の同時被弾は1発まで", () => {
    const w0 = defWorld(); const entries = planEntries(w0); w0.soul.end("t");
    const heart0 = { r: 0.00702 };
    for (const e of entries) {
        const probe = defWorld(); const pick = resolveEntry(probe, e);
        const opt = { ...pick.options, pace: true };
        const start = plain(E(probe).getHeartCircle());
        const rec = record(probe, pick.pattern, opt); probe.soul.end("t");
        assert.ok(rec.frames.length >= 295 && rec.frames.length <= 350, `${e.pattern}: 配分後の長さ ${rec.frames.length}f(DEFENSE 360f に収まり、ほぼ全体に広がる)`);
        const id = `${e.pattern}(フェーズ${e.phase + 1}-${e.entry})`;
        // 離れた所(出る位置から 0.15 幅以上)の同時被弾: 6フレームの窓に 1発まで(静止したハートがどこにいても)
        let maxBurst = 0;
        for (let j = 0; j < 36; j++) for (let i = 0; i < 64; i++) {
            const x = (i + 0.5) / 64, y = (j + 0.5) / 64; if (x < 0.014 || x > 0.986 || y < 0.014 || y > 9 / 16 - 0.014 || Math.hypot(x - 0.5, y - 0.011) < 0.15) continue;
            const seen = new Set(), fr = [];
            rec.frames.forEach((f, k) => { for (const b of f) { if (seen.has(b.id)) continue; if (segDist(b.x - b.vx, b.y - b.vy, b.x, b.y, x, y) <= b.r + heart0.r) { seen.add(b.id); fr.push(k + 1); } } });
            for (const f of fr) maxBurst = Math.max(maxBurst, fr.filter(g => g >= f && g < f + 6).length);
        }
        assert.ok(maxBurst <= 1, `${id}: 離れた所の同時被弾 ${maxBurst}`);
        if (pick.pattern !== "dev_aimed") {
            for (const [speed, hop, margin] of [[0.5, 3, 0.008], [0.35, 6, 0.012], [0.25, 6, 0.012]]) {
                const sol = solveDodge(rec, { start, speed, hop, margin });
                assert.equal(sol.ok, true, `${id}: 速さ ${speed} で避けられる(失敗 hop ${sol.failedHop}/${sol.hops})`);
                if (speed === 0.5) {
                    const run = defWorld({}, { collision: true }), hp0 = hpOf(run);
                    assert.equal(plain(E(run).fire(pick.pattern, { cutIn: false, ...opt })).ok, true);
                    replay(run, sol, rec.frames.length);
                    assert.equal(es(run).stats.hits, 0, `${id}: なぞると一度も当たらない`);
                    assert.equal(hpOf(run), hp0);
                    run.soul.end("t");
                }
            }
        } else {
            for (const speed of [0.5, 0.3]) for (const [sx, sy] of [[0.5, 0.28], [0.5, 0.5], [0.05, 0.5], [0.95, 0.1], [0.5, 0.1], [0.3, 0.05], [0.7, 0.4]]) {
                const w = defWorld({}, { collision: true }); mouseTo(w, sx, sy); frames(w, 2);
                const hp0 = hpOf(w);
                assert.equal(plain(E(w).fire(pick.pattern, { cutIn: false, ...opt })).ok, true);
                for (let i = 0; i < 400 && es(w).running; i++) { sidestep(w, { speed }); frames(w, 1); }
                assert.equal(es(w).stats.hits, 0, `${id}: 速さ ${speed} 開始(${sx},${sy})で当たらない`);
                assert.equal(hpOf(w), hp0);
                w.soul.end("t");
            }
        }
        // 動かなければ当たる(脅威は残る)。当たった弾の数 x 25
        const idle = defWorld({}, { collision: true }), hpI = hpOf(idle);
        assert.equal(plain(E(idle).fire(pick.pattern, { cutIn: false, ...opt })).ok, true);
        frames(idle, rec.frames.length);
        assert.ok(es(idle).stats.hits >= 1, `${id}: 動かなければ当たる`);
        assert.equal(hpI - hpOf(idle), es(idle).stats.hits * 25);
        idle.soul.end("t");
    }
});

test("配分後の出現位置: 弾の出る位置にハートがいると、波・発が離れても、重なった弾はすべて弾ごとに自分のダメージを与える(上限・無敵なし)。放射波 38 / 扇 14 / 狙い撃ち 3", () => {
    const cases = [["dev_radial", 38], ["dev_fan", 14], ["dev_aimed", 3]];
    for (const [name, expectHits] of cases) {
        const w = spawnWorld(); w.ctx.$gameParty.leader().setHp(w.ctx.$gameParty.leader().mhp);
        const hp0 = hpOf(w), spy = spyUpdatePlayerHp(w);
        camp(w, name, { pace: true }); finish(w, 500);
        const hits = plain(E(w).getHits());
        assert.equal(es(w).stats.hits, expectHits, `${name}: 全部の弾が当たる`);
        assert.equal(new Set(hits.map(h => h.bulletId)).size, hits.length, "弾ごとに1回");
        assert.equal(spy.calls.length, hits.filter(h => h.dealt > 0).length, "既存のHP窓口を、実際に減る弾ごとに1回(下限に着いたあとの弾は dealt 0 で呼ばない)");
        assert.equal(hits.reduce((a, h) => a + h.dealt, 0), hp0 - hpOf(w), "実際に減った分");
        assert.ok(hpOf(w) >= 1 && !w.ctx.$gameParty.leader().isDead());
        if (expectHits * 25 < hp0) assert.equal(hp0 - hpOf(w), expectHits * 25, `${name}: 弾の数 x 25`);
        else assert.equal(hpOf(w), 1, `${name}: 暫定の下限 1`);
        const stamps = [...new Set(hits.map(h => h.frame))];
        assert.ok(stamps.length >= (name === "dev_aimed" ? 3 : name === "dev_fan" ? 2 : 3), `${name}: 波・発ごとに別の時刻 ${stamps}`);
        spy.restore(); w.soul.end("t");
    }
});

test("繰り返しのラウンドとフェーズの片づけ(配分後): 第三形態の3弾幕を2巡。同じ時刻表で、毎回 PREPARE に何も残らない。途中で DEFENSE を抜けても残らず、未発射の波・発は撃たれず、次の DEFENSE は最初から同じ時刻表", () => {
    const w = paceStart(world(), { prepare: true });
    E(w).setConfig({ collision: false });
    w.bf.setHp(plain(w.bf.getState()).maxHp * 0.3);
    const seq = [];
    for (let i = 0; i < 6; i++) { const o = defenseRound(w); seq.push(o); assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false], `ラウンド${i + 1}の後`); frames(w, 2); }
    assert.deepEqual(seq.map(o => o.name), ["dev_radial", "dev_fan", "dev_aimed", "dev_radial", "dev_fan", "dev_aimed"], "第三形態の巡回");
    assert.deepEqual(seq.slice(0, 3).map(fires), [SCHED_NEW[3][1], SCHED_NEW[4][1], SCHED_NEW[5][1]]);
    assert.deepEqual(seq.slice(3).map(fires), seq.slice(0, 3).map(fires), "2巡目も同じ時刻表");
    assert.ok(seq.every(o => o.lastLive === 0 && o.idle >= 20), "毎回、出し切って終わる");
    assert.equal(es(w).stats.cleared, 0);
    // 途中で DEFENSE を抜ける: 弾幕ごと(radial → fan → aimed の巡回)、弾幕の開始からのフレームで 10 / 70 / 150 / 260 / 300
    const exits = [10, 70, 150, 260, 300, 45];
    exits.forEach((age, i) => {
        const before = es(w).stats.spawned;
        const o = defenseRound(w, { exitAt: age });
        assert.equal(o.exited, true);
        const st = es(w);
        assert.deepEqual([st.live, st.telegraphs, st.running], [0, 0, false], `${o.name} を ${age}f で抜けた: 何も残らない`);
        assert.equal(layerChildren(w), 0, "絵が残らない");
        const spawnedAfter = st.stats.spawned;
        frames(w, 20); w.soul.beginAttack(); frames(w, 450);                     // PREPARE → ATTACK の間も、未発射の波・発は撃たれない
        assert.equal(es(w).stats.spawned, spawnedAfter, `${o.name} を ${age}f で抜けたあと、撃たれない`);
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running], [0, 0, false]);
        // いま ATTACK の終わり付近。DEFENSE の始まりを待って、飛ばして PREPARE へ戻す(次のラウンドは PREPARE から始めたい)
        for (let g = 0; w.soul.getPhase() !== "prepare" && g < 800; g++) { if (w.soul.getPhase() === "defense") w.soul.skipPhase(); frames(w, 1); }
        assert.equal(w.soul.getPhase(), "prepare");
        assert.ok(before <= spawnedAfter);
    });
    // 抜けたあとの次の DEFENSE は、最初から同じ時刻表(古い時刻表を引き継がない)
    const again = [];
    for (let i = 0; i < 3; i++) { again.push(defenseRound(w)); frames(w, 2); }
    again.forEach(o => assert.deepEqual(fires(o), SCHED_NEW[{ dev_radial: 3, dev_fan: 4, dev_aimed: 5 }[o.name]][1], `${o.name}: 抜けたあとも同じ時刻表`));
    // SOUL の中断(abort)・敵の片づけでも、配分後の弾幕が残らない
    for (const exit of [w2 => w2.soul.end("abort"), w2 => w2.ctx.ProjectRSoulPhaseCleanup.sweepNow("t", { owners: ["enemy"] })]) {
        const v = paceStart(world(), { prepare: true }); E(v).setConfig({ collision: false });
        frames(v, 20); v.soul.beginAttack(); for (let g = 0; v.soul.getPhase() !== "defense" && g < 700; g++) frames(v, 1);
        frames(v, 120); assert.ok(es(v).running && es(v).live > 0);
        exit(v); frames(v, 2);
        assert.deepEqual([es(v).live, es(v).telegraphs, es(v).running], [0, 0, false]);
        assert.equal(layerChildren(v), 0);
        const sp = es(v).stats.spawned; frames(v, 300); assert.equal(es(v).stats.spawned, sp, "そのあと撃たれない");
        if (v.soul.isActive()) v.soul.end("t");
    }
    w.sb.stop();
});


test("配分は最悪の狙いでも収まる: ハートがどこにいても(端・隅・出る位置の近く)、狙い撃ち・扇は最後の弾まで出し、DEFENSE の終わる前に弾も警告も残さず終わる", () => {
    const spots = [[0.5, 0.28], [0.08, 0.5], [0.92, 0.5], [0.15, 0.1], [0.85, 0.1], [0.5, 0.54]];
    const w = paceStart(world(), { prepare: true });
    E(w).setConfig({ collision: false });
    for (const [round, label] of [[0, "第一形態"], [1, "第二形態"]]) {
        if (round === 1) w.bf.setHp(plain(w.bf.getState()).maxHp * 0.6);
        for (const spot of spots) {
            const o = defenseRound(w, { heartAt: spot });
            frames(w, 2);
            const sched = o.name === "dev_aimed" && round === 0 ? SCHED_NEW[0][1] : o.name === "dev_fan" ? SCHED_NEW[1][1] : SCHED_NEW[2][1];
            if (o.name === "dev_aimed") assert.deepEqual(fires(o), sched, `${label} ${o.name} ハート(${spot}): 狙い撃ちの時刻表は狙いに依らない`);
            else { assert.deepEqual(o.fires.map(x => x[1]), [7, 7]); assert.equal(o.fires[0][0], 60); assert.ok(o.fires[1][0] - 60 >= 40 && o.fires[1][0] <= 190 + 40, `扇の2波目は向きに合わせて配分: ${o.fires[1][0]}`); }
            assert.equal(o.lastLive, 0, `${o.name} ハート(${spot}): DEFENSE の終わる前に残らない`);
            assert.ok(o.idle >= 18 && o.idle <= 90, `${o.name} ハート(${spot}): 空き ${o.idle}f`);
        }
    }
    assert.equal(es(w).stats.cleared, 0, "打ち切りの片づけは働かない");
    w.sb.stop();
});

console.log(`\n${passed} tests passed`);
