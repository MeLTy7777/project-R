"use strict";
// Phase Apollo-A6A 共通フィクスチャ: エロスの矢(apollo_eros_arrow)のテスト用の実エンジン世界(実Map004 + 全plugin + 実Hendrix/DotMove)。
// 矢のEventは本物のspawnEventで作られ、位置・向きはプラグインが毎frame与える。敵のHPは公式のEventHpBarと同じ形を手で付ける(描画なしのハーネスのため)。
const assert = require("node:assert/strict");
const base = require("./ProjectR_HermesB1Fixture.cjs");
const { buildWorld, plain, deckApi, restartWithOrder, attachHpBars, OTHER, player, center, placeEnemy, placePolar, parkOthers } = base;

const EROS = "apollo_eros_arrow";
const ENEMIES = [3, 4, 5, 6];
const HP = 100000;

// order: 引き順(既定は手札5枚すべてエロスの矢)。x,y: 出発点(アリーナの何もない広間)。
function erosWorld({ x = 12, y = 25, order = null, bars = ENEMIES, random = 0.999, balance = null } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(700, 300);
    const ring = deckApi(w).assignRingToPlayer("apollo"); assert.equal(ring.ok, true, "Apolloの指輪を所持 " + JSON.stringify(ring));
    const started = w.ctx.ProjectRCombatTestArena.startScenario("hermes");
    assert.equal(started.ok, true, JSON.stringify(started));
    const d = deckApi(w);
    assert.equal(d.setCardOwned(EROS, true).ok, true);
    if (balance) balance(w);
    restartWithOrder(w, order || [EROS, EROS, EROS, EROS, EROS, ...OTHER]);
    w.frames(2);
    attachHpBars(w, bars, HP);
    if (random !== null) w.run(`Math.random = () => ${random};`);
    w.calls = [];
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name, args) { w.calls.push({ plugin, name, args }); return original.apply(this, arguments); };
    return w;
}

const api = w => w.ctx.ProjectRApolloErosArrow;
const handIds = w => plain(deckApi(w).getBattleState().hand.map(c => c.cardId));
const state = w => plain(deckApi(w).getBattleState());
// 手札の最初のエロスの矢を使う。
const fire = w => {
    player(w).center(player(w)._realX, player(w)._realY);
    return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(EROS))));
};
const frames = (w, n) => { for (let i = 0; i < n; i++) w.frames(1); };
const aimDegree = (w, degree, tiles = 3) => base.aimDegree(w, degree, tiles);
const barHp = (w, id) => w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)).currentHp;
const lost = (w, id) => HP - barHp(w, id);
const resetHp = (w, ids = ENEMIES) => { for (const id of ids) { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = HP; bar.targetHp = HP; bar.refresh(); } };
const arrowEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRErosArrow/.test(e.event().note || ""));
const consumedHand = w => handIds(w).filter(id => id === EROS).length;
const pile = w => state(w).cooldownPile.filter(entry => entry.instance.cardId === EROS);
// 戦闘中の仲間(PartyCombat)を作り、そのEventを置く。eventIdは敵の枠(3〜6)のEventを借りる(敵の判定から外れることも確かめる)。
function addAlly(w, { actorId = 2, eventId = 6, cx, cy, maxHp = 200, hp = 100 } = {}) {
    const party = w.ctx.ProjectRPartyCombat;
    party.registerAlly({ actorId, name: "仲間" + actorId, maxHp, normalAttack: { id: "n" + actorId, range: 1.5, cooldownSeconds: 1 } });
    if (!party.isActive()) assert.equal(party.startSession([actorId]).ok, true);
    else assert.equal(party.startSession([...party.members().map(m => m.actorId), actorId]).ok, true);
    if (hp < maxHp) party.damageAlly(actorId, maxHp - hp);
    w.ctx.$gameMap.event(eventId).linkedActorId = actorId;
    if (cx !== undefined) placeEnemy(w, eventId, cx, cy);
    return { actorId, eventId };
}
const allyHp = (w, actorId) => plain(w.ctx.ProjectRPartyCombat.members()).find(m => m.actorId === actorId).hp;
// 矢がすべて消えるまで(上限frameで諦める)進める。
const settle = (w, max = 400) => { for (let i = 0; i < max && (api(w).getSequences().length || api(w).isPending()); i++) frames(w, 1); };

module.exports = { ...base, EROS, ENEMIES, HP, erosWorld, api, handIds, state, fire, frames, aimDegree, barHp, lost, resetHp, arrowEvents, consumedHand, pile, addAlly, allyHp, settle, assert, plain,
    center, placeEnemy, placePolar, parkOthers, player };
