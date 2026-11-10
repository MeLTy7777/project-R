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
    attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
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
    attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
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
const fr = (w, n) => { for (let i = 0; i < n; i++) { if (w.ctx.$gamePlayer.isTransferring()) { arrive(w); w.scene._active = true; if (w.ctx.SceneManager._nextScene instanceof w.ctx.Scene_Map) w.ctx.SceneManager._nextScene = null; } frames(w, 1); } };   // 実際は goto(Scene_Map) で場面が入れ替わる(入れ替わるまで isSceneChanging が真でイベントが進まない)
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
// ボスごとの弾幕の表(形態の数 + 1 個。DEV の既定の表と同じ内容を、本番のボス定義として明示する)
const PLAN3 = [
    { rotation: [{ pattern: "dev_aimed", options: {} }] },
    { rotation: [{ pattern: "dev_fan", options: {} }, { pattern: "dev_aimed", options: { shots: 4, shotGap: 30, speed: 0.46 } }] },
    { rotation: [{ pattern: "dev_radial", options: {} }, { pattern: "dev_fan", options: { count: 9, spreadDeg: 110 } }, { pattern: "dev_aimed", options: { shots: 5, shotGap: 26, warnFrames: 34, speed: 0.5 } }] }
];
function encWorld({ deck = true, boss = true } = {}) {
    const w = world();
    w.enc = ENC(w);
    if (deck) deckUp(w);
    if (boss) assert.equal(plain(w.enc.registerBoss({ bossId: BOSS, name: "TEST BOSS", hp: 1000, phases: [{ id: "phase2", label: "第二形態", hpRatio: 0.66 }, { id: "phase3", label: "第三形態", hpRatio: 0.33 }], bulletPlan: PLAN3 })).ok, true);
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
    attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
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
    assert.equal(varOf(w), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
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
    assert.equal(varOf(w), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
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
    encReturn(v); fr(v, 4);
    assert.equal(varOf(v), 2, "敗北メニューへ進む直前に 2");
    assert.equal(plain(v.enc.getLog()).filter(e => e.type === "result").length, 1);
    // 敵が先(自分があとのフレーム): 勝利のまま
    const u = encWorld(); encStart(u); toDefenseNow(u);
    hurtEvent(u, u.heart, 1000); fr(u, 1); leaderOf(u).setHp(0); fr(u, 6);
    assert.deepEqual(u.encEnds, [["victory", "victory"]]);
    encReturn(u); fr(u, 4);
    assert.equal(varOf(u), 1);
});

test("D13 敗北: 主人公HP0で結果 2。元のマップへ戻ったあと、操作できるマップに残さず敗北メニューへ進む。保存禁止は敗北メニューの間も続く。BossFramework の敗北通知に頼らず1回だけ", () => {
    const w = encWorld(); encStart(w);
    toDefenseNow(w);
    const dead = []; w.bf.onDefeat(() => dead.push("bf"));
    leaderOf(w).setHp(0); fr(w, 1);
    assert.deepEqual(w.encEnds, [["playerDead", "defeat"]]);
    assert.equal(varOf(w), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
    assert.equal(plainState(w).state, "defeat");
    assert.equal(w.bf.isActive(), false);
    assert.deepEqual([E(w).isEnabled(), es(w).live, es(w).telegraphs], [false, 0, 0], "弾・警告も片づく");
    assert.equal(saveOn(w), false);
    encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(varOf(w), 2, "敗北メニューへ進む直前に 2");
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
    assert.equal(w.enc.abort("test"), true);
    assert.equal(varOf(w), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
    fr(w, 1);                                                          // 到着の処理 + 1フレーム: ここで元のマップへ戻りきる
    assert.deepEqual(w.encEnds.map(e => e[1]), ["other"]);
    assert.equal(varOf(w), 3, "戻りきったら 3");
    assert.equal(plain(w.enc.getLastResult()).code, 3);
    encReturn(w);
    assert.equal(varOf(w), 3, "戻ったら 3");
    assert.deepEqual([plainState(w).state, w.ctx.$gameMap.mapId(), leaderOf(w).hp, saveOn(w)], ["idle", w.originMap, 222, true]);
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), false);
    // 戦闘が外から終わる(カード戦闘の外部終了 = cardBattleEnded): その他
    const v = encWorld(); encStart(v);
    v.ctx.ProjectRCombatSession.endAll("external");
    assert.equal(varOf(v), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
    encReturn(v);
    assert.equal(varOf(v), 3, JSON.stringify(v.encEnds));
    assert.equal(plainState(v).state, "idle");
    // ステージへ着く前に中断(entering)
    const u = encWorld();
    assert.equal(plain(u.enc.start({ bossId: BOSS, resultVariableId: VAR })).ok, true);
    assert.equal(u.enc.abort("early"), true);
    assert.equal(varOf(u), 0, "結果の変数は、戦闘が完全に終わる(元のマップへ戻る)まで 0 = 進行中");
    arrive(u); fr(u, 10); encReturn(u);
    assert.equal(varOf(u), 3);
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
    assert.equal(w.encEnds.length, 1);
    encReturn(w); fr(w, 4);
    assert.equal(varOf(w), 2, "敗北");
    newGame(w);
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


// ================================================================ I6-A: 本番のデータ・イベントからの開始 ================================================================
// 本番の経路だけを使う(ProjectRApolloTest も registerBoss の直接呼び出しも使わない): 指輪の入手(プラグインコマンド)→ ボス定義のパラメータ → イベントの StartSoulEncounter
const cmd357 = (plugin, command, args) => ({ code: 357, indent: 0, parameters: [plugin, command, command, args] });
const runList = (w, list, eventId = 0) => { const it = new w.ctx.Game_Interpreter(); it.setup([...list, { code: 0, indent: 0, parameters: [] }], eventId); for (let i = 0; i < 30 && it.isRunning(); i++) it.update(); return it; };
const setVar = (id, value) => ({ code: 122, indent: 0, parameters: [id, id, 0, 0, value] });
const mzStruct = v => Array.isArray(v) ? JSON.stringify(v.map(x => (x && typeof x === "object" ? mzStruct(x) : x))) : (v && typeof v === "object") ? JSON.stringify(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x && typeof x === "object" ? mzStruct(x) : typeof x === "number" ? String(x) : x]))) : v;
const mzBossParam = defs => mzStruct(defs);      // MZ の struct[] の保存形式(JSON の文字列が入れ子。数値も文字列)
const PBOSS = "prod_test_boss", REWARD_VAR = 19, MARK_VAR = 18, COMMON_VICTORY = 90, COMMON_OTHER = 91;
function prodWorld({ deck = true, boss = true } = {}) {
    const w = world();
    w.enc = ENC(w);
    if (deck) runList(w, [cmd357("ProjectR_HermesProductionDeck", "AcquireHermesRing", {})]);                    // 本番の初期デッキ(ヘルメース 7種30枚)
    if (boss) {
        const r = plain(w.enc.loadBossesFromText(mzBossParam([{ bossId: PBOSS, name: "PROD TEST BOSS", hp: 1000, phases: [{ id: "phase2", label: "第二形態", hpRatio: "0.66" }], bulletPlan: PLAN3.slice(0, 2), dodgeBoss: "", enemyImageFolder: "enemies", enemyImageName: "" }])));
        assert.deepEqual(r, { registered: [PBOSS], errors: [], rejected: [] });
    }
    // コモンイベント(テスト用にメモリ上だけ。変数 19 を加算する = 呼ばれた回数を数える)。ファイルは変えない
    const counter = (id, n) => ({ id, name: "TEST " + id, trigger: 0, switchId: 1, list: [{ code: 122, indent: 0, parameters: [REWARD_VAR, REWARD_VAR, 1, 0, n] }, { code: 0, indent: 0, parameters: [] }] });
    w.ctx.$dataCommonEvents[COMMON_VICTORY] = counter(COMMON_VICTORY, 1);
    w.ctx.$dataCommonEvents[COMMON_OTHER] = counter(COMMON_OTHER, 100);
    w.originMap = w.ctx.$gameMap.mapId();
    return w;
}
const startCmd = (extra = {}) => cmd357("ProjectR_SoulEncounter", "StartSoulEncounter", { bossId: PBOSS, resultVariableId: String(VAR), victoryCommonEventId: String(COMMON_VICTORY), otherCommonEventId: String(COMMON_OTHER), ...extra });
function prodFight(w, list = [startCmd()]) {
    const it = runList(w, list);
    fr(w, 12);
    assert.equal(plainState(w).state, "fighting", JSON.stringify([plainState(w), plain(w.enc.getLog()).slice(-3)]).slice(0, 600));
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    fr(w, 4);
    w.encEnds = []; w.soul.onEnd(e => w.encEnds.push([e.reason]));
    return it;
}
const rewardCount = w => w.ctx.$gameVariables.value(REWARD_VAR);

test("I6-A 本番のデータの確認: 製品の初期状態にボス定義は無い(作らない)。本番のデッキはヘルメースの初期30枚(指輪の入手コマンド)で、ボス戦の開始検証を通る。ボス定義のパラメータは、MZ の保存形式を読んで登録する(不正な項目は登録せず理由を返す)", () => {
    const w = world(); w.enc = ENC(w);
    assert.deepEqual(plain(w.enc.listBosses()), ["test_boss_a"], "登録されているのは、I6-C で入れたテスト用の仮のボス 1 体だけ(本番のボスの定義は無い。勝手に作らない)");
    assert.equal(plain(w.bf.validateEntry()).ok, false, "指輪を入手する前は、デッキが無い");
    runList(w, [cmd357("ProjectR_HermesProductionDeck", "AcquireHermesRing", {})]);
    const v = plain(w.bf.validateEntry());
    assert.deepEqual([v.ok, v.messages], [true, []], "ヘルメースの初期30枚(本番の付与)でボス戦の開始検証を通る");
    assert.equal(plain(w.ctx.ProjectRCardDeck.getDeck()).length, 30);
    assert.ok(plain(w.ctx.ProjectRCardDeck.getDeck()).every(id => /^hermes_/.test(id)), "本番のデッキはヘルメースのカードだけ");
    // パラメータの読み込み(MZ の struct[] の保存形式)
    const good = mzBossParam([
        { bossId: "b1", name: "ボス1", hp: 3000, phases: [{ id: "phase2", label: "第二形態", hpRatio: "0.66" }, { id: "phase3", label: "第三形態", hpRatio: "0.33" }], bulletPlan: PLAN3, dodgeBoss: "", enemyImageFolder: "enemies", enemyImageName: "" },
        { bossId: "b2", name: "", hp: 800, phases: [], bulletPlan: [PLAN3[0]], dodgeBoss: "x_boss", enemyImageFolder: "sv_enemies", enemyImageName: "Highking", enemyChestX: "0.5", enemyChestY: "0.4" }
    ]);
    assert.deepEqual(plain(w.enc.loadBossesFromText(good)), { registered: ["b1", "b2"], errors: [], rejected: [] });
    assert.deepEqual(plain(w.enc.listBosses()), ["test_boss_a", "b1", "b2"]);
    assert.deepEqual(plain(w.enc.loadBossesFromText("[]")), { registered: [], errors: [], rejected: [] }, "空は何も登録しない");
    assert.deepEqual(plain(w.enc.loadBossesFromText("")), { registered: [], errors: [], rejected: [] });
    const bad = plain(w.enc.loadBossesFromText(JSON.stringify([JSON.stringify({ bossId: "", name: "x" }), mzStruct({ bossId: "ok2", hp: 500, bulletPlan: [PLAN3[0]] }), JSON.stringify({ bossId: "ng_nohp" }), "not json at all", 5])));
    assert.deepEqual(bad.registered, ["ok2"], "HP と弾幕の表がそろった定義だけが登録される");
    assert.equal(bad.errors.length, 4, JSON.stringify(bad));
    assert.deepEqual(plain(bad.rejected).map(r => r.bossId), ["", "ng_nohp"]);
    assert.deepEqual(plain(w.enc.loadBossesFromText("{broken")).registered, [], "壊れた文字列は何も登録しない");
});

test("I6-A イベントからの開始(F8なし): 通常のイベントのプラグインコマンド StartSoulEncounter が、すぐ戻り(イベントは続きを実行できる)、ステージ → 準備ループ(8秒/6秒)→ ボス・弾幕・HP0敗北・保存禁止のある戦闘になる。結果の変数は戦闘が終わるまで 0", () => {
    const w = prodWorld();
    leaderOf(w).setHp(300);
    const it = runList(w, [startCmd(), setVar(MARK_VAR, 7)]);                                  // コマンドのあとの命令も、その場で実行される(待たない)
    assert.equal(it.isRunning(), false, "イベントは待たずに終わる");
    assert.equal(w.ctx.$gameVariables.value(MARK_VAR), 7, "開始の次の命令が実行された");
    assert.equal(plainState(w).state, "entering");
    assert.equal(varOf(w), 0, "受け付けた: 0 = 進行中");
    assert.equal(saveOn(w), false, "受け付けた時点から保存禁止");
    fr(w, 12);
    assert.equal(plainState(w).state, "fighting");
    assert.equal(w.soul.getPhase(), "prepare");
    assert.deepEqual([w.soul.getState().attackSeconds, w.soul.getState().defenseSeconds, w.soul.getState().prepare], [8, 6, true], "準備ループ 8秒 / 6秒");
    assert.equal(E(w).isEnabled(), true, "ボスの弾幕は自動");
    assert.equal(E(w).getConfig().floorHp, 0, "HP0 で敗北できる(下限なし)");
    assert.equal(plain(w.bf.getState()).bossId, PBOSS);
    w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] }); fr(w, 4);
    // 本番のデッキから、準備の手札が引ける(ヘルメースのカード)
    assert.equal(plain(w.ctx.ProjectRSoulPrepare.quickAttack()).ok, true);
    fr(w, 4);
    assert.equal(w.soul.getPhase(), "attack");
    const hand = plain(w.ctx.ProjectRCardDeck.getBattleState().hand).map(c => c.cardId);
    assert.equal(hand.length, 5);
    assert.ok(hand.every(id => /^hermes_/.test(id)), "手札は本番のデッキ(ヘルメース)から: " + hand);
    assert.equal(w.ctx.ProjectRSoulMana.getState().active, true);
    // 戦闘中の二重の開始(イベントをもう一度踏む)は断る。結果の変数・コモンイベント・戦闘は壊れない
    const before = JSON.stringify([plainState(w).serial, varOf(w), rewardCount(w)]);
    runList(w, [startCmd()]);
    assert.equal(JSON.stringify([plainState(w).serial, varOf(w), rewardCount(w)]), before, "二重の開始は何も変えない");
    assert.equal(plainState(w).state, "fighting");
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "rejected" && e.reason === "encounterActive").length, 1);
    // 最後まで: 敵ハートを倒す
    toDefenseNow(w);
    hurtEvent(w, w.heart, 1000); fr(w, 1);
    assert.equal(varOf(w), 0, "戦闘が終わっても、元のマップへ戻りきるまで 0");
    assert.equal(rewardCount(w), 0, "報酬のコモンイベントは、戻る前には呼ばれない");
    encReturn(w); fr(w, 60);
    assert.equal(varOf(w), 1, "戻りきったら 1");
    assert.equal(rewardCount(w), 1, "勝利のコモンイベントは1回だけ");
    assert.equal(leaderOf(w).hp, 300, "残りHPはそのまま");
    assert.equal(saveOn(w), true);
    fr(w, 300);
    assert.equal(rewardCount(w), 1, "あとから増えない");
});

test("I6-A 結果ごとの処理: 勝利 → 勝利のコモンイベント1回(変数1)/ その他(中断)→ その他のコモンイベント1回(変数3)/ 敗北 → 敗北メニュー(コモンイベントは呼ばない・変数2)/ 断られた開始 → 変数3 でコモンイベントは呼ばない。戦闘ごとに1回で、繰り返しても二重にならない", () => {
    const w = prodWorld();
    // 1回目: 勝利
    prodFight(w); toDefenseNow(w); hurtEvent(w, w.heart, 1000); fr(w, 1);
    w.enc.abort("late"); w.enc.abort("late2"); w.ctx.ProjectRCombatSession.endAll("external"); fr(w, 1);                 // 戻る途中で中断・終了が重なっても、結果は勝利のまま・報酬は1回だけ
    encReturn(w); fr(w, 60);
    assert.deepEqual([varOf(w), rewardCount(w)], [1, 1], "戻る途中の中断は結果を変えない");
    // 2回目: 中断(その他)。その他のコモンイベントは +100
    prodFight(w); assert.equal(varOf(w), 0, "新しい戦闘は 0 から"); w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 60);
    assert.deepEqual([varOf(w), rewardCount(w)], [3, 101], "その他: 変数 3・その他のコモンイベント1回");
    // 3回目: 勝利(繰り返しても1回ぶんだけ増える)
    prodFight(w); toDefenseNow(w); hurtEvent(w, w.heart, 1000); fr(w, 1); encReturn(w); fr(w, 120);
    assert.deepEqual([varOf(w), rewardCount(w)], [1, 102]);
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "commonEvent").length, 3, "予約は戦闘ごとに1回");
    // 断られた開始(ボス未登録): 変数 3・コモンイベントは呼ばない・戦闘は始まらない
    const r0 = rewardCount(w);
    runList(w, [startCmd({ bossId: "no_such_boss" })]); fr(w, 60);
    assert.deepEqual([varOf(w), rewardCount(w), plainState(w).state, stageState(w).state], [3, r0, "idle", "idle"]);
    // 4回目: 敗北 → 敗北メニュー。勝利/その他のコモンイベントは呼ばない
    prodFight(w); toDefenseNow(w); leaderOf(w).setHp(0); fr(w, 1); encReturn(w); fr(w, 60);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(varOf(w), 2);
    assert.equal(rewardCount(w), r0, "敗北ではコモンイベントを呼ばない");
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), true);
});

test("I6-A デッキが無い・ボス未設定は、何も変えずに断る(変数 3)。指輪の入手前にイベントを踏んでも安全で、入手後は始められる", () => {
    const w = prodWorld({ deck: false });
    const snap = () => JSON.stringify([plainState(w).state, stageState(w).state, w.soul.isActive(), w.ctx.$gameMap.mapId(), saveOn(w), plain(w.ctx.ProjectRCardDeck.getDeck()).length]);
    const s0 = snap(), items0 = itemsSnapshot(w);
    runList(w, [startCmd()]); fr(w, 30);
    assert.equal(snap(), s0, "デッキが無い: 何も変わらない");
    assert.equal(varOf(w), 3);
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "invalidDeck");
    assert.equal(itemsSnapshot(w), items0, "デッキ・所持は書き換えない");
    assert.equal(rewardCount(w), 0);
    const empty = world(); empty.enc = ENC(empty);
    runList(empty, [cmd357("ProjectR_HermesProductionDeck", "AcquireHermesRing", {}), startCmd()]); fr(empty, 30);
    assert.equal(plain(empty.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "unknownBoss", "ボス未設定は断る");
    // 指輪を入手してから踏めば、始められる
    runList(w, [cmd357("ProjectR_HermesProductionDeck", "AcquireHermesRing", {}), startCmd()]);
    assert.equal(plainState(w).state, "entering");
    assert.equal(varOf(w), 0);
});


// ================================================================ I6-B: ボスごとの戦闘データ(HP・形態・弾幕の表・敵の絵) ================================================================
const BOSS_A = "boss_a", BOSS_B = "boss_b";
const defA = () => ({ bossId: BOSS_A, name: "BOSS A", hp: 600, phases: [{ id: "a2", label: "A第二形態", hpRatio: 0.5 }],
    bulletPlan: [{ rotation: [{ pattern: "dev_aimed", options: { shots: 2, shotGap: 40 } }] }, { rotation: [{ pattern: "dev_fan", options: { count: 5, spreadDeg: 80 } }] }],
    enemyImage: { folder: "enemies", name: "ImgA", chest: { x: 0.5, y: 0.4 } } });
const defB = () => ({ bossId: BOSS_B, name: "BOSS B", hp: 2500, phases: [{ id: "b3", label: "B第三形態", hpRatio: 0.3 }, { id: "b2", label: "B第二形態", hpRatio: 0.7 }],         // 順不同でも、割合の大きい順に並べ直される
    bulletPlan: [{ rotation: [{ pattern: "dev_radial", options: { count: 9, waves: 2 } }] }, { rotation: [{ pattern: "dev_aimed", options: { shots: 3 } }, { pattern: "dev_fan", options: {} }] }, { rotation: [{ pattern: "dev_fan", options: { count: 11 } }] }] });
const ASSETS = (folder, name) => folder === "enemies" && name === "ImgA";
function i6bWorld(extra = []) {
    const w = prodWorld({ boss: false });
    w.enc.setAssetChecker(ASSETS);
    for (const d of [defA(), defB(), ...extra]) assert.equal(plain(w.enc.registerBoss(d)).ok, true, JSON.stringify(plain(w.enc.registerBoss(d))));
    return w;
}
const heartHpNow = w => w.ctx.$gameMap.getCurrentEventHp(w.heart);
const bfs = w => plain(w.bf.getState());
const snapshotIdle = w => JSON.stringify([plainState(w).state, stageState(w).state, w.soul.isActive(), w.ctx.$gameMap.mapId(), saveOn(w), w.bf.isActive(), w.ctx.ProjectRSoulBattlePoC.isActive(), E(w).isEnabled(), plain(E(w).getPlan(BOSS_A)), plain(E(w).getPlan(BOSS_B)), plain(w.stage.getEnemyLook())]);
const PLAN_OF = (w, id) => plain(E(w).getPlan(id));

test("I6-B ボスごとのデータ(2種類): 選んだボスの定義のHP・形態・弾幕の表・敵の絵が、敵ハート / BossFramework / 弾幕 / ステージに入る(PoC の敵 1000 や DEV の表ではない)", () => {
    const w = i6bWorld();
    const defaultLook = plain(w.stage.getEnemyLook()), defaultPlan = PLAN_OF(w, "default");
    // ---- ボス A: HP 600・形態 1つ・弾幕の表 2つ・敵の絵あり(胸の位置あり)
    encStart(w, { bossId: BOSS_A });
    assert.equal(heartHpNow(w), 600, "敵ハートの実際のHP");
    assert.equal(w.ctx.$gameMap.event(w.heart).PRmhp, 600, "敵ハートの最大HP");
    assert.equal(plain(w.ctx.ProjectRSoulBattlePoC.getState()).hpSource, "option", "HPはボス定義から(HeartEnemyName の敵ではない)");
    assert.deepEqual([bfs(w).bossId, bfs(w).name, bfs(w).hp, bfs(w).maxHp, bfs(w).phaseCount], [BOSS_A, "BOSS A", 600, 600, 2]);
    assert.deepEqual(plain(w.bf.getHudState()), { name: "BOSS A", hp: 600, maxHp: 600, ratio: 1, phaseLabel: "第一形態", phaseIndex: 0, phaseCount: 2 }, "HUD の表示も同じHP");
    assert.deepEqual(PLAN_OF(w, BOSS_A).phases.map(p => [p.id, p.rotation.map(e => e.pattern)]), [["phase1", ["dev_aimed"]], ["a2", ["dev_fan"]]], "弾幕の表はボス定義(DEV の表ではない)");
    assert.equal(PLAN_OF(w, BOSS_A).phases[1].rotation[0].options.count, 5);
    assert.equal(E(w).pickPattern().pattern, "dev_aimed", "第一形態の弾幕");
    assert.deepEqual(plain(w.stage.getEnemyLook()), { folder: "enemies", name: "ImgA", chest: { x: 0.5, y: 0.4 } }, "敵の絵(胸の位置つき)");
    assert.deepEqual(PLAN_OF(w, "default"), defaultPlan, "DEV の既定の表は変わらない");
    // 形態 2 へ(HP 300 以下)
    hurtEvent(w, w.heart, 350); fr(w, 2);
    assert.deepEqual([heartHpNow(w), bfs(w).hp, bfs(w).phaseIndex, bfs(w).phase.id], [250, 250, 1, "a2"], "同じHPで形態が進む");
    assert.equal(E(w).pickPattern().pattern, "dev_fan", "第二形態の弾幕(ボス A の表の 2 つ目)");
    w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20);
    assert.equal(plainState(w).state, "idle");
    assert.equal(E(w).getPlan(BOSS_A), null, "戦闘が終わったら、ボス A の表は外れる");
    assert.deepEqual(plain(w.stage.getEnemyLook()), defaultLook, "敵の絵も既定へ戻る");
    // ---- ボス B: HP 2500・形態 2つ(順不同で定義)・弾幕の表 3つ・敵の絵は未指定(仮の絵)
    encStart(w, { bossId: BOSS_B });
    assert.equal(heartHpNow(w), 2500);
    assert.deepEqual([bfs(w).bossId, bfs(w).maxHp, bfs(w).phaseCount], [BOSS_B, 2500, 3]);
    assert.deepEqual(PLAN_OF(w, BOSS_B).phases.map(p => [p.id, p.label, p.rotation.map(e => e.pattern)]), [["phase1", "第一形態", ["dev_radial"]], ["b2", "B第二形態", ["dev_aimed", "dev_fan"]], ["b3", "B第三形態", ["dev_fan"]]], "割合の大きい順(0.7 → 0.3)");
    assert.equal(E(w).pickPattern().pattern, "dev_radial");
    assert.deepEqual(plain(w.stage.getEnemyLook()), defaultLook, "敵の絵を指定しないボスは仮の絵(警告つき)");
    assert.ok(plain(w.enc.getLog()).filter(e => e.type === "start").pop().warnings.some(x => /enemyImage/.test(x)), "仮の絵は警告に出る");
    assert.equal(E(w).getPlan(BOSS_A), null, "別のボスの表は入らない");
    w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20);
    assert.equal(E(w).getPlan(BOSS_B), null);
});

test("I6-B HP・形態・勝利が同じ実際のHPで動く: 形態の境界(割合ちょうど)・HUD・勝利は敵ハートのHP0。ダメージは敵ハートの実際のHPだけを減らす", () => {
    const w = i6bWorld();
    encStart(w, { bossId: BOSS_B });                                             // HP 2500: 形態 2 = 1750 以下 / 形態 3 = 750 以下
    const at = (hp, index) => {
        assert.deepEqual([heartHpNow(w), bfs(w).hp, bfs(w).phaseIndex, plain(w.bf.getHudState()).hp, Math.round(plain(w.bf.getHudState()).ratio * 10000) / 10000], [hp, hp, index, hp, Math.round(hp / 2500 * 10000) / 10000], "HP " + hp);
    };
    at(2500, 0);
    hurtEvent(w, w.heart, 749); fr(w, 2); at(1751, 0);                           // 割合 0.7004: まだ第一形態
    hurtEvent(w, w.heart, 1); fr(w, 2); at(1750, 1);                             // 0.7 ちょうど: 第二形態
    assert.equal(E(w).pickPattern().phaseId, "b2");
    hurtEvent(w, w.heart, 999); fr(w, 2); at(751, 1);                            // 0.3004: まだ第二形態
    hurtEvent(w, w.heart, 1); fr(w, 2); at(750, 2);                              // 0.3 ちょうど: 第三形態
    assert.equal(E(w).pickPattern().phaseId, "b3");
    assert.equal(E(w).pickPattern().pattern, "dev_fan");
    assert.deepEqual(plain(w.ctx.ProjectRSoulBattlePoC.getState()).hp, 750);
    assert.equal(varOf(w), 0);
    // 勝利 = 敵ハートのHPが 0: 残りを一撃で
    toDefenseNow(w);
    hurtEvent(w, w.heart, 750); fr(w, 1);
    assert.deepEqual(w.encEnds, [["victory", "victory"]], "勝利は敵ハートのHP0(ボス定義のHPを削りきったとき)");
    encReturn(w); fr(w, 20);
    assert.equal(varOf(w), 1);
    // 別のボス(HP 600)でも同じ: 小さいHPの境界(300 = 0.5)
    encStart(w, { bossId: BOSS_A });
    hurtEvent(w, w.heart, 299); fr(w, 2);
    assert.deepEqual([heartHpNow(w), bfs(w).phaseIndex], [301, 0]);
    hurtEvent(w, w.heart, 1); fr(w, 2);
    assert.deepEqual([heartHpNow(w), bfs(w).phaseIndex, bfs(w).maxHp], [300, 1, 600]);
    w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20);
});

test("I6-B 不正な定義: HP・形態・弾幕の表・敵の絵・ID の不備は、登録せずに理由(どの項目か)を返す。PoC の敵(魔獣)・DEV の表へ黙って置き換えて始めない", () => {
    const w = i6bWorld();
    const base = () => defB();
    const reject = (mutate, field, label) => {
        const d = base(); mutate(d);
        const r = plain(w.enc.registerBoss(d));
        assert.equal(r.ok, false, label + ": 登録されない");
        assert.equal(r.reason, "invalidBoss");
        assert.ok(r.problems.some(p => p.startsWith(field)), label + ": " + field + " の理由が出る: " + JSON.stringify(r.problems));
        return r;
    };
    // HP
    assert.match(reject(d => { delete d.hp; }, "hp", "HP 未設定").problems.join(), /hp: 未設定です.*魔獣/, "HP が無いことと、PoC の敵には置き換えないことが理由に出る");
    reject(d => { d.hp = 0; }, "hp", "HP 0");
    reject(d => { d.hp = -5; }, "hp", "HP 負");
    reject(d => { d.hp = 12.5; }, "hp", "HP 小数");
    reject(d => { d.hp = "abc"; }, "hp", "HP 文字");
    reject(d => { d.hp = 1e9; }, "hp", "HP 大きすぎる");
    // ID
    reject(d => { d.bossId = ""; }, "bossId", "ID なし");
    reject(d => { d.bossId = "default"; }, "bossId", "ID default");
    // 形態
    reject(d => { d.phases[0].hpRatio = 1.2; }, "phases[0].hpRatio", "割合 1.2");
    reject(d => { d.phases[0].hpRatio = 0; }, "phases[0].hpRatio", "割合 0");
    reject(d => { d.phases[1].id = d.phases[0].id; }, "phases[1].id", "形態 ID 重複");
    reject(d => { d.phases[0].id = "phase1"; }, "phases[0].id", "phase1 は予約");
    reject(d => { d.phases[1].hpRatio = d.phases[0].hpRatio; }, "phases[1].hpRatio", "割合の重複");
    // 弾幕の表
    reject(d => { delete d.bulletPlan; }, "bulletPlan", "弾幕の表なし(DEV の表は使わない)");
    reject(d => { d.bulletPlan = []; }, "bulletPlan", "弾幕の表が空");
    reject(d => { d.bulletPlan = d.bulletPlan.slice(0, 2); }, "bulletPlan", "表の数が形態の数と合わない");
    reject(d => { d.bulletPlan[1].rotation = []; }, "bulletPlan[1].rotation", "表の中身が空");
    reject(d => { d.bulletPlan[0].rotation[0].pattern = "no_such"; }, "bulletPlan[0].rotation[0].pattern", "知らない弾幕");
    reject(d => { d.bulletPlan[0].rotation[0].options.bogus = 1; }, "bulletPlan[0].rotation[0].bogus", "知らない項目");
    reject(d => { d.bulletPlan[0].rotation[0].options.speed = 10; }, "bulletPlan[0].rotation[0].speed", "速さが範囲外");
    reject(d => { d.bulletPlan[0].rotation[0].options.count = 40; }, "bulletPlan[0].rotation[0].count", "弾の数が範囲外");
    reject(d => { d.bulletPlan[0].rotation[0].options.count = 2.5; }, "bulletPlan[0].rotation[0].count", "弾の数が整数でない");
    reject(d => { d.bulletPlan[0].rotation[0].options.waves = "x"; }, "bulletPlan[0].rotation[0].waves", "数値でない");
    // 敵の絵
    reject(d => { d.enemyImage = { folder: "pictures", name: "X" }; }, "enemyImage.folder", "フォルダが違う");
    reject(d => { d.enemyImage = { folder: "enemies", name: "../secret" }; }, "enemyImage.name", "ファイル名に .. や /");
    reject(d => { d.enemyImage = { folder: "enemies", name: "ImgA", chest: { x: 2, y: 0.5 } }; }, "enemyImage.chest", "胸の位置が範囲外");
    // 複数の不備は、まとめて出る
    const many = plain(w.enc.registerBoss({ bossId: "multi", hp: 0, phases: [{ id: "", hpRatio: 5 }], bulletPlan: [] }));
    assert.ok(many.problems.length >= 4, JSON.stringify(many.problems));
    // 登録されなかった定義は一覧に残り、始めようとすると理由つきで断る(何も変えない・PoC の敵で始めない)
    assert.ok(plain(w.enc.listRejected()).some(r => r.bossId === "multi"));
    const before = snapshotIdle(w);
    runList(w, [startCmd({ bossId: "multi" })]); fr(w, 30);
    assert.equal(snapshotIdle(w), before, "不正な定義: 何も変わらない");
    assert.equal(varOf(w), 3);
    const last = plain(w.enc.getLog()).filter(e => e.type === "rejected").pop();
    assert.equal(last.reason, "invalidBoss");
    assert.ok(last.problems.length >= 4);
    assert.equal(plainState(w).state, "idle");
    assert.equal(plain(w.enc.validateBoss("multi")).ok, false);
    // 登録済みの有効な定義を不正に更新すると、始められなくなる(古い定義で黙って始めない)。直せば始められる
    const bad = defA(); bad.hp = 0;
    assert.equal(plain(w.enc.registerBoss(bad)).ok, false);
    assert.deepEqual(plain(w.enc.listBosses()).includes(BOSS_A), false);
    assert.equal(plain(w.enc.registerBoss(defA())).ok, true);
    assert.equal(plain(w.enc.listRejected()).some(r => r.bossId === BOSS_A), false, "直したら拒否の記録は消える");
    assert.equal(plain(w.enc.validateBoss(BOSS_A)).ok, true);
    // 有効な定義の警告: 名前なし・敵の絵なし
    const warn = defB(); warn.bossId = "warn_boss"; delete warn.name;
    const rw = plain(w.enc.registerBoss(warn));
    assert.equal(rw.ok, true);
    assert.ok(rw.warnings.some(x => /^name/.test(x)) && rw.warnings.some(x => /^enemyImage/.test(x)));
    // 長すぎる弾幕は警告(登録はできる)
    const longB = defB(); longB.bossId = "long_boss"; longB.bulletPlan[0].rotation[0].options = { waves: 8, waveGap: 100 };
    const rl = plain(w.enc.registerBoss(longB));
    assert.equal(rl.ok, true);
    assert.ok(rl.warnings.some(x => /DEFENSE/.test(x)), JSON.stringify(rl.warnings));
});

test("I6-B 欠落した素材: 敵の絵のファイルが無い・回避AIが未登録なら、何も変えずに理由つきで断る(別の絵・無しで黙って始めない)。ファイルの有無が確認できない環境は警告だけで始まる", () => {
    const w = i6bWorld();
    const miss = defA(); miss.bossId = "miss_img"; miss.enemyImage = { folder: "enemies", name: "NoSuchFile" };
    assert.equal(plain(w.enc.registerBoss(miss)).ok, true, "定義の形は正しい");
    assert.deepEqual(plain(w.enc.validateBoss("miss_img")).problems, ["enemyImage: img/enemies/NoSuchFile.png が見つかりません"]);
    const before = snapshotIdle(w), items0 = itemsSnapshot(w);
    runList(w, [startCmd({ bossId: "miss_img" })]); fr(w, 30);
    assert.equal(snapshotIdle(w), before, "素材が無い: 何も変わらない");
    assert.equal(itemsSnapshot(w), items0);
    assert.equal(varOf(w), 3);
    assert.equal(rewardCount(w), 0);
    const last = plain(w.enc.getLog()).filter(e => e.type === "rejected").pop();
    assert.equal(last.reason, "invalidBoss");
    assert.match(last.problems.join(), /NoSuchFile/);
    assert.equal(w.stage.getEnemyLook().name, plain(w.stage.DEFAULT_ENEMY_LOOK).name, "既定の絵のまま(別の絵へ黙って置き換えない)");
    // 回避AIが未登録
    const dodge = defA(); dodge.bossId = "miss_dodge"; dodge.dodgeBoss = "no_such_dodge_boss";
    assert.equal(plain(w.enc.registerBoss(dodge)).ok, true);
    assert.match(plain(w.enc.validateBoss("miss_dodge")).problems.join(), /dodgeBoss/);
    runList(w, [startCmd({ bossId: "miss_dodge" })]); fr(w, 30);
    assert.equal(snapshotIdle(w), before);
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "invalidBoss");
    // ファイルが後から用意されれば(チェッカーが true)、同じ定義のまま始まる
    w.enc.setAssetChecker((folder, name) => name === "NoSuchFile" || ASSETS(folder, name));
    assert.equal(plain(w.enc.validateBoss("miss_img")).ok, true);
    encStart(w, { bossId: "miss_img" });
    assert.equal(w.stage.getEnemyLook().name, "NoSuchFile");
    w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20);
    // 確認できない環境(null): 警告だけで始まる
    w.enc.setAssetChecker(() => null);
    const v = plain(w.enc.validateBoss(BOSS_A));
    assert.equal(v.ok, true);
    assert.ok(v.warnings.some(x => /確認できません/.test(x)));
    encStart(w, { bossId: BOSS_A });
    w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20);
});

test("I6-B 後片づけと繰り返し: ボス A → B → A … で、毎回そのボスのHP・表・絵で始まり、終わると外れる。勝利・敗北・中断・読み込みのどれでも表は残らない。元からある同名の表は戻る。新しい戦闘のHPは満タン", () => {
    const w = i6bWorld();
    const defaultPlan = PLAN_OF(w, "default"), defaultLook = plain(w.stage.getEnemyLook());
    const expectClean = why => {
        assert.deepEqual([plainState(w).state, stageState(w).state, w.soul.isActive(), w.bf.isActive(), w.ctx.ProjectRSoulBattlePoC.isActive(), E(w).isEnabled(), saveOn(w)], ["idle", "idle", false, false, false, false, true], why);
        assert.equal(E(w).getPlan(BOSS_A), null, why + ": 表 A");
        assert.equal(E(w).getPlan(BOSS_B), null, why + ": 表 B");
        assert.deepEqual(PLAN_OF(w, "default"), defaultPlan, why + ": DEV の表");
        assert.deepEqual(plain(w.stage.getEnemyLook()), defaultLook, why + ": 絵");
        assert.equal(w.ctx.$gameMap.mapId(), w.originMap, why + ": 元のマップ");
    };
    const finishWin = () => { toDefenseNow(w); hurtEvent(w, w.heart, heartHpNow(w)); fr(w, 1); encReturn(w); fr(w, 20); };
    // 勝利(A)→ 中断(B)→ 勝利(A)→ 敗北(B)
    encStart(w, { bossId: BOSS_A }); assert.equal(heartHpNow(w), 600); finishWin(); expectClean("A 勝利"); assert.equal(varOf(w), 1);
    encStart(w, { bossId: BOSS_B }); assert.equal(heartHpNow(w), 2500); assert.deepEqual([bfs(w).maxHp, bfs(w).phaseCount], [2500, 3]); w.enc.abort("t"); fr(w, 1); encReturn(w); fr(w, 20); expectClean("B 中断"); assert.equal(varOf(w), 3);
    encStart(w, { bossId: BOSS_A }); assert.equal(heartHpNow(w), 600, "新しい戦闘のHPは満タン(前の戦闘のダメージを引き継がない)"); assert.equal(bfs(w).phaseIndex, 0, "形態も最初から"); finishWin(); expectClean("A 2回目");
    encStart(w, { bossId: BOSS_B }); toDefenseNow(w); leaderOf(w).setHp(0); fr(w, 1); encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu"); assert.equal(varOf(w), 2);
    assert.equal(E(w).getPlan(BOSS_B), null, "敗北でも表は外れる");
    assert.deepEqual(plain(w.stage.getEnemyLook()), defaultLook);
    newGame(w); fr(w, 2);                                                         // 敗北メニューから別のセーブ / ニューゲーム
    assert.equal(plainState(w).state, "idle");
    assert.equal(E(w).getPlan(BOSS_B), null);
    // 読み込み(reset)で戦闘が途中で消えても、表は残らない
    const w2 = i6bWorld();
    encStart(w2, { bossId: BOSS_B });
    assert.ok(E(w2).getPlan(BOSS_B));
    w2.ctx.DataManager.setupNewGame && newGame(w2);
    fr(w2, 2);
    assert.equal(E(w2).getPlan(BOSS_B), null, "reset で外れる");
    assert.equal(plainState(w2).state, "idle");
    // 元からある同名の表は、戦闘のあと元に戻る
    const w3 = i6bWorld();
    const mine = { phases: [{ id: "x1", label: "x", rotation: [{ pattern: "dev_fan" }] }, { id: "x2", label: "y", rotation: [{ pattern: "dev_aimed" }] }] };
    assert.equal(plain(E(w3).registerPlan(BOSS_A, mine)).ok, true);
    const mineStored = PLAN_OF(w3, BOSS_A);
    encStart(w3, { bossId: BOSS_A });
    assert.deepEqual(PLAN_OF(w3, BOSS_A).phases.map(p => p.rotation[0].pattern), ["dev_aimed", "dev_fan"], "戦闘中はボス定義の表");
    w3.enc.abort("t"); fr(w3, 1); encReturn(w3); fr(w3, 20);
    assert.deepEqual(PLAN_OF(w3, BOSS_A), mineStored, "元の表が戻る");
});

test("I6-B 従来の PoC / DEV は変わらない: hp を指定しない敵ハートは HeartEnemyName の敵のHP(1000)のまま。hp の指定は整数だけで、不正な値は黙って従来の敵に置き換えず断る", () => {
    const w = world();
    const poc = w.ctx.ProjectRSoulBattlePoC;
    // SoulBattle 経由(従来の SOUL / DEV の Sandbox と同じ経路): hp なし = 従来の敵のHP
    const started = plain(w.soul.start({ prepare: true, rounds: 0, heart: { centerX: 12, centerY: 12, pattern: "static" } }));
    assert.equal(started.ok, true, JSON.stringify(started));
    assert.deepEqual([plain(poc.getState()).hp, plain(poc.getState()).hpSource], [1000, "enemyName"], "従来の PoC の敵(魔獣 HP 1000)");
    w.soul.end("t"); fr(w, 4);
    assert.equal(poc.isActive(), false);
    // heart.hp 指定(Encounter が使う経路)
    const s2 = plain(w.soul.start({ prepare: true, rounds: 0, heart: { centerX: 12, centerY: 12, pattern: "static", hp: 777 } }));
    assert.equal(s2.ok, true);
    assert.deepEqual([plain(poc.getState()).hp, plain(poc.getState()).hpSource], [777, "option"]);
    assert.ok(w.ctx.$gameMap.event(plain(poc.getState()).eventId).event().note.includes("<hp: 777>"));
    w.soul.end("t"); fr(w, 4);
    assert.equal(poc.isActive(), false, "敵ハートは後片づけされる");
    // PoC を直接: 不正な hp は断る(何も作らない)
    for (const bad of [0, -1, 1.5, "x", 1e9]) {
        const r = plain(poc.start({ hp: bad, centerX: 12, centerY: 12, pattern: "static", combatSession: false, lockPlayer: false }));
        assert.deepEqual([r.ok, r.reason], [false, "invalidHp"], "hp=" + bad);
        assert.equal(poc.isActive(), false);
    }
    const ok = plain(poc.start({ hp: "300", centerX: 12, centerY: 12, pattern: "static", combatSession: false, lockPlayer: false }));
    assert.equal(ok.ok, true); assert.equal(plain(poc.getState()).hp, 300);
    poc.end("t");
    // Encounter 以外の既存の弾幕: 既定の表は DEV のまま・表の登録が無ければ DEV の表を選ぶ(従来どおり)
    assert.deepEqual(plain(E(w).getPlan("default")), plain(E(w).DEFAULT_PLAN));
});


// ================================================================ I6-C: エディタ手順書(docs §16.9)の値をそのまま使う ================================================================
// 手順書のとおりに MZ のエディタで作ったデータと同じ形(Bosses パラメータ・イベントのコマンド・コモンイベント)で、勝利・敗北・断られる開始・位置の復元・勝利イベント1回を確かめる。
// ゲームのファイルは変えない(コモンイベント・ボス定義はメモリ上だけ)。Show Text は待ちが入るので省く(手順書では表示用)。
const REC = { boss: "test_boss_a", resultVar: 20, victoryCount: 19, otherCount: 18, startX: 17, startY: 16, startMap: 15, nowX: 14, nowY: 13, nowMap: 12, ceVictory: 5, ceOther: 6 };
const BULLET_ENTRY = pattern => ({ pattern, count: "", spreadDeg: "", arcDeg: "", speed: "", warnFrames: "", shots: "", shotGap: "", waves: "", waveGap: "", waveWarn: "" });
const RECIPE_BOSSES = () => [{ bossId: REC.boss, name: "テストボスA(仮)", hp: "200", phases: [{ id: "phase2", label: "第二形態(テスト)", hpRatio: "0.5" }],
    bulletPlan: [{ rotation: [BULLET_ENTRY("dev_aimed")] }, { rotation: [BULLET_ENTRY("dev_fan")] }], dodgeBoss: "", enemyImageFolder: "enemies", enemyImageName: "Crab", enemyChestX: "", enemyChestY: "" }];
const gameData = (id, type, p1, p2) => ({ code: 122, indent: 0, parameters: [id, id, 0, 3, type, p1, p2] });
const REC_RING = cmd357("ProjectR_HermesProductionDeck", "AcquireHermesRing", {});
const REC_START = cmd357("ProjectR_SoulEncounter", "StartSoulEncounter", { bossId: REC.boss, resultVariableId: String(REC.resultVar), victoryCommonEventId: String(REC.ceVictory), otherCommonEventId: String(REC.ceOther) });
const REC_POS_STORE = [gameData(REC.startX, 5, -1, 0), gameData(REC.startY, 5, -1, 1), gameData(REC.startMap, 7, 0, 0)];
const REC_POS_NOW = [gameData(REC.nowX, 5, -1, 0), gameData(REC.nowY, 5, -1, 1), gameData(REC.nowMap, 7, 0, 0)];
const EVENT_A = [{ code: 314, indent: 0, parameters: [0, 0] }, ...REC_POS_STORE, REC_RING, REC_START];                                                          // 勝利テスト: 全回復 → 位置を記録 → 指輪 → 開始
const EVENT_B = [{ code: 314, indent: 0, parameters: [0, 0] }, { code: 311, indent: 0, parameters: [0, 1, 1, 0, 9999, false] }, REC_RING, REC_START];            // 敗北テスト: 全回復 → リードのHPを 1 に(戦闘不能にしない)→ 指輪 → 開始
const EVENT_E = [cmd357("ProjectR_SoulEncounter", "StartSoulEncounter", { bossId: "no_such_boss", resultVariableId: String(REC.resultVar), victoryCommonEventId: String(REC.ceVictory), otherCommonEventId: String(REC.ceOther) })];   // 断られる開始(確認用)
const EVENT_RESET = [REC.resultVar, REC.victoryCount, REC.otherCount].map(id => setVar(id, 0));                  // イベント D: カウンターを 0 に戻す
function recipeWorld() {
    const w = world();
    w.enc = ENC(w);
    // 敵の絵は実際のファイルで確認する(img/enemies/Crab.png)
    w.enc.setAssetChecker((folder, name) => fs.existsSync(path.join(project, "img", folder, name + ".png")));
    const r = plain(w.enc.loadBossesFromText(mzBossParam(RECIPE_BOSSES())));
    assert.deepEqual(r, { registered: [REC.boss], errors: [], rejected: [] }, JSON.stringify(r));
    // コモンイベント 5・6(手順書の「TEST_SOUL勝利」「TEST_SOULその他」。いまの製品のコモンイベントは 1〜4 なので、新しく作ると 5・6 になる)
    assert.deepEqual(plain(w.ctx.$dataCommonEvents).map((c, i) => c ? i : null).filter(x => x !== null), [1, 2, 3, 4, 5, 6], "コモンイベント 1〜4 は既存・5/6 がテスト用(下で、文章の表示を除いた同じ働きのものに差し替える)");
    const counter = (id, v) => ({ id, name: "TEST " + id, trigger: 0, switchId: 1, list: [{ code: 122, indent: 0, parameters: [v, v, 1, 0, 1] }, { code: 0, indent: 0, parameters: [] }] });
    w.ctx.$dataCommonEvents[REC.ceVictory] = counter(REC.ceVictory, REC.victoryCount);
    w.ctx.$dataCommonEvents[REC.ceOther] = counter(REC.ceOther, REC.otherCount);
    w.originMap = w.ctx.$gameMap.mapId();
    return w;
}
const gv = (w, id) => w.ctx.$gameVariables.value(id);

test("I6-C 手順書の値: 製品の変数 12〜20 は未使用・コモンイベントは 1〜4 のみ。Bosses の値(エディタが書く形)は登録でき、敵の絵 Crab は実在し、警告も出ない", () => {
    const w = recipeWorld();
    const v = plain(w.enc.validateBoss(REC.boss));
    assert.deepEqual([v.ok, v.problems, v.warnings], [true, [], []], JSON.stringify(v));
    const b = plain(w.enc.getBoss(REC.boss));
    assert.deepEqual([b.hp, b.name, b.phases.length, b.bulletPlan.phases.map(p => p.rotation.map(e => e.pattern)), b.enemyImage.name, b.dodgeBoss], [200, "テストボスA(仮)", 1, [["dev_aimed"], ["dev_fan"]], "Crab", null]);
    assert.ok(fs.existsSync(path.join(project, "img/enemies/Crab.png")));
    // 変数 18〜20(と 12〜17)は、既存のマップ・コモンイベントのどこでも使っていない
    const used = new Set();
    const scan = list => { for (const c of list || []) { const p = c.parameters || []; if (c.code === 122) for (let i = p[0]; i <= p[1]; i++) used.add(i); if (c.code === 111 && p[0] === 1) used.add(p[1]); } };
    for (const f of fs.readdirSync(path.join(project, "data")).filter(x => /^Map\d+\.json$/.test(x) && x !== "Map007.json")) for (const ev of JSON.parse(read("data/" + f)).events || []) if (ev) for (const pg of ev.pages) { scan(pg.list); if (pg.conditions && pg.conditions.variableValid) used.add(pg.conditions.variableId); }
    for (const ce of JSON.parse(read("data/CommonEvents.json")).slice(1, 5)) scan(ce.list);                                  // 既存の Map007 以外のマップ・コモンイベント 1〜4
    for (let id = 12; id <= 20; id++) assert.equal(used.has(id), false, "変数 " + id + " は未使用");
    assert.equal(w.ctx.$dataSystem.variables.length, 21, "変数は 1〜20");
    assert.equal(w.ctx.PluginManager.parameters("ProjectR_SoulEncounter").ResultVariableId, "0", "プラグインパラメータの結果変数は 0 のまま(コマンドの引数で指定する)");
});

test("I6-C 手順書のイベント A(勝利): 全回復 → 位置を記録 → 指輪 → 開始。開始の直後は結果 0・位置は記録済み。勝利で元のマップ・位置へ戻り、変数 20 = 1・勝利のコモンイベントは1回だけ(2回目の戦闘で 2。3 にならない)", () => {
    const w = recipeWorld();
    w.ctx.$gamePlayer.locate(8, 9); w.ctx.$gamePlayer.setDirection(8);
    leaderOf(w).setHp(100);
    for (let round = 1; round <= 2; round++) {
        const it = runList(w, EVENT_A);
        assert.equal(it.isRunning(), false, "開始のコマンドはすぐ戻る(イベントは終わる)");
        assert.equal(gv(w, REC.resultVar), 0, "開始の直後は 0(進行中)。ここで結果を読んではいけない");
        assert.equal(leaderOf(w).hp, leaderOf(w).mhp, "全回復");
        assert.deepEqual([gv(w, REC.startX), gv(w, REC.startY), gv(w, REC.startMap)], [8, 9, w.originMap], "戦闘前の位置を記録");
        fr(w, 12);
        assert.equal(plainState(w).state, "fighting");
        w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
        Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] }); fr(w, 4);
        assert.equal(w.ctx.$gameMap.getCurrentEventHp(w.heart), 200, "ボスのHP 200");
        assert.equal(plain(w.bf.getState()).phaseCount, 2);
        assert.equal(gv(w, REC.resultVar), 0);
        // 形態 2(半分 = 100)→ 勝利(通常攻撃・カードがハートのHPを減らすのと同じ経路)
        hurtEvent(w, w.heart, 100); fr(w, 2);
        assert.equal(plain(w.bf.getState()).phaseIndex, 1, "第二形態");
        assert.equal(E(w).pickPattern().pattern, "dev_fan", "第二形態の弾幕は扇");
        toDefenseNow(w);
        hurtEvent(w, w.heart, 100); fr(w, 1);
        assert.equal(gv(w, REC.resultVar), 0, "戦闘が終わっても、戻りきるまでは 0");
        assert.equal(gv(w, REC.victoryCount), round - 1, "勝利のコモンイベントは戻る前には動かない");
        encReturn(w); fr(w, 60);
        assert.equal(gv(w, REC.resultVar), 1);
        assert.equal(gv(w, REC.victoryCount), round, "勝利のコモンイベントは戦闘ごとに1回");
        assert.equal(gv(w, REC.otherCount), 0, "その他のコモンイベントは動かない");
        // 手順書の「結果の確認」イベント: 位置の復元
        runList(w, REC_POS_NOW);
        assert.deepEqual([gv(w, REC.nowX), gv(w, REC.nowY), gv(w, REC.nowMap)], [gv(w, REC.startX), gv(w, REC.startY), gv(w, REC.startMap)], "元のマップ・元の位置へ戻る");
        assert.equal(w.ctx.$gamePlayer.direction(), 8, "向きも戻る");
        assert.equal(saveOn(w), true);
        fr(w, 300);
        assert.equal(gv(w, REC.victoryCount), round, "あとから増えない");
    }
    runList(w, EVENT_RESET);
    assert.deepEqual([gv(w, REC.resultVar), gv(w, REC.victoryCount), gv(w, REC.otherCount)], [0, 0, 0], "カウンターのリセット(イベント D)");
});

test("I6-C 手順書のイベント B(敗北)・E(断られる開始): HPを 1 にして開始 → 被弾で敗北メニュー(変数は 2・コモンイベントなし)。存在しないボスIDの開始は変数 3 で、コモンイベントは呼ばない・何も変わらない", () => {
    const w = recipeWorld();
    w.ctx.$gamePlayer.locate(8, 9);
    runList(w, EVENT_B);
    assert.equal(leaderOf(w).hp, 1, "リードのHPは 1(戦闘不能にならない)");
    assert.equal(leaderOf(w).isDead(), false);
    assert.equal(gv(w, REC.resultVar), 0);
    fr(w, 12);
    assert.equal(plainState(w).state, "fighting");
    w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] }); fr(w, 4);
    assert.equal(saveOn(w), false, "戦闘中は保存できない");
    toDefenseNow(w);
    leaderOf(w).setHp(0); fr(w, 1);                                               // 敵の弾が当たって HP 0(実際の弾での敗北は D13 のテストと実機で確認済み)
    encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(gv(w, REC.resultVar), 2);
    assert.equal(gv(w, REC.victoryCount) + gv(w, REC.otherCount), 0, "敗北ではコモンイベントを呼ばない");
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), true);
    assert.equal(saveOn(w), false, "敗北メニューの間も保存できない");
    // 断られる開始(別の世界で)
    const v = recipeWorld();
    const before = snapshotIdle(v), items0 = itemsSnapshot(v);
    runList(v, EVENT_E); fr(v, 30);
    assert.equal(gv(v, REC.resultVar), 3, "断られた開始は 3");
    assert.equal(gv(v, REC.victoryCount) + gv(v, REC.otherCount), 0);
    assert.equal(snapshotIdle(v), before);
    assert.equal(itemsSnapshot(v), items0);
    assert.equal(plain(v.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "unknownBoss");
});

test("I6-C 指輪の入手は何回実行しても同じ(初回だけ30枚)。デッキが条件を満たさないまま開始しても断るだけで安全(変数 3)", () => {
    const w = recipeWorld();
    runList(w, [REC_RING]);
    const deck1 = JSON.stringify(plain(w.ctx.ProjectRCardDeck.getDeck())), inv1 = itemsSnapshot(w);
    runList(w, [REC_RING, REC_RING]);
    assert.equal(JSON.stringify(plain(w.ctx.ProjectRCardDeck.getDeck())), deck1, "2回目以降は何も増えない");
    assert.equal(itemsSnapshot(w), inv1);
    assert.equal(plain(w.ctx.ProjectRCardDeck.getDeck()).length, 30);
    // 指輪の入手を忘れた(デッキが無い)世界で開始だけを踏む
    const v = recipeWorld();
    const before = snapshotIdle(v);
    runList(v, [REC_START]); fr(v, 30);
    assert.equal(gv(v, REC.resultVar), 3);
    assert.equal(snapshotIdle(v), before);
    assert.equal(plain(v.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "invalidDeck");
});


// ================================================================ I6-C2: 実際に作ったテスト用データ(Map007・コモンイベント 5/6・Encounter の Bosses・ProjectR_SoulTestEntry) ================================================================
// ここは「手順書の値」ではなく、プロジェクトに実際に入っているファイルを読んで確かめる(js/plugins.js のパラメータ・data/Map007.json・data/CommonEvents.json・data/MapInfos.json)。
const dataJson = f => JSON.parse(read("data/" + f));
const strip = list => list.filter(c => ![101, 401].includes(c.code));                               // 文章の表示(メッセージの待ちが入る)を除いたコマンド
const realMap = () => dataJson("Map007.json");
const realEvent = (id, map = realMap()) => map.events[id];
const pluginSource = name => read("js/plugins/" + name + ".js");
const commandNames = name => [...pluginSource(name).matchAll(/^ \* @command (\w+)/gm)].map(m => m[1]);
const commandArgs = (name, command) => { const src = pluginSource(name), i = src.indexOf(" * @command " + command); const j = src.indexOf(" * @command ", i + 5), k = src.indexOf(" * @help", i); const end = Math.min(...[j, k].filter(x => x > 0)); return [...src.slice(i, end).matchAll(/^ \* @arg (\w+)/gm)].map(m => m[1]); };
function entryWorld() {
    const w = world();
    w.enc = ENC(w);
    w.entry = w.ctx.ProjectRSoulTestEntry;
    w.originMap = w.ctx.$gameMap.mapId();
    return w;
}
const cesOf = list => list.filter(c => c.code === 357);

test("I6-C2 データの検証: JSON・Map007・参照(変数・コモンイベント・プラグインコマンドと引数・画像)・追加だけで既存は変わっていない", () => {
    const ce = dataJson("CommonEvents.json"), infos = dataJson("MapInfos.json"), map = realMap(), sys = dataJson("System.json"), tilesets = dataJson("Tilesets.json");
    // コモンイベント: 1〜4 はそのまま・5/6 が追加
    assert.deepEqual(ce.map((c, i) => c ? i : null).filter(x => x !== null), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(ce.slice(1, 5).map(c => c.name), ["プレイヤー基本攻撃", "Projectile vs Enemy", "公式銃 Enemy Collision", "ロングソード攻撃テスト"]);
    assert.deepEqual([ce[5].id, ce[5].name, ce[5].trigger, ce[6].id, ce[6].name, ce[6].trigger], [5, "TEST_SOUL勝利", 0, 6, "TEST_SOULその他", 0]);
    assert.deepEqual(ce[5].list.slice(0, 1).map(c => [c.code, c.parameters]), [[122, [19, 19, 1, 0, 1]]], "勝利: 変数 19 を +1");
    assert.deepEqual(ce[6].list.slice(0, 1).map(c => [c.code, c.parameters]), [[122, [18, 18, 1, 0, 1]]], "その他: 変数 18 を +1");
    assert.match(ce[5].list.find(c => c.code === 401).parameters[0], /\\V\[19\]/, "勝利の回数を表示する");
    assert.match(ce[6].list.find(c => c.code === 401).parameters[0], /\\V\[18\]/, "その他の回数を表示する");
    // マップ情報: 1〜6 はそのまま・7 が追加。開始位置は元のまま
    assert.deepEqual(infos.filter(m => m && m.id !== 3).map(m => [m.id, m.name]), [[1, "MAP001"], [2, "GunTemplate"], [4, "DEV_CombatTestArena"], [5, "DEV_CombatTransferRoom"], [6, "DEV_SoulBattleStage"], [7, "TEST_SOUL"]]);
    assert.deepEqual([sys.startMapId, sys.startX, sys.startY], [1, 29, 19], "ゲームの開始位置は書き換えていない");
    assert.equal(sys.variables.length, 21);
    // Map007: 大きさ・床・イベント
    assert.deepEqual([map.width, map.height, map.data.length, map.tilesetId], [17, 13, 17 * 13 * 6, 4]);
    const flags = tilesets[map.tilesetId].flags, passable = (x, y) => { for (let z = 0; z < 4; z++) { const tile = map.data[(z * map.height + y) * map.width + x]; if (tile === 0) continue; if ((flags[tile] & 0x10) !== 0) continue; return (flags[tile] & 0x0f) === 0; } return false; };
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) { const edge = x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1; assert.equal(passable(x, y), !edge, `(${x},${y}) は${edge ? "壁" : "歩ける床"}`); }
    const evs = map.events.filter(Boolean);
    assert.deepEqual(evs.map(e => [e.id, e.name]), [[1, "A 勝利テスト"], [2, "B 敗北テスト"], [3, "C 結果の確認"], [4, "D リセット"], [5, "E 断られる開始"]]);
    const entry = { x: 8, y: 9 };
    const seen = new Set([entry.x + "," + entry.y]);
    for (const e of evs) {
        assert.ok(e.x >= 1 && e.x < map.width - 1 && e.y >= 1 && e.y < map.height - 1 && passable(e.x, e.y), e.name + " は床の上");
        assert.ok(!seen.has(e.x + "," + e.y), e.name + " の位置は重ならない"); seen.add(e.x + "," + e.y);
        assert.equal(e.pages.length, 1);
        const pg = e.pages[0];
        assert.deepEqual([pg.trigger, pg.priorityType, pg.through, pg.moveType], [0, 1, false, 0], e.name + ": 決定ボタン・通常の優先度・すり抜けなし・動かない");
        assert.ok(fs.existsSync(path.join(project, "img/characters", pg.image.characterName + ".png")), e.name + " の画像 " + pg.image.characterName);
        assert.equal(pg.list[pg.list.length - 1].code, 0, "コマンドの末尾");
        // 「開始」のコマンドのあとに、ほかのコマンドを置かない(結果は直後に読まない)
        const lastReal = pg.list.slice(0, -1).filter(c => c.code !== 657 && c.code !== 108 && c.code !== 408).pop();
        if (pg.list.some(c => c.code === 357 && c.parameters[1] === "StartSoulEncounter")) assert.equal(lastReal.code === 357 && lastReal.parameters[1] === "StartSoulEncounter", true, e.name + ": 開始のコマンドが最後");
    }
    for (let x = 1; x < map.width - 1; x++) assert.ok(passable(x, map.height - 2), "下の通路は歩ける");
    // 参照: 変数・コモンイベント・プラグインコマンド(名前と引数)・登録済みのプラグイン
    const plugins = Function(read("js/plugins.js") + "; return $plugins;")();
    const registered = new Map(plugins.map((p, i) => [p.name, { i, p }]));
    const vars = new Set(), lists = [...evs.flatMap(e => e.pages.map(p => p.list)), ce[5].list, ce[6].list];
    for (const list of lists) for (const c of list) {
        const p = c.parameters;
        if (c.code === 122) { for (let i = p[0]; i <= p[1]; i++) vars.add(i); }
        if (c.code === 117) assert.ok(ce[p[0]], "コモンイベント " + p[0] + " がある");
        if (c.code === 201) assert.fail("テストマップに場所移動は置かない(安全のため)");
        if (c.code === 357) {
            const [plugin, command, , args] = p;
            assert.ok(registered.has(plugin) && registered.get(plugin).p.status === true, plugin + " は登録・有効");
            assert.ok(commandNames(plugin).includes(command), plugin + " に " + command);
            assert.deepEqual(Object.keys(args).sort(), commandArgs(plugin, command).sort(), command + " の引数の名前");
            if (command === "StartSoulEncounter") { assert.ok(Number(args.resultVariableId) >= 1 && Number(args.resultVariableId) <= 20); assert.ok(ce[Number(args.victoryCommonEventId)] && ce[Number(args.otherCommonEventId)], "コモンイベントの番号が実在する"); }
        }
    }
    assert.deepEqual([...vars].sort((a, b) => a - b), [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "使う変数は 10〜20");
    // 変数 10〜20 は、ほかのマップ・コモンイベントでは使っていない
    const used = new Set(), scan = list => { for (const c of list || []) { const p = c.parameters || []; if (c.code === 122) for (let i = p[0]; i <= p[1]; i++) used.add(i); if (c.code === 111 && p[0] === 1) used.add(p[1]); } };
    for (const f of fs.readdirSync(path.join(project, "data")).filter(x => /^Map\d+\.json$/.test(x) && x !== "Map007.json")) for (const e of dataJson(f).events || []) if (e) for (const pg of e.pages) scan(pg.list);
    ce.slice(1, 5).forEach(c => scan(c.list));
    for (let id = 10; id <= 20; id++) assert.equal(used.has(id), false, "変数 " + id + " はほかで使われていない");
    // プラグインの登録順: Encounter は依存の後ろ・TestEntry は Encounter の後ろ。1 つだけ登録
    const pos = n => registered.get(n).i;
    for (const dep of ["ProjectR_SoulBattle", "ProjectR_SoulBattleStage", "ProjectR_BossFramework", "ProjectR_SoulEnemyBullets", "ProjectR_PlayerDeath"]) assert.ok(pos(dep) < pos("ProjectR_SoulEncounter"), dep + " より後");
    assert.ok(pos("ProjectR_SoulEncounter") < pos("ProjectR_SoulTestEntry"));
    assert.equal(plugins.filter(p => p.name === "ProjectR_SoulTestEntry").length, 1);
    assert.equal(new Set(plugins.map(p => p.name)).size, plugins.length, "プラグイン名の重複なし");
    // 既存の登録は残っている(カジノを含む)
    for (const name of ["ProjectR_CardDeckCore", "ProjectR_SoulBattlePrepare", "ProjectR_SoulBattle", "ProjectR_BossFramework"]) assert.ok(registered.has(name), name);          // (カジノの登録は別の作業の未コミットの変更なので、ここでは見ない)
});

test("I6-C2 プラグインのパラメータ(js/plugins.js): Encounter の Bosses が実際に読み込まれ、test_boss_a は有効(HP 200・形態 1・弾幕 dev_aimed/dev_fan・Crab)。結果変数などの既定は 0 のまま。TestEntry の値", () => {
    const plugins = Function(read("js/plugins.js") + "; return $plugins;")();
    const enc = plugins.find(p => p.name === "ProjectR_SoulEncounter").parameters;
    assert.deepEqual([enc.ResultVariableId, enc.VictoryCommonEventId, enc.OtherCommonEventId], ["0", "0", "0"], "コマンドの引数で指定するので、プラグインの既定は 0");
    const w = entryWorld();
    assert.deepEqual(plain(w.enc.listBosses()), ["test_boss_a"], "起動時に Bosses パラメータから登録された");
    assert.deepEqual(plain(w.enc.listRejected()), []);
    const b = plain(w.enc.getBoss("test_boss_a"));
    assert.deepEqual([b.name, b.hp, b.phases, b.dodgeBoss], ["テストボスA(仮)", 200, [{ id: "phase2", label: "第二形態(テスト)", hpRatio: 0.5 }], null]);
    assert.deepEqual(b.bulletPlan.phases.map(p => [p.id, p.rotation]), [["phase1", [{ pattern: "dev_aimed", options: {} }]], ["phase2", [{ pattern: "dev_fan", options: {} }]]]);
    assert.deepEqual(b.enemyImage, { folder: "enemies", name: "Crab" });
    assert.deepEqual(plain(w.enc.getLog()).filter(e => e.type === "bossParamErrors"), []);
    w.enc.setAssetChecker((folder, name) => fs.existsSync(path.join(project, "img", folder, name + ".png")));       // 実際のファイルで確認(NW.js では自動)
    assert.deepEqual(plain(w.enc.validateBoss("test_boss_a")), { ok: true, bossId: "test_boss_a", problems: [], warnings: [] });
    const t = plugins.find(p => p.name === "ProjectR_SoulTestEntry").parameters;
    assert.deepEqual(plain(w.entry.getConfig()), { enabled: true, mapId: 7, x: 8, y: 9, direction: 8, keyCode: 118 });
    assert.deepEqual([t.Enabled, t.TestMapId, t.EntryX, t.EntryY, t.EntryDirection, t.KeyCode], ["true", "7", "8", "9", "8", "118"]);
});

test("I6-C2 テスト専用の入り口(ProjectR_SoulTestEntry): Playtest のときだけ存在する。切り替えは、いまの場所を覚えてテストマップ(8, 9)へ移動 → もう一度で元の場所へ戻る。メッセージ中・移動中・SOUL戦闘中は何もしない。ゲームの開始位置は書き換えない", () => {
    const off = buildWorld({ playtest: false });
    assert.equal(off.ctx.ProjectRSoulTestEntry, undefined, "配布版(Playtest 以外)では何も作らない");
    const w = entryWorld();
    assert.equal(w.entry.canToggle().ok, true);
    w.ctx.$gamePlayer.locate(12, 20); w.ctx.$gamePlayer.setDirection(6);
    const sysBefore = JSON.stringify(plain(w.ctx.$dataSystem));
    const there = plain(w.entry.toggle());
    assert.deepEqual([there.ok, there.to, there.mapId, there.x, there.y], [true, "test", 7, 8, 9]);
    assert.deepEqual(plain(w.entry.getReturnPoint()), { mapId: 1, x: 12, y: 20, direction: 6 });
    assert.equal(w.entry.canToggle().reason, "transferring", "移動中は切り替えない");
    fr(w, 2);
    assert.equal(w.ctx.$gameMap.mapId(), 7, "Map007 へ移動した");
    assert.deepEqual([w.ctx.$gamePlayer.x, w.ctx.$gamePlayer.y, w.ctx.$gamePlayer.direction()], [8, 9, 8]);
    assert.deepEqual(plain(w.ctx.$gameMap.events().filter(Boolean).map(e => e.event().name)), ["A 勝利テスト", "B 敗北テスト", "C 結果の確認", "D リセット", "E 断られる開始"], "マップのイベントが作られた");
    assert.equal(w.ctx.$gamePlayer.canPass(8, 9, 8), true, "入り口から上へ歩ける");
    // メッセージ中は何もしない
    w.ctx.$gameMessage.add("test");
    assert.equal(w.entry.canToggle().reason, "messageBusy");
    w.ctx.$gameMessage.clear();
    // 戻る
    const back = plain(w.entry.toggle());
    assert.deepEqual([back.ok, back.to, back.mapId, back.x, back.y], [true, "back", 1, 12, 20]);
    fr(w, 2);
    assert.deepEqual([w.ctx.$gameMap.mapId(), w.ctx.$gamePlayer.x, w.ctx.$gamePlayer.y, w.ctx.$gamePlayer.direction()], [1, 12, 20, 6], "元のマップ・位置・向きへ戻った");
    assert.equal(w.entry.getReturnPoint(), null);
    assert.equal(JSON.stringify(plain(w.ctx.$dataSystem)), sysBefore, "ゲームの開始位置などのシステムデータは変えない");
    // テストマップで覚えた場所が無ければ、開始位置(System.json)へ戻る
    w.entry.toggle(); fr(w, 2);
    w.ctx.DataManager._globalInfo = w.ctx.DataManager._globalInfo || [];
    w.ctx.DataManager.setupNewGame();                                              // 別のセーブ / ニューゲーム: 覚えた場所は捨てる
    assert.equal(w.entry.getReturnPoint(), null);
    // SOUL戦闘の最中は切り替えない(Encounter が動いている間)
    const v = recipeWorld();
    runList(v, [REC_RING]);
    runList(v, [REC_START]); fr(v, 20);
    assert.equal(plainState(v).state, "fighting");
    assert.equal(v.ctx.ProjectRSoulTestEntry.canToggle().reason, "soulEncounterActive");
});

test("I6-C2 実際の Map007 のイベント A〜E を、プラグイン登録のボスとコモンイベント 5/6 で動かす: A 勝利(位置・向きの復元・勝利イベント1回)/ B 敗北 / D リセット / E 断られる開始(変数 20 = 3)", () => {
    const w = entryWorld();
    w.ctx.$gamePlayer.locate(12, 20);
    w.entry.toggle(); fr(w, 2);
    assert.equal(w.ctx.$gameMap.mapId(), 7);
    w.enc.setAssetChecker((folder, name) => fs.existsSync(path.join(project, "img", folder, name + ".png")));
    const gvv = id => w.ctx.$gameVariables.value(id);
    // E: 存在しないボス → 結果 3・何も起きない(結果は開始のコマンドの直後ではなく、時間が経ってから読む)
    const evE = w.ctx.$gameMap.event(5);
    evE.start(); fr(w, 40);
    assert.equal(gvv(20), 3, "E: 断られた開始は変数 20 = 3");
    assert.equal(gvv(19) + gvv(18), 0, "コモンイベントは動かない");
    assert.equal(plainState(w).state, "idle");
    assert.equal(plain(w.enc.getLog()).filter(e => e.type === "rejected").pop().reason, "unknownBoss");
    assert.equal(w.ctx.$gameMap.mapId(), 7, "マップはそのまま");
    // D: リセット(文章の表示は、プレイヤーが閉じるまで待つ。ここでは閉じる)
    const closeMessages = () => { for (let i = 0; i < 6 && (w.ctx.$gameMessage.isBusy() || w.ctx.$gameMap._interpreter.isRunning()); i++) { w.ctx.$gameMessage.clear(); w.ctx.$gameMap._interpreter.clear(); fr(w, 1); } };
    w.ctx.$gameVariables.setValue(20, 3); w.ctx.$gameVariables.setValue(15, 5);
    w.ctx.$gameMap.event(4).start(); fr(w, 4); closeMessages();
    assert.deepEqual([gvv(20), gvv(19), gvv(18), gvv(15)], [0, 0, 0, 0], "D: 変数 10〜20 を 0 に戻す");
    // A: 勝利。まず(8,9)から、上の通路まで歩いたことにして位置を変える
    w.ctx.$gamePlayer.locate(2, 4); w.ctx.$gamePlayer.setDirection(8);
    leaderOf(w).setHp(50);
    w.ctx.$gameMap.event(1).start(); fr(w, 20);
    assert.equal(plainState(w).state, "fighting", JSON.stringify([plainState(w), plain(w.enc.getLog()).slice(-3)]).slice(0, 400));
    assert.equal(gvv(20), 0, "開始の直後・戦闘中は 0");
    assert.deepEqual([gvv(17), gvv(16), gvv(15), gvv(11)], [2, 4, 7, 8], "戦闘前の位置・マップ・向きを記録");
    assert.equal(leaderOf(w).hp, leaderOf(w).mhp, "全回復");
    w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] }); fr(w, 4);
    assert.equal(w.ctx.$gameMap.getCurrentEventHp(w.heart), 200);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.getDeck()).length, 30);
    assert.equal(w.ctx.ProjectRSoulStage.getEnemyLook().name, "Crab");
    hurtEvent(w, w.heart, 100); fr(w, 2);
    assert.equal(plain(w.bf.getState()).phaseIndex, 1);
    toDefenseNow(w);
    hurtEvent(w, w.heart, 100); fr(w, 1);
    assert.equal(gvv(20), 0, "戻りきるまで 0");
    encReturn(w); fr(w, 60);
    assert.equal(gvv(20), 1, "勝利");
    assert.equal(gvv(19), 1, "勝利のコモンイベントは1回");
    assert.equal(w.ctx.$gameMap.mapId(), 7);
    assert.deepEqual([w.ctx.$gamePlayer.x, w.ctx.$gamePlayer.y, w.ctx.$gamePlayer.direction()], [2, 4, 8], "元の位置・向きへ戻る");
    // C: 結果の確認(戦闘前後の位置が一致)
    closeMessages();
    runList(w, strip(realEvent(3).pages[0].list));
    assert.deepEqual([gvv(14), gvv(13), gvv(12), gvv(10)], [gvv(17), gvv(16), gvv(15), gvv(11)], "C: 戻った後の位置・マップ・向き = 戦闘前");
    fr(w, 300);
    assert.equal(gvv(19), 1, "あとから増えない");
    // B: 敗北(HP 1 → 敗北メニュー・コモンイベントなし)
    w.ctx.$gamePlayer.locate(5, 4);
    w.ctx.$gameMap.event(2).start(); fr(w, 20);
    assert.equal(leaderOf(w).hp, 1, "B: HP 1");
    assert.equal(plainState(w).state, "fighting");
    w.heart = w.soul.getState().heart.eventId; attachHpBars(w, [w.heart], w.ctx.$gameMap.getCurrentEventHp(w.heart));
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] }); fr(w, 4);
    toDefenseNow(w);
    leaderOf(w).setHp(0); fr(w, 1);
    encReturn(w); fr(w, 4);
    assert.equal(plainState(w).state, "defeatMenu");
    assert.equal(gvv(20), 2);
    assert.equal(gvv(19), 1, "敗北では勝利イベントは動かない");
    assert.equal(gvv(18), 0);
    assert.equal(nextIs(w, "Scene_ProjectRSoulDefeat"), true);
});

console.log(`\n${passed} tests passed`);
