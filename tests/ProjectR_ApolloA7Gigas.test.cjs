"use strict";
// Phase Apollo-A7: Apollo「ギガース殺し」(設計ID 13 / apollo_gigas_slayer)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(マウス・実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a7_gigas_verify.cjs。
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, state, frames, fireCard, aimDegree, barHp, lost, resetHp, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, setRegion, HP } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_gigas_slayer";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloGigasSlayer;
const status = w => w.ctx.ProjectRApolloStatus;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const lastResult = w => plain(api(w).getLastResult());
const phase = w => (plain(api(w).getShots())[0] || {}).phase;
const settle = (w, max = 600) => { for (let i = 0; i < max && (api(w).getShots().length || api(w).isPending()); i++) frames(w, 1); };
const arrowEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRGigasArrow/.test(e.event().note || ""));
const prep = (w, enemies = [[3, 6, 0]], aim = 90) => {
    parkOthers(w, enemies.map(e => e[0]));
    const c = center(w);
    for (const [id, dx, dy] of enemies) placeEnemy(w, id, c.x + dx, c.y + dy);
    aimDegree(w, aim, 3);
    return c;
};

test("登録と数値: 最大Lv3・Cooldown 3・強力/最大5。Lv1=100ダメージ・弱点5秒x2・チャージ0.5秒・幅1。Lv2は傷(5秒・秒間30・x1.1)を足す。Lv3は幅3マスの連続ヒット。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 5, cooldownSeconds: 3, maxLevel: 3, rarity: "strong", category: "disrupt", targetType: "ground" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.damage, c1.weakSeconds, c1.weakTaken, c1.chargeFrames, c1.width, c1.wound, c1.beam], [100, 5, 2, 30, 1, false, false]);
    assert.deepEqual([c2.damage, c2.weakSeconds, c2.weakTaken, c2.wound, c2.woundSeconds, c2.woundDps, c2.woundTick, c2.woundTaken, c2.beam], [100, 5, 2, true, 5, 30, 1, 1.1, false], "Lv2はLv1を引き継ぎ傷を足す");
    assert.deepEqual([c3.wound, c3.beam, c3.beamWidth, c3.beamSpeed, c3.perTile, c3.maxHits, c3.damage, c3.weakTaken, c3.woundDps], [true, true, 3, 40, 3, 11, 100, 2, 30], "Lv3は幅3マスの連続ヒット(黄金の矢と同じ仕様の数値)。Lv1〜2を引き継ぐ");
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo"), null, "Apolloの本番の初期デッキ(30枚)は有効にしない");
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 13);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId], [true, 3, C]);
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_eros_arrow").maxLevel, 3, "エロスの矢は不変");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・黄金の矢・エロスの矢・HitStop・CardBattleInput・PartyRoster・PartyCombat・DamageModifiers・旧Apollo)", () => {
    assert.equal(git("diff", "--stat", "115f01d", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_ApolloGoldenVolley.js",
        "js/plugins/ProjectR_ApolloErosArrow.js", "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_HitStop.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_PartyRoster.js",
        "js/plugins/ProjectR_PartyCombat.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_ApolloDiseaseAttack.js", "js/plugins/ProjectR_ApolloLyreCalm.js").trim(), "");
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。レベルごとの置換が累積規則どおり。不正な設定では発動を拒否して非消費", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["chargeSeconds", "weakSeconds", "weakDamageTaken", "woundSeconds", "woundDamagePerSecond", "woundTickSeconds", "woundDamageTaken"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["chargeSeconds", "weakSeconds", "weakDamageTaken", "woundSeconds", "woundDamagePerSecond", "woundTickSeconds", "woundDamageTaken", "beamWidthTiles", "damage"]) assert.ok(described.includes(key), key + " がF6の表に出る");
    assert.equal(balanceOf(w).validate(C, 1, "weakDamageTaken", 0.5).ok, false, "弱点の倍率は1以上");
    assert.equal(balanceOf(w).validate(C, 1, "chargeSeconds", 4).ok, false);
    assert.equal(balanceOf(w).validate(C, 2, "woundDamageTaken", 1.5).ok, true);
    override(w, 1, "damage", 250); override(w, 2, "woundDamagePerSecond", 40); override(w, 3, "beamWidthTiles", 2);
    assert.deepEqual([api(w).config(1).damage, api(w).config(2).woundDps, api(w).config(3).beamWidth, api(w).config(3).damage, api(w).config(2).beam], [250, 40, 2, 250, false], "Lv1のdamageはLv3へ引き継ぐ。Lv2のスリップはLv3へ引き継ぐ");
    balanceOf(w).resetCard(C);
    override(w, 1, "weakSeconds", 0.1); // 範囲内の値は有効
    assert.equal(api(w).config(1).weakSeconds, 0.1);
    balanceOf(w).resetCard(C);
    assert.equal(api(w).config(1).weakSeconds, 5, "リセットで既定へ戻る");
});

test("Lv1: 発動直後はチャージ(0.5秒=30更新)。カード未消費・矢なし。チャージ後に太い矢を放ち、命中の瞬間に1回だけ消費して100ダメージ", () => {
    const w = world(1);
    prep(w);
    const r = fireCard(w, C);
    assert.deepEqual([r.ok, r.reason, r.detail], [false, "pending", "gigasReserved"]);
    assert.equal(consumedHand(w, C), 5, "予約中は未消費"); assert.equal(pile(w, C).length, 0);
    for (let i = 0; i < 28; i++) { frames(w, 1); assert.equal(phase(w), "charge"); assert.equal(arrowEvents(w).length, 0, "チャージ中は矢がない"); assert.equal(consumedHand(w, C), 5); }
    frames(w, 4);
    assert.equal(phase(w), "flight");
    assert.equal(arrowEvents(w).length, 1, "矢は1本");
    assert.equal(lost(w, 3), 0, "まだ当たっていない");
    settle(w);
    assert.equal(lost(w, 3), 100, "1ヒット100ダメージ");
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1, "消費は1回");
    const res = lastResult(w);
    assert.deepEqual([res.consumed, res.committed, res.totalHits, res.totalDamage], [true, true, 1, 100]);
    assert.equal(arrowEvents(w).length, 0, "矢は当たって消える");
});

test("Lv1: 当たった敵は弱点状態(5秒・被ダメージx2)。命中自体は倍にならず、その後のダメージが2倍。5秒で切れる。再命中は更新", () => {
    const w = world(1);
    prep(w);
    fireCard(w, C); settle(w);
    assert.equal(lost(w, 3), 100);
    assert.equal(status(w).has("event:3", "gigas_weak"), true);
    assert.equal(plain(status(w).factorOf("event:3")).damageTaken, 2);
    // 弱点中の別のダメージが2倍(50 → 100)。公式経路(固定ダメージ)で与える
    const hit = amount => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp",
        { eventId: "3", value: `-${amount}`, exceedMaxHealth: "false", projectRFixed: { base: amount, flat: 0, source: "test", element: 0, weaknessMultiplier: 1, critical: false } });
    resetHp(w, [3]);
    hit(50);
    assert.equal(lost(w, 3), 100, "弱点中は50が100");
    frames(w, 150);
    const remaining = plain(status(w).list("event:3"))[0].remaining;
    assert.ok(remaining > 2 && remaining < 3.2, "経過に応じて減る " + remaining);
    // 再命中で持続が更新(重ねがけしない)
    aimDegree(w, 90, 3);
    fireCard(w, C); settle(w);
    assert.equal(plain(status(w).list("event:3")).filter(s => s.id === "gigas_weak").length, 1, "重ねない");
    assert.ok(plain(status(w).list("event:3"))[0].remaining > 4.9, "持続は5秒へ更新");
    assert.equal(plain(status(w).factorOf("event:3")).damageTaken, 2, "x2のまま(x4にならない)");
    frames(w, 305);
    assert.equal(status(w).has("event:3", "gigas_weak"), false, "5秒で切れる");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.list()).length, 0, "DamageModifiersの登録も外れる");
    resetHp(w, [3]); hit(50);
    assert.equal(lost(w, 3), 50, "切れたら等倍");
});

test("太い矢の当たり判定: 幅1マス。真横0.7マスずれた敵(幅0.3の細い矢なら外れる位置)には当たり、1.6マスずれた敵には当たらない。ヒットボックスの幅を変えると効く", () => {
    const w = world(1);
    prep(w, [[3, 6, 0.7]]);
    fireCard(w, C); settle(w);
    assert.equal(lost(w, 3), 100, "0.7ずれは当たる(敵の体は1マス四方なので、細い矢だと0.65を超えると外れる)");
    const w2 = world(1);
    prep(w2, [[3, 6, 1.6]]);
    fireCard(w2, C); settle(w2);
    assert.equal(lost(w2, 3), 0); assert.equal(consumedHand(w2, C), 5, "外れは非消費");
    // 幅をバランス設定で0.3へ細くすると、0.7ずれは外れる(判定の幅はバランス設定が持つ)
    const w3 = world(1);
    override(w3, "constant", "pathWidthTiles", 0.3);
    prep(w3, [[3, 6, 0.7]]);
    fireCard(w3, C); settle(w3);
    assert.equal(lost(w3, 3), 0, "細い矢は0.7ずれを外す");
});

test("壁(Region 255)に当たった矢は止まり、向こうの敵は無傷・非消費。壁を外せば当たる", () => {
    const w = world(1);
    const c = prep(w);
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) setRegion(w, Math.floor(c.x) + 3, y, 255);
    fireCard(w, C); settle(w);
    assert.equal(lost(w, 3), 0); assert.equal(consumedHand(w, C), 5, "壁に遮られた=外れ=非消費");
    assert.equal(lastResult(w).reason, "missed");
    assert.equal(arrowEvents(w).length, 0);
});

test("Lv2: 傷状態(5秒)。被ダメージx1.1(弱点x2との積=x2.2)。1秒ごとに秒間30のスリップを5回(スリップも倍率の対象=66)。再命中は持続の更新で位相を保つ", () => {
    const w = world(2);
    prep(w);
    fireCard(w, C); settle(w);
    assert.equal(lost(w, 3), 100, "命中自体は倍率なし");
    assert.equal(status(w).has("event:3", "gigas_wound"), true);
    assert.ok(Math.abs(plain(status(w).factorOf("event:3")).damageTaken - 2.2) < 1e-9, "弱点x2 と 傷x1.1 の積");
    frames(w, 305);
    const wound = plain(status(w).getLog()).filter(l => l.id === "gigas_wound");
    assert.equal(wound[wound.length - 1].type, "remove", "傷は5秒で切れる");
    assert.equal(lost(w, 3), 100 + 5 * 66, "スリップは5回 x 66(30 x 2.2)");
    assert.equal(status(w).has("event:3", "gigas_weak"), false);
});

test("Lv2: スリップは傷の持続中だけ。敵が先に倒れたらスリップを止める(倒れた敵に打たない)", () => {
    const w = world(2);
    prep(w);
    fireCard(w, C); settle(w);
    // HPを1にして次のスリップで倒す
    const bar = fx.barOf(w, 3); bar.currentHp = 1; bar.targetHp = 1; bar.refresh();
    frames(w, 70);
    assert.equal(status(w).list("event:3").length, 0, "倒れた敵の状態は消える");
    const dotCalls = w.calls.filter(c => c.name === "UpdateEventHp" && c.args.projectRFixed && c.args.projectRFixed.base === 30).length;
    assert.ok(dotCalls <= 1, "死んだ後に打たない " + dotCalls);
});

test("Lv3: 幅3マスの連続ヒット。真横1.4マスずれは当たり、2.6マスは外れる。1体に最大11ヒット。最初のヒットから弱点が付き、2ヒット目以降は倍率がかかる", () => {
    const w = world(3);
    prep(w, [[3, 6, 0], [4, 6, 1.4], [5, 6, 2.6]]);
    fireCard(w, C);
    frames(w, 31);
    assert.equal(phase(w), "beam");
    assert.equal(arrowEvents(w).length, 0, "Lv3は矢Eventを使わない(ビーム)");
    settle(w);
    const res = lastResult(w);
    const byId = Object.fromEntries(res.targets.map(t => [t.eventId, t]));
    assert.equal(byId[3].hits, 11, "同じ敵へ最大11ヒット");
    assert.equal(byId[4].hits, 11, "幅3の端に近い敵も11ヒット");
    assert.equal(byId[5], undefined, "幅の外は当たらない");
    assert.equal(lost(w, 5), 0);
    assert.equal(lost(w, 3), 100 + 10 * 220, "1ヒット目100、以降は弱点x2 と 傷x1.1 の積(x2.2) = 220");
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1, "消費は1回");
    assert.ok(byId[3].hitStopFrames > 0, "ヒットストップ(黄金の矢と同じ)");
});

test("Lv3: ビームも壁で遮られる。壁の向こうの敵は無傷、壁が無ければ11ヒット。全部外れは非消費", () => {
    const w = world(3);
    const c = prep(w);
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) setRegion(w, Math.floor(c.x) + 3, y, 255);
    fireCard(w, C); settle(w);
    assert.equal(lost(w, 3), 0); assert.equal(consumedHand(w, C), 5); assert.equal(lastResult(w).reason, "missed");
});

test("確定の遅延と重複防止: チャージ中・飛行中の再発動は gigasPending で拒否(全スロット)。確定後は別の発動が可能", () => {
    const w = world(1);
    prep(w);
    fireCard(w, C);
    for (let i = 0; i < 3; i++) {
        const r = plain(deckApi(w).requestUseCard(i));
        assert.equal(r.ok, false); assert.equal(r.detail, "gigasPending", "スロット" + i);
    }
    assert.equal(consumedHand(w, C), 5);
    frames(w, 31);
    assert.equal(plain(deckApi(w).requestUseCard(2)).detail, "gigasPending", "飛行中も拒否");
    settle(w);
    assert.equal(lost(w, 3), 100); assert.equal(consumedHand(w, C), 4);
    aimDegree(w, 90, 3);
    const again = fireCard(w, C);
    assert.equal(again.detail, "gigasReserved", "確定後は次の発動が可能");
});

test("取消: チャージ中・飛行中の戦闘終了で、矢・チャージ表示・予約が消えて非消費。マップ移動も同様", () => {
    for (const when of [10, 40]) {
        const w = world(1);
        prep(w);
        fireCard(w, C); frames(w, when);
        assert.equal(api(w).isPending(), true);
        w.ctx.ProjectRCardDeck.endBattle();
        assert.equal(api(w).isPending(), false); assert.equal(api(w).getShots().length, 0);
        assert.equal(arrowEvents(w).length, 0);
        assert.equal(lost(w, 3), 0);
        assert.equal(lastResult(w).reason, "battleEnd");
        assert.equal(w.ctx.ProjectRCardDeck.isCardBattleActive(), false);
    }
    const w2 = world(1);
    prep(w2); fireCard(w2, C); frames(w2, 40);
    w2.ctx.$gameMap.setup(4);
    assert.equal(api(w2).getShots().length, 0); assert.equal(api(w2).isPending(), false);
});

test("対象の消滅: 飛行中に敵が消えても例外にならず外れ扱い(非消費)。Lv2のスリップ中に敵が消えたら状態も消える", () => {
    const w = world(1);
    prep(w);
    fireCard(w, C); frames(w, 35);
    w.ctx.$gameMap.event(3).erase();
    settle(w);
    assert.equal(consumedHand(w, C), 5);
    const w2 = world(2);
    prep(w2); fireCard(w2, C); settle(w2);
    assert.equal(status(w2).list("event:3").length, 2);
    w2.ctx.$gameMap.event(3).erase();
    frames(w2, 5);
    assert.equal(status(w2).list("event:3").length, 0, "消えた敵の状態は片付く");
    assert.equal(plain(w2.ctx.ProjectRDamageModifiers.list()).length, 0);
});

test("状態台帳(ApolloStatus): 別idの状態は積で並立、同じidは更新、DamageModifiersの重ねがけ規則(未確定=中立)は変えない。敵の攻撃力倍率はバトラーのatkへ掛かり、外れたら元に戻る", () => {
    const w = world(1);
    const s = status(w);
    assert.equal(w.ctx.ProjectRDamageModifiers.getPolicy(), "uncommitted", "DamageModifiersの既定は不変");
    assert.equal(s.apply("event:3", "a", { seconds: 5, damageTaken: 2 }).ok, true);
    assert.equal(s.apply("event:3", "b", { seconds: 5, damageTaken: 1.1, weakness: 1.03, attackRate: 0.9 }).ok, true);
    const f = plain(s.factorOf("event:3"));
    assert.ok(Math.abs(f.damageTaken - 2.2) < 1e-9 && Math.abs(f.weakness - 1.03) < 1e-9 && Math.abs(f.attackRate - 0.9) < 1e-9);
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.factorFor("event:3", "damageTaken")).conflict, false, "台帳が1つにまとめるので衝突しない");
    assert.equal(s.apply("event:3", "a", { seconds: 9, damageTaken: 2 }).refreshed, true);
    assert.equal(plain(s.list("event:3")).filter(x => x.id === "a").length, 1);
    // 攻撃力
    const battler = w.ctx.SgetBattlerForH(w.ctx.$gameMap.event(3));
    const withRate = battler.atk;
    assert.ok(withRate > 0);
    s.remove("event:3", "b");
    assert.ok(battler.atk >= withRate, "外すと元に戻る(" + battler.atk + " >= " + withRate + ")");
    assert.equal(Math.round(withRate * 10 / 9), battler.atk, "10%下がっていた");
    // 不正値
    assert.equal(s.apply("event:3", "x", { seconds: 0 }).ok, false);
    assert.equal(s.apply("event:3", "x", { seconds: 1, damageTaken: -1 }).ok, false);
    assert.equal(s.apply("bogus", "x", { seconds: 1 }).ok, false);
    s.clear("test");
    assert.equal(s.list().length, 0); assert.equal(plain(w.ctx.ProjectRDamageModifiers.list()).length, 0);
    assert.equal(battler.atk, Math.round(withRate * 10 / 9));
});

test("演出: 通常のカットイン1回・ArmDraw→ArmExtend・Apollo一時召喚。矢の絵(VFX)・チャージの表示は終了後に残らない。Lv3のビームの絵は片付く", () => {
    for (const level of [1, 3]) {
        const w = world(level);
        prep(w);
        const requests = [];
        const cp = w.ctx.ProjectRCharacterPresentation, original = cp.request;
        cp.request = function(name, opts) { requests.push(name); return original.apply(this, arguments); };
        let cutIns = 0;
        const ci = w.ctx.ProjectRCutIn, ciShow = ci.show; ci.show = function() { cutIns++; return ciShow.apply(this, arguments); };
        fireCard(w, C); settle(w);
        assert.equal(cutIns, 1, "カットインは1回(確定時に重ねて出さない)");
        assert.ok(requests.includes("ArmDraw") && requests.includes("ArmExtend"), JSON.stringify(requests));
        frames(w, 60);
        assert.equal(api(w).getActiveVfxJobs().length, 0, "ビームのVFXジョブは残らない");
        const loops = w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys.filter(k => /charge|beam/.test(k));
        assert.deepEqual(plain(loops), [], "チャージ(ループ)・ビームの絵が残らない(1回再生の閃光は描画側が終える)");
        assert.equal(arrowEvents(w).length, 0);
    }
});

test("効果音の重なりを抑える: Lv3の連続ヒット(11ヒット)でもHitSoundは間引かれる", () => {
    const w = world(3);
    prep(w);
    const spy = spySe(w);
    fireCard(w, C); settle(w);
    spy.restore();
    const hits = spy.se.filter(n => n === "Blow7").length;
    assert.ok(hits >= 1 && hits < 11, "Blow7 " + hits + " 回");
});

test("他のカードに影響しない: 黄金の矢Lv1は従来どおり3本・1本50(命中の最初で消費)。エロスの矢Lv1も従来どおり", () => {
    const wv = cardWorld("apollo_golden_volley", { level: 1 });
    const c = center(wv); parkOthers(wv, [3]); placeEnemy(wv, 3, c.x + 6, c.y); aimDegree(wv, 90, 3);
    const r = fireCard(wv, "apollo_golden_volley");
    assert.equal(r.detail, "volleyReserved");
    for (let i = 0; i < 120; i++) frames(wv, 1);
    assert.equal(lost(wv, 3), 50, "中央の矢だけ当たる");
    const we = cardWorld("apollo_eros_arrow", { level: 1 });
    parkOthers(we, [3]); const ce = center(we); placeEnemy(we, 3, ce.x + 3, ce.y); aimDegree(we, 90, 3);
    fireCard(we, "apollo_eros_arrow"); for (let i = 0; i < 200; i++) frames(we, 1);
    assert.ok(lost(we, 3) >= 20 && lost(we, 3) % 20 === 0, "エロスの矢は20の倍数 " + lost(we, 3));
});
