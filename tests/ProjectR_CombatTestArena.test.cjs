"use strict";
// Phase 5A-RT1: DEV Combat Test Arena。
// 1) マップ/MapInfos/Event/プラグイン登録の静的検証（MZを起動しない）
// 2) 実Core・実Manager・実Gauge・実Bridge・実Activationの上で、アリーナ補助プラグインを実ソースのまま読み込み、
//    Playtest限定ガード・本番検証の不変・実カード7枚のfixture・Divine/Gauge操作・退出/リセットを検証する。
// Sprite/描画/MZ実機の挙動は対象外。
const assert = require("node:assert/strict");
const cp = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function fixtureLoader(file) {
    const text = read(file), f = { require, __dirname, console };
    vm.runInNewContext(text.slice(0, text.indexOf("\nlet passed = 0;")) + "\nthis.createGame = loadGame;", f);
    return f.createGame;
}
const loadBase = fixtureLoader("tests/ProjectR_HermesSwordsmanship.test.cjs");

const PLUGIN = "ProjectR_CombatTestArena", PLUGIN_FILE = "js/plugins/ProjectR_CombatTestArena.js";
const ARENA = 4, ROOM = 5;
const production = {}; vm.runInNewContext(read("js/plugins.js"), production);
const keyboardParameters = production.$plugins.find(p => p.name === "Hendrix_Keyboard_Gamepad").parameters;
const coreParams = production.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters;
const REAL_CARDS = JSON.parse(coreParams.CardDefinitions).map(JSON.parse);
const mapInfos = JSON.parse(read("data/MapInfos.json"));
const arenaMap = JSON.parse(read("data/Map004.json")), roomMap = JSON.parse(read("data/Map005.json"));
const tilesets = JSON.parse(read("data/Tilesets.json"));
const enemies = JSON.parse(read("data/Enemies.json"));
const pluginSource = read(PLUGIN_FILE);

// ---------- 静的ヘルパ ----------
const events = map => map.events.filter(Boolean);
const byName = (map, name) => events(map).find(e => e.name === name);
const must = (map, name) => { const e = byName(map, name); assert.ok(e, name); return e; };
const tileAt = (map, x, y, z = 0) => map.data[z * map.width * map.height + y * map.width + x];
const flagsOf = map => tilesets[map.tilesetId].flags;
const passable = (map, x, y) => {
    for (let z = 0; z < 4; z++) {
        const tile = tileAt(map, x, y, z);
        if (tile && (flagsOf(map)[tile] & 0x0f) === 0x0f) return false;
    }
    return tileAt(map, x, y, 0) !== 0;
};
const commandsOf = event => event.pages.flatMap(page => page.list);
const pluginCommandsIn = map => events(map).flatMap(e => commandsOf(e)
    .filter(c => c.code === 357 && c.parameters[0] === PLUGIN).map(c => c.parameters[1]));
const note = event => event.note || "";

// ---------- Playtest用VM ----------
const SEQUENCE = (() => {
    const m = pluginSource.match(/DRAW_SEQUENCE = Object\.freeze\(\[([\s\S]*?)\]\)/);
    return [...m[1].matchAll(/"([a-z_]+)"/g)].map(x => x[1]);
})();
function load({ playtest = true, flipAfterLoad = false, beforePlugin = null } = {}) {
    const g = loadBase({ productionDefinitions: true });
    // loadBase()は旧テスト用の手札を準備する。アリーナ検証は未所持の新規データから始める。
    g.ProjectRCardDeck.endCardBattle();
    g.$gameSystem._projectRCardDeckData = g.ProjectRCardDeck.normalizePersistentData(null, g.ProjectRCardDeck.definitions);
    const params = g.PluginManager.parameters;
    g.PluginManager.parameters = name => ["ProjectR_UltimateGauge", "ProjectR_UltimateActivation", PLUGIN].includes(name) ? {}
        : name === "Hendrix_Keyboard_Gamepad" ? keyboardParameters : params(name);
    for (const file of ["ProjectR_UltimateGodDamageBridge", "ProjectR_UltimateGauge"]) vm.runInContext(read(`js/plugins/${file}.js`), g);
    for (let code = 65; code <= 90; code++) if (!g.Input.keyMapper[code]) g.Input.keyMapper[code] = String.fromCharCode(code).toLowerCase();
    vm.runInContext(read("js/plugins/ProjectR_UltimateActivation.js"), g);

    g.window = g;
    g.playtest = playtest;
    g.Utils = { isOptionValid: name => g.playtest && name === "test" };
    g.mapId = 1;
    g.transfers = []; g.reloads = 0; g.started = 0;
    g.$gameMap.mapId = () => g.mapId;
    g.$gamePlayer.x = 10; g.$gamePlayer.y = 12; g.$gamePlayer.direction = () => 6;
    g.$gamePlayer.reserveTransfer = (...args) => { g.transfers.push(args); };
    g.$gamePlayer.requestMapReload = () => { g.reloads++; };
    g.$dataSystem = { switches: [], startMapId: 1, startX: 3, startY: 4 };
    g.$dataStates = JSON.parse(read("data/States.json"));
    g.states = new Set();
    g.leaderActor = { isStateAffected: id => g.states.has(id), addState: id => g.states.add(id), removeState: id => g.states.delete(id) };
    g.$gameParty.leader = () => g.leaderActor;
    g.stateCalls = [];
    for (const name of ["AddState", "RemoveState"]) {
        g.PluginManager._commands[`Hendrix_Action_Engine:${name}`] = function(args) {
            g.stateCalls.push({ name, args: plain(args) });
            if (name === "AddState") g.states.add(Number(args.stateId)); else g.states.delete(Number(args.stateId));
        };
    }
    g.messages = [];
    g.$gameMessage = { isBusy: () => false, add: line => g.messages.push(line), setBackground() {}, setPositionType() {} };
    g.Scene_Map.prototype.start = function() { g.started++; };
    g.waits = [];
    g.registered = [];
    const register = g.PluginManager.registerCommand;
    g.PluginManager.registerCommand = function(plugin, name, fn) {
        g.registered.push(`${plugin}:${name}`);
        return register ? register.apply(this, arguments) : (g.PluginManager._commands[`${plugin}:${name}`] = fn);
    };
    g.keysBefore = Object.keys(g.$gameSystem).sort();
    g.startBefore = g.Scene_Map.prototype.start;
    if (beforePlugin) beforePlugin(g);
    vm.runInContext(pluginSource, g);
    if (flipAfterLoad) g.playtest = false;
    g.arena = g.ProjectRCombatTestArena;
    g.d = g.ProjectRCardDeck;
    g.command = name => {
        g.messages.length = 0;
        const interpreter = { setWaitMode: mode => g.waits.push(mode) };
        g.PluginManager.callCommand(interpreter, PLUGIN, name, {});
        return g.messages.slice();
    };
    g.mathRandom = () => vm.runInContext("Math.random", g);
    g.tick = (seconds = 0) => { if (seconds) g.d.updateCooldown(seconds); };
    return g;
}
let passed = 0;
function test(name, body) { body(); console.log(`ok ${++passed} - ${name}`); }

// =====================================================================
// 静的検証（マップ/登録）
// =====================================================================
test("2つのマップが読み込め、MapInfosへ重複なく登録され、IDはプラグイン定数と一致する", () => {
    const ids = mapInfos.filter(Boolean).map(info => info.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(mapInfos[ARENA].name, "DEV_CombatTestArena"); assert.equal(mapInfos[ROOM].name, "DEV_CombatTransferRoom");
    assert.equal(mapInfos[ARENA].parentId, 0); assert.equal(mapInfos[ROOM].parentId, 0);
    assert.equal(arenaMap.width, 50); assert.equal(arenaMap.height, 36);
    assert.equal(roomMap.width, 12); assert.equal(roomMap.height, 10);
    for (const map of [arenaMap, roomMap]) {
        assert.equal(map.data.length, map.width * map.height * 6);
        assert.equal(map.tilesetId, 4); assert.equal(map.events[0], null);
        assert.ok(events(map).every((e, i) => e.id === map.events.indexOf(e)), "event id == index");
        assert.equal(map.bgm.name, ""); assert.equal(map.encounterList.length, 0);
    }
    assert.match(pluginSource, /ARENA_MAP_ID = 4;/); assert.match(pluginSource, /TRANSFER_ROOM_MAP_ID = 5;/);
    // 既存マップのIDと衝突しない（MapInfos/Map*.json）。
    const files = fs.readdirSync(path.join(__dirname, "..", "data")).filter(f => /^Map\d{3}\.json$/.test(f));
    assert.deepEqual(files.filter(f => f === "Map004.json" || f === "Map005.json").sort(), ["Map004.json", "Map005.json"]);
});
test("マップのタイルはDungeon tilesetで、通行可/不可が意図どおり（床=通行可、壁=通行不可）", () => {
    const flags = tilesets[4].flags;
    for (const map of [arenaMap, roomMap]) {
        for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
            const tile = tileAt(map, x, y);
            assert.ok(tile >= 1536, `tile at ${x},${y}`);
            const onBorder = x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1;
            if (onBorder) assert.equal(passable(map, x, y), false, `border ${x},${y}`);
            else assert.ok(flags[tile] !== undefined);
        }
    }
    // 床の代表タイルは通行可、壁タイルは通行不可。
    assert.equal(passable(arenaMap, 25, 26), true); assert.equal(passable(arenaMap, 0, 0), false);
});
test("全Eventは通行可のタイル上にあり、重なりもなく、Mapの外へ出ない", () => {
    for (const map of [arenaMap, roomMap]) {
        const seen = new Set();
        for (const e of events(map)) {
            assert.ok(e.x > 0 && e.y > 0 && e.x < map.width - 1 && e.y < map.height - 1, e.name);
            assert.equal(passable(map, e.x, e.y), true, `${e.name} on wall`);
            const key = `${e.x},${e.y}`; assert.ok(!seen.has(key), `overlap ${e.name}`); seen.add(key);
        }
    }
});
test("操作盤Event: 要求の6択+Closeがあり、各分岐が実在のプラグインコマンドを呼ぶ", () => {
    const hub = must(arenaMap, "DEV Control Hub"), list = hub.pages[0].list;
    const choice = list.find(c => c.code === 102);
    assert.deepEqual(choice.parameters[0], ["Start Hermes Test", "Start Apollo Test", "Reset Current Test", "End Card Battle",
        "Show Test Instructions", "Exit Arena", "Close"]);
    assert.equal(choice.parameters[1], 6, "キャンセル=Close（Exitへ流れない）");
    const branchCommands = [];
    let current = -1;
    for (const c of list) {
        if (c.code === 402) { current = c.parameters[0]; branchCommands[current] = []; }
        else if (c.code === 357 && current >= 0) branchCommands[current].push(c.parameters[1]);
        else if (c.code === 404) current = -1;
    }
    assert.deepEqual(branchCommands, [["startHermes"], ["startApollo"], ["resetTest"], ["endTest"], ["showInstructions"], ["exitArena"], []]);
    assert.equal(hub.pages[0].trigger, 0); assert.equal(hub.pages[0].priorityType, 1);
    // 開始位置(25,26)は操作盤(25,24)の2タイル手前で、通行可。
    assert.deepEqual([hub.x, hub.y], [25, 24]); assert.equal(passable(arenaMap, 25, 26), true);
    assert.ok(pluginSource.includes("ARENA_SPAWN = Object.freeze({ x: 25, y: 26, direction: 8 })"));
});
test("Event・プラグインコマンド: すべてプラグインの@commandと登録表に存在する", () => {
    const used = new Set([...pluginCommandsIn(arenaMap), ...pluginCommandsIn(roomMap)]);
    const declared = new Set([...pluginSource.matchAll(/@command (\w+)/g)].map(m => m[1]));
    for (const name of used) assert.ok(declared.has(name), `@command ${name}`);
    const registered = new Set([...pluginSource.matchAll(/(?:registerCommand\(PLUGIN_NAME, "(\w+)"|^\s{12}(\w+): \[")/gm)].map(m => m[1] || m[2]));
    for (const name of declared) assert.ok(registered.has(name), `registered ${name}`);
    for (const name of ["startHermes", "startApollo", "resetTest", "endTest", "showInstructions", "exitArena", "gaugeAdd25",
        "gaugeFill", "divineAreaHit", "divineGlobalHit", "collapseGod", "applySleep", "showStatus"]) assert.ok(used.has(name), name);
});
test("射撃レーン: 標的が<enemy>+<hp: 魔獣>で、立ち位置から10タイル以上の通行可の直線があり、距離1/3/5/8に目印", () => {
    const target = must(arenaMap, "DEV Projectile Target");
    assert.match(note(target), /<enemy>/); assert.match(note(target), /<hp: 魔獣>/);
    assert.equal(enemies.find(e => e && e.name === "魔獣").params[0], 1000);
    const stand = { x: 28, y: 6 };
    assert.equal(target.y, stand.y);
    assert.ok(target.x - stand.x >= 10, "レーン長");
    for (let x = stand.x; x <= target.x; x++) assert.equal(passable(arenaMap, x, stand.y), true, `lane ${x}`);
    for (const e of events(arenaMap)) {
        if (e.y === stand.y && e.x > stand.x && e.x < target.x) assert.fail(`${e.name} blocks the lane`);
    }
    const floor = tileAt(arenaMap, stand.x + 2, stand.y);
    for (const d of [1, 3, 5, 8]) assert.notEqual(tileAt(arenaMap, stand.x + d, stand.y), floor, `marker ${d}`);
    for (const d of [2, 4, 6, 7]) assert.equal(tileAt(arenaMap, stand.x + d, stand.y), floor, `no marker ${d}`);
    // 扇状の矢のための周囲の余白（上下2タイル以上）。
    for (const dy of [-2, -1, 1, 2]) for (let x = stand.x; x <= target.x; x++) assert.equal(passable(arenaMap, x, stand.y + dy), true);
});
test("敵ダミー: 複数ダミー3体(近接)・タンク1体・標的は、既存の<enemy>構造で攻撃/移動AIを持たない", () => {
    const multi = events(arenaMap).filter(e => /^DEV Multi Dummy/.test(e.name));
    assert.equal(multi.length, 3);
    for (const a of multi) for (const b of multi) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) <= 3, "近接");
    const tank = must(arenaMap, "DEV Tank Dummy");
    const dummies = [...multi, tank, must(arenaMap, "DEV Projectile Target")];
    const existing = JSON.parse(read("data/Map001.json")).events.filter(Boolean).find(e => e.name === "公式銃テスト敵");
    for (const e of dummies) {
        assert.equal(note(e), note(existing).replace("ゴブリン", "魔獣"), e.name);   // 既存の公式テスト敵と同じ構造（HP定義だけ高HPの既存敵「魔獣」）
        const page = e.pages[0];
        assert.equal(page.moveType, 0); assert.equal(page.trigger, existing.pages[0].trigger);
        assert.equal(page.priorityType, 1); assert.equal(page.through, false);
        assert.deepEqual(plain(page.list), plain(existing.pages[0].list), "既存と同じ待機のみ");
        assert.equal(e.pages.length, 1);
    }
    // 敵以外のEventに<enemy>を付けていない。
    for (const e of events(arenaMap).filter(e => !dummies.includes(e))) assert.doesNotMatch(note(e), /<enemy>|<hp:/);
    assert.equal(events(roomMap).filter(e => /<enemy>/.test(note(e))).length, 0);
    // タンク/標的/複数ダミーは互いに別の画面領域（敵は十分離れている）。
    assert.ok(Math.hypot(tank.x - multi[0].x, tank.y - multi[0].y) > 20);
});
test("衝突コース: 直線壁/壁の向こうが空き地/L字/階段状の斜め壁/通れないEventがあり、立ち位置が通行可", () => {
    const stands = [[5, 3], [4, 7], [20, 6], [13, 7], [9, 3]];
    for (const [x, y] of stands) assert.equal(passable(arenaMap, x, y), true, `stand ${x},${y}`);
    // (a) 直線の壁: 立ち位置(5,3)の東2タイル先が壁、間は通行可
    assert.equal(passable(arenaMap, 6, 3), true); assert.equal(passable(arenaMap, 7, 3), false);
    assert.equal(passable(arenaMap, 5, 2), false); assert.equal(passable(arenaMap, 5, 4), false, "通路の側壁");
    // (b) 壁の向こうが空き地: (4,7)から東、壁(6,7)の向こう(7..11,7)は通行可
    assert.equal(passable(arenaMap, 5, 7), true); assert.equal(passable(arenaMap, 6, 7), false);
    for (let x = 7; x <= 11; x++) assert.equal(passable(arenaMap, x, 7), true, `behind ${x}`);
    assert.equal(passable(arenaMap, 6, 5), true, "壁の端(上)は通行可で、回り込める薄い壁");
    // (c) L字: 水平(19..23,3)と垂直(23,3..8)
    for (let x = 19; x <= 23; x++) assert.equal(passable(arenaMap, x, 3), false);
    for (let y = 3; y <= 8; y++) assert.equal(passable(arenaMap, 23, y), false);
    assert.equal(passable(arenaMap, 22, 4), true); assert.equal(passable(arenaMap, 20, 6), true);
    // (d) 階段状の斜め壁: x+y=23 の5マス。対角に隣接し、斜めの隙間は壁で挟まれる。
    const stairs = [[13, 10], [14, 9], [15, 8], [16, 7], [17, 6]];
    for (const [x, y] of stairs) assert.equal(passable(arenaMap, x, y), false, `stair ${x},${y}`);
    for (let i = 0; i < stairs.length - 1; i++) {
        assert.equal(stairs[i + 1][0] - stairs[i][0], 1); assert.equal(stairs[i][1] - stairs[i + 1][1], 1);
        assert.equal(passable(arenaMap, stairs[i][0], stairs[i + 1][1]), true, "角を通る側は空き");
    }
    assert.equal(passable(arenaMap, 14, 8), true); assert.equal(passable(arenaMap, 15, 9), true);
    // 通れないEvent: 敵ではなく、通行可タイル上で優先度は通常・すり抜けなし・背後は空き地
    const blocker = must(arenaMap, "DEV Impassable Event");
    assert.deepEqual([blocker.x, blocker.y], [11, 3]);
    assert.equal(blocker.pages[0].priorityType, 1); assert.equal(blocker.pages[0].through, false);
    assert.equal(blocker.pages[0].image.characterName, "!Chest"); assert.doesNotMatch(note(blocker), /<enemy>|<hp:/);
    assert.equal(passable(arenaMap, 10, 3), true); for (let x = 12; x <= 16; x++) assert.equal(passable(arenaMap, x, 3), true);
    // 敵ダミーの見た目(Monster)と明確に区別できる
    for (const e of events(arenaMap).filter(e => /<enemy>/.test(note(e)))) assert.notEqual(e.pages[0].image.characterName, blocker.pages[0].image.characterName);
});
test("Divine/Ultimate研究室: 6つの操作端末と状態端末があり、通行できる位置に立てる", () => {
    const expected = { "DEV Gauge +25": "gaugeAdd25", "DEV Gauge Fill": "gaugeFill", "DEV Divine Area Hit -25": "divineAreaHit",
        "DEV Divine Global Hit -25": "divineGlobalHit", "DEV Collapse God": "collapseGod", "DEV Apply Sleep": "applySleep",
        "DEV Status Terminal (Lab)": "showStatus" };
    for (const [name, command] of Object.entries(expected)) {
        const e = must(arenaMap, name);
        assert.equal(e.pages[0].trigger, 0); assert.equal(e.pages[0].through, false);
        assert.deepEqual(commandsOf(e).filter(c => c.code === 357).map(c => c.parameters[1]), [command]);
        assert.equal(passable(arenaMap, e.x, e.y + 1), true, `${name}の手前に立てる`);
    }
    assert.ok(must(arenaMap, "DEV Status Terminal (Hub)"));
});
test("マップ移動テスト: 門が互いの正しいDEVマップへ飛び、到着点は通行可で門の上ではない", () => {
    const gate = must(arenaMap, "DEV Gate to Transfer Room"), back = must(roomMap, "DEV Return Gate");
    const t1 = commandsOf(gate).filter(c => c.code === 201), t2 = commandsOf(back).filter(c => c.code === 201);
    assert.equal(t1.length, 1); assert.equal(t2.length, 1);
    assert.deepEqual(t1[0].parameters.slice(0, 2), [0, ROOM]); assert.deepEqual(t2[0].parameters.slice(0, 2), [0, ARENA]);
    const [, , rx, ry] = t1[0].parameters; assert.equal(passable(roomMap, rx, ry), true);
    assert.ok(!(rx === back.x && ry === back.y));
    const [, , ax, ay] = t2[0].parameters; assert.equal(passable(arenaMap, ax, ay), true);
    assert.ok(!(ax === gate.x && ay === gate.y));
    assert.equal(gate.pages[0].trigger, 1); assert.equal(back.pages[0].trigger, 1);
    // 各マップのEventが他のマップIDへ遷移しない。
    for (const map of [arenaMap, roomMap]) {
        const targets = events(map).flatMap(e => commandsOf(e).filter(c => c.code === 201).map(c => c.parameters[1]));
        assert.ok(targets.every(id => id === ARENA || id === ROOM));
    }
    assert.ok(must(roomMap, "DEV Status Terminal (Room)")); assert.ok(must(roomMap, "DEV End Battle Terminal (Room)"));
});
test("本番マップ/共通イベント/Systemからアリーナへの入口がなく、通常のNew Gameは開始マップのまま", () => {
    const files = fs.readdirSync(path.join(__dirname, "..", "data")).filter(f => /^(Map\d+|CommonEvents|System)\.json$/.test(f))
        .filter(f => f !== "Map004.json" && f !== "Map005.json");
    for (const file of files) {
        const data = JSON.parse(read(`data/${file}`));
        const text = JSON.stringify(data);
        assert.doesNotMatch(text, /CombatTestArena|DEV_Combat/, file);
        const list = Array.isArray(data) ? data : data.events || [];
        for (const e of list.filter(Boolean)) for (const c of (e.pages ? e.pages.flatMap(p => p.list) : e.list || [])) {
            if (c.code === 201 && c.parameters[0] === 0) assert.ok(![ARENA, ROOM].includes(c.parameters[1]), `${file} -> arena`);
            if (c.code === 201 && c.parameters[0] === 1) assert.ok(true);
        }
    }
    const system = JSON.parse(read("data/System.json"));
    assert.ok(![ARENA, ROOM].includes(system.startMapId));
    assert.equal(production.$plugins.find(p => p.name === PLUGIN).parameters && Object.keys(production.$plugins.find(p => p.name === PLUGIN).parameters).length, 0);
});
test("プラグイン登録: CardDeckCore/Manager/Gauge/Bridge/Hendrixの後で一度だけ有効、実ファイル名と一致", () => {
    const list = production.$plugins, index = list.findIndex(p => p.name === PLUGIN);
    assert.equal(list.filter(p => p.name === PLUGIN).length, 1); assert.equal(list[index].status, true);
    for (const base of ["Hendrix_Action_Engine", "ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateGodDamageBridge",
        "ProjectR_UltimateGauge", "ProjectR_UltimateActivation", "ProjectR_ApolloUltimate", "ProjectR_HermesUltimate"]) {
        assert.ok(index > list.findIndex(p => p.name === base), base);
    }
    assert.ok(fs.existsSync(path.join(__dirname, "..", PLUGIN_FILE)));
    for (const base of ["ProjectR_CardDeckCore", "ProjectR_GodSummonManager", "ProjectR_UltimateGauge", "ProjectR_UltimateGodDamageBridge", "Hendrix_Action_Engine"]) {
        assert.match(pluginSource, new RegExp(`@base ${base}\\b`));
    }
});
test("プラグインはPlaytestでガードされ、ガードより前にAPI/コマンド/フックを作らない", () => {
    const guardAt = pluginSource.indexOf('if (!isPlaytest()) return;');
    assert.ok(guardAt > 0); assert.match(pluginSource, /Utils\.isOptionValid\("test"\)/);
    for (const marker of ["root.ProjectRCombatTestArena =", "PluginManager.registerCommand(", "Scene_Map.prototype.start =", "const registerCommands"]) {
        assert.ok(pluginSource.indexOf(marker) > guardAt, marker);
    }
    // 保存データへ書き込むAPIを増やしていない（実行時状態のみ）。
    assert.doesNotMatch(pluginSource, /_projectRCombatTestArena|\$gameSystem\._(?!projectRCardDeckData)/);
    assert.doesNotMatch(pluginSource, /DataManager\.(makeSaveContents|extractSaveContents|saveGame)/);
});
test("Core/Manager/Gauge/Bridge/Activation/全カード/Hendrix/DotMoveは変更されていない", () => {
    const protectedFiles = ["ProjectR_CardDeckCore", "ProjectR_CardBattleInput", "ProjectR_GodSummonManager", "ProjectR_UltimateGauge",
        "ProjectR_UltimateGodDamageBridge", "ProjectR_UltimateActivation",
        "ProjectR_HermesUltimate", "ProjectR_ApolloUltimate", "ProjectR_ApolloGoldenArrow", "ProjectR_ApolloDiseaseAttack",
        "ProjectR_ApolloLyreCalm", "ProjectR_HermesRecognitionObscure", "ProjectR_HermesReedFluteSleep",
        "ProjectR_HermesSwiftMovement", "ProjectR_HermesSwordsmanship", "Hendrix_Action_Engine", "DotMoveSystem"]
        .map(name => `js/plugins/${name}.js`);
    const result = cp.spawnSync("git", ["diff", "--quiet", "0e11dda", "--", ...protectedFiles], { cwd: path.join(__dirname, "..") });
    assert.equal(result.status, 0, "保護対象ファイルが0e11dda(RT1)から変更されている");
});

// =====================================================================
// 実行時検証（Playtest有効）
// =====================================================================
test("7枚の実カードは本番定義そのもの（ここで未知カードを追加しない）", () => {
    const g = load();
    assert.deepEqual(REAL_CARDS.map(c => c.cardId).sort(), [...new Set(SEQUENCE)].sort());
    assert.equal(g.d.definitions.cardDefinitions().length, 7);
    assert.equal(SEQUENCE.length, 7);
});
test("enter(): 戻り先(map/x/y/向き)を実行時だけ記録しアリーナ入口へ移動、アリーナ内では上書きしない", () => {
    const g = load();
    const result = g.arena.enter();
    assert.equal(result.ok, true);
    assert.deepEqual(plain(g.transfers[0]), [ARENA, 25, 26, 8, 0]);
    assert.deepEqual(plain(g.arena.status().returnPoint), { mapId: 1, x: 10, y: 12, direction: 6 });
    g.mapId = ARENA; g.$gamePlayer.x = 30; g.$gamePlayer.y = 30;
    g.arena.enter();
    assert.deepEqual(plain(g.arena.status().returnPoint), { mapId: 1, x: 10, y: 12, direction: 6 }, "アリーナ内の再enterで戻り先を上書きしない");
    assert.equal(g.reloads, 1, "同じマップへの再enterは読み直しを要求");
    // 保存データへ戻り先を持たせない。
    assert.deepEqual(Object.keys(g.$gameSystem).sort(), g.keysBefore);
});
test("Hermesテスト: 実カード7枚の30枚fixtureで戦闘開始、指輪/神/Divine/Gaugeが仕様どおり", () => {
    const g = load(); g.mapId = ARENA;
    const result = g.arena.startHermes();
    assert.equal(result.ok, true, JSON.stringify(plain(result)));
    assert.equal(result.handMatchesFixture, true);
    assert.deepEqual(plain(g.d.getBattleState().hand.map(c => c.cardId)), SEQUENCE.slice(0, 5));
    assert.equal(g.d.isCardBattleActive(), true);
    assert.equal(g.d.hasPlayerRing("hermes"), true); assert.equal(g.d.hasPlayerRing("apollo"), true);
    assert.equal(g.d.getUltimateRingId(), "hermes");
    const god = g.ProjectRGodSummonManager.getPersistentUltimateBattleState();
    assert.equal(god.godId, "hermes"); assert.equal(god.divineHp, 100); assert.equal(god.maxDivineHp, 100); assert.equal(god.status, "active");
    assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 0); assert.equal(g.ProjectRUltimateGauge.getUltimateGaugeMax(), 100);
    const state = g.d.getBattleState();
    assert.equal(state.drawPile.length + state.hand.length + state.discardPile.length + state.cooldownPile.length, 30);
    const counts = {}; for (const c of [...state.drawPile, ...state.hand]) counts[c.cardId] = (counts[c.cardId] || 0) + 1;
    assert.deepEqual(Object.keys(counts).sort(), [...new Set(SEQUENCE)].sort());
    assert.ok(Object.values(counts).every(n => n >= 4 && n <= 5));
});
test("Apolloテスト: 同じ7枚で、常駐Ultimate神だけがApollo", () => {
    const g = load(); g.mapId = ARENA;
    assert.equal(g.arena.startApollo().ok, true);
    assert.equal(g.d.getUltimateRingId(), "apollo");
    assert.equal(g.ProjectRGodSummonManager.getPersistentUltimateGodId(), "apollo");
    assert.deepEqual(plain(g.d.getBattleState().hand.map(c => c.cardId)), SEQUENCE.slice(0, 5));
    assert.equal(g.d.hasPlayerRing("hermes"), true);
});
test("本番の検証は不変: maxCopies・30枚検証・保存デッキ・Math.randomが元に戻る", () => {
    const g = load(); g.mapId = ARENA;
    const before = plain(g.d.definitions.cardDefinitions());
    const randomBefore = g.mathRandom();
    const deckBefore = plain(g.d.getDeck());
    assert.equal(g.arena.startHermes().ok, true);
    assert.deepEqual(plain(g.d.definitions.cardDefinitions()), before, "maxCopies等の定義が戻っている");
    for (const card of g.d.definitions.cardDefinitions()) assert.equal(Object.isFrozen(card), true);
    assert.equal(g.mathRandom(), randomBefore, "Math.random復元");
    assert.deepEqual(plain(g.d.getDeck()), deckBefore, "保存デッキを変更しない");
    // fixtureそのものは本番ルールでは不正（同じ30枚を本番検証へかけると拒否される）。
    const fixture = [...Array(30)].map((_, i) => SEQUENCE[i % 7]);
    const reasons = plain(g.d.getDeckInvalidReasons(fixture)).map(r => r.code);
    assert.ok(reasons.includes("MAX_COPIES_EXCEEDED"), reasons.join());
    assert.equal(g.d.isDeckValid(fixture), false);
    assert.equal(g.d.canStartBossBattle(fixture), false);
    // 戦闘中に新しいstartCardBattleを本番ルールで呼ぶと、以前と同じく拒否される。
    g.d.endCardBattle();
    const rejected = g.d.startCardBattle(fixture);
    assert.equal(rejected.ok, false); assert.equal(g.d.isCardBattleActive(), false);
    // 保存デッキが空の本番データは、従来どおり不正サイズ。
    assert.equal(g.d.startCardBattle().ok, false);
});
test("通常の引き: カード使用で左詰め・即補充・COOLDOWN増加、クールダウン完了でDISCARDへ（実Coreの挙動）", () => {
    const g = load(); g.mapId = ARENA; g.arena.startHermes();
    const first = g.d.requestUseCard(0);
    const hand = () => plain(g.d.getBattleState().hand.map(c => c.cardId));
    assert.ok(["success", "activationFailed", "cardUnavailable"].includes(first.reason));
    if (first.ok) {
        assert.deepEqual(hand(), [SEQUENCE[1], SEQUENCE[2], SEQUENCE[3], SEQUENCE[4], SEQUENCE[5]]);
        assert.equal(g.d.getBattleState().cooldownPile.length, 1);
    }
    // 直接の使用(useBattleCard)でも同じ順で補充される。
    const state = g.d.getBattleState();
    g.d.useBattleCard(state.hand[0].instanceId);
    assert.equal(g.d.getBattleState().hand.length, 5);
    g.d.updateCooldown(60);
    assert.equal(g.d.getBattleState().cooldownPile.length, 0);
    assert.ok(g.d.getBattleState().discardPile.length >= 1);
});
test("Gauge: +25は何度でも押せて100で止まり、満タンはgaugeFull、Fillは100へ、gainIdを消費しない", () => {
    const g = load(); g.mapId = ARENA; g.arena.startHermes();
    const gauge = g.ProjectRUltimateGauge;
    for (const expected of [25, 50, 75, 100]) {
        assert.equal(g.arena.gaugeAdd25().ok, true);
        assert.equal(gauge.getUltimateGauge(), expected);
    }
    assert.equal(gauge.getUltimateGauge(), 100);
    assert.equal(plain(g.arena.gaugeAdd25()).reason, "gaugeFull");
    assert.equal(gauge.getUltimateGaugeGainCount(), 0, "gainIdを使わない");
    g.arena.startHermes(); assert.equal(gauge.getUltimateGauge(), 0);
    g.arena.gaugeAdd25(); assert.equal(g.arena.fillGauge().ok, true); assert.equal(gauge.getUltimateGauge(), 100);
    assert.equal(gauge.isUltimateGaugeFull(), true); assert.equal(gauge.isUltimateReady(), true);
    assert.equal(plain(g.arena.fillGauge()).reason, "gaugeFull");
    // 戦闘外ではGaugeがなく、理由をそのまま返す。
    g.arena.endTest(); assert.equal(plain(g.arena.gaugeAdd25()).reason, "noUltimateGauge");
    assert.equal(plain(g.arena.fillGauge()).reason, "noUltimateGauge");
});
test("Divine: 範囲/全体を毎回新しい攻撃IDで25ずつ、崩壊は実Bridge経由、手動でHPを書き換えない", () => {
    const g = load(); g.mapId = ARENA; g.arena.startHermes();
    const manager = g.ProjectRGodSummonManager, bridge = g.ProjectRUltimateGodDamageBridge;
    const a = g.arena.damageDivineArea(); assert.equal(a.ok, true); assert.equal(a.hit, true);
    assert.equal(a.damage, 25); assert.equal(manager.getPersistentUltimateDivineHp(), 75); assert.equal(a.distance, 0);
    const b = g.arena.damageDivineGlobal(); assert.equal(b.ok, true); assert.equal(manager.getPersistentUltimateDivineHp(), 50);
    assert.equal(g.arena.damageDivineArea().ok, true); assert.equal(manager.getPersistentUltimateDivineHp(), 25);
    assert.equal(bridge.getRegisteredAttackCount(), 3, "攻撃IDは毎回新規");
    const c = g.arena.collapseGod(); assert.equal(c.ok, true); assert.equal(c.collapsed, true);
    assert.equal(manager.getPersistentUltimateDivineHp(), 0); assert.equal(manager.isPersistentUltimateCollapsed(), true);
    assert.equal(manager.getPersistentUltimateRecoveryRemainingSeconds(), 15);
    // 崩壊中: 範囲/全体/再崩壊は実Managerが拒否する。
    for (const reason of [plain(g.arena.damageDivineArea()).reason, plain(g.arena.damageDivineGlobal()).reason]) {
        assert.ok(["notManifested", "collapsed"].includes(reason), reason);
    }
    assert.equal(plain(g.arena.collapseGod()).reason, "collapsed");
    // Gauge: 満タンでも神が崩壊中ならreadyではない。
    g.arena.fillGauge(); assert.equal(g.ProjectRUltimateGauge.isUltimateGaugeFull(), true);
    assert.equal(g.ProjectRUltimateGauge.isUltimateReady(), false);
    // 回復は本物の15秒（調整・即時回復APIなし）。50%で復帰。
    g.tick(14.9); assert.equal(manager.isPersistentUltimateCollapsed(), true);
    g.tick(0.2); assert.equal(manager.isPersistentUltimateCollapsed(), false);
    assert.equal(manager.getPersistentUltimateDivineHp(), 50);
    assert.equal(g.ProjectRUltimateGauge.isUltimateReady(), true);
    assert.equal(Object.keys(g.arena).some(k => /recover|instant/i.test(k)), false, "即時回復の本番APIを足さない");
    assert.doesNotMatch(pluginSource, /recoveryRemaining\s*=|\.hp\s*=|battle\.hp|setPersistent/);
});
test("崩壊前の戦闘外/神なしでは、Divine操作は実APIの理由を返し何も変えない", () => {
    const g = load(); g.mapId = ARENA;
    for (const name of ["damageDivineArea", "damageDivineGlobal", "collapseGod"]) {
        const result = plain(g.arena[name]());
        assert.equal(result.ok, false, name); assert.ok(["noPersistentUltimate", "notManifested", "managerUnavailable"].includes(result.reason), result.reason);
    }
    assert.equal(g.d.isCardBattleActive(), false);
});
test("睡眠付与はHendrix公式AddState(State 32)を使い、endTestで解除される", () => {
    const g = load(); g.mapId = ARENA; g.arena.startApollo();
    const result = g.arena.applySleep();
    assert.equal(result.ok, true); assert.equal(result.stateId, 32);
    assert.deepEqual(g.stateCalls.at(-1), { name: "AddState", args: { target: "player", stateId: "32" } });
    assert.equal(g.states.has(32), true); assert.equal(g.arena.status().sleeping, true);
    g.arena.endTest();
    assert.equal(g.states.has(32), false); assert.equal(g.stateCalls.at(-1).name, "RemoveState");
    assert.equal(g.$dataStates[32].name, "睡眠");
});
test("endTest: 戦闘・神・Gaugeを終了し、アリーナが変えた指輪/カード所持を開始前へ戻す", () => {
    const g = load(); g.mapId = ARENA;
    const before = plain(g.d.getPersistentData());
    assert.equal(g.d.hasPlayerRing("hermes"), false);
    g.arena.startHermes(); assert.equal(g.d.hasPlayerRing("hermes"), true); assert.equal(g.d.isCardBattleActive(), true);
    const ended = g.arena.endTest();
    assert.equal(ended.ok, true); assert.equal(ended.wasActive, true); assert.equal(ended.restored, true);
    assert.equal(g.d.isCardBattleActive(), false);
    assert.equal(g.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), false);
    assert.equal(g.ProjectRUltimateGauge.hasUltimateGaugeState(), false);
    assert.deepEqual(plain(g.d.getPersistentData()), before);
    assert.equal(g.arena.status().scenario, null);
    // 二重のendTestは無害。
    assert.equal(g.arena.endTest().restored, false);
});
test("Hermes→Apolloと連続で開始しても、元のデータへ戻る（スナップショットは最初の一度だけ）", () => {
    const g = load(); g.mapId = ARENA;
    const before = plain(g.d.getPersistentData());
    g.arena.startHermes(); g.arena.startApollo(); g.arena.startHermes();
    assert.equal(g.d.getUltimateRingId(), "hermes");
    g.arena.endTest();
    assert.deepEqual(plain(g.d.getPersistentData()), before);
});
test("既存の個別所持データ(例: 元からApolloだけ所持)があれば、endTestで元の状態へ戻る", () => {
    const g = load(); g.mapId = ARENA;
    g.d.assignRingToPlayer("apollo"); g.d.setCardOwned("apollo_golden_arrow"); g.d.setCardLevel("apollo_golden_arrow", 2);
    const before = plain(g.d.getPersistentData());
    g.arena.startApollo(); g.arena.endTest();
    assert.deepEqual(plain(g.d.getPersistentData()), before);
    assert.equal(g.d.hasPlayerRing("hermes"), false);
});
test("resetScenario: 戦闘を終了しマップ読み直し+入口へ移動、読み直し後のScene_Map.startで同じシナリオを再開", () => {
    const g = load(); g.mapId = ARENA;
    g.arena.startApollo(); g.arena.gaugeAdd25(); g.arena.damageDivineGlobal();
    const result = g.arena.resetScenario();
    assert.equal(result.ok, true); assert.equal(result.scenario, "apollo");
    assert.equal(g.reloads, 1); assert.deepEqual(plain(g.transfers.at(-1)), [ARENA, 25, 26, 8, 0]);
    assert.equal(g.d.isCardBattleActive(), false, "読み直し前は戦闘なし");
    g.Scene_Map.prototype.start.call(g.SceneManager._scene);
    assert.equal(g.d.isCardBattleActive(), true);
    assert.equal(g.ProjectRGodSummonManager.getPersistentUltimateGodId(), "apollo");
    assert.equal(g.ProjectRGodSummonManager.getPersistentUltimateDivineHp(), 100);
    assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 0);
    assert.equal(g.started, 1, "元のScene_Map.startも実行");
    // 再開は一度だけ。
    g.d.endCardBattle(); g.Scene_Map.prototype.start.call(g.SceneManager._scene);
    assert.equal(g.d.isCardBattleActive(), false);
    // シナリオ未開始のresetはマップ読み直しだけ。
    const g2 = load(); g2.mapId = ARENA;
    assert.equal(g2.arena.resetScenario().willRestart, false);
    g2.Scene_Map.prototype.start.call(g2.SceneManager._scene); assert.equal(g2.d.isCardBattleActive(), false);
    // アリーナ以外のマップではpendingを実行しない。
    const g3 = load(); g3.mapId = ARENA; g3.arena.startHermes(); g3.arena.resetScenario(); g3.mapId = ROOM;
    g3.Scene_Map.prototype.start.call(g3.SceneManager._scene); assert.equal(g3.d.isCardBattleActive(), false);
});
test("exit(): 戦闘終了+データ復元の後、記録した戻り先へ移動。無ければゲーム既定の開始位置へ", () => {
    const g = load();
    g.arena.enter(); g.mapId = ARENA; g.arena.startHermes();
    const result = g.arena.exit();
    assert.equal(result.ok, true); assert.equal(result.usedFallback, false);
    assert.deepEqual(plain(g.transfers.at(-1)), [1, 10, 12, 6, 0]);
    assert.equal(g.d.isCardBattleActive(), false); assert.equal(g.d.hasPlayerRing("hermes"), false);
    assert.equal(g.arena.status().returnPoint, null);
    const again = g.arena.exit();
    assert.equal(again.usedFallback, true); assert.deepEqual(plain(g.transfers.at(-1)), [1, 3, 4, 2, 0]);
});
test("マップ移動(DEV部屋): 神とGaugeはManager/Gaugeの既存処理で消え、カード戦闘は継続する現仕様を変えない", () => {
    const g = load(); g.mapId = ARENA; g.arena.startHermes(); g.arena.fillGauge();
    g.Game_Map.prototype.setup = g.Game_Map.prototype.setup || function() {};
    g.$gameMap.setup(ROOM); g.mapId = ROOM;
    assert.equal(g.d.isCardBattleActive(), true, "カード戦闘は継続");
    assert.equal(g.ProjectRGodSummonManager.hasPersistentUltimateBattleState(), false);
    assert.equal(g.ProjectRUltimateGauge.hasUltimateGaugeState(), false);
    assert.equal(g.d.getBattleState().hand.length, 5);
    assert.equal(g.arena.status().inTransferRoom, true);
    assert.ok(g.arena.statusLines().join("\n").includes("神: なし"));
});
test("プラグインコマンド: 結果をメッセージ(上寄せ)で表示し、各コマンドが実APIへ届く", () => {
    const g = load(); g.mapId = ARENA;
    assert.match(g.command("gaugeAdd25").join(" "), /NG.*Gaugeがありません/);
    let lines = g.command("startHermes"); assert.match(lines[0], /Hermesテスト開始: OK/); assert.equal(g.waits.at(-1), "message");
    assert.equal(g.d.isCardBattleActive(), true);
    assert.match(g.command("gaugeAdd25")[0], /OK/); assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 25);
    assert.match(g.command("gaugeFill")[0], /OK/); assert.equal(g.ProjectRUltimateGauge.getUltimateGauge(), 100);
    assert.match(g.command("divineAreaHit")[0], /OK/); assert.match(g.command("divineGlobalHit")[0], /OK/);
    assert.equal(g.ProjectRGodSummonManager.getPersistentUltimateDivineHp(), 50);
    assert.match(g.command("collapseGod")[0], /OK/);
    assert.match(g.command("divineAreaHit")[0], /NG.*崩壊中/);
    assert.match(g.command("applySleep")[0], /OK/); assert.equal(g.states.has(32), true);
    const status = g.command("showStatus"); assert.equal(status.length, 4); assert.match(status[1], /崩壊|collapsed/);
    assert.match(status.join("\n"), /Ultimateキー:U/);
    assert.ok(g.command("showInstructions").some(line => /1〜5.*カード/.test(line)));
    assert.match(g.command("startApollo")[0], /OK/); assert.equal(g.ProjectRGodSummonManager.getPersistentUltimateGodId(), "apollo");
    g.command("endTest"); assert.equal(g.d.isCardBattleActive(), false); assert.equal(g.states.has(32), false);
    g.command("exitArena"); assert.deepEqual(plain(g.transfers.at(-1)), [1, 3, 4, 2, 0]);
    g.command("resetTest"); assert.deepEqual(plain(g.transfers.at(-1)), [ARENA, 25, 26, 8, 0]);
    assert.ok(g.registered.every(name => name.startsWith(`${PLUGIN}:`)));
    assert.equal(g.registered.length, 13);
});
test("開始前のゲームは何も変えない: 読み込みだけでは戦闘も移動も保存データ変更も起きない（New Gameで自動入場しない）", () => {
    const g = load();
    assert.equal(g.transfers.length, 0); assert.equal(g.d.isCardBattleActive(), false);
    assert.deepEqual(Object.keys(g.$gameSystem).sort(), g.keysBefore);
    assert.equal(g.d.hasPlayerRing("hermes"), false);
    g.arena.startHermes(); g.arena.endTest();
    assert.deepEqual(Object.keys(g.$gameSystem).sort(), g.keysBefore, "アリーナ操作後も保存フィールドを増やさない");
    assert.equal(JSON.stringify(g.DataManager.makeSaveContents().system).includes("Arena"), false);
});
test("ステータス表示: 神・Divine HP・Gauge・Ultimateキー・DRAW/DISCARD/COOLDOWNを実システムから読む", () => {
    const g = load(); g.mapId = ARENA;
    assert.match(g.arena.statusLines()[3], /手札: なし/);
    g.arena.startApollo(); g.arena.gaugeAdd25(); g.arena.damageDivineGlobal();
    const lines = g.arena.statusLines();
    assert.match(lines[0], /戦闘:ON.*apollo/); assert.match(lines[1], /APOLLO.*75\/100.*active/);
    assert.match(lines[2], /Gauge 25\/100.*full:false.*ready:false.*U/);
    assert.match(lines[3], /DRAW 25 \/ DISCARD 0 \/ COOLDOWN 0/);
    const s = g.arena.status();
    assert.deepEqual(plain(s.hand), SEQUENCE.slice(0, 5)); assert.equal(s.ultimateKey, "U");
    assert.equal(g.arena.instructions().length, 2);
});

// =====================================================================
// 配布版（Playtestでない）: 何も公開せず、何も変えない
// =====================================================================
test("配布版: グローバルAPI・プラグインコマンド・Scene_Mapフックを作らない", () => {
    const g = load({ playtest: false });
    assert.equal(g.ProjectRCombatTestArena, undefined);
    assert.deepEqual(plain(g.registered), []);
    assert.equal(g.Scene_Map.prototype.start, g.startBefore);
    assert.equal(g.command("startHermes").length, 0);
    assert.equal(g.d.isCardBattleActive(), false); assert.equal(g.transfers.length, 0);
    assert.equal(g.d.hasPlayerRing("hermes"), false);
});
test("Playtestが途中で無効になっても、変更系API/コマンドはすべて拒否され何も変えない", () => {
    const g = load({ flipAfterLoad: true });
    const calls = ["enter", "exit", "startHermes", "startApollo", "resetScenario", "endTest", "gaugeAdd25", "fillGauge",
        "damageDivineArea", "damageDivineGlobal", "collapseGod", "applySleep"];
    const before = plain(g.d.getPersistentData());
    for (const name of calls) {
        const result = plain(g.arena[name]());
        assert.equal(result.ok, false, name); assert.equal(result.reason, "notPlaytest", name);
    }
    assert.equal(plain(g.arena.startScenario("hermes")).reason, "notPlaytest");
    assert.equal(plain(g.arena.addGauge(25)).reason, "notPlaytest");
    for (const name of ["startHermes", "startApollo", "resetTest", "endTest", "exitArena", "gaugeAdd25", "gaugeFill", "divineAreaHit",
        "divineGlobalHit", "collapseGod", "applySleep", "showStatus", "showInstructions"]) {
        assert.equal(g.command(name).length, 0, name);
    }
    assert.equal(g.transfers.length, 0); assert.equal(g.d.isCardBattleActive(), false);
    assert.deepEqual(plain(g.d.getPersistentData()), before); assert.equal(g.stateCalls.length, 0);
    // Scene_Map.startのpending実行もPlaytest外では何もしない。
    g.Scene_Map.prototype.start.call(g.SceneManager._scene); assert.equal(g.d.isCardBattleActive(), false);
    assert.equal(g.arena.isPlaytest(), false);
});
test("MZ公式の判定(Utils.isOptionValid(\"test\"))だけに依存し、他の隠しスイッチを持たない", () => {
    assert.equal([...pluginSource.matchAll(/isOptionValid\(/g)].length, 1);
    assert.doesNotMatch(pluginSource, /localStorage|location\.|process\.env|window\.DEBUG|\$gameTemp\.isPlaytest/);
    assert.doesNotMatch(pluginSource, /@param/, "本番で調整できるパラメータを持たない");
});
test("Core変更なし: テスト用の入口を本番ファイルに足していない（差分にtest/debug/arenaを含まない）", () => {
    const diff = cp.spawnSync("git", ["diff", "0e11dda", "--", "js/plugins/ProjectR_CardDeckCore.js"], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
    assert.equal(diff.stdout, "");
});

console.log(`\n${passed} tests passed`);
