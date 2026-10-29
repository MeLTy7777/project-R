"use strict";
// Phase H1: Hermes「絶」(Zetsu)。実エンジン(実rmmz_* + DotMoveSystem + Hendrix_Action_Engine + 全ProjectR plugin)を
// 本番のplugin順で読み込み、実Map004(Combat Test Arena)で、物理キーQ/E/X/C/V → requestUseCard → 実DotMoveの経路を通して確認する。
// これは「MZ実機で確認済み」ではない。描画・音・実マウス・VFX Designerの実再生は対象外(docs/ProjectR_HermesZetsu_H1.md の実機手順を参照)。
const assert = require("node:assert/strict");
const { buildWorld, plain, zetsuWorld, aim, deckApi, zetsuApi, hand, player, pos, near, setRegion, addWallEvent, ZETSU } = require("./ProjectR_HermesZetsuFixture.cjs");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

// ---------------- 登録・互換・設計カタログ ----------------
test("旧7枚のCardDefinitions(plugins.js)は変えず、絶は実行時に追加される(旧セーブ・旧テストの互換)", () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    const params = JSON.parse(w.ctx.$plugins.find(p => p.name === "ProjectR_CardDeckCore").parameters.CardDefinitions).map(JSON.parse);
    assert.deepEqual(params.map(c => c.cardId), ["hermes_swift_movement", "hermes_reed_flute_sleep", "hermes_perception_obscure", "hermes_sword_attack",
        "apollo_golden_arrow", "apollo_plague_attack", "apollo_lyre_calm"], "パラメータの旧7枚は不変");
    const def = deckApi(w).definitions.card(ZETSU);
    assert.deepEqual(plain(def), { cardId: ZETSU, ringId: "hermes", maxCopies: 5, cooldownSeconds: 0.5, maxLevel: 3, rarity: "strong", category: "movement", targetType: "ground" });
    assert.equal(Object.isFrozen(def), true);
    assert.equal(deckApi(w).definitions.cardDefinitions().length, 14, "旧7 + 実行時に追加した7(絶・薙ぎ払い・葦笛・一閃・ストレングス・ヴェイル・サイコポンポス)");
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.registeredRuntimeCards()), [ZETSU, "hermes_sweep", "hermes_reed_flute", "hermes_issen", "hermes_strength", "hermes_veil", "hermes_psychopomp"]);
    // 旧カードの定義は一切変わっていない
    const reed = deckApi(w).definitions.card("hermes_reed_flute_sleep");
    assert.deepEqual([reed.maxCopies, reed.cooldownSeconds, reed.rarity], [2, 12, "strong"]);
    // 既定は未所持(本番の所持データ・デッキに影響しない)
    w.enterMap(4, 25, 26);
    assert.equal(deckApi(w).isCardOwned(ZETSU), false);
    assert.equal(deckApi(w).getPersistentData().cardOwnership[ZETSU], undefined);
});

test("設計カタログ: Hermes 7枚の分類・最大コピー数・Cooldownがユーザー確定値どおり。合計は丁度30。設計IDはランタイムIDではない", () => {
    const w = buildWorld();
    const catalog = w.ctx.ProjectRCardCatalog;
    const rows = plain(catalog.hermesDesign()).map(c => [c.designId, c.name, c.classification, c.maxCopies, c.cooldownSeconds]);
    assert.deepEqual(rows, [
        [1, "一閃", "strong", 3, 7], [2, "サイコポンポス", "normal", 3, 10], [3, "ヴェイル", "special", 3, 10], [4, "ストレングス", "special", 10, 0.1],
        [5, "薙ぎ払い", "normal", 3, 0.5], [6, "葦笛", "strong", 3, 8], [7, "絶", "strong", 5, 0.5]]);
    assert.equal(catalog.hermesTotalMaxCopies(), 30);
    const implemented = plain(catalog.hermesDesign()).filter(c => c.implemented);
    assert.deepEqual(implemented.map(c => [c.designId, c.runtimeCardId]), [[1, "hermes_issen"], [2, "hermes_psychopomp"], [3, "hermes_veil"], [4, "hermes_strength"], [5, "hermes_sweep"], [6, "hermes_reed_flute"], [7, ZETSU]],
        "実装済みは設計の全7枚(H2B-3B)。設計IDはランタイムIDとは別の識別子");
    // 未実装の2枚は旧cardIdへ紐付けない(候補は参考情報のみ)
    for (const card of plain(catalog.hermesDesign()).filter(c => !c.implemented)) assert.equal(card.runtimeCardId, null);
    assert.deepEqual(plain(catalog.hermesDesign()[5].legacyCandidates), ["hermes_reed_flute_sleep"]);
    assert.equal(Object.isFrozen(catalog.hermesDesign()), true);
});

test("本番の最終30枚デッキは、7枚すべてが実装されるまで有効にしない(絶だけでは作れない)", () => {
    const w = buildWorld();
    const catalog = w.ctx.ProjectRCardCatalog;
    // H2B-3B: 7枚すべてが実装済み = 実装は揃った。ただし本番の30枚デッキは有効にしない(適用しない)。
    assert.equal(catalog.isFinalDeckReady(), true);
    assert.equal(catalog.isFinalDeckActivated(), false);
    assert.deepEqual(plain(catalog.finalDeckBlockers()), []);
    w.enterMap(4, 25, 26);
    assert.deepEqual(plain(deckApi(w).getDeck()), [], "保存デッキは空のまま(自動設定しない)");
    assert.equal(deckApi(w).isDeckValid(), false);
});

test("累積レベル: 後のレベルの同名effectは置換(加算・乗算しない)。Lv1/Lv2の効果はLv3にも残る", () => {
    const w = buildWorld();
    const resolve = w.ctx.ProjectRCardCatalog.resolveLevels;
    const lv = n => plain(zetsuApi(w).effectsForLevel(n));
    assert.deepEqual(lv(1), { hitMultiplier: 1.5, hitSeconds: 0.8 });
    assert.deepEqual(lv(2), { hitMultiplier: 2.0, hitSeconds: 0.8 }, "Lv1の0.8秒を残し、倍率だけ置換");
    assert.deepEqual(lv(3), { hitMultiplier: 3.0, hitSeconds: 0.8, speedFactor: 2.0, speedSeconds: 1.0 }, "Lv3の倍率は3.0(6.5でも9.0でもない)");
    assert.notEqual(lv(3).hitMultiplier, 1.5 + 2.0 + 3.0);
    assert.notEqual(lv(3).hitMultiplier, 1.5 * 2.0 * 3.0);
    assert.deepEqual(lv(0), lv(1), "0以下はLv1");
    assert.deepEqual(lv(99), lv(3), "最大Lvを超えても追加効果は増えない");
    // 並び順に依らない / 汎用(他の神にも使える)
    const rows = [{ level: 3, effects: { a: 3 } }, { level: 1, effects: { a: 1, b: 10 } }, { level: 2, effects: { a: 2, c: 5 } }];
    assert.deepEqual(plain(resolve(rows, 2)), { a: 2, b: 10, c: 5 });
    assert.deepEqual(plain(resolve(rows, 3)), { a: 3, b: 10, c: 5 });
    assert.deepEqual(plain(resolve(null, 3)), {});
    assert.equal(Object.isFrozen(resolve(rows, 1)), true);
});

// ---------------- 移動先の計算 ----------------
test("計算: 何もない地面では、マウスの位置(足元基準)へそのまま移動する。状態は変えない", () => {
    const w = zetsuWorld();
    const before = pos(w);
    aim(w, 5, 0);
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    near(plan.land.x, before.x + 5, 0.01, "5タイル右");
    near(plan.land.y, before.y, 0.01);
    assert.equal(plan.limiter, "none");
    assert.deepEqual(pos(w), before, "plan()は移動しない");
    assert.equal(hand(w).filter(id => id === ZETSU).length, 5, "plan()は消費しない");
    assert.deepEqual(w.calls.map(c => c.name), [], "VFX等も出さない");
});

test("計算: 通行不能な地形の手前で止まり、壁の中・外には決して入らない(下方向)", () => {
    const w = zetsuWorld({ x: 6, y: 25 }); // x=11〜13は壁の切れ目(出入口)なので避ける
    aim(w, 0, 4); // 下の壁(行28)の向こう側を指す
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    // 通行不能な地形は、DotMoveのCollision(collision)とCombatOcclusionの壁辺(wall)のどちらでも止まる。先に当たったほうが理由になる。
    assert.ok(["collision", "wall"].includes(plan.limiter), plan.limiter);
    assert.ok(plan.land.y <= 27 + 1e-3 && plan.land.y >= 26.8, `壁(y=28)の手前で止まる: ${plan.land.y}`);
    near(plan.land.x, 6, 0.01);
    const m = w.ctx.$gameMap;
    // 着地矩形[land, land+1]が重なるタイルはすべて通行できる
    for (const tx of [Math.floor(plan.land.x), Math.floor(plan.land.x + 0.999)]) {
        for (const ty of [Math.floor(plan.land.y), Math.floor(plan.land.y + 0.999)]) {
            assert.ok([2, 4, 6, 8].some(d => m.isPassable(tx, ty, d)), `着地タイル(${tx},${ty})は通行可能`);
        }
    }
});

test("計算: 通行不能なEvent(DEV Impassable Event)の手前で止まる", () => {
    const w = zetsuWorld({ x: 15, y: 3 });
    const event = w.ctx.$gameMap.event(1);
    assert.equal(event._x, 11);
    assert.equal(event.isThrough(), false);
    aim(w, -6, 0);
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    assert.equal(plan.limiter, "collision");
    assert.ok(plan.land.x >= 12 - 1e-3 && plan.land.x <= 12.2, `Event(x=11..12)の右で止まる: ${plan.land.x}`);
});

test("計算: Region 255(VisionWall)は、タイル自体が通行可能でも通さない。壁の手前で止まる", () => {
    const w = zetsuWorld();
    for (let y = 23; y <= 27; y++) setRegion(w, 16, y, 255); // 縦一列のRegion 255
    assert.equal(w.ctx.$gameMap.regionId(16, 25), 255);
    assert.equal([2, 4, 6, 8].some(d => w.ctx.$gameMap.isPassable(16, 25, d)), true, "地形としては通れる(Regionだけが壁)");
    aim(w, 6, 0);
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    assert.equal(plan.limiter, "wall");
    assert.ok(plan.land.x + 1 <= 16 + 1e-6, `矩形の右端(${plan.land.x + 1})がRegion 255(x=16)に入らない`);
    assert.ok(plan.land.x >= 14.5, `壁の直前まで進む: ${plan.land.x}`);
});

test("計算: <VisionWall>・<CombatWall> の壁Eventも、本体矩形ごとスイープして手前で止まる(薄い壁のすり抜けなし)", () => {
    for (const kind of ["VisionWall", "CombatWall"]) {
        const w = zetsuWorld();
        for (let y = 23; y <= 27; y++) addWallEvent(w, kind, 16, y);
        aim(w, 7, 0);
        const plan = plain(zetsuApi(w).plan());
        assert.equal(plan.ok, true, `${kind}: ${JSON.stringify(plan)}`);
        assert.equal(plan.limiter, "wall", kind);
        assert.ok(plan.land.x + 1 <= 16 + 1e-6 && plan.land.x >= 14.5, `${kind}: ${plan.land.x}`);
    }
});

test("計算: 壁を取り除けば、同じ入力で壁の向こうへ移動できる(上のテストが壁で止まっていたことの対照)", () => {
    const w = zetsuWorld();
    aim(w, 6, 0);
    const open = plain(zetsuApi(w).plan());
    assert.equal(open.ok, true);
    near(open.land.x, 18, 0.01, "壁なしなら6タイル先");
    assert.equal(open.limiter, "none");
});

test("計算: 画面の外を指しても、現在見えている画面の端までに制限される(マウス座標をクランプ)", () => {
    const w = zetsuWorld();
    const sx = player(w).screenX(), sy = player(w).screenY();
    w.mouse(100000, sy);
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    const expected = (w.ctx.Graphics.width - sx) / 48;
    near(plan.requested, expected, 0.01, "画面右端まで");
    assert.ok(plan.requested < 9, "17タイル幅の画面の半分程度");
    w.mouse(-100000, -100000);
    const left = plain(zetsuApi(w).plan());
    near(left.requested, Math.hypot(sx / 48, sy / 48), 0.01, "画面の左上隅まで");
});

test("計算: マップ端はループ設定でも越えない(境界で止める)", () => {
    const w = zetsuWorld({ x: 3, y: 26 });
    // 境界だけを確かめるため、地形の通行不能を取り除いた仮のMapにする(メモリ上のみ)
    const m = w.ctx.$gameMap;
    m.isPassable = () => true;
    m.checkPassage = () => true;
    m.isLoopHorizontal = () => true;
    aim(w, -8, 0);
    const plan = plain(zetsuApi(w).plan());
    assert.equal(plan.ok, true, JSON.stringify(plan));
    assert.equal(plan.limiter, "bounds");
    assert.ok(plan.land.x >= -1e-9, `マップ外(x<0)に出ない: ${plan.land.x}`);
    near(plan.land.x, 0, 0.01);
});

test("計算: 動ける地点が無いときは失敗する(その場を指す・壁に接して壁を指す)", () => {
    const w = zetsuWorld({ x: 6, y: 25 });
    aim(w, 0, 0);
    assert.equal(plain(zetsuApi(w).plan()).reason, "noDestination");
    // 下の壁にぴったり接した位置から、壁の向こうを指す
    w.placePlayer(6, 27);
    w.frames(1);
    aim(w, 0, 3);
    const flush = plain(zetsuApi(w).plan());
    assert.equal(flush.ok, false);
    assert.equal(flush.reason, "blocked");
});

