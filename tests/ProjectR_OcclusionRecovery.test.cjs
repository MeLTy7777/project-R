"use strict";
// 視界(遮蔽)システム復元: ProjectR_CombatOcclusion + ProjectR_VisionOcclusion を Rebuild へ戻した確認。
//   元の挙動の細かい検証は tests/ProjectR_VisionOcclusion.test.cjs(旧プロジェクトから復元した82件)が担当し、
//   ここでは「Rebuildの中で正しく読み込まれ、登録順が正しく、カード/戦闘の状態に触れない」ことを確認する。
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const COMBAT = "js/plugins/ProjectR_CombatOcclusion.js";
const VISION = "js/plugins/ProjectR_VisionOcclusion.js";

// 旧テストのMZ代役(harness)をそのまま再利用する(最初の test( より前の部分だけを評価する)。
const original = read("tests/ProjectR_VisionOcclusion.test.cjs");
const prefix = original.slice(0, original.indexOf("\ntest("));
const harness = new Function("require", "__dirname", `${prefix}\nreturn harness;`)(require, path.join(root, "tests"));
const plain = value => JSON.parse(JSON.stringify(value));

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`ok - ${name}`); }
    catch (error) { console.error(`not ok - ${name}\n${error.stack}`); process.exitCode = 1; }
}
const gitShow = spec => {
    const r = cp.spawnSync("git", ["show", spec], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 ? r.stdout : null;
};
const lf = text => text.replace(/\r\n/g, "\n");

// ---- 読み込みと依存 ----
test("2つのプラグインが初期化エラーなく読み込め、APIとコマンドが揃う", () => {
    const h = harness();
    assert.equal(h.api.version, "1.0.3");
    assert.equal(typeof h.combat.raycastVisionGeometry, "function");
    assert.deepEqual([...h.commands.keys()].sort(),
        ["DebugOff", "DebugOn", "Disable", "Enable", "SetAngle", "SetOpacity", "SetRange"]);
});

test("依存検出: CombatOcclusionが無い/リージョンIDが違う/250を使うと起動時に止まる", () => {
    const run = (params, withCombat = true) => {
        const context = { console, PIXI: { Container: class {}, Sprite: class {}, Graphics: class {}, Point: class {} }, Tilemap: class {}, Game_Map: class { setup() {} }, Spriteset_Map: class {},
            Graphics: { width: 480, height: 384 }, DataManager: { extractSaveContents() {} },
            PluginManager: { parameters: n => n === "ProjectR_VisionOcclusion" ? params : { VisionWallRegionId: "255" }, registerCommand() {} } };
        context.window = context; vm.createContext(context);
        if (withCombat) vm.runInContext(read(COMBAT), context, { filename: "CombatOcclusion" });
        vm.runInContext(read(VISION), context, { filename: "VisionOcclusion" });
        return context;
    };
    assert.ok(run({}));
    assert.throws(() => run({}, false), /ProjectR_CombatOcclusion/);
    assert.throws(() => run({ VisionWallRegionId: "200" }), /一致/);
    assert.throws(() => run({ StructureRegionId: "250" }), /250/);
});

// ---- 有効/無効 ----
test("既定は有効。Disable/Enableコマンドで切り替わり、$gameSystemに保存され、旧セーブは既定へ戻る", () => {
    const h = harness();
    assert.equal(h.api.settings().enabled, true);
    const o = h.owner(); o.update();
    assert.equal(o._projectRVisionLayer.visible, true);
    h.commands.get("Disable")(); o.update();
    assert.equal(o._projectRVisionLayer.visible, false, "無効なら暗闇層を描かない");
    assert.equal(h.context.$gameSystem._projectRVisionOcclusion.enabled, false, "セーブに残る設定");
    h.commands.get("Enable")(); o.update();
    assert.equal(o._projectRVisionLayer.visible, true);
    h.commands.get("SetOpacity")({ Value: "0.5" }); o.update();
    assert.equal(o._projectRVisionLayer.dark.alpha, 0.5);
    h.context.$gameSystem = {}; // 旧セーブ(設定なし)
    assert.deepEqual(plain(h.api.settings()), { enabled: true, angle: 360, range: 0, opacity: 1, debug: false });
});

test("Plugin ParameterのEnabled=falseなら初期値が無効(配布側でOFFにできる)", () => {
    const h = harness({ params: { Enabled: "false" } });
    assert.equal(h.api.settings().enabled, false);
    const o = h.owner(); o.update();
    assert.equal(o._projectRVisionLayer.visible, false);
});

// ---- 対象が遮蔽される/されない ----
test("壁(Region255)の向こうは視界外、壁が無ければ画面全体が視界(暗闇は何も隠さない)", () => {
    const h = harness();
    const open = h.build().points;
    for (const p of [{ x: .2, y: .2 }, { x: 9.8, y: 7.8 }, { x: 8, y: 3.5 }]) assert.ok(h.api.inside(p, open), "壁なし: 見える");
    for (let y = 0; y < 8; y++) h.region(4, y, 255);
    const walled = h.build().points;
    assert.ok(h.api.inside({ x: 3.5, y: 3.5 }, walled), "壁の手前は見える");
    assert.equal(h.api.inside({ x: 8, y: 3.5 }, walled), false, "壁の向こうは見えない");
});

test("遮蔽に該当しないもの: 通常の通行不能・CombatWallだけ・Region254は視界を遮らない", () => {
    const h = harness({ passable: false });
    h.event(1, 4, 3, "<CombatWall>"); h.region(6, 3, 254);
    assert.ok(h.api.inside({ x: 8, y: 3.5 }, h.build().points));
    assert.equal(h.build().geometry.segments.length, 0);
});

// ---- 暗闇(フェード)の適用と復元 ----
test("暗闇は壁の向こうだけに適用され、壁が無くなると元に戻る(復元)", () => {
    const h = harness(); h.context.$gamePlayer._realX = 1; h.context.$gamePlayer._realY = 3;
    const o = h.owner();
    const holeCount = layer => layer.dark.ops.filter(op => op[0] === "beginHole").length;
    o.update();
    const layer = o._projectRVisionLayer;
    const openPolygon = layer.dark.ops.find(op => op[0] === "drawPolygon");
    assert.ok(openPolygon, "視界の穴が描かれる");
    for (let y = 0; y < 8; y++) h.region(4, y, 255);
    o.update();
    const walledPolygon = layer.dark.ops.filter(op => op[0] === "drawPolygon").pop();
    assert.ok(walledPolygon[1].length < openPolygon[1].length || JSON.stringify(walledPolygon) !== JSON.stringify(openPolygon),
        "壁があると穴(視界)の形が変わる");
    assert.equal(holeCount(layer), 1);
    // 壁を消す = 遮蔽が終わる
    for (let y = 0; y < 8; y++) h.region(4, y, 0);
    o.update();
    const restored = layer.dark.ops.filter(op => op[0] === "drawPolygon").pop();
    assert.equal(JSON.stringify(restored), JSON.stringify(openPolygon), "遮蔽が終わると元の視界に戻る");
});

test("VisionKeepVisibleのイベントは壁で遮られていなければ暗闇の上に複製され、遮られると消える", () => {
    const h = harness(); h.context.$gamePlayer._realX = 1; h.context.$gamePlayer._realY = 3;
    const e = h.event(1, 6, 3, "<VisionKeepVisible>");
    const o = h.owner(); const source = h.character(o, e);
    o.update();
    const layer = o._projectRVisionLayer;
    assert.equal(layer.copies.size, 1, "遮られていないので保持される");
    assert.equal(layer.copies.get(source).visible, source.visible);
    for (let y = 0; y < 8; y++) h.region(4, y, 255);
    o.update();
    assert.equal(layer.copies.size, 0, "壁に遮られたので複製は破棄される");
    assert.equal(source.destroyed, undefined, "元のSpriteは壊さない");
});

// ---- Map移動/リセット ----
test("Map移動(Game_Map.setup)とロード(extractSaveContents)でキャッシュが破棄され、新旧のレイヤーが混ざらない", () => {
    const h = harness();
    for (let y = 0; y < 8; y++) h.region(4, y, 255);
    const first = h.api.cache(); assert.equal(h.api.cache(), first, "同じMapなら同じキャッシュ");
    h.map.setup(); const second = h.api.cache();
    assert.notEqual(second, first, "Map setupで作り直す");
    h.context.DataManager.extractSaveContents({ system: { _projectRVisionOcclusion: { enabled: false } } });
    const third = h.api.cache(); assert.notEqual(third, second, "ロードでも作り直す");
    assert.equal(h.api.settings().enabled, false, "ロードした設定が使われる");
});

test("レイヤー破棄: 複製Spriteを片付け、借りたテクスチャは壊さない(Map→メニュー→Mapの遷移)", () => {
    const h = harness(); h.context.$gamePlayer._realX = 1; h.context.$gamePlayer._realY = 3;
    const e = h.event(1, 6, 3, "<VisionKeepVisible>");
    const o = h.owner(); h.character(o, e); o.update();
    const layer = o._projectRVisionLayer;
    assert.equal(layer.copies.size, 1);
    layer.destroy({});
    assert.equal(layer.copies.size, 0);
    assert.equal(layer.owner, null);
    assert.equal(layer.destroyOptions.texture, false);
    assert.equal(layer.destroyOptions.baseTexture, false);
    const o2 = h.owner(); o2.update();
    assert.notEqual(o2._projectRVisionLayer, layer, "新しいSpritesetは新しいレイヤーを作る");
});

// ---- 繰り返し更新 ----
test("同じ状態で何十回updateしても、不透明度・子要素・複製数・描画が壊れない", () => {
    const h = harness(); h.context.$gamePlayer._realX = 1; h.context.$gamePlayer._realY = 3;
    for (let y = 0; y < 8; y++) h.region(4, y, 255);
    const e = h.event(1, 2, 3, "<VisionKeepVisible>");
    const o = h.owner(); const source = h.character(o, e);
    o.update();
    const layer = o._projectRVisionLayer;
    const snapshot = () => JSON.stringify({ alpha: layer.dark.alpha, children: layer.children.length,
        copies: layer.copies.size, tiles: layer.tiles.children.length, ops: layer.dark.ops, srcAlpha: source.alpha });
    const before = snapshot();
    for (let i = 0; i < 60; i++) o.update();
    assert.equal(snapshot(), before);
    // 設定を何度も往復しても元のSprite/不透明度に影響しない
    for (let i = 0; i < 10; i++) { h.commands.get("Disable")(); o.update(); h.commands.get("Enable")(); o.update(); }
    assert.equal(snapshot(), before);
    assert.equal(source.alpha, 1, "元のキャラSpriteの不透明度は変更されない");
});

// ---- 他システムに触れない ----
test("戦闘/カード/Ultimate/HUD/神召喚の状態にも名前にも触れない", () => {
    const h = harness();
    h.context.ProjectRCardDeck = Object.freeze({ getBattleState: () => ({ hand: [1, 2, 3] }) });
    h.context.ProjectRCombatPresence = Object.freeze({ isCombatEventActive: () => true });
    h.context.$gameSystem.cardBattle = { hand: ["a"], gauge: 7 };
    const before = JSON.stringify(h.context.$gameSystem.cardBattle);
    const o = h.owner(); for (let i = 0; i < 5; i++) o.update();
    h.commands.get("Disable")(); h.commands.get("Enable")(); h.commands.get("SetRange")({ Value: "6" });
    assert.equal(JSON.stringify(h.context.$gameSystem.cardBattle), before);
    assert.deepEqual(Object.keys(h.context.$gameSystem).sort(), ["_projectRVisionOcclusion", "cardBattle"]);
    for (const file of [COMBAT, VISION])
        assert.doesNotMatch(read(file), /ProjectR(Card|CombatPresence|BattleHUD|GodSummon|Ultimate|Hermes|Apollo|CombatTestArena|PlayerFacing)|CardDeck|DivineHp/,
            `${file}は他システムを参照しない`);
});

test("フックはGame_Map.setup / DataManager.extractSaveContents / Spriteset_Map の3種類だけ(戦闘API・入力・Sceneを横取りしない)", () => {
    const source = read(VISION) + read(COMBAT);
    const hooked = [...source.matchAll(/\b((?:Game_|Scene_|Sprite_|Spriteset_|Window_)[A-Za-z]+|DataManager|Input|TouchInput|SceneManager)\.(?:prototype\.)?([A-Za-z_]+)\s*=(?!=)/g)]
        .map(m => `${m[1]}.${m[2]}`).sort();
    assert.deepEqual(hooked, ["DataManager.extractSaveContents", "Game_Map.setup", "Spriteset_Map.createLowerLayer", "Spriteset_Map.update"]);
});

// ---- 登録・読み込み順(実ファイル) ----
test("js/plugins.js: 依存(DotMove/Hendrix)の後、MenuHUDの直後、カード基盤より前に1回だけ有効で登録", () => {
    const c = {}; vm.runInNewContext(read("js/plugins.js"), c);
    const names = c.$plugins.map(p => p.name);
    const at = name => names.indexOf(name);
    assert.equal(names.filter(n => n === "ProjectR_CombatOcclusion").length, 1);
    assert.equal(names.filter(n => n === "ProjectR_VisionOcclusion").length, 1);
    assert.equal(at("ProjectR_VisionOcclusion"), at("ProjectR_CombatOcclusion") + 1, "Visionは必ずCombatOcclusionの直後");
    assert.equal(at("ProjectR_CombatOcclusion"), at("ProjectR_MenuHUD") + 1);
    assert.ok(at("ProjectR_CombatOcclusion") > Math.max(at("DotMoveSystem"), at("Hendrix_Action_Engine")));
    assert.ok(at("ProjectR_VisionOcclusion") < at("ProjectR_CardDeckCore"));
    const [combat, vision] = [at("ProjectR_CombatOcclusion"), at("ProjectR_VisionOcclusion")].map(i => c.$plugins[i]);
    assert.equal(combat.status, true); assert.equal(vision.status, true);
    assert.deepEqual(plain(combat.parameters), { VisionWallRegionId: "255" });
    assert.deepEqual(plain(vision.parameters), { Enabled: "true", VisionAngle: "360", VisionRangeTiles: "0", DarknessOpacity: "1.0",
        VisionWallRegionId: "255", StructureRegionId: "254", Debug: "false" });
    assert.ok(fs.existsSync(path.join(root, COMBAT)) && fs.existsSync(path.join(root, VISION)), "登録名とファイル名が一致");
    // Hendrix: 250(許可リージョン)と衝突しない。視界壁/建物表示のリージョンは別の値。
    const hendrix = c.$plugins[at("Hendrix_Action_Engine")].parameters;
    assert.equal(hendrix["Allow Region ID"], "250");
    assert.notEqual(vision.parameters.VisionWallRegionId, hendrix["Allow Region ID"]);
});

test("同梱の登録行は旧プロジェクトのコミットc50d28bと同じ(説明・パラメータを書き換えていない)", () => {
    const old = gitShow("c50d28b:js/plugins.js");
    if (!old) { console.log("  (旧コミットが無いのでスキップ)"); return; }
    const pick = text => { const c = {}; vm.runInNewContext(text, c);
        return c.$plugins.filter(p => /Occlusion$/.test(p.name)).map(p => JSON.stringify(p)); };
    assert.deepEqual(plain(pick(read("js/plugins.js"))), plain(pick(old)));
});

// ---- 出所と無改変 ----
test("復元したプラグインは旧コミットの内容と同一(CombatOcclusion=2b4d4b1 / Vision=c50d28b)", () => {
    const pairs = [[COMBAT, "2b4d4b1:" + COMBAT], [VISION, "c50d28b:" + VISION]];
    for (const [file, spec] of pairs) {
        const old = gitShow(spec);
        if (!old) { console.log(`  (${spec}が無いのでスキップ)`); continue; }
        assert.equal(lf(read(file)), lf(old), `${file}は旧プロジェクトから無改変で復元`);
    }
});

test("復元作業は戦闘/カード/HUD/Ultimate/Hendrix/DotMoveのコードを変えていない(基準=e1bf4ca)", () => {
    const base = cp.spawnSync("git", ["rev-parse", "--verify", "-q", "e1bf4ca"], { cwd: root });
    if (base.status !== 0) { console.log("  (基準コミットが無いのでスキップ)"); return; }
    const protectedFiles = fs.readdirSync(path.join(root, "js/plugins"))
        .filter(f => /^(ProjectR_(?!.*Occlusion)|Hendrix_|DotMoveSystem)/.test(f))
        .filter(f => cp.spawnSync("git", ["cat-file", "-e", `e1bf4ca:js/plugins/${f}`], { cwd: root }).status === 0)
        .filter(f => !/Casino|TexasHoldem/.test(f)).map(f => `js/plugins/${f}`);
    assert.ok(protectedFiles.length > 20);
    const r = cp.spawnSync("git", ["diff", "--quiet", "e1bf4ca", "--", ...protectedFiles, "js/rmmz_core.js", "js/rmmz_objects.js",
        "js/rmmz_scenes.js", "js/rmmz_sprites.js", "js/rmmz_managers.js", "js/rmmz_windows.js"], { cwd: root });
    assert.equal(r.status, 0);
});

test("既存マップに視界壁(255)/建物(254)が無ければ何も暗くならない=データ未変更でも既存の見た目を変えない", () => {
    // 実マップは利用者が編集中(Map001は未コミット変更あり)のため値は固定せず、プラグインの性質だけを確認する。
    const h = harness();
    const o = h.owner(); o.update();
    const polygon = o._projectRVisionLayer.dark.ops.find(op => op[0] === "drawPolygon");
    assert.ok(polygon && polygon[1].length >= 6, "壁がなければ視界ポリゴンが画面全体を覆う");
});

console.log(`\n${passed} tests passed${process.exitCode ? " (with failures)" : ""}`);
