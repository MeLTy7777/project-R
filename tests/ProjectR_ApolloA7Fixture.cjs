"use strict";
// Phase Apollo-A7 共通フィクスチャ: 新Apollo 6枚(ギガース殺し・ヒュアキントス・疫病の矢・月桂冠・竪琴・神託)のテスト用の実エンジン世界(実Map004 + 全plugin + 実Hendrix/DotMove)。
// 敵のHPは公式のEventHpBarと同じ形を手で付ける(描画なしのハーネスのため)。ProjectR_ApolloErosFixture と同じ流儀。
const assert = require("node:assert/strict");
const base = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, deckApi, restartWithOrder, attachHpBars, OTHER, player, center, placeEnemy, placePolar, parkOthers } = base;

const ENEMIES = [3, 4, 5, 6];
const HP = 100000;

// card: ランタイムID。order: 引き順(既定は手札5枚すべてそのカード)。
function cardWorld(card, { x = 12, y = 25, order = null, bars = ENEMIES, random = 0.999, balance = null, level = 1, bigMap = null } = {}) {
    const w = buildWorld();
    if (bigMap) w.bigMap = bigMap; // { width, height }: 壁の無い広い床の地図(射程∞のテスト用)
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(700, 300);
    const ring = deckApi(w).assignRingToPlayer("apollo"); assert.equal(ring.ok, true, "Apolloの指輪を所持 " + JSON.stringify(ring));
    const started = w.ctx.ProjectRCombatTestArena.startScenario("hermes");
    assert.equal(started.ok, true, JSON.stringify(started));
    const d = deckApi(w);
    assert.equal(d.setCardOwned(card, true).ok, true);
    if (level !== 1) assert.equal(d.setCardLevel(card, level).ok, true);
    if (balance) balance(w);
    restartWithOrder(w, order || [card, card, card, card, card, ...OTHER]);
    w.frames(2);
    attachHpBars(w, bars, HP);
    if (random !== null) w.run(`Math.random = () => ${random};`);
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ plugin, name, args }); return original.apply(this, arguments); };
    return w;
}

const handIds = w => plain(deckApi(w).getBattleState().hand.map(c => c.cardId));
const state = w => plain(deckApi(w).getBattleState());
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const fireCard = (w, card) => {
    player(w).center(player(w)._realX, player(w)._realY);
    return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(card))));
};
const aimDegree = (w, degree, tiles = 3) => base.aimDegree(w, degree, tiles);
const barOf = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id));
const barHp = (w, id) => barOf(w, id).currentHp;
const lost = (w, id) => HP - barHp(w, id);
const resetHp = (w, ids = ENEMIES) => { for (const id of ids) { const bar = barOf(w, id); bar.currentHp = HP; bar.targetHp = HP; bar.refresh(); } };
const consumedHand = (w, card) => handIds(w).filter(id => id === card).length;
const pile = (w, card) => state(w).cooldownPile.filter(entry => entry.instance.cardId === card);
const addAlly = (w, { actorId = 2, eventId = 6, cx, cy, maxHp = 200, hp = 100 } = {}) => {
    const party = w.ctx.ProjectRPartyCombat;
    party.registerAlly({ actorId, name: "仲間" + actorId, maxHp, normalAttack: { id: "n" + actorId, range: 1.5, cooldownSeconds: 1 } });
    if (!party.isActive()) assert.equal(party.startSession([actorId]).ok, true);
    else assert.equal(party.startSession([...party.members().map(m => m.actorId), actorId]).ok, true);
    if (hp < maxHp) party.damageAlly(actorId, maxHp - hp);
    w.ctx.$gameMap.event(eventId).linkedActorId = actorId;
    if (cx !== undefined) placeEnemy(w, eventId, cx, cy);
    return { actorId, eventId };
};
const allyHp = (w, actorId) => plain(w.ctx.ProjectRPartyCombat.members()).find(m => m.actorId === actorId).hp;
const spySe = w => { const se = [], am = w.ctx.AudioManager, original = am.playSe; am.playSe = s => { se.push(s.name); }; return { se, restore: () => { am.playSe = original; } }; };

module.exports = { ...base, ENEMIES, HP, cardWorld, handIds, state, frames, fireCard, aimDegree, barOf, barHp, lost, resetHp, consumedHand, pile, addAlly, allyHp, spySe, assert, plain,
    center, placeEnemy, placePolar, parkOthers, player };
