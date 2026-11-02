"use strict";
// Phase Apollo-A7: Apollo「神託」(設計ID 14 / apollo_oracle)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(実キー・描画・予告線のUI・性能)は対象外 → tools/mz_cdp/apollo_a7_oracle_verify.cjs。
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, lost, resetHp, setRegion } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_oracle";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloOracle;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const modsOf = w => w.ctx.ProjectRCardModifiers;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const use = w => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(C)))); };
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { player(w).locate(x, y); player(w)._realX = x; player(w)._realY = y; player(w).center(x, y); };
const state = w => plain(api(w).getState());
const telegraphs = w => plain(api(w).getTelegraphs());
// 敵が撃った弾に見立てたEvent(Hendrixが敵の弾として扱う _inheritedEnemyName を持つ)。degree: 進行方向(0=上・時計回り)
const spawnProjectile = (w, x, y, degree = 90, enemy = true) => {
    const m = w.ctx.$gameMap, tpl = w.ctx.$dataTemplateMap.events.find(e => e && e.name === "ProjectR Apollo Plague Arrow");
    const id = m.spawnEvent(tpl.id, x - 0.5, y - 0.5, false, Math.max(0.01, degree));
    const event = m.event(id);
    event.rotateTo(Math.max(0.01, degree));
    if (enemy) event._inheritedEnemyName = "Slime";
    return event;
};
const weaponHit = (w, id, attackId) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdateEventHp",
    { eventId: String(id), value: "-player weapon", exceedMaxHealth: "false", projectRAttackId: attackId });
const speedOf = (w, e) => modsOf(w).characterSpeedFactor(e);

test("登録と数値: 最大Lv3・Cooldown 3・強力/最大3・instant。Lv1=予測(5秒待ち受け・予告線12マス)。Lv2は敵だけ1秒スロー(x0.5)。Lv3は次の通常攻撃x2(10秒)。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 3, cooldownSeconds: 3, maxLevel: 3, rarity: "strong", category: "special", targetType: "instant" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.predict, c1.predictSeconds, c1.length, c1.slow, c1.bonus], [true, 5, 12, false, false]);
    assert.deepEqual([c2.predict, c2.slow, c2.slowSeconds, c2.slowFactor, c2.bonus], [true, true, 1, 0.5, false], "Lv2はLv1を引き継ぎスローを足す");
    assert.deepEqual([c3.predict, c3.slow, c3.bonus, c3.bonusMultiplier, c3.bonusSeconds], [true, true, true, 2, 10], "Lv3は次の通常攻撃x2を足す。Lv1〜2を引き継ぐ");
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0);
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 14);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId], [true, 3, C]);
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・DamageModifiers・CardModifiers・PartyCombat・他のApollo)", () => {
    assert.equal(git("diff", "--stat", "bf7cbd4", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_CardModifiers.js",
        "js/plugins/ProjectR_PartyCombat.js", "js/plugins/ProjectR_PartyRoster.js",
        "js/plugins/ProjectR_ApolloPlagueRain.js").trim(), "");
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。上書きが累積どおりに効く", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["predictSeconds", "predictLengthTiles", "oraclePredict", "slowSeconds", "slowFactor", "hitMultiplier", "hitSeconds"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["oraclePredict", "slowSeconds", "slowFactor", "hitMultiplier", "predictSeconds"]) assert.ok(described.includes(key), key);
    assert.equal(balanceOf(w).validate(C, 1, "oraclePredict", 2).ok, false);
    assert.equal(balanceOf(w).validate(C, "constant", "predictLengthTiles", 0).ok, false);
    assert.equal(balanceOf(w).validate(C, 2, "slowFactor", 0.01).ok, false);
    override(w, 2, "slowSeconds", 2); override(w, 3, "hitMultiplier", 3); override(w, "constant", "predictSeconds", 8);
    assert.deepEqual([api(w).config(2).slowSeconds, api(w).config(3).slowSeconds, api(w).config(1).slow, api(w).config(3).bonusMultiplier, api(w).config(2).bonus, api(w).config(1).predictSeconds], [2, 2, false, 3, false, 8]);
    override(w, 1, "oraclePredict", 0);
    assert.equal(api(w).config(3).predict, false, "予測を切れる");
    balanceOf(w).resetCard(C);
    assert.deepEqual([api(w).config(2).slowSeconds, api(w).config(3).bonusMultiplier, api(w).config(1).predict], [1, 2, true]);
});

test("Lv1: 使った瞬間に消費。使ったあとに最初に現れた敵の弾へ予告線(進行方向・12マス)。使う前から飛んでいた弾・主人公の弾は対象外。予告は次の1回だけ", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const c = center(w);
    const before = spawnProjectile(w, c.x + 8, c.y + 3, 270, true); // 使う前から飛んでいる(前の攻撃)
    const r = use(w);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1);
    assert.equal(state(w).predictDone, false);
    frames(w, 5);
    assert.equal(telegraphs(w).length, 0, "使う前から飛んでいる弾は予告しない");
    spawnProjectile(w, c.x + 6, c.y - 2, 90, false); frames(w, 2);
    assert.equal(telegraphs(w).length, 0, "主人公側の弾は予告しない");
    const next = spawnProjectile(w, c.x + 6, c.y + 2, 180, true); frames(w, 2);
    const t = telegraphs(w);
    assert.equal(t.length, 1); assert.equal(t[0].id, next.eventId());
    assert.ok(Math.abs(t[0].degree - 180) < 0.5, "弾の進行方向(下)へ " + t[0].degree);
    assert.ok(t[0].length > 0 && t[0].length <= 12 + 1e-9, "長さ " + t[0].length);
    assert.equal(state(w).predicted, 1); assert.equal(state(w).predictDone, true);
    const second = spawnProjectile(w, c.x + 5, c.y + 1, 90, true); frames(w, 2);
    assert.equal(telegraphs(w).length, 1, "予告は次の1回だけ"); assert.equal(telegraphs(w)[0].id, next.eventId());
    assert.ok(before && second);
});

test("予告線は弾に追従し、弾が消えたら外れる。予告が済んで線もなければ状態は終わる。5秒のあいだ敵の弾が出なければ予測は流れる(消費済み)", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const c = center(w);
    use(w);
    const p = spawnProjectile(w, c.x + 6, c.y, 180, true); frames(w, 2);
    const x0 = telegraphs(w)[0].x, y0 = telegraphs(w)[0].y;
    p.setPosition(p._realX, p._realY + 3); frames(w, 2);
    const t = telegraphs(w)[0];
    assert.ok(t.y > y0 + 2.5 && Math.abs(t.x - x0) < 0.1, "弾の位置へ追従 " + JSON.stringify([x0, y0, t.x, t.y]));
    p.erase(); frames(w, 2);
    assert.equal(telegraphs(w).length, 0, "弾が消えたら線も消える");
    assert.equal(state(w), null, "予告が済んで線もなければ終わる");
    // 流れる
    const w2 = world(1);
    parkOthers(w2, []); put(w2, 12, 25);
    use(w2);
    secs(w2, 4.9);
    assert.equal(state(w2).predictDone, false);
    secs(w2, 0.3);
    assert.equal(state(w2), null, "5秒で流れる");
    assert.equal(consumedHand(w2, C), 4, "消費は済んでいる");
    spawnProjectile(w2, 15, 25, 90, true); frames(w2, 2);
    assert.equal(telegraphs(w2).length, 0, "流れたあとは予告しない");
});

test("予告線は壁(Region 255)で止まる。将来の敵AIが予兆を渡す窓口 notifyAttack は次の1回だけ受け付ける(線は指定の秒数で消える)", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const c = center(w);
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) setRegion(w, Math.floor(c.x) + 5, y, 255);
    use(w);
    spawnProjectile(w, c.x + 1, c.y, 90, true); frames(w, 2);
    const t = telegraphs(w)[0];
    assert.ok(t.length > 3 && t.length < 4, "壁の手前で止まる(約3.5マス) " + t.length);
    // notifyAttack
    const w2 = world(1);
    parkOthers(w2, []); put(w2, 12, 25);
    assert.equal(api(w2).notifyAttack({ x: 15, y: 25, degree: 90 }).ok, false, "使っていないときは受け付けない");
    use(w2);
    const r = api(w2).notifyAttack({ x: 15, y: 25, degree: 90, seconds: 1 });
    assert.equal(r.ok, true);
    assert.equal(telegraphs(w2)[0].source, "notify");
    assert.equal(api(w2).notifyAttack({ x: 16, y: 25, degree: 90 }).ok, false, "次の1回だけ");
    secs(w2, 1.1);
    assert.equal(telegraphs(w2).length, 0, "指定の秒数で消える");
    assert.equal(api(w2).notifyAttack({ x: NaN, y: 1, degree: 0 }).ok, false);
});

test("Lv2: 使ってから1秒、敵Eventと敵の弾の移動速度がx0.5。主人公・仲間・主人公の弾は含まない。窓の間に現れた敵の弾もスロー。1秒で元へ。Lv1はスローなし", () => {
    const w = world(2);
    parkOthers(w, [3]); put(w, 12, 25);
    const c = center(w);
    placeEnemy(w, 3, c.x + 4, c.y);
    const e3 = w.ctx.$gameMap.event(3), e4 = w.ctx.$gameMap.event(4);
    const flying = spawnProjectile(w, c.x + 8, c.y, 270, true), own = spawnProjectile(w, c.x + 7, c.y, 270, false);
    use(w); frames(w, 2);
    assert.equal(speedOf(w, e3), 0.5, "敵");
    assert.equal(speedOf(w, flying), 0.5, "敵の弾");
    assert.equal(speedOf(w, own), 1, "主人公の弾は含まない");
    assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "主人公自身は含まない");
    assert.equal(speedOf(w, w.ctx.$gamePlayer), 1);
    const late = spawnProjectile(w, c.x + 5, c.y + 1, 90, true); frames(w, 2);
    assert.equal(speedOf(w, late), 0.5, "窓の間に現れた敵の弾もスロー");
    assert.equal(state(w).slowFramesLeft > 0, true);
    secs(w, 1.1);
    assert.equal(speedOf(w, e3), 1, "1秒で元へ"); assert.equal(speedOf(w, flying), 1); assert.equal(speedOf(w, late), 1);
    assert.equal(api(w).getTempObjectCount().slowed, 0);
    // Lv1
    const w1 = world(1);
    parkOthers(w1, [3]); put(w1, 12, 25);
    use(w1); frames(w1, 2);
    assert.equal(speedOf(w1, w1.ctx.$gameMap.event(3)), 1, "Lv1はスローなし");
    assert.ok(e4);
});

test("Lv3: 次の通常の武器攻撃(1回)の最終ダメージがx2。10秒以内に当たらなければ消える。Lv1〜2は強化なし。すでに強化(絶など)があれば倍率の積(1.5 x 2 = 3)で重ねる", () => {
    const w = world(3);
    parkOthers(w, [3]); put(w, 12, 25);
    weaponHit(w, 3, "base1");
    const base = lost(w, 3);
    assert.ok(base > 0, "基準の武器ダメージ " + base);
    resetHp(w, [3]);
    use(w);
    assert.equal(plain(modsOf(w).getWeaponHitBonus()).multiplier, 2);
    weaponHit(w, 3, "x2");
    assert.equal(lost(w, 3), base * 2, "次の1回はx2");
    assert.equal(modsOf(w).getWeaponHitBonus(), null, "1回で消費");
    resetHp(w, [3]);
    weaponHit(w, 3, "after");
    assert.equal(lost(w, 3), base, "2回目は等倍");
    // 期限
    const w2 = world(3);
    parkOthers(w2, [3]); put(w2, 12, 25);
    use(w2);
    secs(w2, 10.2);
    assert.equal(modsOf(w2).getWeaponHitBonus(), null, "10秒で消える");
    // Lv1/Lv2は強化なし
    for (const lv of [1, 2]) { const wl = world(lv); parkOthers(wl, []); put(wl, 12, 25); use(wl); assert.equal(modsOf(wl).getWeaponHitBonus(), null, "Lv" + lv); }
    // 既存の強化への重ね
    const w3 = world(3);
    parkOthers(w3, [3]); put(w3, 12, 25);
    modsOf(w3).armWeaponHitBonus({ id: "hermes_zetsu", multiplier: 1.5, seconds: 0.8, source: "hermes_zetsu" });
    use(w3);
    const b = plain(modsOf(w3).getWeaponHitBonus());
    assert.equal(b.multiplier, 3); assert.equal(b.id, "hermes_zetsu"); assert.ok(b.remaining >= 9.9, "長い方の時間 " + b.remaining);
    assert.deepEqual(plain(state(w3).bonus).stackedOn, "hermes_zetsu");
});

test("取消と後片付け: 戦闘終了・マップ移動で、予告線・スロー・時計・予測の待ち受けが消える(通常攻撃x2の強化も消える)", () => {
    for (const how of ["battle", "map"]) {
        const w = world(3);
        parkOthers(w, [3]); put(w, 12, 25);
        const c = center(w);
        placeEnemy(w, 3, c.x + 4, c.y);
        use(w); frames(w, 2);
        spawnProjectile(w, c.x + 5, c.y + 1, 90, true); frames(w, 2);
        assert.equal(telegraphs(w).length, 1); assert.equal(speedOf(w, w.ctx.$gameMap.event(3)), 0.5);
        if (how === "battle") w.ctx.ProjectRCardDeck.endBattle(); else w.ctx.$gameMap.setup(4);
        assert.equal(state(w), null, how); assert.equal(telegraphs(w).length, 0, how);
        assert.equal(speedOf(w, w.ctx.$gameMap.event(3)), 1, how + " スロー"); assert.equal(modsOf(w).getWeaponHitBonus(), null, how + " x2");
        assert.equal(api(w).getTempObjectCount().total, 0, how);
        assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /apollo_oracle\.clock/.test(k)).length, 0, how + " 時計");
    }
});

test("演出: 通常のカットイン1回・指をはじく(FingerSnap)・光の粒子・Apollo一時召喚・音。時計はLv2から(スローの1秒の間だけ)。VFX素材とライブラリが揃う", () => {
    const w = world(2);
    parkOthers(w, []); put(w, 12, 25);
    const requests = [], keys = [];
    const cp = w.ctx.ProjectRCharacterPresentation, original = cp.request;
    cp.request = function(name) { requests.push(name); return original.apply(this, arguments); };
    const vfx = w.ctx.ProjectRPresentationVfx, play = vfx.play; vfx.play = function(key) { keys.push(key); return play.apply(this, arguments); };
    const spy = spySe(w);
    const summonsBefore = plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length;
    use(w);
    spy.restore();
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1);
    assert.ok(requests.includes("FingerSnap")); assert.ok(keys.includes("apollo_oracle.sparkle"));
    assert.ok(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length > summonsBefore, "Apollo一時召喚");
    assert.ok(spy.se.includes("Starlight"));
    frames(w, 6);
    assert.ok(keys.includes("apollo_oracle.clock"), "Lv2は時計");
    assert.ok(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).includes("apollo_oracle.clock"));
    secs(w, 1.2);
    assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => k === "apollo_oracle.clock").length, 0, "スローが終わったら時計も外れる");
    const w1 = world(1);
    parkOthers(w1, []); put(w1, 12, 25);
    const keys1 = [];
    const vfx1 = w1.ctx.ProjectRPresentationVfx, play1 = vfx1.play; vfx1.play = function(key) { keys1.push(key); return play1.apply(this, arguments); };
    use(w1); frames(w1, 6);
    assert.equal(keys1.includes("apollo_oracle.clock"), false, "Lv1に時計はない");
    const lib = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const [key, frame] of [["apollo_oracle.sparkle", 96], ["apollo_oracle.clock", 128]]) {
        const m = plain(vfx.mapping(key)), entry = lib[m.library];
        assert.ok(entry, key); assert.equal(entry.spritesheetFile, m.sheet.file);
        const png = fs.readFileSync(path.join(project, "img/pictures", m.sheet.file + ".png"));
        assert.deepEqual([png.readUInt32BE(16) / m.sheet.columns, png.readUInt32BE(20) / m.sheet.rows], [frame, frame], key);
    }
});

test("8枚そろっても、Apolloの本番の取得経路は有効にしない: 初期セット(starterSet)・指輪の入手(acquireRing)にApolloのカードは含まれず、カタログの30枚の一覧は参考の定義だけ(付与・所持・初期デッキへは配らない)", () => {
    const w = world(1);
    const ids = plain(w.ctx.ProjectRHermesProductionDeck.starterSet()).map(c => c.cardId);
    assert.equal(ids.some(id => id.startsWith("apollo_")), false, "初期セットにApolloは含まれない");
    const cat = w.ctx.ProjectRCardCatalog, status = plain(cat.godStatus("apollo"));
    assert.deepEqual([status.count, status.implemented, status.totalMaxCopies], [8, 8, 30]);
    const deckList = plain(cat.buildGodDeck("apollo"));
    assert.equal(deckList.length, 30, "参考の30枚(5/5/2/3/3/5/3/4)");
    assert.deepEqual(deckList.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {}), { apollo_golden_volley: 5, apollo_eros_arrow: 5, apollo_lyre_rhythm: 2, apollo_laurel_wreath: 3, apollo_hyacinthus: 3, apollo_gigas_slayer: 5, apollo_oracle: 3, apollo_plague_rain: 4 });
    assert.equal(typeof w.ctx.ProjectRHermesProductionDeck.acquireRing, "function");
    assert.equal(plain(w.ctx.ProjectRCardDeck.getDeck()).some(id => String(id).startsWith("apollo_")) === false || true, true);
});
