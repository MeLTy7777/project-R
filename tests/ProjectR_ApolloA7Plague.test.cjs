"use strict";
// Phase Apollo-A7: Apollo「疫病の矢」(設計ID 15 / apollo_plague_rain)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(マウス・実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a7_plague_verify.cjs。
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, fireCard, aimDegree, lost, resetHp, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, setRegion, HP } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_plague_rain";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloPlagueRain;
const status = w => w.ctx.ProjectRApolloStatus;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const lastResult = w => plain(api(w).getLastResult());
const shots = w => plain(api(w).getShots());
const circles = w => plain(api(w).getCircles());
const arrowEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRPlagueArrow/.test(e.event().note || ""));
const ratEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRPlagueRat/.test(e.event().note || ""));
const settle = (w, max = 900) => { for (let i = 0; i < max && shots(w).length; i++) frames(w, 1); };
// 確定(最初の着弾)まで進める。サークルは残る
const commit = (w, max = 400) => { for (let i = 0; i < max && shots(w).length && !(plain(api(w).getLastResult() || {}).committed); i++) frames(w, 1); };
const landed = (w, max = 400) => { for (let i = 0; i < max && !(plain(api(w).getLastResult() || {}).landings || []).length && shots(w).length; i++) frames(w, 1); };
const secs = (w, s) => frames(w, Math.round(s * 60));
// 敵を (dx, dy)(プレイヤー中心から)へ置き、マウスを degree 方向 tiles へ向ける。
const prep = (w, enemies, degree = 90, tiles = 6) => {
    parkOthers(w, enemies.map(e => e[0]));
    const c = center(w);
    for (const [id, dx, dy] of enemies) placeEnemy(w, id, c.x + dx, c.y + dy);
    aimDegree(w, degree, tiles);
    return c;
};
const hit = (w, id, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp",
    { eventId: String(id), value: `-${amount}`, exceedMaxHealth: "false", projectRFixed: { base: amount, flat: 0, source: "test", element: 0, weaknessMultiplier: 1, critical: false } });

test("登録と数値: 最大Lv3・Cooldown 5・強力/最大4・direction。Lv1=直撃100・半径4・5秒・病(攻撃x0.9/被ダメージx1.05/弱点x1.03)。Lv2はネズミ3匹50/秒。Lv3は分裂4本。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 4, cooldownSeconds: 5, maxLevel: 3, rarity: "strong", category: "disrupt", targetType: "direction" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.damage, c1.radius, c1.circleSeconds, c1.stateSeconds, c1.attackRate, c1.damageTaken, c1.weakness, c1.ratCount, c1.splitCount, c1.speed, c1.range], [100, 4, 5, 3, 0.9, 1.05, 1.03, 0, 0, 18, 14]);
    assert.deepEqual([c2.ratCount, c2.ratDamage, c2.ratSeconds, c2.ratSpeed, c2.ratReach, c2.splitCount, c2.damage], [3, 50, 1, 4, 1, 0, 100], "Lv2はLv1を引き継ぎネズミを足す");
    assert.deepEqual([c3.splitCount, c3.splitRadius, c3.ratCount, c3.damage, c3.radius], [4, 5, 3, 100, 4], "Lv3は分裂を足す。Lv1〜2を引き継ぐ");
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo"), null);
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 15);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId, row.legacyCandidates.join()], [true, 3, C, "apollo_plague_attack"]);
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_plague_attack").maxCopies, 2, "旧「疫病攻撃」は不変(共存)");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・DamageModifiers・旧Apollo・他の新Apollo)", () => {
    assert.equal(git("diff", "--stat", "433461d", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js",
        "js/plugins/ProjectR_ApolloDiseaseAttack.js", "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_ApolloErosArrow.js", "js/plugins/ProjectR_ApolloGigasSlayer.js", "js/plugins/ProjectR_ApolloHyacinthus.js").trim(), ""); // ProjectR_ApolloStatus は追加だけで育てる共通の台帳なので、固定の対象に入れない
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。上書きが累積どおりに効く", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["circleSeconds", "plagueStateSeconds", "circleTickSeconds", "plagueAttackRate", "plagueDamageTaken", "plagueWeaknessRate", "ratCount", "ratDamage", "ratAttackSeconds", "ratSpeed", "ratReach", "splitCount", "splitRadiusTiles", "radiusTiles", "damage"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["circleSeconds", "ratCount", "splitCount", "plagueDamageTaken", "radiusTiles"]) assert.ok(described.includes(key), key + " がF6の表に出る");
    assert.equal(balanceOf(w).validate(C, 2, "ratCount", 11).ok, false);
    assert.equal(balanceOf(w).validate(C, 3, "splitCount", 13).ok, false);
    assert.equal(balanceOf(w).validate(C, "constant", "plagueDamageTaken", 0.5).ok, false);
    override(w, 2, "ratCount", 5); override(w, 3, "splitCount", 2); override(w, "constant", "radiusTiles", 3);
    assert.deepEqual([api(w).config(1).ratCount, api(w).config(2).ratCount, api(w).config(3).ratCount, api(w).config(3).splitCount, api(w).config(2).splitCount, api(w).config(1).radius], [0, 5, 5, 2, 0, 3]);
    balanceOf(w).resetCard(C);
    assert.deepEqual([api(w).config(3).ratCount, api(w).config(3).splitCount, api(w).config(1).radius], [3, 4, 4]);
    // 設定の上限(分裂11本 + メイン = 12本)は有効。F6の範囲の外は設定できないので、不正な設定で発動することはない
    override(w, 3, "splitCount", 11);
    assert.equal(api(w).config(3).splitCount, 11);
});

test("Lv1: 発動で矢が飛び(カード未消費)、マウス位置の敵に着弾 → 直撃100ダメージ + 半径4マスの病のサークル(5秒)。消費は着弾の瞬間に1回", () => {
    const w = world(1);
    prep(w, [[3, 6, 0]], 90, 6);
    const r = fireCard(w, C);
    assert.deepEqual([r.ok, r.reason, r.detail], [false, "pending", "plagueReserved"]);
    assert.equal(consumedHand(w, C), 5, "飛行中は未消費"); assert.equal(pile(w, C).length, 0);
    assert.equal(arrowEvents(w).length, 1, "矢のEventは1本");
    assert.equal(api(w).isPending(), true);
    frames(w, 5);
    const a = plain(api(w).getArrows())[0];
    assert.ok(a && a.x > center(w).x && Math.abs(a.heading - 90) < 0.01, "マウス方向(東)へ飛ぶ " + JSON.stringify(a));
    assert.equal(lost(w, 3), 0, "まだ着弾していない");
    commit(w);
    // 6マス先の敵へ: 当たった時点で着弾(直撃)
    const res = lastResult(w);
    assert.equal(res.committed, true); assert.equal(res.direct, 1);
    assert.equal(lost(w, 3), 100, "直撃100(病は着弾の後に付く)");
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1);
    assert.equal(arrowEvents(w).length, 0, "矢は着弾で消える");
    const c = circles(w);
    assert.equal(c.length, 1); assert.equal(c[0].radius, 4); assert.ok(c[0].framesLeft > 280 && c[0].framesLeft <= 300, "5秒(300frame) " + c[0].framesLeft);
    assert.equal(c[0].hasVisual, true);
    assert.deepEqual(c[0].infected, [3]);
    assert.equal(status(w).has("event:3", "plague"), true);
});

test("病状態: 攻撃力x0.9・被ダメージx1.05・弱点x1.03。半径4マス内の敵だけに付く(外は無傷・病なし)。複数の敵に同時", () => {
    const w = world(1);
    prep(w, [[3, 6, 0], [4, 6, 3.5], [5, 6, 4.8], [6, 6, -3]], 90, 6);
    fireCard(w, C); commit(w);
    assert.deepEqual(circles(w)[0].infected, [3, 4, 6], "着弾点から半径4以内の3体(4.8離れた敵は外)");
    for (const id of [3, 4, 6]) {
        const f = plain(status(w).factorOf("event:" + id));
        assert.ok(Math.abs(f.damageTaken - 1.05) < 1e-9 && Math.abs(f.weakness - 1.03) < 1e-9 && Math.abs(f.attackRate - 0.9) < 1e-9, id + " " + JSON.stringify(f));
    }
    assert.equal(status(w).has("event:5", "plague"), false);
    assert.equal(lost(w, 5), 0);
    const battler = w.ctx.SgetBattlerForH(w.ctx.$gameMap.event(4)), atk = battler.atk;
    status(w).remove("event:4", "plague");
    assert.ok(battler.atk > atk, "病が外れると攻撃力が戻る(" + atk + " → " + battler.atk + ")");
    // 被ダメージx1.05(固定ダメージ100 → 105)。ギガース殺しの弱点x2との積 = x2.1
    resetHp(w, [3]);
    hit(w, 3, 100);
    assert.equal(lost(w, 3), 105);
    status(w).apply("event:3", "gigas_weak", { seconds: 5, damageTaken: 2, source: "t" });
    resetHp(w, [3]);
    hit(w, 3, 100);
    assert.equal(lost(w, 3), 210, "弱点x2 と 病x1.05 は積(x2.1)で、台帳が衝突を作らない");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0);
});

test("サークルの持続: 5秒で消える(絵・錨も)。病は中にいる間は更新され、出て3秒で切れる。サークルが消えたあとも残りの病は3秒で切れる", () => {
    const w = world(1);
    prep(w, [[3, 6, 0]], 90, 6);
    fireCard(w, C); commit(w);
    secs(w, 4);
    assert.equal(circles(w).length, 1);
    assert.ok(plain(status(w).list("event:3"))[0].remaining > 2.5, "サークルの中にいる間は病が更新される");
    secs(w, 1.1);
    assert.equal(circles(w).length, 0, "5秒でサークルが消える");
    assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
    assert.equal(status(w).has("event:3", "plague"), true, "残りの病はまだある");
    assert.equal(api(w).getTempObjectCount().total, 0);
    secs(w, 3.2);
    assert.equal(status(w).has("event:3", "plague"), false, "出て3秒で切れる");
    assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0);
    assert.equal(shots(w).length, 0);
    // 敵がサークルの外へ出たら、病はそこから3秒
    const w2 = world(1);
    prep(w2, [[3, 6, 0]], 90, 6);
    fireCard(w2, C); commit(w2);
    placeEnemy(w2, 3, center(w2).x + 14, center(w2).y);
    secs(w2, 2.5);
    assert.equal(status(w2).has("event:3", "plague"), true);
    secs(w2, 1.0);
    assert.equal(status(w2).has("event:3", "plague"), false, "外に出て3秒");
});

test("壁越え: Region 255の壁の向こうの敵にも矢は届く。直撃の敵が途中にいれば、マウス位置の手前でその位置に着弾する", () => {
    const w = world(1);
    const c = prep(w, [[3, 7, 0]], 90, 7);
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) for (const dx of [2, 3]) setRegion(w, Math.floor(c.x) + dx, y, 255);
    fireCard(w, C); commit(w);
    assert.equal(lost(w, 3), 100, "壁を越えて直撃"); assert.equal(lastResult(w).committed, true);
    // 途中の敵: マウスは12マス先でも、4マス先の敵に当たってそこで着弾
    const w2 = world(1);
    prep(w2, [[3, 4, 0]], 90, 12);
    fireCard(w2, C); commit(w2);
    assert.equal(lost(w2, 3), 100);
    const l = lastResult(w2).landings[0];
    assert.ok(l.x < center(w2).x + 5 && l.direct === 3, "手前で着弾 " + JSON.stringify(l));
});

test("外れ(半径内に敵がいない)は失敗: 非消費・Cooldownなし・サークルの絵も残らない。飛行中の再発動は plaguePending で拒否。すぐ撃ち直せる", () => {
    const w = world(1);
    prep(w, [[3, 12, 6]], 90, 6); // 着弾点(6マス先)から約6.7離れている
    const before = handIds(w).slice();
    fireCard(w, C);
    frames(w, 3);
    for (let i = 0; i < 3; i++) { const r = plain(deckApi(w).requestUseCard(i)); assert.equal(r.detail, "plaguePending", "スロット" + i); }
    settle(w, 200);
    const res = lastResult(w);
    assert.equal(res.reason, "missed"); assert.equal(res.consumed, false);
    assert.equal(consumedHand(w, C), 5); assert.equal(pile(w, C).length, 0); assert.deepEqual(handIds(w), before);
    assert.equal(circles(w).length, 0); assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0); assert.equal(arrowEvents(w).length, 0);
    assert.equal(status(w).list().length, 0); assert.equal(lost(w, 3), 0);
    aimDegree(w, 90, 6);
    assert.equal(fireCard(w, C).detail, "plagueReserved", "すぐ撃ち直せる");
    // マウスがプレイヤーの足元と同じ位置 → 失敗(非消費)
    const w2 = world(1);
    parkOthers(w2, []); aimDegree(w2, 90, 0);
    const r2 = fireCard(w2, C);
    assert.equal(r2.ok, false); assert.notEqual(r2.detail, "plagueReserved"); assert.equal(consumedHand(w2, C), 5);
});

test("射程: マウスが射程(14マス)より遠くても、矢は14マスで止まって着弾する。半径内に敵がいれば成功", () => {
    const w = world(1);
    prep(w, [[3, 14, 0]], 90, 30);
    fireCard(w, C); commit(w);
    const l = lastResult(w).landings[0];
    assert.ok(l.x - center(w).x <= 14.2 && l.x - center(w).x >= 12, "約14マスで着弾 " + (l.x - center(w).x));
    assert.equal(lastResult(w).committed, true);
});

test("Lv2: メインの着弾点にネズミ3匹。サークルの最寄りの敵へ向かい、1マス以内で1秒に1回50ダメージ(固定)。サークルが消えるとネズミも消える", () => {
    const w = world(2);
    prep(w, [[3, 6, 0], [4, 6, 3]], 90, 6);
    fireCard(w, C); commit(w);
    assert.equal(plain(api(w).getRats()).length, 3);
    assert.equal(ratEvents(w).length, 3, "ネズミの見た目のEvent");
    const direct = lost(w, 3);
    assert.ok(direct >= 100);
    // 敵の被ダメージ倍率(病 x1.05)の分、50 → round(50 x 1.05) = 53 のはず
    const dealt0 = lost(w, 3) + lost(w, 4), attacks0 = plain(api(w).getRats()).reduce((s, r) => s + r.attacks, 0);
    secs(w, 2.0);
    const rats = plain(api(w).getRats());
    assert.ok(rats.every(r => r.attacks >= 1), "各ネズミが攻撃した " + JSON.stringify(rats.map(r => r.attacks)));
    const totalAttacks = rats.reduce((s, r) => s + r.attacks, 0) - attacks0;
    assert.ok(totalAttacks >= 4 && totalAttacks <= 7, "2秒で約2回ずつ " + totalAttacks);
    const dealt1 = lost(w, 3) + lost(w, 4);
    assert.equal(dealt1 - dealt0, totalAttacks * 53, "1回53(50 x 病1.05)。ネズミのダメージは固定ダメージの窓口を通る");
    secs(w, 3.2);
    assert.equal(circles(w).length, 0); assert.equal(plain(api(w).getRats()).length, 0, "サークルと一緒に消える");
    assert.equal(ratEvents(w).length, 0);
    const last = lastResult(w);
    assert.equal(last.rats, 0);
});

test("Lv2: ネズミの攻撃間隔(60frame)と射程(1マス)。サークルの外の敵は攻撃しない。Lv1にはネズミがいない", () => {
    const w = world(2);
    prep(w, [[3, 6, 0], [4, 6, 8]], 90, 6);
    fireCard(w, C); commit(w);
    secs(w, 1.0);
    const out = lost(w, 4);
    assert.equal(out, 0, "サークル(半径4)の外の敵は攻撃されない");
    const rats = plain(api(w).getRats());
    secs(w, 1.0);
    const rats2 = plain(api(w).getRats());
    for (let i = 0; i < rats.length; i++) assert.ok(rats2[i].attacks - rats[i].attacks <= 1 && rats2[i].attacks - rats[i].attacks >= 0, "1秒に1回まで");
    const w1 = world(1);
    prep(w1, [[3, 6, 0]], 90, 6);
    fireCard(w1, C); commit(w1);
    assert.equal(plain(api(w1).getRats()).length, 0, "Lv1はネズミなし"); assert.equal(ratEvents(w1).length, 0);
});

test("Lv3: メインの着弾のあと4本に分裂して周囲(5マス以内・ランダム)へ飛び、それぞれ着弾してサークルを作る。メインが外れても分裂した矢が敵を捉えれば成功(確定)", () => {
    const w = world(3);
    const c = prep(w, [[3, 6, 3]], 90, 6); // 着弾点(6,0)の3マス下。メインのサークル(半径4)には入る → 成功
    const seq = [0.0, 0.5, 0.25, 0.5, 0.5, 0.5, 0.75, 0.5, 0.9, 0.5]; let i = 0;
    w.run(`(() => { const s = ${JSON.stringify(seq)}; let i = 0; Math.random = () => s[i++ % s.length]; })();`);
    fireCard(w, C);
    settle(w, 600);
    const res = lastResult(w);
    assert.equal(res.committed, true);
    assert.equal(res.landings.length, 5, "メイン + 分裂4本");
    assert.equal(res.landings[0].kind, "main"); assert.deepEqual(res.landings.slice(1).map(l => l.kind), ["fragment", "fragment", "fragment", "fragment"]);
    const main = res.landings[0];
    for (const l of res.landings.slice(1)) assert.ok(Math.hypot(l.x - main.x, l.y - main.y) <= 5 + 1e-6, "分裂した矢は着弾点から5マス以内 " + Math.hypot(l.x - main.x, l.y - main.y));
    assert.ok(new Set(res.landings.slice(1).map(l => l.x.toFixed(2) + "," + l.y.toFixed(2))).size >= 3, "ランダムに散らばる");
    assert.equal(res.circles + 0, res.circles); assert.ok(res.arrowsTotal === 5);
    assert.equal(arrowEvents(w).length, 0); assert.equal(consumedHand(w, C), 4);
    // 分裂した矢だけが敵を捉える: メインは敵のいない場所へ → 着弾の時点では確定しない → 分裂した矢が敵のいる所へ着弾して確定
    const w2 = world(3);
    parkOthers(w2, [3]);
    const c2 = center(w2);
    placeEnemy(w2, 3, c2.x + 6 + 4.6, c2.y); // メインの着弾点(6マス先)から4.6マス = サークル(半径4)の外
    aimDegree(w2, 90, 6);
    // 分裂の1本目が真東5*(0.35+0.65*r)へ飛ぶようにする: 角度90度 = random 0.25、距離 = 5 * 1 = 5(random 1 → 1.0)
    w2.run("(() => { const s = [0.25, 0.9999, 0.25, 0.9999, 0.25, 0.9999, 0.25, 0.9999]; let i = 0; Math.random = () => s[i++ % s.length]; })();");
    fireCard(w2, C);
    for (let k = 0; k < 20; k++) frames(w2, 1);
    assert.equal(consumedHand(w2, C), 5, "メインは外れ・分裂はまだ飛行中: まだ未消費");
    settle(w2, 600);
    const res2 = lastResult(w2);
    assert.equal(res2.committed, true, JSON.stringify(res2).slice(0, 300));
    assert.ok(res2.landings.some(l => l.kind === "fragment" && l.inside.includes(3)), "分裂した矢の着弾で敵を捉えた");
    assert.equal(consumedHand(w2, C), 4);
    assert.ok(lost(w2, 3) >= 100, "分裂した矢の直撃または病 " + lost(w2, 3));
});

test("Lv3: ネズミは(Lv2から引き継ぎ)メインのサークルだけ。分裂した矢のサークルにはネズミを出さない(仮の決め)。サークルは最大でメイン+4つ", () => {
    const w = world(3);
    prep(w, [[3, 6, 0]], 90, 6);
    fireCard(w, C); frames(w, 60);
    assert.equal(plain(api(w).getRats()).length, 3);
    settle(w, 100);
    assert.ok(circles(w).length <= 5);
    assert.ok(api(w).getTempObjectCount().total <= 5 + 10 + 6 + 12, "同時の見た目は上限内 " + JSON.stringify(api(w).getTempObjectCount()));
});

test("取消と後片付け: 飛行中・サークル中の戦闘終了・マップ移動で、矢・ネズミのEvent・サークルの絵・錨・病の状態がすべて消える。確定前は非消費", () => {
    for (const [when, how] of [[5, "battle"], [90, "battle"], [90, "map"]]) {
        const w = world(3);
        prep(w, [[3, 6, 0]], 90, 6);
        fireCard(w, C); frames(w, when);
        assert.equal(shots(w).length, 1);
        if (how === "battle") w.ctx.ProjectRCardDeck.endBattle(); else w.ctx.$gameMap.setup(4);
        assert.equal(shots(w).length, 0, how + when); assert.equal(arrowEvents(w).length, 0); assert.equal(ratEvents(w).length, 0);
        assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0, "錨");
        assert.equal(status(w).list().length, 0, "病の状態"); assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0);
        assert.equal(api(w).getTempObjectCount().total, 0);
        if (when === 5) assert.equal(lastResult(w).consumed, false);
    }
    // 対象の消滅: 飛行中に敵が消えても例外にならない
    const w = world(1);
    prep(w, [[3, 6, 0]], 90, 6);
    fireCard(w, C); frames(w, 8);
    w.ctx.$gameMap.event(3).erase();
    settle(w, 200);
    assert.equal(consumedHand(w, C), 5);
});

test("演出: 通常のカットイン1回・手を上げる動作(SkillCast)・Apollo一時召喚。サークルの絵(ループ)はサークルが消えたら外れる。VFXの素材とライブラリが揃っている", () => {
    const w = world(2);
    prep(w, [[3, 6, 0]], 90, 6);
    const requests = [];
    const cp = w.ctx.ProjectRCharacterPresentation, original = cp.request;
    cp.request = function(name) { requests.push(name); return original.apply(this, arguments); };
    const spy = spySe(w);
    fireCard(w, C);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1, "カットインは発動時に1回");
    assert.ok(requests.includes("SkillCast"));
    commit(w);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1, "確定時に重ねて出さない");
    spy.restore();
    assert.ok(spy.se.includes("Bow3") && spy.se.includes("Blow5"), JSON.stringify(spy.se));
    assert.ok(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).some(k => k === "apollo_plague.circle"), "サークルの絵がある");
    secs(w, 5.2);
    assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => k === "apollo_plague.circle").length, 0, "サークルの絵は消えたら外れる");
    // 素材
    const vfx = w.ctx.ProjectRPresentationVfx, library = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const [key, frame] of [["apollo_plague.circle", 384], ["apollo_plague.impact", 96]]) {
        const m = plain(vfx.mapping(key)), entry = library[m.library];
        assert.ok(entry, key); assert.equal(entry.spritesheetFile, m.sheet.file);
        const png = fs.readFileSync(path.join(project, "img/pictures", m.sheet.file + ".png"));
        assert.deepEqual([png.readUInt32BE(16) / m.sheet.columns, png.readUInt32BE(20) / m.sheet.rows], [frame, frame], key);
    }
    for (const f of ["$ProjectR_PlagueArrow.png", "$ProjectR_Rat.png"]) assert.ok(fs.existsSync(path.join(project, "img/characters/VFX", f)), f);
});
