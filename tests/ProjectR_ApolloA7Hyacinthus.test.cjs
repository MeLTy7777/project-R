"use strict";
// Phase Apollo-A7: Apollo「ヒュアキントス」(設計ID 12 / apollo_hyacinthus)Lv1〜3。実エンジン(実Map004 + 全plugin + 実Hendrix/DotMove)。
// MZ実機(実キー・描画・性能)は対象外 → tools/mz_cdp/apollo_a7_hyacinthus_verify.cjs。
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const fx = require("./ProjectR_ApolloA7Fixture.cjs");
const { assert, plain, cardWorld, handIds, state, frames, fireCard, consumedHand, pile, spySe, center, placeEnemy, parkOthers, player, deckApi, addAlly, allyHp } = fx;
const project = path.join(__dirname, "..");
const C = "apollo_hyacinthus";

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const git = (...args) => execFileSync("git", args, { cwd: project, encoding: "utf8" });
const world = (level, opts = {}) => cardWorld(C, { level, ...opts });
const api = w => w.ctx.ProjectRApolloHyacinthus;
const status = w => w.ctx.ProjectRApolloStatus;
const balanceOf = w => w.ctx.ProjectRCardBalance;
const override = (w, scope, key, value) => { const r = balanceOf(w).setOverride(C, scope, key, value); assert.equal(r.ok, true, key + " " + JSON.stringify(r)); };
const leader = w => w.ctx.$gameParty.leader();
const setHp = (w, hp) => { const a = leader(w); a.setHp(hp); return a.hp; };
// 敵などからの被ダメージ(公式の経路。DamageModifiersが1回だけ倍率を掛ける)
const hurt = (w, amount) => w.ctx.PluginManager.callCommand(Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 }), "Hendrix_Action_Engine", "UpdatePlayerHp", { target: "player", value: `-${amount}` });
const use = w => { player(w).center(player(w)._realX, player(w)._realY); return plain(deckApi(w).requestUseCard(Math.max(0, handIds(w).indexOf(C)))); };
const flowers = w => w.ctx.$gameMap.events().filter(e => e && e.event && /projectRHyacinth/.test(e.event().note || ""));
const blooms = w => plain(api(w).getBlooms());
const windows = w => plain(api(w).getWindows());
const lastResult = w => plain(api(w).getLastResult());
const secs = (w, s) => frames(w, Math.round(s * 60));
const put = (w, x, y) => { player(w).locate(x, y); player(w)._realX = x; player(w)._realY = y; player(w).center(x, y); };

test("登録と数値: 最大Lv3・Cooldown 7・特殊/最大3。Lv1=受付3秒・x0.1・秒間50・半径2。Lv2は仲間にも。Lv3は受付5秒+移動速度+80%。Apollo本番デッキは無効", () => {
    const w = world(3);
    assert.deepEqual(plain(w.ctx.ProjectRCardDeck.definitions.card(C)), { cardId: C, ringId: "apollo", maxCopies: 3, cooldownSeconds: 7, maxLevel: 3, rarity: "special", category: "special", targetType: "instant" });
    const c1 = plain(api(w).config(1)), c2 = plain(api(w).config(2)), c3 = plain(api(w).config(3));
    assert.deepEqual([c1.acceptSeconds, c1.guardTaken, c1.healPerSecond, c1.radius, c1.partyShare, c1.speedBonus, c1.bloomSeconds, c1.healTick, c1.healAmount], [3, 0.1, 50, 2, false, 0, 8, 0.5, 25]);
    assert.deepEqual([c2.acceptSeconds, c2.partyShare, c2.speedBonus, c2.guardTaken], [3, true, 0, 0.1], "Lv2はLv1を引き継ぎパーティーにも付与");
    assert.deepEqual([c3.acceptSeconds, c3.partyShare, c3.speedBonus, c3.guardTaken, c3.healPerSecond, c3.radius], [5, true, 0.8, 0.1, 50, 2], "Lv3は受付5秒(置換)と移動速度+80%。他は引き継ぐ");
    assert.equal(w.ctx.ProjectRCardCatalog.buildGodDeck("apollo") === null, require("./ProjectR_ApolloImplemented.cjs").STILL_RESERVED.length > 0);
    const row = w.ctx.ProjectRCardCatalog.godDesign("apollo").find(r => r.designId === 12);
    assert.deepEqual([row.implemented, row.implementedLevels, row.runtimeCardId], [true, 3, C]);
});

test("保護ファイルは変えていない(CardDeckCore・Hendrix・DotMove・DamageModifiers・PartyCombat・PartyRoster・CardModifiers・他のApollo)", () => {
    assert.equal(git("diff", "--stat", "e361797", "--", "js/plugins/ProjectR_CardDeckCore.js", "js/plugins/Hendrix_Action_Engine.js", "js/plugins/DotMoveSystem.js", "js/plugins/ProjectR_DamageModifiers.js",
        "js/plugins/ProjectR_PartyCombat.js", "js/plugins/ProjectR_PartyRoster.js", "js/plugins/ProjectR_CardModifiers.js", "js/plugins/ProjectR_ApolloGoldenVolley.js", "js/plugins/ProjectR_ApolloErosArrow.js",
        "js/plugins/ProjectR_ApolloGigasSlayer.js").trim(), ""); // ProjectR_ApolloStatus は追加だけで育てる共通の台帳なので、固定の対象に入れない
});

test("バランス/F6: 新しい項目が定義され、範囲外は拒否。上書きがレベルの累積どおりに効く", () => {
    const w = world(3);
    const fields = plain(balanceOf(w).fields());
    for (const key of ["acceptSeconds", "guardDamageTaken", "bloomSeconds", "bloomHealPerSecond", "bloomHealTickSeconds", "partyShare", "radiusTiles", "speedBonus"]) assert.ok(fields[key], key);
    const described = JSON.stringify(plain(balanceOf(w).describe(C)));
    for (const key of ["acceptSeconds", "guardDamageTaken", "bloomHealPerSecond", "partyShare", "speedBonus"]) assert.ok(described.includes(key), key + " がF6の表に出る");
    assert.equal(balanceOf(w).validate(C, 1, "guardDamageTaken", 1.5).ok, false);
    assert.equal(balanceOf(w).validate(C, 1, "acceptSeconds", 0).ok, false);
    assert.equal(balanceOf(w).validate(C, 1, "partyShare", 0.5).ok, false, "整数のみ");
    override(w, 1, "bloomHealPerSecond", 100); override(w, 3, "acceptSeconds", 4);
    assert.deepEqual([api(w).config(1).acceptSeconds, api(w).config(2).acceptSeconds, api(w).config(3).acceptSeconds, api(w).config(3).healPerSecond], [3, 3, 4, 100]);
    override(w, "constant", "radiusTiles", 3);
    assert.equal(api(w).config(2).radius, 3);
    balanceOf(w).resetCard(C);
    assert.deepEqual([api(w).config(3).acceptSeconds, api(w).config(1).healPerSecond, api(w).config(1).radius], [5, 50, 2], "リセットで既定へ");
});

test("Lv1: 使った瞬間にカードを消費(instant)。受付期間(3秒)が始まり、使用者の被ダメージが90%軽減(100→10)。被弾で半径2マスに花が咲く(花6個・錨1)", () => {
    const w = world(1);
    parkOthers(w, []);
    put(w, 12, 25);
    const hp = setHp(w, leader(w).mhp);
    const r = use(w);
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(consumedHand(w, C), 4); assert.equal(pile(w, C).length, 1);
    assert.equal(windows(w).length, 1); assert.equal(windows(w)[0].key, "player");
    assert.equal(status(w).has("player", "hyacinthus_guard"), true);
    assert.equal(plain(status(w).factorOf("player")).damageTaken, 0.1);
    assert.equal(blooms(w).length, 0, "被弾前は咲かない");
    frames(w, 30);
    hurt(w, 100);
    frames(w, 2);
    assert.equal(hp - leader(w).hp, 10, "100の被弾が90%軽減されて10");
    const b = blooms(w);
    assert.equal(b.length, 1); assert.equal(b[0].radius, 2); assert.equal(b[0].flowers, 6);
    assert.equal(flowers(w).length, 6);
    assert.ok(Math.abs(b[0].x - (12 + 0.5)) < 0.6 && Math.abs(b[0].y - (25 + 0.5)) < 0.6, "使用者の位置に咲く " + b[0].x + "," + b[0].y);
    assert.equal(api(w).getTempObjectCount().anchors, 1);
    assert.equal(lastResult(w).blooms, 1);
});

test("受付期間: 3秒で終わる(軽減が外れ、期間後の被弾は等倍・花は咲かない)。被弾しなければ花は咲かない(失敗)", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const full = setHp(w, leader(w).mhp);
    use(w);
    secs(w, 2.9);
    assert.equal(windows(w).length, 1, "2.9秒はまだ受付中");
    secs(w, 0.2);
    assert.equal(windows(w).length, 0, "3秒で終了");
    assert.equal(status(w).has("player", "hyacinthus_guard"), false);
    assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0);
    hurt(w, 100);
    frames(w, 2);
    assert.equal(full - leader(w).hp, 100, "受付後は等倍");
    assert.equal(blooms(w).length, 0, "被弾が受付期間の外なので咲かない");
    assert.equal(flowers(w).length, 0);
});

test("花は1つの受付期間につき1回だけ(最初の被弾)。2回目の被弾も軽減されるが、花は増えない", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const full = setHp(w, leader(w).mhp);
    use(w); frames(w, 10);
    hurt(w, 100); frames(w, 2);
    hurt(w, 100); frames(w, 2);
    assert.equal(full - leader(w).hp, 20, "2回とも10ずつ");
    assert.equal(blooms(w).length, 1); assert.equal(flowers(w).length, 6);
    assert.equal(windows(w)[0].damaged, 20);
});

test("花の回復: 半径2マス内の味方を秒間50(0.5秒ごと25)回復。半径の外・満タンの者は回復しない。8秒で消え、花のEvent・錨・VFXも片付く。咲いた後は受付期間が終わっても残る", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    leader(w).setHp(leader(w).mhp);
    use(w); frames(w, 5);
    hurt(w, 100); frames(w, 2);
    const hp0 = setHp(w, 50);
    secs(w, 1.0);
    const healed1 = leader(w).hp - hp0;
    assert.ok(healed1 >= 48 && healed1 <= 52, "約1秒で約50 " + healed1);
    // 半径の外へ出ると回復しない
    put(w, 12 + 3, 25);
    const hp1 = leader(w).hp;
    secs(w, 1.0);
    assert.equal(leader(w).hp, hp1, "半径2の外では回復しない");
    put(w, 12, 25);
    secs(w, 1.6);
    assert.equal(windows(w).length, 0, "受付期間(3秒)はもう終わっている");
    assert.ok(leader(w).hp > hp1, "受付期間の後も花は残って回復する");
    // 満タンなら何もしない(HPが上限を超えない)
    setHp(w, leader(w).mhp);
    const before = blooms(w)[0].healed;
    secs(w, 1.0);
    assert.equal(blooms(w)[0].healed, before); assert.equal(leader(w).hp, leader(w).mhp);
    // 8秒で消える
    secs(w, 8);
    assert.equal(blooms(w).length, 0); assert.equal(flowers(w).length, 0, "花のEventも消える");
    assert.equal(api(w).getTempObjectCount().total, 0);
    assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0);
});

test("Lv1の仲間: パーティーメンバーには付与されない(Lv2から)。仲間が花の中にいれば回復は受ける", () => {
    const w = world(1);
    parkOthers(w, [6]); put(w, 12, 25);
    addAlly(w, { actorId: 2, eventId: 6, cx: 13, cy: 25, maxHp: 400, hp: 100 });
    use(w);
    assert.deepEqual(windows(w).map(x => x.key), ["player"], "Lv1は使用者だけ");
    frames(w, 5); hurt(w, 100); frames(w, 2);
    assert.equal(blooms(w).length, 1);
    const before = allyHp(w, 2);
    secs(w, 1.0);
    assert.ok(allyHp(w, 2) - before >= 48, "花の中の仲間は回復する " + (allyHp(w, 2) - before));
    placeEnemy(w, 6, 12 + 6, 25);
    const far = allyHp(w, 2);
    secs(w, 1.0);
    assert.equal(allyHp(w, 2), far, "遠い仲間は回復しない");
});

test("Lv2: 出撃中の仲間にも受付期間が付く。仲間が被弾すると受けたダメージの90%が戻り、その仲間の位置に花が咲く。一撃でダウンした仲間は戻らない", () => {
    const w = world(2);
    parkOthers(w, [6]); put(w, 12, 25);
    addAlly(w, { actorId: 2, eventId: 6, cx: 20, cy: 25, maxHp: 400, hp: 400 });
    use(w);
    assert.deepEqual(windows(w).map(x => x.key).sort(), ["ally:2", "player"]);
    frames(w, 5);
    w.ctx.ProjectRPartyCombat.damageAlly(2, 100);
    frames(w, 3);
    assert.equal(allyHp(w, 2), 400 - 10, "100のダメージの90%(90)が戻る");
    const b = blooms(w);
    assert.equal(b.length, 1); assert.equal(b[0].owner, "ally:2");
    assert.ok(Math.abs(b[0].x - 20.5) < 0.6, "仲間の位置に咲く " + b[0].x);
    assert.equal(windows(w).find(x => x.key === "ally:2").refunded, 90);
    // ダウン: 一撃で倒れたら戻らない
    const w2 = world(2);
    parkOthers(w2, [6]); put(w2, 12, 25);
    addAlly(w2, { actorId: 2, eventId: 6, cx: 20, cy: 25, maxHp: 400, hp: 50 });
    use(w2); frames(w2, 5);
    w2.ctx.ProjectRPartyCombat.damageAlly(2, 100);
    frames(w2, 3);
    assert.equal(allyHp(w2, 2), 0, "ダウンした仲間は戻らない");
    // Lv1では仲間は軽減されない
    const w3 = world(1);
    parkOthers(w3, [6]); put(w3, 12, 25);
    addAlly(w3, { actorId: 2, eventId: 6, cx: 20, cy: 25, maxHp: 400, hp: 400 });
    use(w3); frames(w3, 5);
    w3.ctx.ProjectRPartyCombat.damageAlly(2, 100); frames(w3, 3);
    assert.equal(allyHp(w3, 2), 300, "Lv1の仲間は軽減なし");
});

test("Lv3: 受付期間5秒と移動速度+80%(x1.8)を受付期間の間だけ。Lv1〜2では移動速度は変わらない", () => {
    const w = world(3);
    parkOthers(w, []); put(w, 12, 25);
    const speed0 = w.ctx.ProjectRCardModifiers.moveSpeedFactor();
    assert.equal(speed0, 1);
    use(w);
    assert.ok(Math.abs(w.ctx.ProjectRCardModifiers.moveSpeedFactor() - 1.8) < 1e-9, "x1.8");
    secs(w, 4.8);
    assert.equal(windows(w).length, 1, "4.8秒はまだ受付中(Lv1なら終わっている)");
    assert.ok(Math.abs(w.ctx.ProjectRCardModifiers.moveSpeedFactor() - 1.8) < 1e-9);
    secs(w, 0.4);
    assert.equal(windows(w).length, 0, "5秒で終了");
    assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "移動速度は受付期間の終わりで元へ");
    const w1 = world(1);
    parkOthers(w1, []); use(w1);
    assert.equal(w1.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, "Lv1は速度変化なし");
});

test("再使用で受付期間を更新(軽減は重ならない・状態は1つ)。使用者が花の中でさらに被弾しても軽減のまま", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    const full = setHp(w, leader(w).mhp);
    use(w); secs(w, 2);
    use(w);
    assert.equal(windows(w).length, 1);
    assert.equal(status(w).list("player").filter(s => s.id === "hyacinthus_guard").length, 1);
    assert.equal(plain(status(w).factorOf("player")).damageTaken, 0.1, "x0.01にならない");
    assert.ok(windows(w)[0].remaining > 2.9, "更新された");
    hurt(w, 100); frames(w, 2);
    assert.equal(full - leader(w).hp, 10);
});

test("取消と後片付け: 受付期間中・花の最中の戦闘終了/マップ移動で、受付期間・軽減・花のEvent・錨・移動速度がすべて消える", () => {
    for (const how of ["battle", "map"]) {
        const w = world(3);
        parkOthers(w, []); put(w, 12, 25);
        leader(w).setHp(leader(w).mhp);
        use(w); frames(w, 5); hurt(w, 100); frames(w, 2);
        assert.equal(blooms(w).length, 1); assert.equal(flowers(w).length, 6);
        if (how === "battle") w.ctx.ProjectRCardDeck.endBattle(); else w.ctx.$gameMap.setup(4);
        assert.equal(windows(w).length, 0, how); assert.equal(blooms(w).length, 0, how);
        assert.equal(flowers(w).length, 0, how + " 花のEvent"); assert.equal(w.ctx.ProjectRGodSummonVisual.getAnchors().length, 0, how + " 錨");
        assert.equal(status(w).has("player", "hyacinthus_guard"), false, how); assert.equal(w.ctx.ProjectRDamageModifiers.list().length, 0, how);
        assert.equal(w.ctx.ProjectRCardModifiers.moveSpeedFactor(), 1, how + " 移動速度");
    }
});

test("演出: 使った瞬間に通常のカットイン1回。被弾でApolloが一時召喚で現れ、VFX(受付の光・花の輪・花びら)が出る。受付の光は受付期間の終わりで外れ、花の輪は花が消えると外れる", () => {
    const w = world(1);
    parkOthers(w, []); put(w, 12, 25);
    leader(w).setHp(leader(w).mhp);
    const keys = [];
    const vfx = w.ctx.ProjectRPresentationVfx, play = vfx.play; vfx.play = function(key) { keys.push(key); return play.apply(this, arguments); };
    const spy = spySe(w);
    use(w);
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).filter(e => e.cardId === C).length, 1, "カットインは使った瞬間に1回");
    assert.ok(keys.includes("apollo_hyacinth.guard"));
    frames(w, 5);
    const summonsBefore = plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length;
    hurt(w, 100); frames(w, 2);
    assert.ok(plain(w.ctx.ProjectRGodSummonManager.getActiveSummons()).length > summonsBefore, "被弾の後にApolloが召喚される");
    assert.ok(keys.includes("apollo_hyacinth.bloom") && keys.includes("apollo_hyacinth.petals"), JSON.stringify(keys));
    spy.restore();
    assert.ok(spy.se.includes("Heal4"), "花が咲く効果音");
    secs(w, 3.2);
    const loops = plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /hyacinth\.guard/.test(k));
    assert.equal(loops.length, 0, "受付の光は終わりで外れる");
    secs(w, 8.2);
    assert.equal(plain(w.ctx.ProjectRPresentationVfx.diagnostics().activeKeys).filter(k => /hyacinth\.bloom/.test(k)).length, 0, "花の輪は花が消えると外れる");
    assert.ok(plain(vfx.keys()).includes("apollo_hyacinth.bloom"));
});

test("DamageModifiersの重ねがけの既定は不変で、ギガース殺しの弱点x2(敵側)とヒュアキントスの軽減(使用者側)は互いに干渉しない", () => {
    const w = world(1);
    assert.equal(w.ctx.ProjectRDamageModifiers.getPolicy(), "uncommitted");
    parkOthers(w, [3]); put(w, 12, 25);
    status(w).apply("event:3", "gigas_weak", { seconds: 5, damageTaken: 2, source: "t" });
    use(w);
    const list = plain(w.ctx.ProjectRDamageModifiers.list());
    assert.deepEqual(list.map(m => [m.target, m.value]).sort(), [["event:3", 2], ["player", 0.1]]);
    assert.equal(plain(w.ctx.ProjectRDamageModifiers.getConflicts()).length, 0);
});

test("VFX素材: 3つのキーがVFX Designerライブラリと実画像(1コマの大きさ)に対応し、花のキャラ画像がある", () => {
    const fs = require("node:fs");
    const w = world(1);
    const vfx = w.ctx.ProjectRPresentationVfx;
    const library = JSON.parse(fs.readFileSync(path.join(project, "js/AnimationSolutionLibrary.json"), "utf8"));
    const sizes = { "apollo_hyacinth.guard": 96, "apollo_hyacinth.bloom": 192, "apollo_hyacinth.petals": 96 };
    for (const [key, frame] of Object.entries(sizes)) {
        const m = plain(vfx.mapping(key)), entry = library[m.library];
        assert.ok(entry, key + " のライブラリ"); assert.equal(entry.spritesheetFile, m.sheet.file);
        const png = fs.readFileSync(path.join(project, "img/pictures", m.sheet.file + ".png"));
        assert.deepEqual([png.readUInt32BE(16) / m.sheet.columns, png.readUInt32BE(20) / m.sheet.rows], [frame, frame], key + " の1コマ");
    }
    assert.equal(plain(vfx.mapping("apollo_hyacinth.guard")).anchor, "target", "個別に止められる(note付き)再生");
    assert.ok(fs.existsSync(path.join(project, "img/characters/VFX/$ProjectR_Hyacinth.png")));
});
