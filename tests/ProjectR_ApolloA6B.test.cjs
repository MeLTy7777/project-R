"use strict";
// Phase Apollo-A6B: Apollo「エロスの矢」(設計ID 9 / apollo_eros_arrow)Lv2 = マウス方向を中心に80度間隔の3方向 x 1方向7本 = 21本。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(マウス・実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a6b_verify.cjs。Lv1の確認は ProjectR_ApolloA6A.test.cjs。Lv3は実装していないことも確かめる。
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloErosFixture.cjs");
const { assert, plain, erosWorld, EROS, api, handIds, state, fire, frames, aimDegree, barHp, lost, resetHp, arrowEvents, consumedHand, pile, addAlly, allyHp, settle,
    center, placeEnemy, placePolar, parkOthers, player, deckApi, setRegion } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const balanceOf = w => w.ctx.ProjectRCardBalance;
const lastResult = w => plain(api(w).getLastResult());
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(EROS, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const lv2 = (opts = {}) => erosWorld({ level: 2, ...opts });
const emissions = w => plain(api(w).getEmissionLog());
const near = (a, b, tol = 1.5) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tol;
const spySe = w => { const se = [], am = w.ctx.AudioManager, original = am.playSe; am.playSe = s => { se.push(s.name); }; return { se, restore: () => { am.playSe = original; } }; };
// 3方向の的: 狙い(右=90度)・その左右80度(10度・170度)へ r マス。
const threeTargets = (w, r = 6) => { parkOthers(w, [3, 4, 5]); placePolar(w, 3, r, 90); placePolar(w, 4, r, 10); placePolar(w, 5, r, 170); };

test("登録: Lv2の値(Lv3の行はA6C)。Lv1は10本のまま、Lv2は3方向x7本=21本。黄金の矢・旧カードは不変", () => {
    const w = lv2();
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(EROS)), { cardId: EROS, ringId: "apollo", maxCopies: 5, cooldownSeconds: 5, maxLevel: 3, rarity: "special", category: "special", targetType: "ground" });
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 9);
    assert.deepEqual([row.implemented, row.implementedLevels, row.maxLevel], [true, 3, 3], "実装はLv3まで(A6C)");
    assert.equal(api(w).cardLevel(), 2);
    const lv1 = plain(api(w).config(1)), cfg2 = plain(api(w).config(2));
    assert.deepEqual([lv1.directions, lv1.perDirection, lv1.count, lv1.damage, lv1.heal, lv1.radius], [1, 10, 10, 20, 50, 3], "Lv1の値は変わらない");
    assert.deepEqual([cfg2.directions, cfg2.perDirection, cfg2.count, cfg2.spacing, cfg2.damage, cfg2.heal, cfg2.radius, cfg2.emitSeconds, cfg2.originOffset], [3, 7, 21, 80, 20, 50, 3, 1, 0],
        "Lv2: 3方向・80度・7本・計21本。追尾3・20・50・1秒は引き継ぐ。出発点のずらしは0");
    const d = deckApi(w);
    d.setCardLevel(EROS, 4);
    assert.ok(Number(d.getPersistentData().cardOwnership[EROS].level) <= 3, "Lv4へ上げられない");
    d.setCardLevel(EROS, 2);
    assert.equal(api(w).cardLevel(), 2);
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0, "Apolloの本番の初期デッキ(30枚)は有効にしない");
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_golden_volley").maxLevel, 3, "黄金の矢のLvは不変");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・黄金の矢・HitStop・CardBattleInput・旧Apollo)", () => {
    assert.equal(git("diff", "--stat", "a3472e1", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js",
        "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_HitStop.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_CharacterPresentation.js").trim(), "");
});

test("バランス/F6: 方向の数・方向の間隔・1方向の本数・出発点のずらしがJSONとエディタにあり、不正値は拒否。合計が多すぎる設定は発動を拒否して非消費", () => {
    const w = lv2();
    const fields = plain(balanceOf(w).fields());
    for (const key of ["directionCount", "directionSpacingDegrees", "arrowsPerDirection", "directionOriginOffsetTiles"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(EROS)));
    for (const key of ["directionCount", "directionSpacingDegrees", "arrowsPerDirection", "directionOriginOffsetTiles"]) assert.ok(described.includes(key), key + " がF6の表に出る");
    assert.equal(balanceOf(w).validate(EROS, 2, "directionCount", 0).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 2, "directionCount", 9).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 2, "directionCount", 2.5).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 2, "directionSpacingDegrees", 0).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 2, "arrowsPerDirection", 51).ok, false);
    assert.equal(balanceOf(w).validate(EROS, "constant", "directionOriginOffsetTiles", 4).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 2, "arrowsPerDirection", 4).ok, true);
    override(w, 2, "directionCount", 2); override(w, 2, "arrowsPerDirection", 5); override(w, 2, "directionSpacingDegrees", 30);
    assert.deepEqual([api(w).config().directions, api(w).config().perDirection, api(w).config().count, api(w).config().spacing], [2, 5, 10, 30]);
    // Lv1の行を変えてもLv2へ引き継がれるのは「Lv2で上書きしていない項目」だけ(damage)
    override(w, 1, "damage", 33);
    assert.equal(api(w).config().damage, 33);
    balanceOf(w).resetCard(EROS);
    // 合計が上限(120)を超える設定: 発動を拒否して消費しない
    override(w, 2, "arrowsPerDirection", 50); override(w, 2, "directionCount", 3);
    assert.equal(api(w).config(), null, "3x50=150 > 120");
    parkOthers(w, []); aimDegree(w, 90, 3);
    const r = fire(w);
    assert.equal(r.ok, false); assert.equal(r.detail, "balanceInvalid", JSON.stringify(r));
    assert.equal(consumedHand(w), 5); assert.equal(pile(w).length, 0);
});

test("21本: 1方向7本 x 3方向を1秒(60更新)に。7回の発射の時刻(0,8,17,25,34,42,51更新目)に3方向から1本ずつ。21本を超えて出ない", () => {
    const w = lv2();
    parkOthers(w, []); aimDegree(w, 90, 3);
    fire(w);
    let maxEvents = 0, maxArrows = 0;
    for (let i = 0; i < 75; i++) { frames(w, 1); maxEvents = Math.max(maxEvents, arrowEvents(w).length); maxArrows = Math.max(maxArrows, api(w).getActiveArrows().length); }
    const log = emissions(w);
    assert.equal(log.length, 21, "21本");
    assert.deepEqual(log.filter(e => e.direction === 0).map(e => e.tick), [0, 8, 17, 25, 34, 42, 51]);
    for (let k = 0; k < 3; k++) assert.equal(log.filter(e => e.direction === k).length, 7, "方向" + k + "は7本");
    assert.deepEqual([...new Set(log.map(e => e.tick))], [0, 8, 17, 25, 34, 42, 51], "3方向は同じ更新に出る");
    assert.ok(log.every(e => e.tick <= 59), "1秒(60更新)以内");
    assert.deepEqual(log.map(e => e.index), Array.from({ length: 21 }, (_, i) => i), "矢の番号は0〜20");
    assert.ok(maxEvents <= 21 && maxArrows <= 21, `矢のEventは同時に21を超えない: ${maxEvents}/${maxArrows}`);
    assert.deepEqual(plain(api(w).emitSchedule(7, 60)), [0, 8, 17, 25, 34, 42, 51]);
    // Lv1は10本・0,6,…,54のまま
    const w1 = erosWorld();
    parkOthers(w1, []); aimDegree(w1, 90, 3); fire(w1); frames(w1, 70);
    assert.deepEqual(emissions(w1).map(e => e.tick), [0, 6, 12, 18, 24, 30, 36, 42, 48, 54]);
    assert.ok(emissions(w1).every(e => e.direction === 0 && e.visual));
});

test("3方向は狙いを中心に80度間隔: [狙い-80, 狙い, 狙い+80]。0度をまたぐ向き・斜めの狙いでも同じ。出発点は3方向とも同じ(既定)", () => {
    for (const aim of [90, 0, 200, 315]) {
        const w = lv2();
        parkOthers(w, []); aimDegree(w, aim, 3);
        fire(w); frames(w, 2);
        const first = emissions(w).filter(e => e.slot === 0);
        assert.equal(first.length, 3);
        const d = first.map(e => e.degree);
        assert.ok(near(d[1], aim), `中央は狙い(${aim}): ${d}`);
        assert.ok(near(d[0], (aim + 360 - 80) % 360), `左は-80: ${d}`);
        assert.ok(near(d[2], (aim + 80) % 360), `右は+80: ${d}`);
        assert.ok(near((d[2] - d[1] + 360) % 360, 80, 0.01) && near((d[1] - d[0] + 360) % 360, 80, 0.01), `間隔がちょうど80度: ${d}`);
        assert.ok(first.every(e => Math.abs(e.x - first[0].x) < 1e-9 && Math.abs(e.y - first[0].y) < 1e-9), "出発点は3方向とも同じ(既定)");
    }
    assert.deepEqual(plain(api(erosWorld({ level: 2 })).directionDegrees(90, 3, 80)), [10, 90, 170]);
    assert.deepEqual(plain(api(erosWorld()).directionDegrees(0, 3, 80)), [280, 0, 80]);
    assert.deepEqual(plain(api(erosWorld()).directionDegrees(90, 1, 80)), [90], "Lv1(1方向)は狙いそのまま");
});

test("出発点(仮・設定可): directionOriginOffsetTiles=1にすると、各方向の矢がその方向へ1マスずれた位置から出る。0なら3方向とも同じ", () => {
    const w = lv2({ balance: b => b.ctx.ProjectRCardBalance.setOverride(EROS, "constant", "directionOriginOffsetTiles", 1) });
    parkOthers(w, []); aimDegree(w, 90, 3);
    const c = center(w);
    fire(w); frames(w, 2);
    const first = emissions(w).filter(e => e.slot === 0);
    for (const e of first) {
        const h = e.degree * Math.PI / 180;
        assert.ok(Math.abs(e.x - (c.x + Math.sin(h))) < 1e-6 && Math.abs(e.y - (c.y - Math.cos(h))) < 1e-6, `方向${e.direction}の出発点が1マスずれる`);
    }
    assert.ok(Math.abs(first[0].x - first[2].x) > 0.1 || Math.abs(first[0].y - first[2].y) > 0.1, "3方向で出発点が違う");
});

test("方向転換: 連射の途中でマウスを動かすと、あとの発射の時刻の3方向は新しい狙いを中心に計算し直される(矢ごとに最初の向きを固定)", () => {
    const w = lv2();
    parkOthers(w, []); aimDegree(w, 90, 3);
    fire(w); frames(w, 20); // 0,8,17 の3回は右(90)
    aimDegree(w, 180, 3); // 下
    frames(w, 20); // 25,34 の2回は下(180)
    aimDegree(w, 0, 3); // 上
    frames(w, 30); // 42,51 の2回は上(0)
    const log = emissions(w);
    assert.equal(log.length, 21);
    const bySlot = s => log.filter(e => e.slot === s).map(e => Math.round(e.degree));
    assert.ok(near(Math.round(log[0].aim), 90) && [0, 1, 2].every(s => log.filter(e => e.slot === s).every(e => near(e.aim, 90))), "最初の3回は狙い90");
    assert.ok([3, 4].every(s => log.filter(e => e.slot === s).every(e => near(e.aim, 180))), "途中で下へ: 狙い180");
    assert.ok([5, 6].every(s => log.filter(e => e.slot === s).every(e => near(e.aim, 0))), "さらに上へ: 狙い0");
    assert.deepEqual(bySlot(0).map(d => d), [10, 90, 170]);
    assert.deepEqual(bySlot(3).map(d => d), [100, 180, 260]);
    assert.deepEqual(bySlot(6).map(d => d), [280, 0, 80]);
    // 飛んでいる矢の向きは変わらない(最初の向きを固定。追尾の対象が無い場合)
    const w2 = lv2();
    parkOthers(w2, []); aimDegree(w2, 90, 3); fire(w2); frames(w2, 3);
    const before = plain(api(w2).getActiveArrows()).map(a => Math.round(a.heading));
    aimDegree(w2, 270, 3); frames(w2, 3);
    const after = plain(api(w2).getActiveArrows()).filter(a => a.slot === 0).map(a => Math.round(a.heading));
    assert.deepEqual(after, before.slice(0, 3), "出た矢の向きはマウスで変わらない");
});

test("追尾・ダメージ・回復・壁越えはLv1と同じ: 3方向の敵へ各7本=21本が1回ずつ当たり、1本20(合計420)。壁の向こうでも当たる", () => {
    const w = lv2();
    threeTargets(w); aimDegree(w, 90, 3);
    fire(w); settle(w);
    assert.deepEqual([3, 4, 5].map(id => lost(w, id)), [140, 140, 140], "各7本x20");
    const res = lastResult(w);
    assert.equal(res.hits.length, 21);
    assert.equal(new Set(res.hits.map(h => h.arrow)).size, 21, "二重命中なし");
    assert.ok(res.hits.every(h => h.kind === "enemy" && h.damage === 20 && h.hpLost === 20));
    assert.equal(consumedHand(w), 4, "消費は1枚");
    // 壁越え: 3方向の的とのあいだにRegion 255の壁
    const ww = lv2();
    threeTargets(ww); const c = center(ww);
    for (let y = Math.floor(c.y) - 8; y <= Math.floor(c.y) + 8; y++) for (let dx of [2, 3]) setRegion(ww, Math.floor(c.x) + dx, y, 255);
    aimDegree(ww, 90, 3); fire(ww); settle(ww);
    assert.deepEqual([3, 4, 5].map(id => lost(ww, id)), [140, 140, 140], "壁の向こうでも各7本");
});

test("追尾: 3方向の矢が、範囲内の敵・味方へ曲がる。味方へは1本50回復(最大HPまで)。敵と味方を同時に", () => {
    const w = lv2();
    parkOthers(w, [3]); const c = center(w);
    placePolar(w, 3, 6, 90);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 1.2, cy: c.y - 6.2, maxHp: 400, hp: 100 }); // 上(10度付近の矢の先)
    aimDegree(w, 90, 3); fire(w); settle(w);
    const res = lastResult(w);
    const enemy = res.hits.filter(h => h.kind === "enemy"), healed = res.hits.filter(h => h.kind === "ally");
    assert.equal(enemy.length, 7, "敵(右)へ7本");
    assert.ok(healed.length >= 1 && healed.every(h => h.healed === 50 || h.healed > 0), "仲間へ回復が入る: " + JSON.stringify(res.hits.map(h => [h.kind, h.healed])));
    assert.equal(allyHp(w, 2), 100 + healed.reduce((s, h) => s + h.healed, 0));
    assert.ok(allyHp(w, 2) <= 400);
    assert.equal(lost(w, 6), 0, "味方のEventにダメージなし");
});

test("消費: 予約では消費せず、最初の命中で1回(21本中)。確定のあと手札が入れ替わっても、残りの矢は全部放たれて当たる(正常な確定 ≠ 外からの取消)", () => {
    const w = lv2();
    threeTargets(w, 9); aimDegree(w, 90, 3);
    const before = handIds(w);
    const startInstance = (fire(w), api(w).getPending().instanceId);
    assert.equal(consumedHand(w), 5, "予約では消費しない"); assert.equal(pile(w).length, 0);
    let commit = null;
    for (let i = 0; i < 300 && api(w).getSequences().length; i++) {
        frames(w, 1);
        const s = plain(api(w).getSequences())[0];
        if (s && s.committed && !commit) { commit = { ...s, hand: handIds(w), pile: pile(w).length, tickNow: i }; break; }
    }
    assert.ok(commit, "命中で確定した");
    assert.ok(commit.emitted < 21, "確定のとき、まだ全部は放っていない: " + commit.emitted);
    assert.equal(commit.pile, 1, "確定でCooldownの山に1枚");
    const stateNow = state(w);
    assert.equal(stateNow.hand.filter(c => c.instanceId === startInstance).length, 0, "確定したカードは手札から消えた(入れ替わった)");
    settle(w);
    const res = lastResult(w);
    assert.equal(res.completed, true, "最後まで放ち終えた(正常な終わり)"); assert.equal(res.cancelled, false);
    assert.equal(res.hits.length, 21, "確定のあとの残りも全部当たる: " + res.hits.length);
    assert.deepEqual([3, 4, 5].map(id => lost(w, id)), [140, 140, 140]);
    assert.equal(pile(w).length, 1, "消費は1回だけ"); assert.equal(consumedHand(w), 4);
    assert.equal(before.filter(x => x === EROS).length - consumedHand(w), 1);
});

test("外からの取消は正常な確定と区別する: 確定前=非消費で全部消える。確定後(戦闘終了)=消費は戻らず残りの矢だけ消え、cancelled=trueで記録", () => {
    const pre = lv2();
    threeTargets(pre, 12); aimDegree(pre, 90, 3);
    fire(pre); frames(pre, 12);
    deckApi(pre).endCardBattle();
    assert.equal(arrowEvents(pre).length, 0);
    let r = lastResult(pre);
    assert.deepEqual([r.cancelled === undefined ? r.aborted : r.cancelled, r.consumed, r.committed, r.reason], [true, false, false, "battleEnd"], JSON.stringify([r.aborted, r.consumed, r.reason]));
    const post = lv2();
    threeTargets(post, 6); aimDegree(post, 90, 3);
    fire(post);
    for (let i = 0; i < 300 && !(plain(api(post).getSequences())[0] || {}).committed; i++) frames(post, 1);
    frames(post, 3);
    assert.ok(api(post).getSequences()[0].emitted < 21);
    deckApi(post).endCardBattle();
    assert.equal(arrowEvents(post).length, 0); assert.equal(api(post).getTempObjectCount().total, 0);
    r = lastResult(post);
    assert.deepEqual([r.cancelled, r.completed, r.consumed, r.committed, r.reason], [true, false, true, true, "battleEnd"]);
    assert.ok(r.emitted < 21 && r.hits.length < 21, "残りの矢は放たれていない");
    // マップ移動・ロード・戦闘不能でも同じ(確定前も後も片付く)
    for (const kind of ["setup", "load", "dead"]) {
        const w = lv2();
        threeTargets(w, 12); aimDegree(w, 90, 3); fire(w); frames(w, 12);
        if (kind === "setup") w.ctx.$gameMap.setup(4);
        else if (kind === "load") w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents());
        else { w.ctx.ProjectR.PlayerDeath.isDead = () => true; frames(w, 2); }
        if (kind !== "load") assert.equal(arrowEvents(w).length, 0, kind); // ロードで復元された矢のEventは、マップが読み込まれた時に片付く(実機で確認)
        assert.equal(api(w).getSequences().length, 0, kind); assert.equal(api(w).getTempObjectCount().total, 0, kind);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, kind);
    }
});

test("全部外れたら非消費(21本)。重複発動の防止: 確定待ち・連射中は別の手札スロットの同じカードも発動できず、連射が終われば撃てる", () => {
    const w = lv2();
    parkOthers(w, []); aimDegree(w, 90, 3);
    const hand = handIds(w);
    fire(w); frames(w, 3);
    const second = deckApi(w).requestUseCard(1);
    assert.equal(second.ok, false); assert.notEqual(second.reason, "pending");
    settle(w);
    assert.equal(lastResult(w).reason, "missed"); assert.equal(lastResult(w).consumed, false);
    assert.deepEqual(handIds(w), hand); assert.equal(pile(w).length, 0);
    assert.equal(arrowEvents(w).length, 0);
    // 確定後の連射中
    const w2 = lv2();
    threeTargets(w2, 6); aimDegree(w2, 90, 3); fire(w2);
    for (let i = 0; i < 300 && !(plain(api(w2).getSequences())[0] || {}).committed; i++) frames(w2, 1);
    assert.ok(api(w2).getSequences()[0].slot < 7);
    const during = deckApi(w2).requestUseCard(2);
    assert.equal(during.ok, false); assert.notEqual(during.reason, "pending", "連射中は拒否: " + JSON.stringify(plain(during)));
    assert.equal(consumedHand(w2), 4, "消費は1枚のまま");
    settle(w2);
    assert.equal(fire(w2).reason, "pending", "終われば撃てる");
});

test("演出の上限: カットイン・ArmExtend・Apolloは1回、弓の動作・閃光・音は発射の時刻2回に1回(4回)。表示物に上限があり、矢と命中は減らない。終われば全部0", () => {
    const w = lv2();
    const cutIns = [], arm = [];
    const show = w.ctx.ProjectRCutIn.show; w.ctx.ProjectRCutIn.show = function(o) { cutIns.push(o); return show.apply(this, arguments); };
    const request = w.ctx.ProjectRCharacterPresentation.request; w.ctx.ProjectRCharacterPresentation.request = function(name) { arm.push(name); return request.apply(this, arguments); };
    const swings = []; const swing = w.ctx.ProjectRGodSummonVisual.swingWeapon; w.ctx.ProjectRGodSummonVisual.swingWeapon = function() { swings.push(1); return swing.apply(this, arguments); };
    const spy = spySe(w);
    threeTargets(w); aimDegree(w, 90, 3);
    fire(w);
    const max = { arrows: 0, events: 0, glows: 0, short: 0, total: 0 };
    for (let i = 0; i < 200; i++) { frames(w, 1); const t = plain(api(w).getTempObjectCount()); for (const k of Object.keys(max)) max[k] = Math.max(max[k], t[k]); }
    spy.restore();
    assert.equal(cutIns.length, 1); assert.equal(arm.filter(n => n === "ArmExtend").length, 1);
    assert.equal(swings.length, 4, "弓の動作は発射の時刻 0,2,4,6 の4回: " + swings.length);
    assert.ok(spy.se.filter(n => n === "Chime2").length <= 4, "放つ音は4回以下: " + spy.se.join(","));
    assert.ok(max.events <= 21 && max.glows <= 6 && max.short <= 6, JSON.stringify(max));
    assert.ok(max.total <= 33, JSON.stringify(max));
    assert.equal(plain(api(w).getTempObjectCount()).total, 0); assert.equal(plain(api(w).getActiveVfxJobs()).length, 0);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0);
    assert.equal(lastResult(w).hits.length, 21, "表示物を絞っても命中は21");
    // 見た目のEventの上限(30): 矢を60本にすると、見た目は30までで、判定と命中は60本ぶん
    const big = lv2({ balance: b => { const bal = b.ctx.ProjectRCardBalance; bal.setOverride(EROS, 2, "arrowsPerDirection", 20); bal.setOverride(EROS, "constant", "projectileSpeed", 4); bal.setOverride(EROS, "constant", "projectileLifetimeSeconds", 4); } }); // 遅い矢で、たくさんが同時に飛ぶ状態にする
    threeTargets(big); aimDegree(big, 90, 3);
    fire(big);
    let maxVisual = 0, maxLogic = 0;
    for (let i = 0; i < 260; i++) { frames(big, 1); maxVisual = Math.max(maxVisual, big.ctx.$gameMap.events().filter(e => e && /projectRErosArrow/.test(e.event().note || "")).length); maxLogic = Math.max(maxLogic, api(big).getActiveArrows().length); }
    assert.ok(maxVisual <= api(big).limits.VISUAL_ARROW_BUDGET, "見た目のEventは " + api(big).limits.VISUAL_ARROW_BUDGET + " まで: " + maxVisual);
    assert.ok(maxLogic > maxVisual, "判定のある矢は見た目より多い: " + maxLogic + " > " + maxVisual);
    const res = lastResult(big);
    assert.equal(res.hits.length, 60, "60本とも当たる(見た目なしの矢も命中する): " + res.hits.length);
    assert.deepEqual([3, 4, 5].map(id => lost(big, id)), [400, 400, 400]);
    assert.equal(arrowEvents(big).length, 0); assert.equal(api(big).getTempObjectCount().total, 0);
});

test("性能(参考値。実機の測定は apollo_a6b_verify): Lv2の連射中の1frameの処理時間がLv1・待機中と同程度(桁が変わらない)", () => {
    const measure = (w, n) => { const t0 = process.hrtime.bigint(); for (let i = 0; i < n; i++) w.frames(1); return Number(process.hrtime.bigint() - t0) / 1e6 / n; };
    const idle = erosWorld(); parkOthers(idle, []); const idleMs = measure(idle, 60);
    const one = erosWorld(); parkOthers(one, []); aimDegree(one, 90, 3); fire(one); const lv1Ms = measure(one, 60);
    const two = lv2(); parkOthers(two, []); aimDegree(two, 90, 3); fire(two); const lv2Ms = measure(two, 60);
    console.log(`  frame平均: 待機 ${idleMs.toFixed(2)}ms / Lv1連射 ${lv1Ms.toFixed(2)}ms / Lv2連射 ${lv2Ms.toFixed(2)}ms (Nodeの実エンジン・描画なし)`);
    assert.ok(lv2Ms < 40, "Lv2の連射中の1frameが40ms未満: " + lv2Ms);
    assert.ok(lv2Ms - idleMs < 25, "待機との差が25ms未満: " + (lv2Ms - idleMs));
});

test("演出と消費の回帰: 黄金の矢Lv1・ダメージ式(UpdateEventHp 1本1回)・属性なしは不変。21本=21回のUpdateEventHp", () => {
    const w = lv2();
    threeTargets(w); aimDegree(w, 90, 3);
    fire(w); settle(w);
    const updates = w.calls.filter(c => c.name === "UpdateEventHp");
    assert.equal(updates.length, 21);
    assert.ok(updates.every(u => u.args.projectRFixed.base === 20 && u.args.projectRFixed.source === EROS && u.args.projectRFixed.element === 0 && u.args.projectRFixed.weaknessMultiplier === 1));
    assert.equal(balanceOf(w).effects("apollo_golden_volley", 3).projectileCount, 11);
    assert.equal(balanceOf(w).constant("apollo_golden_volley", "beamHitDamage"), 50);
});
