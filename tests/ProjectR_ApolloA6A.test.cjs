"use strict";
// Phase Apollo-A6A: Apollo「エロスの矢」(設計ID 9 / apollo_eros_arrow)Lv1。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(マウス・実キー・描画)は対象外 → tools/mz_cdp/apollo_a6a_verify.cjs。Lv1の確認(Lv2はA6B)。
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloErosFixture.cjs");
const { assert, plain, erosWorld, EROS, api, handIds, state, fire, frames, aimDegree, barHp, lost, resetHp, arrowEvents, consumedHand, pile, addAlly, allyHp, settle,
    center, placeEnemy, placePolar, parkOthers, player, deckApi, setRegion, addWallEvent } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const balanceOf = w => w.ctx.ProjectRCardBalance;
const lastResult = w => plain(api(w).getLastResult());
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const hits = w => plain(api(w).getHitLog());
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(EROS, scope, key, value); assert.equal(r.ok, true, JSON.stringify(r)); };
const leader = w => w.ctx.$gameParty.leader();
const spySe = w => { const se = [], am = w.ctx.AudioManager, original = am.playSe; am.playSe = s => { se.push(s.name); }; return { se, restore: () => { am.playSe = original; } }; };

test("登録: 特殊 / 最大5枚 / Cooldown 5秒 / Ground / Apolloの指輪 / 登録上の最大LvはA6CでLv3まで。黄金の矢・旧カードは不変", () => {
    const w = erosWorld();
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(EROS)), { cardId: EROS, ringId: "apollo", maxCopies: 5, cooldownSeconds: 5, maxLevel: 3, rarity: "special", category: "special", targetType: "ground" });
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 9);
    assert.deepEqual([row.runtimeCardId, row.implemented, row.implementedLevels, row.workbookTargetType, row.classification, row.maxCopies, row.cooldownSeconds], [EROS, true, 3, "Ground", "special", 5, 5]);
    assert.equal(row.maxLevel, 3, "ワークブックの最大Lv3は設計行のまま");
    assert.equal(w.ctx.ProjectRCardCatalog.godStatus("apollo").implemented, 2, "Apolloの実装済みは黄金の矢とエロスの矢");
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.inactiveRuntimeCards()).filter(id => id.startsWith("apollo_")).sort(),
        ["apollo_gigas_slayer", "apollo_hyacinthus", "apollo_laurel_wreath", "apollo_lyre_rhythm", "apollo_oracle", "apollo_plague_rain"], "残りの6枚は未登録");
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.runtimeIdAudit().problems), []);
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo"), null, "Apolloの本番の初期デッキ(30枚)は有効にしない");
    // Lv4は無い: レベルを上げようとしてもLv3まで
    const d = deckApi(w);
    const up = d.setCardLevel(EROS, 4);
    assert.equal(Number(d.getPersistentData().cardOwnership[EROS].level) <= 3, true, "Lv4へ上げられない(最大Lv3) " + JSON.stringify(plain(up)));
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_golden_volley").maxLevel, 3, "黄金の矢のLvは不変");
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_golden_arrow").maxCopies, 3, "旧カードは不変");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・HitStop・黄金の矢・旧Apollo)", () => {
    assert.equal(git("diff", "--stat", "d1ed4f1", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js",
        "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_HitStop.js", "js/plugins/ProjectR_CardBattleInput.js").trim(), "");
});

test("バランス: 本数・連射の時間・追尾の範囲・曲がる速さ・ダメージ・回復・Cooldown・寿命・速さがJSON/F6にあり、不正値は拒否する", () => {
    const w = erosWorld();
    const cfg = plain(api(w).config());
    assert.deepEqual([cfg.count, cfg.emitSeconds, cfg.radius, cfg.turnRate, cfg.damage, cfg.heal, cfg.speed, cfg.lifetimeSeconds, cfg.element, cfg.weaknessMultiplier, cfg.selfHeal, cfg.fullHp],
        [10, 1, 3, 720, 20, 50, 12, 2, 0, 1, false, false]);
    assert.equal(balanceOf(w).cooldownSeconds(EROS), 5);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["emitSeconds", "homingRadiusTiles", "homingTurnRate", "projectileLifetimeSeconds", "selfHealEnabled", "fullHpAlliesEligible", "projectileSpeed", "damage", "healAmount", "arrowsPerDirection", "directionCount", "directionSpacingDegrees", "directionOriginOffsetTiles"]) {
        assert.ok(fields[key], key + " がフィールド定義にある");
    }
    const described = plain(balanceOf(w).describe(EROS));
    assert.ok(JSON.stringify(described).includes("homingRadiusTiles") && JSON.stringify(described).includes("healAmount"), "エディタ用のdescribeに出る");
    assert.equal(balanceOf(w).validate(EROS, "constant", "homingRadiusTiles", 21).ok, false);
    assert.equal(balanceOf(w).validate(EROS, "constant", "projectileLifetimeSeconds", 5).ok, false, "寿命の上限は4秒(矢Eventの安全網300frame未満)");
    assert.equal(balanceOf(w).validate(EROS, "constant", "selfHealEnabled", 0.5).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 1, "arrowsPerDirection", 0).ok, false);
    override(w, 3, "arrowsPerDirection", 3); // Lv3の行を触っても、実装しているLv1〜2の効果は変わらない(Lv3は未実装)
    assert.deepEqual([api(w).config().damage, api(w).config().count], [20, 10], "Lv3の設定はLv1に影響しない");
    balanceOf(w).resetCard(EROS);
    override(w, "constant", "emitSeconds", 0.5); override(w, 1, "arrowsPerDirection", 4); override(w, 1, "damage", 33);
    const changed = plain(api(w).config());
    assert.deepEqual([changed.emitFrames, changed.count, changed.damage], [30, 4, 33]);
});

test("連射: 1秒(60更新)にちょうど10本。0,6,…,54更新目に等間隔。10本を超えて出ない。時間と本数の設定が効く", () => {
    const w = erosWorld();
    parkOthers(w, []); aimDegree(w, 90, 3);
    fire(w);
    let maxEvents = 0;
    for (let i = 0; i < 70; i++) { frames(w, 1); maxEvents = Math.max(maxEvents, arrowEvents(w).length); }
    const log = plain(api(w).getEmissionLog());
    assert.equal(log.length, 10, "10本");
    assert.deepEqual(log.map(e => e.tick), [0, 6, 12, 18, 24, 30, 36, 42, 48, 54]);
    assert.ok(log.every(e => e.spawned));
    assert.ok(maxEvents <= 10, "矢のEventは同時に10を超えない: " + maxEvents);
    assert.deepEqual(plain(api(w).emitSchedule(10, 60)), [0, 6, 12, 18, 24, 30, 36, 42, 48, 54]);
    assert.deepEqual(plain(api(w).emitSchedule(4, 30)), [0, 7, 15, 22]);
    const half = erosWorld();
    override(half, "constant", "emitSeconds", 0.5); override(half, 1, "arrowsPerDirection", 5);
    parkOthers(half, []); aimDegree(half, 90, 3); fire(half); frames(half, 40);
    assert.deepEqual(plain(api(half).getEmissionLog()).map(e => e.tick), [0, 6, 12, 18, 24], "0.5秒・5本");
});

test("方向転換: 発射の途中でマウスを動かすと、あとの矢は新しい方向へ出る(矢ごとにその瞬間の方向と位置)", () => {
    const w = erosWorld();
    parkOthers(w, []); aimDegree(w, 90, 3);
    fire(w);
    frames(w, 20); // 0,6,12,18 の4本は右(90度)
    aimDegree(w, 180, 3); // 下へ
    frames(w, 20); // 24,30,36 の3本は下(180度)
    aimDegree(w, 0, 3); // 上へ
    frames(w, 30);
    const log = plain(api(w).getEmissionLog());
    assert.equal(log.length, 10);
    const degrees = log.map(e => Math.round(e.degree));
    assert.deepEqual(degrees.slice(0, 4), [90, 90, 90, 90]);
    assert.ok(degrees.slice(4, 7).every(d => d === 180), "途中で下へ: " + degrees);
    assert.ok(degrees.slice(7).every(d => d === 0), "さらに上へ: " + degrees);
    // 出発点は放った瞬間のプレイヤー位置: 途中でプレイヤーが動けば、後の矢の出発点も動く
    const w2 = erosWorld();
    parkOthers(w2, []); aimDegree(w2, 90, 3); fire(w2); frames(w2, 8);
    const p = player(w2); p.setPosition(p._realX + 3, p._realY); frames(w2, 20);
    const log2 = plain(api(w2).getEmissionLog());
    assert.ok(log2[log2.length - 1].x - log2[0].x >= 2.9, "あとの矢の出発点が動く: " + log2.map(e => e.x.toFixed(2)));
});

test("敵への追尾: 3マス以内の敵へ曲がって当たり、1本につき20ダメージ(10本で200)。追尾なしでは外れる", () => {
    const w = erosWorld();
    parkOthers(w, [3]); const c = center(w);
    placeEnemy(w, 3, c.x + 5, c.y - 2); // 右5・上2: まっすぐ右へ撃つと2マスずれる
    aimDegree(w, 90, 3);
    fire(w); settle(w);
    assert.equal(lost(w, 3), 200, "10本x20");
    const result = lastResult(w);
    assert.equal(result.hits.length, 10);
    assert.ok(result.hits.every(h => h.kind === "enemy" && h.damage === 20 && h.hpLost === 20));
    assert.equal(consumedHand(w), 4, "カードは1枚だけ消費");
    // 追尾の範囲を0にすると同じ配置は外れる(追尾の効果)
    const off = erosWorld();
    override(off, "constant", "homingRadiusTiles", 0);
    parkOthers(off, [3]); const c2 = center(off);
    placeEnemy(off, 3, c2.x + 5, c2.y - 2);
    aimDegree(off, 90, 3); fire(off); settle(off);
    assert.equal(lost(off, 3), 0, "追尾なしは外れる");
    assert.equal(lastResult(off).reason, "missed");
});

test("追尾の範囲(3マス): 範囲の外の敵へは曲がらず、内側なら曲がる。範囲は設定で変わる", () => {
    const place = (w, dy) => { parkOthers(w, [3]); const c = center(w); placeEnemy(w, 3, c.x + 8, c.y - dy); aimDegree(w, 90, 3); fire(w); settle(w); return lost(w, 3); };
    // 敵は右8マス・上dyマス。まっすぐ右へ撃つ矢が敵のからだへ最も近づく距離は約 dy - 0.5。それが3マス以内なら曲がって当たる。
    assert.equal(place(erosWorld(), 2.0), 200, "上2マス: 範囲内");
    assert.equal(place(erosWorld(), 3.2), 200, "上3.2マス: からだの縁まで約2.7で範囲内");
    assert.equal(place(erosWorld(), 4.5), 0, "上4.5マス: 一度も3マス以内に入らず曲がらない");
    assert.equal(place(erosWorld(), 7), 0, "上7マス: 範囲外");
    const wide = erosWorld(); override(wide, "constant", "homingRadiusTiles", 8);
    assert.equal(place(wide, 7), 200, "範囲を8にすれば上7マスにも曲がる");
});

test("味方への追尾と回復: 出撃中の仲間へ曲がり、1本につき50(最大HPまで)。敵のダメージは入らない。主人公は既定で対象外", () => {
    const w = erosWorld();
    parkOthers(w, []); const c = center(w);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 5, cy: c.y - 2, maxHp: 400, hp: 100 });
    aimDegree(w, 90, 3);
    const leaderHp = leader(w).hp;
    fire(w); settle(w);
    assert.equal(leader(w).hp, leaderHp, "主人公のHPは変わらない(既定では対象外)");
    assert.equal(allyHp(w, 2), 400, "100 + 50x6 で上限の400(あとの矢は満タンの味方に当たらず素通り)");
    const result = lastResult(w);
    const healed = result.hits.filter(h => h.kind === "ally");
    assert.equal(healed.length, 6, "6本が命中(400-100=300を50ずつ)");
    assert.ok(healed.every(h => h.healed === 50 && h.requested === 50));
    assert.equal(result.hits.filter(h => h.kind === "enemy").length, 0);
    assert.equal(lost(w, 6), 0, "味方のEventにダメージは入らない");
    assert.equal(consumedHand(w), 4, "回復の命中でも消費は1枚");
});

test("味方は傷つけない・敵は回復しない: 仲間のEventが<enemy>を持っていても敵扱いしない。NPCは対象にならない", () => {
    const w = erosWorld();
    parkOthers(w, [3]); const c = center(w);
    // Event 6 は敵の枠(<enemy>)だが、仲間に結び付けると敵ではない
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 4, cy: c.y, maxHp: 300, hp: 300 });
    placeEnemy(w, 3, c.x + 8, c.y);
    aimDegree(w, 90, 3);
    fire(w); settle(w);
    assert.equal(lost(w, 6), 0, "仲間のEventはダメージを受けない");
    assert.equal(allyHp(w, 2), 300, "満タンの仲間は素通り(回復0・当たらない)");
    assert.ok(lost(w, 3) > 0, "素通りして後ろの敵に当たる");
    assert.ok(lastResult(w).hits.every(h => h.kind === "enemy"), "命中はすべて敵(味方に当たっていない)");
    // 敵は回復しない: 敵のHPは増えない(固定ダメージしか与えない)
    assert.ok(barHp(w, 3) <= fx.HP);
    // <npc>のEventや仲間でも敵でもないEventは対象にならない: 敵の枠のEventを仲間に結び付けていない状態で<enemy>を外すことはできないので、roster の判定を確かめる
    assert.equal(w.ctx.ProjectRPartyRoster.isPartyEvent(6), true);
    assert.equal(w.ctx.ProjectRPartyRoster.isPartyEvent(3), false);
});

test("HP満タンの味方(仮): 既定は当てず・追尾もせず素通り(非消費)。fullHpAlliesEligible=1なら当たる(回復0)が確定の有効な命中になる", () => {
    const w = erosWorld();
    parkOthers(w, []); const c = center(w);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 4, cy: c.y, maxHp: 300, hp: 300 });
    aimDegree(w, 90, 3);
    fire(w); settle(w);
    assert.equal(lastResult(w).reason, "missed");
    assert.equal(consumedHand(w), 5, "満タンの味方だけでは消費しない");
    const on = erosWorld();
    override(on, "constant", "fullHpAlliesEligible", 1);
    parkOthers(on, []); const c2 = center(on);
    addAlly(on, { actorId: 2, eventId: 6, cx: c2.x + 4, cy: c2.y, maxHp: 300, hp: 300 });
    aimDegree(on, 90, 3); fire(on); settle(on);
    const result = lastResult(on);
    assert.equal(result.committed, true);
    assert.equal(result.hits.length, 10);
    assert.ok(result.hits.every(h => h.kind === "ally" && h.healed === 0), "満タンなので回復は0");
    assert.equal(allyHp(on, 2), 300);
    assert.equal(consumedHand(on), 4);
});

test("主人公自身(仮): 既定は対象外。selfHealEnabled=1なら、放った位置から離れた矢が減ったHPの主人公へ戻って当たり回復する", () => {
    const w = erosWorld();
    parkOthers(w, []); leader(w).setHp(50); aimDegree(w, 90, 3);
    const hp0 = leader(w).hp;
    fire(w); settle(w);
    assert.equal(leader(w).hp, hp0, "既定では回復しない");
    assert.equal(lastResult(w).reason, "missed");
    const on = erosWorld();
    override(on, "constant", "selfHealEnabled", 1);
    parkOthers(on, []); const mhp = leader(on).mhp; leader(on).setHp(Math.max(1, mhp - 120));
    const before = leader(on).hp;
    // 右へ撃つと、旋回して主人公へ戻る矢が当たる(追尾の範囲3マス・曲がる速さ720度/秒)。まず放った位置から0.8マス離れる必要がある
    aimDegree(on, 90, 3); fire(on); settle(on);
    const result = lastResult(on);
    const selfHits = (result.hits || []).filter(h => h.kind === "self");
    assert.ok(selfHits.length >= 1, "主人公に当たる矢がある: " + JSON.stringify(result.hits));
    assert.ok(selfHits.every(h => h.healed <= 50));
    assert.ok(leader(on).hp > before && leader(on).hp <= mhp);
    assert.equal(consumedHand(on), 4, "自己回復の命中も有効(1枚消費)");
});

test("壁越え: Region 255 / <CombatWall> / <VisionWall> / 通行不能の向こうの敵にも当たり、矢は壁で止まらない", () => {
    for (const kind of ["region", "event", "vision"]) {
        const w = erosWorld();
        parkOthers(w, [4]); const c = center(w);
        const wallX = Math.floor(c.x) + 3;
        for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) {
            if (kind === "region") setRegion(w, wallX, y, 255); else addWallEvent(w, kind === "event" ? "CombatWall" : "VisionWall", wallX, y);
        }
        placePolar(w, 4, 7, 90); aimDegree(w, 90, 4);
        fire(w); settle(w);
        assert.equal(lost(w, 4), 200, kind + ": 壁の向こうの敵に10本とも当たる");
        assert.equal(consumedHand(w), 4);
    }
});

test("任意のNPCは対象にならない: <enemy>でも仲間でもないEventは追尾も命中もせず、矢は素通りして非消費", () => {
    const w = erosWorld();
    parkOthers(w, [3]); const c = center(w);
    const npc = w.ctx.$gameMap.event(3), data = npc.event();
    npc.event = () => ({ ...data, note: "<npc>" }); // 敵のタグを外したNPC
    placeEnemy(w, 3, c.x + 4, c.y);
    aimDegree(w, 90, 3);
    fire(w); settle(w);
    assert.equal(lost(w, 3), 0, "NPCにダメージは入らない");
    assert.equal(lastResult(w).reason, "missed"); assert.equal(consumedHand(w), 5);
});

test("複数の対象と二重命中の防止: 複数の敵・味方へ別々に当たり、1本は1回しか当たらない。矢のEventは全部消える", () => {
    const w = erosWorld();
    parkOthers(w, [3, 4]); const c = center(w);
    placeEnemy(w, 3, c.x + 5, c.y - 1.2); placeEnemy(w, 4, c.x + 5, c.y + 1.2);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 4, cy: c.y + 0.1, maxHp: 1000, hp: 100 });
    aimDegree(w, 90, 3);
    fire(w); settle(w);
    const log = hits(w);
    assert.equal(log.length, 10, "10本が1回ずつ命中");
    assert.equal(new Set(log.map(h => h.arrow)).size, 10, "同じ矢が2回当たらない");
    const kinds = new Set(log.map(h => h.kind));
    assert.ok(kinds.has("enemy") || kinds.has("ally"));
    assert.equal(lost(w, 3) + lost(w, 4), log.filter(h => h.kind === "enemy").length * 20, "ダメージの合計は敵の命中数x20");
    assert.equal(allyHp(w, 2), 100 + log.filter(h => h.kind === "ally").reduce((s, h) => s + h.healed, 0));
    assert.equal(arrowEvents(w).length, 0);
    // 複数の敵へ別々に当たる配置(左右から等距離で別の矢が別の敵へ)
    const w2 = erosWorld();
    parkOthers(w2, [3, 4]); const c2 = center(w2);
    placeEnemy(w2, 3, c2.x + 6, c2.y - 2.2); placeEnemy(w2, 4, c2.x + 6, c2.y + 2.2);
    aimDegree(w2, 90, 3); fire(w2); settle(w2);
    assert.ok(lost(w2, 3) > 0 || lost(w2, 4) > 0);
    assert.equal(lost(w2, 3) % 20, 0); assert.equal(lost(w2, 4) % 20, 0);
});

test("追尾の対象選び(仮): 最も近い対象。同距離なら味方を先。狙った対象は範囲内にいる間は保つ", () => {
    const w = erosWorld();
    parkOthers(w, [3]); const c = center(w);
    placeEnemy(w, 3, c.x + 5, c.y - 1.5);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 5, cy: c.y + 1.5, maxHp: 1000, hp: 100 });
    aimDegree(w, 90, 3); fire(w); frames(w, 14); // 0本目が3マス以内に入って曲がり始めたあと
    const arrow0 = plain(api(w).getActiveArrows()).find(a => a.index === 0);
    assert.ok(arrow0, "最初の矢は飛んでいる");
    // 敵(上1.5)と味方(下1.5)が同距離のとき、味方(下)を先に狙う
    assert.equal(arrow0.lock, "a2", "同距離は味方が先: " + JSON.stringify(arrow0));
    assert.ok(arrow0.heading > 90, "下へ曲がる(0=上・時計回りなので90より大きい): " + arrow0.heading);
    const g = api(w).geometry;
    assert.equal(g.distanceToPolygon({ x: 0, y: 0 }, [{ x: 1, y: -1 }, { x: 3, y: -1 }, { x: 3, y: 1 }, { x: 1, y: 1 }]), 1);
    assert.equal(g.distanceToPolygon({ x: 2, y: 0 }, [{ x: 1, y: -1 }, { x: 3, y: -1 }, { x: 3, y: 1 }, { x: 1, y: 1 }]), 0);
});

test("消費: 予約では消費せず、最初の命中で1回だけ消費(10ヒットでも1枚)。命中のあとも残りの矢は撃ち続ける", () => {
    const w = erosWorld();
    parkOthers(w, [3]); placePolar(w, 3, 6, 90); aimDegree(w, 90, 3);
    const first = fire(w);
    assert.equal(first.reason, "pending");
    assert.equal(consumedHand(w), 5, "予約では消費しない");
    assert.equal(pile(w).length, 0);
    let committedAt = null, emittedAtCommit = null;
    for (let i = 0; i < 200 && api(w).getSequences().length; i++) {
        frames(w, 1);
        const s = plain(api(w).getSequences())[0];
        if (s && s.committed && committedAt === null) { committedAt = i; emittedAtCommit = s.emitted; }
    }
    assert.ok(committedAt !== null, "命中で確定した");
    assert.ok(emittedAtCommit < 10, "最初の命中のとき、まだ全部は放っていない: " + emittedAtCommit);
    assert.equal(lost(w, 3), 200, "確定のあとも残りの矢が命中(合計10本)");
    assert.equal(consumedHand(w), 4);
    assert.equal(pile(w).length, 1, "Cooldownの山に1枚だけ");
    assert.equal(state(w).cooldownPile.filter(e => e.instance.cardId === EROS).length, 1);
    assert.equal(lastResult(w).committed, true);
    assert.equal(lastResult(w).hits.length, 10);
});

test("全部外れたら非消費: 手札もCooldownも変わらず、すぐ撃ち直せる。矢のEventは消える", () => {
    const w = erosWorld();
    parkOthers(w, []); aimDegree(w, 90, 3);
    const hand = handIds(w);
    fire(w); settle(w);
    assert.equal(lastResult(w).reason, "missed");
    assert.equal(lastResult(w).consumed, false);
    assert.deepEqual(handIds(w), hand);
    assert.equal(pile(w).length, 0);
    assert.equal(arrowEvents(w).length, 0);
    assert.equal(api(w).getTempObjectCount().total, 0);
    const again = fire(w);
    assert.equal(again.reason, "pending", "すぐ撃ち直せる: " + JSON.stringify(again));
});

test("重複発動の防止: 命中前は確定待ち、確定後も連射が終わるまで同じカードを発動しない。終われば撃てる", () => {
    const w = erosWorld();
    parkOthers(w, [3]); placePolar(w, 3, 9, 90); aimDegree(w, 90, 3);
    assert.equal(fire(w).reason, "pending");
    frames(w, 3);
    const second = fire(w);
    assert.equal(second.ok, false); assert.notEqual(second.reason, "pending", "確定前の再入力は拒否: " + JSON.stringify(second));
    assert.equal(plain(api(w).getSequences()).length, 1);
    // 確定のあとも(連射が続いている間は)別の手札の同じカードを発動できない
    for (let i = 0; i < 200 && !plain(api(w).getSequences())[0]?.committed; i++) frames(w, 1);
    const s = plain(api(w).getSequences())[0];
    assert.equal(s.committed, true);
    if (s.emitted < 10) {
        const during = fire(w);
        assert.equal(during.ok, false); assert.notEqual(during.reason, "pending", "連射中は拒否: " + JSON.stringify(during));
        assert.equal(handIds(w).filter(id => id === EROS).length, 4, "消費は1枚のまま");
    }
    settle(w);
    assert.equal(fire(w).reason, "pending", "終わったら撃てる");
});

test("取消と後片付け: 戦闘終了・マップ移動・ロード・主人公の戦闘不能・手札から消えた・敵の消滅で、矢のEvent・VFX・召喚が残らない", () => {
    const setup = () => {
        const w = erosWorld();
        parkOthers(w, [3]); placePolar(w, 3, 12, 90); aimDegree(w, 90, 3);
        fire(w); frames(w, 20);
        assert.ok(arrowEvents(w).length >= 3);
        return w;
    };
    const w1 = setup();
    deckApi(w1).endCardBattle();
    assert.equal(arrowEvents(w1).length, 0, "戦闘終了"); assert.equal(api(w1).isPending(), false);
    assert.equal(api(w1).getTempObjectCount().total, 0);
    assert.equal(w1.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚も片付く");
    const w2 = setup();
    w2.ctx.$gameMap.setup(4);
    assert.equal(arrowEvents(w2).length, 0, "マップ移動"); assert.equal(api(w2).getSequences().length, 0); assert.equal(api(w2).getTempObjectCount().total, 0);
    const w3 = setup();
    w3.ctx.DataManager.extractSaveContents(w3.ctx.DataManager.makeSaveContents());
    assert.equal(api(w3).getSequences().length, 0, "ロード"); assert.equal(api(w3).getActiveArrows().length, 0);
    const w4 = setup();
    w4.ctx.ProjectR.PlayerDeath.isDead = () => true;
    frames(w4, 2);
    assert.equal(arrowEvents(w4).length, 0, "主人公の戦闘不能"); assert.equal(api(w4).getSequences().length, 0);
    // 確定前に手札から消えた(確定の時にカードが手札に無い): 取り消して何も与えない(非消費)
    const w5 = erosWorld();
    parkOthers(w5, [3]); placePolar(w5, 3, 8, 90); aimDegree(w5, 90, 3);
    fire(w5); frames(w5, 4);
    const realState = w5.ctx.ProjectRCardDeck.getBattleState;
    w5.ctx.ProjectRCardDeck.getBattleState = function() { const s = realState.apply(this, arguments); return s ? { ...s, hand: [] } : s; };
    settle(w5);
    w5.ctx.ProjectRCardDeck.getBattleState = realState;
    assert.equal(arrowEvents(w5).length, 0, "矢は全部消える");
    assert.equal(lastResult(w5).reason, "cardGone"); assert.equal(lastResult(w5).consumed, false);
    assert.equal(lost(w5, 3), 0, "何も与えない"); assert.equal(consumedHand(w5), 5); assert.equal(pile(w5).length, 0);
    // 狙った敵が消える: 追尾の対象を失っても例外なく、矢は寿命で消え、全部外れなら非消費
    const w6 = erosWorld();
    parkOthers(w6, [3]); placePolar(w6, 3, 6, 90); aimDegree(w6, 90, 3);
    fire(w6); frames(w6, 3);
    w6.ctx.$gameMap.event(3).erase();
    settle(w6);
    assert.equal(arrowEvents(w6).length, 0); assert.equal(lastResult(w6).reason, "missed"); assert.equal(consumedHand(w6), 5);
});

test("演出: カットイン・ArmExtend・Apolloの召喚は発動時に1回だけ(確定で重ねない)。矢のVFXは同時に上限があり、終われば全部外れる", () => {
    const w = erosWorld();
    const cutIns = [], arm = [];
    const show = w.ctx.ProjectRCutIn.show; w.ctx.ProjectRCutIn.show = function(o) { cutIns.push(o); return show.apply(this, arguments); };
    const request = w.ctx.ProjectRCharacterPresentation.request; w.ctx.ProjectRCharacterPresentation.request = function(name, o) { arm.push(name); return request.apply(this, arguments); };
    const spy = spySe(w);
    parkOthers(w, [3]); const c = center(w);
    placeEnemy(w, 3, c.x + 6, c.y); aimDegree(w, 90, 3);
    fire(w);
    let max = { arrows: 0, glows: 0, short: 0, total: 0 };
    for (let i = 0; i < 160; i++) {
        frames(w, 1);
        const t = plain(api(w).getTempObjectCount());
        for (const k of Object.keys(max)) max[k] = Math.max(max[k], t[k]);
    }
    spy.restore();
    assert.equal(cutIns.length, 1, "カットインは1回: " + cutIns.length);
    assert.equal(arm.filter(n => n === "ArmExtend").length, 1, "ArmExtendは1回");
    assert.ok(max.arrows <= 10 && max.glows <= 6 && max.short <= 6, "一時オブジェクトに上限: " + JSON.stringify(max));
    assert.ok(max.total <= 22, JSON.stringify(max));
    assert.equal(plain(api(w).getTempObjectCount()).total, 0, "終われば全部外れる");
    assert.equal(plain(api(w).getActiveVfxJobs()).length, 0);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0);
    assert.ok(spy.se.filter(n => n === "Chime2").length <= 5, "放つ音は2本に1回: " + spy.se.join(","));
    assert.ok(spy.se.filter(n => n === "Chime1").length <= 10 && spy.se.length <= 15, "音が重なりすぎない: " + spy.se.length);
    const shows = w.calls.filter(c => c.name === "showAnimatedPicture");
    assert.ok(shows.length > 0, "VFXは公式Show VFXで出る");
    assert.ok(shows.every(c => /ProjectR:apollo_eros\./.test(JSON.parse(JSON.stringify(c.args)).note || "") || /ProjectR:/.test(c.args.note)));
});

test("ダメージ: 属性なし・固定20・自然クリティカルのみ。帰属(UpdateEventHp経由)で1本1回。ほかのカード・全体のダメージ規則は変えない", () => {
    const w = erosWorld();
    parkOthers(w, [3]); placePolar(w, 3, 5, 90); aimDegree(w, 90, 3);
    fire(w); settle(w);
    const updates = w.calls.filter(c => c.name === "UpdateEventHp");
    assert.equal(updates.length, 10, "UpdateEventHpは矢1本につき1回(重複なし)");
    for (const u of updates) {
        const fixed = u.args.projectRFixed;
        assert.deepEqual([fixed.base, fixed.source, fixed.element, fixed.weaknessMultiplier], [20, EROS, 0, 1]);
        assert.equal(u.args.value, "-20");
    }
    // 黄金の矢のパラメータには触れていない
    assert.equal(balanceOf(w).effects("apollo_golden_volley", 3).projectileCount, 11);
    assert.equal(balanceOf(w).constant("apollo_golden_volley", "beamHitDamage"), 50);
});
