"use strict";
// L0後始末: 準備ループ(prepare:true)のフェーズ境目で、前のフェーズの飛び道具・一時的な攻撃判定を片づけ、次のフェーズへ持ち越さない(ProjectR_SoulPhaseCleanup)。
//   従来の攻撃⇄防御・通常のマップ戦闘・無関係なEventは変えない。実エンジン(全plugin)をNode VMで動かす。
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
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, prepare: true, ...options })));
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

// ================================================================ フェーズ境目の後始末(準備ループ) ================================================================
const CASTS = ["apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "hermes_issen", "apollo_gigas_slayer"];
const TAGS = ["<projectRGoldenArrow>", "<projectRDiseaseAttack>", "<projectRApolloUltimate>", "<projectRGunBullet>", "<projectRGoldenVolley>", "<projectRErosArrow>", "<projectRGigasArrow>", "<projectRPlagueArrow>", "<projectRErosBeam>", "<projectRPlagueRat>", "<projectRNormalSword>", "<projectRHermesSword>", "<projectRHermesUltimate>"];
const alive = w => w.ctx.$gameMap.events().filter(e => e && !e._erased);
const noteOf = e => String(e.event().note || "");
const tagged = w => alive(w).filter(e => TAGS.some(t => noteOf(e).includes(t)));
const heartHp = w => w.ctx.ProjectRSoulBattlePoC.getState().hp;
// a16 を専用ステージで始める(prepare: true なら準備から、false なら従来の攻撃から)
function startA16(w, { prepare, hand = CASTS } = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: hand, prepare, ...(prepare ? {} : {}) })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    arrive(w); frames(w, 8);
    assert.equal(stageState(w).state, "active");
    assert.equal(w.soul.getPhase(), prepare ? "prepare" : "attack");
    w.heart = w.soul.getState().heart.eventId;
    attachHpBars(w, [w.heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });
    frames(w, 4);
    w.ctx.ProjectRSoulBattleDodge.disarm();
    return w;
}
const cast = (w, index = 0) => { const r = plain(w.deck.requestUseCard(index)); frames(w, 4); return r; };

test("登録: 後始末プラグインは SoulBattle / Melee / Skills / Dodge の後に1回だけ・有効。印の一覧は回避AIが観測する攻撃の印と一致(プレイヤー側の攻撃だけ)", () => {
    const plugins = new Function(`${read("js/plugins.js").replace(/^\s*var\s+\$plugins/m, "var $plugins")}; return $plugins;`)();
    const names = plugins.map(p => p.name), i = names.indexOf("ProjectR_SoulPhaseCleanup");
    assert.equal(names.filter(n => n === "ProjectR_SoulPhaseCleanup").length, 1);
    assert.equal(plugins[i].status, true);
    for (const before of ["ProjectR_SoulBattle", "ProjectR_SoulBattleMelee", "ProjectR_SoulSkills", "ProjectR_SoulBattleDodge", "Hendrix_Action_Engine"]) assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < i, before);
    const w = world();
    const dodge = w.ctx.ProjectRSoulBattleDodge, own = plain(w.ctx.ProjectRSoulPhaseCleanup.TAGS);
    assert.deepEqual([...own].sort(), [...plain(dodge.THREAT_TAGS), ...plain(dodge.MELEE_TAGS), ...plain(dodge.UNSUPPORTED_TAGS)].sort(), "回避AIの攻撃の印と同じ集合");
    for (const enemyOrSupport of ["<projectRGodVisual>", "<projectRSoulHeartPoC>", "<projectRLaurelRoot>", "<projectRLaurelWall>", "<projectRHyacinth>", "<projectRTestEnemyBolt>", "<projectRBossMelee>"]) assert.equal(own.includes(enemyOrSupport), false, enemyOrSupport + " は対象にしない");
    const code = read("js/plugins/ProjectR_SoulPhaseCleanup.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /UpdateEventHp|\.setHp|\$gameSystem\.\w+\s*=[^=]|setDeck|setCardOwned|StorageManager|saveGame|\$gameVariables\.setValue/, "ダメージ・セーブ・デッキを書かない");
});

test("従来の攻撃⇄防御(prepare なし)では何も片づけない: 攻撃の矢は防御に入っても残る(従来どおり)", () => {
    const w = startA16(world(), { prepare: false });
    cast(w, 0);
    const before = tagged(w).length;
    assert.ok(before >= 3, "黄金の矢が出ている: " + before);
    w.soul.skipPhase(); frames(w, 2);
    assert.equal(w.soul.getPhase(), "defense");
    assert.ok(tagged(w).length > 0, "従来は防御でも矢は残る");
    const c = plain(w.ctx.ProjectRSoulPhaseCleanup.getStats());
    assert.deepEqual([c.sweeps, c.destroyed], [0, 0], "後始末は一度も動いていない");
    w.soul.end("t");
});

test("準備ループ: ATTACK → DEFENSE の境目で飛んでいる矢をすべて片づける。DEFENSE の間に敵ハートへ当たらず、その後の PREPARE・次の ATTACK でも動き出さない", () => {
    const w = startA16(world(), { prepare: true });
    w.soul.beginAttack(); frames(w, 2);
    const hp0 = heartHp(w);
    assert.equal(cast(w, 0).ok !== undefined, true);
    const arrows = tagged(w);
    assert.ok(arrows.length >= 3, "黄金の矢が飛んでいる: " + arrows.length);
    const ids = arrows.map(e => e.eventId());
    w.soul.skipPhase();                                                          // ATTACK → DEFENSE
    assert.equal(w.soul.getPhase(), "defense");
    assert.equal(tagged(w).length, 0, "境目で攻撃のEventが残らない");
    for (const id of ids) assert.ok(!w.ctx.$gameMap.event(id) || w.ctx.$gameMap.event(id)._erased, "矢" + id + "は消えた");
    const stats = plain(w.ctx.ProjectRSoulPhaseCleanup.getStats());
    assert.ok(stats.sweeps >= 1 && stats.destroyed >= ids.length && stats.errors === 0, JSON.stringify(stats));
    frames(w, 120);                                                              // DEFENSE の間
    assert.equal(tagged(w).length, 0);
    const hpDefense = heartHp(w);
    w.soul.skipPhase();                                                          // → PREPARE(凍結)
    assert.equal(w.soul.getPhase(), "prepare");
    frames(w, 60);
    assert.equal(tagged(w).length, 0, "準備でも攻撃のEventは無い");
    w.soul.beginAttack(); frames(w, 180);                                        // → 次の ATTACK: 動き出す矢は無い
    assert.equal(tagged(w).length, 0, "前のフェーズの矢は再開しない");
    assert.equal(heartHp(w), hpDefense, "前のフェーズの攻撃で、あとから敵ハートのHPは減らない");
    assert.ok(hp0 >= hpDefense);
    w.soul.end("t");
});

test("判定待ちの薙ぎ払いの溜めはフェーズの境目でダメージなしに取り消す(早く判定しない)。一閃の演出も片づけ、PREPARE を経て ATTACK に戻っても動かない", () => {
    const w = startA16(world(), { prepare: true, hand: ["hermes_sweep", "hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"] });
    w.soul.beginAttack(); frames(w, 2);
    const heart = plain(w.ctx.ProjectRSoulBattlePoC.getState().hitCenter);
    w.mouse(Math.round((heart.x - 2) * 48), Math.round(heart.y * 48));          // カーソルを敵ハートの手前に置く(扇が届く位置)
    frames(w, 2);
    cast(w, 0);                                                                  // 薙ぎ払い(判定は12フレーム後)
    const melee = () => plain(w.ctx.ProjectRSoulBattleMelee.getStageStats());
    const log = () => plain(w.ctx.ProjectRSoulBattleMelee.getLog());
    assert.ok(melee().sweepStaged >= 1 && melee().sweeping >= 1, "判定待ちの薙ぎ払い: " + JSON.stringify(melee()));
    const start = log().filter(e => e.type === "sweepStart").pop();
    assert.ok(start.queued >= 1, "敵ハートに当たるはずの溜めダメージがある(これを取り消す): " + JSON.stringify(start));
    const resolves = () => log().filter(e => e.type === "sweepResolve").length;
    const resolvedBefore = resolves(), droppedBefore = melee().sweepDropped, hpBefore = heartHp(w);
    w.soul.skipPhase();                                                          // 判定の時刻より前にフェーズが変わる
    const m = melee();
    assert.equal(m.sweeping, 0, "判定待ちは残らない");
    assert.equal(m.issenFx, 0, "一閃の演出も残らない");
    assert.equal(resolves(), resolvedBefore, "早く判定していない(判定は行わない)");
    assert.equal(m.sweepDropped, droppedBefore + 1, "溜めは取り消した(判定なしで捨てた)");
    assert.ok(plain(w.ctx.ProjectRSoulPhaseCleanup.getStats()).cancelledSweeps >= 1);
    assert.equal(heartHp(w), hpBefore, "ダメージは与えていない");
    frames(w, 60);
    assert.equal(heartHp(w), hpBefore, "あとからダメージが入らない");
    assert.equal(resolves(), resolvedBefore);
    w.soul.skipPhase(); frames(w, 30);                                           // PREPARE
    w.soul.beginAttack(); frames(w, 90);
    assert.equal(resolves(), resolvedBefore, "次の ATTACK でも前の薙ぎ払いは動かない");
    assert.equal(heartHp(w), hpBefore);
    assert.equal(melee().sweeping, 0);
    w.soul.end("t");
});

test("持ち主の分離: プレイヤーの攻撃の印(player)は ATTACK→DEFENSE で片づくが、将来の敵の DEFENSE の弾の印(enemy)はそこでは触らず、DEFENSE が終わるときに片づく。owner の指定は必須", () => {
    const w = startA16(world(), { prepare: true });
    const cleanup = w.ctx.ProjectRSoulPhaseCleanup;
    assert.equal(cleanup.registerTag("<projectRFutureEnemyBolt>", "enemy"), true, "敵の弾の印を enemy として登録できる");
    assert.equal(cleanup.registerTag("<projectRFutureEnemyBolt>", "enemy"), false, "二重登録は拒否");
    assert.equal(cleanup.registerTag("<projectRFutureEnemyBolt>", "player"), false, "別の持ち主での二重登録も拒否");
    assert.equal(cleanup.registerTag("<projectRGoldenVolley>", "enemy"), false, "プレイヤー側の印は enemy にできない");
    assert.equal(cleanup.registerTag("<projectRFutureX>"), false, "owner の指定が無いものは拒否");
    assert.equal(cleanup.registerTag("not a tag", "enemy"), false);
    assert.deepEqual(plain(cleanup.getTags("enemy")), ["<projectRFutureEnemyBolt>"]);
    assert.ok(plain(cleanup.getTags("player")).includes("<projectRGoldenVolley>") && !plain(cleanup.getTags("player")).includes("<projectRFutureEnemyBolt>"));
    // player だけの片づけでは、実際の player の矢は消え、(登録した)enemy の印を持つEventは対象外
    w.soul.beginAttack(); frames(w, 2);
    cast(w, 0);
    assert.ok(tagged(w).length >= 3);
    const ownersTouched = [];
    const original = cleanup.sweepNow;
    const r = plain(cleanup.sweepNow("test", { owners: ["enemy"] }));
    assert.equal(r.destroyed, 0, "enemy だけの片づけは、プレイヤーの矢に触れない");
    assert.ok(tagged(w).length >= 3);
    const r2 = plain(cleanup.sweepNow("test", { owners: ["player"] }));
    assert.ok(r2.destroyed >= 3 && tagged(w).length === 0, "player の片づけでプレイヤーの矢が消える");
    void ownersTouched; void original;
    // フェーズの境目での持ち主の選び方(ソース): ATTACK→DEFENSE は player だけ。DEFENSE が終わるときは player+enemy
    const src = read("js/plugins/ProjectR_SoulPhaseCleanup.js");
    assert.match(src, /event\.from === "defense" \? \["player", "enemy"\] : \["player"\]/);
    const before = plain(cleanup.getLog()).length;
    w.soul.skipPhase();                                                          // ATTACK → DEFENSE
    const entries = plain(cleanup.getLog()).slice(before).filter(e => e.type === "sweep");
    assert.deepEqual(entries.map(e => e.owners), [["player"]], "ATTACK→DEFENSE は player だけ");
    w.soul.skipPhase();                                                          // DEFENSE → PREPARE
    const entries2 = plain(cleanup.getLog()).slice(before).filter(e => e.type === "sweep");
    assert.deepEqual(entries2.map(e => e.owners), [["player"], ["player", "enemy"]], "DEFENSE が終わるときは両方");
    w.soul.end("t");
});

test("無関係なものには触れない: 攻撃の印を持たないEvent・敵ハート・常駐の神の見た目・当たり履歴(他のEvent分)は残る。片づけた矢の当たり履歴だけ消える", () => {
    const w = startA16(world(), { prepare: true });
    w.soul.beginAttack(); frames(w, 2);
    cast(w, 0);
    const before = alive(w), isAttack = e => TAGS.some(t => noteOf(e).includes(t));
    const keep = before.filter(e => !isAttack(e));
    assert.ok(keep.some(e => e.eventId() === w.heart), "敵ハートは対象外");
    const arrow = tagged(w)[0], unrelatedId = keep.find(e => e.eventId() !== w.heart).eventId();
    const system = w.ctx.$gameSystem;
    system.collisionTimestamps = system.collisionTimestamps || {};
    const mine = `1-${arrow.eventId()}-${w.heart}-<projectRGoldenVolley>`, other = `1-${unrelatedId}-${w.heart}-<projectRSomethingElse>`;
    system.collisionTimestamps[mine] = 5; system.collisionTimestamps[other] = 6;
    w.soul.skipPhase();
    for (const e of keep) assert.ok(!e._erased && w.ctx.$gameMap.event(e.eventId()) === e, "無関係なEvent " + e.eventId() + " は残る");
    assert.equal(system.collisionTimestamps[mine], undefined, "片づけた矢の当たり履歴は消える");
    assert.equal(system.collisionTimestamps[other], 6, "他のEventの当たり履歴は残る");
    assert.equal(w.soul.getPhase(), "defense");
    w.soul.end("t");
    delete system.collisionTimestamps[other];
});

test("終了: 準備ループの SOUL を ATTACK の途中で終えても、攻撃のEventを残さない(マップは元へ戻る)", () => {
    const w = startA16(world(), { prepare: true });
    w.soul.beginAttack(); frames(w, 2);
    cast(w, 0);
    assert.ok(tagged(w).length > 0);
    assert.equal(w.soul.end("test"), true);
    assert.equal(tagged(w).length, 0, "終了で攻撃のEventが残らない");
    assert.equal(plain(w.ctx.ProjectRSoulPhaseCleanup.getStats()).ended, 1);
    assert.ok(plain(w.ctx.ProjectRSoulPhaseCleanup.getLog()).some(e => e.type === "sweep" && e.reason === "soulEnd"), "終了時の後始末が実行された");
    assert.equal(paused(w), false);
    assert.equal(plain(w.ctx.ProjectRSoulPhaseCleanup.getStats()).errors, 0);
    frames(w, 6);
    if (stageState(w).state !== "idle") { arrive(w); frames(w, 8); }
    assert.equal(stageState(w).state, "idle");
});

console.log(`\n${passed} tests passed`);
