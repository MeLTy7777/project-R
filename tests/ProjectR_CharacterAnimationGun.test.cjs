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

function arena(god = "hermes", { x = 11, y = 16, mouse = [700, 300] } = {}) {
    const w = buildWorld();
    assert.deepEqual(w.failures, [], "全pluginが本番順で読み込める");
    w.enterMap(4, x, y);
    w.frames(3);
    w.mouse(...mouse);
    const started = w.ctx.ProjectRCombatTestArena.startScenario(god);
    assert.equal(started.ok, true, JSON.stringify(started));
    w.frames(2);
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
    assert.deepEqual(plain(api.PRIORITY), plain({ Idle: 10, Walk: 20, Run: 30, Aim: 40, SwordAttack: 60, GunFire: 60, Damage: 65, GunReload: 70, SkillCast: 80, Ultimate: 90, Down: 100 }));
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
    assert.deepEqual(effects.map(e => e.kind), ["muzzle"], "銃口の発光1つ(旧: 体中心の発光+弾道線は無い)");
    const feet = { x: ctx.$gamePlayer.screenX(), y: ctx.$gamePlayer.screenY() };
    near(feet.x + effects[0].rel.x, result.muzzle.x, 1e-9); near(feet.y + effects[0].rel.y, result.muzzle.y, 1e-9);
    assert.equal(pres(w).current().name, "GunFire");
    assert.ok(historyNames(w).includes("GunFire"));
    w.frames(12);
    const canvas = new Proxy({}, { get: () => () => undefined }); // 描画先(PIXI.Graphics)の代わり。描画APIを呼べることも確認する
    for (let i = 0; i < 12; i++) wp._draw(canvas, { x: 0, y: 0 });
    assert.equal(wp.activeCount(), 0, "発光は短時間で消える");
    assert.equal(pres(w).current().name, "Aim", "撃った後はAimへ戻る");
    // 反動(銃スプライト): 発射直後だけ照準と逆へ後退し銃口が跳ね、約9frameで収まる(公式が毎フレーム置き直す前提で蓄積しない)
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
    const { execFileSync } = require("node:child_process");
    const before = JSON.parse(execFileSync("git", ["show", "HEAD:data/Map004.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    const now = json("data/Map004.json");
    for (const event of before.events) {
        if (!event) continue;
        assert.deepEqual(now.events[event.id], event, `既存イベント ${event.id} ${event.name} は不変`);
    }
    const zone = now.events.filter(e => e && e.id >= 32);
    assert.equal(zone.length, 11);
    const commands = zone.map(e => e.pages[0].list.find(c => c.code === 357)?.parameters[1]).filter(Boolean);
    assert.deepEqual(commands.sort(), ["animCast", "animDamage", "animEmpty", "animEquipGun", "animEquipSword", "animProfileTall", "animRefill",
        "animRestore", "animStatus", "animUltimate"].sort());
    const positions = new Set(now.events.filter(Boolean).map(e => e.x + "," + e.y));
    assert.equal(positions.size, now.events.filter(Boolean).length, "イベントが重ならない");
    assert.ok(zone.some(e => e.name.startsWith("DEV Sign: Animation")), "説明の看板がある");
    for (const e of zone) assert.ok(e.x >= 27 && e.x <= 37 && e.y >= 8 && e.y <= 10, `射撃レーンの手前に収まる ${e.name}`);
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

test("文書・資産: 新銃/キャラ表示の文書、開発用素材(自作)、第三者素材台帳が存在し、旧素材の扱いを書いている", () => {
    for (const doc of ["ProjectR_LegacyGunRemoval", "ProjectR_NewGunSystem", "ProjectR_CharacterAnimation", "ProjectR_ThirdPartyAssets"]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", "docs", `${doc}.md`)), doc);
    }
    for (const label of ["REMOVE", "REPLACE", "KEEP AS DATA", "KEEP AS OFFICIAL DEPENDENCY"]) assert.ok(read("docs/ProjectR_LegacyGunRemoval.md").includes(label), label);
    for (const file of ["img/pictures/ProjectR_G17_Dev.png", "img/characters/VFX/$ProjectR_G17Bullet.png"]) {
        assert.ok(fs.existsSync(path.join(__dirname, "..", file)), file);
    }
    assert.match(read("docs/ProjectR_ThirdPartyAssets.md"), /ProjectR_G17_Dev/);
});
