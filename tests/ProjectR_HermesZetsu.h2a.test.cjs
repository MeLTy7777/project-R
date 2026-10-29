"use strict";
// Phase H2A: 絶の予備動作(腕クロス → Hermes → 出発点のノイズ → 権威ある移動 → 到着点のノイズ)、
// CrossArms中の銃スプライト、Ultimateカットインの接続。実エンジン(実Map004 + 全plugin)。MZ実機の見た目は対象外。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { plain, read, zetsuWorld, aim, deckApi, zetsuApi, modifiers, state, player, pos, lastCard, near, equip, GUN_ID, SWORD_ID, ZETSU } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const WINDUP = 8;
const history = w => plain(w.ctx.ProjectRCharacterPresentation.history()).filter(e => e.ok).map(e => e.name);
const centerOn = w => player(w).center(player(w)._realX, player(w)._realY);
// Qを押す(キーdown→1frame。移動は予備動作の後なので、ここでは待たない)
const press = (w, key = "Q") => { centerOn(w); w.keyDown(...fx.KEYS[key]); w.frames(1); w.keyUp(...fx.KEYS[key]); };
const withCalls = w => { w.vfx = []; const original = w.ctx.PluginManager.callCommand; w.ctx.PluginManager.callCommand = function(i, plugin, name, args) {
    if (plugin === "Hendrix_Animation_Solution") w.vfx.push({ name, args, playerX: w.ctx.$gamePlayer._realX, frame: w.frameNo });
    return original.apply(this, arguments); }; };
const frames = (w, n) => { for (let i = 0; i < n; i++) { w.frames(1); w.frameNo = (w.frameNo || 0) + 1; } };

test("既定の予備動作は8frame(Plugin Parameter)。0なら成功確定と同時に移動(H1の挙動)", () => {
    const w = zetsuWorld({ windup: WINDUP });
    assert.equal(zetsuApi(w).getWindupFrames(), WINDUP);
    const fresh = require("./RealEngineHarness.cjs").buildWorld();
    assert.equal(fresh.ctx.ProjectRHermesZetsu.getWindupFrames(), 8, "plugins.jsの既定値のまま");
    assert.equal(zetsuApi(w).setWindupFrames(0), 0);
    assert.equal(zetsuApi(w).setWindupFrames(-3), 0);
});

test("順序(H2B-1): 予約(未消費)→ 腕クロス・Hermes・出発点のノイズ・カットイン → (8frame後)再検証して消費・移動・強化 → 到着点のノイズ", () => {
    const w = zetsuWorld({ level: 2, windup: WINDUP });
    withCalls(w);
    const start = pos(w), before = state(w);
    aim(w, 5, 0);
    press(w);
    assert.equal(lastCard(w).ok, false, "予約は消費ではない");
    assert.equal(lastCard(w).reason, "pending");
    // 予約の時点: カード・山札・Cooldownは何も変わらない(消費は移動が確定してから)。演出だけが始まる。
    const t0 = state(w);
    assert.deepEqual(t0.hand, before.hand, "手札は変わらない");
    assert.equal(t0.drawPile.length, before.drawPile.length, "補充されない");
    assert.equal(t0.cooldownPile.length, 0, "Cooldownはまだ始まらない");
    assert.deepEqual(pos(w), start, "予備動作の間は動かない");
    assert.equal(modifiers(w).getWeaponHitBonus(), null, "強化は移動の後から数え始める");
    assert.equal(zetsuApi(w).isTeleportPending(), true);
    assert.ok(history(w).includes("CrossArms"), "腕クロス");
    assert.ok(w.ctx.ProjectRGodSummonManager.getActiveSummons().some(s => s.godId === "hermes"), "Hermesが現れる");
    assert.equal(w.vfx.length, 1, "出発点のノイズだけが先に出る");
    assert.equal(w.vfx[0].args.animationName, "ProjectR_Zetsu_Departure");
    assert.equal(w.vfx[0].args.stickMode, "true");
    assert.equal(w.vfx[0].playerX, start.x, "ノイズは移動の前=出発点で始まる");
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 1, "通常カットイン");
    // 予備動作の経過
    frames(w, WINDUP - 3);
    assert.deepEqual(pos(w), start);
    frames(w, 6);
    near(pos(w).x, start.x + 5, 0.02, "予備動作の後に移動");
    assert.equal(zetsuApi(w).isTeleportPending(), false);
    const t1 = state(w);
    assert.equal(t1.drawPile.length, before.drawPile.length - 1, "確定でちょうど1枚補充");
    assert.equal(t1.cooldownPile.length, 1, "Cooldownに入るのは1枚");
    assert.equal(plain(w.ctx.ProjectRCutIn.getActive()).length, 1, "カットインは予約時の1枚だけ(確定で重ねない)");
    assert.equal(history(w).filter(n => n === "CrossArms").length, 1, "腕クロスも1回だけ(確定で再生し直さない)");
    assert.equal(modifiers(w).getWeaponHitBonus().multiplier, 2.0, "強化は移動の瞬間に用意される");
    assert.equal(w.vfx.length, 2);
    assert.equal(w.vfx[1].args.animationName, "ProjectR_Zetsu_Arrival");
    assert.equal(w.vfx[1].args.stickMode, "false");
    assert.ok(w.vfx[1].playerX > start.x + 4.9, "到着点のノイズは移動の後");
    assert.equal(zetsuApi(w).getLastResult().ok, true);
    assert.equal(zetsuApi(w).getLastResult().windupFrames, WINDUP);
});

test("予備動作中も操作は止まらず、無敵でもない。移動先は発動時に固定され、動いていても着地する", () => {
    const w = zetsuWorld({ windup: WINDUP });
    const start = pos(w);
    aim(w, 5, 0); press(w);
    assert.equal(player(w).canMove(), true, "入力ロックなし");
    // 予備動作中にダメージを受けられる(無敵ではない)。States/無敵の付与もない。
    const leader = w.ctx.$gameParty.leader(), hp = leader.hp, states = leader.states().length;
    leader.gainHp(-10);
    assert.equal(leader.hp, hp - 10);
    assert.equal(leader.states().length, states, "無敵などのStateを付けない");
    // 予備動作中に自分で少し歩いた(下へ0.5)。移動先(出発時に決めた地点)へ向かって着地する。
    player(w).setPosition(start.x, start.y + 0.5);
    frames(w, WINDUP + 1);
    near(pos(w).x, start.x + 5, 0.1, "固定した移動先のx");
    assert.ok(zetsuApi(w).getLastResult().ok);
});

test("二重発動なし: 予備動作中の別の絶は「teleportPending」で失敗して消費されない。終われば次を使える", () => {
    const w = zetsuWorld({ windup: WINDUP, level: 3 });
    aim(w, 4, 0); press(w, "Q");
    const mid = state(w);
    press(w, "E");
    const r = lastCard(w);
    assert.equal(r.ok, false);
    assert.equal(r.detail, "teleportPending");
    assert.deepEqual(state(w).hand, mid.hand, "手札は変わらない");
    assert.equal(state(w).cooldownPile.length, 0, "予約中はどちらも消費しない");
    frames(w, WINDUP + 1);
    assert.equal(state(w).cooldownPile.length, 1, "確定で消費されるのは最初の1枚だけ");
    assert.equal(modifiers(w).getMoveSpeedModifiers().length, 1, "速度係数は1つ");
    // 終わった後は使える(別の地点へ)
    centerOn(w); aim(w, 3, 0); press(w, "E");
    assert.equal(lastCard(w).reason, "pending", "新しい予約が始まる");
    frames(w, WINDUP + 1);
    assert.equal(modifiers(w).getMoveSpeedModifiers().length, 1, "再発動は置換");
});

test("Cooldownは確定(移動の瞬間)から数える。メニュー等でmapが止まれば予備動作も止まる", () => {
    const w = zetsuWorld({ windup: WINDUP });
    const start = pos(w);
    aim(w, 5, 0); press(w);
    const entry = () => state(w).cooldownPile[0] && state(w).cooldownPile[0].remainingSeconds;
    assert.equal(entry(), undefined, "予約中はCooldownが無い");
    w.ctx.$gameMap.eventsPaused = true;
    for (let i = 0; i < 30; i++) w.ctx.$gameMap.update(true);
    assert.deepEqual(pos(w), start, "eventsPaused中は予備動作が進まない");
    w.ctx.$gameMap.eventsPaused = false;
    frames(w, WINDUP + 1);
    near(pos(w).x, start.x + 5, 0.02);
    const r1 = entry();
    assert.ok(r1 <= 0.5 && r1 > 0.4, `確定直後 ${r1}`);
});

test("取り消し: 戦闘終了・マップ移動・ロードで予備動作は破棄され、後から移動も強化も起きない(召喚も片付く)", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        mapTransfer: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents())
    };
    for (const [name, cancel] of Object.entries(cases)) {
        const w = zetsuWorld({ windup: WINDUP });
        const start = pos(w);
        aim(w, 5, 0); press(w);
        assert.equal(zetsuApi(w).isTeleportPending(), true, name);
        const reserved = state(w);
        cancel(w);
        assert.equal(reserved.cooldownPile.length, 0, `${name}: 取り消し前から未消費`);
        assert.equal(zetsuApi(w).getLastResult().consumed, false, `${name}: 消費していない`);
        assert.equal(zetsuApi(w).isTeleportPending(), false, name);
        frames(w, WINDUP + 5);
        assert.deepEqual(pos(w), start, `${name}: 動かない`);
        assert.equal(modifiers(w).getWeaponHitBonus(), null, `${name}: 強化なし`);
        assert.equal(zetsuApi(w).getLastResult().cancelled, true);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, `${name}: 召喚なし`);
    }
});

test("実行時に着地できない場合(予備動作中に目的地のすぐ手前まで歩いた): 中止され、カード・Cooldown・補充・強化・到着の演出は何も起きない", () => {
    const w = zetsuWorld({ windup: WINDUP });
    withCalls(w);
    const start = pos(w);
    const before = state(w);
    aim(w, 5, 0); press(w);
    player(w).setPosition(start.x + 4.95, start.y); // 目的地(start+5)まで0.05タイル
    frames(w, WINDUP + 1);
    const r = zetsuApi(w).getLastResult();
    assert.equal(r.ok, false);
    assert.equal(r.aborted, true);
    assert.equal(r.consumed, false);
    assert.equal(r.wasted, undefined, "消費済みの失敗は存在しない");
    assert.deepEqual(state(w).hand, before.hand, "手札はそのまま");
    assert.equal(state(w).drawPile.length, before.drawPile.length, "補充されない");
    assert.equal(state(w).cooldownPile.length, 0, "Cooldownにも入らない");
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚も片付く");
    assert.equal(modifiers(w).getWeaponHitBonus(), null);
    assert.equal(w.vfx.filter(v => v.args.animationName === "ProjectR_Zetsu_Arrival").length, 0, "到着ノイズは出ない");
});

test("Hermesの一時召喚は主人公の真後ろ(包む位置)に出る。カード別の位置で、他のカードの表示は変えない", () => {
    const w = zetsuWorld({ windup: WINDUP });
    aim(w, 5, 0); press(w);
    frames(w, 3);
    const visual = w.ctx.ProjectRGodSummonVisual;
    const id = visual.getTransientEventId("hermes");
    assert.ok(id > 0, "表示Eventが現れる");
    const e = w.ctx.$gameMap.event(id);
    const expected = w.ctx.ProjectRCharacterPresentation.scaleSummonOffset({ x: 0, y: -0.25 });
    near(e._realX - player(w)._realX, expected.x, 0.05, "真後ろ(横ずれなし)");
    near(e._realY - player(w)._realY, expected.y, 0.05, "足元からの高さ");
    // 他のカード(旧Hermes剣術など)は既定の位置(右上)のまま
    const w2 = zetsuWorld({ order: ["hermes_reed_flute_sleep", ZETSU, ZETSU, ZETSU, ZETSU] });
    w2.ctx.ProjectRGodSummonManager.perform({ definition: { ringId: "hermes", cardId: "hermes_reed_flute_sleep" }, aim: false }, () => ({ ok: true }));
    frames(w2, 3);
    const e2 = w2.ctx.$gameMap.event(w2.ctx.ProjectRGodSummonVisual.getTransientEventId("hermes"));
    assert.ok(e2._realX - player(w2)._realX > 0.4, "既定は右側");
});

// ---------------- CrossArms中の銃スプライト ----------------
test("CrossArms中は構えた銃のスプライトを隠し、終わったら元の表示に戻す。装備・弾薬・リロード・攻撃可否は変えない", () => {
    const w = zetsuWorld({ windup: 0 });
    equip(w, GUN_ID); w.frames(5);
    const sys = w.ctx.ProjectRGunSystem, pres = w.ctx.ProjectRCharacterPresentation;
    const sprite = w.run("ShxWeaponSpriteH");
    assert.ok(sprite, "公式Display Weaponのスプライト");
    sprite.visible = true;
    const before = plain(sys.status());
    sys._applyKick();
    assert.equal(sprite.visible, true, "通常時は隠さない");
    pres.request("CrossArms", { frames: 30, source: "test" });
    sprite.visible = true; // 公式が毎フレーム置き直す状況
    sys._applyKick();
    assert.equal(sprite.visible, false, "腕クロス中は隠す");
    assert.equal(sys.status().weaponHidden, true);
    // 隠している間も、装備・弾薬・攻撃の可否は変わらない(撃てる)
    assert.equal(sys.status().equipped, true);
    assert.equal(sys.status().ammo, before.ammo);
    sprite.visible = true; sys._applyKick();
    assert.equal(sprite.visible, false, "毎フレーム置き直されても隠れたまま");
    assert.equal(sys.fire("test").ok, true, "撃てる");
    assert.equal(sys.status().ammo, before.ammo - 1, "弾薬は撃った分だけ");
    // 動作が終わる
    pres.release("CrossArms");
    sprite.visible = true;
    sys._applyKick();
    assert.equal(sprite.visible, true, "元の表示へ戻る");
    assert.equal(sys.status().weaponHidden, false);
    assert.equal(sys.status().equipped, true);
});

test("CrossArms中の銃: 隠す前から非表示だった場合は、終わっても勝手に表示しない。後始末(stop)でも元に戻る", () => {
    const w = zetsuWorld({ windup: 0 });
    equip(w, GUN_ID); w.frames(5);
    const sys = w.ctx.ProjectRGunSystem, pres = w.ctx.ProjectRCharacterPresentation;
    const sprite = w.run("ShxWeaponSpriteH");
    sprite.visible = false;
    pres.request("CrossArms", { frames: 30, source: "test" }); sys._applyKick();
    pres.release("CrossArms"); sys._applyKick();
    assert.equal(sprite.visible, false, "元が非表示なら非表示のまま");
    sprite.visible = true;
    pres.request("CrossArms", { frames: 30, source: "test" }); sys._applyKick();
    assert.equal(sprite.visible, false);
    sys._stop();
    assert.equal(sprite.visible, true, "戦闘終了などの後始末で復元");
});

test("実プレイ経路: 銃を持って絶を使うと、予備動作の間は銃が隠れ、移動の後(動作の終了後)に戻る", () => {
    const w = zetsuWorld({ windup: WINDUP });
    equip(w, GUN_ID); w.frames(5);
    const sprite = w.run("ShxWeaponSpriteH"), sys = w.ctx.ProjectRGunSystem;
    aim(w, 4, 0); press(w);
    sprite.visible = true; sys._applyKick();
    assert.equal(sprite.visible, false);
    frames(w, 60); // CrossArmsは約32frameで終わる
    assert.equal(w.ctx.ProjectRCharacterPresentation.isActive("CrossArms"), false);
    sprite.visible = true; sys._applyKick();
    assert.equal(sprite.visible, true, "終わったら戻る");
    assert.equal(sys.status().equipped, true);
});

// ---------------- Ultimateカットイン ----------------
function ultimateWorld() {
    const w = zetsuWorld({ windup: 0 });
    return w;
}
test("Ultimateカットイン: 発動に成功したときだけ、中央大型(横/縦ランダム)で出る。神と主人公の目元", () => {
    for (const [roll, orientation] of [[0.2, "horizontal"], [0.8, "vertical"]]) {
        const w = ultimateWorld();
        const cut = w.ctx.ProjectRCutIn;
        cut.setRandom(() => roll);
        w.frames(3);
        w.ctx.ProjectRCombatTestArena.fillGauge();
        w.tap("KeyU", 85);
        w.frames(3);
        const result = plain(w.ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
        assert.equal(result.ok, true, JSON.stringify(result));
        assert.equal(result.started, true);
        const active = plain(cut.getActive());
        assert.equal(active.length, 1);
        assert.deepEqual([active[0].kind, active[0].godId, active[0].orientation], ["ultimate", result.godId, orientation]);
        for (let i = 0; i < 100; i++) cut.tick();
        assert.equal(cut.getActive().length, 0, "自動で消える");
    }
});

test("Ultimateカットイン: 無効な試行(Gauge不足)・古い結果・ロード直後では出ない。Gauge/Divine HPには触れない", () => {
    const w = ultimateWorld();
    const cut = w.ctx.ProjectRCutIn;
    w.frames(3);
    const gauge = () => plain(w.ctx.ProjectRUltimateGauge.getUltimateGaugeState());
    const divine = () => plain(w.ctx.ProjectRGodSummonManager.getPersistentUltimateBattleState());
    const g0 = gauge(), d0 = divine();
    w.tap("KeyU", 85); w.frames(3); // Gauge 0 → 拒否される
    const rejected = plain(w.ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
    assert.equal(rejected.ok, false);
    assert.equal(cut.getActive().length, 0, "無効な試行では出ない");
    assert.deepEqual(gauge(), g0); assert.deepEqual(divine(), d0);
    // 同じ結果を何度読んでも出ない(シリアルが変わったときだけ)
    for (let i = 0; i < 5; i++) w.frames(1);
    assert.equal(cut.getActive().length, 0);
    // 成功した後、同じ結果で再度出ない
    w.ctx.ProjectRCombatTestArena.fillGauge(); w.tap("KeyU", 85); w.frames(3);
    assert.equal(cut.getActive().length, 1);
    cut.clear(); w.frames(10);
    assert.equal(cut.getActive().length, 0, "同じ結果では再表示しない");
    // ソース: 読み取りだけ(Gauge・Divine HP・ダメージ・クールダウンの更新APIを呼ばない)
    const code = read("js/plugins/ProjectR_CutIn.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const word of ["damagePersistentUltimate", "addGauge", "spendUltimate", "consume", "setUltimate", "UpdateEventHp"]) assert.ok(!code.includes(word), word);
});

test("Ultimateカットイン: 描画順は通常カットインと同じ(Vision層の上・操作キャラ複製の下)。HUDはWindow層で更に上", () => {
    const src = read("js/plugins/ProjectR_CutIn.js");
    assert.match(src, /this\._baseSprite\.addChild\(this\._projectRCutInLayer\)/);
    // 実際の描画順(Tilemap < Vision < CutIn)は ProjectR_HermesZetsu.presentation.test.cjs と実機で確認済み
});

// ---------------- 実機で見つかった欠陥の回帰テスト ----------------
test("HPの表示が1フレーム遅れる実機の仕様でも、命中した強化は消費される(公式HPバーを読む)。外れは消費しない", () => {
    // 実機: UpdateEventHpはバーのcurrentHpを即時に更新するが、getCurrentEventHpが読む変数はバーの次の更新で書かれる。
    const w = zetsuWorld({ windup: 0, level: 1 });
    const bars = w.ctx.SceneManager._scene._spriteset._eventHpBars;
    const event = w.ctx.$gameMap.event(4);
    const bar = { _event: event, currentHp: 1000, targetHp: 1000, _maxHp: 1000, _hpChangeDuration: 10, hpChangeFrames: 0,
        refresh() { /* 変数への書き込みは次のフレーム(update)で */ }, update() { w.ctx.$gameVariables._data[event.hpStorageId] = this.currentHp; } };
    w.ctx.$gameVariables._data[event.hpStorageId] = 1000;
    bars.push(bar);
    equip(w, SWORD_ID);
    const modifiers = w.ctx.ProjectRCardModifiers;
    const hit = () => {
        const interpreter = new w.ctx.Game_Interpreter(); interpreter._eventId = 0;
        w.run("globalThis.__random = Math.random; Math.random = () => 0.5;");
        const before = bar.currentHp;
        w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "4", value: "-player weapon", exceedMaxHealth: "false" });
        w.run("Math.random = globalThis.__random;");
        const dropped = before - bar.currentHp;
        bar.update(); // 次フレーム
        return dropped;
    };
    const plain1 = hit();
    assert.ok(plain1 > 0);
    assert.equal(w.ctx.$gameMap.getCurrentEventHp(4), 1000 - plain1, "変数は次フレームに追いつく");
    modifiers.armWeaponHitBonus({ id: "lag", multiplier: 2, seconds: 5 });
    // 外れ(回避)
    w.run("SHendrix_Action.prototype.itemEva = function() { return 1; };");
    assert.equal(hit(), 0);
    w.run("delete SHendrix_Action.prototype.itemEva;");
    assert.ok(modifiers.getWeaponHitBonus(), "外れでは消費されない");
    // 命中: 2倍になり、その場で消費される(変数がまだ古くても)
    assert.equal(hit(), plain1 * 2);
    assert.equal(modifiers.getWeaponHitBonus(), null, "命中したら消費される");
    assert.equal(hit(), plain1, "次は通常");
    assert.equal(modifiers.getWeaponHitLog().filter(e => e.type === "consumed").length, 1);
});

console.log(`${passed} Hermes Zetsu H2A tests passed`);
