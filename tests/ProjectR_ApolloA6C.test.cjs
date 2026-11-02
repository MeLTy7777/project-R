"use strict";
// Phase Apollo-A6C: Apollo「エロスの矢」(設計ID 9 / apollo_eros_arrow)Lv3 = 追尾範囲7 + 左右80度の2方向x7本(14本) + 中央の3秒のビーム。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(マウス・実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a6c_verify.cjs。Lv1〜2は ProjectR_ApolloA6A / A6B.test.cjs。
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloErosFixture.cjs");
const { assert, plain, erosWorld, EROS, api, handIds, state, fire, frames, aimDegree, barHp, lost, arrowEvents, consumedHand, pile, addAlly, allyHp, settle,
    center, placeEnemy, placePolar, parkOthers, player, deckApi, setRegion } = fx;
const project = path.join(__dirname, "..");

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const balanceOf = w => w.ctx.ProjectRCardBalance;
const lastResult = w => plain(api(w).getLastResult());
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(EROS, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const lv3 = (opts = {}) => erosWorld({ level: 3, ...opts });
const emissions = w => plain(api(w).getEmissionLog());
const beamOf = w => plain(api(w).getBeam());
const near = (a, b, tol = 1.5) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b)) <= tol;
const beamSegmentEvents = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRErosBeam/.test(e.event().note || ""));
const updates = w => w.calls.filter(c => c.name === "UpdateEventHp");
const tickOf = w => { const s = plain(api(w).getSequences())[0]; return s ? s.tick : -1; };
const runTo = (w, tick, max = 600) => { for (let i = 0; i < max && tickOf(w) >= 0 && tickOf(w) < tick; i++) frames(w, 1); };
const spySe = w => { const se = [], am = w.ctx.AudioManager, original = am.playSe; am.playSe = s => { se.push(s.name); }; return { se, restore: () => { am.playSe = original; } }; };
const leader = w => w.ctx.$gameParty.leader();

test("登録とLv3の数値: 最大Lv3。追尾範囲 Lv1〜2=3 / Lv3=7。Lv3は左右2方向x7=14本+3秒のビーム(0.1秒ごと30回復・8ダメージ・最大30tick・幅0.9)。Lv1〜2の値は不変", () => {
    const w = lv3();
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(EROS)), { cardId: EROS, ringId: "apollo", maxCopies: 5, cooldownSeconds: 5, maxLevel: 3, rarity: "special", category: "special", targetType: "ground" });
    assert.equal(api(w).cardLevel(), 3);
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.radius, c1.beam, c1.count, c1.directions], [3, false, 10, 1], "Lv1は不変");
    assert.deepEqual([c2.radius, c2.beam, c2.count, c2.directions, c2.sideCount], [3, false, 21, 3, 3], "Lv2は不変(追尾3・ビームなし)");
    assert.deepEqual([c3.radius, c3.beam, c3.count, c3.directions, c3.sideCount, c3.perDirection, c3.spacing, c3.damage, c3.heal, c3.emitSeconds],
        [7, true, 14, 3, 2, 7, 80, 20, 50, 1], "Lv3: 追尾7・側面2方向x7=14本。Lv2の80度・20・50・1秒を引き継ぐ");
    assert.deepEqual([c3.beamSeconds, c3.beamFrames, c3.beamHealRate, c3.beamDamageRate, c3.beamTickSeconds, c3.beamTickFrames, c3.beamMaxTicks, c3.beamTickHeal, c3.beamTickDamage, c3.beamWidth, c3.beamRange],
        [3, 180, 300, 80, 0.1, 6, 30, 30, 8, 0.9, 0]);
    assert.ok(c3.beamLength > 24, "ビームの到達は∞(マップの対角線までの有限の値): " + c3.beamLength);
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0, "Apolloの本番の初期デッキ(30枚)は有効にしない");
    deckApi(w).setCardLevel(EROS, 4);
    assert.ok(Number(deckApi(w).getPersistentData().cardOwnership[EROS].level) <= 3, "Lv4は無い");
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 9);
    assert.deepEqual([row.implemented, row.implementedLevels], [true, 3]);
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_golden_volley").maxLevel, 3, "黄金の矢は不変");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・黄金の矢・HitStop・CardBattleInput・PartyRoster・PartyCombat・CharacterPresentation・旧Apollo)", () => {
    assert.equal(git("diff", "--stat", "c4ca439", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js",
        "js/plugins/ProjectR_ApolloGoldenArrow.js", "js/plugins/ProjectR_HitStop.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_PartyRoster.js", "js/plugins/ProjectR_PartyCombat.js", "js/plugins/ProjectR_CharacterPresentation.js").trim(), "");
});

test("バランス/F6: ビームの持続・回復/秒・ダメージ/秒・間隔・幅・長さがLv3の行にあり、数値の置き換えが累積規則どおり。不正値は拒否し、発動も拒否して非消費", () => {
    const w = lv3();
    const fields = plain(balanceOf(w).fields());
    for (const key of ["beamDurationSeconds", "beamHealPerSecond", "beamDamagePerSecond", "beamTickSeconds", "beamWidthTiles", "bowBeamRangeTiles", "homingRadiusTiles"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(EROS)));
    for (const key of ["beamDurationSeconds", "beamHealPerSecond", "beamDamagePerSecond", "beamTickSeconds", "beamWidthTiles", "bowBeamRangeTiles"]) assert.ok(described.includes(key), key + " がF6の表に出る");
    assert.equal(balanceOf(w).validate(EROS, 3, "beamDurationSeconds", 5).ok, false, "持続の上限は4秒(Eventの安全網300frame未満)");
    assert.equal(balanceOf(w).validate(EROS, 3, "beamTickSeconds", 0.01).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 3, "beamWidthTiles", 0).ok, false);
    assert.equal(balanceOf(w).validate(EROS, 3, "homingRadiusTiles", 8).ok, true);
    // Lv3の行の追尾範囲だけ7。Lv2・Lv1は定数の3のまま(置き換えは該当レベルだけ)
    override(w, 3, "homingRadiusTiles", 5);
    assert.deepEqual([api(w).config(1).radius, api(w).config(2).radius, api(w).config(3).radius], [3, 3, 5]);
    override(w, 3, "beamTickSeconds", 0.2); override(w, 3, "beamHealPerSecond", 200);
    const c = plain(api(w).config(3));
    assert.deepEqual([c.beamMaxTicks, c.beamTickFrames, c.beamTickHeal, c.beamTickDamage], [15, 12, 40, 16], "間隔を0.2秒にすると15tick・1回40回復・16ダメージ");
    balanceOf(w).resetCard(EROS);
    // 不正: 間隔が持続より長い → 設定が無効 → 発動を拒否(非消費)
    override(w, 3, "beamTickSeconds", 1); override(w, 3, "beamDurationSeconds", 0.5);
    assert.equal(api(w).config(3), null);
    parkOthers(w, []); aimDegree(w, 90, 3);
    const r = fire(w);
    assert.equal(r.ok, false); assert.equal(r.detail, "balanceInvalid");
    assert.equal(consumedHand(w), 5); assert.equal(pile(w).length, 0);
});

test("追尾範囲7(Lv3) 対 3(Lv2): 側面の矢から5マス外れた敵へ、Lv2は曲がれず外れ、Lv3は曲がって当たる", () => {
    const place = w => {
        parkOthers(w, [3]); const c = center(w), h = 10 * Math.PI / 180;
        // 10度(狙いの左80度)の側面の矢の進路から垂直に5マス、8マス先
        const u = { x: Math.sin(h), y: -Math.cos(h) }, n = { x: Math.cos(h), y: Math.sin(h) };
        placeEnemy(w, 3, c.x + u.x * 8 + n.x * 5, c.y + u.y * 8 + n.y * 5);
        aimDegree(w, 90, 3);
    };
    const w2 = erosWorld({ level: 2 }); place(w2); fire(w2); settle(w2);
    assert.equal(lost(w2, 3), 0, "Lv2(追尾3): 外れる");
    assert.equal(lastResult(w2).reason, "missed");
    const w3 = lv3(); place(w3); fire(w3); settle(w3);
    assert.ok(lost(w3, 3) >= 20 && lost(w3, 3) % 20 === 0, "Lv3(追尾7): 側面の矢が曲がって当たる " + lost(w3, 3));
    assert.equal(plain(api(w3).getBeam() || { damageTotal: 0 }).damageTotal, 0, "ビームの外(中央の線上ではない)なので、ビームのダメージではない");
});

test("Lv3の本数: 側面の2方向(狙いの左右80度)x7本=14本だけが矢。中央の方向は矢が出ず、ビームが1本。7回の発射の時刻(0,8,17,25,34,42,51)に1秒以内", () => {
    const w = lv3();
    parkOthers(w, []); aimDegree(w, 90, 3);
    fire(w);
    let maxArrowEvents = 0, maxSegments = 0, activeFrames = 0, seenBeams = new Set();
    for (let i = 0; i < 200; i++) {
        frames(w, 1);
        maxArrowEvents = Math.max(maxArrowEvents, arrowEvents(w).length); maxSegments = Math.max(maxSegments, beamSegmentEvents(w).length);
        const b = plain(api(w).getBeam());
        if (b && b.active) { activeFrames++; seenBeams.add(plain(api(w).getSequences())[0].serial); }
    }
    const log = emissions(w);
    assert.equal(log.length, 14, "矢は14本");
    assert.ok(log.every(e => e.direction === 0 || e.direction === 2), "中央(方向1)の矢は出ない");
    for (const k of [0, 2]) assert.equal(log.filter(e => e.direction === k).length, 7);
    assert.deepEqual([...new Set(log.map(e => e.tick))], [0, 8, 17, 25, 34, 42, 51]);
    const first = log.filter(e => e.slot === 0).map(e => Math.round(e.degree));
    assert.deepEqual(first, [10, 170], "狙い90の左右80度");
    assert.ok(maxArrowEvents <= 14, "矢のEventは同時に14まで: " + maxArrowEvents);
    assert.ok(maxSegments >= 1 && maxSegments <= api(w).segmentBudget(), "ビームの区間Event(絵は画面に映る範囲まで)は予算以内: " + maxSegments);
    assert.ok(Math.abs(activeFrames - 180) <= 1, "ビームは3秒(180更新): " + activeFrames);
    assert.equal(seenBeams.size, 1, "ビームは1本");
    assert.equal(lastResult(w).arrows, 14);
    assert.equal(api(w).getTempObjectCount().total, 0); assert.equal(beamSegmentEvents(w).length, 0); assert.equal(arrowEvents(w).length, 0);
    // Lv2は21本のまま・ビームなし
    const w2 = erosWorld({ level: 2 }); parkOthers(w2, []); aimDegree(w2, 90, 3); fire(w2); frames(w2, 70);
    assert.equal(emissions(w2).length, 21); assert.equal(api(w2).getBeam(), null);
});

test("ビームの合計: 3秒で1対象あたり最大30tick = 敵240ダメージ / 味方900回復(外部修飾・HP上限の前)。tickは0.1秒ごとに1回で、同じtickに二重に当たらない。1tick=8ダメージ/30回復", () => {
    const w = lv3();
    parkOthers(w, [3]); const c = center(w);
    placePolar(w, 3, 6, 90);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 9, cy: c.y, maxHp: 5000, hp: 100 }); // 敵の後ろ(ビームは壁・敵で止まらない)
    aimDegree(w, 90, 3);
    fire(w); settle(w, 600);
    const res = lastResult(w), beam = res.beam;
    assert.deepEqual([beam.ticks, beam.maxTicks], [30, 30]);
    assert.equal(beam.perTarget.e3.ticks, 30); assert.equal(beam.perTarget.e3.damage, 240, "敵: 30tick x 8 = 240");
    assert.equal(beam.perTarget.a2.ticks, 30); assert.equal(beam.perTarget.a2.healed, 900, "味方: 30tick x 30 = 900");
    assert.equal(beam.damageTotal, 240); assert.equal(beam.healTotal, 900);
    const ticks = plain(api(w).getHitLog()).filter(h => h.beam).map(h => h.tick);
    assert.deepEqual(ticks, Array.from({ length: 30 }, (_, i) => i), "tick番号は0〜29が1回ずつ(重複なし)");
    const beamUpdates = updates(w).filter(u => /^erosb:/.test(JSON.stringify(u.args)) || u.args.projectRFixed.base === 8);
    assert.equal(beamUpdates.length, 30, "ビームのUpdateEventHpは30回(8ダメージ)");
    assert.ok(beamUpdates.every(u => u.args.projectRFixed.base === 8 && u.args.projectRFixed.element === 0 && u.args.projectRFixed.weaknessMultiplier === 1));
    assert.equal(lost(w, 6), 0, "味方のEventにダメージなし");
    // 敵のHPの減りは「矢20 x 命中数」+ ビーム240
    const arrowHits = res.hits.filter(h => h.kind === "enemy").length;
    assert.equal(lost(w, 3), 240 + arrowHits * 20);
    assert.equal(allyHp(w, 2), 100 + 900 + res.hits.filter(h => h.kind === "ally").reduce((s, h) => s + h.healed, 0));
    assert.equal(consumedHand(w), 4, "消費は1回");
});

test("ビームの向きは現在のマウスに毎更新追従する: 右→下→上へ動かすと、ビームの向きと当たる対象が変わる。側面の矢の方向も発射の時刻ごとに計算し直される", () => {
    const w = lv3();
    parkOthers(w, [3, 4]);
    placePolar(w, 3, 6, 90); placePolar(w, 4, 6, 180);
    aimDegree(w, 90, 3);
    fire(w);
    runTo(w, 30); assert.ok(near(beamOf(w).heading, 90, 3), "右: " + beamOf(w).heading);
    aimDegree(w, 180, 3);
    frames(w, 2); assert.ok(near(beamOf(w).heading, 180, 3), "下へ即追従: " + beamOf(w).heading);
    runTo(w, 100);
    aimDegree(w, 0, 3);
    frames(w, 2); assert.ok(near(beamOf(w).heading, 0, 3), "上へ: " + beamOf(w).heading);
    settle(w, 600);
    const beam = lastResult(w).beam;
    assert.equal(beam.ticks, 30);
    assert.ok(beam.perTarget.e3 && beam.perTarget.e4, "右の敵と下の敵の両方に当たった");
    assert.ok(beam.perTarget.e3.ticks >= 3 && beam.perTarget.e4.ticks >= 3 && beam.perTarget.e3.ticks + beam.perTarget.e4.ticks <= 30, JSON.stringify([beam.perTarget.e3.ticks, beam.perTarget.e4.ticks]));
    assert.ok(beam.perTarget.e3.ticks <= 30 && beam.perTarget.e4.ticks <= 30);
    // 側面の矢: 途中でマウスを動かすと、あとの発射の時刻の左右80度が計算し直される
    const w2 = lv3();
    parkOthers(w2, []); aimDegree(w2, 90, 3); fire(w2); frames(w2, 20); aimDegree(w2, 0, 3); frames(w2, 45);
    const log = emissions(w2);
    assert.deepEqual(log.filter(e => e.slot === 0).map(e => Math.round(e.degree)), [10, 170]);
    assert.deepEqual(log.filter(e => e.slot === 6).map(e => Math.round(e.degree)), [280, 80], "最後は狙い0の左右80度");
});

test("混在した対象と壁越え: ビームは敵・仲間を同時に当て、Region 255の壁(2列)・<CombatWall>を通り抜ける。任意のNPC・満タンの味方・主人公(既定オフ)には当たらない", () => {
    const w = lv3();
    parkOthers(w, [3, 4, 5]); const c = center(w);
    for (let y = Math.floor(c.y) - 6; y <= Math.floor(c.y) + 6; y++) for (const dx of [2, 3]) setRegion(w, Math.floor(c.x) + dx, y, 255);
    placePolar(w, 3, 7, 90);
    // NPC(敵のタグなし)
    const npc = w.ctx.$gameMap.event(4), data = npc.event(); npc.event = () => ({ ...data, note: "<npc>" });
    placePolar(w, 4, 5, 90);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 9, cy: c.y, maxHp: 5000, hp: 100 });
    leader(w).setHp(Math.max(1, leader(w).mhp - 100));
    const hp0 = leader(w).hp;
    aimDegree(w, 90, 3);
    fire(w); settle(w, 600);
    const beam = lastResult(w).beam;
    assert.equal(beam.perTarget.e3.ticks, 30, "壁の向こうの敵に30tick");
    assert.equal(beam.perTarget.a2.ticks, 30, "壁の向こうの仲間に30tick");
    assert.ok(!beam.perTarget.e4, "NPCは対象外"); assert.equal(lost(w, 4), 0);
    assert.equal(leader(w).hp, hp0, "主人公自身は回復しない(既定オフ・ビームは主人公を対象にしない)");
    // 主人公の自己回復をオンにしても、ビームの対象にはしない(仮)
    const on = lv3({ balance: b => b.ctx.ProjectRCardBalance.setOverride(EROS, "constant", "selfHealEnabled", 1) });
    parkOthers(on, []); leader(on).setHp(Math.max(1, leader(on).mhp - 100)); aimDegree(on, 90, 3);
    fire(on); settle(on, 600);
    assert.ok(!lastResult(on).beam.perTarget.player, "ビームは主人公を対象にしない");
    // <CombatWall>
    const cw = lv3();
    parkOthers(cw, [3]); const cc = center(cw);
    for (let y = Math.floor(cc.y) - 6; y <= Math.floor(cc.y) + 6; y++) fx.addWallEvent(cw, "CombatWall", Math.floor(cc.x) + 3, y);
    placePolar(cw, 3, 7, 90); aimDegree(cw, 90, 3); fire(cw); settle(cw, 600);
    assert.equal(lastResult(cw).beam.perTarget.e3.ticks, 30);
});

test("HP満タンの味方: ビームに入っても回復にならないので、有効な当たりに数えず、消費もしない(fullHpAlliesEligible=1でも)。HPが減った味方だけが当たる", () => {
    for (const flag of [0, 1]) {
        const w = lv3({ balance: b => b.ctx.ProjectRCardBalance.setOverride(EROS, "constant", "fullHpAlliesEligible", flag) });
        parkOthers(w, []); const c = center(w);
        addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 6, cy: c.y, maxHp: 300, hp: 300 });
        aimDegree(w, 90, 3);
        fire(w); settle(w, 600);
        const res = lastResult(w);
        assert.equal(res.beam.damageTotal + res.beam.healTotal, 0, "ビームの効果は0 (flag=" + flag + ")");
        assert.deepEqual(Object.keys(res.beam.perTarget), []);
        assert.equal(res.reason, flag ? res.reason : "missed");
        if (flag === 0) { assert.equal(res.consumed, false); assert.equal(consumedHand(w), 5); assert.equal(pile(w).length, 0); }
        else assert.equal(res.beam.ticks, 30, "ビーム自体は3秒続く(効果が無いだけ)");
        assert.equal(allyHp(w, 2), 300);
        assert.equal(beamSegmentEvents(w).length, 0);
    }
    // ビームの途中で満タンになった味方は、そこから対象から外れる(30 tickを待たず、HPの上限で止まる)
    const w = lv3();
    parkOthers(w, []); const c = center(w);
    addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 6, cy: c.y, maxHp: 300, hp: 200 }); // 100足りない = 4tick(30,30,30,10)
    aimDegree(w, 90, 3); fire(w); settle(w, 600);
    const t = lastResult(w).beam.perTarget.a2;
    assert.equal(t.healed, 100); assert.equal(t.ticks, 4); assert.equal(allyHp(w, 2), 300);
});

test("消費(ビーム): 側面の矢が届かない遠い敵でも、ビームの最初の有効な効果で1回だけ消費(予約では消費しない)。確定のあともビームと側面の矢は最後まで続く", () => {
    const w = lv3();
    parkOthers(w, [3]); placePolar(w, 3, 10, 90); aimDegree(w, 90, 3);
    const startInstance = (fire(w), api(w).getPending().instanceId);
    assert.equal(consumedHand(w), 5, "予約では消費しない"); assert.equal(pile(w).length, 0);
    frames(w, 2);
    const s = plain(api(w).getSequences())[0];
    assert.equal(s.committed, true, "ビームの最初のtickで確定");
    assert.ok(s.emitted < 14, "まだ側面の矢を放ち終えていない: " + s.emitted);
    assert.equal(pile(w).length, 1);
    assert.equal(state(w).hand.filter(c => c.instanceId === startInstance).length, 0, "確定したカードは手札から消えた");
    settle(w, 600);
    const res = lastResult(w);
    assert.equal(res.completed, true); assert.equal(res.cancelled, false);
    assert.equal(res.beam.perTarget.e3.ticks, 30);
    assert.equal(res.arrows, 14); assert.equal(res.emitted, 14, "側面の14本は確定のあとも全部放たれた");
    assert.equal(pile(w).length, 1, "消費は1回だけ"); assert.equal(consumedHand(w), 4);
    // 矢とビームが同じ更新で最初の効果になっても、消費は1回
    const both = lv3();
    parkOthers(both, [3]); placePolar(both, 3, 1.2, 90); aimDegree(both, 90, 3); fire(both); settle(both, 600);
    assert.equal(pile(both).length, 1); assert.equal(consumedHand(both), 4);
});

test("全部外れたら非消費: 3秒のビームも矢も何にも当たらなければ消費もCooldownもなし。重複発動の防止: 矢の連射中・ビームの間は別スロットの同じカードも発動できず、ビームが終われば撃てる", () => {
    const w = lv3();
    parkOthers(w, []); aimDegree(w, 90, 3);
    const hand = handIds(w);
    fire(w);
    runTo(w, 30);
    let r = deckApi(w).requestUseCard(1); assert.equal(r.ok, false); assert.notEqual(r.reason, "pending", "連射中は拒否");
    runTo(w, 100); // 矢の連射は終わった。ビームの途中
    assert.ok(plain(api(w).getSequences())[0].slot >= 7 && beamOf(w).active, "矢は放ち終え、ビームが出ている");
    r = deckApi(w).requestUseCard(2); assert.equal(r.ok, false); assert.notEqual(r.reason, "pending", "ビームの間も拒否: " + JSON.stringify(plain(r)));
    settle(w, 600);
    assert.equal(lastResult(w).reason, "missed"); assert.equal(lastResult(w).consumed, false);
    assert.deepEqual(handIds(w), hand); assert.equal(pile(w).length, 0);
    assert.equal(beamSegmentEvents(w).length, 0); assert.equal(arrowEvents(w).length, 0); assert.equal(api(w).getTempObjectCount().total, 0);
    assert.equal(fire(w).reason, "pending", "終われば撃てる");
    // 確定後のビームの間も拒否
    const w2 = lv3();
    parkOthers(w2, [3]); placePolar(w2, 3, 10, 90); aimDegree(w2, 90, 3); fire(w2); runTo(w2, 100);
    assert.equal(plain(api(w2).getSequences())[0].committed, true);
    const during = deckApi(w2).requestUseCard(2);
    assert.equal(during.ok, false); assert.notEqual(during.reason, "pending");
    assert.equal(consumedHand(w2), 4);
});

test("外からの取消(ビームの途中): 確定前=非消費で全部消える。確定後=消費は戻らず、ビーム・矢・VFX・Apollo・錨を安全に片付け、cancelledで記録。戦闘終了・マップ移動・ロード・戦闘不能・対象の消滅", () => {
    const check = (w, label) => {
        assert.equal(arrowEvents(w).length, 0, label); assert.equal(beamSegmentEvents(w).length, 0, label);
        assert.equal(api(w).getSequences().length, 0, label); assert.equal(api(w).getTempObjectCount().total, 0, label);
        assert.equal(plain(api(w).getActiveVfxJobs()).length, 0, label); assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, label);
    };
    // 確定前(的がない)
    const pre = lv3();
    parkOthers(pre, []); aimDegree(pre, 90, 3); fire(pre); runTo(pre, 70);
    assert.ok(beamSegmentEvents(pre).length > 0, "ビームが出ている");
    deckApi(pre).endCardBattle();
    check(pre, "確定前の戦闘終了");
    let r = lastResult(pre); assert.deepEqual([r.consumed, r.committed, r.reason], [false, false, "battleEnd"]);
    // 確定後
    const post = lv3();
    parkOthers(post, [3]); placePolar(post, 3, 10, 90); aimDegree(post, 90, 3); fire(post); runTo(post, 70);
    assert.ok(beamSegmentEvents(post).length > 0 && plain(api(post).getSequences())[0].committed);
    deckApi(post).endCardBattle();
    check(post, "確定後の戦闘終了");
    r = lastResult(post); assert.deepEqual([r.cancelled, r.completed, r.consumed, r.committed, r.reason], [true, false, true, true, "battleEnd"]);
    assert.ok(r.beam.ticks < 30 && r.beam.ticks > 0 && r.beam.active === false, "ビームは途中で止まった: " + r.beam.ticks);
    // マップ移動・ロード・戦闘不能
    for (const kind of ["setup", "load", "dead"]) {
        const w = lv3();
        parkOthers(w, [3]); placePolar(w, 3, 10, 90); aimDegree(w, 90, 3); fire(w); runTo(w, 70);
        if (kind === "setup") w.ctx.$gameMap.setup(4);
        else if (kind === "load") w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents());
        else { w.ctx.ProjectR.PlayerDeath.isDead = () => true; frames(w, 2); }
        assert.equal(api(w).getSequences().length, 0, kind); assert.equal(api(w).getTempObjectCount().total, 0, kind);
        if (kind !== "load") { assert.equal(beamSegmentEvents(w).length, 0, kind); assert.equal(arrowEvents(w).length, 0, kind); }
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, kind);
    }
    // 対象の消滅: ビームの途中で敵が消えても例外なく続き、消えた敵へは以後tickが入らない
    const gone = lv3();
    parkOthers(gone, [3, 4]); placePolar(gone, 3, 6, 90); placePolar(gone, 4, 9, 90); aimDegree(gone, 90, 3);
    fire(gone); runTo(gone, 60);
    const tBefore = beamOf(gone).perTarget.e3.ticks;
    gone.ctx.$gameMap.event(3).erase();
    settle(gone, 600);
    const beam = lastResult(gone).beam;
    assert.equal(beam.perTarget.e3.ticks, tBefore, "消えた敵にはtickが入らない");
    assert.equal(beam.perTarget.e4.ticks, 30, "後ろの敵は最後まで");
    assert.equal(lastResult(gone).completed, true);
    assert.equal(beamSegmentEvents(gone).length, 0);
    // 敵が倒れた場合も同様(HPを0にする)
    const dead = lv3();
    parkOthers(dead, [3]); placePolar(dead, 3, 6, 90); aimDegree(dead, 90, 3); fire(dead); runTo(dead, 60);
    const bar = dead.ctx.SceneManager._scene._spriteset._eventHpBars.find(b => b._event === dead.ctx.$gameMap.event(3));
    dead.ctx.$gameMap.event(3).erase();
    settle(dead, 600);
    assert.equal(lastResult(dead).completed, true);
});

test("演出と上限: カットイン・ArmExtend・Apolloは1回。弓・閃光・音は発射の時刻2回に1回(4回)。ビームの始まりの音は1回。区間Event・矢Event・VFXに上限があり、終われば全部0。ビームの長さは24マスが上限", () => {
    const w = lv3();
    const cutIns = [], arm = [], swings = [];
    const show = w.ctx.ProjectRCutIn.show; w.ctx.ProjectRCutIn.show = function(o) { cutIns.push(o); return show.apply(this, arguments); };
    const request = w.ctx.ProjectRCharacterPresentation.request; w.ctx.ProjectRCharacterPresentation.request = function(name) { arm.push(name); return request.apply(this, arguments); };
    const swing = w.ctx.ProjectRGodSummonVisual.swingWeapon; w.ctx.ProjectRGodSummonVisual.swingWeapon = function() { swings.push(1); return swing.apply(this, arguments); };
    const spy = spySe(w);
    parkOthers(w, [3, 4, 5]); placePolar(w, 3, 6, 90); placePolar(w, 4, 8, 90); placePolar(w, 5, 5, 10);
    aimDegree(w, 90, 3); fire(w);
    const max = { arrows: 0, events: 0, glows: 0, segments: 0, beamGlow: 0, short: 0, total: 0 };
    for (let i = 0; i < 260; i++) { frames(w, 1); const t = plain(api(w).getTempObjectCount()); for (const k of Object.keys(max)) max[k] = Math.max(max[k], t[k]); }
    spy.restore();
    assert.equal(cutIns.length, 1); assert.equal(arm.filter(n => n === "ArmExtend").length, 1);
    assert.equal(swings.length, 4, "弓の動作は発射の時刻 0,2,4,6 の4回");
    assert.equal(spy.se.filter(n => n === "Bell1").length, 1, "ビームの始まりの音は1回");
    assert.ok(spy.se.filter(n => n === "Chime2").length <= 4);
    assert.ok(spy.se.filter(n => n === "Chime1").length <= 14 + 12, "命中の音は矢の命中数+ビームの間引き(15更新に1回=12回)以内: " + spy.se.length);
    assert.ok(max.events <= 14 && max.segments <= api(w).segmentBudget() && max.glows <= 6 && max.short <= 6 && max.beamGlow <= 1, JSON.stringify(max));
    assert.ok(max.total <= 14 + api(w).segmentBudget() + 6 + 1 + 6, JSON.stringify(max));
    assert.equal(plain(api(w).getTempObjectCount()).total, 0); assert.equal(beamSegmentEvents(w).length, 0);
    // ビームの長さの上限
    const big = lv3({ balance: b => b.ctx.ProjectRCardBalance.setOverride(EROS, 3, "bowBeamRangeTiles", 100) });
    parkOthers(big, []); aimDegree(big, 90, 3); fire(big); frames(big, 3);
    assert.ok(beamOf(big).length > 24 && beamOf(big).length <= 100 + 1e-9, "有限の射程100でも、長さはマップの端までで止まる(24マスの上限は無い): " + beamOf(big).length);
    assert.ok(beamSegmentEvents(big).length <= api(big).segmentBudget(), "区間Eventは画面に映る範囲の予算以内(見えない当たりも、無限のEventも作らない)");
    const g = api(w).geometry3;
    assert.equal(g.edgeDistance({ x: w.ctx.$gameMap.width() - 3, y: 10 }, 90), 3, "マップの端でビームは短くなる");
    assert.equal(g.convexOverlap([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }], [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 2, y: 1 }]), false, "接するだけは重ならない");
    assert.equal(g.convexOverlap([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 0, y: 1 }], [{ x: 1.5, y: 0.5 }, { x: 3, y: 0.5 }, { x: 3, y: 1.5 }, { x: 1.5, y: 1.5 }]), true);
});

test("性能(参考値。実機は apollo_a6c_verify): 複数の敵・味方がビームに入るLv3の1frameの処理時間がLv2・待機と同程度(桁が変わらない)", () => {
    const measure = (w, n) => { const t0 = process.hrtime.bigint(); for (let i = 0; i < n; i++) w.frames(1); return Number(process.hrtime.bigint() - t0) / 1e6 / n; };
    const setup = lv => {
        const w = erosWorld({ level: lv }); const c = center(w);
        parkOthers(w, [3, 4, 5]); placePolar(w, 3, 5, 90); placePolar(w, 4, 7, 90); placePolar(w, 5, 9, 90);
        addAlly(w, { actorId: 2, eventId: 6, cx: c.x + 6, cy: c.y + 0.2, maxHp: 99999, hp: 100 });
        aimDegree(w, 90, 3); return w;
    };
    const idle = setup(3); const idleMs = measure(idle, 90);
    const two = setup(2); fire(two); const lv2Ms = measure(two, 90);
    const three = setup(3); fire(three); const lv3Ms = measure(three, 90);
    console.log(`  frame平均: 待機 ${idleMs.toFixed(2)}ms / Lv2(21本) ${lv2Ms.toFixed(2)}ms / Lv3(14本+ビーム・敵3体+味方1人) ${lv3Ms.toFixed(2)}ms (Nodeの実エンジン・描画なし)`);
    assert.ok(lv3Ms < 40, "Lv3の連射中の1frameが40ms未満: " + lv3Ms);
    assert.ok(lv3Ms - idleMs < 25, "待機との差が25ms未満: " + (lv3Ms - idleMs));
});

test("退行なし: Lv1は10本・Lv2は21本(ビームなし)・追尾3。黄金の矢のダメージ設定は不変", () => {
    const w1 = erosWorld(); parkOthers(w1, []); aimDegree(w1, 90, 3); fire(w1); frames(w1, 70);
    assert.equal(emissions(w1).length, 10); assert.equal(api(w1).getBeam(), null);
    const w2 = erosWorld({ level: 2 }); parkOthers(w2, []); aimDegree(w2, 90, 3); fire(w2); frames(w2, 70);
    assert.equal(emissions(w2).length, 21); assert.equal(api(w2).getBeam(), null); assert.equal(beamSegmentEvents(w2).length, 0);
    assert.equal(balanceOf(w1).effects("apollo_golden_volley", 3).projectileCount, 11);
    assert.equal(balanceOf(w1).constant("apollo_golden_volley", "beamWidthTiles"), 3, "黄金の矢のビームの幅3は変わらない(Lv3エロスの0.9は別カードの設定)");
    assert.equal(balanceOf(w1).constant("apollo_golden_volley", "beamHitDamage"), 50);
});
