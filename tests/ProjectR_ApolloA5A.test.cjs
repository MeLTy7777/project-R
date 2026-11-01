"use strict";
// Phase Apollo-A5A: 黄金の矢 Lv3 の「通常の扇(11本・間隔10度)」と、長押し(ビーム)の分岐の予約。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
//   入力は本物の経路(Input._onKeyDown/_onKeyUp → Scene_Map.update)を通す。時間は戦闘時計(Scene_Map.update の更新回数)。ビーム本体は未実装(A5B)。
const fx = require("./ProjectR_ApolloVolleyFixture.cjs");
const { assert, plain, volleyWorld, VOLLEY, deckApi, api, aimDegree, frames, arrows, lost, resetHp, arrowEvents, state, placePolar, parkOthers, setRegion, player, KEYS } = fx;
const fs = require("node:fs");
const path = require("node:path");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const input = w => w.ctx.ProjectRCardBattleInput;
const pile = w => state(w).cooldownPile.filter(e => e.instance.cardId === VOLLEY).length;
const settle = (w, max = 260) => { for (let i = 0; i < max && (arrows(w).length || api(w).isPending()); i++) frames(w, 1); };
const sessions = w => plain(input(w).getPressSessions());
const log = w => plain(input(w).getPressLog());
const last = w => plain(api(w).getLastResult());
const [CODE, KEYCODE] = KEYS.Q;
// 押す → heldFrames更新 → 離す → 発動の更新(requestUseCardは離した次の更新)
const press = (w, held, { release = true, settleFrames = 2 } = {}) => {
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE);
    frames(w, held);
    if (release) { w.keyUp(CODE, KEYCODE); frames(w, settleFrames); } else frames(w, settleFrames);
};
const attempts = w => plain(api(w).getBeamAttempts());

test("Lv1〜2は従来どおり押した瞬間に発動する: 押下の記録は作られず、Lv3だけが離した時に発動する", () => {
    for (const level of [1, 2]) {
        const w = volleyWorld({ level });
        parkOthers(w);
        aimDegree(w, 90, 4);
        press(w, 0, { release: false, settleFrames: 2 });
        assert.equal(arrows(w).length, level === 1 ? 3 : 5, `Lv${level}: 押している間にもう発射している`);
        assert.equal(sessions(w).length, 0, "押下セッションは作らない");
        assert.equal(log(w).filter(e => e.cardId === VOLLEY).length, 0);
        w.keyUp(CODE, KEYCODE);
        frames(w, 3);
        assert.equal(log(w).length, 0);
        assert.equal(arrows(w).length > 0, true, "離しても追加で発動しない");
    }
    const w3 = volleyWorld({ level: 3 });
    parkOthers(w3);
    aimDegree(w3, 90, 4);
    press(w3, 0, { release: false, settleFrames: 3 });
    assert.equal(arrows(w3).length, 0, "Lv3は押した瞬間には発射しない");
    assert.equal(sessions(w3).length, 1);
    assert.equal(api(w3).isPending(), false);
    assert.equal(pile(w3), 0);
    const profile = plain(input(w3).getPressProfile(VOLLEY));
    assert.deepEqual([profile.holdSeconds, profile.thresholdFrames, profile.fireOn], [0.5, 30, "release"]);
    assert.equal(api(w3).holdSeconds, 0.5);
    assert.equal(api(w3).pressRegistered, true);
});

test("tap/holdの境界(戦闘時計): 29更新で離す=tap(扇) / 30更新で離す=hold(ビームの分岐)。29/30の両側", () => {
    const run = held => {
        const w = volleyWorld({ level: 3 });
        parkOthers(w);
        aimDegree(w, 90, 4);
        press(w, held);
        return { w, variant: log(w).find(e => e.type === "release").variant, count: arrows(w).length, res: plain(input(w).getLastResult()) };
    };
    const a29 = run(29), a30 = run(30), a1 = run(1), a60 = run(60);
    assert.equal(a29.variant, "tap"); assert.equal(a29.count, 11, "29更新 = tap = 11本の扇");
    assert.equal(a30.variant, "hold"); assert.equal(a30.count, 0, "30更新 = hold = 矢は出ない");
    assert.equal(a1.variant, "tap"); assert.equal(a1.count, 11);
    assert.equal(a60.variant, "hold"); assert.equal(a60.count, 0);
    // 1回の入力で両方は発動しない
    for (const r of [a29, a30]) assert.equal(log(r.w).filter(e => e.type === "activate").length, 1, "発動の依頼は1回");
    assert.equal(a29.res.variant, "tap"); assert.equal(a30.res.variant, "hold");
    assert.equal(attempts(a29.w).length, 0, "tapではビームの分岐に入らない");
    assert.equal(attempts(a30.w).length, 1);
});

test("holdの分岐: ビームを撃つ(扇は撃たない)。矢のEventは出ず、発射だけでは消費しない(最初のヒットまで確定待ち)。外れなら非消費。ビームの詳細は ProjectR_ApolloA5B.test.cjs", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    placePolar(w, 4, 5, 90);
    aimDegree(w, 90, 4);
    const before = plain(state(w));
    press(w, 45, { settleFrames: 1 });
    const res = plain(input(w).getLastResult());
    assert.equal(res.variant, "hold");
    assert.equal(res.detail, "volleyReserved", "予約(まだ消費していない)");
    assert.equal(arrows(w).length, 0); assert.equal(arrowEvents(w).length, 0, "扇の矢は出ない");
    assert.notEqual(api(w).getBeam(), null, "ビームが飛んでいる");
    assert.equal(api(w).isPending(), true);
    assert.deepEqual(plain(state(w)), before, "発射だけでは手札・山札・Cooldownは変わらない");
    assert.equal(attempts(w).length, 1);
    settle(w);
    assert.equal(pile(w), 1, "最初のヒットで1回だけ消費");
    assert.ok(lost(w, 4) >= 50);
    // 外れ: 敵がいなければ非消費
    const m = volleyWorld({ level: 3 });
    parkOthers(m);
    aimDegree(m, 90, 4);
    const b2 = plain(state(m));
    press(m, 40);
    settle(m);
    assert.equal(last(m).reason, "missed");
    assert.deepEqual(plain(state(m)), b2);
    // 失敗の後すぐ、tapで扇を撃てる(状態が汚れない)
    press(m, 5);
    assert.equal(arrows(m).length, 11);
});

test("Lv3 tap: 11本・間隔10度。狙い=離した直後のマウス方向(押している間にマウスを動かしても、離した時の向きが中心)。発射後は追尾しない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE);
    frames(w, 10);
    aimDegree(w, 45, 4); // 押している間に動かす
    frames(w, 5);
    aimDegree(w, 60, 4); // 離す直前の向き
    w.keyUp(CODE, KEYCODE);
    frames(w, 2);
    const list = arrows(w);
    assert.equal(list.length, 11);
    const want = Array.from({ length: 11 }, (_, i) => 60 + (i - 5) * 10);
    assert.deepEqual(list.map(a => Math.round(a.degree * 100) / 100), want, "10, 20, ... 110 ではなく 離した時の60度を中心に10度ずつ");
    assert.deepEqual(plain(api(w).getPending()).degrees.map(d => Math.round(d * 100) / 100), want);
    for (const a of list) assert.ok(Math.abs(a.rotation - a.degree) < 1e-6);
    const rotations = list.map(a => a.rotation);
    aimDegree(w, 270, 5); frames(w, 5);
    assert.deepEqual(arrows(w).filter(a => a.index === 5).map(a => a.rotation), [rotations[5]], "発射後にマウスを動かしても向きは変わらない");
});

test("11本の実際の軌道: 発射点から各矢の進行方向が狙い±10度の刻みで、隣り合う矢の角度差が10度。同時に同じ点から出る", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    press(w, 5);
    const events = () => arrowEvents(w).sort((a, b) => a.eventId() - b.eventId());
    const centerOf = e => w.ctx.ProjectRApolloGoldenVolley.geometry.tileCenter(e);
    const first = events().map(centerOf);
    frames(w, 4);
    const second = events().map(centerOf);
    assert.equal(first.length, 11);
    const deg = (a, b) => ((Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI) + 360) % 360;
    const dirs = first.map((p, i) => deg(p, second[i]));
    const byIndex = arrows(w).sort((a, b) => a.index - b.index).map(a => a.degree);
    const actual = events().map((e, i) => ({ id: e.eventId(), dir: dirs[i] }));
    const sortedByDir = actual.map(a => a.dir).sort((a, b) => a - b);
    for (let i = 0; i < 11; i++) assert.ok(Math.abs(sortedByDir[i] - (40 + 10 * i)) < 1.5, `進行方向${i}: ${sortedByDir[i]}(期待 ${40 + 10 * i})`);
    for (let i = 1; i < 11; i++) assert.ok(Math.abs((sortedByDir[i] - sortedByDir[i - 1]) - 10) < 2, "隣の矢との角度差は約10度");
    assert.deepEqual(byIndex, Array.from({ length: 11 }, (_, i) => 40 + 10 * i));
    assert.equal(new Set(arrows(w).map(a => a.age)).size, 1, "11本は同じframeに同時に出る(寿命が全員同じ)");
    const dist = first.map(p => Math.hypot(p.x - first[5].x, p.y - first[5].y));
    assert.ok(Math.max(...dist) < 1, "同じ点から出る(1frame分の差だけ)");
    // 見た目: 中央の1本(index 5)だけが太い
    assert.deepEqual(arrows(w).map(a => a.thick), Array.from({ length: 11 }, (_, i) => i === 5));
});

test("Lv2の効果を引き継ぐ: 中央の矢だけが太く(0.9)、当たった敵に5秒100のスリップ。1本50ダメージは変わらない。側面の矢にはスリップが付かない", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    press(w, 5);
    assert.deepEqual(arrows(w).map(a => a.width), [0.3, 0.3, 0.3, 0.3, 0.3, 0.9, 0.3, 0.3, 0.3, 0.3, 0.3]);
    settle(w);
    assert.equal(lost(w, 4), 50);
    assert.deepEqual(plain(api(w).getActiveSlips())[0].ticks, [20, 20, 20, 20, 20]);
    for (let i = 0; i < 360; i++) deckApi(w).updateCooldown(1 / 60);
    assert.equal(lost(w, 4), 150, "50 + 100");
    const effects = plain(api(w).effectsForLevel(3));
    assert.deepEqual([effects.damage, effects.thickWidthTiles, effects.splitTotal, effects.splitSeconds], [50, 0.9, 100, 5]);
    // 側面の矢だけが当たる敵: 50のみ・スリップなし
    const s = volleyWorld({ level: 3 });
    parkOthers(s, [4]);
    placePolar(s, 4, 6, 70); // index 3 (= 60+... ) 狙い90の左側の矢の延長
    aimDegree(s, 90, 4);
    press(s, 5);
    settle(s);
    assert.equal(lost(s, 4), 50);
    assert.equal(plain(api(s).getActiveSlips()).length, 0);
});

test("矢ごとの命中と非貫通: 隣り合う3本が1体に当たれば3回(150)。消費は1回。当たった矢は消える", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    placePolar(w, 4, 1.8, 90);
    aimDegree(w, 90, 4);
    press(w, 5);
    settle(w);
    const dealt = lost(w, 4);
    assert.ok(dealt >= 150 && dealt % 50 === 0, `複数の矢が個別に当たる: ${dealt}`);
    assert.ok(last(w).hits.length >= 3 && last(w).hits.every(h => h.damage === 50), "命中の記録(1本50)");
    assert.equal(pile(w), 1, "消費は1回");
    assert.equal(arrowEvents(w).length, 0);
});

test("確定後払いはLv3でもA4と同じ: 発射では消費せず、最初の命中で1回だけ。全部外れなら消費しない。確定待ちの間の再入力は拒否(volleyPending)", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w, [4]);
    assert.equal(w.ctx.ProjectRCardBalance.setOverride(VOLLEY, "constant", "projectileSpeed", 5).ok, true); // 長い入力の間も矢が飛んでいるように、ゆっくりにする
    placePolar(w, 4, 8, 90);
    aimDegree(w, 90, 4);
    const before = plain(state(w));
    press(w, 3);
    assert.equal(api(w).isPending(), true);
    assert.deepEqual(plain(state(w)), before, "発射しただけでは消費しない");
    // 確定待ちの間にもう一度(tap・hold)
    press(w, 3);
    assert.equal(plain(input(w).getLastResult()).detail, "volleyPending");
    assert.ok(arrowEvents(w).length <= 11, "矢は増えない(壁で消えた分だけ減る)");
    press(w, 40);
    assert.ok(arrowEvents(w).length <= 11);
    assert.equal(plain(input(w).getLastResult()).detail, "volleyPending");
    assert.equal(attempts(w).length, 0, "確定待ちの間のholdはビームの分岐に入らない(volleyPendingで拒否)");
    settle(w);
    assert.equal(last(w).hits[0].damage, 50);
    assert.equal(last(w).hits.length, 1, "命中は1回(確定待ちの再入力は矢を増やさない)");
    assert.equal((lost(w, 4) - 50) % 20, 0, "50 + スリップの進んだ分(20ずつ)");
    assert.equal(pile(w), 1);
    // 外れ
    const miss = volleyWorld({ level: 3 });
    parkOthers(miss);
    aimDegree(miss, 90, 4);
    const b2 = plain(state(miss));
    press(miss, 3);
    settle(miss);
    assert.equal(last(miss).reason, "missed");
    assert.deepEqual(plain(state(miss)), b2, "全部外れ = 消費なし・Cooldownなし");
    assert.equal(arrowEvents(miss).length, 0);
    press(miss, 3);
    assert.equal(arrows(miss).length, 11, "外れた後はすぐ再発射できる");
});

test("取消: 押している間の手札の入れ替わり・会話・戦闘終了・入力のリセット(フォーカス喪失相当)・手動の取消では何も発動しない。離しても扇もビームも出ない", () => {
    const make = () => { const w = volleyWorld({ level: 3 }); parkOthers(w); aimDegree(w, 90, 4); return w; };
    const settleCancel = (w, reason, expectedPile = 0) => {
        frames(w, 2);
        w.keyUp(CODE, KEYCODE);
        frames(w, 3);
        assert.equal(arrowEvents(w).length, 0, reason + ": 矢なし");
        assert.equal(api(w).isPending(), false);
        assert.equal(pile(w), expectedPile, reason + ": 発動による消費なし" + (expectedPile ? "(別の経路で使った1枚だけ)" : ""));
        assert.equal(attempts(w).length, 0, reason + ": ビームの分岐にも入らない");
        assert.equal(log(w).filter(e => e.type === "activate").length, 0, reason + ": 発動の依頼なし");
        assert.equal(sessions(w).length, 0);
    };
    // 手札の入れ替わり(同じ枠のカードが別のインスタンスになる)
    let w = make();
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 5);
    assert.equal(deckApi(w).useBattleCard(plain(deckApi(w).getBattleState().hand[0]).instanceId).ok, true);
    frames(w, 2);
    assert.equal(log(w).find(e => e.type === "cancel").reason, "handChanged");
    settleCancel(w, "handChanged", 1);
    // 会話(メッセージ)
    w = make();
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 5);
    w.ctx.$gameMessage.add("x"); frames(w, 2);
    assert.ok(/^blocked:/.test(log(w).find(e => e.type === "cancel").reason));
    w.ctx.$gameMessage.clear();
    settleCancel(w, "message");
    // 戦闘終了
    w = make();
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 35);
    deckApi(w).endCardBattle();
    assert.equal(log(w).find(e => e.type === "cancel").reason, "reset");
    w.keyUp(CODE, KEYCODE); frames(w, 3);
    assert.equal(arrowEvents(w).length, 0); assert.equal(attempts(w).length, 0); assert.equal(sessions(w).length, 0);
    // 入力のリセット(フォーカス喪失・Input.clear)
    w = make();
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 35);
    w.ctx.Input.clear();
    assert.equal(log(w).find(e => e.type === "cancel").reason, "reset");
    w.keyUp(CODE, KEYCODE);
    settleCancel(w, "reset");
    // 手動
    w = make();
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE); frames(w, 5);
    assert.equal(input(w).cancelPress(0, "manual"), true);
    settleCancel(w, "manual");
    // 取消の後、通常どおり撃てる
    press(w, 3);
    assert.equal(arrows(w).length, 11);
});

test("繰り返しの入力: 押しっぱなしのキーリピートは1回だけ。1回の入力で扇とビームの両方は出ない。続けて2回(tap→hold)は別々の入力", () => {
    const w = volleyWorld({ level: 3 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    player(w).center(player(w)._realX, player(w)._realY);
    w.keyDown(CODE, KEYCODE);
    for (let i = 0; i < 8; i++) { w.keyDown(CODE, KEYCODE, { repeat: true }); frames(w, 5); }
    assert.equal(log(w).filter(e => e.type === "press").length, 1, "キーリピートで押下は増えない");
    assert.equal(sessions(w).length, 1);
    w.keyUp(CODE, KEYCODE);
    frames(w, 3);
    assert.equal(log(w).filter(e => e.type === "activate").length, 1, "40更新押した入力は1回だけ発動の依頼(hold)");
    assert.equal(arrowEvents(w).length, 0, "holdは扇を出さない");
    assert.equal(attempts(w).length, 1);
    settle(w); // ビームは外れて終わる(確定待ちが明ける)
    // 次の入力(tap)は別の入力として扇を撃てる
    press(w, 4);
    assert.equal(arrows(w).length, 11);
    assert.equal(log(w).filter(e => e.type === "press").length, 2);
    assert.equal(log(w).filter(e => e.type === "activate").length, 2);
});

test("Lv3の数値(本数・間隔)はバランス設定で変えられる: Lv3だけを変えるとLv2は変わらず、Lv3の扇は設定どおり。偶数にすると中央の矢(太い・スリップ)は無い", () => {
    const w = volleyWorld({ level: 3 });
    const b = w.ctx.ProjectRCardBalance;
    assert.equal(b.setOverride(VOLLEY, 3, "projectileCount", 9).ok, true);
    assert.equal(b.setOverride(VOLLEY, 3, "spreadDegrees", 12).ok, true);
    assert.equal(api(w).effectsForLevel(2).projectileCount, 5, "Lv2は変わらない");
    assert.equal(api(w).effectsForLevel(2).spreadDegrees, 15);
    parkOthers(w);
    aimDegree(w, 90, 4);
    press(w, 4);
    assert.deepEqual(arrows(w).map(a => a.degree), Array.from({ length: 9 }, (_, i) => 90 + (i - 4) * 12));
    assert.equal(arrows(w).filter(a => a.thick).length, 1);
    settle(w);
    b.resetAll();
    assert.equal(api(w).effectsForLevel(3).projectileCount, 11);
    assert.equal(b.setOverride(VOLLEY, 3, "projectileCount", 10).ok, true);
    press(w, 4);
    assert.equal(arrows(w).length, 10);
    assert.equal(arrows(w).filter(a => a.thick).length, 0, "偶数 = 中央の1本が無い = 太い矢・スリップなし");
    b.resetAll();
    // 編集できる項目としてエディタの検証を通る(範囲外は拒否)
    assert.equal(b.setOverride(VOLLEY, 3, "projectileCount", 0).ok, false);
    assert.equal(b.setOverride(VOLLEY, 3, "spreadDegrees", 0).ok, false);
});

test("他の入力は変わらない: 他のカード(Hermes・旧Apollo)は押下プロファイルを持たず押した瞬間に発動、J(剣)・銃の攻撃入力にも影響しない。Lv3は本番の取得経路に載らない", () => {
    const w = volleyWorld({ level: 3 });
    const inp = input(w);
    for (const id of ["hermes_sweep", "hermes_zetsu", "hermes_issen", "hermes_strength", "hermes_veil", "hermes_psychopomp", "hermes_reed_flute", "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"]) {
        assert.equal(inp.getPressProfile(id), null, id);
    }
    assert.notEqual(inp.getPressProfile(VOLLEY), null);
    const source = fs.readFileSync(path.join(__dirname, "..", "js/plugins/ProjectR_CardBattleInput.js"), "utf8");
    assert.ok(/when\(\)/.test(source));
    // 本番の取得経路: Apolloの30枚デッキは組めず、Hermesの初期付与にも入らない。Lvを3にできるのは開発用のAPI(setCardLevel)だけ
    const cat = w.ctx.ProjectRCardCatalog;
    assert.equal(cat.buildGodDeck("apollo"), null);
    assert.equal(cat.godStatus("apollo").ready, false);
    assert.ok(!JSON.stringify(plain(w.ctx.ProjectRHermesProductionDeck.starterSet())).includes(VOLLEY));
    const row = cat.godDesign("apollo").find(r => r.designId === 8);
    assert.deepEqual([row.implementedLevels, row.beamImplemented], [3, true], "Lv3まで実装済み(A5B)。ただしApolloの入手経路・30枚デッキは未実装なので本番には載らない");
    // 通常の攻撃入力(J)は押下プロファイルの対象ではない
    w.keyDown("KeyJ", 74); frames(w, 2); w.keyUp("KeyJ", 74); frames(w, 2);
    assert.equal(sessions(w).length, 0);
});

console.log(`\n${passed} Apollo A5A tests passed`);
