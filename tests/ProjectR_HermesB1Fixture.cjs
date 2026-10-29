"use strict";
// Phase H2B-1 共通フィクスチャ: 薙ぎ払い・葦笛・絶の実エンジン世界(実Map004 + 全plugin)。H1/H2Aの絶のフィクスチャを土台に使う。
const assert = require("node:assert/strict");
const base = require("./ProjectR_HermesZetsuFixture.cjs");
const { buildWorld, plain, deckApi, restartWithOrder, attachHpBars, OTHER, player, KEYS } = base;

const SWEEP = "hermes_sweep", FLUTE = "hermes_reed_flute", ZETSU = base.ZETSU, STRENGTH = "hermes_strength", ISSEN = "hermes_issen", VEIL = "hermes_veil";
const ENEMIES = [3, 4, 5, 6]; // 実マップの<enemy>(Event IDは固定にしない。各テストで配置し直す)
const HP = 100000;

// card: "hermes_sweep" | "hermes_reed_flute" | "hermes_zetsu"。手札5枚すべてをそのカードにする。
function hermesWorld({ card = SWEEP, level = 1, x = 12, y = 25, windup = 0, order = null, bars = ENEMIES, random = 0.999 } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(700, 300);
    const started = w.ctx.ProjectRCombatTestArena.startScenario("hermes");
    assert.equal(started.ok, true, JSON.stringify(started));
    const d = deckApi(w);
    for (const id of [SWEEP, FLUTE, ZETSU, STRENGTH, ISSEN, VEIL]) assert.equal(d.setCardOwned(id, true).ok, true, id);
    assert.equal(d.setCardLevel(card, level).ok, true);
    restartWithOrder(w, order || [card, card, card, card, card, ...OTHER]);
    w.__card = card;
    w.ctx.ProjectRHermesZetsu.setWindupFrames(windup);
    w.frames(2);
    attachHpBars(w, bars, HP);
    // 乱数は既定で「当たりにくい側」(0.999)に固定する: 自然なクリティカル(主人公のCRI 10%)や回避が結果を揺らさない。必要なテストだけ randomIs で変える。
    if (random !== null) w.run(`Math.random = () => ${random};`);
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ plugin, name, args }); return original.apply(this, arguments); };
    return w;
}

const center = w => { const p = player(w).centerPositionPoint(); return { x: p.x, y: p.y }; };
// 敵Eventの中心を (cx, cy)(タイル座標。プレイヤー中心と同じ座標系)へ置く。
// 判定に使う矩形(ProjectR_CombatOcclusion.eventPolygon = 公式の攻撃判定)の中心が (cx, cy) になるように置く(画像の位置ずれを吸収)。
function placeEnemy(w, id, cx, cy) {
    const event = w.ctx.$gameMap.event(id), occlusion = w.ctx.ProjectR.CombatOcclusion;
    event.setPosition(cx - event.width() / 2, cy - event.height() / 2);
    for (let i = 0; i < 3; i++) {
        const polygon = occlusion.eventPolygon(event);
        const px = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length, py = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;
        if (Math.abs(px - cx) < 1e-6 && Math.abs(py - cy) < 1e-6) break;
        event.setPosition(event._realX + cx - px, event._realY + cy - py);
    }
    return event;
}
// プレイヤー中心から 距離r・角度degree(0=上・時計回り)へ敵を置く。
function placePolar(w, id, r, degree) {
    const c = center(w), rad = degree * Math.PI / 180;
    return placeEnemy(w, id, c.x + Math.sin(rad) * r, c.y - Math.cos(rad) * r);
}
// 使わない敵を遠くへ退避(判定に入らない)。
function parkOthers(w, keep = []) {
    for (const id of ENEMIES) if (!keep.includes(id)) placeEnemy(w, id, 46 - id, 3);
}
// マウスをプレイヤーの足元から 角度degree・距離tiles へ向ける(0=上・時計回り)。
function aimDegree(w, degree, tiles = 3) {
    const rad = degree * Math.PI / 180;
    base.aim(w, Math.sin(rad) * tiles, -Math.cos(rad) * tiles);
}
const barHp = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)).currentHp;
const lost = (w, id) => HP - barHp(w, id);
const resetHp = (w, ids = ENEMIES) => { for (const id of ids) { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = bar.targetHp = HP; bar.refresh(); } };
const sleeping = (w, id) => w.ctx.hasState(id, 32);
const handIds = w => plain(deckApi(w).getBattleState().hand.map(c => c.cardId));
// Q(=手札0)を押す。centerOn: カメラ中心(マウス座標がプレイヤー画面座標と一致する前提)
// 手札の最初の「そのカード」を使う(使うたびに手札が詰まるので、位置ではなくカードIDで選ぶ)。{ index } を渡すと位置を直接指定。
const useCard = (w, option = null) => {
    player(w).center(player(w)._realX, player(w)._realY);
    const found = handIds(w).indexOf(w.__card);
    return plain(deckApi(w).requestUseCard(option && typeof option === "object" ? option.index : Math.max(0, found)));
};
const countCommands = (w, plugin, name) => w.calls.filter(c => c.plugin === plugin && c.name === name);
const runFrames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };

module.exports = { ...base, SWEEP, FLUTE, STRENGTH, ISSEN, VEIL, ENEMIES, HP, hermesWorld, center, placeEnemy, placePolar, parkOthers, aimDegree, barHp, lost, resetHp, sleeping, handIds,
    useCard, countCommands, runFrames, assert, plain };
