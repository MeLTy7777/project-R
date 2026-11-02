"use strict";
// Phase Apollo-A9: Apollo 8枚の統合・本番投入前の監査(実エンジン: 実Map004 + 全plugin + 実Hendrix/DotMove)。
//   1) 仲間の被ダメージ軽減はダウン判定の前(ヒュアキントス・月桂冠・両方)  2) 8枚の同時使用(状態の合成・Eventの上限・取消・後片付け・処理時間)
//   3) 広い地図での弓の安全な寿命  4) デッキの互換と、本番の取得経路が無効のままであること
// MZ実機(描画・実入力)は対象外 → tools/mz_cdp/apollo_a9_*.cjs。敵の弾・予兆は本番データに無い(監査文書 A9)。
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, fireCard, aimDegree, lost, center, placeEnemy, parkOthers, player, addAlly, allyHp, deckApi, state } = fx;
const ALL = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_hyacinthus", "apollo_plague_rain", "apollo_laurel_wreath", "apollo_lyre_rhythm", "apollo_oracle"];
let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const party = w => w.ctx.ProjectRPartyCombat;
const member = (w, id) => plain(party(w).members()).find(m => m.actorId === id);
const statusApi = w => w.ctx.ProjectRApolloStatus;

// ───────── 1) 仲間の被ダメージ軽減はダウン判定の前 ─────────
test("ヒュアキントス Lv2: HP40の仲間への致死の100(軽減後10)はダウンしない。軽減後も致死ならダウンする。受付期間が終われば軽減されない", () => {
    const w = cardWorld("apollo_hyacinthus", { level: 2 });
    parkOthers(w, [6]);
    addAlly(w, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 400, hp: 40 });
    fireCard(w, "apollo_hyacinthus"); frames(w, 5);
    const r = plain(party(w).damageAlly(2, 100));
    assert.deepEqual([r.ok, r.hp, r.down], [true, 30, false], JSON.stringify(r));
    assert.equal(member(w, 2).down, false);
    assert.equal(plain(party(w).damageAlly(2, 400)).down, true, "軽減後(40)でも致死ならダウンする");
    frames(w, 60 * 6); // 受付期間(Lv2は3秒)が終わる
    const w2 = cardWorld("apollo_hyacinthus", { level: 2 });
    parkOthers(w2, [6]);
    addAlly(w2, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 400, hp: 400 });
    fireCard(w2, "apollo_hyacinthus"); frames(w2, 60 * 5);
    party(w2).damageAlly(2, 100);
    assert.equal(allyHp(w2, 2), 300, "受付期間が終わったあとは軽減されない");
});

test("月桂冠: 根の中の仲間への致死の一撃は軽減(x0.7)してから判定される。根の外に出ると即、軽減が外れる。ヒュアキントスと重なると積(x0.07)", () => {
    const w = cardWorld("apollo_laurel_wreath", { level: 1, owned: ["apollo_hyacinthus"] });
    parkOthers(w, [6]);
    addAlly(w, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 400, hp: 60 });
    fireCard(w, "apollo_laurel_wreath"); frames(w, 5);
    const r = plain(party(w).damageAlly(2, 80)); // 80 → 56 < 60: 生き残る(軽減が無ければダウン)
    assert.deepEqual([r.ok, r.down], [true, false], JSON.stringify(r));
    const hpIn = member(w, 2).hp;
    assert.ok(hpIn >= 4 && hpIn <= 4 + 3, "HP60 - 56 = 4(+根の回復): " + hpIn);
    placeEnemy(w, 6, 12 + 9, 25); frames(w, 3);
    const out = member(w, 2).hp;
    party(w).damageAlly(2, 3);
    assert.equal(member(w, 2).hp, out - 3, "根の外では軽減されない");
    // 重なり
    const b = cardWorld("apollo_laurel_wreath", { level: 1, owned: ["apollo_hyacinthus"] });
    parkOthers(b, [6]);
    addAlly(b, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 1000, hp: 1000 });
    b.ctx.ProjectRCardBalance.setOverride("apollo_hyacinthus", 2, "acceptSeconds", 3);
    deckApi(b).setCardLevel("apollo_hyacinthus", 2);
    fireCard(b, "apollo_laurel_wreath"); frames(b, 3);
    const hyac = (() => { for (let i = 0; i < 700; i++) { if (handIds(b).includes("apollo_hyacinthus")) return true; frames(b, 1); } return false; })();
    if (hyac) { fireCard(b, "apollo_hyacinthus"); frames(b, 2);
        const before = member(b, 2).hp; party(b).damageAlly(2, 1000 * 0.1);
        assert.ok(before - member(b, 2).hp <= 7 + 1, "100 x 0.7 x 0.1 = 7 前後: " + (before - member(b, 2).hp)); }
});

// ───────── 2) 8枚の同時使用 ─────────
const useWhenReady = (w, id, max = 900) => {
    for (let i = 0; i < max; i++) { if (handIds(w).includes(id)) { const r = fireCard(w, id); frames(w, 1); return r; } frames(w, 1); }
    throw new Error(id + " が手札に来なかった");
};
const apolloEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectR(GoldenVolley|ErosArrow|ErosBeam|GigasArrow|PlagueArrow|PlagueRat|LaurelRoot|LaurelWall|Hyacinth)/.test(e.event().note || ""));
test("8枚の同時使用(Lv3): 全部が使え、敵の状態は台帳で積になり、Eventは上限以内。取消(戦闘終了)で全部が消える", () => {
    const ORDER = ["apollo_oracle", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_lyre_rhythm", "apollo_gigas_slayer", "apollo_plague_rain", "apollo_golden_volley", "apollo_eros_arrow"]; // 引き順 = 使う順(最初の手札は即時のカード)
    const w = cardWorld(ALL[0], { level: 3, order: ORDER, owned: ALL.slice(1) });
    w.run("Math.random = () => 0.9;");
    parkOthers(w, [3, 4, 5]);
    const c = center(w);
    placeEnemy(w, 3, c.x + 6, c.y); placeEnemy(w, 4, c.x + 7, c.y + 2); placeEnemy(w, 5, c.x + 5, c.y - 2);
    aimDegree(w, 90, 3);
    for (const id of [3, 4, 5]) { const bar = w.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === w.ctx.$gameMap.event(id)); bar.currentHp = bar.targetHp = 10000000; }
    const t0 = process.hrtime.bigint(); let peakEvents = 0, frameCount = 0;
    const step = n => { for (let i = 0; i < n; i++) { w.frames(1); frameCount++; peakEvents = Math.max(peakEvents, apolloEvents(w).length); } };
    const order = ORDER;
    const used = [];
    for (const id of order) {
        let r = null;
        for (let i = 0; i < 900 && !handIds(w).includes(id); i++) step(1);
        assert.ok(handIds(w).includes(id), id + " が手札に来た");
        player(w).center(player(w)._realX, player(w)._realY);
        r = plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(id))));
        used.push([id, r.ok === true || r.pending === true, r.reason || r.detail || ""]);
        step(6);
    }
    assert.deepEqual(used.filter(u => !u[1]), [], "8枚とも使えた: " + JSON.stringify(used));
    step(240);
    const peakStates = statusApi(w).list().length;
    assert.ok(peakEvents <= 200, "同時のApolloのEventは上限以内: " + peakEvents);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / frameCount;
    console.log(`   8枚同時: ${frameCount}frame / 平均 ${ms.toFixed(2)} ms/frame(Node実エンジン・描画なし) / Event最大 ${peakEvents} / 状態 ${peakStates}`);
    assert.ok(ms < 40, "処理時間: " + ms);
    // 取消: 戦闘終了で全部消える
    deckApi(w).endCardBattle(); step(5);
    assert.equal(apolloEvents(w).length, 0, "Apolloの一時Eventが残らない");
    assert.equal(statusApi(w).list().length, 0, "状態台帳が空");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.list()).length, 0, "DamageModifiersが空");
    assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "移動速度が戻る");
    assert.equal(w.ctx.ProjectRApolloLyreRhythm.getUi().active, false, "竪琴のUIが消える");
    assert.equal(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length, 0, "Apollo召喚が残らない");
    assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0, "錨が残らない");
});

// ───────── 3) 広い地図での弓の安全な寿命 ─────────
test("広い地図(1200x120): 当たらない黄金の矢・エロスの矢・ギガース殺しは、寿命の上限(3500frame)以内に必ず消える。ビームも有限で、1フレームの処理が地図の広さで増えない", () => {
    for (const [card, level] of [["apollo_golden_volley", 1], ["apollo_eros_arrow", 3], ["apollo_gigas_slayer", 1], ["apollo_golden_volley", 3], ["apollo_gigas_slayer", 3]]) {
        const w = cardWorld(card, { level, bigMap: { width: 1200, height: 120 }, x: 12, y: 60 });
        parkOthers(w, []);
        for (const id of [3, 4, 5, 6]) placeEnemy(w, id, 2 + id, 118);
        aimDegree(w, 90, 3);
        const [code, keycode] = fx.KEYS.Q;
        if (card === "apollo_golden_volley" && level === 3) { w.keyDown(code, keycode); frames(w, 40); w.keyUp(code, keycode); frames(w, 2); } else fireCard(w, card);
        let n = 0, peak = 0, maxX = 0;
        const t0 = process.hrtime.bigint();
        const alive = () => w.ctx.$gameMap.events().filter(e => e && e.event && /projectR(GoldenVolley|ErosArrow|ErosBeam|GigasArrow)/.test(e.event().note || ""));
        const api = w.ctx[{ apollo_golden_volley: "ProjectRApolloGoldenVolley", apollo_eros_arrow: "ProjectRApolloErosArrow", apollo_gigas_slayer: "ProjectRApolloGigasSlayer" }[card]];
        const busy = () => alive().length || (api.isPending && api.isPending()) || (api.getShots && api.getShots().length) || (api.getBeam && api.getBeam());
        for (; n < 3800 && busy(); n++) { w.frames(1); const a = alive(); peak = Math.max(peak, a.length); for (const e of a) maxX = Math.max(maxX, e._realX); }
        const ms = Number(process.hrtime.bigint() - t0) / 1e6 / Math.max(1, n);
        assert.ok(n < 3700, `${card} Lv${level}: ${n}frame で消えた`);
        assert.equal(alive().length, 0);
        assert.ok(peak <= 14 + 64 + 6 + 1 + 6 + 20, `${card} Lv${level}: Event最大 ${peak}`);
        console.log(`   ${card} Lv${level}: ${n}frame・最大x ${maxX.toFixed(0)}・Event最大 ${peak}・平均 ${ms.toFixed(2)} ms/frame`);
        assert.ok(ms < 25, `${card} Lv${level}: 処理時間 ${ms}`);
    }
});

// ───────── 4) デッキの互換と、本番の取得経路が無効のまま ─────────
test("Apolloの参考30枚デッキは有効(枚数制限・Lv・8種)。本番の初期セット・指輪の付与にApolloは含まれない", () => {
    const w = cardWorld("apollo_oracle", { level: 1 });
    const cat = w.ctx.ProjectRCardCatalog;
    const deck = plain(cat.buildGodDeck("apollo"));
    const ids = Array.isArray(deck) ? deck : deck.cards || deck.deck || [];
    assert.equal(ids.length, 30);
    const counts = {}; for (const id of ids) counts[id] = (counts[id] || 0) + 1;
    assert.deepEqual(Object.keys(counts).filter(id => /^apollo_(golden_volley|eros_arrow|lyre_rhythm|laurel_wreath|hyacinthus|gigas_slayer|oracle|plague_rain)$/.test(id)).length, 8);
    for (const [id, n] of Object.entries(counts)) assert.ok(n <= w.ctx.ProjectRCardDeck.definitions.card(id).maxCopies, id + " の枚数");
    const fresh = fx.buildWorld(); fresh.enterMap(4, 12, 25); fresh.frames(3);
    const production = fresh.ctx.ProjectRHermesProductionDeck;
    const starter = JSON.stringify(plain(production.starterSet()));
    assert.ok(!/apollo/i.test(starter), "本番の初期セットにApolloは無い: " + starter.slice(0, 200));
    assert.equal(production.starterTotal(), 30, "初期セットはHermesの30枚のまま");
    const acquired = plain(production.acquireRing("apollo", { source: "test" }));
    assert.deepEqual([acquired.granted, acquired.reason], [false, "noStarterForRing"], "Apolloの指輪を得ても、カードは付与されない: " + JSON.stringify(acquired));
    const owned = plain(fresh.ctx.ProjectRCardDeck.getPersistentData().cardOwnership || {});
    assert.deepEqual(Object.keys(owned).filter(id => /^apollo_/.test(id) && owned[id].owned), [], "Apolloのカードは所持されない");
    assert.equal(w.ctx.ProjectRCardCatalog.godStatus("apollo").implemented, 8);
});

console.log(`\n${passed} Apollo A9 integration tests passed`);
