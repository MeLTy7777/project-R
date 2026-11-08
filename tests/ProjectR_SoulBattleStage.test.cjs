"use strict";
// I4-A: SOUL専用ステージ(ProjectR_SoulBattleStage + data/Map006.json)。実エンジン(全plugin)で、
//   移動(入る→戦う→戻る)・厳密な16:9・マウス座標の変換・プレイヤー非表示・防御ターンのハート・後片づけ(1回だけ)・I2/I3の戦闘の流れを確かめる。
// ハーネスは描画・実際のマップ移動をしない。移動は「予約が正しいか」+ performTransfer を手で呼んで到着を模擬する(arrive)。見た目と本物の移動は実機(tools/mz_cdp/soul_stage_verify.cjs)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const vm = require("node:vm");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { buildWorld, plain, attachHpBars, barHp, handIds, aimDegree } = fx;

const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.ctx.Graphics.frameCount = (w.ctx.Graphics.frameCount || 0) + 1; w.frames(1); } };   // CombatPresence の終了猶予のため frameCount を進める
const quietly = fn => { const original = console.log; console.log = () => {}; try { return fn(); } finally { console.log = original; } };
const HAND = ["hermes_issen", "apollo_golden_volley", "apollo_eros_arrow", "hermes_sweep", "apollo_gigas_slayer"];
const STAGE_ID = 6;

// ---------------------------------------------------------------- 世界 ----------------------------------------------------------------
const container = () => ({ children: [], addChild(c) { c.parent = this; this.children.push(c); return c; }, addChildAt(c, i) { c.parent = this; this.children.splice(i, 0, c); return c; }, removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; } });
const display = (original = true) => ({ renderable: original, visible: true, parent: null });
// 画面の表示物の代用品(実機では Spriteset/Hendrix/BattleHUD が作る)。プレイヤー・仲間のSpriteは安定した配列で持つ。
function decorate(w) {
    const scene = w.sc();
    const sp = scene._spriteset, ctx = w.ctx;
    sp.addChild = c => { c.parent = sp; sp.children.push(c); return c; };
    sp.removeChild = c => { const i = sp.children.indexOf(c); if (i >= 0) sp.children.splice(i, 1); c.parent = null; };
    sp._tilemap = container();
    sp.scale = { x: 1, y: 1, set(x, y) { this.x = x; this.y = y === undefined ? x : y; } };
    sp.x = 0; sp.y = 0;
    sp._baseSprite = Object.assign(container(), { children: [{ _blackScreen: true }] });          // MZ は最背面に不透明な黒い画面を置く
    if (!scene.children.includes(sp)) scene.children.push(sp);          // 実機では Spriteset_Map は Scene_Map の子
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
// マップ移動の完了を模擬する(本物は Scene_Map が Game_Player.performTransfer を呼ぶ)
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
    w.at = w.ctx.ProjectRApolloTest;
    w.origin = origin;
    decorate(w);
    w.ends = []; w.soul.onEnd(e => w.ends.push(plain(e).reason));
    w.transfers = [];
    const p = w.ctx.$gamePlayer, original = p.reserveTransfer;
    p.reserveTransfer = function(...args) { w.transfers.push(args.slice(0, 4)); return original.apply(this, args); };
    w.calls = [];
    const callCommand = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ name, args }); return callCommand.apply(this, arguments); };
    return w;
}
const stageState = w => plain(w.stage.getState());
const snapshot = w => JSON.stringify({ deck: w.ctx.$gameSystem._projectRCardDeckData ?? null, inv: w.ctx.$gameSystem._projectRCardInventory ?? null, dirty: w.at.isDirty(), cardBattle: w.deck.isCardBattleActive(),
    sources: plain(w.ctx.ProjectRCombatSession.sources()), weapon: w.ctx.$gameParty.leader().equips()[0]?.id ?? 0, move: w.run("playerMovementDisabled"), boss: w.bf.getState()?.bossId ?? null });
const hurt = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false" });
// a16を専用ステージで始める: 開始 → 移動の予約 → 到着 → 準備の実行
function a16(w, options = {}) {
    const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, bossAttacks: false, ...options })));
    assert.deepEqual([r.ok, r.pending, r.stage], [true, true, true], JSON.stringify(r));
    assert.equal(stageState(w).state, "entering");
    arrive(w);
    frames(w, 8);                                         // 到着 → active → 準備(3フレーム待ち)
    const status = plain(w.sb.status && quietly(() => w.sb.status()));
    assert.equal(stageState(w).state, "active", JSON.stringify(stageState(w)));
    assert.equal(w.soul.isActive(), true, "SOUL戦闘が始まった " + JSON.stringify(status.a16 || null));
    const heart = w.soul.getState().heart.eventId;
    w.heart = heart;
    attachHpBars(w, [heart], 1000);
    Object.defineProperty(w.parts.sp, "_characterSprites", { configurable: true, writable: true, value: [w.parts.player, w.parts.other] });   // attachHpBars が差し替えるので、安定した配列へ戻す
    frames(w, 4);
    return w;
}
const mouseAt = (w, sx, sy) => { const m = w.stage.toStage(sx, sy); w.mouse(Math.round(m.x), Math.round(m.y)); };   // 画面座標(sx, sy)にカーソルがある状態(ステージ座標で持つ)

// ---------------------------------------------------------------- データ・登録 ----------------------------------------------------------------
test("専用マップ: Map006(未使用ID)を新規作成。空のステージ(40x40・Eventなし)で、既存の Map003/004/005 と MapInfos の既存の項目は変えない。登録順は SOULの後・HUDの前", () => {
    const m = JSON.parse(mapJson(STAGE_ID));
    assert.deepEqual([m.width, m.height, m.tilesetId, m.data.length, m.events.filter(Boolean).length], [40, 40, 4, 40 * 40 * 6, 0]);
    assert.ok(m.data.every(v => v === 0), "何も描かない空のマップ");
    assert.match(m.note, /SOUL battle stage/);
    const infos = JSON.parse(read("data/MapInfos.json"));
    assert.equal(infos[6].name, "DEV_SoulBattleStage");
    // 3 番(MAP003)はこのブランチでは別の作業のマップなので、あってもなくても(null でも)よい。SOUL が足すのは 6 番だけ
    assert.deepEqual(infos.slice(1, 6).map(x => x && x.id).filter(id => id !== 3 && id !== null), [1, 2, 4, 5], "既存の項目はそのまま");
    const status = cp.execFileSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).split(/\r?\n/);
    for (const file of ["data/Map004.json", "data/Map005.json", "data/Map002.json"]) assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    const names = (() => { const c = {}; vm.runInNewContext(read("js/plugins.js"), c); return c.$plugins.map(p => p.name); })();
    const i = names.indexOf("ProjectR_SoulBattleStage");
    assert.equal(names.filter(n => n === "ProjectR_SoulBattleStage").length, 1);
    for (const dep of ["ProjectR_SoulBattle", "ProjectR_SoulBattleSandbox", "ProjectR_CombatTestArena"]) assert.ok(names.indexOf(dep) < i, dep + " より後");
    assert.ok(i < names.indexOf("ProjectR_SoulBattleHUD"), "HUDより前");
    const code = read("js/plugins/ProjectR_SoulBattleStage.js").split("*/").slice(1).join("*/");
    assert.doesNotMatch(code, /require\(|writeFile|fs\.|StorageManager|UpdateEventHp|registerBoss|\.damage\(|setHp|\$gameVariables\.setValue|\$gameSwitches\.setValue/, "データ・セーブ・戦闘の規則を触らない");
    for (const file of ["js/plugins/ProjectR_BossFramework.js", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/ProjectR_CombatTestArena.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js"]) {
        assert.ok(!status.some(line => line.slice(3) === file), file + " は変更されていない");
    }
});

// ---------------------------------------------------------------- 16:9・座標変換(純粋な計算) ----------------------------------------------------------------
const SIZES = [[1920, 1080], [1280, 720], [816, 624], [1366, 768], [2560, 1440], [1000, 1000], [640, 360], [1600, 1200], [3440, 1440]];
test("厳密な16:9: どの画面サイズでも戦闘エリアは w:h = 16:9 ちょうど。縦横同じ倍率(引き伸ばさない)で、上下のパネルの帯の内側・画面の内側・左右中央に置かれる", () => {
    const w = world();
    const stage = w.stage;
    const BAND_TOP = stage.BAND_TOP, BAND_BOTTOM = stage.BAND_BOTTOM;
    for (const [gw, gh] of SIZES) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh;      // toStage/toScreen は今の画面サイズで計算する
        const vp = stage.computeViewport(gw, gh);
        assert.equal(vp.w * 9, vp.h * 16, `${gw}x${gh}: 戦闘エリアは厳密な16:9 (${vp.w}x${vp.h})`);
        assert.equal(vp.srcW * 9, vp.srcH * 16, `${gw}x${gh}: 映すステージ領域も厳密な16:9`);
        assert.equal(vp.w / vp.srcW, vp.h / vp.srcH, `${gw}x${gh}: 縦横同じ倍率`);
        assert.ok(vp.x >= 0 && vp.y >= 0 && vp.x + vp.w <= gw && vp.y + vp.h <= gh, `${gw}x${gh}: 画面の内側`);
        assert.ok(vp.srcX >= 0 && vp.srcY >= 0 && vp.srcX + vp.srcW <= gw && vp.srcY + vp.srcH <= gh, `${gw}x${gh}: ステージ領域は描画範囲の内側`);
        const sy = gh / 1080;
        assert.ok(vp.y >= BAND_TOP * sy - 1 && vp.y + vp.h <= BAND_BOTTOM * sy + 1, `${gw}x${gh}: 上下のパネルの帯の中`);
        assert.ok(Math.abs((vp.x * 2 + vp.w) - gw) <= 1, `${gw}x${gh}: 左右中央`);
        // 往復と四隅
        const a = stage.toStage(vp.x, vp.y), b = stage.toStage(vp.x + vp.w, vp.y + vp.h);
        assert.ok(Math.abs(a.x - vp.srcX) < 1e-6 && Math.abs(a.y - vp.srcY) < 1e-6 && Math.abs(b.x - (vp.srcX + vp.srcW)) < 1e-6 && Math.abs(b.y - (vp.srcY + vp.srcH)) < 1e-6, `${gw}x${gh}: 四隅`);
        for (const [px, py] of [[vp.x + 10, vp.y + 20], [vp.x + vp.w / 2, vp.y + vp.h / 2], [3, 7]]) {
            const back = stage.toScreen(stage.toStage(px, py).x, stage.toStage(px, py).y);
            assert.ok(Math.abs(back.x - px) < 1e-6 && Math.abs(back.y - py) < 1e-6, `${gw}x${gh}: 往復`);
        }
    }
    const big = stage.computeViewport(1920, 1080);
    assert.deepEqual([big.w, big.h, big.x, big.y], [784, 441, 568, 206], "1920x1080の戦闘エリア(敵の置き場を上に空けたぶん小さい・左右中央)");
    assert.ok(big.y - 98 >= 100, "上のHUD(〜98)と戦闘エリアの間に、敵の置き場(約90)が入る: " + (big.y - 98));
    assert.equal(big.x * 2 + big.w, 1920, "水平方向にぴったり中央");
});

test("HUD・キャラ/神の置き場は戦闘エリアの外で互いに重ならない: 上のパネル・戦闘エリア・キャラ・神・下の手札/HP/山札パネルが、上から順に、どの画面サイズでも重ならず、左右中央に揃う", () => {
    const w = world();
    const PANELS = { state: { x: 24, y: 14, w: 312, h: 84 }, phase: { x: 348, y: 14, w: 300, h: 46 }, player: { x: 24, y: 900, w: 300, h: 156 }, cards: { x: 344, y: 884, w: 1230, h: 176 }, counts: { x: 1596, y: 900, w: 300, h: 156 } };
    for (const [gw, gh] of SIZES) {
        const vp = w.stage.computeViewport(gw, gh), sx = gw / 1920, sy = gh / 1080;
        for (const [name, r] of Object.entries(PANELS)) {
            const a = { x0: r.x * sx, x1: (r.x + r.w) * sx, y0: r.y * sy, y1: (r.y + r.h) * sy };
            const overlap = a.x0 < vp.x + vp.w && a.x1 > vp.x && a.y0 < vp.y + vp.h && a.y1 > vp.y;
            assert.equal(overlap, false, `${gw}x${gh}: ${name} は戦闘エリアの外`);
        }
        // キャラ・神の置き場: 戦闘エリアの下・手札パネルの上・互いに重ならない・左右中央・画面の内側
        const z = w.stage.REP, e = w.stage.ENEMY, sx2 = gw / 1920, sy2 = gh / 1080, width = z.w * sx2, x0 = gw / 2 - width / 2;
        const ew2 = Math.min(e.w * sx2, vp.w), enemy = { x: gw / 2 - ew2 / 2, y: e.y * sy2, w: ew2, h: e.h * sy2 };
        // 敵の置き場: 戦闘エリアの上(枠線3pxも避ける)・上のHUDパネルの下・左右中央・画面の内側・どのパネルとも重ならない
        assert.ok(enemy.y + enemy.h <= vp.y - 3, `${gw}x${gh}: 敵は戦闘エリア(枠線を含む)の上 (${enemy.y + enemy.h} <= ${vp.y - 3})`);
        assert.ok(enemy.y >= 0 && e.h >= 180, `${gw}x${gh}: ボス名のパネルが無いので、敵(ボスの絵)は画面の上から大きく使う(旧 高さ90 → ${e.h})`);
        assert.ok(enemy.x >= 0 && enemy.x + enemy.w <= gw && Math.abs(enemy.x + enemy.w / 2 - gw / 2) < 1e-6, `${gw}x${gh}: 敵は画面の内側・左右中央`);
        assert.ok(enemy.x >= vp.x - 1 && enemy.x + enemy.w <= vp.x + vp.w + 1 || gw < 1000, `${gw}x${gh}: 敵は戦闘エリアの幅の中`);
        for (const [pn, p] of Object.entries(PANELS)) {
            const a = { x0: p.x * sx2, x1: (p.x + p.w) * sx2, y0: p.y * sy2, y1: (p.y + p.h) * sy2 };
            assert.equal(enemy.x < a.x1 && enemy.x + enemy.w > a.x0 && enemy.y < a.y1 && enemy.y + enemy.h > a.y0, false, `${gw}x${gh}: 敵と ${pn} は重ならない`);
        }
        const zones = { char: { x: x0, y: z.char.y * sy2, w: width, h: z.char.h * sy2 }, god: { x: x0, y: z.god.y * sy2, w: width, h: z.god.h * sy2 } };
        for (const [name, r] of Object.entries(zones)) {
            assert.ok(r.y >= vp.y + vp.h, `${gw}x${gh}: ${name} は戦闘エリアの下`);
            assert.ok(r.x >= 0 && r.x + r.w <= gw && r.y + r.h <= gh, `${gw}x${gh}: ${name} は画面の内側`);
            assert.ok(Math.abs(r.x + r.w / 2 - gw / 2) < 1e-6, `${gw}x${gh}: ${name} は左右中央(戦闘エリアの中心 ${vp.x + vp.w / 2})`);
            for (const [pn, p] of Object.entries(PANELS)) {
                const a = { x0: p.x * sx2, x1: (p.x + p.w) * sx2, y0: p.y * sy2, y1: (p.y + p.h) * sy2 };
                assert.equal(r.x < a.x1 && r.x + r.w > a.x0 && r.y < a.y1 && r.y + r.h > a.y0, false, `${gw}x${gh}: ${name} と ${pn} は重ならない`);
            }
        }
        assert.ok(zones.char.y + zones.char.h <= zones.god.y, `${gw}x${gh}: キャラの下に神`);
        // カットイン: 味方 = 左上 / 敵 = 右上。戦闘エリア・敵の絵・キャラ/神・各パネルのどれとも重ならず、画面の内側
        const cut = plain(w.stage.computeCutInRects(vp));
        assert.ok(cut.ally.x < cut.enemy.x && Math.abs(cut.ally.y - cut.enemy.y) < 1e-6, `${gw}x${gh}: 味方は左・敵は右(同じ高さ)`);
        assert.ok(Math.abs(cut.ally.x - (gw - cut.enemy.x - cut.enemy.w)) < 1e-6 && cut.ally.w === cut.enemy.w, `${gw}x${gh}: 左右対称`);
        const others = { ...Object.fromEntries(Object.entries(PANELS).map(([n, r]) => [n, { x0: r.x * sx2, x1: (r.x + r.w) * sx2, y0: r.y * sy2, y1: (r.y + r.h) * sy2 }])),
            area: { x0: vp.x - 3, x1: vp.x + vp.w + 3, y0: vp.y - 3, y1: vp.y + vp.h + 3 }, enemy: { x0: enemy.x, x1: enemy.x + enemy.w, y0: enemy.y, y1: enemy.y + enemy.h },
            char: { x0: zones.char.x, x1: zones.char.x + zones.char.w, y0: zones.char.y, y1: zones.char.y + zones.char.h }, god: { x0: zones.god.x, x1: zones.god.x + zones.god.w, y0: zones.god.y, y1: zones.god.y + zones.god.h } };
        for (const [side, r] of Object.entries(cut)) {
            assert.ok(r.x >= 0 && r.x + r.w <= gw && r.y >= 0 && r.y + r.h <= gh, `${gw}x${gh}: ${side}のカットインは画面の内側`);
            for (const [on, a] of Object.entries(others)) assert.equal(r.x < a.x1 && r.x + r.w > a.x0 && r.y < a.y1 && r.y + r.h > a.y0, false, `${gw}x${gh}: ${side}のカットインと ${on} は重ならない`);
        }
        assert.ok(Math.abs((vp.x + vp.w / 2) - gw / 2) <= 1, `${gw}x${gh}: 戦闘エリアも左右中央`);
    }
});

test("バトルボックスとハートの範囲: ボックスは戦闘エリアの内側。カーソルがどこにあってもハートはボックスの内側(半径ぶん)に収まる。カーソルが中なら位置はそのまま", () => {
    const w = world();
    for (const [gw, gh] of SIZES) {
        const vp = w.stage.computeViewport(gw, gh);
        const box = { x: vp.x + w.stage.BOX_N.x * vp.w, y: vp.y + w.stage.BOX_N.y * vp.h, w: w.stage.BOX_N.w * vp.w, h: w.stage.BOX_N.h * vp.h };
        assert.ok(box.x >= vp.x && box.y >= vp.y && box.x + box.w <= vp.x + vp.w && box.y + box.h <= vp.y + vp.h, `${gw}x${gh}: ボックスは戦闘エリアの内側`);
        const r = Math.max(6, Math.round(vp.w * 0.014));
        for (const [mx, my] of [[-500, -500], [gw + 500, gh + 500], [box.x - 1, box.y + box.h / 2], [box.x + box.w + 1, box.y + box.h / 2], [box.x + box.w / 2, box.y - 99], [box.x + box.w / 2, box.y + box.h + 99], [0, 0], [gw, gh]]) {
            const c = w.stage.clampToBox(box, r, mx, my);
            assert.ok(c.x >= box.x + r && c.x <= box.x + box.w - r && c.y >= box.y + r && c.y <= box.y + box.h - r, `${gw}x${gh}: (${mx},${my}) はボックスの内側へ`);
            assert.equal(c.inside, mx >= box.x && mx <= box.x + box.w && my >= box.y && my <= box.y + box.h);
        }
        const mid = { x: box.x + box.w / 2 + 5, y: box.y + box.h / 2 - 5 };
        const c = w.stage.clampToBox(box, r, mid.x, mid.y);
        assert.deepEqual([c.x, c.y, c.inside], [mid.x, mid.y, true], "中なら動かさない");
    }
});

// ---------------------------------------------------------------- 移動(入る・戻る・中断) ----------------------------------------------------------------
test("入る→戻る: 元のマップ・座標・向きを記録してステージへ移動し、到着で有効になり、戻りの予約は1回だけ。戻れば全て元通り(マウス変換・セーブ許可・プレイヤー表示)", () => {
    const w = world({ origin: { map: 1, x: 12, y: 20 } });
    const p = w.ctx.$gamePlayer;
    p._realX = 12.35; p._realY = 20.2; p.setDirection(4);
    const before = { x: p.x, y: p.y, dir: p.direction(), save: w.ctx.$gameSystem.isSaveEnabled(), tx: w.ctx.TouchInput._x };
    const moved = plain(w.stage.enter());
    assert.deepEqual([moved.ok, moved.pending], [true, true]);
    assert.deepEqual([p.isTransferring(), p.newMapId()], [true, STAGE_ID], "ステージへの移動が予約された");
    assert.equal(w.transfers.length, 1);
    assert.equal(stageState(w).state, "entering");
    assert.deepEqual(stageState(w).returnPoint, { mapId: 1, x: 12, y: 20, direction: 4, realX: 12.35, realY: 20.2 });
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), false, "移動中からセーブ禁止");
    assert.equal(plain(w.stage.enter()).reason, "stageBusy", "二重に入らない");
    arrive(w); frames(w, 3);
    assert.equal(stageState(w).state, "active");
    assert.equal(w.ctx.$gameMap.mapId(), STAGE_ID);
    assert.equal(stageState(w).mapped, true);
    assert.equal(w.stage.isActive() && w.stage.isPresenting(), true);
    // 戻る
    const left = plain(w.stage.leave("test"));
    assert.deepEqual([left.ok, left.leaving], [true, true]);
    assert.deepEqual(w.transfers.slice(-1)[0], [1, 12, 20, 4], "元のマップ・座標・向きへの予約");
    const again = plain(w.stage.leave("again"));
    assert.deepEqual([again.ok, again.already], [true, true]);
    assert.equal(w.transfers.length, 2, "戻りの予約は1回だけ");
    assert.equal(stageState(w).state, "leaving");
    arrive(w); frames(w, 3);
    const s = stageState(w);
    assert.deepEqual([s.state, s.mapped, s.layers, s.hiddenPlayerSprites, s.completions, s.lastReason], ["idle", false, false, 0, 1, "test"]);
    assert.deepEqual([p.x, p.y, p.direction(), w.ctx.$gameMap.mapId()], [before.x, before.y, before.dir, 1], "元のマップ・座標・向き");
    assert.ok(Math.abs(p._realX - 12.35) < 1e-6 && Math.abs(p._realY - 20.2) < 1e-6, "DotMoveの小数座標も元通り " + p._realX + "," + p._realY);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), before.save, "セーブ許可が元通り");
    assert.equal(w.stage.isPresenting(), false);
    frames(w, 30);
    assert.equal(w.transfers.length, 2, "以後は何も起きない");
});

test("ステージに入れない・中断: SOUL戦闘中・移動の途中での取り消し・到着前の時間切れ・外からの別マップ移動・New Game/ロードのどれでも、1回だけ片づく", () => {
    // SOUL中は入らない
    let w = world();
    assert.equal(w.soul.start({ heart: false, attackSeconds: 5 }).ok, true);
    assert.equal(plain(w.stage.enter()).reason, "soulActive");
    assert.equal(stageState(w).state, "idle"); assert.equal(w.transfers.length, 0);
    // 移動の途中で取り消し(leave): 元へ戻る予約に差し替わる
    w = world();
    assert.equal(w.stage.enter().ok, true);
    assert.equal(plain(w.stage.leave("cancel")).leaving, true);
    assert.deepEqual(w.transfers.slice(-1)[0], [1, 12, 20, 2], "元の場所への予約に差し替え");
    arrive(w); frames(w, 3);
    assert.equal(stageState(w).state, "idle"); assert.equal(w.ctx.$gameMap.mapId(), 1);
    // 到着しない: 時間切れで idle(何も残らない)
    w = world();
    assert.equal(w.stage.enter().ok, true);
    frames(w, 1000);
    let s = stageState(w);
    assert.deepEqual([s.state, s.lastReason, w.ctx.$gameSystem.isSaveEnabled(), s.mapped], ["idle", "enterTimeout", true, false]);
    // 戻りが終わらない
    w = world();
    w.stage.enter(); arrive(w); frames(w, 3);
    w.stage.leave("x");
    frames(w, 1000);
    s = stageState(w);
    assert.deepEqual([s.state, s.lastReason, s.mapped, s.layers], ["idle", "leaveTimeout", false, false]);
    // 外から別マップへ移された(有効中): 戻さず、片づけて idle
    w = world();
    w.stage.enter(); arrive(w); frames(w, 3);
    assert.equal(stageState(w).state, "active");
    w.ctx.$gamePlayer.reserveTransfer(2, 3, 3, 2, 0);
    const n = w.transfers.length;
    arrive(w); frames(w, 3);
    s = stageState(w);
    assert.deepEqual([s.state, s.lastReason, s.mapped, s.hiddenPlayerSprites, w.ctx.$gameSystem.isSaveEnabled()], ["idle", "mapChanged", false, 0, true]);
    assert.equal(w.transfers.length, n, "別マップへ移された後に、勝手に戻さない");
    assert.equal(w.parts.player.renderable, true);
    // New Game / ロード(別の $gameSystem)
    w = world();
    w.stage.enter(); arrive(w); frames(w, 3);
    assert.equal(stageState(w).mapped, true);
    w.ctx.$gameSystem = new w.ctx.Game_System();
    frames(w, 2);
    s = stageState(w);
    assert.deepEqual([s.state, s.mapped, s.lastReason], ["idle", false, "systemChanged"]);
});

// ---------------------------------------------------------------- 映し方・マウス・非表示 ----------------------------------------------------------------
test("戦闘エリアへの拡大縮小: ステージ領域を縦横同じ倍率で戦闘エリアへ置く(引き伸ばさない)。カメラは固定。解像度が変わっても追従し、背景・枠は新しい大きさで作り直す", () => {
    const w = world();
    w.stage.enter(); arrive(w); frames(w, 3);
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [816, 624], [1000, 1000]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh;
        frames(w, 2);
        const vp = w.stage.getViewport(), sp = w.parts.sp;
        assert.equal(sp.scale.x, sp.scale.y, `${gw}x${gh}: 縦横同じ倍率`);
        assert.ok(Math.abs(sp.scale.x - vp.scale) < 1e-12, `${gw}x${gh}: 倍率 ${sp.scale.x} vs ${vp.scale}`);
        assert.ok(Math.abs(sp.x - (vp.x - vp.srcX * vp.scale)) <= 1 && Math.abs(sp.y - (vp.y - vp.srcY * vp.scale)) <= 1, `${gw}x${gh}: 位置`);
        // ステージ領域の四隅が、戦闘エリアの四隅に映る
        const tl = { x: sp.x + vp.srcX * sp.scale.x, y: sp.y + vp.srcY * sp.scale.y }, br = { x: sp.x + (vp.srcX + vp.srcW) * sp.scale.x, y: sp.y + (vp.srcY + vp.srcH) * sp.scale.y };
        assert.ok(Math.abs(tl.x - vp.x) <= 1 && Math.abs(tl.y - vp.y) <= 1 && Math.abs(br.x - (vp.x + vp.w)) <= 1.5 && Math.abs(br.y - (vp.y + vp.h)) <= 1.5, `${gw}x${gh}: 四隅`);
        const layers = w.sc()._projectRSoulStageLayers;
        assert.deepEqual([layers.backdrop.bitmap.width, layers.backdrop.bitmap.height, layers.frame.bitmap.width, layers.frame.bitmap.height], [vp.srcW, vp.srcH, gw, gh], `${gw}x${gh}: 背景(ステージ領域)・枠(画面)の大きさ`);
        assert.deepEqual([layers.backdrop.x, layers.backdrop.y], [vp.srcX, vp.srcY], "背景はステージ領域の位置");
        assert.deepEqual([w.ctx.$gameMap._displayX, w.ctx.$gameMap._displayY], [0, 0], "カメラ固定");
        assert.equal(w.parts.sp._baseSprite.children.filter(c => c._projectRSoulStageBackdrop).length + w.sc().children.filter(c => c._projectRSoulStageBackdrop).length, 1, "背景は1枚");
    }
    // 層の並び: 背景は最背面・枠はマップの直後
    const kids = w.sc().children, layers = w.sc()._projectRSoulStageLayers;
    assert.equal(w.parts.sp._baseSprite.children.indexOf(layers.backdrop), 1, "背景は不透明な黒い画面の1つ上(Spritesetの中)");
    assert.equal(kids.includes(layers.backdrop), false);
    assert.equal(kids.indexOf(layers.frame), kids.indexOf(w.parts.sp) + 1);
});

test("マウス座標の変換: 画面座標を『ステージ座標』へ(Graphics.pageToCanvasX/Y)。解像度が変わっても、カーソルが指している場所はステージ上で同じ点。ステージの外では変換しない", () => {
    const w = world();
    const G = w.ctx.Graphics;
    G._canvas = { offsetLeft: 0, offsetTop: 0 }; G._realScale = 1;
    assert.equal(G.pageToCanvasX(500), 500, "ステージの外では何も変えない");
    w.stage.enter(); arrive(w); frames(w, 3);
    // 実画面(CSS拡大 realScale=2 を含む)のページ座標 → canvas座標 → ステージ座標
    for (const scale of [1, 2, 0.75]) {
        G._realScale = scale;
        const vp = w.stage.getViewport();
        for (const [cx, cy] of [[vp.x, vp.y], [vp.x + vp.w / 2, vp.y + vp.h / 2], [vp.x + vp.w, vp.y + vp.h], [vp.x + 100, vp.y + 50]]) {
            const expected = w.stage.toStage(cx, cy);
            assert.ok(Math.abs(G.pageToCanvasX(cx * scale) - expected.x) <= 1 && Math.abs(G.pageToCanvasY(cy * scale) - expected.y) <= 1, `realScale ${scale}: (${cx},${cy})`);
        }
    }
    G._realScale = 1;
    // 敵ハートの「画面に映って見える位置」にカーソルを置くと、本体のコードが見る座標(TouchInput.x/y)はハートのマップ座標(screenX/screenY)になる
    const sx = w.ctx.$gamePlayer.screenX(), sy = w.ctx.$gamePlayer.screenY();
    const shown = w.stage.toScreen(sx, sy);                                                  // プレイヤーが画面のどこに映るか
    const raw = { x: Math.round(shown.x), y: Math.round(shown.y) };
    w.ctx.TouchInput._onMove(G.pageToCanvasX(raw.x), G.pageToCanvasY(raw.y));
    assert.ok(Math.abs(w.ctx.TouchInput.x - sx) <= 1 && Math.abs(w.ctx.TouchInput.y - sy) <= 1, `TouchInput=(${w.ctx.TouchInput.x},${w.ctx.TouchInput._y}) vs 本体の座標(${sx},${sy})`);
    // 解像度が変わっても、保持している座標は同じ画面位置を指し続ける
    mouseAt(w, 700, 400);
    for (const [gw, gh] of [[1280, 720], [816, 624], [1920, 1080]]) {
        const old = w.stage.getViewport();
        const screenBefore = w.stage.toScreen(w.ctx.TouchInput._x, w.ctx.TouchInput._y);
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 2);
        const nv = w.stage.getViewport();
        const screenAfter = w.stage.toScreen(w.ctx.TouchInput._x, w.ctx.TouchInput._y);
        // 物理的なカーソルは動かないので、キャンバスの中の相対位置が保たれる(次のマウス移動までの間の値)
        const relBefore = { u: screenBefore.x / old.gw, v: screenBefore.y / old.gh }, relAfter = { u: screenAfter.x / nv.gw, v: screenAfter.y / nv.gh };
        assert.ok(Math.abs(relBefore.u - relAfter.u) < 0.01 && Math.abs(relBefore.v - relAfter.v) < 0.01, `${gw}x${gh}: 相対位置が保たれる`);
    }
    // 終われば画面座標へ戻る
    w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080; frames(w, 1);
    mouseAt(w, 960, 540);
    w.stage.leave("t"); arrive(w); frames(w, 3);
    assert.equal(stageState(w).mapped, false);
    assert.equal(w.ctx.TouchInput._x, 960, "戻れば画面座標のまま(" + w.ctx.TouchInput._x + ")");
    assert.equal(G.pageToCanvasX(321), 321);
});

test("カーソルが戦闘エリアの外でも追従する: 画面の中なら、変換後の座標がステージ領域の外でも TouchInput が受け取る(isInsideCanvas は変換前の座標で判定)。画面の外は従来どおり無視", () => {
    const w = world();
    const G = w.ctx.Graphics;
    G._canvas = { offsetLeft: 0, offsetTop: 0 }; G._realScale = 1;
    assert.equal(G.isInsideCanvas(100, 100), true); assert.equal(G.isInsideCanvas(-1, 5), false); assert.equal(G.isInsideCanvas(1920, 5), false);
    w.stage.enter(); arrive(w); frames(w, 3);
    const vp = w.stage.getViewport();
    // 戦闘エリアの左右・上下の外(画面の中): 変換後の座標はステージ領域の外
    for (const [px, py] of [[10, 500], [1910, 500], [960, 5], [960, 1075], [vp.x - 1, vp.y - 1]]) {
        const m = w.stage.toStage(px, py);
        assert.ok(m.x < 0 || m.x >= 1920 || m.y < 0 || m.y >= 1080 || px < vp.x || py < vp.y, "変換後は領域の外になり得る");
        assert.equal(G.isInsideCanvas(Math.round(m.x), Math.round(m.y)), true, `画面の中(${px},${py})は受け取る`);
        w.ctx.TouchInput._onMove(G.pageToCanvasX(px), G.pageToCanvasY(py));
        const back = w.stage.toScreen(w.ctx.TouchInput._x, w.ctx.TouchInput._y);
        assert.ok(Math.abs(back.x - px) <= 2 && Math.abs(back.y - py) <= 2, `カーソル(${px},${py})に追従する: ${JSON.stringify(back)}`);
    }
    // 画面の外は無視
    for (const [px, py] of [[-5, 100], [1925, 100], [100, -5], [100, 1085]]) {
        const m = w.stage.toStage(px, py);
        assert.equal(G.isInsideCanvas(Math.round(m.x), Math.round(m.y)), false, `画面の外(${px},${py})は無視`);
    }
    // ステージを出れば従来の判定
    w.stage.leave("t"); arrive(w); frames(w, 3);
    assert.equal(G.isInsideCanvas(1925, 5), false); assert.equal(G.isInsideCanvas(1900, 5), true);
});

test("プレイヤーを描かない: キャラ・影・名前表示(Spriteの子)は非表示。座標・向き・透明度・攻撃の起点は本物のまま。他のキャラは描く。戻れば元の値(元から非表示なら非表示のまま)", () => {
    const w = world();
    const p = w.ctx.$gamePlayer;
    const t0 = { transparent: p._transparent, opacity: p.opacity?.(), x: p._realX, y: p._realY };
    w.stage.enter(); arrive(w); frames(w, 2);
    // 手に持っている武器の絵(Hendrix DisplayWeapon の Sprite)は描かない。武器を振る演出(Sprite_WeaponSwing = _source を持つ)・他の絵は描く
    const tm = w.parts.sp._tilemap, z = w.ctx.$gamePlayer.screenZ() + 1;
    const held = tm.addChild({ anchor: { x: 0, y: 0.5 }, z, renderable: true, bitmap: { _url: "img/pictures/ProjectR_G17_Dev.png" } });
    const swing = tm.addChild({ anchor: { x: 0, y: 0.5 }, z, renderable: true, _source: w.ctx.$gamePlayer, bitmap: { _url: "img/pictures/Sword.png" } });
    const picture = tm.addChild({ anchor: { x: 0.5, y: 0.5 }, z, renderable: true, bitmap: { _url: "img/pictures/Other.png" } });
    frames(w, 2);
    assert.deepEqual([held.renderable, swing.renderable, picture.renderable], [false, true, true], "持っている武器だけ非表示");
    const p2 = w.ctx.$gamePlayer;
    assert.equal(w.parts.player.renderable, false, "プレイヤーのSpriteは描かない");
    assert.deepEqual(w.parts.player.children.map(c => c.renderable), [true, true], "子(影・名前)は親が描かれないので一緒に消える(子の値は触らない)");
    assert.equal(w.parts.other.renderable, true, "他のキャラは描く");
    assert.equal(stageState(w).hiddenPlayerSprites, 2, "キャラ + 持っている武器");
    assert.equal(p2._transparent, t0.transparent, "透明化フラグは触らない(攻撃や当たり判定への影響なし)");
    assert.equal(p2.isTransparent(), false);
    // 攻撃の起点は本物のプレイヤー位置のまま
    const c0 = p2.centerPositionPoint();
    frames(w, 30);
    assert.deepEqual(p2.centerPositionPoint(), c0, "位置は変わらない");
    assert.equal(w.parts.player.renderable, false);
    w.stage.leave("t"); arrive(w); frames(w, 3);
    assert.equal(w.parts.player.renderable, true, "戻れば描く");
    assert.equal(held.renderable, true, "持っている武器も戻る");
    assert.equal(stageState(w).hiddenPlayerSprites, 0);
    // 戻り中(暗転が終わるまで)も描かず、到着で記録した元の値へ戻す(新しいシーンでは表示物も作り直される)
    const w3 = world();
    w3.stage.enter(); arrive(w3); frames(w3, 3);
    const keep = w3.parts.player;
    w3.stage.leave("t"); frames(w3, 2);
    assert.equal(keep.renderable, false, "戻る(暗転)の間は描かない");
    arrive(w3); frames(w3, 3);
    assert.equal(keep.renderable, true, "元の値(true)へ戻る");
    // 通常の探索・非SOUL戦闘ではプレイヤーは描く
    const w4 = world();
    frames(w4, 10);
    assert.equal(w4.parts.player.renderable, true); assert.equal(stageState(w4).hiddenPlayerSprites, 0);
});

// ---------------------------------------------------------------- 戦闘(I2/I3の流れ) ----------------------------------------------------------------
test("a16を専用ステージで: 開始→移動→到着→SOULと混成30枚デッキ・ハート・BossFramework。プレイヤーは見えず、HUD(I3)は戦闘エリアの外。敵Event(ダミー)の無い空のステージ", () => {
    const w = world();
    const before = snapshot(w);
    a16(w);
    const st = plain(w.sb.status && quietly(() => w.sb.status()));
    assert.equal(st.a16.deckSize, 30); assert.equal(st.a16.deckValid, true);
    assert.deepEqual(st.a16.hand, HAND);
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).sort(), ["boss:dev_boss_soul", "soul_battle"]);
    assert.equal(w.ctx.$gameMap.mapId(), STAGE_ID);
    assert.equal(w.ctx.$gameMap.events().filter(e => e && !e.isSpawnEvent && e.event()?.note?.includes("<enemy>")).length, 0, "ステージに敵Eventは無い");
    assert.equal(w.parts.player.renderable, false);
    assert.equal(w.soul.getState().lockedPlayer, true);
    assert.equal(stageState(w).state, "active");
    // プレイヤーは下、敵ハートは上(厳密にステージ内)
    const heart = w.ctx.$gameMap.event(w.heart), player = w.ctx.$gamePlayer, vp = w.stage.getViewport(), lay = w.stage.layout();
    assert.ok(heart.screenY() < player.screenY(), "ハートはプレイヤーの上");
    assert.ok(heart.screenX() >= vp.srcX && heart.screenX() <= vp.srcX + vp.srcW && heart.screenY() >= vp.srcY && heart.screenY() <= vp.srcY + vp.srcH, "敵ハートは戦闘エリア(ステージ領域)の中");
    // 見えないプレイヤーは、キャラの置き場の中心に立つ(戦闘エリアの外・マップの内側)。画面に映る位置 = キャラの絵の位置
    assert.ok(Math.abs(player._realX - lay.player.x) < 1e-6 && Math.abs(player._realY - lay.player.y) < 1e-6, "プレイヤー = キャラの置き場");
    assert.ok(player.screenY() > vp.srcY + vp.srcH && player._realY < w.ctx.$gameMap.height(), "プレイヤーは戦闘エリアの下(マップの内側)");
    const shown = w.stage.toScreen(player.centerPositionPoint().x * 48, player.centerPositionPoint().y * 48), zones = plain(w.stage.getRepZones());
    assert.ok(Math.abs(shown.x - (zones.char.x + zones.char.w / 2)) < 1 && Math.abs(shown.y - (zones.char.y + zones.char.h / 2)) < 1, "プレイヤーの攻撃の起点 = キャラの絵の中心");
    const gscreen = w.stage.toScreen(lay.godCenter.x * 48, lay.godCenter.y * 48);
    assert.ok(Math.abs(gscreen.x - (zones.god.x + zones.god.w / 2)) < 1 && Math.abs(gscreen.y - (zones.god.y + zones.god.h / 2)) < 1, "神の起点 = 神の絵の中心");
    // HUD(I3)はステージを認識: 暗転なし・攻撃の枠なし・戦闘エリアの外
    const layer = w.sc()._projectRSoulHud;
    assert.equal(layer._stageOn, true);
    assert.equal(w.sc()._spriteset._tilemap.children.filter(c => c._projectRSoulDim).length, 0, "探索マップを暗くする代わりに専用ステージを使う");
    assert.ok(layer.corners.every(c => !c.visible), "攻撃の枠は出さない(戦闘エリアの枠がある)");
    assert.equal(layer.box.visible, false, "HUD側のバトルボックスは出さない(ステージ側が描く)");
    const vm = plain(w.hud.getViewModel());
    assert.equal(vm.hand.map(h => h.cardId).join(), HAND.join()); assert.equal(vm.boss.name, plain(w.bf.getHudState()).name);
    // 終わらせる
    quietly(() => w.sb.stop());
    arrive(w); frames(w, 4);
    assert.equal(snapshot(w), before, "デッキ・指輪・所持・セッション・武器・操作が元通り");
    assert.deepEqual([stageState(w).state, w.ctx.$gameMap.mapId()], ["idle", 1]);
});

test("攻撃ターンの戦闘は従来どおり: 本物のハートへ当たり(一閃Lv3=300・4回)、ダメージ・BossFramework・フェーズが変わらない。マウス照準はステージ座標で正しく狙える", () => {
    const w = a16(world());
    const id = w.heart;
    const hp0 = plain(w.bf.getHudState()).hp;
    w.calls.length = 0;
    // カーソルを「ハートが画面に映って見える位置」へ(画面座標 → ステージ座標)
    const hs = w.ctx.$gameMap.event(id);
    mouseAt(w, ...Object.values(w.stage.toScreen(hs.screenX(), hs.screenY())));
    const cast = plain(w.deck.requestUseCard(0)); assert.equal(cast.ok, true, JSON.stringify(cast));
    frames(w, 230);
    const hits = w.calls.filter(x => x.name === "UpdateEventHp" && String(x.args.eventId) === String(id)).length;
    assert.deepEqual([1000 - barHp(w, id), hits], [300, 4], "一閃Lv3の従来の値");
    assert.equal(plain(w.bf.getHudState()).hp, hp0 - 300);
    hurt(w, id, 400); frames(w, 6);
    assert.ok(["phase2", "phase3"].includes(plain(w.bf.getState()).phase.id), "フェーズが進む");
    quietly(() => w.sb.stop());
});

test("防御ターンのハート: マウスでバトルボックスの中を動く。カーソルが外へ出ても縁に張り付く。解像度が変わってもボックス内。弾幕・ダメージ・新しいEventは増えない", () => {
    const w = a16(world());
    assert.equal(w.stage.getPlayerHeart().active, false, "攻撃ターンは無し");
    const hp0 = w.ctx.$gameParty.leader().hp, events0 = w.ctx.$gameMap.events().filter(e => e && !e._erased).length;
    let box = plain(w.stage.getBattleBox()), vp = w.stage.getViewport();
    mouseAt(w, box.x + box.w / 2, box.y + box.h / 2);                    // カーソルがボックスの中央にある状態で防御ターンへ
    w.soul.skipPhase(); frames(w, 4);
    let heart = plain(w.stage.getPlayerHeart());
    assert.equal(heart.active, true);
    assert.ok(Math.abs(heart.x - (box.x + box.w / 2)) < 2 && Math.abs(heart.y - (box.y + box.h / 2)) < 2, "カーソルのある位置(ボックスの中央)にいる");
    // ボックスの中: カーソルの位置へ
    mouseAt(w, box.x + box.w * 0.3, box.y + box.h * 0.7); frames(w, 2);
    heart = plain(w.stage.getPlayerHeart());
    assert.ok(Math.abs(heart.x - (box.x + box.w * 0.3)) < 2 && Math.abs(heart.y - (box.y + box.h * 0.7)) < 2, "カーソルの位置へ " + JSON.stringify([heart.x, heart.y]));
    assert.equal(heart.inBox, true);
    // 外(上下左右・遠方): 縁に張り付く(半径ぶん内側)
    for (const [mx, my, side] of [[box.x - 200, box.y + box.h / 2, "left"], [box.x + box.w + 300, box.y + box.h / 2, "right"], [box.x + box.w / 2, box.y - 80, "top"], [box.x + box.w / 2, box.y + box.h + 120, "bottom"], [vp.x + vp.w + 10, vp.y + vp.h + 10, "corner"]]) {
        mouseAt(w, mx, my); frames(w, 2);
        heart = plain(w.stage.getPlayerHeart());
        assert.ok(heart.x >= box.x + heart.radius - 1e-6 && heart.x <= box.x + box.w - heart.radius + 1e-6 && heart.y >= box.y + heart.radius - 1e-6 && heart.y <= box.y + box.h - heart.radius + 1e-6, `${side}: ボックスの内側 ${JSON.stringify([heart.x, heart.y])}`);
        assert.equal(heart.inBox, false, `${side}: カーソルはボックスの外`);
    }
    mouseAt(w, box.x + box.w + 300, box.y + box.h / 2); frames(w, 2);
    assert.ok(Math.abs(plain(w.stage.getPlayerHeart()).x - (box.x + box.w - heart.radius)) < 1e-6, "右の縁に張り付く");
    // 描画: ボックスとハートが出る(防御ターンだけ)
    const overlay = w.sc()._projectRSoulStageLayers.overlay;
    assert.deepEqual([overlay._stageBox.visible, overlay._stageHeart.visible], [false, true], "入れ子の小さな箱は無い(ハートだけ)");
    assert.deepEqual([box.x, box.y, box.w, box.h], [vp.x, vp.y, vp.w, vp.h], "遊べる範囲 = 戦闘エリアそのもの");
    // 解像度の変更: 常にボックスの内側(カーソルはキャンバス内の相対位置を保つので、ハートはそれに追従する)
    mouseAt(w, box.x + box.w * 0.25, box.y + box.h * 0.25); frames(w, 2);
    for (const [gw, gh] of [[1280, 720], [816, 624], [640, 360], [1920, 1080]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 3);
        const nb = plain(w.stage.getBattleBox()), nh = plain(w.stage.getPlayerHeart());
        assert.ok(nh.x >= nb.x + nh.radius - 1e-6 && nh.x <= nb.x + nb.w - nh.radius + 1e-6 && nh.y >= nb.y + nh.radius - 1e-6 && nh.y <= nb.y + nb.h - nh.radius + 1e-6, `${gw}x${gh}: ボックスの内側`);
        const hs = w.sc()._projectRSoulStageLayers.overlay._stageHeart;
        assert.ok(Math.abs(hs.x + nh.radius - nh.x) <= 1 && Math.abs(hs.y + nh.radius - nh.y) <= 1, `${gw}x${gh}: 描く位置 = 論理位置`);
    }
    // ダメージ・弾幕なし
    frames(w, 90);
    assert.equal(w.ctx.$gameParty.leader().hp, hp0, "プレイヤーにダメージは入らない");
    assert.equal(w.ctx.$gameMap.events().filter(e => e && !e._erased).length, events0, "弾幕のEventは増えない");
    assert.equal(plain(w.bf.getHudState()).hp, 1000, "ボスのHPも変わらない");
    // 攻撃ターンへ戻れば消える
    w.soul.skipPhase(); frames(w, 4);
    assert.equal(w.stage.getPlayerHeart().active, false);
    assert.deepEqual([overlay._stageBox.visible, overlay._stageHeart.visible], [false, false]);
    quietly(() => w.sb.stop());
});

// 防御ターンのスプライト(箱・ハート)と攻撃ターンのスプライト(キャラ・神)の位置を、両フェーズで比べるための記録
const layoutOf = w => {
    const layers = w.sc()._projectRSoulStageLayers, hud = w.sc()._projectRSoulHud, o = layers.overlay;
    const vp = plain(w.stage.getViewport());
    return JSON.stringify({ vp, zones: plain(w.stage.getRepZones()), box: plain(w.stage.getBattleBox()), spriteset: [w.parts.sp.scale.x, w.parts.sp.x, w.parts.sp.y],
        hud: Object.entries(hud.panels).map(([k, p]) => [k, p.x, p.y]), cards: hud.cardPanels.map(p => [p.x, p.y]), hudScale: [hud.scale.x, hud.scale.y],
        char: [o._stageChar.x, o._stageChar.y, o._stageChar.scale.x], god: [o._stageGod.x, o._stageGod.y, o._stageGod.scale.x],
        backdrop: [layers.backdrop.x, layers.backdrop.y, layers.backdrop.bitmap.width, layers.backdrop.bitmap.height] });
};
// ハーネスでは画像が読み込まれないので、読み込み完了と同じ状態(切り出した1コマの大きさ)を与える
const loadReps = w => { const o = w.sc()._projectRSoulStageLayers.overlay; o._stageChar._repFrame = { pw: 48, ph: 48 }; o._stageGod._repFrame = { pw: 48, ph: 48 }; };

test("キャラ・神の置き場: 攻撃ターンは戦闘エリアのすぐ下にキャラ、その下に神(どちらも左右中央・手札の上)。防御ターンは絵を隠して置き場は空けたまま。戦闘エリア・手札・HUDの位置は両フェーズで同一", () => {
    const w = a16(world());
    loadReps(w); frames(w, 2);
    const o = w.sc()._projectRSoulStageLayers.overlay, vp = plain(w.stage.getViewport()), zones = plain(w.stage.getRepZones());
    let reps = plain(w.stage.getReps());
    assert.equal(reps.show, true);
    assert.deepEqual([reps.charVisible, reps.godVisible], [true, true], "攻撃ターンは両方出す");
    // 中央・順序・手札の上
    assert.ok(Math.abs(o._stageChar.x - 960) <= 1 && Math.abs(o._stageGod.x - 960) <= 1, "キャラ・神は左右中央");
    assert.ok(o._stageChar.y > vp.y + vp.h && o._stageChar.y < o._stageGod.y, "戦闘エリア < キャラ < 神");
    const cardTop = Math.min(...w.sc()._projectRSoulHud.cardPanels.map(p => p.y * w.sc()._projectRSoulHud.scale.y));
    assert.ok(o._stageGod.y + zones.god.h / 2 <= cardTop, "神は手札(Q/E/X/C/V)の上");
    // 置き場の中に収まる(縦横同じ倍率)
    for (const [sprite, z] of [[o._stageChar, zones.char], [o._stageGod, zones.god]]) {
        assert.equal(sprite.scale.x, sprite.scale.y, "引き伸ばさない");
        assert.ok(48 * sprite.scale.x <= z.w + 1e-6 && 48 * sprite.scale.y <= z.h + 1e-6, "置き場に収まる");
    }
    // 防御ターン: 絵だけ隠す。位置・大きさの記録は(隠れる前と)同じ
    const attackLayout = layoutOf(w);
    w.soul.skipPhase(); frames(w, 3);
    reps = plain(w.stage.getReps());
    assert.equal(reps.show, false);
    assert.deepEqual([o._stageChar.visible, o._stageGod.visible], [false, false], "防御ターンはキャラも神も隠す");
    assert.equal(layoutOf(w), attackLayout, "戦闘エリア・置き場・手札・HUD・スプライトの位置は変わらない(ジャンプなし)");
    // 防御ターンにもマップ上のプレイヤー・神は戦闘エリアに描かれない
    assert.equal(w.parts.player.renderable, false);
    // 攻撃へ戻る・何度切り替えても同じ
    for (let i = 0; i < 4; i++) {
        w.soul.skipPhase(); frames(w, 2);
        const phase = w.soul.getPhase();
        assert.deepEqual([o._stageChar.visible, o._stageGod.visible], phase === "attack" ? [true, true] : [false, false], `周回${i}: ${phase}`);
        assert.equal(layoutOf(w), attackLayout, `周回${i}: レイアウトは同一`);
    }
    quietly(() => w.sb.stop());
});

test("キャラと神は既存のデータから: キャラ=プレイヤーの歩行グラフィック、神=選ばれているUltimateの神(複数の指輪でも1柱)の表示Eventの画像。選択規則を新設しない。マップ上の神の表示Eventの絵は描かない", () => {
    const w = a16(world());
    const look = plain(w.stage.getReps());
    const leader = w.ctx.$gameParty.leader();
    assert.deepEqual([look.char.name, look.char.index], [leader.characterName(), leader.characterIndex()], "キャラ = 先頭アクターの基本の見た目");
    // 構え・射撃などの一時的なポーズ用の絵に Game_Player が切り替わっても、キャラの絵は基本の見た目のまま
    const pose = w.ctx.$gamePlayer.characterName();
    w.ctx.$gamePlayer.setImage("$DEV3H_GunAim_f2", 0); frames(w, 2);
    assert.equal(plain(w.stage.getReps()).char.name, leader.characterName(), "ポーズ用の絵(" + "$DEV3H_GunAim_f2" + ")は使わない");
    w.ctx.$gamePlayer.setImage(pose, w.ctx.$gamePlayer.characterIndex());
    // 神 = 既存の選択(永続Ultimateの神 / CardDeckのUltimateの指輪)
    const manager = w.ctx.ProjectRGodSummonManager;
    const expected = manager.hasPersistentUltimateBattleState() ? manager.getPersistentUltimateGodId() : w.deck.getUltimateRingId();
    assert.equal(look.godId, expected, "神 = 既存の選択データ");
    assert.ok(look.god && look.god.name, "神の見た目がある: " + JSON.stringify(look.god));
    const visual = plain(w.ctx.ProjectRGodSummonVisual.getVisuals()).find(v => v.godId === expected && v.kind === "persistent");
    if (visual) { const ev = w.ctx.$gameMap.event(visual.eventId); assert.equal(look.god.name, ev._characterName, "マップの神の表示Eventと同じ画像"); }
    const expectedByGod = { hermes: "!Crystal", apollo: "!Flame" };
    assert.equal(look.god.name, visual ? w.ctx.$gameMap.event(visual.eventId)._characterName : expectedByGod[expected], "既存の資産(!Crystal / !Flame)");
    assert.equal(look.godName, w.ctx.ProjectRBattleHUD.getGodPresentation(expected).name, "名前は既存のHUDの表示名");
    // 選択が変われば(既存の選択データだけを見る)、見た目も変わる。複数の指輪を持っていても、選ばれた1柱だけ
    for (const god of ["apollo", "hermes"]) {
        const saved = manager.hasPersistentUltimateBattleState; manager.hasPersistentUltimateBattleState = () => true;
        const savedId = manager.getPersistentUltimateGodId; manager.getPersistentUltimateGodId = () => god;
        try {
            frames(w, 2);
            const r = plain(w.stage.getReps());
            assert.equal(r.godId, god);
            assert.equal(r.god.name, expectedByGod[god], god + " の既存の資産: " + JSON.stringify(r.god));
        } finally { manager.hasPersistentUltimateBattleState = saved; manager.getPersistentUltimateGodId = savedId; }
    }
    // 選択データが無い・見た目が引けない: 神は出さない(キャラは出す)
    const savedRing = w.deck.getUltimateRingId, savedState = manager.hasPersistentUltimateBattleState;
    w.deck.getUltimateRingId = () => null; manager.hasPersistentUltimateBattleState = () => false;
    try { frames(w, 2); const r = plain(w.stage.getReps()); assert.equal(r.godId, null); assert.equal(r.god, null); assert.ok(r.char); } finally { w.deck.getUltimateRingId = savedRing; manager.hasPersistentUltimateBattleState = savedState; }
    // マップ上の神の表示Event(<projectRGodVisual>)の絵は、戦闘エリアの中に描かない。戻れば元通り
    const godSprite = { _character: { eventId: () => 77, event: () => ({ note: "<projectRGodVisual>" }) }, renderable: true, children: [], x: 0, y: 0, addChild() {}, removeChild() {} };
    w.parts.sp._characterSprites.push(godSprite);
    frames(w, 2);
    assert.equal(godSprite.renderable, false, "神の表示Eventの絵は戦闘エリアの外へ移したので、マップ上では描かない");
    assert.equal(w.parts.other.renderable, true, "他のキャラは描く");
    quietly(() => w.sb.stop()); arrive(w); frames(w, 3);
    assert.equal(godSprite.renderable, true, "戻れば元の表示");
});

test("置き場の絵の大きさ: 解像度が変わっても、置き場の中央に、縦横同じ倍率で収まる(引き伸ばさない・重ならない)。読み込み前は出さない", () => {
    const w = a16(world());
    const o = w.sc()._projectRSoulStageLayers.overlay;
    assert.deepEqual([o._stageChar.visible, o._stageGod.visible], [false, false], "絵が読み込まれるまでは出さない(空の枠を出さない)");
    loadReps(w);
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [816, 624], [1000, 1000], [640, 360]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 3);
        const vp = plain(w.stage.getViewport()), zones = plain(w.stage.getRepZones());
        for (const [name, sprite, z] of [["キャラ", o._stageChar, zones.char], ["神", o._stageGod, zones.god]]) {
            assert.equal(sprite.visible, true, `${gw}x${gh}: ${name}`);
            assert.equal(sprite.scale.x, sprite.scale.y, `${gw}x${gh}: ${name} 引き伸ばさない`);
            assert.ok(Math.abs(sprite.x - (z.x + z.w / 2)) <= 1 && Math.abs(sprite.y - (z.y + z.h / 2)) <= 1, `${gw}x${gh}: ${name} は置き場の中央`);
            const half = { w: 48 * sprite.scale.x / 2, h: 48 * sprite.scale.y / 2 };
            assert.ok(sprite.x - half.w >= z.x - 1 && sprite.x + half.w <= z.x + z.w + 1 && sprite.y - half.h >= z.y - 1 && sprite.y + half.h <= z.y + z.h + 1, `${gw}x${gh}: ${name} は置き場に収まる`);
            assert.ok(sprite.y - half.h >= vp.y + vp.h - 1, `${gw}x${gh}: ${name} は戦闘エリアの外`);
        }
        assert.ok(Math.abs(o._stageChar.x - gw / 2) <= 1, `${gw}x${gh}: 左右中央`);
    }
    quietly(() => w.sb.stop());
});

test("敵の表示(戦闘エリアの上): 既存の素材(img/enemies)を中央に出す。攻撃・防御の両ターンで出し続け、キャラ・神は攻撃ターンだけ。解像度が変わっても置き場に収まり、戦闘エリア・HUDと重ならない。読み込み前は出さない", () => {
    const w = a16(world());
    const o = w.sc()._projectRSoulStageLayers.overlay, look = plain(w.stage.getEnemyLook());
    assert.ok(fs.existsSync(path.join(project, "img", look.folder, look.name + ".png")), "既定の敵の絵は実在する素材: " + look.folder + "/" + look.name);
    assert.deepEqual(plain(w.stage.DEFAULT_ENEMY_LOOK), look, "既定は Stage の DEFAULT_ENEMY_LOOK");
    assert.equal(o._stageEnemy.visible, false, "読み込み前は出さない(空の枠を出さない)");
    loadReps(w); o._stageEnemy._repFrame = { pw: 410, ph: 287 };
    for (const [gw, gh] of [[1920, 1080], [1280, 720], [816, 624], [1000, 1000], [640, 360], [2560, 1440]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 3);
        const vp = plain(w.stage.getViewport()), z = plain(w.stage.getRepZones()).enemy;
        for (const phase of ["attack", "defense"]) {
            while (w.soul.getPhase() !== phase) { w.soul.skipPhase(); frames(w, 3); }
            const reps = plain(w.stage.getReps());
            assert.equal(reps.enemyVisible, true, `${gw}x${gh} ${phase}: 敵は両ターンとも出す`);
            assert.deepEqual([o._stageChar.visible, o._stageGod.visible], phase === "attack" ? [true, true] : [false, false], `${gw}x${gh} ${phase}: キャラ・神は攻撃ターンだけ`);
            assert.equal(o._stageEnemy.scale.x, o._stageEnemy.scale.y, "引き伸ばさない");
            assert.ok(Math.abs(o._stageEnemy.x - gw / 2) <= 1, `${gw}x${gh} ${phase}: 左右中央`);
            assert.ok(Math.abs(o._stageEnemy.y - (z.y + z.h / 2)) <= 1, `${gw}x${gh} ${phase}: 置き場の中央`);
            const half = { w: 410 * o._stageEnemy.scale.x / 2, h: 287 * o._stageEnemy.scale.y / 2 };
            assert.ok(o._stageEnemy.x - half.w >= z.x - 1 && o._stageEnemy.x + half.w <= z.x + z.w + 1 && o._stageEnemy.y - half.h >= z.y - 1 && o._stageEnemy.y + half.h <= z.y + z.h + 1, `${gw}x${gh} ${phase}: 置き場に収まる`);
            assert.ok(o._stageEnemy.y + half.h <= vp.y - 3 + 1e-6, `${gw}x${gh} ${phase}: 戦闘エリア(枠線を含む)の上`);
            assert.ok(o._stageEnemy.y - half.h >= -1e-6, `${gw}x${gh} ${phase}: 画面の上端の内側(ボス名のパネルが無いので、上のパネルの下に下げない)`);
            for (const [pn, r] of Object.entries({ state: { x: 24, y: 14, w: 312, h: 84 }, phase: { x: 348, y: 14, w: 300, h: 46 } })) {
                const x0 = r.x * gw / 1920, x1 = (r.x + r.w) * gw / 1920, y0 = r.y * gh / 1080, y1 = (r.y + r.h) * gh / 1080;
                assert.equal(o._stageEnemy.x - half.w < x1 && o._stageEnemy.x + half.w > x0 && o._stageEnemy.y - half.h < y1 && o._stageEnemy.y + half.h > y0, false, `${gw}x${gh} ${phase}: ボスの絵と ${pn} は重ならない`);
            }
        }
    }
    // 攻撃/防御で戦闘エリアと置き場は変わらない(敵のせいでジャンプしない)
    w.ctx.Graphics._width = 1920; w.ctx.Graphics._height = 1080; frames(w, 3);
    while (w.soul.getPhase() !== "attack") { w.soul.skipPhase(); frames(w, 2); }
    const attackLayout = layoutOf(w); w.soul.skipPhase(); frames(w, 3);
    assert.equal(layoutOf(w), attackLayout, "戦闘エリア・置き場の位置は両フェーズで同一");
    // 差し替え: 不正な指定は既定へ。ステージを出ると既定へ戻る
    assert.deepEqual(plain(w.stage.setEnemyLook({ folder: "sv_enemies", name: "Dragon" })), { folder: "sv_enemies", name: "Dragon" });
    assert.deepEqual(plain(w.stage.setEnemyLook({ folder: "../x", name: "A" })), { folder: "enemies", name: "A" }, "フォルダは2種類だけ");
    assert.deepEqual(plain(w.stage.setEnemyLook(null)), look);
    w.stage.setEnemyLook({ name: "Dragon" });
    quietly(() => w.sb.stop()); arrive(w); frames(w, 3);
    assert.deepEqual(plain(w.stage.getEnemyLook()), look, "戻れば既定へ");
});

// ---------------------------------------------------------------- 仕上げ: ハートの表示(1人1つ)・胸の位置 ----------------------------------------------------------------
const pocSprite = w => w.parts.sp._tilemap.children.find(c => c && c._projectRSoulHeartPoC);
const loadEnemy = w => { const o = w.sc()._projectRSoulStageLayers.overlay; o._stageEnemy._repFrame = { pw: 410, ph: 287 }; return o; };
const visibleHearts = w => { const o = w.sc()._projectRSoulStageLayers.overlay, poc = pocSprite(w); return { poc: !!poc && poc.visible !== false && poc.renderable !== false, player: o._stageHeart.visible, boss: o._stageBossHeart.visible }; };

test("ハートの表示(1人1つ): 攻撃ターン = プレイヤーのハートはキャラの絵の胸(飾り)・敵ハートは戦闘エリアの中の本物の1つだけ。防御ターン = 敵ハートは敵の絵の胸(飾り)・本物の絵は隠れる・プレイヤーのハートはマウスで動く。重複せず、的は増えない", () => {
    const w = a16(world());
    loadReps(w); loadEnemy(w); frames(w, 3);
    const o = w.sc()._projectRSoulStageLayers.overlay, zones = plain(w.stage.getRepZones());
    const events0 = w.ctx.$gameMap.events().filter(e => e && !e._erased).length;
    // 攻撃ターン
    assert.equal(w.soul.getPhase(), "attack");
    let hearts = plain(w.stage.getHearts());
    const chestChar = { x: o._stageChar.x, y: o._stageChar.y + (w.stage.CHEST_N.char.y - 0.5) * 48 * o._stageChar.scale.y };
    assert.equal(hearts.player.mode, "portrait");
    assert.ok(Math.abs(hearts.player.x - chestChar.x) < 1e-6 && Math.abs(hearts.player.y - chestChar.y) < 1e-6, "プレイヤーのハートはキャラの胸: " + JSON.stringify([hearts.player, chestChar]));
    assert.ok(hearts.player.x >= zones.char.x && hearts.player.x <= zones.char.x + zones.char.w && hearts.player.y >= zones.char.y && hearts.player.y <= zones.char.y + zones.char.h, "キャラの置き場の中");
    assert.ok(hearts.player.y > o._stageChar.y && hearts.player.y < o._stageChar.y + 24 * o._stageChar.scale.y, "胸 = 絵の中心より少し下(頭でも足でもない)");
    assert.equal(hearts.boss, null, "攻撃ターンの敵ハートの飾りは無い(本物が戦闘エリアの中にある)");
    assert.deepEqual(visibleHearts(w), { poc: true, player: true, boss: false }, "攻撃ターン: 本物の的 + プレイヤーの飾り");
    assert.equal(Math.round(o._stageHeart.x + hearts.radius), Math.round(hearts.player.x), "描く位置 = 論理位置");
    // 防御ターン
    w.soul.skipPhase(); frames(w, 3);
    hearts = plain(w.stage.getHearts());
    assert.equal(hearts.player.mode, "mouse", "防御ターン: プレイヤーのハートはマウス");
    assert.equal(hearts.boss.mode, "portrait", "防御ターン: 敵ハートは敵の絵の胸");
    const vp = plain(w.stage.getViewport());
    assert.ok(hearts.player.x >= vp.x && hearts.player.x <= vp.x + vp.w && hearts.player.y >= vp.y && hearts.player.y <= vp.y + vp.h, "プレイヤーのハートは戦闘エリアの中");
    assert.ok(hearts.boss.y < vp.y - 3 && hearts.boss.x >= zones.enemy.x && hearts.boss.x <= zones.enemy.x + zones.enemy.w && hearts.boss.y >= zones.enemy.y && hearts.boss.y <= zones.enemy.y + zones.enemy.h, "敵ハートの飾りは戦闘エリアの外(敵の絵の上)");
    assert.ok(Math.abs(hearts.boss.x - o._stageEnemy.x) < 1e-6 && Math.abs(hearts.boss.y - o._stageEnemy.y) < 1e-6, "敵の絵の中心(胸の既定 0.5, 0.5)");
    assert.deepEqual(visibleHearts(w), { poc: false, player: true, boss: true }, "防御ターン: 戦闘エリアの中の本物の絵は隠れ、的が2つ見えない");
    assert.equal(pocSprite(w).renderable, false);
    const heartEvent = w.ctx.$gameMap.event(w.soul.getState().heart.eventId);
    assert.ok(heartEvent && !heartEvent._erased, "敵ハートのEvent(的・HP)は消さない(絵だけ隠す)");
    assert.equal(w.ctx.$gameMap.events().filter(e => e && !e._erased).length, events0, "飾りはEvent・当たり判定を増やさない");
    // 何度切り替えても、元へ戻る・重複しない
    for (let i = 0; i < 4; i++) {
        w.soul.skipPhase(); frames(w, 2);
        const attack = w.soul.getPhase() === "attack";
        assert.deepEqual(visibleHearts(w), attack ? { poc: true, player: true, boss: false } : { poc: false, player: true, boss: true }, `周回${i}: ${w.soul.getPhase()}`);
        assert.equal(pocSprite(w).renderable !== false, attack, `周回${i}: 本物の絵の表示は元へ戻る`);
    }
    // 敵ハートの飾りは敵の絵ごとの胸の位置(chest)で上書きできる
    w.stage.setEnemyLook({ name: "Highking", chest: { x: 0.5, y: 0.25 } }); loadEnemy(w);
    while (w.soul.getPhase() !== "defense") { w.soul.skipPhase(); frames(w, 2); }
    frames(w, 2);
    hearts = plain(w.stage.getHearts());
    assert.ok(Math.abs(hearts.boss.y - (o._stageEnemy.y + (0.25 - 0.5) * 287 * o._stageEnemy.scale.y)) < 1e-6, "chest の指定で胸の位置を変えられる");
    // 解像度が変わっても、それぞれの置き場の中
    for (const [gw, gh] of [[1280, 720], [816, 624], [1920, 1080]]) {
        w.ctx.Graphics._width = gw; w.ctx.Graphics._height = gh; frames(w, 3);
        const z = plain(w.stage.getRepZones()), h = plain(w.stage.getHearts());
        assert.ok(h.boss.x >= z.enemy.x && h.boss.x <= z.enemy.x + z.enemy.w && h.boss.y >= z.enemy.y && h.boss.y <= z.enemy.y + z.enemy.h, `${gw}x${gh}: 敵ハートは敵の置き場の中`);
        assert.equal(Math.round(o._stageBossHeart.x + h.radius), Math.round(h.boss.x), `${gw}x${gh}: 描く位置 = 論理位置`);
    }
    // 片づけ: 本物の絵の表示は元の値へ(隠す記録は残らない)
    quietly(() => w.sb.stop());
    arrive(w); frames(w, 4);                                                    // 元のマップへ戻る
    assert.deepEqual([stageState(w).state, stageState(w).hiddenPlayerSprites, stageState(w).layers], ["idle", 0, false], "隠した記録・描画層は残らない");
});

test("ハートの飾りは絵が読み込まれるまで出さない・ステージ以外では何もしない: 読み込み前は(キャラ・敵とも)胸が無いので飾りは出ず、防御ターンでも本物の絵は隠さない。通常のマップでは何も作らない", () => {
    const w = a16(world());
    // ハーネスでは画像が読み込まれない(_repFrame が無い)状態 = 読み込み前
    const o = w.sc()._projectRSoulStageLayers.overlay;
    assert.deepEqual(plain(w.stage.getHearts()), { player: null, boss: null, radius: plain(w.stage.getHearts()).radius }, "攻撃ターン・読み込み前: 飾りは出ない");
    w.soul.skipPhase(); frames(w, 3);
    const hearts = plain(w.stage.getHearts());
    assert.equal(hearts.boss, null, "読み込み前は敵ハートの飾りを出さない");
    assert.notEqual(pocSprite(w).renderable, false, "飾りが無いのに本物の絵を隠さない(ハートが消えない)");
    assert.equal(o._stageBossHeart.visible, false);
    quietly(() => w.sb.stop());
    // ステージの外(通常のマップ): 何も出さない
    const n = world();
    n.frames(3);
    assert.deepEqual(plain(n.stage.getHearts()), { player: null, boss: null, radius: 0 });
    assert.equal(n.sc()._projectRSoulStageLayers, undefined, "通常のマップには描画層を作らない");
});

test("防御ターンの入力遮断は維持される: カードは受け付けず、手札・Cooldownは動かない(I2)", () => {
    const w = a16(world());
    w.soul.skipPhase(); frames(w, 4);
    const hand = handIds(w), pile = plain(w.deck.getBattleState()).cooldownPile.length;
    for (let i = 0; i < 5; i++) assert.equal(plain(w.deck.requestUseCard(i)).reason, "soulDefense");
    assert.deepEqual([handIds(w), plain(w.deck.getBattleState()).cooldownPile.length], [hand, pile]);
    assert.equal(w.ctx.ProjectRCardBattleInput.getBlockedReason({ code: "KeyU" }), "soulDefense");
    quietly(() => w.sb.stop());
});

// ---------------------------------------------------------------- 後片づけ(勝利・停止・外部終了・失敗・再開) ----------------------------------------------------------------
test("勝利: ハートのHPが0で victory → 元のマップ・座標へ戻る予約が1回だけ入り、到着で全て元通り(デッキ・指輪・所持・プレイヤー表示・セーブ許可・操作)", () => {
    const w = world();
    const before = snapshot(w), save = w.ctx.$gameSystem.isSaveEnabled();
    a16(w);
    const trips = w.transfers.length;
    hurt(w, w.heart, 1500); frames(w, 8);
    assert.deepEqual(w.ends, ["victory"], "SOULは1回だけ終わる");
    assert.equal(w.transfers.length, trips + 1, "戻りの予約は1回だけ");
    assert.deepEqual(w.transfers.slice(-1)[0], [1, 12, 20, 2]);
    assert.equal(stageState(w).state, "leaving");
    assert.equal(w.parts.player.renderable, false, "戻る(暗転)までの間もプレイヤーは描かない");
    frames(w, 20);
    assert.equal(w.transfers.length, trips + 1, "待っている間に増えない");
    arrive(w); frames(w, 4);
    assert.equal(snapshot(w), before, "全て元通り");
    assert.deepEqual([stageState(w).state, w.ctx.$gameMap.mapId(), w.parts.player.renderable, w.ctx.$gameSystem.isSaveEnabled(), stageState(w).mapped], ["idle", 1, true, save, false]);
    assert.equal(w.ctx.$gamePlayer.x, 12);
    quietly(() => w.sb.stop());                                                    // 後からのstop()も安全(何も起きない)
    assert.equal(w.transfers.length, trips + 1);
});

test("stop(): 途中の中止でも元のマップへ戻る(予約1回)。二重のstop()は安全。F8の status() に専用ステージの状態が出る", () => {
    const w = world();
    const before = snapshot(w);
    a16(w, { weapon: "sword" });
    const status = quietly(() => plain(w.sb.status()));
    assert.equal(status.stage.state, "active");
    assert.equal(status.stage.viewport.w * 9, status.stage.viewport.h * 16);
    assert.deepEqual(status.stage.returnPoint && [status.stage.returnPoint.mapId, status.stage.returnPoint.x, status.stage.returnPoint.y], [1, 12, 20]);
    const trips = w.transfers.length;
    const r = quietly(() => plain(w.sb.stop()));
    assert.equal(r.ok, true);
    assert.equal(w.transfers.length, trips + 1, "戻りの予約は1回だけ");
    assert.ok(r.steps.some(s => s.includes("ステージから元のマップへ戻る")));
    assert.equal(quietly(() => plain(w.sb.stop())).ok, true);
    assert.equal(w.transfers.length, trips + 1, "二度目は何もしない");
    arrive(w); frames(w, 4);
    assert.equal(snapshot(w), before);
    assert.deepEqual([stageState(w).state, w.ctx.$gameMap.mapId()], ["idle", 1]);
});

test("外部終了: カード戦闘の終了・戦闘セッションの一括終了・プレイヤー死亡のどれでも、SOULが1回だけ終わり、元のマップへ戻る予約が1回だけ入り、全て元通り", () => {
    const cases = {
        cardBattleEnded: w => { w.deck.endCardBattle(); frames(w, 4); },
        combatEnded: w => { w.ctx.ProjectRCombatSession.endAll("external"); frames(w, 4); },
        playerDead: w => { const l = w.ctx.$gameParty.leader(); l._hp = 0; try { frames(w, 3); } finally { l._hp = Math.max(1, l.mhp); } }
    };
    for (const [reason, trigger] of Object.entries(cases)) {
        const w = world();
        const before = snapshot(w);
        a16(w);
        const trips = w.transfers.length;
        trigger(w);
        assert.equal(w.ends.length, 1, reason + ": SOULは1回だけ " + JSON.stringify(w.ends));
        assert.equal(w.ends[0], reason);
        assert.equal(w.transfers.length, trips + 1, reason + ": 戻りの予約は1回だけ");
        assert.equal(stageState(w).state, "leaving");
        arrive(w); frames(w, 4);
        assert.equal(snapshot(w), before, reason + ": 全て元通り");
        assert.deepEqual([stageState(w).state, w.ctx.$gameMap.mapId(), w.parts.player.renderable], ["idle", 1, true], reason);
    }
});

test("失敗: 準備の途中で失敗しても、元のマップへ戻る予約が入り、一時データは全て戻る(ボスの開始失敗・例外)。失敗の後でもまた開始できる", () => {
    for (const mode of ["bossStart", "throw"]) {
        const w = world();
        const before = snapshot(w);
        const r = quietly(() => plain(w.sb.start("a16", { openingHand: HAND })));
        assert.equal(r.ok, true);
        arrive(w);
        const originalStart = w.bf.start, originalRegister = w.bf.registerBoss;
        if (mode === "bossStart") w.bf.start = () => ({ ok: false, reason: "stub" }); else w.bf.registerBoss = () => { throw new Error("boom"); };
        const trips = w.transfers.length;
        try { frames(w, 8); } finally { w.bf.start = originalStart; w.bf.registerBoss = originalRegister; }
        assert.equal(w.soul.isActive(), false, mode + ": SOULは始まっていない/終わっている");
        assert.equal(w.transfers.length, trips + 1, mode + ": 元のマップへ戻る予約が1回");
        assert.equal(stageState(w).state, "leaving");
        arrive(w); frames(w, 4);
        assert.equal(snapshot(w), before, mode + ": 全て元通り");
        assert.deepEqual([stageState(w).state, w.ctx.$gameMap.mapId(), w.parts.player.renderable], ["idle", 1, true], mode);
    }
    // 不正な指定は、移動する前に断る(何も変えない)
    const w = world();
    const before = snapshot(w);
    for (const bad of [{ level: 9 }, { deck: "x" }, { openingHand: "x" }, { weapon: "bogus" }, { stage: "yes" }]) {
        const r = quietly(() => plain(w.sb.start("a16", bad)));
        assert.equal(r.ok, false, JSON.stringify(bad));
    }
    assert.deepEqual([w.transfers.length, stageState(w).state, snapshot(w)], [0, "idle", before]);
});

test("再開・競合: 動作中のステージで start('a16') し直しても移動せず(ステージに残る)、セッションは重複しない。普通のシナリオはステージ中は断る。stage:false なら従来のアリーナ", () => {
    const w = world();
    a16(w);
    const trips = w.transfers.length;
    const again = quietly(() => plain(w.sb.start("a16", { openingHand: HAND, level: 2 })));
    assert.deepEqual([again.ok, again.pending, again.restart], [true, true, true], JSON.stringify(again));
    assert.equal(w.soul.isActive(), false, "やり直しの間に前の戦闘は片づく");
    frames(w, 60);
    assert.equal(w.soul.isActive(), true, "待った後に再び始まる");
    assert.equal(w.transfers.length, trips, "再開では移動しない");
    assert.equal(stageState(w).state, "active");
    assert.equal(w.ctx.$gameMap.mapId(), STAGE_ID);
    assert.deepEqual(plain(w.ctx.ProjectRCombatSession.sources()).sort(), ["boss:dev_boss_soul", "soul_battle"], "セッションは重複しない");
    const plainStart = quietly(() => plain(w.sb.start("dodge")));
    assert.deepEqual([plainStart.ok, plainStart.reason], [false, "stageActive"]);
    assert.equal(stageState(w).state, "active");
    quietly(() => w.sb.stop()); arrive(w); frames(w, 3);
    // 従来のアリーナ(DEV)
    const w2 = world({ origin: { map: 4, x: 25, y: 26 } });
    const r = quietly(() => plain(w2.sb.start("a16", { stage: false, openingHand: HAND })));
    assert.equal(r.ok, true, JSON.stringify(r));
    frames(w2, 4);
    assert.equal(stageState(w2).state, "idle"); assert.equal(w2.hud.isActive(), true);
    quietly(() => w2.sb.stop());
});

// ---------------------------------------------------------------- 通常の探索・非SOUL戦闘は変わらない ----------------------------------------------------------------
test("通常の探索・非SOUL戦闘: ステージが idle の間は、マウス座標・カメラ・セーブ許可・拡大縮小・プレイヤー表示に何も影響しない(アリーナのカード戦闘も同じ)", () => {
    const w = world({ origin: { map: 4, x: 25, y: 26 } });
    const G = w.ctx.Graphics;
    G._canvas = { offsetLeft: 0, offsetTop: 0 }; G._realScale = 1;
    const raw = [G.pageToCanvasX(777), G.pageToCanvasY(333)];
    assert.deepEqual(raw, [777, 333]);
    w.mouse(100, 200);
    frames(w, 10);
    assert.deepEqual([w.ctx.TouchInput._x, w.ctx.TouchInput._y], [100, 200]);
    assert.equal(w.parts.sp.scale.x, 1); assert.equal(w.parts.sp.x, 0);
    assert.equal(w.parts.player.renderable, true);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true);
    const c0 = [w.ctx.$gameMap._displayX, w.ctx.$gameMap._displayY];
    w.ctx.$gameMap.setDisplayPos(3, 4);
    assert.notDeepEqual([w.ctx.$gameMap._displayX, w.ctx.$gameMap._displayY], [0, 0], "通常のマップのカメラは従来どおり動かせる");
    w.ctx.$gameMap.setDisplayPos(...c0);
    assert.equal(plain(w.ctx.ProjectRCombatTestArena.startScenario("apollo")).ok, true);
    frames(w, 30);
    assert.deepEqual([w.stage.isPresenting(), stageState(w).state, !!w.sc()._projectRSoulStageLayers, w.hud.isActive()], [false, "idle", false, false]);
    assert.equal(w.ctx.$gameSystem.isSaveEnabled(), true, "SOUL以外の戦闘ではセーブ許可を変えない");
    assert.equal(w.parts.player.renderable, true);
});

console.log(`\n${passed} tests passed`);
