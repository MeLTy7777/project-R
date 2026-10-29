"use strict";
// Phase H1 共通フィクスチャ: 絶(Zetsu)のテスト用の実エンジン世界(実Map004 + 全plugin)と、入力・HP・壁の補助。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");
const project = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(project, file), "utf8");

const KEYS = { Q: ["KeyQ", 81], E: ["KeyE", 69], X: ["KeyX", 88], C: ["KeyC", 67], V: ["KeyV", 86] };
const ZETSU = "hermes_zetsu";
const GUN_ID = 51, AMMO_ITEM = 31, SWORD_ID = 2;
const OTHER = ["apollo_golden_arrow", "apollo_plague_attack", "hermes_sword_attack", "hermes_swift_movement", "hermes_reed_flute_sleep", "apollo_lyre_calm", "hermes_perception_obscure"];

const deckApi = w => w.ctx.ProjectRCardDeck;
const zetsuApi = w => w.ctx.ProjectRHermesZetsu;
const modifiers = w => w.ctx.ProjectRCardModifiers;
const hand = w => plain(deckApi(w).getBattleState().hand.map(card => card.cardId));
const state = w => plain(deckApi(w).getBattleState());
const player = w => w.ctx.$gamePlayer;
const pos = w => ({ x: player(w)._realX, y: player(w)._realY });
const press = (w, key) => w.tap(...KEYS[key]);
const lastCard = w => plain(w.ctx.ProjectRCardBattleInput.getLastResult());
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message || ""} ${a} vs ${b}`);
const ticks = (w, count) => { for (let i = 0; i < count; i++) deckApi(w).updateCooldown(1 / 60); };

// 山札の引き順を指定して戦闘を開始し直す(アリーナと同じ: 山札は末尾から引くのでシャッフルを止めて逆順で渡す)。
function restartWithOrder(w, order) {
    const d = deckApi(w);
    d.endCardBattle();
    const sequence = Array.from({ length: 30 }, (_, i) => order[i % order.length]);
    const originals = new Map();
    for (const id of new Set(sequence)) {
        const card = d.definitions.cards.get(id);
        originals.set(id, card);
        d.definitions.cards.set(id, Object.freeze({ ...card, maxCopies: 30 }));
    }
    w.run("globalThis.__random = Math.random; Math.random = () => 1 - Number.EPSILON;");
    const result = d.startCardBattle([...sequence].reverse());
    w.run("Math.random = globalThis.__random;");
    for (const [id, card] of originals) d.definitions.cards.set(id, card);
    assert.equal(result.ok, true, JSON.stringify(result));
    return sequence;
}

// level: 絶のCard Level。order: 引き順(既定は手札5枚すべて絶)。x,y: 出発点。
// 既定の出発点(12,25)は、アリーナの端末Eventから離れた何もない地面(左の広間)。
function zetsuWorld({ level = 1, x = 12, y = 25, order = [ZETSU, ZETSU, ZETSU, ZETSU, ZETSU, ...OTHER] } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(700, 300);
    const started = w.ctx.ProjectRCombatTestArena.startScenario("hermes");
    assert.equal(started.ok, true, JSON.stringify(started));
    const d = deckApi(w);
    assert.equal(d.setCardOwned(ZETSU, true).ok, true);
    assert.equal(d.setCardLevel(ZETSU, level).ok, true);
    restartWithOrder(w, order);
    w.frames(2);
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ plugin, name, args }); return original.apply(this, arguments); };
    return w;
}
// プレイヤーの足元(screenX/Y)から (dx,dy) タイル先を指す。dx,dyは出発点からの移動量(タイル)。
const aim = (w, dx, dy) => w.mouse(player(w).screenX() + dx * 48, player(w).screenY() + dy * 48);

// 敵のHPは公式のEventHpBar(Spritesetの_eventHpBars)に保持される。ハーネスのSpritesetは描画なしなので、同じ形のHPバーを敵に付ける。
function attachHpBars(w, ids, hp = 100000) {
    const bars = w.ctx.SceneManager._scene._spriteset._eventHpBars;
    const sprites = w.ctx.SceneManager._scene._spriteset;
    Object.defineProperty(sprites, "_characterSprites", { configurable: true, get: () => [...w.ctx.$gameMap.events().filter(Boolean), w.ctx.$gamePlayer]
        .map(character => ({ _character: character, x: 0, y: 0, children: [], addChild() {}, removeChild() {} })) });
    for (const id of ids) {
        const event = w.ctx.$gameMap.event(id);
        const bar = { _event: event, currentHp: hp, targetHp: hp, _maxHp: hp, _hpChangeDuration: 10, hpChangeFrames: 0,
            refresh() { w.ctx.$gameVariables._data[event.hpStorageId] = this.currentHp; } };
        bar.refresh(); bars.push(bar);
    }
}
const hpOf = (w, id) => w.ctx.$gameMap.getCurrentEventHp(id);
// 通常武器の命中(銃弾と剣の共通イベントが呼ぶのと同じ公式コマンド)。乱数を固定して、同じ条件なら同じダメージにする。
function weaponHit(w, id = 4, value = "-player weapon") {
    const interpreter = new w.ctx.Game_Interpreter();
    interpreter._eventId = 0;
    const before = hpOf(w, id);
    w.run("globalThis.__random = Math.random; Math.random = () => 0.999;");
    try { w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: String(id), value, exceedMaxHealth: "false" }); }
    finally { w.run("Math.random = globalThis.__random;"); }
    return before - hpOf(w, id);
}
function equip(w, weaponId) {
    const { ctx } = w;
    ctx.$gameParty.leader().forceChangeEquip(0, ctx.$dataWeapons[weaponId]);
    if (weaponId === GUN_ID) {
        ctx.$gameParty.loseItem(ctx.$dataItems[AMMO_ITEM], ctx.$gameParty.numItems(ctx.$dataItems[AMMO_ITEM]));
        ctx.$gameParty.gainItem(ctx.$dataItems[AMMO_ITEM], 60);
        ctx.$gameSystem.setGunAmmo(GUN_ID, 7);
    }
}

// Region 255 とイベント壁は、アリーナのデータを変えずに実行時のメモリ上だけで作る(ファイルは書かない)。
function setRegion(w, x, y, id) {
    const map = w.ctx.$dataMap, size = map.width * map.height;
    map.data[5 * size + y * map.width + x] = id;
}
function addWallEvent(w, kind, x, y) {
    const { ctx } = w;
    const base = JSON.parse(JSON.stringify(ctx.$dataMap.events[1]));
    const id = ctx.$dataMap.events.length;
    base.id = id; base.name = `WALL ${kind}`; base.note = `<${kind}>`; base.x = x; base.y = y;
    // 通行判定には影響しない壁(through・足元より下)にして、ProjectRの壁タグだけを検証する。
    for (const page of base.pages) { page.through = true; page.priorityType = 0; page.image = { tileId: 0, characterName: "", direction: 2, pattern: 0, characterIndex: 0 }; }
    ctx.$dataMap.events[id] = ctx.vmClone ? ctx.vmClone(base) : base;
    const event = new ctx.Game_Event(ctx.$gameMap.mapId(), id);
    ctx.$gameMap._events[id] = event;
    return event;
}

module.exports = { buildWorld, plain, read, project, KEYS, ZETSU, GUN_ID, AMMO_ITEM, SWORD_ID, OTHER, deckApi, zetsuApi, modifiers, hand, state, player, pos, press, lastCard,
    near, ticks, restartWithOrder, zetsuWorld, aim, attachHpBars, hpOf, weaponHit, equip, setRegion, addWallEvent };
