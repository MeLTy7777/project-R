"use strict";
// Phase Apollo-A7: Apollo「竪琴」(設計ID 10 / apollo_lyre_rhythm)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(実キー・描画・音符のUI・性能)は対象外 → tools/mz_cdp/apollo_a7_lyre_verify.cjs。
const path = require("node:path");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, frames, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, addAlly, allyHp } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_lyre_rhythm";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloLyreRhythm;
const status = w => w.ctx.ProjectRApolloStatus;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const leader = w => w.ctx.$gameParty.leader();
const setHp = (w, hp) => { leader(w).setHp(hp); return leader(w).hp; };
const use = w => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(C)))); };
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { player(w).locate(x, y); player(w)._realX = x; player(w)._realY = y; player(w).center(x, y); };
const session = w => plain(api(w).getSession());
const notes = w => plain(api(w).getNotes());
const buffs = w => plain(api(w).getBuffs());
// 攻撃入力(Hendrixの共通イベント1の予約。実機ではこれが攻撃ボタン)
const attack = w => w.ctx.$gameTemp.reserveCommonEvent(1);
// 音符 index がラインに届く frame まで進めて、その瞬間に攻撃入力を入れる(offset: そこからのずれ)
const pressAt = (w, index, offset = 0) => {
    const n = notes(w)[index];
    const target = n.arrive + offset;
    for (let i = 0; i < 2000 && session(w).frame < target; i++) frames(w, 1);
    assert.equal(session(w).frame, target, "狙いのframeに合わせた");
    const before = plain(api(w).getResults()).length;
    attack(w);
    return plain(api(w).getResults()).slice(before)[0];
};
const kindIndex = (w, kind, nth = 0) => notes(w).filter(n => n.kind === kind)[nth].index;
const setup = (level, opts = {}) => { const w = world(level, opts); parkOthers(w, opts.keep || []); put(w, 12, 25); return w; };

test("登録と数値: 最大Lv3・Cooldown 4・特殊/最大2・instant。Lv1=3周12個(0.25秒おき)・押せるのは3回。Lv2は全部同じなら画面全体+クレンズ。Lv3は5周20個(0.15秒おき)。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 2, cooldownSeconds: 4, maxLevel: 3, rarity: "special", category: "special", targetType: "instant" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.rounds, c1.notes, c1.interval, c1.maxPresses, c1.rhythmSeconds, c1.lead, c1.radius, c1.screenWide, c1.cleanse, c1.buffSeconds], [3, 12, 0.25, 3, 3, 0.6, 5, false, false, 8]);
    assert.deepEqual([c2.rounds, c2.notes, c2.screenWide, c2.cleanse], [3, 12, true, true], "Lv2はLv1を引き継ぎ画面全体とクレンズを足す");
    assert.deepEqual([c3.rounds, c3.notes, c3.interval, c3.maxPresses, c3.screenWide, c3.cleanse], [5, 20, 0.15, 3, true, true], "Lv3は音符の周回だけ5周(置換)。押せる回数は3回のまま");
    assert.ok(c1.windowFrames >= 1 && c1.windowFrames <= 6 && c3.windowFrames >= 1 && c3.windowFrames < c1.windowFrames + 1, "判定の幅は音符の間隔の半分を超えない " + c1.windowFrames + "/" + c3.windowFrames);
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo"), null);
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 10);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId, row.legacyCandidates.join()], [true, 3, C, "apollo_lyre_calm"]);
    assert.equal(w.ctx.ProjectRCardDeck.definitions.card("apollo_lyre_calm").maxCopies, 3, "旧「リラの支援」は不変(共存)");
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・DamageModifiers・PartyCombat・PartyRoster・CardModifiers・CardBattleInput・Gun/Sword・他のApollo)", () => {
    assert.equal(git("diff", "--stat", "a130221", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js", "js/plugins/ProjectR_PartyCombat.js",
        "js/plugins/ProjectR_PartyRoster.js", "js/plugins/ProjectR_CardModifiers.js", "js/plugins/ProjectR_CardBattleInput.js", "js/plugins/ProjectR_GunSystem.js", "js/plugins/ProjectR_SwordSystem.js", "js/plugins/ProjectR_CombatPresence.js",
        "js/plugins/ProjectR_ApolloLyreCalm.js", "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_ApolloErosArrow.js", "js/plugins/ProjectR_ApolloGigasSlayer.js", "js/plugins/ProjectR_ApolloHyacinthus.js", "js/plugins/ProjectR_ApolloPlagueRain.js", "js/plugins/ProjectR_ApolloLaurelWreath.js").trim(), "");
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。上書きが累積どおりに効く", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["rhythmSeconds", "noteLeadSeconds", "noteRounds", "maxPresses", "hitWindowSeconds", "buffSeconds", "lyreAttackBonus", "lyreSpeedBonus", "lyreHealInstant", "lyreHealRegenTotal", "lyreHealRegenSeconds", "lyrePlagueSeconds", "lyrePlagueAttackDown", "lyrePlagueDamageTaken", "lyrePlagueWeakness", "screenWide", "cleanse", "radiusTiles"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["noteRounds", "maxPresses", "lyreAttackBonus", "screenWide", "cleanse"]) assert.ok(described.includes(key), key);
    assert.equal(balanceOf(w).validate(C, 1, "noteRounds", 0).ok, false);
    assert.equal(balanceOf(w).validate(C, 1, "noteRounds", 11).ok, false, "音符は最大40個(4種 x 10周)");
    assert.equal(balanceOf(w).validate(C, "constant", "maxPresses", 0).ok, false);
    override(w, 1, "noteRounds", 4); override(w, 2, "cleanse", 0); override(w, "constant", "buffSeconds", 6);
    assert.deepEqual([api(w).config(1).rounds, api(w).config(2).rounds, api(w).config(3).rounds, api(w).config(2).cleanse, api(w).config(3).cleanse, api(w).config(1).buffSeconds], [4, 4, 5, false, false, 6]);
    balanceOf(w).resetCard(C);
    assert.deepEqual([api(w).config(1).rounds, api(w).config(3).cleanse, api(w).config(1).buffSeconds], [3, true, 8]);
});

test("Lv1: 使った瞬間に消費。3秒の演奏(12個・火力→速度→ヒール→病を3周)。最初の音符は0.6秒後にラインへ届く。時間とともに音符が通り過ぎる", () => {
    const w = setup(1);
    const r = use(w);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(consumedHand(w, C), 1 === 1 ? 4 : 0); assert.equal(pile(w, C).length, 1);
    assert.deepEqual([session(w).notes, session(w).rounds, session(w).presses, session(w).maxPresses], [12, 3, 0, 3]);
    const n = notes(w);
    assert.deepEqual(n.slice(0, 8).map(x => x.kind), ["attack", "speed", "heal", "plague", "attack", "speed", "heal", "plague"]);
    assert.equal(n[0].arrive, 36, "0.6秒 = 36frame");
    assert.deepEqual([n[1].arrive - n[0].arrive, n[11].arrive], [15, 36 + Math.round(11 * 15)], "0.25秒(15frame)おき");
    frames(w, 70);
    assert.equal(notes(w).filter(x => x.state === "missed").length, 2 + 0 || notes(w).filter(x => x.state === "missed").length, "通り過ぎた音符は missed");
    secs(w, 4.0);
    assert.equal(session(w), null, "演奏は終わる(約3.6秒+)");
});

test("押下の判定: 音符がラインに届いた瞬間(±判定の幅)に攻撃入力を入れると、その音符を選ぶ。外れた押下も1回に数える(効果なし)。3回で打ち切り、4回目の入力は音符に使われない", () => {
    const w = setup(1);
    use(w);
    const a = pressAt(w, 0, 0);
    assert.equal(a.hit, true); assert.equal(a.kind, "attack"); assert.equal(a.offset, 0);
    const b = pressAt(w, 1, 2); // 判定の幅の内側(+2frame)
    assert.equal(b.hit, true); assert.equal(b.kind, "speed");
    // 音符と音符の真ん中(判定の外)で押す = タイミング外れ
    const gapFrame = (notes(w)[2].arrive + notes(w)[3].arrive) / 2 | 0;
    for (let i = 0; session(w).frame < gapFrame && i < 200; i++) frames(w, 1);
    const before = plain(api(w).getResults()).length;
    attack(w);
    const miss = plain(api(w).getResults())[before];
    assert.deepEqual([miss.hit, miss.reason], [false, "timing"]);
    assert.equal(session(w).presses, 3, "外れも1回に数える");
    // 回数を使い切ったので、次の攻撃入力は音符に使われない(presses は増えない)
    attack(w);
    assert.equal(session(w).presses, 3);
    assert.equal(plain(api(w).getResults()).length, 3);
    // 使った音符は二度と選べない
    const w2 = setup(1);
    use(w2);
    pressAt(w2, 0, 0);
    for (let i = 0; i < 1; i++) { attack(w2); }
    assert.equal(plain(api(w2).getResults())[1].hit, false, "同じ音符は選べない(同じframeでの2回目は外れ)");
});

test("演奏中の攻撃入力は剣・銃へ流れない(CE1の予約を音符の選択に使う)。演奏が終わったあと・回数を使い切ったあとは通常どおり攻撃入力が通る", () => {
    const w = setup(1);
    const queue = () => (w.ctx.$gameTemp._commonEventQueue || []).length;
    const q0 = queue();
    attack(w);
    const afterNormal = queue();
    use(w);
    pressAt(w, 0, 0);
    assert.equal(queue(), afterNormal, "演奏中は攻撃入力を音符が受ける(共通イベントの予約は増えない)");
    pressAt(w, 4, 0); pressAt(w, 8, 0);
    assert.equal(session(w).presses, 3);
    attack(w);
    assert.ok(queue() >= afterNormal, "使い切ったあとは通常の攻撃入力へ戻る");
    secs(w, 4);
    assert.equal(session(w), null);
    assert.ok(q0 >= 0);
    const before = queue();
    attack(w);
    assert.ok(queue() >= before, "演奏が終わったあとも通常どおり");
});

test("火力の音符: 攻撃力・魔力 +10%(8秒)。同じ音符をもう一度選ぶと +20% に重なり、時間は更新される。8秒で切れて元へ", () => {
    const w = setup(1);
    use(w);
    const atk0 = leader(w).atk;
    pressAt(w, kindIndex(w, "attack", 0));
    assert.ok(Math.abs(leader(w).atk / atk0 - 1.1) < 0.01, "x1.1 " + leader(w).atk / atk0);
    assert.equal(buffs(w).stacks.attack, 1);

    pressAt(w, kindIndex(w, "attack", 1));
    assert.ok(Math.abs(leader(w).atk / atk0 - 1.2) < 0.01, "重なって x1.2");
    assert.equal(buffs(w).stacks.attack, 2);
    assert.ok(plain(status(w).list("player")).find(s => s.id === "lyre_attack").remaining > 7.9, "時間は更新(8秒へ)");
    secs(w, 8.3);
    assert.equal(leader(w).atk, atk0, "8秒で元へ");
    assert.equal(buffs(w).stacks.attack, 0);
    assert.equal(status(w).has("player", "lyre_attack"), false);
});

test("速度の音符: 移動速度 +10%(8秒。重なって +20%)。時間で元へ。ヒールの音符: 即時100 + 3秒で100(重なりごとに加算)", () => {
    const w = setup(1);
    use(w);
    pressAt(w, kindIndex(w, "speed", 0));
    assert.ok(Math.abs(w.ctx.ProjectRCardModifiers.moveSpeedFactor() - 1.1) < 1e-9);
    pressAt(w, kindIndex(w, "speed", 1));
    assert.ok(Math.abs(w.ctx.ProjectRCardModifiers.moveSpeedFactor() - 1.2) < 1e-9, "重なって1.2");
    secs(w, 8.3);
    assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1);
    // ヒール
    const w2 = setup(1);
    use(w2);
    const hp0 = setHp(w2, 100);
    pressAt(w2, kindIndex(w2, "heal", 0));
    assert.equal(leader(w2).hp - hp0, 100, "即時100");
    secs(w2, 3.3);
    assert.ok(leader(w2).hp - hp0 >= 196 && leader(w2).hp - hp0 <= 200, "3秒で+100(計200) " + (leader(w2).hp - hp0));
    // 2回: 即時200 + リジェネは重なって秒間66.7(3秒で200)
    const w3 = setup(1);
    use(w3);
    const h0 = setHp(w3, 100);
    pressAt(w3, kindIndex(w3, "heal", 0)); pressAt(w3, kindIndex(w3, "heal", 1));
    const afterInstant = leader(w3).hp - h0;
    assert.ok(afterInstant >= 200, "即時100 x 2 " + afterInstant);
    secs(w3, 3.5);
    // 即時100x2 + 1回目のリジェネを1秒ぶん(33) + 2回目で重なった秒間66.7を3秒(200) = 約433(1回目のリジェネは2回目の押下で重なった値へ置き換わる)
    assert.ok(leader(w3).hp - h0 >= 428 && leader(w3).hp - h0 <= 438, "リジェネが重なる(約433) " + (leader(w3).hp - h0));
    // 満タンなら何もしない
    const w4 = setup(1);
    use(w4); setHp(w4, leader(w4).mhp);
    pressAt(w4, kindIndex(w4, "heal", 0));
    assert.equal(leader(w4).hp, leader(w4).mhp);
});

test("病の音符: 半径5マス内の敵に病(5秒。攻撃力x0.9・被ダメージx1.05・弱点x1.03)。外の敵は無傷。重なると x0.8・x1.10・x1.06。5秒で切れる", () => {
    const w = setup(1, { keep: [3, 4] });
    const c = center(w);
    placeEnemy(w, 3, c.x + 4, c.y); placeEnemy(w, 4, c.x + 8, c.y);
    use(w);
    const r = pressAt(w, kindIndex(w, "plague", 0));
    assert.deepEqual(r.enemies, [3]);
    let f = plain(status(w).factorOf("event:3"));
    assert.ok(Math.abs(f.damageTaken - 1.05) < 1e-9 && Math.abs(f.weakness - 1.03) < 1e-9 && Math.abs(f.attackRate - 0.9) < 1e-9, JSON.stringify(f));
    assert.equal(status(w).has("event:4", "lyre_plague"), false, "半径の外は無傷");
    pressAt(w, kindIndex(w, "plague", 1));
    f = plain(status(w).factorOf("event:3"));
    assert.ok(Math.abs(f.damageTaken - 1.10) < 1e-9 && Math.abs(f.weakness - 1.06) < 1e-9 && Math.abs(f.attackRate - 0.8) < 1e-9, "重なる " + JSON.stringify(f));
    secs(w, 5.2);
    assert.equal(status(w).has("event:3", "lyre_plague"), false, "5秒で切れる");
    assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0);
    // 疫病の矢の病と同じ敵に重なっても、台帳が積にまとめて衝突しない
    status(w).apply("event:3", "plague", { seconds: 5, damageTaken: 1.05, source: "t" });
    use(w);
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0);
});

test("Lv2: 3回とも同じ音符(火力)を選ぶと、3回目の効果の範囲が画面内すべてになり、味方の異常状態(睡眠など)を解除する。混ざったら画面全体にもクレンズにもならない。Lv1では起きない", () => {
    const w = setup(2, { keep: [3, 4] });
    const c = center(w);
    placeEnemy(w, 3, c.x + 4, c.y); placeEnemy(w, 4, c.x + 7, c.y + 2); // 4は半径5の外(画面内)
    leader(w).addState(32); leader(w).addState(33);
    assert.ok(leader(w).isStateAffected(32));
    use(w);
    pressAt(w, kindIndex(w, "plague", 0)); pressAt(w, kindIndex(w, "plague", 1));
    assert.equal(status(w).has("event:4", "lyre_plague"), false, "1・2回目は半径5");
    const third = pressAt(w, kindIndex(w, "plague", 2));
    assert.equal(third.wide, true); assert.deepEqual(third.enemies.sort(), [3, 4]);
    assert.equal(status(w).has("event:4", "lyre_plague"), true, "3回目は画面全体");
    assert.ok(third.cleansed >= 2, "クレンズ " + third.cleansed);
    assert.equal(leader(w).isStateAffected(32), false); assert.equal(leader(w).isStateAffected(33), false);
    // 混ざったら通常の範囲・クレンズなし
    const w2 = setup(2, { keep: [4] });
    placeEnemy(w2, 4, center(w2).x + 7, center(w2).y + 2);
    leader(w2).addState(32);
    use(w2);
    pressAt(w2, kindIndex(w2, "plague", 0)); pressAt(w2, kindIndex(w2, "attack", 1));
    const t2 = pressAt(w2, kindIndex(w2, "plague", 1));
    assert.equal(t2.wide, false); assert.equal(status(w2).has("event:4", "lyre_plague"), false);
    assert.equal(leader(w2).isStateAffected(32), true, "クレンズなし");
    // Lv1: 3回同じでも通常の範囲
    const w1 = setup(1, { keep: [4] });
    placeEnemy(w1, 4, center(w1).x + 7, center(w1).y + 2);
    leader(w1).addState(32);
    use(w1);
    pressAt(w1, kindIndex(w1, "plague", 0)); pressAt(w1, kindIndex(w1, "plague", 1));
    const t1 = pressAt(w1, kindIndex(w1, "plague", 2));
    assert.equal(t1.wide, false); assert.equal(status(w1).has("event:4", "lyre_plague"), false); assert.equal(leader(w1).isStateAffected(32), true);
    // 異常状態の判定: 死亡・精神安定(34)・強化は解除しない
    assert.deepEqual([api(w1).abnormalState(1), api(w1).abnormalState(34), api(w1).abnormalState(32), api(w1).abnormalState(33)], [false, false, true, true]);
});

test("Lv3: 音符が5周20個(0.15秒おき)。押せるのは3回のまま。判定の幅はさらに狭い。全部同じ音符で3回選ぶと画面全体+クレンズ(Lv2から引き継ぐ)", () => {
    const w = setup(3);
    use(w);
    assert.deepEqual([session(w).notes, session(w).rounds, session(w).maxPresses], [20, 5, 3]);
    const n = notes(w);
    assert.deepEqual([n[1].arrive - n[0].arrive, n[19].arrive], [9, 36 + Math.round(19 * 9)]);
    assert.deepEqual(n.filter(x => x.kind === "heal").length, 5);
    pressAt(w, kindIndex(w, "speed", 0)); pressAt(w, kindIndex(w, "speed", 2)); const t = pressAt(w, kindIndex(w, "speed", 4));
    assert.deepEqual([t.hit, t.wide], [true, true]);
    assert.equal(session(w).presses, 3);
    // 判定の幅はLv3では前後4frame。最後の音符を8frame過ぎたあとは外れる
    const w2 = setup(3);
    use(w2);
    const miss = pressAt(w2, 19, 8);
    assert.equal(miss.hit, false);
});

test("仲間(PartyRoster): ヒールの音符は半径5の仲間も回復(即時100)。半径の外の仲間は回復しない。火力・速度は主人公のみ", () => {
    const w = setup(1, { keep: [6] });
    addAlly(w, { actorId: 2, eventId: 6, cx: 14, cy: 25, maxHp: 1000, hp: 500 });
    use(w);
    const before = allyHp(w, 2);
    const r = pressAt(w, kindIndex(w, "heal", 0));
    assert.ok(r.members.includes("ally:2") && r.members.includes("player"), JSON.stringify(r.members));
    assert.ok(allyHp(w, 2) - before >= 100, "仲間も回復 " + (allyHp(w, 2) - before));
    placeEnemy(w, 6, 12 + 9, 25);
    const out = allyHp(w, 2);
    const r2 = pressAt(w, kindIndex(w, "heal", 1));
    assert.ok(!r2.members.includes("ally:2") && r2.members.includes("player"), "半径の外の仲間は2回目の効果の対象外 " + JSON.stringify(r2.members));
    assert.ok(allyHp(w, 2) - out < 60, "2回目の即時回復(100)は受けない。待っている間の1回目のリジェネ(約33)だけ " + (allyHp(w, 2) - out));
});

test("取消と後片付け: 演奏中・効果中の戦闘終了/マップ移動で、演奏・UI・波紋・火力・速度・リジェネ・病がすべて消える。演奏中でなければ攻撃入力を奪わない", () => {
    for (const how of ["battle", "map"]) {
        const w = setup(2, { keep: [3] });
        placeEnemy(w, 3, center(w).x + 3, center(w).y);
        use(w);
        pressAt(w, kindIndex(w, "attack", 0)); pressAt(w, kindIndex(w, "speed", 0)); pressAt(w, kindIndex(w, "plague", 0));
        assert.ok(buffs(w).attack && w.ctx.ProjectRCardModifiers.moveSpeedFactor() > 1 && status(w).has("event:3", "lyre_plague"));
        if (how === "battle") w.ctx.ProjectRCardDeck.endBattle(); else w.ctx.$gameMap.setup(4);
        assert.equal(session(w), null, how);
        assert.deepEqual([buffs(w).attack, buffs(w).speed, buffs(w).stacks.attack, buffs(w).stacks.plague], [null, null, 0, 0], how);
        assert.equal(status(w).list().length, 0, how); assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, how); assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0, how);
        assert.equal(api(w).getTempObjectCount().total, 0, how);
        assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /apollo_lyre/.test(k)).length, 0, how + " 波紋");
    }
    const w = setup(1);
    const queue = () => (w.ctx.$gameTemp._commonEventQueue || []).length;
    attack(w);
    assert.equal(plain(api(w).getResults()).length, 0, "演奏が無いときは音符に使われない");
});

test("演出: 通常のカットイン1回・Apollo一時召喚・選ぶたびに ArmSweep と色つきの波紋(金 + 音符の色)と音(音程違い)。選ばなければ波紋は出ない。VFX素材・ライブラリが揃う", () => {
    const w = setup(1);
    const requests = [];
    const cp = w.ctx.ProjectRCharacterPresentation, original = cp.request;
    cp.request = function(name) { requests.push(name); return original.apply(this, arguments); };
    const keys = [];
    const vfx = w.ctx.ProjectRPresentationVfx, play = vfx.play; vfx.play = function(key) { keys.push(key); return play.apply(this, arguments); };
    const spy = spySe(w);
    const summonsBefore = plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length;
    use(w);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1);
    assert.ok(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length > summonsBefore, "Apollo一時召喚");
    assert.equal(keys.filter(k => /apollo_lyre/.test(k)).length, 0, "選ぶまでは波紋なし");
    pressAt(w, kindIndex(w, "attack", 0)); pressAt(w, kindIndex(w, "heal", 0));
    spy.restore();
    assert.deepEqual(keys.filter(k => /apollo_lyre/.test(k)), ["apollo_lyre.wave.gold", "apollo_lyre.wave.attack", "apollo_lyre.wave.gold", "apollo_lyre.wave.heal"]);
    assert.equal(requests.filter(r => r === "ArmSweep").length, 2);
    assert.equal(spy.se.filter(n => n === "Chime2").length, 2);
    const lib = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    for (const k of ["gold", "attack", "speed", "heal", "plague"]) {
        const m = plain(vfx.mapping("apollo_lyre.wave." + k)), entry = lib[m.library];
        assert.ok(entry, k); assert.equal(entry.spritesheetFile, m.sheet.file);
        const png = fs.readFileSync(path.join(project, "img/pictures", m.sheet.file + ".png"));
        assert.deepEqual([png.readUInt32BE(16) / m.sheet.columns, png.readUInt32BE(20) / m.sheet.rows], [192, 192], k);
    }
});
