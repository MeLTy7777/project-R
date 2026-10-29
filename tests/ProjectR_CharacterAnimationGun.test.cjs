"use strict";
// Character Animation Foundation + 新銃(G17)の検証。実エンジン(実rmmz_* + DotMoveSystem + Hendrix_Action_Engine + 全ProjectR plugin)を
// 本番のplugin順で読み込み、実Map004で物理キー/攻撃入力から通す。MZ実機の見た目・音・実マウスは対象外
// (docs/ProjectR_NewGunSystem.md / ProjectR_CharacterAnimation.md の手動確認を参照)。
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildWorld, plain } = require("./RealEngineHarness.cjs");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const json = file => JSON.parse(read(file));

let passed = 0;
function test(name, fn) { fn(); console.log(`ok ${++passed} - ${name}`); }

const KEYS = { Q: ["KeyQ", 81], E: ["KeyE", 69], X: ["KeyX", 88], C: ["KeyC", 67], V: ["KeyV", 86], U: ["KeyU", 85], R: ["KeyR", 82], J: ["KeyJ", 74] };
const press = (w, key) => w.tap(...KEYS[key]);
const GUN_ID = 51, AMMO_ITEM = 31;

// dev3h:false(既定)は従来の検証用に「標準48pxの素のプロファイル」へ差し替える(DEV3Hの寸法・アンカー・行動スプライトを除く)。
// dev3h:true は本番の内蔵プロファイル(DEV3H 三頭身)のまま使う。
function arena(god = "hermes", { x = 11, y = 16, mouse = [700, 300], dev3h = false } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(...mouse);
    const started = w.ctx.ProjectRCombatTestArena.startScenario(god);
    assert.equal(started.ok, true, JSON.stringify(started));
    w.frames(2);
    if (!dev3h) w.ctx.ProjectRCharacterPresentation.registerProfile({ id: "protagonist", actorId: 1, heads: 3, visualScale: 1, visualHeightPx: 0, directions: 4 });
    w.played = []; w.calls = [];
    w.ctx.AudioManager.playSe = se => { w.played.push(se.name); };
    const original = w.ctx.PluginManager.callCommand;
    w.ctx.PluginManager.callCommand = function(interpreter, plugin, name) { w.calls.push(name); return original.apply(this, arguments); };
    return w;
}
function equipGun(w, { ammo = 7, reserve = 30 } = {}) {
    const { ctx } = w;
    ctx.$gameParty.leader().forceChangeEquip(0, ctx.$dataWeapons[GUN_ID]);
    ctx.$gameParty.loseItem(ctx.$dataItems[AMMO_ITEM], ctx.$gameParty.numItems(ctx.$dataItems[AMMO_ITEM]));
    ctx.$gameParty.gainItem(ctx.$dataItems[AMMO_ITEM], reserve);
    ctx.$gameSystem.setGunAmmo(GUN_ID, ammo);
    w.frames(3);
}
const sys = w => w.ctx.ProjectRGunSystem;
const pres = w => w.ctx.ProjectRCharacterPresentation;
const historyNames = w => plain(pres(w).history()).filter(e => e.ok).map(e => e.name);
const bulletEvents = w => w.ctx.$gameMap.events().filter(e => e.event().note.includes("<projectRGunBullet>"));
const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message || ""} ${a} vs ${b}`);
const deckApi = w => w.ctx.ProjectRCardDeck;

// ---------------- CharacterVisualProfile ----------------
test("プラグインは本番順(CharacterPresentation → WeaponPresentation → GunSystem)で登録・読み込みされる", () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    const names = JSON.parse(JSON.stringify(w.ctx.$plugins)).map(p => p.name);
    const index = name => names.indexOf(name);
    for (const [a, b] of [["ProjectR_UltimateActivation", "ProjectR_CharacterPresentation"], ["ProjectR_CharacterPresentation", "ProjectR_WeaponPresentation"],
        ["ProjectR_WeaponPresentation", "ProjectR_GunSystem"], ["ProjectR_GunSystem", "ProjectR_CombatTestArenaFullSpec"]]) {
        assert.ok(index(a) >= 0 && index(b) > index(a), `${a} < ${b}`);
    }
    for (const name of ["ProjectR_CharacterPresentation", "ProjectR_GunSystem"]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", "js/plugins", `${name}.js`)));
        assert.equal(w.ctx.$plugins.find(p => p.name === name).status, true);
    }
});

test("プロファイル: 既定(主人公=三頭身の宣言・標準48px)と、キャラごとの独立した上書き。全体倍率は存在しない", () => {
    const w = arena();
    const api = pres(w);
    const base = api.profileForPlayer();
    assert.equal(base.id, "protagonist"); assert.equal(base.actorId, 1); assert.equal(base.heads, 3);
    assert.equal(base.visualScale, 1, "拡大で三頭身にしない(大きい画像で作る)");
    assert.equal(base.hitbox, null, "hitboxは見た目と別・未指定なら一切変更しない");
    api.registerProfile({ id: "small", actorId: 2, heads: 2.5, visualScale: 1, visualHeightPx: 80 });
    api.registerProfile({ id: "tall", actorId: 3, heads: 3.5, visualScale: 1, visualHeightPx: 168, directions: 8 });
    assert.equal(api.profileForActor(2).heads, 2.5); assert.equal(api.profileForActor(3).heads, 3.5);
    assert.equal(api.profileForActor(3).directions, 8);
    assert.equal(api.profileForPlayer().id, "protagonist", "他キャラの登録は主人公に影響しない");
    assert.deepEqual(plain(api.profileIds().sort()), ["default", "protagonist", "small", "tall"]);
    assert.equal(api.registerProfile({ heads: 3 }), null, "idの無いプロファイルは拒否");
    assert.equal(Object.isFrozen(base), true, "プロファイルは静的(実行中に書き換わらない)");
});

test("見た目の高さ/倍率とhitboxは別々: 背を高くしても当たり判定は変わらず、hitboxは明示指定時だけ公式コマンドで適用される", () => {
    const w = arena();
    const api = pres(w);
    api.registerProfile({ id: "protagonist", actorId: 1, heads: 3, visualHeightPx: 144, visualScale: 1 });
    assert.equal(api.visualHeight(), 144);
    assert.equal(api.applyHitbox(), false, "hitbox未指定なら何もしない");
    assert.ok(!w.calls.includes("ChangePlayerHitbox"));
    api.registerProfile({ id: "protagonist", actorId: 1, heads: 3, visualHeightPx: 144, visualScale: 1,
        hitbox: { width: 0.8, height: 0.8, offsetX: 0, offsetY: 6 } });
    assert.equal(api.visualHeight(), 144, "hitboxを指定しても見た目の高さは変わらない");
    assert.equal(api.applyHitbox(), true);
    assert.deepEqual(w.calls.filter(c => c === "ChangePlayerHitbox").length, 1);
    api.registerProfile({ id: "protagonist", actorId: 1, visualHeightPx: 96, visualScale: 2 });
    assert.equal(api.visualHeight(), 192, "visualScaleは高さに掛かる(データだけで変更できる)");
});

test("アンカー: 武器/近接/VFX/召喚は見た目の高さに追従し、銃口は照準角で回転する(右/上/左・side・倍率・武器別)", () => {
    const w = arena();
    const api = pres(w);
    const feet = { x: w.ctx.$gamePlayer.screenX(), y: w.ctx.$gamePlayer.screenY() };
    // 標準48px: 従来と同じ(体の中心=足元-24)
    for (const name of ["weapon", "melee", "vfx", "summon", "aim"]) {
        assert.deepEqual(plain(api.anchorScreen(name)), { x: feet.x, y: feet.y - 24 }, name);
    }
    api.registerProfile({ id: "protagonist", actorId: 1, visualHeightPx: 144, anchors: { melee: { x: 4, y: -60 } } });
    assert.deepEqual(plain(api.anchorScreen("weapon")), { x: feet.x, y: feet.y - 72 }, "高さ144なら中心は足元-72");
    assert.deepEqual(plain(api.anchorScreen("melee")), { x: feet.x + 4, y: feet.y - 60 }, "個別指定が優先");
    assert.deepEqual(plain(api.scaleSummonOffset({ x: -0.75, y: -0.75 })), { x: -0.75, y: -2.25 }, "神の召喚オフセットも高さに追従");
    api.registerProfile({ id: "protagonist", actorId: 1, visualHeightPx: 48 });
    assert.deepEqual(plain(api.scaleSummonOffset({ x: -0.75, y: -0.75 })), { x: -0.75, y: -0.75 }, "48pxなら無変更");
    // 銃口
    const pivot = { x: 100, y: 100 };
    const at = (degree, extra = {}) => plain(api.muzzleScreen({ degree, pivot, ...extra }));
    const close = (p, x, y) => { near(p.x, x, 1e-6, "x"); near(p.y, y, 1e-6, "y"); };
    close(at(90), 140, 100); close(at(0), 100, 60); close(at(180), 100, 140); close(at(270), 60, 100);
    api.registerProfile({ id: "protagonist", actorId: 1, visualHeightPx: 48, anchors: { muzzle: { forward: 40, side: 5 } } });
    close(at(90), 140, 105);    // 右向き: sideは画面下
    close(at(270), 60, 105);    // 左向き: Display Weaponがscale.y=-1で反転するのでsideも反転(銃は上下が逆に回る)
    api.registerProfile({ id: "protagonist", actorId: 1, visualScale: 2, visualHeightPx: 48, anchors: { muzzle: { forward: 40, side: 0 } },
        muzzleByWeapon: { [GUN_ID]: { forward: 30 } } });
    close(at(90), 180, 100);    // 倍率2: forward 40 → 80(回転中心100から)
    close(at(90, { weaponId: GUN_ID }), 160, 100); // 武器別 forward 30 × 倍率2 = 60
    assert.equal(api.muzzleScreen({ degree: NaN, pivot }), null);
});

// ---------------- 動作コントローラ ----------------
test("動作: Idle/Walk/Run/Aim/Downは基本状態、剣/銃/Reload/Cast/Ultimate/Damageは行動。終われば必ず基本状態へ戻る", () => {
    const w = arena();
    const { ctx } = w, api = pres(w);
    w.frames(2);
    assert.equal(api.baseline(), "Idle");
    ctx.$gamePlayer.isMoving = () => true; ctx.$gamePlayer.isDashing = () => false;
    assert.equal(api.baseline(), "Walk");
    ctx.$gamePlayer.isDashing = () => true;
    assert.equal(api.baseline(), "Run");
    delete ctx.$gamePlayer.isMoving; delete ctx.$gamePlayer.isDashing;
    assert.equal(api.baseline(), "Idle", "止まればWalk/Runに残らない");
    for (const name of ["SwordAttack", "GunFire", "GunReload", "SkillCast", "Ultimate", "Damage"]) {
        const result = api.request(name, { frames: 5, degree: 90 });
        assert.equal(result.ok, true, name);
        assert.equal(api.current().name, name);
        assert.equal(api.current().action, true);
        w.frames(7);
        assert.equal(api.current().name, "Idle", `${name}の後はIdleに戻る`);
        assert.equal(api.current().action, false);
        assert.deepEqual(plain(api.offsets()), { dx: 0, dy: 0, sy: 1, name: "Idle" });
    }
    assert.equal(api.request("Fly").ok, false);
    assert.deepEqual(plain(api.PRIORITY), plain({ Idle: 10, Walk: 20, Run: 30, Aim: 40, SwordAttack: 60, GunFire: 60, Damage: 65, GunReload: 70, SkillCast: 80, CrossArms: 80, Ultimate: 90, Down: 100 }));
    ctx.$gameParty.leader().setHp(0);
    assert.equal(api.baseline(), "Down");
});

test("優先度: 低い動作は高い動作を上書きできない。移動(Walk/Run)は攻撃の1フレーム目を上書きしない。入力・移動は止めない", () => {
    const w = arena();
    const { ctx } = w, api = pres(w);
    assert.equal(api.request("Ultimate", { frames: 10 }).ok, true);
    const low = api.request("SkillCast", { frames: 10 });
    assert.deepEqual([low.ok, low.reason, low.by], [false, "lowerPriority", "Ultimate"]);
    assert.equal(api.request("SwordAttack", { frames: 10 }).ok, false);
    assert.equal(api.current().name, "Ultimate");
    api.release("Ultimate");
    assert.equal(api.request("SwordAttack", { frames: 10, degree: 90 }).ok, true);
    ctx.$gamePlayer.isMoving = () => true; ctx.$gamePlayer.isDashing = () => true;
    w.frames(1);
    assert.equal(api.current().name, "SwordAttack", "走っていても攻撃動作の最初の1フレームから上書きされない");
    assert.equal(api.request("SkillCast", { frames: 6 }).ok, true, "高い動作は低い動作に割り込む");
    assert.deepEqual(plain(api.activeNames()), ["SkillCast"]);
    w.frames(8);
    assert.equal(api.current().name, "Run", "終われば現在の移動状態(Run)へ");
    delete ctx.$gamePlayer.isMoving; delete ctx.$gamePlayer.isDashing;
    // 表示だけ: プレイヤーの入力・移動の可否は動作中も変わらない
    api.request("Ultimate", { frames: 20 });
    assert.equal(ctx.$gamePlayer.canMove(), true);
});

test("手続き的モーション: 動作中はaim方向に体が動き(剣=踏み込み/銃=反動=逆方向)、終わると元の位置に戻る。倍率が掛かる", () => {
    const w = arena();
    const api = pres(w);
    api.request("SwordAttack", { frames: 14, degree: 90 });
    for (let i = 0; i < 7; i++) api.tick();
    const sword = plain(api.offsets());
    assert.ok(sword.dx > 3 && Math.abs(sword.dy) < 1e-6, `右向きの剣は右へ踏み込む ${JSON.stringify(sword)}`);
    api.clear();
    api.request("GunFire", { frames: 9, degree: 90 });
    api.tick(); api.tick();
    assert.ok(plain(api.offsets()).dx < -1, "銃の反動は照準と逆(左)へ");
    api.clear();
    api.request("SkillCast", { frames: 26 });
    for (let i = 0; i < 13; i++) api.tick();
    const cast = plain(api.offsets());
    assert.ok(cast.dy < -3 && cast.sy > 1, "詠唱は少し跳ねて伸びる");
    api.clear();
    api.request("Ultimate", { frames: 42 });
    for (let i = 0; i < 21; i++) api.tick();
    assert.ok(plain(api.offsets()).dy < cast.dy, "奥義は詠唱より大きく動く");
    api.clear();
    api.registerProfile({ id: "protagonist", actorId: 1, visualScale: 2 });
    api.request("SwordAttack", { frames: 14, degree: 90 });
    for (let i = 0; i < 7; i++) api.tick();
    near(plain(api.offsets()).dx, sword.dx * 2, 1e-6, "visualScale 2 で動きも2倍");
});

test("Sprite_Character: 動作中だけ主人公のスプライトにオフセット/伸縮を足し、終われば元へ。左右反転(scale.x符号)は壊さない", () => {
    const w = arena();
    const { ctx } = w, api = pres(w);
    const sprite = new ctx.RealSprite_Character(ctx.$gamePlayer);
    sprite.updatePosition();
    const base = { x: sprite.x, y: sprite.y, sx: sprite.scale.x, sy: sprite.scale.y };
    api.request("SkillCast", { frames: 26 });
    for (let i = 0; i < 13; i++) api.tick();
    sprite.updatePosition();
    assert.ok(sprite.y < base.y - 3, "跳ねる");
    assert.ok(sprite.scale.y > 1, "縦に伸びる");
    sprite.scale.x = -1;
    sprite.updatePosition();
    assert.ok(sprite.scale.x < 0, "反転は保たれる");
    api.clear();
    sprite.scale.x = 1;
    sprite.updatePosition();
    assert.deepEqual([sprite.x, sprite.y, sprite.scale.x, sprite.scale.y], [base.x, base.y, base.sx, base.sy]);
});

test("公式Animation Solution: プロファイルに行動スプライトがあれば setImage + playFrames で再生し、終了後は元の見た目へ戻る", () => {
    const w = arena();
    const { ctx } = w, api = pres(w);
    const original = ctx.$gamePlayer.characterName();
    api.registerProfile({ id: "protagonist", actorId: 1, actions: { SwordAttack: { sprite: "$hero_sword_f6", frames: 6, speed: 3 } } });
    const result = api.request("SwordAttack", { degree: 90 });
    assert.equal(result.ok, true); assert.equal(result.official, true);
    assert.equal(ctx.$gamePlayer.characterName(), "$hero_sword_f6");
    assert.equal(ctx.$gamePlayer._isPlayingFrames, true, "公式playFramesが走る");
    assert.deepEqual(plain(api.offsets()), { dx: 0, dy: 0, sy: 1, name: "SwordAttack" }, "公式スプライトのときは仮モーションを足さない");
    for (let i = 0; i < 18; i++) { ctx.$gamePlayer.update(); }
    assert.equal(ctx.$gamePlayer.characterName(), original, "最後の攻撃フレームに留まらず元の画像へ戻る");
    assert.equal(api.current().action, false);
    // マップ移動で行動スプライトを持ち越さない
    api.request("SwordAttack", { degree: 90 });
    assert.equal(ctx.$gamePlayer.characterName(), "$hero_sword_f6");
    w.enterMap(4, 11, 16);
    assert.equal(ctx.$gamePlayer.characterName(), original);
    assert.equal(pres(w).activeNames().length, 0);
});

// ---------------- カード / Ultimate / 剣の動作 ----------------
const CARDS = [["hermes_swift_movement", 3], ["hermes_reed_flute_sleep", 4], ["hermes_perception_obscure", 3], ["hermes_sword_attack", 2],
    ["apollo_golden_arrow", 0], ["apollo_plague_attack", 1], ["apollo_lyre_calm", 4]];
function restartWithOrder(w, order) {
    const d = deckApi(w);
    d.endCardBattle();
    const sequence = Array.from({ length: 30 }, (_, i) => order[i % order.length]);
    const originals = new Map();
    for (const id of new Set(sequence)) {
        const card = d.definitions.cards.get(id);
        originals.set(id, card);
        d.definitions.cards.set(id, Object.freeze({ ...card, maxCopies: 30 }));
    }
    w.run("globalThis.__random = Math.random; Math.random = () => 1 - Number.EPSILON;");
    const result = d.startCardBattle([...sequence].reverse());
    w.run("Math.random = globalThis.__random;");
    for (const [id, card] of originals) d.definitions.cards.set(id, card);
    assert.equal(result.ok, true, JSON.stringify(result));
}
test("カード: 本番7種すべてが、発動成功のときだけSkillCastを再生する(カードの結果・消費は変えない)", () => {
    for (const [cardId] of CARDS) {
        const w = arena(cardId.startsWith("apollo") ? "apollo" : "hermes");
        restartWithOrder(w, [cardId, "hermes_sword_attack", "hermes_swift_movement", "apollo_golden_arrow", "hermes_perception_obscure"]);
        pres(w).clear();
        const before = plain(deckApi(w).getBattleState().hand.map(c => c.cardId));
        assert.equal(before[0], cardId);
        press(w, "Q");
        const result = plain(w.ctx.ProjectRCardBattleInput.getLastResult());
        assert.equal(result.ok, true, `${cardId}: ${JSON.stringify(result)}`);
        const events = plain(pres(w).history()).filter(e => e.ok && e.name === "SkillCast");
        assert.equal(events.length, 1, `${cardId}: SkillCastが1回`);
        assert.equal(events[0].detail, cardId); assert.equal(events[0].source, "card");
        assert.equal(deckApi(w).getBattleState().hand.length, 5, "手札は補充される(アニメは状態に触れない)");
    }
});

test("カード: 失敗した発動(範囲に敵がいない葦笛・空のスロット)ではSkillCastを再生せず、カードは消費されない", () => {
    const w = arena("hermes", { x: 25, y: 26 });
    restartWithOrder(w, ["hermes_reed_flute_sleep", "hermes_sword_attack", "hermes_swift_movement", "apollo_golden_arrow", "hermes_perception_obscure"]);
    pres(w).clear();
    const before = plain(deckApi(w).getBattleState());
    press(w, "Q");
    assert.equal(plain(w.ctx.ProjectRCardBattleInput.getLastResult()).ok, false);
    assert.ok(!historyNames(w).includes("SkillCast"), "失敗では再生しない");
    assert.deepEqual(plain(deckApi(w).getBattleState().hand), before.hand, "手札は変わらない");
    assert.equal(pres(w).activeNames().length, 0);
});

test("Ultimate: Hermes/Apolloの発動が受理されたときだけ、プレイヤーのUltimate動作が始まる。Gauge不足では始まらない", () => {
    for (const god of ["hermes", "apollo"]) {
        const w = arena(god);
        const { ctx } = w;
        ctx.ProjectRUltimateGauge.addUltimateGauge(25, "test");
        press(w, "U");
        assert.ok(!historyNames(w).includes("Ultimate"), `${god}: Gaugeが満タンでなければ動作しない`);
        ctx.ProjectRCombatTestArena.fillGauge();
        w.frames(1);
        press(w, "U");
        const activation = plain(ctx.ProjectRUltimateActivation.getLastUltimateActivationResult());
        assert.equal(activation.ok, true, JSON.stringify(activation));
        const events = plain(pres(w).history()).filter(e => e.ok && e.name === "Ultimate");
        assert.equal(events.length, 1); assert.equal(events[0].detail, god);
        assert.equal(ctx.ProjectRUltimateGauge.getUltimateGauge(), 0, "ゲーム側(Gauge)は従来どおり");
        w.frames(120);
        assert.equal(pres(w).current().name !== "Ultimate", true, "奥義の動作も終わる(神の演出・斬撃/矢とは独立)");
        press(w, "Q");
        assert.equal(plain(ctx.ProjectRCardBattleInput.getLastResult()).ok, true, "奥義の後も通常カードが使える");
    }
});

test("剣: 攻撃入力が受理されるとSwordAttack動作+斬撃。戦闘外の拒否では動作しない。被弾でDamage動作", () => {
    const w = arena();
    const { ctx } = w;
    assert.equal(ctx.$gameParty.leader().equips()[0].id, 2);
    pres(w).clear(); ctx.ProjectRWeaponPresentation.clear();
    ctx.$gameTemp.reserveCommonEvent(1);
    assert.deepEqual(historyNames(w).slice(-1), ["SwordAttack"]);
    assert.equal(plain(ctx.ProjectRWeaponPresentation.effects()).filter(e => e.kind === "slash").length, 1);
    assert.ok(!historyNames(w).includes("GunFire"));
    assert.equal(ctx.$gameTemp._commonEventQueue.length, 1, "剣は従来どおり共通イベント1を実行する");
    ctx.$gameTemp.clearCommonEvent?.(); ctx.$gameTemp._commonEventQueue.length = 0;
    // 被弾
    pres(w).clear();
    w.frames(1); // HPの基準を取り直す
    const leader = ctx.$gameParty.leader();
    leader.setHp(leader.hp - 5);
    w.frames(2);
    assert.ok(historyNames(w).includes("Damage"));
    // 戦闘が終わった(使用不可)状態の攻撃は拒否され、動作も起きない
    ctx.ProjectRCombatPresence.clearCombatEvents();
    ctx.ProjectRCombatTestArena.endScenario?.();
    pres(w).clear();
    w.frames(2);
    const rejected = ctx.ProjectRCombatPresence.canUseWeapon();
    if (!rejected) {
        ctx.$gameTemp.reserveCommonEvent(1);
        assert.ok(!historyNames(w).includes("SwordAttack"), "拒否された攻撃では動作しない");
    }
});

// ---------------- 旧銃の撤去 ----------------
test("旧銃の撤去: CE1に銃処理(Gunオブジェクト/Bullet/弾薬/リロード/発射アニメ/発射音)が残らない。CE3は無効化、CE4/Map002から旧Prefabが消える", () => {
    const ce = json("data/CommonEvents.json");
    const text = JSON.stringify(ce[1].list);
    for (const forbidden of ["Object: Gun", "\"Bullet\"", "GunAmmoControl", "GunReload", "Gun1", "gunAmmo()", "<gun>"]) {
        assert.ok(!text.includes(forbidden), `CE1に ${forbidden} が残っていない`);
    }
    assert.ok(!ce[1].list.some(c => c.code === 212 && c.parameters[1] === 111), "CE1に旧銃の発射アニメ(111: 体中心の赤い発光)が無い(剣のアニメ6は別物で残る)");
    assert.ok(!ce[1].list.some(c => c.code === 250 && /Gun|Shot/.test(c.parameters[0].name)), "CE1に発射音が無い");
    assert.ok(ce[1].list.some(c => c.code === 357 && c.parameters[1] === "SwingWeapon"), "剣の処理は残る");
    assert.ok(ce[1].list.some(c => c.code === 117 && c.parameters[0] === 4), "ロングソードのCE4呼び出しも残る");
    assert.equal(ce[3].name, "公式銃 Enemy Collision");
    assert.ok(ce[3].list.every(c => c.code === 108 || c.code === 0), "旧Enemy CollisionはコメントのみでBullet判定/ノックバック/アニメ127を実行しない");
    assert.ok(!JSON.stringify(ce[4].list).includes("Object: Gun"));
    const map2 = json("data/Map002.json");
    assert.ok(!map2.events.some(e => e && /^(Bullet|Object: Gun)$/.test(e.name)));
    assert.ok(!map2.events.some(e => e && /<weaponAttack>|<gun>/.test(e.note)));
    // 他のデータ/プラグインから旧Prefabを生成していない
    for (const file of fs.readdirSync(path.join(__dirname, "..", "js/plugins"))) {
        if (!/^ProjectR_/.test(file)) continue;
        const source = read(`js/plugins/${file}`);
        assert.ok(!/["']Object: Gun["']|<weaponAttack>/.test(source), `${file} は旧Prefabを参照しない`);
    }
});

test("旧銃の経路は到達しない: 攻撃入力→共通イベント1は予約されず、旧アニメ111・旧Gunオブジェクト・旧Bulletは生成されない。発射経路は1つ", () => {
    const w = arena();
    const { ctx } = w;
    equipGun(w);
    const queue = ctx.$gameTemp._commonEventQueue;
    const queued = [];
    const reserve = ctx.$gameTemp.reserveCommonEvent;
    press(w, "J");
    w.frames(12);
    assert.equal(queue.length, 0, "共通イベント1(旧銃の予約)は残らない");
    assert.equal(ctx.$gameTemp._animationQueue.length, 0, "旧: 発射アニメ(体中心)が要求されない");
    assert.ok(!ctx.$gameMap.events().some(e => /Object: Gun|<gun>|<weaponAttack>/.test(e.event().note)), "旧Gun/旧Bulletが生成されない");
    assert.equal(bulletEvents(w).length, 1, "弾は1発だけ");
    assert.equal(w.calls.filter(c => c === "GunAmmoControl").length, 1, "弾薬の減算は公式コマンド1回だけ");
    assert.equal(w.calls.filter(c => c === "GunReload").length, 0);
    assert.equal(w.played.filter(n => n === "Gun1").length, 1, "発射音は1つの経路から1回");
    assert.equal(sys(w).status().ammo, 6); assert.equal(ctx.gunAmmo(), 6, "HUDが読む公式の弾数と同じ");
    assert.deepEqual(historyNames(w).filter(n => n === "GunFire").length, 1);
    void queued; void reserve;
});

// ---------------- 新銃 ----------------
test("構え: 戦闘中に銃を持つと公式Display Weaponを表示し(Aim)、銃をしまう/戦闘終了で消す。回転中心はプロファイルのweaponアンカー", () => {
    const w = arena();
    const { ctx } = w;
    assert.equal(sys(w).status().displayed, null, "剣のときは出さない");
    equipGun(w);
    assert.equal(sys(w).status().displayed, `${GUN_ID}:ProjectR_G17_Dev`);
    assert.equal(w.calls.filter(c => c === "DisplayWeapon").length, 1, "表示コマンドは1回");
    assert.equal(pres(w).baseline(), "Aim"); assert.equal(pres(w).isAiming(), true);
    // 公式の回転中心 = 足元 - タイル高/2 + offset(Display Weaponの式) がweaponアンカーと一致する
    const a = pres(w).anchor("weapon");
    assert.deepEqual([a.x, a.y + 24], [0, 0]);
    ctx.$gameParty.leader().forceChangeEquip(0, ctx.$dataWeapons[2]);
    w.frames(3);
    assert.equal(sys(w).status().displayed, null); assert.equal(pres(w).isAiming(), false);
    assert.equal(w.calls.filter(c => c === "DisplayWeapon").length, 2, "しまうコマンドも1回");
});

test("発射: 弾は銃口(体の中心ではない)から出て、発射時の照準角を一度だけ設定。360°の8方向で角度・銃口位置が式と一致する", () => {
    for (const [mx, my] of [[816, 330], [740, 100], [408, 0], [60, 120], [0, 330], [60, 560], [408, 624], [760, 560]]) {
        const w = arena("hermes", { mouse: [mx, my] });
        equipGun(w);
        w.mouse(mx, my);
        const { ctx } = w;
        const pivot = pres(w).anchorScreen("weapon");
        const expectedDegree = (Math.atan2(my - pivot.y, mx - pivot.x) * 180 / Math.PI + 450) % 360;
        const expectedMuzzle = plain(pres(w).muzzleScreen({ degree: expectedDegree, weaponId: GUN_ID }));
        const result = sys(w).fire("test");
        assert.equal(result.ok, true, JSON.stringify(result));
        near(result.degree, expectedDegree, 1e-9, "照準角");
        near(result.muzzle.x, expectedMuzzle.x, 1e-9, "銃口x"); near(result.muzzle.y, expectedMuzzle.y, 1e-9, "銃口y");
        const bullet = bulletEvents(w)[0];
        near(bullet._rotation, expectedDegree, 1e-6, "弾の回転(発射時に一度だけ)");
        // rotateTo後の弾は公式が中心基準に直す(realYが-0.5)ので、screenX/screenYが見た目の中心。銃口に一致し、体の中心(pivot)からは出ない
        const center = { x: bullet.screenX(), y: bullet.screenY() };
        near(center.x, expectedMuzzle.x, 1.5, "弾の出現x=銃口"); near(center.y, expectedMuzzle.y, 1.5, "弾の出現y=銃口");
        assert.ok(Math.hypot(center.x - pivot.x, center.y - pivot.y) > 35, "体の中心から出ていない");
    }
});

test("弾道: 発射後にマウスを動かしても曲がらず直進する(追尾なし)。寿命で消える", () => {
    const w = arena("hermes", { mouse: [700, 330] });
    equipGun(w);
    const { ctx } = w;
    assert.equal(sys(w).fire("test").ok, true);
    const bullet = bulletEvents(w)[0];
    const start = { x: bullet._realX, y: bullet._realY };
    const rotation = bullet._rotation;
    const samples = [];
    for (let i = 0; i < 12; i++) {
        w.mouse(i % 2 ? 100 : 700, i % 2 ? 600 : 20); // 発射後にマウスを大きく往復させる
        w.frames(1);
        samples.push({ x: bullet._realX - start.x, y: bullet._realY - start.y });
    }
    assert.equal(bullet._rotation, rotation, "回転は変わらない");
    for (const s of samples.slice(2)) {
        const angle = (Math.atan2(s.x, -s.y) * 180 / Math.PI + 360) % 360;
        near(angle, rotation, 2, "進行方向=発射角");
    }
    assert.ok(samples[11].x > 3, "前進している(0.5タイル/frame)");
    w.frames(60);
    assert.equal(bulletEvents(w).filter(e => !e._erased).length, 0, "最大寿命で消える");
    assert.equal(sys(w).status().bullets, 0);
});

// 敵のHPは公式のEventHpBar(Spritesetの_eventHpBars)に保持される。ハーネスのSpritesetは描画なしなので、同じ形のHPバーを敵に付ける。
function attachHpBars(w, ids) {
    const bars = w.ctx.SceneManager._scene._spriteset._eventHpBars;
    const sprites = w.ctx.SceneManager._scene._spriteset;
    Object.defineProperty(sprites, "_characterSprites", { configurable: true, get: () => [...w.ctx.$gameMap.events().filter(Boolean), w.ctx.$gamePlayer]
        .map(character => ({ _character: character, x: 0, y: 0, children: [], addChild() {}, removeChild() {} })) });
    for (const id of ids) {
        const event = w.ctx.$gameMap.event(id);
        // 実EventHpBar.refresh()と同じく、現在HPを公式の保存先(hpStorageId = ゲーム変数)へ書く
        const bar = { _event: event, currentHp: 1000, targetHp: 1000, _maxHp: 1000, _hpChangeDuration: 10, hpChangeFrames: 0,
            refresh() { w.ctx.$gameVariables._data[event.hpStorageId] = this.currentHp; } };
        bar.refresh(); bars.push(bar);
    }
}
test("命中: 公式checkCollide+UpdateEventHp(-player weapon)で、敵に1発1回だけDatabase武器のダメージ。貫通せず弾は消える", () => {
    const w = arena("hermes");
    const { ctx } = w;
    equipGun(w);
    attachHpBars(w, [4, 5, 6]);
    w.run("Math.random = () => 0.5;"); // 命中/会心/分散を固定(ダメージ式そのものはDatabaseのまま)
    const target = ctx.$gameMap.event(4);
    const hp = id => ctx.$gameMap.getCurrentEventHp(id);
    assert.equal(hp(4), 1000);
    w.placePlayer(target._realX - 6, target._realY);
    w.frames(2);
    w.mouse(target.screenX(), target.screenY() - 24);
    w.frames(1);
    const shoot = () => { w.mouse(target.screenX(), target.screenY() - 24); const r = sys(w).fire("test"); assert.equal(r.ok, true, JSON.stringify(r)); w.frames(30); };
    shoot();
    const drop1 = 1000 - hp(4);
    assert.ok(drop1 >= 40 && drop1 <= 200, `Database武器ダメージ(分散・会心あり)で1回だけ減る: ${drop1}`);
    assert.equal(w.calls.filter(c => c === "UpdateEventHp").length, 1, "1発1回のダメージ");
    assert.equal(sys(w).status().bullets, 0, "命中で弾は消える(貫通しない)");
    assert.equal(hp(5), 1000); assert.equal(hp(6), 1000, "他の敵は無傷");
    w.frames(12);
    shoot();
    assert.equal(w.calls.filter(c => c === "UpdateEventHp").length, 2);
    const drop2 = 1000 - drop1 - hp(4);
    assert.ok(drop2 === drop1, `同じ武器・同じ乱数なら2発目も同じ1回分: ${drop2}`);
});

test("連射と弾薬: 1発ごとに公式の弾数が1だけ減る。クールダウン中・リロード中・空では撃てず弾は減らない。Hendrixが弾数の持ち主", () => {
    const w = arena();
    const { ctx } = w;
    equipGun(w, { ammo: 3 });
    const before = ctx.gunAmmo();
    assert.equal(sys(w).fire("test").ok, true);
    assert.equal(sys(w).fire("test").reason, "cooldown", "同じフレームの連射は不可");
    assert.equal(ctx.gunAmmo(), before - 1);
    w.frames(13);
    assert.equal(sys(w).fire("test").ok, true); w.frames(13);
    assert.equal(sys(w).fire("test").ok, true); w.frames(13);
    assert.equal(ctx.gunAmmo(), 0); assert.equal(sys(w).status().shots, 3);
    assert.equal(w.calls.filter(c => c === "GunAmmoControl").length, 3, "減算コマンドは発射と同数");
    assert.equal(w.played.filter(n => n === "Gun1").length, 3);
    // 空: 空撃ち音+自動リロードが1回だけ(二重リロードにならない)
    const result = sys(w).fire("test");
    assert.equal(result.reason, "empty");
    assert.equal(w.played.filter(n => n === "Buzzer1").length, 1);
    assert.equal(sys(w).isReloading(), true);
    assert.equal(sys(w).fire("test").reason, "reloading");
    assert.equal(sys(w).requestReload("test").reason, "alreadyReloading");
    // HUDが読む値(公式関数)が唯一の弾数
    const source = read("js/plugins/ProjectR_GunSystem.js");
    assert.ok(!/currentAmmo\s*=|_ammo\b|let ammo|ammoCount/.test(source), "ProjectR独自の弾数カウンタを持たない");
    assert.ok(/getGunData|gunAmmo\(/.test(source));
});

test("リロード: R→満タン/ストック0は何も起きない。有効なら Reloadモーション+SE→公式GunReloadを1回→弾数とストックが公式どおり更新", () => {
    const w = arena();
    const { ctx } = w;
    equipGun(w, { ammo: 7, reserve: 30 });
    press(w, "R");
    assert.equal(sys(w).isReloading(), false, "満タンでは何もしない");
    assert.equal(w.calls.filter(c => c === "GunReload").length, 0);
    ctx.$gameSystem.setGunAmmo(GUN_ID, 2);
    press(w, "R");
    assert.equal(sys(w).isReloading(), true);
    assert.ok(historyNames(w).includes("GunReload")); assert.equal(pres(w).current().name, "GunReload");
    assert.deepEqual(w.played.filter(n => n === "Gun2").length, 1, "リロード音は動作と同時に1回");
    assert.equal(sys(w).fire("test").reason, "reloading");
    assert.equal(ctx.gunAmmo(), 2, "リロード完了まで弾数は変わらない");
    w.frames(45);
    assert.equal(sys(w).isReloading(), false);
    assert.equal(ctx.gunAmmo(), 7); assert.equal(ctx.gunAmmoInInventory(), 25, "ストックから5発(公式)");
    assert.equal(w.calls.filter(c => c === "GunReload").length, 1, "公式リロードは1回だけ(二重リロードなし)");
    assert.deepEqual(plain(sys(w).status().lastReload), { before: 2, after: 7 });
    assert.equal(pres(w).baseline(), "Aim", "終わればAimへ戻る");
    // ストック0
    ctx.$gameSystem.setGunAmmo(GUN_ID, 1);
    ctx.$gameParty.loseItem(ctx.$dataItems[AMMO_ITEM], 25);
    press(w, "R");
    assert.equal(sys(w).isReloading(), false);
    assert.equal(sys(w).requestReload("test").reason, "noReserveAmmo");
    // リロード中に武器を替えるとキャンセル(弾薬は消費されない)
    ctx.$gameParty.gainItem(ctx.$dataItems[AMMO_ITEM], 10);
    press(w, "R");
    assert.equal(sys(w).isReloading(), true);
    ctx.$gameParty.leader().forceChangeEquip(0, ctx.$dataWeapons[2]);
    w.frames(3);
    assert.equal(sys(w).isReloading(), false);
    assert.equal(ctx.$gameParty.numItems(ctx.$dataItems[AMMO_ITEM]), 10, "キャンセルでは弾薬は減らない");
});

test("発射の見た目: 発光は銃口の点だけ(体の中心ではない)・弾道線なし・GunFireモーション・反動。武器スプライトの反動は一時的", () => {
    const w = arena("hermes", { mouse: [700, 330] });
    equipGun(w);
    const { ctx } = w;
    const wp = ctx.ProjectRWeaponPresentation;
    wp.clear();
    const result = sys(w).fire("test");
    const effects = plain(wp.effects());
    assert.deepEqual(effects.map(e => e.kind), ["muzzle", "smoke"], "銃口の短い閃光と控えめな煙だけ(体中心の発光・弾道線は無い)");
    assert.ok(effects[0].frames <= 4, "閃光は4フレーム以内の短さ");
    assert.ok(effects[1].frames > effects[0].frames && effects[1].frames <= 16, "煙は閃光より長いが短時間");
    const feet = { x: ctx.$gamePlayer.screenX(), y: ctx.$gamePlayer.screenY() };
    for (const effect of effects) { near(feet.x + effect.rel.x, result.muzzle.x, 1e-9); near(feet.y + effect.rel.y, result.muzzle.y, 1e-9); }
    assert.equal(pres(w).current().name, "GunFire");
    assert.ok(historyNames(w).includes("GunFire"));
    w.frames(12);
    const canvas = new Proxy({}, { get: () => () => undefined }); // 描画先(PIXI.Graphics)の代わり。描画APIを呼べることも確認する
    for (let i = 0; i < 5; i++) wp._draw(canvas, { x: 0, y: 0 });
    assert.deepEqual(plain(wp.effects()).map(e => e.kind), ["smoke"], "閃光は4フレームで消え、煙だけが残る");
    for (let i = 0; i < 12; i++) wp._draw(canvas, { x: 0, y: 0 });
    assert.equal(wp.activeCount(), 0, "発光も煙も短時間で消える");
    assert.equal(pres(w).current().name, "Aim", "撃った後はAimへ戻る");
    // 反動(銃スプライト): 発射直後だけ照準と逆へ後退し銃口が跳ね、約9frameで収まる(公式が毎フレーム置き直す前提で蓄積しない)
    // 反動は Scene_Map.update の最後(公式が毎フレーム置いた後)で足される。もう1発撃って、その1フレーム目から測る
    assert.equal(sys(w).fire("test").ok, true);
    const weaponSprite = w.run("ShxWeaponSpriteH");
    assert.ok(weaponSprite, "公式Display Weaponのスプライトが存在する");
    const base = { x: 300, y: 200, rotation: 0.1 };
    const place = () => Object.assign(weaponSprite, base);
    const kicks = [];
    for (let i = 0; i < 12; i++) { place(); sys(w)._applyKick(); kicks.push({ dx: weaponSprite.x - base.x, dr: weaponSprite.rotation - base.rotation }); }
    assert.ok(kicks[0].dx < -3, `右へ撃つと銃は左(後ろ)へ下がる ${kicks[0].dx}`);
    assert.ok(Math.abs(kicks[0].dr) > 0.05, "銃口が跳ねる(回転)");
    assert.ok(Math.abs(kicks[8].dx) < Math.abs(kicks[0].dx) * 0.2, "急速に収まる");
    assert.deepEqual([kicks[11].dx, kicks[11].dr], [0, 0], "最後は元の位置/角度へ戻る");
});

test("後始末: 戦闘終了/マップ移動で弾・リロード・構え表示が残らない。セーブには銃/動作の実行時状態を保存しない", () => {
    const w = arena();
    const { ctx } = w;
    equipGun(w);
    sys(w).fire("test");
    assert.equal(sys(w).status().bullets, 1);
    ctx.ProjectRCardDeck.endBattle();
    assert.equal(sys(w).status().bullets, 0, "戦闘終了で弾を破棄");
    assert.equal(sys(w).status().displayed, null);
    equipGun(w, { ammo: 2 });
    press(w, "R");
    assert.equal(sys(w).isReloading(), true);
    const saved = ctx.JsonEx.stringify(ctx.DataManager.makeSaveContents());
    for (const word of ["muzzle", "recoil", "ProjectRGunSystem", "ProjectRCharacterPresentation", "GunFire", "SkillCast", "kickDegree", "reloadLeft"]) {
        assert.ok(!saved.includes(word), `セーブに ${word} を含まない`);
    }
    w.enterMap(4, 11, 16);
    assert.equal(sys(w).isReloading(), false); assert.equal(sys(w).status().bullets, 0);
    assert.equal(pres(w).activeNames().length, 0);
    ctx.DataManager.extractSaveContents(ctx.JsonEx.parse(saved));
    assert.equal(pres(w).baseline(), "Idle", "ロード後は通常のIdleへ");
});

// ---------------- Animation / Weapon Certification Zone(DEV Arena) ----------------
const zoneCommand = (w, name) => {
    const interpreter = Object.assign(new w.ctx.Game_Interpreter(), { _eventId: 0 });
    w.ctx.$gameMessage.clear();
    w.ctx.PluginManager.callCommand(interpreter, "ProjectR_CombatTestArenaAnimation", name, {});
    const texts = plain(w.ctx.$gameMessage._texts);
    w.ctx.$gameMessage.clear(); // 表示中のメッセージは武器の構えを隠すので、テストでは読んだら閉じる
    return texts;
};
test("DEVアリーナ: Animation / Weapon Certification Zoneの端末がMap004北東に追加され、既存のゾーン/イベントは不変", () => {
    // 基準は本フェーズ開始時のcheckpoint(4493f74)のMap004。既存の31イベントが1つも変わっていないことを確認する
    const { execFileSync } = require("node:child_process");
    const before = JSON.parse(execFileSync("git", ["show", "4493f74:data/Map004.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    const now = json("data/Map004.json");
    for (const event of before.events) {
        if (!event) continue;
        assert.deepEqual(now.events[event.id], event, `既存イベント ${event.id} ${event.name} は不変`);
    }
    const zone = now.events.filter(e => e && e.id >= 32);
    assert.equal(zone.length, 17);
    const commands = zone.map(e => e.pages[0].list.find(c => c.code === 357)?.parameters[1]).filter(Boolean);
    assert.deepEqual(commands.sort(), ["animAim", "animAnchors", "animCast", "animDamage", "animDev3h", "animDown", "animEmpty", "animEquipGun", "animEquipSword", "animProfileTall", "animRefill", "animSword",
        "animRestore", "animStatus", "animTfSprite", "animUltimate"].sort());
    const positions = new Set(now.events.filter(Boolean).map(e => e.x + "," + e.y));
    assert.equal(positions.size, now.events.filter(Boolean).length, "イベントが重ならない");
    assert.ok(zone.some(e => e.name.startsWith("DEV Sign: Animation")), "説明の看板がある");
    for (const e of zone) assert.ok(e.x >= 27 && e.x <= 37 && e.y >= 8 && e.y <= 11, `射撃レーンの手前に収まる ${e.name}`);
    const w = arena();
    for (const e of zone) assert.equal(w.ctx.$gameMap.isPassable(e.x, e.y, 2) || w.ctx.$gameMap.isPassable(e.x, e.y, 6), true, `${e.name} は床の上`);
    assert.equal(w.ctx.$plugins.find(p => p.name === "ProjectR_CombatTestArenaAnimation").status, true);
});
test("DEVアリーナ: 端末の操作(G17装備/弾倉を空に/動作再生/状態表示)が動き、元に戻す端末とアリーナ退出で装備と弾薬が復元される", () => {
    const w = arena();
    const { ctx } = w;
    const originalWeapon = ctx.$gameParty.leader().equips()[0].id;
    const originalItems = ctx.$gameParty.numItems(ctx.$dataItems[AMMO_ITEM]);
    let lines = zoneCommand(w, "animEquipGun");
    assert.match(lines[0], /G17を装備/);
    assert.equal(ctx.$gameParty.leader().equips()[0].id, GUN_ID);
    w.frames(3);
    assert.equal(ctx.gunAmmo(), 7); assert.equal(ctx.gunAmmoInInventory(), 60);
    assert.equal(sys(w).status().displayed, `${GUN_ID}:ProjectR_G17_Dev`);
    zoneCommand(w, "animEmpty");
    assert.equal(ctx.gunAmmo(), 0);
    assert.equal(sys(w).fire("test").reason, "empty");
    w.frames(45);
    assert.equal(ctx.gunAmmo(), 7, "空撃ち→自動リロード(公式)");
    zoneCommand(w, "animCast"); assert.equal(pres(w).current().name, "SkillCast");
    lines = zoneCommand(w, "animStatus");
    const joined = lines.join("\n");
    assert.match(joined, /Animation \/ Weapon Zone/); assert.match(joined, /弾倉 7\/7/); assert.match(joined, /SkillCast/);
    zoneCommand(w, "animProfileTall");
    assert.equal(pres(w).visualHeight(), 144);
    assert.equal(pres(w).profileForPlayer().hitbox, null, "高さを変えてもhitboxは変えない");
    zoneCommand(w, "animRestore");
    assert.equal(pres(w).visualHeight(), 48);
    assert.equal(ctx.$gameParty.leader().equips()[0].id, originalWeapon);
    assert.equal(ctx.$gameParty.numItems(ctx.$dataItems[AMMO_ITEM]), originalItems);
    // アリーナを出たときも戻る
    zoneCommand(w, "animEquipGun"); zoneCommand(w, "animProfileTall");
    w.enterMap(2, 3, 3);
    assert.equal(ctx.$gameParty.leader().equips()[0].id, originalWeapon, "アリーナ退出で装備が戻る");
    assert.equal(pres(w).visualHeight(), 48, "アリーナ退出でプロファイルが戻る");
    assert.equal(ctx.ProjectRCombatTestArenaAnimation.isActive(), false);
});

// ---------------- TF TallSpriteMZ(48×72)とクレジット ----------------
test("TF TallSpriteMZ: 端末で主人公の見た目を切り替え/戻せる。見た目の高さは実スプライトから72pxと読み取られ、当たり判定は変わらない", () => {
    const w = arena();
    const { ctx } = w;
    const api = ctx.ProjectRCombatTestArenaAnimation;
    const original = { name: ctx.$gameActors.actor(1).characterName(), index: ctx.$gameActors.actor(1).characterIndex() };
    api.setAssetCheck(() => false);
    let lines = zoneCommand(w, "animTfSprite");
    assert.match(lines[0], /NG: img\/characters\/TF_Actor1\.png がありません/);
    assert.equal(ctx.$gameActors.actor(1).characterName(), original.name, "ファイルが無い環境では何も変えない");
    api.setAssetCheck(() => true);
    lines = zoneCommand(w, "animTfSprite");
    assert.match(lines[0], /TF TallSpriteMZ/);
    assert.equal(ctx.$gameActors.actor(1).characterName(), "TF_Actor1");
    assert.equal(ctx.$gamePlayer.characterName(), "TF_Actor1", "プレイヤーの見た目も更新");
    // 実Sprite_Characterが72pxと読み取ることを、576×576のシート(8体=4×2)で確認する
    const sprite = new ctx.RealSprite_Character(ctx.$gamePlayer);
    sprite._bitmap = { width: 576, height: 576, isReady: () => true }; // setterを通さず直接差す(描画資源のstubのため)
    assert.equal(sprite.patternHeight(), 72); assert.equal(sprite.patternWidth(), 48);
    ctx.SceneManager._scene._spriteset._characterSprites = [sprite];
    assert.equal(pres(w).visualHeight(), 72, "プロファイルのvisualHeightPx=0(自動)は実スプライトの高さ");
    const feet = { x: ctx.$gamePlayer.screenX(), y: ctx.$gamePlayer.screenY() };
    assert.deepEqual(plain(pres(w).anchorScreen("weapon")), { x: feet.x, y: feet.y - 36 }, "回転中心は高さの中央(足元-36)");
    assert.deepEqual(plain(pres(w).scaleSummonOffset({ x: -0.75, y: -0.75 })), { x: -0.75, y: -1.125 }, "神の位置も高さに追従");
    assert.equal(pres(w).profileForPlayer().hitbox, null, "当たり判定は変えない");
    lines = zoneCommand(w, "animTfSprite");
    assert.match(lines[0], /元の主人公/);
    assert.equal(ctx.$gameActors.actor(1).characterName(), original.name); assert.equal(ctx.$gameActors.actor(1).characterIndex(), original.index);
    // 切り替えたままアリーナを出ても、Restoreでも元に戻る
    zoneCommand(w, "animTfSprite");
    zoneCommand(w, "animRestore");
    assert.equal(ctx.$gameActors.actor(1).characterName(), original.name, "Restoreで戻る");
    zoneCommand(w, "animTfSprite");
    assert.equal(ctx.ProjectRCombatTestArenaAnimation.isActive(), true);
    w.enterMap(2, 3, 3);
    assert.equal(ctx.$gameActors.actor(1).characterName(), original.name, "アリーナ退出で戻る");
    assert.equal(ctx.ProjectRCombatTestArenaAnimation.isActive(), false);
});

test("TF素材の扱い: 規約上そのままの再配布ができないため、画像はGit管理外(.gitignore)。既存の画像は上書きしていない", () => {
    const { execFileSync } = require("node:child_process");
    const ignored = execFileSync("git", ["check-ignore", "img/characters/TF_Actor1.png"], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
    assert.match(ignored, /TF_Actor1\.png/);
    const tracked = execFileSync("git", ["ls-files", "img/characters/TF_Actor1.png"], { cwd: path.join(__dirname, ".."), encoding: "utf8" });
    assert.equal(tracked.trim(), "", "TF_Actor1.pngはコミットされていない");
    const file = path.join(__dirname, "..", "img/characters/TF_Actor1.png");
    if (fs.existsSync(file)) { // この環境にある場合だけ形式を確認(他の環境では存在しない)
        const b = fs.readFileSync(file);
        assert.deepEqual([b.readUInt32BE(16), b.readUInt32BE(20)], [576, 576], "576×576 = 8体(4×2)、1体 144×288 = 3×4コマ(48×72)");
    }
    // 既存のRTPのActor1.pngは上書きしていない(主人公は自作のDEV3Hを使う。リード以外のアクターはRTPのまま)
    const actors = json("data/Actors.json");
    assert.equal(actors[1].characterName, "$DEV3H_Idle_f4");
    assert.equal(actors[2].characterName, "Actor1");
});

test("クレジット: タイトルに「クレジット」が追加され、TF TallSpriteMZの表記(規約の例文)と公式素材の著作権表記が表示される", () => {
    const w = buildWorld();
    assert.deepEqual(w.failures, []);
    const { ctx } = w;
    assert.ok(ctx.$plugins.find(p => p.name === "ProjectR_Credits").status);
    const credits = ctx.ProjectRCredits;
    const text = plain(credits.lines()).join("\n");
    assert.match(text, /Material provided by: Tonbi@Tobishima-Factory/);
    assert.match(text, /Gotcha Gotcha Games Inc\.\/YOJI OJIMA 2020/);
    assert.match(text, /TF TallSpriteMZ/);
    // タイトルはScene_Bootのあと(ゲームオブジェクト作成済み・ウィンドウスキンあり)。同じ状態を用意する
    ctx.Graphics._width = 816; ctx.Graphics._height = 624;
    ctx.ColorManager._windowskin = { getPixel: () => "#ffffff", isReady: () => true };
    ctx.DataManager.createGameObjects();
    ctx.DataManager._globalInfo = []; // セーブ一覧(読み込み済み・空)
    const window = new ctx.Window_TitleCommand(new ctx.Rectangle(0, 0, 400, 300));
    window.refresh();
    assert.deepEqual(plain(window._list.map(c => c.symbol)), ["newGame", "continue", "options", "projectRCredits"], "既存コマンドはそのまま、末尾に追加");
    assert.equal(window._list[3].name, "クレジット");
    const view = new credits.Window_ProjectRCredits(new ctx.Rectangle(0, 0, 800, 400));
    assert.ok(view.contents, "画面を描画できる");
    // 画面は決定/キャンセルで戻る(表示専用。ゲーム状態に触れない)
    const scene = Object.create(credits.Scene_ProjectRCredits.prototype);
    let popped = 0;
    scene.popScene = () => { popped++; };
    ctx.SoundManager.playCancel = () => {};
    ctx.Input.isTriggered = name => name === "cancel";
    ctx.Scene_MenuBase.prototype.update = () => {};
    scene.update();
    assert.equal(popped, 1);
    // 台帳にも同じ内容
    const ledger = read("docs/ProjectR_ThirdPartyAssets.md");
    assert.match(ledger, /Tonbi@Tobishima-Factory/); assert.match(ledger, /TF_Actor1\.png/);
});

// ---------------- DEV3H(自作の三頭身)・Idle/Walk/Run・構え/ダウン・神の位置・リロード・自動セーブ ----------------
const dev3hArena = (opts = {}) => arena("hermes", { dev3h: true, ...opts });
const pngSize = file => { const b = fs.readFileSync(path.join(__dirname, "..", "img/characters", file)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test("DEV3H: 主人公は実際に三頭身(頭28px x 3 = 身長84px)。1コマ96x96の専用シートで、拡大で作っていない。頭身はロジックの定数ではない", () => {
    const gen = require("../tools/gen_dev3h_character.cjs");
    assert.equal(gen.HEAD_H * 3, gen.HEIGHT, "頭の高さ x 3 = 身長");
    const w = dev3hArena(); const api = pres(w); const p = api.profileForPlayer();
    assert.equal(p.id, "protagonist"); assert.equal(p.heads, 3); assert.equal(p.visualScale, 1, "拡大ではなく専用の大きい画像");
    assert.equal(p.visualHeightPx, gen.HEIGHT); assert.equal(api.visualHeight(), 84);
    assert.equal(p.hitbox, null, "当たり判定は見た目と別(未指定=変更しない)");
    assert.equal(p.directions, 4, "4方向(8方向画像は無いので偽装しない)");
    assert.equal(w.ctx.$gamePlayer.characterName(), "$DEV3H_Idle_f4");
    assert.equal(json("data/Actors.json")[1].characterName, "$DEV3H_Idle_f4");
    // Idle/Walk/Run + 行動シート。ファイル名の _fN とプロファイルのframes・実画像の寸法(N x 96, 4 x 96)が一致する
    const sheets = [p.locomotion.idle, p.locomotion.walk, p.locomotion.run, ...Object.values(p.actions).map(a => a.sprite)];
    assert.equal(Object.keys(p.actions).sort().join(), "Aim,CrossArms,Damage,Down,GunFire,GunReload,SkillCast,SwordAttack,Ultimate");
    for (const name of sheets) {
        const frames = Number(name.match(/_f(\d+)$/)[1]);
        assert.deepEqual(pngSize(name + ".png"), [frames * gen.W, 4 * gen.H], name);
    }
    for (const [action, spec] of Object.entries(p.actions)) assert.equal(spec.frames, Number(spec.sprite.match(/_f(\d+)$/)[1]), action);
    assert.match(p.locomotion.walk, /Walk/); assert.match(p.locomotion.run, /Run/); assert.match(p.locomotion.idle, /Idle/);
    for (const name of Object.values(p.actions).map(a => a.sprite)) assert.doesNotMatch(name, /Idle|Walk|Run/, "行動シートは自動切替のキーワードを含まない: " + name);
    // 他キャラは独立(2.5頭身/3.5頭身/4頭身を並べても主人公に影響しない)。戦闘コードは頭身を参照しない
    for (const [id, actorId, heads, height] of [["h25", 2, 2.5, 72], ["h35", 3, 3.5, 98], ["h4", 4, 4, 112]]) api.registerProfile({ id, actorId, heads, visualHeightPx: height });
    assert.deepEqual([2, 3, 4].map(id => api.profileForActor(id).heads), [2.5, 3.5, 4]);
    assert.equal(api.profileForPlayer().heads, 3); assert.equal(api.visualHeight(), 84);
    for (const file of ["js/plugins/ProjectR_GunSystem.js", "js/plugins/ProjectR_WeaponPresentation.js", "js/plugins/ProjectR_GodSummonVisual.js"]) {
        assert.doesNotMatch(read(file), /\.heads\b/, file + " は頭身に依存しない");
    }
});

test("DEV3H: 画像は生成スクリプト(tools/gen_dev3h_character.cjs)と一致し、全行動・全4方向が空でなく、行動ごとに見た目が違う(同じ静止画ではない)", () => {
    const gen = require("../tools/gen_dev3h_character.cjs");
    const hashes = new Set();
    for (const name of Object.keys(gen.ACTIONS)) {
        const sheet = gen.sheetFor(name);
        const file = fs.readFileSync(path.join(__dirname, "..", "img/characters", gen.fileName(name)));
        assert.ok(file.equals(gen.encodePng(sheet.w, sheet.h, sheet.px)), gen.fileName(name) + " は生成物と一致");
        const cell = (frame, row) => { let n = 0; const out = []; for (let y = 0; y < gen.H; y++) for (let x = 0; x < gen.W; x++) { const i = (((row * gen.H + y) * sheet.w) + frame * gen.W + x) * 4; if (sheet.px[i + 3]) n++; out.push(sheet.px[i], sheet.px[i + 3]); } return { n, key: Buffer.from(out).toString("base64") }; };
        for (let row = 0; row < 4; row++) for (let frame = 0; frame < sheet.frames; frame++) assert.ok(cell(frame, row).n > 400, `${name} f${frame} row${row} は描かれている`);
        // 同じ行動の中でコマが変化する(Idleは呼吸なので小さい差でよい)。足元(下端)はコマの最下段に届く=浮かない
        const keys = new Set(Array.from({ length: sheet.frames }, (_, f) => cell(f, 2).key));
        assert.ok(keys.size >= Math.min(sheet.frames, 2), name + " はコマが変化する");
        hashes.add(cell(0, 0).key);
    }
    assert.equal(hashes.size, Object.keys(gen.ACTIONS).length, "行動ごとに1コマ目の絵が違う");
    // 足元: 立ち姿(Idle 正面)の最下行に不透明ピクセルがあり、頭頂は身長84pxぶん上
    const idle = gen.sheetFor("Idle");
    const rows = []; for (let y = 0; y < gen.H; y++) { let n = 0; for (let x = 0; x < gen.W; x++) if (idle.px[((y * idle.w) + x) * 4 + 3]) n++; rows.push(n); }
    assert.ok(rows[gen.H - 1] > 0, "足元はコマ最下行(MZは足元が基準なので浮かない)");
    const top = rows.findIndex(n => n > 0);
    assert.ok(Math.abs((gen.H - top) - gen.HEIGHT) <= 4, `描かれた高さ≒84px (${gen.H - top})`);
});

test("Idle/Walk/Run: 公式Animation Solutionの自動切替(導入順の都合で呼ばれない)を橋渡しし、移動でWalk、ダッシュでRun、止まればIdleへ戻る", () => {
    const w = dev3hArena(); const { ctx } = w; const p = ctx.$gamePlayer;
    // テストのNodeにはNW.jsのfsがなく、公式の画像検出(非同期)が使えないため、検出結果を実機と同じ名前で与える
    const detect = () => { p._graphicsDetected = true; p._detectedIdleGraphic = "$DEV3H_Idle_f4"; p._detectedWalkGraphic = "$DEV3H_Walk_f6"; p._detectedRunGraphic = "$DEV3H_Run_f6"; };
    detect(); w.frames(2);
    assert.equal(p.characterName(), "$DEV3H_Idle_f4");
    ctx.Input._currentState.right = true;
    detect(); w.frames(6);
    assert.equal(p.characterName(), "$DEV3H_Walk_f6", "歩くとWalk");
    assert.equal(pres(w).baseline(), "Walk");
    ctx.Input._currentState.right = false;
    detect(); w.frames(12);
    assert.equal(p.characterName(), "$DEV3H_Idle_f4", "止まればIdleへ戻る");
    p.isDashing = () => true; ctx.Input._currentState.left = true;
    detect(); w.frames(6);
    assert.equal(p.characterName(), "$DEV3H_Run_f6", "ダッシュ中はRun");
    assert.equal(pres(w).baseline(), "Run");
    ctx.Input._currentState.left = false; delete p.isDashing;
    detect(); w.frames(12);
    assert.equal(p.characterName(), "$DEV3H_Idle_f4");
    // 公式が走る環境では二重に呼ばない: 1フレームに updateMovingState が1回だけ
    let calls = 0; const original = p.updateMovingState;
    p.updateMovingState = function() { calls++; return original.apply(this, arguments); };
    w.frames(5);
    assert.ok(calls <= 5, "1フレーム1回まで");
    delete p.updateMovingState;
});

test("構え/ダウンは基本姿勢の専用シート: 構えでGunAim、行動(発射/リロード)の後は構えへ戻り、構えを解くとIdleへ、倒れている間はDown、復活で戻る", () => {
    const w = dev3hArena(); const { ctx } = w; const p = ctx.$gamePlayer; const api = pres(w);
    const idle = p.characterName();
    api.setAiming(true); w.frames(2);
    assert.equal(p.characterName(), "$DEV3H_GunAim_f2");
    api.request("GunFire", { degree: 90 });
    assert.equal(p.characterName(), "$DEV3H_GunFire_f3", "発射の行動シート");
    w.frames(10);
    assert.equal(p.characterName(), "$DEV3H_GunAim_f2", "発射後は構えへ戻る(攻撃フレームに留まらない)");
    api.request("GunReload", { degree: 90, frames: 40 });
    assert.equal(p.characterName(), "$DEV3H_GunReload_f6");
    w.frames(45);
    assert.equal(p.characterName(), "$DEV3H_GunAim_f2", "リロード後は構えへ戻る");
    assert.equal(p.isDirectionFixed(), ctx.$gamePlayer.isDirectionFixed());
    api.setAiming(false); w.frames(2);
    assert.equal(p.characterName(), idle, "構えを解くとIdleの画像へ");
    // 倒れる/復活(PlayerDeathの死亡判定を差し替え)
    ctx.ProjectR.PlayerDeath.isDead = () => true;
    w.frames(2);
    assert.equal(p.characterName(), "$DEV3H_Down_f4");
    assert.equal(api.baseline(), "Down");
    ctx.ProjectR.PlayerDeath.isDead = () => false;
    w.frames(2);
    assert.equal(p.characterName(), idle, "復活したらIdleの画像へ戻る");
    for (const name of ["SwordAttack", "SkillCast", "Ultimate", "Damage"]) {
        assert.equal(api.request(name, { degree: 90 }).official, true);
        assert.equal(p.characterName(), api.profileForPlayer().actions[name].sprite, name);
        w.frames(80);
        assert.equal(p.characterName(), idle, name + " の後はIdleの画像へ戻る");
        assert.equal(api.activeNames().length, 0);
    }
});

test("神(常駐)の位置: 召喚アンカーに従い、プレイヤーが動いても同じ相対位置を保つ(生成直後に真上へ重ならない)", () => {
    const w = dev3hArena(); const { ctx } = w;
    w.frames(4);
    const visuals = plain(ctx.ProjectRGodSummonVisual.getVisuals()).filter(v => v.kind === "persistent");
    assert.equal(visuals.length, 1, "常駐の神が生成されている");
    const event = ctx.$gameMap.event(visuals[0].eventId);
    const rel = () => [event._realX - ctx.$gamePlayer._realX, event._realY - ctx.$gamePlayer._realY];
    const offset = pres(w).scaleSummonOffset({ x: -0.75, y: -0.75 });
    assert.deepEqual(plain(offset), { x: -0.75, y: -1.3125 }, "高さ84/48=1.75倍");
    near(rel()[0], offset.x, 0.05, "x"); near(rel()[1], offset.y, 0.05, "y");
    const startX = ctx.$gamePlayer._realX;
    ctx.Input._currentState.right = true; w.frames(30); ctx.Input._currentState.right = false; w.frames(10);
    assert.ok(ctx.$gamePlayer._realX > startX + 0.5, "プレイヤーは動いた");
    near(rel()[0], offset.x, 0.12, "移動後のx相対位置"); near(rel()[1], offset.y, 0.12, "移動後のy相対位置");
    assert.equal(event.isThrough(), true, "神は当たり判定を持たない");
});

test("リロードの見た目: リロード中だけ銃が腰の高さへ下がり銃口が下を向く(0→1→0の山型)。終われば構えの位置へ戻り、蓄積しない", () => {
    const w = dev3hArena(); const { ctx } = w;
    equipGun(w, { ammo: 1 });
    const weaponSprite = w.run("ShxWeaponSpriteH");
    const base = { x: 300, y: 200, rotation: 0 };
    const sample = () => { Object.assign(weaponSprite, base); sys(w)._applyKick(); return { dy: weaponSprite.y - base.y, dr: weaponSprite.rotation - base.rotation }; };
    assert.deepEqual(sample(), { dy: 0, dr: 0 }, "リロード前は何も足さない");
    press(w, "R");
    assert.equal(sys(w).isReloading(), true);
    const dips = [];
    for (let i = 0; i < 44 && sys(w).isReloading(); i++) { w.frames(1); dips.push(sample()); }
    const peak = Math.max(...dips.map(d => d.dy));
    assert.ok(peak > 8 && peak <= 12.01, `銃は最大で約12px下がる (${peak})`);
    assert.ok(Math.max(...dips.map(d => d.dr)) > 0.3, "右向きの銃は銃口が下(時計回り)へ倒れる");
    assert.ok(dips[Math.floor(dips.length / 2)].dy > dips[1].dy, "中盤が一番下がる");
    w.frames(60);
    assert.deepEqual(sample(), { dy: 0, dr: 0 }, "リロード後は元の位置・角度");
});

test("セーブ保護: Playtestでは自動セーブを止める(開発セーブを上書きしない)。配布版(Playtestでない)では何もしない", () => {
    const w = dev3hArena(); const { ctx } = w;
    assert.equal(ctx.ProjectRCombatTestArenaAnimation.autosaveSuppressed(), true);
    let saved = 0;
    const scene = Object.create(ctx.Scene_Base.prototype);
    scene.executeAutosave = () => { saved++; };
    scene.isAutosaveEnabled = () => true;
    scene.requestAutosave();
    assert.equal(saved, 0, "Playtestでは自動セーブしない");
    // 配布版: Utils.isOptionValid("test") が偽ならプラグインは何もしない(標準の自動セーブのまま)
    const prod = buildWorld({ playtest: false });
    assert.deepEqual(prod.failures, []);
    let savedProd = 0;
    const sceneProd = Object.create(prod.ctx.Scene_Base.prototype);
    sceneProd.executeAutosave = () => { savedProd++; };
    sceneProd.isAutosaveEnabled = () => true;
    sceneProd.requestAutosave();
    assert.equal(savedProd, 1, "配布版は標準どおり自動セーブする");
    assert.equal(prod.ctx.ProjectRCombatTestArenaAnimation, undefined, "配布版にはDEVアリーナがない");
});

test("DEVアリーナ(追加): 剣の動作/構え/ダウン/アンカー表示/DEV3Hの端末が動く。アンカー表示は足元・頭頂・武器・照準・近接・VFX・召喚・銃口を描く", () => {
    const w = dev3hArena(); const { ctx } = w; const api = ctx.ProjectRCombatTestArenaAnimation;
    for (const [command, expectHistory] of [["animSword", "SwordAttack"], ["animDown", "Down"]]) {
        const lines = zoneCommand(w, command);
        assert.match(lines[0], new RegExp(expectHistory)); assert.ok(historyNames(w).includes(expectHistory), command);
        w.frames(100);
    }
    let lines = zoneCommand(w, "animAim");
    assert.match(lines[0], /ON/); assert.equal(pres(w).isAiming(), true);
    lines = zoneCommand(w, "animAim");
    assert.match(lines[0], /OFF/); assert.equal(pres(w).isAiming(), false);
    // アンカー表示: PIXI.Graphicsに描く(描画APIが呼べて、線の数が揃う)
    const drawn = [];
    ctx.PIXI = ctx.PIXI || {};
    ctx.PIXI.Graphics = class { constructor() { this.parent = null; } clear() { drawn.length = 0; } lineStyle() {} moveTo() { drawn.push("m"); } lineTo() { drawn.push("l"); } beginFill() {} endFill() {} drawCircle() {} };
    ctx.SceneManager._scene.addChild = function(child) { child.parent = this; };
    lines = zoneCommand(w, "animAnchors");
    assert.match(lines[0], /ON/); assert.equal(api.anchorsVisible(), true);
    api._drawAnchors();
    assert.ok(drawn.filter(c => c === "m").length >= 8, "足元/頭頂/アンカー/銃口の線が描かれる");
    lines = zoneCommand(w, "animAnchors");
    assert.match(lines[0], /OFF/); assert.equal(api.anchorsVisible(), false);
    // 古いセーブ(主人公がRTPのまま)をDEV3Hへ切り替えて戻す
    ctx.$gameActors.actor(1).setCharacterImage("Actor1", 0); ctx.$gamePlayer.refresh();
    api.setAssetCheck(() => true);
    lines = zoneCommand(w, "animDev3h");
    assert.equal(ctx.$gameActors.actor(1).characterName(), "$DEV3H_Idle_f4");
    zoneCommand(w, "animRestore");
    assert.equal(ctx.$gameActors.actor(1).characterName(), "Actor1", "Restoreで元の保存内容へ");
});

test("文書・資産: 新銃/キャラ表示の文書、開発用素材(自作)、第三者素材台帳が存在し、旧素材の扱いを書いている", () => {
    for (const doc of ["ProjectR_LegacyGunRemoval", "ProjectR_NewGunSystem", "ProjectR_CharacterAnimation", "ProjectR_ThirdPartyAssets"]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", "docs", `${doc}.md`)), doc);
    }
    for (const label of ["REMOVE", "REPLACE", "KEEP AS DATA", "KEEP AS OFFICIAL DEPENDENCY"]) assert.ok(read("docs/ProjectR_LegacyGunRemoval.md").includes(label), label);
    for (const file of ["img/pictures/ProjectR_G17_Dev.png", "img/characters/VFX/$ProjectR_G17Bullet.png"]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", file)), file);
    }
    assert.match(read("docs/ProjectR_ThirdPartyAssets.md"), /ProjectR_G17_Dev/);
    assert.match(read("docs/ProjectR_ThirdPartyAssets.md"), /\$DEV3H_/, "自作のDEV3Hが台帳にある");
    assert.match(read("docs/ProjectR_CharacterAnimation.md"), /DEV3H/);
    const video = read("docs/ProjectR_OfficialVideoNeeded.md");
    assert.match(video, /nC0W4g6SZzQ/); assert.match(video, /How to use plugin RPG Maker Animation Solution/);
    // 実機の証跡(小さな画像を少数だけ)
    const evidence = fs.readdirSync(path.join(__dirname, "..", "docs/evidence"));
    assert.ok(evidence.length >= 3 && evidence.length <= 6, "証跡は少数: " + evidence.join());
    for (const name of evidence) assert.ok(fs.statSync(path.join(__dirname, "..", "docs/evidence", name)).size < 600 * 1024, name + " は小さい");
    // 生成スクリプトが残っている(再現できる)
    for (const tool of ["tools/gen_dev3h_character.cjs", "tools/gen_dev_bullet.cjs"]) assert.ok(fs.existsSync(path.join(__dirname, "..", tool)), tool);
});
