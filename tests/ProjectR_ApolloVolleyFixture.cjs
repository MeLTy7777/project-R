"use strict";
// Phase Apollo-A4 共通フィクスチャ: 黄金の矢(apollo_golden_volley)のテスト用の実エンジン世界(実Map004 + 全plugin + 実Hendrix/DotMove)。
// 矢は本物の spawnEvent + moveToPosition('forward') で飛ぶ(偽の世界ではない)。敵のHPは公式のEventHpBarと同じ形を手で付ける(描画なしのハーネスのため)。
const assert = require("node:assert/strict");
const base = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, deckApi, restartWithOrder, attachHpBars, OTHER, player } = base;

const VOLLEY = "apollo_golden_volley";
const LEGACY_ARROW = "apollo_golden_arrow";
const ENEMIES = [3, 4, 5, 6];
const HP = 100000;

// level: カードのLv。order: 引き順(既定は手札5枚すべて黄金の矢)。x,y: 出発点(アリーナの何もない広間)。
function volleyWorld({ level = 1, x = 12, y = 25, order = null, bars = ENEMIES, random = 0.999, balance = null } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(700, 300);
    // 指輪の譲渡は戦闘外だけ可能(RING_TRANSFER_DURING_BATTLE)。戦闘を始める前にApolloの指輪を持つ。
    const ring = deckApi(w).assignRingToPlayer("apollo"); assert.equal(ring.ok, true, "Apolloの指輪を所持 " + JSON.stringify(ring));
    const started = w.ctx.ProjectRCombatTestArena.startScenario("hermes");
    assert.equal(started.ok, true, JSON.stringify(started));
    const d = deckApi(w);
    assert.equal(d.setCardOwned(VOLLEY, true).ok, true);
    assert.equal(d.setCardLevel(VOLLEY, level).ok, true);
    if (balance) balance(w);
    restartWithOrder(w, order || [VOLLEY, VOLLEY, VOLLEY, VOLLEY, VOLLEY, ...OTHER]);
    w.frames(2);
    attachHpBars(w, bars, HP);
    if (random !== null) w.run(`Math.random = () => ${random};`);
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ plugin, name, args }); return original.apply(this, arguments); };
    return w;
}

const api = w => w.ctx.ProjectRApolloGoldenVolley;
const handIds = w => plain(deckApi(w).getBattleState().hand.map(c => c.cardId));
// 手札の最初の黄金の矢を使う(使うたびに手札が詰まるので、位置ではなくカードIDで選ぶ)。
const fire = (w, option = null) => {
    player(w).center(player(w)._realX, player(w)._realY);
    const found = handIds(w).indexOf(VOLLEY);
    return plain(deckApi(w).requestUseCard(option && typeof option === "object" ? option.index : Math.max(0, found)));
};
// マウスをプレイヤーの足元から 角度degree・距離tiles へ向ける(0=上・時計回り)。
const aimDegree = (w, degree, tiles = 3) => base.aimDegree(w, degree, tiles);
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const arrows = w => plain(api(w).getActiveArrows());
const barHp = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)).currentHp;
const lost = (w, id) => HP - barHp(w, id);
const resetHp = (w, ids = ENEMIES) => { for (const id of ids) { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = HP; bar.targetHp = HP; bar.refresh(); } };
const arrowEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRGoldenVolley/.test(e.event().note || ""));
const consumedHand = w => handIds(w).filter(id => id === VOLLEY).length;
const cooldownOf = w => { const s = deckApi(w).getBattleState(); return plain(s.cooldowns || s.cooldown || null); };

module.exports = { ...base, VOLLEY, LEGACY_ARROW, ENEMIES, HP, volleyWorld, api, handIds, fire, aimDegree, frames, arrows, barHp, lost, resetHp, arrowEvents, consumedHand, cooldownOf, assert, plain };
