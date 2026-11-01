"use strict";
const { IMPLEMENTED: A7_IMPLEMENTED, STILL_RESERVED: A7_RESERVED, OWN_PLUGIN: A7_OWN, SHARED_USERS: A7_SHARED, COUNT: A7_COUNT } = require("./ProjectR_ApolloImplemented.cjs");
// Phase Apollo-A4: Apollo「黄金の矢」(設計ID 8 / apollo_golden_volley)Lv1〜2。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove。矢は本物のspawnEventで飛ぶ)。
// MZ実機(マウス・実キー・描画)は対象外 → tools/mz_cdp/apollo_a4_verify.cjs。Lv3は実装していないことも確かめる。
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloVolleyFixture.cjs");
const { assert, plain, volleyWorld, VOLLEY, LEGACY_ARROW, deckApi, api, handIds, fire, aimDegree, frames, arrows, lost, resetHp, arrowEvents, state, center, placePolar, placeEnemy,
    parkOthers, setRegion, addWallEvent, player, hpOf, countCommands } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const balanceOf = w => w.ctx.ProjectRCardBalance;
const lastResult = w => plain(api(w).getLastResult());
const pile = w => state(w).cooldownPile.filter(entry => entry.instance.cardId === VOLLEY);
// 矢がすべて消える(当たる・壁・射程のどれか)まで進める。上限frameで諦める。
const settle = (w, max = 260) => { for (let i = 0; i < max && (arrows(w).length || api(w).isPending()); i++) frames(w, 1); };
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });

test("登録: 強力 / 最大5枚 / 最大Lv3 / Cooldown 3秒 / Ground / Apolloの指輪。旧apollo_golden_arrowは変わらず共存。設計ID8 ↔ apollo_golden_volley", () => {
    const w = volleyWorld();
    const def = w.ctx.ProjectRCardDeck.definitions.card(VOLLEY);
    assert.deepEqual(plain(def), { cardId: VOLLEY, ringId: "apollo", maxCopies: 5, cooldownSeconds: 3, maxLevel: 3, rarity: "strong", category: "attack", targetType: "ground" });
    const legacy = w.ctx.ProjectRCardDeck.definitions.card(LEGACY_ARROW);
    assert.deepEqual([legacy.maxCopies, legacy.cooldownSeconds, legacy.rarity, legacy.targetType], [3, 4, "normal", "direction"], "旧カードの定義は不変");
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 8);
    assert.equal(row.runtimeCardId, VOLLEY);
    assert.equal(row.implemented, true);
    assert.equal(row.implementedLevels, 3, "実装したのはLv1〜3(Lv3は扇だけ。A5A)"); assert.equal(row.beamImplemented, true, "ビームはA5Bで実装");
    assert.equal(w.ctx.ProjectRCardCatalog.godStatus("apollo").implemented, A7_COUNT, "Apolloで実装済みは一覧どおり");
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.inactiveRuntimeCards()).filter(id => id.startsWith("apollo_")).sort(),
        [...A7_RESERVED].sort(), "残りは引き続き未登録");
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.runtimeIdAudit().problems), []);
});

test("旧カードの実装ファイル(ProjectR_ApolloGoldenArrow.js)はこのPhaseで1文字も変えていない", () => {
    assert.equal(git("diff", "--stat", "96745ec", "--", "js/plugins/ProjectR_ApolloGoldenArrow.js").trim(), "");
    assert.equal(git("diff", "--stat", "96745ec", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js").trim(), "", "CardDeckCore・Hendrix・DotMoveも不変");
});

test("累積レベル: Lv1=3本・間隔15度・50ダメージ / Lv2=5本・太い中央+スリップ100/5秒(間隔15度とダメージ50はLv1から引き継ぐ)。Lv3(A5A)は11本・間隔10度で、Lv2の太い中央・スリップ・50ダメージを引き継ぐ", () => {
    const w = volleyWorld();
    const lv = n => plain(api(w).effectsForLevel(n));
    assert.deepEqual(lv(1), { damage: 50, projectileCount: 3, spreadDegrees: 15, thickWidthTiles: 0, splitTotal: 0, splitSeconds: 5 });
    assert.deepEqual(lv(2), { damage: 50, projectileCount: 5, spreadDegrees: 15, thickWidthTiles: 0.9, splitTotal: 100, splitSeconds: 5 });
    assert.deepEqual(lv(3), { damage: 50, projectileCount: 11, spreadDegrees: 10, thickWidthTiles: 0.9, splitTotal: 100, splitSeconds: 5 }, "Lv3は本数と間隔だけを置換し、残りはLv2から引き継ぐ");
    assert.deepEqual(plain(balanceOf(w).levels(VOLLEY)).find(row => row.level === 3).effects, { projectileCount: 11, spreadDegrees: 10 });
    assert.equal(api(w).implementedMaxLevel, 3);
    assert.equal(balanceOf(w).cooldownSeconds(VOLLEY), 3);
    assert.equal(balanceOf(w).constant(VOLLEY, "element"), 0, "属性は割り当てない(無属性)");
    assert.equal(balanceOf(w).constant(VOLLEY, "weaknessMultiplier"), 1);
});

test("発射角: 狙いを中央に、間隔15度で並ぶ(Lv1=3本: -15/0/+15、Lv2=5本: -30/-15/0/+15/+30)。0度と360度の境も正しい", () => {
    const w = volleyWorld();
    assert.deepEqual(plain(api(w).arrowDegrees(90, 3, 15)), [75, 90, 105]);
    assert.deepEqual(plain(api(w).arrowDegrees(90, 5, 15)), [60, 75, 90, 105, 120]);
    assert.deepEqual(plain(api(w).arrowDegrees(0, 5, 15)), [330, 345, 0, 15, 30], "上向きでは負の角度を360で折り返す");
    assert.deepEqual(plain(api(w).arrowDegrees(350, 3, 15)), [335, 350, 5]);
    assert.deepEqual([api(w).centerIndexOf(3), api(w).centerIndexOf(5), api(w).centerIndexOf(4)], [1, 2, -1], "中央の1本は奇数のときだけ");
    assert.deepEqual(plain(api(w).arrowDegrees(90, 4, 10)), [75, 85, 95, 105], "偶数は狙いの左右に対称(中央の矢は無い)");
});

test("発射(Lv1): 3本が同時に出る。各矢の向きは発射時のマウス方向±15度で、同じ位置から同じ速さで出る。矢はまだカードを消費しない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    const before = state(w);
    const result = fire(w);
    assert.equal(result.ok, false, "予約の段階では「消費していない」と返す");
    assert.equal(result.pending, true);
    assert.equal(result.reason, "pending");
    assert.equal(arrowEvents(w).length, 3, "3本が同じ発射で出る");
    const list = arrows(w);
    assert.deepEqual(list.map(a => a.degree), [75, 90, 105]);
    for (const a of list) assert.ok(Math.abs(a.rotation - a.degree) < 1e-6, `矢${a.index}の回転はrotateToで発射時に一度だけ設定: ${a.rotation}`);
    assert.deepEqual(plain(api(w).getPending()).degrees, [75, 90, 105]);
    // まだ消費していない(手札・山札・Cooldown・Ultimateゲージ)
    assert.deepEqual(plain(state(w)), plain(before), "予約中は手札・山札・Cooldownを一切変えない");
    assert.equal(lastResult(w).consumed, false);
    const origins = arrowEvents(w).map(e => `${e._realX.toFixed(3)},${e._realY.toFixed(3)}`);
    assert.equal(new Set(origins).size, 1, "同時に同じ位置から出る");
});

test("発射(Lv2): 5本。間隔は15度のまま。中央の1本だけが太い(別の絵・広いhitbox)。ほかの4本は細い", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w);
    aimDegree(w, 0, 4);
    fire(w);
    const list = arrows(w);
    assert.deepEqual(list.map(a => a.degree), [330, 345, 0, 15, 30]);
    assert.deepEqual(list.map(a => a.thick), [false, false, true, false, false]);
    assert.deepEqual(list.map(a => a.width), [0.3, 0.3, 0.9, 0.3, 0.3]);
    const widthOf = event => event.hitboxData().width; // 公式のhitboxData(進行方向に直交する長さ)
    const events = arrowEvents(w);
    const thickEvent = events.find(e => e._characterName === "VFX/$ProjectR_GoldenArrowThick");
    assert.ok(thickEvent, "太い矢は別の絵");
    assert.equal(events.filter(e => e._characterName === "VFX/$ProjectR_GoldenArrow").length, 4);
    assert.ok(widthOf(thickEvent) > widthOf(events.find(e => e !== thickEvent)) * 2, "太い矢のhitboxは細い矢の2倍以上");
    assert.equal(widthOf(thickEvent), 0.9);
    assert.equal(widthOf(events.find(e => e !== thickEvent)), 0.3);
});

test("高速で、まっすぐ飛ぶ: 速さはバランス設定の20マス/秒。1frameに約0.33マス進み、方向は発射時のまま", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    fire(w);
    frames(w, 6);
    const list = arrows(w);
    for (const a of list) assert.ok(Math.abs(a.travelled - 6 / 3) < 0.4 && a.travelled > 1.5, `6frameで約2マス: ${a.travelled}`);
    const speed = (arrows(w)[1].travelled) / 5 * 60; // 観測は最初のframeが起点なので、6frame観測で5歩
    assert.ok(Math.abs(speed - 20) < 2, `約20マス/秒: ${speed}`);
    assert.equal(api(w).SPEED, 20);
});

test("狙いは発射時に固定: 発射後にマウスを動かしても、矢は追尾せず向きも進路も変わらない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    fire(w);
    const first = arrows(w).map(a => a.rotation);
    const y0 = arrowEvents(w)[1]._realY;
    frames(w, 4);
    aimDegree(w, 0, 6); // 真上へ動かす
    frames(w, 6);
    aimDegree(w, 270, 6);
    frames(w, 4);
    const now = arrows(w);
    assert.deepEqual(now.map(a => a.rotation), first, "回転は変わらない");
    assert.ok(Math.abs(arrowEvents(w)[1]._realY - y0) < 0.02, "中央の矢は水平のまま(上へも左へも曲がらない)");
    assert.ok(arrowEvents(w)[1]._realX > player(w)._realX + 2, "右へ進み続ける");
});

test("マウスがプレイヤーと同じ位置(方向が決まらない): 失敗し、矢は出ず、カードは消費しない", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w);
    w.mouse(player(w).screenX(), player(w).screenY());
    const before = plain(state(w));
    const result = fire(w);
    assert.equal(result.ok, false);
    assert.equal(result.pending, undefined);
    assert.equal(arrowEvents(w).length, 0);
    assert.equal(api(w).isPending(), false);
    assert.deepEqual(plain(state(w)), before);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚も片付く");
});

test("命中(Lv1): 当たった矢の1本が50ダメージ。最初の命中の瞬間に1回だけ消費・Cooldown 3秒。当たらなかった矢は消費に関係しない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    fire(w);
    assert.equal(pile(w).length, 0, "命中するまでCooldownに入らない");
    settle(w);
    assert.equal(lost(w, 4), 50, "矢1本につき50ダメージ(中央の1本だけが当たる配置)");
    assert.equal(pile(w).length, 1, "消費は1回");
    assert.equal(pile(w)[0].remainingSeconds > 2.5 && pile(w)[0].remainingSeconds <= 3, true, `Cooldown 3秒: ${pile(w)[0].remainingSeconds}`);
    assert.equal(api(w).isPending(), false);
    const r = lastResult(w);
    assert.equal(r.committed, true);
    assert.equal(r.consumed, true);
    assert.deepEqual(r.hits.map(h => [h.arrow, h.eventId, h.damage]), [[1, 4, 50]]);
    assert.equal(arrowEvents(w).length, 0, "全部の矢が片付く(当たった矢は消え、残りは壁か射程で消える)");
});

test("矢ごとの命中: 3本が別々の敵に当たれば、それぞれ50ダメージ(合計150)。消費は1回だけ", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [3, 4, 5]);
    placePolar(w, 3, 6, 75);
    placePolar(w, 4, 6, 90);
    placePolar(w, 5, 6, 105);
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    assert.deepEqual([3, 4, 5].map(id => lost(w, id)), [50, 50, 50]);
    assert.equal(pile(w).length, 1, "3本当たっても消費は1回");
    assert.deepEqual(lastResult(w).hits.map(h => h.arrow).sort(), [0, 1, 2]);
});

test("矢ごとの命中: 1体の大きな敵に3本が同時に当たれば3回(貫通せず、1本につき1回)。消費は1回", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 2.2, 90);
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    assert.equal(lost(w, 4), 150, "3本とも同じ敵に当たる: 50 x 3");
    assert.equal(pile(w).length, 1);
    assert.equal(lastResult(w).hits.length, 3);
});

test("Lv2のスリップ: 太い中央の矢が当たった敵だけに、5秒間で計100(20 x 5回)。側面の矢の命中にはスリップが付かない。Lv1の中央の矢にも付かない", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    assert.equal(lost(w, 4), 50, "命中の瞬間は50だけ");
    const slip = plain(api(w).getActiveSlips());
    assert.equal(slip.length, 1);
    assert.deepEqual(slip[0].ticks, [20, 20, 20, 20, 20]);
    assert.equal(slip[0].ticks.reduce((a, b) => a + b, 0), 100, "合計はちょうど100");
    const seen = [];
    for (let i = 0; i < 360; i++) { deckApi(w).updateCooldown(1 / 60); seen.push(lost(w, 4)); }
    assert.equal(lost(w, 4), 150, "50 + 100");
    assert.equal(seen[59] <= 70 && seen[59] >= 50, true, `1秒ごとに20: ${seen[59]}`);
    assert.equal(seen[179] >= 90 && seen[179] <= 110, true, `3秒で約110: ${seen[179]}`);
    assert.equal(plain(api(w).getActiveSlips()).length, 0, "5秒で終わる");
    // 側面の矢だけが当たる配置: スリップなし
    const side = volleyWorld({ level: 2 });
    parkOthers(side, [4]);
    placePolar(side, 4, 6, 75);
    aimDegree(side, 90, 4);
    fire(side);
    settle(side);
    assert.equal(lost(side, 4), 50);
    assert.equal(plain(api(side).getActiveSlips()).length, 0, "側面の矢にスリップは付かない");
    // Lv1: 中央の矢でもスリップなし
    const lv1 = volleyWorld({ level: 1 });
    parkOthers(lv1, [4]);
    placePolar(lv1, 4, 6, 90);
    aimDegree(lv1, 90, 4);
    fire(lv1);
    settle(lv1);
    assert.equal(plain(api(lv1).getActiveSlips()).length, 0);
    for (let i = 0; i < 360; i++) deckApi(lv1).updateCooldown(1 / 60);
    assert.equal(lost(lv1, 4), 50);
});

test("スリップの再命中は置換(Issenと同じ。重ねがけの規則は未決定): 古い予定を捨て、新しい合計100を最初から。合計が増えない", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    for (let i = 0; i < 120; i++) deckApi(w).updateCooldown(1 / 60);
    const midway = lost(w, 4);
    assert.ok(midway > 50 && midway < 150, `途中: ${midway}`);
    for (let i = 0; i < 200; i++) deckApi(w).updateCooldown(1 / 60); // Cooldownを明ける
    fire(w);
    settle(w);
    assert.equal(plain(api(w).getActiveSlips()).length, 1, "スリップは1件のまま(置換)");
    assert.equal(plain(api(w).getActiveSlips())[0].next, 0, "最初から");
});

test("壁: 矢は壁を通り抜けない。Region 255 / <CombatWall>の向こうの敵には当たらず、カードも消費しない", () => {
    for (const kind of ["region", "event"]) {
        const w = volleyWorld({ level: 2 });
        parkOthers(w, [4]);
        const c = center(w);
        const wallX = Math.floor(c.x) + 3;
        for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) {
            if (kind === "region") setRegion(w, wallX, y, 255); else addWallEvent(w, "CombatWall", wallX, y);
        }
        placePolar(w, 4, 7, 90);
        aimDegree(w, 90, 4);
        fire(w);
        settle(w);
        assert.equal(lost(w, 4), 0, `${kind}: 壁の向こうの敵は無傷`);
        assert.equal(pile(w).length, 0, `${kind}: 消費しない`);
        assert.equal(lastResult(w).reason, "missed");
        assert.equal(arrowEvents(w).length, 0);
        // 壁の手前の敵には当たる(壁が矢を止める位置より手前)
        parkOthers(w);
        placePolar(w, 4, 2, 90);
        resetHp(w);
        fire(w);
        settle(w);
        assert.equal(lost(w, 4) > 0, true, `${kind}: 壁の手前の敵には当たる`);
    }
});

test("壁: 速い矢と細い壁でもすり抜けない(1frame 0.33マスの掃き判定)。壁のすぐ手前の敵と壁のすぐ向こうの敵", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [3, 4]);
    const c = center(w), wallX = Math.floor(c.x) + 4;
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) setRegion(w, wallX, y, 255);
    placePolar(w, 3, 3.2, 90); // 壁(x = c.x + 3.5 付近)の手前
    placePolar(w, 4, 5.4, 90); // 壁の向こう
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    assert.ok(lost(w, 3) > 0, "手前には当たる");
    assert.equal(lost(w, 4), 0, "向こうには届かない");
});

test("外れ(失敗): 全部の矢がどこにも当たらず消えたら、カードは消費しない。手札・山札・Cooldownは発射前のまま。すぐ再発射できる", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w);
    aimDegree(w, 90, 4);
    const before = plain(state(w));
    assert.equal(fire(w).pending, true);
    settle(w);
    const r = lastResult(w);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "missed");
    assert.equal(r.consumed, false);
    assert.deepEqual(plain(state(w)), before, "手札・山札・Cooldownは発射前と同じ");
    assert.equal(arrowEvents(w).length, 0, "矢のEventは残らない");
    assert.equal(api(w).isPending(), false);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚も片付く");
    assert.equal(fire(w).pending, true, "外れた後はすぐ再発射できる(Cooldownは無い)");
});

test("重複防止: 確定待ちの間は、同じカードの再発動はすべて「volleyPending」で非消費の失敗。矢は増えず、消費は命中の1回だけ", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w, [4]);
    placePolar(w, 4, 8, 90);
    aimDegree(w, 90, 4);
    assert.equal(fire(w).pending, true);
    assert.equal(arrowEvents(w).length, 5);
    const again = fire(w);
    assert.equal(again.ok, false);
    assert.equal(again.pending, undefined, "予約にならない");
    assert.equal(again.detail, "volleyPending");
    for (let index = 1; index < 5; index++) assert.equal(fire(w, { index }).detail, "volleyPending", `別のスロット${index}の同じカードも拒否`);
    frames(w, 3);
    assert.equal(fire(w).detail, "volleyPending");
    assert.equal(arrowEvents(w).length, 5, "矢は増えない");
    settle(w);
    assert.equal(lost(w, 4), 50);
    assert.equal(pile(w).length, 1, "消費は1回");
    assert.equal(api(w).isPending(), false);
});

test("確定の失敗: 命中するまでにカードが手札から消えていたら、矢を消して何も与えない(消費も重ねない)", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 8, 90);
    aimDegree(w, 90, 4);
    fire(w);
    const instanceId = plain(api(w).getPending()).instanceId;
    assert.equal(deckApi(w).useBattleCard(instanceId).ok, true, "別の経路で消費(想定外)");
    const pileBefore = pile(w).length;
    settle(w);
    assert.equal(lost(w, 4), 0, "ダメージなし");
    assert.equal(lastResult(w).reason, "cardGone");
    assert.equal(pile(w).length, pileBefore, "二重に消費しない");
    assert.equal(arrowEvents(w).length, 0);
    assert.equal(api(w).isPending(), false);
});

test("確定の失敗: 消費の正規経路が失敗したら、矢を消して何も与えない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 8, 90);
    aimDegree(w, 90, 4);
    fire(w);
    const d = deckApi(w);
    // 確定の消費(requestUseCardの正規経路)を失敗させる: ルーターが呼ぶ「ground」のhandlerを、確定の間だけ失敗に差し替える
    const handler = d.getActivationHandler("ground");
    d.registerActivationHandler("ground", context => context.definition.cardId === VOLLEY ? { ok: false, reason: "forcedFailure" } : handler(context));
    settle(w);
    d.registerActivationHandler("ground", handler);
    assert.equal(lost(w, 4), 0);
    assert.equal(arrowEvents(w).length, 0);
    assert.equal(api(w).isPending(), false);
    assert.equal(pile(w).length, 0);
});

test("戦闘の終了・マップ移動・ロード・プレイヤーの死亡で、飛んでいる矢と確定待ちとスリップを片付ける", () => {
    const setup = () => {
        const w = volleyWorld({ level: 2 });
        parkOthers(w, [4]);
        placePolar(w, 4, 9, 90);
        aimDegree(w, 90, 4);
        fire(w);
        frames(w, 2);
        assert.equal(arrowEvents(w).length, 5);
        return w;
    };
    const w1 = setup();
    deckApi(w1).endCardBattle();
    assert.equal(arrowEvents(w1).length, 0, "戦闘終了");
    assert.equal(api(w1).isPending(), false);
    assert.equal(lastResult(w1).reason, "battleEnd");
    const w2 = setup();
    w2.ctx.$gameMap.setup(4);
    assert.equal(api(w2).isPending(), false, "マップ移動");
    assert.equal(arrowEvents(w2).length, 0);
    const w3 = setup();
    w3.ctx.DataManager.extractSaveContents(w3.ctx.DataManager.makeSaveContents());
    assert.equal(api(w3).isPending(), false, "ロード");
    assert.equal(api(w3).getActiveArrows().length, 0);
    // スリップも片付く
    const w4 = volleyWorld({ level: 2 });
    parkOthers(w4, [4]);
    placePolar(w4, 4, 6, 90);
    aimDegree(w4, 90, 4);
    fire(w4);
    settle(w4);
    assert.equal(plain(api(w4).getActiveSlips()).length, 1);
    deckApi(w4).endCardBattle();
    assert.equal(plain(api(w4).getActiveSlips()).length, 0, "戦闘終了でスリップも止まる");
});

test("演出: Apolloが弓を引く(Swing Weapon)・主人公が手を前に突き出す(ArmExtend)・通常カットイン・金色の閃光と光の粒子。いずれも発射時に1回だけで、確定時に重ねて出さない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    const log = { swing: [], action: [], cut: [], vfx: [] };
    const sv = w.ctx.ProjectRGodSummonVisual, cp = w.ctx.ProjectRCharacterPresentation, ci = w.ctx.ProjectRCutIn, pv = w.ctx.ProjectRPresentationVfx;
    const swing = sv.swingWeapon, request = cp.request, show = ci.show, play = pv.play;
    sv.swingWeapon = (...a) => { log.swing.push(a); return swing.apply(sv, a); };
    cp.request = (...a) => { log.action.push(a); return request.apply(cp, a); };
    ci.show = (...a) => { log.cut.push(a); return show.apply(ci, a); };
    pv.play = (...a) => { log.vfx.push(a); return play.apply(pv, a); };
    fire(w);
    assert.deepEqual(log.swing.map(a => [a[0], a[1], a[2]]), [["apollo", 90, "ProjectR_Bow_DEV"]], "Apolloの弓");
    assert.deepEqual(log.action.map(a => a[0]), ["ArmExtend"], "主人公は手を前に突き出す");
    assert.equal(log.cut.length, 1, "通常カットイン");
    assert.deepEqual(plain(log.cut[0][0]), { kind: "card", godId: "apollo", cardId: VOLLEY });
    assert.deepEqual(log.vfx.map(a => a[0]), ["apollo_volley.burst"], "発射の閃光");
    assert.equal(log.vfx[0][1].degree, 90);
    frames(w, 15); // Apolloの表示Eventが現れたら光の粒子
    settle(w);
    assert.equal(lost(w, 4), 50);
    assert.equal(log.cut.length, 1, "確定(消費)でカットインを重ねない");
    assert.equal(log.action.filter(a => a[0] === "ArmExtend").length, 1, "確定で動作を重ねない");
    assert.equal(log.swing.length, 1);
    assert.ok(log.vfx.filter(a => a[0] === "apollo_volley.particles").length <= 1, "光の粒子は最大1回");
    // 素材がそろっている
    for (const file of ["img/characters/VFX/$ProjectR_GoldenArrow.png", "img/characters/VFX/$ProjectR_GoldenArrowThick.png", "img/pictures/ProjectR_Bow_DEV.png",
        "img/pictures/Animation/ProjectR_Volley_Burst.png", "img/pictures/Animation/ProjectR_Volley_Particles.png", "img/characters/$DEV3H_ArmExtend_f4.png"]) {
        assert.ok(fs.existsSync(path.join(project, file)), file);
    }
    const library = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    assert.ok(library.ProjectR_Volley_Burst && library.ProjectR_Volley_Particles, "VFX Designerのライブラリに登録済み");
    assert.equal(library.ProjectR_Volley_Burst.spritesheetFile, "Animation/ProjectR_Volley_Burst");
    assert.ok(fs.existsSync(path.join(project, "img/pictures", library.ProjectR_Volley_Particles.spritesheetFile + ".png")));
});

test("演出が失敗しても、消費・ダメージ・Cooldownは変わらない(VFX・カットイン・弓・動作が例外を投げても)", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    w.ctx.ProjectRPresentationVfx.play = () => { throw new Error("vfx down"); };
    w.ctx.ProjectRCutIn.show = () => { throw new Error("cutin down"); };
    w.ctx.ProjectRGodSummonVisual.swingWeapon = () => { throw new Error("swing down"); };
    w.ctx.ProjectRCharacterPresentation.request = () => { throw new Error("motion down"); };
    assert.equal(fire(w).pending, true);
    settle(w);
    assert.equal(lost(w, 4), 50);
    assert.equal(pile(w).length, 1);
});

test("バランス設定: 本数・間隔・ダメージ・太さ・スリップ・速さ・射程・Cooldownは、すべてProjectR_CardBalance.jsonから。変えると発動に反映される(開発用の上書き)", () => {
    const w = volleyWorld({ level: 2 });
    const b = balanceOf(w);
    assert.equal(b.setOverride(VOLLEY, 1, "damage", 70).ok, true);
    assert.equal(b.setOverride(VOLLEY, 2, "projectileCount", 7).ok, true);
    assert.equal(b.setOverride(VOLLEY, 1, "spreadDegrees", 20).ok, true);
    assert.equal(b.setOverride(VOLLEY, 2, "thickWidthTiles", 1.2).ok, true);
    assert.equal(b.setOverride(VOLLEY, 2, "splitTotal", 60).ok, true);
    assert.equal(b.setOverride(VOLLEY, "constant", "projectileSpeed", 10).ok, true);
    assert.equal(b.setOverride(VOLLEY, "constant", "pathWidthTiles", 0.4).ok, true);
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    fire(w);
    const list = arrows(w);
    assert.deepEqual(list.map(a => a.degree), [30, 50, 70, 90, 110, 130, 150], "7本・間隔20度");
    assert.deepEqual(list.map(a => a.width), [0.4, 0.4, 0.4, 1.2, 0.4, 0.4, 0.4]);
    frames(w, 6);
    assert.ok(Math.abs(arrows(w)[3].travelled / 5 * 60 - 10) < 1.5, `速さ10マス/秒: ${arrows(w)[3].travelled}`);
    settle(w);
    assert.equal(lost(w, 4), 70, "ダメージ70");
    assert.deepEqual(plain(api(w).getActiveSlips())[0].ticks, [12, 12, 12, 12, 12], "スリップ合計60");
    b.resetAll();
    assert.equal(api(w).effectsForLevel(2).damage, 50, "リセットで既定に戻る");
    // 射程
    const far = volleyWorld({ level: 1 });
    const fb = balanceOf(far);
    assert.equal(fb.setOverride(VOLLEY, "constant", "rangeTiles", 3).ok, true);
    parkOthers(far);
    aimDegree(far, 90, 4);
    fire(far);
    settle(far);
    assert.equal(lastResult(far).reason, "missed");
    // Cooldown
    const cd = volleyWorld({ level: 1 });
    assert.equal(balanceOf(cd).setOverride(VOLLEY, "cooldown", "cooldownSeconds", 1.5).ok, true);
    assert.equal(balanceOf(cd).cooldownSeconds(VOLLEY), 1.5);
});

test("バランス設定が使えないときは「balanceUnavailable」で失敗し、矢も出ず、カードを消費しない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    aimDegree(w, 90, 4);
    const saved = w.ctx.ProjectRCardBalance;
    w.ctx.ProjectRCardBalance = { isReady: () => false, hasCard: () => false };
    const before = plain(state(w));
    const result = fire(w);
    w.ctx.ProjectRCardBalance = saved;
    assert.equal(result.ok, false);
    assert.equal(result.detail, "balanceUnavailable");
    assert.equal(arrowEvents(w).length, 0);
    assert.deepEqual(plain(state(w)), before);
});

test("属性は無属性のまま(割り当てない): 命中の記録は属性0・有効度1。弱点の敵でも倍率は変わらない", () => {
    const w = volleyWorld({ level: 1 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    fire(w);
    settle(w);
    const fixedCalls = countCommands(w, "Hendrix_Action_Engine", "UpdateEventHp").filter(c => c.args.projectRFixed && c.args.projectRFixed.source === VOLLEY);
    assert.ok(fixedCalls.length >= 1);
    for (const call of fixedCalls) {
        assert.equal(call.args.projectRFixed.element, 0);
        assert.equal(call.args.projectRFixed.weaknessMultiplier, 1);
        assert.equal(call.args.projectRFixed.base, 50);
    }
    assert.equal(lost(w, 4), 50, "ダメージの数値は変わらない");
});

test("セーブ互換: 発射・命中・スリップはセーブデータを1つも変えない(所持・デッキ・Levelは同じ)。旧セーブ(カード未所持)ではこのカードは使えず、旧Apollo 3枚は不変", () => {
    const w = volleyWorld({ level: 2 });
    parkOthers(w, [4]);
    placePolar(w, 4, 6, 90);
    aimDegree(w, 90, 4);
    const persistent = plain(deckApi(w).getPersistentData());
    const systemKeys = Object.keys(w.ctx.$gameSystem).sort();
    fire(w);
    settle(w);
    for (let i = 0; i < 360; i++) deckApi(w).updateCooldown(1 / 60);
    assert.deepEqual(plain(deckApi(w).getPersistentData()), persistent, "永続データ(所持・デッキ・Level)は同じ");
    assert.deepEqual(Object.keys(w.ctx.$gameSystem).sort(), systemKeys, "$gameSystemに新しい欄を作らない");
    const text = JSON.stringify(w.ctx.$gameSystem);
    assert.equal((text.match(/apollo_golden_volley/g) || []).length, 1, "所持の記録だけ(Level)。矢の状態は無い");
    // 旧セーブ相当: 何も所持していない世界ではこのカードは使えない・デッキに入らない
    const fresh = volleyWorld({ level: 1 });
    const d = deckApi(fresh);
    const base = plain(d.getPersistentData());
    assert.equal(base.cardOwnership[VOLLEY].owned, true);
    const legacyIds = [LEGACY_ARROW, "apollo_plague_attack", "apollo_lyre_calm"];
    for (const id of legacyIds) assert.ok(d.definitions.card(id), id + " は残っている");
    assert.deepEqual([d.definitions.card(LEGACY_ARROW).maxCopies, d.definitions.card(LEGACY_ARROW).cooldownSeconds], [3, 4]);
    const empty = w.ctx.ProjectRCardDeck.normalizePersistentData({}, d.definitions);
    assert.ok(!empty.cardOwnership[VOLLEY] || empty.cardOwnership[VOLLEY].owned !== true, "未所持が既定");
    assert.ok(!(empty.deck || []).includes(VOLLEY), "既定のデッキに入らない");
});

test("本番の取得経路には載らない: Hermesの初期付与(指輪の初回入手)に含まれず、Apolloの30枚デッキは他の7枚が未実装なので組み立てられない", () => {
    const w = volleyWorld({ level: 1 });
    const cat = w.ctx.ProjectRCardCatalog;
    assert.equal(cat.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0);
    assert.equal(cat.isGodDeckReady("apollo"), require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length === 0);
    assert.equal(cat.godStatus("apollo").ready, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length === 0);
    assert.deepEqual(cat.godStatus("apollo").blockers.length, A7_RESERVED.length, "Apolloの未実装は一覧の残り");
    const production = w.ctx.ProjectRHermesProductionDeck;
    const starter = plain(production.starterSet());
    assert.ok(Object.keys(starter).length >= 7 || starter.length >= 7, "初期セットはHermesの7枚");
    assert.ok(!JSON.stringify(starter).includes(VOLLEY), "Hermesの初期付与に黄金の矢は含まれない");
    assert.deepEqual(plain(production.starterProblems()), []);
    assert.ok(!JSON.stringify(plain(production.previewStarterGrant())).includes(VOLLEY));
});

test("Lv3のビームは実装済み(A5B): ビーム・ヒットストップの部品がある。詳細は ProjectR_ApolloA5B.test.cjs", () => {
    const text = fs.readFileSync(path.join(project, "js/plugins/ProjectR_ApolloGoldenVolley.js"), "utf8");
    assert.ok(/processBeam/.test(text) && /ProjectR_HitStop/.test(text));
    assert.ok(fs.existsSync(path.join(project, "js/plugins/ProjectR_HitStop.js")));
});

test("実装の配線: プラグインの並び(CardCatalog/CardBalance/CardModifiers/CutIn/CharacterPresentationより後)・Map002のPrefab・複製元の不変", () => {
    const config = {};
    require("node:vm").runInNewContext(fs.readFileSync(path.join(project, "js/plugins.js"), "utf8"), config);
    const names = config.$plugins.map(p => p.name);
    const at = name => names.indexOf(name);
    for (const dep of ["ProjectR_CardCatalog", "ProjectR_CardBalance", "ProjectR_CardModifiers", "ProjectR_CutIn", "ProjectR_CharacterPresentation", "ProjectR_PresentationVfx", "ProjectR_GodSummonVisual", "ProjectR_HermesZetsu", "ProjectR_CombatOcclusion"]) {
        assert.ok(at(dep) >= 0 && at(dep) < at("ProjectR_ApolloGoldenVolley"), dep + " より後");
    }
    assert.ok(fs.existsSync(path.join(project, "js/plugins/ProjectR_ApolloGoldenVolley.js")), "ファイル名と登録名が一致");
    assert.equal(config.$plugins[at("ProjectR_ApolloGoldenVolley")].status, true);
    assert.ok(JSON.parse(config.$plugins[at("ProjectR_CutIn")].parameters.CutInCardIds).includes(VOLLEY), "通常カットインの対象");
    const template = JSON.parse(fs.readFileSync(path.join(project, "data/Map002.json"), "utf8")).events.filter(Boolean);
    const arrow = template.find(e => e.name === "ProjectR Apollo Golden Volley Arrow");
    assert.ok(arrow && arrow.note.includes("<projectRGoldenVolley>") && arrow.note.includes("<attacker: player>"));
    assert.equal(arrow.pages[0].moveRoute.list[0].parameters[0], "moveToPosition('forward')", "公式の前進(追尾なし)");
    assert.equal(arrow.pages[0].through, true);
    // 既存のPrefab(旧黄金の弓矢・疫病・奥義・神・G17)は1つも変えていない
    const head = JSON.parse(git("show", "96745ec:data/Map002.json")).events.filter(Boolean);
    for (const old of head) assert.deepEqual(template.find(e => e.id === old.id), old, `Prefab ${old.id} ${old.name}`);
    // 既存の3つのApollo旧カードのpluginは変えていない
    assert.equal(git("diff", "--stat", "96745ec", "--", "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_ApolloDiseaseAttack.js", "js/plugins/ProjectR_ApolloLyreCalm.js", "js/plugins/ProjectR_ApolloUltimate.js").trim(), "");
});

test("DEVの入口(ProjectRApolloTest): Playtestでだけ公開され、Apolloの指輪・所持・Lvを整えて手札5枚を黄金の矢にする。Playtest以外では何も公開しない", () => {
    const { buildWorld } = fx;
    const w = buildWorld();
    w.enterMap(4, 12, 25); w.frames(3); w.mouse(700, 300);
    const test = w.ctx.ProjectRApolloTest;
    assert.ok(test && typeof test.start === "function");
    const result = plain(test.start(2));
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.hand, [VOLLEY, VOLLEY, VOLLEY, VOLLEY, VOLLEY]);
    assert.equal(result.level, 2);
    assert.equal(plain(test.status()).cardBattleActive, true);
    assert.deepEqual(plain(test.setLevel(1)), { ok: true, level: 1 });
    assert.equal(plain(test.end()).ok !== false, true);
    w.ctx.Graphics.frameCount = 100000; // 戦闘の余韻(CombatPresenceの終了猶予)を明かす(ハーネスではフレームカウンタが無い)
    w.frames(3);
    assert.equal(deckApi(w).hasPlayerRing("apollo"), false, "余韻が明けたら、DEVの入口が渡した指輪は開始前へ戻る");
    assert.equal(deckApi(w).isCardOwned(VOLLEY), false, "所持も開始前へ戻る");
    const production = buildWorld({ playtest: false });
    assert.equal(production.ctx.ProjectRApolloTest, undefined, "Playtest以外では公開しない");
    assert.ok(production.ctx.ProjectRApolloGoldenVolley, "カード本体は本番でも読み込まれる");
});

console.log(`\n${passed} tests passed`);
