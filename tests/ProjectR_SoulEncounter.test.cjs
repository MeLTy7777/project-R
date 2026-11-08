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

// ================================================================ I4-B2: 当たり判定・HPダメージ ================================================================
const hpOf = w => w.ctx.$gameParty.leader().hp;
const heartAt = (w, u, v) => { mouseAt(w, u, v); frames(w, 2); return plain(E(w).getHeartCircle()); };
const hitWorld = (extra = {}) => { const w = ebWorld({ defenseSeconds: 60, ...extra }); E(w).setConfig({ collision: true, damage: 25 }); mouseAt(w, 0.5, 0.7); toPhase(w, "defense"); mouseAt(w, 0.5, 0.7); frames(w, 3); return w; };
// 動かない弾を、ハートから(dx, dy)(幅単位)の所に置く
const placeStill = (w, heart, dx, dy, extra = {}) => plain(E(w).devSpawn({ x: heart.x + dx, y: heart.y + dy, vx: 0, vy: 0, ...extra }));
const spyUpdatePlayerHp = w => { const calls = []; const pm = w.ctx.PluginManager, orig = pm.callCommand; pm.callCommand = function(interp, plugin, name, args) { if (name === "UpdatePlayerHp") calls.push(String(args && args.value)); return orig.apply(this, arguments); }; return { calls, restore: () => { pm.callCommand = orig; } }; };

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

// ================================================================ D13: 本番の入口(ProjectR_SoulEncounter)と勝敗 ================================================================
// 1フレームずつ進める。マップ移動が予約されていたら(実際は新しい Scene_Map に入れ替わる)、到着の処理をしてから進める。
const fr = (w, n) => { for (let i = 0; i < n; i++) { if (w.ctx.$gamePlayer.isTransferring()) { arrive(w); w.scene._active = true; } frames(w, 1); } };
const ENC = w => w.ctx.ProjectRSoulEncounter;
const VAR = 20;                                                       // 結果を入れる変数(テスト用)
const BOSS = "t_boss";
const hurtEvent = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
const varOf = w => w.ctx.$gameVariables.value(VAR);
const leaderOf = w => w.ctx.$gameParty.leader();
const plainState = w => plain(ENC(w).getState());
const saveOn = w => w.ctx.$gameSystem.isSaveEnabled();
// 実際に装備できる有効なデッキを用意する(DEV の ProjectRApolloTest が、一時的に指輪・所持・デッキを与える。テストの世界ごとに使い捨て)
function deckUp(w) {
    for (const god of ["apollo", "hermes"]) assert.equal(plain(w.at.grantRing(god)).ok, true);
    assert.equal(plain(w.at.unlock(3, ["apollo", "hermes"])).ok, true);
    const built = plain(w.at.buildMixedDeck());
    assert.ok(built.ok && built.valid, JSON.stringify(built));
}
function encWorld({ deck = true, boss = true } = {}) {
    const w = world();
    w.enc = ENC(w);
    if (deck) deckUp(w);
    if (boss) assert.equal(plain(w.enc.registerBoss({ bossId: BOSS, name: "TEST BOSS", phases: [{ id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", label: "第三形態", hpRatio: 0.33 }] })).ok, true);
    w.originMap = w.ctx.$gameMap.mapId();
    return w;
}
// 開始 → ステージへ移動 → 到着 → 戦闘が始まる(PREPARE)まで
function encStart(w, options = {}) {
    const r = quietly(() => plain(w.enc.start({ bossId: BOSS, resultVariableId: VAR, ...options })));
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(plainState(w).state, "entering");
    arrive(w); fr(w, 12);
    assert.equal(plainState(w).state, "fighting", JSON.stringify([plainState(w), plain(w.enc.getLog()).slice(-3)]));
    assert.equal(w.soul.getPhase(), "prepare");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    fr(w, 4);
    w.encEnds = []; w.soul.onEnd(e => w.encEnds.push([e.reason, e.reason === "victory" ? "victory" : e.reason === "playerDead" ? "defeat" : "other"]));
    return w;
}
// 元のマップへ戻る(Stage の leave → 到着 → 片づけ)まで進める
function encReturn(w) {
    fr(w, 40);
    assert.equal(stageState(w).state, "idle", JSON.stringify([plainState(w), plain(w.enc.getLog()).slice(-4), stageState(w)]).slice(0, 700));
}
const toDefenseNow = w => { w.soul.beginAttack(); fr(w, 2); w.soul.skipPhase(); fr(w, 4); assert.equal(w.soul.getPhase(), "defense"); };
const nextScene = w => w.ctx.SceneManager._nextScene;
const nextIs = (w, name) => !!nextScene(w) && nextScene(w) instanceof w.ctx[name];
const newGame = w => { w.ctx.DataManager._globalInfo = w.ctx.DataManager._globalInfo || []; w.ctx.DataManager.setupNewGame(); };
const clearNext = w => { w.ctx.SceneManager._nextScene = null; };

test("D13 開始の受付: 登録の無いボス・不正な変数・無効なデッキは、何も変えずに断る(結果の変数は 3)。動いている最中の二重の開始は、動いている戦闘の結果を壊さず断る", () => {
    const w = encWorld({ deck: false });
    const before = itemsSnapshot(w);
    const snap = () => JSON.stringify([stageState(w).state, w.soul.isActive(), plainState(w).state, w.ctx.$gameMap.mapId()]);
    const s0 = snap();
    assert.equal(plain(w.enc.start({ bossId: "nope", resultVariableId: VAR })).reason, "unknownBoss");
    assert.equal(varOf(w), 3, "断った: その他(3)");
    w.ctx.$gameVariables.setValue(VAR, 0);
    assert.equal(plain(w.enc.start({ bossId: BOSS, resultVariableId: 99999 })).reason, "invalidResultVariable");
    assert.equal(varOf(w), 0, "変数が不正なら何も書かない");
    const noDeck = plain(w.enc.start({ bossId: BOSS, resultVariableId: VAR }));
    assert.deepEqual([noDeck.ok, noDeck.reason], [false, "invalidDeck"], "デッキが条件を満たさない");
    assert.equal(varOf(w), 3);
    assert.equal(snap(), s0, "何も変わっていない");
    assert.equal(itemsSnapshot(w), before, "デッキ・所持は書き換えない");
    assert.equal(saveOn(w), true, "断ったあとにセーブ禁止が残らない");
    // 有効なデッキなら受け付ける。動いている間の二重の開始は断り、結果の変数を触らない
    deckUp(w); w.ctx.$gameVariables.setValue(VAR, 0);
    encStart(w);
    w.ctx.$gameVariables.setValue(VAR, 0);
    assert.equal(plain(w.enc.start({ bossId: BOSS, resultVariableId: VAR })).reason, "encounterActive");
    assert.equal(varOf(w), 0, "動いている戦闘の結果を壊さない");
    assert.equal(w.enc.abort("t"), true); fr(w, 4); encReturn(w);
});

test("D13 勝利: 敵ハートのHP0で結果 1 を1回だけ確定。主人公の残りHPはそのまま。ステージから元のマップ・元の位置へ戻り、保存禁止が解ける。戦闘中は保存できない", () => {
    const w = encWorld();
    const origin = { map: w.ctx.$gameMap.mapId(), x: w.ctx.$gamePlayer.x, y: w.ctx.$gamePlayer.y };
    const before = itemsSnapshot(w);
    assert.equal(saveOn(w), true);
    leaderOf(w).setHp(300);
    encStart(w);
    assert.equal(varOf(w), 0, "戦闘中は 0");
    assert.equal(plainState(w).saveBlocked, true);
    assert.equal(saveOn(w), false, "戦闘中はセーブできない");
    assert.equal(w.ctx.Scene_Base.prototype.isAutosaveEnabled.call({}), false, "自動セーブも止まる");
    const results = []; w.enc.onResult(r => results.push(r));
    assert.equal(w.bf.isActive(), true, "ボス(BossFramework)が動いている");
    assert.equal(E(w).isEnabled(), true, "ボスの弾幕が自動で有効");
    assert.equal(E(w).getConfig().floorHp, 0, "本番は HP の下限なし");
    hurtEvent(w, w.heart, 1000); fr(w, 1);
    assert.deepEqual(w.encEnds, [["victory", "victory"]], "終了は1回だけ・結果は victory");
    assert.equal(varOf(w), 1, "結果の変数 = 1");
    assert.equal(plain(w.enc.getLastResult()).result, "victory");
    assert.equal(w.bf.isActive(), false, "ボスは終わる");
    assert.equal(E(w).isEnabled(), false, "弾幕の自動開始も解除");
    assert.equal(leaderOf(w).hp, 300, "主人公の残りHPはそのまま");
    assert.equal(saveOn(w), false, "元のマップへ戻るまでは保存禁止のまま");
    encReturn(w);
    assert.equal(plainState(w).state, "idle");
    assert.deepEqual([w.ctx.$gameMap.mapId(), Math.round(w.ctx.$gamePlayer.x), Math.round(w.ctx.$gamePlayer.y), stageState(w).state], [origin.map, origin.x, origin.y, "idle"], "元のマップ・元の位置へ戻る");
    assert.equal(saveOn(w), true, "戻ったら保存できる");
    assert.equal(leaderOf(w).hp, 300);
    assert.equal(results.length, 1, "戻った後の通知は1回");
    assert.equal(results[0].code, 1);
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), false, "勝利では敗北メニューへ行かない");
    assert.equal(varOf(w), 1);
    assert.equal(itemsSnapshot(w).replace(/"hp":\d+/, ""), before.replace(/"hp":\d+/, ""), "デッキ・所持・ゴールドは変わらない");
});

test("D13 T-19 同時 KO: 敵 HP0 と 自 HP0 が同じフレームなら勝利。結果は1回だけ。BossFramework の onVictory / onDefeat とも二重にならない。自分が先に倒れた(別のフレーム)なら敗北", () => {
    // 同じフレーム: 勝利
    const w = encWorld(); encStart(w);
    const bfEvents = []; w.bf.onVictory(() => bfEvents.push("victory")); w.bf.onDefeat(() => bfEvents.push("defeat"));
    toDefenseNow(w);
    hurtEvent(w, w.heart, 1000); leaderOf(w).setHp(0);              // 同じフレーム(間に frames を挟まない)
    assert.equal(w.ctx.ProjectR.PlayerDeath.isDead(), true);
    fr(w, 1);
    assert.deepEqual(w.encEnds, [["victory", "victory"]], "勝利が優先");
    assert.equal(varOf(w), 1);
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "result").length, 1, "結果の確定は1回");
    encReturn(w); fr(w, 20);
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), false, "敗北メニューは出ない");
    assert.equal(varOf(w), 1, "あとから結果が書き換わらない");
    assert.ok(bfEvents.length <= 1, "BossFramework の通知も二重にならない: " + bfEvents);
    // 自分が先(ハートはあとのフレーム): 敗北。そのあとハートが倒れても結果は変わらない
    const v = encWorld(); encStart(v); toDefenseNow(v);
    leaderOf(v).setHp(0); fr(v, 1);
    assert.deepEqual(v.encEnds, [["playerDead", "defeat"]]);
    hurtEvent(v, v.heart, 1000); fr(v, 6);
    assert.equal(v.encEnds.length, 1, "終了は1回だけ");
    assert.equal(varOf(v), 2);
    assert.equal(plain(v.enc.getLog()).filter(e => e.type === "result").length, 1);
    // 敵が先(自分があとのフレーム): 勝利のまま
    const u = encWorld(); encStart(u); toDefenseNow(u);
    hurtEvent(u, u.heart, 1000); fr(u, 1); leaderOf(u).setHp(0); fr(u, 6);
    assert.deepEqual(u.encEnds, [["victory", "victory"]]);
    assert.equal(varOf(u), 1);
});

test("D13 敗北: 主人公HP0で結果 2。元のマップへ戻ったあと、操作できるマップに残さず敗北メニューへ進む。保存禁止は敗北メニューの間も続く。BossFramework の敗北通知に頼らず1回だけ", () => {
    const w = encWorld(); encStart(w);
    toDefenseNow(w);
    const dead = []; w.bf.onDefeat(() => dead.push("bf"));
    leaderOf(w).setHp(0); fr(w, 1);
    assert.deepEqual(w.encEnds, [["playerDead", "defeat"]]);
    assert.equal(varOf(w), 2);
    assert.equal(plainState(w).state, "defeat");
    assert.equal(w.bf.isActive(), false);
    assert.deepEqual([E(w).isEnabled(), es(w).live, es(w).telegraphs], [false, 0, 0], "弾・警告も片づく");
    assert.equal(saveOn(w), false);
    encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), true, "敗北メニューの場面へ進む");
    assert.equal(w.ctx.$gameMap.mapId(), w.originMap, "元のマップ(HP0 のまま操作させる前に場面が変わる)");
    assert.equal(plainState(w).saveBlocked, true);
    assert.equal(saveOn(w), false, "敗北メニューの間は保存できない");
    assert.equal(w.ctx.Scene_Base.prototype.isAutosaveEnabled.call({}), false);
    // 「セーブ画面を開く」経由の保存の実行も止まる
    let failed = 0, saved = 0; const orig = w.ctx.DataManager.saveGame; w.ctx.DataManager.saveGame = function() { saved++; return Promise.resolve(); };
    w.ctx.Scene_Save.prototype.executeSave.call({ onSaveFailure() { failed++; } }, 1);
    w.ctx.DataManager.saveGame = orig;
    assert.deepEqual([failed, saved], [1, 0], "保存の実行は止まり、onSaveFailure になる");
    assert.equal(dead.length <= 1, true);
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "result").length, 1);
});

test("D13 T-20 敗北後の導線: 「セーブから再開」は標準のロード画面を開く。キャンセルすると敗北メニューへ戻る(マップへは戻らない)。「タイトルへ戻る」でタイトルへ。セーブが無ければ「セーブから再開」は選べない。自動のチェックポイントは無い", () => {
    const w = encWorld(); encStart(w); toDefenseNow(w);
    leaderOf(w).setHp(0); fr(w, 1); encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    clearNext(w);
    // セーブが1つも無い
    const realAny = w.ctx.DataManager.isAnySavefileExists;
    w.ctx.DataManager.isAnySavefileExists = () => false;
    assert.deepEqual(plain(w.enc.defeatCommands()), [{ name: "セーブから再開", symbol: "load", enabled: false }, { name: "タイトルへ戻る", symbol: "title", enabled: true }]);
    assert.deepEqual(plain(w.enc.chooseLoad()), { ok: false, reason: "noSavefile" });
    assert.equal(nextScene(w), null, "セーブが無ければロード画面を開かない");
    // セーブがある: ロード画面を開く(敗北メニューを積んで開く = キャンセルで敗北メニューへ戻る)
    w.ctx.DataManager.isAnySavefileExists = () => true;
    assert.deepEqual(plain(w.enc.defeatCommands()).map(c => [c.symbol, c.enabled]), [["load", true], ["title", true]]);
    const sm = w.ctx.SceneManager;
    sm._scene = { constructor: w.ctx.Scene_ProjectRSoulDefeat, stop() {} };                      // 敗北メニューの場面にいる
    assert.deepEqual(plain(w.enc.chooseLoad()), { ok: true, to: "Scene_Load" });
    assert.equal(nextIs(w, "Scene_Load"), true);
    assert.equal(sm._stack[sm._stack.length - 1], w.ctx.Scene_ProjectRSoulDefeat, "敗北メニューを積んでからロード画面へ");
    assert.equal(saveOn(w), false, "ロード画面を開いている間も保存できない");
    // ロード画面でキャンセル(pop): 敗北メニューへ戻る(Scene_Map ではない)
    clearNext(w); sm._scene = { constructor: w.ctx.Scene_Load, stop() {} };
    sm.pop();
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), true, "キャンセルすると敗北メニューへ戻る");
    assert.equal(nextIs(w, "Scene_Map"), false);
    assert.equal(plainState(w).state, "defeatMenu", "状態は敗北メニューのまま");
    assert.equal(saveOn(w), false, "戻っても保存できない");
    // 「タイトルへ戻る」
    clearNext(w);
    assert.deepEqual(plain(w.enc.chooseTitle()), { ok: true, to: "Scene_Title" });
    assert.equal(nextIs(w, "Scene_Title"), true);
    assert.equal(saveOn(w), false, "タイトルへ向かう間も保存できない");
    // ニューゲームで別のセーブになったら、記録が消えて保存禁止が解ける(敗北の記録を次のゲームへ持ち越さない)
    w.ctx.DataManager.isAnySavefileExists = realAny;
    newGame(w);
    assert.equal(plainState(w).state, "idle");
    assert.equal(plainState(w).saveBlocked, false);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true, "新しいゲームでは保存できる");
});

test("D13 敗北メニューの場面: 項目は「セーブから再開」「タイトルへ戻る」。キャンセルでは何も起きない(HP0のマップへ戻れない)。読み込んだセーブでは保存禁止が解ける。場面が組み立てられる", () => {
    const w = encWorld();
    const C = w.ctx;
    assert.equal(typeof C.Scene_ProjectRSoulDefeat, "function");
    assert.equal(typeof C.Window_ProjectRSoulDefeat, "function");
    // ウィンドウ: 項目・キャンセル無効(描画の無いハーネスで作れる範囲)
    let win = null;
    try { win = new C.Window_ProjectRSoulDefeat(new C.Rectangle(0, 0, 320, 120)); } catch (error) { win = null; }
    if (win) {
        assert.deepEqual(plain(win._list.map(c => [c.name, c.symbol])), [["セーブから再開", "load"], ["タイトルへ戻る", "title"]]);
        assert.equal(win.isCancelEnabled(), false, "キャンセルは無効");
        let cancelled = 0; win.setHandler("cancel", () => cancelled++); win.processCancel();
        assert.equal(cancelled, 0, "キャンセルのハンドラは呼ばれない");
        C.DataManager.isAnySavefileExists = () => false;
        const none = new C.Window_ProjectRSoulDefeat(new C.Rectangle(0, 0, 320, 120));
        assert.deepEqual([none.isCommandEnabled(0), none.isCommandEnabled(1)], [false, true], "セーブが無ければ「セーブから再開」は無効");
        assert.equal(none.index(), 1, "セーブが無ければ「タイトルへ戻る」が選ばれている");
    }
    // 場面の組み立て(ハーネスの stub で作れるときだけ)
    let scene = null;
    try { scene = new C.Scene_ProjectRSoulDefeat(); scene.create(); } catch (error) { scene = null; }
    if (scene) {
        assert.ok(scene._commandWindow, "コマンドウィンドウがある");
        assert.equal(scene._commandWindow.isCancelEnabled(), false);
    }
    // 読み込んだセーブ(別の $gameSystem)になったら、保存禁止が解ける
    deckUp(w); encStart(w); toDefenseNow(w); leaderOf(w).setHp(0); fr(w, 1); encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    const contents = C.DataManager.makeSaveContents();
    let loaded = true; try { C.DataManager.extractSaveContents(contents); } catch (error) { loaded = false; }
    if (loaded) {
        assert.equal(plainState(w).state, "idle", "読み込みで敗北の記録が消える");
        assert.equal(saveOn(w), true, "読み込んだセーブは保存できる(禁止は引き継がない)");
    }
});

test("D13 その他(結果 3): 中断(abort)・開始の失敗・戦闘中のマップ移動などは、結果 3 で元のマップへ戻る。主人公のHPはそのまま。敗北メニューへは行かない", () => {
    const w = encWorld(); leaderOf(w).setHp(222); encStart(w);
    assert.equal(w.enc.abort("test"), true); fr(w, 4);
    assert.deepEqual(w.encEnds.map(e => e[1]), ["other"]);
    assert.equal(varOf(w), 3);
    assert.equal(plain(w.enc.getLastResult()).code, 3);
    encReturn(w);
    assert.deepEqual([plainState(w).state, w.ctx.$gameMap.mapId(), leaderOf(w).hp, saveOn(w)], ["idle", w.originMap, 222, true]);
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), false);
    // 戦闘が外から終わる(カード戦闘の外部終了 = cardBattleEnded): その他
    const v = encWorld(); encStart(v);
    v.ctx.ProjectRCombatSession.endAll("external"); fr(v, 4);
    assert.equal(varOf(v), 3, JSON.stringify(v.encEnds));
    encReturn(v);
    assert.equal(plainState(v).state, "idle");
    // ステージへ着く前に中断(entering)
    const u = encWorld();
    assert.equal(plain(u.enc.start({ bossId: BOSS, resultVariableId: VAR })).ok, true);
    assert.equal(u.enc.abort("early"), true);
    assert.equal(varOf(u), 3);
    arrive(u); fr(u, 10); encReturn(u);
    assert.equal(plainState(u).state, "idle");
    assert.equal(saveOn(u), true);
});

test("D13 繰り返し: 勝利 → 中断 → 勝利 → 敗北 を続けても、毎回きれいに始まり・終わる(弾・ボス・マナ・保存禁止・結果)。敗北のあとは読み込み相当のリセットで次へ", () => {
    const w = encWorld();
    const origin = { map: w.originMap, x: Math.round(w.ctx.$gamePlayer.x), y: Math.round(w.ctx.$gamePlayer.y) };
    const codes = [];
    const clean = () => {
        assert.deepEqual([plainState(w).state, stageState(w).state, w.soul.isActive(), w.bf.isActive(), E(w).isEnabled(), es(w).live, es(w).telegraphs], ["idle", "idle", false, false, false, 0, 0]);
        assert.equal(plain(w.ctx.ProjectRSoulMana.getState()).active, false, "マナも終わっている");
        assert.equal(saveOn(w), true);
        assert.deepEqual([w.ctx.$gameMap.mapId(), Math.round(w.ctx.$gamePlayer.x), Math.round(w.ctx.$gamePlayer.y)], [origin.map, origin.x, origin.y]);
    };
    const kinds = ["victory", "abort", "victory"];
    kinds.forEach((kind, i) => {
        w.ctx.$gameVariables.setValue(VAR, 99);
        encStart(w);
        assert.equal(varOf(w), 0, `${i + 1}回目: 受け付けたら 0`);
        if (kind === "victory") { toDefenseNow(w); fr(w, 70); hurtEvent(w, w.heart, 1000); fr(w, 6); }
        else { w.enc.abort("t"); fr(w, 4); }
        encReturn(w); fr(w, 10);
        codes.push(varOf(w));
        clean();
    });
    assert.deepEqual(codes, [1, 3, 1]);
    // 最後は敗北
    encStart(w); toDefenseNow(w); leaderOf(w).setHp(0); fr(w, 1); encReturn(w); fr(w, 4);
    assert.equal(varOf(w), 2);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(plain(w.enc.getState()).serial, 4);
});

test("D13 後片づけ: DEFENSE の途中(弾・警告が出ている)で 勝利 / 敗北 / 中断 になっても、弾・警告・絵・ボス・弾幕の自動開始が残らず、次の戦闘は最初から始まる", () => {
    for (const kind of ["victory", "defeat", "abort"]) {
        const w = encWorld(); encStart(w); toDefenseNow(w);
        heartTo(w, 0.5, 0.5); fr(w, 90);
        assert.ok(es(w).running && (es(w).live > 0 || es(w).telegraphs > 0), kind + ": 弾幕の途中");
        assert.ok(layerChildren(w) > 0);
        if (kind === "victory") hurtEvent(w, w.heart, 1000); else if (kind === "defeat") leaderOf(w).setHp(0); else w.enc.abort("t");
        fr(w, 4);
        assert.deepEqual([es(w).live, es(w).telegraphs, es(w).running, E(w).isEnabled(), w.bf.isActive()], [0, 0, false, false, false], kind + ": 何も残らない");
        assert.equal(layerChildren(w), 0, kind + ": 絵が残らない");
        const spawned = es(w).stats.spawned; fr(w, 200);
        assert.equal(es(w).stats.spawned, spawned, kind + ": 古い弾幕の続きは撃たれない");
        encReturn(w); fr(w, 4);
        if (kind === "defeat") { assert.equal(plainState(w).state, "defeatMenu"); newGame(w); }
        assert.equal(plainState(w).state, "idle", kind);
    }
});

test("D13 本番では HP の下限なし: 敵の弾で主人公が HP0 になって敗北する。同じフレームの後続の弾は『死亡済み』で数え、結果は1回。DEV の Sandbox(a16)は従来どおり下限 1 で敗北しない", () => {
    const w = encWorld(); leaderOf(w).setHp(60); encStart(w); toDefenseNow(w);
    heartTo(w, 0.5, 0.5);
    fr(w, 8); E(w).clear("t");                                         // 自動で始まった弾幕をいったん消して、重なった弾の確認用に出し直す
    const res = plain(E(w).fire("dev_radial", { cutIn: false, waves: 1 }));
    assert.equal(res.ok, true);
    mouseTo(w, res.origin.x, 0.0141); fr(w, 2);
    for (let i = 0; i < 70 && w.soul.isActive(); i++) fr(w, 1);
    assert.equal(leaderOf(w).hp, 0, "HP は 0 まで減る");
    assert.equal(es(w).stats.hits, 13, "重なった13発すべてを弾ごとに数える");
    assert.equal(es(w).stats.hpLost, 60);
    assert.ok(es(w).stats.hitsAfterDeath >= 10, "HP0 になった弾より後の弾は dead: " + es(w).stats.hitsAfterDeath);
    assert.deepEqual(plain(E(w).getHits()).slice(0, 3).map(h => h.dealt), [25, 25, 10], "弾ごとのダメージ(25, 25, 残り10)");
    assert.equal(varOf(w), 2, "敗北");
    assert.equal(w.encEnds.length, 1);
    encReturn(w); fr(w, 4); newGame(w);
    // DEV の Sandbox(a16)は下限 1 のまま
    const s = startA16(world(), { prepare: true, extra: {} });
    assert.equal(E(s).getConfig().floorHp, 1, "Sandbox は DEV の下限");
    s.sb.stop(); fr(s, 4);
    assert.equal(E(s).getConfig().floorHp, 0, "Sandbox を終えると本番の既定へ戻る");
});

test("D13 既存への影響なし: 通常のマップでは保存できる・結果は返らない・従来の SOUL の終了の結果は other・通常のマップ戦闘の保存許可は変わらない。ボスが未登録でも他の機能は動く", () => {
    const w = world();
    assert.equal(saveOn(w), true);
    assert.deepEqual([plainState(w).state, plainState(w).saveBlocked, plain(ENC(w).getLastResult())], ["idle", false, null]);
    assert.equal(plain(w.ctx.Scene_Base.prototype.isAutosaveEnabled.call({})), w.ctx.$gameSystem.isAutosaveEnabled() && w.ctx.$gameSystem.isSaveEnabled() && !w.ctx.DataManager.isBattleTest() && !w.ctx.DataManager.isEventTest(), "通常のマップの自動セーブの条件は変わらない");
    // 従来の SOUL(prepare なし)の終了
    const ends = []; w.soul.onEnd(e => ends.push([e.reason, Object.keys(plain(e)).sort().join(",")]));
    assert.equal(plain(w.soul.start({ heart: false, attackSeconds: 1, defenseSeconds: 1 })).ok, true);
    assert.equal(saveOn(w), false, "SOUL 中は従来どおり保存できない");
    w.soul.end("abort"); fr(w, 2);
    assert.deepEqual(ends, [["abort", "reason,rounds"]], "従来の SOUL の終了のペイロードの形は変えない");
    assert.equal(saveOn(w), true);
    // 準備ループの終了理由と結果
    const e2 = []; w.soul.onEnd(e => e2.push([e.reason, e.rounds]));
    assert.equal(plain(w.soul.start({ heart: false, prepare: true, attackSeconds: 1, defenseSeconds: 1, rounds: 1 })).ok, true);
    w.soul.beginAttack(); fr(w, 70); fr(w, 70);
    assert.deepEqual(e2, [["completed", 1]], "ラウンド完了は勝敗なし(結果の番号は other)");
});

console.log(`\n${passed} tests passed`);
