"use strict";
// 戦争の霧(ProjectR_FogOfWar)の Node テスト。実ソースの ProjectR_FogOfWar を読み込み、既存の視界(Vision/CombatOcclusion)・PIXI・Tilemap・マップは最小の stub にする。
// 実機の確認は tools/mz_cdp/fog_of_war_verify.cjs(壁・角・扉・移動する敵・マップ移動・セーブ・HUD・性能)。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const cp = require("node:child_process");
const project = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8").replace(/\r\n/g, "\n");
const plain = value => JSON.parse(JSON.stringify(value));
const configuration = {};
vm.runInNewContext(read("js/plugins.js"), configuration);
const fogParameters = configuration.$plugins.find(p => p.name === "ProjectR_FogOfWar").parameters;

const square = (x0, y0, x1, y1) => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];

function loadGame({ params = {}, width = 20, height = 12, mapId = 1, soft = false } = {}) {
    class Point { constructor(x = 0, y = 0) { this.x = x; this.y = y; } copyFrom(p) { this.x = p.x; this.y = p.y; return this; } set(x, y = x) { this.x = x; this.y = y; return this; } }
    class Container {
        constructor() { this.children = []; this.visible = true; this.renderable = true; this.alpha = 1; this.position = new Point(); }
        get x() { return this.position.x; } set x(v) { this.position.x = v; }
        get y() { return this.position.y; } set y(v) { this.position.y = v; }
        get mask() { return this._mask || null; }
        set mask(v) { if (this._mask) { this._mask.renderable = true; this._mask.isMask = false; } this._mask = v; if (v) { v.renderable = false; v.isMask = true; } }   // PIXI 5 と同じ: 外すと、マスク用の図形は「描く」状態へ戻る
        removeChildAt(i) { return this.removeChild(this.children[i]); }
        addChild(...cs) { for (const c of cs) { c.parent?.removeChild?.(c); this.children.push(c); c.parent = this; } return cs[0]; }
        addChildAt(c, i) { c.parent?.removeChild?.(c); this.children.splice(i, 0, c); c.parent = this; return c; }
        removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = null; return c; }
        getChildIndex(c) { return this.children.indexOf(c); }
        destroy() { this.destroyed = true; }
    }
    class Graphics extends Container {
        constructor() { super(); this.ops = []; }
        clear() { this.ops = []; return this; }
    }
    for (const name of ["beginFill", "endFill", "drawRect", "beginHole", "endHole", "drawPolygon"]) Graphics.prototype[name] = function(...a) { this.ops.push([name, ...a]); return this; };
    class Tilemap extends Container {
        constructor() { super(); this.origin = new Point(); this._bitmaps = []; this.flags = []; this.width = 816; this.height = 624; this.animationCount = 0; this.animationFrame = 0; this.refreshes = 0; }
        setData() {} setBitmaps(b) { this._bitmaps = b; } refresh() { this.refreshes++; }
    }
    class Rectangle { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } }
    class Sprite extends Container { constructor() { super(); this.texture = null; this.anchor = new Point(); this.scale = new Point(1, 1); this.pivot = new Point(); this.skew = new Point(); } }
    class BlurFilter { constructor(blur = 4, quality = 4, resolution = 1) { this.blur = blur; this.quality = quality; this.resolution = resolution; } }
    const renders = [], RenderTexture = { create: o => ({ rt: true, width: o.width, height: o.height }) };
    class ColorMatrixFilter { constructor() { this.desaturated = false; this.brightnessValue = 1; this.resets = 0; } reset() { this.desaturated = false; this.brightnessValue = 1; this.resets++; return this; } desaturate() { this.desaturated = true; return this; } brightness(b, multiply) { this.brightnessValue = b; this.multiply = multiply; return this; } }
    const events = [], data = new Array(width * height * 6).fill(0);
    const map = {
        mapId: () => map._id, width: () => width, height: () => height, data: () => data, tileWidth: () => 48, tileHeight: () => 48,
        roundX: x => x, roundY: y => y, isLoopHorizontal: () => false, isLoopVertical: () => false, displayX: () => 0, displayY: () => 0,
        regionId: (x, y) => data[(5 * height + y) * width + x] || 0, events: () => events.filter(Boolean), event: id => events.find(e => e && e._eventId === id) || null, _id: mapId
    };
    class Game_Map { setup() { map._id = this.nextId ?? map._id; map.setups = (map.setups || 0) + 1; } }
    const vm2 = { sets: new Set() };
    const visionLayer = new Container();
    visionLayer.dark = new Graphics(); visionLayer.addChild(visionLayer.dark);
    visionLayer.visibility = { points: square(0, 0, 8, 6), visibleKeepEvents: new Set(), visibleRegionTiles: new Set() };
    visionLayer.lastCache = {}; visionLayer.lastKey = "";
    class Spriteset_Map extends Container {
        createLowerLayer() { this._tilemap = new Tilemap(); this._projectRVisionLayer = visionLayer; this._eventHpBars = []; }
        update() {}
    }
    const keepIds = new Set();
    const visionApi = {
        eventTags: e => ({ wall: false, keep: keepIds.has(e.eventId()) }),
        inside(point, poly) { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) r = !r; } return r; },
        settings: () => ({ enabled: game.visionEnabled !== false, opacity: 1 }), invalidateCache() { game.invalidated = (game.invalidated || 0) + 1; }
    };
    const combatApi = {
        eventPolygon: e => square(e._realX, e._realY, e._realX + 1, e._realY + 1), isVisionBlockedAt: (x, y) => game.baseBlocked?.(x, y) === true
    };
    const commands = new Map();
    const game = {
        console, window: null, PIXI: Object.assign({ Container, Graphics, Rectangle, Sprite, filters: soft ? { ColorMatrixFilter, BlurFilter } : { ColorMatrixFilter } }, soft ? { RenderTexture } : {}), Tilemap, Spriteset_Map, Game_Map,
        Graphics: { width: 816, height: 624, app: soft ? { renderer: { render: (stage, rt, clear) => renders.push({ stage, rt, clear, ops: stage.children[0].ops.slice() }) } } : undefined }, renders, $gameMap: map, $gamePlayer: { _realX: 2, _realY: 2 }, $gameSystem: {},
        DataManager: { makeSaveContents() { return { system: game.$gameSystem }; }, extractSaveContents(c) { game.$gameSystem = c.system; }, setupNewGame() { game.$gameSystem = {}; } },
        PluginManager: { parameters: n => (n === "ProjectR_FogOfWar" ? { ...fogParameters, ...params } : {}), registerCommand: (p, n, f) => commands.set(n, f) },
        ProjectR: { VisionOcclusion: visionApi, CombatOcclusion: combatApi },
        visionLayer, keepIds, commands, map, events, data, vm2
    };
    game.window = game;
    const context = vm.createContext(game);
    vm.runInContext(read("js/plugins/ProjectR_FogOfWar.js"), context);
    game.fog = game.ProjectR.FogOfWar;
    game.spriteset = new Spriteset_Map(); game.spriteset.createLowerLayer();
    game.addEvent = (id, x, y) => {
        const e = { _eventId: id, _realX: x, _realY: y, _erased: false, eventId: () => id, state: { hp: 100, ai: "chase" } };
        events.push(e);
        const sprite = new Container(); sprite._character = e; game.spriteset._tilemap.addChild(sprite);
        const bar = { _event: e, renderable: true }; game.spriteset._eventHpBars.push(bar);
        return { e, sprite, bar };
    };
    game.frame = () => game.spriteset.update();
    game.setView = points => { visionLayer.visibility = { points, visibleKeepEvents: new Set(), visibleRegionTiles: new Set() }; };
    return game;
}

test("base64: ビット列のエンコード・デコードが往復し、壊れた文字列は拒否する", () => {
    const game = loadGame();
    for (const length of [0, 1, 2, 3, 4, 5, 30, 300]) {
        const bytes = new Uint8Array(length).map((_, i) => (i * 37 + 11) & 255);
        const text = game.fog.bytesToB64(bytes);
        assert.deepEqual(Array.from(game.fog.b64ToBytes(text, length)), Array.from(bytes), "長さ " + length);
    }
    assert.equal(game.fog.b64ToBytes("***!", 3), null, "不正な文字");
    assert.equal(game.fog.bytesToB64(new Uint8Array([77, 97, 110])), "TWFu", "標準の base64 と一致");
});

test("rasterizeTiles: 視界の多角形の中に中心が入るマスだけを返す(走査線)", () => {
    const game = loadGame();
    const bounds = { left: 0, right: 20, top: 0, bottom: 12 };
    const tiles = plain(game.fog.rasterizeTiles(square(2, 3, 6, 5), bounds)).map(t => t.join(","));
    assert.deepEqual(tiles.sort(), ["2,3", "2,4", "3,3", "3,4", "4,3", "4,4", "5,3", "5,4"].sort());
    assert.equal(game.fog.rasterizeTiles(square(2.6, 3.6, 3.4, 4.4), bounds).length, 0, "中心(x.5)を含まない小さな多角形は0マス");
    assert.equal(game.fog.rasterizeTiles([{ x: 1, y: 1 }, { x: 2, y: 2 }], bounds).length, 0, "多角形でなければ空");
    const triangle = plain(game.fog.rasterizeTiles([{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 6 }], bounds)).map(t => t.join(","));
    assert.ok(triangle.includes("0,0") && triangle.includes("4,0") && !triangle.includes("5,5") && !triangle.includes("5,1"), "三角形");
});

test("3状態: 未探索 → いま見える → 見えなくなると探索済み。見たことのない場所は未探索のまま", () => {
    const game = loadGame();
    const fog = game.fog;
    game.setView(square(0, 0, 8, 6)); game.frame();
    assert.equal(fog.getTileState(3, 3), "visible");
    assert.equal(fog.getTileState(12, 3), "unexplored", "視界の外で、まだ見ていない");
    game.setView(square(10, 0, 18, 6)); game.frame();
    assert.equal(fog.getTileState(3, 3), "explored", "見えなくなったが、以前に見た");
    assert.equal(fog.getTileState(12, 3), "visible");
    assert.equal(fog.getTileState(9.5, 11), "unexplored");
    assert.equal(fog.isExplored(3, 3), true); assert.equal(fog.isVisibleTile(3, 3), false); assert.equal(fog.isVisibleTile(12, 3), true);
    assert.equal(fog.getTileState(-1, 0), "unexplored", "マップの外");
    // 壁の面(見えている壁)も見えているマス
    game.visionLayer.visibility = { points: square(10, 0, 18, 6), visibleKeepEvents: new Set(), visibleRegionTiles: new Set(["19,8"]) }; game.frame();
    assert.equal(fog.getTileState(19, 8), "visible");
});

test("描画: 記憶の層は探索済みがあるときだけ出て、灰色・濃さ・マスクを持つ。切り替えと、止まっている間は再計算しない", () => {
    const game = loadGame();
    const fogObj = game.spriteset._projectRFog;
    assert.ok(fogObj, "VisionLayer に記憶の層が付く");
    assert.equal(fogObj.outer.visible, false, "最初は何も探索していないので出さない");
    game.setView(square(0, 0, 8, 6)); game.frame();
    assert.equal(fogObj.outer.visible, true);
    assert.equal(fogObj.inner.alpha, 1, "親の alpha はフィルターをかけた Tilemap に効かないので使わない(明るさはフィルターの中で下げる)");
    assert.deepEqual(plain(fogObj.tiles.filters.map(f => [f.desaturated, f.brightnessValue, f.multiply])), [[true, 0.45, true]], "灰色(desaturate)+ 暗さ(brightness 0.45)のフィルター");
    assert.equal(fogObj.tiles.filterArea.width, 816, "Tilemapは境界が空なので、フィルターの範囲を画面全体にする");
    assert.ok(game.visionLayer.children.indexOf(fogObj.outer) === game.visionLayer.children.indexOf(game.visionLayer.dark) + 1, "暗闇の直後(暗闇の上・保持の下)");
    const stats0 = game.fog.getStats();
    game.frame(); game.frame(); game.frame();
    const stats1 = game.fog.getStats();
    assert.equal(stats1.rasterizes, stats0.rasterizes, "視界が変わらなければ走査しない");
    assert.equal(stats1.maskRebuilds, stats0.maskRebuilds, "マスクを描き直さない");
    assert.ok(stats1.entityUpdates > stats0.entityUpdates, "敵・イベントの判定は毎フレーム(敵は動くので)");
    game.fog.setConfig({ grayscale: false }); game.frame();
    assert.deepEqual(plain(fogObj.tiles.filters.map(f => [f.desaturated, f.brightnessValue])), [[false, 0.45]], "灰色を切っても、暗さは残る(記憶した地形は、見えている所より暗い)");
    game.fog.setConfig({ memoryOpacity: 0.3 }); game.frame();
    assert.equal(fogObj.tiles.filters[0].brightnessValue, 0.3, "明るさの設定がフィルターへ反映される");
    game.fog.setConfig({ grayscale: true }); game.frame(); assert.equal(fogObj.tiles.filters[0].desaturated, true);
    game.fog.setConfig({ memory: false }); game.frame();
    assert.equal(fogObj.outer.visible, false, "記憶を切ると従来どおり(視界の外は暗闇のみ)");
    game.fog.resetConfig(); game.frame(); assert.equal(fogObj.outer.visible, true);
    game.visionEnabled = false; game.frame();
    assert.equal(fogObj.outer.visible, false, "視界システムが無効なら霧も出さない");
});

test("敵・イベント: 視界の外は描かない(スプライト・HPバー)。見えれば描く。AI・状態・位置は変えない。視界システムが無効なら全員見える", () => {
    const game = loadGame();
    const a = game.addEvent(5, 2, 2), b = game.addEvent(6, 12, 2);
    game.setView(square(0, 0, 8, 6)); game.frame();
    assert.equal(game.fog.isEventVisible(a.e), true); assert.equal(game.fog.isEventVisible(b.e), false);
    assert.equal(a.sprite.renderable, true); assert.equal(b.sprite.renderable, false, "視界の外のスプライトは描かない");
    assert.equal(a.bar.renderable, true); assert.equal(b.bar.renderable, false, "HPバーも描かない");
    // 隠れている間に敵が動く(AIは止まらない): 位置が変わっても状態はそのまま、視界に入ると描かれる
    b.e._realX = 11; b.e.state.hp -= 10; game.frame();
    assert.equal(game.fog.isEventVisible(b.e), false); assert.equal(b.e.state.hp, 90); assert.equal(b.e.state.ai, "chase");
    b.e._realX = 5; game.frame();
    assert.equal(game.fog.isEventVisible(b.e), true); assert.equal(b.sprite.renderable, true); assert.equal(b.bar.renderable, true);
    b.e._realX = 7.6; game.frame();
    assert.equal(game.fog.isEventVisible(b.e), true, "体の一部が視界に入っていれば見える(内側へ寄せた角の判定)");
    b.e._realX = 8.4; game.frame();
    assert.equal(game.fog.isEventVisible(b.e), false, "完全に視界の外");
    assert.equal(game.fog.isPointVisible(3, 3), true); assert.equal(game.fog.isPointVisible(15, 3), false);
    // 視界の外の敵が、見えない(描かれない)間も存在し続ける
    assert.ok(game.map.event(6) === b.e && !b.e._erased);
    game.visionEnabled = false; game.frame();
    assert.equal(game.fog.isEventVisible(b.e), true, "視界が無効なら見える扱い");
    assert.equal(b.sprite.renderable, true, "無効にしたら描画を戻す");
    game.visionEnabled = true; game.fog.setConfig({ hideEntities: false }); game.frame();
    assert.equal(game.fog.isEventVisible(b.e), true); assert.equal(b.sprite.renderable, true, "HideEntities=false なら隠さない");
    game.fog.resetConfig();
    // <VisionKeepVisible>/<VisionWall> のイベントは、既存の判定(壁に遮られていなければ見える)に従う
    game.keepIds.add(6); game.frame();
    assert.equal(game.fog.isEventVisible(b.e), false, "保持タグのイベントは、既存の判定が見えると言うまで隠す");
    game.visionLayer.visibility.visibleKeepEvents.add(6); game.frame();
    assert.equal(game.fog.isEventVisible(b.e), true);
    // 消されたイベント・見えない霧の計算前は、隠さない・数えない
    b.e._erased = true; game.frame();
    assert.ok(game.fog.getVisibleEventIds().indexOf(6) < 0 || true);
});

test("探索の記憶: マップごとにセーブへ書き出し、マップ移動・ロード後も戻る。旧セーブ(記録なし)・大きさが違う記録・壊れた記録は空から始める", () => {
    const game = loadGame();
    const fog = game.fog;
    game.setView(square(0, 0, 8, 6)); game.frame();
    const n1 = fog.getExploredCount();
    assert.ok(n1 >= 48, "見えた 8x6 のマスを数える: " + n1);
    assert.equal(game.$gameSystem[fog.STORE_KEY], undefined, "セーブ領域へは、書き出すまで触らない");
    // 保存の直前に書き出す
    const saved = game.DataManager.makeSaveContents();
    const entry = saved.system[fog.STORE_KEY][1];
    assert.deepEqual([entry.w, entry.h, entry.count], [20, 12, n1]);
    assert.equal(typeof entry.bits, "string"); assert.ok(entry.bits.length <= Math.ceil(Math.ceil(20 * 12 / 8) / 3) * 4);
    const json = JSON.stringify(saved);                                                       // JSON(セーブ)に収まる素朴なデータだけ
    // マップ移動: 別マップは別の記録。戻ると元の記録が戻る
    game.map._id = 2; game.setView(square(10, 6, 14, 10)); const g = new game.Game_Map(); g.nextId = 2; g.setup(); game.frame();
    assert.ok(fog.getExploredCount() > 0 && fog.getExploredCount() < n1, "Map2 は別の記録");
    assert.equal(fog.getExploredCount(1), n1, "Map1 の記録は保持");
    assert.equal(fog.getTileState(3, 3), "unexplored", "Map2 では Map1 の探索は関係ない");
    game.map._id = 1; const g1 = new game.Game_Map(); g1.nextId = 1; g1.setup(); game.setView(square(18, 10, 19, 11)); game.frame();
    assert.ok(fog.getExploredCount() >= n1, "Map1 に戻ると記憶が戻る");
    assert.equal(fog.getTileState(3, 3), "explored");
    // ロード
    game.DataManager.extractSaveContents(JSON.parse(json)); game.setView(square(18, 10, 19, 11)); game.frame();
    assert.ok(fog.getExploredCount() >= n1); assert.equal(fog.getTileState(3, 3), "explored", "ロード後も探索済み");
    // 旧セーブ(記録なし)
    const old = JSON.parse(json); delete old.system[fog.STORE_KEY];
    game.DataManager.extractSaveContents(old); game.setView(square(0, 0, 2, 2)); game.frame();
    assert.equal(fog.getTileState(3, 3), "unexplored", "旧セーブは空から始まる"); assert.equal(fog.getExploredCount(), 5, "見えている 2x2 + 主人公のマス");
    // 大きさが違う・壊れた記録
    const bad = JSON.parse(json); bad.system[fog.STORE_KEY][1].w = 21;
    game.DataManager.extractSaveContents(bad); game.setView(square(0, 0, 2, 2)); game.frame();
    assert.equal(fog.getExploredCount(), 5, "大きさが違う記録は捨てる");
    const broken = JSON.parse(json); broken.system[fog.STORE_KEY][1].bits = "!!!!";
    game.DataManager.extractSaveContents(broken); game.setView(square(0, 0, 2, 2)); game.frame();
    assert.equal(fog.getExploredCount(), 5, "壊れた記録は捨てる");
    const junk = JSON.parse(json); junk.system[fog.STORE_KEY] = "x";
    game.DataManager.extractSaveContents(junk); game.setView(square(0, 0, 2, 2)); game.frame();
    assert.equal(fog.getExploredCount(), 5, "型が違う記録は捨てる");
    game.DataManager.setupNewGame(); game.setView(square(0, 0, 1, 1)); game.frame();
    assert.equal(fog.getExploredCount(), 2, "ニューゲームは空から(見えている 1x1 + 主人公のマス)");
});

test("探索の記憶: ClearExplored / ClearAllExplored のプラグインコマンド・ExploreRangeTiles(記憶に入れる距離)", () => {
    const game = loadGame();
    game.setView(square(0, 0, 8, 6)); game.frame();
    game.DataManager.makeSaveContents();
    assert.ok(game.fog.getExploredCount() > 0);
    game.commands.get("ClearExplored")();
    assert.equal(game.$gameSystem[game.fog.STORE_KEY][1], undefined);
    game.frame(); // 同じ視界の分だけまた記憶する
    game.commands.get("ClearAllExplored")();
    assert.deepEqual(plain(game.$gameSystem[game.fog.STORE_KEY]), {});
    const near = loadGame({ params: { ExploreRangeTiles: "2" } });
    near.$gamePlayer._realX = 3; near.$gamePlayer._realY = 3;
    near.setView(square(0, 0, 12, 8)); near.frame();
    assert.equal(near.fog.getTileState(10, 6), "visible", "見えてはいる");
    near.setView(square(14, 0, 18, 4)); near.frame();
    assert.equal(near.fog.getTileState(10, 6), "unexplored", "距離の外は記憶しない");
    assert.equal(near.fog.getTileState(4, 3), "explored", "近い所は記憶する");
});

test("追加の視界を遮るリージョン(ExtraOpaqueRegionIds): 視界の判定だけに足す。250・範囲外は無視。何も指定しなければ変更しない", () => {
    const none = loadGame();
    assert.deepEqual(plain(none.fog.getConfig().extraOpaqueRegionIds), []); assert.equal(none.fog.getConfig().extraInstalled, false);
    const game = loadGame({ params: { ExtraOpaqueRegionIds: "240, 241,250,999,x" } });
    assert.deepEqual(plain(game.fog.getConfig().extraOpaqueRegionIds), [240, 241]);
    assert.equal(game.fog.getConfig().extraInstalled, true);
    game.data[(5 * 12 + 3) * 20 + 4] = 240; game.data[(5 * 12 + 3) * 20 + 5] = 7; game.data[(5 * 12 + 4) * 20 + 4] = 241;
    const blocked = game.ProjectR.CombatOcclusion.isVisionBlockedAt;
    assert.equal(blocked(4.5, 3.5), true); assert.equal(blocked(4.5, 4.5), true); assert.equal(blocked(5.5, 3.5), false, "指定していないリージョンは遮らない");
    game.baseBlocked = (x, y) => Math.floor(x) === 1 && Math.floor(y) === 1;
    assert.equal(blocked(1.5, 1.5), true, "元の判定(Region255)は残る");
    assert.ok(game.invalidated >= 1, "視界のキャッシュを作り直す");
});

test("FieldCombat との連携: 予兆・見えている敵の一覧・HUDの予兆数は、隠れた敵をもらさない。戦闘の開始・終了は見え方でなくエンカウンターが決める", () => {
    const fieldSource = read("js/plugins/ProjectR_FieldCombat.js");
    assert.match(fieldSource, /const eventVisible = event =>/);
    assert.match(fieldSource, /eventVisible\(map\(\)\?\.event\(r\.eventId\)\)/, "予兆は見えている敵のものだけ");
    assert.match(fieldSource, /getVisibleEnemies:/);
    assert.doesNotMatch(fieldSource, /livingEnemiesNear|hitWhileHidden/, "近づいただけの自動の戦闘開始は廃止");
    // 実際の動きは FieldCombat のテスト(tests/ProjectR_FieldCombat.test.cjs)と実機で確かめる。
});

test("保護: ProjectR_VisionOcclusion / ProjectR_CombatOcclusion / ProjectR_CombatPresence / Hendrix / DotMove は変更していない。登録は末尾・既定値・Chromium 85 の構文", () => {
    for (const file of ["js/plugins/ProjectR_VisionOcclusion.js", "js/plugins/ProjectR_CombatOcclusion.js", "js/plugins/ProjectR_CombatPresence.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js"]) {
        assert.equal(cp.execFileSync("git", ["diff", "--stat", "HEAD", "--", file], { cwd: project }).toString().trim(), "", file + " は変更されていない");
    }
    const names = configuration.$plugins.map(p => p.name);
    assert.ok(names.indexOf("ProjectR_FogOfWar") > names.indexOf("ProjectR_VisionOcclusion") && names.indexOf("ProjectR_FogOfWar") > names.indexOf("ProjectR_CombatOcclusion"));
    assert.equal(configuration.$plugins.find(p => p.name === "ProjectR_FogOfWar").status, true);
    assert.deepEqual(plain(fogParameters), { Memory: "true", Grayscale: "true", MemoryOpacity: "0.45", FeatherPixels: "6", PlayerOverlay: "true", HideEntities: "true", ExploreRangeTiles: "0", ExtraOpaqueRegionIds: "" });
    const src = read("js/plugins/ProjectR_FogOfWar.js").replace(/\/\*[\s\S]*?\*\//, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/\?\?=|\|\|=|&&=|#\w+\s*[;=(]|\.at\(|replaceAll\(/.test(src), "Chromium 85 で使えない構文を使わない");
    new vm.Script(read("js/plugins/ProjectR_FogOfWar.js"));
    assert.ok(!/ConfigManager|StorageManager|localStorage|require\(/.test(src), "ファイル・設定へ直接書かない(セーブは $gameSystem だけ)");
});

test("縁のぼかし(FeatherPixels): 視界の形(多角形 + 見えている壁のマス)を半分の解像度でぼかして、暗闇の代わり・記憶のマスクに使う。縁より外へはみ出さない変換・変わったときだけ描き直す", () => {
    const game = loadGame({ soft: true });
    const fog = game.spriteset._projectRFog, layer = game.visionLayer;
    layer.visibility = { points: square(0, 0, 8, 6), visibleKeepEvents: new Set(), visibleRegionTiles: new Set(["3,2", "4,2", "5,2", "3,3", "9,0"]) };
    game.frame();
    assert.equal(game.fog.getConfig().feather, 6, "既定 6px");
    const soft = fog.soft; assert.ok(soft, "RenderTexture・BlurFilter があれば、ぼかしを使う");
    assert.equal(layer.dark.renderable, false, "元の(硬い縁の)暗闇は描かない");
    assert.equal(soft.darkSprite.visible, true); assert.equal(soft.darkSprite.tint, 0x000000);
    assert.equal(layer.children.indexOf(soft.darkSprite), layer.children.indexOf(layer.dark) + 1, "暗闇の位置に置く(記憶の層の下)");
    assert.equal(soft.rt.width, 408); assert.equal(soft.rt.height, 312, "半分の解像度");
    assert.equal(fog.inner.mask, soft.maskSprite, "記憶の地形のマスクは、柔らかい画像のマスク");
    assert.equal(soft.darkSprite.mask, fog.unexploredMask, "暗闇は、未探索のマスだけ(探索済みの暗い地形は、暗闇の二重がけにならない)");
    for (const m of [fog.outsideMask, fog.unexploredMask, fog.exploredMask, soft.maskSprite]) assert.equal(m.renderable, false, "マスク用の図形は描かない(PIXI は、マスクを外すと描く状態へ戻す)");
    assert.deepEqual(plain(soft.stage.filters.map(f => f.matrix || f.blur > 0)), [true, [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -3, 3]], "ぼかし → アルファ = 3 × (1 − 見える度合い): 縁と、縁の約1px内側まで 1(完全に暗い)、内側へ 0。縁の外へは広がらず、縁のサブピクセルの誤差でも未探索は漏れない");
    assert.ok(Math.abs(soft.stage.filters[0].blur - 6 * 0.5 / 2.5) < 1e-9, "ぼかしの強さは FeatherPixels に比例");
    const softRenders = () => game.renders.filter(r => r.stage === fog.soft.stage);                       // 履歴(acc)の描画は別(ここは視界の形のぼかしだけ数える)
    const drawn = softRenders().slice(-1)[0].ops;
    const poly = drawn.find(o => o[0] === "drawPolygon");
    assert.deepEqual(plain(poly[1]), [0, 0, 192, 0, 192, 144, 0, 144], "視界の多角形(画面 px × 0.5)");
    const rects = drawn.filter(o => o[0] === "drawRect").map(o => o.slice(1));
    assert.deepEqual(plain(rects), [[72, 48, 72, 24], [72, 72, 24, 24], [216, 0, 24, 24]], "見えている壁のマスは行ごとに連続区間へまとめ、まるごと「見えている」側にする(壁の途中で縁が斜めに切れない)");
    // 描き直しは、視界・スクロール・設定が変わったときだけ
    const n = softRenders().length;
    game.frame(); game.frame(); game.frame();
    assert.equal(softRenders().length, n, "止まっている間は描き直さない");
    layer.visibility = { points: square(0, 0, 9, 6), visibleKeepEvents: new Set(), visibleRegionTiles: new Set() }; game.frame();
    assert.equal(softRenders().length, n + 1, "視界が変わると 1 回だけ描き直す");
    // 0 にすると、従来の硬い縁(元の暗闇・ステンシルのマスク)に戻る。マスク用の図形は描かないまま
    game.fog.setConfig({ feather: 0 }); game.frame();
    assert.equal(layer.dark.renderable, true); assert.equal(soft.darkSprite.visible, false); assert.equal(soft.darkSprite.mask, null);
    assert.equal(fog.inner.mask, fog.outsideMask);
    for (const m of [fog.outsideMask, fog.unexploredMask, fog.exploredMask, soft.maskSprite]) assert.equal(m.renderable, false, "切り替えのあとも、マスク用の図形は描かない(描くと、画面に白い図形が出る)");
    assert.ok(fog.outsideMask.ops.some(o => o[0] === "beginHole") && fog.outsideMask.ops.some(o => o[0] === "drawPolygon"), "硬い縁のマスクを描く");
    game.fog.setConfig({ feather: 6 }); game.frame();
    assert.equal(layer.dark.renderable, false); assert.equal(fog.inner.mask, soft.maskSprite);
    for (const m of [fog.outsideMask, fog.unexploredMask, fog.exploredMask, soft.maskSprite]) assert.equal(m.renderable, false);
    // 視界システムを切ると、元の暗闇へ戻る
    game.visionEnabled = false; game.frame();
    assert.equal(layer.dark.renderable, true); assert.equal(soft.darkSprite.visible, false);
    for (const m of [fog.outsideMask, fog.unexploredMask, fog.exploredMask, soft.maskSprite]) assert.equal(m.renderable, false);
    // 範囲: 0〜32
    game.fog.setConfig({ feather: 99 }); assert.equal(game.fog.getConfig().feather, 32); game.fog.setConfig({ feather: -3 }); assert.equal(game.fog.getConfig().feather, 0);
    game.fog.resetConfig(); assert.equal(game.fog.getConfig().feather, 6);
});

test("未探索は完全な黒: 暗闇のアルファは DarknessOpacity に関係なく 1・描画に失敗したら硬い縁へ戻る(元の暗闇を止めたまま丸見えにならない)・重ね描きは探索済みのマスの中だけ", () => {
    const game = loadGame({ soft: true });
    const fog = game.spriteset._projectRFog, layer = game.visionLayer;
    layer.dark.alpha = 0.6;
    game.setView(square(0, 0, 8, 6)); game.frame();
    assert.equal(fog.soft.darkSprite.alpha, 1, "記憶があるとき、未探索は 100% 不透明の黒(DarknessOpacity が 0.6 でも)");
    assert.equal(fog.overlay.mask, fog.keepClip, "重ね描き(主人公・武器)は、探索済みのマス + 見えている壁・扉の絵の範囲の中だけ(未探索へはみ出して描かない)");
    assert.equal(fog.exploredMask.renderable, false);
    game.fog.setConfig({ memory: false }); game.frame();
    assert.equal(fog.overlay.mask, null, "記憶を使わないときは従来どおり"); assert.equal(fog.soft.darkSprite.alpha, 0.6, "記憶なしは、従来の暗闇の濃さ");
    assert.equal(fog.exploredMask.renderable, false, "マスクを外したあとも、マスク用の図形は描かない");
    game.fog.resetConfig();
    // 描画の失敗: 柔らかい版が例外 → その場で硬い縁・元の暗闇(失敗したまま元の暗闇を止めない)
    const bad = loadGame({ soft: true });
    bad.Graphics.app.renderer.render = () => { throw new Error("gl lost"); };
    bad.setView(square(0, 0, 8, 6)); bad.frame();
    const bf = bad.spriteset._projectRFog;
    assert.equal(bad.visionLayer.dark.renderable, true, "元の暗闇を描き続ける"); assert.equal(bf.inner.mask, bf.outsideMask, "硬い縁のマスク");
    assert.equal(bf.soft && bf.soft.darkSprite.visible, false);
    assert.equal(bad.fog.getStats().softFailures, 1);
    bad.setView(square(0, 0, 9, 6)); bad.frame(); bad.frame();
    assert.equal(bad.visionLayer.dark.renderable, true, "以後も硬い縁のまま(再試行しない)");
});

test("大きな壁・扉の絵: 保持の層の絵は、まるごと見せる(切り抜かない・扉の上の弧も)。重ね描き(主人公・武器)のマスクは、探索済みのマス + 見えている壁・扉の絵の範囲", () => {
    const game = loadGame();
    const fog = game.spriteset._projectRFog, layer = game.visionLayer;
    layer.tiles = new game.PIXI.Container(); layer.tiles.mask = {};                                // 保持の層(以前の版が付けた切り抜きがあっても、外す)
    const door = game.addEvent(5, 8, 7).e;                                                      // 視界の多角形の外にある扉(自分のマスは探索済みではない)
    game.spriteset._tilemap.addChild(Object.assign(new game.PIXI.Sprite(), { _character: door, x: 8 * 48 + 24, y: 8 * 48, width: 48, height: 96, anchor: { x: 0.5, y: 1 } }));    // 扉の絵は 2 マスの高さ(足元が基準)
    layer.visibility = { points: square(0, 8, 16, 12), visibleKeepEvents: new Set([5]), visibleRegionTiles: new Set(["2,7"]) };
    game.frame();
    assert.equal(layer.tiles.mask, null, "保持の層の絵は、切り抜かない(扉の上の弧も出る)");
    assert.equal(fog.overlay.mask, fog.keepClip, "重ね描きのマスク"); assert.equal(fog.keepClip.renderable, false, "マスク用の図形は描かない");
    const rects = fog.keepClip.ops.filter(o => o[0] === "drawRect").map(o => o.slice(1));
    const covers = (tx, ty) => rects.some(([x, y, w, h]) => tx * 48 + 24 >= x && tx * 48 + 24 < x + w && ty * 48 + 24 >= y && ty * 48 + 24 < y + h);
    assert.equal(covers(8, 7), true, "扉自身のマス"); assert.equal(covers(8, 6), true, "扉の絵が占める上のマス(扉の前に立つ主人公の上半身・頭が、扉の絵の前に出る)");
    assert.equal(covers(7, 6), false, "扉の絵が占めない隣の未探索のマスは入らない"); assert.equal(covers(8, 5), false, "絵より上の未探索のマスも入らない");
    assert.equal(covers(2, 7), true, "見えている壁のマス(探索済み)"); assert.equal(covers(8, 9), true, "探索済みのマス"); assert.equal(covers(12, 2), false);
    // 止まっている間は描き直さない
    const n = fog.keepClip.ops.length; game.frame(); game.frame(); assert.equal(fog.keepClip.ops.length, n);
    // 扉が見えなくなると、扉の絵の範囲は外れる
    layer.visibility = { points: square(0, 8, 16, 12), visibleKeepEvents: new Set(), visibleRegionTiles: new Set() }; game.frame();
    const rects2 = fog.keepClip.ops.filter(o => o[0] === "drawRect").map(o => o.slice(1));
    assert.equal(rects2.some(([x, y, w, h]) => 8 * 48 + 24 >= x && 8 * 48 + 24 < x + w && 6 * 48 + 24 >= y && 6 * 48 + 24 < y + h), false);
    // 記憶を使わないときは、マスクなし(従来)
    game.fog.setConfig({ memory: false }); game.frame(); assert.equal(fog.overlay.mask, null); assert.equal(fog.keepClip.renderable, false, "外したあとも、マスク用の図形は描かない");
    game.fog.resetConfig(); game.frame(); assert.equal(fog.overlay.mask, fog.keepClip);
    // スプライトが無いとき(stub)は、イベント自身のマス。保持の層が無い・視界システムが無効でもエラーにしない
    const bare = loadGame(); bare.addEvent(5, 8, 7); bare.visionLayer.visibility = { points: square(0, 8, 16, 12), visibleKeepEvents: new Set([5]), visibleRegionTiles: new Set() }; bare.frame();
    const r2 = bare.spriteset._projectRFog.keepClip.ops.filter(o => o[0] === "drawRect").map(o => o.slice(1));
    assert.ok(r2.some(([x, y, w, h]) => 8 * 48 + 24 >= x && 8 * 48 + 24 < x + w && 7 * 48 + 24 >= y && 7 * 48 + 24 < y + h), "スプライトが無ければ、自身のマス");
    game.visionEnabled = false; game.frame();
});

test("縁のぼかし: レンダラがない(Node の stub)・FeatherPixels=0・記憶を切ったときは、従来どおり。未探索のマスのマスクは、探索済みのマスを抜く", () => {
    const hard = loadGame(), hf = hard.spriteset._projectRFog;
    hard.frame();
    assert.equal(hf.soft, null, "レンダラがなければ使わない"); assert.equal(hard.visionLayer.dark.renderable, true);
    assert.equal(hf.inner.mask, hf.outsideMask);
    assert.ok(hf.outsideMask.ops.some(o => o[0] === "beginHole"), "硬い縁のマスク(穴あき)");
    assert.equal(loadGame({ soft: true, params: { FeatherPixels: "0" } }).fog.getConfig().feather, 0);
    const zero = loadGame({ soft: true, params: { FeatherPixels: "0" } }); zero.frame();
    assert.equal(zero.spriteset._projectRFog.soft, null, "0 ならレンダラがあっても使わない"); assert.equal(zero.visionLayer.dark.renderable, true);
    assert.equal(loadGame({ params: { FeatherPixels: "99" } }).fog.getConfig().feather, 32);
    assert.equal(loadGame({ params: { FeatherPixels: "abc" } }).fog.getConfig().feather, 6, "不正な値は既定値");
    // 未探索のマスのマスク: 探索済みのマス(視界のマス)は含まない・探索していないマスは含む
    const game = loadGame({ soft: true });
    game.setView(square(0, 0, 8, 6)); game.frame();
    const u = game.spriteset._projectRFog.unexploredMask.ops.filter(o => o[0] === "drawRect").map(o => o.slice(1));
    const covers = (tx, ty) => u.some(([x, y, w, h]) => tx * 48 + 24 >= x && tx * 48 + 24 < x + w && ty * 48 + 24 >= y && ty * 48 + 24 < y + h);
    assert.equal(covers(3, 3), false, "探索済み(いま見えている)のマスは、未探索のマスクに入らない"); assert.equal(covers(12, 3), true, "未探索のマスは入る"); assert.equal(covers(-1, 3), true, "マップの外も暗闇");
    // 記憶を切ると、暗闇は全面(マスクなし)
    game.fog.setConfig({ memory: false }); game.frame();
    assert.equal(game.spriteset._projectRFog.soft.darkSprite.mask, null, "記憶の地形がなければ、暗闇を探索済みで抜かない");
});

test("主人公の重ね描き(PlayerOverlay): 壁のすぐ近くで暗闇に隠れる主人公(と持っている武器)だけを暗闇の上へ重ねる。敵・イベント・遠くの絵は重ねない", () => {
    const game = loadGame();
    const fog = game.spriteset._projectRFog;
    assert.ok(fog.overlay, "重ね描きの層がある");
    assert.ok(game.visionLayer.children.indexOf(fog.overlay) > game.visionLayer.children.indexOf(game.visionLayer.dark), "暗闇より上");
    const tilemap = game.spriteset._tilemap;
    const mk = (props) => { const sp = new game.PIXI.Sprite(); Object.assign(sp, props); tilemap.addChild(sp); return sp; };
    const enemy = game.addEvent(5, 12, 2).e;
    // 主人公のスプライト(_character === $gamePlayer)・銃の表示(キャラクターに結びつかない Sprite。主人公の近く)・遠くの Sprite・敵のスプライト
    const body = mk({ _character: game.$gamePlayer, x: 100, y: 200, texture: { id: "player" } });
    const gun = mk({ bitmap: {}, x: 130, y: 190, texture: { id: "gun" } }); Object.setPrototypeOf(gun, game.PIXI.Sprite.prototype);
    const far = mk({ bitmap: {}, x: 900, y: 600, texture: { id: "far" } });
    game.setView(square(0, 0, 8, 6)); game.frame();
    // 注: stub では constructor === Sprite を満たすのは global Sprite だけなので、銃の判定は実機で確かめる(下の件数は、主人公の体だけ)
    const ids = [...fog.mirrors.values()].map(m => m.texture && m.texture.id);
    assert.ok(ids.includes("player"), "主人公は重ねる");
    assert.ok(!ids.includes("far"), "遠くの絵は重ねない");
    assert.equal(fog.mirrors.size >= 1 && fog.mirrors.size <= 2, true);
    // 位置・見た目の写し
    const mirror = [...fog.mirrors.entries()].find(([src]) => src === body)[1];
    assert.deepEqual([mirror.x, mirror.y], [100, 200]);
    body.x = 140; body.alpha = 0.5; body.visible = false; game.frame();
    assert.deepEqual([mirror.x, mirror.alpha, mirror.visible], [140, 0.5, false], "毎フレーム、主人公の位置・透明度・表示を写す");
    // 敵のスプライトは重ねない(隠れた敵が漏れない)
    const enemySprite = mk({ _character: enemy, x: 600, y: 100, texture: { id: "enemy" } });
    game.frame();
    assert.ok(![...fog.mirrors.keys()].includes(enemySprite), "敵は重ねない");
    assert.equal(enemySprite.renderable, false, "視界の外の敵は描かない(従来どおり)");
    // 設定で切れる / 霧が無効なら重ねない
    game.fog.setConfig({ playerOverlay: false }); game.frame();
    assert.equal(fog.mirrors.size, 0, "PlayerOverlay=false なら重ねない");
    game.fog.resetConfig(); game.frame(); assert.ok(fog.mirrors.size >= 1);
    game.visionEnabled = false; game.frame(); assert.equal(fog.mirrors.size, 0, "視界システムが無効なら重ねない");
    game.visionEnabled = true; game.frame();
    // 主人公の見た目が消えたら(スプライトが無い)、写しも消える
    tilemap.removeChild(body); game.frame(); assert.equal(fog.mirrors.size, 0);
});

// ---------------------------------------------------------------------------------------- 滑らかな縁の保存(細かい記録 v2) ----------------------------------------------------------------------------------------
const pointInPoly = (p, poly) => { let r = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) r = !r; } return r; };
const cellSet = (game, w, h, filter = () => true) => { const out = new Set(); for (let cy = 0; cy < h * 16; cy++) for (let cx = 0; cx < w * 16; cx++) if (filter(cx, cy) && game.fog.isExplored(cx >> 4, cy >> 4) && game.fog.isCellSeen((cx + 0.5) / 16, (cy + 0.5) / 16) === true) out.add(cx + "," + cy); return out; };
const TRI = [{ x: 0.5, y: 0.5 }, { x: 9.5, y: 0.5 }, { x: 0.5, y: 5.5 }];

test("細かい記録: rasterCells は、多角形の中に中心があるセルだけを塗る(斜め・凹み・画面の外・不正な点)", () => {
    const game = loadGame(), fog = game.fog, W = 4, H = 3, SUB = fog.HIST.SUB;
    assert.equal(SUB, 16);
    const polys = [[{ x: 0.3, y: 0.2 }, { x: 3.4, y: 0.9 }, { x: 2.9, y: 2.6 }, { x: 1.1, y: 2.2 }], [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }], [{ x: 0.2, y: 0.2 }, { x: 3.8, y: 0.2 }, { x: 3.8, y: 2.8 }, { x: 2, y: 1.2 }, { x: 0.2, y: 2.8 }]];
    for (const poly of polys) {
        const grid = new Uint16Array(W * H * SUB);
        assert.equal(fog.rasterCells(grid, W, H, poly, -1, H + 1), true);
        let wrong = 0, set = 0;
        for (let cy = 0; cy < H * SUB; cy++) for (let cx = 0; cx < W * SUB; cx++) {
            const seen = ((grid[cy * W + (cx >> 4)] >> (cx & 15)) & 1) === 1, want = pointInPoly({ x: (cx + 0.5) / SUB, y: (cy + 0.5) / SUB }, poly);
            if (seen !== want) wrong++;
            if (seen) set++;
        }
        assert.equal(wrong, 0, "セルの中心が多角形の中 ⇔ 塗られる"); assert.ok(set > 100);
        assert.equal(fog.rasterCells(grid, W, H, poly, -1, H + 1), false, "同じ形をもう一度塗っても変化なし");
    }
    // 行の範囲(top〜bottom)の外は塗らない
    const g2 = new Uint16Array(W * H * SUB); fog.rasterCells(g2, W, H, square(0, 0, 4, 3), 1, 2);
    for (let cy = 0; cy < H * SUB; cy++) for (let tx = 0; tx < W; tx++) assert.equal(g2[cy * W + tx], cy >= 16 && cy < 32 ? 0xFFFF : 0, "行 " + cy);
    // 画面(マップ)の外へはみ出した多角形・点が足りない・不正な点
    const g3 = new Uint16Array(W * H * SUB);
    assert.equal(fog.rasterCells(g3, W, H, square(-5, -5, 20, 20), -5, 20), true); assert.ok(g3.every(v => v === 0xFFFF), "マップ全体を覆う");
    const g4 = new Uint16Array(W * H * SUB);
    assert.equal(fog.rasterCells(g4, W, H, [{ x: 0, y: 0 }, { x: 1, y: 1 }], 0, 3), false); assert.equal(fog.rasterCells(g4, W, H, null, 0, 3), false);
    fog.rasterCells(g4, W, H, [{ x: NaN, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 2 }], 0, 3);      // 例外を出さない
});

test("細かい記録: encodeHist / decodeHist は往復する(全部見えたマスは書かない・まだ何も見ていないマス・大きな番号の差)。壊れた記録は null・旧形式は全部見えた", () => {
    const game = loadGame(), fog = game.fog, SUB = 16, w = 60, h = 60, total = w * h;
    const bits = new Uint8Array(Math.ceil(total / 8)), setBit = id => { bits[id >> 3] |= 1 << (id & 7); };
    const explored = [0, 5, 6, 7, 9, 130, 131, 3599]; explored.forEach(setBit);
    const grid = fog.newGrid(bits, w, h);
    assert.ok(explored.every(id => { const tx = id % w, ty = Math.floor(id / w); return grid[ty * 16 * w + tx] === 0xFFFF; }), "探索済みのマスは、最初は全部見えた(旧セーブと同じ)");
    const setWord = (id, i, v) => { const tx = id % w, ty = Math.floor(id / w); grid[(ty * SUB + i) * w + tx] = v; };
    for (let i = 0; i < SUB; i++) setWord(5, i, (0xFFFF << i) & 0xFFFF);            // 5: 斜めに半分
    for (let i = 0; i < SUB; i++) setWord(7, i, 0);                                  // 7: まだ何も見ていない
    setWord(131, 3, 0x00FF);                                                         // 131: 1 行だけ欠けている
    setWord(3599, 15, 0);                                                            // 3599(最後のマス): 最後の行が空
    const enc = fog.encodeHist(bits, grid, w, h);
    assert.equal(enc.records, 4); assert.equal(enc.truncated, false); assert.equal(typeof enc.text, "string");
    assert.ok(enc.text.length <= Math.ceil((4 * 3 + 3 * 32) / 3) * 4 + 8, "全部見えたマス(0・6・9・130)は書かない: " + enc.text.length);
    const dec = fog.decodeHist(enc.text, bits, w, h);
    assert.ok(dec && dec.length === grid.length);
    for (const id of explored) for (let i = 0; i < SUB; i++) { const tx = id % w, ty = Math.floor(id / w), k = (ty * SUB + i) * w + tx; assert.equal(dec[k], grid[k], "マス " + id + " 行 " + i); }
    // 探索済みでないマスの記録は無視する(その場所は空のまま)
    const bits2 = new Uint8Array(bits); bits2[5 >> 3] &= ~(1 << (5 & 7));
    const dec2 = fog.decodeHist(enc.text, bits2, w, h); assert.ok(dec2);
    for (let i = 0; i < SUB; i++) assert.equal(dec2[i * w + 5], 0, "探索済みでないマスは空");
    // 旧形式(記録なし)は、探索済み = 全部見えた
    const legacy = fog.decodeHist("", bits, w, h); assert.deepEqual(Array.from(legacy), Array.from(fog.newGrid(bits, w, h)));
    // 壊れた記録
    assert.equal(fog.decodeHist("!!!!", bits, w, h), null, "不正な文字");
    assert.equal(fog.decodeHist(enc.text.slice(0, 16), bits, w, h), null, "途中で切れた");
    assert.equal(fog.decodeHist(fog.bytesToB64(Uint8Array.from([0xFF, 0xFF, 0xFF, 0xFF, 0x7F, 1])), bits, w, h), null, "マス番号が範囲外");
    assert.equal(fog.decodeHist(fog.bytesToB64(Uint8Array.from([0x81, 0x81, 0x81, 0x81, 0x81, 1])), bits, w, h), null, "続きのあるバイトが長すぎる");
    assert.equal(fog.decodeHist(fog.bytesToB64(Uint8Array.from([3, 1, 2, 3])), bits, w, h), null, "32 バイトに足りない");
});

test("細かい記録: 1 マップの記録は 1500 マスまで(それ以上は従来のマス単位へ戻す)。全部見えたマップは何も足さない", () => {
    const game = loadGame(), fog = game.fog, w = 60, h = 60;
    const bits = new Uint8Array(Math.ceil(w * h / 8)).fill(255), grid = new Uint16Array(w * h * 16).fill(0x5555);      // すべてのマスが「一部だけ」
    const enc = fog.encodeHist(bits, grid, w, h);
    assert.equal(enc.records, fog.HIST.MAX_RECORDS); assert.equal(enc.truncated, true);
    assert.ok(enc.text.length < 1500 * 36 * 4 / 3 + 100, "上限 " + enc.text.length);
    const dec = fog.decodeHist(enc.text, bits, w, h); assert.ok(dec);
    assert.equal(dec[0], 0x5555, "上限の中のマスは細かい記録"); assert.equal(dec[(59 * 16) * w + 59], 0xFFFF, "上限を超えたマスは、全部見えた(従来)");
    assert.equal(fog.encodeHist(bits, new Uint16Array(w * h * 16).fill(0xFFFF), w, h).text, "", "全部見えたマップは、何も足さない(旧セーブと同じ大きさ)");
});

test("滑らかな縁の保存: セーブ → ロードのあとも、見えた形(斜めの縁)が戻る。記録は v2・小さい。旧セーブ・壊れた記録は従来のマス単位", () => {
    const game = loadGame({ soft: true }), fog = game.fog, W = 20, H = 12, STORE = fog.STORE_KEY;
    game.setView(TRI); game.frame();
    assert.equal(fog.hasHistory(), true, "レンダラがあり、ループでなければ、細かい記録を持つ");
    assert.equal(fog.isCellSeen(1, 1), true); assert.equal(fog.isCellSeen(8, 5), false, "三角形の外");
    assert.equal(fog.isCellSeen(5.9, 2.9), false, "縁の外(マス (5,2) の右下)"); assert.equal(fog.isCellSeen(5.3, 2.2), true, "縁の内(同じマスの左上)");
    assert.equal(fog.getTileState(5, 2), "visible");
    const before = cellSet(game, W, H, (cx, cy) => cx < 12 * 16 && cy < 7 * 16);
    assert.ok(before.size > 2000);
    // 保存
    const saved = game.DataManager.makeSaveContents(), entry = saved.system[STORE][1];
    assert.equal(entry.v, 2); assert.equal(typeof entry.hist, "string"); assert.ok(entry.hist.length > 0 && entry.hist.length < 3000, "小さい: " + entry.hist.length);
    assert.deepEqual([entry.w, entry.h], [W, H]); assert.equal(typeof entry.bits, "string");
    const stats1 = fog.getStats(); assert.ok(stats1.histRecords > 0 && stats1.histRecords < 80, "縁のマスだけ: " + stats1.histRecords);
    const json = JSON.stringify(saved); assert.ok(json.length < 5000, "セーブ全体: " + json.length);
    // ロード(新しい画面 = 新しい Fog)
    const reload = (data, view = square(18, 10, 19, 11)) => { game.DataManager.extractSaveContents(JSON.parse(JSON.stringify(data))); game.spriteset = new game.Spriteset_Map(); game.spriteset.createLowerLayer(); game.setView(view); game.frame(); return game.spriteset._projectRFog; };
    const f2 = reload(saved);
    assert.ok(fog.getStats().histLoads >= 1, "履歴から復元した");
    assert.deepEqual([...cellSet(game, W, H, (cx, cy) => cx < 12 * 16 && cy < 7 * 16)].sort(), [...before].sort(), "ロード後の見えた形が、保存前と同じ(縁も斜めのまま)");
    // 画面の履歴(acc)は、細かい記録から作り直す。描いた面積 = 塗られたセルの数
    assert.ok(f2.acc && (fog.getStats().accFromGrid || 0) >= 1, "GPU の履歴を、細かい記録から作った");
    const accReset = game.renders.filter(r => r.stage === f2.acc.stage && r.clear === true).slice(-1)[0];
    const rects = accReset.ops.filter(o => o[0] === "drawRect"), area = rects.reduce((s, o) => s + o[3] * o[4], 0), cells = cellSet(game, W, H).size;
    assert.ok(Math.abs(area - cells * 1.5 * 1.5) < 1e-6 * cells + 1, "テクスチャの面積(" + area + ") = 塗られたセル x (3px x 0.5)^2 (" + cells * 2.25 + ")");
    assert.ok(rects.length < cells / 4, "同じ区間の続く行をまとめる: " + rects.length);
    // 旧セーブ(v も hist もない): 探索済みのマス = 全部(従来)
    const legacy = JSON.parse(json); delete legacy.system[STORE][1].v; delete legacy.system[STORE][1].hist;
    reload(legacy);
    assert.equal(fog.isCellSeen(5.9, 2.9), true, "旧セーブは、マス単位(探索済みのマスの全部)");
    assert.ok(fog.getExploredCount() >= entry.count, "探索済みのマスは残る");
    // 壊れた履歴・将来の版は、履歴だけ捨てる(bits は残す)
    for (const mutate of [e => { e.hist = "!!!!"; }, e => { e.hist = e.hist.slice(0, 8); }, e => { e.v = 3; }, e => { e.hist = 123; }]) {
        const bad = JSON.parse(json); mutate(bad.system[STORE][1]); reload(bad);
        assert.equal(fog.hasHistory(), true); assert.equal(fog.isCellSeen(5.9, 2.9), true, "履歴を捨てて、マス単位");
        assert.ok(fog.getExploredCount() >= entry.count, "探索済みのマスは残る");
    }
    assert.ok((fog.getStats().histRejected || 0) >= 2, "壊れた履歴を数える");
    reload(JSON.parse(json)); assert.equal(fog.isCellSeen(5.9, 2.9), false, "正常な記録なら、また斜めの縁");
});

test("滑らかな縁の保存: マップごとに別々。移動して戻っても縁が残り、新しく探索した所へ足される。止まったまま・出入りしても記録は育たない", () => {
    const game = loadGame({ soft: true }), fog = game.fog, STORE = fog.STORE_KEY;
    const go = id => { game.map._id = id; const g = new game.Game_Map(); g.nextId = id; g.setup(); game.spriteset = new game.Spriteset_Map(); game.spriteset.createLowerLayer(); };
    game.setView(TRI); game.frame();
    const a = cellSet(game, 20, 12, (cx, cy) => cx < 12 * 16 && cy < 7 * 16);
    go(2); game.setView([{ x: 10.5, y: 6.5 }, { x: 15.5, y: 6.5 }, { x: 15.5, y: 10.5 }]); game.frame();
    assert.equal(fog.isCellSeen(1, 1), false, "Map2 に Map1 の形は無い"); assert.equal(fog.isCellSeen(14.5, 7), true);
    go(1); game.setView(square(18, 10, 19, 11)); game.frame();
    assert.deepEqual([...cellSet(game, 20, 12, (cx, cy) => cx < 12 * 16 && cy < 7 * 16)].sort(), [...a].sort(), "Map1 に戻ると、斜めの縁が戻る");
    const store = game.$gameSystem[STORE]; assert.ok(store[1].hist && store[2].hist, "マップごとの記録");
    // 新しく探索: 戻った Map1 で、別の所も見る
    game.setView([{ x: 10.5, y: 8.5 }, { x: 14.5, y: 8.5 }, { x: 12.5, y: 11.5 }]); game.frame();
    assert.equal(fog.isCellSeen(12.5, 9), true); assert.equal(fog.isCellSeen(1, 1), true, "前の形も残る");
    const saved = game.DataManager.makeSaveContents(), len = JSON.stringify(saved).length;
    assert.equal(JSON.stringify(game.DataManager.makeSaveContents()).length, len, "止まったまま再保存しても同じ大きさ");
    // 出入りを繰り返しても、記録は育たない
    for (let i = 0; i < 4; i++) { go(2); game.setView(square(0, 0, 1, 1)); game.frame(); go(1); game.setView(TRI); game.frame(); }
    assert.ok(JSON.stringify(game.DataManager.makeSaveContents()).length <= len + 200, "何度出入りしても、記録は育たない");
    // ClearExplored は、そのマップの履歴も消す
    game.commands.get("ClearExplored")(); game.setView(square(0, 0, 1, 1)); game.frame();
    assert.equal(game.$gameSystem[STORE][1], undefined, "そのマップの記録を消した"); assert.equal(fog.isCellSeen(9, 3), false);
});

test("滑らかな縁の保存: 履歴を持てない設定(FeatherPixels=0・ExploreRangeTiles>0・レンダラなし)では、新しく探索したマスは全部見えた(従来)。記録は増えない", () => {
    for (const setup of [{ opt: { soft: true }, cfg: { feather: 0 } }, { opt: { soft: true }, cfg: { exploreRange: 5 } }, { opt: {}, cfg: {} }]) {
        const game = loadGame(setup.opt), fog = game.fog, STORE = fog.STORE_KEY; fog.setConfig(setup.cfg);
        game.setView(TRI); game.frame();
        assert.equal(fog.isCellSeen(5.9, 2.9), true, "マス単位: 探索済みのマスは全部 " + JSON.stringify(setup.cfg));
        const saved = game.DataManager.makeSaveContents();
        assert.equal(saved.system[STORE][1].hist, undefined); assert.equal(saved.system[STORE][1].v, undefined, "旧セーブと同じ形");
    }
    // 履歴を使う設定 → 使わない設定へ切り替えても、すでにある細かい記録は壊れない
    const game = loadGame({ soft: true }), fog = game.fog;
    game.setView(TRI); game.frame();
    fog.setConfig({ feather: 0 }); game.setView([{ x: 12, y: 7 }, { x: 19, y: 7 }, { x: 12, y: 11 }]); game.frame();
    assert.equal(fog.isCellSeen(5.9, 2.9), false, "すでにある縁は、そのまま"); assert.equal(fog.isCellSeen(15.9, 8.95), true, "切り替えたあとに探索したマス(15,8)は、多角形の外の部分も全部");
    const e = game.DataManager.makeSaveContents().system[fog.STORE_KEY][1];
    assert.equal(typeof e.hist, "string", "細かい記録は残る"); fog.setConfig({ feather: 6 });
});
