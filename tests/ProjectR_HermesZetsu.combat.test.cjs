"use strict";
// Phase H1: 絶(Zetsu)の発動・消費・Cooldown・ダメージ強化・移動速度・後片付け。実エンジン(実Map004 + 全plugin)で、物理キーから通す。
// MZ実機・描画・音は対象外(実機は docs/ProjectR_HermesZetsu_H1.md の手順と証跡)。
const assert = require("node:assert/strict");
const fx = require("./ProjectR_HermesZetsuFixture.cjs");
const { plain, zetsuWorld, aim, deckApi, zetsuApi, modifiers, hand, state, player, pos, press, lastCard, near, ticks, attachHpBars, hpOf, weaponHit, equip,
    ZETSU, GUN_ID, SWORD_ID, OTHER } = fx;

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }
const hit = (w, id = 4, value) => weaponHit(w, id, value);
const bonus = w => plain(modifiers(w).getWeaponHitBonus());
const log = w => plain(modifiers(w).getWeaponHitLog());
// 画面のスクロールが残っているとマウスとの相対位置がずれるので、狙う前にカメラをプレイヤーへ合わせる(実機でもカメラは追従する)。
const teleport = (w, dx = 2, dy = 0, key = "Q") => { player(w).center(player(w)._realX, player(w)._realY); aim(w, dx, dy); press(w, key); return lastCard(w); };
const elapsedTicks = w => Math.round((0.8 - modifiers(w).getWeaponHitBonus().remaining) * 60);

// ---------------- 発動の成功・失敗 ----------------
test("成功: Qで移動・1枚消費・Cooldown0.5秒・即時補充・Hermes一時召喚・強化(Lv1 x1.5)が1つだけ", () => {
    const w = zetsuWorld({ level: 1 });
    const before = state(w), start = pos(w);
    assert.deepEqual(hand(w), [ZETSU, ZETSU, ZETSU, ZETSU, ZETSU]);
    const result = teleport(w, 5, 0);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.cardId, ZETSU);
    near(pos(w).x, start.x + 5, 0.01, "5タイル右へ");
    near(pos(w).y, start.y, 0.01);
    const after = state(w);
    assert.equal(after.hand.length, 5, "手札は5枚に補充される");
    assert.deepEqual(hand(w).slice(0, 4), [ZETSU, ZETSU, ZETSU, ZETSU]);
    assert.equal(hand(w)[4], "apollo_golden_arrow", "左に詰まり、新しい札が右端");
    assert.equal(after.drawPile.length, before.drawPile.length - 1);
    assert.equal(after.cooldownPile.length, 1);
    assert.equal(after.cooldownPile[0].instance.cardId, ZETSU);
    assert.ok(after.cooldownPile[0].remainingSeconds > 0.4 && after.cooldownPile[0].remainingSeconds <= 0.5, "Cooldown 0.5秒");
    assert.deepEqual(bonus(w).multiplier, 1.5);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length >= 1, true);
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons()[0].godId, "hermes");
    assert.equal(zetsuApi(w).getLastResult().ok, true);
    assert.equal(modifiers(w).moveSpeedFactor(), 1, "Lv1に速度強化はない");
});

test("失敗(行き先なし/壁に接して壁を指す): カード消費・Cooldown・補充・強化・移動・演出のどれも起きない", () => {
    for (const setup of ["noDestination", "blocked"]) {
        const w = zetsuWorld({ level: 3, x: 6, y: 25 });
        if (setup === "blocked") { w.placePlayer(6, 27); w.frames(1); }
        const beforeState = state(w), start = pos(w);
        const result = setup === "blocked" ? teleport(w, 0, 3) : teleport(w, 0, 0);
        assert.equal(result.ok, false, setup);
        assert.equal(result.reason, "activationFailed");
        assert.equal(result.detail, setup, "失敗の理由は診断に残る");
        assert.deepEqual(state(w), beforeState, `${setup}: 山札・手札・捨て札・Cooldownは何も変わらない`);
        assert.deepEqual(pos(w), start, `${setup}: 移動しない`);
        assert.equal(bonus(w), null, `${setup}: 強化なし`);
        assert.equal(modifiers(w).moveSpeedFactor(), 1, `${setup}: 速度係数なし`);
        assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, `${setup}: 神も出ない`);
        assert.deepEqual(plain(w.ctx.ProjectRCutIn.getActive()), [], `${setup}: カットインなし`);
        assert.equal(w.calls.filter(c => /Animation_Solution/.test(c.plugin)).length, 0, `${setup}: VFXなし`);
        assert.ok(!plain(w.ctx.ProjectRCharacterPresentation.history()).some(e => e.ok && e.name === "CrossArms"), `${setup}: 腕クロスの動作なし`);
        assert.equal(zetsuApi(w).getLastResult().ok, false);
    }
});

test("Cooldown: 使った1枚だけが0.5秒後に捨て札へ戻る。ほかの絶は即使える", () => {
    const w = zetsuWorld();
    teleport(w, 1, 0, "Q");
    const used = state(w).cooldownPile[0].instance.instanceId;
    assert.equal(state(w).discardPile.length, 0);
    const second = teleport(w, 1, 0, "Q");
    assert.equal(second.ok, true, "残りの絶は別のカード実体なので連続して使える");
    ticks(w, 40);
    const s = state(w);
    assert.ok(s.discardPile.some(c => c.instanceId === used), "0.5秒後に最初の1枚が捨て札へ戻る");
    ticks(w, 40);
    assert.equal(state(w).cooldownPile.length, 0);
});

// ---------------- ダメージ強化 ----------------
test("倍率: Lv1 x1.5 / Lv2 x2.0 / Lv3 x3.0(置換)。通常の剣・銃と同じ公式UpdateEventHp(-player weapon)の最終ダメージに1回だけ掛かる", () => {
    for (const [weapon, label] of [[SWORD_ID, "剣"], [GUN_ID, "銃"]]) {
        for (const [level, multiplier] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
            const w = zetsuWorld({ level });
            attachHpBars(w, [4]);
            equip(w, weapon);
            const plainDamage = hit(w);
            assert.ok(plainDamage > 0, `${label}: 通常ダメージ ${plainDamage}`);
            assert.equal(teleport(w, 2, 0).ok, true);
            assert.equal(bonus(w).multiplier, multiplier, `Lv${level}`);
            assert.equal(hit(w), Math.round(plainDamage * multiplier), `${label} Lv${level}: x${multiplier}(6.5や9.0ではない)`);
            assert.equal(hit(w), plainDamage, `${label} Lv${level}: 2発目は通常ダメージ(強化は1回で消費)`);
            assert.equal(bonus(w), null);
        }
    }
});

test("実弾: 銃(ProjectR_GunSystem)の実際の弾が敵に命中したときの最終ダメージにLv別の倍率が掛かり、次の弾は通常に戻る", () => {
    for (const [level, multiplier] of [[1, 1.5], [2, 2.0], [3, 3.0]]) {
        const w = zetsuWorld({ level, x: 11, y: 12 });
        attachHpBars(w, [4, 5, 6]);
        equip(w, GUN_ID);
        w.frames(3);
        w.run("Math.random = () => 0.5;"); // 命中/会心/分散を固定
        const target = w.ctx.$gameMap.event(4);
        w.placePlayer(target._realX - 6, target._realY);
        w.frames(2);
        const shoot = () => { w.mouse(target.screenX(), target.screenY() - 24); const r = w.ctx.ProjectRGunSystem.fire("test"); assert.equal(r.ok, true, JSON.stringify(r)); w.frames(20); };
        const hp0 = hpOf(w, 4);
        shoot();
        const base = hp0 - hpOf(w, 4);
        assert.ok(base > 0, `基準の弾が命中 ${base}`);
        w.frames(12);
        // 敵に向かって1タイル(強化が切れる前に撃つ)。
        w.mouse(w.ctx.$gamePlayer.screenX() + 48, w.ctx.$gamePlayer.screenY());
        w.tap("KeyQ", 81);
        assert.equal(w.ctx.ProjectRCardBattleInput.getLastResult().ok, true);
        const hp1 = hpOf(w, 4);
        shoot();
        assert.equal(hp1 - hpOf(w, 4), Math.round(base * multiplier), `Lv${level}: 実弾の最終ダメージ x${multiplier}`);
        const hp2 = hpOf(w, 4);
        w.frames(12);
        shoot();
        assert.equal(hp2 - hpOf(w, 4), base, `Lv${level}: 次の弾は通常ダメージ`);
        assert.equal(w.calls.filter(c => c.name === "UpdateEventHp").length, 3, "弾1発につきダメージコマンドは1回(二重適用なし)");
    }
});

test("外れ(回避)・無効・0ダメージは消費しない。時間内に当たれば強化が使える", () => {
    const w = zetsuWorld();
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    const plainDamage = hit(w);
    teleport(w, 2, 0);
    const remaining = modifiers(w).getWeaponHitBonus().remaining;
    w.run("SHendrix_Action.prototype.itemEva = function() { return 1; };"); // 必ず回避される
    assert.equal(hit(w), 0, "外れ: ダメージなし");
    w.run("delete SHendrix_Action.prototype.itemEva;");
    assert.equal(bonus(w).multiplier, 1.5, "外れでは消費されない");
    assert.ok(bonus(w).remaining <= remaining + 1e-9 && bonus(w).remaining > 0, "残り時間も保たれる");
    assert.ok(log(w).some(e => e.type === "missed"));
    assert.equal(hit(w), Math.round(plainDamage * 1.5), "次に命中した1回に強化");
    assert.ok(log(w).filter(e => e.type === "consumed").length === 1);
});

test("0.8秒(戦闘時間48 tick)で自動的に消える。47 tickまでは有効、48 tickめで失効", () => {
    const w = zetsuWorld();
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    const plainDamage = hit(w);
    teleport(w, 2, 0);
    const k = elapsedTicks(w);
    assert.ok(k >= 0 && k <= 6, `発動直後の経過tick ${k}`);
    ticks(w, 47 - k);
    assert.ok(bonus(w), "47 tick目まで有効");
    assert.equal(hit(w), Math.round(plainDamage * 1.5), "47 tick目に当てれば強化");
    // 別の発動で48 tickめの失効を確認
    const w2 = zetsuWorld();
    attachHpBars(w2, [4]); equip(w2, SWORD_ID);
    const plain2 = hit(w2);
    teleport(w2, 2, 0);
    ticks(w2, 48 - elapsedTicks(w2));
    assert.equal(bonus(w2), null, "48 tickで失効");
    assert.equal(hit(w2), plain2, "失効後の命中は通常ダメージ");
    assert.ok(log(w2).some(e => e.type === "expired"));
});

test("対象外: カード攻撃(<dmg:>/damage式)・継続ダメージ(数値)・プレイヤーへのダメージでは消費も強化もしない", () => {
    const w = zetsuWorld({ level: 3 });
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    teleport(w, 2, 0);
    const before = bonus(w);
    // 継続ダメージ相当(固定値)は、そのまま。強化されず、強化も消費されない。
    assert.equal(hit(w, 4, "-25"), 25);
    assert.deepEqual(bonus(w), before, "数値のダメージでは消費しない");
    // カード攻撃が使う -damage(<dmg:>のSkillダメージ)。ここではダメージ源が無いので0のまま。強化は残る。
    assert.equal(hit(w, 4, "-damage"), 0);
    assert.deepEqual(bonus(w), before);
    // プレイヤー対象の「player weapon」(敵の攻撃と取り違えない)
    const interpreter = new w.ctx.Game_Interpreter();
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", { eventId: "player", value: "-player weapon", exceedMaxHealth: "false" });
    assert.deepEqual(bonus(w), before, "プレイヤー対象では消費しない");
    assert.ok(hit(w) > 0 && bonus(w) === null, "通常武器の命中だけが消費する");
});

test("公式クリティカルとは二重にならない: 強化中は公式のクリティカル抽選を止め、終わったら元の関数へ戻す", () => {
    const w = zetsuWorld({ level: 1 });
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    w.run("globalThis.__itemCri = SHendrix_Action.prototype.itemCri; SHendrix_Action.prototype.itemCri = function() { return 0; };");
    const plainDamage = hit(w);
    w.run("SHendrix_Action.prototype.itemCri = function() { return 1; };"); // 公式クリティカルが必ず出る
    const critDamage = hit(w);
    assert.ok(critDamage > plainDamage, `前提: 公式クリティカルは別物 ${critDamage} > ${plainDamage}`);
    teleport(w, 2, 0);
    const boosted = hit(w);
    assert.equal(boosted, Math.round(plainDamage * 1.5), `強化ヒット=通常x1.5。公式クリティカル(${critDamage})を掛け合わせない`);
    assert.notEqual(boosted, Math.round(critDamage * 1.5));
    assert.equal(hit(w), critDamage, "強化が終われば、公式クリティカルは元どおり働く(関数が戻っている)");
    w.run("SHendrix_Action.prototype.itemCri = globalThis.__itemCri;");
});

test("強化が無いときは公式コマンドをそのまま通す(通常の銃・剣の挙動は変わらない)", () => {
    const w = zetsuWorld();
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    const interpreter = new w.ctx.Game_Interpreter();
    const args = { eventId: "4", value: "-player weapon", exceedMaxHealth: "false" };
    let seen = null;
    const key = "Hendrix_Action_Engine:UpdateEventHp";
    const wrapped = w.ctx.PluginManager._commands[key];
    assert.equal(wrapped.__projectRCardModifiers, true, "窓口は1回だけ包まれている");
    w.ctx.PluginManager.callCommand(interpreter, "Hendrix_Action_Engine", "UpdateEventHp", args);
    assert.deepEqual(args, { eventId: "4", value: "-player weapon", exceedMaxHealth: "false" }, "引数は書き換えない");
    assert.equal(seen, null);
});

// ---------------- 複数コピー ----------------
test("複数コピー: 5枚すべて絶でも、各キー1回=1回の移動・1枚消費。強化は常に1つで、命中は1回だけ強化", () => {
    const w = zetsuWorld({ level: 2 });
    attachHpBars(w, [4]);
    equip(w, SWORD_ID);
    const plainDamage = hit(w);
    const start = pos(w);
    // 使うたびに手札は左へ詰まるので、先頭(Q)の絶を5回使い切る(2枚目以降のキーは次のテストで確認)。
    for (let i = 0; i < 5; i++) {
        assert.equal(hand(w)[0], ZETSU, `${i + 1}回目の先頭は絶`);
        const r = teleport(w, 1, 0, "Q");
        assert.equal(r.ok, true, `${i + 1}回目: ${JSON.stringify(r)}`);
    }
    near(pos(w).x, start.x + 5, 0.01, "5回=5タイル(二重発動なし)");
    assert.equal(state(w).cooldownPile.length, 5, "消費した5枚がそれぞれCooldown");
    assert.equal(log(w).filter(e => e.type === "armed").length, 5, "発動ごとに用意するが、");
    assert.equal(bonus(w).multiplier, 2.0, "強化は置換されて常に1つ(Lv2 x2.0)");
    assert.equal(hit(w), Math.round(plainDamage * 2.0), "命中は1回だけ強化(5重にならない)");
    assert.equal(hit(w), plainDamage);
});

test("複数コピー: 同じフレームの2キーは、先に1枚が移動し、2枚目は同じ地点を指すので行き先なしで失敗(消費しない)。押しっぱなし(repeat)は再発動しない", () => {
    const w = zetsuWorld();
    player(w).center(player(w)._realX, player(w)._realY);
    aim(w, 3, 0);
    const start = pos(w);
    w.keyDown("KeyQ", 81); w.keyDown("KeyE", 69);
    w.frames(2);
    near(pos(w).x, start.x + 3, 0.01, "マウスの地点へ1回だけ移動");
    w.keyUp("KeyQ", 81); w.keyUp("KeyE", 69); w.frames(2);
    assert.equal(state(w).cooldownPile.length, 1, "2枚目は消費されない(Cooldownに入るのは1枚)");
    assert.equal(hand(w).filter(id => id === ZETSU).length, 4);
    assert.equal(log(w).filter(e => e.type === "armed").length, 1, "強化も1回だけ用意");
    assert.equal(w.ctx.ProjectRCardBattleInput.getLastResult().detail, "noDestination");
    // 押しっぱなし
    const held = zetsuWorld();
    aim(held, 1, 0);
    const s = pos(held);
    held.keyDown("KeyQ", 81);
    held.keyDown("KeyQ", 81, { repeat: true }); held.keyDown("KeyQ", 81, { repeat: true });
    held.frames(6);
    near(pos(held).x, s.x + 1, 0.01, "repeatでは増えない");
    held.keyUp("KeyQ", 81);
});

// ---------------- 移動速度(Lv3) ----------------
test("Lv3: 移動後1秒だけ実効移動速度x2.0。解除後は元の速度に戻り、他の係数・_moveSpeedを壊さない", () => {
    const w = zetsuWorld({ level: 3 });
    const base = player(w).distancePerFrame();
    const moveSpeed = player(w)._moveSpeed;
    modifiers(w).setMoveSpeedFactor("other", 1.5, 5);
    near(player(w).distancePerFrame(), base * 1.5, 1e-12, "他の係数");
    assert.equal(teleport(w, 2, 0).ok, true);
    assert.equal(modifiers(w).moveSpeedFactor(), 3, "他の係数と積(1.5 x 2.0)");
    near(player(w).distancePerFrame(), base * 3, 1e-12);
    assert.equal(player(w)._moveSpeed, moveSpeed, "_moveSpeedは触らない");
    const entry = plain(modifiers(w).getMoveSpeedModifiers()).find(e => e.id === ZETSU);
    assert.ok(entry && entry.remaining > 0.9 && entry.remaining <= 1, `1秒: ${entry.remaining}`);
    ticks(w, 70);
    assert.equal(modifiers(w).moveSpeedFactor(), 1.5, "絶の係数だけが消え、他の係数は残る");
    near(player(w).distancePerFrame(), base * 1.5, 1e-12);
    modifiers(w).clearMoveSpeedFactor("other");
    assert.equal(player(w).distancePerFrame(), base, "完全に元の値へ戻る");
    assert.equal(player(w)._moveSpeed, moveSpeed);
});

test("Lv1・Lv2は移動速度を変えない。Lv3の再発動は置換(x4にならない)", () => {
    for (const level of [1, 2]) {
        const w = zetsuWorld({ level });
        teleport(w, 2, 0);
        assert.equal(modifiers(w).moveSpeedFactor(), 1, `Lv${level}`);
        assert.deepEqual(plain(modifiers(w).getMoveSpeedModifiers()), []);
    }
    const w = zetsuWorld({ level: 3 });
    teleport(w, 1, 0, "Q"); teleport(w, 1, 0, "E");
    assert.equal(modifiers(w).moveSpeedFactor(), 2, "x2.0のまま");
});

// ---------------- 後片付け・保存 ----------------
test("戦闘終了・マップ移動・ロードで、強化と速度係数は残らない。保存データに新しい項目を作らない", () => {
    const cases = {
        battleEnd: w => deckApi(w).endCardBattle(),
        mapTransfer: w => w.ctx.$gameMap.setup(4),
        load: w => w.ctx.DataManager.extractSaveContents(w.ctx.DataManager.makeSaveContents())
    };
    for (const [name, clearIt] of Object.entries(cases)) {
        const w = zetsuWorld({ level: 3 });
        const keysBefore = Object.keys(w.ctx.$gameSystem).sort();
        teleport(w, 2, 0);
        assert.ok(bonus(w) && modifiers(w).moveSpeedFactor() === 2, name);
        assert.deepEqual(Object.keys(w.ctx.$gameSystem).sort(), keysBefore, "$gameSystemに新しい保存項目を作らない");
        const saved = JSON.stringify(w.ctx.DataManager.makeSaveContents());
        assert.doesNotMatch(saved, /ProjectRCardModifiers|weaponHitBonus|moveSpeedFactor|pendingZetsu/, "強化・速度係数は保存しない");
        clearIt(w);
        assert.equal(bonus(w), null, `${name}: 強化なし`);
        assert.equal(modifiers(w).moveSpeedFactor(), 1, `${name}: 速度は元に戻る`);
    }
});

test("操作できない間(メッセージ表示中)は戦闘時間が進まず、強化の時間も進まない", () => {
    const w = zetsuWorld();
    teleport(w, 2, 0);
    const before = bonus(w).remaining;
    w.ctx.$gameMessage.add("busy");
    w.frames(30);
    assert.equal(bonus(w).remaining, before, "メッセージ中は止まる");
    w.ctx.$gameMessage.clear();
    w.frames(3);
    assert.ok(bonus(w).remaining < before, "再開すれば進む");
});

test("ルーター側で消費に失敗した場合は、移動・強化・速度・召喚が一切残らない(予備動作を始めない)", () => {
    const w = zetsuWorld({ level: 3 });
    const start = pos(w);
    const m = modifiers(w);
    const summons = w.ctx.ProjectRGodSummonManager, originalPerform = summons.perform;
    // 発動handlerが成功を返した直後に手札が変わる(= ルーターが消費に失敗する)状況を作る
    summons.perform = function() {
        const result = originalPerform.apply(this, arguments);
        deckApi(w).useBattleCard(deckApi(w).getBattleState().hand[0].instanceId);
        return result;
    };
    aim(w, 3, 0);
    const result = plain(deckApi(w).requestUseCard(0));
    summons.perform = originalPerform;
    assert.equal(result.ok, false);
    assert.equal(result.reason, "activationFailed");
    assert.deepEqual(pos(w), start, "位置を戻す");
    assert.equal(bonus(w), null, "強化を外す");
    assert.equal(m.moveSpeedFactor(), 1, "速度係数を外す");
    assert.equal(w.ctx.ProjectRGodSummonManager.getActiveSummons().length, 0, "召喚を片付ける");
    assert.equal(zetsuApi(w).getLastResult().rolledBack, true);
    assert.equal(zetsuApi(w).isTeleportPending(), false, "予備動作も始まらない");
    w.frames(30);
    assert.deepEqual(pos(w), start, "後から移動することもない");
    assert.deepEqual(plain(w.ctx.ProjectRCutIn.getActive()), [], "成功演出は出ない");
    assert.equal(w.calls.filter(c => /Animation_Solution/.test(c.plugin)).length, 0, "VFXも出ない");
});

test("他のgroundカード(葦笛)は絶の追加で影響を受けず、そのまま既存handlerへ渡る", () => {
    const w = zetsuWorld({ order: ["hermes_reed_flute_sleep", ZETSU, ZETSU, ZETSU, ZETSU] });
    const reed = deckApi(w).definitions.card("hermes_reed_flute_sleep");
    assert.equal(reed.targetType, "ground");
    const start = pos(w);
    const result = plain(deckApi(w).requestUseCard(0)); // 周囲に敵がいないので葦笛は失敗する(従来どおり)
    assert.equal(result.ok, false);
    assert.deepEqual(pos(w), start, "葦笛は移動しない");
    assert.equal(bonus(w), null, "葦笛は絶の強化を用意しない");
    assert.equal(w.ctx.ProjectRHermesReedFluteSleep.getLastDiagnostic().detail, "noEnemyInRange");
});

console.log(`${passed} Hermes Zetsu combat tests passed`);
