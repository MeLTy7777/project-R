"use strict";
// Phase H2B-3A: Hermes「ヴェイル」(設計ID 3 / hermes_veil / Cursor)。実エンジン(実Map004 + 全plugin)。
// ここはカード本体(登録・Cursor追従・半径・時間・レベル・出入り・消費・複数・後片付け・VFX分離)。標的の秘匿・敵AI・クリティカル・速度の統合は
// ProjectR_HermesVeil.integration.test.cjs。MZ実機の見た目・実マウスは tools/mz_cdp/h2b3a_verify.cjs。
const fx = require("./ProjectR_HermesB1Fixture.cjs");
const { assert, plain, hermesWorld, VEIL, ZETSU, deckApi, modifiers, player, useCard, runFrames, handIds, center } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const api = w => w.ctx.ProjectRHermesVeil;
const targeting = w => w.ctx.ProjectRCardTargeting;
const tile = w => w.ctx.$gameMap.tileWidth();
// マウスを「マップ座標 (x, y)(タイル・連続値)」へ置く(今の画面スクロールを考慮)。
const cursorTile = (w, x, y) => { const m = w.ctx.$gameMap; w.mouse((x - m.displayX()) * m.tileWidth(), (y - m.displayY()) * m.tileHeight()); };
const cursorOnPlayer = w => { const c = center(w); cursorTile(w, c.x, c.y); };
const frames = (w, n) => runFrames(w, n);
const ticks = (w, n) => { for (let i = 0; i < n; i++) deckApi(w).updateCooldown(1 / 60); };
const active = w => plain(api(w).getActive());
const speedOf = (w, character) => modifiers(w).characterSpeedFactor(character || player(w));
// 味方(DEV <npc>)を、当たり判定の中心が (cx, cy) になるように置く。
function allyAt(w, cx, cy) {
    const spawned = w.ctx.ProjectRVeilTest.ally.spawn(cx, cy);
    assert.equal(spawned.ok, true, JSON.stringify(spawned));
    return w.ctx.$gameMap.event(spawned.eventId);
}
const placeCenter = (w, event, cx, cy) => assert.equal(w.ctx.ProjectRVeilTest.ally.move(event.eventId(), cx, cy), true);
// 数値だけの偽の味方(円の境界の厳密な検証用)。centerPositionPoint だけを持つ。
function fakeFriend(id, cx, cy) { return { id, character: { _realX: cx - 0.5, _realY: cy - 0.5, centerPositionPoint: () => ({ x: cx, y: cy }) } }; }
const stateOf = w => plain(deckApi(w).getBattleState());

test("登録: 特殊 / 最大3枚 / 最大Lv3 / Cooldown 10秒 / Cursor。設計ID3 ↔ hermes_veil。サイコポンポスだけが未実装で残る。旧「認識阻害」は残る", () => {
    const w = hermesWorld({ card: VEIL });
    assert.deepEqual(plain(deckApi(w).definitions.card(VEIL)), { cardId: VEIL, ringId: "hermes", maxCopies: 3, cooldownSeconds: 10, maxLevel: 3, rarity: "special", category: "support", targetType: "cursor" });
    const design = plain(w.ctx.ProjectRCardCatalog.hermesDesign()).find(c => c.designId === 3);
    assert.deepEqual([design.runtimeCardId, design.implemented, design.targetType, design.runtimeTargetTypeSupported, design.workbookTargetType], [VEIL, true, "cursor", true, "その他"]);
    // H2B-3B: サイコポンポスも実装済み。実装は揃ったが、本番の30枚デッキは有効にしない。
    assert.deepEqual(plain(w.ctx.ProjectRCardCatalog.finalDeckBlockers()), []);
    assert.equal(w.ctx.ProjectRCardCatalog.isFinalDeckActivated(), false, "本番の30枚デッキは有効にしない");
    assert.ok(deckApi(w).definitions.card("hermes_perception_obscure"), "旧カードは残る");
    const migration = plain(w.ctx.ProjectRCardCatalog.migrationAudit()).find(m => m.designId === 3);
    assert.equal(migration.legacyCardId, "hermes_perception_obscure");
    assert.equal(migration.decision, "coexist-pending");
    const fresh = require("./RealEngineHarness.cjs").buildWorld(); fresh.enterMap(4, 12, 25);
    assert.equal(deckApi(fresh).isCardOwned(VEIL), false, "既定は未所持");
});

test("Cursor は新しい対象タイプ: 受け付けられ、未知の種別は従来どおり安全に拒否される。Direction/Ground/Buff(instant)/Ally の登録は変わらない", () => {
    const w = hermesWorld({ card: VEIL });
    const d = deckApi(w);
    for (const type of ["direction", "ground", "instant", "ally", "cursor"]) assert.equal(typeof d.getActivationHandler(type), "function", type);
    assert.equal(d.registerActivationHandler("futureUnknown", () => ({ ok: true })), false);
    assert.equal(d.getActivationHandler("futureUnknown"), null);
    // 既存カードの対象タイプ
    assert.deepEqual(["hermes_zetsu", "hermes_sweep", "hermes_issen", "hermes_strength", "hermes_reed_flute"].map(id => d.definitions.card(id).targetType),
        ["ground", "direction", "direction", "instant", "instant"]);
    assert.equal(d.definitions.card("apollo_lyre_calm").targetType, "ally");
});

test("累積レベル: Lv1 秘匿(半径5・5秒) / Lv2 + 移動速度+30% / Lv3 + クリティカル+50%。同じ効果の数値は置換で、既存の効果は残る", () => {
    const w = hermesWorld({ card: VEIL });
    assert.deepEqual(plain(api(w).effectsForLevel(1)), { concealment: true, radiusTiles: 5, durationSeconds: 5 });
    assert.deepEqual(plain(api(w).effectsForLevel(2)), { concealment: true, radiusTiles: 5, durationSeconds: 5, speedBonus: 0.3 });
    assert.deepEqual(plain(api(w).effectsForLevel(3)), { concealment: true, radiusTiles: 5, durationSeconds: 5, speedBonus: 0.3, criticalChanceBonus: 0.5 });
    // 置換の確認(同じ効果に新しい値が来ても足し算しない)
    const rows = [{ level: 1, effects: { speedBonus: 0.3 } }, { level: 2, effects: { speedBonus: 0.4 } }];
    assert.equal(w.ctx.ProjectRCardCatalog.resolveLevels(rows, 2).speedBonus, 0.4);
});

test("Cursor の座標: 画面スクロール・表示オフセット・タイルサイズに追従する。無効/画面外のマウスは無効", () => {
    const w = hermesWorld({ card: VEIL });
    const m = w.ctx.$gameMap, t = targeting(w);
    m._displayX = 4; m._displayY = 19;
    assert.deepEqual(plain(t.screenToWorld(0, 0)), { x: 4, y: 19 });
    assert.deepEqual(plain(t.screenToWorld(96, 48)), { x: 6, y: 20 });
    m._displayX = 7.5; m._displayY = 19.25; // 端数のスクロール(滑らかなスクロール)
    assert.deepEqual(plain(t.screenToWorld(96, 48)), { x: 9.5, y: 20.25 });
    // タイルサイズが標準でない場合(32px)
    const tw = m.tileWidth, th = m.tileHeight;
    m.tileWidth = () => 32; m.tileHeight = () => 32;
    assert.deepEqual(plain(t.screenToWorld(96, 64)), { x: 10.5, y: 21.25 });
    m.tileWidth = tw; m.tileHeight = th;
    // 無効なマウス
    t.setPointerOverride(() => ({ x: NaN, y: 10 }));
    assert.equal(t.pointer().ok, false);
    t.setPointerOverride(() => ({ x: -1, y: 10 }));
    assert.deepEqual([t.pointer().ok, t.pointer().reason], [false, "pointerOffScreen"]);
    t.setPointerOverride(() => ({ x: w.ctx.Graphics.width + 1, y: 10 }));
    assert.equal(t.pointer().ok, false);
    t.setPointerOverride(() => ({ x: 0, y: 0 }));
    assert.equal(t.pointer().ok, true, "画面の端は有効");
    t.setPointerOverride(() => ({ x: w.ctx.Graphics.width, y: w.ctx.Graphics.height }));
    assert.equal(t.pointer().ok, true);
    t.setPointerOverride(null);
    w.mouse(100, 100);
    assert.equal(t.pointer().ok, true);
});

test("円の境界: 半径5マスちょうどは内側(含む)、わずかに外は外側。距離は当たり判定の中心で測る", () => {
    const w = hermesWorld({ card: VEIL });
    const t = targeting(w), c = { x: 20, y: 25 };
    const circle = (x, y) => t.circleContains(c, 5, fakeFriend("f", x, y).character);
    assert.equal(circle(25, 25), true, "ちょうど5.000(含む)");
    assert.equal(circle(25.001, 25), false);
    assert.equal(circle(24.999, 25), true);
    assert.equal(circle(20 + 3, 25 + 4), true, "3-4-5 の斜めもちょうど5");
    assert.equal(circle(20 + 3.01, 25 + 4), false);
    assert.equal(circle(20, 25), true);
    assert.equal(t.circleContains(c, 5, null), false);
});

test("発動: マウスの位置に円が作られ、カードは1回だけ消費される(手札が入れ替わり、Cooldownに入り、山札から1枚引く)。半径5・5秒・Hermes/魔法陣の表示が始まる", () => {
    const w = hermesWorld({ card: VEIL, level: 1 });
    const before = stateOf(w);
    cursorTile(w, 17, 24.5);
    w.calls.length = 0;
    const result = useCard(w);
    assert.equal(result.ok, true);
    assert.equal(result.targetType, "cursor");
    const after = stateOf(w);
    assert.equal(after.hand.length, 5);
    assert.equal(after.drawPile.length, before.drawPile.length - 1, "手札の入れ替えに1枚引く");
    assert.equal(after.cooldownPile.length, before.cooldownPile.length + 1, "使った1枚がCooldownへ");
    assert.equal(after.cooldownPile[after.cooldownPile.length - 1].instance.cardId, VEIL);
    assert.equal(after.cooldownPile[after.cooldownPile.length - 1].remainingSeconds, 10, "Cooldown 10秒");
    const [veil] = active(w);
    assert.equal(active(w).length, 1);
    assert.deepEqual([veil.center.x, veil.center.y, veil.remaining, veil.level], [17, 24.5, 5, 1]);
    assert.equal(veil.effects.radiusTiles, 5);
    const followers = plain(w.ctx.ProjectRGodSummonVisual.getFollowers());
    assert.equal(followers.length, 1, "Hermesの表示Eventが1体");
    const event = w.ctx.$gameMap.event(followers[0].eventId);
    assert.deepEqual([event._realX, event._realY], [16.5, 24], "Hermesはマウスの位置(中心が17, 24.5)");
    assert.equal(event.isPlayerChild, false, "Playerの子ではない(Playerの移動に付いていかない)");
    const circle = w.calls.find(c => c.name === "showAnimatedPicture" && String(c.args.note).startsWith("ProjectR:hermes_veil.circle"));
    assert.ok(circle, "魔法陣のVFX");
    assert.equal(circle.args.loopCount, "infinite", "止めるまで繰り返す");
    assert.equal(JSON.parse(circle.args.positionSettings).eventId, String(followers[0].eventId), "Hermesの表示Eventに結び付く(追従)");
    assert.equal(JSON.parse(circle.args.positionSettings).stickMode, "false", "固定しない");
    assert.equal(JSON.parse(circle.args.visualSettings).scalePercent, "100", "半径5マス = 直径10マス = 480px = 1コマ480px");
    assert.ok(w.calls.some(c => c.name === "showAnimatedPicture" && String(c.args.note).startsWith("ProjectR:hermes_veil.touch")), "Hermesが手を付く波紋");
    const lib = JSON.parse(require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "js", "AnimationSolutionLibrary.json"), "utf8"));
    for (const name of ["ProjectR_Veil_Circle", "ProjectR_Veil_Touch", "ProjectR_Veil_Aura"]) assert.ok(lib[name], `VFX Designerライブラリに${name}`);
    assert.equal(lib.ProjectR_Veil_Circle.spritesheetFile, "Animation/ProjectR_Veil_Circle");
});

test("Cursor は毎フレーム追従する: 円とHermesの位置は今のマウスに一致し、カード消費・Cooldown・効果時間は変わらない。発動は1回だけ", () => {
    const w = hermesWorld({ card: VEIL });
    cursorTile(w, 14, 25);
    assert.equal(useCard(w).ok, true);
    const used = stateOf(w);
    const serial = active(w)[0].serial;
    const followerId = plain(w.ctx.ProjectRGodSummonVisual.getFollowers())[0].eventId;
    const uses = [];
    const original = deckApi(w).useBattleCard;
    for (let i = 1; i <= 30; i++) {
        const x = 14 + i * 0.2, y = 25 - i * 0.1;
        cursorTile(w, x, y);
        frames(w, 1);
        const [veil] = active(w);
        assert.ok(Math.abs(veil.center.x - x) < 1e-9 && Math.abs(veil.center.y - y) < 1e-9, `${i}フレーム目の中心 ${JSON.stringify(veil.center)} vs ${x},${y}`);
        const event = w.ctx.$gameMap.event(followerId);
        assert.ok(Math.abs(event._realX - (x - 0.5)) < 1e-9 && Math.abs(event._realY - (y - 0.5)) < 1e-9, `Hermesの位置 ${i}`);
        assert.equal(veil.serial, serial, "新しい発動ではない");
    }
    assert.equal(active(w).length, 1);
    assert.equal(api(w).getLastResult().serial, serial);
    const later = stateOf(w);
    assert.equal(later.drawPile.length, used.drawPile.length, "カードは再消費されない");
    assert.equal(later.hand.map(c => c.instanceId).join(), used.hand.map(c => c.instanceId).join(), "手札は同じ");
    const veil = active(w)[0];
    assert.ok(Math.abs(veil.remaining - (5 - 30 / 60)) < 1e-6, `効果時間は動きに関係なく進む ${veil.remaining}`);
    void uses; void original;
    // 円の中心はプレイヤーを動かさない・衝突を作らない
    assert.deepEqual([player(w)._realX, player(w)._realY], [12, 25]);
});

test("Ground との違い: 絶(Ground)は発動の瞬間のマウス位置で固定、ヴェイル(Cursor)は後からのマウスに付いていく", () => {
    const w = hermesWorld({ card: ZETSU, level: 1 });
    const zetsu = w.ctx.ProjectRHermesZetsu;
    cursorTile(w, 15, 25);
    const first = plain(zetsu.plan());
    w.mouse(100, 100);
    const second = plain(zetsu.plan());
    assert.notDeepEqual(first.land, second.land, "Zetsuの計画は呼ぶたびに今のマウスを読む(= 発動の瞬間に1回読む型)");
    assert.equal(deckApi(w).definitions.card(ZETSU).targetType, "ground");
    assert.equal(deckApi(w).definitions.card(VEIL).targetType, "cursor");
    // 発動後の動き: Zetsuの結果は発動時の値のまま。Veilは付いていく
    const v = hermesWorld({ card: VEIL });
    cursorTile(v, 15, 25);
    assert.equal(useCard(v).ok, true);
    const at = active(v)[0].center.x;
    cursorTile(v, 18, 26); frames(v, 1);
    assert.notEqual(active(v)[0].center.x, at);
    assert.equal(active(v)[0].center.x, 18);
});

test("画面スクロール: マウスの画面位置が同じでも、マップが動けば円の世界座標も動く(マウスの世界座標に追従)", () => {
    const w = hermesWorld({ card: VEIL });
    const m = w.ctx.$gameMap;
    w.mouse(400, 300);
    assert.equal(useCard(w).ok, true);
    const x0 = active(w)[0].center.x, y0 = active(w)[0].center.y;
    m._displayX += 2; m._displayY -= 1;
    frames(w, 1);
    // 画面に追従してプレイヤーのカメラが再センタリングされる場合があるので、実際の displayX を基準にする
    const expectX = m.displayX() + 400 / 48, expectY = m.displayY() + 300 / 48;
    assert.ok(Math.abs(active(w)[0].center.x - expectX) < 1e-9 && Math.abs(active(w)[0].center.y - expectY) < 1e-9);
    void x0; void y0;
    // タイルサイズが標準でない場合の拡縮(半径5 = 直径10マス = 320px なら 480px の1コマを 67% に)
    const v = hermesWorld({ card: VEIL });
    const mv = v.ctx.$gameMap;
    mv.tileWidth = () => 32; mv.tileHeight = () => 32;
    v.mouse(300, 300);
    v.calls.length = 0;
    assert.equal(useCard(v).ok, true);
    const circle = v.calls.find(c => c.name === "showAnimatedPicture" && String(c.args.note).startsWith("ProjectR:hermes_veil.circle"));
    assert.equal(JSON.parse(circle.args.visualSettings).scalePercent, String(Math.round(100 * 320 / 480)));
});

test("効果時間: 5秒ちょうどで終わる(300フレーム)。終わりにHermesは黒いノイズで消え、魔法陣が止まり、効果が外れる", () => {
    const w = hermesWorld({ card: VEIL, level: 3 });
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    w.calls.length = 0;
    const eventId = plain(w.ctx.ProjectRGodSummonVisual.getFollowers())[0].eventId;
    ticks(w, 299);
    assert.equal(active(w).length, 1, "299フレームではまだ有効");
    assert.ok(active(w)[0].remaining > 0);
    assert.equal(speedOf(w), 1.3);
    ticks(w, 1);
    assert.equal(active(w).length, 0, "300フレームで終わる");
    assert.equal(speedOf(w), 1, "速度の係数が外れる");
    assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), false);
    assert.equal(plain(api(w).getLastResult().lastEnd).reason, "expired");
    const vanish = w.calls.find(c => c.name === "showAnimationFromLibrary" && c.args.animationName === "ProjectR_Hermes_Vanish");
    assert.ok(vanish, "黒いノイズ(hermes.vanish = VFX DesignerライブラリProjectR_Hermes_Vanish)");
    assert.equal(vanish.args.eventId, String(eventId), "Hermesの位置");
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers())[0].vanishing, true);
    frames(w, 10);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0, "Hermesの表示Eventが消える");
    assert.ok(!w.ctx.$gameMap.event(eventId) || w.ctx.$gameMap.event(eventId)._erased, "Eventが残らない");
    const keys = plain(w.ctx.ProjectRPresentationVfx.diagnostics()).activeKeys;
    assert.ok(!keys.includes("hermes_veil.circle") && !keys.includes("hermes_veil.aura"), `魔法陣・オーラは止まった ${keys}`);
});

test("時間は操作可能な戦闘時間でだけ進む: メッセージ表示中は止まり、位置の追従も止まる", () => {
    const w = hermesWorld({ card: VEIL });
    cursorTile(w, 15, 25);
    assert.equal(useCard(w).ok, true);
    frames(w, 5);
    const remaining = active(w)[0].remaining;
    const center0 = active(w)[0].center.x;
    w.ctx.$gameMessage.add("停止中");
    cursorTile(w, 19, 25);
    frames(w, 20);
    assert.equal(active(w)[0].remaining, remaining, "会話中は効果時間が進まない");
    assert.equal(active(w)[0].center.x, center0, "会話中は円が動かない");
    w.ctx.$gameMessage.clear();
    frames(w, 2);
    assert.ok(active(w)[0].remaining < remaining);
    assert.equal(active(w)[0].center.x, 19, "再開すると今のマウスへ");
});

test("味方の出入り: 円に入った瞬間に効果を受け、出ると止まる。マウスで円を動かして覆う/外すこともでき、効果時間は出入りでやり直さない", () => {
    const w = hermesWorld({ card: VEIL, level: 3 });
    const ally = allyAt(w, 19.5, 25.5); // 主人公(12.5, 25.5)から7マス離れた味方(画面内)
    const allyRef = "event:" + ally.eventId();
    cursorTile(w, 12.5, 25.5);
    assert.equal(useCard(w).ok, true);
    assert.deepEqual(active(w)[0].members, ["player"], "発動の瞬間: 主人公は範囲内、味方は範囲外");
    assert.equal(speedOf(w), 1.3);
    assert.equal(speedOf(w, ally), 1);
    frames(w, 10);
    const remaining = active(w)[0].remaining;
    // 円を味方へ動かす: 味方が入り、主人公が出る
    cursorTile(w, 19.5, 25.5);
    frames(w, 1);
    assert.deepEqual(active(w)[0].members, [allyRef]);
    assert.equal(speedOf(w, ally), 1.3, "入った瞬間に効果");
    assert.equal(speedOf(w), 1, "出た瞬間に効果が外れる");
    assert.equal(api(w).isConcealed(ally), true);
    assert.equal(api(w).isConcealed(player(w)), false);
    assert.ok(Math.abs(active(w)[0].remaining - (remaining - 1 / 60)) < 1e-6, "出入りで効果時間はやり直さない");
    // 円を戻す: また主人公が効果を受ける(効果時間は元のまま進む)
    cursorTile(w, 12.5, 25.5);
    frames(w, 1);
    assert.deepEqual(active(w)[0].members, ["player"]);
    assert.equal(speedOf(w), 1.3);
    assert.equal(speedOf(w, ally), 1);
    assert.ok(Math.abs(active(w)[0].remaining - (remaining - 2 / 60)) < 1e-6);
    // 両方入る位置
    cursorTile(w, 16, 25.5);
    frames(w, 1);
    assert.deepEqual(active(w)[0].members.sort(), ["player", allyRef].sort());
    // 味方が動いて出る
    placeCenter(w, ally, 16 + 5.01, 25.5);
    frames(w, 1);
    assert.deepEqual(active(w)[0].members, ["player"]);
    assert.equal(speedOf(w, ally), 1);
    placeCenter(w, ally, 16 + 4.99, 25.5);
    frames(w, 1);
    assert.equal(speedOf(w, ally), 1.3);
});

test("半径の変更は即座に効果へ反映される: 境界を1フレームまたぐと、その場で効果が付く/外れる", () => {
    const w = hermesWorld({ card: VEIL, level: 2 });
    api(w).registerFriendlyProvider("fake", () => [fakeFriend("fake", 20, 25)]);
    cursorTile(w, 15.2, 25);
    assert.equal(useCard(w).ok, true);
    assert.equal(api(w).containsFriendly("fake"), true, "距離4.8は範囲内(発動の瞬間から効果)");
    cursorTile(w, 14.9, 25); frames(w, 1);
    assert.equal(api(w).containsFriendly("fake"), false, "距離5.1は範囲外");
    cursorTile(w, 15, 25); frames(w, 1);
    assert.equal(api(w).containsFriendly("fake"), true, "ちょうど5.0は範囲内");
});

test("発動の失敗は非消費: 戦闘外・マウスが画面外/無効。理由がログに残り、手札・山札・Cooldown・効果は何も変わらない", () => {
    const w = hermesWorld({ card: VEIL });
    const before = stateOf(w);
    targeting(w).setPointerOverride(() => ({ x: w.ctx.Graphics.width + 50, y: 100 }));
    const result = useCard(w);
    assert.equal(result.ok, false);
    assert.equal(result.reason, "activationFailed");
    assert.equal(result.detail, "pointerOffScreen");
    targeting(w).setPointerOverride(() => ({ x: NaN, y: 100 }));
    assert.equal(useCard(w).ok, false);
    targeting(w).setPointerOverride(null);
    assert.deepEqual(stateOf(w), before, "状態は変わらない");
    assert.equal(active(w).length, 0);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0);
    assert.equal(w.ctx.ProjectRCardDeck.getBattleState().cooldownPile.length, before.cooldownPile.length);
    // 戦闘中でなければ失敗
    const idle = require("./RealEngineHarness.cjs").buildWorld(); idle.enterMap(4, 12, 25);
    assert.equal(deckApi(idle).requestUseCard(0).ok, false);
});

test("空の円: 既定では発動を受理して味方の侵入を待つ。RequireFriendlyInside=true なら味方が範囲内にいないとき非消費で失敗(暫定の切替)", () => {
    const w = hermesWorld({ card: VEIL });
    const params = w.ctx.PluginManager.parameters("ProjectR_HermesVeil");
    cursorTile(w, 20.8, 25.5); // 主人公から8マス離れた空の場所(画面内)
    const before = stateOf(w);
    assert.equal(useCard(w).ok, true, "既定: 空でも受理");
    assert.deepEqual(active(w)[0].members, []);
    assert.notDeepEqual(stateOf(w), before, "消費される");
    // 受理した空の円へ、主人公のほうが入ってくる(マウスを動かして覆う)ことで効果を受けられる
    cursorOnPlayer(w); frames(w, 1);
    assert.deepEqual(active(w)[0].members, ["player"]);
    // 切替
    const x = hermesWorld({ card: VEIL });
    x.ctx.PluginManager.parameters("ProjectR_HermesVeil").RequireFriendlyInside = "true";
    cursorTile(x, 20.8, 25.5);
    const before2 = stateOf(x);
    const result = useCard(x);
    assert.equal(result.ok, false);
    assert.equal(result.detail, "noFriendlyInArea");
    assert.deepEqual(stateOf(x), before2, "非消費");
    cursorOnPlayer(x);
    assert.equal(useCard(x).ok, true, "範囲内に味方がいれば受理");
    void params;
});

test("複数のヴェイル: coexist(既定)では独立した円・独立した5秒。効果は二重に掛からず(速度x1.3のまま)、片方が終わっても残りで効果が続く", () => {
    const w = hermesWorld({ card: VEIL, level: 2 });
    cursorOnPlayer(w);
    assert.equal(useCard(w).ok, true);
    ticks(w, 120); // 2秒後に2枚目
    assert.equal(useCard(w).ok, true);
    assert.equal(active(w).length, 2);
    assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 2);
    assert.equal(speedOf(w), 1.3, "二重に掛からない(1.69ではない)");
    assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), true);
    ticks(w, 180); // 最初のものが終わる
    assert.equal(active(w).length, 1);
    assert.equal(speedOf(w), 1.3, "2枚目で効果は続く");
    assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), true);
    ticks(w, 120);
    assert.equal(active(w).length, 0);
    assert.equal(speedOf(w), 1);
    assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), false);
    // replace: 新しいヴェイルが古いものを終わらせる
    const r = hermesWorld({ card: VEIL, level: 2 });
    r.ctx.PluginManager.parameters("ProjectR_HermesVeil").OverlapPolicy = "replace";
    cursorOnPlayer(r);
    assert.equal(useCard(r).ok, true);
    const first = active(r)[0].serial;
    assert.equal(useCard(r).ok, true);
    assert.equal(active(r).length, 1);
    assert.notEqual(active(r)[0].serial, first);
    assert.equal(plain(r.ctx.ProjectRGodSummonVisual.getFollowers()).filter(f => !f.vanishing).length, 1);
    assert.equal(speedOf(r), 1.3);
});

test("後片付け: 戦闘終了・主人公の死亡・マップ移動・ロード・ニューゲームで、効果・秘匿・速度係数・Hermesの表示Event・VFXがすべて消える。データは変えない", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        death: w => { w.ctx.ProjectR.PlayerDeath.isDead = () => true; runFrames(w, 2); },
        mapSetup: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents({ system: w.ctx.$gameSystem, screen: w.ctx.$gameScreen, timer: w.ctx.$gameTimer, switches: w.ctx.$gameSwitches, variables: w.ctx.$gameVariables,
            selfSwitches: w.ctx.$gameSelfSwitches, actors: w.ctx.$gameActors, party: w.ctx.$gameParty, map: w.ctx.$gameMap, player: w.ctx.$gamePlayer }),
        newGame: w => w.ctx.DataManager.setupNewGame()
    };
    for (const [name, run] of Object.entries(cases)) {
        const w = hermesWorld({ card: VEIL, level: 3 });
        const ally = allyAt(w, 14, 25);
        cursorTile(w, 13, 25);
        assert.equal(useCard(w).ok, true, name);
        frames(w, 2);
        assert.equal(speedOf(w), 1.3, name);
        assert.equal(speedOf(w, ally), 1.3, name);
        assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 1, name);
        const hpBefore = w.ctx.$gameParty.leader().hp, atkBefore = w.ctx.$gameParty.leader().atk;
        try { run(w); } catch (error) { if (name === "load" || name === "newGame") { /* 保存内容の模擬が不完全でもよい: 片付けはその前に走る */ } else throw error; }
        assert.equal(active(w).length, 0, name);
        assert.equal(speedOf(w), 1, `${name}: 主人公の係数`);
        assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), false, name);
        assert.equal(w.ctx.ProjectRCardModifiers.getMoveSpeedModifiers().length, 0, name);
        if (name !== "mapSetup" && name !== "load" && name !== "newGame") {
            assert.equal(plain(w.ctx.ProjectRGodSummonVisual.getFollowers()).length, 0, `${name}: Hermesの表示Event`);
            { const k = plain(w.ctx.ProjectRPresentationVfx.diagnostics()).activeKeys; assert.ok(!k.includes("hermes_veil.circle") && !k.includes("hermes_veil.aura"), `${name}: VFX ${k}`); }
        }
        if (name === "death" || name === "battleEnd") assert.equal(w.ctx.$gameParty.leader().atk, atkBefore, "ステータスは変わらない");
        void hpBefore;
    }
});

test("VFX・表示の失敗は効果に影響しない: VFXが例外/失敗/ライブラリ欠落でも、カードは消費され、秘匿・速度・時間は正しく動く", () => {
    for (const mode of ["playThrows", "playFails", "spawnThrows", "spawnFails", "noVisualApi", "noVfxApi"]) {
        const w = hermesWorld({ card: VEIL, level: 2 });
        const vfx = w.ctx.ProjectRPresentationVfx, visual = w.ctx.ProjectRGodSummonVisual;
        const patch = {
            playThrows: () => { w.ctx.ProjectRPresentationVfx = Object.freeze({ ...vfx, play: () => { throw new Error("vfx"); } }); },
            playFails: () => { w.ctx.ProjectRPresentationVfx = Object.freeze({ ...vfx, play: () => ({ ok: false, reason: "x" }) }); },
            spawnThrows: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnFollower: () => { throw new Error("spawn"); } }; },
            spawnFails: () => { w.ctx.ProjectRGodSummonVisual = { ...visual, spawnFollower: () => ({ ok: false, reason: "templateMissing" }) }; },
            noVisualApi: () => { w.ctx.ProjectRGodSummonVisual = {}; },
            noVfxApi: () => { w.ctx.ProjectRPresentationVfx = {}; }
        }[mode];
        patch();
        cursorOnPlayer(w);
        const result = useCard(w);
        assert.equal(result.ok, true, mode);
        assert.equal(active(w).length, 1, mode);
        assert.equal(speedOf(w), 1.3, mode);
        assert.equal(w.ctx.ProjectRTargetEligibility.isConcealed(player(w)), true, mode);
        ticks(w, 300);
        assert.equal(active(w).length, 0, mode);
        assert.equal(speedOf(w), 1, mode);
    }
});

test("Chromium 85 互換: 新しいplugin(Cursor/秘匿/ヴェイル/DEV)に新しい構文・APIを使わない", () => {
    const fs = require("node:fs"), path = require("node:path");
    const files = ["ProjectR_CardTargeting.js", "ProjectR_TargetEligibility.js", "ProjectR_HermesVeil.js", "ProjectR_CombatTestArenaVeil.js", "ProjectR_GodSummonVisual.js", "ProjectR_PresentationVfx.js", "ProjectR_CardModifiers.js"];
    const banned = [[/\?\?=|\|\|=|&&=/, "論理代入"], [/\.at\(/, "Array.at"], [/\breplaceAll\(/, "replaceAll"], [/Object\.hasOwn\(/, "Object.hasOwn"], [/structuredClone\(/, "structuredClone"],
        [/\bstatic\s*\{/, "static block"], [/#[A-Za-z_]\w*\s*[=;(]/, "private field"], [/\.findLast\(/, "findLast"], [/\.toSorted\(|\.toReversed\(/, "toSorted"], [/Array\.fromAsync/, "fromAsync"], [/\bawait\s/, "await"]];
    for (const file of files) {
        const source = fs.readFileSync(path.join(__dirname, "..", "js", "plugins", file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
        for (const [re, label] of banned) {
            if (file === "ProjectR_HermesVeil.js" || file === "ProjectR_TargetEligibility.js" || file === "ProjectR_CardTargeting.js" || file === "ProjectR_CombatTestArenaVeil.js") assert.ok(!re.test(source), `${file}: ${label}`);
            else if (label !== "Array.at" && label !== "await") assert.ok(!re.test(source), `${file}: ${label}`);
        }
    }
});
