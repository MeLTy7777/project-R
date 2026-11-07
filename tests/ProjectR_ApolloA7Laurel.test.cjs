"use strict";
// Phase Apollo-A7: Apollo「月桂冠」(設計ID 11 / apollo_laurel_wreath)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a7_laurel_verify.cjs。
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, addAlly, allyHp, lost, resetHp } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_laurel_wreath";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloLaurelWreath;
const status = w => w.ctx.ProjectRApolloStatus;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const leader = w => w.ctx.$gameParty.leader();
const setHp = (w, hp) => { leader(w).setHp(hp); return leader(w).hp; };
const hurt = (w, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdatePlayerHp", { target: "player", value: `-${amount}` });
// 同じ呼び出しの中で被ダメージを測る(回復が間に入らない)
const hurtDrop = (w, amount) => { const a = leader(w), before = a.hp; hurt(w, amount); return before - a.hp; };
const noGrow = w => override(w, "constant", "growSeconds", 0);
const use = w => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(C)))); };
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { player(w).locate(x, y); player(w)._realX = x; player(w)._realY = y; player(w).center(x, y); };
const patches = w => plain(api(w).getPatches());
const walls = w => plain(api(w).getWalls());
const rootEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRLaurelRoot/.test(e.event().note || ""));
const wallEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRLaurelWall/.test(e.event().note || ""));
// 敵の弾に見立てたEvent(Hendrixが敵の弾として扱う _inheritedEnemyName を持つ)。templateIdは疫病の矢のPrefab(表示専用)を借りる。
const spawnProjectile = (w, x, y, enemy = true) => {
    const m = w.ctx.$gameMap, tpl = w.ctx.$dataTemplateMap.events.find(e => e && e.name === "ProjectR Apollo Plague Arrow");
    const id = m.spawnEvent(tpl.id, x - 0.5, y - 0.5, false);
    const event = m.event(id);
    if (enemy) event._inheritedEnemyName = "Slime";
    return event;
};
const alive = (w, event) => !!event && !event._erased && w.ctx.$gameMap.event(event.eventId()) === event;

test("登録と数値: 最大Lv3・Cooldown 8・強力/最大3。Lv1=半径5・7秒・秒間50・x0.7・弱点増分x0.1。Lv2は移動+20%と敵へ秒間30。Lv3は弾を防ぐ壁。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 3, cooldownSeconds: 8, maxLevel: 3, rarity: "strong", category: "support", targetType: "instant" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.radius, c1.rootSeconds, c1.growSeconds, c1.healPerSecond, c1.healAmount, c1.damageTaken, c1.weaknessScale, c1.speedBonus, c1.thornDps, c1.wall, c1.maxPatches, c1.trailStep], [5, 7, 7, 50, 25, 0.7, 0.1, 0, 0, false, 12, 2]);
    assert.deepEqual([c2.speedBonus, c2.thornDps, c2.thornTick, c2.wall, c2.healPerSecond], [0.2, 30, 0.5, false, 50], "Lv2はLv1を引き継ぎ移動とスリップを足す");
    assert.deepEqual([c3.wall, c3.wallSeconds, c3.wallRadius, c3.speedBonus, c3.thornDps], [true, 1.5, 0.8, 0.2, 30], "Lv3は壁を足す。Lv1〜2を引き継ぐ");
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0);
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 11);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId], [true, 3, C]);
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・DamageModifiers・PartyCombat・PartyRoster・CardModifiers・他のApollo)", () => {
    assert.equal(git("diff", "--stat", "f78d85d", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_PartyCombat.js",
        "js/plugins/ProjectR_PartyRoster.js", ).trim(), "");
    // 共通のダメージ処理(CardModifiers)は、フックが返す倍率(damageMultiplier)を固定ダメージの基礎値に掛ける追加だけ許す(返さなければ何も変わらない)。SOUL のストレングス用
    { const cm = git("diff", "--numstat", "f78d85d", "--", "js/plugins/ProjectR_CardModifiers.js").trim().split(/\s+/);
      assert.ok(cm[0] === "" || (Number(cm[0]) <= 8 && Number(cm[1]) <= 4 && /damageMultiplier/.test(require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "js/plugins/ProjectR_CardModifiers.js"), "utf8"))), "ProjectR_CardModifiers.js は damageMultiplier の追加だけ: " + cm.join("+")); }
    // 疫病の矢は、SOUL の準備ループが ATTACK の終了で打ち切るための追加専用の窓口 clear(reason) の1行だけ許す(それ以外は変えない)
    { const pr = git("diff", "--numstat", "f78d85d", "--", "js/plugins/ProjectR_ApolloPlagueRain.js").trim().split(/\s+/);
      assert.ok(pr[0] === "" || (pr[0] === "1" && pr[1] === "0"), "ProjectR_ApolloPlagueRain.js は追加専用の clear の1行以外は変えない: " + pr.join("+")); }
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。上書きが累積どおりに効く", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["rootSeconds", "growSeconds", "trailStepTiles", "maxPatches", "laurelHealPerSecond", "laurelHealTickSeconds", "laurelDamageTaken", "laurelWeaknessScale", "thornDamagePerSecond", "thornTickSeconds", "wallSeconds", "wallBlockRadiusTiles", "projectileWall", "radiusTiles", "speedBonus"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["rootSeconds", "laurelHealPerSecond", "laurelDamageTaken", "thornDamagePerSecond", "projectileWall", "radiusTiles"]) assert.ok(described.includes(key), key);
    assert.equal(balanceOf(w).validate(C, 1, "laurelDamageTaken", 1.5).ok, false);
    assert.equal(balanceOf(w).validate(C, 3, "projectileWall", 2).ok, false);
    assert.equal(balanceOf(w).validate(C, "constant", "maxPatches", 13).ok, false);
    override(w, 1, "laurelHealPerSecond", 80); override(w, 2, "thornDamagePerSecond", 60); override(w, "constant", "radiusTiles", 3);
    assert.deepEqual([api(w).config(1).healPerSecond, api(w).config(3).healPerSecond, api(w).config(2).thornDps, api(w).config(1).thornDps, api(w).config(2).radius], [80, 80, 60, 0, 3]);
    balanceOf(w).resetCard(C);
    assert.deepEqual([api(w).config(3).healPerSecond, api(w).config(3).thornDps, api(w).config(1).radius], [50, 30, 5]);
});

test("Lv1: 使った瞬間に消費。使った場所に半径5・7秒の根(パッチ1つ)。根の中で秒間50(0.5秒ごと25)回復、根の外では回復しない", () => {
    const w = world(1); noGrow(w);
    parkOthers(w, []); put(w, 12, 25);
    const r = use(w);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1);
    const p = patches(w);
    assert.equal(p.length, 1); assert.equal(p[0].radius, 5); assert.ok(p[0].framesLeft <= 420 && p[0].framesLeft > 410, "7秒(420frame) " + p[0].framesLeft);
    assert.ok(Math.abs(p[0].x - 12.5) < 0.6 && Math.abs(p[0].y - 25.5) < 0.6);
    const hp0 = setHp(w, 100);
    secs(w, 2.0);
    const healed = leader(w).hp - hp0;
    assert.ok(healed >= 96 && healed <= 104, "2秒で約100 " + healed);
    put(w, 12 + 7, 25);
    const hp1 = leader(w).hp;
    secs(w, 1.0);
    assert.equal(leader(w).hp, hp1, "根の外では回復しない");
    setHp(w, leader(w).mhp);
    const before = plain(api(w).getMembers())[0].healed;
    secs(w, 1.0);
    assert.equal(plain(api(w).getMembers())[0].healed, before, "満タンなら何もしない");
});

test("Lv1: 根に触れている間の被ダメージx0.7(100→70)と、弱点の増分x0.1(有効度2.0→1.1)。根の外では等倍・弱点も等倍", () => {
    const w = world(1); noGrow(w);
    parkOthers(w, []); put(w, 12, 25);
    setHp(w, leader(w).mhp);
    use(w); frames(w, 3);
    assert.equal(hurtDrop(w, 100), 70, "根の中は70");
    assert.ok(Math.abs(w.ctx.ProjectRDamageModifiers.weaknessAdjust(2, "player") - 1.1) < 1e-9, "弱点 x2.0 → x1.1(増分の90%を打ち消す)");
    assert.equal(w.ctx.ProjectRDamageModifiers.weaknessAdjust(1, "player"), 1, "等倍は変えない");
    assert.equal(w.ctx.ProjectRDamageModifiers.weaknessAdjust(0.5, "player"), 0.5, "耐性は変えない");
    put(w, 12 + 8, 25); frames(w, 25);
    assert.equal(status(w).has("player", "laurel_roots"), false, "根の外では状態が外れる");
    assert.equal(w.ctx.ProjectRDamageModifiers.weaknessAdjust(2, "player"), 2);
    setHp(w, leader(w).mhp);
    assert.equal(hurtDrop(w, 100), 100, "根の外は100");
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0);
});

test("根は7秒で消える(絵・錨・根のEvent・状態も)。消えたあとは回復も軽減もない", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    setHp(w, 100);
    use(w);
    assert.ok(rootEvents(w).length >= 1 && rootEvents(w).length <= 4, "根のEventがある " + rootEvents(w).length);
    secs(w, 6.9);
    assert.equal(patches(w).length, 1);
    secs(w, 0.3);
    assert.equal(patches(w).length, 0, "7秒で消える");
    assert.equal(rootEvents(w).length, 0); assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
    assert.equal(api(w).getTempObjectCount().total, 0);
    frames(w, 25);
    assert.equal(status(w).has("player", "laurel_roots"), false); assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0);
    const hp = leader(w).hp;
    secs(w, 1.0);
    assert.equal(leader(w).hp, hp, "消えたあとは回復しない");
    assert.equal(hurtDrop(w, 100), 100);
});

test("成長: 操作キャラが2マス動くたびにその場へ新しい根(パッチ)が残り、範囲が広がる。各パッチは作ってから7秒で別々に消える。成長は7秒で止まり、パッチは最大12", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 8, 25);
    use(w);
    assert.equal(patches(w).length, 1);
    secs(w, 1.0);
    put(w, 8 + 2.5, 25); frames(w, 2);
    assert.equal(patches(w).length, 2, "2マス以上動いたので追加");
    secs(w, 2.0);
    put(w, 8 + 5, 25); frames(w, 2);
    assert.equal(patches(w).length, 3);
    put(w, 8 + 5.5, 25); frames(w, 2);
    assert.equal(patches(w).length, 3, "2マス未満では増えない");
    // 最初のパッチの中心から8マス離れた場所は、最初のパッチだけだと範囲外・最新のパッチだと範囲内
    const far = { x: 8 + 5 + 4.5, y: 25.5 };
    assert.ok(Math.hypot(far.x - 8.5, far.y - 25.5) > 5 && patches(w).some(p => Math.hypot(far.x - p.x, far.y - p.y) <= 5), "範囲が広がっている");
    // パッチは作ってから7秒で別々に消える
    secs(w, 4.0);
    assert.equal(patches(w).length, 2, "最初のパッチ(7秒)が先に消えた");
    secs(w, 1.1);
    assert.equal(patches(w).length, 1, "2つめ(1秒に作った)が消えた");
    secs(w, 2.0);
    assert.equal(patches(w).length, 0, "3つめ(3秒に作った)が最後に消えた");
    // 成長は7秒で終わる
    const w2 = world(1);
    parkOthers(w2, []); put(w2, 6, 25);
    use(w2);
    secs(w2, 7.2);
    assert.equal(plain(api(w2).getStats()).growFramesLeft, 0);
    put(w2, 20, 25); frames(w2, 3);
    assert.equal(patches(w2).filter(p => p.x > 15).length, 0, "成長が終わったあとは足さない");
    // 上限
    const w3 = world(1);
    parkOthers(w3, []); put(w3, 4, 25);
    use(w3);
    for (let i = 1; i <= 20; i++) { put(w3, 4 + i * 0.6 * 2, 25); frames(w3, 1); }
    assert.ok(patches(w3).length <= 12, "上限12 " + patches(w3).length);
});

test("Lv2: 主人公の移動速度x1.2(根の中だけ)・根に触れた敵に秒間30のスリップ(0.5秒ごと15)。根の外の敵・Lv1は何もない", () => {
    const w = world(2); noGrow(w);
    parkOthers(w, [3, 4]); put(w, 12, 25);
    const c = center(w);
    placeEnemy(w, 3, c.x + 3, c.y); placeEnemy(w, 4, c.x + 9, c.y);
    use(w); frames(w, 3);
    assert.ok(Math.abs(w.ctx.ProjectRCardModifiers.moveSpeedFactor() - 1.2) < 1e-9, "x1.2");
    secs(w, 2.0);
    const l3 = lost(w, 3);
    assert.ok(l3 >= 58 && l3 <= 62, "2秒で約60(15 x 4回) " + l3);
    assert.equal(lost(w, 4), 0, "根の外の敵は無傷");
    put(w, 12 + 8, 25); frames(w, 25);
    assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "根の外では速度が元へ");
    // 敵が根から出たらスリップは止まる
    placeEnemy(w, 3, c.x + 12, c.y); frames(w, 25);
    const l3b = lost(w, 3);
    secs(w, 1.0);
    assert.equal(lost(w, 3), l3b, "出たらスリップが止まる");
    const w1 = world(1);
    parkOthers(w1, [3]); put(w1, 12, 25);
    placeEnemy(w1, 3, center(w1).x + 3, center(w1).y);
    use(w1); secs(w1, 2.0);
    assert.equal(lost(w1, 3), 0, "Lv1は敵にスリップなし"); assert.equal(w1.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1);
});

test("Lv3: 敵の弾が根の範囲に入った瞬間に消え、その位置に根の壁(1.5秒)ができる。壁の近くの弾も壁がある間は消える。主人公の弾・敵本人は防がない。Lv2は防がない", () => {
    const w = world(3);
    parkOthers(w, [3]); put(w, 12, 25);
    const c = center(w);
    use(w); frames(w, 2);
    const own = spawnProjectile(w, c.x + 2, c.y, false), enemyFar = spawnProjectile(w, c.x + 8, c.y, true), enemyIn = spawnProjectile(w, c.x + 3, c.y + 1, true);
    assert.equal(api(w).isEnemyProjectile(enemyIn), true); assert.equal(api(w).isEnemyProjectile(own), false, "敵が撃った弾でないものは対象外");
    frames(w, 2);
    assert.equal(alive(w, enemyIn), false, "範囲に入った弾は消える");
    assert.equal(alive(w, enemyFar), true, "範囲の外の弾はそのまま");
    assert.equal(alive(w, own), true);
    assert.equal(walls(w).length, 1); assert.equal(wallEvents(w).length, 1, "壁の見た目");
    assert.equal(plain(api(w).getStats()).blocked, 1);
    // 壁の近く(根の外でも)を通る弾は、壁がある間は消える
    const w2 = world(3);
    parkOthers(w2, []); put(w2, 12, 25);
    const c2 = center(w2);
    use(w2); frames(w2, 2);
    const first = spawnProjectile(w2, c2.x + 4.5, c2.y, true); frames(w2, 2);
    assert.equal(alive(w2, first), false);
    const wallPoint = walls(w2)[0];
    // 壁が立っている間は壁の近くの弾を消す(その弾は根の範囲の外にある位置: 弾を根の外へ出して壁の半径内に置く)
    const near = spawnProjectile(w2, wallPoint.x + 0.5, wallPoint.y, true); frames(w2, 2);
    assert.equal(alive(w2, near), false, "壁の近くの弾も消える");
    secs(w2, 1.6);
    assert.equal(walls(w2).length, 0, "壁は1.5秒で消える"); assert.equal(wallEvents(w2).length, 0);
    // Lv2は防がない
    const w3 = world(2);
    parkOthers(w3, []); put(w3, 12, 25);
    const c3 = center(w3);
    use(w3); frames(w3, 2);
    const p3 = spawnProjectile(w3, c3.x + 2, c3.y, true); frames(w3, 3);
    assert.equal(alive(w3, p3), true, "Lv2は弾を防がない"); assert.equal(walls(w3).length, 0);
});

test("仲間(PartyRoster): 根の中の仲間も秒間50回復・被ダメージの30%が戻る。根の外の仲間は回復も差し戻しもない。ダウンした仲間は戻らない", () => {
    const w = world(1);
    parkOthers(w, [6]); put(w, 12, 25);
    noGrow(w);
    addAlly(w, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 1000, hp: 500 });
    use(w); frames(w, 3);
    const hp0 = allyHp(w, 2);
    secs(w, 1.0);
    assert.ok(allyHp(w, 2) - hp0 >= 48, "仲間も回復 " + (allyHp(w, 2) - hp0));
    const before = allyHp(w, 2);
    w.ctx.ProjectRPartyCombat.damageAlly(2, 100); frames(w, 2);
    assert.ok(allyHp(w, 2) >= before - 70 && allyHp(w, 2) <= before - 69 + 25, "100のダメージの30%(30)が戻る " + (before - allyHp(w, 2)));
    placeEnemy(w, 6, 12 + 9, 25); frames(w, 3);
    const out = allyHp(w, 2);
    w.ctx.ProjectRPartyCombat.damageAlly(2, 100); frames(w, 2);
    assert.equal(allyHp(w, 2), out - 100, "根の外の仲間は軽減されない");
});

test("取消と後片付け: 戦闘終了・マップ移動で、根・壁・Event・錨・状態・移動速度がすべて消える。死んだ敵・消えた敵への例外もない", () => {
    for (const how of ["battle", "map"]) {
        const w = world(3);
        parkOthers(w, [3]); put(w, 12, 25);
        const c = center(w);
        placeEnemy(w, 3, c.x + 3, c.y);
        use(w); frames(w, 3);
        spawnProjectile(w, c.x + 2, c.y, true); frames(w, 3);
        assert.ok(patches(w).length >= 1 && walls(w).length >= 1);
        if (how === "battle") w.ctx.ProjectRCardDeck.endBattle(); else w.ctx.$gameMap.setup(4);
        assert.equal(patches(w).length, 0, how); assert.equal(walls(w).length, 0, how); assert.equal(rootEvents(w).length, 0, how); assert.equal(wallEvents(w).length, 0, how);
        assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0, how); assert.equal(status(w).list().length, 0, how); assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0, how);
        assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, how);
    }
    const w = world(2);
    parkOthers(w, [3]); put(w, 12, 25);
    placeEnemy(w, 3, center(w).x + 3, center(w).y);
    use(w); secs(w, 0.5);
    w.ctx.$gameMap.event(3).erase();
    secs(w, 1.0);
    assert.equal(status(w).list("event:3").length, 0);
});

test("演出: 通常のカットイン1回・右手を上げる(FistPump)・Apollo一時召喚・根の絵(ループ)。根が消えたら絵・錨が外れる。VFX素材とライブラリ・キャラ画像が揃う", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const requests = [];
    const cp = w.ctx.ProjectRCharacterPresentation, original = cp.request;
    cp.request = function(name) { requests.push(name); return original.apply(this, arguments); };
    const spy = spySe(w);
    const summonsBefore = plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length;
    use(w);
    spy.restore();
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1);
    assert.ok(requests.includes("FistPump"), JSON.stringify(requests));
    assert.ok(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length > summonsBefore, "Apollo一時召喚");
    assert.ok(spy.se.includes("Twine"));
    assert.ok(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).includes("apollo_laurel.zone"));
    secs(w, 7.2);
    assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => k === "apollo_laurel.zone").length, 0, "根が消えたら絵も外れる");
    const vfx = w.ctx.ProjectRPresentationVfx, library = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const [key, frame] of [["apollo_laurel.zone", 480], ["apollo_laurel.burst", 96]]) {
        const m = plain(vfx.mapping(key)), entry = library[m.library];
        assert.ok(entry, key); assert.equal(entry.spritesheetFile, m.sheet.file);
        const png = fs.readFileSync(path.join(project, "img/pictures", m.sheet.file + ".png"));
        assert.deepEqual([png.readUInt32BE(16) / m.sheet.columns, png.readUInt32BE(20) / m.sheet.rows], [frame, frame], key);
    }
    for (const f of ["$ProjectR_LaurelRoot.png", "$ProjectR_LaurelWall.png"]) assert.ok(fs.existsSync(path.join(project, "img/characters/VFX", f)), f);
});
